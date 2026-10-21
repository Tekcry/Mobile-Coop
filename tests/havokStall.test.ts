import { describe, expect, it } from 'vitest';
import { FIXED_DT, GameLoop, type LoopHooks } from '../src/core/loop';
import type { Engine, Scene } from '../src/core/babylon';

// (havok-stall) the fixed-step loop across a long timeScale 0 hold (the animation tuner's freeze) and its release:
// every frame runs a bounded number of steps and physics always gets FIXED_DT, whatever real time passed.

function rig() {
  const steps: number[] = [];
  const physDt: number[] = [];
  let fixed = 0;
  const physics = { _step: (d: number) => physDt.push(d) };
  const obs = { notifyObservers: () => {} };
  const scene = {
    physicsEnabled: true,
    isDisposed: false,
    getPhysicsEngine: () => physics,
    onBeforePhysicsObservable: obs,
    onAfterPhysicsObservable: obs,
    render: () => {},
  } as unknown as Scene;
  const hooks: LoopHooks = { fixedUpdate: () => void fixed++, frameUpdate: () => {} };
  const loop = new GameLoop({ getDeltaTime: () => 16.7 } as unknown as Engine);
  loop.attach(scene, hooks);
  const frame = (ms: number): number => {
    const before = fixed;
    (loop as unknown as { frame(ms: number): void }).frame(ms);
    steps.push(fixed - before);
    return fixed - before;
  };
  const acc = (): number => (loop as unknown as { acc: number }).acc;
  return { loop, frame, steps, physDt, acc };
}

describe('GameLoop pause / resume (havok-stall)', () => {
  it('a long timeScale 0 hold steps nothing and banks no time', () => {
    const r = rig();
    r.frame(16.7);
    r.loop.timeScale = 0;
    for (let i = 0; i < 120 * 60; i++) r.frame(16.7); // two minutes held
    for (let i = 0; i < 40; i++) r.frame(30000); // and long stalls of the page while held
    expect(r.steps.slice(1).every((n) => n === 0)).toBe(true);
    expect(r.acc()).toBeLessThan(FIXED_DT);
  });

  it('the release runs at most the per-frame cap and drops the backlog; physics only ever gets FIXED_DT', () => {
    const r = rig();
    r.loop.timeScale = 0;
    for (let i = 0; i < 600; i++) r.frame(16.7);
    r.loop.timeScale = 1;
    const first = r.frame(60000); // the first frame after the release can be a long real interval
    expect(first).toBeLessThanOrEqual(6);
    expect(r.acc()).toBeLessThan(FIXED_DT);
    for (let i = 0; i < 60; i++) expect(r.frame(16.7)).toBeLessThanOrEqual(1);
    expect(r.physDt.length).toBeGreaterThan(0);
    expect(r.physDt.every((d) => d === FIXED_DT)).toBe(true);
  });

  it('a non-finite interval never feeds the accumulator', () => {
    const r = rig();
    expect(r.frame(Number.NaN)).toBe(0);
    expect(r.frame(Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(6);
    expect(Number.isFinite(r.acc())).toBe(true);
    r.loop.timeScale = Number.NaN;
    expect(r.frame(16.7)).toBe(0);
    expect(Number.isFinite(r.acc())).toBe(true);
    r.loop.timeScale = 1;
    let n = 0;
    for (let i = 0; i < 60; i++) n += r.frame(1000 / 60);
    expect(n).toBeGreaterThanOrEqual(58);
  });

  it('normal play keeps 60 Hz fixed steps', () => {
    const r = rig();
    let n = 0;
    for (let i = 0; i < 600; i++) n += r.frame(1000 / 60);
    expect(Math.abs(n - 600)).toBeLessThanOrEqual(1);
    const q = rig();
    let m = 0;
    for (let i = 0; i < 300; i++) m += q.frame(1000 / 30);
    expect(Math.abs(m - 600)).toBeLessThanOrEqual(1);
  });
});
