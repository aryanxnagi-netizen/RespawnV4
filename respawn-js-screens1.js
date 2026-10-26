/* RESPAWN screens, part 1: shared helpers, welcome/onboarding, Home feed, FRAGZ, report + compose sheets. */
(function (root) {
  'use strict';
  var RS = root.RS, ui = RS.ui, store = RS.store, D = root.RespawnData, Games = root.RespawnGames;
  var esc = ui.esc, icon = ui.icon;
  RS.screens = RS.screens || {}; RS.actions = RS.actions || {};

  /* ---------- shared UI state (never persisted) ---------- */
  var S = RS.S = {
    feedTab: 'foryou', feedCount: 5, open: {}, clipIndex: 0,
    f: null, squadCount: 5, arenaTab: 'all', arenaGame: '', q: '', studio: null, studioBase: null,
    onb: { step: 1, games: [], username: '', bio: '', region: 'North India', languages: ['English'], mic: 'Speaks', entries: {}, error: '' }
  };
  function st() { return store.state; }
  var H = RS.h = {
    st: st,
    me: function () {
      var p = st().profile;
      return { id: 'me', username: p.username || 'you', bio: p.bio, demo: false };
    },
    gamer: function (id) {
      if (id === 'me') return H.me();
      for (var i = 0; i < D.GAMERS.length; i++) if (D.GAMERS[i].id === id) return D.GAMERS[i];
      return null;
    },
    theme: function () {
      var id = st().profile.custom.theme, t = D.FREE.themes[0];
      D.FREE.themes.forEach(function (x) { if (x.id === id) t = x; });
      return t;
    },
    isBlocked: function (id) { return st().blocked.indexOf(id) !== -1; },
    setPath: function (path, value) {
      var parts = path.split('.'), o = S;
      for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
      o[parts[parts.length - 1]] = value;
    },
    getPath: function (path) {
      var o = S, parts = path.split('.');
      for (var i = 0; i < parts.length && o != null; i++) o = o[parts[i]];
      return o;
    },
    pageHead: function (title, back) {
      return '<div class="page-head">' + (back ? '<a class="icon-btn" href="' + esc(back) + '" aria-label="Back">' + icon('back') + '</a>' : '') + '<h1 class="grow">' + esc(title) + '</h1></div>';
    },
    tags: function (text) {
      var out = [], m, re = /#([A-Za-z0-9_]{2,30})/g;
      while ((m = re.exec(text))) { var t = m[1].toLowerCase(); if (out.indexOf(t) === -1) out.push(t); }
      return out;
    },
    linkify: function (text) {
      return esc(text).replace(/#([A-Za-z0-9_]{2,30})/g, function (_, t) { return '<button class="tag" data-act="tag" data-tag="' + t.toLowerCase() + '">#' + t + '</button>'; });
    }
  };
  var h = H;

  /* ---------- Welcome + onboarding ---------- */
  RS.screens.welcome = function () {
    var o = S.onb, step = o.step, body = '';
    var dots = '<div class="row" style="justify-content:center;margin:8px 0 18px">' + [1, 2, 3, 4].map(function (i) {
      return '<span style="width:' + (i === step ? 26 : 8) + 'px;height:8px;border-radius:4px;background:' + (i <= step ? 'var(--accent-2)' : 'var(--surface-3)') + '"></span>';
    }).join('') + '</div>';

    if (step === 1) {
      body = '<div style="text-align:center;padding:24px 0 8px"><div class="logo" style="width:72px;height:72px;font-size:34px;margin:0 auto 16px;border-radius:22px">R</div>' +
        '<h1 style="font-size:32px;letter-spacing:.1em">RESPAWN</h1><p class="muted" style="margin-top:6px">Find Your Squad. Build Your Legacy.</p></div>' +
        '<div class="card stack" style="margin-top:20px"><div class="row">' + icon('users') + '<div><b>Squad Finder</b><p class="small muted">Teammates ranked by a transparent, explainable score.</p></div></div>' +
        '<div class="row">' + icon('id') + '<div><b>Gamer ID</b><p class="small muted">Your own gaming portfolio, customised your way.</p></div></div>' +
        '<div class="row">' + icon('trophy') + '<div><b>ARENA</b><p class="small muted">Free community events and tournaments.</p></div></div></div>' +
        '<div class="card" style="margin-top:12px"><div class="row">' + icon('shield') + '<div class="small"><b>Privacy first.</b> We never ask for your real name, birth date, phone number or exact location. Your profile starts private.</div></div></div>' +
        '<div class="stack" style="margin-top:16px">' +
        ui.notice('demo', '<b>Accounts are not set up yet.</b> Sign-up, login and password reset need a backend that has not been connected. Until then RESPAWN runs in <b>demo mode</b>: everything is saved only on this device.') +
        '<button class="btn primary block" data-act="onb-next">Start in demo mode</button></div>';
    } else if (step === 2) {
      body = '<h1>Pick your games</h1><p class="muted small" style="margin:4px 0 14px">Choose at least one. You can add more later. These are community categories — not official game integrations.</p>' +
        '<div class="grid2">' + Games.GAMES.map(function (g) {
          var on = o.games.indexOf(g.id) !== -1;
          return '<button class="card tight" style="text-align:left;cursor:pointer;border-color:' + (on ? g.color : 'var(--border)') + ';' + (on ? 'box-shadow:0 0 0 1px ' + g.color : '') + '" aria-pressed="' + on + '" data-act="tog" data-path="onb.games" data-v="' + g.id + '"><b style="color:' + g.color + '">' + esc(g.name) + '</b><div class="xs muted">' + (on ? 'Selected' : 'Tap to select') + '</div></button>';
        }).join('') + '</div>' + (o.error ? '<p class="small" style="color:var(--danger);margin-top:10px" role="alert">' + esc(o.error) + '</p>' : '') +
        '<div class="row" style="margin-top:18px"><button class="btn" data-act="onb-back">Back</button><button class="btn primary grow" data-act="onb-next">Continue</button></div>';
    } else if (step === 3) {
      body = '<h1>Your gamer profile</h1><p class="muted small" style="margin:4px 0 14px">Use a gamer name — not your real name.</p><div class="stack">' +
        '<label class="field">Username<input type="text" data-bind="onb.username" value="' + esc(o.username) + '" maxlength="20" autocapitalize="off" autocomplete="off" placeholder="e.g. NightFalcon" aria-describedby="uhint"></label><div id="uhint" class="xs muted" style="margin-top:-6px">3–20 letters, numbers or underscores.</div>' +
        '<label class="field">Short bio (optional)<textarea data-bind="onb.bio" maxlength="140" placeholder="Playstyle, goals, what you want in a squad">' + esc(o.bio) + '</textarea></label>' +
        '<label class="field">Region (broad area only)<select data-bind="onb.region">' + ui.options(Games.REGIONS, o.region) + '</select></label>' +
        '<div class="field">Languages</div><div class="row wrap" style="margin-top:-6px">' + Games.LANGUAGES.map(function (l) {
          return '<button class="chip btnlike ' + (o.languages.indexOf(l) !== -1 ? 'on' : '') + '" aria-pressed="' + (o.languages.indexOf(l) !== -1) + '" data-act="tog" data-path="onb.languages" data-v="' + esc(l) + '">' + esc(l) + '</button>';
        }).join('') + '</div>' +
        '<label class="field">Microphone<select data-bind="onb.mic">' + ui.options(Games.MIC, o.mic) + '</select></label>' +
        (o.error ? '<p class="small" style="color:var(--danger)" role="alert">' + esc(o.error) + '</p>' : '') +
        '</div><div class="row" style="margin-top:18px"><button class="btn" data-act="onb-back">Back</button><button class="btn primary grow" data-act="onb-next">Continue</button></div>';
    } else {
      body = '<h1>Set up your games</h1><p class="muted small" style="margin:4px 0 14px">Ranks are <b>self-reported</b> and shown as such. In-game IDs are optional and stay private unless you choose to share them.</p><div class="stack">' +
        o.games.map(function (gid) {
          var g = Games.byId(gid), e = o.entries[gid] || (o.entries[gid] = { rank: g.ranks[0], level: '', role: g.roles[0], mode: g.modes[0], platform: g.platforms[0], playstyle: 'Both', communication: 'Flexible', slots: ['we-eve'], gameId: '' });
          return '<div class="card stack"><div class="row between"><b style="color:' + g.color + '">' + esc(g.name) + '</b><span class="chip">Self-reported</span></div>' +
            '<div class="grid2"><label class="field">Rank<select data-bind="onb.entries.' + gid + '.rank">' + ui.options(g.ranks, e.rank) + '</select></label>' +
            '<label class="field">Level<input type="number" min="1" max="999" data-bind="onb.entries.' + gid + '.level" value="' + esc(e.level) + '" inputmode="numeric" placeholder="optional"></label></div>' +
            '<div class="grid2"><label class="field">Role<select data-bind="onb.entries.' + gid + '.role">' + ui.options(g.roles, e.role) + '</select></label>' +
            '<label class="field">Mode<select data-bind="onb.entries.' + gid + '.mode">' + ui.options(g.modes, e.mode) + '</select></label></div>' +
            '<div class="grid2"><label class="field">Platform<select data-bind="onb.entries.' + gid + '.platform">' + ui.options(g.platforms, e.platform) + '</select></label>' +
            '<label class="field">Playstyle<select data-bind="onb.entries.' + gid + '.playstyle">' + ui.options(Games.PLAYSTYLES, e.playstyle) + '</select></label></div>' +
            '<label class="field">Communication<select data-bind="onb.entries.' + gid + '.communication">' + ui.options(Games.COMMUNICATION, e.communication) + '</select></label>' +
            '<div class="field">When do you play?</div><div class="row wrap" style="margin-top:-6px">' + Games.SLOTS.map(function (s) {
              var on = e.slots.indexOf(s.id) !== -1;
              return '<button class="chip btnlike ' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-act="tog" data-path="onb.entries.' + gid + '.slots" data-v="' + s.id + '">' + esc(s.label) + '</button>';
            }).join('') + '</div>' +
            '<label class="field">In-game ID (optional, private)<input type="text" data-bind="onb.entries.' + gid + '.gameId" value="' + esc(e.gameId) + '" maxlength="30" autocomplete="off"></label></div>';
        }).join('') + (o.error ? '<p class="small" style="color:var(--danger)" role="alert">' + esc(o.error) + '</p>' : '') +
        '</div><div class="row" style="margin-top:18px"><button class="btn" data-act="onb-back">Back</button><button class="btn primary grow" data-act="onb-next">Finish setup</button></div>';
    }
    return '<div style="max-width:560px;margin:0 auto;padding:calc(var(--safe-t) + 18px) 18px 40px">' + dots + body + '</div>';
  };

  RS.actions['onb-back'] = function () { S.onb.step = Math.max(1, S.onb.step - 1); S.onb.error = ''; RS.app.render(); };
  RS.actions['onb-next'] = function () {
    var o = S.onb; o.error = '';
    if (o.step === 2 && o.games.length < 1) { o.error = 'Pick at least one game to continue.'; return RS.app.render(); }
    if (o.step === 3) {
      var u = (o.username || '').trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) { o.error = 'Usernames are 3–20 characters: letters, numbers or underscores.'; return RS.app.render(); }
      if (D.GAMERS.some(function (g) { return g.username.toLowerCase() === u.toLowerCase(); })) { o.error = 'That username is taken in the demo. Try another.'; return RS.app.render(); }
      if (o.languages.length < 1) { o.error = 'Choose at least one language.'; return RS.app.render(); }
      o.username = u;
    }
    if (o.step === 4) {
      var p = st().profile;
      p.username = o.username; p.displayName = o.username; p.bio = (o.bio || '').trim().slice(0, 140);
      p.region = o.region; p.languages = o.languages.slice(); p.mic = o.mic; p.visibility = 'private'; p.lfg = true;
      p.games = o.games.map(function (gid) {
        var e = o.entries[gid];
        return { game: gid, gameId: (e.gameId || '').trim().slice(0, 30), rank: e.rank, level: e.level ? Math.max(1, Math.min(999, parseInt(e.level, 10) || 1)) : '', role: e.role, mode: e.mode, platform: e.platform, playstyle: e.playstyle, communication: e.communication, slots: e.slots.slice(), server: '' };
      });
      p.mainGame = o.games[0];
      st().onboarded = true; store.save();
      store.notify('Welcome to RESPAWN, ' + p.username + '! Your profile is private by default.');
      ui.toast('Profile created on this device', 'ok');
      location.hash = '#/home'; return;
    }
    o.step += 1; RS.app.render(); window.scrollTo(0, 0);
  };

  /* ---------- Home feed ---------- */
  function feedItems() {
    var s = st(), mine = s.myPosts.map(function (p) { return p; });
    var all = mine.concat(D.POSTS).filter(function (p) {
      return !h.isBlocked(p.authorId) && s.reports.every(function (r) { return !(r.targetType === 'post' && r.targetId === p.id); });
    });
    if (S.feedTab === 'following') all = all.filter(function (p) { return p.authorId === 'me' || s.follows.indexOf(p.authorId) !== -1; });
    return all;
  }

  // hashtags stored with a post but not already written inline in its text
  function extraTags(p) {
    var inline = h.tags(p.text), rest = (p.tags || []).filter(function (t) { return inline.indexOf(t) === -1; });
    if (!rest.length) return '';
    return '<div class="row wrap" style="gap:10px">' + rest.map(function (t) { return '<button class="tag" data-act="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</button>'; }).join('') + '</div>';
  }

  function postCard(p) {
    var s = st(), a = h.gamer(p.authorId) || { username: 'unknown' }, g = Games.byId(p.game), liked = s.likes.indexOf(p.id) !== -1, saved = s.saved.indexOf(p.id) !== -1;
    var comments = s.comments[p.id] || [], mineP = p.authorId === 'me', following = s.follows.indexOf(p.authorId) !== -1;
    var label = { victory: 'Victory moment', screenshot: 'Screenshot', achievement: 'Achievement', announcement: 'Team announcement', tournament: 'Tournament update', text: '' }[p.type] || '';
    var media = (p.type === 'victory' || p.type === 'screenshot' || p.type === 'achievement') ?
      '<div class="post-media" style="--c:' + (g ? g.color : '#7c5cff') + '" role="img" aria-label="Demo image placeholder">Demo ' + esc(label.toLowerCase()) + ' — no image file</div>' : '';
    return '<article class="card stack" id="post-' + esc(p.id) + '">' +
      '<div class="row">' + '<a href="#/player/' + esc(p.authorId) + '" class="row grow" style="text-decoration:none;color:inherit;min-width:0">' + ui.avatar(a.username, { size: 'sm' }) +
      '<div class="grow" style="min-width:0"><b>' + esc(a.username) + '</b><div class="xs muted">' + (p.at ? ui.timeAgo(p.at) : esc(p.ago) + ' ago') + (label ? ' · ' + esc(label) : '') + '</div></div></a>' +
      ui.gameBadge(p.game) +
      (mineP ? '' : '<button class="btn sm ' + (following ? '' : 'primary') + '" data-act="follow" data-id="' + esc(p.authorId) + '" aria-pressed="' + following + '">' + (following ? 'Following' : 'Follow') + '</button>') + '</div>' +
      '<p>' + h.linkify(p.text) + '</p>' + extraTags(p) + media +
      '<div class="actions">' +
      '<button class="act like" data-act="like" data-id="' + esc(p.id) + '" aria-pressed="' + liked + '" aria-label="' + (liked ? 'Unlike' : 'Like') + '">' + icon('heart') + (liked ? 1 : 0) + '</button>' +
      '<button class="act" data-act="comments" data-id="' + esc(p.id) + '" aria-expanded="' + !!S.open[p.id] + '" aria-label="Comments">' + icon('comment') + comments.length + '</button>' +
      '<button class="act save" data-act="save" data-id="' + esc(p.id) + '" aria-pressed="' + saved + '" aria-label="' + (saved ? 'Remove bookmark' : 'Bookmark') + '">' + icon('bookmark') + '</button>' +
      '<button class="act" data-act="share" data-id="' + esc(p.id) + '" aria-label="Copy link">' + icon('share') + '</button>' +
      '<span class="grow"></span>' +
      (mineP ? '<button class="act" data-act="del-post" data-id="' + esc(p.id) + '" aria-label="Delete post">' + icon('trash') + '</button>'
             : '<button class="act" data-act="report" data-type="post" data-id="' + esc(p.id) + '" aria-label="Report post">' + icon('flag') + '</button>') + '</div>' +
      (S.open[p.id] ? '<div class="stack">' + comments.map(function (c) { return '<div class="comment"><b>' + esc(st().profile.username) + '</b> ' + esc(c.text) + ' <span class="xs muted">· ' + ui.timeAgo(c.at) + '</span></div>'; }).join('') +
        '<div class="row"><input type="text" id="cmt-' + esc(p.id) + '" maxlength="200" placeholder="Add a comment (kind words only)" aria-label="Add a comment"><button class="btn sm primary" data-act="comment" data-id="' + esc(p.id) + '">Post</button></div></div>' : '') +
      '</article>';
  }

  RS.screens.home = function () {
    var s = st(), items = feedItems(), shown = items.slice(0, S.feedCount);
    var recos = D.GAMERS.filter(function (u) { return !h.isBlocked(u.id) && s.follows.indexOf(u.id) === -1; }).slice(0, 6);
    var html = '<div class="seg" role="group" aria-label="Feed filter"><button aria-pressed="' + (S.feedTab === 'foryou') + '" data-act="feedtab" data-v="foryou">For You</button><button aria-pressed="' + (S.feedTab === 'following') + '" data-act="feedtab" data-v="following">Following</button></div>' +
      '<div class="stack" style="margin-top:14px">' + ui.demoNotice('Sample posts from invented gamers. Likes and comments you add are saved only on this device, and counters start at zero.') +
      '<button class="card tight row" style="width:100%;cursor:pointer;text-align:left" data-act="compose">' + ui.avatar(s.profile.username, { size: 'sm' }) + '<span class="muted grow">Share a clip idea, win or LFG post…</span>' + icon('plus') + '</button>';
    if (!shown.length) {
      html += S.feedTab === 'following'
        ? ui.empty('users', 'Nothing here yet', 'Follow a few gamers to fill this feed.', '<button class="btn primary" data-act="feedtab" data-v="foryou">Browse For You</button>')
        : ui.empty('home', 'No posts to show', 'Be the first to post.', '<button class="btn primary" data-act="compose">Create a post</button>');
    }
    shown.forEach(function (p, i) {
      html += postCard(p);
      if (i === 1 && S.feedTab === 'foryou' && recos.length) {
        html += '<section aria-label="Recommended gamers"><div class="row between"><h3>Recommended gamers</h3><a class="small" href="#/squad">Open Squad Finder</a></div><div class="hscroll" style="margin-top:8px">' +
          recos.map(function (u) { return '<div class="card tight col" style="min-width:150px;align-items:flex-start"><a href="#/player/' + u.id + '" style="text-decoration:none;color:inherit" class="row">' + ui.avatar(u.username, { size: 'sm' }) + '<b class="small">' + esc(u.username) + '</b></a>' + ui.gameBadge(u.game) +
            '<button class="btn sm primary block" data-act="follow" data-id="' + u.id + '">Follow</button></div>'; }).join('') + '</div></section>';
      }
    });
    if (items.length > shown.length) html += '<button class="btn block" data-act="more-feed">Load more (' + (items.length - shown.length) + ')</button>';
    return html + '</div>';
  };

  var A = RS.actions;
  A.feedtab = function (el) { S.feedTab = el.dataset.v; S.feedCount = 5; RS.app.render(); };
  A['more-feed'] = function () { S.feedCount += 5; RS.app.render(); };
  A.like = function (el) { var on = store.toggle('likes', el.dataset.id); RS.app.render(); if (on) ui.toast('Liked (saved on this device)'); };
  A.save = function (el) { var on = store.toggle('saved', el.dataset.id); ui.toast(on ? 'Bookmarked' : 'Bookmark removed'); RS.app.render(); };
  A.comments = function (el) { S.open[el.dataset.id] = !S.open[el.dataset.id]; RS.app.render(); };
  A.comment = function (el) {
    var inp = document.getElementById('cmt-' + el.dataset.id), t = inp ? inp.value.trim() : '';
    if (!t) return ui.toast('Write something first', 'err');
    var list = st().comments[el.dataset.id] || (st().comments[el.dataset.id] = []);
    list.push({ id: store.uid('c'), text: t.slice(0, 200), at: Date.now() }); store.save(); RS.app.render();
  };
  A.follow = function (el) {
    var id = el.dataset.id, on = store.toggle('follows', id), u = h.gamer(id);
    ui.toast(on ? 'Following ' + (u ? u.username : '') : 'Unfollowed'); RS.app.render();
  };
  A.share = function (el) {
    var link = location.href.split('#')[0] + '#/post/' + el.dataset.id;
    ui.copyText(link).then(function (ok) { ui.toast(ok ? 'Link copied' : 'Could not copy — copy it manually: ' + link, ok ? 'ok' : 'err'); });
  };
  A.tag = function (el) { S.q = '#' + el.dataset.tag; location.hash = '#/search'; };
  A['del-post'] = function (el) {
    ui.sheet('Delete this post?', '<p class="muted small">This removes it from this device. This cannot be undone.</p><div class="row" style="margin-top:14px"><button class="btn grow" data-act="close">Keep</button><button class="btn danger grow" data-act="del-post-yes" data-id="' + esc(el.dataset.id) + '">Delete</button></div>');
  };
  A['del-post-yes'] = function (el) {
    var s = st(); s.myPosts = s.myPosts.filter(function (p) { return p.id !== el.dataset.id; }); store.save(); ui.closeOverlay(); ui.toast('Post deleted', 'ok'); RS.app.render();
  };

  /* compose */
  A.compose = function () {
    var s = st(), mine = s.profile.games.map(function (g) { return g.game; });
    var gl = Games.GAMES.filter(function (g) { return mine.indexOf(g.id) !== -1 || !mine.length; });
    ui.sheet('New post', '<div class="stack"><label class="field">What’s happening?<textarea id="cmp-text" maxlength="280" autofocus placeholder="Add hashtags like #clutch or #lfg" data-act-input="count"></textarea></label><div class="xs muted" id="cmp-count">0 / 280</div>' +
      '<label class="field">Game<select id="cmp-game">' + ui.options(gl.map(function (g) { return { id: g.id, label: g.name }; }), s.profile.mainGame) + '</select></label>' +
      '<div class="notice">' + icon('upload') + '<div class="small">Image and video uploads need media storage, which is not connected yet — so this composer is text-only for now.</div></div>' +
      '<button class="btn primary block" data-act="post-submit">Post</button></div>');
  };
  A['post-submit'] = function () {
    var t = (document.getElementById('cmp-text').value || '').trim(), game = document.getElementById('cmp-game').value;
    if (!t) return ui.toast('Write something before posting', 'err');
    if (t.length > 280) return ui.toast('Posts are limited to 280 characters', 'err');
    var s = st();
    s.myPosts.unshift({ id: store.uid('m'), authorId: 'me', type: 'text', game: game, text: t, tags: h.tags(t), at: Date.now() }); store.save();
    ui.closeOverlay(); ui.toast('Posted (saved on this device)', 'ok'); S.feedTab = 'foryou'; if (location.hash !== '#/home') location.hash = '#/home'; else RS.app.render();
  };

  /* report + block */
  var CATS = ['Spam', 'Bullying or harassment', 'Not suitable for young players', 'Cheating, hacks or scams', 'Pretending to be someone else', 'Sharing personal information', 'Something else'];
  A.report = function (el) {
    var type = el.dataset.type, id = el.dataset.id;
    ui.sheet('Report ' + type, '<p class="small muted" style="margin-bottom:10px">Tell us what’s wrong. Reports about safety matter most.</p><div class="stack" role="radiogroup" aria-label="Reason">' +
      CATS.map(function (c, i) { return '<label class="toggle card tight"><span>' + esc(c) + '</span><input type="radio" name="rcat" value="' + esc(c) + '"' + (i === 0 ? ' checked' : '') + '></label>'; }).join('') +
      '</div>' + ui.notice('demo', 'Demo mode: this report is saved on your device and the content is hidden for you. No moderator receives it until the backend and admin tools are connected.') +
      '<button class="btn primary block" style="margin-top:12px" data-act="report-submit" data-type="' + esc(type) + '" data-id="' + esc(id) + '">Submit report</button>');
  };
  A['report-submit'] = function (el) {
    var c = document.querySelector('input[name=rcat]:checked'), s = st();
    s.reports.push({ id: store.uid('r'), targetType: el.dataset.type, targetId: el.dataset.id, category: c ? c.value : 'Something else', at: Date.now() }); store.save();
    ui.closeOverlay(); ui.toast('Report saved on this device. Content hidden for you.', 'ok'); RS.app.render();
  };
  A.block = function (el) {
    var u = h.gamer(el.dataset.id);
    ui.sheet('Block ' + (u ? u.username : 'this player') + '?', '<p class="small muted">They’ll disappear from your feed, Squad Finder results and invites. You can unblock anyone in Settings.</p><div class="row" style="margin-top:14px"><button class="btn grow" data-act="close">Cancel</button><button class="btn danger grow" data-act="block-yes" data-id="' + esc(el.dataset.id) + '">Block</button></div>');
  };
  A['block-yes'] = function (el) {
    var s = st(), id = el.dataset.id;
    if (s.blocked.indexOf(id) === -1) s.blocked.push(id);
    s.follows = s.follows.filter(function (x) { return x !== id; });
    s.invites = s.invites.filter(function (i) { return i.candidateId !== id; });
    store.save(); ui.closeOverlay(); ui.toast('Blocked', 'ok'); location.hash = '#/home'; RS.app.render();
  };

  /* ---------- FRAGZ ---------- */
  RS.screens.fragz = function () {
    var s = st(), clips = D.CLIPS.filter(function (c) { return !h.isBlocked(c.authorId) && s.reports.every(function (r) { return !(r.targetType === 'clip' && r.targetId === c.id); }); });
    if (!clips.length) return ui.empty('play', 'No clips right now', 'Check back soon or upload your own once storage is connected.');
    return '<div class="fragz" id="fragz" aria-label="FRAGZ vertical clips">' + clips.map(function (c) {
      var a = h.gamer(c.authorId), g = Games.byId(c.game), liked = s.clipLikes.indexOf(c.id) !== -1, saved = s.clipSaved.indexOf(c.id) !== -1;
      return '<section class="clip" style="--c:' + g.color + '" aria-label="Demo clip by ' + esc(a.username) + '"><div class="clip-bg"></div>' +
        '<div class="clip-label"><span class="chip pill-warn">DEMO CLIP · no video file</span>' + ui.gameBadge(c.game) + '</div>' +
        '<div class="clip-side">' +
        '<a href="#/player/' + esc(a.id) + '" class="act" aria-label="Open ' + esc(a.username) + ' profile">' + ui.avatar(a.username, { size: 'sm' }) + '</a>' +
        '<button class="act like" data-act="clip-like" data-id="' + c.id + '" aria-pressed="' + liked + '" aria-label="Like clip">' + icon('heart') + (liked ? 1 : 0) + '</button>' +
        '<button class="act" data-act="clip-save" data-id="' + c.id + '" aria-pressed="' + saved + '" aria-label="Bookmark clip">' + icon('bookmark') + '</button>' +
        '<button class="act" data-act="clip-share" data-id="' + c.id + '" aria-label="Copy clip link">' + icon('share') + '</button>' +
        '<button class="act" data-act="report" data-type="clip" data-id="' + c.id + '" aria-label="Report clip">' + icon('flag') + '</button></div>' +
        '<div class="clip-info"><b>@' + esc(a.username) + '</b> <span class="xs muted">· ' + esc(c.length) + '</span><p style="margin:2px 0 4px">' + esc(c.caption) + '</p><div class="row wrap">' +
        c.tags.map(function (t) { return '<button class="tag" data-act="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</button>'; }).join('') + '</div></div></section>';
    }).join('') + '</div>' +
      '<button class="btn primary" style="position:fixed;right:14px;top:calc(var(--bar-h) + var(--safe-t) + 54px);z-index:20" data-act="clip-upload">' + icon('upload') + ' Upload</button>';
  };
  A['clip-like'] = function (el) { store.toggle('clipLikes', el.dataset.id); RS.app.render(); };
  A['clip-save'] = function (el) { var on = store.toggle('clipSaved', el.dataset.id); ui.toast(on ? 'Bookmarked' : 'Bookmark removed'); RS.app.render(); };
  A['clip-share'] = function (el) {
    ui.copyText(location.href.split('#')[0] + '#/clip/' + el.dataset.id).then(function (ok) { ui.toast(ok ? 'Link copied' : 'Could not copy', ok ? 'ok' : 'err'); });
  };

  var MAX_MB = 50, OK_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  A['clip-upload'] = function () {
    ui.sheet('Upload a clip', '<div class="stack"><p class="small muted">Vertical clips up to ' + MAX_MB + ' MB (MP4, WebM or MOV).</p>' +
      '<label class="field">Choose a video<input type="file" id="clip-file" accept="video/mp4,video/webm,video/quicktime" data-act-change="clip-file"></label>' +
      '<div id="clip-result" aria-live="polite"></div>' +
      ui.notice('demo', '<b>Video storage is not connected.</b> Files are checked here, but nothing is ever uploaded, and RESPAWN will not say a clip was published until real storage confirms it.') + '</div>');
  };
  A['clip-file'] = function (el) {
    var f = el.files && el.files[0], out = document.getElementById('clip-result'); if (!out) return;
    if (!f) { out.innerHTML = ''; return; }
    var mb = f.size / 1048576;
    if (OK_TYPES.indexOf(f.type) === -1) out.innerHTML = ui.notice('err', '<b>Unsupported file type.</b> Choose an MP4, WebM or MOV video.');
    else if (f.size > MAX_MB * 1048576) out.innerHTML = ui.notice('err', '<b>Too large</b> (' + mb.toFixed(1) + ' MB). The limit is ' + MAX_MB + ' MB.');
    else out.innerHTML = ui.notice('', '<b>' + esc(f.name) + '</b> (' + mb.toFixed(1) + ' MB) passed the file checks, but <b>was not uploaded</b> — storage is not configured yet.');
  };
})(typeof self !== 'undefined' ? self : this);
