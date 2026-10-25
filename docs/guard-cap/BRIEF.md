# Guard cap: brief

Job guard-cap (second run: the first run was the measure, #180, 4.68.0). Lead: Night Shift | Marlow Build. Planner: Opus,
read-only, master 6e8a450b (4.93.0); file:line on that commit unless a branch is named. Plan: `PLAN.md`. State: `STATE.md`.

## The ask
- `docs/ROADMAP.md:191` ("Later"), verbatim: "**Guard cap** (Michael 2026-10-22 ~14:50: "After Marlow + Sector Ops"):
  before the campaign spec. Options given: dormant guards (all placed, at most `MAX_ALIVE` 12 awake), a desktop perf run
  at 12 / 16 / 24 awake (sim vs render), AI / perception LOD and shared raycasts if sim-bound, the WebGPU trial, guard LOD
  and fewer flashlight shadows if render-bound, guard snapshot trimming for co-op past ~16."
- `docs/ROADMAP.md:34` ("Now: guard-render"), verbatim: "Michael's 24 guards per section needs a guard render LOD and
  dormant / culled off-screen guards."
- Michael 2026-10-24 ~13:40 (`PLAN2.md` on `origin/feature/guard-render-2`): "render LOD plus dormant / culled off-screen
  guards, so 24 guards per section hold the budget".
- Michael 2026-10-24 ~18:10 (native multiple choice "Guard cap plan", via the orchestrator): an Opus plan for the guard cap.

## Goal
Sector Ops holds its live cap (`SECTOR.maxAlive` 32, `src/game/sectors.ts:508`: 24 per section plus alarm
reinforcements, and coop4's extra guards at 3-4 players) inside the frame budget on the host AND on a co-op client,
with the snapshot inside coop4's bandwidth budget; Marlow Yard stays at `MAX_ALIVE` 12 (`src/ai/enemyManager.ts:81`, M3
of guard-render). Measure first; build only what a measurement triggers.

## Limits
- CLAUDE.md hard rules: hot paths never allocate (`hyp2` / `hyp3`, no closures, iterators, temp vectors); gameplay never
  reads graphics state (frustum, LOD, freeze, presets); light parity; Babylon only via `src/core/babylon.ts`; single
  player never imports `src/net` statically; never write `PROTOCOL_VERSION` (the train build bumps it).
- No-refining rule (CLAUDE.md "Current goal"): perf tuning waits for Michael's playtest. guard-render A1 lifted it for
  guard render cost only (`docs/guard-render/BRIEF.md`, ROADMAP:34). This job needs the same lift for guard SIM and WIRE
  cost: A1 below.
- File ownership: no slice edits a file another session's branch has open (PLAN section 4); `src/ai` slices are briefs
  for Guard AI Build; render slices go to Test Runner's guard-render-2 `PLAN2.md`.

## Measured baseline (laptop RTX 4090, Epic 1920x1080, uncapped, guard-cap cells)
| Build | Source | Numbers |
| --- | --- | --- |
| 4.64.0 | `docs/guard-cap/RESULTS.md` (#180) | Sector Ops 24 patrol/facing frame CPU 57.1 ms, 17.2 fps; AI 0.02-0.06 ms a guard; render-bound (active meshes 123 -> 1429) |
| 4.75.0 | guard-render STATE phase 1, M1 | 24 facing frame CPU p95: Sector Ops 13.9 / 15.9 (patrol / alert), Marlow 12.7 / 13.2, campus (4.73) 17.8 / 19.7; GPU p95 <= 11.6 everywhere |
| 4.80.0 cf5a2bf8 | PLAN2 section 1 (G8, figures on) | Sector Ops 24 alert: frame CPU p95 10.4 (0 guards 3.9), +0.28 ms a guard; sim step p95 3.0 (0: 0.7), `ai.anim` 0.855 ms = 72% of sim growth, AI manager 0.2; GPU p95 7.0; draws 301 |
| 0fd85e2b | `origin/feature/guard-models` STATE ~17:55 (G8) | figures on vs off at 24: +1.1 to +2.5 ms frame p95 (campus alert 12.0 vs 9.5); flag stays off |
| 9f7dddbb vs 6b44efb8 | guard-render-2 STATE ~17:40 | S9 + S10: campus 24 alert p95 9.9 -> 9.2; Sector Ops 24 alert 8.5 -> 11.8 under diagnosis (noise: a 0-guard cell read 13.6 vs 3.4) |

Never measured: any count above 24; the co-op client (its guard puppets); real snapshot bytes at 24-32 guards.

## What master already has toward "dormant guards" (verified)
- Section load / unload: only the current section's guards live (`sectorMode.ts:704-712` `unloadSection` ->
  `despawnAll`); the cap `em.maxAlive = SECTOR.maxAlive` (`sectorMode.ts:315-316`); reinforcements stop at the cap
  (`enemyManager.ts:1846`).
- Render freeze (host / solo only): a guard whose body and shadows cannot reach the screen is disabled per camera
  evaluation (`src/game/sectorGuardFreeze.ts`, `sectorGuardFreezeView.ts`, wired `sectorMode.ts:329-335`, `?guardfreeze=0`).
- Anim tiers: FROZEN never solves, off-screen every 4th frame, far (> 22 m) every 2nd, within 4 m of any player every
  frame (`src/ai/animTier.ts:1-36`); the hit head comes from the sim (`guardHead`, S3a).
- Missing: (1) the brain never sleeps: every live guard thinks every 0.22-0.30 s (`enemy.ts:2136-2138`) and moves, however
  far from every player; (2) the co-op client has none of it: no EnemyManager and no SectorMode on a client
  (`gameState.ts:677-681`, SectorMode only in the host branch `:719`), so guard puppets are never frozen and their rigs
  solve every frame (`src/net/enemyPuppet.ts:451`; guard-render STATE: "S4 does not tier puppets"); (3) no "awake" count
  separate from "alive".

## Assumed decisions (logged, undoable)
- **A1. Lift scope.** The no-perf-tuning lift (guard-render A1) also covers guard SIM cost, the co-op client's guard
  cost and guard SNAPSHOT size, for counts above 16 up to `SECTOR.maxAlive`, and only for slices PLAN's decision rule
  triggers with a measurement. R1 (allocation-free sight rays) is a hard-rule fix, not tuning. Undo: drop the
  conditional slices (Sector Ops keeps 32 unmeasured, as today).
- **A2. "Dormant" = what exists + the client gap.** Section load / unload + render freeze + FROZEN anim tier are the
  dormant guards for Sector Ops; this job adds the client side (C1, C2). Brain dormancy (D1) is built only if M0 shows the
  sim AI-bound (Guard AI 2026-10-24: no brain LOD, AI is 2-5% of a guard; PLAN2 "Dropped: S14"). Undo: build D1 from its brief.
- **A3. Targets.** guard-render M1: frame CPU p95 <= 12 ms, GPU p95 <= 15 ms, <= 600 draws, <= 8 M tris; plus sim step
  p95 <= 2.9 ms (`docs/systems/performance.md:17`); judged on alert/facing (worst) at 32 on sectorops and campus, host
  and client pages alike. Undo: re-judge the same numbers against other targets.
- **A4. Caps per mode stay.** `MAX_ALIVE` 12 (Marlow Yard), 32 alive for Sector Ops and the campaign (`SECTOR.maxAlive`
  = `MAX_ENEMIES`, `src/net/protocol.ts:25`; G332, G359; the campaign inherits it through SectorMode until it gets a
  named cap, FOLDED-PLAN J7). Any lowering of 32, for either mode, goes to Michael first: K1 may only measure the
  largest N that passes and bring it to him with the options (fewer alarm reinforcements first, no section guard
  removed; the signed-off campus counts G328 / G362 stay). Undo: n/a (it tightens authority).
- **A8. Perf target at 32 guards** (Michael 2026-10-25, folded plan Q4, picked "60 fps (Recommended)": smooth on a
  normal monitor, set after the off-screen animation fix is measured; memory target unchanged on every map). The frame
  and sim budgets at 32 are written into `docs/systems/performance.md` (its owner, Test Runner, with the measured
  numbers) once Guard AI's off-screen anim fix (FOLDED-PLAN J4, G327) is on master and measured (J21). Until then A3's
  numbers are working targets. Undo: n/a.
- **A5. Render stays with guard-render-2.** Guard LOD, cascades, torch shadows, active meshes: Test Runner's PLAN2
  (S9-S13). New render findings at 32 go to Test Runner as PLAN2 additions. The WebGPU trial stays ROADMAP "Later" (not
  before the core-loop playtest). Undo: none needed.
- **A6. Snapshot trimming.** coop4 N1 already writes guards in 1 mm / 1 mrad steps and pins 4 players x 32 guards <= 6 KB
  (`tests/snapBudget.test.ts`, coop4 A24, `origin/feature/coop4`). N1 here (a rate split for far, calm guards) runs only
  if M1's real bytes break A24. Undo: n/a until built; then revert N1.
- **A7. Method.** Laptop GPU port 4189 alone, guard-cap's cells, two interleaved repeats, decided on medians (the 0-guard
  noise in guard-render-2). Undo: n/a.

## Open questions for Michael
None open. Q4 (the perf target at 32) is answered (A8). If 32 cannot hold after the triggered slices, the cap question
goes to Michael before any change (A4).
