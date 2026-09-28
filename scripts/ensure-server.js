#!/usr/bin/env node
// SessionStart hook: starts the Crab Quest server in the background if it
// isn't answering yet, so progression is never lost to a forgotten npm start.

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 7777;

function alive() {
  return new Promise(resolve => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/profile', timeout: 800 }, res => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

(async () => {
  process.stdin.resume();
  process.stdin.on('data', () => {}); // the hook payload is not needed
  if (await alive()) process.exit(0);
  const dataDir = path.join(ROOT, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const log = fs.openSync(path.join(dataDir, 'server.log'), 'a');
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT, detached: true, stdio: ['ignore', log, log], env: { ...process.env, PORT: String(PORT) },
  });
  child.unref();
  process.exit(0);
})();
