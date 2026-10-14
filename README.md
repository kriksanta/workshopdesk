# Workshop Desk

Workshop Desk is a multi-brand car workshop app for an employer and employees. It tracks job cards, service status, inventory, stock requests, customers, invoices, estimates, attendance approvals, and daily sales. It includes print views and opens a prepared customer update in WhatsApp.

The live app is served from Google Apps Script and stores workshop records in a Google Sheet. The sheet itself and password material are **not** part of this repository.

## Deploy the connected app

1. Create a private Google Sheet and open **Extensions → Apps Script**.
2. Copy [`apps-script/Code.gs`](apps-script/Code.gs) into **Code.gs**. Replace `REPLACE_WITH_YOUR_SPREADSHEET_ID` with the ID between `/d/` and `/edit` in your Sheet URL.
3. Create an HTML file named **Index** and copy [`apps-script/Index.html`](apps-script/Index.html) into it.
4. In **Project Settings → Script properties**, create `ADMIN_INITIAL_PASSWORD` with a **new, unique password of at least 8 characters**. Do not commit or share it. Save the project.
5. In the editor function dropdown, select `initializeWorkshop` and click **Run**. Authorize it with the owner account. It creates a `WorkshopDesk_Data` tab and refuses to overwrite an existing one. The initial password property is removed after setup.
6. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, then deploy. Share only the web app URL with employees. Keep the Sheet and Apps Script project private.

Admin username initially is `admin`; you can change its display name and username in Settings. Employee usernames are their phone numbers, and the employer sets their passwords. To update later, save code, then choose **Deploy → Manage deployments → Edit → New version → Deploy**. Do not run setup again.

## Source and builds

`work/design/dist/` contains the original static design preview. Its demo admin login is disabled in this public copy. It has no shared storage; use the deployed Apps Script app for real records.

`work/design/server.gs` is the backend source, `work/design/sheets-bridge.js` connects browser actions to it, and `work/design/build-sheets.cjs` builds the Apps Script files. The supplied `apps-script/` files are ready to paste after setting the Sheet ID. To rebuild locally, run:

```sh
node work/design/build-sheets.cjs
node work/design/test-sheets.cjs
```

The builder writes to `outputs/Google-Sheets-Setup/`. It uses the Sheet ID in `work/design/server.gs`. Never put a real password in source code or commit generated files containing credentials.

## Data and limits

The `WorkshopDesk_Data` tab contains JSON chunks and a revision number. Edit records in Workshop Desk rather than modifying those cells directly. Password verifiers are kept in Apps Script Script Properties, separate from the Sheet. Employee actions are checked on the server: stock can only be issued against an assigned job; attendance requires employer approval. Conflicting saves require the later user to review and repeat the change. Shared changes refresh every 30 seconds when no form is open. This version requires an internet connection and uses Apps Script quotas; it has no offline save queue.

The Apps Script web app can be added as a browser Home Screen shortcut where the mobile browser offers that command. Browsers do not allow a webpage to force installation, and this Apps Script-hosted version is not an installable offline PWA. Its Home screen button provides device instructions when no browser install prompt is available.

One example employee, customer and job card are included for orientation. All spare parts start at quantity 0 and price 0. The Indian vehicle catalog is retained. The original static preview is a design artifact, not the connected app.

## Validation

`test-sheets.cjs` covers login, role isolation, stock accounting, attendance approval, password reset, conflict detection, and preservation of other employees' data. `check-attendance.cjs` covers the static preview attendance behavior. The deployed login and dashboard were verified; end-to-end persistence and printing should be checked in your own deployment before real use.

## License

No license has been selected yet. All rights remain with the repository owner.
