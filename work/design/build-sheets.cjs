const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname,out=path.resolve(root,'../../outputs/Google-Sheets-Setup');fs.mkdirSync(out,{recursive:true});
const read=n=>fs.readFileSync(path.join(root,'dist',n),'utf8');
const ctx=vm.createContext({Intl,Date});
const original=read('app.js');
vm.runInContext(read('catalog.js')+'\n'+original.slice(0,original.indexOf('const customer='))+'\nglobalThis.seed=JSON.stringify(state);',ctx);
const seed=ctx.seed;
fs.writeFileSync(path.join(root,'seed.json'),seed);
let backend=fs.readFileSync(path.join(root,'server.gs'),'utf8')+'\nfunction seed_(){return '+seed+';}\n';
fs.writeFileSync(path.join(out,'Code.gs'),backend);
let app=original.replace(/const ADMIN_PASSWORD_HASH=.*?;\r?\n/,'').replace(/async function login\(form\)\{[^\n]*\}\r?\n/,'');
app=app.replace('function render(){','function renderLocal(){\n today=day();').replace('const today=day();','let today=day();');
// The preview ends with render(). In the connected app that would clear the
// stored token before restoreRemote() gets a chance to read it.
if(!/render\(\);\s*$/.test(app))throw Error('Client startup patch failed');
app=app.replace(/render\(\);\s*$/,'renderLocal();');
app=app.replace('function toast(', 'function toastLocal(');
app=app.replace("case'logout':session=null;role='employer';closeModal();render();break;","case'logout':logoutRemote();break;");
app=app.replace('Design preview · One example workflow · Changes reset on refresh','Google Sheets · Shared workshop records').replace('Google Sheets connection planned','Updates about every 8 seconds').replace('Design preview · No storage connected','Google Sheets connected');
app=app.replace('Interactive design preview','Workshop sign-in').replace('Design first. Connection later.','Your workshop, connected.').replace('Accounts and changes stay in this tab only and reset on refresh. This is a login flow preview, not secure production authentication. Google Sheets is not connected.','Sign in with your workshop account. Saved changes are shared across devices using your Google Sheet.');
app=app.replace('Accounts last only until this page is refreshed; secure shared login will need a backend.','Accounts are checked by the server; employee passwords can be reset here.').replace('Passwords and accounts only last for this preview session; they reset on refresh.','The password is set on the server and is never stored in the spreadsheet.');
app=app.replace('Save preview','Save settings').replace('Design mode: changes are used in this session’s documents. They are not stored and will reset on refresh.','Saved shop details appear on invoices, estimates and job cards on every device.');
// Confirm all intended replacements actually landed.
if(app.includes('ADMIN_PASSWORD_HASH')||app.includes('async function login(')||!app.includes('function toastLocal('))throw Error('Client patch failed');
let account=read('account-install.js').replace('This preview remembers changes only until refresh.','Saved changes apply to your next sign-in.');
account=account.replace(/function installAppButton\(extra=''\)\{[^\n]*\}/,"function installAppButton(extra=''){return `<button type=\"button\" class=\"btn small ${extra}\" data-action=\"install-app\">${icon('download')}<span>Home screen</span></button>`}");
account=account.replace(/function showInstallHelp\(\)\{[\s\S]*?\n\}/,`function showInstallHelp(){openModal('Open Workshop Desk on your device', '<p>Open your Apps Script web app URL in your mobile browser. Use the browser menu to bookmark it, or Add to Home Screen if available.</p><p class="notice-inline">This Apps Script version needs an internet connection. It does not provide an installable offline app.</p>',btn('Got it','close','','primary'));}`);
let html=read('index.html').replace('<head>','<head><base target="_top">').replace('<link rel="manifest" href="manifest.webmanifest">','');
const icon='data:image/png;base64,'+fs.readFileSync(path.join(root,'dist/icon-192.png')).toString('base64');html=html.replaceAll('href="icon-192.png"',`href="${icon}"`);
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+read('style.css')+'</style>');
const files={'catalog.js':read('catalog.js'),'attendance.js':read('attendance.js'),'account-install.js':account,'app.js':fs.readFileSync(path.join(root,'sheets-bridge.js'),'utf8')+'\n'+app+'\nrestoreRemote();'};
// Apps Script's HTML processing can mistake URL slashes inside nested templates for comments.
for(const [n,source]of Object.entries(files))html=html.replace(`<script src="${n}"></script>`,()=>'<script>'+source.replace(/https:\/\//g,'https:\\x2f\\x2f')+'</script>');
fs.writeFileSync(path.join(out,'Index.html'),html);
// GitHub Pages runs the full client; the Apps Script page is only its data bridge.
const docs=path.resolve(root,'../../docs');fs.mkdirSync(docs,{recursive:true});
const staticHtml=read('index.html').replace('Multi-brand workshop management design preview. Jobs, inventory, attendance and billing in one place.','Jobs, inventory, attendance and billing backed by Google Sheets.').replace('<script src="attendance.js"></script>','<script src="attendance.js?v=4"></script>').replace('<script src="app.js"></script>','<script src="app.js?v=8"></script>').replace('</body>','<script>if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));</script></body>');
fs.writeFileSync(path.join(docs,'index.html'),staticHtml);
for(const file of ['style.css','catalog.js','attendance.js','icon-192.png','icon-512.png'])fs.copyFileSync(path.join(root,'dist',file),path.join(docs,file));
const pwaAccount=read('account-install.js').replace('This preview remembers changes only until refresh.','Saved changes are shared across your devices.').replace('Installing does not enable data storage: records and account edits still reset when the page reloads.','An internet connection is needed to read and save your Google Sheet.');
fs.writeFileSync(path.join(docs,'account-install.js'),pwaAccount);
const bridgeClient=fs.readFileSync(path.join(root,'sheets-bridge.js'),'utf8').replace(/^function rpc\(name,\.\.\.args\)\{.*\}\r?\n/m,'');
if(bridgeClient.includes('google.script.run'))throw Error('PWA still calls google.script.run directly');
fs.writeFileSync(path.join(docs,'app.js'),fs.readFileSync(path.join(root,'pwa-bridge.js'),'utf8')+'\n'+bridgeClient+'\n'+app+'\nrestoreRemote();');
const steps=`WORKSHOP DESK — GOOGLE SHEETS SETUP

Target sheet: https://docs.google.com/spreadsheets/d/REPLACE_WITH_YOUR_SPREADSHEET_ID/edit

1. In the Apps Script editor, replace Code.gs with the entire contents of Code.gs supplied here. Save.
2. Click + beside Files > HTML. Name it Index (capital I). Replace its contents with the entire supplied Index.html. Save.
3. Open Project Settings (gear). Under Script properties, add ADMIN_INITIAL_PASSWORD. Set its value to your requested admin password. Save properties. Do not share your script project with employees.
4. Return to Editor. Select initializeWorkshop in the function dropdown and click Run. Authorize the script with the Google account that owns this sheet. Setup creates WorkshopDesk_Data and preserves all other tabs. It will refuse to overwrite an existing WorkshopDesk_Data tab. The initial password property is removed after successful setup.
5. Deploy > New deployment > type Web app. Execute as: Me. Who has access: Anyone (if your account permits it). This exposes the login page; application records require a valid workshop login. Keep the spreadsheet and script private. Click Deploy and authorize the requested spreadsheet access.
6. Copy the Web app URL ending in /exec. Open it to use the CONNECTED app; the old local Workshop-Desk.html remains a design preview. Admin username starts as admin. The password is the value set in step 3.
7. Add/edit an employee and set a password. The phone number is their username. Give employees only the web app URL, not the sheet or script editor link.

VERIFY BEFORE REAL USE
Create a customer and refresh/sign in again; verify it persists. Use a second browser for employee login. Request check-in, approve it from admin, and verify the employee sees Present. Set stock to 2 as admin, issue 1 as employee, and verify both see 1. Test a printed job card and invoice from your device. Live Google deployment and printing have not been tested yet.

STORAGE AND LIMITS
WorkshopDesk_Data stores application records as JSON chunks with a revision. Do not edit these cells directly. Customer/employee management is through the app. Google Sheets version history can help recover an accidental owner edit. Password verifiers are held in Script Properties, never in the sheet. Tokens expire within 6 hours; refresh requires sign-in. Changing an employee password invalidates that employee's sessions. Sign-in attempts are rate limited. This is a small-workshop implementation using Apps Script quotas, not a high-volume database. Simultaneous edits are detected: the later user must review the latest data and repeat their change. There is no offline save queue. Maximum combined data is 3 MB in this version.

One clearly labelled example workflow remains. All 203 parts start at stock 0 / price 0; the car catalog is retained. Employee check-ins are stamped with server time in Asia/Kolkata. Approval is required to count as attendance. The app refreshes shared changes every 30 seconds when no form is open. The Apps Script page supports browser bookmarking/Home Screen shortcuts where available; it is not an installable offline PWA.

UPDATES
After future code edits: Deploy > Manage deployments > Edit > Version: New version > Deploy. Keep the same deployment URL. Never run setup to reset data.

Google documentation: https://developers.google.com/apps-script/guides/web
HTML-to-server calls: https://developers.google.com/apps-script/guides/html/communication
`;
fs.writeFileSync(path.join(out,'READ-ME-FIRST.txt'),steps);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
fs.writeFileSync(path.join(out,'Copy-Setup-Files.html'),`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Workshop Desk setup files</title><style>body{font:16px system-ui;max-width:850px;margin:35px auto;padding:20px;color:#19382f}button{padding:12px;background:#164e46;color:white;border:0;border-radius:8px;cursor:pointer}textarea{width:100%;height:150px;margin:15px 0;font:12px monospace}pre{white-space:pre-wrap;line-height:1.5}</style><h1>Workshop Desk · Manual setup</h1><p>Copy each complete file into the matching Apps Script file.</p><h2>1. Code.gs</h2><button onclick="copy('code',this)">Copy Code.gs</button><textarea id="code" readonly>${escape(backend)}</textarea><h2>2. Index.html</h2><button onclick="copy('html',this)">Copy Index.html</button><textarea id="html" readonly>${escape(html)}</textarea><h2>Setup steps</h2><pre>${escape(steps)}</pre><script>async function copy(id,b){let t=document.getElementById(id);t.focus();t.select();try{await navigator.clipboard.writeText(t.value);b.textContent='Copied';}catch{b.textContent='Selected — press Ctrl+C or Copy';}}</script></html>`);
console.log('Generated Code.gs, Index.html, copy helper and setup guide.');
