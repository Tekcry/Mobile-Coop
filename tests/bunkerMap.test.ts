import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { bunker } from '../src/world/maps/bunker';
import { B2_METRICS, BUNKER_LIPS, UPPER_Y, at } from '../src/world/maps/bunkerUpper';
import { getMap } from '../src/world/maps';
import { isListedMap } from '../src/world/maps/listed';
import { layoutKnownIds, validateCourse } from '../src/game/course/courseDef';
import { generateLedges, HANG, LEDGE, REACH, type Ledge } from '../src/world/anchors';
import { buildCoverSegments } from '../src/cover/coverData';
import { findSplitGaps } from '../src/player/splitJump';
import { landingKind, pickTraversal } from '../src/player/movement';

// Map tests build data only (T0 facts): ledges and splits come from `build`, so they are re-derived from the boxes.
const b = new LevelBuilder();
const lay = bunker.build(b, 0);
const generated = generateLedges(b.boxes).ledges;
const manual = b.anchors.ledges;
const M = B2_METRICS;

function inLip(l: Ledge, box: readonly number[], top: number): boolean {
  const ok = (x: number, z: number): boolean => x >= box[0]! && x <= box[2]! && z >= box[1]! && z <= box[3]!;
  return Math.abs(l.top - top) < 0.02 && ok(l.a.x, l.a.z) && ok(l.b.x, l.b.z);
}

describe('Fallow (bunker) Upper level (T2)', () => {
  it('is registered, course and sandbox, not listed, five nav layers', () => {
    expect(getMap('bunker').id).toBe('bunker');
    expect(bunker.modes).toEqual(['course', 'sandbox']);
    expect(isListedMap('bunker')).toBe(false);
    expect(bunker.navLayers).toBe(5);
    expect(bunker.theme.sunIntensity).toBe(0);
  });

  it('spawns in the lift lobby facing east; debug points for B1, A1, B2, A2', () => {
    expect(lay.playerSpawns.map((s) => [s.pos.x, s.pos.y, s.pos.z, s.yaw])).toEqual([
      [at('B1', 2, 12).x, UPPER_Y, at('B1', 2, 12).z, Math.PI / 2],
      [at('B1', 4, 12).x, UPPER_Y, at('B1', 4, 12).z, Math.PI / 2],
    ]);
    expect(lay.debugPoints!.map((d) => d.id).sort()).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(lay.debugPoints!.every((d) => d.group === 'Fallow')).toBe(true);
  });

  it('the course stub validates against the built ids (B1, B2; lane levers; A1, A2)', () => {
    const c = lay.course!;
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    expect(c.def.bays.map((x) => x.id)).toEqual(['B1', 'B2']);
    const doors = new Set(b.anchors.doors.filter((d) => d.locked).map((d) => d.id));
    for (const id of ['A1-near', 'A1-far', 'A2-near', 'A2-far', 'B2-lane-n', 'B2-lane-s']) expect(doors.has(c.doors[id]!)).toBe(true);
    expect(c.devices.end).toBeDefined();
  });

  it('has no split gaps on the Upper level', () => {
    const gaps = findSplitGaps(buildCoverSegments(b.boxes, b.cylinders)).filter((g) => g.a.y >= UPPER_Y - 2);
    expect(gaps).toEqual([]);
  });

  it('every lip is one BAYS names (BUNKER_LIPS), and every named lip exists', () => {
    const upper = generated.filter((l) => l.top >= UPPER_Y);
    const stray = upper.filter((l) => !BUNKER_LIPS.some((p) => inLip(l, p.box, p.top)));
    expect(stray.map((l) => [l.a, l.b, l.top])).toEqual([]);
    for (const p of BUNKER_LIPS) {
      const have = [...upper, ...manual].some((l) => inLip(l, p.box, p.top));
      expect(have, p.id).toBe(true);
    }
  });

  it('ground verbs: step, vault, mantle', () => {
    expect(pickTraversal({ height: M.step, depth: 1, landingClear: true, topClear: true })).toBe('step');
    expect(pickTraversal({ height: M.vault, depth: M.vaultThick, landingClear: true, topClear: false })).toBe('vault');
    expect(pickTraversal({ height: M.mantle, depth: 2, landingClear: false, topClear: true })).toBe('mantle');
  });

  it('climbing metrics: pipe reach from G1, hang-drop and jump-down off G2, L1 hang only, L2 climbable, gap 2.2', () => {
    const reach = M.pipe - M.gallery;
    expect(reach).toBeGreaterThanOrEqual(REACH.grabMin);
    expect(reach).toBeLessThanOrEqual(REACH.grabMax);
    expect(M.pipe - HANG.drop).toBeGreaterThan(M.gallery);
    expect(landingKind(M.gallery - HANG.drop)).toBe('soft');
    expect(landingKind(M.gallery)).toBe('roll');
    expect(M.l1Depth).toBeLessThan(LEDGE.climbDepth);
    expect(M.l2Depth).toBeGreaterThanOrEqual(LEDGE.climbDepth);
    for (const lane of ['N', 'S']) {
      const l1 = manual.filter((l) => inLip(l, BUNKER_LIPS.find((p) => p.id === `L1${lane}`)!.box, UPPER_Y + M.beam));
      const l2 = manual.filter((l) => inLip(l, BUNKER_LIPS.find((p) => p.id === `L2${lane}`)!.box, UPPER_Y + M.beam));
      expect(l1.length, lane).toBe(5);
      expect(l1.every((l) => l.canHang && !l.canClimbUp)).toBe(true);
      expect(l2.length).toBe(1);
      expect(l2[0]!.canClimbUp).toBe(true);
      // the stub's east end to L2's west end along the wall
      const stubEnd = Math.max(...l1.flatMap((l) => [l.a.x, l.b.x]));
      const l2Start = Math.min(l2[0]!.a.x, l2[0]!.b.x);
      expect(l2Start - stubEnd).toBeCloseTo(M.gap, 5);
      // two outside corners round the column: the chain is linked end to end
      expect(l1.filter((l) => l.nextA >= 0 || l.nextB >= 0).length).toBe(5);
    }
  });

  it('drop pads off P land in their bands: soft, roll, heavy', () => {
    expect(landingKind(M.platform - M.padSoft)).toBe('soft');
    expect(landingKind(M.platform - M.padRoll)).toBe('roll');
    expect(landingKind(M.platform - M.pit)).toBe('heavy');
    // the pit floor stays above the nav sampler's floor (SPEC engine Q1)
    expect(UPPER_Y + M.pit).toBeGreaterThan(-1.5);
  });
});
