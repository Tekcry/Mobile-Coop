/**
 * (CT prototype A3, G19, G97; G5) The Chaos Theory door options, Babylon-free. Since G5 they are rows of the one
 * context menu (`contextMenu.ts`): at a closed, unlocked door OPEN DOOR, OPEN DOOR STEALTH (the door peek: a slow
 * crack, the stick pushes it further; only when the peek is on offer), BASH DOOR (loud; knocks out a guard right
 * behind the door) and OPTIC CABLE (`game/opticSystem.ts`: the view under the door). An open door's item lists CLOSE DOOR. Locked doors list
 * nothing (no lock picking or breaking in the game yet, G180 note).
 */

import { CTX_BACK, type ContextMenu } from './contextMenu';

export type DoorOpt = 'open' | 'stealth' | 'bash' | 'optic';

/** The row kind of the door set in the context menu. */
export const DOOR_KIND = 'door';

export const DOOR_OPT_LABEL: Readonly<Record<DoorOpt, string>> = {
  open: 'Open door',
  stealth: 'Open door stealth',
  bash: 'Bash door',
  optic: 'Optic cable',
};

/** Bash: a guard within this behind the leaf (m, along the door's normal on the far side) and within the leaf's span
 *  (+ slack along it) is knocked out. Starting values (G10). */
export const DOOR_BASH = { behind: 1.3, span: 0.3 } as const;

/** The options for a closed, unlocked door; `stealth` only when the door peek is on offer here. (marlow-final N9) A
 *  sliding door (`slide`) lists Open only: no stealth crack, bash or optic. */
export function doorMenuOptions(stealthOk: boolean, out: DoorOpt[] = [], slide = false): DoorOpt[] {
  out.length = 0;
  out.push('open');
  if (slide) return out;
  if (stealthOk) out.push('stealth');
  out.push('bash', 'optic');
  return out;
}

/** Add the door set of door `door` to the menu (CT order; `latch`: a scripted tap opens the list, as before G5). */
export function addDoorRows(m: ContextMenu, door: number, stealthOk: boolean, opts: DoorOpt[], slide = false): void {
  doorMenuOptions(stealthOk, opts, slide);
  for (let i = 0; i < opts.length; i++) {
    const o = opts[i]!;
    m.add(DOOR_KIND, o, door, DOOR_OPT_LABEL[o], 0, true);
  }
}

/** A guard (x, z) is behind the door for a body on the `side` (+1 / -1 of the leaf plane): on the far side within
 *  `DOOR_BASH.behind`, inside the leaf's span along it. `a` = anchor { hinge, yaw, width }. */
export function guardBehindDoor(a: { hinge: { x: number; z: number }; yaw: number; width: number }, side: number, x: number, z: number): boolean {
  const tx = Math.sin(a.yaw);
  const tz = Math.cos(a.yaw);
  const nx = tz;
  const nz = -tx;
  const rx = x - a.hinge.x;
  const rz = z - a.hinge.z;
  const across = (rx * nx + rz * nz) * -side; // > 0 on the far side
  const along = rx * tx + rz * tz;
  return across > 0 && across <= DOOR_BASH.behind && along >= -DOOR_BASH.span && along <= a.width + DOOR_BASH.span;
}

/** (G5) The door set as seen from outside (tests, tools): open while the held / latched list shows a door set. */
export class DoorMenuView {
  /** The door options listed this step (in row order). */
  readonly opts: DoorOpt[] = [];
  constructor(private m: ContextMenu) {}

  get open(): boolean {
    return this.m.state === 'active' && this.m.has(DOOR_KIND);
  }

  /** The highlighted door option's index in `opts` (-1: BACK TO GAME or another row). */
  get sel(): number {
    const m = this.m;
    if (m.state !== 'active' || m.sel === CTX_BACK) return -1;
    const o = m.opts[m.sel];
    return o && o.kind === DOOR_KIND ? this.opts.indexOf(o.opt as DoorOpt) : -1;
  }
}
