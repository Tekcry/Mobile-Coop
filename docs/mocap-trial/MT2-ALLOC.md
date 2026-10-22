# mocap-trial-2, alloc: crouch capture allocation case flaky at its limit

Branch `feature/mt2-alloc` (from feature/mocap-trial-2 40c60294).

## Measured (tests/mocapCrouch.test.ts, "the capture leaves no object a frame over the hand-keyed sneak", switch on)
HEAP_NUMBER is 16 B; the assert is `on <= sneak + 8 * 16`.

| | sneak B/frame | capture B/frame | capture - sneak |
| --- | --- | --- | --- |
| before (3 runs) | 1779.5 / 1779.5 / 1779.0 | 1907.5 x3 | 128 / 128 / 128.5 (limit 128: failed 2 of 6 runs) |
| after (3 runs) | 1779.5 x3 | 1779.5 x3 | 0 / 0 / 0 |

## Cause
`bodyMotion` is far past V8's inlining budget. The crouch commit made the mocap layer block run on the crouched capture
too (`sM = keyMocap + mcK > 0`), and that block made six `mocapLayerK(scale, share)` calls (trunk, sway, head, nod,
arm cap) that each boxed their double argument / result: 8 boxed doubles (128 B) a frame, exactly the allowance. The
sneak never takes the block (`mcK` is 0). Same pattern as MT2-FIX2 task 1. Bisecting the other crouch hunks was not
needed: after this change the difference is 0.

## Change (src/anim/animGraph.ts only)
The `if (sM > 0)` block in `bodyMotion` becomes a call to a new small private method `mocapMotionLayer(mo, s)` with the
`mocapLayerK` multipliers written out as ternaries (`a === 1 ? 1 : s === 1 ? a : 1 + (a - 1) * s`, the same formula as
`mocapLayerK` / `layerMul` for `s > 0`), so outputs are bit-identical. `mocapLayerK` itself and the other call sites
(`stopSettle`, `weightLoad`: standing gait only) are unchanged. No behaviour change; switch OFF untouched (`sM` is 0).

## Tests
mocapCrouch 6/6, keyedCrouch 8/8, animSkeletonIdentity, animSkeletonGuardIdentity, mocapSwitch 13/13, mocapFix2 11/11,
footPlanner 12/12 pass; `tsc --noEmit -p .` and `eslint src/anim/animGraph.ts src/anim/mocap.ts` clean. Assert not loosened.

## Changelog entry for the lead
Mocap crouch: the crouched capture no longer allocates per frame over the hand-keyed sneak (motion layer scales inlined).
