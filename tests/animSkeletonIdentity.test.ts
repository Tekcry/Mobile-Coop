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
 * (anim-natural-n2 step 2) Re-captured after the body motion layer: `partner:moves` moved (the one scenario walking on
 * foot along the facing, the layer's gate) and `keyed:skeleton_test` joined the capture; the other 38 are unchanged.
 * Before the re-capture the run with every BODY_MOTION amount at 0 matched the old fixture bit for bit (kept as
 * `tests/fixtures/anim-skeleton-identity-motion-off.json`, asserted by tests/bodyMotion.test.ts).
 * (anim-natural-n2, merge of master 4.54.1) Re-captured on the merged code: first, with every BODY_MOTION amount 0 and
 * master's run clip at run time, all 40 entries matched master's fixture bit for bit; the moved entries are keyed:run and
 * partner:moves (the A1 run key rebake), plus partner:moves with the layer on. The motion-off fixture re-captured too.
 * (anim-natural-n2 A12) Re-captured after the walk sway 0.98 -> 0.6: partner:moves only; the motion-off fixture unchanged.
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
