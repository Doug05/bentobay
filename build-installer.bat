@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required: https://nodejs.org
  pause & exit /b 1
)
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause & exit /b 1
)
call npm run dist
if errorlevel 1 (
  echo Build failed. If it mentions a symbolic link, turn on Developer Mode in Windows settings, or run this as Administrator.
  pause & exit /b 1
)
echo.
echo Done. Your installer is in the dist folder.
start "" dist
pause
