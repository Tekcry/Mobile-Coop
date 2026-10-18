import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { ctcourse, CT_EXIT_ZONE, S5_HATCH, S5_PANEL, S7_STAIR_Z } from '../src/world/maps/ctcourse';
import { exitZoneReady, inExitZone, isPanelId, layoutKnownIds, validateCourse } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import { getMap } from '../src/world/maps';
import { findJumpTarget, generateLedges, suppressLedgesNear, type Ledge } from '../src/world/anchors';
import { hangReaches, inBoostBand, ropeRoom } from '../src/game/teamMoves';
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

describe('ctcourse (CT prototype B5: hang-down hack at station 5)', () => {
  const b = new LevelBuilder();
  const lay = ctcourse.build(b, 0);
  const anchors = generateLedges(b.boxes);
  const c = lay.course!;
  const [hx0, hz0, hx1, hz1] = S5_HATCH;
  const hx = (hx0 + hx1) / 2;
  const hz = (hz0 + hz1) / 2;
  const solidAt = (x: number, y: number, z: number): boolean =>
    b.boxes.some((p) => p.collide && Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);

  it('the roof has a hatch over the back room, narrower than a body (0.6 m), roof all round it', () => {
    expect(solidAt(hx, 4.2, hz)).toBe(false);
    expect(hx1 - hx0).toBeLessThan(0.6);
    expect(hz1 - hz0).toBeLessThan(0.6);
    for (const [x, z] of [[hx0 - 0.1, hz], [hx1 + 0.1, hz], [hx, hz0 - 0.1], [hx, hz1 + 0.1], [hx, hz1 + 0.5]] as const) expect(solidAt(x, 4.2, z)).toBe(true);
    // behind the grid wall (x +12.5) and inside the annex (front of the airlock at +16)
    expect(hx0).toBeGreaterThan(22 * 4 + 12.65);
    expect(hx1).toBeLessThan(22 * 4 + 16);
    // no generated ledge at the hatch (nobody hangs off its rim and drops in)
    suppressLedgesNear(anchors, hx, hz, 1.0);
    for (const l of anchors.ledges) {
      const mx = (l.a.x + l.b.x) / 2;
      const mz = (l.a.z + l.b.z) / 2;
      if (Math.hypot(mx - hx, mz - hz) < 0.5) expect(l.canHang).toBe(false);
    }
  });
  it('the hack panel is the grid lever, in the back room, reached hanging from the hatch, not from the roof or the front room', () => {
    const gate = c.def.bays[4]!.gates.find((g) => g.kind === 'lever');
    expect(gate && gate.kind === 'lever' && gate.switchId).toBe('sw-s5-hack');
    const d = c.devices['sw-s5-hack']!;
    expect([d.x, d.y, d.z]).toEqual([S5_PANEL.x, S5_PANEL.y, S5_PANEL.z]);
    // hanging under the hatch, lowered: in reach; at the start height: not
    expect(hangReaches(hx, hz - 0.1, 4.4, TEAM.hangMax, d.x, d.y, d.z)).toBe(true);
    expect(hangReaches(hx, hz - 0.1, 4.4, TEAM.hangStart, d.x, d.y, d.z)).toBe(false);
    // the game's reach rule (1.8 m across, 1.5 m up / down): not from the roof, not from the front room (west of the grid wall)
    expect(Math.abs(d.y - 4.4)).toBeGreaterThan(1.5);
    expect(d.x - (22 * 4 + 12.35)).toBeGreaterThan(1.8);
  });
});

describe('ctcourse (CT prototype B7: two-person rope at station 7)', () => {
  const b = new LevelBuilder();
  const lay = ctcourse.build(b, 0);
  const anchors = generateLedges(b.boxes);
  const c = lay.course!;
  const x0 = 22 * 6;
  const solidAt = (x: number, y: number, z: number): boolean =>
    b.boxes.some((p) => p.collide && Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);

  it('the placeholder console is gone; the wall is solid full width (no door), 4.4 m, 1 m thick', () => {
    const bay = c.def.bays[6]!;
    expect(bay.gates.filter((x) => x.kind !== 'pickup')).toHaveLength(0);
    expect(c.devices['h-s7']).toBeUndefined();
    expect(c.doors['S7-door']).toBeUndefined();
    for (const z of [0.5, 3, 6.4, 7, 10, 13.5]) {
      expect(solidAt(x0 + 9, 1, z)).toBe(true);
      expect(solidAt(x0 + 9, 4.3, z)).toBe(true);
      expect(solidAt(x0 + 9, 4.5, z)).toBe(false);
    }
    expect(solidAt(x0 + 8.6, 4.3, 7)).toBe(true);
    expect(solidAt(x0 + 9.4, 4.3, 7)).toBe(true);
  });
  it('a leg-up from the near side reaches a climbable lip in the band; the rope serves the drop back down', () => {
    const apex = { x: x0 + 8, y: TEAM.boostMax - 1.15, z: 3 };
    const t = findJumpTarget(anchors, apex, -1, 1, 0, 1, 2.2, 0.2);
    expect(t).not.toBeNull();
    expect(inBoostBand(t!.grip.y)).toBe(true);
    expect((t!.anchor as Ledge).canClimbUp).toBe(true);
    expect(ropeRoom(4.4, 0)).toBe('ok');
  });
  it('never stranded: a far-side stair (1.1 m rises) climbs back to the wall top; nothing on the near side', () => {
    for (let k = 1; k <= 3; k++) {
      const h = 1.1 * (4 - k);
      expect(solidAt(x0 + 9.5 + k - 0.5, h - 0.05, S7_STAIR_Z)).toBe(true);
      expect(solidAt(x0 + 9.5 + k - 0.5, h + 0.05, S7_STAIR_Z)).toBe(false);
    }
    expect(solidAt(x0 + 8, 1, S7_STAIR_Z)).toBe(false);
  });
});
