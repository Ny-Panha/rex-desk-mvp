// ---------------------------------------------------------------------------
// Rex Desk MVP – Backend Server
// ---------------------------------------------------------------------------

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { generateResponse, leadRoute, getDevWorkspaceDiff } = require('./services/agentEngine');

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
// Start
// ---------------------------------------------------------------------------

seedAgents();

app.listen(PORT, () => {
  console.log(`🚀 Rex Desk backend running on http://localhost:${PORT}`);
});
