import { Constants, Effect, Mesh, ShaderMaterial, Vector3, Vector4, VertexBuffer, VertexData, type Scene } from '../core/babylon';
import { CAMERA } from '../config/security';
import { G } from '../physics/groups';
import type { CameraUnit } from '../security/camera';
import {
  CUE,
  CUE_MASK_GLSL,
  camSeesAny,
  cueDir,
  cueMesh,
  cuePulse,
  cueReach,
  cueSpan,
  cueStrength,
  newCue,
  stepCue,
  type CueSpan,
  type CueState,
} from '../security/cameraCue';

/** Distance to the first hit in `mask` along a -> b, or |b - a| (the ballistics' no-allocation ray). */
export type CueRay = (from: Vector3, to: Vector3, mask: number) => number;

const f = (x: number): string => x.toFixed(4);

Effect.ShadersStore['cameraCueVertexShader'] = `
precision highp float;
attribute vec3 position;
uniform mat4 viewProjection;
varying vec3 vW;
void main(void) {
  vW = position;
  gl_Position = viewProjection * vec4(position, 1.0);
}`;

// look: x line strength, y edge pulse, z grid cell (rad), w edge width
Effect.ShadersStore['cameraCueFragmentShader'] = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 vW;
uniform vec3 lens;
uniform vec4 cam;
uniform vec4 look;
${CUE_MASK_GLSL}
void main(void) {
  float e = cueEdge(vW, lens, cam, look.w);
  if (e < 0.0) discard;
  vec3 d = vW - lens;
  float a = atan(d.x, d.z) - cam.x;
  a = mod(a + 3.14159265, 6.2831853) - 3.14159265;
  vec2 g = vec2(a, atan(d.y, length(d.xz))) / look.z;
  vec2 q = abs(fract(g + 0.5) - 0.5) / max(fwidth(g), vec2(1e-5));
  float line = 1.0 - min(min(q.x, q.y), 1.0);
  float k = look.x * (${f(CUE.line)} * line + ${f(CUE.fill)}) + look.y * e;
  gl_FragColor = vec4(vec3(1.0, 0.07, 0.04) * k, 1.0);
}`;

interface CueCam {
  cam: CameraUnit;
  span: CueSpan;
  /** Hit distance per sample (m; `cueReach()` = no hit). */
  dist: Float32Array;
  pos: Float32Array;
  idx: Uint32Array;
  /** Next sample to cast. */
  next: number;
  baked: boolean;
  /** A refresh moved a hit this pass. */
  moved: boolean;
  mesh: Mesh | null;
  mat: ShaderMaterial | null;
  lens: Vector3;
  frame: Vector4;
  look: Vector4;
  st: CueState;
  tris: number;
}

/**
 * The security camera vision cue (camera-cue): per camera one world-space mesh of the surfaces its lens can reach over
 * its whole sweep (rays against `G.STATIC`, the detection ray's colliders), drawn additive and depth-tested with a
 * projected red scan grid; the shader keeps only the current yaw's frame (`cueEdge`). Render only: never a light,
 * gameplay never reads it. The rays are spread over frames (a first bake, then a slow refresh for doors).
 */
export class CameraCueView {
  private readonly list: CueCam[] = [];
  private cur = 0;
  private allBaked = false;
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly d: [number, number, number] = [0, 0, 0];

  constructor(
    private scene: Scene,
    cams: readonly CameraUnit[],
    private ray: CueRay,
    private minimal: boolean,
  ) {
    const reach = cueReach();
    for (const cam of cams) {
      const span = cueSpan(cam.def);
      const n = span.cols * span.rows;
      const dist = new Float32Array(n).fill(reach);
      this.list.push({
        cam,
        span,
        dist,
        pos: new Float32Array(n * 3),
        idx: new Uint32Array((span.cols - 1) * (span.rows - 1) * 6),
        next: 0,
        baked: false,
        moved: false,
        mesh: null,
        mat: null,
        lens: new Vector3(cam.x, cam.y, cam.z),
        frame: new Vector4(cam.yaw, CAMERA.hFov / 2, CAMERA.vFov / 2, CAMERA.range),
        look: new Vector4(0, 0, CUE.gridDeg * (Math.PI / 180), CUE.edgeWidth),
        st: newCue(),
        tris: 0,
      });
    }
  }

  /** Per step: cast this frame's rays, then follow each camera's mode, seen state and yaw. */
  update(dt: number, electro: boolean): void {
    this.cast();
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i]!;
      stepCue(c.st, dt, c.cam.mode, camSeesAny(c.cam.meters));
      if (!c.mesh || !c.mat) continue;
      const show = c.st.a > 0.001 && c.tris > 0;
      if (c.mesh.isEnabled(false) !== show) c.mesh.setEnabled(show);
      if (!show) continue;
      c.frame.x = c.cam.yaw;
      c.look.x = cueStrength(c.st, electro);
      c.look.y = cuePulse(c.st) * (electro ? CUE.electro * 0.5 : 1);
      c.mat.setVector4('cam', c.frame);
      c.mat.setVector4('look', c.look);
    }
  }

  private cast(): void {
    const n = this.list.length;
    if (n === 0) return;
    let budget = this.allBaked ? (this.minimal ? CUE.refreshRaysMin : CUE.refreshRays) : CUE.bakeRays;
    let idle = 0;
    const reach = cueReach();
    while (budget > 0 && idle < n) {
      const c = this.list[this.cur]!;
      // the refresh only follows cameras that see (a blind one draws nothing)
      if (c.baked && c.cam.mode !== 'online') {
        this.cur = (this.cur + 1) % n;
        idle++;
        continue;
      }
      idle = 0;
      const s = c.span;
      const total = s.cols * s.rows;
      while (budget > 0 && c.next < total) {
        const i = c.next++;
        budget--;
        cueDir(s, i % s.cols, (i / s.cols) | 0, this.d);
        this.a.copyFrom(c.lens);
        this.b.set(c.lens.x + this.d[0] * reach, c.lens.y + this.d[1] * reach, c.lens.z + this.d[2] * reach);
        const h = Math.min(reach, this.ray(this.a, this.b, G.STATIC));
        if (c.baked && Math.abs(h - c.dist[i]!) > CUE.rebuildEps) c.moved = true;
        c.dist[i] = h;
      }
      if (c.next < total) break;
      c.next = 0;
      if (!c.baked) {
        c.baked = true;
        this.build(c);
        this.allBaked = this.list.every((x) => x.baked);
      } else if (c.moved) {
        c.moved = false;
        this.rebuild(c);
      }
      this.cur = (this.cur + 1) % n;
    }
  }

  private build(c: CueCam): void {
    c.tris = cueMesh(c.span, c.dist, c.lens.x, c.lens.y, c.lens.z, c.pos, c.idx);
    const mesh = new Mesh(`cam-cue-${c.cam.def.id}`, this.scene);
    const vd = new VertexData();
    vd.positions = c.pos;
    vd.indices = c.idx;
    vd.applyToMesh(mesh, true);
    mesh.isPickable = false;
    mesh.doNotSerialize = true;
    const mat = new ShaderMaterial(
      `cam-cue-${c.cam.def.id}`,
      this.scene,
      { vertex: 'cameraCue', fragment: 'cameraCue' },
      { attributes: ['position'], uniforms: ['viewProjection', 'lens', 'cam', 'look'], needAlphaBlending: true },
    );
    mat.alphaMode = Constants.ALPHA_ONEONE;
    mat.disableDepthWrite = true;
    mat.backFaceCulling = false;
    // the surface it lies on wins the depth test only by a hair: pull the cue in front
    mat.zOffset = -2;
    mat.setVector3('lens', c.lens);
    mat.setVector4('cam', c.frame);
    mat.setVector4('look', c.look);
    mesh.material = mat;
    mesh.setEnabled(false);
    c.mesh = mesh;
    c.mat = mat;
  }

  private rebuild(c: CueCam): void {
    if (!c.mesh) return;
    c.tris = cueMesh(c.span, c.dist, c.lens.x, c.lens.y, c.lens.z, c.pos, c.idx);
    c.mesh.updateVerticesData(VertexBuffer.PositionKind, c.pos);
    c.mesh.updateIndices(c.idx);
    c.mesh.refreshBoundingInfo();
  }

  /** Test view (`__ctdev.debug().cue`): the cue follows each camera's mode and its own seen state. */
  debug(): { id: string; mode: string; a: number; seen: boolean; pulse: number; baked: boolean; tris: number; shown: boolean }[] {
    return this.list.map((c) => ({
      id: c.cam.def.id,
      mode: c.cam.mode,
      a: c.st.a,
      seen: c.st.seen,
      pulse: cuePulse(c.st),
      baked: c.baked,
      tris: c.tris,
      shown: !!c.mesh?.isEnabled(false),
    }));
  }

  dispose(): void {
    for (const c of this.list) {
      c.mesh?.dispose();
      c.mat?.dispose();
      c.mesh = null;
      c.mat = null;
    }
    this.list.length = 0;
  }
}
