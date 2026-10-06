import { describe, expect, it } from 'vitest';
import { approachPoint, lethalFromHold, pickTakedown, TAKEDOWN, type TakedownInput } from '../src/game/takedown';
import { EXECUTE, executeStep, MARK, MarkSet } from '../src/game/marks';

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
    expect(pickTakedown(base({ state: 'lowCover', coverNx: 0, coverNz: -1, vz: 1.7 }))?.kind).toBe('overCover');
    // same side as the attacker (beyond reach for a ground takedown)
    expect(pickTakedown(base({ state: 'lowCover', coverNx: 0, coverNz: 1, vz: 1.7 }))).toBeNull();
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

describe('mark & execute', () => {
  it('marks toggle up to the max; the upgrade allows one more', () => {
    const m = new MarkSet();
    for (const id of ['a', 'b', 'c']) expect(m.toggle(id)).toBe(true);
    expect(m.toggle('d')).toBe(false);
    expect(m.toggle('b')).toBe(true);
    expect(m.ids).toEqual(['a', 'c']);
    const u = new MarkSet(MARK.maxUpgraded);
    for (const id of ['a', 'b', 'c', 'd']) expect(u.toggle(id)).toBe(true);
  });
  it('ready only with a charge and every mark clear; consuming spends the charge', () => {
    const m = new MarkSet();
    m.toggle('a');
    m.toggle('b');
    expect(m.ready(() => true)).toBe(false);
    m.earn();
    m.earn();
    expect(m.charges).toBe(1);
    expect(m.ready((id) => id !== 'b')).toBe(false);
    expect(m.ready(() => true)).toBe(true);
    expect(m.consume()).toEqual(['a', 'b']);
    expect(m.charges).toBe(0);
    expect(m.ids.length).toBe(0);
  });
  it('prunes dead marks', () => {
    const m = new MarkSet();
    m.toggle('a');
    m.toggle('b');
    m.prune((id) => id === 'b');
    expect(m.ids).toEqual(['b']);
  });
  it('the sequence visits each target in order, then ends', () => {
    expect(executeStep(3, 0).index).toBe(0);
    expect(executeStep(3, EXECUTE.perTarget * 1.5).index).toBe(1);
    expect(executeStep(3, EXECUTE.perTarget * 3 + 0.01).index).toBe(-1);
  });
});
