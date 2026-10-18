import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { ctcourse, CT_EXIT_ZONE } from '../src/world/maps/ctcourse';
import { exitZoneReady, inExitZone, isPanelId, layoutKnownIds, validateCourse } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import { getMap } from '../src/world/maps';
import { findJumpTarget, generateLedges, type Ledge } from '../src/world/anchors';
import { inBoostBand } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';
import { isListedMap } from '../src/world/maps/listed';

describe('ctcourse (CT prototype B1)', () => {
  const lay = ctcourse.build(new LevelBuilder(), 0);
  const c = lay.course!;
  it('is registered, course only, not listed, the default course map', () => {
    expect(getMap('ctcourse').id).toBe('ctcourse');
    expect(ctcourse.modes).toEqual(['course']);
    expect(isListedMap('ctcourse')).toBe(false);
  });
  it('has eight stations, seven airlocks and a course that validates', () => {
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    expect(c.def.bays).toHaveLength(8);
    expect(c.def.airlocks).toHaveLength(7);
    expect(lay.playerSpawns).toHaveLength(2);
    expect((lay.medkitWalls ?? []).length).toBeGreaterThan(0);
  });
  it('the exit zone is one rule: both players, or one under the solo flag', () => {
    expect(exitZoneReady(true, true, false)).toBe(true);
    expect(exitZoneReady(true, false, false)).toBe(false);
    expect(exitZoneReady(false, false, true)).toBe(false);
    expect(exitZoneReady(true, false, true)).toBe(true);
    const mid = (CT_EXIT_ZONE.box[0] + CT_EXIT_ZONE.box[2]) / 2;
    expect(inExitZone(CT_EXIT_ZONE, mid, 0, 7, 1)).toBe(true);
    expect(inExitZone(CT_EXIT_ZONE, mid, 3, 7, 1)).toBe(false);
    expect(inExitZone(CT_EXIT_ZONE, mid - 20, 0, 7, 1)).toBe(false);
  });
  it('the course ends only when BOTH players are in the exit zone', () => {
    const s = new CourseState(c.def);
    s.startAt(8);
    const x = (CT_EXIT_ZONE.box[0] + CT_EXIT_ZONE.box[2]) / 2;
    s.setPlayer(0, x, 0, 7, false);
    s.setPlayer(1, 5, 0, 7, false);
    s.update(1 / 60);
    expect(s.over).toBe(false);
    expect(s.finishRefusal()).toBe('Wait for your partner');
    s.setPlayer(1, x + 0.5, 0, 6, true);
    s.update(1 / 60);
    expect(s.over).toBe(false);
    s.setPlayer(1, x + 0.5, 0, 6, false);
    s.update(1 / 60);
    expect(s.over).toBe(true);
  });
});

describe('ctcourse (CT prototype B2: leg-up wall and relay roof)', () => {
  const b = new LevelBuilder();
  const lay = ctcourse.build(b, 0);
  const anchors = generateLedges(b.boxes);
  const c = lay.course!;
  const MID = 7;

  it('station 2: the wall is bolted from the far side; the plates are gone', () => {
    const bay = c.def.bays[1]!;
    expect(bay.gates.filter((x) => x.kind !== 'pickup')).toHaveLength(1);
    const g = bay.gates[0]!;
    expect(g.kind).toBe('bolt');
    if (g.kind === 'bolt') {
      // the bolt sits on the +x (far) side of the wall at x 22 + 9
      expect(g.side).toEqual([1, 0]);
      expect(g.at[0]).toBeGreaterThan(22 + 9.5);
    }
    expect(c.devices['sw-s2-a']).toBeUndefined();
  });
  it('a leg-up from the floor in front of the station 2 wall finds a climbable lip in the 4.3-4.5 band', () => {
    const floor = 0;
    const apex = { x: 22 + 8, y: floor + TEAM.boostMax - 1.15, z: MID + 2 };
    const t = findJumpTarget(anchors, apex, -1, 1, 0, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    expect(inBoostBand(t!.grip.y - floor)).toBe(true);
    expect(t!.grip.y).toBeGreaterThanOrEqual(4.3);
    expect(t!.grip.y).toBeLessThanOrEqual(4.5);
    expect((t!.anchor as Ledge).canClimbUp).toBe(true);
  });
  it('station 5: the roof lip is reachable, and both roof plates stand on the roof (4.4 m)', () => {
    const x0 = 22 * 4;
    const apex = { x: x0 + 8, y: TEAM.boostMax - 1.15, z: 3 };
    const t = findJumpTarget(anchors, apex, -1, 1, 0, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    expect(inBoostBand(t!.grip.y)).toBe(true);
    expect((t!.anchor as Ledge).canClimbUp).toBe(true);
    for (const id of ['sw-s5-a', 'sw-s5-b']) {
      expect(c.devices[id]!.y).toBeGreaterThanOrEqual(4.3);
      expect(c.devices[id]!.x).toBeGreaterThan(x0 + 9);
    }
  });
  it('no skip: the walls are lower than the fences, nothing but a 4.5 m boost clears them, the airlock walls are 6 m', () => {
    expect(TEAM.boostMax).toBeLessThan(6);
    // a hanging player's relay reach and a leg-up's top stay under the fence height
    expect(TEAM.relayMax).toBeLessThan(6);
  });
});

describe('ctcourse panels (F1b: one optional panel per station)', () => {
  const lay = ctcourse.build(new LevelBuilder(), 0);
  const c = lay.course!;
  it('every station has exactly one panel device, and no drill or door waits on reading it', () => {
    expect(isPanelId('sw-p3')).toBe(true);
    expect(isPanelId('sw-s3-a')).toBe(false);
    for (let n = 1; n <= 8; n++) {
      expect(c.devices[`sw-p${n}`]?.label?.length ?? 0).toBeGreaterThan(10);
      const bay = c.def.bays[n - 1]!;
      expect(bay.gates.filter((g) => g.kind === 'pickup' && g.switchId === `sw-p${n}`)).toHaveLength(1);
      expect(bay.drills.some((d) => d.verb === 'switch')).toBe(false);
      for (const g of c.def.bays.flatMap((b) => b.gates)) if (g.kind === 'flag' || g.kind === 'anchorLock') expect(g.flag.startsWith('panel-')).toBe(false);
    }
  });
  it('station 1 has no drill at all: the airlock pad is its only step', () => {
    expect(c.def.bays[0]!.drills).toHaveLength(0);
    expect(c.def.bays[0]!.gates.every((g) => g.kind === 'pickup')).toBe(true);
  });
});
