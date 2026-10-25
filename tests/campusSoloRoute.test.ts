/**
 * (sector-batch, G280, M17) Every Saltmarsh Park section with team doors keeps a declared route a solo player can take
 * past them (`checkSoloRoutes`). On master: S4's cage pair gate and S5's pair gate; S1-S3 have none yet (campus v2, J17).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { doorFinder } from '../src/game/sectorStage';
import { checkSoloRoutes, teamDoorPoints } from '../src/game/sectorSolo';
import type { SectorRoute } from '../src/game/sectors';

const b = new LevelBuilder();
campusOps.build(b, 0);
const doorAt = doorFinder(b.anchors.doors);

describe('sector-batch: Saltmarsh Park solo routes past team doors (G280)', () => {
  it('the live campus has team doors to check', () => {
    expect(CAMPUS_SECTORS.reduce((n, s) => n + teamDoorPoints(s).length, 0)).toBeGreaterThan(0);
  });

  it('every section with team doors keeps a route past them', () => {
    expect(checkSoloRoutes(CAMPUS_SECTORS, doorAt)).toEqual([]);
  });

  // No live route crosses a gate at its floor (S4's high route passes over the cage), so the bite uses one route
  // straight across each section's first team door, at the leaf's floor (S5's gate is at y 4.2).
  it('the rule bites: a section whose only route goes through a team door fails', () => {
    const withDoors = CAMPUS_SECTORS.filter((s) => teamDoorPoints(s).length > 0);
    expect(withDoors.length).toBeGreaterThan(0);
    for (const s of withDoors) {
      const [x, z] = teamDoorPoints(s)[0]!;
      const d = doorAt(x, z)!;
      const nx = Math.cos(d.yaw), nz = -Math.sin(d.yaw); // across the leaf (the leaf runs along sin / cos yaw)
      const through: SectorRoute = { ...s.routes[0]!, name: 'through', pts: [[d.cx - nx * 2, d.cz - nz * 2, d.y], [d.cx + nx * 2, d.cz + nz * 2, d.y]] };
      const out = checkSoloRoutes([{ ...s, routes: [through] }], doorAt);
      expect(out).toHaveLength(1);
      expect(out[0]).toContain(`${s.id}: no route avoids the team doors`);
      expect(checkSoloRoutes([{ ...s, routes: [...s.routes, through] }], doorAt)).toEqual([]);
    }
  });
});
