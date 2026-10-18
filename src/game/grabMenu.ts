/**
 * (CT prototype A4, G23, G43, G178) The Chaos Theory grab menu, Babylon-free. The ground takedown button grabs a guard
 * from behind; while holding him this short list opens in the HUD: Knock out, Kill, Carry (knock out and shoulder the
 * body), and the stubs Force to device (no scanner hook yet) and Interrogate (later). The game reads `pick()` and
 * acts; the HUD draws `labels()`. Stub entries do nothing but say so (the menu stays open).
 */

import type { ButtonAction } from '../input/actions';

export type GrabOpt = 'knockout' | 'kill' | 'carry' | 'device' | 'interrogate';

export const GRAB_OPT_LABEL: Readonly<Record<GrabOpt, string>> = {
  knockout: 'Knock out',
  kill: 'Kill',
  carry: 'Carry',
  device: 'Force to device (not yet)',
  interrogate: 'Interrogate (later)',
};

/** Options that work today. */
export function grabOptReady(o: GrabOpt): boolean {
  return o === 'knockout' || o === 'kill' || o === 'carry';
}

export const GRAB_OPTS: readonly GrabOpt[] = ['knockout', 'kill', 'carry', 'device', 'interrogate'];

export class GrabMenu {
  open = false;
  sel = 0;
  readonly opts: readonly GrabOpt[] = GRAB_OPTS;

  show(): void {
    this.open = true;
    this.sel = 0;
  }

  move(dir: number): void {
    if (!this.open) return;
    this.sel = (this.sel + (dir > 0 ? 1 : -1) + this.opts.length) % this.opts.length;
  }

  /** The highlighted option. A working option closes the menu; a stub leaves it open and is returned for its message. */
  pick(): GrabOpt | null {
    if (!this.open) return null;
    const o = this.opts[this.sel] ?? null;
    if (o && grabOptReady(o)) this.close();
    return o;
  }

  close(): void {
    this.open = false;
  }

  labels(out: string[] = []): string[] {
    out.length = 0;
    for (const o of this.opts) out.push(GRAB_OPT_LABEL[o]);
    return out;
  }
}


/** (F1b) What the held-guard menu passes through to the player: the draw / aim / fire actions (the move is copied too). */
export const GRAB_PASS: readonly ButtonAction[] = ['ads', 'draw', 'fire', 'altFire', 'reload', 'zoom', 'shoulderSwap'];

/** The slice of the input a menu step reads. */
export interface MenuNavInput {
  pressed(a: ButtonAction): boolean;
  readonly move: { readonly x: number; readonly y: number };
}

/**
 * (F1b) The menu selection step, +1 down / -1 up / 0 none. D-pad up / down (the speed actions: also the wheel and = / -)
 * always move the pick. The stick / arrow taps (`uiUp` / `uiDown`) move it only when the operator is not walking
 * (`walking` menus: the held-guard menu keeps the stick for walking, so a pushed stick never also navigates).
 */
export function menuNavDir(inp: MenuNavInput, walking: boolean): number {
  const still = !walking || Math.abs(inp.move.x) + Math.abs(inp.move.y) < 0.25;
  if (inp.pressed('speedDown') || (still && inp.pressed('uiDown'))) return 1;
  if (inp.pressed('speedUp') || (still && inp.pressed('uiUp'))) return -1;
  return 0;
}
