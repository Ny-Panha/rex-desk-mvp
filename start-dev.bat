@echo off
echo Starting Rex Desk MVP (Backend + Frontend)...
start "Rex Desk Backend" cmd /k "cd backend && npm run dev"
start "Rex Desk Frontend" cmd /k "cd frontend && npm run dev"
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5001
pause

