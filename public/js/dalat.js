// Chợ Đà Lạt on a cool highland afternoon, seen from the stone ledge of the plaza above the market:
// the white market hall with its red letters, a hotel billboard behind it (the TV), pine hills,
// shoppers on the walkway below, and a fruit seller in her nón lá with her shoulder pole.

import { W, H, BaseScene, depthScale, drawPerson, drawStool, drawTable, drawScreen, mk, mulberry32, shade, dot, ell, seg, rr } from './scene.js';

const LEDGE_Y = 445;
const FACADE_BOTTOM = 426;
const HOTEL_TOP = 206;
const TV = { x: 360, y: 24, w: 288, h: 162 };

// little tea tables across the plaza; front rows get a stool in front, back rows one behind
const TABLES = [
  { x: 200, y: 590, extra: 'front' },
  { x: 450, y: 640, extra: 'back' },
  { x: 700, y: 590, extra: 'front' },
  { x: 950, y: 640, extra: 'back' },
  { x: 1170, y: 590, extra: 'front' },
];
const SEATS = [
  // sitting on the ledge, legs over the market below
  { x: 170, y: 462, ledge: true },
  { x: 280, y: 462, ledge: true },
  { x: 390, y: 462, ledge: true },
  { x: 1010, y: 462, ledge: true },
  { x: 1120, y: 462, ledge: true },
  ...TABLES.flatMap((tb, i) => [
    { x: tb.x - 60, y: tb.y + 10, color: i % 2 ? '#3f86e8' : '#e8504f' },
    { x: tb.x + 60, y: tb.y + 10, color: i % 2 ? '#e8504f' : '#3f86e8' },
    tb.extra === 'front' ? { x: tb.x, y: tb.y + 60, color: '#3f86e8' } : { x: tb.x, y: tb.y - 28, color: '#e8504f' },
  ]),
];
const DOG = { id: 'dog', kind: 'dog', x: 330, y: 525 };
const LAMP = { x: 470, y: 474 };
const HYDRANGEAS = [{ x: 64, y: 478 }, { x: 1226, y: 480 }];

const SELLER = {
  x: 712,
  y: 468,
  facing: 1,
  seed: 2.2,
  back: true,
  sitting: true,
  look: { skin: '#d9a77a', shirt: '#a2a7ad', pants: '#4a4a55', hair: '#2a211c', style: 'nonla' },
};

const NPC = {
  skin: ['#ffdfc4', '#f1c27d', '#e0ac69', '#c68642'],
  shirt: ['#3b4a6b', '#c7c2b8', '#8a5a5a', '#5e7d6a', '#e8e2d4', '#2f2f38', '#b07a4f'],
  pants: ['#2f3b5c', '#4a4a55', '#1f1f28', '#6b6f78'],
  hair: ['#1f1a17', '#3a2a20', '#4a2f1f'],
  style: ['short', 'long', 'bun', 'cap'],
};

// ---------- prerendered layers ----------

function buildSky() {
  const c = mk(W, H), g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 340);
  grad.addColorStop(0, '#9fbfc8');
  grad.addColorStop(0.6, '#c3d6d6');
  grad.addColorStop(1, '#e2e7de');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, LEDGE_Y);
  return c;
}

function buildCloud(rnd) {
  const c = mk(280, 120), g = c.getContext('2d');
  const n = 7 + ((rnd() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const x = 50 + rnd() * 180;
    const y = 62 + rnd() * 26 - (Math.abs(x - 140) < 60 ? 18 : 0);
    const r = 20 + rnd() * 26;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.6, 'rgba(250,252,252,0.8)');
    rg.addColorStop(1, 'rgba(250,252,252,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'source-atop';
  const shadeG = g.createLinearGradient(0, 60, 0, 110);
  shadeG.addColorStop(0, 'rgba(180,195,200,0)');
  shadeG.addColorStop(1, 'rgba(180,195,200,0.45)');
  g.fillStyle = shadeG;
  g.fillRect(0, 0, 280, 120);
  return c;
}

const ridge = (x, base, amp, ph) => base - Math.sin(x * 0.005 + ph) * amp - Math.sin(x * 0.013 + ph * 2) * amp * 0.45;

function drawHills(g, rnd, base, amp, ph, color, pine) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, LEDGE_Y);
  for (let x = 0; x <= W; x += 10) g.lineTo(x, ridge(x, base, amp, ph));
  g.lineTo(W, LEDGE_Y);
  g.closePath();
  g.fill();
  g.fillStyle = pine;
  for (let x = 0; x < W; x += 5 + rnd() * 9) {
    const y = ridge(x, base, amp, ph) + 3, h = 8 + rnd() * 16, w = h * 0.35;
    g.beginPath();
    g.moveTo(x, y - h);
    g.lineTo(x - w, y);
    g.lineTo(x + w, y);
    g.closePath();
    g.fill();
  }
}

function drawPine(g, x, base, h) {
  g.fillStyle = '#5b7a6c';
  g.fillRect(x - 2, base - h * 0.25, 4, h * 0.25);
  for (let i = 0; i < 5; i++) {
    const k = i / 5, w = (1 - k) * h * 0.28 + 4;
    const y = base - h * 0.2 - k * h * 0.8;
    g.fillStyle = i % 2 ? '#577563' : '#4f6c5c';
    g.beginPath();
    g.moveTo(x, y - h * 0.26);
    g.lineTo(x - w, y);
    g.lineTo(x + w, y);
    g.closePath();
    g.fill();
  }
}

function archWindow(g, x, y, w, h, glass) {
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(x - 3, y + h + 2);
  g.lineTo(x - 3, y + w / 2);
  g.arc(x + w / 2, y + w / 2, w / 2 + 3, Math.PI, 0);
  g.lineTo(x + w + 3, y + h + 2);
  g.closePath();
  g.fill();
  g.fillStyle = glass;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + w / 2);
  g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  g.lineTo(x + w, y + h);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 1.5;
  seg(g, x + w / 2, y, x + w / 2, y + h);
  seg(g, x, y + h * 0.55, x + w, y + h * 0.55);
}

function longWindow(g, x, y, w, h, glass) {
  g.fillStyle = '#ffffff';
  rr(g, x - 3, y - 3, w + 6, h + 6, h / 2 + 3);
  g.fill();
  g.fillStyle = glass;
  rr(g, x, y, w, h, h / 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)';
  g.fillRect(x + h / 2, y + 4, w - h, 5);
}

function buildCity() {
  const c = mk(W, H), g = c.getContext('2d'), rnd = mulberry32(77);

  drawHills(g, rnd, 250, 28, 0.4, '#a5b8b5', '#97aca8');
  drawHills(g, rnd, 292, 20, 2.1, '#88a298', '#7b968c');
  for (const [x, h] of [[815, 92], [858, 120], [905, 84], [1080, 104], [1128, 128], [1160, 90]]) drawPine(g, x, 300, h);

  // tall white block on the left
  g.fillStyle = '#eceee8';
  g.fillRect(-10, 96, 128, FACADE_BOTTOM - 96);
  g.fillStyle = '#d7d9d2';
  g.fillRect(-10, 90, 132, 8);
  for (let y = 112; y < 290; y += 22) {
    g.fillStyle = '#8f9c9e';
    g.fillRect(4, y, 100, 10);
    g.fillStyle = '#eceee8';
    for (let x = 4; x < 104; x += 25) g.fillRect(x, y, 2, 10);
  }
  g.fillStyle = 'rgba(0,0,0,0.08)';
  g.fillRect(108, 96, 10, FACADE_BOTTOM - 96);

  // hotel behind the market, with the billboard (TV) on its roof
  g.fillStyle = '#eef0ea';
  g.fillRect(130, HOTEL_TOP, 660, 100);
  g.fillStyle = '#d9dbd3';
  g.fillRect(126, HOTEL_TOP - 6, 668, 8);
  const curtains = ['#c49a83', '#d9c3a6', '#a7b6ba', '#b88f7a', '#9fb0b3'];
  for (const y of [222, 256]) {
    for (let x = 146; x < 776; x += 34) {
      g.fillStyle = '#ffffff';
      g.fillRect(x - 2, y - 2, 26, 24);
      g.fillStyle = curtains[(rnd() * curtains.length) | 0];
      g.fillRect(x, y, 22, 20);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(x, y, 22, 4);
    }
    g.fillStyle = '#dcded6';
    g.fillRect(136, y + 24, 650, 4);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    g.fillRect(136, y + 28, 650, 3);
  }
  g.fillStyle = 'rgba(0,0,0,0.07)';
  g.fillRect(776, HOTEL_TOP, 14, 100);
  // billboard legs + catwalk
  g.fillStyle = '#5a5f66';
  for (const lx of [TV.x + 34, TV.x + TV.w / 2 - 3, TV.x + TV.w - 40]) g.fillRect(lx, TV.y + TV.h + 10, 6, HOTEL_TOP - TV.y - TV.h - 10);
  g.fillRect(TV.x - 10, HOTEL_TOP - 9, TV.w + 20, 3);

  // ---- the market hall ----
  // upper floor with arched and long windows, rounded corner on the right
  const UY = 288;
  g.fillStyle = '#f2f0e7';
  g.beginPath();
  g.moveTo(96, 342);
  g.lineTo(96, UY);
  g.lineTo(1150, UY);
  g.quadraticCurveTo(1196, UY, 1196, UY + 30);
  g.lineTo(1196, 342);
  g.closePath();
  g.fill();
  g.fillStyle = '#dbd8ce';
  g.fillRect(96, UY - 4, 1060, 5);
  longWindow(g, 126, 300, 128, 32, '#9fc2a8');
  archWindow(g, 286, 300, 24, 34, '#8fb5a6');
  longWindow(g, 344, 300, 180, 32, '#aac9b5');
  archWindow(g, 560, 302, 22, 32, '#8fb5a6');
  archWindow(g, 612, 300, 40, 34, '#93b9ab');
  for (let i = 0; i < 8; i++) {
    const x = 690 + i * 58;
    if (i === 0) archWindow(g, x, 300, 44, 34, '#9dbdb2');
    else {
      g.fillStyle = '#ffffff';
      g.fillRect(x - 3, 297, 50, 40);
      g.fillStyle = '#b3cbc3';
      g.fillRect(x, 300, 44, 34);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(x + 21, 300, 2, 34);
      g.fillRect(x, 314, 44, 2);
    }
  }

  // sign band with the red letters
  g.fillStyle = '#f5f3eb';
  g.fillRect(0, 342, W, 44);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  g.fillRect(0, 342, W, 3);
  g.fillStyle = '#d8d5cb';
  g.fillRect(0, 384, W, 4);
  g.font = '700 38px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '5px';
  g.fillStyle = 'rgba(90,30,20,0.35)';
  g.fillText('CHỢ ĐÀ LẠT', 642, 367);
  g.fillStyle = '#b5422d';
  g.fillText('CHỢ ĐÀ LẠT', 640, 365);
  if ('letterSpacing' in g) g.letterSpacing = '0px';

  // louvred lower facade, pillars, entrance with striped awning
  g.fillStyle = '#bdb9ad';
  g.fillRect(0, 388, W, FACADE_BOTTOM - 388);
  g.fillStyle = '#a29e93';
  for (let x = 0; x < W; x += 7) g.fillRect(x, 390, 2, FACADE_BOTTOM - 392);
  g.fillStyle = '#d2cec3';
  g.fillRect(0, 398, W, 2);
  g.fillRect(0, 413, W, 2);
  g.fillStyle = '#e9e7df';
  for (let x = 60; x < W; x += 128) if (x < 540 || x > 760) g.fillRect(x, 388, 10, FACADE_BOTTOM - 388);
  const eg = g.createLinearGradient(0, 400, 0, FACADE_BOTTOM);
  eg.addColorStop(0, '#3b332e');
  eg.addColorStop(1, '#1f1b19');
  g.fillStyle = eg;
  g.fillRect(566, 400, 168, FACADE_BOTTOM - 400);
  for (let i = 0; i < 18; i++) {
    g.fillStyle = ['#e8a0b8', '#f2d06b', '#9fd0e8', '#f08a6a', '#c7a0e0'][i % 5];
    dot(g, 572 + rnd() * 156, 404 + rnd() * 10, 2 + rnd() * 2);
  }
  for (let i = 0; i < 17; i++) {
    g.fillStyle = i % 2 ? '#f4f4f0' : '#3f6db3';
    g.fillRect(554 + i * 11.5, 390, 12, 11);
    g.beginPath();
    g.arc(554 + i * 11.5 + 6, 401, 6, 0, Math.PI);
    g.fill();
  }
  for (const fx of [552, 748]) {
    g.fillStyle = '#5c8a5a';
    ell(g, fx, FACADE_BOTTOM - 6, 10, 7);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = ['#e8a0b8', '#c7a0e0', '#f2d06b'][i % 3];
      dot(g, fx - 8 + rnd() * 16, FACADE_BOTTOM - 14 + rnd() * 8, 2.5);
    }
  }
  // round shop signs on poles
  for (const [sx, col] of [[236, '#f0c23b'], [512, '#9a5fb5'], [858, '#f0c23b']]) {
    g.fillStyle = '#6a6a6a';
    g.fillRect(sx - 1, 404, 2, FACADE_BOTTOM - 404);
    g.fillStyle = col;
    dot(g, sx, 401, 11);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillRect(sx - 6, 399, 12, 2);
    g.fillRect(sx - 4, 403, 8, 1.5);
  }

  // tower on the right
  g.fillStyle = '#e8e8e2';
  g.fillRect(1196, 180, 100, FACADE_BOTTOM - 180);
  g.fillStyle = '#d4d4cd';
  g.fillRect(1192, 174, 108, 8);
  for (let y = 196; y < 400; y += 26) {
    g.fillStyle = '#9aa4a3';
    g.fillRect(1214, y, 10, 18);
    g.fillRect(1236, y, 10, 18);
  }

  // rusty corrugated roof, lower right
  g.fillStyle = '#9c5340';
  g.fillRect(940, 410, 256, FACADE_BOTTOM - 410);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = 940; x < 1196; x += 6) g.fillRect(x, 410, 2, FACADE_BOTTOM - 410);

  // staircase up to the upper level, with bunting
  g.fillStyle = '#eeece4';
  g.beginPath();
  g.moveTo(30, FACADE_BOTTOM);
  g.lineTo(118, FACADE_BOTTOM);
  g.lineTo(368, 338);
  g.lineTo(304, 338);
  g.closePath();
  g.fill();
  g.fillStyle = '#cfccc2';
  g.beginPath();
  g.moveTo(118, FACADE_BOTTOM);
  g.lineTo(146, FACADE_BOTTOM);
  g.lineTo(368, 350);
  g.lineTo(368, 338);
  g.closePath();
  g.fill();
  g.strokeStyle = '#d6d3ca';
  g.lineWidth = 1;
  for (let k = 1; k < 18; k++) {
    const u = k / 18;
    seg(g, 30 + (304 - 30) * u, FACADE_BOTTOM + (338 - FACADE_BOTTOM) * u, 118 + (368 - 118) * u, FACADE_BOTTOM + (338 - FACADE_BOTTOM) * u);
  }
  g.strokeStyle = '#8d8c88';
  g.lineWidth = 2;
  seg(g, 34, FACADE_BOTTOM - 16, 306, 322);
  for (let k = 0; k <= 8; k++) {
    const u = k / 8;
    seg(g, 34 + 272 * u, FACADE_BOTTOM - 16 + (322 - FACADE_BOTTOM + 16) * u, 34 + 272 * u, FACADE_BOTTOM + (338 - FACADE_BOTTOM) * u);
  }
  const flags = ['#e85d5d', '#f2c14e', '#4e9fe0', '#6cc287', '#e46fb0'];
  for (let k = 0; k < 22; k++) {
    const u = (k + 0.5) / 22;
    const x = 38 + 268 * u, y = FACADE_BOTTOM - 18 + (320 - FACADE_BOTTOM + 18) * u + Math.sin(u * Math.PI * 3) * 3;
    g.fillStyle = flags[k % flags.length];
    g.beginPath();
    g.moveTo(x - 4, y);
    g.lineTo(x + 4, y);
    g.lineTo(x, y + 8);
    g.closePath();
    g.fill();
  }

  // walkway below the ledge
  g.fillStyle = '#c9c2b4';
  g.fillRect(0, FACADE_BOTTOM, W, LEDGE_Y - FACADE_BOTTOM);
  g.fillStyle = '#d8d1c3';
  g.beginPath();
  g.moveTo(560, FACADE_BOTTOM);
  g.lineTo(740, FACADE_BOTTOM);
  g.lineTo(820, LEDGE_Y);
  g.lineTo(480, LEDGE_Y);
  g.closePath();
  g.fill();

  // ---- the plaza we stand on ----
  const pg = g.createLinearGradient(0, LEDGE_Y, 0, H);
  pg.addColorStop(0, '#c4bdb0');
  pg.addColorStop(1, '#a39c8f');
  g.fillStyle = pg;
  g.fillRect(0, LEDGE_Y, W, H - LEDGE_Y);
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(0, LEDGE_Y - 1, W, 2);
  g.fillStyle = '#d6d0c3';
  g.fillRect(0, LEDGE_Y + 1, W, 6);
  g.strokeStyle = 'rgba(70,60,50,0.18)';
  g.lineWidth = 1;
  for (const y of [492, 560, 650]) seg(g, 0, y, W, y);
  for (let bx = -1600; bx <= 2900; bx += 180) {
    const vx = 640, vy = -700;
    const tt = (LEDGE_Y + 7 - H) / (vy - H);
    seg(g, bx + (vx - bx) * tt, LEDGE_Y + 7, bx, H);
  }
  // row of drainage slots, like the plaza in the photo
  g.fillStyle = 'rgba(60,52,44,0.35)';
  for (let x = 14; x < W; x += 26) {
    rr(g, x, 532 + Math.sin(x * 0.03) * 1.5, 14, 3.5, 2);
    g.fill();
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(60,50,40,${0.04 + rnd() * 0.05})`;
    ell(g, rnd() * W, LEDGE_Y + 30 + rnd() * 250, 14 + rnd() * 50, 3 + rnd() * 7);
  }
  return c;
}

function buildGrain(n) {
  return Array.from({ length: n }, () => {
    const c = mk(192, 192), g = c.getContext('2d');
    const img = g.createImageData(192, 192);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = (Math.random() * 34) | 0;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

function buildVignette() {
  const c = mk(W, H), g = c.getContext('2d');
  const r = g.createRadialGradient(W / 2, H * 0.5, 320, W / 2, H * 0.5, 820);
  r.addColorStop(0, 'rgba(40,40,30,0)');
  r.addColorStop(1, 'rgba(40,40,30,0.32)');
  g.fillStyle = r;
  g.fillRect(0, 0, W, H);
  return c;
}

// ---------- props ----------

function drawLamp(ctx, x, base) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ell(ctx, x, base, 14, 4);
  ctx.fillStyle = '#2d2f33';
  ctx.fillRect(x - 3, base - 196, 6, 196);
  rr(ctx, x - 8, base - 24, 16, 24, 3);
  ctx.fill();
  ctx.fillRect(x - 6, base - 120, 12, 4);
  ctx.fillStyle = '#f7f4ea';
  dot(ctx, x, base - 210, 13);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  dot(ctx, x - 4, base - 214, 3.5);
  ctx.fillStyle = '#2d2f33';
  rr(ctx, x - 8, base - 227, 16, 5, 2);
  ctx.fill();
  dot(ctx, x, base - 230, 2.5);
}

function drawHydrangea(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ell(ctx, x, y, 24, 5);
  ctx.fillStyle = '#4f7d4f';
  for (const [dx, dy] of [[-16, -32], [16, -32], [0, -40], [-8, -30], [10, -28]]) ell(ctx, x + dx, y + dy, 10, 6, dx * 0.03);
  const blooms = [[-12, -44, '#7d9be0'], [9, -48, '#a487d8'], [0, -36, '#e39bc0'], [16, -38, '#7d9be0'], [-18, -36, '#a487d8']];
  for (const [dx, dy, col] of blooms) {
    ctx.fillStyle = shade(col, -0.15);
    dot(ctx, x + dx, y + dy, 8);
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) dot(ctx, x + dx + Math.cos(i) * 4.5, y + dy + Math.sin(i) * 4.5 - 1, 3.2);
  }
  ctx.fillStyle = '#9c978d';
  rr(ctx, x - 20, y - 26, 40, 26, 4);
  ctx.fill();
  ctx.fillStyle = '#b3aea3';
  ctx.fillRect(x - 22, y - 30, 44, 6);
}

function drawSellerSet(ctx, t, fruit) {
  // water bottle and the blue tote bag
  ctx.fillStyle = 'rgba(220,235,240,0.75)';
  rr(ctx, 584, 434, 11, 32, 3);
  ctx.fill();
  ctx.fillStyle = '#e8eef0';
  ctx.fillRect(586, 429, 7, 5);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ell(ctx, 629, 468, 34, 5);
  ctx.strokeStyle = '#d9cfbf';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(612, 422);
  ctx.quadraticCurveTo(629, 394, 646, 422);
  ctx.stroke();
  ctx.fillStyle = '#e7a3c4';
  ell(ctx, 630, 420, 17, 5);
  ctx.fillStyle = '#1f2c4e';
  rr(ctx, 602, 420, 54, 48, 4);
  ctx.fill();
  ctx.fillStyle = '#f2f0ea';
  ctx.fillRect(608, 431, 22, 2.5);
  ctx.fillRect(608, 439, 30, 2.5);
  ctx.fillRect(608, 447, 36, 2.5);
  ctx.fillRect(602, 455, 54, 1.5);

  drawPerson(ctx, SELLER, 1.04, t);

  // shoulder pole leaning up to the right, with the basket ropes hanging off it
  ctx.strokeStyle = '#8a6a43';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  seg(ctx, 774, 440, 908, 352);
  ctx.strokeStyle = 'rgba(40,34,28,0.8)';
  ctx.lineWidth = 1.2;
  for (const [ex, ey] of [[796, 452], [850, 446], [906, 452]]) seg(ctx, 888, 366, ex, ey);

  // flat woven basket of guavas and tomatoes
  const bx = 850, by = 462;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ell(ctx, bx, by + 4, 66, 9);
  ctx.fillStyle = '#8f6c42';
  ell(ctx, bx, by - 4, 62, 13);
  ctx.fillStyle = '#a98352';
  ell(ctx, bx, by - 6, 56, 10);
  for (const f of fruit) {
    ctx.fillStyle = f.color;
    dot(ctx, bx + f.x, by - 8 + f.y, f.r);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    dot(ctx, bx + f.x - f.r * 0.35, by - 8 + f.y - f.r * 0.35, f.r * 0.35);
  }
  // little scale
  ctx.fillStyle = '#3f8f5a';
  rr(ctx, 792, 434, 22, 16, 3);
  ctx.fill();
  ctx.fillStyle = '#f2f2f2';
  dot(ctx, 803, 442, 4);
  ctx.fillStyle = '#d9443a';
  ctx.fillRect(802.5, 439, 1, 3);
  ctx.fillStyle = '#cfd3d8';
  ell(ctx, 803, 432, 18, 4);
}

// a sleepy Đà Lạt street dog; wakes up, wags and smiles when petted
function drawDog(ctx, x, y, t, awake) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ell(ctx, 0, 0, 26, 5);
  ctx.strokeStyle = '#a86f3e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const wag = Math.sin(t * (awake ? 18 : 1.2));
  ctx.beginPath();
  ctx.moveTo(-20, -8);
  ctx.quadraticCurveTo(-30, awake ? -20 : -8, -32 + wag * (awake ? 5 : 1), awake ? -24 : -4);
  ctx.stroke();
  ctx.fillStyle = '#c18a52';
  ell(ctx, -2, -9, 22, 10);
  ctx.fillStyle = '#e8d3b4';
  ell(ctx, 2, -4, 12, 4);
  ctx.fillStyle = '#c18a52';
  ell(ctx, -14, -2, 6, 3);
  ell(ctx, 10, -2, 6, 3);
  const hx = awake ? 22 : 20, hy = awake ? -20 : -9;
  dot(ctx, hx, hy, 9);
  ell(ctx, hx + 8, hy + 3, 6, 4.5);
  ctx.fillStyle = '#8a5a30';
  ell(ctx, hx - 6, hy - 1, 3.5, 7, 0.3);
  ell(ctx, hx + 6, hy - 2, 3.5, 7, -0.2);
  ctx.fillStyle = '#2a1d14';
  dot(ctx, hx + 13, hy + 2, 2);
  if (awake) {
    dot(ctx, hx + 1, hy - 2, 1.6);
    dot(ctx, hx + 7, hy - 2, 1.6);
    ctx.fillStyle = '#e57a8a';
    ell(ctx, hx + 9, hy + 8, 2.5, 3.5);
  } else {
    ctx.strokeStyle = '#2a1d14';
    ctx.lineWidth = 1.2;
    seg(ctx, hx - 1, hy - 1, hx + 3, hy - 1);
    seg(ctx, hx + 5, hy - 1, hx + 9, hy - 1);
  }
  ctx.restore();
}

// ---------- scene ----------

export class DalatScene extends BaseScene {
  constructor() {
    super();
    this.seats = SEATS;
    this.blocks = [{ left: 575, right: 925, bottom: 495 }];
    this.tvRect = TV;
    this.vendorHit = { x: 580, y: 340, w: 340, h: 140 };
    this.orderSpot = { x: 740, y: 520 };
    this.vendorBubbleAt = { x: 712, y: 352 };
    this.pets = [DOG];
    this.menuTitle = 'Mua gì nè? 🍓';
    this.hint = 'Click to walk · sit on the ledge or a stool · click the fruit seller to buy · WASD / arrows work too';

    const rnd = mulberry32(5);
    this.sky = buildSky();
    this.city = buildCity();
    this.vignette = buildVignette();
    this.grain = buildGrain(3);
    this.grainPatterns = null;
    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      img: buildCloud(rnd),
      x: (i / 6) * (W + 300) - 150 + rnd() * 80,
      y: -10 + rnd() * 170,
      s: 0.8 + rnd() * 0.8,
      v: 3 + rnd() * 5,
    }));
    this.fruit = [];
    for (let i = 0; i < 26; i++) {
      const guava = rnd() < 0.72;
      this.fruit.push({ x: -46 + rnd() * 92, y: -4 - rnd() * 10 + (i > 18 ? -6 : 0), r: guava ? 6 + rnd() * 3 : 4.5, color: guava ? (rnd() < 0.5 ? '#a6c96a' : '#93bb5c') : '#d9443a' });
    }
    this.fruit.sort((a, b) => a.y - b.y);
    const pick = (a) => a[(rnd() * a.length) | 0];
    this.walkers = Array.from({ length: 9 }, () => ({
      x: rnd() * W,
      y: FACADE_BOTTOM + 2 + rnd() * 14,
      facing: rnd() < 0.5 ? -1 : 1,
      v: 12 + rnd() * 16,
      phase: rnd() * 6,
      moving: true,
      seed: rnd() * 10,
      look: { skin: pick(NPC.skin), shirt: pick(NPC.shirt), pants: pick(NPC.pants), hair: pick(NPC.hair), style: pick(NPC.style) },
    }));
    this.flock = null;
    this.nextFlock = 4;
  }

  greeting(name) {
    return `Chào ${name}! Dâu với ổi tươi lắm nè 🍓`;
  }

  update(dt, raining) {
    super.update(dt, raining);
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > W + 40) c.x = -280 * c.s - 40;
    }
    for (const w of this.walkers) {
      w.x += w.facing * w.v * dt;
      w.phase += dt * 8;
      if (w.x > W + 20) w.x = -20;
      if (w.x < -20) w.x = W + 20;
    }
    if (this.flock) {
      this.flock.x += this.flock.dir * this.flock.v * dt;
      if (this.flock.x < -120 || this.flock.x > W + 120) {
        this.flock = null;
        this.nextFlock = 8 + Math.random() * 14;
      }
    } else if ((this.nextFlock -= dt) <= 0) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.flock = {
        dir,
        x: dir > 0 ? -60 : W + 60,
        y: 50 + Math.random() * 110,
        v: 45 + Math.random() * 30,
        birds: Array.from({ length: 3 + ((Math.random() * 4) | 0) }, (_, i) => ({ dx: -i * 18 * dir + Math.random() * 8, dy: (i % 2 ? 1 : -1) * i * 6, ph: Math.random() * 6 })),
      };
    }
  }

  draw(ctx, now, people, opts = {}) {
    const t = now / 1000;
    ctx.drawImage(this.sky, 0, 0);
    ctx.globalAlpha = 0.9;
    for (const c of this.clouds) ctx.drawImage(c.img, c.x, c.y, 280 * c.s, 120 * c.s);
    ctx.globalAlpha = 1;
    ctx.drawImage(this.city, 0, 0);
    const tv = opts.tv || {};
    drawScreen(ctx, t, TV, tv, { title: 'ĐÀ LẠT', color: '#ffd36b', sub: '#cfe3df', bg: ['#2f6a6a', '#173638'] });
    for (const w of this.walkers) drawPerson(ctx, w, 0.34, t);
    this.drawBirds(ctx, t);

    const items = [
      { y: LAMP.y, d: () => drawLamp(ctx, LAMP.x, LAMP.y) },
      { y: SELLER.y, d: () => drawSellerSet(ctx, t, this.fruit) },
      { y: DOG.y, d: () => drawDog(ctx, DOG.x, DOG.y, t, this.petAwake('dog', now)) },
    ];
    for (const tb of TABLES) items.push({ y: tb.y, d: () => drawTable(ctx, tb.x, tb.y, depthScale(tb.y)) });
    for (const h of HYDRANGEAS) items.push({ y: h.y, d: () => drawHydrangea(ctx, h.x, h.y) });
    for (const s of SEATS) if (!s.ledge) items.push({ y: s.y - 0.01, d: () => drawStool(ctx, s.x, s.y, s.color, depthScale(s.y)) });
    for (const p of people) items.push({ y: p.y, d: () => drawPerson(ctx, p, depthScale(p.y), t) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();

    if (this.rainAmount > 0.01) this.drawRain(ctx);
    this.drawFilm(ctx, t);
    this.drawLabels(ctx, now, people, opts);
  }

  drawBirds(ctx, t) {
    const f = this.flock;
    if (!f) return;
    ctx.strokeStyle = 'rgba(50,55,60,0.75)';
    ctx.lineWidth = 1.5;
    for (const b of f.birds) {
      const x = f.x + b.dx, y = f.y + b.dy + Math.sin(t * 2 + b.ph) * 3;
      const wing = Math.sin(t * 10 + b.ph) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - wing);
      ctx.quadraticCurveTo(x - 2, y - 1, x, y);
      ctx.quadraticCurveTo(x + 2, y - 1, x + 6, y - wing);
      ctx.stroke();
    }
  }

  // faded film-photo look: warm wash, flickering grain, soft vignette
  drawFilm(ctx, t) {
    ctx.fillStyle = 'rgba(255,244,225,0.07)';
    ctx.fillRect(0, 0, W, H);
    if (!this.grainPatterns) this.grainPatterns = this.grain.map((g) => ctx.createPattern(g, 'repeat'));
    const ox = (Math.random() * 192) | 0, oy = (Math.random() * 192) | 0;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = this.grainPatterns[((t * 12) | 0) % this.grainPatterns.length];
    ctx.fillRect(-ox, -oy, W, H);
    ctx.restore();
    ctx.drawImage(this.vignette, 0, 0);
  }
}
