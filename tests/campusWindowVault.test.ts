/**
 * (F42, F29 triage) Every window vault Saltmarsh Park (`campusOps`) declares can be made in play. A window anchor that
 * is open or breakable (`LevelBuilder.windowAt`) is a declared vault: `Traversal.windowProbe` (src/player/traversal.ts)
 * offers it only when the floor a stride (0.9 m) past the frame, cast down from the sill + 0.2, is within 0.6 m of the
 * feet, so a desk, counter or crate under the far side of the opening silently cancels it.
 *
 * Pure (the map built with the pure `LevelBuilder`, no Babylon physics): the floor cast is a vertical ray against the
 * collision pieces (boxes turned by their yaw, cylinders; a ray that starts inside a piece misses it, as Havok's does).
 * For each window and each side:
 * - the take-off: the floor 0.85 m out on that side (as `scripts/e2e-anchors.mjs`) is 0.3-1.3 m under the sill (the
 *   window's `reach` band) with standing room above it; a side with no take-off offers no vault and is skipped;
 * - the landing: the floor 0.9 m past the frame on the far side, at the middle and both ends of the reach band
 *   (`reach`: |lat| <= w / 2 - 0.2), is found and within 0.6 m of the take-off floor (`windowProbe`);
 * - the body lands clear: no piece in the capsule (radius 0.3) from the landing floor + 0.2 to + 1.6;
 * - the arc is clear: the line from the take-off to the landing at the sill + 0.45 (the generic probe's `arcY`).
 * Ramps (pitched boxes) are left out of the floor cast; no campus window has one under it.
 * Run twice: on the live map and on the map with section 1 from its v2 rebuild (`flags.campusV2 = [1]`), so the v2
 * gatehouse (its own desks, W and E2) is guarded too.
 */
import { describe, expect, it, vi } from 'vitest';
import { LevelBuilder, type BoxPiece, type CylPiece } from '../src/world/levelBuilder';
import type { WindowAnchor } from '../src/world/anchors';
import { campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { MOVEMENT } from '../src/config/movement';
import { hyp2 } from '../src/core/mathx';

/** `Traversal.windowProbe`: the landing a stride past the frame, the floor cast from the sill + 0.2 down 2.5. */
const LAND_OUT = 0.9;
const LAND_FROM = 0.2;
const LAND_DEPTH = 2.5;
/** `windowProbe` refuses a landing more than this above or below the feet. */
const LAND_STEP = 0.6;
/** The take-off point (as `scripts/e2e-anchors.mjs`) and the window `reach` band: the sill 0.3-1.3 above the feet. */
const TAKE_OFF = 0.85;
const UP_MIN = 0.3;
const UP_MAX = 1.3;
/** The generic probe's arc height over the top (`arcY = topY + 0.45`). */
const ARC_UP = 0.45;
const E = 1e-6;

interface Pieces {
  boxes: BoxPiece[];
  cyls: CylPiece[];
}

/** The collision pieces of a built map (pitched boxes left out: no window lands on a ramp). */
function piecesOf(b: LevelBuilder): Pieces {
  return { boxes: b.boxes.filter((p) => p.collide && Math.abs(p.pitch) < 1e-3), cyls: b.cylinders.filter((c) => c.collide) };
}

/** Is (x, z) inside box p's plan (its yaw undone)? */
function inPlan(p: BoxPiece, x: number, z: number, pad = 0): boolean {
  const dx = x - p.c[0];
  const dz = z - p.c[2];
  const cs = Math.cos(p.yaw);
  const sn = Math.sin(p.yaw);
  const lx = dx * cs - dz * sn;
  const lz = dx * sn + dz * cs;
  return Math.abs(lx) <= p.s[0] / 2 + pad && Math.abs(lz) <= p.s[2] / 2 + pad;
}

/** The highest top under (x, z) between y0 and y0 - depth, or null (a piece the ray starts inside is missed). */
function floorAt(w: Pieces, x: number, z: number, y0: number, depth: number): number | null {
  let best: number | null = null;
  for (const p of w.boxes) {
    const top = p.c[1] + p.s[1] / 2;
    const bot = p.c[1] - p.s[1] / 2;
    if (top > y0 + E || top < y0 - depth - E || (bot < y0 && top > y0)) continue;
    if (inPlan(p, x, z) && (best === null || top > best)) best = top;
  }
  for (const c of w.cyls) {
    const top = c.c[1] + c.h / 2;
    if (top > y0 + E || top < y0 - depth - E) continue;
    if (hyp2(x - c.c[0], z - c.c[2]) <= c.r && (best === null || top > best)) best = top;
  }
  return best;
}

/** Is the point (x, y, z) inside a collision piece (grown by `pad` in plan)? */
function solidAt(w: Pieces, x: number, y: number, z: number, pad = 0): string | null {
  for (const p of w.boxes) {
    if (Math.abs(y - p.c[1]) > p.s[1] / 2) continue;
    if (inPlan(p, x, z, pad)) return `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) ${p.s.map((v) => v.toFixed(2)).join(' x ')}`;
  }
  for (const c of w.cyls) {
    if (Math.abs(y - c.c[1]) > c.h / 2) continue;
    if (hyp2(x - c.c[0], z - c.c[2]) <= c.r + pad) return `cylinder (${c.c[0].toFixed(2)}, ${c.c[2].toFixed(2)})`;
  }
  return null;
}

/** Standing room: the capsule (radius `MOVEMENT.radius`) clear from the floor + 0.2 to + 1.6 at (x, z). */
function bodyBlock(w: Pieces, x: number, y: number, z: number): string | null {
  for (let h = 0.2; h <= 1.6 + E; h += 0.2) {
    const s = solidAt(w, x, y + h, z, MOVEMENT.radius);
    if (s) return `${s} at +${h.toFixed(1)}`;
  }
  return null;
}

/** One side's vault through window `a`: null when that side offers none, else the reasons it cannot be made ([] = it can). */
function windowVault(w: Pieces, a: WindowAnchor, sd: 1 | -1): { feet: number; fails: string[] } | null {
  const nx = Math.sin(a.yaw);
  const nz = Math.cos(a.yaw);
  const tx = a.c.x + nx * TAKE_OFF * sd;
  const tz = a.c.z + nz * TAKE_OFF * sd;
  const feet = floorAt(w, tx, tz, a.sillHeight + LAND_FROM, LAND_DEPTH);
  if (feet === null) return null;
  const up = a.sillHeight - feet;
  if (up < UP_MIN || up > UP_MAX || bodyBlock(w, tx, feet, tz)) return null;
  const fails: string[] = [];
  const band = Math.max(0, a.w / 2 - 0.2);
  for (const lat of [-band, 0, band]) {
    const cx = a.c.x + nz * lat;
    const cz = a.c.z - nx * lat;
    const lx = cx - nx * LAND_OUT * sd;
    const lz = cz - nz * LAND_OUT * sd;
    const at = `lat ${lat.toFixed(1)} (${lx.toFixed(2)}, ${lz.toFixed(2)})`;
    const land = floorAt(w, lx, lz, a.sillHeight + LAND_FROM, LAND_DEPTH);
    if (land === null) {
      fails.push(`${at}: no floor within ${LAND_DEPTH} m under the sill + ${LAND_FROM}`);
      continue;
    }
    if (Math.abs(land - feet) > LAND_STEP) fails.push(`${at}: lands at ${land.toFixed(2)}, ${Math.abs(land - feet).toFixed(2)} m from the feet ${feet.toFixed(2)} (max ${LAND_STEP})`);
    const body = bodyBlock(w, lx, land, lz);
    if (body) fails.push(`${at}: no room for the body: ${body}`);
    // the arc: the take-off (at this lateral) to the landing, at the sill + 0.45
    const ay = a.sillHeight + ARC_UP;
    const sx = cx + nx * TAKE_OFF * sd;
    const sz = cz + nz * TAKE_OFF * sd;
    for (let k = 0; k <= 40; k++) {
      const f = k / 40;
      const hit = solidAt(w, sx + (lx - sx) * f, ay, sz + (lz - sz) * f);
      if (hit) {
        fails.push(`${at}: the arc at ${ay.toFixed(2)} hits ${hit}`);
        break;
      }
    }
  }
  return { feet, fails };
}

/** One built map: its collision pieces, its declared window vaults and its S1 objective. */
interface Built {
  w: Pieces;
  vaultable: WindowAnchor[];
  objective: (typeof CAMPUS_SECTORS)[number]['objective'];
  built: boolean;
}

/** The declared window vaults of a built map: open, or glazed and breakable (`windowProbe`'s gate). */
function builtOf(b: LevelBuilder, objective: Built['objective'], lay: unknown): Built {
  return { w: piecesOf(b), vaultable: b.anchors.windows.filter((a) => a.open || a.breakable), objective, built: !!lay };
}

const b = new LevelBuilder();
const live = builtOf(b, CAMPUS_SECTORS[0]!.objective, campusOps.build(b, 0));

// (F42, v2 S1) the same map with section 1 from its v2 rebuild (`flags.campusV2 = [1]`, the modules loaded fresh as
// `tests/campusV2S1.test.ts` does: the selection is made at load). The v2 gatehouse is 13.5..20 x -79..-72.5 with its own
// desks, the reception window W at (13.5, -76) and the open rear pane E2 at (20, -76).
vi.resetModules();
const v2Flags = await import('../src/core/flags');
v2Flags.flags.campusV2 = [1];
const v2Builder = await import('../src/world/levelBuilder');
const v2Ops = await import('../src/world/maps/campusOps');
const v2Sectors = await import('../src/world/maps/campusSectors');
const b2 = new v2Builder.LevelBuilder();
const v2 = builtOf(b2, v2Sectors.CAMPUS_SECTORS[0]!.objective, v2Ops.campusOps.build(b2, 0));
v2Flags.flags.campusV2 = [];

/** The window anchor at (x, z) among a map's windows (any state). */
const windowAt = (m: LevelBuilder, x: number, z: number): WindowAnchor | undefined => m.anchors.windows.find((a) => Math.abs(a.c.x - x) < E && Math.abs(a.c.z - z) < E);

describe.each([
  ['live', live],
  ['v2 S1 (flags.campusV2 = [1])', v2],
] as const)('campus window vaults (F42): %s', (_name, m) => {
  it('the campus declares window vaults (the S1 gatehouse rear window, the S5 sash among them)', () => {
    expect(m.built).toBe(true);
    expect(m.vaultable.length).toBeGreaterThanOrEqual(2);
    expect(m.vaultable.some((a) => Math.abs(a.c.x - 20) < E && Math.abs(a.c.z + 76) < E && a.open)).toBe(true);
  });

  it('every declared window vault lands within 0.6 m of its take-off floor, with room for the body and a clear arc', () => {
    const bad: string[] = [];
    for (const a of m.vaultable) {
      for (const sd of [1, -1] as const) {
        const r = windowVault(m.w, a, sd);
        if (r && r.fails.length) bad.push(`window ${a.id} (${a.c.x}, ${a.c.z}) from the ${sd > 0 ? '+normal' : '-normal'} side (feet ${r.feet.toFixed(2)}): ${r.fails.join('; ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every declared window vault can be taken from at least one side', () => {
    const none = m.vaultable.filter((a) => !windowVault(m.w, a, 1) && !windowVault(m.w, a, -1)).map((a) => `window ${a.id} (${a.c.x}, ${a.c.z})`);
    expect(none).toEqual([]);
  });

  it('S1 E2: the gatehouse rear window vaults both ways (the verge in, the gatehouse out), the PC desk clear of the landing', () => {
    const a = m.vaultable.find((x) => Math.abs(x.c.x - 20) < E && Math.abs(x.c.z + 76) < E)!;
    const outside = windowVault(m.w, a, 1);
    const inside = windowVault(m.w, a, -1);
    expect(outside, 'the verge side offers the vault').not.toBeNull();
    expect(inside, 'the gatehouse side offers the vault').not.toBeNull();
    expect(outside!.fails).toEqual([]);
    expect(inside!.fails).toEqual([]);
    // the objective terminal (`Interactables` 'terminal': a visual cabinet 0.45 x 0.7 at the objective, turned by its yaw)
    // stands clear of the landing column (x 20 - 0.9, z -76 +- 0.4, the capsule 0.3 round it) and on the PC desk
    const o = m.objective;
    const half = Math.abs(Math.sin(o.yaw)) > 0.5 ? [0.225, 0.35] : [0.35, 0.225];
    const landX = [20 - LAND_OUT - MOVEMENT.radius, 20 - LAND_OUT + MOVEMENT.radius];
    const landZ = [-76 - 0.4 - MOVEMENT.radius, -76 + 0.4 + MOVEMENT.radius];
    const overlaps = o.x + half[0]! > landX[0]! && o.x - half[0]! < landX[1]! && o.z + half[1]! > landZ[0]! && o.z - half[1]! < landZ[1]!;
    expect(overlaps, `the terminal at (${o.x}, ${o.z})`).toBe(false);
    expect(floorAt(m.w, o.x, o.z, 1.0, 1.0), 'the terminal stands on the PC desk (0.75)').toBeCloseTo(0.75, 6);
  });
});

describe('campus window vaults (F42): the v2 S1 gatehouse glazing', () => {
  it('the v2 S1 vault windows are the reception window W (breakable) and E2 (open), both vaultable both ways; the fixed panes are not vaults', () => {
    const w = windowAt(b2, 13.5, -76);
    const e2 = windowAt(b2, 20, -76);
    expect(w).toMatchObject({ open: false, breakable: true });
    expect(e2).toMatchObject({ open: true });
    for (const a of [w!, e2!]) {
      for (const sd of [1, -1] as const) {
        const r = windowVault(v2.w, a, sd);
        expect(r, `window (${a.c.x}, ${a.c.z}) side ${sd} offers the vault`).not.toBeNull();
        expect(r!.fails, `window (${a.c.x}, ${a.c.z}) side ${sd}`).toEqual([]);
      }
    }
    // the fixed rear pane E and the fixed north pane (A2) are closed and not breakable: no vault there
    for (const [x, z] of [[20, -73.8], [19.2, -72.5]] as const) {
      const a = windowAt(b2, x, z);
      expect(a, `pane (${x}, ${z})`).toBeDefined();
      expect(a!.open || a!.breakable, `pane (${x}, ${z})`).toBe(false);
    }
  });
});
