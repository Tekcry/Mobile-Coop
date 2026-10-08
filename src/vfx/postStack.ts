import {
  DefaultRenderingPipeline,
  Effect,
  ImageProcessingConfiguration,
  Matrix,
  MotionBlurPostProcess,
  PostProcess,
  SSAO2RenderingPipeline,
  SSRRenderingPipeline,
  TAARenderingPipeline,
  type Camera,
  type DepthRenderer,
  type GeometryBufferRenderer,
  type Scene,
  type BaseTexture,
  Constants,
  RawTexture3D,
  Texture,
} from '../core/babylon';
import type { QualityLevel } from '../core/quality';
import type { LightRegistry } from '../world/lights';
import { RtReflections, type RtSource } from './rtReflections';
import { Taau, VIEW_Z_GLSL, type DepthSource } from './taau';
import { PaniniPass } from './paniniPass';

/** Lights the volumetric pass scatters (nearest the camera). */
export const VOL_LIGHTS = 12;
/** Ray-march samples per light segment. */
const VOL_STEPS = 16;

/**
 * Volumetric light and height fog: for each pixel the view ray (stopped by the scene depth) is intersected with
 * every nearby light's sphere; inside it a short march sums the in-scattered light of the cone (spot falloff and
 * distance attenuation), with a per-pixel dither. Height fog thickens towards the floor. Runs in HDR before tone
 * mapping, so the beams bloom.
 */
Effect.ShadersStore['volumetricFragmentShader'] = `
precision highp float;
precision highp sampler3D;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler3D skyVis;
uniform vec4 skyO;
uniform vec3 skyD;
uniform vec3 shaftCol;
uniform sampler2D depthSampler;
// 1: the depth is the G-buffer's raw view z (0 = nothing drawn); 0: the depth renderer's (z + minZ) / (minZ + maxZ);
// 2: the scene pass's hardware depth (3.2)
uniform float depthRaw;
uniform mat4 invView;
uniform vec3 camPos;
uniform float tanY;
uniform float aspect;
uniform float minZ;
uniform float maxZ;
uniform int count;
uniform float steps;
uniform vec4 lPos[${VOL_LIGHTS}];
uniform vec4 lDir[${VOL_LIGHTS}];
uniform vec4 lCol[${VOL_LIGHTS}];
${VIEW_Z_GLSL}
uniform vec3 fogColor;
uniform float fogDensity;
uniform float fogFalloff;
uniform float fogBase;
uniform float scatter;
uniform float time;
uniform float shimmer;

// interleaved gradient noise (steady: TAA / the eye average it, no crawling grain)
float hash(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

void main(void) {
  float viewZ = sceneViewZ(texture2D(depthSampler, vUV).r);
  // heat haze: distant, low parts of the view shimmer
  vec2 suv = vUV;
  if (shimmer > 0.0) {
    float far = smoothstep(0.04, 0.3, viewZ / maxZ);
    suv += vec2(sin(vUV.y * 140.0 + time * 4.0), cos(vUV.x * 110.0 + time * 3.1)) * 0.0011 * shimmer * far * smoothstep(0.75, 0.35, vUV.y);
  }
  vec4 c = texture2D(textureSampler, suv);
  vec2 ndc = vUV * 2.0 - 1.0;
  vec3 vdir = vec3(ndc.x * tanY * aspect, ndc.y * tanY, 1.0);
  float dist = viewZ * length(vdir);
  vec3 wdir = normalize((invView * vec4(vdir, 0.0)).xyz);
  float j = hash(gl_FragCoord.xy);
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${VOL_LIGHTS}; i++) {
    if (i >= count) break;
    vec3 lp = lPos[i].xyz;
    float r = lPos[i].w;
    // ray / sphere: the stretch of the ray inside the light's reach
    vec3 oc = camPos - lp;
    float b = dot(oc, wdir);
    float cc = dot(oc, oc) - r * r;
    float h = b * b - cc;
    if (h <= 0.0) continue;
    h = sqrt(h);
    float t0 = max(-b - h, 0.0);
    float t1 = min(-b + h, dist);
    if (t1 <= t0) continue;
    float seg = (t1 - t0) / steps;
    vec3 sum = vec3(0.0);
    for (int k = 0; k < ${VOL_STEPS}; k++) {
      if (float(k) >= steps) break;
      float t = t0 + (float(k) + 0.25 + j * 0.5) * seg;
      vec3 v = camPos + wdir * t - lp;
      float l = length(v);
      float att = max(0.0, 1.0 - l / r);
      att *= att;
      float cosA = dot(v / max(l, 1e-3), lDir[i].xyz);
      float cone = smoothstep(lDir[i].w, mix(lDir[i].w, 1.0, 0.35), cosA);
      sum += vec3(att * cone);
    }
    acc += sum * seg * lCol[i].rgb;
  }
  // light shafts (fog weather): fog lit by the sky / moon where the sky reaches it (under the skylights, through
  // doorways), sampled from the baked sky visibility along the first 30 m of the ray
  if (skyO.w > 0.0 && dot(shaftCol, shaftCol) > 0.0) {
    float tm = min(dist, 30.0);
    float sseg = tm / 16.0;
    float sh = 0.0;
    for (int k = 0; k < 16; k++) {
      vec3 p = camPos + wdir * ((float(k) + j) * sseg);
      float v = texture(skyVis, (p - skyO.xyz) / (skyO.w * skyD)).r;
      sh += v * v * exp(-fogFalloff * max(p.y - fogBase, 0.0));
    }
    acc += shaftCol * sh * sseg;
  }
  // height fog: optical depth of exp(-falloff * (y - base)) along the ray, closed form
  float y0 = camPos.y - fogBase;
  float dy = wdir.y;
  float k = fogFalloff;
  float od = fogDensity * exp(-k * y0) * (abs(dy * k) > 1e-4 ? (1.0 - exp(-k * dy * dist)) / (k * dy) : dist);
  float fog = 1.0 - exp(-max(od, 0.0));
  c.rgb = mix(c.rgb, fogColor, fog) + acc * scatter;
  gl_FragColor = c;
}`;

export interface PostStackOptions {
  /** Fog colour (the map's horizon) and how thick the low-lying fog is. */
  fogColor: [number, number, number];
  fogDensity: number;
  /** Lights scattered by the volumetric pass (null: fog only). */
  lights: LightRegistry | null;
  /** Heat haze 0..1. */
  shimmer?: number;
  /** Sky visibility (the voxel bake) for the fog's light shafts, and the shafts' colour x strength (0: none). */
  sky?: { tex: BaseTexture; origin: [number, number, number]; cell: number; dims: [number, number, number] } | null;
  shafts?: [number, number, number];
  /** Ray-traced reflections' source (the voxel world); null: Ray traced falls back to screen space. */
  rt?: RtSource | null;
}

/**
 * The PC renderer's post stack, rebuilt on a graphics change (Settings > Graphics): TAA (or MSAA / FXAA), SSAO,
 * screen-space reflections, motion blur, volumetric light and fog, then the default pipeline (bloom, depth of
 * field, chromatic aberration, HDR tone mapping). The cinematic pass (grade, vignette, goggles) stays last.
 */
export class PostStack {
  private def: DefaultRenderingPipeline | null = null;
  private ssao: SSAO2RenderingPipeline | null = null;
  private ssr: SSRRenderingPipeline | null = null;
  private rtr: RtReflections | null = null;
  private taau: Taau | null = null;
  private panini: PaniniPass | null = null;
  private taa: TAARenderingPipeline | null = null;
  private motion: MotionBlurPostProcess | null = null;
  private noSky: RawTexture3D | null = null;
  private vol: PostProcess | null = null;
  private depth: DepthRenderer | null = null;
  private gbr: GeometryBufferRenderer | null = null;
  private dofDepth: DepthRenderer | null = null;

  /** The scene depth for fog / TAAU: the G-buffer's (raw view z) when there is one, else the depth renderer's. */
  private depthSource(): DepthSource {
    const g = this.gbr;
    if (g) return { bind: (e, n) => e.setTexture(n, g.getGBuffer().textures[g.getTextureIndex(0)]!), mode: 1 };
    // 3.2: the scene pass's own depth buffer as a texture (the first post process's input) - no second geometry pass
    // (the phones' biggest saving: a whole extra draw of the scene); MSAA keeps the depth renderer
    if (!this.msaa) return { bind: (e, n) => this.bindSceneDepth(e, n), mode: 2 };
    this.depth ??= this.scene.enableDepthRenderer(this.camera, false, true);
    const d = this.depth;
    d.enabled = true;
    return { bind: (e, n) => e.setTexture(n, d.getDepthMap()), mode: 0 };
  }

  /** MSAA on (a multisampled scene target has no single-sample depth to read). */
  private msaa = false;

  /** Bind the scene pass's depth: the first post process's input target, given a depth texture once (and again
   *  whenever the target is recreated - a resize). */
  private bindSceneDepth(e: Effect, name: string): void {
    const pps = this.camera._postProcesses;
    let first: PostProcess | null = null;
    for (let i = 0; i < pps.length && !first; i++) first = pps[i] ?? null;
    const rt = first?.inputTexture;
    if (rt && !rt.depthStencilTexture) rt.createDepthStencilTexture(0, false, false, 1);
    const t = rt?.depthStencilTexture;
    if (t) e._bindTexture(name, t);
  }
  private key = '';
  private readonly invView = new Matrix();
  private readonly lPos = new Float32Array(VOL_LIGHTS * 4);
  private readonly lDir = new Float32Array(VOL_LIGHTS * 4);
  private readonly lCol = new Float32Array(VOL_LIGHTS * 4);
  private ids = new Int32Array(VOL_LIGHTS);
  private dist = new Float32Array(VOL_LIGHTS);
  private volCount = 0;
  /** Lights the volumetric pass may scatter (0: fog only): the preset's x the frame governor's share. */
  private volMax = VOL_LIGHTS;
  private volBase = VOL_LIGHTS;
  private volMul = 1;
  /** March steps per light (Epic effects 16, else 8). */
  private volSteps = 8;
  private upscale = 1;

  /** The frame governor (3.1): the TAAU input scale and the share of volumetric lights (uniforms / sizes only). */
  setAdaptive(scale: number, volLights: number): void {
    this.volMul = volLights;
    this.volMax = Math.round(this.volBase * volLights);
    // (3.3 phones step up from their base to native: never past 1)
    const s = Math.min(1, Math.max(0.4, this.upscale * scale));
    this.taau?.setScale(s);
    // (the fog pass ahead of TAAU sets the scene's size: it follows)
    if (this.taau && this.vol) (this.vol as unknown as { _options: number })._options = s;
  }
  private t = 0;
  /** Depth-of-field focus (m) and whether it is wanted now (aiming, menu operator). */
  focus = 10;
  focusOn = false;
  /** Called after a rebuild so the cinematic pass can move back to the end of the chain. */
  onRebuilt: (() => void) | null = null;
  /** Times the stack was rebuilt (a feature, the upscale or Panini changed). */
  builds = 0;

  constructor(
    private scene: Scene,
    private camera: Camera,
    private opts: PostStackOptions,
  ) {}

  /** The next `apply` rebuilds even with the same settings (3.1.4 benchmark diagnosis). */
  invalidate(): void {
    this.key = '';
  }

  apply(q: QualityLevel): void {
    const f = q.features;
    const key = JSON.stringify(f) + q.minimal + q.upscale + q.panini + q.mobile;
    if (key === this.key) return;
    this.key = key;
    this.builds++;
    this.disposeAll();
    if (q.minimal) {
      this.onRebuilt?.();
      return;
    }
    const scene = this.scene;
    const cams = [this.camera];
    this.msaa = f.aa === 'msaa';
    // TAAU first: its input sets the scene's render size; it does the temporal anti-aliasing too
    // (one depth for fog and TAAU: the G-buffer's when SSAO / SSR draw one anyway - no second geometry pass)
    if (f.ao || f.reflections === 'ssr' || (f.reflections === 'rt' && !this.opts.rt)) {
      // (at the scene's resolution: with TAAU that is the upscaler's input, not the native canvas)
      const gbr = scene.enableGeometryBufferRenderer(q.upscale < 1 ? q.upscale : 1);
      if (gbr) {
        gbr.enableDepth = true;
        this.gbr = gbr;
      }
    }
    // the height fog decides what can be seen at a distance: drawn on every preset (crossplay fairness); the light
    // shafts only with Volumetrics, over the nearest `volLights`
    this.volBase = f.volumetrics ? Math.max(0, Math.min(VOL_LIGHTS, f.volLights)) : 0;
    this.volMax = Math.round(this.volBase * this.volMul);
    this.volSteps = f.effects === 'epic' ? 16 : 8;
    if (q.upscale < 1) {
      this.upscale = q.upscale;
      // fog / light shafts ahead of TAAU, at the scene's resolution (3.1: a full-resolution march was the phones'
      // biggest cost); TAAU resolves their dither with everything else
      this.makeVolumetric(q.upscale);
      this.taau = new Taau(scene, this.camera, q.upscale, this.depthSource());
    } else if (f.aa === 'taa') {
      const taa = new TAARenderingPipeline('taa', scene, cams);
      taa.samples = 8;
      taa.factor = 0.08;
      this.taa = taa;
    }
    if (f.ao) {
      const ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: f.postRes === 'half' ? 0.5 : 0.75, blurRatio: f.postRes === 'half' ? 0.5 : 1 }, cams, true);
      ssao.radius = 0.55;
      ssao.totalStrength = 0.9;
      ssao.base = 0.2;
      ssao.samples = 16;
      ssao.maxZ = 40;
      ssao.minZAspect = 0.2;
      ssao.expensiveBlur = true;
      this.ssao = ssao;
    }
    if (f.reflections === 'ssr' || (f.reflections === 'rt' && !this.opts.rt)) {
      const ssr = new SSRRenderingPipeline('ssr', scene, cams, true);
      ssr.thickness = 0.4;
      ssr.selfCollisionNumSkip = 2;
      ssr.enableAutomaticThicknessComputation = false;
      ssr.blurDispersionStrength = 0.02;
      ssr.roughnessFactor = 0.2;
      ssr.strength = 0.8;
      ssr.reflectionSpecularFalloffExponent = 2;
      ssr.maxDistance = 40;
      ssr.step = 0.35;
      ssr.maxSteps = 120;
      ssr.attenuateFacingCamera = true;
      ssr.attenuateScreenBorders = true;
      // half: traced at half resolution
      ssr.ssrDownsample = f.postRes === 'half' ? 1 : 0;
      this.ssr = ssr;
    }
    if (f.reflections === 'rt' && this.opts.rt) {
      this.depth = scene.enableDepthRenderer(this.camera, false, true);
      this.rtr = new RtReflections(scene, this.camera, this.opts.rt, this.depth, f.rtRes === 'half');
    }
    if (f.motionBlur) {
      const mb = new MotionBlurPostProcess('motionBlur', scene, 1, this.camera);
      mb.motionStrength = 0.6;
      mb.motionBlurSamples = 16;
      mb.isObjectBased = false;
      this.motion = mb;
    }
    if (!this.vol) this.makeVolumetric(1);
    const def = new DefaultRenderingPipeline('pc', true, scene, cams);
    def.samples = f.aa === 'msaa' ? 4 : 1;
    // (3.2.2: not behind TAAU - it anti-aliases already; FXAA was one more full-resolution pass)
    def.fxaaEnabled = f.aa === 'fxaa' && q.upscale >= 1;
    def.bloomEnabled = f.bloom;
    if (f.bloom) {
      def.bloomThreshold = 0.75;
      def.bloomWeight = 0.35;
      // (3.1.9 phones: a smaller kernel at quarter size - the lamps still glow)
      def.bloomKernel = q.mobile ? 32 : 64;
      def.bloomScale = q.mobile ? 0.25 : 0.5;
    }
    def.depthOfFieldEnabled = f.dof;
    if (f.dof && def.depthOfField) {
      def.depthOfField.fStop = 32;
      def.depthOfField.focalLength = 50;
      def.depthOfField.focusDistance = 10000;
    }
    def.chromaticAberrationEnabled = f.lens;
    if (f.lens && def.chromaticAberration) {
      def.chromaticAberration.aberrationAmount = 4;
      def.chromaticAberration.radialIntensity = 1.2;
    }
    def.sharpenEnabled = f.aa === 'taa';
    if (def.sharpenEnabled && def.sharpen) def.sharpen.edgeAmount = 0.25;
    def.imageProcessingEnabled = true;
    const ip = def.imageProcessing;
    if (ip) {
      ip.toneMappingEnabled = true;
      ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_KHR_PBR_NEUTRAL;
      ip.exposure = 1.08;
      ip.contrast = 1.06;
    }
    this.def = def;
    // (Babylon's depth of field draws its own depth pass; with the G-buffer serving fog / TAAU it only runs while
    // aiming - the one time the field is shallow)
    this.dofDepth = this.gbr && f.dof ? scene.enableDepthRenderer(this.camera) : null;
    if (q.panini > 0) this.panini = new PaniniPass(this.camera, q.panini);
    this.onRebuilt?.();
  }

  private makeVolumetric(ratio: number): void {
    const depth = this.depthSource();
    const pp = new PostProcess(
      'volumetric',
      'volumetric',
      ['depthRaw', 'steps', 'invView', 'camPos', 'tanY', 'aspect', 'minZ', 'maxZ', 'count', 'lPos', 'lDir', 'lCol', 'fogColor', 'fogDensity', 'fogFalloff', 'fogBase', 'scatter', 'time', 'shimmer', 'skyO', 'skyD', 'shaftCol'],
      ['depthSampler', 'skyVis'],
      ratio,
      this.camera,
    );
    pp.onApply = (e) => {
      const cam = this.camera;
      cam.getViewMatrix().invertToRef(this.invView);
      depth.bind(e, 'depthSampler');
      e.setFloat('depthRaw', depth.mode);
      e.setMatrix('invView', this.invView);
      const p = cam.globalPosition;
      e.setFloat3('camPos', p.x, p.y, p.z);
      e.setFloat('tanY', Math.tan(cam.fov / 2));
      e.setFloat('aspect', pp.width / Math.max(1, pp.height));
      e.setFloat('minZ', cam.minZ);
      e.setFloat('maxZ', cam.maxZ);
      e.setInt('count', this.volCount);
      e.setFloat('steps', this.volSteps);
      e.setFloatArray4('lPos', this.lPos);
      e.setFloatArray4('lDir', this.lDir);
      e.setFloatArray4('lCol', this.lCol);
      const fc = this.opts.fogColor;
      e.setFloat3('fogColor', fc[0], fc[1], fc[2]);
      e.setFloat('fogDensity', this.opts.fogDensity);
      e.setFloat('fogFalloff', 0.55);
      e.setFloat('fogBase', 0);
      e.setFloat('scatter', 0.05);
      e.setFloat('time', this.t % 100);
      e.setFloat('shimmer', this.opts.shimmer ?? 0);
      const sky = this.opts.sky;
      if (sky) {
        e.setTexture('skyVis', sky.tex);
        e.setFloat4('skyO', sky.origin[0], sky.origin[1], sky.origin[2], sky.cell);
        e.setFloat3('skyD', sky.dims[0], sky.dims[1], sky.dims[2]);
      } else {
        // (a stand-in: the 3D sampler must never share a unit with a 2D texture)
        this.noSky ??= new RawTexture3D(new Uint8Array([0]), 1, 1, 1, Constants.TEXTUREFORMAT_R, this.scene, false, false, Texture.NEAREST_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
        e.setTexture('skyVis', this.noSky);
        e.setFloat4('skyO', 0, 0, 0, 0);
      }
      const sc = this.opts.shafts ?? [0, 0, 0];
      e.setFloat3('shaftCol', sc[0], sc[1], sc[2]);
    };
    this.vol = pp;
  }

  /** Per render frame: the volumetric lights (nearest the camera) and the depth-of-field focus. */
  frame(dt: number): void {
    this.t += dt;
    this.rtr?.frame();
    const reg = this.opts.lights;
    if (this.vol && reg) {
      const p = this.camera.globalPosition;
      const n = Math.min(this.volMax, nearest(reg, p.x, p.y, p.z, this.ids, this.dist));
      let k = 0;
      for (let i = 0; i < n; i++) {
        const l = reg.lights[this.ids[i]!]!;
        // lamps scatter under their shade (a short cone), flashlights along the beam (stopped by geometry)
        const lamp = !l.cone;
        const r = lamp ? Math.min(3.2, l.radius * 0.5, Math.max(0.8, l.y)) : Math.min(l.reach ?? l.radius, 14);
        this.lPos[k * 4] = l.x;
        this.lPos[k * 4 + 1] = l.y;
        this.lPos[k * 4 + 2] = l.z;
        this.lPos[k * 4 + 3] = r;
        if (l.cone) {
          this.lDir[k * 4] = l.cone.dx;
          this.lDir[k * 4 + 1] = l.cone.dy;
          this.lDir[k * 4 + 2] = l.cone.dz;
          this.lDir[k * 4 + 3] = l.cone.cosOuter;
        } else {
          this.lDir[k * 4] = 0;
          this.lDir[k * 4 + 1] = -1;
          this.lDir[k * 4 + 2] = 0;
          this.lDir[k * 4 + 3] = 0.88;
        }
        const g = l.intensity * (lamp ? 1 : 1.6);
        this.lCol[k * 4] = l.color[0] * g;
        this.lCol[k * 4 + 1] = l.color[1] * g;
        this.lCol[k * 4 + 2] = l.color[2] * g;
        this.lCol[k * 4 + 3] = 1;
        k++;
      }
      this.volCount = k;
    }
    const dof = this.def?.depthOfFieldEnabled ? this.def.depthOfField : null;
    if (dof) {
      // aiming: a shallow field on what the sight is on; otherwise everything sharp
      const want = this.focusOn ? 2.8 : 32;
      dof.fStop += (want - dof.fStop) * Math.min(1, dt * 8);
      dof.focusDistance += (this.focus * 1000 - dof.focusDistance) * Math.min(1, dt * 10);
      // (3.1.9: only when nothing else reads that depth - ray-traced reflections share it: paused, they traced a stale
      // depth and the floors reflected fog, the lower half of the view grey on Epic)
      if (this.dofDepth && this.dofDepth !== this.depth) this.dofDepth.enabled = this.focusOn || dof.fStop < 24;
    }
  }

  private disposeAll(): void {
    this.def?.dispose();
    this.ssao?.dispose(false);
    this.ssr?.dispose(false);
    this.rtr?.dispose();
    this.taau?.dispose();
    this.panini?.dispose();
    this.taa?.dispose();
    this.motion?.dispose(this.camera);
    this.vol?.dispose(this.camera);
    // (every depth renderer on the camera, depth of field's too: the next build reusing one that depth of field had
    // paused left fog and TAAU on a stale depth)
    this.scene.disableDepthRenderer(this.camera);
    if (this.gbr) this.scene.disableGeometryBufferRenderer();
    this.gbr = null;
    this.dofDepth = null;
    this.def = null;
    this.ssao = null;
    this.ssr = null;
    this.rtr = null;
    this.taau = null;
    this.panini = null;
    this.taa = null;
    this.motion = null;
    this.vol = null;
    this.depth = null;
  }

  dispose(): void {
    this.disposeAll();
    this.noSky?.dispose();
    this.noSky = null;
    this.key = '';
  }
}

/** The lights that are on, nearest the point first (allocation-free; `out` sets the cap). */
function nearest(reg: LightRegistry, x: number, y: number, z: number, out: Int32Array, dist: Float32Array): number {
  const cap = out.length;
  let n = 0;
  const ls = reg.lights;
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]!;
    if (!l.on || l.destroyed) continue;
    const dx = l.x - x;
    const dy = l.y - y;
    const dz = l.z - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) - l.radius;
    if (d > 30) continue;
    let k = n < cap ? n++ : cap;
    if (k === cap && d >= dist[cap - 1]!) continue;
    if (k === cap) k = cap - 1;
    while (k > 0 && dist[k - 1]! > d) {
      dist[k] = dist[k - 1]!;
      out[k] = out[k - 1]!;
      k--;
    }
    dist[k] = d;
    out[k] = i;
  }
  return n;
}
