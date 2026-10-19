/**
 * (CT prototype A4, G23, G43, G180; G5) The Chaos Theory grab options, Babylon-free. Since G5 they are the rows of
 * the one context menu (`contextMenu.ts`) while a guard is held: Knock out, Kill, Carry (knock out and shoulder the
 * body), the stub Force to device (no scanner hook yet) and Interrogate (G7: the free hand at his jaw for 1.5 s, the
 * hold goes on). Hold A, pick, let go; B (crouch) or Y lets the guard go. The game reads the run row and acts.
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

/** Add the grab set to the menu (`ref` = the index in `GRAB_OPTS`). */
export function addGrabRows(m: ContextMenu): void {
  for (let i = 0; i < GRAB_OPTS.length; i++) {
    const o = GRAB_OPTS[i]!;
    m.add(GRAB_KIND, o, i, GRAB_OPT_LABEL[o]);
  }
}

/** (F1b) What the held-guard list passes through to the player while it is not held open: the draw / aim / fire
 *  actions (the move is copied too). */
export const GRAB_PASS: readonly ButtonAction[] = ['ads', 'draw', 'fire', 'altFire', 'reload', 'zoom', 'shoulderSwap'];

/**
 * (G5) The grab set as seen from outside (tests, tools): `open` while the grab rows are listed (passive or held),
 * `sel` the highlighted grab option; writing `sel` opens the list latched on that row (the next A press runs it).
 */
export class GrabMenuView {
  readonly opts: readonly GrabOpt[] = GRAB_OPTS;
  constructor(private m: ContextMenu) {}

  get open(): boolean {
    return this.m.state !== 'none' && this.m.has(GRAB_KIND);
  }

  get sel(): number {
    const m = this.m;
    if (m.state !== 'active' || m.sel === CTX_BACK) return 0;
    const o = m.opts[m.sel];
    return o && o.kind === GRAB_KIND ? o.ref : 0;
  }

  set sel(i: number) {
    const o = GRAB_OPTS[i];
    if (!o) return;
    const at = this.m.find(GRAB_KIND, o, i);
    if (at >= 0) this.m.select(at);
  }

  labels(out: string[] = []): string[] {
    out.length = 0;
    for (const o of this.opts) out.push(GRAB_OPT_LABEL[o]);
    return out;
  }
}
