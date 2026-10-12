/**
 * The level editor's hub (ED3-2), pure: tabs, the rows of each tab and their words, the pad settings and the help
 * picture's button labels (generated from actions.ts). Babylon- and DOM-free (tests/editor/hub.test.ts); hubView.ts
 * draws it and runs the rows.
 */
import type { PadStyle } from '../input/gamepadMapping';
import { ACTIONS, padParts } from './actions';
import type { Ctx } from './actions';
import { padWords } from './pad';

export const HUB_TABS = ['Play', 'File', 'Checks', 'Levels', 'View', 'Settings', 'Help'] as const;
export type HubTab = (typeof HUB_TABS)[number];

/** The next tab, wrapping at the ends (LB / RB). */
export const stepTab = (t: HubTab, dir: 1 | -1): HubTab => HUB_TABS[(HUB_TABS.indexOf(t) + dir + HUB_TABS.length) % HUB_TABS.length]!;

/** Controller settings, saved with the pad preferences (a view preference, not a save). */
export interface PadSettings {
  rumble: boolean;
  /** Scales pan and orbit. */
  stickSpeed: number;
  invertTilt: boolean;
  textSize: 'normal' | 'large';
  /** Stretching or moving a room takes its walls, neighbours and doors along (ED3-3a). */
  wallsFollow: boolean;
}
export const DEFAULT_SETTINGS: PadSettings = { rumble: true, stickSpeed: 1, invertTilt: false, textSize: 'normal', wallsFollow: true };
export const STICK_SPEED = { MIN: 0.5, MAX: 2, STEP: 0.25 } as const;
/** Large text: 1.25x on the pad screen, the hub and the wheels. */
export const LARGE_TEXT = 1.25;

/** Reads stored settings, keeping only valid fields. */
export function readSettings(raw: unknown): PadSettings {
  const s = { ...DEFAULT_SETTINGS };
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof PadSettings, unknown>>;
  if (typeof r.rumble === 'boolean') s.rumble = r.rumble;
  if (typeof r.stickSpeed === 'number' && r.stickSpeed >= STICK_SPEED.MIN && r.stickSpeed <= STICK_SPEED.MAX) s.stickSpeed = r.stickSpeed;
  if (typeof r.invertTilt === 'boolean') s.invertTilt = r.invertTilt;
  if (r.textSize === 'normal' || r.textSize === 'large') s.textSize = r.textSize;
  if (typeof r.wallsFollow === 'boolean') s.wallsFollow = r.wallsFollow;
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
}

/** What the rows show; padControl fills it from the editor. */
export interface HubInput {
  unsaved: number;
  /** The undo history, newest first. */
  changes: string[];
  problems: { text: string; fresh: boolean }[];
  levels: { id: string; name: string; floor: string; editing: boolean }[];
  layout: '3d' | 'both' | 'plan';
  labels: boolean;
  minimap: boolean;
  underlay: boolean;
  settings: PadSettings;
}

const onOff = (b: boolean): string => (b ? 'on' : 'off');
const LAYOUT_WORDS = { '3d': '3D', both: 'Both', plan: 'Plan' } as const;

export function hubRows(tab: HubTab, h: HubInput): HubRow[] {
  switch (tab) {
    case 'Play':
      return [
        { id: 'play.quick', text: 'Quick walk at the dot', note: 'Same as L3; L3 runs, B comes back', kind: 'go' },
        { id: 'play.walk', text: 'Walk test as the player', note: 'The game itself, unsaved edits included; Tab too', kind: 'go' },
      ];
    case 'File':
      return [
        { id: 'file.save', text: 'Save', value: `${h.unsaved} unsaved`, kind: 'go' },
        { id: 'file.revert', text: 'Revert to last save', note: 'Asks first', kind: 'go' },
        ...h.changes.map((t, i) => ({ id: `undo.${i}`, text: t, note: i === 0 ? 'A: undo back to here' : undefined, kind: 'line' as const })),
      ];
    case 'Checks':
      return [
        { id: 'checks.next', text: 'Next problem', note: h.problems.length ? `${h.problems.length} lines` : 'No problems', disabled: !h.problems.length, kind: 'go' },
        ...h.problems.map((p, i) => ({ id: `prob.${i}`, text: p.text, fresh: p.fresh, kind: 'line' as const })),
      ];
    case 'Levels':
      return h.levels.map((l) => ({ id: `level.${l.id}`, text: `${l.name} (${l.floor} m)`, value: l.editing ? 'editing' : undefined, note: l.editing ? undefined : 'A edits it', kind: 'go' as const }));
    case 'View':
      return [
        { id: 'view.layout', text: 'Layout', value: LAYOUT_WORDS[h.layout], kind: 'step' },
        { id: 'view.labels', text: 'Plan labels', value: onOff(h.labels), kind: 'step' },
        { id: 'view.minimap', text: 'Small plan (3D only)', value: onOff(h.minimap), kind: 'step' },
        { id: 'view.underlay', text: 'Level below on the plan', value: onOff(h.underlay), kind: 'step' },
      ];
    case 'Settings':
      return [
        { id: 'set.rumble', text: 'Rumble', value: onOff(h.settings.rumble), kind: 'step' },
        { id: 'set.speed', text: 'Stick speed', value: `${h.settings.stickSpeed.toFixed(2)}x`, kind: 'step' },
        { id: 'set.invert', text: 'Invert tilt', value: onOff(h.settings.invertTilt), kind: 'step' },
        { id: 'set.text', text: 'Text size', value: h.settings.textSize === 'large' ? 'Large' : 'Normal', kind: 'step' },
        { id: 'set.follow', text: 'Walls follow rooms', value: onOff(h.settings.wallsFollow), note: 'Stretching or moving a room takes its walls along', kind: 'step' },
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
 * Every picture button with its building-state words from the action map: taps first, then "hold: ...". Grabbing and
 * the wheels have their own words in the hint bar.
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
