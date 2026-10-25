# sector-batch - state

Owner: Night Shift | Sector Ops Build. Status: current.

## Resume block (2026-10-25, planning done; nothing built)
- Job J18 (FOLDED-PLAN :179), lead Night Shift | Sector Ops Build. Worktree `C:/NightShift/Mobile-Coop-sector-batch`,
  branch `feature/sector-batch` (from master b81c4945, train 96), pushed. Docs only so far.
- Read: `BRIEF.md` (ask 1-8; Michael said / picked; A1-A22), `PLAN.md` (slices :9-21, files :23-104, e2e :128-147,
  claims :171-206, claims-check :208-238, flag :240-244), `briefs/B1.md`..`B5.md`.
- Slices: B1 stars / Perfect / menu (~190, Sonnet), B2 solo-route check (~230, Sonnet), B3 door light 15% (~45,
  Sonnet) -> PR A `feature/sector-batch`; B4 out-and-wait dark (~260, Opus, `src/net`) -> PR B
  `feature/sector-batch-out` from master; B5 visual-gate fixes (Sonnet + lead laptop runs R1-R4) on
  `feature/sector-batch-vg` from origin/feature/visual-gate, merged back there.
- Code anchors (master b81c4945): stars `src/save/sectorRecord.ts:67-71`; Perfect `src/game/sectors.ts:846-866`,
  banner `src/game/modes/sectorMode.ts:1011`, `result()` :1018-1021; menu `src/main.ts:164`, `:257`; door
  `src/world/lightField.ts:28-29`; out rule `src/net/coopHost.ts:571-581`, `sectorMode.ts:1333-1338`, connector count
  `sectorMode.ts:812-827`, far door `:861-867`, respawn slots `coopHost.ts:1894-1921`; so-corner rig
  `scripts/visual-gate/viewpoints.mjs:671-693` (feature/visual-gate 07eefea0).
- Flag: `sectorOutWait` (`?sectoroutwait=1`), off; switch-on at Michael's next co-op Sector Ops walk (target
  2026-10-28). Sector Ops is at the walk cap (3 unwalked).
- Dropped: warehouseOps S3 crawl duct (Q26 "Freeze it", BRIEF A22).
- For Michael's next look (via the orchestrator): A1 (which items ship live vs dark), A3 (Perfect's alarm rule), A10
  (sight / sound at 15% left to Guard AI), A13 (out players not counted at the exit), A19 (initial visual baseline
  accepted without his OK, as not a look change), A22 (crawl duct dropped).
- To the orchestrator when PRs open: G41's sight and sound half for Guard AI (J15); a B2 failure, if any, as a G280
  break (A8).
- CPU: desktop near 100%; start B1 and B3 first (light), then B2 and B4; B1-B3 may go to `cloud-queue`.
- Next: cut `feature/sector-batch-b1`..`-b3` from this branch and `feature/sector-batch-out` from master, start the B1,
  B3, B2 (Sonnet) and B4 (Opus) builders from their briefs, and send B5's laptop run R1.

## Done
- 2026-10-25: worktree levelled to origin/master b81c4945 (fast-forward, no own commits), pushed with upstream.
- 2026-10-25: BRIEF, PLAN (claims-check run: 28 file overlaps, none on maps / wire / save), briefs B1-B5, this STATE.

## History
- 2026-10-25: a first planner was cut off at the account swap and pushed nothing; this plan started fresh.
