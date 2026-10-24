/**
 * Marlow Yard whole-map frame (marlow-final slice 0d; PLAN.md section 2, SPEC sections 5, 7, 12, 13, 16, 18): the merge of
 * the facility and the eight set parts. The chain (start -> L1 .. L7 -> end), `validateCourse`, the text limits, the
 * contract rules per part (`checkSetPart`), the element register count, every lamp grouped (N12), the holding rooms and
 * their 1.8 m sliding doors, the gallery out of bounds, the co-op lips band and no unplanned boost target, the bay-1
 * guard e2e-coop needs. Each set slice adds its own cases in `tests/ctcourse/<set>.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse, COOP_LIPS, ctcourse, SPOT_FAIL } from '../src/world/maps/ctcourse';
import { getMap, MAPS } from '../src/world/maps';
import { isListedMap } from '../src/world/maps/listed';
import { inExitZone, isPanelId, layoutKnownIds, registeredBayCount, validateCourse } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import { COURSE_TEXT_MAX, AIRLOCK_SIZE } from '../src/config/course';
import { GUARD_INFO_LINE_MAX } from '../src/ai/guardInfo';
import type { GuardIntel } from '../src/game/intel';
import { checkPanels } from '../src/game/laserPanels';
import { validateSecurity } from '../src/security/data';
import { generateLedges, type Anchor } from '../src/world/anchors';
import { TEAM, WALL_JUMP } from '../src/config/movement';
import { camSpaceAt } from '../src/world/camSpaces';
import { COOP_BAND } from '../src/world/maps/ctcourseGreybox';
import { MARLOW_CIRCUITS, marlowCourseGroups, validateMarlowCircuits } from '../src/world/lighting/marlowCircuits';
import { DOCK_BOX, EXIT_ZONE, HOLD_BOX, HOLD_DOOR_W, HOLD_DOORS, HOLD_H, HOLD_IDS, holdDoorId, HALL_H, boxInSet, inBox, inSet, LOUNGE_BOX, MAP_CAMERAS, OBJECTIVE_ID_MAX, registerSum, SET_BOX, SET_IDS, SET_LINKS, setBay, setEntryDoor, setExitDoor, setGroups, checkSetPart, type Box } from '../src/world/maps/ctcourseSets/types';
import { GALLERY_BOX, GAL_FLOOR, GALLERY_GROUP, SLOT } from '../src/world/maps/ctcourseSets/facility';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const lay = built.layout;
const c = lay.course!;
const def = c.def;
/** The `SEC_SCANS` cap in `protocol.ts` (not exported): the wire keeps this many scanner pairs. */
const WIRE_SCAN_PAIRS = 8;

describe('Marlow Yard: identity and the course chain', () => {
  it('is registered, course only, not listed, in MAPS; its course registered itself at load (N8)', () => {
    expect(getMap('ctcourse').id).toBe('ctcourse');
    expect(ctcourse.modes).toEqual(['course']);
    expect(isListedMap('ctcourse')).toBe(false);
    expect(MAPS.some((m) => m.id === 'ctcourse')).toBe(true);
    expect(registeredBayCount('ctcourse')).toBe(8);
  });
  it('eight bays A1-A8 in route order, seven 6 x 6 holding rooms, the chain start -> L1 .. L7 -> end, and it validates', () => {
    expect(() => validateCourse(def, layoutKnownIds(c))).not.toThrow();
    expect(def.bays.map((x) => x.id)).toEqual(SET_IDS.map(setBay));
    expect(def.airlocks.map((a) => a.id)).toEqual([...HOLD_IDS]);
    expect(def.bays[0]!.entry).toBe('start');
    expect(def.bays[7]!.exit).toBe('end');
    def.bays.forEach((bay, i) => {
      if (i > 0) expect(bay.entry).toBe(def.bays[i - 1]!.exit);
      expect(bay.entry).toBe(SET_LINKS[SET_IDS[i]!].entry);
    });
    for (const a of def.airlocks) {
      expect(Math.abs(a.box[2] - a.box[0])).toBeCloseTo(AIRLOCK_SIZE, 6);
      expect(Math.abs(a.box[3] - a.box[1])).toBeCloseTo(AIRLOCK_SIZE, 6);
      expect(a.box).toEqual([...HOLD_BOX[a.id as (typeof HOLD_IDS)[number]]]);
    }
  });
  it('two spawns in the arrival lounge facing +x; no explainer panels (M4)', () => {
    expect(lay.playerSpawns).toHaveLength(2);
    for (const s of lay.playerSpawns) {
      expect(inBox(LOUNGE_BOX, s.pos.x, s.pos.z)).toBe(true);
      expect(s.yaw).toBeCloseTo(Math.PI / 2);
    }
    expect(Object.keys(c.devices).filter(isPanelId)).toEqual([]);
  });
  it('the exit zone is in the cash dock and ends the course only with BOTH players in it (G138)', () => {
    const z = def.exitZone!;
    expect(z.box).toEqual([...EXIT_ZONE]);
    expect(inBox(DOCK_BOX, z.box[0], z.box[1]) && inBox(DOCK_BOX, z.box[2], z.box[3])).toBe(true);
    const s = new CourseState(def, c.consoles);
    s.startAt(8);
    const x = (z.box[0] + z.box[2]) / 2;
    const zc = (z.box[1] + z.box[3]) / 2;
    expect(inExitZone(z, x, 0, zc, 1)).toBe(true);
    s.setPlayer(0, x, 0, zc, false);
    s.setPlayer(1, 151, 0, 62, false);
    s.update(1 / 60);
    expect(s.over).toBe(false);
    s.setPlayer(1, x + 0.5, 0, zc + 0.5, false);
    s.update(1 / 60);
    expect(s.over).toBe(true);
  });
});

describe('Marlow Yard: the set-part contract', () => {
  it('one part per set in route order; every part passes the contract rules', () => {
    expect(built.parts.map((p) => p.id)).toEqual([...SET_IDS]);
    const bad = built.parts.flatMap((p) => checkSetPart(p));
    expect(bad).toEqual([]);
  });
  it('each set enters by its holding room\'s far door and leaves by the next one\'s near door (facility doors)', () => {
    for (const id of SET_IDS) {
      for (const door of [setEntryDoor(id), setExitDoor(id)]) if (door) expect(c.doors[door], door).toBeTypeOf('number');
    }
    expect(setEntryDoor('a1Gate')).toBeNull();
    expect(setExitDoor('a8Strongroom')).toBeNull();
  });
  it('cameras within the map budget and valid; scanner pairs fit the wire (8); every laser has one panel', () => {
    const cams = lay.security!.devices;
    expect(cams.length).toBeLessThanOrEqual(MAP_CAMERAS);
    expect(validateSecurity(lay.security!)).toEqual([]);
    expect((lay.scanners ?? []).length).toBeLessThanOrEqual(WIRE_SCAN_PAIRS);
    expect(checkPanels(lay.lasers ?? [], lay.laserPanels ?? [])).toEqual([]);
  });
  it('the element register counts every light, collidable box, door and anchor each part added (SPEC 18)', () => {
    expect(registerSum(built.facility.register)).toEqual(built.counts.facility);
    for (const p of built.parts) expect(registerSum(p.register), p.id).toEqual(built.counts.sets[p.id]);
    expect(built.facility.register.map((r) => r.id)).toEqual(expect.arrayContaining(['F1', 'F2', 'F3', 'F4', 'F6', 'F7']));
  });
  it('the bay-1 guard (e2e-coop): A1 spawns a passive, grabbable guard with information, inside A1', () => {
    const bay = def.bays[0]!;
    expect(bay.squad.length).toBeGreaterThanOrEqual(1);
    const slot = c.squads[bay.squad[0]!]!;
    expect(slot.passive).toBe(true);
    expect(slot.kind).not.toBe('runner');
    expect(slot.info?.lines.length).toBeGreaterThanOrEqual(1);
    expect(inSet('a1Gate', slot.x, slot.z)).toBe(true);
  });
  it('every guard slot is an armed kind (SPEC rule 9: never a runner)', () => {
    for (const [id, s] of Object.entries(c.squads)) expect(['grunt', 'heavy', 'enforcer', 'officer', 'sniper'], id).toContain(s.kind);
  });
});

describe('Marlow Yard: text (90 characters, British, no dashes)', () => {
  const lines: [string, string][] = [];
  for (const bay of def.bays) for (const r of bay.radio) lines.push([`${bay.id} radio ${r.at}`, r.text]);
  for (const bay of def.bays) for (const d of bay.drills) lines.push([`${bay.id} drill ${d.id}`, d.text]);
  for (const bay of def.bays) if (bay.spotFail !== undefined) lines.push([`${bay.id} spotted`, bay.spotFail]);
  for (const o of def.objectives ?? []) {
    lines.push([`step ${o.id}`, o.text]);
    if (o.a) lines.push([`step ${o.id} A`, o.a]);
    if (o.b) lines.push([`step ${o.id} B`, o.b]);
  }
  it('every radio line, drill and objective line fits COURSE_TEXT_MAX with no em or en dash', () => {
    expect(lines.length).toBeGreaterThan(8);
    for (const [k, t] of lines) {
      expect(t.length, k).toBeLessThanOrEqual(COURSE_TEXT_MAX);
      expect(/[\u2013\u2014]/.test(t), k).toBe(false);
    }
  });
  it('(walk482 X2a) only A2 fails on being spotted; its line fits COURSE_TEXT_MAX and validateCourse checks the length', () => {
    const withRule = def.bays.filter((bay) => bay.spotFail !== undefined);
    expect(withRule.map((bay) => bay.id)).toEqual(['A2']);
    const line = withRule[0]!.spotFail!;
    expect(line).toBe(SPOT_FAIL.a2CarriageShed);
    expect(line.length).toBeGreaterThan(0);
    expect(line.length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
    const long = { ...def, bays: def.bays.map((bay) => (bay.spotFail ? { ...bay, spotFail: 'x'.repeat(COURSE_TEXT_MAX + 1) } : bay)) };
    expect(() => validateCourse(long, layoutKnownIds(c))).toThrow(/spotted line/);
  });
  it('every bay has an entry radio line and a closing objective line', () => {
    for (const bay of def.bays) {
      expect(bay.radio.some((r) => r.at === 'enter'), bay.id).toBe(true);
      expect((def.objectives ?? []).some((o) => o.bay === bay.id && o.done === undefined), bay.id).toBe(true);
    }
  });
  it('objective ids fit the wire\'s 48-character flag (obj:<id>); guard information lines fit the radio', () => {
    for (const o of def.objectives ?? []) expect(o.id.length, o.id).toBeLessThanOrEqual(OBJECTIVE_ID_MAX);
    expect(`obj:${'x'.repeat(OBJECTIVE_ID_MAX)}`.length).toBeLessThanOrEqual(48);
    for (const s of Object.values(c.squads)) for (const l of s.info?.lines ?? []) {
      expect(l.length).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
      expect(/[\u2013\u2014]/.test(l)).toBe(false);
    }
    // (joint-interrogation) the joint-only lines too
    for (const s of Object.values(c.squads)) for (const l of (s.info as GuardIntel | undefined)?.joint?.lines ?? []) {
      expect(l.length, l).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
      expect(/[\u2013\u2014]/.test(l), l).toBe(false);
    }
  });
});

describe('Marlow Yard: every lamp grouped (N12, LIGHTING-PLAN 4)', () => {
  const lamps = b.lights.lights.filter((l) => l.kind !== 'flashlight');
  const rowOf = new Map(MARLOW_CIRCUITS.map((r) => [r.group, r]));
  const setOfPoint = (x: number, z: number): (typeof SET_IDS)[number] | null => SET_IDS.find((id) => inSet(id, x, z)) ?? null;

  it('the circuit table is valid; the course groups are exactly its live circuits', () => {
    expect(validateMarlowCircuits()).toEqual([]);
    expect(c.groups).toEqual(marlowCourseGroups());
  });
  it('every lamp has a group that is a table row; a set lamp is on its own set\'s circuits; house lamps stay out of the sets', () => {
    const bad: string[] = [];
    for (const l of lamps) {
      const at = `lamp ${l.id} (${l.x.toFixed(1)}, ${l.y.toFixed(1)}, ${l.z.toFixed(1)}) group ${l.group}`;
      const row = rowOf.get(l.group);
      if (!row) {
        bad.push(`${at}: no circuit`);
        continue;
      }
      const set = setOfPoint(l.x, l.z);
      // the gallery floats over the sets' edges: its decor lamps are judged by height, not plan
      if (l.group === GALLERY_GROUP) continue;
      if (set) {
        const [g0, g1] = setGroups(set);
        if (l.group < g0 || l.group > g1) bad.push(`${at}: in ${set}, outside its groups ${g0}-${g1}`);
        // (S3) house lamps only in the lounge and A3's two lobbies (group 34: transit spaces kept at the house light, as
        // LIGHTING-PLAN's own A3 rows place them; the set doc's A3-C4 lists the table change as the undo)
        if (row.kind === 'house' && !(set === 'a1Gate' && inBox(LOUNGE_BOX, l.x, l.z)) && !(set === 'a3OfficeRange' && l.group === 34)) bad.push(`${at}: a house lamp inside a set (only the lounge's and A3's lobbies)`);
      } else if (l.group < 90) bad.push(`${at}: a set circuit outside every set box`);
    }
    expect(bad).toEqual([]);
  });
  it('gallery lamps are decor: group 90, not jam targets, not shootable, up in the gallery', () => {
    const gal = lamps.filter((l) => l.group === GALLERY_GROUP);
    expect(gal.length).toBeGreaterThan(10);
    for (const l of gal) {
      expect(l.electric).toBe(false);
      expect(l.destructible).toBe(false);
      expect(l.y).toBeGreaterThan(GAL_FLOOR);
      expect(GALLERY_BOX.some((g) => inBox(g, l.x, l.z))).toBe(true);
    }
  });
  it('every map switch is on a live course group; built sets have a lamp on each circuit the table plans lamps for', () => {
    const live = new Set(Object.values(c.groups ?? {}));
    for (const s of lay.switches ?? []) expect(live.has(s.group), `switch on ${s.group}`).toBe(true);
    const groups = new Set(lamps.map((l) => l.group));
    for (const p of built.parts) {
      if (p.stub) continue;
      for (const r of MARLOW_CIRCUITS) if (r.room === setBay(p.id) && r.lamps > 0) expect(groups.has(r.group), `${p.id} circuit ${r.key}`).toBe(true);
    }
    for (const r of MARLOW_CIRCUITS) if (r.room === 'F' && r.lamps > 0) expect(groups.has(r.group), `facility circuit ${r.key}`).toBe(true);
  });
});

describe('Marlow Yard: holding rooms, doors and the gallery (SPEC 5)', () => {
  const doorAnchor = (id: string) => b.anchors.doors.find((d) => d.id === c.doors[id])!;
  it('each holding room has two 1.8 m motorised sliding doors on its door walls; the far door is the next set\'s way in', () => {
    for (const h of HOLD_IDS) {
      for (const end of ['near', 'far'] as const) {
        const d = doorAnchor(holdDoorId(h, end));
        expect(d, `${h} ${end}`).toBeDefined();
        expect(d.leaf).toBe('slide');
        expect(d.width).toBeCloseTo(HOLD_DOOR_W, 6);
        // the opening's centre is the door spot (the hinge sits half a width back along the leaf)
        const s = HOLD_DOORS[h][end];
        expect(d.hinge.x + Math.sin(d.yaw) * d.width / 2).toBeCloseTo(s.x, 1);
        expect(d.hinge.z + Math.cos(d.yaw) * d.width / 2).toBeCloseTo(s.z, 1);
        expect(inBox(HOLD_BOX[h], s.x, s.z, 0.01)).toBe(true);
      }
    }
  });
  it('every other door is at least 1.2 m wide (scale sheet)', () => {
    for (const d of b.anchors.doors) expect(d.width, `door ${d.id}`).toBeGreaterThanOrEqual(1.2 - 1e-6);
  });
  it('each holding room: a lid at 3.2 m, a pad, a glass slot beside the far door; camera tight; a nav seed', () => {
    for (const h of HOLD_IDS) {
      const bx = HOLD_BOX[h];
      const cx = (bx[0] + bx[2]) / 2;
      const cz = (bx[1] + bx[3]) / 2;
      const lid = b.boxes.find((p) => p.overhead && Math.abs(p.c[0] - cx) < 0.01 && Math.abs(p.c[2] - cz) < 0.01 && Math.abs(p.c[1] - p.s[1] / 2 - HOLD_H) < 0.01);
      expect(lid, `${h} lid`).toBeDefined();
      const far = HOLD_DOORS[h].far;
      const along = far.yaw === 0 ? [far.x, far.z + SLOT.off] : [far.x + SLOT.off, far.z];
      const glass = b.boxes.find((p) => p.collide && p.visible === false && Math.abs(p.c[0] - along[0]!) < 0.1 && Math.abs(p.c[2] - along[1]!) < 0.1 && p.c[1] > SLOT.sill && p.c[1] < SLOT.sill + SLOT.h);
      expect(glass, `${h} glass slot`).toBeDefined();
      expect(camSpaceAt(lay.camSpaces, lay.camSize, cx, 0, cz), `${h} camera`).toBe(0);
      expect((lay.navSeeds ?? []).some((v) => inBox(bx, v.x, v.z)), `${h} nav seed`).toBe(true);
    }
  });
  it('wall medkits in L4 and L7, facing into the room', () => {
    for (const h of ['L4', 'L7'] as const) expect((lay.medkitWalls ?? []).some((m) => inBox(HOLD_BOX[h], m.pos.x, m.pos.z)), h).toBe(true);
  });
  it('the gallery is out of bounds: overhead floor slabs, glazing collision-only, no nav seed in it', () => {
    for (const g of GALLERY_BOX) {
      const cx = (g[0] + g[2]) / 2;
      const cz = (g[1] + g[3]) / 2;
      const floor = b.boxes.find((p) => Math.abs(p.c[0] - cx) < 0.01 && Math.abs(p.c[2] - cz) < 0.01 && Math.abs(p.c[1] + p.s[1] / 2 - GAL_FLOOR) < 0.01);
      expect(floor?.overhead, `gallery floor ${g.join(',')}`).toBe(true);
    }
    const glazing = b.boxes.filter((p) => p.collide && p.visible === false && p.c[1] > GAL_FLOOR);
    expect(glazing.length).toBeGreaterThan(5);
    for (const p of glazing) expect(p.noLedge).toBe(true);
    for (const v of lay.navSeeds ?? []) expect(v.y < 1 || !GALLERY_BOX.some((g) => inBox(g, v.x, v.z))).toBe(true);
  });
});

describe('Marlow Yard: co-op lips (SPEC 12, LD 11.3, 11.5)', () => {
  const anchors = generateLedges(b.boxes);
  it('every planned co-op lip is 0.5 m or more over the solo reach and within the boost', () => {
    expect(COOP_BAND.min).toBeCloseTo(WALL_JUMP.maxUp + 0.5);
    expect(COOP_BAND.max).toBe(TEAM.boostMax);
    for (const l of COOP_LIPS) {
      expect(l.y - l.floor, l.id).toBeGreaterThanOrEqual(COOP_BAND.min - 1e-6);
      expect(l.y - l.floor, l.id).toBeLessThanOrEqual(COOP_BAND.max + 1e-6);
    }
  });
  it('no unplanned boost target: every generated lip 3.8-4.5 m over its floor is a planned co-op lip', () => {
    const planned = (x: number, z: number, y: number): boolean =>
      COOP_LIPS.some((l) => Math.abs(l.y - y) < 0.15 && distSeg(x, z, l.a.x, l.a.z, l.b.x, l.b.z) < 0.6);
    const bad: string[] = [];
    for (const l of anchors.ledges) {
      if (l.drop < WALL_JUMP.maxUp || l.drop > TEAM.boostMax) continue;
      const mx = (l.a.x + l.b.x) / 2;
      const mz = (l.a.z + l.b.z) / 2;
      if (!planned(mx, mz, l.top)) bad.push(`(${mx.toFixed(1)}, ${l.top.toFixed(2)}, ${mz.toFixed(1)}) drop ${l.drop.toFixed(2)}`);
    }
    expect(bad).toEqual([]);
  });
  it('the facility shell offers no lip at all (its pieces are noLedge)', () => {
    const facilityBox = (x: number, z: number): boolean => !SET_IDS.some((id) => inSet(id, x, z, -0.3));
    const onShell = anchors.ledges.filter((l) => facilityBox((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2));
    expect(onShell.map((l) => `${l.a.x.toFixed(1)},${l.a.z.toFixed(1)} top ${l.top}`)).toEqual([]);
  });
});

function distSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const L = dx * dx + dz * dz;
  const t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  const x = ax + dx * t - px;
  const z = az + dz * t - pz;
  return Math.sqrt(x * x + z * z);
}

describe('Marlow Yard: set boxes', () => {
  it('the set boxes and holding rooms never overlap (a parallel builder can never build into another\'s space)', () => {
    const boxes: [string, Box][] = [...SET_IDS.flatMap((id) => SET_BOX[id].map((bx, i) => [`${id}#${i}`, bx] as [string, Box])), ...HOLD_IDS.map((h) => [h, HOLD_BOX[h]] as [string, Box]), ['dock', DOCK_BOX]];
    const over = (p: Box, q: Box): boolean => Math.min(p[2], q[2]) - Math.max(p[0], q[0]) > 0.01 && Math.min(p[3], q[3]) - Math.max(p[1], q[1]) > 0.01;
    const bad: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (over(boxes[i]![1], boxes[j]![1])) bad.push(`${boxes[i]![0]} x ${boxes[j]![0]}`);
    expect(bad).toEqual([]);
  });
  it('every box and anchor a set built lies inside its own set box (0.3 m pad, the boundary walls\' half thickness) and under the hall roof', () => {
    // plan points an anchor occupies (door: the hinge and the closed leaf's far end)
    const pts = (a: Anchor): { x: number; z: number }[] => {
      switch (a.kind) {
        case 'ladder':
        case 'pipeV':
          return [a.base, a.top];
        case 'pipeH':
        case 'ledge':
        case 'zipline':
        case 'split':
        case 'fence':
          return [a.a, a.b];
        case 'duct':
          return a.path;
        case 'window':
          return [a.c];
        case 'door':
          return [a.hinge, { x: a.hinge.x + Math.sin(a.yaw) * a.width, z: a.hinge.z + Math.cos(a.yaw) * a.width }];
        case 'rappel':
          return [a.top];
      }
    };
    const bad: string[] = [];
    for (const id of SET_IDS) {
      const r = built.ranges[id];
      for (let i = r.boxes[0]; i < r.boxes[1]; i++) {
        const bx = b.boxes[i]!;
        // plan half extents of the yawed (and pitched about its local x) box, and its top
        const hx = bx.s[0] / 2;
        const hz = (bx.s[2] / 2) * Math.cos(bx.pitch);
        const sn = Math.abs(Math.sin(bx.yaw));
        const cs = Math.abs(Math.cos(bx.yaw));
        const ex = hx * cs + hz * sn;
        const ez = hx * sn + hz * cs;
        const top = bx.c[1] + (bx.s[1] / 2) * Math.cos(bx.pitch) + (bx.s[2] / 2) * Math.abs(Math.sin(bx.pitch));
        const foot: Box = [bx.c[0] - ex, bx.c[2] - ez, bx.c[0] + ex, bx.c[2] + ez];
        const at = `${id}: box #${i} c (${bx.c.map((v) => v.toFixed(2)).join(', ')}) s (${bx.s.map((v) => v.toFixed(2)).join(', ')}) yaw ${bx.yaw.toFixed(2)}`;
        if (!boxInSet(id, foot, 0.3)) bad.push(`${at} leaves the set box (footprint ${foot.map((v) => v.toFixed(2)).join(', ')})`);
        if (top > HALL_H + 0.01) bad.push(`${at} tops ${top.toFixed(2)} m, over HALL_H ${HALL_H}`);
      }
      for (let i = r.anchors[0]; i < r.anchors[1]; i++) {
        const a = b.anchors.all[i]!;
        for (const p of pts(a)) if (!inSet(id, p.x, p.z, 0.3)) bad.push(`${id}: anchor #${i} (${a.kind}) at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) leaves the set box`);
      }
    }
    expect(bad).toEqual([]);
  });
});
