/**
 * Security room (sector-fixes S, pure, Babylon-free): a console a guard watches. Once its guard is down (knocked out or
 * killed) a player uses it to set its course flag, which switches off every camera whose `offFlag` is that flag until
 * the bay restarts (the bay's flags clear and its squad respawns). Not in Sector Ops (Michael, 2026-10-22).
 */
import type { CourseLayout } from './courseDef';

/** A security room's console (sector-fixes S): usable once its guard is down; sets `flag`, which switches off every
 *  camera whose `offFlag` is that flag, until the bay restarts. */
export interface SecurityConsole {
  /** Course device id (a pickup gate's `switchId`). */
  id: string;
  /** Squad slot id of the guard watching the monitors. */
  guard: string;
  /** Course flag the console sets (the cameras' `offFlag`). */
  flag: string;
}

export const CONSOLE_GUARD_UP = 'The guard is watching the monitors. Take him out first.';
export const CONSOLE_DONE = 'The cameras are already off.';

/** The console with device id `cid`, or null. No allocation. */
export function consoleFor(list: readonly SecurityConsole[] | undefined, cid: string): SecurityConsole | null {
  if (!list) return null;
  for (let i = 0; i < list.length; i++) if (list[i]!.id === cid) return list[i]!;
  return null;
}

/** Why the console refuses (guard still up first, then already done), or null: the press goes through. */
export function consoleRefusal(guardUp: boolean, done: boolean): string | null {
  if (guardUp) return CONSOLE_GUARD_UP;
  if (done) return CONSOLE_DONE;
  return null;
}

/** A camera switched off by its console: it names an `offFlag` and that flag is set. No allocation here (`has` is the
 *  caller's), and no `has` call for a camera without an `offFlag`. */
export function cameraOff(def: { offFlag?: string }, has: ((f: string) => boolean) | undefined): boolean {
  const f = def.offFlag;
  return f !== undefined && has !== undefined && has(f);
}

/** Rule violations: device, squad slot and a pickup gate on the console setting `flag` must exist; a flag no camera
 *  names is an error too. Empty = valid. */
export function consoleErrors(lay: CourseLayout, cameras: readonly { id: string; offFlag?: string }[]): string[] {
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const c of lay.consoles ?? []) {
    if (seen.has(c.id)) errs.push(`${c.id}: duplicate console`);
    seen.add(c.id);
    if (!lay.devices[c.id]) errs.push(`${c.id}: no course device`);
    if (!lay.squads[c.guard]) errs.push(`${c.id}: no squad slot '${c.guard}'`);
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
