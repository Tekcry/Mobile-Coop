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

  it('the rule bites: a section left with only the routes that cross its team doors fails', () => {
    const withDoors = CAMPUS_SECTORS.filter((s) => teamDoorPoints(s).length > 0);
    for (const s of withDoors) {
      const crossing = s.routes.filter((r) => checkSoloRoutes([{ ...s, routes: [r] }], doorAt).length > 0);
      if (!crossing.length) continue;
      expect(checkSoloRoutes([{ ...s, routes: crossing }], doorAt).length).toBe(1);
      return;
    }
    throw new Error('no campus route crosses a team door: the rule-bites case has nothing to bite on');
  });
});
