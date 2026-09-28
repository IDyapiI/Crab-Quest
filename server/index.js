const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const store = require('./store');
const { normalize } = require('./events');
const profile = require('./profile');
const progress = require('./progress');
const api = require('./api');
const createPermissions = require('./permissions');

const PORT = Number(process.env.PORT) || 7777;
const TOKEN_REFRESH_MS = 5000;

const app = express();
const server = http.createServer(app);
// Only this machine's pages may talk to the server: other websites open in the
// browser must not read session activity or inject events.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const wss = new WebSocket.Server({
  server,
  verifyClient: ({ origin, req }) => LOCAL_HOST.test(req.headers.host || '') && (!origin || LOCAL_ORIGIN.test(origin)),
});

app.use((req, res, next) => {
  if (!LOCAL_HOST.test(req.headers.host || '')) return res.status(403).end();
  if (req.headers.origin && !LOCAL_ORIGIN.test(req.headers.origin)) return res.status(403).end();
  next();
});
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---- websocket fan-out ----
// Clients subscribe with ?session=<id>; without it they watch every session.

const watchers = new Map(); // sessionId | '*' -> Set<ws>

function subscribe(key, ws) {
  ws.key = key;
  ws.visible = true;
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'presence') ws.visible = !!msg.visible;
    } catch { /* ignore */ }
  });
  if (!watchers.has(key)) watchers.set(key, new Set());
  watchers.get(key).add(ws);
  ws.on('close', () => {
    const set = watchers.get(key);
    if (set) { set.delete(ws); if (!set.size) watchers.delete(key); }
  });
}

function broadcast(sessionId, message) {
  const data = JSON.stringify(message);
  for (const key of [sessionId, '*']) {
    for (const ws of watchers.get(key) || []) {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  }
}

// Progression is global: every open window hears about it.
function broadcastProfile(outcome) {
  const data = JSON.stringify({ type: 'profile', profile: profile.snapshot(), outcome: outcome || null });
  for (const set of watchers.values()) {
    for (const ws of set) if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function applyProgress(outcome, always = false) {
  if (always || !progress.isEmpty(outcome)) broadcastProfile(outcome);
}

function broadcastAll(message) {
  const data = JSON.stringify(message);
  for (const set of watchers.values()) {
    for (const ws of set) if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

const permissions = createPermissions({
  getSettings: () => profile.settings().permissions,
  broadcastAll,
  visibleWindows: sessionId => [sessionId, '*'].some(k => [...(watchers.get(k) || [])].some(ws => ws.visible && ws.readyState === WebSocket.OPEN)),
});

function syncMessage(s) {
  return { type: 'sync', session: store.snapshot(s), recent: s.events.slice(-12) };
}

wss.on('connection', (ws, req) => {
  const sessionId = new URL(req.url, 'http://localhost').searchParams.get('session');
  subscribe(sessionId || '*', ws);
  const targets = sessionId ? (store.has(sessionId) ? [store.get(sessionId)] : []) : store.list();
  ws.send(JSON.stringify({ type: 'profile', profile: profile.snapshot(), outcome: null }));
  for (const request of permissions.list()) ws.send(JSON.stringify({ type: 'permission', request }));
  for (const s of targets) ws.send(JSON.stringify(syncMessage(s)));
});

// ---- hook + status line ingestion ----

// The plugin and `npm run setup` install the same hooks; if both are active,
// every event arrives twice. Drop exact repeats seen within a few seconds.
const recentKeys = new Map();
function isDuplicate(body) {
  const key = [body.session_id, body.hook_event_name, body.tool_use_id, body.agent_id, body.prompt, body.message].join('|');
  const now = Date.now();
  for (const [k, t] of recentKeys) if (now - t > 3000) recentKeys.delete(k);
  if (recentKeys.has(key)) return true;
  recentKeys.set(key, now);
  return false;
}

app.post('/hook', (req, res) => {
  res.json({ ok: true }); // never make Claude Code wait on the game
  const body = req.body || {};
  if (!body.session_id || isDuplicate(body)) return;
  const evt = normalize(body);
  const s = store.recordHook(body, evt);
  const { outcome, bossEvent } = progress.fromEvent(evt, store.snapshot(s), s);
  broadcast(s.id, { type: 'event', event: evt, session: store.snapshot(s), boss: bossEvent });
  applyProgress(outcome);
  log(evt);
});

// Long-polled by scripts/permission-hook.js.
app.post('/permission', async (req, res) => {
  res.json(await permissions.wait(req.body || {}));
});
app.get('/api/token', permissions.token);
app.post('/api/permission/:id', permissions.decide);
app.get('/api/settings', (_req, res) => res.json(profile.settings()));
app.post('/api/settings', (req, res) => {
  if (req.get('x-quest-token') !== permissions.token.value) return res.status(403).json({ error: 'forbidden' });
  res.json(profile.updateSettings(req.body || {}));
});

app.post('/statusline', (req, res) => {
  res.json({ ok: true });
  const body = req.body || {};
  if (!body.session_id) return;
  const s = store.recordStatusline(body);
  const snap = store.snapshot(s);
  broadcast(s.id, { type: 'stats', session: snap });
  applyProgress(progress.fromUsage(s.id, snap));
});

// ---- read API ----

app.use('/api', api(outcome => applyProgress(outcome || { xp: 0, gold: 0, levelUp: null, achievements: [], daily: [] }, true)));

app.get('/api/sessions', (_req, res) => {
  res.json(store.list().map(store.snapshot));
});

app.get('/api/sessions/:id', (req, res) => {
  if (!store.has(req.params.id)) return res.status(404).json({ error: 'unknown session' });
  const s = store.get(req.params.id);
  store.refreshSummary(s);
  res.json(syncMessage(s));
});

// Token counts come from the transcript, which grows between hook calls.
setInterval(() => {
  for (const s of store.list()) {
    if (Date.now() - s.lastSeen > 10 * 60 * 1000) continue;
    const before = s.summary && s.summary.tokens && s.summary.tokens.total;
    store.refreshSummary(s);
    const after = s.summary && s.summary.tokens && s.summary.tokens.total;
    if (after === before) continue;
    const snap = store.snapshot(s);
    broadcast(s.id, { type: 'stats', session: snap });
    applyProgress(progress.fromUsage(s.id, snap));
  }
}, TOKEN_REFRESH_MS).unref();

setInterval(store.sweep, 60 * 60 * 1000).unref();

function log(evt) {
  const who = evt.sessionId.slice(0, 8);
  const what = [evt.hook, evt.tool, evt.detail].filter(Boolean).join(' · ');
  console.log(`${new Date(evt.at).toLocaleTimeString()} [${who}] ${what}`);
}

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use: Crab Quest is probably running already.`);
    process.exit(0);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Crab Quest → http://localhost:${PORT}`);
});
