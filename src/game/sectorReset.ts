import type { LightRegistry } from '../world/lights';

/**
 * (sector-redesign G22, check-slice2 item 5) What a Sector Ops section restart puts back besides the guards: every
 * fixed light (switched, shot, jammed) and every unlocked door (open or shut) as they were when the section began. Pure
 * state (no Babylon): the mode takes it when a section begins and applies it on a restart. Flashlights are left out
 * (the guards' torches belong to the guards). Locked doors are left to the mode (connector doors and team doors have
 * their own rules). Host and solo only: the co-op client mirrors doors from the snapshot; lamps in Sector co-op are
 * not mirrored yet (ENGINE G8).
 */

/** The door fields the snapshot reads and the door calls it needs (`Doors`, stubbed in tests). */
export interface ResetDoor {
  readonly anchor: { readonly locked: boolean };
  target: 0 | 1;
  cracked: boolean;
}
export interface ResetDoors<D extends ResetDoor> {
  readonly list: readonly D[];
  setOpen(d: D, open: boolean): void;
  crack(d: D, on: boolean): boolean;
}

export class SectionStartState {
  /** Per light id: 0 off, 1 on, 2 shot out; -1 not recorded (a flashlight). */
  private lights: Int8Array = new Int8Array(0);
  /** Per door index: 1 open, 0 shut. */
  private doors: Uint8Array = new Uint8Array(0);
  taken = false;

  /** Record the lights' and doors' state now (a section begins). */
  take<D extends ResetDoor>(reg: LightRegistry, doors: ResetDoors<D>): void {
    const ls = reg.lights;
    if (this.lights.length !== ls.length) this.lights = new Int8Array(ls.length);
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      this.lights[i] = l.kind === 'flashlight' ? -1 : l.destroyed ? 2 : reg.baseOn(l) ? 1 : 0;
    }
    const ds = doors.list;
    if (this.doors.length !== ds.length) this.doors = new Uint8Array(ds.length);
    for (let i = 0; i < ds.length; i++) this.doors[i] = ds[i]!.target === 1 ? 1 : 0;
    this.taken = true;
  }

  /** Put them back (a section restart). Returns how many lights and doors changed (tests). */
  apply<D extends ResetDoor>(reg: LightRegistry, doors: ResetDoors<D>): { lights: number; doors: number } {
    let nl = 0;
    let nd = 0;
    if (!this.taken) return { lights: 0, doors: 0 };
    const ls = reg.lights;
    for (let i = 0; i < ls.length && i < this.lights.length; i++) {
      const s = this.lights[i]!;
      if (s < 0) continue;
      const l = ls[i]!;
      const was = l.destroyed ? 2 : reg.baseOn(l) ? 1 : 0;
      if (was === s) continue;
      reg.resetTo(l.id, s === 1, s === 2);
      nl++;
    }
    const ds = doors.list;
    for (let i = 0; i < ds.length && i < this.doors.length; i++) {
      const d = ds[i]!;
      if (d.anchor.locked) continue;
      let changed = false;
      if (d.cracked) changed = doors.crack(d, false) || changed;
      const open = this.doors[i] === 1;
      if ((d.target === 1) !== open) {
        doors.setOpen(d, open);
        changed = true;
      }
      if (changed) nd++;
    }
    return { lights: nl, doors: nd };
  }
}
