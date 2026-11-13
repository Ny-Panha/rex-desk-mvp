# Rex Desk MVP — Project State

## 1. Last Session
- **Session**: Antigravity IDE
- **Timestamp**: 2026-11-13T20:42:00+07:00
- **Active Branch**: `fix/clean-engine-connections` (forked from HEAD `7aa8133`)

## 2. Summary of Changes (Clean Engine Connections Pass)
Fixed the 6 critical internal engine disconnects identified in code audit:

1. **Commit 1 (`c68b23e`) — Approval Gate Real Execution**:
   - Replaced canned/mock strings for `git_push` and `merge` with real child process executions (`execSync`) in the repository root.
   - Captured real stdout / stderr; surfaces exact errors (authentication, rejected pushes, merge conflicts) to user & agent instead of falsifying success.
   - Added path boundary sanitization (`path.basename`) for `file_delete` to prevent directory traversal.

2. **Commit 2 (`d15f778`) — Honest Queue Status & Startup Recovery**:
   - Created `isAgentEngineError()` helper to detect Gemini CLI error messages, timeouts, and process failures.
   - Queue worker marks jobs as `'failed'` on error instead of falsely claiming `'completed'`.
   - Added `recoverQueueOnStartup()`: resets interrupted `'running'` jobs to `'pending'` on server reboot and immediately resumes queue processing.
   - Added `'failed'` badge (`AlertTriangle` in rose) to `QueueModal.jsx`.

3. **Commit 3 (`25c1d4b`) — Group Chat Real QA Reviewer Execution**:
   - Eliminated canned mock reply (`"ខ្ញុំកំពុងរៀបចំពិនិត្យមើល..."`) when Rex routes to QA Reviewer or on `@qa` mention.
   - Calls real `generateResponse({ agent: qaAgent, forceEngine: true, reviewContext: devDiff })` via Gemini CLI.

4. **Commit 4 (`2ecf87f`) — Atomic Serialized Message Persistence (Eliminate Race Condition)**:
   - Replaced 240s dirty in-memory reads and blind `writeJSON(MESSAGES_FILE, messages)` overwrites with serialized promise-queue based `appendMessages()` and `updateMessages()`.
   - Incoming user messages and background queue worker logs are written immediately without overwriting each other.

5. **Commit 5 (`3a40d89`) — Gemini AI Engine for Custom Added Agents**:
   - Changed backend default for new agents from `echo` to `gemini`.
   - Extended `agentEngine.js` so any custom agent with `engine: 'gemini'` invokes Gemini CLI with a tailored role prompt instruction in Khmer + English.
   - Added AI Engine selector (`Gemini CLI` vs `Echo`) to `AddAgentModal.jsx` and piped it through `App.jsx`.

6. **Commit 6 (`2a0c7e1`) — Honor targetAgent & Eliminate Ghost Diffs**:
   - Queue worker dynamically resolves `nextJob.targetAgent` (e.g. `@QA Reviewer`, `@Dev`, or custom specialist) instead of hardcoding `Dev`.
   - Updated `getDevWorkspaceDiff()` to return clean empty string when no user files exist, and added `hasDevWorkspaceChanges()`.
   - Prevented QA Reviewer from auditing empty workspaces or self-auditing its own jobs.
   - Added agent selector dropdown in `QueueModal.jsx` and smart target parsing for `/queue @qa <task>`.

## 3. Active Environment
- **GitHub Repository**: https://github.com/Ny-Panha/rex-desk-mvp
- **Active Branch**: `fix/clean-engine-connections`
- **Backend API**: `http://localhost:5001` (Node.js Express + Lead Routing + Dev & QA Gemini Runners + Real Approval Gate + Resilient Queue Worker)
- **Frontend UI**: `http://localhost:5173` (Vite + React)
- **Workspaces**:
  - Dev: `c:\Users\nhastar\Desktop\Agent Dev\rex-desk-mvp\backend\workspaces\dev`
  - QA: `c:\Users\nhastar\Desktop\Agent Dev\rex-desk-mvp\backend\workspaces\qa`

## 4. Next Steps
- Push branch `fix/clean-engine-connections` to remote repository `origin` for Nha's commit-by-commit review before merging into `main`.
