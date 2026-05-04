@echo off
chcp 65001 >nul
title Birthday Memorial Website
echo.
echo   Starting Birthday Memorial Website...
echo.
cd /d "%~dp0"
node server.js
pause
