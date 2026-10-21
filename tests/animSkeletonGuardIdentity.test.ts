/**
 * anim-skeleton #88 fix (A5 for guards): a guard's rig (plain CharacterRig, each enemy kind's build and height) is
 * bit-identical after S2 on every pre-T3 joint. Gameplay reads a guard's head (perception eye) and the hit volumes follow
 * the rig, so this pins that the clavicle / finger / goggle work changes nothing a guard does. The fixture was captured
 * by `tests/helpers/animSkeletonGuardIdentity.ts` on the pre-S2 code (39b97591) with `ANIM_SKELETON_CAPTURE=1`.
 * (anim-bake-1022) Re-captured after the bake of Michael's 2026-10-22 tune (dbd466c7): READY_POSES.low is the shared
 * rig's rifle low ready, so every armed kind changed (48 of 64; runner and dog unchanged). Before the re-capture, the run
 * with the pre-bake data restored at run time matched the 39b97591 fixture bit for bit: data, not code.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runGuardIdentity, type GuardFixture } from './helpers/animSkeletonGuardIdentity';

const FIXTURE = 'tests/fixtures/anim-skeleton-guard-identity.json';
const CAPTURE = process.env.ANIM_SKELETON_CAPTURE === '1';

describe('anim-skeleton: guard rigs bit-identical on the pre-T3 joints (A5)', () => {
  it.skipIf(!CAPTURE)('captures the fixture (pre-S2 code only)', async () => {
    writeFileSync(FIXTURE, `${JSON.stringify(await runGuardIdentity(), null, 1)}\n`);
  });

  it.skipIf(CAPTURE)('every enemy kind and pose hashes as before S2', async () => {
    expect(existsSync(FIXTURE)).toBe(true);
    const want = JSON.parse(readFileSync(FIXTURE, 'utf8')) as GuardFixture;
    const got = await runGuardIdentity();
    expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
    expect(Object.keys(got).length).toBeGreaterThanOrEqual(8 * 8);
    for (const id of Object.keys(want)) expect(got[id], id).toEqual(want[id]);
  });
});
