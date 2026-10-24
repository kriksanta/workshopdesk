const platform={owners:[],inviting:false};
function renderPlatformAdmin(){
 $('#app').innerHTML=`<main class="main" style="min-height:100vh"><header class="topbar"><div class="brand"><span class="brandmark">${icon('wrench')}</span>workshop<span style="color:#799762;margin-left:-7px">desk.</span></div><div class="top-actions"><span class="tag">Platform admin</span><button type="button" class="btn light" data-action="platform-logout">Sign out</button></div></header><div class="content" style="max-width:1100px;margin:auto"><div class="demo-strip"><span>${icon('shield')}Workshop access</span><span>Each owner has a separate workspace</span></div><h1>Workshop owners</h1><p class="muted">Invite an owner to a fresh workshop. Owners can invite employees only to their own workshop.</p><section class="panel" style="margin-top:24px"><div class="panel-head"><div><h2>Invite owner</h2><p>The owner receives a password setup email.</p></div></div><div class="panel-body"><form id="owner-invite-form"><div class="form-grid">${field('Owner name','ownerName','','text',true)}${field('Owner email','ownerEmail','','email',true)}</div><div id="owner-invite-error" role="alert"></div><div class="actions" style="margin-top:20px"><button type="reset" class="btn light">Clear</button><button type="submit" class="btn primary" ${platform.inviting?'disabled':''}>Send invite</button></div></form></div></section><section class="panel" style="margin-top:24px"><div class="panel-head"><div><h2>Invited owners</h2><p>${platform.owners.length} workshop${platform.owners.length===1?'':'s'}</p></div></div><div class="panel-body">${platform.owners.length?'<div class="table-wrap"><table><thead><tr><th>Owner</th><th>Email</th><th>Workshop</th><th>Status</th></tr></thead><tbody>'+platform.owners.map(x=>`<tr><td>${esc(x.name||'Owner')}</td><td>${esc(x.email||'')}</td><td>${esc(x.workshopId)}</td><td>${x.active?'Active':'Inactive'}</td></tr>`).join('')+'</tbody></table></div>':'<p>No owners invited yet.</p>'}</div></section></div></main>`;
}
document.addEventListener('click',e=>{if(e.target.closest('[data-action="platform-logout"]'))logoutRemote()});
document.addEventListener('submit',async e=>{
 if(e.target.id!=='owner-invite-form')return;
 e.preventDefault();
 const form=e.target;if(!form.reportValidity())return;
 const d=new FormData(form),name=String(d.get('ownerName')||'').trim(),email=String(d.get('ownerEmail')||'').trim().toLowerCase();
 const btn=form.querySelector('[type=submit]'),error=form.querySelector('#owner-invite-error');
 error.textContent='';btn.disabled=true;platform.inviting=true;
 try{await WDF.inviteOwner(email,name);form.reset();toastLocal('Owner invited. A password setup email was sent.')}
 catch(x){error.className='error';error.textContent=WDF.authError(x)}
 finally{platform.inviting=false;btn.disabled=false}
});
