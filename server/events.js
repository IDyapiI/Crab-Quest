// Turns raw hook payloads into the compact events the game consumes.
// Tool inputs can be huge (Write content, long prompts), so only a short
// human-readable detail is kept.

const path = require('path');

const clip = (s, n = 80) => {
  if (typeof s !== 'string') return '';
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > n ? flat.slice(0, n - 1) + '…' : flat;
};

const base = p => (typeof p === 'string' ? path.basename(p) : '');

function host(url) {
  try { return new URL(url).hostname; } catch { return clip(url, 40); }
}

function parseMcp(tool) {
  if (!tool || !tool.startsWith('mcp__')) return null;
  const [, server = '?', ...rest] = tool.split('__');
  // Plugin servers are named plugin_<plugin>_<server>, often the same word twice.
  let name = server.replace(/^plugin_/, '');
  const half = name.slice(0, (name.length - 1) / 2);
  if (name === `${half}_${half}`) name = half;
  return { server: name, tool: rest.join('__') };
}

function describeTool(tool, input = {}) {
  const mcp = parseMcp(tool);
  if (mcp) return mcp.tool.replace(/_/g, ' ');
  switch (tool) {
    case 'Read': case 'Write': case 'Edit': case 'MultiEdit':
      return base(input.file_path);
    case 'NotebookEdit':
      return base(input.notebook_path);
    case 'Bash': case 'PowerShell':
      return clip(input.description || input.command, 60);
    case 'Grep': case 'Glob':
      return clip(input.pattern, 40);
    case 'Agent': case 'Task':
      return clip(input.description || input.subagent_type);
    case 'WebSearch': case 'ToolSearch':
      return clip(input.query);
    case 'WebFetch':
      return host(input.url);
    case 'Skill':
      return clip(input.skill || input.command);
    case 'AskUserQuestion':
      return clip(input.questions && input.questions[0] && input.questions[0].question);
    case 'TaskCreate':
      return clip(input.subject || input.description);
    case 'TaskUpdate':
      return clip([input.taskId && `#${input.taskId}`, input.status].filter(Boolean).join(' → '));
    case 'SendMessage':
      return clip(input.to);
    case 'Artifact':
      return clip(input.title || base(input.file_path) || input.url || input.action);
    case 'SendUserFile':
      return clip(Array.isArray(input.files) ? input.files.map(base).join(', ') : input.caption);
    case 'PushNotification':
      return clip(input.title || input.message || input.body);
    case 'ReportFindings':
      return Array.isArray(input.findings) ? `${input.findings.length} finding${input.findings.length === 1 ? '' : 's'}` : '';
    case 'TaskOutput': case 'TaskStop':
      return clip(input.task_id || input.taskId || input.shell_id);
    case 'Monitor':
      return clip(input.description || input.command, 60);
    case 'ScheduleWakeup':
      return clip(input.reason);
    case 'CronCreate':
      return clip([input.cron || input.schedule, input.prompt].filter(Boolean).join(' · '));
    case 'Workflow':
      return clip(input.name || input.description);
    case 'EnterPlanMode': case 'ExitPlanMode':
      return 'plan';
    case 'LSP':
      return clip([input.operation, base(input.filePath || input.file_path)].filter(Boolean).join(' '));
    case 'TaskGet':
      return clip(input.taskId && `#${input.taskId}`);
    case 'EnterWorktree':
      return clip(input.name || input.branch);
    default: {
      const first = Object.values(input).find(v => typeof v === 'string');
      return clip(first);
    }
  }
}

function errorText(body) {
  const r = body.error || body.tool_response;
  if (typeof r === 'string') return clip(r, 100);
  if (r && typeof r === 'object') return clip(r.error || r.message || r.stderr || '', 100);
  return '';
}

function normalize(body) {
  const hook = body.hook_event_name || 'Unknown';
  const tool = body.tool_name || null;
  const evt = {
    hook,
    sessionId: body.session_id || null,
    at: Date.now(),
  };
  if (tool) {
    evt.tool = tool;
    evt.toolUseId = body.tool_use_id || null;
    evt.detail = describeTool(tool, body.tool_input);
    const mcp = parseMcp(tool);
    if (mcp) evt.mcp = mcp;
  }
  if (hook === 'PostToolUseFailure' || hook === 'PermissionDenied' || hook === 'StopFailure') {
    evt.isError = true;
    evt.error = errorText(body);
  }
  if (body.agent_id) {
    evt.agentId = body.agent_id;
    evt.agentType = body.agent_type || null;
  }
  if (body.message) evt.message = clip(body.message, 120);
  if (body.notification_type) evt.notificationType = body.notification_type;
  if (body.prompt) evt.prompt = clip(body.prompt, 120);
  if (body.source) evt.source = body.source;
  if (body.trigger) evt.trigger = body.trigger;
  return evt;
}

module.exports = { normalize, parseMcp };
