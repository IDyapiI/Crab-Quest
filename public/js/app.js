import { createGame } from './game.js';
import { createShop, itemPreview } from './shop.js';
import { createJournal, createProfilePanel, createStatsPanel } from './panels.js';
import { createPip, pipSupported } from './pip.js';
import { renderGuide, villagerCard } from './guide.js';
import { clawdSprites, iconSprites } from './sprites.js';
import { STATIONS, GUILD_MASTER, stationCounts, stationKeyFor, mcpStation, tierFor, VILLAGER_TIERS } from './tools.js';
import { weatherFor } from './fx.js';

const $ = id => document.getElementById(id);
const views = { title: $('title-screen'), game: $('game-view'), grid: $('grid-view'), guide: $('guide-view') };

const icons = iconSprites(2);
const iconUrl = Object.fromEntries(Object.entries(icons).map(([k, c]) => [k, c.toDataURL()]));
const skinSprites = new Map();
const spritesFor = skin => {
  const key = skin ? skin.id : 'default';
  if (!skinSprites.has(key)) skinSprites.set(key, clawdSprites(skin ? skin.data : {}));
  return skinSprites.get(key);
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n || 0);
const money = usd => '$' + (usd >= 100 ? usd.toFixed(0) : usd.toFixed(2));
const STATUS_TEXT = { working: 'ADVENTURING', thinking: 'THINKING', waiting: 'NEEDS YOU', done: 'RESTING', idle: 'IDLE', ended: 'ENDED' };

// ---- the local player (one profile, persisted by the server) ----

const player = { profile: null, items: [], byId: {}, fish: [], token: null };

async function loadPlayer() {
  try {
    const [data, fish, tok] = await Promise.all([fetch('/api/shop'), fetch('/api/fish'), fetch('/api/token')].map(p => p.then(r => r.json())));
    player.fish = fish;
    player.token = tok.token;
    player.items = data.items;
    player.byId = Object.fromEntries(data.items.map(it => [it.id, it]));
    player.profile = data.profile;
  } catch { /* server offline: the game still runs */ }
}

function equippedItems(profile = player.profile) {
  const out = {};
  for (const [slot, id] of Object.entries((profile && profile.loadout) || {})) out[slot] = id ? player.byId[id] || null : null;
  return out;
}

function drawAvatar(canvasEl, profile = player.profile) {
  const ctx = canvasEl.getContext('2d');
  const skin = equippedItems(profile).skin;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.globalAlpha = (skin && skin.data.opacity) || 1;
  ctx.drawImage(spritesFor(skin).down[0], 0, 0, canvasEl.width, canvasEl.height);
  ctx.globalAlpha = 1;
}

function xpPercent(p) {
  if (!p.nextLevelXp) return 100;
  return ((p.xp - p.levelXp) / (p.nextLevelXp - p.levelXp)) * 100;
}

function titleOf(profile) {
  const t = equippedItems(profile).title;
  return t ? t.data.text : '';
}

function dailyText(p) {
  if (!p || !p.daily) return '';
  return `DAILY ${p.daily.quests.filter(q => q.done).length}/${p.daily.quests.length}`;
}

function renderProfileCard() {
  const p = player.profile;
  $('title-profile').hidden = !p;
  if (!p) return;
  $('pc-name').textContent = p.name.toUpperCase() + (titleOf(p) ? ` · ${titleOf(p).toUpperCase()}` : '');
  $('pc-level').textContent = `LV.${p.level}`;
  $('pc-xp').style.width = `${xpPercent(p)}%`;
  $('pc-gold').textContent = p.gold;
  $('pc-ach').textContent = `★ ${p.achievements.unlocked}/${p.achievements.total} achievements · ${dailyText(p).toLowerCase()}`;
  drawAvatar($('title-avatar'), p);
}

// ---- windows shared by every screen ----

let currentQuests = [];
const panels = {
  journal: createJournal($('journal'), { getQuests: () => currentQuests, getProfile: () => player.profile }),
  profile: createProfilePanel($('profile'), { getProfile: () => player.profile, getItems: () => player.items, preview: itemPreview, getToken: () => player.token }),
  stats: createStatsPanel($('stats')),
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-open]');
  if (b && player.profile) panels[b.dataset.open].open();
  if (e.target.closest('[data-guide]')) openGuidePage();
});

// ---- village guide ----

let guideReturn = '';
function openGuidePage() {
  guideReturn = location.search.slice(1);
  go('view=guide');
}

function openGuide() {
  show('guide');
  renderGuide($('guide'), player.profile);
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  else window.scrollTo(0, 0);
  const onKey = e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) go(guideReturn); };
  document.addEventListener('keydown', onKey);
  $('btn-guide-back').onclick = () => go(guideReturn);
  return () => document.removeEventListener('keydown', onKey);
}

function showVillager(key) {
  const st = key === 'mcp:*' ? GUILD_MASTER : STATIONS[key]
    || (key.startsWith('mcp:') && mcpStation(key.slice(4), (player.profile.mcpSlots || {})[key.slice(4)] ?? 0));
  if (!st) return;
  $('villager').querySelector('.panel-body').innerHTML = villagerCard(key, st, player.profile);
  $('villager').showModal();
}
for (const d of document.querySelectorAll('dialog')) {
  d.addEventListener('click', e => { if (e.target === d) d.close(); }); // click on the backdrop
}
const PANEL_KEYS = { q: 'journal', p: 'profile', g: 'stats' };

// Created once: the dialog outlives every screen, so a per-screen shop would
// stack click handlers and fire one action per visit.
let onShopChange = null;
const shop = createShop($('shop'), {
  getProfile: () => player.profile,
  getItems: () => player.items,
  onChange: (profile, effect) => onShopChange && onShopChange(profile, effect),
});

// ---- desktop notifications, opt-in (browsers need a click to ask) ----

const notify = {
  get on() { try { return localStorage.getItem('cq-notify') === '1' && Notification.permission === 'granted'; } catch { return false; } },
  async toggle() {
    if (!('Notification' in window)) return;
    const next = !this.on;
    if (next && Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return;
    try { localStorage.setItem('cq-notify', next ? '1' : '0'); } catch { /* ignore */ }
  },
  send(title, body, urgent = false) {
    if (!this.on || !document.hidden) return;
    const n = new Notification(title, { body, tag: 'crab-quest', requireInteraction: urgent });
    n.onclick = () => { window.focus(); n.close(); };
    if (!urgent) setTimeout(() => n.close(), 6000);
  },
};

function notifyFor(e) {
  if (e.hook === 'PermissionRequest') notify.send('⚠️ Claude needs permission', `${e.tool}${e.detail ? ' · ' + e.detail : ''}`, true);
  else if (e.hook === 'Notification' && e.message) notify.send(/permission|approv|input/i.test(e.message) ? '⚠️ Claude needs you' : '💬 Claude', e.message, /permission|approv/i.test(e.message));
  else if (e.hook === 'Stop') notify.send('✅ Claude has finished', 'Quest complete!');
}

// ---- presence: the server only waits for an in-game answer if a window is visible ----

const sockets = new Set();
let pipOpen = false;
const isVisible = () => !document.hidden || pipOpen;
function sendPresence() {
  for (const ws of sockets) if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'presence', visible: isVisible() }));
}
document.addEventListener('visibilitychange', sendPresence);

// ---- permission prompts answered from the game ----

const perm = {
  current: null,
  tick: null,
  listeners: new Set(), // extra views of the prompt (the PiP strip)
  show(request) {
    this.current = request;
    $('perm-tool').textContent = request.tool;
    $('perm-cwd').textContent = request.cwd ? `in ${request.cwd.split('/').pop()}` : '';
    $('perm-detail').textContent = request.detail || '(no details)';
    $('perm').hidden = false;
    const total = request.expiresAt - Date.now();
    clearInterval(this.tick);
    const paint = () => {
      const left = Math.max(0, request.expiresAt - Date.now());
      $('perm-timer').style.width = `${(left / total) * 100}%`;
      if (!left) this.hide(request.id);
    };
    paint();
    this.tick = setInterval(paint, 500);
    for (const l of this.listeners) l(request);
    notify.send('⚠️ Claude asks permission', `${request.tool}: ${request.detail}`, true);
  },
  hide(id) {
    if (!this.current || (id && this.current.id !== id)) return;
    this.current = null;
    clearInterval(this.tick);
    $('perm').hidden = true;
    for (const l of this.listeners) l(null);
  },
  async decide(behavior) {
    const req = this.current;
    if (!req) return;
    this.hide(req.id);
    await fetch(`/api/permission/${req.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Quest-Token': player.token || '' },
      body: JSON.stringify({ behavior }),
    });
  },
  handle(msg) {
    if (msg.type === 'permission') this.show(msg.request);
    else if (msg.type === 'permission_done') this.hide(msg.id);
    else return false;
    return true;
  },
};
$('perm').addEventListener('click', e => {
  const b = e.target.closest('[data-decide]');
  if (b) perm.decide(b.dataset.decide);
});

// ---- websocket with backoff ----

function connect(sessionId, { onMessage, onState }) {
  let ws, closed = false, delay = 500;
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ''}`);
    ws.onopen = () => { delay = 500; sockets.add(ws); sendPresence(); onState(true); };
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        if (!perm.handle(msg)) onMessage(msg);
      } catch (err) { console.error(err); }
    };
    ws.onclose = () => {
      sockets.delete(ws);
      onState(false);
      if (!closed) setTimeout(open, delay = Math.min(delay * 2, 8000));
    };
    ws.onerror = () => ws.close();
  };
  open();
  return () => { closed = true; ws && ws.close(); };
}

// ---- router ----

let teardown = null;

function show(name) {
  for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
}

function route() {
  if (teardown) { teardown(); teardown = null; }
  const params = new URLSearchParams(location.search);
  if (params.get('session')) teardown = openGame(params.get('session'));
  else if (params.get('view') === 'grid') teardown = openGrid();
  else if (params.get('view') === 'guide') teardown = openGuide();
  else teardown = openTitle();
}

function go(query) {
  history.pushState(null, '', query ? `?${query}` : location.pathname);
  route();
}
window.addEventListener('popstate', route);

// ---- title screen ----

function openTitle() {
  show('title');
  const heroCtx = $('title-hero').getContext('2d');
  heroCtx.imageSmoothingEnabled = false;
  let frame = 0;
  const anim = setInterval(() => {
    heroCtx.clearRect(0, 0, 96, 96);
    const skin = equippedItems().skin;
    heroCtx.globalAlpha = (skin && skin.data.opacity) || 1;
    heroCtx.drawImage(spritesFor(skin).down[frame++ % 4], 0, 0, 96, 96);
  }, 220);

  let sessions = [];
  let selected = 0;

  async function load() {
    try {
      const [list, profile] = await Promise.all([fetch('/api/sessions'), fetch('/api/profile')].map(p => p.then(r => r.json())));
      sessions = list;
      player.profile = profile;
    } catch {
      sessions = [];
    }
    renderProfileCard();
    render();
  }

  function render() {
    const list = $('slot-list');
    $('slot-empty').hidden = sessions.length > 0;
    selected = Math.min(selected, Math.max(0, sessions.length - 1));
    list.innerHTML = sessions.map((s, i) => `
      <li class="slot${i === selected ? ' selected' : ''}" tabindex="0" data-id="${esc(s.id)}">
        <span class="cursor">&#9654;</span>
        <div class="slot-main">
          <div class="slot-head"><span class="dot ${esc(s.status)}"></span>${esc(s.project || 'unknown')}</div>
          <div class="slot-title">${esc(s.title || s.id.slice(0, 8))}</div>
        </div>
        <div class="slot-side"><b>${s.toolCalls} TOOLS</b><br>${esc(ago(s.lastSeen))}</div>
      </li>`).join('');
  }

  const onClick = e => {
    const slot = e.target.closest('.slot');
    if (slot) go(`session=${encodeURIComponent(slot.dataset.id)}`);
  };
  const onKey = e => {
    if (document.querySelector('dialog[open]')) return;
    if (e.key.toLowerCase() === 'v') return openGuidePage();
    const panel = PANEL_KEYS[e.key.toLowerCase()];
    if (panel && player.profile) return panels[panel].open(panel === 'journal' ? 'daily' : undefined);
    if (e.key === 'ArrowDown') selected = Math.min(sessions.length - 1, selected + 1);
    else if (e.key === 'ArrowUp') selected = Math.max(0, selected - 1);
    else if (e.key === 'Enter' && sessions[selected]) return go(`session=${encodeURIComponent(sessions[selected].id)}`);
    else return;
    e.preventDefault();
    render();
  };

  $('slot-list').addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  $('btn-grid').onclick = () => go('view=grid');
  $('btn-help').onclick = () => $('help').showModal();
  load();
  const poll = setInterval(load, 4000);

  return () => {
    clearInterval(anim);
    clearInterval(poll);
    $('slot-list').removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKey);
  };
}

// ---- single game + HUD ----

function openGame(sessionId) {
  show('game');
  const game = createGame($('world'), {
    onVillagerClick: key => player.profile && showVillager(key),
    // Rewards are granted by the server, which broadcasts the new profile.
    onCatch: f => fetch('/api/fish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fishId: f.id }) }),
  });
  game.setFishTable(player.fish);
  const hud = createHud();
  const log = [];
  let pip = null;

  function applyProfile(profile, outcome) {
    if (!profile) return;
    player.profile = profile;
    game.setProfile(profile, equippedItems(profile));
    hud.profile(profile);
    pipStatus();
    if (outcome) {
      game.celebrate(outcome);
      if (outcome.achievements.length) panels.journal.refresh();
    }
    panels.journal.renderIfOpen();
    shop.render();
  }
  onShopChange = (profile, effect) => {
    applyProfile(profile, null);
    if (effect && effect.type === 'fireworks') game.fireworks(24);
  };
  applyProfile(player.profile, null);
  $('btn-shop').onclick = () => shop.open();

  const crt = $('crt');
  try { crt.classList.toggle('on', localStorage.getItem('cq-crt') === '1'); } catch { /* private mode */ }

  let lastStatus = 'idle';
  function pipStatus(line) {
    if (!pip) return;
    const p = player.profile;
    pip.update({ status: lastStatus, statusText: STATUS_TEXT[lastStatus], line, level: p ? `LV.${p.level}` : '' });
  }

  function onMessage(msg) {
    if (msg.session) lastStatus = msg.session.status;
    if (msg.type === 'profile') return applyProfile(msg.profile, msg.outcome);
    if (msg.type === 'sync') {
      game.sync(msg.session, msg.recent);
      hud.update(msg.session);
      log.length = 0;
      for (const e of msg.recent || []) pushLog(e);
      hud.log(log);
    } else if (msg.type === 'event') {
      game.handleEvent(msg.event);
      if (msg.boss) game.handleBoss(msg.boss);
      notifyFor(msg.event);
      pipStatus(log[0] ? log[0].text : null);
      game.setSession(msg.session);
      hud.update(msg.session);
      if (pushLog(msg.event)) hud.log(log);
    } else if (msg.type === 'stats') {
      game.setSession(msg.session);
      hud.update(msg.session);
    }
  }

  function pushLog(e) {
    const entry = logEntry(e);
    if (!entry) return false;
    log.unshift(entry);
    log.length = Math.min(log.length, 30);
    return true;
  }

  const disconnect = connect(sessionId, {
    onMessage,
    onState: ok => { if (!ok) hud.status('offline'); },
  });

  const onKey = e => {
    if ((e.target.closest && e.target.closest('input, textarea')) || document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); game.reel(); }
    else if (k === 'escape') { if (game.state.house.open) game.toggleHouse(); else go(''); }
    else if (k === 'e') game.toggleHouse();
    else if (k === 'f') { if (game.state.house.open) game.toggleHouse(); else game.toggleFishing(); }
    else if (k === 's') { e.preventDefault(); shop.open(); }
    else if (k === 'i') { e.preventDefault(); pip.toggle(); }
    else if (PANEL_KEYS[k] && player.profile) { e.preventDefault(); panels[PANEL_KEYS[k]].open(); }
    else if (k === 'v') { e.preventDefault(); openGuidePage(); }
    else if (k === 'c') {
      const on = crt.classList.toggle('on');
      try { localStorage.setItem('cq-crt', on ? '1' : '0'); } catch { /* ignore */ }
    } else if (k === 'd') toggleDebug(game);
  };
  document.addEventListener('keydown', onKey);
  $('btn-back').onclick = () => go('');
  for (const b of document.querySelectorAll('#game-view [data-key]')) {
    b.onclick = () => onKey({ key: b.dataset.key, target: b, preventDefault() {} });
  }
  pip = createPip({
    crt,
    game,
    onKey: e => onKey(e),
    onChange: (open, hint) => {
      pipOpen = open;
      sendPresence();
      $('btn-pip').textContent = open ? '⧉ CLOSE PIP' : '⧉ PIP';
      if (open) pipStatus(log[0] ? log[0].text : '');
      if (hint === 'retry') game.banner('CLICK PIP AGAIN TO OPEN THE MINI VIEW', '#4cc9f0', { timer: 200 });
    },
  });
  $('btn-pip').hidden = !pipSupported();
  const pipPerm = request => pip.showPermission(request, b => perm.decide(b));
  perm.listeners.add(pipPerm);
  $('btn-pip').onclick = () => pip.toggle();
  const bell = $('btn-notify');
  const paintBell = () => { bell.textContent = notify.on ? '🔔 ON' : '🔕 OFF'; };
  paintBell();
  bell.onclick = async () => { await notify.toggle(); paintBell(); };

  return () => {
    disconnect();
    game.destroy();
    document.removeEventListener('keydown', onKey);
    $('debug').hidden = true;
    for (const d of document.querySelectorAll('dialog[open]')) d.close();
    pip.close();
    perm.listeners.delete(pipPerm);
    onShopChange = null;
    currentQuests = [];
  };
}

function logEntry(e) {
  const time = new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const detail = e.detail ? ` · ${e.detail}` : '';
  const who = e.agentId ? '↳ ' : '';
  switch (e.hook) {
    case 'PreToolUse': return { time, text: `${who}${e.mcp ? e.mcp.server + ': ' + e.mcp.tool : e.tool}${detail}` };
    case 'PostToolUseFailure': return { time, text: `${who}✗ ${e.tool}${e.error ? ' · ' + e.error : ''}`, cls: 'fail' };
    case 'PermissionDenied': return { time, text: `✗ denied ${e.tool}`, cls: 'fail' };
    case 'UserPromptSubmit': return { time, text: `» ${e.prompt || 'new prompt'}`, cls: 'sys' };
    case 'Stop': return { time, text: '★ quest complete', cls: 'sys' };
    case 'StopFailure': return { time, text: `✗ stopped: ${e.error || 'error'}`, cls: 'fail' };
    case 'SubagentStart': return { time, text: `+ sub-agent ${e.agentType || ''}`, cls: 'sys' };
    case 'PreCompact': return { time, text: '~ compacting memory', cls: 'sys' };
    case 'PermissionRequest': return { time, text: `? permission for ${e.tool}`, cls: 'fail' };
    default: return null;
  }
}

function createHud() {
  let questCount = 0;
  let bag = {}, bagTotal = 0;

  // Hover / focus card with the per-tool breakdown of a bag row.
  const tip = document.createElement('div');
  tip.className = 'bag-tip win';
  tip.hidden = true;
  document.body.appendChild(tip);
  function showTip(li) {
    const k = li.dataset.k, g = bag[k];
    if (!g) return;
    const mcp = k.startsWith('mcp:');
    const name = mcp ? k.slice(4).replace(/_/g, ' ').toUpperCase() : STATIONS[k].label;
    // The profile may have started counting mid-session: lifetime is never below this session.
    const life = Math.max(g.total, (player.profile && player.profile.toolCounts) ? stationCounts(player.profile.toolCounts)[k] || 0 : 0);
    const tools = Object.entries(g.tools).sort((a, b) => b[1] - a[1]);
    tip.innerHTML = `
      <b class="tip-title">${esc(name)}</b>
      <p class="muted">${g.total} call${g.total > 1 ? 's' : ''} this session · ${Math.round((g.total / bagTotal) * 100)}% of all tools</p>
      <table>${tools.map(([t, n]) => `<tr><td><code>${esc(t)}</code></td><td>${n}</td></tr>`).join('')}</table>
      <p class="muted">Lifetime ${life} · ${VILLAGER_TIERS[tierFor(life)].name}</p>`;
    tip.hidden = false;
    const r = li.getBoundingClientRect(), t = tip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - t.width - 12, Math.max(12, r.left));
    const above = r.top - t.height - 8;
    tip.style.left = `${left + window.scrollX}px`;
    tip.style.top = `${(above > 8 ? above : r.bottom + 8) + window.scrollY}px`;
  }
  const hideTip = () => { tip.hidden = true; };
  const bagEl = $('hud-bag');
  bagEl.addEventListener('mouseover', e => { const li = e.target.closest('li[data-k]'); if (li) showTip(li); });
  bagEl.addEventListener('mouseleave', hideTip);
  bagEl.addEventListener('focusin', e => { const li = e.target.closest('li[data-k]'); if (li) showTip(li); });
  bagEl.addEventListener('focusout', hideTip);

  function status(s) {
    const pill = $('hud-status');
    pill.className = `status-pill ${s}`;
    pill.textContent = STATUS_TEXT[s] || 'OFFLINE';
  }

  function update(s) {
    if (!s) return;
    $('hud-project').textContent = s.project || '';
    $('hud-title').textContent = s.title || s.id;
    document.title = `${s.title || 'Session'} · Crab Quest`;
    status(s.status);

    $('hud-model').textContent = [s.modelName, s.permissionMode && s.permissionMode !== 'default' ? s.permissionMode : null].filter(Boolean).join(' · ') || '—';

    const pct = (s.context && s.context.pct) || 0;
    const bar = $('hud-ctx');
    bar.style.width = `${Math.min(pct, 100)}%`;
    bar.className = pct >= 80 ? 'high' : pct >= 50 ? 'warn' : '';
    $('hud-ctx-text').textContent = `${Math.round(pct)}% · ${fmt(s.context.used)}/${fmt(s.context.size)}`;
    $('hud-weather').textContent = { clear: '☀', rain: '☂', snow: '❄', storm: '⚡' }[weatherFor(pct)];

    const limits = s.rateLimits || {};
    $('hud-limits').innerHTML = [['5H LIMIT', limits.five_hour], ['WEEK LIMIT', limits.seven_day]]
      .filter(([, l]) => l && l.used_percentage != null)
      .map(([name, l]) => `<div class="bar-label"><span>${name}</span><span>${Math.round(l.used_percentage)}%</span></div>
        <div class="bar limit"><i style="width:${Math.min(100, l.used_percentage)}%"></i></div>`).join('');

    $('hud-cost').textContent = money(s.cost || 0);
    $('hud-cost-note').textContent = s.costIsEstimate ? 'estimate' : '';
    const t = s.tokens || {};
    const rows = [['Input', t.input], ['Output', t.output], ['Cache write', t.cacheCreation], ['Cache read', t.cacheRead]];
    if (s.lines) rows.push(['Lines', `+${s.lines.added} −${s.lines.removed}`]);
    $('hud-tokens').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${typeof v === 'number' ? fmt(v) : esc(v ?? '—')}</dd>`).join('');

    const quests = s.quests || [];
    currentQuests = quests;
    $('hud-quest-count').textContent = quests.length ? `${quests.filter(q => q.status === 'completed').length}/${quests.length}` : '';
    $('hud-quests').innerHTML = quests.length
      ? quests.map(q => `<li class="${esc(q.status)}"><span class="mark">${q.status === 'completed' ? '✓' : q.status === 'in_progress' ? '▶' : '·'}</span><span>${esc(q.text)}</span></li>`).join('')
      : '<li class="muted">No quests yet…</li>';
    if (quests.length !== questCount) {
      questCount = quests.length;
      const win = $('quest-win');
      win.classList.remove('flash');
      void win.offsetWidth;
      win.classList.add('flash');
    }

    // This session's tool use per villager, most used first. MCP servers are
    // listed one by one; the hover card breaks each row down per tool.
    bag = {};
    for (const [tool, n] of Object.entries(s.tools || {})) {
      const k = stationKeyFor(tool);
      const g = bag[k] || (bag[k] = { total: 0, tools: {} });
      g.total += n;
      const label = k.startsWith('mcp:') ? tool.split('__').slice(2).join('__') || tool : tool;
      g.tools[label] = (g.tools[label] || 0) + n;
    }
    bagTotal = Object.values(bag).reduce((t, g) => t + g.total, 0);
    const bagRows = Object.entries(bag).sort((a, b) => b[1].total - a[1].total);
    const max = bagRows.length ? bagRows[0][1].total : 1;
    $('hud-bag').innerHTML = bagRows.length ? bagRows.map(([k, g]) => {
      const mcp = k.startsWith('mcp:');
      const name = mcp ? k.slice(4).replace(/_/g, ' ') : STATIONS[k].label;
      const icon = mcp ? 'mcp' : STATIONS[k].icon;
      return `<li tabindex="0" data-k="${esc(k)}"><img src="${iconUrl[icon]}" alt=""><span class="name">${esc(name)}</span>
        <span class="track"><i style="width:${(g.total / max) * 100}%"></i></span><b>${g.total}</b></li>`;
    }).join('') : '<li class="muted empty-bag">No tools used yet in this session.</li>';
  }

  function profile(p) {
    $('hud-name').textContent = p.name.toUpperCase();
    $('hud-title-line').textContent = titleOf(p);
    $('hud-daily').textContent = dailyText(p);
    $('hud-level').textContent = `LV.${p.level}`;
    $('hud-xp').style.width = `${xpPercent(p)}%`;
    $('hud-xp-text').textContent = p.nextLevelXp ? `${p.xp} / ${p.nextLevelXp}` : `${p.xp} · MAX`;
    $('hud-gold').textContent = p.gold;
    const now = Date.now();
    $('hud-effects').textContent = (p.effects || []).map(e => `${{ xp_boost: 'XP', gold_boost: 'GOLD', fish_lure: 'LURE' }[e.type] || e.type} x${e.data.multiplier || ''} ${Math.ceil((e.expiresAt - now) / 60000)}m`).join(' · ');
    drawAvatar($('hud-hero'), p);
  }

  function log(entries) {
    $('hud-log').innerHTML = entries.slice(0, 12).map(e =>
      `<li class="${e.cls || ''}"><time>${e.time}</time>${esc(e.text)}</li>`).join('');
  }

  return { update, status, log, profile };
}

// ---- debug panel: fake events for the local game only ----

function toggleDebug(game) {
  const panel = $('debug');
  panel.hidden = !panel.hidden;
  if (panel.hidden || panel.dataset.ready) return;
  panel.dataset.ready = '1';
  let n = 0;
  const id = () => `dbg-${++n}`;
  const tool = (name, extra = {}) => {
    const toolUseId = id();
    game.handleEvent({ hook: 'PreToolUse', tool: name, toolUseId, detail: 'debug', at: Date.now(), ...extra });
    setTimeout(() => game.handleEvent({ hook: 'PostToolUse', tool: name, toolUseId, at: Date.now() }), 1200);
  };
  const actions = {
    'Random tool': () => tool(Object.keys(STATIONS)[Math.floor(Math.random() * 17)]),
    'Burst x6': () => ['Read', 'Grep', 'Edit', 'Bash', 'Glob', 'Write'].forEach(t => tool(t)),
    'MCP tool': () => tool('mcp__notion__search', { mcp: { server: 'notion', tool: 'search' } }),
    'Failure': () => {
      const toolUseId = id();
      game.handleEvent({ hook: 'PreToolUse', tool: 'Bash', toolUseId, detail: 'npm test', at: Date.now() });
      setTimeout(() => game.handleEvent({ hook: 'PostToolUseFailure', tool: 'Bash', toolUseId, isError: true, error: 'exit code 1', at: Date.now() }), 1000);
    },
    'Permission': () => game.handleEvent({ hook: 'PermissionRequest', tool: 'Bash', detail: 'rm -rf dist', at: Date.now() }),
    'Sub-agent': () => {
      const agentId = id();
      game.handleEvent({ hook: 'SubagentStart', agentId, agentType: 'Explore' });
      ['Grep', 'Read', 'Glob'].forEach((t, i) => setTimeout(() => game.handleEvent({ hook: 'PreToolUse', tool: t, agentId }), 800 + i * 1500));
      setTimeout(() => game.handleEvent({ hook: 'SubagentStop', agentId }), 6000);
    },
    'New prompt': () => game.handleEvent({ hook: 'UserPromptSubmit', prompt: 'Refactor the dungeon generator', at: Date.now() }),
    'Compact': () => {
      game.handleEvent({ hook: 'PreCompact' });
      setTimeout(() => game.handleEvent({ hook: 'PostCompact' }), 2500);
    },
    'Stop': () => game.handleEvent({ hook: 'Stop', at: Date.now() }),
    'Weather +20%': () => {
      const s = game.state.session || { toolCalls: 0, context: { pct: 0 } };
      game.setSession({ ...s, context: { ...s.context, pct: ((s.context.pct || 0) + 20) % 100 } });
    },
    'Level up': () => game.celebrate({ xp: 120, gold: 50, levelUp: { level: game.state.level + 1, gold: 50 }, achievements: [{ name: 'Debug Hero', gold: 10 }] }),
    'Fireworks': () => game.fireworks(20),
    'Fish': () => game.toggleFishing(),
    'House': () => game.toggleHouse(),
  };
  $('debug-buttons').innerHTML = Object.keys(actions).map(k => `<button class="btn ghost" type="button">${esc(k)}</button>`).join('');
  $('debug-buttons').onclick = e => {
    const b = e.target.closest('button');
    if (b) actions[b.textContent]();
  };
}

// ---- grid of every session ----

function openGrid() {
  show('grid');
  const grid = $('grid');
  const cells = new Map();
  grid.innerHTML = '<p class="grid-empty">Waiting for adventurers…</p>';

  function cell(snap) {
    let c = cells.get(snap.id);
    if (c) return c;
    grid.querySelector('.grid-empty')?.remove();
    const el = document.createElement('div');
    el.className = 'win cell';
    el.innerHTML = '<canvas></canvas><div class="cell-caption"><span class="dot"></span><span class="t"></span><b></b></div>';
    el.onclick = () => go(`session=${encodeURIComponent(snap.id)}`);
    grid.appendChild(el);
    c = { el, game: createGame(el.querySelector('canvas'), { mini: true }) };
    if (player.profile) c.game.setProfile(player.profile, equippedItems());
    cells.set(snap.id, c);
    return c;
  }

  function caption(c, s) {
    c.el.querySelector('.dot').className = `dot ${s.status}`;
    c.el.querySelector('.t').textContent = `${s.project || ''} · ${s.title || s.id.slice(0, 8)}`;
    const q = s.quests || [];
    const done = q.filter(x => x.status === 'completed').length;
    c.el.querySelector('b').textContent = `${q.length ? `★ ${done}/${q.length} · ` : ''}${s.toolCalls} TOOLS`;
  }

  const disconnect = connect(null, {
    onState: ok => {
      $('grid-status').textContent = ok ? `${cells.size} LIVE` : 'OFFLINE';
      $('grid-status').className = `status-pill ${ok ? 'working' : ''}`;
    },
    onMessage: msg => {
      if (msg.type === 'profile') {
        player.profile = msg.profile;
        for (const c of cells.values()) c.game.setProfile(msg.profile, equippedItems(msg.profile));
        return;
      }
      const s = msg.session;
      if (!s) return;
      // Only sessions seen in the last 12 hours get a screen.
      if (!cells.has(s.id) && Date.now() - s.lastSeen > 12 * 3600 * 1000) return;
      const c = cell(s);
      if (msg.type === 'sync') c.game.sync(s, msg.recent);
      else {
        if (msg.type === 'event') {
          c.game.handleEvent(msg.event);
          if (msg.boss) c.game.handleBoss(msg.boss);
        }
        c.game.setSession(s);
      }
      caption(c, s);
      $('grid-status').textContent = `${cells.size} LIVE`;
    },
  });
  $('btn-grid-back').onclick = () => go('');

  return () => {
    disconnect();
    for (const c of cells.values()) c.game.destroy();
    grid.innerHTML = '';
  };
}

loadPlayer().then(route);
