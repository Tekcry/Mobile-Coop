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
 * (anim-natural-n2, merge of master 4.55.1: #110's key_clip half) Re-captured on the merged code (the run clip takes
 * master's re-measured half 0.05042 over N2's A1 keys until the rebake): first, with every BODY_MOTION amount 0 and
 * master's run clip at run time, all 40 entries matched master's fixture bit for bit; with N2's run clip only
 * partner:moves differs (keyed:run now matches: its hash follows the half), and the layer on moves partner:moves only.
 * The motion-off fixture re-captured too (master's but partner:moves).
 * (anim-natural N1) Re-captured for the foot planner's turn rules: 2 of 39 moved (state:aimRifle, the aimed spot
 * turn's rules; partner:moves). With the planner forced to turnRule 0 the old fixture matched bit for bit.
 * (anim-natural N1, master 4.55.1 merge) Re-captured on the merge: with the planner forced to turnRule 0 the run matched
 * master's fixture (170ee701) on 40 of 40 entries; with the turn rules on only partner:moves moved (1 of 40).
 * (anim-natural N1, master 4.56.0 merge + rule A2) Not re-captured: the capture equals both fixtures. With the planner
 * forced to turnRule 0 the run matched master's (79216e49) on 40 of 40 (guards 64 of 64); with the turn rules on
 * partner:moves (1 of 40) and the guards' 24 walk / dash / aimWalk rows differ from master, as before.
 * (anim-natural N2, merge of N1 08023227 on master 4.58.0) Re-captured on the combined code: with every BODY_MOTION amount
 * 0, KEY_MOTION at its identity and master's / N1's run clip at run time, the run matched N1's fixture on 40 of 40
 * entries; with the planner forced to turnRule 0 it matched N2's on 40 of 40. Only partner:moves moved from N2's (1 of
 * 40: the turn rules on the layer); from N1's keyed:run (N2's A1 run keys) and partner:moves (2 of 40). The motion-off
 * fixture re-captured too (N2's but partner:moves); the guard fixture is N1's, unchanged.
 * (anim-natural N2, #138 fix round: N1's planner pushes uncrossed feet in the body frame too, crouch entry re-steps the
 * right foot first) Re-captured: partner:moves only (both fixtures); with the turn rules off (turnRule 0) the planner
 * is bit-identical, so nothing else can move.
 * (anim-natural N2, #138 fix round 2: the keyed pelvis offsets change at most 1.2 m/s, KEY_PEL_RATE) Re-captured:
 * partner:moves only (both fixtures); under the rate the rig is unchanged (the guard fixture never moves).
 * (anim-natural N2, #138 fix round 4: the walk sway 0.6 at 0.75 -> 1.2 at 0.98, A14; KNEE_REST.fwd 0.03) Re-captured:
 * partner:moves only (1 of 40); the motion-off and guard fixtures unchanged (the squat's knee rest is in no entry).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { runIdentity, type IdentityFixture } from './helpers/animSkeletonIdentity';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

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
