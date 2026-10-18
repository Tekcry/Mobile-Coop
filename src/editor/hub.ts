/**
 * The level editor's hub (ED3-2), pure: tabs, the rows of each tab and their words, the pad settings and the help
 * picture's button labels (generated from actions.ts). Babylon- and DOM-free (tests/editor/hub.test.ts); hubView.ts
 * draws it and runs the rows.
 */
import type { PadStyle } from '../input/gamepadMapping';
import { ACTIONS, padParts } from './actions';
import type { Ctx } from './actions';
import { padWords } from './pad';
import { REPEAT_SPEED } from './stickSteps';
import { viewTiles } from './tileMenu';
import { ORBIT } from './orbit';
import type { Smoothing } from './orbit';
import type { ViewState } from './tileMenu';
import { NO_PLACE } from './ease';

export const HUB_TABS = ['Play', 'File', 'Checks', 'Levels', 'View', 'Settings', 'Help'] as const;
export type HubTab = (typeof HUB_TABS)[number];

/** The next tab, wrapping at the ends (LB / RB). */
export const stepTab = (t: HubTab, dir: 1 | -1): HubTab => HUB_TABS[(HUB_TABS.indexOf(t) + dir + HUB_TABS.length) % HUB_TABS.length]!;

/** Controller settings, saved with the pad preferences (a view preference, not a save). */
export interface PadSettings {
  rumble: boolean;
  /** Pan speed (the field keeps its old name, so saved settings carry over). */
  stickSpeed: number;
  /** Orbit and tilt speed (ON0b). */
  orbitSpeed: number;
  /** How softly the camera starts and stops (ON0b). */
  smoothing: Smoothing;
  /** Radial stick dead zone for the camera (ON0b). */
  deadZone: number;
  /** The grid every drawing, move, stretch, nudge and card step uses, metres (ON0b: 0.1 default). */
  grid: number;
  invertTilt: boolean;
  textSize: 'normal' | 'large';
  /** Stretching or moving a room takes its walls, neighbours and doors along (ED3-3a). */
  wallsFollow: boolean;
  /** The tile menu opens on the last tab used, or always on Build (ON0a). */
  menuOpens: 'last' | 'build';
  /** Held D-pad and stick repeat in every menu and on the card (1 = normal). */
  repeatSpeed: number;
  /** The camera (Michael 2026-10-14): free fly (the default, also for saved settings without it) or the ground-target orbit. */
  camera: 'fly' | 'orbit';
}
export const DEFAULT_SETTINGS: PadSettings = { rumble: true, stickSpeed: 1, orbitSpeed: 1, smoothing: 'medium', deadZone: ORBIT.DEAD, grid: 0.1, invertTilt: false, textSize: 'normal', wallsFollow: true, menuOpens: 'last', repeatSpeed: 1, camera: 'fly' };
export const STICK_SPEED = { MIN: 0.5, MAX: 2, STEP: 0.25 } as const;
export const DEAD_ZONE = { MIN: 0.05, MAX: 0.35, STEP: 0.05 } as const;
/** Settings > Grid choices, metres (ON0b decision 5). */
export const GRIDS = [0.1, 0.25, 0.5] as const;
const SMOOTHING: readonly Smoothing[] = ['low', 'medium', 'high'];
const SMOOTH_WORDS: Record<Smoothing, string> = { low: 'Low', medium: 'Medium', high: 'High' };
/** Large text: 1.25x on the pad screen, the hub and the tile menu. */
export const LARGE_TEXT = 1.25;

/** Reads stored settings, keeping only valid fields. */
export function readSettings(raw: unknown): PadSettings {
  const s = { ...DEFAULT_SETTINGS };
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof PadSettings, unknown>>;
  if (typeof r.rumble === 'boolean') s.rumble = r.rumble;
  if (typeof r.stickSpeed === 'number' && r.stickSpeed >= STICK_SPEED.MIN && r.stickSpeed <= STICK_SPEED.MAX) s.stickSpeed = r.stickSpeed;
  if (typeof r.orbitSpeed === 'number' && r.orbitSpeed >= STICK_SPEED.MIN && r.orbitSpeed <= STICK_SPEED.MAX) s.orbitSpeed = r.orbitSpeed;
  if (r.smoothing === 'low' || r.smoothing === 'medium' || r.smoothing === 'high') s.smoothing = r.smoothing;
  if (typeof r.deadZone === 'number' && r.deadZone >= DEAD_ZONE.MIN - 1e-9 && r.deadZone <= DEAD_ZONE.MAX + 1e-9) s.deadZone = r.deadZone;
  if (typeof r.grid === 'number' && (GRIDS as readonly number[]).includes(r.grid)) s.grid = r.grid;
  if (typeof r.invertTilt === 'boolean') s.invertTilt = r.invertTilt;
  if (r.textSize === 'normal' || r.textSize === 'large') s.textSize = r.textSize;
  if (typeof r.wallsFollow === 'boolean') s.wallsFollow = r.wallsFollow;
  if (r.menuOpens === 'last' || r.menuOpens === 'build') s.menuOpens = r.menuOpens;
  if (typeof r.repeatSpeed === 'number' && r.repeatSpeed >= REPEAT_SPEED.MIN && r.repeatSpeed <= REPEAT_SPEED.MAX) s.repeatSpeed = r.repeatSpeed;
  if (r.camera === 'fly' || r.camera === 'orbit') s.camera = r.camera;
  return s;
}

/** A setting row changed by left / right (dir) or A (dir 1); returns the new settings. */
export function changeSetting(s: PadSettings, id: string, dir: 1 | -1): PadSettings {
  const n = { ...s };
  if (id === 'set.rumble') n.rumble = !s.rumble;
  else if (id === 'set.invert') n.invertTilt = !s.invertTilt;
  else if (id === 'set.follow') n.wallsFollow = !s.wallsFollow;
  else if (id === 'set.text') n.textSize = s.textSize === 'normal' ? 'large' : 'normal';
  else if (id === 'set.speed') n.stickSpeed = Math.min(STICK_SPEED.MAX, Math.max(STICK_SPEED.MIN, +(s.stickSpeed + dir * STICK_SPEED.STEP).toFixed(2)));
  else if (id === 'set.orbit') n.orbitSpeed = Math.min(STICK_SPEED.MAX, Math.max(STICK_SPEED.MIN, +(s.orbitSpeed + dir * STICK_SPEED.STEP).toFixed(2)));
  else if (id === 'set.smooth') n.smoothing = SMOOTHING[Math.min(2, Math.max(0, SMOOTHING.indexOf(s.smoothing) + dir))]!;
  else if (id === 'set.dead') n.deadZone = Math.min(DEAD_ZONE.MAX, Math.max(DEAD_ZONE.MIN, +(s.deadZone + dir * DEAD_ZONE.STEP).toFixed(2)));
  else if (id === 'set.grid') n.grid = GRIDS[(GRIDS.indexOf(s.grid as (typeof GRIDS)[number]) + dir + GRIDS.length) % GRIDS.length]!;
  else if (id === 'set.camera') n.camera = s.camera === 'fly' ? 'orbit' : 'fly';
  else if (id === 'set.menuOpens') n.menuOpens = s.menuOpens === 'last' ? 'build' : 'last';
  else if (id === 'set.repeat') n.repeatSpeed = Math.min(REPEAT_SPEED.MAX, Math.max(REPEAT_SPEED.MIN, +(s.repeatSpeed + dir * REPEAT_SPEED.STEP).toFixed(2)));
  return n;
}

/** One row of a tab. `step` rows change with left / right; `go` rows run with A; `line` rows are list lines. */
export interface HubRow {
  id: string;
  text: string;
  value?: string;
  /** Shown greyed; A does nothing. */
  disabled?: boolean;
  note?: string;
  kind: 'go' | 'step' | 'line';
  /** A list line marked new (Checks). */
  fresh?: boolean;
  /** Slider rows: where the value sits, 0 to 1 (drawn as a bar). */
  slider?: number;
  /** ON15: a marker on the slider (0 to 1; the brief's night on the time of night). */
  mark?: number;
  /** ON3: an undone change (File tab), drawn grey until a new edit drops it. */
  undone?: boolean;
}

/** What the rows show; padControl fills it from the editor. */
export interface HubInput {
  unsaved: number;
  /** ON8: the walk test starts at insertion point 1 (on), and how many insertion points there are. */
  insertion?: { on: boolean; n: number };
  /** The undo history, newest first. */
  changes: string[];
  /** ON3: the undone changes redo would bring back, newest first (the furthest redo first). */
  undone?: string[];
  /** `place: false`: the line names no element (ON3: "no place to go"). */
  problems: { text: string; fresh: boolean; place?: boolean }[];
  /** ON3: the camera bookmarks (Hub > View). */
  bookmarks?: { slot: number; name: string }[];
  levels: { id: string; name: string; floor: string; editing: boolean }[];
  /**
   * ON2: the Levels panel's level actions for the editing level (storey height left / right then A applies) and, with
   * Edit building outlines on, each building's four edges and the RULES 2 warnings. Optional (older callers and tests).
   */
  levelPanel?: {
    id: string;
    name: string;
    height: number;
    /** The storey height being set (left / right), applied by A. */
    pending: number;
    outlines: boolean;
    buildings: { id: string; rect: readonly number[]; size: string }[];
    warnings: string[];
    limits: string;
  };
  /** The View tab's items (shared with the tile menu's View tab). */
  view: ViewState;
  settings: PadSettings;
}

const onOff = (b: boolean): string => (b ? 'on' : 'off');
const frac = (v: number, r: { MIN: number; MAX: number }): number => (v - r.MIN) / (r.MAX - r.MIN);

export function hubRows(tab: HubTab, h: HubInput): HubRow[] {
  switch (tab) {
    case 'Play':
      return [
        { id: 'play.quick', text: 'Quick walk at the dot', note: 'Same as L3 tap; runs, L3 slows to a walk, B comes back', kind: 'go' },
        { id: 'play.walk', text: 'Walk test as the player', note: 'The game itself, unsaved edits included; L3 held or Tab too', kind: 'go' },
        // ON8: the walk test (Tab, L3 held, the row above) starts at the first insertion point instead of the dot
        { id: 'play.insertion', text: 'Start at insertion 1', value: onOff(!!h.insertion?.on), note: h.insertion?.n ? 'The walk test starts at insertion point 1 (Tab and L3 held too)' : 'No insertion point yet: Y > Mission > Insertion', disabled: !h.insertion?.n && !h.insertion?.on, kind: 'step' },
        { id: 'play.find', text: 'Find a room, stair or object', note: 'An on-screen keyboard filters the list; A goes there (Ctrl+K on the keyboard)', kind: 'go' },
      ];
    case 'File':
      return [
        { id: 'file.save', text: 'Save', value: `${h.unsaved} unsaved`, kind: 'go' },
        { id: 'file.revert', text: 'Revert to last save', note: 'Asks first', kind: 'go' },
        ...(h.undone ?? []).map((t, i) => ({ id: `redo.${i}`, text: t, note: i === (h.undone ?? []).length - 1 ? 'Undone; A: redo up to here' : 'Undone', undone: true, kind: 'line' as const })),
        ...h.changes.map((t, i) => ({ id: `undo.${i}`, text: t, note: i === 0 ? 'A: undo back to here' : undefined, kind: 'line' as const })),
      ];
    case 'Checks':
      return [
        { id: 'checks.next', text: 'Next problem', note: h.problems.length ? `${h.problems.length} lines` : 'No problems', disabled: !h.problems.length, kind: 'go' },
        ...h.problems.map((p, i) => ({ id: `prob.${i}`, text: p.text, fresh: p.fresh, note: p.place === false ? NO_PLACE : undefined, kind: 'line' as const })),
      ];
    case 'Levels': {
      const rows: HubRow[] = h.levels.map((l) => ({ id: `level.${l.id}`, text: `${l.name} (${l.floor} m)`, value: l.editing ? 'editing' : undefined, note: l.editing ? undefined : 'A edits it', kind: 'go' as const }));
      const p = h.levelPanel;
      if (!p) return rows;
      const changed = Math.abs(p.pending - p.height) > 1e-6;
      rows.push(
        { id: 'lv.height', text: `Storey height of ${p.name}`, value: `${p.pending.toFixed(1)} m`, note: changed ? `A applies (was ${p.height.toFixed(1)} m); the levels above move` : 'Left / right sets it, A applies', kind: 'step' },
        { id: 'lv.addAbove', text: `Add a level above ${p.name}`, note: 'Pick a name; the levels above move up a storey', kind: 'go' },
        { id: 'lv.addBelow', text: `Add a level below ${p.name}`, note: 'Pick a name; the levels below move down a storey', kind: 'go' },
        { id: 'lv.dup', text: `Duplicate ${p.name} one storey up`, note: 'Rooms, walls, doors, windows, objects and floor holes, new ids', kind: 'go' },
        { id: 'lv.rename', text: `Rename ${p.name}`, note: 'Name list or keyboard', kind: 'go' },
        { id: 'lv.renameId', text: `Rename id ${p.id}`, note: 'Every reference follows', kind: 'go' },
        { id: 'lv.delete', text: `Delete ${p.name}`, note: 'Asks first, listing what goes with it', kind: 'go' },
        { id: 'lv.outlines', text: 'Edit building outlines', value: onOff(p.outlines), note: p.limits, kind: 'step' },
      );
      if (p.outlines) {
        for (const b of p.buildings)
          for (const [e, word, i] of [['W', 'west', 0], ['S', 'south', 1], ['E', 'east', 2], ['N', 'north', 3]] as const)
            rows.push({ id: `bo.${b.id}.${e}`, text: `Building ${b.id} ${word} edge`, value: `${e === 'W' || e === 'E' ? 'x' : 'z'} ${b.rect[i]}`, note: b.size, kind: 'step' });
        p.warnings.forEach((w, i) => rows.push({ id: `bow.${i}`, text: w, fresh: true, kind: 'line' }));
      }
      return rows;
    }
    case 'View':
      return [
        ...viewTiles(h.view).map((t) => ({ id: t.id, text: t.name, value: t.value, note: t.desc, kind: 'step' as const, ...(t.frac !== undefined ? { slider: t.frac, mark: t.mark } : {}) })),
        // ON3 decision 7: bookmarks (Ctrl+1-9 save, Alt+1-9 go on the keyboard)
        { id: 'bm.save', text: 'Bookmarks: save this view', note: 'A name from the list or typed; Ctrl+1-9 on the keyboard', kind: 'go' as const },
        ...(h.bookmarks ?? []).map((b) => ({ id: `bm.go.${b.slot}`, text: `Go to: ${b.name}`, value: `${b.slot}`, note: `Alt+${b.slot} on the keyboard`, kind: 'go' as const })),
      ];
    case 'Settings':
      return [
        { id: 'set.rumble', text: 'Rumble', value: onOff(h.settings.rumble), kind: 'step' },
        { id: 'set.grid', text: 'Grid', value: `${h.settings.grid} m`, note: 'Drawing, moving, stretching, nudges and every card step', kind: 'step' },
        { id: 'set.speed', text: 'Pan speed', value: `${h.settings.stickSpeed.toFixed(2)}x`, kind: 'step', slider: frac(h.settings.stickSpeed, STICK_SPEED) },
        { id: 'set.orbit', text: 'Orbit speed', value: `${h.settings.orbitSpeed.toFixed(2)}x`, note: 'Right stick turn and tilt', kind: 'step', slider: frac(h.settings.orbitSpeed, STICK_SPEED) },
        { id: 'set.smooth', text: 'Smoothing', value: SMOOTH_WORDS[h.settings.smoothing], note: 'How softly the camera starts and stops', kind: 'step' },
        { id: 'set.dead', text: 'Dead zone', value: h.settings.deadZone.toFixed(2), note: 'Stick travel ignored around the centre', kind: 'step', slider: frac(h.settings.deadZone, DEAD_ZONE) },
        { id: 'set.repeat', text: 'Repeat speed', value: `${h.settings.repeatSpeed.toFixed(2)}x`, note: 'Held D-pad and stick in menus and on the card', kind: 'step', slider: frac(h.settings.repeatSpeed, REPEAT_SPEED) },
        { id: 'set.invert', text: 'Invert tilt', value: onOff(h.settings.invertTilt), kind: 'step' },
        { id: 'set.text', text: 'Text size', value: h.settings.textSize === 'large' ? 'Large' : 'Normal', kind: 'step' },
        { id: 'set.menuOpens', text: 'Menu opens on', value: h.settings.menuOpens === 'last' ? 'Last tab' : 'Build tab', kind: 'step' },
        { id: 'set.follow', text: 'Walls follow rooms', value: onOff(h.settings.wallsFollow), note: 'Stretching or moving a room takes its walls along', kind: 'step' },
        { id: 'set.camera', text: 'Camera', value: h.settings.camera === 'fly' ? 'Free fly' : 'Orbit', note: 'Free fly: move and look anywhere; Orbit: circle a point on the floor', kind: 'step' },
      ];
    case 'Help':
      return [];
  }
}

/** The next layout for left / right on the View tab. */
export function stepLayout(l: '3d' | 'both' | 'plan', dir: 1 | -1): '3d' | 'both' | 'plan' {
  const ls = ['3d', 'both', 'plan'] as const;
  return ls[(ls.indexOf(l) + dir + 3) % 3]!;
}

/** The buttons on the help picture, left side then right side. */
export const PICTURE_BUTTONS = {
  left: ['LT', 'LB', 'LS', 'L3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'View'],
  right: ['RT', 'RB', 'Y', 'X', 'B', 'A', 'RS', 'R3', 'Menu'],
} as const;

const BUILDING: readonly Ctx[] = ['idle', 'selected'];

/**
 * Every picture button with its building-state words from the action map: taps first, then "hold: ...". Grabbing, the
 * card and the tile menu have their own words in the hint bar.
 */
export function controllerLabels(style: PadStyle): { button: string; name: string; words: string }[] {
  const all = [...PICTURE_BUTTONS.left, ...PICTURE_BUTTONS.right];
  return all.map((button) => {
    const tap: string[] = [];
    const hold: string[] = [];
    for (const a of ACTIONS) {
      if (a.ctx && !a.ctx.some((c) => BUILDING.includes(c))) continue;
      for (const b of (a.pad ?? []).flatMap(padParts)) {
        const isHold = b.endsWith(' hold');
        const base = isHold ? b.slice(0, -5) : b;
        if (base !== button) continue;
        const list = isHold ? hold : tap;
        if (!list.includes(a.name)) list.push(a.name);
      }
    }
    const words = [tap.join('; '), hold.length ? `hold: ${hold.join('; ')}` : ''].filter(Boolean).join('; ');
    return { button, name: padWords(button, style), words };
  });
}
