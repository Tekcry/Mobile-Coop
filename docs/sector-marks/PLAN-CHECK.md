# sector-marks: plan check 1
Checker: Opus 5.5, 2026-10-25 18:44, PLAN at 33d5c8b21ee78fe7da48e8393548c3dbe2ad85b0 (branch head d51da187).
Verdict: FIX

## Intent
- ok: every slice item serves VISION 4 rule 5 / G290 "no markers" (beacon, PLAN rows 1-3) and G336 / G343 / G351
  "what and where", "short, plain English" (rows 4-6, 8); row 7 (`hyp2`) is FOLDED-PLAN J6 break 7, the Sector Ops line
  (FOLDED-PLAN:122, :166). Nothing Michael asked for in J5's Sector Ops half is uncovered; warehouseOps is out by his
  later pick Q26 "Freeze it" (ROADMAP:86), which outranks FOLDED-PLAN J5's "warehouseOps" (FOLDED-PLAN:165).
- ok: the four new lines (BRIEF A4) each contain the full room name whose rect holds the objective point (checked
  against `S1_ROOMS`..`S5_ROOMS` with `inRoom` and height: Gatehouse, Prototype Store, Server Cage, Strongroom; S2
  Facilities Office already passes); all are 44-49 characters. Every connector / extract label has a place word
  (staff, bridge, dock, colonnade, boathouse), so B1 step 4c should pass.
- finding (format): BRIEF "Michael said (verbatim)" (BRIEF:28-36) holds three items that are not his words with a time:
  G290 (BRIEF:31-32) is the orchestrator's record of a multiple-choice pick (DECISIONS:1567, 2026-10-24 ~22:12), Q26
  "Freeze it" (BRIEF:29-30) is a clicked option (ROADMAP:86), and G351 "What and where" (BRIEF:36) has no time and is
  already under "Michael picked" (BRIEF:40).
- finding: BRIEF.md ends with leaked tool-call text (BRIEF:70-75: `</content>`, `<invoke name="Bash">`, a git commit
  command). The BRIEF is the builder's and checker's source; it must be clean.

## Gates
- ok: no slice crosses VISION, a hard rule or a Michael-only rule. A1 / A2 tighten toward rule 5; A6 leaves the frozen
  warehouseOps lines by Michael's own Q26 pick and is logged. No flag needed: a rule fix to a shipped feature (G355,
  RULES "Walk pacing"). Not a map or look job: no sign-off gate.
- ok: Babylon import in `tests/exitBeacon.test.ts` (B1:155, `@babylonjs/core/Engines/nullEngine`) matches the existing
  test pattern (`tests/animGear.test.ts:251`); `src/net` change is one constructor argument, no wire or save change.

## Claims
- claims-check: did not run. `node scripts/claims-check.mjs --plan docs/sector-marks/PLAN.md --name feature/sector-marks`
  exits 2: "docs/sector-marks/PLAN.md has no ```claims block (docs/templates/plan.md)". The PLAN has a file table
  (PLAN:10-24) but no fenced block (template docs/templates/plan.md:15-23; session-method "Intake" 2).
- Manual git scan of `origin/feature/*` (three-dot diff vs master) on the 13 files:
  - **campus-greybox (J17, real overlap):** claims `campusSectors.ts` (its PLAN:42) and has already moved the S1 / S3
    SectorDefs out of it into `campusS1Data.ts:90` / `campusS3Data.ts:159`, plus v2 copies with the old labels in
    `campusV2/s1Data.ts:91`, `s3Data.ts:160`, `s4Data.ts:183`, `s5Data.ts:172`; it also edits `campusS4Data.ts` and
    `campusS5Data.ts`. This PLAN's 4 lines in those files will conflict at its merge, and its `tests/campusV2.test.ts`
    "v2 copy equals live" will break unless the copies get the new labels. Not named in PLAN 4 Risks.
  - coop4: `gameState.ts`, `coopClient.ts`, `campusSectors.ts`, `campusS4Data.ts`, `campusS5Data.ts`,
    `scripts/e2e-sectorops.mjs`, `TESTING.md` (791 behind master; no hunk on the Interactables lines it shows at
    coopClient:274, gameState:760). mission-engine-flg-gb6: `gameState.ts`, `coopClient.ts` (hunks start at
    coopClient:21, not :18 / :247). guard-ai-docs-j1: `campusSectors.ts:24-28`. fold-j2:
    `modes-and-progression.md` (:5-17, :93; ours after :74). gm-look, guard-ai-g327: `TESTING.md` (:191-235; ours after
    :28). File-level only; the orchestrator rules.
  - PLAN 4 (PLAN:67-69) names sector-batch, but `origin/feature/sector-batch` now has no diff vs master on these files
    (its head is the train 96 merge): the risk line is stale.

## Slices
- B1 ~130 lines, ~2 h: ok. Files, checks and "done looks like" present (PLAN:10-26, :47-59, :71-74). Every file:line
  re-found on origin/master b81c4945 (no change to these files since 2148ec96): interactables.ts :5, :26, :81-84,
  :134-137; gameState.ts :43, :728, :839; coopClient.ts :18, :247; campus labels :315 / :406 / S4 :180 / S5 :169;
  campusS4Dress.ts :176; e2e-sectorops.mjs :91; TESTING.md :28; modes-and-progression.md :74; campusS4Dress.test.ts
  :34. `ModeId` (gameMode.ts:11), `hyp2` (mathx.ts:5), `inRoom` / `RoomRect` (rooms.ts:10, :57), `PartLibrary(scene)`
  exist as B1 uses them.
- B1 brief: strict enough for Sonnet (exact code, stop rules, A8 hero-log compare). One trap: its last check
  "`git diff origin/master --stat` lists only the files in Files" (B1:233) fails on this branch's own
  `docs/sector-marks/*` (BRIEF, PLAN, STATE, briefs, this file), and B1:7 tells the builder to stop on a mismatch.
- Note (no change needed): `scripts/e2e-sectorops.mjs` runs `autostart=warehouseOps` (:10), so the e2e proves the
  mode switch on the frozen map; campus coverage is the unit test.

## Walk pacing
- Sector Ops: 3 unwalked, AT CAP (ROADMAP:75). ok: a rule fix to a shipped feature that removes a mesh; no feature is
  switched on (G355, RULES "Walk pacing").

## Fix list (FIX only, ranked)
1. Add a fenced ```claims block to PLAN.md (files: the 13 files of PLAN 1 plus `docs/sector-marks/**`; maps:
   campusOps (labels only); protocol: none; save: none), re-run claims-check - done looks like: claims-check exits 0
   and its overlap list is copied into PLAN 4.
2. Name the campus-greybox overlap in PLAN 4 and send it to the orchestrator to settle (order the merges, or hand the
   label edits to whichever lands second; campus-greybox must carry the new labels into `campusS1Data.ts`,
   `campusS3Data.ts` and its `campusV2/s1-s5Data.ts` copies) - done looks like: a PLAN 4 line with the orchestrator's
   ruling, before B1 starts.
3. Clean BRIEF.md: delete the leaked tool-call text at BRIEF:70-75 - done looks like: the file ends after A8.
4. Fix B1's last check (B1:233) to allow `docs/sector-marks/*` - done looks like: "lists only the files in Files and
   `docs/sector-marks/*`".
5. BRIEF "Michael said": keep only his verbatim words with a time (G336 ~09:45, G343 ~10:45); move Q26 "Freeze it" to
   "Michael picked" with its time (2026-10-25 ~16:50), G290 to "Michael picked" or "Rules" with 2026-10-24 ~22:12, drop
   the duplicate G351; update PLAN 4's stale sector-batch line - done looks like: every "said" line is a quote with a
   time, every pick is clicked option text.
