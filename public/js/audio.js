// Procedural street ambience + generative music, all synthesized with Web Audio (no sound files needed).
// Drop your own music files in public/audio/ and they show up as extra tracks for the host.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export const AMBIENCE_LAYERS = [
  { id: 'sizzle', label: 'Sizzling grill', icon: '🔥' },
  { id: 'crowd', label: 'Chatter & bowls', icon: '🗣️' },
  { id: 'traffic', label: 'Scooters passing', icon: '🛵' },
  { id: 'rain', label: 'Rain', icon: '🌧️' },
  { id: 'crickets', label: 'Night crickets', icon: '🦗' },
  { id: 'birds', label: 'Birdsong', icon: '🐦' },
  { id: 'wind', label: 'Wind in the pines', icon: '🌲' },
  { id: 'cheers', label: 'Cheers & clinking glasses', icon: '🍻' },
];

export const MUSIC_TRACKS = [
  { id: 'lofi', label: 'Lo-fi Night Beats' },
  { id: 'jazz', label: 'Late Night Jazz' },
  { id: 'rain-piano', label: 'Rainy Piano' },
  { id: 'bossa', label: 'Neon Bossa' },
  { id: 'acoustic', label: 'Highland Acoustic' },
  { id: 'bolero', label: 'Bolero Đêm' },
  { id: 'none', label: 'No music' },
];

// Each track is a 16-step-per-bar sequencer over a 4-chord loop.
const TRACKS = {
  lofi: {
    bpm: 72,
    swing: 0.28,
    vinyl: true,
    wobble: true,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    roots: [41, 40, 38, 36],
    scale: [72, 74, 76, 79, 81, 84],
    play(a, step, t, sps) {
      const s = step % 16, ci = Math.floor(step / 16) % 4, ch = this.chords[ci], r = this.roots[ci];
      if (s === 0) ch.forEach((n, i) => a.ep(n, t + i * 0.015, sps * 13, 0.6));
      if (s === 10 && Math.random() < 0.5) ch.slice(2).forEach((n) => a.ep(n + 12, t, sps * 2, 0.3));
      if (s === 0) a.bass(r, t, sps * 9, 0.8);
      if (s === 10) a.bass(r, t, sps * 4, 0.6);
      if (s === 14 && Math.random() < 0.4) a.bass(r + 7, t, sps * 2, 0.5);
      if (step >= 32) {
        if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.3)) a.kick(t, 0.8);
        if (s === 4 || s === 12) a.snare(t, 0.55);
        if (s % 2 === 0) a.hat(t, s % 4 === 0 ? 0.6 : 0.35);
      }
      if (s % 2 === 0 && Math.random() < 0.18) a.ep(pick(this.scale), t, sps * 3, 0.45);
    },
  },
  jazz: {
    bpm: 96,
    swing: 0.33,
    vinyl: true,
    // Cm9, F13, Bbmaj9, G7alt (rootless voicings)
    chords: [[51, 55, 58, 62], [51, 55, 57, 62], [50, 53, 57, 60], [53, 56, 59, 64]],
    walk: [[36, 39, 43, 40], [41, 45, 48, 45], [34, 38, 41, 42], [43, 47, 44, 37]],
    melody: [70, 72, 74, 75, 77, 79, 82],
    play(a, step, t, sps) {
      const s = step % 16, ci = Math.floor(step / 16) % 4, ch = this.chords[ci];
      if (s % 4 === 0) a.bass(this.walk[ci][s / 4], t, sps * 3.6, 0.85, true);
      if ([0, 4, 6, 8, 12, 14].includes(s)) a.ride(t, s % 4 === 0 ? 0.7 : 0.45);
      if (s === 4 || s === 12) a.hat(t, 0.3);
      if (s % 2 === 0 && Math.random() < 0.12) a.brush(t, 0.5);
      if ((s === 0 && Math.random() < 0.5) || (s === 6 && Math.random() < 0.75) || (s === 14 && Math.random() < 0.3)) {
        ch.forEach((n, i) => a.ep(n, t + i * 0.01, sps * 2.5, 0.45, 0.8));
      }
      if (ci !== 3 && s % 2 === 0 && Math.random() < 0.14) a.ep(pick(this.melody), t, sps * 2, 0.4, 1.2);
    },
  },
  'rain-piano': {
    bpm: 64,
    swing: 0,
    chords: [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 60, 64, 67], [55, 59, 62, 64, 67]],
    roots: [45, 41, 36, 43],
    pattern: [0, 2, 4, 3, 1, 3, 2, 4],
    scale: [76, 79, 81, 84, 86, 88],
    play(a, step, t, sps) {
      const s = step % 16, ci = Math.floor(step / 16) % 4, ch = this.chords[ci];
      if (s === 0) {
        a.piano(this.roots[ci], t, 0.45, 4);
        a.piano(this.roots[ci] + 12, t + 0.02, 0.3, 4);
      }
      if (s % 2 === 0) a.piano(ch[this.pattern[s / 2]] + 12, t + rand(0, 0.015), rand(0.22, 0.34), 2.5);
      if (s % 4 === 0 && Math.random() < 0.2) a.piano(pick(this.scale), t, 0.35, 3);
    },
  },
  bossa: {
    bpm: 78,
    swing: 0,
    // Dmaj9, Bm9, Em9, A13
    chords: [[54, 57, 61, 64], [50, 54, 57, 61], [55, 59, 62, 66], [55, 59, 61, 66]],
    roots: [38, 35, 40, 33],
    melody: [69, 71, 73, 74, 76, 78, 81],
    play(a, step, t, sps) {
      const s = step % 16, ci = Math.floor(step / 16) % 4, ch = this.chords[ci], r = this.roots[ci];
      if (s === 0) a.bass(r, t, sps * 5, 0.8);
      if (s === 6) a.bass(r + 7, t, sps * 2, 0.55);
      if (s === 8) a.bass(r + 7, t, sps * 5, 0.75);
      if (s === 14) a.bass(r, t, sps * 2, 0.5);
      if ([0, 3, 6, 10, 13].includes(s)) a.rim(t, 0.5);
      a.shaker(t, s % 2 === 0 ? 0.5 : 0.3);
      if (s === 0 || s === 8) a.kick(t, 0.45);
      if ([0, 3, 6, 8, 11, 14].includes(s)) ch.forEach((n, i) => a.ep(n, t + i * 0.006, sps * 1.4, 0.38, 1.3));
      if (s % 2 === 0 && Math.random() < 0.12) a.ep(pick(this.melody), t, sps * 3, 0.42, 1.2);
    },
  },
  acoustic: {
    bpm: 82,
    swing: 0.12,
    // C, Am, F, G — fingerpicked ballad
    chords: [[48, 55, 60, 64, 67], [45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62]],
    pattern: [0, 2, 3, 4, 1, 3, 2, 4],
    melody: [72, 74, 76, 79, 81],
    play(a, step, t, sps) {
      const s = step % 16, ci = Math.floor(step / 16) % 4, ch = this.chords[ci];
      if (s % 2 === 0) {
        const n = ch[this.pattern[s / 2]];
        a.guitar(n, t, s === 0 || s === 8 ? 0.7 : 0.45, 2.2);
      }
      // a soft strum every other bar for movement
      if (s === 12 && Math.floor(step / 16) % 2 === 1) ch.slice(1).forEach((n, i) => a.guitar(n, t + i * 0.018, 0.3, 1.5));
      if (s % 4 === 2 && Math.random() < 0.15) a.guitar(pick(this.melody), t, 0.4, 2);
    },
  },
  bolero: {
    bpm: 92,
    swing: 0,
    // Am, Dm, E7, Am, the classic minor bolero turn
    chords: [[57, 60, 64, 69], [57, 62, 65, 69], [56, 59, 62, 64], [57, 60, 64, 69]],
    roots: [45, 38, 40, 45],
    pattern: [0, 1, 2, 3, 2, 1, 2, 3],
    melody: [69, 71, 72, 74, 76, 77, 80, 81],
    play(a, step, t, sps) {
      const s = step % 16, ci = Math.floor(step / 16) % 4, ch = this.chords[ci], r = this.roots[ci];
      if (s % 2 === 0) a.guitar(ch[this.pattern[s / 2]], t, s % 8 === 0 ? 0.55 : 0.4, 1.6);
      if (s === 0 || s === 8) a.bass(r, t, sps * 5, 0.8);
      if (s === 6 || s === 12) a.bass(r + 7, t, sps * 2, 0.55);
      if (s === 0 || s === 8) a.kick(t, 0.5);
      if (s === 4 || s === 10 || s === 12) a.rim(t, 0.45);
      if (s % 2 === 0) a.shaker(t, s % 4 === 0 ? 0.5 : 0.3);
      if (s % 4 === 0 && Math.random() < 0.3) a.ep(pick(this.melody), t, sps * 4, 0.4, 0.9);
    },
  },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.layers = {};
    this.track = null;
    this.trackId = null;
    this.fileEl = null;
    this.fileNode = null;
    this.volumes = { music: 0.7, ambience: 0.8 };
    this.wanted = { music: 'none', ambience: {} };
  }

  // Must be called from a user gesture the first time (browser autoplay rules).
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.connect(ctx.destination);
    this.master = this.gain(1, comp);
    this.musicBus = this.gain(this.volumes.music, this.master);
    this.ambBus = this.gain(this.volumes.ambience, this.master);
    this.musicOut = this.gain(0.9, this.musicBus);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.6, 2.2);
    this.reverb.connect(this.musicBus);
    this.revSend = this.gain(0.3, this.reverb);

    this.white = this.noiseBuffer('white');
    this.pink = this.noiseBuffer('pink');
    this.brown = this.noiseBuffer('brown');

    // slow pitch wobble for the lo-fi tape feel
    this.wobble = ctx.createOscillator();
    this.wobble.frequency.value = 0.35;
    this.wobbleDepth = this.gain(0);
    this.wobble.connect(this.wobbleDepth);
    this.wobble.start();

    this.buildLayers();
    this.step = 0;
    this.nextTime = 0;
    this.lastEvent = 0;
    this.timer = setInterval(() => this.tick(), 25);

    const want = this.wanted;
    this.setMusic(want.music);
    this.setAmbience(want.ambience);
  }

  // ---------- node helpers ----------

  gain(v, dest) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    if (dest) g.connect(dest);
    return g;
  }

  filter(type, freq, q = 1) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  osc(type, freq) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  panner(v) {
    const p = this.ctx.createStereoPanner();
    p.pan.value = v;
    return p;
  }

  loop(buffer) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start(0, Math.random() * 3);
    return src;
  }

  // 4 seconds of stereo noise with a crossfaded seam so it loops without clicks.
  noiseBuffer(type) {
    const sr = this.ctx.sampleRate, len = sr * 4, fade = 4096;
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const gen = new Float32Array(len + fade);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < gen.length; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'white') gen[i] = w;
        else if (type === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          gen[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          gen[i] = last * 3.5;
        }
      }
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = i < fade ? gen[i] * (i / fade) + gen[len + i] * (1 - i / fade) : gen[i];
      let sum = 0;
      for (let i = 0; i < len; i++) sum += d[i] * d[i];
      const k = 0.3 / Math.sqrt(sum / len);
      for (let i = 0; i < len; i++) d[i] *= k;
    }
    return buf;
  }

  impulse(seconds, decay) {
    const sr = this.ctx.sampleRate, len = sr * seconds;
    const buf = this.ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // ---------- ambience ----------

  buildLayers() {
    const L = this.layers;

    {
      // hot oil: bright hiss with slow surges, plus crackle pops from events
      const out = this.gain(0, this.ambBus);
      const src = this.loop(this.white);
      const hp = this.filter('highpass', 1800, 0.7);
      const bp = this.filter('bandpass', 5200, 0.6);
      const mod = this.gain(0.6);
      src.connect(hp).connect(bp).connect(mod).connect(out);
      const lfo = this.osc('sine', 0.23);
      lfo.connect(this.gain(0.25)).connect(mod.gain);
      lfo.start();
      L.sizzle = { out, level: 0.5, on: false, mod };
    }

    {
      // a babble of formant-filtered noise "voices" plus a low murmur bed
      const out = this.gain(0, this.ambBus);
      const lp = this.filter('lowpass', 2200, 0.5);
      lp.connect(out);
      const voices = [];
      for (let i = 0; i < 7; i++) {
        const src = this.loop(this.pink);
        const f1 = this.filter('bandpass', rand(350, 700), 5);
        const f2 = this.filter('bandpass', rand(1000, 2000), 7);
        const vg = this.gain(0);
        src.connect(f1).connect(vg);
        src.connect(f2).connect(vg);
        vg.connect(this.panner(rand(-0.8, 0.8))).connect(lp);
        voices.push({ f1, f2, vg, talking: Math.random() < 0.5, pitch: rand(0.8, 1.3) });
      }
      this.loop(this.brown).connect(this.filter('bandpass', 500, 0.8)).connect(this.gain(1.4)).connect(lp);
      L.crowd = { out, level: 0.3, on: false, voices };
    }

    {
      // distant city rumble; scooters and horns come from events
      const out = this.gain(0, this.ambBus);
      this.loop(this.brown).connect(this.filter('lowpass', 200, 0.7)).connect(out);
      L.traffic = { out, level: 0.35, on: false };
    }

    {
      // steady rain wash + low body; drips come from events
      const out = this.gain(0, this.ambBus);
      this.loop(this.white).connect(this.filter('highpass', 500, 0.5)).connect(this.filter('lowpass', 7000, 0.5)).connect(out);
      this.loop(this.pink).connect(this.filter('lowpass', 1000, 0.5)).connect(this.gain(0.5)).connect(out);
      L.rain = { out, level: 0.45, on: false };
    }

    {
      const out = this.gain(0, this.ambBus);
      const bugs = Array.from({ length: 3 }, () => ({ f: rand(4300, 5200), period: rand(0.7, 1.3), pan: rand(-0.8, 0.8), next: 0 }));
      L.crickets = { out, level: 1, on: false, bugs };
    }

    {
      // birdsong comes entirely from events
      L.birds = { out: this.gain(0, this.ambBus), level: 1, on: false };
    }

    {
      // soft pine wind: pink noise through a wandering band-pass, with gusts from events
      const out = this.gain(0, this.ambBus);
      const bp = this.filter('bandpass', 500, 0.8);
      const gust = this.gain(0.6);
      this.loop(this.pink).connect(bp).connect(gust).connect(out);
      this.loop(this.brown).connect(this.filter('lowpass', 300, 0.5)).connect(this.gain(0.4)).connect(out);
      L.wind = { out, level: 0.5, on: false, bp, gust };
    }

    {
      // a table toasting now and then; comes entirely from events
      L.cheers = { out: this.gain(0, this.ambBus), level: 1, on: false };
    }
  }

  setAmbience(map = {}) {
    this.wanted.ambience = { ...map };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [id, layer] of Object.entries(this.layers)) {
      const on = !!map[id];
      layer.on = on;
      layer.out.gain.setTargetAtTime(on ? layer.level : 0, now, 0.8);
    }
  }

  ambientEvents(now) {
    const L = this.layers;
    if (L.sizzle.on) {
      const n = (Math.random() * 5) | 0;
      for (let i = 0; i < n; i++) this.pop(now + Math.random() * 0.1, rand(0.05, 0.35), L.sizzle.out, rand(2500, 6000));
      if (Math.random() < 0.012) {
        // something new just hit the hot plate
        L.sizzle.mod.gain.setTargetAtTime(1.6, now, 0.05);
        L.sizzle.mod.gain.setTargetAtTime(0.6, now + 0.6, 0.8);
      }
    }
    if (L.crowd.on) {
      for (const v of L.crowd.voices) {
        if (Math.random() < (v.talking ? 0.03 : 0.04)) v.talking = !v.talking;
        const target = v.talking ? (Math.random() < 0.25 ? 0.2 : rand(1.2, 3)) : 0;
        v.vg.gain.setTargetAtTime(target, now, v.talking ? 0.04 : 0.3);
        if (v.talking) {
          v.f1.frequency.setTargetAtTime(rand(300, 800) * v.pitch, now, 0.05);
          v.f2.frequency.setTargetAtTime(rand(900, 2300) * v.pitch, now, 0.05);
        }
      }
      if (Math.random() < 0.035) this.clink(now + Math.random() * 0.1, L.crowd.out);
    }
    if (L.traffic.on) {
      if (Math.random() < 0.012) this.scooterPass(now, L.traffic.out);
      if (Math.random() < 0.0025) this.horn(now, L.traffic.out);
    }
    if (L.rain.on) {
      const n = 2 + ((Math.random() * 5) | 0);
      for (let i = 0; i < n; i++) this.drip(now + Math.random() * 0.1, L.rain.out);
    }
    if (L.crickets.on) {
      for (const c of L.crickets.bugs) {
        if (c.next < now - 1) c.next = now + rand(0, c.period);
        if (now >= c.next) {
          this.chirp(c.next, c, L.crickets.out);
          c.next += c.period * rand(0.85, 1.2) + (Math.random() < 0.05 ? rand(1, 4) : 0);
        }
      }
    }
    if (L.birds.on && Math.random() < 0.05) this.birdCall(now + Math.random() * 0.1, L.birds.out);
    if (L.wind.on && Math.random() < 0.04) {
      L.wind.bp.frequency.setTargetAtTime(rand(300, 900), now, 1.5);
      L.wind.gust.gain.setTargetAtTime(rand(0.3, 1.2), now, 1.8);
    }
    if (L.cheers.on && Math.random() < 0.008) this.toast(now, L.cheers.out);
    if (this.track && this.track.vinyl) {
      const n = (Math.random() * 3) | 0;
      for (let i = 0; i < n; i++) this.pop(now + Math.random() * 0.1, rand(0.01, 0.05), this.musicOut, 1200);
    }
  }

  pop(t, vel, dest, hp) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.white;
    const g = this.gain(0);
    src.connect(this.filter('highpass', hp, 1)).connect(g).connect(dest);
    const d = rand(0.004, 0.025);
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    src.start(t, Math.random() * 3, d + 0.02);
  }

  clink(t, dest) {
    const f = rand(1500, 3000);
    const pan = this.panner(rand(-0.7, 0.7));
    pan.connect(dest);
    [[1, 0.06], [2.7, 0.025], [4.1, 0.012]].forEach(([m, v], i) => {
      const o = this.osc('sine', f * m);
      const g = this.gain(0);
      o.connect(g).connect(pan);
      g.gain.setValueAtTime(v * rand(0.5, 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.15, 0.4) / (i + 1));
      o.start(t);
      o.stop(t + 0.5);
    });
  }

  scooterPass(now, dest) {
    const dur = rand(4, 7), f = rand(55, 95), dir = Math.random() < 0.5 ? -1 : 1;
    const o1 = this.osc('sawtooth', f), o2 = this.osc('square', f * 1.5 + rand(-2, 2));
    const lp = this.filter('lowpass', 300, 2);
    const putt = this.gain(0.7);
    const am = this.osc('sine', rand(14, 22));
    am.connect(this.gain(0.3)).connect(putt.gain);
    const env = this.gain(0);
    const pan = this.panner(-dir);
    o1.connect(lp);
    o2.connect(this.gain(0.4)).connect(lp);
    lp.connect(putt).connect(env).connect(pan).connect(dest);
    const tire = this.ctx.createBufferSource();
    tire.buffer = this.pink;
    tire.connect(this.filter('bandpass', 800, 0.7)).connect(this.gain(0.6)).connect(env);
    const mid = now + dur / 2, end = now + dur;
    for (const o of [o1, o2]) {
      o.frequency.setValueAtTime(o.frequency.value * 1.06, now);
      o.frequency.linearRampToValueAtTime(o.frequency.value * 0.94, end);
    }
    lp.frequency.setValueAtTime(300, now);
    lp.frequency.linearRampToValueAtTime(900, mid);
    lp.frequency.linearRampToValueAtTime(300, end);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.14, mid);
    env.gain.linearRampToValueAtTime(0, end);
    pan.pan.setValueAtTime(-dir, now);
    pan.pan.linearRampToValueAtTime(dir, end);
    for (const n of [o1, o2, am]) {
      n.start(now);
      n.stop(end + 0.1);
    }
    tire.start(now, Math.random() * 3, dur);
  }

  horn(now, dest) {
    const out = this.panner(rand(-0.8, 0.8));
    out.connect(dest);
    const lp = this.filter('lowpass', 1500, 0.7);
    lp.connect(out);
    const beeps = Math.random() < 0.5 ? 2 : 1;
    for (let b = 0; b < beeps; b++) {
      const t = now + b * 0.25;
      const g = this.gain(0);
      g.connect(lp);
      for (const f of [400, 500]) {
        const o = this.osc('square', f);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.2);
      }
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.01);
      g.gain.setValueAtTime(0.03, t + 0.17);
      g.gain.linearRampToValueAtTime(0, t + 0.2);
    }
  }

  drip(t, dest) {
    const heavy = Math.random() < 0.15;
    const f = heavy ? rand(600, 900) : rand(1500, 4500);
    const o = this.osc('sine', f);
    const g = this.gain(0);
    o.connect(g).connect(this.panner(rand(-0.9, 0.9))).connect(dest);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.04);
    g.gain.setValueAtTime(heavy ? 0.08 : rand(0.015, 0.05), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (heavy ? 0.09 : 0.05));
    o.start(t);
    o.stop(t + 0.1);
  }

  chirp(t, c, dest) {
    const o = this.osc('sine', c.f);
    const g = this.gain(0);
    o.connect(g).connect(this.panner(c.pan)).connect(dest);
    for (let k = 0; k < 3; k++) {
      const s = t + k * 0.035;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.04, s + 0.008);
      g.gain.linearRampToValueAtTime(0, s + 0.025);
    }
    o.start(t);
    o.stop(t + 0.14);
  }

  // a short phrase of rising/falling whistles or a quick trill, somewhere in the stereo field
  birdCall(t, dest) {
    const pan = this.panner(rand(-0.9, 0.9));
    pan.connect(dest);
    const base = rand(2200, 4200);
    const trill = Math.random() < 0.3;
    const notes = trill ? 6 + ((Math.random() * 6) | 0) : 2 + ((Math.random() * 4) | 0);
    const vol = rand(0.015, 0.04);
    let at = t;
    for (let i = 0; i < notes; i++) {
      const dur = trill ? 0.035 : rand(0.06, 0.14);
      const o = this.osc('sine', base);
      const g = this.gain(0);
      o.connect(g).connect(pan);
      const f0 = base * rand(0.85, 1.1);
      const f1 = trill ? f0 * 1.15 : f0 * (Math.random() < 0.5 ? rand(1.2, 1.6) : rand(0.6, 0.85));
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.008);
      g.gain.linearRampToValueAtTime(0, at + dur);
      o.start(at);
      o.stop(at + dur + 0.02);
      at += dur + (trill ? 0.012 : rand(0.04, 0.12));
    }
  }

  // "Một, hai, ba, dzô!": a cluster of glass clinks, and the chatter swells for a moment
  toast(now, dest) {
    const n = 3 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) this.clink(now + 0.05 + Math.random() * 0.35, dest);
    const crowd = this.layers.crowd;
    if (crowd.on) {
      for (const v of crowd.voices) {
        v.talking = true;
        v.vg.gain.setTargetAtTime(rand(2.5, 3.5), now + 0.3, 0.05);
      }
    }
  }

  // ---------- music ----------

  setMusic(id) {
    this.wanted.music = id;
    if (!this.ctx || this.trackId === id) return;
    this.trackId = id;
    this.stopFile();
    this.track = null;
    if (typeof id === 'string' && id.startsWith('file:')) {
      this.playFile(id.slice(5));
      return;
    }
    const tr = TRACKS[id];
    if (!tr) return;
    this.track = tr;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.15;
    this.wobbleDepth.gain.setTargetAtTime(tr.wobble ? 9 : 0, this.ctx.currentTime, 0.1);
  }

  playFile(name) {
    const el = new Audio('/audio/' + encodeURIComponent(name));
    el.loop = true;
    const node = this.ctx.createMediaElementSource(el);
    node.connect(this.musicOut);
    el.play().catch(() => {});
    this.fileEl = el;
    this.fileNode = node;
  }

  stopFile() {
    if (!this.fileEl) return;
    this.fileEl.pause();
    this.fileEl.removeAttribute('src');
    this.fileNode.disconnect();
    this.fileEl = this.fileNode = null;
  }

  stopAll() {
    this.setMusic('none');
    this.setAmbience({});
  }

  setVolumes(music, ambience) {
    this.volumes = { music, ambience };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(music, now, 0.05);
    this.ambBus.gain.setTargetAtTime(ambience, now, 0.05);
  }

  tick() {
    const now = this.ctx.currentTime;
    if (now - this.lastEvent >= 0.1) {
      this.lastEvent = now;
      this.ambientEvents(now);
    }
    if (!this.track) return;
    // background tabs throttle timers to ~1s, so schedule further ahead there
    const ahead = document.hidden ? 1.5 : 0.2;
    if (this.nextTime < now - 0.2) this.nextTime = now + 0.05;
    const sps = 60 / this.track.bpm / 4;
    while (this.nextTime < now + ahead) {
      let t = this.nextTime;
      if (this.step % 4 === 2) t += (this.track.swing || 0) * sps;
      try {
        this.track.play(this, this.step, t, sps);
      } catch (e) {
        console.error(e);
      }
      this.nextTime += sps;
      this.step++;
    }
  }

  // ---------- instruments ----------

  ep(m, t, dur, vel = 0.5, bright = 1) {
    const f = mtof(m);
    const g = this.gain(0);
    const lp = this.filter('lowpass', 900 + 2200 * vel * bright, 0.4);
    const o1 = this.osc('sine', f), o2 = this.osc('triangle', f), o3 = this.osc('sine', f * 4);
    o2.detune.value = rand(-7, 7);
    const tine = this.gain(0);
    o1.connect(lp);
    o2.connect(this.gain(0.35)).connect(lp);
    o3.connect(tine).connect(lp);
    lp.connect(g);
    g.connect(this.musicOut);
    g.connect(this.revSend);
    const peak = 0.13 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.setTargetAtTime(peak * 0.35, t + 0.01, 0.4);
    g.gain.setTargetAtTime(0, t + dur, 0.25);
    tine.gain.setValueAtTime(0.25 * vel, t);
    tine.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    const end = t + dur + 1.5;
    for (const o of [o1, o2, o3]) {
      o.start(t);
      o.stop(end);
    }
    if (this.track && this.track.wobble) {
      this.wobbleDepth.connect(o1.detune);
      this.wobbleDepth.connect(o2.detune);
      o1.onended = () => {
        try {
          this.wobbleDepth.disconnect(o1.detune);
          this.wobbleDepth.disconnect(o2.detune);
        } catch {}
      };
    }
  }

  piano(m, t, vel = 0.5, len = 2.5) {
    const f = mtof(m);
    const g = this.gain(0);
    const lp = this.filter('lowpass', 1200 + 3000 * vel, 0.3);
    lp.frequency.setValueAtTime(1200 + 3000 * vel, t);
    lp.frequency.setTargetAtTime(700, t, 0.6);
    const o1 = this.osc('triangle', f), o2 = this.osc('sine', f * 2), o3 = this.osc('sine', f);
    o3.detune.value = 4;
    o1.connect(lp);
    o2.connect(this.gain(0.2)).connect(lp);
    o3.connect(this.gain(0.5)).connect(lp);
    lp.connect(g);
    g.connect(this.musicOut);
    g.connect(this.revSend);
    const peak = 0.16 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.005);
    g.gain.setTargetAtTime(0, t + 0.01, len / 3);
    for (const o of [o1, o2, o3]) {
      o.start(t);
      o.stop(t + len + 1);
    }
  }

  // nylon-string-ish pluck: bright attack that darkens quickly
  guitar(m, t, vel = 0.5, len = 2) {
    const f = mtof(m);
    const g = this.gain(0);
    const lp = this.filter('lowpass', 3500, 0.8);
    lp.frequency.setValueAtTime(2500 + 2000 * vel, t);
    lp.frequency.setTargetAtTime(500, t, 0.18);
    const o1 = this.osc('triangle', f), o2 = this.osc('sawtooth', f);
    o2.detune.value = rand(-4, 4);
    o1.connect(lp);
    o2.connect(this.gain(0.25)).connect(lp);
    lp.connect(g);
    g.connect(this.musicOut);
    g.connect(this.revSend);
    const peak = 0.14 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.005, len / 4);
    for (const o of [o1, o2]) {
      o.start(t);
      o.stop(t + len + 0.5);
    }
  }

  bass(m, t, dur, vel = 0.7, pluck = false) {
    const f = mtof(m);
    const g = this.gain(0);
    const lp = this.filter('lowpass', 600, 0.7);
    const o1 = this.osc('sine', f), o2 = this.osc('triangle', f);
    o1.connect(lp);
    o2.connect(this.gain(0.4)).connect(lp);
    lp.connect(g).connect(this.musicOut);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32 * vel, t + 0.01);
    g.gain.setTargetAtTime(pluck ? 0.05 * vel : 0.22 * vel, t + 0.02, pluck ? 0.35 : 0.2);
    g.gain.setTargetAtTime(0, t + dur, 0.08);
    for (const o of [o1, o2]) {
      o.start(t);
      o.stop(t + dur + 0.5);
    }
  }

  noiseHit(t, type, freq, q, peak, decay, toReverb = false) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.white;
    const g = this.gain(0);
    src.connect(this.filter(type, freq, q)).connect(g).connect(this.musicOut);
    if (toReverb) g.connect(this.revSend);
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.start(t, Math.random() * 3, decay + 0.05);
  }

  kick(t, vel = 0.8) {
    const o = this.osc('sine', 130);
    const g = this.gain(0);
    o.connect(g).connect(this.musicOut);
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.start(t);
    o.stop(t + 0.4);
  }

  snare(t, vel = 0.5) {
    this.noiseHit(t, 'bandpass', 1800, 0.8, 0.35 * vel, 0.18, true);
    const o = this.osc('triangle', 190);
    const g = this.gain(0);
    o.connect(g).connect(this.musicOut);
    g.gain.setValueAtTime(0.2 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.start(t);
    o.stop(t + 0.1);
  }

  hat(t, vel = 0.5) {
    this.noiseHit(t, 'highpass', 7000, 0.7, 0.12 * vel, 0.04);
  }

  ride(t, vel = 0.5) {
    this.noiseHit(t, 'bandpass', 6500, 1.5, 0.07 * vel, 0.5, true);
  }

  brush(t, vel = 0.5) {
    this.noiseHit(t, 'bandpass', 3000, 0.5, 0.08 * vel, 0.15);
  }

  rim(t, vel = 0.5) {
    const o = this.osc('triangle', 1700);
    const g = this.gain(0);
    o.connect(g).connect(this.musicOut);
    g.gain.setValueAtTime(0.2 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    o.start(t);
    o.stop(t + 0.05);
    this.noiseHit(t, 'highpass', 3000, 0.7, 0.1 * vel, 0.02);
  }

  shaker(t, vel = 0.5) {
    this.noiseHit(t, 'highpass', 6000, 0.7, 0.07 * vel, 0.06);
  }

  // petting: the cat meows then purrs, the dog gives two happy woofs
  petSound(kind) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    const out = this.gain(0.5, this.master);
    if (kind === 'dog') {
      for (const d of [0, 0.22]) {
        const o = this.osc('sawtooth', 240);
        const g = this.gain(0);
        o.connect(this.filter('bandpass', 700, 1.5)).connect(g).connect(out);
        o.frequency.setValueAtTime(240, t + d);
        o.frequency.exponentialRampToValueAtTime(130, t + d + 0.12);
        g.gain.setValueAtTime(0, t + d);
        g.gain.linearRampToValueAtTime(0.35, t + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.14);
        o.start(t + d);
        o.stop(t + d + 0.16);
      }
      return;
    }
    // "mi-a-ow": a pitch and vowel sweep
    const o = this.osc('sawtooth', 520);
    const g = this.gain(0);
    const f1 = this.filter('bandpass', 700, 3);
    o.connect(f1).connect(g);
    o.connect(this.filter('bandpass', 1800, 4)).connect(g);
    g.connect(out);
    o.frequency.setValueAtTime(520, t);
    o.frequency.linearRampToValueAtTime(760, t + 0.18);
    o.frequency.linearRampToValueAtTime(480, t + 0.55);
    f1.frequency.setValueAtTime(700, t);
    f1.frequency.linearRampToValueAtTime(1100, t + 0.2);
    f1.frequency.linearRampToValueAtTime(600, t + 0.55);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.05);
    g.gain.setValueAtTime(0.4, t + 0.4);
    g.gain.linearRampToValueAtTime(0, t + 0.58);
    o.start(t);
    o.stop(t + 0.6);
    // purr: low rumble pulsing about 24 times a second
    const p0 = t + 0.6;
    const src = this.ctx.createBufferSource();
    src.buffer = this.brown;
    const pulse = this.gain(0.5);
    const lfo = this.osc('sine', 24);
    lfo.connect(this.gain(0.5)).connect(pulse.gain);
    const env = this.gain(0);
    src.connect(this.filter('lowpass', 250, 0.7)).connect(pulse).connect(env).connect(out);
    env.gain.setValueAtTime(0, p0);
    env.gain.linearRampToValueAtTime(0.7, p0 + 0.4);
    env.gain.setValueAtTime(0.7, p0 + 2.4);
    env.gain.linearRampToValueAtTime(0, p0 + 3.2);
    lfo.start(p0);
    lfo.stop(p0 + 3.3);
    src.start(p0, Math.random() * 2, 3.3);
  }

  // food hits the hot wok
  sizzleBurst() {
    const L = this.layers;
    if (!this.ctx || !L.sizzle.on) return;
    const now = this.ctx.currentTime;
    L.sizzle.mod.gain.setTargetAtTime(1.8, now, 0.05);
    L.sizzle.mod.gain.setTargetAtTime(0.6, now + 2.5, 1);
  }

  // "hurk... bleaaargh": a gag, then a wet gurgling splash
  pukeSound() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    const out = this.gain(0.45, this.master);
    // two short throaty gags
    for (const d of [0, 0.28]) {
      const o = this.osc('sawtooth', 110);
      const g = this.gain(0);
      o.connect(this.filter('bandpass', 500, 2)).connect(g).connect(out);
      o.frequency.setValueAtTime(130, t + d);
      o.frequency.exponentialRampToValueAtTime(70, t + d + 0.14);
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(0.3, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.16);
      o.start(t + d);
      o.stop(t + d + 0.18);
    }
    // the long growl
    const t0 = t + 0.6;
    const o = this.osc('sawtooth', 95);
    const lfo = this.osc('sine', 13);
    lfo.connect(this.gain(18)).connect(o.frequency);
    const vowel = this.filter('bandpass', 650, 2.5);
    const g = this.gain(0);
    o.connect(vowel).connect(g).connect(out);
    vowel.frequency.setValueAtTime(900, t0);
    vowel.frequency.linearRampToValueAtTime(420, t0 + 1.6);
    o.frequency.setValueAtTime(105, t0);
    o.frequency.linearRampToValueAtTime(70, t0 + 1.8);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.28, t0 + 0.08);
    g.gain.setValueAtTime(0.24, t0 + 1.4);
    g.gain.linearRampToValueAtTime(0, t0 + 1.9);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + 2);
    lfo.stop(t0 + 2);
    // wet splash on the floor
    const src = this.ctx.createBufferSource();
    src.buffer = this.pink;
    const sg = this.gain(0);
    const lp = this.filter('lowpass', 1200, 4);
    const wob = this.osc('sine', 9);
    wob.connect(this.gain(600)).connect(lp.frequency);
    src.connect(lp).connect(sg).connect(out);
    sg.gain.setValueAtTime(0, t0 + 0.15);
    sg.gain.linearRampToValueAtTime(0.5, t0 + 0.3);
    sg.gain.setValueAtTime(0.4, t0 + 1.6);
    sg.gain.linearRampToValueAtTime(0, t0 + 2.1);
    wob.start(t0);
    wob.stop(t0 + 2.2);
    src.start(t0, Math.random() * 2, 2.2);
  }

  // soft bell for the focus timer, bypasses the music volume
  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    [[880, 0.12], [1320, 0.07], [1760, 0.04]].forEach(([f, v], i) => {
      [0, 0.45].forEach((delay) => {
        const o = this.osc('sine', f);
        const g = this.gain(0);
        o.connect(g).connect(this.master);
        g.gain.setValueAtTime(v, t + delay);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 2 - i * 0.4);
        o.start(t + delay);
        o.stop(t + delay + 2.1);
      });
    });
  }
}
