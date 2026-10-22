/**
 * (marlow-final S-switch) A client's wall switch press. A client builds no `StealthSystems` (`GameState` makes it only for
 * the host: `puppet` skips the enemy branch), so the client's `switch-0` is the host's item mirrored by `CoopClient.syncItems`
 * and its press is a `use` to the host. The host takes a client's `use` only within the item's reach + 0.75 m of where it
 * has the client (`inUseReach`), the anti-cheat rule every mirrored item follows. The A1 e2e pressed from the yard, 8.8 m
 * away: dropped. These cases pin the rule against the real A1 layout and the in-cabin standpoint the e2e now uses.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import { propCollisionBox } from '../src/world/props/facilityProps';
import { inUseReach, type PulseItem } from '../src/net/holdPulse';
import { parseMessage } from '../src/net/protocol';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const lay = built.layout;

/** The reach `StealthSystems` gives a wall switch (read from the source so the test follows it). */
const SWITCH_REACH = Number(/switch-\$\{i\}[\s\S]*?it\.reach = ([\d.]+);/.exec(readFileSync(new URL('../src/game/stealthSystems.ts', import.meta.url), 'utf8'))?.[1]);
/** Where the A1 e2e stands the client to press the yard switch (`SWITCH_STAND`, scripts/e2e-ctcourse/a1Gate.mjs). */
const STAND = { x: 7.7, z: 15.8 };
/** Where the A1 e2e had the client when it pressed (the yard). */
const YARD = { x: 14, z: 9 };
const BODY_R = 0.35;

function switchItem(i: number): PulseItem {
  const s = lay.switches![i]!;
  return { id: `switch-${i}`, progress: 0, enabled: true, done: false, holdTime: 0, reach: SWITCH_REACH, pos: { x: s.pos.x, y: s.pos.y, z: s.pos.z } };
}

/** Distance in XZ from (x, z) to a box of centre c, size s, turned by yaw. */
function boxDist(x: number, z: number, c: readonly number[], s: readonly number[], yaw: number): number {
  const dx = x - c[0]!;
  const dz = z - c[2]!;
  const co = Math.cos(yaw);
  const si = Math.sin(yaw);
  const lx = dx * co - dz * si;
  const lz = dx * si + dz * co;
  return Math.hypot(Math.max(Math.abs(lx) - s[0]! / 2, 0), Math.max(Math.abs(lz) - s[2]! / 2, 0));
}

describe('marlow-final S-switch: a client presses the A1 yard switch', () => {
  it('switch-0 is the yard switch (group 12) in the cabin; a switch reaches 1.3 m', () => {
    const s = lay.switches![0]!;
    expect(s.group).toBe(12);
    expect(Math.hypot(s.pos.x - 7.7, s.pos.z - 15.15)).toBeLessThan(0.3);
    expect(SWITCH_REACH).toBe(1.3);
  });

  it('the host drops a press from the yard (out of reach) and takes one from the cabin standpoint', () => {
    const it0 = switchItem(0);
    expect(inUseReach(it0, YARD.x, 0.1, YARD.z)).toBe(false);
    expect(inUseReach(it0, STAND.x, 0.1, STAND.z)).toBe(true);
  });

  it('the standpoint is inside the cabin and clear of its walls, desk and props', () => {
    expect(STAND.x).toBeGreaterThan(7 + 0.1 + BODY_R);
    expect(STAND.z).toBeGreaterThan(15 + 0.1 + BODY_R);
    for (const p of b.boxes) {
      if (!p.collide) continue;
      const lo = p.c[1] - p.s[1] / 2;
      const hi = p.c[1] + p.s[1] / 2;
      if (hi <= 0.1 || lo >= 1.8) continue;
      expect(boxDist(STAND.x, STAND.z, p.c, p.s, p.yaw), `box at ${p.c.join(',')}`).toBeGreaterThan(BODY_R);
    }
    for (const pl of lay.facilityProps ?? []) {
      for (const pb of propCollisionBox(pl) ?? []) {
        const lo = pb.c[1] - pb.s[1] / 2;
        const hi = pb.c[1] + pb.s[1] / 2;
        if (hi <= 0.1 || lo >= 1.8) continue;
        expect(boxDist(STAND.x, STAND.z, pb.c, pb.s, pb.yaw), `${pl.prop} at ${pl.x},${pl.z}`).toBeGreaterThan(BODY_R);
      }
    }
  });

  it('the client press is the plain `use` of the mirrored id (no wire change)', () => {
    expect(parseMessage({ t: 'use', id: 'switch-0' })).toEqual({ t: 'use', id: 'switch-0' });
  });
});
