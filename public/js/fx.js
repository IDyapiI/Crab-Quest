import { STILE, SCALE, canvas } from './sprites.js';
import { WIDTH, HEIGHT, LAMPS } from './world.js';

// ---- particles ----

export function burst(list, x, y, color, count = 10, spread = 4) {
  for (let i = 0; i < count; i++) {
    list.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: -Math.random() * spread * 0.8 - 1,
      life: 30 + Math.random() * 25,
      max: 55,
      color,
      size: SCALE * (1 + Math.floor(Math.random() * 2)),
    });
  }
}

export function stars(list, x, y) {
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    list.push({ x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 1, life: 45, max: 45, color: i % 2 ? '#f2c14e' : '#fff6cc', size: SCALE * 2 });
  }
}

export function updateParticles(list) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life--;
    if (p.life <= 0) list.splice(i, 1);
  }
}

export function drawParticles(ctx, list) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ---- weather, driven by how full the context window is ----

export function weatherFor(pct) {
  if (pct >= 85) return 'storm';
  if (pct >= 65) return 'snow';
  if (pct >= 40) return 'rain';
  return 'clear';
}

export function createWeather() {
  return { kind: 'clear', drops: [], flash: 0, nextFlash: 240 };
}

export function updateWeather(w) {
  const spawn = { rain: 3, storm: 7, snow: 0.35 }[w.kind] || 0;
  for (let n = spawn; n > 0; n--) {
    if (n < 1 && Math.random() > n) break;
    const snow = w.kind === 'snow';
    w.drops.push({
      x: Math.random() * (WIDTH + 200) - 100, y: -10,
      vx: snow ? (Math.random() - 0.5) * 1.5 : w.kind === 'storm' ? -4 : -1.5,
      vy: snow ? 1 + Math.random() * 1.5 : w.kind === 'storm' ? 14 : 9,
      snow,
    });
  }
  for (let i = w.drops.length - 1; i >= 0; i--) {
    const d = w.drops[i];
    d.x += d.vx; d.y += d.vy;
    if (d.y > HEIGHT) w.drops.splice(i, 1);
  }
  if (w.kind === 'storm' && --w.nextFlash <= 0) {
    w.flash = 6;
    w.nextFlash = 150 + Math.random() * 300;
  }
  if (w.flash > 0) w.flash--;
}

export function drawWeather(ctx, w) {
  if (w.kind !== 'clear') {
    ctx.fillStyle = w.kind === 'storm' ? 'rgba(20,20,50,0.25)' : 'rgba(40,50,80,0.08)';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  for (const d of w.drops) {
    if (d.snow) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(Math.round(d.x), Math.round(d.y), SCALE, SCALE);
    } else {
      ctx.fillStyle = 'rgba(170,200,255,0.55)';
      ctx.fillRect(Math.round(d.x), Math.round(d.y), SCALE - 1, SCALE * 4);
    }
  }
  if (w.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${w.flash / 12})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

// ---- day / night ----

export function timeOfDay(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 6 && h < 8) return 'dawn';
  if (h >= 8 && h < 18.5) return 'day';
  if (h >= 18.5 && h < 20.5) return 'dusk';
  return 'night';
}

const TINT = { dawn: 'rgba(255,170,90,0.14)', dusk: 'rgba(120,60,140,0.28)', night: 'rgba(10,14,50,0.5)' };
let shadeLayer = null;

// Darkens the world and punches soft holes where lamps (and the hero) glow.
export function drawDaylight(ctx, phase, tick, lights = []) {
  const tint = TINT[phase];
  if (!tint) return;
  if (!shadeLayer) shadeLayer = canvas(WIDTH, HEIGHT);
  const s = shadeLayer.getContext('2d');
  s.globalCompositeOperation = 'source-over';
  s.clearRect(0, 0, WIDTH, HEIGHT);
  s.fillStyle = tint;
  s.fillRect(0, 0, WIDTH, HEIGHT);
  if (phase === 'night' || phase === 'dusk') {
    s.globalCompositeOperation = 'destination-out';
    const flicker = 1 + Math.sin(tick * 0.1) * 0.03;
    const all = [...LAMPS.map(([x, y]) => [x * STILE + STILE / 2, y * STILE + 8, 110]), ...lights];
    for (const [x, y, r] of all) {
      const g = s.createRadialGradient(x, y, 0, x, y, r * flicker);
      g.addColorStop(0, 'rgba(0,0,0,0.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      s.fillStyle = g;
      s.fillRect(x - r * 1.1, y - r * 1.1, r * 2.2, r * 2.2);
    }
  }
  ctx.drawImage(shadeLayer, 0, 0);
  if (phase === 'night' || phase === 'dusk') {
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y] of LAMPS) {
      const cx = x * STILE + STILE / 2, cy = y * STILE + 8;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
      g.addColorStop(0, 'rgba(255,200,90,0.35)');
      g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 60, cy - 60, 120, 120);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
