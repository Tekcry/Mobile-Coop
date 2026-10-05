import { Effect, PostProcess, type Camera } from '../core/babylon';

/**
 * One combined full-screen pass for the cinematic look: gentle vignette, optional film grain and a
 * letterbox for stinger moments (mission start, room cleared). Kept to a single cheap pass so it fits
 * the 120 fps budget; disabled entirely when every effect is off.
 */
Effect.ShadersStore['cinematicFragmentShader'] = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform float vignette;
uniform float grain;
uniform float bars;
uniform float time;
uniform float aspect;
void main(void) {
  vec4 c = texture2D(textureSampler, vUV);
  vec2 d = vUV - 0.5;
  d.x *= aspect;
  float v = smoothstep(0.95, 0.3, length(d));
  c.rgb *= mix(1.0, v, vignette);
  float n = fract(sin(dot(floor(vUV * 720.0) + time, vec2(12.9898, 78.233))) * 43758.5453);
  c.rgb += (n - 0.5) * grain;
  float b = bars * 0.11;
  float edge = smoothstep(b, b + 0.002, vUV.y) * smoothstep(b, b + 0.002, 1.0 - vUV.y);
  c.rgb *= edge;
  gl_FragColor = c;
}`;

export class CinematicPost {
  private pp: PostProcess | null = null;
  vignette = 0.35;
  grain = 0;
  /** Letterbox amount 0..1 (eased by `bars` towards `barsTarget`). */
  bars = 0;
  barsTarget = 0;
  private t = 0;

  constructor(private camera: Camera) {}

  /** Apply settings; creates or removes the pass as needed. */
  configure(vignette: boolean, grain: boolean): void {
    this.vignette = vignette ? 0.35 : 0;
    this.grain = grain ? 0.045 : 0;
    this.sync();
  }

  /** Show the letterbox for a moment (stingers). */
  letterbox(on: boolean): void {
    this.barsTarget = on ? 1 : 0;
    this.sync(true);
  }

  private sync(force = false): void {
    const needed = this.vignette > 0 || this.grain > 0 || this.bars > 0.001 || this.barsTarget > 0 || force;
    if (needed && !this.pp) {
      const pp = new PostProcess('cinematic', 'cinematic', ['vignette', 'grain', 'bars', 'time', 'aspect'], null, 1, this.camera);
      pp.onApply = (e) => {
        e.setFloat('vignette', this.vignette);
        e.setFloat('grain', this.grain);
        e.setFloat('bars', this.bars);
        e.setFloat('time', (this.t * 24) % 1000);
        e.setFloat('aspect', pp.width / Math.max(1, pp.height));
      };
      this.pp = pp;
    } else if (!needed && this.pp) {
      this.pp.dispose(this.camera);
      this.pp = null;
    }
  }

  update(dt: number): void {
    this.t += dt;
    const k = 1 - Math.exp(-dt / 0.25);
    this.bars += (this.barsTarget - this.bars) * k;
    if (this.barsTarget === 0 && this.bars < 0.001 && this.bars !== 0) {
      this.bars = 0;
      this.sync();
    }
  }

  dispose(): void {
    this.pp?.dispose(this.camera);
    this.pp = null;
  }
}
