# sector-marks: plan check 2
Checker: Opus 5.5, 2026-10-25 19:00, PLAN at e0660bc4550bbf686869a8cdfbd6d1ea02383c36 (master b81c4945; no change to
the PLAN's files since 2148ec96).
Verdict: FIX

## Check 1 items
1. Claims block: fixed (PLAN:10-28), claims-check runs (see Claims). One file missing, fix 2 below.
2. campus-greybox overlap named with a ruling (PLAN:89-93). Workable for the labels, not complete (fix 1 below).
3. BRIEF clean: fixed, ends after A8 (BRIEF:68).
4. B1 diff check: fixed (B1:233 "plus `docs/sector-marks/*`").
5. "Michael said" / "picked": fixed. Said holds only G336 ~09:45 (ROADMAP:96) and G343 ~10:45, verbatim; G290, G351, Q26
   ~16:50 (ROADMAP:88) moved to "picked"; duplicate G351 gone; sector-batch line updated (PLAN:101).

## Intent
- ok: beacon (PLAN rows 1-3) = FOLDED-PLAN break 2 (:117), G290 "no markers"; lines (rows 4-6, 8) = break 3 (:118),
  G336 "Objectives must name what and where", G343 "a short, plain English objective", G351 "What and where"; row 7 =
  break 7 (:122), J6's Sector Ops line (:166). warehouseOps left out by Q26 "Freeze it" (ROADMAP:88), later than J5's
  row (:165). Nothing he asked for in Sector Ops is uncovered; nothing extra.
- note (orchestrator, not this job): the campaign runs as `infiltration` (briefingScreen.ts:110) and keeps its extract
  beacon (infiltrationMode.ts:158-159, BRIEF A1). VISION 4 rule 5 bans markers in the campaign too; no FOLDED-PLAN row
  owns it.

## Gates
- ok: no slice crosses VISION, a hard rule or a Michael-only rule; a rule fix to a shipped feature, no flag (G355).
  Not a map or look job. `src/net` change is one constructor argument, no wire or save change; two Opus checkers named.
- ok: code refs re-found on b81c4945: interactables.ts :5, :26, :81-84, :134-137 (a "no visuals" branch already exists
  at :112, same pattern); gameState.ts :43, :728 (inside `opts.mode !== 'sandbox'`), :839; coopClient.ts :18, :247;
  labels campusSectors :315 / :406, S4Data :180, S5Data :169; S4Dress :176; sectorMode :771 puts down `${id}-exit` in
  `setup` at the phase change, so the e2e assert after :91 finds it. `tests/sectorBolt.test.ts` 2-arg calls keep working.

## Claims
- claims-check (exit 1, 20 overlaps, all plan-level; no hunk on these branches within 2 lines of any line B1 edits):
  coop-kit, player-batch-j19 (`gameState.ts`, `coopClient.ts`); player-hygiene (`coopClient.ts`); hud-guidance, -a1, -a3
  (`gameState.ts`, `coopClient.ts`, `e2e-sectorops.mjs`, TESTING.md); map-ready (same four, map campusOps); guard-rules
  (`campusS4Data.ts`, `campusS5Data.ts`, `e2e-sectorops.mjs`, map campusOps; its rows :191-192 / :174-175, not the
  labels); test-runner-j20, -pra, -prc, -s1, -s2, -s3a, -s3b, -s4, -s5, -s6a, -s6b, -s6c (`e2e-sectorops.mjs`).
  PLAN:96-100 names all of them but lists only 4 of the 11 j20 branches.
- campus-greybox has no claims block (tool cannot see it); manual: real overlap, as PLAN:89-93 says. Ruling checked
  against origin/feature/campus-greybox 4eeb05a0: `campusS4Data.ts` / `campusS5Data.ts` hunks (:2, :207 / :187) miss the
  label lines, so they auto-merge; `campusSectors.ts` conflicts (S1 / S3 moved to `campusS1Data.ts:90`,
  `campusS3Data.ts:159`) and is resolved by hand; `tests/campusV2.test.ts:89` (v2 parts equal live) forces the four
  label copies into `campusV2/s1,s3,s4,s5Data.ts`. Gap: `campusV2/s4Dress.ts:177` is a copy of the S4 dressing with the
  same `Math.hypot`; no test forces the `hyp2` copy (the art-equality test passes either way when A8 holds), so the
  break 7 fix is lost when v2 S4 goes live. Also campus-greybox's own docs never mention the ruling: its BRIEF A23
  (:140-143) is about #317 only, and its builders read its briefs, not this PLAN.
- Claims block misses `changes/feature-sector-marks.md` (PLAN row 12, B1:22).

## Slices
- B1 ~130 lines, ~2 h: ok. Files, checks, "done looks like" (PLAN:30-52, :69-81, :103-106). B1 brief is strict enough
  for Sonnet: exact before / after text per line, stop rules (B1:7, :177-179, :188-189), one commit per step, matches
  PLAN rows 1-13 and BRIEF A1-A8. APIs as used exist: `ModeId` (gameMode.ts:11, all six ids in the test), `RoomRect.name`
  (rooms.ts:12), `inRoom(r, x, z, margin, y)` (:57), `SectorDef.connector?` / `extract?` (sectors.ts:113, :115),
  `PartLibrary(scene)` and the NullEngine import (tests/animGear.test.ts:251, :261).

## Walk pacing
- Sector Ops: 3 unwalked, at cap. ok: a rule fix to a shipped feature that removes a mesh; nothing switched on (G355).

## Fix list (FIX only, ranked)
1. Complete the campus-greybox handover: PLAN:91-92 also names `campusV2/s4Dress.ts:177` `Math.hypot` -> `hyp2`, and
   campus-greybox's BRIEF gets an A-line (like A23) for the sector-marks order: carry the four labels into
   `campusS1Data.ts`, `campusS3Data.ts`, `campusV2/s1,s3,s4,s5Data.ts` and `hyp2` into `campusV2/s4Dress.ts` at its next
   master take - done looks like: both docs name all six files, pushed before B1 merges.
2. Add `changes/feature-sector-marks.md` to the claims block - done looks like: every file in PLAN 1 and B1 "Files" is
   in the block.
3. PLAN:99 lists all eleven test-runner-j20 branches (or "test-runner-j20 and its 10 slice branches") - done looks
   like: PLAN 4 matches the claims-check list above.
