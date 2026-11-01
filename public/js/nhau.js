// Quán nhậu at night: a giant screen on the brick wall (the TV), an LED ticker that calls out orders,
// eight low plastic tables in two rows, and a waiter who takes your order and brings dishes to your table.

import { W, H, BaseScene, depthScale, drawPerson, drawStool, drawScreen, drawCat, mk, mulberry32, shade, dot, ell, seg, rr, glow, glowEll, emojiFont } from './scene.js';

const WALL_BOTTOM = 440;
const TV = { x: 376, y: 30, w: 528, h: 297 };
const TICKER = { x: 376, y: 346, w: 528, h: 22 };
const HOME = { x: 960, y: 455 }; // waiter's spot by the kitchen pass

// must match `tables: 8` for this room in server.js
const TABLES = [
  { x: 190, y: 500, color: '#d9473f' },
  { x: 490, y: 500, color: '#3f7fd9' },
  { x: 790, y: 500, color: '#d9473f' },
  { x: 1090, y: 500, color: '#3f7fd9' },
  { x: 190, y: 612, color: '#3f7fd9' },
  { x: 490, y: 612, color: '#d9473f' },
  { x: 790, y: 612, color: '#3f7fd9' },
  { x: 1090, y: 612, color: '#d9473f' },
];
const SEAT_OFFSETS = [[-62, 2], [62, 2], [0, -24], [0, 28]];
const SEATS = TABLES.flatMap((tb, i) =>
  SEAT_OFFSETS.map(([dx, dy], k) => ({ x: tb.x + dx, y: tb.y + dy, table: i, color: (i + k) % 2 ? '#3f86e8' : '#e8504f' }))
);
const DISH_SLOTS = [[-26, -2], [0, -7], [26, -2], [-13, 6], [13, 6], [0, 1]];

const BULBS = [50, 140, 240, 330, 950, 1040, 1140, 1230].map((x, i) => ({ x, len: 150 + ((i * 37) % 60), ph: i * 1.7 }));

const WAITER_LOOK = { skin: '#e0ac69', shirt: '#2f7d4f', pants: '#1f1f28', hair: '#1f1a17', style: 'short' };
const CAT = { id: 'cat', kind: 'cat', x: 340, y: 552 };
const CAT_COLORS = { fur: '#9a9aa3', stripe: '#6f6f78', tail: '#85858e' };

// the chef works between three spots behind the kitchen pass window
const KITCHEN = { x: 960, y: 236, w: 280, h: 94 };
const STOVE_X = 1030;
const STATIONS = { wok: 1062, plate: 1122, chop: 1180 };

function drawFlames(ctx, x, y, k, t) {
  for (let i = 0; i < 5; i++) {
    const h = (8 + Math.abs(Math.sin(t * 13 + i * 1.7)) * 14) * k;
    const fx = x - 12 + i * 6;
    ctx.fillStyle = i % 2 ? 'rgba(255,190,60,0.9)' : 'rgba(255,100,30,0.85)';
    ctx.beginPath();
    ctx.moveTo(fx - 4, y);
    ctx.quadraticCurveTo(fx, y - h * 1.3, fx + 4, y);
    ctx.fill();
  }
}

// ---------- prerendered room ----------

function buildRoom() {
  const c = mk(W, H), g = c.getContext('2d'), rnd = mulberry32(31);

  // brick wall
  const wg = g.createLinearGradient(0, 0, 0, WALL_BOTTOM);
  wg.addColorStop(0, '#2e1d18');
  wg.addColorStop(1, '#3d271f');
  g.fillStyle = wg;
  g.fillRect(0, 0, W, WALL_BOTTOM);
  for (let row = 0, y = 14; y < 360; row++, y += 14) {
    for (let x = row % 2 ? -18 : 0; x < W; x += 36) {
      g.fillStyle = `rgba(${150 + rnd() * 60 | 0},${70 + rnd() * 30 | 0},50,${0.05 + rnd() * 0.06})`;
      g.fillRect(x + 1, y + 1, 34, 12);
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, y, W, 1);
  }
  g.fillStyle = '#1b120f';
  g.fillRect(0, 0, W, 14);

  // wood wainscot
  g.fillStyle = '#4a2f20';
  g.fillRect(0, 360, W, WALL_BOTTOM - 360);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let x = 0; x < W; x += 30) g.fillRect(x, 362, 2, WALL_BOTTOM - 362);
  g.fillStyle = '#6b4329';
  g.fillRect(0, 356, W, 6);

  // beer cooler with glowing glass door
  g.fillStyle = '#c9ced6';
  rr(g, 26, 232, 118, 208, 6);
  g.fill();
  g.fillStyle = '#2f7d4f';
  g.fillRect(26, 232, 118, 26);
  g.fillStyle = '#fff4d0';
  g.font = '900 15px Nunito, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BIA LẠNH', 85, 246);
  const glass = g.createLinearGradient(0, 264, 0, 430);
  glass.addColorStop(0, '#d8f0ff');
  glass.addColorStop(1, '#9cc8e6');
  g.fillStyle = glass;
  g.fillRect(36, 264, 98, 166);
  for (let sy = 300; sy < 430; sy += 32) {
    g.fillStyle = '#8aa3b5';
    g.fillRect(36, sy, 98, 3);
    for (let bx = 42; bx < 130; bx += 11) {
      g.fillStyle = rnd() < 0.7 ? '#2f8a4a' : '#c9a227';
      g.fillRect(bx, sy - 22, 7, 22);
      g.fillRect(bx + 2, sy - 28, 3, 6);
    }
  }
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.fillRect(40, 268, 8, 158);
  g.fillStyle = '#7d8590';
  g.fillRect(128, 320, 4, 40);

  // stacked beer crates
  const crate = (x, y) => {
    g.fillStyle = '#2f7a45';
    g.fillRect(x, y, 70, 28);
    g.fillStyle = '#25613a';
    g.fillRect(x + 4, y + 6, 62, 6);
    g.fillStyle = '#c9a227';
    for (let i = 0; i < 6; i++) dot(g, x + 9 + i * 10.5, y - 1, 3);
  };
  crate(156, 412);
  crate(156, 384);
  crate(232, 412);
  crate(1190, 412);

  // kitchen pass window
  const kg = g.createLinearGradient(0, 236, 0, 330);
  kg.addColorStop(0, '#ffd59a');
  kg.addColorStop(1, '#e08a4a');
  g.fillStyle = '#1b120f';
  g.fillRect(952, 228, 296, 110);
  g.fillStyle = kg;
  g.fillRect(960, 236, 280, 94);
  g.fillStyle = 'rgba(60,35,25,0.55)';
  for (let i = 0; i < 5; i++) g.fillRect(970 + i * 56, 250 + rnd() * 6, 40, 3);
  // hanging pans (the chef is drawn live, see drawKitchen)
  for (const px of [990, 1110, 1220]) {
    g.strokeStyle = 'rgba(40,25,20,0.8)';
    g.lineWidth = 2;
    seg(g, px, 236, px, 256);
    g.fillStyle = 'rgba(40,25,20,0.8)';
    ell(g, px, 262, 12, 6);
  }
  g.fillStyle = '#b8bcc4';
  g.fillRect(952, 326, 296, 10);
  g.fillStyle = '#ffd36b';
  g.font = '900 16px Nunito, sans-serif';
  g.fillText('BẾP', 1100, 220);

  // posters
  g.fillStyle = '#e8d6b0';
  g.fillRect(248, 250, 70, 92);
  g.fillStyle = '#c0392b';
  g.fillRect(254, 256, 58, 26);
  g.fillStyle = '#5a3a26';
  for (let i = 0; i < 6; i++) g.fillRect(256, 290 + i * 8, 40 + rnd() * 14, 3);

  // terracotta floor tiles (gạch tàu)
  const fg = g.createLinearGradient(0, WALL_BOTTOM, 0, H);
  fg.addColorStop(0, '#5e3426');
  fg.addColorStop(1, '#7a4430');
  g.fillStyle = fg;
  g.fillRect(0, WALL_BOTTOM, W, H - WALL_BOTTOM);
  g.strokeStyle = 'rgba(30,15,10,0.45)';
  g.lineWidth = 1.2;
  for (let k = 0, y = WALL_BOTTOM + 10; y < H; k++) {
    seg(g, 0, y, W, y);
    y += 14 + k * 4;
  }
  for (let bx = -2400; bx <= 3700; bx += 90) {
    const vx = 640, vy = -500;
    const tt = (WALL_BOTTOM - H) / (vy - H);
    seg(g, bx + (vx - bx) * tt, WALL_BOTTOM, bx, H);
  }
  const sh = g.createLinearGradient(0, WALL_BOTTOM, 0, WALL_BOTTOM + 30);
  sh.addColorStop(0, 'rgba(0,0,0,0.5)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh;
  g.fillRect(0, WALL_BOTTOM, W, 30);
  // peanut shells and napkins left behind
  for (let i = 0; i < 28; i++) {
    g.fillStyle = rnd() < 0.7 ? 'rgba(200,160,110,0.4)' : 'rgba(235,230,220,0.35)';
    ell(g, rnd() * W, WALL_BOTTOM + 30 + rnd() * 260, 2 + rnd() * 2, 1.2 + rnd(), rnd() * 3);
  }
  return c;
}

function buildVignette() {
  const c = mk(W, H), g = c.getContext('2d');
  const r = g.createRadialGradient(W / 2, H * 0.6, 240, W / 2, H * 0.6, 820);
  r.addColorStop(0, 'rgba(10,4,2,0)');
  r.addColorStop(1, 'rgba(10,4,2,0.65)');
  g.fillStyle = r;
  g.fillRect(0, 0, W, H);
  return c;
}

// ---------- props ----------

function drawTableTop(ctx, tb, s, dishes) {
  ctx.save();
  ctx.translate(tb.x, tb.y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ell(ctx, 0, 0, 54, 10);
  ctx.fillStyle = shade(tb.color, -0.35);
  for (const [lx, lw] of [[-40, 6], [34, 6], [-20, 5], [15, 5]]) ctx.fillRect(lx, -22, lw, 22);
  ctx.fillStyle = shade(tb.color, -0.2);
  ell(ctx, 0, -22, 48, 15);
  ctx.fillStyle = tb.color;
  ell(ctx, 0, -26, 48, 15);
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ell(ctx, -12, -30, 24, 5);
  // tissue box and a chopstick cup that live on every table
  ctx.fillStyle = '#f2ece2';
  ctx.fillRect(26, -40, 12, 8);
  ctx.fillStyle = '#c8a27a';
  ctx.fillRect(-38, -42, 7, 11);
  ctx.strokeStyle = '#e8d9b8';
  ctx.lineWidth = 1;
  seg(ctx, -36, -42, -37, -50);
  seg(ctx, -33, -42, -32, -50);
  ctx.font = emojiFont(21);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  dishes.forEach((d, i) => {
    if (d.hidden) return;
    const [dx, dy] = DISH_SLOTS[i % DISH_SLOTS.length];
    ctx.fillText(d.emoji, dx, -30 + dy);
  });
  ctx.restore();
}

function drawBulb(ctx, b, t) {
  const sway = Math.sin(t * 0.8 + b.ph) * 2;
  ctx.strokeStyle = 'rgba(15,8,5,0.9)';
  ctx.lineWidth = 1;
  seg(ctx, b.x, 14, b.x + sway, 14 + b.len);
  ctx.fillStyle = '#2a1a12';
  ctx.fillRect(b.x + sway - 3, 14 + b.len, 6, 6);
  ctx.fillStyle = '#ffe2a8';
  ell(ctx, b.x + sway, 14 + b.len + 12, 6, 8);
}

function drawNeon(ctx, t, text, x, y, size, color, flicker) {
  const on = !flicker || Math.sin(t * 13) + Math.sin(t * 4.1) + Math.sin(t * 0.9) * 1.3 < 2.3;
  ctx.font = `900 ${size}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (!on) {
    ctx.fillStyle = 'rgba(90,60,55,0.9)';
    ctx.fillText(text, x, y);
    return false;
  }
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 6;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  return true;
}

// ---------- scene ----------

export class NhauScene extends BaseScene {
  constructor() {
    super();
    this.seats = SEATS;
    this.tvRect = TV;
    this.orderSpot = HOME;
    this.menuTitle = 'Gọi món 🍻';
    this.hint = 'Click a table to sit · click the waiter (green shirt) or your table to order · WASD / arrows work too';
    this.room = buildRoom();
    this.vignette = buildVignette();
    this.tables = TABLES.map(() => []);
    this.steam = [];
    this.waiter = { ...HOME, facing: -1, moving: false, phase: 0, seed: 4, look: WAITER_LOOK, holding: null, steps: [] };
    this.neonOn = [true, true];
    this.pets = [CAT];
    this.chef = { x: STATIONS.wok, station: 'wok', until: 0, moving: false, plateEmoji: '🍗' };
    this.cookUntil = 0;
    this.sparks = [];
  }

  // a new order: the chef rushes to the wok and the flames go up
  startCooking(emoji, now) {
    this.cookUntil = now + 5500;
    this.chef.until = 0;
    this.chef.plateEmoji = emoji;
  }

  updateChef(dt, now) {
    const c = this.chef;
    const cooking = now < this.cookUntil;
    if (now > c.until) {
      const options = ['wok', 'chop', 'wok', 'plate', 'chop'];
      c.station = cooking ? 'wok' : options[(Math.random() * options.length) | 0];
      c.until = now + (cooking ? this.cookUntil - now : 3000 + Math.random() * 4000);
      // after a rush, plate the dish
      if (!cooking && c.wasCooking) c.station = 'plate';
      c.wasCooking = cooking;
    }
    const tx = STATIONS[c.station];
    const d = tx - c.x;
    c.moving = Math.abs(d) > 1;
    if (c.moving) c.x += Math.sign(d) * Math.min(Math.abs(d), 90 * dt);
    const atWok = !c.moving && c.station === 'wok';
    if (atWok && Math.random() < dt * (cooking ? 30 : 6)) {
      this.sparks.push({ x: STOVE_X - 10 + Math.random() * 20, y: 304, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 50, life: 0, max: 0.4 + Math.random() * 0.4 });
    }
    for (const s of this.sparks) {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 120 * dt;
    }
    this.sparks = this.sparks.filter((s) => s.life < s.max);
  }

  // chef behind the pass: tossing the wok over the flames, chopping, or plating
  drawKitchen(ctx, t) {
    const c = this.chef, now = t * 1000;
    const cooking = now < this.cookUntil;
    const atWok = !c.moving && c.station === 'wok';
    const toss = atWok ? Math.max(0, Math.sin(t * (cooking ? 9 : 5))) : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(KITCHEN.x, KITCHEN.y, KITCHEN.w, KITCHEN.h);
    ctx.clip();

    // stove, flames, wok
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(STOVE_X - 30, 314, 60, 16);
    if (atWok) drawFlames(ctx, STOVE_X, 316, cooking ? 1.2 : 0.6, t);
    else drawFlames(ctx, STOVE_X, 316, 0.25, t);
    const wy = 308 - toss * (cooking ? 12 : 6);
    ctx.fillStyle = '#26262b';
    ctx.beginPath();
    ctx.ellipse(STOVE_X, wy, 18, 8, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#4a4a52';
    ell(ctx, STOVE_X, wy, 18, 2.5);
    if (toss > 0.4) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ['#e8963f', '#7bd389', '#d9443a', '#f2d06b'][i];
        dot(ctx, STOVE_X - 8 + i * 5, wy - 4 - toss * 14 - (i % 2) * 5, 2.2);
      }
    }
    for (const s of this.sparks) {
      ctx.fillStyle = `rgba(255,${(180 - s.life * 200) | 0},60,${1 - s.life / s.max})`;
      ctx.fillRect(s.x, s.y, 2, 2);
    }

    // chef
    const x = c.x, bob = c.moving ? Math.abs(Math.sin(t * 10)) * 1.5 : 0;
    const sh = 290 - bob;
    ctx.fillStyle = '#f4f1ea';
    rr(ctx, x - 15, 282 - bob, 30, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#c9c3b8';
    dot(ctx, x - 4, 296 - bob, 1.5);
    dot(ctx, x - 4, 304 - bob, 1.5);
    ctx.fillStyle = '#d9473f';
    rr(ctx, x - 7, 280 - bob, 14, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#e0ac69';
    dot(ctx, x, 268 - bob, 11);
    ctx.fillStyle = '#2b2230';
    dot(ctx, x - 4, 267 - bob, 1.5);
    dot(ctx, x + 4, 267 - bob, 1.5);
    ctx.fillRect(x - 5, 272 - bob, 10, 2);
    ctx.fillStyle = '#ffffff';
    rr(ctx, x - 10, 250 - bob, 20, 10, 2);
    ctx.fill();
    dot(ctx, x - 7, 249 - bob, 7);
    dot(ctx, x, 245 - bob, 8);
    dot(ctx, x + 7, 249 - bob, 7);

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#e6e1d6';
    ctx.lineWidth = 6;
    let lh, rh;
    if (c.station === 'wok' && !c.moving) {
      lh = [STOVE_X + 22, wy - 3];
      rh = [x + 14 + Math.cos(t * 6) * 3, 302];
    } else if (c.station === 'chop' && !c.moving) {
      lh = [x + 18, 310];
      rh = [x + 22, 300 - Math.abs(Math.sin(t * 14)) * 9];
    } else if (c.station === 'plate' && !c.moving) {
      lh = [x - 9, 308];
      rh = [x + 9, 308];
    } else {
      lh = [x - 16, 312 + Math.sin(t * 10) * 2];
      rh = [x + 16, 312 - Math.sin(t * 10) * 2];
    }
    seg(ctx, x - 11, sh, lh[0], lh[1]);
    seg(ctx, x + 11, sh, rh[0], rh[1]);
    ctx.fillStyle = '#e0ac69';
    dot(ctx, lh[0], lh[1], 3);
    dot(ctx, rh[0], rh[1], 3);
    // wok handle / knife and board / plate
    ctx.strokeStyle = '#26262b';
    ctx.lineWidth = 2.5;
    if (c.station === 'wok' && !c.moving) seg(ctx, STOVE_X + 16, wy - 1, lh[0], lh[1]);
    if (c.station === 'chop') {
      ctx.fillStyle = '#9a6a3e';
      ctx.fillRect(x + 8, 314, 36, 6);
      ctx.fillStyle = '#7bd389';
      for (let i = 0; i < 4; i++) dot(ctx, x + 14 + i * 5, 312, 2);
      if (!c.moving) {
        ctx.strokeStyle = '#c9ced6';
        ctx.lineWidth = 2;
        seg(ctx, rh[0], rh[1], rh[0] + 10, rh[1] + 5);
      }
    }
    if (c.station === 'plate' && !c.moving) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, x, 312, 14, 4);
      ctx.font = emojiFont(14);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.plateEmoji, x, 305);
    }
    ctx.restore();
    // counter ledge in front of the chef
    ctx.fillStyle = '#b8bcc4';
    ctx.fillRect(952, 326, 296, 10);
  }

  greeting(name) {
    return `Dạ chào ${name}! Mời ngồi ạ 🍻`;
  }

  hitsVendor(x, y) {
    const w = this.waiter;
    return Math.abs(x - w.x) < 24 && y > w.y - 100 && y < w.y + 6;
  }

  tableAt(x, y) {
    const i = TABLES.findIndex((tb) => {
      const s = depthScale(tb.y);
      return Math.abs(x - tb.x) < 50 * s && Math.abs(y - (tb.y - 26 * s)) < 22 * s;
    });
    return i < 0 ? null : i;
  }

  // dishes already on the tables when you join
  setTables(tables) {
    const now = performance.now();
    this.tables = TABLES.map((_, i) => (tables[i] || []).map((d) => ({ emoji: d.emoji, name: d.name, by: d.by, at: now - d.ago, until: now + d.ms })));
  }

  addDish(table, dish, now) {
    const d = { ...dish, at: now, until: now + dish.ms, hidden: true };
    this.startCooking(dish.emoji, now);
    this.tables[table].push(d);
    if (this.tables[table].length > 6) this.tables[table].shift();
    const w = this.waiter;
    w.steps.push(
      { kind: 'walk', ...HOME },
      { kind: 'do', fn: () => (w.holding = { emoji: dish.emoji }) },
      { kind: 'wait', t: 0.6 },
      { kind: 'walk', ...this.approach(table) },
      {
        kind: 'do',
        fn: () => {
          d.hidden = false;
          w.holding = null;
          this.vendorSay(`${dish.name} của bàn ${table + 1} đây ạ! ${dish.emoji}`, performance.now());
        },
      },
      { kind: 'wait', t: 0.8 }
    );
  }

  // the waiter walks over, asks, and `onArrive` (only for the caller) opens the menu
  callWaiter(table, onArrive) {
    const w = this.waiter;
    w.steps.push(
      { kind: 'walk', ...this.approach(table) },
      {
        kind: 'do',
        fn: () => {
          this.vendorSay(`Dạ, bàn ${table + 1} dùng gì ạ? 📝`, performance.now());
          if (onArrive) onArrive();
        },
      },
      { kind: 'wait', t: 2.2 }
    );
  }

  approach(table) {
    const tb = TABLES[table];
    return { x: tb.x + 36, y: tb.y - 14 };
  }

  update(dt, raining) {
    super.update(dt, raining);
    const w = this.waiter;
    let step = w.steps[0];
    while (step && step.kind === 'do') {
      w.steps.shift();
      step.fn();
      step = w.steps[0];
    }
    w.moving = false;
    if (!step && Math.hypot(w.x - HOME.x, w.y - HOME.y) > 1) w.steps.push((step = { kind: 'walk', ...HOME }));
    if (step && step.kind === 'walk') {
      const dx = step.x - w.x, dy = step.y - w.y, d = Math.hypot(dx, dy);
      if (d < 2) {
        w.x = step.x;
        w.y = step.y;
        w.steps.shift();
      } else {
        const v = Math.min(d, 210 * dt);
        w.x += (dx / d) * v;
        w.y += (dy / d) * v;
        w.moving = true;
        w.phase += dt * 12;
        if (Math.abs(dx) > 1) w.facing = dx > 0 ? 1 : -1;
      }
    } else if (step && step.kind === 'wait') {
      step.t -= dt;
      if (step.t <= 0) w.steps.shift();
    }
    this.vendorBubbleAt = { x: w.x, y: w.y - 100 * depthScale(Math.max(w.y, 445)) };

    // expire old dishes; hotpots steam
    const now = performance.now();
    this.tables = this.tables.map((list) => list.filter((d) => d.until > now));
    this.tables.forEach((list, i) => {
      list.forEach((d, k) => {
        if (d.hidden || d.emoji !== '🍲' || Math.random() > dt * 6) return;
        const tb = TABLES[i], s = depthScale(tb.y), [dx, dy] = DISH_SLOTS[k % DISH_SLOTS.length];
        this.steam.push({ x: tb.x + dx * s, y: tb.y + (-38 + dy) * s, r: 3, life: 0, max: 1.6 + Math.random() });
      });
    });
    this.updateChef(dt, now);
    // kitchen steam, thicker while cooking an order
    if (Math.random() < dt * (now < this.cookUntil ? 14 : 5)) this.steam.push({ x: 1000 + Math.random() * 200, y: 300, r: 6, life: 0, max: 2.5 });
    for (const p of this.steam) {
      p.life += dt;
      p.y -= dt * 18;
      p.x += Math.sin(p.life * 2 + p.y * 0.05) * dt * 6;
      p.r += dt * 7;
    }
    this.steam = this.steam.filter((p) => p.life < p.max);
  }

  draw(ctx, now, people, opts = {}) {
    const t = now / 1000;
    ctx.drawImage(this.room, 0, 0);
    this.neonOn[0] = drawNeon(ctx, t, 'QUÁN', 180, 92, 44, '#ff7a59', false);
    drawNeon(ctx, t, 'NHẬU', 180, 146, 44, '#ff7a59', false);
    this.neonOn[1] = drawNeon(ctx, t, '1 2 3', 1100, 92, 40, '#ffd36b', true);
    drawNeon(ctx, t, 'DZÔ! 🍻', 1100, 144, 40, '#ffd36b', !this.neonOn[1]);
    const tv = opts.tv || {};
    drawScreen(ctx, t, TV, tv, { title: 'MỘT HAI BA DZÔ!', color: '#ffb347', sub: '#e8c9a8', bg: ['#3a1f17', '#170c09'] });
    this.drawTicker(ctx, t);
    this.drawKitchen(ctx, t);
    for (const b of BULBS) drawBulb(ctx, b, t);

    const items = [{ y: CAT.y, d: () => drawCat(ctx, CAT.x, CAT.y, t, this.petAwake('cat', now), CAT_COLORS) }];
    TABLES.forEach((tb, i) => items.push({ y: tb.y, d: () => drawTableTop(ctx, tb, depthScale(tb.y), this.tables[i]) }));
    for (const s of SEATS) items.push({ y: s.y - 0.01, d: () => drawStool(ctx, s.x, s.y, s.color, depthScale(s.y) * 0.85) });
    const w = this.waiter;
    items.push({ y: w.y, d: () => drawPerson(ctx, w, depthScale(Math.max(w.y, 445)), t) });
    for (const p of people) items.push({ y: p.y, d: () => drawPerson(ctx, p, depthScale(p.y), t) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.d();

    for (const p of this.steam) {
      const k = p.life / p.max;
      ctx.fillStyle = `rgba(255,245,230,${0.14 * (1 - k) * Math.min(1, p.life * 4)})`;
      dot(ctx, p.x, p.y, p.r);
    }
    this.drawGlows(ctx, t, tv.on);
    if (this.rainAmount > 0.01) this.drawRain(ctx);
    ctx.drawImage(this.vignette, 0, 0);
    this.drawWaiterTag(ctx);
    this.drawLabels(ctx, now, people, opts);
  }

  // LED board under the screen: scrolls the latest orders
  drawTicker(ctx, t) {
    const r = TICKER;
    ctx.fillStyle = '#0e0806';
    rr(ctx, r.x - 4, r.y - 3, r.w + 8, r.h + 6, 4);
    ctx.fill();
    const recent = this.tables
      .flatMap((list, i) => list.filter((d) => !d.hidden).map((d) => ({ ...d, table: i })))
      .sort((a, b) => b.at - a.at)
      .slice(0, 6);
    const text = recent.length
      ? recent.map((d) => `🔔 BÀN ${d.table + 1} · ${d.by}: ${d.name} ${d.emoji}`).join('      ')
      : 'MỘT HAI BA DZÔ! 🍻   Ngồi vào bàn rồi bấm anh phục vụ áo xanh để gọi món';
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.font = '800 13px Nunito, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    const x = r.x + r.w - ((t * 60) % (tw + r.w));
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffb347';
    ctx.fillText(text, x, r.y + r.h / 2 + 1);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x2 = r.x; x2 < r.x + r.w; x2 += 3) ctx.fillRect(x2, r.y, 1, r.h);
    ctx.restore();
  }

  drawWaiterTag(ctx) {
    const w = this.waiter, s = depthScale(Math.max(w.y, 445));
    const y = w.y - 92 * s - 8;
    ctx.font = '800 11px Nunito, sans-serif';
    const label = 'Phục vụ';
    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(47,125,79,0.92)';
    rr(ctx, w.x - tw / 2, y - 9, tw, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w.x, y + 1);
  }

  drawGlows(ctx, t, tvOn) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of BULBS) {
      const y = 14 + b.len + 12;
      glow(ctx, b.x, y, 120, 'rgba(255,170,80,0.22)', 0.9 + 0.1 * Math.sin(t * 3 + b.ph));
    }
    glowEll(ctx, 640, 600, 620, 160, 'rgba(255,150,70,0.10)');
    glow(ctx, 85, 340, 140, 'rgba(150,210,255,0.16)');
    glowEll(ctx, 1100, 450, 220, 40, 'rgba(255,170,90,0.18)');
    glow(ctx, 1100, 280, 180, 'rgba(255,170,90,0.14)');
    if (this.neonOn[0]) glow(ctx, 180, 120, 150, 'rgba(255,110,80,0.16)');
    if (this.neonOn[1]) glow(ctx, 1100, 118, 150, 'rgba(255,210,100,0.14)');
    glowEll(ctx, 640, 357, 300, 30, 'rgba(255,150,60,0.12)');
    // wok fire lights up the kitchen pass
    if (!this.chef.moving && this.chef.station === 'wok') {
      const cooking = t * 1000 < this.cookUntil;
      glow(ctx, STOVE_X, 304, cooking ? 150 : 80, 'rgba(255,130,40,0.35)', 0.75 + 0.25 * Math.sin(t * 17));
    }
    if (tvOn) {
      const flick = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 2.3);
      glow(ctx, 640, 180, 420, 'rgba(130,160,255,0.12)', flick);
      glowEll(ctx, 640, 480, 420, 70, 'rgba(140,170,255,0.12)', flick);
    }
    ctx.restore();
  }
}
