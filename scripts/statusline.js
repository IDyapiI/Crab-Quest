#!/usr/bin/env node
// Claude Code status line: prints a compact line and forwards the status JSON
// (real context usage, cost, rate limits) to the Crab Quest server.

const http = require('http');
const path = require('path');
const { execFileSync } = require('child_process');

const SERVER = process.env.CRAB_QUEST_URL || 'http://localhost:7777';

const c = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
const dim = s => c('2', s);

function branch(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'branch', '--show-current'], {
      timeout: 300, stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
}

function contextBar(pct) {
  const cells = 10;
  const full = Math.round((Math.min(pct, 100) / 100) * cells);
  const color = pct < 50 ? '32' : pct < 80 ? '33' : '31';
  return c(color, '▰'.repeat(full)) + dim('▱'.repeat(cells - full)) + ` ${Math.round(pct)}%`;
}

function format(data) {
  const dir = (data.workspace && data.workspace.current_dir) || data.cwd || process.cwd();
  const br = branch(dir);
  const parts = [c('1', path.basename(dir)) + (br ? dim(` (${br})`) : '')];
  if (data.model && data.model.display_name) parts.push(c('38;5;173', data.model.display_name));
  const cw = data.context_window;
  if (cw && cw.used_percentage != null) parts.push('ctx ' + contextBar(cw.used_percentage));
  const cost = data.cost && data.cost.total_cost_usd;
  if (cost) parts.push(c('33', `$${cost.toFixed(2)}`));
  return parts.join(dim(' │ '));
}

function forward(raw) {
  return new Promise(resolve => {
    try {
      const req = http.request(`${SERVER}/statusline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 400,
      }, res => { res.resume(); res.on('end', resolve); });
      req.on('error', resolve);
      req.on('timeout', () => { req.destroy(); resolve(); });
      req.end(raw);
    } catch {
      resolve();
    }
  });
}

let raw = '';
process.stdin.on('data', d => { raw += d; });
process.stdin.on('end', async () => {
  let data = {};
  try { data = JSON.parse(raw); } catch { /* print a bare line */ }
  process.stdout.write(format(data));
  if (data.session_id) await forward(raw);
});
