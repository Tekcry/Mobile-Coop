import { describe, expect, it } from 'vitest';
import { approachPoint, contactDelay, GRAB, GRAB_KINDS, lethalFromHold, pickTakedown, TAKEDOWN, type TakedownInput } from '../src/game/takedown';

const base = (o: Partial<TakedownInput> = {}): TakedownInput => ({ state: 'ground', ax: 0, ay: 0, az: 0, vx: 0, vy: 0, vz: 1.2, vyaw: 0, vCalm: true, los: true, ...o });

describe('takedown kinds', () => {
  it('behind (victim facing away) and front (facing the attacker)', () => {
    expect(pickTakedown(base({ vyaw: 0 }))?.kind).toBe('behind');
    expect(pickTakedown(base({ vyaw: Math.PI }))?.kind).toBe('front');
  });
  it('from the side only on a calm enemy', () => {
    expect(pickTakedown(base({ vyaw: Math.PI / 2 }))?.kind).toBe('side');
    expect(pickTakedown(base({ vyaw: Math.PI / 2, vCalm: false }))).toBeNull();
  });
  it('needs line of sight and reach', () => {
    expect(pickTakedown(base({ los: false }))).toBeNull();
    expect(pickTakedown(base({ vz: TAKEDOWN.reach + 0.2 }))).toBeNull();
  });
  it('aligns the attacker a stand-off behind the victim, facing it', () => {
    const p = pickTakedown(base())!;
    expect(Math.hypot(p.alignX - 0, p.alignZ - (1.2 - TAKEDOWN.standoff))).toBeLessThan(0.01);
    expect(Math.abs(p.faceYaw)).toBeLessThan(1e-6);
  });
  it('over low cover: only a victim across it', () => {
    expect(pickTakedown(base({ state: 'wallLow', coverNx: 0, coverNz: -1, vz: 1.7 }))?.kind).toBe('overCover');
    // same side as the attacker (beyond reach for a ground takedown)
    expect(pickTakedown(base({ state: 'wallLow', coverNx: 0, coverNz: 1, vz: 1.85 }))).toBeNull();
  });
  it('from above: a drop onto someone below, from a ledge / pipe / zipline too', () => {
    expect(pickTakedown(base({ ay: 3, vz: 1.5 }))?.kind).toBe('above');
    expect(pickTakedown(base({ state: 'zipline', ay: 2.5, vz: 2.5 }))?.kind).toBe('above');
    expect(pickTakedown(base({ ay: 6, vz: 1 }))).toBeNull();
  });
  it('from below: hanging at a lip, a guard standing over it is pulled down', () => {
    const p = pickTakedown(base({ state: 'hang', ay: 0, vy: 1.9, vz: 0.6 }))!;
    expect(p.kind).toBe('below');
    expect(p.victimTo!.y).toBeLessThan(0);
  });
  it('through a window: only across the window plane', () => {
    expect(pickTakedown(base({ state: 'window', winNx: 0, winNz: 1, az: -0.5, vz: 0.6 }))?.kind).toBe('window');
    expect(pickTakedown(base({ state: 'window', winNx: 0, winNz: 1, az: 0.5, vz: 0.55 }))).toBeNull();
  });
  it('approach path: reaches the aligned spot within 5 cm; a drop falls, a vault lifts', () => {
    const p = pickTakedown(base({ ay: 3, vz: 1.5 }))!;
    const o = { x: 0, y: 0, z: 0 };
    approachPoint(0, 3, 0, p, 1, o);
    expect(Math.hypot(o.x - p.alignX, o.y - p.alignY, o.z - p.alignZ)).toBeLessThan(0.05);
    approachPoint(0, 3, 0, p, 0.3, o);
    expect(o.y).toBeLessThan(3.3);
  });
  it('tap is non-lethal, hold is lethal', () => {
    expect(lethalFromHold(0.1)).toBe(false);
    expect(lethalFromHold(TAKEDOWN.lethalHold)).toBe(true);
  });
});

describe('Chaos Theory takedowns (3.2.0 phase 4)', () => {
  it('drop: from a hang, a pipe, a split, a zipline or a rope onto a guard 1.2-5 m below within 1 m of the landing', () => {
    for (const state of ['hang', 'pipe', 'split', 'zipline', 'rappel'] as const) {
      const p = pickTakedown(base({ state, ay: 3, vy: 0, vz: 0.6 }));
      expect(p?.kind, state).toBe('drop');
      // the fall takes the time to fall that far
      expect(p!.approach).toBeCloseTo(Math.sqrt((2 * 3) / 9.81), 2);
    }
    expect(pickTakedown(base({ state: 'split', ay: 1.0, vy: 0, vz: 0.5 }))).toBeNull();
    expect(pickTakedown(base({ state: 'split', ay: 5.5, vy: 0, vz: 0.5 }))).toBeNull();
    expect(pickTakedown(base({ state: 'split', ay: 3, vy: 0, vz: 1.2 }))).toBeNull();
    // the fall accelerates onto the aligned spot
    const p = pickTakedown(base({ state: 'pipe', ay: 3, vy: 0, vz: 0.6 }))!;
    const out = { x: 0, y: 0, z: 0 };
    approachPoint(0, 3, 0, p, 0.5, out);
    expect(out.y).toBeCloseTo(3 - 3 * 0.25, 5);
  });
  it('a hang still pulls a guard standing at the lip above (ledge pull)', () => {
    expect(pickTakedown(base({ state: 'hang', ay: 0, vy: 1.8, vz: 0.5 }))?.kind).toBe('below');
  });
  it('inverted on a pipe: a guard right beneath within 0.9 m', () => {
    const p = pickTakedown(base({ state: 'inverted', ay: 1.9, vy: 0, vz: 0.5 }));
    expect(p?.kind).toBe('inverted');
    expect(p!.approach).toBe(0);
    expect(p!.victimTo!.y).toBeGreaterThan(0);
    expect(pickTakedown(base({ state: 'inverted', ay: 1.9, vy: 0, vz: 1.1 }))).toBeNull();
    expect(pickTakedown(base({ state: 'inverted', ay: 4, vy: 0, vz: 0.3 }))).toBeNull();
  });
  it('the grab replaces the instant takedown from behind; its rules', () => {
    expect(GRAB_KINDS).toContain('behind');
    // (G7, AUDIT-WALLS rows 5, 11) footage: the hostage walk is capped at CT's 0.7 m/s (was gear 2, 1.4 m/s), the step-in
    // takes 0.42 s and the pull-in 0.6 s (was a 0.22 s snap), the guard held pelvis to pelvis about 0.3 m (was 0.42)
    expect(GRAB.speedCap).toBeGreaterThanOrEqual(0.5);
    expect(GRAB.speedCap).toBeLessThanOrEqual(0.9);
    expect(GRAB.approach).toBeCloseTo(0.42);
    expect(GRAB.pull).toBeCloseTo(0.6);
    expect(GRAB.approach + GRAB.pull).toBeLessThanOrEqual(1.2);
    expect(GRAB.hold).toBeCloseTo(0.32);
    expect(GRAB.spreadMul).toBeCloseTo(1.2);
    expect(GRAB.shoveStagger).toBeCloseTo(1.0);
    expect(GRAB.hesitate).toBeCloseTo(1.5);
  });
  it('(G7) the struggle starts at the contact: the grab from behind waits the grab approach, other sides the ground one', () => {
    // guard at the origin facing +z; an attacker behind (-z) and in front (+z)
    expect(contactDelay(0, -1.2, 0, 0, 0, false)).toBeCloseTo(GRAB.approach);
    expect(contactDelay(0, 1.2, 0, 0, 0, false)).toBeCloseTo(TAKEDOWN.approach);
    expect(contactDelay(0, -1.2, 0, 0, 0, true)).toBeCloseTo(TAKEDOWN.approach);
  });
});

describe('back-to-wall takedowns (step 12)', () => {
  // on a wall whose face (normal +z) is 0.35 m behind the attacker; its outside end at x = 0.2, past it is +x
  const wall = (o: Partial<TakedownInput>): TakedownInput => base({ state: 'wall', coverNx: 0, coverNz: 1, edgeX: 0.2, edgeZ: -0.35, edgeTx: 1, edgeTz: 0, ...o });
  it('a guard round the edge gives the corner takedown', () => {
    expect(pickTakedown(wall({ vx: 1.0, vz: -0.6, vyaw: 0 }))?.kind).toBe('corner');
    expect(pickTakedown(wall({ vx: 1.0, vz: -0.6, vyaw: Math.PI }))?.kind).toBe('corner');
  });
  it('a guard in front of the face is an ordinary takedown; one behind the wall is out of reach', () => {
    expect(pickTakedown(wall({ vx: -0.3, vz: 1.2, vyaw: 0 }))?.kind).toBe('behind');
    expect(pickTakedown(wall({ vx: -0.5, vz: -1.0, vyaw: 0 }))).toBeNull();
    expect(pickTakedown(wall({ vx: -0.5, vz: -1.0, vyaw: 0, edgeTx: undefined }))).toBeNull();
  });
  it('a low wall (crouched) maps to over-cover', () => {
    expect(pickTakedown(base({ state: 'wallLow', coverNx: 0, coverNz: -1, vz: 1.7 }))?.kind).toBe('overCover');
  });
});
