import { Constants, EffectRenderer, EffectWrapper, type Camera, type Observer, type PostProcessManager, type RenderTargetWrapper, type Scene } from '../core/babylon';
import { BLOOM, BRIGHT_GLSL } from './nightVision';

/** The bright pass: a 4-tap downsample of the scene (a 4 x 4 footprint through bilinear taps), each tap kept where it is
 *  bright before they are averaged (a thin lamp strip would otherwise average away with the dark ceiling round it). */
const BRIGHT = `
precision highp float;
varying vec2 vUV;
uniform sampler2D src;
uniform vec2 srcTexel;
// threshold, knee, 1 / store range
uniform vec3 bright;
${BRIGHT_GLSL}
vec3 tap(vec2 o) {
  vec3 c = texture2D(src, vUV + srcTexel * o).rgb;
  return c * brightShare(dot(c, vec3(0.2126, 0.7152, 0.0722)), bright.x, bright.y);
}
void main(void) {
  vec3 c = (tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0))) * 0.25;
  gl_FragColor = vec4(min(c, 16.0) * bright.z, 1.0);
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
 * The source is the first post process's input: the scene as rendered (the phone look: gamma-space 0..1, the
 * cinematic pass being first; desktop: linear 0..1 in an 8-bit target, before TAA and tone mapping). The targets are half float where the
 * GPU renders them, else 8-bit with the glow divided by `BLOOM.range` (`glowScale` undoes it).
 */
export class NightBloom {
  /** The blurred glow (null until the first frame with night vision). */
  glow: RenderTargetWrapper | null = null;
  /** The factor the post pass multiplies the glow by (the look's strength x the store range). */
  glowScale = 0;
  /** Night vision on (0..1), set by the game each render frame. */
  k = 0;
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
  private look = BLOOM.phone as { threshold: number; knee: number; strength: number };

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
    this.obs = scene.postProcessManager.onBeforeRenderObservable.add(() => this.run());
  }

  /** The look's bright pass: the phone's gamma-space image or the desktop's linear HDR. */
  setLook(phone: boolean): void {
    this.look = phone ? BLOOM.phone : BLOOM.desktop;
  }

  private run(): void {
    if (this.k <= 0 || this.scene.activeCamera !== this.camera) return;
    // the first post process (as Babylon's manager picks them: the first non-null): its input is the scene
    let src: RenderTargetWrapper | null = null;
    for (const p of this.camera._postProcesses) {
      if (p) {
        src = p.inputTexture;
        break;
      }
    }
    if (!src?.texture || !this.bright.effect.isReady() || !this.blur.effect.isReady()) return;
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
    e.setFloat3('bright', this.look.threshold, this.look.knee, store);
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
    r.restoreStates();
    this.glow = a;
    this.glowScale = this.look.strength / store;
    this.runs++;
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
    this.bright.dispose();
    this.blur.dispose();
    this.renderer.dispose();
  }
}
