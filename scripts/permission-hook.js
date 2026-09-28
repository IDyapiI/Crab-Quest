#!/usr/bin/env node
// PermissionRequest hook: asks the Crab Quest game window for Allow/Deny.
// Prints nothing — so Claude Code shows its normal dialog — when the server
// is down, the feature is off, no game window is visible, or time runs out.

const http = require('http');

const SERVER = process.env.CRAB_QUEST_URL || 'http://localhost:7777';
const MAX_WAIT_MS = 320 * 1000; // server-side wait is capped at 300 s

let raw = '';
process.stdin.on('data', d => { raw += d; });
process.stdin.on('end', () => {
  const req = http.request(`${SERVER}/permission`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: MAX_WAIT_MS,
  }, res => {
    let body = '';
    res.on('data', d => { body += d; });
    res.on('end', () => {
      let behavior = null;
      try { behavior = JSON.parse(body).behavior; } catch { /* no decision */ }
      if (behavior === 'allow' || behavior === 'deny') {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior } },
        }));
      }
      process.exit(0);
    });
  });
  req.on('error', () => process.exit(0));
  req.on('timeout', () => { req.destroy(); process.exit(0); });
  req.end(raw);
});
