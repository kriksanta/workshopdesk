(() => {
  'use strict';
  const root = document.documentElement;
  let header = null;
  let lastHeight = -1;
  function measure() {
    const height = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    if (height === lastHeight) return;
    lastHeight = height;
    root.style.setProperty('--app-toolbar-height', height + 'px');
  }
  const resize = new ResizeObserver(measure);
  function connect() {
    const next = document.querySelector('.topbar') || document.querySelector('.login-top');
    if (next !== header) {
      resize.disconnect();
      header = next;
      if (header) resize.observe(header);
    }
    measure();
  }
  new MutationObserver(connect).observe(root, { childList:true, subtree:true });
  document.addEventListener('DOMContentLoaded', connect);
  connect();
})();


(() => {
  function installProfile() {
    const actions=document.querySelector('.topbar .top-actions');
    if(!actions||actions.querySelector('.mobile-profile'))return;
    const box=document.createElement('div');box.className='mobile-profile';
    box.innerHTML='<button class="profile-trigger" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></svg><svg class="profile-chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="m2 2 4 4 4-4"/></svg></button><div class="profile-menu" hidden><div class="profile-caption">Your profile</div></div>';
    const menu=box.querySelector('.profile-menu');
    actions.querySelectorAll('.role-picker button').forEach(button=>{const copy=button.cloneNode(true);copy.className='';copy.setAttribute('aria-pressed',String(button.classList.contains('selected')));menu.append(copy);});
    const settings=document.querySelector('.sidebar [data-action="nav"][data-page="Settings"]');
    if(settings){const copy=settings.cloneNode(true);copy.className='';copy.textContent='Settings';menu.append(copy);}
    const logout=actions.querySelector('[data-action="logout"]');
    if(logout){const copy=logout.cloneNode(true);copy.className='';copy.textContent='Logout';menu.append(copy);}
    actions.append(box);
    const trigger=box.querySelector('.profile-trigger');
    trigger.addEventListener('click',()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden));});
    menu.addEventListener('click',()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');});
  }
  new MutationObserver(installProfile).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',installProfile);installProfile();
  document.addEventListener('click',e=>{if(e.target.closest('.mobile-profile'))return;document.querySelectorAll('.profile-menu').forEach(m=>m.hidden=true);document.querySelectorAll('.profile-trigger').forEach(b=>b.setAttribute('aria-expanded','false'));});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.profile-menu').forEach(m=>m.hidden=true);document.querySelectorAll('.profile-trigger').forEach(b=>b.setAttribute('aria-expanded','false'));}});
})();
