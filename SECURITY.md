# Security

## Reporting a vulnerability
Please do not open a public issue. Use GitHub's "Report a vulnerability" (Security tab, private advisories) on this repository.

## Design notes
- Tools load in sandboxed, context-isolated browser views with separate sessions and no access to Node or BentoBay's IPC.
- The UI has a strict content security policy and escapes all dynamic text. Only the app's own `file://` page may call the main process.
- Views only load http(s) URLs. Mic, camera and notifications need your approval per site; other permissions are denied.
- Google tokens and your optional API key are encrypted with the OS keychain; if it is unavailable they are not stored.
- Keep Electron current: the Electron team only patches the latest three major versions. Dependabot is enabled for this.
