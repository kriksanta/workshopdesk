'use strict';
const wd={baseline:'',saving:false,loading:true,pending:null};
const PAGE_KEY='workshopdesk.firebase.page.v1';
function rememberPage(){try{localStorage.setItem(PAGE_KEY,JSON.stringify({page,role,jobFilter}))}catch{}}
function restorePage(){try{const s=JSON.parse(localStorage.getItem(PAGE_KEY)||'{}');if(navItems.some(([n])=>n===s.page))page=s.page;if(s.role==='employee'&&session?.admin)role='employee';jobFilter=s.jobFilter||'All jobs'}catch{}}
function hydrate(data){for(const k of Object.keys(state))delete state[k];Object.assign(state,data);wd.baseline=JSON.stringify(state);today=day();}
function render(){renderLocal();rememberPage();if(session&&!wd.loading&&!wd.saving&&wd.baseline&&JSON.stringify(state)!==wd.baseline)saveRemote();}
function busy(value){document.getElementById('sync-mask')?.remove();if(value){const el=document.createElement('div');el.id='sync-mask';el.setAttribute('role','status');el.textContent='Saving workshop changes…';el.style.cssText='position:fixed;inset:0;z-index:99999;background:#fffffff0;display:grid;place-items:center;font:600 18px system-ui;color:#164e46';document.body.append(el)}}
function applyLatest(data){if(!data)return;if(document.querySelector('#modal-form')||wd.saving){wd.pending=data;return}const old=wd.baseline;if(JSON.stringify(state)!==old){wd.pending=data;return}hydrate(data);renderLocal();rememberPage();}
async function saveRemote(){
 if(wd.saving)return;wd.saving=true;busy(true);
 const before=JSON.parse(wd.baseline),after=JSON.parse(JSON.stringify(state));
 try{await WDF.save(before,after);wd.baseline=JSON.stringify(after);toastLocal('Saved.');}
 catch(e){hydrate(before);closeModal();renderLocal();openModal('Save could not be confirmed',`<p>${esc(WDF.authError(e))}</p><p class="notice-inline">Review the latest data before repeating your change.</p>`,btn('Review data','close','','primary'));}
 finally{wd.saving=false;busy(false);if(wd.pending){const next=wd.pending;wd.pending=null;applyLatest(next)}}
}
function toast(message){if(wd.saving)return;toastLocal(message)}
async function login(form){
 const d=new FormData(form),err=$('#login-error'),button=form.querySelector('[type=submit]');button.disabled=true;err.textContent='Signing in…';
 try{await WDF.loginEmail(String(d.get('username')).trim().toLowerCase(),String(d.get('password')));err.textContent='Opening your workshop…'}
 catch(e){err.className='error';err.textContent=WDF.authError(e);button.disabled=false}
}
async function googleLogin(){
 const btnEl=document.querySelector('[data-action="google-login"]');if(btnEl)btnEl.disabled=true;
 try{await WDF.loginOwner()}catch(e){const err=$('#login-error');if(err){err.className='error';err.textContent=WDF.authError(e)}if(btnEl)btnEl.disabled=false}
}
async function firebaseBoot(){
 WDF.watchAuth(async(user,error)=>{
  if(error){session=null;wd.loading=false;renderLocal();const el=$('#login-error');if(el){el.className='error';el.textContent=WDF.authError(error)}return}
  if(!user){session=null;role='employer';wd.baseline='';wd.loading=false;renderLocal();return}
  session=user;role=user.admin?'employer':'employee';restorePage();
  $('#app').innerHTML=`<main class="workshop-loading" role="status" aria-live="polite"><div class="workshop-loading-card"><div class="workshop-loading-brand"><span class="workshop-loading-logo">${icon('wrench')}</span><span>workshop<span class="workshop-loading-brand-accent">desk.</span></span></div><h1>Opening your workshop</h1><p>Getting your team and jobs ready…</p></div></main>`;
  try{if(user.admin)await WDF.seed(WD_SEED);WDF.watchData((data,err)=>{
    if(err){const message='Could not sync: '+WDF.authError(err);const p=document.querySelector('.workshop-loading p');if(p)p.textContent=message;else toastLocal(message);return}
    if(wd.loading){hydrate(data);wd.loading=false;renderLocal();rememberPage()}
    else applyLatest(data);
  })}
  catch(e){session=null;wd.loading=false;renderLocal();const el=$('#login-error');if(el){el.className='error';el.textContent=WDF.authError(e)}}
 });
}
async function logoutRemote(){
 wd.loading=true;wd.baseline='';wd.pending=null;session=null;role='employer';closeModal();WDF.stop();for(const k of ['employees','customers','jobs','inventory','requests','attendance','invoices'])state[k]=[];renderLocal();
 try{await WDF.logout()}catch(e){toastLocal(WDF.authError(e))}
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-action="google-login"]'))googleLogin();
 if(e.target.closest('[data-action="reset-password"]')){const email=prompt('Employee email address for password reset:');if(email)WDF.resetPassword(email.trim()).then(()=>toastLocal('Password reset email sent.')).catch(e=>toastLocal(WDF.authError(e)))}
 if(e.target.closest('[data-action="close"]')&&wd.pending)setTimeout(()=>{const x=wd.pending;wd.pending=null;applyLatest(x)},0);
});
window.addEventListener('beforeunload',e=>{rememberPage();if(wd.saving){e.preventDefault();e.returnValue=''}});
document.addEventListener('click',event=>{
 if(!event.target.closest('[data-action="import-sheet"]'))return;
 const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.style.display='none';document.body.append(input);
 input.addEventListener('change',async()=>{
  try{if(!input.files?.[0])return;busy(true);const data=JSON.parse(await input.files[0].text());const count=await WDF.importLegacy(data);toastLocal('Imported '+count+' workshop records. Employees need email login setup.');}
  catch(e){openModal('Import failed',`<p>${esc(WDF.authError(e))}</p>`,btn('Review','close','','primary'))}
  finally{busy(false);input.remove()}
 },{once:true});
 input.click();
});
