# Guard cap: plan

Brief: `BRIEF.md` (A1-A7). Master 6e8a450b (4.93.0); file:line on master unless a branch is named. Measure first (M0,
M1), then the decision rule picks the slices; only R1 is unconditional.

## 1. Step 0: the fresh measurement
**M0 host / solo run (Test Runner's laptop queue, port 4189 alone, no code).** On master's head, `npm ci` + `npm run build`:

    E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,campus --counts=0,12,16,24,32 --cells=patrol,away,alert --warm=5 --secs=10 --out=C:/NightShift/scratch/guard-cap/m0-<sha>-r1
    E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=ctcourse --counts=0,12,24 --cells=patrol,away,alert --warm=5 --secs=10 --out=C:/NightShift/scratch/guard-cap/m0-<sha>-r1
    MAP=campusOps MODE=sector node scripts/perf.mjs --desktop --json      (real section guards and posts, not the wedge)

then the two guard-cap lines again into `-r2` (A7: decide on the median of r1 / r2). ~13 map x count pairs x ~2 min =
~30 min a repeat, ~70 min in all. Laptop order: only while no train is queued. The lead copies the RESULTS.md files into
`docs/guard-cap/run-m0/` and the table into `REPORT.md` (new section "2026-10 re-measure").
- The sim vs render split is already in the script: sim = `stepHeadless` clean p95 and its buckets (`ai.manager`,
  `ai.anim`, `step.physics`, rays, nav); render = frame CPU on sim frames minus `loop sim / step`, `render() CPU`, GPU ms,
  draws, active meshes.
- Script status (it ran on 6b44efb8 for guard-render-2 and on cf5a2bf8 / c76cf326 / 0fd85e2b for G8, so it works with
  the freeze and S9 / S10). Known gaps, fixed in M2 (after its owners merge), not blockers for M0:
  1. Master names campus `campus` (`--maps=campus`); `campusops` and `--query=` exist only on `origin/feature/guard-models`.
  2. `light.totalAt` reads 0 calls in every 4.64.0 cell: the wrapper (`scripts/guard-cap.mjs:233`) misses the live field.
  3. `ai.anim` is timed in `stepHeadless` only; with guard figures the pose runs inside `render()` (`render.figure` exists
     only on `origin/feature/gm-perf`).
  4. No `near` cell (guards within 4 m, where every anim tier solves every frame).
  5. Guards are N `grunt`s in a 120 degree wedge; check the `spawned` column at 32 ("asked for N, got M" on a small start
     area). `em.maxAlive = n` (`:127`) lifts the cap, so 32 is allowed (`--counts` max 40, `:71`).
  6. Solo / host page only: the co-op client is never measured (M1).
- After guard-models merges with its flag still off: one more M0 repeat with `--query=guardmodels=1` (figures).

**M1 co-op client + wire run (new script, slice M1 below, then a 4189 run).** Two and four pages over `?net=local`
(`hostAndJoin`, as `scripts/e2e-sectorops.mjs:756`), campus / sectorops sector mode, N = 0, 12, 24, 32 guards spawned on
the host page as guard-cap does, cells patrol / away / alert. Per page: frame CPU med / p95, render() CPU, GPU ms,
draws, active meshes, puppets alive; host: snapshot JSON bytes (median / max per `snap`, per second, at 1 and 3
clients), `ev` / `lamps` bursts.

## 2. Decision rule (A3; worst cell alert/facing, median of the repeats, at 24 and 32)
| Reading | Then |
| --- | --- |
| Host frame CPU p95 <= 12, GPU p95 <= 15, sim p95 <= 2.9, client frame CPU p95 <= 12, snap <= 6 KB at 4 players | No build beyond R1. Record "32 holds" (DOC). |
| Sim p95 > 2.9 and `ai.anim` >= 50% of the sim growth (N vs 0) | T1 (anim tier periods), brief to Guard AI; the figure pose share goes to Player (PLAN2 S11). |
| Sim p95 > 2.9 and `ai.manager` (brain + torches) >= 40% of the growth | D1 (dormant brains) + D2 (shared light / exposure reads), brief to Guard AI. |
| Host frame CPU p95 > 12 or GPU p95 > 15 with sim p95 <= 2.9 | Render: send the cells to Test Runner as PLAN2 additions (A5). If still over at 32 after guard-render-2 and gm-perf merge: K1. |
| Client frame CPU p95 > 12, or client minus host > 1.0 ms at the same N | C1 (puppet anim tiers), then C2 (puppets in the render freeze) if still over. |
| Host snap > 6 KB steady at 4 players, or host upload > 1.7 Mbit/s (coop4 A24) | N1 (rate split). |
Expected from today's numbers (BRIEF table): sim p95 ~3.0 at 24 rising to ~3.4 at 32, mostly `ai.anim` (T1, not D1);
host render near 12 at 24 (guard-render-2's job); the client is the unknown.

## 3. Slices
| Id | What | Files (exact) | Owner | Model | Gate | Parallel now? | Est |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M0 | Host / solo re-measure (section 1) | none (outputs in scratch, then `docs/guard-cap/run-m0/`, `REPORT.md`) | Marlow Build requests, Test Runner runs | - | none | YES | 1.5 h laptop |
| M1 | Co-op client + wire measure script | new `scripts/guard-cap-coop.mjs` (imports `e2e-net-lib.mjs`, `e2e-lib.mjs` read-only) | Marlow Build | Sonnet (Opus brief), Sonnet checker | none | YES | 2.5 h + 1 h laptop |
| R1 | Allocation-free sight rays | `src/ai/perception.ts:80-82`, `src/ai/reconDrone.ts:179`, `tests/perception.test.ts` | brief for Guard AI Build (or Marlow Build with "Guard AI OK") | Opus, Opus checker | none (files free 6e8a450b) | YES, on Guard AI OK | 1 h |
| M2 | guard-cap.mjs gaps 2-4 + 32-guard real-section cell | `scripts/guard-cap.mjs` | Marlow Build | Sonnet | after gm-perf (and guard-models) merge | no | 1.5 h |
| T1 | Anim tier periods (if sim-bound by anim) | `src/ai/animTier.ts:24-30`, `tests/animTier.test.ts` | brief for Guard AI Build | Opus | M0 verdict; `animTierView.ts` untouched (gm-perf) | after M0 | 0.5 h + A/B |
| C1 | Client puppets on the anim tiers | `src/net/enemyPuppet.ts:372-455`, new `tests/puppetAnimTier.test.ts` | Marlow Build | Opus, Opus checker | M1 verdict; after guard-models + gm-perf merge | no | 3 h |
| C2 | Client puppets in the render freeze | `src/game/sectorGuardFreezeView.ts` (`FreezeGuards`), `src/net/coopClient.ts` (wiring), `tests/sectorGuardFreezeView.test.ts` | brief for Test Runner (PLAN2 addition); `coopClient.ts` hunk by Marlow Build | Opus | M1 verdict after C1; after guard-render-2, coop4, optic-coop, guard-ai-coop-carry merge | no | 3 h |
| D1 | Dormant brains (wake rules), D2 shared light / exposure reads | new `src/ai/dormancy.ts`, `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, new `tests/dormancy.test.ts` | brief for Guard AI Build | Opus, two Opus checkers (AI) | M0 verdict; after guard-models + gm-perf merge | no | 5 h |
| N1 | Snapshot rate split for far, calm guards | `src/net/coopHost.ts:1441-1455`, `src/net/coopClient.ts:430-457`, `src/net/protocol.ts` (field only, no version), `tests/snapBudget.test.ts`, `tests/net.test.ts` | Marlow Build | Opus, two Opus checkers (`src/net`) | M1 verdict; after coop4, optic-coop, guard-ai-coop-carry, guard-models merge | no | 4 h |
| K1 | Clamp `SECTOR.maxAlive` to the measured N (>= 24) | `src/game/sectors.ts:508`, `tests/sectorTeamScale.test.ts` | Marlow Build | Sonnet | M0 + guard-render-2 verdict; after coop4 merges | no | 0.5 h |
| DOC | Cap and counts in the docs, changelog fragment | `docs/systems/performance.md:64`, `docs/guard-cap/REPORT.md`, `changes/feature-guard-cap.md`, `TESTING.md` if a check changes | Marlow Build | Sonnet | after guard-models merges (it edits performance.md) | no | 0.5 h |

### M1 brief (Sonnet from this text)
New `scripts/guard-cap-coop.mjs`, header usage like `scripts/guard-cap.mjs:1-40`. `E2E_GPU=1` required (else exit),
port `E2E_PORT` (4189), headless. `--maps=campus,sectorops --counts=0,12,24,32 --cells=patrol,away,alert
--players=2,4 --warm=5 --secs=10 --out=<dir>`. Per (map, players, N): `hostAndJoin(url, players, { params:
'net=local&sectorGuards=0&gfx=epic' })`, start sector mode as `e2e-sectorops.mjs:756-` does; on the host page spawn N
`grunt`s with the same page function guard-cap uses (copy `pageSpawn`, `scripts/guard-cap.mjs:117-182`, do not import or
edit that file); alert cell = `e.alert()` per guard as guard-cap (`:475`). Sample every page with rAF frame CPU and `scene.render()`
CPU (the guard-cap counters), GPU timer when exposed, draws, active meshes, `CoopClient.puppetList.length` (private, `coopClient.ts:74`: read it through the page object). Host wire:
wrap the transport's send on the host page and record `JSON.stringify(msg).length` per message type (`snap`, `ev`,
`lamps`, `sector`), per second. Output `RESULTS.md` + `.json` + `.csv` (columns per page role). No `src` change.
Check: `node --check`; one GPU smoke on the laptop (`--maps=campus --counts=0,12 --players=2 --secs=3`).

### R1 brief (Guard AI Build, or Marlow Build with its OK)
`losClear` (`perception.ts:80-82`) calls `b.ray`, which allocates a hit object, `to.clone()` and `Vector3.Up()` on
every sight ray (`src/weapons/ballistics.ts:115-136`); it runs on every think for every guard (`enemy.ts:2228-2240`,
`:2350-2351`) and in `reconDrone.ts:179`. Make `losClear` use `hitDistance(from, to, mask)` when the object has it
(`Ballistics.hitDistance`, `ballistics.ts:83-88`, allocation-free) and keep the `ray` path for test doubles and the
editor's `SightRay` (`src/editor/security.ts:419`, unchanged). `reconDrone.ts:179`: same (`hitDistance` + slack test). Same
verdicts: `!hit || dist > len - slack` == `hitDistance > len - slack`. Tests: `tests/perception.test.ts` (a double with
both methods: only `hitDistance` called; same verdicts as the `ray` path at, before and past the slack), `tests/armour.test.ts`
and `tests/coopPerception.test.ts` unchanged and passing. e2e (laptop queue): `e2e-stealth-ai`, `e2e-enemies`. No perf
run (hygiene). `Ballistics.ray` itself stays: its other callers are per shot (`enemy.ts:3399`, player weapons).

### C1 brief (after guard-models + gm-perf merge; re-read `enemyPuppet.ts` then, line numbers move)
The puppet's rig solves every frame (`enemyPuppet.ts:451`). Feed it the pure tier rule (`src/ai/animTier.ts`, read only):
near any local player within `ANIM_TIER_NEAR_PLAYER` or pinned (taken / remote hold / emote) every frame; off-screen
(its merged body or figure drawn in no local view last render) every `ANIM_TIER_OFFSCREEN` th; far every
`ANIM_TIER_FAR_PERIOD` th; skipped time carried as `Enemy.frame` does; staggered by a slot from the id. Gameplay is
unaffected: the hit head is the sim head from wire state (`guardHead`, `enemyPuppet.ts:453-454`) and the hit volumes
sync from `pos` every frame. Hot path: no closures or temp vectors; the tier input struct is a field. Tests:
`tests/puppetAnimTier.test.ts` (NullEngine: off-screen solves every 4th, near every frame, hit head equal tiered vs
untiered), `tests/animTier.test.ts`. e2e: `e2e-coop`, `e2e-netmove`, `e2e-sectorops`. Perf: M1 rerun, client cells.

### C2 brief (Test Runner, as a PLAN2 addition)
`FreezeGuards` (`sectorGuardFreezeView.ts:26-28`) takes `Enemy[]`; the client has puppets only and no SectorMode
(`gameState.ts:677-681`, `:719`). Generalise to a small body interface (rig root, feet pos, height, alive) that `Enemy` and
`EnemyPuppet` both satisfy, and construct the freeze on a co-op client in sector mode from `coopClient` (one hunk, after
the listed `src/net` branches merge). Render only; the client's light field and meter are untouched (light parity).
Tests: `tests/sectorGuardFreezeView.test.ts` (a puppet list frozen / thawed). e2e: `e2e-coop`, `e2e-sectorops`. Perf:
M1 rerun with `?guardfreeze=0` A/B. Look shot: a partner's view turning onto a frozen puppet.

### D1 / D2 brief (Guard AI Build; only if the rule triggers)
- `src/ai/dormancy.ts` (pure): a guard is DORMANT when calm (alert 0, no incident, search or radio task), not in a
  takedown / carry / hold, no alarm stage, and every player (local and remote refs, `playerRefsInto`) is beyond
  `WAKE_R` = his sight range + 5 m and not within 15 m on his storey. Wakes at once on any of those, on `hear()`, a
  device alert, a found body or a radio call; never on anything graphical (frustum, freeze, LOD, preset). Optional cap:
  if awake > `MAX_AWAKE` (from M0), the farthest calm guards sleep first; a guard that must wake always wakes.
- Dormant: think period x4 (`enemy.ts:2136-2138`), no sight rays, patrol on rails (waypoints, no repath), torch placed
  every frame from pos / yaw (light parity: his torch still lights and the field still reads it), anim tier unchanged.
- Co-op: the host decides with every player's ref; the client never runs AI; no wire change (dormant guards are still
  in the snapshot).
- D2: one light / exposure read per player per think window shared by all guards (the `lightAt` at `enemy.ts:232`).
- Tests: `tests/dormancy.test.ts` (each wake rule; remote player wakes; never reads graphics), the enemy manager tests;
  e2e `e2e-stealth-ai`, `e2e-enemies`, `e2e-sectorops`, `e2e-coop`. Perf: M0 rerun, sim buckets.

### T1 brief (Guard AI Build; only if anim-bound)
`ANIM_TIER_OFFSCREEN` 4 -> 8 (`animTier.ts:28`), nothing else (the far tier is visible). Tests: `tests/animTier.test.ts`
reads the constant. Perf: M0 rerun `away` cells. Look: none (off-screen only).

### N1 brief (only if the rule triggers)
Host: guards within 40 m of any player, or not calm, in every `snap`; the rest in every 3rd, rotating. Client: a puppet
missing from a snap is kept until it misses 4 of its slots (today 0.5 s, `coopClient.ts:450-457`); interpolation
buffer tolerates the gap. Host authority unchanged. Wire: a field naming the cadence or the kept ids; the train bumps
`PROTOCOL_VERSION`; tests read the constant. Tests: `tests/snapBudget.test.ts` (32 guards, 4 players, far half rated),
`tests/net.test.ts`. e2e: `e2e-coop`, `e2e-netmove`, `e2e-sectorops`.

## 4. File ownership (re-checked `git fetch` + `git diff --name-only origin/master...origin/<b>`, 2026-10-24 ~18:30)
| Branch (session) | Files this plan needs that it holds |
| --- | --- |
| guard-render-2 (Test Runner) | `sectorGuardFreeze.ts`, `sectorGuardFreezeView.ts`, `sectorMode.ts`, `world.ts` |
| gm-perf, guard-models (Player Build) | `scripts/guard-cap.mjs`, `src/ai/enemy.ts`, `enemyManager.ts`, `animTierView.ts`, `src/net/enemyPuppet.ts`, `coopHost.ts`, `protocol.ts`, `docs/systems/performance.md` |
| guard-ai-coop-carry (Guard AI) | `src/net/coopClient.ts`, `coopHost.ts`, `protocol.ts` |
| coop4, coop4-pol (Sector Ops) | `src/game/sectors.ts`, `sectorMode.ts`, `src/net/coopClient.ts`, `coopHost.ts`, `protocol.ts` |
| optic-coop (Player) | `src/net/coopClient.ts`, `coopHost.ts`, `protocol.ts` |
Free now: `src/ai/perception.ts`, `src/ai/reconDrone.ts`, `src/ai/animTier.ts`, `tests/perception.test.ts`,
`scripts/guard-cap-coop.mjs` (new). Each lead re-runs the check before starting a gated slice.

## 5. Order
Now, in parallel: M0 request, M1 build, R1 brief to Guard AI. Then M1's run. Decision rule on M0 + M1 (one Opus read,
REPORT.md section). Then the triggered slices as their gates open; DOC last. One batch PR `feature/guard-cap` per
train (M1 + R1 + DOC; `src/net` slices are their own PR with their area suites first).
