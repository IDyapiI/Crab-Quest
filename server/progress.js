// Turns session activity into progression. Runs for every hook, whether or
// not a game window is open.

const profile = require('./profile');
const boss = require('./boss');

function merge(outcomes) {
  const out = { xp: 0, gold: 0, levelUp: null, achievements: [], daily: [] };
  for (const o of outcomes) {
    out.xp += o.xp;
    out.gold += o.gold;
    if (o.levelUp) out.levelUp = o.levelUp;
    out.achievements.push(...o.achievements);
    out.daily.push(...(o.daily || []));
    if (o.drop) out.drop = o.drop;
    if (o.bossGold) out.bossGold = o.bossGold;
  }
  return out;
}

// Returns { outcome, bossEvent } — the boss event belongs to this session only.
function fromEvent(evt, snap, session) {
  if (evt.mcp) evt.mcp.slot = profile.ensureMcpSlot(evt.mcp.server);
  const outs = [profile.onSessionSeen(evt.sessionId, { title: snap.title, project: snap.project })];
  let bossEvent = null;
  // Pre and Post both arrive for each call: count the tool once, on Post.
  if (evt.tool && (evt.hook === 'PostToolUse' || evt.hook === 'PostToolUseFailure')) {
    outs.push(profile.onToolUsed(evt.sessionId, evt.mcp ? `mcp:${evt.mcp.server}` : evt.tool));
    bossEvent = boss.onToolResult(session.fight, evt, profile.snapshot().level);
    if (bossEvent && bossEvent.event === 'defeat') {
      const won = profile.bossDefeated(evt.sessionId, bossEvent);
      bossEvent.gold = won.bossGold;
      bossEvent.drop = won.drop || null;
      outs.push(won);
    }
  }
  if (evt.hook === 'SubagentStart') outs.push(profile.onSubagent(evt.sessionId));
  if (evt.hook === 'PostCompact') outs.push(profile.onCompact(evt.sessionId));
  outs.push(fromUsage(evt.sessionId, snap));
  return { outcome: merge(outs), bossEvent };
}

function fromUsage(sessionId, snap) {
  return profile.onUsage(sessionId, (snap.tokens && snap.tokens.total) || 0, snap.cost);
}

const isEmpty = out => !out.xp && !out.gold && !out.levelUp && !out.achievements.length && !out.daily.length;

module.exports = { fromEvent, fromUsage, isEmpty };
