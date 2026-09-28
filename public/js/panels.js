// Journal (quests + achievements), profile and stats windows.

import { iconSprites, villagerSprites } from './sprites.js';
import { STATIONS, GUILD_MASTER, INVENTORY_ORDER, VILLAGER_TIERS, tierFor, stationCounts } from './tools.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n || 0));
const money = usd => '$' + (usd >= 100 ? usd.toFixed(0) : usd.toFixed(2));
const getJson = url => fetch(url).then(r => r.json());

function ago(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const CATEGORY = { tools: 'TOOLS', tokens: 'TOKENS', survival: 'SURVIVAL', sessions: 'SESSIONS', mastery: 'MASTERY' };
const ACH_ICON = { tool: 'bash', star: 'skill', crown: 'skill', coin: 'fetch', shield: 'portal', flag: 'quest', agent: 'agent' };
const villagerUrls = {};
const villagerUrl = (k, st) => villagerUrls[k] || (villagerUrls[k] = villagerSprites(st.colors, st.hat)[0].toDataURL());
let iconUrls = null;
const iconUrl = name => {
  if (!iconUrls) iconUrls = Object.fromEntries(Object.entries(iconSprites(2)).map(([k, c]) => [k, c.toDataURL()]));
  return iconUrls[name] || iconUrls.mystery;
};

function tabs(dialog, list, current, onPick) {
  const nav = dialog.querySelector('.panel-tabs');
  nav.innerHTML = list.map(([k, label]) => `<button type="button" class="tab${k === current ? ' on' : ''}" data-tab="${k}">${label}</button>`).join('');
  nav.onclick = e => { const b = e.target.closest('[data-tab]'); if (b) onPick(b.dataset.tab); };
}

function cycleTabs(dialog, list, get, set) {
  dialog.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const i = list.findIndex(([k]) => k === get());
    set(list[(i + (e.shiftKey ? list.length - 1 : 1)) % list.length][0]);
  });
}

// ---- journal: quests of the current session + achievements ----

export function createJournal(dialog, { getQuests, getProfile }) {
  const TABS = [['daily', 'DAILY'], ['quests', 'SESSION QUESTS'], ['villagers', 'VILLAGERS'], ['achievements', 'ACHIEVEMENTS']];
  let tab = 'daily';
  let achievements = null;
  const body = dialog.querySelector('.panel-body');

  async function render() {
    tabs(dialog, TABS, tab, t => { tab = t; render(); });
    if (tab === 'daily') {
      const d = getProfile() && getProfile().daily;
      if (!d) { body.innerHTML = '<p class="muted">Loading…</p>'; return; }
      const done = d.quests.filter(q => q.done).length;
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
      const left = Math.max(0, midnight - Date.now());
      body.innerHTML = `
        <p class="muted">${done} / ${d.quests.length} done · new quests in ${Math.floor(left / 3600000)}h ${Math.floor(left / 60000) % 60}m</p>
        <ul class="daily">${d.quests.map(q => `
          <li class="${q.done ? 'done' : ''}">
            <span class="mark">${q.done ? '✓' : '·'}</span>
            <div><b>${esc(q.text)}</b>
              <div class="bar mini"><i style="width:${(q.progress / q.target) * 100}%"></i></div>
              <small>${fmt(q.progress)} / ${fmt(q.target)}</small></div>
            <span class="reward">${q.gold} G</span>
          </li>`).join('')}
          <li class="${d.bonusClaimed ? 'done' : ''} bonus"><span class="mark">${d.bonusClaimed ? '✓' : '+'}</span><div><b>Complete all three</b><small>Daily bonus</small></div><span class="reward">${d.bonus} G</span></li>
        </ul>`;
      return;
    }
    if (tab === 'villagers') {
      const counts = stationCounts((getProfile() && getProfile().toolCounts) || {});
      const rows = [...INVENTORY_ORDER.map(k => [k, STATIONS[k]]), ['Wanderer', STATIONS.Wanderer], ['mcp:*', GUILD_MASTER]];
      body.innerHTML = `<p class="muted">Villagers grow with every use of their tools: ${VILLAGER_TIERS.map(t => `${t.name} ${t.min}`).join(' · ')}</p>
        <ul class="ach-list villagers">${rows.map(([k, st]) => {
          const n = counts[k] || 0, t = tierFor(n), next = VILLAGER_TIERS[t + 1];
          return `<li class="${t >= 3 ? 'done' : ''}">
            <img src="${villagerUrl(k, st)}" alt="">
            <div><b>${esc(st.label)}</b> <small class="cat">${VILLAGER_TIERS[t].name}</small>
              ${next ? `<div class="bar mini"><i style="width:${((n - VILLAGER_TIERS[t].min) / (next.min - VILLAGER_TIERS[t].min)) * 100}%"></i></div><small>${fmt(n)} / ${fmt(next.min)} to ${next.name}</small>` : `<small class="when">${fmt(n)} uses · max rank</small>`}
            </div>
            <span class="reward">${fmt(n)}</span>
          </li>`;
        }).join('')}</ul>`;
      return;
    }
    if (tab === 'quests') {
      const quests = getQuests();
      const done = quests.filter(q => q.status === 'completed').length;
      body.innerHTML = quests.length ? `
        <p class="muted">${done} of ${quests.length} complete</p>
        <div class="bar xp"><i style="width:${(done / quests.length) * 100}%"></i></div>
        <ul class="quests big">${quests.map(q => `<li class="${esc(q.status)}"><span class="mark">${q.status === 'completed' ? '✓' : q.status === 'in_progress' ? '▶' : '·'}</span><span>${esc(q.text)}</span></li>`).join('')}</ul>`
        : `<p class="empty-state">No active quests.<br><span class="muted">Quests appear when Claude plans its work with TodoWrite or the Task tools.</span></p>`;
      return;
    }
    if (!achievements) {
      body.innerHTML = '<p class="muted">Loading…</p>';
      achievements = await getJson('/api/achievements');
    }
    const unlocked = achievements.filter(a => a.unlockedAt).length;
    const sorted = [...achievements].sort((a, b) => (!!b.unlockedAt - !!a.unlockedAt) || a.category.localeCompare(b.category) || a.threshold - b.threshold);
    body.innerHTML = `<p class="muted">${unlocked} / ${achievements.length} unlocked</p>
      <ul class="ach-list">${sorted.map(a => `
        <li class="${a.unlockedAt ? 'done' : ''}">
          <img src="${iconUrl(ACH_ICON[a.icon])}" alt="">
          <div>
            <b>${esc(a.name)}</b> <small class="cat">${CATEGORY[a.category] || ''}</small>
            <small>${esc(a.description)}</small>
            ${a.unlockedAt ? `<small class="when">Unlocked ${esc(ago(a.unlockedAt))}</small>`
              : `<div class="bar mini"><i style="width:${(a.progress / a.threshold) * 100}%"></i></div><small>${fmt(a.progress)} / ${fmt(a.threshold)}</small>`}
          </div>
          <span class="reward">${a.gold} G${a.xp ? `<br>${a.xp} XP` : ''}</span>
        </li>`).join('')}</ul>`;
  }

  cycleTabs(dialog, TABS, () => tab, t => { tab = t; render(); });
  return {
    open(which) { if (which) tab = which; achievements = null; render(); if (!dialog.open) dialog.showModal(); },
    refresh() { if (dialog.open) { achievements = null; render(); } },
    renderIfOpen() { if (dialog.open && tab === 'daily') render(); },
  };
}

// ---- profile: totals, loadout, recent sessions, transcript sync ----

export function createProfilePanel(dialog, { getProfile, getItems, preview, getToken }) {
  const body = dialog.querySelector('.panel-body');

  async function render() {
    const p = getProfile();
    const [history, settings] = await Promise.all([getJson('/api/history'), getJson('/api/settings')]);
    const items = Object.fromEntries(getItems().map(i => [i.id, i]));
    const slots = [['skin', 'SKIN'], ['hat', 'HAT'], ['companion', 'PET'], ['effect', 'EFFECT'], ['map_theme', 'MAP'], ['title', 'TITLE']];
    const s = p.stats;
    body.innerHTML = `
      <div class="stat-tiles">
        ${[['Tool calls', fmt(s.toolCalls)], ['Tokens', fmt(s.tokens)], ['Sessions', fmt(s.sessions)], ['Compacts', fmt(s.compacts)],
           ['Sub-agents', fmt(s.subagents)], ['Unique tools', s.uniqueTools], ['Fish caught', fmt(s.fishCaught)], ['Achievements', `${p.achievements.unlocked}/${p.achievements.total}`]]
          .map(([k, v]) => `<div class="tile"><span>${k}</span><b>${v}</b></div>`).join('')}
      </div>
      <h3 class="sub">LOADOUT</h3>
      <div class="loadout">${slots.map(([k, label]) => {
        const it = items[p.loadout[k]];
        return `<div class="slot-box">${it ? `<img src="${preview(it)}" alt="">` : '<span class="none">—</span>'}<small>${label}</small><b>${esc(it ? it.name : 'None')}</b></div>`;
      }).join('')}</div>
      <h3 class="sub">SETTINGS</h3>
      <div class="settings">
        <label><input type="checkbox" data-setting="enabled" ${settings.permissions.enabled ? 'checked' : ''}> Answer Claude's permission prompts in the game</label>
        <label>Wait for my answer <select data-setting="wait">${[20, 45, 90, 180].map(s => `<option value="${s}" ${settings.permissions.wait === s ? 'selected' : ''}>${s} s</option>`).join('')}</select> then fall back to the terminal</label>
        <p class="muted">Only while a game window (or its picture-in-picture) is visible. Questions and plan approvals always stay in the terminal. Needs <kbd>npm run setup</kbd>.</p>
      </div>
      <h3 class="sub">RECENT ADVENTURES <button type="button" class="btn small ghost" data-sync>⟳ SYNC TRANSCRIPTS</button></h3>
      <p class="sync-msg muted"></p>
      <table class="history">
        <thead><tr><th>Session</th><th>Tools</th><th>Tokens</th><th>XP</th><th>Cost</th><th>When</th></tr></thead>
        <tbody>${history.slice(0, 40).map(h => `<tr>
          <td>${esc(h.title || h.project || h.id.slice(0, 8))}</td><td>${h.toolCalls}</td><td>${fmt(h.tokens)}</td>
          <td>${h.xpEarned}</td><td>${money(h.costUsd || 0)}</td><td>${esc(ago(h.endedAt || h.startedAt))}</td></tr>`).join('')}</tbody>
      </table>`;
  }

  dialog.addEventListener('change', async e => {
    const el = e.target.closest('[data-setting]');
    if (!el) return;
    const value = el.type === 'checkbox' ? el.checked : Number(el.value);
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Quest-Token': getToken() || '' },
      body: JSON.stringify({ permissions: { [el.dataset.setting]: value } }),
    });
  });

  dialog.addEventListener('click', async e => {
    if (!e.target.closest('[data-sync]')) return;
    const msg = dialog.querySelector('.sync-msg');
    msg.textContent = 'Reading transcripts…';
    const r = await fetch('/api/sync', { method: 'POST' }).then(x => x.json());
    await render();
    dialog.querySelector('.sync-msg').textContent = r.error ? r.error : `Synced ${r.imported} transcripts (${r.skipped} empty).`;
  });

  return {
    async open() { await render(); if (!dialog.open) dialog.showModal(); },
  };
}

// ---- stats: two aligned single-series charts (never one chart, two axes) ----

export function createStatsPanel(dialog) {
  const TABS = [['daily', '30 DAYS'], ['weekly', '12 WEEKS'], ['monthly', 'MONTHS'], ['tools', 'TOOLS'], ['projects', 'PROJECTS']];
  let tab = 'daily';
  let range = '90';
  let data = null;
  const body = dialog.querySelector('.panel-body');

  const label0 = r => (r ? r.date || r.week || r.month : '');

  function columns(rows, key, label, format, cls) {
    if (!rows.length) return '<p class="muted">No activity yet.</p>';
    const max = Math.max(1, ...rows.map(r => r[key]));
    const today = new Date().toISOString().slice(0, 10);
    return `<figure class="chart ${cls}">
      <figcaption>${label} <span class="muted">· max ${format(max)}</span></figcaption>
      <div class="cols">${rows.map(r => {
        const when = r.date || r.week || r.month;
        return `<div class="col${when === today ? ' today' : ''}" tabindex="0" data-tip="${esc(when)}: ${format(r[key])} ${label.toLowerCase()}">
          <i style="height:${(r[key] / max) * 100}%"></i></div>`;
      }).join('')}</div>
      <div class="axis"><span>${esc(label0(rows[0]))}</span><span>${esc(label0(rows[rows.length - 1]))}</span></div>
    </figure>`;
  }

  function hbars(rows, valueKey, format) {
    const max = Math.max(1, ...rows.map(r => r[valueKey]));
    return `<ul class="hbars">${rows.map(r => `<li data-tip="${esc(r.name)}: ${format(r[valueKey])}">
      <span class="name">${esc(r.name)}</span><span class="track"><i style="width:${(r[valueKey] / max) * 100}%"></i></span><b>${format(r[valueKey])}</b></li>`).join('')}</ul>`;
  }

  async function render() {
    tabs(dialog, TABS, tab, t => { tab = t; render(); });
    if (!data) {
      body.innerHTML = '<p class="muted">Loading…</p>';
      data = await getJson(`/api/stats?days=${range}`);
    }
    const t = data.totals;
    const head = `
      <div class="range">
        <button type="button" class="tab${range === '90' ? ' on' : ''}" data-range="90">LAST 90 DAYS</button>
        <button type="button" class="tab${range === 'all' ? ' on' : ''}" data-range="all">ALL TIME</button>
      </div>
      <div class="stat-tiles four">
        ${[['Sessions', fmt(t.sessions)], ['Tokens', fmt(t.tokens)], ['Tool calls', fmt(t.tools)], ['Cost', money(t.cost)]]
          .map(([k, v]) => `<div class="tile"><span>${k}</span><b>${v}</b></div>`).join('')}
      </div>`;
    let content;
    if (tab === 'daily' || tab === 'weekly' || tab === 'monthly') {
      const rows = data[tab];
      content = columns(rows, 'tokens', 'Tokens', fmt, 'c-tokens') + columns(rows, 'tools', 'Tool calls', fmt, 'c-tools') +
        `<details class="table-view"><summary>Show as table</summary><table class="history"><thead><tr><th>${{ daily: 'Day', weekly: 'Week of', monthly: 'Month' }[tab]}</th><th>Tokens</th><th>Tools</th><th>Sessions</th><th>Cost</th></tr></thead>
        <tbody>${rows.filter(r => r.tokens || r.tools).map(r => `<tr><td>${label0(r)}</td><td>${fmt(r.tokens)}</td><td>${r.tools}</td><td>${r.sessions}</td><td>${money(r.cost)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No activity in this range.</td></tr>'}</tbody></table></details>`;
    } else if (tab === 'tools') {
      content = data.topTools.length ? hbars(data.topTools.map(x => ({ name: x.name, count: x.count })), 'count', fmt) : '<p class="muted">No tool calls in this range.</p>';
    } else {
      content = data.topProjects.length ? `<table class="history"><thead><tr><th>Project</th><th>Sessions</th><th>Tokens</th><th>Tools</th><th>Cost</th></tr></thead>
        <tbody>${data.topProjects.map(p => `<tr><td>${esc(p.name)}</td><td>${p.sessions}</td><td>${fmt(p.tokens)}</td><td>${fmt(p.tools)}</td><td>${money(p.cost)}</td></tr>`).join('')}</tbody></table>`
        : '<p class="muted">No project data yet. Sync transcripts from your profile (P).</p>';
    }
    body.innerHTML = head + content + '<div class="tip" hidden></div>';
  }

  // One floating tooltip for every chart mark.
  dialog.addEventListener('mouseover', e => {
    const tip = dialog.querySelector('.tip');
    const mark = e.target.closest('[data-tip]');
    if (!tip) return;
    if (!mark) { tip.hidden = true; return; }
    tip.textContent = mark.dataset.tip;
    tip.hidden = false;
    const r = mark.getBoundingClientRect(), d = tip.parentElement.getBoundingClientRect();
    tip.style.left = `${Math.min(r.left - d.left + r.width / 2, d.width - 120)}px`;
    tip.style.top = `${r.top - d.top - 34}px`;
  });
  dialog.addEventListener('click', e => {
    const b = e.target.closest('[data-range]');
    if (b && b.dataset.range !== range) { range = b.dataset.range; data = null; render(); }
  });
  cycleTabs(dialog, TABS, () => tab, t => { tab = t; render(); });

  return {
    open() { data = null; render(); if (!dialog.open) dialog.showModal(); },
  };
}
