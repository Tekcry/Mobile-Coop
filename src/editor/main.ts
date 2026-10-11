/**
 * Kestrel level editor (dev only: `npm run editor`, docs/kestrel/editor.md). Fly or walk the campus in 3D, edit rooms,
 * walls, doors and windows in 3D or on the live floor plan, see the Kestrel checks update, and save the campus file,
 * the plan images and a change log for review. Never part of the game build.
 */
import { actionForKey, helpRows, hintItems, keyId } from './actions';
import type { Ctx, Group } from './actions';
import { CameraControls } from './controls';
import { PadControl } from './padControl';
import { clearDraft, makeDraft, readDraft, shouldOffer, writeDraft } from './draft';
import type { Draft } from './draft';
import { EditorScene } from './scene3d';
import { buildingAt, editingForced, GAP_MAX, parseVis, presetPicks } from './visibility';
import type { LevelPreset } from './visibility';
import { EditorModel, localTime, logMarkdown } from './model';
import type { Change, JournalEntry } from './model';
import { fmt, moveWords, nearestWall, normRect, pieceObb, projectOnWall, setEdge, snap, wallLen, wallPieces, wallPoint } from './geometry';
import type { Edge, Obb } from './geometry';
import { deleteChanges, describeEdit, label, newOpening, newRoom, newWall, OPENING_TYPES, ROOM_KINDS, WALL_KINDS, withBetween } from './ops';
import type { Campus, Coll, Elem, Key, Ladder, Opening, Pt, Rect, Room, Stair, Void, Wall } from './types';
import { keyOf, parseKey } from './types';

type Tool = 'select' | 'room' | 'wall' | 'door' | 'window';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const RING_NAMES = ['Perimeter (yard, public lane)', 'Level 1 - reception, goods-in', 'Level 2 - staff', 'Level 3 - higher card', 'Level 4 - data hall, tunnels', 'Level 5 - meet-me, riser'];

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
  help: boolean;
  vis: unknown;
}
function loadPrefs(): Prefs {
  const p: Prefs = { layout: 'both', split: 'row', swap: false, frac: 0.58, pinned: true, drawer: true, minimap: true, help: true, vis: null };
  try {
    const r = JSON.parse(localStorage.getItem(PREFS) ?? 'null') as Partial<Prefs> | null;
    if (r && typeof r === 'object') {
      if (r.layout === '3d' || r.layout === 'both' || r.layout === 'plan') p.layout = r.layout;
      if (r.split === 'row' || r.split === 'col') p.split = r.split;
      if (typeof r.frac === 'number' && r.frac >= 0.15 && r.frac <= 0.85) p.frac = r.frac;
      for (const k of ['swap', 'pinned', 'drawer', 'minimap', 'help'] as const) if (typeof r[k] === 'boolean') p[k] = r[k];
      p.vis = r.vis;
    }
  } catch {
    // no storage (private window): defaults
  }
  return p;
}

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
}

export class Editor {
  readonly model: EditorModel;
  readonly view: EditorScene;
  readonly controls: CameraControls;
  tool: Tool = 'select';
  selected: Key | null = null;
  drag: Drag | null = null;
  wallTemplate: Wall | null = null;
  private planTimer = 0;
  private checkTimer = 0;
  private planSeq = 0;
  private planLevel = '';
  private planViewBox: number[] | null = null;
  private planMap: number[] | null = null;
  private baseline: Set<string> | null = null;
  tab: 'props' | 'checks' | 'log' = 'props';
  pad: PadControl | null = null;
  private lastChecks: CheckReply | null = null;
  private hoverAt = 0;
  private hoverKey: Key | null = null;
  readonly prefs = loadPrefs();
  private planFullBox: number[] | null = null;
  private draftTimer = 0;

  constructor(data: Campus) {
    this.model = new EditorModel(data);
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
  get grid(): number {
    return this.model.data.meta.grid ?? 0.5;
  }

  get fineGrid(): number {
    return this.model.data.meta.objectGrid ?? 0.1;
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
    if (this.pad?.menuOpen) return 'menu';
    if (this.drag) return 'drag';
    if (this.tool !== 'select') return 'draw';
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
    this.view.refresh(keys);
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

  commit(changes: Change[]): void {
    const text = describeEdit(this.model.data, changes);
    if (this.model.commit(text, changes)) {
      this.status(text);
      this.scheduleDraft();
    }
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
      return [
        { id: 'W', x: r[0], z: cz, y: f + 0.3 },
        { id: 'E', x: r[2], z: cz, y: f + 0.3 },
        { id: 'S', x: cx, z: r[1], y: f + 0.3 },
        { id: 'N', x: cx, z: r[3], y: f + 0.3 },
      ];
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
      if (d.isNew) (e as Room).rect = normRect([r[0], r[1], snap(x, g), snap(z, g)]);
      else if (d.handle) (e as Room).rect = setEdge(r, d.handle as Edge, snap(d.handle === 'W' || d.handle === 'E' ? x : z, g), Math.max(g, 0.5));
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
      } else (e as Opening).at = +Math.min(L - o.w / 2, Math.max(o.w / 2, s)).toFixed(3);
      return e;
    }
    if (d.coll === 'ladders') {
      const a = (d.before as Ladder).at;
      (e as Ladder).at = [+(a[0] + dx).toFixed(3), +(a[1] + dz).toFixed(3)];
    }
    return e;
  }

  moveDrag(x: number, z: number, fine: boolean): void {
    const d = this.drag;
    if (!d) return;
    this.model.preview(d.coll, this.dragged(d, x, z, fine));
  }

  endDrag(cancel: boolean): void {
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    this.updateHint();
    if (cancel || !d.moved) {
      if (d.isNew) this.model.drop(d.coll, d.id);
      else this.model.preview(d.coll, d.before);
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
      this.commit([{ coll: d.coll, id: d.id, before: null, after }]);
      this.select(keyOf(d.coll, d.id));
      return;
    }
    if (d.coll === 'openings') after = withBetween(this.model, after as Opening);
    this.commit([{ coll: d.coll, id: d.id, before: d.before, after }]);
    this.renderPanel();
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
      const w = newWall(this.model, lvl, p, p, this.wallTemplate ?? undefined);
      this.model.preview('walls', w);
      this.beginDrag('walls', w.id, null, p, this.viewFloor(), sx, sy, source, true);
    } else if (this.tool === 'door' || this.tool === 'window') {
      const w = (onWall ? this.model.get<Wall>('walls', onWall) : undefined) ?? nearestWall(this.model.list('walls') as Wall[], lvl, x, z, 1.2);
      if (!w) return this.status('Click on or next to a wall to put the opening in it');
      const type = this.tool === 'window' ? 'window' : $<HTMLSelectElement>('doorType').value;
      const o = newOpening(this.model, w, snap(projectOnWall(w, x, z).s, g), type);
      this.commit([{ coll: 'openings', id: o.id, before: null, after: o }]);
      this.select(keyOf('openings', o.id));
    }
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
        return;
      }
      const now = performance.now();
      if (now - this.hoverAt < 60) return;
      this.hoverAt = now;
      this.hover(px, py);
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 0 && this.drag?.source === '3d') this.endDrag(false);
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

  /** The live size or offset of what is being dragged, for the pad's dot label. */
  dragWords(): string {
    const d = this.drag;
    const s = d ? this.model.get(d.coll, d.id) : undefined;
    if (!d || !s) return '';
    if (d.coll === 'walls') return `length ${fmt(wallLen(s as Wall))} m`;
    if ('rect' in s) {
      const r = (s as Room).rect;
      return d.isNew || d.handle ? `size ${fmt(r[2] - r[0])} x ${fmt(r[3] - r[1])} m` : `moved ${moveWordsOf(d.before, s)}`;
    }
    if (d.coll === 'openings') return `width ${fmt((s as Opening).w)} m, at ${fmt((s as Opening).at)} m`;
    return '';
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
        const d = this.drag;
        if (d && d.source === 'plan') {
          if (!d.moved && Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 4) return;
          d.moved = true;
          this.moveDrag(x, z, e.ctrlKey);
        }
      }
    });
    host.addEventListener('pointerup', (e) => {
      if (pan) {
        const moved = downAt && Math.abs(e.clientX - downAt[0]) + Math.abs(e.clientY - downAt[1]) > 4;
        pan = null;
        if (moved || e.button !== 2) return;
      }
      if (this.drag?.source === 'plan') this.endDrag(false);
    });
    host.addEventListener('dblclick', (e) => {
      const p = this.svgPoint(e);
      if (!p) return;
      const [x, z] = this.fromPlan(p[0], p[1]);
      this.goTo(x, z);
    });
  }

  /** Moves the camera to a plan point: the walker steps there, the flyer looks down on it. */
  goTo(x: number, z: number): void {
    if (this.controls.walking) this.controls.walkAt(x, z, this.floor());
    else this.controls.overlook(x, z, this.viewFloor(), 22);
  }

  // ---------- walk mode ----------
  rebuildBlockers(): void {
    const level = this.view.level;
    const ops = this.model.list('openings') as Opening[];
    const out: Obb[] = [];
    for (const w of this.model.list('walls') as Wall[]) {
      if (w.level !== level) continue;
      for (const p of wallPieces(w, ops)) if (p.y0 < 1.75 && p.y1 > 0.42) out.push(pieceObb(w, p));
    }
    this.controls.blockers = out;
  }

  toggleWalk(): void {
    if (this.controls.walking) {
      const c = this.view.camera.position;
      this.controls.overlook(c.x, c.z, this.viewFloor(), 22);
      this.view.showAll = false;
    } else {
      const canvas = $<HTMLCanvasElement>('c');
      const pt = this.view.planePoint(canvas.clientWidth / 2, canvas.clientHeight / 2, this.floor());
      const c = this.view.camera.position;
      const [x, z] = pt ?? [c.x, c.z];
      this.controls.walkAt(x, z, this.floor());
      this.view.showAll = true;
    }
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
    const tools: Record<string, Tool> = { toolSelect: 'select', toolRoom: 'room', toolWall: 'wall', toolDoor: 'door', toolWindow: 'window' };
    if (tools[id]) return this.setTool(tools[id]);
    switch (id) {
      case 'walk': return this.toggleWalk();
      case 'levelUp': return this.stepLevel(1);
      case 'levelDown': return this.stepLevel(-1);
      case 'frame': return this.frameSelected();
      case 'cancel':
        if (this.drag) this.endDrag(true);
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
      case 'help':
        this.prefs.help = $('help').classList.toggle('hidden') === false;
        return this.savePrefs();
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
    if (s.coll === 'openings') after = withBetween(this.model, after as Opening);
    this.commit([{ coll: s.coll, id: s.id, before: d.before, after }]);
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
    this.goTo(x, z);
  }

  // ---------- save ----------
  async save(): Promise<void> {
    if (!this.model.dirty) return this.status('Nothing new to save');
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
    this.tool = t;
    this.updateHandles();
    this.updateBar();
    const hint: Record<Tool, string> = {
      select: 'Select: click to pick, drag to move, drag the orange handles to resize',
      room: 'Room: drag out a rectangle on the floor',
      wall: 'Wall: drag from one end to the other (copies the last wall you selected)',
      door: 'Door: click on a wall (type from the list)',
      window: 'Window: click on a wall',
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
          <button data-tool="select" title="1">1 Select</button><button data-tool="room" title="2">2 Room</button><button data-tool="wall" title="3">3 Wall</button><button data-tool="door" title="4">4 Door</button><select id="doorType">${OPENING_TYPES.filter((t) => t !== 'window').map((t) => `<option>${t}</option>`).join('')}</select><button data-tool="window" title="5">5 Window</button>
        </span>
        <span class="group"><button id="walk" title="Tab">Walk</button><button id="undo" title="Ctrl+Z">Undo</button><button id="redo" title="Ctrl+Y">Redo</button><button id="save" title="Ctrl+S">Save</button><button id="revert" title="Throw away unsaved changes and reload the file">Revert to last save</button><button id="helpBtn" title="H">Help</button></span>
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
    for (const b of $('tools').querySelectorAll('button')) b.addEventListener('click', () => this.setTool(b.dataset.tool as Tool));
    $('walk').addEventListener('click', () => this.toggleWalk());
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

  updateBar(): void {
    for (const b of $('tools').querySelectorAll<HTMLButtonElement>('button')) b.classList.toggle('on', b.dataset.tool === this.tool);
    $('walk').textContent = this.controls.walking ? 'Fly' : 'Walk';
    $('walk').classList.toggle('on', this.controls.walking);
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
    $('help').classList.toggle('hidden', !p.help);
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
    if (this.controls.walking) notes.push('Walking (Tab flies)');
    else if (editingForced(this.view.vis, this.model.data.levels, this.view.level)) notes.push(`${lv?.name ?? 'This level'} is hidden by the Levels settings - shown anyway because you are editing it`);
    if (this.view.vis.exploded && !this.controls.walking) notes.push('Exploded: levels drawn apart, saved as built');
    const pad = this.pad;
    if (pad?.device === 'pad' && pad.focus !== '3d') notes.push(pad.focus === 'plan' ? 'Pad on the plan (View held moves on)' : 'Pad in the side panel (B leaves)');
    if (c === 'draw') notes.push(`${this.tool[0]!.toUpperCase()}${this.tool.slice(1)} tool on ${lv?.name ?? 'this level'}`);
    const items = hintItems(c, pad?.device ?? 'keys', pad?.style ?? 'xbox').map((i) => `<b>${esc(i.keys)}</b> ${esc(i.name)}`);
    $('hint').innerHTML = [...notes.map((n) => `<span class="note">${esc(n)}</span>`), ...items].join('&nbsp;&nbsp;&nbsp;');
  }

  renderHelp(): void {
    const groups: Group[] = ['Camera', 'Edit', 'Tools', 'View', 'File'];
    const rows = helpRows(this.pad?.style ?? 'xbox');
    $('help').innerHTML =
      '<h3>Kestrel level editor <span class="dim">(H hides this)</span></h3>' +
      '<table><tr class="dim"><td>Keys, mouse</td><td>Controller</td><td></td></tr></table>' +
      groups.map((g) => `<h4>${g}</h4><table>${rows.filter((r) => r.group === g).map((r) => `<tr><td>${esc(r.keys)}</td><td class="pad">${esc(r.pad)}</td><td>${esc(r.name)}</td></tr>`).join('')}</table>`).join('') +
      '<p class="dim">The plan takes the same tools: wheel zooms, right drag pans, double-click takes the camera there. In the small plan a click takes the camera there.</p>';
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
      this.reload(d.campus, d.journal);
      this.status(`Restored ${n} unsaved change${n === 1 ? '' : 's'} from ${when}. Save keeps them; undo starts from here.`);
    });
    $('discard').addEventListener('click', () => {
      ask.classList.add('hidden');
      void clearDraft().catch(() => undefined);
      this.status('Discarded the unsaved changes');
    });
  }

  /** Swaps in other campus data (restore a draft, revert to the file) and redraws everything. */
  reload(data: Campus, journal: JournalEntry[]): void {
    if (this.drag) this.endDrag(true);
    this.model.replace(data, journal);
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
    if (this.tab === 'checks') panel.innerHTML = this.checksHtml();
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
    for (const f of c.standards.fails) items.push(`<li class="${fresh.has(`STD ${f}`) ? 'bad' : ''}">standards: ${esc(f)}</li>`);
    for (const r of c.results) {
      if (r.status === 'SKIP') continue;
      const lines = r.details.map((dt) => `<div class="${fresh.has(`${r.id} ${dt}`) ? 'bad' : ''}">- ${esc(dt)}</div>`).join('');
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
      text('name', 'Name');
      sel('up', 'Climbs', ['N', 'S', 'E', 'W'].map((d) => [d, d]));
      rect((e as Stair).rect);
    } else if (s.coll === 'voids') {
      text('name', 'Name');
      rect((e as Void).rect);
    } else if (s.coll === 'ladders') {
      text('name', 'Name');
      num('at.0', 'x', (e as Ladder).at[0]);
      num('at.1', 'z', (e as Ladder).at[1]);
      sel('facing', 'Facing', ['N', 'S', 'E', 'W'].map((d) => [d, d]));
    }
    rows.push('<div class="row"><button id="del">Delete</button><button id="dup">Duplicate</button><button id="frame">Go to</button></div>');
    panel.innerHTML = rows.join('');
    for (const el of panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]')) el.addEventListener('change', () => this.setField(s.coll, s.id, el.dataset.k!, el.value, el.type === 'number'));
    $('del').addEventListener('click', () => this.deleteSelected());
    $('dup').addEventListener('click', () => this.duplicate());
    $('frame').addEventListener('click', () => this.frameSelected());
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
