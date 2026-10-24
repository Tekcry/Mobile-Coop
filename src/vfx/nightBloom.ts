import { Constants, type Effect, EffectRenderer, EffectWrapper, type Camera, type Observer, type PostProcessManager, type RenderTargetWrapper, type Scene } from '../core/babylon';
import { exposureBand, exposureK, NO_EXPOSURE, NV_EXPOSURE } from './nightExposure';
import { BLOOM, BRIGHT_GLSL } from './nightVision';

/** The bright pass: a 4-tap downsample of the scene (a 4 x 4 footprint through bilinear taps), each tap kept where it is
 *  bright before they are averaged (a thin lamp strip would otherwise average away with the dark ceiling round it).
 *  (nv-pass slice 1) A half-float scene (\`bright.w\` 1) is compressed first (\`bloomInput\`): its linear light runs far
 *  past 1 under the gain, and the old mask let every lit wall and body glow at its full HDR value. */
const BRIGHT = `
precision highp float;
varying vec2 vUV;
uniform highp sampler2D src;
uniform vec2 srcTexel;
// threshold, knee, 1 / store range, half-float source (1) or 8-bit (0)
uniform vec4 bright;
${BRIGHT_GLSL}
vec3 tap(vec2 o) {
  vec3 c = texture2D(src, vUV + srcTexel * o).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  if (bright.w > 0.5) {
    float k = bloomInput(l);
    c *= k / max(l, 1e-4);
    l = k;
  }
  return c * brightShare(l, bright.x, bright.y);
}
void main(void) {
  vec3 c = (tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0))) * 0.25;
  gl_FragColor = vec4(min(c, 16.0) * bright.z, 1.0);
}`;

/** (nv-pass fix round) The frame auto-gain's measure: the scene's luma (compressed on a half-float scene, as the bright
 *  pass does) into `NV_EXPOSURE.size` squared texels, 4 bilinear taps each. */
const MEASURE = `
precision highp float;
varying vec2 vUV;
uniform highp sampler2D src;
// x, y: a quarter of a measure texel (uv); z: half-float source (1) or 8-bit (0)
uniform vec3 measure;
${BRIGHT_GLSL}
float m(vec2 o) {
  float l = dot(texture2D(src, vUV + o).rgb, vec3(0.2126, 0.7152, 0.0722));
  return measure.z > 0.5 ? bloomInput(l) : clamp(l, 0.0, 1.0);
}
void main(void) {
  vec2 q = measure.xy;
  float c = (m(-q) + m(vec2(q.x, -q.y)) + m(vec2(-q.x, q.y)) + m(q)) * 0.25;
  gl_FragColor = vec4(c, c, c, 1.0);
}`;

/** A 4 x 4 box down to one texel (4 bilinear taps at the corners of the 2 x 2 quads). */
const REDUCE = `
precision highp float;
varying vec2 vUV;
uniform sampler2D src;
uniform vec2 srcTexel;
void main(void) {
  vec2 t = srcTexel;
  float c = (texture2D(src, vUV - t).r + texture2D(src, vUV + vec2(t.x, -t.y)).r + texture2D(src, vUV + vec2(-t.x, t.y)).r + texture2D(src, vUV + t).r) * 0.25;
  gl_FragColor = vec4(c, c, c, 1.0);
}`;

/** The ease: the previous eased mean moves towards this frame's by k (`exposureK`). */
const EASE = `
precision highp float;
varying vec2 vUV;
uniform sampler2D src;
uniform sampler2D prev;
uniform float k;
void main(void) {
  float c = mix(texture2D(prev, vec2(0.5)).r, texture2D(src, vec2(0.5)).r, k);
  gl_FragColor = vec4(c, c, c, 1.0);
}`;

/** One direction of a 9-tap Gaussian through 5 bilinear taps. */
const BLUR = `
precision highp float;
varying vec2 vUV;
uniform sampler2D src;
uniform vec2 dir;
void main(void) {
  vec3 c = texture2D(src, vUV).rgb * 0.227027;
  c += (texture2D(src, vUV + dir * 1.384615).rgb + texture2D(src, vUV - dir * 1.384615).rgb) * 0.316216;
  c += (texture2D(src, vUV + dir * 3.230769).rgb + texture2D(src, vUV - dir * 3.230769).rgb) * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}`;

/**
 * Night vision's bloom (Phase 1 Step 4b fix round 4; rendering only): while the goggles are on, after the scene has
 * rendered and before the post passes draw (`PostProcessManager.onBeforeRenderObservable`), the scene's bright parts are
 * downsampled to `BLOOM.scale`, blurred (`BLOOM.passes` x a horizontal and a vertical 9-tap Gaussian) into `glow`, which
 * `CinematicPost` adds to the tube's drive. Off, it does nothing (the post pass does not read it then).
 *
 * The source is the first post process's input: the scene as rendered, before TAA and tone mapping - linear light in
 * a half-float target where the GPU renders one (Step 4b fix round 5, `PostStack.hdr`; compressed before the threshold),
 * else 8-bit linear 0..1 (`?gfx=min`, or no half-float support). The glow targets are half float where the GPU renders
 * them, else 8-bit with the glow divided by `BLOOM.range` (`glowScale` undoes it).
 */
export class NightBloom {
  /** The blurred glow (null until the first frame with night vision). */
  glow: RenderTargetWrapper | null = null;
  /** The factor the post pass multiplies the glow by (the look's strength x the store range). */
  glowScale = 0;
  /** Night vision on (0..1), set by the game each render frame. */
  k = 0;
  /** (nv-pass fix round) The frame auto-gain's eased mean, 1 x 1 (null until the first frame with night vision), and the
   *  band `CinematicPost` applies to it (`exposureBand`: half-float or 8-bit scene). */
  exposure: RenderTargetWrapper | null = null;
  exposureBand: readonly [number, number, number, number] = NO_EXPOSURE;
  /** Runs (tests). */
  runs = 0;
  private a: RenderTargetWrapper | null = null;
  private b: RenderTargetWrapper | null = null;
  private w = 0;
  private h = 0;
  private readonly half: boolean;
  private readonly renderer: EffectRenderer;
  private readonly bright: EffectWrapper;
  private readonly blur: EffectWrapper;
  private obs: Observer<PostProcessManager> | null;
  private readonly measure: EffectWrapper;
  private readonly reduce: EffectWrapper;
  private readonly ease: EffectWrapper;
  /** The measure chain (size, size / 4, ... 1) and the eased mean's two 1 x 1 targets. */
  private chain: RenderTargetWrapper[] = [];
  private eased: [RenderTargetWrapper, RenderTargetWrapper] | null = null;
  private flipE = 0;
  private last = -1;
  private readonly look = BLOOM.bright;

  constructor(
    private readonly scene: Scene,
    private readonly camera: Camera,
  ) {
    const engine = scene.getEngine();
    this.half = engine.getCaps().textureHalfFloatRender;
    this.renderer = new EffectRenderer(engine);
    // (compiled now, at load: no hitch on the first press of the goggles)
    this.bright = new EffectWrapper({ engine, name: 'nvBright', fragmentShader: BRIGHT, uniformNames: ['srcTexel', 'bright'], samplerNames: ['src'] });
    this.blur = new EffectWrapper({ engine, name: 'nvBlur', fragmentShader: BLUR, uniformNames: ['dir'], samplerNames: ['src'] });
    this.measure = new EffectWrapper({ engine, name: 'nvMeasure', fragmentShader: MEASURE, uniformNames: ['measure'], samplerNames: ['src'] });
    this.reduce = new EffectWrapper({ engine, name: 'nvReduce', fragmentShader: REDUCE, uniformNames: ['srcTexel'], samplerNames: ['src'] });
    this.ease = new EffectWrapper({ engine, name: 'nvEase', fragmentShader: EASE, uniformNames: ['k'], samplerNames: ['src', 'prev'] });
    this.obs = scene.postProcessManager.onBeforeRenderObservable.add(() => this.run());
  }

  private run(): void {
    if (this.k <= 0 || this.scene.activeCamera !== this.camera) {
      // goggles off: the next frame on starts the ease from that frame's mean
      if (this.k <= 0) this.last = -1;
      return;
    }
    // the first post process (as Babylon's manager picks them: the first non-null): its input is the scene
    let src: RenderTargetWrapper | null = null;
    for (const p of this.camera._postProcesses) {
      if (p) {
        src = p.inputTexture;
        break;
      }
    }
    if (!src?.texture || !this.bright.effect.isReady() || !this.blur.effect.isReady() || !this.measure.effect.isReady() || !this.reduce.effect.isReady() || !this.ease.effect.isReady()) return;
    // (the scene renders into the first pass's input: the frame is complete here, before any pass draws)
    const sw = src.width;
    const sh = src.height;
    const w = Math.max(1, Math.round(sw * BLOOM.scale));
    const h = Math.max(1, Math.round(sh * BLOOM.scale));
    if (w !== this.w || h !== this.h || !this.a || !this.b) this.makeTargets(w, h);
    const a = this.a!;
    const b = this.b!;
    const engine = this.renderer.engine;
    const r = this.renderer;
    const store = this.half ? 1 : 1 / BLOOM.range;
    r.saveStates();
    // the bright pass: scene -> a
    engine.bindFramebuffer(a);
    r.setViewport();
    r.applyEffectWrapper(this.bright);
    let e = this.bright.effect;
    e._bindTexture('src', src.texture);
    e.setFloat2('srcTexel', 1 / sw, 1 / sh);
    // (slice 1) a half-float scene is compressed and measured against `threshold`; an 8-bit one against `ldrThreshold`
    const t = src.texture.type;
    const hdr = t === Constants.TEXTURETYPE_HALF_FLOAT || t === Constants.TEXTURETYPE_FLOAT;
    e.setFloat4('bright', hdr ? this.look.threshold : this.look.ldrThreshold, this.look.knee, store, hdr ? 1 : 0);
    r.draw();
    engine.unBindFramebuffer(a);
    // the blur: a -> b (horizontal), b -> a (vertical)
    for (let p = 0; p < BLOOM.passes; p++) {
      for (let v = 0; v < 2; v++) {
        const from = v ? b : a;
        const to = v ? a : b;
        engine.bindFramebuffer(to);
        r.setViewport();
        r.applyEffectWrapper(this.blur);
        e = this.blur.effect;
        e._bindTexture('src', from.texture);
        e.setFloat2('dir', v ? 0 : BLOOM.spread / w, v ? BLOOM.spread / h : 0);
        r.draw();
        engine.unBindFramebuffer(to);
      }
    }
    this.runExposure(src.texture, hdr);
    r.restoreStates();
    this.glow = a;
    this.glowScale = this.look.strength / store;
    this.runs++;
  }

  /** (nv-pass fix round) The frame auto-gain: the scene's mean luma reduced to 1 x 1 and eased, all on the GPU. */
  private runExposure(src: NonNullable<RenderTargetWrapper['texture']>, hdr: boolean): void {
    if (!this.eased) this.makeExposureTargets();
    const engine = this.renderer.engine;
    const r = this.renderer;
    // the scene -> size x size
    const q = 0.25 / NV_EXPOSURE.size;
    let e = this.pass(this.chain[0]!, this.measure);
    e._bindTexture('src', src);
    e.setFloat3('measure', q, q, hdr ? 1 : 0);
    r.draw();
    engine.unBindFramebuffer(this.chain[0]!);
    // 4 x 4 boxes down to 1 x 1
    for (let i = 1; i < this.chain.length; i++) {
      const from = this.chain[i - 1]!;
      const to = this.chain[i]!;
      e = this.pass(to, this.reduce);
      e._bindTexture('src', from.texture);
      e.setFloat2('srcTexel', 1 / from.width, 1 / from.height);
      r.draw();
      engine.unBindFramebuffer(to);
    }
    // the ease (the first frame with the goggles on starts from its own mean; an 8-bit store cannot hold a slow ease,
    // its steps are 1/255, so there it follows the frame)
    const now = performance.now();
    const k = this.last < 0 || !this.half ? 1 : exposureK(Math.min(0.25, (now - this.last) / 1000));
    this.last = now;
    const eased = this.eased!;
    const prev = eased[this.flipE as 0 | 1];
    const next = eased[(1 - this.flipE) as 0 | 1];
    e = this.pass(next, this.ease);
    e._bindTexture('src', this.chain[this.chain.length - 1]!.texture);
    e._bindTexture('prev', prev.texture);
    e.setFloat('k', k);
    r.draw();
    engine.unBindFramebuffer(next);
    this.flipE = 1 - this.flipE;
    this.exposure = next;
    this.exposureBand = exposureBand(hdr);
  }

  private pass(to: RenderTargetWrapper, fx: EffectWrapper): Effect {
    this.renderer.engine.bindFramebuffer(to);
    this.renderer.setViewport();
    this.renderer.applyEffectWrapper(fx);
    return fx.effect;
  }

  private makeExposureTargets(): void {
    const engine = this.scene.getEngine();
    const opts = {
      generateMipMaps: false,
      generateDepthBuffer: false,
      generateStencilBuffer: false,
      type: this.half ? Constants.TEXTURETYPE_HALF_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE,
      format: Constants.TEXTUREFORMAT_RGBA,
      samplingMode: Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
    };
    this.chain = [];
    for (let s = NV_EXPOSURE.size; s >= 1; s = s / 4) this.chain.push(engine.createRenderTargetTexture({ width: s, height: s }, opts));
    this.eased = [engine.createRenderTargetTexture({ width: 1, height: 1 }, opts), engine.createRenderTargetTexture({ width: 1, height: 1 }, opts)];
  }

  private makeTargets(w: number, h: number): void {
    const engine = this.scene.getEngine();
    this.a?.dispose();
    this.b?.dispose();
    const opts = {
      generateMipMaps: false,
      generateDepthBuffer: false,
      generateStencilBuffer: false,
      type: this.half ? Constants.TEXTURETYPE_HALF_FLOAT : Constants.TEXTURETYPE_UNSIGNED_BYTE,
      format: Constants.TEXTUREFORMAT_RGBA,
      samplingMode: Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
    };
    this.a = engine.createRenderTargetTexture({ width: w, height: h }, opts);
    this.b = engine.createRenderTargetTexture({ width: w, height: h }, opts);
    this.w = w;
    this.h = h;
  }

  dispose(): void {
    if (this.obs) this.scene.postProcessManager.onBeforeRenderObservable.remove(this.obs);
    this.obs = null;
    this.a?.dispose();
    this.b?.dispose();
    this.a = this.b = this.glow = null;
    for (const t of this.chain) t.dispose();
    this.chain = [];
    this.eased?.[0].dispose();
    this.eased?.[1].dispose();
    this.eased = null;
    this.exposure = null;
    this.measure.dispose();
    this.reduce.dispose();
    this.ease.dispose();
    this.bright.dispose();
    this.blur.dispose();
    this.renderer.dispose();
  }
}
