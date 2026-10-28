@echo off
title Smart Library Management System Launcher
color 0B

echo ======================================================================
echo          Smart Library Management System - Startup Assistant
echo ======================================================================
echo.

:: Get the root directory of the project
set "PROJECT_ROOT=%~dp0"

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
if exist "%PROJECT_ROOT%venv\Scripts\python.exe" (
    start "SmartLib - FastAPI Backend Server" cmd /k "cd /d "%PROJECT_ROOT%backend" && "%PROJECT_ROOT%venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
) else (
    start "SmartLib - FastAPI Backend Server" cmd /k "cd /d "%PROJECT_ROOT%backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
)

echo [2/3] Starting Vite Frontend on http://localhost:5173 ...
start "SmartLib - Vite Frontend Client" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo [3/3] Initializing servers (waiting 5 seconds for services to spin up)...
ping 127.0.0.1 -n 6 >nul

echo.
echo Launching SmartLib in your default browser...
start http://localhost:5173

echo.
echo ======================================================================
echo   [SUCCESS] Smart Library System is up and running!
echo.
echo   - Frontend: http://localhost:5173
echo   - Backend API Docs: http://localhost:8000/docs
echo.
echo   NOTE: Keep the two server windows (Backend and Frontend) open.
echo   To stop the application, close the server windows or press Ctrl+C.
echo ======================================================================
echo.
echo Press any key to close this launcher window (servers will stay running)...
pause >nul
