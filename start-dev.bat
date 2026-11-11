@echo off
cd /d "%~dp0"
echo Starting Rex Desk MVP (Backend + Frontend)...
start "Rex Desk Backend" cmd /k "npm --prefix backend run dev"
start "Rex Desk Frontend" cmd /k "npm --prefix frontend run dev"
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5001
