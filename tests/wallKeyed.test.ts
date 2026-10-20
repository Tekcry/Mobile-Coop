// (anim-rework S5) The wall keyed set (src/anim/wallKeyed.ts, S5-KEYS.md): the mirror by side and the graph's wall share.
import { describe, expect, it } from 'vitest';
import { AnimGraph, defaultInput } from '../src/anim/animGraph';
import { WALL_KEYS, WallKeyed } from '../src/anim/wallKeyed';
import { KEYED_WALL_IDLE } from '../src/anim/clips/keyed/wall_idle';
import { KEYED_WALL_CROUCH_IDLE } from '../src/anim/clips/keyed/wall_crouch_idle';
import { proportions } from '../src/player/proportions';

const mirrored = (crouch: number, move: number, peek: number) => {
  const a = new WallKeyed();
  const b = new WallKeyed();
  const pa = a.sample(0.3, 1.7, move, peek, crouch, 1);
  const pb = b.sample(0.3, 1.7, move, peek, crouch, -1);
  return { pa, pb, a, b };
};

describe('WallKeyed', () => {
  it('the other side is the mirror (pelvis sway, yaw / roll, arms), standing and crouched, still and peeking', () => {
    for (const [c, m, p] of [
      [0, 0, 0],
      [0, 0, 1],
      [1, 0, 0],
      [1, 0, 1],
    ] as const) {
      const { pa, pb } = mirrored(c, m, p);
      expect(pb.pel[0]).toBeCloseTo(-pa.pel[0]!, 6);
      expect(pb.pel[1]).toBeCloseTo(pa.pel[1]!, 6);
      for (let s = 0; s < 16; s += 4) expect(Math.abs(pb.q[s + 1]!)).toBeCloseTo(Math.abs(pa.q[s + 1]!), 6);
      expect(pb.arm[0]).toBeCloseTo(-pa.arm[6]!, 6);
    }
  });
  it('still: the idle clips\' values; crouched dy is the full crouch depth', () => {
    const w = new WallKeyed();
    const st = w.sample(0, 0, 0, 0, 0, 1);
    expect(w.half).toBeCloseTo(KEYED_WALL_IDLE.half, 9);
    expect(st.pel[1]).toBeGreaterThan(-0.07);
    const cr = w.sample(0, 0, 0, 0, 1, -1);
    expect(w.half).toBeCloseTo(KEYED_WALL_CROUCH_IDLE.half, 9);
    expect(cr.pel[1]).toBeLessThan(-0.2);
    expect(cr.hasWrist).toBe(1);
  });
});

describe('the graph plays the wall set', () => {
  const steady = (set: (i: ReturnType<typeof defaultInput>) => void, n = 90) => {
    const g = new AnimGraph(proportions());
    const i = defaultInput();
    i.wall = true;
    i.wallSide = 1;
    i.ready = true;
    i.armed = false;
    set(i);
    for (let k = 0; k < n; k++) g.update(1 / 60, i);
    return g.out;
  };
  it('holstered on a wall: the keyed weight is on and the rig gate opens; aiming or drawn it stays procedural', () => {
    const o = steady(() => {});
    expect(o.keyW).toBeGreaterThan(0.95);
    expect(o.keyDrawn).toBeGreaterThanOrEqual(WALL_KEYS.gate);
    expect(o.keyArmW).toBeGreaterThan(0.9);
    const drawn = steady((i) => ((i.ready = false), (i.armed = true), (i.raise = 1)));
    expect(drawn.keyW).toBeLessThan(0.05);
  });
  it('crouched on a wall: the keys carry the whole crouch depth (the procedural drop gives way)', () => {
    const o = steady((i) => ((i.crouch = 1), (i.wallTurn = 1)));
    expect(o.keyW).toBeGreaterThan(0.95);
    expect(Math.abs(o.pelvis.y)).toBeLessThan(0.05);
    expect(o.keyed.pel[1]).toBeLessThan(-0.2);
  });
});
