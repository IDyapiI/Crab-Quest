// Every Claude Code tool maps to a station: a villager standing somewhere on
// the map. MCP tools go to the guild, anything unknown to the wanderer.

// outfit: tunic | robe | armor | apron; prop: what the villager holds.
// lines: greetings; master: lines once Master or Legend ({n} = lifetime uses);
// fail: said when the tool errors.
export const STATIONS = {
  Read: { at: [1, 11], label: 'READ', icon: 'read', hat: 'cap', outfit: 'tunic', prop: 'book',
    colors: { body: '#4f86f7', accent: '#bcd4ff', hat: '#2f5fc4' },
    lines: ['Let me check that tome...', 'Opening the archives!', 'Ah, a fellow reader!', 'Page one, line one...', 'Knowledge is power!'],
    master: ['{n} files read. I could recite them.', 'I have read every scroll in this village.'],
    fail: ['That page is torn...', "I can't find that book!"] },
  Write: { at: [4, 12], label: 'WRITE', icon: 'write', hat: 'cap', outfit: 'apron', prop: 'quill',
    colors: { body: '#3fae5a', accent: '#c8f5d2', hat: '#257a3c' },
    lines: ['My quill is ready!', 'Inscribing a new scroll...', 'Fresh parchment!', 'A blank page, how exciting!', 'Let the ink flow.'],
    master: ['{n} scrolls written, and counting.', 'My handwriting is legendary.'],
    fail: ['The ink spilled!', 'This scroll refuses the ink...'] },
  Edit: { at: [6, 12], label: 'EDIT', icon: 'edit', hat: 'helm', outfit: 'armor', prop: 'hammer',
    colors: { body: '#f0a030', accent: '#ffe2a8', hat: '#b87316' },
    lines: ['A small correction...', 'Precision is key!', 'Hammering it into shape!', 'Measure twice, edit once.', 'Just one line...'],
    master: ['{n} edits. Not one wasted stroke.', 'I can refactor in my sleep.'],
    fail: ["That string wasn't where you said!", 'The anvil slipped!'] },
  Grep: { at: [1, 9], label: 'GREP', icon: 'grep', hat: 'hood', outfit: 'tunic', prop: 'magnifier',
    colors: { body: '#e5534b', accent: '#ffc9c5', hat: '#a8312b' },
    lines: ['I detect a pattern!', 'Searching for clues...', 'Nothing escapes my lens.', 'Elementary!', 'Regex, my old friend.'],
    master: ['{n} searches. I see matches in my dreams.', 'Give me a pattern, I give you the world.'],
    fail: ['My lens is foggy...', 'That pattern makes no sense!'] },
  Glob: { at: [1, 7], label: 'GLOB', icon: 'glob', hat: 'hood', outfit: 'tunic', prop: 'map',
    colors: { body: '#ef6fa8', accent: '#ffd3e6', hat: '#b8457a' },
    lines: ['Mapping the land...', 'Patterns everywhere!', 'Let me look around.', 'Stars and slashes...', 'Every file has a place.'],
    master: ['{n} maps drawn. I know every folder.'],
    fail: ['That path leads nowhere...'] },
  Bash: { at: [1, 5], label: 'BASH', icon: 'bash', hat: 'helm', outfit: 'armor', prop: 'terminal',
    colors: { body: '#6b6f80', accent: '#63d471', hat: '#43465a' },
    lines: ['Command received!', 'Terminal at the ready.', 'Executing orders!', 'Pipes and redirects!', 'sudo make me a sandwich.'],
    master: ['{n} commands. The shell obeys me.', 'I speak fluent terminal.'],
    fail: ['Non-zero exit! Retreat!', 'The command backfired!', 'Segfault... again.'],
    tools: ['PowerShell', 'Monitor', 'TaskOutput', 'TaskStop', 'BashOutput', 'KillShell'] },
  Agent: { at: [12, 7], label: 'AGENT', icon: 'agent', hat: 'crown', outfit: 'armor', prop: 'banner',
    colors: { body: '#9b5de5', accent: '#e4ccff', hat: '#f2c14e' },
    lines: ['Deploying the squad!', 'Mission accepted.', 'Sending a scout!', 'Divide and conquer!', 'Troops, move out!'],
    master: ['{n} missions commanded.', 'My agents never come back empty-handed.'],
    fail: ['The scout got lost!'],
    tools: ['Task', 'SendMessage', 'ListAgents', 'Workflow', 'SubagentHandback'] },
  WebSearch: { at: [9, 1], label: 'SEARCH', icon: 'search', hat: 'wizard', outfit: 'robe', prop: 'crystal',
    colors: { body: '#2ec4b6', accent: '#c9fff9', hat: '#1b857b' },
    lines: ['Casting a wide net...', 'Knowledge awaits!', 'Scrying the web...', 'The crystal shows me...', 'Let me ask the ether.'],
    master: ['{n} visions. The web holds no secrets.'],
    fail: ['The crystal is cloudy...'] },
  WebFetch: { at: [13, 3], label: 'FETCH', icon: 'fetch', hat: 'cap', outfit: 'tunic', prop: 'envelope',
    colors: { body: '#3bb3e0', accent: '#d0f1ff', hat: '#1f7ba0' },
    lines: ['Fetching the page...', 'A letter from afar!', 'Downloading now!', 'Special delivery!', 'Across the river and back!'],
    master: ['{n} deliveries, zero lost.'],
    fail: ['404! The address is wrong!', 'The courier was turned away.'] },
  Quest: { at: [8, 12], label: 'QUESTS', icon: 'quest', hat: 'cap', outfit: 'apron', prop: 'clipboard',
    colors: { body: '#d9c04a', accent: '#fff5c2', hat: '#9c8520' },
    lines: ['Updating the quest log!', 'New objectives!', 'Crossing that off...', 'Step by step!', 'The board is filling up.'],
    master: ['{n} quest updates. Organisation is my art.'],
    fail: ['My pen ran dry...'],
    tools: ['TodoWrite', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate'] },
  Skill: { at: [10, 12], label: 'SKILL', icon: 'skill', hat: 'wizard', outfit: 'robe', prop: 'wand',
    colors: { body: '#e36ee3', accent: '#ffd6ff', hat: '#9e3b9e' },
    lines: ['Special move!', 'Skill unlocked!', 'Consulting my grimoire...', 'Abracadabra!', 'A technique of old!'],
    master: ['{n} spells cast. My grimoire is full.'],
    fail: ['The spell fizzled!'],
    tools: ['SlashCommand'] },
  Plan: { at: [12, 12], label: 'PLAN', icon: 'plan', hat: 'crown', outfit: 'robe', prop: 'blueprint',
    colors: { body: '#577590', accent: '#d7e6f5', hat: '#f2c14e' },
    lines: ['Let us draw the battle plan.', 'Strategy first!', 'The plan is ready.', 'Think before you code!', 'Blueprints never lie.'],
    master: ['{n} plans drawn. Chaos fears me.'],
    fail: ['Back to the drawing board...'],
    tools: ['EnterPlanMode', 'ExitPlanMode'] },
  Ask: { at: [14, 12], label: 'ASK', icon: 'ask', hat: 'wizard', outfit: 'robe', prop: 'orb',
    colors: { body: '#f3722c', accent: '#ffe0cc', hat: '#b04c14' },
    lines: ['The oracle seeks your answer...', 'A question for the hero!', 'Choose wisely...', 'Only you can decide.', 'Speak, traveller!'],
    master: ['{n} questions asked. I know you well now.'],
    fail: ['The question went unanswered...'],
    tools: ['AskUserQuestion'] },
  Sage: { at: [5, 3], label: 'SAGE', icon: 'sage', hat: 'wizard', outfit: 'robe', prop: 'tome',
    colors: { body: '#43aa8b', accent: '#d4f5ea', hat: '#2a6f5a' },
    lines: ['I know where that lives.', 'Let me consult the index...', 'Ancient knowledge!', 'Symbols reveal themselves...', 'A tool for every task.'],
    master: ['{n} lookups. I am the village index.'],
    fail: ['Even the sage forgets...'],
    tools: ['ToolSearch', 'LSP', 'WaitForMcpServers'] },
  Portal: { at: [7, 7], label: 'PORTAL', icon: 'portal', hat: 'hood', outfit: 'robe', prop: 'orb',
    colors: { body: '#7b2cbf', accent: '#e0c3fc', hat: '#4a1a78' },
    lines: ['Opening a parallel world...', 'Mind the branch!', 'Through the portal!', 'Another timeline awaits.', 'Worlds within worlds.'],
    master: ['{n} worlds opened. None collapsed.'],
    fail: ['The portal flickered shut!'],
    tools: ['EnterWorktree', 'ExitWorktree'] },
  Clock: { at: [4, 7], label: 'CLOCK', icon: 'clock', hat: 'helm', outfit: 'apron', prop: 'hourglass',
    colors: { body: '#bc6c25', accent: '#fde6c8', hat: '#7f4513' },
    lines: ['I will remind you.', 'Tick tock!', 'Scheduled!', 'Time waits for no one.', 'I set the bells ringing.'],
    master: ['{n} reminders. Never late, never early.'],
    fail: ['My gears jammed!'],
    tools: ['CronCreate', 'CronDelete', 'CronList', 'ScheduleWakeup', 'RemoteTrigger'] },
  Herald: { at: [16, 3], label: 'HERALD', icon: 'herald', hat: 'crown', outfit: 'tunic', prop: 'trumpet',
    colors: { body: '#c1121f', accent: '#ffd6d9', hat: '#f2c14e' },
    lines: ['Hear ye, hear ye!', 'A message for the realm!', 'Publishing the news!', 'Let the village know!', 'Toot toot! News!'],
    master: ['{n} proclamations. Everyone knows my voice.'],
    fail: ['My trumpet is out of tune...'],
    tools: ['Artifact', 'SendUserFile', 'PushNotification', 'ReportFindings', 'ShareOnboardingGuide', 'SendFeedback', 'EndConversation'] },
  Wanderer: { at: [6, 5], label: '???', icon: 'mystery', hat: 'hood', outfit: 'robe', prop: 'lantern',
    colors: { body: '#555566', accent: '#999aaa', hat: '#333344' },
    lines: ['A strange tool indeed...', 'Never seen this one!', 'Mysterious...', 'Where did this come from?', 'I roam where others fear.'],
    master: ['{n} oddities. Nothing surprises me now.'],
    fail: ['Even I do not understand this one.'] },
};

// MCP servers get their own villagers on the guild plaza (a slot per server,
// remembered in the profile); the guild master handles the overflow and the
// resource tools.
export const MCP_SLOTS = [[16, 9], [18, 9], [16, 11], [18, 11], [17, 7], [15, 11]];
export const GUILD_MASTER = {
  at: [18, 7], label: 'MCP', icon: 'mcp', hat: 'crown', outfit: 'robe', prop: 'staff',
  colors: { body: '#6446a8', accent: '#e6dcff', hat: '#f2c14e' },
  lines: ['The guild answers!', 'Summoning a server...', 'Protocol engaged.', 'Every server has a voice here.'],
  master: ['{n} calls routed through my guild.'],
  fail: ['The server did not answer...'],
  tools: ['ListMcpResourcesTool', 'ReadMcpResourceTool'],
};

const MCP_COLORS = ['#e76f51', '#2a9d8f', '#e9c46a', '#8ab17d', '#f4a261', '#4895ef'];

const byTool = {};
for (const [key, st] of Object.entries(STATIONS)) {
  byTool[key] = key;
  for (const t of st.tools || []) byTool[t] = key;
}
for (const t of GUILD_MASTER.tools) byTool[t] = 'mcp:*';
byTool.MultiEdit = 'Edit';
byTool.NotebookEdit = 'Edit';

export function stationKeyFor(tool) {
  if (!tool) return null;
  if (tool.startsWith('mcp__')) {
    // Same naming as the server: drop "plugin_", collapse "notion_notion".
    let name = (tool.split('__')[1] || '?').replace(/^plugin_/, '');
    const half = name.slice(0, (name.length - 1) / 2);
    if (name === `${half}_${half}`) name = half;
    return 'mcp:' + name;
  }
  return byTool[tool] || 'Wanderer';
}

export function mcpStation(server, index) {
  const at = MCP_SLOTS[index];
  if (!at) return null;
  const name = server.replace(/_/g, ' ').toUpperCase().slice(0, 10);
  return {
    at, label: name, icon: 'mcp', hat: ['cap', 'hood', 'helm', 'wizard'][index % 4], outfit: 'tunic', prop: 'plug',
    colors: { body: MCP_COLORS[index % MCP_COLORS.length], accent: '#f4efe6', hat: '#2b2340' },
    lines: [`${name} at your service!`, 'Calling the server...', 'Remote magic!', 'Connecting...', 'Request sent!'],
    master: [`{n} calls. ${name} and I are inseparable.`],
    fail: ['Timeout! The server is asleep.', 'Connection refused...'],
  };
}

// Station keys for the HUD inventory, in a stable order.
export const INVENTORY_ORDER = [
  'Read', 'Edit', 'Write', 'Bash', 'Grep', 'Glob', 'Agent', 'WebSearch', 'WebFetch',
  'Quest', 'Skill', 'Plan', 'Ask', 'Sage', 'Portal', 'Clock', 'Herald',
];

// ---- villager levels: lifetime uses of a station's tools ----

export const VILLAGER_TIERS = [
  { min: 0, name: 'NOVICE' }, { min: 50, name: 'ADEPT' }, { min: 200, name: 'EXPERT' },
  { min: 500, name: 'MASTER' }, { min: 1500, name: 'LEGEND' },
];

export function tierFor(uses) {
  let t = 0;
  while (t + 1 < VILLAGER_TIERS.length && uses >= VILLAGER_TIERS[t + 1].min) t++;
  return t;
}

// toolCounts: { toolName | 'mcp:server': uses } -> { stationKey: uses }
export function stationCounts(toolCounts = {}) {
  const out = {};
  for (const [tool, n] of Object.entries(toolCounts)) {
    const key = tool.startsWith('mcp:') ? tool : stationKeyFor(tool);
    out[key] = (out[key] || 0) + n;
    if (key.startsWith('mcp:')) out['mcp:*'] = (out['mcp:*'] || 0) + n;
  }
  return out;
}

// ---- village guide texts ----

export const ROLES = {
  Read: 'The village librarian. Opens any file Claude wants to look at: code, configs, images, PDFs, notebooks.',
  Write: 'The scribe. Creates new files, or rewrites a whole file from scratch.',
  Edit: 'The blacksmith. Makes precise changes inside existing files, replacing exact pieces of text.',
  Grep: 'The detective. Searches inside files for a word or a regex pattern.',
  Glob: 'The cartographer. Finds files by their names and paths.',
  Bash: 'The engineer. Runs terminal commands: tests, builds, git, installs, scripts, background jobs.',
  Agent: 'The commander. Sends sub-agents — the little Clawds — on missions with their own context, and coordinates teams.',
  WebSearch: 'The seer. Searches the internet for up-to-date answers.',
  WebFetch: 'The courier. Brings back a web page so Claude can read it.',
  Quest: 'The quest keeper. Maintains the task list — your session quests in the journal.',
  Skill: 'The spellcaster. Runs skills (packaged instructions for a kind of task) and slash commands.',
  Plan: 'The strategist. Plan mode: Claude explores and writes a plan before touching the code, then asks you to approve it.',
  Ask: 'The oracle. Brings Claude\'s questions to you when it needs a decision.',
  Sage: 'The scholar. Finds the right tool to load, and code symbols, definitions and references through the language server.',
  Portal: 'The gatekeeper. Opens isolated git worktrees: parallel copies of the repository to work safely on a branch.',
  Clock: 'The clockmaker. Schedules reminders, recurring prompts and delayed wake-ups.',
  Herald: 'The town crier. Publishes and delivers things to you: artifacts, files, notifications, code review reports.',
  Wanderer: 'The stranger. Handles any tool the village doesn\'t know yet.',
  'mcp:*': 'Head of the MCP guild. Handles MCP resources, and servers that have no seat on the plaza.',
};

export const TOOL_INFO = {
  Read: 'Read a file (text, images, PDFs, notebooks)',
  Write: 'Create or overwrite a file',
  Edit: 'Replace an exact piece of text in a file',
  MultiEdit: 'Several edits in one file (older tool)',
  NotebookEdit: 'Edit a Jupyter notebook cell',
  Grep: 'Search file contents with a regex',
  Glob: 'Find files by name pattern',
  Bash: 'Run a shell command',
  PowerShell: 'Run a PowerShell command',
  Monitor: 'Watch a background command until something happens',
  TaskOutput: 'Read the output of a background task',
  TaskStop: 'Stop a background task',
  BashOutput: 'Read background shell output (older tool)',
  KillShell: 'Stop a background shell (older tool)',
  Agent: 'Launch a sub-agent with its own context',
  Task: 'Launch a sub-agent (older name of Agent)',
  SendMessage: 'Message another agent or teammate',
  ListAgents: 'List the agents you can talk to',
  Workflow: 'Run a multi-agent workflow script',
  SubagentHandback: 'A sub-agent hands its report back',
  WebSearch: 'Search the web',
  WebFetch: 'Download a web page and read it',
  TodoWrite: 'Update the todo list',
  TaskCreate: 'Create a tracked task',
  TaskGet: 'Read a tracked task',
  TaskList: 'List tracked tasks',
  TaskUpdate: 'Update a tracked task (status, subject)',
  Skill: 'Run a skill',
  SlashCommand: 'Run a slash command',
  EnterPlanMode: 'Switch to plan mode',
  ExitPlanMode: 'Present the plan for your approval',
  AskUserQuestion: 'Ask you a multiple-choice question',
  ToolSearch: 'Load the definition of a deferred tool',
  LSP: 'Ask the language server: definitions, references, diagnostics',
  WaitForMcpServers: 'Wait for MCP servers to connect',
  EnterWorktree: 'Move into an isolated git worktree',
  ExitWorktree: 'Leave the worktree',
  CronCreate: 'Schedule a recurring prompt',
  CronDelete: 'Delete a scheduled prompt',
  CronList: 'List scheduled prompts',
  ScheduleWakeup: 'Resume later (self-paced /loop)',
  RemoteTrigger: 'Trigger a cloud routine',
  Artifact: 'Publish an HTML page on claude.ai',
  SendUserFile: 'Send you a file',
  PushNotification: 'Send a notification to your devices',
  ReportFindings: 'Report code review findings',
  ShareOnboardingGuide: 'Share an onboarding guide link',
  SendFeedback: 'Send feedback',
  EndConversation: 'End the conversation',
  ListMcpResourcesTool: 'List the resources of MCP servers',
  ReadMcpResourceTool: 'Read an MCP resource',
};

export function toolsOf(key) {
  if (key === 'mcp:*') return GUILD_MASTER.tools;
  const st = STATIONS[key];
  if (!st) return [];
  const extra = { Edit: ['MultiEdit', 'NotebookEdit'] }[key] || [];
  return [key, ...(st.tools || []), ...extra].filter(t => t in TOOL_INFO);
}

export function whereIs([x, y]) {
  if (x >= 15 && y >= 5) return 'Guild plaza, east';
  if (y <= 3) return 'Riverside, north';
  if (x <= 2) return 'West road';
  if (y >= 12) return 'South market';
  return 'Village centre';
}
