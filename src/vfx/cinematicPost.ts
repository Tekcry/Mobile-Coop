import { Effect, Matrix, PostProcess, type Camera } from '../core/babylon';
import type { NightBloom } from './nightBloom';
import { BRIGHTNESS_GLSL, brightnessGain } from './displayBrightness';
import { EXPOSURE_GLSL, NO_EXPOSURE } from './nightExposure';
import { NV_GLSL, NV_TONE } from './nightVision';
import { ELECTRO, GOGGLE_GLSL, SENSOR_GRAIN, THERMAL, THERMAL_SURFACE, THERMAL_SURFACE_GLSL, VISION_GLSL } from './visionLook';
import type { DepthSource } from './taau';

Effect.ShadersStore['cinematicFragmentShader'] = `
precision mediump float;
varying vec2 vUV;
// (LR16-L B1) highp samplers: HDR colour must not ride on the default lowp sampler
uniform highp sampler2D textureSampler;
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
uniform float bright;
uniform highp sampler2D glowSampler;
uniform float glowScale;
uniform float veil;
uniform float vk;
uniform float nvLift;
uniform highp sampler2D exposureSampler;
uniform vec4 expo;
// (thermal-read) thermal's and electro's scene from the scene depth (THERMAL_SURFACE_GLSL); tDepth 0: no depth (gfx=min)
uniform highp sampler2D depthSampler;
uniform float tDepth;
uniform float depthRaw;
uniform highp float minZ;
uniform highp float maxZ;
uniform float tanY;
uniform highp mat4 invView;
uniform highp vec3 camPos;
uniform vec2 texel;
${NV_GLSL}
${EXPOSURE_GLSL}
${VISION_GLSL}
${GOGGLE_GLSL}
${THERMAL_SURFACE_GLSL}
${BRIGHTNESS_GLSL}
void main(void) {
  vec4 c = texture2D(textureSampler, vUV);
  // (step 21v) the pixel's luma before the grade: night vision's soften adds its taps' difference from it
  float l0 = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  // the map's colour grade: tint, saturation, contrast round mid grey
  vec3 gr = c.rgb * tint;
  float gl = dot(gr, vec3(0.299, 0.587, 0.114));
  gr = mix(vec3(gl), gr, sat);
  c.rgb = max((gr - 0.5) * contrast + 0.5, 0.0);
  // (brightness-range) the player's brightness is a display curve after the vision modes (below), not a multiplier
  // here: night vision, thermal and electro read the un-brightened scene
  vec2 d = vUV - 0.5;
  d.x *= aspect;
  float n = fract(sin(dot(floor(vUV * 720.0) + time, vec2(12.9898, 78.233))) * 43758.5453);
  if (nv > 0.0) {
    // (Step 4b) the gain is in the lighting (\`LampPlugin\`, \`VISION_GAIN\`). (Step 4b fix) the tube
    // (\`nightVision.ts\`): the bloom of the bright parts (\`NightBloom\`) joins the drive, the phosphor is a modern
    // green (nv-pass slice 1; was a pale grey-green) that clips to a pale green-white, intensifier grain is strongest in
    // the dark; the goggle frame below darkens the edge (nv-pass slice 2: the eyepiece vignette went into it)
    float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    // (step 21v) the tube's softening: two diagonal taps of the scene, their difference from the raw pixel added to
    // the graded luma (the grade stays as it was)
    vec2 so = vec2(${THERMAL.blur.toFixed(4)} / max(aspect, 0.1), ${THERMAL.blur.toFixed(4)});
    float sl = dot(texture2D(textureSampler, vUV + so).rgb + texture2D(textureSampler, vUV - so).rgb, vec3(0.2126, 0.7152, 0.0722)) * 0.5;
    l = max(l + (sl - l0) * ${SENSOR_GRAIN.softNight.toFixed(3)}, 0.0);
    float g = dot(texture2D(glowSampler, vUV).rgb, vec3(0.2126, 0.7152, 0.0722)) * glowScale;
    // (nv-pass slice 1) without baked lamps the lighting has no gain: the tube lifts its input (nvLift, NV_TONE.postLift)
    // (nv-pass fix round) the frame auto-gain (\`nightExposure.ts\`): the eased frame mean (\`NightBloom\`) lifts a black
    // frame and pulls a clipping one down; lit rooms sit in its band and keep their drive
    float drive = nvDrive(l * nvLift * nvExposure(texture2D(exposureSampler, vec2(0.5)).r, expo), veil) + g;
    vec3 p = nvColor(drive, veil);
    // (step 21v) intensifier grain (SENSOR_GRAIN), strongest in the dark
    // (nv-pass slice 1: tinted with the phosphor, as electro's is; a grey grain over the green reads as dirt)
    p += vec3(${NV_TONE.tint.map((x) => (x / NV_TONE.tint[1]).toFixed(3)).join(', ')}) * sensorNoise(vUV, aspect, time) * sensorAmp(${SENSOR_GRAIN.night.toFixed(3)}, ${SENSOR_GRAIN.litNight.toFixed(3)}, drive);
    c.rgb = mix(c.rgb, max(p, 0.0), nv);
  }
  if (vk > 0.5) {
    // (step 14) thermal (vk 1) / electro (vk 2): post branches of this pass (no extra target); warm bodies and live devices are bright through render-only emissive flags (\`visionLook.ts\`)
    float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
    // softened: four taps round the pixel (sensor images are soft; step 21v adds electro's)
    vec2 o = vec2(${THERMAL.blur.toFixed(4)} / max(aspect, 0.1), ${THERMAL.blur.toFixed(4)});
    float s = dot(texture2D(textureSampler, vUV + o).rgb + texture2D(textureSampler, vUV - o).rgb
      + texture2D(textureSampler, vUV + vec2(o.x, -o.y)).rgb + texture2D(textureSampler, vUV - vec2(o.x, -o.y)).rgb, vec3(0.2126, 0.7152, 0.0722)) * 0.25;
    vec3 p;
    vec3 ga;
    if (vk < 1.5) {
      float tl = mix(l, s, ${SENSOR_GRAIN.softThermal.toFixed(3)});
      float th = heatOf(tl);
      p = thermalColor(tl);
      // (thermal-read) the cold scene is the surface rebuilt from the depth (readable with no light at all); people and
      // the door silhouette (heat) take over on the hot ramp
      if (tDepth > 0.5) p = mix(surfaceColor(surfaceField(vUV, l)), p, smoothstep(${THERMAL_SURFACE.blendLo.toFixed(4)}, ${THERMAL_SURFACE.blendHi.toFixed(4)}, th));
      ga = vec3(thermalGrain(th));
    } else {
      float el = mix(l, s, ${SENSOR_GRAIN.softElectro.toFixed(3)});
      p = electroColor(el);
      // (thermal-read) electro's scene from the same depth field in its own navy; live devices still glow white on top
      if (tDepth > 0.5) p = mix(electroSurfaceColor(surfaceField(vUV, l)), vec3(${ELECTRO.glow.map((x) => x.toFixed(3)).join(', ')}), smoothstep(${ELECTRO.glowFrom.toFixed(3)}, ${ELECTRO.glowTo.toFixed(3)}, el));
      ga = vec3(${SENSOR_GRAIN.electroTint.map((x) => x.toFixed(3)).join(", ")}) * sensorAmp(${SENSOR_GRAIN.electro.toFixed(3)}, ${SENSOR_GRAIN.litElectro.toFixed(3)}, dot(p, vec3(0.2126, 0.7152, 0.0722)));
    }
    // (step 21v, A87) animated sensor grain, luminance-weighted (SENSOR_GRAIN)
    p += sensorNoise(vUV, aspect, time) * ga;
    if (vk > 1.5) {
      // (F1b, gog-4) electro: live devices (the bright pixels) fuzz and flicker with interference: coarse noise, scan
      // lines drifting up the screen, and a stuttering dropout
      float dv = smoothstep(0.35, 0.75, l);
      float fz = sensorNoise(vUV * 1.7 + 0.31, aspect * 0.35, time * 2.0);
      float ln = sin(vUV.y * 520.0 + time * 55.0);
      p += vec3(0.55, 0.75, 1.0) * dv * (fz * 0.9 + ln * 0.08);
      p *= 1.0 - dv * 0.35 * smoothstep(0.55, 1.0, fract(sin(floor(time * 14.0) * 12.9898) * 43758.5453));
    }
    c.rgb = max(p, 0.0);
  }
  if (vk > 0.5 || nv > 0.0) {
    // (nv-pass slice 2) the goggle frame (GOGGLE_FRAME, one goggle for every mode): a wide rounded frame the shape of
    // the screen, a soft falloff only in the outer band (the corners down to the floor) and a thin, faint rim; replaces
    // F1b's round lens and the per-mode eyepiece vignette. It fades in with the night-vision blend.
    float gk = vk > 0.5 ? 1.0 : nv;
    float ge = goggleEdge(vUV, aspect);
    c.rgb = c.rgb * mix(1.0, goggleShade(ge), gk) + goggleRimTint * goggleRim(ge) * gk;
  }
  if (feed > 0.0) {
    float l = dot(c.rgb, vec3(0.3, 0.59, 0.11));
    vec3 f = vec3(0.75, 0.9, 1.0) * (0.08 + l * 1.25) * (0.9 + 0.1 * sin(vUV.y * 900.0)) + (n - 0.5) * 0.08;
    f *= smoothstep(0.9, 0.4, length(d));
    c.rgb = mix(c.rgb, f, feed);
  }
  // (brightness-range) the player's brightness (\`displayBrightness.ts\`): shadows -1.5 .. +1.5 stops, white and black
  // fixed (no clipping at the top); skipped at the default so it is today's picture exactly
  if (bright != 1.0) c.rgb = displayBright(c.rgb, bright);
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
  /** (Step 14) the vision post mode: 0 off / night, 1 thermal, 2 electro. */
  private vk = 0;
  /** Night vision's bloom (`NightBloom`) and auto-gain (`NightAutoGain.veil`). */
  private bloom: NightBloom | null = null;
  private veil = 0;
  /** Flashbang white-out 0..1 (decays in `update`). */
  private flash = 0;
  /** Remote camera feed look (sticky cam) 0..1. */
  private feed = 0;
  private t = 0;
  /** Colour grade (identity = off). */
  private tint: [number, number, number] = [1, 1, 1];
  private sat = 1;
  private contrast = 1;
  /** The brightness display curve's gain (`brightnessGain`; 1 = default, about 0.35 .. 2.83). */
  private bright = 1;
  /** The slider value the gain was taken from (called each frame: the gain is only recomputed when it changes). */
  private brightLevel = 1;

  constructor(private camera: Camera) {}

  /** The brightness setting (Settings > Display > Brightness, the stored slider value): its display curve's gain
   *  (`displayBrightness.ts`, brightness-range: -1.5 .. +1.5 stops in the shadows). Render only. */
  setBrightness(k: number): void {
    if (k === this.brightLevel) return;
    this.brightLevel = k;
    const b = brightnessGain(k);
    if (b === this.bright) return;
    this.bright = b;
    this.sync();
  }

  /** The display curve's gain in use (1 at the default). */
  get brightness(): number {
    return this.bright;
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
    return this.sat !== 1 || this.contrast !== 1 || this.tint[0] !== 1 || this.tint[1] !== 1 || this.tint[2] !== 1 || this.bright !== 1;
  }

  /** Night-vision goggles blend (0 off .. 1). */
  setNightVision(k: number): void {
    if (k === this.nv) return;
    this.nv = k;
    this.sync();
  }

  /** The night-vision blend in use (the post stack follows it: its own bloom is off under the goggles). */
  get nightVision(): number {
    return this.nv;
  }

  /** (nv-pass slice 1) The tube's input lift: 1 with baked lamps (the gain is in the lighting), `NV_TONE.postLift`
   *  without (`?gfx=min`). Read each frame, no rebuild. */
  private nvLift = 1;
  setNightLift(k: number): void {
    this.nvLift = k;
  }

  /** (thermal-read) Where thermal and electro read the scene depth (the post stack: `PostStack.viewDepth`, null without one). */
  private depthOf: { readonly viewDepth: DepthSource | null } | null = null;
  private readonly invView = new Matrix();
  setDepthSource(src: { readonly viewDepth: DepthSource | null } | null): void {
    this.depthOf = src;
  }

  /** (Step 14) thermal (1) / electro (2) vision, 0 = neither (rendering only). */
  setVisionKind(k: number): void {
    if (k === this.vk) return;
    this.vk = k;
    this.sync();
  }

  /** The vision post mode in use (tests: `post.vk`). */
  get visionKind(): number {
    return this.vk;
  }

  /** Night vision's bloom (Step 4b fix round 4): its glow is read each frame. */
  setBloom(bloom: NightBloom | null): void {
    this.bloom = bloom;
  }

  /** Night vision's auto-gain (`NightAutoGain.veil`). */
  setAutoGain(veil: number): void {
    this.veil = veil;
  }

  /** White-out (a flashbang in view); fades over ~2 s. */
  whiteOut(k: number): void {
    this.flash = Math.max(this.flash, Math.min(1, k));
    this.sync();
  }

  /** Remote camera feed look (sticky cam view). */
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
    const needed = this.graded || this.vignette > 0 || this.grain > 0 || this.bars > 0.001 || this.barsTarget > 0 || this.nv > 0 || this.vk > 0 || this.flash > 0 || this.feed > 0 || force;
    if (needed && !this.pp) {
      const pp = new PostProcess(
        'cinematic',
        'cinematic',
        ['vignette', 'grain', 'bars', 'time', 'aspect', 'nv', 'flash', 'feed', 'tint', 'sat', 'contrast', 'bright', 'glowScale', 'veil', 'vk', 'nvLift', 'expo', 'tDepth', 'depthRaw', 'minZ', 'maxZ', 'tanY', 'invView', 'camPos', 'texel'],
        ['glowSampler', 'exposureSampler', 'depthSampler'],
        1,
        this.camera,
      );
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
        e.setFloat('bright', this.bright);
        // the glow (always bound: an unbound sampler could read the target being drawn); the scene stands in before the
        // first bloom, unread then (night vision off)
        const glow = this.bloom?.glow;
        e._bindTexture('glowSampler', glow ? glow.texture : pp.inputTexture.texture);
        e.setFloat('glowScale', glow ? this.bloom!.glowScale : 0);
        e.setFloat('veil', this.veil);
        e.setFloat('vk', this.vk);
        e.setFloat('nvLift', this.nvLift);
        // (nv-pass fix round) the frame auto-gain's eased mean; before the first measure the scene stands in, with a
        // band that gives a gain of 1
        const ex = this.bloom?.exposure;
        e._bindTexture('exposureSampler', ex ? ex.texture : pp.inputTexture.texture);
        const b = ex ? this.bloom!.exposureBand : NO_EXPOSURE;
        e.setFloat4('expo', b[0], b[1], b[2], b[3]);
        // (thermal-read) thermal's and electro's surfaces from the post stack's scene depth (no extra pass); the scene
        // stands in, unread, without one or in the other modes
        const depth = this.vk > 0 ? (this.depthOf?.viewDepth ?? null) : null;
        e.setFloat('tDepth', depth ? 1 : 0);
        if (depth) {
          const cam = this.camera;
          depth.bind(e, 'depthSampler');
          e.setFloat('depthRaw', depth.mode);
          cam.getViewMatrix().invertToRef(this.invView);
          e.setMatrix('invView', this.invView);
          const p = cam.globalPosition;
          e.setFloat3('camPos', p.x, p.y, p.z);
          e.setFloat('minZ', cam.minZ);
          e.setFloat('maxZ', cam.maxZ);
          e.setFloat('tanY', Math.tan(cam.fov / 2));
          e.setFloat2('texel', 1 / Math.max(1, pp.width), 1 / Math.max(1, pp.height));
        } else e._bindTexture('depthSampler', pp.inputTexture.texture);
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
