import { Effect, PostProcess, type Camera } from '../core/babylon';

/**
 * One combined full-screen pass for the cinematic look: gentle vignette, optional film grain, a
 * letterbox for stinger moments (mission start, room cleared) and the night-vision goggles (green
 * phosphor: the dark lifted, bright lights blooming out, heavy grain, a tube vignette). Kept to a single
 * cheap pass so it fits the 120 fps budget; disabled entirely when every effect is off.
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
uniform float nv;
uniform float flash;
uniform float feed;
void main(void) {
  vec4 c = texture2D(textureSampler, vUV);
  vec2 d = vUV - 0.5;
  d.x *= aspect;
  float n = fract(sin(dot(floor(vUV * 720.0) + time, vec2(12.9898, 78.233))) * 43758.5453);
  if (nv > 0.0) {
    float l = dot(c.rgb, vec3(0.3, 0.59, 0.11));
    float g = 1.0 - exp(-l * 7.0);
    vec3 p = vec3(0.2, 1.0, 0.35) * (0.05 + g * 1.1) + (n - 0.5) * 0.14;
    float tube = smoothstep(0.82, 0.38, length(d));
    c.rgb = mix(c.rgb, p * mix(1.0, tube, 0.85), nv);
  }
  if (feed > 0.0) {
    float l = dot(c.rgb, vec3(0.3, 0.59, 0.11));
    vec3 f = vec3(0.75, 0.9, 1.0) * (0.08 + l * 1.25) * (0.9 + 0.1 * sin(vUV.y * 900.0)) + (n - 0.5) * 0.08;
    f *= smoothstep(0.9, 0.4, length(d));
    c.rgb = mix(c.rgb, f, feed);
  }
  c.rgb = mix(c.rgb, vec3(1.0), flash);
  float v = smoothstep(0.95, 0.3, length(d));
  c.rgb *= mix(1.0, v, vignette);
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
  /** Night-vision blend 0..1. */
  private nv = 0;
  /** Flashbang white-out 0..1 (decays in `update`). */
  private flash = 0;
  /** Remote camera feed look (sticky cam, drone) 0..1. */
  private feed = 0;
  private t = 0;

  constructor(private camera: Camera) {}

  /** Apply settings; creates or removes the pass as needed. */
  configure(vignette: boolean, grain: boolean): void {
    this.vignette = vignette ? 0.35 : 0;
    this.grain = grain ? 0.045 : 0;
    this.sync();
  }

  /** Night-vision goggles blend (0 off .. 1). */
  setNightVision(k: number): void {
    if (k === this.nv) return;
    this.nv = k;
    this.sync();
  }

  /** White-out (a flashbang in view); fades over ~2 s. */
  whiteOut(k: number): void {
    this.flash = Math.max(this.flash, Math.min(1, k));
    this.sync();
  }

  /** Remote camera feed look (sticky cam / drone view). */
  setFeed(k: number): void {
    if (k === this.feed) return;
    this.feed = k;
    this.sync();
  }

  /** Show the letterbox for a moment (stingers). */
  letterbox(on: boolean): void {
    this.barsTarget = on ? 1 : 0;
    this.sync(true);
  }

  private sync(force = false): void {
    const needed = this.vignette > 0 || this.grain > 0 || this.bars > 0.001 || this.barsTarget > 0 || this.nv > 0 || this.flash > 0 || this.feed > 0 || force;
    if (needed && !this.pp) {
      const pp = new PostProcess('cinematic', 'cinematic', ['vignette', 'grain', 'bars', 'time', 'aspect', 'nv', 'flash', 'feed'], null, 1, this.camera);
      pp.onApply = (e) => {
        e.setFloat('vignette', this.vignette);
        e.setFloat('grain', this.grain);
        e.setFloat('bars', this.bars);
        e.setFloat('time', (this.t * 24) % 1000);
        e.setFloat('aspect', pp.width / Math.max(1, pp.height));
        e.setFloat('nv', this.nv);
        e.setFloat('flash', this.flash);
        e.setFloat('feed', this.feed);
      };
      // The pass leaves its input (the scene target) bound to a texture unit; a material that declares a
      // sampler it does not bind this frame (shadow receivers before the map is ready) would then read the
      // framebuffer it renders into. Unbind after the draw.
      pp.onAfterRenderObservable.add(() => (pp.getEngine() as unknown as { unbindAllTextures(): void }).unbindAllTextures());
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
    if (this.flash > 0) {
      // holds white briefly, then fades
      this.flash = Math.max(0, this.flash - dt * (this.flash > 0.85 ? 0.25 : 0.6));
      if (this.flash === 0) this.sync();
    }
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
