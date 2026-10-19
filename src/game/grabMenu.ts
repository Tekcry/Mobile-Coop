/**
 * (CT prototype A4, G23, G43, G180; G5; Michael 2026-10-20 08:10 / 08:20) The held-guard options, Babylon-free.
 * Michael: "once they are grabbed it can show interrogate (if they have information), and rt or Lt to either knock out
 * or kill, and aim button to aim pistol while holding them. It shouldn't have kill/knock out/carry in the list." and
 * "The guard cannot be let go either, only knocked out. Killed, or used as human shield (aiming pistol)".
 * So the context menu (`contextMenu.ts`) lists only Interrogate while a guard is held, and only when he has information
 * (`hasInfo`: no guard carries any yet, so the list is empty); RT kills and LT knocks out (not aiming); the aim draws the
 * pistol over his shoulder (the human shield). Nothing lets him go. The picks keep their ids (`GRAB_OPTS`, the
 * takedown's `menuPick`) for scripts and tools (`GrabMenuView.sel`); Carry (knock out, then shoulder) and the stub
 * Force to device are reachable only that way.
 */

import type { ButtonAction } from '../input/actions';
import { CTX_BACK, type ContextMenu } from './contextMenu';

export type GrabOpt = 'knockout' | 'kill' | 'carry' | 'device' | 'interrogate';

/** The row kind of the grab set in the context menu. */
export const GRAB_KIND = 'grab';

export const GRAB_OPT_LABEL: Readonly<Record<GrabOpt, string>> = {
  knockout: 'Knock out',
  kill: 'Kill',
  carry: 'Carry',
  device: 'Force to device (not yet)',
  interrogate: 'Interrogate',
};

/** Options that work today. */
export function grabOptReady(o: GrabOpt): boolean {
  return o === 'knockout' || o === 'kill' || o === 'carry' || o === 'interrogate';
}

export const GRAB_OPTS: readonly GrabOpt[] = ['knockout', 'kill', 'carry', 'device', 'interrogate'];

/** The index of Interrogate in `GRAB_OPTS` (its row's `ref`). */
export const GRAB_INTERROGATE = GRAB_OPTS.indexOf('interrogate');

/** A held guard has information to give. No guard data carries any yet (`info` is set nowhere): always false today. */
export function hasInfo(v: object): boolean {
  return (v as { info?: boolean }).info === true;
}

/** Add the held guard's rows: Interrogate, only when he has information (Michael 08:10). */
export function addGrabRows(m: ContextMenu, info: boolean): void {
  if (info) m.add(GRAB_KIND, 'interrogate', GRAB_INTERROGATE, GRAB_OPT_LABEL.interrogate);
}

/** The held guard's trigger finisher (Michael 08:10, CT: RT lethal, LT non-lethal at close range): not aiming only. */
export function grabTriggerPick(fire: boolean, altFire: boolean, aiming: boolean): GrabOpt | null {
  if (aiming) return null;
  if (fire) return 'kill';
  if (altFire) return 'knockout';
  return null;
}

/** (F1b) What the held-guard list passes through to the player while it is not held open: the draw / aim / fire
 *  actions (the move is copied too). */
export const GRAB_PASS: readonly ButtonAction[] = ['ads', 'draw', 'fire', 'altFire', 'reload', 'zoom', 'shoulderSwap'];

/**
 * (G5) The held guard as seen from outside (tests, tools): `open` while a guard is held and a pick may run
 * (`holding`, set by the game each step); writing `sel` arms that pick (`GRAB_OPTS` index) and the next A press runs it
 * (`takePick`), whatever the list shows. Scripts reach Knock out, Kill, Carry, the stub and Interrogate this way.
 */
export class GrabMenuView {
  readonly opts: readonly GrabOpt[] = GRAB_OPTS;
  /** A guard is held and a pick may run (the takedown's `menuReady`). */
  holding = false;
  private armed = -1;
  constructor(private m: ContextMenu) {}

  get open(): boolean {
    return this.holding;
  }

  get sel(): number {
    if (this.armed >= 0) return this.armed;
    const m = this.m;
    if (m.state !== 'active' || m.sel === CTX_BACK) return 0;
    const o = m.opts[m.sel];
    return o && o.kind === GRAB_KIND ? o.ref : 0;
  }

  set sel(i: number) {
    this.armed = GRAB_OPTS[i] ? i : -1;
  }

  /** The armed pick on an A press (then disarmed), else null; disarmed whenever no guard is held. */
  takePick(pressed: boolean): GrabOpt | null {
    if (!this.holding) this.armed = -1;
    if (this.armed < 0 || !pressed) return null;
    const o = GRAB_OPTS[this.armed]!;
    this.armed = -1;
    return o;
  }

  labels(out: string[] = []): string[] {
    out.length = 0;
    for (const o of this.opts) out.push(GRAB_OPT_LABEL[o]);
    return out;
  }
}
