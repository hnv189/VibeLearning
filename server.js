const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');

// Must match FLOOR in public/js/scene.js (all scenes share it)
const FLOOR = { minX: 30, maxX: 1250, minY: 445, maxY: 700 };
const MAX_PLAYERS = 30;
const HOLD_MS = 120000;

// Must match MUSIC_TRACKS / AMBIENCE_LAYERS in public/js/audio.js
const MUSIC_PRESETS = ['lofi', 'jazz', 'rain-piano', 'bossa', 'acoustic', 'bolero', 'none'];
const AMBIENCE = ['sizzle', 'crowd', 'traffic', 'rain', 'crickets', 'birds', 'wind', 'cheers'];
const TABLE_DISH_MS = 30 * 60 * 1000;
const MAX_DISHES_PER_TABLE = 6;
const STYLES = ['short', 'long', 'bun', 'cap', 'curly'];
const STATUSES = ['chilling', 'studying', 'afk'];
const EMOTES = ['👋', '😊', '😂', '❤️', '☕', '📚', '🎵', '😴'];
// Must match ACTIONS / INTERACTIONS in public/js/main.js
const ACTIONS = ['dance', 'wave', 'clap', 'jump', 'cheers', 'puke', 'stop'];
const INTERACTIONS = ['wave', 'highfive', 'cheers', 'hug'];
const HEX = /^#[0-9a-fA-F]{6}$/;

const rooms = new Map();

// Each key must be a key of SCENES in public/js/main.js.
// serve: 'hand' = food goes into your hand; 'table' = a waiter brings it to one of `tables` tables
// (the count must match the tables drawn by that scene).
const SCENES = {
  'night-market': {
    label: '🍜 Night Market Corner',
    description: 'A noodle trolley under string lights. Grab a stool, chill, study.',
    thumb: '🍜',
    music: 'lofi',
    ambience: ['sizzle', 'crowd', 'traffic'],
    serve: 'hand',
    tables: 0,
    menu: [
      { id: 'pho', emoji: '🍜', name: 'Phở noodle soup' },
      { id: 'banhmi', emoji: '🥖', name: 'Bánh mì' },
      { id: 'skewer', emoji: '🍢', name: 'Grilled skewers' },
      { id: 'corn', emoji: '🌽', name: 'Grilled corn' },
      { id: 'tea', emoji: '🧋', name: 'Milk tea' },
    ],
  },
  'dalat-market': {
    label: '🌲 Chợ Đà Lạt',
    description: 'Cool highland afternoon on the market steps. Pine wind, birds, a fruit seller in her nón lá.',
    thumb: '🌲',
    music: 'acoustic',
    ambience: ['crowd', 'traffic', 'birds', 'wind'],
    serve: 'hand',
    tables: 0,
    menu: [
      { id: 'strawberry', emoji: '🍓', name: 'Đà Lạt strawberries' },
      { id: 'guava', emoji: '🍐', name: 'Fresh guava' },
      { id: 'soymilk', emoji: '🥛', name: 'Hot soy milk' },
      { id: 'banhtrang', emoji: '🍕', name: 'Bánh tráng nướng' },
      { id: 'avocado', emoji: '🥑', name: 'Avocado ice cream' },
    ],
  },
  nhau: {
    label: '🍻 Quán Nhậu 1-2-3 Dzô',
    description: 'Warm, buzzing beer place with a giant screen. Grab a table, call the waiter, dishes come to you.',
    thumb: '🍻',
    music: 'bolero',
    ambience: ['crowd', 'sizzle', 'traffic', 'cheers'],
    serve: 'table',
    tables: 8,
    menu: [
      { id: 'beer', emoji: '🍺', name: 'Tháp bia' },
      { id: 'lau', emoji: '🍲', name: 'Lẩu Thái' },
      { id: 'oc', emoji: '🐌', name: 'Ốc len xào dừa' },
      { id: 'muc', emoji: '🦑', name: 'Mực nướng sa tế' },
      { id: 'canhga', emoji: '🍗', name: 'Cánh gà chiên mắm' },
      { id: 'sodiep', emoji: '🦪', name: 'Sò điệp mỡ hành' },
      { id: 'nemchua', emoji: '🍢', name: 'Nem chua rán' },
      { id: 'lac', emoji: '🥜', name: 'Lạc rang' },
      { id: 'soda', emoji: '🥤', name: 'Nước ngọt' },
    ],
  },
};
const SCENE_LIST = Object.entries(SCENES).map(([id, sc]) => ({ id, label: sc.label }));

// put a room into a scene: its menu, serving style and tables come from the scene
function applyScene(r, sceneId) {
  const sc = SCENES[sceneId];
  r.scene = sceneId;
  r.menu = sc.menu;
  r.serve = sc.serve;
  r.tables = Array.from({ length: sc.tables }, () => []);
}

function createRoom({ id, name, scene }) {
  const sc = SCENES[scene];
  const amb = Object.fromEntries(AMBIENCE.map((k) => [k, sc.ambience.includes(k)]));
  const r = { id, name, homeScene: scene, players: new Map(), hostId: null, settings: { music: sc.music, ambience: amb, ytStartedAt: null } };
  applyScene(r, scene);
  rooms.set(id, r);
}

createRoom({ id: 'night-market', name: 'Night Market Corner', scene: 'night-market' });
createRoom({ id: 'cho-da-lat', name: 'Chợ Đà Lạt', scene: 'dalat-market' });
createRoom({ id: 'quan-nhau', name: 'Quán Nhậu 1-2-3 Dzô', scene: 'nhau' });

// a random free spot near the front of the floor (open in every scene)
const spawnPoint = () => ({ x: Math.round(160 + Math.random() * 960), y: Math.round(610 + Math.random() * 80) });

function roomPayload(r) {
  return { id: r.id, name: r.name, scene: r.scene, menu: r.menu, serve: r.serve, tables: publicTables(r), scenes: SCENE_LIST };
}

// Optional TURN/STUN servers for voice chat, as JSON, e.g.
// ICE_SERVERS='[{"urls":"turn:turn.example.com:3478","username":"u","credential":"p"}]'
const ICE_SERVERS = (() => {
  try {
    const v = JSON.parse(process.env.ICE_SERVERS || 'null');
    if (Array.isArray(v)) return v;
  } catch {}
  return [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
})();
const RTC_TYPES = ['offer', 'answer', 'ice'];

function publicTables(r) {
  const now = Date.now();
  return r.tables.map((list) =>
    list.filter((d) => d.until > now).map((d) => ({ emoji: d.emoji, name: d.name, by: d.by, ms: d.until - now, ago: now - d.at }))
  );
}

function listTracks() {
  try {
    return fs.readdirSync(AUDIO_DIR).filter((f) => /\.(mp3|ogg|wav|m4a|aac|flac)$/i.test(f));
  } catch {
    return [];
  }
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const cleanText = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

function cleanName(n) {
  return cleanText(n, 16) || 'Guest';
}

function cleanLook(l = {}) {
  const color = (v, d) => (typeof v === 'string' && HEX.test(v) ? v : d);
  return {
    skin: color(l.skin, '#f1c27d'),
    shirt: color(l.shirt, '#5ec8e5'),
    pants: color(l.pants, '#2f3b5c'),
    hair: color(l.hair, '#1f1a17'),
    style: STYLES.includes(l.style) ? l.style : 'short',
  };
}

function cleanSettings(s, prev) {
  const out = { music: prev.music, ambience: { ...prev.ambience }, ytStartedAt: prev.ytStartedAt };
  if (s && typeof s.music === 'string') {
    if (MUSIC_PRESETS.includes(s.music)) out.music = s.music;
    else if (s.music.startsWith('file:') && listTracks().includes(s.music.slice(5))) out.music = s.music;
    else if (/^yt:[\w-]{11}$/.test(s.music)) out.music = s.music;
  }
  if (out.music.startsWith('yt:')) {
    // restart the shared clock when the video changes or the host explicitly replays it
    if (out.music !== prev.music || (s && s.ytRestart)) out.ytStartedAt = Date.now();
  } else out.ytStartedAt = null;
  if (s && s.ambience && typeof s.ambience === 'object') {
    for (const k of AMBIENCE) if (k in s.ambience) out.ambience[k] = !!s.ambience[k];
  }
  return out;
}

// ytElapsed lets late joiners seek to where everyone else is, without relying on client clocks
function settingsPayload(r) {
  const s = r.settings;
  return { music: s.music, ambience: s.ambience, ytKey: s.ytStartedAt, ytElapsed: s.ytStartedAt ? Date.now() - s.ytStartedAt : 0 };
}

function publicPlayer(p) {
  const now = Date.now();
  return {
    id: p.id,
    name: p.name,
    look: p.look,
    x: p.x,
    y: p.y,
    status: p.status,
    holding: p.holding && p.holding.until > now ? { emoji: p.holding.emoji, ms: p.holding.until - now } : null,
    dancing: !!p.dancing,
    mic: !!p.mic,
  };
}

const app = express();
app.use(express.static(PUBLIC_DIR));

app.get('/api/rooms', (req, res) => {
  res.json(
    [...rooms.values()].map((r) => ({
      id: r.id,
      name: r.name,
      description: SCENES[r.scene].description,
      scene: r.scene,
      sceneLabel: SCENES[r.scene].label,
      moved: r.scene !== r.homeScene,
      thumb: SCENES[r.scene].thumb,
      count: r.players.size,
      max: MAX_PLAYERS,
    }))
  );
});

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  let room = null;
  let lastChat = 0;

  const me = () => room && room.players.get(socket.id);

  socket.on('join', (data = {}, ack) => {
    if (typeof ack !== 'function') return;
    if (room) return ack({ error: 'Already in a room' });
    const r = rooms.get(data.roomId);
    if (!r) return ack({ error: 'Room not found' });
    if (r.players.size >= MAX_PLAYERS) return ack({ error: 'Room is full — try again soon' });

    room = r;
    const p = {
      id: socket.id,
      name: cleanName(data.name),
      look: cleanLook(data.look),
      ...spawnPoint(),
      status: 'chilling',
      holding: null,
      mic: false,
    };
    r.players.set(socket.id, p);
    if (!r.hostId) r.hostId = socket.id;
    socket.join(r.id);
    socket.to(r.id).emit('playerJoined', publicPlayer(p));

    ack({
      selfId: socket.id,
      room: roomPayload(r),
      iceServers: ICE_SERVERS,
      hostId: r.hostId,
      settings: settingsPayload(r),
      tracks: listTracks(),
      players: [...r.players.values()].map(publicPlayer),
    });
  });

  socket.on('move', (pos = {}) => {
    const p = me();
    if (!p || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return;
    p.x = clamp(Math.round(pos.x), FLOOR.minX, FLOOR.maxX);
    p.y = clamp(Math.round(pos.y), FLOOR.minY, FLOOR.maxY);
    p.dancing = false;
    socket.to(room.id).emit('playerMoved', { id: p.id, x: p.x, y: p.y });
  });

  // body animations everyone sees; only dancing persists (until you walk)
  let lastAction = 0;
  socket.on('action', (kind) => {
    const p = me();
    const now = Date.now();
    if (!p || !ACTIONS.includes(kind) || now - lastAction < 400) return;
    lastAction = now;
    p.dancing = kind === 'dance';
    io.to(room.id).emit('action', { id: p.id, kind });
  });

  // 1-1 interactions between two players in the same room
  let lastInteract = 0;
  socket.on('interact', (data = {}) => {
    const p = me();
    const now = Date.now();
    if (!p || !INTERACTIONS.includes(data.kind) || now - lastInteract < 1000) return;
    if (data.to === p.id || !room.players.has(data.to)) return;
    lastInteract = now;
    io.to(room.id).emit('interact', { from: p.id, to: data.to, kind: data.kind });
  });

  // private messages: only the sender and the recipient receive them
  let lastDm = 0;
  socket.on('dm', (data = {}) => {
    const p = me();
    const now = Date.now();
    if (!p || now - lastDm < 300 || data.to === p.id || !room.players.has(data.to)) return;
    const text = cleanText(data.text, 300);
    if (!text) return;
    lastDm = now;
    const msg = { from: p.id, to: data.to, text };
    io.to(data.to).emit('dm', msg);
    socket.emit('dm', msg);
  });

  let lastPet = 0;
  socket.on('pet', (petId) => {
    const p = me();
    const now = Date.now();
    if (!p || typeof petId !== 'string' || petId.length > 20 || now - lastPet < 1500) return;
    lastPet = now;
    io.to(room.id).emit('pet', { id: p.id, pet: petId });
  });

  socket.on('chat', (text) => {
    const p = me();
    const now = Date.now();
    if (!p || now - lastChat < 400) return;
    const clean = cleanText(text, 140);
    if (!clean) return;
    lastChat = now;
    io.to(room.id).emit('chat', { id: p.id, text: clean });
  });

  socket.on('emote', (emote) => {
    const p = me();
    if (p && EMOTES.includes(emote)) io.to(room.id).emit('emote', { id: p.id, emote });
  });

  socket.on('status', (status) => {
    const p = me();
    if (!p || !STATUSES.includes(status)) return;
    p.status = status;
    io.to(room.id).emit('status', { id: p.id, status });
  });

  socket.on('order', (data) => {
    const p = me();
    const dishId = typeof data === 'string' ? data : data && data.dish;
    const dish = p && room.menu.find((d) => d.id === dishId);
    if (!dish) return;
    const now = Date.now();
    if (room.serve === 'table') {
      const table = data && data.table;
      if (!Number.isInteger(table) || table < 0 || table >= room.tables.length) return;
      const list = room.tables[table].filter((d) => d.until > now);
      list.push({ emoji: dish.emoji, name: dish.name, by: p.name, at: now, until: now + TABLE_DISH_MS });
      room.tables[table] = list.slice(-MAX_DISHES_PER_TABLE);
      io.to(room.id).emit('order', { id: p.id, emoji: dish.emoji, name: dish.name, ms: TABLE_DISH_MS, table, by: p.name });
      return;
    }
    p.holding = { emoji: dish.emoji, until: now + HOLD_MS };
    io.to(room.id).emit('order', { id: p.id, emoji: dish.emoji, name: dish.name, ms: HOLD_MS });
  });

  let lastWaiterCall = 0;
  socket.on('callWaiter', (table) => {
    const p = me();
    const now = Date.now();
    if (!p || room.serve !== 'table' || now - lastWaiterCall < 2000) return;
    if (!Number.isInteger(table) || table < 0 || table >= room.tables.length) return;
    lastWaiterCall = now;
    io.to(room.id).emit('waiter', { id: p.id, table });
  });

  socket.on('settings', (s) => {
    if (!room || room.hostId !== socket.id) return;
    room.settings = cleanSettings(s, room.settings);
    io.to(room.id).emit('settings', settingsPayload(room));
  });

  // the host moves the whole room to another scene; everyone stays connected
  let lastScene = 0;
  socket.on('changeScene', (sceneId) => {
    const now = Date.now();
    if (!room || room.hostId !== socket.id || !SCENES[sceneId] || sceneId === room.scene || now - lastScene < 3000) return;
    lastScene = now;
    applyScene(room, sceneId);
    for (const p of room.players.values()) {
      Object.assign(p, spawnPoint());
      p.holding = null;
      p.dancing = false;
    }
    io.to(room.id).emit('scene', {
      room: roomPayload(room),
      by: me().name,
      players: [...room.players.values()].map((p) => ({ id: p.id, x: p.x, y: p.y })),
    });
  });

  // voice chat: the browser streams audio peer-to-peer (WebRTC); the server only shows people
  // who's got their mic on and passes the connection setup messages between two players
  socket.on('mic', (on) => {
    const p = me();
    if (!p || typeof on !== 'boolean' || p.mic === on) return;
    p.mic = on;
    io.to(room.id).emit('mic', { id: p.id, on });
  });

  let rtcCount = 0, rtcWindow = 0;
  socket.on('rtc', (msg = {}) => {
    const p = me();
    if (!p || !msg || !RTC_TYPES.includes(msg.type) || !['speaker', 'listener'].includes(msg.role)) return;
    if (msg.to === p.id || !room.players.has(msg.to)) return;
    const now = Date.now();
    if (now - rtcWindow > 10000) {
      rtcWindow = now;
      rtcCount = 0;
    }
    if (++rtcCount > 600) return;
    let data;
    try {
      data = JSON.stringify(msg.data);
    } catch {
      return;
    }
    if (!data || data.length > 20000) return;
    io.to(msg.to).emit('rtc', { from: p.id, type: msg.type, role: msg.role, data: msg.data });
  });

  socket.on('giveHost', (targetId) => {
    if (!room || room.hostId !== socket.id || !room.players.has(targetId)) return;
    room.hostId = targetId;
    io.to(room.id).emit('host', { hostId: targetId });
  });

  socket.on('disconnect', () => {
    if (!room) return;
    room.players.delete(socket.id);
    if (room.hostId === socket.id) {
      const next = room.players.keys().next();
      room.hostId = next.done ? null : next.value;
    }
    io.to(room.id).emit('playerLeft', { id: socket.id, hostId: room.hostId });
    room = null;
  });
});

server.listen(PORT, () => {
  console.log(`Vibe Street is open at http://localhost:${PORT}`);
});
