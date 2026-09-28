// Boss fights: a streak of failures summons a monster; successful tool calls
// hit it until it falls. State is per session, rewards go to the profile.

const RAGE_TO_SPAWN = 3;
const FLEE_AFTER_MS = 60 * 60 * 1000;

const BOSSES = [
  { id: 'hydra', name: 'Red Test Hydra', match: e => e.tool === 'Bash' && /test|jest|pytest|vitest|mocha|spec/i.test(e.detail || '') },
  { id: 'golem', name: 'Segfault Golem', match: e => e.tool === 'Bash' || e.tool === 'PowerShell' },
  { id: 'wraith', name: 'Merge Conflict Wraith', match: e => /Edit|Write|NotebookEdit/.test(e.tool || '') },
  { id: 'specter', name: '404 Specter', match: e => e.tool === 'WebFetch' || e.tool === 'WebSearch' },
  { id: 'kraken', name: 'Timeout Kraken', match: e => !!e.mcp },
  { id: 'beast', name: 'Bug Beast', match: () => true },
];

// Items only bosses drop; the shop lists them but never sells them.
const DROPS = ['hat_bughorns', 'comp_bug', 'title_exterminator', 'fx_embers'];

function create() {
  return { rage: 0, boss: null };
}

function spawn(fight, evt, level) {
  const kind = BOSSES.find(b => b.match(evt));
  const hp = 15 + Math.floor(level / 4);
  fight.boss = { id: kind.id, name: kind.name, hp, max: hp, since: Date.now(), hits: 0 };
  fight.rage = 0;
  return { event: 'spawn', ...fight.boss };
}

// Returns a boss event for the game, or null.
function onToolResult(fight, evt, level) {
  const failed = evt.hook === 'PostToolUseFailure';
  const b = fight.boss;
  if (b && Date.now() - b.since > FLEE_AFTER_MS) {
    fight.boss = null;
    return { event: 'flee', id: b.id, name: b.name };
  }
  if (!b) {
    fight.rage = failed ? fight.rage + 1 : Math.max(0, fight.rage - 1);
    return fight.rage >= RAGE_TO_SPAWN ? spawn(fight, evt, level) : null;
  }
  if (failed) {
    b.hp = Math.min(b.max, b.hp + 2);
    return { event: 'heal', ...b, amount: 2 };
  }
  const damage = /Edit|Write|MultiEdit|NotebookEdit/.test(evt.tool || '') ? 2 : 1;
  b.hp = Math.max(0, b.hp - damage);
  b.hits++;
  if (b.hp > 0) return { event: 'hit', ...b, damage };
  fight.boss = null;
  return { event: 'defeat', ...b, damage };
}

module.exports = { create, onToolResult, DROPS };
