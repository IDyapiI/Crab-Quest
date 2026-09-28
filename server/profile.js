// The single local player: progression, inventory and per-session history,
// persisted as JSON in data/. Every mutation goes through this module.

const fs = require('fs');
const path = require('path');
const { ACHIEVEMENTS, SHOP_ITEMS, FISH, LOADOUT_SLOTS, DAILY_TEMPLATES, DAILY_BONUS } = require('./catalog');
const { parseMcp } = require('./events');

const DATA_DIR = process.env.CRAB_QUEST_DATA || path.join(__dirname, '..', 'data');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const MAX_LEVEL = 99;

const ITEMS = Object.fromEntries(SHOP_ITEMS.map(it => [it.id, it]));

function freshProfile() {
  return {
    version: 1,
    name: 'Clawd',
    xp: 0,
    gold: 0,
    stats: { toolCalls: 0, tokens: 0, sessions: 0, compacts: 0, subagents: 0, fishCaught: 0, fishGold: 0, bosses: 0 },
    toolCounts: null, // lifetime uses per tool, built from history on first load
    mcpSlots: null,   // MCP server -> guild plaza slot
    uniqueTools: [],
    achievements: {}, // id -> ISO date unlocked
    inventory: {},    // item id -> quantity
    loadout: { skin: null, hat: null, map_theme: null, effect: null, companion: null, title: null },
    daily: null,
    settings: { permissions: { enabled: false, wait: 45 } },
    effects: [],      // active consumables: { itemId, type, data, expiresAt }
    createdAt: new Date().toISOString(),
  };
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

let profile = load(readJson(PROFILE_FILE, {}));

// Older saves lack newer fields: fill them from a fresh profile.
function load(saved) {
  const base = freshProfile();
  return {
    ...base, ...saved,
    stats: { ...base.stats, ...saved.stats },
    loadout: { ...base.loadout, ...saved.loadout },
    settings: { permissions: { ...base.settings.permissions, ...(saved.settings && saved.settings.permissions) } },
  };
}
let sessions = readJson(SESSIONS_FILE, {});

// ---- persistence: debounced, atomic (write + rename) ----

let saveTimer = null;
function writeAtomic(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
  fs.renameSync(tmp, file);
}
function flush() {
  clearTimeout(saveTimer);
  saveTimer = null;
  writeAtomic(PROFILE_FILE, profile);
  writeAtomic(SESSIONS_FILE, sessions);
}
function save() {
  if (!saveTimer) saveTimer = setTimeout(flush, 1000);
}
process.on('exit', () => { if (saveTimer) flush(); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { if (saveTimer) flush(); process.exit(0); });

// ---- levels ----

const xpForLevel = level => Math.floor(100 * Math.pow(level, 1.5));
function levelFromXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

// ---- effects ----

function activeEffects() {
  const now = Date.now();
  const before = profile.effects.length;
  profile.effects = profile.effects.filter(e => e.expiresAt > now);
  if (profile.effects.length !== before) save();
  return profile.effects;
}

function multiplier(type) {
  return activeEffects().filter(e => e.type === type).reduce((m, e) => Math.max(m, e.data.multiplier || 1), 1);
}

// ---- economy; every gain returns what happened so the game can celebrate ----

function newOutcome() {
  return { xp: 0, gold: 0, levelUp: null, achievements: [], daily: [] };
}

// ---- daily quests: three per local day, drawn from a seeded shuffle ----

function today() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296);
}

function daily() {
  const date = today();
  if (profile.daily && profile.daily.date === date) return profile.daily;
  const r = seeded(date);
  const pool = [...DAILY_TEMPLATES].sort(() => r() - 0.5).slice(0, 3);
  profile.daily = {
    date,
    bonusClaimed: false,
    unique: [],
    quests: pool.map((t, idx) => {
      const n = Math.round(t.min + r() * (t.max - t.min));
      const tool = t.tools ? t.tools[Math.floor(r() * t.tools.length)] : null;
      return {
        id: `${date}-${idx}`, type: t.type, tool, target: n, progress: 0, done: false,
        gold: Math.round(t.gold[0] + ((n - t.min) / Math.max(1, t.max - t.min)) * (t.gold[1] - t.gold[0])),
        text: t.text.replace('{n}', n).replace('{tool}', tool),
      };
    }),
  };
  save();
  return profile.daily;
}

function dailyTick(type, amount, out, match = () => true) {
  const d = daily();
  for (const q of d.quests) {
    if (q.done || q.type !== type || !match(q)) continue;
    q.progress = Math.min(q.target, q.progress + amount);
    if (q.progress >= q.target) {
      q.done = true;
      gainGold(q.gold, out, { boost: false });
      out.daily.push({ text: q.text, gold: q.gold });
    }
  }
  if (!d.bonusClaimed && d.quests.every(q => q.done)) {
    d.bonusClaimed = true;
    gainGold(DAILY_BONUS, out, { boost: false });
    out.daily.push({ text: 'All daily quests complete!', gold: DAILY_BONUS });
  }
}

function gainXp(amount, out, { boost = true } = {}) {
  const gained = Math.round(amount * (boost ? multiplier('xp_boost') : 1));
  const before = levelFromXp(profile.xp);
  profile.xp += gained;
  out.xp += gained;
  dailyTick('xp', gained, out);
  const after = levelFromXp(profile.xp);
  if (after > before) {
    let bonus = 0;
    for (let l = before + 1; l <= after; l++) if (l % 5 === 0) bonus += 50;
    profile.gold += bonus;
    out.gold += bonus;
    out.levelUp = { level: after, gold: bonus };
  }
  return gained;
}

function gainGold(amount, out, { boost = true } = {}) {
  const gained = Math.round(amount * (boost ? multiplier('gold_boost') : 1));
  profile.gold += gained;
  out.gold += gained;
  return gained;
}

function statValue(stat) {
  if (stat === 'level') return levelFromXp(profile.xp);
  if (stat === 'uniqueTools') return profile.uniqueTools.length;
  return profile.stats[stat] || 0;
}

// Rewards can level you up, which can unlock more: loop until stable.
function checkAchievements(out) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const ach of ACHIEVEMENTS) {
      if (profile.achievements[ach.id] || statValue(ach.stat) < ach.threshold) continue;
      profile.achievements[ach.id] = new Date().toISOString();
      gainGold(ach.gold, out, { boost: false });
      if (ach.xp) gainXp(ach.xp, out, { boost: false });
      out.achievements.push({ id: ach.id, name: ach.name, gold: ach.gold, xp: ach.xp });
      changed = true;
    }
  }
}

function finish(out) {
  checkAchievements(out);
  save();
  return out;
}

// Lifetime uses per tool (villager levels), with MCP tools counted per
// server as "mcp:<server>". Seeded once from the history.
function countKey(tool) {
  const mcp = parseMcp(tool);
  return mcp ? `mcp:${mcp.server}` : tool;
}

function toolCounts() {
  if (!profile.toolCounts) {
    profile.toolCounts = {};
    for (const s of Object.values(sessions)) {
      for (const [t, n] of Object.entries(s.tools || {})) profile.toolCounts[countKey(t)] = (profile.toolCounts[countKey(t)] || 0) + n;
    }
    save();
  }
  return profile.toolCounts;
}

// ---- the MCP guild: each server keeps its plaza slot for good ----

const MCP_SLOT_COUNT = 6;

function mcpSlots() {
  if (!profile.mcpSlots) {
    // First run: the most used servers get the plaza.
    const ranked = Object.entries(toolCounts()).filter(([t]) => t.startsWith('mcp:')).sort((a, b) => b[1] - a[1]);
    profile.mcpSlots = Object.fromEntries(ranked.slice(0, MCP_SLOT_COUNT).map(([t], i) => [t.slice(4), i]));
    save();
  }
  return profile.mcpSlots;
}

// Slot for a server, assigned on first sight; -1 once the plaza is full.
function ensureMcpSlot(server) {
  const slots = mcpSlots();
  if (slots[server] != null) return slots[server];
  const used = new Set(Object.values(slots));
  for (let i = 0; i < MCP_SLOT_COUNT; i++) {
    if (!used.has(i)) { slots[server] = i; save(); return i; }
  }
  return -1;
}

// ---- session history ----

function sessionRecord(id) {
  if (!sessions[id]) {
    sessions[id] = { title: null, project: null, startedAt: new Date().toISOString(), endedAt: null, toolCalls: 0, tokens: 0, costUsd: 0, compacts: 0, xpEarned: 0, tools: {} };
  }
  return sessions[id];
}

// ---- gameplay hooks, called by the store for each event ----

function onToolUsed(sessionId, tool) {
  const out = newOutcome();
  const rec = sessionRecord(sessionId);
  profile.stats.toolCalls++;
  rec.toolCalls++;
  rec.tools[tool] = (rec.tools[tool] || 0) + 1;
  if (!profile.uniqueTools.includes(tool)) profile.uniqueTools.push(tool);
  const counts = toolCounts();
  counts[tool] = (counts[tool] || 0) + 1;
  rec.xpEarned += gainXp(5, out);
  const d = daily();
  dailyTick('tools_total', 1, out);
  dailyTick('tool', 1, out, q => q.tool === tool);
  if (tool.startsWith('mcp:')) dailyTick('mcp', 1, out);
  if (!d.unique.includes(tool)) { d.unique.push(tool); dailyTick('unique', 1, out); }
  return finish(out);
}

function onSessionSeen(sessionId, meta = {}) {
  const out = newOutcome();
  const isNew = !sessions[sessionId];
  const rec = sessionRecord(sessionId);
  if (meta.title) rec.title = meta.title;
  if (meta.project) rec.project = meta.project;
  rec.endedAt = new Date().toISOString();
  if (isNew) profile.stats.sessions++;
  return finish(out);
}

function onSubagent(sessionId) {
  const out = newOutcome();
  profile.stats.subagents++;
  sessionRecord(sessionId).xpEarned += gainXp(20, out);
  dailyTick('subagent', 1, out);
  return finish(out);
}

function onCompact(sessionId) {
  const out = newOutcome();
  profile.stats.compacts++;
  const rec = sessionRecord(sessionId);
  rec.compacts++;
  rec.xpEarned += gainXp(100, out);
  return finish(out);
}

// Token totals come from the transcript; only the growth since the last
// reading is added, and the last reading is persisted with the session.
function onUsage(sessionId, tokens, costUsd) {
  const out = newOutcome();
  const rec = sessionRecord(sessionId);
  if (tokens > rec.tokens) {
    profile.stats.tokens += tokens - rec.tokens;
    rec.tokens = tokens;
  }
  if (costUsd != null) rec.costUsd = costUsd;
  return finish(out);
}

// ---- shop ----

function buy(itemId) {
  const item = ITEMS[itemId];
  if (!item) return { error: 'Unknown item' };
  if (item.drop) return { error: 'Only bosses drop this' };
  if (levelFromXp(profile.xp) < item.level) return { error: `Requires level ${item.level}` };
  if (!item.consumable && profile.inventory[itemId]) return { error: 'Already owned' };
  if (profile.gold < item.price) return { error: 'Not enough gold' };
  profile.gold -= item.price;
  profile.inventory[itemId] = (profile.inventory[itemId] || 0) + 1;
  return { ok: true, ...finish(newOutcome()) };
}

function use(itemId) {
  const item = ITEMS[itemId];
  if (!item || !item.consumable) return { error: 'Not a consumable' };
  if (!profile.inventory[itemId]) return { error: 'None left' };
  if (--profile.inventory[itemId] <= 0) delete profile.inventory[itemId];
  const effect = { itemId, type: item.data.type, data: item.data, expiresAt: Date.now() + (item.data.duration || 300) * 1000 };
  if (effect.type !== 'fireworks') profile.effects.push(effect);
  save();
  return { ok: true, effect };
}

function equip(slot, itemId) {
  if (!LOADOUT_SLOTS.includes(slot)) return { error: 'Unknown slot' };
  // Decorations are shown in the house as soon as they are owned.
  if (itemId) {
    const item = ITEMS[itemId];
    if (!item || item.category !== slot) return { error: 'Item does not fit this slot' };
    if (!profile.inventory[itemId]) return { error: 'Not owned' };
  }
  profile.loadout[slot] = itemId || null;
  save();
  return { ok: true };
}

// ---- bosses ----

const { DROPS } = require('./boss');

function bossDefeated(sessionId, boss) {
  const out = newOutcome();
  profile.stats.bosses++;
  const gold = gainGold(40 + boss.max * 4, out);
  sessionRecord(sessionId).xpEarned += gainXp(boss.max * 10, out);
  dailyTick('boss', 1, out);
  const missing = DROPS.filter(id => !profile.inventory[id]);
  if (missing.length && Math.random() < 0.3) {
    const id = missing[Math.floor(Math.random() * missing.length)];
    profile.inventory[id] = 1;
    out.drop = { id, name: ITEMS[id].name };
  }
  out.bossGold = gold;
  return finish(out);
}

// ---- fishing ----

function fish(fishId) {
  const f = FISH.find(x => x.id === fishId);
  if (!f) return { error: 'Unknown fish' };
  const out = newOutcome();
  profile.stats.fishCaught++;
  profile.stats.fishGold += gainGold(f.gold, out);
  gainXp(f.xp, out);
  dailyTick('fish', 1, out);
  if (f.gold >= 8) dailyTick('rare_fish', 1, out);
  return { ok: true, fish: f, ...finish(out) };
}

// ---- settings ----

function settings() {
  return profile.settings;
}

function updateSettings(patch) {
  const p = patch.permissions || {};
  const cur = profile.settings.permissions;
  if (typeof p.enabled === 'boolean') cur.enabled = p.enabled;
  if (Number.isFinite(p.wait)) cur.wait = Math.max(10, Math.min(300, Math.round(p.wait)));
  save();
  return profile.settings;
}

// ---- snapshots ----

function snapshot() {
  const level = levelFromXp(profile.xp);
  return {
    name: profile.name,
    xp: profile.xp,
    level,
    levelXp: xpForLevel(level),
    nextLevelXp: level >= MAX_LEVEL ? null : xpForLevel(level + 1),
    gold: profile.gold,
    stats: { ...profile.stats, uniqueTools: profile.uniqueTools.length },
    toolCounts: toolCounts(),
    mcpSlots: mcpSlots(),
    loadout: profile.loadout,
    inventory: profile.inventory,
    effects: activeEffects(),
    achievements: { unlocked: Object.keys(profile.achievements).length, total: ACHIEVEMENTS.length },
    daily: (({ date, quests, bonusClaimed }) => ({ date, quests, bonusClaimed, bonus: DAILY_BONUS }))(daily()),
  };
}

function achievementList() {
  return ACHIEVEMENTS.map(ach => ({
    ...ach,
    progress: Math.min(statValue(ach.stat), ach.threshold),
    unlockedAt: profile.achievements[ach.id] || null,
  }));
}

function history() {
  return Object.entries(sessions)
    .map(([id, s]) => ({ id, ...s }))
    .sort((x, y) => (y.startedAt || '').localeCompare(x.startedAt || ''));
}

function mergeSession(id, data) {
  const rec = sessionRecord(id);
  for (const [k, v] of Object.entries(data)) {
    if (v == null) continue;
    if (k === 'startedAt') rec.startedAt = !rec.startedAt || v < rec.startedAt ? v : rec.startedAt;
    else if (typeof v === 'number' && typeof rec[k] === 'number') rec[k] = Math.max(rec[k], v);
    else rec[k] = v;
  }
  save();
}

module.exports = {
  onToolUsed, onSessionSeen, onSubagent, onCompact, onUsage, bossDefeated, ensureMcpSlot,
  buy, use, equip, fish, settings, updateSettings,
  snapshot, achievementList, history, mergeSession, flush,
  catalog: { items: SHOP_ITEMS, fish: FISH },
  get raw() { return profile; },
  get sessions() { return sessions; },
};
