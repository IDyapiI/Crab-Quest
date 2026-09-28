// Shop cosmetics applied to one game: Clawd's skin, the companion that
// follows him, walking effects and the map theme.

import { STILE, SCALE, clawdSprites, petSprites, hatSprite, glyphSprite } from './sprites.js';

const RAINBOW = ['#ff5f5f', '#ffb347', '#fff27a', '#63d471', '#5aa9e6', '#b779e0'];

export function createCosmetics() {
  const c = {
    heroSprites: clawdSprites(),
    heroAlpha: 1,
    skin: null,
    theme: null,
    effect: null,
    pet: null,
    hat: null,
    prism: null,   // animated skin: one sprite set per hue
    glyph: null,
    trail: [],
    history: [], // recent hero positions, for the shadow clone
  };

  // items: { skin, map_theme, effect, companion } -> shop item or null
  c.apply = items => {
    const hat = items.hat && items.hat.data;
    // A hat replaces the Pixel King's crown.
    const skin = items.skin && { ...items.skin.data, crown: items.skin.data.crown && !hat };
    if (JSON.stringify(skin) !== JSON.stringify(c.skin)) {
      c.skin = skin || null;
      c.prism = skin && skin.prism ? RAINBOW.map(body => clawdSprites({ body })) : null;
      c.heroSprites = c.prism ? c.prism[0] : clawdSprites(skin || {});
      c.heroAlpha = (skin && skin.opacity) || 1;
    }
    const hatKey = hat ? hat.hat + hat.color : null;
    if (hatKey !== (c.hat && c.hat.key)) c.hat = hat ? { key: hatKey, sparkle: !!hat.sparkle, ...hatSprite(hat.hat, hat.color) } : null;
    c.theme = (items.map_theme && items.map_theme.data) || null;
    c.effect = (items.effect && items.effect.data) || null;
    c.glyph = c.effect && c.effect.type === 'glyph' ? glyphSprite(c.effect.glyph, c.effect.color) : null;

    const comp = items.companion && items.companion.data;
    if (!comp) c.pet = null;
    else if (!c.pet || c.pet.type !== comp.sprite) {
      c.pet = { type: comp.sprite, float: !!comp.float, fire: comp.particles === 'fire', sparkle: comp.particles === 'sparkle', sprites: petSprites(comp.sprite, comp.color), x: null, y: null, dir: 1 };
    }
  };

  function emit(p) { if (c.trail.length < 220) c.trail.push(p); }

  c.update = (hero, moving, tick) => {
    const cx = hero.x + STILE / 2, cy = hero.y + STILE / 2;

    if (c.prism) c.heroSprites = c.prism[Math.floor(tick / 8) % c.prism.length];

    const fx = c.effect;
    if (fx && fx.type === 'glyph' && (moving ? tick % 5 === 0 : tick % 24 === 0)) {
      emit({ x: cx + (Math.random() - 0.5) * 30, y: hero.y + 10, vx: (Math.random() - 0.5) * 0.4, vy: -0.8, life: fx.lifetime, max: fx.lifetime, img: c.glyph, kind: 'img' });
    } else if (fx && fx.type === 'confetti' && moving) {
      for (let i = 0; i < fx.rate; i++) {
        emit({ x: cx + (Math.random() - 0.5) * 40, y: hero.y - 6, vx: (Math.random() - 0.5) * 1.5, vy: 0.6 + Math.random(), life: fx.lifetime, max: fx.lifetime,
          color: RAINBOW[Math.floor(Math.random() * RAINBOW.length)], size: SCALE, kind: 'dot' });
      }
    } else if (fx && fx.type === 'trail' && moving) {
      for (let i = 0; i < fx.rate; i++) {
        emit({ x: cx + (Math.random() - 0.5) * 24, y: hero.y + STILE - 8, vx: 0, vy: -0.4 - Math.random() * 0.6, life: fx.lifetime, max: fx.lifetime,
          color: fx.color === 'rainbow' ? RAINBOW[(tick + i) % RAINBOW.length] : fx.color, size: SCALE * 2, kind: 'dot' });
      }
    } else if (fx && fx.type === 'aura' && tick % 2 === 0) {
      for (let i = 0; i < Math.ceil(fx.rate / 2); i++) {
        const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 12;
        emit({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.5, life: fx.lifetime, max: fx.lifetime, color: fx.color, size: SCALE, kind: 'spark' });
      }
    }
    if (c.skin && c.skin.particles && tick % 3 === 0) {
      const fire = c.skin.particles === 'fire';
      emit({ x: cx + (Math.random() - 0.5) * 30, y: hero.y + 10 + Math.random() * 20, vx: 0, vy: fire ? -1.2 : 0.6, life: 24, max: 24,
        color: fire ? (Math.random() > 0.5 ? '#ff9a3c' : '#ffd166') : (Math.random() > 0.5 ? '#ccf0ff' : '#ffffff'), size: SCALE, kind: 'dot' });
    }

    if (fx && fx.type === 'shadow') {
      if (tick % 4 === 0) c.history.unshift({ x: hero.x, y: hero.y, dir: hero.dir, frame: hero.frame });
      c.history.length = Math.min(c.history.length, 12);
    } else c.history.length = 0;

    for (let i = c.trail.length - 1; i >= 0; i--) {
      const p = c.trail[i];
      p.x += p.vx; p.y += p.vy;
      if (--p.life <= 0) c.trail.splice(i, 1);
    }

    // Companion on a short leash, trailing just behind Clawd.
    const pet = c.pet;
    if (pet) {
      const tx = hero.x - STILE * 0.7, ty = hero.y + STILE * 0.25;
      if (pet.x == null) { pet.x = tx; pet.y = ty; }
      const dx = tx - pet.x, dy = ty - pet.y, d = Math.hypot(dx, dy);
      pet.moving = d > 6;
      if (pet.moving) {
        const sp = Math.min(d * 0.09, 6);
        pet.x += (dx / d) * sp; pet.y += (dy / d) * sp;
        if (Math.abs(dx) > 1) pet.dir = dx > 0 ? 1 : -1;
      }
      if (pet.sparkle && tick % 5 === 0) emit({ x: pet.x + Math.random() * 30, y: pet.y + Math.random() * 20, vx: 0, vy: -0.5, life: 25, max: 25, color: Math.random() > 0.5 ? '#fff6cc' : '#f2c14e', size: SCALE, kind: 'spark' });
      if (pet.fire && tick % 4 === 0) emit({ x: pet.x + 15, y: pet.y + 20, vx: (Math.random() - 0.5), vy: -1, life: 20, max: 20, color: '#ff6a00', size: SCALE, kind: 'dot' });
    }
  };

  c.drawBehind = (ctx, heroSprites) => {
    const fx = c.effect;
    if (fx && fx.type === 'shadow') {
      c.history.forEach((h, i) => {
        if (i % 3) return;
        ctx.globalAlpha = (fx.opacity || 0.3) * (1 - i / 12);
        ctx.drawImage(heroSprites[h.dir][h.frame], h.x, h.y);
      });
      ctx.globalAlpha = 1;
    }
  };

  // Hat over Clawd; frameShift follows the walk bob baked into the sprite.
  c.drawHat = (ctx, x, y, frame, dir, tick) => {
    const hat = c.hat;
    if (!hat) return;
    const shift = frame % 2 ? SCALE : 0;
    ctx.drawImage(dir === 'left' ? hat.mirror : hat.img, x, y + shift + hat.offset);
    if (hat.sparkle && tick % 6 === 0) {
      emit({ x: x + 8 + Math.random() * 32, y: y + hat.offset + Math.random() * 10, vx: 0, vy: -0.4, life: 20, max: 20, color: '#fff6cc', size: SCALE, kind: 'spark' });
    }
  };

  c.drawOrbit = (ctx, hero, tick) => {
    const fx = c.effect;
    if (!fx || fx.type !== 'orbit') return;
    const cx = hero.x + STILE / 2, cy = hero.y + STILE / 2;
    for (let i = 0; i < fx.count; i++) {
      const a = tick / 30 + (i / fx.count) * Math.PI * 2;
      const x = cx + Math.cos(a) * 34, y = cy + Math.sin(a) * 14 - 6;
      ctx.fillStyle = i % 2 ? '#fff6cc' : fx.color;
      ctx.fillRect(Math.round(x) - 2, Math.round(y) - 6, SCALE, SCALE * 4);
      ctx.fillRect(Math.round(x) - 6, Math.round(y) - 2, SCALE * 4, SCALE);
    }
  };

  c.drawTrail = ctx => {
    for (const p of c.trail) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.kind === 'img') {
        ctx.drawImage(p.img, Math.round(p.x), Math.round(p.y));
      } else if (p.kind === 'spark') {
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size * 3);
        ctx.fillRect(Math.round(p.x) - p.size, Math.round(p.y) + p.size, p.size * 3, p.size);
      } else {
        const s = Math.max(SCALE, Math.round(p.size * p.life / p.max));
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
      }
    }
    ctx.globalAlpha = 1;
  };

  c.petActor = (ctx, tick) => {
    const pet = c.pet;
    if (!pet || pet.x == null) return null;
    return {
      y: pet.y,
      draw: () => {
        const bob = pet.float ? Math.round(Math.sin(tick * 0.08) * 4) - 10 : 0;
        const frame = pet.float || pet.moving ? Math.floor(tick / 8) % 2 : 0;
        const img = pet.sprites[frame];
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(Math.round(pet.x) + 6, Math.round(pet.y) + img.height - 3, img.width - 12, 4);
        if (pet.dir < 0) {
          ctx.translate(Math.round(pet.x) + img.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, Math.round(pet.y) + bob);
        } else {
          ctx.drawImage(img, Math.round(pet.x), Math.round(pet.y) + bob);
        }
        ctx.restore();
      },
    };
  };

  return c;
}
