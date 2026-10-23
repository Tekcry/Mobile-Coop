# LR16 batch 1 - checker B (src/net and gameplay side)

Fresh Opus checker B, 2026-10-23. Branch `feature/sector-redesign-lr16int` @ c7a26ca7, diff base 1c22b913
(`feature/sector-redesign-lampx`). Did not read checker A's file.

## Verdict: PASS

No blocking items. Nothing broken or unplayable on the co-op, perception, meter, settings, ghost or lamp-move side.

## What was checked
1. **Co-op wire (LR16a).** `start.lf`, `StartInfo.lampFalloff`, `NetSession.hostLampFalloff`, `GameOptions.lampFalloff`,
   `CoopController.matchLf`, `RejoinRecord.lf` and the resume path's `lf` are gone on both sides
   (`src/net/protocol.ts:168,726`, `src/net/session.ts:240,340,369`, `src/net/coopUi.ts:183,203,802`,
   `src/core/rejoin.ts:65`). `parseMessage` drops an old peer's `lf`; `parse` drops an old stored record's `lf` and
   keeps the rest (tests: `net.test.ts` LR16a case, `rejoin.test.ts` LR16a case). Host and client both build the same
   photometric `LightField` with no per-match mode, so the client meter and host perception read one model;
   `lampSync.ts` / `torchMirror.ts` untouched. Repo-wide grep: no `lampFalloff` / `photoLamps` / `falloff=photo` /
   `shadowAccuracyOn` / `lampMathGlsl` / `flipCentre` / `E2E_FALLOFF` left in src, tests or scripts (only the guard
   asserts that they are gone, and the optional `setLampFalloff?.()` in `scripts/lamp-audit.mjs:34`).
2. **LightField vs lampMath parity (LR16b).** `LightField.lampInto` (`src/world/lightField.ts:285-300`) matches
   `photoTerm` / `photoFalloff` / `lampCone` term for term: same `PHOTO_NUM / (d^2 + PHOTO_NEAR2)` near term, same glTF
   window, `<= cut` early out, same `exp < 1.5` feather pick and smoothstep; GLSL (`lampMath.ts:172-175`) is generated
   from the same constants (its `clamp` matches the TS `t >= 1` branch). Torch term (`lampTerm` -> feathered
   `lampCone`) is shared by the meter, `torchDrawTerm` and `TORCH_DRAW_GLSL`'s `nsLampCone`. Perception thresholds
   (`LIGHT.shadow` 0.28, `lit` 0.6) and `perception.ts` unchanged; the feather only lowers light inside the band
   (fixed lamps: 87.3 -> 64.6 deg off down; torches: outer -> inner angle). `EnemyManager.bodyOccluder` is now always on
   (`src/ai/enemyManager.ts:835`): a torch behind a wall no longer lights a body - the intended fix.
3. **Settings.** `sanitizeSettings` whitelists the gameplay block, so a stored `lampFalloff` is dropped with no
   migration; the Gameplay tab and its reset lost the row cleanly (`settingsScreen.ts`), `lockedRow` still used
   (Subtitles), tsc with `noUnusedLocals` clean. e2e-menus asserts no row / key / match field (`e2e-menus.mjs:672-680`).
4. **G102 ghosts.** `DoorGhosts.update` takes `this.remotePlayers()` (`gameState.ts:2445`); `RemotePlayer.feet` is set
   from snapshots (`remotePlayer.ts:136,173`), the host's ref list is preallocated (`coopHost.ts:168`). Render only:
   the ghost writes nothing back; `closedDoorCrossing` is pure and allocation-free.
5. **LR16d lamp moves.** Only x / z change; call order, groups, cones and heights kept, so ids (by order) and the
   breaker / switch wiring (by group) hold. No test or `src/game` code names a moved lamp's position;
   `courseWire` destroyed-lamp ids are by index (unchanged). Wall switches at -49.85 / -38.15 (`campusS5.ts:258-264`)
   stay on the walls, wired by group.

## Runs
- `npx tsc --noEmit`: clean.
- vitest `--maxWorkers=2`, 30 files (net, netSim, rejoin, settings, settingsCover, lightField, lampFalloff,
  sectorLampSync, vision, doorGhosts, visionIsolation, nightVision, lights, shadowAccuracy, lampBake,
  lampGridLossless, coopTorches, coopFix, perception, enemyLightsOut, campusS1-S5, campusGlass, campusPosts,
  volLights, charShadowSet, lampAudit): 514 passed, **1 failed** - `campusS2.test.ts:515` "the boost point
  (-10.6, -8) is dark" (0.619 vs < 0.28). Not in the known 15 (LR16d ran on a pre-LR16a base). See polish 1.

## Polish / follow-ups (non-blocking)
1. **`campusS2.test.ts:515` red, a stale helper, not the game.** The test sums `lights.contribution()`
   (`src/world/lights.ts:85-89`), which still runs the linear `lampTerm` over the photometric reach (radius x 1.6).
   With the game's own photometric term at the same point (no visibility) the level is 0.188 (ambient 0.14 + the three
   L1 balcony lamps 30-32 at 0.004 / 0.015 / 0.029): dark, as the spec wants. Fix in LR16g with the other map-light
   tests: make `contribution()` use `photoTerm` for fixed lamps (it also feeds the editor's `lightPreview`,
   lr16a open item 4), or have the test use the field. Add it to the LR16g list (16 known reds, not 15).
2. **Protocol bump at the train.** The `start` shape changed and the branch keeps 38 (master is 41). An LR13-era build
   at 38 would read the missing `lf` as `linear` and run Classic beside a photometric host. The train must give this a
   fresh number above master's and update the tests that assert it.
3. Shadow-mapped torch (Babylon SpotLight, `lightRig.ts:541`) keeps a hard cut while the meter's torch term is
   feathered: a small picture vs meter gap inside the beam's edge band (lr16b open item 1). GPU check pending.
4. Docs still describe the removed path: `docs/systems/coop.md:24,34` (`start.lf`, `hostLampFalloff`), `TESTING.md:49`
   (Lamp falloff row). LR16h per lr16a.
5. `scripts/lamp-audit.mjs:34` `setLampFalloff?.('photometric')` is now a no-op call; drop it.
6. `tests/__snapshots__/visionIsolation.test.ts.snap` shows as modified in the worktree after a vitest run: line
   endings only (empty content diff); not committed.
