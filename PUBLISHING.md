# Publishing BentoBay to GitHub

## Once: install the tools (Windows)
```
winget install Git.Git
winget install GitHub.cli
```

## Step 1: push as a private repo
Double-click `push-private.bat`. It signs you in with GitHub if needed, fills in your username, commits everything and creates a **private** repo named `bentobay`. Run it again any time to push new changes.

## Step 2: make it open source later
Double-click `go-public.bat`. It scans for secrets in files and history, asks you to type PUBLIC to confirm, then flips the repo to public and adds a description and topics.

Making a repo public also exposes its **entire git history**. Never commit API keys, `google-client.json` or `pet.key`; they are already in `.gitignore`.

## By hand (if you prefer)
```
git init -b main
git add -A
git commit -m "Initial commit"
gh repo create bentobay --private --source=. --remote=origin --push
# later:
gh repo edit YOUR_USER/bentobay --visibility public --accept-visibility-change-consequences
```

## Before going public
- Check the name BentoBay is free (GitHub, npm, trademarks).
- Add screenshots to the README.
- Tag a release so installers appear: `git tag v0.3.1 && git push --tags`.
