# anim-bake-targets - state

## Now
PAUSED at the 5-hour meter (92%, ~03:30; resets ~04:00). Built and committed: the Body base key `body` (every Body
slider without a code value bakes there, read by every Wren rig with the tuner on top; guards never), tuckMul split
into `WREN_TUCK` per gun state (guards keep READY_ELBOW_TUCK / AIM_ELBOW_TUCK), the elbow pole named
(`ELBOW_POLE_OUT`). The export re-baked: dry run 13 baked, 0 manual, 61 already baked; real run wrote animBase.ts
body rows, WREN_TUCK rifle / pistol lowReady, the ledger. `npm run check` passes (2540 tests). Wren identity fixture
re-captured (10 of 39 changed; proven data-only by removing the body key and the tuck at run time: matched HEAD).

## Next (after the reset, when the orchestrator says)
1. The e2e extension: `__animBase.setBody('walk', 'trackMul', 0.3)` on a second Wren puppet (studio) changes its foot
   track or arm swing. Then `npm run build` and `e2e-anim e2e-studio e2e-weapons-carry` under the lock; if anti-crab
   or keyedWalk limits fail on trackMul 0.05 etc., widen only the failing gaits to measured + ~10%, marked
   `(anim-bake-targets) Michael's 2026-10-22 tune: was <old>`.
2. Fresh checker, one fix round; merge master once #96 lands; laptop full e2e; PR.

## Open
- The root offsets (bodyFwdAdd, bodyUpAdd, guardGapAdd, guardSideAdd) and wallGapAdd now bake and reach the local
  player through TUNE_LOCAL; the partner's and the puppets' roots are placed in `src/net` and the studio (outside the
  area), so they do not read them yet (BAKE.md notes it).
- Fix round done, uncommitted (orchestrator commits): applied bake ids are `hash@at` (`tuneBakedReset.ts`
  `bakeAppliedIds` / `bakesApplied`); a bare hash (4.46.x saves) covers the first ledger bake with it only, so the
  re-bake's 13 reset once. strideMul documented as the one Body exception (manual: shared target, pinned by a test);
  backlog item 29 lists the sliders that do not bake yet. `npm run check` and e2e-studio pass.
- Minor, not fixed: a version 1 export copies `aim` rows to `aimStill`, so an aim strideMul also yields an aimStill
  row "skipped: no bake rule" (strideMul has no aimStill group). Noise only.

## Done
- 2026-10-22 07:50: fix round: unique bake ids (checker blocking fix), strideMul exception docs and test, backlog 29.
- 2026-10-22 03:30: implementer (paused at 92%): the body key, the tuck split, the pole, the re-bake, unit tests.
- 2026-10-22 02:50: branch from feature/anim-bake-1022 7655fbcf; BRIEF, STATE.
