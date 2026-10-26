/*
 * RESPAWN local demo store.
 * Everything here lives ONLY on this device (localStorage, with an in-memory
 * fallback when storage is blocked). It is NOT an account system and NOT a
 * backend. Coin balances are intentionally absent: they must be server-owned.
 */
(function (root) {
  'use strict';
  var KEY = 'respawn.demo.v1';
  var memory = null;

  function fresh() {
    return {
      onboarded: false,
      profile: {
        username: '', displayName: '', bio: '', region: 'North India', languages: ['English'],
        mic: 'Speaks', lfg: true, visibility: 'private', mainGame: null,
        show: { bio: true, rank: true, region: true, languages: true },
        games: [], // {game, gameId, rank, level, role, mode, platform, playstyle, communication, slots, server}
        custom: { theme: 'mono', banner: 'slate', frame: 'solid', font: 'clean' }
      },
      follows: [], likes: [], saved: [], comments: {}, myPosts: [], reports: [], blocked: [],
      invites: [], notifications: [], registrations: [], squadPrefs: null, weights: null, chats: {},
      clipLikes: [], clipSaved: []
    };
  }

  function load() {
    try {
      var raw = root.localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw), base = fresh();
        for (var k in parsed) base[k] = parsed[k];
        base.profile = Object.assign(fresh().profile, parsed.profile || {});
        return base;
      }
    } catch (e) { /* storage blocked or corrupt: fall through to fresh state */ }
    return memory || fresh();
  }

  var state = load();
  var persisted = true;

  function save() {
    memory = state;
    try { root.localStorage.setItem(KEY, JSON.stringify(state)); persisted = true; }
    catch (e) { persisted = false; }
  }

  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function toggle(listName, id) {
    var list = state[listName], i = list.indexOf(id);
    if (i === -1) list.push(id); else list.splice(i, 1);
    save();
    return i === -1;
  }

  function notify(text) {
    state.notifications.unshift({ id: uid('n'), text: text, at: Date.now(), read: false });
    state.notifications = state.notifications.slice(0, 50);
    save();
  }

  function reset() { state = fresh(); memory = null; try { root.localStorage.removeItem(KEY); } catch (e) {} }

  root.RS = root.RS || {};
  root.RS.store = {
    get state() { return state; },
    get persisted() { return persisted; },
    save: save, toggle: toggle, notify: notify, reset: reset, uid: uid,
    unread: function () { return state.notifications.filter(function (n) { return !n.read; }).length; }
  };
})(typeof self !== 'undefined' ? self : this);
