const platform={owners:[],inviting:false};
function renderPlatformAdmin(){const activeOwners=platform.owners.filter(x=>x.active);const removedOwners=platform.owners.filter(x=>!x.active);
 $('#app').innerHTML=`<main class="main" style="min-height:100vh"><header class="topbar"><div class="brand"><span class="brandmark"><img src="brand-logo.png" alt="" aria-hidden="true"></span>workshop<span style="color:#799762;margin-left:-7px">desk.</span></div><div class="top-actions"><span class="tag">Platform admin</span><button type="button" class="btn light" data-action="platform-logout">Sign out</button></div></header><div class="content" style="max-width:1100px;margin:auto"><div class="demo-strip"><span>${icon('shield')}Workshop access</span><span>Each owner has a separate workspace</span></div><h1>Workshop owners</h1><p class="muted">Invite an owner to a fresh workshop. Owners can invite employees only to their own workshop.</p><section class="panel" style="margin-top:24px"><div class="panel-head"><div><h2>Invite owner</h2><p>The owner receives a password setup email.</p></div></div><div class="panel-body"><form id="owner-invite-form"><div class="form-grid">${field('Owner name','ownerName','','text',true)}${field('Owner email','ownerEmail','','email',true)}</div><div id="owner-invite-error" role="alert"></div><div class="actions" style="margin-top:20px"><button type="reset" class="btn light">Clear</button><button type="submit" class="btn primary" ${platform.inviting?'disabled':''}>Send invite</button></div></form></div></section><section class="panel" style="margin-top:24px"><div class="panel-head"><div><h2>Invited owners</h2><p>${activeOwners.length} workshop${activeOwners.length===1?'':'s'}</p></div></div><div class="panel-body">${activeOwners.length?'<div class="table-wrap"><table><thead><tr><th>Owner</th><th>Email</th><th>Workshop</th><th>Status</th><th>Action</th></tr></thead><tbody>'+activeOwners.map(x=>`<tr><td>${esc(x.name||'Owner')}</td><td>${esc(x.email||'')}</td><td>${esc(x.workshopId)}</td><td>Active</td><td><button type="button" class="btn small light" data-action="remove-owner" data-id="${esc(x.uid)}">Remove owner</button></td></tr>`).join('')+'</tbody></table></div>':'<p>No owners invited yet.</p>'}</div></section>${removedOwnersSection(removedOwners)}</div></main>`;
}

function removedOwnersSection(rows){
 if(!rows.length)return '';
 return `<section class="panel" style="margin-top:24px"><div class="panel-head"><div><h2>Removed owners</h2><p>Access is disabled; records are kept for restoration.</p></div></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Owner</th><th>Email</th><th>Workshop</th><th></th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.name||'Owner')}</td><td>${esc(x.email||'')}</td><td>${esc(x.workshopId)}</td><td><button type="button" class="btn small light" data-action="restore-owner" data-id="${esc(x.uid)}">Restore</button></td></tr>`).join('')}</tbody></table></div></div></section>`;
}

document.addEventListener('click',async e=>{
 if(e.target.closest('[data-action="platform-logout"]')){logoutRemote();return}
 const remove=e.target.closest('[data-action="remove-owner"]');
 const restore=e.target.closest('[data-action="restore-owner"]');
 const button=remove||restore;if(!button)return;
 const owner=platform.owners.find(x=>x.uid===button.dataset.id);if(!owner)return;
 const active=Boolean(restore);
 const message=active?`Restore ${owner.name||owner.email} and employees suspended with this owner?`:`Remove ${owner.name||owner.email}? This disables this owner and their employees. Workshop records remain available for restoration.`;
 if(!window.confirm(message))return;
 button.disabled=true;
 try{await WDF.setOwnerActive(owner.uid,active);toastLocal(active?'Owner restored.':'Owner removed and team access disabled.')}
 catch(error){toastLocal(WDF.authError(error));button.disabled=false}
});

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
