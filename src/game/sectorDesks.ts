/**
 * (sector-redesign E6, EW10, EG13) Security desks in Sector Ops (pure, Babylon-free): a console in a section that
 * controls a list of that section's cameras. While its operator (a guard of the section) is alive, awake and at his
 * post the console is his: a player cannot use it. Once the operator is knocked out, killed, lured away or absent, a
 * player at the console can loop the cameras (they keep sweeping but report nothing for `loop` s, default
 * `DESK_LOOP_TIME`), and while they are looped switch them off until the section restarts. A section restart or a
 * section change puts them back. Host-authoritative; the co-op client reads the desk's state from its mirrored item
 * label (`deskModeOf`), so no wire change.
 */
import { hyp2 } from '../core/mathx';
import type { SecurityData } from '../security/data';

/** A security desk (map data, `SecurityData.desks`). */
export interface SecurityDesk {
  /** Unique desk id (design reference only; the item id is `deskItemId(index)`). */
  readonly id: string;
  /** Sector Ops section index (the cameras' `section`): the desk is usable only while that section is live. */
  readonly section: number;
  /** The console's plan point [x, z] (where the player stands to use it). */
  readonly at: readonly [number, number];
  /** Yaw (rad) the console faces. */
  readonly yaw: number;
  /** Floor height (m) the console stands on (default 0). */
  readonly y?: number;
  /** Camera ids it controls (cameras of the same section; at least one). */
  readonly cameras: readonly string[];
  /** The operator: an index into the section's `guards`. None: an unmanned desk. */
  readonly operator?: number;
  /** Loop window (s, default `DESK_LOOP_TIME`). */
  readonly loop?: number;
}

/** Default loop window (s). */
export const DESK_LOOP_TIME = 30;
/** Interact reach (m) and hold (s). */
export const DESK_REACH = 1.6;
export const DESK_HOLD = 1.5;
/** The operator counts as at his post within this plan distance (m) of the console. */
export const DESK_POST_RADIUS = 2.5;
/** The item box height above the desk's floor (m, a desk top). */
export const DESK_ITEM_Y = 0.9;

/** Desk modes (also the cameras' desk mode, `CameraUnit.desk`). */
export const DESK_NONE = 0;
export const DESK_LOOP = 1;
export const DESK_OFF = 2;
export type DeskMode = typeof DESK_NONE | typeof DESK_LOOP | typeof DESK_OFF;

/** What a use did. */
export const DESK_USED_LOOP = 1;
export const DESK_USED_OFF = 2;
export const DESK_REFUSE_MANNED = -1;
export const DESK_REFUSE_DONE = -2;
export const DESK_REFUSE_BAD = -3;

/** The console's prompt in each mode (the co-op client reads the mode back from it, `deskModeOf`). */
export const DESK_LABEL_LOOP = 'Loop cameras';
export const DESK_LABEL_OFF = 'Switch cameras off';
export const DESK_LABEL_DONE = 'Cameras off';
export const DESK_MANNED_LINE = 'The operator is on watch. Take him out first.';
/** (E6 fix) The refusal while the operator has not spawned yet (nobody to see at the desk). */
export const DESK_LOCKED_LINE = "The console is locked from the operator's chair.";
export const DESK_LOOP_LINE = 'Cameras looped.';
export const DESK_OFF_LINE = 'Cameras switched off.';
export const DESK_LOOP_END_LINE = 'Camera loop ended.';

export function deskItemId(i: number): string {
  return `desk-${i}`;
}

/** The desk index of an item id, or -1. */
export function deskIndexOf(id: string): number {
  if (!id.startsWith('desk-')) return -1;
  const n = Number(id.slice(5));
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

export function deskLabel(mode: number): string {
  return mode === DESK_LOOP ? DESK_LABEL_OFF : mode === DESK_OFF ? DESK_LABEL_DONE : DESK_LABEL_LOOP;
}

/** (co-op client) The desk mode its mirrored item label shows. */
export function deskModeOf(label: string): DeskMode {
  return label === DESK_LABEL_OFF ? DESK_LOOP : label === DESK_LABEL_DONE ? DESK_OFF : DESK_NONE;
}

/** A living, awake operator at his post (the console is his). No allocation. */
export function operatorAtPost(d: SecurityDesk, alive: boolean, ko: boolean, x: number, z: number): boolean {
  return alive && !ko && hyp2(x - d.at[0], z - d.at[1]) <= DESK_POST_RADIUS;
}

/**
 * A camera's mode from its other blinding (jammed, rebooting, section not live, a course console's flag: `blind`) and
 * its desk mode: blind or desk-off is off, a desk loop is looped, else online.
 */
export function deskCamMode(blind: boolean, desk: number): 'online' | 'looped' | 'off' {
  if (blind || desk === DESK_OFF) return 'off';
  return desk === DESK_LOOP ? 'looped' : 'online';
}

/** The desks' runtime (host / solo): mode and loop seconds left per desk. */
export class SectorDesks {
  readonly mode: Uint8Array;
  readonly left: Float32Array;

  constructor(readonly defs: readonly SecurityDesk[]) {
    this.mode = new Uint8Array(defs.length);
    this.left = new Float32Array(defs.length);
  }

  /**
   * A player uses desk `i`. `manned`: its operator is at his post. Returns `DESK_USED_LOOP` (none -> looped),
   * `DESK_USED_OFF` (looped -> off until a restart), or a refusal (`DESK_REFUSE_*`).
   */
  use(i: number, manned: boolean): number {
    const d = this.defs[i];
    if (!d) return DESK_REFUSE_BAD;
    if (manned) return DESK_REFUSE_MANNED;
    const m = this.mode[i]!;
    if (m === DESK_OFF) return DESK_REFUSE_DONE;
    if (m === DESK_LOOP) {
      this.mode[i] = DESK_OFF;
      this.left[i] = 0;
      return DESK_USED_OFF;
    }
    this.mode[i] = DESK_LOOP;
    this.left[i] = d.loop ?? DESK_LOOP_TIME;
    return DESK_USED_LOOP;
  }

  /** Fixed step: loop windows run down. Returns how many loops ended this step (their desks are back to none). No allocation. */
  step(dt: number): number {
    let ended = 0;
    for (let i = 0; i < this.defs.length; i++) {
      if (this.mode[i] !== DESK_LOOP) continue;
      const t = this.left[i]! - dt;
      if (t > 0) {
        this.left[i] = t;
        continue;
      }
      this.left[i] = 0;
      this.mode[i] = DESK_NONE;
      ended++;
    }
    return ended;
  }

  /** Every desk back to none (a section restart or change). True when one changed. */
  reset(): boolean {
    let changed = false;
    for (let i = 0; i < this.defs.length; i++) {
      if (this.mode[i] !== DESK_NONE) changed = true;
      this.mode[i] = DESK_NONE;
      this.left[i] = 0;
    }
    return changed;
  }
}

/**
 * Rule violations of the map's desks against its sections and cameras (empty = valid): unique ids, a section that
 * exists, at least one camera, each camera id a camera of the map in the desk's section, the operator a guard index of
 * that section, a positive loop window.
 */
export function checkDesks(defs: readonly { id: string; guards: readonly unknown[] }[], security: SecurityData | undefined): string[] {
  const out: string[] = [];
  const desks = security?.desks;
  if (!desks) return out;
  const seen = new Set<string>();
  for (const d of desks) {
    if (seen.has(d.id)) out.push(`desk ${d.id}: duplicate id`);
    seen.add(d.id);
    const s = defs[d.section];
    if (!Number.isInteger(d.section) || !s) out.push(`desk ${d.id}: section ${d.section} does not exist`);
    if (d.cameras.length === 0) out.push(`desk ${d.id}: no cameras`);
    for (const id of d.cameras) {
      const cam = security.devices.find((c) => c.kind === 'camera' && c.id === id);
      if (!cam) out.push(`desk ${d.id}: no camera '${id}'`);
      else if (cam.section !== d.section) out.push(`desk ${d.id}: camera '${id}' is in section ${cam.section ?? 'none'}, not ${d.section}`);
    }
    if (d.operator !== undefined && (!s || !Number.isInteger(d.operator) || d.operator < 0 || d.operator >= s.guards.length)) out.push(`desk ${d.id}: operator ${d.operator} is not a guard index of section ${d.section}`);
    if (d.loop !== undefined && !(d.loop > 0)) out.push(`desk ${d.id}: loop window is not positive`);
  }
  return out;
}
