/* RESPAWN UI helpers: escaping, icons, small components, toast + sheet system. */
(function (root) {
  'use strict';
  var RS = root.RS = root.RS || {};
  var Games = root.RespawnGames;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICONS = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    play: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14.2c2.2.3 4 2.1 4 4.3"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a3 3 0 0 0 4 2.8M16 6h4v1a3 3 0 0 1-4 2.8"/><path d="M12 13v4M8 20h8M10 17h4"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16c.5-1.7 1.9-2.6 3.5-2.6s3 .9 3.5 2.6M14.5 10h4M14.5 13.5h3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.2C1.7 7.6 3.6 4.5 6.8 4.5c1.9 0 3.4 1 5.2 3 1.8-2 3.3-3 5.2-3 3.2 0 5.1 3.1 4 6.3C19.5 15.4 12 20 12 20z"/>',
    comment: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/>',
    bookmark: '<path d="M6 4h12v17l-6-4-6 4z"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    upload: '<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 0 0 3-3C20 8 16.5 3 12 3z"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="11" r="1"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    'message-circle': '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2 1-4.5A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"',
    send: '<path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9 22 2"/>',
    wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="16.5" cy="13.5" r="1.2"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function avatar(name, opts) {
    opts = opts || {};
    var h = hash(String(name || '?')), shade = 25 + (h % 18);
    var theme = opts.theme;
    var style = theme ? '--a:' + theme.a + ';--b:' + theme.b + ';' : '--a:hsl(0 0% ' + shade + '%);--b:hsl(0 0% ' + (shade + 13) + '%);';
    return '<span class="avatar ' + (opts.size || '') + ' ' + (opts.frame ? 'frame-' + esc(opts.frame) : '') + '" style="' + style + '" aria-hidden="true">' + esc(String(name || '?').slice(0, 2)) + '</span>';
  }

  function gameBadge(id) {
    var g = Games.byId(id); if (!g) return '';
    return '<span class="chip game-badge" style="--c:' + g.color + '">' + esc(g.short) + '</span>';
  }
  function rankBadge(rank, level) {
    return '<span class="chip rank-badge" title="Self-reported by the player — not verified">' + esc(rank) + (level ? ' · Lv ' + esc(level) : '') + '</span>';
  }
  function stateBadge(state, label) {
    var cls = { registration_open: 'pill-ok', registration_closed: 'pill-warn', in_progress: 'pill-info', awaiting_verification: 'pill-warn', completed: '', cancelled: 'pill-bad', disputed: 'pill-bad' }[state] || '';
    return '<span class="chip state ' + cls + '">' + esc(label) + '</span>';
  }

  function empty(ic, title, text, actions) {
    return '<div class="empty">' + icon(ic) + '<h3>' + esc(title) + '</h3><p class="small">' + esc(text) + '</p>' + (actions || '') + '</div>';
  }
  function notice(kind, text) {
    return '<div class="notice ' + (kind || '') + '">' + icon(kind === 'err' ? 'ban' : 'info') + '<div>' + text + '</div></div>';
  }
  function demoNotice(text) { return notice('demo', '<b>Demo content.</b> ' + esc(text)); }
  function skeleton(n) {
    var out = '';
    for (var i = 0; i < (n || 3); i++) out += '<div class="card"><div class="row"><div class="skel" style="width:44px;height:44px;border-radius:50%"></div><div class="grow col"><div class="skel" style="height:12px;width:40%"></div><div class="skel" style="height:10px;width:25%"></div></div></div><div class="skel" style="height:64px;margin-top:12px"></div></div>';
    return '<div class="stack" aria-busy="true" aria-label="Loading">' + out + '</div>';
  }

  function timeAgo(ts) {
    var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    return Math.floor(s / 86400) + 'd';
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); } catch (e) { return ''; }
  }

  /* toast */
  function toast(msg, kind) {
    var box = document.getElementById('toasts'); if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || ''); el.textContent = msg; el.setAttribute('role', 'status');
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, kind === 'err' ? 5200 : 3400);
  }

  /* sheet / drawer */
  var lastFocus = null;
  function closeOverlay() {
    var r = document.getElementById('overlay'); if (r) r.innerHTML = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
  }
  function openOverlay(html) {
    lastFocus = document.activeElement;
    document.getElementById('overlay').innerHTML = '<div class="scrim" data-act="close"></div>' + html;
    var first = document.querySelector('#overlay [autofocus], #overlay .sheet, #overlay .drawer');
    if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); }
  }
  function sheet(title, body) {
    openOverlay('<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="grab"></div>' +
      '<div class="row between" style="margin-bottom:12px"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="close" aria-label="Close">' + icon('x') + '</button></div>' + body + '</div>');
  }
  function drawer(body) {
    openOverlay('<nav class="drawer" role="dialog" aria-modal="true" aria-label="Menu">' + body + '</nav>');
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOverlay(); });

  function copyText(text) {
    function fallback() {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  function options(list, selected, withAny) {
    var out = withAny ? '<option value="">' + esc(withAny) + '</option>' : '';
    list.forEach(function (v) {
      var val = typeof v === 'object' ? v.id : v, label = typeof v === 'object' ? v.label || v.name : v;
      out += '<option value="' + esc(val) + '"' + (val === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
    });
    return out;
  }

  RS.ui = {
    esc: esc, icon: icon, avatar: avatar, gameBadge: gameBadge, rankBadge: rankBadge, stateBadge: stateBadge,
    empty: empty, notice: notice, demoNotice: demoNotice, skeleton: skeleton, timeAgo: timeAgo, fmtDate: fmtDate,
    toast: toast, sheet: sheet, drawer: drawer, closeOverlay: closeOverlay, copyText: copyText, options: options
  };
})(typeof self !== 'undefined' ? self : this);
