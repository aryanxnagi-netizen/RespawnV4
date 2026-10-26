/* RESPAWN app shell: router, top bar, bottom nav, event delegation. */
(function (root) {
  'use strict';
  var RS = root.RS, ui = RS.ui, store = RS.store, S = RS.S, h = RS.h, A = RS.actions, esc = ui.esc, icon = ui.icon;

  var NAV = [['home', '#/home', 'Home', 'home'], ['fragz', '#/fragz', 'FRAGZ', 'play'], ['squad', '#/squad', 'Squad Finder', 'users'], ['arena', '#/arena', 'ARENA', 'trophy'], ['me', '#/me', 'My Gamer ID', 'id']];
  var NAV_SHORT = { squad: 'Squad' , me: 'Gamer ID' };

  function parse() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/');
    return { name: parts[0] || 'home', arg: decodeURIComponent(parts[1] || '') };
  }

  function topbar() {
    var s = store.state, unread = store.unread();
    return '<header class="topbar"><a class="brand" href="#/home" aria-label="RESPAWN home"><span class="logo">R</span><span class="wordmark">RESPAWN</span></a>' +
      '<a class="coin-chip" href="#/wallet" aria-label="Coin balance: 0">' + icon('coin') + '0</a>' +
      '<a class="icon-btn" href="#/search" aria-label="Search">' + icon('search') + '</a>' +
      '<a class="icon-btn" href="#/messages" aria-label="Messages">' + icon('message-circle') + '</a>' +
      '<a class="icon-btn" href="#/notifications" aria-label="Notifications' + (unread ? ', ' + unread + ' unread' : '') + '">' + icon('bell') + (unread ? '<span class="count">' + (unread > 9 ? '9+' : unread) + '</span>' : '') + '</a>' +
      '<a class="icon-btn" href="#/me" aria-label="My Gamer ID">' + ui.avatar(s.profile.username || 'me', { size: 'sm', theme: h.theme() }) + '</a>' +
      '<button class="icon-btn" data-act="menu" aria-label="Open menu">' + icon('menu') + '</button></header>';
  }
  function bottomnav(active) {
    var group = { home: 'home', fragz: 'fragz', squad: 'squad', invites: 'squad', arena: 'arena', tournament: 'arena', me: 'me', studio: 'me', player: 'squad' }[active];
    return '<nav class="bottomnav" aria-label="Primary">' + NAV.map(function (n) {
      return '<a class="navbtn" href="' + n[1] + '"' + (group === n[0] ? ' aria-current="page"' : '') + '>' + icon(n[3]) + '<span>' + esc(NAV_SHORT[n[0]] || n[2]) + '</span></a>';
    }).join('') + '</nav>';
  }

  var lastRoute = '';
  function render() {
    var r = parse(), s = store.state, app = document.getElementById('app');
    if (!s.onboarded && r.name !== 'welcome') { location.hash = '#/welcome'; return; }
    if (s.onboarded && r.name === 'welcome') { location.hash = '#/home'; return; }
    if (r.name !== 'studio') { S.studio = null; }
    var fr = document.getElementById('fragz'), frTop = fr ? fr.scrollTop : 0, winY = window.scrollY, sameRoute = lastRoute === location.hash;
    var fn = RS.screens[r.name], body;
    try { body = fn ? fn(r.arg) : null; } catch (err) {
      console.error(err);
      body = ui.empty('ban', 'Something went wrong', 'This screen hit an error. Your data is safe on this device.', '<a class="btn primary" href="#/home">Back to Home</a>');
    }
    if (body === null) body = ui.empty('search', 'Page not found', 'That screen doesn’t exist.', '<a class="btn primary" href="#/home">Go Home</a>');
    if (body === '') return;
    var flush = r.name === 'fragz';
    app.innerHTML = r.name === 'welcome' ? '<main id="main">' + body + '</main>' :
      topbar() + '<div id="offline" role="status">You’re offline. RESPAWN demo content still works — nothing is sent anywhere.</div><main id="main" class="' + (flush ? 'flush' : '') + '">' + body + '</main>' + bottomnav(r.name);
    var f2 = document.getElementById('fragz');
    if (f2 && sameRoute) f2.scrollTop = frTop;
    if (sameRoute) window.scrollTo(0, winY); else if (!flush) window.scrollTo(0, 0);
    lastRoute = location.hash;
    document.title = 'RESPAWN';
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var name = el.dataset.act;
    if (el.tagName === 'SUMMARY') e.preventDefault();
    if (name === 'close') { ui.closeOverlay(); if (el.tagName === 'A') return; return; }
    var fn = A[name]; if (fn) { fn(el, e); }
  });

  function applyBind(el, isInput) {
    var path = el.dataset.bind; if (!path) return;
    var val = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.store !== undefined) {
      // bind into persisted store: path like "profile.show.bio"
      var parts = path.split('.'), o = store.state;
      for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = val; store.save();
    } else h.setPath(path, val);
    if (path.indexOf('f.') === 0) { S.squadCount = 5; }
    if (el.dataset.live !== undefined && isInput) {
      var box = document.getElementById('results'); if (box) box.innerHTML = RS.searchResultsHtml(String(val));
      return;
    }
    if (el.dataset.rerender !== undefined && !isInput) render();
  }
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.bind !== undefined && el.type !== 'checkbox' && el.tagName !== 'SELECT') applyBind(el, true);
    if (el.dataset.weight) updateWeightTotal();
    if (el.id === 'cmp-text') { var c = document.getElementById('cmp-count'); if (c) c.textContent = el.value.length + ' / 280'; }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.bind !== undefined) applyBind(el, false);
    if (el.dataset.actChange && A[el.dataset.actChange]) A[el.dataset.actChange](el, e);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && e.target.id === 'chat-input' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); var send = document.querySelector('[data-act=\"chat-send\"]'); if (send) send.click();
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act="tog"]'); if (!el) return;
    var arr = h.getPath(el.dataset.path) || [], v = el.dataset.v, i = arr.indexOf(v);
    if (i === -1) arr.push(v); else arr.splice(i, 1);
    h.setPath(el.dataset.path, arr); render();
  });

  function updateWeightTotal() {
    var total = 0; document.querySelectorAll('[data-weight]').forEach(function (i) { total += parseFloat(i.value) || 0; });
    var t = document.getElementById('wtotal'), m = document.getElementById('wmsg'), b = document.getElementById('wapply');
    if (t) t.textContent = String(Math.round(total * 100) / 100);
    var ok = Math.abs(total - 100) < 1e-9;
    if (m) { m.textContent = ok ? 'Ready to apply' : (total > 100 ? 'Reduce by ' : 'Add ') + Math.abs(Math.round((100 - total) * 100) / 100); m.style.color = ok ? 'var(--success)' : 'var(--warn)'; }
    if (b) { b.disabled = !ok; }
  }

  A.tog = function () { /* handled by dedicated listener above */ };

  window.addEventListener('hashchange', function () { ui.closeOverlay(); render(); });
  function setOffline() { document.body.classList.toggle('is-offline', navigator.onLine === false); }
  window.addEventListener('online', setOffline); window.addEventListener('offline', setOffline);

  RS.app = { render: render, updateWeightTotal: updateWeightTotal };

  function boot() {
    // preload saved squad filters / seed the filter state lazily inside screens
    setOffline();
    if (!location.hash) location.hash = store.state.onboarded ? '#/home' : '#/welcome';
    render();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof self !== 'undefined' ? self : this);
