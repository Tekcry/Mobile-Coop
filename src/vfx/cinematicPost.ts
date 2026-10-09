import { Effect, PostProcess, type Camera } from '../core/babylon';
import { BRIGHTNESS_MAX, BRIGHTNESS_MIN } from '../world/darkCurve';

export { PHONE_DARK_FLOOR } from '../core/quality';

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
uniform vec3 tint;
uniform float sat;
uniform float contrast;
uniform float darkFloor;
uniform float bright;
void main(void) {
  vec4 c = texture2D(textureSampler, vUV);
  // the map's colour grade: tint, saturation, contrast round mid grey
  vec3 gr = c.rgb * tint;
  float gl = dot(gr, vec3(0.299, 0.587, 0.114));
  gr = mix(vec3(gl), gr, sat);
  c.rgb = max((gr - 0.5) * contrast + 0.5, 0.0);
  // (Step 4b) the player's brightness calibration: a small, clamped exposure offset
  c.rgb *= bright;
  // (3.6) the phone's black floor (OLED smear), white kept
  if (darkFloor > 0.0) c.rgb = darkFloor + min(c.rgb, 1.0) * (1.0 - darkFloor);
  vec2 d = vUV - 0.5;
  d.x *= aspect;
  float n = fract(sin(dot(floor(vUV * 720.0) + time, vec2(12.9898, 78.233))) * 43758.5453);
  if (nv > 0.0) {
    // (Step 4b) the gain is in the lighting (\`LampPlugin\`, \`VISION_GAIN\`): the tube maps the light it gets to green
    // nearly as it is, and lamp light blows out towards white
    float l = dot(c.rgb, vec3(0.3, 0.59, 0.11));
    vec3 p = vec3(0.25, 1.0, 0.4) * (0.02 + l * 0.62) + vec3(max(l - 0.75, 0.0) * 4.0) + (n - 0.5) * 0.1;
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
  /** Colour grade (identity = off). */
  private tint: [number, number, number] = [1, 1, 1];
  private sat = 1;
  private contrast = 1;
  /** Black lifted to this (3.6; `PHONE_DARK_FLOOR` on the phone look, 0 elsewhere). */
  private floor = 0;
  /** The brightness calibration's exposure multiplier (Step 4b; 1 = default). */
  private bright = 1;

  constructor(private camera: Camera) {}

  /** The readable-darkness floor (0 = none). */
  setDarkFloor(k: number): void {
    if (k === this.floor) return;
    this.floor = k;
    this.sync();
  }

  /** The brightness calibration (Settings > Display > Brightness), clamped to `BRIGHTNESS_MIN` .. `BRIGHTNESS_MAX`
   *  so it cannot lift the dark band out of dark (bible L7). */
  setBrightness(k: number): void {
    const b = Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, k));
    if (b === this.bright) return;
    this.bright = b;
    this.sync();
  }

  get brightness(): number {
    return this.bright;
  }

  /** The floor in use (tests). */
  get darkFloor(): number {
    return this.floor;
  }

  /** Apply settings; creates or removes the pass as needed. */
  configure(vignette: boolean, grain: boolean): void {
    this.vignette = vignette ? 0.35 : 0;
    this.grain = grain ? 0.045 : 0;
    this.sync();
  }

  /** The map's colour grade (tint multiplier, saturation, contrast). */
  setGrade(g?: { tint?: [number, number, number]; saturation?: number; contrast?: number }): void {
    this.tint = g?.tint ?? [1, 1, 1];
    this.sat = g?.saturation ?? 1;
    this.contrast = g?.contrast ?? 1;
    this.sync();
  }

  private get graded(): boolean {
    return this.sat !== 1 || this.contrast !== 1 || this.tint[0] !== 1 || this.tint[1] !== 1 || this.tint[2] !== 1 || this.floor > 0 || this.bright !== 1;
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
    const needed = this.graded || this.vignette > 0 || this.grain > 0 || this.bars > 0.001 || this.barsTarget > 0 || this.nv > 0 || this.flash > 0 || this.feed > 0 || force;
    if (needed && !this.pp) {
      const pp = new PostProcess('cinematic', 'cinematic', ['vignette', 'grain', 'bars', 'time', 'aspect', 'nv', 'flash', 'feed', 'tint', 'sat', 'contrast', 'darkFloor', 'bright'], null, 1, this.camera);
      pp.onApply = (e) => {
        e.setFloat('vignette', this.vignette);
        e.setFloat('grain', this.grain);
        e.setFloat('bars', this.bars);
        e.setFloat('time', (this.t * 24) % 1000);
        e.setFloat('aspect', pp.width / Math.max(1, pp.height));
        e.setFloat('nv', this.nv);
        e.setFloat('flash', this.flash);
        e.setFloat('feed', this.feed);
        e.setFloat3('tint', this.tint[0], this.tint[1], this.tint[2]);
        e.setFloat('sat', this.sat);
        e.setFloat('contrast', this.contrast);
        e.setFloat('darkFloor', this.floor);
        e.setFloat('bright', this.bright);
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

  /** Move the pass back to the end of the camera's chain (after the post stack is rebuilt). */
  toEnd(): void {
    if (!this.pp) return;
    this.camera.detachPostProcess(this.pp);
    this.camera.attachPostProcess(this.pp);
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
