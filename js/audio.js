/* audio.js — Web Audio 合成音效與 BGM（方波／噪音，SFC 味，免授權） */
'use strict';

const Sfx = {
  ctx: null, master: null, musGain: null, on: true,
  seq: null, seqTimer: 0, seqStep: 0, curTrack: null,

  ensure() {
    if (this.ctx || this.noAudio) return;
    // 沒有瀏覽器環境（例如 Node 跑回歸測試）就直接停用，不要炸掉
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) { this.noAudio = true; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(this.ctx.destination);
    this.musGain = this.ctx.createGain();
    this.musGain.gain.value = 0.16;
    this.musGain.connect(this.master);
  },
  resume() { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  toggle() { this.on = !this.on; if (this.master) this.master.gain.value = this.on ? 0.28 : 0; return this.on; },

  tone(freq, dur, type, vol, slide, dest) {
    if (!this.on) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol, lp) {
    if (!this.on) return;
    this.ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lp || 2400;
    const g = this.ctx.createGain();
    g.gain.value = vol || 0.25;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },

  /* --- 具體音效 --- */
  beam() { this.tone(880, 0.12, 'square', 0.12, 220); },
  mg() { this.tone(320, 0.05, 'square', 0.08, 200); },
  vulcan() { this.noise(0.05, 0.10, 3600); },
  saber() { this.tone(260, 0.18, 'sawtooth', 0.12, 900); },
  shell() { this.tone(160, 0.16, 'square', 0.14, 60); },
  hit() { this.noise(0.07, 0.16, 1800); },
  boom() { this.noise(0.55, 0.42, 900); this.tone(120, 0.4, 'triangle', 0.2, 40); },
  cursor() { this.tone(560, 0.04, 'square', 0.10); },
  ok() { this.tone(720, 0.06, 'square', 0.12); this.tone(1080, 0.09, 'square', 0.09); },
  cancel() { this.tone(300, 0.08, 'square', 0.10, 180); },
  alert() { this.tone(180, 0.3, 'square', 0.14, 520); },
  win() { if (typeof setTimeout === 'function') [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'square', 0.16), i * 110)); },
  lose() { if (typeof setTimeout === 'function') [392, 349, 294, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'square', 0.16), i * 150)); },

  /* --- BGM：兩軌簡易序列 --- */
  TRACKS: {
    map: { bpm: 108, bass: [55, 55, 62, 62, 49, 49, 58, 58], lead: [220, 262, 330, 262, 294, 330, 392, 330] },
    battle: { bpm: 152, bass: [65, 65, 65, 78, 58, 58, 58, 73], lead: [392, 466, 523, 466, 349, 415, 523, 587] }
  },
  play(name) {
    if (this.curTrack === name) return;
    this.curTrack = name;
    this.seqStep = 0;
    this.seqTimer = 0;
  },
  stop() { this.curTrack = null; },
  update() {
    if (!this.on || !this.curTrack) return;
    this.ensure();
    if (!this.ctx) return;
    const tr = this.TRACKS[this.curTrack];
    const stepFrames = Math.round(3600 / tr.bpm / 2);
    if (this.seqTimer-- > 0) return;
    this.seqTimer = stepFrames;
    const i = this.seqStep % tr.bass.length;
    this.tone(tr.bass[i], 0.16, 'triangle', 0.5, null, this.musGain);
    if (this.seqStep % 2 === 0) this.tone(tr.lead[i], 0.13, 'square', 0.22, null, this.musGain);
    this.seqStep++;
  }
};
