# Publishing BentoBay to GitHub

One Node script does the work on every system. It needs Node.js, git and the GitHub CLI (`gh`).

## Install the tools once
- Windows: `winget install Git.Git` and `winget install GitHub.cli`
- macOS: `xcode-select --install` and `brew install gh`
- Linux: your package manager, plus https://github.com/cli/cli#installation

## Step 0: fill in your details (once)
Run `configure` (`configure.bat`, `mac/configure.command`, `linux/configure.sh` or `npm run configure`). It asks for your GitHub username, repo name, name, email and (optionally) your Google OAuth client, and fills in package.json, LICENSE and the README. Your Google client is saved outside the repo and never committed. Your Anthropic API key is entered inside the app (Settings, Companion), not here.

## Step 1: push as a private repo
Run it from the `bentobay` folder (it always works on its own folder):
- Windows: double-click `push-private.bat`
- macOS: double-click `mac/push-private.command` (if it will not open: `chmod +x mac/*.command`)
- Linux: `./linux/push-private.sh`
- Any system: `npm run publish:private`

It signs you in to GitHub if needed, fills in your username and author details, then creates the private repo `bentobay` or adds your changes on top of the existing one (history is kept). It stops safely if git is working on the wrong folder or more than 300 files are staged. Run it again whenever you want to push changes.

## Step 2: make it open source later
Same way with `go-public` (`go-public.bat`, `mac/go-public.command`, `linux/go-public.sh`, or `npm run publish:public`). It scans files and history for secrets, asks you to type PUBLIC, then makes the repo public.

Making a repo public also exposes its **entire git history**. Never commit API keys, `google-client.json` or `pet.key`; they are in `.gitignore`.

## Build installers
- `build-installer` (`build-installer.bat`, `mac/build-installer.command`, `linux/build-installer.sh`) runs `npm install` and `npm run dist`, then opens the `dist` folder. On Windows this produces `BentoBay-Setup-<version>.exe`, a setup wizard that asks about shortcuts.
- `npm run dist` builds for the system you are on (Windows needs Developer Mode or an admin prompt the first time).
- Tag a release to build every platform on GitHub: `git tag v0.4.0 && git push --tags`. Mac builds need a macOS runner, which GitHub provides.

## Before going public
- Check the name BentoBay is free (GitHub, npm, trademarks).
- Add app screenshots to the README.
