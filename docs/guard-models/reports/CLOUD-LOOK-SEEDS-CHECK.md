# CLOUD-LOOK-SEEDS check - feature/gm-look-seeds d212ddfd

Checker: Night Shift | fresh Opus checker, 2026-10-24. Brief: `origin/cloud-queue:briefs/player-gm-look-seeds.md`.
Base `origin/feature/gm-flip` 979a02b3. Reviewed in a detached checker worktree with `feature/gm-perf-polish` merged in
(no conflicts), never pushed.

## Verdict: PASS

No blockers. **No wire change**: no `src/net` file in the diff, no `PROTOCOL_VERSION` edit. The seed still goes out as
`Enemy.look` in the `al` bits (`coopHost.ts` `packAlert(..., e.look)`), read by the puppet via `alertLook`
(`enemyPuppet.ts:429`); `freeLook` / `& LOOK_MAX` keep it in 0-127, so the 7-bit format is unchanged. Nothing in
`src/net` computes a seed itself (`grep posLook|slotLook|teamLook src/net`: none), so the client shows exactly the host's
choice.

## Correctness
- `freeLook` (`src/ai/guardLook.ts:56`): first free from `preferred` mod 128, all taken -> `preferred & 127`. Pure, no
  allocation, no `Math.random`. `distinctLooks` (:69): first claimer keeps its seed, the local mask restarts past 128, so
  repeats past 128 spread at most twice. Sane fallback.
- Determinism from map data: authored seeds come from `slotLook` / `posLook` over map data in DATA order
  (Sector `s.guards` order, Course `ids` order, Infiltration rooms then slots, before `fill` sorts by player distance),
  so spawn order, player start and a restart cannot move them. Restart: Sector `unloadSection` -> `despawnAll` ->
  `clear()` zeroes `lookUse`, then the load block's `beginLooks` (`sectorMode.ts:702-710`); Course `spawnSquad`
  re-runs `pointLooks` over the same ids (`dropSquad` despawns every manager guard first, so no stale guard is forgotten
  by `beginLooks`' replace).
- Sector slot seeds untouched: still `em.lookOfSlot(s.id, k)` = `slotLook`, passed explicitly; `spawn` keeps an explicit
  look as `look & LOOK_MAX` (`enemyManager.ts:1896`). Test asserts them exactly.
- Runtime spawns (reinforcements, teams, Hunter / Mission) take `freeLook` against everything already counted: lone
  reinforcements at one entry point no longer share `posLook`. `joinTeam` gives back the seed `spawn` counted for him
  before taking `freeLook(teamLook)` (`enemyManager.ts:1040-1042`), so the mask stays exact.
- `lookUse` is never decremented on death / despawn (a body keeps its look; `revive` keeps it): as briefed.
- Gameplay never reads it as graphics state: `lookUse` is plain manager bookkeeping, `e.look` only drives the look.

## Hot path
None per step: `freeLook` is a <= 128 loop at spawn / join; `pointLooks`, `distinctLooks` and the Infiltration
`pending.map` allocate at load only. No closures in per-frame loops.

## Tests
- `guardLook.test.ts`: exact-key asserts replaced by a `mirror()` of the rule (slot kept, point / team moved on when
  taken, the team member's spawn seed given back) plus "all of one load distinct"; restart / reload / spawn-order
  equalities and the map-less stub kept. `guardLookDistinct.test.ts` (7, new) covers every case the brief listed. Both
  depend on `freeLook` / `distinctLooks` / `beginLooks` / `pointLooks`, which do not exist on base, so they fail there.
- Deviation accepted: `courseConsole.test.ts` and `marlowN4Hold.test.ts` stubs gained `pointLooks: () => []` (their stub
  managers lacked it); `seeds[j]` is then undefined -> `spawn`'s look -1, the old behaviour. Test-only, justified.
- Merged worktree (both branches): `npx tsc --noEmit -p .` clean; eslint clean on the 9 changed files; vitest 46 files /
  585 tests pass (the 35 files importing enemyManager / guardLook / guardGearMerge, plus the brief's list and the
  perf-polish files). No e2e run (unit-only brief). The optional Course `bayRestart` harness test was skipped (builder
  said so; the manager side is covered by the `pointLooks` + `resetMemory` case).

## Polish (optional)
1. Hunter / Mission never call `clear()` between waves, and `lookUse` is never decremented, so after 128 spawns in one
   such session every later spawn falls back to its `posLook` (repeats as before this change, no regression). If the
   parked modes return, `beginLooks([])` per wave would keep live guards distinct.
2. `lookUse` is a `Uint16Array`: a seed counted 65,536 times in one section wraps to 0 (just "free" again). Unreachable
   in practice; a note only.
3. `beginLooks` replaces the counts; any future caller that loads authored seeds while other guards are alive (not the
   case today in Sector, Course or Infiltration) should add instead.
