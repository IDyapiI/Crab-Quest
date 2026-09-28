// Village decorations unlocked by the player's level.

import { STILE, SCALE, paint } from './sprites.js';
import { walkable, COLS, ROWS } from './world.js';

const P = SCALE;
const at = (x, y) => [x * STILE, y * STILE];

export const TIERS = [
  { level: 5, name: 'Mushrooms' },
  { level: 10, name: 'Lanterns' },
  { level: 15, name: 'Fountain' },
  { level: 20, name: 'Dancing flowers' },
  { level: 25, name: 'House banner' },
  { level: 30, name: 'Golden roads' },
  { level: 40, name: 'Floating crystals' },
  { level: 50, name: 'Mystic portal' },
];

const MUSHROOM = ['..rrrr..', '.rWrrWr.', 'rrrrrrrr', '...ww...', '...ww...'];
const LANTERNS = [[5, 9], [13, 6]];

// Returns light sources the night shader should reveal.
export function drawDecor(ctx, level, tick) {
  const lights = [];
  if (level >= 5) {
    for (const [x, y] of [[3, 6], [13, 10], [8, 9]]) {
      const [px, py] = at(x, y);
      paint(ctx, MUSHROOM, { r: '#e5534b', W: '#f4efe6', w: '#efe2c4' }, px + 12, py + 22);
    }
  }
  if (level >= 10) {
    for (const [x, y] of LANTERNS) {
      const [px, py] = at(x, y);
      const flick = tick % 40 < 20 ? '#ffd166' : '#f2c14e';
      paint(ctx, ['.kkkk.', 'kyyyyk', 'kyyyyk', '.kkkk.', '..kk..', '..kk..', '..kk..', '..kk..', '.kkkk.'], { k: '#2b2b3a', y: flick }, px + 15, py + 8);
      lights.push([px + STILE / 2, py + 14, 80]);
    }
  }
  if (level >= 15) {
    const [px, py] = at(6, 9);
    paint(ctx, ['..ssssssssss..', '.sbbbbbbbbbbs.', 'sbwbbbbbbbwbbs', 'sbbbbwbbbbbbbs', '.sbbbbbbbbbbs.', '..ssssssssss..'],
      { s: '#9a97ab', b: '#3b7dd8', w: '#9fc9f5' }, px + 3, py + 20);
    const jet = Math.floor(tick / 6) % 3;
    ctx.fillStyle = '#9fc9f5';
    ctx.fillRect(px + 22, py + 6 + jet * 2, P, 16 - jet * 2);
    for (let i = 0; i < 3; i++) {
      const a = ((tick / 20) + i * 2.1) % (Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(px + 22 + Math.cos(a) * 12, py + 14 + Math.sin(a) * 4, 2, 2);
    }
  }
  if (level >= 20) {
    const colors = ['#ff6688', '#ffaa33', '#ff55ff', '#44ddff'];
    [[3, 9], [8, 5], [10, 5], [11, 10]].forEach(([x, y], i) => {
      const [px, py] = at(x, y);
      const sway = Math.round(Math.sin(tick / 15 + i) * 2);
      ctx.fillStyle = '#3f8f3a';
      ctx.fillRect(px + 22, py + 22, P, 18);
      paint(ctx, ['.p.', 'pyp', '.p.'], { p: colors[i], y: '#ffe08a' }, px + 18 + sway, py + 12);
    });
  }
  if (level >= 25) {
    // Banner on the house roof.
    const [px, py] = at(11, 6);
    const wave = Math.floor(tick / 10) % 2;
    ctx.fillStyle = '#4a2e18';
    ctx.fillRect(px + 30, py - 22, P, 34);
    paint(ctx, wave ? ['rrrrrr', 'rryyrr', 'rrrrrr', 'rrrr..'] : ['rrrrr.', 'rryyrr', 'rrrrrr', 'rrrrr.'],
      { r: '#c1121f', y: '#f2c14e' }, px + 33, py - 22);
  }
  if (level >= 30) {
    // A slow golden shimmer travels along the roads.
    const phase = (tick / 3) % (COLS + ROWS);
    ctx.fillStyle = 'rgba(242,193,78,0.18)';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (Math.abs(x + y - phase) < 1.5 && walkable(x, y)) ctx.fillRect(x * STILE, y * STILE, STILE, STILE);
      }
    }
  }
  if (level >= 40) {
    [[1, 3], [18, 3]].forEach(([x, y], i) => {
      const [px, py] = at(x, y);
      const bob = Math.sin(tick / 25 + i) * 4;
      const tw = Math.floor(tick / 12 + i) % 2;
      paint(ctx, tw ? ['..c..', '.cCc.', 'cCWCc', '.cCc.', '..c..'] : ['..c..', '.cWc.', 'cCCCc', '.cCc.', '..c..'],
        { c: '#4cc9f0', C: '#90e0ef', W: '#ffffff' }, px + 17, py + 8 + bob);
      lights.push([px + STILE / 2, py + 16, 50]);
    });
  }
  if (level >= 50) {
    const [px, py] = at(17, 2);
    const cx = px + STILE / 2, cy = py + STILE / 2;
    ctx.fillStyle = 'rgba(155,93,229,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a = tick / 18 + (i / 12) * Math.PI * 2;
      ctx.fillStyle = i % 2 ? '#e0c3fc' : '#9b5de5';
      ctx.fillRect(cx + Math.cos(a) * 18 - 2, cy + Math.sin(a) * 24 - 2, P, P);
    }
    lights.push([cx, cy, 70]);
  }
  return lights;
}
