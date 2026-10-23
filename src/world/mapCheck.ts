import type { MapLayout } from './mapDef';
import type { SectorDef } from '../game/sectors';
import { hyp2 } from '../core/mathx';

/**
 * Map data rules (pure). Returns one message per broken rule, an empty list when the layout is clean.
 * - No ammo pickups inside sections: `MapLayout.pickups` (and the sector `S*_PICKUPS` lists feeding it) hold no ammo
 *   (Michael, 2026-10-23: ammo comes only from the starting loadout and, later, a between-section weapons crate).
 *   The weapons crate (`SectorDef.crate`) is not a pickup, so it does not trip this rule (`checkSectorCrates` checks it).
 */
export function checkMapLayout(id: string, layout: Pick<MapLayout, 'pickups'>): string[] {
  const out: string[] = [];
  for (const [i, p] of layout.pickups.entries()) {
    if ((p.kind as string) === 'ammo') out.push(`${id}: ammo pickup ${i} at (${p.pos.x}, ${p.pos.z}) inside a section: no ammo within sections`);
  }
  return out;
}

/**
 * (E9-crate A109) The weapons crate placement rules (pure plan and height rules; the walkable-nav-cell rule is a unit
 * test). Each section needs a crate (`SectorDef.crate`) that is on the start's floor (|y - start.y| <= 0.3), 1.0-3.0 m
 * in plan from `start`, and at least 1.2 m from every connector's `nearAt` / `farAt` (all sections). The yaw facing open
 * floor is checked by the nav unit test and the e2e. Returns one message per broken rule.
 */
export function checkSectorCrates(id: string, sectors: readonly SectorDef[]): string[] {
  const out: string[] = [];
  const doors: { s: string; k: string; p: readonly [number, number] }[] = [];
  for (const s of sectors) {
    if (s.connector?.nearAt) doors.push({ s: s.id, k: 'nearAt', p: s.connector.nearAt });
    if (s.connector?.farAt) doors.push({ s: s.id, k: 'farAt', p: s.connector.farAt });
  }
  for (const s of sectors) {
    const c = s.crate;
    if (!c) {
      out.push(`${id}: section ${s.id} has no weapons crate`);
      continue;
    }
    if (Math.abs(c.at[1] - s.start.y) > 0.3) out.push(`${id}: section ${s.id} crate is at y ${c.at[1]}, not on the start floor (y ${s.start.y})`);
    const d = hyp2(c.at[0] - s.start.x, c.at[2] - s.start.z);
    if (d < 1 || d > 3) out.push(`${id}: section ${s.id} crate is ${d.toFixed(2)} m from the start, must be 1.0-3.0 m`);
    for (const q of doors) {
      const dd = hyp2(c.at[0] - q.p[0], c.at[2] - q.p[1]);
      if (dd < 1.2) out.push(`${id}: section ${s.id} crate is ${dd.toFixed(2)} m from ${q.s} ${q.k} (${q.p[0]}, ${q.p[1]}), must be at least 1.2 m`);
    }
  }
  return out;
}
