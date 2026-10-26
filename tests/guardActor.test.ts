import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AbstractMesh } from '../src/core/babylon';

// (guard-ai piano GA4) The GuardActor (a guard rig with no brain, the piano intro's actors) on a NullEngine: built from a
// grunt def as a guard builds his look, walks its path at its own rate (0.3x covers 0.3x the distance in the same real
// time), stops on the end point, fires on a re-arm in its own time, leaves nothing behind, and is no guard (no net, no
// enemy manager).

const DT = 1 / 60;

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3 } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { flags } = await import('../src/core/flags');
  const { GuardActor } = await import('../src/ai/guardActor');
  flags.guardModels = false;
  const scene = new Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const casters: AbstractMesh[] = [];
  const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: (m: AbstractMesh) => casters.push(m) };
  const flashes: { size: number; life: number }[] = [];
  const vfx = { muzzleFlash: (_p: unknown, size = 0.22, life = 0.05) => flashes.push({ size, life }) };
  type Opts = ConstructorParameters<typeof GuardActor>[4];
  const make = (path: number[], opts: Opts = {}) => new GuardActor(scene, world as never, ENEMIES.grunt, path, { vfx, ...opts });
  const run = (a: { step(dt: number): void }, seconds: number): void => {
    const n = Math.round(seconds / DT);
    for (let i = 0; i < n; i++) a.step(DT);
  };
  return { scene, casters, flashes, make, run, Vector3, grunt: ENEMIES.grunt };
}

describe('GuardActor (piano GA4)', () => {
  it('constructs from a grunt def: rig, gun and shadow casters, on the first point, not done', async () => {
    const s = await setup();
    const a = s.make([2, 3, 2, 10]);
    expect(s.casters.length).toBeGreaterThan(0);
    expect(a.pos.x).toBeCloseTo(2, 9);
    expect(a.pos.z).toBeCloseTo(3, 9);
    expect(a.pos.y).toBe(0);
    expect(a.done).toBe(false);
    expect(a.length).toBeCloseTo(7, 9);
    expect(a.yaw).toBeCloseTo(0, 9); // the first leg heads +Z
    // the muzzle is the drawn gun's, ahead of him at chest height
    const m = a.muzzle(new s.Vector3());
    expect(m.y).toBeGreaterThan(0.9);
    expect(m.y).toBeLessThan(1.8);
    expect(Math.abs(m.x - 2) + Math.abs(m.z - 3)).toBeLessThan(1.5);
    a.dispose();
  });

  it('a fixed y from the caller, or a nav height', async () => {
    const s = await setup();
    const a = s.make([0, 0, 0, 5], { y: 2.5 });
    expect(a.pos.y).toBe(2.5);
    const b = s.make([0, 0, 0, 5], { nav: { heightAt: (_x: number, z: number) => z * 0.1 } });
    s.run(b, 8);
    expect(b.pos.y).toBeCloseTo(b.pos.z * 0.1, 1);
    a.dispose();
    b.dispose();
  });

  it('rate 0.3 covers 0.3x the distance of rate 1 over the same real time', async () => {
    const s = await setup();
    const fast = s.make([0, 0, 0, 60]);
    const slow = s.make([10, 0, 10, 60], { rate: 0.3 });
    // both up to the walk (the slow one's start takes 1 / 0.3 as long in real time)
    s.run(fast, 5);
    s.run(slow, 5);
    expect(fast.travelled).toBeGreaterThan(0);
    // the same real interval at cruise
    const f0 = fast.travelled;
    const s0 = slow.travelled;
    for (let i = 0; i < 180; i++) {
      fast.step(DT);
      slow.step(DT);
    }
    const df = fast.travelled - f0;
    const ds = slow.travelled - s0;
    expect(df).toBeGreaterThan(1.5); // ~0.9 m/s x 3 s
    expect(ds / df).toBeGreaterThan(0.28);
    expect(ds / df).toBeLessThan(0.32);
    // the same actor time from rest is the same walk (start included)
    const a = s.make([0, 0, 0, 60]);
    const b = s.make([0, 0, 0, 60], { rate: 0.3 });
    s.run(a, 3);
    s.run(b, 10);
    expect(Math.abs(b.travelled - a.travelled)).toBeLessThan(a.travelled * 0.03);
    // setRate switches at once: from 0.3 to 1
    b.setRate(1);
    expect(b.playRate).toBe(1);
    const b0 = b.travelled;
    s.run(b, 1);
    expect(b.travelled - b0).toBeGreaterThan(0.8);
    for (const x of [fast, slow, a, b]) x.dispose();
  });

  it('stops on the end of the path (round a corner) with done, then idles there aimed', async () => {
    const s = await setup();
    const a = s.make([0, 0, 0, 2, 1.5, 2], { rate: 0.3 });
    a.aimAt(5, 1.3, 5);
    let seen = false;
    for (let i = 0; i < 60 * 40 && !a.done; i++) {
      a.step(DT);
      if (a.travelled > 1 && !a.done) seen = true;
    }
    expect(seen).toBe(true);
    expect(a.done).toBe(true);
    expect(a.length - a.travelled).toBeLessThan(0.05);
    expect(Math.abs(a.pos.x - 1.5) + Math.abs(a.pos.z - 2)).toBeLessThan(0.05);
    const x = a.pos.x;
    const z = a.pos.z;
    s.run(a, 10);
    expect(a.done).toBe(true);
    expect(a.pos.x).toBe(x);
    expect(a.pos.z).toBe(z);
    // facing the aim point (strafe-locked to it while walking and standing)
    const want = Math.atan2(5 - x, 5 - z);
    const err = Math.abs(Math.atan2(Math.sin(a.yaw - want), Math.cos(a.yaw - want)));
    expect(err).toBeLessThan(0.1);
    a.dispose();
  });

  it('a one-point path stands still and is done at once', async () => {
    const s = await setup();
    const a = s.make([4, -1], { yaw: 1 });
    expect(a.done).toBe(true);
    s.run(a, 2);
    expect([a.pos.x, a.pos.z]).toEqual([4, -1]);
    expect(a.yaw).toBeCloseTo(1, 6);
    a.dispose();
  });

  it('fire: re-arms on the def fire interval in its own time (scaled by the rate), the flash at its rate', async () => {
    const s = await setup();
    const gap = 60 / s.grunt.weapon!.rpm;
    const a = s.make([0, 0, 0, 5]);
    expect(a.fire()).toBe(true);
    expect(a.fire()).toBe(false);
    s.run(a, gap * 0.8);
    expect(a.fire()).toBe(false);
    s.run(a, gap * 0.3);
    expect(a.fire()).toBe(true);
    expect(s.flashes[0]!.life).toBeCloseTo(0.05, 9);
    const b = s.make([0, 0, 0, 5], { rate: 0.3 });
    expect(b.fire()).toBe(true);
    s.run(b, gap * 1.1); // past the rate-1 gap in real time: not re-armed at 0.3x
    expect(b.fire()).toBe(false);
    s.run(b, gap / 0.3 - gap * 1.1 + 2 * DT);
    expect(b.fire()).toBe(true);
    expect(s.flashes[s.flashes.length - 1]!.life).toBeCloseTo(0.05 / 0.3, 9);
    a.dispose();
    b.dispose();
    expect(b.fire()).toBe(false);
  });

  it('the real Vfx flash lasts 1 / rate as long (0.05 s at 1, ~0.17 s at 0.3)', async () => {
    const s = await setup();
    const { Vfx } = await import('../src/vfx/vfx');
    const vfx = new Vfx(s.scene);
    const lit = (): number => s.scene.meshes.filter((m) => m.name === 'fx-flash' && m.isVisible).length;
    const a = s.make([0, 0, 0, 5], { vfx, rate: 0.3 });
    expect(a.fire()).toBe(true);
    expect(lit()).toBe(1);
    vfx.update(0.1);
    expect(lit()).toBe(1);
    vfx.update(0.08);
    expect(lit()).toBe(0);
    a.setRate(1);
    s.run(a, 0.2);
    expect(a.fire()).toBe(true);
    vfx.update(0.06);
    expect(lit()).toBe(0);
    a.dispose();
  });

  it('dispose leaves no meshes or nodes behind (casters included)', async () => {
    const s = await setup();
    // the first build makes the shared part / merged-gun sources; count after it
    s.make([0, 0, 0, 1]).dispose();
    const meshes = s.scene.meshes.length;
    const nodes = s.scene.transformNodes.length;
    const c0 = s.casters.length;
    const a = s.make([0, 0, 0, 3]);
    a.aimAt(0, 1.4, 6);
    s.run(a, 1);
    a.fire();
    expect(s.scene.meshes.length).toBeGreaterThan(meshes);
    a.dispose();
    expect(a.isDisposed).toBe(true);
    expect(s.scene.meshes.length).toBe(meshes);
    expect(s.scene.transformNodes.length).toBe(nodes);
    for (let i = c0; i < s.casters.length; i++) expect(s.casters[i]!.isDisposed()).toBe(true);
    a.step(DT); // a step after dispose does nothing
    a.dispose(); // twice is safe
  });

  it('is no guard: never imports src/net nor references the enemy manager', () => {
    const src = readFileSync('src/ai/guardActor.ts', 'utf8');
    expect(src).not.toMatch(/from\s+['"][^'"]*\/net\//);
    expect(src).not.toMatch(/import\(\s*['"][^'"]*\/net\//);
    expect(src).not.toContain('EnemyManager');
    expect(src).not.toContain('Math.hypot');
    expect(src).not.toMatch(/from\s+['"]@babylonjs/);
    const path = readFileSync('src/ai/guardActorPath.ts', 'utf8');
    expect(path).not.toMatch(/^import /m);
  });
});
