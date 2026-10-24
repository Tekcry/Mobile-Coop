# Guard render, phase 2: plan (24 guards per section)

Michael 2026-10-24 ~13:40: "render LOD plus dormant / culled off-screen guards, so 24 guards per section hold the budget";
the no-perf-tuning rule is lifted for guard render cost only. Lead: Test Runner. Planner: Opus, read-only, master
6b44efb8; file:line on master unless a branch is named. Numbers: `origin/shots/g8-cf5a2bf8` (COMPARE.md,
run-g8-on|off/RESULTS.md; laptop 4090, Epic, 1920x1080, uncapped, 4.80.0).

Targets: frame CPU p95 <= 12 ms (M1 / LR16), GPU p95 <= 15 ms, <= 600 draws, <= 8 M tris
(`docs/systems/performance.md:14-22`).

## 1. Cost now (Sector Ops, 24 guards alert / facing, `guardmodels=1`; 0-guard value in brackets)
| Bucket | 24 | Per guard | Note |
| --- | --- | --- | --- |
| Frame / frame CPU med / p95 | 9.0 / 11.1; CPU 8.3 / 10.4 (1.6 / 3.9) | +0.28 ms CPU | 12 ms passes with 0.9-1.6 to spare |
| Sim step clean med / p95 | 1.7 / 3.0 (0.5 / 0.7) | +0.05 | ai.anim 0.855 (72% of growth); AI manager 0.2; physics 0.10 |
| render() CPU | 6.0 / 7.3 (1.2 / 3.2) | +0.20 | evaluation +0.083 a guard; the rest ~14 us per draw |
| Active meshes | 568 (122) | +18.6 | body + gun should be 2: unexplained (S13) |
| GPU med / p95 | 5.9 / 7.0 (3.3 / 3.6) | +0.11 | far inside 15 ms |
| Draws | 301 (104) | +8.2 | sun CSM 95.7 (12): +3.5 a guard; torch maplight 50.4 (0): +2.1 a guard |

- Off-screen guards still cost: patrol/away frame CPU 5.6 vs 1.3 at 0 (+0.18 ms a guard, 64% of an on-screen guard),
  though the Sector freeze is on (`sectorMode.ts:329-335`). Likely the freeze's lamp rule (`sectorGuardFreeze.ts:115-121`:
  any shadowing spot whose reach sphere is in view keeps every guard in its reach drawn). Unproven (no guardFreeze log).
- Figures on vs off: frame CPU p95 +1.7 alert / +0.6 patrol / +0.6 away; GPU +0.5; triangles lower with figures.
- Unmeasured: campusOps at 24 with figures (the G8 run's campus boot failed), the `near` cell, freeze / anim-tier counts.
- Campus estimate: LR16 S5-worst 10.2 ms at 14 guards + 10 x 0.28 + figures 0.6-1.7 = ~13.6-14.7 ms: campus is where
  phase 2 must land (-2 to -3 ms).

## 2. Slices
**S8 Measure first (Test Runner).**
- S8a now: read Player's queued G8 cull rerun (20261024T020601-player-build-c76cf326-e643, sectorops + campusops, on /
  off); rerun only if campus errors again: `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campusops
  --counts=0,12,24 --cells=patrol,away,alert --query=guardmodels=1|0 --out=C:/NightShift/scratch/gr2-s8/on|off`
  (origin/feature/guard-models has `--query` and the campusops alias). Real section guards: `MAP=campusOps MODE=sector
  EXTRA=guardmodels=1 node scripts/perf.mjs --desktop --json`; log `__sector.debug().guardFreeze` / `guardFreezeOccluded`.
- S8b after guard-models merges: per cell freeze count, anim-tier histogram, active meshes per guard by name prefix,
  draws per pass split guard / static, `--views=` for the campus S2-S5 worst views (`campus-perf-fix.md:116`).

**S9 Moon cascades: depth-split culling (render).** A caster goes into every cascade whose light-space square it overlaps
(`sunCascadeCull.ts:18-31`, filled `:49-60`): ~3.5 layers a guard. Keep it in layer k only if its receivers can sample
k: view depth +- (radius + shadow length x |light.view|) against layer k's split plus the blend band. Expected CSM draws
95.7 -> ~48, -0.6 to -0.7 ms CPU, GPU -0.2 to -0.4; campus (outdoor) ~-1 ms. Files: `src/world/sunCascadeCull.ts:45-60`,
`src/world/world.ts:313-316`, `:535`, `tests/sunCascadeCull.test.ts`. Checks: unit (near guard out of the far layer,
shadow crossing a split kept, blend band kept), guard-cap A/B (`?guardsun=0` control), look at the cascade breaks, e2e
smoke sectorops darkness lightbake.

**S10 Freeze: tighter lamp rule (render; freeze files handed over by Sector Ops).** Replace "lamp sphere in view ->
draw" with this guard's own shadow volume (capsule / cone from his body away from the lamp, to the lamp's reach) vs the
frustum, plus occlusion rays where it lands, as the moon capsule does (`sectorGuardFreeze.ts:109-128`). Expected ~0.18 ms
per guard frozen instead of drawn: away cell up to -3.5 ms, campus worst views -0.7 to -1.4 ms (S8 confirms counts).
Files: `src/game/sectorGuardFreeze.ts:98-133`, `sectorGuardFreezeView.ts:148-250`, tests `sectorGuardFreeze*.test.ts`.
Checks: unit (lamp behind the camera whose shadow cannot land in view -> frozen; one that lands -> drawn), A/B with
`?guardfreeze=0`, e2e sectorops stealth-ai darkness, a look shot of an off-screen guard's lamp shadow sliding into view.

**S11 Figure cost to the G8 gate (Player Build, its files).** (a) skip `figure.update` while the freeze disabled the rig
(`origin/feature/guard-models:src/ai/guardBody.ts:225-234`; master's `Enemy.frame` returns in `GuardAnimTier.animate`,
`animTierView.ts:103-110`, `enemy.ts:3695`, before `gb.skip`); must survive the guard-models merge. (b) LOD1 / LOD2 fold
fingers (23-33 bones -> ~19), LOD2 half-rate pose (`guardFigure.ts:593-629`). (c) data levers: LOD0 8 -> 6 m, cascades
draw LOD1+. Expected -0.3 to -0.6 ms CPU, -0.1 to -0.3 GPU.

**S12 Torch shadow casters: cone test (Player while `lightRig.ts` is in its open diff; render after its merge).**
`fillCasters` keeps any caster within reach + 1.5 m (`lightRig.ts:677-690`); test the spot cone. Only if the G8 cull rerun
still shows maplight >= 40 draws at 24 alert. Expected -15 to -25 draws, -0.2 to -0.35 ms.

**S13 Active meshes per guard (conditional on S8b; owner by file).** +15-19 active meshes per on-screen guard where 2
are expected; if S8b finds >= 10 mergeable / disableable (gear parts, glows, a stray LOD): -1.0 to -1.3 ms.

**Dropped: S14 dormancy.** Guard AI (2026-10-24) builds no brain LOD: AI is 0.004-0.013 ms of ~0.22-0.28 ms per guard
(guard-cap #180 and cf5a2bf8), so the AI side saves <= ~0.1 ms. Render already freezes off-screen guards (S10 tightens it)
and Sector Ops unloads other sections' guards (`sectorMode.ts:171-176`). If ever revived: Guard AI owns
`Enemy.dormant` from gameplay facts only (`src/ai/dormancy.ts`), render reads it, never the reverse (CLAUDE.md hard rule).

**Parked:** figure render LOD is already in (LOD0 / 1 / 2 at 8 / 25 m, `lodPick.ts:10`; pose rate by anim tier);
instanced figure batching (-0.5 to -1 ms, needs a shader plugin and loses per-guard culling) only if campus is still over
600 draws after S9 + S12; impostors rejected (light parity, `PLAN.md:40-42`).

Prediction: Sector Ops 24 alert frame CPU p95 10.4 -> ~7.8-9.4; campus S5-worst at 24 with figures ~13.6-14.7 ->
~10.5-12.5. S8 replaces both.

## 3. File split this window (one party per file)
| Party | Files |
| --- | --- |
| Render / Test Runner | `scripts/guard-cap.mjs` (S8b, after guard-models merges); `src/world/sunCascadeCull.ts`, `src/world/world.ts` (S9); `src/game/sectorGuardFreeze.ts`, `sectorGuardFreezeView.ts` + tests (S10, handed over by Sector Ops); `src/world/lightRig.ts` (S12, only after guard-models merges) |
| Player Build | guard-models files (`src/operators/runtime/guardFigure.ts`, `src/ai/guardBody.ts`, ...), `src/world/lightRig.ts` (until guard-models merges), `src/player/characterRig.ts`, `src/weapons/weaponModel.ts`, its `sectorMode.ts` hunks |
| Guard AI Build | `src/ai` except the files above (no phase 2 slice) |
| Nobody | `src/core/flags.ts`: A/B runs use the existing `?guardsun=0`, `?guardfreeze=0`, `?animtier=0`, `?guardmodels=0` |

## 4. Risks and open questions
- guard-models is not on master yet: its merge with master's freeze (#226) and train/51's `animTierView.ts` change must
  keep S11a; line numbers move after train 51.
- S9 may need the cascade split distances from a private `CascadedShadowGenerator` field (as S4 / S7 did); a Babylon
  upgrade could break it silently: pin it with a unit test on the field's presence.
- Laptop noise: every A/B is the same build, back to back, alone on 4189.
- Q (Michael, after S8): if campus S5-worst at 24 is still over 12 ms after S9-S13: the data levers (LOD0 at 6 m, LOD1 in
  cascades), fewer guards in S5, or accept up to ~13 ms there?
