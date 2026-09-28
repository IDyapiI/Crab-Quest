// Achievements, shop items, fish and daily quest templates.
// stat: which profile counter the threshold applies to.

const a = (id, name, description, icon, category, gold, xp, threshold, stat) =>
  ({ id, name, description, icon, category, gold, xp, threshold, stat });

const ACHIEVEMENTS = [
  a('first_tool', 'First Steps', 'Use any tool for the first time', 'tool', 'tools', 10, 10, 1, 'toolCalls'),
  a('tool_calls_100', 'Getting Busy', 'Use 100 tools', 'tool', 'tools', 25, 50, 100, 'toolCalls'),
  a('tool_calls_500', 'Tool Addict', 'Use 500 tools', 'tool', 'tools', 50, 100, 500, 'toolCalls'),
  a('tool_calls_1000', 'Thousand Hands', 'Use 1000 tools', 'tool', 'tools', 100, 200, 1000, 'toolCalls'),
  a('tool_calls_2500', 'Tool Typhoon', 'Use 2500 tools', 'tool', 'tools', 200, 400, 2500, 'toolCalls'),
  a('tool_calls_5000', 'Infinity Gauntlet', 'Use 5000 tools', 'crown', 'tools', 500, 1000, 5000, 'toolCalls'),
  a('tool_calls_10000', 'Tool Deity', 'Use 10000 tools', 'crown', 'tools', 1000, 2000, 10000, 'toolCalls'),
  a('tool_diversity_5', 'Jack of Trades', 'Use 5 different tool types', 'star', 'tools', 25, 30, 5, 'uniqueTools'),
  a('tool_diversity_10', 'Master of All', 'Use 10 different tool types', 'crown', 'tools', 100, 100, 10, 'uniqueTools'),
  a('subagent_1', 'Delegation', 'Launch your first subagent', 'agent', 'tools', 15, 20, 1, 'subagents'),
  a('subagent_10', 'Commander', 'Launch 10 subagents', 'agent', 'tools', 50, 50, 10, 'subagents'),
  a('subagent_50', 'General', 'Launch 50 subagents', 'agent', 'tools', 150, 150, 50, 'subagents'),
  a('subagent_100', 'Swarm Master', 'Launch 100 subagents', 'agent', 'tools', 300, 300, 100, 'subagents'),

  a('tokens_100k', 'Token Nibbler', 'Consume 100k tokens', 'coin', 'tokens', 25, 20, 1e5, 'tokens'),
  a('tokens_1m', 'Token Hoarder', 'Consume 1M tokens', 'coin', 'tokens', 100, 100, 1e6, 'tokens'),
  a('tokens_10m', 'Token Titan', 'Consume 10M tokens', 'coin', 'tokens', 500, 300, 1e7, 'tokens'),
  a('tokens_100m', 'Context Devourer', 'Consume 100M tokens', 'coin', 'tokens', 2000, 1000, 1e8, 'tokens'),
  a('tokens_500m', 'Token Singularity', 'Consume 500M tokens', 'coin', 'tokens', 5000, 3000, 5e8, 'tokens'),

  a('compact_1', 'Compressed', 'Survive your first compact', 'shield', 'survival', 25, 50, 1, 'compacts'),
  a('compact_5', 'Pressure Tested', 'Survive 5 compacts', 'shield', 'survival', 50, 100, 5, 'compacts'),
  a('compact_10', 'Unbreakable', 'Survive 10 compacts', 'shield', 'survival', 100, 200, 10, 'compacts'),
  a('compact_25', 'Compact Veteran', 'Survive 25 compacts', 'shield', 'survival', 200, 400, 25, 'compacts'),
  a('compact_50', 'Memory Phoenix', 'Survive 50 compacts', 'shield', 'survival', 500, 1000, 50, 'compacts'),

  a('sessions_1', 'Hello World', 'Complete your first session', 'flag', 'sessions', 10, 10, 1, 'sessions'),
  a('sessions_5', 'Getting Started', 'Complete 5 sessions', 'flag', 'sessions', 15, 25, 5, 'sessions'),
  a('sessions_10', 'Regular', 'Complete 10 sessions', 'flag', 'sessions', 25, 50, 10, 'sessions'),
  a('sessions_25', 'Habitual', 'Complete 25 sessions', 'flag', 'sessions', 50, 100, 25, 'sessions'),
  a('sessions_50', 'Veteran', 'Complete 50 sessions', 'flag', 'sessions', 100, 200, 50, 'sessions'),
  a('sessions_100', 'Lifer', 'Complete 100 sessions', 'flag', 'sessions', 250, 500, 100, 'sessions'),
  a('sessions_200', 'Coding Legend', 'Complete 200 sessions', 'crown', 'sessions', 500, 1000, 200, 'sessions'),

  a('boss_1', 'Bug Hunter', 'Defeat your first boss', 'shield', 'survival', 50, 100, 1, 'bosses'),
  a('boss_10', 'Monster Slayer', 'Defeat 10 bosses', 'shield', 'survival', 200, 400, 10, 'bosses'),
  a('boss_50', 'Legendary Hero', 'Defeat 50 bosses', 'crown', 'survival', 1000, 1500, 50, 'bosses'),

  a('level_3', 'Baby Steps', 'Reach level 3', 'star', 'mastery', 10, 0, 3, 'level'),
  a('level_5', 'Novice', 'Reach level 5', 'star', 'mastery', 25, 0, 5, 'level'),
  a('level_10', 'Apprentice', 'Reach level 10', 'star', 'mastery', 50, 0, 10, 'level'),
  a('level_15', 'Rising Star', 'Reach level 15', 'star', 'mastery', 75, 0, 15, 'level'),
  a('level_25', 'Journeyman', 'Reach level 25', 'crown', 'mastery', 150, 0, 25, 'level'),
  a('level_50', 'Expert', 'Reach level 50', 'crown', 'mastery', 500, 0, 50, 'level'),
  a('level_75', 'Grandmaster', 'Reach level 75', 'crown', 'mastery', 1000, 0, 75, 'level'),
  a('level_99', 'Max Level', 'Reach the maximum level', 'crown', 'mastery', 5000, 0, 99, 'level'),
];

const i = (id, name, description, category, price, level, data, consumable = false) =>
  ({ id, name, description, category, price, level, data, consumable });

const SHOP_ITEMS = [
  // Skins recolour Clawd: body, light (highlight), dark (shade), eye.
  i('skin_dark', 'Dark Mode', 'Sleek dark palette', 'skin', 50, 3, { body: '#555577', light: '#7777a0', dark: '#2e2e48', eye: '#aab0ff' }),
  i('skin_golden', 'Golden Claude', 'Gilded in gold', 'skin', 200, 10, { body: '#f2c14e', light: '#ffe58f', dark: '#b8860b', eye: '#4a2e00' }),
  i('skin_ghost', 'Ghost Claude', 'Translucent and spooky', 'skin', 150, 8, { body: '#ccddee', light: '#eef6ff', dark: '#99aacc', eye: '#334466', opacity: 0.7 }),
  i('skin_fire', 'Fire Claude', 'Burning with passion', 'skin', 300, 15, { body: '#ff6644', light: '#ffaa00', dark: '#cc2200', eye: '#330000', particles: 'fire' }),
  i('skin_ice', 'Ice Claude', 'Cool as ice', 'skin', 300, 15, { body: '#88c6f5', light: '#ccf0ff', dark: '#5599dd', eye: '#0b2a4a', particles: 'ice' }),
  i('skin_king', 'Pixel King', 'The royal treatment', 'skin', 1000, 30, { body: '#cc2244', light: '#ff5577', dark: '#8a1030', eye: '#1b1010', crown: true }),

  i('map_desert', 'Desert Oasis', 'Sandy tones, cacti', 'map_theme', 100, 5, { grass: '#d4b896', path: '#c4a070', tree: '#558844', water: '#5599cc' }),
  i('map_snow', 'Snow World', 'Winter wonderland', 'map_theme', 100, 5, { grass: '#ddeeff', path: '#bbccdd', tree: '#446655', water: '#88bbdd' }),
  i('map_neon', 'Neon City', 'Cyberpunk vibes', 'map_theme', 200, 12, { grass: '#1a0a2e', path: '#2a1a3e', tree: '#ff00ff', water: '#00ffff' }),
  i('map_void', 'Void Realm', 'Embrace the void', 'map_theme', 500, 25, { grass: '#1a0a2e', path: '#220033', tree: '#8800cc', water: '#6600aa' }),

  i('fx_sparkle', 'Sparkle Trail', 'Leave sparkles behind', 'effect', 75, 3, { type: 'trail', color: '#ffdd44', rate: 3, lifetime: 20 }),
  i('fx_shadow', 'Shadow Clone', 'Ghost trail follows you', 'effect', 150, 10, { type: 'shadow', color: '#4444ff', opacity: 0.3 }),
  i('fx_rainbow', 'Rainbow Steps', 'Walk the rainbow', 'effect', 200, 12, { type: 'trail', color: 'rainbow', rate: 2, lifetime: 30 }),
  i('fx_lightning', 'Lightning Aura', 'Electric sparks', 'effect', 300, 20, { type: 'aura', color: '#44ddff', rate: 5, lifetime: 10 }),

  i('comp_slime', 'Slime Buddy', 'Jiggly and adorable', 'companion', 75, 3, { sprite: 'slime', color: '#44dd66' }),
  i('comp_cat', 'Pixel Cat', 'A loyal feline friend', 'companion', 100, 5, { sprite: 'cat', color: '#ff8844' }),
  i('comp_owl', 'Night Owl', 'A wise companion', 'companion', 150, 8, { sprite: 'owl', color: '#886644' }),
  i('comp_fairy', 'Code Fairy', 'A floating sparkle', 'companion', 200, 10, { sprite: 'fairy', color: '#ff88ff', float: true }),
  i('comp_fox', 'Pixel Fox', 'Quick and cunning', 'companion', 200, 10, { sprite: 'fox', color: '#ff8833' }),
  i('comp_ghost', 'Friendly Ghost', 'Boo! Just kidding', 'companion', 250, 12, { sprite: 'ghost', color: '#ccddff', float: true }),
  i('comp_bot', 'Ghost Bot', 'A hovering robot', 'companion', 300, 15, { sprite: 'bot', color: '#88bbff', float: true }),
  i('comp_dragon', 'Baby Dragon', 'Tiny but fierce', 'companion', 500, 20, { sprite: 'dragon', color: '#ff4400' }),
  i('comp_phoenix', 'Mini Phoenix', 'Reborn from ashes', 'companion', 800, 25, { sprite: 'phoenix', color: '#ff4400', float: true, particles: 'fire' }),

  i('con_xp_potion', 'XP Potion', 'Double XP for 5 minutes', 'consumable', 30, 1, { type: 'xp_boost', multiplier: 2, duration: 300, color: '#44aaff' }, true),
  i('con_gold_potion', 'Gold Elixir', '+50% gold for 5 minutes', 'consumable', 40, 3, { type: 'gold_boost', multiplier: 1.5, duration: 300, color: '#ffdd44' }, true),
  i('con_fish_lure', 'Magic Lure', 'Better fish for 5 minutes', 'consumable', 25, 2, { type: 'fish_lure', bonus: 2, duration: 300, color: '#55ddff' }, true),
  i('con_fireworks', 'Fireworks', 'Celebrate with fireworks!', 'consumable', 15, 1, { type: 'fireworks', duration: 10, color: '#ff44aa' }, true),
  i('con_mega_xp', 'Mega XP Crystal', 'Triple XP for 10 minutes', 'consumable', 100, 10, { type: 'xp_boost', multiplier: 3, duration: 600, color: '#aa44ff' }, true),
];

// ---- v2 additions ----
// rarity 'legendary' items are long-term goals with animated effects.
const L = { rarity: 'legendary' };

SHOP_ITEMS.push(
  i('skin_mint', 'Mint Claude', 'Fresh as a new branch', 'skin', 150, 5, { body: '#6fd6a8', light: '#b5f2d6', dark: '#3a9e76', eye: '#10302a' }),
  i('skin_sakura', 'Sakura Claude', 'Blossoming with ideas', 'skin', 200, 8, { body: '#f4a6c1', light: '#ffd6e5', dark: '#c46d8f', eye: '#3a1020' }),
  i('skin_ocean', 'Ocean Claude', 'Deep context, calm waters', 'skin', 250, 12, { body: '#3b8ed8', light: '#8fc4f2', dark: '#1f5a94', eye: '#e8f4ff' }),
  i('skin_ninja', 'Shadow Ninja', 'Silent refactors at midnight', 'skin', 450, 20, { body: '#2b2b3a', light: '#4a4a60', dark: '#15151f', eye: '#ff3b3b' }),
  i('skin_robot', 'Robo Claude', 'Beep boop, tests pass', 'skin', 500, 22, { body: '#9aa3b5', light: '#d7dde8', dark: '#5f6778', eye: '#44e0ff' }),
  i('skin_gb', 'Game Boy', 'Four shades of green nostalgia', 'skin', 600, 25, { body: '#8bac0f', light: '#9bbc0f', dark: '#306230', eye: '#0f380f' }),
  i('skin_prism', 'Prism Claude', 'Every colour at once — legendary', 'skin', 8000, 50, { body: '#ff5f5f', prism: true }, false),

  i('hat_cap', 'Dev Cap', 'Backwards is optional', 'hat', 80, 1, { hat: 'cap', color: '#e5534b' }),
  i('hat_party', 'Party Hat', 'Every merge is a celebration', 'hat', 120, 3, { hat: 'party', color: '#e36ee3' }),
  i('hat_flowers', 'Flower Crown', 'Picked on the village paths', 'hat', 150, 5, { hat: 'flowers', color: '#ff6f91' }),
  i('hat_chef', 'Chef Hat', 'Cooking up clean code', 'hat', 180, 8, { hat: 'chef', color: '#f4efe6' }),
  i('hat_headphones', 'Headphones', 'Lo-fi beats to code to', 'hat', 200, 10, { hat: 'headphones', color: '#e5534b' }),
  i('hat_wizard', 'Wizard Hat', 'Prompt engineering, literally', 'hat', 250, 12, { hat: 'wizard', color: '#5a4fcf' }),
  i('hat_pirate', 'Pirate Hat', 'Arr, force push!', 'hat', 300, 15, { hat: 'pirate', color: '#2b2b3a' }),
  i('hat_tophat', 'Top Hat', 'Distinguished engineer', 'hat', 350, 18, { hat: 'tophat', color: '#1c1424' }),
  i('hat_viking', 'Viking Helm', 'Conquer the backlog', 'hat', 400, 22, { hat: 'viking', color: '#9aa3b5' }),
  i('hat_halo', 'Halo', 'Zero warnings, zero sins', 'hat', 600, 30, { hat: 'halo', color: '#f2c14e' }),
  i('hat_legend', 'Crown of Tokens', 'Forged from a billion tokens — legendary', 'hat', 15000, 75, { hat: 'legend', color: '#f2c14e', sparkle: true }, false),

  i('comp_penguin', 'Pixel Penguin', 'Waddles after every commit', 'companion', 150, 5, { sprite: 'penguin', color: '#2b2d42' }),
  i('comp_bee', 'Busy Bee', 'Buzzes around your code', 'companion', 180, 8, { sprite: 'bee', color: '#2b2b3a', float: true }),
  i('comp_turtle', 'Slow Turtle', 'Steady CI wins the race', 'companion', 220, 10, { sprite: 'turtle', color: '#8bc34a' }),
  i('comp_octopus', 'Octo Helper', 'Eight arms, eight terminals', 'companion', 350, 15, { sprite: 'octopus', color: '#b779e0' }),
  i('comp_bat', 'Night Bat', 'Loves late-night sessions', 'companion', 300, 18, { sprite: 'bat', color: '#4a3b5c', float: true }),
  i('comp_miniclawd', 'Mini Clawd', 'A tiny sub-agent of your own', 'companion', 700, 28, { sprite: 'miniclawd', color: '#d97757' }),
  i('comp_goldragon', 'Golden Dragon', 'Hoards tokens, breathes stars — legendary', 'companion', 10000, 60, { sprite: 'dragon', color: '#f2c14e', particles: 'sparkle' }),

  i('map_gameboy', 'Game Boy', 'DMG-01 green screen', 'map_theme', 300, 10, { grass: '#8bac0f', path: '#9bbc0f', tree: '#306230', water: '#306230' }),
  i('map_autumn', 'Autumn Leaves', 'Cosy orange afternoons', 'map_theme', 250, 12, { grass: '#9c8b3a', path: '#c7a566', tree: '#c0582b', water: '#3b6fa8' }),
  i('map_sakura', 'Sakura Spring', 'Pink petals everywhere', 'map_theme', 300, 15, { grass: '#7fbf6a', path: '#e8cfc0', tree: '#f4a6c1', water: '#6fb7e0' }),
  i('map_lava', 'Lava Fields', 'Production is on fire', 'map_theme', 450, 25, { grass: '#3a2a2a', path: '#5c4033', tree: '#6b2a1a', water: '#ff5a1f' }),
  i('map_cosmos', 'Cosmos', 'A village among the stars — legendary', 'map_theme', 7500, 55, { grass: '#141032', path: '#2a2350', tree: '#6b4bd6', water: '#0b0620', stars: true }),

  i('fx_hearts', 'Love Trail', 'Hearts for every green test', 'effect', 150, 5, { type: 'glyph', glyph: 'heart', color: '#ff6f91', rate: 1, lifetime: 40 }),
  i('fx_notes', 'Music Notes', 'Coding has a rhythm', 'effect', 200, 10, { type: 'glyph', glyph: 'note', color: '#8ec5ff', rate: 1, lifetime: 45 }),
  i('fx_bubbles', 'Bubbles', 'Floating thoughts', 'effect', 200, 12, { type: 'glyph', glyph: 'bubble', color: '#bde0fe', rate: 1, lifetime: 50 }),
  i('fx_confetti', 'Confetti', 'Ship it!', 'effect', 350, 20, { type: 'confetti', rate: 3, lifetime: 35 }),
  i('fx_galaxy', 'Galaxy Orbit', 'Stars orbit around you — legendary', 'effect', 6000, 50, { type: 'orbit', color: '#f2c14e', count: 8 }),

  i('decor_poster', 'Claude Poster', 'For the office wall', 'decor', 90, 1, { decor: 'poster' }),
  i('decor_plant', 'Monstera', 'Oxygen for long sessions', 'decor', 120, 3, { decor: 'plant' }),
  i('decor_castle', 'Tank Castle', 'A castle for your fish', 'decor', 150, 5, { decor: 'castle' }),
  i('decor_lavalamp', 'Lava Lamp', 'Groovy mantel light', 'decor', 180, 6, { decor: 'lavalamp' }),
  i('decor_globe', 'Globe', 'For remote teammates', 'decor', 220, 10, { decor: 'globe' }),
  i('decor_guitar', 'Guitar', 'Strum while tests run', 'decor', 250, 8, { decor: 'guitar' }),
  i('decor_telescope', 'Telescope', 'Look for new models', 'decor', 350, 15, { decor: 'telescope' }),
  i('decor_arcade', 'Arcade Cabinet', 'High score: 99 tools/min', 'decor', 450, 12, { decor: 'arcade' }),
  i('decor_disco', 'Disco Ball', 'Deploy-day party', 'decor', 500, 18, { decor: 'disco' }),
  i('decor_neon', 'SHIP IT Neon', 'The house motto', 'decor', 600, 20, { decor: 'neon' }),
  i('decor_throne', 'Golden Throne', 'Rule the village — legendary', 'decor', 9000, 60, { decor: 'throne' }),

  i('title_apprentice', 'the Apprentice', 'Everyone starts somewhere', 'title', 100, 5, { text: 'the Apprentice' }),
  i('title_tinkerer', 'the Tinkerer', 'Always fiddling with configs', 'title', 250, 10, { text: 'the Tinkerer' }),
  i('title_bugslayer', 'Bug Slayer', 'Feared by stack traces', 'title', 500, 15, { text: 'Bug Slayer' }),
  i('title_whisperer', 'Token Whisperer', 'Speaks fluent context', 'title', 800, 20, { text: 'Token Whisperer' }),
  i('title_commander', 'Agent Commander', 'Leads the sub-agent army', 'title', 1000, 25, { text: 'Agent Commander' }),
  i('title_wizard', 'Context Wizard', 'Never runs out of memory', 'title', 1500, 30, { text: 'Context Wizard' }),
  i('title_deity', 'Tool Deity', 'Ten thousand hands', 'title', 3000, 50, { text: 'Tool Deity' }),
  i('title_legend', 'Legend of the Terminal', 'Songs are sung — legendary', 'title', 9999, 75, { text: 'Legend of the Terminal' }),
);
// Boss drops: never sold, only won in fights.
const D = (id, name, description, category, data) => ({ ...i(id, name, description, category, 0, 1, data), drop: true });
SHOP_ITEMS.push(
  D('hat_bughorns', 'Bug Horns', 'Torn from a defeated boss', 'hat', { hat: 'horns', color: '#63d471' }),
  D('comp_bug', 'Tamed Bug', 'It used to crash prod. Now it follows you', 'companion', { sprite: 'bug', color: '#63d471' }),
  D('title_exterminator', 'the Exterminator', 'No bug survives', 'title', { text: 'the Exterminator' }),
  D('fx_embers', 'Boss Embers', 'Smouldering remains of a victory', 'effect', { type: 'trail', color: '#ff7b00', rate: 2, lifetime: 28 }),
);
for (const it of SHOP_ITEMS) if (/legendary/.test(it.description)) Object.assign(it, L);

// Three are drawn each day; {n} is the target, {tool} the tool.
const DAILY_TEMPLATES = [
  { type: 'tool', text: 'Use {tool} {n} times', min: 15, max: 40, gold: [40, 80], tools: ['Edit', 'Read', 'Bash', 'Grep', 'Write', 'Glob'] },
  { type: 'tools_total', text: 'Make {n} tool calls', min: 60, max: 150, gold: [40, 90] },
  { type: 'unique', text: 'Use {n} different tools', min: 6, max: 10, gold: [40, 80] },
  { type: 'subagent', text: 'Send {n} sub-agents on a mission', min: 1, max: 3, gold: [50, 100] },
  { type: 'mcp', text: 'Call MCP tools {n} times', min: 3, max: 10, gold: [50, 90] },
  { type: 'xp', text: 'Earn {n} XP', min: 200, max: 500, gold: [50, 100] },
  { type: 'fish', text: 'Catch {n} fish', min: 2, max: 5, gold: [30, 60] },
  { type: 'boss', text: 'Defeat a boss', min: 1, max: 1, gold: [100, 150] },
  { type: 'rare_fish', text: 'Catch a Context Carp or rarer', min: 1, max: 1, gold: [80, 150] },
];
const DAILY_BONUS = 100;

const FISH = [
  { id: 'goldfish', name: 'Goldfish', gold: 2, xp: 5, color: '#ffaa33', size: 8, weight: 40 },
  { id: 'blue_cod', name: 'Blue Cod', gold: 3, xp: 8, color: '#4488ff', size: 10, weight: 30 },
  { id: 'token_trout', name: 'Token Trout', gold: 5, xp: 12, color: '#ffdd44', size: 12, weight: 15 },
  { id: 'context_carp', name: 'Context Carp', gold: 8, xp: 20, color: '#44ddaa', size: 14, weight: 8 },
  { id: 'pixel_puffer', name: 'Pixel Puffer', gold: 12, xp: 30, color: '#ff66aa', size: 11, weight: 5 },
  { id: 'golden_koi', name: 'Golden Koi', gold: 25, xp: 50, color: '#ffe066', size: 16, weight: 2 },
];

const LOADOUT_SLOTS = ['skin', 'hat', 'map_theme', 'effect', 'companion', 'title'];

module.exports = { ACHIEVEMENTS, SHOP_ITEMS, FISH, LOADOUT_SLOTS, DAILY_TEMPLATES, DAILY_BONUS };
