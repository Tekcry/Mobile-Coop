/**
 * (guard-ai S16 fix round, A88) The NOC pair's sight through arm-noc, the armoured clear window over the data hall (S4 #14-15,
 * the mezzanine at y 3.6, the pane x -3.5..7.5 at z 42, y 4.6..6.6). Pins the hall floor spots `e2e-sectorops.mjs` part 6
 * stands the player on: from both guards' eyes (their posts +-0.3 m) every chest / head height has a clear sight line,
 * each line crosses the armoured pane (made solid, the same line is blocked), and the first round's spots inside pod P1
 * (under its 3.0 roof, in its racks) have none. Pure geometry (`LevelBuilder`, `SightWorld`: clear panes pass sight).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, type BoxPiece } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { S4_ARMOURED } from '../src/world/maps/campusS4Data';
import { SightWorld } from '../src/game/sectorCheck';
import { EYE_STAND } from '../src/ai/perception';
import { ENEMIES } from '../src/ai/enemyDefs';

const b = new LevelBuilder();
campusOps.build(b, 0);
/** Every door leaf shut (the strictest case: a leaf only ever takes a sight line away). */
const leaves: BoxPiece[] = [];
for (const d of b.anchors.doors) {
  const cx = d.hinge.x + (Math.sin(d.yaw) * d.width) / 2;
  const cz = d.hinge.z + (Math.cos(d.yaw) * d.width) / 2;
  const alongX = Math.abs(Math.sin(d.yaw)) > 0.5;
  leaves.push({ c: [cx, d.hinge.y + 1.05, cz], s: alongX ? [d.width, 2.1, 0.1] : [0.1, 2.1, d.width], yaw: 0, pitch: 0, color: '#000', collide: true });
}
const isNocPane = (p: BoxPiece): boolean => p.glass === 'clear' && p.armoured === true && Math.abs(p.c[2] - 42) < 0.05 && Math.abs(p.c[0] - 2) < 0.05;
const world = new SightWorld([...b.boxes, ...leaves], b.cylinders);
/** The same world with arm-noc's pane as a solid piece (no `glass`): proves the pane is on the line. */
const walled = new SightWorld([...b.boxes.map((p) => (isNocPane(p) ? { ...p, glass: undefined } : p)), ...leaves], b.cylinders);

const noc = CAMPUS_SECTORS[3]!.guards.filter((g) => g.role === 'noc');
/** The e2e's hall floor spots (part 6, in its order) and the first round's spots (inside pod P1). */
const SPOTS: readonly (readonly [number, number])[] = [
  [-2.5, 30],
  [-2, 31],
  [-1.5, 32],
  [-2.5, 29],
];
const OLD_IN_POD: readonly (readonly [number, number])[] = [
  [2, 31],
  [0, 30],
  [2, 27],
];
const HEIGHTS = [0.9, 1.0, 1.15, 1.3, 1.45, 1.6];
const NUDGE = [-0.3, 0, 0.3];

describe('guard-ai S16 fix: the NOC pair see the hall floor through arm-noc', () => {
  it('the NOC pair are #14-15 on the mezzanine at the window, and arm-noc is one armoured clear pane x -3.5..7.5, y 4.6..6.6 at z 42', () => {
    expect(noc.map((g) => [g.x, g.y, g.z])).toEqual([
      [1, 3.6, 43],
      [3, 3.6, 43],
    ]);
    expect(S4_ARMOURED.some((a) => a.id === 'arm-noc')).toBe(true);
    const panes = b.boxes.filter(isNocPane);
    expect(panes.length).toBe(1);
    const p = panes[0]!;
    expect([p.c[1] - p.s[1] / 2, p.c[1] + p.s[1] / 2, p.s[2]]).toEqual([4.6, 6.6, 11]);
  });

  it('from both guards (posts +-0.3 m) every chest / head height at every e2e spot has a sight line, and each crosses the pane', () => {
    for (const g of noc) {
      const eye = (g.y ?? 0) + EYE_STAND * ENEMIES[g.kind].scale;
      for (const [x, z] of SPOTS) {
        for (const dx of NUDGE) {
          for (const dz of NUDGE) {
            for (const y of HEIGHTS) {
              const at = `#${g.x},${g.z} (+${dx}, +${dz}) -> (${x}, ${y}, ${z})`;
              expect(world.clear(g.x + dx, eye, g.z + dz, x, y, z), at).toBe(true);
              expect(walled.clear(g.x + dx, eye, g.z + dz, x, y, z), `${at}: the pane is on the line`).toBe(false);
            }
          }
        }
      }
    }
  });

  it('the first round\'s spots inside pod P1 (racks under the 3.0 roof) give no sight line at all', () => {
    for (const g of noc) {
      const eye = (g.y ?? 0) + EYE_STAND * ENEMIES[g.kind].scale;
      for (const [x, z] of OLD_IN_POD) for (const y of HEIGHTS) expect(world.clear(g.x, eye, g.z, x, y, z), `(${x}, ${y}, ${z})`).toBe(false);
    }
  });
});
