// Everything here is synthesised with Web Audio, so there are no audio files to load.
// Ambient pad + twinkling notes, a whoosh for flights, and a blip when the astronaut waves or plants a flag.

export class SpaceAudio {
  constructor() {
    this.ctx = null;
    this.on = false;
  }

  _setup() {
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Long, soft reverb from a generated impulse response
    const len = ctx.sampleRate * 4;
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = impulse.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = impulse;
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    this.reverb.connect(wet).connect(this.master);

    // Pad: a slowly breathing Asus2 chord through a moving low-pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;
    filter.Q.value = 2;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    const pad = ctx.createGain();
    pad.gain.value = 0.05;
    filter.connect(pad);
    pad.connect(this.master);
    pad.connect(this.reverb);
    for (const f of [110, 164.81, 246.94, 329.63]) {
      for (const detune of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = f < 200 ? "sine" : "triangle";
        o.frequency.value = f;
        o.detune.value = detune;
        o.connect(filter);
        o.start();
      }
    }

    // Noise buffer reused by the whoosh
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // Star twinkles: random notes from an A major pentatonic
    const notes = [880, 987.77, 1108.73, 1318.51, 1479.98, 1760];
    const twinkle = () => {
      if (this.on) this._tone(notes[Math.floor(Math.random() * notes.length)], 0.025, 2.5, "sine");
      setTimeout(twinkle, 2500 + Math.random() * 4000);
    };
    setTimeout(twinkle, 1500);
  }

  _tone(freq, gain, decay, type = "sine", slideTo) {
    const ctx = this.ctx, now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, now);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + 0.15);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    o.connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    o.start(now);
    o.stop(now + decay + 0.1);
  }

  toggle(force) {
    this.on = force ?? !this.on;
    if (this.on && !this.ctx) this._setup();
    if (!this.ctx) return this.on;
    const now = this.ctx.currentTime;
    if (this.on) this.ctx.resume();
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.on ? 0.8 : 0, now, 0.4);
    return this.on;
  }

  whoosh() {
    if (!this.on) return;
    const ctx = this.ctx, now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(180, now);
    bp.frequency.exponentialRampToValueAtTime(1800, now + 0.7);
    bp.frequency.exponentialRampToValueAtTime(250, now + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.35, now + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
    src.connect(bp).connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    src.start(now);
    src.stop(now + 2);
  }

  blip() {
    if (this.on) this._tone(660, 0.08, 0.6, "triangle", 1320);
  }
}
