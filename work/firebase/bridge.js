'use strict';
const wd={baseline:'',saving:false,loading:true,pending:null,authOff:null,ownersOff:null,authVersion:0};
const PAGE_KEY='workshopdesk.firebase.page.v1';
function rememberPage(){
 if(!session||wd.loading)return;
 const saved={page,role,jobFilter};
 try{localStorage.setItem(PAGE_KEY,JSON.stringify(saved));}catch{}
 try{sessionStorage.setItem(PAGE_KEY,JSON.stringify(saved));}catch{}
 try{const route=new URLSearchParams({page,view:role});history.replaceState(null,'',location.pathname+location.search+'#'+route.toString());}catch{}
}
function restorePage(){
 let saved={};
 try{saved=JSON.parse(localStorage.getItem(PAGE_KEY)||'{}');}catch{}
 try{const own=JSON.parse(sessionStorage.getItem(PAGE_KEY)||'null');if(own)saved=own;}catch{}
 try{const route=new URLSearchParams(location.hash.slice(1));if(route.has('page'))saved={...saved,page:route.get('page'),role:route.get('view')};}catch{}
 if(navItems.some(([name])=>name===saved.page))page=saved.page;
 if(session?.admin)role=saved.role==='employee'?'employee':'employer';
 jobFilter=saved.jobFilter||'All jobs';
}
function hydrate(data){for(const k of Object.keys(state))delete state[k];Object.assign(state,data);wd.baseline=JSON.stringify(state);today=day();}
function render(){if(wd.loading){renderAuthLoading();return}renderLocal();rememberPage();if(session&&!wd.loading&&!wd.saving&&wd.baseline&&JSON.stringify(state)!==wd.baseline)saveRemote();}
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
 try{await WDF.loginEmail(String(d.get('username')).trim().toLowerCase(),String(d.get('password')))}
 catch(e){err.className='error';err.textContent=WDF.authError(e);button.disabled=false}
}
async function googleLogin(){
 const btnEl=document.querySelector('[data-action="google-login"]');if(btnEl)btnEl.disabled=true;
 try{await WDF.loginOwner()}catch(e){const err=$('#login-error');if(err){err.className='error';err.textContent=WDF.authError(e)}if(btnEl)btnEl.disabled=false}
}
function renderAuthLoading(message=''){
 $('#app').innerHTML=`<main class="workshop-loading" role="status" aria-live="polite"><div class="workshop-loading-card"><div class="workshop-loading-brand"><span class="workshop-loading-logo"><img src="brand-logo.png" alt="" aria-hidden="true"></span><span>workshop<span class="workshop-loading-brand-accent">desk.</span></span></div><h1>${message?'Could not open your workshop':'Opening your workshop'}</h1><p>${esc(message||'Restoring your session and workshop records…')}</p>${message?'<div class="actions" style="justify-content:center;margin-top:22px">'+btn('Try again','retry-session','','primary')+btn('Sign out','logout','','light')+'</div>':''}</div></main>`;
}
async function firebaseBoot(){
 wd.authVersion++;wd.authOff?.();wd.ownersOff?.();wd.ownersOff=null;WDF.stop();wd.loading=true;wd.pending=null;renderAuthLoading();
 wd.authOff=WDF.watchAuth(async(user,error)=>{
  const version=++wd.authVersion;
  wd.ownersOff?.();wd.ownersOff=null;WDF.stop();wd.pending=null;
  if(error){session=null;wd.loading=true;wd.baseline='';renderAuthLoading(WDF.authError(error));return}
  if(!user){session=null;role='employer';wd.baseline='';wd.loading=false;renderLocal();return}
  session=user;role=user.admin?'employer':'employee';wd.loading=true;wd.baseline='';
  if(user.platformAdmin){
   wd.loading=false;renderPlatformAdmin();
   wd.ownersOff=WDF.watchOwners((owners,err)=>{if(version!==wd.authVersion)return;if(err){toastLocal(WDF.authError(err));return}platform.owners=owners;renderPlatformAdmin()});
   return;
  }
  restorePage();renderAuthLoading();
  try{
   if(user.admin)await WDF.seed(WD_SEED);
   if(version!==wd.authVersion)return;
   WDF.watchData((data,err)=>{
    if(version!==wd.authVersion)return;
    if(err){wd.loading=true;renderAuthLoading('Could not sync: '+WDF.authError(err));return}
    if(wd.loading){hydrate(data);wd.loading=false;renderLocal();rememberPage()}
    else applyLatest(data);
   });
  }catch(e){if(version!==wd.authVersion)return;wd.loading=true;renderAuthLoading(WDF.authError(e))}
 });
}
async function logoutRemote(){
 wd.authVersion++;wd.ownersOff?.();wd.ownersOff=null;wd.loading=true;wd.baseline='';wd.pending=null;session=null;role='employer';closeModal();WDF.stop();for(const k of ['employees','customers','jobs','inventory','requests','attendance','invoices'])state[k]=[];renderLocal();
 try{await WDF.logout()}catch(e){toastLocal(WDF.authError(e))}
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-action="retry-session"]'))firebaseBoot();
 if(e.target.closest('[data-action="google-login"]'))googleLogin();
 if(e.target.closest('[data-action="login-reset"]')){const email=String(document.querySelector('#login-user')?.value||'').trim();if(!email)return toastLocal('Enter admin or your email first.');WDF.resetPassword(email).then(()=>toastLocal('Password reset email sent if the account exists.')).catch(x=>toastLocal(WDF.authError(x)))}
 if(e.target.closest('[data-action="reset-owner-password"]'))WDF.resetPassword(WDF.owner).then(()=>toastLocal('Password reset email sent.')).catch(x=>toastLocal(WDF.authError(x)));
 if(e.target.closest('[data-action="reset-password"]')){const email=prompt('Employee email address for password reset:');if(email)WDF.resetPassword(email.trim()).then(()=>toastLocal('Password reset email sent.')).catch(e=>toastLocal(WDF.authError(e)))}
 if(e.target.closest('[data-action="close"]')&&wd.pending)setTimeout(()=>{const x=wd.pending;wd.pending=null;applyLatest(x)},0);
});
window.addEventListener('beforeunload',e=>{rememberPage();if(wd.saving){e.preventDefault();e.returnValue=''}});
document.addEventListener('click',event=>{
 if(!event.target.closest('[data-action="import-sheet"]'))return;
 const input=document.createElement('input');input.type='file';input.accept='application/json,.json';input.style.display='none';document.body.append(input);
 input.addEventListener('change',async()=>{
  try{if(!input.files?.[0])return;busy(true);const data=JSON.parse(await input.files[0].text());throw new Error('Legacy import is disabled for new workshops.');}
  catch(e){openModal('Import failed',`<p>${esc(WDF.authError(e))}</p>`,btn('Review','close','','primary'))}
  finally{busy(false);input.remove()}
 },{once:true});
 input.click();
});


document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-action="reset-employee-password"]');
 if(!button||button.disabled||!session?.admin||role!=='employer')return;
 button.disabled=true;
 try{const email=await WDF.resetEmployeePassword(button.dataset.id);toastLocal('Password reset email sent to '+email+'. The employee can choose a new password and sign in with their email.');}
 catch(error){toastLocal(WDF.authError(error));}
 finally{button.disabled=false;}
});
