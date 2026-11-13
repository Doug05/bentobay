@echo off
setlocal
cd /d "%~dp0"
echo.
echo  BentoBay: push to GitHub (private)
echo  ----------------------------------
where git >nul 2>&1
if errorlevel 1 (
  echo Git is not installed. Run: winget install Git.Git
  pause & exit /b 1
)
where gh >nul 2>&1
if errorlevel 1 (
  echo GitHub CLI is not installed. Run: winget install GitHub.cli
  pause & exit /b 1
)
gh auth status >nul 2>&1
if errorlevel 1 gh auth login
set GHUSER=
for /f "delims=" %%u in ('gh api user --jq .login') do set GHUSER=%%u
if "%GHUSER%"=="" (
  echo Could not read your GitHub username. Try: gh auth login
  pause & exit /b 1
)
echo Signed in as %GHUSER%

powershell -NoProfile -Command "foreach($f in 'package.json','README.md'){$p=Join-Path (Get-Location) $f;$c=[IO.File]::ReadAllText($p);[IO.File]::WriteAllText($p,$c.Replace('YOUR_USER','%GHUSER%'),(New-Object Text.UTF8Encoding $false))}"

if not exist .git git init -b main
git config user.name >nul 2>&1 || git config user.name "%GHUSER%"
git config user.email >nul 2>&1 || git config user.email "%GHUSER%@users.noreply.github.com"
git add -A
git diff --cached --quiet || git commit -m "BentoBay update"

gh repo view "%GHUSER%/bentobay" >nul 2>&1
if errorlevel 1 (
  gh repo create bentobay --private --source=. --remote=origin --push
) else (
  git remote get-url origin >nul 2>&1 || git remote add origin https://github.com/%GHUSER%/bentobay.git
  git push -u origin HEAD
)
if errorlevel 1 (
  echo Push failed. See the message above.
  pause & exit /b 1
)
echo.
echo Done. Private repo: https://github.com/%GHUSER%/bentobay
echo When you are ready to open source it, run go-public.bat
pause
