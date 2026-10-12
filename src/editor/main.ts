/**
 * Kestrel level editor (dev only: `npm run editor`, docs/kestrel/editor.md). Fly or walk the campus in 3D, edit rooms,
 * walls, doors and windows in 3D or on the live floor plan, see the Kestrel checks update, and save the campus file,
 * the plan images and a change log for review. Never part of the game build.
 */
import { actionForKey, helpRows, hintItems, keyId } from './actions';
import { RING_NAMES } from './card';
import type { Ctx, Group } from './actions';
import { CameraControls } from './controls';
import type { OrbitState } from './orbit';
import { ORBIT, poseAngles, type CamPose } from './orbit';
import { PadControl } from './padControl';
import { padWords } from './pad';
import { linkedEdit, linkedWords, ROOM_OPTIONS, SPLIT_MIN, splitRoom, wallsForRoom } from './roomWalls';
import type { RoomWallOption } from './roomWalls';
import { clearDraft, makeDraft, readDraft, shouldOffer, writeDraft } from './draft';
import type { Draft } from './draft';
import { EditorScene } from './scene3d';
import { buildingAt, editingForced, GAP_MAX, parseVis, presetPicks } from './visibility';
import type { LevelPreset } from './visibility';
import { campusText, EditorModel, localTime, logMarkdown } from './model';
import type { Change, JournalEntry } from './model';
import { closeGap, fmt, gapWords, joinedCampus, joinPieces, moveWords, nearestWall, normRect, pieceObb, projectOnWall, setEdge, snap, wallDir, wallGaps, wallJoins, wallLen, wallPieces, wallPoint } from './geometry';
import type { Edge, Obb, WallGap } from './geometry';
import { GameWalk, type WalkReport, type WalkSpawn } from './gameWalk';
import { deleteChanges, describeChange, describeEdit, DOOR_NAMES, label, newOpening, newRoom, newWall, OPENING_DEFAULTS, OPENING_TYPES, ROOM_KINDS, WALL_KINDS, withBetween } from './ops';
import { WallChain } from './chain';
import { centreOpening, edgeSnap, liveOpening, liveRoom, liveWall } from './liveSizes';
import type { LiveInfo, LiveShape } from './liveSizes';
import type { Campus, Coll, Elem, Key, Ladder, Level, Opening, Pt, Rect, Room, Stair, Void, Wall } from './types';
import { keyOf, parseKey } from './types';
import { fitStair, HOLE_KINDS, HOLE_NAMES, holeId, ladderId, newHole, proposeLadder, proposeStair, STAIR_TYPES, stairFit, stairId, stairType, stairTypeOf, stairwellLink, turnClimb, withStairType } from './vertical';
import type { StairTypeId } from './vertical';
import { addLevel, countWords, deleteLevel, duplicateLevel, idProblem, levelContents, moveBuildingEdge, refCount, renameChanges, storeyChange, wallsAtHeight } from './levels';

type Tool = 'select' | 'room' | 'wall' | 'door' | 'window' | 'stair' | 'ladder' | 'hole';
/** How far the Ladder tool looks for a wall to stand against (as the door ghost's reach). */
const LADDER_REACH = 1.2;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;


/** View preferences (layout, levels, panel); not a save, so localStorage is allowed (ED2 rules). */
const PREFS = 'kestrel-editor-ui';
type Layout = '3d' | 'both' | 'plan';
interface Prefs {
  layout: Layout;
  split: 'row' | 'col';
  swap: boolean;
  frac: number;
  pinned: boolean;
  drawer: boolean;
  minimap: boolean;
  vis: unknown;
}
function loadPrefs(): Prefs {
  const p: Prefs = { layout: 'both', split: 'row', swap: false, frac: 0.58, pinned: true, drawer: true, minimap: true, vis: null };
  try {
    const r = JSON.parse(localStorage.getItem(PREFS) ?? 'null') as Partial<Prefs> | null;
    if (r && typeof r === 'object') {
      if (r.layout === '3d' || r.layout === 'both' || r.layout === 'plan') p.layout = r.layout;
      if (r.split === 'row' || r.split === 'col') p.split = r.split;
      if (typeof r.frac === 'number' && r.frac >= 0.15 && r.frac <= 0.85) p.frac = r.frac;
      for (const k of ['swap', 'pinned', 'drawer', 'minimap'] as const) if (typeof r[k] === 'boolean') p[k] = r[k];
      p.vis = r.vis;
    }
  } catch {
    // no storage (private window): defaults
  }
  return p;
}

/** A dashed shape the pad draws over the plan: a line (an edge, a wall, an opening) or a ring (a point). */
export type PlanShape = LiveShape | { kind: 'ring'; p: Pt };

async function loadFile(): Promise<{ data: Campus; text: string; mtime: number }> {
  const res = await fetch('/__editor/campus', { cache: 'no-store' });
  if (!res.ok) throw new Error(`could not load the campus file (${res.status})`);
  const text = await res.text();
  return { data: JSON.parse(text) as Campus, text, mtime: Number(res.headers.get('x-mtime') ?? 0) };
}

async function boot(): Promise<void> {
  const f = await loadFile();
  const ed = new Editor(f.data);
  // exposed for the e2e smoke test and console poking (dev tool only)
  (window as unknown as { __editor: Editor }).__editor = ed;
  try {
    const d = await readDraft();
    if (shouldOffer(d, f.text, f.mtime)) ed.offerDraft(d);
    else if (d) await clearDraft();
  } catch (err) {
    console.warn('draft store unavailable', err);
  }
}

interface Drag {
  coll: Coll;
  id: string;
  handle: string | null;
  before: Elem;
  start: Pt;
  planeY: number;
  moved: boolean;
  sx: number;
  sy: number;
  source: '3d' | 'plan' | 'pad';
  /** A new element being drawn (room or wall tool). */
  isNew: boolean;
  /** Walls follow rooms (ED3-3a): the linked changes now previewed (befores are the data at the drag's start). */
  linked?: Change[];
  /** Why the linked edit cannot be done at this spot, if it cannot. */
  refused?: string;
  /** Words of the last linked preview (moved, stretched, neighbours). */
  linkedText?: string;
  /** The rect and setting the linked preview was made for (the work is skipped while they do not change). */
  linkedKey?: string;
}

export class Editor {
  readonly model: EditorModel;
  readonly view: EditorScene;
  readonly controls: CameraControls;
  tool: Tool = 'select';
  selected: Key | null = null;
  drag: Drag | null = null;
  wallTemplate: Wall | null = null;
  /** Wall chains (ON1): the Wall tool's finished segments while drawing; the segment being drawn is the drag. */
  readonly chain: WallChain;
  private planTimer = 0;
  private checkTimer = 0;
  private planSeq = 0;
  private planLevel = '';
  private planViewBox: number[] | null = null;
  private planMap: number[] | null = null;
  private baseline: Set<string> | null = null;
  tab: 'props' | 'checks' | 'log' | 'pad' = 'props';
  pad: PadControl | null = null;
  /** Walk test as the player (ED2 Part B): the game in an iframe over the editor. */
  readonly walk = new GameWalk({ ready: (r) => this.walkReady(r), back: (r) => this.walkBack(r), failed: (why) => this.walkFailed(why) });
  /** The orbit's tilt and zoom before the game walk (the way back keeps them). */
  private walkFrom: { pitch: number; dist: number; selected: Key | null } | null = null;
  lastChecks: CheckReply | null = null;
  private hoverAt = 0;
  private hoverKey: Key | null = null;
  readonly prefs = loadPrefs();
  private planFullBox: number[] | null = null;
  private draftTimer = 0;

  /** The Stair tool's type and the Floor hole tool's kind (the tool bar's lists, D-pad left / right with the tool). */
  stairTypeId: StairTypeId = 'main-dogleg';
  holeKind = 'liftshaft';
  /**
   * The Stair tool (ON2): A at the start corner ('aim': the dot points the climb, the proposal follows), A again ('proposed':
   * the ghost holds still with its words), A accepts, B cancels. The proposal is previewed in the model as a real stair.
   */
  stairDraw: { level: string; start: Pt; id: string; phase: 'aim' | 'proposed'; words: string; key: string; ok: boolean } | null = null;
  /** Hub > Levels > Edit building outlines: the outlines are drawn in 3D and their edges are rows on the Levels tab. */
  outlines = false;

  constructor(data: Campus) {
    this.model = new EditorModel(data);
    // ON2: a stair's stairwell moves, resizes and goes with it in the same edit
    this.model.link = stairwellLink;
    this.chain = new WallChain(this.model);
    const canvas = $<HTMLCanvasElement>('c');
    this.view = new EditorScene(canvas, this.model);
    this.controls = new CameraControls(this.view.camera, canvas, () => !isTyping());
    this.view.level = data.levels.some((l) => l.id === 'G') ? 'G' : (data.levels[0]?.id ?? '');
    this.view.vis = parseVis(this.prefs.vis);
    if (this.view.vis.building !== 'all' && this.view.vis.building !== 'site' && !data.meta.buildings?.some((b) => b.id === this.view.vis.building)) this.view.vis.building = 'all';
    this.view.rebuildAll();
    this.renderHelp();
    this.bindLayout();
    this.applyLayout();
    const site = data.meta.site ?? [0, 0, 100, 80];
    this.controls.overlook((site[0] + site[2]) / 2, (site[1] + site[3]) / 2, 0, 90);
    this.view.scene.onBeforeRenderObservable.add(() => {
      this.controls.update(Math.min(0.05, this.view.engine.getDeltaTime() / 1000));
      this.drawCameraMarker();
    });
    new ResizeObserver(() => this.view.engine.resize()).observe($('view3d'));

    this.model.onChange((keys) => this.changed(keys));
    this.buildToolbar();
    this.pad = new PadControl(this);
    this.bind3d(canvas);
    this.bindPlan();
    this.bindKeys();
    this.rebuildBlockers();
    this.refreshPlan(true);
    this.runChecks(true);
    this.renderPanel();
    this.updateHint();
    this.status(`Loaded ${data.rooms.length} rooms, ${data.walls.length} walls, ${data.openings.length} openings on ${data.levels.length} levels. H shows the keys, V changes the view.`);
    window.addEventListener('beforeunload', (e) => {
      if (this.model.dirty) e.preventDefault();
    });
  }

  // ---------- small helpers ----------
  /** The editing grid: Settings > Grid (ON0b: 0.1 m by default; the file's meta.grid is no longer read). */
  get grid(): number {
    return this.pad?.settings.grid ?? 0.1;
  }

  /** The mouse's Ctrl grid: the map's object grid, never coarser than the editing grid. */
  get fineGrid(): number {
    return Math.min(this.grid, this.model.data.meta.objectGrid ?? 0.1);
  }

  levelOf(coll: Coll, e: Elem): string {
    if (coll === 'openings') return this.model.get<Wall>('walls', (e as Opening).wall)?.level ?? '';
    if (coll === 'stairs' || coll === 'ladders') return (e as Stair).from;
    return (e as Room).level;
  }

  floor(level = this.view.level): number {
    return this.view.floorOf(level);
  }

  /** A level's floor as drawn in 3D (lifted in exploded view). Data always uses floor(). */
  viewFloor(level = this.view.level): number {
    return this.view.floorOf(level) + this.view.offsetOf(level);
  }

  /** Building of an element (rooms say it; the rest by where they sit), for the building filter on the plan. */
  buildingOf(coll: Coll, e: Elem): string {
    if (coll === 'rooms' && (e as Room).building) return (e as Room).building!;
    const [x, z] = this.centreOf(coll, e);
    return buildingAt(this.model.data.meta.buildings, x, z);
  }

  /** What the editor is doing now, for the hint bar and key dispatch. */
  ctx(): Ctx {
    if (this.pad?.hub.isOpen) return 'hub';
    if (this.pad?.menuOpen) return 'menu';
    if (this.chaining) return 'chain';
    if (this.drag) return 'drag';
    if (this.tool !== 'select') return 'draw';
    if (this.selected && this.pad?.cardEditing) return 'card';
    return this.selected ? 'selected' : 'idle';
  }

  /** A plan point for an element: the centre of its rect, its wall's middle, its spot. */
  centreOf(coll: Coll, e: Elem): Pt {
    if (coll === 'walls') return wallPoint(e as Wall, wallLen(e as Wall) / 2);
    if (coll === 'openings') {
      const w = this.model.get<Wall>('walls', (e as Opening).wall);
      return w ? wallPoint(w, (e as Opening).at) : [0, 0];
    }
    if (coll === 'ladders') return (e as Ladder).at;
    const r = (e as Room).rect;
    return [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
  }

  status(text: string): void {
    $('status').textContent = text;
  }

  // ---------- model changes ----------
  private changed(keys: Key[]): void {
    // a level or building edit moves floors and outlines: rebuild the 3D and the level lists
    if (keys.some((k) => k.startsWith('levels:') || k.startsWith('buildings:'))) {
      this.view.rebuildAll();
      this.refreshLevelLists();
      if (!this.model.data.levels.some((l) => l.id === this.view.level)) this.setLevel(this.model.data.levels.find((l) => l.id === 'G')?.id ?? this.model.data.levels[0]?.id ?? '');
      this.view.setOutlines(this.outlines);
      this.pad?.hub.render();
    } else this.view.refresh(keys);
    if (this.selected && !this.selectedElem()) this.select(null);
    this.updateHandles();
    this.rebuildBlockers();
    this.schedulePlan();
    this.scheduleChecks();
    if (!this.drag) this.renderPanel();
    this.updateBar();
  }

  selectedElem(): { coll: Coll; id: string; e: Elem } | null {
    const p = this.selected ? parseKey(this.selected) : null;
    const e = p ? this.model.get(p.coll, p.id) : undefined;
    return p && e ? { ...p, e } : null;
  }

  select(key: Key | null): void {
    this.selected = key;
    this.view.setSelected(key);
    const s = this.selectedElem();
    if (s?.coll === 'walls') this.wallTemplate = s.e as Wall;
    this.updateHandles();
    this.highlightPlan();
    if (key) this.tab = 'props';
    this.renderPanel();
    this.updateHint();
  }

  /** Commits one edit; with `merge` (selection card steps) a quick next step on the same row joins it (model.commit). */
  commit(changes: Change[], merge?: Merge): void {
    this.commitText(describeEdit(this.model.data, changes), changes, merge);
  }

  /** Commits one edit with its own words (room tool walls, linked edits, Split). */
  commitText(text: string, changes: Change[], merge?: Merge): void {
    if (this.model.commit(text, changes, merge)) {
      this.status(text);
      this.scheduleDraft();
    }
  }

  /** What the room tool makes around a room (the list beside the Room button; the Build tab's Room tiles). */
  roomOption: RoomWallOption = 'walls';

  setRoomOption(o: RoomWallOption): void {
    this.roomOption = o;
    const sel = document.getElementById('roomOpt') as HTMLSelectElement | null;
    if (sel) sel.value = o;
  }

  // ---------- Split (ED3-3a): a line across the selected room ----------
  /** The room being split and the line's direction (x: the line x = v; z: the line z = v); null when not splitting. */
  splitting: { id: string; axis: 'x' | 'z' } | null = null;

  startSplit(): void {
    const s = this.selectedElem();
    if (!s || s.coll !== 'rooms') return this.status('Select a room to split');
    if (this.drag) this.endDrag(true);
    const r = (s.e as Room).rect;
    // across the longer side by default
    this.splitting = { id: s.id, axis: r[2] - r[0] >= r[3] - r[1] ? 'x' : 'z' };
    this.status('Split: move the dot, A places the line, RB turns it, B cancels (mouse: click places it, Esc cancels)');
    this.updateHint();
  }

  splitTurn(): void {
    if (this.splitting) this.splitting.axis = this.splitting.axis === 'x' ? 'z' : 'x';
  }

  cancelSplit(): void {
    if (!this.splitting) return;
    this.splitting = null;
    this.status('Split cancelled');
    this.updateHint();
  }

  /** The split line through (x, z) on the grid, its ends, and why it cannot go there (if it cannot). */
  splitLine(x: number, z: number): { axis: 'x' | 'z'; v: number; a: Pt; b: Pt; why?: string } | null {
    const sp = this.splitting;
    const room = sp ? this.model.get<Room>('rooms', sp.id) : undefined;
    if (!sp || !room) return null;
    const [x0, z0, x1, z1] = room.rect;
    const v = snap(sp.axis === 'x' ? x : z, this.grid);
    const [lo, hi] = sp.axis === 'x' ? [x0, x1] : [z0, z1];
    const why = v - lo < SPLIT_MIN - 1e-6 || hi - v < SPLIT_MIN - 1e-6 ? 'Too close to the edge' : undefined;
    return sp.axis === 'x' ? { axis: 'x', v, a: [v, z0], b: [v, z1], why } : { axis: 'z', v, a: [x0, v], b: [x1, v], why };
  }

  /** Places the split line through (x, z); false when it cannot (the status says why). */
  splitAt(x: number, z: number): boolean {
    const sp = this.splitting;
    const l = this.splitLine(x, z);
    if (!sp || !l) return false;
    if (l.why) {
      this.status(l.why);
      return false;
    }
    const room = this.model.get<Room>('rooms', sp.id)!;
    const res = splitRoom(this.model.data, sp.id, l.axis, l.v, this.roomOption);
    if (res.refused || !res.newRoom) {
      this.status(res.refused ?? 'Cannot split here');
      return false;
    }
    const name = room.name || room.id;
    const wall = res.wallLen > 0 ? ` with a ${fmt(res.wallLen)} m wall` : '';
    this.splitting = null;
    this.commitText(`Split ${name} into ${name} and ${res.newRoom.name ?? ''}${wall}`, res.changes);
    this.select(keyOf('rooms', sp.id));
    this.updateHint();
    return true;
  }

  // ---------- handles ----------
  handlesFor(): { id: string; x: number; z: number; y: number }[] {
    const s = this.selectedElem();
    if (!s || this.tool !== 'select') return [];
    const lvl = this.levelOf(s.coll, s.e);
    const f = this.viewFloor(lvl);
    if (s.coll === 'rooms' || s.coll === 'stairs' || s.coll === 'voids') {
      const r = (s.e as Room).rect;
      const cx = (r[0] + r[2]) / 2;
      const cz = (r[1] + r[3]) / 2;
      const hs = [
        { id: 'W', x: r[0], z: cz, y: f + 0.3 },
        { id: 'E', x: r[2], z: cz, y: f + 0.3 },
        { id: 'S', x: cx, z: r[1], y: f + 0.3 },
        { id: 'N', x: cx, z: r[3], y: f + 0.3 },
      ];
      // ON2: a stair's arrow handle, a third of the way along the climb from the centre: a click turns the climb 90 degrees
      if (s.coll === 'stairs') {
        const d = ({ N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] } as Record<string, [number, number]>)[(s.e as Stair).up] ?? [0, 1];
        hs.push({ id: 'turn', x: cx + (d[0] * (r[2] - r[0])) / 3, z: cz + (d[1] * (r[3] - r[1])) / 3, y: f + 0.6 });
      }
      return hs;
    }
    if (s.coll === 'walls') {
      const w = s.e as Wall;
      return [
        { id: 'a', x: w.a[0], z: w.a[1], y: f + w.h + 0.3 },
        { id: 'b', x: w.b[0], z: w.b[1], y: f + w.h + 0.3 },
      ];
    }
    if (s.coll === 'openings') {
      const o = s.e as Opening;
      const w = this.model.get<Wall>('walls', o.wall);
      if (!w) return [];
      const lo = wallPoint(w, o.at - o.w / 2);
      const hi = wallPoint(w, o.at + o.w / 2);
      const y = f + o.sill + o.h / 2;
      return [
        { id: 'l', x: lo[0], z: lo[1], y },
        { id: 'r', x: hi[0], z: hi[1], y },
      ];
    }
    return [];
  }

  updateHandles(): void {
    this.view.setHandles(this.handlesFor());
    this.drawPlanOverlay();
  }

  // ---------- dragging (shared by 3D and plan) ----------
  beginDrag(coll: Coll, id: string, handle: string | null, start: Pt, planeY: number, sx: number, sy: number, source: '3d' | 'plan' | 'pad', isNew = false): void {
    const before = this.model.snapshot(coll, id);
    if (!before) return;
    // the stair's arrow handle is a click, not a drag
    if (coll === 'stairs' && handle === 'turn') return this.turnStairClimb();
    this.drag = { coll, id, handle, before, start, planeY, moved: isNew, sx, sy, source, isNew };
    this.updateHint();
  }

  /** The element as it would be with the pointer at (x, z). */
  dragged(d: Drag, x: number, z: number, fine: boolean): Elem {
    const g = fine ? this.fineGrid : this.grid;
    const e = clone(d.before) as Elem & Record<string, unknown>;
    const dx = snap(x - d.start[0], g);
    const dz = snap(z - d.start[1], g);
    if (d.coll === 'rooms' || d.coll === 'stairs' || d.coll === 'voids') {
      const r = (d.before as Room).rect;
      // ON1 decision 7: the moving edges snap to wall lines, wall faces and other room edges (LB / Ctrl: off)
      const lv = (d.before as Room).level;
      // (the walls this drag moves along, previewed, are skipped: an edge never snaps onto its own wall)
      const moving = new Set((d.linked ?? []).map((c) => `${c.coll}:${c.id}`));
      const near = normRect(d.isNew ? [r[0], r[1], x, z] : r);
      const es = (v: number, edge: Edge): number => {
        if (fine || d.coll !== 'rooms') return v;
        const span: [number, number] = edge === 'W' || edge === 'E' ? [near[1], near[3]] : [near[0], near[2]];
        return edgeSnap(v, edge, lv, (this.model.list('walls') as Wall[]).filter((w) => !moving.has(`walls:${w.id}`)), (this.model.list('rooms') as Room[]).filter((q) => !moving.has(`rooms:${q.id}`)), d.id, span)?.v ?? v;
      };
      if (d.isNew) (e as Room).rect = normRect([r[0], r[1], es(snap(x, g), x >= r[0] ? 'E' : 'W'), es(snap(z, g), z >= r[1] ? 'N' : 'S')]);
      else if (d.handle) (e as Room).rect = setEdge(r, d.handle as Edge, es(snap(d.handle === 'W' || d.handle === 'E' ? x : z, g), d.handle as Edge), Math.max(g, 0.5));
      else (e as Room).rect = [r[0] + dx, r[1] + dz, r[2] + dx, r[3] + dz].map((v) => +v.toFixed(3)) as Rect;
      return e;
    }
    if (d.coll === 'walls') {
      const w = d.before as Wall;
      const pt: Pt = [snap(x, g), snap(z, g)];
      if (d.isNew || d.handle === 'b') (e as Wall).b = pt;
      else if (d.handle === 'a') (e as Wall).a = pt;
      else {
        (e as Wall).a = [+(w.a[0] + dx).toFixed(3), +(w.a[1] + dz).toFixed(3)];
        (e as Wall).b = [+(w.b[0] + dx).toFixed(3), +(w.b[1] + dz).toFixed(3)];
      }
      return e;
    }
    if (d.coll === 'openings') {
      const o = d.before as Opening;
      const w = this.model.get<Wall>('walls', o.wall);
      if (!w) return e;
      const L = wallLen(w);
      const s = snap(projectOnWall(w, x, z).s, g);
      if (d.handle) {
        // the far side stays put; the dragged side follows the pointer, at least 0.6 m apart
        const other = d.handle === 'l' ? o.at + o.w / 2 : o.at - o.w / 2;
        let lo = Math.min(s, other);
        let hi = Math.max(s, other);
        if (hi - lo < 0.6) {
          if (d.handle === 'l') lo = hi - 0.6;
          else hi = lo + 0.6;
        }
        lo = Math.max(0, lo);
        hi = Math.min(L, hi);
        (e as Opening).w = +(hi - lo).toFixed(3);
        (e as Opening).at = +((lo + hi) / 2).toFixed(3);
      } else (e as Opening).at = centreOpening(w, this.model.list('walls') as Wall[], s, o.w, fine).at;
      return e;
    }
    if (d.coll === 'ladders') {
      const a = (d.before as Ladder).at;
      (e as Ladder).at = [+(a[0] + dx).toFixed(3), +(a[1] + dz).toFixed(3)];
    }
    return e;
  }

  /** Walls follow rooms: the hub setting (on by default; the tool bar button for the mouse). */
  get wallsFollow(): boolean {
    return this.pad?.settings.wallsFollow ?? true;
  }

  /** The pointer moved while dragging; `turn` (the pad's RB turns) reshapes the element first. */
  moveDrag(x: number, z: number, fine: boolean, turn?: (e: Elem) => Elem): void {
    const d = this.drag;
    if (!d) return;
    let e = this.dragged(d, x, z, fine);
    if (turn) e = turn(e);
    if (d.coll !== 'rooms' || d.isNew) return this.model.preview(d.coll, e);
    // a room: the walls, neighbours and doors it takes along (a turned room leaves its walls)
    const follow = this.wallsFollow && !turn;
    const key = `${(e as Room).rect.join()}|${follow}`;
    if (key === d.linkedKey) return;
    d.linkedKey = key;
    this.unpreviewLinked(d);
    const res = linkedEdit(this.model.data, d.id, (e as Room).rect, follow);
    d.refused = res.refused;
    d.linkedText = res.refused ? '' : linkedWords(res);
    if (res.refused) {
      this.model.preview(d.coll, e);
      return;
    }
    for (const c of res.changes) {
      if (c.after) this.model.preview(c.coll, c.after);
      else this.model.drop(c.coll, c.id);
    }
    d.linked = res.changes;
  }

  /** Puts back what the last linked preview changed (to the data at the drag's start). */
  private unpreviewLinked(d: Drag): void {
    for (const c of (d.linked ?? []).slice().reverse()) {
      if (c.before) this.model.preview(c.coll, c.before);
      else this.model.drop(c.coll, c.id);
    }
    d.linked = undefined;
  }

  /** Drawing a wall (ON1): A, a click or Esc act on the chain. */
  get chaining(): boolean {
    const d = this.drag;
    return !!d && d.isNew && d.coll === 'walls';
  }

  /**
   * Wall chains (ON1 decision 1): ends the segment being drawn and starts the next from its end with the same kind and
   * thickness. A segment shorter than the grid is ignored (a click on the same spot). On the chain's first point the loop
   * closes and the chain ends.
   */
  chainNext(): void {
    const d = this.drag;
    if (!d || !this.chaining) return;
    const w = this.model.snapshot<Wall>('walls', d.id);
    if (!w || wallLen(w) < this.grid - 1e-6) return;
    this.drag = null;
    if (this.chain.add(w)) return this.finishChain(' - closed');
    const next = newWall(this.model, w.level, w.b, w.b, this.chain.walls[0]);
    this.model.preview('walls', next);
    this.beginDrag('walls', next.id, null, w.b, d.planeY, d.sx, d.sy, d.source, true);
    const n = this.chain.walls.length;
    this.status(`${n} wall${n > 1 ? 's' : ''}, ${fmt(this.chain.total)} m: A (click) next wall, X removes the last, B (Esc, right click) ends`);
  }

  /** X while drawing (ON1): the last finished segment goes; the wall being drawn starts again from its start. */
  chainRemoveLast(): void {
    const d = this.drag;
    if (!d || !this.chaining) return;
    const w = this.chain.removeLast();
    if (!w) return this.status('Nothing to remove: B ends the wall');
    const cur = this.model.snapshot<Wall>('walls', d.id);
    this.model.drop('walls', d.id);
    this.drag = null;
    const next = newWall(this.model, w.level, w.a, cur?.b ?? w.b, w);
    this.model.preview('walls', next);
    this.beginDrag('walls', next.id, null, w.a, d.planeY, d.sx, d.sy, d.source, true);
    const dn = this.drag as Drag | null;
    if (dn) dn.before = { ...next, b: w.a };
    this.status(`Removed the last wall (${this.chain.walls.length} left)`);
  }

  /** Commits the chain's finished walls as one undo step and selects the last. */
  private finishChain(extra = ''): void {
    const last = this.chain.walls[this.chain.walls.length - 1];
    const res = this.chain.finish();
    this.updateHint();
    if (!res || !last) return;
    this.commitText(res.text, res.changes);
    if (extra) this.status(`${res.text}${extra}`);
    this.select(keyOf('walls', last.id));
  }

  endDrag(cancel: boolean): void {
    const d = this.drag;
    if (!d) return;
    if (this.chaining && this.chain.walls.length) {
      // B, Esc, a right click or a tool change end the chain: the wall being drawn goes unless it is finished (not cancel)
      if (!cancel) this.chainNext();
      if (this.drag) {
        this.model.drop('walls', this.drag.id);
        this.drag = null;
      }
      this.finishChain();
      this.planGhost([], 'ghost');
      return;
    }
    this.drag = null;
    if (d.source !== 'pad') this.planGhost([], 'ghost');
    this.updateHint();
    if (cancel || !d.moved || d.refused) {
      this.unpreviewLinked(d);
      if (d.isNew) this.model.drop(d.coll, d.id);
      else this.model.preview(d.coll, d.before);
      if (d.refused && !cancel) this.status(`${d.refused} - put back`);
      this.renderPanel();
      return;
    }
    if (d.linked) {
      // one commit for the room and everything it took along (decision 13)
      const changes = d.linked;
      const room = describeChange(this.model.data, changes[0]!);
      this.commitText(d.linkedText ? `${room}; ${d.linkedText}` : room, changes);
      this.renderPanel();
      return;
    }
    let after = this.model.snapshot(d.coll, d.id);
    if (!after) return;
    if (d.isNew) {
      const tiny = d.coll === 'walls' ? wallLen(after as Wall) < this.grid - 1e-6 : (after as Room).rect[2] - (after as Room).rect[0] < this.grid - 1e-6 || (after as Room).rect[3] - (after as Room).rect[1] < this.grid - 1e-6;
      if (tiny) {
        this.model.drop(d.coll, d.id);
        this.status('Too small - drag further to draw it');
        return;
      }
      if (d.coll === 'rooms') {
        // the room tool makes its walls (decisions 4-6): one undo step
        const room = after as Room;
        this.model.drop('rooms', room.id);
        const { walls, reusedEdges } = wallsForRoom(this.model.data, room, this.roomOption);
        const size = `${fmt(room.rect[2] - room.rect[0])} x ${fmt(room.rect[3] - room.rect[1])} m`;
        const extra = walls.length ? ` with ${walls.length} wall${walls.length > 1 ? 's' : ''}${reusedEdges ? ` (${reusedEdges === 1 ? 'one side' : `${reusedEdges} sides`} already walled)` : ''}` : '';
        this.commitText(`Added ${room.name || 'room'} ${size}${extra}`, [{ coll: 'rooms', id: room.id, before: null, after: room }, ...walls.map((w): Change => ({ coll: 'walls', id: w.id, before: null, after: w }))]);
      } else this.commit([{ coll: d.coll, id: d.id, before: null, after }]);
      this.select(keyOf(d.coll, d.id));
      return;
    }
    if (d.coll === 'openings') after = withBetween(this.model, after as Opening);
    this.commit([{ coll: d.coll, id: d.id, before: d.before, after }]);
    this.renderPanel();
  }

  /** The mouse button comes up while dragging: a drawn wall continues the chain (ON1), anything else drops. */
  private release(): void {
    if (this.chaining) return this.chainNext();
    this.endDrag(false);
  }

  // ---------- tools (shared by 3D and plan) ----------
  /** Pointer down with a drawing tool at plan point (x, z). */
  toolDown(x: number, z: number, sx: number, sy: number, source: '3d' | 'plan' | 'pad', fine: boolean, onWall?: string): void {
    const g = fine ? this.fineGrid : this.grid;
    const p: Pt = [snap(x, g), snap(z, g)];
    const lvl = this.view.level;
    if (this.tool === 'room') {
      const r = newRoom(this.model, lvl, [p[0], p[1], p[0], p[1]]);
      this.model.preview('rooms', r);
      this.beginDrag('rooms', r.id, null, p, this.viewFloor(), sx, sy, source, true);
    } else if (this.tool === 'wall') {
      if (this.chaining) {
        // a click while drawing (ON1): the segment ends here and the next starts
        this.moveDrag(x, z, fine);
        return this.chainNext();
      }
      const w = newWall(this.model, lvl, p, p, this.wallTemplate ?? undefined);
      this.model.preview('walls', w);
      this.beginDrag('walls', w.id, null, p, this.viewFloor(), sx, sy, source, true);
    } else if (this.tool === 'stair') {
      this.stairStep(p);
    } else if (this.tool === 'ladder') {
      const r = proposeLadder(this.model.data, lvl, [x, z], ladderId(this.model.data), g, LADDER_REACH);
      if ('why' in r) return this.status(r.why);
      this.commitText(`Added ${r.ladder.id}: ${r.words}`, [{ coll: 'ladders', id: r.ladder.id, before: null, after: r.ladder }]);
      this.select(keyOf('ladders', r.ladder.id));
    } else if (this.tool === 'hole') {
      const v = newHole(lvl, [p[0], p[1], p[0], p[1]], this.holeKind, holeId(this.model.data, lvl));
      this.model.preview('voids', v);
      this.beginDrag('voids', v.id, null, p, this.viewFloor(), sx, sy, source, true);
    } else if (this.tool === 'door' || this.tool === 'window') {
      const w = (onWall ? this.model.get<Wall>('walls', onWall) : undefined) ?? nearestWall(this.model.list('walls') as Wall[], lvl, x, z, 1.2);
      if (!w) return this.status('Click on or next to a wall to put the opening in it');
      const type = this.tool === 'window' ? 'window' : $<HTMLSelectElement>('doorType').value;
      const width = Math.min((OPENING_DEFAULTS[type] ?? OPENING_DEFAULTS.door!).w, wallLen(w));
      const o = newOpening(this.model, w, centreOpening(w, this.model.list('walls') as Wall[], snap(projectOnWall(w, x, z).s, g), width, fine).at, type);
      this.commit([{ coll: 'openings', id: o.id, before: null, after: o }]);
      this.select(keyOf('openings', o.id));
    }
  }

  // ---------- stairs, ladders, floor holes (ON2) ----------
  /** One A (or click) with the Stair tool: start, then propose (the ghost holds), then accept. */
  stairStep(p: Pt): void {
    const sd = this.stairDraw;
    if (!sd) {
      this.stairDraw = { level: this.view.level, start: p, id: stairId(this.model.data), phase: 'aim', words: '', key: '', ok: false };
      this.aimStair(p[0], p[1] + this.grid);
      const now = this.stairDraw as { words: string } | null;
      if (now) this.status(`Stair: point the climb with the dot, A (click) shows the proposal, B cancels. ${now.words}`);
      this.updateHint();
      return;
    }
    if (sd.phase === 'aim') {
      this.aimStair(p[0], p[1]);
      if (!sd.ok) return this.status(sd.words);
      sd.phase = 'proposed';
      this.status(`${sd.words}. A (click) accepts, B (Esc) cancels`);
      return;
    }
    const st = this.model.snapshot<Stair>('stairs', sd.id);
    this.stairDraw = null;
    if (!st) return;
    const to = this.model.data.levels.find((l) => l.id === st.to)?.name ?? st.to;
    this.commitText(`Added ${st.name ?? 'stair'} (${st.id}) with its well on ${to}: ${sd.words}`, [{ coll: 'stairs', id: st.id, before: null, after: st }]);
    this.setTool('select');
    this.select(keyOf('stairs', st.id));
    this.status(`Placed: ${sd.words}`);
  }

  /** The dot (or pointer) moved while aiming a stair: the proposal follows it (previewed only when it changes). */
  aimStair(x: number, z: number): void {
    const sd = this.stairDraw;
    if (!sd || sd.phase !== 'aim') return;
    const r = proposeStair(this.model.data, sd.level, sd.start, [x, z], this.stairTypeId, sd.id, this.grid);
    if ('why' in r) {
      sd.ok = false;
      sd.words = r.why;
      if (this.model.get('stairs', sd.id)) this.model.drop('stairs', sd.id);
      sd.key = '';
      return;
    }
    sd.ok = true;
    sd.words = r.words;
    const key = JSON.stringify(r.stair);
    if (key === sd.key) return;
    sd.key = key;
    this.model.preview('stairs', r.stair);
  }

  /** B, Esc or a tool change while drawing a stair: the proposal (and its well) go. */
  cancelStair(): void {
    const sd = this.stairDraw;
    if (!sd) return;
    this.stairDraw = null;
    if (this.model.get('stairs', sd.id)) this.model.drop('stairs', sd.id);
    this.status('Stair cancelled');
    this.updateHint();
  }

  /** The Stair tool's type: D-pad left / right with the tool, the tool bar list, the Build tab's Stair tiles. */
  setStairType(id: StairTypeId): void {
    this.stairTypeId = id;
    const sel = document.getElementById('stairType') as HTMLSelectElement | null;
    if (sel) sel.value = id;
    const sd = this.stairDraw;
    if (sd?.phase === 'aim') {
      sd.key = '';
      this.aimStair(sd.start[0], sd.start[1] + this.grid);
    }
  }

  /** The Floor hole tool's kind (stairwell, lift shaft, riser, hatch, roof light). */
  setHoleKind(k: string): void {
    this.holeKind = k;
    const sel = document.getElementById('holeKind') as HTMLSelectElement | null;
    if (sel) sel.value = k;
  }

  /** The selected stair's fit in words ("Needs 1.4 m more length for 25 risers"). */
  stairWords(s: Stair): string {
    return stairFit(this.model.data, s).words;
  }

  /** Selected > Fit (ON2 decision 2): the smallest legal rect from the corner it was drawn from. */
  fitSelected(): void {
    const s = this.selectedElem();
    if (!s || s.coll !== 'stairs') return this.status('Select a stair to fit');
    const after = fitStair(this.model.data, s.e as Stair, this.grid);
    if (!after) return this.status(`Already fits: ${this.stairWords(s.e as Stair)}`);
    this.commitText(`Fitted ${label(this.model.data, 'stairs', s.e)} to ${fmt(after.rect[2] - after.rect[0])} x ${fmt(after.rect[3] - after.rect[1])} m, ${after.risers} risers`, [{ coll: 'stairs', id: s.id, before: s.e, after }]);
  }

  /** The stair's arrow handle (and Selected > Turn climb): the climb turns 90 degrees, the rect stays. */
  turnStairClimb(): void {
    const s = this.selectedElem();
    if (!s || s.coll !== 'stairs') return;
    const after = turnClimb(s.e as Stair);
    this.commit([{ coll: 'stairs', id: s.id, before: s.e, after }]);
    this.status(`Climbs ${after.up}: ${this.stairWords(after)}`);
  }

  /**
   * Renames the selected element's id (ON2 decision 10): every reference in the file follows in the same edit, on its own
   * change-log line. A taken or empty id is refused; an id out of the file's style is kept with a warning.
   */
  renameSelected(id: string): boolean {
    const s = this.selectedElem();
    if (!s) return false;
    return this.renameId(s.coll, s.id, id.trim());
  }

  renameId(coll: Coll, old: string, id: string): boolean {
    const prob = idProblem(this.model.data, coll, old, id);
    if (prob.block) {
      this.status(prob.text);
      return false;
    }
    if (id === old) return false;
    const refs = refCount(this.model.data, coll, old);
    const changes = renameChanges(this.model.data, coll, old, id);
    if (!changes.length) return false;
    const wasSel = this.selected === keyOf(coll, old);
    const editing = coll === 'levels' && this.view.level === old;
    if (editing) this.view.level = id;
    this.commitText(`Renamed ${old} to ${id}${refs ? ` (${refs} reference${refs === 1 ? '' : 's'} updated)` : ''}`, changes);
    if (wasSel) this.select(keyOf(coll, id));
    if (editing) this.setLevel(id);
    if (prob.text) this.status(`Renamed ${old} to ${id}; warning: ${prob.text}`);
    return true;
  }

  // ---------- levels (ON2 decisions 7-9) ----------
  /** Adds a level above or below the editing level, named `name`; the editing level moves to it. */
  addLevelHere(where: 'above' | 'below', name: string): void {
    const e = addLevel(this.model.data, this.view.level, where, name);
    if (!e) return;
    this.commitText(e.words, e.changes);
    if (e.id) this.setLevel(e.id);
  }

  /** Duplicates the editing level one storey up (rooms, walls, openings, objects, floor holes with new ids). */
  duplicateLevelHere(name: string): void {
    const e = duplicateLevel(this.model.data, this.view.level, name);
    if (!e) return;
    this.commitText(e.words, e.changes);
    if (e.id) this.setLevel(e.id);
  }

  /** Deletes the editing level after a confirm that lists what goes with it; the editing level drops to the one below. */
  async deleteLevelHere(): Promise<void> {
    const id = this.view.level;
    const l = this.model.data.levels.find((q) => q.id === id);
    if (!l) return;
    if (this.model.data.levels.length < 2) return this.status('The last level cannot be deleted');
    const what = countWords(levelContents(this.model.data, id));
    if (!(await this.ask(`Delete level ${l.name} (${id})? With it go ${what}.`, 'Delete', 'Keep'))) return;
    const e = deleteLevel(this.model.data, id);
    if (!e) return;
    const rest = this.model.data.levels.filter((q) => q.id !== id);
    const below = rest.filter((q) => q.floor <= l.floor).sort((a, b) => b.floor - a.floor)[0] ?? rest[0];
    this.select(null);
    if (below) this.setLevel(below.id);
    this.commitText(e.words, e.changes);
  }

  /** A new name for the editing level (its id stays; Rename id changes that). */
  renameLevelHere(name: string): void {
    const l = this.model.snapshot<Level>('levels', this.view.level);
    if (!l || !name || name === l.name) return;
    this.commitText(`Renamed level ${l.name} (${l.id}) to ${name}`, [{ coll: 'levels', id: l.id, before: l, after: { ...l, name } }]);
  }

  /**
   * A new storey height for the editing level (ON2 decision 8): the levels above move by the difference; walls that were
   * exactly the old height are offered a stretch ("47 walls were 4.2 m: stretch to 4.5 m?"). One undo step either way.
   */
  async setStoreyHeight(h: number): Promise<void> {
    const l = this.model.data.levels.find((q) => q.id === this.view.level);
    if (!l || h <= 0 || Math.abs(h - l.height) < 1e-6) return;
    const n = wallsAtHeight(this.model.data, l.id, l.height);
    const stretch = n > 0 && (await this.ask(`${n} wall${n === 1 ? ' was' : 's were'} ${fmt(l.height)} m: stretch to ${fmt(h)} m?`, 'Stretch', 'Leave them'));
    const e = storeyChange(this.model.data, l.id, h, stretch);
    if (!e) return;
    this.commitText(e.words, e.changes);
  }

  /** Hub > Levels > Edit building outlines: on / off; the outlines draw in 3D while it is on. */
  setOutlines(on: boolean): void {
    this.outlines = on;
    this.view.setOutlines(on);
  }

  /** One edge of a building outline moved one grid step (quick steps on the same edge are one undo step). */
  moveOutline(id: string, edge: 'W' | 'S' | 'E' | 'N', dir: 1 | -1): void {
    const c = moveBuildingEdge(this.model.data, id, edge, dir * this.grid, this.grid);
    if (!c.length) return;
    const r = (c[0]!.after as unknown as { footprint: Rect }).footprint;
    const i = { W: 0, S: 1, E: 2, N: 3 }[edge];
    const word = { W: 'west', S: 'south', E: 'east', N: 'north' }[edge];
    this.commitText(`Building ${id} ${word} edge to ${fmt(r[i]!)} (${fmt(r[2] - r[0])} x ${fmt(r[3] - r[1])} m)`, c, { key: `outline:${id}:${edge}`, at: performance.now() / 1000, within: 1 });
  }

  /** The editing level's and the pick menu's lists after a level is added, removed, renamed or moved. */
  refreshLevelLists(): void {
    const levels = this.model.data.levels.slice().sort((a, b) => b.floor - a.floor);
    const words = (l: { name: string; floor: number }): string => `${esc(l.name)} (${fmt(l.floor)} m)`;
    const sel = document.getElementById('level') as HTMLSelectElement | null;
    if (sel) {
      sel.innerHTML = levels.map((l) => `<option value="${esc(l.id)}">${words(l)}</option>`).join('');
      sel.value = this.view.level;
    }
    const menu = document.querySelector('#pick .menu');
    if (menu) {
      menu.innerHTML = levels.map((l) => `<label><input type="checkbox" data-level="${esc(l.id)}"> ${words(l)}</label>`).join('');
      for (const c of menu.querySelectorAll<HTMLInputElement>('input[data-level]'))
        c.addEventListener('change', () => {
          const vis = this.view.vis;
          vis.picked = [...menu.querySelectorAll<HTMLInputElement>('input[data-level]')].filter((x) => x.checked).map((x) => x.dataset.level!);
          vis.preset = 'pick';
          this.applyVis();
        });
    }
    this.syncLevelsUi();
  }

  // ---------- 3D pointer ----------
  private bind3d(canvas: HTMLCanvasElement): void {
    const local = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const [px, py] = local(e);
      const fine = e.ctrlKey;
      if (this.splitting) {
        const pt = this.view.planePoint(px, py, this.viewFloor());
        if (pt) this.splitAt(pt[0], pt[1]);
        return;
      }
      if (this.tool === 'door' || this.tool === 'window') {
        // the wall under the pointer (its face can be metres above the floor point the ray meets)
        const h = this.view.pick(px, py).hit;
        const p = h ? parseKey(h.key) : null;
        if (h && p?.coll === 'walls') return this.toolDown(h.x, h.z, e.clientX, e.clientY, '3d', fine, p.id);
      }
      if (this.tool !== 'select') {
        const pt = this.view.planePoint(px, py, this.viewFloor());
        if (pt) this.toolDown(pt[0], pt[1], e.clientX, e.clientY, '3d', fine);
        return;
      }
      const hit = this.view.pick(px, py);
      const s = this.selectedElem();
      if (hit.handle && s) {
        const h = this.handlesFor().find((q) => q.id === hit.handle);
        if (h) this.beginDrag(s.coll, s.id, hit.handle, [h.x, h.z], h.y, e.clientX, e.clientY, '3d');
        return;
      }
      if (!hit.hit) return this.select(null);
      const k = hit.hit.key;
      if (k !== this.selected) this.select(k);
      const p = parseKey(k)!;
      this.beginDrag(p.coll, p.id, null, [hit.hit.x, hit.hit.z], hit.hit.y, e.clientX, e.clientY, '3d');
    });
    canvas.addEventListener('pointermove', (e) => {
      const [px, py] = local(e);
      const d = this.drag;
      if (d && d.source === '3d') {
        if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 4) return;
        d.moved = true;
        const pt = this.view.planePoint(px, py, d.planeY);
        if (pt) this.moveDrag(pt[0], pt[1], e.ctrlKey);
        this.mouseLive();
        return;
      }
      if (this.stairDraw?.phase === 'aim') {
        const pt = this.view.planePoint(px, py, this.viewFloor());
        if (pt) this.aimStair(pt[0], pt[1]);
      }
      const now = performance.now();
      if (now - this.hoverAt < 60) return;
      this.hoverAt = now;
      this.hover(px, py);
    });
    let rightAt: [number, number] | null = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 2) rightAt = [e.clientX, e.clientY];
    });
    canvas.addEventListener('pointerup', (e) => {
      // a right click (not a look drag) ends a wall chain (ON1)
      if (e.button === 2 && rightAt && Math.abs(e.clientX - rightAt[0]) + Math.abs(e.clientY - rightAt[1]) < 5 && this.chaining) return this.endDrag(true);
      if (e.button === 0 && this.drag?.source === '3d') this.release();
    });
  }

  private hover(px: number, py: number): void {
    const hud = $('hud');
    const pt = this.view.planePoint(px, py, this.viewFloor());
    const hit = this.view.pick(px, py).hit;
    const p = hit ? parseKey(hit.key) : null;
    const e = p ? this.model.get(p.coll, p.id) : undefined;
    this.setHover(hit && e ? hit.key : null);
    const where = pt ? `x ${fmt(pt[0])}  z ${fmt(pt[1])}` : '';
    hud.textContent = `${e && p ? label(this.model.data, p.coll, e) : ''}${e && where ? '   ' : ''}${where}`;
  }

  // ---------- plan view ----------
  schedulePlan(): void {
    clearTimeout(this.planTimer);
    this.planTimer = window.setTimeout(() => this.refreshPlan(false), 250);
  }

  async refreshPlan(resetView: boolean): Promise<void> {
    const seq = ++this.planSeq;
    const level = this.view.level;
    $('planStatus').textContent = 'drawing...';
    try {
      const r = await fetch(`/__editor/plan?level=${encodeURIComponent(level)}`, { method: 'POST', body: JSON.stringify(this.model.data) });
      if (seq !== this.planSeq) return;
      if (!r.ok) {
        $('planStatus').textContent = `plan failed: ${((await r.json()) as { error?: string }).error ?? r.status}`;
        return;
      }
      const svgText = await r.text();
      if (seq !== this.planSeq) return;
      const host = $('planSvg');
      host.innerHTML = svgText;
      const svg = host.querySelector('svg');
      if (!svg) return;
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      this.planMap = (svg.getAttribute('data-map') ?? '').split(',').map(Number);
      const vb = (svg.getAttribute('viewBox') ?? '0 0 1 1').split(' ').map(Number);
      if (resetView || this.planLevel !== level || !this.planViewBox) this.planViewBox = vb;
      this.planLevel = level;
      this.planFullBox = vb;
      svg.setAttribute('viewBox', (this.isMinimap() ? vb : this.planViewBox).join(' '));
      const under = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      under.id = 'underlay';
      svg.appendChild(under);
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlay.id = 'overlay';
      svg.appendChild(overlay);
      this.decoratePlan();
      $('planStatus').textContent = '';
      this.highlightPlan();
      this.drawPlanOverlay();
    } catch (err) {
      $('planStatus').textContent = `plan failed: ${String(err)}`;
    }
  }

  private planSvg(): SVGSVGElement | null {
    return $('planSvg').querySelector('svg');
  }

  /** Plan metres -> SVG user units, from the plan's data-map (scripts/kestrel/plans.mjs). */
  toPlan(x: number, z: number): Pt {
    const [left, M, TOP, S, x0, z1] = this.planMap ?? [0, 0, 0, 1, 0, 0];
    return [left! + M! + (x - x0!) * S!, TOP! + (z1! - z) * S!];
  }

  /** Screen point -> plan SVG user units. */
  svgPointAt(clientX: number, clientY: number): Pt | null {
    return this.svgPoint({ clientX, clientY } as MouseEvent);
  }

  /** Pad: pan by (dx, dy) screen pixels and zoom by k around a screen point. */
  panZoomPlan(dx: number, dy: number, k: number, cx: number, cy: number): void {
    const svg = this.planSvg();
    const m = svg?.getScreenCTM();
    const p = this.svgPointAt(cx, cy);
    if (!svg || !m || !p || !this.planViewBox) return;
    const [vx, vy, vw, vh] = this.planViewBox as [number, number, number, number];
    this.planViewBox = [p[0] - (p[0] - vx) * k + dx / m.a, p[1] - (p[1] - vy) * k + dy / m.d, vw * k, vh * k];
    if (!this.isMinimap()) svg.setAttribute('viewBox', this.planViewBox.join(' '));
  }

  /** A plan point in metres -> screen pixels, or null with no plan drawn. */
  planScreen(x: number, z: number): Pt | null {
    const m = this.planSvg()?.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(...this.toPlan(x, z)).matrixTransform(m);
    return [p.x, p.y];
  }

  /**
   * Pad (decision 9): the dot's marker on the plan, and the plan pans (the view, not the data) to keep it inside the
   * middle 60 %; k zooms the plan around the marker (Plan only).
   */
  planFollow(x: number, z: number, k = 1): void {
    const svg = this.planSvg();
    if (!svg || !this.planViewBox) return;
    let g = svg.querySelector('#padMark');
    if (!g) {
      g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.id = 'padMark';
      svg.appendChild(g);
    }
    const [px, py] = this.toPlan(x, z);
    const box = this.isMinimap() ? this.planFullBox ?? this.planViewBox : this.planViewBox;
    const r = (9 * box[2]!) / Math.max(1, svg.clientWidth);
    g.innerHTML = `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(2)}" fill="none" stroke="#fff" stroke-width="${(r * 0.3).toFixed(2)}"/><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(r * 1.25).toFixed(2)}" fill="none" stroke="#0a84ff" stroke-width="${(r * 0.25).toFixed(2)}"/>`;
    if (this.isMinimap()) return;
    let [vx, vy, vw, vh] = this.planViewBox as [number, number, number, number];
    if (k !== 1) [vx, vy, vw, vh] = [px - (px - vx) * k, py - (py - vy) * k, vw * k, vh * k];
    const mx = vw * 0.2;
    const my = vh * 0.2;
    vx = Math.min(Math.max(vx, px - vw + mx), px - mx);
    vy = Math.min(Math.max(vy, py - vh + my), py - my);
    const next = [vx, vy, vw, vh];
    if (next.some((v, i) => Math.abs(v - this.planViewBox![i]!) > 1e-6)) {
      this.planViewBox = next;
      svg.setAttribute('viewBox', next.join(' '));
    }
  }

  /**
   * The pad's grab preview and tool ghosts on the plan (ED3-2 decisions 14, 18): dashed outlines over the plan, redrawn
   * only when they change. The mouse use of the plan is unchanged (the group takes no pointer events).
   */
  planGhost(shapes: readonly PlanShape[], look: 'lit' | 'ghost' | 'bad'): void {
    const svg = this.planSvg();
    if (!svg || !this.planViewBox) return;
    let g = svg.querySelector('#padGhost');
    if (!g) {
      g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.id = 'padGhost';
      g.setAttribute('pointer-events', 'none');
      svg.appendChild(g);
    }
    const box = this.isMinimap() ? this.planFullBox ?? this.planViewBox : this.planViewBox;
    const u = box[2]! / Math.max(1, svg.clientWidth);
    const col = look === 'lit' ? '#ffd166' : look === 'bad' ? '#ff3b30' : '#5ac8fa';
    const st = `fill="none" stroke="${col}" stroke-width="${(4 * u).toFixed(2)}" stroke-dasharray="${(8 * u).toFixed(1)} ${(5 * u).toFixed(1)}"`;
    const html = shapes
      .map((s) => {
        if (s.kind === 'ring') {
          const [x, y] = this.toPlan(...s.p);
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(12 * u).toFixed(2)}" ${st}/>`;
        }
        if (s.kind === 'text') {
          // ON1: live sizes as text on the plan, dark-edged so they read over any fill
          const [x, y] = this.toPlan(...s.p);
          return `<text class="live" x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${(13 * u).toFixed(2)}" text-anchor="middle" dominant-baseline="middle" fill="${col}" stroke="#101418" stroke-width="${(3 * u).toFixed(2)}" paint-order="stroke">${s.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
        }
        const a = this.toPlan(...s.a);
        const b = this.toPlan(...s.b);
        // ON1 decision 6: guide lines are thin and finely dashed
        const ls = s.guide ? `class="guide" fill="none" stroke="#c9f" stroke-width="${(1.5 * u).toFixed(2)}" stroke-dasharray="${(3 * u).toFixed(1)} ${(3 * u).toFixed(1)}"` : st;
        return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" ${ls}/>`;
      })
      .join('');
    if (g.getAttribute('data-k') !== html) {
      g.setAttribute('data-k', html);
      g.innerHTML = html;
    }
  }

  /** The live size or offset of what is being dragged, for the pad's dot label. */
  dragWords(): string {
    return this.liveNow().words;
  }

  /**
   * The live size words and plan shapes of what is being drawn or dragged (ON1 decisions 4, 5, 8): one source for the
   * pad's dot, the mouse's corner text and the plan. Walls: length and the parallel wall; rooms: size and area, a stretched
   * edge the wall it approaches; doors and windows: width and the clear distance each side.
   */
  liveNow(): LiveInfo {
    const d = this.drag;
    const s = d ? this.model.get(d.coll, d.id) : undefined;
    if (!d || !s) return { words: '', shapes: [] };
    const walls = this.model.list('walls') as Wall[];
    if (d.coll === 'walls') {
      const lw = liveWall(s as Wall, walls);
      const n = this.chain.walls.length;
      return this.chaining && n ? { ...lw, words: `${lw.words} (chain: ${n + 1} walls, ${fmt(this.chain.total + wallLen(s as Wall))} m)` } : lw;
    }
    if ('rect' in s) {
      const r = (s as Room).rect;
      if (d.coll === 'rooms' && (d.isNew || d.handle)) return liveRoom(r, d.isNew ? null : (d.handle as Edge), (d.before as Room).rect, (s as Room).level, walls);
      return { words: d.isNew || d.handle ? `size ${fmt(r[2] - r[0])} x ${fmt(r[3] - r[1])} m` : `moved ${moveWordsOf(d.before, s)}`, shapes: [] };
    }
    if (d.coll === 'openings') {
      const o = s as Opening;
      const w = this.model.get<Wall>('walls', o.wall);
      if (!w) return { words: '', shapes: [] };
      const lo = liveOpening(w, walls, o.at, o.w);
      return { words: `width ${fmt(o.w)} m, ${lo.words}`, shapes: lo.shapes };
    }
    return { words: '', shapes: [] };
  }

  /** The mouse's live sizes while drawing or dragging (ON1): the corner text and the plan's dashed figures. */
  private mouseLive(): void {
    const live = this.liveNow();
    $('hud').textContent = live.words;
    this.planGhost(live.shapes, 'ghost');
  }

  fromPlan(px: number, py: number): Pt {
    const [left, M, TOP, S, x0, z1] = this.planMap ?? [0, 0, 0, 1, 0, 0];
    return [(px - left! - M!) / S! + x0!, z1! - (py - TOP!) / S!];
  }

  private svgPoint(e: MouseEvent): Pt | null {
    const svg = this.planSvg();
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }

  private highlightPlan(): void {
    const svg = this.planSvg();
    if (!svg) return;
    for (const el of svg.querySelectorAll('.sel')) el.classList.remove('sel');
    if (this.selected) for (const el of svg.querySelectorAll(`[data-id="${CSS.escape(this.selected)}"]`)) el.classList.add('sel');
  }

  /** Orange outline of the selected element, its handles, and the camera, drawn over the plan. */
  drawPlanOverlay(): void {
    const g = this.planSvg()?.querySelector('#overlay');
    if (!g) return;
    const S = this.planMap?.[3] ?? 1;
    let out = '';
    const s = this.selectedElem();
    if (s && this.levelOf(s.coll, s.e) === this.view.level) {
      if (s.coll === 'rooms' || s.coll === 'stairs' || s.coll === 'voids') {
        const r = (s.e as Room).rect;
        const a = this.toPlan(r[0], r[3]);
        out += `<rect x="${a[0]}" y="${a[1]}" width="${(r[2] - r[0]) * S}" height="${(r[3] - r[1]) * S}" fill="#ff7300" fill-opacity="0.12" stroke="#ff7300" stroke-width="3"/>`;
      } else if (s.coll === 'walls') {
        const w = s.e as Wall;
        const a = this.toPlan(...w.a);
        const b = this.toPlan(...w.b);
        out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ff7300" stroke-width="${Math.max(4, w.t * S)}" stroke-opacity="0.7"/>`;
      } else if (s.coll === 'openings') {
        const w = this.model.get<Wall>('walls', (s.e as Opening).wall);
        if (w) {
          const o = s.e as Opening;
          const a = this.toPlan(...wallPoint(w, o.at - o.w / 2));
          const b = this.toPlan(...wallPoint(w, o.at + o.w / 2));
          out += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ff7300" stroke-width="${Math.max(6, w.t * S + 4)}" stroke-opacity="0.7"/>`;
        }
      } else if (s.coll === 'ladders') {
        const a = this.toPlan(...(s.e as Ladder).at);
        out += `<circle cx="${a[0]}" cy="${a[1]}" r="8" fill="none" stroke="#ff7300" stroke-width="3"/>`;
      }
      for (const h of this.handlesFor()) {
        const p = this.toPlan(h.x, h.z);
        out += `<rect data-handle="${h.id}" x="${p[0] - 7}" y="${p[1] - 7}" width="14" height="14" fill="#ff7300" stroke="#fff" stroke-width="2" style="cursor:move"/>`;
      }
    }
    // wall gaps on this level: a red ring and its size (ON0b decision 7)
    for (const gp of this.gaps()) {
      if (gp.level !== this.view.level) continue;
      const a = this.toPlan(...gp.at);
      out += `<g class="gapMark" data-gap="${esc(gp.wall)}"><circle cx="${a[0]}" cy="${a[1]}" r="9" fill="none" stroke="#e0182d" stroke-width="3"/><text x="${a[0] + 12}" y="${a[1] - 10}" font-size="13" fill="#e0182d" font-weight="bold">Gap ${fmt(gp.dist)} m</text></g>`;
    }
    out += '<g id="camMark"></g>';
    g.innerHTML = out;
    this.drawCameraMarker();
  }

  private camMarkAt = 0;
  private drawCameraMarker(): void {
    const now = performance.now();
    if (now - this.camMarkAt < 100) return;
    this.camMarkAt = now;
    const g = this.planSvg()?.querySelector('#camMark');
    if (!g) return;
    const c = this.view.camera.position;
    const [x, y] = this.toPlan(c.x, c.z);
    const deg = (this.controls.yaw * 180) / Math.PI;
    g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${deg.toFixed(1)})`);
    g.innerHTML = '<polygon points="0,-16 9,10 0,4 -9,10" fill="#0a84ff" stroke="#fff" stroke-width="2"/>';
  }

  private bindPlan(): void {
    const host = $('planSvg');
    let pan: { x: number; y: number; vb: number[] } | null = null;
    let downAt: [number, number] | null = null;
    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      const svg = this.planSvg();
      const p = this.svgPoint(e);
      if (!svg || !p || !this.planViewBox) return;
      const k = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      const [vx, vy, vw, vh] = this.planViewBox as [number, number, number, number];
      this.planViewBox = [p[0] - (p[0] - vx) * k, p[1] - (p[1] - vy) * k, vw * k, vh * k];
      svg.setAttribute('viewBox', this.planViewBox.join(' '));
    }, { passive: false });
    host.addEventListener('contextmenu', (e) => e.preventDefault());
    host.addEventListener('pointerdown', (e) => {
      const p = this.svgPoint(e);
      if (!p) return;
      host.setPointerCapture(e.pointerId);
      downAt = [e.clientX, e.clientY];
      const [x, z] = this.fromPlan(p[0], p[1]);
      if (this.isMinimap()) {
        if (e.button === 0) this.goTo(x, z);
        return;
      }
      if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) {
        pan = { x: e.clientX, y: e.clientY, vb: (this.planViewBox ?? [0, 0, 1, 1]).slice() };
        return;
      }
      if (e.button !== 0) return;
      if (this.splitting) return void this.splitAt(x, z);
      if (this.tool !== 'select') return this.toolDown(x, z, e.clientX, e.clientY, 'plan', e.ctrlKey);
      const target = e.target as Element;
      const handle = target.closest('[data-handle]')?.getAttribute('data-handle');
      const s = this.selectedElem();
      if (handle && s) {
        const h = this.handlesFor().find((q) => q.id === handle);
        if (h) this.beginDrag(s.coll, s.id, handle, [h.x, h.z], h.y, e.clientX, e.clientY, 'plan');
        return;
      }
      // walls and openings sit on top of rooms; the first data-id up the tree is what was clicked
      const key = target.closest('[data-id]')?.getAttribute('data-id') as Key | undefined;
      if (!key || !parseKey(key)) return this.select(null);
      if (key !== this.selected) this.select(key);
      const k = parseKey(key)!;
      this.beginDrag(k.coll, k.id, null, [x, z], this.floor(), e.clientX, e.clientY, 'plan');
    });
    host.addEventListener('pointermove', (e) => {
      const p = this.svgPoint(e);
      if (pan) {
        const svg = this.planSvg();
        const m = svg?.getScreenCTM();
        if (!svg || !m) return;
        const dx = (e.clientX - pan.x) / m.a;
        const dy = (e.clientY - pan.y) / m.d;
        this.planViewBox = [pan.vb[0]! - dx, pan.vb[1]! - dy, pan.vb[2]!, pan.vb[3]!];
        svg.setAttribute('viewBox', this.planViewBox.join(' '));
        return;
      }
      if (p) {
        const [x, z] = this.fromPlan(p[0], p[1]);
        $('planStatus').textContent = `x ${fmt(x)}  z ${fmt(z)}`;
        if (!this.drag) this.setHover(((e.target as Element).closest('[data-id]')?.getAttribute('data-id') as Key | null) ?? null);
        if (this.stairDraw?.phase === 'aim') this.aimStair(x, z);
        const d = this.drag;
        if (d && d.source === 'plan') {
          if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 4) return;
          d.moved = true;
          this.moveDrag(x, z, e.ctrlKey);
          this.mouseLive();
        }
      }
    });
    host.addEventListener('pointerup', (e) => {
      if (pan) {
        const moved = downAt && Math.abs(e.clientX - downAt[0]) + Math.abs(e.clientY - downAt[1]) > 4;
        pan = null;
        if (moved || e.button !== 2) return;
      }
      if (e.button === 2 && this.chaining) return this.endDrag(true);
      if (this.drag?.source === 'plan') this.release();
    });
    host.addEventListener('dblclick', (e) => {
      const p = this.svgPoint(e);
      if (!p) return;
      const [x, z] = this.fromPlan(p[0], p[1]);
      this.goTo(x, z);
    });
  }

  /** Moves the camera to a plan point: the walker steps there, the flyer looks down on it. */
  goTo(x: number, z: number, floorY = this.viewFloor()): void {
    if (this.controls.walking) this.controls.walkAt(x, z, this.floor());
    else if (this.controls.mode === 'orbit') this.controls.orbit.goTo(x, z, floorY);
    else this.controls.overlook(x, z, floorY, 22);
  }

  // ---------- walk mode ----------
  rebuildBlockers(): void {
    const level = this.view.level;
    const ops = this.model.list('openings') as Opening[];
    const out: Obb[] = [];
    const walls = this.model.list('walls') as Wall[];
    const joins = wallJoins(walls);
    for (const w of walls) {
      if (w.level !== level) continue;
      for (const p of joinPieces(wallPieces(w, ops), wallLen(w), joins.get(w.id))) if (p.y0 < 1.75 && p.y1 > 0.42) out.push(pieceObb(w, p));
    }
    this.controls.blockers = out;
  }

  toggleWalk(): void {
    if (this.controls.walking) {
      const c = this.view.camera.position;
      this.controls.overlook(c.x, c.z, this.viewFloor(), 22);
    } else {
      const canvas = $<HTMLCanvasElement>('c');
      const pt = this.view.planePoint(canvas.clientWidth / 2, canvas.clientHeight / 2, this.floor());
      const c = this.view.camera.position;
      const [x, z] = pt ?? [c.x, c.z];
      this.controls.walkAt(x, z, this.floor());
    }
    this.walkChanged();
  }

  /** The orbit as it was before the pad's quick walk; null when not quick walking. */
  private quickFrom: OrbitState | null = null;
  private quickLevel = '';

  get quickWalking(): boolean {
    if (this.quickFrom && !this.controls.walking) this.quickFrom = null;
    return this.quickFrom !== null;
  }

  /** Pad quick walk (L3, decision 14): walk at the dot facing the camera's way; again returns to the orbit as it was. */
  quickWalk(): void {
    const c = this.controls;
    if (this.quickWalking) {
      c.orbit.enter(this.quickFrom!);
      c.mode = 'orbit';
      this.quickFrom = null;
      this.walkChanged();
      // a level change while walking moves the orbit to that level's floor
      if (this.view.level !== this.quickLevel) c.orbit.s.floorY = this.viewFloor();
      return;
    }
    if (c.mode !== 'orbit') this.enterOrbit();
    const o = c.orbit.s;
    this.quickFrom = c.orbit.snapshot();
    this.quickLevel = this.view.level;
    c.walkAt(o.tx, o.tz, this.floor());
    c.yaw = o.yaw;
    // ON0b: the quick walk runs by default (L3 toggles a slow walk)
    c.padRun = true;
    this.walkChanged();
  }

  // ---------- walk test as the player (ED2 Part B) ----------
  /** Where the game puts the player: the dot (orbit), the eye (walking) or the screen centre on the floor (flying). */
  walkSpawn(): WalkSpawn {
    const c = this.controls;
    const p = this.view.camera.position;
    // (a key press hands the orbit to the fly camera at the same pose: Tab right after the pad still means the dot)
    const [ox, oy, oz] = c.orbit.position();
    const atOrbit = c.mode === 'fly' && Math.abs(p.x - ox) + Math.abs(p.y - oy) + Math.abs(p.z - oz) < 0.01;
    if (c.mode === 'orbit' || atOrbit) return { x: c.orbit.s.tx, z: c.orbit.s.tz, level: this.view.level, yaw: c.orbit.s.yaw };
    if (c.walking) return { x: p.x, z: p.z, level: this.view.level, yaw: c.yaw };
    const canvas = $<HTMLCanvasElement>('c');
    const pt = canvas.clientWidth > 0 ? this.view.planePoint(canvas.clientWidth / 2, canvas.clientHeight / 2, this.viewFloor()) : null;
    return { x: pt?.[0] ?? p.x, z: pt?.[1] ?? p.z, level: this.view.level, yaw: c.yaw };
  }

  /** Tab, the Walk button and Hub > Play: the real game, unsaved edits included, at the dot. */
  async gameWalk(): Promise<void> {
    if (this.walk.state !== 'off' && this.walk.state !== 'warm') return;
    if (this.drag) this.endDrag(true);
    if (this.quickWalking) this.quickWalk();
    const c = this.controls;
    const spawn = this.walkSpawn();
    const o = c.mode === 'orbit' ? c.orbit.s : null;
    this.walkFrom = { pitch: o?.pitch ?? Math.max(ORBIT.PITCH_MIN, Math.min(ORBIT.PITCH_MAX, c.pitch || 0.9)), dist: o?.dist ?? ORBIT.DIST_START, selected: this.selected };
    try {
      // ON0b: the game gets the walls grown by their corner joins (the file keeps its centre lines)
      const how = await this.walk.start(joinedCampus(this.model.data), campusText(this.model.data), spawn);
      this.status(how === 'warm' ? 'Walk test: same building, the player moves to the dot' : 'Loading game...');
    } catch (err) {
      this.status(`Walk test failed: ${String(err)}`);
    }
    this.updateHint();
  }

  private gamePose(r: WalkReport): CamPose {
    const [yaw, pitch] = poseAngles(r.cam.pos, r.cam.target);
    return { pos: [...r.cam.pos], yaw, pitch, fov: r.cam.fov };
  }

  /** The game shows the player: ease the editor camera onto the game camera, then show the game. */
  private walkReady(r: WalkReport): void {
    this.controls.blend = { from: this.controls.pose(), to: this.gamePose(r), t: 0, dur: 0.4, done: () => this.walk.show() };
    this.status('Walk test: F10, Esc then Back to editor, or hold View + Menu comes back');
    this.updateHint();
  }

  /** Back from the game: the camera starts at the game camera and eases to an orbit round the player. */
  private walkBack(r: WalkReport): void {
    const c = this.controls;
    const from = this.gamePose(r);
    const editorFov = c.pose().fov;
    c.setPose({ ...from, fov: editorFov });
    const keep = this.walkFrom?.selected ?? this.selected;
    if (r.level && r.level !== this.view.level) this.setLevel(r.level);
    if (keep && this.selected !== keep) this.select(keep);
    const floorY = this.viewFloor();
    c.orbit.enter({ tx: r.x, tz: r.z, floorY, dist: this.walkFrom?.dist ?? ORBIT.DIST_START, yaw: from.yaw, pitch: this.walkFrom?.pitch ?? 0.9 });
    c.mode = 'orbit';
    const [x, y, z] = c.orbit.position();
    c.blend = { from: { ...from, fov: editorFov }, to: { pos: [x, y, z], yaw: c.orbit.s.yaw, pitch: c.orbit.s.pitch, fov: editorFov }, t: 0, dur: 0.4, done: () => undefined };
    this.walkChanged();
    this.status(`Back from the walk test at x ${r.x.toFixed(1)}, z ${r.z.toFixed(1)}`);
  }

  private walkFailed(why: string): void {
    this.status(why);
    this.updateHint();
  }

  /** The pad's builder camera starts from the current pose, aimed at the screen centre on the editing floor. */
  enterOrbit(): void {
    const canvas = $<HTMLCanvasElement>('c');
    const y = this.viewFloor();
    const hit = canvas.clientWidth > 0 ? this.view.planePoint(canvas.clientWidth / 2, canvas.clientHeight / 2, y) : null;
    this.controls.enterOrbit(y, hit);
  }

  private walkChanged(): void {
    this.view.showAll = this.controls.walking;
    // walking shows the whole campus as built: no cut walls, no exploded gap
    if (this.view.vis.section > 0) this.view.rebuildAll();
    else this.view.applyVisibility();
    this.updateHandles();
    this.updateBar();
    this.updateHint();
  }

  setLevel(id: string): void {
    if (!this.model.data.levels.some((l) => l.id === id)) return;
    this.view.level = id;
    if (this.selected) {
      const s = this.selectedElem();
      if (s && !this.view.elementLevels(s.coll, s.id).includes(id)) this.select(null);
    }
    this.view.applyVisibility();
    this.rebuildBlockers();
    if (this.controls.walking) this.controls.floor = this.floor();
    else if (this.controls.mode === 'orbit') this.controls.orbit.setFloor(this.viewFloor());
    this.updateHandles();
    $<HTMLSelectElement>('level').value = id;
    this.syncLevelsUi();
    this.updateHint();
    this.refreshPlan(false);
  }

  stepLevel(dir: 1 | -1): void {
    const ls = this.model.data.levels.slice().sort((a, b) => a.floor - b.floor);
    const i = ls.findIndex((l) => l.id === this.view.level);
    const n = ls[i + dir];
    if (n) this.setLevel(n.id);
  }

  // ---------- checks ----------
  scheduleChecks(): void {
    clearTimeout(this.checkTimer);
    this.checkTimer = window.setTimeout(() => this.runChecks(false), 700);
  }

  async runChecks(first: boolean): Promise<void> {
    try {
      const r = await fetch('/__editor/check', { method: 'POST', body: JSON.stringify(this.model.data) });
      const reply = (await r.json()) as CheckReply;
      if (!r.ok || !reply.summary) throw new Error((reply as { error?: string }).error ?? String(r.status));
      if (first || !this.baseline) this.baseline = new Set(checkLines(reply));
      this.lastChecks = reply;
      this.updateBar();
      if (this.tab === 'checks') this.renderPanel();
    } catch (err) {
      this.status(`Checks failed to run: ${String(err)}`);
    }
  }

  // ---------- keys ----------
  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (isTyping()) {
        if (e.key === 'Escape') (document.activeElement as HTMLElement).blur();
        return;
      }
      // one action map (actions.ts) for every binding; the camera keys are handled by the controls
      const a = actionForKey(keyId(e), this.ctx());
      if (!a) return;
      e.preventDefault();
      this.run(a.id, e);
    });
  }

  /** Runs an action from the action map (keys now; the controller in Part C). */
  run(id: string, e?: { code: string; shiftKey: boolean }): void {
    const vis = this.view.vis;
    const tools: Record<string, Tool> = { toolSelect: 'select', toolRoom: 'room', toolWall: 'wall', toolDoor: 'door', toolWindow: 'window', toolStair: 'stair', toolLadder: 'ladder', toolHole: 'hole' };
    if (tools[id]) return this.setTool(tools[id]);
    switch (id) {
      case 'walk': return void this.gameWalk();
      case 'quickWalk': return this.quickWalk();
      case 'levelUp': return this.stepLevel(1);
      case 'levelDown': return this.stepLevel(-1);
      case 'frame': return this.frameSelected();
      case 'chainRemove': return this.chainRemoveLast();
      case 'cancel':
        if (this.splitting) this.cancelSplit();
        else if (this.stairDraw) this.cancelStair();
        else if (this.drag) this.endDrag(true);
        else if (this.tool !== 'select') this.setTool('select');
        else this.select(null);
        return;
      case 'delete': return this.deleteSelected();
      case 'duplicate': return this.duplicate();
      case 'nudge': {
        const g = e?.shiftKey ? this.grid * 10 : this.grid;
        const c = e?.code ?? '';
        return this.nudge(c === 'ArrowLeft' ? [-g, 0] : c === 'ArrowRight' ? [g, 0] : c === 'ArrowUp' ? [0, g] : [0, -g]);
      }
      case 'undo': return this.undo();
      case 'redo': return this.redo();
      case 'save': return void this.save();
      case 'layout': return this.setLayout(this.prefs.layout === '3d' ? 'both' : this.prefs.layout === 'both' ? 'plan' : '3d');
      case 'drawer': return this.toggleDrawer();
      case 'minimap':
        this.prefs.minimap = !this.prefs.minimap;
        if (this.prefs.layout !== '3d') this.status(this.prefs.minimap ? 'Small plan on (shows in 3D only, V)' : 'Small plan off');
        return this.applyLayout();
      case 'whole':
      case 'single':
      case 'upTo':
        return this.setPreset(id);
      case 'ghost':
        vis.ghost = !vis.ghost;
        return this.applyVis();
      case 'exploded':
        vis.exploded = !vis.exploded;
        return this.applyVis();
      // H and Menu: the hub (H opens it on Help; the help overlay is the hub's Help tab)
      case 'help':
        return this.pad?.hub.toggle(this.pad.device === 'pad' ? this.pad.hub.tab : 'Help');
      case 'hubClose':
        return this.pad?.hub.close();
      // Space and Y: the tile menu (ON0a); Esc closes it
      case 'menu':
        return this.pad?.toggleMenu();
      case 'menuClose':
        if (this.pad?.names.isOpen) return this.pad.names.close(null);
        return this.pad?.closeMenu();
    }
  }

  undo(): void {
    const e = this.model.undo();
    if (e) this.scheduleDraft();
    this.status(e ? `Undid: ${e.text}` : 'Nothing to undo');
  }

  redo(): void {
    const e = this.model.redo();
    if (e) this.scheduleDraft();
    this.status(e ? `Redid: ${e.text}` : 'Nothing to redo');
  }

  deleteSelected(): void {
    const s = this.selectedElem();
    if (!s) return;
    this.commit(deleteChanges(this.model, s.coll, s.id));
    this.select(null);
  }

  nudge(v: Pt): void {
    const s = this.selectedElem();
    if (!s) return;
    const c = this.centreOf(s.coll, s.e);
    const d: Drag = { coll: s.coll, id: s.id, handle: null, before: clone(s.e), start: c, planeY: 0, moved: true, sx: 0, sy: 0, source: '3d', isNew: false };
    let after = this.dragged(d, c[0] + v[0], c[1] + v[1], false);
    if (s.coll === 'rooms') return this.commitRoom(s.id, (after as Room).rect);
    if (s.coll === 'openings') after = withBetween(this.model, after as Opening);
    this.commit([{ coll: s.coll, id: s.id, before: d.before, after }]);
  }

  /** A room's new rect, committed with the walls, neighbours and doors that follow it (ED3-3a). */
  commitRoom(id: string, rect: Rect, merge?: Merge): void {
    const res = linkedEdit(this.model.data, id, rect, this.wallsFollow);
    if (res.refused) return this.status(res.refused);
    if (!res.changes.length) return;
    const words = linkedWords(res);
    const room = describeChange(this.model.data, res.changes[0]!);
    this.commitText(words ? `${room}; ${words}` : room, res.changes, merge);
  }

  duplicate(): void {
    const s = this.selectedElem();
    if (!s || s.coll === 'stairs') return this.status('Select a room, wall, opening, ladder or floor hole to duplicate');
    const e = clone(s.e) as Elem & Record<string, unknown>;
    const g = this.grid * 2;
    const prefix = s.coll === 'rooms' ? `${(s.e as Room).level}-NEW` : s.coll === 'walls' ? `W${(s.e as Wall).level}-NEW` : s.coll === 'openings' ? 'O-NEW' : `${s.id}-COPY`;
    e.id = this.model.freshId(s.coll, prefix);
    if ('rect' in e) (e as Room).rect = (e as Room).rect.map((v, i) => +(v + (i % 2 ? -g : g)).toFixed(3)) as Rect;
    if (s.coll === 'walls') {
      (e as Wall).a = [(e as Wall).a[0] + g, (e as Wall).a[1] - g];
      (e as Wall).b = [(e as Wall).b[0] + g, (e as Wall).b[1] - g];
    }
    if (s.coll === 'openings') (e as Opening).at = +Math.min((e as Opening).at + (e as Opening).w + 0.5, wallLen(this.model.get<Wall>('walls', (e as Opening).wall)!) - (e as Opening).w / 2).toFixed(3);
    if (s.coll === 'ladders') (e as Ladder).at = [(e as Ladder).at[0] + g, (e as Ladder).at[1] - g];
    if (s.coll === 'rooms' && typeof e.name === 'string') e.name = `${e.name} Copy`;
    this.commit([{ coll: s.coll, id: e.id, before: null, after: e }]);
    this.select(keyOf(s.coll, e.id));
  }

  frameSelected(): void {
    const s = this.selectedElem();
    if (!s) return;
    const [x, z] = this.centreOf(s.coll, s.e);
    this.goTo(x, z, this.viewFloor(this.levelOf(s.coll, s.e)));
  }

  // ---------- save ----------
  async save(): Promise<void> {
    if (!this.model.dirty) {
      // edit then undo: the building is as saved, so the journal (and the draft) go without a write
      if (this.model.journal.length) {
        this.model.markSaved();
        clearTimeout(this.draftTimer);
        void clearDraft().catch(() => undefined);
        this.updateBar();
        this.renderPanel();
      }
      return this.status('Nothing new to save');
    }
    this.status('Saving and redrawing the plans...');
    const now = new Date();
    const savedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${localTime(now.toISOString()).slice(0, 5)}`;
    try {
      const r = await fetch('/__editor/save', {
        method: 'POST',
        body: JSON.stringify({ campus: this.model.data, journal: this.model.journal, logText: logMarkdown(this.model.journal, savedAt) }),
      });
      const reply = (await r.json()) as { ok?: boolean; error?: string; plans?: number; planLog?: string };
      if (!r.ok || !reply.ok) throw new Error(reply.error ?? String(r.status));
      this.model.data.meta.editor = 'level editor (docs/kestrel/editor.md)';
      const n = this.model.journal.length;
      this.model.markSaved();
      clearTimeout(this.draftTimer);
      void clearDraft().catch(() => undefined);
      this.status(`Saved ${n} change${n === 1 ? '' : 's'} at ${new Date().toLocaleTimeString()}; ${reply.plans ?? 0} plan images redrawn${reply.planLog ? ' (plan warnings: see console)' : ''}`);
      if (reply.planLog) console.warn(reply.planLog);
      this.updateBar();
      this.renderPanel();
    } catch (err) {
      this.status(`Save failed: ${String(err)}`);
    }
  }

  // ---------- toolbar and panels ----------
  setTool(t: Tool): void {
    if (this.drag) this.endDrag(true);
    if (this.stairDraw) this.cancelStair();
    this.tool = t;
    this.updateHandles();
    this.updateBar();
    const hint: Record<Tool, string> = {
      select: 'Select: click to pick, drag to move, drag the orange handles to resize',
      room: 'Room: drag out a rectangle on the floor',
      wall: 'Wall: drag from one end to the other (copies the last wall you selected)',
      door: 'Door: click on a wall (type from the list)',
      window: 'Window: click on a wall',
      stair: `Stair (${stairType(this.stairTypeId).name}): A (click) at the start corner, point the climb, A shows the proposal, A accepts`,
      ladder: 'Ladder: A (click) on a wall face or a point; it climbs to the level above',
      hole: `Floor hole (${HOLE_NAMES[this.holeKind] ?? this.holeKind}): drag out a rectangle on the floor`,
    };
    this.status(hint[t]);
    this.updateHint();
  }

  private buildToolbar(): void {
    const d = this.model.data;
    const levels = d.levels.slice().sort((a, b) => b.floor - a.floor);
    const levelWords = (l: { name: string; floor: number }): string => `${esc(l.name)} (${fmt(l.floor)} m)`;
    const buildings = [['all', 'All'], ...(d.meta.buildings ?? []).map((b) => [b.id, `Building ${b.id}`]), ['site', 'Site (outside)']];
    $('bar').innerHTML = `
      <div class="line">
        <span class="title">Kestrel editor</span>
        <span class="group seg" id="layout" title="V cycles"><button data-layout="3d">3D</button><button data-layout="both">Both</button><button data-layout="plan">Plan</button></span>
        <span class="group"><button id="splitDir" title="Side by side or stacked">Side by side</button><button id="swap" title="Swap the 3D and the plan">Swap</button><button id="minimap" title="Small plan in the corner of 3D only (M)">Small plan</button><button id="drawerBtn" title="Side panel (\` or I)">Panel</button></span>
        <span class="group" id="tools">
          <button data-tool="select" title="1">1 Select</button><button data-tool="room" title="2">2 Room</button><select id="roomOpt" title="What the room tool makes around a room">${ROOM_OPTIONS.map((o) => `<option value="${o.id}">${o.name}</option>`).join('')}</select><button id="follow" title="Stretching or moving a room takes its walls along (also in the hub's Settings)">Walls follow rooms</button><button data-tool="wall" title="3">3 Wall</button><button data-tool="door" title="4">4 Door</button><select id="doorType">${OPENING_TYPES.filter((t) => t !== 'window').map((t) => `<option value="${t}">${DOOR_NAMES[t] ?? t}</option>`).join('')}</select><button data-tool="window" title="5">5 Window</button><button data-tool="stair" title="6">6 Stair</button><select id="stairType" title="The Stair tool's type">${STAIR_TYPES.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select><button data-tool="ladder" title="7">7 Ladder</button><button data-tool="hole" title="8">8 Floor hole</button><select id="holeKind" title="The Floor hole tool's kind">${HOLE_KINDS.map((k) => `<option value="${k}">${HOLE_NAMES[k] ?? k}</option>`).join('')}</select>
        </span>
        <span class="group"><button id="walk" title="Tab: the game's own player, unsaved edits included (Shift+Tab: quick walk)">Walk test (game)</button><button id="undo" title="Ctrl+Z">Undo</button><button id="redo" title="Ctrl+Y">Redo</button><button id="save" title="Ctrl+S">Save</button><button id="revert" title="Throw away unsaved changes and reload the file">Revert to last save</button><button id="helpBtn" title="H">Help</button></span>
        <span id="checksBadge"></span>
      </div>
      <div class="line">
        <label>Editing <select id="level">${levels.map((l) => `<option value="${esc(l.id)}">${levelWords(l)}</option>`).join('')}</select></label>
        <span class="group seg" id="presets"><button data-preset="whole" title="G">Whole building</button><button data-preset="single" title="O">Single level</button><button data-preset="upTo" title="U">Up to this level</button></span>
        <details class="pick" id="pick"><summary>Pick levels</summary><div class="menu">${levels.map((l) => `<label><input type="checkbox" data-level="${esc(l.id)}"> ${levelWords(l)}</label>`).join('')}</div></details>
        <span class="group"><button id="ghost" title="Shift+G">Ghost the rest</button><button id="exploded" title="X">Exploded</button><input type="range" id="gap" min="0" max="${GAP_MAX}" step="0.5" title="Gap between levels"><span id="gapText" class="dim"></span></span>
        <label class="group"><input type="checkbox" id="sectionOn"> Cut walls at <input type="range" id="section" min="0.3" max="4" step="0.1"><span id="sectionText" class="dim"></span></label>
        <label>Building <select id="building">${buildings.map(([v, t]) => `<option value="${esc(v!)}">${esc(t!)}</option>`).join('')}</select></label>
        <button id="underlay" title="Faint walls of the level below on the plan">Plan: level below</button>
      </div>`;
    $<HTMLSelectElement>('level').value = this.view.level;
    $<HTMLSelectElement>('level').addEventListener('change', (e) => this.setLevel((e.target as HTMLSelectElement).value));
    for (const b of $('layout').querySelectorAll<HTMLButtonElement>('button')) b.addEventListener('click', () => this.setLayout(b.dataset.layout as Layout));
    $('splitDir').addEventListener('click', () => {
      this.prefs.split = this.prefs.split === 'row' ? 'col' : 'row';
      this.applyLayout();
    });
    $('swap').addEventListener('click', () => {
      this.prefs.swap = !this.prefs.swap;
      this.applyLayout();
    });
    $('minimap').addEventListener('click', () => this.run('minimap'));
    $('roomOpt').addEventListener('change', () => {
      this.roomOption = $<HTMLSelectElement>('roomOpt').value as RoomWallOption;
      this.setTool('room');
    });
    $('follow').addEventListener('click', () => this.setWallsFollow(!this.wallsFollow));
    $<HTMLSelectElement>('stairType').value = this.stairTypeId;
    $<HTMLSelectElement>('holeKind').value = this.holeKind;
    $('stairType').addEventListener('change', () => {
      this.setStairType($<HTMLSelectElement>('stairType').value as StairTypeId);
      this.setTool('stair');
    });
    $('holeKind').addEventListener('change', () => {
      this.setHoleKind($<HTMLSelectElement>('holeKind').value);
      this.setTool('hole');
    });
    $('drawerBtn').addEventListener('click', () => this.toggleDrawer());
    for (const b of $('presets').querySelectorAll<HTMLButtonElement>('button')) b.addEventListener('click', () => this.setPreset(b.dataset.preset as LevelPreset));
    for (const c of $('pick').querySelectorAll<HTMLInputElement>('input[data-level]'))
      c.addEventListener('change', () => {
        const vis = this.view.vis;
        vis.picked = [...$('pick').querySelectorAll<HTMLInputElement>('input[data-level]')].filter((x) => x.checked).map((x) => x.dataset.level!);
        vis.preset = 'pick';
        this.applyVis();
      });
    $('ghost').addEventListener('click', () => this.run('ghost'));
    $('exploded').addEventListener('click', () => this.run('exploded'));
    $('gap').addEventListener('input', () => {
      this.view.vis.gap = Number($<HTMLInputElement>('gap').value);
      this.view.vis.exploded = true;
      this.applyVis();
    });
    const section = (): void => {
      this.view.vis.section = $<HTMLInputElement>('sectionOn').checked ? Number($<HTMLInputElement>('section').value) : 0;
      this.applyVis(true);
    };
    $('sectionOn').addEventListener('change', section);
    $('section').addEventListener('input', () => {
      $<HTMLInputElement>('sectionOn').checked = true;
      section();
    });
    $('building').addEventListener('change', () => {
      this.view.vis.building = $<HTMLSelectElement>('building').value;
      this.applyVis();
    });
    $('underlay').addEventListener('click', () => {
      this.view.vis.underlay = !this.view.vis.underlay;
      this.applyVis();
    });
    for (const b of $('tools').querySelectorAll<HTMLButtonElement>('button[data-tool]')) b.addEventListener('click', () => this.setTool(b.dataset.tool as Tool));
    $('walk').addEventListener('click', () => void this.gameWalk());
    $('undo').addEventListener('click', () => this.undo());
    $('redo').addEventListener('click', () => this.redo());
    $('save').addEventListener('click', () => void this.save());
    $('revert').addEventListener('click', () => void this.revert());
    $('helpBtn').addEventListener('click', () => this.run('help'));
    $('checksBadge').addEventListener('click', () => {
      this.tab = 'checks';
      this.openDrawer();
      this.renderPanel();
    });
    for (const t of document.querySelectorAll<HTMLButtonElement>('#drawerHead button[data-tab]'))
      t.addEventListener('click', () => {
        this.tab = t.dataset.tab as 'props' | 'checks' | 'log';
        this.renderPanel();
      });
    $('pin').addEventListener('click', () => {
      this.prefs.pinned = !this.prefs.pinned;
      this.applyLayout();
    });
    $('closeDrawer').addEventListener('click', () => this.toggleDrawer());
    // keep shortcuts working after a toolbar click
    for (const el of $('bar').querySelectorAll('button, select, input')) el.addEventListener('change', () => (el as HTMLElement).blur());
    for (const el of $('bar').querySelectorAll('button')) el.addEventListener('click', () => (el as HTMLElement).blur());
    this.syncLevelsUi();
    this.updateBar();
  }

  /** The hub's "Walls follow rooms" and the tool bar button share one setting. */
  setWallsFollow(on: boolean): void {
    const pad = this.pad;
    if (!pad) return;
    pad.settings = { ...pad.settings, wallsFollow: on };
    pad.savePrefs();
    this.status(on ? 'Walls follow rooms: on' : 'Walls follow rooms: off (rooms move and stretch alone)');
    this.updateBar();
  }

  updateBar(): void {
    for (const b of $('tools').querySelectorAll<HTMLButtonElement>('button[data-tool]')) b.classList.toggle('on', b.dataset.tool === this.tool);
    $('follow').classList.toggle('on', this.wallsFollow);
    $('walk').textContent = this.walk.state === 'loading' ? 'Loading game...' : 'Walk test (game)';
    $('walk').classList.toggle('on', this.walk.state !== 'off' && this.walk.state !== 'warm');
    $<HTMLButtonElement>('undo').disabled = !this.model.canUndo;
    $<HTMLButtonElement>('redo').disabled = !this.model.canRedo;
    const n = this.model.dirty;
    $('save').textContent = n ? 'Save *' : 'Saved';
    $('save').title = n ? `${n} unsaved step${n === 1 ? '' : 's'} (Ctrl+S)` : 'Nothing to save';
    const c = this.lastChecks;
    if (c) {
      const fresh = this.newProblems(c).length;
      $('checksBadge').innerHTML = `Checks: ${c.summary.FAIL ?? 0} fail, ${c.summary.WARN ?? 0} warn, standards ${c.standards.fails.length} fail${fresh ? ` <b class="bad">${fresh} new</b>` : ''}`;
    }
  }

  // ---------- layout: 3D, both, plan; the side panel; the small plan ----------
  isMinimap(): boolean {
    return this.prefs.layout === '3d' && this.prefs.minimap;
  }

  setLayout(l: Layout): void {
    if (this.prefs.layout === l) return;
    this.prefs.layout = l;
    this.applyLayout();
    this.status(l === '3d' ? '3D only (V cycles; M shows or hides the small plan)' : l === 'plan' ? 'Plan only (V cycles)' : '3D and plan (V cycles; drag the divider to resize)');
  }

  applyLayout(): void {
    const p = this.prefs;
    const st = $('stage');
    st.dataset.layout = p.layout;
    st.dataset.split = p.split;
    st.dataset.swap = p.swap ? '1' : '0';
    st.dataset.minimap = p.minimap ? '1' : '0';
    st.style.setProperty('--split', `${(p.frac * 100).toFixed(1)}%`);
    document.body.dataset.drawer = !p.drawer ? 'closed' : p.pinned ? 'pinned' : 'open';
    // the small plan always shows the whole level; the full plan keeps its own zoom
    const svg = this.planSvg();
    const box = this.isMinimap() ? this.planFullBox : this.planViewBox;
    if (svg && box) svg.setAttribute('viewBox', box.join(' '));
    this.syncViewButtons();
    this.savePrefs();
    this.view.engine.resize();
    requestAnimationFrame(() => this.view.engine.resize());
  }

  private syncViewButtons(): void {
    if (!document.getElementById('layout')) return;
    const p = this.prefs;
    for (const b of $('layout').querySelectorAll<HTMLButtonElement>('button')) b.classList.toggle('on', b.dataset.layout === p.layout);
    $('splitDir').textContent = p.split === 'row' ? 'Side by side' : 'Stacked';
    $('swap').classList.toggle('on', p.swap);
    $('minimap').classList.toggle('on', p.minimap);
    $('drawerBtn').classList.toggle('on', p.drawer);
    $('pin').classList.toggle('on', p.pinned);
    $('pin').textContent = p.pinned ? 'Pinned' : 'Pin';
  }

  private bindLayout(): void {
    const div = $('divider');
    div.addEventListener('pointerdown', (e) => {
      div.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent): void => {
        const r = $('stage').getBoundingClientRect();
        let f = this.prefs.split === 'row' ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height;
        if (this.prefs.swap) f = 1 - f;
        this.prefs.frac = Math.max(0.15, Math.min(0.85, f));
        $('stage').style.setProperty('--split', `${(this.prefs.frac * 100).toFixed(1)}%`);
        this.view.engine.resize();
      };
      const up = (): void => {
        div.removeEventListener('pointermove', move);
        div.removeEventListener('pointerup', up);
        this.savePrefs();
      };
      div.addEventListener('pointermove', move);
      div.addEventListener('pointerup', up);
    });
  }

  toggleDrawer(): void {
    this.prefs.drawer = !this.prefs.drawer;
    this.applyLayout();
  }

  openDrawer(): void {
    if (this.prefs.drawer) return;
    this.prefs.drawer = true;
    this.applyLayout();
  }

  savePrefs(): void {
    try {
      localStorage.setItem(PREFS, JSON.stringify({ ...this.prefs, vis: this.view.vis }));
    } catch {
      // preferences are a convenience; no storage is fine
    }
  }

  // ---------- levels and buildings ----------
  setPreset(p: LevelPreset): void {
    const vis = this.view.vis;
    vis.preset = p;
    vis.picked = presetPicks(p, this.model.data.levels, this.view.level);
    this.applyVis();
    this.status(p === 'whole' ? 'Whole building' : p === 'single' ? 'Single level' : 'Up to this level');
  }

  /** Redraws after a Levels change (`rebuild` when wall heights change: the section cut). */
  applyVis(rebuild = false): void {
    if (rebuild) this.view.rebuildAll();
    else this.view.applyVisibility();
    this.updateHandles();
    this.syncLevelsUi();
    this.decoratePlan();
    this.updateHint();
    this.savePrefs();
  }

  syncLevelsUi(): void {
    if (!document.getElementById('presets')) return;
    const vis = this.view.vis;
    for (const b of $('presets').querySelectorAll<HTMLButtonElement>('button')) b.classList.toggle('on', b.dataset.preset === vis.preset);
    const ticks = presetPicks(vis.preset, this.model.data.levels, this.view.level, vis.picked);
    for (const c of $('pick').querySelectorAll<HTMLInputElement>('input[data-level]')) c.checked = ticks.includes(c.dataset.level!);
    $('pick').classList.toggle('on', vis.preset === 'pick');
    $('ghost').classList.toggle('on', vis.ghost);
    $('exploded').classList.toggle('on', vis.exploded);
    $<HTMLInputElement>('gap').value = String(vis.gap);
    $('gapText').textContent = `${fmt(vis.gap)} m`;
    $<HTMLInputElement>('sectionOn').checked = vis.section > 0;
    if (vis.section > 0) $<HTMLInputElement>('section').value = String(vis.section);
    else if (!$<HTMLInputElement>('section').dataset.set) $<HTMLInputElement>('section').value = '1.2';
    $<HTMLInputElement>('section').dataset.set = '1';
    $('sectionText').textContent = vis.section > 0 ? `${fmt(vis.section)} m` : 'off';
    $<HTMLSelectElement>('building').value = vis.building;
    $('underlay').classList.toggle('on', vis.underlay);
  }

  /** Client-side plan extras (no server round trip): hide filtered buildings, faint walls of the level below. */
  decoratePlan(): void {
    const svg = this.planSvg();
    if (!svg) return;
    const b = this.view.vis.building;
    for (const el of svg.querySelectorAll('[data-id]')) {
      let gone = false;
      if (b !== 'all') {
        const p = parseKey(el.getAttribute('data-id') ?? '');
        const e = p ? this.model.get(p.coll, p.id) : undefined;
        gone = !!(p && e) && this.buildingOf(p.coll, e!) !== b;
      }
      el.classList.toggle('gone', gone);
    }
    const g = svg.querySelector('#underlay');
    if (!g) return;
    let out = '';
    if (this.view.vis.underlay) {
      const ls = this.model.data.levels.slice().sort((x, y) => x.floor - y.floor);
      const below = ls[ls.findIndex((l) => l.id === this.view.level) - 1];
      const S = this.planMap?.[3] ?? 1;
      for (const w of (this.model.list('walls') as Wall[]).filter((x) => below && x.level === below.id)) {
        const a = this.toPlan(...w.a);
        const c = this.toPlan(...w.b);
        out += `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="#0a84ff" stroke-opacity="0.4" stroke-width="${Math.max(2, w.t * S)}" stroke-dasharray="6 4"/>`;
      }
    }
    g.innerHTML = out;
    g.setAttribute('pointer-events', 'none');
  }

  // ---------- hover, hint bar, help ----------
  setHover(k: Key | null): void {
    if (k === this.hoverKey) return;
    this.hoverKey = k;
    const svg = this.planSvg();
    if (svg) {
      for (const el of svg.querySelectorAll('.hov')) el.classList.remove('hov');
      if (k) for (const el of svg.querySelectorAll(`[data-id="${CSS.escape(k)}"]`)) el.classList.add('hov');
    }
    const p = k ? parseKey(k) : null;
    const e = p ? this.model.get(p.coll, p.id) : undefined;
    $('hud').textContent = p && e ? label(this.model.data, p.coll, e) : '';
  }

  updateHint(): void {
    const c = this.ctx();
    const notes: string[] = [];
    const lv = this.model.data.levels.find((l) => l.id === this.view.level);
    if (this.walk.state === 'loading') notes.push('Loading game...');
    if (this.controls.walking && !this.quickFrom) notes.push('Walking at eye height');
    else if (editingForced(this.view.vis, this.model.data.levels, this.view.level)) notes.push(`${lv?.name ?? 'This level'} is hidden by the Levels settings - shown anyway because you are editing it`);
    if (this.view.vis.exploded && !this.controls.walking) notes.push('Exploded: levels drawn apart, saved as built');
    const pad = this.pad;
    if (pad?.device === 'pad' && pad.focus === 'drawer') notes.push('Pad in the side panel (B leaves)');
    if (this.splitting) notes.push(pad?.device === 'pad' ? 'Split' : 'Split: click where the line goes, Esc cancels');
    if (this.quickWalking) notes.push(pad?.device === 'pad' ? `Quick walk - ${this.controls.padRun ? 'running' : 'walking'}, ${padWords('L3', pad.style)} ${this.controls.padRun ? 'slow walk' : 'run'}, ${padWords('L3', pad.style)} held walk test, ${padWords('B', pad.style)} back` : 'Quick walk - Shift held runs, Shift+Tab back');
    // the controller: what A would take ("Stretch east edge (A)") becomes the A prompt's word; other dot words stay at the dot
    const padOn = pad?.device === 'pad';
    const partWords = this.splitting ? 'Split here' : padOn && pad.grabWords.endsWith(' (A)') ? pad.grabWords.slice(0, -4) : '';
    if (c === 'draw') notes.push(`${this.tool[0]!.toUpperCase()}${this.tool.slice(1)} tool on ${lv?.name ?? 'this level'}`);
    if (!window.isSecureContext) notes.push('Controller off: this address is not secure - use the https address from Kestrel-Editor-Network.cmd');
    const items = hintItems(c, pad?.device ?? 'keys', pad?.style ?? 'xbox', pad?.lbHeld ?? false).map((i) => `<b>${esc(i.keys)}</b> ${esc(i.id === 'padPick' && partWords ? partWords : i.name)}`);
    $('hint').innerHTML = [...notes.map((n) => `<span class="note">${esc(n)}</span>`), ...items].join('&nbsp;&nbsp;&nbsp;');
  }

  /** Redraws the hub when the controller style or the device changes (its Help tab shows their words). */
  renderHelp(): void {
    this.pad?.hub.render();
  }

  /** Every binding by group, keyboard and mouse words and the controller's: the hub's Help tab under the picture. */
  helpTableHtml(): string {
    const groups: Group[] = ['Camera', 'Edit', 'Tools', 'View', 'File'];
    const rows = helpRows(this.pad?.style ?? 'xbox');
    return (
      '<div id="helpTable"><table><tr class="dim"><td>Keys, mouse</td><td>Controller</td><td></td></tr></table>' +
      groups.map((g) => `<h4>${g}</h4><table>${rows.filter((r) => r.group === g).map((r) => `<tr><td>${esc(r.keys)}</td><td class="pad">${esc(r.pad)}</td><td>${esc(r.name)}</td></tr>`).join('')}</table>`).join('') +
      '<p class="dim">The plan takes the same tools: wheel zooms, right drag pans, double-click takes the camera there. In the small plan a click takes the camera there.</p></div>'
    );
  }

  // ---------- wall gaps (ON0b decision 7) ----------
  /** Every wall end within 5 cm of another wall but not on it. */
  gaps(): WallGap[] {
    return wallGaps(this.model.list('walls') as Wall[]);
  }

  /** The gaps at a wall's ends (its own ends, or another wall's end that would close onto it). */
  gapsOf(id: string): WallGap[] {
    return wallGaps(this.model.list('walls') as Wall[], false).filter((g) => g.wall === id);
  }

  /** Selected > Close gap: the selected wall's end moves onto the other wall (its doors keep their places). */
  closeGapSelected(): void {
    const s = this.selectedElem();
    const g = s?.coll === 'walls' ? this.gapsOf(s.id)[0] : undefined;
    if (!s || !g) return this.status('No gap at the ends of this wall');
    const w = s.e as Wall;
    const after = closeGap(w, g, this.model.get<Wall>('walls', g.other));
    const changes: Change[] = [{ coll: 'walls', id: w.id, before: clone(w), after }];
    // an opening is measured from end a: keep it where it was when end a moves
    const d = wallDir(w);
    const shift = (w.a[0] - after.a[0]) * d[0] + (w.a[1] - after.a[1]) * d[1];
    if (Math.abs(shift) > 1e-9) for (const o of this.model.list('openings') as Opening[]) if (o.wall === w.id) changes.push({ coll: 'openings', id: o.id, before: clone(o), after: { ...clone(o), at: +(o.at + shift).toFixed(3) } });
    this.commitText(`Closed the ${fmt(g.dist)} m gap at ${w.id} end ${g.end}`, changes);
  }

  /** The problem lines for the hub's Checks tab (wall gaps first, then fails and warnings), new ones marked. */
  problemLines(): { text: string; fresh: boolean }[] {
    const gaps = this.gaps().map((g) => ({ text: gapWords(g), fresh: true }));
    const c = this.lastChecks;
    if (!c) return gaps;
    const fresh = new Set(this.newProblems(c));
    const out: { text: string; fresh: boolean }[] = [...gaps];
    for (const f of c.standards.fails) out.push({ text: `standards: ${f}`, fresh: fresh.has(`STD ${f}`) });
    for (const r of c.results) if (r.status === 'FAIL' || r.status === 'WARN') for (const d of r.details) out.push({ text: `${r.status} ${r.id}: ${d}`, fresh: fresh.has(`${r.id} ${d}`) });
    return out;
  }

  // ---------- drafts and revert ----------
  scheduleDraft(): void {
    clearTimeout(this.draftTimer);
    this.draftTimer = window.setTimeout(() => {
      const write = this.model.dirty ? writeDraft(makeDraft(this.model.data, this.model.journal, Date.now())) : clearDraft();
      write.catch((err: unknown) => console.warn('draft not written', err));
    }, 1000);
  }

  offerDraft(d: Draft): void {
    const ask = $('ask');
    const when = new Date(d.savedAt).toLocaleString();
    const n = d.journal.length;
    ask.innerHTML = `Restore unsaved changes from ${esc(when)}? (${n} change${n === 1 ? '' : 's'})<button id="restore">Restore</button><button id="discard">Discard</button>`;
    ask.classList.remove('hidden');
    $('restore').addEventListener('click', () => {
      ask.classList.add('hidden');
      this.reload(d.campus, d.journal, true);
      this.status(`Restored ${n} unsaved change${n === 1 ? '' : 's'} from ${when}. Save keeps them; undo starts from here.`);
    });
    $('discard').addEventListener('click', () => {
      ask.classList.add('hidden');
      void clearDraft().catch(() => undefined);
      this.status('Discarded the unsaved changes');
    });
  }

  /** Swaps in other campus data (restore a draft, revert to the file) and redraws everything. */
  reload(data: Campus, journal: JournalEntry[], keepSaved = false): void {
    if (this.drag) this.endDrag(true);
    // a reverted or restored building is not the one the warm game holds
    this.walk.drop();
    this.model.replace(data, journal, keepSaved);
    this.select(null);
    this.view.rebuildAll();
    this.rebuildBlockers();
    void this.refreshPlan(false);
    this.scheduleChecks();
    this.renderPanel();
    this.updateBar();
  }

  async revert(): Promise<void> {
    if (!(await this.ask('Throw away every unsaved change and reload the file from disk? Undo history is cleared.', 'Revert', 'Keep my changes'))) return;
    try {
      const f = await loadFile();
      clearTimeout(this.draftTimer);
      await clearDraft().catch(() => undefined);
      this.reload(f.data, []);
      this.status('Reverted to the last saved file');
    } catch (err) {
      this.status(`Revert failed: ${String(err)}`);
    }
  }

  /** A yes / no question in the editor (A / B on the pad, or click); never the browser's own dialog. */
  ask(text: string, yes: string, no: string): Promise<boolean> {
    const box = $('ask');
    box.innerHTML = `<div>${esc(text)}</div><button class="yes">${esc(yes)} <span class="dim">(A)</span></button><button class="no">${esc(no)} <span class="dim">(B)</span></button>`;
    box.classList.remove('hidden');
    return new Promise((resolve) => {
      const done = (v: boolean): void => {
        box.classList.add('hidden');
        resolve(v);
      };
      box.querySelector('.yes')!.addEventListener('click', () => done(true));
      box.querySelector('.no')!.addEventListener('click', () => done(false));
    });
  }

  newProblems(c: CheckReply): string[] {
    return checkLines(c).filter((l) => !this.baseline?.has(l));
  }

  renderPanel(): void {
    for (const t of document.querySelectorAll<HTMLButtonElement>('#drawerHead button[data-tab]')) t.classList.toggle('on', t.dataset.tab === this.tab);
    const panel = $('panel');
    if (this.tab === 'pad' && this.pad) this.pad.renderPanel(panel);
    else if (this.tab === 'checks') panel.innerHTML = this.checksHtml();
    else if (this.tab === 'log') panel.innerHTML = this.logHtml();
    else this.renderProps(panel);
  }

  private checksHtml(): string {
    const c = this.lastChecks;
    if (!c) return '<p id="checks">Running the checks...</p>';
    const fresh = new Set(this.newProblems(c));
    const s = c.summary;
    let h = `<p id="checks"><b>${s.PASS ?? 0} pass, ${s.WARN ?? 0} warn, ${s.FAIL ?? 0} fail, ${s.SKIP ?? 0} skip</b> (check.mjs)<br>${esc(c.standards.line)}</p>`;
    h += '<p class="dim">Red lines are new since the editor opened. The rest were there before (expected fails are listed in REVIEW.md).</p>';
    const items: string[] = [];
    const gaps = this.gaps();
    if (gaps.length) items.push(`<li><b>Wall gaps</b> ${gaps.length} wall end${gaps.length === 1 ? '' : 's'} within 5 cm of another wall (select the wall: Close gap)${gaps.map((g) => `<div data-go="${esc(gapWords(g))}" class="bad">- ${esc(gapWords(g))}</div>`).join('')}</li>`);
    for (const f of c.standards.fails) items.push(`<li class="${fresh.has(`STD ${f}`) ? 'bad' : ''}">standards: ${esc(f)}</li>`);
    for (const r of c.results) {
      if (r.status === 'SKIP') continue;
      const lines = r.details.map((dt) => `<div data-go="${esc(dt)}" class="${fresh.has(`${r.id} ${dt}`) ? 'bad' : ''}">- ${esc(dt)}</div>`).join('');
      items.push(`<li><b>${esc(r.status)} ${esc(r.id)}</b> ${esc(r.title)}${lines}</li>`);
    }
    return h + `<ul class="list">${items.join('')}</ul>`;
  }

  private logHtml(): string {
    const j = this.model.journal;
    if (!j.length) return '<p class="dim">No changes since the last save. Saved changes are in docs/kestrel/editor-log.md.</p>';
    return `<p class="dim">${j.length} unsaved change${j.length === 1 ? '' : 's'}, newest first.</p><ul class="list">${j
      .slice()
      .reverse()
      .map((e) => `<li>${localTime(e.time)} ${e.action === 'edit' ? '' : `<b>${e.action === 'undo' ? 'Undid' : 'Redid'}:</b> `}${esc(e.text)}</li>`)
      .join('')}</ul>`;
  }

  private renderProps(panel: HTMLElement): void {
    const s = this.selectedElem();
    if (!s) {
      panel.innerHTML = '<p class="dim">Nothing selected. Click a room, wall, door or window in 3D or on the plan.</p>';
      return;
    }
    const e = s.e as Elem & Record<string, unknown>;
    const rows: string[] = [`<div class="row"><span>What</span><b>${esc(label(this.model.data, s.coll, s.e))}</b></div>`];
    const text = (k: string, name: string): void => void rows.push(`<label class="row"><span>${name}</span><input data-k="${k}" value="${esc(String(e[k] ?? ''))}"></label>`);
    const num = (k: string, name: string, v: unknown): void => void rows.push(`<label class="row"><span>${name}</span><input type="number" step="0.05" data-k="${k}" value="${esc(String(v ?? ''))}"></label>`);
    const sel = (k: string, name: string, opts: [string, string][]): void =>
      void rows.push(`<label class="row"><span>${name}</span><select data-k="${k}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(e[k]) === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`);
    const rect = (r: Rect): void => {
      num('rect.0', 'West x', r[0]);
      num('rect.2', 'East x', r[2]);
      num('rect.1', 'South z', r[1]);
      num('rect.3', 'North z', r[3]);
      rows.push(`<div class="row"><span>Size</span>${fmt(r[2] - r[0])} x ${fmt(r[3] - r[1])} m</div>`);
    };
    if (s.coll === 'rooms') {
      text('name', 'Name');
      sel('kind', 'Kind', ROOM_KINDS.map((k) => [k, k]));
      sel('ring', 'Access', RING_NAMES.map((n, i) => [String(i), n]));
      rect((e as Room).rect);
    } else if (s.coll === 'walls') {
      const w = e as Wall;
      sel('kind', 'Kind', WALL_KINDS.map((k) => [k, k === 'boundary' ? 'boundary (fence)' : k]));
      num('t', 'Thickness m', w.t);
      num('h', 'Height m', w.h);
      num('a.0', 'Start x', w.a[0]);
      num('a.1', 'Start z', w.a[1]);
      num('b.0', 'End x', w.b[0]);
      num('b.1', 'End z', w.b[1]);
      rows.push(`<div class="row"><span>Length</span>${fmt(wallLen(w))} m</div>`);
    } else if (s.coll === 'openings') {
      const o = e as Opening;
      sel('type', 'Type', OPENING_TYPES.map((t) => [t, t]));
      num('w', 'Width m', o.w);
      num('h', 'Height m', o.h);
      num('sill', 'Sill m', o.sill);
      num('at', 'Along wall m', o.at);
      sel('locked', 'Locked', [['false', 'no'], ['true', 'yes']]);
      text('key', 'Key / reader');
      text('reason', 'Note');
      const names = (o.between ?? []).map((id) => (this.model.get<Room>('rooms', id)?.name as string | undefined) ?? id);
      rows.push(`<div class="row"><span>Between</span>${esc(names.join(' and ') || '-')}</div>`);
    } else if (s.coll === 'stairs') {
      const st = e as Stair;
      const above = this.levelsAbove(st.from);
      text('name', 'Name');
      rows.push(`<label class="row"><span>Type</span><select data-stairtype>${STAIR_TYPES.map((t) => `<option value="${t.id}" ${stairTypeOf(st) === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>`);
      sel('up', 'Climbs', ['N', 'S', 'E', 'W'].map((d) => [d, d]));
      sel('to', 'To level', above.map((l) => [l.id, `${l.name} (${l.id})`]));
      num('width', 'Flight width m', st.width);
      rect(st.rect);
      const fit = stairFit(this.model.data, st);
      rows.push(`<p id="stairFit" class="${fit.ok ? 'dim' : 'bad'}">${esc(fit.words)}</p><div class="row"><button id="fitStair">Fit</button><button id="turnClimb">Turn climb 90</button></div>`);
    } else if (s.coll === 'voids') {
      text('name', 'Name');
      sel('kind', 'Kind', HOLE_KINDS.map((k) => [k, HOLE_NAMES[k] ?? k]));
      rect((e as Void).rect);
    } else if (s.coll === 'ladders') {
      const ld = e as Ladder;
      text('name', 'Name');
      num('at.0', 'x', ld.at[0]);
      num('at.1', 'z', ld.at[1]);
      sel('facing', 'Facing', ['N', 'S', 'E', 'W'].map((d) => [d, d]));
      sel('to', 'To level', this.levelsAbove(ld.from).map((l) => [l.id, `${l.name} (${l.id})`]));
    }
    // ON2 decision 10: the id, renamed with every reference (Enter keeps it)
    rows.push(`<label class="row"><span>Id</span><input data-id-field value="${esc(s.id)}"></label>`);
    const gap = s.coll === 'walls' ? this.gapsOf(s.id)[0] : undefined;
    if (gap) rows.push(`<p class="bad">${esc(gapWords(gap))}</p>`);
    rows.push(`<div class="row"><button id="del">Delete</button><button id="dup">Duplicate</button><button id="frame">Go to</button>${gap ? '<button id="closeGap">Close gap</button>' : ''}</div>`);
    panel.innerHTML = rows.join('');
    if (gap) $('closeGap').addEventListener('click', () => this.closeGapSelected());
    for (const el of panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]')) el.addEventListener('change', () => this.setField(s.coll, s.id, el.dataset.k!, el.value, el.type === 'number'));
    panel.querySelector<HTMLInputElement>('[data-id-field]')?.addEventListener('change', (ev) => {
      if (!this.renameSelected((ev.target as HTMLInputElement).value)) this.renderPanel();
    });
    panel.querySelector<HTMLSelectElement>('[data-stairtype]')?.addEventListener('change', (ev) => this.commit([{ coll: 'stairs', id: s.id, before: s.e, after: withStairType(s.e as Stair, (ev.target as HTMLSelectElement).value) }]));
    document.getElementById('fitStair')?.addEventListener('click', () => this.fitSelected());
    document.getElementById('turnClimb')?.addEventListener('click', () => this.turnStairClimb());
    $('del').addEventListener('click', () => this.deleteSelected());
    $('dup').addEventListener('click', () => this.duplicate());
    $('frame').addEventListener('click', () => this.frameSelected());
  }

  /** The levels above a level, lowest first (a stair's or ladder's To level list). */
  levelsAbove(id: string): Level[] {
    const f = this.model.data.levels.find((q) => q.id === id)?.floor ?? Infinity;
    return this.model.data.levels.filter((l) => l.floor > f).sort((a, b) => a.floor - b.floor);
  }

  private setField(coll: Coll, id: string, path: string, raw: string, isNum: boolean): void {
    const before = this.model.snapshot(coll, id);
    if (!before) return;
    const after = clone(before) as unknown as Record<string, unknown>;
    let v: unknown = raw;
    if (isNum || path === 'ring') {
      v = Number(raw);
      if (!Number.isFinite(v as number)) return this.renderPanel();
    } else if (path === 'locked') v = raw === 'true';
    const [k, i] = path.split('.') as [string, string | undefined];
    if (i !== undefined) {
      const arr = (after[k] as number[]).slice();
      arr[Number(i)] = v as number;
      after[k] = k === 'rect' ? normRect(arr as Rect) : arr;
    } else after[k] = v;
    let a = after as unknown as Elem;
    if (coll === 'openings') a = withBetween(this.model, a as Opening);
    this.commit([{ coll, id, before, after: a }]);
  }
}

type Merge = { key: string; at: number; within: number };

interface CheckReply {
  results: { id: string; title: string; status: string; details: string[] }[];
  summary: Record<string, number>;
  standards: { fails: string[]; info: string[]; line: string };
}

/** Every problem as one comparable line, for "new since the editor opened". */
function checkLines(c: CheckReply): string[] {
  const out: string[] = [];
  for (const f of c.standards.fails) out.push(`STD ${f}`);
  for (const r of c.results) if (r.status === 'FAIL' || r.status === 'WARN') for (const d of r.details) out.push(`${r.id} ${d}`);
  return out;
}

function moveWordsOf(a: Elem, b: Elem): string {
  const ra = (a as Room).rect;
  const rb = (b as Room).rect;
  return moveWords(rb[0] - ra[0], rb[1] - ra[1]);
}

function isTyping(): boolean {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || (a.tagName === 'SELECT' && a.closest('#panel') !== null));
}

boot().catch((err: unknown) => {
  document.body.innerHTML = `<pre style="padding:16px;color:#b00">Level editor could not start: ${esc(String(err))}\n\nRun it with npm run editor (the dev server serves the campus file).</pre>`;
});
