# Guard cap: state

## Now (2026-10-24 ~18:25; orchestrator go ~18:15 for M0 + M1 + the R1 brief; gated slices wait for merges)
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

## Resume prompt
```
Night Shift | Marlow Build, job lead of guard-cap (set_session_title "self" first if not set).
Worktree C:/NightShift/Mobile-Coop-guard-cap, branch feature/guard-cap. Guard before every write:
cd /c/NightShift/Mobile-Coop-guard-cap && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-cap && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-cap"
Read: CLAUDE.md "Sessions", "Hard rules", "Definition of done"; docs/systems/agent-preamble.md; docs/guard-cap/STATE.md,
BRIEF.md (A1-A7), PLAN.md. Never merge master into this branch; never write PROTOCOL_VERSION.
Facts (master 6e8a450b, 4.93.0):
- caps: MAX_ALIVE 12 src/ai/enemyManager.ts:81; SECTOR.maxAlive 32 src/game/sectors.ts:508; MAX_ENEMIES 32
  src/net/protocol.ts:25; sectorMode.ts:315-316 sets the cap; reinforcements stop at enemyManager.ts:1846.
- dormant today: section unload sectorMode.ts:704-712; render freeze sectorGuardFreeze*.ts wired sectorMode.ts:329-335;
  anim tiers src/ai/animTier.ts:24-34. Client has no EnemyManager / SectorMode (gameState.ts:677-681, :719); puppets
  solve every frame (src/net/enemyPuppet.ts:451), hit head from guardHead (:453-454).
- think cadence enemy.ts:2136-2138; sight rays losClear perception.ts:80-82 -> Ballistics.ray allocates
  (src/weapons/ballistics.ts:115-136); allocation-free hitDistance ballistics.ts:83-88.
- snapshot coopHost.ts:1441-1455 (SNAP_HZ 15, :65); client drops a missing guard after 0.5 s coopClient.ts:450-457.
- render belongs to Test Runner's origin/feature/guard-render-2 docs/guard-render/PLAN2.md (S9-S13).
Do now, in parallel (desktop CPU < 80%):
1. M0: queued (STATE Now); results come on origin/feature/guard-cap-results (Test Runner messages).
2. M1: feature/guard-cap-m1 (STATE Now): check, merge, laptop smoke + run.
3. R1: brief docs/guard-cap/briefs/R1.md is with Guard AI Build; build here only with its OK.
Then: Opus read of M0 + M1 vs PLAN section 2 -> REPORT.md "2026-10 re-measure"; start each triggered slice only when
its gate branch has merged (re-check: git fetch -q origin; git diff --name-only origin/master...origin/<b> -- src).
Briefs for other sessions: T1 / D1 Guard AI, C2 Test Runner. Progress in STATE.md; message the orchestrator only at
PR / train-ready / blocked / Michael needed. One batch PR per train; tests per PLAN slice rows.
```
- BRIEFS WRITTEN AHEAD (a9742192): docs/guard-cap/briefs/M2, C1, N1, K1 (on gate heads; re-check lines after each merge). Scope changes folded into PLAN rows / BRIEF A4: C1 also waits for coop4 + optic + carry; K1 floor 26; M2 smaller; N1 3 h. Preview of guard-models + gm-perf merged: origin/feature/gm-flip 979a02b3.
- CLOUD (orchestrator ~19:00): M2 posted OPEN on cloud-queue (briefs/guard-cap-M2.md, 3b3c6136): base gm-flip 979a02b3, branch feature/guard-cap-m2, one commit touching scripts/guard-cap.mjs only. On done: Sonnet checker, then after gm-perf merges cherry-pick onto feature/guard-cap and run the laptop smoke. C1 / N1 / K1 stay off the cloud queue until their measurement trigger (M1 / M0 verdict) and gates: building them now would be speculative.
