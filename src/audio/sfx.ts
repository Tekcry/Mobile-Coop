import type { Surface } from '../world/surfaces';
import type { AudioEngine, Bus } from './audioEngine';

/** Procedural sound effects. Each function schedules a short node graph and lets it free itself. */
export class Sfx {
  constructor(private a: AudioEngine) {}

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** Noise burst through a filter. */
  private burst(bus: Bus, gain: number, pan: number, type: BiquadFilterType, freq: number, q: number, decay: number, freqEnd?: number): void {
    const ctx = this.a.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const out = this.a.out(bus, gain, pan, decay + 0.05);
    const n = this.a.noise();
    if (!out || !n) return;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + decay);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 1, 0.002, decay);
    n.connect(f).connect(g).connect(out);
    n.start(t);
    n.stop(t + decay + 0.05);
  }

  /** Pitched tone with an exponential pitch glide. */
  private tone(bus: Bus, gain: number, pan: number, type: OscillatorType, f0: number, f1: number, decay: number, delay = 0, attack = 0.003): void {
    const ctx = this.a.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + delay;
    const out = this.a.out(bus, gain, pan, decay + delay + 0.05);
    if (!out) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + decay);
    const g = ctx.createGain();
    this.env(g, t, 1, attack, decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  /** Weapon report by class. `dist` > 0 means a remote shooter (muffled, quieter). */
  gunshot(cls: string, gain = 1, pan = 0, dist = 0): void {
    if (!this.a.allow(`gun-${cls}-${dist > 0 ? 'far' : 'near'}`, cls === 'smg' ? 0.03 : 0.045)) return;
    const far = dist > 0;
    const lp = far ? Math.max(900, 6000 - dist * 120) : 0;
    const g = gain * (far ? 0.55 : 0.75);
    switch (cls) {
      case 'pistol':
        this.burst('sfx', g * 0.9, pan, far ? 'lowpass' : 'bandpass', far ? lp : 2600, 0.8, 0.12);
        this.tone('sfx', g * 0.6, pan, 'triangle', 220, 60, 0.09);
        break;
      case 'smg':
        this.burst('sfx', g * 0.7, pan, far ? 'lowpass' : 'bandpass', far ? lp : 3200, 0.9, 0.07);
        this.tone('sfx', g * 0.45, pan, 'square', 180, 70, 0.06);
        break;
      case 'shotgun':
        this.burst('sfx', g * 1.1, pan, 'lowpass', far ? lp : 5200, 0.7, 0.35, 600);
        this.tone('sfx', g * 0.9, pan, 'sine', 110, 40, 0.28);
        break;
      case 'sniper':
        this.burst('sfx', g * 1.1, pan, 'highpass', far ? 700 : 1500, 0.6, 0.12);
        this.burst('sfx', g * 0.7, pan, 'lowpass', far ? lp : 2600, 0.5, 0.9, 300);
        this.tone('sfx', g * 0.9, pan, 'sine', 90, 35, 0.4);
        break;
      case 'heavy':
        this.burst('sfx', g * 0.6, pan, 'bandpass', far ? lp : 1800, 1.2, 0.06);
        this.tone('sfx', g * 0.35, pan, 'sawtooth', 140, 60, 0.05);
        break;
      default:
        // rifle
        this.burst('sfx', g * 0.85, pan, far ? 'lowpass' : 'bandpass', far ? lp : 2100, 0.8, 0.14);
        this.tone('sfx', g * 0.6, pan, 'triangle', 160, 50, 0.12);
    }
  }

  dryFire(): void {
    if (!this.a.allow('dry', 0.1)) return;
    this.burst('sfx', 0.35, 0, 'highpass', 4000, 2, 0.03);
  }

  /** Magazine out / in / bolt clicks spread over the reload time. */
  reload(seconds: number): void {
    if (!this.a.allow('reload', 0.2)) return;
    const steps = [0.1, seconds * 0.45, seconds * 0.85];
    steps.forEach((d, i) => {
      setTimeout(() => {
        this.burst('sfx', 0.35, 0.2, 'bandpass', i === 2 ? 2600 : 1600, 3, 0.05);
        this.tone('sfx', 0.18, 0.2, 'square', i === 1 ? 420 : 300, 200, 0.04);
      }, d * 1000);
    });
  }

  swap(): void {
    if (!this.a.allow('swap', 0.15)) return;
    this.burst('sfx', 0.25, 0.1, 'bandpass', 1200, 2, 0.08, 2400);
  }

  impact(gain: number, pan: number): void {
    if (!this.a.allow('impact', 0.05)) return;
    this.burst('sfx', 0.18 * gain, pan, 'bandpass', 2600 + Math.random() * 1200, 3, 0.05);
  }

  hitMarker(kind: 'hit' | 'head' | 'kill'): void {
    if (!this.a.allow(`hm-${kind}`, 0.04)) return;
    if (kind === 'kill') {
      this.tone('ui', 0.28, 0, 'sine', 880, 870, 0.08);
      this.tone('ui', 0.28, 0, 'sine', 1320, 1310, 0.14, 0.07);
    } else {
      this.tone('ui', kind === 'head' ? 0.3 : 0.18, 0, 'sine', kind === 'head' ? 1600 : 1150, 1000, 0.05);
    }
  }

  playerHurt(): void {
    if (!this.a.allow('hurt', 0.12)) return;
    this.tone('sfx', 0.3, 0, 'sawtooth', 160, 70, 0.15);
    this.burst('sfx', 0.2, 0, 'lowpass', 900, 1, 0.12);
  }

  explosion(gain: number, pan: number): void {
    if (!this.a.allow('boom', 0.05)) return;
    this.burst('sfx', 1.1 * gain, pan, 'lowpass', 4200, 0.7, 1.2, 120);
    this.tone('sfx', 1.0 * gain, pan, 'sine', 80, 28, 0.9);
    this.burst('sfx', 0.4 * gain, pan, 'highpass', 2500, 0.5, 0.25);
  }

  grenadeThrow(): void {
    this.burst('sfx', 0.2, 0.1, 'bandpass', 900, 1.5, 0.2, 400);
  }

  melee(gain: number, pan: number): void {
    if (!this.a.allow('melee', 0.15)) return;
    this.burst('sfx', 0.5 * gain, pan, 'bandpass', 500, 1.2, 0.18, 1800);
  }

  /** A footstep on a surface: dull concrete, ringing metal / grate, gravel crunch, soft carpet, wood knock. */
  footstep(gain: number, pan = 0, surface: Surface = 'concrete'): void {
    if (!this.a.allow('step', 0.18)) return;
    const r = Math.random();
    switch (surface) {
      case 'metal':
      case 'grate':
        this.burst('sfx', 0.09 * gain, pan, 'bandpass', 1500 + r * 400, 3, 0.07);
        this.tone('sfx', 0.03 * gain, pan, 'triangle', surface === 'metal' ? 620 + r * 60 : 900 + r * 80, 500, 0.12);
        break;
      case 'gravel':
        this.burst('sfx', 0.1 * gain, pan, 'highpass', 1800 + r * 900, 0.7, 0.09);
        break;
      case 'carpet':
        this.burst('sfx', 0.05 * gain, pan, 'lowpass', 320 + r * 80, 0.8, 0.05);
        break;
      case 'wood':
        this.burst('sfx', 0.08 * gain, pan, 'bandpass', 380 + r * 90, 2, 0.08);
        break;
      default:
        this.burst('sfx', 0.08 * gain, pan, 'lowpass', 500 + r * 200, 1, 0.06);
    }
  }

  /** A bulb shot out / glass tinkle. */
  glass(gain: number, pan = 0): void {
    if (!this.a.allow('glass', 0.06)) return;
    this.burst('sfx', 0.3 * gain, pan, 'highpass', 4200, 1.5, 0.22);
    this.tone('sfx', 0.08 * gain, pan, 'sine', 3800, 3000, 0.12, 0.02);
  }

  /** A light switch / panel click. */
  click(): void {
    if (!this.a.allow('click', 0.08)) return;
    this.burst('sfx', 0.22, 0, 'bandpass', 3200, 4, 0.025);
  }

  /** A door: a slow creak eased open, a bang when bashed, a latch click shutting. */
  door(how: 'quiet' | 'bash' | 'enemy' | 'close', gain: number, pan: number): void {
    if (!this.a.allow('door', 0.2)) return;
    if (how === 'bash') {
      this.burst('sfx', 0.6 * gain, pan, 'lowpass', 900, 0.8, 0.3, 140);
      this.burst('sfx', 0.25 * gain, pan, 'bandpass', 2400, 2, 0.06);
    } else if (how === 'close') {
      this.burst('sfx', 0.25 * gain, pan, 'lowpass', 500, 1, 0.12, 160);
      this.burst('sfx', 0.12 * gain, pan, 'bandpass', 3000, 5, 0.03);
    } else {
      // hinge creak: a scratchy rising saw
      this.tone('sfx', 0.05 * gain, pan, 'sawtooth', how === 'enemy' ? 210 : 170, how === 'enemy' ? 300 : 250, how === 'enemy' ? 0.45 : 0.8, 0, 0.12);
    }
  }

  /** Goggles down (whine up) / up (click). */
  goggles(on: boolean): void {
    if (!this.a.allow('goggles', 0.1)) return;
    if (on) this.tone('ui', 0.06, 0, 'sine', 900, 4200, 0.35, 0, 0.05);
    else this.burst('ui', 0.15, 0, 'bandpass', 2600, 4, 0.03);
  }

  /** Sonar pulse: a soft low ping with a falling tail. */
  sonar(): void {
    this.tone('ui', 0.12, 0, 'sine', 1300, 1250, 0.5, 0, 0.01);
    this.tone('ui', 0.06, 0, 'sine', 650, 420, 0.9, 0.05, 0.05);
  }

  /** A body thumps down. */
  thud(gain = 1): void {
    if (!this.a.allow('thud', 0.15)) return;
    this.burst('sfx', 0.35 * gain, 0, 'lowpass', 260, 1, 0.18, 90);
  }

  windup(gain: number, pan: number): void {
    if (!this.a.allow('windup', 0.6)) return;
    this.tone('sfx', 0.18 * gain, pan, 'sawtooth', 70, 300, 0.6, 0, 0.3);
  }

  pickup(kind: 'ammo' | 'health'): void {
    const base = kind === 'health' ? 660 : 520;
    this.tone('ui', 0.22, 0, 'triangle', base, base, 0.08);
    this.tone('ui', 0.22, 0, 'triangle', base * 1.5, base * 1.5, 0.12, 0.07);
  }

  objective(): void {
    [523, 659, 784].forEach((f, i) => this.tone('ui', 0.25, 0, 'triangle', f, f, 0.18, i * 0.09));
  }

  /** Room-clear stinger: low swell under a rising two-note figure; the final room resolves higher. */
  stinger(final = false): void {
    this.tone('ui', 0.16, 0, 'sine', 110, 110, 0.9, 0, 0.12);
    this.tone('ui', 0.12, 0, 'triangle', 165, 165, 0.8, 0.02, 0.1);
    const notes = final ? [440, 554, 659, 880] : [392, 523];
    notes.forEach((f, i) => this.tone('ui', 0.2, 0, 'triangle', f, f, 0.35, 0.12 + i * 0.13, 0.02));
  }

  /** Wave start horn / alarm. */
  horn(): void {
    this.tone('sfx', 0.22, 0, 'sawtooth', 220, 210, 0.8, 0, 0.05);
    this.tone('sfx', 0.18, 0, 'sawtooth', 277, 270, 0.8, 0, 0.05);
  }

  levelUp(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone('ui', 0.25, 0, 'square', f, f, 0.14, i * 0.08));
  }

  uiMove(): void {
    if (!this.a.allow('ui-move', 0.03)) return;
    this.tone('ui', 0.08, 0, 'sine', 1400, 1350, 0.03);
  }

  uiConfirm(): void {
    if (!this.a.allow('ui-ok', 0.05)) return;
    this.tone('ui', 0.14, 0, 'triangle', 660, 660, 0.05);
    this.tone('ui', 0.14, 0, 'triangle', 990, 990, 0.07, 0.04);
  }

  uiBack(): void {
    if (!this.a.allow('ui-back', 0.05)) return;
    this.tone('ui', 0.12, 0, 'triangle', 660, 440, 0.08);
  }

  denied(): void {
    if (!this.a.allow('ui-deny', 0.1)) return;
    this.tone('ui', 0.14, 0, 'square', 200, 180, 0.12);
  }
}
