# Guard cap: state

## Now (2026-10-24 ~18:30)
Opus plan written: `BRIEF.md` (ask, baseline, A1-A7), `PLAN.md` (M0 / M1 measure, decision rule, slices). Branch
`feature/guard-cap` off master 6e8a450b (4.93.0). No src change. Waiting for the orchestrator's go.

## Next (lead: Night Shift | Marlow Build)
1. In parallel: M0 request to Test Runner's queue (PLAN section 1, alone on 4189, two repeats); M1 Sonnet builder
   (`scripts/guard-cap-coop.mjs`, PLAN "M1 brief"); R1 brief to Guard AI Build (PLAN "R1 brief"; or build it here with
   Guard AI's OK).
2. M1 checker (Sonnet), then its laptop run.
3. One Opus read of M0 + M1 against the decision rule (PLAN section 2) -> `REPORT.md` "2026-10 re-measure" -> the
   triggered slices as their gates open (PLAN section 4).

## Open
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
1. M0: send Test Runner the PLAN section 1 commands (master head, 4189 alone, r1 + r2, ~70 min).
2. M1: Sonnet builder from PLAN "M1 brief" -> scripts/guard-cap-coop.mjs; Sonnet checker; laptop run.
3. R1: send Guard AI Build PLAN "R1 brief" (files free: perception.ts, reconDrone.ts, tests/perception.test.ts);
   build here only with its OK (Opus builder + Opus checker; e2e-stealth-ai, e2e-enemies on the laptop queue).
Then: Opus read of M0 + M1 vs PLAN section 2 -> REPORT.md "2026-10 re-measure"; start each triggered slice only when
its gate branch has merged (re-check: git fetch -q origin; git diff --name-only origin/master...origin/<b> -- src).
Briefs for other sessions: T1 / D1 Guard AI, C2 Test Runner. Progress in STATE.md; message the orchestrator only at
PR / train-ready / blocked / Michael needed. One batch PR per train; tests per PLAN slice rows.
```
