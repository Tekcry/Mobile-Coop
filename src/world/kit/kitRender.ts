/**
 * Draws a map's facility kit (marlow-final M5; render side only, gameplay never reads it): the bundled kit GLB
 * (scripts/facility-kit, `npm run kit:build`) read once with the operators' GLB reader, one thin-instanced mesh per
 * (piece, material) holding every instance of that piece (`facilityKit.ts` `kitMatrix`), materials from `KIT_LOOK`
 * (PBR, lit by the baked lamps like the level; LEDs unlit emissive, coloured per instance). (S9 perf) The static opaque
 * pairs (every piece but the sliding leaves; not the LEDs, status bars or glass) are baked into one mesh per material
 * (`staticMerge.ts`: `kit-static.<material>`), and the kit's opaque materials draw ahead of the level boxes they clad
 * (`skinsFirst`). Glass is back-face culled: one face of the slab per pixel. The skins are not shadow
 * casters: the gameplay boxes under them cast (the canonical light shapes), so the picture's shadows match the bake.
 * Per frame (allocation-free) the sliding doors' leaves follow their `DoorState` (`slideFraction`), the frames' status
 * bars their lock, and on a light registry change the grouped LED lines their circuit.
 */
import { Color3, Mesh, PBRMaterial, StandardMaterial, VertexData, type AbstractMesh, type Material, type Observer, type Scene } from '../../core/babylon';
import { parseGlb, type GlbMesh, type GlbModel } from '../../operators/lab/glb';
import { markLampLevel } from '../bakedLamps';
import type { DoorState } from '../doors';
import type { LightRegistry } from '../lights';
import { KIT_LOOK, LED_GAIN, LED_TONES, STATUS_LOCKED, STATUS_OPEN, kitMatrix, leafAlong, slideFraction, type KitInstance, type KitLayout, type KitMaterial } from './facilityKit';
import { bakeParts, markDrawFirst, useSkinsFirst, type BakePart } from './staticMerge';

const FILES = import.meta.glob<string>('./assets/*.glb', { query: '?url', import: 'default', eager: true });

/** The bundled kit GLB's URL ('' when it is missing). */
export function kitUrl(): string {
  for (const [p, url] of Object.entries(FILES)) if (p.endsWith('/facility-kit.glb')) return url;
  return '';
}

/** An unlit LED line out of its circuit: a faint glow, as a dead fitting's face. */
const LED_DARK = 0.06;

interface KitDraw {
  mesh: Mesh;
  mat: KitMaterial;
  list: KitInstance[];
  matrices: Float32Array;
  colors: Float32Array | null;
}

export class KitRender {
  private draws: KitDraw[] = [];
  /** (S9 perf) The static opaque pieces, one baked mesh per material. */
  private merged: Mesh[] = [];
  private materials: Material[] = [];
  private observer: Observer<Scene> | null = null;
  /** Per kit door: its state (null: the anchor is missing), its last drawn travel and lock. */
  private doorState: (DoorState | null)[] = [];
  private slide: Float32Array;
  private locked: Int8Array;
  private regVersion = -1;
  private scratch: KitInstance = { piece: 'doorLeaf', x: 0, y: 0, z: 0, yaw: 0, sx: 1, sy: 1, sz: 1, tone: 'warm' };

  private constructor(
    private scene: Scene,
    private layout: KitLayout,
    private reg: LightRegistry,
    doors: readonly DoorState[],
  ) {
    this.doorState = layout.doors.map((k) => doors.find((d) => d.anchor.id === k.door) ?? null);
    this.slide = new Float32Array(layout.doors.length).fill(-1);
    this.locked = new Int8Array(layout.doors.length).fill(-1);
  }

  /** Loads the kit GLB and builds the draws (`addCaster`: the flashlights' shadow list, for the shut sliding leaves). */
  static async create(scene: Scene, layout: KitLayout, doors: readonly DoorState[], reg: LightRegistry, addCaster: (m: AbstractMesh) => void): Promise<KitRender> {
    const url = kitUrl();
    if (!url) throw new Error('facility kit GLB missing (npm run kit:build)');
    const res = await fetch(url);
    if (!res.ok) throw new Error(`facility kit GLB: HTTP ${res.status}`);
    return KitRender.fromModel(scene, parseGlb(await res.arrayBuffer()), layout, doors, reg, addCaster);
  }

  /** The draws from a read kit GLB (`create` after its fetch; tests on a NullEngine). */
  static fromModel(scene: Scene, model: GlbModel, layout: KitLayout, doors: readonly DoorState[], reg: LightRegistry, addCaster: (m: AbstractMesh) => void): KitRender {
    const k = new KitRender(scene, layout, reg, doors);
    if (scene.isDisposed) return k;
    useSkinsFirst(scene);
    k.build(model.meshes, addCaster);
    k.observer = scene.onBeforeRenderObservable.add(() => k.frame());
    k.frame();
    return k;
  }

  private material(mat: KitMaterial): Material {
    const name = `kit-${mat}`;
    const have = this.materials.find((m) => m.name === name);
    if (have) return have;
    const look = KIT_LOOK[mat];
    let m: Material;
    if (look.emissive) {
      // as the light fittings' faces (LightRig): unlit, the instance colour is the glow
      const sm = new StandardMaterial(name, this.scene);
      sm.disableLighting = true;
      sm.diffuseColor = Color3.Black();
      sm.specularColor = Color3.Black();
      sm.emissiveColor = Color3.White();
      sm.backFaceCulling = false;
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
        // (S9 perf) the glass is a closed slab: its front face only (both faces cost two full lit shades a pixel, and
        // with depth writes on the far face showed only where its triangles came first - a side- and half-dependent tint)
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

  private build(meshes: readonly GlbMesh[], addCaster: (m: AbstractMesh) => void): void {
    const statics = new Map<KitMaterial, BakePart[]>();
    for (const g of meshes) {
      const dot = g.name.indexOf('.');
      const piece = g.name.slice(0, dot);
      const mat = g.name.slice(dot + 1) as KitMaterial;
      if (!(mat in KIT_LOOK)) continue;
      const list = this.layout.instances.filter((i) => i.piece === piece && !(mat === 'led' && i.noLed));
      if (!list.length) continue;
      const look = KIT_LOOK[mat];
      // (S9 perf) static, opaque, one colour: baked with the rest of its material below
      if (piece !== 'doorLeaf' && !look.emissive && look.alpha === undefined) {
        const matrices = new Float32Array(list.length * 16);
        list.forEach((inst, n) => kitMatrix(inst, matrices, n * 16));
        let parts = statics.get(mat);
        if (!parts) statics.set(mat, (parts = []));
        parts.push({ geo: g, matrices, count: list.length });
        continue;
      }
      const mesh = new Mesh(`kit-${g.name}`, this.scene);
      const vd = new VertexData();
      vd.positions = g.positions;
      vd.normals = g.normals;
      vd.indices = g.indices as unknown as number[];
      vd.applyToMesh(mesh, false);
      mesh.material = this.material(mat);
      mesh.isPickable = false;
      const emissive = !!KIT_LOOK[mat].emissive;
      mesh.receiveShadows = !emissive;
      const matrices = new Float32Array(list.length * 16);
      list.forEach((inst, n) => kitMatrix(inst, matrices, n * 16));
      const dynamic = piece === 'doorLeaf';
      mesh.thinInstanceSetBuffer('matrix', matrices, 16, !dynamic);
      let colors: Float32Array | null = null;
      if (emissive) {
        colors = new Float32Array(list.length * 4);
        mesh.thinInstanceSetBuffer('color', colors, 4, false);
      }
      mesh.thinInstanceRefreshBoundingInfo(false);
      mesh.freezeWorldMatrix();
      if (!dynamic) mesh.doNotSyncBoundingInfo = true;
      // the shut leaves stop flashlights as the hinged leaf did (the door body cuts the lamps in the light field)
      if (dynamic && mat === 'composite') addCaster(mesh);
      this.draws.push({ mesh, mat, list, matrices, colors });
    }
    for (const [mat, parts] of statics) this.merged.push(bakedMesh(this.scene, `kit-static.${mat}`, parts, this.material(mat)));
  }

  /** Lit share of a lamp circuit: any of its lamps on and not shot out. */
  private groupLit(group: number): boolean {
    const ls = this.reg.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (l.group === group && l.on && !l.destroyed) return true;
    }
    return false;
  }

  private paintLeds(): void {
    for (const d of this.draws) {
      if (d.mat !== 'led' || !d.colors) continue;
      const c = d.colors;
      for (let n = 0; n < d.list.length; n++) {
        const inst = d.list[n]!;
        const k = inst.group === undefined || this.groupLit(inst.group) ? LED_GAIN : LED_DARK;
        const t = LED_TONES[inst.tone];
        c[n * 4] = t[0] * k;
        c[n * 4 + 1] = t[1] * k;
        c[n * 4 + 2] = t[2] * k;
        c[n * 4 + 3] = 1;
      }
      d.mesh.thinInstanceBufferUpdated('color');
    }
  }

  private paintStatus(): void {
    const doors = this.layout.doors;
    for (const d of this.draws) {
      if (d.mat !== 'status' || !d.colors) continue;
      const c = d.colors;
      for (let n = 0; n < d.list.length; n++) {
        const id = d.list[n]!.door;
        let k = -1;
        for (let j = 0; j < doors.length; j++) if (doors[j]!.door === id) k = j;
        const t = k >= 0 && this.locked[k] === 1 ? STATUS_LOCKED : STATUS_OPEN;
        c[n * 4] = t[0] * LED_GAIN;
        c[n * 4 + 1] = t[1] * LED_GAIN;
        c[n * 4 + 2] = t[2] * LED_GAIN;
        c[n * 4 + 3] = 1;
      }
      d.mesh.thinInstanceBufferUpdated('color');
    }
  }

  private writeLeaves(): void {
    const doors = this.layout.doors;
    const s = this.scratch;
    for (const d of this.draws) {
      if (d.list[0]?.piece !== 'doorLeaf') continue;
      for (let n = 0; n < d.list.length; n++) {
        const inst = d.list[n]!;
        let k = -1;
        for (let j = 0; j < doors.length; j++) if (doors[j]!.door === inst.door) k = j;
        const kd = k >= 0 ? doors[k]! : null;
        if (!kd) continue;
        const along = leafAlong(kd.width, inst.side ?? 1, Math.max(0, this.slide[k]!));
        s.x = kd.x + along * Math.cos(kd.yaw);
        s.y = inst.y;
        s.z = kd.z - along * Math.sin(kd.yaw);
        s.yaw = inst.yaw;
        s.sx = inst.sx;
        s.sy = inst.sy;
        s.sz = inst.sz;
        kitMatrix(s, d.matrices, n * 16);
      }
      d.mesh.thinInstanceBufferUpdated('matrix');
      d.mesh.thinInstanceRefreshBoundingInfo(false);
    }
  }

  /** Per render frame: door leaves and status bars, LED circuits on a registry change. */
  frame(): void {
    if (this.reg.version !== this.regVersion) {
      this.regVersion = this.reg.version;
      this.paintLeds();
    }
    let moved = false;
    let relock = false;
    for (let k = 0; k < this.doorState.length; k++) {
      const ds = this.doorState[k];
      if (!ds) continue;
      const f = slideFraction(ds.open, ds.ajar);
      if (f !== this.slide[k]) {
        this.slide[k] = f;
        moved = true;
      }
      const lk = ds.anchor.locked ? 1 : 0;
      if (lk !== this.locked[k]) {
        this.locked[k] = lk;
        relock = true;
      }
    }
    if (moved) this.writeLeaves();
    if (relock) this.paintStatus();
  }

  /** A draw's per-instance colours (LED and status meshes; null otherwise) by mesh name (tests). */
  colorsOf(name: string): Float32Array | null {
    return this.draws.find((d) => d.mesh.name === name)?.colors ?? null;
  }

  /** A draw's instance matrices (16 floats each) by mesh name (tests). */
  matricesOf(name: string): Float32Array | null {
    return this.draws.find((d) => d.mesh.name === name)?.matrices ?? null;
  }

  /** Every kit mesh: the thin-instanced draws, then the baked static ones (tests and the debug overlay count draws). */
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

/** (S9 perf) One static mesh from baked parts (`bakeParts`): world space, frozen, never moved (the props kit uses it too). */
export function bakedMesh(scene: Scene, name: string, parts: readonly BakePart[], material: Material): Mesh {
  const b = bakeParts(parts);
  const mesh = new Mesh(name, scene);
  const vd = new VertexData();
  vd.positions = b.positions;
  vd.normals = b.normals;
  vd.indices = b.indices;
  vd.applyToMesh(mesh, false);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.receiveShadows = true;
  mesh.freezeWorldMatrix();
  mesh.doNotSyncBoundingInfo = true;
  return mesh;
}
