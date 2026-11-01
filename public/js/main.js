import { AudioEngine, MUSIC_TRACKS, AMBIENCE_LAYERS } from './audio.js';
import { NightMarketScene, W, H, drawPerson, depthScale } from './scene.js';
import { DalatScene } from './dalat.js';
import { NhauScene } from './nhau.js';
import { YouTubeMusic, parseYouTubeId } from './youtube.js';

const $ = (sel) => document.querySelector(sel);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const LOOK = {
  skin: ['#ffdfc4', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21'],
  shirt: ['#ff7a7a', '#ffb84d', '#ffe066', '#7bd389', '#5ec8e5', '#7a8cff', '#c38bff', '#f4f4f4', '#3b3b48'],
  pants: ['#2f3b5c', '#4a4a55', '#6b4f3a', '#2e5e4e', '#8a8fa3', '#1f1f28'],
  hair: ['#1f1a17', '#4a2f1f', '#8a5a2b', '#d9a441', '#c94f4f', '#7d6bd6', '#e8e8e8'],
  style: ['short', 'long', 'bun', 'cap', 'curly'],
};
const STYLE_LABELS = { short: 'Short', long: 'Long', bun: 'Bun', cap: 'Cap', curly: 'Curly' };
// Keys are the `scene` field of rooms in server.js
const SCENES = { 'night-market': NightMarketScene, 'dalat-market': DalatScene, nhau: NhauScene };
// Must match EMOTES in server.js
const EMOTES = ['👋', '😊', '😂', '❤️', '☕', '📚', '🎵', '😴'];
const STATUS_ICON = { chilling: '😌', studying: '📖', afk: '💤' };
// Must match ACTIONS / INTERACTIONS in server.js. `secs`: how long the animation plays (dance loops until you walk).
const ACTIONS = {
  dance: { label: '💃 Dance', secs: Infinity },
  wave: { label: '👋 Wave', secs: 2.4 },
  clap: { label: '👏 Clap', secs: 2.4 },
  jump: { label: '🦘 Jump', secs: 0.9 },
  cheers: { label: '🍻 Raise a glass', secs: 2.2 },
};
const INTERACTIONS = {
  wave: { label: '👋 Wave at', anim: 'wave', emoji: '👋', verb: 'waved at', walk: false },
  highfive: { label: '🙌 High-five', anim: 'highfive', emoji: '🙌', verb: 'high-fived', walk: true },
  cheers: { label: '🍻 Cheers', anim: 'cheers', emoji: '🍻', verb: 'clinked glasses with', walk: true },
  hug: { label: '🤗 Hug', anim: 'hug', emoji: '🤗', verb: 'hugged', walk: true },
};
const ANIM_SECS = { highfive: 1.4, hug: 2.2 };
const MOVE_KEYS = { arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1] };
const WALK_SPEED = 150;

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('vibe:' + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('vibe:' + k, JSON.stringify(v));
    } catch {}
  },
};

const randomLook = () => ({ skin: pick(LOOK.skin), shirt: pick(LOOK.shirt), pants: pick(LOOK.pants), hair: pick(LOOK.hair), style: pick(LOOK.style) });
const profile = store.get('profile', null) || { name: '', look: randomLook() };
const prefs = store.get('prefs', { music: 70, ambience: 80 });
const saveProfile = () => store.set('profile', profile);

const canvas = $('#game');
const ctx = canvas.getContext('2d');
const preview = $('#preview');
const pctx = preview.getContext('2d');
let scene = new NightMarketScene();
let sceneId = 'night-market';

function setScene(id) {
  if (id === sceneId || !SCENES[id]) return;
  sceneId = id;
  scene = new SCENES[id]();
  placeTV();
}
const audio = new AudioEngine();
audio.setVolumes(prefs.music / 100, prefs.ambience / 100);
const yt = new YouTubeMusic($('#tv'), 'yt-player', {
  onTitle: (title) => {
    state.ytTitle = title;
    renderVibe();
  },
  onError: (code) =>
    toast(
      code === 101 || code === 150
        ? 'That video doesn’t allow embedding. Try another'
        : code === 100
          ? 'That video is unavailable or private'
          : 'YouTube couldn’t play that video'
    ),
});
yt.setVolume(prefs.music);

const state = {
  socket: null,
  roomId: null,
  selectedRoom: null,
  joined: false,
  welcomed: false,
  selfId: null,
  hostId: null,
  settings: null,
  tracks: [],
  players: new Map(),
  pending: null,
  keys: new Set(),
  keyMoving: false,
  lastSend: 0,
  tab: null,
  dms: new Map(), // peerId -> [{ mine, text } | { system, text }]
  unread: new Map(), // peerId -> count
  dmPeer: null,
};
let view = { dpr: 1, scale: 1, ox: 0, oy: 0 };

// ---------- canvas sizing ----------

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = window.innerWidth, ch = window.innerHeight;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  const scale = Math.min(cw / W, ch / H);
  view = { dpr, scale, ox: (cw - W * scale) / 2, oy: (ch - H * scale) / 2 };
  placeTV();
}

// lay the YouTube player exactly over the scene's TV screen
function placeTV() {
  const r = scene.tvRect, tv = $('#tv').style;
  if (!r) return;
  tv.left = view.ox + r.x * view.scale + 'px';
  tv.top = view.oy + r.y * view.scale + 'px';
  tv.width = r.w * view.scale + 'px';
  tv.height = r.h * view.scale + 'px';
}
window.addEventListener('resize', resize);
resize();

function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left - view.ox) / view.scale, y: (e.clientY - r.top - view.oy) / view.scale };
}

// ---------- players ----------

function addPlayer(p) {
  state.players.set(p.id, {
    id: p.id,
    name: p.name,
    look: p.look,
    x: p.x,
    y: p.y,
    tx: p.x,
    ty: p.y,
    status: p.status,
    holding: p.holding ? { emoji: p.holding.emoji, until: performance.now() + p.holding.ms } : null,
    phase: 0,
    moving: false,
    sitting: false,
    facing: Math.random() < 0.5 ? -1 : 1,
    seed: Math.random() * 10,
    bubble: null,
    emote: null,
    action: p.dancing ? { kind: 'dance', start: performance.now() / 1000 } : null,
  });
}

const me = () => state.players.get(state.selfId);

function sendMove(p) {
  state.lastSend = performance.now();
  state.socket.emit('move', { x: p.tx, y: p.ty });
}

function setTarget(p, x, y) {
  p.tx = x;
  p.ty = y;
  sendMove(p);
}

function stoolTaken(stool) {
  for (const p of state.players.values()) {
    if (p.id !== state.selfId && Math.abs(p.tx - stool.x) < 2 && Math.abs(p.ty - stool.y) < 2) return true;
  }
  return false;
}

// the table you're sitting at, in table-service rooms
function myTable() {
  const self = me();
  if (!self || !self.sitting) return null;
  const seat = scene.seats.find((s) => s.table != null && Math.abs(s.x - self.x) < 2 && Math.abs(s.y - self.y) < 2);
  return seat ? seat.table : null;
}

function callWaiter() {
  const table = myTable();
  if (table == null) return toast('Ngồi vào bàn trước rồi gọi phục vụ nha 🙂');
  const now = performance.now();
  if (now - (state.lastWaiterCall || 0) < 2500) return;
  state.lastWaiterCall = now;
  state.socket.emit('callWaiter', table);
}

// walk somewhere, then do `pending` on arrival (or right away if already there)
function goDo(x, y, pending) {
  const self = me();
  state.pending = pending;
  if (Math.abs(self.x - x) < 2 && Math.abs(self.y - y) < 2) arrived(self);
  else setTarget(self, x, y);
}

function arrived(p) {
  const pend = state.pending;
  state.pending = null;
  if (pend === 'order') {
    p.facing = 1;
    openMenu();
  } else if (pend && pend.kind === 'interact') {
    if (state.players.has(pend.to)) state.socket.emit('interact', { to: pend.to, kind: pend.what });
  } else if (pend && pend.kind === 'pet') {
    state.socket.emit('pet', pend.id);
  }
}

function playerAt(x, y) {
  const others = [...state.players.values()].filter((p) => p.id !== state.selfId).sort((a, b) => b.y - a.y);
  return others.find((p) => {
    const s = depthScale(p.y);
    return Math.abs(x - p.x) < 16 * s && y > p.y - 88 * s && y < p.y + 4;
  });
}

function handleKeys(p, now) {
  let vx = 0, vy = 0;
  for (const k of state.keys) {
    const d = MOVE_KEYS[k];
    if (d) {
      vx += d[0];
      vy += d[1];
    }
  }
  if (vx || vy) {
    const n = Math.hypot(vx, vy);
    const c = scene.clamp(p.x + (vx / n) * 24, p.y + (vy / n) * 24);
    p.tx = c.x;
    p.ty = c.y;
    state.pending = null;
    closeMenu();
    state.keyMoving = true;
    if (now - state.lastSend > 100) sendMove(p);
  } else if (state.keyMoving) {
    state.keyMoving = false;
    p.tx = p.x;
    p.ty = p.y;
    sendMove(p);
  }
}

function update(dt, now) {
  const self = me();
  if (self && state.joined) handleKeys(self, now);
  for (const p of state.players.values()) {
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const step = Math.min(d, WALK_SPEED * dt);
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      p.moving = true;
      p.phase += dt * 11;
      if (Math.abs(dx) > 1) p.facing = dx > 0 ? 1 : -1;
    } else {
      p.x = p.tx;
      p.y = p.ty;
      if (p.moving) {
        p.moving = false;
        if (p.id === state.selfId) arrived(p);
      }
    }
    p.sitting = !p.moving && scene.seats.some((s) => Math.abs(s.x - p.x) < 2 && Math.abs(s.y - p.y) < 2);
    if (p.holding && now > p.holding.until) p.holding = null;
    if (p.bubble && now > p.bubble.until) p.bubble = null;
    if (p.emote && now - p.emote.start > 2200) p.emote = null;
    if (p.action) {
      const secs = (ACTIONS[p.action.kind] || {}).secs || ANIM_SECS[p.action.kind] || 2;
      if (p.moving || now / 1000 - p.action.start > secs) p.action = null;
    }
  }
}

// ---------- render loop ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt, now);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0c0a16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const k = view.dpr * view.scale;
  ctx.setTransform(k, 0, 0, k, view.dpr * view.ox, view.dpr * view.oy);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  const raining = !!(state.joined && state.settings && state.settings.ambience.rain);
  scene.update(dt, raining);
  const tvOn = !!(state.joined && state.settings && state.settings.music.startsWith('yt:'));
  scene.draw(ctx, now, [...state.players.values()], {
    selfId: state.selfId,
    hostId: state.hostId,
    tv: { on: tvOn, title: state.ytTitle },
  });
  ctx.restore();

  if (!$('#landing').hidden) drawPreview(now);
  requestAnimationFrame(frame);
}

function drawPreview(now) {
  pctx.clearRect(0, 0, preview.width, preview.height);
  const t = now / 1000;
  drawPerson(pctx, { x: preview.width / 2, y: preview.height - 30, look: profile.look, facing: Math.sin(t * 0.6) > 0 ? 1 : -1, seed: 0 }, 3.2, t);
}

// ---------- lobby ----------

function buildSwatches(key) {
  const box = $('#opt-' + key);
  box.innerHTML = '';
  for (const color of LOOK[key]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = color;
    b.dataset.value = color;
    b.setAttribute('aria-label', `${key} ${color}`);
    b.onclick = () => {
      profile.look[key] = color;
      saveProfile();
      markSelected(key);
    };
    box.appendChild(b);
  }
  markSelected(key);
}

function buildStyles() {
  const box = $('#opt-style');
  box.innerHTML = '';
  for (const s of LOOK.style) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = STYLE_LABELS[s];
    b.dataset.value = s;
    b.onclick = () => {
      profile.look.style = s;
      saveProfile();
      markSelected('style');
    };
    box.appendChild(b);
  }
  markSelected('style');
}

function markSelected(key) {
  document.querySelectorAll(`#opt-${key} [data-value]`).forEach((b) => b.classList.toggle('selected', b.dataset.value === profile.look[key]));
}

function selectRoom(id) {
  state.selectedRoom = id;
  document.querySelectorAll('.room-card[data-id]').forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
  // preview the room's scene behind the lobby
  const room = (state.rooms || []).find((r) => r.id === id);
  if (room) setScene(room.scene);
}

async function loadRooms() {
  const list = $('#room-list');
  try {
    const rooms = await fetch('/api/rooms').then((r) => r.json());
    state.rooms = rooms;
    list.innerHTML = '';
    for (const r of rooms) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'room-card';
      card.dataset.id = r.id;
      card.innerHTML = '<div class="room-thumb"></div><div class="room-info"><strong></strong><p></p><span class="room-count"></span></div>';
      card.querySelector('.room-thumb').textContent = r.thumb;
      card.querySelector('strong').textContent = r.name;
      card.querySelector('p').textContent = r.description;
      card.querySelector('.room-count').textContent = r.count === 0 ? 'Empty, be the first (you’ll host)' : `${r.count} / ${r.max} hanging out`;
      card.onclick = () => selectRoom(r.id);
      list.appendChild(card);
    }
    const soon = document.createElement('div');
    soon.className = 'room-card soon';
    soon.innerHTML = '<div class="room-thumb">🌧️</div><div class="room-info"><strong>More rooms soon</strong><p>Rainy ramen alley, rooftop café, night train…</p></div>';
    list.appendChild(soon);
    selectRoom(state.selectedRoom || (rooms[0] && rooms[0].id));
  } catch {
    list.innerHTML = '<p class="muted">Can’t reach the server. Is it running?</p>';
  }
}

function initLanding() {
  $('#name').value = profile.name;
  ['skin', 'shirt', 'pants', 'hair'].forEach(buildSwatches);
  buildStyles();
  $('#shuffle').onclick = () => {
    profile.look = randomLook();
    saveProfile();
    ['skin', 'shirt', 'pants', 'hair', 'style'].forEach(markSelected);
  };
  $('#join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.selectedRoom) return toast('Pick a room first');
    profile.name = $('#name').value.trim().slice(0, 16) || 'Guest';
    saveProfile();
    audio.init();
    $('#join-btn').disabled = true;
    connectAndJoin(state.selectedRoom);
  });
  loadRooms();
}

// ---------- networking ----------

function connectAndJoin(roomId) {
  state.roomId = roomId;
  if (!state.socket) {
    state.socket = io({ autoConnect: false });
    bindSocket(state.socket);
  }
  if (state.socket.connected) sendJoin();
  else state.socket.connect();
}

function sendJoin() {
  state.socket.emit('join', { roomId: state.roomId, name: profile.name, look: profile.look }, (res) => {
    if (!res || res.error) {
      toast(res ? res.error : 'Could not join');
      leaveRoom();
      return;
    }
    enterRoom(res);
  });
}

function bindSocket(s) {
  s.on('connect', () => {
    if (state.roomId) sendJoin();
  });
  s.on('connect_error', () => {
    if (!state.joined) {
      toast('Can’t connect to the server');
      s.disconnect();
      state.roomId = null;
      $('#join-btn').disabled = false;
    }
  });
  s.on('disconnect', (reason) => {
    if (state.roomId && reason !== 'io client disconnect') $('#reconnect').hidden = false;
  });
  s.on('playerJoined', (p) => {
    addPlayer(p);
    renderPeople();
    log(`${p.name} pulled up a stool.`);
  });
  s.on('playerLeft', ({ id, hostId }) => {
    const p = state.players.get(id);
    state.players.delete(id);
    if (p) log(`${p.name} headed home.`);
    if (p && state.dmPeer === id) {
      addDm(id, { system: true, text: `${p.name} left the room` });
      $('#dm-input').disabled = true;
    }
    if (playerMenuFor === id) closePopovers();
    setHost(hostId);
  });
  s.on('action', ({ id, kind }) => {
    const p = state.players.get(id);
    if (!p) return;
    p.action = kind === 'stop' ? null : { kind, start: performance.now() / 1000 };
    if (id === state.selfId) $('#action-btn').classList.toggle('active', kind === 'dance');
  });
  s.on('interact', ({ from, to, kind }) => {
    const a = state.players.get(from), b = state.players.get(to);
    const meta = INTERACTIONS[kind];
    if (!a || !b || !meta) return;
    const now = performance.now();
    a.facing = b.x >= a.x ? 1 : -1;
    b.facing = -a.facing;
    a.action = { kind: meta.anim, start: now / 1000 };
    if (kind !== 'wave') b.action = { kind: meta.anim, start: now / 1000 };
    const top = Math.min(a.y - 80 * depthScale(a.y), b.y - 80 * depthScale(b.y));
    scene.addFx(meta.emoji, kind === 'wave' ? a.x : (a.x + b.x) / 2, top, now, { size: 30, rise: 30 });
    log(`${a.name} ${meta.verb} ${b.name} ${meta.emoji}`);
  });
  s.on('dm', ({ from, to, text }) => {
    const mine = from === state.selfId;
    const peer = mine ? to : from;
    addDm(peer, { mine, text });
    if (!mine && state.dmPeer !== peer) {
      const p = state.players.get(from);
      const name = p ? p.name : 'Someone';
      state.unread.set(peer, (state.unread.get(peer) || 0) + 1);
      log(`(private) ${text}`, name, p ? p.look.shirt : '#ffc6d9', () => openDm(peer), 'private');
      toast(`💬 ${name}: ${text.length > 40 ? text.slice(0, 40) + '…' : text}`);
      renderPeople();
    }
  });
  s.on('pet', ({ id, pet }) => {
    const now = performance.now();
    const animal = scene.petReact(pet, now);
    if (!animal) return;
    audio.petSound(animal.kind);
    const p = state.players.get(id);
    if (p) p.facing = animal.x >= p.x ? 1 : -1;
  });
  s.on('playerMoved', ({ id, x, y }) => {
    const p = state.players.get(id);
    if (p && id !== state.selfId) {
      p.tx = x;
      p.ty = y;
    }
  });
  s.on('chat', ({ id, text }) => {
    const p = state.players.get(id);
    if (!p) return;
    p.bubble = { text, until: performance.now() + 5000 + text.length * 60 };
    log(text, p.name, p.look.shirt);
  });
  s.on('emote', ({ id, emote }) => {
    const p = state.players.get(id);
    if (p) p.emote = { e: emote, start: performance.now() };
  });
  s.on('status', ({ id, status }) => {
    const p = state.players.get(id);
    if (!p) return;
    p.status = status;
    if (id === state.selfId) $('#status').value = status;
    renderPeople();
  });
  s.on('order', ({ id, emoji, name, ms, table, by }) => {
    if (table != null && scene.addDish) {
      // table service: the waiter fetches it from the kitchen and sets it on the table
      scene.addDish(table, { emoji, name, by, ms }, performance.now());
      audio.sizzleBurst();
      log(`🔔 Bàn ${table + 1} · ${by}: ${name} ${emoji}`);
      return;
    }
    const p = state.players.get(id);
    if (!p) return;
    p.holding = { emoji, until: performance.now() + ms };
    scene.vendorSay(id === state.selfId ? `${name}, coming right up! ${emoji}` : `${name} for ${p.name}! ${emoji}`, performance.now());
  });
  s.on('waiter', ({ id, table }) => {
    if (!scene.callWaiter) return;
    const mine = id === state.selfId;
    scene.callWaiter(table, mine ? () => openMenu(table) : null);
  });
  s.on('settings', applySettings);
  s.on('host', ({ hostId }) => setHost(hostId));
}

function enterRoom(res) {
  state.joined = true;
  state.selfId = res.selfId;
  state.hostId = res.hostId;
  state.tracks = res.tracks || [];
  state.menu = res.room.menu;
  state.serve = res.room.serve || 'hand';
  setScene(res.room.scene);
  if (scene.setTables) scene.setTables(res.room.tables || []);
  $('#order-menu h3').textContent = scene.menuTitle;
  $('#hint').textContent = scene.hint;
  state.players.clear();
  res.players.forEach(addPlayer);
  $('#landing').hidden = true;
  $('#room-ui').hidden = false;
  $('#reconnect').hidden = true;
  $('#join-btn').disabled = false;
  $('#room-name').textContent = res.room.name;
  $('#status').value = 'chilling';
  applySettings(res.settings);
  renderPeople();
  if (!state.welcomed) {
    state.welcomed = true;
    scene.vendorSay(scene.greeting(profile.name), performance.now());
    log(`You joined ${res.room.name}.`);
    if (state.hostId === state.selfId) log('You’re the host 👑. Open 🎵 Vibe to pick the music and street sounds.');
    if (state.tab == null && window.innerWidth > 900) openTab('vibe');
    setTimeout(() => $('#hint').classList.add('fade'), 12000);
  }
}

function leaveRoom() {
  state.roomId = null;
  state.joined = false;
  state.welcomed = false;
  if (state.socket) state.socket.disconnect();
  state.players.clear();
  state.selfId = null;
  state.pending = null;
  closeMenu();
  closePopovers();
  closeDm();
  state.dms.clear();
  state.unread.clear();
  $('#action-btn').classList.remove('active');
  audio.stopAll();
  yt.stop();
  setTheater(false);
  $('#room-ui').hidden = true;
  $('#landing').hidden = false;
  $('#reconnect').hidden = true;
  $('#join-btn').disabled = false;
  $('#hint').classList.remove('fade');
  $('#chat-log').innerHTML = '';
  loadRooms();
}

function setHost(id) {
  const changed = id !== state.hostId;
  state.hostId = id;
  renderVibe();
  renderPeople();
  if (changed && id === state.selfId) log('You’re now the host 👑. You control the vibe.');
}

function applySettings(st) {
  state.settings = st;
  audio.setMusic(st.music);
  audio.setAmbience(st.ambience);
  if (st.music.startsWith('yt:')) yt.play(st.music.slice(3), st.ytElapsed, st.ytKey);
  else {
    yt.stop();
    setTheater(false);
    state.ytTitle = null;
  }
  renderVibe();
}

function sendSettings(partial) {
  state.socket.emit('settings', { ...state.settings, ...partial });
}

function setStatus(status) {
  $('#status').value = status;
  if (state.joined) state.socket.emit('status', status);
}

// ---------- panels ----------

function openTab(tab) {
  state.tab = tab;
  $('#panel').hidden = !tab;
  document.querySelectorAll('.tab').forEach((el) => (el.hidden = el.id !== 'tab-' + tab));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
}

function renderVibe() {
  const st = state.settings;
  if (!st) return;
  const isHost = state.selfId === state.hostId;
  const host = state.players.get(state.hostId);
  $('#host-note').textContent = isHost ? '👑 You’re the host. Pick the vibe for everyone.' : `👑 ${host ? host.name : 'The host'} is picking the vibe.`;

  const sel = $('#music-select');
  sel.innerHTML = '';
  for (const tr of MUSIC_TRACKS) sel.add(new Option(tr.label, tr.id));
  for (const f of state.tracks) sel.add(new Option('🎧 ' + f.replace(/\.[^.]+$/, ''), 'file:' + f));
  if (st.music.startsWith('yt:')) sel.add(new Option('▶ ' + (state.ytTitle || 'YouTube video'), st.music));
  sel.value = st.music;
  sel.disabled = !isHost;
  $('#yt-form').hidden = !isHost;

  const box = $('#ambience-list');
  box.innerHTML = '';
  for (const a of AMBIENCE_LAYERS) {
    const lab = document.createElement('label');
    lab.className = 'toggle' + (isHost ? '' : ' readonly');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!st.ambience[a.id];
    cb.disabled = !isHost;
    cb.onchange = () => sendSettings({ ambience: { ...state.settings.ambience, [a.id]: cb.checked } });
    const text = document.createElement('span');
    text.textContent = `${a.icon} ${a.label}`;
    lab.append(cb, text);
    box.appendChild(lab);
  }
}

function renderPeople() {
  const ul = $('#people-list');
  ul.innerHTML = '';
  const isHost = state.selfId === state.hostId;
  for (const p of state.players.values()) {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = p.look.shirt;
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = `${p.id === state.hostId ? '👑 ' : ''}${p.name}${p.id === state.selfId ? ' (you)' : ''}`;
    const st = document.createElement('span');
    st.textContent = STATUS_ICON[p.status] || '';
    st.title = p.status;
    li.append(dot, who, st);
    if (p.id !== state.selfId) {
      const unread = state.unread.get(p.id) || 0;
      if (unread) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = unread;
        li.appendChild(badge);
      }
      const msg = document.createElement('button');
      msg.className = 'ghost';
      msg.textContent = '💬';
      msg.title = `Message ${p.name}`;
      msg.onclick = () => openDm(p.id);
      li.appendChild(msg);
    }
    if (isHost && p.id !== state.selfId) {
      const b = document.createElement('button');
      b.className = 'ghost';
      b.textContent = 'Make host';
      b.onclick = () => state.socket.emit('giveHost', p.id);
      li.appendChild(b);
    }
    ul.appendChild(li);
  }
  const n = state.players.size;
  $('#room-count').textContent = `· ${n} here`;
}

function log(text, name, color, onClick, extraClass) {
  const box = $('#chat-log');
  const line = document.createElement('div');
  line.className = (name ? 'line' : 'line system') + (extraClass ? ' ' + extraClass : '');
  if (onClick) {
    line.classList.add('clickable');
    line.onclick = onClick;
  }
  if (name) {
    const b = document.createElement('b');
    b.textContent = name + ': ';
    b.style.color = readable(color);
    line.appendChild(b);
  }
  line.appendChild(document.createTextNode(text));
  box.appendChild(line);
  while (box.children.length > 60) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
}

// ---------- moves, people menu, private chat ----------

let playerMenuFor = null;

function closePopovers() {
  $('#action-menu').hidden = true;
  $('#player-menu').hidden = true;
  playerMenuFor = null;
}

// keep a popover on screen near a point
function placePopover(el, clientX, clientY) {
  el.hidden = false;
  const r = el.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, clientX - r.width / 2)) + 'px';
  el.style.top = Math.max(8, Math.min(window.innerHeight - r.height - 8, clientY)) + 'px';
}

function openActionMenu() {
  const menu = $('#action-menu');
  if (!menu.hidden) return closePopovers();
  closePopovers();
  menu.innerHTML = '';
  const self = me();
  const dancing = self && self.action && self.action.kind === 'dance';
  for (const [kind, meta] of Object.entries(ACTIONS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = kind === 'dance' && dancing ? '🛑 Stop dancing' : meta.label;
    b.onclick = () => {
      state.socket.emit('action', kind === 'dance' && dancing ? 'stop' : kind);
      closePopovers();
    };
    menu.appendChild(b);
  }
  const r = $('#action-btn').getBoundingClientRect();
  menu.hidden = false;
  placePopover(menu, r.left + r.width / 2, r.top - menu.getBoundingClientRect().height - 8);
}

function openPlayerMenu(p, clientX, clientY) {
  closePopovers();
  playerMenuFor = p.id;
  $('#pm-dot').style.background = p.look.shirt;
  $('#pm-name').textContent = p.name;
  const box = $('#pm-items');
  box.innerHTML = '';
  const add = (label, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.onclick = () => {
      closePopovers();
      fn();
    };
    box.appendChild(b);
  };
  add('💬 Private chat', () => openDm(p.id));
  for (const [kind, meta] of Object.entries(INTERACTIONS)) {
    add(meta.label, () => {
      const target = state.players.get(p.id);
      if (!target) return;
      if (!meta.walk) return state.socket.emit('interact', { to: p.id, kind });
      // walk up next to them first, on the side you're coming from
      const self = me();
      const side = self.x <= target.x ? -1 : 1;
      const spot = scene.clamp(target.x + side * 34 * depthScale(target.y), target.y + 1);
      goDo(spot.x, spot.y, { kind: 'interact', to: p.id, what: kind });
    });
  }
  placePopover($('#player-menu'), clientX, clientY + 12);
}

function addDm(peer, msg) {
  if (!state.dms.has(peer)) state.dms.set(peer, []);
  const list = state.dms.get(peer);
  list.push(msg);
  if (list.length > 100) list.shift();
  if (state.dmPeer === peer) renderDm();
}

function openDm(peer) {
  const p = state.players.get(peer);
  if (!p) return toast('They’ve left the room');
  state.dmPeer = peer;
  state.unread.delete(peer);
  $('#dm-name').textContent = p.name;
  $('#dm-input').disabled = false;
  $('#dm-box').hidden = false;
  renderDm();
  renderPeople();
  $('#dm-input').focus();
}

function closeDm() {
  state.dmPeer = null;
  $('#dm-box').hidden = true;
}

function renderDm() {
  const box = $('#dm-messages');
  box.innerHTML = '';
  const list = state.dms.get(state.dmPeer) || [];
  if (!list.length) {
    const hint = document.createElement('div');
    hint.className = 'dm-msg system';
    hint.textContent = 'Only the two of you can see these messages.';
    box.appendChild(hint);
  }
  for (const m of list) {
    const div = document.createElement('div');
    div.className = 'dm-msg' + (m.system ? ' system' : m.mine ? ' mine' : '');
    div.textContent = m.text;
    box.appendChild(div);
  }
  box.scrollTop = box.scrollHeight;
}

function readable(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum < 0.45 ? '#ffd36b' : hex;
}

let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2800);
}

// `table` is set in table-service rooms: the order goes to that table
function openMenu(table = null) {
  const box = $('#menu-items');
  box.innerHTML = '';
  for (const m of state.menu || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-item';
    const em = document.createElement('span');
    em.className = 'em';
    em.textContent = m.emoji;
    const label = document.createElement('span');
    label.textContent = m.name;
    b.append(em, label);
    b.onclick = () => {
      state.socket.emit('order', table == null ? m.id : { dish: m.id, table });
      closeMenu();
    };
    box.appendChild(b);
  }
  $('#order-menu').hidden = false;
}

function closeMenu() {
  $('#order-menu').hidden = true;
}

function setTheater(on) {
  $('#tv').classList.toggle('theater', on);
  const b = $('#tv-expand');
  b.textContent = on ? '⤡ Back to the street' : '⤢';
  b.title = on ? 'Back to the street' : 'Big screen';
}

// ---------- focus timer ----------

const focus = { preset: '25/5', mode: 'focus', running: false, endAt: 0, left: 25 * 60 };

function focusLen(mode) {
  const [f, b] = focus.preset.split('/').map(Number);
  return (mode === 'focus' ? f : b) * 60;
}

function fmt(sec) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function renderFocus() {
  $('#focus-time').textContent = fmt(focus.left);
  const mode = $('#focus-mode');
  mode.textContent = focus.mode === 'focus' ? 'Focus' : 'Break';
  mode.classList.toggle('break', focus.mode === 'break');
  $('#focus-start').textContent = focus.running ? 'Pause' : 'Start';
  const chip = $('#focus-chip');
  chip.hidden = !focus.running;
  chip.textContent = `${focus.mode === 'focus' ? '📖' : '☕'} ${fmt(focus.left)}`;
}

function switchMode(auto) {
  focus.mode = focus.mode === 'focus' ? 'break' : 'focus';
  focus.left = focusLen(focus.mode);
  if (focus.running) focus.endAt = Date.now() + focus.left * 1000;
  if (auto) {
    audio.chime();
    toast(focus.mode === 'break' ? 'Nice work! Take a break ☕' : 'Break’s over. Back to it 📖');
  }
  setStatus(focus.mode === 'focus' && focus.running ? 'studying' : 'chilling');
  renderFocus();
}

function initFocus() {
  $('#focus-start').onclick = () => {
    if (focus.running) {
      focus.running = false;
      focus.left = Math.max(0, Math.ceil((focus.endAt - Date.now()) / 1000));
    } else {
      audio.init();
      focus.running = true;
      focus.endAt = Date.now() + focus.left * 1000;
      if (focus.mode === 'focus') setStatus('studying');
    }
    renderFocus();
  };
  $('#focus-skip').onclick = () => switchMode(false);
  $('#focus-reset').onclick = () => {
    focus.running = false;
    focus.mode = 'focus';
    focus.left = focusLen('focus');
    renderFocus();
  };
  $('#focus-preset').onchange = (e) => {
    focus.preset = e.target.value;
    if (!focus.running) focus.left = focusLen(focus.mode);
    renderFocus();
  };
  setInterval(() => {
    if (!focus.running) return;
    focus.left = Math.max(0, Math.ceil((focus.endAt - Date.now()) / 1000));
    if (focus.left <= 0) switchMode(true);
    renderFocus();
  }, 250);
  renderFocus();
}

// ---------- input ----------

function initRoomUI() {
  document.querySelectorAll('.tab-btn').forEach((b) => (b.onclick = () => openTab(state.tab === b.dataset.tab ? null : b.dataset.tab)));
  $('#leave-btn').onclick = leaveRoom;
  $('#menu-close').onclick = closeMenu;
  $('#tv-expand').onclick = () => setTheater(!$('#tv').classList.contains('theater'));

  $('#music-select').onchange = (e) => sendSettings({ music: e.target.value });
  $('#yt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseYouTubeId($('#yt-url').value);
    if (!id) return toast('That doesn’t look like a YouTube link');
    sendSettings({ music: 'yt:' + id, ytRestart: true });
    $('#yt-url').value = '';
  });

  const vm = $('#vol-music'), va = $('#vol-amb');
  vm.value = prefs.music;
  va.value = prefs.ambience;
  const onVol = () => {
    prefs.music = +vm.value;
    prefs.ambience = +va.value;
    audio.setVolumes(prefs.music / 100, prefs.ambience / 100);
    yt.setVolume(prefs.music);
    store.set('prefs', prefs);
  };
  vm.oninput = onVol;
  va.oninput = onVol;

  const emotes = $('#emotes');
  for (const e of EMOTES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e;
    b.title = 'Emote';
    b.onclick = () => state.socket.emit('emote', e);
    emotes.appendChild(b);
  }

  $('#status').onchange = (e) => setStatus(e.target.value);

  $('#action-btn').onclick = openActionMenu;
  $('#dm-close').onclick = closeDm;
  $('#dm-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#dm-input');
    const text = input.value.trim();
    if (text && state.dmPeer && state.players.has(state.dmPeer)) state.socket.emit('dm', { to: state.dmPeer, text });
    input.value = '';
  });
  // clicking anywhere else closes the little menus (canvas clicks handle this themselves)
  document.addEventListener('pointerdown', (e) => {
    if (e.target === canvas || e.target.closest('.popover') || e.target.closest('#action-btn')) return;
    closePopovers();
  });

  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (text && state.joined) state.socket.emit('chat', text);
    input.value = '';
  });

  canvas.addEventListener('pointerdown', (e) => {
    audio.init();
    yt.resume();
    const self = me();
    if (!state.joined || !self) return;
    const { x, y } = toWorld(e);
    closePopovers();
    const other = playerAt(x, y);
    if (other) return openPlayerMenu(other, e.clientX, e.clientY);
    if (scene.hitsTV(x, y)) {
      // only reachable while the TV is off; when on, the YouTube player takes the click
      if (state.selfId !== state.hostId) return toast('The host picks what’s on TV 📺');
      openTab('vibe');
      $('#yt-url').focus();
      return;
    }
    const pet = scene.petAt(x, y);
    if (pet) {
      closeMenu();
      const spot = scene.petSpot(pet);
      goDo(spot.x, spot.y, { kind: 'pet', id: pet.id });
      return;
    }
    if (state.serve === 'table') {
      const ti = scene.tableAt(x, y);
      if (scene.hitsVendor(x, y) || (ti != null && ti === myTable())) return callWaiter();
      if (ti != null) {
        const seat = scene.seats.find((s) => s.table === ti && !stoolTaken(s));
        if (!seat) return toast('Bàn này kín chỗ rồi');
        state.pending = null;
        closeMenu();
        setTarget(self, seat.x, seat.y);
        return;
      }
    } else if (scene.hitsVendor(x, y)) {
      const spot = scene.orderSpot;
      state.pending = 'order';
      if (Math.abs(self.x - spot.x) < 2 && Math.abs(self.y - spot.y) < 2) arrived(self);
      else setTarget(self, spot.x, spot.y);
      return;
    }
    state.pending = null;
    closeMenu();
    const seat = scene.seatAt(x, y);
    if (seat) {
      if (stoolTaken(seat)) return toast('Someone’s sitting there');
      setTarget(self, seat.x, seat.y);
      return;
    }
    const c = scene.clamp(x, y);
    setTarget(self, c.x, c.y);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!state.joined) return;
    const { x, y } = toWorld(e);
    const over =
      !!playerAt(x, y) || !!scene.petAt(x, y) || scene.hitsTV(x, y) || scene.hitsVendor(x, y) || !!scene.seatAt(x, y) || (scene.tableAt && scene.tableAt(x, y) != null);
    canvas.style.cursor = over ? 'pointer' : 'default';
  });

  window.addEventListener('keydown', (e) => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName);
    if (e.key === 'Escape') {
      closeMenu();
      closePopovers();
      setTheater(false);
      if (document.activeElement) document.activeElement.blur();
      return;
    }
    if (!state.joined || typing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#chat-input').focus();
      return;
    }
    const k = e.key.toLowerCase();
    if (MOVE_KEYS[k]) {
      state.keys.add(k);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => state.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => state.keys.clear());
}

initLanding();
initRoomUI();
initFocus();
requestAnimationFrame(frame);

// ?join=<roomId> skips the lobby (uses your saved character)
const autoJoin = new URLSearchParams(location.search).get('join');
if (autoJoin) {
  if (!profile.name) profile.name = 'Guest';
  state.selectedRoom = autoJoin;
  connectAndJoin(autoJoin);
}
