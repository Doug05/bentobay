@echo off
setlocal
cd /d "%~dp0"
echo.
echo  BentoBay: make the repo PUBLIC (open source)
echo  --------------------------------------------
where gh >nul 2>&1
if errorlevel 1 (
  echo GitHub CLI is not installed. Run: winget install GitHub.cli
  pause & exit /b 1
)
set GHUSER=
for /f "delims=" %%u in ('gh api user --jq .login') do set GHUSER=%%u
if "%GHUSER%"=="" (
  echo Could not read your GitHub username. Try: gh auth login
  pause & exit /b 1
)

echo Scanning tracked files for secrets...
git grep -q -I -E "sk-ant-[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|AIza[0-9A-Za-z_-]{20}|GOCSPX-" -- . ":(exclude)go-public.bat"
if %errorlevel%==0 (
  echo Possible secret found in your files. Aborting.
  echo See it with: git grep -n -I -E "sk-ant-|ghp_|github_pat_|AIza|GOCSPX-"
  pause & exit /b 1
)
echo Scanning git history for secrets...
git log --all --format=%%h -G "sk-ant-[A-Za-z0-9]|ghp_[A-Za-z0-9]|github_pat_|AIza[0-9A-Za-z_-]{20}|GOCSPX-" -- . ":(exclude)go-public.bat" > "%TEMP%\bentobay_hist.txt"
for %%F in ("%TEMP%\bentobay_hist.txt") do if %%~zF gtr 0 (
  echo Possible secret found in git history. Aborting. Clean the history before going public.
  pause & exit /b 1
)
echo No secrets found.

echo.
echo  This makes %GHUSER%/bentobay PUBLIC.
echo  Anyone will be able to read the code and the full git history.
echo.
set /p OK=Type PUBLIC to continue: 
if /i not "%OK%"=="PUBLIC" (
  echo Cancelled. Nothing changed.
  pause & exit /b 0
)

gh repo edit "%GHUSER%/bentobay" --visibility public --accept-visibility-change-consequences --description "One native desktop bay for all your AI tools" --add-topic electron --add-topic ai --add-topic productivity --add-topic desktop-app --add-topic llm
if errorlevel 1 (
  echo Could not change visibility. See the message above.
  pause & exit /b 1
)
echo.
echo BentoBay is now public: https://github.com/%GHUSER%/bentobay
echo Next: tag a release so installers get built: git tag v0.3.1 ^&^& git push --tags
pause
