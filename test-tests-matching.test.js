'use strict';
// Run with:  node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/matching.js');
const G = require('../js/games.js');

const me = {
  id: 'me', username: 'me', game: 'bgmi', mode: 'Classic', rank: 'Platinum', role: 'IGL',
  languages: ['Hindi', 'English'], region: 'North India', server: 'Asia', platform: 'Mobile',
  playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks',
  slots: ['wd-eve', 'we-eve'], blockedIds: []
};
function cand(over) {
  return Object.assign({
    id: 'c', username: 'cand', game: 'bgmi', mode: 'Classic', rank: 'Platinum', role: 'Sniper',
    languages: ['Hindi', 'English'], region: 'North India', server: 'Asia', platform: 'Mobile',
    playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks',
    slots: ['wd-eve', 'we-eve'], lfg: true, acceptsInvites: true, blockedIds: []
  }, over || {});
}

test('default weights total exactly 100 and match the spec', () => {
  const w = M.DEFAULT_WEIGHTS;
  assert.equal(Object.values(w).reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(w, { game: 25, rank: 20, role: 15, language: 10, region: 10, availability: 10, playstyle: 10 });
  assert.ok(M.validateWeights(w));
});

test('invalid weights are rejected', () => {
  assert.throws(() => M.validateWeights({ game: 50, rank: 20, role: 15, language: 10, region: 10, availability: 10, playstyle: 10 }), /total 100/);
  assert.throws(() => M.validateWeights({ game: 25, rank: 20, role: 15, language: 10, region: 10, availability: 10 }), /Invalid weight/);
  assert.throws(() => M.validateWeights({ game: -5, rank: 45, role: 15, language: 10, region: 10, availability: 10, playstyle: 15 }), /Invalid weight/);
});

test('a strong match scores very high with a clear explanation', () => {
  const r = M.scoreCandidate(me, cand());
  assert.ok(r.score >= 95, 'score was ' + r.score);
  assert.match(r.explanation, /^\d+% compatibility — .+\.$/);
  assert.ok(r.reasons.length > 0 && r.reasons.length <= 4);
  assert.equal(r.components.length, 7);
  const sum = r.components.reduce((a, c) => a + c.points, 0);
  assert.ok(Math.abs(sum - r.score) <= 0.5);
});

test('scores come from profile attributes, not randomness (deterministic)', () => {
  const first = JSON.stringify(M.scoreCandidate(me, cand()));
  for (let i = 0; i < 50; i++) assert.equal(JSON.stringify(M.scoreCandidate(me, cand())), first);
});

test('a worse profile scores lower than a better one', () => {
  const good = M.scoreCandidate(me, cand());
  const bad = M.scoreCandidate(me, cand({
    rank: 'Bronze', role: 'IGL', languages: ['Tamil'], region: 'South India', server: 'Other',
    slots: ['wd-day'], playstyle: 'Casual', communication: 'Quiet', mode: 'TDM'
  }));
  assert.ok(good.score - bad.score >= 40, `good ${good.score} vs bad ${bad.score}`);
  assert.ok(bad.caveats.length >= 3);
});

test('rank gap lowers the rank component monotonically', () => {
  const rankPoints = (rank) => M.scoreCandidate(me, cand({ rank })).components.find(c => c.key === 'rank').value;
  assert.equal(rankPoints('Platinum'), 1);
  assert.ok(rankPoints('Diamond') < rankPoints('Platinum'));
  assert.ok(rankPoints('Crown') < rankPoints('Diamond'));
  // Bronze is 3 tiers below Platinum: 1 - 3/4 = 0.25
  assert.equal(rankPoints('Bronze'), 0.25);
});

test('complementary roles beat duplicate roles', () => {
  const diff = M.scoreCandidate(me, cand({ role: 'Sniper' })).components.find(c => c.key === 'role').value;
  const same = M.scoreCandidate(me, cand({ role: 'IGL' })).components.find(c => c.key === 'role').value;
  assert.ok(diff > same);
});

test('hard constraints exclude candidates BEFORE scoring', () => {
  const list = [
    cand({ id: 'ok', username: 'ok' }),
    cand({ id: 'g', username: 'g', game: 'valorant' }),
    cand({ id: 'n', username: 'n', lfg: false }),
    cand({ id: 'i', username: 'i', acceptsInvites: false }),
    cand({ id: 'b1', username: 'b1' }),
    cand({ id: 'b2', username: 'b2', blockedIds: ['me'] }),
    cand({ id: 'me', username: 'self' }),
    cand({ id: 'p', username: 'p', platform: 'PC' })
  ];
  const out = M.rankCandidates(Object.assign({}, me, { blockedIds: ['b1'] }), list);
  assert.deepEqual(out.results.map(r => r.candidate.id), ['ok']);
  const reasons = Object.fromEntries(out.excluded.map(e => [e.candidate.id, e.reason]));
  assert.equal(reasons.g, 'Different game');
  assert.equal(reasons.n, 'Not looking for a group');
  assert.equal(reasons.i, 'Not accepting invites');
  assert.equal(reasons.b1, 'Blocked by you');
  assert.equal(reasons.b2, 'Has blocked you');
  assert.equal(reasons.me, 'This is you');
  assert.equal(reasons.p, 'Platform not compatible');
});

test('cross-play games do not exclude by platform', () => {
  const mc = Object.assign({}, me, { game: 'minecraft', mode: 'Survival', rank: 'Builder', role: 'Builder', platform: 'Mobile' });
  const out = M.rankCandidates(mc, [cand({ id: 'x', game: 'minecraft', mode: 'Survival', rank: 'Veteran', role: 'Fighter', platform: 'PC' })]);
  assert.equal(out.results.length, 1);
});

test('user filters act as hard constraints', () => {
  const list = [
    cand({ id: 'a', username: 'a', rank: 'Gold' }),
    cand({ id: 'b', username: 'b', rank: 'Diamond' }),
    cand({ id: 'c', username: 'c', rank: 'Conqueror' }),
    cand({ id: 'd', username: 'd', mic: 'No mic' }),
    cand({ id: 'e', username: 'e', languages: ['Tamil'] }),
    cand({ id: 'f', username: 'f', playstyle: 'Casual' })
  ];
  const ids = (f) => M.rankCandidates(me, list, { filters: f }).results.map(r => r.candidate.id).sort();
  assert.deepEqual(ids({ rankMin: 'Gold', rankMax: 'Diamond' }), ['a', 'b', 'd', 'e', 'f']);
  assert.deepEqual(ids({ micRequired: true }).includes('d'), false);
  assert.deepEqual(ids({ language: 'Tamil' }), ['e']);
  assert.deepEqual(ids({ playstyle: 'Competitive' }).includes('f'), false);
  assert.deepEqual(ids({ role: 'Sniper', rankMin: 'Conqueror' }), ['c']);
});

test('results are sorted by score, ties broken by username', () => {
  const out = M.rankCandidates(me, [
    cand({ id: '1', username: 'zed' }), cand({ id: '2', username: 'amy' }),
    cand({ id: '3', username: 'low', rank: 'Silver', languages: ['Tamil'], slots: [] })
  ]);
  assert.deepEqual(out.results.map(r => r.candidate.username), ['amy', 'zed', 'low']);
  for (let i = 1; i < out.results.length; i++) assert.ok(out.results[i - 1].score >= out.results[i].score);
});

test('weights are configurable and change the outcome', () => {
  const c = cand({ rank: 'Bronze' });
  const base = M.scoreCandidate(me, c).score;
  const rankHeavy = M.scoreCandidate(me, c, { game: 5, rank: 60, role: 10, language: 5, region: 5, availability: 10, playstyle: 5 }).score;
  assert.ok(rankHeavy < base);
  assert.throws(() => M.scoreCandidate(me, c, { game: 1, rank: 1, role: 1, language: 1, region: 1, availability: 1, playstyle: 1 }));
});

test('pagination returns slices with a stable total', () => {
  const many = Array.from({ length: 12 }, (_, i) => cand({ id: 'p' + i, username: 'u' + String(i).padStart(2, '0') }));
  const p1 = M.rankCandidates(me, many, { limit: 5, offset: 0 });
  const p2 = M.rankCandidates(me, many, { limit: 5, offset: 5 });
  assert.equal(p1.total, 12);
  assert.equal(p1.results.length, 5);
  assert.equal(p2.results.length, 5);
  assert.notEqual(p1.results[0].candidate.id, p2.results[0].candidate.id);
});

test('unknown rank labels are handled without crashing', () => {
  const r = M.scoreCandidate(me, cand({ rank: 'Mystery' }));
  assert.equal(r.components.find(c => c.key === 'rank').value, 0.5);
});

test('every catalog game has ranks, modes, roles', () => {
  assert.equal(G.GAMES.length, 7);
  G.GAMES.forEach(g => {
    assert.ok(g.ranks.length >= 4 && g.modes.length >= 2 && g.roles.length >= 4, g.id);
  });
  assert.deepEqual(G.GAMES.map(g => g.id), ['bgmi', 'freefire', 'valorant', 'minecraft', 'roblox', 'codm', 'fortnite']);
});
