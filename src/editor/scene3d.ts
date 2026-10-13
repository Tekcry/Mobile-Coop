/**
 * The level editor's 3D view: plain massing boxes built from the campus data (walls cut around openings, floor slabs
 * tinted by access level, stairs, ladders, floor holes, pipe runs), picking, selection outlines and drag handles.
 * A dev tool: it rebuilds whole elements on change and never touches the game's renderer.
 */
import { Color3, Color4, CreateBox, CreateLineSystem, DirectionalLight, Engine, FreeCamera, HemisphericLight, Matrix, Mesh, Scene, StandardMaterial, TransformNode, Vector3, VertexData } from '../core/babylon';
import type { AbstractMesh } from '../core/babylon';
import { cutRect, EPS, joinPieces, wallDir, wallJoins, wallLen, wallPieces, wallPoint } from './geometry';
import type { WallJoin } from './geometry';
import type { EditorModel } from './model';
import type { Campus, Coll, Ext, Key, Ladder, Level, Obj, Opening, Roof, Room, Service, Stair, Void, Wall } from './types';
import { finishOf } from './climbCatalogue';
import { stealthTint } from './objects';
import { presetOf } from './catalogue';
import type { ObjGroup } from './catalogue';

/** ON4: object colours by catalogue group (the stealth view tints by badge instead). */
const OBJ_HEX: Record<ObjGroup | 'other', string> = { dataHall: '#3d4450', plant: '#8a8f6a', office: '#9c8466', goodsIn: '#a3825a', yard: '#6f7780', other: '#8d9096' };
import { roofHex, roofParapets, roofShape, roofTrim } from '../world/maps/kestrelRoofs';
import type { RoofBox, RoofPlane } from '../world/maps/kestrelRoofs';
import { keyOf, parseKey } from './types';
import { buildingAt, DEFAULT_VIS, elementState, explodeOffset } from './visibility';
import { stairLayout } from '../world/maps/stairs';
import { STAIR_FACTS } from './vertical';
import { catEntry, effective, GLASS_WALL_DEFAULT } from './openingCatalogue';
import type { GlassData } from './openingCatalogue';
import { hangsAtA, swingSign } from '../world/maps/kestrelDoors';
import type { VisSettings } from './visibility';
import { circuitLevel, lampCentre, lampLevel } from './lamps';
import type { Circuit, Lamp } from './lamps';
import { lampOnNormally } from '../world/maps/kestrelLights';
import { aimDir, SWITCH } from './lightCatalogue';
import { isMission, missionCentre } from './mission';
import type { Extraction, Guard, MissionColl, PatrolPose, PlayPt } from './mission';
import type { MissionTool } from './missionTool';
import { deviceCentre, isBeam, isCamera, isPir, isReader } from './security';
import type { Device } from './security';
import { DEVICE_COLOURS, DEVICE_SIZES, levelColour, SF } from './securityCatalogue';
import type { SecurityTool } from './securityTool';

/** Access level tints, as the plans draw them (scripts/kestrel/plans.mjs RING_TINT). */
const RING_TINT = ['#d6ebc9', '#e6efc2', '#fbeab9', '#fbd9a8', '#f6c3a8', '#efb0c0'];
const OUTSIDE_TINT = '#e9f4e1';
const WALL_TINT: Record<string, string> = { exterior: '#5b5f66', interior: '#b9bcc2', boundary: '#8a6f55', parapet: '#8d9096', balustrade: '#6f8fa8', glass: '#9fd3ff' };

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
/** ON11: the most boxes a ghost shows (a module kit data hall bay has about 130 parts). */
const MARK_MAX = 200;

export class EditorScene {
  readonly engine: Engine;
  readonly scene: Scene;
  readonly camera: FreeCamera;
  level = 'G';
  vis: VisSettings = { ...DEFAULT_VIS };
  /** Walk mode shows every level whatever the settings, unexploded. */
  showAll = false;
  /** ON4: the stealth view (objects tinted by their badges). */
  private stealth = false;
  /** ON5: the finish view (room floors tinted by finish). */
  private finishView = false;
  private readonly nodes = new Map<Key, Mesh[]>();
  private readonly mats = new Map<string, StandardMaterial>();
  private handleMeshes: Mesh[] = [];
  private selected: Key | null = null;
  /** One node per level; exploded view lifts it. */
  private readonly levelNodes = new Map<string, TransformNode>();
  private links: Mesh[] = [];
  /** ON8: the mission tool (guard colours, patrols, which paths show); set by the editor. */
  mission: MissionTool | null = null;
  /** ON12: the security tool (camera frame outlines); set by the editor. */
  security: SecurityTool | null = null;
  private figure: Mesh[] = [];

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
    for (const r of d.roofs ?? []) this.build(keyOf('roofs', r.id));
    for (const o of d.objects ?? []) this.build(keyOf('objects', o.id));
    for (const x of d.exterior ?? []) this.build(keyOf('exterior', x.id));
    for (const l of d.lamps ?? []) this.build(keyOf('lamps', l.id));
    for (const c of d.circuits ?? []) this.build(keyOf('circuits', c.id));
    for (const coll of ['guards', 'objectives', 'hides', 'checkpoints', 'spawns', 'extraction'] as const) for (const e of (d[coll] ?? []) as { id: string }[]) this.build(keyOf(coll, e.id));
    for (const e of d.devices ?? []) this.build(keyOf('devices', e.id));
    for (const s of d.services ?? []) this.buildService(s);
    this.applyVisibility();
    if (this.selected) this.outline(this.selected, true);
    for (const k of this.group) this.outline(k, true);
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
    // ON2: a floor hole cuts the room floors on its level (old and new rect: rebuild every room on the level, or all when it went)
    for (const k of keys) {
      const p = parseKey(k);
      if (p?.coll !== 'voids') continue;
      const v = this.model.get<Void>('voids', p.id);
      for (const r of this.data.rooms) if (!v || r.level === v.level) todo.add(keyOf('rooms', r.id));
    }
    // a moved, added or removed wall changes its neighbours' corners: rebuild every wall whose join changed
    if ([...todo].some((k) => k.startsWith('walls:'))) {
      const old = this.joins;
      this.joins = wallJoins(this.data.walls);
      for (const w of this.data.walls) if (EditorScene.joinKey(old.get(w.id)) !== EditorScene.joinKey(this.joins.get(w.id))) todo.add(keyOf('walls', w.id));
    }
    // ON8: a building change can open or close a guard's way: its legs are worked out again
    if ([...todo].some((k) => !isMission(k.slice(0, k.indexOf(':'))) && !k.startsWith('devices:'))) for (const g of this.data.guards ?? []) todo.add(keyOf('guards', g.id));
    for (const k of todo) this.build(k);
    this.applyVisibility();
    if (this.selected) this.outline(this.selected, true);
    for (const k of this.group) this.outline(k, true);
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
    else if (p.coll === 'roofs') [meshes, levels] = this.buildRoof(e as Roof);
    else if (p.coll === 'objects') [meshes, levels] = this.buildObject(e as Obj);
    else if (p.coll === 'exterior') [meshes, levels] = this.buildExterior(e as Ext);
    else if (p.coll === 'lamps') [meshes, levels] = this.buildLamp(e as Lamp);
    else if (p.coll === 'circuits') [meshes, levels] = this.buildSwitch(e as Circuit);
    else if (isMission(p.coll)) [meshes, levels] = this.buildMission(p.coll, e);
    else if (p.coll === 'devices') [meshes, levels] = this.buildDevice(e as unknown as Device);
    const floor = Math.min(...levels.map((l) => this.floorOf(l)));
    const [bx, bz] = this.planCentre(p.coll, e);
    const building = (p.coll === 'rooms' ? (e as Room).building : undefined) ?? buildingAt(this.data.meta.buildings, bx, bz);
    const node = levels[0] !== undefined ? this.levelNode(levels[0]) : null;
    for (const m of meshes) {
      m.metadata = { ...(m.metadata as object), key, levels, floor, building } satisfies Meta;
      // ON9: a door's floor marks (swing arcs, tracks, arrows) are lines, never picked or outlined
      m.isPickable = m.getClassName() !== 'LinesMesh';
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
    if (coll === 'exterior') return [((e as Ext).a[0] + (e as Ext).b[0]) / 2, ((e as Ext).a[1] + (e as Ext).b[1]) / 2];
    if (coll === 'lamps') return lampCentre(e as Lamp);
    if (coll === 'circuits') {
      const sw = (e as Circuit).switch;
      return sw ? [sw.at[0], sw.at[2]] : [0, 0];
    }
    if (isMission(coll)) return missionCentre(coll, e);
    if (coll === 'devices') return deviceCentre(e as Device);
    const r = (e as Room).rect;
    return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  }

  /**
   * ON12: a security device: a camera's housing (SN05) facing its way with its frame outline on the floor (a pan
   * camera: its whole sweep) to its range; a reader plate in its access level's colour; a PIR dome with its fan on the
   * floor; a beam as a line between its ends (bright when visible, dark when night vision only) with posts. Their ids are
   * labels (overlays.ts). The light view tints what a camera sees (lightView.ts).
   */
  private buildDevice(e: Device): [Mesh[], string[]] {
    const out: Mesh[] = [];
    const y0 = this.floorOf(e.level);
    const line = (name: string, pts: Vector3[][], hex: string): void => {
      const c = Color3.FromHexString(hex);
      const cc = new Color4(c.r, c.g, c.b, 1);
      out.push(CreateLineSystem(name, { lines: pts, colors: pts.map((l) => l.map(() => cc)) }, this.scene));
    };
    if (isBeam(e)) {
      const a = new Vector3(e.a[0], y0 + e.a[1], e.a[2]);
      const b = new Vector3(e.b[0], y0 + e.b[1], e.b[2]);
      line(`beam ${e.id}`, [[a, b]], e.visible ? DEVICE_COLOURS.beam : '#7a1f1f');
      const post = this.mat('beam post', '#495057', 1, 0.2);
      for (const p of [e.a, e.b]) out.push(this.box(`beam ${e.id} post`, p[0], y0 + (p[1] + 0.1) / 2, p[2], DEVICE_SIZES.beamPost.w, p[1] + 0.1, DEVICE_SIZES.beamPost.d, 0, post));
      return [out, [e.level]];
    }
    const at = e.at as [number, number] | undefined;
    if (!at) return [[], [e.level]];
    const y = y0 + (typeof e.y === 'number' ? e.y : 1);
    const yaw = typeof e.facing === 'number' ? (e.facing * Math.PI) / 180 : 0;
    if (isCamera(e)) {
      const s = DEVICE_SIZES.camera;
      out.push(this.box(`camera ${e.id}`, at[0], y, at[1], s.w, s.h, s.d, yaw, this.mat('camera', DEVICE_COLOURS.camera, 1, 0.2)));
      const led = this.box(`camera ${e.id} led`, at[0] + Math.sin(yaw) * (s.d / 2), y + s.h / 2, at[1] + Math.cos(yaw) * (s.d / 2), 0.04, 0.04, 0.04, yaw, this.mat('camera led', '#ff2222', 1, 1));
      out.push(led);
      const fl = this.security?.frameLines(e) ?? [];
      const fy = y0 + 0.07;
      if (fl.length) line(`camera ${e.id} frame`, fl.map(([p, q]) => [new Vector3(p[0], fy, p[1]), new Vector3(q[0], fy, q[1])]), DEVICE_COLOURS.cone);
    } else if (isReader(e)) {
      const s = DEVICE_SIZES.reader;
      out.push(this.box(`reader ${e.id}`, at[0], y, at[1], s.w, s.h, s.d, yaw, this.mat(`reader level ${e.accessLevel}`, levelColour(e.accessLevel), 1, 0.4)));
    } else if (isPir(e)) {
      const s = DEVICE_SIZES.pir;
      out.push(this.box(`pir ${e.id}`, at[0], y, at[1], s.w, s.h, s.d, yaw, this.mat('pir', DEVICE_COLOURS.pir, 1, 0.5)));
      const r = SF.pirRange.value;
      const half = e.mount === 'wall' ? (SF.pirWallFan.value / 2) * (Math.PI / 180) : Math.PI;
      const pts: Vector3[] = [];
      const fy = y0 + 0.06;
      if (e.mount === 'wall') pts.push(new Vector3(at[0], fy, at[1]));
      for (let i = 0; i <= 36; i++) {
        const a = yaw - half + (2 * half * i) / 36;
        pts.push(new Vector3(at[0] + Math.sin(a) * r, fy, at[1] + Math.cos(a) * r));
      }
      if (e.mount === 'wall') pts.push(new Vector3(at[0], fy, at[1]));
      line(`pir ${e.id} fan`, [pts], DEVICE_COLOURS.pirFan);
    } else out.push(this.box(`device ${e.id}`, at[0], y, at[1], 0.2, 0.2, 0.2, yaw, this.mat('device', '#868e96', 1, 0.2)));
    return [out, [e.level]];
  }

  /** ON8: every guard rebuilt (Hub > View "Guard paths", or the selection while it shows only the selected guard's). */
  refreshGuards(): void {
    for (const g of this.data.guards ?? []) this.build(keyOf('guards', g.id));
    this.applyVisibility();
    if (this.selected) this.outline(this.selected, true);
  }

  /**
   * ON8: a guard (a see-through figure at its first stop; with its path shown, a line on the floor per leg, red where
   * there is no way, arrows the way it walks, a pad at each stop with a wedge for its facing) or a mission marker
   * (insertion: a blue post on a disc; objective: a diamond; hide: a grey box; checkpoint: a flag; extraction: a green
   * zone on the floor). Their words are labels (overlays.ts).
   */
  private buildMission(coll: MissionColl, e: unknown): [Mesh[], string[]] {
    const out: Mesh[] = [];
    const mt = this.mission;
    const fy = (l: string): number => this.floorOf(l);
    const post = (name: string, at: PlayPt, h: number, hex: string, w = 0.1): Mesh => this.box(name, at[0], fy(at[2]) + h / 2, at[1], w, h, w, 0, this.mat(name.split(' ')[0]!, hex, 1, 0.25));
    if (coll === 'guards') {
      const g = e as Guard;
      const s0 = g.loop[0];
      if (!s0 || !mt) return [[], []];
      const col = mt.colourOf(g.id);
      const levels = [...new Set(g.loop.map((s) => s.at[2]))];
      out.push(this.box(`guard ${g.id}`, s0.at[0], fy(s0.at[2]) + 0.875, s0.at[1], 0.45, 1.75, 0.3, (s0.face * Math.PI) / 180, this.mat('guard body', col, 0.45, 0.2)));
      if (!mt.showsPath(g.id)) return [out, levels];
      const pat = mt.patrolOf(g);
      const lines: Vector3[][] = [];
      const colors: Color4[][] = [];
      const c = Color3.FromHexString(col);
      const ok = new Color4(c.r, c.g, c.b, 1);
      const bad = new Color4(0.88, 0.19, 0.19, 1);
      for (const leg of pat.legs) {
        for (let i = 1; i < leg.pts.length; i++) {
          const a = leg.pts[i - 1]!;
          const b = leg.pts[i]!;
          if (a[2] !== b[2]) continue;
          const y = fy(a[2]) + 0.08;
          const cc = leg.ok ? ok : bad;
          lines.push([new Vector3(a[0], y, a[1]), new Vector3(b[0], y, b[1])]);
          colors.push([cc, cc]);
          const L = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
          if (L > 1.5) {
            // an arrow at the middle, the way walked
            const ux = (b[0] - a[0]) / L;
            const uz = (b[1] - a[1]) / L;
            const mx = (a[0] + b[0]) / 2;
            const mz = (a[1] + b[1]) / 2;
            const tip = new Vector3(mx + ux * 0.3, y, mz + uz * 0.3);
            lines.push([new Vector3(mx - ux * 0.1 - uz * 0.25, y, mz - uz * 0.1 + ux * 0.25), tip, new Vector3(mx - ux * 0.1 + uz * 0.25, y, mz - uz * 0.1 - ux * 0.25)]);
            colors.push([cc, cc, cc]);
          }
        }
      }
      if (lines.length) out.push(CreateLineSystem(`guard ${g.id} path`, { lines, colors }, this.scene));
      const pad = this.mat('guard stop', col, 1, 0.3);
      g.loop.forEach((s, i) => {
        const y = fy(s.at[2]);
        out.push(this.box(`guard ${g.id} stop ${i + 1}`, s.at[0], y + 0.03, s.at[1], i === 0 ? 0.6 : 0.4, 0.06, i === 0 ? 0.6 : 0.4, 0, pad));
        const fx = Math.sin((s.face * Math.PI) / 180);
        const fz = Math.cos((s.face * Math.PI) / 180);
        out.push(this.box(`guard ${g.id} face ${i + 1}`, s.at[0] + fx * 0.45, y + 0.07, s.at[1] + fz * 0.45, 0.08, 0.04, 0.5, (s.face * Math.PI) / 180, pad));
      });
      if (g.isolation) out.push(post(`guard ${g.id} alone`, g.isolation.at, 0.3, col, 0.3));
      return [out, levels];
    }
    if (coll === 'extraction') {
      const x = e as Extraction;
      const r = x.rect;
      const y = fy(x.level);
      out.push(this.box(`extraction ${x.id}`, (r[0] + r[2]) / 2, y + 0.04, (r[1] + r[3]) / 2, r[2] - r[0], 0.08, r[3] - r[1], 0, this.mat('extraction', '#2f9e44', 0.35, 0.3)));
      for (const [cx, cz] of [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]] as const) out.push(post(`extraction ${x.id} corner`, [cx, cz, x.level], 1.2, '#2f9e44', 0.08));
      return [out, [x.level]];
    }
    const at = (e as { at: PlayPt; id: string }).at;
    const id = (e as { id: string }).id;
    const y = fy(at[2]);
    if (coll === 'spawns') {
      out.push(post(`spawn ${id}`, at, 1.2, '#1c7ed6'), this.box(`spawn ${id} disc`, at[0], y + 0.02, at[1], 0.8, 0.04, 0.8, 0, this.mat('spawn disc', '#1c7ed6', 0.6, 0.3)));
    } else if (coll === 'objectives') {
      const kind = (e as { kind: string }).kind;
      const m = this.box(`objective ${id}`, at[0], y + 1.3, at[1], 0.35, 0.35, 0.35, Math.PI / 4, this.mat(`objective ${kind === 'intel' ? 'intel' : 'goal'}`, kind === 'intel' ? '#f59f00' : '#e64980', 1, 0.4));
      m.rotation.x = Math.PI / 4;
      out.push(m, post(`objective ${id} stand`, at, 1.1, '#868e96', 0.05));
    } else if (coll === 'hides') {
      out.push(this.box(`hide ${id}`, at[0], y + 0.4, at[1], 0.7, 0.8, 0.7, 0, this.mat('hide', '#495057', 0.45, 0.1)));
    } else {
      out.push(post(`checkpoint ${id}`, at, 1.6, '#0ca678', 0.06), this.box(`checkpoint ${id} flag`, at[0] + 0.25, y + 1.4, at[1], 0.45, 0.3, 0.03, 0, this.mat('checkpoint flag', '#0ca678', 1, 0.3)));
    }
    return [out, [at[2]]];
  }

  /** ON8: the patrol preview's figure (a guard-sized box with a nose the way it faces), or none. */
  setPatrolFigure(pose: PatrolPose | null, hex: string): void {
    if (!pose) {
      for (const m of this.figure) m.setEnabled(false);
      return;
    }
    if (!this.figure.length) {
      const body = CreateBox('patrolFigure', { width: 0.45, height: 1.75, depth: 0.3 }, this.scene);
      const nose = CreateBox('patrolNose', { width: 0.12, height: 0.12, depth: 0.35 }, this.scene);
      nose.parent = body;
      nose.position.set(0, 0.6, 0.3);
      const mat = new StandardMaterial('patrol figure', this.scene);
      mat.diffuseColor = new Color3(0.95, 0.95, 0.95);
      body.material = mat;
      nose.material = mat;
      body.isPickable = false;
      nose.isPickable = false;
      this.figure = [body, nose];
    }
    const body = this.figure[0]!;
    for (const m of this.figure) m.setEnabled(true);
    (body.material as StandardMaterial).emissiveColor = Color3.FromHexString(hex || '#ffffff').scale(0.6);
    body.position.set(pose.x, this.floorOf(pose.level) + this.offsetOf(pose.level) + 0.875, pose.z);
    body.rotation.y = pose.yaw;
  }

  /** The patrol figure's place now, or null (tests read it). */
  get patrolFigureAt(): [number, number] | null {
    const b = this.figure[0];
    return b?.isEnabled() ? [b.position.x, b.position.z] : null;
  }

  /**
   * ON6: a lamp as its body (the fitting's box, or a strip along its line) and an emissive bulb at the light, as the
   * game's light rig draws bulbs (a lamp off in its normal state, PIR or non-maintained, gets a dark bulb). Lighting the
   * scene from the lamps is ON7.
   */
  private buildLamp(l: Lamp): [Mesh[], string[]] {
    const lv = lampLevel(this.data, l);
    if (!lv) return [[], []];
    const f = this.floorOf(lv);
    const fx = l.params.fixture;
    const body = this.mat('lamp body', '#d9dce0');
    const c = l.params.color;
    const hex = `#${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
    const on = lampOnNormally(l);
    const bulbMat = this.mat(`bulb ${on ? 'on' : 'off'}`, on ? hex : '#3a3d42', 1, on ? 1 : 0);
    const out: Mesh[] = [];
    const y = f + l.at[1];
    if (l.b) {
      const dx = l.b[0] - l.at[0];
      const dz = l.b[2] - l.at[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      const [cx, cz] = lampCentre(l);
      const yaw = EditorScene.yaw(dx, dz);
      out.push(this.box(`lamp ${l.id}`, cx, y + (fx?.oy ?? 0), cz, len, fx?.sy ?? 0.04, 0.06, yaw, body));
      out.push(this.box(`bulb ${l.id}`, cx, y - 0.005, cz, len * 0.96, 0.02, 0.04, yaw, bulbMat));
    } else {
      const sx = fx?.sx ?? 0.15;
      const sy = fx?.sy ?? 0.1;
      const sz = fx?.sz ?? 0.15;
      out.push(this.box(`lamp ${l.id}`, l.at[0], y + (fx?.oy ?? 0), l.at[2], sx, sy, sz, 0, body));
      const bs = Math.max(0.06, Math.min(0.2, Math.min(sx, sz) * 0.8));
      out.push(this.box(`bulb ${l.id}`, l.at[0], y, l.at[2], bs, 0.04, bs, 0, bulbMat));
    }
    // an aimed fitting (flood, twin spot): a thin 1.5 m rod along its beam, so the aim reads from any side
    if (l.aim) {
      const d = aimDir(l.aim);
      for (const k of (l.heads ?? 1) > 1 ? [1, -1] : [1]) {
        const rod = this.box(`aim ${l.id}`, l.at[0] + d[0] * k * 0.75, y + d[1] * 0.75, l.at[2] + d[2] * k * 0.75, 0.03, 0.03, 1.5, 0, bulbMat);
        rod.rotation.y = ((l.aim[0] + (k < 0 ? 180 : 0)) * Math.PI) / 180;
        rod.rotation.x = (l.aim[1] * Math.PI) / 180;
        out.push(rod);
      }
    }
    return [out, [lv]];
  }

  /** ON6: a wall switch: a small white plate on its wall face at its height. */
  private buildSwitch(c: Circuit): [Mesh[], string[]] {
    if (!c.switch) return [[], []];
    const lv = circuitLevel(this.data, c);
    if (!lv) return [[], []];
    const w = this.data.walls.find((q) => q.id === c.switch!.wall);
    const alongX = !!w && Math.abs(w.a[1] - w.b[1]) < Math.abs(w.a[0] - w.b[0]);
    const m = this.box(`switch ${c.id}`, c.switch.at[0], this.floorOf(lv) + c.switch.at[1], c.switch.at[2], alongX ? SWITCH.w : SWITCH.d, SWITCH.h, alongX ? SWITCH.d : SWITCH.w, 0, this.mat('switch', '#f4f4f4', 1, 0.3));
    return [[m], [lv]];
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
    // ON5: the finish view tints a finished floor by its finish
    const fin = this.finishView ? finishOf(r.finish as string | undefined) : undefined;
    const tint = fin ? fin.tint : r.kind === 'lane' ? OUTSIDE_TINT : (RING_TINT[r.ring ?? -1] ?? '#e0e0e0');
    const [x0, z0, x1, z1] = r.rect;
    // a smaller room sits a hair higher, so a room drawn inside a yard does not flicker against it
    const lift = 0.012 * (1 - Math.min(1, ((x1 - x0) * (z1 - z0)) / 4000));
    // ON2: the level's floor holes are cut out of the floor (one box per piece left)
    const holes = this.data.voids.filter((v) => v.level === r.level && v.rect[0] < x1 - EPS && v.rect[2] > x0 + EPS && v.rect[1] < z1 - EPS && v.rect[3] > z0 + EPS).map((v) => v.rect);
    const parts = cutRect(r.rect, holes).map(([a0, b0, a1, b1]) => this.box(`room ${r.id}`, (a0 + a1) / 2, f - 0.03 + lift, (b0 + b1) / 2, a1 - a0, 0.06, b1 - b0, 0, this.mat('room', tint)));
    if (parts.length <= 1) return [parts, [r.level]];
    const merged = Mesh.MergeMeshes(parts, true);
    if (merged) merged.name = `room ${r.id}`;
    return [merged ? [merged] : parts, [r.level]];
  }

  private buildWall(w: Wall): [Mesh[], string[]] {
    const f = this.floorOf(w.level);
    const d = wallDir(w);
    const yaw = EditorScene.yaw(d[0], d[1]);
    const fence = w.kind === 'boundary';
    // ON9 decision 4: a glass partition is drawn see-through, as its glass
    const glass = w.kind === 'glass' ? { ...GLASS_WALL_DEFAULT, ...(w.glass && typeof w.glass === 'object' ? (w.glass as GlassData) : {}) } : null;
    const mat = glass ? this.glassMat(glass) : this.mat('wall', WALL_TINT[w.kind] ?? WALL_TINT.interior!, fence ? 0.45 : 1);
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
      if (glass && glass.blinds !== 'none' && y1 - p.y0 > 1) {
        // blinds on a glass partition: closed fill it, half the top half, open a strip at the head
        const frac = glass.blinds === 'closed' ? 1 : glass.blinds === 'half' ? 0.5 : 0.12;
        const off = w.t / 2 + 0.02;
        const b = this.box(`wall ${w.id}`, c[0] - d[1] * off, f + y1 - ((y1 - p.y0) * frac) / 2, c[1] + d[0] * off, p.s1 - p.s0, (y1 - p.y0) * frac, 0.02, yaw, this.mat('blinds', '#d9d4c7', 0.9));
        b.metadata = { openings: ops.map((o) => o.id) };
        out.push(b);
      }
    }
    return [out, [w.level]];
  }

  private buildOpening(o: Opening): [Mesh[], string[]] {
    const w = this.model.get<Wall>('walls', o.wall);
    if (!w) return [[], []];
    const f = this.floorOf(w.level);
    const d = wallDir(w);
    const L = wallLen(w);
    const at = Math.max(0, Math.min(L, o.at));
    const c = wallPoint(w, at);
    const yaw = EditorScene.yaw(d[0], d[1]);
    const top = Math.min(o.sill + o.h, this.cut);
    if (top <= o.sill) return [[], [w.level]];
    // ON9 decision 6: the leaf by what it is made of, its hinge and swing arc or its track, a reader or lock, one-way arrows
    const e = catEntry(o.type);
    const rooms = this.data.rooms;
    const set = effective(o, rooms);
    const out: Mesh[] = [];
    const y0 = f + o.sill;
    const hgt = top - o.sill;
    const solidHex = o.type === 'fire-door' ? '#c0392b' : o.type === 'roller' ? '#7c8790' : '#a0703c';
    const leafMat = e.leaf === 'glass' ? this.glassMat(set.glass) : e.leaf === 'mesh' ? this.mat('mesh', '#8a8f94', 0.4, 0.1) : e.leaf === 'none' ? this.mat('arch', '#a0703c', 0.12) : this.mat('opening', solidHex, 0.55, 0.15);
    out.push(this.box(`opening ${o.id}`, c[0], y0 + hgt / 2, c[1], o.w, hgt, e.leaf === 'solid' ? 0.08 : 0.04, yaw, leafMat));
    const n: [number, number] = [-d[1], d[0]];
    const P = (s: number, off: number, y: number): Vector3 => new Vector3(w.a[0] + d[0] * s + n[0] * off, y, w.a[1] + d[1] * s + n[1] * off);
    const lines: Vector3[][] = [];
    const colours: string[] = [];
    const line = (pts: Vector3[], hex: string): void => {
      lines.push(pts);
      colours.push(hex);
    };
    const s0 = at - o.w / 2;
    const s1 = at + o.w / 2;
    const fy = f + 0.03;
    if (e.family === 'window') {
      const blinds = set.glass.blinds ?? 'none';
      if (blinds !== 'none') {
        const frac = blinds === 'closed' ? 1 : blinds === 'half' ? 0.5 : 0.12;
        out.push(this.box(`opening ${o.id} blinds`, c[0] + n[0] * 0.06, y0 + hgt * (1 - frac / 2), c[1] + n[1] * 0.06, o.w * 0.98, hgt * frac, 0.02, yaw, this.mat('blinds', '#d9d4c7', 0.9)));
      }
    } else if (e.motion === 'swing' || e.motion === 'double') {
      const sgn = swingSign(o, w, rooms);
      const leaves: [number, number][] = e.motion === 'double' ? [[s0, 1], [s1, -1]] : hangsAtA(o, w, rooms) ? [[s0, 1]] : [[s1, -1]];
      const len = e.motion === 'double' ? o.w / 2 : o.w;
      for (const [h, dir] of leaves) {
        // the hinge post, the open leaf and the arc it sweeps on the floor
        out.push(this.box(`opening ${o.id} hinge`, w.a[0] + d[0] * h, y0 + hgt / 2, w.a[1] + d[1] * h, 0.06, hgt, w.t + 0.04, yaw, this.mat('hinge', '#2b2e33')));
        const arc: Vector3[] = [];
        for (let k = 0; k <= 12; k++) {
          const t = (k / 12) * (Math.PI / 2);
          arc.push(P(h + dir * len * Math.cos(t), sgn * len * Math.sin(t), fy));
        }
        line(arc, '#3b4a5a');
        line([P(h, 0, fy), P(h, sgn * len, fy)], '#3b4a5a');
      }
    } else if (e.motion === 'slide') {
      // the track along the floor, running on past the stack side, and an arrow toward the stack
      const atA = hangsAtA(o, w, rooms, 'stack');
      const off = (w.t / 2 + 0.05) * (swingSign(o, w, rooms) === 1 ? -1 : 1);
      const far = atA ? s0 - o.w / 2 : s1 + o.w / 2;
      line([P(atA ? s1 : s0, off, fy), P(far, off, fy)], '#3b4a5a');
      const tip = atA ? s0 - 0.1 : s1 + 0.1;
      const back = atA ? 0.35 : -0.35;
      line([P(at, off * 2.5, fy), P(tip, off * 2.5, fy), P(tip + back, off * 2.5 + 0.18, fy)], '#3b4a5a');
      line([P(tip, off * 2.5, fy), P(tip + back, off * 2.5 - 0.18, fy)], '#3b4a5a');
    }
    if (e.family === 'door' && e.settings.length) {
      // a reader (card: green light) or a lock at handle height on both faces, at the latch end
      const latch = e.motion === 'double' ? at : e.motion === 'slide' ? (hangsAtA(o, w, rooms, 'stack') ? s1 : s0) : hangsAtA(o, w, rooms) ? s1 : s0;
      const sOut = latch + (latch >= at ? 0.25 : -0.25);
      const reader = set.door.reader ?? 'none';
      if (reader !== 'none' || set.locked) {
        const m = reader === 'card' || reader === 'card-pin' ? this.mat('reader', '#2fbf71', 1, 0.6) : reader === 'none' ? this.mat('lock', '#d4a017', 1, 0.4) : this.mat('keypad', '#5b6b7a', 1, 0.4);
        for (const side of [1, -1]) {
          const p = P(sOut, side * (w.t / 2 + 0.03), y0 + 1.05);
          out.push(this.box(`opening ${o.id} reader`, p.x, p.y, p.z, 0.09, 0.14, 0.04, yaw, m));
        }
      }
      // one-way: an arrow on the floor from the side that opens freely, through the door
      const ow = set.door.oneWay;
      if (ow !== undefined && o.between && o.between.includes(ow)) {
        const away = -swingSign({ ...o, door: { swing: ow } }, w, rooms);
        line([P(at, -away * 1.0, fy), P(at, away * 1.0, fy), P(at - 0.25, away * 0.7, fy)], '#2e8b57');
        line([P(at, away * 1.0, fy), P(at + 0.25, away * 0.7, fy)], '#2e8b57');
      }
      // ON9 decision 9: the card level on a small plate over the door, in the plans' level colour
      const lv = set.door.level;
      if (lv !== undefined && (reader === 'card' || reader === 'card-pin') && o.sill + o.h + 0.25 < Math.min(w.h, this.cut)) {
        for (const side of [1, -1]) {
          const p = P(at, side * (w.t / 2 + 0.02), y0 + o.h + 0.15);
          out.push(this.box(`opening ${o.id} sign`, p.x, p.y, p.z, 0.36, 0.16, 0.03, yaw, this.mat('sign', RING_TINT[lv] ?? '#ffffff', 1, 0.5)));
        }
      }
      if (set.door.vision && e.leaf === 'solid') out.push(this.box(`opening ${o.id} vision`, c[0], y0 + Math.min(hgt, 1.5), c[1], Math.min(0.25, o.w / 4), 0.6, 0.1, yaw, this.glassMat({ kind: 'clear' })));
    }
    if (lines.length) {
      const colors = lines.map((l, i) => l.map(() => Color4.FromHexString(`${colours[i]!}ff`)));
      out.push(CreateLineSystem(`opening ${o.id} marks`, { lines, colors }, this.scene));
    }
    return [out, [w.level]];
  }

  /** Glass by its kind: clear, frosted (milky, nearly opaque), wired, tinted (ON9). */
  private glassMat(g: GlassData): StandardMaterial {
    const k = g.kind ?? 'clear';
    if (k === 'frosted') return this.mat('glass', '#eef3f6', 0.75, 0.2);
    if (k === 'tinted') return this.mat('glass', '#4a6070', 0.5, 0.1);
    if (k === 'wired') return this.mat('glass', '#b8d0dc', 0.45, 0.15);
    return this.mat('glass', '#9fd3ff', 0.3, 0.15);
  }

  /**
   * A stair as the game's walk test builds it (ON2 decision 4): the shared layout (src/world/maps/stairs.ts) gives the
   * flights and landings; each step is a box from the flight's low end up to its tread, as LevelBuilder.stairs draws.
   */
  private buildStair(s: Stair): [Mesh[], string[]] {
    const f0 = this.floorOf(s.from);
    const mat = this.mat('stair', '#d9d4c7');
    const parts: Mesh[] = [];
    let lay: ReturnType<typeof stairLayout> | null;
    try {
      lay = stairLayout(this.data, { ...s, risers: s.risers ?? Math.max(2, Math.round((this.floorOf(s.to) - f0) / STAIR_FACTS.riserHeight)) });
    } catch {
      lay = null; // a level that is gone mid-edit: nothing to draw
    }
    for (const fl of lay?.flights ?? []) {
      const n = Math.max(1, Math.round(fl.steps));
      const sd = fl.len / n;
      const sh = fl.rise / n;
      const fx = Math.sin(fl.yaw);
      const fz = Math.cos(fl.yaw);
      for (let i = 0; i < n; i++) {
        const along = -fl.len / 2 + sd * (i + 0.5);
        const hgt = sh * (i + 1);
        // yaw 0 climbs +z: the step box is w across (x) by sd along (z), turned by the flight's yaw
        parts.push(this.box(`stair ${s.id}`, fl.c[0] + fx * along, fl.y + hgt / 2, fl.c[1] + fz * along, fl.w, Math.max(hgt, 0.02), sd, fl.yaw, mat));
      }
    }
    for (const l of lay ? [...(lay.landing ? [lay.landing] : []), ...lay.landings] : []) {
      const [x0, z0, x1, z1] = l.rect;
      parts.push(this.box(`stair ${s.id}`, (x0 + x1) / 2, l.top - 0.15, (z0 + z1) / 2, x1 - x0, 0.3, z1 - z0, 0, mat));
    }
    if (!parts.length) return [[], [s.from, s.to]];
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

  /** ON4: an object as a box of its real size and base on its level; see-through ones drawn see-through. */
  private buildObject(o: Obj): [Mesh[], string[]] {
    const f = this.floorOf(o.level);
    const [x0, z0, x1, z1] = o.rect;
    const tint = this.stealth ? (stealthTint(o) ?? '#d0d0d0') : null;
    const group = presetOf(o.preset)?.group ?? 'other';
    const hex = tint ?? OBJ_HEX[group];
    const mat = this.mat(`object ${hex}${o.seeThrough ? ' see' : ''}`, hex, o.seeThrough ? 0.45 : 1, tint ? 0.35 : 0);
    const m = this.box(`object ${o.id}`, (x0 + x1) / 2, f + o.y + o.h / 2, (z0 + z1) / 2, x1 - x0, o.h, z1 - z0, 0, mat);
    return [[m], [o.level]];
  }

  /**
   * ON5: a climb piece or exterior feature at its real heights (absolute y; drawn on the level it was placed from):
   * a point piece as a thin post, a drawn one as a bar along its line, `depth` (or its section) across. Climbable pieces
   * are drawn green, the rest steel grey.
   */
  private buildExterior(x: Ext): [Mesh[], string[]] {
    const lv = x.level && this.data.levels.some((l) => l.id === x.level) ? x.level : (this.data.levels.reduce<Level | null>((a, l) => (!a || Math.abs(l.floor) < Math.abs(a.floor) ? l : a), null)?.id ?? '');
    const mat = this.mat(`exterior ${x.climbable ? 'climb' : 'plain'}`, x.climbable ? '#2f9e57' : '#6d7378', x.kind === 'fence' ? 0.55 : 1);
    const h = Math.max(0.05, x.y1 - x.y0);
    const y = (x.y0 + x.y1) / 2;
    const dx = x.b[0] - x.a[0];
    const dz = x.b[1] - x.a[1];
    const len = Math.sqrt(dx * dx + dz * dz);
    const across = x.kind === 'duct' || x.kind === 'fire-escape' ? (x.size?.[0] ?? 0.3) : x.kind === 'fence' ? 0.06 : x.kind === 'pipe' ? 0.12 : Math.max(0.05, x.depth ?? 0.12);
    let m: Mesh;
    if (len < 1e-6) {
      const w = x.kind === 'vent' ? (x.size?.[0] ?? 0.6) : x.kind === 'lamp-post' ? (x.size?.[0] ?? 0.15) : 0.12;
      const ns = x.facing === 'N' || x.facing === 'S';
      m = this.box(`exterior ${x.id}`, x.a[0], y, x.a[1], x.kind === 'vent' && !ns ? 0.05 : w, h, x.kind === 'vent' && ns ? 0.05 : w, 0, mat);
    } else m = this.box(`exterior ${x.id}`, (x.a[0] + x.b[0]) / 2, y, (x.a[1] + x.b[1]) / 2, len, x.kind === 'pipe' ? 0.12 : h, across, EditorScene.yaw(dx, dz), mat);
    return [[m], [lv]];
  }

  /** ON5: the finish view on or off: every room floor is rebuilt with its tint. */
  setFinishView(on: boolean): void {
    if (on === this.finishView) return;
    this.finishView = on;
    this.refresh(this.data.rooms.map((r) => keyOf('rooms', r.id)));
  }

  /** How many room floors are drawn with a finish tint (the e2e reads it). */
  get finishTinted(): number {
    if (!this.finishView) return 0;
    return this.data.rooms.filter((r) => {
      const f = finishOf(r.finish as string | undefined);
      const m = this.nodes.get(keyOf('rooms', r.id))?.[0]?.material as StandardMaterial | null | undefined;
      return !!f && !!m && m.diffuseColor.toHexString().toLowerCase() === f.tint;
    }).length;
  }

  /** ON4: the stealth view on or off: every object is rebuilt with its tint. */
  setStealth(on: boolean): void {
    if (on === this.stealth) return;
    this.stealth = on;
    this.refresh((this.data.objects ?? []).map((o) => keyOf('objects', o.id)));
  }

  /** How many objects are drawn with a stealth tint (the e2e reads it). */
  get stealthTinted(): number {
    if (!this.stealth) return 0;
    return (this.data.objects ?? []).filter((o) => {
      const m = this.nodes.get(keyOf('objects', o.id))?.[0]?.material as StandardMaterial | null | undefined;
      const t = stealthTint(o);
      return !!m && !!t && m.diffuseColor.toHexString().toLowerCase() === t;
    }).length;
  }

  private buildVoid(v: Void): [Mesh[], string[]] {
    const f = this.floorOf(v.level);
    const [x0, z0, x1, z1] = v.rect;
    const m = this.box(`void ${v.id}`, (x0 + x1) / 2, f + 0.01, (z0 + z1) / 2, x1 - x0, 0.02, z1 - z0, 0, this.mat('void', '#202428', 0.35));
    return [[m], [v.level]];
  }

  /**
   * ON10: a roof from the shared geometry (kestrelRoofs.ts): its planes as one double-sided mesh, the end walls and
   * glazing under it, parapets or upstands, fascia, gutters and downpipes. Drawn at its eaves height on its level.
   */
  private buildRoof(r: Roof): [Mesh[], string[]] {
    const sh = roofShape(r);
    const out: Mesh[] = [];
    const poly = (name: string, planes: readonly RoofPlane[], mat: StandardMaterial): void => {
      if (!planes.length) return;
      const pos: number[] = [];
      const idx: number[] = [];
      for (const p of planes) {
        const i0 = pos.length / 3;
        for (const q of p.pts) pos.push(q[0], q[1], q[2]);
        for (let i = 1; i + 1 < p.pts.length; i++) idx.push(i0, i0 + i, i0 + i + 1);
      }
      const nrm: number[] = [];
      VertexData.ComputeNormals(pos, idx, nrm);
      const vd = new VertexData();
      vd.positions = pos;
      vd.indices = idx;
      vd.normals = nrm;
      const m = new Mesh(name, this.scene);
      vd.applyToMesh(m);
      m.material = mat;
      out.push(m);
    };
    const two = (name: string, hex: string, alpha = 1): StandardMaterial => {
      const m = this.mat(`${name}2`, hex, alpha);
      m.backFaceCulling = false;
      return m;
    };
    poly(`roof ${r.id}`, sh.planes.filter((p) => p.kind === 'roof'), two('roof', roofHex(r)));
    poly(`roof ${r.id} ends`, sh.planes.filter((p) => p.kind === 'end'), two('roof-end', '#b9b6ae'));
    poly(`roof ${r.id} glass`, sh.planes.filter((p) => p.kind === 'glass'), two('roof-glass', '#9fd3ff', 0.45));
    const box = (b: RoofBox, i: number): void => {
      const m = this.box(`roof ${r.id} trim ${i}`, b.c[0], b.c[1], b.c[2], b.s[0], b.s[1], b.s[2], b.yaw, this.mat('roof-trim', b.colour));
      m.rotation.x = b.pitch;
      out.push(m);
    };
    [...roofParapets(r).map((p) => p.box), ...roofTrim(r, this.floorOf(this.data.levels.find((l) => l.id === 'G')?.id ?? r.level))].forEach(box);
    return [out, [r.level]];
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
        let st = elementState(s, this.data.levels, this.level, meta.levels, meta.building);
        // ON10: with Cut walls at on, a roof above the cut is hidden (a gatehouse roof drawn on Ground hides its rooms)
        if (st !== 'hidden' && meta.key.startsWith('roofs:') && this.cut < Infinity) {
          const rf = this.model.get<Roof>('roofs', meta.key.slice(6));
          if (rf && rf.base > this.floorOf(this.level) + this.cut) st = 'hidden';
        }
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

  private group: Key[] = [];
  /** ON3 multi-select: every member outlined as the selection is. */
  setGroup(keys: readonly Key[]): void {
    for (const k of this.group) if (k !== this.selected) this.outline(k, false);
    this.group = keys.slice();
    for (const k of this.group) this.outline(k, true);
  }

  setSelected(key: Key | null): void {
    if (this.selected) this.outline(this.selected, false);
    this.selected = key;
    if (key) this.outline(key, true);
  }

  private outline(key: Key, on: boolean): void {
    for (const m of this.nodes.get(key) ?? []) {
      if (m.getClassName() === 'LinesMesh') continue;
      m.renderOutline = on;
      m.outlineColor = new Color3(1, 0.45, 0);
      m.outlineWidth = 0.06;
    }
  }

  private outlineMeshes: Mesh[] = [];
  /**
   * Hub > Levels > Edit building outlines (ON2 decision 9): every building footprint as an orange frame on the ground and
   * the site as a blue one, drawn while the mode is on.
   */
  setOutlines(on: boolean): void {
    for (const m of this.outlineMeshes) m.dispose();
    this.outlineMeshes = [];
    if (!on) return;
    const frame = (name: string, r: readonly number[], mat: StandardMaterial): void => {
      const [x0, z0, x1, z1] = r as [number, number, number, number];
      const y = 0.08;
      const t = 0.25;
      for (const [cx, cz, sx, sz] of [[(x0 + x1) / 2, z0, x1 - x0, t], [(x0 + x1) / 2, z1, x1 - x0, t], [x0, (z0 + z1) / 2, t, z1 - z0], [x1, (z0 + z1) / 2, t, z1 - z0]] as const) {
        const m = this.box(name, cx, y, cz, sx, 0.16, sz, 0, mat);
        m.isPickable = false;
        m.renderingGroupId = 1;
        this.outlineMeshes.push(m);
      }
    };
    if (this.data.meta.site) frame('site outline', this.data.meta.site, this.mat('site-outline', '#0a84ff', 0.9, 0.6));
    for (const b of this.data.meta.buildings ?? []) frame(`building ${b.id} outline`, b.footprint, this.mat('building-outline', '#ff7300', 0.9, 0.6));
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
    // ON11: a stamp ghost needs more boxes than the pool: it grows to the list (made once, then reused)
    const want = Math.min(MARK_MAX, Math.max(MARK_POOL, ms.length));
    if (this.markMeshes.length < want)
      for (let i = this.markMeshes.length; i < want; i++) {
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
