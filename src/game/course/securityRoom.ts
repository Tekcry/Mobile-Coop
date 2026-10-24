/**
 * Security room (sector-fixes S, pure, Babylon-free): a console a guard watches. Once its guard is down (knocked out or
 * killed) a player uses it to set its course flag, which switches off every camera whose `offFlag` is that flag until
 * the bay restarts (the bay's flags clear and its squad respawns). Not in Sector Ops (Michael, 2026-10-22).
 * (marlow-final N3) A console with `seconds` loops the cameras for that long only: the host clears the flag when the
 * window ends (the cameras come back on both machines), and the console re-arms `rearm` s later.
 */
import type { CourseLayout } from './courseDef';

/** A security room's console (sector-fixes S): usable once its guard is down; sets `flag`, which switches off every
 *  camera whose `offFlag` is that flag, until the bay restarts (or for `seconds`, N3). */
export interface SecurityConsole {
  /** Course device id (a pickup gate's `switchId`). */
  id: string;
  /** Squad slot id of the guard watching the monitors. */
  guard: string;
  /** Course flag the console sets (the cameras' `offFlag`). */
  flag: string;
  /**
   * (N3) The loop's length (s): the flag clears after it and the cameras come back. None: until the bay restarts. The
   * window's seconds left ride the pickup gate's `t` (`CourseState.gateTimer`, an objective step's `timer`).
   */
  seconds?: number;
  /** (N3) Seconds after a loop ends before the console takes another press (default 0). */
  rearm?: number;
}

export const CONSOLE_GUARD_UP = 'The guard is watching the monitors. Take him out first.';
export const CONSOLE_DONE = 'The cameras are already off.';
/** (N3) The timed console inside its re-arm time. */
export const CONSOLE_REARM = 'The console is rebooting. Try again in a moment.';

/** The console with device id `cid`, or null. No allocation. */
export function consoleFor(list: readonly SecurityConsole[] | undefined, cid: string): SecurityConsole | null {
  if (!list) return null;
  for (let i = 0; i < list.length; i++) if (list[i]!.id === cid) return list[i]!;
  return null;
}

/** Why the console refuses (guard still up first, then already done, then re-arming), or null: the press goes through. */
export function consoleRefusal(guardUp: boolean, done: boolean, rearming = false): string | null {
  if (guardUp) return CONSOLE_GUARD_UP;
  if (done) return CONSOLE_DONE;
  if (rearming) return CONSOLE_REARM;
  return null;
}

/** A camera switched off by its console: it names an `offFlag` and that flag is set. No allocation here (`has` is the
 *  caller's), and no `has` call for a camera without an `offFlag`. */
export function cameraOff(def: { offFlag?: string }, has: ((f: string) => boolean) | undefined): boolean {
  const f = def.offFlag;
  return f !== undefined && has !== undefined && has(f);
}

/**
 * (N3, gap list row 2) The camera mode a console's flag puts a camera in: 'looped' (recorded footage: the view fade and
 * the LED already draw it, cameraCue.ts / securityView.ts) rather than 'off'. For the device owner (`ctDevices.ts`
 * sets `off` today): `c.setMode(fOff ? consoleCamMode() : 'off')`, and on the way back treat 'looped' like 'off'.
 */
export function consoleCamMode(): 'looped' {
  return 'looped';
}

/** Rule violations: device, squad slot and a pickup gate on the console setting `flag` must exist; a flag no camera
 *  names is an error too; a timed console's `seconds` above 0 and `rearm` not below 0. Empty = valid. */
export function consoleErrors(lay: CourseLayout, cameras: readonly { id: string; offFlag?: string }[]): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const c of lay.consoles ?? []) {
    if (seen.has(c.id)) errs.push(`${c.id}: duplicate console`);
    seen.add(c.id);
    if (!lay.devices[c.id]) errs.push(`${c.id}: no course device`);
    if (!lay.squads[c.guard]) errs.push(`${c.id}: no squad slot '${c.guard}'`);
    if (c.seconds !== undefined && !(c.seconds > 0)) errs.push(`${c.id}: seconds must be above 0`);
    if (c.rearm !== undefined && !(c.rearm >= 0)) errs.push(`${c.id}: rearm below 0`);
    let gateBay = -1;
    lay.def.bays.forEach((b, i) => {
      for (const g of b.gates) if (g.kind === 'pickup' && g.switchId === c.id && g.flag === c.flag && !g.perPlayer) gateBay = i;
    });
    if (gateBay < 0) errs.push(`${c.id}: no shared pickup gate on it setting '${c.flag}'`);
    // the guard is the gate's bay's squad: a bay restart clears the flag and brings him back together
    else if (!lay.def.bays[gateBay]!.squad.includes(c.guard)) errs.push(`${c.id}: guard '${c.guard}' is not in the squad of bay '${lay.def.bays[gateBay]!.id}'`);
    if (!cameras.some((cam) => cam.offFlag === c.flag)) errs.push(`${c.id}: no camera has offFlag '${c.flag}'`);
  }
  return errs;
}
