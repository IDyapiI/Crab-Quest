// In-memory session registry. Bounded: each session keeps its recent events
// only, and sessions idle for a day are dropped.

const path = require('path');
const transcript = require('./transcript');
const { modelInfo } = require('./pricing');
const boss = require('./boss');

const HISTORY_LIMIT = 200;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const sessions = new Map();

function get(id) {
  let s = sessions.get(id);
  if (!s) {
    s = {
      id,
      title: null,
      name: null,
      cwd: null,
      transcriptPath: null,
      model: null,
      permissionMode: null,
      status: 'idle',
      startedAt: Date.now(),
      lastSeen: Date.now(),
      events: [],
      quests: [],
      subagents: {},
      live: {}, // hook-side tool counts, used until the transcript is readable
      statusline: null,
      summary: null,
      fight: boss.create(),
    };
    sessions.set(id, s);
  }
  return s;
}

function refreshSummary(s) {
  if (s.transcriptPath) s.summary = transcript.summarize(s.transcriptPath) || s.summary;
  if (!s.model && s.summary && s.summary.lastModel) s.model = s.summary.lastModel;
}

// ---- quests (TodoWrite and the Task* tools) ----

function taskId(response) {
  if (!response) return null;
  if (typeof response === 'object') {
    const t = response.task || response;
    if (t.id != null) return String(t.id);
  }
  const m = String(typeof response === 'string' ? response : JSON.stringify(response)).match(/#?(\d+)/);
  return m ? m[1] : null;
}

function updateQuests(s, body) {
  const input = body.tool_input || {};
  const hook = body.hook_event_name;
  switch (body.tool_name) {
    case 'TodoWrite':
      if (hook === 'PreToolUse' && Array.isArray(input.todos)) {
        s.quests = input.todos.map((t, i) => ({ id: String(i), text: t.content || t.activeForm || '?', status: t.status || 'pending' }));
      }
      break;
    case 'TaskCreate':
      if (hook === 'PostToolUse') {
        s.quests.push({ id: taskId(body.tool_response) || String(s.quests.length + 1), text: input.subject || input.description || '?', status: 'pending' });
      }
      break;
    case 'TaskUpdate':
      if (hook === 'PostToolUse' && input.taskId != null) {
        const q = s.quests.find(q => q.id === String(input.taskId));
        if (q) {
          if (input.status === 'deleted') s.quests = s.quests.filter(x => x !== q);
          else if (input.status) q.status = input.status;
          if (input.subject) q.text = input.subject;
        }
      }
      break;
  }
}

// ---- status machine ----

// No hook fires while the model reasons, so "thinking" is inferred: after a
// prompt, or after a main-thread tool finished and before the next one starts.
function updateStatus(s, evt) {
  switch (evt.hook) {
    case 'SessionStart': s.status = 'idle'; break;
    case 'UserPromptSubmit': s.status = 'thinking'; s.thinkingSince = evt.at; break;
    case 'PostToolUse': case 'PostToolUseFailure':
      if (!evt.agentId && !Object.keys(s.subagents).length) { s.status = 'thinking'; s.thinkingSince = evt.at; }
      break;
    case 'PreToolUse': case 'SubagentStart': case 'PreCompact':
      s.status = 'working'; break;
    case 'PermissionRequest': s.status = 'waiting'; break;
    case 'Notification':
      if (evt.notificationType === 'permission_prompt' || /permission|approv/i.test(evt.message || '')) s.status = 'waiting';
      else if (evt.notificationType === 'idle_prompt') s.status = 'idle';
      break;
    case 'Stop': case 'StopFailure': s.status = 'done'; break;
    case 'SessionEnd': s.status = 'ended'; break;
  }
}

function recordHook(body, evt) {
  const s = get(evt.sessionId);
  s.lastSeen = evt.at;
  if (body.cwd) s.cwd = body.cwd;
  if (body.permission_mode) s.permissionMode = body.permission_mode;
  if (body.transcript_path && body.transcript_path !== s.transcriptPath) s.transcriptPath = body.transcript_path;

  if (evt.hook === 'PreToolUse' && evt.tool && !evt.agentId) s.live[evt.tool] = (s.live[evt.tool] || 0) + 1;
  if (evt.hook === 'SubagentStart' && evt.agentId) s.subagents[evt.agentId] = { type: evt.agentType, since: evt.at };
  if (evt.hook === 'SubagentStop' && evt.agentId) delete s.subagents[evt.agentId];
  if (evt.hook === 'SessionStart' && evt.source === 'clear') s.quests = [];

  updateQuests(s, body);
  updateStatus(s, evt);
  s.events.push(evt);
  if (s.events.length > HISTORY_LIMIT) s.events.splice(0, s.events.length - HISTORY_LIMIT);
  refreshSummary(s);
  return s;
}

function recordStatusline(data) {
  const s = get(data.session_id);
  s.lastSeen = Date.now();
  s.statusline = data;
  if (data.session_name) s.name = data.session_name;
  if (data.model && data.model.id) s.model = data.model.id;
  if (data.cwd) s.cwd = data.cwd;
  if (data.transcript_path) s.transcriptPath = data.transcript_path;
  return s;
}

// ---- snapshot sent to game clients ----

function context(s) {
  const cw = s.statusline && s.statusline.context_window;
  const size = (cw && cw.context_window_size) || modelInfo(s.model || '').window;
  if (cw && cw.used_percentage != null) {
    const cu = cw.current_usage || {};
    const used = (cu.input_tokens || 0) + (cu.cache_creation_input_tokens || 0) + (cu.cache_read_input_tokens || 0);
    return { used: used || Math.round(size * cw.used_percentage / 100), size, pct: cw.used_percentage };
  }
  const used = (s.summary && s.summary.lastContext) || 0;
  return { used, size, pct: size ? Math.round((used / size) * 100) : 0 };
}

function snapshot(s) {
  const sum = s.summary;
  const sl = s.statusline || {};
  const tools = sum && sum.toolCalls ? sum.tools : s.live;
  const realCost = sl.cost && sl.cost.total_cost_usd;
  return {
    id: s.id,
    title: s.name || (sum && sum.title) || null,
    project: s.cwd ? path.basename(s.cwd) : null,
    model: s.model,
    modelName: (sl.model && sl.model.display_name) || (s.model ? modelInfo(s.model).name : null),
    permissionMode: s.permissionMode,
    status: s.status,
    thinkingSince: s.status === 'thinking' ? s.thinkingSince || null : null,
    startedAt: s.startedAt,
    lastSeen: s.lastSeen,
    tools,
    toolCalls: Object.values(tools).reduce((a, b) => a + b, 0),
    tokens: sum ? sum.tokens : null,
    cost: realCost != null ? realCost : (sum ? sum.estimatedCost : 0),
    costIsEstimate: realCost == null,
    context: context(s),
    quests: s.quests,
    subagents: Object.entries(s.subagents).map(([id, a]) => ({ id, ...a })),
    boss: s.fight.boss,
    rateLimits: sl.rate_limits || null,
    lines: sl.cost ? { added: sl.cost.total_lines_added || 0, removed: sl.cost.total_lines_removed || 0 } : null,
  };
}

function list() {
  return [...sessions.values()].sort((a, b) => b.lastSeen - a.lastSeen);
}

function sweep() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) {
    if (s.lastSeen < cutoff) {
      if (s.transcriptPath) transcript.forget(s.transcriptPath);
      sessions.delete(id);
    }
  }
}

module.exports = { get, recordHook, recordStatusline, refreshSummary, snapshot, list, sweep, has: id => sessions.has(id) };
