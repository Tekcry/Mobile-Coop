# sector-batch - state

Owner: Night Shift | Sector Ops Build. Status: current.

## Resume block (2026-10-25, plan fix round 1 done; nothing built)
- Job J18 (FOLDED-PLAN :179), lead Night Shift | Sector Ops Build. Worktree `C:/NightShift/Mobile-Coop-sector-batch`,
  branch `feature/sector-batch` (from master b81c4945, train 96), pushed. Docs only so far.
- Plan check 1 (`PLAN-CHECK.md`): FIX, 6 items; all 6 done in fix round 1 (Done below). Needs plan check 2.
- Read: `BRIEF.md` (ask 1-8; Michael said / picked; A1-A23), `PLAN.md` (slices :12-27, files :29-102, e2e :122-146,
  overlaps :163-188, claims block :189-231, claims-check :236-282, flag :283-287), `briefs/B1.md`..`B5.md`.
- Slices: B1 stars / Perfect / menu (~190, Sonnet) and B2 solo-route check (~230, Sonnet) -> PR A
  `feature/sector-batch`; B3 one door light threshold (~60, Sonnet) -> PR C `feature/sector-batch-light` from
  origin/master (BRIEF A23); B4 out-and-wait dark (~260, Opus, `src/net`) -> PR B `feature/sector-batch-out` from
  origin/master 01aa415c; B5 visual-gate fixes (Sonnet + lead laptop runs R1-R4) on `feature/sector-batch-vg` from
  origin/feature/visual-gate, merged back there.
- Code anchors: stars `src/save/sectorRecord.ts:67-71`; Perfect `src/game/sectors.ts:846-866`, banner
  `src/game/modes/sectorMode.ts:1011`, `result()` :1018-1021; menu `src/main.ts:164`, `:257` (all b81c4945). Door
  `src/world/lightField.ts:22`, `:28-29`; built 15% `src/world/doors.ts:51-53`, `:253`; docs `lighting.md:26-27`,
  `ai.md:12-13`, `world-and-characters.md:41-47`, `level-design.md:351-352`. Out rule `src/net/coopHost.ts:572-581`,
  `sectorMode.ts:1332-1337`, connector count `:812-827`, far door `:855-867`, respawn slots `coopHost.ts:1894-1921`,
  flag above `sectorGuards` `flags.ts:48`, `:127` (all 01aa415c). so-corner rig
  `scripts/visual-gate/viewpoints.mjs:671-693` (feature/visual-gate 07eefea0).
- Flag: `sectorOutWait` (`?sectoroutwait=1`), off; switch-on at Michael's next co-op Sector Ops walk (target
  2026-10-28). Sector Ops is at the walk cap (3 unwalked).
- Dropped: warehouseOps S3 crawl duct (Q26 "Freeze it", BRIEF A22).
- For Michael's next look (via the orchestrator): A1 (which items ship live vs dark), A3 (Perfect's alarm rule), A10
  (sight / sound on an ordinary swing left to Guard AI), A13 (out players not counted at the exit), A19 (initial visual
  baseline accepted without his OK), A22 (crawl duct dropped), A23 (a third PR for the door light).
- To the orchestrator when PRs open: Guard AI (J15): sight and hearing pass an ordinary open from 0% (BRIEF A10); a B2
  failure, if any, as a G280 break (A8); Marlow Build: B3's level-design engine-fact change and its doc list.
- CPU: desktop near 100%; start B1 and B3 first (light), then B2 and B4; B1-B3 may go to `cloud-queue`.
- After check 2 passes: cut `feature/sector-batch-b1`, `-b2` from this branch and `feature/sector-batch-light`,
  `feature/sector-batch-out` from origin/master; start the B1, B2, B3 (Sonnet) and B4 (Opus) builders; send B5's R1.
- Next: fresh Opus plan checker (check 2)

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

## History
- 2026-10-25: a first planner was cut off at the account swap and pushed nothing; this plan started fresh.
