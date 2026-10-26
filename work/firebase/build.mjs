import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),source=path.join(root,'work/design/dist'),out=path.join(root,'firebase-public');
fs.mkdirSync(out,{recursive:true});
const read=(name)=>fs.readFileSync(path.join(source,name),'utf8');
const original=read('app.js');
let app=original.replace(/const ADMIN_PASSWORD_HASH=.*?;\r?\n/,'').replace(/async function login\(form\)\{[^\n]*\}\r?\n/,'');
app=app.replace('const today=day();','let today=day();').replace('function render(){','function renderLocal(){').replace('function toast(', 'function toastLocal(');
if(!/render\(\);\s*$/.test(app))throw Error('Client startup patch failed');
app=app.replace(/render\(\);\s*$/,'');
app=app.replace("case'logout':session=null;role='employer';closeModal();render();break;","case'logout':logoutRemote();break;");
app=app.replace('Design preview · One example workflow · Changes reset on refresh','Firebase · Shared workshop records')
 .replace('Google Sheets connection planned','Live updates')
 .replace('Design preview · No storage connected','Firebase connected')
 .replace('Interactive design preview','Workshop sign-in')
 .replace('Design first. Connection later.','Your workshop, connected.')
 .replace('Accounts and changes stay in this tab only and reset on refresh. This is a login flow preview, not secure production authentication. Google Sheets is not connected.','Your workshop data is shared securely through Firebase.')
 .replace('Employees use their phone number.','Employees use their email address.')
 .replace('Your admin sets your password when adding you to the team. Ask your admin if you need it reset.','Your workshop owner creates your account. Ask for a password reset email if needed.')
 .replace('Employees log in with their phone number and the password set by the admin.','Employees log in with their email address and the password set when their account is created.')
 .replace('Save preview','Save settings').replace('Design mode: changes are used in this session’s documents. They are not stored and will reset on refresh.','Saved shop details appear on invoices, estimates and job cards on every device.');
app=app.replace('label for="login-user">Username','label for="login-user">Email')
 .replace('name="username" autocomplete="username" placeholder="Email"','name="username" type="text" autocomplete="username" placeholder="Email"')
 .replace('</form><div class="login-note">','</form><button type="button" class="btn light login-submit" data-action="login-reset" style="margin-top:12px">Forgot password?</button><div class="login-note">');
const employeeForm=`function employeeForm(id){if(role!=='employer')return;const e=state.employees.find(e=>e.id===id)||{};formModal(id?'Edit team member':'Add to your team',\`<input type="hidden" name="id" value="\${id||''}"><div class="form-grid">\${field('Full name','name',e.name,'text',true)}\${field('Job role','job',e.job,'text',true)}\${field('Phone','phone',e.phone,'tel',true)}\${field('Employee login email','email',e.email,'email',true)}\</div><div class="info" style="margin:18px 0 0">New employees receive a password setup email. They choose their password from that email, then sign in using their email address. Only this workshop can see their jobs and attendance.</div>\${e.authUid?btn('Send password reset email','reset-employee-password','','small',\`data-id="\${e.id}"\`):''}\`, 'employee');}`;
app=app.replace(/function employeeForm\(id\)\{[^\n]*\}/,employeeForm);
app=app.replace("${btn('Edit','edit-employee','edit','small',`data-id=\"${e.id}\"`)}", "${btn('Edit','edit-employee','edit','small',`data-id=\"${e.id}\"`)}${e.authUid?btn('Password reset','reset-employee-password','','small',`data-id=\"${e.id}\"`):''}");
const employeeCase=`case'employee':{if(role!=='employer')return;const old=state.employees.find(x=>x.id===d.id);const phone=d.phone.replace(/\\D/g,'');const email=String(d.email||'').trim().toLowerCase();if(!/^\\d{10,15}$/.test(phone))return error('Enter a valid phone number (10–15 digits).');if(!email||!email.includes('@'))return error('Enter the employee login email.');if(state.employees.some(e=>e.phone===phone&&e.id!==d.id))return error('This phone number is already used by another employee.');if(state.employees.some(e=>e.email?.toLowerCase()===email&&e.id!==d.id))return error('This email is already used by another employee.');if(old?.authUid&&old.email.toLowerCase()!==email)return error('To change a login email, create a new employee account.');const record={id:d.id||\`e\${Date.now()}\`,name:d.name,job:d.job,email,phone,active:old?.active!==false};if(!old?.authUid)record.authUid=await WDF.provision(record);else record.authUid=old.authUid;if(old)Object.assign(old,record);else state.employees.push(record);break}`;
app=app.replace(/case'employee':\{[\s\S]*?break\}case'attendance':/,employeeCase+"case'attendance':");
app=app.replace('e.active=false;closeModal();render();toast(`${e.name} removed from the active team.`);','(e.authUid?WDF.setProfile(e.authUid,e.id,false):Promise.resolve()).then(()=>{e.active=false;closeModal();render();toast(`${e.name} removed from the active team.`)}).catch(x=>toast(WDF.authError(x)));');
app=app.replace('e.active=true;render();toast(`${e.name} restored to the team.`);','(e.authUid?WDF.setProfile(e.authUid,e.id,true):Promise.resolve()).then(()=>{e.active=true;render();toast(`${e.name} restored to the team.`)}).catch(x=>toast(WDF.authError(x)));');
app=app.replace('</span>\`;', '</span>\`;');
app=app.replace('<p class="notice-inline">Employees log in with their email address and the password set when their account is created.</p>','<p class="notice-inline">Employees sign in with email. Use the password reset button if an existing employee forgets their password.</p>');
app=app.replace('file.size>2*1024*1024','file.size>600*1024').replace('under 2 MB','under 600 KB');
app=app.replace('if(a)Object.assign(a,request);else state.attendance.push(request);','if(a)Object.assign(a,{...request,id:a.id});else state.attendance.push(request);');
app=app.replace("${installAppButton('topbar-install')}","${false?'':''}${installAppButton('topbar-install')}");
if(app.includes('ADMIN_PASSWORD_HASH')||app.includes('async function login(')||!app.includes('function toastLocal(')||!app.includes('WDF.provision'))throw Error('Firebase UI patch failed');
let account=read('account-install.js').replace('This preview remembers changes only until refresh.','Saved changes are shared across devices.')
 .replace('Installing does not enable data storage: records and account edits still reset when the page reloads.','An internet connection is needed to sync your workshop records.')
 .replace('Admin login username','Admin reference').replace('Your current password stays the same.','Owner sign-in uses your Google account.');
const sourceHtml=read('index.html').replace('Multi-brand workshop management design preview. Jobs, inventory, attendance and billing in one place.','Multi-brand workshop management with live jobs, inventory, attendance and billing.');
fs.writeFileSync(path.join(out,'index.html'),sourceHtml.replace('<script src="app.js"></script>','<script src="firebase-runtime.js"></script><script src="app.js"></script><script>if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));</script>'));
for(const file of ['style.css','theme.css','theme.js','app-chrome.js','catalog.js','brand-catalog.js','attendance.js','brand-logo.png','favicon-48.png','icon-192.png','icon-512.png','icon-192-blue.png','icon-512-blue.png'])fs.copyFileSync(path.join(source,file),path.join(out,file));
account=account.replace(/function settingsPage\(\)[\s\S]*?(?=document.addEventListener\('click',event)/,fs.readFileSync(path.join(here,'account-override.js'),'utf8')+'\n');
fs.writeFileSync(path.join(out,'account-install.js'),account);
const seed=JSON.parse(fs.readFileSync(path.join(root,'work/design/seed.json'),'utf8'));
const fresh={settings:seed.settings,inventory:seed.inventory};
fs.writeFileSync(path.join(out,'app.js'),'const WD_SEED='+JSON.stringify(fresh)+';\n'+fs.readFileSync(path.join(here,'bridge.js'),'utf8')+'\n'+fs.readFileSync(path.join(here,'admin-portal.js'),'utf8')+'\n'+app+'\nfirebaseBoot();\n');
await build({entryPoints:[path.join(here,'runtime.js')],bundle:true,minify:true,format:'iife',platform:'browser',target:'es2020',outfile:path.join(out,'firebase-runtime.js')});
const manifest=JSON.parse(read('manifest.webmanifest'));manifest.description='Workshop management with live Firebase sync.';manifest.theme_color='#1C3455';manifest.background_color='#F0F3F7';fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify(manifest,null,2));
fs.cpSync(path.join(source,'brand-logos'),path.join(out,'brand-logos'),{recursive:true});
const assets=['./','./index.html','./style.css','./theme.css','./theme.js','./app-chrome.js','./catalog.js','./brand-catalog.js','./attendance.js','./brand-logo.png','./favicon-48.png','./account-install.js','./app.js','./firebase-runtime.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-192-blue.png','./icon-512-blue.png'];
assets.push(...Object.values(JSON.parse(read('brand-logos.json'))).filter(Boolean).map(x=>'./'+x));
fs.writeFileSync(path.join(out,'sw.js'),`const CACHE='workshop-desk-firebase-v15',FILES=${JSON.stringify(assets)};self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request)))});`);
const website=path.join(root,'work/website'),download=path.join(out,'download');
fs.mkdirSync(download,{recursive:true});
for(const file of ['index.html','style.css','site.js','logo.png','favicon.png'])fs.copyFileSync(path.join(website,file),path.join(download,file));
console.log('Built Firebase PWA in firebase-public');
