'use strict';
const wd={token:null,revision:0,baseline:'',saving:false,loading:false};
function rpc(name,...args){return new Promise((resolve,reject)=>{if(!window.google?.script?.run)return reject(new Error('Open the deployed Apps Script web app URL to connect.'));google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[name](...args);});}
function hydrate(data){Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,data.state);wd.revision=data.revision;wd.baseline=JSON.stringify(state);}
function render(){renderLocal();if(session&&wd.token&&!wd.loading&&!wd.saving&&JSON.stringify(state)!==wd.baseline)saveRemote();}
function busy(value){document.getElementById('sync-mask')?.remove();if(value){const div=document.createElement('div');div.id='sync-mask';div.setAttribute('role','status');div.textContent='Saving to Google Sheets…';div.style.cssText='position:fixed;inset:0;z-index:99999;background:#fffffff0;display:grid;place-items:center;font:600 18px system-ui;color:#164e46';document.body.append(div);}}
async function saveRemote(){
 wd.saving=true;busy(true);const payload=JSON.parse(JSON.stringify(state));
 try{const data=await rpc('wdSave',wd.token,wd.revision,payload);hydrate(data);renderLocal();toastLocal('Saved to Google Sheets.');}
 catch(e){
   // A failed response can mean a write completed but its reply was lost. Read before retrying.
   try{hydrate(await rpc('wdRead',wd.token));}catch{Object.assign(state,JSON.parse(wd.baseline));}
   closeModal();renderLocal();openModal('Save could not be confirmed',`<p>${esc(e.message||String(e))}</p><p class="notice-inline">Check the latest data before repeating your change. This page does not save an offline copy.</p>`,btn('Review data','close','','primary'));
 }finally{wd.saving=false;busy(false);}
}
function toast(message){if(wd.saving)return;toastLocal(message);}
async function login(form){
 const d=new FormData(form),err=$('#login-error'),button=form.querySelector('[type=submit]');button.disabled=true;err.textContent='Signing in…';
 try{const data=await rpc('wdLogin',String(d.get('username')).trim(),String(d.get('password')));wd.token=data.token;hydrate(data);session=data.session;role=session.admin?'employer':'employee';page='Dashboard';query='';jobFilter='All jobs';renderLocal();}
 catch(e){err.className='error';err.textContent=e.message||'Sign-in failed.';button.disabled=false;}
}
function logoutRemote(){const token=wd.token;wd.token=null;session=null;role='employer';wd.baseline='';closeModal();for(const k of ['employees','customers','jobs','inventory','requests','attendance','invoices'])state[k]=[];state.admin={name:'Workshop Admin',username:''};state.settings={name:'Workshop Desk',logo:''};renderLocal();rpc('wdLogout',token).catch(()=>{});}
setInterval(async()=>{
 if(!wd.token||wd.saving||wd.loading||document.hidden||document.querySelector('.modal')||JSON.stringify(state)!==wd.baseline)return;
 wd.loading=true;const token=wd.token,snapshot=JSON.stringify(state);try{const data=await rpc('wdRead',token);if(wd.token===token&&JSON.stringify(state)===snapshot&&!document.querySelector('.modal')&&data.revision!==wd.revision){hydrate(data);renderLocal();}}
 catch(e){toastLocal('Could not refresh. '+(e.message||'Check your connection.'));}finally{wd.loading=false;if(wd.token&&!wd.saving&&JSON.stringify(state)!==wd.baseline)saveRemote();}
},30000);
window.addEventListener('beforeunload',e=>{if(wd.saving){e.preventDefault();e.returnValue='';}});
