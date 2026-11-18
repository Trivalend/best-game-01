// Emberdrift — synthesized sound: WebAudio SFX and an ambient loop.
// One job: all audio. No audio files, no network; everything is an
// oscillator or filtered noise shaped by a gain envelope. Safe to call
// before any user gesture: the context is created lazily and every
// method no-ops until it exists.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // A short oscillator blip with a pitch slide and an exponential decay.
  blip(freqA, freqB, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freqA, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t + dur);
      g.gain.setValueAtTime(vol || 0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {
      /* audio is cosmetic; never break the game */
    }
  }

  // A burst of filtered noise (hits, explosions).
  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq || 1200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t);
    } catch (e) {
      /* audio is cosmetic */
    }
  }

  shoot() {
    this.blip(720, 240, 0.09, 'square', 0.1);
  }
  hit() {
    this.noise(0.06, 0.12, 2400);
  }
  enemyDie() {
    this.blip(320, 60, 0.22, 'sawtooth', 0.14);
    this.noise(0.18, 0.16, 900);
  }
  pickup() {
    this.blip(880, 1320, 0.1, 'sine', 0.14);
  }
  hurt() {
    this.blip(180, 70, 0.3, 'sawtooth', 0.2);
    this.noise(0.2, 0.18, 600);
  }
  waveStart() {
    this.blip(262, 262, 0.12, 'triangle', 0.16);
    setTimeout(() => this.blip(392, 392, 0.14, 'triangle', 0.16), 110);
    setTimeout(() => this.blip(523, 523, 0.2, 'triangle', 0.16), 220);
  }
  bossRoar() {
    this.blip(90, 45, 0.7, 'sawtooth', 0.24);
    this.noise(0.6, 0.2, 400);
  }
  nova() {
    this.blip(140, 900, 0.35, 'sine', 0.2);
    this.noise(0.3, 0.2, 1500);
  }
  upgradePick() {
    this.blip(523, 784, 0.16, 'triangle', 0.16);
    setTimeout(() => this.blip(784, 1046, 0.18, 'triangle', 0.14), 120);
  }
  gameOver() {
    this.blip(392, 392, 0.25, 'triangle', 0.16);
    setTimeout(() => this.blip(311, 311, 0.25, 'triangle', 0.16), 240);
    setTimeout(() => this.blip(233, 180, 0.5, 'triangle', 0.16), 480);
  }
  victory() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => this.blip(n, n, 0.3, 'triangle', 0.16), i * 140));
  }
  click() {
    this.blip(600, 500, 0.05, 'sine', 0.1);
  }

  // Slow ambient loop: a soft minor arpeggio, one note every ~0.9 s.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const scale = [220, 261.6, 329.6, 392, 440, 523.2];
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const n = scale[this.musicStep % scale.length];
      this.blip(n, n, 1.4, 'sine', 0.05);
      if (this.musicStep % 4 === 2) this.blip(n / 2, n / 2, 1.8, 'sine', 0.04);
      this.musicStep++;
    }, 900);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
