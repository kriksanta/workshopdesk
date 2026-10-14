# Workshop Desk

Workshop Desk is a multi-brand car workshop app for an employer and employees. The full browser app is hosted from this repository through GitHub Pages. Google Sheets stores the shared records; a Google Apps Script web app validates logins, permissions, attendance approvals, and saves.

Open the installed app at **https://kriksanta.github.io/workshopdesk/**. On Android Chrome, tap **Install app** or use the browser menu. On iPhone or iPad Safari, use **Share → Add to Home Screen**. Browser installation always needs the user's confirmation. The app needs an internet connection to load or save records.

The live Sheet and password material are not committed. `docs/` is the GitHub Pages app. `work/design/server.gs` is the Apps Script backend source, `work/design/pwa-bridge.js` connects the GitHub app to Apps Script, and `work/design/build-sheets.cjs` rebuilds the hosted app and Apps Script copy. The generated setup files in `outputs/` are local only.

To rebuild and test:

```sh
node work/design/build-sheets.cjs
node work/design/test-sheets.cjs
```

For an existing Sheet, update `apps-script/Code.gs` in its bound Apps Script project while retaining its real Sheet ID, then deploy a **new version of the existing web app deployment**. Do not run `initializeWorkshop` again; it is only for a fresh Sheet and refuses to overwrite existing data. The bridge URL in `work/design/pwa-bridge.js` must match that deployment. The bridge accepts requests only from the `kriksanta.github.io` app origin and the backend still checks every account and change. Keep the Sheet and Apps Script project private.

One example employee, customer, and job card remain for orientation. The car catalog remains and all 203 spare parts initially have quantity 0 and price 0. Employee check-in becomes attendance only after employer approval. Records refresh about every 8 seconds, and immediately when the app regains focus or a form closes. A refresh in the same browser tab keeps the signed-in session and current page until the server session expires (within 6 hours). Removing an employee disables their login and hides them from the active team while preserving past jobs and attendance; the employer can restore them. Simultaneous conflicting saves require the later user to review and repeat the change. There is no offline save queue.

No license has been selected yet. All rights remain with the repository owner.
