import type { LightRegistry } from '../world/lights';

/**
 * (sector-redesign G22, check-slice2 item 5) What a Sector Ops section restart puts back besides the guards: every
 * fixed light (switched, shot, jammed) and every unlocked door (open or shut) as they were when the section began. Pure
 * state (no Babylon): the mode takes it when a section begins and applies it on a restart. Flashlights are left out
 * (the guards' torches belong to the guards). Locked doors are left to the mode (connector doors and team doors have
 * their own rules). Host and solo only: the co-op client mirrors doors from the snapshot; (slice L) the client then
 * takes the restored lamps from the host's `lamps` message (`net/lampSync.ts`).
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
  /** Per light id: its circuit (`LightDef.group`), as recorded by `take`. */
  private groups: Int32Array = new Int32Array(0);
  /** Per door index: 1 open, 0 shut. */
  private doors: Uint8Array = new Uint8Array(0);
  taken = false;

  /** Record the lights' and doors' state now (a section begins). */
  take<D extends ResetDoor>(reg: LightRegistry, doors: ResetDoors<D>): void {
    const ls = reg.lights;
    if (this.lights.length !== ls.length) {
      this.lights = new Int8Array(ls.length);
      this.groups = new Int32Array(ls.length);
    }
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      this.groups[i] = l.group;
      this.lights[i] = l.kind === 'flashlight' ? -1 : l.destroyed ? 2 : reg.baseOn(l) ? 1 : 0;
    }
    const ds = doors.list;
    if (this.doors.length !== ds.length) this.doors = new Uint8Array(ds.length);
    for (let i = 0; i < ds.length; i++) this.doors[i] = ds[i]!.target === 1 ? 1 : 0;
    this.taken = true;
  }

  /** (E4, I5) Record circuit `group`'s lamps as on (a timed window running when the section began is not the section's
   *  state): off (0) becomes on (1); shot (2) and flashlight (-1) entries are left alone. */
  markGroupOn(group: number): void {
    for (let i = 0; i < this.lights.length; i++) if (this.groups[i] === group && this.lights[i] === 0) this.lights[i] = 1;
  }

  /** Put them back (a section restart). Returns how many lights and doors changed (tests). */
  apply<D extends ResetDoor>(reg: LightRegistry, doors: ResetDoors<D>): { lights: number; doors: number } {
    let nl = 0;
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
    const nd = this.applyDoors(doors);
    return { lights: nl, doors: nd };
  }

  /**
   * (marlow-final S10, Michael's walk M3) The doors only, as recorded by `take`: every unlocked door open or shut as it
   * was, and uncracked (Marlow Yard's set restart; its lamps have their own reset); with `locked`, the locked ones too
   * (the course has just put its locks back as at the set start). Returns how many changed.
   */
  applyDoors<D extends ResetDoor>(doors: ResetDoors<D>, locked = false): number {
    if (!this.taken) return 0;
    let nd = 0;
    const ds = doors.list;
    for (let i = 0; i < ds.length && i < this.doors.length; i++) {
      const d = ds[i]!;
      if (d.anchor.locked && !locked) continue;
      let changed = false;
      if (d.cracked) changed = doors.crack(d, false) || changed;
      const open = this.doors[i] === 1;
      if ((d.target === 1) !== open) {
        doors.setOpen(d, open);
        changed = true;
      }
      if (changed) nd++;
    }
    return nd;
  }
}
