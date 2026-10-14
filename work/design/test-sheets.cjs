const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),path=require('path');
const p={},cache=new Map();let database,writes=0;
const c=vm.createContext({console,Date,Set,JSON,PropertiesService:{getScriptProperties:()=>({getProperty:k=>p[k]||null,setProperty:(k,v)=>p[k]=v,deleteProperty:k=>delete p[k]})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},computeDigest:(_,s)=>[...crypto.createHash('sha256').update(s).digest()],computeHmacSha256Signature:(s,k)=>[...crypto.createHmac('sha256',k).update(s).digest()],base64EncodeWebSafe:a=>Buffer.from(a).toString('base64url'),formatDate:(_,tz,fmt)=>fmt==='yyyy-MM-dd'?'2026-10-13':'10:30'}});
let source=fs.readFileSync(path.join(__dirname,'server.gs'),'utf8');vm.runInContext(source,c);
c.read_=()=>JSON.parse(JSON.stringify(database));c.write_=db=>{database=JSON.parse(JSON.stringify(db));writes++;};
const clone=x=>JSON.parse(JSON.stringify(x)),seed=JSON.parse(fs.readFileSync(path.join(__dirname,'seed.json'),'utf8'));
seed.jobs[0].date=seed.jobs[0].due='2026-10-13';database={revision:1,state:clone(seed)};p.WD_PEPPER='test-secret';
const setPassword=(id,value)=>p['WD_AUTH_'+id]=JSON.stringify(c.credential_(c.digest_(value)));
setPassword('admin','testing-admin-password');setPassword('e1','testing-employee-password');
const admin=c.wdLogin('admin','testing-admin-password'),employee=c.wdLogin('9000000001','testing-employee-password');
assert.equal(employee.state.invoices.length,0);assert.ok(!JSON.stringify(employee).includes('test-secret'));assert.ok(!JSON.stringify(employee).includes('passwordHash'));
assert.throws(()=>c.wdRead('bad-token'),/Session expired/);
assert.throws(()=>c.wdLogin('admin','wrong'),/incorrect/);
let edit=clone(admin.state);edit.inventory[0].stock=2;
let saved=c.wdSave(admin.token,1,edit);assert.equal(saved.revision,2);
assert.throws(()=>c.wdSave(admin.token,1,edit),/Another device/);
let e=c.wdRead(employee.token);edit=clone(e.state);edit.inventory[0].stock=3;assert.throws(()=>c.wdSave(employee.token,e.revision,edit),/Stock may only/);
edit=clone(e.state);edit.jobs[0].services[0].price=500;assert.throws(()=>c.wdSave(employee.token,e.revision,edit),/Service charges/);
edit=clone(e.state);edit.settings.name='hacked';assert.throws(()=>c.wdSave(employee.token,e.revision,edit),/Employer permission/);
edit=clone(e.state);edit.inventory[0].stock=1;edit.jobs[0].issued.push({name:edit.inventory[0].name,qty:1,price:edit.inventory[0].price,part:edit.inventory[0].id});saved=c.wdSave(employee.token,e.revision,edit);assert.equal(saved.state.inventory[0].stock,1);
edit=clone(saved.state);edit.jobs[0].services[0].status='In progress';saved=c.wdSave(employee.token,saved.revision,edit);assert.equal(saved.state.jobs[0].services[0].status,'In progress');
edit=clone(saved.state);edit.attendance.push({id:'ATT-test',employee:'e1',date:'2026-10-13',in:'01:00',out:'',note:'',status:'Pending'});saved=c.wdSave(employee.token,saved.revision,edit);assert.equal(saved.state.attendance[0].in,'10:30');assert.equal(saved.state.attendance[0].status,'Pending');
edit=clone(saved.state);edit.attendance[0].status='Present';assert.throws(()=>c.wdSave(employee.token,saved.revision,edit),/approval/);
let a=c.wdRead(admin.token);edit=clone(a.state);edit.attendance[0].status='Present';saved=c.wdSave(admin.token,a.revision,edit);
e=c.wdRead(employee.token);edit=clone(e.state);edit.attendance[0].out='22:00';saved=c.wdSave(employee.token,e.revision,edit);assert.equal(saved.state.attendance[0].out,'10:30');
a=c.wdRead(admin.token);edit=clone(a.state);edit.employees[0].passwordHash=c.digest_('new-employee-password');saved=c.wdSave(admin.token,a.revision,edit);assert.ok(!JSON.stringify(database).includes('passwordHash'));assert.throws(()=>c.wdRead(employee.token),/password changed/);assert.ok(c.wdLogin('9000000001','new-employee-password').token);
// A second employee's jobs and attendance are never returned, modified, or lost on save.
database.state.employees.push({id:'e2',name:'Other',phone:'9000000002',job:'Technician'});database.state.jobs.push({...clone(seed.jobs[0]),id:'JC-1042',assigned:'e2'});
e=c.wdLogin('9000000001','new-employee-password');assert.equal(e.state.jobs.length,1);edit=clone(e.state);edit.jobs.push({...clone(seed.jobs[0]),id:'JC-1042',assigned:'e1'});assert.throws(()=>c.wdSave(e.token,e.revision,edit),/Invalid new job/);
edit=clone(e.state);edit.requests.push({id:'R-test',name:'Oil filter',qty:2,note:'',employee:'e1',date:'2020-01-01',status:'Requested'});saved=c.wdSave(e.token,e.revision,edit);assert.equal(database.state.jobs.length,2);assert.equal(saved.state.requests[0].date,'2026-10-13');
// A newly added employee can request attendance even if the browser/server
// serialize object fields in a different order.
database.state.employees.push({id:'e3',name:'New technician',job:'Mechanic',email:'',phone:'9000000003'});
setPassword('e3','new-technician-password');
const newcomer=c.wdLogin('9000000003','new-technician-password');
edit=clone(newcomer.state);
edit.employees=edit.employees.map(person=>Object.fromEntries(Object.entries(person).reverse()));
edit.attendance.push({id:'ATT-new',employee:'e3',date:'2026-10-13',in:'10:30',out:'',note:'',status:'Pending'});
saved=c.wdSave(newcomer.token,newcomer.revision,edit);
assert.equal(saved.state.attendance[0].status,'Pending');
assert.equal(database.state.attendance.find(a=>a.employee==='e3').status,'Pending');
// Removing an employee revokes their session and login while retaining jobs
// and attendance so the employer can reassign work and review history.
a=c.wdRead(admin.token);edit=clone(a.state);edit.employees.find(x=>x.id==='e3').active=false;
saved=c.wdSave(admin.token,a.revision,edit);
assert.ok(database.state.employees.find(x=>x.id==='e3'));
assert.ok(database.state.attendance.some(x=>x.employee==='e3'));
assert.throws(()=>c.wdRead(newcomer.token),/account has been removed/);
assert.throws(()=>c.wdLogin('9000000003','new-technician-password'),/incorrect/);
a=c.wdRead(admin.token);edit=clone(a.state);edit.employees.find(x=>x.id==='e3').active=true;
saved=c.wdSave(admin.token,a.revision,edit);
assert.ok(c.wdLogin('9000000003','new-technician-password').token);
// Customer phone checks normalize India's country code, and deletion keeps
// invoiced work and issued stock intact.
a=c.wdRead(admin.token);edit=clone(a.state);edit.customers.push({...clone(seed.customers[0]),id:'c-duplicate',phone:'9000000002'});
assert.throws(()=>c.wdSave(admin.token,a.revision,edit),/duplicate customer phone/);
a=c.wdRead(admin.token);edit=clone(a.state);edit.customers.push({...clone(seed.customers[0]),id:'c-new',phone:'919876543210'});
saved=c.wdSave(admin.token,a.revision,edit);
a=c.wdRead(admin.token);edit=clone(a.state);edit.customers.push({...clone(seed.customers[0]),id:'c-duplicate',phone:'9876543210'});
assert.throws(()=>c.wdSave(admin.token,a.revision,edit),/duplicate customer phone/);
a=c.wdRead(admin.token);edit=clone(a.state);edit.customers=edit.customers.filter(x=>x.id!=='c1');
assert.throws(()=>c.wdSave(admin.token,a.revision,edit),/Invalid job assignment/);
a=c.wdRead(admin.token);edit=clone(a.state);edit.jobs=edit.jobs.filter(x=>x.id!=='JC-1041');
assert.throws(()=>c.wdSave(admin.token,a.revision,edit),/issued stock/);
a=c.wdRead(admin.token);edit=clone(a.state);edit.customers=edit.customers.filter(x=>x.id!=='c-new');
saved=c.wdSave(admin.token,a.revision,edit);assert.ok(!database.state.customers.some(x=>x.id==='c-new'));
// Billing deletion is employer-only, and removing a paid bill updates the
// saved collection while leaving its job card intact.
a=c.wdRead(admin.token);edit=clone(a.state);edit.invoices.push({id:'INV-2026-001',job:'JC-1041',type:'Invoice',date:'2026-10-13',status:'Paid',paidDate:'2026-10-13',lines:[{name:'Service',qty:1,price:100}],discount:0,tax:0});
saved=c.wdSave(admin.token,a.revision,edit);
e=c.wdLogin('9000000001','new-employee-password');edit=clone(e.state);edit.invoices=clone(database.state.invoices);assert.throws(()=>c.wdSave(e.token,e.revision,edit),/Employer permission/);
a=c.wdRead(admin.token);edit=clone(a.state);edit.invoices=[];saved=c.wdSave(admin.token,a.revision,edit);
assert.equal(database.state.invoices.length,0);assert.ok(database.state.jobs.some(x=>x.id==='JC-1041'));
// Parse each shipped browser script, not just the source modules.
const html=fs.readFileSync(path.resolve(__dirname,'../../outputs/Google-Sheets-Setup/Index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,4);for(const s of scripts)new vm.Script(s[1]);
assert.ok(!html.includes('ADMIN_PASSWORD_HASH'));assert.ok(html.includes('google.script.run'));assert.ok(!html.includes('async function login(form){const d='));
// The hosted app must contain only the connected client, and its bridge page
// must have a valid script with a fixed origin and a small RPC allow-list.
const docs=path.resolve(__dirname,'../../docs');
for(const file of ['app.js','account-install.js','attendance.js','catalog.js','sw.js'])new vm.Script(fs.readFileSync(path.join(docs,file),'utf8'),{filename:file});
const hosted=fs.readFileSync(path.join(docs,'app.js'),'utf8');
assert.ok(hosted.includes('workshopdesk:bridge-ready'));
assert.ok(!hosted.includes('google.script.run'));
assert.match(hosted,/renderLocal\(\);\s*restoreRemote\(\);\s*$/);
assert.ok(fs.readFileSync(path.join(docs,'index.html'),'utf8').includes('manifest.webmanifest'));
// HtmlService is supplied by Google in production.
c.HtmlService={XFrameOptionsMode:{ALLOWALL:'ALLOWALL'},createHtmlOutput:source=>({setXFrameOptionsMode:()=>source})};
const output=c.bridgeOutput_('11111111-1111-4111-8111-111111111111');
assert.ok(output.includes('https://kriksanta.github.io'));
assert.ok(output.includes("['wdLogin','wdRead','wdSave','wdLogout']"));
new vm.Script(output.match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('PASS: login, auth isolation, stock accounting, status changes, approval-only attendance, server timestamps, password reset/revocation, revision conflicts, data preservation and shipped script syntax. Saves tested:',writes);
