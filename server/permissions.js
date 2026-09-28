// Answer Claude Code permission prompts from the game.
//
// The PermissionRequest hook script long-polls POST /permission. The prompt
// is shown in every visible game window; the first Allow/Deny wins. Without
// a visible window, or when the feature is off, the hook returns at once and
// Claude Code shows its normal dialog. Decisions need a per-launch token that
// only same-origin pages can read, so other websites can't approve anything.

const crypto = require('crypto');

const TOKEN = crypto.randomBytes(24).toString('hex');
const EXCLUDED = new Set(['AskUserQuestion', 'ExitPlanMode']); // need a real answer in the terminal

const pending = new Map(); // id -> { resolve, timer, request }

function isLocalRequest(req) {
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return false; // DNS rebinding
  const origin = req.headers.origin;
  return !origin || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
}

module.exports = function permissions({ getSettings, visibleWindows, broadcastAll }) {
  function summary(body) {
    const input = body.tool_input || {};
    const detail = input.command || input.file_path || input.url || input.pattern || input.query || input.description || '';
    return { tool: body.tool_name, detail: String(detail).slice(0, 300), cwd: body.cwd || null };
  }

  // From the hook script. Resolves to { behavior } or {} (let the terminal ask).
  function wait(body) {
    const settings = getSettings();
    if (!settings.enabled || EXCLUDED.has(body.tool_name) || !visibleWindows(body.session_id)) return Promise.resolve({});
    const id = crypto.randomBytes(8).toString('hex');
    const request = { id, sessionId: body.session_id, ...summary(body), expiresAt: Date.now() + settings.wait * 1000 };
    return new Promise(resolve => {
      const done = decision => {
        clearTimeout(pending.get(id).timer);
        pending.delete(id);
        broadcastAll({ type: 'permission_done', id, behavior: decision.behavior || null });
        resolve(decision);
      };
      pending.set(id, { request, done, timer: setTimeout(() => done({}), settings.wait * 1000) });
      broadcastAll({ type: 'permission', request });
    });
  }

  function decide(req, res) {
    if (!isLocalRequest(req) || req.get('x-quest-token') !== TOKEN) return res.status(403).json({ error: 'forbidden' });
    const p = pending.get(req.params.id);
    if (!p) return res.status(404).json({ error: 'expired' });
    const behavior = req.body && req.body.behavior;
    if (behavior !== 'allow' && behavior !== 'deny') return res.status(400).json({ error: 'behavior must be allow or deny' });
    console.log(`${new Date().toLocaleTimeString()} [permission] ${behavior} ${p.request.tool} ${p.request.detail.slice(0, 60)}`);
    p.done({ behavior });
    res.json({ ok: true });
  }

  function token(req, res) {
    if (!isLocalRequest(req)) return res.status(403).json({ error: 'forbidden' });
    res.json({ token: TOKEN });
  }

  const list = () => [...pending.values()].map(p => p.request);

  token.value = TOKEN;
  return { wait, decide, token, list, isLocalRequest };
};
