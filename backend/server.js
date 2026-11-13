// ---------------------------------------------------------------------------
// Rex Desk MVP – Backend Server
// ---------------------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { generateResponse, leadRoute, getDevWorkspaceDiff, isAgentEngineError, devWorkspace } = require('./services/agentEngine');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers – read / write JSON files & Atomic Message Queue
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, 'data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const APPROVALS_FILE = path.join(DATA_DIR, 'approvals.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const AWAY_FILE = path.join(DATA_DIR, 'away.json');

let messageWriteQueue = Promise.resolve();

/**
 * Atomically appends one or more messages to messages.json.
 * Re-reads latest state from disk inside a serialized promise chain
 * so no concurrent requests or background workers overwrite each other.
 * @param {object | Array<object>} msgs
 * @returns {Promise<void>}
 */
function appendMessages(msgs) {
  const items = Array.isArray(msgs) ? msgs : [msgs];
  messageWriteQueue = messageWriteQueue.then(() => {
    try {
      const current = readJSON(MESSAGES_FILE);
      current.push(...items);
      writeJSON(MESSAGES_FILE, current);
    } catch (err) {
      console.error('Error appending messages to messages.json:', err);
    }
  });
  return messageWriteQueue;
}

/**
 * Atomically mutates messages.json via an updater callback.
 * Used for in-place modifications such as approval resolution.
 * @param {(messages: Array<object>) => void} mutator
 * @returns {Promise<void>}
 */
function updateMessages(mutator) {
  messageWriteQueue = messageWriteQueue.then(() => {
    try {
      const current = readJSON(MESSAGES_FILE);
      mutator(current);
      writeJSON(MESSAGES_FILE, current);
    } catch (err) {
      console.error('Error mutating messages.json:', err);
    }
  });
  return messageWriteQueue;
}

function getAwayState() {
  try {
    if (!fs.existsSync(AWAY_FILE)) {
      const initial = { isAway: false, awaySince: null, completedWhileAway: [] };
      writeJSON(AWAY_FILE, initial);
      return initial;
    }
    return readJSON(AWAY_FILE);
  } catch {
    return { isAway: false, awaySince: null, completedWhileAway: [] };
  }
}

function setAwayState(state) {
  writeJSON(AWAY_FILE, state);
}

// ---------------------------------------------------------------------------
// Background Queue Worker (Step 6: Away Mode-lite)
// ---------------------------------------------------------------------------

let isProcessingQueue = false;

async function triggerQueueProcessing() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (true) {
      const jobs = readJSON(JOBS_FILE);
      const nextJob = jobs.find((j) => j.status === 'pending');
      if (!nextJob) break;

      // Mark job running
      nextJob.status = 'running';
      writeJSON(JOBS_FILE, jobs);

      // Announce in group chat that worker picked up job
      const agents = readJSON(AGENTS_FILE);
      const devAgent = agents.find((a) => a.name === 'Dev') || agents[0];

      const startMsg = {
        id: uuidv4(),
        chatId: 'group',
        text: `⚙️ [Queue Worker]: កំពុងដំណើរការ task ពី Queue: "${nextJob.task}"...`,
        senderName: devAgent.name,
        senderRole: devAgent.role,
        senderId: devAgent.id,
        isAgent: true,
        createdAt: new Date().toISOString(),
      };
      await appendMessages(startMsg);

      // Run Dev response via Gemini CLI
      const currentMessages = readJSON(MESSAGES_FILE);
      const history = currentMessages.filter((m) => m.chatId === 'group');
      let resultText = '';
      let isError = false;
      try {
        resultText = await generateResponse({
          agent: devAgent,
          prompt: nextJob.task,
          chatId: 'group',
          history,
          senderName: 'Queue Worker',
          forceEngine: true,
        });
        if (isAgentEngineError(resultText)) {
          isError = true;
        }
      } catch (err) {
        isError = true;
        resultText = `⚠️ Error processing queue task: ${err.message}`;
      }

      // Mark job status honestly: 'failed' if Gemini/runner threw an error, 'completed' otherwise
      const updatedJobs = readJSON(JOBS_FILE);
      const currentJob = updatedJobs.find((j) => j.id === nextJob.id);
      if (currentJob) {
        currentJob.status = isError ? 'failed' : 'completed';
        currentJob.result = resultText;
        currentJob.completedAt = new Date().toISOString();
        writeJSON(JOBS_FILE, updatedJobs);
      }

      // Append completion message to group chat
      const finishMsg = {
        id: uuidv4(),
        chatId: 'group',
        text: resultText,
        senderName: devAgent.name,
        senderRole: devAgent.role,
        senderId: devAgent.id,
        isAgent: true,
        createdAt: new Date().toISOString(),
      };
      await appendMessages(finishMsg);

      // If QA Reviewer exists and Dev changed code, run QA review
      const qaAgent = agents.find((a) => a.name === 'QA Reviewer');
      if (qaAgent) {
        const devDiff = getDevWorkspaceDiff();
        if (devDiff && devDiff.trim().length > 0) {
          try {
            const latestHistory = readJSON(MESSAGES_FILE).filter((m) => m.chatId === 'group');
            const qaResponse = await generateResponse({
              agent: qaAgent,
              prompt: `Review recent code for queue task: "${nextJob.task}"`,
              chatId: 'group',
              history: latestHistory,
              senderName: 'System',
              forceEngine: true,
              reviewContext: devDiff,
            });
            const qaMsg = {
              id: uuidv4(),
              chatId: 'group',
              text: qaResponse,
              senderName: qaAgent.name,
              senderRole: qaAgent.role,
              senderId: qaAgent.id,
              isAgent: true,
              createdAt: new Date().toISOString(),
            };
            await appendMessages(qaMsg);
          } catch (qaErr) {
            console.error('QA queue review error:', qaErr);
          }
        }
      }

      // If away mode is active, record in completedWhileAway
      const away = getAwayState();
      if (away.isAway) {
        away.completedWhileAway.push({
          jobId: nextJob.id,
          task: nextJob.task,
          agent: devAgent.name,
          completedAt: new Date().toISOString(),
        });
        setAwayState(away);
      }
    }
  } catch (err) {
    console.error('Queue processing error:', err);
  } finally {
    isProcessingQueue = false;
  }
}

function getCurrentGitBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return branch || 'main';
  } catch {
    return 'main';
  }
}

function detectCriticalAction(text) {
  const t = (text || '').toLowerCase();

  // Git push
  if (/git\s+push|push\s+.*code|push\s+.*github|push\s+ទៅ/i.test(t)) {
    const currentBranch = getCurrentGitBranch();
    return {
      actionType: 'git_push',
      title: `Git Push (${currentBranch} -> origin)`,
      description: `Dev requests permission to execute "git push origin ${currentBranch}" to update the remote repository.`,
      payload: { command: `git push origin ${currentBranch}`, branch: currentBranch, remote: 'origin' }
    };
  }

  // Delete file
  if (/delete\s+file|remove\s+file|លុប\s+file|លុបឯកសារ|delete\s+hello\.txt/i.test(t)) {
    const match = text.match(/(?:file|ឯកសារ)\s+([a-zA-Z0-9_\-\.]+)/i);
    const fileName = match ? match[1] : 'hello.txt';
    return {
      actionType: 'file_delete',
      title: `Delete File: ${fileName}`,
      description: `Dev requests permission to permanently delete file "${fileName}" from backend/workspaces/dev/.`,
      payload: { fileName }
    };
  }

  // Git merge
  if (/git\s+merge|merge\s+branch|merge\s+code/i.test(t)) {
    return {
      actionType: 'merge',
      title: 'Git Merge',
      description: 'Dev requests permission to merge agent working branch into main.',
      payload: { branch: 'main' }
    };
  }

  return null;
}

function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Seed data – ensure agents.json has at least 2 default agents on startup
// ---------------------------------------------------------------------------

const AVATAR_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#3b82f6', '#84cc16',
];

function seedAgents() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const existing = readJSON(AGENTS_FILE);
  if (!Array.isArray(existing) || existing.length === 0) {
    const now = new Date().toISOString();
    const seeds = [
      {
        id: uuidv4(),
        name: 'Rex',
        role: 'Lead Orchestrator',
        avatarColor: '#6366f1',
        engine: 'lead',
        createdAt: now,
      },
      {
        id: uuidv4(),
        name: 'Dev',
        role: 'Fullstack Developer',
        avatarColor: '#10b981',
        engine: 'gemini',
        createdAt: now,
      },
    ];
    writeJSON(AGENTS_FILE, seeds);
    console.log('✅ Seeded default agents.');
  }

  // Ensure messages file exists
  if (!fs.existsSync(MESSAGES_FILE)) {
    writeJSON(MESSAGES_FILE, []);
  }

  // Ensure approvals file exists
  if (!fs.existsSync(APPROVALS_FILE)) {
    writeJSON(APPROVALS_FILE, []);
  }

  // Ensure jobs file exists
  if (!fs.existsSync(JOBS_FILE)) {
    writeJSON(JOBS_FILE, []);
  }

  // Ensure away file exists
  if (!fs.existsSync(AWAY_FILE)) {
    writeJSON(AWAY_FILE, { isAway: false, awaySince: null, completedWhileAway: [] });
  }
}

// ---------------------------------------------------------------------------
// Routes – Agents
// ---------------------------------------------------------------------------

// GET /api/agents — return all agents
app.get('/api/agents', (_req, res) => {
  const agents = readJSON(AGENTS_FILE);
  res.json(agents);
});

// POST /api/agents — create a new agent { name, role }
app.post('/api/agents', (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'name and role are required.' });
  }

  const agents = readJSON(AGENTS_FILE);
  const newAgent = {
    id: uuidv4(),
    name,
    role,
    avatarColor: AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)],
    engine: req.body.engine || 'echo',
    createdAt: new Date().toISOString(),
  };
  agents.push(newAgent);
  writeJSON(AGENTS_FILE, agents);
  res.status(201).json(newAgent);
});

// ---------------------------------------------------------------------------
// Routes – Messages
// ---------------------------------------------------------------------------

// GET /api/messages?chatId=<agentId|group> — filter messages by chatId
app.get('/api/messages', (req, res) => {
  const { chatId } = req.query;
  const messages = readJSON(MESSAGES_FILE);
  if (chatId) {
    return res.json(messages.filter((m) => m.chatId === chatId));
  }
  res.json(messages);
});

// POST /api/messages — { chatId, text, senderName }
app.post('/api/messages', async (req, res) => {
  const { chatId, text, senderName } = req.body;
  if (!chatId || !text || !senderName) {
    return res.status(400).json({ error: 'chatId, text, and senderName are required.' });
  }

  const agents = readJSON(AGENTS_FILE);
  const newMessages = [];

  // 1. Save the user message immediately via atomic append
  const userMsg = {
    id: uuidv4(),
    chatId,
    text,
    senderName,
    isAgent: false,
    createdAt: new Date().toISOString(),
  };
  await appendMessages(userMsg);
  newMessages.push(userMsg);

  // Check for critical actions requiring human approval (Approval Gate)
  const critical = detectCriticalAction(text);
  if (critical) {
    const approvals = readJSON(APPROVALS_FILE);
    const approvalId = uuidv4();
    const approvalRecord = {
      id: approvalId,
      actionType: critical.actionType,
      title: critical.title,
      description: critical.description,
      payload: critical.payload,
      chatId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    approvals.push(approvalRecord);
    writeJSON(APPROVALS_FILE, approvals);

    const devAgent = agents.find((a) => a.name === 'Dev') || agents[0];
    const approvalMsg = {
      id: uuidv4(),
      chatId,
      text: `🔒 [Approval Required]: Dev ស្នើសុំការអនុញ្ញាត ${critical.title}។\n\n📌 ព័ត៌មានលម្អិត:\n${critical.description}\n\nសូម pro សម្រេចចិត្តចុច Approve ឬ Reject ខាងក្រោមនេះមុននឹងបន្ត!`,
      senderName: devAgent ? devAgent.name : 'Dev',
      senderRole: devAgent ? devAgent.role : 'Fullstack Developer',
      senderId: devAgent ? devAgent.id : null,
      isAgent: true,
      isApproval: true,
      approvalId,
      approvalStatus: 'pending',
      approvalData: approvalRecord,
      createdAt: new Date().toISOString(),
    };
    await appendMessages(approvalMsg);
    newMessages.push(approvalMsg);

    return res.status(201).json(newMessages);
  }

  // Check for /queue command (Step 6: Away Mode-lite)
  if (/^\/queue\s+/i.test(text) || /^queue:\s+/i.test(text)) {
    const taskText = text.replace(/^\/queue\s+|^queue:\s+/i, '').trim();
    const jobs = readJSON(JOBS_FILE);
    const newJob = {
      id: uuidv4(),
      task: taskText,
      targetAgent: 'Dev',
      status: 'pending',
      result: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    jobs.push(newJob);
    writeJSON(JOBS_FILE, jobs);

    const leadAgent = agents.find((a) => a.name === 'Rex') || agents[0];
    const queueConfirmMsg = {
      id: uuidv4(),
      chatId,
      text: `📋 [Job Queued]: Task "${taskText}" ត្រូវបានបន្ថែមទៅក្នុង Background Queue ដោយជោគជ័យ! Rex & Dev នឹងដំណើរការ task នេះនៅ background។`,
      senderName: leadAgent.name,
      senderRole: leadAgent.role,
      senderId: leadAgent.id,
      isAgent: true,
      createdAt: new Date().toISOString(),
    };
    await appendMessages(queueConfirmMsg);
    newMessages.push(queueConfirmMsg);

    // Run queue in background
    triggerQueueProcessing();
    return res.status(201).json(newMessages);
  }

  // 2. Generate agent response(s)
  if (chatId === 'group') {
    const history = readJSON(MESSAGES_FILE).filter((m) => m.chatId === 'group');

    // Find Lead agent (Rex)
    const leadAgent =
      agents.find((a) => a.engine === 'lead') ||
      agents.find((a) => a.name === 'Rex');

    if (leadAgent) {
      // 1. Rex routes the task
      const routing = leadRoute(text);
      const rexMsg = {
        id: uuidv4(),
        chatId: 'group',
        text: routing.text,
        senderName: leadAgent.name,
        senderRole: leadAgent.role,
        senderId: leadAgent.id,
        isAgent: true,
        createdAt: new Date().toISOString(),
      };
      await appendMessages(rexMsg);
      newMessages.push(rexMsg);

      // 2. If Rex routes to Dev (or user explicitly tagged @Dev):
      if (routing.target === 'Dev' || /@dev\b/i.test(text)) {
        const devAgent =
          agents.find((a) => a.name === 'Dev') ||
          agents.find((a) => a.engine === 'gemini');

        if (devAgent) {
          const updatedHistory = [...history, rexMsg];
          const devResponseText = await generateResponse({
            agent: devAgent,
            prompt: text,
            chatId: 'group',
            history: updatedHistory,
            senderName,
            forceEngine: true,
          });

          const devMsg = {
            id: uuidv4(),
            chatId: 'group',
            text: devResponseText,
            senderName: devAgent.name,
            senderRole: devAgent.role,
            senderId: devAgent.id,
            isAgent: true,
            createdAt: new Date().toISOString(),
          };
          await appendMessages(devMsg);
          newMessages.push(devMsg);

          // Track in away mode if active
          const currentAway = getAwayState();
          if (currentAway.isAway) {
            currentAway.completedWhileAway.push({
              task: text,
              agent: devAgent.name,
              completedAt: new Date().toISOString(),
            });
            setAwayState(currentAway);
          }

          // 3. QA Reviewer chain: automatically inspect Dev's diff and review in group chat
          const qaAgent = agents.find((a) => a.name === 'QA Reviewer');
          if (qaAgent) {
            const devDiff = getDevWorkspaceDiff();
            const updatedHistoryWithDev = [...history, rexMsg, devMsg];
            const qaResponseText = await generateResponse({
              agent: qaAgent,
              prompt: `Review Dev's recent code for task: "${text}"`,
              chatId: 'group',
              history: updatedHistoryWithDev,
              senderName: 'System',
              forceEngine: true,
              reviewContext: devDiff,
            });

            const qaMsg = {
              id: uuidv4(),
              chatId: 'group',
              text: qaResponseText,
              senderName: qaAgent.name,
              senderRole: qaAgent.role,
              senderId: qaAgent.id,
              isAgent: true,
              createdAt: new Date().toISOString(),
            };
            await appendMessages(qaMsg);
            newMessages.push(qaMsg);
          }
        }
      } else if (routing.target === 'QA Reviewer' || /@qa\b/i.test(text)) {
        const qaAgent =
          agents.find((a) => a.name === 'QA Reviewer') ||
          agents.find((a) => a.role && a.role.includes('Quality'));

        if (qaAgent) {
          const devDiff = getDevWorkspaceDiff();
          const updatedHistory = [...history, rexMsg];
          const qaResponseText = await generateResponse({
            agent: qaAgent,
            prompt: text,
            chatId: 'group',
            history: updatedHistory,
            senderName,
            forceEngine: true,
            reviewContext: devDiff,
          });

          const qaMsg = {
            id: uuidv4(),
            chatId: 'group',
            text: qaResponseText,
            senderName: qaAgent.name,
            senderRole: qaAgent.role,
            senderId: qaAgent.id,
            isAgent: true,
            createdAt: new Date().toISOString(),
          };
          await appendMessages(qaMsg);
          newMessages.push(qaMsg);

          // Track in away mode if active
          const currentAway = getAwayState();
          if (currentAway.isAway) {
            currentAway.completedWhileAway.push({
              task: text,
              agent: qaAgent.name,
              completedAt: new Date().toISOString(),
            });
            setAwayState(currentAway);
          }
        }
      }
    } else {
      // Fallback
      for (const agent of agents) {
        const historyForAgent = readJSON(MESSAGES_FILE).filter((m) => m.chatId === 'group');
        const responseText = await generateResponse({
          agent,
          prompt: text,
          chatId,
          history: historyForAgent,
          senderName,
        });
        const agentMsg = {
          id: uuidv4(),
          chatId,
          text: responseText,
          senderName: agent.name,
          senderRole: agent.role,
          senderId: agent.id,
          isAgent: true,
          createdAt: new Date().toISOString(),
        };
        await appendMessages(agentMsg);
        newMessages.push(agentMsg);
      }
    }
  } else {
    // Direct chat — find specific agent
    const agent = agents.find((a) => a.id === chatId);
    if (agent) {
      const history = readJSON(MESSAGES_FILE).filter((m) => m.chatId === chatId);
      const responseText = await generateResponse({
        agent,
        prompt: text,
        chatId,
        history,
        senderName,
      });
      const agentMsg = {
        id: uuidv4(),
        chatId,
        text: responseText,
        senderName: agent.name,
        senderRole: agent.role,
        senderId: agent.id,
        isAgent: true,
        createdAt: new Date().toISOString(),
      };
      await appendMessages(agentMsg);
      newMessages.push(agentMsg);
    }
  }

  res.status(201).json(newMessages);
});

// ---------------------------------------------------------------------------
// Routes – Approvals (Step 5: Approval Gate)
// ---------------------------------------------------------------------------

// GET /api/approvals — list all approvals
app.get('/api/approvals', (_req, res) => {
  const approvals = readJSON(APPROVALS_FILE);
  res.json(approvals);
});

// POST /api/approvals/:id/resolve — approve or reject a pending critical action
app.post('/api/approvals/:id/resolve', async (req, res) => {
  const { id } = req.params;
  const { decision } = req.body; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approve" or "reject".' });
  }

  const approvals = readJSON(APPROVALS_FILE);
  const approvalIndex = approvals.findIndex((a) => a.id === id);
  if (approvalIndex === -1) {
    return res.status(404).json({ error: 'Approval request not found.' });
  }

  const approval = approvals[approvalIndex];
  if (approval.status !== 'pending') {
    return res.status(400).json({ error: `Approval already ${approval.status}.` });
  }

  const now = new Date().toISOString();
  approval.status = decision === 'approve' ? 'approved' : 'rejected';
  approval.resolvedAt = now;
  approvals[approvalIndex] = approval;
  writeJSON(APPROVALS_FILE, approvals);

  const agents = readJSON(AGENTS_FILE);
  const devAgent = agents.find((a) => a.name === 'Dev') || agents[0];

  let resolutionMsg;
  if (decision === 'reject') {
    resolutionMsg = {
      id: uuidv4(),
      chatId: approval.chatId,
      text: `❌ [Rejected by Nha]: ការស្នើសុំ "${approval.title}" ត្រូវបានបដិសេធ (Rejected) ដោយ Nha។\nគ្មាន file ឬ git operation ណាមួយត្រូវបានធ្វើឡើយ!`,
      senderName: devAgent ? devAgent.name : 'Dev',
      senderRole: devAgent ? devAgent.role : 'Fullstack Developer',
      senderId: devAgent ? devAgent.id : null,
      isAgent: true,
      createdAt: now,
    };
  } else {
    // Approved - execute the action
    let executionResult = '';
    const repoRoot = path.resolve(__dirname, '..');

    if (approval.actionType === 'file_delete') {
      const rawName = approval.payload?.fileName;
      if (rawName) {
        const safeName = path.basename(rawName);
        const targetPath = path.join(devWorkspace, safeName);
        if (fs.existsSync(targetPath)) {
          try {
            fs.unlinkSync(targetPath);
            executionResult = `បានលុប file \`${safeName}\` ចេញពី \`backend/workspaces/dev/\` រួចរាល់។`;
          } catch (delErr) {
            executionResult = `⚠️ បរាជ័យក្នុងការលុប file \`${safeName}\`: ${delErr.message}`;
          }
        } else {
          executionResult = `File \`${safeName}\` មិនត្រូវបានរកឃើញក្នុង workspace ទេ (អាចត្រូវបានលុបរួចហើយ)។`;
        }
      } else {
        executionResult = `⚠️ គ្មាន file ត្រូវបានបញ្ជាក់ដើម្បីលុបឡើយ។`;
      }
    } else if (approval.actionType === 'git_push') {
      const branch = approval.payload?.branch || getCurrentGitBranch();
      const remote = approval.payload?.remote || 'origin';
      try {
        const pushOutput = execSync(`git push ${remote} ${branch}`, {
          cwd: repoRoot,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 45000,
        });
        const trimmed = (pushOutput || '').trim();
        executionResult = `បានធ្វើការ Push code ទៅកាន់ remote (${remote} ${branch}) ដោយជោគជ័យ!\n\`\`\`\n${trimmed || 'Everything up-to-date'}\n\`\`\``;
      } catch (err) {
        const errMsg = (err.stderr || err.stdout || err.message || '').toString().trim();
        executionResult = `⚠️ Git push failed:\n\`\`\`\n${errMsg || 'Unknown git push error'}\n\`\`\``;
      }
    } else if (approval.actionType === 'merge') {
      const branchToMerge = approval.payload?.branch || 'main';
      try {
        const mergeOutput = execSync(`git merge ${branchToMerge}`, {
          cwd: repoRoot,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 45000,
        });
        const trimmed = (mergeOutput || '').trim();
        executionResult = `បាន merge branch \`${branchToMerge}\` ដោយជោគជ័យ!\n\`\`\`\n${trimmed || 'Already up to date'}\n\`\`\``;
      } catch (err) {
        const errMsg = (err.stderr || err.stdout || err.message || '').toString().trim();
        executionResult = `⚠️ Git merge failed:\n\`\`\`\n${errMsg || 'Unknown git merge error'}\n\`\`\``;
      }
    } else {
      executionResult = `ប្រតិបត្តិការ ${approval.title} ត្រូវបានអនុវត្តដោយជោគជ័យ។`;
    }

    resolutionMsg = {
      id: uuidv4(),
      chatId: approval.chatId,
      text: `✅ [Approved by Nha]: ការស្នើសុំ "${approval.title}" ត្រូវបានអនុញ្ញាត (Approved) ដោយ Nha!\n\n🚀 លទ្ធផលប្រតិបត្តិ:\n${executionResult}`,
      senderName: devAgent ? devAgent.name : 'Dev',
      senderRole: devAgent ? devAgent.role : 'Fullstack Developer',
      senderId: devAgent ? devAgent.id : null,
      isAgent: true,
      createdAt: now,
    };
  }

  // Atomically update approval status in messages.json and append resolution message
  await updateMessages((msgs) => {
    msgs.forEach((m) => {
      if (m.approvalId === id) {
        m.approvalStatus = approval.status;
        if (m.approvalData) {
          m.approvalData.status = approval.status;
          m.approvalData.resolvedAt = now;
        }
      }
    });
    msgs.push(resolutionMsg);
  });

  res.json({
    success: true,
    approval,
    message: resolutionMsg,
  });
});

// ---------------------------------------------------------------------------
// Routes – Jobs Queue & Away Mode (Step 6)
// ---------------------------------------------------------------------------

// GET /api/jobs — list all jobs in queue
app.get('/api/jobs', (_req, res) => {
  const jobs = readJSON(JOBS_FILE);
  res.json(jobs);
});

// POST /api/jobs — enqueue a new background job
app.post('/api/jobs', (req, res) => {
  const { task, targetAgent } = req.body;
  if (!task || !task.trim()) {
    return res.status(400).json({ error: 'task is required.' });
  }

  const jobs = readJSON(JOBS_FILE);
  const newJob = {
    id: uuidv4(),
    task: task.trim(),
    targetAgent: targetAgent || 'Dev',
    status: 'pending',
    result: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  jobs.push(newJob);
  writeJSON(JOBS_FILE, jobs);

  // Trigger background queue runner
  triggerQueueProcessing();

  res.status(201).json(newJob);
});

// GET /api/away — get current away mode status
app.get('/api/away', (_req, res) => {
  const away = getAwayState();
  res.json(away);
});

// POST /api/away/toggle — toggle away mode ON or OFF
app.post('/api/away/toggle', async (req, res) => {
  const { isAway } = req.body;
  const away = getAwayState();
  const agents = readJSON(AGENTS_FILE);
  const rexAgent = agents.find((a) => a.name === 'Rex') || agents[0];

  if (isAway) {
    away.isAway = true;
    away.awaySince = new Date().toISOString();
    away.completedWhileAway = [];
    setAwayState(away);

    const awayMsg = {
      id: uuidv4(),
      chatId: 'group',
      text: `🌙 [Away Mode Active]: Nha បានកំណត់ស្ថានភាព Away Mode (ចេញក្រៅ)។\n\nRex និង Dev នឹងបន្តទទួល និងដំណើរការ tasks ក្នុង Queue ដោយស្វ័យប្រវត្តិនៅ background។ នៅពេលអ្នកត្រឡប់មកវិញ ពួកយើងនឹងរៀបចំ Resume Briefing សង្ខេបជូនភ្លាមៗ!`,
      senderName: rexAgent.name,
      senderRole: rexAgent.role,
      senderId: rexAgent.id,
      isAgent: true,
      createdAt: new Date().toISOString(),
    };
    await appendMessages(awayMsg);

    return res.json({ success: true, away, message: awayMsg });
  } else {
    // Return / Resume Briefing
    const completedItems = away.completedWhileAway || [];
    let briefingText = '';

    if (completedItems.length > 0) {
      const taskList = completedItems
        .map((item, idx) => `  ${idx + 1}. ✅ **${item.task}** (ដោយ ${item.agent || 'Dev'})`)
        .join('\n');
      briefingText = `🌅 [Resume Briefing]: សូមស្វាគមន៍ការត្រឡប់មកវិញ Nha! 👋\n\nខណៈពេលអ្នកនៅក្រៅ ពួកយើងបានបំពេញការងារចំនួន ${completedItems.length} tasks ដោយស្វ័យប្រវត្តិ:\n${taskList}\n\n📂 Workspaces ត្រូវបាន update រួចរាល់។ តើអ្នកចង់ឱ្យពួកយើងធ្វើអ្វីបន្តទៀត pro?`;
    } else {
      briefingText = `🌅 [Resume Briefing]: សូមស្វាគមន៍ការត្រឡប់មកវិញ Nha! 👋\n\nក្នុងកំឡុងពេលអ្នកនៅក្រៅ គ្មាន task ថ្មីក្នុង queue ទេ។ ប្រព័ន្ធបានត្រៀមខ្លួនជាស្រេចសម្រាប់ task បន្ទាប់របស់អ្នក!`;
    }

    const resumeMsg = {
      id: uuidv4(),
      chatId: 'group',
      text: briefingText,
      senderName: rexAgent.name,
      senderRole: rexAgent.role,
      senderId: rexAgent.id,
      isAgent: true,
      isBriefing: true,
      createdAt: new Date().toISOString(),
    };
    await appendMessages(resumeMsg);

    away.isAway = false;
    away.awaySince = null;
    away.completedWhileAway = [];
    setAwayState(away);

    return res.json({ success: true, away, message: resumeMsg });
  }
});

// ---------------------------------------------------------------------------
// Queue Recovery on Startup
// ---------------------------------------------------------------------------

function recoverQueueOnStartup() {
  const jobs = readJSON(JOBS_FILE);
  let modified = false;

  // 1. Any job that was 'running' when the server stopped/crashed was interrupted
  jobs.forEach((j) => {
    if (j.status === 'running') {
      console.log(`🔄 [Queue Startup]: Resetting interrupted job "${j.task}" (${j.id}) from running to pending.`);
      j.status = 'pending';
      j.interruptedAt = new Date().toISOString();
      modified = true;
    }
  });

  if (modified) {
    writeJSON(JOBS_FILE, jobs);
  }

  // 2. Check if there are pending jobs, and resume queue processing
  const hasPending = jobs.some((j) => j.status === 'pending');
  if (hasPending) {
    console.log('🚀 [Queue Startup]: Pending jobs detected. Resuming background queue worker...');
    triggerQueueProcessing();
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

seedAgents();
recoverQueueOnStartup();

app.listen(PORT, () => {
  console.log(`🚀 Rex Desk backend running on http://localhost:${PORT}`);
});
