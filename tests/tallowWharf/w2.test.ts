/**
 * Tallow Wharf GB2: W2, the arcade lofts. Sizes against the graph, the C3 boost / pull / rope, the throws (J8 G2: the pawn and
 * lane throws are 5.8 m site throws over 4.9 m gaps, the pie throw a standard 2.5 m throw), the throws forced by height, the
 * north range cut off by its screens, the fire-escape cage's W3 end, no solo jump onto C3's lips, only the planned lip, the
 * solo-nav bypass checks (bolted doors shut, the clock-mender's door locked), the tank room, the lights (LIGHT.md section 3),
 * hide spots, the medkit, the vantages, cover and desks clear of the doors, and the west downpipe (E11).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../../src/world/levelBuilder';
import { MOVEMENT, TEAM, WALL_JUMP } from '../../src/config/movement';
import { hyp2 } from '../../src/core/mathx';
import { THROW_SITE_REACH } from '../../src/game/teamMoves';
import { contribution, type LightDef } from '../../src/world/lights';
import { CHEST_Y, HEAD_Y } from '../../src/world/lighting/levels';
import { lampReach } from '../../src/world/lampMath';
import type { ThrowSite } from '../../src/world/mapDef';
import { tallowWharf } from '../../src/world/maps/tallowWharf';
import { DOWNPIPE, W2, W2_CONDUITS, W2_DESKS, W2_DOWNPIPE_LIP } from '../../src/world/maps/tallowWharfW2';
import { WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';
import { SECTION_BOX, type WharfThrow } from '../../src/world/maps/tallowWharfKit';
import { soloTopLandingThreats, type CoopTop } from '../helpers/soloJumpReach';
import {
  anchorsOf,
  builtWharf,
  climbRoom,
  COOP_BAND,
  downHit,
  GREY_KEEP_CLEAR,
  legUpTarget,
  linksOf,
  onPlannedLip,
  pullCheck,
  roomForBoost,
  ropeCheck,
  soloJumpThreats,
  soloLevelThreats,
  soloNav,
  solidOf,
  space,
  spacesIn,
  throwCheck,
  type ShutDoor,
  type ThrowReport,
} from './helpers';

const { b, layout } = builtWharf();
const solid = solidOf(b);
const SITES: readonly ThrowSite[] | null = layout.throwSites ?? null;
const top = (p: BoxPiece): number => p.c[1] + p.s[1] / 2;
const bottom = (p: BoxPiece): number => p.c[1] - p.s[1] / 2;
const inW2 = (x: number, z: number): boolean => x >= SECTION_BOX.W2[0] && x <= SECTION_BOX.W2[2] && z >= SECTION_BOX.W2[1] && z <= SECTION_BOX.W2[3];
const throwOf = (id: string): WharfThrow => W2.throws.find((q) => q.id === id)!;
/** The collide piece holding (x, y, z), or undefined. */
const pieceAt = (x: number, y: number, z: number): BoxPiece | undefined => solid.find((p) => Math.abs(x - p.c[0]) < p.s[0] / 2 && Math.abs(y - p.c[1]) < p.s[1] / 2 && Math.abs(z - p.c[2]) < p.s[2] / 2);
/** The plan gap between two rectangles [x0, z0, x1, z1]. */
const planGap = (a: readonly number[], c: readonly number[]): number => hyp2(Math.max(0, a[0]! - c[2]!, c[0]! - a[2]!), Math.max(0, a[1]! - c[3]!, c[1]! - a[3]!));
/** The W2 guards (`WHARF_SECTORS[1].guards`): posts and route points with their floor. */
const W2_GUARDS = WHARF_SECTORS[1]!.guards;
const guardPoints = (): { x: number; z: number; y: number; who: string }[] =>
  W2_GUARDS.flatMap((g, k) => [{ x: g.x, z: g.z, y: g.y ?? 0, who: `W2:${k} post` }, ...(g.route ?? []).map((r, i) => ({ x: r[0], z: r[1], y: g.y ?? 0, who: `W2:${k} route ${i}` }))]);

/** Ambient + the brighter of the chest and head sums of `contribution` over `ls`, capped at 1 (LIGHT.md section 1 rule 3). */
const levelAt = (ls: readonly LightDef[], ambient: number, x: number, floorY: number, z: number): number => {
  let chest = 0;
  let head = 0;
  for (const l of ls) {
    chest += contribution(l, x, floorY + CHEST_Y, z);
    head += contribution(l, x, floorY + HEAD_Y, z);
  }
  return Math.min(1, ambient + Math.max(chest, head));
};
const W2_LAMPS = b.lights.lights.filter((l) => inW2(l.x, l.z));
const lampsOf = (...gs: number[]): LightDef[] => W2_LAMPS.filter((l) => gs.includes(l.group));

/** The segment from an eye to a target, sampled every 0.05 m and stopped 0.3 m short: the first collide piece it meets (null: clear). */
const sightBlock = (e: readonly [number, number, number], t: readonly [number, number, number]): string | null => {
  const len = hyp2(hyp2(t[0] - e[0], t[2] - e[2]), t[1] - e[1]);
  const n = Math.max(1, Math.floor((len - 0.3) / 0.05));
  for (let i = 0; i <= n; i++) {
    const f = (i * 0.05) / len;
    const x = e[0] + (t[0] - e[0]) * f;
    const y = e[1] + (t[1] - e[1]) * f;
    const z = e[2] + (t[2] - e[2]) * f;
    const p = pieceAt(x, y, z);
    if (p) return `(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}): box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})`;
  }
  return null;
};

/** The bypass test's shut list (J8 G2): every bolted door shut and the clock-mender's door locked. */
const SHUT = {
  pawnStairFoot: { at: [53, 62], y: 0, w: 1.2, alongX: true },
  pieStairTop: { at: [57.8, 69], y: 4.5, w: 1.2, alongX: false },
  pawnTakingIn: { at: [51.2, 67.45], y: 4.5, w: 2.0, alongX: true },
  pieTakingIn: { at: [63, 70], y: 4.5, w: 2.0, alongX: true },
  bridgeWest: { at: [44.75, 67.45], y: 4.5, w: 1.2, alongX: true },
  bridgeEast: { at: [69.25, 70], y: 4.5, w: 1.2, alongX: true },
  stairHead: { at: [55, 73.5], y: 4.5, w: 1.2, alongX: true },
  clockDoor: { at: [60, 76.75], y: 4.5, w: 1.2, alongX: false },
} satisfies Record<string, ShutDoor>;
const ALL_SHUT: ShutDoor[] = Object.values(SHUT);

describe('W2: sizes against the graph', () => {
  /** The listed deviation from the graph's area: the pawn loft is cut back to z 67.6 (M2, A28). */
  const OVERRIDE: Record<string, [number, number, number, number]> = { 'w2-pawn-loft': [44, 62, 54, 67.6] };

  it('has the nine graph spaces, each room matching its area (the pawn loft is the listed cut-back) and storey', () => {
    expect(W2.rooms).toHaveLength(9);
    const spaces = spacesIn('W2');
    expect(spaces).toHaveLength(9);
    for (const s of spaces) {
      const r = W2.rooms.find((q) => q.id === s.id);
      expect(r, s.id).toBeDefined();
      const [x0, z0, x1, z1] = OVERRIDE[s.id] ?? s.area[0]!;
      expect(r!.minX, s.id).toBeCloseTo(x0, 2);
      expect(r!.maxX, s.id).toBeCloseTo(x1, 2);
      expect(r!.minZ, s.id).toBeCloseTo(z0, 2);
      expect(r!.maxZ, s.id).toBeCloseTo(z1, 2);
      expect(r!.minY, s.id).toBe(s.storey);
    }
    for (const id of Object.keys(OVERRIDE)) expect(W2.deviations.some((d) => d.space === id && d.why.includes('A28')), id).toBe(true);
    // a ground space is banded under the lofts; every deviation has a reason
    for (const id of ['w2-arcade', 'w2-pie-shop']) expect(W2.rooms.find((q) => q.id === id)!.maxY).toBe(4.4);
    expect(W2.deviations.length).toBeGreaterThan(0);
    for (const d of W2.deviations) expect(d.why.length, d.space).toBeGreaterThan(10);
    // every room lies inside the section box
    for (const r of W2.rooms) expect(inW2(r.minX, r.minZ) && inW2(r.maxX, r.maxZ), r.id).toBe(true);
  });

  it('every nav seed stands on a floor at its height, and the entry and exit do too', () => {
    const pts = [...W2.navSeeds.map((v) => ({ x: v.x, y: v.y, z: v.z })), { x: W2.entry[0], y: W2.entry[1], z: W2.entry[2] }, { x: W2.exit[0], y: W2.exit[1], z: W2.exit[2] }];
    for (const p of pts) {
      const f = downHit(solid, p.x, p.y + 1, p.z, p.y - 0.3);
      expect(Number.isFinite(f) && Math.abs(f - p.y) < 0.05, `(${p.x}, ${p.y}, ${p.z}) floor ${f}`).toBe(true);
    }
  });
});

describe('W2: C3, the walkway (boost, pull, rope)', () => {
  it('boost: the pier lip is in the band, the leg-up finds it, and the booster has room', () => {
    expect(W2.lips).toHaveLength(1);
    const lip = W2.lips[0]!;
    expect(lip.id).toBe('w2-lip-pier');
    expect(lip.y - lip.floor).toBeGreaterThanOrEqual(COOP_BAND.min - 1e-6);
    expect(lip.y - lip.floor).toBeLessThanOrEqual(COOP_BAND.max + 1e-6);
    const u = W2.legUps.find((l) => l.lip === lip.id)!;
    const t = legUpTarget(anchorsOf(b), u, u.facing);
    expect(t).not.toBeNull();
    const l = t!.anchor as { kind: string; canClimbUp: boolean; top: number; nx: number; nz: number };
    expect(l.kind).toBe('ledge');
    expect(l.canClimbUp).toBe(true);
    expect(Math.abs(l.top - lip.y)).toBeLessThan(1e-6);
    expect(l.nx * lip.n.x + l.nz * lip.n.z).toBeGreaterThan(0.99);
    expect(roomForBoost(solid, u, u.facing)).toBe(true);
    // the spot is on the lip's approach side, 0.5 m off the pier's face
    expect(Math.abs(u.z - (lip.a.z + lip.n.z * 0.5))).toBeLessThan(1e-9);
    // the climb-up off the lip has a standing body's room inside the face (AttachController.climbRoom)
    expect(climbRoom(solid, lip)).toEqual([]);
  });

  it('pull: pullCheck is ok for the east lip (band 4.5, an open edge, the catch point in reach)', () => {
    expect(W2.pulls).toHaveLength(1);
    const p = W2.pulls[0]!;
    expect(p.id).toBe('w2-pull-east');
    const r = pullCheck(solid, p);
    expect(r.band).toBe('ok');
    expect(r.hang).not.toBeNull();
    expect(r.partnerReach).toBe(true);
    expect(r.holderOk).toBe(true);
    expect(r.ok).toBe(true);
    // the balustrade gap x 72.5-74.5 is the open edge; the balustrade closes the rest
    expect(r.hang!.x).toBeGreaterThan(72.5);
    expect(r.hang!.x).toBeLessThan(74.5);
  });

  it('rope: ropeCheck is ok for the west pier (4.5 within 2.2-6.0)', () => {
    expect(W2.ropes).toHaveLength(1);
    const r = ropeCheck(solid, W2.ropes[0]!);
    expect(W2.ropes[0]!.id).toBe('w2-rope-pier');
    expect(r.room).toBe('ok');
    expect(r.reach).toBe(true);
    expect(r.hang).not.toBeNull();
    expect(r.ok).toBe(true);
  });
});

describe('W2: the throws (C4 lightwell x2, C5 lane; M2, A4, A24)', () => {
  /** The body (0.3 m, the radius) lies inside the stage on every side of the landing. */
  const bodyInside = (r: ThrowReport, s: readonly number[]): boolean =>
    r.land.x - 0.3 >= s[0]! - 1e-6 && r.land.x + 0.3 <= s[2]! + 1e-6 && r.land.z - 0.3 >= s[1]! - 1e-6 && r.land.z + 0.3 <= s[3]! + 1e-6;
  /** A thrower moved to (x, z) with the runner moved with them (the same run-up along the throw). */
  const moved = (t: WharfThrow, x: number, z: number): WharfThrow => ({
    ...t,
    thrower: { ...t.thrower, x, z },
    runner: { ...t.runner, x: t.runner.x + (x - t.thrower.x), z: t.runner.z + (z - t.thrower.z) },
  });

  it('has the three throws; the pawn and lane throws carry the 5.8 m site length, the pie throw none (the standard throw)', () => {
    expect(W2.throws.map((t) => t.id)).toEqual(['w2-throw-pawn', 'w2-throw-pie', 'w2-throw-lane']);
    expect(W2.throws.map((t) => t.dist)).toEqual([5.8, undefined, 5.8]);
    expect(throwOf('w2-throw-pawn')).toMatchObject({ thrower: { x: 51.2, y: 4.5, z: 67.2 }, runner: { x: 51.2, y: 4.5, z: 65.9 }, stage: [50.2, 72.5, 52.2, 73.5] });
    expect(throwOf('w2-throw-lane')).toMatchObject({ thrower: { x: 76.7, y: 8.4, z: 66 }, runner: { x: 75.1, y: 8.4, z: 66 }, stage: [82, 64.5, 86.5, 67.5] });
  });

  for (const [id, dist] of [['w2-throw-pawn', 5.8], ['w2-throw-pie', TEAM.throwDist], ['w2-throw-lane', 5.8]] as const) {
    it(`${id}: with the map's sites, a ${dist} m throw: throwLandingOk, floor within throwDrop, head room, clear arc, clear air over the thrower, the body inside the stage`, () => {
      const t = throwOf(id);
      // (the lane throw lands on W3's real corner-bay roof: the merged map has every section, no stand-in)
      const r = throwCheck(solid, t, SITES);
      console.info(`W2 ${id}: dist ${r.dist}, landing (${r.land.x.toFixed(2)}, ${r.land.z.toFixed(2)}), floor ${r.floorY}, head ${r.head.toFixed(2)}`);
      expect(r.dist).toBeCloseTo(dist, 9);
      expect(r.ok).toBe(true);
      expect(Math.abs(r.floorY - t.thrower.y)).toBeLessThanOrEqual(TEAM.throwDrop);
      expect(r.head).toBeGreaterThanOrEqual(1.2);
      expect(r.arcClear).toBe(true);
      expect(r.upClear).toBe(true);
      expect(r.room).toBe('ok');
      expect(bodyInside(r, t.stage)).toBe(true);
    });
  }

  it('the gaps: pawn 72.5 - 67.6 = 4.9 and lane 82 - 77.1 = 4.9 (forced, M2); the stages are iron slabs with open air under them', () => {
    // the pawn loft floor ends at z 67.6 (the take-off edge), the lane landing at x 77.1
    expect(downHit(solid, 51.2, 5, 67.55, 4)).toBeCloseTo(4.5, 9);
    expect(Number.isFinite(downHit(solid, 51.2, 5, 67.65, 3.0))).toBe(false);
    expect(downHit(solid, 77.05, 9, 66, 8)).toBeCloseTo(8.4, 9);
    expect(Number.isFinite(downHit(solid, 77.15, 9, 66, 6.9))).toBe(false);
    expect(throwOf('w2-throw-pawn').stage[1] - 67.6).toBeCloseTo(4.9, 9);
    expect(throwOf('w2-throw-lane').stage[0] - 77.1).toBeCloseTo(4.9, 9);
    // the stages are iron slabs at the loft height, 0.2 thick, with open air under them (nothing solid at y 1-4 beneath)
    for (const s of [throwOf('w2-throw-pawn').stage, throwOf('w2-throw-pie').stage]) {
      const cx = (s[0] + s[2]) / 2;
      const cz = (s[1] + s[3]) / 2 - 0.3;
      expect(solid.some((p) => bottom(p) < 4 && top(p) > 1 && Math.abs(p.c[0] - cx) < p.s[0] / 2 && Math.abs(p.c[2] - cz) < p.s[2] / 2)).toBe(false);
      expect(downHit(solid, cx, 5, cz, 4)).toBeCloseTo(4.5, 9);
    }
  });

  it('the pie throw: not yet forced (M2, plank later): the standard throw works and the gap is 2.5 m (the door plane z 70 to the stage z 72.5)', () => {
    const t = throwOf('w2-throw-pie');
    expect(t.dist).toBeUndefined();
    expect(t.stage[1] - 70).toBeCloseTo(2.5, 9);
    const r = throwCheck(solid, t, SITES);
    expect(r.ok && r.room === 'ok').toBe(true);
  });

  it('the thrower\'s marks: a thrower at z 67.0 and 67.3 (pawn) and at x 76.5 and 76.8 (lane) lands with the body 0.3 m inside the stage', () => {
    const cases: [string, number, number][] = [
      ['w2-throw-pawn', 51.2, 67.0],
      ['w2-throw-pawn', 51.2, 67.3],
      ['w2-throw-lane', 76.5, 66],
      ['w2-throw-lane', 76.8, 66],
    ];
    for (const [id, x, z] of cases) {
      const t = throwOf(id);
      const r = throwCheck(solid, { ...t, thrower: { ...t.thrower, x, z } }, SITES);
      expect(r.dist, `${id} (${x}, ${z})`).toBeCloseTo(5.8, 9);
      expect(r.ok && r.room === 'ok', `${id} (${x}, ${z})`).toBe(true);
      expect(bodyInside(r, t.stage), `${id} (${x}, ${z}) lands (${r.land.x.toFixed(2)}, ${r.land.z.toFixed(2)})`).toBe(true);
    }
    // the marks themselves: visual-only 0.01 boxes in #c9b458 under the thrower spots
    const marks = b.boxes.filter((p) => p.color === '#c9b458' && p.c[0] > 40 && p.c[0] < 82 && p.c[2] > 48 && p.c[2] < 80);
    expect(marks.map((p) => [p.c[0] - p.s[0] / 2, p.c[2] - p.s[2] / 2, p.c[0] + p.s[0] / 2, p.c[2] + p.s[2] / 2].map((v) => +v.toFixed(3)))).toEqual([
      [50.9, 67.0, 51.5, 67.3],
      [76.5, 65.7, 76.85, 66.3],
    ]);
    for (const p of marks) {
      expect(p.collide).toBe(false);
      expect(p.s[1]).toBeCloseTo(0.01, 9);
    }
  });

  it('the site reach (TD-a polish 5): a thrower at the mark or at a 0.99 m reach edge either lands with the body 0.3 m inside the stage, lands on the stage, or is refused; none lands on a floor outside the stage', () => {
    const e = THROW_SITE_REACH - 0.01;
    const out: string[] = [];
    const bad: string[] = [];
    for (const id of ['w2-throw-pawn', 'w2-throw-lane']) {
      const t = throwOf(id);
      const s = t.stage;
      for (const [name, dx, dz] of [['mark', 0, 0], ['+x', e, 0], ['-x', -e, 0], ['+z', 0, e], ['-z', 0, -e]] as const) {
        const x = t.thrower.x + dx;
        const z = t.thrower.z + dz;
        const r = throwCheck(solid, moved(t, x, z), SITES);
        // can the thrower stand there (a floor at the thrower's height under the spot)?
        const stands = Math.abs(downHit(solid, x, t.thrower.y + 0.5, z, t.thrower.y - 0.3) - t.thrower.y) < 0.05;
        const onStage = r.land.x >= s[0] - 1e-6 && r.land.x <= s[2] + 1e-6 && r.land.z >= s[1] - 1e-6 && r.land.z <= s[3] + 1e-6;
        const lands = r.ok && r.room === 'ok';
        const what = !lands ? `refused (${r.room === 'ok' ? 'not ok' : r.room})` : bodyInside(r, s) ? 'lands, body 0.3 m inside' : onStage ? 'lands on the stage, body over its edge' : 'LANDS OUTSIDE THE STAGE';
        out.push(`${id} ${name} thrower (${x.toFixed(2)}, ${z.toFixed(2)})${stands ? '' : ' (no floor under the thrower)'}: dist ${r.dist}, landing (${r.land.x.toFixed(2)}, ${r.land.z.toFixed(2)}): ${what}`);
        expect(r.dist, `${id} ${name}`).toBeCloseTo(5.8, 9);
        if (lands && !onStage) bad.push(out[out.length - 1]!);
        if (name === 'mark') expect(lands && bodyInside(r, s), `${id} at the mark`).toBe(true);
      }
    }
    console.info(`W2 throw-site reach edges:\n${out.join('\n')}`);
    expect(bad).toEqual([]);
  });

  it('the throw length (TD-b): with the map\'s sites 5.8 / 3.2 / 5.8; with none all 3.2 and the pawn and lane throws land short; each build makes a new list', () => {
    const got = W2.throws.map((t) => throwCheck(solid, t, SITES));
    expect(got.map((r) => r.dist)).toEqual([5.8, TEAM.throwDist, 5.8]);
    for (const r of got) expect(r.ok && r.room === 'ok').toBe(true);
    const none = W2.throws.map((t) => throwCheck(solid, t, null));
    expect(none.map((r) => r.dist)).toEqual([TEAM.throwDist, TEAM.throwDist, TEAM.throwDist]);
    // the pawn throw lands in the lightwell, the lane throw over the lane
    expect(none[0]!.ok).toBe(false);
    expect(none[2]!.ok).toBe(false);
    expect(none[1]!.ok).toBe(true);
    const a = tallowWharf.build(new LevelBuilder(), 0).throwSites;
    const c = tallowWharf.build(new LevelBuilder(), 0).throwSites;
    expect(a).toEqual(c);
    expect(a).not.toBe(c);
  });
});

describe('W2: the throws forced by height (A28; G0\'s soloLevelThreats, extra 0.2)', () => {
  const PAWN: CoopTop = { x0: 50.2, x1: 52.2, z0: 72.5, z1: 73.5, top: 4.5 };
  const LANE: CoopTop = { x0: 82, x1: 86.5, z0: 64.5, z1: 67.5, top: 8.4 };
  const x0 = (p: BoxPiece): number => p.c[0] - p.s[0] / 2;
  const x1 = (p: BoxPiece): number => p.c[0] + p.s[0] / 2;
  const z0 = (p: BoxPiece): number => p.c[2] - p.s[2] / 2;
  const z1 = (p: BoxPiece): number => p.c[2] + p.s[2] / 2;
  /** The pawn stage's far side: the stage, the reading room's walls and roof slab (x 44-70, z >= 73.35), the stair landing's roof and walls. */
  const skipPawn = (p: BoxPiece): boolean =>
    (Math.abs(x0(p) - PAWN.x0) < 1e-6 && Math.abs(x1(p) - PAWN.x1) < 1e-6 && Math.abs(z0(p) - PAWN.z0) < 1e-6 && Math.abs(top(p) - PAWN.top) < 1e-6) ||
    (x0(p) >= 44 - 1e-6 && x1(p) <= 70 + 1e-6 && z0(p) >= 73.35 - 1e-6) ||
    (x0(p) >= 54 - 1e-6 && x1(p) <= 56 + 1e-6 && z0(p) >= 70 - 1e-6 && z1(p) <= 73.5 + 1e-6 && bottom(p) >= 7.5 - 1e-6) ||
    (z0(p) >= 70 - 1e-6 && z1(p) <= 73.5 + 1e-6 && (Math.abs(p.c[0] - 54) < 0.2 || Math.abs(p.c[0] - 56) < 0.2) && p.s[0] <= 0.3 + 1e-6);
  /** The C5 stage's far side: the W3 side (x >= 82). */
  const skipLane = (p: BoxPiece): boolean => x0(p) >= 82 - 1e-6;
  /** The two W2 drop-guard screens (the kit's `screen()`: 0.1 thick, 2.2 over the roof). */
  const isScreen = (p: BoxPiece): boolean => Math.abs(bottom(p) - 8.4) < 1e-6 && Math.abs(p.s[1] - 2.2) < 1e-6 && (Math.abs(p.c[0] - 54) < 1e-6 || Math.abs(p.c[2] - 70) < 1e-6);
  /**
   * The solid set with the two screens modelled 0.26 thick about their own lines: `soloLevelThreats` samples a flight at 20
   * steps (up to 5.08 / 20 = 0.254 m apart over this reach), so a straight flight can step across a 0.1 m panel between two
   * samples; a 2.2 m screen is not passed by any jump (its top 10.6 is 2.2 over the 8.4 take-off, the apex 0.87). The lines,
   * heights and ends are the built ones.
   */
  const FLIGHT_SOLID: BoxPiece[] = solid.map((p) => (isScreen(p) ? { ...p, s: [p.s[0] < 0.2 ? 0.26 : p.s[0], p.s[1], p.s[2] < 0.2 ? 0.26 : p.s[2]] as [number, number, number] } : p));

  /** The near-side surfaces the checks cover, each with its plan gap to the stage and its height under / over it. */
  const NEAR: [string, CoopTop, number[], number][] = [
    ['pawn loft floor (level)', PAWN, [44, 63.8, 53.85, 67.6, 4.5], 4.9],
    ['arcade roof over the pawn loft (-3.9: 4.88 + 0.2 needed, PLAN section 2)', PAWN, [44, 61.85, 54, 67.3, 8.4], 5.2],
    ['arcade roof east of x 54 (behind the 2.2 m screens)', PAWN, [54, 62, 76, 70.1, 8.4], 3.0],
    ['west bridge roof (-2.3)', PAWN, [44, 67.6, 45.5, 73.5, 6.8], 4.7],
    ['west bridge side (0.15 thick)', PAWN, [45.35, 67.6, 45.5, 73.5, 6.6], 4.7],
    ['loft wall top (0.3 m deep)', PAWN, [44, 67.3, 53.85, 67.6, 8.4], 4.9],
    ['stair landing interior (behind its 3 m wall)', PAWN, [54.15, 72.5, 55.85, 73.5, 4.5], 1.95],
    ['old bridge landing (level)', LANE, [76, 64.5, 77.1, 67.5, 8.4], 4.9],
    ['cage deck (behind the 2.0 m cage side)', LANE, [76, 68.6, 82, 69.8, 8.4], 1.1],
    ['corner mass top', LANE, [70, 70, 76, 80, 8.4], 6.5],
    ['tank room and tank (under the roof slab)', LANE, [70.4, 64.4, 74, 67.6, 6.0], 8.0],
  ];

  it('the near-side surfaces it covers, each with its plan gap to its stage', () => {
    for (const [name, q, r, d] of NEAR) {
      const g = planGap(r, [q.x0, q.z0, q.x1, q.z1]);
      console.info(`W2 near side of the ${q === PAWN ? 'pawn' : 'C5'} stage: ${name}: ${g.toFixed(2)} m, top ${r[4]} (${(r[4]! - q.top).toFixed(1)} over the stage)`);
      expect(g, name).toBeCloseTo(d, 2);
    }
  });

  it('the pawn stage: soloLevelThreats, soloTopLandingThreats and soloJumpThreats (extra 0.2) are [] (the screens at their sampled thickness)', () => {
    expect(FLIGHT_SOLID.filter(isScreen)).toHaveLength(2);
    expect(soloLevelThreats(FLIGHT_SOLID, PAWN, skipPawn, 0.2)).toEqual([]);
    expect(soloTopLandingThreats(FLIGHT_SOLID, PAWN, skipPawn, 0.2)).toEqual([]);
    // the stage is noLedge: no ledge anchor runs along its edges, so an in-air grab (`FALL_GRAB`) has nothing to take there
    const edgeLedges = anchorsOf(b).ledges.filter((l) => Math.abs(l.top - PAWN.top) < 0.3 && [l.a, l.b].some((q) => q.x > PAWN.x0 - 0.5 && q.x < PAWN.x1 + 0.5 && q.z > PAWN.z0 - 0.5 && q.z < PAWN.z1 + 0.5));
    expect(edgeLedges).toEqual([]);
    // soloJumpThreats takes a grip on the near edge as given: it finds only the lightwell drain's lid (top 1.7, the crouch duct
    // under the stair landing, x 53.2-56.8, 1.01 m off the stage's corner), which has no grip to reach while the edge is noLedge
    const grab = soloJumpThreats(FLIGHT_SOLID, { y: PAWN.top, a: { x: PAWN.x0, z: PAWN.z0 }, b: { x: PAWN.x1, z: PAWN.z0 }, n: { x: 0, z: -1 } }, skipPawn, 0.2);
    console.info(`W2 pawn stage soloJumpThreats (a grip assumed on the noLedge edge): ${JSON.stringify(grab)}`);
    expect(grab.filter((t) => !t.startsWith('top 1.70 at (55, 71.7)'))).toEqual([]);
  });

  it('the C5 stage: soloLevelThreats, soloTopLandingThreats and soloJumpThreats (extra 0.2) are []', () => {
    expect(soloLevelThreats(solid, LANE, skipLane, 0.2)).toEqual([]);
    expect(soloTopLandingThreats(solid, LANE, skipLane, 0.2)).toEqual([]);
    expect(soloJumpThreats(solid, { y: LANE.top, a: { x: LANE.x0, z: LANE.z0 }, b: { x: LANE.x0, z: LANE.z1 }, n: { x: -1, z: 0 } }, skipLane, 0.2)).toEqual([]);
  });

  it('control: with the screens left out the arcade roof east of x 54 is a threat to the pawn stage (the check bites)', () => {
    const noScreens = solid.filter((p) => !isScreen(p));
    expect(solid.length - noScreens.length).toBe(2);
    expect(soloLevelThreats(noScreens, PAWN, skipPawn, 0.2).length).toBeGreaterThan(0);
  });
});

describe('W2: the north range cut off (A28)', () => {
  it('the two drop guards are collide noLedge boxes at least 1.9 m over the roof, continuous from (54, 67.3) to (54, 70.0) to (76, 70.0)', () => {
    expect(W2.dropGuards.map((g) => [g.id, g.a.x, g.a.z, g.b.x, g.b.z, g.y, g.h])).toEqual([
      ['w2-dg-stairhall', 54, 67.3, 54, 70.0, 8.4, 2.2],
      ['w2-dg-lightwell', 54, 70.0, 76, 70.0, 8.4, 2.2],
    ]);
    const gaps: string[] = [];
    const legs: [number, number, number, number][] = [[54, 67.3, 54, 70.0], [54, 70.0, 76, 70.0]];
    for (const [ax, az, bx, bz] of legs) {
      const n = Math.ceil(hyp2(bx - ax, bz - az) / 0.05);
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        for (let y = 8.45; y <= 8.4 + 1.9; y += 0.1) {
          const p = pieceAt(x, y, z) ?? pieceAt(x + 1e-3, y, z + 1e-3) ?? pieceAt(x - 1e-3, y, z - 1e-3);
          if (!p || !p.noLedge) gaps.push(`(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
        }
      }
    }
    expect(gaps).toEqual([]);
  });

  it('the bridge roofs\' tops are at least 0.95 m under the north range roof (7.8); the landing roof and the north range roof are noLedge', () => {
    for (const [x, z] of [[44.75, 70.5], [69.25, 71.75]] as const) {
      const t = downHit(solid, x, 9, z, 5);
      expect(t, `bridge roof at (${x}, ${z})`).toBeCloseTo(6.8, 9);
      expect(7.8 - t).toBeGreaterThanOrEqual(0.95);
    }
    for (const [x, z] of [[55, 72], [50, 77], [65, 77]] as const) {
      const p = pieceAt(x, 7.7, z)!;
      expect(p, `(${x}, ${z})`).toBeDefined();
      expect(top(p)).toBeCloseTo(7.8, 9);
      expect(p.noLedge).toBe(true);
    }
  });
});

describe('W2: the fire-escape cage\'s W3 end (A28)', () => {
  const BRIDGE_DOOR: ShutDoor = { at: [82, 69.2], y: 8.4, w: 1.2, alongX: false };

  it('both cage sides are collide noLedge boxes 2.0 m over the deck from x 76.1 to x 82, meeting the W3 door frame (x 82.0-82.3, z 68.3-70.1, top 11.0)', () => {
    for (const [z0, z1] of [[68.55, 68.65], [69.75, 69.85]] as const) {
      const p = solid.find((q) => Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-6 && Math.abs(q.s[2] - (z1 - z0)) < 1e-6 && bottom(q) > 8.3 && bottom(q) < 8.5);
      expect(p, `cage side z ${z0}`).toBeDefined();
      expect(p!.noLedge).toBe(true);
      expect(top(p!) - 8.4).toBeCloseTo(2.0, 9);
      expect(p!.c[0] - p!.s[0] / 2).toBeCloseTo(76.1, 9);
      expect(p!.c[0] + p!.s[0] / 2).toBeCloseTo(82, 9);
      // it meets the frame: the frame's jamb (z 68.3-68.6 and 69.8-70.1) holds the side's outer half just past x 82
      const f = pieceAt(82.05, 9.5, z0 < 69 ? z0 + 0.02 : z1 - 0.02);
      expect(f, `frame at z ${z0}`).toBeDefined();
      expect(f!.noLedge).toBe(true);
      expect(f!.c[0] - f!.s[0] / 2).toBeCloseTo(82.0, 6);
      expect(top(f!)).toBeCloseTo(11.0, 6);
    }
    // no roof over the deck (open-topped)
    for (const x of [77, 79, 81]) expect(solid.some((p) => bottom(p) > 8.45 && Math.abs(p.c[0] - x) < p.s[0] / 2 && Math.abs(p.c[2] - 69.2) < p.s[2] / 2), `roof over (${x}, 69.2)`).toBe(false);
  });

  it('with the bridge door shut the deck does not reach the W3 corner bay or the W3 roof; with it open it does (control)', () => {
    const { nav, restore } = soloNav(b, 4, W2.navSeeds, [BRIDGE_DOOR]);
    try {
      expect(nav.findPath([79, 69.2], [84, 66], 1e6, 8.4, 8.4)).toBeNull();
      expect(nav.findPath([79, 69.2], [100, 70], 1e6, 8.4, 8.4)).toBeNull();
      // the deck is on the arcade roof's nav component
      expect(nav.findPath([79, 69.2], [60, 66], 1e6, 8.4, 8.4)).not.toBeNull();
    } finally {
      restore();
    }
    const open = soloNav(b, 4, [...W2.navSeeds, ...layout.navSeeds!], []);
    try {
      expect(open.nav.findPath([79, 69.2], [84, 66], 1e6, 8.4, 8.4)).not.toBeNull();
      expect(open.nav.findPath([79, 69.2], [100, 70], 1e6, 8.4, 8.4)).not.toBeNull();
    } finally {
      open.restore();
    }
  });
});

describe('W2: no solo jump onto C3, only the planned lip', () => {
  it('soloJumpThreats is [] for the pier lip and for the east pull edge', () => {
    const lip = W2.lips[0]!;
    expect(soloJumpThreats(solid, lip)).toEqual([]);
    const pull = W2.pulls[0]!;
    const edge = { y: pull.holder.y, a: { x: 72.5, z: 59 }, b: { x: 74.5, z: 59 }, n: { x: 0, z: -1 } };
    expect(soloJumpThreats(solid, edge)).toEqual([]);
  });

  it('keep-clear: nothing a player alone can stand on over 0.3 m within GREY_KEEP_CLEAR of the two edges in the arcade', () => {
    expect(GREY_KEEP_CLEAR).toBeCloseTo(4.7, 9);
    const zones: [number, number, number, number][] = [[40.5, 54.3, 51.5, 59], [67.8, 54.3, 79, 59]];
    const bad: string[] = [];
    for (const p of solid) {
      // a standable top: over 0.3, wide enough to stand on, and not a noLedge piece over the mantle
      if (top(p) <= 0.3 || Math.min(p.s[0], p.s[2]) < 0.38 || (p.noLedge && top(p) > 1.8)) continue;
      if (bottom(p) > 4.0) continue;
      for (const z of zones) {
        if (p.c[0] + p.s[0] / 2 > z[0] && p.c[0] - p.s[0] / 2 < z[2] && p.c[2] + p.s[2] / 2 > z[1] && p.c[2] - p.s[2] / 2 < z[3]) bad.push(`box (${p.c.join(', ')}) size (${p.s.join(', ')})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the only hangable lip at band height in the W2 box is the pier lip (the pull edge, the stages, the walkway slab, the taking-in walls, both bridges, the tank room, the stair head, the cut-back pawn-loft edge, the rebuilt pawn stair core and the cage give none)', () => {
    const anchors = anchorsOf(b);
    const bad: string[] = [];
    let found = 0;
    for (const l of anchors.ledges) {
      if (!inW2((l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2) && !((l.a.x + l.b.x) / 2 <= 82 && (l.a.z + l.b.z) / 2 >= 64 && (l.a.z + l.b.z) / 2 <= 70.1)) continue;
      if (!l.canHang || l.top < WALL_JUMP.maxUp || l.top > TEAM.boostMax + 0.05 || l.drop < 1.9) continue;
      found++;
      if (!onPlannedLip(l, W2.lips)) bad.push(`(${l.a.x.toFixed(2)}, ${l.a.z.toFixed(2)}) -> (${l.b.x.toFixed(2)}, ${l.b.z.toFixed(2)}) top ${l.top} drop ${l.drop}`);
    }
    expect(bad).toEqual([]);
    expect(found).toBeGreaterThanOrEqual(1);
  });
});

describe('W2: no solo bypass, the reverse lightwell jump closed', () => {
  /** A door anchor by its centre and floor. */
  const find = (x: number, y: number, z: number) =>
    b.anchors.doors.find((d) => {
      const alongX = Math.abs(d.yaw - Math.PI / 2) < 1e-6;
      const cx = alongX ? d.hinge.x + d.width / 2 : d.hinge.x;
      const cz = alongX ? d.hinge.z : d.hinge.z + d.width / 2;
      return Math.abs(cx - x) < 1e-6 && Math.abs(cz - z) < 1e-6 && Math.abs(d.hinge.y - y) < 1e-6;
    });

  it('the named doors exist where the data says, with the right width and height; the clock-mender\'s door is locked and not breachable (A29), every other named door unlocked', () => {
    expect(Object.keys(W2.doors).sort()).toEqual(
      ['w2-pawn-stair-foot', 'w2-pawn-stair-top', 'w2-walkway-pawn', 'w2-pie-stair-top', 'w2-pawn-taking-in', 'w2-pie-taking-in', 'w2-clock-door', 'w2-bridge-west', 'w2-bridge-east', 'w2-stair-head', 'w2-tank-room', 'w2-reading-stage'].sort(),
    );
    for (const [id, p] of Object.entries(W2.doors)) {
      const d = find(p[0], p[1], p[2]);
      expect(d, id).toBeDefined();
      expect(d!.locked, id).toBe(id === 'w2-clock-door');
    }
    const clock = W2.doors['w2-clock-door']!;
    expect(find(clock[0], clock[1], clock[2])!.breachable).toBe(false);
    for (const id of ['w2-pawn-taking-in', 'w2-pie-taking-in']) {
      const p = W2.doors[id]!;
      const d = find(p[0], p[1], p[2])!;
      expect(d.width).toBeCloseTo(2.0, 9);
      expect(d.height).toBeCloseTo(3.6, 9);
    }
    // the unnamed doors: the lane door, the walkway doors (the pawn one at x 45), the party wall, the stage doors (the reading
    // stage at x 51.2), the foot doors, the pie shop's lightwell door
    for (const p of [[76, 0, 55], [45, 4.5, 62], [61, 4.5, 62], [72, 4.5, 62], [61, 0, 62], [53, 0, 62], [55, 0, 62], [61, 0, 70], [67, 4.5, 66], [51.2, 4.5, 73.5], [55, 4.5, 73.5], [63, 4.5, 73.5], [57.8, 0, 63]] as const) {
      expect(find(p[0], p[1], p[2]), p.join(',')).toBeDefined();
    }
  });

  it('with every bolt shut and the clock door locked: no solo way into the reading room from the pawn loft, the arcade, the pie loft or the clock loft; the arcade does not reach the roof', () => {
    const { nav, restore } = soloNav(b, 4, W2.navSeeds, ALL_SHUT);
    try {
      expect(nav.findPath([48, 66], [48, 77], 1e6, 4.5, 4.5)).toBeNull(); // the pawn loft (the west gate)
      expect(nav.findPath([58, 55], [52, 77], 1e6, 0, 4.5)).toBeNull(); // the arcade (the stair head, A25)
      expect(nav.findPath([61, 66], [52, 77], 1e6, 4.5, 4.5)).toBeNull(); // the pie loft
      expect(nav.findPath([65, 77], [52, 77], 1e6, 4.5, 4.5)).toBeNull(); // the clock loft (A29)
      expect(nav.findPath([52, 77], [46, 66], 1e6, 4.5, 4.5)).toBeNull(); // and the reading room does not reach the pawn loft
      // no solo way from the arcade ground to the walkway, the lofts or the roof
      expect(nav.findPath([42, 55], [60, 66], 1e6, 0, 8.4)).toBeNull();
      expect(nav.findPath([42, 55], [60, 60.5], 1e6, 0, 4.5)).toBeNull();
      expect(nav.findPath([42, 55], [46, 66], 1e6, 0, 4.5)).toBeNull();
      expect(nav.findPath([42, 55], [60, 66], 1e6, 0, 4.5)).toBeNull();
      // control, the roof route: the walkway reaches the hatch ladder's foot in the tank room (the climber's spot, the standoff
      // off the line), the ladder tops out on the roof slab, and the roof reaches the exit (the ladder is not in the nav grid)
      const ladder = b.anchors.ladders.find((l) => Math.abs(l.base.x - 72) < 1e-6 && Math.abs(l.base.y - 4.5) < 1e-6)!;
      expect(ladder).toBeDefined();
      const fx = Math.sin(ladder.facing);
      const fz = Math.cos(ladder.facing);
      expect(nav.findPath([60, 60.5], [ladder.base.x - fx * 0.32, ladder.base.z - fz * 0.32], 1e6, 4.5, 4.5)).not.toBeNull();
      const out = { x: ladder.top.x + fx * 0.4, z: ladder.top.z + fz * 0.4 };
      expect(downHit(solid, out.x, ladder.top.y + 1, out.z, ladder.top.y - 0.3)).toBeCloseTo(8.4, 6);
      expect(nav.findPath([out.x, out.z], [W2.exit[0], W2.exit[2]], 1e6, 8.4, 8.4)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('the way-back bridges: with only the west gate open the reading room reaches the pawn loft; with only the east gate open the clock loft reaches the pie loft (through the lane-window loft)', () => {
    const west = soloNav(b, 4, W2.navSeeds, ALL_SHUT.filter((d) => d !== SHUT.bridgeWest));
    try {
      expect(west.nav.findPath([48, 77], [48, 66], 1e6, 4.5, 4.5)).not.toBeNull();
    } finally {
      west.restore();
    }
    const east = soloNav(b, 4, W2.navSeeds, ALL_SHUT.filter((d) => d !== SHUT.bridgeEast));
    try {
      expect(east.nav.findPath([65, 77], [61, 66], 1e6, 4.5, 4.5)).not.toBeNull();
      expect(east.nav.findPath([65, 77], [72, 63], 1e6, 4.5, 4.5)).not.toBeNull();
    } finally {
      east.restore();
    }
  });

  it('control for the bolts: with the pawn stair foot or the pie stair top left open, its loft is reached from the arcade; with the stair head open, the reading room', () => {
    const pawn = soloNav(b, 4, W2.navSeeds, ALL_SHUT.filter((s) => s !== SHUT.pawnStairFoot));
    try {
      expect(pawn.nav.findPath([58, 55], [46, 66], 1e6, 0, 4.5)).not.toBeNull();
    } finally {
      pawn.restore();
    }
    const pie = soloNav(b, 4, W2.navSeeds, ALL_SHUT.filter((s) => s !== SHUT.pieStairTop));
    try {
      expect(pie.nav.findPath([58, 55], [60, 66], 1e6, 0, 4.5)).not.toBeNull();
    } finally {
      pie.restore();
    }
    const head = soloNav(b, 4, W2.navSeeds, ALL_SHUT.filter((s) => s !== SHUT.stairHead));
    try {
      expect(head.nav.findPath([58, 55], [52, 77], 1e6, 0, 4.5)).not.toBeNull();
    } finally {
      head.restore();
    }
  });

  it('the hatch opening and the loft ladder exist; the roof is closed over the rest of the lane-window loft', () => {
    const hole = (x: number, z: number): boolean => solid.some((p) => bottom(p) > 8.0 && top(p) < 8.45 && Math.abs(p.c[0] - x) < p.s[0] / 2 && Math.abs(p.c[2] - z) < p.s[2] / 2);
    expect(hole(72, 66)).toBe(false);
    expect(hole(70, 66)).toBe(true);
    expect(hole(74, 66)).toBe(true);
    const ladder = b.anchors.ladders.find((l) => Math.abs(l.base.x - 72) < 1e-6 && Math.abs(l.base.z - 66.15) < 1e-6);
    expect(ladder).toBeDefined();
    expect(ladder!.base.y).toBeCloseTo(4.5, 9);
    expect(ladder!.top.y).toBeCloseTo(8.4, 9);
    // the top at the hole's north edge (z 66.6), the foot over the loft floor
    expect(ladder!.top.z).toBeCloseTo(66.6, 6);
    expect(downHit(solid, ladder!.base.x, 5.5, ladder!.base.z - 0.32, 4.2)).toBeCloseTo(4.5, 6);
  });

  it('(A7, E6; 16.2.3) the ladder stands inside the tank room\'s walls, and no ladder opening is in an occupied room', () => {
    // the tank room: walls from 4.5 to 8.1 along z 64.4 (door gap x 71.4-72.6) and z 67.6 from x 70.4 to 74.0, along x 70.4 and 74.0
    const wallAt = (x: number, z: number): boolean => !!pieceAt(x, 6.0, z) && !!pieceAt(x, 7.9, z);
    for (const x of [70.8, 71.2, 72.8, 73.6]) expect(wallAt(x, 64.4), `z 64.4 at x ${x}`).toBe(true);
    for (const x of [70.8, 72, 73.6]) expect(wallAt(x, 67.6), `z 67.6 at x ${x}`).toBe(true);
    for (const z of [64.8, 66, 67.2]) {
      expect(wallAt(70.4, z), `x 70.4 at z ${z}`).toBe(true);
      expect(wallAt(74.0, z), `x 74.0 at z ${z}`).toBe(true);
    }
    expect(pieceAt(72, 5.0, 64.4)).toBeUndefined(); // the door gap
    // the tank: x 72.9-73.8, z 64.7-67.3, 4.5-6.0
    const tank = pieceAt(73.35, 5.2, 66)!;
    expect(tank).toBeDefined();
    expect(top(tank)).toBeCloseTo(6.0, 9);
    // every ladder in the W2 box and its roof opening lie inside the tank room (a plant room), none in a loft
    const ladders = b.anchors.ladders.filter((l) => inW2(l.base.x, l.base.z));
    expect(ladders).toHaveLength(1);
    for (const l of ladders) for (const p of [l.base, l.top]) expect(p.x > 70.55 && p.x < 73.85 && p.z > 64.55 && p.z < 67.45, `(${p.x}, ${p.z})`).toBe(true);
    // the roof slab's only opening over the lane-window loft (x 68-76, z 62-70, sampled every 0.1 m) lies inside the tank room's
    // plan (the hatch x 71.4-72.6, z 65.4-66.6)
    const open: string[] = [];
    for (let x = 68.65; x < 75.8; x += 0.1) {
      for (let z = 62.25; z < 69.8; z += 0.1) {
        const slab = solid.some((p) => bottom(p) > 8.0 && top(p) < 8.45 && Math.abs(p.c[0] - x) < p.s[0] / 2 && Math.abs(p.c[2] - z) < p.s[2] / 2);
        if (!slab && !(x > 70.55 && x < 73.85 && z > 64.55 && z < 67.45)) open.push(`(${x.toFixed(2)}, ${z.toFixed(2)})`);
      }
    }
    expect(open).toEqual([]);
    // and with the tank room door shut the lane-window loft does not reach the ladder's foot
    const ladder = ladders[0]!;
    const shut = soloNav(b, 4, W2.navSeeds, [{ at: [72, 64.4], y: 4.5, w: 1.2, alongX: true }]);
    try {
      expect(shut.nav.findPath([69, 63], [ladder.base.x - Math.sin(ladder.facing) * 0.32, ladder.base.z - Math.cos(ladder.facing) * 0.32], 1e6, 4.5, 4.5)).toBeNull();
    } finally {
      shut.restore();
    }
    // no W2 guard post or route point is in the tank room
    for (const p of guardPoints()) expect(p.x > 70.4 && p.x < 74 && p.z > 64.4 && p.z < 67.6 && Math.abs(p.y - 4.5) < 1, p.who).toBe(false);
  });

  it('the taking-in doors: no collide box outside the door plane gives a standable top (the loft side\'s edge to 0.6 m out, the door x range, y 4.3-4.7)', () => {
    // the pawn loft floor ends at z 67.6 (the wall's outer face); the pie loft slab at z 70
    for (const [id, face] of [['w2-pawn-taking-in', 67.6], ['w2-pie-taking-in', 70]] as const) {
      const [cx] = W2.doors[id]!;
      const x0 = cx - 1;
      const x1 = cx + 1;
      const bad = solid.filter((p) => p.c[0] + p.s[0] / 2 > x0 && p.c[0] - p.s[0] / 2 < x1 && p.c[2] + p.s[2] / 2 > face && p.c[2] - p.s[2] / 2 < face + 0.6 && top(p) >= 4.3 && top(p) <= 4.7);
      expect(bad.map((p) => `box (${p.c.join(', ')})`), id).toEqual([]);
    }
  });
});

describe('W2: lights (LIGHT.md section 3)', () => {
  const WARM = [1, 0.82, 0.55];
  const EXIT = [0.8, 1, 0.85];
  /** LIGHT.md section 3 "Lamps": [group, x, y, z, r, i, colour]. */
  const TABLE: readonly (readonly [number, number, number, number, number, number, 'white' | 'warm' | 'exit'])[] = [
    ...([[47.5, 51], [55.5, 51], [63.5, 51], [71.5, 51], [51.5, 56.5], [59.5, 56.5], [67.5, 56.5]] as const).map(([x, z]) => [70, x, 4.2, z, 7, 0.85, 'white'] as const),
    [71, 58.8, 2.4, 62.5, 4, 0.3, 'warm'],
    [72, 59, 7.0, 65.5, 7, 0.9, 'warm'],
    [72, 63.5, 7.0, 65.5, 7, 0.9, 'warm'],
    [72, 58.15, 5.4, 67.8, 3, 0.35, 'warm'],
    [73, 47.5, 7.6, 65.7, 7, 0.9, 'warm'],
    [73, 52, 7.6, 65.7, 7, 0.9, 'warm'],
    [73, 51.2, 5.6, 64.4, 4, 0.35, 'warm'],
    [74, 52.2, 5.4, 75.0, 4, 0.35, 'warm'],
    [75, 47.0, 5.4, 77.2, 4, 0.35, 'warm'],
    [76, 55, 7.2, 72, 6, 0.8, 'white'],
    [76, 55, 6.4, 66, 6, 0.8, 'white'],
    ...([47, 52, 57] as const).map((x) => [77, x, 7.2, 76.75, 7, 0.9, 'warm'] as const),
    [78, 45, 7.6, 62.8, 4, 0.5, 'white'],
    [78, 53, 3.0, 63.3, 4, 0.5, 'white'],
    [78, 49.5, 4.6, 63.3, 4, 0.5, 'white'],
    [78, 57, 7.6, 69.3, 4, 0.5, 'white'],
    [78, 44.75, 6.4, 70.5, 3, 0.3, 'white'],
    [78, 69.25, 6.4, 71.75, 3, 0.3, 'white'],
    [78, 72.2, 7.7, 64.9, 3, 0.3, 'white'],
    [78, 69.25, 6.8, 73.9, 3, 0.15, 'exit'],
    [78, 72, 6.8, 62.4, 3, 0.15, 'exit'],
    ...([49, 56.5, 65, 70] as const).map((x) => [79, x, 7.4, 61.75, 6, 1.3, 'warm'] as const),
  ];

  it('has the 34 lamps of LIGHT.md section 3, every one on, in groups 70-79 as [7, 1, 3, 3, 1, 1, 2, 3, 9, 4]', () => {
    expect(TABLE).toHaveLength(34);
    expect(W2_LAMPS).toHaveLength(34);
    for (const l of W2_LAMPS) {
      expect(l.on, `(${l.x}, ${l.y}, ${l.z})`).toBe(true);
      expect(l.group).toBeGreaterThanOrEqual(70);
      expect(l.group).toBeLessThanOrEqual(79);
    }
    expect([70, 71, 72, 73, 74, 75, 76, 77, 78, 79].map((g) => W2_LAMPS.filter((l) => l.group === g).length)).toEqual([7, 1, 3, 3, 1, 1, 2, 3, 9, 4]);
  });

  it('each lamp\'s position, r, i and colour are the table\'s (the registry stores the photometric reach of r)', () => {
    for (const [g, x, y, z, r, i, c] of TABLE) {
      const l = W2_LAMPS.find((p) => p.group === g && Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6 && Math.abs(p.z - z) < 1e-6);
      expect(l, `group ${g} at (${x}, ${y}, ${z})`).toBeDefined();
      expect(l!.radius).toBeCloseTo(lampReach(r), 9);
      expect(l!.intensity).toBeCloseTo(i, 9);
      if (c === 'warm') expect(l!.color).toEqual(WARM);
      else if (c === 'exit') expect(l!.color).toEqual(EXIT);
      else expect(l!.color).not.toEqual(WARM);
    }
  });

  it('switched groups are 70-77 and 79 (76 at both ends of the stair); 78 has none', () => {
    expect(W2.switches.map((s) => s.group)).toEqual([70, 71, 72, 73, 74, 75, 76, 76, 77, 79]);
    expect(W2.switches.some((s) => s.group === 78)).toBe(false);
    expect(layout.switches!.filter((s) => s.section === 1)).toHaveLength(W2.switches.length);
    const want: [number, number, number, number, number][] = [
      [70, 40.4, 0, 57.8, Math.PI / 2],
      [71, 62.4, 0, 62.4, 0],
      [72, 58.4, 4.5, 68.8, Math.PI / 2],
      [73, 46.1, 4.5, 64.0, 0],
      [74, 52.6, 4.5, 74.6, -Math.PI / 2],
      [75, 47.9, 4.5, 77.2, -Math.PI / 2],
      [76, 55.4, 4.5, 72.4, -Math.PI / 2],
      [76, 55.7, 0, 62.4, 0],
      [77, 45.8, 4.5, 73.85, 0],
      [79, 46.1, 4.5, 61.75, Math.PI],
    ];
    expect(W2.switches.map((s) => [s.group, s.pos.x, s.pos.y, s.pos.z, s.yaw])).toEqual(want);
  });

  it('room switches stand within 1.5 m (plan) of the named door jamb on its floor; 74 and 75 within 1.0 m of their lamps', () => {
    /** [group, switch index among that group's, floor, jambs]. */
    const JAMBS: [number, number, number, [number, number][]][] = [
      [70, 0, 0, [[40, 58.5], [40, 61.5]]], // the west arch
      [71, 0, 0, [[60.4, 62], [61.6, 62]]], // the pie shop door
      [72, 0, 4.5, [[57.8, 68.4], [57.8, 69.6]]], // the back stair top door
      [73, 0, 4.5, [[44.4, 63.65], [45.6, 63.65]]], // the loft door
      [76, 0, 4.5, [[54.4, 73.5], [55.6, 73.5]]], // the stair head
      [76, 1, 0, [[54.4, 62], [55.6, 62]]], // the stair foot door
      [77, 0, 4.5, [[44.15, 73.5], [45.35, 73.5]]], // the west bridge doorway
      [79, 0, 4.5, [[44.4, 62], [45.6, 62]]], // the walkway door
    ];
    for (const [g, k, fy, jambs] of JAMBS) {
      const s = W2.switches.filter((q) => q.group === g)[k]!;
      expect(s.pos.y, `switch ${g}.${k} floor`).toBe(fy);
      const d = Math.min(...jambs.map(([x, z]) => hyp2(s.pos.x - x, s.pos.z - z)));
      expect(d, `switch ${g}.${k}: ${d.toFixed(2)} m from its jamb`).toBeLessThanOrEqual(1.5);
    }
    for (const g of [74, 75]) {
      const s = W2.switches.find((q) => q.group === g)!;
      const l = W2_LAMPS.find((q) => q.group === g)!;
      expect(hyp2(s.pos.x - l.x, s.pos.z - l.z), `switch ${g}`).toBeLessThanOrEqual(1.0);
    }
  });

  for (const [g, yRun] of [[70, 7.3], [71, 2.6], [72, 7.2], [73, 7.8], [76, 7.4], [77, 7.4], [79, 7.6]] as const) {
    it(`conduits, group ${g}: one run per fitting from a switch of the group (floor + 1.2) up to yRun ${yRun}, along x, along z, ending within 0.3 m of the fitting, every leg axis-aligned`, () => {
      const runs = W2_CONDUITS.filter((r) => r.group === g);
      const fittings = lampsOf(g);
      const sws = W2.switches.filter((s) => s.group === g);
      expect(runs).toHaveLength(fittings.length);
      for (const r of runs) {
        const first = r.pts[0]!;
        expect(sws.some((s) => Math.abs(first[0] - s.pos.x) < 1e-9 && Math.abs(first[2] - s.pos.z) < 1e-9 && Math.abs(first[1] - (s.pos.y + 1.2)) < 1e-9), 'starts at a switch').toBe(true);
        expect(r.pts[1]![1]).toBeCloseTo(yRun, 9);
        const last = r.pts[r.pts.length - 1]!;
        expect(fittings.some((l) => hyp2(hyp2(last[0] - l.x, last[2] - l.z), last[1] - l.y) <= 0.3), 'ends at a fitting').toBe(true);
        for (let i = 0; i + 1 < r.pts.length; i++) {
          const d = [0, 1, 2].filter((k) => Math.abs(r.pts[i + 1]![k]! - r.pts[i]![k]!) > 1e-9);
          expect(d.length, `leg ${i} of a group ${g} run`).toBeLessThanOrEqual(1);
        }
      }
      for (const l of fittings) expect(runs.some((r) => { const p = r.pts[r.pts.length - 1]!; return hyp2(hyp2(p[0] - l.x, p[2] - l.z), p[1] - l.y) <= 0.3; }), `fitting (${l.x}, ${l.y}, ${l.z})`).toBe(true);
    });
  }

  it('only groups 70, 71, 72, 73, 76, 77 and 79 have runs, each leg built as a visual-only 0.05 box in #4f5459', () => {
    expect([...new Set(W2_CONDUITS.map((r) => r.group))].sort()).toEqual([70, 71, 72, 73, 76, 77, 79]);
    const legs = W2_CONDUITS.reduce((n, r) => n + r.pts.slice(1).filter((p, i) => Math.abs(p[0] - r.pts[i]![0]) + Math.abs(p[1] - r.pts[i]![1]) + Math.abs(p[2] - r.pts[i]![2]) > 1e-6).length, 0);
    const built = b.boxes.filter((p) => p.color === '#4f5459' && inW2(p.c[0], p.c[2]));
    expect(built).toHaveLength(legs);
    for (const p of built) {
      expect(p.collide).toBe(false);
      expect([...p.s].filter((v) => Math.abs(v - 0.05) < 1e-9).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('space ids resolve in the graph', () => {
    for (const r of W2.rooms) expect(space(r.id).section).toBe('W2');
  });
});

describe('W2: levels at the check points (LIGHT.md section 3; M1: closed rooms by their night fittings)', () => {
  const IN = 0.14;
  const AMB = 0.244;
  const ROWS: { name: string; at: [number, number, number]; g: number[]; amb: number; min?: number; max?: number }[] = [
    { name: 'arcade mid', at: [56, 0, 54], g: [70], amb: IN, min: 0.79 },
    { name: 'arcade entry / checkpoint', at: [42, 0, 55], g: [70], amb: IN, max: 0.28 },
    { name: 'C3 boost spot', at: [46, 0, 58.5], g: [70], amb: IN, max: 0.45 },
    { name: 'walkway mid', at: [60, 4.5, 60.5], g: [79], amb: AMB, min: 0.6 },
    { name: 'pie loft', at: [61, 4.5, 66], g: [72], amb: IN, min: 0.79 },
    { name: 'pie shop back', at: [64, 0, 68], g: [71], amb: IN, max: 0.28 },
    { name: 'pawn loft', at: [48, 4.5, 66], g: [73], amb: IN, min: 0.79 },
    { name: 'Teale', at: [51, 4.5, 75.4], g: [74, 75, 77], amb: IN, min: 0.79 },
    { name: 'reading W', at: [45, 4.5, 77], g: [74, 75, 77], amb: IN, min: 0.79 },
    { name: 'reading E', at: [59, 4.5, 77], g: [74, 75, 77], amb: IN, min: 0.79 },
    { name: 'clock loft mid', at: [65, 4.5, 77], g: [78], amb: IN, max: 0.28 },
    { name: 'lane-window loft mid', at: [69, 4.5, 63], g: [78], amb: IN, max: 0.28 },
    { name: 'pawn stage', at: [51.2, 4.5, 73.0], g: [], amb: AMB, max: 0.28 },
  ];
  for (const r of ROWS) {
    it(`${r.name} (${r.at.join(', ')}) over groups ${r.g.join(', ') || 'none'}: ${r.min !== undefined ? `>= ${r.min}` : `<= ${r.max}`}`, () => {
      const v = levelAt(lampsOf(...r.g), r.amb, r.at[0], r.at[1], r.at[2]);
      console.info(`W2 level ${r.name}: ${v.toFixed(3)}`);
      if (r.min !== undefined) expect(v).toBeGreaterThanOrEqual(r.min);
      if (r.max !== undefined) expect(v).toBeLessThanOrEqual(r.max);
    });
  }
});

describe('W2: desks (LIGHT.md rule 7)', () => {
  it('W2_DESKS is the rule\'s list; each desk is a visual-only box with its top 0.75 over its floor, under its lamp', () => {
    expect(W2_DESKS).toEqual([
      [57.95, 67.1, 58.35, 68.3, 4.5],
      [50.6, 63.8, 51.8, 64.6, 4.5],
      [51.9, 74.4, 52.5, 75.6, 4.5],
      [46.4, 76.9, 47.6, 77.5, 4.5],
    ]);
    const lampOn = [72, 73, 74, 75];
    W2_DESKS.forEach(([x0, z0, x1, z1, fy], k) => {
      const p = b.boxes.find((q) => Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-9 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-9 && Math.abs(q.s[0] - (x1 - x0)) < 1e-9 && Math.abs(q.s[2] - (z1 - z0)) < 1e-9 && Math.abs(q.s[1] - 0.75) < 1e-9);
      expect(p, `desk at (${x0}, ${z0})`).toBeDefined();
      expect(p!.collide).toBe(false);
      expect(bottom(p!)).toBeCloseTo(fy, 9);
      expect(top(p!)).toBeCloseTo(fy + 0.75, 9);
      // its desk or table lamp stands over it
      const l = W2_LAMPS.filter((q) => q.group === lampOn[k] && q.y < 6).find((q) => q.x > x0 && q.x < x1 && q.z > z0 && q.z < z1);
      expect(l, `lamp over the desk at (${x0}, ${z0})`).toBeDefined();
    });
  });

  it('desks and guards (fix round 3): no W2 guard post or route leg on a desk\'s floor passes within 0.3 m of it (plan)', () => {
    const segDist = (ax: number, az: number, bx: number, bz: number, r: readonly number[]): number => {
      let best = Infinity;
      const n = Math.max(1, Math.ceil(hyp2(bx - ax, bz - az) / 0.02));
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        best = Math.min(best, hyp2(Math.max(r[0]! - x, 0, x - r[2]!), Math.max(r[1]! - z, 0, z - r[3]!)));
      }
      return best;
    };
    const bad: string[] = [];
    for (const [x0, z0, x1, z1, fy] of W2_DESKS) {
      const rect = [x0, z0, x1, z1];
      W2_GUARDS.forEach((g, k) => {
        if (Math.abs((g.y ?? 0) - fy) >= 1) return;
        if (segDist(g.x, g.z, g.x, g.z, rect) < 0.3) bad.push(`desk (${x0}, ${z0}): guard ${k} post`);
        const route = g.route ?? [];
        const n = route.length;
        for (let i = 0; i + 1 < n + (n >= 3 ? 1 : 0); i++) {
          const a = route[i]!;
          const c = route[(i + 1) % n]!;
          if (segDist(a[0], a[1], c[0], c[1], rect) < 0.3) bad.push(`desk (${x0}, ${z0}): guard ${k} leg ${i}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('W2: cover and doors (fix round 1, level-design 16.3.3, 16.4.2)', () => {
  /** Step 8's cover boxes [x0, z0, x1, z1, y0, y1]. */
  const COVER: readonly (readonly [number, number, number, number, number, number])[] = [
    [53, 77.2, 57, 77.8, 4.5, 6.7], // the book stacks
    [53.0, 64.0, 53.8, 64.8, 4.5, 5.2], // the pledge chest
    [44.15, 75.6, 45.0, 76.4, 4.5, 5.1], // the book trunk
    [44.0, 48.6, 45.0, 49.4, 0, 0.9], // the beadle's sand bin
    [64.4, 68.4, 65.4, 69.4, 0, 0.9], // the flour bin
    [64.4, 62.6, 65.4, 63.4, 4.5, 5.3], // the sack hamper
  ];

  it('each cover box is a collide noLedge box', () => {
    for (const [x0, z0, x1, z1, y0, y1] of COVER) {
      const p = solid.find((q) => Math.abs(q.c[0] - (x0 + x1) / 2) < 1e-9 && Math.abs(q.c[2] - (z0 + z1) / 2) < 1e-9 && Math.abs(bottom(q) - y0) < 1e-9 && Math.abs(top(q) - y1) < 1e-9);
      expect(p, `cover at (${x0}, ${z0})`).toBeDefined();
      expect(p!.noLedge).toBe(true);
    }
  });

  it('with no door shut, the pawn stair\'s top landing reaches the pawn loft and the west bridge, and the bridge the reading room', () => {
    const { nav, restore } = soloNav(b, 4, W2.navSeeds, []);
    try {
      expect(nav.findPath([45, 62.8], [48, 66], 1e6, 4.5, 4.5)).not.toBeNull();
      expect(nav.findPath([48, 66], [44.75, 70.5], 1e6, 4.5, 4.5)).not.toBeNull();
      expect(nav.findPath([44.75, 70.5], [48, 77], 1e6, 4.5, 4.5)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('no cover box and no desk lies within 1.2 m of a door gap\'s face, either side, across the gap\'s width (every W2 door anchor on its floor, and the two bridge doorways)', () => {
    /** Door gaps: [along x, plane, lo, hi, floor]. */
    const gaps: [boolean, number, number, number, number, string][] = [];
    for (const d of b.anchors.doors) {
      if (!inW2(d.hinge.x, d.hinge.z)) continue;
      const ex = d.hinge.x + Math.sin(d.yaw) * d.width;
      const ez = d.hinge.z + Math.cos(d.yaw) * d.width;
      const alongX = Math.abs(Math.sin(d.yaw)) > 0.5;
      gaps.push(alongX ? [true, d.hinge.z, Math.min(d.hinge.x, ex), Math.max(d.hinge.x, ex), d.hinge.y, `door (${d.hinge.x}, ${d.hinge.y}, ${d.hinge.z})`] : [false, d.hinge.x, Math.min(d.hinge.z, ez), Math.max(d.hinge.z, ez), d.hinge.y, `door (${d.hinge.x}, ${d.hinge.y}, ${d.hinge.z})`]);
    }
    gaps.push([true, 73.5, 44.15, 45.35, 4.5, 'the west bridge doorway'], [true, 73.5, 68.65, 69.85, 4.5, 'the east bridge doorway']);
    expect(gaps.length).toBeGreaterThanOrEqual(Object.keys(W2.doors).length + 2);
    const items: [string, number, number, number, number, number][] = [
      ...COVER.map((c) => [`cover (${c[0]}, ${c[1]})`, c[0], c[1], c[2], c[3], c[4]] as [string, number, number, number, number, number]),
      ...W2_DESKS.map((d) => [`desk (${d[0]}, ${d[1]})`, d[0], d[1], d[2], d[3], d[4]] as [string, number, number, number, number, number]),
    ];
    const bad: string[] = [];
    for (const [name, x0, z0, x1, z1, fy] of items) {
      for (const [alongX, at, lo, hi, gy, door] of gaps) {
        if (Math.abs(gy - fy) >= 1) continue;
        const [d0, d1] = alongX ? [x0, x1] : [z0, z1];
        if (d1 <= lo || d0 >= hi) continue;
        const [n0, n1] = alongX ? [z0, z1] : [x0, x1];
        const gap = at < n0 ? n0 - at : at > n1 ? at - n1 : 0;
        if (gap < 1.2) bad.push(`${name} is ${gap.toFixed(2)} m from ${door}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('W2: hide spots, the medkit and the vantages', () => {
  it('eight hide spots; every W2 takedown spot has one within 8 m (plan) on its floor', () => {
    expect(W2.hideSpots).toHaveLength(8);
    W2_GUARDS.forEach((g, k) => {
      const [tx, tz] = g.takedownSpot;
      const d = W2.hideSpots.filter((h) => Math.abs(h.pos.y - (g.y ?? 0)) < 1).map((h) => hyp2(h.pos.x - tx, h.pos.z - tz));
      const best = Math.min(...d);
      console.info(`W2 guard ${k} takedown spot (${tx.toFixed(2)}, ${tz.toFixed(2)}): nearest hide spot ${best.toFixed(1)} m`);
      expect(best, `W2:${k}`).toBeLessThanOrEqual(8);
    });
  });

  it('the medkit: one, the landlord\'s box on the pawn fire stair\'s top landing (an enclosed W2 space), at least 10 m from every guard post and route point or behind a collide wall (or a shut door) over 2 m', () => {
    expect(W2.medkits).toHaveLength(1);
    const m = W2.medkits![0]!;
    expect([m.pos.x, m.pos.y, m.pos.z, m.yaw]).toEqual([44.15, 4.5, 62.8, Math.PI / 2]);
    expect(downHit(solid, m.pos.x + 0.3, m.pos.y + 0.5, m.pos.z, m.pos.y - 0.3)).toBeCloseTo(4.5, 9);
    // the top landing x 44-45.8, z 62.15-63.5 between the facade (z 62) and the core's north wall (z 63.65), on the x 44 mass
    expect(m.pos.x >= 44 && m.pos.x <= 45.8 && m.pos.z >= 62.15 && m.pos.z <= 63.5).toBe(true);
    expect(W2.rooms.some((r) => m.pos.x >= r.minX && m.pos.x <= r.maxX && m.pos.z >= r.minZ && m.pos.z <= r.maxZ && m.pos.y >= (r.minY ?? 0) - 0.1 && m.pos.y <= (r.maxY ?? 99))).toBe(true);
    // the shut door leaves as 2.1 m panels (the loft door and the walkway door close the lobby)
    const leaves = b.anchors.doors.map((d) => {
      const ex = d.hinge.x + Math.sin(d.yaw) * d.width;
      const ez = d.hinge.z + Math.cos(d.yaw) * d.width;
      return { x0: Math.min(d.hinge.x, ex) - 0.05, x1: Math.max(d.hinge.x, ex) + 0.05, z0: Math.min(d.hinge.z, ez) - 0.05, z1: Math.max(d.hinge.z, ez) + 0.05, y0: d.hinge.y, y1: d.hinge.y + d.height };
    });
    const walled = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean => {
      const n = Math.ceil(hyp2(hyp2(bx - ax, bz - az), by - ay) / 0.05);
      for (let i = 1; i < n; i++) {
        const f = i / n;
        const x = ax + (bx - ax) * f;
        const y = ay + (by - ay) * f;
        const z = az + (bz - az) * f;
        const p = pieceAt(x, y, z);
        if (p && p.s[1] > 2) return true;
        if (leaves.some((l) => x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1 && y > l.y0 && y < l.y1 && l.y1 - l.y0 > 2)) return true;
      }
      return false;
    };
    const bad: string[] = [];
    for (const p of guardPoints()) {
      const d = hyp2(m.pos.x - p.x, m.pos.z - p.z);
      if (d >= 10) continue;
      const ok = walled(m.pos.x + 0.3, m.pos.y + 1.2, m.pos.z, p.x, p.y + 1.55, p.z);
      console.info(`W2 medkit to ${p.who} (${p.x}, ${p.z}): ${d.toFixed(1)} m, ${ok ? 'behind a wall or a shut door' : 'IN VIEW'}`);
      if (!ok) bad.push(`${p.who} at ${d.toFixed(1)} m`);
    }
    expect(bad).toEqual([]);
  });

  const VANTAGES = [
    { id: 'w2-vantage-arcade-a', at: [58.8, 8.4, 62.6], yaw: Math.PI, target: [59, 1.0, 53.5] },
    { id: 'w2-vantage-arcade-b', at: [60.6, 8.4, 62.6], yaw: Math.PI, target: [60.6, 1.0, 53.5] },
    { id: 'w2-vantage-reading-a', at: [51.0, 8.4, 66.8], yaw: 0, target: [51.2, 5.5, 73.0] },
    { id: 'w2-vantage-reading-b', at: [52.6, 8.4, 66.8], yaw: 0, target: [51.6, 5.5, 73.0] },
  ] as const;
  const point = (id: string) => W2.debugPoints.find((d) => d.id === id)!;

  it('four vantage points, each on a floor, each pair at least 1.0 m apart', () => {
    for (const v of VANTAGES) {
      const p = point(v.id);
      expect([p.pos.x, p.pos.y, p.pos.z, p.yaw], v.id).toEqual([...v.at, v.yaw]);
      expect(downHit(solid, p.pos.x, p.pos.y + 0.5, p.pos.z, p.pos.y - 0.5), v.id).toBeCloseTo(p.pos.y, 6);
    }
    for (const [a, c] of [[0, 1], [2, 3]] as const) {
      const pa = point(VANTAGES[a].id).pos;
      const pc = point(VANTAGES[c].id).pos;
      expect(hyp2(pa.x - pc.x, pa.z - pc.z)).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('every vantage reads at most 0.45 over all W2 lamps (ambient 0.244); no guard post or route point within 6 m on its floor band', () => {
    for (const v of VANTAGES) {
      const p = point(v.id).pos;
      const level = levelAt(W2_LAMPS, 0.244, p.x, p.y, p.z);
      console.info(`W2 vantage ${v.id}: level ${level.toFixed(3)}`);
      expect(level, v.id).toBeLessThanOrEqual(0.45);
      const near = guardPoints().filter((g) => Math.abs(g.y - p.y) < 2 && hyp2(g.x - p.x, g.z - p.z) < 6);
      expect(near.map((g) => g.who), v.id).toEqual([]);
    }
  });

  for (const v of VANTAGES) {
    it(`${v.id}: the eye (floor + 1.6) sees ${v.target.join(', ')} with no collide piece between (sampled every 0.05 m, stopped 0.3 m short)`, () => {
      const p = point(v.id).pos;
      expect(sightBlock([p.x, p.y + 1.6, p.z], v.target)).toBeNull();
    });
  }
});

describe('W2: the west downpipe (E11)', () => {
  it('the anchor: the map\'s only pipeV (level-design 2.5), base (47.5, 4.5, 61.6), top 8.4, side 0; the graph\'s pipe link has its base; the rainwater head is visual only', () => {
    const pipes = b.anchors.pipesV;
    expect(pipes).toHaveLength(1);
    const p = pipes[0]! as { base: { x: number; y: number; z: number }; top: { x: number; y: number; z: number }; side: number };
    expect([p.base.x, p.base.y, p.base.z]).toEqual([47.5, 4.5, 61.6]);
    expect([DOWNPIPE.x, DOWNPIPE.z]).toEqual([47.5, 61.6]);
    expect(p.top.y).toBeCloseTo(8.4, 9);
    expect(p.side).toBe(0);
    const link = linksOf('pipe').filter((l) => l.from === 'w2-walkway' && l.to === 'w2-arcade-roof');
    expect(link).toHaveLength(1);
    expect(link[0]!.at).toEqual([p.base.x, p.base.y, p.base.z]);
    expect(link[0]!.level_change).toBeCloseTo(3.9, 9);
    // the rainwater head x 47.3-47.7, z 61.45-61.75, y 7.85-8.25: built, and not in the collision
    const head = b.boxes.find((q) => Math.abs(q.c[0] - 47.5) < 1e-9 && Math.abs(q.c[2] - 61.6) < 1e-9 && Math.abs(q.c[1] - 8.05) < 1e-9);
    expect(head).toBeDefined();
    expect(head!.collide).toBe(false);
    expect(solid.includes(head!)).toBe(false);
  });

  it('the foot: the climber\'s spot (47.5, 61.25) stands on the walkway floor; nothing solid within a body radius of the climb line from 4.6 to 8.3', () => {
    expect(downHit(solid, 47.5, 5.5, 61.25, 4.0)).toBeCloseTo(4.5, 9);
    const r = MOVEMENT.radius;
    const near = solid.filter((p) => bottom(p) < 8.3 && top(p) > 4.6 && hyp2(Math.max(Math.abs(47.5 - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(61.25 - p.c[2]) - p.s[2] / 2, 0)) < r);
    expect(near.map((p) => `box (${p.c.join(', ')}) size (${p.s.join(', ')})`)).toEqual([]);
  });

  it('the top: exactly one 8.4 ledge within 1.0 m of the pipe top (pipeLip): the lip (47.0, 61.85) -> (48.0, 61.85), normal (0, -1), hang and climb-up, with room for the climb-up and a standing body at the roomAt probe', () => {
    const tops = anchorsOf(b).ledges.filter((l) => Math.abs(l.top - 8.4) < 0.8 && l.canHang && Math.min(hyp2(l.a.x - 47.5, l.a.z - 61.6), hyp2(l.b.x - 47.5, l.b.z - 61.6), hyp2((l.a.x + l.b.x) / 2 - 47.5, (l.a.z + l.b.z) / 2 - 61.6)) <= 1.0);
    expect(tops).toHaveLength(1);
    const l = tops[0]!;
    expect([l.a.x, l.a.z, l.b.x, l.b.z, l.top]).toEqual([47.0, 61.85, 48.0, 61.85, 8.4]);
    expect([l.nx, l.nz]).toEqual([0, -1]);
    expect(l.canHang).toBe(true);
    expect(l.canClimbUp).toBe(true);
    expect(W2_DOWNPIPE_LIP).toEqual({ y: 8.4, a: { x: 47.0, z: 61.85 }, b: { x: 48.0, z: 61.85 }, n: { x: 0, z: -1 } });
    expect(climbRoom(solid, W2_DOWNPIPE_LIP)).toEqual([]);
    // the climb-up end, base - n x 0.55 = (47.5, 8.4, 62.15), has a floor; the roomAt probe at base - n x 0.6 has a standing body's room
    expect(downHit(solid, 47.5, 9, 62.15, 8)).toBeCloseTo(8.4, 9);
    const y0 = 8.45;
    const y1 = 8.45 + MOVEMENT.standHeight;
    const r = MOVEMENT.radius;
    const block = solid.filter((p) => bottom(p) < y1 && top(p) > y0 && hyp2(Math.max(Math.abs(47.5 - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(62.2 - p.c[2]) - p.s[2] / 2, 0)) < r);
    expect(block.map((p) => `box (${p.c.join(', ')}) size (${p.s.join(', ')})`)).toEqual([]);
  });

  it('joins the routes: with the bypass doors shut, the walkway reaches the foot and the top-out reaches the exit', () => {
    const { nav, restore } = soloNav(b, 4, W2.navSeeds, ALL_SHUT);
    try {
      expect(nav.findPath([60, 60.5], [47.5, 61.0], 1e6, 4.5, 4.5)).not.toBeNull();
      expect(nav.findPath([47.5, 62.6], [60, 66], 1e6, 8.4, 8.4)).not.toBeNull();
    } finally {
      restore();
    }
  });

  it('no solo bypass: the pipe base less the side-grab slack is over WALL_JUMP.maxUp above the arcade; nothing standable within 1.5 m on the arcade side; the lip is over WALL_JUMP.maxUp above the walkway', () => {
    expect(4.5 - 0.4).toBeGreaterThan(WALL_JUMP.maxUp);
    expect(W2_DOWNPIPE_LIP.y - 4.5).toBeGreaterThan(WALL_JUMP.maxUp);
    // pieces wholly at z >= 61.85 (the pawn stair's flight and fill behind the facade) are left out: the facade is between them
    const near = solid.filter((p) => {
      const t = top(p);
      if (t < 0.3 || t > 4.4 || Math.min(p.s[0], p.s[2]) < 0.38) return false;
      if (p.c[2] - p.s[2] / 2 >= 61.85 - 1e-6) return false;
      return hyp2(Math.max(Math.abs(47.5 - p.c[0]) - p.s[0] / 2, 0), Math.max(Math.abs(61.6 - p.c[2]) - p.s[2] / 2, 0)) <= 1.5;
    });
    // the west pier itself (x 44-48, z 59-62, top 4.5) is the walkway floor the pipe stands on, not a step under it
    expect(near.map((p) => `top ${top(p)} box (${p.c.join(', ')}) size (${p.s.join(', ')})`)).toEqual([]);
  });

  it('light: the foot reads lit with group 79 and dark with it cut; mid-climb and the top-out read dark', () => {
    const AMB = 0.244;
    const lit = levelAt(lampsOf(79), AMB, 47.5, 4.5, 61.25);
    const cut = levelAt([], AMB, 47.5, 4.5, 61.25);
    const mid = levelAt(lampsOf(79), AMB, 47.5, 6.5, 61.25);
    const topOut = levelAt(W2_LAMPS, AMB, 47.5, 8.4, 62.4);
    console.info(`W2 downpipe light: foot ${lit.toFixed(3)}, foot cut ${cut.toFixed(3)}, mid-climb ${mid.toFixed(3)}, top-out ${topOut.toFixed(3)}`);
    expect(lit).toBeGreaterThanOrEqual(0.79);
    expect(cut).toBeLessThanOrEqual(0.28);
    expect(mid).toBeLessThanOrEqual(0.28);
    expect(topOut).toBeLessThanOrEqual(0.28);
  });

  it('guard sight: from the beadle\'s z 50 leg the climb is seen; from his z 57 leg the foot is behind the pier', () => {
    expect(sightBlock([47.5, 1.55, 50], [47.5, 7.02, 61.25])).toBeNull();
    expect(sightBlock([47.5, 1.55, 57], [47.5, 5.52, 61.25])).not.toBeNull();
  });
});

describe('W2: source', () => {
  it('reserves no shutter, has the two drop guards and calls no placeShutter', () => {
    expect(W2.shutters).toEqual([]);
    expect(W2.dropGuards.map((g) => g.id)).toEqual(['w2-dg-stairhall', 'w2-dg-lightwell']);
    expect(readFileSync(new URL('../../src/world/maps/tallowWharfW2.ts', import.meta.url), 'utf8')).not.toContain('placeShutter(');
  });
});
