import { Constants, Effect, Mesh, ShaderMaterial, Vector3, Vector4, VertexBuffer, VertexData, type Scene } from '../core/babylon';
import { CAMERA } from '../config/security';
import { G } from '../physics/groups';
import { FIXED_DT } from '../core/loop';
import type { CameraUnit } from '../security/camera';
import {
  CUE,
  CUE_MASK_GLSL,
  camSeesAny,
  cueDir,
  cueMesh,
  cueReach,
  cueSpan,
  cueInk,
  cueStrength,
  newCue,
  stepCue,
  type CueSpan,
  type CueState,
} from '../security/cameraCue';

/** Distance to the first hit in `mask` along a -> b, or |b - a| (the ballistics' no-allocation ray). */
export type CueRay = (from: Vector3, to: Vector3, mask: number) => number;

Effect.ShadersStore['cameraCueVertexShader'] = `
precision highp float;
attribute vec3 position;
uniform mat4 viewProjection;
varying vec3 vW;
void main(void) {
  vW = position;
  gl_Position = viewProjection * vec4(position, 1.0);
}`;

// look: x shown amount, y pitch (rad, + down: the camera's own, sector-fixes C), z grid cell (rad), w edge width (the frame
// mask); ink: rgb colour, w unused; wt: x line, y fill, z line width (px)
Effect.ShadersStore['cameraCueFragmentShader'] = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
varying vec3 vW;
uniform vec3 lens;
uniform vec4 cam;
uniform vec4 look;
uniform vec4 ink;
uniform vec4 wt;
${CUE_MASK_GLSL}
void main(void) {
  float e = cueEdge(vW, lens, cam, look.y, look.w);
  if (e < 0.0) discard;
  vec3 d = vW - lens;
  float a = atan(d.x, d.z) - cam.x;
  a = mod(a + 3.14159265, 6.2831853) - 3.14159265;
  vec2 g = vec2(a, atan(d.y, length(d.xz))) / look.z;
  vec2 q = abs(fract(g + 0.5) - 0.5) / max(fwidth(g), vec2(1e-5));
  float line = max(1.0 - min(q.x, q.y) / wt.z, 0.0) * min(wt.z, 1.0);
  float k = look.x * (wt.x * line + wt.y);
  gl_FragColor = vec4(ink.rgb * k, 1.0);
}`;

interface CueCam {
  cam: CameraUnit;
  span: CueSpan;
  /** Hit distance per sample (m; `reach` = no hit). */
  dist: Float32Array;
  /** How far its rays are cast (m): `cueReach(cam.range)`. */
  reach: number;
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
 * its whole sweep within its own range and about its own pitch (rays against `G.STATIC`, the detection ray's colliders;
 * `CameraUnit.range` / `pitch`, sector-fixes C), drawn additive and depth-tested with a
 * projected red scan grid (grid only, no frame edge: marlow-bays item 6); the shader keeps only the current yaw's frame
 * (`cueEdge`). Render only: never a light, gameplay never reads it. The rays are spread over frames (a first bake, then a slow refresh for doors).
 */
export class CameraCueView {
  private readonly list: CueCam[] = [];
  private cur = 0;
  private allBaked = false;
  private readonly a = new Vector3();
  private readonly b = new Vector3();
  private readonly d: [number, number, number] = [0, 0, 0];
  private readonly ink = new Vector4(0, 0, 0, 0);
  private readonly wt = new Vector4(0, 0, 0, 0);
  /** Unspent time for the fixed-step ray budget (the client calls per render frame, the host per fixed step). */
  private acc = 0;

  constructor(
    private scene: Scene,
    cams: readonly CameraUnit[],
    private ray: CueRay,
    private minimal: boolean,
  ) {
    for (const cam of cams) {
      const span = cueSpan(cam.def);
      const n = span.cols * span.rows;
      const reach = cueReach(cam.range);
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
        // (sector-fixes C) the camera's own pitch and range: the same numbers its detection (`covers`) reads
        frame: new Vector4(cam.yaw, CAMERA.hFov / 2, CAMERA.vFov / 2, cam.range),
        look: new Vector4(0, cam.pitch, CUE.gridDeg * (Math.PI / 180), CUE.edgeWidth),
        reach,
        st: newCue(),
        tris: 0,
      });
    }
  }

  /**
   * Cast the rays due (one budget per fixed step, so the same rays/s on host and client at any frame rate), then follow
   * each camera's mode, seen state and yaw. `seen`: per camera (in `cams` order) 1 = sees a player now (the co-op
   * client's own `cameraSight` test); null reads each camera's meters (the host).
   */
  update(dt: number, electro: boolean, seen: Uint8Array | null = null): void {
    this.acc = Math.min(this.acc + dt, FIXED_DT * 4);
    while (this.acc >= FIXED_DT - 1e-6) {
      this.acc -= FIXED_DT;
      this.cast();
    }
    const ink = cueInk(electro);
    this.ink.set(ink.rgb[0], ink.rgb[1], ink.rgb[2], 0);
    this.wt.set(ink.line, ink.fill, ink.width, 0);
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i]!;
      stepCue(c.st, dt, c.cam.mode, seen ? seen[i] === 1 : camSeesAny(c.cam.meters));
      if (!c.mesh || !c.mat) continue;
      const show = c.st.a > 0.001 && c.tris > 0;
      if (c.mesh.isEnabled(false) !== show) c.mesh.setEnabled(show);
      if (!show) continue;
      c.frame.x = c.cam.yaw;
      c.look.x = cueStrength(c.st);
      c.mat.setVector4('cam', c.frame);
      c.mat.setVector4('look', c.look);
      c.mat.setVector4('ink', this.ink);
      c.mat.setVector4('wt', this.wt);
    }
  }

  private cast(): void {
    const n = this.list.length;
    if (n === 0) return;
    let budget = this.allBaked ? (this.minimal ? CUE.refreshRaysMin : CUE.refreshRays) : CUE.bakeRays;
    let idle = 0;
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
      const reach = c.reach;
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
    c.tris = cueMesh(c.span, c.dist, c.lens.x, c.lens.y, c.lens.z, c.pos, c.idx, c.reach);
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
      { attributes: ['position'], uniforms: ['viewProjection', 'lens', 'cam', 'look', 'ink', 'wt'], needAlphaBlending: true },
    );
    mat.alphaMode = Constants.ALPHA_ONEONE;
    mat.disableDepthWrite = true;
    mat.backFaceCulling = false;
    // the surface it lies on wins the depth test only by a hair: pull the cue in front
    mat.zOffset = -2;
    mat.setVector3('lens', c.lens);
    mat.setVector4('cam', c.frame);
    mat.setVector4('look', c.look);
    mat.setVector4('ink', this.ink);
    mat.setVector4('wt', this.wt);
    mesh.material = mat;
    mesh.setEnabled(false);
    c.mesh = mesh;
    c.mat = mat;
  }

  private rebuild(c: CueCam): void {
    if (!c.mesh) return;
    c.tris = cueMesh(c.span, c.dist, c.lens.x, c.lens.y, c.lens.z, c.pos, c.idx, c.reach);
    c.mesh.updateVerticesData(VertexBuffer.PositionKind, c.pos);
    c.mesh.updateIndices(c.idx);
    c.mesh.refreshBoundingInfo();
  }

  /** Test view (`__ctdev.debug().cue`): the cue follows each camera's mode and its own seen state. */
  debug(): { id: string; mode: string; a: number; seen: boolean; baked: boolean; tris: number; shown: boolean }[] {
    return this.list.map((c) => ({
      id: c.cam.def.id,
      mode: c.cam.mode,
      a: c.st.a,
      seen: c.st.seen,
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
