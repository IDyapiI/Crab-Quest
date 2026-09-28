// Boss fight visuals. The server decides spawns, damage and rewards; this
// only animates what it reports.

import { STILE, bossSprites } from './sprites.js';

const FONT = '"Press Start 2P", monospace';
const DRAW_W = 144, DRAW_H = 126;
const AT = { x: 11.9 * STILE - DRAW_W / 2, y: 11 * STILE - DRAW_H }; // east field

const sprites = {};
const spritesFor = id => sprites[id] || (sprites[id] = bossSprites(id));

export function createBossFight({ burst, stars, banner, shake, mini }) {
  const f = { boss: null, flash: 0, appear: 0, dying: 0, numbers: [], shots: [] };

  function set(boss) {
    if (boss && (!f.boss || f.boss.id !== boss.id)) f.appear = mini ? 1 : 0;
    f.boss = boss ? { ...boss } : null;
  }

  function center() { return { x: AT.x + DRAW_W / 2, y: AT.y + DRAW_H / 2 }; }

  function number(text, color) {
    const c = center();
    f.numbers.push({ text, color, x: c.x + (Math.random() - 0.5) * 50, y: AT.y + 10, life: 60 });
  }

  // e: the server's boss event; hero: current hero position for the shot.
  function onEvent(e, hero) {
    const c = center();
    switch (e.event) {
      case 'spawn':
        set(e);
        shake(24);
        burst(c.x, c.y, '#1b1010', 30);
        if (!mini) banner(`A WILD ${e.name.toUpperCase()} APPEARS!`, '#e5534b', { timer: 260 });
        break;
      case 'hit':
        f.shots.push({ x: hero.x + STILE / 2, y: hero.y + 10, t: 0, damage: e.damage });
        f.boss = { ...f.boss, ...e };
        break;
      case 'heal':
        f.boss = { ...f.boss, ...e };
        number(`+${e.amount}`, '#63d471');
        break;
      case 'defeat':
        f.shots.push({ x: hero.x + STILE / 2, y: hero.y + 10, t: 0, damage: e.damage });
        f.dying = 90;
        f.boss = { ...f.boss, hp: 0 };
        setTimeout(() => {
          for (let i = 0; i < 6; i++) setTimeout(() => burst(c.x + (Math.random() - 0.5) * 100, c.y + (Math.random() - 0.5) * 80, ['#f2c14e', '#e5534b', '#fff6cc'][i % 3], 20), i * 120);
          stars(c.x, c.y);
          if (!mini) {
            banner(`${e.name.toUpperCase()} DEFEATED! +${e.gold || 0} G`, '#f2c14e', { timer: 300 });
            if (e.drop) setTimeout(() => banner(`LOOT: ${e.drop.name.toUpperCase()}!`, '#e0c3fc', { timer: 300 }), 3200);
          }
        }, 400);
        break;
      case 'flee':
        if (!mini) banner(`${e.name.toUpperCase()} RAN AWAY…`, '#9a93b5', { timer: 200 });
        f.boss = null;
        break;
    }
  }

  function draw(ctx, tick) {
    // Shots fly from Clawd to the boss.
    for (let i = f.shots.length - 1; i >= 0; i--) {
      const s = f.shots[i], c = center();
      s.t += 0.06;
      const x = s.x + (c.x - s.x) * s.t, y = s.y + (c.y - s.y) * s.t - Math.sin(s.t * Math.PI) * 40;
      ctx.fillStyle = '#fff6cc';
      ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.fillStyle = '#f2c14e';
      ctx.fillRect(x - 8, y - 1, 16, 2);
      if (s.t >= 1) {
        f.shots.splice(i, 1);
        f.flash = 8;
        number(`-${s.damage}`, '#fff6cc');
        burst(c.x, c.y, '#fff6cc', 8);
      }
    }

    const b = f.boss;
    if (!b) return;
    if (f.dying > 0 && --f.dying === 0) { f.boss = null; return; }
    f.appear = Math.min(1, f.appear + 0.03);
    const bob = Math.round(Math.sin(tick / 14) * 3);
    const [idle, angry, white] = spritesFor(b.id);
    const img = f.flash > 0 ? white : (Math.floor(tick / 30) % 3 === 0 ? angry : idle);
    if (f.flash > 0) f.flash--;
    const scale = f.appear;
    const w = DRAW_W * scale, h = DRAW_H * scale;
    ctx.save();
    ctx.globalAlpha = f.dying ? f.dying / 90 : (b.id === 'specter' || b.id === 'wraith' ? 0.85 : 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(AT.x + 20, AT.y + DRAW_H - 8, DRAW_W - 40, 10);
    const jitter = f.dying ? (Math.random() - 0.5) * 8 : 0;
    ctx.drawImage(img, AT.x + (DRAW_W - w) / 2 + jitter, AT.y + DRAW_H - h + bob, w, h);
    ctx.restore();

    // Name and HP bar.
    if (!f.dying) {
      const x = AT.x - 10, y = AT.y - 30, bw = DRAW_W + 20;
      ctx.fillStyle = '#1c1424';
      ctx.fillRect(x - 3, y - 17, bw + 6, 32);
      ctx.font = `8px ${FONT}`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffb4ae';
      ctx.fillText(b.name.toUpperCase().slice(0, 22), x + 2, y - 13);
      ctx.fillStyle = '#3a3260';
      ctx.fillRect(x, y + 2, bw, 9);
      const pct = b.hp / b.max;
      ctx.fillStyle = pct > 0.5 ? '#63d471' : pct > 0.25 ? '#f2c14e' : '#e5534b';
      ctx.fillRect(x + 1, y + 3, (bw - 2) * pct, 7);
    }

    ctx.font = `12px ${FONT}`;
    for (let i = f.numbers.length - 1; i >= 0; i--) {
      const n = f.numbers[i];
      n.y -= 0.8;
      if (--n.life <= 0) { f.numbers.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, n.life / 20);
      ctx.fillStyle = '#1c1424';
      ctx.fillText(n.text, n.x + 2, n.y + 2);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.globalAlpha = 1;
  }

  return { set, onEvent, draw, get active() { return !!f.boss; } };
}
