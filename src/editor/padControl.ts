/**
 * Controller editing for the level editor (ED2 Part C): polls the pad each frame and drives the editor. A centre dot
 * in 3D (a crosshair on the plan) is the pad's pointer; A selects, grabs and drops; Y held opens the radial menu (hold
 * Space for the mouse version). Bindings and their words live in actions.ts; the pure parts in pad.ts and radial.ts.
 */
import { hyp2 } from '../core/mathx';
import { detectPadStyle } from '../input/gamepadMapping';
import type { PadStyle } from '../input/gamepadMapping';
import type { Device } from './actions';
import { fmt, normRect, snap, wallLen, wallPoint } from './geometry';
import type { Editor } from './main';
import { label } from './ops';
import { PAD, PadState } from './pad';
import { menuTree, RadialView } from './padMenu';
import { Radial } from './radial';
import { presetPicks } from './visibility';
import type { RadialNode } from './radial';
import type { Coll, Elem, Key, Ladder, Pt, Rect, Room, Stair, Wall } from './types';
import { keyOf, parseKey } from './types';

type Focus = '3d' | 'plan' | 'drawer';
const PREFS = 'kestrel-editor-pad';
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class PadControl {
  device: Device = 'keys';
  style: PadStyle = 'xbox';
  focus: Focus = '3d';
  readonly st = new PadState();
  radial: Radial | null = null;
  private readonly ringView: RadialView;
  /** The radial was opened with Space (mouse) rather than Y. */
  private mouseMenu = false;
  private mouse = { x: 0, y: 0, click: false, back: false, spaceDown: false };
  /** Grid steps added by D-pad nudges while grabbing. */
  private offset: Pt = [0, 0];
  private lastTool: { tool: string; door?: string } | null = null;
  private measureFrom: Pt | null = null;
  clipboard: { coll: Coll; e: Elem } | null = null;
  rumbleOn = true;
  private snapKey = '';
  private drawerIndex = 0;
  private helpIndex = 0;
  private padHelp = false;
  /** Plan crosshair, pixels inside the plan pane. */
  private cross = { x: -1, y: -1, heldAt: 0 };
  private nearIndex = -1;

  constructor(private readonly ed: Editor) {
    this.ringView = new RadialView($('radial'));
    try {
      const p = JSON.parse(localStorage.getItem(PREFS) ?? 'null') as { rumble?: boolean } | null;
      if (typeof p?.rumble === 'boolean') this.rumbleOn = p.rumble;
    } catch {
      // view preference only
    }
    // keyboard and mouse take the hint bar back; the mouse radial is hold Space
    const keysUsed = (): void => this.setDevice('keys');
    window.addEventListener('keydown', (e) => {
      keysUsed();
      if (e.code === 'Space' && !e.repeat && !isTyping()) {
        e.preventDefault();
        this.mouse.spaceDown = true;
        if (!this.menuOpen && !this.ed.drag) this.openMenu(true);
      } else if (e.code === 'Escape' && this.radial) this.mouse.back = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.mouse.spaceDown = false;
    });
    window.addEventListener('pointerdown', (e) => {
      keysUsed();
      if (this.radial && this.mouseMenu && e.button === 0) {
        e.stopPropagation();
        this.mouse.click = true;
      }
    }, true);
    window.addEventListener('pointermove', (e) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 8) keysUsed();
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    this.ed.view.scene.onBeforeRenderObservable.add(() => this.frame());
  }

  get menuOpen(): boolean {
    return !!this.radial?.isOpen;
  }

  setDevice(d: Device): void {
    if (this.device === d) return;
    this.device = d;
    document.body.dataset.device = d;
    this.ed.renderHelp();
    this.ed.updateHint();
    this.showPointers();
  }

  savePrefs(): void {
    try {
      localStorage.setItem(PREFS, JSON.stringify({ rumble: this.rumbleOn }));
    } catch {
      // view preference only
    }
  }

  rumble(kind: 'snap' | 'drop' | 'error'): void {
    if (!this.rumbleOn) return;
    const gp = this.gamepad();
    const act = (gp as (Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }) | null)?.vibrationActuator;
    const p = kind === 'snap' ? { duration: 40, weakMagnitude: 0.4, strongMagnitude: 0 } : kind === 'drop' ? { duration: 70, weakMagnitude: 0.3, strongMagnitude: 0.3 } : { duration: 160, weakMagnitude: 0.2, strongMagnitude: 0.7 };
    try {
      void act?.playEffect?.('dual-rumble', { startDelay: 0, ...p })?.catch(() => undefined);
    } catch {
      // no rumble on this pad
    }
  }

  private gamepad(): Gamepad | null {
    try {
      return Array.from(navigator.getGamepads?.() ?? []).find((g): g is Gamepad => !!g?.connected) ?? null;
    } catch {
      return null;
    }
  }

  // ---------- the radial menu ----------
  openMenu(mouse: boolean): void {
    const tree = menuTree(this.ed.model.data, { selected: !!this.ed.selectedElem(), clipboard: !!this.clipboard });
    const last = this.radial?.last;
    this.radial = new Radial(tree);
    if (last) for (const [k, v] of last) this.radial.last.set(k, v);
    this.radial.open();
    this.mouseMenu = mouse;
    this.mouse.click = this.mouse.back = false;
    this.ed.updateHint();
  }

  private menuFrame(now: number): void {
    const r = this.radial!;
    let inp;
    if (this.mouseMenu) {
      const b = $('stage').getBoundingClientRect();
      const R = Math.min(b.width, b.height) * 0.3;
      inp = { x: (this.mouse.x - (b.left + b.width / 2)) / R, y: (this.mouse.y - (b.top + b.height / 2)) / R, now, held: this.mouse.spaceDown, a: this.mouse.click, b: this.mouse.back };
      this.mouse.click = this.mouse.back = false;
    } else {
      const st = this.st;
      const l = st.rawL;
      const rr = st.rawR;
      const s = l.x * l.x + l.y * l.y >= rr.x * rr.x + rr.y * rr.y ? l : rr;
      inp = { x: s.x, y: s.y, now, held: st.down(PAD.Y), a: st.pressed(PAD.A), b: st.pressed(PAD.B) };
    }
    const res = r.update(inp);
    if (res?.kind === 'pick') this.runMenu(res.node, res.path);
    if (!r.isOpen) this.ed.updateHint();
    this.ringView.render(r);
  }

  /** Runs a radial pick. */
  runMenu(node: RadialNode, path: string[]): void {
    const ed = this.ed;
    const id = node.id;
    const vis = ed.view.vis;
    const tool = (t: string, door?: string): void => {
      if (door) $<HTMLSelectElement>('doorType').value = door;
      this.lastTool = { tool: t, door };
      ed.setTool(t as Parameters<Editor['setTool']>[0]);
    };
    if (id === 'select') tool('select');
    else if (id === 'build.room') tool('room');
    else if (id === 'build.wall') tool('wall');
    else if (id === 'build.window') tool('window');
    else if (id.startsWith('door.')) tool('door', id.slice(5));
    else if (id === 'edit.props') this.enterDrawer();
    else if (id === 'lv.panel') this.enterDrawer('pad');
    else if (id === 'file.checks') this.enterDrawer('checks');
    else if (id === 'file.changes') this.enterDrawer('log');
    else if (id === 'edit.dup') ed.duplicate();
    else if (id === 'edit.del') ed.deleteSelected();
    else if (id === 'edit.rotate') this.rotate();
    else if (id === 'edit.copy') this.copy();
    else if (id === 'edit.paste') this.paste(false);
    else if (id === 'edit.pasteUp') this.paste(true);
    else if (id === 'edit.measure') this.startMeasure();
    else if (id === 'undo') ed.undo();
    else if (id === 'walk') ed.toggleWalk();
    else if (id.startsWith('view.') && ['3d', 'both', 'plan'].includes(id.slice(5))) ed.setLayout(id.slice(5) as '3d' | 'both' | 'plan');
    else if (id === 'lv.whole' || id === 'lv.single' || id === 'lv.upTo') ed.setPreset(id.slice(3) as 'whole' | 'single' | 'upTo');
    else if (id === 'lv.ghost') ed.run('ghost');
    else if (id === 'lv.exploded') ed.run('exploded');
    else if (id === 'lv.section') {
      vis.section = vis.section > 0 ? 0 : 1.2;
      ed.applyVis(true);
    } else if (id === 'lv.underlay') {
      vis.underlay = !vis.underlay;
      ed.applyVis();
    } else if (id.startsWith('b.')) {
      vis.building = id.slice(2);
      ed.applyVis();
    } else if (id === 'view.labels') $('planSvg').classList.toggle('nolabels');
    else if (id === 'view.minimap') ed.run('minimap');
    else if (id.startsWith('level.')) ed.setLevel(id.slice(6));
    else if (id === 'file.save') void ed.save();
    else if (id === 'file.revert') void ed.revert();
    else if (id === 'file.help') ed.run('help');
    if (!id.startsWith('edit.') && !id.startsWith('door.') && !id.startsWith('build.') && id !== 'select') ed.status(path.join(' > '));
  }

  // ---------- every frame ----------
  private frame(): void {
    const now = performance.now() / 1000;
    const gp = this.gamepad();
    const c = this.ed.controls;
    c.padMove = { x: 0, y: 0 };
    c.padLook = { x: 0, y: 0 };
    c.padRise = 0;
    if (gp) {
      this.st.update({ buttons: gp.buttons.map((b) => b.value), axes: gp.axes }, now);
      if (this.st.active) {
        const s = detectPadStyle(gp.id);
        if (s !== this.style) {
          this.style = s;
          this.ed.renderHelp();
        }
        this.setDevice('pad');
      }
    }
    this.drawStrip();
    if (this.radial?.isOpen) return this.menuFrame(now);
    if (!gp) return this.followDrag();
    const st = this.st;
    if ($('ask').classList.contains('hidden') === false) {
      const bs = $('ask').querySelectorAll<HTMLButtonElement>('button');
      if (st.pressed(PAD.A)) bs[0]?.click();
      else if (st.pressed(PAD.B)) bs[1]?.click();
      return;
    }
    if (this.padHelp) return this.helpFrame();
    if (st.pressed(PAD.START)) return this.openHelp();
    if (st.yTap === 'hold' && !this.ed.drag) return this.openMenu(false);
    if (st.yTap === 'tap' && this.lastTool && !this.ed.drag) this.runMenu({ id: this.lastTool.door ? `door.${this.lastTool.door}` : this.lastTool.tool === 'select' ? 'select' : `build.${this.lastTool.tool}`, name: '' }, []);
    if (st.viewTap === 'tap') this.ed.run('layout');
    else if (st.viewTap === 'hold') this.cycleFocus();
    this.checkFocus();
    if (this.focus === 'drawer') return this.drawerFrame();
    if (this.focus === '3d') {
      c.padMove = { x: st.ls.x, y: -st.ls.y };
      c.padLook = { x: st.rs.x, y: -st.rs.y };
      c.padRise = st.rt - st.lt;
    } else this.planFrame(now);
    if (st.pressed(PAD.LS)) {
      c.padFast = !c.padFast;
      this.ed.status(c.padFast ? 'Fast movement on (L3)' : 'Fast movement off');
    }
    if (st.pressed(PAD.RS)) this.lookAtSelection();
    if (!this.ed.drag) {
      if (st.xTap === 'tap') this.ed.undo();
      else if (st.xTap === 'hold') this.ed.redo();
      if (st.pressed(PAD.RB)) this.ed.frameSelected();
    }
    if (st.pressed(PAD.B)) this.cancel();
    else if (st.pressed(PAD.A)) this.primary();
    this.dpad();
    this.followDrag();
  }

  /** The pad's point on the editing level: the centre dot in 3D, the crosshair on the plan; snapped to the grid. */
  point(planeY?: number): Pt | null {
    const fine = this.st.down(PAD.LB);
    const g = fine ? this.ed.fineGrid : this.ed.grid;
    let p: Pt | null;
    if (this.focus === 'plan') p = this.planPoint();
    else {
      const cv = $<HTMLCanvasElement>('c');
      p = this.ed.view.planePoint(cv.clientWidth / 2, cv.clientHeight / 2, planeY ?? this.ed.viewFloor());
    }
    return p ? [snap(p[0], g), snap(p[1], g)] : null;
  }

  private planPoint(): Pt | null {
    const b = $('planWrap').getBoundingClientRect();
    const sp = this.ed.svgPointAt(b.left + this.cross.x, b.top + this.cross.y);
    return sp ? this.ed.fromPlan(sp[0], sp[1]) : null;
  }

  /** What A would pick: a handle of the selection, else an element on the editing level. */
  private target(): { handle?: string; key?: Key; x: number; y: number; z: number } | null {
    if (this.focus === 'plan') {
      const b = $('planWrap').getBoundingClientRect();
      const el = document.elementFromPoint(b.left + this.cross.x, b.top + this.cross.y);
      const p = this.planPoint();
      if (!p) return null;
      const handle = el?.closest('[data-handle]')?.getAttribute('data-handle') ?? undefined;
      const key = (el?.closest('[data-id]')?.getAttribute('data-id') ?? undefined) as Key | undefined;
      return { handle, key: key && parseKey(key) ? key : undefined, x: p[0], y: this.ed.floor(), z: p[1] };
    }
    const cv = $<HTMLCanvasElement>('c');
    const h = this.ed.view.pick(cv.clientWidth / 2, cv.clientHeight / 2);
    if (h.handle) return { handle: h.handle, x: 0, y: 0, z: 0 };
    return h.hit ? { key: h.hit.key, x: h.hit.x, y: h.hit.y, z: h.hit.z } : null;
  }

  private primary(): void {
    const ed = this.ed;
    if (this.measureFrom) return this.finishMeasure();
    if (ed.drag) {
      ed.endDrag(false);
      this.offset = [0, 0];
      this.rumble('drop');
      return;
    }
    const p = this.point();
    if (ed.tool !== 'select') {
      if (!p) return;
      const before = ed.model.dirty;
      ed.toolDown(p[0], p[1], 0, 0, 'pad', this.st.down(PAD.LB));
      // (toolDown may have started a drag; the narrowing above does not know)
      const nd = ed.drag as { moved: boolean } | null;
      if (nd) nd.moved = true;
      else if (ed.model.dirty === before) this.rumble('error');
      this.offset = [0, 0];
      return;
    }
    const t = this.target();
    const s = ed.selectedElem();
    if (t?.handle && s) {
      const h = ed.handlesFor().find((q) => q.id === t.handle);
      if (h) this.grab(s.coll, s.id, t.handle, [h.x, h.z], this.focus === 'plan' ? ed.floor() : h.y);
      return;
    }
    if (!t?.key) return;
    if (t.key !== ed.selected) return ed.select(t.key);
    const k = parseKey(t.key)!;
    this.grab(k.coll, k.id, null, [t.x, t.z], t.y);
  }

  private grab(coll: Coll, id: string, handle: string | null, start: Pt, planeY: number): void {
    this.ed.beginDrag(coll, id, handle, start, planeY, 0, 0, 'pad');
    if (this.ed.drag) this.ed.drag.moved = true;
    this.offset = [0, 0];
    this.snapKey = '';
    this.ed.status('Grabbed: move the dot, A drops it, B puts it back, D-pad nudges');
  }

  /** While grabbing or drawing with the pad: the item follows the dot, plus D-pad nudges. */
  private followDrag(): void {
    const d = this.ed.drag;
    if (!d || d.source !== 'pad') return this.updatePointers();
    const p = this.point(this.focus === 'plan' ? undefined : d.planeY);
    if (!p) return;
    this.ed.moveDrag(p[0] + this.offset[0], p[1] + this.offset[1], this.st.down(PAD.LB));
    if (d.coll === 'walls') {
      const w = this.ed.model.get<Wall>('walls', d.id);
      const end = w && (d.isNew || d.handle === 'b' ? w.b : d.handle === 'a' ? w.a : null);
      const hit = end && (this.ed.model.list('walls') as Wall[]).find((o) => o.id !== d.id && o.level === w.level && [o.a, o.b].some((q) => Math.abs(q[0] - end[0]) < 1e-6 && Math.abs(q[1] - end[1]) < 1e-6));
      const k = hit ? `${end[0]},${end[1]}` : '';
      if (k && k !== this.snapKey) this.rumble('snap');
      this.snapKey = k;
    }
    this.updatePointers();
  }

  private cancel(): void {
    const ed = this.ed;
    if (this.measureFrom) {
      this.measureFrom = null;
      return ed.status('Measure cancelled');
    }
    if (ed.drag) ed.endDrag(true);
    else if (ed.tool !== 'select') ed.setTool('select');
    else ed.select(null);
    this.offset = [0, 0];
  }

  private dpad(): void {
    const st = this.st;
    const ed = this.ed;
    const dirs: [number, Pt][] = [[PAD.UP, [0, 1]], [PAD.DOWN, [0, -1]], [PAD.RIGHT, [1, 0]], [PAD.LEFT, [-1, 0]]];
    if (ed.drag?.source === 'pad') {
      const g = st.down(PAD.LB) ? ed.fineGrid : ed.grid;
      // up is the axis the camera faces most (on the plan: north)
      const yaw = this.focus === 'plan' ? 0 : ed.controls.yaw;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const fwd: Pt = Math.abs(fx) > Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
      const right: Pt = [fwd[1], -fwd[0]];
      for (const [b, [sx, sy]] of dirs) {
        if (!st.repeat(b)) continue;
        this.offset = [+(this.offset[0] + (fwd[0] * sy + right[0] * sx) * g).toFixed(3), +(this.offset[1] + (fwd[1] * sy + right[1] * sx) * g).toFixed(3)];
      }
      return;
    }
    if (st.repeat(PAD.UP)) ed.stepLevel(1);
    if (st.repeat(PAD.DOWN)) ed.stepLevel(-1);
    if (st.repeat(PAD.RIGHT)) this.near(1);
    if (st.repeat(PAD.LEFT)) this.near(-1);
  }

  /** Previous / next element near the dot on the editing level, nearest first. */
  private near(dir: 1 | -1): void {
    const ed = this.ed;
    const p = this.point() ?? [0, 0];
    const all: { key: Key; d: number }[] = [];
    for (const coll of ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids'] as Coll[])
      for (const e of ed.model.list(coll)) {
        if (ed.levelOf(coll, e) !== ed.view.level) continue;
        const c = ed.centreOf(coll, e);
        const d = hyp2(c[0] - p[0], c[1] - p[1]);
        if (d <= 12) all.push({ key: keyOf(coll, e.id), d });
      }
    if (!all.length) return ed.status('Nothing within 12 m of the dot');
    all.sort((a, b) => a.d - b.d);
    const cur = all.findIndex((a) => a.key === ed.selected);
    this.nearIndex = cur < 0 ? (dir > 0 ? 0 : all.length - 1) : (cur + dir + all.length) % all.length;
    ed.select(all[this.nearIndex]!.key);
    const s = ed.selectedElem();
    if (s) ed.status(`${this.nearIndex + 1} of ${all.length} near the dot: ${label(ed.model.data, s.coll, s.e)}`);
  }

  private lookAtSelection(): void {
    const s = this.ed.selectedElem();
    if (!s) return;
    const c = this.ed.centreOf(s.coll, s.e);
    this.ed.controls.lookAt(c[0], this.ed.viewFloor(this.ed.levelOf(s.coll, s.e)) + 1, c[1]);
  }

  // ---------- pad focus: 3D, plan, side panel ----------
  private panes(): Focus[] {
    const l = this.ed.prefs.layout;
    const out: Focus[] = [];
    if (l !== 'plan') out.push('3d');
    if (l !== '3d') out.push('plan');
    if (this.ed.prefs.drawer) out.push('drawer');
    return out;
  }

  private cycleFocus(): void {
    const ps = this.panes();
    this.setFocus(ps[(ps.indexOf(this.focus) + 1) % ps.length] ?? '3d');
  }

  private checkFocus(): void {
    const ps = this.panes();
    if (!ps.includes(this.focus)) this.setFocus(ps[0] ?? '3d');
  }

  setFocus(f: Focus): void {
    if (this.ed.drag?.source === 'pad') this.ed.endDrag(true);
    this.focus = f;
    if (f === 'plan' && this.cross.x < 0) {
      const b = $('planWrap').getBoundingClientRect();
      this.cross.x = b.width / 2;
      this.cross.y = b.height / 2;
    }
    if (f === 'drawer') this.drawerIndex = 0;
    this.ed.status(f === '3d' ? 'Pad: 3D view' : f === 'plan' ? 'Pad: plan (left stick moves the crosshair, right stick pans, LT / RT zoom)' : 'Pad: side panel (D-pad up / down picks a field, left / right changes it, B leaves)');
    this.showPointers();
  }

  enterDrawer(tab: 'props' | 'checks' | 'log' | 'pad' = 'props'): void {
    this.ed.openDrawer();
    this.ed.tab = tab;
    this.ed.renderPanel();
    this.setFocus('drawer');
  }

  private planFrame(now: number): void {
    const st = this.st;
    const b = $('planWrap').getBoundingClientRect();
    const moving = st.ls.x !== 0 || st.ls.y !== 0;
    if (!moving) this.cross.heldAt = now;
    // accelerates the longer the stick is held: 250 px/s, up to 3x after 2 s
    const v = 250 * (1 + Math.min(2, now - this.cross.heldAt)) * (1 / 60);
    this.cross.x = Math.max(0, Math.min(b.width, this.cross.x + st.ls.x * v));
    this.cross.y = Math.max(0, Math.min(b.height, this.cross.y + st.ls.y * v));
    const zoom = st.rt - st.lt;
    if (st.rs.x || st.rs.y || zoom) this.ed.panZoomPlan(st.rs.x * 12, st.rs.y * 12, zoom ? 1 - zoom * 0.04 : 1, b.left + this.cross.x, b.top + this.cross.y);
  }

  private drawerFrame(): void {
    const st = this.st;
    const fields = [...$('panel').querySelectorAll<HTMLElement>('[data-k], button, [data-go]')];
    if (st.pressed(PAD.B)) return this.setFocus(this.panes()[0] ?? '3d');
    if (!fields.length) return;
    if (st.repeat(PAD.DOWN)) this.drawerIndex = (this.drawerIndex + 1) % fields.length;
    if (st.repeat(PAD.UP)) this.drawerIndex = (this.drawerIndex - 1 + fields.length) % fields.length;
    this.drawerIndex = Math.min(this.drawerIndex, fields.length - 1);
    const f = fields[this.drawerIndex]!;
    for (const x of $('panel').querySelectorAll('.padfocus')) if (x !== f) x.classList.remove('padfocus');
    if (!f.classList.contains('padfocus')) {
      f.classList.add('padfocus');
      f.scrollIntoView({ block: 'nearest' });
    }
    const step = st.repeat(PAD.RIGHT) ? 1 : st.repeat(PAD.LEFT) ? -1 : 0;
    if (step && f instanceof HTMLInputElement && f.type === 'number') {
      const g = st.down(PAD.LB) ? this.ed.fineGrid : this.ed.grid;
      f.value = String(+(Number(f.value) + step * g).toFixed(3));
      f.dispatchEvent(new Event('change'));
    } else if (step && f instanceof HTMLInputElement && f.type === 'range') {
      f.value = String(+(Number(f.value) + step * Number(f.step || 1) * (st.down(PAD.LB) ? 1 : 2)).toFixed(3));
      f.dispatchEvent(new Event('input'));
    } else if (step && f instanceof HTMLSelectElement) {
      f.selectedIndex = (f.selectedIndex + step + f.options.length) % f.options.length;
      f.dispatchEvent(new Event('change'));
    }
    if (st.pressed(PAD.A)) {
      if (f instanceof HTMLButtonElement || (f instanceof HTMLInputElement && f.type === 'checkbox')) f.click();
      else if (f.dataset.go) this.goToProblem(f.dataset.go);
      else if (f instanceof HTMLInputElement && f.type !== 'number') f.focus();
    }
  }

  // ---------- help with Save, Revert, Walk, rumble ----------
  private openHelp(): void {
    this.padHelp = true;
    this.helpIndex = 0;
    if ($('help').classList.contains('hidden')) this.ed.run('help');
    this.drawHelpButtons();
  }

  private drawHelpButtons(): void {
    const items = ['Save', 'Revert to last save', 'Walk', `Rumble: ${this.rumbleOn ? 'on' : 'off'}`, 'Close'];
    let row = $('help').querySelector('.padrow');
    if (!row) {
      row = document.createElement('div');
      row.className = 'padrow';
      $('help').prepend(row);
    }
    row.innerHTML = items.map((t, i) => `<button class="${i === this.helpIndex ? 'padfocus' : ''}">${t}</button>`).join('') + '<div class="dim">D-pad picks, A does it, B closes</div>';
  }

  private helpFrame(): void {
    const st = this.st;
    if (st.pressed(PAD.B) || st.pressed(PAD.START)) {
      this.padHelp = false;
      $('help').querySelector('.padrow')?.remove();
      if (!$('help').classList.contains('hidden')) this.ed.run('help');
      return;
    }
    if (st.repeat(PAD.RIGHT) || st.repeat(PAD.DOWN)) this.helpIndex = (this.helpIndex + 1) % 5;
    if (st.repeat(PAD.LEFT) || st.repeat(PAD.UP)) this.helpIndex = (this.helpIndex + 4) % 5;
    if (st.pressed(PAD.A)) {
      const i = this.helpIndex;
      if (i === 3) {
        this.rumbleOn = !this.rumbleOn;
        this.savePrefs();
        this.rumble('drop');
      } else {
        this.padHelp = false;
        $('help').querySelector('.padrow')?.remove();
        if (!$('help').classList.contains('hidden')) this.ed.run('help');
        if (i === 0) void this.ed.save();
        else if (i === 1) void this.ed.revert();
        else if (i === 2) this.ed.toggleWalk();
        return;
      }
    }
    this.drawHelpButtons();
  }

  // ---------- the dot, the crosshair and the focus border ----------
  showPointers(): void {
    const pad = this.device === 'pad';
    $('reticle').classList.toggle('hidden', !pad || this.focus !== '3d');
    $('cross').classList.toggle('hidden', !pad || this.focus !== 'plan');
    $('view3d').classList.toggle('padfocus', pad && this.focus === '3d');
    $('planWrap').classList.toggle('padfocus', pad && this.focus === 'plan');
    $('drawer').classList.toggle('padfocus', pad && this.focus === 'drawer');
    if (!(pad && this.focus === 'drawer')) for (const x of $('panel').querySelectorAll('.padfocus')) x.classList.remove('padfocus');
  }

  private labelAt = 0;
  private updatePointers(): void {
    if (this.device !== 'pad') return;
    const now = performance.now();
    if (now - this.labelAt < 80) return;
    this.labelAt = now;
    if (this.focus === 'plan') {
      const c = $('cross');
      c.style.left = `${this.cross.x}px`;
      c.style.top = `${this.cross.y}px`;
    }
    if (this.focus === 'drawer') return;
    const d = this.ed.drag;
    const p = this.point(d?.source === 'pad' && this.focus === '3d' ? d.planeY : undefined);
    const t = d ? null : this.target();
    const k = t?.key ? parseKey(t.key) : null;
    const e = k ? this.ed.model.get(k.coll, k.id) : undefined;
    let text = p ? `x ${fmt(p[0])}  z ${fmt(p[1])}` : '';
    if (this.measureFrom && p) text += `   measuring ${fmt(hyp2(p[0] - this.measureFrom[0], p[1] - this.measureFrom[1]))} m`;
    else if (d?.source === 'pad') text += `   ${this.ed.dragWords()}`;
    else if (t?.handle) text += '   handle: A grabs it';
    else if (k && e) text += `   ${label(this.ed.model.data, k.coll, e)}${t!.key === this.ed.selected ? ' - A grabs it' : ''}`;
    $(this.focus === 'plan' ? 'crossText' : 'reticleText').textContent = text;
    this.ed.setHover(t?.key ?? null);
  }

  // ---------- edit: rotate, copy, paste, measure ----------
  private rotate(): void {
    const s = this.ed.selectedElem();
    if (!s) return;
    const after = clone(s.e) as Elem;
    const turn: Record<string, string> = { N: 'E', E: 'S', S: 'W', W: 'N' };
    if ('rect' in after) {
      const r = (after as Room).rect;
      const cx = (r[0] + r[2]) / 2;
      const cz = (r[1] + r[3]) / 2;
      const hw = (r[3] - r[1]) / 2;
      const hd = (r[2] - r[0]) / 2;
      const g = this.ed.grid;
      (after as Room).rect = normRect([snap(cx - hw, g), snap(cz - hd, g), snap(cx + hw, g), snap(cz + hd, g)] as Rect);
      if (s.coll === 'stairs') (after as Stair).up = turn[(after as Stair).up] as Stair['up'];
    } else if (s.coll === 'walls') {
      const w = after as Wall;
      const m = wallPoint(w, wallLen(w) / 2);
      const rot = (p: Pt): Pt => [+(m[0] + (p[1] - m[1])).toFixed(3), +(m[1] - (p[0] - m[0])).toFixed(3)];
      w.a = rot(w.a);
      w.b = rot(w.b);
    } else if (s.coll === 'ladders') (after as Ladder).facing = turn[(after as Ladder).facing ?? 'N'];
    else return this.ed.status('Doors and windows turn with their wall');
    this.ed.commit([{ coll: s.coll, id: s.id, before: s.e, after }]);
  }

  private copy(): void {
    const s = this.ed.selectedElem();
    if (!s || !['rooms', 'walls', 'voids'].includes(s.coll)) return this.ed.status('Copy takes rooms, walls and floor holes');
    this.clipboard = { coll: s.coll, e: clone(s.e) };
    this.ed.status(`Copied ${label(this.ed.model.data, s.coll, s.e)}`);
  }

  private paste(up: boolean): void {
    const cb = this.clipboard;
    if (!cb) return;
    const ed = this.ed;
    const e = clone(cb.e) as Elem & { level: string };
    const levels = ed.model.data.levels.slice().sort((a, b) => a.floor - b.floor);
    let dx = 0;
    let dz = 0;
    if (up) {
      const i = levels.findIndex((l) => l.id === e.level);
      const above = levels[i + 1];
      if (!above) return ed.status('No level above');
      e.level = above.id;
    } else {
      const p = this.point();
      if (!p) return;
      const c = ed.centreOf(cb.coll, cb.e);
      dx = snap(p[0] - c[0], ed.grid);
      dz = snap(p[1] - c[1], ed.grid);
      e.level = ed.view.level;
    }
    e.id = ed.model.freshId(cb.coll, cb.coll === 'rooms' ? `${e.level}-NEW` : cb.coll === 'walls' ? `W${e.level}-NEW` : `${cb.e.id}-COPY`);
    if ('rect' in e) (e as Room).rect = (e as Room).rect.map((v, i) => +(v + (i % 2 ? dz : dx)).toFixed(3)) as Rect;
    if (cb.coll === 'walls') {
      const w = e as unknown as Wall;
      w.a = [+(w.a[0] + dx).toFixed(3), +(w.a[1] + dz).toFixed(3)];
      w.b = [+(w.b[0] + dx).toFixed(3), +(w.b[1] + dz).toFixed(3)];
    }
    ed.commit([{ coll: cb.coll, id: e.id, before: null, after: e }]);
    if (up) ed.setLevel(e.level);
    ed.select(keyOf(cb.coll, e.id));
  }

  private startMeasure(): void {
    this.ed.setTool('select');
    this.measureFrom = [NaN, NaN];
    this.ed.status('Measure: A at the first point');
  }

  private finishMeasure(): void {
    const p = this.point();
    if (!p || !this.measureFrom) return;
    if (Number.isNaN(this.measureFrom[0])) {
      this.measureFrom = p;
      return this.ed.status('Measure: A at the second point (B cancels)');
    }
    const [x0, z0] = this.measureFrom;
    this.measureFrom = null;
    this.ed.status(`Measured ${fmt(hyp2(p[0] - x0, p[1] - z0))} m (east ${fmt(p[0] - x0)}, north ${fmt(p[1] - z0)})`);
  }

  // ---------- pad screen (Part C2): status strip and the Levels panel ----------
  private stripAt = 0;
  private drawStrip(): void {
    if (this.device !== 'pad') return;
    const now = performance.now();
    if (now - this.stripAt < 250) return;
    this.stripAt = now;
    const ed = this.ed;
    const v = ed.view.vis;
    const lv = ed.model.data.levels.find((l) => l.id === ed.view.level);
    const preset = { whole: 'Whole building', single: 'Single level', upTo: 'Up to this level', pick: 'Picked levels' }[v.preset];
    const extras = [v.ghost ? 'ghosted' : '', v.exploded ? `exploded ${fmt(v.gap)} m` : '', v.section > 0 ? `walls cut at ${fmt(v.section)} m` : ''].filter(Boolean).join(', ');
    const view = { '3d': '3D', both: 'Both', plan: 'Plan' }[ed.prefs.layout];
    const fresh = ed.lastChecks ? ed.newProblems(ed.lastChecks).length : 0;
    const bld = v.building === 'all' ? 'All' : v.building === 'site' ? 'Site' : `Building ${esc(v.building)}`;
    $('padStrip').innerHTML = [
      `Editing <b>${lv ? `${esc(lv.name)} (${fmt(lv.floor)} m)` : ''}</b>`,
      `View <b>${view}</b> &nbsp; Levels <b>${preset}${extras ? `, ${extras}` : ''}</b>`,
      `Building <b>${bld}</b> &nbsp; Tool <b>${this.measureFrom ? 'measure' : ed.tool}</b>`,
      `Unsaved <b>${ed.model.dirty}</b> &nbsp; New problems <b>${fresh}</b>`,
    ].join('<br>');
  }

  /** The Levels panel in the side panel: everything on the Levels toolbar row, reachable with the D-pad. */
  renderPanel(panel: HTMLElement): void {
    const ed = this.ed;
    const v = ed.view.vis;
    const levels = ed.model.data.levels.slice().sort((a, b) => b.floor - a.floor);
    const ticks = presetPicks(v.preset, ed.model.data.levels, ed.view.level, v.picked);
    const btn = (id: string, text: string, on = false): string => `<button data-pv="${id}" class="${on ? 'on' : ''}">${text}</button>`;
    const bs = [{ id: 'all', n: 'All' }, ...(ed.model.data.meta.buildings ?? []).map((b) => ({ id: b.id, n: `Building ${b.id}` })), { id: 'site', n: 'Site' }];
    panel.innerHTML =
      '<p class="dim">D-pad up / down picks, A ticks or presses, left / right moves a slider (LB: fine), B leaves.</p>' +
      `<div class="row">${btn('whole', 'Whole building', v.preset === 'whole')}${btn('single', 'Single level', v.preset === 'single')}${btn('upTo', 'Up to this level', v.preset === 'upTo')}</div>` +
      levels.map((l) => `<label class="row"><input type="checkbox" data-k="pick" data-level="${esc(l.id)}" ${ticks.includes(l.id) ? 'checked' : ''}> ${esc(l.name)} (${fmt(l.floor)} m)</label>`).join('') +
      `<div class="row">${btn('ghost', 'Ghost the rest', v.ghost)}${btn('exploded', 'Exploded', v.exploded)}${btn('underlay', 'Plan: level below', v.underlay)}</div>` +
      `<label class="row"><span>Exploded gap</span><input type="range" data-k="gap" min="0" max="12" step="0.5" value="${v.gap}"><b>${fmt(v.gap)} m</b></label>` +
      `<label class="row"><span>Cut walls at</span><input type="range" data-k="cut" min="0" max="4" step="0.1" value="${v.section}"><b>${v.section > 0 ? `${fmt(v.section)} m` : 'off'}</b></label>` +
      `<div class="row">${bs.map((b) => btn(`b.${b.id}`, esc(b.n), v.building === b.id)).join('')}</div>`;
    for (const c of panel.querySelectorAll<HTMLInputElement>('input[data-level]'))
      c.addEventListener('change', () => {
        v.picked = [...panel.querySelectorAll<HTMLInputElement>('input[data-level]')].filter((x) => x.checked).map((x) => x.dataset.level!);
        v.preset = 'pick';
        this.applyPanel();
      });
    for (const r of panel.querySelectorAll<HTMLInputElement>('input[type=range]'))
      r.addEventListener('input', () => {
        const n = Number(r.value);
        if (r.dataset.k === 'gap') {
          v.gap = n;
          v.exploded = true;
        } else v.section = n;
        this.applyPanel(r.dataset.k === 'cut');
      });
    for (const b of panel.querySelectorAll<HTMLButtonElement>('button[data-pv]'))
      b.addEventListener('click', () => {
        const id = b.dataset.pv!;
        if (id === 'whole' || id === 'single' || id === 'upTo') ed.setPreset(id);
        else if (id === 'ghost' || id === 'exploded' || id === 'underlay') v[id] = !v[id];
        else if (id.startsWith('b.')) v.building = id.slice(2);
        this.applyPanel();
      });
  }

  private applyPanel(rebuild = false): void {
    this.ed.applyVis(rebuild);
    this.ed.renderPanel();
    this.stripAt = 0;
  }

  /** Checks panel: A on a problem line takes the camera to the first element it names. */
  private goToProblem(text: string): void {
    const ed = this.ed;
    for (const coll of ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids'] as Coll[])
      for (const e of ed.model.list(coll)) {
        const idRe = new RegExp(`(^|[^A-Za-z0-9-])${e.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z0-9-])`);
        if (!idRe.test(text)) continue;
        ed.setLevel(ed.levelOf(coll, e));
        ed.select(keyOf(coll, e.id));
        ed.frameSelected();
        return;
      }
    ed.status('That line names nothing to go to');
  }
}

export function isTyping(): boolean {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || (a.tagName === 'SELECT' && a.closest('#panel') !== null));
}
