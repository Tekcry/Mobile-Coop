import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { AIRLOCK_LID, AIRLOCK_PAD_COLOR, bayX, ctcourse, CT_BAY, CT_CEIL, CT_EXIT_ZONE, CT_W, FENCE, S4_GAP, S4_HEADER, GATE_RADIO, LEGUP_SPOT, OBJECTIVE_TEXT, PANEL_TEXT, PANEL_TEXT_MAX, RADIO_ENTER, S3_POCKET, S3_POCKET_COLOR, S5_HATCH, S5_PANEL, S7_STAIR_Z } from '../src/world/maps/ctcourse';
import { bayObjective, exitZoneReady, inExitZone, isPanelId, layoutKnownIds, validateCourse } from '../src/game/course/courseDef';
import { CourseState, REFUSE_BOLT, REFUSE_PAIR } from '../src/game/course/courseState';
import { COURSE_TEXT_MAX } from '../src/config/course';
import { getMap } from '../src/world/maps';
import { findJumpTarget, generateLedges, suppressLedgesNear, type Ledge } from '../src/world/anchors';
import { hangReaches, inBoostBand, ropeRoom } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';
import { isListedMap } from '../src/world/maps/listed';
import { buildVariety } from '../src/world/maps/ctcourseVariety';

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
      // the bolt opens from the +x (far) side; its side test is the door plane x 22 + 9 (course-ready F7)
      expect(g.side).toEqual([1, 0]);
      expect(g.at[0]).toBe(22 + 9);
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
  it('no skip: the walls are lower than the perimeter, nothing but a 4.5 m boost clears them, the airlock walls are 7.5 m', () => {
    expect(TEAM.boostMax).toBeLessThan(FENCE);
    expect(FENCE).toBe(7.5);
    // a hanging player's relay reach and a leg-up's top stay under the perimeter's height
    expect(TEAM.relayMax).toBeLessThan(FENCE);
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

describe('station 8 (B8): the final beat', () => {
  const b = new LevelBuilder();
  const lay = ctcourse.build(b, 0);
  const c = lay.course!;
  const x0 = 22 * 7;
  const solidAt = (x: number, y: number, z: number): boolean =>
    b.boxes.some((p) => p.collide && Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);

  it('the held console placeholder is gone: no gate, no door, an open doorway in the 3.5 m wall', () => {
    const bay = c.def.bays[7]!;
    expect(bay.gates.filter((x) => x.kind !== 'pickup')).toHaveLength(0);
    expect(c.devices['h-s8']).toBeUndefined();
    expect(c.doors['S8-door']).toBeUndefined();
    expect(bay.exit).toBe('end');
    expect(solidAt(x0 + 9, 1, 1)).toBe(true);
    expect(solidAt(x0 + 9, 3.4, 12)).toBe(true);
    expect(solidAt(x0 + 9, 1, 7)).toBe(false);
  });

  it('the course still ends only with both in the exit zone', () => {
    const st = new CourseState(validateCourse(c.def, layoutKnownIds(lay.course!)));
    st.startAt(8);
    st.clearEvents();
    const zx = (CT_EXIT_ZONE.box[0] + CT_EXIT_ZONE.box[2]) / 2;
    st.setPlayer(0, zx, 0, 7, false);
    st.setPlayer(1, x0 + 2, 0, 7, false);
    st.update(1 / 60);
    expect(st.over).toBe(false);
    st.setPlayer(1, zx, 0, 6, false);
    st.update(1 / 60);
    expect(st.over).toBe(true);
  });
});

describe('course-ready S1: station fixes and text', () => {
  const b = new LevelBuilder();
  const lay = ctcourse.build(b, 0);
  const anchors = generateLedges(b.boxes);
  const c = lay.course!;
  const def = validateCourse(c.def, layoutKnownIds(c));
  const DOOR_X = 22 + 9;
  const at2 = (): CourseState => {
    const s = new CourseState(def);
    s.startAt(2);
    s.clearEvents();
    return s;
  };

  it('F7: the bolt side is the door plane: feet just past the leaf unbolt, the near side and the near doorway are refused', () => {
    for (const x of [DOOR_X + 0.1, DOOR_X + 0.6, DOOR_X + 1.2]) {
      const s = at2();
      s.setPlayer(0, x, 0, 7, false);
      expect(s.press('S2-door', 0)).toBeNull();
      expect(s.isGateOpen('g-s2')).toBe(true);
    }
    for (const x of [DOOR_X - 0.1, DOOR_X - 0.6, DOOR_X - 1.5]) {
      const s = at2();
      s.setPlayer(1, x, 0, 7, false);
      expect(s.press('S2-door', 1)).toBe(REFUSE_BOLT);
      expect(s.isGateOpen('g-s2')).toBe(false);
    }
  });

  it('F8: the "Unbolt" item is live only while the bolt is shut; a bay restart brings it back', () => {
    const s = at2();
    expect(s.boltUsable('g-s2')).toBe(true);
    s.setPlayer(0, DOOR_X + 0.5, 0, 7, false);
    s.press('S2-door', 0);
    expect(s.boltUsable('g-s2')).toBe(false);
    expect(s.locked('S2-door')).toBe(false);
    s.restart();
    expect(s.boltUsable('g-s2')).toBe(true);
    expect(s.locked('S2-door')).toBe(true);
  });

  it('F17: a lone roof-plate press gets the partner hint; the partner inside the window opens the door', () => {
    const s = new CourseState(def);
    s.startAt(5);
    expect(s.press('sw-s5-a', 0)).toBe(REFUSE_PAIR);
    expect(s.press('sw-s5-a', 0)).toBe(REFUSE_PAIR);
    expect(s.isGateOpen('g-s5')).toBe(false);
    s.update(0.5);
    expect(s.press('sw-s5-b', 1)).toBeNull();
    expect(s.isGateOpen('g-s5')).toBe(true);
    // too late: the hint again, nothing opens
    const t = new CourseState(def);
    t.startAt(5);
    t.press('sw-s5-a', 0);
    t.update(1.5);
    expect(t.press('sw-s5-b', 1)).toBe(REFUSE_PAIR);
    expect(t.isGateOpen('g-s5')).toBe(false);
  });

  it('F2: each station gate has a radio line naming the next step, in its own bay; flag gates are keyed by gate id', () => {
    const want: [string, number][] = [['g-s2', 2], ['g-s3', 3], ['g-s4', 4], ['g-s5', 5], ['g-s5-grid', 5], ['g-s6', 6]];
    for (const [id, n] of want) {
      const bay = def.bays[n - 1]!;
      expect(bay.gates.some((g) => g.id === id)).toBe(true);
      expect(bay.radio.find((r) => r.at === id)?.text).toBe(GATE_RADIO[id]);
    }
    // the camera pocket and the scanners are flag gates (CourseMode speaks their line on flagSet)
    expect(def.bays[2]!.gates.find((g) => g.id === 'g-s3')?.kind).toBe('flag');
    expect(def.bays[5]!.gates.find((g) => g.id === 'g-s6')?.kind).toBe('flag');
    expect(GATE_RADIO['g-s2']).toBe('Unbolted. Open the door for your partner.');
    expect(GATE_RADIO['g-s5-grid']).toBe('Grid open. Off the roof, in the front door, through the grid to the airlock.');
    // (anim-rework S1; Michael 14:55 "Interact always") A opens the door in every weapon state: no holster first
    expect(GATE_RADIO['g-s3']).toMatch(/Open it \(A \/ E\)/);
  });

  it('F1: every bay has one objective (the HUD step line while it has no drills)', () => {
    expect(def.objectives).toHaveLength(8);
    for (let n = 1; n <= 8; n++) expect(bayObjective(def, `S${n}`)).toBe(OBJECTIVE_TEXT[n - 1]);
    expect(bayObjective(def, 'nope')).toBeNull();
  });

  it('every panel, radio and objective line is within its limit, has no em or en dash, says pad and keyboard words', () => {
    const radio = def.bays.flatMap((bay) => bay.radio.map((r) => r.text));
    expect(radio.length).toBe(RADIO_ENTER.length + Object.keys(GATE_RADIO).length);
    for (const t of [...radio, ...OBJECTIVE_TEXT]) {
      expect(t.length, t).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(t).not.toMatch(/[\u2013\u2014]/);
    }
    for (const t of PANEL_TEXT) {
      expect(t.length, t).toBeLessThanOrEqual(PANEL_TEXT_MAX);
      expect(t).not.toMatch(/[\u2013\u2014]/);
    }
    for (const t of [...radio, ...PANEL_TEXT, ...OBJECTIVE_TEXT]) expect(t).not.toMatch(/green pad/i);
    // F14: every Co-op names RB / F, every LT names its key, every A names E (anim-rework S1: LT is the held aim, so its
    // key is the right mouse button, RMB)
    for (const t of [...radio, ...PANEL_TEXT, ...OBJECTIVE_TEXT]) {
      if (/Co-op/.test(t)) expect(t, t).toMatch(/Co-op \(RB \/ F\)|Co-op action/i);
      if (/\bLT\b/.test(t)) expect(t, t).toMatch(/LT \/ RMB/);
      if (/\bA\b(?! \()/.test(t.replace(/Roof plate A|scanner A/g, ''))) expect(t, t).toMatch(/A \/ E/);
    }
    // F12, F15: station 3 names the pistol switch and the draw; station 4 the release's place
    expect(PANEL_TEXT[2]).toMatch(/LB \/ Tab to the pistol/);
    expect(PANEL_TEXT[3]).toMatch(/red release on the left wall/);
    // F18: panel 5 is two sentences, the hatch part is the g-s5 radio line
    expect(PANEL_TEXT[4]!.split('. ').length).toBe(2);
    expect(GATE_RADIO['g-s5']).toMatch(/hatch/);
  });

  it('F5: the station 3 blind spot is not the airlock pads\' colour', () => {
    expect(S3_POCKET_COLOR).not.toBe(AIRLOCK_PAD_COLOR);
    const px = (S3_POCKET.box[0] + S3_POCKET.box[2]) / 2;
    const sq = b.boxes.find((p) => !p.collide && Math.abs(p.c[0] - px) < 0.01 && Math.abs(p.c[2] - 7) < 0.01 && p.c[1] < 0.05);
    expect(sq?.color).toBe(S3_POCKET_COLOR);
  });

  it('F11: the leg-up squares at stations 2, 5 and 7 sit on a spot where a leg-up finds a climbable lip', () => {
    for (const n of [2, 5, 7]) {
      const x = 22 * (n - 1) + LEGUP_SPOT[0];
      const z = LEGUP_SPOT[1];
      const sq = b.boxes.find((p) => !p.collide && Math.abs(p.c[0] - x) < 0.01 && Math.abs(p.c[2] - z) < 0.01 && p.c[1] < 0.05);
      expect(sq, `station ${n} square`).toBeDefined();
      const t = findJumpTarget(anchors, { x, y: TEAM.boostMax - 1.15, z }, -1, 1, 0, 1, 2.2, 0.2);
      expect(t, `station ${n} leg-up`).not.toBeNull();
      expect(inBoostBand(t!.grip.y)).toBe(true);
      expect((t!.anchor as Ledge).canClimbUp).toBe(true);
    }
  });
});

describe('marlow-bunker: ceilings, lids and walls to the ceiling (no new climbs)', () => {
  const b = new LevelBuilder();
  ctcourse.build(b, 0);
  const anchors = generateLedges(b.boxes);
  const near = (a: number, v: number, e = 1e-3): boolean => Math.abs(a - v) < e;
  /** A solid, overhead, ledge-free slab whose underside is at y over [x0, x1] x [z0, z1]. */
  const slab = (y: number, x0: number, x1: number, z0: number, z1: number): boolean =>
    b.boxes.some((p) => p.collide && p.overhead === true && p.noLedge === true && near(p.c[1] - p.s[1] / 2, y) &&
      p.c[0] - p.s[0] / 2 <= x0 + 1e-3 && p.c[0] + p.s[0] / 2 >= x1 - 1e-3 && p.c[2] - p.s[2] / 2 <= z0 + 1e-3 && p.c[2] + p.s[2] / 2 >= z1 - 1e-3);

  it('every test cell has its ceiling (low 4.5, laser 5.5, high halls 7.5) and every airlock its 3.2 m lid', () => {
    expect(CT_CEIL).toEqual([4.5, 7.5, 4.5, 5.5, 7.5, 4.5, 7.5, 4.5]);
    for (let i = 0; i < 8; i++) expect(slab(CT_CEIL[i]!, bayX(i), bayX(i) + CT_BAY, 0, CT_W), `S${i + 1} ceiling`).toBe(true);
    for (let i = 0; i < 7; i++) expect(slab(AIRLOCK_LID, bayX(i) + CT_BAY, bayX(i) + CT_BAY + 6, 4, 10), `A${i + 1} lid`).toBe(true);
    // the perimeter reaches the highest ceiling (no gap to the void over the low cells)
    expect(FENCE).toBeGreaterThanOrEqual(Math.max(...CT_CEIL));
  });

  it('under the ceilings the only lips are the planned ones: S2 and S7 walls, S5 roof front, S7 return stair', () => {
    const odd: string[] = [];
    for (const l of anchors.ledges) {
      // the perimeter and airlock wall tops at 7.5 m are above every ceiling: outside the playable volume
      if (l.top >= FENCE - 1e-3) continue;
      const x = (l.a.x + l.b.x) / 2;
      const z = (l.a.z + l.b.z) / 2;
      const wallTop = near(l.top, 4.4) && [bayX(1) + 8.5, bayX(1) + 9.5, bayX(4) + 8.85, bayX(6) + 8.5, bayX(6) + 9.5].some((v) => near(x, v, 0.02));
      const stair = (near(l.top, 3.3) || near(l.top, 2.2)) && x > bayX(6) + 9.5 && x < bayX(6) + 12.6 && z < 1.7;
      if (!wallTop && !stair) odd.push(`${x.toFixed(2)}, ${z.toFixed(2)} y ${l.top.toFixed(2)}`);
    }
    expect(odd).toEqual([]);
    // the high halls leave room over the 4.4 m tops to stand and hold the rope (3.1 m)
    for (const i of [1, 4, 6]) expect(CT_CEIL[i]! - 4.4).toBeGreaterThanOrEqual(3);
  });

  it('station 4: the header over the laser gap clears the throw arc (apex over a 1.8 m body)', () => {
    expect(S4_HEADER).toBeGreaterThanOrEqual(4.6);
    expect(S4_HEADER).toBeLessThan(CT_CEIL[3]!);
    expect(TEAM.throwApex + 1.8).toBeLessThan(S4_HEADER);
    const x = bayX(3) + 9;
    const header = b.boxes.find((p) => near(p.c[0], x) && near(p.c[1] - p.s[1] / 2, S4_HEADER));
    expect(header?.s[2]).toBeCloseTo(S4_GAP[1] - S4_GAP[0], 5);
    // the gap stays open below the header (only the laser band closes it)
    const inGap = b.boxes.filter((p) => p.collide && near(p.c[0], x, 0.2) && p.c[1] - p.s[1] / 2 < S4_HEADER - 1e-3 && Math.abs(p.c[2] - 7) < p.s[2] / 2);
    expect(inGap).toHaveLength(0);
  });

  it('the haunches are dressing: no solid piece is pitched (no stray collision on the corners)', () => {
    for (const p of b.boxes) if (p.collide) expect(Math.abs(p.pitch), `solid pitched piece at ${p.c.join(', ')}`).toBeLessThan(1e-3);
    expect(b.boxes.some((p) => !p.collide && Math.abs(p.pitch - Math.PI / 4) < 1e-6)).toBe(true);
  });
});

describe('marlow-variety: the dressing adds no climb and keeps the routes clear', () => {
  const v = new LevelBuilder();
  buildVariety(v, CT_CEIL, S7_STAIR_Z);
  const full = new LevelBuilder();
  ctcourse.build(full, 0);

  it('only the S6 server racks are solid: lip-free and taller than a mantle (1.8 m)', () => {
    const solid = v.boxes.filter((p) => p.collide);
    expect(solid).toHaveLength(4);
    for (const p of solid) {
      expect(p.noLedge).toBe(true);
      expect(p.c[1] - p.s[1] / 2).toBeLessThan(0.01);
      expect(p.s[1]).toBeGreaterThan(1.8);
      // against the S6 west wall, clear of its door (z 6.4 - 7.6)
      expect(p.c[0]).toBeGreaterThan(bayX(5));
      expect(p.c[0]).toBeLessThan(bayX(5) + 1.2);
      expect(p.c[2] - p.s[2] / 2).toBeGreaterThan(7.9);
    }
    expect(generateLedges(v.boxes).ledges).toHaveLength(0);
  });

  it('S1: the grab from behind stays clear (nothing solid in x 2 - 10.5, z 2.5 - 5 under 2 m)', () => {
    const inArea = full.boxes.filter((p) => p.collide && p.c[1] - p.s[1] / 2 < 2 && p.c[1] + p.s[1] / 2 > 0.05 &&
      p.c[0] + p.s[0] / 2 > 2 && p.c[0] - p.s[0] / 2 < 10.5 && p.c[2] + p.s[2] / 2 > 2.5 && p.c[2] - p.s[2] / 2 < 5);
    expect(inArea).toHaveLength(0);
  });
});
