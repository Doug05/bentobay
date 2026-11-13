# Contributing to BentoBay

- `npm install`, then `npm start` to run, `npm run check` for a syntax check.
- `main.js` is the Electron main process, `src/` holds Google auth and the Gmail scanner, `renderer/` is the UI (`core.js` state and logic, `pages.js` screens, `app.js` events).
- Add a tool to `src/catalog.js` (include sender domains for auto-detect if it sends receipts).
- Keep it local-first: no telemetry, and usage stats stay time counters only.
- Please open an issue before large changes.
