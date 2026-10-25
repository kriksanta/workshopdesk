(() => {
  'use strict';
  const root = document.documentElement;
  const preference = matchMedia('(prefers-color-scheme: dark)');
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('theme'); } catch {}
  if (!['light', 'dark'].includes(savedTheme)) savedTheme = null;
  let theme = savedTheme || (preference.matches ? 'dark' : 'light');

  function syncToggle() {
    const toggle = document.getElementById('toggle');
    if (!toggle) return;
    const isDark = theme === 'dark';
    toggle.classList.toggle('night', isDark);
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.title = isDark ? 'Switch to day mode' : 'Switch to night mode';
    toggle.setAttribute('aria-label', toggle.title);
  }
  function setTheme(next, remember = true) {
    if (!['light', 'dark'].includes(next)) return;
    theme = next;
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0B1424' : '#F0F3F7';
    if (remember) {
      savedTheme = theme;
      try { localStorage.setItem('theme', theme); } catch {}
    }
    syncToggle();
  }
  function mountToggle() {
    if (document.getElementById('toggle')) return;
    const target = document.querySelector('.top-actions') || document.querySelector('.login-top');
    if (!target) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'toggle';
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Night mode');
    toggle.innerHTML = "<svg viewBox=\"0 0 400 172\" role=\"img\" aria-label=\"Animated sun and moon toggle\"><defs><clipPath id=\"wd-theme-clip\"><rect x=\"3\" y=\"3\" width=\"394\" height=\"166\" rx=\"83\"/></clipPath><filter id=\"wd-theme-shadow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"190%\"><feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"3\"/><feOffset dy=\"5\"/><feComponentTransfer><feFuncA type=\"linear\" slope=\".2\"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in=\"SourceGraphic\"/></feMerge></filter></defs><g clip-path=\"url(#wd-theme-clip)\"><rect class=\"track\" x=\"3\" y=\"3\" width=\"394\" height=\"166\" rx=\"83\"/><g class=\"halo\"><circle cx=\"87\" cy=\"86\" r=\"180\" fill=\"#4389c9\"/><circle cx=\"87\" cy=\"86\" r=\"132\" fill=\"#569bd8\"/><circle cx=\"87\" cy=\"86\" r=\"96\" fill=\"#70b1e6\"/></g><g class=\"starfield\" fill=\"#d8ecff\"><path class=\"star\" d=\"M42 35l3 9 9 3-9 3-3 9-3-9-9-3 9-3z\"/><path class=\"star\" d=\"M112 70l2 7 7 2-7 2-2 7-2-7-7-2 7-2z\"/><path class=\"star\" d=\"M153 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2z\"/><path class=\"star\" d=\"M69 112l2 5 5 2-5 2-2 5-2-5-5-2 5-2z\"/><circle cx=\"137\" cy=\"115\" r=\"1.7\"/><circle cx=\"25\" cy=\"105\" r=\"1.6\"/><circle cx=\"173\" cy=\"60\" r=\"1.4\"/></g><g class=\"clouds\"><circle cx=\"188\" cy=\"177\" r=\"42\" fill=\"#81b5e0\"/><circle cx=\"220\" cy=\"174\" r=\"35\" fill=\"#a5cdec\"/><circle cx=\"258\" cy=\"175\" r=\"42\" fill=\"#d5eaf8\"/><circle cx=\"279\" cy=\"150\" r=\"34\" fill=\"#f3faff\"/><circle cx=\"320\" cy=\"157\" r=\"49\" fill=\"#fff\"/><circle cx=\"372\" cy=\"144\" r=\"39\" fill=\"#fff\"/><circle cx=\"395\" cy=\"173\" r=\"44\" fill=\"#fff\"/></g><g class=\"orb\" filter=\"url(#wd-theme-shadow)\"><g class=\"sun\"><circle cx=\"86\" cy=\"86\" r=\"66\" fill=\"#ffbf24\"/><path d=\"M25 80a63 63 0 0 1 59-57\" fill=\"none\" stroke=\"#fff7d6\" stroke-width=\"2.5\" stroke-linecap=\"round\"/></g><g class=\"moon\"><circle cx=\"86\" cy=\"86\" r=\"66\" fill=\"#dce5ee\"/><circle cx=\"82\" cy=\"81\" r=\"60\" fill=\"#f3f5f7\"/><circle cx=\"58\" cy=\"57\" r=\"14\" fill=\"#aebdcc\"/><circle cx=\"110\" cy=\"77\" r=\"17\" fill=\"#aebdcc\"/><circle cx=\"74\" cy=\"115\" r=\"10\" fill=\"#b9c6d3\"/><circle cx=\"54\" cy=\"55\" r=\"9\" fill=\"#bac8d5\"/><circle cx=\"106\" cy=\"73\" r=\"11\" fill=\"#c0ccd8\"/><path d=\"M35 72a57 57 0 0 1 49-44\" stroke=\"white\" stroke-width=\"3\" fill=\"none\" opacity=\".8\"/></g></g></g><rect class=\"rim\" x=\"3\" y=\"3\" width=\"394\" height=\"166\" rx=\"83\"/></svg>";
    if (target.matches('.login-top')) target.append(toggle);
    else target.prepend(toggle);
    syncToggle();
  }

  setTheme(theme, false);
  document.addEventListener('click', event => {
    if (event.target.closest('#toggle')) setTheme(theme === 'dark' ? 'light' : 'dark');
  });
  preference.addEventListener?.('change', event => {
    if (!savedTheme) setTheme(event.matches ? 'dark' : 'light', false);
  });
  new MutationObserver(mountToggle).observe(root, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', mountToggle);
  mountToggle();
})();

