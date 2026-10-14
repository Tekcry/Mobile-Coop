import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { bunker } from '../src/world/maps/bunker';
import { B2_METRICS, BUNKER_LIPS, UPPER_ROOMS, UPPER_Y, at, buildUpper } from '../src/world/maps/bunkerUpper';
import { getMap } from '../src/world/maps';
import { isListedMap } from '../src/world/maps/listed';
import { layoutKnownIds, validateCourse } from '../src/game/course/courseDef';
import { findJumpTarget, generateLedges, HANG, insideBox, LEDGE, REACH, type Ledge } from '../src/world/anchors';
import { attachPose, attachRange, type AttachPose } from '../src/player/attach';
import { buildCoverSegments } from '../src/cover/coverData';
import { findSplitGaps } from '../src/player/splitJump';
import { landingKind, pickTraversal } from '../src/player/movement';
import type { SplitAnchor, TraversalAnchors } from '../src/world/anchors';
import { B3_METRICS, B4_COOP_LIPS, B4_METRICS, PLANT_LIPS, PLANT_Y, plantAt, SHAFT_BOX } from '../src/world/maps/bunkerShaft';
import { B7_METRICS, B8_BARRELS, B8_METRICS, B8_TARGETS, B9_COOP_LIP, B9_METRICS, BUNKER_COOP_LIPS, DEEP_DEVICES, DEEP_LIPS, deepAt } from '../src/world/maps/bunkerDeep';
import { RAPPEL, SPLIT, TEAM, WALL_JUMP } from '../src/config/movement';
import { splitReach, wallJumpReach } from '../src/player/splitJump';
import { B5_GROUPS, B5_LIPS, B5_METRICS, B6_METRICS, BUNKER_DEVICES, buildPlant, PLANT2_BOX, plantAt2, RELIEF_DOORS, S6_METRICS, S6_RECT, S6_TOP_DOOR } from '../src/world/maps/bunkerPlant';
import { NavGrid, type NavBlocker, type NavSample } from '../src/ai/navGrid';
import { pickTakedown, TAKEDOWN } from '../src/game/takedown';
import { hangPoint } from '../src/world/anchors';
import { hyp2 } from '../src/core/mathx';

// Map tests build data only (T0 facts): ledges and splits come from `build`, so they are re-derived from the boxes.
const b = new LevelBuilder();
const lay = bunker.build(b, 0);
const generated = generateLedges(b.boxes).ledges;
const manual = b.anchors.ledges;
const M = B2_METRICS;

/**
 * An analytic layered nav grid over a world rect from a builder's own pieces (navBuild's raycasts, as in the S6 test):
 * every collide piece's top is a standing surface (a sloped piece: its ramp surface), kept when 1.7 is clear above it;
 * flat pieces (not overhead) block; `extra` adds blockers (closed door leaves). No seed: every surface is kept, so
 * `findPath` says whether two points join.
 */
function analyticNav(lb: LevelBuilder, rect: readonly [number, number, number, number], extra: readonly NavBlocker[] = [], cell = 0.5): NavGrid {
  // the game's grid (navBuild) is 0.5 cells from the level's bounds; the rect snaps to that lattice
  const snap = (v: number, o: number): number => o + Math.floor((v - o) / cell) * cell;
  const minX = snap(rect[0], lb.bounds.minX);
  const minZ = snap(rect[1], lb.bounds.minZ);
  const maxX = rect[2];
  const maxZ = rect[3];
  const solid = lb.boxes.filter((p) => p.collide && p.c[0] + p.s[0] > minX - 1 && p.c[0] - p.s[0] < maxX + 1 && p.c[2] + p.s[2] > minZ - 1 && p.c[2] - p.s[2] < maxZ + 1);
  // 4 m buckets (a piece's plan radius bounds its footprint at any yaw)
  const B = 4;
  const nbx = Math.ceil((maxX - minX) / B) + 1;
  const nbz = Math.ceil((maxZ - minZ) / B) + 1;
  const buckets: BoxPiece[][] = Array.from({ length: nbx * nbz }, () => []);
  for (const p of solid) {
    const rad = hyp2(p.s[0], p.s[2]) / 2 + 0.01;
    const i0 = Math.max(0, Math.floor((p.c[0] - rad - minX) / B));
    const i1 = Math.min(nbx - 1, Math.floor((p.c[0] + rad - minX) / B));
    const k0 = Math.max(0, Math.floor((p.c[2] - rad - minZ) / B));
    const k1 = Math.min(nbz - 1, Math.floor((p.c[2] + rad - minZ) / B));
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) buckets[k * nbx + i]!.push(p);
  }
  const surf = (x: number, z: number): { h: number; bottom: number }[] => {
    const out: { h: number; bottom: number }[] = [];
    const i = Math.min(nbx - 1, Math.max(0, Math.floor((x - minX) / B)));
    const k = Math.min(nbz - 1, Math.max(0, Math.floor((z - minZ) / B)));
    for (const p of buckets[k * nbx + i]!) {
      const sy = Math.sin(p.yaw);
      const cy = Math.cos(p.yaw);
      const u = (x - p.c[0]) * sy + (z - p.c[2]) * cy;
      const v = (x - p.c[0]) * cy - (z - p.c[2]) * sy;
      if (Math.abs(v) > p.s[0] / 2) continue;
      if (Math.abs(p.pitch) < 1e-3) {
        if (Math.abs(u) <= p.s[2] / 2) out.push({ h: p.c[1] + p.s[1] / 2, bottom: p.c[1] - p.s[1] / 2 });
      } else if (Math.abs(u) <= (p.s[2] * Math.cos(p.pitch)) / 2) {
        const h = p.c[1] + (p.s[1] / 2) * Math.cos(p.pitch) + u * Math.tan(-p.pitch);
        out.push({ h, bottom: h - 0.35 });
      }
    }
    return out.sort((a, q) => q.h - a.h);
  };
  const blockers: NavBlocker[] = solid.filter((p) => Math.abs(p.pitch) < 1e-3 && !p.overhead).map((p) => ({ cx: p.c[0], cz: p.c[2], hx: p.s[0] / 2, hz: p.s[2] / 2, yaw: p.yaw, bottom: p.c[1] - p.s[1] / 2, top: p.c[1] + p.s[1] / 2 }));
  for (const c of lb.cylinders) if (c.collide) blockers.push({ cx: c.c[0], cz: c.c[2], hx: c.r, hz: c.r, yaw: 0, bottom: c.c[1] - c.h / 2, top: c.c[1] + c.h / 2, round: true });
  blockers.push(...extra);
  return new NavGrid({
    minX, maxX, minZ, maxZ, cell, agentRadius: 0.32, stepHeight: 0.45, layers: 5, blockers,
    sample: () => ({ h: 0, ok: false }),
    sampleLayers: (x, z) => {
      const out: NavSample[] = [];
      let ceiling = Infinity;
      for (const s of surf(x, z)) {
        if (s.h > ceiling) continue;
        if (ceiling - s.h >= 1.7) out.push({ h: s.h, ok: true });
        ceiling = Math.min(ceiling, s.bottom);
      }
      return out.reverse();
    },
  });
}

/** A closed door's leaf as a nav blocker (0.2 thick, the door's height). */
function doorLeaf(d: { hinge: { x: number; y: number; z: number }; width: number; height: number; yaw: number }): NavBlocker {
  const mx = d.hinge.x + (Math.sin(d.yaw) * d.width) / 2;
  const mz = d.hinge.z + (Math.cos(d.yaw) * d.width) / 2;
  return { cx: mx, cz: mz, hx: 0.1, hz: d.width / 2, yaw: d.yaw, bottom: d.hinge.y, top: d.hinge.y + d.height };
}

function inLip(l: Ledge, box: readonly number[], top: number): boolean {
  const ok = (x: number, z: number): boolean => x >= box[0]! && x <= box[2]! && z >= box[1]! && z <= box[3]!;
  return Math.abs(l.top - top) < 0.02 && ok(l.a.x, l.a.z) && ok(l.b.x, l.b.z);
}

describe('Fallow (bunker) Upper level (T5d, BAYS v2)', () => {
  const W = (bay: 'B1' | 'A1' | 'B2' | 'A2', x: number, z: number, y = 0) => at(bay, x, z, y);
  const lockedShut = b.anchors.doors.filter((d) => d.locked).map(doorLeaf);
  const nav = analyticNav(b, [-1, 48, 66, 76], lockedShut);
  const doorOf = (cid: string) => b.anchors.doors.find((d) => d.id === lay.course!.doors[cid] || d.id === upDoors[cid])!;
  const upDoors: Record<string, number> = {};
  {
    // the Upper's own door ids (B1's plain doors, RL2) from a fresh Upper build
    const ub = new LevelBuilder();
    Object.assign(upDoors, buildUpper(ub).doors);
  }
  const joins = (n: NavGrid, p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) => n.findPath([p.x, p.z], [q.x, q.z], 1e6, p.y, q.y);

  it('is registered, course and sandbox, not listed, five nav layers', () => {
    expect(getMap('bunker').id).toBe('bunker');
    expect(bunker.modes).toEqual(['course', 'sandbox']);
    expect(isListedMap('bunker')).toBe(false);
    expect(bunker.navLayers).toBe(5);
    expect(bunker.theme.sunIntensity).toBe(0);
  });

  it('spawns in the lift lobby facing east; a debug point per room and vantage', () => {
    expect(lay.playerSpawns.map((s) => [s.pos.x, s.pos.y, s.pos.z, s.yaw])).toEqual([
      [W('B1', 2, 11.4).x, UPPER_Y, W('B1', 2, 11.4).z, Math.PI / 2],
      [W('B1', 4, 11.4).x, UPPER_Y, W('B1', 4, 11.4).z, Math.PI / 2],
    ]);
    const ids = lay.debugPoints!.map((d) => d.id);
    for (const id of ['B1', 'B1-KR', 'B1-BR', 'B1-GR', 'B1-DS', 'A1', 'B2', 'B2-2B', 'B2-G1', 'B2-pit', 'B2-G2', 'B2-2C', 'B2-2C-E', 'B2-deck', 'B2-2D', 'B2-2F', 'A2']) expect(ids, id).toContain(id);
    expect(lay.debugPoints!.every((d) => d.group === 'Fallow')).toBe(true);
    // each stands on a floor (nav seeds)
    for (const d of lay.debugPoints!.filter((p) => p.pos.y >= UPPER_Y - 3 && p.pos.x < 66 && p.pos.z > 48)) expect(nav.heightAt(d.pos.x, d.pos.z, d.pos.y), d.id).toBeCloseTo(d.pos.y, 1);
  });

  it('the course stub: B1, B2 one shared course with no gate (R3), objectives by name in BAYS order (R5), airlocks automatic', () => {
    const c = lay.course!;
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    expect(c.def.bays.map((x) => x.id).slice(0, 2)).toEqual(['B1', 'B2']);
    expect(c.def.bays[0]!.gates).toEqual([]);
    expect(c.def.bays[1]!.gates).toEqual([]);
    const locked = new Set(b.anchors.doors.filter((d) => d.locked).map((d) => d.id));
    for (const id of ['A1-near', 'A1-far', 'A2-near', 'A2-far']) expect(locked.has(c.doors[id]!), id).toBe(true);
    // no airlock button: the airlocks carry no device
    for (const k of Object.keys(c.devices)) expect(/^A[12]/.test(k), k).toBe(false);
    const obj = c.def.objectives!.filter((o) => o.bay === 'B1' || o.bay === 'B2');
    expect(obj.length).toBe(13 + 24);
    expect(obj[0]!.text).toBe('Open your locker');
    expect(obj[12]!.text).toBe('Both on the airlock pad');
    expect(obj.filter((o) => o.bay === 'B2').map((o) => o.id.slice(3)).join(' ')).toBe('1 2 3 4 4a 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23');
    expect(obj.every((o) => o.text.length <= 90)).toBe(true);
    expect(c.def.airlocks.find((a) => a.id === 'A1')!.box).toEqual([1, 54, 7, 60]);
    expect(c.def.airlocks.find((a) => a.id === 'A2')!.box).toEqual([59, 50, 65, 56]);
  });

  it('R4: footprints as BAYS 0.1 (B1 216 m2 L-shaped, B2 468 m2), airlocks 6 x 6', () => {
    const area = (bay: string) => UPPER_ROOMS.filter((r) => r.bay === bay).reduce((n, r) => n + (r.rect[2] - r.rect[0]) * (r.rect[3] - r.rect[1]), 0);
    expect(area('B1')).toBeCloseTo(216, 5);
    expect(area('B2')).toBeCloseTo(468, 5);
    expect(area('A1')).toBeCloseTo(36, 5);
    expect(area('A2')).toBeCloseTo(36, 5);
  });

  it('has no split gaps on the Upper level', () => {
    const gaps = findSplitGaps(buildCoverSegments(b.boxes, b.cylinders)).filter((g) => g.a.y >= UPPER_Y - 2 && g.a.x < 65);
    expect(gaps).toEqual([]);
  });

  it('every lip is one BAYS names (BUNKER_LIPS), and every named lip exists', () => {
    const upper = generated.filter((l) => l.top >= UPPER_Y - 2.5 && Math.max(l.a.x, l.b.x) <= 65 && Math.min(l.a.z, l.b.z) > 48);
    expect(upper.map((l) => [l.a, l.b, l.top])).toEqual([]);
    const manualUp = manual.filter((l) => l.top >= UPPER_Y - 2.5 && Math.max(l.a.x, l.b.x) <= 65 && Math.min(l.a.z, l.b.z) > 48);
    const stray = manualUp.filter((l) => !BUNKER_LIPS.some((p) => inLip(l, p.box, p.top)));
    expect(stray.map((l) => [l.a, l.b, l.top])).toEqual([]);
    for (const p of BUNKER_LIPS) expect(manualUp.some((l) => inLip(l, p.box, p.top)), p.id).toBe(true);
  });

  it('ground verbs: step, vault, mantle; landing bands: hang-drop soft, pads soft / roll, pit heavy', () => {
    expect(pickTraversal({ height: M.step, depth: 1, landingClear: true, topClear: true })).toBe('step');
    expect(pickTraversal({ height: M.vault, depth: M.vaultThick, landingClear: true, topClear: false })).toBe('vault');
    expect(pickTraversal({ height: M.mantle, depth: 2, landingClear: false, topClear: true })).toBe('mantle');
    expect(landingKind(M.gallery - HANG.drop)).toBe('soft');
    expect(landingKind(M.deck - M.padSoft)).toBe('soft');
    expect(landingKind(M.deck - M.padRoll)).toBe('roll');
    expect(landingKind(M.deck - M.padPit)).toBe('heavy');
    // the lowest Upper floors stay above the nav sampler's floor (SPEC engine Q1)
    expect(UPPER_Y - M.trenchDepth).toBeGreaterThan(-1.5);
    // the trench: 1.2 wide (a jump), too deep to mantle out (step irons on the near side only)
    expect(M.trenchDepth).toBeGreaterThan(1.8);
  });

  it('climbing metrics: pipe reach from G1, G2 hang point, L1 hang only round the column, the sill climbable, gap 2.2', () => {
    const reach = M.pipe - M.gallery;
    expect(reach).toBeGreaterThanOrEqual(REACH.grabMin);
    expect(reach).toBeLessThanOrEqual(REACH.grabMax);
    expect(M.pipe - HANG.drop).toBeGreaterThan(M.gallery);
    const lipOf = (id: string): Ledge[] => manual.filter((l) => inLip(l, BUNKER_LIPS.find((p) => p.id === id)!.box, BUNKER_LIPS.find((p) => p.id === id)!.top));
    const g2 = lipOf('G2H');
    expect(g2.length).toBe(1);
    expect(g2[0]!.canHang).toBe(true);
    expect(g2[0]!.nx).toBeCloseTo(1, 5);
    const l1 = lipOf('L1');
    expect(l1.length).toBe(5);
    expect(l1.every((l) => l.canHang && !l.canClimbUp)).toBe(true);
    expect(l1.filter((l) => l.nextA >= 0 || l.nextB >= 0).length).toBe(5);
    expect(M.l1Depth).toBeLessThan(LEDGE.climbDepth);
    expect(M.l2Depth).toBeGreaterThanOrEqual(LEDGE.climbDepth);
    const l2 = lipOf('L2');
    expect(l2.length).toBe(1);
    expect(l2[0]!.canClimbUp).toBe(true);
    const stub = l1.reduce((p, l) => (Math.max(l.a.z, l.b.z) > Math.max(p.a.z, p.b.z) ? l : p));
    const stubGrip = Math.min(stub.a.z, stub.b.z) + attachRange(stub).min;
    const l2Grip = Math.min(l2[0]!.a.z, l2[0]!.b.z) + attachRange(l2[0]!).min;
    expect(l2Grip - stubGrip).toBeCloseTo(M.gap, 5);
    // the engine jump from the hang on the stub (north, along the wall, real 2.5 limit) lands on the sill
    const pose: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 };
    attachPose(stub, attachRange(stub).max, 1, 1.75, pose);
    const t = findJumpTarget(b.anchors, { x: pose.x, y: stub.top, z: pose.z }, stub.id, 0, 1, 0, 2.5, 0.6, stub.nx, stub.nz);
    expect(t?.anchor.id).toBe(l2[0]!.id);
  });

  it('A51: no lip a boost could skip by: L1 over 2C and the sill over the sump stand above 4.5; G2 hang point only back', () => {
    const below = (l: Ledge) => {
      const mx = (l.a.x + l.b.x) / 2 + l.nx * 0.6;
      const mz = (l.a.z + l.b.z) / 2 + l.nz * 0.6;
      return nav.heightAt(mx, mz, l.top - 1);
    };
    for (const id of ['L1', 'L2']) {
      for (const l of manual.filter((q) => inLip(q, BUNKER_LIPS.find((p) => p.id === id)!.box, BUNKER_LIPS.find((p) => p.id === id)!.top))) {
        expect(l.top - below(l), id).toBeGreaterThan(TEAM.boostMax);
      }
    }
    // G2's hang point is 4.0 over 2C: a boost there goes back to G2 (the element's start), never onward
    expect(M.gallery).toBeLessThan(TEAM.boostMax);
    // G1 has no lip (screened 2.4 and caged ladder): nothing to boost to
    const g1 = generated.concat(manual).filter((l) => Math.abs(l.top - (UPPER_Y + M.gallery)) < 0.05 && Math.min(l.a.x, l.b.x) >= W('B2', 13.9, 0).x && Math.max(l.a.x, l.b.x) <= W('B2', 16.1, 0).x);
    expect(g1).toEqual([]);
  });

  it('A26 glass: see-through collision (invisible, noLedge), no fence or climbing anchor on it', () => {
    const glassBoxes = b.boxes.filter((p) => p.collide && p.visible === false && p.noLedge && p.c[1] > UPPER_Y && p.c[0] < 66 && p.c[2] > 48 && p.c[2] < 76);
    // BR's south wall (2 runs), G1's west screens (2), G2's east screens (2), RL2's cage side
    expect(glassBoxes.length).toBeGreaterThanOrEqual(7);
    for (const g of glassBoxes) {
      const inG = (x: number, z: number) => Math.abs(x - g.c[0]) <= g.s[0] / 2 + 0.05 && Math.abs(z - g.c[2]) <= g.s[2] / 2 + 0.05;
      expect(b.anchors.fences.filter((f) => inG(f.a.x, f.a.z) && inG(f.b.x, f.b.z))).toEqual([]);
      expect(b.anchors.ledges.filter((l) => inG(l.a.x, l.a.z) && inG(l.b.x, l.b.z))).toEqual([]);
    }
  });

  it('R1 / R2, B1: LL -> KR -> BR -> GR -> DS -> A1 is the only line; the run crosses every mark in order; each door is a cut', () => {
    const open = analyticNav(b, [-1, 48, 66, 76], b.anchors.doors.filter((d) => d.locked && d.id !== lay.course!.doors['A1-near']).map(doorLeaf));
    const ll = W('B1', 3, 10);
    const a1 = W('A1', 3, 3);
    expect(joins(nav, ll, a1)).toBeNull();
    const path = joins(open, ll, a1);
    expect(path).not.toBeNull();
    // the path's points in the gear run, in order, pass every mark (x 18 .. 3) and the stop and turn marks going west
    const gr = UPPER_ROOMS.find((r) => r.id === 'GR')!.rect;
    const xs = path!.filter((w) => w[1] > gr[1] && w[1] < gr[3]).map((w) => w[0]);
    expect(Math.max(...xs)).toBeGreaterThan(W('B1', 18, 0).x);
    expect(Math.min(...xs)).toBeLessThan(W('B1', 1.8, 0).x);
    for (const id of ['B1-kr', 'B1-br', 'B1-gr', 'B1-ds']) {
      const cut = analyticNav(b, [-1, 48, 66, 76], [...b.anchors.doors.filter((d) => d.locked && d.id !== lay.course!.doors['A1-near']).map(doorLeaf), doorLeaf(doorOf(id))]);
      expect(joins(cut, ll, a1), id).toBeNull();
    }
  });

  // B2's room graph (BAYS 0.2 Proof): cells are floors the nav keeps apart; links are the elements' passages
  type Cell = string;
  const P = (x: number, z: number, y: number) => W('B2', x, z, y);
  const cells: Record<Cell, ReturnType<typeof at> | null> = {
    '2A0': P(1, 4.5, 0), PL: P(2.5, 4.5, M.step), '2A1': P(4, 4.5, 0), '2A2': P(6.4, 4.5, 0), BW: P(8.5, 4.5, M.mantle),
    '2BF': P(11.5, 4.5, 0), G1: P(15, 2, M.gallery), PIT: P(18, 7, M.pit), G2: P(21, 2, M.gallery), CAGE: P(21.4, 8.3, M.gallery),
    '2CW': P(24, 4.5, 0), TR: P(27.6, 4.5, -M.trenchDepth), '2CE': P(31, 2, 0), SUMP: P(32.6, 7.5, M.sump), L1: null, SILL: null,
    DECK: P(36, 4.5, M.deck), PS: P(39.5, 1.5, M.padSoft), PR: P(39.5, 4.5, M.padRoll), PP: P(43, 7, M.padPit), '2F': P(50, 6, 0),
    A2: W('A2', 3, 3),
  };
  /** [from, to, element, both ways, return link (A61)]. */
  const links: [Cell, Cell, string, boolean, boolean?][] = [
    ['2A0', 'PL', 'step', true], ['PL', '2A1', 'step', true], ['2A1', '2A2', 'vault', true], ['2A2', 'BW', 'mantle', false],
    ['BW', '2A2', 'fall', false], ['BW', '2BF', 'mantle', false], ['2BF', 'G1', 'ladder', true], ['G1', 'G2', 'pipe', true],
    ['G1', 'PIT', 'fall', false], ['G2', 'PIT', 'fall', false], ['PIT', 'G1', 'pit ladder', false], ['G2', '2CW', 'hang-drop', false],
    ['2CW', 'CAGE', 'RL2', true], ['CAGE', 'G2', 'turnstile', false, true], ['2CW', '2CE', 'trench jump', true],
    ['2CW', 'TR', 'fall', false], ['2CE', 'TR', 'fall', false], ['TR', '2CW', 'step irons', false], ['2CE', 'L1', 'downpipe', true],
    ['L1', '2CE', 'fall', false], ['L1', 'SUMP', 'fall', false], ['SUMP', '2CE', 'mantle', true], ['L1', 'SILL', 'gap jump', false],
    ['SILL', 'SUMP', 'fall', false], ['SILL', 'DECK', 'climb up', true], ['DECK', 'PS', 'deck drop', false],
    ['DECK', 'PR', 'deck drop', false], ['DECK', 'PP', 'deck drop', false], ['PS', 'PP', 'fall', false], ['PR', 'PP', 'fall', false],
    ['PP', 'PR', 'mantle', false], ['PP', 'DECK', 'pad ladder', false], ['PP', '2F', 'window', true], ['2F', 'A2', 'door', true],
  ];
  const reach = (from: Cell, without: string | null, ret: boolean): Map<Cell, [Cell, string]> => {
    const prev = new Map<Cell, [Cell, string]>([[from, ['', '']]]);
    const q = [from];
    while (q.length > 0) {
      const n = q.shift()!;
      for (const [a, e, el, both, r] of links) {
        if (el === without || (r && !ret)) continue;
        for (const [s, t] of both ? [[a, e], [e, a]] : [[a, e]]) {
          if (s === n && !prev.has(t!)) {
            prev.set(t!, [n, el]);
            q.push(t!);
          }
        }
      }
    }
    return prev;
  };

  it('B2: the nav keeps every cell apart (every station spans wall to wall; no floor joins two cells)', () => {
    const named = Object.entries(cells).filter((e): e is [Cell, NonNullable<(typeof e)[1]>] => e[1] !== null);
    for (const [id, p] of named) expect(nav.heightAt(p.x, p.z, p.y), id).toBeCloseTo(p.y, 1);
    const joined: string[] = [];
    for (let i = 0; i < named.length; i++) for (let k = i + 1; k < named.length; k++) if (joins(nav, named[i]![1], named[k]![1])) joined.push(`${named[i]![0]}-${named[k]![0]}`);
    expect(joined).toEqual([]);
  });

  it('B2 element evidence: ladders, pipes, lips, windows and doors are where the graph says', () => {
    const near = (p: { x: number; z: number }, x: number, z: number, r = 0.6) => Math.abs(p.x - W('B2', x, 0).x) < r && Math.abs(p.z - W('B2', 0, z).z) < r;
    expect(b.anchors.ladders.some((l) => near(l.base, 13.6, 4.5) && Math.abs(l.top.y - (UPPER_Y + M.gallery)) < 0.01)).toBe(true);
    expect(b.anchors.ladders.some((l) => near(l.base, 16.4, 1) && Math.abs(l.base.y - (UPPER_Y + M.pit)) < 0.01)).toBe(true);
    expect(b.anchors.ladders.some((l) => near(l.base, 22.4, 8.5))).toBe(true);
    expect(b.anchors.ladders.some((l) => near(l.base, 27.35, 4.5) && Math.abs(l.base.y - (UPPER_Y - M.trenchDepth)) < 0.01)).toBe(true);
    expect(b.anchors.ladders.some((l) => near(l.base, 38.4, 8) && Math.abs(l.top.y - (UPPER_Y + M.deck)) < 0.01)).toBe(true);
    expect(b.anchors.all.some((a) => a.kind === 'pipeH' && Math.abs(a.a.y - (UPPER_Y + M.pipe)) < 0.01 && near(a.a, 15.5, 4.5) && near(a.b, 20.5, 4.5))).toBe(true);
    expect(b.anchors.all.some((a) => a.kind === 'pipeV' && near(a.base, 33.9, 0.8) && Math.abs(a.top.y - (UPPER_Y + M.beam)) < 0.01)).toBe(true);
    const wins = b.anchors.all.filter((a) => a.kind === 'window' && Math.abs(a.c.x - W('B2', 46.15, 0).x) < 0.01);
    expect(wins.length).toBe(3);
    expect(wins.filter((w) => w.kind === 'window' && w.breakable).length).toBe(2);
    // RL2's turnstile is a locked door until T7a (A61 stub; UPPER_ELEMENTS)
    expect(doorOf('B2-rl2').locked).toBe(true);
    expect(lay.course!.def.bays[1]!.elements.map((e) => e.id)).toEqual(['B2-RL2', 'B2-reglaze', 'B2-relamp']);
  });

  it('R1, B2: the path from 2A to A2 passes the elements in the objective order and never uses a return link', () => {
    const prev = reach('2A0', null, false);
    expect(prev.has('A2')).toBe(true);
    const els: string[] = [];
    for (let n: Cell = 'A2'; n !== '2A0'; n = prev.get(n)![0]) els.unshift(prev.get(n)![1]);
    expect(els.filter((e) => e !== 'fall')).toEqual(['step', 'step', 'vault', 'mantle', 'mantle', 'ladder', 'pipe', 'hang-drop', 'trench jump', 'downpipe', 'gap jump', 'climb up', 'deck drop', 'window', 'door']);
    // with the return links too, nothing new is reached before its element (G2 only from G1 or by the return)
    const withRet = reach('2A0', null, true);
    expect([...withRet.keys()].sort()).toEqual([...prev.keys()].sort());
  });

  it('R2, B2: each element is a cut: without its passage the exit (A2) is unreachable, return links included', () => {
    for (const el of ['step', 'vault', 'mantle', 'ladder', 'pipe', 'hang-drop', 'trench jump', 'downpipe', 'gap jump', 'climb up', 'deck drop', 'window']) {
      expect(reach('2A0', el, true).has('A2'), el).toBe(false);
    }
  });
});

// ------------------------------------------------------------------------------------------------ T5e: B3, A3, B4, A4

/** Traversal anchors by kind inside a world plan box (strictly inside by 0.1), each at its first point. */
function anchorKinds(lb: LevelBuilder, box: readonly [number, number, number, number], y0 = -10, y1 = 100): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of lb.anchors.all) {
    const ab = 'a' in a && 'b' in a ? (a as { a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } }) : null;
    const p = a.kind === 'ladder' || a.kind === 'pipeV' ? a.base : a.kind === 'rappel' ? a.top : a.kind === 'duct' ? a.path[0]! : a.kind === 'window' ? a.c : a.kind === 'door' ? { x: a.hinge.x + (Math.sin(a.yaw) * a.width) / 2, y: a.hinge.y, z: a.hinge.z + (Math.cos(a.yaw) * a.width) / 2 } : ab ? { x: (ab.a.x + ab.b.x) / 2, y: ab.a.y, z: (ab.a.z + ab.b.z) / 2 } : null;
    if (!p) continue;
    if (p.x > box[0] + 0.1 && p.x < box[2] - 0.1 && p.z > box[1] + 0.1 && p.z < box[3] - 0.1 && p.y >= y0 && p.y <= y1) out[a.kind] = (out[a.kind] ?? 0) + 1;
  }
  return out;
}

/** An airlock box as given (the course def's A4 box). */
const box6 = (r: readonly number[]): [number, number, number, number] => [r[0]!, r[1]!, r[2]!, r[3]!];
/** T5f bays' exact anchor sets (R2 graph). */
const B5_ANCHORS = { ledge: 13, ladder: 3, door: 2 };
const B6_ANCHORS = { ladder: 1, door: 11, duct: 1 };

/** BFS over a room graph: [from, to, element, both ways, return link (A61)]. */
type Link = [string, string, string, boolean, boolean?];
function reachGraph(links: readonly Link[], from: string, without: readonly string[], ret: boolean): Map<string, [string, string]> {
  const prev = new Map<string, [string, string]>([[from, ['', '']]]);
  const q = [from];
  while (q.length > 0) {
    const n = q.shift()!;
    for (const [a, e, el, both, r] of links) {
      if (without.includes(el) || (r && !ret)) continue;
      for (const [s, t] of both ? [[a, e], [e, a]] : [[a, e]]) {
        if (s === n && !prev.has(t!)) {
          prev.set(t!, [n, el]);
          q.push(t!);
        }
      }
    }
  }
  return prev;
}
function pathEls(prev: Map<string, [string, string]>, from: string, to: string): string[] {
  const els: string[] = [];
  for (let n = to; n !== from; n = prev.get(n)![0]) els.unshift(prev.get(n)![1]);
  return els.filter((e) => e !== 'fall');
}

describe('Fallow (bunker) shaft and reservoir (T5e, BAYS v2)', () => {
  // the anchors `build` would make: manual ones, generated ledges, split anchors (in that order, as levelBuilder.build)
  const pb = new LevelBuilder();
  const play = bunker.build(pb, 0);
  generateLedges(pb.boxes, pb.anchors);
  const gaps = findSplitGaps(buildCoverSegments(pb.boxes, pb.cylinders));
  for (const g of gaps) pb.anchors.add<SplitAnchor>({ kind: 'split', ...g } as SplitAnchor);
  const A: TraversalAnchors = pb.anchors;
  const c = play.course!;
  const M3 = B3_METRICS;
  const M4 = B4_METRICS;
  const b3 = (x: number, z: number, y = 0) => plantAt('B3', x, z, y);
  const b4 = (x: number, z: number, y = 0) => plantAt('B4', x, z, y);
  const inBay = (bay: 'B3' | 'B4', x: number, z: number): boolean => {
    const r = SHAFT_BOX[bay];
    return x >= r[0] - 0.3 && x <= r[2] + 0.3 && z >= r[1] - 0.3 && z <= r[3] + 0.3;
  };
  const lipOf = (id: string) => PLANT_LIPS.find((l) => l.id === id)!;
  const splits = A.all.filter((a): a is SplitAnchor => a.kind === 'split');
  const atPose = (a: Parameters<typeof attachPose>[0], s: number, face: number) => attachPose(a, s, face, 1.75, { x: 0, y: 0, z: 0, yaw: 0 });
  const shut = b.anchors.doors.filter((d) => d.locked).map(doorLeaf);
  const fence = b.anchors.fences.find((f) => f.id === lay.course!.anchors!['B3-fence'])!;
  const fenceLeaf: NavBlocker = { cx: (fence.a.x + fence.b.x) / 2, cz: fence.a.z, hx: fence.len / 2, hz: 0.05, yaw: 0, bottom: fence.a.y, top: fence.a.y + fence.height };
  const joins = (n: NavGrid, p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) => n.findPath([p.x, p.z], [q.x, q.z], 1e6, p.y, q.y);
  const covered = (x: number, z: number, y: number) => b.boxes.some((p) => p.collide && Math.abs(x - p.c[0]) <= p.s[0] / 2 && Math.abs(z - p.c[2]) <= p.s[2] / 2 && Math.abs(y - p.c[1]) <= p.s[1] / 2);

  it('debug points per room and vantage; every one stands on a floor', () => {
    const ids = lay.debugPoints!.map((d) => d.id);
    for (const id of ['B3', 'B3-RC', 'B3-G2', 'B3-G3', 'B3-G4', 'B3-NT1', 'B3-G5', 'B3-NR', 'B3-ML', 'B3-RF', 'B3-CR', 'B3-ZD', 'B3-NT2', 'B3-WP', 'B3-floor', 'B3-pit', 'B3-PP', 'A3', 'B4', 'B4-W1', 'B4-C2', 'B4-VG', 'B4-C3', 'B4-OP', 'A4']) expect(ids, id).toContain(id);
    expect(ids).not.toContain('B3-X');
    const nav = analyticNav(b, [58, 7, 82, 61], shut);
    for (const d of lay.debugPoints!.filter((p) => inBay('B3', p.pos.x, p.pos.z) || inBay('B4', p.pos.x, p.pos.z))) expect(nav.heightAt(d.pos.x, d.pos.z, d.pos.y), d.id).toBeCloseTo(d.pos.y, 1);
  });

  it('the course stub: B3 one shared course (fence locked until the isolator), B4 bolt / sluice / outlet; objectives by name (R5); A3, A4 automatic', () => {
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    const bay = (id: string) => c.def.bays.find((x) => x.id === id)!;
    expect([bay('B3').entry, bay('B3').exit, bay('B4').entry, bay('B4').exit, bay('B5').entry]).toEqual(['A2', 'A3', 'A3', 'A4', 'A4']);
    expect(bay('B3').gates.map((g) => g.id)).toEqual(['g-isolator', 'g-fan']);
    expect(bay('B3').gates[1]).toEqual({ kind: 'anchorLock', id: 'g-fan', anchorId: 'B3-fence', flag: 'fan-off' });
    expect(bay('B4').gates.map((g) => g.id)).toEqual(['g-insp', 'g-sluice', 'g-outlet', 'g-outlet-ladder']);
    const locked = new Set(b.anchors.doors.filter((d) => d.locked).map((d) => d.id));
    for (const id of ['A3-near', 'A3-far', 'A4-near', 'A4-far', 'B4-insp', 'B4-sluice']) expect(locked.has(c.doors[id]!), id).toBe(true);
    for (const k of Object.keys(c.devices)) expect(/^A[34]/.test(k), k).toBe(false);
    const obj = (id: string) => c.def.objectives!.filter((o) => o.bay === id);
    expect(obj('B3').length).toBe(21);
    expect(obj('B4').length).toBe(12);
    expect(obj('B3')[0]!.text).toBe('Split jump in the riser slot');
    expect(obj('B3')[11]!.text).toBe('Stop the fan at the isolator');
    expect(obj('B4')[5]!.text).toBe('Hold the sluice open from the gallery');
    expect([...obj('B3'), ...obj('B4')].every((o) => o.text.length <= 90)).toBe(true);
    expect(c.def.airlocks.find((a) => a.id === 'A3')!.box).toEqual([69, 40, 75, 46]);
    expect(c.def.airlocks.find((a) => a.id === 'A4')!.box).toEqual([70, 8, 76, 14]);
    expect(bay('B3').elements.map((e) => e.id)).toEqual(['B3-W5', 'B3-NR', 'B3-MLR', 'B3-window', 'B3-hatch', 'B3-grilles']);
  });

  it('R4: B3 14 x 14 (196 m2) against A2, B4 12 x 26 (312 m2) at (66, 14) against A3; A3 opens on C1', () => {
    const area = (r: readonly number[]) => (r[2]! - r[0]!) * (r[3]! - r[1]!);
    expect(area(SHAFT_BOX.B3)).toBeCloseTo(196, 5);
    expect(area(SHAFT_BOX.B4)).toBeCloseTo(312, 5);
    expect(SHAFT_BOX.B3[0]).toBe(at('A2', 6, 0).x);
    const g1 = b3(1.4, 7, M3.g1);
    expect(g1.y).toBe(UPPER_Y);
    // A2's far door opens onto G1
    const far = b.anchors.doors.find((d) => d.id === lay.course!.doors['A2-far'])!;
    expect(far.hinge.x).toBeCloseTo(SHAFT_BOX.B3[0], 5);
    expect(far.hinge.y).toBeCloseTo(UPPER_Y, 5);
    expect(SHAFT_BOX.B4[3]).toBe(plantAt('A3', 0, 0).z);
    expect(lay.debugPoints!.some((d) => d.id === 'B4-X')).toBe(false);
    const open = analyticNav(b, [58, 7, 82, 61], b.anchors.doors.filter((d) => d.locked && d.id !== c.doors['A3-far']).map(doorLeaf));
    expect(joins(open, plantAt('A3', 3, 3), b4(6, 24))).not.toBeNull();
  });

  it('lips only where planned (PLANT_LIPS, all manual); no generated lip in B3 / B4', () => {
    expect(generated.filter((l) => inBay('B3', l.a.x, l.a.z) || inBay('B4', l.a.x, l.a.z))).toEqual([]);
    const mine = manual.filter((l) => inBay('B3', l.a.x, l.a.z) || inBay('B4', l.a.x, l.a.z));
    for (const l of mine) expect(PLANT_LIPS.some((p) => inLip(l, p.box, p.top)), `${l.a.x} ${l.a.z} ${l.top}`).toBe(true);
    for (const p of PLANT_LIPS) expect(mine.some((l) => inLip(l, p.box, p.top)), p.id).toBe(true);
    expect(mine.length).toBe(7);
  });

  it('exactly one split gap in B3 (the RC slot, 1.6, faces >= 3.6, on G1) and one in B4 (the Phase 5 overflow channel)', () => {
    const inB3 = splits.filter((g) => inBay('B3', g.a.x, g.a.z));
    expect(inB3.length).toBe(1);
    expect(inB3[0]!.a.y).toBeCloseTo(PLANT_Y + M3.g1, 5);
    const inB4 = splits.filter((g) => inBay('B4', g.a.x, g.a.z));
    expect(inB4.length).toBe(1);
    expect(inB4[0]!.a.x).toBeCloseTo(b4(0.8, 0).x, 5);
  });

  it('RC: from the split (real pose, both facings) the engine jump-up lands on the casing top lip, 4.6 over G1', () => {
    const rc = splits.find((g) => inBay('B3', g.a.x, g.a.z))!;
    const ids = new Set(A.ledges.filter((l) => inLip(l, lipOf('RC').box, lipOf('RC').top)).map((l) => l.id));
    expect(ids.size).toBeGreaterThan(0);
    for (const face of [1, -1] as const) {
      for (const s of face === 1 ? [0.5, rc.len / 2, rc.len - 1.5] : [1.5, rc.len / 2, rc.len - 0.5]) {
        const p = atPose(rc, s, face);
        expect(splitReach(rc, p.x, rc.a.y, p.z, rc.tx * face, rc.tz * face), `${face} ${s}`).not.toBeNull();
        const from = { x: p.x, y: rc.a.y + SPLIT.feetHeight + 1.05, z: p.z };
        const t = findJumpTarget(A, from, rc.id, rc.tx * face, rc.tz * face, 1, 2.5, 0.6, 0, 0);
        expect(t, `${face} ${s}`).not.toBeNull();
        expect(ids.has(t!.anchor.id), `${face} ${s}`).toBe(true);
      }
    }
    expect(M3.casingTop - M3.g1).toBeGreaterThan(TEAM.boostMax);
  });

  it('WJ1 straight from G2 (3.4) and WJ2 up the inside corner from G3 (3.2)', () => {
    const wj1 = manual.find((l) => inLip(l, lipOf('WJ1').box, lipOf('WJ1').top))!;
    const st = b3(12, 11.8);
    expect(wallJumpReach(wj1, st.x, PLANT_Y + M3.g2, st.z, 0, 1)?.corner).toBe(false);
    const wj2 = manual.find((l) => inLip(l, lipOf('WJ2').box, lipOf('WJ2').top))!;
    const co = b3(10.6, 13.4);
    expect(wallJumpReach(wj2, co.x, PLANT_Y + M3.g3, co.z, 0, 1)).not.toBeNull();
    for (const d of [M3.g3 - M3.g2, M3.g4 - M3.g3]) {
      expect(d).toBeGreaterThanOrEqual(WALL_JUMP.minUp);
      expect(d).toBeLessThanOrEqual(WALL_JUMP.maxUp);
    }
  });

  it('ropes: RP1 to ML floor height, sideways onto ML at lateralMax; RP2 offers the CR window, its RF side out of boost', () => {
    const rp1 = b.anchors.all.find((a) => a.id === c.anchors!['B3-rappel-1'])!;
    if (rp1.kind !== 'rappel') throw new Error('rp1');
    expect(rp1.top.y - rp1.length).toBeCloseTo(PLANT_Y + M3.ml, 5);
    expect(rp1.top.x + RAPPEL.lateralMax - 0.32).toBeGreaterThan(b3(5.95, 0).x);
    const rp2 = b.anchors.all.find((a) => a.id === c.anchors!['B3-rappel-2'])!;
    if (rp2.kind !== 'rappel') throw new Error('rp2');
    expect(rp2.top.y - rp2.length).toBeCloseTo(PLANT_Y + M3.rf, 5);
    const w = b.anchors.all.find((a) => a.kind === 'window' && inBay('B3', a.c.x, a.c.z))!;
    if (w.kind !== 'window') throw new Error('w');
    expect(Math.abs(Math.sin(w.yaw) * rp2.nx + Math.cos(w.yaw) * rp2.nz)).toBeGreaterThan(0.9);
    expect(Math.abs(w.c.z - rp2.top.z)).toBeLessThan(0.01);
    expect(w.sillHeight - (PLANT_Y + M3.cr)).toBeCloseTo(2.0, 5);
    expect(w.sillHeight - (PLANT_Y + M3.rf)).toBeGreaterThan(TEAM.boostMax);
  });

  it('T5c open items: HS walk-off screens close the rope column to 23.0; no ladder in a rope kick volume', () => {
    for (let y = M3.ml + 0.2; y < M3.screenTop; y += 0.5) {
      expect(covered(b3(5.8, 0.5).x, b3(0, 0.5).z, PLANT_Y + y), `east ${y}`).toBe(true);
      if (y > M3.ml + 2.1) expect(covered(b3(5.8, 2.4).x, b3(0, 2.4).z, PLANT_Y + y), `east door ${y}`).toBe(true);
    }
    for (let y = M3.nr + 0.2; y < M3.screenTop; y += 0.5) expect(covered(b3(5, 0).x, b3(0, 3.75).z, PLANT_Y + y), `north ${y}`).toBe(true);
    for (const id of ['B3-rappel-1', 'B3-rappel-2']) {
      const rp = b.anchors.all.find((a) => a.id === c.anchors![id])!;
      if (rp.kind !== 'rappel') throw new Error(id);
      const out = RAPPEL.standoff + RAPPEL.swingOut + 0.35;
      const lat = RAPPEL.lateralMax + 0.35;
      const y0 = rp.top.y - rp.length;
      for (const l of b.anchors.ladders) {
        const u = (l.base.x - rp.top.x) * rp.nx + (l.base.z - rp.top.z) * rp.nz;
        const v = Math.abs((l.base.x - rp.top.x) * -rp.nz + (l.base.z - rp.top.z) * rp.nx);
        const inside = u > -0.1 && u < out && v < lat + l.width / 2 && l.top.y > y0 + 0.01 && l.base.y < rp.top.y - 0.01;
        expect(inside, `${id} ladder ${l.base.x} ${l.base.z}`).toBe(false);
      }
    }
  });

  it('rope catchers: every rope / cable position plus the kick-out and the capsule radius settles over its catcher, never the pit', () => {
    // the body is pushed out of each collider it overlaps along the shortest axis (a tie, centre on a mid-plane, fails);
    // the settled centre must stand over one of the rope's catcher floors, at the bottom-out and the unhook heights
    const R = 0.3;
    const ext = (p: (typeof b.boxes)[number]): [number, number] => (Math.abs(Math.sin(p.yaw)) > 0.5 ? [p.s[2] / 2, p.s[0] / 2] : [p.s[0] / 2, p.s[2] / 2]);
    const floorUnder = (x: number, z: number, feet: number): number => {
      let top = -Infinity;
      for (const p of b.boxes) {
        const [hx, hz] = ext(p);
        const t = p.c[1] + p.s[1] / 2;
        if (p.collide && t <= feet + 0.3 && t > top && Math.abs(x - p.c[0]) <= hx && Math.abs(z - p.c[2]) <= hz) top = t;
      }
      return top;
    };
    const settle = (x0: number, z0: number, feet: number): [number, number] | null => {
      let x = x0;
      let z = z0;
      for (let pass = 0; pass < 4; pass++) {
        let moved = false;
        for (const p of b.boxes) {
          const lo = p.c[1] - p.s[1] / 2;
          const hi = p.c[1] + p.s[1] / 2;
          if (!p.collide || hi <= feet + 0.3 || lo >= feet + 1.75) continue;
          const [hx, hz] = ext(p);
          const dx = x - p.c[0];
          const dz = z - p.c[2];
          const px = hx + R - Math.abs(dx);
          const pz = hz + R - Math.abs(dz);
          if (px <= 1e-6 || pz <= 1e-6) continue;
          if (px < pz) {
            if (Math.abs(dx) < 1e-6) return null;
            x += Math.sign(dx) * px;
          } else {
            if (Math.abs(dz) < 1e-6) return null;
            z += Math.sign(dz) * pz;
          }
          moved = true;
        }
        if (!moved) break;
      }
      return [x, z];
    };
    const check = (id: string, x: number, z: number, feet: number, floors: readonly number[]) => {
      const s2 = settle(x, z, feet);
      expect(s2, `${id} tie at ${x.toFixed(2)} ${z.toFixed(2)} ${feet}`).not.toBeNull();
      const f = floorUnder(s2![0], s2![1], feet);
      expect(floors.some((y) => Math.abs(f - (PLANT_Y + y)) < 0.05), `${id} at ${x.toFixed(2)} ${z.toFixed(2)} ${feet}: floor ${f}`).toBe(true);
    };
    // RP1: NR under the rope, ML at lateralMax, RF through ML's hatch (RF's ladder rejoins ML); RP2: RF only
    const ropes: [string, readonly number[]][] = [['B3-rappel-1', [M3.nr, M3.ml, M3.rf]], ['B3-rappel-2', [M3.rf]]];
    for (const [id, floors] of ropes) {
      const rp = b.anchors.all.find((a) => a.id === c.anchors![id])!;
      if (rp.kind !== 'rappel') throw new Error(id);
      const y0 = rp.top.y - rp.length;
      for (let u = -RAPPEL.lateralMax; u <= RAPPEL.lateralMax + 1e-6; u += RAPPEL.lateralMax / 6)
        for (let d = RAPPEL.standoff; d <= RAPPEL.standoff + RAPPEL.swingOut + 1e-6; d += RAPPEL.swingOut / 6)
          for (const feet of [y0, y0 + RAPPEL.unhookHeight]) check(id, rp.top.x + rp.nx * d - rp.nz * u, rp.top.z + rp.nz * d + rp.nx * u, feet, floors);
    }
    // ZP: a let-go anywhere along the cable west of ZD lands on NT2, WP or the floor ring west of NT2 (never the pit)
    const zp = b.anchors.all.find((a) => a.id === c.anchors!['B3-zipline'])!;
    if (zp.kind !== 'zipline') throw new Error('zip');
    for (let t = 0; t <= 1 + 1e-6; t += 0.05) {
      const x = zp.a.x + (zp.b.x - zp.a.x) * t;
      const z = zp.a.z + (zp.b.z - zp.a.z) * t;
      const feet = zp.a.y + (zp.b.y - zp.a.y) * t - HANG.drop;
      check('B3-zipline', x, z, feet, [M3.cr, M3.nt2, M3.wp, 0]);
      expect(x > b3(6, 0).x && z < b3(0, 6.5).z, `zip over the pit at ${t}`).toBe(false);
    }
  });

  it('ZP: feet on ZD at the start and on WP at the end; FP one fence 2.4 locked on fan-off; two ducts pit -> PP', () => {
    const z = b.anchors.all.find((a) => a.id === c.anchors!['B3-zipline'])!;
    if (z.kind !== 'zipline') throw new Error('zip');
    expect(z.a.y - HANG.drop).toBeCloseTo(PLANT_Y + M3.cr, 1);
    expect(z.b.y - HANG.drop).toBeCloseTo(PLANT_Y + M3.wp, 1);
    expect(b.anchors.fences.filter((f) => inBay('B3', f.a.x, f.a.z)).length).toBe(1);
    expect(fence.height).toBe(M3.fence);
    for (const k of [1, 2]) {
      const d = b.anchors.all.find((a) => a.id === c.anchors![`B3-duct-${k}`])!;
      if (d.kind !== 'duct') throw new Error('duct');
      expect(d.entry.pos.x).toBeCloseTo(b3(6, 0).x, 5);
      expect(d.exit.pos.x).toBeCloseTo(b3(2, 0).x, 5);
    }
  });

  it('B4 human ladder: from the shoulders against W2 (C2 side) the grip reaches W2 at x 1..4 only', () => {
    const w2 = B4_COOP_LIPS.find((l) => l.id === 'W2')!;
    for (const x of [1.5, 2.5, 3.5]) {
      const p = b4(x, 9.5);
      const from = { x: p.x, y: p.y + TEAM.ladderFeet + 1.75, z: p.z };
      const t = findJumpTarget(A, from, -1, 0, -1, 1, 1.6, 0.2);
      expect(t, `x ${x}`).not.toBeNull();
      expect(inLip(t!.anchor as Ledge, w2.box, w2.top), `x ${x}`).toBe(true);
    }
    for (const l of B4_COOP_LIPS) {
      expect(l.top - l.floor).toBeGreaterThanOrEqual(4.25);
      expect(l.top - l.floor).toBeLessThanOrEqual(TEAM.boostMax);
    }
  });

  it('no split pose (both facings, along each split) jumps up onto a co-op lip', () => {
    const ids = new Set(A.ledges.filter((l) => BUNKER_COOP_LIPS.some((p) => inLip(l, p.box, p.top))).map((l) => l.id));
    expect(ids.size).toBeGreaterThan(0);
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

  it('per rebuilt bay, the traversal anchors in the bay box are exactly the R2 graph set (an added ladder, lip or door fails)', () => {
    expect(anchorKinds(b, [7, 49.5, 59, 58.5])).toEqual({ ladder: 5, pipeH: 1, pipeV: 1, ledge: 7, window: 3, door: 1 });
    expect(anchorKinds(b, SHAFT_BOX.B3)).toEqual({ ledge: 3, door: 3, pipeH: 1, ladder: 4, rappel: 2, window: 1, zipline: 1, fence: 1, duct: 2 });
    expect(anchorKinds(b, SHAFT_BOX.B4)).toEqual({ ledge: 4, door: 3, ladder: 3 });
  });

  // B3's room graph (BAYS 0.2 Proof): cells are floors the nav keeps apart; links are the elements' passages
  const P3 = (x: number, z: number, y: number) => b3(x, z, y);
  const cells3: Record<string, { x: number; y: number; z: number }> = {
    A2: at('A2', 3, 3), G1: P3(1.4, 7, M3.g1), CASE: P3(5.5, 11.8, M3.casingTop), G2: P3(12.5, 10, M3.g2), G3: P3(12.5, 13.2, M3.g3),
    G4: P3(7, 13.3, M3.g4), NT1: P3(3.5, 8, M3.nt1), W5N: P3(0.6, 10.4, M3.g5), G5: P3(2, 2, M3.g5), NR: P3(4.6, 2.4, M3.nr),
    ML: P3(7.4, 2, M3.ml), RF: P3(7.8, 2, M3.rf), CR: P3(11.5, 2.5, M3.cr), ZD: P3(12, 6.5, M3.cr), NT2: P3(6, 8, M3.nt2),
    WP: P3(1.5, 8.5, M3.wp), RING: P3(11, 11, 0), PIT: P3(8, 4.5, 0), PP: P3(4, 1.3, 0), A3: plantAt('A3', 3, 3),
  };
  // rope 1 also lands in RF through ML's hatch at lateralMax (the rope-catcher test); RF's ladder rejoins ML
  const links3: Link[] = [
    ['A2', 'G1', 'door', true], ['G1', 'CASE', 'split', false], ['CASE', 'G1', 'fall', false], ['CASE', 'G2', 'step', true],
    ['G2', 'G3', 'WJ1', false], ['G3', 'G2', 'fall', false], ['G3', 'G4', 'WJ2', false], ['G4', 'G3', 'fall', false],
    ['G4', 'G5', 'bar', false], ['G4', 'NT1', 'fall', false], ['NT1', 'G4', 'net ladder', false], ['NT1', 'W5N', 'step', true],
    ['G5', 'W5N', 'W5 turnstile', false, true], ['G5', 'NR', 'fall', false], ['NR', 'G5', 'NR turnstile', false, true],
    ['G5', 'ML', 'rope 1', false], ['G5', 'RF', 'rope 1', false], ['ML', 'NR', 'ML gate', false, true], ['ML', 'RF', 'fall', false], ['RF', 'ML', 'hatch ladder', false, true],
    ['ML', 'CR', 'rope 2 window', false], ['CR', 'ZD', 'door', true], ['ZD', 'NT2', 'fall', false], ['NT2', 'ZD', 'net ladder', false],
    ['ZD', 'WP', 'zipline', false], ['WP', 'RING', 'drop', false], ['RING', 'WP', 'boost', false], ['RING', 'PIT', 'fence', true],
    ['PIT', 'PP', 'duct 1', true], ['PIT', 'PP', 'duct 2', true], ['PP', 'A3', 'door', true],
  ];

  it('B3: the nav keeps every cell apart (landings screened, catchers closed, the fence and ducts the only ways on)', () => {
    const nav = analyticNav(b, [58, 39, 80, 61], [...shut, ...b.anchors.doors.filter((d) => !d.locked && inBay('B3', d.hinge.x, d.hinge.z)).map(doorLeaf), fenceLeaf]);
    const named = Object.entries(cells3);
    for (const [id, p] of named) expect(nav.heightAt(p.x, p.z, p.y), id).toBeCloseTo(p.y, 1);
    const joined: string[] = [];
    for (let i = 0; i < named.length; i++) for (let k = i + 1; k < named.length; k++) if (joins(nav, named[i]![1], named[k]![1])) joined.push(`${named[i]![0]}-${named[k]![0]}`);
    expect(joined).toEqual([]);
  });

  it('R1, B3: the path from A2 to A3 passes the elements in the objective order and never uses a return link', () => {
    const prev = reachGraph(links3, 'A2', [], false);
    expect(pathEls(prev, 'A2', 'A3')).toEqual(['door', 'split', 'step', 'WJ1', 'WJ2', 'bar', 'rope 1', 'rope 2 window', 'door', 'zipline', 'drop', 'fence', 'duct 1', 'door']);
    expect([...reachGraph(links3, 'A2', [], true).keys()].sort()).toEqual([...prev.keys()].sort());
  });

  it('R2, B3: each element is a cut (return links included); the fence is a cut while fan-off is unset', () => {
    for (const el of ['split', 'WJ1', 'WJ2', 'bar', 'rope 1', 'rope 2 window', 'zipline', 'fence']) expect(reachGraph(links3, 'A2', [el], true).has('A3'), el).toBe(false);
    expect(reachGraph(links3, 'A2', ['duct 1', 'duct 2'], true).has('A3')).toBe(false);
  });

  // B4's room graph
  const cells4: Record<string, { x: number; y: number; z: number }> = {
    A3: plantAt('A3', 3, 3), C1: b4(6, 22), W1: b4(2, 17.5, M4.wall), C2: b4(2.5, 12), W2: b4(2.5, 8.5, M4.w2), VG: b4(10.5, 14, M4.gallery),
    C3: b4(6, 5), OP: b4(5, 1, M4.outlet), A4: plantAt('A4', 3, 3),
  };
  const links4: Link[] = [
    ['A3', 'C1', 'door', true], ['C1', 'W1', 'boost', false], ['W1', 'C1', 'fall', false], ['W1', 'C2', 'drop', false],
    ['C2', 'C1', 'bolt door', false], ['C2', 'W2', 'human ladder', false], ['W2', 'C2', 'fall', false], ['W2', 'VG', 'rail gate', true],
    ['C2', 'C3', 'sluice', false], ['VG', 'C3', 'C3 ladder', true], ['C3', 'OP', 'outlet boost', false], ['OP', 'C3', 'fall', false],
    ['C3', 'OP', 'outlet ladder', false], ['OP', 'A4', 'door', true],
  ];

  it('B4: the nav keeps every cell apart (walls wall to wall, VG and W2 screened)', () => {
    const nav = analyticNav(b, [58, 7, 82, 61], shut);
    const named = Object.entries(cells4);
    for (const [id, p] of named) expect(nav.heightAt(p.x, p.z, p.y), id).toBeCloseTo(p.y, 1);
    const joined: string[] = [];
    for (let i = 0; i < named.length; i++) for (let k = i + 1; k < named.length; k++) if (joins(nav, named[i]![1], named[k]![1])) joined.push(`${named[i]![0]}-${named[k]![0]}`);
    expect(joined).toEqual([]);
  });

  it('R1 / R2, B4: A3 -> C1 -> W1 -> C2 -> W2 / sluice -> C3 -> OP -> A4; each team move is a cut', () => {
    const prev = reachGraph(links4, 'A3', ['sluice'], true);
    expect(pathEls(prev, 'A3', 'A4')).toEqual(['door', 'boost', 'drop', 'human ladder', 'rail gate', 'C3 ladder', 'outlet boost', 'door']);
    for (const el of ['boost', 'drop', 'outlet boost']) expect(reachGraph(links4, 'A3', el === 'outlet boost' ? [el, 'outlet ladder'] : [el], true).has('A4'), el).toBe(false);
    // the second player (left in C2): the sluice is C2's only floor exit, the human ladder its only way up
    expect(reachGraph(links4, 'C2', ['sluice', 'human ladder'], true).has('C3')).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------------ T5f: B5, A5, B6, S6, A6

describe('Fallow (bunker) Standby Plant, Mock Site, Stair 6 (T5f, BAYS v2)', () => {
  const pb = new LevelBuilder();
  const play = bunker.build(pb, 0);
  generateLedges(pb.boxes, pb.anchors);
  const gaps = findSplitGaps(buildCoverSegments(pb.boxes, pb.cylinders));
  for (const g of gaps) pb.anchors.add<SplitAnchor>({ kind: 'split', ...g } as SplitAnchor);
  const A: TraversalAnchors = pb.anchors;
  const c = play.course!;
  const b5 = (x: number, z: number, y = 0) => plantAt2('B5', x, z, y);
  const b6 = (x: number, z: number, y = 0) => plantAt2('B6', x, z, y);
  const BAYS5 = ['B5', 'A5', 'B6', 'S6', 'A6'] as const;
  const inBay = (bay: (typeof BAYS5)[number], x: number, z: number): boolean => {
    const r = PLANT2_BOX[bay];
    return x >= r[0] - 0.3 && x <= r[2] + 0.3 && z >= r[1] - 0.3 && z <= r[3] + 0.3;
  };
  const inT5f = (x: number, z: number): boolean => BAYS5.some((k) => inBay(k, x, z));
  const lipOf = (id: string) => B5_LIPS.find((l) => l.id === id)!;
  const topAt = (x: number, z: number, y: number): boolean =>
    pb.boxes.some((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3 && Math.abs(p.c[1] + p.s[1] / 2 - y) < 0.01 && Math.abs(x - p.c[0]) <= p.s[0] / 2 - 0.05 && Math.abs(z - p.c[2]) <= p.s[2] / 2 - 0.05);
  const shut = b.anchors.doors.filter((d) => d.locked).map(doorLeaf);
  const allShut = b.anchors.doors.filter((d) => d.locked || inT5f(d.hinge.x, d.hinge.z)).map(doorLeaf);
  const joins = (n: NavGrid, p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) => n.findPath([p.x, p.z], [q.x, q.z], 1e6, p.y, q.y);
  const RECT: [number, number, number, number] = [10, -41, 80, 15];
  const apart = (nav: NavGrid, cells: Record<string, { x: number; y: number; z: number }>): string[] => {
    const named = Object.entries(cells);
    for (const [id, p] of named) expect(nav.heightAt(p.x, p.z, p.y), id).toBeCloseTo(p.y, 1);
    const joined: string[] = [];
    for (let i = 0; i < named.length; i++) for (let k = i + 1; k < named.length; k++) if (joins(nav, named[i]![1], named[k]![1])) joined.push(`${named[i]![0]}-${named[k]![0]}`);
    return joined;
  };

  it('debug points per room and vantage; every one stands on a floor', () => {
    const ids = play.debugPoints!.map((d) => d.id);
    const want = ['B5', 'B5-floor', 'B5-GEN', 'B5-CG', 'B5-trench', 'B5-SR', 'B5-FB', 'A5', 'B6', 'B6-AH', 'B6-PLAT', 'B6-RE', 'B6-CO', 'B6-L', 'B6-LK', 'B6-OF', 'B6-CR', 'B6-MT', 'B6-SV', 'S6', 'A6'];
    for (const id of want) expect(ids, id).toContain(id);
    expect(ids).not.toContain('B4-X');
    const nav = analyticNav(b, RECT, shut);
    for (const d of play.debugPoints!.filter((p) => inT5f(p.pos.x, p.pos.z) && p.id !== 'A4')) expect(nav.heightAt(d.pos.x, d.pos.z, d.pos.y), d.id).toBeCloseTo(d.pos.y, 1);
  });

  it('course stub: B5 mains gate on A5; B6 card / reader / keypad / egress gates; S6 bolted from the B6 side; objectives by name (R5); A5, A6 automatic', () => {
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    const bay = (id: string) => c.def.bays.find((x) => x.id === id)!;
    expect([bay('B5').entry, bay('B5').exit, bay('B6').entry, bay('B6').exit, bay('B7').entry]).toEqual(['A4', 'A5', 'A5', 'A6', 'A6']);
    const locked = new Set(pb.anchors.doors.filter((d) => d.locked).map((d) => d.id));
    for (const id of ['A5-near', 'A5-far', 'A6-near', 'A6-far', 'B6-rd1', 'B6-rd2', 'B6-rd3', 'B6-rd4', 'B6-exit', 'S6-top']) expect(locked.has(c.doors[id]!), id).toBe(true);
    expect(bay('B5').gates).toEqual([{ kind: 'mains', id: 'g-mains', group: 'B5-mains', doorId: 'A5-near' }]);
    expect(c.groups!['B5-mains']).toBe(B5_GROUPS.mains);
    // the mains gate starts shut: a lamp on the group is on (B5's work lamp); MB is a switch on that group; no lamp
    // on the group can be shot or EMP'd (that would read as mains off: the gate bypass)
    expect(pb.lights.lights.some((l) => l.group === B5_GROUPS.mains && l.on)).toBe(true);
    expect(play.switches!.filter((s) => s.group === B5_GROUPS.mains).length).toBe(1);
    for (const l of pb.lights.lights.filter((q) => q.group === B5_GROUPS.mains)) expect([l.destructible, l.electric]).toEqual([false, false]);
    const g6 = bay('B6').gates;
    const flagGate = (door: string) => g6.find((g) => g.kind === 'flag' && g.doorId === door);
    for (const [door, flag] of [['B6-rd1', 'card-1'], ['B6-rd2', 'card-2'], ['B6-rd3', 'card-3'], ['B6-rd4', 'card-4'], ['B6-exit', 'exit-code']]) expect(flagGate(door!), door).toMatchObject({ flag });
    for (const door of ['B6-rd1', 'B6-rd2', 'B6-rd3', 'B6-rd4', 'B6-exit', 'S6-top', 'A5-near']) expect(c.def.bays.flatMap((x) => x.gates).filter((g) => 'doorId' in g && g.doorId === door).length, door).toBe(1);
    const s6 = g6.find((g) => g.kind === 'bolt' && g.doorId === 'S6-top');
    expect(s6).toMatchObject({ side: [0, 1], at: [S6_TOP_DOOR.x, S6_TOP_DOOR.z] });
    for (const k of ['pk-card-a', 'pk-card-b', 'pk-card-m', 'sw-key-1', 'sw-key-2', 'sw-key-3', 'sw-mt-egress', 'sw-rd1-rex']) expect(c.devices[k], k).toBeDefined();
    for (const k of Object.keys(c.devices)) expect(/^A[56]/.test(k), k).toBe(false);
    const obj = (id: string) => c.def.objectives!.filter((o) => o.bay === id);
    expect(obj('B5').length).toBe(9);
    expect(obj('B6').length).toBe(24);
    expect(obj('B5')[6]!.text).toBe('Pull the mains breaker');
    expect(obj('B6')[0]!.text).toBe('Climb to the supply duct and crawl it');
    expect(obj('B6')[22]!.text).toBe('Enter the exit code at the keypad');
    expect([...obj('B5'), ...obj('B6')].every((o) => o.text.length <= 90)).toBe(true);
    expect(c.def.airlocks.find((a) => a.id === 'A5')!.box).toEqual([42, -7, 48, -1]);
    expect(c.def.airlocks.find((a) => a.id === 'A6')!.box).toEqual([17.5, -39, 23.5, -33]);
    expect(bay('B5').elements.map((e) => e.id)).toEqual(['B5-circuits', 'B5-guards']);
    expect(bay('B6').elements.map((e) => e.id)).toEqual(['B6-security', 'B6-guards', 'B6-s6-relock']);
    // the Finish sits in the lift car L9 (v1 Deep moved by (+17.5, -29) until T5g, A74)
    expect(c.devices.end!.y).toBe(0);
    expect(c.devices.end!.x).toBeGreaterThan(153.5);
    expect(c.devices.end!.z).toBeGreaterThan(-33);
  });

  it('R4: B5 30 x 24 and B6 30 x 24 (720 m2 each), A5 / A6 6 x 6; the doors meet at the BAYS 0.1 contacts', () => {
    const area = (r: readonly number[]) => (r[2]! - r[0]!) * (r[3]! - r[1]!);
    expect(area(PLANT2_BOX.B5)).toBeCloseTo(720, 5);
    expect(area(PLANT2_BOX.B6)).toBeCloseTo(720, 5);
    expect(area(PLANT2_BOX.A5)).toBeCloseTo(36, 5);
    expect(area(PLANT2_BOX.A6)).toBeCloseTo(36, 5);
    const door = (id: string) => pb.anchors.doors.find((d) => d.id === c.doors[id])!;
    const at = (id: string) => [door(id).hinge.x, door(id).hinge.z, door(id).hinge.y];
    expect(at('A4-far')).toEqual([72.4, 8, PLANT_Y + B5_METRICS.landing]);
    expect(at('A5-near')).toEqual([48, -4.6, PLANT_Y]);
    expect(at('A5-far')).toEqual([42, -4.6, PLANT_Y]);
    expect(at('B6-exit')).toEqual([20, -17, PLANT_Y]);
    expect(at('A6-near')).toEqual([19.9, -33, 0]);
    expect(at('A6-far')).toEqual([19.9, -39, 0]);
    expect(SHAFT_BOX.B4).toEqual([66, 14, 78, 40]);
  });

  it('device mount points: four cameras, desk, panel, readers 1-4, iris, beams, PIR, fault, keypad; wall medkits in A4 and A6', () => {
    const kinds = BUNKER_DEVICES.map((d) => d.kind);
    expect(kinds.filter((k) => k === 'camera' || k === 'cameraSweep').length).toBe(4);
    expect(BUNKER_DEVICES.filter((d) => d.kind === 'reader').map((d) => d.level)).toEqual([1, 2, 3, 4]);
    for (const k of ['desk', 'panel', 'iris', 'pir', 'fault', 'keypad'] as const) expect(kinds, k).toContain(k);
    expect(BUNKER_DEVICES.filter((d) => d.kind === 'beam').length).toBe(2);
    expect(BUNKER_DEVICES.find((d) => d.id === 'SD')!.pos.y).toBeCloseTo(PLANT_Y + B6_METRICS.mezzanine, 5);
    for (const d of BUNKER_DEVICES.filter((x) => x.door)) expect(c.doors[d.door!], d.id).toBeDefined();
    const med = BUNKER_DEVICES.filter((d) => d.kind === 'medkit');
    expect(med.map((d) => d.id)).toEqual(['A4-MED', 'A6-MED']);
    for (const [d, box] of [[med[0]!, box6(c.def.airlocks.find((a) => a.id === 'A4')!.box)], [med[1]!, PLANT2_BOX.A6]] as const) {
      expect(d.pos.x > box[0] && d.pos.x < box[2] && d.pos.z > box[1] && d.pos.z < box[3], d.id).toBe(true);
    }
    // the beams span the L-leg (x 2..4 local) wall to wall
    for (const d of BUNKER_DEVICES.filter((x) => x.kind === 'beam')) {
      expect(d.local[0]).toBe(2.2);
      expect(d.to!.x - d.pos.x).toBeCloseTo(1.6, 5);
    }
  });

  it('relief doors (A62): a visual leaf on an outer wall of each guard room, no door anchor, spawn outside the bay', () => {
    expect(RELIEF_DOORS.map((d) => d.id)).toEqual(['B5-relief', 'B6-relief-cr', 'B6-relief-of', 'B6-relief-co']);
    for (const d of RELIEF_DOORS) {
      expect(pb.anchors.doors.some((q) => hyp2(q.hinge.x - d.pos.x, q.hinge.z - d.pos.z) < 1.5 && Math.abs(q.hinge.y - d.pos.y) < 1), d.id).toBe(false);
      const r = PLANT2_BOX[d.bay];
      const inside = d.spawn.x > r[0] + 0.5 && d.spawn.x < r[2] - 0.5 && d.spawn.z > r[1] + 0.5 && d.spawn.z < r[3] - 0.5;
      expect(inside && d.id !== 'B6-relief-co', d.id).toBe(false);
    }
  });

  it('lips only where planned (B5_LIPS, all manual: genset roofs, the gallery hang-drop); no generated lip, no split gap', () => {
    expect(generated.filter((l) => inT5f(l.a.x, l.a.z) || inT5f(l.b.x, l.b.z))).toEqual([]);
    const mine = manual.filter((l) => inT5f(l.a.x, l.a.z) && l.top < UPPER_Y - 2);
    for (const l of mine) expect(B5_LIPS.some((p) => inLip(l, p.box, p.top)), `${l.a.x} ${l.a.z} ${l.top}`).toBe(true);
    for (const p of B5_LIPS) expect(mine.some((l) => inLip(l, p.box, p.top)), p.id).toBe(true);
    expect(mine.length).toBe(13);
    expect(gaps.filter((g) => inT5f(g.a.x, g.a.z))).toEqual([]);
    expect(pb.anchors.all.filter((a) => a.kind === 'window' && inT5f(a.c.x, a.c.z))).toEqual([]);
    expect(pb.anchors.fences.filter((f) => inT5f(f.a.x, f.a.z))).toEqual([]);
  });

  it('genset roofs 3.0 in the wall-jump window, kicked to from the floor; the gallery hang-drop at x 2 is hang-only, a soft drop', () => {
    expect(B5_METRICS.genset).toBeGreaterThanOrEqual(WALL_JUMP.minUp);
    expect(B5_METRICS.genset).toBeLessThanOrEqual(WALL_JUMP.maxUp);
    for (const id of ['GEN1', 'GEN2', 'GEN3']) {
      const l = lipOf(id);
      const front = manual.find((g) => inLip(g, l.box, l.top) && g.nz < -0.9)!;
      expect(front, id).toBeDefined();
      const st = { x: (l.box[0] + l.box[2]) / 2, z: l.box[1] + 0.05 - 0.6 };
      expect(wallJumpReach(front, st.x, PLANT_Y, st.z, 0, 1), id).not.toBeNull();
    }
    const g = manual.filter((m) => inLip(m, lipOf('GAL-W').box, lipOf('GAL-W').top));
    expect(g.length).toBe(1);
    expect(g[0]!.canHang && !g[0]!.canClimbUp).toBe(true);
    expect(g[0]!.nx).toBeCloseTo(-1, 5);
    expect(landingKind(B5_METRICS.gallery - HANG.drop)).toBe('soft');
  });

  it('the cable trench: 1.5 deep x 1.2 wide, floor y 4.5, grated over but for the two end panels; hide spots', () => {
    const [x0, z0, x1, z1] = B5_METRICS.trench;
    const zm = (z0 + z1) / 2;
    expect(z1 - z0).toBeCloseTo(B5_METRICS.trenchWidth, 5);
    const floorY = PLANT_Y - B5_METRICS.trenchDepth;
    expect(floorY).toBeGreaterThan(-1.5);
    expect(topAt(b5((x0 + x1) / 2, zm).x, b5(0, zm).z, floorY)).toBe(true);
    expect(topAt(b5(13, zm).x, b5(0, zm).z, PLANT_Y)).toBe(true);
    for (const px of B5_METRICS.panels) expect(topAt(b5(px, zm).x, b5(0, zm).z, PLANT_Y), `${px}`).toBe(false);
    // the stair foot (x 26.4..28, z 14.28) is clear of the trench and its panels
    expect(b5(26.4, 0).x).toBeGreaterThan(b5(x1, 0).x);
    // hide spots: the two panels, the fuel bay, the gallery recess; B6 lockers and rack ends
    expect(play.hideSpots!.filter((h) => inT5f(h.pos.x, h.pos.z)).length).toBe(8);
  });

  it('ladders in B5 / B6 (trench, gallery, AH platform) top out on a floor (the real step-off)', () => {
    const lads = pb.anchors.ladders.filter((l) => inT5f(l.base.x, l.base.z));
    expect(lads.length).toBe(4);
    for (const l of lads) {
      const ex = l.top.x + Math.sin(l.facing) * 0.2;
      const ez = l.top.z + Math.cos(l.facing) * 0.2;
      expect(topAt(ex, ez, l.top.y), `${l.base.x} ${l.base.z}`).toBe(true);
    }
  });

  it("EL meets A4's far door at 4.4; screened (2.4 south, full-height mesh west) but for its stair, which reaches the floor", () => {
    const door = pb.anchors.doors.find((d) => d.id === c.doors['A4-far'])!;
    expect(door.hinge.y).toBeCloseTo(PLANT_Y + B5_METRICS.landing, 5);
    expect(topAt(door.hinge.x + 0.6, door.hinge.z - 0.6, door.hinge.y)).toBe(true);
    const screenAt = (x: number, z: number, y0: number, y1: number) => pb.boxes.some((p) => p.collide && p.noLedge && Math.abs(p.c[0] - x) <= p.s[0] / 2 + 0.01 && Math.abs(p.c[2] - z) <= p.s[2] / 2 + 0.01 && p.c[1] - p.s[1] / 2 <= y0 + 0.01 && p.c[1] + p.s[1] / 2 >= y1 - 0.01);
    for (const x of [22.5, 24, 26, 28.5, 29.5]) expect(screenAt(b5(x, 0).x, b5(0, 21).z, PLANT_Y + B5_METRICS.landing, PLANT_Y + B5_METRICS.landing + B5_METRICS.screen), `x ${x}`).toBe(true);
    expect(screenAt(b5(22, 0).x, b5(0, 22.4).z, PLANT_Y + B5_METRICS.landing, PLANT_Y + B5_METRICS.clear)).toBe(true);
    expect(screenAt(b5(27.2, 0).x, b5(0, 21).z, PLANT_Y + B5_METRICS.landing, PLANT_Y + B5_METRICS.landing + 1)).toBe(false);
    const nav = analyticNav(b, RECT, shut);
    expect(joins(nav, b5(25, 22.5, B5_METRICS.landing), b5(27.2, 13.4))).not.toBeNull();
    expect(B5_METRICS.landing).toBeGreaterThan(WALL_JUMP.maxUp);
  });

  it('the supply duct: entry from the AH platform (feet 2.2, caged ladder), ceiling exit over the records desk (a roll)', () => {
    const d = A.all.find((a) => a.id === c.anchors!['B6-duct'])!;
    if (d.kind !== 'duct') throw new Error('no duct');
    const feet = PLANT_Y + B6_METRICS.platform;
    const st = b6(24.75, 6);
    expect(topAt(st.x, st.z, feet)).toBe(true);
    expect(hyp2(st.x - d.entry.pos.x, st.z - d.entry.pos.z)).toBeLessThanOrEqual(1.1);
    expect(Math.abs(d.entry.pos.y - feet)).toBeLessThanOrEqual(1.4);
    expect(d.entry.nx).toBeGreaterThanOrEqual(0.3);
    expect(Math.abs(d.entry.pos.y - PLANT_Y)).toBeGreaterThan(1.4);
    // the platform is noLedge (no lip to boost or mantle onto): its caged ladder is the only way up (A51)
    expect(manual.concat(generated).some((l) => inBay('B6', l.a.x, l.a.z))).toBe(false);
    expect(d.exit.where).toBe('ceiling');
    expect(d.exit.pos.x).toBeGreaterThan(b6(12, 0).x);
    expect(d.exit.pos.x).toBeLessThan(b6(24, 0).x);
    expect(d.exit.pos.z).toBeLessThan(b6(0, 12).z);
    expect(landingKind(d.exit.pos.y - PLANT_Y)).toBe('roll');
    expect(topAt(d.exit.pos.x, d.exit.pos.z, PLANT_Y + B6_METRICS.desk)).toBe(true);
    expect(landingKind(d.exit.pos.y - PLANT_Y - B6_METRICS.desk)).toBe('roll');
    const blocked = pb.boxes.some((p) => p.collide && Math.abs(d.exit.pos.x - p.c[0]) < p.s[0] / 2 && Math.abs(d.exit.pos.z - p.c[2]) < p.s[2] / 2 && p.c[1] - p.s[1] / 2 < d.exit.pos.y - 0.05 && p.c[1] + p.s[1] / 2 > PLANT_Y + B6_METRICS.desk + 0.05);
    expect(blocked).toBe(false);
  });

  it('CR is 3.6 over the office floor behind its glazed front; its stair (behind RD2) lands on the enclosed landing', () => {
    expect(topAt(b6(19, 21.5).x, b6(0, 21.5).z, PLANT_Y + B6_METRICS.mezzanine)).toBe(true);
    expect(topAt(b6(17, 16).x, b6(0, 16).z, PLANT_Y)).toBe(true);
    const ramp = pb.boxes.find((p) => p.collide && Math.abs(p.pitch) > 1e-3 && Math.abs(p.c[0] - b6(11, 0).x) < 0.01 && p.c[2] > b6(0, 14).z && p.c[2] < b6(0, 20).z);
    expect(ramp).toBeDefined();
    expect(topAt(b6(11, 21).x, b6(0, 21).z, PLANT_Y + B6_METRICS.mezzanine)).toBe(true);
    const nav = analyticNav(b, RECT, b.anchors.doors.filter((d) => d.locked && d.id !== c.doors['B6-rd2']).map(doorLeaf));
    expect(joins(nav, b6(8, 13), b6(19, 21.5, B6_METRICS.mezzanine))).not.toBeNull();
  });

  it('S6: 33 risers of 0.182, going 0.28, 3.0 wide (stairs.ts layout) in S6; the doors open, A6 joins B6 through it', () => {
    const s6 = buildPlant(new LevelBuilder()).s6;
    expect(s6.flights.length).toBe(2);
    expect(s6.flights.reduce((n, f) => n + f.steps, 0)).toBe(S6_METRICS.risers);
    for (const f of s6.flights) {
      expect(f.rise / f.steps).toBeCloseTo(6 / 33, 5);
      expect(f.len / f.steps).toBeCloseTo(S6_METRICS.going, 5);
      expect(f.w).toBe(S6_METRICS.width);
    }
    expect(S6_RECT[0]).toBe(PLANT2_BOX.S6[0]);
    expect(S6_RECT[2]).toBe(PLANT2_BOX.S6[2]);
    expect(S6_RECT[1]).toBeGreaterThan(PLANT2_BOX.S6[1]);
    expect(S6_RECT[3]).toBeLessThan(S6_TOP_DOOR.z);
    const nav = analyticNav(b, [16, -41, 26, -12], [], 0.25);
    expect(joins(nav, plantAt2('A6', 3, 3), b6(9, 2.5))).not.toBeNull();
    expect(nav.heightAt(s6.foot[0], s6.foot[1], 0)).toBeLessThan(0.2);
    expect(nav.heightAt(s6.head[0], s6.head[1], PLANT_Y)).toBeCloseTo(PLANT_Y, 0);
  });

  it('per bay, the traversal anchors in the bay box are exactly the R2 graph set (an added ladder, lip or door fails)', () => {
    expect(anchorKinds(b, PLANT2_BOX.B5)).toEqual(B5_ANCHORS);
    expect(anchorKinds(b, PLANT2_BOX.B6)).toEqual(B6_ANCHORS);
    expect(anchorKinds(b, PLANT2_BOX.S6)).toEqual({ door: 1 });
  });

  // B5's room graph (BAYS 0.2 Proof): a guarded hall; EL's only way down is its stair, A5's door the mains gate
  const cells5: Record<string, { x: number; y: number; z: number }> = {
    A4: plantAt('A4', 3, 3), EL: b5(25, 22.5, B5_METRICS.landing), HALL: b5(12, 6), GEN: b5(14, 10.25, B5_METRICS.genset),
    CG: b5(8, 23.1, B5_METRICS.gallery), TR: b5(2.2, 13.4, -B5_METRICS.trenchDepth), SR: b5(27.5, 9), FB: b5(24.9, 5.2), A5: plantAt2('A5', 3, 3),
  };
  const links5: Link[] = [
    ['A4', 'EL', 'door', true], ['EL', 'HALL', 'stair', true], ['HALL', 'GEN', 'wall jump', false], ['GEN', 'HALL', 'fall', false],
    ['HALL', 'CG', 'ladder', true], ['CG', 'HALL', 'hang-drop', false], ['HALL', 'TR', 'trench w', true], ['HALL', 'TR', 'trench e', true],
    ['HALL', 'SR', 'door', true], ['HALL', 'FB', 'door', true], ['HALL', 'A5', 'mains door', true],
  ];

  it('B5: the nav keeps every cell apart (doors shut, the stair foot cut: EL screened, gallery, gensets and trench off the floor)', () => {
    const [sx, sz] = [b5(27.2, 0).x, b5(0, 14.6).z];
    const cut: NavBlocker = { cx: sx, cz: sz, hx: 0.85, hz: 0.3, yaw: 0, bottom: PLANT_Y - 0.1, top: PLANT_Y + 2 };
    expect(apart(analyticNav(b, RECT, [...allShut, cut]), cells5)).toEqual([]);
  });

  it('B5 with every door open (nav does not model doors): SR, FB, EL and the trench panels join the hall, the hall A5', () => {
    const nav = analyticNav(b, RECT, []);
    const bad = ['SR', 'FB', 'EL', 'A5'].filter((k) => !joins(nav, cells5.HALL!, cells5[k]!));
    expect(bad).toEqual([]);
  });

  it('R1 / R2, B5: A4 -> EL -> stair -> hall -> mains door -> A5; the stair and the mains gate are cuts', () => {
    const prev = reachGraph(links5, 'A4', [], true);
    expect(pathEls(prev, 'A4', 'A5')).toEqual(['door', 'stair', 'mains door']);
    for (const el of ['stair', 'mains door']) expect(reachGraph(links5, 'A4', [el], true).has('A5'), el).toBe(false);
  });

  // B6's room graph: RC's inner door is locked for good (no link); the manager's office is locked (no link)
  const cells6: Record<string, { x: number; y: number; z: number }> = {
    A5: plantAt2('A5', 3, 3), RC: b6(27, 15.5), AH: b6(27, 6.5), PL: b6(24.9, 6, B6_METRICS.platform), RE: b6(15, 4), CO: b6(8, 13),
    LK: b6(6, 19), OF: b6(17, 16.5), ST: b6(11, 21.5, B6_METRICS.mezzanine), CR: b6(19, 21.5, B6_METRICS.mezzanine), MG: b6(12, 22.5), MT: b6(4, 2), SV: b6(9, 2.5),
    LB: { x: 20.6, y: PLANT_Y, z: -17.75 }, S6: { x: 20.5, y: PLANT_Y, z: -19.1 }, A6: plantAt2('A6', 3, 3),
  };
  const links6: Link[] = [
    ['A5', 'RC', 'door', true], ['RC', 'AH', 'door', true], ['AH', 'PL', 'ladder', true], ['PL', 'RE', 'duct', false],
    ['RE', 'CO', 'rd1', true], ['CO', 'LK', 'door', true], ['CO', 'OF', 'door', true], ['CO', 'ST', 'rd2', true], ['ST', 'CR', 'door', true],
    ['CO', 'MT', 'rd3', true], ['MT', 'SV', 'rd4', true], ['SV', 'LB', 'exit', true], ['LB', 'S6', 's6 top', true], ['S6', 'A6', 'door', true],
  ];

  it('B6 / S6: the nav keeps every room apart (every door shut: walls wall to wall, glass fronts closed)', () => {
    expect(apart(analyticNav(b, RECT, allShut), cells6)).toEqual([]);
  });

  it('R1 / R2, B6: A5 -> RC -> AH -> duct -> RE -> CO -> MT -> SV -> S6 -> A6; the duct, readers and keypad are cuts', () => {
    const prev = reachGraph(links6, 'A5', [], true);
    expect(pathEls(prev, 'A5', 'A6')).toEqual(['door', 'door', 'ladder', 'duct', 'rd1', 'rd3', 'rd4', 'exit', 's6 top', 'door']);
    for (const el of ['duct', 'rd1', 'rd3', 'rd4', 'exit', 's6 top']) expect(reachGraph(links6, 'A5', [el], true).has('A6'), el).toBe(false);
    // the operator's line: CO -> RD2 -> CR and back; CR is a dead end but for its stair
    expect(reachGraph(links6, 'CR', ['rd2'], true).has('CO')).toBe(false);
  });
});

describe('Fallow nav seeds (T4 fix)', () => {
  it('the layout seeds the nav flood at every debug point and hide spot, and in B4 / B5 / B6', () => {
    const seeds = lay.navSeeds ?? [];
    const has = (p: { x: number; y: number; z: number }) => seeds.some((q) => Math.abs(q.x - p.x) < 1e-6 && Math.abs(q.y - p.y) < 1e-6 && Math.abs(q.z - p.z) < 1e-6);
    for (const d of lay.debugPoints ?? []) expect(has(d.pos), d.id).toBe(true);
    for (const h of lay.hideSpots ?? []) expect(has(h.pos)).toBe(true);
    for (const bay of ['B4', 'B5', 'B6'] as const) expect(lay.debugPoints!.some((d) => d.id === bay), bay).toBe(true);
  });
});

// ------------------------------------------------------------------------------------------------ T5: B7, A7, B8, A8, B9, L9

describe('Fallow (bunker) Deep level: House, Range, Plot (T5)', () => {
  const pb = new LevelBuilder();
  const play = bunker.build(pb, 0);
  generateLedges(pb.boxes, pb.anchors);
  const gaps = findSplitGaps(buildCoverSegments(pb.boxes, pb.cylinders));
  for (const g of gaps) pb.anchors.add<SplitAnchor>({ kind: 'split', ...g } as SplitAnchor);
  const A: TraversalAnchors = pb.anchors;
  const c = play.course!;
  const b7 = (x: number, z: number, y = 0) => deepAt('B7', x, z, y);
  const b8 = (x: number, z: number, y = 0) => deepAt('B8', x, z, y);
  const b9 = (x: number, z: number, y = 0) => deepAt('B9', x, z, y);
  /** The Deep bays in plan (B7 to L9, south of S6): y 0 to 14. */
  const inDeep = (x: number, z: number): boolean => z <= -38.5 || (x >= 135 && z <= -26.5);
  const genDeep = generated.filter((l) => l.top < 15 && inDeep(l.a.x, l.a.z) && inDeep(l.b.x, l.b.z));
  const lipOf = (id: string) => DEEP_LIPS.find((l) => l.id === id)!;
  const topAt = (x: number, z: number, y: number): boolean =>
    pb.boxes.some((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(p.pitch) < 1e-3 && Math.abs(p.c[1] + p.s[1] / 2 - y) < 0.01 && Math.abs(x - p.c[0]) <= p.s[0] / 2 - 0.05 && Math.abs(z - p.c[2]) <= p.s[2] / 2 - 0.05);
  const anchor = (id: string) => A.all.find((a) => a.id === c.anchors![id])!;
  const calm = { vyaw: 0, vCalm: true, los: true } as const;


  // the B9 floor, B-1 (west, south, east, key A's cabin), B-2 (west, east) and the bridge (local x, z, y)
  const b9pts: [string, number, number, number][] = [
    ['B-1 W', 6.5, 16, B9_METRICS.b1], ['B-1 S', 20, 6.5, B9_METRICS.b1], ['B-1 E', 37.5, 30, B9_METRICS.b1], ['key A', 3.6, 26, B9_METRICS.b1],
    ['B-2 W', 3, 24, B9_METRICS.b2], ['B-2 E', 40, 28, B9_METRICS.b2], ['bridge', 22, 42.5, B9_METRICS.b2],
  ];

  it('B9 stair towers (each alone, the other shut): plot floor -> B-1 -> B-2 and the bridge on a layered nav grid (0.25 and 0.5 cells)', () => {
    const o = b9(0, 0);
    const floor = b9(20, 20);
    for (const [tower, other] of [['SW', 42.2], ['SE', 0.6]] as const) {
      const shut = doorLeaf({ hinge: b9(other, 4), width: 1.2, height: 2.1, yaw: Math.PI / 2 });
      for (const cell of [0.25, 0.5]) {
        const nav = analyticNav(pb, [o.x - 1, o.z - 1, o.x + 45, o.z + 53], [shut], cell);
        for (const [n, x, z, y] of b9pts) {
          const p = b9(x, z);
          expect(nav.heightAt(p.x, p.z, y), `${tower} ${cell} ${n}`).toBeCloseTo(y, 1);
          expect(nav.findPath([floor.x, floor.z], [p.x, p.z], 400000, 0, y), `${tower} ${cell} ${n}`).not.toBeNull();
        }
      }
    }
  });

  it('B8 lane targets and barrels stand clear of every colliding piece', () => {
    const pts = [...B8_TARGETS, ...B8_BARRELS];
    expect(pts.length).toBe(20);
    for (const t of pts) {
      for (const y of [0.6, 1.0, 1.6]) {
        const hit = pb.boxes.find((p) => p.collide && insideBox(p, t.x, y, t.z, 0.25));
        expect(hit, `${t.x - b8(0, 0).x} ${t.z - b8(0, 0).z} y ${y}`).toBeUndefined();
      }
    }
  });

  it('every Deep door and floor device stands on a floor, clear of any tower, stair or ramp', () => {
    const ramps = pb.boxes.filter((p) => p.collide && Math.abs(p.pitch) > 1e-3);
    // a ramp (a stair's collision) more than a step over the point: it stands in the flight, not at its foot
    const onRamp = (x: number, z: number, y: number): boolean =>
      ramps.some((p) => {
        const u = (x - p.c[0]) * Math.sin(p.yaw) + (z - p.c[2]) * Math.cos(p.yaw);
        const v = (x - p.c[0]) * Math.cos(p.yaw) - (z - p.c[2]) * Math.sin(p.yaw);
        if (Math.abs(v) > p.s[0] / 2 || Math.abs(u) > (p.s[2] * Math.cos(p.pitch)) / 2) return false;
        const h = p.c[1] + (p.s[1] / 2) * Math.cos(p.pitch) + u * Math.tan(-p.pitch);
        return h > y + 0.45 && h - 0.35 < y + 1.8;
      });
    const floorAt = (x: number, z: number, y: number): boolean =>
      pb.boxes.some((p) => p.collide && Math.abs(p.pitch) < 1e-3 && Math.abs(p.c[1] + p.s[1] / 2 - y) < 0.02 && insideBox(p, x, p.c[1], z));
    const clear = (x: number, z: number, y: number): boolean => !pb.boxes.some((p) => p.collide && (insideBox(p, x, y + 0.5, z) || insideBox(p, x, y + 1.5, z)));
    const spots: [string, number, number, number][] = [];
    for (const d of A.doors) {
      if (!inDeep(d.hinge.x, d.hinge.z)) continue;
      const mx = d.hinge.x + (Math.sin(d.yaw) * d.width) / 2;
      const mz = d.hinge.z + (Math.cos(d.yaw) * d.width) / 2;
      // both sides; a side with no floor (the staff tunnel's far side, off the course) is skipped, never both
      const sides = [-0.6, 0.6].map((s) => [`door ${d.id} ${s}`, mx + Math.cos(d.yaw) * s, mz - Math.sin(d.yaw) * s, d.hinge.y] as [string, number, number, number]);
      const floored = sides.filter(([, x, z, y]) => floorAt(x, z, y));
      expect(floored.length, `door ${d.id}`).toBeGreaterThan(0);
      spots.push(...floored);
    }
    for (const [id, v] of Object.entries(c.devices)) if (inDeep(v.x, v.z)) spots.push([id, v.x, v.z, v.y]);
    for (const v of DEEP_DEVICES) if (v.kind === 'reinforce') spots.push([v.id, v.pos.x, v.pos.z, v.pos.y]);
    expect(spots.length).toBeGreaterThan(40);
    for (const [n, x, z, y] of spots) {
      expect(floorAt(x, z, y), `${n} floor`).toBe(true);
      expect(clear(x, z, y), `${n} clear`).toBe(true);
      expect(onRamp(x, z, y), `${n} ramp`).toBe(false);
    }
    // the staff tunnel door and its reinforcement point: on the plot floor, outside the SE tower (x 36..44, z 0..4)
    const rf = DEEP_DEVICES.find((v) => v.id === 'B9-REINF')!;
    expect(rf.local[1]).toBeGreaterThan(4.5);
    const tn = A.doors.find((d) => hyp2(d.hinge.x - b9(44, 5).x, d.hinge.z - b9(44, 5).z) < 0.01);
    expect(tn?.locked).toBe(true);
    expect(A.doors.some((d) => Math.abs(d.hinge.z - b9(0, 0).z) < 0.5 && d.hinge.x > b9(36, 0).x && d.hinge.y < 1)).toBe(false);
  });

  it('debug points B7, B7-roof, B8, B8-RT, B9, B9-B2, L9, A7, A8 stand on a floor', () => {
    for (const id of ['B7', 'B7-roof', 'B8', 'B8-RT', 'B9', 'B9-B2', 'L9', 'A7', 'A8']) {
      const d = play.debugPoints!.find((p) => p.id === id);
      expect(d, id).toBeDefined();
      expect(topAt(d!.pos.x, d!.pos.z, d!.pos.y), id).toBe(true);
    }
  });

  it('course stub: B7 store key -> store door (A7 near), B8 CS bolted from below and cease-fire, B9 keys, case and the two-key lift', () => {
    expect(() => validateCourse(c.def, layoutKnownIds(c))).not.toThrow();
    expect(c.def.airlocks.map((a) => a.id).slice(-2)).toEqual(['A7', 'A8']);
    const locked = new Set(pb.anchors.doors.filter((d) => d.locked).map((d) => d.id));
    for (const id of ['A7-near', 'A7-far', 'A8-near', 'A8-far', 'B8-cs', 'L9-door']) expect(locked.has(c.doors[id]!), id).toBe(true);
    const g7 = c.def.bays[6]!.gates;
    const g8 = c.def.bays[7]!.gates;
    const g9 = c.def.bays[8]!.gates;
    expect(g7).toContainEqual({ kind: 'flag', id: 'g-store', flag: 'store-key', doorId: 'A7-near' });
    expect(g7).toContainEqual({ kind: 'pickup', id: 'g-store-key', switchId: 'sw-store-key', flag: 'store-key', perPlayer: false });
    expect(g8.some((g) => g.kind === 'bolt' && g.doorId === 'B8-cs' && g.side[1] === -1)).toBe(true);
    expect(g9.filter((g) => 'doorId' in g && g.doorId === 'L9-door').map((g) => g.kind).sort()).toEqual(['flag', 'flag', 'flag', 'pair']);
    for (const k of ['sw-store-key', 'sw-cease-fire', 'pk-key-a', 'pk-key-b', 'pk-case', 'K-A', 'K-B', 'end']) expect(c.devices[k], k).toBeDefined();
    // automatic airlocks (R6): no Cycle panel devices
    for (const k of ['A7', 'A8']) expect(c.devices[k], k).toBeUndefined();
    // K-A and K-B 5 m apart in the lobby; the store-key switch on the first floor beside B7-O's desk
    expect(hyp2(c.devices['K-A']!.x - c.devices['K-B']!.x, c.devices['K-A']!.z - c.devices['K-B']!.z)).toBeCloseTo(5, 5);
    expect(c.devices['sw-store-key']!.y).toBe(B7_METRICS.firstFloor);
    // the lift car is closed but for its door: no window, duct, rope or zipline ends inside it
    const inCar = (x: number, z: number) => x > b9(18, 0).x && x < b9(26, 0).x && z > b9(0, 52).z;
    expect(A.windows.filter((w) => inCar(w.c.x, w.c.z))).toEqual([]);
    expect(A.ziplines.some((zz) => inCar(zz.b.x, zz.b.z)) || A.ducts.some((d) => inCar(d.exit.pos.x, d.exit.pos.z))).toBe(false);
  });

  it('every Deep lip is planned (DEEP_LIPS) and every planned lip exists; no split gap on the Deep level', () => {
    const stray = genDeep.filter((l) => !DEEP_LIPS.some((p) => inLip(l, p.box, p.top)));
    expect(stray.map((l) => [l.a, l.b, l.top])).toEqual([]);
    for (const p of DEEP_LIPS) expect(genDeep.some((l) => inLip(l, p.box, p.top)), p.id).toBe(true);
    expect(gaps.filter((g) => g.a.y < 15 && inDeep(g.a.x, g.a.z))).toEqual([]);
    expect(BUNKER_COOP_LIPS).toContain(B9_COOP_LIP);
  });

  it("WM: the water main 4.9 over B7-W's stop (8, 6): the drop takedown from the hang; inverted over the annex roof", () => {
    const wm = anchor('B7-main');
    if (wm.kind !== 'pipeH') throw new Error('no main');
    expect(wm.hangHeight).toBe(B7_METRICS.main);
    const s = b7(8, 6).x - wm.a.x;
    const hang = attachPose(wm, s, 1, 1.75, { x: 0, y: 0, z: 0, yaw: 0 }, 'hands');
    const v = b7(8, 6);
    const drop = pickTakedown({ state: 'pipe', ax: hang.x, ay: hang.y, az: hang.z, vx: v.x, vy: 0, vz: v.z, ...calm });
    expect(drop?.kind).toBe('drop');
    expect(hang.y).toBeGreaterThanOrEqual(TAKEDOWN.dropMin);
    // inverted: a guard on the annex roof's south edge (B7-R covers it) right under the knees
    const sx = b7(24, 6).x - wm.a.x;
    const inv = attachPose(wm, sx, 1, 1.75, { x: 0, y: 0, z: 0, yaw: 0 }, 'inverted');
    const t = pickTakedown({ state: 'inverted', ax: inv.x, ay: inv.y, az: inv.z, vx: b7(24, 6.5).x, vy: B7_METRICS.annex, vz: b7(24, 6.5).z, ...calm });
    expect(t?.kind).toBe('inverted');
    // the bench (3.0) and the annex roof (3.2) put the main in a standing grab
    for (const f of [B7_METRICS.bench, B7_METRICS.annex]) {
      expect(B7_METRICS.main - f).toBeLessThanOrEqual(REACH.grabMax);
      expect(B7_METRICS.main - f).toBeGreaterThan(REACH.grabMin + 0.05);
    }
  });

  it('AX: the annex roof 3.2 in the wall-jump window, kicked to from the cavern floor; the manager\'s window 0.9 over it', () => {
    const ax = lipOf('AX');
    expect(ax.top - ax.floor).toBeGreaterThanOrEqual(WALL_JUMP.minUp);
    expect(ax.top - ax.floor).toBeLessThanOrEqual(WALL_JUMP.maxUp);
    const south = generated.find((l) => inLip(l, ax.box, ax.top) && l.nz < -0.9)!;
    const st = b7(24, 5.3);
    expect(wallJumpReach(south, st.x, 0, st.z, 0, 1)).not.toBeNull();
    const win = A.windows.find((w) => Math.abs(w.sillHeight - B7_METRICS.sill) < 1e-6 && w.open);
    expect(win).toBeDefined();
    expect(win!.c.x).toBeGreaterThan(b7(20, 0).x);
    expect(win!.c.x).toBeLessThan(b7(28, 0).x);
    // a guard at the window (first floor) and the attacker on the annex roof: within the window takedown's height band
    expect(Math.abs(B7_METRICS.firstFloor - B7_METRICS.annex)).toBeLessThanOrEqual(0.6);
  });

  it('PR: from the hang on the parapet\'s south face at (30, 10) the ledge pull takes a guard on the roof behind it', () => {
    const pr = lipOf('PR');
    const south = generated.find((l) => inLip(l, pr.box, pr.top) && l.nz < -0.9 && l.a.z < b7(0, 9.9).z)!;
    expect(south).toBeDefined();
    const s = (b7(30, 0).x - south.a.x) * south.tx;
    const h = hangPoint(south, Math.abs(s));
    const v = b7(30, 10.45, B7_METRICS.roof);
    const dy = v.y - h.y;
    expect(dy).toBeGreaterThanOrEqual(0.9);
    expect(dy).toBeLessThanOrEqual(2.5);
    const t = pickTakedown({ state: 'hang', ax: h.x, ay: h.y, az: h.z, vx: v.x, vy: v.y, vz: v.z, ...calm });
    expect(t?.kind).toBe('below');
  });

  it('B9 boost gap 4.5 (co-op lip): out of solo and human-ladder reach; the boost from a mate braced on the pier takes it; no other 3.8-4.5 lip', () => {
    const l = B9_COOP_LIP;
    expect(l.top - l.floor).toBeGreaterThan(WALL_JUMP.maxUp + 0.5);
    expect(l.top - l.floor).toBeGreaterThan(TEAM.ladderGrab + 0.2);
    expect(l.top - l.floor).toBeLessThanOrEqual(TEAM.boostMax);
    // teamController.boostTarget: the mate's back to the pier (0.5 off its face), the toss over them into the wall
    for (const z of [37.6, 38, 38.4]) {
      const m = b9(8.5, z);
      const yaw = Math.PI / 2;
      const apex = { x: m.x, y: m.y + TEAM.boostMax - 1.15, z: m.z };
      const t = findJumpTarget(A, apex, -1, -Math.sin(yaw), -Math.cos(yaw), 1, 2.2, 0.2);
      expect(t, `z ${z}`).not.toBeNull();
      expect(inLip(t!.anchor as Ledge, l.box, l.top), `z ${z}`).toBe(true);
      expect(t!.grip.y - m.y).toBeLessThanOrEqual(TEAM.boostMax);
      expect(t!.grip.y - m.y).toBeGreaterThanOrEqual(2.4);
      // the brace wall behind (TEAM.wallBehind): the pier's face at x 8
      expect(pb.boxes.some((p) => p.collide && Math.abs(p.c[0] + p.s[0] / 2 - b9(8, 0).x) < 1e-6 && Math.abs(m.z - p.c[2]) <= p.s[2] / 2 && p.c[1] - p.s[1] / 2 <= 0.01)).toBe(true);
    }
    const floors = [0, B9_METRICS.b1, B9_METRICS.b2];
    const inB9 = (x: number, z: number) => x >= b9(0, 0).x - 0.5 && z >= b9(0, 0).z - 0.5 && z <= b9(0, 58).z;
    const band = genDeep.filter((g) => inB9(g.a.x, g.a.z) && floors.some((f) => g.top - f >= 3.8 && g.top - f <= 4.5));
    expect(band.filter((g) => !inLip(g, l.box, l.top)).map((g) => [g.a, g.b, g.top])).toEqual([]);
  });

  it('RP: the bridge rope 9.0 to the plot floor; ZP: B-2 east (cable 2.5 over it) to the lobby (end 1.9 over its floor), the ride clears every piece', () => {
    const rp = anchor('B9-rappel');
    if (rp.kind !== 'rappel') throw new Error('no rope');
    expect(rp.top.y - rp.length).toBe(0);
    expect(topAt(rp.top.x + rp.nx * 0.5, rp.top.z + rp.nz * 0.5, 0)).toBe(true);
    expect(topAt(rp.top.x - rp.nx * 0.3, rp.top.z - rp.nz * 0.3, B9_METRICS.b2)).toBe(true);
    const z = anchor('B9-zipline');
    if (z.kind !== 'zipline') throw new Error('no zipline');
    expect(z.a.y - B9_METRICS.b2).toBeGreaterThanOrEqual(1.5);
    expect(z.a.y - B9_METRICS.b2).toBeLessThanOrEqual(2.6);
    expect(z.b.y - HANG.drop).toBeCloseTo(0, 5);
    expect(z.b.x).toBeGreaterThan(b9(18, 0).x);
    expect(z.b.x).toBeLessThan(b9(26, 0).x);
    expect(z.b.z).toBeGreaterThan(b9(0, 44).z);
    const st = b9(39.3, 22, B9_METRICS.b2);
    expect(topAt(st.x, st.z, st.y)).toBe(true);
    expect(hyp2(st.x - z.a.x, st.z - z.a.z)).toBeLessThanOrEqual(REACH.zip);
    const len = hyp2(z.b.x - z.a.x, z.b.z - z.a.z);
    for (let d = 0.3; d < len - 0.3; d += 0.1) {
      const t = d / len;
      const x = z.a.x + (z.b.x - z.a.x) * t;
      const zz = z.a.z + (z.b.z - z.a.z) * t;
      const feet = z.a.y + (z.b.y - z.a.y) * t - HANG.drop;
      const hit = pb.boxes.find((p) => p.collide && Math.abs(p.yaw) < 1e-3 && Math.abs(x - p.c[0]) < p.s[0] / 2 + 0.3 && Math.abs(zz - p.c[2]) < p.s[2] / 2 + 0.3 && p.c[1] + p.s[1] / 2 > feet && p.c[1] - p.s[1] / 2 < feet + 1.75);
      expect(hit ? [d.toFixed(1), hit.c, hit.s] : null).toBeNull();
    }
  });

  it('the message-tube duct: entry from the key A cabin (grate within reach), a wall exit into the lift lobby', () => {
    const d = anchor('B9-duct');
    if (d.kind !== 'duct') throw new Error('no duct');
    const feet = b9(1.0, 30.5, B9_METRICS.b1);
    expect(topAt(feet.x, feet.z, feet.y)).toBe(true);
    expect(hyp2(d.entry.pos.x - feet.x, d.entry.pos.z - feet.z)).toBeLessThanOrEqual(1.1);
    expect(Math.abs(d.entry.pos.y - feet.y)).toBeLessThanOrEqual(1.4);
    expect(d.entry.where).toBe('wall');
    expect(d.exit.where).toBe('wall');
    expect(d.exit.pos.x).toBeCloseTo(b9(18.15, 0).x, 5);
    expect(d.exit.pos.z).toBeGreaterThan(b9(0, 44).z);
    expect(topAt(d.exit.pos.x + 0.6, d.exit.pos.z, 0)).toBe(true);
  });

  it('ladders on the Deep level (roof hatch, bench, RT, scaffold) top out on a floor (the real step-off)', () => {
    const lads = A.ladders.filter((l) => inDeep(l.base.x, l.base.z));
    expect(lads.length).toBe(4);
    for (const l of lads) {
      const ex = l.top.x + Math.sin(l.facing) * 0.2;
      const ez = l.top.z + Math.cos(l.facing) * 0.2;
      expect(topAt(ex, ez, l.top.y), `${l.base.x} ${l.base.z}`).toBe(true);
    }
  });

  it('B8: catwalk 4.0, scaffold 3.0, CS door at the stair foot with no way round it (caged to 7.0)', () => {
    expect(topAt(b8(30, 30).x, b8(30, 30).z, B8_METRICS.catwalk)).toBe(true);
    expect(topAt(b8(58, 20).x, b8(58, 20).z, B8_METRICS.scaffold)).toBe(true);
    const cs = A.doors.find((d) => d.id === c.doors['B8-cs'])!;
    expect(cs.locked).toBe(true);
    // the stair's landing is reached only from the catwalk or through CS: the cage walls stand 7.0 on both sides
    const cage = pb.boxes.filter((p) => p.collide && p.c[1] + p.s[1] / 2 >= 7 - 1e-6 && Math.abs(p.c[2] - b8(0, 26.7).z) < 4.5 && p.c[0] > b8(57, 0).x && p.c[0] < b8(62, 0).x);
    expect(cage.length).toBeGreaterThanOrEqual(2);
  });

  // NavGrid ignores doors and models no ladders / ropes, so the course order is checked on a graph: each bay and
  // airlock (BAYS 0 plan rects) is a node; a door joins the rooms on its two sides; an anchor whose ends lie in two
  // rooms joins them (unless an anchorLock gate holds it). Inside a bay every floor is taken as joined (the bay tests).
  it('reachability: with every course door open the way from B1 to L9 enters B1..B9 in order; as built nothing leaves B1', () => {
    const rooms: [string, number, number, number, number][] = [
      // T5d-T5f: B1 to A6 at their v2 offsets; until T5g the v1 Deep stands moved by (+17.5, -29) (A74)
      ['B1', 0, 60, 20, 14.4], ['A1', 1, 54, 6, 6], ['B2', 7, 49.5, 52, 9], ['A2', 59, 50, 6, 6], ['B3', 65, 46, 14, 14],
      ['A3', 69, 40, 6, 6], ['B4', 66, 14, 12, 26], ['A4', 70, 8, 6, 6], ['B5', 48, -16, 30, 24], ['A5', 42, -7, 6, 6],
      ['B6', 12, -17, 30, 24], ['S6', 19, -33, 3, 16], ['A6', 17.5, -39, 6, 6], ['B7', 17.5, -79, 44, 40], ['A7', 61.5, -62, 6, 6],
      ['B8', 67.5, -75, 62, 32], ['A8', 129.5, -62, 6, 6], ['B9', 135.5, -85, 44, 52], ['L9', 153.5, -33, 8, 6],
    ];
    const room = (x: number, z: number): string | null => rooms.find(([, x0, z0, w, d]) => x > x0 && x < x0 + w && z > z0 && z < z0 + d)?.[0] ?? null;
    const held = new Set(c.def.bays.flatMap((bay) => bay.gates).flatMap((g) => (g.kind === 'anchorLock' ? [c.anchors![g.anchorId]!] : [])));
    const edges = (open: boolean): [string, string][] => {
      const out: [string, string][] = [];
      const link = (p: { x: number; z: number }, q: { x: number; z: number }) => {
        const a = room(p.x, p.z);
        const e = room(q.x, q.z);
        if (a && e && a !== e) out.push([a, e]);
      };
      for (const d of A.doors) {
        if (d.locked && !open) continue;
        const mx = d.hinge.x + (Math.sin(d.yaw) * d.width) / 2;
        const mz = d.hinge.z + (Math.cos(d.yaw) * d.width) / 2;
        const nx = Math.cos(d.yaw);
        const nz = -Math.sin(d.yaw);
        link({ x: mx + nx * 0.8, z: mz + nz * 0.8 }, { x: mx - nx * 0.8, z: mz - nz * 0.8 });
      }
      for (const a of A.all) {
        if (!open && held.has(a.id)) continue;
        if (a.kind === 'ladder' || a.kind === 'pipeV') link(a.base, a.top);
        else if (a.kind === 'zipline') link(a.a, a.b);
        else if (a.kind === 'duct') link(a.path[0]!, a.path[a.path.length - 1]!);
        else if (a.kind === 'rappel') link(a.top, { x: a.top.x + a.nx * 0.5, z: a.top.z + a.nz * 0.5 });
        else if (a.kind === 'window') link({ x: a.c.x + Math.sin(a.yaw) * 0.8, z: a.c.z + Math.cos(a.yaw) * 0.8 }, { x: a.c.x - Math.sin(a.yaw) * 0.8, z: a.c.z - Math.cos(a.yaw) * 0.8 });
      }
      return out;
    };
    const route = (open: boolean, to: string): string[] | null => {
      const es = edges(open);
      const prev = new Map<string, string>([['B1', '']]);
      const q = ['B1'];
      while (q.length > 0) {
        const n = q.shift()!;
        for (const [a, e] of es) {
          const m = a === n ? e : e === n ? a : null;
          if (m && !prev.has(m)) {
            prev.set(m, n);
            q.push(m);
          }
        }
      }
      if (!prev.has(to)) return null;
      const path = [to];
      while (path[0] !== 'B1') path.unshift(prev.get(path[0]!)!);
      return path;
    };
    const path = route(true, 'L9');
    expect(path).toEqual(['B1', 'A1', 'B2', 'A2', 'B3', 'A3', 'B4', 'A4', 'B5', 'A5', 'B6', 'S6', 'A6', 'B7', 'A7', 'B8', 'A8', 'B9', 'L9']);
    // the bays form one chain: every bay meets only its own airlocks (no side way skips a bay)
    const es = edges(true);
    const order = path!;
    for (const [a, e] of es) expect(Math.abs(order.indexOf(a) - order.indexOf(e)), `${a}-${e}`).toBe(1);
    for (const r of rooms.map((x) => x[0]).filter((x) => x !== 'B1')) expect(route(false, r), r).toBeNull();
  });

  // The graph above takes every floor in a bay as joined; this floods the floors themselves (the game's nav lattice)
  // with every locked door shut: no bay or airlock floor on the Plant or Deep level walks into another one.
  it('nav flood (Plant and Deep levels, locked doors shut): no bay or airlock floor reaches another', () => {
    const shut = A.doors.filter((d) => d.locked).map(doorLeaf);
    const nav = analyticNav(pb, [-1, -86, 181, 9], shut);
    const ids = ['B5', 'A5', 'B6', 'S6', 'A6', 'B7', 'A7', 'B8', 'A8', 'B9', 'L9'];
    const seeds = ids.map((id) => play.debugPoints!.find((d) => d.id === id)!);
    for (const sd of seeds) expect(nav.heightAt(sd.pos.x, sd.pos.z, sd.pos.y), sd.id).toBeCloseTo(sd.pos.y, 1);
    const joined: string[] = [];
    for (let i = 0; i < seeds.length; i++) {
      for (let k = i + 1; k < seeds.length; k++) {
        const p = seeds[i]!.pos;
        const q = seeds[k]!.pos;
        if (nav.findPath([p.x, p.z], [q.x, q.z], 1e6, p.y, q.y)) joined.push(`${seeds[i]!.id}-${seeds[k]!.id}`);
      }
    }
    expect(joined).toEqual([]);
  });
});
