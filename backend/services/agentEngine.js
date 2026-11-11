// ---------------------------------------------------------------------------
// Pluggable Agent Engine
// Swap this file (or the selected engine below) to use a real LLM later.
// ---------------------------------------------------------------------------

/**
 * Echo engine – returns a simple echo response.
 * @param {{ agent: { name: string, role: string }, prompt: string, chatId: string }} params
 * @returns {string}
 */
function echoEngine({ agent, prompt /*, chatId */ }) {
  return `[${agent.name} (${agent.role})]: Echo: ${prompt}`;
}

// --- Swap point: replace echoEngine with geminiEngine, openaiEngine, etc. ---
const selectedEngine = echoEngine;

/**
 * Generate a response from an agent.
 * @param {{ agent: object, prompt: string, chatId: string }} params
 * @returns {string}
 */
function generateResponse(params) {
  return selectedEngine(params);
}

module.exports = { generateResponse };
