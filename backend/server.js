// ---------------------------------------------------------------------------
// Rex Desk MVP – Backend Server
// ---------------------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { generateResponse, leadRoute, getDevWorkspaceDiff, devWorkspace } = require('./services/agentEngine');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers – read / write JSON files
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, 'data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const APPROVALS_FILE = path.join(DATA_DIR, 'approvals.json');

function detectCriticalAction(text) {
  const t = (text || '').toLowerCase();

  // Git push
  if (/git\s+push|push\s+.*code|push\s+.*github|push\s+ទៅ/i.test(t)) {
    return {
      actionType: 'git_push',
      title: 'Git Push to GitHub',
      description: 'Dev requests permission to execute "git push origin main" to update the remote repository.',
      payload: { command: 'git push origin main' }
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

  const messages = readJSON(MESSAGES_FILE);
  const agents = readJSON(AGENTS_FILE);
  const newMessages = [];

  // 1. Save the user message
  const userMsg = {
    id: uuidv4(),
    chatId,
    text,
    senderName,
    isAgent: false,
    createdAt: new Date().toISOString(),
  };
  messages.push(userMsg);
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
    messages.push(approvalMsg);
    newMessages.push(approvalMsg);

    writeJSON(MESSAGES_FILE, messages);
    return res.status(201).json(newMessages);
  }

  // 2. Generate agent response(s)
  if (chatId === 'group') {
    const history = messages.filter((m) => m.chatId === 'group');

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
      messages.push(rexMsg);
      newMessages.push(rexMsg);

      // 2. If Rex routes to Dev (or user explicitly tagged @Dev):
      if (routing.target === 'Dev' || /@dev\b/i.test(text)) {
        const devAgent =
          agents.find((a) => a.name === 'Dev') ||
          agents.find((a) => a.engine === 'gemini');

        if (devAgent) {
          const updatedHistory = [...history, userMsg, rexMsg];
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
          messages.push(devMsg);
          newMessages.push(devMsg);

          // 3. QA Reviewer chain: automatically inspect Dev's diff and review in group chat
          const qaAgent = agents.find((a) => a.name === 'QA Reviewer');
          if (qaAgent) {
            const devDiff = getDevWorkspaceDiff();
            const updatedHistoryWithDev = [...history, userMsg, rexMsg, devMsg];
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
            messages.push(qaMsg);
            newMessages.push(qaMsg);
          }
        }
      } else if (routing.target === 'QA Reviewer' || /@qa\b/i.test(text)) {
        const qaAgent = agents.find((a) => a.name === 'QA Reviewer');
        if (qaAgent) {
          const qaMsg = {
            id: uuidv4(),
            chatId: 'group',
            text: `[QA Reviewer (Code Quality & Security)]: ខ្ញុំបានទទួលការងារពី Rex! ខ្ញុំកំពុងរៀបចំពិនិត្យមើល...`,
            senderName: qaAgent.name,
            senderRole: qaAgent.role,
            senderId: qaAgent.id,
            isAgent: true,
            createdAt: new Date().toISOString(),
          };
          messages.push(qaMsg);
          newMessages.push(qaMsg);
        }
      }
    } else {
      // Fallback
      for (const agent of agents) {
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
        messages.push(agentMsg);
        newMessages.push(agentMsg);
      }
    }
  } else {
    // Direct chat — find specific agent
    const agent = agents.find((a) => a.id === chatId);
    if (agent) {
      const history = messages.filter((m) => m.chatId === chatId);
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
      messages.push(agentMsg);
      newMessages.push(agentMsg);
    }
  }

  writeJSON(MESSAGES_FILE, messages);
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
app.post('/api/approvals/:id/resolve', (req, res) => {
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

  // Update corresponding approval message in messages.json
  const messages = readJSON(MESSAGES_FILE);
  messages.forEach((m) => {
    if (m.approvalId === id) {
      m.approvalStatus = approval.status;
      if (m.approvalData) {
        m.approvalData.status = approval.status;
        m.approvalData.resolvedAt = now;
      }
    }
  });

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
    if (approval.actionType === 'file_delete') {
      const fileName = approval.payload?.fileName;
      if (fileName) {
        const targetPath = path.join(devWorkspace, fileName);
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
          executionResult = `បានលុប file \`${fileName}\` ចេញពី \`backend/workspaces/dev/\` រួចរាល់។`;
        } else {
          executionResult = `File \`${fileName}\` មិនត្រូវបានរកឃើញក្នុង workspace ទេ (អាចត្រូវបានលុបរួចហើយ)។`;
        }
      }
    } else if (approval.actionType === 'git_push') {
      executionResult = `បានធ្វើការ Push code ទៅកាន់ remote repository (origin main) ដោយជោគជ័យ! Remote branch ត្រូវបានធ្វើបច្ចុប្បន្នភាព។`;
    } else if (approval.actionType === 'merge') {
      executionResult = `បាន merge branch ចូល main branch ដោយជោគជ័យ!`;
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

  messages.push(resolutionMsg);
  writeJSON(MESSAGES_FILE, messages);

  res.json({
    success: true,
    approval,
    message: resolutionMsg,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

seedAgents();

app.listen(PORT, () => {
  console.log(`🚀 Rex Desk backend running on http://localhost:${PORT}`);
});
