/**
 * Draws the campus art (sector-redesign ART-KIT step 6; render side only, gameplay never reads it). Based on marlow-final's
 * `props/propRender.ts` (unedited): the catalogues' GLBs (the facility props through `propsUrl()`, `campus-kit.glb`, the
 * section heroes `hero-s<N>.glb`) read once in parallel with the operators' GLB reader; one material per material name
 * (the merged look table: PBR lit by the baked lamps as the level; the emissive materials unlit, coloured per instance).
 *
 * Draws (ART-PLAN 3, "Draws"; perfa: fewer draws, same pixels; the rule is `artDrawKey`):
 * - the static opaque meshes (not emissive, not alpha, not a box-hidden skin) are baked into one mesh per (section,
 *   material) (`kit/staticMerge.ts`), frozen, with their own bounds, so another building's art culls;
 * - (perfa) the emissives are baked the same way, one mesh per (section, material), their instance colours
 *   written per vertex (the same `vColor` multiply as the thin-instance colour): screens and lamps on their light circuit
 *   (`group`: dim to `PROP_DARK` while no lamp of the group is on, repainted when the registry changes, allocation-free);
 *   own-supply emissives (exit signs) at their own colour and gain, never dimmed;
 * - (perfa) the box-hidden skins' opaque parts are baked one mesh per (section, material), each a shadow caster;
 * - the alpha meshes stay one thin-instanced mesh per (catalogue, section, piece, material) (their sort order unchanged),
 *   bounds refreshed once;
 * - no art mesh casts a shadow (the boxes under the props cast, as the bake has them) except the box-hidden skins, which
 *   stand in for the box they hide (`addCaster`); `BuiltLevel.hidePieces` then hides those boxes' drawn instances, after
 *   the art is ready (a failed load never hides a box: the greybox shows);
 * - (perfa) a draw whose placements are all indoor (indoor-tagged rooms, `ArtPlacement.indoor`) stops drawing while the camera is
 *   more than `ART_FAR` (plan distance) from its bounds: another building's interior is behind its walls, and the frustum
 *   alone keeps it (no occlusion culling). Outdoor art and the box-hidden skins are never far-culled.
 */
import { Color3, Mesh, PBRMaterial, StandardMaterial, VertexBuffer, VertexData, type AbstractMesh, type Material, type Observer, type Scene } from '../../core/babylon';
import { parseGlb, type GlbMesh, type GlbModel } from '../../operators/lab/glb';
import { loadKeptModel } from '../../operators/runtime/figure';
import { kept } from '../../core/keptParts';
import { markLampLevel } from '../bakedLamps';
import { bakedMesh } from '../kit/kitRender';
import { markDrawFirst, useSkinsFirst, type BakePart } from '../kit/staticMerge';
import type { LightRegistry } from '../lights';
import type { BuiltLevel } from '../levelBuilder';
import { propsUrl } from '../props/propRender';
import { PROP_DARK, PROP_LAMP_GAIN, PROP_LAMP_TINT, PROP_SCREEN_GAIN, PROP_SCREEN_TINT } from '../props/facilityProps';
import { campusCatalogues, type CampusArtLayout } from '../maps/campusDress';
import { artDrawKey, artMatrix, mergedKey, type ArtLook, type ArtPlacement, type CatalogueSet, type PropCatalogue } from './catalogue';

const FILES = import.meta.glob<string>('./assets/*.glb', { query: '?url', import: 'default', eager: true });

/** (perfa) Indoor art stops drawing past this plan distance (m) from its draw's bounds; back on inside it less `ART_FAR_HYST`. */
export const ART_FAR = 60;
const ART_FAR_HYST = 2;
/** The far cull re-runs when the camera has moved this far (m) in plan. */
const ART_FAR_STEP = 1;

/** The bundled URL of a campus art GLB by file name ('' when it is missing). */
export function campusArtUrl(file: string): string {
  for (const [p, url] of Object.entries(FILES)) if (p.endsWith(`/${file}`)) return url;
  return '';
}

/** One thin-instanced draw (alpha meshes, an emissive caster). */
interface Draw {
  mesh: Mesh;
  section: number;
  mat: string;
  look: ArtLook;
  cat: PropCatalogue;
  /** Placement indices, in instance order. */
  idx: Int32Array;
  colors: Float32Array | null;
  /** Some instance is on a light circuit. */
  grouped: boolean;
  tris: number;
  indoor: boolean;
  caster: boolean;
}

/** A merged emissive draw's per-instance colouring. */
interface Paint {
  mat: string;
  /** Placement indices, in bake order. */
  idx: Int32Array;
  /** Each instance's catalogue (own-supply lookup). */
  cats: PropCatalogue[];
  /** First vertex of each instance (length n + 1). */
  vstart: Int32Array;
  /** Per-vertex colours (rgba). */
  colors: Float32Array;
  grouped: boolean;
}

interface Merged {
  mesh: Mesh;
  section: number;
  tris: number;
  kind: 'merged' | 'emissive' | 'caster';
  indoor: boolean;
  paint: Paint | null;
}

interface Bucket {
  section: number;
  key: string;
  mat: string;
  look: ArtLook;
  parts: BakePart[];
  /** Placement indices in bake order, and each one's catalogue and vertex count. */
  ids: number[];
  cats: PropCatalogue[];
  verts: number[];
}

export class CampusArtRender {
  private draws: Draw[] = [];
  private merged: Merged[] = [];
  private materials = new Map<string, Material>();
  private observer: Observer<Scene> | null = null;
  private regVersion = -1;
  /** (perfa) The far-culled meshes, their plan bounds (minX, minZ, maxX, maxZ) and whether each is drawn. */
  private cull: Mesh[] = [];
  private cullBox = new Float32Array(0);
  private cullOn = new Uint8Array(0);
  private camX = Number.NaN;
  private camZ = Number.NaN;
  private rgb = new Float32Array(4);

  private constructor(
    private readonly scene: Scene,
    private readonly placements: readonly ArtPlacement[],
    private readonly cats: CatalogueSet,
    private readonly reg: LightRegistry | null,
  ) {}

  /** Loads the GLBs of every catalogue the art uses (in parallel) and builds the draws; then hides the box-hidden skins' boxes. */
  static async create(scene: Scene, art: CampusArtLayout, reg: LightRegistry | null, level: Pick<BuiltLevel, 'hidePieces'> | null, addCaster: (m: AbstractMesh) => void): Promise<CampusArtRender> {
    const cats = campusCatalogues();
    const ids = art.catalogues.filter((id) => cats[id]);
    const models = await Promise.all(
      ids.map(async (id) => {
        const cat = cats[id]!;
        const url = id === 'F' ? propsUrl() : campusArtUrl(cat.glb);
        if (!url) throw new Error(`campus art: ${cat.glb} missing (npm run campus-props:build)`);
        // (map-ready S9) flag on: parsed once per page (the kept parts); off: fetched and parsed per load as before
        if (kept.enabled) return loadKeptModel(scene, url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`campus art: ${cat.glb}: HTTP ${res.status}`);
        return parseGlb(await res.arrayBuffer());
      }),
    );
    const byId: Record<string, GlbModel> = {};
    ids.forEach((id, i) => (byId[id] = models[i]!));
    return CampusArtRender.fromModels(scene, art, byId, reg, level, addCaster, cats);
  }

  /** The draws from read GLBs (`create` after its fetches; tests on a NullEngine). */
  static fromModels(
    scene: Scene,
    art: CampusArtLayout,
    models: Readonly<Record<string, GlbModel>>,
    reg: LightRegistry | null,
    level: Pick<BuiltLevel, 'hidePieces'> | null,
    addCaster: (m: AbstractMesh) => void,
    cats: CatalogueSet = campusCatalogues(),
  ): CampusArtRender {
    const r = new CampusArtRender(scene, art.placements, cats, reg);
    if (scene.isDisposed) return r;
    useSkinsFirst(scene);
    // (artpol, art-kit P8) a build that throws part-way leaves nothing behind: its draws, merges and materials, and any
    // mesh made before it reached a list (the greybox, not hidden yet, still shows)
    const n0 = scene.meshes.length;
    try {
      r.build(models, addCaster);
      const grouped = r.draws.some((d) => d.grouped) || r.merged.some((m) => m.paint?.grouped);
      if ((grouped && reg) || r.cull.length) r.observer = scene.onBeforeRenderObservable.add(() => r.frame());
      r.frame();
    } catch (e) {
      r.dispose();
      // (artnext A10) `slice(n0)` is every mesh made since the build began only while nothing that existed before it was
      // removed from `scene.meshes` (the build only adds; `r.dispose()` above disposes its own): a build that disposed a
      // pre-existing mesh would shift the list and this would miss the newest ones
      for (const m of scene.meshes.slice(n0)) m.dispose();
      throw e;
    }
    // the boxes the box-hidden skins stand in for stop drawing only now, with the art ready
    const hide: number[] = [];
    for (const p of art.placements) if (p.cls === 'skin-hide' && p.skinOf !== undefined) hide.push(p.skinOf);
    if (hide.length && level) level.hidePieces(hide);
    return r;
  }

  private material(name: string, look: ArtLook): Material {
    const have = this.materials.get(name);
    if (have) return have;
    let m: Material;
    if (look.emissive) {
      const sm = new StandardMaterial(`campus-${name}`, this.scene);
      sm.disableLighting = true;
      sm.diffuseColor = Color3.Black();
      sm.specularColor = Color3.Black();
      sm.emissiveColor = Color3.White();
      m = sm;
    } else {
      const pm = new PBRMaterial(`campus-${name}`, this.scene);
      pm.albedoColor = Color3.FromHexString(look.color).toLinearSpace();
      pm.metallic = look.metallic;
      pm.roughness = look.roughness;
      pm.usePhysicalLightFalloff = false;
      pm.directIntensity = Math.PI;
      pm.environmentIntensity = 0.6;
      pm.realTimeFiltering = true;
      markLampLevel(pm);
      if (look.alpha !== undefined) {
        pm.alpha = look.alpha;
        pm.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
        pm.backFaceCulling = true;
        pm.twoSidedLighting = true;
      } else markDrawFirst(pm);
      m = pm;
    }
    m.freeze();
    this.materials.set(name, m);
    return m;
  }

  private build(models: Readonly<Record<string, GlbModel>>, addCaster: (m: AbstractMesh) => void): void {
    // placements by catalogue and piece
    const byPiece = new Map<string, number[]>();
    this.placements.forEach((p, i) => {
      const key = `${p.cat}|${p.prop}`;
      let l = byPiece.get(key);
      if (!l) byPiece.set(key, (l = []));
      l.push(i);
    });
    const buckets = new Map<string, Bucket>();
    for (const [catId, model] of Object.entries(models)) {
      const cat = this.cats[catId];
      if (!cat) continue;
      for (const g of model.meshes) {
        const dot = g.name.indexOf('.');
        const prop = g.name.slice(0, dot);
        const mat = g.name.slice(dot + 1);
        const look = cat.looks[mat];
        const list = byPiece.get(`${catId}|${prop}`);
        if (!look || !list) continue;
        // split by section and draw key (`artDrawKey`)
        const groups = new Map<string, number[]>();
        for (const i of list) {
          const p = this.placements[i]!;
          const key = `${p.section}#${artDrawKey(p, mat, look)}`;
          let l = groups.get(key);
          if (!l) groups.set(key, (l = []));
          l.push(i);
        }
        for (const [gk, ids] of groups) {
          const h = gk.indexOf('#');
          const section = Number(gk.slice(0, h));
          const key = gk.slice(h + 1);
          if (!mergedKey(key)) {
            this.draws.push(this.instanced(cat, g, mat, look, section, ids, key.split('|')[4] === 'c', ids.every((i) => this.placements[i]!.indoor === true && this.placements[i]!.cls !== 'skin-hide'), addCaster));
            continue;
          }
          const matrices = new Float32Array(ids.length * 16);
          ids.forEach((i, n) => artMatrix(this.placements[i]!, matrices, n * 16));
          let b = buckets.get(gk);
          if (!b) buckets.set(gk, (b = { section, key, mat, look, parts: [], ids: [], cats: [], verts: [] }));
          b.parts.push({ geo: g, matrices, count: ids.length });
          const nv = g.positions.length / 3;
          for (const i of ids) {
            b.ids.push(i);
            b.cats.push(cat);
            b.verts.push(nv);
          }
        }
      }
    }
    for (const b of buckets.values()) this.merged.push(this.bake(b, addCaster));
    // the far-culled draws and their plan bounds
    const cull: Mesh[] = [];
    for (const d of this.draws) if (d.indoor) cull.push(d.mesh);
    for (const m of this.merged) if (m.indoor) cull.push(m.mesh);
    this.cull = cull;
    this.cullBox = new Float32Array(cull.length * 4);
    this.cullOn = new Uint8Array(cull.length).fill(1);
    cull.forEach((m, n) => {
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      this.cullBox[n * 4] = bb.minimumWorld.x;
      this.cullBox[n * 4 + 1] = bb.minimumWorld.z;
      this.cullBox[n * 4 + 2] = bb.maximumWorld.x;
      this.cullBox[n * 4 + 3] = bb.maximumWorld.z;
    });
  }

  /** One merged (baked) draw: static opaque, emissive (colours per vertex) or a box-hidden skin's opaque part (caster). */
  private bake(b: Bucket, addCaster: (m: AbstractMesh) => void): Merged {
    const kind = b.key[0] === 'e' ? 'emissive' : b.key[0] === 'c' ? 'caster' : 'merged';
    const indoor = b.key[0] !== 'c' && b.ids.every((i) => this.placements[i]!.indoor === true);
    const name = `campus-${kind === 'emissive' ? 'emissive' : 'static'}.${b.section}.${b.mat}${kind === 'caster' ? '.c' : ''}${indoor ? '.i' : ''}`;
    const mesh = bakedMesh(this.scene, name, b.parts, this.material(b.mat, b.look));
    mesh.alwaysSelectAsActiveMesh = false;
    let tris = 0;
    for (const p of b.parts) tris += (p.geo.indices.length / 3) * p.count;
    let paint: Paint | null = null;
    if (kind === 'emissive') {
      mesh.receiveShadows = false;
      const n = b.ids.length;
      const vstart = new Int32Array(n + 1);
      for (let i = 0; i < n; i++) vstart[i + 1] = vstart[i]! + b.verts[i]!;
      const colors = new Float32Array(vstart[n]! * 4);
      let grouped = false;
      for (const i of b.ids) if (this.placements[i]!.group !== undefined) grouped = true;
      paint = { mat: b.mat, idx: Int32Array.from(b.ids), cats: b.cats, vstart, colors, grouped: grouped && b.cats.some((c) => !c.ownSupply?.[b.mat]) };
      mesh.setVerticesData(VertexBuffer.ColorKind, colors, true, 4);
      mesh.hasVertexAlpha = false;
      this.repaint(mesh, paint);
    }
    if (kind === 'caster') addCaster(mesh);
    return { mesh, section: b.section, tris, kind, indoor, paint };
  }

  private instanced(cat: PropCatalogue, g: GlbMesh, mat: string, look: ArtLook, section: number, ids: number[], caster: boolean, indoor: boolean, addCaster: (m: AbstractMesh) => void): Draw {
    const mesh = new Mesh(`campus-${cat.id}.${section}.${g.name}${caster ? '.c' : ''}${indoor ? '.i' : ''}`, this.scene);
    const vd = new VertexData();
    vd.positions = g.positions;
    vd.normals = g.normals;
    vd.indices = g.indices as unknown as number[];
    vd.applyToMesh(mesh, false);
    mesh.material = this.material(mat, look);
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = false;
    mesh.receiveShadows = !look.emissive;
    const idx = Int32Array.from(ids);
    const matrices = new Float32Array(idx.length * 16);
    for (let n = 0; n < idx.length; n++) artMatrix(this.placements[idx[n]!]!, matrices, n * 16);
    mesh.thinInstanceSetBuffer('matrix', matrices, 16, true);
    let colors: Float32Array | null = null;
    if (look.emissive) {
      colors = new Float32Array(idx.length * 4);
      mesh.thinInstanceSetBuffer('color', colors, 4, false);
    }
    mesh.thinInstanceRefreshBoundingInfo(false);
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
    if (caster) addCaster(mesh);
    let grouped = false;
    for (const i of ids) if (this.placements[i]!.group !== undefined) grouped = true;
    const d: Draw = { mesh, section, mat, look, cat, idx, colors, grouped: grouped && !!colors && !cat.ownSupply?.[mat], tris: (g.indices.length / 3) * idx.length, indoor, caster };
    if (colors) this.paint(d);
    return d;
  }

  /** Is a lamp of the circuit on and not shot out (a lampless group is dark, as the kit's)? Allocation-free. */
  private groupLit(group: number): boolean {
    const ls = this.reg!.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (l.group === group && l.on && !l.destroyed) return true;
    }
    return false;
  }

  /** One instance's colour into `out[o..o+3]` (allocation-free): screens tinted, lamps tinted, own-supply at their colour,
   *  the grouped ones dimmed while their circuit is cut. */
  private instColor(p: ArtPlacement, cat: PropCatalogue, mat: string, out: Float32Array, o: number): void {
    const own = cat.ownSupply?.[mat];
    let r: number;
    let g: number;
    let b: number;
    let k: number;
    if (own) {
      r = own.tint[0];
      g = own.tint[1];
      b = own.tint[2];
      k = own.gain;
    } else {
      const screen = mat === 'screen';
      const t = screen ? (p.tint ?? PROP_SCREEN_TINT) : (p.lamp ?? (PROP_LAMP_TINT as Record<string, [number, number, number] | undefined>)[p.prop] ?? PROP_LAMP_TINT.default);
      r = t[0];
      g = t[1];
      b = t[2];
      k = (screen ? PROP_SCREEN_GAIN : PROP_LAMP_GAIN) * (p.group === undefined || !this.reg || this.groupLit(p.group) ? 1 : PROP_DARK);
    }
    out[o] = r * k;
    out[o + 1] = g * k;
    out[o + 2] = b * k;
    out[o + 3] = 1;
  }

  /** A thin-instanced draw's instance colours (allocation-free). */
  fill(d: Draw): void {
    const c = d.colors;
    if (!c) return;
    for (let n = 0; n < d.idx.length; n++) this.instColor(this.placements[d.idx[n]!]!, d.cat, d.mat, c, n * 4);
  }

  private paint(d: Draw): void {
    this.fill(d);
    d.mesh.thinInstanceBufferUpdated('color');
  }

  /** A merged emissive draw's vertex colours, each instance's colour over its vertices (allocation-free). */
  private repaint(mesh: Mesh, p: Paint): void {
    const c = p.colors;
    const rgb = this.rgb;
    for (let n = 0; n < p.idx.length; n++) {
      this.instColor(this.placements[p.idx[n]!]!, p.cats[n]!, p.mat, rgb, 0);
      for (let v = p.vstart[n]!; v < p.vstart[n + 1]!; v++) {
        c[v * 4] = rgb[0]!;
        c[v * 4 + 1] = rgb[1]!;
        c[v * 4 + 2] = rgb[2]!;
        c[v * 4 + 3] = 1;
      }
    }
    mesh.getVertexBuffer(VertexBuffer.ColorKind)?.update(c);
  }

  /** Per render frame: the grouped emissives on a registry change, and the indoor far cull when the camera has moved
   *  (both allocation-free). */
  frame(): void {
    this.farCull();
    if (!this.reg || this.reg.version === this.regVersion) return;
    this.regVersion = this.reg.version;
    for (let i = 0; i < this.draws.length; i++) {
      const d = this.draws[i]!;
      if (d.grouped) this.paint(d);
    }
    for (let i = 0; i < this.merged.length; i++) {
      const m = this.merged[i]!;
      if (m.paint?.grouped) this.repaint(m.mesh, m.paint);
    }
  }

  /** (perfa) Indoor draws off past `ART_FAR` (plan distance to their bounds) from the active camera, on again inside
   *  `ART_FAR - ART_FAR_HYST`; re-run only when the camera has moved `ART_FAR_STEP`. */
  private farCull(): void {
    const n = this.cull.length;
    const cam = this.scene.activeCamera;
    if (!n || !cam) return;
    const g = cam.globalPosition;
    this.farCullAt(g.x, g.z, false);
  }

  /** The far cull for a camera at (x, z) (`force`: whatever the step). */
  farCullAt(x: number, z: number, force: boolean): void {
    const dx0 = x - this.camX;
    const dz0 = z - this.camZ;
    if (!force && dx0 * dx0 + dz0 * dz0 < ART_FAR_STEP * ART_FAR_STEP) return;
    this.camX = x;
    this.camZ = z;
    const box = this.cullBox;
    for (let i = 0; i < this.cull.length; i++) {
      const dx = Math.max(box[i * 4]! - x, 0, x - box[i * 4 + 2]!);
      const dz = Math.max(box[i * 4 + 1]! - z, 0, z - box[i * 4 + 3]!);
      const d2 = dx * dx + dz * dz;
      const on = this.cullOn[i] === 1;
      const lim = on ? ART_FAR : ART_FAR - ART_FAR_HYST;
      const want = d2 <= lim * lim;
      if (want !== on) {
        this.cullOn[i] = want ? 1 : 0;
        this.cull[i]!.setEnabled(want);
      }
    }
  }

  /** A thin-instanced draw's per-instance colours by mesh name (tests). */
  colorsOf(name: string): Float32Array | null {
    return this.draws.find((d) => d.mesh.name === name)?.colors ?? null;
  }

  /** A placement's emissive colour (rgb) in whichever draw holds it, or null (tests). */
  colorOf(placement: number, mat: string): [number, number, number] | null {
    for (const d of this.draws) {
      if (!d.colors || d.mat !== mat) continue;
      const n = d.idx.indexOf(placement);
      if (n >= 0) return [d.colors[n * 4]!, d.colors[n * 4 + 1]!, d.colors[n * 4 + 2]!];
    }
    for (const m of this.merged) {
      const p = m.paint;
      if (!p || p.mat !== mat) continue;
      const n = p.idx.indexOf(placement);
      if (n >= 0) {
        const v = p.vstart[n]! * 4;
        return [p.colors[v]!, p.colors[v + 1]!, p.colors[v + 2]!];
      }
    }
    return null;
  }

  /** Every art mesh: the thin-instanced draws, then the merged ones. */
  meshes(): Mesh[] {
    return [...this.draws.map((d) => d.mesh), ...this.merged.map((m) => m.mesh)];
  }

  /** Every draw with its kind, instance count, triangles, caster and far-cull flags (perf probe, tests). */
  probe(): { name: string; section: number; kind: 'merged' | 'emissive' | 'caster' | 'alpha' | 'inst'; instances: number; tris: number; caster: boolean; indoor: boolean }[] {
    const out: ReturnType<CampusArtRender['probe']> = [];
    for (const d of this.draws) {
      out.push({ name: d.mesh.name, section: d.section, kind: d.look.alpha !== undefined ? 'alpha' : 'inst', instances: d.idx.length, tris: d.tris, caster: d.caster, indoor: d.indoor });
    }
    for (const m of this.merged) out.push({ name: m.mesh.name, section: m.section, kind: m.kind, instances: m.paint ? m.paint.idx.length : 1, tris: m.tris, caster: m.kind === 'caster', indoor: m.indoor });
    return out;
  }

  /** Draws and triangles drawn (all instances), in total and per section (index = section; connectors (-1) count in the total only). */
  counts(): { draws: number; tris: number; perSection: { draws: number; tris: number }[] } {
    const per = [0, 1, 2, 3, 4].map(() => ({ draws: 0, tris: 0 }));
    let draws = 0;
    let tris = 0;
    for (const x of [...this.draws, ...this.merged]) {
      draws++;
      tris += x.tris;
      const s = per[x.section];
      if (s) {
        s.draws++;
        s.tris += x.tris;
      }
    }
    return { draws, tris, perSection: per };
  }

  dispose(): void {
    if (this.observer) this.scene.onBeforeRenderObservable.remove(this.observer);
    this.observer = null;
    for (const d of this.draws) d.mesh.dispose();
    for (const m of this.merged) m.mesh.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.draws = [];
    this.merged = [];
    this.cull = [];
    this.materials.clear();
  }
}
