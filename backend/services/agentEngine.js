// ---------------------------------------------------------------------------
// Rex Desk MVP – Pluggable Agent Engine
// Step 4: QA Reviewer + Git Worktree Chain
// ---------------------------------------------------------------------------

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const devWorkspace = path.resolve(__dirname, '..', 'workspaces', 'dev');
const qaWorkspace = path.resolve(__dirname, '..', 'workspaces', 'qa');

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Ensure isolated workspaces exist
[devWorkspace, qaWorkspace].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Echo engine – returns a simple echo response.
 * @param {{ agent: { name: string, role: string }, prompt: string }} params
 * @returns {string}
 */
function echoEngine({ agent, prompt }) {
  return `[${agent.name} (${agent.role})]: Echo: ${prompt}`;
}

/**
 * Deterministic routing logic for Lead Orchestrator (Rex).
 * Inspects keywords to delegate tasks to Dev or QA.
 * @param {string} prompt
 * @returns {{ target: 'Dev' | 'QA Reviewer' | null, text: string }}
 */
function leadRoute(prompt) {
  const p = (prompt || '').toLowerCase();

  // Dev keywords (code, files, create, build, fix, etc.)
  const devKeywords = [
    'code', 'file', 'create', 'fix', 'build', 'dev', 'bug', 'write',
    'function', 'កូដ', 'បង្កើត', 'សរសេរ', 'កែ', 'ឯកសារ', '@dev'
  ];
  const isDevTask = devKeywords.some((k) => p.includes(k));

  // QA keywords (review, test, check, audit, etc.)
  const qaKeywords = [
    'review', 'check', 'test', 'qa', 'audit', 'inspect',
    'ពិនិត្យ', 'តេស្ត', 'ផ្ទៀងផ្ទាត់', '@qa'
  ];
  const isQaTask = qaKeywords.some((k) => p.includes(k));

  if (isDevTask) {
    return {
      target: 'Dev',
      text: `📋 [Rex -> Dev]: បានទទួលការងារ! @Dev សូមចាត់ចែងធ្វើការងារនេះ: "${prompt}"`,
    };
  }

  if (isQaTask) {
    return {
      target: 'QA Reviewer',
      text: `📋 [Rex -> QA]: @QA Reviewer សូមជួយពិនិត្យការងារនេះ: "${prompt}"`,
    };
  }

  return {
    target: null,
    text: `📋 [Rex]: បានកត់ត្រាការងាររួចរាល់។ កំពុងរៀបចំចាត់ចែងក្នុងក្រុម...`,
  };
}

/**
 * Read the current files/diff created by Dev in devWorkspace for QA to inspect.
 * @returns {string}
 */
function getDevWorkspaceDiff() {
  try {
    if (!fs.existsSync(devWorkspace)) return '';
    const entries = fs.readdirSync(devWorkspace);
    let output = '';
    for (const entry of entries) {
      if (entry === '.gitkeep' || entry === '.agents' || entry.startsWith('.')) continue;
      const fullPath = path.join(devWorkspace, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        output += `\n=== File: ${entry} ===\n${content}\n`;
      }
    }
    return output.trim();
  } catch (err) {
    console.error('Error reading dev workspace:', err);
    return '';
  }
}

/**
 * Checks whether user code changes exist in devWorkspace.
 * @returns {boolean}
 */
function hasDevWorkspaceChanges() {
  const diff = getDevWorkspaceDiff();
  return typeof diff === 'string' && diff.trim().length > 0;
}

/**
 * Run Gemini CLI in headless mode inside the designated agent workspace.
 * @param {{ prompt: string, cwd: string, timeoutMs?: number }} params
 * @returns {Promise<string>}
 */
function runGeminiCli({ prompt, cwd, timeoutMs = 120000 }) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Windows requires shell: true so gemini.cmd resolves.
    const child = spawn(
      'gemini',
      ['--skip-trust', '-y', '-m', GEMINI_MODEL, '-p', 'Agent:'],
      {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, GEMINI_CLI_TRUST_WORKSPACE: 'true' },
      }
    );

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill();
      } catch (_) {}
      resolve('⚠️ Gemini CLI error: Process timed out after 120s');
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const firstLine = (err.message || '').split('\n')[0].trim();
      resolve(`⚠️ Gemini CLI error: ${firstLine || 'Failed to start Gemini CLI'}`);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0) {
        const combined = (stderr || stdout || '').trim();
        const firstLine = combined.split('\n')[0].trim();
        return resolve(`⚠️ Gemini CLI error: ${firstLine || `Process exited with code ${code}`}`);
      }

      const cleanStdout = stdout.trim();
      if (!cleanStdout) {
        return resolve('⚠️ Gemini CLI error: Empty response from Gemini CLI');
      }

      resolve(cleanStdout);
    });

    try {
      child.stdin.write(prompt);
      child.stdin.end();
    } catch (_) {}
  });
}

/**
 * Generate a response from an agent.
 * @param {{ agent: object, prompt: string, chatId: string, history?: Array, senderName?: string, forceEngine?: boolean, reviewContext?: string }} params
 * @returns {Promise<string>}
 */
async function generateResponse({
  agent,
  prompt,
  chatId,
  history = [],
  senderName = 'User',
  forceEngine = false,
  reviewContext = '',
}) {
  // 1. Lead Agent (Rex)
  if (agent.engine === 'lead') {
    if (chatId === 'group') {
      const routing = leadRoute(prompt);
      return routing.text;
    }
    return `[${agent.name} (${agent.role})]: ខ្ញុំជា Rex (Lead)។ ក្នុង Group Chat ខ្ញុំទទួលភារកិច្ចពីអ្នក ហើយចាត់ចែងដោយស្វ័យប្រវត្តទៅកាន់ @Dev ឬ @QA!`;
  }

  // 2. Dev Agent (Gemini CLI in devWorkspace)
  if (agent.name === 'Dev' || agent.engine === 'gemini') {
    if (agent.name === 'Dev') {
      if (chatId === 'group' && !forceEngine) {
        const isMentioned = /@dev\b/i.test(prompt);
        if (!isMentioned) {
          return echoEngine({ agent, prompt });
        }
      }

      const roleInstruction =
        'You are Dev, a Fullstack Developer agent in Rex Desk. You work ONLY inside backend/workspaces/dev/. Answer in Khmer + simple English.';
      const recentMessages = history.slice(-10);
      const contextText =
        recentMessages.length > 0
          ? '\n\nConversation context:\n' +
            recentMessages.map((m) => `${m.senderName}: ${m.text}`).join('\n')
          : '';

      const fullPrompt = `${roleInstruction}${contextText}\n\n${senderName}: ${prompt}`;

      return await runGeminiCli({
        prompt: fullPrompt,
        cwd: devWorkspace,
        timeoutMs: 120000,
      });
    }

    // 3. QA Reviewer Agent (Gemini CLI in qaWorkspace)
    if (agent.name === 'QA Reviewer' || (agent.role && agent.role.includes('Quality'))) {
      if (chatId === 'group' && !forceEngine) {
        const isMentioned = /@qa\b/i.test(prompt);
        if (!isMentioned) {
          return echoEngine({ agent, prompt });
        }
      }

      const roleInstruction =
        'You are QA Reviewer, a Senior Code Quality & Security Engineer in Rex Desk. You work ONLY inside backend/workspaces/qa/. When reviewing, analyze the code/diff for correctness, bugs, readability, and security vulnerabilities. Answer concisely in Khmer + simple English.';

      const diffText = reviewContext || getDevWorkspaceDiff() || '(No modified code files found in Dev workspace yet)';
      const recentMessages = history.slice(-5);
      const contextText =
        recentMessages.length > 0
          ? '\n\nChat context:\n' +
            recentMessages.map((m) => `${m.senderName}: ${m.text}`).join('\n')
          : '';

      const fullPrompt = `${roleInstruction}${contextText}\n\nLatest code/diff from Dev workspace:\n${diffText}\n\nTask: ${prompt}\n\nPlease provide your review verdict and critique.`;

      return await runGeminiCli({
        prompt: fullPrompt,
        cwd: qaWorkspace,
        timeoutMs: 120000,
      });
    }

    // 4. Custom Gemini Agent (Specialist in devWorkspace)
    if (chatId === 'group' && !forceEngine) {
      const mentionRegex = new RegExp(`@${agent.name.replace(/[^a-zA-Z0-9]/g, '')}\\b`, 'i');
      if (!mentionRegex.test(prompt)) {
        return echoEngine({ agent, prompt });
      }
    }

    const roleInstruction =
      `You are ${agent.name}, a ${agent.role} in Rex Desk. You collaborate with Rex (Lead Orchestrator), Dev (Fullstack Developer), and QA Reviewer. Answer concisely in Khmer + simple English.`;
    const recentMessages = history.slice(-10);
    const contextText =
      recentMessages.length > 0
        ? '\n\nConversation context:\n' +
          recentMessages.map((m) => `${m.senderName}: ${m.text}`).join('\n')
        : '';

    const fullPrompt = `${roleInstruction}${contextText}\n\n${senderName}: ${prompt}`;

    return await runGeminiCli({
      prompt: fullPrompt,
      cwd: devWorkspace,
      timeoutMs: 120000,
    });
  }

  // Fallback: Echo engine
  return echoEngine({ agent, prompt });
}

/**
 * Checks if an output from Gemini CLI or the engine indicates an error.
 * @param {string} text
 * @returns {boolean}
 */
function isAgentEngineError(text) {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  if (
    trimmed.startsWith('⚠️ Gemini CLI error:') ||
    trimmed.startsWith('⚠️ Error:') ||
    trimmed.startsWith('Error processing queue task:') ||
    trimmed.startsWith('Error reading workspace:')
  ) {
    return true;
  }
  return false;
}

module.exports = {
  generateResponse,
  leadRoute,
  getDevWorkspaceDiff,
  hasDevWorkspaceChanges,
  isAgentEngineError,
  GEMINI_MODEL,
  devWorkspace,
  qaWorkspace,
};
