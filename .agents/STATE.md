# Rex Desk MVP — Project State

## 1. Last Session
- **Session**: Antigravity IDE
- **Timestamp**: 2026-11-12T00:40:00+07:00

## 2. Summary
- **Step 1 (Skeleton + Chat UI + Echo Engine) COMPLETE**:
  - Express backend (port 5001) + React Vite frontend (port 5173).
  - Seeded agents (Rex, Dev) with JSON storage.
- **Step 2 (Wire ONE Real Agent — Dev via Gemini CLI) COMPLETE**:
  - Created sandbox folder `backend/workspaces/dev/` (.gitkeep). Dev works strictly inside this folder.
  - Added Gemini CLI runner in `backend/services/agentEngine.js`:
    - Spawns Gemini CLI in headless mode (`--skip-trust`, `-y`, `-m gemini-3.5-flash-lite`, `-p Dev:`, stdin prompt stream).
    - Working directory set to `backend/workspaces/dev/`.
    - Prompt includes role instruction + last 10 messages conversation context + user message.
    - Timeout: 120s with visible error message (`⚠️ Gemini CLI error: <first line>`).
    - Dev runs Gemini engine on 1-on-1 chat and in group chat ONLY when tagged with `@Dev`.
  - Added `"engine"` field to `agents.json` (`Rex: "echo"`, `Dev: "gemini"`, default `"echo"`).
  - **Verified**:
    - (a) Dev created `backend/workspaces/dev/hello.txt` with content `Hello from Dev`.
    - (b) Dev answered real conceptual questions about React `useEffect` (NOT an echo).
    - (c) Rex and other agents still echo. Group chat responds to `@Dev` with real Gemini engine while other agents echo.

## 3. Active Environment
- **GitHub Repository**: https://github.com/Ny-Panha/rex-desk-mvp
- **Backend API**: `http://localhost:5001` (Node.js Express + Gemini CLI runner)
- **Frontend UI**: `http://localhost:5173` (Vite + React)
- **Dev Sandbox Directory**: `c:\Users\nhastar\Desktop\Agent Dev\rex-desk-mvp\backend\workspaces\dev`
- **Data Stores**:
  - `rex-desk-mvp/backend/data/agents.json`
  - `rex-desk-mvp/backend/data/messages.json`

## 4. Next Steps
- **Step 3 — Lead (Rex) routing**: Agent ប្រធាន (Rex) ទទួលសារអ្នក → សម្រេចចាត់ការឱ្យ agent ណា (ចាប់ផ្ដើមពី @mention / rule សាមញ្ញមុន) → post ការងារចូល group chat។
