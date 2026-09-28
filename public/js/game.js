import {
  STILE, SCALE, clawdSprites, villagerSprites, iconSprites, sidekickSprite, shadowSprite, bubbleSprite,
  propSprite, emoteSprites,
} from './sprites.js';
import { WIDTH, HEIGHT, HOME, background, block, findPath } from './world.js';
import { STATIONS, GUILD_MASTER, stationKeyFor, mcpStation } from './tools.js';
import * as fx from './fx.js';
import { createCosmetics } from './cosmetics.js';
import { drawDecor } from './decor.js';
import { drawHouse } from './house.js';
import { stationCounts, tierFor, VILLAGER_TIERS } from './tools.js';
import { createBossFight } from './bossfight.js';

const FONT_TITLE = '"Press Start 2P", monospace';
const FONT_TEXT = '"VT323", monospace';

const WALK_SPEED = 2 * SCALE;       // px per frame
const MIN_WORK_FRAMES = 45;         // time spent at a villager, at least
const MAX_WAIT_FRAMES = 6 * 60;     // then move on even without a result
const IDLE_BEFORE_HOME = 90;        // frames idle before walking home
const MAX_SPEEDUP = 5;
const FISH_SPOT = [9, 2];            // on the bridge, facing the river

// Assets are shared between instances (the grid view runs many games).
let assets = null;
function loadAssets() {
  if (assets) return assets;
  assets = {
    hero: clawdSprites(),
    shadow: shadowSprite(),
    icons: iconSprites(2),
    bubbles: Object.fromEntries(['alert', 'wait', 'ok', 'fail', 'zzz', 'think', 'idea'].map(k => [k, bubbleSprite(k)])),
    sidekick: sidekickSprite(),
    emotes: emoteSprites(),
  };
  return assets;
}

const tileOf = p => [Math.round(p.x / STILE), Math.round(p.y / STILE)];
const pick = list => list[Math.floor(Math.random() * list.length)];

export function createGame(canvasEl, { mini = false, onCatch = null, onVillagerClick = null } = {}) {
  const A = loadAssets();
  const ctx = canvasEl.getContext('2d');
  canvasEl.width = WIDTH;
  canvasEl.height = HEIGHT;
  ctx.imageSmoothingEnabled = false;

  const look = createCosmetics();
  let counts = null; // lifetime uses per station, for villager tiers
  const villagers = new Map(); // station key -> villager

  const state = {
    tick: 0,
    hero: { x: HOME[0] * STILE, y: HOME[1] * STILE, dir: 'down', frame: 0, anim: 0, path: [], sleeping: false },
    queue: [],
    job: null,
    jobs: new Map(), // toolUseId -> job
    idle: 0,
    sidekicks: new Map(),
    dialog: null,
    banner: null,
    levelUp: 0,
    floaters: [], // "+5 XP" style popups
    idea: 0,
    profile: null,
    items: {},
    fishTable: [],
    fishing: null,
    house: { open: false, fade: 0 },
    particles: [],
    weather: fx.createWeather(),
    shake: 0,
    session: null,
    level: 1,
    hover: null,
  };

  function addVillager(key, station) {
    const [x, y] = station.at;
    block(x, y);
    const v = {
      key, station, x: x * STILE, y: y * STILE,
      sprites: villagerSprites(station.colors, station.hat, station.outfit),
      prop: propSprite(station.prop, station.colors.accent),
      jump: 0, vy: 0, glow: 0, bubble: null, blink: Math.random() * 200,
      tier: counts ? tierFor(counts[key] || 0) : 0,
      emote: null, wave: 0, lastWave: -9999, nextMood: 300 + Math.random() * 900,
    };
    villagers.set(key, v);
    return v;
  }

  for (const [key, st] of Object.entries(STATIONS)) addVillager(key, st);
  addVillager('mcp:*', GUILD_MASTER);

  // Each MCP server keeps the plaza slot the profile gave it.
  function ensureMcpVillager(server, slot) {
    const key = 'mcp:' + server;
    if (villagers.has(key)) return villagers.get(key);
    const st = slot != null && slot >= 0 ? mcpStation(server, slot) : null;
    return st ? addVillager(key, st) : villagers.get('mcp:*');
  }

  function villagerFor(tool, mcp) {
    if (mcp) return ensureMcpVillager(mcp.server, mcp.slot);
    const key = stationKeyFor(tool);
    return villagers.get(key) || villagers.get('Wanderer');
  }

  // ---- speech ----

  const fight = createBossFight({
    burst: (x, y, c, n) => fx.burst(state.particles, x, y, c, n),
    stars: (x, y) => fx.stars(state.particles, x, y),
    banner: (...a) => banner(...a),
    shake: n => { state.shake = n; },
    mini,
  });

  const tierName = v => VILLAGER_TIERS[v.tier].name;
  function lineFor(v) {
    const st = v.station;
    if (v.tier >= 3 && st.master && Math.random() < 0.4) {
      const n = counts ? counts[v.key] || 0 : 0;
      return pick(st.master).replace('{n}', n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n);
    }
    return pick(st.lines);
  }
  const speakerFor = v => (v.tier >= 2 ? `${v.station.label} ${tierName(v)}` : v.station.label);

  function say(text, speaker, opts = {}) {
    if (mini) return;
    state.dialog = { text, speaker, shown: 0, hold: opts.hold || 150, error: !!opts.error, portrait: opts.portrait || null };
  }

  function banner(text, color, opts = {}) {
    state.banner = { text, color, timer: opts.sticky ? Infinity : (opts.timer || 240), id: opts.id || null, pulse: !!opts.pulse };
  }

  function clearBanner(id) {
    if (state.banner && state.banner.id === id) state.banner.timer = Math.min(state.banner.timer, 20);
  }

  function react(v, result) {
    v.vy = -5; v.jump = 0.01; v.glow = 90;
    v.bubble = result ? { kind: result, timer: 70 } : null;
  }

  // ---- jobs: one per tool call, Pre and Post matched by tool_use_id ----

  function enqueue(evt, result = null) {
    if (thinking()) state.idea = 36; // the lightbulb moment
    const job = { evt, villager: villagerFor(evt.tool, evt.mcp), result, error: evt.error || null, waiting: false };
    if (evt.toolUseId) state.jobs.set(evt.toolUseId, job);
    state.queue.push(job);
    if (state.fishing) stopFishing();
    state.hero.sleeping = false;
    return job;
  }

  function resolve(evt) {
    const job = evt.toolUseId && state.jobs.get(evt.toolUseId);
    const result = evt.isError ? 'fail' : 'ok';
    if (!job) { enqueue(evt, result); return; }
    job.result = result;
    job.error = evt.error || null;
    job.waiting = false;
    state.jobs.delete(evt.toolUseId);
    // The hero already moved on: the villager shows the late result itself.
    if (job.done) react(job.villager, result);
  }

  function thinking() {
    const s = state.session;
    return !!s && s.status === 'thinking' && !state.job && !state.queue.length && !state.fishing;
  }

  function speedup() {
    return Math.min(MAX_SPEEDUP, 1 + Math.max(0, state.queue.length - 1) * 0.6);
  }

  function startNextJob() {
    const job = state.queue.shift();
    if (!job) return;
    state.job = job;
    job.stage = 'walking';
    const v = job.villager;
    state.hero.path = findPath(tileOf(state.hero), v.station.at);
    job.frames = 0;
  }

  function arrive(job) {
    const h = state.hero, v = job.villager;
    const dx = v.x - h.x, dy = v.y - h.y;
    h.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    job.stage = 'working';
    job.frames = 0;
    react(v, null);
    fx.burst(state.particles, h.x + STILE / 2, h.y + 8, v.station.colors.body, 8);
    const detail = job.evt.detail ? ` ${job.evt.detail}` : '';
    say(`${lineFor(v)}${detail ? ' —' + detail : ''}`, speakerFor(v), { portrait: v });
  }

  function finish(job) {
    job.done = true;
    const v = job.villager;
    if (job.result) {
      react(v, job.result);
      if (job.result === 'fail') {
        state.shake = 18;
        fx.burst(state.particles, state.hero.x + STILE / 2, state.hero.y, '#e5534b', 14);
        const oops = v.station.fail ? pick(v.station.fail) : `${v.station.label} failed!`;
        say(`${oops}${job.error ? ' — ' + job.error : ''}`, speakerFor(v), { error: true, portrait: v, hold: 200 });
      }
    }
    state.job = null;
  }

  function updateHero() {
    const h = state.hero;
    const job = state.job;
    const speed = WALK_SPEED * speedup();

    if (!job && state.queue.length) startNextJob();

    if (h.path.length) {
      const [tx, ty] = h.path[0];
      const px = tx * STILE, py = ty * STILE;
      const dx = px - h.x, dy = py - h.y;
      if (Math.abs(dx) > Math.abs(dy)) h.dir = dx > 0 ? 'right' : 'left';
      else if (dy) h.dir = dy > 0 ? 'down' : 'up';
      h.x += Math.sign(dx) * Math.min(speed, Math.abs(dx));
      h.y += Math.sign(dy) * Math.min(speed, Math.abs(dy));
      if (h.x === px && h.y === py) h.path.shift();
      if (++h.anim >= Math.max(3, Math.round(9 / speedup()))) { h.frame = (h.frame + 1) % 4; h.anim = 0; }
      state.idle = 0;
      return;
    }
    h.frame = 0;

    if (job) {
      if (job.stage === 'walking') { arrive(job); return; }
      job.frames++;
      const minFrames = MIN_WORK_FRAMES / speedup();
      const waited = job.frames >= MAX_WAIT_FRAMES || state.queue.length > 0;
      job.waiting = !job.result && job.frames > minFrames;
      if (job.frames >= minFrames && (job.result || waited)) finish(job);
      return;
    }

    if (state.fishing) { updateFishing(); return; }

    // While Claude thinks, Clawd stays put and ponders.
    if (thinking()) { state.idle = 0; h.dir = 'down'; return; }

    // Idle: wander home after a moment.
    const [hx, hy] = tileOf(h);
    if (hx !== HOME[0] || hy !== HOME[1]) {
      if (++state.idle > IDLE_BEFORE_HOME) h.path = findPath([hx, hy], HOME);
    } else if (h.sleeping) {
      h.dir = 'down';
    }
  }

  // ---- fishing mini-game: F to start, Space to reel ----

  function rollFish() {
    const lure = state.profile && (state.profile.effects || []).find(e => e.type === 'fish_lure');
    const table = state.fishTable.map((f, i) => ({ f, w: f.weight * (lure && i >= 2 ? lure.data.bonus : 1) }));
    let r = Math.random() * table.reduce((s, x) => s + x.w, 0);
    for (const x of table) if ((r -= x.w) <= 0) return x.f;
    return table[0].f;
  }

  function startFishing() {
    if (mini || state.fishing || state.house.open || !state.fishTable.length) return;
    if (state.job || state.queue.length) { say('Busy with a quest… fishing later!', 'CLAWD'); return; }
    state.hero.sleeping = false;
    state.hero.path = findPath(tileOf(state.hero), FISH_SPOT);
    state.fishing = { phase: 'walk', t: 0, fish: null, caught: 0, gold: 0 };
  }

  function stopFishing() {
    const f = state.fishing;
    if (!f) return;
    state.fishing = null;
    state.idle = 0;
    if (f.caught) banner(`FISHING DONE: ${f.caught} FISH, +${f.gold} G`, '#4cc9f0', { timer: 220 });
  }

  function reel() {
    const f = state.fishing;
    if (f && f.phase === 'bite') { f.phase = 'reel'; f.t = 30; }
  }

  function updateFishing() {
    const f = state.fishing, h = state.hero;
    f.t--;
    switch (f.phase) {
      case 'walk': {
        const [x, y] = tileOf(h);
        if (x === FISH_SPOT[0] && y === FISH_SPOT[1]) { f.phase = 'cast'; f.t = 40; h.dir = 'left'; }
        else if (!h.path.length) h.path = findPath([x, y], FISH_SPOT);
        break;
      }
      case 'cast': if (f.t <= 0) { f.phase = 'wait'; f.t = 120 + Math.random() * 300; } break;
      case 'wait': if (f.t <= 0) { f.phase = 'bite'; f.t = 45; f.fish = rollFish(); } break;
      case 'bite': if (f.t <= 0) { f.phase = 'missed'; f.t = 90; } break;
      case 'reel':
        if (f.t <= 0) {
          f.phase = 'caught'; f.t = 120; f.caught++; f.gold += f.fish.gold;
          fx.burst(state.particles, h.x, h.y, f.fish.color, 15);
          if (onCatch) onCatch(f.fish);
        }
        break;
      case 'caught': case 'missed': if (f.t <= 0) { f.phase = 'cast'; f.t = 40; } break;
    }
  }

  function drawFishing() {
    const f = state.fishing;
    if (!f || f.phase === 'walk') return;
    const h = state.hero;
    const hand = [h.x + 6, h.y + 24];
    const water = [(FISH_SPOT[0] - 1) * STILE + 12, FISH_SPOT[1] * STILE + 30];
    const shake = f.phase === 'bite' ? Math.sin(state.tick * 1.3) * 3 : Math.sin(state.tick / 15) * 1.5;
    const bob = f.phase === 'cast' ? [hand[0] + (water[0] - hand[0]) * (1 - f.t / 40), hand[1] + (water[1] - hand[1]) * (1 - f.t / 40) - Math.sin((1 - f.t / 40) * Math.PI) * 30] : [water[0], water[1] + shake];
    ctx.strokeStyle = 'rgba(230,230,240,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hand[0], hand[1] - 16);
    ctx.quadraticCurveTo((hand[0] + bob[0]) / 2, hand[1] - 30, bob[0], bob[1]);
    ctx.stroke();
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(hand[0] - 2, hand[1] - 20, SCALE, 22);
    if (f.phase !== 'caught') {
      ctx.fillStyle = '#e5534b'; ctx.fillRect(bob[0] - 4, bob[1] - 4, 8, 5);
      ctx.fillStyle = '#f4efe6'; ctx.fillRect(bob[0] - 4, bob[1] + 1, 8, 3);
    }
    if (f.phase === 'wait') label('waiting…', h.x + STILE / 2, h.y + STILE + 2, '#4cc9f0');
    if (f.phase === 'bite') {
      ctx.drawImage(A.bubbles.alert, h.x + STILE / 2 - 12, h.y - 30);
      ctx.fillStyle = '#1c1424'; ctx.fillRect(h.x + 4, h.y + STILE + 4, 40, 6);
      ctx.fillStyle = f.t / 45 > 0.3 ? '#63d471' : '#e5534b'; ctx.fillRect(h.x + 5, h.y + STILE + 5, 38 * (f.t / 45), 4);
      label('SPACE!', h.x + STILE / 2, h.y + STILE + 14, '#f2c14e');
    }
    if (f.phase === 'reel') {
      const k = 1 - f.t / 30;
      ctx.fillStyle = f.fish.color;
      ctx.fillRect(bob[0] + (hand[0] - bob[0]) * k - 8, bob[1] + (hand[1] - 30 - bob[1]) * k, 16, 8);
    }
    if (f.phase === 'caught') {
      const y = h.y - 30 + Math.sin(state.tick / 6) * 3;
      ctx.fillStyle = f.fish.color;
      ctx.fillRect(h.x + 12, y, f.fish.size * 2, f.fish.size);
      ctx.fillRect(h.x + 6, y - 3, 6, f.fish.size + 6);
      label(`${f.fish.name} +${f.fish.gold}G`, h.x + STILE / 2, y - 22, f.fish.color);
    }
    if (f.phase === 'missed') {
      ctx.strokeStyle = `rgba(200,230,255,${f.t / 90})`;
      ctx.beginPath();
      ctx.ellipse(water[0], water[1], (90 - f.t) / 3, (90 - f.t) / 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (f.t > 60) label('It got away…', h.x + STILE / 2, h.y + STILE + 2, '#9a93b5');
    }
  }

  // ---- house ----

  function toggleHouse() {
    if (mini) return;
    state.house.open = !state.house.open;
    if (state.house.open) stopFishing();
  }

  function drawHouseLayer() {
    const hs = state.house;
    hs.fade = Math.max(0, Math.min(1, hs.fade + (hs.open ? 0.08 : -0.08)));
    if (!hs.fade) return;
    const pet = look.pet;
    drawHouse(ctx, {
      alpha: hs.fade, tick: state.tick, profile: state.profile, items: state.items,
      heroSprites: look.heroSprites, heroAlpha: look.heroAlpha, pet, drawHat: look.drawHat,
      decor: Object.keys((state.profile && state.profile.inventory) || {}).filter(id => id.startsWith('decor_')).map(id => id.slice(6)),
      tools: stationCounts((state.profile && state.profile.toolCounts) || {}),
    });
  }

  function drawHouseHint() {
    const [hx, hy] = tileOf(state.hero);
    if (mini || state.house.open || hx !== HOME[0] || hy !== HOME[1] || state.job) return;
    label('[E] ENTER', (HOME[0] + 0.5) * STILE, (HOME[1] - 2) * STILE - 30 + Math.round(Math.sin(state.tick / 12) * 2), '#f2c14e');
  }

  // ---- village life: moods, greetings and chatter while nobody works ----

  const MOODS = ['note', 'dots', 'heart', 'star'];
  let nextChat = 600;

  function updateVillage() {
    if (mini) return;
    const h = state.hero;
    const night = fx.timeOfDay() === 'night';
    for (const v of villagers.values()) {
      const busy = state.job && state.job.villager === v;
      if (v.emote && --v.emote.timer <= 0) v.emote = null;
      if (v.wave > 0) v.wave--;
      if (busy) continue;
      // Wave at Clawd when he walks past.
      const d = Math.hypot(h.x - v.x, h.y - v.y);
      if (d < STILE * 1.6 && h.path.length && state.tick - v.lastWave > 900) {
        v.wave = 50; v.lastWave = state.tick;
        v.emote = { kind: 'hi', timer: 50 };
      }
      if (--v.nextMood <= 0) {
        v.nextMood = 600 + Math.random() * 1500;
        if (night && Math.random() < 0.6) v.emote = { kind: 'zzz', timer: 200 };
        else if (v.tier >= 3 && Math.random() < 0.3) v.emote = { kind: 'star', timer: 90 };
        else v.emote = { kind: pick(MOODS), timer: 90 };
      }
    }
    // Two neighbours chat now and then.
    if (--nextChat <= 0) {
      nextChat = 900 + Math.random() * 1800;
      const all = [...villagers.values()];
      const a = pick(all);
      const b = all.filter(o => o !== a && Math.hypot(o.x - a.x, o.y - a.y) < STILE * 3.2)[0];
      if (b) {
        for (let i = 0; i < 4; i++) {
          setTimeout(() => { (i % 2 ? b : a).emote = { kind: 'dots', timer: 55 }; }, i * 900);
        }
      }
    }
  }

  // ---- sub-agents: little Clawds running their own errands ----

  function sidekick(id, type) {
    let s = state.sidekicks.get(id);
    if (!s) {
      const home = villagers.get('Agent');
      const [ax, ay] = home.station.at;
      s = { id, type, x: ax * STILE, y: (ay + 1) * STILE, path: [], leaving: false, bob: Math.random() * 10 };
      state.sidekicks.set(id, s);
      fx.burst(state.particles, s.x + STILE / 2, s.y + STILE / 2, '#e4ccff', 10);
    }
    return s;
  }

  function sidekickGo(s, villager) {
    s.path = findPath(tileOf(s), villager.station.at);
    s.target = villager;
  }

  function updateSidekicks() {
    for (const s of state.sidekicks.values()) {
      s.bob++;
      if (s.path.length) {
        const [tx, ty] = s.path[0];
        const px = tx * STILE, py = ty * STILE;
        const dx = px - s.x, dy = py - s.y;
        const sp = WALK_SPEED * 1.2;
        s.x += Math.sign(dx) * Math.min(sp, Math.abs(dx));
        s.y += Math.sign(dy) * Math.min(sp, Math.abs(dy));
        if (s.x === px && s.y === py) s.path.shift();
        if (!s.path.length && s.target) { react(s.target, null); s.target = null; }
      } else if (s.leaving) {
        fx.burst(state.particles, s.x + STILE / 2, s.y + STILE / 2, '#e4ccff', 12);
        state.sidekicks.delete(s.id);
      }
    }
  }

  // ---- incoming events ----

  function handleEvent(evt) {
    if (evt.agentId && evt.tool) {
      const s = sidekick(evt.agentId, evt.agentType);
      const v = villagerFor(evt.tool, evt.mcp);
      if (evt.hook === 'PreToolUse') sidekickGo(s, v);
      else if (evt.hook === 'PostToolUseFailure') react(v, 'fail');
      return;
    }

    switch (evt.hook) {
      case 'PreToolUse':
        if (!evt.toolUseId || !state.jobs.has(evt.toolUseId)) enqueue(evt);
        break;
      case 'PostToolUse':
      case 'PostToolUseFailure':
        resolve(evt);
        clearBanner('permission');
        break;
      case 'PermissionRequest': {
        const job = state.jobs.get(evt.toolUseId);
        if (job) job.waiting = true;
        banner(`PERMISSION NEEDED: ${evt.tool}${evt.detail ? ' · ' + evt.detail : ''}`, '#f3722c', { sticky: true, id: 'permission', pulse: true });
        break;
      }
      case 'PermissionDenied':
        resolve({ ...evt, isError: true });
        clearBanner('permission');
        break;
      case 'Notification':
        if (evt.notificationType === 'permission_prompt' || /permission|approv/i.test(evt.message || '')) {
          banner(evt.message || 'Claude needs your permission', '#f3722c', { sticky: true, id: 'permission', pulse: true });
        } else if (evt.message) {
          banner(evt.message, '#4895ef');
        }
        break;
      case 'UserPromptSubmit':
        state.hero.sleeping = false;
        clearBanner('permission');
        say(evt.prompt ? `New quest: ${evt.prompt}` : 'A new quest!', 'YOU', { hold: 200 });
        fx.stars(state.particles, state.hero.x + STILE / 2, state.hero.y);
        break;
      case 'SessionStart':
        say({ startup: 'A new adventure begins!', resume: 'The adventure continues...', clear: 'A fresh page!', compact: 'Memories restored.' }[evt.source] || 'Hello, hero!', 'CLAWD');
        break;
      case 'SubagentStart':
        sidekick(evt.agentId, evt.agentType);
        break;
      case 'SubagentStop': {
        const s = state.sidekicks.get(evt.agentId);
        if (s) { s.leaving = true; sidekickGo(s, villagers.get('Agent')); }
        break;
      }
      case 'PreCompact':
        banner('COMPACTING MEMORY...', '#4cc9f0', { id: 'compact', sticky: true, pulse: true });
        state.shake = 10;
        break;
      case 'PostCompact':
        clearBanner('compact');
        banner('MEMORY COMPACTED!', '#4cc9f0', { timer: 200 });
        fx.stars(state.particles, state.hero.x + STILE / 2, state.hero.y);
        break;
      case 'Stop':
        state.hero.sleeping = true;
        state.idle = IDLE_BEFORE_HOME;
        clearBanner('permission');
        banner('QUEST COMPLETE!', '#63d471', { timer: 200 });
        break;
      case 'StopFailure':
        banner(`QUEST FAILED${evt.error ? ': ' + evt.error : ''}`, '#e5534b', { timer: 400 });
        state.shake = 20;
        break;
    }
  }

  function setSession(snap) {
    if (!snap) return;
    // The quest board villager calls out when the quest list changes.
    const questSig = JSON.stringify((snap.quests || []).map(q => q.status + q.text));
    if (state.session && questSig !== state.questSig && (snap.quests || []).length) {
      const board = villagers.get('Quest');
      react(board, null);
      board.bubble = { kind: 'alert', timer: 240 };
    }
    state.questSig = questSig;
    if (snap.boss && !fight.active) fight.set(snap.boss);
    state.session = snap;
    state.weather.kind = fx.weatherFor((snap.context && snap.context.pct) || 0);
    for (const a of snap.subagents || []) sidekick(a.id, a.type);
    if (snap.status === 'done' && !state.job && !state.queue.length) state.hero.sleeping = true;
    if (snap.status === 'waiting' && !state.banner) banner('WAITING FOR YOU...', '#f3722c', { sticky: true, id: 'permission', pulse: true });
  }

  // ---- progression feedback (profile lives on the server) ----

  function setProfile(profile, items) {
    for (const [server, slot] of Object.entries(profile.mcpSlots || {})) ensureMcpVillager(server, slot);
    const next = stationCounts(profile.toolCounts || {});
    for (const v of villagers.values()) {
      const tier = tierFor(next[v.key] || 0);
      if (counts && tier > v.tier) {
        react(v, 'ok');
        fx.stars(state.particles, v.x + STILE / 2, v.y);
        banner(`${v.station.label} IS NOW ${VILLAGER_TIERS[tier].name}!`, '#e0c3fc', { timer: 240 });
      }
      v.tier = tier;
    }
    counts = next;
    state.level = profile.level;
    state.profile = profile;
    state.items = items;
    look.apply(items);
  }

  function floater(text, color) {
    if (mini) return;
    state.floaters.push({ text, color, x: state.hero.x + STILE / 2, y: state.hero.y - 8, life: 70 });
  }

  function celebrate(outcome) {
    if (!outcome) return;
    if (outcome.xp) floater(`+${outcome.xp} XP`, '#8ec5ff');
    if (outcome.gold) setTimeout(() => floater(`+${outcome.gold} G`, '#f2c14e'), 250);
    if (outcome.levelUp) {
      state.level = outcome.levelUp.level;
      state.levelUp = 150;
      fx.stars(state.particles, state.hero.x + STILE / 2, state.hero.y);
      fireworks(6);
    }
    (outcome.daily || []).forEach((d, i) => setTimeout(() => {
      banner(`DAILY QUEST: ${d.text} +${d.gold} G`, '#63d471', { timer: 240 });
      fx.stars(state.particles, state.hero.x + STILE / 2, state.hero.y);
    }, 300 + i * 2600));
    outcome.achievements.forEach((a, i) => setTimeout(() => {
      banner(`${a.name.toUpperCase()}! +${a.gold} G`, '#f2c14e', { timer: 260 });
      fx.stars(state.particles, state.hero.x + STILE / 2, state.hero.y);
    }, 600 + i * 2800));
  }

  function fireworks(count = 12) {
    const colors = ['#ff5f5f', '#63d471', '#5aa9e6', '#f2c14e', '#e36ee3', '#4cc9f0', '#ff9a3c'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const x = WIDTH * (0.2 + Math.random() * 0.6), y = HEIGHT * (0.1 + Math.random() * 0.4);
        fx.burst(state.particles, x, y, colors[i % colors.length], 18, 7);
      }, i * 180);
    }
  }

  function drawFloaters() {
    ctx.font = `10px ${FONT_TITLE}`;
    ctx.textBaseline = 'middle';
    for (let i = state.floaters.length - 1; i >= 0; i--) {
      const f = state.floaters[i];
      f.y -= 0.6;
      if (--f.life <= 0) { state.floaters.splice(i, 1); continue; }
      const w = ctx.measureText(f.text).width;
      ctx.globalAlpha = Math.min(1, f.life / 25);
      ctx.fillStyle = '#1c1424';
      ctx.fillText(f.text, f.x - w / 2 + 2, f.y + 2);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x - w / 2, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // Replay recent events without walking, so a reconnect shows current state.
  function sync(snap, recent = []) {
    state.session = null;
    setSession(snap);
    for (const evt of recent) {
      if (evt.hook === 'SubagentStop') state.sidekicks.delete(evt.agentId);
    }
  }

  // ---- drawing ----

  function drawSorted() {
    const actors = [];
    for (const v of villagers.values()) actors.push({ y: v.y, draw: () => drawVillager(v) });
    for (const s of state.sidekicks.values()) actors.push({ y: s.y, draw: () => drawSidekick(s) });
    actors.push({ y: state.hero.y + 1, draw: drawHero });
    const pet = look.petActor(ctx, state.tick);
    if (pet) actors.push(pet);
    actors.push({ y: 10 * STILE + 1, draw: () => fight.draw(ctx, state.tick) });
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw();
  }

  function drawVillager(v) {
    if (v.jump) {
      v.jump += v.vy; v.vy += 0.6;
      if (v.jump >= 0) { v.jump = 0; v.vy = 0; }
    }
    const y = v.y + v.jump;
    if (v.glow > 0) {
      v.glow--;
      ctx.globalAlpha = Math.min(0.45, v.glow / 90);
      ctx.fillStyle = v.station.colors.body;
      ctx.fillRect(v.x - 3, v.y + STILE - 12, STILE + 6, 12);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(A.shadow, v.x, v.y + STILE - 10);
    const blinking = (state.tick + v.blink) % 220 < 6;
    const frame = v.wave > 0 ? 3 : blinking ? 2 : (Math.floor((state.tick + v.blink) / 40) % 2);
    if (v.tier >= 2) { // Expert and up: a cape behind the villager
      ctx.fillStyle = v.tier >= 4 ? '#b8860b' : '#8f2f2b';
      ctx.fillRect(v.x + 9, y + 27, 30, 18);
    }
    ctx.drawImage(v.sprites[frame], v.x, y);
    if (v.tier >= 1) { // Adept: a scarf
      ctx.fillStyle = v.tier >= 4 ? '#f2c14e' : v.station.colors.accent;
      ctx.fillRect(v.x + 12, y + 27, 24, 4);
    }
    if (v.tier >= 3) { // Master: a star badge
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(v.x + 30, y + 33, 6, 6);
      ctx.fillStyle = '#fff6cc';
      ctx.fillRect(v.x + 32, y + 35, 2, 2);
    }
    if (v.prop && v.wave <= 0) {
      // Held at the right hand; readers lift their book now and then.
      const lift = (v.station.prop === 'book' || v.station.prop === 'tome') && (state.tick + v.blink) % 400 < 80 ? -9 : 0;
      ctx.drawImage(v.prop, v.x + 33, y + 24 + lift + (frame === 1 ? 3 : 0));
    }
    if (v.tier >= 4 && state.tick % 12 === 0) { // Legend: golden sparkles
      state.particles.push({ x: v.x + Math.random() * STILE, y: y + Math.random() * 30, vx: 0, vy: -0.6, life: 30, max: 30, color: '#f2c14e', size: SCALE });
    }

    // Icon badge above the head, bobbing gently.
    const icon = A.icons[v.station.icon];
    const bob = Math.round(Math.sin((state.tick + v.blink) / 18) * 2);
    if (!mini || v.glow) ctx.drawImage(icon, v.x + STILE / 2 - icon.width / 2, y - icon.height - 2 + bob);

    const active = state.job && state.job.villager === v;
    if (!mini && (active || state.hover === v)) label(state.hover === v ? `${v.station.label} · ${tierName(v)}` : speakerFor(v), v.x + STILE / 2, y - 26, v.station.colors.body);

    if (v.bubble) {
      ctx.drawImage(A.bubbles[v.bubble.kind], v.x + STILE - 6, y - 24);
      if (--v.bubble.timer <= 0) v.bubble = null;
    } else if (v.emote && !mini) {
      const img = v.emote.kind === 'zzz' ? A.bubbles.zzz : A.emotes[v.emote.kind];
      const rise = v.emote.kind === 'zzz' ? -((state.tick / 3) % 12) : 0;
      ctx.globalAlpha = Math.min(1, v.emote.timer / 15);
      ctx.drawImage(img, v.x + STILE - 10, y - 20 + rise);
      ctx.globalAlpha = 1;
    }
  }

  function drawHero() {
    const h = state.hero;
    const bob = h.path.length ? 0 : (Math.floor(state.tick / 30) % 2) * SCALE;
    ctx.drawImage(A.shadow, h.x, h.y + STILE - 10);
    look.drawBehind(ctx, look.heroSprites);
    ctx.globalAlpha = look.heroAlpha;
    const heroY = h.y + (h.path.length ? 0 : bob * (h.sleeping ? 0 : 1));
    ctx.drawImage(look.heroSprites[h.dir][h.frame], h.x, heroY);
    ctx.globalAlpha = 1;
    look.drawHat(ctx, h.x, heroY, h.frame, h.dir, state.tick);
    look.drawOrbit(ctx, h, state.tick);
    const job = state.job;
    if (job && job.stage === 'working') {
      const kind = job.waiting ? 'wait' : 'alert';
      if (job.waiting || job.frames < 40) ctx.drawImage(A.bubbles[kind], h.x + STILE / 2 - 12, h.y - 30 + Math.round(Math.sin(state.tick / 6) * 2));
    } else if (state.idea > 0) {
      state.idea--;
      ctx.drawImage(A.bubbles.idea, h.x + STILE / 2 - 12, h.y - 32 - (36 - state.idea) / 3);
    } else if (thinking()) {
      const b = A.bubbles.think;
      const bx = h.x + STILE / 2 - 6, by = h.y - 40 + Math.round(Math.sin(state.tick / 20) * 2);
      ctx.drawImage(b, bx, by);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = Math.floor(state.tick / 12) % 4 > i ? '#1c1424' : '#c9c3d9';
        ctx.fillRect(bx + 6 + i * 7, by + 7, 4, 4);
      }
      // Long reasoning gets a swirl of sparks.
      const since = state.session.thinkingSince;
      if (since && Date.now() - since > 20000) {
        for (let i = 0; i < 3; i++) {
          const a = state.tick / 10 + i * 2.1;
          ctx.fillStyle = ['#8ec5ff', '#e0c3fc', '#fff6cc'][i];
          ctx.fillRect(h.x + STILE / 2 + Math.cos(a) * 22, h.y - 4 + Math.sin(a) * 8, 3, 3);
        }
      }
    } else if (h.sleeping && !h.path.length) {
      const drift = (state.tick / 2) % 40;
      ctx.globalAlpha = 1 - drift / 40;
      ctx.drawImage(A.bubbles.zzz, h.x + STILE - 10 + drift / 4, h.y - 10 - drift);
      ctx.globalAlpha = 1;
    }
  }

  function drawSidekick(s) {
    const y = s.y + STILE - 30 + Math.round(Math.sin(s.bob / 4) * (s.path.length ? 3 : 1));
    ctx.drawImage(A.sidekick, s.x + 9, y);
  }

  function label(text, cx, y, color) {
    ctx.font = `8px ${FONT_TITLE}`;
    const w = Math.ceil(ctx.measureText(text).width) + 10;
    const x = Math.round(cx - w / 2);
    ctx.fillStyle = '#1c1424';
    ctx.fillRect(x, y, w, 14);
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 12, w, 2);
    ctx.fillStyle = '#f4efe6';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + 5, y + 3);
  }

  function frameBox(x, y, w, h, border = '#f4efe6', fill = '#1c1424') {
    ctx.fillStyle = '#0b0710';
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x + 4, y + 4, w - 8, 3);
  }

  function wrap(text, maxWidth) {
    const words = text.split(' ');
    const lines = [''];
    for (const w of words) {
      const trial = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w;
      if (ctx.measureText(trial).width > maxWidth && lines[lines.length - 1]) lines.push(w);
      else lines[lines.length - 1] = trial;
    }
    return lines;
  }

  function drawDialog() {
    const d = state.dialog;
    if (!d) return;
    if (d.shown < d.text.length) d.shown = Math.min(d.text.length, d.shown + 1.5);
    else if (--d.hold <= 0) { state.dialog = null; return; }

    const w = WIDTH - 64, h = 104;
    const x = 32;
    const top = state.hero.y > HEIGHT / 2;
    const y = top ? 58 : HEIGHT - h - 24;
    frameBox(x, y, w, h, d.error ? '#e5534b' : '#f4efe6', d.error ? '#2a0d12' : '#1c1424');

    let tx = x + 20;
    if (d.portrait) {
      ctx.fillStyle = '#2b2340';
      ctx.fillRect(x + 14, y + 14, 76, 76);
      ctx.drawImage(d.portrait.sprites[0], 0, 0, STILE, STILE, x + 16, y + 16, 72, 72);
      tx = x + 106;
    }
    ctx.font = `10px ${FONT_TITLE}`;
    ctx.textBaseline = 'top';
    const nameW = ctx.measureText(d.speaker).width + 20;
    frameBox(tx - 6, y - 16, nameW, 26, d.portrait ? d.portrait.station.colors.body : '#d97757', '#1c1424');
    ctx.fillStyle = '#f4efe6';
    ctx.fillText(d.speaker, tx + 4, y - 7);

    ctx.font = `28px ${FONT_TEXT}`;
    ctx.fillStyle = d.error ? '#ffb4ae' : '#f4efe6';
    const lines = wrap(d.text.slice(0, Math.floor(d.shown)), x + w - tx - 28).slice(0, 3);
    lines.forEach((line, i) => ctx.fillText(line, tx, y + 18 + i * 26));
    if (d.shown >= d.text.length && state.tick % 40 < 24) {
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(x + w - 30, y + h - 24, 12, 4);
      ctx.fillRect(x + w - 27, y + h - 20, 6, 4);
    }
  }

  function drawBanner() {
    const b = state.banner;
    if (!b) return;
    if (b.timer !== Infinity && --b.timer <= 0) { state.banner = null; return; }
    ctx.font = `${mini ? 16 : 12}px ${FONT_TITLE}`;
    const text = b.text.length > 64 ? b.text.slice(0, 63) + '…' : b.text;
    const w = Math.min(WIDTH - 40, ctx.measureText(text).width + 56);
    const h = mini ? 48 : 38;
    const x = (WIDTH - w) / 2, y = 10;
    ctx.globalAlpha = Math.min(1, b.timer / 20);
    const pulse = b.pulse && state.tick % 50 < 25;
    frameBox(x, y, w, h, pulse ? '#f4efe6' : b.color);
    ctx.fillStyle = b.color;
    if (state.tick % 30 < 20) ctx.fillRect(x + 16, y + h / 2 - 5, 10, 10);
    ctx.fillStyle = '#f4efe6';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 36, y + h / 2 + 1);
    ctx.globalAlpha = 1;
  }

  function drawLevelUp() {
    if (state.levelUp <= 0) return;
    state.levelUp--;
    const t = 150 - state.levelUp;
    if (t < 40) {
      ctx.strokeStyle = `rgba(242,193,78,${1 - t / 40})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(state.hero.x + STILE / 2, state.hero.y + STILE / 2, t * 5, 0, Math.PI * 2);
      ctx.stroke();
      if (t < 4) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, WIDTH, HEIGHT); }
    }
    ctx.globalAlpha = Math.min(1, state.levelUp / 30);
    ctx.font = `20px ${FONT_TITLE}`;
    ctx.textBaseline = 'middle';
    const text = `LEVEL UP! LV.${state.level}`;
    const w = ctx.measureText(text).width;
    const y = state.hero.y - 30 - Math.min(t, 40);
    ctx.fillStyle = '#1c1424';
    ctx.fillText(text, state.hero.x + STILE / 2 - w / 2 + 3, y + 3);
    ctx.fillStyle = t % 12 < 6 ? '#f2c14e' : '#fff6cc';
    ctx.fillText(text, state.hero.x + STILE / 2 - w / 2, y);
    ctx.globalAlpha = 1;
  }

  // ---- loop ----

  // Frames come from whichever window is visible: the page, or a
  // Picture-in-Picture window while the page itself is hidden.
  let running = true;
  let frameSource = window;
  let loopId = 0;
  function schedule(id) { frameSource.requestAnimationFrame(() => loop(id)); }
  function setFrameSource(source) {
    frameSource = source || window;
    schedule(++loopId);
  }
  function loop(id) {
    if (!running || id !== loopId) return;
    state.tick++;
    updateHero();
    updateSidekicks();
    updateVillage();
    look.update(state.hero, state.hero.path.length > 0, state.tick);
    fx.updateParticles(state.particles);
    fx.updateWeather(state.weather);

    ctx.save();
    if (state.shake > 0) {
      state.shake--;
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    ctx.drawImage(background(Math.floor(state.tick / 40), look.theme), 0, 0);
    const decorLights = drawDecor(ctx, state.level, state.tick);
    drawSorted();
    drawFishing();
    drawHouseHint();
    look.drawTrail(ctx);
    fx.drawParticles(ctx, state.particles);
    fx.drawWeather(ctx, state.weather);
    fx.drawDaylight(ctx, fx.timeOfDay(), state.tick, [[state.hero.x + STILE / 2, state.hero.y + STILE / 2, 70], ...decorLights]);
    ctx.restore();

    drawDialog();
    drawHouseLayer();
    drawFloaters();
    drawBanner();
    drawLevelUp();
    schedule(id);
  }
  schedule(loopId);

  // Hover shows villager names.
  const onMove = e => {
    const r = canvasEl.getBoundingClientRect();
    const x = (e.clientX - r.left) * (WIDTH / r.width), y = (e.clientY - r.top) * (HEIGHT / r.height);
    state.hover = [...villagers.values()].find(v => x >= v.x && x < v.x + STILE && y >= v.y - 20 && y < v.y + STILE) || null;
    canvasEl.style.cursor = state.hover ? 'pointer' : '';
  };
  const onLeave = () => { state.hover = null; };
  const onClick = () => { if (state.hover && onVillagerClick && !state.house.open) onVillagerClick(state.hover.key); };
  if (!mini) {
    canvasEl.addEventListener('mousemove', onMove);
    canvasEl.addEventListener('mouseleave', onLeave);
    canvasEl.addEventListener('click', onClick);
  }

  return {
    handleEvent,
    setSession,
    setProfile,
    celebrate,
    fireworks,
    startFishing,
    stopFishing,
    toggleFishing: () => (state.fishing ? stopFishing() : startFishing()),
    reel,
    toggleHouse,
    setFrameSource,
    handleBoss: e => fight.onEvent(e, state.hero),
    setFishTable: table => { state.fishTable = table; },
    sync,
    say,
    banner,
    destroy() {
      running = false;
      canvasEl.removeEventListener('mousemove', onMove);
      canvasEl.removeEventListener('mouseleave', onLeave);
      canvasEl.removeEventListener('click', onClick);
    },
    get state() { return state; },
  };
}
