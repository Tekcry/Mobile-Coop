import type { MapLayout } from './mapDef';

/**
 * Map data rules (pure). Returns one message per broken rule, an empty list when the layout is clean.
 * - No ammo pickups inside sections: `MapLayout.pickups` (and the sector `S*_PICKUPS` lists feeding it) hold no ammo
 *   (Michael, 2026-10-23: ammo comes only from the starting loadout and, later, a between-section weapons crate).
 *   The between-section crate refill (once per player) comes in a later slice with its own data field, so it will not
 *   trip this rule.
 */
export function checkMapLayout(id: string, layout: Pick<MapLayout, 'pickups'>): string[] {
  const out: string[] = [];
  for (const [i, p] of layout.pickups.entries()) {
    if ((p.kind as string) === 'ammo') out.push(`${id}: ammo pickup ${i} at (${p.pos.x}, ${p.pos.z}) inside a section: no ammo within sections`);
  }
  return out;
}
