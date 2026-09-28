// The shop window: browse, buy, equip and use items. Talks to /api/shop.

import { STILE, canvas, clawdSprites, petSprites, potionSprite, hatSprite, glyphSprite } from './sprites.js';
import { background } from './world.js';
import { FURNITURE } from './house.js';

const TABS = [
  ['skin', 'SKINS'], ['hat', 'HATS'], ['companion', 'PETS'], ['effect', 'EFFECTS'], ['map_theme', 'MAPS'],
  ['decor', 'HOME'], ['title', 'TITLES'], ['consumable', 'ITEMS'], ['legendary', 'LEGENDARY'], ['drop', 'BOSS LOOT'], ['bag', 'BAG'],
];
const SLOTTED = ['skin', 'hat', 'map_theme', 'effect', 'companion', 'title'];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const previews = new Map();

// Small pixel previews, rendered once per item.
export function itemPreview(item) {
  if (previews.has(item.id)) return previews.get(item.id);
  const c = canvas(96, 96);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const d = item.data;
  switch (item.category) {
    case 'skin':
      ctx.globalAlpha = d.opacity || 1;
      if (d.prism) {
        ['#ff5f5f', '#ffb347', '#63d471', '#5aa9e6'].forEach((body, i) => {
          ctx.save();
          ctx.beginPath(); ctx.rect(i * 24, 0, 24, 96); ctx.clip();
          ctx.drawImage(clawdSprites({ body }).down[0], 0, 0, 96, 96);
          ctx.restore();
        });
      } else ctx.drawImage(clawdSprites(d).down[0], 0, 0, 96, 96);
      break;
    case 'hat': {
      const hat = hatSprite(d.hat, d.color);
      ctx.drawImage(clawdSprites().down[0], 12, 24, 72, 72);
      ctx.drawImage(hat.img, 12, 24 + hat.offset * 1.5, hat.img.width * 1.5, hat.img.height * 1.5);
      break;
    }
    case 'decor': {
      const f = FURNITURE[d.decor];
      ctx.translate(18, 10);
      if (f) f.draw(ctx, d.decor === 'throne' ? 1.2 : d.decor === 'neon' ? 1 : 1.6, 0);
      break;
    }
    case 'title': {
      ctx.fillStyle = '#2b2340'; ctx.fillRect(4, 34, 88, 28);
      ctx.fillStyle = '#e0c3fc'; ctx.fillRect(4, 60, 88, 2);
      ctx.font = '7px "Press Start 2P", monospace'; ctx.fillStyle = '#f4efe6'; ctx.textBaseline = 'middle';
      const words = d.text.toUpperCase().split(' ');
      const half = Math.ceil(words.length / 2);
      const lines = words.length > 2 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [words.join(' ')];
      lines.forEach((l, i) => ctx.fillText(l, 48 - ctx.measureText(l).width / 2, 48 + (i - (lines.length - 1) / 2) * 10));
      break;
    }
    case 'companion': {
      const img = petSprites(d.sprite, d.color)[0];
      const s = Math.floor(84 / Math.max(img.width, img.height) * 3) / 3;
      ctx.drawImage(img, (96 - img.width * s) / 2, (96 - img.height * s) / 2, img.width * s, img.height * s);
      break;
    }
    case 'map_theme':
      ctx.drawImage(background(0, d), STILE * 7, STILE * 1, STILE * 4, STILE * 4, 0, 0, 96, 96);
      break;
    case 'effect': {
      ctx.drawImage(clawdSprites().down[0], 16, 20, 64, 64);
      const colors = d.color === 'rainbow' ? ['#ff5f5f', '#ffb347', '#fff27a', '#63d471', '#5aa9e6', '#b779e0'] : [d.color];
      const glyph = d.type === 'glyph' ? glyphSprite(d.glyph, d.color) : null;
      const palette = d.type === 'confetti' ? ['#ff5f5f', '#ffb347', '#fff27a', '#63d471', '#5aa9e6', '#b779e0'] : colors;
      for (let i = 0; i < (glyph ? 6 : 14); i++) {
        const a = (i / (glyph ? 6 : 14)) * Math.PI * 2;
        const x = 48 + Math.cos(a) * 38, y = 52 + Math.sin(a) * 38;
        ctx.globalAlpha = d.opacity || 1;
        if (glyph) ctx.drawImage(glyph, x - 5, y - 5);
        else { ctx.fillStyle = palette[i % palette.length] || '#f2c14e'; ctx.fillRect(x - 3, y - 3, 6, 6); }
      }
      break;
    }
    default: {
      const img = potionSprite(d.color || '#aaaaaa');
      ctx.drawImage(img, (96 - img.width * 2) / 2, (96 - img.height * 2) / 2, img.width * 2, img.height * 2);
    }
  }
  const url = c.toDataURL();
  previews.set(item.id, url);
  return url;
}

export function createShop(dialog, { getProfile, getItems, onChange }) {
  let tab = 'skin';
  let selected = null;
  let message = null;

  function list() {
    const p = getProfile();
    let items = getItems();
    if (tab === 'bag') return items.filter(it => p.inventory[it.id]);
    if (tab === 'legendary') return items.filter(it => it.rarity === 'legendary');
    if (tab === 'drop') return items.filter(it => it.drop);
    items = items.filter(it => !it.drop || p.inventory[it.id]);
    return items.filter(it => it.category === tab);
  }

  function state(item) {
    const p = getProfile();
    const owned = p.inventory[item.id] || 0;
    const equipped = Object.values(p.loadout).includes(item.id);
    const locked = p.level < item.level;
    const buy = locked ? { kind: 'locked', label: `REQUIRES LV.${item.level}` }
      : { kind: 'buy', label: `BUY · ${item.price} G`, poor: p.gold < item.price };
    let actions;
    if (item.drop && !owned) actions = [{ kind: 'none', label: 'DEFEAT BOSSES TO FIND IT' }];
    else if (item.consumable) actions = owned ? [{ kind: 'use', label: `USE (x${owned})` }, buy] : [buy];
    else if (!owned) actions = [buy];
    else actions = SLOTTED.includes(item.category) ? [{ kind: 'equip', label: equipped ? 'UNEQUIP' : 'EQUIP' }] : [{ kind: 'none', label: 'IN YOUR HOUSE' }];
    return { owned, equipped, locked, actions };
  }

  function statusText(item, st) {
    if (st.equipped) return '<span class="tag eq">EQUIPPED</span>';
    if (item.consumable && st.owned) return `<span class="tag">x${st.owned}</span>`;
    if (st.owned) return `<span class="tag own">${item.category === 'decor' ? 'AT HOME' : 'OWNED'}</span>`;
    if (item.drop) return '<span class="tag drop">BOSS DROP</span>';
    if (st.locked) return `<span class="tag lock">LV.${item.level}</span>`;
    return `<span class="price">${item.price} G</span>`;
  }

  function render() {
    const p = getProfile();
    if (!p) return;
    const items = list();
    if (!selected || !items.find(it => it.id === selected)) selected = items[0] ? items[0].id : null;
    const item = items.find(it => it.id === selected);
    const st = item && state(item);

    dialog.querySelector('.shop-gold').textContent = `${p.gold} G`;
    const all = getItems().filter(it => !it.consumable);
    dialog.querySelector('.shop-count').textContent = `${all.filter(it => p.inventory[it.id]).length}/${all.length} collected`;
    dialog.querySelector('.shop-tabs').innerHTML = TABS.map(([k, label]) =>
      `<button type="button" class="tab${k === tab ? ' on' : ''}" data-tab="${k}">${label}</button>`).join('');
    dialog.querySelector('.shop-list').innerHTML = items.length ? items.map(it => {
      const s = state(it);
      return `<li class="${it.id === selected ? 'sel' : ''}${s.locked && !s.owned ? ' locked' : ''}${it.rarity ? ' legendary' : ''}" data-id="${it.id}">
        <img src="${itemPreview(it)}" alt=""><div><b>${esc(it.name)}</b><small>${esc(it.description)}</small></div>${statusText(it, s)}</li>`;
    }).join('') : '<li class="empty">Nothing here yet.</li>';

    dialog.querySelector('.shop-detail').innerHTML = item ? `
      <img class="big${item.rarity ? ' legendary' : ''}" src="${itemPreview(item)}" alt="">
      ${item.rarity ? '<span class="tag legend">LEGENDARY</span>' : ''}
      <h3>${esc(item.name)}</h3>
      <p>${esc(item.description)}</p>
      <dl>
        ${item.consumable ? `<dt>Effect</dt><dd>${esc(effectText(item.data))}</dd>` : ''}
        ${item.drop ? '<dt>Source</dt><dd>Boss loot (30% per victory)</dd>' : `<dt>Level</dt><dd>${item.level}</dd><dt>Price</dt><dd>${item.price} G</dd>`}
      </dl>
      <div class="actions">${st.actions.map(a =>
        `<button type="button" class="btn${a.kind === 'locked' || a.poor || a.kind === 'none' ? ' ghost' : ''}" data-action="${a.kind}" ${a.kind === 'locked' || a.poor || a.kind === 'none' ? 'disabled' : ''}>${a.label}</button>`).join('')}</div>
      <p class="shop-msg ${message && message.error ? 'err' : ''}">${message ? esc(message.text) : '&nbsp;'}</p>` : '';
    const sel = dialog.querySelector('.shop-list .sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function effectText(d) {
    if (d.type === 'xp_boost') return `XP x${d.multiplier} for ${d.duration / 60} min`;
    if (d.type === 'gold_boost') return `Gold x${d.multiplier} for ${d.duration / 60} min`;
    if (d.type === 'fish_lure') return `Rarer fish for ${d.duration / 60} min`;
    return 'Instant celebration';
  }

  async function act(kind) {
    const item = getItems().find(it => it.id === selected);
    if (!item) return;
    const p = getProfile();
    const req = {
      buy: ['/api/shop/buy', { itemId: item.id }],
      use: ['/api/shop/use', { itemId: item.id }],
      equip: ['/api/loadout', { slot: item.category, itemId: Object.values(p.loadout).includes(item.id) ? null : item.id }],
    }[kind];
    if (!req) return;
    const res = await fetch(req[0], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req[1]) });
    const data = await res.json();
    message = data.error ? { error: true, text: data.error }
      : { text: { buy: `Bought ${item.name}!`, use: `${item.name} used!`, equip: req[1].itemId ? `Equipped ${item.name}` : `Unequipped ${item.name}` }[kind] };
    if (!data.error) onChange(data.profile, kind === 'use' ? data.effect : null);
    render();
  }

  dialog.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; selected = null; message = null; return render(); }
    const row = e.target.closest('.shop-list li[data-id]');
    if (row) { selected = row.dataset.id; message = null; return render(); }
    const btn = e.target.closest('[data-action]');
    if (btn && !btn.disabled) act(btn.dataset.action);
    if (e.target === dialog) dialog.close(); // backdrop click
  });

  dialog.addEventListener('keydown', e => {
    const items = list();
    const idx = items.findIndex(it => it.id === selected);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const next = items[Math.max(0, Math.min(items.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) selected = next.id;
    } else if (e.key === 'Tab') {
      const i = TABS.findIndex(([k]) => k === tab);
      tab = TABS[(i + (e.shiftKey ? TABS.length - 1 : 1)) % TABS.length][0];
      selected = null;
    } else if (e.key === 'Enter') {
      if (e.target.closest('button')) return; // the focused button clicks itself
      const b = dialog.querySelector('.actions .btn:not([disabled])');
      if (b) act(b.dataset.action);
    } else return;
    e.preventDefault();
    message = null;
    render();
  });

  return {
    open() { message = null; render(); if (!dialog.open) dialog.showModal(); },
    toggle() { dialog.open ? dialog.close() : this.open(); },
    render,
  };
}
