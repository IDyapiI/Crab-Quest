#!/usr/bin/env node
// Installs Crab Quest into ~/.claude/settings.json: the hooks (same set as
// the plugin) and the status line. A timestamped backup is written first, and
// hooks that don't belong to Crab Quest are left untouched.
//
//   npm run setup                     hooks + status line
//   npm run setup -- --statusline-only   status line only (use with the plugin)
//   npm run setup -- --uninstall      remove everything Crab Quest added
//   npm run setup -- --no-autostart   don't start the server from SessionStart
//   npm run setup -- --no-permissions don't install the in-game permission hook

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const SETTINGS = path.join(CONFIG_DIR, 'settings.json');
const PLUGIN_HOOKS = require(path.join(ROOT, 'plugin', 'hooks', 'hooks.json')).hooks;
const STATUSLINE_CMD = `node "${path.join(ROOT, 'scripts', 'statusline.js')}"`;
// The plugin can't know where this checkout lives, so these hooks always come
// from setup. process.execPath pins the node that ran setup.
const node = script => `"${process.execPath}" "${path.join(ROOT, 'scripts', script)}"`;
const LOCAL_HOOKS = {
  SessionStart: { group: {}, hook: { type: 'command', command: `${node('ensure-server.js')} # crab-quest autostart`, async: true, timeout: 10 }, flag: 'autostart' },
  // Synchronous on purpose: Claude Code waits for the answer from the game.
  // It returns at once unless the in-game option is on and a window is visible.
  PermissionRequest: { group: { matcher: '*' }, hook: { type: 'command', command: `${node('permission-hook.js')} # crab-quest permissions`, timeout: 310 }, flag: 'permissions' },
};

const args = new Set(process.argv.slice(2));
const uninstall = args.has('--uninstall');
const statuslineOnly = args.has('--statusline-only');
const enabled = { autostart: !args.has('--no-autostart'), permissions: !args.has('--no-permissions') };

// Every hook setup installs carries a "# crab-quest" marker.
const isOurs = h => /# crab-quest/.test((h && h.command) || '');

function stripOurHooks(hooks) {
  let removed = 0;
  for (const [event, groups] of Object.entries(hooks)) {
    for (const group of groups) {
      const before = (group.hooks || []).length;
      group.hooks = (group.hooks || []).filter(h => !isOurs(h));
      removed += before - group.hooks.length;
    }
    hooks[event] = groups.filter(g => g.hooks.length);
    if (!hooks[event].length) delete hooks[event];
  }
  return removed;
}

function main() {
  let settings = {};
  if (fs.existsSync(SETTINGS)) {
    settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    const backup = `${SETTINGS}.bak-crab-quest-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    fs.copyFileSync(SETTINGS, backup);
    console.log(`Backup: ${backup}`);
  }

  settings.hooks = settings.hooks || {};
  const removed = stripOurHooks(settings.hooks);
  if (removed) console.log(`Removed ${removed} previous Crab Quest hook(s).`);

  if (!uninstall && !statuslineOnly) {
    for (const [event, groups] of Object.entries(PLUGIN_HOOKS)) {
      settings.hooks[event] = [...(settings.hooks[event] || []), ...JSON.parse(JSON.stringify(groups))];
    }
    console.log(`Installed hooks for ${Object.keys(PLUGIN_HOOKS).length} events.`);
  }
  if (!uninstall) {
    for (const [event, { group, hook, flag }] of Object.entries(LOCAL_HOOKS)) {
      if (!enabled[flag]) continue;
      settings.hooks[event] = [...(settings.hooks[event] || []), { ...group, hooks: [hook] }];
      console.log(`Installed ${flag} (${event}).`);
    }
  }
  if (!Object.keys(settings.hooks).length) delete settings.hooks;

  const current = settings.statusLine && settings.statusLine.command;
  if (uninstall) {
    if (current && current.includes('statusline.js') && current.includes(ROOT)) {
      delete settings.statusLine;
      console.log('Removed the Crab Quest status line (your previous one is in the backup).');
    }
  } else {
    if (current && current !== STATUSLINE_CMD) console.log('Replacing your status line (the previous one is in the backup).');
    settings.statusLine = { type: 'command', command: STATUSLINE_CMD, padding: 0 };
    console.log('Installed the status line.');
  }

  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n');
  console.log(`Updated ${SETTINGS}`);
  if (!uninstall) console.log('\nStart the game with `npm start`, then open http://localhost:7777');
}

main();
