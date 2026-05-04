@echo off
chcp 65001 >nul
title Birthday Memorial Website
echo.
echo   Starting Birthday Memorial Website...
echo.
cd /d "%~dp0"
start /b node server.js
timeout /t 2 >nul
npx localtunnel --port 3000
pause
