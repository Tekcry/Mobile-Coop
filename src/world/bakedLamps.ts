import { BaseTexture, Constants, EffectRenderer, EffectWrapper, MaterialPluginBase, RawTexture, RawTexture3D, Texture, Viewport, type AbstractMesh, type Material, type MaterialDefines, type RenderTargetWrapper, type Scene, type SubMesh, type UniformBuffer } from '../core/babylon';
import { dropCpuCopy } from '../voxel/voxelWorld';
import { BOX_STRIDE, fillLampAtlas, LAMP_CELL, LAMP_GRID, LAMP_STRIDE, lampGrid, packLampAtlas, type LampResult } from '../voxel/lampBake';
import { LAMP_VOL_MAX, lampVolumeGrid, lampVolumeRegion, unionRegion, type LampVolumeGrid } from '../voxel/lampVolume';
import type { LightRegistry } from './lights';
import { bakedLights, type MoonGrid } from './lightBake';
import { LAMP_CONE_COS, LAMP_EXP, LAMP_LEVEL_GAIN, LAMP_MATH_GLSL, LIGHT_GAIN, SPOT_EXP } from './lampMath';
import { AMBIENT_CELL, type AmbientGrid } from './ambientGrid';
import { DOOR_SHUT, DOORS_PER_LAMP, lampDoorLists, type FieldDoor } from './lightField';

export { bakedLights };

/** Texels per lamp in the data texture: position + range, colour + exponent, direction + cos, box origin + ny,
 *  atlas tile + nx / nz, character capsule ids, door ids (3.6). */
const LAMP_TEXELS = 7;
/** Per door two texels after the capsules: hinge + width, (sin yaw, cos yaw, height, shut). */
const DOOR_TEXELS = 2;

/** Rendering: a gameplay light level shows as this much light on screen (a lamp's `LIGHT_GAIN` over its gameplay
 *  `LAMP_LEVEL_GAIN`), so the phone's ambient-grid fill and the lamps keep one scale. */
export const LEVEL_TO_RENDER = LIGHT_GAIN / LAMP_LEVEL_GAIN;

/** What the canonical bake adds to the baked lamps (3.6). */
export interface BakeExtras {
  /** The baked moon: the sun light is multiplied by it (static moon shadows). */
  moon?: MoonGrid | null;
  /** Doors (`Doors.list`): a closed leaf stops the lamps listed for it. */
  doors?: readonly FieldDoor[];
  /** The phone light look: the ambient grid as the fill (gameplay's own; no sky bake there), with its colour. */
  fill?: { grid: AmbientGrid; color: [number, number, number] } | null;
  /** The phone light look: the plugin goes on the lit standard materials (else on the PBR ones). */
  standard?: boolean;
}
/** Character capsules (two texels each) and how many one lamp tests. */
export const MAX_CAPSULES = 16;
const CAPS_PER_LAMP = 4;

/**
 * Baked lamps (3.2): every fixed light shaded through its baked visibility (`voxel/lampBake.ts`) by `LampPlugin` on
 * every lit material, instead of real Babylon lights and shadow maps. Each lamp is exact (walls, racks, doorways),
 * on or off at once (switches, shots, EMP), for a 3D texture tap per lamp per pixel; characters get soft capsule
 * shadows from every lamp. One data texture: the light grid (which lamps reach each 2 m column), the lamps, the
 * capsules (updated each frame).
 */
export class BakedLamps {
  /** The lamps' visibility atlas and the data texture (grid, lamps, capsules). */
  readonly vis: RawTexture3D;
  readonly data: RawTexture;
  /** Registry ids of the baked lights (the light rig leaves them out). */
  readonly ids: Set<number>;
  readonly atlasDims: [number, number, number];
  readonly gridInfo: { lox: number; loz: number; cols: number; rows: number };
  readonly width: number;
  /** Texel index where the lamps / the capsules / the doors start. */
  readonly lampBase: number;
  readonly capBase: number;
  readonly doorBase: number;
  /** 3.6: the baked moon (R8, linear). */
  readonly moonTex: RawTexture3D | null = null;
  readonly moon: MoonGrid | null;
  readonly fillTex: RawTexture3D | null = null;
  readonly fill: BakeExtras['fill'];
  /** The plugin goes on standard materials (the phone light look). */
  private readonly standard: boolean;
  private readonly doors: readonly FieldDoor[];
  private readonly doorShut: Uint8Array;
  /** Per lamp its door indices (`lampDoorLists`). */
  private readonly lampDoors: Int16Array;
  private readonly buf: Float32Array;
  private readonly order: number[];
  private version = -1;
  private caps = 0;
  private readonly capA = new Float32Array(MAX_CAPSULES * 4);
  private readonly capB = new Float32Array(MAX_CAPSULES * 4);
  private readonly plugins = new Set<Material>();
  private obs: { remove(): void } | null = null;
  /** Load time: the bake (or the cache read), ms. */
  bakeMs = 0;
  /** Volume re-mixes so far (3.3 spike log). */
  remixes = 0;
  /** Characters' capsules each frame (foot + head points, radius): GameState's. */
  capsules: ((a: Float32Array, b: Float32Array, max: number) => number) | null = null;
  /** 3.3 phones: the lamps mixed into one light volume (two taps a pixel) instead of the per-lamp loop; re-mixed on
   *  the GPU from the data above when lamps change. */
  readonly volume: LampVolume | null = null;
  /** Volume mode: the nearest characters' capsules (two vec4 each), for shadows along the light's direction. */
  readonly volCaps = new Float32Array(VOL_CAPS * 8);
  private readonly boxes: Float32Array;
  private readonly lastColors: Float32Array;

  constructor(
    private scene: Scene,
    private reg: LightRegistry,
    baked: { lights: Float32Array; ids: number[] },
    r: LampResult,
    lo: readonly number[],
    hi: readonly number[],
    volume: { floorY: number } | null = null,
    extra: BakeExtras = {},
  ) {
    this.order = baked.ids;
    this.moon = extra.moon ?? null;
    this.fill = extra.fill ?? null;
    this.standard = !!extra.standard;
    this.doors = extra.doors ?? [];
    this.doorShut = new Uint8Array(this.doors.length).fill(2);
    this.lampDoors = lampDoorLists(baked.lights, this.doors);
    this.ids = new Set(baked.ids);
    this.boxes = r.boxes;
    this.lastColors = new Float32Array(baked.ids.length * 3).fill(-1);
    const atlas = packLampAtlas(r.boxes);
    this.atlasDims = atlas.dims;
    const [ax, ay, az] = atlas.dims;
    this.vis = new RawTexture3D(fillLampAtlas(r, atlas), ax, ay, az, Constants.TEXTUREFORMAT_R, scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
    this.vis.wrapU = this.vis.wrapV = this.vis.wrapR = Texture.CLAMP_ADDRESSMODE;
    dropCpuCopy(this.vis);
    const grid = lampGrid(baked.lights, lo, hi);
    this.gridInfo = { lox: lo[0]!, loz: lo[2]!, cols: grid.cols, rows: grid.rows };
    const n = baked.ids.length;
    const w = Math.max(32, grid.cols * 2);
    this.width = w;
    this.lampBase = grid.cols * 2 * grid.rows;
    this.capBase = this.lampBase + n * LAMP_TEXELS;
    this.doorBase = this.capBase + MAX_CAPSULES * 2;
    const texels = this.doorBase + this.doors.length * DOOR_TEXELS;
    const h = Math.ceil(texels / w);
    const buf = new Float32Array(w * h * 4);
    this.buf = buf;
    // the grid: ids + 1 as floats (row-major in texel order)
    for (let i = 0; i < grid.data.length; i++) buf[i] = grid.data[i]!;
    // the lamps' fixed texels
    const cosLamp = LAMP_CONE_COS;
    for (let i = 0; i < n; i++) {
      const o = (this.lampBase + i * LAMP_TEXELS) * 4;
      const L = baked.lights;
      const li = i * LAMP_STRIDE;
      buf.set([L[li]!, L[li + 1]!, L[li + 2]!, L[li + 3]!], o);
      const cone = L[li + 7]! > -1.5;
      // t1 (colour) is written by `update`; its w: the spot exponent
      buf[o + 7] = cone ? SPOT_EXP : LAMP_EXP;
      buf.set([L[li + 4]!, L[li + 5]!, L[li + 6]!, cone ? L[li + 7]! : cosLamp], o + 8);
      const b = i * BOX_STRIDE;
      buf.set([r.boxes[b]!, r.boxes[b + 1]!, r.boxes[b + 2]!, r.boxes[b + 4]!], o + 12);
      buf.set([atlas.offsets[i * 2]!, atlas.offsets[i * 2 + 1]!, r.boxes[b + 3]!, r.boxes[b + 5]!], o + 16);
      // (t6: the doors this lamp tests, ids + 1)
      for (let k = 0; k < DOORS_PER_LAMP; k++) buf[o + 24 + k] = this.lampDoors[i * DOORS_PER_LAMP + k]! + 1;
    }
    // the doors' fixed texels (their shut flag is written by `writeDoors`)
    this.doors.forEach((d, k) => {
      const a = d.anchor;
      const o = (this.doorBase + k * DOOR_TEXELS) * 4;
      buf.set([a.hinge.x, a.hinge.y, a.hinge.z, a.width, Math.sin(a.yaw), Math.cos(a.yaw), a.height, 0], o);
    });
    this.writeDoors();
    const mk3 = (data: Uint8Array, nx: number, ny: number, nz: number): RawTexture3D => {
      const t = new RawTexture3D(data, nx, ny, nz, Constants.TEXTUREFORMAT_R, scene, false, false, Texture.BILINEAR_SAMPLINGMODE, Constants.TEXTURETYPE_UNSIGNED_BYTE);
      t.wrapU = t.wrapV = t.wrapR = Texture.CLAMP_ADDRESSMODE;
      dropCpuCopy(t);
      return t;
    };
    if (this.moon) this.moonTex = mk3(this.moon.vis, this.moon.n[0], this.moon.n[1], this.moon.n[2]);
    if (this.fill) this.fillTex = mk3(this.fill.grid.data, this.fill.grid.n[0], this.fill.grid.n[1], this.fill.grid.n[2]);

    this.data = new RawTexture(buf, w, h, Constants.TEXTUREFORMAT_RGBA, scene, false, false, Texture.NEAREST_SAMPLINGMODE, Constants.TEXTURETYPE_FLOAT);
    if (volume) this.volume = new LampVolume(scene, this, lampVolumeGrid(r.boxes, volume.floorY));
    this.update();
  }

  /** Put the plugin on every PBR material in the scene, now and as they are made. */
  attachAll(): void {
    for (const m of this.scene.materials) this.attach(m);
    const o = this.scene.onNewMaterialAddedObservable.add((m) => this.attach(m));
    this.obs = { remove: () => this.scene.onNewMaterialAddedObservable.remove(o) };
  }

  attach(m: Material): void {
    if (this.plugins.has(m)) return;
    // (the phone light look: the lit standard materials - level, characters, weapons, props; not the sky, bulbs or
    // effects, which draw unlit)
    const cls = m.getClassName();
    if (this.standard ? cls !== 'StandardMaterial' || (m as Material & { disableLighting?: boolean }).disableLighting : cls !== 'PBRMaterial') return;
    this.plugins.add(m);
    const frozen = m.isFrozen;
    if (frozen) m.unfreeze();
    new LampPlugin(m, this);
    if (frozen) m.freeze();
  }

  /** Lamps on / off / shot out / EMP (on a registry change): their colours; the volume re-mixed where they changed. */
  private update(): void {
    const buf = this.buf;
    const changed: number[][] = [];
    for (let i = 0; i < this.order.length; i++) {
      const l = this.reg.lights[this.order[i]!]!;
      const k = l.on && !l.destroyed ? l.intensity * LIGHT_GAIN : 0;
      const o = (this.lampBase + i * LAMP_TEXELS + 1) * 4;
      buf[o] = l.color[0] * k;
      buf[o + 1] = l.color[1] * k;
      buf[o + 2] = l.color[2] * k;
      const c = this.lastColors;
      if (c[i * 3] !== buf[o] || c[i * 3 + 1] !== buf[o + 1] || c[i * 3 + 2] !== buf[o + 2]) {
        c[i * 3] = buf[o]!;
        c[i * 3 + 1] = buf[o + 1]!;
        c[i * 3 + 2] = buf[o + 2]!;
        if (this.volume) changed.push(lampVolumeRegion(this.boxes, i, this.volume.grid));
      }
    }
    this.version = this.reg.version;
    this.data.update(buf);
    const region = unionRegion(changed);
    if (region && this.volume) {
      this.volume.mix(region);
      this.remixes++;
    }
  }

  /** Per render frame: lamp changes and the characters' capsules (each lamp lists the nearest few in its reach). */
  frame(): void {
    let dirty = false;
    if (this.version !== this.reg.version) this.update();
    if (this.doors.length && this.writeDoors()) {
      if (this.volume) this.data.update(this.buf);
      else dirty = true;
    }
    const nc = this.capsules ? Math.min(MAX_CAPSULES, this.capsules(this.capA, this.capB, MAX_CAPSULES)) : 0;
    if (this.volume) {
      // (the first few capsules: the operator and the guards nearest the camera)
      const vc = this.volCaps;
      vc.fill(0);
      for (let c = 0; c < Math.min(nc, VOL_CAPS); c++) {
        for (let k = 0; k < 4; k++) {
          vc[c * 8 + k] = this.capA[c * 4 + k]!;
          vc[c * 8 + 4 + k] = this.capB[c * 4 + k]!;
        }
      }
      // (a mix that could not run yet - its shader still compiling - runs now)
      this.volume.retry();
      return;
    }
    if (nc || this.caps) {
      this.caps = nc;
      this.writeCapsules(nc);
      dirty = true;
    }
    if (dirty) this.data.update(this.buf);
  }

  /** Tests (3.6): the volume's cell at a world point (`LampVolume.readCell`), or null without a volume. */
  volumeAt(x: number, y: number, z: number): { a: number[]; b: number[] } | null {
    return this.volume ? this.volume.readCell(x, y, z) : null;
  }

  /**
   * Doors' shut flags into the data texture; true when one changed. On the phone volume the lamps that list a changed
   * door are re-mixed over their regions (a door is a light change, bible L12).
   */
  private writeDoors(): boolean {
    // (per frame: nothing allocated unless a door changed)
    let changed = false;
    let regions: number[][] | null = null;
    for (let k = 0; k < this.doors.length; k++) {
      const shut = this.doors[k]!.open <= DOOR_SHUT ? 1 : 0;
      if (this.doorShut[k] === shut) continue;
      const first = this.doorShut[k] === 2;
      this.doorShut[k] = shut;
      this.buf[(this.doorBase + k * DOOR_TEXELS) * 4 + 7] = shut;
      changed = true;
      if (this.volume && !first) {
        for (let i = 0; i < this.order.length; i++) {
          for (let j = 0; j < DOORS_PER_LAMP; j++) if (this.lampDoors[i * DOORS_PER_LAMP + j] === k) (regions ??= []).push(lampVolumeRegion(this.boxes, i, this.volume.grid));
        }
      }
    }
    const region = regions ? unionRegion(regions) : null;
    if (region && this.volume) {
      this.data.update(this.buf);
      this.volume.mix(region);
      this.remixes++;
    }
    return changed;
  }

  private writeCapsules(nc: number): void {
    const buf = this.buf;
    const a = this.capA;
    const b = this.capB;
    for (let c = 0; c < nc; c++) {
      const o = (this.capBase + c * 2) * 4;
      buf[o] = a[c * 4]!;
      buf[o + 1] = a[c * 4 + 1]!;
      buf[o + 2] = a[c * 4 + 2]!;
      buf[o + 3] = a[c * 4 + 3]!;
      buf[o + 4] = b[c * 4]!;
      buf[o + 5] = b[c * 4 + 1]!;
      buf[o + 6] = b[c * 4 + 2]!;
      buf[o + 7] = 0;
    }
    // per lamp: up to CAPS_PER_LAMP capsules within its reach (ids + 1, 0 = none)
    for (let i = 0; i < this.order.length; i++) {
      const lo = (this.lampBase + i * LAMP_TEXELS) * 4;
      const o = lo + 20;
      const lx = buf[lo]!;
      const ly = buf[lo + 1]!;
      const lz = buf[lo + 2]!;
      const r = buf[lo + 3]! + 0.5;
      let k = 0;
      for (let c = 0; c < nc && k < CAPS_PER_LAMP; c++) {
        const mx = (a[c * 4]! + b[c * 4]!) * 0.5 - lx;
        const my = (a[c * 4 + 1]! + b[c * 4 + 1]!) * 0.5 - ly;
        const mz = (a[c * 4 + 2]! + b[c * 4 + 2]!) * 0.5 - lz;
        if (mx * mx + my * my + mz * mz < r * r) buf[o + k++] = c + 1;
      }
      for (; k < CAPS_PER_LAMP; k++) buf[o + k] = 0;
    }
  }

  dispose(): void {
    this.obs?.remove();
    this.vis.dispose();
    this.data.dispose();
    this.moonTex?.dispose();
    this.fillTex?.dispose();
    this.volume?.dispose();
  }
}

/** Capsules the phone volume's shadows test (the nearest characters). */
export const VOL_CAPS = 4;

/** A closed door leaf between a lamp `a` and a point `b` (the same test as `LightField.doorBlocksOne`). Door texels:
 *  d0 = hinge + width, d1 = (sin yaw, cos yaw, height, shut). */
const DOOR_GLSL = `
bool nsDoorBlocks(vec3 a, vec3 b, vec4 d0, vec4 d1) {
  if (d1.w < 0.5) return false;
  float sa = (a.x - d0.x) * d1.y - (a.z - d0.z) * d1.x;
  float sb = (b.x - d0.x) * d1.y - (b.z - d0.z) * d1.x;
  if ((sa > 0.0 && sb > 0.0) || (sa < 0.0 && sb < 0.0) || sa == sb) return false;
  vec3 q = a + (b - a) * (sa / (sa - sb));
  float s = (q.x - d0.x) * d1.x + (q.z - d0.z) * d1.y;
  return s >= 0.0 && s <= d0.w && q.y >= d0.y && q.y <= d0.y + d1.z;
}
`;

/** The volume mix (GLSL): per cell, the lamps in its 2 m column as the per-lamp loop lights them, without N.L. */
const MIX_GLSL = `
precision highp float;
precision highp sampler3D;
uniform highp sampler3D lampVis;
uniform highp sampler2D lampData;
uniform vec4 lampInfo;
uniform vec4 lampGridO;
uniform vec4 lampAtlas;
uniform vec4 volO;
uniform float slice;
uniform float outB;
uniform float volMax;
uniform vec4 lampMore;
${LAMP_MATH_GLSL}
vec4 lampTexel(int k) {
  int w = int(lampInfo.x);
  return texelFetch(lampData, ivec2(k - (k / w) * w, k / w), 0);
}
${DOOR_GLSL}
void main(void) {
  vec3 p = volO.xyz + vec3(gl_FragCoord.xy, slice + 0.5) * volO.w;
  vec3 e = vec3(0.0);
  vec3 dsum = vec3(0.0);
  float wsum = 0.0;
  vec2 gq = floor((p.xz - lampGridO.xy) / lampGridO.z);
  if (gq.x >= 0.0 && gq.y >= 0.0 && gq.x < lampInfo.y && gq.y < lampInfo.z) {
    int gk = (int(gq.y) * int(lampInfo.y) + int(gq.x)) * 2;
    vec4 ga = lampTexel(gk);
    vec4 gb = lampTexel(gk + 1);
    for (int s = 0; s < 8; s++) {
      float fid = s < 4 ? ga[s] : gb[s - 4];
      if (fid < 0.5) break;
      int lb = int(lampInfo.w) + (int(fid + 0.5) - 1) * ${LAMP_TEXELS};
      vec4 t1 = lampTexel(lb + 1);
      if (t1.r + t1.g + t1.b <= 0.0) continue;
      vec4 t0 = lampTexel(lb);
      vec3 L = t0.xyz - p;
      float d = length(L);
      if (d >= t0.w) continue;
      L /= max(d, 1e-4);
      vec4 t2 = lampTexel(lb + 2);
      float ca = dot(-L, t2.xyz);
      if (ca < t2.w) continue;
      float k = nsLampFalloff(d, t0.w) * nsLampCone(ca, t2.w, t1.w);
      vec4 t3 = lampTexel(lb + 3);
      vec4 t4 = lampTexel(lb + 4);
      vec3 q = clamp((p - t3.xyz) / lampAtlas.w, vec3(0.5), vec3(t4.z, t3.w, t4.w) - 0.5);
      k *= texture(lampVis, (q + vec3(t4.x, 0.0, t4.y)) / lampAtlas.xyz).r;
      if (k <= 0.0) continue;
      // (3.6) closed doors near the lamp
      vec4 t6 = lampTexel(lb + 6);
      for (int c = 0; c < ${DOORS_PER_LAMP}; c++) {
        float did = t6[c];
        if (did < 0.5) break;
        int db = int(lampMore.x) + (int(did + 0.5) - 1) * ${DOOR_TEXELS};
        if (nsDoorBlocks(t0.xyz, p, lampTexel(db), lampTexel(db + 1))) {
          k = 0.0;
          break;
        }
      }
      if (k <= 0.0) continue;
      vec3 c = t1.rgb * k;
      e += c;
      float lum = dot(c, vec3(0.3, 0.59, 0.11));
      dsum += L * lum;
      wsum += lum;
    }
  }
  if (outB < 0.5) {
    gl_FragColor = vec4(sqrt(min(e / volMax, vec3(1.0))), 1.0);
  } else {
    float dl = length(dsum);
    gl_FragColor = dl > 1e-6 ? vec4(0.5 + 0.5 * dsum / dl, min(1.0, dl / max(wsum, 1e-6))) : vec4(0.5, 0.0, 0.5, 0.0);
  }
}`;

/**
 * The phone light volume (3.3): two RGBA8 3D render targets (`lampVolume.ts`: light, direction) drawn slice by slice
 * by `MIX_GLSL` from the baked lamps' data - at load and over the cells of lamps that change. A few milliseconds of GPU
 * once per change instead of the per-lamp loop in every pixel of every frame.
 */
class LampVolume {
  readonly a: BaseTexture;
  readonly b: BaseTexture;
  private readonly rtA: RenderTargetWrapper;
  private readonly rtB: RenderTargetWrapper;
  private readonly renderer: EffectRenderer;
  private readonly wrapper: EffectWrapper;
  /** A region still to mix (its shader was compiling). */
  private pending: number[] | null = null;
  /** Mixes run (tests). */
  mixes = 0;

  constructor(
    scene: Scene,
    private lamps: BakedLamps,
    readonly grid: LampVolumeGrid,
  ) {
    const engine = scene.getEngine();
    const [nx, ny, nz] = grid.dims;
    const make = (): RenderTargetWrapper =>
      engine.createRenderTargetTexture({ width: nx, height: ny, depth: nz }, { generateMipMaps: false, generateDepthBuffer: false, generateStencilBuffer: false, type: Constants.TEXTURETYPE_UNSIGNED_BYTE, format: Constants.TEXTUREFORMAT_RGBA, samplingMode: Constants.TEXTURE_BILINEAR_SAMPLINGMODE });
    this.rtA = make();
    this.rtB = make();
    const wrap = (rt: RenderTargetWrapper): BaseTexture => {
      const t = new BaseTexture(scene, rt.texture);
      t.wrapU = t.wrapV = t.wrapR = Texture.CLAMP_ADDRESSMODE;
      return t;
    };
    this.a = wrap(this.rtA);
    this.b = wrap(this.rtB);
    this.renderer = new EffectRenderer(engine);
    this.wrapper = new EffectWrapper({ engine, name: 'lampVolumeMix', fragmentShader: MIX_GLSL, uniformNames: ['lampInfo', 'lampGridO', 'lampAtlas', 'volO', 'slice', 'outB', 'volMax', 'lampMore'], samplerNames: ['lampVis', 'lampData'] });
  }

  /** Mix a region of cells (i0, j0, k0, i1, j1, k1) into both targets. */
  mix(reg: readonly number[]): void {
    if (!this.wrapper.effect.isReady()) {
      // (merged with any region already waiting)
      this.pending = this.pending ? unionRegion([this.pending, reg]) : [...reg];
      return;
    }
    const [i0, j0, k0, i1, j1, k1] = reg as [number, number, number, number, number, number];
    const engine = this.renderer.engine;
    const l = this.lamps;
    const g = this.grid;
    const r = this.renderer;
    const fx = i0 / g.dims[0];
    const fy = j0 / g.dims[1];
    const vp = new Viewport(fx, fy, (i1 - i0) / g.dims[0], (j1 - j0) / g.dims[1]);
    r.saveStates();
    for (let pass = 0; pass < 2; pass++) {
      const rt = pass ? this.rtB : this.rtA;
      for (let k = k0; k < k1; k++) {
        engine.bindFramebuffer(rt, 0, undefined, undefined, true, 0, k);
        r.setViewport(vp);
        r.applyEffectWrapper(this.wrapper);
        const e = this.wrapper.effect;
        e.setTexture('lampVis', l.vis);
        e.setTexture('lampData', l.data);
        e.setFloat4('lampInfo', l.width, l.gridInfo.cols, l.gridInfo.rows, l.lampBase);
        e.setFloat4('lampGridO', l.gridInfo.lox, l.gridInfo.loz, LAMP_GRID, l.capBase);
        e.setFloat4('lampAtlas', l.atlasDims[0], l.atlasDims[1], l.atlasDims[2], LAMP_CELL);
        e.setFloat4('volO', g.o[0], g.o[1], g.o[2], g.cell);
        e.setFloat('slice', k);
        e.setFloat('outB', pass);
        e.setFloat('volMax', LAMP_VOL_MAX);
        e.setFloat4('lampMore', l.doorBase, 0, 0, 0);
        r.draw();
        engine.unBindFramebuffer(rt, true);
      }
    }
    r.restoreStates();
    this.mixes++;
  }

  /**
   * Tests (3.6, parity probes): the cell containing a world point read back from the GPU - light (A: rgb =
   * sqrt(light / `LAMP_VOL_MAX`)) and direction (B) - or null outside the volume or while a mix waits.
   */
  readCell(x: number, y: number, z: number): { a: number[]; b: number[] } | null {
    const g = this.grid;
    const i = Math.floor((x - g.o[0]) / g.cell);
    const j = Math.floor((y - g.o[1]) / g.cell);
    const k = Math.floor((z - g.o[2]) / g.cell);
    if (i < 0 || j < 0 || k < 0 || i >= g.dims[0] || j >= g.dims[1] || k >= g.dims[2] || this.pending) return null;
    const engine = this.renderer.engine as unknown as { _gl: WebGL2RenderingContext; bindFramebuffer(rt: RenderTargetWrapper, face?: number, w?: number, h?: number, force?: boolean, lod?: number, layer?: number): void; unBindFramebuffer(rt: RenderTargetWrapper, disableGen?: boolean): void };
    const gl = engine._gl;
    const read = (rt: RenderTargetWrapper): number[] => {
      const px = new Uint8Array(4);
      engine.bindFramebuffer(rt, 0, undefined, undefined, true, 0, k);
      gl.readPixels(i, j, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      engine.unBindFramebuffer(rt, true);
      return [px[0]!, px[1]!, px[2]!, px[3]!];
    };
    return { a: read(this.rtA), b: read(this.rtB) };
  }

  /** Run a mix that was waiting for its shader. */
  retry(): void {
    if (!this.pending || !this.wrapper.effect.isReady()) return;
    const p = this.pending;
    this.pending = null;
    this.mix(p);
  }

  dispose(): void {
    this.wrapper.dispose();
    this.renderer.dispose();
    this.a.dispose();
    this.b.dispose();
    this.rtA.dispose();
    this.rtB.dispose();
  }
}

/** The lamp loop (GLSL), shared by every material the plugin is on. */
const LAMP_GLSL = `${LAMP_MATH_GLSL}
uniform highp sampler3D lampVis;
uniform highp sampler2D lampData;
#ifdef LAMP_MOON
uniform highp sampler3D lampMoon;
#endif
#ifdef LAMP_FILL
uniform highp sampler3D lampAmb;
#endif
vec4 lampTexel(int k) {
  int w = int(lampInfo.x);
  return texelFetch(lampData, ivec2(k - (k / w) * w, k / w), 0);
}
${DOOR_GLSL}
// a baked grid (origin + cell, counts): 1 outside it
float nsGrid(highp sampler3D t, vec3 p, vec4 o, vec4 n) {
  vec3 q = (p - o.xyz) / (o.w * n.xyz);
  if (any(lessThan(q, vec3(0.0))) || any(greaterThan(q, vec3(1.0)))) return 1.0;
  return texture(t, q).r;
}
// a character's capsule between the shaded point and the lamp: a soft shadow widening with the distance behind it
float lampCapsule(vec3 p, vec3 l, vec3 a, vec3 b, float r) {
  vec3 d2 = b - a;
  float c2 = max(dot(d2, d2), 1e-6);
  vec3 w0 = p - a;
  // the character's own surface: no self shadow
  if (length(w0 - d2 * clamp(dot(w0, d2) / c2, 0.0, 1.0)) < r * 1.6) return 1.0;
  vec3 d1 = l - p;
  float c1 = max(dot(d1, d1), 1e-6);
  float c12 = dot(d1, d2);
  float e1 = dot(d1, w0);
  float e2 = dot(d2, w0);
  float den = c1 * c2 - c12 * c12;
  float s = den > 1e-6 ? clamp((c12 * e2 - c2 * e1) / den, 0.0, 1.0) : 0.0;
  float t = clamp((c12 * s + e2) / c2, 0.0, 1.0);
  s = clamp((c12 * t - e1) / c1, 0.0, 1.0);
  float dist = length(p + d1 * s - a - d2 * t);
  float behind = s * sqrt(c1);
  float pen = r * 0.35 + behind * 0.12;
  return mix(0.15, 1.0, smoothstep(r - pen, r + pen, dist));
}`;

/**
 * Baked lamp light on a PBR material (3.2): for the lamps listed in the pixel's 2 m column, the lamp's diffuse light
 * (range falloff, cone, N.L - as Babylon's lights gave it) x its baked visibility at a point a cell off the surface
 * x the characters' capsule shadows; added to the material's diffuse.
 */
export class LampPlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private lamps: BakedLamps,
  ) {
    super(material, 'BakedLamps', 250, { BAKED_LAMPS: false, LAMP_VOLUME: false, LAMP_MOON: false, LAMP_FILL: false });
    this._enable(true);
  }

  /** On a standard material (the phone light look): the light goes into `diffuseBase`. (Read from the material, not a
   *  field: Babylon collects the injection points inside the base constructor, before a field could be set.) */
  private get std(): boolean {
    return this._material.getClassName() === 'StandardMaterial';
  }

  override getClassName(): string {
    return 'LampPlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.BAKED_LAMPS = !!mesh;
    defines.LAMP_VOLUME = !!mesh && !!this.lamps.volume;
    // (only a texture that exists: an unbound sampler3D falls on a 2D texture's unit, a draw error)
    defines.LAMP_MOON = !!mesh && !!this.lamps.moonTex;
    defines.LAMP_FILL = !!mesh && !!this.lamps.fillTex;
  }

  override getSamplers(samplers: string[]): void {
    samplers.push('lampVis', 'lampData', 'lampVolA', 'lampVolB', 'lampMoon', 'lampAmb');
  }

  override getUniforms(): { ubo?: { name: string; size: number; type: string; arraySize?: number }[]; fragment?: string } {
    return {
      ubo: [
        { name: 'lampInfo', size: 4, type: 'vec4' },
        { name: 'lampGridO', size: 4, type: 'vec4' },
        { name: 'lampAtlas', size: 4, type: 'vec4' },
        { name: 'lampVolO', size: 4, type: 'vec4' },
        { name: 'lampVolD', size: 4, type: 'vec4' },
        { name: 'lampCaps', size: 4, type: 'vec4', arraySize: VOL_CAPS * 2 },
        { name: 'lampMore', size: 4, type: 'vec4' },
        { name: 'lampMoonO', size: 4, type: 'vec4' },
        { name: 'lampMoonN', size: 4, type: 'vec4' },
        { name: 'lampAmbO', size: 4, type: 'vec4' },
        { name: 'lampAmbN', size: 4, type: 'vec4' },
        { name: 'lampFillC', size: 4, type: 'vec4' },
      ],
      fragment: `#ifdef BAKED_LAMPS\nuniform vec4 lampInfo;\nuniform vec4 lampGridO;\nuniform vec4 lampAtlas;\nuniform vec4 lampVolO;\nuniform vec4 lampVolD;\nuniform vec4 lampCaps[${VOL_CAPS * 2}];\nuniform vec4 lampMore;\nuniform vec4 lampMoonO;\nuniform vec4 lampMoonN;\nuniform vec4 lampAmbO;\nuniform vec4 lampAmbN;\nuniform vec4 lampFillC;\n#endif`,
    };
  }

  override bindForSubMesh(ubo: UniformBuffer, _scene: Scene, _engine: unknown, _subMesh: SubMesh): void {
    const l = this.lamps;
    const v = l.volume;
    // (3.6) the baked moon, on both paths; the ambient-grid fill on the phone light look
    const m = l.moon;
    const f = l.fill;
    ubo.updateFloat4('lampMore', l.doorBase, m && l.moonTex ? 1 : 0, f && l.fillTex ? 1 : 0, LEVEL_TO_RENDER);
    if (f && l.fillTex) {
      ubo.updateFloat4('lampAmbO', f.grid.origin[0], f.grid.origin[1], f.grid.origin[2], AMBIENT_CELL);
      ubo.updateFloat4('lampAmbN', f.grid.n[0], f.grid.n[1], f.grid.n[2], 0);
      ubo.updateFloat4('lampFillC', f.color[0], f.color[1], f.color[2], 0);
      ubo.setTexture('lampAmb', l.fillTex);
    }
    if (m && l.moonTex) {
      ubo.updateFloat4('lampMoonO', m.origin[0], m.origin[1], m.origin[2], m.cell);
      ubo.updateFloat4('lampMoonN', m.n[0], m.n[1], m.n[2], 0);
      ubo.setTexture('lampMoon', l.moonTex);
    }
    if (v) {
      const g = v.grid;
      ubo.updateFloat4('lampVolO', g.o[0], g.o[1], g.o[2], g.cell);
      ubo.updateFloat4('lampVolD', g.dims[0], g.dims[1], g.dims[2], LAMP_VOL_MAX);
      ubo.updateFloatArray('lampCaps', l.volCaps);
      ubo.setTexture('lampVolA', v.a);
      ubo.setTexture('lampVolB', v.b);
      return;
    }
    const g = l.gridInfo;
    ubo.updateFloat4('lampInfo', l.width, g.cols, g.rows, l.lampBase);
    ubo.updateFloat4('lampGridO', g.lox, g.loz, LAMP_GRID, l.capBase);
    ubo.updateFloat4('lampAtlas', l.atlasDims[0], l.atlasDims[1], l.atlasDims[2], LAMP_CELL);
    if (l.vis) ubo.setTexture('lampVis', l.vis);
    if (l.data) ubo.setTexture('lampData', l.data);
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    const code: { [pointName: string]: string } = {
      CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef BAKED_LAMPS
${LAMP_GLSL}
#ifdef LAMP_VOLUME
uniform highp sampler3D lampVolA;
uniform highp sampler3D lampVolB;
// 3.3 phones: the lamps pre-mixed - their light and the direction it comes from, two taps (gn: the geometric normal,
// n: the shading normal)
vec3 nsVolume(vec3 lp, vec3 gn, vec3 n) {
  vec3 q = (lp + gn * lampVolO.w - lampVolO.xyz) / (lampVolO.w * lampVolD.xyz);
  if (any(lessThan(q, vec3(0.0))) || any(greaterThan(q, vec3(1.0)))) return vec3(0.0);
  vec4 la = texture(lampVolA, q);
  if (la.r + la.g + la.b <= 0.002) return vec3(0.0);
  vec4 lb = texture(lampVolB, q);
  vec3 ld = lb.rgb * 2.0 - 1.0;
  float dl = length(ld);
  ld = dl > 1e-3 ? ld / dl : vec3(0.0, 1.0, 0.0);
  float nd = dot(n, ld);
  // one lamp: N.L; light from every side: wrapped
  float k = mix(0.5 + 0.5 * nd, max(nd, 0.0), lb.a);
  // the nearest characters shade it, along the light's direction
  vec3 lpos = lp + ld * 3.0;
  for (int c = 0; c < ${VOL_CAPS}; c++) {
    vec4 ca4 = lampCaps[c * 2];
    if (ca4.w <= 0.0) break;
    k *= mix(1.0, lampCapsule(lp, lpos, ca4.xyz, lampCaps[c * 2 + 1].xyz, ca4.w), lb.a);
  }
  return la.rgb * la.rgb * lampVolD.w * k;
}
#endif
#endif`,
      // 3.6: the baked moon - the sun light (the one directional light) x the moon's visibility a little off the
      // surface; its cascades hold only moving casters (\`World\`)
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
#ifdef BAKED_LAMPS
#ifdef LAMP_MOON
float nsMoon = nsGrid(lampMoon, vPositionW + normalize(vNormalW) * lampMoonO.w * 0.5, lampMoonO, lampMoonN);
#else
float nsMoon = 1.0;
#endif
#endif`,
      '!#define CUSTOM_LIGHT(\\d+)_COLOR': `#ifdef BAKED_LAMPS
#ifdef DIRLIGHT$1
diffuse$1.rgb *= nsMoon;
#endif
#endif
#define CUSTOM_LIGHT$1_COLOR`,
      CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: `
#ifdef BAKED_LAMPS
#ifdef LAMP_VOLUME
finalDiffuse += nsVolume(vPositionW, normalize(vNormalW), normalW) * surfaceAlbedo.rgb;
#else
{
  vec3 lp = vPositionW;
  vec3 lgn = normalize(vNormalW);
  vec2 gq = floor((lp.xz - lampGridO.xy) / lampGridO.z);
  vec3 lsum = vec3(0.0);
  if (gq.x >= 0.0 && gq.y >= 0.0 && gq.x < lampInfo.y && gq.y < lampInfo.z) {
    int gk = (int(gq.y) * int(lampInfo.y) + int(gq.x)) * 2;
    vec4 ga = lampTexel(gk);
    vec4 gb = lampTexel(gk + 1);
    for (int s = 0; s < 8; s++) {
      float fid = s < 4 ? ga[s] : gb[s - 4];
      if (fid < 0.5) break;
      int lb = int(lampInfo.w) + (int(fid + 0.5) - 1) * ${LAMP_TEXELS};
      vec4 t1 = lampTexel(lb + 1);
      if (t1.r + t1.g + t1.b <= 0.0) continue;
      vec4 t0 = lampTexel(lb);
      vec3 L = t0.xyz - lp;
      float d = length(L);
      if (d >= t0.w) continue;
      L /= max(d, 1e-4);
      float ndl = dot(normalW, L);
      if (ndl <= 0.0) continue;
      vec4 t2 = lampTexel(lb + 2);
      float ca = dot(-L, t2.xyz);
      if (ca < t2.w) continue;
      float k = ndl * nsLampFalloff(d, t0.w) * nsLampCone(ca, t2.w, t1.w);
      vec4 t3 = lampTexel(lb + 3);
      vec4 t4 = lampTexel(lb + 4);
      vec3 dq = lp + lgn * lampAtlas.w;
      vec3 q = clamp((dq - t3.xyz) / lampAtlas.w, vec3(0.5), vec3(t4.z, t3.w, t4.w) - 0.5);
      k *= texture(lampVis, (q + vec3(t4.x, 0.0, t4.y)) / lampAtlas.xyz).r;
      if (k <= 0.0) continue;
      // (3.6) closed doors near the lamp, tested from the same point as the visibility
      vec4 t6 = lampTexel(lb + 6);
      for (int c = 0; c < ${DOORS_PER_LAMP}; c++) {
        float did = t6[c];
        if (did < 0.5) break;
        int db = int(lampMore.x) + (int(did + 0.5) - 1) * ${DOOR_TEXELS};
        if (nsDoorBlocks(t0.xyz, dq, lampTexel(db), lampTexel(db + 1))) {
          k = 0.0;
          break;
        }
      }
      if (k <= 0.0) continue;
      vec4 t5 = lampTexel(lb + 5);
      for (int c = 0; c < ${CAPS_PER_LAMP}; c++) {
        float cid = t5[c];
        if (cid < 0.5) break;
        int cb = int(lampGridO.w) + (int(cid + 0.5) - 1) * 2;
        vec4 ca4 = lampTexel(cb);
        vec4 cb4 = lampTexel(cb + 1);
        k *= lampCapsule(lp, t0.xyz, ca4.xyz, cb4.xyz, ca4.w);
      }
      lsum += t1.rgb * k;
    }
  }
  finalDiffuse += lsum * surfaceAlbedo.rgb;
}
#endif
#endif`,
    };
    if (!this.std) return code;
    // the phone light look's standard materials: the volume and the ambient-grid fill join the lights' diffuse sum
    // (the material's colour and albedo multiply it after)
    delete code['CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION'];
    code['!vec3 emissiveColor=vEmissiveColor;'] = `#ifdef BAKED_LAMPS
#ifdef LAMP_FILL
diffuseBase += nsGrid(lampAmb, vPositionW + normalize(vNormalW) * 0.25, lampAmbO, lampAmbN) * lampMore.w * lampFillC.rgb;
#endif
#ifdef LAMP_VOLUME
diffuseBase += nsVolume(vPositionW, normalize(vNormalW), normalW);
#endif
#endif
vec3 emissiveColor=vEmissiveColor;`;
    return code;
  }
}
