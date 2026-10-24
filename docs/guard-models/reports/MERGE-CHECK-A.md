# Merge check A: master merge on feature/guard-models (AI / wire side)

Checked: merge 8809aab9 (`git show --remerge-diff`, plus `git diff 8809aab9^2 8809aab9` = everything guard-models adds
over master) and 89c10827. Files: animTierView.ts, enemy.ts (die, frame, thawPose), guardBody.ts, enemyManager.ts,
lightRig.ts, protocol.ts (+ coopHost / enemyPuppet / sectorMode callers), guard-cap.mjs, e2e-coop.mjs, guardLook.test.ts.
Fresh Opus checker A, no code edited.

## Verdict: PASS

No blocker: no AI or timing change with `flags.guardModels` off, no wire break, no lost master fix, no crash path.

## Tests (one at a time)
- `npx vitest run $(grep -rl PROTOCOL_VERSION tests)` (coopRejoin, guardLook, mergeTrain, net, protocolConst,
  ratingWire, rejoin): 7 files, 171 pass.
- net 75, guardLook 13, animTier 20, coopGuardAi 15, coopTorches 12, guardLampCasters 4: all pass.
- `npx tsc --noEmit -p .` clean.

## Findings

**Flag off: master's freeze and AI unchanged.** `flags.guardModels` is `=== '1'` (flags.ts:132), so `Enemy.gbody` /
`EnemyPuppet.gbody` are null (`guardModelsFor`, guardBody.ts:41). Every added line in enemy.ts is behind it:
`if (gb) watch` / `if (gb) gb.skip` (enemy.ts:3739-3742), `this.gbody?.figure.update` in `thawPose` (:3757),
`if (this.gbody) flash = 0` in `die` (:2036), `showGear` / helmet knock-off / enforcer shield fall back to master's code
byte for byte. Master's `GuardAnimTier.animate` (frozen early return, thermal ghost, C8 re-plant), `thawing`,
`solveNow` are untouched; `dt()` only also stores `lastDt` (animTierView.ts:110), no other side effect. The only
always-on AI-side additions are the look seed: `posLook` / `slotLook` / `teamLook` are pure hashes (no `Math.random`,
no `Rng` draw, no order change) at spawn / `joinTeam`; `Enemy.look` is read by no AI code (only the figure and the
wire). `sectorMode` passes `em?.lookOfSlot(...)` in `Pending`: data only.

**S11 merge items, all in place.**
1. animTierView.ts: master's `dt(..., frozen = false, shown = false)` + `lastDt` / `get skipped` (:52-58) + the
   `lastDt =` return (:110) + `watch()` (:72). Master's `animate` calls `dt()` before its frozen return, so `skipped`
   is true while frozen.
2. enemy.ts `frame`: `watch` -> master's `animTier.animate(...)` -> `gb.skip = animTier.skipped` (:3739-3742);
   `tierDt` / `rig.animate` gone.
3. guardBody.ts:236 keeps `(!this.skip && this.rig.root.isEnabled(false)) || f.current < 0` (not touched by the merge).
4. S11-CHECK P1: `thawPose` calls `this.gbody?.figure.update(this.ctx.scene.activeCamera)` after `solveNow`
   (enemy.ts:3752-3758). Correct place: `SectorGuardFreeze.thaw` enables the root, then calls `thawPose` inside
   `onBeforeActiveMeshesEvaluation`, after `GuardBody.frame`.
- `die`: master's C9 frozen `solveNow` first, then the figure's flash reset (order-independent).

**Wire.** `PROTOCOL_VERSION` 50 = master's (protocol.ts:21). No message shape changed; only `al` gains bits 9-15
(`AL_LOOK_SHIFT` 9, `AL_LOOK = 127 << 9`, `AL_MAX` 65535). Parse (protocol.ts:397) clamps to `AL_MAX` and floors:
the old 0-511 range parses as before, negatives -> 0, oversize -> all bits (same rule as master's 511). Every reader
masks (`& 3`, `AL_TORCH`, `AL_CAUTION`, `GEAR_BITS`, `alertCarry`, `alertLook`; enemyPuppet.ts:218-429, puppetGear.ts),
so the extra bits disturb none. Encode `(look & 127) << 9` / decode `(al & AL_LOOK) >> 9` are symmetric; guardLook.test
round-trips all 128 seeds x every older bit (65536 cases) and through `parseMessage` JSON, plus the clamp cases.
Version checks read the constant (protocolConst.test guards it); the literal 65535 in coopGuardAi.test:42 /
coopGuardCarry.test:36 is the bit-layout row, not the version.

**lightRig.ts.** Both kept, correctly ordered between picks: `follow(pool)`, `follow(shadowPool)`, then
`if (castersDirty) refillCasters()`, then master's `followTorches()` (:559-563); the pick path clears `castersDirty`
and `put()` fills each slot. Torch handling is master's: flashlight slots move every frame in `follow`, their caster
lists refill at every pick (0.25 s) as on master, and now also on any caster enable change; the drawn torch slots are
rewritten every frame. `addCaster` keeps master's dispose cleanup; `removeCaster` drops the new callback.

**Scripts / tests.** guard-cap.mjs keeps both `campusops` (G8) and master's `campus` (same query). e2e-coop.mjs: header
comment only (S23 / S24 + G9 both kept). guardLook.test's stub `Enemy` gains master's `tell` (spawn's `sendIn`).

## Polish (none blocks)
- **P1 (flag-off render, pre-existing G8 cull, not the merge).** lightRig's G8 cull is not behind the flag:
  `fillCasters` skips disabled meshes (lightRig.ts:711) and every caster's `onEffectiveEnabledStateChangedObservable`
  marks a refill (:475). With master's render freeze, a guard frozen at a pick / refill is out of the flashlight shadow
  lists; on his thaw (in the render's evaluation, after `world.frame` ran `lightRig.update`) the refill comes next
  frame, so he casts no flashlight-pool shadow for one frame (master: listed all along, the RTT only skipped him while
  disabled). Also each freeze toggle costs one refill (shadow slots x casters bounds tests). Render-only, nothing
  gameplay or perception reads, and moot when the torch atlas holds the shadow pool at 0. Fix if wanted: gate the
  `isEnabled` skip and the observable on `flags.guardModels`, or skip disabled meshes only when they are figure LODs.
- **P2.** S11-CHECK P2 still open (killed while frozen: the ragdoll's first frame shows the pre-freeze figure pose):
  add `this.gbody?.figure.update(this.ctx.scene.activeCamera)` after the C9 `solveNow` in `die` (enemy.ts:2035).
- **P3.** Mixed builds at version 50 (a master v50 peer clamps any `al` > 511 to 511: every guard alert / seized /
  lit). Fine by the process: `merge-train.mjs build` bumps `PROTOCOL_VERSION` because protocol.ts / coopHost /
  enemyPuppet are wire paths. Make sure the PR goes through the train build, not a direct merge.
- **P4.** The seed rides the wire with the flag off too: up to two more JSON digits per enemy per snapshot. Negligible.
