// Incremental reader for Claude Code JSONL transcripts. Only the bytes added
// since the previous read are parsed, so polling a long session stays cheap.
// The format is internal to Claude Code: every field access is defensive.

const fs = require('fs');
const path = require('path');
const { costOf } = require('./pricing');

const readers = new Map(); // file path -> reader state

function emptyTotals() {
  return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
}

function createReader() {
  return {
    offset: 0,
    partial: '',
    // Claude Code writes one line per content block, each repeating the
    // message usage, so usage is keyed by message id and counted once.
    usageById: new Map(),
    tools: {},
    title: null,
    firstPrompt: null,
    lastContext: 0,
    lastModel: null,
    firstAt: null,
    lastAt: null,
    cwd: null,
  };
}

function firstText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const block = content.find(b => b && b.type === 'text' && b.text);
  return block ? block.text : '';
}

function consumeLine(reader, line) {
  let obj;
  try { obj = JSON.parse(line); } catch { return; }

  if (obj.type === 'ai-title' && obj.aiTitle) reader.title = obj.aiTitle;
  if (obj.timestamp) {
    if (!reader.firstAt) reader.firstAt = obj.timestamp;
    reader.lastAt = obj.timestamp;
  }
  if (obj.cwd && !reader.cwd) reader.cwd = obj.cwd;

  if (obj.type === 'user' && !reader.firstPrompt && !obj.isMeta) {
    const text = firstText(obj.message && obj.message.content).trim();
    if (text && !text.startsWith('<')) reader.firstPrompt = text.replace(/\s+/g, ' ').slice(0, 80);
  }

  if (obj.type !== 'assistant' || !obj.message) return;
  const msg = obj.message;

  for (const block of msg.content || []) {
    if (block && block.type === 'tool_use' && block.name && block.id) {
      // Tool blocks are unique per line, but guard against rewrites anyway.
      reader.tools[block.id] = block.name;
    }
  }

  if (msg.usage) {
    const u = msg.usage;
    const usage = {
      model: msg.model || 'unknown',
      input: u.input_tokens || 0,
      output: u.output_tokens || 0,
      cacheCreation: u.cache_creation_input_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
    };
    reader.usageById.set(msg.id || `${reader.offset}:${reader.usageById.size}`, usage);
    reader.lastContext = usage.input + usage.cacheCreation + usage.cacheRead;
    if (usage.model !== '<synthetic>') reader.lastModel = usage.model;
  }
}

function readNew(file) {
  let reader = readers.get(file);
  let size;
  try { size = fs.statSync(file).size; } catch { return null; }
  if (!reader || size < reader.offset) {
    reader = createReader();
    readers.set(file, reader);
  }
  if (size > reader.offset) {
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(size - reader.offset);
      fs.readSync(fd, buf, 0, buf.length, reader.offset);
      reader.offset = size;
      const lines = (reader.partial + buf.toString('utf8')).split('\n');
      reader.partial = lines.pop();
      for (const line of lines) if (line) consumeLine(reader, line);
    } finally {
      fs.closeSync(fd);
    }
  }
  return reader;
}

function subagentFiles(transcriptPath) {
  const dir = path.join(transcriptPath.replace(/\.jsonl$/, ''), 'subagents');
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

// Summarise a session transcript plus its subagent transcripts.
function summarize(transcriptPath) {
  const main = transcriptPath && readNew(transcriptPath);
  if (!main) return null;

  const totals = emptyTotals();
  const models = {};
  const tools = {};
  let cost = 0;

  for (const reader of [main, ...subagentFiles(transcriptPath).map(readNew).filter(Boolean)]) {
    for (const u of reader.usageById.values()) {
      totals.input += u.input;
      totals.output += u.output;
      totals.cacheCreation += u.cacheCreation;
      totals.cacheRead += u.cacheRead;
      const m = models[u.model] || (models[u.model] = emptyTotals());
      m.input += u.input;
      m.output += u.output;
      m.cacheCreation += u.cacheCreation;
      m.cacheRead += u.cacheRead;
      cost += costOf(u.model, u);
    }
    for (const name of Object.values(reader.tools)) tools[name] = (tools[name] || 0) + 1;
  }

  return {
    title: main.title || main.firstPrompt,
    tokens: { ...totals, total: totals.input + totals.output + totals.cacheCreation + totals.cacheRead },
    models,
    tools,
    toolCalls: Object.values(tools).reduce((a, b) => a + b, 0),
    estimatedCost: cost,
    lastContext: main.lastContext,
    lastModel: main.lastModel,
    firstAt: main.firstAt,
    lastAt: main.lastAt,
    cwd: main.cwd,
  };
}

function forget(transcriptPath) {
  readers.delete(transcriptPath);
  for (const f of subagentFiles(transcriptPath)) readers.delete(f);
}

module.exports = { summarize, forget };
