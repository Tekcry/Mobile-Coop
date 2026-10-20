/**
 * (locomotion step 18, D7; CT prototype A3, G96) Controller bindings (pure, unit-tested). Every remappable pad verb has up
 * to two buttons (W3C standard-mapping indices). The sticks, the triggers' analog aim / fire and the menu buttons
 * (`UI_BINDINGS`) stay fixed; LT / RT as plain buttons can take another verb (the conflict check then names Aim / Fire).
 * The defaults are `GAME_BINDINGS` (the Chaos Theory pad, docs/ct-prototype/F1A-CONTROLS.md): A interact / context
 * (doors, takedown; reloads while the weapon is drawn), B crouch, Y jump, X draw / holster (a toggle: the aiming mode),
 * LT knockout (holstered) / secondary fire (drawn), RT lethal attack (holstered) / fire (drawn), L3 back-to-wall (not
 * aiming) / swap shoulder (aiming), R3 zoom (aiming, scoped), RB co-op action (CT's Black), LB selection wheel (hold) /
 * switch weapon (tap), View mission device (no action yet), D-pad up / down speed rocker, left the selected vision
 * mode on / off, right quick-use of the selected gadget.
 */
import type { ButtonAction } from './actions';
import { PAD, type PadStyle } from './gamepadMapping';

export type PadBindId =
  | 'wall'
  | 'interact'
  | 'crouch'
  | 'draw'
  | 'jump'
  | 'coop'
  | 'quick'
  | 'zoom'
  | 'gearUp'
  | 'gearDown'
  | 'throwCam'
  | 'vision'
  | 'device'
  | 'pause';

export interface PadBindDef {
  id: PadBindId;
  label: string;
  actions: readonly ButtonAction[];
  defaults: readonly number[];
}

export const PAD_BINDS: readonly PadBindDef[] = [
  { id: 'interact', label: 'Interact / context (doors, takedown)', actions: ['interact'], defaults: [PAD.A] },
  { id: 'crouch', label: 'Crouch', actions: ['crouch'], defaults: [PAD.B] },
  { id: 'jump', label: 'Jump / traverse', actions: ['jump'], defaults: [PAD.Y] },
  { id: 'draw', label: 'Draw / holster weapon (aim toggle)', actions: ['draw'], defaults: [PAD.X] },
  { id: 'wall', label: 'Back to wall (aiming: swap shoulder)', actions: ['cover', 'shoulderSwap'], defaults: [PAD.LS] },
  { id: 'coop', label: 'Co-op action', actions: ['coop'], defaults: [PAD.RB] },
  { id: 'quick', label: 'Selection wheel (hold) / switch weapon (tap)', actions: ['gadgetWheel'], defaults: [PAD.LB] },
  { id: 'zoom', label: 'Zoom (aiming, scoped weapon)', actions: ['zoom'], defaults: [PAD.RS] },
  { id: 'vision', label: 'Vision on / off (the mode picked on the wheel)', actions: ['vision'], defaults: [PAD.LEFT] },
  { id: 'throwCam', label: 'Quick-use selected gadget (hold to aim)', actions: ['grenade'], defaults: [PAD.RIGHT] },
  { id: 'gearDown', label: 'Max speed down', actions: ['speedDown'], defaults: [PAD.DOWN] },
  { id: 'gearUp', label: 'Max speed up', actions: ['speedUp'], defaults: [PAD.UP] },
  { id: 'device', label: 'Mission device (not in yet)', actions: [], defaults: [PAD.SELECT] },
  { id: 'pause', label: 'Pause', actions: ['pause'], defaults: [PAD.START] },
];

export const PAD_BIND_IDS: readonly PadBindId[] = PAD_BINDS.map((b) => b.id);
export type PadBinds = Record<PadBindId, number[]>;
/** Buttons a verb may use: the face buttons, shoulders, triggers, View / Menu, stick clicks, d-pad (not Home). */
export const PAD_BUTTON_COUNT = 16;
/** Fixed analog verbs on the triggers (F1a: LT is the knockout / secondary fire, kept under the old 'aim' key because the controls screen reads it; shown read-only; a button verb on them is reported as a conflict). */
export const PAD_FIXED: Readonly<Record<'aim' | 'fire', readonly number[]>> = { aim: [PAD.LT], fire: [PAD.RT] };

export function defaultPadBinds(): PadBinds {
  const out = {} as PadBinds;
  for (const b of PAD_BINDS) out[b.id] = [...b.defaults];
  return out;
}

/**
 * (F7, playtest 2 "D pad left and right is speed?") The D-pad layout version of the stored pad binds. A3 builds put the
 * speed gear on D-pad left / right and vision / gadget on up / down; F1a moved the defaults (speed up / down, vision
 * left, gadget right) but kept stored binds as saved, so a settings save from an A3 build still had speed on left / right
 * (and vision sharing up with speed up). Version 2: those verbs still on their exact A3 default move to today's; a verb
 * the player remapped is kept.
 */
export const PAD_LAYOUT_V = 2;
const A3_DPAD: ReadonlyArray<[PadBindId, number]> = [
  ['vision', PAD.UP],
  ['throwCam', PAD.DOWN],
  ['gearDown', PAD.LEFT],
  ['gearUp', PAD.RIGHT],
];

/** (F7) Moves the D-pad verbs still on their A3 defaults to today's defaults (in place). */
export function migrateA3Dpad(b: PadBinds): void {
  for (const [id, btn] of A3_DPAD) {
    const v = b[id];
    if (v.length === 1 && v[0] === btn) b[id] = [...PAD_BINDS.find((x) => x.id === id)!.defaults];
  }
}

export function padBindable(i: unknown): i is number {
  return typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < PAD_BUTTON_COUNT;
}

/** Stored pad binds over the defaults: unknown verbs and buttons dropped, at most two per verb (shared buttons kept:
 *  they are conflicts the controls screen warns about, not errors). */
export function sanitizePadBinds(raw: unknown): PadBinds {
  const out = defaultPadBinds();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  for (const b of PAD_BINDS) {
    const v = r[b.id];
    if (!Array.isArray(v)) continue;
    const list: number[] = [];
    for (const i of v) if (padBindable(i) && !list.includes(i) && list.length < 2) list.push(i);
    out[b.id] = list;
  }
  return out;
}

/** Put button `btn` in `slot` (0 / 1) of `id`. The button stays on any other verb that has it (a conflict, warned);
 *  returns false for a button that cannot be bound. */
export function assignPadBind(binds: PadBinds, id: PadBindId, slot: 0 | 1, btn: number): boolean {
  if (!padBindable(btn)) return false;
  const list = binds[id];
  const at = list.indexOf(btn);
  if (at >= 0) list.splice(at, 1);
  if (slot >= list.length) list.push(btn);
  else list[slot] = btn;
  if (list.length > 2) list.length = 2;
  return true;
}

export function clearPadBind(binds: PadBinds, id: PadBindId, slot: 0 | 1): void {
  binds[id].splice(slot, 1);
}

/** The flat button -> action table `mapPad` reads (built once per bindings change, never per frame). */
export function padBindTable(binds: PadBinds): ReadonlyArray<readonly [number, ButtonAction]> {
  const out: [number, ButtonAction][] = [];
  for (const b of PAD_BINDS) for (const i of binds[b.id]) for (const a of b.actions) out.push([i, a]);
  return out;
}

const NAMES: Record<PadStyle, readonly string[]> = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'],
  playstation: ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'],
  nintendo: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', 'Minus', 'Plus', 'LS', 'RS', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'],
};

/** A button's name on this pad style ("B", "Circle"). */
export function padButtonName(i: number, style: PadStyle = 'xbox'): string {
  return NAMES[style][i] ?? `Button ${i}`;
}

/** All buttons of a verb ("X / RB"), for prompts and the binding list. */
export function padBindLabels(binds: PadBinds, id: PadBindId, style: PadStyle = 'xbox'): string {
  const l = binds[id];
  return l.length ? l.map((i) => padButtonName(i, style)).join(' / ') : 'Unbound';
}
