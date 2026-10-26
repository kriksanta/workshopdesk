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

