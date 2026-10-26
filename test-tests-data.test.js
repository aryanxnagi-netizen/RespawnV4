'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/data.js');
const G = require('../js/games.js');
const M = require('../js/matching.js');

test('every sample gamer uses valid catalog values', () => {
  D.GAMERS.forEach((u) => {
    const game = G.byId(u.game);
    assert.ok(game, u.username + ' game');
    assert.ok(game.ranks.includes(u.rank), u.username + ' rank ' + u.rank);
    assert.ok(game.modes.includes(u.mode), u.username + ' mode ' + u.mode);
    assert.ok(game.roles.includes(u.role), u.username + ' role ' + u.role);
    assert.ok(game.platforms.includes(u.platform), u.username + ' platform');
    u.languages.forEach((l) => assert.ok(G.LANGUAGES.includes(l), u.username + ' lang ' + l));
    assert.ok(G.REGIONS.includes(u.region), u.username + ' region');
    assert.ok(G.PLAYSTYLES.includes(u.playstyle), u.username + ' playstyle');
    assert.ok(G.COMMUNICATION.includes(u.communication), u.username + ' comms');
    assert.ok(G.MIC.includes(u.mic), u.username + ' mic');
    u.slots.forEach((s) => assert.ok(G.SLOTS.some((x) => x.id === s), u.username + ' slot ' + s));
  });
});

test('sample usernames and ids are unique', () => {
  const ids = D.GAMERS.map((u) => u.id), names = D.GAMERS.map((u) => u.username.toLowerCase());
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(names).size, names.length);
});

test('posts, clips and tournaments reference real sample gamers and games', () => {
  const ids = new Set(D.GAMERS.map((u) => u.id));
  D.POSTS.forEach((p) => { assert.ok(ids.has(p.authorId)); assert.ok(G.byId(p.game)); });
  D.CLIPS.forEach((c) => { assert.ok(ids.has(c.authorId)); assert.ok(G.byId(c.game)); });
  D.TOURNAMENTS.forEach((t) => { assert.ok(G.byId(t.game)); assert.ok(D.STATE_LABELS[t.state], t.state); assert.ok(G.byId(t.game).modes.includes(t.mode), t.title); });
});

test('tournaments cover every required result state', () => {
  const need = ['registration_open', 'registration_closed', 'in_progress', 'awaiting_verification', 'completed', 'cancelled', 'disputed'];
  need.forEach((s) => assert.ok(D.TOURNAMENTS.some((t) => t.state === s), s));
});

test('demo engagement starts at zero (nothing is inflated)', () => {
  D.POSTS.forEach((p) => { assert.equal(p.likes, undefined); assert.equal(p.views, undefined); });
});

test('end-to-end: varied sample profiles rank sensibly for a BGMI seeker', () => {
  const me = { id: 'me', game: 'bgmi', mode: 'Classic', rank: 'Platinum', role: 'IGL', languages: ['Hindi', 'English'],
    region: 'North India', server: 'Asia', platform: 'Mobile', playstyle: 'Competitive', communication: 'Tactical',
    mic: 'Speaks', slots: ['wd-eve', 'we-eve'], blockedIds: [] };
  const out = M.rankCandidates(me, D.GAMERS);
  const names = out.results.map((r) => r.candidate.username);
  assert.equal(out.total, 5, 'five eligible BGMI players');
  assert.equal(names[0], 'NovaStrike', 'best fit first');
  // PixelRaj: different mode + no shared play times + different playstyle => lowest of the eligible five
  assert.equal(names[names.length - 1], 'PixelRaj', 'worst fit last');
  assert.deepEqual(out.results.map((r) => r.score), [100, 83, 78, 68, 66]);
  assert.ok(out.results[4].caveats.includes('no overlapping play times'));
  assert.ok(!names.includes('GhostGuru') && !names.includes('DeepDive'));
  assert.ok(out.excluded.some((e) => e.candidate.username === 'LunaLoot' && e.reason === 'Different game'));
  out.results.forEach((r) => assert.ok(r.score >= 0 && r.score <= 100));
});
