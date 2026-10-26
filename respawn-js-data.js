/*
 * RESPAWN sample data. EVERYTHING in this file is fictional DEMO content.
 * It exists so the interface can be tried before a real backend is connected.
 * Usernames are invented; no real people or accounts are represented.
 * Engagement counters deliberately start at zero — only real actions change them.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RespawnData = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY = 24 * 60 * 60 * 1000;
  function inDays(n) { return Date.now() + n * DAY; }

  function g(o) {
    var base = { lfg: true, acceptsInvites: true, blockedIds: [], achievements: [], communication: 'Flexible', demo: true };
    for (var k in o) base[k] = o[k];
    return base;
  }

  var GAMERS = [
    g({ id: 'u1', username: 'NovaStrike', bio: 'Sniper main. Calm comms, late-evening squads.', game: 'bgmi', mode: 'Classic', rank: 'Platinum', level: 62, role: 'Sniper', languages: ['Hindi', 'English'], region: 'North India', server: 'Asia', platform: 'Mobile', playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks', slots: ['wd-eve', 'we-eve'], achievements: ['Clutch Master'] }),
    g({ id: 'u2', username: 'KiraByte', bio: 'Aggressive assaulter. Weekend grinder.', game: 'bgmi', mode: 'Classic', rank: 'Diamond', level: 71, role: 'Assaulter', languages: ['Hindi', 'Hinglish'], region: 'West India', server: 'Asia', platform: 'Mobile', playstyle: 'Competitive', communication: 'Chatty', mic: 'Speaks', slots: ['we-eve', 'we-night'], achievements: ['Squad Wipe'] }),
    g({ id: 'u3', username: 'PixelRaj', bio: 'Support player who loves a good laugh.', game: 'bgmi', mode: 'TDM', rank: 'Gold', level: 48, role: 'Support', languages: ['English', 'Hindi'], region: 'South India', server: 'Asia', platform: 'Mobile', playstyle: 'Casual', communication: 'Chatty', mic: 'Listens only', slots: ['wd-night', 'we-day'], achievements: [] }),
    g({ id: 'u4', username: 'ZenithAim', bio: 'IGL looking for a disciplined squad.', game: 'bgmi', mode: 'Classic', rank: 'Ace', level: 80, role: 'IGL', languages: ['Hindi'], region: 'North India', server: 'Asia', platform: 'Mobile', playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks', slots: ['wd-eve'], achievements: ['Tournament Veteran'] }),
    g({ id: 'u5', username: 'SilentSaanvi', bio: 'Quiet scout. Prefers text pings.', game: 'bgmi', mode: 'Classic', rank: 'Silver', level: 35, role: 'Scout', languages: ['Bengali', 'English'], region: 'East India', server: 'Asia', platform: 'Mobile', playstyle: 'Casual', communication: 'Quiet', mic: 'No mic', slots: ['we-day'], achievements: [] }),
    g({ id: 'u6', username: 'GhostGuru', bio: 'Taking a break from squads right now.', game: 'bgmi', mode: 'Classic', rank: 'Platinum', level: 58, role: 'Support', languages: ['Hindi'], region: 'North India', server: 'Asia', platform: 'Mobile', playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks', slots: ['wd-eve'], lfg: false }),
    g({ id: 'u17', username: 'DeepDive', bio: 'Invites are switched off for now.', game: 'bgmi', mode: 'Classic', rank: 'Platinum', level: 55, role: 'Assaulter', languages: ['Hindi', 'English'], region: 'North India', server: 'Asia', platform: 'Mobile', playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks', slots: ['wd-eve', 'we-eve'], acceptsInvites: false }),
    g({ id: 'u7', username: 'LunaLoot', bio: 'Rusher with fast hands.', game: 'freefire', mode: 'Clash Squad', rank: 'Diamond', level: 66, role: 'Rusher', languages: ['Hindi', 'English'], region: 'North India', server: 'India', platform: 'Mobile', playstyle: 'Competitive', communication: 'Chatty', mic: 'Speaks', slots: ['wd-eve', 'we-eve'], achievements: ['Clash Champ'] }),
    g({ id: 'u8', username: 'RushRohan', bio: 'Support main, chill vibes only.', game: 'freefire', mode: 'Battle Royale', rank: 'Gold', level: 44, role: 'Support', languages: ['Hinglish'], region: 'Central India', server: 'India', platform: 'Mobile', playstyle: 'Casual', communication: 'Flexible', mic: 'Speaks', slots: ['we-day', 'we-eve'] }),
    g({ id: 'u9', username: 'VortexVee', bio: 'Duelist, entry fragger.', game: 'valorant', mode: 'Competitive', rank: 'Gold', level: 120, role: 'Duelist', languages: ['English', 'Hindi'], region: 'West India', server: 'Mumbai', platform: 'PC', playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks', slots: ['wd-night', 'we-night'] }),
    g({ id: 'u10', username: 'AshenArya', bio: 'Smokes and setups. Learning the ropes.', game: 'valorant', mode: 'Unrated', rank: 'Silver', level: 85, role: 'Controller', languages: ['English'], region: 'South India', server: 'Mumbai', platform: 'PC', playstyle: 'Casual', communication: 'Chatty', mic: 'Speaks', slots: ['we-eve'] }),
    g({ id: 'u11', username: 'CobaltCrafter', bio: 'Big builds, bigger bases.', game: 'minecraft', mode: 'Survival', rank: 'Veteran', level: 40, role: 'Builder', languages: ['English', 'Hindi'], region: 'South India', server: 'Asia', platform: 'PC', playstyle: 'Casual', communication: 'Chatty', mic: 'Speaks', slots: ['we-day', 'we-eve'] }),
    g({ id: 'u12', username: 'MeeraMC', bio: 'Redstone engineer.', game: 'minecraft', mode: 'Creative', rank: 'Expert', level: 55, role: 'Redstoner', languages: ['English', 'Tamil'], region: 'South India', server: 'Asia', platform: 'Mobile', playstyle: 'Both', communication: 'Quiet', mic: 'Listens only', slots: ['wd-eve', 'we-day'] }),
    g({ id: 'u13', username: 'TurboTara', bio: 'Obby speedrunner.', game: 'roblox', mode: 'Obby', rank: 'Skilled', level: 30, role: 'Explorer', languages: ['English', 'Hindi'], region: 'West India', server: 'Asia', platform: 'Mobile', playstyle: 'Both', communication: 'Chatty', mic: 'Speaks', slots: ['we-day'] }),
    g({ id: 'u14', username: 'BlazeBaba', bio: 'Slayer in ranked.', game: 'codm', mode: 'Ranked', rank: 'Master', level: 150, role: 'Slayer', languages: ['Hindi', 'English'], region: 'North India', server: 'India', platform: 'Mobile', playstyle: 'Competitive', communication: 'Tactical', mic: 'Speaks', slots: ['wd-night', 'we-night'] }),
    g({ id: 'u15', username: 'TanvirPlays', bio: 'Objective player, team-first.', game: 'codm', mode: 'Multiplayer', rank: 'Elite', level: 90, role: 'Objective', languages: ['Bengali', 'English'], region: 'East India', server: 'India', platform: 'Mobile', playstyle: 'Both', communication: 'Flexible', mic: 'Speaks', slots: ['wd-eve', 'we-eve'] }),
    g({ id: 'u16', username: 'ByteBhai', bio: 'Builder in Zero Build? Yes, really.', game: 'fortnite', mode: 'Zero Build', rank: 'Gold', level: 100, role: 'Builder', languages: ['Hinglish', 'English'], region: 'West India', server: 'Asia', platform: 'Mobile', playstyle: 'Casual', communication: 'Chatty', mic: 'Speaks', slots: ['we-eve'] })
  ];

  var POSTS = [
    { id: 'p1', authorId: 'u1', type: 'victory', game: 'bgmi', text: 'Last-circle clutch with two teammates down. Calm comms won it.', tags: ['clutch', 'bgmi'], ago: '2h' },
    { id: 'p2', authorId: 'u9', type: 'screenshot', game: 'valorant', text: 'Rank screenshot after a long night. Still Gold, still climbing.', tags: ['valorant', 'ranked'], ago: '5h' },
    { id: 'p3', authorId: 'u11', type: 'screenshot', game: 'minecraft', text: 'Finished the mountain base. Roof garden next.', tags: ['minecraft', 'build'], ago: '8h' },
    { id: 'p4', authorId: 'u4', type: 'announcement', game: 'bgmi', text: 'Our team is scouting an Assaulter and a Support for weekend scrims. Platinum+ preferred.', tags: ['lfg', 'bgmi'], ago: '10h' },
    { id: 'p5', authorId: 'u7', type: 'text', game: 'freefire', text: 'Clash Squad tip: hold the first corner, let them come to you.', tags: ['freefire', 'tips'], ago: '1d' },
    { id: 'p6', authorId: 'u14', type: 'achievement', game: 'codm', text: 'Hit Master this season. Thanks to everyone who queued with me.', tags: ['codm', 'ranked'], ago: '1d' },
    { id: 'p7', authorId: 'u12', type: 'text', game: 'minecraft', text: 'Working on an auto-sorter. Anyone want to test it on a server?', tags: ['minecraft', 'redstone'], ago: '2d' },
    { id: 'p8', authorId: 'u16', type: 'victory', game: 'fortnite', text: 'Zero Build win from a bad drop. Rotations matter.', tags: ['fortnite', 'victory'], ago: '3d' }
  ];

  var CLIPS = [
    { id: 'c1', authorId: 'u1', game: 'bgmi', caption: 'Final circle 1v3', tags: ['clutch', 'bgmi'], length: '0:24' },
    { id: 'c2', authorId: 'u9', game: 'valorant', caption: 'Ace on Ascent', tags: ['ace', 'valorant'], length: '0:31' },
    { id: 'c3', authorId: 'u7', game: 'freefire', caption: 'Clash Squad 4-man wipe', tags: ['freefire'], length: '0:19' },
    { id: 'c4', authorId: 'u14', game: 'codm', caption: 'Nuke streak', tags: ['codm'], length: '0:27' },
    { id: 'c5', authorId: 'u11', game: 'minecraft', caption: 'Base timelapse', tags: ['minecraft', 'build'], length: '0:40' },
    { id: 'c6', authorId: 'u16', game: 'fortnite', caption: 'Zero Build edit-free win', tags: ['fortnite'], length: '0:22' }
  ];

  var TOURNAMENTS = [
    { id: 't1', title: 'Weekend Scrims — BGMI Squads', kind: 'casual', game: 'bgmi', mode: 'Classic', teamSize: 4, state: 'registration_open', startsAt: inDays(4), deadline: inDays(3), organizer: 'RESPAWN Community (demo)', reward: 'Participation badge', eligibility: 'Open to all. Free entry.', rules: ['Squads of 4 (or join solo and we group you).', 'No emulators, no cheats.', 'Be respectful in lobby chat.'] },
    { id: 't2', title: 'Valorant 5v5 Community Cup', kind: 'competitive', game: 'valorant', mode: 'Competitive', teamSize: 5, state: 'registration_open', startsAt: inDays(9), deadline: inDays(7), organizer: 'Demo Organizers', reward: 'Virtual cosmetic: Cup Finalist frame', eligibility: 'Teams of 5. Free entry. Self-reported rank Platinum or below.', rules: ['Best of 1 until semifinals, then best of 3.', 'Captains submit results with a screenshot.', 'An organizer verifies every result before the bracket advances.'] },
    { id: 't3', title: 'Free Fire Clash Squad Night', kind: 'casual', game: 'freefire', mode: 'Clash Squad', teamSize: 4, state: 'registration_closed', startsAt: inDays(1), deadline: inDays(-1), organizer: 'Demo Organizers', reward: 'Participation badge', eligibility: 'Open to all. Free entry.', rules: ['4v4 friendly rounds.', 'Rooms are shared on match day.'] },
    { id: 't4', title: 'CODM Ranked Challenge', kind: 'competitive', game: 'codm', mode: 'Ranked', teamSize: 5, state: 'in_progress', startsAt: inDays(-1), deadline: inDays(-3), organizer: 'Demo Organizers', reward: 'Virtual cosmetic: Challenger title', eligibility: 'Teams of 5. Free entry.', rules: ['Round-robin groups, then a final.', 'Results need organizer verification.'] },
    { id: 't5', title: 'BGMI Squad Cup — Round 2', kind: 'competitive', game: 'bgmi', mode: 'Classic', teamSize: 4, state: 'awaiting_verification', startsAt: inDays(-2), deadline: inDays(-6), organizer: 'Demo Organizers', reward: 'Virtual cosmetic: Cup banner', eligibility: 'Teams of 4. Free entry.', rules: ['Placement + kill points.', 'Final standings appear only after verification.'] },
    { id: 't6', title: 'Minecraft Build Battle', kind: 'casual', game: 'minecraft', mode: 'Creative', teamSize: 1, state: 'completed', startsAt: inDays(-8), deadline: inDays(-10), organizer: 'Demo Organizers', reward: 'Participation badge', eligibility: 'Open to all. Free entry.', rules: ['Theme announced at start.', 'Community vote picks the favorites.'] },
    { id: 't7', title: 'Fortnite Zero Build Duos', kind: 'competitive', game: 'fortnite', mode: 'Zero Build', teamSize: 2, state: 'cancelled', startsAt: inDays(5), deadline: inDays(3), organizer: 'Demo Organizers', reward: 'Virtual cosmetic: Duo frame', eligibility: 'Duos. Free entry.', rules: ['Cancelled by the organizer. A new date will be posted if rescheduled.'] },
    { id: 't8', title: 'Roblox Obby Relay', kind: 'casual', game: 'roblox', mode: 'Obby', teamSize: 3, state: 'disputed', startsAt: inDays(-4), deadline: inDays(-6), organizer: 'Demo Organizers', reward: 'Participation badge', eligibility: 'Open to all. Free entry.', rules: ['Reported results are under review by moderators.'] }
  ];

  var STATE_LABELS = {
    registration_open: 'Registration open', registration_closed: 'Registration closed', in_progress: 'In progress',
    awaiting_verification: 'Awaiting result verification', completed: 'Completed', cancelled: 'Cancelled', disputed: 'Disputed'
  };

  // Free customization options (always available).
  var FREE = {
    themes: [
      { id: 'mono', name: 'Monochrome', a: '#F4F4F5', b: '#73737A' },
      { id: 'cyan', name: 'Cyan Grid', a: '#22D3EE', b: '#3B82F6' },
      { id: 'ember', name: 'Ember', a: '#FB7185', b: '#F59E0B' },
      { id: 'mint', name: 'Mint Circuit', a: '#34D399', b: '#22D3EE' }
    ],
    banners: [
      { id: 'aurora', name: 'Aurora', css: 'linear-gradient(120deg,#2b1b6b,#0e5e7a)' },
      { id: 'circuit', name: 'Circuit', css: 'repeating-linear-gradient(135deg,#141a2b 0 12px,#18203a 12px 24px)' },
      { id: 'sunset', name: 'Sunset', css: 'linear-gradient(120deg,#5b1d4f,#a2461f)' },
      { id: 'slate', name: 'Slate', css: 'linear-gradient(120deg,#2a2a2e,#111112)' }
    ],
    frames: [
      { id: 'none', name: 'No frame' },
      { id: 'solid', name: 'Solid ring' },
      { id: 'double', name: 'Double ring' }
    ],
    fonts: [
      { id: 'clean', name: 'Clean', css: 'system-ui, "Segoe UI", Roboto, sans-serif' },
      { id: 'tech', name: 'Tech mono', css: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
      { id: 'serif', name: 'Classic', css: 'Georgia, "Times New Roman", serif' }
    ]
  };

  // Locked items: ownership must be granted by a backend; none are owned in the demo.
  var LOCKED = [
    { id: 'nebula', kind: 'Animated background', name: 'Nebula drift', price: 400 },
    { id: 'holo', kind: 'Premium frame', name: 'Holo ring', price: 250 },
    { id: 'founder', kind: 'Rare badge', name: 'Founder', price: 600 },
    { id: 'legend', kind: 'Title', name: 'Squad Legend', price: 300 }
  ];

  return { GAMERS: GAMERS, POSTS: POSTS, CLIPS: CLIPS, TOURNAMENTS: TOURNAMENTS, STATE_LABELS: STATE_LABELS, FREE: FREE, LOCKED: LOCKED };
});
