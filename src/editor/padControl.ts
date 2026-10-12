/**
 * Controller editing for the level editor (ED2 Part C, ED3-1, ED3-2): polls the pad each frame and drives the editor.
 * The pad moves a builder camera (orbit.ts) whose target is the dot on the editing floor; the dot is magnetic (grab.ts).
 * A selects, takes the part of the selection the dot names (edge-aware grab) and drops; Y held opens the Build wheel,
 * RB held the Selection wheel (hold Space / hold R with the mouse); Menu opens the hub (hubView.ts). Bindings and their
 * words live in actions.ts; the pure parts in pad.ts, orbit.ts, radial.ts, grab.ts and hub.ts.
 */
import { hyp2 } from '../core/mathx';
import { detectPadStyle } from '../input/gamepadMapping';
import type { PadStyle } from '../input/gamepadMapping';
import type { Device } from './actions';
import { fmt, nearestWall, normRect, projectOnWall, snap, wallLen, wallPoint } from './geometry';
import { easeFactor, GHOST, grabPart, MAGNET, magnetSearch, turnPt } from './grab';
import type { GrabPart, GrabShape, SnapCand, SnapHit } from './grab';
import { DEFAULT_SETTINGS, LARGE_TEXT, readSettings } from './hub';
import type { PadSettings } from './hub';
import { focusField, HubView, stepField } from './hubView';
import type { Editor, PlanShape } from './main';
import { label, OPENING_DEFAULTS } from './ops';
import { ORBIT } from './orbit';
import { PAD, PadState } from './pad';
import { buildTree, DOOR_NAMES, RadialView, selectionTree } from './padMenu';
import { Radial } from './radial';
import type { RadialNode } from './radial';
import type { Mark } from './scene3d';
import { presetPicks } from './visibility';
import type { Coll, Elem, Key, Ladder, Opening, Pt, Rect, Room, Stair, Wall } from './types';
import { keyOf, parseKey } from './types';

type Focus = '3d' | 'drawer';
/** The tool bar's slots, left to right (Stair, Ladder, Floor hole and Object join when those tools exist). */
const BAR = [
  ['select', 'Select'],
  ['room', 'Room'],
  ['wall', 'Wall'],
  ['door', 'Door'],
  ['window', 'Window'],
  ['measure', 'Measure'],
] as const;
const DISPLAYS = [
  ['upTo', 'Up to this level'],
  ['single', 'Single level'],
  ['whole', 'Whole building'],
] as const;
const KIND: Record<Coll, string> = { rooms: 'Room', walls: 'Wall', openings: 'Opening', stairs: 'Stair', ladders: 'Ladder', voids: 'Floor hole' };
/** What RB turns while grabbing (openings and floor holes ignore it). */
const TURNS: readonly Coll[] = ['rooms', 'stairs', 'ladders', 'walls'];
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
  readonly hub: HubView;
  settings: PadSettings = { ...DEFAULT_SETTINGS };
  private readonly ringView: RadialView;
  /** The wheel was opened with Space or R (mouse) rather than Y or RB. */
  private mouseMenu = false;
  /** The pad button holding the open wheel: Y (Build) or RB (Selection). */
  private wheelBtn: number = PAD.Y;
  private mouse = { x: 0, y: 0, click: false, back: false, held: false, key: '' };
  /** Grid steps added by D-pad nudges while grabbing. */
  private offset: Pt = [0, 0];
  /** Quarter turns (RB taps) of the grabbed thing, about the dot. */
  private turns = 0;
  private lastTool: { tool: string; door?: string } | null = null;
  private measureFrom: Pt | null = null;
  clipboard: { coll: Coll; e: Elem } | null = null;
  /** The magnetic dot's current snap, and the snap candidates on the editing level (rebuilt after a change). */
  magnet: SnapHit | null = null;
  private cands: SnapCand[] = [];
  private candsKey = '';
  /** What A would do at the dot (grab preview and ghosts), for the hint bar. */
  grabWords = '';
  private marksKey = '';
  private drawerIndex = 0;
  private lastNow = 0;
  /** After a wheel or the hub closes, the sticks do nothing until they come back to the centre. */
  private stickLatch = false;

  constructor(private readonly ed: Editor) {
    this.ringView = new RadialView($('radial'));
    try {
      this.settings = readSettings(JSON.parse(localStorage.getItem(PREFS) ?? 'null'));
    } catch {
      // view preference only
    }
    this.applySettings();
    this.hub = new HubView(ed, this);
    // a change outside a drag moves the snap candidates (the dragged thing's own are skipped anyway)
    ed.model.onChange(() => {
      if (!this.ed.drag) this.candsKey = '';
    });
    // keyboard and mouse take the hint bar back; the mouse wheels are hold Space (Build) and hold R (Selection)
    const keysUsed = (): void => this.setDevice('keys');
    window.addEventListener('keydown', (e) => {
      keysUsed();
      const free = !e.repeat && !isTyping() && !this.hub.isOpen && !this.menuOpen && !this.ed.drag;
      if (e.code === 'Space' && !isTyping()) {
        e.preventDefault();
        if (free) this.openMenu(true, 'build', 'Space');
      } else if (e.code === 'KeyR' && free) {
        if (this.ed.selectedElem()) this.openMenu(true, 'sel', 'KeyR');
        else this.ed.status('Select something first');
      } else if (e.code === 'Escape' && this.radial?.isOpen) this.mouse.back = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === this.mouse.key) this.mouse.held = false;
    });
    window.addEventListener('pointerdown', (e) => {
      keysUsed();
      if (this.radial?.isOpen && this.mouseMenu && e.button === 0) {
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

  get rumbleOn(): boolean {
    return this.settings.rumble;
  }

  setDevice(d: Device): void {
    if (this.device === d) return;
    this.device = d;
    // mouse or keys: the fly camera takes over from the same pose; the plan marker and the pad's marks go
    if (d === 'keys') {
      this.ed.controls.leaveOrbit();
      document.getElementById('padMark')?.remove();
      this.magnet = null;
      this.setMarks([], [], '');
    }
    document.body.dataset.device = d;
    this.ed.renderHelp();
    this.ed.updateHint();
    this.showPointers();
  }

  savePrefs(): void {
    try {
      localStorage.setItem(PREFS, JSON.stringify(this.settings));
    } catch {
      // view preference only
    }
  }

  /** Text size on the pad screen, the hub and the wheels; stick speed and invert tilt are read each frame. */
  applySettings(): void {
    document.body.style.setProperty('--ts', String(this.settings.textSize === 'large' ? LARGE_TEXT : 1));
  }

  /** The sticks do nothing until they return to the centre (after a wheel or the hub). */
  latchSticks(): void {
    this.stickLatch = true;
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

  // ---------- the wheels ----------
  /** Opens the Build wheel (Y, hold Space) or the Selection wheel (RB, hold R). */
  openMenu(mouse: boolean, kind: 'build' | 'sel' = 'build', key = ''): void {
    const s = this.ed.selectedElem();
    if (kind === 'sel' && !s) return this.ed.status('Select something first');
    const cur = s ? String((s.e as unknown as Record<string, unknown>)[s.coll === 'openings' ? 'type' : 'kind'] ?? '') : '';
    const tree = kind === 'sel' && s ? selectionTree(s.coll, cur) : buildTree({ clipboard: !!this.clipboard });
    const last = this.radial?.last;
    this.radial = new Radial(tree);
    if (last) for (const [k, v] of last) this.radial.last.set(k, v);
    this.radial.open();
    this.mouseMenu = mouse;
    this.wheelBtn = kind === 'sel' ? PAD.RB : PAD.Y;
    this.mouse.click = this.mouse.back = false;
    this.mouse.held = mouse;
    this.mouse.key = key;
    this.ed.updateHint();
  }

  /** Closes an open wheel without a pick (the hub opening). */
  closeMenu(): void {
    if (!this.radial?.isOpen) return;
    this.radial.close();
    this.ringView.render(this.radial);
  }

  private menuFrame(now: number): void {
    const r = this.radial!;
    let inp;
    if (this.mouseMenu) {
      const b = $('stage').getBoundingClientRect();
      const R = Math.min(b.width, b.height) * 0.3;
      inp = { x: (this.mouse.x - (b.left + b.width / 2)) / R, y: (this.mouse.y - (b.top + b.height / 2)) / R, now, held: this.mouse.held, a: this.mouse.click, b: this.mouse.back };
      this.mouse.click = this.mouse.back = false;
    } else {
      const st = this.st;
      const l = st.rawL;
      const rr = st.rawR;
      const s = l.x * l.x + l.y * l.y >= rr.x * rr.x + rr.y * rr.y ? l : rr;
      inp = { x: s.x, y: s.y, now, held: st.down(this.wheelBtn), a: st.pressed(PAD.A), b: st.pressed(PAD.B) };
    }
    const res = r.update(inp);
    if (res?.kind === 'pick') this.runMenu(res.node, res.path);
    if (!r.isOpen) {
      this.stickLatch = true;
      this.ed.updateHint();
    }
    this.ringView.render(r);
  }

  /** Runs a pick from either wheel (and the tool bar and Y tap, which use the Build wheel's ids). */
  runMenu(node: RadialNode, path: string[]): void {
    const ed = this.ed;
    const id = node.id;
    const tool = (t: string, door?: string): void => {
      this.measureFrom = null;
      if (door) $<HTMLSelectElement>('doorType').value = door;
      this.lastTool = { tool: t, door };
      ed.setTool(t as Parameters<Editor['setTool']>[0]);
    };
    if (id === 'select') tool('select');
    else if (id === 'build.room') tool('room');
    else if (id === 'build.wall') tool('wall');
    else if (id === 'build.window') tool('window');
    else if (id.startsWith('door.')) tool('door', id.slice(5));
    else if (id === 'build.measure') this.startMeasure();
    else if (id === 'build.paste') this.paste(false);
    else if (id === 'build.pasteUp') this.paste(true);
    else if (id === 'sel.move') this.grabWhole();
    else if (id === 'sel.props') this.enterDrawer();
    else if (id === 'sel.dup') ed.duplicate();
    else if (id === 'sel.del') ed.deleteSelected();
    else if (id === 'sel.rotate') this.rotate();
    else if (id === 'sel.copy') this.copy();
    else if (id === 'sel.copyUp') this.copyUp();
    else if (id.startsWith('type.')) this.changeType(id.slice(5));
    if (path.length > 1 && id.startsWith('type.')) ed.status(`${path.join(' > ')}`);
  }

  // ---------- every frame ----------
  private frame(): void {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0, now - (this.lastNow || now)));
    this.lastNow = now;
    const gp = this.gamepad();
    const c = this.ed.controls;
    c.padMove = { x: 0, y: 0 };
    c.padLook = { x: 0, y: 0 };
    c.orbitIn = { panX: 0, panY: 0, orbitX: 0, tiltY: 0, zoom: 0, precision: false };
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
    // the pad drives the builder camera; a walk (Tab or quick) keeps walking
    if (gp && this.device === 'pad' && c.mode === 'fly') this.ed.enterOrbit();
    this.drawStrip();
    this.drawBar();
    if (this.radial?.isOpen) return this.menuFrame(now);
    if (!gp) return this.followDrag();
    const st = this.st;
    if ($('ask').classList.contains('hidden') === false) {
      const bs = $('ask').querySelectorAll<HTMLButtonElement>('button');
      if (st.pressed(PAD.A)) bs[0]?.click();
      else if (st.pressed(PAD.B)) bs[1]?.click();
      return;
    }
    // the hub: nothing else reads the pad while it is open
    if (this.hub.isOpen) return this.hub.frame(st);
    if (st.pressed(PAD.START)) return this.hub.open();
    if (this.stickLatch && !st.ls.x && !st.ls.y && !st.rs.x && !st.rs.y) this.stickLatch = false;
    if (c.walking) return this.walkFrame();
    if (st.yTap === 'hold' && !this.ed.drag) return this.openMenu(false, 'build');
    if (st.rbTap === 'hold' && !this.ed.drag) return this.openMenu(false, 'sel');
    if (st.yTap === 'tap' && this.lastTool && !this.ed.drag) this.runMenu({ id: this.lastTool.door ? `door.${this.lastTool.door}` : this.lastTool.tool === 'select' ? 'select' : `build.${this.lastTool.tool}`, name: '' }, []);
    if (st.viewTap === 'tap') this.topDown();
    else if (st.viewTap === 'hold') this.ed.run('layout');
    if (this.focus === 'drawer' && !this.ed.prefs.drawer) this.setFocus('3d');
    if (this.focus === 'drawer') return this.drawerFrame();
    const plan = this.ed.prefs.layout === 'plan';
    const zoom = st.rt - st.lt;
    const fine = st.down(PAD.LB);
    this.magnetFrame(dt, fine);
    // stick speed scales pan and orbit (orbit and tilt are squared, so their input takes the square root)
    const k = this.settings.stickSpeed * (this.magnet ? MAGNET.PAN_SLOW : 1);
    const ko = Math.sqrt(this.settings.stickSpeed);
    const tilt = this.settings.invertTilt ? st.rs.y : -st.rs.y;
    // in Plan only the triggers zoom the plan, not the 3D camera
    if (!this.stickLatch) c.orbitIn = { panX: st.ls.x * k, panY: -st.ls.y * k, orbitX: st.rs.x * ko, tiltY: tilt * ko, zoom: plan ? 0 : zoom, precision: fine };
    else c.orbitIn = { ...c.orbitIn, zoom: plan ? 0 : zoom, precision: fine };
    if (st.pressed(PAD.RS)) this.cycleDisplay();
    if (!this.ed.drag) {
      if (st.pressed(PAD.LS)) return this.ed.quickWalk();
      if (st.xTap === 'tap') this.ed.undo();
      else if (st.xTap === 'hold') this.ed.redo();
      if (st.rbTap === 'tap') this.ed.frameSelected();
    } else if (st.rbTap === 'tap') this.turnGrab();
    if (st.pressed(PAD.B)) this.cancel();
    else if (st.pressed(PAD.A)) this.primary();
    this.dpad();
    this.followDrag();
    const kz = plan ? Math.exp(Math.sign(zoom) * zoom * zoom * ORBIT.ZOOM_RATE * (fine ? ORBIT.PRECISION : 1) * dt) : 1;
    if (this.device === 'pad' && c.mode === 'orbit' && (this.ed.prefs.layout !== '3d' || this.ed.isMinimap())) this.ed.planFollow(c.orbit.s.tx, c.orbit.s.tz, kz);
  }

  /** Quick walk (L3): sticks walk and look; the dot, tool bar and card hide; A does nothing. */
  private walkFrame(): void {
    const st = this.st;
    const c = this.ed.controls;
    if (this.ed.quickWalking && (st.pressed(PAD.LS) || st.pressed(PAD.B))) return this.ed.quickWalk();
    if (!this.stickLatch) {
      c.padMove = { x: st.ls.x, y: -st.ls.y };
      c.padLook = { x: st.rs.x, y: this.settings.invertTilt ? st.rs.y : -st.rs.y };
    }
    // the walk drops or rises to the new level at the same x, z (setLevel moves the walker's floor)
    if (st.repeat(PAD.UP)) this.ed.stepLevel(1);
    if (st.repeat(PAD.DOWN)) this.ed.stepLevel(-1);
  }

  // ---------- the magnetic dot ----------
  /** Snap candidates on the editing level: wall ends, room corners, opening centres (points), wall centre lines. */
  private candidates(): SnapCand[] {
    const ed = this.ed;
    const key = `${ed.view.level}|${ed.model.history.length}|${ed.model.dirty}`;
    if (key === this.candsKey) return this.cands;
    this.candsKey = key;
    const lv = ed.view.level;
    const out: SnapCand[] = [];
    const walls = (ed.model.list('walls') as Wall[]).filter((w) => w.level === lv);
    for (const w of walls) {
      const owner = keyOf('walls', w.id);
      out.push({ kind: 'point', key: `end:${w.id}:a`, label: 'Wall end', owner, p: w.a }, { kind: 'point', key: `end:${w.id}:b`, label: 'Wall end', owner, p: w.b });
    }
    for (const r of ed.model.list('rooms') as Room[]) {
      if (r.level !== lv) continue;
      const owner = keyOf('rooms', r.id);
      const [x0, z0, x1, z1] = r.rect;
      for (const [i, p] of ([[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as Pt[]).entries()) out.push({ kind: 'point', key: `corner:${r.id}:${i}`, label: 'Room corner', owner, p });
    }
    const byId = new Map(walls.map((w) => [w.id, w]));
    for (const o of ed.model.list('openings') as Opening[]) {
      const w = byId.get(o.wall);
      if (w) out.push({ kind: 'point', key: `open:${o.id}`, label: o.type === 'window' ? 'Window centre' : 'Door centre', owner: keyOf('openings', o.id), p: wallPoint(w, o.at) });
    }
    for (const w of walls) out.push({ kind: 'line', key: `line:${w.id}`, label: 'On wall', owner: keyOf('walls', w.id), a: w.a, b: w.b });
    this.cands = out;
    return out;
  }

  /** The dot pulls onto snap points and lines (decision 15); a new snap pulses the dot and rumbles once. */
  private magnetFrame(dt: number, off: boolean): void {
    const c = this.ed.controls;
    if (this.device !== 'pad' || c.mode !== 'orbit' || this.focus !== '3d') {
      this.magnet = null;
      return;
    }
    const o = c.orbit.s;
    const d = this.ed.drag;
    const hit = magnetSearch(o.tx, o.tz, this.candidates(), this.magnet, { off, skip: d ? keyOf(d.coll, d.id) : null, grid: this.ed.grid });
    if (hit && hit.key !== this.magnet?.key) {
      this.rumble('snap');
      const r = $('reticle');
      r.classList.remove('pulse');
      void r.offsetWidth;
      r.classList.add('pulse');
    }
    this.magnet = hit;
    if (hit && hyp2(this.st.ls.x, this.st.ls.y) < MAGNET.EASE_STICK) {
      const f = easeFactor(dt);
      o.tx += (hit.x - o.tx) * f;
      o.tz += (hit.z - o.tz) * f;
    }
  }

  /** View tap (decision 7): top-down and back. */
  private topDown(): void {
    const c = this.ed.controls;
    if (c.mode !== 'orbit') return;
    c.orbit.toggleTopDown();
    this.ed.status(c.orbit.topDown ? 'Top-down (View again goes back)' : 'Back from top-down');
    this.stripAt = 0;
  }

  /** R3 (decision 13): levels shown cycles up to this level, single level, whole building. */
  private cycleDisplay(): void {
    const i = DISPLAYS.findIndex((d) => d[0] === this.ed.view.vis.preset);
    const n = DISPLAYS[(i + 1) % DISPLAYS.length]!;
    this.ed.setPreset(n[0]);
    this.ed.status(`Levels shown: ${n[1]}`);
    this.stripAt = 0;
  }

  /** The pad's point on the editing level: the magnet's snap point exactly while snapped, else the dot on the grid. */
  point(planeY?: number): Pt | null {
    const fine = this.st.down(PAD.LB);
    const g = fine ? this.ed.fineGrid : this.ed.grid;
    const c = this.ed.controls;
    let p: Pt | null;
    if (c.mode === 'orbit') {
      if (this.magnet && !fine) return [this.magnet.x, this.magnet.z];
      p = [c.orbit.s.tx, c.orbit.s.tz];
    } else {
      const cv = $<HTMLCanvasElement>('c');
      p = this.ed.view.planePoint(cv.clientWidth / 2, cv.clientHeight / 2, planeY ?? this.ed.viewFloor());
    }
    return p ? [snap(p[0], g), snap(p[1], g)] : null;
  }

  /** The dot unsnapped (the snap point while snapped), for the grab's edge bands. */
  private dotRaw(): Pt | null {
    const c = this.ed.controls;
    if (c.mode !== 'orbit') return this.point();
    return this.magnet && !this.st.down(PAD.LB) ? [this.magnet.x, this.magnet.z] : [c.orbit.s.tx, c.orbit.s.tz];
  }

  /** What A would pick when it takes no part of the selection: an element on the editing level (Plan only: on the plan). */
  private target(): { key?: Key; x: number; y: number; z: number } | null {
    const ed = this.ed;
    if (ed.prefs.layout === 'plan') {
      const o = ed.controls.orbit.s;
      const sp = ed.planScreen(o.tx, o.tz);
      const p = this.point();
      if (!sp || !p) return null;
      const el = document.elementFromPoint(sp[0], sp[1]);
      const key = (el?.closest('[data-id]')?.getAttribute('data-id') ?? undefined) as Key | undefined;
      return { key: key && parseKey(key) ? key : undefined, x: p[0], y: ed.floor(), z: p[1] };
    }
    const cv = $<HTMLCanvasElement>('c');
    const h = ed.view.pick(cv.clientWidth / 2, cv.clientHeight / 2);
    return h.hit ? { key: h.hit.key, x: h.hit.x, y: h.hit.y, z: h.hit.z } : null;
  }

  /** The selected element as the grab sees it (rooms, stairs, floor holes, walls, openings), or null. */
  private grabShape(): GrabShape | null {
    const s = this.ed.selectedElem();
    if (!s || this.ed.levelOf(s.coll, s.e) !== this.ed.view.level) return null;
    if (s.coll === 'rooms' || s.coll === 'stairs' || s.coll === 'voids') return { kind: 'rect', rect: (s.e as Room).rect };
    if (s.coll === 'walls') {
      const w = s.e as Wall;
      return { kind: 'wall', a: w.a, b: w.b, t: w.t };
    }
    if (s.coll === 'openings') {
      const o = s.e as Opening;
      const w = this.ed.model.get<Wall>('walls', o.wall);
      return w ? { kind: 'opening', a: w.a, b: w.b, t: w.t, at: o.at, w: o.w } : null;
    }
    return null;
  }

  /** What A takes of the selection at the dot (Select tool, nothing grabbed), or null. */
  grabPartNow(): GrabPart | null {
    if (this.ed.tool !== 'select' || this.ed.drag || this.measureFrom) return null;
    const g = this.grabShape();
    const p = this.dotRaw();
    return g && p ? grabPart(g, p[0], p[1]) : null;
  }

  private primary(): void {
    const ed = this.ed;
    if (this.measureFrom) return this.finishMeasure();
    if (ed.drag) {
      ed.endDrag(false);
      this.offset = [0, 0];
      this.turns = 0;
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
    // edge-aware grab: the part the dot names (decision 13); outside the selection, A selects as before
    const s = ed.selectedElem();
    const part = this.grabPartNow();
    if (s && part && p) return this.grab(s.coll, s.id, part.handle, p, ed.viewFloor(), part.words);
    const t = this.target();
    if (!t?.key) return;
    if (t.key !== ed.selected) return ed.select(t.key);
    // a selected ladder: A on it grabs it whole
    const k = parseKey(t.key)!;
    if (p) this.grab(k.coll, k.id, null, p, ed.viewFloor(), 'Move');
  }

  /** Selection wheel > Move: grab it whole at the dot, as A in the middle. */
  private grabWhole(): void {
    const s = this.ed.selectedElem();
    const p = this.point();
    if (s && p) this.grab(s.coll, s.id, null, p, this.ed.viewFloor(), 'Move');
  }

  private grab(coll: Coll, id: string, handle: string | null, start: Pt, planeY: number, words: string): void {
    this.ed.beginDrag(coll, id, handle, start, planeY, 0, 0, 'pad');
    if (this.ed.drag) this.ed.drag.moved = true;
    this.offset = [0, 0];
    this.turns = 0;
    const turn = !handle && TURNS.includes(coll) ? ', RB turns it' : '';
    this.ed.status(`${words}: move the dot, A drops it, B puts it back, D-pad nudges${turn}`);
  }

  /** RB tap while grabbing (decision 19): a quarter turn about the dot, shown live; the drop commits move and turn. */
  private turnGrab(): void {
    const d = this.ed.drag;
    if (!d || d.source !== 'pad' || d.handle || d.isNew || !TURNS.includes(d.coll)) return;
    this.turns = (this.turns + 1) % 4;
  }

  /** The grabbed element turned `turns` quarter turns about (cx, cz). */
  private turned(coll: Coll, e: Elem, cx: number, cz: number): Elem {
    const out = clone(e) as Elem;
    const g = this.ed.grid;
    const next: Record<string, string> = { N: 'E', E: 'S', S: 'W', W: 'N' };
    for (let i = 0; i < this.turns; i++) {
      if ('rect' in out) {
        const r = (out as Room).rect;
        const a = turnPt([r[0], r[1]], cx, cz);
        const b = turnPt([r[2], r[3]], cx, cz);
        (out as Room).rect = normRect([snap(a[0], g), snap(a[1], g), snap(b[0], g), snap(b[1], g)] as Rect);
        if (coll === 'stairs') (out as Stair).up = next[(out as Stair).up] as Stair['up'];
      } else if (coll === 'walls') {
        (out as Wall).a = turnPt((out as Wall).a, cx, cz);
        (out as Wall).b = turnPt((out as Wall).b, cx, cz);
      } else if (coll === 'ladders') {
        (out as Ladder).at = turnPt((out as Ladder).at, cx, cz);
        (out as Ladder).facing = next[(out as Ladder).facing ?? 'N'];
      }
    }
    return out;
  }

  /** While grabbing or drawing with the pad: the item follows the dot, plus D-pad nudges and RB turns. */
  private followDrag(): void {
    const d = this.ed.drag;
    if (!d || d.source !== 'pad') return this.updatePointers();
    const p = this.point(d.planeY);
    if (!p) return;
    this.ed.moveDrag(p[0] + this.offset[0], p[1] + this.offset[1], this.st.down(PAD.LB));
    if (this.turns) {
      const e = this.ed.model.get(d.coll, d.id);
      if (e) this.ed.model.preview(d.coll, this.turned(d.coll, e, p[0], p[1]));
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
    this.turns = 0;
  }

  private dpad(): void {
    const st = this.st;
    const ed = this.ed;
    const dirs: [number, Pt][] = [[PAD.UP, [0, 1]], [PAD.DOWN, [0, -1]], [PAD.RIGHT, [1, 0]], [PAD.LEFT, [-1, 0]]];
    if (ed.drag?.source === 'pad') {
      const g = st.down(PAD.LB) ? ed.fineGrid : ed.grid;
      // up is the axis the camera faces most (Plan only: north)
      const yaw = ed.prefs.layout === 'plan' ? 0 : ed.controls.yaw;
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
    if (st.repeat(PAD.RIGHT)) this.toolStep(1);
    if (st.repeat(PAD.LEFT)) this.toolStep(-1);
  }

  /** D-pad left / right (decisions 10, 11): the previous / next tool on the tool bar, wrapping at the ends. */
  private toolStep(dir: 1 | -1): void {
    const i = BAR.findIndex((b) => b[0] === this.barSlot());
    const [id] = BAR[(i + dir + BAR.length) % BAR.length]!;
    if (id === 'measure') return this.startMeasure();
    this.runMenu({ id: id === 'select' ? 'select' : id === 'door' ? `door.${$<HTMLSelectElement>('doorType').value}` : `build.${id}`, name: '' }, []);
  }

  private barSlot(): string {
    return this.measureFrom ? 'measure' : this.ed.tool;
  }

  setFocus(f: Focus): void {
    if (f === 'drawer' && this.ed.drag?.source === 'pad') this.ed.endDrag(true);
    this.focus = f;
    if (f === 'drawer') {
      this.drawerIndex = 0;
      this.ed.status('Pad: side panel (D-pad up / down picks a field, left / right changes it, B leaves)');
    }
    this.showPointers();
  }

  enterDrawer(tab: 'props' | 'checks' | 'log' | 'pad' = 'props'): void {
    this.ed.openDrawer();
    this.ed.tab = tab;
    this.ed.renderPanel();
    this.setFocus('drawer');
  }

  private drawerFrame(): void {
    const st = this.st;
    const fields = [...$('panel').querySelectorAll<HTMLElement>('[data-k], button, [data-go]')];
    if (st.pressed(PAD.B)) return this.setFocus('3d');
    if (!fields.length) return;
    if (st.repeat(PAD.DOWN)) this.drawerIndex = (this.drawerIndex + 1) % fields.length;
    if (st.repeat(PAD.UP)) this.drawerIndex = (this.drawerIndex - 1 + fields.length) % fields.length;
    this.drawerIndex = Math.min(this.drawerIndex, fields.length - 1);
    focusField(fields, this.drawerIndex, $('panel'));
    const f = fields[this.drawerIndex]!;
    const step = st.repeat(PAD.RIGHT) ? 1 : st.repeat(PAD.LEFT) ? -1 : 0;
    const fine = st.down(PAD.LB);
    stepField(f, step, fine ? this.ed.fineGrid : this.ed.grid, fine);
    if (st.pressed(PAD.A)) {
      if (f instanceof HTMLButtonElement || (f instanceof HTMLInputElement && f.type === 'checkbox')) f.click();
      else if (f.dataset.go) this.goToProblem(f.dataset.go);
      else if (f instanceof HTMLInputElement && f.type !== 'number') f.focus();
    }
  }

  // ---------- the dot, the tool bar and the selection card ----------
  showPointers(): void {
    const pad = this.device === 'pad';
    // the quick walk hides the dot, the tool bar and the card (decision 14)
    const walk = this.ed.controls.walking;
    $('reticle').classList.toggle('hidden', !pad || this.focus !== '3d' || walk);
    $('toolBar').classList.toggle('hidden', !pad || walk);
    $('selCard').classList.toggle('hidden', !pad || walk || !this.ed.selectedElem());
    $('drawer').classList.toggle('padfocus', pad && this.focus === 'drawer');
    if (!(pad && this.focus === 'drawer')) for (const x of $('panel').querySelectorAll('.padfocus')) x.classList.remove('padfocus');
  }

  private barAt = 0;
  private barKey = '';
  /** The tool bar (decision 11) and the selection card (decision 16), pad screen only. */
  private drawBar(): void {
    if (this.device !== 'pad') return;
    const now = performance.now();
    if (now - this.barAt < 100) return;
    this.barAt = now;
    this.showPointers();
    const ed = this.ed;
    const door = $<HTMLSelectElement>('doorType');
    const doorName = door.selectedOptions[0]?.textContent ?? door.value;
    const s = ed.selectedElem();
    const key = `${this.barSlot()}|${doorName}|${ed.selected ?? ''}|${ed.model.journal.length}|${ed.model.dirty}`;
    if (key === this.barKey) return;
    this.barKey = key;
    const slot = this.barSlot();
    $('toolBar').innerHTML = BAR.map(([id, name]) => `<div class="slot${id === slot ? ' on' : ''}" data-slot="${id}"><b>${name}</b>${id === 'door' ? `<small>${esc(doorName)}</small>` : ''}</div>`).join('');
    if (!s) return;
    const d = ed.model.data;
    const lv = d.levels.find((l) => l.id === ed.levelOf(s.coll, s.e));
    let kind = KIND[s.coll];
    let size = '';
    if ('rect' in s.e) {
      const r = (s.e as Room).rect;
      size = `${fmt(r[2] - r[0])} x ${fmt(r[3] - r[1])} m`;
      if (s.coll === 'rooms') kind = `Room (${(s.e as Room).kind})`;
    } else if (s.coll === 'walls') {
      const w = s.e as Wall;
      kind = `${w.kind} wall`;
      size = `length ${fmt(wallLen(w))} m, thickness ${fmt(w.t)} m`;
    } else if (s.coll === 'openings') {
      const o = s.e as Opening;
      kind = `Opening: ${o.type}`;
      size = `${o.type}, width ${fmt(o.w)} m`;
    } else if (s.coll === 'ladders') size = `at x ${fmt((s.e as Ladder).at[0])}, z ${fmt((s.e as Ladder).at[1])}`;
    $('selCard').innerHTML = `<b>${esc(label(d, s.coll, s.e))}</b><div>${esc(kind)}</div><div>${esc(size)}</div><div>Level ${esc(lv?.name ?? '')}</div>`;
  }

  private labelAt = 0;
  /** The dot's words, the grab preview (decision 14) and the tool ghosts (decisions 17, 18), a few times a second. */
  private updatePointers(): void {
    if (this.device !== 'pad' || this.focus === 'drawer' || this.ed.controls.walking || this.hub.isOpen) return this.setMarks([], [], '');
    const now = performance.now();
    if (now - this.labelAt < 80) return;
    this.labelAt = now;
    const ed = this.ed;
    const d = ed.drag;
    const p = this.point(d?.source === 'pad' ? d.planeY : undefined);
    let text = p ? `x ${fmt(p[0])}  z ${fmt(p[1])}` : '';
    if (this.magnet) text += `   ${this.magnet.label}`;
    let words = '';
    let bad = false;
    let key = '';
    const marks: Mark[] = [];
    const plan: PlanShape[] = [];
    const f = ed.viewFloor();
    const part = this.grabPartNow();
    const s = ed.selectedElem();
    let hover: Key | null = null;
    if (this.measureFrom && p) {
      if (Number.isNaN(this.measureFrom[0])) words = 'A: first point';
      else {
        const [x0, z0] = this.measureFrom;
        const len = hyp2(p[0] - x0, p[1] - z0);
        words = `measuring ${fmt(len)} m`;
        key = `m|${x0},${z0},${p[0]},${p[1]}`;
        marks.push(this.bar([x0, z0], p, f + 0.05, 0.08, 0.08, 'ghost'));
        plan.push({ kind: 'line', a: [x0, z0], b: p });
      }
    } else if (d?.source === 'pad') words = ed.dragWords();
    else if (part && s) {
      words = `${part.words} (A)`;
      key = `g|${ed.selected}|${part.handle}|${ed.model.history.length}`;
      this.partMarks(s.coll, s.e, part, f, marks, plan);
    } else if (ed.tool === 'room' || ed.tool === 'wall') {
      if (p) {
        words = `A: start a ${ed.tool} here`;
        key = `s|${p[0]},${p[1]}`;
        marks.push({ x: p[0], y: f + 0.75, z: p[1], sx: 0.2, sy: 1.5, sz: 0.2, dx: 1, dz: 0, look: 'ghost' }, { x: p[0], y: f + 0.03, z: p[1], sx: 0.8, sy: 0.06, sz: 0.8, dx: 1, dz: 0, look: 'ghost' });
        plan.push({ kind: 'ring', p });
      }
    } else if ((ed.tool === 'door' || ed.tool === 'window') && p) {
      const w = nearestWall(ed.model.list('walls') as Wall[], ed.view.level, p[0], p[1], GHOST.REACH);
      if (!w) {
        bad = true;
        words = 'Move onto a wall';
      } else {
        const type = ed.tool === 'window' ? 'window' : $<HTMLSelectElement>('doorType').value;
        const def = OPENING_DEFAULTS[type] ?? OPENING_DEFAULTS.door!;
        const L = wallLen(w);
        const at = Math.min(L - def.w / 2, Math.max(def.w / 2, snap(projectOnWall(w, p[0], p[1]).s, ed.grid)));
        const a = wallPoint(w, at - def.w / 2);
        const b = wallPoint(w, at + def.w / 2);
        words = `width ${fmt(def.w)} m   A: place ${DOOR_NAMES[type] ?? type} on ${label(ed.model.data, 'walls', w)}`;
        key = `o|${w.id}|${at}|${type}`;
        marks.push(this.bar(a, b, f + def.sill + def.h / 2, def.h, w.t + 0.1, 'ghost'));
        plan.push({ kind: 'line', a, b });
      }
    } else if (!d) {
      const t = this.target();
      const k = t?.key ? parseKey(t.key) : null;
      const e = k ? ed.model.get(k.coll, k.id) : undefined;
      if (k && e) words = label(ed.model.data, k.coll, e);
      hover = t?.key ?? null;
    }
    ed.setHover(hover);
    if (words) text += `   ${words}`;
    // Plan only: the 3D dot is hidden, so its words go under the plan
    $(ed.prefs.layout === 'plan' ? 'planStatus' : 'reticleText').textContent = text;
    $('reticle').classList.toggle('bad', bad);
    const hint = part || key.startsWith('o|') || key.startsWith('s|') || bad ? words : '';
    if (hint !== this.grabWords) {
      this.grabWords = hint;
      ed.updateHint();
    }
    this.setMarks(marks, plan, `${key}|${f}|${bad}`);
  }

  /** Shows the marks in 3D and the dashed shapes on the plan when they changed. */
  private setMarks(marks: readonly Mark[], plan: readonly PlanShape[], key: string): void {
    if (key === this.marksKey) return;
    this.marksKey = key;
    this.ed.view.setMarks(marks);
    this.ed.planGhost(plan, marks[0]?.look ?? 'ghost');
  }

  /** A box from a to b at height y (centre), sy tall and sz thick. */
  private bar(a: Pt, b: Pt, y: number, sy: number, sz: number, look: Mark['look']): Mark {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    return { x: (a[0] + b[0]) / 2, y, z: (a[1] + b[1]) / 2, sx: hyp2(dx, dz), sy, sz, dx: dx || 1e-6, dz, look };
  }

  /** The lit part of the selection: an edge, a wall end, an opening side, or the whole outline for Move. */
  private partMarks(coll: Coll, e: Elem, part: GrabPart, f: number, marks: Mark[], plan: PlanShape[]): void {
    if ('rect' in e) {
      const r = (e as Room).rect;
      const edges: Record<string, [Pt, Pt]> = { W: [[r[0], r[1]], [r[0], r[3]]], E: [[r[2], r[1]], [r[2], r[3]]], S: [[r[0], r[1]], [r[2], r[1]]], N: [[r[0], r[3]], [r[2], r[3]]] };
      for (const [id, [a, b]] of Object.entries(edges)) {
        if (part.handle && part.handle !== id) continue;
        marks.push(this.bar(a, b, f + 0.15, 0.3, part.handle ? 0.3 : 0.15, 'lit'));
        plan.push({ kind: 'line', a, b });
      }
      return;
    }
    if (coll === 'walls') {
      const w = e as Wall;
      if (part.handle) {
        const q = part.handle === 'a' ? w.a : w.b;
        marks.push({ x: q[0], y: f + w.h / 2, z: q[1], sx: 0.4, sy: w.h + 0.2, sz: w.t + 0.2, dx: w.b[0] - w.a[0] || 1e-6, dz: w.b[1] - w.a[1], look: 'lit' });
        plan.push({ kind: 'ring', p: q });
      } else {
        marks.push(this.bar(w.a, w.b, f + w.h + 0.1, 0.2, w.t + 0.2, 'lit'), this.bar(w.a, w.b, f + 0.1, 0.2, w.t + 0.2, 'lit'));
        plan.push({ kind: 'line', a: w.a, b: w.b });
      }
      return;
    }
    if (coll === 'openings') {
      const o = e as Opening;
      const w = this.ed.model.get<Wall>('walls', o.wall);
      if (!w) return;
      const lo = wallPoint(w, o.at - o.w / 2);
      const hi = wallPoint(w, o.at + o.w / 2);
      const y = f + o.sill + o.h / 2;
      if (part.handle) {
        const q = part.handle === 'l' ? lo : hi;
        marks.push({ x: q[0], y, z: q[1], sx: 0.15, sy: o.h, sz: w.t + 0.2, dx: hi[0] - lo[0] || 1e-6, dz: hi[1] - lo[1], look: 'lit' });
        plan.push({ kind: 'ring', p: q });
      } else {
        marks.push(this.bar(lo, hi, y, o.h, w.t + 0.15, 'lit'));
        plan.push({ kind: 'line', a: lo, b: hi });
      }
    }
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

  /** Selection wheel > Copy to level above: copy and paste one level up in one edit; the editing level goes with it. */
  private copyUp(): void {
    const s = this.ed.selectedElem();
    if (!s) return;
    const levels = this.ed.model.data.levels.slice().sort((a, b) => a.floor - b.floor);
    const i = levels.findIndex((l) => l.id === this.ed.levelOf(s.coll, s.e));
    if (!levels[i + 1]) return this.ed.status('No level above');
    this.copy();
    this.paste(true);
  }

  /** Selection wheel > Change type: the opening's type, the room's or the wall's kind; one undoable edit. */
  private changeType(v: string): void {
    const s = this.ed.selectedElem();
    if (!s) return;
    const after = clone(s.e) as Elem & Record<string, unknown>;
    if (s.coll === 'openings') after.type = v;
    else if (s.coll === 'rooms' || s.coll === 'walls') after.kind = v;
    else return;
    this.ed.commit([{ coll: s.coll, id: s.id, before: s.e, after }]);
    this.ed.renderPanel();
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
      `View <b>${view}${ed.controls.mode === 'orbit' && ed.controls.orbit.topDown ? ', Top-down' : ''}</b> &nbsp; Levels <b>${preset}${extras ? `, ${extras}` : ''}</b>`,
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
    // the Levels panel lives in the hub's Levels tab (and in the side panel for the mouse)
    if (this.hub.isOpen) this.hub.render();
    else this.ed.renderPanel();
    this.stripAt = 0;
  }

  /** Checks panel: A on a problem line takes the camera to the first element it names. */
  goToProblem(text: string): void {
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
