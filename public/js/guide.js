// The village guide: who lives where, and which Claude Code tools they handle.

import { STILE, canvas, villagerSprites, propSprite, sidekickSprite, bossSprites, iconSprites } from './sprites.js';
import {
  STATIONS, GUILD_MASTER, MCP_SLOTS, INVENTORY_ORDER, ROLES, TOOL_INFO, VILLAGER_TIERS,
  mcpStation, stationCounts, tierFor, toolsOf, whereIs,
} from './tools.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

const BOSSES = [
  ['hydra', 'Red Test Hydra', 'Failing test commands (npm test, pytest, jest…)'],
  ['golem', 'Segfault Golem', 'Other failing shell commands'],
  ['wraith', 'Merge Conflict Wraith', 'Failed edits and writes'],
  ['specter', '404 Specter', 'Failed web searches and fetches'],
  ['kraken', 'Timeout Kraken', 'Failed MCP calls'],
  ['beast', 'Bug Beast', 'Any other failure streak'],
];

const portraits = new Map();
function portrait(key, st) {
  if (portraits.has(key)) return portraits.get(key);
  const c = canvas(STILE * 2, STILE * 2);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.scale(2, 2);
  ctx.drawImage(villagerSprites(st.colors, st.hat, st.outfit)[0], 0, 0);
  const prop = propSprite(st.prop, st.colors.accent);
  if (prop) ctx.drawImage(prop, 33, 24);
  const url = c.toDataURL();
  portraits.set(key, url);
  return url;
}

let iconUrls = null;
const icon = name => {
  if (!iconUrls) iconUrls = Object.fromEntries(Object.entries(iconSprites(2)).map(([k, c]) => [k, c.toDataURL()]));
  return iconUrls[name];
};

function residents(profile) {
  const list = [...INVENTORY_ORDER.map(k => [k, STATIONS[k]]), ['Wanderer', STATIONS.Wanderer], ['mcp:*', GUILD_MASTER]];
  const slots = Object.entries((profile && profile.mcpSlots) || {}).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]);
  const servers = slots.map(([server, i]) => ['mcp:' + server, mcpStation(server, i)]).filter(([, st]) => st);
  return { list, servers };
}

export function villagerCard(key, st, profile) {
  const counts = stationCounts((profile && profile.toolCounts) || {});
  const n = counts[key] || 0, t = tierFor(n), next = VILLAGER_TIERS[t + 1];
  const role = key.startsWith('mcp:') && key !== 'mcp:*'
    ? `An MCP server of yours. Every call to its tools (mcp__${key.slice(4)}__…) comes here.`
    : ROLES[key];
  const tools = key.startsWith('mcp:') && key !== 'mcp:*' ? [] : toolsOf(key);
  const master = (st.master || [])[0];
  return `
    <article class="win vcard" id="v-${esc(key.replace(/[^a-zA-Z0-9]/g, '_'))}">
      <header>
        <img class="portrait" src="${portrait(key, st)}" alt="">
        <div>
          <h3><img src="${icon(st.icon)}" alt=""> ${esc(key.startsWith('mcp:') && key !== 'mcp:*' ? key.slice(4).replace(/_/g, ' ').toUpperCase() : st.label)}</h3>
          <p class="muted">${esc(whereIs(st.at))}</p>
          <p class="rank"><span class="tier t${t}">${VILLAGER_TIERS[t].name}</span> ${fmt(n)} uses</p>
          ${next ? `<div class="bar mini"><i style="width:${((n - VILLAGER_TIERS[t].min) / (next.min - VILLAGER_TIERS[t].min)) * 100}%"></i></div><small class="muted">${fmt(next.min - n)} more to ${next.name}</small>` : '<small class="when">Maximum rank</small>'}
        </div>
      </header>
      <p class="role">${esc(role)}</p>
      ${tools.length ? `<table class="tools-table"><tbody>${tools.map(tool => `<tr><td><code>${esc(tool)}</code></td><td>${esc(TOOL_INFO[tool])}</td></tr>`).join('')}</tbody></table>`
        : key === 'Wanderer' ? '<p class="muted">Any tool not listed elsewhere in this guide.</p>' : ''}
      <blockquote>“${esc(st.lines[0])}” · “${esc(st.lines[1])}”</blockquote>
      ${master ? `<p class="muted small">${t >= 3 ? `As a ${VILLAGER_TIERS[t].name}: “${esc(master.replace('{n}', fmt(n)))}”` : 'Reaches MASTER to share a secret line.'}</p>` : ''}
    </article>`;
}

export function renderGuide(root, profile) {
  const { list, servers } = residents(profile);
  const freeSeats = MCP_SLOTS.length - servers.length;
  root.innerHTML = `
    <section class="guide-intro win">
      <p>Every time Claude uses a tool, Clawd walks to the villager in charge of it. Villagers rank up with the lifetime use of their tools:</p>
      <ul class="tiers">${VILLAGER_TIERS.map((t, i) => `<li><span class="tier t${i}">${t.name}</span> ${t.min}+ uses${['', ' · scarf', ' · cape', ' · star badge, secret lines', ' · golden look and sparkles'][i]}</li>`).join('')}</ul>
      <nav class="guide-nav">
        <a href="#guide-villagers">Villagers</a><a href="#guide-guild">MCP guild</a><a href="#guide-others">Sub-agents &amp; bosses</a>
      </nav>
    </section>

    <h2 class="guide-h" id="guide-villagers">VILLAGERS</h2>
    <div class="vgrid">${list.map(([k, st]) => villagerCard(k, st, profile)).join('')}</div>

    <h2 class="guide-h" id="guide-guild">MCP GUILD</h2>
    <p class="muted guide-p">Each MCP server gets its own villager on the guild plaza and keeps its seat for good. ${servers.length} of ${MCP_SLOTS.length} seats taken${freeSeats ? ` — the next ${freeSeats} new server${freeSeats > 1 ? 's' : ''} will join` : ' — new servers go to the guild master'}.</p>
    <div class="vgrid">${servers.map(([k, st]) => villagerCard(k, st, profile)).join('') || '<p class="muted">No MCP server used yet.</p>'}</div>

    <h2 class="guide-h" id="guide-others">SUB-AGENTS &amp; BOSSES</h2>
    <div class="vgrid">
      <article class="win vcard">
        <header><img class="portrait small" src="${sidekickSprite().toDataURL()}" alt=""><div><h3>Mini Clawds</h3><p class="muted">Around the Agent</p></div></header>
        <p class="role">Each sub-agent Claude launches appears as a little Clawd next to the Agent commander. It runs its own errands to the villagers for the tools it uses, then goes home when its mission ends.</p>
      </article>
      <article class="win vcard boss-card">
        <header><div><h3>Bosses</h3><p class="muted">East field</p></div></header>
        <p class="role">Three failed tool calls in a row summon a boss. Every successful tool call hits it (Edit and Write hit twice); every failure heals it. Victory pays gold and XP, with a 30% chance of boss-only loot.</p>
        <ul class="boss-list">${BOSSES.map(([id, name, why]) => `<li><img src="${bossSprites(id)[0].toDataURL()}" alt=""><div><b>${name}</b><small class="muted">${why}</small></div></li>`).join('')}</ul>
      </article>
    </div>`;
}
