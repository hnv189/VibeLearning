// Night-market street scene: backdrop, props, characters and lighting on a fixed 1280x720 stage.

export const W = 1280;
export const H = 720;
// Must match FLOOR in server.js
export const FLOOR = { minX: 30, maxX: 1250, minY: 445, maxY: 700 };
export const ORDER_SPOT = { x: 640, y: 528 };
// Wall TV screen; the YouTube iframe is laid over exactly this rect
export const TV_SCREEN = { x: 496, y: 50, w: 288, h: 162 };
export const STOOLS = [
  { x: 296, y: 590, color: '#3f86e8' },
  { x: 424, y: 590, color: '#e8504f' },
  { x: 360, y: 648, color: '#e8504f' },
  { x: 856, y: 590, color: '#e8504f' },
  { x: 984, y: 590, color: '#3f86e8' },
  { x: 920, y: 648, color: '#3f86e8' },
  { x: 548, y: 530, color: '#3f86e8' },
  { x: 732, y: 530, color: '#e8504f' },
];

const TABLES = [{ x: 360, y: 580 }, { x: 920, y: 580 }];
const PLANTS = [{ x: 44, y: 446 }, { x: 452, y: 446 }, { x: 878, y: 446 }, { x: 1238, y: 448 }];
const STREET_Y = 410;
const SHOP_TOP = 300;
const CART_BLOCK = { left: 470, right: 830, bottom: 505 };

const BUILDINGS = [
  { x: -10, w: 205, top: 96, color: '#3a2e4f', shop: 'lit', awning: '#d94f4f' },
  { x: 195, w: 165, top: 150, color: '#2e3452', shop: 'shutter' },
  { x: 360, w: 140, top: 76, color: '#47304c', shop: 'lit', awning: '#3e8e7e' },
  { x: 500, w: 280, top: 30, color: '#2b2f47', shop: 'shutter' },
  { x: 780, w: 150, top: 64, color: '#3c3452', shop: 'shutter' },
  { x: 930, w: 180, top: 140, color: '#34304e', shop: 'lit', awning: '#6a7fdb' },
  { x: 1110, w: 180, top: 92, color: '#422f4a', shop: 'lit', awning: '#e0a23b' },
];

const NEON = [
  { text: 'KARAOKE', x: 278, y: 288, color: '#ff5fa8', size: 22 },
  { text: 'CAFÉ', x: 430, y: 288, color: '#ffd36b', size: 22 },
  { text: 'TRÀ SỮA', x: 1020, y: 288, color: '#62f2ff', size: 22 },
  { text: '24H', x: 1200, y: 288, color: '#8dff7a', size: 24, flicker: true },
];

const STRANDS = [
  { x1: 0, y1: 196, x2: 486, y2: 236, sag: 46 },
  { x1: 794, y1: 236, x2: 1280, y2: 192, sag: 46 },
  { x1: 0, y1: 128, x2: 490, y2: 200, sag: 50 },
  { x1: 790, y1: 200, x2: 1280, y2: 140, sag: 50 },
];
const BULB_COLORS = ['#ffd27a', '#ff9f6b', '#ff7aa8', '#9ff0c4', '#ffe9a8'];

const VENDOR = {
  x: 646,
  y: 400,
  facing: 1,
  seed: 1.3,
  vendor: true,
  look: { skin: '#e7b88a', shirt: '#f2f2f2', pants: '#3a3a48', hair: '#2a211c', style: 'nonla', apron: '#4b8f6e' },
};

const STATUS_ICON = { studying: '📖', afk: '💤' };

export function depthScale(y) {
  return 0.82 + (0.36 * (y - FLOOR.minY)) / (FLOOR.maxY - FLOOR.minY);
}

// ---------- small drawing helpers ----------

export const emojiFont = (px) => `${px}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;

export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function dot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

export function seg(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function glow(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

export function glowEll(ctx, x, y, rx, ry, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  glow(ctx, 0, 0, rx, color, alpha);
  ctx.restore();
}

function quad(p0, c, p1, u) {
  const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u;
  return { x: a * p0.x + b * c.x + d * p1.x, y: a * p0.y + b * c.y + d * p1.y };
}

function wrapText(ctx, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (let word of words) {
    while (ctx.measureText(word).width > maxW && word.length > 1) {
      let i = word.length - 1;
      while (i > 1 && ctx.measureText(word.slice(0, i)).width > maxW) i--;
      if (line) lines.push(line), (line = '');
      lines.push(word.slice(0, i));
      word = word.slice(i);
    }
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawBubble(ctx, x, bottom, text, alpha) {
  ctx.font = '700 13px Nunito, sans-serif';
  const lines = wrapText(ctx, text, 180).slice(0, 4);
  const lh = 17;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22;
  const h = lines.length * lh + 12;
  const bx = Math.max(6, Math.min(W - w - 6, x - w / 2));
  const by = bottom - h - 7;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fffaf0';
  rr(ctx, bx, by, w, h, 11);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 6, by + h - 1);
  ctx.lineTo(x + 6, by + h - 1);
  ctx.lineTo(x, by + h + 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2140';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + 11, by + 7 + i * lh));
  ctx.globalAlpha = 1;
}

// ---------- characters ----------

function drawHair(ctx, L, hy, f) {
  const dome = (r = 14.6) => {
    ctx.beginPath();
    ctx.arc(0, hy - 3, r, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  };
  const fringe = () => ell(ctx, -f * 3, hy - 10, 10, 4.5, f * 0.25);
  ctx.fillStyle = L.hair;
  switch (L.style) {
    case 'long':
      dome();
      rr(ctx, -15.5, hy - 4, 6, 21, 3);
      ctx.fill();
      rr(ctx, 9.5, hy - 4, 6, 21, 3);
      ctx.fill();
      fringe();
      break;
    case 'bun':
      dome();
      dot(ctx, 0, hy - 18, 6.5);
      fringe();
      break;
    case 'curly':
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        dot(ctx, Math.cos(a) * 12.5, hy - 3 + Math.sin(a) * 12.5, 5.5);
      }
      dome(13);
      break;
    case 'cap':
      fringe();
      ctx.fillStyle = shade(L.shirt, -0.3);
      dome(15.4);
      ell(ctx, f * 11, hy - 4, 11, 3.2);
      break;
    case 'nonla': {
      dome();
      ctx.fillStyle = '#ead08c';
      ctx.beginPath();
      ctx.moveTo(-28, hy - 5);
      ctx.quadraticCurveTo(0, hy, 28, hy - 5);
      ctx.lineTo(0, hy - 31);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,110,50,0.55)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const k = i / 4;
        seg(ctx, -28 * k, hy - 31 + 26 * k, 28 * k, hy - 31 + 26 * k);
      }
      break;
    }
    default:
      dome();
      fringe();
  }
}

function drawBook(ctx, y) {
  ctx.fillStyle = '#4f6fd0';
  rr(ctx, -12, y - 1, 24, 14, 2);
  ctx.fill();
  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(-11, y, 10.5, 12);
  ctx.fillRect(0.5, y, 10.5, 12);
  ctx.fillStyle = 'rgba(80,80,110,0.5)';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(-9, y + 3 + i * 3, 7, 1);
    ctx.fillRect(2, y + 3 + i * 3, 7, 1);
  }
}

// o: { x, y, look, facing, moving, phase, sitting, seed, status, holding, vendor }
// o.action = { kind, start } where start is in the same seconds as t; kinds: dance, wave, clap, jump, cheers, highfive, hug
export function drawPerson(ctx, o, s, t) {
  const L = o.look;
  const f = o.facing || 1;
  const act = o.action ? o.action.kind : null;
  const at = o.action ? t - o.action.start : 0;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(s, s);

  let hop = 0, sway = 0;
  if (act === 'jump') hop = Math.sin(Math.min(at / 0.9, 1) * Math.PI) * 22;
  else if (act === 'dance') {
    sway = Math.sin(at * 6) * (o.sitting ? 0.05 : 0.14);
    if (!o.sitting) hop = Math.abs(Math.sin(at * 6)) * 4;
  } else if (act === 'hug') sway = 0.12 * f;

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ell(ctx, 0, 0, (o.sitting ? 19 : 15) * (1 - hop / 60), 4.5 * (1 - hop / 60));
  ctx.translate(0, -hop);
  ctx.rotate(sway);

  const sw = o.moving ? Math.sin(o.phase) : 0;
  const bob = o.moving ? -Math.abs(Math.cos(o.phase)) * 2.4 : Math.sin(t * 1.7 + (o.seed || 0)) * 0.5;
  const hip = -25 + bob;
  ctx.lineCap = 'round';

  // legs
  let lf, rf;
  if (o.sitting) {
    lf = [-9, -5];
    rf = [9, -5];
  } else if (act === 'dance') {
    const ds = Math.sin(at * 6);
    lf = [-6, -2 - Math.max(0, ds) * 4];
    rf = [6, -2 - Math.max(0, -ds) * 4];
  } else if (act === 'jump') {
    lf = [-6, -5];
    rf = [6, -5];
  } else {
    lf = [-5 + sw * 2 * f, -2 - Math.max(0, sw) * 5];
    rf = [5 - sw * 2 * f, -2 - Math.max(0, -sw) * 5];
  }
  ctx.strokeStyle = L.pants;
  ctx.lineWidth = 7.5;
  seg(ctx, -5, hip, lf[0], lf[1]);
  seg(ctx, 5, hip, rf[0], rf[1]);
  ctx.fillStyle = '#2a2633';
  ell(ctx, lf[0] + f * 1.5, lf[1] + 1.5, 5, 3);
  ell(ctx, rf[0] + f * 1.5, rf[1] + 1.5, 5, 3);

  // torso
  const top = hip - 30;
  ctx.fillStyle = L.pants;
  rr(ctx, -11, hip - 6, 22, 9, 4);
  ctx.fill();
  ctx.fillStyle = L.shirt;
  rr(ctx, -12, top, 24, 28, 9);
  ctx.fill();
  if (o.vendor) {
    ctx.fillStyle = L.apron;
    rr(ctx, -9, top + 9, 18, 21, 4);
    ctx.fill();
  }

  // arms
  const sh = top + 6;
  const reading = o.status === 'studying' && !o.moving && !o.vendor && !act;
  let lh = [-15, sh + 18 + sw * 3];
  let rh = [15, sh + 18 - sw * 3];
  if (o.vendor) {
    const a = t * 3.2;
    rh = [17 + Math.cos(a) * 4, sh + 13 + Math.sin(a) * 3];
  } else if (act === 'dance') {
    const a = Math.sin(at * 6);
    lh = [-17, sh - 6 + a * 8];
    rh = [17, sh - 6 - a * 8];
  } else if (act === 'wave') {
    rh = [16 + Math.sin(at * 14) * 4, top - 10];
  } else if (act === 'clap') {
    const c = Math.abs(Math.sin(at * 10));
    lh = [-2 - c * 7, sh + 10];
    rh = [2 + c * 7, sh + 10];
  } else if (act === 'jump') {
    lh = [-18, sh - 8];
    rh = [18, sh - 8];
  } else if (act === 'cheers') {
    rh = [15, top - 10];
  } else if (act === 'highfive') {
    if (f > 0) rh = [18, top - 8];
    else lh = [-18, top - 8];
  } else if (act === 'hug') {
    lh = [-4 + f * 6, sh + 9];
    rh = [4 + f * 6, sh + 9];
  } else if (reading) {
    lh = [-7, sh + 15];
    rh = [7, sh + 15];
  } else if (o.holding) {
    rh = [14, sh + 11];
  }
  ctx.strokeStyle = shade(L.shirt, -0.12);
  ctx.lineWidth = 6.5;
  seg(ctx, -10, sh, lh[0], lh[1]);
  seg(ctx, 10, sh, rh[0], rh[1]);
  ctx.fillStyle = L.skin;
  dot(ctx, lh[0], lh[1], 3.4);
  dot(ctx, rh[0], rh[1], 3.4);
  if (reading) drawBook(ctx, sh + 6);
  if (o.vendor) {
    ctx.strokeStyle = '#9aa0ad';
    ctx.lineWidth = 2;
    seg(ctx, rh[0], rh[1], rh[0] + 9, rh[1] + 16);
  }
  const held = act === 'cheers' ? (o.holding ? o.holding.emoji : '🍺') : o.holding && !reading ? o.holding.emoji : null;
  if (held) {
    ctx.font = emojiFont(14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(held, rh[0] + 4, rh[1] - 7);
  }

  // head
  const hy = top - 13;
  const fx = f * 2.2;
  if (L.style === 'long') {
    ctx.fillStyle = L.hair;
    rr(ctx, -15, hy - 6, 30, 27, 10);
    ctx.fill();
  }
  ctx.fillStyle = L.skin;
  dot(ctx, 0, hy, 14);
  if (o.back) {
    // seen from behind: back of the head, hats still drawn, no face
    ctx.fillStyle = L.hair;
    dot(ctx, 0, hy, 14.4);
    if (L.style === 'nonla' || L.style === 'cap') drawHair(ctx, L, hy, f);
    ctx.restore();
    return;
  }
  drawHair(ctx, L, hy, f);

  const eyeY = hy + (reading ? 2.5 : 1.5);
  const closed = o.status === 'afk' || (t + (o.seed || 0) * 3.1) % 4.2 < 0.13;
  ctx.fillStyle = '#2b2230';
  if (closed) {
    ctx.fillRect(fx - 7, eyeY, 4, 1.5);
    ctx.fillRect(fx + 3, eyeY, 4, 1.5);
  } else {
    dot(ctx, fx - 5, eyeY, 1.9);
    dot(ctx, fx + 5, eyeY, 1.9);
  }
  ctx.fillStyle = 'rgba(255,110,120,0.35)';
  dot(ctx, fx - 8.5, hy + 6, 2.6);
  dot(ctx, fx + 8.5, hy + 6, 2.6);
  if (act && act !== 'wave') {
    // big open smile while dancing, cheering, hugging…
    ctx.fillStyle = '#7a3b3b';
    ctx.beginPath();
    ctx.arc(fx, hy + 4.5, 3.2, 0, Math.PI);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#7a3b3b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(fx, hy + 5, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

// ---------- props ----------

export function drawStool(ctx, x, y, color, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ell(ctx, 0, 0, 16, 4);
  ctx.fillStyle = shade(color, -0.2);
  ctx.beginPath();
  ctx.moveTo(-13, -22);
  ctx.lineTo(13, -22);
  ctx.lineTo(15, 0);
  ctx.lineTo(9, 0);
  ctx.lineTo(7, -13);
  ctx.lineTo(-7, -13);
  ctx.lineTo(-9, 0);
  ctx.lineTo(-15, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = color;
  ell(ctx, 0, -22, 14, 4.5);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ell(ctx, -4, -23, 6, 1.5);
  ctx.restore();
}

export function drawTable(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ell(ctx, 0, 0, 44, 6);
  ctx.fillStyle = '#a8703f';
  ctx.fillRect(-36, -30, 5, 30);
  ctx.fillRect(31, -30, 5, 30);
  ctx.fillStyle = '#d99a5b';
  rr(ctx, -44, -36, 88, 9, 3);
  ctx.fill();
  ctx.fillStyle = '#b97d45';
  ctx.fillRect(-44, -29, 88, 3);
  // bowl, chopsticks, tea glass, napkin box
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(-16, -37, 11, 8, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#c9803e';
  ell(ctx, -16, -37, 9, 2);
  ctx.strokeStyle = '#7a4a24';
  ctx.lineWidth = 1.5;
  seg(ctx, -22, -46, -10, -38);
  seg(ctx, -19, -47, -8, -38);
  ctx.fillStyle = 'rgba(230,170,80,0.85)';
  ctx.fillRect(14, -46, 7, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(14, -46, 2, 10);
  ctx.fillStyle = '#e05555';
  ctx.fillRect(28, -43, 10, 7);
  ctx.restore();
}

export function drawPlant(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ell(ctx, 0, 0, 14, 4);
  const leaves = ['#3f8f5a', '#57ab6b', '#2f7448'];
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = leaves[i % 3];
    const a = -Math.PI / 2 + (i - 3) * 0.38;
    ell(ctx, Math.cos(a) * 14, -24 + Math.sin(a) * 16, 6, 13, a + Math.PI / 2);
  }
  ctx.fillStyle = '#b9643f';
  ctx.beginPath();
  ctx.moveTo(-12, -22);
  ctx.lineTo(12, -22);
  ctx.lineTo(9, 0);
  ctx.lineTo(-9, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cf7a52';
  ctx.fillRect(-13, -24, 26, 5);
  ctx.restore();
}

function drawLamp(ctx) {
  const x = 120, base = 474;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ell(ctx, x, base, 18, 5);
  ctx.fillStyle = '#2f4a45';
  ctx.fillRect(x - 4, 206, 8, base - 206);
  ctx.fillRect(x - 9, base - 18, 18, 18);
  ctx.fillRect(x - 7, base - 24, 14, 6);
  ctx.strokeStyle = '#2f4a45';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, 214);
  ctx.quadraticCurveTo(x, 186, x + 34, 190);
  ctx.stroke();
  ctx.fillStyle = '#263b37';
  ctx.beginPath();
  ctx.moveTo(x + 22, 186);
  ctx.lineTo(x + 50, 186);
  ctx.lineTo(x + 56, 203);
  ctx.lineTo(x + 16, 203);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff1c4';
  ell(ctx, x + 36, 204, 17, 4);
  // flyers taped to the pole
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(x - 6, 330, 12, 18);
  ctx.fillStyle = '#f2a7b5';
  ctx.fillRect(x - 5, 352, 10, 14);
}

function drawScooter(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ell(ctx, 0, 0, 64, 7);
  for (const wx of [-40, 42]) {
    ctx.fillStyle = '#1e1c25';
    dot(ctx, wx, -14, 14);
    ctx.fillStyle = '#9b98a8';
    dot(ctx, wx, -14, 6);
  }
  ctx.fillStyle = '#7ec4b8';
  ctx.beginPath();
  ctx.moveTo(-60, -18);
  ctx.quadraticCurveTo(-62, -52, -20, -50);
  ctx.lineTo(8, -48);
  ctx.lineTo(20, -26);
  ctx.lineTo(38, -30);
  ctx.quadraticCurveTo(54, -32, 58, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5ea89c';
  ctx.fillRect(-18, -26, 42, 6);
  ctx.fillStyle = '#7ec4b8';
  ctx.beginPath();
  ctx.moveTo(28, -28);
  ctx.lineTo(42, -80);
  ctx.lineTo(52, -80);
  ctx.lineTo(44, -24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3b3946';
  ctx.fillRect(34, -88, 30, 5);
  ctx.fillStyle = '#fff3c0';
  dot(ctx, 58, -80, 6);
  ctx.fillStyle = '#3a2b2b';
  rr(ctx, -52, -61, 50, 11, 5);
  ctx.fill();
  ctx.fillStyle = '#e2483f';
  ctx.beginPath();
  ctx.arc(-16, -61, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-21, -67, 5, 3);
  ctx.restore();
}

// sleeping loaf of a cat; `awake` (after being petted) lifts the head, opens the eyes and swishes the tail
export function drawCat(ctx, x, y, t, awake = false, colors = { fur: '#e8963f', stripe: '#c97a2b', tail: '#d9853b' }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ell(ctx, 0, 0, 20, 4);
  ctx.strokeStyle = colors.tail;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const sway = Math.sin(t * (awake ? 6 : 1.5));
  ctx.beginPath();
  ctx.moveTo(-14, -5);
  if (awake) ctx.quadraticCurveTo(-24, -10, -22 + sway * 5, -26);
  else ctx.quadraticCurveTo(-27, -7 + sway * 4, -22 + sway * 3, -17);
  ctx.stroke();
  ctx.fillStyle = colors.fur;
  ell(ctx, 0, -8, 17, 9);
  ctx.strokeStyle = colors.stripe;
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(i * 6, -8, 6, Math.PI * 1.2, Math.PI * 1.6);
    ctx.stroke();
  }
  const hx = awake ? 15 : 14, hy = awake ? -18 : -11;
  ctx.fillStyle = colors.fur;
  dot(ctx, hx, hy, 7.5);
  ctx.beginPath();
  ctx.moveTo(hx - 6, hy - 4);
  ctx.lineTo(hx - 4, hy - 12);
  ctx.lineTo(hx, hy - 6);
  ctx.moveTo(hx + 1, hy - 6);
  ctx.lineTo(hx + 5, hy - 12);
  ctx.lineTo(hx + 7, hy - 3);
  ctx.fill();
  ctx.strokeStyle = '#5a3a20';
  ctx.lineWidth = 1.2;
  if (awake) {
    ctx.fillStyle = '#3a2a1a';
    dot(ctx, hx - 2.5, hy, 1.6);
    dot(ctx, hx + 3.5, hy, 1.6);
    ctx.fillStyle = '#e58a9a';
    dot(ctx, hx + 0.5, hy + 3, 1.2);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.arc(hx - 2.5, hy, 1.8, 0, Math.PI);
  ctx.moveTo(hx + 5.3, hy);
  ctx.arc(hx + 3.5, hy, 1.8, 0, Math.PI);
  ctx.stroke();
  const zt = (t % 3) / 3;
  ctx.globalAlpha = 1 - zt;
  ctx.fillStyle = '#d8d0ff';
  ctx.font = '800 11px Nunito, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('z', 22 + zt * 8, -22 - zt * 14);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawWheel(ctx, x, y, r) {
  ctx.fillStyle = '#26232e';
  dot(ctx, x, y, r);
  ctx.fillStyle = '#8a8796';
  dot(ctx, x, y, r * 0.58);
  ctx.strokeStyle = '#26232e';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    seg(ctx, x, y, x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58);
  }
  ctx.fillStyle = '#d9d6e0';
  dot(ctx, x, y, 3);
}

function drawAwning(ctx, x, y, w, h) {
  const n = 10, sw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? '#fff1dc' : '#e2483f';
    ctx.fillRect(x + i * sw, y, sw + 0.5, h);
    ctx.beginPath();
    ctx.arc(x + i * sw + sw / 2, y + h, sw / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x, y, w, 6);
  ctx.fillStyle = '#a8322b';
  ctx.fillRect(x - 4, y - 6, w + 8, 7);
}

function drawCart(ctx, t) {
  const L = 486, R = 794;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ell(ctx, 640, 486, 190, 14);
  // back poles
  ctx.fillStyle = '#5a4636';
  ctx.fillRect(L + 4, 236, 7, 150);
  ctx.fillRect(R - 11, 236, 7, 150);

  drawPerson(ctx, VENDOR, 1.08, t);

  // counter
  ctx.fillStyle = '#c98a52';
  ctx.fillRect(L - 8, 372, R - L + 16, 12);
  ctx.fillStyle = '#a86d3d';
  ctx.fillRect(L - 8, 382, R - L + 16, 4);

  // body
  const body = ctx.createLinearGradient(0, 386, 0, 456);
  body.addColorStop(0, '#36b3a0');
  body.addColorStop(1, '#23897c');
  ctx.fillStyle = body;
  rr(ctx, L, 386, R - L, 70, 6);
  ctx.fill();
  ctx.strokeStyle = '#f6e7c8';
  ctx.lineWidth = 3;
  rr(ctx, L + 10, 394, R - L - 20, 54, 5);
  ctx.stroke();
  ctx.fillStyle = '#fff4dc';
  ctx.font = '900 26px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MÌ ĐÊM', 640, 414);
  ctx.font = '700 12px Nunito, sans-serif';
  ctx.fillStyle = '#ffe6a8';
  ctx.fillText('night noodles · since 1998', 640, 436);
  ctx.font = emojiFont(18);
  ctx.fillText('🍜', 530, 421);
  ctx.fillText('🥢', 750, 421);
  ctx.fillStyle = '#1d6d63';
  ctx.fillRect(L + 6, 456, R - L - 12, 6);

  drawWheel(ctx, 540, 462, 22);
  drawWheel(ctx, 740, 462, 22);

  // push handle
  ctx.strokeStyle = '#3b3b45';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(R, 402);
  ctx.lineTo(R + 34, 394);
  ctx.lineTo(R + 34, 384);
  ctx.stroke();

  // glass case with bread & herbs
  ctx.fillStyle = 'rgba(190,230,255,0.2)';
  ctx.fillRect(500, 316, 104, 56);
  ctx.fillStyle = '#e6a75b';
  for (let i = 0; i < 3; i++) ell(ctx, 526 + i * 26, 361, 12, 5, -0.2);
  ctx.fillStyle = '#5fbf6a';
  dot(ctx, 518, 341, 6);
  dot(ctx, 529, 337, 5);
  dot(ctx, 586, 342, 6);
  ctx.fillStyle = '#e85a4f';
  dot(ctx, 560, 344, 4);
  dot(ctx, 568, 346, 4);
  ctx.strokeStyle = 'rgba(230,245,255,0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(500, 316, 104, 56);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(506, 320, 6, 48);

  // charcoal grill with skewers
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(612, 360, 64, 12);
  ctx.fillStyle = `rgb(255,${(120 + Math.sin(t * 6) * 30) | 0},40)`;
  ctx.fillRect(616, 366, 56, 3);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = '#d9c39a';
    ctx.lineWidth = 1.5;
    seg(ctx, 618 + i * 14, 352, 630 + i * 14, 362);
    ctx.fillStyle = '#9c4b2b';
    dot(ctx, 622 + i * 14, 355, 3);
    dot(ctx, 626 + i * 14, 358.5, 3);
  }

  // broth pot
  ctx.fillStyle = '#b9bec9';
  rr(ctx, 686, 326, 74, 46, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(740, 330, 14, 40);
  ctx.fillStyle = '#d7dbe3';
  ell(ctx, 723, 326, 38, 7);
  ctx.fillStyle = '#8a5a36';
  ell(ctx, 723, 326, 32, 5);

  drawAwning(ctx, 470, 232, 340, 34);

  // hanging menu board
  ctx.strokeStyle = '#3a3036';
  ctx.lineWidth = 1;
  seg(ctx, R - 52, 266, R - 48, 280);
  seg(ctx, R - 18, 266, R - 22, 280);
  ctx.fillStyle = '#2a2a32';
  rr(ctx, R - 62, 280, 52, 34, 3);
  ctx.fill();
  ctx.fillStyle = '#f2ecdf';
  ctx.font = '700 8px Nunito, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('phở ........ 35k', R - 58, 289);
  ctx.fillText('bánh mì ... 20k', R - 58, 299);
  ctx.fillText('trà sữa .... 25k', R - 58, 309);

  // red paper lantern
  ctx.save();
  ctx.translate(640, 266);
  ctx.rotate(Math.sin(t * 1.3) * 0.06);
  ctx.strokeStyle = '#3a3036';
  seg(ctx, 0, 0, 0, 6);
  ctx.fillStyle = '#e6463c';
  ell(ctx, 0, 21, 13, 15);
  ctx.strokeStyle = 'rgba(120,20,20,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 21, 6, 15, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-6, 5, 12, 3);
  ctx.fillRect(-6, 35, 12, 3);
  ctx.strokeStyle = '#f2c14e';
  seg(ctx, 0, 38, 0, 48);
  ctx.restore();

  // bare bulb
  ctx.strokeStyle = '#3a3036';
  seg(ctx, 560, 266, 560, 280);
  ctx.fillStyle = '#fff3c8';
  dot(ctx, 560, 284, 5);
}

// ---------- prerendered layers ----------

function buildSky() {
  const c = mk(W, H), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 420);
  grad.addColorStop(0, '#070b22');
  grad.addColorStop(0.55, '#1c1840');
  grad.addColorStop(1, '#4b2c5e');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, 420);
  const mx = 1010, my = 62;
  const halo = g.createRadialGradient(mx, my, 10, mx, my, 130);
  halo.addColorStop(0, 'rgba(255,240,200,0.35)');
  halo.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = halo;
  g.fillRect(mx - 130, my - 130, 260, 260);
  g.fillStyle = '#fff4d6';
  dot(g, mx, my, 24);
  g.fillStyle = 'rgba(220,200,160,0.5)';
  dot(g, mx - 7, my - 4, 5);
  dot(g, mx + 8, my + 6, 3.5);
  dot(g, mx + 2, my - 11, 2.5);
  return c;
}

function drawWindow(g, x, y, w, h, rnd) {
  const lit = rnd() < 0.5;
  const r = rnd();
  g.fillStyle = '#1c1a2a';
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  if (lit) {
    const col = r < 0.12 ? '#8fc7ff' : r < 0.55 ? '#ffd27f' : '#ffbf69';
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, col);
    gr.addColorStop(1, shade(col, -0.3));
    g.fillStyle = gr;
  } else g.fillStyle = '#25223a';
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(x + w / 2 - 1, y, 2, h);
  if (lit && rnd() < 0.4) {
    g.fillStyle = rnd() < 0.5 ? 'rgba(200,80,90,0.55)' : 'rgba(90,140,110,0.55)';
    g.fillRect(x, y, w * 0.3, h);
  }
  const extra = rnd();
  if (extra < 0.18) {
    // air conditioner
    g.fillStyle = '#9aa0ad';
    g.fillRect(x + w - 4, y + h + 4, 18, 11);
    g.fillStyle = '#6d7380';
    g.fillRect(x + w - 1, y + h + 7, 12, 1.5);
    g.fillRect(x + w - 1, y + h + 10, 12, 1.5);
  } else if (extra < 0.36) {
    // balcony rail with plants
    g.fillStyle = '#3f8f5a';
    dot(g, x + 3, y + h - 9, 5);
    dot(g, x + w - 4, y + h - 8, 4);
    g.strokeStyle = '#151320';
    g.lineWidth = 2;
    g.strokeRect(x - 5, y + h - 6, w + 10, 10);
    for (let i = x - 1; i < x + w + 5; i += 5) seg(g, i, y + h - 6, i, y + h + 4);
  }
}

function drawShop(g, b, rnd) {
  const x = Math.max(b.x, 0) + 12;
  const w = Math.min(b.x + b.w, W) - 12 - x;
  const y = SHOP_TOP + 22, h = STREET_Y - y;
  g.fillStyle = shade(b.color, -0.35);
  g.fillRect(b.x, SHOP_TOP + 14, b.w, 8);
  if (b.shop === 'shutter') {
    g.fillStyle = '#5b5d6c';
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,0.22)';
    for (let yy = y + 4; yy < y + h; yy += 6) g.fillRect(x, yy, w, 2);
    g.fillStyle = '#3d3f4c';
    g.fillRect(x + w / 2 - 10, y + h - 8, 20, 3);
    const posters = ['rgba(240,200,120,0.6)', 'rgba(240,140,160,0.55)', 'rgba(150,200,240,0.55)'];
    for (let i = 0; i < 3; i++) {
      g.fillStyle = posters[i];
      g.fillRect(x + 10 + rnd() * (w - 34), y + 10 + rnd() * (h - 40), 14 + rnd() * 8, 18 + rnd() * 6);
    }
    return;
  }
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#ffd99a');
  gr.addColorStop(1, '#e8955a');
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  for (let sy = y + 20; sy < y + h - 10; sy += 22) {
    g.fillStyle = 'rgba(120,70,40,0.6)';
    g.fillRect(x + 6, sy, w - 12, 3);
    for (let gx = x + 10; gx < x + w - 14; gx += 9 + rnd() * 6) {
      g.fillStyle = `hsl(${(rnd() * 360) | 0},55%,${(45 + rnd() * 20) | 0}%)`;
      const hh = 6 + rnd() * 9;
      g.fillRect(gx, sy - hh, 6, hh);
    }
  }
  g.fillStyle = 'rgba(40,30,40,0.85)';
  g.fillRect(x, y, w, 3);
  g.fillRect(x, y, 3, h);
  g.fillRect(x + w - 3, y, 3, h);
  g.fillRect(x + w * 0.62, y, 4, h);
  const ax = x - 8, aw = w + 16, ay = SHOP_TOP + 4, ah = 20;
  const n = Math.max(4, Math.round(aw / 22)), sw = aw / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? '#f3e6d0' : b.awning;
    g.fillRect(ax + i * sw, ay, sw + 0.5, ah);
    g.beginPath();
    g.arc(ax + i * sw + sw / 2, ay + ah, sw / 2, 0, Math.PI);
    g.fill();
  }
}

function buildCity() {
  const c = mk(W, H), g = c.getContext('2d'), rnd = mulberry32(42);

  // distant skyline
  for (let x = -20; x < W; ) {
    const w = 50 + rnd() * 80, h = 180 + rnd() * 150;
    g.fillStyle = '#1b1a33';
    g.fillRect(x, STREET_Y - h - 60, w, h + 60);
    g.fillStyle = 'rgba(255,214,140,0.25)';
    for (let i = 0; i < 6; i++) if (rnd() < 0.5) g.fillRect(x + 6 + rnd() * (w - 12), STREET_Y - h - 50 + rnd() * h, 3, 4);
    x += w + 4;
  }

  for (const b of BUILDINGS) {
    g.fillStyle = b.color;
    g.fillRect(b.x, b.top, b.w, STREET_Y - b.top);
    g.fillStyle = shade(b.color, -0.3);
    g.fillRect(b.x - 4, b.top - 6, b.w + 8, 8);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(b.x + b.w - 8, b.top, 8, STREET_Y - b.top);
    const cols = Math.max(2, Math.floor((b.w - 20) / 42));
    const gap = (b.w - cols * 26) / (cols + 1);
    for (let wy = b.top + 22; wy < SHOP_TOP - 44; wy += 54) {
      for (let i = 0; i < cols; i++) drawWindow(g, b.x + gap + i * (26 + gap), wy, 26, 32, rnd);
    }
    drawShop(g, b, rnd);
  }

  // power lines
  g.strokeStyle = 'rgba(10,8,18,0.85)';
  g.lineWidth = 1.5;
  const wires = [[0, 46, 1280, 70, 40], [0, 58, 1280, 84, 52], [0, 30, 1280, 52, 30], [360, 80, 780, 70, 34], [300, 110, 520, 96, 22]];
  for (const [x1, y1, x2, y2, sag] of wires) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + sag, x2, y2);
    g.stroke();
  }

  // sidewalk
  const sg = g.createLinearGradient(0, STREET_Y, 0, H);
  sg.addColorStop(0, '#2e2a3d');
  sg.addColorStop(0.15, '#433d55');
  sg.addColorStop(1, '#58506b');
  g.fillStyle = sg;
  g.fillRect(0, STREET_Y, W, H - STREET_Y);
  g.strokeStyle = 'rgba(0,0,0,0.16)';
  g.lineWidth = 1;
  for (let k = 0, y = STREET_Y + 8; y < H; k++) {
    seg(g, 0, y, W, y);
    y += 10 + k * 5;
  }
  const vx = 640, vy = -500;
  for (let bx = -3000; bx <= 4280; bx += 110) {
    const tt = (STREET_Y - H) / (vy - H);
    seg(g, bx + (vx - bx) * tt, STREET_Y, bx, H);
  }
  const shadow = g.createLinearGradient(0, STREET_Y, 0, STREET_Y + 40);
  shadow.addColorStop(0, 'rgba(0,0,0,0.45)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = shadow;
  g.fillRect(0, STREET_Y, W, 40);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = 'rgba(0,0,0,0.08)';
    ell(g, rnd() * W, STREET_Y + 40 + rnd() * 260, 20 + rnd() * 40, 5 + rnd() * 8);
  }
  g.fillStyle = '#2b2838';
  g.fillRect(0, H - 12, W, 12);
  g.fillStyle = '#6b6380';
  g.fillRect(0, H - 14, W, 3);
  return c;
}

function buildVignette() {
  const c = mk(W, H), g = c.getContext('2d');
  const r = g.createRadialGradient(W / 2, H * 0.55, 260, W / 2, H * 0.55, 820);
  r.addColorStop(0, 'rgba(5,3,15,0)');
  r.addColorStop(1, 'rgba(5,3,15,0.6)');
  g.fillStyle = r;
  g.fillRect(0, 0, W, H);
  return c;
}

function newDrop(anywhere) {
  return {
    x: Math.random() * (W + 200),
    y: anywhere ? Math.random() * H : -20 - Math.random() * 100,
    len: 12 + Math.random() * 14,
    v: 650 + Math.random() * 350,
    floor: FLOOR.minY - 30 + Math.random() * (H - FLOOR.minY + 30),
  };
}

// ---------- shared scene parts ----------

// The YouTube TV: bezel, idle card (or black under the iframe), now-playing title and power LED.
export function drawScreen(ctx, t, s, tv, idle) {
  const { x, y, w, h } = s;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, x - 4, y - 2, w + 18, h + 22, 8);
  ctx.fill();
  ctx.fillStyle = '#16141d';
  rr(ctx, x - 8, y - 8, w + 16, h + 20, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x - 6, y - 7, w + 12, 1.5);

  if (tv.on) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, idle.bg[0]);
    g.addColorStop(1, idle.bg[1]);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let sy = y + ((t * 20) % 4); sy < y + h; sy += 4) ctx.fillRect(x, sy, w, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 1.5);
    ctx.font = '900 28px Nunito, sans-serif';
    ctx.fillStyle = idle.color;
    ctx.fillText(idle.title, x + w / 2, y + h / 2 - 14);
    ctx.globalAlpha = 1;
    ctx.font = '700 11px Nunito, sans-serif';
    ctx.fillStyle = idle.sub;
    ctx.fillText('Host: paste a YouTube link in 🎵 Vibe', x + w / 2, y + h / 2 + 18);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w * 0.45, y);
  ctx.lineTo(x + w * 0.25, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = tv.on ? '#ff4d4d' : '#4a4658';
  dot(ctx, x + w - 2, y + h + 6, 2);
  if (tv.on && tv.title) {
    ctx.font = '700 9px Nunito, sans-serif';
    ctx.fillStyle = '#c9c3d9';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let title = '▶ ' + tv.title;
    while (title.length > 4 && ctx.measureText(title).width > w - 16) title = title.slice(0, -2);
    if (title !== '▶ ' + tv.title) title += '…';
    ctx.fillText(title, x, y + h + 6);
  }
}

// What every room scene provides to main.js: seats, the vendor, the TV, walk limits, rain, name tags, bubbles.
export class BaseScene {
  constructor() {
    this.seats = [];
    this.blocks = []; // { left, right, bottom }: no walking above `bottom` between left and right
    this.tvRect = null;
    this.vendorHit = { x: 0, y: 0, w: 0, h: 0 };
    this.orderSpot = { x: 640, y: 528 };
    this.vendorBubbleAt = { x: 640, y: 320 };
    this.vendorBubble = null;
    this.menuTitle = 'What’ll it be?';
    this.hint = 'Click to walk · click a seat to sit · click the vendor to order · WASD / arrows work too';
    this.rain = Array.from({ length: 260 }, () => newDrop(true));
    this.splashes = [];
    this.rainAmount = 0;
    this.pets = []; // { id, kind: 'cat' | 'dog', x, y, awakeUntil }
    this.fx = []; // floating emoji: hearts, high-fives, clinking glasses…
  }

  greeting(name) {
    return `Welcome, ${name}!`;
  }

  addFx(emoji, x, y, now, { dur = 1800, size = 24, rise = 40, delay = 0 } = {}) {
    this.fx.push({ emoji, x, y, start: now + delay, dur, size, rise });
  }

  petAt(x, y) {
    return this.pets.find((p) => Math.abs(x - p.x) < 30 && y > p.y - 34 && y < p.y + 8);
  }

  // where you stand to pet it
  petSpot(pet) {
    return this.clamp(pet.x - 34, pet.y + 10);
  }

  petAwake(id, now) {
    const p = this.pets.find((q) => q.id === id);
    return !!p && now < (p.awakeUntil || 0);
  }

  petReact(id, now) {
    const p = this.pets.find((q) => q.id === id);
    if (!p) return null;
    p.awakeUntil = now + 4500;
    for (let i = 0; i < 3; i++) this.addFx('❤️', p.x + (i - 1) * 12, p.y - 30, now, { delay: i * 250, dur: 1600, size: 14, rise: 30 });
    return p;
  }

  clamp(x, y) {
    x = Math.max(FLOOR.minX, Math.min(FLOOR.maxX, x));
    y = Math.max(FLOOR.minY, Math.min(FLOOR.maxY, y));
    for (const b of this.blocks) if (x > b.left && x < b.right && y < b.bottom) y = b.bottom;
    return { x, y };
  }

  seatAt(x, y) {
    return this.seats.find((s) => Math.hypot(s.x - x, s.y - 12 - y) < 26);
  }

  hitsVendor(x, y) {
    const r = this.vendorHit;
    return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  }

  hitsTV(x, y) {
    const s = this.tvRect;
    return !!s && x > s.x - 8 && x < s.x + s.w + 8 && y > s.y - 8 && y < s.y + s.h + 12;
  }

  vendorSay(text, now) {
    this.vendorBubble = { text, until: now + 3800 };
  }

  update(dt, raining) {
    this.rainAmount += ((raining ? 1 : 0) - this.rainAmount) * Math.min(1, dt * 0.7);
    if (this.rainAmount > 0.01) {
      for (const d of this.rain) {
        d.y += d.v * dt;
        d.x -= d.v * 0.12 * dt;
        if (d.y > d.floor) {
          if (this.splashes.length < 120 && Math.random() < 0.5) this.splashes.push({ x: d.x, y: d.floor, life: 0 });
          Object.assign(d, newDrop(false));
        }
      }
    }
    for (const s of this.splashes) s.life += dt;
    this.splashes = this.splashes.filter((s) => s.life < 0.35);
  }

  drawRain(ctx) {
    const a = this.rainAmount;
    ctx.fillStyle = `rgba(30,45,90,${0.18 * a})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(190,210,255,${0.38 * a})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const n = Math.floor(this.rain.length * a);
    for (let i = 0; i < n; i++) {
      const d = this.rain[i];
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.len * 0.12, d.y - d.len);
    }
    ctx.stroke();
    ctx.strokeStyle = `rgba(200,220,255,${0.5 * a})`;
    ctx.lineWidth = 1;
    for (const s of this.splashes) {
      const k = s.life / 0.35;
      ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 2 + k * 8, 0.8 + k * 2.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawLabels(ctx, now, people, opts) {
    const sorted = [...people].sort((a, b) => a.y - b.y);
    for (const p of sorted) {
      const s = depthScale(p.y);
      const tagY = p.y - 92 * s - 8;
      const isHost = p.id === opts.hostId;
      const isSelf = p.id === opts.selfId;
      const icon = STATUS_ICON[p.status];
      ctx.font = '800 12px Nunito, sans-serif';
      const tw = ctx.measureText(p.name).width;
      const w = tw + 18 + (isHost ? 17 : 0) + (icon ? 17 : 0);
      ctx.fillStyle = isSelf ? 'rgba(255,196,92,0.95)' : 'rgba(18,14,34,0.72)';
      rr(ctx, p.x - w / 2, tagY - 10, w, 20, 10);
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let cx = p.x - w / 2 + 9;
      if (isHost) {
        ctx.font = emojiFont(12);
        ctx.fillText('👑', cx, tagY + 1);
        cx += 17;
      }
      ctx.font = '800 12px Nunito, sans-serif';
      ctx.fillStyle = isSelf ? '#2a1a08' : '#fff';
      ctx.fillText(p.name, cx, tagY + 1);
      cx += tw + 4;
      if (icon) {
        ctx.font = emojiFont(12);
        ctx.fillText(icon, cx, tagY + 1);
      }

      if (p.bubble && now < p.bubble.until) {
        drawBubble(ctx, p.x, tagY - 12, p.bubble.text, Math.min(1, (p.bubble.until - now) / 400));
      }
      if (p.emote) {
        const age = (now - p.emote.start) / 2200;
        if (age < 1) {
          ctx.globalAlpha = 1 - age * age;
          ctx.font = emojiFont(28);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.emote.e, p.x + Math.sin(age * 9) * 4, tagY - 30 - age * 36);
          ctx.globalAlpha = 1;
        }
      }
      if (p.action && p.action.kind === 'dance') {
        // music notes drifting up from dancers
        const k = ((now / 1000 + (p.seed || 0)) % 1.6) / 1.6;
        ctx.globalAlpha = 1 - k;
        ctx.font = emojiFont(14);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(k < 0.5 ? '🎵' : '🎶', p.x + 20 * s + Math.sin(k * 6) * 4, tagY - 4 - k * 26);
        ctx.globalAlpha = 1;
      }
    }
    this.fx = this.fx.filter((f) => now - f.start < f.dur);
    for (const f of this.fx) {
      const k = (now - f.start) / f.dur;
      if (k < 0) continue;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = emojiFont(f.size * (k < 0.15 ? 0.6 + k * 2.7 : 1));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.emoji, f.x, f.y - k * f.rise);
      ctx.globalAlpha = 1;
    }
    const vb = this.vendorBubble;
    if (vb && now < vb.until) drawBubble(ctx, this.vendorBubbleAt.x, this.vendorBubbleAt.y, vb.text, Math.min(1, (vb.until - now) / 400));
  }
}

// ---------- night market ----------

export class NightMarketScene extends BaseScene {
  constructor() {
    super();
    this.seats = STOOLS;
    this.blocks = [CART_BLOCK];
    this.tvRect = TV_SCREEN;
    this.vendorHit = { x: 480, y: 225, w: 350, h: 275 };
    this.orderSpot = ORDER_SPOT;
    this.vendorBubbleAt = { x: 600, y: 318 };
    this.pets = [{ id: 'cat', kind: 'cat', x: 818, y: 500 }];
    this.menuTitle = 'What’ll it be? 🍜';
    this.hint = 'Click to walk · click a stool to sit · click the cart to order · WASD / arrows work too';
    this.sky = buildSky();
    this.city = buildCity();
    this.vignette = buildVignette();
    this.stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * W,
      y: Math.random() * 240,
      r: Math.random() * 1.3 + 0.4,
      p: Math.random() * 6.28,
      s: 0.5 + Math.random() * 2,
    }));
    this.bulbs = [];
    this.strands = STRANDS.map((s, si) => {
      const p0 = { x: s.x1, y: s.y1 }, p1 = { x: s.x2, y: s.y2 };
      const c = { x: (s.x1 + s.x2) / 2, y: Math.max(s.y1, s.y2) + s.sag };
      const n = Math.round(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / 40);
      for (let i = 1; i < n; i++) {
        this.bulbs.push({ ...quad(p0, c, p1, i / n), color: BULB_COLORS[(i + si) % BULB_COLORS.length], phase: Math.random() * 6.28 });
      }
      return { p0, c, p1 };
    });
    this.steam = [];
    this.steamAcc = 0;
    this.smokeAcc = 0;
    this.moths = Array.from({ length: 5 }, () => ({ a: Math.random() * 6.28, s: 1.5 + Math.random() * 2, r: 10 + Math.random() * 18 }));
    this.neonOn = NEON.map(() => true);
  }

  greeting(name) {
    return `Welcome, ${name}! Sit anywhere 🙂`;
  }

  update(dt, raining) {
    super.update(dt, raining);
    this.steamAcc += dt * 12;
    while (this.steamAcc >= 1) {
      this.steamAcc -= 1;
      this.steam.push({ x: 708 + Math.random() * 30, y: 324, vx: (Math.random() - 0.5) * 10, vy: -18 - Math.random() * 14, r: 5 + Math.random() * 5, life: 0, max: 2 + Math.random() * 1.4, a: 0.16 });
    }
    this.smokeAcc += dt * 5;
    while (this.smokeAcc >= 1) {
      this.smokeAcc -= 1;
      this.steam.push({ x: 622 + Math.random() * 48, y: 356, vx: (Math.random() - 0.5) * 8, vy: -14 - Math.random() * 10, r: 4 + Math.random() * 4, life: 0, max: 1.8 + Math.random(), a: 0.09 });
    }
    for (const p of this.steam) {
      p.life += dt;
      p.x += (p.vx + Math.sin(p.life * 2 + p.y * 0.05) * 8) * dt;
      p.y += p.vy * dt;
      p.r += dt * 8;
    }
    this.steam = this.steam.filter((p) => p.life < p.max);
    for (const m of this.moths) m.a += m.s * dt;
  }

  draw(ctx, now, people, opts = {}) {
    const t = now / 1000;
    ctx.drawImage(this.sky, 0, 0);
    this.drawStars(ctx, t);
    ctx.drawImage(this.city, 0, 0);
    this.drawNeon(ctx, t);
    const tv = opts.tv || {};
    this.drawTV(ctx, t, tv);

    const items = [
      { y: 474, d: () => drawLamp(ctx) },
      { y: 486, d: () => drawCart(ctx, t) },
      { y: 500, d: () => drawCat(ctx, 818, 500, t, this.petAwake('cat', now)) },
      { y: 562, d: () => drawScooter(ctx, 1170, 562, depthScale(562)) },
    ];
    for (const p of PLANTS) items.push({ y: p.y, d: () => drawPlant(ctx, p.x, p.y) });
    for (const tb of TABLES) items.push({ y: tb.y, d: () => drawTable(ctx, tb.x, tb.y, depthScale(tb.y)) });
    for (const st of STOOLS) items.push({ y: st.y - 0.01, d: () => drawStool(ctx, st.x, st.y, st.color, depthScale(st.y)) });
    for (const p of people) items.push({ y: p.y, d: () => drawPerson(ctx, p, depthScale(p.y), t) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();

    this.drawSteam(ctx);
    this.drawStringLights(ctx, t);
    this.drawGlows(ctx, t, tv.on);
    this.drawMoths(ctx, t);
    if (this.rainAmount > 0.01) this.drawRain(ctx);
    ctx.drawImage(this.vignette, 0, 0);
    this.drawLabels(ctx, now, people, opts);
  }

  drawStars(ctx, t) {
    ctx.fillStyle = '#fff';
    for (const s of this.stars) {
      ctx.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
  }

  drawNeon(ctx, t) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    NEON.forEach((n, i) => {
      let on = true;
      if (n.flicker) on = Math.sin(t * 17) + Math.sin(t * 5.3) + Math.sin(t * 0.7) * 1.2 < 2.2;
      this.neonOn[i] = on;
      ctx.font = `900 ${n.size}px Nunito, sans-serif`;
      if (!on) {
        ctx.fillStyle = 'rgba(80,70,90,0.9)';
        ctx.fillText(n.text, n.x, n.y);
        return;
      }
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
      ctx.shadowBlur = 6;
      ctx.fillText(n.text, n.x, n.y);
      ctx.shadowBlur = 0;
    });
  }

  drawTV(ctx, t, tv) {
    const { x, y, w, h } = TV_SCREEN;
    // wall brackets
    ctx.fillStyle = '#121019';
    ctx.fillRect(x + 40, y + h + 4, 10, 16);
    ctx.fillRect(x + w - 50, y + h + 4, 10, 16);
    drawScreen(ctx, t, TV_SCREEN, tv, { title: 'MÌ ĐÊM TV', color: '#ffb454', sub: '#9fb0d8', bg: ['#1d2b52', '#0d1328'] });
  }

  drawSteam(ctx) {
    for (const p of this.steam) {
      const k = p.life / p.max;
      ctx.fillStyle = `rgba(255,250,240,${p.a * (1 - k) * Math.min(1, p.life * 4)})`;
      dot(ctx, p.x, p.y, p.r);
    }
  }

  drawStringLights(ctx, t) {
    ctx.strokeStyle = 'rgba(20,16,26,0.9)';
    ctx.lineWidth = 1.5;
    for (const s of this.strands) {
      ctx.beginPath();
      ctx.moveTo(s.p0.x, s.p0.y);
      ctx.quadraticCurveTo(s.c.x, s.c.y, s.p1.x, s.p1.y);
      ctx.stroke();
    }
    for (const b of this.bulbs) {
      const tw = 0.75 + 0.25 * Math.sin(t * 2 + b.phase);
      ctx.fillStyle = '#222';
      ctx.fillRect(b.x - 1.5, b.y, 3, 4);
      ctx.globalAlpha = 0.6 + 0.4 * tw;
      ctx.fillStyle = b.color;
      ell(ctx, b.x, b.y + 8, 3.6, 4.8);
      ctx.globalAlpha = 1;
    }
  }

  drawGlows(ctx, t, tvOn) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (tvOn) {
      // flickering screen light on the wall and the awning below
      const s = TV_SCREEN;
      const flick = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 2.3);
      glow(ctx, s.x + s.w / 2, s.y + s.h / 2, 280, 'rgba(120,160,255,0.16)', flick);
      glowEll(ctx, s.x + s.w / 2, 250, 200, 40, 'rgba(140,170,255,0.18)', flick);
    }
    // street lamp
    glow(ctx, 156, 210, 170, 'rgba(255,196,120,0.32)');
    glowEll(ctx, 170, 488, 190, 48, 'rgba(255,190,110,0.22)');
    // cart: under-awning light, ground pool, lantern, bulb, coals
    glow(ctx, 640, 300, 240, 'rgba(255,170,90,0.22)');
    glowEll(ctx, 640, 520, 300, 80, 'rgba(255,170,90,0.16)');
    glow(ctx, 640, 287, 70, 'rgba(255,80,60,0.38)');
    glow(ctx, 560, 284, 50, 'rgba(255,225,160,0.55)');
    glow(ctx, 644, 366, 42, 'rgba(255,120,40,1)', 0.3 + 0.1 * Math.sin(t * 7));
    // lit shopfronts spill onto the pavement
    for (const b of BUILDINGS) {
      if (b.shop === 'lit') glowEll(ctx, b.x + b.w / 2, STREET_Y + 12, b.w * 0.55, 34, 'rgba(255,190,120,0.16)');
    }
    NEON.forEach((n, i) => {
      if (this.neonOn[i]) glow(ctx, n.x, n.y - 8, 80, n.color, 0.14);
    });
    for (const b of this.bulbs) glow(ctx, b.x, b.y + 8, 18, b.color, 0.35 + 0.15 * Math.sin(t * 2 + b.phase));
    ctx.restore();
  }

  drawMoths(ctx, t) {
    ctx.fillStyle = 'rgba(255,240,210,0.85)';
    for (const m of this.moths) {
      const x = 156 + Math.cos(m.a) * m.r + Math.sin(t * 7 + m.r) * 3;
      const y = 216 + Math.sin(m.a * 1.3) * m.r * 0.6;
      ctx.fillRect(x, y, 2, 2);
    }
  }
}
