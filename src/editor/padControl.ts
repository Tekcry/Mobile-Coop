/**
 * Controller editing for the level editor (ED2 Part C, ED3-1, ED3-2): polls the pad each frame and drives the editor.
 * The pad moves a builder camera (orbit.ts) whose target is the dot on the editing floor; the dot is magnetic (grab.ts).
 * A selects, takes the part of the selection the dot names (edge-aware grab) and drops; Y (Space with the mouse) opens
 * and closes the tile menu (ON0a); with something selected the D-pad edits the selection card; Menu opens the hub
 * (hubView.ts). Every menu takes the D-pad and the left stick through one stepper (stickSteps.ts). Bindings and their
 * words live in actions.ts; the pure parts in pad.ts, orbit.ts, stickSteps.ts, tileMenu.ts, card.ts, grab.ts and hub.ts.
 */
import { hyp2 } from '../core/mathx';
import { detectPadStyle } from '../input/gamepadMapping';
import type { PadStyle } from '../input/gamepadMapping';
import type { Device } from './actions';
import { CARD_MERGE_S, cardRows, cardWindow, nameList, stepCard } from './card';
import { fmt, nearestWall, normRect, projectOnWall, snap, wallLen, wallPoint } from './geometry';
import { easeFactor, GHOST, grabPart, guideLines, MAGNET, magnetSearch, SNAP, turnPt } from './grab';
import { centreOpening, liveOpening } from './liveSizes';
import type { GrabPart, GrabShape, SnapCand, SnapHit } from './grab';
import { DEFAULT_SETTINGS, LARGE_TEXT, readSettings, stepLayout } from './hub';
import type { PadSettings } from './hub';
import { focusField, HubView, stepField } from './hubView';
import type { Editor, PlanShape } from './main';
import { cardWords, DOOR_NAMES, label, OPENING_DEFAULTS, slotDoorName, withBetween } from './ops';
import { familyTypes } from './openingCatalogue';
import { ORBIT } from './orbit';
import { PAD, PadState, padWords as padWordsOf } from './pad';
import { linkedHint, ROOM_OPTIONS } from './roomWalls';
import type { RoomWallOption } from './roomWalls';
import { navAxes, StepRepeat } from './stickSteps';
import { TileMenu } from './tileMenu';
import type { MenuInput, ViewState } from './tileMenu';
import { NamePick, TileMenuView } from './tileMenuView';
import type { Mark } from './scene3d';
import type { StampGhost } from './stampTool';
import { presetPicks } from './visibility';
import type { Coll, Elem, Ext, Key, Ladder, Obj, Opening, Pt, Rect, Roof, Room, Stair, Wall } from './types';
import { keyOf, parseKey } from './types';
import { climbWords, HOLE_KINDS, HOLE_NAMES, levelAbove, proposeLadder, STAIR_TYPES, stairFit, stairType } from './vertical';
import type { StairTypeId } from './vertical';
import { footprintAt, ROOF_TYPES, roofType, roofWords } from './roofGeometry';
import { boxOf, boxPick, COPY_COLLS, copyItems, groupWords, itemsCentre, levelAbove as levelIdAbove, pasteChanges } from './group';
import type { ClipItem } from './group';
import { badgeWords } from './objects';
import { CLIMB_PIECES, finishOf, pieceOf } from './climbCatalogue';
import type { ExtKind } from './climbCatalogue';
import { pieceWords } from './climb';
import { fittingOf, groupFittings } from './lightCatalogue';
import type { MissionKind } from './missionCatalogue';
import type { SecTool } from './securityCatalogue';
import type { Device as SecDevice } from './security';
import { isMission } from './mission';
import type { LightGroup } from './lightCatalogue';
import { aimDir } from './lightCatalogue';
import { circuitWords, lampWords, withParams } from './lamps';
import type { Circuit, Lamp, LampData } from './lamps';
import { loudWords } from './finishes';
import { groupPresets } from './catalogue';
import type { ObjGroup } from './catalogue';
import { presetWords } from './presets';
import type { PresetFrom } from './presets';

type Focus = '3d' | 'drawer';
/** Tool names on the tool bar, which shows the active tool only (ON0a: the Y menu picks tools). */
const BAR = [
  ['select', 'Select'],
  ['room', 'Room'],
  ['wall', 'Wall'],
  ['door', 'Door'],
  ['window', 'Window'],
  ['stair', 'Stair'],
  ['ladder', 'Ladder'],
  ['hole', 'Floor hole'],
  ['roof', 'Roof'],
  ['object', 'Object'],
  ['climb', 'Climb'],
  ['lamp', 'Light'],
  ['stamp', 'Stamp'],
  ['guard', 'Guard view'],
  ['mission', 'Mission'],
  ['security', 'Security'],
  ['measure', 'Measure'],
] as const;
const DISPLAYS = [
  ['upTo', 'Up to this level'],
  ['single', 'Single level'],
  ['whole', 'Whole building'],
] as const;
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
  readonly hub: HubView;
  settings: PadSettings = { ...DEFAULT_SETTINGS };
  /** The tile menu (Y, Space) and its view; the name picker (A on the card's Name row). */
  readonly menu = new TileMenu();
  private readonly menuView: TileMenuView;
  readonly names: NamePick;
  /** The selection card: its lit row, and whether the D-pad is editing it (B or A leaves; another selection resets it). */
  cardRow = 0;
  cardEditing = false;
  private cardSel = '';
  /** D-pad and stick steps for every menu, one per axis. */
  private readonly navX = new StepRepeat();
  private readonly navY = new StepRepeat();
  /** Grid steps added by D-pad nudges while grabbing. */
  private offset: Pt = [0, 0];
  /** Quarter turns (RB taps) of the grabbed thing, about the dot. */
  private turns = 0;
  private measureFrom: Pt | null = null;
  /** Copied elements (one, or a set with the doors and windows of its walls, ON3). */
  clipboard: ClipItem[] | null = null;
  /** ON3 box select: where A went down (raw dot) and where the dot is now, while A is held. */
  private boxFrom: Pt | null = null;
  private boxTo: Pt | null = null;
  /** The magnetic dot's current snap, and the snap candidates on the editing level (rebuilt after a change). */
  magnet: SnapHit | null = null;
  private cands: SnapCand[] = [];
  private candsKey = '';
  /** What A would do at the dot (grab preview and ghosts), for the hint bar. */
  grabWords = '';
  private marksKey = '';
  private drawerIndex = 0;
  private lastNow = 0;
  /** After a menu or the hub opens or closes, the sticks do nothing until they come back to the centre. */
  private stickLatch = false;
  /** LB was held last frame (the hint bar shows the LB words while it is). */
  private lbWas = false;
  get lbHeld(): boolean {
    return this.lbWas;
  }

  constructor(private readonly ed: Editor) {
    this.menuView = new TileMenuView(
      $('tileMenu'),
      (t) => {
        this.menu.setTab(t, this.menuInput());
        this.renderMenu();
      },
      (i) => {
        this.menu.index = i;
        this.pickTile();
      },
    );
    this.names = new NamePick($('namePick'));
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
    // keyboard and mouse take the hint bar back; Space (the action map) opens the tile menu, a click picks a tile
    const keysUsed = (): void => this.setDevice('keys');
    window.addEventListener('keydown', keysUsed);
    window.addEventListener('pointerdown', keysUsed, true);
    window.addEventListener('pointermove', (e) => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 8) keysUsed();
    });
    this.ed.view.scene.onBeforeRenderObservable.add(() => this.frame());
  }

  /** The tile menu or the name picker is open (the 'menu' context). */
  get menuOpen(): boolean {
    return this.menu.isOpen || this.names.isOpen;
  }

  get rumbleOn(): boolean {
    return this.settings.rumble;
  }

  setDevice(d: Device): void {
    if (this.device === d) return;
    this.device = d;
    // mouse or keys: the fly camera takes over from the same pose; the plan marker and the pad's marks go
    if (d === 'keys') {
      this.cardEditing = false;
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

  /** Text size on the pad screen, the hub and the tile menu; stick speed and invert tilt are read each frame. */
  applySettings(): void {
    document.body.style.setProperty('--ts', String(this.settings.textSize === 'large' ? LARGE_TEXT : 1));
  }

  /** The sticks do nothing until they return to the centre (after a menu or the hub opens or closes). */
  latchSticks(): void {
    this.stickLatch = true;
    this.navX.reset();
    this.navY.reset();
  }

  /**
   * This frame's menu steps: the D-pad, or the left stick when `stick` (and not latched), through the shared stepper
   * (a push steps at once, held repeats after 0.35 s and speeds up). y is down-positive (screen).
   */
  nav(now: number, stick: boolean): { x: number; y: number } {
    const st = this.st;
    const dx = (st.down(PAD.RIGHT) ? 1 : 0) - (st.down(PAD.LEFT) ? 1 : 0);
    const dy = (st.down(PAD.DOWN) ? 1 : 0) - (st.down(PAD.UP) ? 1 : 0);
    const l = stick && !this.stickLatch ? st.rawL : { x: 0, y: 0 };
    const a = navAxes(dx, dy, l.x, l.y);
    this.navX.speed = this.navY.speed = this.settings.repeatSpeed;
    return { x: this.navX.update(a.x, now), y: this.navY.update(a.y, now) };
  }

  /** The right stick scrolls a long list or page. */
  scroll(el: HTMLElement | null, dt: number): void {
    const y = this.st.rs.y;
    if (el && y) el.scrollTop += y * 1400 * dt;
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

  // ---------- the tile menu (ON0a) ----------
  /** What the tiles depend on: the selection, the clipboard and the view toggles. */
  menuInput(): MenuInput {
    const s = this.ed.selectedElem();
    const type = s ? String((s.e as unknown as Record<string, unknown>)[s.coll === 'openings' ? 'type' : s.coll === 'lamps' ? 'fixture' : 'kind'] ?? '') : '';
    const playing = !!s && s.coll === 'guards' && this.ed.mission.playing?.id === s.id;
    return { sel: s ? { coll: s.coll, type, gap: s.coll === 'walls' && this.ed.gapsOf(s.id).length > 0, breakable: s.coll === 'lamps' && !!(s.e as Lamp).breakable } : null, clipboard: !!this.clipboard, view: this.viewState(), group: this.ed.group.length, objGroup: this.ed.objGroup, presets: this.presetsInput(), lightGroup: this.ed.lightGroup, playing };
  }

  viewState(): ViewState {
    const ed = this.ed;
    const v = ed.view.vis;
    return { layout: ed.prefs.layout, ghost: v.ghost, exploded: v.exploded, gap: v.gap, cut: v.section, preset: v.preset, building: v.building, minimap: ed.prefs.minimap, labels: !$('planSvg').classList.contains('nolabels'), underlay: v.underlay, names: ed.prefs.names, figure: ed.prefs.figure, stealth: ed.stealth, finish: ed.finishView, light: ed.lights.on, dark: ed.lights.dark, lmode: ed.lightModeName, circuit: ed.lights.mode.circuit ?? null, paths: ed.mission.paths, coverage: ed.security.coverage };
  }

  /** Y or Space: opens the menu (on the last tab, or Build per Settings), or closes it. */
  toggleMenu(): void {
    if (this.menu.isOpen) return this.closeMenu();
    if (this.names.isOpen) return;
    if (this.ed.drag || this.ed.groupDrag) return this.ed.status('Drop it or put it back first');
    if (this.focus === 'drawer') this.setFocus('3d');
    this.cardEditing = false;
    this.menu.open(this.menuInput(), this.settings.menuOpens);
    this.latchSticks();
    this.renderMenu();
    this.showPointers();
    this.ed.updateHint();
  }

  /** Closes the menu without a pick (B, Y, Esc, the hub opening). */
  closeMenu(): void {
    if (!this.menu.isOpen) return;
    this.menu.close();
    this.latchSticks();
    this.renderMenu();
    this.showPointers();
    this.ed.updateHint();
  }

  renderMenu(): void {
    const s = this.style;
    const pad = this.device === 'pad';
    const words = { tab: pad ? `${padWordsOf('LB', s)} / ${padWordsOf('RB', s)}` : 'Click a tab', close: pad ? `${padWordsOf('B', s)} or ${padWordsOf('Y', s)} closes` : 'Space or Esc closes' };
    this.menuView.render(this.menu, this.menuInput(), words, $('hint').offsetHeight);
  }

  /** One pad frame with the menu open. */
  private menuFrame(now: number, dt: number): void {
    const st = this.st;
    const inp = this.menuInput();
    if (st.pressed(PAD.B) || st.pressed(PAD.Y)) return this.closeMenu();
    if (st.pressed(PAD.LB)) this.menu.stepTab(-1, inp);
    if (st.pressed(PAD.RB)) this.menu.stepTab(1, inp);
    const n = this.nav(now, true);
    const t = this.menu.tile(inp);
    // on the View rows left / right change the value (sliders faster the further the stick is pushed)
    if (n.x && t && this.menu.tab === 'View') this.runView(t.id, n.x as 1 | -1, false);
    if (n.x || n.y) this.menu.move(n.x, n.y, this.menuView.cols(), inp);
    this.scroll(this.menuView.body, dt);
    if (st.pressed(PAD.A)) return this.pickTile();
    this.renderMenu();
  }

  /** ON11: the Presets tab's input: the source shown, its presets, the own preset Rename / Delete act on. */
  private presetsInput(): NonNullable<MenuInput['presets']> {
    const st = this.ed.stamp;
    const cur = st.mine.find((p) => p.id === st.id);
    return { from: st.from, list: st.list(st.from).map((p) => ({ id: p.id, name: p.name, desc: presetWords(p) })), mine: cur ? { id: cur.id, name: cur.name } : null };
  }

  /** ON11: Selected > Save as preset: a name from the list (your presets' names) or the keyboard. */
  private openSavePreset(): void {
    const ed = this.ed;
    this.latchSticks();
    // the names on offer: the selected rooms' names, then your presets' (A picks one; the last item types a new one)
    const keys = ed.group.length ? ed.group : ed.selected ? [ed.selected] : [];
    const roomNames = keys.filter((k) => k.startsWith('rooms:')).map((k) => ed.model.get<Room>('rooms', k.slice(6))?.name).filter((n): n is string => !!n);
    const names = [...new Set([...roomNames, ...ed.stamp.mine.map((p) => p.name)])];
    this.names.open('Preset name', names, names[0] ?? 'My preset', (name) => {
      this.latchSticks();
      ed.updateHint();
      if (name) ed.savePreset(name);
    });
    ed.updateHint();
  }

  /** ON11: Presets > Mine > Rename (the name list and keyboard) and Delete (asks first). */
  private openPresetRename(): void {
    const ed = this.ed;
    const p = ed.stamp.mine.find((q) => q.id === ed.stamp.id);
    if (!p) return;
    this.latchSticks();
    this.names.open(`Rename ${p.name}`, ed.stamp.mine.map((q) => q.name), p.name, (name) => {
      this.latchSticks();
      ed.updateHint();
      if (name && ed.stamp.rename(p.id, name)) {
        ed.updateBar();
        ed.status(`Preset renamed to ${name.trim()}; Save writes it`);
      }
    });
    ed.updateHint();
  }

  private async deletePreset(): Promise<void> {
    const ed = this.ed;
    const p = ed.stamp.mine.find((q) => q.id === ed.stamp.id);
    if (!p) return;
    if (!(await ed.ask(`Delete your preset ${p.name}?`, 'Delete', 'Cancel'))) return;
    ed.stamp.remove(p.id);
    if (ed.tool === 'stamp') ed.setTool('select');
    ed.updateBar();
    ed.status(`Deleted preset ${p.name}; Save writes the presets file`);
  }

  /** A on the highlighted tile (or a click): a View tile changes and the menu stays; anything else closes it and runs. */
  private pickTile(): void {
    const inp = this.menuInput();
    const t = this.menu.tile(inp);
    if (!t) return;
    if (t.disabled) {
      this.rumble('error');
      return this.ed.status(t.disabled);
    }
    if (t.id.startsWith('view.')) {
      this.runView(t.id, 1, true);
      return this.renderMenu();
    }
    if (t.id.startsWith('objgroup.')) {
      // ON4: a group tile shows that group's objects; the menu stays open
      this.ed.setObjectGroup(t.id.slice(9) as ObjGroup);
      return this.renderMenu();
    }
    if (t.id.startsWith('lightgroup.')) {
      // ON6: a group tile shows that group's fittings; the menu stays open
      this.ed.setLightGroup(t.id.slice(11) as LightGroup);
      return this.renderMenu();
    }
    if (t.id.startsWith('presetfrom.')) {
      // ON11: a source tile shows that source's presets; the menu stays open
      this.ed.stamp.from = t.id.slice(11) as PresetFrom;
      return this.renderMenu();
    }
    this.closeMenu();
    this.runMenu(t.id);
  }

  /** A View item from the tile menu or the hub: A (press) toggles; left / right steps a cycle or moves a slider. */
  runView(id: string, dir: 1 | -1, press: boolean): void {
    const ed = this.ed;
    const v = ed.view.vis;
    let rebuild = false;
    if (id === 'view.layout') return ed.setLayout(stepLayout(ed.prefs.layout, dir));
    if (id === 'view.ghost') v.ghost = !v.ghost;
    else if (id === 'view.exploded') {
      if (press) v.exploded = !v.exploded;
      else {
        v.gap = Math.min(12, Math.max(0, v.gap + dir * 0.5));
        v.exploded = true;
      }
    } else if (id === 'view.cut') {
      v.section = press ? (v.section > 0 ? 0 : 1.2) : Math.min(4, Math.max(0, +(v.section + dir * 0.1).toFixed(2)));
      rebuild = true;
    } else if (id === 'view.levels') {
      const i = DISPLAYS.findIndex(([p]) => p === v.preset);
      return this.setDisplay(DISPLAYS[(i + dir + DISPLAYS.length) % DISPLAYS.length]![0]);
    } else if (id === 'view.building') {
      const bs = ['all', ...(ed.model.data.meta.buildings ?? []).map((b) => b.id), 'site'];
      v.building = bs[(bs.indexOf(v.building) + dir + bs.length) % bs.length]!;
    } else if (id === 'view.minimap') return ed.run('minimap');
    else if (id === 'view.labels') {
      $('planSvg').classList.toggle('nolabels');
      return;
    } else if (id === 'view.underlay') v.underlay = !v.underlay;
    else if (id === 'view.names') return ed.setNames(!ed.prefs.names);
    else if (id === 'view.figure') return ed.setFigure(!ed.prefs.figure);
    else if (id === 'view.stealth') return ed.setStealth(!ed.stealth);
    else if (id === 'view.finish') return ed.setFinishView(!ed.finishView);
    else if (id === 'view.light') return ed.setLightView(!ed.lights.on);
    else if (id === 'view.dark') return ed.setDarkMap(!ed.lights.dark);
    else if (id === 'view.lmode') return ed.stepLightMode(dir);
    else if (id === 'view.circuit') return ed.stepLightCircuit(dir);
    else if (id === 'view.paths') return ed.stepGuardPaths();
    else if (id === 'view.coverage') return ed.setCoverage(!ed.security.coverage);
    this.applyPanel(rebuild);
  }

  /** Runs a tile (and the D-pad tool variants), by the Build, Openings and Selected tabs' ids. */
  runMenu(id: string): void {
    const ed = this.ed;
    const tool = (t: string, door?: string, win?: string): void => {
      this.measureFrom = null;
      if (door) $<HTMLSelectElement>('doorType').value = door;
      if (win) $<HTMLSelectElement>('windowType').value = win;
      ed.setTool(t as Parameters<Editor['setTool']>[0]);
    };
    if (id === 'select') tool('select');
    else if (id === 'build.room') tool('room');
    else if (id.startsWith('room.')) {
      ed.setRoomOption(id.slice(5) as RoomWallOption);
      tool('room');
    } else if (id === 'sel.split') ed.startSplit();
    else if (id === 'build.wall') tool('wall');
    else if (id.startsWith('stair.')) {
      ed.setStairType(id.slice(6) as StairTypeId);
      tool('stair');
    } else if (id === 'build.ladder') tool('ladder');
    else if (id === 'build.hole') tool('hole');
    else if (id.startsWith('roof.')) {
      ed.setRoofType(roofType(id.slice(5)).id);
      tool('roof');
    }
    else if (id.startsWith('obj.')) {
      ed.setObjectPreset(id.slice(4));
      tool('object');
    }
    else if (id.startsWith('climb.')) {
      // ON5: a climb piece or exterior feature
      ed.setClimbKind(id.slice(6) as ExtKind);
      tool('climb');
    }
    else if (id.startsWith('light.')) {
      // ON6: a fitting, or Switch
      ed.setLampFit(id.slice(6));
      tool('lamp');
    }
    else if (id.startsWith('security.')) {
      // ON12: a camera, reader, keypad, motion sensor or beam
      ed.security.setKind(id.slice(9) as SecTool);
      tool('security');
    }
    else if (id.startsWith('mission.')) {
      // ON8: the Guard tool or a mission marker
      ed.mission.setKind(id.slice(8) as MissionKind);
      tool('mission');
    } else if (id === 'sel.path' || id === 'sel.patrol' || id === 'sel.alone' || id === 'sel.requires' || id === 'sel.unlocks') {
      const s = ed.selectedElem();
      if (!s) return;
      const p = this.point();
      if (id === 'sel.path') ed.mission.startPath(s.id);
      else if (id === 'sel.patrol') ed.mission.togglePatrol(s.id);
      else if (id === 'sel.alone') ed.mission.markAlone(s.id, p?.[0] ?? 0, p?.[1] ?? 0);
      else ed.mission.startLink(s.id, id === 'sel.requires' ? 'requires' : 'unlocks');
    }
    else if (id === 'sel.aim') this.startAim();
    else if (id === 'sel.shot') ed.previewShot();
    else if (id === 'guard.view') tool('guard');
    else if (id === 'sel.circuit') this.editCard('circuit');
    else if (id === 'sel.addLamps') {
      const s = ed.selectedElem();
      if (s?.coll === 'circuits') ed.addLampsTo(s.id);
    }
    else if (id.startsWith('preset.')) {
      // ON11: the Stamp tool with that preset
      this.ed.stamp.set(id.slice(7));
      tool('stamp');
    }
    else if (id === 'sel.savePreset') this.openSavePreset();
    else if (id === 'mine.rename') this.openPresetRename();
    else if (id === 'mine.delete') void this.deletePreset();
    else if (id === 'sel.finish') this.editCard('finish')
    else if (id === 'sel.fit') ed.fitSelected();
    else if (id === 'sel.turnClimb') ed.turnStairClimb();
    else if (id === 'sel.rename') this.openRename();
    else if (id === 'build.window') tool('window', undefined, 'window');
    else if (id.startsWith('window.')) tool('window', undefined, id.slice(7));
    else if (id.startsWith('door.')) tool('door', id.slice(5));
    else if (id === 'build.measure') this.startMeasure();
    else if (id === 'build.paste') this.paste(false);
    else if (id === 'build.pasteUp') this.paste(true);
    else if (id === 'sel.move') this.grabWhole();
    else if (id === 'sel.props') this.enterDrawer();
    else if (id === 'sel.closeGap') ed.closeGapSelected();
    else if (id === 'sel.dup') ed.duplicate();
    else if (id === 'sel.del') ed.deleteSelected();
    else if (id === 'sel.rotate') this.rotate();
    else if (id === 'sel.copy') this.copy();
    else if (id === 'sel.copyUp') this.copyUp();
    else if (id === 'sel.type') this.editCard('type');
  }

  /** D-pad left / right with a tool and nothing grabbed: the door type or the room's walls option. */
  private toolVariant(dir: 1 | -1): void {
    const ed = this.ed;
    if (ed.tool === 'door') {
      const doors = familyTypes('door');
      const sel = $<HTMLSelectElement>('doorType');
      const next = doors[(Math.max(0, doors.indexOf(sel.value)) + dir + doors.length) % doors.length]!;
      sel.value = next;
      ed.status(`Door type: ${DOOR_NAMES[next] ?? next}`);
    } else if (ed.tool === 'window') {
      const wins = familyTypes('window');
      const sel = $<HTMLSelectElement>('windowType');
      const next = wins[(Math.max(0, wins.indexOf(sel.value)) + dir + wins.length) % wins.length]!;
      sel.value = next;
      ed.status(`Window type: ${DOOR_NAMES[next] ?? next}`);
    } else if (ed.tool === 'room') {
      const i = ROOM_OPTIONS.findIndex((o) => o.id === ed.roomOption);
      const o = ROOM_OPTIONS[(i + dir + ROOM_OPTIONS.length) % ROOM_OPTIONS.length]!;
      ed.setRoomOption(o.id);
      ed.status(`Room: ${o.name}`);
    } else if (ed.tool === 'stair') {
      const i = STAIR_TYPES.findIndex((t) => t.id === ed.stairTypeId);
      const t = STAIR_TYPES[(i + dir + STAIR_TYPES.length) % STAIR_TYPES.length]!;
      ed.setStairType(t.id);
      ed.status(`Stair: ${t.name}`);
    } else if (ed.tool === 'hole') {
      const i = HOLE_KINDS.indexOf(ed.holeKind as (typeof HOLE_KINDS)[number]);
      const k = HOLE_KINDS[(i + dir + HOLE_KINDS.length) % HOLE_KINDS.length]!;
      ed.setHoleKind(k);
      ed.status(`Floor hole: ${HOLE_NAMES[k] ?? k}`);
    } else if (ed.tool === 'object') {
      const ps = groupPresets(ed.objPreset.group);
      const i = ps.findIndex((q) => q.id === ed.objPresetId);
      const p = ps[(i + dir + ps.length) % ps.length]!;
      ed.setObjectPreset(p.id);
      ed.status(`Object: ${p.name}`);
    } else if (ed.tool === 'climb') {
      const i = CLIMB_PIECES.findIndex((q) => q.id === ed.climbKind);
      const q = CLIMB_PIECES[(i + dir + CLIMB_PIECES.length) % CLIMB_PIECES.length]!;
      ed.setClimbKind(q.id);
      ed.status(`Climb: ${q.name}`);
    } else if (ed.tool === 'security') {
      // ON12: the next device of the Security tab
      ed.status(`Security: ${ed.security.stepKind(dir)}`);
    } else if (ed.tool === 'mission') {
      // ON8: the Guard tool's role (the mission brief's roster)
      if (ed.mission.kind === 'guard' && !ed.mission.path) ed.status(`Guard: ${ed.mission.stepRole(dir)}`);
    } else if (ed.tool === 'lamp') {
      // ON6: the next fitting in the group (Switch stays Switch)
      const f = ed.fitting;
      if (!f) return;
      const fs = groupFittings(f.group);
      const q = fs[(fs.findIndex((x) => x.id === f.id) + dir + fs.length) % fs.length]!;
      ed.setLampFit(q.id);
      ed.status(`Light: ${q.name}`);
    } else if (ed.tool === 'stamp') {
      const p = ed.stamp.step(dir);
      if (p) ed.status(`Stamp: ${p.name}`);
    } else if (ed.tool === 'roof') {
      const i = ROOF_TYPES.findIndex((t) => t.id === ed.roofTypeId);
      const t = ROOF_TYPES[(i + dir + ROOF_TYPES.length) % ROOF_TYPES.length]!;
      ed.setRoofType(t.id);
      ed.status(`Roof: ${t.name}`);
    }
  }

  // ---------- the selection card on the D-pad (ON0a) ----------
  /** The rooms and the wall an opening's side settings need (ON9). */
  private cardCtx(s: { coll: string; e: Elem }): { rooms: Room[]; wall?: Wall } {
    const rooms = this.ed.model.list('rooms') as Room[];
    return s.coll === 'openings' ? { rooms, wall: this.ed.model.get<Wall>('walls', (s.e as Opening).wall) } : { rooms };
  }

  /** Lights a card row by id and starts editing (Selected > Change type lights Type). */
  editCard(row: string): void {
    const s = this.ed.selectedElem();
    if (!s) return;
    const i = cardRows(s.coll, s.e, this.cardCtx(s)).findIndex((r) => r.id === row);
    this.cardRow = Math.max(0, i);
    this.cardEditing = true;
    this.ed.updateHint();
  }

  /** One frame with something selected, no tool and nothing grabbed: the D-pad (and the stick while editing) works the card. */
  private cardFrame(now: number): void {
    const s = this.ed.selectedElem();
    if (!s) return;
    const rows = cardRows(s.coll, s.e, this.cardCtx(s));
    const n = this.nav(now, this.cardEditing);
    if (!n.x && !n.y) return;
    if (!this.cardEditing) {
      this.cardEditing = true;
      this.ed.updateHint();
    }
    if (n.y) this.cardRow = (this.cardRow + n.y + rows.length) % rows.length;
    const row = rows[Math.min(this.cardRow, rows.length - 1)];
    if (n.x && row) this.stepCardRow(row.id, n.x as 1 | -1, now);
  }

  /** One step of a card row, committed; quick steps on the same row join one undo step. */
  private stepCardRow(row: string, dir: 1 | -1, now: number): void {
    const ed = this.ed;
    const s = ed.selectedElem();
    if (!s) return;
    const wall = s.coll === 'openings' ? ed.model.get<Wall>('walls', (s.e as Opening).wall) : undefined;
    let after = stepCard(s.coll, s.e, row, dir, { step: ed.grid, wallLen: wall ? wallLen(wall) : undefined, levels: ed.model.data.levels, data: ed.model.data, dot: this.point() ?? undefined, ...this.cardCtx(s) });
    if (!after) {
      if (row === 'name') return ed.status('A opens the name list');
      this.rumble('error');
      return ed.status('At its limit');
    }
    const merge = { key: `${s.coll}:${s.id}|${row}`, at: now, within: CARD_MERGE_S };
    if (s.coll === 'rooms' && (row === 'width' || row === 'depth')) return ed.commitRoom(s.id, (after as Room).rect, merge);
    if (s.coll === 'openings') after = withBetween(ed.model, after as Opening);
    // ON8: a guard's kind sets its walk speed: the loop's time again
    if (s.coll === 'guards') after = ed.mission.recycle(after);
    ed.commit([{ coll: s.coll, id: s.id, before: s.e, after }], merge);
    ed.renderPanel();
  }

  /** A on the card's Name row: the name list and the on-screen keyboard. */
  private openNames(): void {
    const ed = this.ed;
    const s = ed.selectedElem();
    if (!s) return;
    const cur = typeof s.e.name === 'string' ? s.e.name : '';
    const what = { rooms: 'Room', walls: 'Wall', openings: 'Opening', stairs: 'Stair', ladders: 'Ladder', voids: 'Floor hole', roofs: 'Roof', levels: 'Level', buildings: 'Building', objects: 'Object', exterior: 'Climb piece', lamps: 'Lamp', circuits: 'Switch', guards: 'Guard', objectives: 'Objective', hides: 'Hide', checkpoints: 'Checkpoint', spawns: 'Insertion', extraction: 'Extraction', devices: 'Device', ceilings: 'Ceiling', crawls: 'Crawl space' }[s.coll];
    this.latchSticks();
    this.names.open(`${what} name`, nameList(ed.model.list(s.coll)), cur, (name) => {
      this.latchSticks();
      ed.updateHint();
      if (name === null || name === cur) return;
      const after = clone(s.e) as Elem & Record<string, unknown>;
      if (name) after.name = name;
      else delete after.name;
      ed.commit([{ coll: s.coll, id: s.id, before: s.e, after }]);
      ed.renderPanel();
    });
    ed.updateHint();
  }

  /**
   * A on the card's Id row, or Selected > Rename id (ON2 decision 10): the keyboard (capitals kept) with the id; Done
   * renames it and every reference in one edit. A taken or empty id is refused with a rumble.
   */
  openRename(): void {
    const ed = this.ed;
    const s = ed.selectedElem();
    if (!s) return;
    this.latchSticks();
    this.names.open(`Rename ${s.id}`, [], s.id, (id) => {
      this.latchSticks();
      ed.updateHint();
      if (id === null || id === s.id) return;
      if (!ed.renameSelected(id)) this.rumble('error');
      ed.renderPanel();
    }, true);
    ed.updateHint();
  }

  // ---------- every frame ----------
  /** After the walk test, buttons still held from the game are read but do nothing until all are released. */
  private settling = false;

  private frame(): void {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0, now - (this.lastNow || now)));
    this.lastNow = now;
    // the game has the pad while its walk test is easing in or playing: no read here, so a press is never seen twice
    if (this.ed.walk.blocking) {
      this.settling = true;
      return;
    }
    const gp = this.gamepad();
    if (this.settling) {
      if (gp) this.st.update({ buttons: gp.buttons.map((b) => b.value), axes: gp.axes }, now);
      if (gp && gp.buttons.some((b) => b.value > 0.5)) return;
      this.settling = false;
    }
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
    // a new selection starts the card at its first row, not editing
    const selKey = this.ed.selected ?? '';
    if (selKey !== this.cardSel) {
      this.cardSel = selKey;
      this.cardRow = 0;
      this.cardEditing = false;
    }
    if (this.menu.isOpen) this.renderMenu();
    if (!gp) return this.followDrag();
    const st = this.st;
    if ($('ask').classList.contains('hidden') === false) {
      const bs = $('ask').querySelectorAll<HTMLButtonElement>('button');
      if (st.pressed(PAD.A)) bs[0]?.click();
      else if (st.pressed(PAD.B)) bs[1]?.click();
      return;
    }
    if (this.stickLatch && !st.ls.x && !st.ls.y && !st.rs.x && !st.rs.y) this.stickLatch = false;
    // the hub: nothing else reads the pad while it is open
    if (this.hub.isOpen) return this.hub.frame(st, this.nav(now, true), dt);
    if (st.pressed(PAD.START)) return this.hub.open();
    if (this.names.isOpen) {
      const n = this.nav(now, true);
      this.scroll(this.names.body, dt);
      return this.names.frame(n.x, n.y, st.pressed(PAD.A), st.pressed(PAD.B));
    }
    if (this.ed.find.isOpen) {
      const n = this.nav(now, true);
      return this.ed.find.frame(n.x, n.y, st.pressed(PAD.A), st.pressed(PAD.B), st.pressed(PAD.X), st.pressed(PAD.Y));
    }
    if (this.menu.isOpen) return this.menuFrame(now, dt);
    if (this.aim) return this.aimFrame(dt);
    if (this.devAim) return this.devAimFrame(dt);
    if (c.walking) return this.walkFrame();
    if (st.pressed(PAD.Y) && !this.ed.drag && !this.ed.groupDrag) return this.toggleMenu();
    if (st.viewTap === 'tap') this.topDown();
    else if (st.viewTap === 'hold') this.ed.run('layout');
    if (this.focus === 'drawer' && !this.ed.prefs.drawer) this.setFocus('3d');
    if (this.focus === 'drawer') return this.drawerFrame(now, dt);
    const plan = this.ed.prefs.layout === 'plan';
    const zoom = st.rt - st.lt;
    const fine = st.down(PAD.LB);
    if (fine !== this.lbWas) {
      this.lbWas = fine;
      this.ed.updateHint();
    }
    this.magnetFrame(dt, fine);
    // ON0b: raw sticks go to the orbit camera, which applies the dead zone, the curve and the ease (orbit.ts);
    // LB + right stick up / down raises or lowers the camera instead of tilting
    const o = c.orbit;
    o.tune = { dead: this.settings.deadZone, smoothing: this.settings.smoothing, pan: this.settings.stickSpeed, orbit: this.settings.orbitSpeed };
    const ry = st.rawR.y;
    const tilt = fine ? 0 : this.settings.invertTilt ? ry : -ry;
    const rise = fine ? -ry : 0;
    const panScale = this.magnet ? MAGNET.PAN_SLOW : 1;
    // in Plan only the triggers zoom the plan, not the 3D camera
    // ON7: the guard view tester: the right stick's left / right turns the last eye (90 degrees a second), not the camera
    const turnEye = this.ed.tool === 'guard' && this.ed.lights.eyes.length > 0 && Math.abs(st.rawR.x) > 0.2;
    if (turnEye) this.ed.lights.turnLastEye(st.rawR.x * 90 * dt);
    // ON8: path editing: RB held, the right stick aims the last stop (the way the stick points, from the camera's view)
    const aimStop = !!this.ed.mission.path && st.down(PAD.RB) && st.rawR.x * st.rawR.x + st.rawR.y * st.rawR.y > 0.36;
    if (aimStop) {
      const yaw = plan ? 0 : this.ed.controls.yaw;
      const deg = ((yaw + Math.atan2(st.rawR.x, -st.rawR.y)) * 180) / Math.PI;
      this.stopAimed = true;
      this.ed.mission.turnFace(Math.round(deg / 5) * 5);
    }
    if (this.cardEditing) c.orbitIn = { panX: 0, panY: 0, orbitX: st.rawR.x, tiltY: tilt, zoom: plan ? 0 : zoom, precision: fine, rise };
    else if (turnEye || aimStop || (this.ed.mission.path && st.down(PAD.RB))) c.orbitIn = { panX: st.rawL.x, panY: -st.rawL.y, orbitX: 0, tiltY: 0, zoom: plan ? 0 : zoom, precision: fine, rise: 0, panScale };
    else if (!this.stickLatch) c.orbitIn = { panX: st.rawL.x, panY: -st.rawL.y, orbitX: st.rawR.x, tiltY: tilt, zoom: plan ? 0 : zoom, precision: fine, rise, panScale };
    else c.orbitIn = { ...c.orbitIn, zoom: plan ? 0 : zoom, precision: fine };
    // ON3: a set being moved follows the dot (A drops, B puts back); A held and moved draws a box
    if (this.ed.groupDrag?.source === 'pad') return this.groupFrame();
    if (this.boxFrom) this.boxFrame();
    if (st.pressed(PAD.RS)) this.cycleDisplay();
    if (!this.ed.drag) {
      // L3 tap: quick walk (running); L3 held 0.6 s: the walk test as the player (ON0b decision 4)
      if (st.l3Tap === 'tap') return this.ed.quickWalk();
      if (st.l3Tap === 'hold') return void this.ed.gameWalk();
      // ON8: path editing: X (on press) removes the last stop, RB tap turns it 45 degrees (not after aiming with RB held)
      if (this.ed.mission.path) {
        if (st.pressed(PAD.X)) this.ed.mission.removeLast();
        if (st.rbTap === 'tap' && !this.stopAimed) this.ed.mission.turnFace();
        if (!st.down(PAD.RB)) this.stopAimed = false;
      } else if (st.xTap === 'tap') this.ed.undo();
      else if (st.xTap === 'hold') this.ed.redo();
      if (this.ed.mission.path) {
        /* (RB is the stop's facing) */
      } else if (st.rbTap === 'tap') {
        if (this.ed.splitting) this.ed.splitTurn();
        else if (this.ed.tool === 'object' || this.ed.tool === 'stamp' || this.ed.tool === 'lamp' || this.ed.tool === 'security') this.ed.turnObjectNow();
        else this.ed.frameSelected();
      }
    } else if (this.ed.chaining && st.pressed(PAD.X)) this.ed.chainRemoveLast(); // on press: a slow frame never turns it into a hold
    else if (st.rbTap === 'tap') this.turnGrab();
    if (this.cardEditing && st.pressed(PAD.B)) {
      this.cardEditing = false;
      this.ed.updateHint();
    } else if (this.cardEditing && st.pressed(PAD.A)) {
      const s = this.ed.selectedElem();
      const rowId = s ? cardRows(s.coll, s.e, this.cardCtx(s))[this.cardRow]?.id : undefined;
      if (rowId === 'name') this.openNames();
      else if (rowId === 'id') this.openRename();
      else {
        this.cardEditing = false;
        this.ed.updateHint();
      }
    } else if (st.pressed(PAD.B)) this.cancel();
    else if (st.pressed(PAD.A)) this.primary();
    this.dpad(now);
    this.followDrag();
    const kz = plan ? Math.exp(Math.sign(zoom) * zoom * zoom * ORBIT.ZOOM_RATE * (fine ? ORBIT.PRECISION : 1) * dt) : 1;
    if (this.device === 'pad' && c.mode === 'orbit' && (this.ed.prefs.layout !== '3d' || this.ed.isMinimap())) this.ed.planFollow(c.orbit.s.tx, c.orbit.s.tz, kz);
  }

  /** ON8: RB held and the right stick aimed the last stop (the RB release is then no 45 degree turn). */
  private stopAimed = false;

  /** ON6: Selected > Aim on a flood or twin spot: the lamp being aimed, its aim as it was, and the aim now. */
  private aim: { id: string; before: Lamp; yaw: number; pitch: number } | null = null;
  /** ON12: Selected > Aim on a camera or motion sensor: the device, its record as it was, and its yaw now. */
  private devAim: { id: string; before: SecDevice; yaw: number } | null = null;

  private startAim(): void {
    const s = this.ed.selectedElem();
    if (s?.coll === 'devices' && typeof (s.e as unknown as SecDevice).facing === 'number') {
      const e = clone(s.e) as unknown as SecDevice;
      this.devAim = { id: s.id, before: e, yaw: e.facing as number };
      this.latchSticks();
      this.ed.status(`Aim ${s.id}: the right stick turns it, A sets, B puts it back`);
      return this.ed.updateHint();
    }
    const l = s?.coll === 'lamps' ? (clone(s.e) as Lamp) : null;
    if (!s || !l?.aim) return this.ed.status('Select a floodlight or a twin spot to aim it');
    this.aim = { id: s.id, before: l, yaw: l.aim[0], pitch: l.aim[1] };
    this.latchSticks();
    this.ed.status(`Aim ${l.id}: the right stick turns and tips it, A sets, B puts it back`);
    this.ed.updateHint();
  }

  /** The right stick turns (left / right, 90 degrees a second) and tips (up / down, 45) the aim, previewed; A sets it, B puts it back. */
  private aimFrame(dt: number): void {
    const st = this.st;
    const a = this.aim!;
    const ed = this.ed;
    ed.controls.orbitIn = { panX: 0, panY: 0, orbitX: 0, tiltY: 0, zoom: 0, precision: false, rise: 0 };
    if (st.pressed(PAD.B)) {
      ed.model.preview('lamps', a.before as Elem);
      this.aim = null;
      ed.status(`Aim of ${a.id} put back`);
      return ed.updateHint();
    }
    if (st.pressed(PAD.A)) {
      const after = ed.model.snapshot<Lamp>('lamps', a.id);
      this.aim = null;
      if (after?.aim && JSON.stringify(after) !== JSON.stringify(a.before)) ed.commitText(`Aimed ${fittingOf(after.fixture)?.name ?? 'lamp'} (${a.id}) to ${after.aim[0]} degrees, ${after.aim[1]} down`, [{ coll: 'lamps', id: a.id, before: a.before as Elem, after: after as Elem }]);
      ed.status(after?.aim ? `${a.id} aimed: turn ${after.aim[0]} degrees, ${after.aim[1]} down` : 'Aim set');
      return ed.updateHint();
    }
    const dead = 0.2;
    const x = Math.abs(st.rawR.x) > dead ? st.rawR.x : 0;
    const y = Math.abs(st.rawR.y) > dead ? st.rawR.y : 0;
    if (!x && !y) return;
    a.yaw = (((a.yaw + x * 90 * dt) % 360) + 360) % 360;
    a.pitch = Math.min(90, Math.max(-90, a.pitch + y * 45 * dt));
    const aim: [number, number] = [Math.round(a.yaw) % 360, Math.round(a.pitch)];
    const cur = ed.model.get<Lamp>('lamps', a.id);
    if (cur?.aim && cur.aim[0] === aim[0] && cur.aim[1] === aim[1]) return;
    ed.model.preview('lamps', withParams({ ...clone(a.before), aim }) as Elem);
    ed.status(`Aim ${a.id}: turn ${aim[0]} degrees, ${aim[1]} down (beam ${aimDir(aim).map((v) => fmt(v)).join(', ')}); A sets, B puts it back`);
  }

  /** ON12: the right stick turns the camera or sensor (90 degrees a second, 5 degree steps), previewed; A sets it, B puts it back. */
  private devAimFrame(dt: number): void {
    const st = this.st;
    const a = this.devAim!;
    const ed = this.ed;
    ed.controls.orbitIn = { panX: 0, panY: 0, orbitX: 0, tiltY: 0, zoom: 0, precision: false, rise: 0 };
    if (st.pressed(PAD.B)) {
      ed.model.preview('devices', a.before as unknown as Elem);
      this.devAim = null;
      ed.status(`Aim of ${a.id} put back`);
      return ed.updateHint();
    }
    if (st.pressed(PAD.A)) {
      const after = ed.model.snapshot('devices', a.id) as unknown as SecDevice | null;
      this.devAim = null;
      if (after && JSON.stringify(after) !== JSON.stringify(a.before)) ed.commitText(`Aimed ${a.id} to ${String(after.facing)} degrees`, [{ coll: 'devices', id: a.id, before: a.before as unknown as Elem, after: after as unknown as Elem }]);
      ed.status(`${a.id} faces ${String(after?.facing ?? '')} degrees`);
      return ed.updateHint();
    }
    const x = Math.abs(st.rawR.x) > 0.2 ? st.rawR.x : 0;
    if (!x) return;
    a.yaw = (((a.yaw + x * 90 * dt) % 360) + 360) % 360;
    const yaw = Math.round(a.yaw / 5) * 5;
    const cur = ed.model.get('devices', a.id) as unknown as SecDevice | undefined;
    if (cur?.facing === yaw % 360) return;
    ed.model.preview('devices', ed.security.aimed(a.before, yaw) as unknown as Elem);
    ed.status(`Aim ${a.id}: ${yaw % 360} degrees; A sets, B puts it back`);
  }

  /** Quick walk (L3 tap from building): sticks walk and look, it runs, L3 toggles a slow walk, L3 held starts the walk test, B comes back; the dot, tool bar and card hide; A does nothing. */
  private walkFrame(): void {
    const st = this.st;
    const c = this.ed.controls;
    if (this.ed.quickWalking && st.pressed(PAD.B)) return this.ed.quickWalk();
    if (st.l3Tap === 'tap') {
      c.padRun = !c.padRun;
      this.ed.updateHint();
    } else if (st.l3Tap === 'hold' && this.ed.quickWalking) return void this.ed.gameWalk();
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
    const key = `${ed.view.level}|${ed.model.history.length}|${ed.model.dirty}|${ed.chain.walls.length}`;
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
    // ON1 decision 7: room edges pull within SNAP.EDGE (after the wall lines, so a wall on the edge wins)
    for (const r of ed.model.list('rooms') as Room[]) {
      if (r.level !== lv) continue;
      const owner = keyOf('rooms', r.id);
      const [x0, z0, x1, z1] = r.rect;
      const sides: [string, Pt, Pt][] = [['W', [x0, z0], [x0, z1]], ['E', [x1, z0], [x1, z1]], ['S', [x0, z0], [x1, z0]], ['N', [x0, z1], [x1, z1]]];
      for (const [e, a, b] of sides) out.push({ kind: 'line', key: `edge:${r.id}:${e}`, label: 'Room edge', owner, a, b, pull: SNAP.EDGE });
    }
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
    this.setDisplay(DISPLAYS[(i + 1) % DISPLAYS.length]![0]);
  }

  private setDisplay(p: (typeof DISPLAYS)[number][0]): void {
    this.ed.setPreset(p);
    this.ed.status(`Levels shown: ${DISPLAYS.find((d) => d[0] === p)![1]}`);
    this.stripAt = 0;
    if (this.hub.isOpen) this.hub.render();
  }

  /** The pad's point on the editing level: the magnet's snap point exactly while snapped, else the dot on the grid. */
  point(planeY?: number): Pt | null {
    // ON0b: LB no longer means a fine grid (it keeps magnet off and a slower camera); the grid is Settings > Grid
    const fine = this.st.down(PAD.LB);
    const g = this.ed.grid;
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
    if (s.coll === 'rooms' || s.coll === 'stairs' || s.coll === 'voids' || s.coll === 'roofs') return { kind: 'rect', rect: (s.e as Room).rect };
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
  /** The dot on the grid without the magnet (box select and moving a set use it). */
  private rawDot(): Pt | null {
    const c = this.ed.controls;
    const g = this.ed.grid;
    if (c.mode === 'orbit') return [snap(c.orbit.s.tx, g), snap(c.orbit.s.tz, g)];
    return this.point();
  }

  /** ON3: one frame while a set is moved with the pad. */
  private groupFrame(): void {
    const p = this.rawDot();
    if (p) this.ed.moveGroup(p[0], p[1]);
    if (this.st.pressed(PAD.A)) {
      this.ed.endGroupDrag(false);
      this.rumble('drop');
    } else if (this.st.pressed(PAD.B)) this.ed.endGroupDrag(true);
    this.updatePointers();
  }

  /** ON3: while A is held after a press on the floor, the box follows the dot; letting go picks what lies inside. */
  private boxFrame(): void {
    const ed = this.ed;
    if (ed.drag || ed.groupDrag || ed.tool !== 'select' || !this.boxFrom) {
      this.boxFrom = this.boxTo = null;
      return;
    }
    const p = this.rawDot();
    const from = this.boxFrom;
    const big = (q: Pt | null): boolean => !!q && (Math.abs(q[0] - from[0]) >= 5 * ed.grid - 1e-9 || Math.abs(q[1] - from[1]) >= 5 * ed.grid - 1e-9);
    if (this.st.down(PAD.A)) {
      if (p && (this.boxTo || big(p))) this.boxTo = p;
      return;
    }
    const to = this.boxTo;
    this.boxFrom = this.boxTo = null;
    if (!to || !big(to)) return;
    const keys = boxPick(ed.model.data, ed.view.level, boxOf(from, to));
    if (!keys.length) {
      this.rumble('error');
      return ed.status('Nothing lies wholly inside the box on this level');
    }
    ed.setGroup(keys);
    this.rumble('drop');
  }

  grabPartNow(): GrabPart | null {
    if (this.ed.tool !== 'select' || this.ed.drag || this.measureFrom) return null;
    const g = this.grabShape();
    const p = this.dotRaw();
    return g && p ? grabPart(g, p[0], p[1]) : null;
  }

  private primary(): void {
    const ed = this.ed;
    if (this.measureFrom) return this.finishMeasure();
    if (ed.splitting) {
      const p = this.point();
      if (p && !ed.splitAt(p[0], p[1])) this.rumble('error');
      else if (p) this.rumble('drop');
      return;
    }
    if (ed.drag) {
      // drawing a wall: A ends this one and starts the next (ON1 wall chains)
      if (ed.chaining) ed.chainNext();
      else ed.endDrag(false);
      this.offset = [0, 0];
      this.turns = 0;
      this.rumble('drop');
      return;
    }
    const p = this.point();
    if (ed.tool !== 'select') {
      if (!p) return;
      const before = ed.model.history.length;
      ed.toolDown(p[0], p[1], 0, 0, 'pad', this.st.down(PAD.LB));
      // (toolDown may have started a drag; the narrowing above does not know)
      const nd = ed.drag as { moved: boolean } | null;
      if (nd) nd.moved = true;
      else if (ed.model.history.length === before && !ed.stairDraw) this.rumble('error');
      this.offset = [0, 0];
      return;
    }
    // ON3: A on a member of the set grabs the whole set
    if (ed.group.length) {
      const t = this.target();
      const raw = this.rawDot();
      if (t?.key && ed.group.includes(t.key) && raw) return ed.startGroupDrag(raw, 'pad');
    }
    // edge-aware grab: the part the dot names (decision 13); outside the selection, A selects as before
    const s = ed.selectedElem();
    const part = this.grabPartNow();
    if (s && part && p) return this.grab(s.coll, s.id, part.handle, p, ed.viewFloor(), part.words);
    const t = this.target();
    // ON3: A held and the dot moved draws a box (it replaces the selection when A is let go)
    this.boxFrom = this.rawDot();
    this.boxTo = null;
    if (!t?.key) return;
    if (t.key !== ed.selected) return ed.select(t.key);
    // a selected ladder: A on it grabs it whole
    const k = parseKey(t.key)!;
    if (p) this.grab(k.coll, k.id, null, p, ed.viewFloor(), 'Move');
  }

  /** Selected > Move: grab it whole at the dot, as A in the middle. */
  private grabWhole(): void {
    if (this.ed.group.length) {
      const r = this.rawDot();
      if (r) this.ed.startGroupDrag(r, 'pad');
      return;
    }
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
    // ON2: aiming a stair, the proposal follows the dot
    if (!d && this.ed.stairDraw?.phase === 'aim') {
      const p = this.point();
      if (p) this.ed.aimStair(p[0], p[1]);
    }
    if (!d || d.source !== 'pad') return this.updatePointers();
    const p = this.point(d.planeY);
    if (!p) return;
    // LB held or a D-pad nudge: no smart snapping (a nudge lands exactly where it was put)
    const exact = this.st.down(PAD.LB) || this.offset[0] !== 0 || this.offset[1] !== 0;
    this.ed.moveDrag(p[0] + this.offset[0], p[1] + this.offset[1], exact, this.turns ? (e) => this.turned(d.coll, e, p[0], p[1]) : undefined);
    this.updatePointers();
  }

  private cancel(): void {
    const ed = this.ed;
    this.boxFrom = null;
    if (ed.splitting) return ed.cancelSplit();
    if (ed.stairDraw) return ed.cancelStair();
    if (this.measureFrom) {
      this.measureFrom = null;
      return ed.status('Measure cancelled');
    }
    if (ed.drag) ed.endDrag(true);
    else if (ed.mission.path) ed.mission.endPath();
    else if (ed.mission.link) ed.mission.endLink();
    else if (ed.tool === 'guard' && ed.lights.removeEye()) ed.status(`Guard eye removed (${ed.lights.eyes.length} left); B again leaves the guard view`);
    else if (ed.tool !== 'select') ed.setTool('select');
    else ed.select(null);
    this.offset = [0, 0];
    this.turns = 0;
  }

  private dpad(now: number): void {
    const st = this.st;
    const ed = this.ed;
    const dirs: [number, Pt][] = [[PAD.UP, [0, 1]], [PAD.DOWN, [0, -1]], [PAD.RIGHT, [1, 0]], [PAD.LEFT, [-1, 0]]];
    if (ed.drag?.source === 'pad') {
      const g = ed.grid;
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
    if (ed.drag) return;
    // ON8: path editing: up / down the last stop's wait, left / right the level the next stop goes on
    if (ed.mission.path) {
      const n = this.nav(now, false);
      if (n.y) ed.mission.stepWait(n.y < 0 ? 1 : -1);
      if (n.x) ed.stepLevel(n.x > 0 ? 1 : -1);
      return;
    }
    // something selected, no tool: the D-pad edits the selection card (ON0a decision 4)
    if (ed.tool === 'select' && ed.selected && !this.measureFrom && !ed.splitting) return this.cardFrame(now);
    // nothing selected: up / down change level; with a tool, left / right flip its type (decision 5)
    const n = this.nav(now, false);
    if (n.y) ed.stepLevel(n.y < 0 ? 1 : -1);
    if (n.x && ed.tool !== 'select') this.toolVariant(n.x as 1 | -1);
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

  private drawerFrame(now: number, dt: number): void {
    const st = this.st;
    const fields = [...$('panel').querySelectorAll<HTMLElement>('[data-k], button, [data-go]')];
    if (st.pressed(PAD.B)) return this.setFocus('3d');
    if (!fields.length) return;
    const n = this.nav(now, true);
    this.scroll($('panel'), dt);
    if (n.y) this.drawerIndex = (this.drawerIndex + n.y + fields.length) % fields.length;
    this.drawerIndex = Math.min(this.drawerIndex, fields.length - 1);
    focusField(fields, this.drawerIndex, $('panel'));
    const f = fields[this.drawerIndex]!;
    const step = n.x;
    const fine = st.down(PAD.LB);
    stepField(f, step, this.ed.grid, fine);
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
    // the tile menu covers the bottom half: the dot, tool bar and card wait above it; the card being edited hides the dot's words
    const menu = this.menuOpen;
    $('reticle').classList.toggle('hidden', !pad || this.focus !== '3d' || walk || menu);
    $('reticleText').classList.toggle('hidden', this.cardEditing);
    $('toolBar').classList.toggle('hidden', !pad || walk || menu);
    $('selCard').classList.toggle('hidden', !pad || walk || menu || !this.ed.selectedElem());
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
    this.layoutBar();
    const ed = this.ed;
    const doorName = slotDoorName($<HTMLSelectElement>('doorType').value);
    const winName = DOOR_NAMES[$<HTMLSelectElement>('windowType').value] ?? '';
    const roomName = ROOM_OPTIONS.find((o) => o.id === ed.roomOption)?.short ?? '';
    const s = ed.selectedElem();
    const key = `${this.barSlot()}|${doorName}|${winName}|${roomName}|${ed.stairTypeId}|${ed.holeKind}|${ed.roofTypeId}|${ed.objPresetId}|${ed.objYaw}|${ed.climbKind}|${ed.lampFit}|${ed.lampYaw}|${ed.tool === 'mission' ? ed.mission.barWords() : ed.tool === 'security' ? ed.security.barWords() : ''}|${ed.circuitEdit ?? ''}|${ed.selected ?? ''}|${ed.model.journal.length}|${ed.model.rev}|${ed.model.dirty}|${this.cardRow}|${this.cardEditing}|${ed.model.history.length}`;
    if (key === this.barKey) return;
    this.barKey = key;
    const slot = this.barSlot();
    // the active tool only (the Y menu picks tools); its type under it
    const name = BAR.find(([id]) => id === slot)?.[1] ?? slot;
    const sub = slot === 'door' ? doorName : slot === 'window' ? winName : slot === 'room' ? roomName : slot === 'stair' ? stairType(ed.stairTypeId).name : slot === 'hole' ? (HOLE_NAMES[ed.holeKind] ?? ed.holeKind) : slot === 'roof' ? roofType(ed.roofTypeId).name : slot === 'object' ? `${ed.objPreset.name}${ed.objYaw ? `, ${ed.objYaw} degrees` : ''}` : slot === 'climb' ? (pieceOf(ed.climbKind)?.name ?? '') : slot === 'mission' ? ed.mission.barWords() : slot === 'security' ? ed.security.barWords() : slot === 'lamp' ? (ed.lampFit === 'switch' ? (ed.circuitEdit ? `Switch ${ed.circuitEdit}: A adds lamps` : 'Switch') : `${ed.fitting?.name ?? ''}${ed.lampYaw ? `, ${ed.lampYaw} degrees` : ''}`) : '';
    $('toolBar').innerHTML = `<div class="slot on" data-slot="${slot}"><b>${name}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
    if (s) {
      const c = cardWords(s.coll, s.e);
      const lv = ed.model.data.levels.find((l) => l.id === ed.levelOf(s.coll, s.e));
      const rows = cardRows(s.coll, s.e, this.cardCtx(s));
      const lit = Math.min(this.cardRow, rows.length - 1);
      // not editing: the first row and the size; editing: every row, the lit one with its arrows
      // ON9: a long card (a door has up to 16 rows) shows a window of rows that follows the lit one
      const [w0, w1] = this.cardEditing ? cardWindow(rows.length, lit) : [0, 1];
      const shown = rows.slice(w0, w1);
      const more = (n: number, dir: string): string => (n > 0 ? `<div class="dim cmore">${dir} ${n} more</div>` : '');
      const body = (this.cardEditing ? more(w0, '&#9650;') : '') + shown
        .map((r, j) => {
          const i = j + w0;
          const on = this.cardEditing && i === lit;
          const v = r.kind === 'name' ? (on ? `${esc(r.value)} <small>(A)</small>` : esc(r.value)) : on ? `&#8249; ${esc(r.value)} &#8250;` : esc(r.value);
          return `<div class="crow${on ? ' on' : ''}" data-row="${r.id}"><span>${esc(r.label)}</span><b>${v}</b></div>`;
        })
        .join('') + (this.cardEditing ? more(rows.length - w1, '&#9660;') : '');
      // ON2: a stair says whether it fits ("Needs 1.4 m more length for 25 risers"; Selected > Fit)
      const fit = s.coll === 'stairs' ? stairFit(ed.model.data, s.e as Stair) : null;
      const fitLine = fit ? `<div class="${fit.ok ? 'dim' : 'bad'}" data-fit>${esc(fit.ok ? `Fits: ${fit.size?.risers ?? ''} risers` : fit.words.replace(/ \(the file says.*$/, ''))}</div>` : '';
      // ON10: a roof's ridge and whether the game lets the player stand on it; a flat roof against its roof level
      const rw = s.coll === 'roofs' ? roofWords(ed.model.data, s.e as Roof) : null;
      const roofLine = rw ? `<div class="${rw.steep ? 'bad' : 'dim'}" data-roof>${esc(rw.ridge)}</div>${rw.warn ? `<div class="bad">${esc(rw.warn)}</div>` : ''}` : '';
      // ON4: what an object does for the player (from the facts) and the aisle beside it
      const ob = s.coll === 'objects' ? (s.e as Obj) : null;
      const ai = ob ? ed.objectAisle(ob) : null;
      const objLine = ob ? `<div class="dim" data-badges>${esc(badgeWords(ob))}</div>${ai ? `<div class="${ai.ok ? 'dim' : 'bad'}" data-aisle>${esc(ai.words)}</div>` : ''}` : '';
      // ON5: what the player can do with a climb piece (the reach rules); a room's footstep loudness by its floor finish
      const extLine = s.coll === 'exterior' ? `<div class="dim" data-climb>${esc(pieceWords(ed.model.data, s.e as Ext))}</div>` : '';
      const finLine = s.coll === 'rooms' && finishOf((s.e as Room).finish) ? `<div class="dim" data-finish>${esc(loudWords((s.e as Room).finish))}</div>` : '';
      // ON6: a lamp's lumens, colour, beam, reach and circuit; a switch's lamps
      const lampLine = s.coll === 'lamps' ? `<div class="dim" data-lamp>${esc(lampWords(ed.model.data as LampData, s.e as Lamp))}</div>` : s.coll === 'circuits' ? `<div class="dim" data-lamp>${esc(circuitWords(s.e as Circuit))}</div>` : '';
      // ON8: a guard's loop (length, cycle, the first red leg), an objective's links, an insertion's number
      const missionLine = isMission(s.coll) ? `<div class="dim" data-mission>${esc(ed.mission.footWords(s.coll, s.e))}</div>` : '';
      // ON12: what a device does in the game (and which stage builds it); a security desk's feeds
      const secLine = s.coll === 'devices' ? `<div class="dim" data-security>${esc(ed.security.footWords(s.e as unknown as SecDevice))}</div>` : s.coll === 'objects' && (s.e as Obj).preset === 'security-desk' ? `<div class="dim" data-security>${esc(ed.security.deskWords(s.e as Obj))}</div>` : '';
      const foot = this.cardEditing ? '' : `<div>${esc(c.size)}</div>${fitLine}${roofLine}${objLine}${extLine}${finLine}${lampLine}${missionLine}${secLine}<div>Level ${esc(lv?.name ?? '')}</div>`;
      $('selCard').innerHTML = `<b>${esc(c.title)}</b> <small class="id">${esc(s.e.id)}</small>${body}${foot}`;
      $('selCard').classList.toggle('editing', this.cardEditing);
    }
    this.layoutBar();
  }

  /**
   * Keeps the tool bar clear of the selection card and the small plan (ED3-pad1): the bar centres in the width between
   * them; where that is too narrow the card rises above the bar, and if the bar still does not fit beside the small plan
   * it rises above that too. Bar and card carry the Large text zoom, so CSS lengths are divided by it.
   */
  private layoutBar(): void {
    const bar = $('toolBar');
    const card = $('selCard');
    bar.style.left = '';
    bar.style.transform = '';
    bar.style.bottom = '';
    card.style.bottom = '';
    bar.classList.remove('compact');
    if (!bar.offsetParent) return;
    const gap = 8;
    const stage = $('stage').getBoundingClientRect();
    let b = bar.getBoundingClientRect();
    const kb = b.width / Math.max(1, bar.offsetWidth) || 1;
    // the small plan (3D only) sits bottom left over the view; in Both or Plan the plan is its own pane
    const mini = this.ed.isMinimap() ? $('planWrap').getBoundingClientRect() : null;
    const miniBeside = mini && mini.width > 0 && mini.top < b.bottom && mini.bottom > b.top;
    const L = (miniBeside ? mini.right : stage.left) + gap;
    const cardOn = !!card.offsetParent;
    const c = cardOn ? card.getBoundingClientRect() : null;
    const place = (right: number): boolean => {
      if (b.width > right - L) return false;
      bar.style.left = `${(L - stage.left + (right - L - b.width) / 2) / kb}px`;
      bar.style.transform = 'none';
      return true;
    };
    const right = c ? c.left - gap : stage.right - gap;
    if (place(right)) return;
    // tighter slots before anything moves
    bar.classList.add('compact');
    b = bar.getBoundingClientRect();
    if (place(right)) return;
    if (c) {
      const kc = c.width / Math.max(1, card.offsetWidth) || 1;
      card.style.bottom = `${(stage.bottom - b.top + gap) / kc}px`;
    }
    if (place(stage.right - gap)) return;
    // narrower still: the bar goes above the small plan, centred
    if (miniBeside && mini) {
      bar.style.bottom = `${(stage.bottom - mini.top + gap) / kb}px`;
      if (c) {
        const kc = c.width / Math.max(1, card.offsetWidth) || 1;
        card.style.bottom = `${(stage.bottom - mini.top + gap + b.height + gap) / kc}px`;
      }
    }
  }

  private hintKey = '';
  private hintWords = '';
  /** The linked words for a room part, cached until the data or the part changes. */
  private linkedHintFor(id: string, handle: string | null): string {
    const key = `${id}|${handle}|${this.ed.model.history.length}|${this.ed.model.dirty}`;
    if (key !== this.hintKey) {
      this.hintKey = key;
      this.hintWords = linkedHint(this.ed.model.data, id, handle, this.ed.grid);
    }
    return this.hintWords;
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
    let text = p ? `x ${fmt(p[0])}, z ${fmt(p[1])}` : '';
    if (this.magnet) text += ` - ${this.magnet.label}`;
    let words = '';
    let bad = false;
    let key = '';
    const marks: Mark[] = [];
    const plan: PlanShape[] = [];
    const f = ed.viewFloor();
    const part = this.grabPartNow();
    const s = ed.selectedElem();
    let hover: Key | null = null;
    if (this.boxFrom && this.boxTo) {
      // ON3 box select: the box on the floor and the plan
      const b = boxOf(this.boxFrom, this.boxTo);
      const cs: Pt[] = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
      for (let i = 0; i < 4; i++) {
        marks.push(this.bar(cs[i]!, cs[(i + 1) % 4]!, f + 0.1, 0.2, 0.15, 'ghost'));
        plan.push({ kind: 'line', a: cs[i]!, b: cs[(i + 1) % 4]! });
      }
      words = `box ${fmt(b[2] - b[0])} x ${fmt(b[3] - b[1])} m: let go of A to select what is wholly inside`;
      key = `box|${b.join()}`;
    } else if (ed.groupDrag) {
      words = `moving ${groupWords(ed.group)} ${fmt(ed.groupDrag.dx)}, ${fmt(ed.groupDrag.dz)} m - A drops, B puts back`;
      key = `gd|${ed.groupDrag.dx}|${ed.groupDrag.dz}`;
    } else if (ed.splitting && p) {
      // Split: the line across the room through the dot (red where it is too close to an edge)
      const l = ed.splitLine(p[0], p[1]);
      if (l) {
        bad = !!l.why;
        words = l.why ?? `A: split here (${l.axis === 'x' ? 'north-south' : 'east-west'} line), RB turns it, B cancels`;
        key = `x|${l.axis}|${l.v}|${bad}`;
        marks.push(this.bar(l.a, l.b, f + 1.2, 2.4, 0.15, 'ghost'));
        plan.push({ kind: 'line', a: l.a, b: l.b });
      }
    } else if (this.measureFrom && p) {
      if (Number.isNaN(this.measureFrom[0])) words = 'A: first point';
      else {
        const [x0, z0] = this.measureFrom;
        const len = hyp2(p[0] - x0, p[1] - z0);
        words = `measuring ${fmt(len)} m`;
        key = `m|${x0},${z0},${p[0]},${p[1]}`;
        marks.push(this.bar([x0, z0], p, f + 0.05, 0.08, 0.08, 'ghost'));
        plan.push({ kind: 'line', a: [x0, z0], b: p });
      }
    } else if (ed.stairDraw) {
      // ON2: the stair proposal (the stair itself is previewed in 3D and on the plan); its words at the dot
      const sd = ed.stairDraw;
      bad = !sd.ok;
      words = sd.ok ? `${sd.words} - ${sd.phase === 'aim' ? 'A: show it' : 'A: accept, B: cancel'}` : sd.words;
      key = `st|${sd.phase}|${sd.words}`;
      const r = ed.model.get<Stair>('stairs', sd.id)?.rect;
      if (r) plan.push({ kind: 'line', a: [r[0], r[1]], b: [r[2], r[1]] }, { kind: 'line', a: [r[2], r[1]], b: [r[2], r[3]] }, { kind: 'line', a: [r[2], r[3]], b: [r[0], r[3]] }, { kind: 'line', a: [r[0], r[3]], b: [r[0], r[1]] });
      else plan.push({ kind: 'ring', p: sd.start });
    } else if (d?.source === 'pad') {
      const live = ed.liveNow();
      words = live.words;
      bad = !!live.bad;
      key = `d|${words}`;
      plan.push(...live.shapes);
    }
    else if (part && s) {
      words = `${part.words}${s.coll === 'rooms' && ed.wallsFollow ? this.linkedHintFor(s.id, part.handle) : ''} (A)`;
      key = `g|${ed.selected}|${part.handle}|${ed.model.history.length}`;
      this.partMarks(s.coll, s.e, part, f, marks, plan);
    } else if (ed.tool === 'stair' && p) {
      const to = levelAbove(ed.model.data, ed.view.level);
      bad = !to;
      words = to ? `A: start corner of a stair (${stairType(ed.stairTypeId).name}) to ${to.name}` : 'No level above: add one on the hub\'s Levels tab';
      key = `s|${p[0]},${p[1]}|${ed.stairTypeId}`;
      marks.push({ x: p[0], y: f + 0.75, z: p[1], sx: 0.2, sy: 1.5, sz: 0.2, dx: 1, dz: 0, look: bad ? 'bad' : 'ghost' });
      plan.push({ kind: 'ring', p });
    } else if (ed.tool === 'ladder' && p) {
      const r = proposeLadder(ed.model.data, ed.view.level, p, 'LD-GHOST', ed.grid, GHOST.REACH);
      if ('why' in r) {
        bad = true;
        words = r.why;
      } else {
        words = `A: ${r.words.charAt(0).toLowerCase()}${r.words.slice(1)}`;
        const a = r.ladder.at;
        const h = (ed.model.data.levels.find((l) => l.id === r.ladder.to)?.floor ?? 0) - (ed.model.data.levels.find((l) => l.id === r.ladder.from)?.floor ?? 0);
        const ew = r.ladder.facing === 'E' || r.ladder.facing === 'W';
        marks.push({ x: a[0], y: f + h / 2, z: a[1], sx: ew ? 0.08 : 0.5, sy: Math.max(0.5, h), sz: ew ? 0.5 : 0.08, dx: 1, dz: 0, look: 'ghost' });
        plan.push({ kind: 'ring', p: a });
      }
      key = `l|${p[0]},${p[1]}`;
      void climbWords;
    } else if (ed.tool === 'object' && p) {
      // ON4: the preset's ghost at the dot (backed onto a wall within reach); a wall-mounted one off a wall is red
      const pre = ed.objPreset;
      const g = ed.objectGhost(p[0], p[1]);
      if (!g) {
        words = `A: start a ${pre.name.toLowerCase()} here`;
        key = `s|${p[0]},${p[1]}|${pre.id}`;
        marks.push({ x: p[0], y: f + pre.y + pre.h / 2, z: p[1], sx: 0.2, sy: pre.h, sz: 0.2, dx: 1, dz: 0, look: 'ghost' });
        plan.push({ kind: 'ring', p });
      } else {
        bad = !!g.why;
        const r = g.rect;
        words = g.why ?? `A: place ${pre.name}${g.wall ? ` against ${g.wall}` : ''}; RB turns`;
        key = `ob|${r.join()}|${pre.id}|${bad}`;
        marks.push({ x: (r[0] + r[2]) / 2, y: f + pre.y + pre.h / 2, z: (r[1] + r[3]) / 2, sx: r[2] - r[0], sy: pre.h, sz: r[3] - r[1], dx: 1, dz: 0, look: bad ? 'bad' : 'ghost' });
        const cs: Pt[] = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
        for (let i = 0; i < 4; i++) plan.push({ kind: 'line', a: cs[i]!, b: cs[(i + 1) % 4]! });
      }
    } else if (ed.tool === 'security' && p && !ed.drag) {
      // ON12: the device A would place (on a wall face, under a ceiling, by a door), or why not
      const g = ed.security.ghost(p[0], p[1], f);
      words = g.words;
      bad = g.bad;
      key = `sec|${g.key}`;
      marks.push(...g.marks);
      plan.push(...g.plan);
    } else if (ed.tool === 'mission' && p) {
      // ON8: the guard, a stop (its leg from the last stop, red where there is no way), an objective to pick, a marker
      const g = ed.mission.ghost(p[0], p[1], f);
      words = g.words;
      bad = g.bad;
      key = `ms|${g.key}`;
      marks.push(...g.marks);
      plan.push(...g.plan);
    } else if (ed.tool === 'lamp' && p) {
      // ON6: the fitting's ghost at its mount height (red where it cannot go); Switch: the plate, or the lamp A adds
      const fl = f - ed.floor();
      if (ed.lampFit === 'switch') {
        const g = ed.switchGhost(p[0], p[1]);
        if (g.lamp) {
          const l = g.lamp;
          words = l.circuit === ed.circuitEdit ? `${l.id} is on ${ed.circuitEdit} already; B ends` : `A: put ${fittingOf(l.fixture)?.name ?? 'lamp'} (${l.id}) on switch ${ed.circuitEdit}`;
          key = `sl|${l.id}|${ed.circuitEdit}|${l.circuit}`;
          const lf = ed.floor(ed.levelOf('lamps', l));
          marks.push({ x: l.at[0], y: fl + lf + l.at[1], z: l.at[2], sx: 0.5, sy: 0.3, sz: 0.5, dx: 1, dz: 0, look: 'ghost' });
          plan.push({ kind: 'ring', p: [l.at[0], l.at[2]] });
        } else if (g.sw) {
          words = ed.circuitEdit ? `A: a new switch on ${g.sw.wall} (or A on a lamp for ${ed.circuitEdit}); B ends` : `A: a switch on ${g.sw.wall}`;
          key = `sw|${g.sw.at.join()}|${ed.circuitEdit ?? ''}`;
          marks.push({ x: g.sw.at[0], y: f + g.sw.at[1], z: g.sw.at[2], sx: 0.12, sy: 0.12, sz: 0.12, dx: 1, dz: 0, look: 'ghost' });
          plan.push({ kind: 'ring', p: [g.sw.at[0], g.sw.at[2]] });
        } else {
          bad = !ed.circuitEdit;
          words = ed.circuitEdit ? `Move onto a lamp to put it on ${ed.circuitEdit}; B ends` : (g.why ?? 'Move onto a wall face');
          key = `swb|${p[0]},${p[1]}|${ed.circuitEdit ?? ''}`;
          marks.push({ x: p[0], y: f + 1.2, z: p[1], sx: 0.12, sy: 0.12, sz: 0.12, dx: 1, dz: 0, look: bad ? 'bad' : 'ghost' });
          plan.push({ kind: 'ring', p });
        }
      } else {
        const fit = ed.fitting;
        const g = ed.lampGhost(p[0], p[1]);
        if (!g) {
          words = `A: start a ${(fit?.name ?? '').toLowerCase()} here`;
          key = `ls|${p[0]},${p[1]}|${ed.lampFit}`;
          marks.push({ x: p[0], y: f + 1.5, z: p[1], sx: 0.1, sy: 3, sz: 0.1, dx: 1, dz: 0, look: 'ghost' });
          plan.push({ kind: 'ring', p });
        } else if (!g.lamps.length) {
          bad = true;
          words = g.why ?? 'Cannot go here';
          key = `lb|${p[0]},${p[1]}|${ed.lampFit}`;
          marks.push({ x: p[0], y: f + 1.5, z: p[1], sx: 0.1, sy: 3, sz: 0.1, dx: 1, dz: 0, look: 'bad' });
          plan.push({ kind: 'ring', p });
        } else {
          const l0 = g.lamps[0]!;
          words = `A: ${g.lamps.length > 1 ? `${g.lamps.length} x ` : ''}${fit?.name ?? ''} ${fmt(l0.at[1])} m up${g.on ? ` on ${g.on}` : ''}${g.post ? ' with a lamp post' : ''}; RB turns`;
          key = `lg|${g.lamps.map((l) => l.at.join()).join(';')}|${ed.lampFit}|${ed.lampYaw}`;
          for (const l of g.lamps) {
            const fx = l.params.fixture;
            marks.push({ x: l.at[0], y: f + l.at[1] + (fx?.oy ?? 0), z: l.at[2], sx: Math.max(0.08, fx?.sx ?? 0.2), sy: Math.max(0.05, fx?.sy ?? 0.1), sz: Math.max(0.08, fx?.sz ?? 0.2), dx: 1, dz: 0, look: 'ghost' });
            plan.push({ kind: 'ring', p: [l.at[0], l.at[2]] });
          }
        }
      }
    } else if (ed.tool === 'stamp' && p) {
      // ON11: the whole group at the dot; red where the fit check would refuse it, with its words
      const g = ed.stamp.ghost(ed.model.data, ed.view.level, p[0], p[1], ed.grid, ed.model.rev);
      const pre = ed.stamp.preset;
      bad = !!g.why || g.problems.length > 0;
      words = g.why ?? (g.problems.length ? `${g.problems[0]!.words}${g.problems.length > 1 ? ` (and ${g.problems.length - 1} more)` : ''}` : `A: stamp ${pre.name} (${fmt(g.size[0])} x ${fmt(g.size[1])} m); RB turns`);
      key = `sp|${g.key}`;
      this.stampMarks(g, f, marks, plan);
    } else if (ed.tool === 'climb' && p) {
      // ON5: the piece's ghost at the dot with what the player can do with it (red where it cannot go)
      const kind = pieceOf(ed.climbKind);
      const g = ed.climbGhost(p[0], p[1]);
      if (!g) {
        words = `A: start a ${(kind?.name ?? '').toLowerCase()} here`;
        key = `cs|${p[0]},${p[1]}|${ed.climbKind}`;
        marks.push({ x: p[0], y: f + 0.75, z: p[1], sx: 0.2, sy: 1.5, sz: 0.2, dx: 1, dz: 0, look: 'ghost' });
        plan.push({ kind: 'ring', p });
      } else if (!g.e) {
        bad = true;
        words = g.why ?? 'Cannot go here';
        key = `cb|${p[0]},${p[1]}|${ed.climbKind}`;
        marks.push({ x: p[0], y: f + 0.75, z: p[1], sx: 0.2, sy: 1.5, sz: 0.2, dx: 1, dz: 0, look: 'bad' });
        plan.push({ kind: 'ring', p });
      } else {
        const e = g.e;
        words = `A: ${pieceWords(ed.model.data, e)}`;
        key = `cg|${e.a.join()}|${e.b.join()}|${e.y0}|${e.y1}|${ed.climbKind}`;
        const y = f - ed.floor() + (e.y0 + e.y1) / 2;
        const h = Math.max(0.05, e.y1 - e.y0);
        if (e.a[0] === e.b[0] && e.a[1] === e.b[1]) marks.push({ x: e.a[0], y, z: e.a[1], sx: 0.15, sy: h, sz: 0.15, dx: 1, dz: 0, look: 'ghost' });
        else marks.push(this.bar(e.a, e.b, y, h, Math.max(0.05, e.depth ?? 0.1), 'ghost'));
        plan.push(e.a[0] === e.b[0] && e.a[1] === e.b[1] ? { kind: 'ring', p: e.a } : { kind: 'line', a: e.a, b: e.b });
      }
    } else if (ed.tool === 'room' || ed.tool === 'wall' || ed.tool === 'hole' || ed.tool === 'roof') {
      if (p) {
        const fp = ed.tool === 'roof' ? footprintAt(ed.model.data, ed.view.level, p[0], p[1]) : null;
        words = ed.tool === 'roof' ? `A: start a ${roofType(ed.roofTypeId).name.toLowerCase()} roof here${fp ? `; A twice: on the ${fp.what}` : ''}` : ed.tool === 'hole' ? `A: start a floor hole (${HOLE_NAMES[ed.holeKind] ?? ed.holeKind}) here` : `A: start a ${ed.tool} here`;
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
        const type = $<HTMLSelectElement>(ed.tool === 'window' ? 'windowType' : 'doorType').value;
        const def = OPENING_DEFAULTS[type] ?? OPENING_DEFAULTS.door!;
        // ON1 decisions 3, 4: centred between the cross walls near the middle (LB: off), the clear distance each side
        const walls = ed.model.list('walls') as Wall[];
        const width = Math.min(def.w, wallLen(w));
        const { at } = centreOpening(w, walls, snap(projectOnWall(w, p[0], p[1]).s, ed.grid), width, this.st.down(PAD.LB));
        const a = wallPoint(w, at - width / 2);
        const b = wallPoint(w, at + width / 2);
        const lo = liveOpening(w, walls, at, width);
        words = `width ${fmt(width)} m, ${lo.words} - A: place ${DOOR_NAMES[type] ?? type} on ${label(ed.model.data, 'walls', w)}`;
        key = `o|${w.id}|${at}|${type}`;
        marks.push(this.bar(a, b, f + def.sill + def.h / 2, def.h, w.t + 0.1, 'ghost'));
        plan.push({ kind: 'line', a, b }, ...lo.shapes);
      }
    } else if (!d) {
      const t = this.target();
      const k = t?.key ? parseKey(t.key) : null;
      const e = k ? ed.model.get(k.coll, k.id) : undefined;
      if (k && e) words = label(ed.model.data, k.coll, e);
      hover = t?.key ?? null;
    }
    // ON1 decision 6: guide lines while the magnet holds a snap (3D: a thin box on the floor; plan: a fine dashed line)
    for (const [a, b] of guideLines(this.magnet, this.cands)) {
      marks.push(this.bar(a, b, f + 0.02, 0.02, 0.05, 'ghost'));
      plan.push({ kind: 'line', a, b, guide: true });
    }
    if (this.magnet) key += `|m:${this.magnet.key}`;
    ed.setHover(hover);
    if (words) text += ` - ${words.endsWith(' (A)') ? `A: ${words.slice(0, -4)}` : words}`;
    // ON7: the light meter at the dot (the exact bake) while the light view or the darkness map is on
    const meter = p ? ed.lights.meterAt(p[0], p[1]) : '';
    if (meter) text += ` - ${meter}`;
    // Plan only: the 3D dot is hidden, so its words go under the plan
    $(ed.prefs.layout === 'plan' ? 'planStatus' : 'reticleText').textContent = text;
    $('reticle').classList.toggle('bad', bad);
    const hint = part || key.startsWith('o|') || key.startsWith('s|') || key.startsWith('l|') || key.startsWith('st|') || bad ? words : '';
    if (hint !== this.grabWords) {
      this.grabWords = hint;
      ed.updateHint();
    }
    this.setMarks(marks, plan, `${key}|${f}|${bad}`);
  }

  /** Shows the marks in 3D and the dashed shapes on the plan when they changed. */
  private setMarks(marks: readonly Mark[], plan: readonly PlanShape[], key: string): void {
    if (key === this.marksKey) {
      // a plan redraw (after an edit or a live preview) drops the dashed group: put it back (ON1)
      if (plan.length && !document.getElementById('padGhost')) this.ed.planGhost(plan, marks[0]?.look ?? 'ghost');
      return;
    }
    this.marksKey = key;
    this.ed.view.setMarks(marks);
    this.ed.planGhost(plan, marks[0]?.look ?? 'ghost');
  }

  /** A box from a to b at height y (centre), sy tall and sz thick. */
  /** ON11: the stamp ghost's boxes (walls 1.2 m high, floors, objects, red problem areas) and its plan outline. */
  private stampMarks(g: StampGhost, f: number, marks: Mark[], plan: PlanShape[]): void {
    const d = this.ed.model.data;
    const base = this.ed.floor();
    const lift = (rel: string): number => {
      const id = g.levelOf(rel);
      return (d.levels.find((l) => l.id === id)?.floor ?? base) - base;
    };
    for (const pr of g.problems) {
      const r = pr.rect;
      const y = f + (d.levels.find((l) => l.id === pr.level)?.floor ?? base) - base;
      marks.push({ x: (r[0] + r[2]) / 2, y: y + 0.75, z: (r[1] + r[3]) / 2, sx: Math.max(0.1, r[2] - r[0]), sy: 1.5, sz: Math.max(0.1, r[3] - r[1]), dx: 1, dz: 0, look: 'bad' });
    }
    for (const w of g.items.walls) {
      marks.push(this.bar(w.a, w.b, f + lift(w.level) + 0.6, 1.2, w.t, 'ghost'));
      if (w.level === '+0') plan.push({ kind: 'line', a: w.a, b: w.b });
    }
    for (const r of g.items.rooms) {
      const q = r.rect;
      marks.push({ x: (q[0] + q[2]) / 2, y: f + lift(r.level) + 0.02, z: (q[1] + q[3]) / 2, sx: q[2] - q[0], sy: 0.04, sz: q[3] - q[1], dx: 1, dz: 0, look: 'ghost' });
    }
    for (const o of g.items.objects) {
      const q = o.rect;
      marks.push({ x: (q[0] + q[2]) / 2, y: f + lift(o.level) + (o.y ?? 0) + o.h / 2, z: (q[1] + q[3]) / 2, sx: q[2] - q[0], sy: o.h, sz: q[3] - q[1], dx: 1, dz: 0, look: 'ghost' });
    }
  }

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
    if (s.coll === 'objects') return this.ed.turnObjectNow();
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
    const ed = this.ed;
    if (ed.group.length) {
      const items = copyItems(ed.model.data, ed.group);
      if (!items.length) return ed.status('Copy takes rooms, walls (with their doors and windows) and floor holes');
      this.clipboard = items;
      return ed.status(`Copied ${groupWords(items.filter((i) => i.coll !== 'openings').map((i) => keyOf(i.coll, i.e.id)))}`);
    }
    const s = ed.selectedElem();
    if (!s || !COPY_COLLS.includes(s.coll)) return ed.status('Copy takes rooms, walls and floor holes');
    this.clipboard = [{ coll: s.coll, e: clone(s.e) }];
    ed.status(`Copied ${label(ed.model.data, s.coll, s.e)}`);
  }

  /** Paste (at the dot on the editing level) or Paste to level above (same spot): one edit; a set stays a set (ON3). */
  private paste(up: boolean): void {
    const items = this.clipboard;
    if (!items?.length) return;
    const ed = this.ed;
    const d = ed.model.data;
    let dx = 0;
    let dz = 0;
    if (!up) {
      const p = this.point();
      if (!p) return;
      const c = itemsCentre(items);
      dx = snap(p[0] - c[0], ed.grid);
      dz = snap(p[1] - c[1], ed.grid);
    }
    const res = pasteChanges(d, items, up ? (l) => levelIdAbove(d, l) : () => ed.view.level, dx, dz);
    if (!res) return ed.status('No level above');
    if (!res.changes.length) return;
    const lv = (res.changes[0]!.after as Elem & { level: string }).level;
    if (res.keys.length === 1) ed.commit(res.changes);
    else ed.commitText(`Pasted ${groupWords(res.keys)}${up ? ' one level up' : ''}`, res.changes);
    if (up) ed.setLevel(lv);
    ed.setGroup(res.keys);
  }

  /** Selected > Copy to level above: copy and paste one level up in one edit; the editing level goes with it. */
  private copyUp(): void {
    const ed = this.ed;
    const k = ed.group[0] ?? ed.selected;
    const q = k ? parseKey(k) : null;
    const e = q ? ed.model.get(q.coll, q.id) : undefined;
    if (!q || !e) return;
    if (!levelIdAbove(ed.model.data, ed.levelOf(q.coll, e))) return ed.status('No level above');
    this.copy();
    this.paste(true);
  }

  /** Change type to a given kind (the card's Type row steps instead): the opening's type, the room's or the wall's kind; one undoable edit. */
  changeType(v: string): void {
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
      `Building <b>${bld}</b> &nbsp; Tool <b>${BAR.find(([id]) => id === this.barSlot())?.[1] ?? ed.tool}</b>`,
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
  /** A Checks line (hub or side panel): the editor selects and frames the element it names (ON3). */
  goToProblem(text: string): void {
    this.ed.goToProblem(text);
  }
}

export function isTyping(): boolean {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || (a.tagName === 'SELECT' && a.closest('#panel') !== null));
}
