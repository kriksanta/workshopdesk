// Workshop Desk. Private helpers end in _ and cannot be called by google.script.run.
const SHEET_ID_ = 'REPLACE_WITH_YOUR_SPREADSHEET_ID';
const STORE_ = 'WorkshopDesk_Data';
function initializeWorkshop() {
  const active = Session.getActiveUser().getEmail();
  const owner = Session.getEffectiveUser().getEmail();
  if (!active || active !== owner) {
    throw new Error('Run setup from the Apps Script editor using the owner account.');
  }
  return setupWorkshop_();
}
function doGet(e) {
  const nonce=e&&e.parameter&&e.parameter.bridge;
  if(nonce){
    need_(/^[a-f0-9-]{36}$/.test(nonce),'Invalid bridge request.');
    return bridgeOutput_(nonce);
  }
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Workshop Desk').addMetaTag('viewport','width=device-width, initial-scale=1');
}
function bridgeOutput_(nonce) {
  const code=`<!doctype html><html><meta charset="utf-8"><script>
  (()=>{
    const origin='https://kriksanta.github.io', nonce=${JSON.stringify(nonce)};
    const allowed=new Set(['wdLogin','wdRead','wdSave','wdLogout']);
    const channel=new MessageChannel();
    channel.port1.onmessage=event=>{
      const call=event.data||{},id=call.id,name=call.name,args=call.args;
      if(!Number.isSafeInteger(id)||!allowed.has(name)||!Array.isArray(args)){
        channel.port1.postMessage({id,ok:false,error:'Invalid workshop request.'});return;
      }
      google.script.run.withSuccessHandler(result=>channel.port1.postMessage({id,ok:true,result}))
        .withFailureHandler(error=>channel.port1.postMessage({id,ok:false,error:error&&error.message||'Google Sheets request failed.'}))[name](...args);
    };
    window.top.postMessage({type:'workshopdesk:bridge-ready',nonce},origin,[channel.port2]);
  })();
  <\/script></html>`;
  return HtmlService.createHtmlOutput(code).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function props_() { return PropertiesService.getScriptProperties(); }
function copy_(x) { return JSON.parse(JSON.stringify(x)); }
function canonical_(value) {
  if(Array.isArray(value))return value.map(canonical_);
  if(value&&typeof value==='object')return Object.keys(value).sort().reduce((out,key)=>{out[key]=canonical_(value[key]);return out;},{});
  return value;
}
function equal_(a,b) { return JSON.stringify(canonical_(a)) === JSON.stringify(canonical_(b)); }
function need_(ok,message) { if (!ok) throw new Error(message || 'This change is not permitted.'); }
function locked_(fn) { const l=LockService.getScriptLock(); l.waitLock(30000); try {return fn();} finally {l.releaseLock();} }
function digest_(text) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join(''); }
function keyed_(text) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text,props_().getProperty('WD_PEPPER'))); }
function now_() { return Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd'); }
function time_() { return Utilities.formatDate(new Date(),'Asia/Kolkata','HH:mm'); }
function credential_(hash) { need_(/^[a-f0-9]{64}$/.test(hash),'Invalid password.'); const salt=Utilities.getUuid(); return {salt,hash:keyed_(salt+':'+hash)}; }
function setupWorkshop_() {
  // Run once from the editor; never reset an existing store.
  return locked_(()=>{
    const p=props_(),ss=SpreadsheetApp.openById(SHEET_ID_);
    need_(!ss.getSheetByName(STORE_),'Already initialized. Existing data has been preserved.');
    const password=p.getProperty('ADMIN_INITIAL_PASSWORD');
    need_(password && password.length>=8,'Add ADMIN_INITIAL_PASSWORD in Project Settings > Script properties first.');
    if(!p.getProperty('WD_PEPPER'))p.setProperty('WD_PEPPER',Utilities.getUuid()+Utilities.getUuid());
    p.setProperty('WD_AUTH_admin',JSON.stringify(credential_(digest_(password))));
    const s=seed_(); s.jobs.forEach(j=>{j.date=now_();j.due=now_();});
    const sh=ss.insertSheet(STORE_); sh.getRange(1,1,1,5).setValues([['Collection','Record ID','Chunk','Revision','Data — managed by Workshop Desk']]);
    sh.setFrozenRows(1); sh.getRange(1,1,1,5).setBackground('#164e46').setFontColor('#ffffff').setFontWeight('bold');
    sh.setColumnWidths(1,4,140); sh.setColumnWidth(5,650);
    write_({revision:1,state:s}); p.deleteProperty('ADMIN_INITIAL_PASSWORD');
    return 'Initialized. Deploy the web app next.';
  });
}
function sheet_() {const s=SpreadsheetApp.openById(SHEET_ID_).getSheetByName(STORE_);need_(s,'Run setupWorkshop_ in the script editor first.');return s;}
function read_() {
  const sh=sheet_(),rows=sh.getRange(2,1,Math.max(1,sh.getLastRow()-1),5).getValues().filter(r=>r[0]);
  need_(rows.length,'Workshop data is empty.'); const revision=Number(rows[0][3]);
  const groups={},state={};
  rows.forEach(r=>{need_(Number(r[3])===revision,'Storage revision mismatch.'); const key=r[0]+'|'+r[1]; if(!groups[key])groups[key]={collection:r[0],parts:[]};groups[key].parts[Number(r[2])]=r[4];});
  Object.keys(groups).forEach(k=>{const g=groups[k],v=JSON.parse(g.parts.join(''));if(['admin','settings'].includes(g.collection))state[g.collection]=v;else (state[g.collection]||(state[g.collection]=[])).push(v);});
  ['employees','customers','jobs','inventory','requests','attendance','invoices'].forEach(k=>{if(!state[k])state[k]=[];});
  return {revision,state};
}
function write_(db) {
  const sh=sheet_(),rows=[];
  Object.keys(db.state).forEach(k=>{const items=Array.isArray(db.state[k])?db.state[k]:[db.state[k]];items.forEach(v=>{const text=JSON.stringify(v);for(let i=0;i<text.length;i+=28000)rows.push([k,v.id||k,i/28000,db.revision,"'"+text.slice(i,i+28000)]);});});
  const n=Math.max(rows.length,sh.getLastRow()-1);while(rows.length<n)rows.push(['','','','','']);
  if(sh.getMaxRows()<n+1)sh.insertRowsAfter(sh.getMaxRows(),n+1-sh.getMaxRows());
  // One rectangular write commits all records and revision together.
  sh.getRange(2,1,n,5).setValues(rows); SpreadsheetApp.flush();
}
function public_(db,user) {
  const s=copy_(db.state);s.employees.forEach(e=>{delete e.passwordHash;});
  if(!user.admin){s.jobs=s.jobs.filter(j=>j.assigned===user.employee);s.attendance=s.attendance.filter(a=>a.employee===user.employee);s.requests=s.requests.filter(r=>r.employee===user.employee);s.employees=s.employees.filter(e=>e.id===user.employee);s.invoices=[];s.admin={name:'Workshop Admin',username:''};}
  return {revision:db.revision,state:s,session:{admin:!!user.admin,employee:user.employee||null}};
}
function auth_(token) {
  need_(typeof token==='string'&&token.length<200,'Sign in again.');
  const raw=CacheService.getScriptCache().get('session:'+digest_(token));need_(raw,'Session expired. Sign in again.');
  const u=JSON.parse(raw),cred=props_().getProperty('WD_AUTH_'+(u.admin?'admin':u.employee));
  need_(cred&&digest_(cred)===u.signature,'Your password changed. Sign in again.');return u;
}
function wdLogin(username,password) {
  return locked_(()=>{
    need_(typeof username==='string'&&username.length<=40&&typeof password==='string'&&password.length<=128,'Username or password is incorrect.');
    username=username.trim().toLowerCase();const c=CacheService.getScriptCache(),key='attempt:'+digest_(username),n=Number(c.get(key)||0),globalKey='logins:'+Math.floor(Date.now()/60000),g=Number(c.get(globalKey)||0);
    need_(n<6&&g<80,'Too many sign-in attempts. Please wait 15 minutes.');c.put(globalKey,String(g+1),60);c.put(key,String(n+1),900);
    const db=read_(),admin=username===db.state.admin.username.toLowerCase(),e=db.state.employees.find(e=>e.phone===username);
    const id=admin?'admin':e?.id,raw=id&&props_().getProperty('WD_AUTH_'+id),cred=raw&&JSON.parse(raw);
    need_(cred&&keyed_(cred.salt+':'+digest_(password))===cred.hash,'Username or password is incorrect.');
    c.remove(key);const token=Utilities.getUuid()+Utilities.getUuid(),u={admin,employee:admin?null:e.id,signature:digest_(raw)};
    c.put('session:'+digest_(token),JSON.stringify(u),21600);return Object.assign(public_(db,u),{token});
  });
}
function wdLogout(token) { if(typeof token==='string')CacheService.getScriptCache().remove('session:'+digest_(token));return true; }
function wdRead(token) {return locked_(()=>{const u=auth_(token);return public_(read_(),u);});}
function wdSave(token,revision,incoming) {
  return locked_(()=>{
    const u=auth_(token),db=read_();need_(db.revision===revision,'Another device saved changes. Reload the latest data and try your change again.');
    need_(JSON.stringify(incoming).length<3000000,'Workshop data exceeds this version’s size limit.');
    const next=u.admin?copy_(incoming):employeeMerge_(db.state,incoming,u);
    validate_(next);const updates=[];
    next.employees.forEach(e=>{if(e.passwordHash){need_(u.admin,'Only admin can set passwords.');updates.push([e.id,credential_(e.passwordHash)]);}delete e.passwordHash;});
    // Store data first. No password material is ever written to the spreadsheet.
    write_({revision:db.revision+1,state:next});
    updates.forEach(([id,v])=>props_().setProperty('WD_AUTH_'+id,JSON.stringify(v)));
    db.state.employees.filter(e=>!next.employees.some(x=>x.id===e.id)).forEach(e=>props_().deleteProperty('WD_AUTH_'+e.id));
    return public_({revision:db.revision+1,state:next},u);
  });
}
function list_(s,k) {need_(Array.isArray(s[k])&&s[k].length<=15000,'Invalid '+k); const ids=new Set();s[k].forEach(x=>{need_(x&&/^[A-Za-z0-9_-]{1,80}$/.test(x.id)&&!ids.has(x.id),'Invalid or duplicate record ID.');ids.add(x.id);});}
function validate_(s) {
  need_(equal_(Object.keys(s).sort(),['admin','settings','employees','customers','jobs','inventory','requests','attendance','invoices'].sort()),'Invalid workshop data.');
  ['employees','customers','jobs','inventory','requests','attendance','invoices'].forEach(k=>list_(s,k));
  need_(/^[A-Za-z][A-Za-z0-9._-]{2,31}$/.test(s.admin.username)&&s.admin.name,'Invalid admin profile.');
  need_(typeof s.settings.name==='string'&&typeof s.settings.logo==='string'&&(!s.settings.logo||/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s.settings.logo)),'Invalid shop profile or logo.');
  const amount=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9;
  const date=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d));
  const phones=new Set();s.employees.forEach(e=>{need_(e.name&&/^\d{10,15}$/.test(e.phone)&&!phones.has(e.phone),'Invalid or duplicate employee phone.');phones.add(e.phone);});
  s.customers.forEach(c=>need_(c.name&&/^\d{10,15}$/.test(c.phone),'Invalid customer.'));
  s.inventory.forEach(p=>need_(p.name&&amount(p.stock)&&amount(p.price)&&amount(p.min),'Invalid inventory amount.'));
  s.jobs.forEach(j=>{need_(s.customers.some(c=>c.id===j.customer)&&s.employees.some(e=>e.id===j.assigned)&&date(j.date)&&date(j.due),'Invalid job assignment or date.');need_(Array.isArray(j.services)&&j.services.length>0&&Array.isArray(j.issued),'Invalid job tasks.');j.services.forEach(t=>need_(t.name&&amount(t.price)&&['Pending','In progress','Finished'].includes(t.status),'Invalid service.'));j.issued.forEach(p=>need_(p.name&&amount(p.qty)&&p.qty>0&&amount(p.price),'Invalid issued part.'));});
  const days=new Set();s.attendance.forEach(a=>{const key=a.employee+':'+a.date;need_(s.employees.some(e=>e.id===a.employee)&&date(a.date)&&!days.has(key)&&['Pending','Present','Rejected','Leave','LOP','Holiday'].includes(a.status),'Invalid attendance.');days.add(key);need_(!/[<>"']/.test((a.in||'')+(a.out||'')),'Invalid time.');});
  s.requests.forEach(r=>need_(r.name&&amount(r.qty)&&r.qty>0&&['Requested','Resolved'].includes(r.status),'Invalid stock request.'));
  s.invoices.forEach(i=>{need_(s.jobs.some(j=>j.id===i.job)&&['Invoice','Estimate'].includes(i.type)&&date(i.date)&&['Unpaid','Paid','Estimate'].includes(i.status)&&amount(i.discount)&&amount(i.tax)&&i.tax<=100&&Array.isArray(i.lines),'Invalid invoice.');i.lines.forEach(l=>need_(l.name&&amount(l.qty)&&l.qty>0&&amount(l.price),'Invalid invoice line.'));need_(i.discount<=i.lines.reduce((v,l)=>v+l.qty*l.price,0),'Discount exceeds total.');});
}
function employeeMerge_(old,inc,u) {
  const view=public_({state:old,revision:0},u).state,result=copy_(old),id=u.employee;
  need_(equal_(Object.keys(view).sort(),Object.keys(inc).sort()),'Invalid data.');
  ['admin','settings','employees','invoices'].forEach(k=>need_(equal_(view[k],inc[k]),'Employer permission required to change '+k+'.'));
  // Customer contact details may be managed by staff; removal is not supported.
  list_(inc,'customers');need_(view.customers.every(c=>inc.customers.some(x=>x.id===c.id)),'Customers cannot be deleted.');result.customers=copy_(inc.customers);
  list_(inc,'jobs');need_(view.jobs.every(j=>inc.jobs.some(x=>x.id===j.id)),'Jobs cannot be removed.');
  const used={};
  inc.jobs.forEach(j=>{
    const prior=view.jobs.find(x=>x.id===j.id);need_(j.assigned===id,'Only your assigned jobs can be changed.');
    if(!prior){need_(!old.jobs.some(x=>x.id===j.id)&&j.date===now_()&&j.issued.length===0&&j.services.every(t=>t.status==='Pending'),'Invalid new job.');result.jobs.push(copy_(j));return;}
    const a=copy_(j),b=copy_(prior);delete a.services;delete a.issued;delete b.services;delete b.issued;need_(equal_(a,b),'Only task status and issued stock can be changed.');
    need_(j.services.length===prior.services.length,'Task list cannot be changed.');j.services.forEach((s,i)=>{const x=copy_(s),y=copy_(prior.services[i]);delete x.status;delete y.status;need_(equal_(x,y),'Service charges cannot be changed.');});
    need_(j.issued.length>=prior.issued.length&&equal_(j.issued.slice(0,prior.issued.length),prior.issued),'Issued parts cannot be removed.');
    j.issued.slice(prior.issued.length).forEach(p=>{const stock=old.inventory.find(x=>x.id===p.part);need_(stock&&p.name===stock.name&&p.price===stock.price&&Number.isFinite(p.qty)&&p.qty>0,'Invalid stock issue.');used[p.part]=(used[p.part]||0)+p.qty;});
    result.jobs[result.jobs.findIndex(x=>x.id===j.id)]=copy_(j);
  });
  list_(inc,'inventory');need_(inc.inventory.length===old.inventory.length,'Employer permission required.');
  inc.inventory.forEach(p=>{const previous=old.inventory.find(x=>x.id===p.id);need_(previous,'Unknown part.');const expected=copy_(previous);expected.stock=Math.round((expected.stock-(used[p.id]||0))*100)/100;need_(expected.stock>=0&&equal_(p,expected),'Stock may only be issued to an assigned job.');});result.inventory=copy_(inc.inventory);
  list_(inc,'requests');view.requests.forEach(r=>need_(inc.requests.some(x=>equal_(x,r)),'Existing requests cannot be edited.'));
  inc.requests.filter(r=>!view.requests.some(x=>x.id===r.id)).forEach(r=>{need_(!old.requests.some(x=>x.id===r.id)&&r.employee===id&&r.status==='Requested','Invalid stock request.');r.date=now_();result.requests.push(copy_(r));});
  list_(inc,'attendance');
  const previous=view.attendance.filter(a=>a.date!==now_()),past=inc.attendance.filter(a=>a.date!==now_());need_(equal_(previous,past),'Past attendance cannot be changed.');
  need_(inc.attendance.every(a=>a.employee===id),'Only your attendance can be changed.');
  const before=view.attendance.find(a=>a.date===now_()),after=inc.attendance.find(a=>a.date===now_());need_(inc.attendance.filter(a=>a.date===now_()).length<=1,'Duplicate attendance.');
  if(!equal_(before,after)){
    need_(after,'Attendance cannot be removed.');let record;
    if(!before||before.status==='Rejected'){need_(after.status==='Pending'&&!after.out,'Employer approval is required.');record={id:before?.id||('ATT-'+Utilities.getUuid()),employee:id,date:now_(),in:time_(),out:'',note:'',status:'Pending',requestedAt:new Date().toISOString()};}
    else {const x=copy_(before),y=copy_(after);delete x.out;delete y.out;need_(before.status==='Present'&&!before.out&&after.out&&equal_(x,y),'Employer approval is required.');record=copy_(before);record.out=time_();}
    result.attendance=result.attendance.filter(a=>!(a.employee===id&&a.date===now_()));result.attendance.push(record);
  }
  return result;
}
