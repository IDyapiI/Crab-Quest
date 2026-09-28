// Procedural pixel art. Every sprite is a list of strings where each
// character is a palette key and '.' is transparent.

export const TILE = 16;
export const SCALE = 3;
export const STILE = TILE * SCALE;

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function paint(ctx, rows, palette, ox = 0, oy = 0, scale = SCALE) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

function render(rows, palette, scale = SCALE) {
  const c = canvas(rows[0].length * scale, rows.length * scale);
  paint(c.getContext('2d'), rows, palette, 0, 0, scale);
  return c;
}

const mirror = rows => rows.map(r => [...r].reverse().join(''));

// Seeded RNG so tiles look the same on every load.
export function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---- CLAWD (the hero) ----

const CLAWD_PAL = {
  O: '#4a2114', C: '#d97757', L: '#f2a582', D: '#a9533a', K: '#1b1010', W: '#fff4ea',
};

const CLAWD_BODY = {
  down: [
    '................',
    '................',
    '..OOOOOOOOOOOO..',
    '..OLLCCCCCCCCO..',
    '..OLCCCCCCCCCO..',
    '..OCCKWCCKWCCO..',
    'OOOCCKKCCKKCCOOO',
    'OCCCCCCCCCCCCCCO',
    'OOOCCCCCCCCCCOOO',
    '..OCCCCCCCCCCO..',
    '..ODDDDDDDDDDO..',
    '..OOOOOOOOOOOO..',
  ],
  up: [
    '................',
    '................',
    '..OOOOOOOOOOOO..',
    '..OLLCCCCCCCCO..',
    '..OLCCCCCCCCCO..',
    '..OCCCCCCCCCCO..',
    'OOOCCCCCCCCCCOOO',
    'OCCCCCCCCCCCCCCO',
    'OOOCCCCCCCCCCOOO',
    '..OCCCCCCCCCCO..',
    '..ODDDDDDDDDDO..',
    '..OOOOOOOOOOOO..',
  ],
  left: [
    '................',
    '................',
    '..OOOOOOOOOOOO..',
    '..OLLCCCCCCCCO..',
    '..OLCCCCCCCCCO..',
    '..OKWCCKWCCCCO..',
    'OOOKKCCKKCCCCO..',
    'OCCCCCCCCCCCCO..',
    'OOOCCCCCCCCCCO..',
    '..OCCCCCCCCCCO..',
    '..ODDDDDDDDDDO..',
    '..OOOOOOOOOOOO..',
  ],
};
CLAWD_BODY.right = mirror(CLAWD_BODY.left);

// Four little legs; walk frames lift alternating pairs.
const LEGS = [
  ['...OD.OD.OD.OD..', '...OO.OO.OO.OO..', '................', '................'],
  ['...OD....OD.....', '...OO.OD.OO.OD..', '.......OO....OO.', '................'],
  ['...OD.OD.OD.OD..', '...OO.OO.OO.OO..', '................', '................'],
  ['......OD....OD..', '...OD.OO.OD.OO..', '...OO....OO.....', '................'],
];

const CROWN = ['....y.y..y.y....', '....yyyyyyyy....'];

// skin: optional { body, light, dark, eye, crown } from a shop item.
export function clawdSprites(skin = {}) {
  const pal = {
    ...CLAWD_PAL,
    ...(skin.body && { C: skin.body, L: skin.light || shade(skin.body, 0.3), D: skin.dark || shade(skin.body, -0.3) }),
    ...(skin.eye && { K: skin.eye }),
    y: '#f2c14e',
  };
  const out = {};
  for (const dir of ['down', 'up', 'left', 'right']) {
    out[dir] = LEGS.map((legs, i) => {
      const bob = i % 2 === 1 ? ['................'] : [];
      const rows = [...bob, ...CLAWD_BODY[dir], ...legs].slice(0, 16);
      if (skin.crown) rows.splice(bob.length, 2, ...CROWN);
      return render(rows, pal);
    });
  }
  return out;
}

// ---- COMPANIONS (shop pets), 2 frames each ----

const PETS = {
  cat: ['.B......B.', 'BbB....BbB', 'BBBBBBBBBB', 'BKBBBBBBKB', 'BBBBWWBBBB', '.BBBBBBBB.', '.BBBBBBBBB', '.BBBBBBBBb', '.B.B..B.B.'],
  slime: ['..........', '...bbbb...', '..bBBBBb..', '.bBWBBBBb.', '.bBKBBKBb.', 'bBBBBBBBBb', 'bBBBBBBBBb', '.bbbbbbbb.'],
  owl: ['.b......b.', '.bBBBBBBb.', 'bBWWBBWWBb', 'bBWKBBWKBb', 'bBBBYYBBBb', '.bBBBBBBb.', '.bBWWWWBb.', '..bBBBBb..', '..Y....Y..'],
  fox: ['B.......B.', 'BB.....BB.', 'BBBBBBBBB.', 'BKBBBBBKB.', 'BBWWWWWBB.', '.BBWKWBBBB', '.BBBBBBBBW', '.BBBBBBBB.', '.B.B..B.B.'],
  fairy: ['.w......w.', 'www.BB.www', '.wwBBBBww.', '..BKBBKB..', '...BBBB...', '....BB....', '...Y..Y...'],
  ghost: ['..BBBBBB..', '.BBBBBBBB.', 'BBKKBBKKBB', 'BBKKBBKKBB', 'BBBBBBBBBB', 'BBBBbbBBBB', 'BBBBBBBBBB', 'B.BB.BB.BB'],
  bot: ['....R.....', '....k.....', '.kkkkkkkk.', '.kBBBBBBk.', '.kBGBBGBk.', '.kBBBBBBk.', '.kkkkkkkk.', '..k....k..'],
  dragon: ['w........w', 'ww.BBBB.ww', '.wBBBBBBw.', '..BKBBKB..', '..BBBBBB.B', '...BYYB.BB', '...BBBBBB.', '...B..B...'],
  phoenix: ['Y........Y', 'YY.BBBB.YY', '.YBBBBBBY.', '..BKBBKB..', '..BBYYBB..', '...BBBB...', '..RYBBYR..', '...R..R...'],
  penguin: ['...BBBB...', '..BBBBBB..', '.BBWBBWBB.', '.BWKYYKWB.', '.BWWYYWWB.', 'BBWWWWWWBB', '.BWWWWWWB.', '..YY..YY..'],
  bee: ['..w....w..', '.www..www.', '..BYYBBY..', '.BKYBBYKB.', '.YBBYYBBY.', '..BYYBBY..', '...BBBB...'],
  turtle: ['..........', '....AAAA..', '...AaAaAA.', '..AAAAAAAA', '.BBAaAAaAB', 'BKB.B..B..'],
  octopus: ['..BBBBBB..', '.BBBBBBBB.', 'BBWKBBWKBB', 'BBBBBBBBBB', '.BBBBBBBB.', 'B.B.BB.B.B', 'B.B.B..B.B'],
  bat: ['B........B', 'BB..BB..BB', 'BBBBBBBBBB', '.BBKBBKBB.', '..BBBBBB..', '...B..B...'],
  bug: ['.k......k.', '..k....k..', '..BBBBBB..', '.BWKBBWKB.', 'kBBbBBbBBk', '.BBbBBbBB.', 'kBBBBBBBBk', '.k.k..k.k.'],
  miniclawd: ['..........', '.bbbbbbbb.', '.bBBBBBBb.', '.bBKBBKBb.', 'bbBBBBBBbb', '.bBBBBBBb.', '.bbbbbbbb.', '..b.b.b.b.'],
};

// ---- HATS for Clawd: the last row sits on sprite row `base` ----

const CLAWD_HATS = {
  cap: { base: 2, rows: ['....hhhhhhh.....', '...hHHHHHHHh....', '...hHHHHHHHhhhh.'] },
  party: { base: 2, rows: ['.......y........', '.......H........', '......HyH.......', '.....HyHyH......', '....HyHyHyH.....'] },
  flowers: { base: 2, rows: ['...p.y.p.y.p....', '..gHgygHgygHg...'] },
  chef: { base: 2, rows: ['....WWWWWWW.....', '...WWWWWWWWW....', '...WWWWWWWWW....', '....WWWWWWW.....', '....wwwwwww.....'] },
  headphones: { base: 7, rows: ['....kkkkkkkk....', '...k........k...', '..k..........k..', '..k..........k..', '.kk..........kk.', '.HH..........HH.', '.HH..........HH.', '.kk..........kk.'] },
  wizard: { base: 2, rows: ['..........y.....', '........HHy.....', '.......HHHH.....', '......HHyHHH....', '.....HHHHHHHH...', '....HHHHHHHHHH..', '..hhhhhhhhhhhhh.'] },
  pirate: { base: 2, rows: ['.....HHHHHH.....', '....HHHWWHHH....', '...HHHWHHWHHH...', '.HHHHHHHHHHHHHH.'] },
  tophat: { base: 2, rows: ['.....HHHHHH.....', '.....HHHHHH.....', '.....HHHHHH.....', '.....RRRRRR.....', '...HHHHHHHHHH...'] },
  viking: { base: 2, rows: ['.W............W.', '.WW..........WW.', '..WWHHHHHHHHWW..', '...HHHHHHHHHH...'] },
  halo: { base: 0, rows: ['....yyyyyyyy....', '...y........y...', '....yyyyyyyy....'] },
  horns: { base: 2, rows: ['.H............H.', '.HH..........HH.', '..HH........HH..', '...HHkkkkkkHH...'] },
  legend: { base: 2, rows: ['...y..y..y..y...', '..y.y.y..y.y.y..', '..yRyByyGyRyBy..', '..yyyyyyyyyyyy..'] },
};

export function hatSprite(kind, color) {
  const hat = CLAWD_HATS[kind];
  if (!hat) return null;
  const pal = {
    H: color, h: shade(color, -0.3), y: '#f2c14e', p: '#ff6f91', g: '#63d471', W: '#f4efe6', w: '#d8d2c4',
    k: '#2b2b3a', R: '#c1121f', B: '#5aa9e6', G: '#63d471',
  };
  const img = render(hat.rows, pal);
  return { img, mirror: render(mirror(hat.rows), pal), offset: (hat.base - (hat.rows.length - 1)) * SCALE };
}

// Small shapes for glyph effects.
export const GLYPHS = {
  heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'],
  note: ['..XXX', '..X.X', '..X..', 'XXX..', 'XXX..'],
  bubble: ['.XXX.', 'X...X', 'X..XX', 'X...X', '.XXX.'],
  star: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
};

export function glyphSprite(name, color) {
  return render(GLYPHS[name] || GLYPHS.star, { X: color }, 2);
}

export function petSprites(type, color) {
  const rows = PETS[type] || PETS.slime;
  const pal = {
    B: color, b: shade(color, -0.3), W: '#f4efe6', K: '#1b1010', Y: '#f2c14e',
    R: '#e5534b', G: '#63d471', k: '#3d3550', w: 'rgba(255,255,255,0.75)', A: '#8c5f36', a: '#6b4423',
  };
  const w = rows[0].length;
  const hop = ['.'.repeat(w), ...rows.slice(0, -1)];
  return [render(rows, pal, 3), render(hop, pal, 3)];
}

// Tiny Clawd used for sub-agents walking around.
export function sidekickSprite(tint = '#e8a87c') {
  const rows = [
    '..........',
    '.OOOOOOOO.',
    '.OCCCCCCO.',
    '.OCKCCKCO.',
    'OOCCCCCCOO',
    '.OCCCCCCO.',
    '.OOOOOOOO.',
    '..O.O.O.O.',
  ];
  return render(rows, { O: '#4a2114', C: tint, K: '#1b1010' }, 3);
}

export function shadowSprite() {
  const c = canvas(STILE, 12);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (const [x, w, y] of [[12, 24, 3], [6, 36, 6], [12, 24, 9]]) ctx.fillRect(x, y - 3, w, 3);
  return c;
}

// ---- VILLAGERS (one per tool) ----

const HATS = {
  cap: [
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '...HhhhhhhhhH...',
    '...OOOOOOOOOOhh.',
  ],
  wizard: [
    '.......HH.......',
    '......HHHH......',
    '....HHHhHHHH....',
    '..hhhhhhhhhhhh..',
  ],
  hood: [
    '.....HHHHHH.....',
    '....HHHHHHHH....',
    '...HHhhhhhhHH...',
    '...HOOOOOOOOH...',
  ],
  helm: [
    '......hHHh......',
    '....HHHHHHHH....',
    '...HHHHHHHHHH...',
    '...hhhhhhhhhh...',
  ],
  crown: [
    '....H..H..H.....',
    '....HHHHHHH.....',
    '...HhHhHhHhH....',
    '...OOOOOOOOOO...',
  ],
};

const OUTFITS = {
  tunic: null, // the base body below
  robe: ['...OBBBBBBBBO...', '..OBBBbAAbBBBO..', '..OSBBbAAbBBSO..', '..OSBBBBBBBBSO..', '...OBBBBBBBBO...', '..OBBBBBBBBBBO..', '..OOOOOOOOOOOO..'],
  armor: ['..OMMBBBBBBMMO..', '..OMBBbAAbBBMO..', '..OSBBbAAbBBSO..', '..OSBYYYYYYBSO..', '...OMMMMMMMMO...', '...OMMO..OMMO...', '...OOOO..OOOO...'],
  apron: ['...OBBBBBBBBO...', '..OBBWWWWWWBBO..', '..OSBWWWWWWBSO..', '..OSBWWWWWWBSO..', '...OPWWWWWWPO...', '...OPPO..OPPO...', '...OOOO..OOOO...'],
};

const VILLAGER = [
  '...OSSSSSSSSO...',
  '..OSSKSSSSKSSO..',
  '..OSSKSSSSKSSO..',
  '...OSSSSSSSSO...',
  '....OSSmmSSO....',
  '...OBBBBBBBBO...',
  '..OBBBbAAbBBBO..',
  '..OSBBbAAbBBSO..',
  '..OSBBBBBBBBSO..',
  '...OPPPPPPPPO...',
  '...OPPO..OPPO...',
  '...OOOO..OOOO...',
];

// Frames: 0 idle, 1 bob, 2 blink, 3 wave (right hand raised).
export function villagerSprites(colors, hat = 'cap', outfit = 'tunic') {
  const pal = {
    O: '#2b1d16', S: '#f6cfa0', K: '#2b1d16', m: '#c98a6a',
    H: colors.hat, h: shade(colors.hat, -0.25),
    B: colors.body, b: shade(colors.body, -0.25), A: colors.accent,
    P: colors.pants || '#3d3a5c', M: '#aab1c2', Y: '#f2c14e', W: '#f4efe6',
  };
  const body = OUTFITS[outfit] ? [...VILLAGER.slice(0, 5), ...OUTFITS[outfit]] : VILLAGER;
  const idle = [...HATS[hat], ...body];
  const blink = idle.map((r, i) => (i === 5 || i === 6) ? r.replace(/K/g, 'S') : r);
  const bob = ['................', ...idle.slice(0, 15)];
  const wave = idle.map((r, i) => {
    if (i === 11) return r.slice(0, 12) + r[10] + r.slice(13); // hand leaves the side...
    if (i === 8) return r.slice(0, 12) + 'OS' + r.slice(14);  // ...and waves by the face
    if (i === 7) return r.slice(0, 13) + 'S' + r.slice(14);
    return r;
  });
  return [render(idle, pal), render(bob, pal), render(blink, pal), render(wave, pal)];
}

// ---- things villagers hold ----

const PROPS = {
  book: ['bbbbb', 'bWWWb', 'bWkWb', 'bWWWb', 'bbbbb'],
  quill: ['....W', '...WW', '..WW.', '.WW..', '.k...', 'k....'],
  hammer: ['kkkk.', 'kkkk.', '.bb..', '.bb..', '.bb..', '.bb..'],
  magnifier: ['.kkk.', 'k.w.k', 'k...k', '.kkk.', '...bb', '....b'],
  map: ['yyyyy', 'ybyby', 'yyyyy', 'ybyyb', 'yyyyy'],
  terminal: ['kkkkkk', 'kgkkkk', 'kkgkkk', 'kgkggk', 'kkkkkk', 'wwwwww'],
  banner: ['bRRRR', 'bRYRR', 'bRRRR', 'b....', 'b....', 'b....'],
  crystal: ['.ccc.', 'cCwcc', 'ccccc', '.ccc.', 'bbbbb'],
  envelope: ['wwwww', 'wkwkw', 'wwkww', 'wwwww'],
  clipboard: ['.kk..', 'bbbbb', 'bwwwb', 'bwkwb', 'bwwwb', 'bbbbb'],
  wand: ['...y.', '..yWy', '...y.', '..b..', '.b...', 'b....'],
  blueprint: ['ccccc', 'cwcwc', 'cwwwc', 'cwcwc', 'ccccc'],
  orb: ['.ppp.', 'pPwpp', 'ppppp', '.ppp.', 'bbbbb'],
  tome: ['GGGGG', 'GYGYG', 'GGGGG', 'GYGYG', 'GGGGG'],
  hourglass: ['kkkkk', '.yyy.', '..y..', '.y.y.', 'kkkkk'],
  trumpet: ['....y', '...yy', 'yyyyy', '...yy', '....y'],
  lantern: ['..k..', '.kkk.', 'kyyyk', 'kyWyk', 'kyyyk', '.kkk.'],
  plug: ['.k.k.', '.k.k.', 'kkkkk', 'kkkkk', '..k..', '..k..'],
  staff: ['.cc..', 'cWc..', '.cc..', '.b...', '.b...', '.b...', '.b...'],
};

const PROP_PAL = {
  b: '#8c5f36', W: '#f4efe6', w: '#f4efe6', k: '#3d3550', y: '#f2c14e', g: '#63d471', R: '#e5534b', Y: '#f2c14e',
  c: '#4cc9f0', C: '#bde0fe', p: '#b779e0', P: '#e0c3fc', G: '#2a9d8f',
};

export function propSprite(name, accent) {
  const rows = PROPS[name];
  return rows ? render(rows, { ...PROP_PAL, b: name === 'book' ? accent : PROP_PAL.b }, 3) : null;
}

// ---- mood bubbles for idle villagers ----

const EMOTES = {
  note: ['.oooooo.', 'owwwwwwo', 'owwkkkwo', 'owwkwkwo', 'owkkwwwo', 'owkkwwwo', '.oooooo.', '...oo...'],
  dots: ['.oooooo.', 'owwwwwwo', 'owwwwwwo', 'okwkwkwo', 'owwwwwwo', 'owwwwwwo', '.oooooo.', '...oo...'],
  heart: ['.oooooo.', 'owwwwwwo', 'owrwrwwo', 'owrrrwwo', 'owwrwwwo', 'owwwwwwo', '.oooooo.', '...oo...'],
  star: ['.oooooo.', 'owwywwwo', 'owyyywwo', 'owwywwwo', 'owwwwwwo', 'owwwwwwo', '.oooooo.', '...oo...'],
  hi: ['.oooooo.', 'owwwwwwo', 'okwkwkwo', 'okkkwkwo', 'okwkwkwo', 'owwwwwwo', '.oooooo.', '...oo...'],
};

export function emoteSprites() {
  const pal = { o: '#1c1424', w: '#f4efe6', k: '#1c1424', r: '#e5534b', y: '#f2c14e' };
  return Object.fromEntries(Object.entries(EMOTES).map(([k, rows]) => [k, render(rows, pal, 2)]));
}

// ---- 8x8 ICONS ----

const ICONS = {
  read: ['........', '.OO..OO.', 'OWWOOWWO', 'OWkWWkWO', 'OWWWWWWO', 'OWkWWkWO', 'OOOOOOOO', '........'],
  write: ['......WO', '.....WWO', '....WWO.', '...WWO..', '..WWO...', '.YWO....', 'YO......', 'O.......'],
  edit: ['......RO', '.....YRO', '....YYO.', '...YYO..', '..YYO...', '.WYO....', 'kWO.....', 'kO......'],
  grep: ['.OOOO...', 'OWWWWO..', 'OWkkWO..', 'OWkkWO..', 'OWWWWO..', '.OOOOkO.', '.....OkO', '......OO'],
  glob: ['........', 'OOO.....', 'OYYOOOOO', 'OYYYYYYO', 'OYYYYYYO', 'OYYYYYYO', 'OOOOOOOO', '........'],
  bash: ['OOOOOOOO', 'OkkkkkkO', 'OkGkkkkO', 'OkkGkkkO', 'OkGkkkkO', 'OkkkGGkO', 'OkkkkkkO', 'OOOOOOOO'],
  agent: ['..OOOO..', '.OYYYYO.', 'OYkYYkYO', 'OYYYYYYO', '.OYYYYO.', 'OOOOOOOO', 'OkOkkOkO', 'OO.OO.OO'],
  // The web: a small Earth (ocean, continents, highlight).
  search: ['..OOOO..', '.OWBGGO.', 'OBBGGGBO', 'OGBBGBBO', 'OGGBBBGO', 'OBGGBBBO', '.OBBBGO.', '..OOOO..'],
  // Download: an arrow into a tray.
  fetch: ['..OBBO..', '..OBBO..', '..OBBO..', 'OOOBBOOO', '.OBBBBO.', '..OBBO..', 'OW.OO.WO', 'OWWWWWWO'],
  quest: ['OOOOOOO.', 'OWWWWWO.', 'OGWkkWO.', 'OWWWWWO.', 'OGWkkWO.', 'OWWWWWO.', 'ORWkkWO.', 'OOOOOOO.'],
  skill: ['...OO...', '..OYYO..', 'OOOYYOOO', 'OYYYYYYO', '.OYYYYO.', '.OYOOYO.', 'OYO..OYO', 'OO....OO'],
  ask: ['.OOOOO..', 'OWWWWWO.', 'OWOOOWO.', '...OWO..', '..OWO...', '..OWO...', '........', '..OWO...'],
  plan: ['OOOOOOOO', 'OBBBBBBO', 'OBWBBWBO', 'OBWWWWBO', 'OBWBBWBO', 'OBBBBRRO', 'OBBBBRRO', 'OOOOOOOO'],
  sage: ['.O....O.', 'OBOOOOBO', 'OWWBBWWO', 'OWkBBkWO', 'OBBYYBBO', '.OBBBBO.', '.OBWWBO.', '..OOOO..'],
  portal: ['..OOOO..', '.OPPPPO.', 'OPkkkkPO', 'OPkWWkPO', 'OPkWWkPO', 'OPkkkkPO', '.OPPPPO.', '..OOOO..'],
  clock: ['..OOOO..', '.OWWWWO.', 'OWWkWWWO', 'OWWkWWWO', 'OWWkkkWO', 'OWWWWWWO', '.OWWWWO.', '..OOOO..'],
  herald: ['.......Y', '......YY', 'OOOOOYYY', 'YYYYYYYY', 'OOOOOYYY', '......YY', '.......Y', '........'],
  mcp: ['.OO..OO.', '.OPO.OPO', '.OPO.OPO', 'OPPPPPPO', 'OPPPPPPO', '.OPPPPO.', '..OPPO..', '...OO...'],
  mystery: ['...OO...', '..OkkO..', '.OYYYYO.', 'OYWYYYYO', 'OYYYYYYO', '.OYYYYO.', '..OkkO..', '...OO...'],
};

const ICON_PAL = {
  O: '#1c1424', W: '#f4efe6', k: '#3d3550', Y: '#f2c14e', G: '#63d471',
  B: '#5aa9e6', R: '#e5534b', P: '#b779e0',
};

export function iconSprites(scale = 2) {
  const out = {};
  for (const [name, rows] of Object.entries(ICONS)) out[name] = render(rows, ICON_PAL, scale);
  return out;
}

// ---- TILES ----

const DEFAULT_THEME = { grass: '#5f9e46', path: '#d8b878', water: '#3b7dd8', tree: '#2f7a35' };
let GRASS = [];

function grassTile(seed, tufts = 10) {
  const c = canvas(STILE, STILE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = GRASS[0];
  ctx.fillRect(0, 0, STILE, STILE);
  const r = rng(seed);
  for (let i = 0; i < tufts; i++) {
    const x = Math.floor(r() * 15), y = Math.floor(r() * 15);
    paint(ctx, ['.a', 'ab'], { a: GRASS[3], b: GRASS[2] }, x * SCALE, y * SCALE);
  }
  return c;
}

// theme: optional { grass, path, water, tree } from a map theme item.
export function tileSprites(theme = {}) {
  const th = { ...DEFAULT_THEME, ...theme };
  GRASS = [th.grass, shade(th.grass, -0.1), shade(th.grass, 0.12), shade(th.grass, -0.22)];
  const t = {};
  t.grass = [grassTile(42), grassTile(7), grassTile(19, 6)];
  if (th.stars) {
    t.grass.forEach((g, n) => {
      const ctx = g.getContext('2d');
      const r = rng(300 + n);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = r() > 0.6 ? '#fff6cc' : '#b8a8ff';
        ctx.fillRect(Math.floor(r() * 16) * SCALE, Math.floor(r() * 16) * SCALE, SCALE, SCALE);
      }
    });
  }

  t.path = canvas(STILE, STILE);
  {
    const ctx = t.path.getContext('2d');
    ctx.fillStyle = th.path;
    ctx.fillRect(0, 0, STILE, STILE);
    const r = rng(99);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = r() > 0.5 ? shade(th.path, -0.08) : shade(th.path, 0.12);
      ctx.fillRect(Math.floor(r() * 16) * SCALE, Math.floor(r() * 16) * SCALE, SCALE * 2, SCALE);
    }
  }

  t.pathEdge = shade(th.path, -0.18);

  t.sand = canvas(STILE, STILE);
  {
    const ctx = t.sand.getContext('2d');
    ctx.fillStyle = '#e8d7a4';
    ctx.fillRect(0, 0, STILE, STILE);
    const r = rng(66);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = ['#d9c38c', '#f3e6bc'][i % 2];
      ctx.fillRect(Math.floor(r() * 16) * SCALE, Math.floor(r() * 16) * SCALE, SCALE, SCALE);
    }
  }

  t.stone = canvas(STILE, STILE);
  {
    const ctx = t.stone.getContext('2d');
    paint(ctx, [
      'aaaaaaabaaaaaaab', 'accccccbacccccc b', 'acccccdbaccccdcb', 'accccccbaccccccb',
      'acdccccbacccccc b', 'accccccbaccccccb', 'accccccbacccdccb', 'bbbbbbbbbbbbbbbb',
      'aaaabaaaaaaabaaa', 'ccccbacccccccbac', 'ccdcbacccccdcbac', 'ccccbacccccccbac',
      'ccccbaccdccccbac', 'ccccbacccccccbac', 'ccccbacccccccbac', 'bbbbbbbbbbbbbbbb',
    ].map(r => r.replace(/ /g, '')), { a: '#b3b0c2', b: '#6f6b82', c: '#9a97ab', d: '#85829a' });
  }

  t.water = [0, 1].map(f => {
    const c = canvas(STILE, STILE);
    const ctx = c.getContext('2d');
    ctx.fillStyle = th.water;
    ctx.fillRect(0, 0, STILE, STILE);
    const waves = f === 0
      ? ['................', '..wwww..........', '................', '.........wwww...', '................', '....ww..........', '................', '...........www..']
      : ['................', '....wwww........', '................', '.......wwww.....', '................', '......ww........', '................', '.........www....'];
    paint(ctx, [...waves, ...waves], { w: shade(th.water, 0.4) });
    return c;
  });

  t.bridge = canvas(STILE, STILE);
  {
    const ctx = t.bridge.getContext('2d');
    ctx.drawImage(t.water[0], 0, 0);
    const rows = [];
    for (let y = 0; y < 16; y++) rows.push(y % 4 === 3 ? 'rpppppppppppppr.'.replace(/p/g, 'd') : 'rppppppppppppppr');
    paint(ctx, rows, { r: '#5c3b22', p: '#b98552', d: '#8c5f36' });
  }

  t.tree = render([
    '.....gGGGGg.....', '...gGGLLGGGGg...', '..gGLLLGGGGGGg..', '.gGLLGGGGGGGGGg.',
    '.gGLGGGGGGGGGGg.', 'gGGGGGGGGGGGGGGg', 'gGGGGGGGGGGGdGGg', 'gGGGGGGGGGGdGGGg',
    '.gGGGGGGGGdGGGg.', '.gdGGGGGGGGGGdg.', '..gddGGGGGGddg..', '...ggddddddgg...',
    '......tTTt......', '......tTTt......', '.....tTTTTt.....', '....ssssssss....',
  ], { g: shade(th.tree, -0.35), G: th.tree, L: shade(th.tree, 0.3), d: shade(th.tree, -0.2), t: '#4a2e18', T: '#7a4a26', s: 'rgba(0,0,0,0.25)' });

  t.flowers = [0, 1].map(seed => {
    const c = canvas(STILE, STILE);
    const ctx = c.getContext('2d');
    ctx.drawImage(t.grass[seed], 0, 0);
    const r = rng(123 + seed);
    const colors = ['#ff6f91', '#ffd166', '#f4efe6', '#c792ea'];
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(r() * 11), y = 2 + Math.floor(r() * 11);
      paint(ctx, ['.p.', 'pyp', '.p.'], { p: colors[(i + seed) % 4], y: '#ffe08a' }, x * SCALE, y * SCALE);
    }
    return c;
  });

  t.rock = render([
    '................', '................', '................', '................',
    '................', '.....oooooo.....', '....oLLccccoo...', '...oLccccccccoo.',
    '..oLccccccccdcco', '..occccccccddcco', '..occcccccdddcco', '...ooddddddddoo.',
    '....sssssssssss.', '................', '................', '................',
  ], { o: '#3c3a48', L: '#c9c6d6', c: '#9d99ae', d: '#77738a', s: 'rgba(0,0,0,0.2)' });

  t.sign = render([
    '................', '................', '..oooooooooooo..', '..owwwwwwwwwwo..',
    '..owkkwkkkwwwo..', '..owwwwwwwwwwo..', '..owkkkwkkwkwo..', '..owwwwwwwwwwo..',
    '..oooooooooooo..', '.......pp.......', '.......pp.......', '.......pp.......',
    '.......pp.......', '.....ssssss.....', '................', '................',
  ], { o: '#4a2e18', w: '#d6ad72', k: '#8c5f36', p: '#6b4423', s: 'rgba(0,0,0,0.2)' });

  t.lamp = render([
    '......oooo......', '.....oyyyyo.....', '.....oyWWyo.....', '.....oyyyyo.....',
    '......oooo......', '.......oo.......', '.......oo.......', '.......oo.......',
    '.......oo.......', '.......oo.......', '.......oo.......', '.......oo.......',
    '......oooo......', '.....oooooo.....', '....ssssssss....', '................',
  ], { o: '#2b2b3a', y: '#f2c14e', W: '#fff6cc', s: 'rgba(0,0,0,0.2)' });

  t.house = buildHouse();
  t.guild = buildGuild();
  return t;
}

function buildHouse() {
  const rows = [
    '...........rrrrrrrrrr...........',
    '.........rrRRRRRRRRRRrr.........',
    '.......rrRRRRRRRRRRRRRRrr.......',
    '.....rrRRRRRRRRRRRRRRRRRRrr.....',
    '...rrRRRRRRRRRRRRRRRRRRRRRRrr...',
    '..rRRRRRRRRRRRRRRRRRRRRRRRRRRr..',
    '.rRRRRRRRRRRRRRRRRRRRRRRRRRRRRr.',
    'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
    '.ddddddddddddddddddddddddddddddd',
    '.oWWWWWWWWWWWWWWWWWWWWWWWWWWWWo.',
    '.oWWWWWWWWWWWWWWWWWWWWWWWWWWWWo.',
    '.oWWooooooWWWWWWWWWWWooooooWWWo.',
    '.oWWobbbboWWWWWWWWWWWobbbboWWWo.',
    '.oWWobggboWWWWWWWWWWWobggboWWWo.',
    '.oWWobbbboWWWWWWWWWWWobbbboWWWo.',
    '.oWWooooooWWWWWWWWWWWooooooWWWo.',
    '.oWWWWWWWWWWWooooooWWWWWWWWWWWo.',
    '.oWWWWWWWWWWoDDDDDDoWWWWWWWWWWo.',
    '.oWWWWWWWWWWoDDDDDDoWWWWWWWWWWo.',
    '.oWWWWWWWWWWoDDDDDDoWWWWWWWWWWo.',
    '.oWWWWWWWWWWoDDDDyDoWWWWWWWWWWo.',
    '.oWWWWWWWWWWoDDDDDDoWWWWWWWWWWo.',
    '.oWWWWWWWWWWoDDDDDDoWWWWWWWWWWo.',
    '.oooooooooooooooooooooooooooooo.',
  ];
  const pal = {
    r: '#8f2f2b', R: '#d0493e', d: 'rgba(0,0,0,0.25)', o: '#4a2e18', W: '#efe2c4',
    b: '#9fd3ff', g: '#dff1ff', D: '#8c5f36', y: '#f2c14e',
  };
  const c = canvas(STILE * 2, STILE * 2);
  paint(c.getContext('2d'), rows, pal, 0, STILE * 2 - rows.length * SCALE);
  return c;
}

function buildGuild() {
  const w = 48;
  const rows = [];
  rows.push('.'.repeat(4) + 'P'.repeat(w - 8) + '.'.repeat(4));
  for (let i = 0; i < 5; i++) rows.push('.'.repeat(3 - Math.min(i, 3)) + 'P' + 'p'.repeat(w - 2 - 2 * (3 - Math.min(i, 3)) - 2) + 'P' + '.'.repeat(3 - Math.min(i, 3)));
  rows.push('P'.repeat(w));
  rows.push('.' + 'd'.repeat(w - 2) + '.');
  for (let y = 0; y < 22; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      if (x === 1 || x === w - 2) row += 'o';
      else if (x === 0 || x === w - 1) row += '.';
      else if (y === 21) row += 'o';
      else if (x >= 20 && x <= 27 && y >= 9) row += (x === 20 || x === 27 || y === 9) ? 'o' : (x === 25 && y === 15 ? 'y' : 'D');
      else if ((x % 12 === 6 || x % 12 === 7) && y >= 2 && y <= 19) row += 'c';
      else if ((x >= 9 && x <= 13 || x >= 34 && x <= 38) && y >= 3 && y <= 7) row += (x === 9 || x === 13 || x === 34 || x === 38 || y === 3 || y === 7) ? 'o' : 'b';
      else row += ((x + y * 3) % 7 === 0) ? 's' : 'S';
    }
    rows.push(row);
  }
  const pal = {
    P: '#3a2b5c', p: '#6446a8', d: 'rgba(0,0,0,0.25)', o: '#2b2340', S: '#a7a3bd', s: '#9591ad',
    c: '#cfcce0', b: '#8ee6ff', D: '#5c3b22', y: '#f2c14e',
  };
  const c = canvas(w * SCALE, STILE * 2);
  paint(c.getContext('2d'), rows, pal, 0, STILE * 2 - rows.length * SCALE);
  return c;
}

// ---- FX ----

export function bubbleSprite(kind) {
  const rows = {
    think: ['..oooooo..', '.owwwwwwo.', 'owwwwwwwwo', 'owwwwwwwwo', '.owwwwwwo.', '..oooooo..', '..........', '.oo.......', '.ow.......', '..........', 'o.........'],
    idea: ['..oooo..', '.oyyyyo.', 'oyyWWyyo', 'oyyWyyyo', 'oyyyyyyo', '.oyyyyo.', '..owwo..', '..owwo..', '...oo...', '........'],
    alert: ['.oooooo.', 'oyyyyyyo', 'oyyooyyo', 'oyyooyyo', 'oyyooyyo', 'oyyyyyyo', 'oyyooyyo', '.oooooo.', '...oo...', '....o...'],
    wait: ['.oooooo.', 'owwwwwwo', 'owooowwo', 'owwwowwo', 'owwowwwo', 'owwwwwwo', 'owwowwwo', '.oooooo.', '...oo...', '....o...'],
    ok: ['.oooooo.', 'oggggggo', 'oggggowo', 'oggggowo', 'owgowggo', 'oggwgggo', 'oggggggo', '.oooooo.', '...oo...', '....o...'],
    fail: ['.oooooo.', 'orrrrrro', 'orwrrwro', 'orrwwrro', 'orrwwrro', 'orwrrwro', 'orrrrrro', '.oooooo.', '...oo...', '....o...'],
    zzz: ['........', '.wwww...', '...w....', '..w.....', '.wwww...', '.....ww.', '......w.', '.....ww.', '........', '........'],
  }[kind];
  return render(rows, { o: '#1c1424', y: '#f2c14e', w: '#f4efe6', g: '#63d471', r: '#e5534b', W: '#fff6cc' }, 3);
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function potionSprite(color) {
  return render([
    '....oooo....', '....okko....', '....oWWo....', '...oWWWWo...', '..oWppppWo..', '.opppppppppo',
    '.oPPpppppppo', '.oPPPPppPPpo', '.oPPPPPPPPPo', '..oPPPPPPPo.', '...ooooooo..',
  ], { o: '#1c1424', k: '#8c5f36', W: 'rgba(255,255,255,0.55)', p: shade(color, 0.3), P: color }, 3);
}

// ---- BOSSES: one template, recoloured and dressed per kind ----

const BOSS_BASE = [
  '.......HH......HH.......',
  '......HHH......HHH......',
  '.....HHH........HHH.....',
  '......OOOOOOOOOOOO......',
  '....OOBBBBBBBBBBBBOO....',
  '...OBBLLBBBBBBBBBBBBO...',
  '..OBBLBBBBBBBBBBBBBBBO..',
  '..OBBBWWWWBBBBWWWWBBBO..',
  '.OBBBWWKKWWBBWWKKWWBBBO.',
  '.OBBBWWKKWWBBWWKKWWBBBO.',
  '.OBBBBWWWWBBBBWWWWBBBBO.',
  'OBBBBBBBBBBBBBBBBBBBBBBO',
  'OBBBBOOOOOOOOOOOOOOBBBBO',
  'OBBBBOTOTOTOTOTOTOTOBBBO',
  'OBBBBBOOOOOOOOOOOOOBBBBO',
  '.OBBBBBBBBBBBBBBBBBBBBO.',
  '.OBBDDBBBBBBBBBBBBDDBBO.',
  '..OBBDDBBBBBBBBBBDDBBO..',
  '...OOBBBOOOOOOOOBBBOO...',
  '....OBBBO......OBBBO....',
  '....OOOOO......OOOOO....',
];

const BOSS_COLORS = {
  hydra: { B: '#d64545', H: '#f2c14e' },
  golem: { B: '#7d7f93', H: '#4a4c5e' },
  wraith: { B: '#7b4bd6', H: '#c9a7ff' },
  specter: { B: '#dfe6f3', H: '#9aa3b5' },
  kraken: { B: '#1f9e95', H: '#f4a261' },
  beast: { B: '#4f9e3a', H: '#e5534b' },
};

export function bossSprites(kind) {
  const c = BOSS_COLORS[kind] || BOSS_COLORS.beast;
  const pal = { O: '#1b1010', B: c.B, L: shade(c.B, 0.35), D: shade(c.B, -0.3), H: c.H, W: '#f4efe6', K: '#e5534b', T: '#f4efe6' };
  const angry = BOSS_BASE.map((r, y) => (y === 8 || y === 9) ? r.replace(/KK/g, 'KW') : r);
  return [render(BOSS_BASE, pal), render(angry, pal), render(BOSS_BASE, { ...pal, B: '#ffffff', L: '#ffffff', D: '#dddddd' })];
}
