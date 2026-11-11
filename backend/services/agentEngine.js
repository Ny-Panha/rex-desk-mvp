// ---------------------------------------------------------------------------
// Rex Desk MVP – Pluggable Agent Engine
// Step 3: Lead (Rex) Routing & Group Chat Coordination
// ---------------------------------------------------------------------------

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const devWorkspace = path.resolve(__dirname, '..', 'workspaces', 'dev');

// Ensure Dev's sandbox directory exists
if (!fs.existsSync(devWorkspace)) {
  fs.mkdirSync(devWorkspace, { recursive: true });
}

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
    'កូដ', 'បង្កើត', 'សរសេរ', 'កែ', 'ឯកសារ', '@dev'
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
 * Run Gemini CLI in headless mode inside the Dev sandbox workspace.
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
      ['--skip-trust', '-y', '-m', 'gemini-3.5-flash-lite', '-p', 'Dev:'],
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
 * @param {{ agent: object, prompt: string, chatId: string, history?: Array, senderName?: string, forceEngine?: boolean }} params
 * @returns {Promise<string>}
 */
async function generateResponse({
  agent,
  prompt,
  chatId,
  history = [],
  senderName = 'User',
  forceEngine = false,
}) {
  // 1. Lead Agent (Rex)
  if (agent.engine === 'lead') {
    if (chatId === 'group') {
      const routing = leadRoute(prompt);
      return routing.text;
    }
    return `[${agent.name} (${agent.role})]: ខ្ញុំជា Rex (Lead)។ ក្នុង Group Chat ខ្ញុំទទួលភារកិច្ចពីអ្នក ហើយចាត់ចែងដោយស្វ័យប្រវត្តទៅកាន់ @Dev ឬ @QA! អ្នកអាចសាកល្បងផ្ញើ task ក្នុង Group Chat បាន។`;
  }

  // 2. Dev Agent (Gemini CLI)
  if (agent.engine === 'gemini') {
    if (chatId === 'group' && !forceEngine) {
      const isMentioned = /@dev\b/i.test(prompt);
      if (!isMentioned) {
        return echoEngine({ agent, prompt });
      }
    }

    // Role instruction + last 10 messages context + new message
    const roleInstruction =
      'You are Dev, a Fullstack Developer agent in Rex Desk. You work ONLY inside this folder. Answer in Khmer + simple English.';
    const recentMessages = history.slice(-10);
    const contextText =
      recentMessages.length > 0
        ? '\n\nConversation context (last messages):\n' +
          recentMessages.map((m) => `${m.senderName}: ${m.text}`).join('\n')
        : '';

    const fullPrompt = `${roleInstruction}${contextText}\n\n${senderName}: ${prompt}`;

    return await runGeminiCli({
      prompt: fullPrompt,
      cwd: devWorkspace,
      timeoutMs: 120000,
    });
  }

  // 3. Fallback: Echo engine (QA Reviewer, etc.)
  return echoEngine({ agent, prompt });
}

module.exports = {
  generateResponse,
  leadRoute,
};
