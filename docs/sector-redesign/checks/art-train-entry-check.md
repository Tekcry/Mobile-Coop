# #226 train entry check - master merge, animTier fold, artnext C7-C9

Checker: fresh Opus 5.5, 2026-10-24, read only. Head `1da8849d` (`feature/sector-redesign-art`) = merge `ab121ece`
(master `cd229330` into `477a3390`) + the report commit. Detached worktree, removed after. Report checked:
`docs/sector-redesign/checks/art-train-entry.md`.

## Verdict: PASS

No must-fix items.

## 1. Conflict resolutions
Method: for every file both sides changed since the merge base `4a65d692` (40 files), each side's added lines vs the
merge result, and the merge's lines vs master that neither side added. Files only one side touched: our 20 files absent
from `git diff ab121ece^2 ab121ece` all equal master, except `animFrozen.ts` / `animFrozen.test.ts` (deleted by the
fold), `anchors.ts` (merge = master: one `Door.leaf`, master's `seal` kept) and `scripts/perf.mjs` (master already has
our `MODE` change; the merge takes master's comment).

| File | Result |
| --- | --- |
| `BRIEF.md` | A-D-1..3 + A99 before A100, nothing lost |
| `flags.ts` | `guardFreeze` and `photoLamps` fields and inits both present |
| `sectorMode.ts` | freeze imports + `responseTeam` / `SweepTeam` / `EnemyKind` kept; freeze ctor / dispose / debug fields intact |
| `stealthSystems.ts` | one `lights` import (`groupBaseOn, lampReachProbe, lightOnRay, LightRegistry`) + `BreakerHost`; both users present (`:555`, `:652`) |
| `ballistics.ts` | `cast()` and `armouredFirst()` both present |
| `mapDef.ts` | `campusArt?`, `kit?`, `facilityProps?` all present |
| `levelBuilder.ts` `door()` | master's opts order (`leaf, armoured`), body sets both fields (`:308-314`); no duplicate slide-leaf line; our `art` mark flag, `hidePieces`, `sheets`, sheet `y0/y1` kept |
| `facilityProps.ts` (add/add) | ours (`mark` with `art`), a superset of master's interface; the only line vs master |
| `world.ts` | master's voxel GI removal kept (no `giSlotOf` / `giLights` / `voxels` left); `kit`, `facilityProps`, `campusArt` fields; campus art load after the lamps (as on our branch), dispose kept |
| `enemy.ts` | master's S4 tier call replaced by `animTier.animate(...)` with the same args and `pinned` expression; our `animFrozenStep` lines replaced by the fold. Nothing else differs from either side |
| `doors.ts`, `lights.ts`, `e2e-sectorops.mjs`, net files | auto-merged, nothing lost either way |

The only lines in the merge that neither side wrote are the fold / C7 / C9 lines in `enemy.ts` and the merged
`stealthSystems.ts` import. `.gitignore` adds `*.pyc`; one stale `__pycache__/common.cpython-313.pyc` is deleted (fine).

## 2. The fold (`src/ai/animTier.ts`, `animTierView.ts`)
- Non-frozen guards: `animTierPeriod` returns master's values once `frozen` is false (the new rule is first, the rest
  untouched); `animTierStep` only branches on `st.thaw`, which is set only by a frozen update. `?animtier=0`, pinned,
  near-player, off-screen (4), far (2) behave as on master; `animate()` for a never-frozen guard is exactly
  `rig.animate(dt, rp, tierDt)` on `rig.root` (= master's `r`). `GuardAnimTier.dt` keeps its old signature (new
  `frozen = false` default); `Enemy.frame` is its only caller.
- Frozen: period `ANIM_TIER_FROZEN` 0 -> skip, `animate` returns before `rig.animate` (no solve, no glide), carry
  capped at 0.1 s; `thaw` set; the next non-frozen step solves regardless of period / stagger (`animTierThaw`), and the
  C7 `solveNow` clears it first when the freeze thaws him.
- Hot path: no allocation (`inp` / `st` reused, `isEnabled(false)` read, squared-distance compares); no `Math.hypot`
  (`replantIfMoved` compares squares).
- Other root disables: dogs (`enemy.ts:434`) take the dog branch, never the tier; `shoulderCamera.ts:496` is the
  player's rig. So FROZEN only ever means the render freeze.

## 3. C7 / C8 / C9 risk
- C7 runs `CharacterRig.animate` inside `onBeforeActiveMeshesEvaluationObservable`: the same solve `Enemy.frame` runs
  every frame (guard rigs have no `groundProbe`, so no physics ray in it), with dt = the carry (> 0 in play: his
  `frame` ran frozen first). Velocity / yaw-rate divisions are behind `dt > 0`. Being before the active-mesh
  evaluation, the new pose is what both the shadow maps and the main pass draw: no stale frame. Throw risk = the
  normal per-frame solve's; not new. Watch `e2e-sectorops` for a pose pop as the report says.
- Gameplay reads no render state: `thawPose` and `solveNow` write only the rig; the freeze reads `alive` / `taken` /
  `dog` (render reading gameplay, allowed). C9 makes the ragdoll seed independent of this page's camera.
- C8 `replantIfMoved(0.3)`: only on a thaw solve (frame path when the C7 thaw did not run, `solveNow` always); resets
  planner init, motion derive, measured velocity and `prevRoot`, as the 2 m jump rule does. Never on a non-frozen guard.

## 4. Wire / PROTOCOL / save
`src/net/protocol.ts` = master (`PROTOCOL_VERSION` 43). Net diffs vs master: polish2 `lampReachProbe` checks in
`coopClient.ts` / `coopHost.ts` / `lampSync.ts` (`MASK.WORLD` = `G.STATIC`), no message field. No save / settings file
touched.

## 5. Runs
- `npx tsc --noEmit -p .`: clean.
- vitest `--maxWorkers=2` (slot lock `sr-slot-1`): `animTier`, `sectorGuardFreeze`, `sectorGuardFreezeSeeThrough`,
  `sectorGuardFreezeView`, `enemyGunMerge`, `enemyLightsOut`, `enemyManagerDespawn`, `rig`, `animRig` (no
  `characterRig*.test.ts` exists) + the 5 PROTOCOL_VERSION files (`mergeTrain`, `net`, `protocolConst`, `ratingWire`,
  `rejoin`): 14 files, 231 / 231 passed.

## Polish (not blocking)
1. C9 solve time is `0.1 + carry` (up to 0.2 s), the brief said one 0.1 s solve: `src/ai/enemy.ts:1770` pass `0`
   (`solveNow(this.rig, 0, this.rp)`: the carry is already capped at 0.1) or keep and note it in the brief.
2. The real `Enemy.thawPose` / `die()` C9 wiring is only covered by a mimic (`tests/sectorGuardFreezeView.test.ts:374`
   fakes `thawPose` with `tier.solveNow`): a NullEngine `Enemy` case would pin the actual calls.
3. `SectorGuardFreeze.dispose()` (`sectorGuardFreezeView.ts:348`) thaws through `thaw()` and so solves every frozen
   guard at mode teardown (dt may be 0 there). Harmless; a `thaw(k, pose = true)` with `false` from `dispose` would skip it.
4. `GuardAnimTier.dt` still loops players and cameras for a frozen guard (`animTierView.ts:66-93`); an early
   `if (frozen)` after `lastFrame` / `seen` would skip that work for the frozen majority.
5. `GuardAnimTier.thawing` getter is read only by tests.
6. Pre-existing, not this PR: the ragdoll (and so `Body.pos`, read by body discovery) is seeded from the render pose
   (`enemyManager.ts:563`). C9 makes it camera-independent; worth a line in the guard-render docs.
