# Guard cap: state
Owner: Marlow Build. Status: current.

## Resume block
```
Night Shift | Marlow Build, job guard-cap (ROADMAP / FOLDED-PLAN J21, K1-K7 of docs/conformance-marlow/CONFORMANCE.md).
Rules: docs/RULES.md + docs/VISION.md from origin/master. Docs on master since the J1 docs PR (feature/marlow-docs-j1).
Caps (BRIEF A4): MAX_ALIVE 12 Marlow Yard (src/ai/enemyManager.ts MAX_ALIVE); 32 alive Sector Ops and the campaign
(SECTOR.maxAlive, src/game/sectors.ts; = MAX_ENEMIES src/net/protocol.ts). Any cut below 32 goes to Michael first.
Perf target (BRIEF A8, Michael Q4 2026-10-25): 60 fps at 32 guards, set after Guard AI's off-screen anim fix (J4,
G327) is on master and measured; memory target unchanged. The numbers go into docs/systems/performance.md with its
owner (Test Runner); BRIEF A3's numbers are working targets until then.
Verdicts: REPORT.md "2026-10 re-measure (M0)" (sim over at 32; T1 triggered) and "2026-10 co-op measure (M1) and run
4100" (host 32 holds on render; host sim 0.2-0.5 ms over; client +1.8-2.6 ms p95 with guards off screen: C1 triggered;
N1 not triggered at 2 players; D1 / D2 closed; no K1). Next slices: REPORT.md "Next slices and gate state".
Open slices:
- T1 = Guard AI's G327 redo (FOLDED-PLAN J4, replaces #360). Not ours.
- C1 (client puppets: half rigs, half shadow draws): briefs/C1.md, Opus build + two checkers (src/net). Gate: J4 on
  master plus coop4 (#317, ships live per Q16) and gm-flip (#375). Re-read every file:line in the brief at the gate.
- C2 (client puppets in the render freeze): slices/C2-brief.md, Test Runner's (PLAN2 addition); reuses Guard AI's
  animTierView.ts predicate. Needs `--query=` on scripts/guard-cap-coop.mjs (done on feature/guard-cap d76b5372).
- M1b (4 players, 2 repeats, figures on) + M0 rerun on the master that has J4 + C1: laptop alone requests.
- scripts/guard-cap-coop.mjs (M1 tool, checker PASS) is only on feature/guard-cap (stale base): it lands with C1's PR,
  copied onto a fresh branch from master (never merge master into feature/guard-cap).
Next: wait for J4 on master; then C1 on feature/guard-cap-c1 from master, M1b + M0 rerun, then the 60 fps numbers to
Test Runner for performance.md (J21).
```

## History (2026-10-24 / 25)
- 2026-10-25 C2 BRIEF WRITTEN: docs/guard-cap/slices/C2-brief.md (Test Runner, PLAN2 addition; feature/guard-cap-c2 off master; flag `puppetFreeze` off until Michael's look of the shadow case). Rule: Michael ~08:50 "shadow in view = seen" (never frozen, full-rate tier), C2 reuses Guard AI's animTierView.ts predicate, no second copy. Build gate: coop4 #317 + C1 + Guard AI's shadow rule on master; Marlow owes `--query=` on scripts/guard-cap-coop.mjs for the C2 A/B.
- 2026-10-25 M1 VERDICT (REPORT.md "2026-10 co-op measure (M1) and run 4100"): host 32 holds on render on 4.100.0 (campus 32 alert frame CPU p95 9.7 x3, trusted over M0's 14.8: guard-render-2 + R1 are in, M0's r1 / r2 disagreed); host sim 0.2-0.5 over (campus 2.8, Sector Ops 3.4, ctcourse 24 3.1; ai.anim ~50-55%). Co-op client (2 players) = host facing, but +1.8 to +2.6 ms p95 with guards off-screen -> C1 TRIGGERED (half puppet rigs, half puppet shadow draws -> C2). N1 not triggered (2p snap med <= 5.0 K; 4p unmeasured: Sector Ops capacity 2 until coop4 #317). Caps stay (SECTOR.maxAlive 32, MAX_ALIVE 12); no K1; D1 / D2 closed. T1 #360: Michael's "seen" call also sets C1's off-screen rule (recommend shadow-in-view counts as seen). NEXT: C2 brief to Test Runner (PLAN2 addition) now; C1 waits gm-flip #375 + coop4 #317; then M1b (4 players, 2 repeats, figures on) + M0 rerun on that master.
- 2026-10-24 ~23:08: M0 VERDICT (REPORT.md "2026-10 re-measure (M0)", medians r1 / r2): 32 does not hold (sim p95 campus 3.4 / Sector Ops 4.4 at 32, ctcourse 4.1 at 24); T1 TRIGGERED (ai.anim 55-59% of growth; built bbbfbecf, not on master), D1-D2 CLOSED (ai.manager 15-24%), render: campus 32 alert frame CPU p95 14.8 -> Test Runner PLAN2 addition; caps stay (SECTOR.maxAlive 32, MAX_ALIVE 12), no K1 yet; campus perf.mjs pending (guard-cap-m0-perf). NEXT: M1 requeued after train 68 (set guard-cap-m1).
- 2026-10-24 ~22:30 (resume): M0 ran (laptop, 6/7 steps; step 4 campus perf.mjs failed: no server, needs the `serve ` prefix). Data only on the laptop (C:/NightShift/scratch/guard-cap/m0-6e8a450b-r{1,2}-{so,campus,ctcourse}); Test Runner asked ~22:30 to push it to feature/guard-cap-results docs/guard-cap/run-m0/. Perf retry queued 20261024T112758-night-shift-marlow-b-6e8a450b-09d8 (set guard-cap-m0-perf). M1 smoke ran on the desktop instead (74a90c1c clean); full M1 queued 20261024T084755-...-a55a12b3-6a46 (set guard-cap-m1, not yet claimed: do not re-queue). NEXT: when run-m0 lands, Opus read vs PLAN section 2 (medians r1 / r2) -> REPORT.md.
- M0 QUEUED: laptop alone request 20261024T071756-night-shift-marlow-b-6e8a450b-650d (set guard-cap-m0, master 6e8a450b):
  only the cells #323 gr2-rep does not cover: sectorops 12/16/32, campus 0-32, ctcourse 0/12/24, cells patrol/away/alert,
  r1 + r2, plus campus perf.mjs (step 4). Queue order: train 57, Test Runner gr2 alone runs, then this. Test Runner pushes
  results to origin/feature/guard-cap-results docs/guard-cap/run-m0/ and the gr2 baseline (sectorops 0/24 alert+patrol;
  base r1/r3/r5 = master 6b44efb8, r2 = 3360b85b, r4 = #323 head 6a6b5e58) to docs/guard-cap/run-gr2/<set>/, one message.
- M1 BUILT + CHECKED: scripts/guard-cap-coop.mjs (Sonnet, checker PASS + should-fixes da3b0b0d: hidden / <10 fps page FLAG,
  SIGINT, orphan guard), merged here a7f81390. Laptop smoke queued on 19857eed (20261024T072522-...-08ec, set
  guard-cap-m1-smoke, campus 0/12, 2 players, 3 s; out C:/NightShift/scratch/guard-cap/m1-smoke-19857eed). Next: on a clean
  smoke, ONE alone request for the full M1 run on this branch head (campus + sectorops, 0/12/24/32, players 2 and 4).
- SIDE (orchestrator ~18:35): e2e-coop joint interrogation flake -> PR #328 (feature/joint-flake 240addc2, test only: the
  client hold starts at the bluff; JOINT.window 6 s host time was spent by sequential polls). Laptop e2e-coop queued
  (20261024T072944-...-d2f1, set joint-flake). TRAIN-READY ~18:45 (CI green, laptop e2e-coop 1/1 PASS 150 s on 240addc2); rides with #314 (orchestrator resolves any conflict in the train). Nothing owed.
- R1 DONE (Guard AI): PR #326 (feature/guard-ai-r1-rays 321ef486), checker PASS, laptop stealth-ai / enemies / combat PASS, CI green; train-ready via the orchestrator. Extra: Ballistics casts no longer res.reset() (2 Vector3.Zero per cast); losClear keeps the ray path at slack 0 (a miss reads blocked there).
- Gates: guard-models + gm-perf (Player), guard-render-2 (Test Runner), coop4 (Sector Ops), optic-coop (Player),
  guard-ai-coop-carry (Guard AI) must merge before C1 / C2 / D1 / N1 / K1 / M2 / DOC.
- M0 noise: guard-render-2 saw a 0-guard p95 of 13.6 vs 3.4; decide on medians of r1 / r2 only.
- Nothing has ever been measured above 24 guards or on a co-op client.


## Done
- 2026-10-24: Opus plan (BRIEF / PLAN / STATE).

### History: the measure job (first run)
- 2026-10-22 (filled 16:00Z, 4.64.0, laptop RTX 4090): results in `REPORT.md` (results block + "Reading of the first
  run"), `RESULTS.md`, `guard-cap.csv`, `guard-cap.json`: render-bound, AI 0.02-0.06 ms a guard. Merged as #180 in train
  19 (4.68.0). It started guard-render (phase 1 closed 2026-10-23, phase 2 on `feature/guard-render-2`).
- 2026-10-23: `scripts/guard-cap.mjs`, `REPORT.md` (method, decision rule), changelog fragment.

