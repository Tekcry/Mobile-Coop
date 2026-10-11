/**
 * Kestrel level editor (dev only: `npm run editor`, docs/kestrel/editor.md). Fly or walk the campus in 3D, edit rooms,
 * walls, doors and windows in 3D or on the live floor plan, see the Kestrel checks update, and save the campus file,
 * the plan images and a change log for review. Never part of the game build.
 */
import { CameraControls } from './controls';
import { EditorScene } from './scene3d';
import type { ViewMode } from './scene3d';
import { EditorModel, localTime, logMarkdown } from './model';
import type { Change } from './model';
import { fmt, nearestWall, normRect, pieceObb, projectOnWall, setEdge, snap, wallLen, wallPieces, wallPoint } from './geometry';
import type { Edge, Obb } from './geometry';
import { deleteChanges, describeEdit, label, newOpening, newRoom, newWall, OPENING_TYPES, ROOM_KINDS, WALL_KINDS, withBetween } from './ops';
import type { Campus, Coll, Elem, Key, Ladder, Opening, Pt, Rect, Room, Stair, Void, Wall } from './types';
import { keyOf, parseKey } from './types';

type Tool = 'select' | 'room' | 'wall' | 'door' | 'window';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const RING_NAMES = ['Perimeter (yard, public lane)', 'Level 1 - reception, goods-in', 'Level 2 - staff', 'Level 3 - higher card', 'Level 4 - data hall, tunnels', 'Level 5 - meet-me, riser'];

async function boot(): Promise<void> {
  const res = await fetch('/__editor/campus', { cache: 'no-store' });
  if (!res.ok) throw new Error(`could not load the campus file (${res.status})`);
  const data = (await res.json()) as Campus;
  // exposed for the e2e smoke test and console poking (dev tool only)
  (window as unknown as { __editor: Editor }).__editor = new Editor(data);
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
  source: '3d' | 'plan';
  /** A new element being drawn (room or wall tool). */
  isNew: boolean;
}

class Editor {
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
  private tab: 'props' | 'checks' | 'log' = 'props';
  private lastChecks: CheckReply | null = null;
  private hoverAt = 0;

  constructor(data: Campus) {
    this.model = new EditorModel(data);
    const canvas = $<HTMLCanvasElement>('c');
    this.view = new EditorScene(canvas, this.model);
    this.controls = new CameraControls(this.view.camera, canvas, () => !isTyping());
    this.view.level = data.levels.some((l) => l.id === 'G') ? 'G' : (data.levels[0]?.id ?? '');
    this.view.rebuildAll();
    const site = data.meta.site ?? [0, 0, 100, 80];
    this.controls.overlook((site[0] + site[2]) / 2, (site[1] + site[3]) / 2, 0, 90);
    this.view.scene.onBeforeRenderObservable.add(() => {
      this.controls.update(Math.min(0.05, this.view.engine.getDeltaTime() / 1000));
      this.drawCameraMarker();
    });
    new ResizeObserver(() => this.view.engine.resize()).observe($('view3d'));

    this.model.onChange((keys) => this.changed(keys));
    this.buildToolbar();
    this.bind3d(canvas);
    this.bindPlan();
    this.bindKeys();
    this.rebuildBlockers();
    this.refreshPlan(true);
    this.runChecks(true);
    this.renderPanel();
    this.status(`Loaded ${data.rooms.length} rooms, ${data.walls.length} walls, ${data.openings.length} openings on ${data.levels.length} levels. H shows the keys.`);
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
  }

  commit(changes: Change[]): void {
    const text = describeEdit(this.model.data, changes);
    if (this.model.commit(text, changes)) this.status(text);
  }

  // ---------- handles ----------
  handlesFor(): { id: string; x: number; z: number; y: number }[] {
    const s = this.selectedElem();
    if (!s || this.tool !== 'select') return [];
    const lvl = this.levelOf(s.coll, s.e);
    const f = this.floor(lvl);
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
  beginDrag(coll: Coll, id: string, handle: string | null, start: Pt, planeY: number, sx: number, sy: number, source: '3d' | 'plan', isNew = false): void {
    const before = this.model.snapshot(coll, id);
    if (!before) return;
    this.drag = { coll, id, handle, before, start, planeY, moved: isNew, sx, sy, source, isNew };
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
  toolDown(x: number, z: number, sx: number, sy: number, source: '3d' | 'plan', fine: boolean, onWall?: string): void {
    const g = fine ? this.fineGrid : this.grid;
    const p: Pt = [snap(x, g), snap(z, g)];
    const lvl = this.view.level;
    if (this.tool === 'room') {
      const r = newRoom(this.model, lvl, [p[0], p[1], p[0], p[1]]);
      this.model.preview('rooms', r);
      this.beginDrag('rooms', r.id, null, p, this.floor(), sx, sy, source, true);
    } else if (this.tool === 'wall') {
      const w = newWall(this.model, lvl, p, p, this.wallTemplate ?? undefined);
      this.model.preview('walls', w);
      this.beginDrag('walls', w.id, null, p, this.floor(), sx, sy, source, true);
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
        const pt = this.view.planePoint(px, py, this.floor());
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
    const pt = this.view.planePoint(px, py, this.floor());
    const hit = this.view.pick(px, py).hit;
    const p = hit ? parseKey(hit.key) : null;
    const e = p ? this.model.get(p.coll, p.id) : undefined;
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
      svg.setAttribute('viewBox', this.planViewBox.join(' '));
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      overlay.id = 'overlay';
      svg.appendChild(overlay);
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
    else this.controls.overlook(x, z, this.floor(), 22);
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
      this.controls.overlook(c.x, c.z, this.floor(), 22);
      this.view.showAll = false;
    } else {
      const canvas = $<HTMLCanvasElement>('c');
      const pt = this.view.planePoint(canvas.clientWidth / 2, canvas.clientHeight / 2, this.floor());
      const c = this.view.camera.position;
      const [x, z] = pt ?? [c.x, c.z];
      this.controls.walkAt(x, z, this.floor());
      this.view.showAll = true;
    }
    this.view.applyVisibility();
    this.updateBar();
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
      $('checks').textContent = `checks failed to run: ${String(err)}`;
    }
  }

  // ---------- keys ----------
  private bindKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (isTyping()) {
        if (e.key === 'Escape') (document.activeElement as HTMLElement).blur();
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
      } else if (ctrl && e.code === 'KeyY') {
        e.preventDefault();
        this.redo();
      } else if (ctrl && e.code === 'KeyS') {
        e.preventDefault();
        void this.save();
      } else if (ctrl && e.code === 'KeyD') {
        e.preventDefault();
        this.duplicate();
      } else if (ctrl) return;
      else if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleWalk();
      } else if (e.key >= '1' && e.key <= '5') this.setTool((['select', 'room', 'wall', 'door', 'window'] as Tool[])[Number(e.key) - 1]!);
      else if (e.code === 'Escape') {
        if (this.drag) this.endDrag(true);
        else if (this.tool !== 'select') this.setTool('select');
        else this.select(null);
      } else if (e.code === 'Delete' || e.code === 'Backspace') this.deleteSelected();
      else if (e.code === 'KeyF') this.frameSelected();
      else if (e.code === 'KeyP') this.cyclePlan();
      else if (e.code === 'KeyH') $('help').classList.toggle('hidden');
      else if (e.code === 'PageUp') {
        e.preventDefault();
        this.stepLevel(1);
      } else if (e.code === 'PageDown') {
        e.preventDefault();
        this.stepLevel(-1);
      } else if (e.code.startsWith('Arrow')) {
        e.preventDefault();
        const g = e.shiftKey ? this.grid * 10 : this.grid;
        const v: Pt = e.code === 'ArrowLeft' ? [-g, 0] : e.code === 'ArrowRight' ? [g, 0] : e.code === 'ArrowUp' ? [0, g] : [0, -g];
        this.nudge(v);
      }
    });
  }

  undo(): void {
    const e = this.model.undo();
    this.status(e ? `Undid: ${e.text}` : 'Nothing to undo');
  }

  redo(): void {
    const e = this.model.redo();
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
  }

  private viewIndex = 0;
  cyclePlan(): void {
    const modes = ['split', 'big', 'hidden'];
    this.viewIndex = (this.viewIndex + 1) % modes.length;
    document.body.dataset.plan = modes[this.viewIndex];
  }

  private buildToolbar(): void {
    const d = this.model.data;
    const levels = d.levels.slice().sort((a, b) => b.floor - a.floor);
    $('bar').innerHTML = `
      <span class="title">Kestrel editor</span>
      <label>Level <select id="level">${levels.map((l) => `<option value="${esc(l.id)}">${esc(l.id)} - ${esc(l.name)} (${fmt(l.floor)} m)</option>`).join('')}</select></label>
      <label>Show <select id="viewMode"><option value="cut">This level and below</option><option value="only">This level only</option><option value="all">Everything</option></select></label>
      <span class="group" id="tools">
        <button data-tool="select" title="1">1 Select</button><button data-tool="room" title="2">2 Room</button><button data-tool="wall" title="3">3 Wall</button><button data-tool="door" title="4">4 Door</button><select id="doorType">${OPENING_TYPES.filter((t) => t !== 'window').map((t) => `<option>${t}</option>`).join('')}</select><button data-tool="window" title="5">5 Window</button>
      </span>
      <span class="group"><button id="walk" title="Tab">Walk</button><button id="undo" title="Ctrl+Z">Undo</button><button id="redo" title="Ctrl+Y">Redo</button><button id="save" title="Ctrl+S">Save</button><button id="helpBtn" title="H">Help</button></span>
      <span id="checksBadge"></span>`;
    $<HTMLSelectElement>('level').value = this.view.level;
    $<HTMLSelectElement>('level').addEventListener('change', (e) => this.setLevel((e.target as HTMLSelectElement).value));
    $<HTMLSelectElement>('viewMode').addEventListener('change', (e) => {
      this.view.view = (e.target as HTMLSelectElement).value as ViewMode;
      this.view.applyVisibility();
    });
    for (const b of $('tools').querySelectorAll('button')) b.addEventListener('click', () => this.setTool(b.dataset.tool as Tool));
    $('walk').addEventListener('click', () => this.toggleWalk());
    $('undo').addEventListener('click', () => this.undo());
    $('redo').addEventListener('click', () => this.redo());
    $('save').addEventListener('click', () => void this.save());
    $('helpBtn').addEventListener('click', () => $('help').classList.toggle('hidden'));
    $('checksBadge').addEventListener('click', () => {
      this.tab = 'checks';
      this.renderPanel();
    });
    for (const t of document.querySelectorAll<HTMLButtonElement>('#tabs button'))
      t.addEventListener('click', () => {
        this.tab = t.dataset.tab as 'props' | 'checks' | 'log';
        this.renderPanel();
      });
    // keep shortcuts working after a toolbar click
    for (const el of $('bar').querySelectorAll('button, select')) el.addEventListener('change', () => (el as HTMLElement).blur());
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

  newProblems(c: CheckReply): string[] {
    return checkLines(c).filter((l) => !this.baseline?.has(l));
  }

  renderPanel(): void {
    for (const t of document.querySelectorAll<HTMLButtonElement>('#tabs button')) t.classList.toggle('on', t.dataset.tab === this.tab);
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

function isTyping(): boolean {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || (a.tagName === 'SELECT' && a.closest('#panel') !== null));
}

boot().catch((err: unknown) => {
  document.body.innerHTML = `<pre style="padding:16px;color:#b00">Level editor could not start: ${esc(String(err))}\n\nRun it with npm run editor (the dev server serves the campus file).</pre>`;
});
