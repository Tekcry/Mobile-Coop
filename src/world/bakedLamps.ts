import { Constants, MaterialPluginBase, RawTexture, RawTexture3D, Texture, type AbstractMesh, type Material, type MaterialDefines, type Scene, type SubMesh, type UniformBuffer } from '../core/babylon';
import { dropCpuCopy } from '../voxel/voxelWorld';
import { BOX_STRIDE, fillLampAtlas, LAMP_CELL, LAMP_GRID, LAMP_STRIDE, lampGrid, packLampAtlas, type LampResult } from '../voxel/lampBake';
import type { LightRegistry } from './lights';

/** Omni lamps light everything below them through this cone (rad; as `LightRig`'s lamps did). */
const LAMP_CONE = Math.PI * 0.97;
/** Map lights were Babylon lights at this x their gameplay intensity. */
const LIGHT_GAIN = 1.6;
/** Texels per lamp in the data texture: position + range, colour + exponent, direction + cos, box origin + ny,
 *  atlas tile + nx / nz, character capsule ids. */
const LAMP_TEXELS = 6;
/** Character capsules (two texels each) and how many one lamp tests. */
export const MAX_CAPSULES = 16;
const CAPS_PER_LAMP = 4;

/** Pure: the lights that are baked (every fixed one; flashlights move) packed for the bake (`LAMP_STRIDE`). */
export function bakedLights(reg: LightRegistry): { lights: Float32Array; ids: number[] } {
  const ids: number[] = [];
  for (const l of reg.lights) if (l.kind !== 'flashlight') ids.push(l.id);
  const lights = new Float32Array(ids.length * LAMP_STRIDE);
  ids.forEach((id, i) => {
    const l = reg.lights[id]!;
    const f = l.fixture;
    lights.set([l.x, l.y, l.z, l.reach ?? l.radius, l.cone?.dx ?? 0, l.cone?.dy ?? -1, l.cone?.dz ?? 0, l.cone ? l.cone.cosOuter : -2, f?.sx ?? 0, f?.sz ?? 0], i * LAMP_STRIDE);
  });
  return { lights, ids };
}

/**
 * Baked lamps (3.2): every fixed light shaded through its baked visibility (`voxel/lampBake.ts`) by `LampPlugin` on
 * every lit material, instead of real Babylon lights and shadow maps. Each lamp is exact (walls, racks, doorways),
 * on or off at once (switches, shots, EMP), for a 3D texture tap per lamp per pixel; characters get soft capsule
 * shadows from every lamp. One data texture: the light grid (which lamps reach each 2 m column), the lamps, the
 * capsules (updated each frame).
 */
export class BakedLamps {
  readonly vis: RawTexture3D;
  readonly data: RawTexture;
  /** Registry ids of the baked lights (the light rig leaves them out). */
  readonly ids: Set<number>;
  readonly atlasDims: [number, number, number];
  readonly gridInfo: { lox: number; loz: number; cols: number; rows: number };
  readonly width: number;
  /** Texel index where the lamps / the capsules start. */
  readonly lampBase: number;
  readonly capBase: number;
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
  /** Characters' capsules each frame (foot + head points, radius): GameState's. */
  capsules: ((a: Float32Array, b: Float32Array, max: number) => number) | null = null;

  constructor(
    private scene: Scene,
    private reg: LightRegistry,
    baked: { lights: Float32Array; ids: number[] },
    r: LampResult,
    lo: readonly number[],
    hi: readonly number[],
  ) {
    this.order = baked.ids;
    this.ids = new Set(baked.ids);
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
    const texels = this.capBase + MAX_CAPSULES * 2;
    const h = Math.ceil(texels / w);
    const buf = new Float32Array(w * h * 4);
    this.buf = buf;
    // the grid: ids + 1 as floats (row-major in texel order)
    for (let i = 0; i < grid.data.length; i++) buf[i] = grid.data[i]!;
    // the lamps' fixed texels
    const cosLamp = Math.cos(LAMP_CONE / 2);
    for (let i = 0; i < n; i++) {
      const o = (this.lampBase + i * LAMP_TEXELS) * 4;
      const L = baked.lights;
      const li = i * LAMP_STRIDE;
      buf.set([L[li]!, L[li + 1]!, L[li + 2]!, L[li + 3]!], o);
      const cone = L[li + 7]! > -1.5;
      // t1 (colour) is written by `update`; its w: the spot exponent
      buf[o + 7] = cone ? 2 : 1;
      buf.set([L[li + 4]!, L[li + 5]!, L[li + 6]!, cone ? L[li + 7]! : cosLamp], o + 8);
      const b = i * BOX_STRIDE;
      buf.set([r.boxes[b]!, r.boxes[b + 1]!, r.boxes[b + 2]!, r.boxes[b + 4]!], o + 12);
      buf.set([atlas.offsets[i * 2]!, atlas.offsets[i * 2 + 1]!, r.boxes[b + 3]!, r.boxes[b + 5]!], o + 16);
    }
    this.data = new RawTexture(buf, w, h, Constants.TEXTUREFORMAT_RGBA, scene, false, false, Texture.NEAREST_SAMPLINGMODE, Constants.TEXTURETYPE_FLOAT);
    this.update();
  }

  /** Put the plugin on every PBR material in the scene, now and as they are made. */
  attachAll(): void {
    for (const m of this.scene.materials) this.attach(m);
    const o = this.scene.onNewMaterialAddedObservable.add((m) => this.attach(m));
    this.obs = { remove: () => this.scene.onNewMaterialAddedObservable.remove(o) };
  }

  attach(m: Material): void {
    if (this.plugins.has(m) || m.getClassName() !== 'PBRMaterial') return;
    this.plugins.add(m);
    const frozen = m.isFrozen;
    if (frozen) m.unfreeze();
    new LampPlugin(m, this);
    if (frozen) m.freeze();
  }

  /** Lamps on / off / shot out / EMP (on a registry change): their colours. */
  private update(): void {
    const buf = this.buf;
    for (let i = 0; i < this.order.length; i++) {
      const l = this.reg.lights[this.order[i]!]!;
      const k = l.on && !l.destroyed ? l.intensity * LIGHT_GAIN : 0;
      const o = (this.lampBase + i * LAMP_TEXELS + 1) * 4;
      buf[o] = l.color[0] * k;
      buf[o + 1] = l.color[1] * k;
      buf[o + 2] = l.color[2] * k;
    }
    this.version = this.reg.version;
  }

  /** Per render frame: lamp changes and the characters' capsules (each lamp lists the nearest few in its reach). */
  frame(): void {
    let dirty = false;
    if (this.version !== this.reg.version) {
      this.update();
      dirty = true;
    }
    const nc = this.capsules ? Math.min(MAX_CAPSULES, this.capsules(this.capA, this.capB, MAX_CAPSULES)) : 0;
    if (nc || this.caps) {
      this.caps = nc;
      this.writeCapsules(nc);
      dirty = true;
    }
    if (dirty) this.data.update(this.buf);
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
  }
}

/** The lamp loop (GLSL), shared by every material the plugin is on. */
const LAMP_GLSL = `
uniform highp sampler3D lampVis;
uniform highp sampler2D lampData;
vec4 lampTexel(int k) {
  int w = int(lampInfo.x);
  return texelFetch(lampData, ivec2(k - (k / w) * w, k / w), 0);
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
    super(material, 'BakedLamps', 250, { BAKED_LAMPS: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'LampPlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.BAKED_LAMPS = !!mesh;
  }

  override getSamplers(samplers: string[]): void {
    samplers.push('lampVis', 'lampData');
  }

  override getUniforms(): { ubo?: { name: string; size: number; type: string }[]; fragment?: string } {
    return {
      ubo: [
        { name: 'lampInfo', size: 4, type: 'vec4' },
        { name: 'lampGridO', size: 4, type: 'vec4' },
        { name: 'lampAtlas', size: 4, type: 'vec4' },
      ],
      fragment: '#ifdef BAKED_LAMPS\nuniform vec4 lampInfo;\nuniform vec4 lampGridO;\nuniform vec4 lampAtlas;\n#endif',
    };
  }

  override bindForSubMesh(ubo: UniformBuffer, _scene: Scene, _engine: unknown, _subMesh: SubMesh): void {
    const l = this.lamps;
    const g = l.gridInfo;
    ubo.updateFloat4('lampInfo', l.width, g.cols, g.rows, l.lampBase);
    ubo.updateFloat4('lampGridO', g.lox, g.loz, LAMP_GRID, l.capBase);
    ubo.updateFloat4('lampAtlas', l.atlasDims[0], l.atlasDims[1], l.atlasDims[2], LAMP_CELL);
    ubo.setTexture('lampVis', l.vis);
    ubo.setTexture('lampData', l.data);
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef BAKED_LAMPS
${LAMP_GLSL}
#endif`,
      CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: `
#ifdef BAKED_LAMPS
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
      float k = ndl * (1.0 - d / t0.w) * pow(max(ca, 1e-4), t1.w);
      vec4 t3 = lampTexel(lb + 3);
      vec4 t4 = lampTexel(lb + 4);
      vec3 q = clamp((lp + lgn * lampAtlas.w - t3.xyz) / lampAtlas.w, vec3(0.5), vec3(t4.z, t3.w, t4.w) - 0.5);
      k *= texture(lampVis, (q + vec3(t4.x, 0.0, t4.y)) / lampAtlas.xyz).r;
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
#endif`,
    };
  }
}
