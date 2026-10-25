/**
 * Marlow Yard re-plan, variant base (J14 slice S0; PLAN section 2): the map `ctcourseReplan` is the same yard built with
 * `{ replan: true }`, unlisted, dark behind `flags.marlowReplan`. Pins: the flag is off by default; the built `ctcourse`
 * is unchanged (no stations, A2 `spotFail` kept); the re-plan registers its own course (eight bays, no strict rule); the
 * slab-with-holes helper; the station rules in `checkSetPart`; the re-plan circuit table (every light works, Q2). Each set
 * slice adds its own cases in `tests/ctcourse/replan/<set>.test.ts`.
 */
import { describe, expect, it, vi } from 'vitest';
import { flags } from '../../../src/core/flags';
import { layoutKnownIds, registeredBayCount, validateCourse } from '../../../src/game/course/courseDef';
import type { StationDef } from '../../../src/game/course/stationDef';
import { LevelBuilder } from '../../../src/world/levelBuilder';
import { applyMapFlicker, FLICKER_STUTTER, lampMapId, mapFlickerSeed, STUTTER_TUBES, TUBE_TOL } from '../../../src/world/lampFlicker';
import { applyMapSway } from '../../../src/world/lampSway';
import { MARLOW_CIRCUITS, MARLOW_CIRCUITS_REPLAN, MARLOW_POCKETS, MARLOW_POCKETS_REPLAN, MARLOW_TIMED, circuitOf, marlowCourseGroups, validateMarlowCircuits } from '../../../src/world/lighting/marlowCircuits';
import { buildCtcourse, ctcourse, ctcourseReplan, LIGHT_SPOTS, lightSpotsReplan, replanLoad, SPOT_FAIL } from '../../../src/world/maps/ctcourse';
import { getMap, MAPS } from '../../../src/world/maps';
import { isListedMap } from '../../../src/world/maps/listed';
import { slabWithHoles } from '../../../src/world/maps/ctcourseGreybox';
import { REPLAN_BUILDERS, REPLAN_FLOOR_HOLES } from '../../../src/world/maps/ctcourseSets/replan';
import { SET_IDS, STATION_MAX, checkSetPart, checkStationNumbers, emptyPart, setBay } from '../../../src/world/maps/ctcourseSets/types';

const built = buildCtcourse(new LevelBuilder());
const replan = buildCtcourse(new LevelBuilder(), { replan: true });

describe('Marlow re-plan variant base (J14 S0)', () => {
  it('the flag is off by default (?marlowreplan=1 turns it on)', () => {
    expect(flags.marlowReplan).toBe(false);
  });

  it('ctcourseReplan is a second, unlisted course map in MAPS after ctcourse (every map-wide check builds it); ctcourse is untouched', () => {
    expect(getMap('ctcourseReplan')).toBe(ctcourseReplan);
    expect(ctcourseReplan.id).toBe('ctcourseReplan');
    expect(ctcourseReplan.modes).toEqual(['course']);
    expect(isListedMap('ctcourseReplan')).toBe(false);
    expect(MAPS.map((m) => m.id).indexOf('ctcourseReplan')).toBe(MAPS.map((m) => m.id).indexOf('ctcourse') + 1);
    expect(getMap('ctcourse')).toBe(ctcourse);
    expect(ctcourse.id).toBe('ctcourse');
    // flag off: only the built course registers at load; the re-plan's own data build has its eight bays
    expect(registeredBayCount('ctcourseReplan')).toBe(0);
    expect(replanLoad().layout.course!.def.bays.length).toBe(8);
    expect(registeredBayCount('ctcourse')).toBe(8);
    expect(ctcourseReplan.build(new LevelBuilder(), 1).course!.def.id).toBe('ctcourseReplan');
    expect(ctcourse.build(new LevelBuilder(), 1).course!.def.id).toBe('ctcourse');
  });

  it('importing ctcourse.ts with the flag off builds the yard once; the re-plan builds on first ask, once (S0 check fix 1)', async () => {
    vi.resetModules();
    const m = await import('../../../src/world/maps/ctcourse');
    const cd = await import('../../../src/game/course/courseDef');
    expect(m.ctcourseBuildCount()).toBe(1);
    expect(cd.registeredBayCount('ctcourse')).toBe(8);
    expect(cd.registeredBayCount('ctcourseReplan')).toBe(0);
    const a = m.replanLoad();
    expect(m.replanLoad()).toBe(a);
    expect(m.ctcourseBuildCount()).toBe(2);
  });

  it('with ?marlowreplan=1 the import also builds and registers the re-plan (the lobby counts its bays)', async () => {
    vi.stubGlobal('location', { search: '?marlowreplan=1' });
    try {
      vi.resetModules();
      const m = await import('../../../src/world/maps/ctcourse');
      const cd = await import('../../../src/game/course/courseDef');
      expect(m.ctcourseBuildCount()).toBe(2);
      expect(cd.registeredBayCount('ctcourseReplan')).toBe(8);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it('every set has a re-plan builder; the built yard builds without them (same parts, no stations)', () => {
    expect(Object.keys(REPLAN_BUILDERS)).toEqual([...SET_IDS]);
    expect(built.parts.map((p) => p.id)).toEqual([...SET_IDS]);
    expect(replan.parts.map((p) => p.id)).toEqual([...SET_IDS]);
    for (const bay of built.layout.course!.def.bays) expect(bay.stations).toBeUndefined();
  });

  it('the re-plan course: eight bays A1-A8 with the built chain, validates, and has no strict rule (A2 spotFail off); the built A2 keeps it', () => {
    const c = replan.layout.course!;
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    expect(c.def.bays.map((x) => x.id)).toEqual(SET_IDS.map(setBay));
    expect(c.def.bays.map((x) => [x.entry, x.exit])).toEqual(built.layout.course!.def.bays.map((x) => [x.entry, x.exit]));
    expect(c.def.bays.every((x) => x.spotFail === undefined)).toBe(true);
    expect(built.layout.course!.def.bays.find((x) => x.id === 'A2')!.spotFail).toBe(SPOT_FAIL.a2CarriageShed);
    expect(c.def.airlocks.map((a) => a.id)).toEqual(built.layout.course!.def.airlocks.map((a) => a.id));
  });

  it('every re-plan part passes the set-part contract, and station numbers are unique across the course', () => {
    for (const p of replan.parts) expect(checkSetPart(p), p.id).toEqual([]);
    expect(checkStationNumbers(replan.parts)).toEqual([]);
    const a = emptyPart('a1Gate');
    const b2 = emptyPart('a2CarriageShed');
    const s = { n: 4, id: 'a1-x', lesson: 'x', marks: [{ x: 1, z: 1, y: 0, yaw: 0 }, { x: 1, z: 1, y: 0, yaw: 0 }], retry: 'none', guards: [], gates: [], doneFlag: 'f' } as StationDef;
    a.bay.stations = [s];
    b2.bay.stations = [{ ...s, id: 'a2-x' }];
    expect(checkStationNumbers([a, b2]).join()).toMatch(/station number 4 is in both a1-x and a2-x/);
  });

  it('with the S0 stubs (no holes) the re-plan course groups are the re-plan table and the facility spots are the built ones', () => {
    expect(replan.layout.course!.groups).toEqual(marlowCourseGroups(MARLOW_CIRCUITS_REPLAN));
    if (REPLAN_FLOOR_HOLES.length > 0) return;
    expect(lightSpotsReplan().facility.map((s) => s.name)).toEqual(LIGHT_SPOTS.facility.map((s) => s.name));
  });

  it('slabWithHoles: no holes is the one slab b.floor makes; holes are left open and the rest is covered', () => {
    const plain = new LevelBuilder();
    plain.floor(80, 39, 160, 78, '#444');
    const none = new LevelBuilder();
    slabWithHoles(none, 0, 0, 160, 78, 0, [], '#444');
    expect(none.boxes.length).toBe(1);
    expect(none.boxes[0]).toEqual(plain.boxes[0]);
    const cut = new LevelBuilder();
    const holes = [[50, 10, 53, 13], [100, 40, 104, 50]] as const;
    slabWithHoles(cut, 0, 0, 160, 78, 0, holes, '#444');
    const area = cut.boxes.reduce((a, p) => a + p.s[0] * p.s[2], 0);
    expect(area).toBeCloseTo(160 * 78 - 3 * 3 - 4 * 10, 6);
    for (const p of cut.boxes) for (const h of holes) expect(p.c[0] > h[0] && p.c[0] < h[2] && p.c[2] > h[1] && p.c[2] < h[3]).toBe(false);
    // a hole that runs past the slab edge still leaves a valid cover
    const edge = new LevelBuilder();
    slabWithHoles(edge, 0, 0, 160, 78, 0, [[150, 70, 170, 90]], '#444');
    expect(edge.boxes.reduce((a, p) => a + p.s[0] * p.s[2], 0)).toBeCloseTo(160 * 78 - 10 * 8, 6);
  });

  it("checkSetPart checks the stations: numbers 1-21 and unique (play order need not rise), marks inside the set box, guards in the squad, ids the set's", () => {
    const mark = (x: number, z: number): StationDef['marks'][0] => ({ x, z, y: 0, yaw: 0 });
    const st = (o: Partial<StationDef>): StationDef => ({ n: 1, id: 'a2-plank', lesson: 'plank_bridge', marks: [mark(40, 10), mark(41, 10)], retry: 'station', guards: [], gates: [], doneFlag: 'a2-plank-done', ...o });
    const run = (stations: StationDef[], squad: string[] = []): string => {
      const p = emptyPart('a2CarriageShed');
      p.bay.stations = stations;
      p.bay.squad = squad;
      return checkSetPart(p).filter((l) => /station/.test(l)).join('\n');
    };
    expect(run([st({}), st({ n: 2, id: 'a2-vent' })])).toBe('');
    expect(STATION_MAX).toBe(21);
    expect(run([st({ n: 0 })])).toMatch(/not 1-21/);
    expect(run([st({ n: 22 })])).toMatch(/not 1-21/);
    expect(run([st({ n: 1.5 })])).toMatch(/not 1-21/);
    expect(run([st({ n: 21 })])).toBe('');
    expect(run([st({ n: 9 }), st({ n: 8, id: 'a2-vent' }), st({ n: 10, id: 'a2-last' })])).toBe('');
    expect(run([st({ n: 3 }), st({ n: 3, id: 'a2-vent' })])).toMatch(/used twice/);
    expect(run([st({ marks: [mark(40, 10), mark(90, 10)] })])).toMatch(/outside the set box/);
    expect(run([st({ guards: ['a2-shunter'] })])).toMatch(/not in the bay's squad/);
    expect(run([st({ guards: ['a2-shunter'] })], ['a2-shunter'])).not.toMatch(/squad/);
    expect(run([st({ id: 'a3-plank' })])).toMatch(/does not carry the tag/);
  });
});

describe('Marlow re-plan circuits (J14 S0, A20: every light works)', () => {
  it('the re-plan table passes every plan rule with the re-plan pockets', () => {
    expect(validateMarlowCircuits(MARLOW_CIRCUITS_REPLAN, MARLOW_TIMED, MARLOW_POCKETS_REPLAN)).toEqual([]);
  });

  it('groups 49 and 69 are live switched circuits; the A4 dispatch office (44), the A8 vestibule (85) and west bays (86) have their own switches; the A2 coat corner lamp is on circuit 22', () => {
    const by = (g: number) => MARLOW_CIRCUITS_REPLAN.find((c) => c.group === g)!;
    for (const g of [49, 69, 44, 85, 86]) {
      const c = by(g);
      expect(c.kind, `group ${g}`).toBe('switch');
      expect(c.switches.length, `group ${g}`).toBeGreaterThan(0);
      expect(c.lamps, `group ${g}`).toBeGreaterThan(0);
      expect(c.cutBy).toEqual(['switch', 'jam', 'shot']);
    }
    expect(by(22).lamps).toBe(circuitOf(22)!.lamps + 1);
    expect(MARLOW_CIRCUITS_REPLAN.filter((c) => c.kind === 'dead')).toEqual([]);
    const live = marlowCourseGroups(MARLOW_CIRCUITS_REPLAN);
    expect(live['a4-bulk']).toBe(49);
    expect(live['a6-sump']).toBe(69);
    expect(live['a4-dispatch']).toBe(44);
    expect(live['a8-vestibule']).toBe(85);
    expect(live['a8-west']).toBe(86);
  });

  it('the built table and pockets are untouched; the re-plan drops only the pockets its lamps light', () => {
    expect(marlowCourseGroups()['a4-bulk']).toBeUndefined();
    expect(MARLOW_CIRCUITS.filter((c) => c.kind === 'dead').map((c) => c.group)).toEqual([49, 69]);
    expect(MARLOW_POCKETS_REPLAN.map((p) => p.id)).toEqual(['a5-landing', 'a5-pen1']);
    expect(MARLOW_POCKETS.length).toBe(10);
    // the other circuits are the built rows
    for (const c of MARLOW_CIRCUITS) if (![22, 49, 69].includes(c.group)) expect(MARLOW_CIRCUITS_REPLAN.find((r) => r.group === c.group)).toBe(c);
  });

  it('the re-plan layout carries the new groups; the built layout does not', () => {
    const g = replan.layout.course!.groups;
    for (const k of ['a4-bulk', 'a6-sump', 'a4-dispatch', 'a8-vestibule', 'a8-west']) expect(g?.[k], k).toBeDefined();
    expect(built.layout.course!.groups?.['a4-bulk']).toBeUndefined();
  });
});

describe('Marlow re-plan lamps (J14 S0 check fix 3): the same stutter tube, swinging pendants and flicker seed as ctcourse', () => {
  // Registry ids shift by every lamp a set slice adds before a fitting, so the pins are positions (the tables
  // `lampMapId` resolves both maps through), the stutter mode and the flicker seed: a moved tube or pendant, or a new
  // seed, fails; extra lamps elsewhere do not.
  it('both layouts resolve the tube and pendants at the same positions, with the same flicker seed', () => {
    const lamps = (m: typeof ctcourse) => {
      const b = new LevelBuilder();
      m.build(b, 1);
      const tube = applyMapFlicker(b.lights, m.id, 7);
      const sway = applyMapSway(b, m.id);
      const pos = (id: number): number[] => {
        const l = b.lights.lights[id]!;
        return [l.x, l.y, l.z];
      };
      return {
        tube: tube >= 0 ? pos(tube) : null,
        stutter: tube >= 0 ? b.lights.flickerMode(tube) : -1,
        seed: b.lights.flickerSeed,
        sway: sway ? [...sway.ids].map(pos) : [],
      };
    };
    expect(lampMapId('ctcourseReplan')).toBe('ctcourse');
    const a = lamps(ctcourse);
    const r = lamps(ctcourseReplan);
    // the built course's tube is the table's first row (A7 data hall); the re-plan resolves the same fitting
    const t0 = STUTTER_TUBES.ctcourse![0]!;
    expect(a.tube).not.toBeNull();
    const want = [t0.x, t0.y, t0.z];
    for (let i = 0; i < 3; i++) expect(Math.abs(a.tube![i]! - want[i]!)).toBeLessThanOrEqual(TUBE_TOL);
    expect(r.tube).toEqual(a.tube);
    expect(a.stutter).toBe(FLICKER_STUTTER);
    expect(r.stutter).toBe(FLICKER_STUTTER);
    expect(a.seed).toBe(mapFlickerSeed('ctcourse', 7));
    expect(r.seed).toBe(a.seed);
    expect(a.sway.length).toBeGreaterThanOrEqual(4);
    expect(r.sway).toEqual(a.sway);
  });
});
