import { Effect, Matrix, PassPostProcess, PostProcess, type Camera, type DepthRenderer, type RenderTargetWrapper, type Scene } from '../core/babylon';

/**
 * TAAU (3.0, Display > Upscaler): the scene renders at `scale` of the display's resolution (this pass is first in the
 * chain, so its input sets the scene's size) with a sub-pixel jitter per frame (Halton 2, 3 on the projection); the
 * resolve runs at full resolution - the current frame sampled un-jittered (Catmull-Rom), the history reprojected by
 * the camera's motion through the depth buffer and clamped to the current neighbourhood, blended 1 : 9 - into a
 * ping-pong pair that the next pass hands down the chain. It replaces TAA while on.
 */
Effect.ShadersStore['taauFragmentShader'] = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D historySampler;
uniform sampler2D depthSampler;
uniform mat4 invView;
uniform mat4 prevViewProj;
uniform vec3 camPos;
uniform float tanY;
uniform float aspect;
uniform float minZ;
uniform float maxZ;
uniform vec2 jitter;
uniform vec2 lowSize;
uniform float reset;

// Catmull-Rom in 5 bilinear taps
vec3 sampleCR(vec2 uv) {
  vec2 pos = uv * lowSize;
  vec2 c = floor(pos - 0.5) + 0.5;
  vec2 f = pos - c;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t12 = (c + w2 / w12) / lowSize;
  vec2 t0 = (c - 1.0) / lowSize;
  vec2 t3 = (c + 2.0) / lowSize;
  vec3 r = texture2D(textureSampler, vec2(t12.x, t0.y)).rgb * w12.x * w0.y;
  r += texture2D(textureSampler, vec2(t0.x, t12.y)).rgb * w0.x * w12.y;
  r += texture2D(textureSampler, t12).rgb * w12.x * w12.y;
  r += texture2D(textureSampler, vec2(t3.x, t12.y)).rgb * w3.x * w12.y;
  r += texture2D(textureSampler, vec2(t12.x, t3.y)).rgb * w12.x * w3.y;
  float wsum = w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y;
  return max(r / wsum, vec3(0.0));
}

void main(void) {
  // the un-jittered position of this output pixel in the jittered low-resolution frame
  vec2 cuv = vUV + jitter;
  vec3 cur = sampleCR(cuv);
  vec2 lt = 1.0 / lowSize;
  vec3 a = texture2D(textureSampler, cuv + vec2(lt.x, 0.0)).rgb;
  vec3 b = texture2D(textureSampler, cuv - vec2(lt.x, 0.0)).rgb;
  vec3 c = texture2D(textureSampler, cuv + vec2(0.0, lt.y)).rgb;
  vec3 d = texture2D(textureSampler, cuv - vec2(0.0, lt.y)).rgb;
  vec3 mn = min(cur, min(min(a, b), min(c, d)));
  vec3 mx = max(cur, max(max(a, b), max(c, d)));
  // reprojection: this pixel's world point in last frame's view
  float dz = texture2D(depthSampler, vUV).r;
  float viewZ = dz >= 0.9999 ? maxZ : dz * (minZ + maxZ) - minZ;
  vec2 ndc = vUV * 2.0 - 1.0;
  vec3 vdir = vec3(ndc.x * tanY * aspect, ndc.y * tanY, 1.0);
  vec3 wp = camPos + normalize((invView * vec4(vdir, 0.0)).xyz) * viewZ * length(vdir);
  vec4 pc = prevViewProj * vec4(wp, 1.0);
  vec2 puv = pc.xy / pc.w * 0.5 + 0.5;
  float w = 0.1;
  if (reset > 0.5 || pc.w <= 0.0 || puv.x < 0.0 || puv.y < 0.0 || puv.x > 1.0 || puv.y > 1.0) w = 1.0;
  vec3 hist = clamp(texture2D(historySampler, puv).rgb, mn, mx);
  gl_FragColor = vec4(mix(hist, cur, w), 1.0);
}`;

/** Halton sequence value (base b) for index i (1-based). */
function halton(i: number, b: number): number {
  let f = 1;
  let r = 0;
  while (i > 0) {
    f /= b;
    r += f * (i % b);
    i = Math.floor(i / b);
  }
  return r;
}

export class Taau {
  private pp: PostProcess;
  private pass: PassPostProcess;
  private ping: RenderTargetWrapper | null = null;
  private pong: RenderTargetWrapper | null = null;
  private flip = 0;
  private n = 0;
  private reset = 1;
  private jx = 0;
  private jy = 0;
  private readonly invView = new Matrix();
  private readonly prevVP = new Matrix();
  private readonly curVP = new Matrix();
  private readonly proj = new Matrix();

  constructor(
    private scene: Scene,
    private camera: Camera,
    private scale: number,
    depth: DepthRenderer,
  ) {
    const engine = scene.getEngine();
    // first in the chain: its input (the scene) is `scale` of the canvas
    const pp = new PostProcess('taau', 'taau', ['invView', 'prevViewProj', 'camPos', 'tanY', 'aspect', 'minZ', 'maxZ', 'jitter', 'lowSize', 'reset'], ['historySampler', 'depthSampler'], scale, camera, undefined, engine, false, null, 2);
    pp.onActivateObservable.add(() => {
      const w = engine.getRenderWidth();
      const h = engine.getRenderHeight();
      if (!this.ping || this.ping.width !== w || this.ping.height !== h) this.makeTargets(w, h);
      // this frame's jitter (in low-resolution pixels), on the projection
      this.n = (this.n % 16) + 1;
      const lw = Math.max(1, Math.floor(w * this.scale));
      const lh = Math.max(1, Math.floor(h * this.scale));
      this.jx = (halton(this.n, 2) - 0.5) * 2 / lw;
      this.jy = (halton(this.n, 3) - 0.5) * 2 / lh;
      const p = this.camera.getProjectionMatrix();
      // (the un-jittered view-projection for next frame's reprojection)
      this.proj.copyFrom(p);
      this.proj.setRowFromFloats(2, 0, 0, p.m[10]!, p.m[11]!);
      this.camera.getViewMatrix().multiplyToRef(this.proj, this.curVP);
      p.setRowFromFloats(2, this.jx, this.jy, p.m[10]!, p.m[11]!);
      this.scene.updateTransformMatrix(true);
      this.pass.inputTexture = this.flip ? this.ping! : this.pong!;
      this.flip ^= 1;
    });
    pp.onApply = (e) => {
      const cam = this.camera;
      cam.getViewMatrix().invertToRef(this.invView);
      e._bindTexture('historySampler', (this.flip ? this.ping! : this.pong!).texture);
      e.setTexture('depthSampler', depth.getDepthMap());
      e.setMatrix('invView', this.invView);
      e.setMatrix('prevViewProj', this.prevVP);
      const p = cam.globalPosition;
      e.setFloat3('camPos', p.x, p.y, p.z);
      e.setFloat('tanY', Math.tan(cam.fov / 2));
      e.setFloat('aspect', engine.getRenderWidth() / Math.max(1, engine.getRenderHeight()));
      e.setFloat('minZ', cam.minZ);
      e.setFloat('maxZ', cam.maxZ);
      // the jitter in output uv: the content moved by half the clip offset
      e.setFloat2('jitter', this.jx * 0.5, this.jy * 0.5);
      const w = engine.getRenderWidth();
      const h = engine.getRenderHeight();
      e.setFloat2('lowSize', Math.max(1, Math.floor(w * this.scale)), Math.max(1, Math.floor(h * this.scale)));
      e.setFloat('reset', this.reset);
      this.reset = 0;
      this.prevVP.copyFrom(this.curVP);
    };
    this.pp = pp;
    const pass = new PassPostProcess('taauPass', 1, camera);
    pass.autoClear = false;
    this.pass = pass;
  }

  /** The frame governor (3.1): a new input scale at run time (the post process re-sizes its input; no recompile). */
  setScale(scale: number): void {
    if (Math.abs(scale - this.scale) < 1e-4) return;
    this.scale = scale;
    (this.pp as unknown as { _options: number })._options = scale;
    this.reset = 1;
  }

  private makeTargets(w: number, h: number): void {
    const engine = this.scene.getEngine();
    this.ping?.dispose();
    this.pong?.dispose();
    const opts = { generateMipMaps: false, generateDepthBuffer: false, type: 2, samplingMode: 2 };
    this.ping = engine.createRenderTargetTexture({ width: w, height: h }, opts);
    this.pong = engine.createRenderTargetTexture({ width: w, height: h }, opts);
    this.reset = 1;
  }

  dispose(): void {
    this.pp.dispose(this.camera);
    this.pass.dispose(this.camera);
    this.ping?.dispose();
    this.pong?.dispose();
    this.camera.getProjectionMatrix(true);
  }
}
