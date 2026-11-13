# Rex Desk MVP — Project State

## 1. Last Session
- **Session**: Antigravity IDE
- **Timestamp**: 2026-11-13T21:21:00+07:00
- **Active Branch**: `fix/ui-connections` (forked from `fix/clean-engine-connections` at `8dcb91b`)

## 2. Summary of Changes (UI Connections Pass: U1 – U7)
Completed all 7 UI disconnect fixes, committed atomically in order:

1. **Commit U1 (`0083624`) — Real Connection Status Across Cockpit**:
   - `backend/services/agentEngine.js`: Exported `GEMINI_MODEL = 'gemini-3.5-flash-lite'` as single source of truth.
   - `backend/server.js`: Added `GET /api/health` returning `{ ok: true, model: GEMINI_MODEL, uptime }`.
   - `frontend/src/App.jsx`: Polled `/api/health` every 3.5s; manages `backendOnline` and `modelName` state.
   - `frontend/src/components/Sidebar.jsx` & `ChatPanel.jsx`: Derived Live/Offline badge, agent presence dots, Sandbox Active/Offline status, and header status from `backendOnline`. Rendered slim rose alert banner when backend is offline.

2. **Commit U2 (`f89870d`) — Working Indicator & No Silent Message Loss**:
   - `frontend/src/App.jsx`: `handleSend` returns `true` on success and `false` on failure.
   - `frontend/src/components/ChatPanel.jsx`: Shows working indicator bubble with animated dots during request (`Rex Desk is working…`). Clears input only on success; preserves input and displays inline rose error banner on network failure.

3. **Commit U3 (`c17aa6e`) — Scroll Stability & Message Deduplication**:
   - `frontend/src/App.jsx`: `fetchMessages` skips `setMessages` if length and last message ID are unchanged. `handleSend` deduplicates incoming messages by ID.
   - `frontend/src/components/ChatPanel.jsx`: Tracks viewport bottom (<=120px). Auto-scrolls only when near bottom; displays floating `"↓ New messages"` button when user is scrolled up.

4. **Commit U4 (`8b58a79`) — Markdown Parser for Bold & Inline Code**:
   - `frontend/src/components/MessageBubble.jsx`: Added inline tokenizer for `**bold**` (<strong>) and `` `code` `` (<code className="chip">) in non-code-block text without breaking Khmer characters or multi-line code blocks.

5. **Commit U5 (`d6da16a`) — Visual Agent Error States & Queue Failure Badges**:
   - `frontend/src/components/MessageBubble.jsx`: Messages starting with `"⚠️"` or `"Error processing"` render with rose border and an `"Agent Error"` badge.
   - `frontend/src/components/ChatPanel.jsx`: Header Queue trigger displays a rose badge with failed job count alongside pending/running counts.

6. **Commit U6 (`b672685`) — Agent Engine Tags & Custom Agent Deletion**:
   - `backend/server.js`: Added `DELETE /api/agents/:id` with 400 rejection guard for seed trio (`Rex`, `Dev`, `QA Reviewer`).
   - `frontend/src/components/Sidebar.jsx`: Added engine badges (`Lead`, `Gemini`, `Echo`) and name-first role resolution. Added hover trash icon with confirmation dialog to delete custom agents and auto-switch active chat to Group Chat.

7. **Commit U7 (`6f92550`) — Honesty Cosmetics, Copy Button & Dynamic Model**:
   - `frontend/src/components/MessageBubble.jsx`: Changed approval footer to `"✓ Approved by Nha (Executed)"` (dropped `"on Workspace"`). Added functional "Copy" button to code blocks with 1.5s `"Copied"` confirmation.
   - `frontend/src/components/ChatPanel.jsx` & `Sidebar.jsx`: Replaced all hardcoded `"Gemini 3.5 Flash-Lite"` strings with dynamic `modelName` prop and offline state handling.

## 3. Active Environment
- **GitHub Repository**: https://github.com/Ny-Panha/rex-desk-mvp
- **Active Branch**: `fix/ui-connections`
- **Backend API**: `http://localhost:5001` (Node.js Express + Health endpoint + Real Engine + Dynamic Agents)
- **Frontend UI**: `http://localhost:5173` (Vite + React, production build verified)
- **Workspaces**:
  - Dev: `c:\Users\nhastar\Desktop\Agent Dev\rex-desk-mvp\backend\workspaces\dev`
  - QA: `c:\Users\nhastar\Desktop\Agent Dev\rex-desk-mvp\backend\workspaces\qa`

## 4. Next Steps
- Push branch `fix/ui-connections` to remote repository `origin` for Nha's commit-by-commit review.
