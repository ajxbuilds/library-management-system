@echo off
title Stop Smart Library System
color 0C

echo ======================================================================
echo           Stopping Smart Library System Servers...
echo ======================================================================
echo.

:: Terminate server windows by window title
taskkill /F /FI "WINDOWTITLE eq SmartLib - FastAPI Backend Server*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq SmartLib - Vite Frontend Client*" /T >nul 2>&1

:: Free ports 8000 and 5173 if still bound
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo [OK] All backend and frontend servers have been stopped.
echo.
ping 127.0.0.1 -n 3 >nul
