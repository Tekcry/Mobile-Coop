# sector-batch - state

Owner: Night Shift | Sector Ops Build. Status: current.

## Resume block (2026-10-25, plan fix round 2 done; nothing built)
- Job J18 (FOLDED-PLAN :179), lead Night Shift | Sector Ops Build. Worktree `C:/NightShift/Mobile-Coop-sector-batch`,
  branch `feature/sector-batch` (from master b81c4945, train 96), pushed. Docs only so far.
- Plan checks: 1 FIX (6, done round 1); 2 FIX (2 + polish, done round 2, Done below). Needs plan check 3.
- Read: `BRIEF.md` (ask 1-8; A1-A25), `PLAN.md` (slices :14-29, B4 :74-94, overlaps :180 with the claims block,
  claims-check :275, flag :335, risks :340), `briefs/B1.md`..`B5.md`.
- Slices: B1 stars / Perfect / menu (~200) and B2 solo-route check (~230) -> PR A `feature/sector-batch`; B3 door light
  15% (~70) -> PR C `feature/sector-batch-light` from origin/master (A23); B4 Q20 at 2 players (~190) -> PR B
  `feature/sector-batch-out` from origin/master **after #317 (coop4, J4) merges** (A24); B5 visual-gate fixes on
  `feature/sector-batch-vg` from origin/feature/visual-gate. All Sonnet builders (B4 has no `src/net` now, A17).
- B4 = coop4's OUT rule from 2 players behind `flags.sectorOutWait`: one gate line (`outWaitsFor(team,
  flags.sectorOutWait)` in coop4 `sectorMode.ts:1432`), new `outWaitsFor` in `src/game/sectorOut.ts`, the flag above
  `sectorGuards`, briefing :57, tests in `tests/sectorOut.test.ts`, an e2e block in part 9, docs. Reuses `outIds`,
  `returnOut(ids)`, follow view, OUT line, `ot` (A12-A15). #317 is open and CONFLICTING with master (21:20).
- Perfect (B1) now reads `SectorRun.alarmsRaised` (every `raiseAlarm`, kept through restarts; A3).
- Order: PR A before `feature/mission-engine` (same `sectorResult` / `result()` lines; merged lines in PLAN 7, A25).
- Master moved to 9ad370a9 (train 101, J2 fold): B1 / B2 code anchors unchanged; B3 doc lines re-anchored (lighting
  :29-30, level-design :359-360, 12.2 :377-378, 12.3 bullet); B4's modes doc text is the fold's G385 sentence.
- Flag: `sectorOutWait` (`?sectoroutwait=1`), off; switch-on at Michael's next co-op Sector Ops walk (target
  2026-10-28, needs #317 first). Sector Ops is at the walk cap (3 unwalked).
- For Michael's next look (via the orchestrator): A1, A3 (Perfect lost by any alarm, restarts included), A10, A13
  (2 players get coop4's rule: back at the extraction too), A19, A22, A23, A24 (B4 waits for #317).
- To the orchestrator when PRs open: Guard AI (J15): sight / hearing pass an ordinary open from 0% (A10); a B2 failure
  as a G280 break (A8); Marlow Build: B3's level-design 12.1-12.3 change and its doc list; Campaign Build: PR A's
  `sectorResult` / `result()` lines and the merged form (PLAN 7, A25); J4: B4 rides on #317's OUT names.
- After check 3 passes: cut `feature/sector-batch-b1`, `-b2` from this branch and `feature/sector-batch-light` from
  origin/master; start B1, B2, B3 (Sonnet); send B5's R1; cut `feature/sector-batch-out` and start B4 once #317 is on
  master.
- Next: fresh Opus plan checker (check 3) on this head

## Done
- 2026-10-25: worktree levelled to origin/master b81c4945 (fast-forward, no own commits), pushed with upstream.
- 2026-10-25: BRIEF, PLAN (claims-check run: 28 file overlaps, none on maps / wire / save), briefs B1-B5, this STATE.
- 2026-10-25: plan check 1 (Opus): FIX, 6 items (`PLAN-CHECK.md`).
- 2026-10-25: fix round 1. (1) B3 premise: `DOOR.driveShut` 0.15 already built, a crack keeps `open` 0; BRIEF ask 5,
  A10, A11, PLAN B3, brief B3 rewritten; test pins `DOOR_SHUT === DOOR.driveShut`; ai.md, world-and-characters.md
  and level-design.md (CLAUDE.md engine-fact rule) join B3; B1's TESTING / fragment door lines dropped. (2) Anchors:
  lighting.md :26-27; #433 merged in train 99 and sits next to it, so B3 moved to PR C from master (A23); B4 based on
  01aa415c, TESTING insert after :52. (3) `sectorOutWait` above `sectorGuards` (after `sectorGuards` collides with
  coop4's `players`). (4) Claims block complete; claims-check rerun: 37 plans, 36 overlaps, PLAN 7 matches. (5) B4's
  checks name `coopClient.ts:618` as the one unflagged change. (6) STATE pointers refreshed.
- 2026-10-25: plan check 2 (Opus): FIX, 2 items + polish (`PLAN-CHECK.md` "## Check 2").
- 2026-10-25: fix round 2. (1) B4 re-planned on coop4's OUT (#317): gate `outWaitsFor(team, flags.sectorOutWait)`, no
  own out set / hook / net / wire; cut from master after #317; Sonnet + one Opus checker; A12-A17 reconciled with
  coop4 (extraction return, follow view, OUT_LINE), A24. (2) claims-check rerun on 9ad370a9: 51 plans, 49 overlaps;
  mission-engine x B1 line conflict (sectors.ts:864, sectorMode.ts:1020): PR A first, merged lines in PLAN 7, A25.
  Polish: Perfect from `SectorRun.alarmsRaised` (A3); fragments out of the claims block; B3 docs re-anchored to
  9ad370a9 (12.2 bracket and a 12.3 bullet added).

## History
- 2026-10-25: a first planner was cut off at the account swap and pushed nothing; this plan started fresh.
