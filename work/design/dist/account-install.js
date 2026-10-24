'use strict';
let deferredAppInstall=null;
function appIsInstalled(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
function installAppButton(extra=''){return `<button type="button" class="btn small install-entry ${extra}" data-action="install-app" aria-label="${appIsInstalled()?'App installed':'Install app on your device'}">${icon(appIsInstalled()?'check':'download')}<span>${appIsInstalled()?'Installed':'Install app'}</span></button>`}
function refreshInstallButtons(){$$('[data-action=install-app]').forEach(b=>{b.innerHTML=icon(appIsInstalled()?'check':'download')+`<span>${appIsInstalled()?'Installed':'Install app'}</span>`;b.setAttribute('aria-label',appIsInstalled()?'App installed':'Install app on your device')})}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredAppInstall=event;refreshInstallButtons()});
window.addEventListener('appinstalled',()=>{deferredAppInstall=null;refreshInstallButtons();closeModal();toast('Workshop Desk was installed on your device.')});
async function installApp(){
 if(appIsInstalled())return toast('Workshop Desk is already open as an installed app.');
 if(deferredAppInstall){const prompt=deferredAppInstall;deferredAppInstall=null;try{await prompt.prompt();const result=await prompt.userChoice;if(result.outcome!=='accepted')toast('Installation cancelled. You can try again from your browser menu.');}catch{showInstallHelp()}return;}
 showInstallHelp();
}
function showInstallHelp(){
 const localFile=location.protocol==='file:',insecure=!window.isSecureContext;
 openModal('Workshop Desk, on your home screen',`<div class="install-intro"><span class="brandmark"><img src="brand-logo.png" alt="" aria-hidden="true"></span><div><h3>Workshop Desk</h3><p>For your phone, tablet and computer.</p></div></div>${localFile||insecure?'<div class="info install-limitation"><strong>This local file cannot be installed as an app.</strong><br>Open the HTTPS-hosted Workshop Desk website in your device’s browser to install it. The downloadable package includes the files needed for hosting.</div>':'<div class="info">If your browser offers installation, use its Install app or Add to Home Screen command. This browser has not provided an automatic install prompt.</div>'}<div class="install-step"><span>01</span><div><strong>iPhone or iPad</strong><p>Open the hosted site in Safari, tap Share, then choose Add to Home Screen and confirm Add.</p></div></div><div class="install-step"><span>02</span><div><strong>Android phone or tablet</strong><p>Open the hosted site in Chrome. Use the browser menu → Install app or Add to Home screen.</p></div></div><div class="install-step"><span>03</span><div><strong>Computer</strong><p>Open the hosted site in Chrome or Edge and use the install icon or app option in the browser menu.</p></div></div><p class="notice-inline">This is a web app, not an APK or App Store download. Installing does not enable data storage: records and account edits still reset when the page reloads.</p><p class="notice-inline"><a href="https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing" target="_blank" rel="noopener">Browser installation guide</a></p>`,btn('Got it','close','','primary'));
}
function settingsPage(){return workshopSettingsPage()+`<section class="panel admin-profile-panel"><div class="panel-head"><div><h2>Admin profile & login</h2><p>Choose the name people see and the username you use to sign in.</p></div><span class="tag">Admin only</span></div><div class="panel-body"><form id="admin-profile-form" method="post"><div id="admin-profile-error" role="alert"></div><div class="form-grid">${field('Admin display name','adminName',state.admin.name,'text',true,false,'maxlength="60" autocomplete="name"')}${field('Admin login username','adminUsername',state.admin.username,'text',true,false,'minlength="3" maxlength="32" pattern="[A-Za-z][A-Za-z0-9._-]{2,31}" autocomplete="username"')}</div><p class="notice-inline">Start with a letter. Use 3–32 letters, numbers, dots, underscores or hyphens. Your current password stays the same. This preview remembers changes only until refresh.</p><div class="actions" style="margin-top:20px">${btn('Clear','clear-form','close','','data-form="admin-profile-form"')}<button type="submit" class="btn primary">${icon('check')}Save admin profile</button></div></form></div></section>`}
function saveAdminProfile(){
 if(!session?.admin||role!=='employer')return;
 const form=$('#admin-profile-form');if(!form.reportValidity())return;
 const d=new FormData(form),name=String(d.get('adminName')).trim(),username=String(d.get('adminUsername')).trim();
 const fail=message=>{const el=$('#admin-profile-error');el.className='error';el.textContent=message};
 if(!name)return fail('Enter an admin display name.');
 if(!/^[A-Za-z][A-Za-z0-9._-]{2,31}$/.test(username))return fail('Username must start with a letter and use 3–32 allowed characters.');
 state.admin.name=name;state.admin.username=username;render();toast('Admin profile updated. Use your new username at the next sign-in.');
}
document.addEventListener('click',event=>{if(event.target.closest('[data-action="install-app"]'))installApp()});
