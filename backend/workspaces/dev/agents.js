/**
 * Agent Management Utility for Rex Desk workspace.
 */

const agentsList = [
    { id: 1, name: 'Rex', role: 'System Orchestrator / PM' },
    { id: 2, name: 'Dev', role: 'Fullstack Developer' },
    { id: 3, name: 'QA Reviewer', role: 'Quality Assurance & Security' }
];

/**
 * Returns a defensive shallow copy of the active agents list.
 * Prevents external caller mutation of internal state.
 * @returns {Array<Object>} - Array of agent objects.
 */
function getAgents() {
    return agentsList.map(a => ({ ...a }));
}

/**
 * Finds an agent by name safely with defensive guards.
 * @param {string} name - The agent name to search for.
 * @returns {Object|null} - The agent object or null if not found.
 */
function findAgentByName(name) {
    if (!name || typeof name !== 'string') {
        return null;
    }
    const query = name.trim().toLowerCase();
    if (!query) {
        return null;
    }
    const found = agentsList.find(a => a && typeof a.name === 'string' && a.name.trim().toLowerCase() === query);
    return found ? { ...found } : null;
}

module.exports = {
    getAgents,
    findAgentByName
};
