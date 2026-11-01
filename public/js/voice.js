// Voice chat over WebRTC. Audio goes browser to browser; the server only relays the setup
// messages ('rtc') and tells everyone who has their mic on ('mic').
//
// Every speaker -> listener pair gets its own one-way connection:
//   out: Map<listenerId, RTCPeerConnection>  (I'm talking to them)
//   in:  Map<speakerId, { pc, el, analyser }> (I'm hearing them)
// One-way connections mean two people turning their mics on at once never collide.

export class Voice {
  constructor({ getSocket, getSelfId, audioCtx, onState, onError }) {
    this.getSocket = getSocket;
    this.getSelfId = getSelfId;
    this.audioCtx = audioCtx; // () => AudioContext | null, used for speaking meters only
    this.onState = onState || (() => {});
    this.onError = onError || (() => {});
    this.iceServers = [];
    this.stream = null;
    this.out = new Map();
    this.in = new Map();
    this.volume = 1;
    this.selfMeter = null;
    this.starting = false;
  }

  get on() {
    return !!this.stream;
  }

  static supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.RTCPeerConnection);
  }

  setIceServers(list) {
    this.iceServers = Array.isArray(list) ? list : [];
  }

  emit(to, type, role, data) {
    const s = this.getSocket();
    if (s) s.emit('rtc', { to, type, role, data });
  }

  newPc() {
    return new RTCPeerConnection({ iceServers: this.iceServers });
  }

  // ---------- my mic ----------

  async start(peerIds) {
    if (this.stream || this.starting) return;
    if (!Voice.supported()) {
      this.onError(window.isSecureContext ? 'This browser can’t do voice chat' : 'Voice chat needs HTTPS (or localhost)');
      return;
    }
    this.starting = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      this.onError(e && e.name === 'NotAllowedError' ? 'Mic permission was blocked. Allow it in your browser settings' : 'Couldn’t open your microphone');
      return;
    } finally {
      this.starting = false;
    }
    this.selfMeter = this.meter(this.stream);
    this.getSocket().emit('mic', true);
    for (const id of peerIds) this.call(id);
    this.onState();
  }

  stop() {
    if (!this.stream) return;
    for (const t of this.stream.getTracks()) t.stop();
    this.stream = null;
    this.selfMeter = null;
    for (const pc of this.out.values()) pc.close();
    this.out.clear();
    const s = this.getSocket();
    if (s && s.connected) s.emit('mic', false);
    this.onState();
  }

  // offer my mic to one listener
  async call(id) {
    if (!this.stream || id === this.getSelfId()) return;
    const old = this.out.get(id);
    if (old) old.close();
    const pc = this.newPc();
    this.out.set(id, pc);
    for (const t of this.stream.getAudioTracks()) pc.addTrack(t, this.stream);
    pc.onicecandidate = (e) => e.candidate && this.emit(id, 'ice', 'speaker', e.candidate.toJSON());
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && this.out.get(id) === pc) {
        // try once more from scratch (a fresh offer often gets through after a network blip)
        setTimeout(() => this.out.get(id) === pc && this.call(id), 1500);
      }
    };
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.emit(id, 'offer', 'speaker', { type: offer.type, sdp: offer.sdp });
    } catch {
      pc.close();
      if (this.out.get(id) === pc) this.out.delete(id);
    }
  }

  // ---------- signaling ----------

  async handle({ from, type, role, data }) {
    try {
      if (role === 'speaker') await this.fromSpeaker(from, type, data);
      else await this.fromListener(from, type, data);
    } catch {
      // a stale or broken message: the next offer starts clean
    }
  }

  // messages from someone talking to me
  async fromSpeaker(from, type, data) {
    if (type === 'offer') {
      this.hangUp(from);
      const pc = this.newPc();
      const entry = { pc, el: null, analyser: null };
      this.in.set(from, entry);
      pc.onicecandidate = (e) => e.candidate && this.emit(from, 'ice', 'listener', e.candidate.toJSON());
      pc.ontrack = (e) => {
        const stream = e.streams[0] || new MediaStream([e.track]);
        if (!entry.el) {
          const el = document.createElement('audio');
          el.autoplay = true;
          el.playsInline = true;
          el.hidden = true;
          document.body.appendChild(el);
          entry.el = el;
        }
        entry.el.srcObject = stream;
        entry.el.volume = this.volume;
        entry.el.play().catch(() => {});
        entry.analyser = this.meter(stream);
      };
      await pc.setRemoteDescription(data);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.emit(from, 'answer', 'listener', { type: answer.type, sdp: answer.sdp });
    } else if (type === 'ice') {
      const entry = this.in.get(from);
      if (entry) await entry.pc.addIceCandidate(data);
    }
  }

  // messages from someone I'm talking to
  async fromListener(from, type, data) {
    const pc = this.out.get(from);
    if (!pc) return;
    if (type === 'answer') await pc.setRemoteDescription(data);
    else if (type === 'ice') await pc.addIceCandidate(data);
  }

  // ---------- people coming and going ----------

  // someone turned their mic off, or left
  hangUp(speakerId) {
    const entry = this.in.get(speakerId);
    if (!entry) return;
    entry.pc.close();
    if (entry.el) {
      entry.el.srcObject = null;
      entry.el.remove();
    }
    this.in.delete(speakerId);
  }

  peerLeft(id) {
    this.hangUp(id);
    const pc = this.out.get(id);
    if (pc) pc.close();
    this.out.delete(id);
  }

  // leaving the room or reconnecting: drop everything
  reset() {
    this.stop();
    for (const id of [...this.in.keys()]) this.hangUp(id);
    for (const pc of this.out.values()) pc.close();
    this.out.clear();
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    for (const e of this.in.values()) if (e.el) e.el.volume = this.volume;
  }

  // mobile browsers may block playback until a tap
  resume() {
    for (const e of this.in.values()) if (e.el && e.el.paused) e.el.play().catch(() => {});
  }

  // ---------- who's talking ----------

  meter(stream) {
    const ctx = this.audioCtx();
    if (!ctx) return null;
    try {
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      // into a muted gain so the browser keeps it running: this only measures, the <audio> element plays it
      const mute = ctx.createGain();
      mute.gain.value = 0;
      src.connect(an).connect(mute).connect(ctx.destination);
      return { an, buf: new Uint8Array(an.fftSize), level: 0 };
    } catch {
      return null;
    }
  }

  static level(m) {
    if (!m) return 0;
    m.an.getByteTimeDomainData(m.buf);
    let sum = 0;
    for (let i = 0; i < m.buf.length; i++) {
      const v = (m.buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / m.buf.length);
    m.level = Math.max(rms, m.level * 0.85); // fast attack, slow release so the ring doesn't flicker
    return m.level;
  }

  // true while this player's voice is above a whisper
  speaking(id) {
    const m = id === this.getSelfId() ? this.selfMeter : this.in.get(id) && this.in.get(id).analyser;
    return Voice.level(m) > 0.035;
  }
}
