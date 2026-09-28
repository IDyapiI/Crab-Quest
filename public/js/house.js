// Clawd's home: a full-screen interior drawn over the village.

import { STILE, paint } from './sprites.js';
import { WIDTH as W, HEIGHT as H } from './world.js';
import { STATIONS, INVENTORY_ORDER } from './tools.js';

const FONT = '"Press Start 2P", monospace';
const TEXT = '"VT323", monospace';
const FISH_COLORS = ['#ff6644', '#ffaa33', '#44ff88', '#4488ff', '#ff88ff', '#44ffff', '#ffdd44', '#ff4488'];
const TROPHIES = [10, 25, 50, 75, 99];

function chip(ctx, text, x, y, color = '#f4efe6', align = 'left') {
  ctx.font = `10px ${FONT}`;
  const w = ctx.measureText(text).width + 20;
  const bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = 'rgba(12,8,20,0.82)';
  ctx.fillRect(bx, y, w, 26);
  ctx.fillStyle = color;
  ctx.fillRect(bx, y + 24, w, 2);
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 10, y + 13);
}

function wall(ctx) {
  ctx.fillStyle = '#c9a97a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#bb9a6c';
  for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 12, H - 190);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 70, W, 18); // beam
  ctx.fillStyle = '#8c5f36';
  ctx.fillRect(0, H - 200, W, 14); // wainscot rail
  ctx.fillStyle = '#7a4f2c';
  ctx.fillRect(0, H - 186, W, 36);
  // parquet floor
  for (let row = 0; row < 4; row++) {
    for (let x = -(row % 2) * 72; x < W; x += 144) {
      ctx.fillStyle = (row + x / 144) % 2 ? '#9a6a3c' : '#8a5c32';
      ctx.fillRect(x, H - 150 + row * 38, 142, 36);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, H - 150 + row * 38, 142, 4);
    }
  }
}

function trophies(ctx, level) {
  const x0 = 40, y = 120;
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x0 - 10, y + 44, TROPHIES.length * 56 + 10, 10);
  TROPHIES.forEach((lv, i) => {
    const on = level >= lv;
    paint(ctx, ['kyyyyyyk', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '...yy...', '...yy...', '.yyyyyy.'],
      { y: on ? '#f2c14e' : '#6f6b82', k: on ? '#fff6cc' : '#55526a' }, x0 + i * 56, y + 12, 5);
    ctx.font = `8px ${FONT}`;
    ctx.fillStyle = on ? '#4a2e00' : '#3a3650';
    ctx.textBaseline = 'top';
    ctx.fillText(`${lv}`, x0 + i * 56 + (lv > 9 ? 12 : 16), y + 60);
  });
}

function fishTank(ctx, count, tick) {
  const x = 40, y = 200, w = 240, h = 110;
  ctx.fillStyle = '#2b2340';
  ctx.fillRect(x - 6, y - 6, w + 12, h + 22);
  ctx.fillStyle = '#1e5a8f';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#e8d7a4';
  ctx.fillRect(x, y + h - 12, w, 12);
  ctx.fillStyle = '#3f8f3a';
  for (const px of [30, 80, 190]) ctx.fillRect(x + px, y + h - 40 + Math.sin(tick / 30 + px) * 2, 6, 28);
  const shown = Math.min(count, 8);
  for (let i = 0; i < shown; i++) {
    const fx = x + 20 + ((tick * (0.6 + i * 0.15) + i * 57) % (w - 50));
    const fy = y + 20 + i * 9 + Math.sin(tick / 25 + i) * 6;
    ctx.fillStyle = FISH_COLORS[i];
    ctx.fillRect(fx, fy, 16, 8);
    ctx.fillRect(fx - 6, fy - 2, 6, 12);
    ctx.fillStyle = '#1b1010';
    ctx.fillRect(fx + 11, fy + 2, 3, 3);
  }
  ctx.font = `20px ${TEXT}`;
  ctx.fillStyle = '#9fc9f5';
  ctx.textBaseline = 'top';
  ctx.fillText(count ? `${count} fish caught` : 'empty tank… press F outside', x + 8, y + 6);
}

function fireplace(ctx, tick) {
  const cx = W / 2, base = H - 200;
  ctx.fillStyle = '#6f6b82';
  ctx.fillRect(cx - 110, base - 170, 220, 170);
  ctx.fillStyle = '#4a4660';
  ctx.fillRect(cx - 120, base - 186, 240, 20); // mantel
  ctx.fillStyle = '#1b1010';
  ctx.fillRect(cx - 70, base - 110, 140, 110);
  const f = tick / 5;
  for (const [color, scale] of [['#e5534b', 1], ['#ff9a3c', 0.72], ['#ffd166', 0.45]]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx - 55 * scale, base - 6);
    for (let i = 0; i <= 6; i++) {
      const px = cx - 55 * scale + (110 * scale * i) / 6;
      const py = base - 6 - (i % 2 ? 70 : 38) * scale - Math.sin(f + i * 1.7) * 10 * scale;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(cx + 55 * scale, base - 6);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(cx, base, 10, cx, base, 260);
  g.addColorStop(0, 'rgba(255,170,80,0.25)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 260, base - 120, 520, 320);
  // clock on the mantel
  const now = new Date();
  chip(ctx, now.toTimeString().slice(0, 5), cx, base - 222, '#f2c14e', 'center');
}

function bookshelf(ctx, tools) {
  const x = W - 330, y = 110, w = 290;
  ctx.fillStyle = '#5c3b22';
  ctx.fillRect(x - 10, y - 10, w + 20, 250);
  ctx.font = `8px ${FONT}`;
  ctx.fillStyle = '#f2c14e';
  ctx.textBaseline = 'top';
  ctx.fillText('TOOL LIBRARY', x, y - 26);
  const keys = INVENTORY_ORDER;
  const perRow = 9;
  keys.forEach((k, i) => {
    const row = Math.floor(i / perRow), col = i % perRow;
    const n = tools[k] || 0;
    const h = Math.min(90, 26 + Math.log10(n + 1) * 20); // lifetime uses, log scale
    const bx = x + col * 32, by = y + 110 + row * 118 - h;
    ctx.fillStyle = n ? STATIONS[k].colors.body : '#3a3260';
    ctx.fillRect(bx, by, 26, h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx + 20, by, 6, h);
    if (n) {
      ctx.save();
      ctx.translate(bx + 16, by + h - 6);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#1c1424';
      ctx.font = `7px ${FONT}`;
      ctx.fillText(STATIONS[k].label.slice(0, 6), 0, -4);
      ctx.restore();
    }
  });
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - 10, y + 110, w + 20, 10);
  ctx.fillRect(x - 10, y + 228, w + 20, 10);
}

// ---- furniture bought in the shop (category "decor") ----
// Each piece draws itself around (0, 0) with a pixel size `s`.

const px = (ctx, color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

export const FURNITURE = {
  poster: { at: [W / 2 - 48, 100], draw(ctx, s) {
    px(ctx, '#1c1424', 0, 0, 32 * s, 40 * s); px(ctx, '#f4efe6', s, s, 30 * s, 38 * s);
    px(ctx, '#d97757', 7 * s, 8 * s, 18 * s, 12 * s); px(ctx, '#1b1010', 11 * s, 12 * s, 2 * s, 3 * s); px(ctx, '#1b1010', 19 * s, 12 * s, 2 * s, 3 * s);
    px(ctx, '#d97757', 4 * s, 14 * s, 3 * s, 3 * s); px(ctx, '#d97757', 25 * s, 14 * s, 3 * s, 3 * s);
    for (let i = 0; i < 4; i++) px(ctx, '#d97757', (9 + i * 4) * s, 20 * s, 2 * s, 3 * s);
    px(ctx, '#1c1424', 6 * s, 29 * s, 20 * s, 2 * s); px(ctx, '#9a93b5', 9 * s, 33 * s, 14 * s, 2 * s);
  } },
  plant: { at: [18, H - 250], draw(ctx, s, t) {
    px(ctx, '#bc6c25', 8 * s, 34 * s, 16 * s, 14 * s); px(ctx, '#8c4a16', 8 * s, 34 * s, 16 * s, 3 * s);
    const sway = Math.round(Math.sin(t / 40) * s);
    for (const [x, y, w, h] of [[2, 10, 10, 8], [18, 6, 12, 9], [8, 0, 10, 10], [4, 20, 12, 8], [18, 18, 12, 9]]) px(ctx, '#2f7a35', x * s + sway, y * s, w * s, h * s);
    px(ctx, '#1f4d22', 15 * s, 8 * s, 2 * s, 26 * s);
  } },
  castle: { at: [210, 262], draw(ctx, s) {
    px(ctx, '#9a97ab', 0, 6 * s, 20 * s, 14 * s);
    for (const x of [0, 8, 16]) px(ctx, '#9a97ab', x * s, 0, 4 * s, 6 * s);
    px(ctx, '#2b2340', 8 * s, 12 * s, 4 * s, 8 * s); px(ctx, '#e5534b', 9 * s, -6 * s, 4 * s, 3 * s); px(ctx, '#4a2e18', 9 * s, -6 * s, s, 6 * s);
  } },
  lavalamp: { at: [W / 2 - 104, 238], draw(ctx, s, t) {
    px(ctx, '#2b2b3a', 2 * s, 14 * s, 8 * s, 4 * s); px(ctx, '#2b2b3a', 3 * s, 0, 6 * s, 2 * s);
    px(ctx, '#7b2cbf', 3 * s, 2 * s, 6 * s, 12 * s);
    for (let i = 0; i < 2; i++) px(ctx, '#ff6f91', (4 + i) * s, (3 + ((t / 12 + i * 5) % 9)) * s, 3 * s, 3 * s);
  } },
  globe: { at: [W / 2 + 70, 240], draw(ctx, s, t) {
    px(ctx, '#6b4423', 4 * s, 12 * s, 8 * s, 3 * s); px(ctx, '#6b4423', 7 * s, 10 * s, 2 * s, 3 * s);
    px(ctx, '#3b7dd8', 2 * s, 0, 12 * s, 10 * s);
    const o = Math.floor(t / 20) % 6;
    px(ctx, '#63d471', (3 + o) * s, 2 * s, 3 * s, 3 * s); px(ctx, '#63d471', (7 + (o + 3) % 6) * s, 6 * s, 3 * s, 2 * s);
  } },
  guitar: { at: [W / 2 + 150, H - 260], draw(ctx, s) {
    px(ctx, '#4a2e18', 7 * s, 0, 3 * s, 26 * s); px(ctx, '#2b1d16', 6 * s, 0, 5 * s, 4 * s);
    px(ctx, '#d97757', 2 * s, 24 * s, 13 * s, 10 * s); px(ctx, '#d97757', 4 * s, 20 * s, 9 * s, 5 * s);
    px(ctx, '#1b1010', 7 * s, 27 * s, 3 * s, 3 * s);
  } },
  telescope: { at: [W - 120, H - 320], draw(ctx, s) {
    px(ctx, '#2b2b3a', 6 * s, 16 * s, 2 * s, 18 * s); px(ctx, '#2b2b3a', 2 * s, 32 * s, 10 * s, 2 * s);
    ctx.save(); ctx.translate(7 * s, 16 * s); ctx.rotate(-0.6);
    px(ctx, '#9aa3b5', -4 * s, -3 * s, 22 * s, 6 * s); px(ctx, '#f2c14e', 16 * s, -4 * s, 3 * s, 8 * s);
    ctx.restore();
  } },
  arcade: { at: [100, H - 262], draw(ctx, s, t) {
    px(ctx, '#3a2b5c', 0, 0, 24 * s, 50 * s); px(ctx, '#6446a8', 0, 0, 24 * s, 6 * s);
    px(ctx, '#1b1010', 3 * s, 9 * s, 18 * s, 14 * s);
    px(ctx, ['#63d471', '#f2c14e', '#4cc9f0'][Math.floor(t / 30) % 3], (6 + (t / 6) % 10) * s, 14 * s, 3 * s, 3 * s);
    px(ctx, '#e5534b', 6 * s, 28 * s, 3 * s, 3 * s); px(ctx, '#4cc9f0', 14 * s, 28 * s, 3 * s, 3 * s);
    px(ctx, '#2b2340', 2 * s, 34 * s, 20 * s, 16 * s);
  } },
  disco: { at: [W / 2 - 16, 72], draw(ctx, s, t) {
    px(ctx, '#9a97ab', 7 * s, 0, s, 6 * s);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      if ((x - 3.5) ** 2 + (y - 3.5) ** 2 > 16) continue;
      px(ctx, (x + y + Math.floor(t / 8)) % 3 ? '#cfcce0' : '#ffffff', (4 + x) * s, (6 + y) * s, s, s);
    }
  } },
  neon: { at: [40, 350], draw(ctx, s, t) {
    ctx.font = `${8 * s}px ${FONT}`;
    ctx.textBaseline = 'top';
    const on = Math.floor(t / 25) % 7 !== 0;
    ctx.shadowColor = '#ff6f91'; ctx.shadowBlur = on ? 14 : 0;
    ctx.fillStyle = on ? '#ff9ec0' : '#6b3a4c';
    ctx.fillText('SHIP IT', 0, 0);
    ctx.shadowBlur = 0;
  } },
  throne: { at: [W / 2 - 72, H - 232], behindHero: true, draw(ctx, s) {
    px(ctx, '#b8860b', 0, 0, 48 * s, 8 * s); px(ctx, '#f2c14e', 4 * s, 2 * s, 40 * s, 44 * s);
    px(ctx, '#c1121f', 10 * s, 8 * s, 28 * s, 30 * s);
    for (const x of [4, 22, 40]) px(ctx, '#fff6cc', x * s, -4 * s, 4 * s, 4 * s);
    px(ctx, '#b8860b', 0, 38 * s, 48 * s, 8 * s);
  } },
};

function furniture(ctx, owned, tick, behind) {
  for (const [key, f] of Object.entries(FURNITURE)) {
    if (!owned.includes(key) || !!f.behindHero !== behind) continue;
    ctx.save();
    ctx.translate(f.at[0], f.at[1]);
    f.draw(ctx, 3, tick);
    ctx.restore();
  }
}

function wardrobe(ctx, items) {
  const x = W - 250, y = H - 190;
  const lines = [['SKIN', items.skin, '#ff9a3c'], ['HAT', items.hat, '#f2c14e'], ['PET', items.companion, '#63d471'], ['EFFECT', items.effect, '#b779e0'], ['MAP', items.map_theme, '#4cc9f0']];
  ctx.font = `8px ${FONT}`;
  ctx.textBaseline = 'top';
  lines.forEach(([label, it, color], i) => {
    ctx.fillStyle = it ? color : '#6f6b82';
    ctx.fillText(`${label}: ${it ? it.name : 'none'}`, x, y + 14 + i * 18);
  });
}

export function drawHouse(ctx, { alpha, tick, profile, items, heroSprites, heroAlpha, pet, tools, decor = [], drawHat }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  wall(ctx);
  trophies(ctx, profile ? profile.level : 1);
  fishTank(ctx, profile ? profile.stats.fishCaught : 0, tick);
  bookshelf(ctx, tools);
  fireplace(ctx, tick);
  furniture(ctx, decor, tick, false);

  // Rug, armchair and Clawd warming up by the fire.
  ctx.fillStyle = '#8f2f2b';
  ctx.fillRect(W / 2 - 150, H - 120, 300, 70);
  ctx.fillStyle = '#c1121f';
  ctx.fillRect(W / 2 - 140, H - 112, 280, 54);
  furniture(ctx, decor, tick, true);
  const frame = Math.floor(tick / 40) % 2 ? 0 : 2;
  ctx.globalAlpha = alpha * heroAlpha;
  ctx.save();
  ctx.translate(W / 2 - STILE * 1.25, H - 190);
  ctx.scale(2.5, 2.5);
  ctx.drawImage(heroSprites.down[frame], 0, 0);
  ctx.globalAlpha = alpha;
  if (drawHat) drawHat(ctx, 0, 0, frame, 'down', tick);
  ctx.restore();
  ctx.globalAlpha = alpha;
  if (pet) {
    const img = pet.sprites[Math.floor(tick / 10) % 2];
    const px = W / 2 + 90 + Math.sin(tick / 60) * 70;
    ctx.drawImage(img, px, H - 110 - (pet.float ? 20 + Math.sin(tick / 12) * 6 : 0), img.width * 1.5, img.height * 1.5);
  }
  wardrobe(ctx, items);
  if (profile && items.title) chip(ctx, items.title.data.text.toUpperCase(), W / 2, 50, '#e0c3fc', 'center');

  chip(ctx, "✦ CLAWD'S HOME ✦", W / 2, 16, '#f2c14e', 'center');
  chip(ctx, 'E / Esc to leave', W - 16, 16, '#9a93b5', 'right');
  if (profile) {
    chip(ctx, `LV.${profile.level} · ${profile.stats.sessions} sessions · ${profile.stats.toolCalls} tools`, 16, H - 42, '#8ec5ff');
    chip(ctx, `${profile.gold} G`, W - 16, H - 42, '#f2c14e', 'right');
  }
  ctx.restore();
}
