@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed. Get it from https://nodejs.org
  pause & exit /b 1
)
if not exist node_modules call npm install
start "" /min cmd /c "npm start"
