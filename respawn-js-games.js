/*
 * RESPAWN game catalog (UMD: works in the browser and in Node tests).
 *
 * IMPORTANT: these are community categories, NOT official integrations.
 * Rank ladders below are approximations used only for self-reported ranks.
 * Verify them against each publisher's current ladder before public launch.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RespawnGames = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var GAMES = [
    {
      id: 'bgmi', name: 'BGMI', short: 'BGMI', color: '#F5A524', crossPlay: false,
      platforms: ['Mobile'],
      ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crown', 'Ace', 'Ace Master', 'Ace Dominator', 'Conqueror'],
      modes: ['Classic', 'TDM', 'Arena'],
      roles: ['IGL', 'Assaulter', 'Support', 'Sniper', 'Scout']
    },
    {
      id: 'freefire', name: 'Free Fire MAX', short: 'FF MAX', color: '#FF6B3D', crossPlay: false,
      platforms: ['Mobile'],
      ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Heroic', 'Grandmaster'],
      modes: ['Battle Royale', 'Clash Squad'],
      roles: ['IGL', 'Rusher', 'Support', 'Sniper', 'Flanker']
    },
    {
      id: 'valorant', name: 'VALORANT', short: 'VAL', color: '#FF4655', crossPlay: false,
      platforms: ['PC'],
      ranks: ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'],
      modes: ['Competitive', 'Unrated', 'Spike Rush'],
      roles: ['Duelist', 'Controller', 'Initiator', 'Sentinel']
    },
    {
      id: 'minecraft', name: 'Minecraft', short: 'MC', color: '#4ADE80', crossPlay: true,
      platforms: ['Mobile', 'PC', 'Console'],
      ranks: ['Newcomer', 'Builder', 'Veteran', 'Expert'],
      modes: ['Survival', 'Creative', 'PvP', 'Minigames'],
      roles: ['Builder', 'Redstoner', 'Explorer', 'Fighter']
    },
    {
      id: 'roblox', name: 'Roblox', short: 'RBLX', color: '#60A5FA', crossPlay: true,
      platforms: ['Mobile', 'PC', 'Console'],
      ranks: ['Newcomer', 'Regular', 'Skilled', 'Expert'],
      modes: ['Any experience', 'Obby', 'Roleplay', 'Shooter'],
      roles: ['Builder', 'Explorer', 'Fighter', 'Strategist']
    },
    {
      id: 'codm', name: 'Call of Duty: Mobile', short: 'CODM', color: '#A3E635', crossPlay: false,
      platforms: ['Mobile'],
      ranks: ['Rookie', 'Veteran', 'Elite', 'Pro', 'Master', 'Grandmaster', 'Legendary'],
      modes: ['Multiplayer', 'Battle Royale', 'Ranked'],
      roles: ['Slayer', 'Objective', 'Anchor', 'Sniper', 'Support']
    },
    {
      id: 'fortnite', name: 'Fortnite', short: 'FN', color: '#A78BFA', crossPlay: true,
      platforms: ['Mobile', 'PC', 'Console'],
      ranks: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Champion', 'Unreal'],
      modes: ['Battle Royale', 'Zero Build', 'Creative'],
      roles: ['Fragger', 'IGL', 'Support', 'Builder']
    }
  ];

  var LANGUAGES = ['English', 'Hindi', 'Hinglish', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Malayalam', 'Kannada', 'Punjabi', 'Gujarati'];
  var REGIONS = ['North India', 'South India', 'East India', 'West India', 'Central India', 'Southeast Asia', 'Middle East', 'Other'];
  var PLAYSTYLES = ['Casual', 'Competitive', 'Both'];
  var COMMUNICATION = ['Chatty', 'Tactical', 'Quiet', 'Flexible'];
  var MIC = ['Speaks', 'Listens only', 'No mic'];
  var SLOTS = [
    { id: 'wd-day', label: 'Weekday daytime' },
    { id: 'wd-eve', label: 'Weekday evening' },
    { id: 'wd-night', label: 'Weekday late night' },
    { id: 'we-day', label: 'Weekend daytime' },
    { id: 'we-eve', label: 'Weekend evening' },
    { id: 'we-night', label: 'Weekend late night' }
  ];

  function byId(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  return { GAMES: GAMES, LANGUAGES: LANGUAGES, REGIONS: REGIONS, PLAYSTYLES: PLAYSTYLES,
           COMMUNICATION: COMMUNICATION, MIC: MIC, SLOTS: SLOTS, byId: byId };
});
