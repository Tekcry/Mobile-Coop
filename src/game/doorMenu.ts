/**
 * (CT prototype A3, G19, G97) The Chaos Theory door context menu, Babylon-free. A at a closed door opens a short list
 * (the player stands still): Open, Stealth open (the door peek: a slow crack, the stick pushes it further), Bash (loud;
 * knocks out a guard right behind the door) and the Optic cable (a stub: not built yet). The game reads `pick()` and
 * acts; the HUD draws `labels()`. Locked doors get no menu (no lock picking or breaking in the game yet, G180 note).
 */

export type DoorOpt = 'open' | 'stealth' | 'bash' | 'optic';

export const DOOR_OPT_LABEL: Readonly<Record<DoorOpt, string>> = {
  open: 'Open',
  stealth: 'Stealth open',
  bash: 'Bash',
  optic: 'Optic cable (not yet)',
};

/** Bash: a guard within this behind the leaf (m, along the door's normal on the far side) and within the leaf's span
 *  (+ slack along it) is knocked out. Starting values (G10). */
export const DOOR_BASH = { behind: 1.3, span: 0.3 } as const;

/** The options for a closed, unlocked door; `stealth` only when the door peek is on offer here. */
export function doorMenuOptions(stealthOk: boolean, out: DoorOpt[] = []): DoorOpt[] {
  out.length = 0;
  out.push('open');
  if (stealthOk) out.push('stealth');
  out.push('bash', 'optic');
  return out;
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

export class DoorMenu {
  open = false;
  door = -1;
  sel = 0;
  readonly opts: DoorOpt[] = [];

  show(door: number, stealthOk: boolean): void {
    this.open = true;
    this.door = door;
    this.sel = 0;
    doorMenuOptions(stealthOk, this.opts);
  }

  /** Move the selection (wraps). */
  move(dir: number): void {
    if (!this.open || !this.opts.length) return;
    this.sel = (this.sel + (dir > 0 ? 1 : -1) + this.opts.length) % this.opts.length;
  }

  /** The highlighted option; closes the menu. */
  pick(): DoorOpt | null {
    if (!this.open) return null;
    const o = this.opts[this.sel] ?? null;
    this.close();
    return o;
  }

  close(): void {
    this.open = false;
    this.door = -1;
  }

  labels(out: string[] = []): string[] {
    out.length = 0;
    for (const o of this.opts) out.push(DOOR_OPT_LABEL[o]);
    return out;
  }
}
