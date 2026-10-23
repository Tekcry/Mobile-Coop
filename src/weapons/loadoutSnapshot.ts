/**
 * (sector-restart, M9) The loadout at a checkpoint (pure, unit-tested): every gun's magazine and reserve, and the
 * gadgets carried with the one selected. Taken when a Sector Ops section begins; a checkpoint restart puts it back and
 * reloads every gun from its reserve (a full magazine, no reload animation), so the retry starts with the kit the section
 * started with. The attachments (the suppressor) are part of a gun's slot and never change in play, so they come back
 * with it. Rare calls (a section start, a restart): not a hot path.
 */

/** A gun's ammo as `PlayerWeapons` keeps it (`WeaponSlot`). */
export interface AmmoSlot {
  mag: number;
  reserve: number;
  /** (sd-rounds) Quiet rounds left (absent on a gun that has none). */
  sd?: number;
  readonly stats: { readonly magSize: number };
}

/** The gadgets carried (`GadgetInventory`). */
export interface GadgetCarry<K extends string> {
  readonly counts: Record<K, number>;
  selected: K;
}

export class LoadoutSnapshot<K extends string = string> {
  readonly mags: number[] = [];
  readonly reserves: number[] = [];
  /** (sd-rounds) Quiet rounds left per gun (Infinity: unlimited). */
  readonly sds: number[] = [];
  readonly counts = {} as Record<K, number>;
  selected: K | null = null;
  /** A snapshot has been taken (a restore before one does nothing). */
  taken = false;

  /** Record the loadout as it is now. */
  take(slots: readonly AmmoSlot[], gadgets: GadgetCarry<K>): void {
    this.mags.length = 0;
    this.reserves.length = 0;
    this.sds.length = 0;
    for (let i = 0; i < slots.length; i++) {
      this.mags.push(slots[i]!.mag);
      this.reserves.push(slots[i]!.reserve);
      this.sds.push(slots[i]!.sd ?? Infinity);
    }
    for (const k in gadgets.counts) this.counts[k] = gadgets.counts[k];
    this.selected = gadgets.selected;
    this.taken = true;
  }

  /**
   * Put the snapshot back: each gun's ammo as it was, then reloaded from its reserve (the rounds the snapshot held are
   * kept: a short magazine is topped up from the reserve, never from nowhere); the gadget counts and the selection.
   * False (nothing changed) before a snapshot was taken.
   */
  restore(slots: AmmoSlot[], gadgets: GadgetCarry<K>, infinite = false): boolean {
    if (!this.taken) return false;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]!;
      const mag = this.mags[i];
      const reserve = this.reserves[i];
      if (mag === undefined || reserve === undefined) continue;
      s.mag = mag;
      s.reserve = reserve;
      const sd = this.sds[i];
      if (sd !== undefined && s.sd !== undefined) s.sd = sd;
      const need = s.stats.magSize - s.mag;
      if (need <= 0) continue;
      const take = infinite ? need : Math.min(need, s.reserve);
      s.mag += take;
      if (!infinite) s.reserve -= take;
    }
    for (const k in this.counts) gadgets.counts[k] = this.counts[k];
    if (this.selected !== null) gadgets.selected = this.selected;
    return true;
  }
}
