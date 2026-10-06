/**
 * Where carried weapons live on the body (pure; unit-tested). Every weapon in the loadout has a slot of
 * its own, so all of them stay visible:
 *  - long guns (rifle, shotgun, sniper) vertically on the back, muzzle up: one in the centre, two left and
 *    right, three left / centre (stood off further) / right;
 *  - compact guns (SMG) on a side sling at the left hip, muzzle down;
 *  - the pistol in a holster low on the right thigh;
 *  - grenades in belt pouches on the front left (`GRENADE_POUCHES`).
 * A weapon whose natural slot is taken falls back to a free back slot, then the sling.
 */
export type CarrySlot = 'backL' | 'backC' | 'backR' | 'sling' | 'thigh';
export type CarryKind = 'long' | 'compact' | 'pistol';

export const CARRY_SLOTS: readonly CarrySlot[] = ['backL', 'backC', 'backR', 'sling', 'thigh'];
/** Belt pouches shown (one grenade each while carried). */
export const GRENADE_POUCHES = 3;
/** Back carry: muzzles splay out from the spine by this much (rad), well inside the 10 deg bound. */
export const BACK_SPLAY = 0.08;

export function carryKind(cls: string): CarryKind {
  return cls === 'pistol' ? 'pistol' : cls === 'smg' ? 'compact' : 'long';
}

export interface CarryItem {
  cls: string;
  /** Overall length (m): the longest long gun takes the centre when three share the back. */
  length: number;
}

/** Slot per loadout entry (same order), all distinct; null only if the body is full. */
export function assignCarrySlots(items: readonly CarryItem[]): (CarrySlot | null)[] {
  const out: (CarrySlot | null)[] = items.map(() => null);
  const used = new Set<CarrySlot>();
  const take = (i: number, s: CarrySlot): boolean => {
    if (used.has(s)) return false;
    used.add(s);
    out[i] = s;
    return true;
  };
  // long guns: by count, longest in the centre when there are three
  const longs = items.map((_, i) => i).filter((i) => carryKind(items[i]!.cls) === 'long');
  if (longs.length === 1) take(longs[0]!, 'backC');
  else if (longs.length === 2) {
    take(longs[0]!, 'backL');
    take(longs[1]!, 'backR');
  } else if (longs.length >= 3) {
    const byLen = [...longs].sort((a, b) => items[b]!.length - items[a]!.length);
    take(byLen[0]!, 'backC');
    const rest = longs.filter((i) => i !== byLen[0]);
    take(rest[0]!, 'backL');
    take(rest[1]!, 'backR');
  }
  for (let i = 0; i < items.length; i++) {
    if (out[i] !== null) continue;
    const k = carryKind(items[i]!.cls);
    const order: CarrySlot[] = k === 'pistol' ? ['thigh', 'sling'] : k === 'compact' ? ['sling', 'backR', 'backL', 'backC'] : ['backR', 'backL', 'backC', 'sling'];
    for (const s of order) if (take(i, s)) break;
  }
  return out;
}

/** Back slots carry muzzle up along the spine; the rest hang muzzle down. */
export function isBackSlot(s: CarrySlot): boolean {
  return s === 'backL' || s === 'backC' || s === 'backR';
}
