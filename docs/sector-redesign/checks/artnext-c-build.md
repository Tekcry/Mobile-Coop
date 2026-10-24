# artnext lane C build: guard render-freeze polish, C1-C6 (2026-10-23, Opus builder, Cloud Builder 1)

Branch `feature/sector-redesign-artnext-c` off `feature/sector-redesign-artpol` @ 72e87171. Items C1-C6 of the
campus-art-next brief, lane C. C7-C9 (`src/ai/animFrozen.ts`, `src/ai/enemy.ts`) wait for the lead (animFrozen folds into
master's `animTier.ts` with #226); not touched. Render only, host and client the same; gameplay reads nothing here; no
`src/ai`, `src/net`, PROTOCOL, save or lighting change; nothing allocated per frame (one number property on the ray
closure, read twice per evaluation).

## Items
| # | Result | Where |
| --- | --- | --- |
| C1 stale hidden verdict on frustum re-entry | already done (frzpol): a hidden verdict whose frustum bits gain a part (0 -> > 0 included, `prev` = 0) gets `memoWait = 0` and urgent | `src/game/sectorGuardFreezeView.ts:213-216`; test "a hidden guard coming back into the frustum is re-tested at once" (`tests/sectorGuardFreezeView.test.ts:203`) |
| C2 knee point | already done (frzpol): `FREEZE_KNEE` 0.4, the 5th body point | `src/game/sectorGuardFreeze.ts:138`, `:170`; test `tests/sectorGuardFreeze.test.ts:138` |
| C3 moon shadow off a roof edge | already done (frzpol): `shadowProbe` along the moon down to `y - shadowDrop`, `shadowLanding` samples where it stops below his floor; cast in `occluded3` | `src/game/sectorGuardFreeze.ts:190-226`, `src/game/sectorGuardFreezeView.ts:265-276` (probe loop); tests `tests/sectorGuardFreeze.test.ts:147`, `tests/sectorGuardFreezeView.test.ts:252` |
| C4 forced neck / head test | done (test only): twin grunt rigs on one spot behind the camera, only one in the freeze's list; 40 frames of the same walk / turn / glance input on both while one is frozen (root disabled); `neck`, `headNode`, `hips`: `computeWorldMatrix(true)` + `getAbsolutePosition()` equal to 1e-6, world matrices equal | `tests/sectorGuardFreezeView.test.ts:280-316` |
| C5 over-budget non-edge verdict | `STALE = RETEST` already done (`src/game/sectorGuardFreezeView.ts:51`, used `:233`); test added: 16 edge guards (due every evaluation) fill `TESTS_PER_EVAL`, a far guard last in the list; over 60 evaluations every evaluation where he is due (> `RETEST` since his test) and untested draws him, a fresh verdict is kept | `tests/sectorGuardFreezeView.test.ts:318-357` |
| C6 `rays` counts recasts | done: `FreezeRay` carries an optional `recasts` count; `seeThroughRay` adds one per cast after the first; the freeze adds this evaluation's recasts to `rays` | `src/game/sectorGuardFreezeView.ts:30-33`, `:79`, `:87-88`, `:100-101`, `:137`, `:185`, `:251-252`; test `tests/sectorGuardFreezeSeeThrough.test.ts:220-256` |

Mutation checks (reverted): `memoAge <= 8` (the old STALE) fails the C5 test (a due guard kept frozen); not animating
the frozen twin fails the C4 test (head 0.30 m off).

## Notes
- C4 checks the rig path the gameplay readers use (forced matrix on a disabled root). In the game, perfg's FROZEN anim
  tier (`src/ai/enemy.ts:2803`) skips `rig.animate` while frozen, so a frozen guard's forced limbs hold the pre-freeze
  pose under the current root until the thaw. No gameplay reader meets that: a guard in a takedown (`taken`), dead or a
  dog is never frozen, client puppets are never frozen, and the head hit volume is the sim's `guardHead`. C7 (thaw
  solve) is the lead's.
- `__sector.debug().guardFreezeRays` (`src/game/modes/sectorMode.ts:1031`, not touched) now includes recasts; the
  per-evaluation bound in the build notes (`TESTS_PER_EVAL x FREEZE_TEST_RAYS`) is for primaries, plus up to
  `SEE_THROUGH_SKIPS` recasts per primary.

## Tests (cloud, unit only)
- `npx tsc --noEmit -p .` clean; `npx eslint` on the 3 changed files clean.
- `tests/sectorGuardFreeze.test.ts` 13/13 (unchanged), `tests/sectorGuardFreezeView.test.ts` 8 -> 10,
  `tests/sectorGuardFreezeSeeThrough.test.ts` 6 -> 7. Total 27 -> 30, all pass (`--maxWorkers=2`).

## Laptop GPU (lead checklist item 3)
`guardFreezeRays` with see-through recasts: look through the S1 window / a cracked door at a guard; the count should
rise by one per recast.
