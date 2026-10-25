# ALLOC check B (PR #446, feature/guard-ai-alloc @ 864520c4)
Checker: Opus, checker B. Focus: aliasing safety of the shared scratch (HIT_OUT, SHOT_* / BITE_* / THROW_FROM, GOAL_OUT,
GOAL_PT / KNOWN_TP / CHASE_*), re-entrancy, hard rules.

## Verdict: FIX (1 blocker)

## Checks run
- `npm run typecheck:fast`: FAIL, 1 error (CI `build-check` fails on the same head):
  `tests/guardAiAllocManager.test.ts(34,174): TS2322 FakePlayer[] is not assignable to readonly PlayerRef[]` (missing `speed`, `crouched`).
- `npx vitest run tests/guardAiAlloc.test.ts tests/guardAiAllocManager.test.ts`: 2 files, 8 tests pass.

## Fix list (ranked)
1. **tsc red (blocker).** The new manager test's `() => ps` passes `FakePlayer[]` where `EnemyManager` wants
   `readonly PlayerRef[]`. Done looks like: `FakePlayer` gets `speed: 0, crouched: false` (or the getter casts
   `ps as unknown as PlayerRef[]`); `npm run typecheck` clean; CI `build-check` green.
2. **KNOWN_TP can be kept past the call (should fix, small).** `decide` hands the module `KNOWN_TP` to `chasePoint` ->
   `goTo(tp)` (stealth, `hunt < 0`). `NavGrid.findPath` returns `[to]` when start and goal share a cell
   (`src/ai/navGrid.ts:605`), so `routePath = [KNOWN_TP]` is kept across frames. The next alerted guard's `decide`
   rewrites it, and a guard that drops to calm walks `routePath[0]` (another guard's known spot) until his route
   refreshes (up to `routeT` 1 s). Before the PR the stored array was his own fresh `tp`. The comment "goTo copies its
   goal into routeGoal" is not true on that branch. Done looks like: `tp` is a per-guard buffer (e.g. `this.knownPt`,
   already filled with the same values) or `findPath` returns a copy for `s === g`; the KNOWN_TP comment matches.

## Aliasing audit (clean unless listed above)
- `applyDamage` receivers: PlayerTarget (zone from `h.point.y`; onDamaged -> gameState bearing from `sourcePos.x/z`,
  shake, haptic, `attachCtl.onHit`; gameAudio hurt sfx; onDeath -> onPlayerDeath, no `h`), RemotePlayer (coopHost
  `hurt` pushes `sourcePos.x/z` numbers; onDeath no `h`), Enemy as hostage shield (stimulus / lastKnown copy,
  `die` -> `h.dir.scale` fresh impulse, `addBody` copies, onKilled -> stats / feed / style / mode `onEnemyKilled`
  (scalars only) / coopHost `onKill` (scalars)), PartnerTarget / EnemyPuppet / ReconDrone (reject enemy attackers),
  TrainingDummy (not a guard target). No receiver stores `h`, `h.point`, `h.dir`, `h.sourcePos`, and none writes a
  HitInfo field (grep), so the unset `takedown` / `weapon` / `nonLethal` stay undefined.
- Re-entrancy: nothing under a hit (alert, bark, radio, callAlert, die, handlerDown, downed, player death) fires a guard
  shot, bite or throw in the same stack; shots only come from `update -> tryFire -> shoot`.
- Hooks: `onShot` -> gameAudio (own tmp), gameState sway and coopHost tracer (copy x/y/z); `suppress` reads only.
- vfx `tracer` / `muzzleFlash` / `sparks` / `hit` copy into pooled meshes; `ballistics.ray` clones the hit point (and
  `to` on a miss); `impactFx` / `onImpact` read only; `props.impulse` -> Havok `applyImpulse` (copied);
  `Grenades.throw` copies `from` (`node.position.copyFrom`).
- GOAL_OUT: one consumer (`update` -> `move`, read at once; `move` keeps no goal). Blind pose: per guard, rig
  `lastFk` fade reads the last written pose (correct).
- Module state: plain data only (no scene refs: Waypoint / NavLink are numbers), so no GameState retention across
  reloads; co-op client runs EnemyPuppet, not Enemy; flow buffers are per manager. Tests reset nothing they rely on.

## Hard rules
- Shot / bite / throw / goal paths: no closures, iterators or temp vectors left in `src/ai/enemy.ts` changed code;
  manager loops are index loops; no `Math.hypot`; no `src/net` change; strict TS fails only on item 1.

## Polish
- `throwGrenade` (enemyManager) still makes `new Vector3` per throw (rare; `Grenades.throw` allocates anyway).
- `die` keeps `h.dir.scale(...)` (once per death, pre-existing).
- HIT_OUT keeps the last RayHit point / attacker id between hits (harmless, tiny retention).
