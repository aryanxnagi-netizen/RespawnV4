/*
 * RESPAWN Squad Finder — transparent, deterministic compatibility scoring.
 *
 * - No randomness, no AI model, no network calls.
 * - Hard constraints remove candidates BEFORE scoring.
 * - Scores are heuristic compatibility estimates, NOT validated probabilities.
 * - Weights are configurable and must total 100.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./games.js'));
  else root.RespawnMatching = factory(root.RespawnGames);
})(typeof self !== 'undefined' ? self : this, function (Games) {
  'use strict';

  var DEFAULT_WEIGHTS = { game: 25, rank: 20, role: 15, language: 10, region: 10, availability: 10, playstyle: 10 };
  var LABELS = {
    game: 'Game & mode', rank: 'Rank', role: 'Role', language: 'Language',
    region: 'Region / server', availability: 'Play times', playstyle: 'Playstyle & comms'
  };
  var RANK_TOLERANCE = 4; // tiers apart at which the rank score reaches 0

  function validateWeights(w) {
    var keys = Object.keys(DEFAULT_WEIGHTS), sum = 0, i;
    for (i = 0; i < keys.length; i++) {
      var v = w && w[keys[i]];
      if (typeof v !== 'number' || !isFinite(v) || v < 0) throw new Error('Invalid weight for "' + keys[i] + '"');
      sum += v;
    }
    if (Math.abs(sum - 100) > 1e-9) throw new Error('Weights must total 100 (got ' + sum + ')');
    return true;
  }

  function rankIndex(gameId, label) {
    var g = Games.byId(gameId);
    return g ? g.ranks.indexOf(label) : -1;
  }

  function overlapRatio(a, b) {
    a = a || []; b = b || [];
    if (!a.length || !b.length) return 0;
    var shared = 0;
    for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) !== -1) shared++;
    return shared / Math.min(a.length, b.length);
  }

  function isIndia(r) { return /India$/.test(r || ''); }

  /* ---- hard constraints (applied before scoring) ---- */
  function exclusionReason(seeker, c, filters, game) {
    filters = filters || {};
    if (c.id === seeker.id) return 'This is you';
    if ((seeker.blockedIds || []).indexOf(c.id) !== -1) return 'Blocked by you';
    if ((c.blockedIds || []).indexOf(seeker.id) !== -1) return 'Has blocked you';
    if (c.game !== seeker.game) return 'Different game';
    if (!c.lfg) return 'Not looking for a group';
    if (c.acceptsInvites === false) return 'Not accepting invites';
    if (!game.crossPlay && seeker.platform && c.platform && seeker.platform !== c.platform) return 'Platform not compatible';
    if (filters.micRequired && c.mic === 'No mic') return 'No microphone';
    if (filters.mode && c.mode !== filters.mode) return 'Different mode';
    if (filters.role && c.role !== filters.role) return 'Different role';
    if (filters.language && (c.languages || []).indexOf(filters.language) === -1) return 'Language filter';
    if (filters.region && c.region !== filters.region) return 'Region filter';
    if (filters.playstyle && c.playstyle !== filters.playstyle && c.playstyle !== 'Both') return 'Playstyle filter';
    if (filters.slot && (c.slots || []).indexOf(filters.slot) === -1) return 'Not available then';
    if (filters.rankMin || filters.rankMax) {
      var ci = game.ranks.indexOf(c.rank);
      var lo = filters.rankMin ? game.ranks.indexOf(filters.rankMin) : 0;
      var hi = filters.rankMax ? game.ranks.indexOf(filters.rankMax) : game.ranks.length - 1;
      if (ci < 0 || ci < lo || ci > hi) return 'Outside rank range';
    }
    return null;
  }

  /* ---- component scores, each in 0..1 ---- */
  function componentValues(seeker, c, game) {
    var out = {};

    // game: hard-filtered to the same game; the mode decides the remainder
    out.game = (seeker.mode && c.mode && seeker.mode === c.mode) ? 1
      : (seeker.mode === 'Any' || c.mode === 'Any' || !seeker.mode || !c.mode) ? 0.8 : 0.5;

    var si = game.ranks.indexOf(seeker.rank), ci = game.ranks.indexOf(c.rank);
    out.rank = (si < 0 || ci < 0) ? 0.5 : Math.max(0, 1 - Math.abs(si - ci) / RANK_TOLERANCE);
    out._rankDiff = (si < 0 || ci < 0) ? null : Math.abs(si - ci);

    if (!seeker.role || seeker.role === 'Any') out.role = 0.8;
    else if (seeker.role === 'Flex' || c.role === 'Flex') out.role = 0.9;
    else out.role = seeker.role === c.role ? 0.5 : 1; // different roles complement each other

    out.language = overlapRatio(seeker.languages, c.languages);

    out.region = (seeker.server && c.server && seeker.server === c.server) ? 1
      : (seeker.region && seeker.region === c.region) ? 0.8
      : (isIndia(seeker.region) && isIndia(c.region)) ? 0.5 : 0.2;

    out.availability = overlapRatio(seeker.slots, c.slots);

    var ps = seeker.playstyle === c.playstyle ? 1
      : (seeker.playstyle === 'Both' || c.playstyle === 'Both') ? 0.8 : 0.3;
    var cm = seeker.communication === c.communication ? 1
      : (seeker.communication === 'Flexible' || c.communication === 'Flexible') ? 0.8 : 0.4;
    out.playstyle = 0.7 * ps + 0.3 * cm;

    return out;
  }

  function describe(key, v, vals) {
    // returns {good: 'phrase'} or {bad: 'phrase'}
    switch (key) {
      case 'game':
        return v >= 1 ? { good: 'same game and mode' } : v >= 0.8 ? { good: 'same game' } : { bad: 'different game mode' };
      case 'rank':
        return v >= 0.75 ? { good: 'compatible rank' } : v >= 0.5 ? { good: 'nearby rank' } : { bad: 'big rank gap' };
      case 'role':
        return v >= 1 ? { good: 'complementary roles' } : v >= 0.8 ? { good: 'flexible roles' } : { bad: 'overlapping roles' };
      case 'language':
        return v >= 1 ? { good: 'shared language' } : v > 0 ? { good: 'some shared language' } : { bad: 'no shared language' };
      case 'region':
        return v >= 1 ? { good: 'same server' } : v >= 0.8 ? { good: 'same region' } : v >= 0.5 ? { good: 'both in India' } : { bad: 'far-apart regions' };
      case 'availability':
        return v >= 0.5 ? { good: 'overlapping play times' } : v > 0 ? { good: 'some overlapping play times' } : { bad: 'no overlapping play times' };
      case 'playstyle':
        return v >= 0.85 ? { good: 'similar playstyle' } : v >= 0.6 ? { good: 'compatible playstyle' } : { bad: 'different playstyle' };
    }
    return {};
  }

  function joinList(items) {
    if (items.length === 0) return 'limited overlap';
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  function scoreCandidate(seeker, c, weights) {
    weights = weights || DEFAULT_WEIGHTS;
    validateWeights(weights);
    var game = Games.byId(seeker.game);
    var vals = componentValues(seeker, c, game);
    var keys = Object.keys(DEFAULT_WEIGHTS);
    var components = [], total = 0, good = [], bad = [];
    keys.forEach(function (k) {
      var pts = weights[k] * vals[k];
      total += pts;
      components.push({ key: k, label: LABELS[k], weight: weights[k], value: vals[k], points: pts });
      var d = describe(k, vals[k], vals);
      if (d.good) good.push({ text: d.good, pts: pts }); else if (d.bad) bad.push(d.bad);
    });
    good.sort(function (a, b) { return b.pts - a.pts; });
    var score = Math.round(total);
    var reasons = good.slice(0, 4).map(function (g) { return g.text; });
    return {
      candidate: c,
      score: score,
      components: components,
      reasons: reasons,
      caveats: bad,
      explanation: score + '% compatibility — ' + joinList(reasons) + '.'
    };
  }

  /*
   * rankCandidates(seeker, candidates, options)
   *   options.filters  — hard filters (see exclusionReason)
   *   options.weights  — override DEFAULT_WEIGHTS (must total 100)
   *   options.offset / options.limit — pagination
   */
  function rankCandidates(seeker, candidates, options) {
    options = options || {};
    var weights = options.weights || DEFAULT_WEIGHTS;
    validateWeights(weights);
    var game = Games.byId(seeker.game);
    if (!game) throw new Error('Unknown game: ' + seeker.game);

    var scored = [], excluded = [];
    (candidates || []).forEach(function (c) {
      var why = exclusionReason(seeker, c, options.filters, game);
      if (why) excluded.push({ candidate: c, reason: why });
      else scored.push(scoreCandidate(seeker, c, weights));
    });
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.candidate.username).localeCompare(String(b.candidate.username));
    });
    var offset = options.offset || 0;
    var limit = options.limit || scored.length;
    return { total: scored.length, results: scored.slice(offset, offset + limit), excluded: excluded };
  }

  return {
    DEFAULT_WEIGHTS: DEFAULT_WEIGHTS, LABELS: LABELS, RANK_TOLERANCE: RANK_TOLERANCE,
    validateWeights: validateWeights, rankIndex: rankIndex,
    exclusionReason: exclusionReason, scoreCandidate: scoreCandidate, rankCandidates: rankCandidates
  };
});
