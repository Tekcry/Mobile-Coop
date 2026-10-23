/**
 * Draws a set's props (marlow-final M5 / A6; render side only, gameplay never reads it): the bundled props GLB
 * (scripts/facility-props, `npm run props:build`) read once with the operators' GLB reader, one thin-instanced mesh per
 * (prop, material) holding every placement of that prop (`facilityProps.ts` `propMatrix`), materials from `PROP_LOOK`
 * (PBR, lit by the baked lamps like the level; screens and lamps unlit emissive, coloured per instance). (S9 perf) The
 * static opaque pairs (not the screens, lamps, see-through mesh / glass, or a prop that follows a door) are baked into one
 * mesh per material (`kit/staticMerge.ts`: `prop-static.<material>`), drawn ahead of the level boxes inside them
 * (`skinsFirst`); the see-through materials are back-face culled (one face of a closed slab per pixel). Props are not
 * shadow casters: the gameplay boxes under them cast (the canonical light shapes), so the picture's shadows match the
 * bake. Per frame (allocation-free) only the strongroom leaves move, following their `Door`'s drawn swing. (S3-7 S1, light
 * parity) A placement's emissives follow its light circuit (`PropPlacement.group`: dim while no lamp of the group is on,
 * repainted when the registry changes, as the kit's LED lines) and its powered device (`PropPlacement.device`, `setDevice`:
 * the beam tower's lens while its beams are off; (marlow-polish P3-1) a lamp with `lampOff` shows that colour lit while
 * its device is off instead of dimming: A6's interlock lamp, red / green on a course flag); the emissive pieces stay
 * thin-instanced (colour per instance).
 */
import { Color3, Mesh, PBRMaterial, StandardMaterial, VertexData, type Material, type Observer, type Scene } from '../../core/babylon';
import { parseGlb, type GlbMesh, type GlbModel } from '../../operators/lab/glb';
import { markLampLevel } from '../bakedLamps';
import { bakedMesh } from '../kit/kitRender';
import { markDrawFirst, useSkinsFirst, type BakePart } from '../kit/staticMerge';
import { DOOR, leafFraction, type DoorState } from '../doors';
import type { LightRegistry } from '../lights';
import {
  PROP_LAMP_GAIN,
  PROP_DARK,
  PROP_LAMP_TINT,
  PROP_LOOK,
  PROP_SCREEN_GAIN,
  PROP_SCREEN_TINT,
  VAULT_SWING_SIGN,
  propMatrix,
  type PropMaterial,
  type PropPlacement,
} from './facilityProps';

const FILES = import.meta.glob<string>('./assets/*.glb', { query: '?url', import: 'default', eager: true });

/** The bundled props GLB's URL ('' when it is missing). */
export function propsUrl(): string {
  for (const [p, url] of Object.entries(FILES)) if (p.endsWith('/facility-props.glb')) return url;
  return '';
}

interface PropDraw {
  mesh: Mesh;
  mat: PropMaterial;
  /** Placement indices drawn by this mesh, in instance order. */
  idx: Int32Array;
  matrices: Float32Array;
  colors: Float32Array | null;
  /** Some instance follows a door (its matrix buffer is dynamic). */
  moving: boolean;
}

export class PropRender {
  private draws: PropDraw[] = [];
  /** (S9 perf) The static opaque props, one baked mesh per material. */
  private merged: Mesh[] = [];
  private materials: Material[] = [];
  private observer: Observer<Scene> | null = null;
  /** Per placement: the door state it follows (null: none) and its last drawn swing (-1: never drawn). */
  private doorOf: (DoorState | null)[];
  private swing: Float32Array;
  private scratch: PropPlacement = { prop: 'vaultLeaf', x: 0, y: 0, z: 0, yaw: 0 };
  /** Registry version last painted (-1: never) and whether any placement is grouped (the frame observer repaints on a change). */
  private regVersion = -1;
  private grouped: boolean;
  /** Devices that are off (`setDevice`), by id; a device never set is on. */
  private deviceOff = new Set<string>();

  private constructor(
    private scene: Scene,
    private placements: readonly PropPlacement[],
    doors: readonly DoorState[],
    private reg: LightRegistry | null,
  ) {
    this.grouped = !!reg && placements.some((p) => p.group !== undefined);
    // only the strongroom leaf follows a door, and it swings (a hinged leaf): a prop tied to a sliding door would have
    // to translate as kitRender's leaves do, which no prop needs yet (PROPS.md section 6)
    this.doorOf = placements.map((p) => (p.door === undefined || p.prop !== 'vaultLeaf' ? null : (doors.find((d) => d.anchor.id === p.door) ?? null)));
    this.swing = new Float32Array(placements.length).fill(-1);
  }

  /** Loads the props GLB and builds the draws (`doors`: the map's door states, for the strongroom leaves). */
  static async create(scene: Scene, placements: readonly PropPlacement[], doors: readonly DoorState[] = [], reg: LightRegistry | null = null): Promise<PropRender> {
    const url = propsUrl();
    if (!url) throw new Error('facility props GLB missing (npm run props:build)');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`facility props GLB: HTTP ${res.status}`);
    return PropRender.fromModel(scene, parseGlb(await res.arrayBuffer()), placements, doors, reg);
  }

  /** The draws from a read props GLB (`create` after its fetch; tests on a NullEngine). */
  static fromModel(scene: Scene, model: GlbModel, placements: readonly PropPlacement[], doors: readonly DoorState[] = [], reg: LightRegistry | null = null): PropRender {
    const r = new PropRender(scene, placements, doors, reg);
    if (scene.isDisposed) return r;
    useSkinsFirst(scene);
    r.build(model.meshes);
    if (r.grouped || r.doorOf.some((d) => d)) r.observer = scene.onBeforeRenderObservable.add(() => r.frame());
    r.frame();
    return r;
  }

  private material(mat: PropMaterial): Material {
    const name = `prop-${mat}`;
    const have = this.materials.find((m) => m.name === name);
    if (have) return have;
    const look = PROP_LOOK[mat];
    let m: Material;
    if (look.emissive) {
      // as the kit's LED lines: unlit, the instance colour is the glow
      const sm = new StandardMaterial(name, this.scene);
      sm.disableLighting = true;
      sm.diffuseColor = Color3.Black();
      sm.specularColor = Color3.Black();
      sm.emissiveColor = Color3.White();
      m = sm;
    } else {
      const pm = new PBRMaterial(name, this.scene);
      pm.albedoColor = Color3.FromHexString(look.color).toLinearSpace();
      pm.metallic = look.metallic;
      pm.roughness = look.roughness;
      // as the level material: range falloff, PBR's pi divide undone, lit by the baked lamps as level
      pm.usePhysicalLightFalloff = false;
      pm.directIntensity = Math.PI;
      pm.environmentIntensity = 0.6;
      pm.realTimeFiltering = true;
      markLampLevel(pm);
      if (look.alpha !== undefined) {
        pm.alpha = look.alpha;
        pm.transparencyMode = PBRMaterial.PBRMATERIAL_ALPHABLEND;
        // (S9 perf) closed slabs: the front face only (as the kit's glass)
        pm.backFaceCulling = true;
        pm.twoSidedLighting = true;
      } else {
        markDrawFirst(pm);
      }
      m = pm;
    }
    m.freeze();
    this.materials.push(m);
    return m;
  }

  private build(meshes: readonly GlbMesh[]): void {
    const statics = new Map<PropMaterial, BakePart[]>();
    for (const g of meshes) {
      const dot = g.name.indexOf('.');
      const prop = g.name.slice(0, dot);
      const mat = g.name.slice(dot + 1) as PropMaterial;
      if (!(mat in PROP_LOOK)) continue;
      const list: number[] = [];
      this.placements.forEach((p, i) => {
        if (p.prop === prop) list.push(i);
      });
      if (!list.length) continue;
      const look = PROP_LOOK[mat];
      // (S9 perf) static, opaque, one colour: baked with the rest of its material below
      if (!look.emissive && look.alpha === undefined && !list.some((i) => this.doorOf[i])) {
        const matrices = new Float32Array(list.length * 16);
        for (let n = 0; n < list.length; n++) propMatrix(this.placements[list[n]!]!, matrices, n * 16);
        let parts = statics.get(mat);
        if (!parts) statics.set(mat, (parts = []));
        parts.push({ geo: g, matrices, count: list.length });
        continue;
      }
      const idx = Int32Array.from(list);
      const mesh = new Mesh(`prop-${g.name}`, this.scene);
      const vd = new VertexData();
      vd.positions = g.positions;
      vd.normals = g.normals;
      vd.indices = g.indices as unknown as number[];
      vd.applyToMesh(mesh, false);
      mesh.material = this.material(mat);
      mesh.isPickable = false;
      const emissive = !!PROP_LOOK[mat].emissive;
      mesh.receiveShadows = !emissive;
      const matrices = new Float32Array(idx.length * 16);
      for (let n = 0; n < idx.length; n++) propMatrix(this.placements[idx[n]!]!, matrices, n * 16);
      const moving = list.some((i) => this.doorOf[i]);
      mesh.thinInstanceSetBuffer('matrix', matrices, 16, !moving);
      let colors: Float32Array | null = null;
      if (emissive) {
        colors = new Float32Array(idx.length * 4);
        mesh.thinInstanceSetBuffer('color', colors, 4, false);
      }
      mesh.thinInstanceRefreshBoundingInfo(false);
      mesh.freezeWorldMatrix();
      if (!moving) mesh.doNotSyncBoundingInfo = true;
      const d: PropDraw = { mesh, mat, idx, matrices, colors, moving };
      this.draws.push(d);
      if (colors) this.paint(d);
    }
    for (const [mat, parts] of statics) this.merged.push(bakedMesh(this.scene, `prop-static.${mat}`, parts, this.material(mat)));
  }

  /** Lit share of a lamp circuit: any of its lamps on and not shot out (a lampless group is dark, as the kit's). */
  private groupLit(group: number): boolean {
    const ls = this.reg!.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (l.group === group && l.on && !l.destroyed) return true;
    }
    return false;
  }

  /** Is the placement's emissive lit now: its circuit has a lamp on (when the registry is known) and its device is on. */
  private litNow(p: PropPlacement): boolean {
    if (p.device !== undefined && this.deviceOff.has(p.device)) return false;
    return p.group === undefined || !this.reg || this.groupLit(p.group);
  }

  private paint(d: PropDraw): void {
    const c = d.colors;
    if (!c) return;
    for (let n = 0; n < d.idx.length; n++) {
      const p = this.placements[d.idx[n]!]!;
      const screen = d.mat === 'screen';
      // (P3-1) a status lamp with an off colour shows it, lit, while its device is off (still dimmed by its circuit)
      const offLamp = !screen && p.lampOff !== undefined && p.device !== undefined && this.deviceOff.has(p.device);
      const t = screen ? (p.tint ?? PROP_SCREEN_TINT) : offLamp ? p.lampOff! : (p.lamp ?? PROP_LAMP_TINT[p.prop] ?? PROP_LAMP_TINT.default);
      const lit = offLamp ? p.group === undefined || !this.reg || this.groupLit(p.group) : this.litNow(p);
      const k = (screen ? PROP_SCREEN_GAIN : PROP_LAMP_GAIN) * (lit ? 1 : PROP_DARK);
      c[n * 4] = t[0] * k;
      c[n * 4 + 1] = t[1] * k;
      c[n * 4 + 2] = t[2] * k;
      c[n * 4 + 3] = 1;
    }
    d.mesh.thinInstanceBufferUpdated('color');
  }

  /** A device's state on its prop (placement index `i`): new screen and / or lamp colours (allocation-free; the arrays
   *  are kept by reference on the placement). */
  setTint(i: number, screen?: [number, number, number], lamp?: [number, number, number]): void {
    const p = this.placements[i] as PropPlacement | undefined;
    if (!p) return;
    if (screen) p.tint = screen;
    if (lamp) p.lamp = lamp;
    for (const d of this.draws) {
      if (!d.colors || (d.mat === 'screen' ? !screen : !lamp)) continue;
      for (let n = 0; n < d.idx.length; n++) {
        if (d.idx[n] === i) {
          this.paint(d);
          break;
        }
      }
    }
  }

  /** A powered device's state (`PropPlacement.device`: a laser id, or a course flag's device, P3-1): its props' emissives go
   *  dark while it is off, except a lamp with `lampOff`, which shows that colour lit instead (a red / green status lamp;
   *  render only; the caller reads the device's own state, never the reverse). Allocation-free. */
  setDevice(id: string, on: boolean): void {
    if (on === !this.deviceOff.has(id)) return;
    if (on) this.deviceOff.delete(id);
    else this.deviceOff.add(id);
    for (const d of this.draws) {
      if (!d.colors) continue;
      for (let n = 0; n < d.idx.length; n++) {
        if (this.placements[d.idx[n]!]!.device === id) {
          this.paint(d);
          break;
        }
      }
    }
  }

  /** Every grouped emissive repainted against the registry (on a version change). */
  private repaintGroups(): void {
    for (const d of this.draws) {
      if (!d.colors) continue;
      for (let n = 0; n < d.idx.length; n++) {
        if (this.placements[d.idx[n]!]!.group !== undefined) {
          this.paint(d);
          break;
        }
      }
    }
  }

  /** Per render frame: grouped emissives on a light registry change; the strongroom leaves follow their door's drawn swing (only while it changes). */
  frame(): void {
    if (this.grouped && this.reg!.version !== this.regVersion) {
      this.regVersion = this.reg!.version;
      this.repaintGroups();
    }
    let moved = false;
    for (let i = 0; i < this.doorOf.length; i++) {
      const ds = this.doorOf[i];
      if (!ds) continue;
      const f = leafFraction(ds);
      if (f !== this.swing[i]) {
        this.swing[i] = f;
        moved = true;
      }
    }
    if (!moved) return;
    const s = this.scratch;
    for (const d of this.draws) {
      if (!d.moving) continue;
      for (let n = 0; n < d.idx.length; n++) {
        const i = d.idx[n]!;
        const p = this.placements[i]!;
        s.x = p.x;
        s.y = p.y;
        s.z = p.z;
        s.yaw = p.yaw + VAULT_SWING_SIGN * DOOR.openAngle * Math.max(0, this.swing[i]!);
        propMatrix(s, d.matrices, n * 16);
      }
      d.mesh.thinInstanceBufferUpdated('matrix');
      d.mesh.thinInstanceRefreshBoundingInfo(false);
    }
  }

  /** A draw's per-instance colours (screen and lamp meshes; null otherwise) by mesh name (tests). */
  colorsOf(name: string): Float32Array | null {
    return this.draws.find((d) => d.mesh.name === name)?.colors ?? null;
  }

  /** A draw's instance matrices (16 floats each) by mesh name (tests). */
  matricesOf(name: string): Float32Array | null {
    return this.draws.find((d) => d.mesh.name === name)?.matrices ?? null;
  }

  /** Every prop mesh: the thin-instanced draws, then the baked static ones (tests and the debug overlay count draws). */
  get meshes(): Mesh[] {
    return [...this.draws.map((d) => d.mesh), ...this.merged];
  }

  dispose(): void {
    if (this.observer) this.scene.onBeforeRenderObservable.remove(this.observer);
    this.observer = null;
    for (const d of this.draws) d.mesh.dispose();
    for (const m of this.merged) m.dispose();
    for (const m of this.materials) m.dispose();
    this.draws = [];
    this.merged = [];
    this.materials = [];
  }
}
