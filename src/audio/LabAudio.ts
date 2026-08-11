// Procedural lab ambience with the WebAudio API — no audio assets needed.
// A soft room tone plays while the lab is open; a faint gas hiss fades in
// when the Bunsen burner is heating. Everything is kept quiet so it adds
// immersion instead of noise.
class LabAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private room: { gain: GainNode; lfo: OscillatorNode } | null = null;
  private flame: { gain: GainNode } | null = null;

  // Create/resume the context inside a user gesture (browser autoplay rules).
  unlock() {
    if (typeof window === 'undefined') return;
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private buildRoom() {
    if (!this.ctx || !this.master || this.room) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(3);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 360;

    const gain = ctx.createGain();
    gain.gain.value = 0.05;

    // Slow "breathing" so the tone does not sound static.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.14;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this.room = { gain, lfo };
  }

  private buildFlame() {
    if (!this.ctx || !this.master || this.flame) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 850;
    filter.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    this.flame = { gain };
  }

  // Enter the lab: fade the master in over ~1.5s.
  start() {
    this.unlock();
    this.buildRoom();
    this.buildFlame();
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), t);
      this.master.gain.linearRampToValueAtTime(0.9, t + 1.5);
    }
  }

  // Leave the lab: fade everything out.
  stop() {
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0, t + 0.5);
    }
  }

  setHeating(on: boolean) {
    this.unlock();
    if (!this.flame || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.flame.gain.gain.cancelScheduledValues(t);
    this.flame.gain.gain.linearRampToValueAtTime(on ? 0.12 : 0, t + 0.4);
  }
}

export const labAudio = new LabAudio();
