/**
 * (locomotion step 18, D7) Controller bindings (pure, unit-tested). Every remappable pad verb has up to two buttons
 * (W3C standard-mapping indices). The sticks, the triggers' analog aim / fire and the menu buttons (`UI_BINDINGS`)
 * stay fixed; LT / RT as plain buttons can take another verb (the conflict check then names Aim / Fire). The defaults
 * are `GAME_BINDINGS` (the binding table in docs/systems/input-and-loop.md). Contextual verbs that share one button by
 * design are one row here: Y is jump + use + takedown, X is reload (tap) + next weapon (hold while aiming, A55), the context button
 * carries back-to-wall / door peek / SWAT.
 */
import type { ButtonAction } from './actions';
import { PAD, type PadStyle } from './gamepadMapping';

export type PadBindId =
  | 'cover'
  | 'crouch'
  | 'reload'
  | 'traverse'
  | 'nextWeapon'
  | 'prevWeapon'
  | 'shoulder'
  | 'speedUp'
  | 'speedDown'
  | 'gadget'
  | 'wheel'
  | 'goggles'
  | 'pause';

export interface PadBindDef {
  id: PadBindId;
  label: string;
  actions: readonly ButtonAction[];
  defaults: readonly number[];
}

export const PAD_BINDS: readonly PadBindDef[] = [
  { id: 'cover', label: 'Context action (back to wall, peek, SWAT)', actions: ['cover'], defaults: [PAD.A] },
  { id: 'crouch', label: 'Crouch', actions: ['crouch'], defaults: [PAD.B] },
  { id: 'traverse', label: 'Traverse / use / takedown', actions: ['jump', 'interact'], defaults: [PAD.Y] },
  { id: 'reload', label: 'Reload (tap) / next weapon (hold, aiming)', actions: ['reload'], defaults: [PAD.X] },
  { id: 'nextWeapon', label: 'Next weapon', actions: ['swapNext'], defaults: [PAD.RB] },
  { id: 'prevWeapon', label: 'Previous weapon', actions: ['swapPrev'], defaults: [PAD.LB] },
  { id: 'shoulder', label: 'Swap shoulder', actions: ['shoulderSwap'], defaults: [PAD.RS] },
  { id: 'speedUp', label: 'Speed gear up', actions: ['speedUp'], defaults: [PAD.UP] },
  { id: 'speedDown', label: 'Speed gear down', actions: ['speedDown'], defaults: [PAD.DOWN] },
  { id: 'gadget', label: 'Gadget (hold to aim)', actions: ['grenade'], defaults: [PAD.RIGHT] },
  { id: 'wheel', label: 'Ping (tap) / gadget wheel (hold)', actions: ['gadgetWheel'], defaults: [PAD.LEFT] },
  { id: 'goggles', label: 'Goggles', actions: ['vision'], defaults: [PAD.SELECT] },
  { id: 'pause', label: 'Pause', actions: ['pause'], defaults: [PAD.START] },
];

export const PAD_BIND_IDS: readonly PadBindId[] = PAD_BINDS.map((b) => b.id);
export type PadBinds = Record<PadBindId, number[]>;
/** Buttons a verb may use: the face buttons, shoulders, triggers, View / Menu, stick clicks, d-pad (not Home). */
export const PAD_BUTTON_COUNT = 16;
/** Fixed analog verbs on the triggers (shown read-only; a button verb on them is reported as a conflict). */
export const PAD_FIXED: Readonly<Record<'aim' | 'fire', readonly number[]>> = { aim: [PAD.LT], fire: [PAD.RT] };

export function defaultPadBinds(): PadBinds {
  const out = {} as PadBinds;
  for (const b of PAD_BINDS) out[b.id] = [...b.defaults];
  return out;
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
