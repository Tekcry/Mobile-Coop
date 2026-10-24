/** (guard-models S11) The guard figures' LOD table: bands (6 / 25 m, Wren keeps 8 / 25), bone folds, half-rate poses. */
import { describe, expect, it } from 'vitest';
import { GUARD_LOD, guardFolds, guardPosesNow } from '../src/operators/runtime/guardLod';
import { bandLod, LOD_EDGES } from '../src/operators/runtime/lodPick';
import { LOD_0, LOD_1, LOD_2 } from '../src/operators/runtime/manifest';

describe('GUARD_LOD', () => {
  it('bands: LOD0 under 6 m, LOD1 to 25 m, the 10 % hysteresis; Wren unchanged (8 / 25)', () => {
    expect(GUARD_LOD.edges).toEqual([6, 25]);
    const e = GUARD_LOD.edges;
    expect(bandLod(LOD_0, 6.5, e)).toBe(LOD_0);
    expect(bandLod(LOD_0, 6.7, e)).toBe(LOD_1);
    expect(bandLod(LOD_1, 5.5, e)).toBe(LOD_1);
    expect(bandLod(LOD_1, 5.3, e)).toBe(LOD_0);
    expect(bandLod(LOD_1, 28, e)).toBe(LOD_2);
    expect(LOD_EDGES).toEqual([8, 25]);
    expect(bandLod(LOD_0, 6.7)).toBe(LOD_0);
  });

  it('folds: fingers from LOD1 (both namings), toes and clavicles at LOD2 only; the rig joints never', () => {
    for (const f of ['fingerL_1_1', 'fingerR_5_1', 'fingerL_2_3']) {
      expect(guardFolds(LOD_0, f)).toBe(false);
      expect(guardFolds(LOD_1, f)).toBe(true);
      expect(guardFolds(LOD_2, f)).toBe(true);
    }
    for (const j of ['toeL', 'toeR', 'clavL', 'clavR']) {
      expect(guardFolds(LOD_1, j)).toBe(false);
      expect(guardFolds(LOD_2, j)).toBe(true);
    }
    for (const j of ['root', 'body', 'pelvis', 'chest', 'head', 'shL', 'wrL', 'wrR', 'anL', 'handL']) expect(guardFolds(LOD_2, j)).toBe(false);
    // the bake's LOD1 / LOD2 skin (23 rig joints): 23 bones at LOD1, 19 at LOD2
    const rig = ['root', 'body', 'pelvis', 'hipL', 'knL', 'anL', 'toeL', 'hipR', 'knR', 'anR', 'toeR', 'spine', 'chest', 'clavL', 'shL', 'elL', 'wrL', 'clavR', 'shR', 'elR', 'wrR', 'neck', 'head'];
    expect(rig.filter((j) => !guardFolds(LOD_1, j)).length).toBe(23);
    expect(rig.filter((j) => !guardFolds(LOD_2, j)).length).toBe(19);
  });

  it('half rate from LOD2: alternate parities per slot, never two frames without a pose; every frame below', () => {
    expect(GUARD_LOD.halfRateFrom).toBe(LOD_2);
    const run = (slot: number, frames: number[]): number[] => {
      let at = Number.NEGATIVE_INFINITY;
      const out: number[] = [];
      for (const f of frames) if (guardPosesNow(LOD_2, slot, f, at)) out.push((at = f));
      return out;
    };
    const all = [0, 1, 2, 3, 4, 5, 6, 7];
    expect(run(0, all)).toEqual([0, 2, 4, 6]);
    expect(run(1, all)).toEqual([0, 1, 3, 5, 7]); // (the first call always poses, then its own parity)
    expect(run(2, all)).toEqual([0, 2, 4, 6]);
    // called only on odd frames (an anim tier at half rate, out of phase): every call
    expect(run(0, [1, 3, 5, 7])).toEqual([1, 3, 5, 7]);
    // called every 4th frame (the off-screen tier): every call
    expect(run(1, [0, 4, 8])).toEqual([0, 4, 8]);
    for (const lod of [LOD_0, LOD_1]) expect(guardPosesNow(lod, 1, 4, 3)).toBe(true);
  });
});
