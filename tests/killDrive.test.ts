// (piano-knife S1) The kill drive on a graph's targets: nothing at weight 0 with no buckle, the buckle folds only the
// spine and chest (a pitch), and a call allocates nothing of its own.
import { describe, expect, it } from 'vitest';
import { emptyTargets } from '../src/anim/animGraph';
import { KQ, newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { MOCAP_LAYERS } from '../src/anim/mocap';
import { killDriveTargets, newKillDrive } from '../src/anim/killDrive';
import { MOCAP_CROSS_PUNCH } from '../src/anim/clips/mixamo/cross_punch';
import { bytesPerCall, HEAP_NUMBER, inputs } from './helpers/allocPerCall';

/** Every number of the targets that `killDriveTargets` may touch (the keyed pose's channels and the weights). */
function snap(o: ReturnType<typeof emptyTargets>): number[] {
  const k = o.keyed as unknown as Record<string, unknown>;
  const out: number[] = [o.keyW, o.keyArmW, o.keyMocap, o.keyTrunk, o.keyDrawn, o.keyScan, o.keyKneeOut, o.clipFeet.valid ? 1 : 0, o.clipFeet.on ? 1 : 0];
  for (const name of Object.keys(k).sort()) {
    const v = k[name];
    if (v instanceof Float64Array || v instanceof Float32Array) out.push(...v);
    else if (typeof v === 'number') out.push(v);
  }
  return out;
}

describe('piano-knife S1: the kill drive', () => {
  it('weight 0 and no buckle: the targets untouched', () => {
    const o = emptyTargets();
    o.keyed.q[KQ.spine + 3] = 1;
    o.keyed.q[KQ.chest + 3] = 1;
    const before = snap(o);
    const d = newKillDrive();
    d.clip = MOCAP_CROSS_PUNCH;
    d.phase = 0.4;
    d.w = 0;
    d.buckle = 0;
    d.bucklePitch = 0.35;
    killDriveTargets(d, o);
    expect(snap(o)).toEqual(before);
  });

  it('the buckle pitches the spine (40%) and the chest (60%) only', () => {
    const o = emptyTargets();
    const q = o.keyed.q;
    q[KQ.spine + 3] = q[KQ.chest + 3] = q[KQ.pelvis + 3] = q[KQ.neck + 3] = 1;
    const before = snap(o);
    const qBefore = Array.from(q);
    const d = newKillDrive();
    d.w = 0;
    d.buckle = 1;
    d.bucklePitch = 0.3;
    killDriveTargets(d, o);
    for (let i = 0; i < q.length; i++) {
      const inSpine = i >= KQ.spine && i < KQ.spine + 4;
      const inChest = i >= KQ.chest && i < KQ.chest + 4;
      if (!inSpine && !inChest) expect(q[i], `q[${i}]`).toBe(qBefore[i]);
    }
    // an identity turned by a pitch about x: (sin(a/2), 0, 0, cos(a/2))
    expect(q[KQ.spine]!).toBeCloseTo(Math.sin((0.3 * 0.4) / 2), 9);
    expect(q[KQ.spine + 1]!).toBeCloseTo(0, 12);
    expect(q[KQ.spine + 2]!).toBeCloseTo(0, 12);
    expect(q[KQ.chest]!).toBeCloseTo(Math.sin((0.3 * 0.6) / 2), 9);
    expect(q[KQ.chest + 3]!).toBeCloseTo(Math.cos((0.3 * 0.6) / 2), 9);
    // nothing else of the targets moved (the weights, the other channels)
    const after = snap(o);
    let changed = 0;
    for (let i = 0; i < after.length; i++) if (after[i] !== before[i]) changed++;
    expect(changed).toBeLessThanOrEqual(8);
  });

  /**
   * 1000 calls. The drive's own work (the buckle, the mix, the weights) allocates nothing; the clip sample it calls,
   * `keyed.sampleKeyed` (the graph's and the Chamber drive's sampler, not this slice's), leaves ~32 B per call on master
   * already, so a call with a clip is held to that sampler's own reading (+ a heap number of noise), not to 0.
   */
  it('1000 calls allocate nothing of their own (buckle only: 0; with a clip: no more than the sampler)', async () => {
    const P = inputs(1000, (k) => k / 1000);
    const o = emptyTargets();
    const b = newKillDrive();
    b.buckle = 0.5;
    b.bucklePitch = 0.2;
    const perBuckle = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) killDriveTargets(b, o);
    }, HEAP_NUMBER, { n: 1000 });
    const pose = newKeyedPose();
    const perSample = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sampleKeyed(MOCAP_CROSS_PUNCH!, P[k]!, 1, pose, MOCAP_LAYERS);
    }, HEAP_NUMBER, { n: 1000 });
    const d = newKillDrive();
    d.clip = MOCAP_CROSS_PUNCH;
    d.w = 0.7;
    d.buckle = 0.5;
    d.bucklePitch = -0.18;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        d.phase = P[k]!;
        o.keyW = 0;
        killDriveTargets(d, o);
      }
    }, HEAP_NUMBER, { n: 1000 });
    console.info(`(piano-knife S1) killDriveTargets: ${per.toFixed(1)} B per call (buckle only ${perBuckle.toFixed(1)}, sampleKeyed alone ${perSample.toFixed(1)})`);
    expect(perBuckle).toBeLessThanOrEqual(HEAP_NUMBER);
    expect(per).toBeLessThanOrEqual(perSample + HEAP_NUMBER);
  }, 120_000);
});
