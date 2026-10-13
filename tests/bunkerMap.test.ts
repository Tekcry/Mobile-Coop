import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { bunker } from '../src/world/maps/bunker';
import { B2_METRICS, BUNKER_LIPS, UPPER_Y, at } from '../src/world/maps/bunkerUpper';
import { getMap } from '../src/world/maps';
import { isListedMap } from '../src/world/maps/listed';
import { layoutKnownIds, validateCourse } from '../src/game/course/courseDef';
import { findJumpTarget, generateLedges, HANG, LEDGE, REACH, type Ledge } from '../src/world/anchors';
import { attachPose, attachRange, type AttachPose } from '../src/player/attach';
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
    for (const id of ['A1-near', 'A1-far', 'A2-near', 'A2-far', 'B2-lane-n', 'B2-lane-s', 'B2-exit-n', 'B2-exit-s']) expect(doors.has(c.doors[id]!)).toBe(true);
    // each lane's walkway door (east end) opens with that lane's x 24 gate lever: no way round the gate
    const gates = c.def.bays[1]!.gates.filter((g) => g.kind === 'lever');
    for (const l of ['n', 's']) {
      const sw = gates.filter((g) => g.kind === 'lever' && g.doorId === `B2-lane-${l}`).map((g) => (g.kind === 'lever' ? g.switchId : ''));
      const ex = gates.filter((g) => g.kind === 'lever' && g.doorId === `B2-exit-${l}`).map((g) => (g.kind === 'lever' ? g.switchId : ''));
      expect(ex, l).toEqual(sw);
    }
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
      // Lane S: the ladder-head landing's east-face lip also lies in L1's box (6)
      expect(l1.length, lane).toBe(lane === 'N' ? 5 : 6);
      expect(l1.every((l) => l.canHang && !l.canClimbUp)).toBe(true);
      expect(l2.length).toBe(1);
      expect(l2[0]!.canClimbUp).toBe(true);
      // the 2.2 gap is hand to hand: the stub's grip (inside its edge margins) to L2's nearest grip
      const stub = l1.reduce((p, l) => (Math.max(l.a.x, l.b.x) > Math.max(p.a.x, p.b.x) ? l : p));
      const rs = attachRange(stub);
      const l2r = attachRange(l2[0]!);
      const stubGrip = Math.min(stub.a.x, stub.b.x) + rs.min;
      const l2Grip = Math.min(l2[0]!.a.x, l2[0]!.b.x) + l2r.min;
      expect(l2Grip - stubGrip).toBeCloseTo(M.gap, 5);
      // two outside corners round the column: the chain is linked end to end
      expect(l1.filter((l) => l.nextA >= 0 || l.nextB >= 0).length).toBe(l1.length);
    }
  });

  it('item 11: the engine jump from the hang on the L1 stub (east, real 2.5 limit) lands on L2, both lanes', () => {
    for (const lane of ['N', 'S']) {
      const lipOf = (id: string): Ledge[] => manual.filter((l) => inLip(l, BUNKER_LIPS.find((p) => p.id === id)!.box, UPPER_Y + M.beam));
      const stub = lipOf(`L1${lane}`).reduce((p, l) => (Math.max(l.a.x, l.b.x) > Math.max(p.a.x, p.b.x) ? l : p));
      const l2 = lipOf(`L2${lane}`)[0]!;
      // the controller's grip centre (attachController gripCentre): the hang pose's x / z at the lip top
      const r = attachRange(stub);
      const pose: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 };
      attachPose(stub, r.max, 1, 1.75, pose);
      const from = { x: pose.x, y: stub.top, z: pose.z };
      // attachController ~:1075: findJumpTarget(..., up 0, maxGap 2.5, minCos 0.6, the held lip's normal)
      const t = findJumpTarget(b.anchors, from, stub.id, 1, 0, 0, 2.5, 0.6, stub.nx, stub.nz);
      expect(t?.anchor.id, lane).toBe(l2.id);
    }
  });

  it('Lane S item 9: the ladder tops out on a landing at the beam height whose lip chains into L1', () => {
    const lad = b.anchors.ladders.filter((l) => Math.abs(l.top.y - (UPPER_Y + M.beam)) < 0.01);
    expect(lad.length).toBe(1);
    const top = lad[0]!;
    // the top step-off (attachController detach 'top': top + 0.2 along facing) lands on the landing box
    const ex = top.top.x + Math.sin(top.facing) * 0.2;
    const ez = top.top.z + Math.cos(top.facing) * 0.2;
    const on = b.boxes.some((p) => p.collide && Math.abs(p.c[1] + p.s[1] / 2 - top.top.y) < 0.01 && Math.abs(ex - p.c[0]) <= p.s[0] / 2 - 0.1 && Math.abs(ez - p.c[2]) <= p.s[2] / 2 - 0.1);
    expect(on).toBe(true);
    const head = manual.filter((l) => inLip(l, BUNKER_LIPS.find((p) => p.id === 'LHS')!.box, UPPER_Y + M.beam));
    expect(head.length).toBe(2);
    expect(head.every((l) => l.canHang && !l.canClimbUp)).toBe(true);
    // linked: the front edge to the east face (an outside corner), the east face on into L1 (an inside corner)
    expect(head.every((l) => l.nextA >= 0 || l.nextB >= 0)).toBe(true);
    expect(head.filter((l) => l.nextA >= 0 && l.nextB >= 0).length).toBe(1);
  });

  it('A26: the B2 glass walls (z 15, z 21) carry no fence or climbing anchor; a full-height collision box stops movement', () => {
    for (const z of [15, 21].map((v) => at('B2', 0, v).z)) {
      const onLine = (x0: number, z0: number, x1: number, z1: number): boolean =>
        Math.abs(z0 - z) < 0.3 && Math.abs(z1 - z) < 0.3 && Math.max(x0, x1) > at('B2', 0, 0).x && Math.min(x0, x1) < at('B2', 48, 0).x;
      expect(b.anchors.fences.filter((f) => onLine(f.a.x, f.a.z, f.b.x, f.b.z))).toEqual([]);
      expect(b.anchors.ladders.filter((l) => onLine(l.base.x, l.base.z, l.base.x, l.base.z))).toEqual([]);
      expect(b.anchors.ledges.filter((l) => l.top >= UPPER_Y && onLine(l.a.x, l.a.z, l.b.x, l.b.z))).toEqual([]);
      const wall = b.boxes.filter((p) => p.collide && p.visible === false && p.noLedge && Math.abs(p.c[2] - z) < 0.01 && p.s[1] >= 12 - 0.01);
      const len = wall.reduce((n, p) => n + p.s[0], 0);
      expect(len).toBeGreaterThan(48 - 2 * 1.2 - 0.5);
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
