/* RESPAWN screens, part 2: Squad Finder, player profile, invites, ARENA, Gamer ID, studio. */
(function (root) {
  'use strict';
  var RS = root.RS, ui = RS.ui, store = RS.store, D = root.RespawnData, Games = root.RespawnGames, M = root.RespawnMatching;
  var esc = ui.esc, icon = ui.icon, S = RS.S, h = RS.h, A = RS.actions, st = h.st;

  function slotsText(slots) {
    var names = (slots || []).map(function (id) { var s = Games.SLOTS.filter(function (x) { return x.id === id; })[0]; return s ? s.label : id; });
    if (!names.length) return 'No times set';
    return names.slice(0, 2).join(', ') + (names.length > 2 ? ' +' + (names.length - 2) : '');
  }
  function entryFor(gid) {
    var gs = st().profile.games; for (var i = 0; i < gs.length; i++) if (gs[i].game === gid) return gs[i];
    return null;
  }
  function seekerFor(gid) {
    var p = st().profile, e = entryFor(gid); if (!e) return null;
    return { id: 'me', username: p.username, game: gid, mode: e.mode, rank: e.rank, role: e.role, languages: p.languages, region: p.region, server: e.server,
      platform: e.platform, playstyle: e.playstyle, communication: e.communication, mic: p.mic, slots: e.slots, blockedIds: st().blocked };
  }
  function filters() {
    if (!S.f) {
      var saved = st().squadPrefs;
      S.f = saved ? JSON.parse(JSON.stringify(saved)) : { game: st().profile.mainGame };
      if (!entryFor(S.f.game)) S.f.game = st().profile.mainGame;
    }
    return S.f;
  }
  function weights() { return st().weights || M.DEFAULT_WEIGHTS; }
  function clean(f) {
    var o = {}; ['mode', 'role', 'language', 'region', 'playstyle', 'slot', 'rankMin', 'rankMax'].forEach(function (k) { if (f[k]) o[k] = f[k]; });
    if (f.micRequired) o.micRequired = true; return o;
  }
  function invitedPending(id) { return st().invites.filter(function (i) { return i.candidateId === id && i.status === 'pending'; })[0]; }

  /* ---------- Squad Finder ---------- */
  RS.screens.squad = function () {
    var s = st(), p = s.profile, f = filters(), g = Games.byId(f.game), seeker = seekerFor(f.game);
    if (!seeker) return ui.empty('users', 'Add a game first', 'Squad Finder needs at least one game on your Gamer ID.', '<a class="btn primary" href="#/me">Open My Gamer ID</a>');
    var out = M.rankCandidates(seeker, D.GAMERS, { filters: clean(f), weights: weights(), limit: S.squadCount });
    var hidden = out.excluded.filter(function (x) { return x.reason !== 'Different game'; });

    var html = h.pageHead('Squad Finder') +
      '<div class="card glow row"><div class="grow"><b>Looking for Group</b><p class="xs muted">' + (p.lfg ? 'On — you’ll appear to others once accounts are live.' : 'Off — you won’t be suggested to others.') + ' In demo mode no one else sees your profile.</p></div>' +
      '<button class="btn sm ' + (p.lfg ? 'primary' : '') + '" data-act="lfg" aria-pressed="' + p.lfg + '">' + (p.lfg ? 'LFG on' : 'LFG off') + '</button></div>' +
      '<div class="hscroll" style="margin-top:12px" role="group" aria-label="Game">' + p.games.map(function (e) {
        var gg = Games.byId(e.game);
        return '<button class="chip btnlike ' + (e.game === f.game ? 'on' : '') + '" aria-pressed="' + (e.game === f.game) + '" data-act="squad-game" data-v="' + e.game + '" style="' + (e.game === f.game ? 'border-color:' + gg.color : '') + '">' + esc(gg.name) + '</button>';
      }).join('') + '</div>' +
      '<details class="card" style="margin-top:12px"' + (S.filtersOpen ? ' open' : '') + '><summary data-act="ftoggle" style="cursor:pointer;font-weight:700;min-height:32px;display:flex;align-items:center">Filters</summary><div class="stack" style="margin-top:12px">' +
      '<div class="grid2"><label class="field">Mode<select data-bind="f.mode" data-rerender>' + ui.options(g.modes, f.mode, 'Any mode') + '</select></label>' +
      '<label class="field">Role<select data-bind="f.role" data-rerender>' + ui.options(g.roles, f.role, 'Any role') + '</select></label></div>' +
      '<div class="grid2"><label class="field">Lowest rank<select data-bind="f.rankMin" data-rerender>' + ui.options(g.ranks, f.rankMin, 'No minimum') + '</select></label>' +
      '<label class="field">Highest rank<select data-bind="f.rankMax" data-rerender>' + ui.options(g.ranks, f.rankMax, 'No maximum') + '</select></label></div>' +
      '<div class="grid2"><label class="field">Language<select data-bind="f.language" data-rerender>' + ui.options(Games.LANGUAGES, f.language, 'Any language') + '</select></label>' +
      '<label class="field">Region<select data-bind="f.region" data-rerender>' + ui.options(Games.REGIONS, f.region, 'Any region') + '</select></label></div>' +
      '<div class="grid2"><label class="field">Playstyle<select data-bind="f.playstyle" data-rerender>' + ui.options(Games.PLAYSTYLES, f.playstyle, 'Any playstyle') + '</select></label>' +
      '<label class="field">Plays at<select data-bind="f.slot" data-rerender>' + ui.options(Games.SLOTS.map(function (x) { return { id: x.id, label: x.label }; }), f.slot, 'Any time') + '</select></label></div>' +
      '<label class="toggle"><span>Only players with a microphone</span><input type="checkbox" data-bind="f.micRequired" data-rerender' + (f.micRequired ? ' checked' : '') + '></label>' +
      '<div class="row wrap"><button class="btn sm" data-act="squad-save">Save preferences</button><button class="btn sm ghost" data-act="squad-reset">Clear filters</button><button class="btn sm ghost" data-act="weights">Tune weights</button></div></div></details>' +
      '<div class="section-title"><h2>' + out.total + ' match' + (out.total === 1 ? '' : 'es') + '</h2><a class="small" href="#/invites">Invitations (' + s.invites.filter(function (i) { return i.status === 'pending'; }).length + ')</a></div>' +
      '<div class="notice" style="margin-bottom:12px">' + icon('info') + '<div class="small">Scores are <b>heuristic compatibility estimates</b> computed from the profile details below — not AI, and not a promise of a good match. Ranks are self-reported. Players shown are invented demo gamers.</div></div>';

    if (!out.results.length) {
      html += ui.empty('search', 'No matches with these filters', 'Try widening the rank range or removing a filter.', '<button class="btn primary" data-act="squad-reset">Clear filters</button>');
    }
    html += '<div class="stack">' + out.results.map(function (r) {
      var c = r.candidate, inv = invitedPending(c.id);
      return '<article class="card stack"><div class="row"><a href="#/player/' + c.id + '" style="text-decoration:none;color:inherit" class="row grow">' + ui.avatar(c.username) +
        '<div class="grow" style="min-width:0"><b>' + esc(c.username) + '</b><div class="row wrap" style="gap:4px;margin-top:2px">' + ui.gameBadge(c.game) + ui.rankBadge(c.rank, c.level) + '</div></div></a>' +
        '<div class="score" style="--p:' + r.score + '" role="img" aria-label="Compatibility ' + r.score + ' percent"><b>' + r.score + '%</b></div></div>' +
        '<div class="row wrap" style="gap:6px"><span class="chip">' + esc(c.role) + '</span><span class="chip">' + esc(c.mode) + '</span><span class="chip">' + esc(c.mic) + '</span><span class="chip">' + esc(c.languages.join(' / ')) + '</span><span class="chip">' + esc(slotsText(c.slots)) + '</span></div>' +
        '<p class="small muted">' + esc(c.bio) + '</p>' +
        '<div class="explain">' + esc(r.explanation) + (r.caveats.length ? '<div class="xs muted" style="margin-top:4px">Watch out: ' + esc(r.caveats.join(', ')) + '.</div>' : '') + '</div>' +
        '<div class="row wrap">' + (inv ? '<button class="btn sm grow" data-act="invite-cancel" data-id="' + esc(inv.id) + '">Invited · Cancel</button>' : '<button class="btn sm primary grow" data-act="invite" data-id="' + c.id + '">Send invite</button>') +
        '<a class="btn sm" href="#/player/' + c.id + '">Profile</a><button class="btn sm ghost" data-act="why" data-id="' + c.id + '">Why?</button></div></article>';
    }).join('') + '</div>';
    if (out.total > out.results.length) html += '<button class="btn block" style="margin-top:12px" data-act="squad-more">Show more (' + (out.total - out.results.length) + ')</button>';
    if (hidden.length) html += '<button class="btn ghost block" style="margin-top:12px" data-act="hidden">' + hidden.length + ' player' + (hidden.length === 1 ? '' : 's') + ' hidden by your filters or safety settings — see why</button>';
    return html;
  };

  A.lfg = function () { var p = st().profile; p.lfg = !p.lfg; store.save(); ui.toast(p.lfg ? 'Looking for Group: on' : 'Looking for Group: off'); RS.app.render(); };
  A.ftoggle = function () { S.filtersOpen = !S.filtersOpen; RS.app.render(); };
  A['squad-game'] = function (el) { S.f = { game: el.dataset.v }; S.squadCount = 5; RS.app.render(); };
  A['squad-more'] = function () { S.squadCount += 5; RS.app.render(); };
  A['squad-reset'] = function () { S.f = { game: filters().game }; S.squadCount = 5; RS.app.render(); };
  A['squad-save'] = function () { st().squadPrefs = JSON.parse(JSON.stringify(filters())); store.save(); ui.toast('Search preferences saved on this device', 'ok'); };
  A.invite = function (el) {
    var id = el.dataset.id, u = h.gamer(id); if (!u || h.isBlocked(id) || invitedPending(id)) return;
    st().invites.unshift({ id: store.uid('i'), candidateId: id, game: u.game, at: Date.now(), status: 'pending' });
    store.notify('Invite to ' + u.username + ' saved. Demo mode: they are not actually notified.'); ui.toast('Invite saved (demo — nobody was messaged)', 'ok'); RS.app.render();
  };
  A['invite-cancel'] = function (el) {
    st().invites = st().invites.filter(function (i) { return i.id !== el.dataset.id; }); store.save(); ui.toast('Invite cancelled'); RS.app.render();
  };
  A.why = function (el) {
    var f = filters(), seeker = seekerFor(f.game), c = h.gamer(el.dataset.id), r = M.scoreCandidate(seeker, c, weights());
    ui.sheet(c.username + ' — ' + r.score + '% compatibility',
      '<p class="small" style="margin-bottom:10px">' + esc(r.explanation) + '</p><table class="t"><tr><th>Factor</th><th>Fit</th><th>Weight</th><th>Points</th></tr>' +
      r.components.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td><div class="bar" style="width:70px"><i style="width:' + Math.round(x.value * 100) + '%"></i></div></td><td>' + x.weight + '%</td><td>' + x.points.toFixed(1) + '</td></tr>'; }).join('') +
      '</table><p class="xs muted" style="margin-top:10px">Score = sum of (fit × weight). Different roles score higher than duplicate roles because they complement each other. This is a heuristic estimate, not a validated probability. Ranks are self-reported and unverified.</p>');
  };
  A.hidden = function () {
    var f = filters(), out = M.rankCandidates(seekerFor(f.game), D.GAMERS, { filters: clean(f), weights: weights() });
    ui.sheet('Hidden players', '<table class="t">' + out.excluded.filter(function (x) { return x.reason !== 'Different game'; }).map(function (x) { return '<tr><td>' + esc(x.candidate.username) + '</td><td class="muted">' + esc(x.reason) + '</td></tr>'; }).join('') + '</table>');
  };
  A.weights = function () {
    var w = weights(), keys = Object.keys(M.DEFAULT_WEIGHTS);
    ui.sheet('Tune matching weights', '<p class="small muted" style="margin-bottom:10px">Decide what matters most. Weights must total exactly 100.</p><div class="stack">' +
      keys.map(function (k) { return '<label class="field">' + esc(M.LABELS[k]) + '<input type="number" min="0" max="100" step="1" inputmode="numeric" data-weight="' + k + '" value="' + w[k] + '"></label>'; }).join('') +
      '<div class="row between"><b>Total: <span id="wtotal">100</span> / 100</b><span id="wmsg" class="xs"></span></div>' +
      '<div class="row"><button class="btn grow" data-act="weights-reset">Reset to default</button><button class="btn primary grow" id="wapply" data-act="weights-apply">Apply</button></div></div>');
    RS.app.updateWeightTotal();
  };
  A['weights-reset'] = function () { st().weights = null; store.save(); ui.closeOverlay(); ui.toast('Weights reset to default'); RS.app.render(); };
  A['weights-apply'] = function () {
    var w = {}; document.querySelectorAll('[data-weight]').forEach(function (i) { w[i.dataset.weight] = parseFloat(i.value) || 0; });
    try { M.validateWeights(w); } catch (e) { return ui.toast(e.message, 'err'); }
    st().weights = w; store.save(); ui.closeOverlay(); ui.toast('Weights applied', 'ok'); RS.app.render();
  };

  /* ---------- Invitations ---------- */
  RS.screens.invites = function () {
    var list = st().invites.filter(function (i) { return i.status === 'pending'; });
    return h.pageHead('Invitations', '#/squad') + '<div class="stack">' +
      ui.notice('demo', 'Demo mode: invites you send are saved on this device only. Replies, accept/decline and squad membership need the backend.') +
      '<h2>Sent</h2>' + (list.length ? list.map(function (i) {
        var u = h.gamer(i.candidateId); if (!u) return '';
        return '<div class="card tight row">' + ui.avatar(u.username, { size: 'sm' }) + '<div class="grow"><b>' + esc(u.username) + '</b><div class="xs muted">' + esc(Games.byId(i.game).name) + ' · ' + ui.timeAgo(i.at) + ' ago · pending</div></div><button class="btn sm" data-act="invite-cancel" data-id="' + esc(i.id) + '">Cancel</button></div>';
      }).join('') : ui.empty('mail', 'No pending invites', 'Invite players from Squad Finder.', '<a class="btn primary" href="#/squad">Find teammates</a>')) +
      '<h2>Received</h2>' + ui.empty('users', 'No incoming requests', 'Requests from other players will appear here once accounts are live.') + '</div>';
  };

  /* ---------- Player profile ---------- */
  RS.screens.player = function (id) {
    var u = h.gamer(id);
    if (!u) return h.pageHead('Player', '#/squad') + ui.empty('search', 'Player not found', 'They may have been removed or blocked.');
    if (id === 'me') { location.hash = '#/me'; return ''; }
    var g = Games.byId(u.game), following = st().follows.indexOf(id) !== -1, inv = invitedPending(id), match = '';
    if (entryFor(u.game) && !h.isBlocked(id)) { var r = M.scoreCandidate(seekerFor(u.game), u, weights()); match = '<div class="card glow row">' + '<div class="score" style="--p:' + r.score + '"><b>' + r.score + '%</b></div><p class="small grow">' + esc(r.explanation) + '</p></div>'; }
    return h.pageHead(u.username, '#/squad') +
      '<div class="card" style="padding:0;overflow:hidden"><div class="banner" style="height:96px;background:linear-gradient(120deg,color-mix(in srgb,' + g.color + ' 50%,#0b0d12),#12151c)"></div>' +
      '<div class="profile-head">' + ui.avatar(u.username, { size: 'lg', frame: 'solid' }) + '</div><div style="padding:8px 16px 16px" class="stack">' +
      '<div><h2>' + esc(u.username) + '</h2><div class="row wrap" style="gap:6px;margin-top:6px">' + ui.gameBadge(u.game) + ui.rankBadge(u.rank, u.level) + '<span class="chip pill-info">' + (u.lfg ? 'Looking for group' : 'Not looking') + '</span><span class="chip pill-warn">Demo gamer</span></div></div>' +
      '<p class="small">' + esc(u.bio) + '</p>' +
      '<table class="t"><tr><td class="muted">Role</td><td>' + esc(u.role) + '</td></tr><tr><td class="muted">Mode</td><td>' + esc(u.mode) + '</td></tr><tr><td class="muted">Languages</td><td>' + esc(u.languages.join(', ')) + '</td></tr><tr><td class="muted">Region</td><td>' + esc(u.region) + '</td></tr><tr><td class="muted">Microphone</td><td>' + esc(u.mic) + '</td></tr><tr><td class="muted">Playstyle</td><td>' + esc(u.playstyle) + '</td></tr><tr><td class="muted">Plays</td><td>' + esc(slotsText(u.slots)) + '</td></tr></table>' +
      '<p class="xs muted">Rank and level are <b>self-reported</b> and not verified by RESPAWN or the game publisher.</p>' +
      (u.achievements.length ? '<div class="row wrap">' + u.achievements.map(function (a) { return '<span class="chip">' + icon('trophy').replace('<svg', '<svg width="14" height="14"') + esc(a) + '</span>'; }).join('') + '<span class="xs muted">demo badges</span></div>' : '') +
      '</div></div>' + (match ? '<div style="margin-top:12px">' + match + '</div>' : '') +
      '<div class="row wrap" style="margin-top:12px"><button class="btn grow ' + (following ? '' : 'primary') + '" data-act="follow" data-id="' + id + '">' + (following ? 'Following' : 'Follow') + '</button>' +
      (inv ? '<button class="btn grow" data-act="invite-cancel" data-id="' + esc(inv.id) + '">Invited · Cancel</button>' : '<button class="btn grow" data-act="invite" data-id="' + id + '">Send invite</button>') + '</div>' +
      '<div class="row wrap" style="margin-top:8px"><button class="btn ghost danger grow" data-act="block" data-id="' + id + '">' + icon('ban') + ' Block</button><button class="btn ghost grow" data-act="report" data-type="user" data-id="' + id + '">' + icon('flag') + ' Report</button></div>';
  };

  /* ---------- ARENA ---------- */
  RS.screens.arena = function () {
    var list = D.TOURNAMENTS.filter(function (t) { return (S.arenaTab === 'all' || t.kind === S.arenaTab) && (!S.arenaGame || t.game === S.arenaGame); });
    var regs = st().registrations;
    return h.pageHead('ARENA') +
      '<section class="arena-intro"><div class="arena-kicker">RESPAWN COMMUNITY / EVENTS</div><h2>Find your next match.</h2><p>Pick a game, bring your squad, and compete. Every event in this demo has free entry.</p><div class="arena-stats"><span class="arena-stat">FREE ENTRY</span><span class="arena-stat">COMMUNITY EVENTS</span><span class="arena-stat">DEMO SEASON</span></div></section>' +
      '<div class="chat-notice">Demo events only. Registrations are saved on this device; rewards are virtual cosmetics with no cash value.</div>' +
      '<div class="arena-filters"><div class="seg" role="group" aria-label="Event type">' + [['all', 'All'], ['casual', 'Casual'], ['competitive', 'Competitive']].map(function (t) {
        return '<button aria-pressed="' + (S.arenaTab === t[0]) + '" data-act="arena-tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<label class="field">Game<select data-bind="arenaGame" data-rerender>' + ui.options(Games.GAMES.map(function (g) { return { id: g.id, label: g.name }; }), S.arenaGame, 'All games') + '</select></label></div>' +
      '<div class="arena-list-head"><h2>Events to explore</h2><span class="small muted">' + list.length + ' event' + (list.length === 1 ? '' : 's') + '</span></div>' +
      (list.length ? '<div class="stack arena-events">' + list.map(function (t) {
        var registered = regs.indexOf(t.id) !== -1;
        return '<a href="#/tournament/' + t.id + '" class="arena-event"><div class="arena-event-cover"><span class="chip">' + esc(Games.byId(t.game).short) + '</span><span class="arena-cover-mark">' + (t.kind === 'casual' ? 'PLAY' : 'COMPETE') + '</span></div>' +
          '<div class="arena-event-content"><div class="arena-event-meta-top"><span>' + (t.kind === 'casual' ? 'COMMUNITY LOBBY' : 'COMPETITIVE CUP') + '</span>' + ui.stateBadge(t.state, D.STATE_LABELS[t.state]) + '</div>' +
          '<h3>' + esc(t.title) + '</h3><div class="arena-event-meta"><span>' + esc(t.mode) + '</span><span>Team of ' + t.teamSize + '</span><span>' + ui.fmtDate(t.startsAt) + '</span></div>' +
          '<div class="arena-event-foot"><span class="arena-free">' + (registered ? '✓ REGISTERED (DEMO)' : 'FREE ENTRY') + '</span><span class="arena-arrow" aria-hidden="true">↗</span></div></div></a>';
      }).join('') + '</div>' : ui.empty('trophy', 'No events match', 'Try another game or event type.', '<button class="btn primary" data-act="arena-tab" data-v="all">Show all</button>'));
  };
  A['arena-tab'] = function (el) { S.arenaTab = el.dataset.v; if (el.dataset.v === 'all') S.arenaGame = ''; RS.app.render(); };

  RS.screens.tournament = function (id) {
    var t = D.TOURNAMENTS.filter(function (x) { return x.id === id; })[0];
    if (!t) return h.pageHead('Event', '#/arena') + ui.empty('trophy', 'Event not found', 'It may have been removed.');
    var reg = st().registrations.indexOf(id) !== -1, open = t.state === 'registration_open' && t.deadline > Date.now();
    var panel = {
      registration_open: 'Registration closes ' + ui.fmtDate(t.deadline) + '.',
      registration_closed: 'Registration is closed. Rooms and brackets are shared with registered players on match day.',
      in_progress: 'Matches are being played. Results are only final once an organizer verifies them.',
      awaiting_verification: 'Results have been reported and are waiting for an organizer to verify them. Nothing is final yet, and no winners are shown.',
      completed: 'This event has finished. Official results are published by organizers; this demo event has none to show.',
      cancelled: 'This event was cancelled by the organizer.',
      disputed: 'A result is being disputed and is under moderator review. No winner is shown until it is resolved.'
    }[t.state];
    return h.pageHead(t.kind === 'casual' ? 'Casual event' : 'Competitive event', '#/arena') +
      '<div class="card stack tournament-hero"><div class="row between wrap">' + ui.stateBadge(t.state, D.STATE_LABELS[t.state]) + ui.gameBadge(t.game) + '</div><h1>' + esc(t.title) + '</h1>' +
      '<div class="row wrap xs muted"><span class="chip">Demo event</span><span class="chip">' + esc(t.mode) + '</span><span class="chip">Team of ' + t.teamSize + '</span><span class="chip">Starts ' + ui.fmtDate(t.startsAt) + '</span></div>' +
      '<p class="small">' + esc(panel) + '</p>' +
      (open ? (reg ? '<button class="btn block" data-act="unregister" data-id="' + id + '">Cancel registration</button>' : '<button class="btn primary block" data-act="register" data-id="' + id + '">Register — free</button>') +
        '<p class="xs muted">Demo registration is saved on this device only. ' + (t.teamSize > 1 ? 'With a live backend you would register with your squad.' : '') + '</p>' : '') +
      (!open && reg ? '<span class="chip pill-ok" style="align-self:flex-start">You registered (demo)</span>' : '') + '</div>' +
      '<div class="section-title"><h2>Rules</h2></div><div class="card"><ol class="small" style="margin:0;padding-left:20px">' + t.rules.map(function (r) { return '<li style="margin:4px 0">' + esc(r) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="section-title"><h2>Eligibility &amp; rewards</h2></div><div class="card stack small"><div><b>Eligibility:</b> ' + esc(t.eligibility) + '</div><div><b>Reward:</b> ' + esc(t.reward) + ' <span class="muted">(virtual item, no cash value)</span></div><div><b>Organizer:</b> ' + esc(t.organizer) + '</div></div>' +
      '<div class="section-title"><h2>Brackets &amp; leaderboard</h2></div>' + ui.notice('', 'Brackets, match reporting, organizer verification and leaderboards are not built yet. They need the backend so that results cannot be forged by players.') +
      '<button class="btn ghost block" style="margin-top:12px" data-act="report" data-type="event" data-id="' + id + '">' + icon('flag') + ' Report this event</button>';
  };
  A.register = function (el) {
    var id = el.dataset.id; if (st().registrations.indexOf(id) === -1) st().registrations.push(id);
    var t = D.TOURNAMENTS.filter(function (x) { return x.id === id; })[0];
    store.notify('Registered for “' + t.title + '” (demo, saved on this device).'); ui.toast('Registered (demo)', 'ok'); RS.app.render();
  };
  A.unregister = function (el) { st().registrations = st().registrations.filter(function (x) { return x !== el.dataset.id; }); store.save(); ui.toast('Registration cancelled'); RS.app.render(); };

  /* ---------- Gamer ID ---------- */
  function customFor(c) {
    var F = D.FREE;
    function pick(list, id) { return list.filter(function (x) { return x.id === id; })[0] || list[0]; }
    return { theme: pick(F.themes, c.theme), banner: pick(F.banners, c.banner), frame: pick(F.frames, c.frame), font: pick(F.fonts, c.font) };
  }
  function idHeader(p, c, publicView) {
    var k = customFor(c), s = st();
    return '<div class="card theme-a" style="padding:0;overflow:hidden;--theme-a:' + k.theme.a + ';--theme-b:' + k.theme.b + ';font-family:' + k.font.css + '">' +
      '<div class="banner" style="background:' + k.banner.css + '"></div><div class="profile-head">' + ui.avatar(p.username || 'you', { size: 'xl', frame: k.frame.id === 'none' ? '' : k.frame.id, theme: k.theme }) + '</div>' +
      '<div style="padding:10px 16px 16px" class="stack"><div><h1>' + esc(p.username || 'you') + '</h1><div class="xs muted">respawn.example/u/' + esc((p.username || 'you').toLowerCase()) + ' · <i>preview, not a live link</i></div></div>' +
      '<div class="row wrap" style="gap:6px">' + (publicView && p.visibility === 'private' ? '<span class="chip pill-warn">Private profile — others see only this much</span>' : '<span class="chip ' + (p.visibility === 'private' ? 'pill-warn' : 'pill-ok') + '">' + (p.visibility === 'private' ? 'Private' : 'Public') + '</span>') +
      (p.lfg ? '<span class="chip pill-info">Looking for group</span>' : '') + '</div>' +
      (p.bio && (!publicView || p.show.bio) ? '<p class="small">' + esc(p.bio) + '</p>' : '') +
      '<div class="row" style="gap:20px"><div><b>0</b> <span class="xs muted">followers</span></div><div><b>' + s.follows.length + '</b> <span class="xs muted">following</span></div></div></div></div>';
  }
  function achievements() {
    var s = st();
    return [
      { name: 'Gamer ID created', ok: s.onboarded, hint: 'Finish setup' },
      { name: 'Multi-gamer', ok: s.profile.games.length >= 2, hint: 'Link 2 games' },
      { name: 'First post', ok: s.myPosts.length >= 1, hint: 'Publish a post' },
      { name: 'Squad seeker', ok: s.invites.length >= 1, hint: 'Send an invite' },
      { name: 'Social spark', ok: s.follows.length >= 3, hint: 'Follow 3 gamers' },
      { name: 'Arena rookie', ok: s.registrations.length >= 1, hint: 'Register for an event' }
    ];
  }

  RS.screens.me = function () {
    var s = st(), p = s.profile, ach = achievements();
    if (!p.show) p.show = { bio: true, rank: true, region: true, languages: true };
    return h.pageHead('My Gamer ID') + idHeader(p, p.custom, false) +
      '<div class="row wrap" style="margin-top:12px"><a class="btn primary grow" href="#/studio">' + icon('palette') + ' Customize</a><button class="btn grow" data-act="edit-profile">Edit profile</button><button class="btn grow" data-act="preview-public">Preview</button></div>' +
      '<div class="section-title"><h2>Linked games</h2><button class="btn sm" data-act="add-game">' + icon('plus') + ' Add</button></div><div class="stack">' + p.games.map(function (e) {
        var g = Games.byId(e.game);
        return '<div class="card stack" style="border-left:3px solid ' + g.color + '"><div class="row between"><b>' + esc(g.name) + (p.mainGame === e.game ? ' <span class="chip">Main</span>' : '') + '</b><button class="btn sm ghost" data-act="edit-game" data-id="' + e.game + '">Edit</button></div>' +
          '<div class="row wrap" style="gap:6px">' + ui.rankBadge(e.rank, e.level) + '<span class="chip">' + esc(e.role) + '</span><span class="chip">' + esc(e.mode) + '</span><span class="chip">' + esc(e.playstyle) + '</span></div>' +
          '<div class="xs muted">' + (e.gameId ? 'In-game ID saved (private)' : 'No in-game ID added') + ' · Source: <b>self-reported</b></div></div>';
      }).join('') + '</div>' +
      '<div class="section-title"><h2>Achievements</h2></div><div class="card"><div class="row wrap">' + ach.map(function (a) {
        return '<span class="chip ' + (a.ok ? 'pill-ok' : '') + '" style="' + (a.ok ? '' : 'opacity:.6') + '" title="' + esc(a.ok ? 'Earned' : a.hint) + '">' + (a.ok ? icon('check').replace('<svg', '<svg width="14" height="14"') : icon('lock').replace('<svg', '<svg width="14" height="14"')) + esc(a.name) + '</span>'; }).join('') + '</div>' +
      '<p class="xs muted" style="margin-top:10px">Calculated by RESPAWN from actions on this device (demo). No coins are awarded.</p></div>' +
      '<div class="section-title"><h2>How stats are labelled</h2></div><div class="card stack small">' +
      '<div class="row"><span class="chip">Self-reported</span><span>Entered by you. Never shown as verified.</span></div>' +
      '<div class="row"><span class="chip pill-info">Platform-calculated</span><span>Earned from activity on RESPAWN.</span></div>' +
      '<div class="row"><span class="chip pill-ok">Organizer-verified</span><span>Tournament results an organizer confirmed. None yet.</span></div>' +
      '<div class="row"><span class="chip pill-warn">Game-confirmed</span><span>Needs an authorized publisher integration. Not available.</span></div></div>' +
      '<div class="section-title"><h2>Tournament &amp; team history</h2></div><div class="card">' + (s.registrations.length ? s.registrations.map(function (id) { var t = D.TOURNAMENTS.filter(function (x) { return x.id === id; })[0]; return '<div class="row between small"><span>' + esc(t.title) + '</span><span class="chip">Registered (demo)</span></div>'; }).join('') : ui.empty('trophy', 'No events yet', 'Register for an ARENA event to start your history.', '<a class="btn" href="#/arena">Browse ARENA</a>')) + '</div>' +
      '<div class="section-title"><h2>Your posts</h2></div>' + (s.myPosts.length ? '<div class="stack">' + s.myPosts.slice(0, 5).map(function (x) { return '<div class="card tight small">' + h.linkify(x.text) + '<div class="xs muted" style="margin-top:4px">' + ui.timeAgo(x.at) + ' ago</div></div>'; }).join('') + '</div>' : ui.empty('home', 'No posts yet', 'Share your first win.', '<button class="btn primary" data-act="compose">Create a post</button>')) +
      '<div class="section-title"><h2>Voice introduction</h2></div>' + ui.notice('', 'Short voice intros need media storage and will never autoplay. Not available yet.');
  };

  A['preview-public'] = function () {
    var p = st().profile; if (!p.show) p.show = { bio: true, rank: true, region: true, languages: true };
    var e = entryFor(p.mainGame);
    ui.sheet('How others see you', idHeader(p, p.custom, true) +
      '<div class="card small stack" style="margin-top:10px">' + (p.show.rank && e ? '<div>' + esc(Games.byId(e.game).name) + ' · ' + esc(e.rank) + ' (self-reported)</div>' : '<div class="muted">Rank hidden</div>') +
      (p.show.region ? '<div>Region: ' + esc(p.region) + '</div>' : '<div class="muted">Region hidden</div>') + (p.show.languages ? '<div>Languages: ' + esc(p.languages.join(', ')) + '</div>' : '<div class="muted">Languages hidden</div>') +
      '<div class="xs muted">Never shown: your age, in-game IDs, exact location, or contact details. Change what’s shared in Settings.</div></div>');
  };

  A['edit-profile'] = function () {
    var p = st().profile;
    ui.sheet('Edit profile', '<div class="stack"><label class="field">Bio<textarea id="ep-bio" maxlength="140">' + esc(p.bio) + '</textarea></label>' +
      '<label class="field">Region<select id="ep-region">' + ui.options(Games.REGIONS, p.region) + '</select></label>' +
      '<label class="field">Microphone<select id="ep-mic">' + ui.options(Games.MIC, p.mic) + '</select></label>' +
      '<div class="field">Languages</div><div class="row wrap" id="ep-langs">' + Games.LANGUAGES.map(function (l) {
        return '<label class="chip btnlike"><input type="checkbox" value="' + esc(l) + '"' + (p.languages.indexOf(l) !== -1 ? ' checked' : '') + ' style="margin-right:6px"> ' + esc(l) + '</label>'; }).join('') + '</div>' +
      '<button class="btn primary block" data-act="edit-profile-save">Save</button></div>');
  };
  A['edit-profile-save'] = function () {
    var p = st().profile, langs = [].slice.call(document.querySelectorAll('#ep-langs input:checked')).map(function (i) { return i.value; });
    if (!langs.length) return ui.toast('Choose at least one language', 'err');
    p.bio = document.getElementById('ep-bio').value.trim().slice(0, 140); p.region = document.getElementById('ep-region').value; p.mic = document.getElementById('ep-mic').value; p.languages = langs;
    store.save(); ui.closeOverlay(); ui.toast('Profile updated', 'ok'); RS.app.render();
  };
  A['add-game'] = function () {
    var have = st().profile.games.map(function (g) { return g.game; }), rest = Games.GAMES.filter(function (g) { return have.indexOf(g.id) === -1; });
    if (!rest.length) return ui.toast('All launch games are already linked');
    ui.sheet('Add a game', '<div class="stack">' + rest.map(function (g) { return '<button class="btn block" data-act="add-game-yes" data-id="' + g.id + '" style="justify-content:flex-start;color:' + g.color + '">' + esc(g.name) + '</button>'; }).join('') + '</div>');
  };
  A['add-game-yes'] = function (el) {
    var g = Games.byId(el.dataset.id);
    st().profile.games.push({ game: g.id, gameId: '', rank: g.ranks[0], level: '', role: g.roles[0], mode: g.modes[0], platform: g.platforms[0], playstyle: 'Both', communication: 'Flexible', slots: ['we-eve'], server: '' });
    store.save(); A['edit-game']({ dataset: { id: g.id } });
  };
  A['edit-game'] = function (el) {
    var e = entryFor(el.dataset.id), g = Games.byId(e.game), p = st().profile;
    ui.sheet('Edit ' + g.name, '<div class="stack"><span class="chip" style="align-self:flex-start">Self-reported</span>' +
      '<div class="grid2"><label class="field">Rank<select id="eg-rank">' + ui.options(g.ranks, e.rank) + '</select></label><label class="field">Level<input type="number" id="eg-level" min="1" max="999" value="' + esc(e.level) + '"></label></div>' +
      '<div class="grid2"><label class="field">Role<select id="eg-role">' + ui.options(g.roles, e.role) + '</select></label><label class="field">Mode<select id="eg-mode">' + ui.options(g.modes, e.mode) + '</select></label></div>' +
      '<div class="grid2"><label class="field">Playstyle<select id="eg-ps">' + ui.options(Games.PLAYSTYLES, e.playstyle) + '</select></label><label class="field">Communication<select id="eg-cm">' + ui.options(Games.COMMUNICATION, e.communication) + '</select></label></div>' +
      '<div class="field">When do you play?</div><div class="row wrap" id="eg-slots">' + Games.SLOTS.map(function (x) { return '<label class="chip btnlike"><input type="checkbox" value="' + x.id + '"' + (e.slots.indexOf(x.id) !== -1 ? ' checked' : '') + ' style="margin-right:6px">' + esc(x.label) + '</label>'; }).join('') + '</div>' +
      '<label class="field">In-game ID (private)<input type="text" id="eg-id" maxlength="30" value="' + esc(e.gameId) + '"></label>' +
      '<button class="btn primary block" data-act="edit-game-save" data-id="' + g.id + '">Save</button>' +
      (p.mainGame !== g.id ? '<button class="btn block" data-act="main-game" data-id="' + g.id + '">Make main game</button>' : '') +
      (p.games.length > 1 ? '<button class="btn ghost danger block" data-act="remove-game" data-id="' + g.id + '">Remove this game</button>' : '') + '</div>');
  };
  A['edit-game-save'] = function (el) {
    var e = entryFor(el.dataset.id), v = function (i) { return document.getElementById(i).value; };
    e.rank = v('eg-rank'); e.level = v('eg-level') ? Math.max(1, Math.min(999, parseInt(v('eg-level'), 10) || 1)) : ''; e.role = v('eg-role'); e.mode = v('eg-mode'); e.playstyle = v('eg-ps'); e.communication = v('eg-cm'); e.gameId = v('eg-id').trim().slice(0, 30);
    e.slots = [].slice.call(document.querySelectorAll('#eg-slots input:checked')).map(function (i) { return i.value; });
    store.save(); S.f = null; ui.closeOverlay(); ui.toast('Game details saved', 'ok'); RS.app.render();
  };
  A['main-game'] = function (el) { st().profile.mainGame = el.dataset.id; store.save(); ui.closeOverlay(); ui.toast('Main game updated'); RS.app.render(); };
  A['remove-game'] = function (el) {
    var p = st().profile; p.games = p.games.filter(function (g) { return g.game !== el.dataset.id; });
    if (p.mainGame === el.dataset.id) p.mainGame = p.games[0].game; S.f = null; store.save(); ui.closeOverlay(); ui.toast('Game removed'); RS.app.render();
  };

  /* ---------- Customization studio ---------- */
  RS.screens.studio = function () {
    var p = st().profile;
    if (!S.studio) { S.studio = JSON.parse(JSON.stringify(p.custom)); S.studioBase = JSON.stringify(p.custom); }
    var c = S.studio, F = D.FREE, dirty = JSON.stringify(c) !== S.studioBase;
    function group(title, key, list, swatch) {
      return '<div class="section-title" style="margin-top:18px"><h3>' + title + '</h3></div><div class="row wrap" role="group" aria-label="' + title + '">' + list.map(function (o) {
        return '<button class="chip btnlike ' + (c[key] === o.id ? 'on' : '') + '" aria-pressed="' + (c[key] === o.id) + '" data-act="studio-pick" data-k="' + key + '" data-v="' + o.id + '">' + (swatch ? '<i style="width:12px;height:12px;border-radius:50%;background:' + swatch(o) + ';display:inline-block"></i>' : '') + esc(o.name) + '</button>'; }).join('') + '</div>';
    }
    return h.pageHead('Customization Studio', '#/me') + idHeader(p, c, false) +
      group('Color theme', 'theme', F.themes, function (o) { return 'linear-gradient(135deg,' + o.a + ',' + o.b + ')'; }) +
      group('Banner', 'banner', F.banners, function (o) { return o.css; }) + group('Profile frame', 'frame', F.frames) + group('Typography', 'font', F.fonts) +
      '<div class="section-title"><h3>Unlockable cosmetics</h3></div><div class="stack">' + D.LOCKED.map(function (l) {
        return '<div class="card tight row" aria-disabled="true" style="opacity:.8">' + icon('lock') + '<div class="grow"><b>' + esc(l.name) + '</b><div class="xs muted">' + esc(l.kind) + ' · ' + l.price + ' coins</div></div><span class="chip">Locked</span></div>'; }).join('') +
      ui.notice('', 'Locked items can’t be unlocked yet: ownership and coin balances are controlled by the server, which isn’t connected. Everything above is free and always available.') + '</div>' +
      '<div class="row" style="position:sticky;bottom:calc(var(--nav-h) + var(--safe-b) + 8px);margin-top:16px;padding:10px;background:rgba(18,21,28,.96);border:1px solid var(--border);border-radius:var(--r-lg)">' +
      '<button class="btn grow" data-act="studio-reset">Reset</button><a class="btn grow" href="#/me">Cancel</a><button class="btn primary grow" data-act="studio-save"' + (dirty ? '' : ' disabled') + '>Save</button></div>';
  };
  A['studio-pick'] = function (el) { S.studio[el.dataset.k] = el.dataset.v; RS.app.render(); };
  A['studio-reset'] = function () { S.studio = { theme: 'violet', banner: 'aurora', frame: 'solid', font: 'clean' }; RS.app.render(); };
  A['studio-save'] = function () { st().profile.custom = JSON.parse(JSON.stringify(S.studio)); store.save(); S.studioBase = JSON.stringify(S.studio); ui.toast('Customization saved', 'ok'); location.hash = '#/me'; };
})(typeof self !== 'undefined' ? self : this);
