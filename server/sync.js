// Imports every transcript under ~/.claude/projects into the session history,
// so stats cover sessions played while the server was off. History only: XP
// is earned live, from hooks, and is never granted twice for the same work.

const fs = require('fs');
const os = require('os');
const path = require('path');
const transcript = require('./transcript');
const profile = require('./profile');

const PROJECTS_DIR = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects');

async function syncTranscripts() {
  let imported = 0, skipped = 0;
  let dirs = [];
  try { dirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true }).filter(d => d.isDirectory()); } catch { /* no projects yet */ }

  for (const dir of dirs) {
    const folder = path.join(PROJECTS_DIR, dir.name);
    for (const file of fs.readdirSync(folder).filter(f => f.endsWith('.jsonl'))) {
      const full = path.join(folder, file);
      const sum = transcript.summarize(full);
      transcript.forget(full); // don't keep every transcript in memory
      if (!sum || (!sum.toolCalls && !sum.tokens.total)) { skipped++; continue; }
      profile.mergeSession(path.basename(file, '.jsonl'), {
        title: sum.title,
        project: sum.cwd ? path.basename(sum.cwd) : null,
        startedAt: sum.firstAt,
        endedAt: sum.lastAt,
        toolCalls: sum.toolCalls,
        tokens: sum.tokens.total,
        costUsd: +sum.estimatedCost.toFixed(4),
        tools: sum.tools,
      });
      imported++;
      // Stay responsive while crunching large histories.
      await new Promise(r => setImmediate(r));
    }
  }

  const p = profile.raw;
  p.stats.sessions = Math.max(p.stats.sessions, Object.keys(profile.sessions).length);
  profile.flush();
  return { imported, skipped };
}

module.exports = { syncTranscripts };
