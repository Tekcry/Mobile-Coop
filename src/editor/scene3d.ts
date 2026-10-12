/**
 * The level editor's 3D view: plain massing boxes built from the campus data (walls cut around openings, floor slabs
 * tinted by access level, stairs, ladders, floor holes, pipe runs), picking, selection outlines and drag handles.
 * A dev tool: it rebuilds whole elements on change and never touches the game's renderer.
 */
import { Color3, Color4, CreateBox, DirectionalLight, Engine, FreeCamera, HemisphericLight, Matrix, Mesh, Scene, StandardMaterial, TransformNode, Vector3 } from '../core/babylon';
import type { AbstractMesh } from '../core/babylon';
import { EPS, joinPieces, wallDir, wallJoins, wallLen, wallPieces, wallPoint } from './geometry';
import type { WallJoin } from './geometry';
import type { EditorModel } from './model';
import type { Campus, Coll, Key, Ladder, Level, Opening, Room, Service, Stair, Void, Wall } from './types';
import { keyOf, parseKey } from './types';
import { buildingAt, DEFAULT_VIS, elementState, explodeOffset } from './visibility';
import type { VisSettings } from './visibility';

/** Access level tints, as the plans draw them (scripts/kestrel/plans.mjs RING_TINT). */
const RING_TINT = ['#d6ebc9', '#e6efc2', '#fbeab9', '#fbd9a8', '#f6c3a8', '#efb0c0'];
const OUTSIDE_TINT = '#e9f4e1';
const WALL_TINT: Record<string, string> = { exterior: '#5b5f66', interior: '#b9bcc2', boundary: '#8a6f55', parapet: '#8d9096', balustrade: '#6f8fa8' };

interface Meta {
  key: Key;
  /** Level ids the element belongs to (a stair: both). */
  levels: string[];
  /** Floor height of its lowest level. */
  floor: number;
  /** Building id from meta.buildings, or 'site'. */
  building: string;
}

export interface Hit {
  key: Key;
  x: number;
  y: number;
  z: number;
}

export interface Handle {
  id: string;
  x: number;
  y: number;
  z: number;
}

/** One box of the pad's grab preview or a ghost: centre, size along its own x (laid along dx, dz), look. */
export interface Mark {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  dx: number;
  dz: number;
  look: 'lit' | 'ghost' | 'bad';
}
const MARK_POOL = 8;

export class EditorScene {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: FreeCamera;
  level = 'G';
  vis: VisSettings = { ...DEFAULT_VIS };
  /** Walk mode shows every level whatever the settings, unexploded. */
  showAll = false;
  private readonly nodes = new Map<Key, Mesh[]>();
  private readonly mats = new Map<string, StandardMaterial>();
  private handleMeshes: Mesh[] = [];
  private selected: Key | null = null;
  /** One node per level; exploded view lifts it. */
  private readonly levelNodes = new Map<string, TransformNode>();
  private links: Mesh[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly model: EditorModel,
  ) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.62, 0.68, 0.74, 1);
    this.scene.ambientColor = new Color3(0.35, 0.35, 0.35);
    const hemi = new HemisphericLight('sky', new Vector3(0.2, 1, 0.1), this.scene);
    hemi.intensity = 0.8;
    hemi.groundColor = new Color3(0.35, 0.35, 0.4);
    const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, -0.6), this.scene);
    sun.intensity = 0.55;
    this.camera = new FreeCamera('cam', new Vector3(50, 70, -10), this.scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.05;
    this.camera.maxZ = 2000;
    this.camera.fov = 1.0;
    this.engine.runRenderLoop(() => this.scene.render());
  }

  get data(): Campus {
    return this.model.data;
  }

  private levelOf(id: string): Level | undefined {
    return this.data.levels.find((l) => l.id === id);
  }

  floorOf(id: string): number {
    return this.levelOf(id)?.floor ?? 0;
  }

  private mat(name: string, hex: string, alpha = 1, emissive = 0): StandardMaterial {
    const k = `${name}|${hex}|${alpha}`;
    let m = this.mats.get(k);
    if (!m) {
      m = new StandardMaterial(k, this.scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = new Color3(0.05, 0.05, 0.05);
      m.emissiveColor = Color3.FromHexString(hex).scale(emissive);
      m.alpha = alpha;
      if (alpha < 1) m.backFaceCulling = false;
      this.mats.set(k, m);
    }
    return m;
  }

  /** A box from its centre and size; `yaw` turns its local x onto a plan direction. */
  private box(name: string, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, yaw: number, mat: StandardMaterial): Mesh {
    const m = CreateBox(name, { width: Math.max(sx, 0.01), height: Math.max(sy, 0.01), depth: Math.max(sz, 0.01) }, this.scene);
    m.position.set(cx, cy, cz);
    m.rotation.y = yaw;
    m.material = mat;
    return m;
  }

  /** Rotation about y that lays a box's local x along plan direction (dx, dz) (Babylon is left-handed). */
  private static yaw(dx: number, dz: number): number {
    return Math.atan2(-dz, dx);
  }

  /** Corner joins per wall id (ON0b), recomputed whenever walls change; a wall whose join changes is rebuilt. */
  private joins = new Map<string, WallJoin>();
  private static joinKey = (j: WallJoin | undefined): string => (j ? `${j.a}|${j.b}|${j.seamA}|${j.seamB}` : '');

  rebuildAll(): void {
    for (const ms of this.nodes.values()) for (const m of ms) m.dispose();
    this.nodes.clear();
    const d = this.data;
    this.joins = wallJoins(d.walls);
    for (const r of d.rooms) this.build(keyOf('rooms', r.id));
    for (const w of d.walls) this.build(keyOf('walls', w.id));
    for (const o of d.openings) this.build(keyOf('openings', o.id));
    for (const s of d.stairs) this.build(keyOf('stairs', s.id));
    for (const l of d.ladders) this.build(keyOf('ladders', l.id));
    for (const v of d.voids) this.build(keyOf('voids', v.id));
    for (const s of d.services ?? []) this.buildService(s);
    this.applyVisibility();
    if (this.selected) this.outline(this.selected, true);
  }

  /** Rebuilds the changed elements (a wall's openings and an opening's wall come along). */
  refresh(keys: readonly Key[]): void {
    const todo = new Set<Key>(keys);
    for (const k of keys) {
      const p = parseKey(k);
      if (!p) continue;
      if (p.coll === 'walls') for (const o of this.data.openings) if (o.wall === p.id) todo.add(keyOf('openings', o.id));
      if (p.coll === 'openings') {
        const o = this.model.get<Opening>('openings', p.id);
        if (o) todo.add(keyOf('walls', o.wall));
        // a deleted opening: its wall is whichever wall's pieces no longer match; rebuild walls that lost one
        else for (const w of this.data.walls) if ((this.nodes.get(keyOf('walls', w.id))?.length ?? 0) > 0 && this.wallHadOpening(w.id, p.id)) todo.add(keyOf('walls', w.id));
      }
    }
    // a moved, added or removed wall changes its neighbours' corners: rebuild every wall whose join changed
    if ([...todo].some((k) => k.startsWith('walls:'))) {
      const old = this.joins;
      this.joins = wallJoins(this.data.walls);
      for (const w of this.data.walls) if (EditorScene.joinKey(old.get(w.id)) !== EditorScene.joinKey(this.joins.get(w.id))) todo.add(keyOf('walls', w.id));
    }
    for (const k of todo) this.build(k);
    this.applyVisibility();
    if (this.selected) this.outline(this.selected, true);
  }

  private wallHadOpening(wallId: string, openingId: string): boolean {
    return (this.nodes.get(keyOf('walls', wallId)) ?? []).some((m) => (m.metadata as Meta & { openings?: string[] }).openings?.includes(openingId));
  }

  private build(key: Key): void {
    for (const m of this.nodes.get(key) ?? []) m.dispose();
    this.nodes.delete(key);
    const p = parseKey(key);
    if (!p) return;
    const e = this.model.get(p.coll, p.id);
    if (!e) return;
    let meshes: Mesh[] = [];
    let levels: string[] = [];
    if (p.coll === 'rooms') [meshes, levels] = this.buildRoom(e as Room);
    else if (p.coll === 'walls') [meshes, levels] = this.buildWall(e as Wall);
    else if (p.coll === 'openings') [meshes, levels] = this.buildOpening(e as Opening);
    else if (p.coll === 'stairs') [meshes, levels] = this.buildStair(e as Stair);
    else if (p.coll === 'ladders') [meshes, levels] = this.buildLadder(e as Ladder);
    else if (p.coll === 'voids') [meshes, levels] = this.buildVoid(e as Void);
    const floor = Math.min(...levels.map((l) => this.floorOf(l)));
    const [bx, bz] = this.planCentre(p.coll, e);
    const building = (p.coll === 'rooms' ? (e as Room).building : undefined) ?? buildingAt(this.data.meta.buildings, bx, bz);
    const node = levels[0] !== undefined ? this.levelNode(levels[0]) : null;
    for (const m of meshes) {
      m.metadata = { ...(m.metadata as object), key, levels, floor, building } satisfies Meta;
      m.isPickable = true;
      if (node) m.parent = node;
    }
    this.nodes.set(key, meshes);
  }

  private planCentre(coll: Coll, e: unknown): [number, number] {
    if (coll === 'walls') return wallPoint(e as Wall, wallLen(e as Wall) / 2);
    if (coll === 'openings') {
      const w = this.model.get<Wall>('walls', (e as Opening).wall);
      return w ? wallPoint(w, (e as Opening).at) : [0, 0];
    }
    if (coll === 'ladders') return (e as Ladder).at;
    const r = (e as Room).rect;
    return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  }

  private levelNode(id: string): TransformNode {
    let n = this.levelNodes.get(id);
    if (!n) {
      n = new TransformNode(`level ${id}`, this.scene);
      this.levelNodes.set(id, n);
    }
    return n;
  }

  /** How far a level is lifted on screen (exploded view; 0 while walking). Never part of the data. */
  offsetOf(level: string): number {
    return this.showAll ? 0 : explodeOffset(this.vis, this.data.levels, level);
  }

  /** Wall height cap from the section setting (Infinity when off or walking). */
  private get cut(): number {
    return this.vis.section > 0 && !this.showAll ? this.vis.section : Infinity;
  }

  private buildRoom(r: Room): [Mesh[], string[]] {
    const f = this.floorOf(r.level);
    const tint = r.kind === 'lane' ? OUTSIDE_TINT : (RING_TINT[r.ring ?? -1] ?? '#e0e0e0');
    const [x0, z0, x1, z1] = r.rect;
    // a smaller room sits a hair higher, so a room drawn inside a yard does not flicker against it
    const lift = 0.012 * (1 - Math.min(1, ((x1 - x0) * (z1 - z0)) / 4000));
    const m = this.box(`room ${r.id}`, (x0 + x1) / 2, f - 0.03 + lift, (z0 + z1) / 2, x1 - x0, 0.06, z1 - z0, 0, this.mat('room', tint));
    return [[m], [r.level]];
  }

  private buildWall(w: Wall): [Mesh[], string[]] {
    const f = this.floorOf(w.level);
    const d = wallDir(w);
    const yaw = EditorScene.yaw(d[0], d[1]);
    const fence = w.kind === 'boundary';
    const mat = this.mat('wall', WALL_TINT[w.kind] ?? WALL_TINT.interior!, fence ? 0.45 : 1);
    const ops = this.data.openings.filter((o) => o.wall === w.id);
    const out: Mesh[] = [];
    const cut = this.cut;
    const L = wallLen(w);
    const j = this.joins.get(w.id);
    for (const p of joinPieces(wallPieces(w, ops), L, j)) {
      if (p.y0 >= cut) continue;
      const y1 = Math.min(p.y1, cut);
      const c = wallPoint(w, (p.s0 + p.s1) / 2);
      const m = this.box(`wall ${w.id}`, c[0], f + (p.y0 + y1) / 2, c[1], p.s1 - p.s0, y1 - p.y0, fence ? 0.06 : w.t, yaw, mat);
      // a piece that runs on into a wall on the same line draws no outline, so the two read as one wall (no seam)
      const seam = (j?.seamA && p.s0 <= EPS) || (j?.seamB && p.s1 >= L - EPS);
      if (!fence && !seam) {
        m.enableEdgesRendering();
        m.edgesWidth = 2;
        m.edgesColor = new Color4(0.15, 0.15, 0.18, 1);
      }
      m.metadata = { openings: ops.map((o) => o.id) };
      out.push(m);
    }
    return [out, [w.level]];
  }

  private buildOpening(o: Opening): [Mesh[], string[]] {
    const w = this.model.get<Wall>('walls', o.wall);
    if (!w) return [[], []];
    const f = this.floorOf(w.level);
    const d = wallDir(w);
    const c = wallPoint(w, Math.max(0, Math.min(wallLen(w), o.at)));
    const yaw = EditorScene.yaw(d[0], d[1]);
    const glass = o.type === 'window';
    const hex = glass ? '#9fd3ff' : o.type === 'gate' ? '#8a6f55' : o.type === 'roller' ? '#7c8790' : o.type === 'fire-door' ? '#c0392b' : '#a0703c';
    const top = Math.min(o.sill + o.h, this.cut);
    if (top <= o.sill) return [[], [w.level]];
    const m = this.box(`opening ${o.id}`, c[0], f + (o.sill + top) / 2, c[1], o.w, top - o.sill, glass ? 0.04 : 0.08, yaw, this.mat('opening', hex, glass ? 0.35 : 0.55, 0.15));
    return [[m], [w.level]];
  }

  private buildStair(s: Stair): [Mesh[], string[]] {
    const f0 = this.floorOf(s.from);
    const f1 = this.floorOf(s.to);
    const rise = f1 - f0;
    const n = Math.max(2, Math.round((s.risers as number | undefined) ?? rise / 0.168));
    const [x0, z0, x1, z1] = s.rect;
    // local frame: u runs in the climbing direction, v across; (u, v) in metres from the rect's start corner
    const alongX = s.up === 'E' || s.up === 'W';
    const len = alongX ? x1 - x0 : z1 - z0;
    const wid = alongX ? z1 - z0 : x1 - x0;
    const toWorld = (u: number, v: number): [number, number] => {
      if (s.up === 'E') return [x0 + u, z0 + v];
      if (s.up === 'W') return [x1 - u, z0 + v];
      if (s.up === 'N') return [x0 + v, z0 + u];
      return [x0 + v, z1 - u];
    };
    const mat = this.mat('stair', '#d9d4c7');
    const parts: Mesh[] = [];
    const step = (u0: number, u1: number, v0: number, v1: number, top: number): void => {
      const a = toWorld(u0, v0);
      const b = toWorld(u1, v1);
      const cx = (a[0] + b[0]) / 2;
      const cz = (a[1] + b[1]) / 2;
      parts.push(this.box(`stair ${s.id}`, cx, f0 + top / 2, cz, Math.abs(b[0] - a[0]), Math.max(top, 0.02), Math.abs(b[1] - a[1]), 0, mat));
    };
    if (s.layout === 'dogleg') {
      // two flights side by side: the first climbs `up` on one half, a landing across the far end, the second comes back
      const half = wid / 2;
      const landing = Math.min(half, len / 3);
      const run = len - landing;
      const n1 = Math.ceil(n / 2);
      const n2 = n - n1;
      const h = rise / n;
      for (let i = 0; i < n1; i++) step((i * run) / n1, ((i + 1) * run) / n1, 0, half, (i + 1) * h);
      step(run, len, 0, wid, n1 * h);
      for (let i = 0; i < n2; i++) step(run - ((i + 1) * run) / n2, run - (i * run) / n2, half, wid, (n1 + i + 1) * h);
    } else {
      const h = rise / n;
      for (let i = 0; i < n; i++) step((i * len) / n, ((i + 1) * len) / n, 0, wid, (i + 1) * h);
    }
    const merged = Mesh.MergeMeshes(parts, true);
    if (!merged) return [[], [s.from, s.to]];
    merged.name = `stair ${s.id}`;
    merged.enableEdgesRendering();
    merged.edgesWidth = 1.5;
    merged.edgesColor = new Color4(0.3, 0.3, 0.3, 1);
    return [[merged], [s.from, s.to]];
  }

  private buildLadder(l: Ladder): [Mesh[], string[]] {
    const f0 = this.floorOf(l.from);
    const f1 = this.floorOf(l.to);
    const ew = l.facing === 'E' || l.facing === 'W';
    const m = this.box(`ladder ${l.id}`, l.at[0], (f0 + f1 + 1) / 2, l.at[1], ew ? 0.08 : 0.5, f1 + 1 - f0, ew ? 0.5 : 0.08, 0, this.mat('ladder', '#e0a100', 1, 0.2));
    return [[m], [l.from, l.to]];
  }

  private buildVoid(v: Void): [Mesh[], string[]] {
    const f = this.floorOf(v.level);
    const [x0, z0, x1, z1] = v.rect;
    const m = this.box(`void ${v.id}`, (x0 + x1) / 2, f + 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, 0, this.mat('void', '#202428', 0.7));
    return [[m], [v.level]];
  }

  private buildService(s: Service): void {
    const mat = this.mat('service', '#4f7fa8');
    for (let i = 0; i + 1 < s.path.length; i++) {
      const a = s.path[i]!;
      const b = s.path[i + 1]!;
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const L = Math.sqrt(dx * dx + dz * dz);
      const m = this.box(`service ${s.id}`, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, L, s.size[1], s.size[0], EditorScene.yaw(dx, dz), mat);
      m.isPickable = false;
    }
  }

  /** Shows, ghosts or hides every element by the Levels settings (visibility.ts), and lifts levels when exploded. */
  applyVisibility(): void {
    const s = this.showAll ? { ...this.vis, preset: 'whole' as const, building: 'all', exploded: false } : this.vis;
    for (const ms of this.nodes.values()) {
      for (const m of ms) {
        const meta = m.metadata as Meta;
        const st = elementState(s, this.data.levels, this.level, meta.levels, meta.building);
        m.setEnabled(st !== 'hidden');
        m.visibility = st === 'ghost' ? 0.12 : 1;
        m.isPickable = st === 'shown';
      }
    }
    for (const [id, n] of this.levelNodes) n.position.y = this.offsetOf(id);
    this.buildLinks();
  }

  /** Exploded view: thin rods joining the floors each stair and ladder links. */
  private buildLinks(): void {
    for (const m of this.links) m.dispose();
    this.links = [];
    if (this.showAll || !this.vis.exploded) return;
    const mat = this.mat('link', '#0a84ff', 1, 0.5);
    const rod = (id: string, x: number, z: number, from: string, to: string): void => {
      // from the top of the flight as drawn on the lower level to the upper level's lifted floor
      const y0 = this.floorOf(to) + this.offsetOf(from);
      const y1 = this.floorOf(to) + this.offsetOf(to);
      if (y1 - y0 < 0.05) return;
      const m = this.box(`link ${id}`, x, (y0 + y1) / 2, z, 0.12, y1 - y0, 0.12, 0, mat);
      m.isPickable = false;
      this.links.push(m);
    };
    for (const st of this.data.stairs) {
      const [state] = this.nodes.get(keyOf('stairs', st.id)) ?? [];
      if (!state?.isEnabled()) continue;
      rod(st.id, (st.rect[0] + st.rect[2]) / 2, (st.rect[1] + st.rect[3]) / 2, st.from, st.to);
    }
    for (const l of this.data.ladders) {
      const [state] = this.nodes.get(keyOf('ladders', l.id)) ?? [];
      if (!state?.isEnabled()) continue;
      rod(l.id, l.at[0], l.at[1], l.from, l.to);
    }
  }

  setSelected(key: Key | null): void {
    if (this.selected) this.outline(this.selected, false);
    this.selected = key;
    if (key) this.outline(key, true);
  }

  private outline(key: Key, on: boolean): void {
    for (const m of this.nodes.get(key) ?? []) {
      m.renderOutline = on;
      m.outlineColor = new Color3(1, 0.45, 0);
      m.outlineWidth = 0.06;
    }
  }

  /** Drag handles (orange cubes) for the selected element. */
  setHandles(hs: readonly Handle[]): void {
    for (const m of this.handleMeshes) m.dispose();
    this.handleMeshes = hs.map((h) => {
      const m = this.box(`handle ${h.id}`, h.x, h.y, h.z, 0.4, 0.4, 0.4, 0, this.mat('handle', '#ff7300', 1, 0.6));
      m.metadata = { handle: h.id };
      m.renderingGroupId = 1; // drawn over walls so a handle is never lost inside one
      return m;
    });
  }

  private markMeshes: Mesh[] = [];
  /**
   * The pad's grab preview and tool ghosts (ED3-2): a fixed pool of unit boxes made once, then moved, scaled and
   * shown; never picked. Callers pass a new list only when the part or ghost changed.
   */
  setMarks(ms: readonly Mark[]): void {
    if (!this.markMeshes.length)
      for (let i = 0; i < MARK_POOL; i++) {
        const m = this.box(`mark ${i}`, 0, 0, 0, 1, 1, 1, 0, this.mat('mark-lit', '#ffd166', 0.75, 0.8));
        m.isPickable = false;
        m.renderingGroupId = 1;
        m.setEnabled(false);
        this.markMeshes.push(m);
      }
    for (let i = 0; i < this.markMeshes.length; i++) {
      const m = this.markMeshes[i]!;
      const k = ms[i];
      if (!k) {
        m.setEnabled(false);
        continue;
      }
      m.position.set(k.x, k.y, k.z);
      m.scaling.set(Math.max(k.sx, 0.01), Math.max(k.sy, 0.01), Math.max(k.sz, 0.01));
      m.rotation.y = EditorScene.yaw(k.dx, k.dz);
      m.material = k.look === 'lit' ? this.mat('mark-lit', '#ffd166', 0.75, 0.8) : k.look === 'bad' ? this.mat('mark-bad', '#ff3b30', 0.35, 0.6) : this.mat('mark-ghost', '#5ac8fa', 0.35, 0.6);
      m.setEnabled(true);
    }
  }

  /** The handle under the pointer, else the element on the current level (stairs: either end's level). */
  pick(px: number, py: number): { handle?: string; hit?: Hit } {
    const ph = this.scene.pick(px, py, (m) => m.isEnabled() && !!(m.metadata as { handle?: string } | null)?.handle);
    if (ph?.hit && ph.pickedMesh) return { handle: (ph.pickedMesh.metadata as { handle: string }).handle };
    const pr = this.scene.pick(px, py, (m: AbstractMesh) => {
      const meta = m.metadata as Meta | null;
      return m.isEnabled() && m.isPickable && !!meta?.key && meta.levels.includes(this.level);
    });
    if (!pr?.hit || !pr.pickedMesh || !pr.pickedPoint) return {};
    const meta = pr.pickedMesh.metadata as Meta;
    return { hit: { key: meta.key, x: pr.pickedPoint.x, y: pr.pickedPoint.y, z: pr.pickedPoint.z } };
  }

  /** Where the pointer ray meets the horizontal plane at height `y`, or null when it points away from it. */
  planePoint(px: number, py: number, y: number): [number, number] | null {
    const ray = this.scene.createPickingRay(px, py, Matrix.Identity(), this.camera);
    if (Math.abs(ray.direction.y) < 1e-6) return null;
    const t = (y - ray.origin.y) / ray.direction.y;
    if (t <= 0) return null;
    return [ray.origin.x + ray.direction.x * t, ray.origin.z + ray.direction.z * t];
  }

  elementLevels(coll: Coll, id: string): string[] {
    return ((this.nodes.get(keyOf(coll, id))?.[0]?.metadata as Meta | undefined)?.levels ?? []).slice();
  }
}
