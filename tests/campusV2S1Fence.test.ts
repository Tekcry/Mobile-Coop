/**
 * (campus-s1-fence) Saltmarsh Park section 1, v2 layout: the perimeter is closed for a player on foot (Michael's walk of the
 * v4.119 preview: "you can also walk straight out of the fence and out of the playable area"). Built as the /preview/ build
 * has it (every campus section v2, `CAMPUS_V2_ALL`) with the art dressing on (`campusOps.build`), from the collision pieces
 * alone (Babylon-free):
 *  - a fine ground flood from the start (the body's radius, the controller's step) never leaves the palisade;
 *  - no top inside S1 is a launch over a perimeter line: from every standable top near a line, the player's mantle (the
 *    traversal probe's 1.3 m reach, `MANTLE` up) and its running leap (`LEAP`, gravity, the top gear: `soloJumpReach.ts`)
 *    both stay under the line's collision column there.
 * The second check over-approximates: every top near a line counts as reachable.
 */
import { describe, expect, it, vi } from 'vitest';
import { MOVEMENT } from '../src/config/movement';
import { hyp2 } from '../src/core/mathx';
import { generateLedges } from '../src/world/anchors';
import { MANTLE, SOLO_TOP_SPEED, lastTimeAtOrOver } from './helpers/soloJumpReach';
import { PROBE_REACH, bottom, collisionPieces, covers, groundFlood, hi, lo, rectDist, top } from './helpers/campusPerimeter';

vi.resetModules();
const { flags, CAMPUS_V2_ALL } = await import('../src/core/flags');
flags.campusV2 = CAMPUS_V2_ALL;
const { LevelBuilder } = await import('../src/world/levelBuilder');
const { campusOps } = await import('../src/world/maps/campusOps');
const { CAMPUS_PARTS, CAMPUS_V2_PARTS } = await import('../src/world/maps/campusSections');
const { S1_SPAWNS } = await import('../src/world/maps/campusV2/s1');

const b = new LevelBuilder();
campusOps.build(b, 0);

/** The collision pieces as plain axis-aligned boxes (`collisionPieces`: the shut doors too, the C1 near door among them). */
const pieces = collisionPieces(b);
/** The built boxes alone (the launch check's tops and columns). */
const solid = pieces.filter((p) => p.id.startsWith('#'));
const R = MOVEMENT.radius;
/** S1's plan box (the palisade, the pavilion's north face). */
const S1 = { x0: -40, x1: 26, z0: -80, z1: -30 } as const;
/** The perimeter lines (plan): the palisade south, east, west and north-east; the roof screens over the plant room and the
 *  pavilion's west end on x -40; the pavilion top's east screen. */
const LINES: readonly { id: string; a: readonly [number, number]; b: readonly [number, number] }[] = [
  { id: 'south', a: [-40, -80], b: [26, -80] },
  { id: 'east', a: [26, -80], b: [26, -34] },
  { id: 'west', a: [-40, -80], b: [-40, -30] },
  { id: 'north-east', a: [4, -34], b: [26, -34] },
  { id: 'pavilion east', a: [3.7, -34], b: [3.7, -30] },
];

/** The top of the unbroken collision column standing on the ground at a line point. */
function column(x: number, z: number): number {
  const iv = solid.filter((p) => covers(p, x, z, 0.01)).map((p) => [bottom(p), top(p)] as const).sort((a, c) => a[0] - c[0]);
  let t = 0;
  for (const [y0, y1] of iv) if (y0 <= t + 0.02 && y1 > t) t = y1;
  return t;
}

/** Every launch over a perimeter line: a standable top inside S1 from which the mantle or the running leap clears it. */
function launches(): string[] {
  const out = new Map<string, string>();
  for (const L of LINES) {
    const n = Math.round(hyp2(L.b[0] - L.a[0], L.b[1] - L.a[1]) / 0.1);
    for (let i = 0; i <= n; i++) {
      const x = L.a[0] + ((L.b[0] - L.a[0]) * i) / n;
      const z = L.a[1] + ((L.b[1] - L.a[1]) * i) / n;
      const bar = column(x, z);
      for (const p of solid) {
        const T = top(p);
        // part of the line's own column, too thin to stand on, low, outside S1 or S2's (its south face is z -30)
        if (T < 0.3 || covers(p, x, z, 0.01) || Math.min(p.s[0], p.s[2]) < 0.25 || p.c[2] > S1.z1 - 0.5) continue;
        if (Math.min(hi(p, 0), S1.x1) - Math.max(lo(p, 0), S1.x0) < 0.01 || Math.min(hi(p, 2), S1.z1) - Math.max(lo(p, 2), S1.z0) < 0.01) continue;
        const d = rectDist(p, x, z);
        if (d > 6) continue;
        // the top's nearest standing spot to the line: room over it for the body
        const qx = Math.min(hi(p, 0) - 0.15, Math.max(lo(p, 0) + 0.15, x));
        const qz = Math.min(hi(p, 2) - 0.15, Math.max(lo(p, 2) + 0.15, z));
        if (solid.some((o) => o !== p && covers(o, qx, qz) && bottom(o) > T - 0.05 && bottom(o) < T + 1.0)) continue;
        // a wall between that spot and the line, over the leap and across the body, takes the move
        let walled = false;
        for (const o of solid) {
          if (o === p || covers(o, x, z, 0.01) || top(o) < T + 0.9 || bottom(o) > T + MOVEMENT.standHeight) continue;
          for (let f = 0.05; f < 0.96 && !walled; f += 0.05) walled = covers(o, qx + (x - qx) * f, qz + (z - qz) * f);
          if (walled) break;
        }
        if (walled) continue;
        const t = lastTimeAtOrOver(T, bar + 0.05);
        const leap = t !== null && d <= SOLO_TOP_SPEED * t + R;
        const mantle = d <= PROBE_REACH && T + MANTLE >= bar;
        if (!leap && !mantle) continue;
        const key = `${L.id}|${p.c.join(',')}`;
        if (!out.has(key)) out.set(key, `${L.id}: ${mantle ? 'mantle' : 'leap'} off the top ${T.toFixed(2)} of the box at (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')}), ${d.toFixed(2)} m from (${x.toFixed(1)}, ${z.toFixed(1)}) where the line stands ${bar.toFixed(2)}`);
      }
    }
  }
  return [...out.values()];
}

describe('campus v2 S1 perimeter closed (campus-s1-fence)', () => {
  it('the preview build: section 1 comes from campusV2', () => {
    expect(CAMPUS_PARTS[0]).toBe(CAMPUS_V2_PARTS[0]);
  });

  it('walking: a ground flood from the start (body radius, step height, the C1 near door shut) never leaves the palisade', () => {
    // what stops the body on the ground: pieces over the step and under the head, the shut doors (the C1 near door among them)
    const s = S1_SPAWNS[0]!.pos;
    const { count, outside } = groundFlood(b, pieces, {
      x0: S1.x0 - 3,
      x1: S1.x1 + 3,
      z0: S1.z0 - 3,
      z1: S1.z1 + 3,
      cell: 0.05,
      seeds: [[s.x, s.z]],
      inside: (x, z) => x >= S1.x0 && x <= S1.x1 && z >= S1.z0 && z <= S1.z1,
    });
    // the ground flood fills the yard, the car park, the lane, the forecourt and the lawn
    expect(count).toBeGreaterThan(400000);
    expect(outside.slice(0, 5), `${outside.length} ground cells outside the palisade reached`).toEqual([]);
  });

  it('over the top: no top inside S1 is a mantle or a running-leap launch over a perimeter line', () => {
    expect(launches()).toEqual([]);
  });

  it('the anti-climb cap is collision only: not drawn, noLedge, no lip along it', () => {
    const caps = b.boxes.filter((p) => p.collide && p.visible === false && covers(p, p.c[0], p.c[2]) && LINES.some((L) => (L.a[0] === L.b[0] ? Math.abs(p.c[0] - L.a[0]) < 0.01 : Math.abs(p.c[2] - L.a[1]) < 0.01)) && bottom(p) >= 2.39);
    expect(caps.length).toBeGreaterThanOrEqual(LINES.length);
    for (const p of caps) expect(p.noLedge, `${p.c}`).toBe(true);
    const led = generateLedges(b.boxes).ledges;
    for (const p of caps) expect(led.filter((l) => Math.abs(l.top - top(p)) < 1e-3 && covers(p, (l.a.x + l.b.x) / 2, (l.a.z + l.b.z) / 2, 0.01)).length, `${p.c} lips`).toBe(0);
  });
});
