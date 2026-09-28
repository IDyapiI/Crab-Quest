// Profile, shop, achievements and stats for the single local player.

const express = require('express');
const profile = require('./profile');
const { syncTranscripts } = require('./sync');

function statsFor(days) {
  const since = days ? Date.now() - days * 86400000 : 0;
  const list = profile.history().filter(s => s.startedAt && Date.parse(s.startedAt) >= since);
  const dayKey = d => d.toISOString().slice(0, 10);
  const weekKey = d => {
    const m = new Date(d);
    m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7));
    return dayKey(m);
  };
  const bucket = () => ({ tokens: 0, tools: 0, sessions: 0, cost: 0 });
  const daily = {}, weekly = {}, monthly = {}, tools = {}, projects = {};
  const today = new Date();
  for (let i = 29; i >= 0; i--) daily[dayKey(new Date(today - i * 86400000))] = bucket();
  for (let i = 11; i >= 0; i--) weekly[weekKey(new Date(today - i * 7 * 86400000))] = bucket();

  for (const s of list) {
    const start = new Date(s.startedAt);
    const add = (b, share) => {
      if (!b) return;
      b.tokens += s.tokens * share; b.tools += s.toolCalls * share; b.cost += (s.costUsd || 0) * share;
    };
    // Spread long sessions over the days they covered.
    const end = s.endedAt ? new Date(s.endedAt) : start;
    const spanDays = Math.max(1, Math.round((Date.parse(dayKey(end)) - Date.parse(dayKey(start))) / 86400000) + 1);
    for (let d = 0; d < spanDays; d++) {
      const day = new Date(start.getTime() + d * 86400000);
      add(daily[dayKey(day)], 1 / spanDays);
      add(weekly[weekKey(day)], 1 / spanDays);
      add(monthly[day.toISOString().slice(0, 7)] || (monthly[day.toISOString().slice(0, 7)] = bucket()), 1 / spanDays);
    }
    if (daily[dayKey(start)]) daily[dayKey(start)].sessions++;
    if (weekly[weekKey(start)]) weekly[weekKey(start)].sessions++;
    monthly[start.toISOString().slice(0, 7)].sessions++;
    for (const [t, n] of Object.entries(s.tools || {})) tools[t] = (tools[t] || 0) + n;
    const p = projects[s.project || 'Other'] || (projects[s.project || 'Other'] = bucket());
    p.tokens += s.tokens; p.tools += s.toolCalls; p.cost += s.costUsd || 0; p.sessions++;
  }

  // Show empty months too, so the time axis stays honest.
  const months = Object.keys(monthly).sort();
  if (months.length) {
    const end = today.toISOString().slice(0, 7);
    for (let m = months[0]; m <= end; ) {
      if (!monthly[m]) monthly[m] = bucket();
      const [y, mo] = m.split('-').map(Number);
      m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
    }
  }

  const round = b => ({ tokens: Math.round(b.tokens), tools: Math.round(b.tools), sessions: b.sessions, cost: +b.cost.toFixed(2) });
  const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    daily: Object.entries(daily).map(([date, b]) => ({ date, ...round(b) })),
    weekly: Object.entries(weekly).map(([week, b]) => ({ week, ...round(b) })),
    monthly: Object.entries(monthly).sort().map(([month, b]) => ({ month, ...round(b) })),
    topTools: top(tools, 15).map(([name, count]) => ({ name, count })),
    topProjects: Object.entries(projects).sort((a, b) => b[1].tokens - a[1].tokens).slice(0, 10).map(([name, b]) => ({ name, ...round(b) })),
    totals: round(list.reduce((t, s) => {
      t.tokens += s.tokens; t.tools += s.toolCalls; t.cost += s.costUsd || 0; t.sessions++;
      return t;
    }, { tokens: 0, tools: 0, sessions: 0, cost: 0 })),
  };
}

module.exports = function api(onProfileChange) {
  const r = express.Router();
  const reply = (res, result, outcome) => {
    console.log(`${new Date().toLocaleTimeString()} [profile] ${res.req.path} ${JSON.stringify(res.req.body)} → ${result.error || 'ok'}`);
    if (result.error) return res.status(400).json(result);
    onProfileChange(outcome || null);
    res.json({ ...result, profile: profile.snapshot() });
  };

  r.get('/profile', (_req, res) => res.json(profile.snapshot()));
  r.get('/shop', (_req, res) => res.json({ items: profile.catalog.items, profile: profile.snapshot() }));
  r.get('/achievements', (_req, res) => res.json(profile.achievementList()));
  r.get('/history', (_req, res) => res.json(profile.history().slice(0, 500)));
  r.get('/stats', (req, res) => res.json(statsFor(req.query.days === 'all' ? 0 : Number(req.query.days) || 90)));
  r.get('/fish', (_req, res) => res.json(profile.catalog.fish));

  r.post('/shop/buy', (req, res) => {
    const result = profile.buy(req.body.itemId);
    reply(res, result, result.ok ? result : null);
  });
  r.post('/shop/use', (req, res) => reply(res, profile.use(req.body.itemId)));
  r.post('/loadout', (req, res) => reply(res, profile.equip(req.body.slot, req.body.itemId || null)));
  r.post('/fish', (req, res) => {
    const result = profile.fish(req.body.fishId);
    reply(res, result, result.ok ? result : null);
  });
  r.post('/sync', async (_req, res) => {
    try {
      res.json({ ok: true, ...(await syncTranscripts()), profile: profile.snapshot() });
      onProfileChange(null);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return r;
};
