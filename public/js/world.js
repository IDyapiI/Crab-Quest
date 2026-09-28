import { STILE, canvas, tileSprites } from './sprites.js';

// T tree  . , grass  f flowers  = path  s sand  ~ water  b bridge
// o stone  l lamp  n sign  r rock  H house (2x2)  G guild (3x2)  h g filler
const MAP = [
  'TTTTTTTTTTTTTTTTTTTT',
  'TTf~~~~~~b~~~~~~fTTT',
  'Tl,~~~~~~b~~~~~~,.TT',
  'T..ssss..=..sssss..T',
  'T.================.T',
  'Ts=.f..l.=...f=Ggg.T',
  'T.=..,...=Hhn.=ggg.T',
  'Ts=......=hh..=ooooT',
  'T.=============ooooT',
  'Ts=..,...=..r.=ooooT',
  'T.=.f..l.=...f=ooooT',
  'Ts=============ooooT',
  'T..ssssssssssss..l.T',
  'TTTTTTTTTTTTTTTTTTTT',
];

export const COLS = MAP[0].length;
export const ROWS = MAP.length;
export const WIDTH = COLS * STILE;
export const HEIGHT = ROWS * STILE;
export const HOME = [10, 8];
export const LAMPS = [];

const WALKABLE = new Set(['=', 's', 'b', 'o']);
const blocked = new Set(); // "x,y" occupied by villagers

for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) if (MAP[y][x] === 'l') LAMPS.push([x, y]);
}

export function block(x, y) { blocked.add(`${x},${y}`); }

export function walkable(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  return WALKABLE.has(MAP[y][x]) && !blocked.has(`${x},${y}`);
}

// Breadth-first search to the closest walkable tile next to the target.
export function findPath(from, to) {
  const [tx, ty] = to;
  const goals = walkable(tx, ty)
    ? [[tx, ty]]
    : [[tx, ty + 1], [tx, ty - 1], [tx - 1, ty], [tx + 1, ty]].filter(([x, y]) => walkable(x, y));
  if (!goals.length) return [];
  const isGoal = (x, y) => goals.some(([gx, gy]) => gx === x && gy === y);

  const prev = new Map([[`${from[0]},${from[1]}`, null]]);
  const queue = [from];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (isGoal(x, y)) {
      const path = [];
      for (let k = `${x},${y}`; k; k = prev.get(k)) path.unshift(k.split(',').map(Number));
      return path.slice(1);
    }
    for (const [nx, ny] of [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]]) {
      const k = `${nx},${ny}`;
      if (!prev.has(k) && walkable(nx, ny)) { prev.set(k, `${x},${y}`); queue.push([nx, ny]); }
    }
  }
  return [];
}

// ---- static background, pre-rendered once per water frame ----

// One pair of frames per map theme, built on first use.
const backgrounds = new Map();

export function background(frame, theme = null) {
  const key = theme ? JSON.stringify(theme) : 'default';
  if (!backgrounds.has(key)) {
    const t = tileSprites(theme || {});
    backgrounds.set(key, [0, 1].map(f => renderBackground(t, f)));
  }
  return backgrounds.get(key)[frame % 2];
}

function renderBackground(t, waterFrame) {
  const c = canvas(WIDTH, HEIGHT);
  const ctx = c.getContext('2d');
  const grassAt = (x, y) => t.grass[(x * 7 + y * 13) % 3];

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = MAP[y][x];
      const px = x * STILE, py = y * STILE;
      ctx.drawImage(grassAt(x, y), px, py);
      switch (ch) {
        case ',': ctx.drawImage(t.grass[2], px, py); break;
        case 'f': ctx.drawImage(t.flowers[(x + y) % 2], px, py); break;
        case '=': ctx.drawImage(t.path, px, py); edge(ctx, x, y, px, py, '=', t.pathEdge); break;
        case 's': ctx.drawImage(t.sand, px, py); break;
        case 'o': ctx.drawImage(t.stone, px, py); break;
        case '~': ctx.drawImage(t.water[waterFrame], px, py); shore(ctx, x, y, px, py); break;
        case 'b': ctx.drawImage(t.bridge, px, py); break;
        case 'T': ctx.drawImage(t.tree, px, py); break;
        case 'r': ctx.drawImage(t.rock, px, py); break;
        case 'n': ctx.drawImage(t.sign, px, py); break;
        case 'l': ctx.drawImage(t.lamp, px, py); break;
      }
    }
  }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (MAP[y][x] === 'H') ctx.drawImage(t.house, x * STILE, y * STILE);
      if (MAP[y][x] === 'G') ctx.drawImage(t.guild, x * STILE, y * STILE);
    }
  }
  return c;
}

const at = (x, y) => (MAP[y] && MAP[y][x]) || 'T';

// Darker rim where a path meets grass, so roads read as carved in.
function edge(ctx, x, y, px, py, same, color) {
  const open = c => c === same || c === 'b' || c === 's' || c === 'o';
  ctx.fillStyle = color;
  if (!open(at(x, y - 1))) ctx.fillRect(px, py, STILE, 3);
  if (!open(at(x, y + 1))) ctx.fillRect(px, py + STILE - 3, STILE, 3);
  if (!open(at(x - 1, y))) ctx.fillRect(px, py, 3, STILE);
  if (!open(at(x + 1, y))) ctx.fillRect(px + STILE - 3, py, 3, STILE);
}

function shore(ctx, x, y, px, py) {
  const land = c => c !== '~' && c !== 'b';
  ctx.fillStyle = '#e8d7a4';
  if (land(at(x, y - 1))) ctx.fillRect(px, py, STILE, 6);
  if (land(at(x, y + 1))) ctx.fillRect(px, py + STILE - 6, STILE, 6);
  if (land(at(x - 1, y))) ctx.fillRect(px, py, 6, STILE);
  if (land(at(x + 1, y))) ctx.fillRect(px + STILE - 6, py, 6, STILE);
  ctx.fillStyle = '#9fc9f5';
  if (land(at(x, y + 1))) ctx.fillRect(px, py + STILE - 9, STILE, 3);
}
