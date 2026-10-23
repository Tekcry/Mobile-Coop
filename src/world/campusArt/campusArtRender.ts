/**
 * Draws the campus art (sector-redesign ART-KIT step 6; render side only, gameplay never reads it). Based on marlow-final's
 * `props/propRender.ts` (unedited): the catalogues' GLBs (the facility props through `propsUrl()`, `campus-kit.glb`, the
 * section heroes `hero-s<N>.glb`) read once in parallel with the operators' GLB reader; one material per material name
 * (the merged look table: PBR lit by the baked lamps as the level; the emissive materials unlit, coloured per instance).
 *
 * Draws (ART-PLAN 3, "Draws"):
 * - the static opaque meshes (not emissive, not alpha, not a box-hidden skin) are baked into one mesh per (section,
 *   material) (`kit/staticMerge.ts`), frozen, with their own bounds, so another building's art culls;
 * - the rest (emissive, alpha, box-hidden skins) are one thin-instanced mesh per (catalogue, section, piece, material),
 *   bounds refreshed once; screens and lamps coloured per instance, on their light circuit (`group`: dim to `PROP_DARK`
 *   while no lamp of the group is on, repainted when the registry changes, allocation-free); own-supply emissives (exit
 *   signs) at their own colour and gain, never dimmed;
 * - no art mesh casts a shadow (the boxes under the props cast, as the bake has them) except the box-hidden skins, which
 *   stand in for the box they hide (`addCaster`); `BuiltLevel.hidePieces` then hides those boxes' drawn instances, after
 *   the art is ready (a failed load never hides a box: the greybox shows).
 */
import { Color3, Mesh, PBRMaterial, StandardMaterial, VertexData, type AbstractMesh, type Material, type Observer, type Scene } from '../../core/babylon';
import { parseGlb, type GlbMesh, type GlbModel } from '../../operators/lab/glb';
import { markLampLevel } from '../bakedLamps';
import { bakedMesh } from '../kit/kitRender';
import { markDrawFirst, useSkinsFirst, type BakePart } from '../kit/staticMerge';
import type { LightRegistry } from '../lights';
import type { BuiltLevel } from '../levelBuilder';
import { propsUrl } from '../props/propRender';
import { PROP_DARK, PROP_LAMP_GAIN, PROP_LAMP_TINT, PROP_SCREEN_GAIN, PROP_SCREEN_TINT } from '../props/facilityProps';
import { campusCatalogues, type CampusArtLayout } from '../maps/campusDress';
import { artMatrix, mergedLook, type ArtLook, type ArtPlacement, type CatalogueSet, type PropCatalogue } from './catalogue';

const FILES = import.meta.glob<string>('./assets/*.glb', { query: '?url', import: 'default', eager: true });

/** The bundled URL of a campus art GLB by file name ('' when it is missing). */
export function campusArtUrl(file: string): string {
  for (const [p, url] of Object.entries(FILES)) if (p.endsWith(`/${file}`)) return url;
  return '';
}

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
}

interface Merged {
  mesh: Mesh;
  section: number;
  tris: number;
}

export class CampusArtRender {
  private draws: Draw[] = [];
  private merged: Merged[] = [];
  private materials = new Map<string, Material>();
  private observer: Observer<Scene> | null = null;
  private regVersion = -1;

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
      if (r.draws.some((d) => d.grouped) && reg) r.observer = scene.onBeforeRenderObservable.add(() => r.frame());
      r.frame();
    } catch (e) {
      r.dispose();
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
    const statics = new Map<string, { section: number; mat: string; look: ArtLook; parts: BakePart[] }>();
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
        // split by section, and the box-hidden skins (casters) from the rest
        const groups = new Map<string, number[]>();
        for (const i of list) {
          const p = this.placements[i]!;
          const key = `${p.section}|${p.cls === 'skin-hide' ? 'c' : ''}`;
          let l = groups.get(key);
          if (!l) groups.set(key, (l = []));
          l.push(i);
        }
        for (const [key, ids] of groups) {
          const section = Number(key.split('|')[0]);
          const caster = key.endsWith('c');
          if (mergedLook(look) && !caster) {
            const matrices = new Float32Array(ids.length * 16);
            ids.forEach((i, n) => artMatrix(this.placements[i]!, matrices, n * 16));
            const sk = `${section}|${mat}`;
            let s = statics.get(sk);
            if (!s) statics.set(sk, (s = { section, mat, look, parts: [] }));
            s.parts.push({ geo: g, matrices, count: ids.length });
            continue;
          }
          this.draws.push(this.instanced(cat, g, mat, look, section, ids, caster, addCaster));
        }
      }
    }
    for (const s of statics.values()) {
      const mesh = bakedMesh(this.scene, `campus-static.${s.section}.${s.mat}`, s.parts, this.material(s.mat, s.look));
      mesh.alwaysSelectAsActiveMesh = false;
      let tris = 0;
      for (const p of s.parts) tris += (p.geo.indices.length / 3) * p.count;
      this.merged.push({ mesh, section: s.section, tris });
    }
  }

  private instanced(cat: PropCatalogue, g: GlbMesh, mat: string, look: ArtLook, section: number, ids: number[], caster: boolean, addCaster: (m: AbstractMesh) => void): Draw {
    const mesh = new Mesh(`campus-${cat.id}.${section}.${g.name}${caster ? '.c' : ''}`, this.scene);
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
    const d: Draw = { mesh, section, mat, look, cat, idx, colors, grouped: grouped && !!colors && !cat.ownSupply?.[mat], tris: (g.indices.length / 3) * idx.length };
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

  /** A draw's instance colours (allocation-free): screens tinted, lamps tinted, own-supply at their colour, the grouped
   *  ones dimmed while their circuit is cut. */
  fill(d: Draw): void {
    const c = d.colors;
    if (!c) return;
    const own = d.cat.ownSupply?.[d.mat];
    const screen = d.mat === 'screen';
    for (let n = 0; n < d.idx.length; n++) {
      const p = this.placements[d.idx[n]!]!;
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
        const t = screen ? (p.tint ?? PROP_SCREEN_TINT) : (p.lamp ?? (PROP_LAMP_TINT as Record<string, [number, number, number] | undefined>)[p.prop] ?? PROP_LAMP_TINT.default);
        r = t[0];
        g = t[1];
        b = t[2];
        k = (screen ? PROP_SCREEN_GAIN : PROP_LAMP_GAIN) * (p.group === undefined || !this.reg || this.groupLit(p.group) ? 1 : PROP_DARK);
      }
      c[n * 4] = r * k;
      c[n * 4 + 1] = g * k;
      c[n * 4 + 2] = b * k;
      c[n * 4 + 3] = 1;
    }
  }

  private paint(d: Draw): void {
    this.fill(d);
    d.mesh.thinInstanceBufferUpdated('color');
  }

  /** Per render frame: the grouped emissives on a registry change (allocation-free). */
  frame(): void {
    if (!this.reg || this.reg.version === this.regVersion) return;
    this.regVersion = this.reg.version;
    for (let i = 0; i < this.draws.length; i++) {
      const d = this.draws[i]!;
      if (d.grouped) this.paint(d);
    }
  }

  /** A draw's per-instance colours by mesh name (tests). */
  colorsOf(name: string): Float32Array | null {
    return this.draws.find((d) => d.mesh.name === name)?.colors ?? null;
  }

  /** Every art mesh: the thin-instanced draws, then the merged statics. */
  meshes(): Mesh[] {
    return [...this.draws.map((d) => d.mesh), ...this.merged.map((m) => m.mesh)];
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
    this.materials.clear();
  }
}
