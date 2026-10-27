# guard-rules PR4 (#595): master merge check
Owner: Guard AI Build (checker). Status: done.

**Verdict: PASS**

Scope: merge commit eaf6a1dd1 ("Merge origin/master 4.116.0 into feature/guard-rules-pr4"), parents b111c9aa1 (PR4)
and 1b58989ed (origin/master, still its tip at check time), merge base 48394def2. PR4's own content passed in
PR4-RECHECK-A / -B on d9c4d0e8c and is not re-reviewed here.

## 1. Conflict resolutions
- `docs/systems/ai.md`: the G335 line keeps master's newer text (G378 vent lookout, talking pairs built, `guardPairs`
  J15) and ends with "Lookouts: built dark behind `lookouts` (guard-rules S7, A9; Posts below)." The G327 line is
  master's (G382, built J4 #438). PR4's older wording of both lines is superseded, nothing of substance lost. Every other
  PR4 hunk in ai.md (the lookout paragraph under Posts, the S8 dog release under Sector tags) is on the merge unchanged.
- `scripts/e2e-sectorops.mjs`: master's H8 block (`want(7)`, "every guard of sections 2-5 is alive") is whole, then
  PR4's `postSite` helper, then the posts block that calls it.

## 2. Nothing lost from either side
In all 8 files both sides touched (TESTING.md, docs/systems/ai.md, scripts/e2e-sectorops.mjs,
scripts/e2e-stealth-ai.mjs, src/ai/enemy.ts, src/ai/enemyManager.ts, src/game/modes/sectorMode.ts,
src/world/maps/campusS5Data.ts) the changed lines of `diff base..PR4` equal those of `diff master..merge`, and those of
`diff base..master` equal those of `diff PR4..merge`. The only difference is ai.md's conflict line above. Both diffs
touch the same 27 files.

Semantics against master's changes:
- S5 roof marksman (S9): live `campusS5Data.ts` #19 keeps `post: { leash: 1, lookout: true }` at (-40, YR 8.4, 43);
  master only changed the S5 imports, the objective label and added `S5_PARTS`. Production uses the v1 parts
  (`CAMPUS_V2_ON` is empty), so with `?lookouts=1` he is the lookout. `tests/campusPosts.test.ts` ("the only lookout")
  passes.
- Master's campus v2 copy (`campusV2/s5Data.ts:68-69`) puts #19 at the same spot and roof height (YR 8.4) with no
  lookout post: "guard-rules PR4 not on master: SW-5 carries his lookout post". That deferral is planned
  (campus-greybox PLAN.md:120, BRIEF.md:189, briefs/S5.md:345: carried by S5-b or SW-5), so it is not a merge error. See
  the notes.
- Dog release stages: `releaseDogs: true` holds on S4 stage 2 and S5 stage 1 in both the live data
  (`campusS4Data.ts:209`, `campusS5Data.ts:188`) and the v2 data (`campusV2/s4Data.ts:244`, `campusV2/s5Data.ts:211`).
  The v2 sections still have dogs with handlers (S4 one, S5 two). `SectorStageRun.raise` returns `dogs`.
  `sectorMode.stageActions` has two callers: the section start (`live` false, S8-a) and the live raise. Master added no
  third caller.
- enemy.ts / enemyManager.ts: `releaseHeel`, `slotPost`, `lookoutStep` and the reset paths sit on master's code
  without a change in meaning. Every field they read exists (typecheck).

## 3. e2e-sectorops.mjs
- `want(n)` is a predicate (`PART === 0 || PART === n`), not a one-shot key, so repeated numbers cannot collide. The two
  `want(7)` blocks (S3 part, H8) are master's and each runs once on part 7. PR4's posts block and lookouts block are
  one `want(1)` block each, at 2690 and 2798, so each runs once on part 1 and never runs twice.
- `postSite` is a top-level `const` at 2659. Its only two uses (2696, 2804) come after it at top level. No earlier
  block references it, so there is no TDZ error.
- `node --check scripts/e2e-sectorops.mjs`: OK.

## Commands run
- `npm run typecheck:fast`: clean.
- `npx vitest run` on lookout, dogRelease, posts, postsWiring, campusPosts, sectorStageActions, campusS5, campusV2,
  campusV2S4Guards, campusV2S5, campusV2S5Guards: 11 files, 151 tests passed.

## Notes (no FIX)
- When PR4 lands, `campusV2/s5Data.ts:68`'s comment ("PR4 not on master") goes stale. Until SW-5 (or S5-b) adds
  `post: { leash: 1, lookout: true }` to v2 #19, /preview/ (lookouts on, campusV2 every section) shows no lookout on
  S5's roof, so walk item 6 there would not find him. The fix is one line, on the plan's owner. Carry it before the
  lookouts walk if that walk runs on /preview/.

## Polish
- None.
