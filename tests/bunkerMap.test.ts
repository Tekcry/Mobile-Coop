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
import type { SplitAnchor, TraversalAnchors } from '../src/world/anchors';
import { B3_METRICS, B4_METRICS, BUNKER_COOP_LIPS, PLANT_LIPS, PLANT_Y, plantAt } from '../src/world/maps/bunkerShaft';
import { RAPPEL, SPLIT, TEAM, WALL_JUMP } from '../src/config/movement';
import { splitReach, wallJumpReach } from '../src/player/splitJump';

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
    const ids = lay.debugPoints!.map((d) => d.id);
    for (const id of ['A1', 'A2', 'B1', 'B2']) expect(ids).toContain(id);
    expect(lay.debugPoints!.every((d) => d.group === 'Fallow')).toBe(true);
  });

  it('the course stub validates against the built ids (B1, B2; lane levers; A1, A2)', () => {
    const c = lay.course!;
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    expect(c.def.bays.map((x) => x.id).slice(0, 2)).toEqual(['B1', 'B2']);
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
    const gaps = findSplitGaps(buildCoverSegments(b.boxes, b.cylinders)).filter((g) => g.a.y >= UPPER_Y - 2 && g.a.x < 84);
    expect(gaps).toEqual([]);
  });

  it('every lip is one BAYS names (BUNKER_LIPS), and every named lip exists', () => {
    const upper = generated.filter((l) => l.top >= UPPER_Y && Math.max(l.a.x, l.b.x) <= 84);
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

// ------------------------------------------------------------------------------------------------ T3: B3, A3, B4, A4

describe('Fallow (bunker) shaft and reservoir (T3)', () => {
  // the anchors `build` would make: manual ones, generated ledges, split anchors (in that order, as levelBuilder.build)
  const pb = new LevelBuilder();
  const play = bunker.build(pb, 0);
  generateLedges(pb.boxes, pb.anchors);
  const gaps = findSplitGaps(buildCoverSegments(pb.boxes, pb.cylinders));
  for (const g of gaps) pb.anchors.add<SplitAnchor>({ kind: 'split', ...g } as SplitAnchor);
  const A: TraversalAnchors = pb.anchors;
  const M3 = B3_METRICS;
  const M4 = B4_METRICS;
  const b3 = (x: number, z: number, y = 0) => plantAt('B3', x, z, y);
  const b4 = (x: number, z: number, y = 0) => plantAt('B4', x, z, y);
  const inBay = (bay: 'B3' | 'B4', x: number, z: number): boolean => {
    const o = bay === 'B3' ? b3(0, 0) : b4(0, 0);
    const [w, d] = bay === 'B3' ? [24, 18] : [36, 38];
    return x >= o.x - 0.5 && x <= o.x + w && z >= o.z - 0.5 && z <= o.z + d;
  };
  const lipOf = (id: string) => PLANT_LIPS.find((l) => l.id === id)!;
  const genPlant = generated.filter((l) => l.top < UPPER_Y + 8 && (inBay('B3', l.a.x, l.a.z) || inBay('B4', l.a.x, l.a.z)) && l.top >= PLANT_Y - 4.5);
  const splits = A.all.filter((a): a is SplitAnchor => a.kind === 'split');
  const atPose = (a: Parameters<typeof attachPose>[0], s: number, face: number) => attachPose(a, s, face, 1.75, { x: 0, y: 0, z: 0, yaw: 0 });

  it('debug points B3, B3-G3, B3-floor, B4, A3, A4 (and the RC slot, the rope)', () => {
    const ids = play.debugPoints!.map((d) => d.id);
    for (const id of ['B3', 'B3-G3', 'B3-floor', 'B4', 'A3', 'A4', 'B3-RC', 'B3-rope']) expect(ids, id).toContain(id);
    const g1 = play.debugPoints!.find((d) => d.id === 'B3')!;
    expect(g1.pos.y).toBeCloseTo(PLANT_Y + M3.g1, 5);
  });

  it('the course stub: B3 (fan guard and duct locked until the isolator, CR bolted), B4 (bolt, sluice, outlet ladder), A3, A4', () => {
    const c = play.course!;
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    expect(c.def.bays.map((x) => [x.id, x.entry, x.exit])).toEqual([
      ['B1', 'start', 'A1'],
      ['B2', 'A1', 'A2'],
      ['B3', 'A2', 'A3'],
      ['B4', 'A3', 'end'],
    ]);
    const locked = new Set(pb.anchors.doors.filter((d) => d.locked).map((d) => d.id));
    for (const id of ['A3-near', 'A3-far', 'A4-near', 'A4-far', 'B3-cr', 'B4-insp', 'B4-sluice']) expect(locked.has(c.doors[id]!), id).toBe(true);
    // every way into the pit (four fence sides) and the duct out of it wait for the isolator
    const b3g = c.def.bays[2]!.gates;
    const locks = b3g.filter((g) => g.kind === 'anchorLock').map((g) => (g.kind === 'anchorLock' ? [g.anchorId, g.flag] : []));
    expect(locks.sort()).toEqual([['B3-duct', 'fan-off'], ['B3-fence-e', 'fan-off'], ['B3-fence-n', 'fan-off'], ['B3-fence-s', 'fan-off'], ['B3-fence-w', 'fan-off']]);
    expect(b3g.some((g) => g.kind === 'pickup' && g.switchId === 'sw-isolator' && g.flag === 'fan-off')).toBe(true);
    const fenceIds = new Set(['n', 'e', 's', 'w'].map((k) => c.anchors![`B3-fence-${k}`]));
    expect(pb.anchors.fences.filter((f) => inBay('B3', f.a.x, f.a.z)).every((f) => fenceIds.has(f.id))).toBe(true);
    expect(c.devices.end).toBeDefined();
    expect(c.devices.end!.y).toBeCloseTo(plantAt('A4', 0, 0).y, 5);
  });

  it('exactly one split gap in B3: the RC slot (1.6 wide, both faces >= 3.6, on G1); B4 only the overflow channel', () => {
    const inB3 = splits.filter((g) => inBay('B3', g.a.x, g.a.z));
    expect(inB3.length).toBe(1);
    const rc = inB3[0]!;
    expect(rc.width).toBeCloseTo(M3.slot, 5);
    expect(rc.height).toBeGreaterThanOrEqual(SPLIT.minHeight);
    expect(rc.a.y).toBeCloseTo(PLANT_Y + M3.g1, 5);
    expect(Math.min(rc.a.x, rc.b.x)).toBeGreaterThanOrEqual(b3(6, 0).x);
    expect(Math.max(rc.a.x, rc.b.x)).toBeLessThanOrEqual(b3(12, 0).x);
    const inB4 = splits.filter((g) => inBay('B4', g.a.x, g.a.z));
    expect(inB4.length).toBe(1);
    expect(inB4[0]!.a.x).toBeCloseTo(b4(0.8, 0).x, 5);
    // anything else between the plant floors and the shaft top is no split (A3, A4 too)
    expect(splits.filter((g) => g.a.y < UPPER_Y - 2 && !inBay('B3', g.a.x, g.a.z) && !inBay('B4', g.a.x, g.a.z))).toEqual([]);
  });

  it('RC: from the split (real pose, both facings) the engine jump-up lands on the casing top lip, 4.3 over G1', () => {
    const rc = splits.find((g) => inBay('B3', g.a.x, g.a.z))!;
    const casing = A.ledges.filter((l) => inLip(l, lipOf('RC').box, lipOf('RC').top));
    expect(casing.length).toBeGreaterThan(0);
    const ids = new Set(casing.map((l) => l.id));
    // offered where the player stands in the slot (splitReach), then the controller's findJump probe (it looks 1.2 m
    // ahead along the facing: the casing lip must run on that far, so facing out of the slot's last 1.5 m finds none)
    for (const face of [1, -1] as const) {
      for (const s of face === 1 ? [0.5, rc.len / 2, rc.len - 1.5] : [1.5, rc.len / 2, rc.len - 0.5]) {
        const p = atPose(rc, s, face);
        expect(splitReach(rc, p.x, rc.a.y, p.z, rc.tx * face, rc.tz * face), `${face} ${s}`).not.toBeNull();
        const from = { x: p.x, y: rc.a.y + SPLIT.feetHeight + 1.05, z: p.z };
        const t = findJumpTarget(A, from, rc.id, rc.tx * face, rc.tz * face, 1, 2.5, 0.6, 0, 0);
        expect(t, `${face} ${s}`).not.toBeNull();
        expect(ids.has(t!.anchor.id), `${face} ${s}`).toBe(true);
        expect(t!.grip.y - rc.a.y).toBeGreaterThanOrEqual(3.95);
        expect(t!.grip.y - rc.a.y).toBeLessThanOrEqual(4.75);
      }
    }
    // the bridge steps down 0.3 from the casing top to G2
    expect(M3.casingTop + M3.g1 - M3.bridgeStep).toBeCloseTo(M3.g2, 5);
  });

  it('WJ: G3 lip 3.4 over G2 (2.7-3.8); straight kick from G2 and the north-east inside corner', () => {
    expect(M3.g3 - M3.g2).toBeGreaterThanOrEqual(WALL_JUMP.minUp);
    expect(M3.g3 - M3.g2).toBeLessThanOrEqual(WALL_JUMP.maxUp);
    const front = generated.find((l) => inLip(l, lipOf('G3').box, lipOf('G3').top) && l.nz < -0.9)!;
    expect(front).toBeDefined();
    const g2 = PLANT_Y + M3.g2;
    // straight: on G2 0.6 short of the face, facing north
    const st = b3(15, 11.4);
    expect(wallJumpReach(front, st.x, g2, st.z, 0, 1)?.corner).toBe(false);
    // inside corner: in the corner facing the east wall, the lip side-on
    const co = b3(17.4, 11.4);
    expect(wallJumpReach(front, co.x, g2, co.z, 1, 0)?.corner).toBe(true);
    // nothing in wall-jump reach from G1 (only the split goes up from there)
    const fromG1 = genPlant.filter((l) => l.canHang && l.top - (PLANT_Y + M3.g1) >= WALL_JUMP.minUp && l.top - (PLANT_Y + M3.g1) <= WALL_JUMP.maxUp);
    expect(fromG1).toEqual([]);
  });

  it('lips only where planned (PLANT_LIPS); every planned lip exists', () => {
    const stray = genPlant.filter((l) => !PLANT_LIPS.some((p) => inLip(l, p.box, p.top)));
    expect(stray.map((l) => [l.a, l.b, l.top])).toEqual([]);
    for (const p of PLANT_LIPS) expect(genPlant.some((l) => inLip(l, p.box, p.top)), p.id).toBe(true);
  });

  it('RP: rope 17.4 to the chamber floor, entry from the hoist recess, kick-through window in reach on the way down', () => {
    const rp = pb.anchors.all.find((a) => a.id === play.course!.anchors!['B3-rappel'])!;
    expect(rp.kind).toBe('rappel');
    if (rp.kind !== 'rappel') return;
    expect(rp.top.y - rp.length).toBeCloseTo(PLANT_Y, 5);
    expect(rp.length).toBeCloseTo(M3.rope, 5);
    // the recess floor under the hook-on spot (0.3 behind the edge): a collide box whose top is the rope top
    const st = { x: rp.top.x - rp.nx * 0.3, z: rp.top.z - rp.nz * 0.3 };
    const on = pb.boxes.some((p) => p.collide && Math.abs(p.c[1] + p.s[1] / 2 - rp.top.y) < 0.01 && Math.abs(st.x - p.c[0]) <= p.s[0] / 2 && Math.abs(st.z - p.c[2]) <= p.s[2] / 2);
    expect(on).toBe(true);
    // attachController window check (:739-744): in the rope's wall plane, beside the body, sill near the feet
    const w = pb.anchors.all.find((a) => a.kind === 'window' && inBay('B3', a.c.x, a.c.z) && a.breakable)!;
    expect(w).toBeDefined();
    if (w.kind !== 'window') return;
    expect(w.sillHeight).toBeCloseTo(PLANT_Y + M3.windowSill, 5);
    let reach = false;
    for (let s = 0; s <= rp.length; s += 0.1) {
      const p = atPose(rp, s, 1);
      const off = (p.x - w.c.x) * rp.nx + (p.z - w.c.z) * rp.nz;
      const lat = Math.abs((p.x - w.c.x) * -rp.nz + (p.z - w.c.z) * rp.nx);
      if (off >= 0 && off <= 1.4 && lat <= Math.max(RAPPEL.windowReach, w.w / 2) && Math.abs(w.sillHeight - (p.y + 0.6)) <= 0.8) reach = true;
    }
    expect(reach).toBe(true);
    // the kick-through lands inside CR (between the east wall and CR's far wall)
    const tx = w.c.x - rp.nx * 0.9;
    expect(tx).toBeGreaterThan(b3(18.45, 0).x);
    expect(tx).toBeLessThan(b3(23, 0).x);
  });

  it('ZP: from G3 (cable 2.0 over it) to cable end 4.5 over WP (floor 2.6); the ride clears every piece under it', () => {
    const z = pb.anchors.all.find((a) => a.id === play.course!.anchors!['B3-zipline'])!;
    if (z.kind !== 'zipline') throw new Error('no zipline');
    expect(z.a.y - (PLANT_Y + M3.g3)).toBeGreaterThanOrEqual(1.5);
    expect(z.a.y - (PLANT_Y + M3.g3)).toBeLessThanOrEqual(2.6);
    expect(z.b.y).toBeCloseTo(PLANT_Y + M3.zipEnd, 5);
    expect(z.b.y - HANG.drop).toBeCloseTo(PLANT_Y + M3.wp, 5);
    // the end is over WP (x 0..4, z 0..4)
    expect(z.b.x).toBeGreaterThan(b3(0, 0).x);
    expect(z.b.x).toBeLessThan(b3(4, 0).x);
    expect(z.b.z).toBeLessThan(b3(0, 4).z);
    // the body (feet 1.9 under the cable, 1.75 tall) never meets a collide box along the ride (past the first 0.3 m)
    const len = Math.hypot(z.b.x - z.a.x, z.b.z - z.a.z);
    for (let d = 0.3; d < len - 0.3; d += 0.1) {
      const t = d / len;
      const x = z.a.x + (z.b.x - z.a.x) * t;
      const zz = z.a.z + (z.b.z - z.a.z) * t;
      const feet = z.a.y + (z.b.y - z.a.y) * t - HANG.drop;
      const hit = pb.boxes.find((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(x - p.c[0]) < p.s[0] / 2 + 0.3 && Math.abs(zz - p.c[2]) < p.s[2] / 2 + 0.3 && p.c[1] + p.s[1] / 2 > feet && p.c[1] - p.s[1] / 2 < feet + 1.75);
      expect(hit, `${d.toFixed(1)}`).toBeUndefined();
    }
    // a start stance on G3 within the entry reach
    const st = play.debugPoints!.find((d) => d.id === 'B3-G3')!;
    expect(Math.hypot(st.pos.x - z.a.x, st.pos.z - z.a.z)).toBeLessThanOrEqual(REACH.zip);
  });

  it('FP: the fan guard 2.4 high round x 6..12, z 6..12; a hood over it out of reach; DU entry in the pit, exit in the passage', () => {
    const fences = pb.anchors.fences.filter((f) => inBay('B3', f.a.x, f.a.z));
    expect(fences.length).toBe(4);
    for (const f of fences) expect(f.height).toBe(M3.fence);
    const xs = fences.flatMap((f) => [f.a.x, f.b.x]);
    const zs = fences.flatMap((f) => [f.a.z, f.b.z]);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]).toEqual([b3(6, 0).x, b3(12, 0).x, b3(0, 6).z, b3(0, 12).z]);
    // the flip over the top (fence top + 0.12, a 1.75 body) passes under the hood
    expect(M3.hood).toBeGreaterThan(M3.fence + 0.12 + 1.75);
    const d = pb.anchors.all.find((a) => a.id === play.course!.anchors!['B3-duct'])!;
    if (d.kind !== 'duct') throw new Error('no duct');
    // entry: wall grate facing into the pit (inside the guard), within 1.1 m / 1.4 of the feet of a stance in the pit
    const stance = b3(9, 7.2);
    expect(Math.hypot(stance.x - d.entry.pos.x, stance.z - d.entry.pos.z)).toBeLessThanOrEqual(1.1);
    expect(Math.abs(d.entry.pos.y - PLANT_Y)).toBeLessThanOrEqual(1.4);
    expect(d.entry.nz).toBe(1);
    expect(stance.z).toBeGreaterThan(b3(0, 6).z);
    // exit: the crawl ends 0.75 out of the grille, on the passage floor (x 5..13, z 0..2.6)
    const ex = { x: d.exit.pos.x + d.exit.nx * 0.75, z: d.exit.pos.z + d.exit.nz * 0.75 };
    expect(ex.x).toBeGreaterThan(b3(5, 0).x);
    expect(ex.x).toBeLessThan(b3(13, 0).x);
    expect(ex.z).toBeGreaterThan(b3(0, 0.225).z);
    expect(ex.z).toBeLessThan(b3(0, 2.45).z);
  });

  it('ladders: PL floor -> G1, the net ladders and C3 / sump / outlet ladders top out on a floor (the real step-off)', () => {
    const lads = pb.anchors.ladders.filter((l) => inBay('B3', l.base.x, l.base.z) || inBay('B4', l.base.x, l.base.z));
    expect(lads.length).toBe(6);
    for (const l of lads) {
      const ex = l.top.x + Math.sin(l.facing) * 0.2;
      const ez = l.top.z + Math.cos(l.facing) * 0.2;
      const on = pb.boxes.some((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.c[1] + p.s[1] / 2 - l.top.y) < 0.01 && Math.abs(ex - p.c[0]) <= p.s[0] / 2 - 0.1 && Math.abs(ez - p.c[2]) <= p.s[2] / 2 - 0.1);
      expect(on, `${l.base.x} ${l.base.z} ${l.top.y}`).toBe(true);
    }
    expect(lads.some((l) => l.base.y === PLANT_Y && l.top.y === PLANT_Y + M3.g1)).toBe(true);
  });

  it('PH: the damper bar 2.5 over G3, hangable from G3, its far end over G2', () => {
    const ph = pb.anchors.pipesH.filter((p) => inBay('B3', p.a.x, p.a.z));
    expect(ph.length).toBe(1);
    expect(ph[0]!.hangHeight - (PLANT_Y + M3.g3)).toBeCloseTo(M3.bar, 5);
    expect(M3.bar).toBeGreaterThanOrEqual(REACH.grabMin);
    expect(M3.bar).toBeLessThanOrEqual(REACH.grabMax);
    expect(Math.min(ph[0]!.a.z, ph[0]!.b.z)).toBeLessThan(b3(0, 12).z);
  });

  it('B4 human ladder: from the shoulders against W2 (C2 side) the grip reaches W2 (teamController runTop rule)', () => {
    const w2 = BUNKER_COOP_LIPS.find((l) => l.id === 'W2')!;
    for (const x of [4, 10, 16, 26]) {
      // the bracer's feet 0.5 off W2's north face (wallBehind), the climber on the shoulders facing the wall (south)
      const p = b4(x, 13.5);
      const at = { x: p.x, y: p.y + TEAM.ladderFeet + 1.75, z: p.z };
      const t = findJumpTarget(A, at, -1, 0, -1, 1, 1.6, 0.2);
      expect(t, `x ${x}`).not.toBeNull();
      expect(t!.anchor.kind).toBe('ledge');
      expect(inLip(t!.anchor as Ledge, w2.box, w2.top), `x ${x}`).toBe(true);
      expect(t!.grip.y - p.y).toBeLessThanOrEqual(TEAM.ladderGrab + 0.2);
    }
  });

  it('no split pose (both facings, along each split) jumps up onto a co-op lip', () => {
    const coop = A.ledges.filter((l) => BUNKER_COOP_LIPS.some((p) => inLip(l, p.box, p.top)));
    expect(coop.length).toBeGreaterThan(0);
    const ids = new Set(coop.map((l) => l.id));
    for (const g of splits) {
      for (const face of [1, -1] as const) {
        for (let s = 0.25; s <= g.len - 0.25; s += 0.25) {
          const p = atPose(g, s, face);
          const from = { x: p.x, y: g.a.y + SPLIT.feetHeight + 1.05, z: p.z };
          const t = findJumpTarget(A, from, g.id, g.tx * face, g.tz * face, 1, 2.5, 0.6, 0, 0);
          expect(t && ids.has(t.anchor.id) ? [g.id, face, s, t.grip] : null).toBeNull();
        }
      }
    }
  });

  it('the B3-RC debug point stands where the split is offered facing its yaw', () => {
    const rc = splits.find((g) => inBay('B3', g.a.x, g.a.z))!;
    const d = play.debugPoints!.find((x) => x.id === 'B3-RC')!;
    const r = splitReach(rc, d.pos.x, d.pos.y, d.pos.z, Math.sin(d.yaw), Math.cos(d.yaw));
    expect(r).not.toBeNull();
    // and the jump-up from that split pose finds the casing lip
    const p = atPose(rc, r!.s, r!.face);
    const t = findJumpTarget(A, { x: p.x, y: rc.a.y + SPLIT.feetHeight + 1.05, z: p.z }, rc.id, rc.tx * r!.face, rc.tz * r!.face, 1, 2.5, 0.6, 0, 0);
    expect(t && inLip(t.anchor as Ledge, lipOf('RC').box, lipOf('RC').top)).toBe(true);
  });

  it('B4 co-op lips (W1 4.4, W2 4.25, outlet 4.4) are out of solo reach and within the boost; no other lip 3.8-4.5 over a B4 floor', () => {
    for (const l of BUNKER_COOP_LIPS) {
      // W2 (A35): 0.45 over solo reach, within the human ladder's grip; W1 and the outlet keep level-design 11.3's 0.5
      if (l.id === 'W2') {
        expect(l.top - l.floor).toBeGreaterThanOrEqual(WALL_JUMP.maxUp + 0.45 - 1e-9);
        expect(l.top - l.floor).toBeLessThanOrEqual(TEAM.ladderGrab + 0.2);
      } else expect(l.top - l.floor, l.id).toBeGreaterThan(WALL_JUMP.maxUp + 0.5);
      expect(l.top - l.floor, l.id).toBeLessThanOrEqual(TEAM.boostMax);
      expect(genPlant.some((g) => inLip(g, l.box, l.top) && g.canHang), l.id).toBe(true);
    }
    const floors = [PLANT_Y, PLANT_Y + M4.sump];
    const band = genPlant.filter((l) => inBay('B4', l.a.x, l.a.z) && floors.some((f) => l.top - f >= 3.8 && l.top - f <= 4.5));
    const odd = band.filter((l) => !BUNKER_COOP_LIPS.some((p) => inLip(l, p.box, p.top)));
    expect(odd.map((l) => [l.a, l.b, l.top])).toEqual([]);
    // the sump floor stays above the nav sampler's floor (SPEC engine Q1)
    expect(PLANT_Y + M4.sump).toBeGreaterThan(-1.5);
    // the gallery has no lip: the cells cannot climb it, only W1 / W2 / C3's ladder reach it
    expect(genPlant.filter((l) => inBay('B4', l.a.x, l.a.z) && l.a.x >= b4(31.9, 0).x)).toEqual([]);
  });
});
