/**
 * anim-skeleton S2 (A5): every joint that existed before T3 is bit-identical after the runtime rig change, untuned: the
 * rig's world matrices and local TRS and the poser's output on every LOD file, for every keyed clip, a set of
 * procedural states and a partner-style sequence. The fixture was captured by `tests/helpers/animSkeletonIdentity.ts`
 * on the pre-S2 code (4e3cbbda) with `ANIM_SKELETON_CAPTURE=1`.
 * (anim-bake-1022) Re-captured after the bake of Michael's 2026-10-22 tune (dbd466c7: the jog / run keys, the rifle and
 * pistol low ready, the base table's idle / walk / jog upperArm roll), which changed 33 of the 39 hashes. Before the
 * re-capture, the run with the pre-bake data restored at run time (the old jog / run clips, the low ready and pistol
 * ready, now WREN_READY_LOW / WREN_PISTOL_READY, an empty base) matched the 4e3cbbda fixture bit for bit: the bake changed data, not the rig code.
 * (anim-bake-targets) Re-captured after the body key and WREN_TUCK bake (10 of 39 changed); first, with the body key
 * removed and WREN_TUCK at 1 at run time, the run matched the previous fixture bit for bit.
 * (anim-natural N1) Re-captured for the foot planner's turn rules: 2 of 39 moved (state:aimRifle, the aimed spot
 * turn's rules; partner:moves). With the planner forced to turnRule 0 the old fixture matched bit for bit.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runIdentity, type IdentityFixture } from './helpers/animSkeletonIdentity';

const FIXTURE = 'tests/fixtures/anim-skeleton-identity.json';
const CAPTURE = process.env.ANIM_SKELETON_CAPTURE === '1';

describe('anim-skeleton: bit identity of the pre-T3 joints (A5)', () => {
  it.skipIf(!CAPTURE)('captures the fixture (pre-S2 code only)', async () => {
    const got = await runIdentity();
    writeFileSync(FIXTURE, `${JSON.stringify(got, null, 1)}\n`);
  });

  it.skipIf(CAPTURE)('every clip, state and the partner path hash as before S2', async () => {
    expect(existsSync(FIXTURE)).toBe(true);
    const want = JSON.parse(readFileSync(FIXTURE, 'utf8')) as IdentityFixture;
    const got = await runIdentity();
    // every pre-T3 scenario is still run; clips added after the capture (skeleton_test, S3b) are not part of it
    for (const id of Object.keys(want)) expect(got[id], `${id} still runs`).toBeDefined();
    expect(Object.keys(got).length).toBeGreaterThanOrEqual(28 + 10 + 1);
    for (const id of Object.keys(want)) {
      const w = want[id]!;
      const g = got[id]!;
      expect(g.last, `${id} last rig frame`).toEqual(w.last);
      expect(g.rig, `${id} rig`).toBe(w.rig);
      expect(g.poser, `${id} poser`).toEqual(w.poser);
    }
  });
});
