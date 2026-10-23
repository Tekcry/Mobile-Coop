/**
 * guard-render S5: guard `CharacterRig.animate` micro-benchmark (NullEngine, opt-in; never times anything in the normal
 * run). `GUARD_ANIM_BENCH=1`: warm 300 frames, 5 runs of 600 frames of 24 guards, per-guard ms per frame and the median.
 * `GUARD_ANIM_BENCH=breakdown`: the same loop with inclusive timers on the rig's / graph's / planner's methods (wrapped
 * from here only) and a count of `TransformNode.computeWorldMatrix` calls per guard per frame. Timer overhead inflates
 * the breakdown: read it for shares, not absolute numbers. No active camera: every rig solves every frame.
 */
import { describe, expect, it } from 'vitest';
import type { CharacterRig, RigPose } from '../src/player/characterRig';

const MODE = process.env.GUARD_ANIM_BENCH;
const DT = 1 / 60;
const N = 24;

type Kind = 'patrol' | 'idle' | 'aimWalk' | 'crouch';
const KINDS: Kind[] = [
  ...Array<Kind>(12).fill('patrol'),
  ...Array<Kind>(6).fill('idle'),
  ...Array<Kind>(4).fill('aimWalk'),
  ...Array<Kind>(2).fill('crouch'),
];

function setPose(kind: Kind, rig: CharacterRig, p: RigPose): void {
  switch (kind) {
    case 'patrol': p.speed = 1.4; p.localZ = 1; p.aim = 0.2; p.stride = 'facing'; p.velZ = 1.4; p.crouch = 0; break;
    case 'idle': p.speed = 0; p.localZ = 0; p.aim = 0.2; p.velZ = 0; p.crouch = 0; break;
    case 'aimWalk': p.speed = 1; p.localZ = 1; p.aim = 1; p.stride = 'velocity'; p.velZ = 1; p.crouch = 0; break;
    case 'crouch': p.speed = 0; p.localZ = 0; p.aim = 1; p.velZ = 0; p.crouch = 1; break;
  }
  rig.root.position.z += p.speed * DT;
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1]!;
}

describe('guard-render S5: guard animate bench', () => {
  it.skipIf(!MODE)('times 24 guards', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, TransformNode } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { buildEnemyRig } = await import('../src/ai/enemyRig');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { AnimGraph } = await import('../src/anim/animGraph');
    const { FootPlanner } = await import('../src/anim/footPlanner');

    const scene = new Scene(new NullEngine());
    const parts = new PartLibrary(scene);
    const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
    const rigs: CharacterRig[] = [];
    const poses: RigPose[] = [];
    for (let i = 0; i < N; i++) {
      const { rig } = buildEnemyRig(scene, world as never, ENEMIES.grunt, `g${i}`);
      rig.root.position.x = i * 3;
      rigs.push(rig);
      poses.push({ speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0.2, kick: 0 });
    }
    const frame = (): void => {
      for (let i = 0; i < N; i++) {
        setPose(KINDS[i]!, rigs[i]!, poses[i]!);
        rigs[i]!.animate(DT, poses[i]!);
      }
    };
    // pose setting is outside the timed window: pre-step then time only animate
    const timedFrame = (): number => {
      for (let i = 0; i < N; i++) setPose(KINDS[i]!, rigs[i]!, poses[i]!);
      const t0 = performance.now();
      for (let i = 0; i < N; i++) rigs[i]!.animate(DT, poses[i]!);
      return performance.now() - t0;
    };

    for (let f = 0; f < 300; f++) frame();

    if (MODE !== 'breakdown') {
      const runs: number[] = [];
      for (let r = 0; r < 5; r++) {
        let tot = 0;
        for (let f = 0; f < 600; f++) tot += timedFrame();
        runs.push(tot / 600 / N);
      }
      console.info(`bench per-guard ms/frame runs: ${runs.map((x) => x.toFixed(4)).join(' ')} | median ${median(runs).toFixed(4)} | min ${Math.min(...runs).toFixed(4)}`);
      expect(runs.length).toBe(5);
      return;
    }

    const acc = new Map<string, number>();
    const wrap = (proto: object, name: string, label = name): void => {
      const o = (proto as Record<string, (...a: unknown[]) => unknown>)[name]!;
      (proto as Record<string, unknown>)[name] = function (this: unknown, ...a: unknown[]) {
        const t0 = performance.now();
        try { return o.apply(this, a); } finally { acc.set(label, (acc.get(label) ?? 0) + performance.now() - t0); }
      };
    };
    const rp = CharacterRig.prototype as unknown as object;
    for (const m of ['animateFrame', 'applyTargets', 'solveArm', 'solveLegWorld', 'clearBody', 'switchFade', 'fingerFrame', 'goggleFrame', 'clavFrame', 'setWorldRot', 'limitJoint', 'applyFk']) wrap(rp, m);
    wrap(AnimGraph.prototype as unknown as object, 'update', 'AnimGraph.update');
    wrap(FootPlanner.prototype as unknown as object, 'update', 'FootPlanner.update');
    let computes = 0;
    const byName = new Map<string, number>();
    const tp = TransformNode.prototype as unknown as { computeWorldMatrix: (f?: boolean) => unknown; name: string };
    const origC = tp.computeWorldMatrix;
    tp.computeWorldMatrix = function (this: { name: string }, force?: boolean) {
      computes++;
      const nm = this.name.replace(/^g\d+/, 'g#');
      byName.set(nm, (byName.get(nm) ?? 0) + 1);
      return origC.call(this, force);
    };
    const FR = 600;
    let total = 0;
    for (let f = 0; f < FR; f++) total += timedFrame();
    tp.computeWorldMatrix = origC;
    const per = FR * N;
    const us = (ms: number): number => (ms * 1000) / per;
    const animUs = us(total);
    const lines = [`animate (timers on): ${animUs.toFixed(1)} us/guard/frame`];
    const row = (k: string, v: number): void => { lines.push(`${k.padEnd(20)} ${v.toFixed(1).padStart(8)} us ${((v / animUs) * 100).toFixed(1).padStart(6)}%`); };
    const af = us(acc.get('animateFrame') ?? 0);
    row('animate-animateFrame', animUs - af);
    for (const [k, v] of [...acc.entries()].sort((a, b) => b[1] - a[1])) row(k, us(v));
    lines.push(`computeWorldMatrix calls/guard/frame: ${(computes / per).toFixed(1)}`);
    const top = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k}:${(v / per).toFixed(2)}`);
    lines.push(`top nodes (per guard per frame): ${top.join(' ')}`);
    console.info(lines.join('\n'));
    expect(acc.size).toBeGreaterThan(0);
  }, 600000);
});
