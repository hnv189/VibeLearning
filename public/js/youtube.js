// Host-picked YouTube music, played through the official IFrame player (YouTube's terms require the
// player to stay visible, and its audio can't be routed through Web Audio, so volume is set on the player).

let apiPromise = null;
function loadApi() {
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

const validId = (id) => (/^[\w-]{11}$/.test(id || '') ? id : null);

// Accepts youtu.be/ID, youtube.com/watch?v=ID, /live/ID, /shorts/ID, /embed/ID, or a bare ID.
export function parseYouTubeId(input) {
  const s = String(input || '').trim();
  if (validId(s)) return s;
  try {
    const u = new URL(/^https?:\/\//.test(s) ? s : 'https://' + s);
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    if (host === 'youtu.be') return validId(u.pathname.slice(1, 12));
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.searchParams.get('v')) return validId(u.searchParams.get('v'));
      const m = u.pathname.match(/^\/(?:embed|live|shorts|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {}
  return null;
}

export class YouTubeMusic {
  constructor(card, mountId, { onTitle, onError }) {
    this.card = card;
    this.mountId = mountId;
    this.onTitle = onTitle;
    this.onError = onError;
    this.player = null;
    this.ready = false;
    this.videoId = null;
    this.key = null;
    this.startAt = 0;
    this.needsSeek = false;
    this.volume = 70;
  }

  // key changes whenever the host (re)starts a video, so re-sent settings don't restart playback
  async play(videoId, elapsedMs, key) {
    if (this.videoId === videoId && this.key === key) return;
    this.videoId = videoId;
    this.key = key;
    this.startAt = performance.now() - (elapsedMs || 0);
    this.needsSeek = true;
    this.card.hidden = false;
    const YT = await loadApi();
    if (this.videoId !== videoId) return;
    if (!this.player) {
      this.player = new YT.Player(this.mountId, {
        width: 240,
        height: 200,
        videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            this.ready = true;
            this.player.setVolume(this.volume);
            this.sync();
          },
          onStateChange: (e) => this.onState(e),
          onError: (e) => this.onError && this.onError(e.data),
        },
      });
    } else this.sync();
  }

  sync() {
    const p = this.player;
    if (!p || !this.ready || !this.videoId) return;
    const data = p.getVideoData ? p.getVideoData() : {};
    if (data.video_id !== this.videoId) p.loadVideoById(this.videoId);
    else if (this.needsSeek) {
      // same video restarted by the host
      p.seekTo(0, true);
      p.playVideo();
    } else p.playVideo();
  }

  onState(e) {
    const p = this.player, S = window.YT.PlayerState;
    if (e.data === S.PLAYING) {
      if (this.needsSeek) {
        this.needsSeek = false;
        const d = p.getDuration();
        const live = p.getVideoData().isLive;
        const offset = (performance.now() - this.startAt) / 1000;
        if (!live && d > 0 && offset > 2) p.seekTo(offset % d, true);
      }
      if (this.onTitle) this.onTitle(p.getVideoData().title || 'YouTube');
    } else if (e.data === S.ENDED) {
      p.seekTo(0, true);
      p.playVideo();
    }
  }

  // Browsers may block autoplay until the page is clicked; call this from a click.
  resume() {
    const p = this.player;
    if (!p || !this.ready || !this.videoId || !p.getPlayerState) return;
    const s = p.getPlayerState();
    if (s !== window.YT.PlayerState.PLAYING && s !== window.YT.PlayerState.BUFFERING) p.playVideo();
  }

  stop() {
    this.videoId = null;
    this.key = null;
    this.card.hidden = true;
    if (this.player && this.ready) this.player.stopVideo();
  }

  setVolume(v) {
    this.volume = v;
    if (this.player && this.ready) this.player.setVolume(v);
  }
}
