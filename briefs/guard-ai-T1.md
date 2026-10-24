status: open

# guard-ai T1: off-screen anim tier every 8th frame (guard-cap PLAN section 3, "T1 brief")

Lead: Night Shift | Guard AI Build. Model: Opus. Unit tests only: no e2e, no GPU, no npm run check, no perf run.


## Answer: M0 verdict (Guard AI Build, 2026-10-24 ~22:55, from origin/feature/guard-cap-results 6b9efc8f, run-m0 r1 / r2 on 6e8a450b, hardware GPU, epic)
Worst cell alert/facing, median of r1 / r2:
| Map, N | sim p95 (r1, r2 -> median) | sim growth vs N 0 (instrumented mean) | ai.anim | anim share | ai.manager share |
| --- | --- | --- | --- | --- | --- |
| campus 24 | 2.3, 3.0 -> 2.65 | 1.57 - 0.59 = 0.98 | 0.58 | 59% | 24% |
| campus 32 | 4.0, 2.8 -> 3.4 | 2.14 - 0.59 = 1.55 | 0.86 | 55% | 21% |
| ctcourse 24 | 4.6, 3.6 -> 4.1 | 2.28 - 0.51 = 1.77 | 1.02 | 58% | 15% |
| sectorops 32 (no N 0 cell: campus N 0 base) | 3.1, 5.7 -> 4.4 | 2.44 - 0.59 = 1.85 | 1.09 | 59% | 18% |
Sim p95 > 2.9 at 32 (campus, sectorops) and ctcourse 24; ai.anim >= 50% of the growth everywhere (campus 32 on the
clean-step mean: 49%, borderline). T1 NAMED. D1 not named (ai.manager 15-24% < 40%).

## Gate
- Opens only when guard-cap's M0 verdict (`docs/guard-cap/REPORT.md` "2026-10 re-measure" on origin/feature/guard-cap)
  names T1: sim p95 > 2.9 ms and `ai.anim` >= 50% of the sim growth (N vs 0), worst cell alert / facing, median of r1 / r2,
  at 24 and 32 (PLAN section 2). The lead flips line 1 to `status: open` and writes the M0 numbers under "Answer:".
- No merge gate: `animTier.ts` and `tests/animTier.test.ts` are free (PLAN section 4).

## Base and branch
- Base: origin/master at the time the brief opens (re-read line numbers then; quoted below from master d91d0e00).
- New branch `feature/guard-ai-t1-anim-tier`. One commit.

## Read first
CLAUDE.md "Hard rules"; docs/systems/agent-preamble.md (on master); guard-cap PLAN sections 2, 3 (T1 row, "T1 brief"), 4
(`git show origin/feature/guard-cap:docs/guard-cap/PLAN.md`); `src/ai/animTier.ts` whole; `tests/animTier.test.ts` whole.

## Only files
- `src/ai/animTier.ts`
- `tests/animTier.test.ts`
Untouched: `src/ai/animTierView.ts` (gm-perf owns it), `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, every other file.

## Build (exactly this, nothing else)
1. `animTier.ts:28`: `ANIM_TIER_OFFSCREEN = 4` -> `8`. Its doc comment (:27) says "Solve every Nth frame off-screen
   (guard-cap T1: 4 -> 8, off-screen only; the far tier is visible and stays 2)". No other constant, rule or the stepper
   changes: `ANIM_TIER_FAR_PERIOD` stays 2, `ANIM_TIER_NEAR_PLAYER` 4, the FROZEN tier, its carry cap and the thaw as they are.
   The off-screen carry stays uncapped (header :8 and :33 say so; keep).
2. Header (:1-21): the off-screen bullet (:12-13) already names the constant; add nothing but "(guard-cap T1: 8)".
3. `tests/animTier.test.ts`:
   a. :28 `expect(ANIM_TIER_OFFSCREEN).toBe(4)` -> `toBe(8)` (the one place the number is pinned).
   b. :42-44 title "off-screen: every ANIM_TIER_OFFSCREEN th frame, near or far"; both expects `toBe(ANIM_TIER_OFFSCREEN)`.
   c. :61 `toBe(4)` -> `toBe(ANIM_TIER_OFFSCREEN)`.
   d. New case in `describe('animTierStep')`: with `solves(slot, ANIM_TIER_OFFSCREEN, 32)`: 4 solves 8 frames apart for
      slot 0; slots 0-7 put exactly one solve on every frame 1-32; 16 slots exactly two.
   e. New case: the carry over a run of `ANIM_TIER_OFFSCREEN` periods: solved time + `st.carry` equals the dt sum (as
      :110-130) and no solve returns more than `ANIM_TIER_OFFSCREEN` frames of dt.
   Keep the literal-4 stepper tests (:87-108, :110-139, :184-195): they test `animTierStep`, not the constant.
4. Hot path: nothing new allocates; no `Math.hypot`. Pure file: no Babylon, no flags, no graphics import.

## Run
- `npx tsc --noEmit -p .`
- `npx vitest run --maxWorkers=2 tests/animTier.test.ts tests/guardBody.test.ts tests/sectorGuardFreezeView.test.ts tests/guardLod.test.ts`
  (`guardLod.test.ts:51` calls the LOD2 half-rate rule "every 4th frame": frame numbers, not the constant; it must pass).
- Every test file importing `animTier.ts`'s direct importers (`animTierView.ts`, `enemy.ts`):
  `git grep -lE "ai/(animTier|animTierView|enemy|enemyManager)['\"]" -- tests` plus the tests importing
  `tests/helpers/teamDoorRig.ts` (49 files on d91d0e00), with `--maxWorkers=2`. Note: catch-all Proxy test doubles
  (e.g. `consoleNoticeA4.test.ts:95`) hide a missing method; T1 adds none.
- eslint on the two files.

## Done when
- Diff = only the two files; tsc, eslint and every listed vitest file green (counts before / after in the report).
- A failing test outside `tests/animTier.test.ts` = stop: `status: blocked <test, assert>`; never loosen another test.
- Branch pushed. Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Report at the end of this file (files with line numbers, tests with counts, deviations), then line 1
  `status: done feature/guard-ai-t1-anim-tier <sha>`.
- After done (lead, not you): M0 rerun `away` cells A/B, laptop `e2e-sectorops`, `e2e-enemies`. Look: none (off-screen only).
