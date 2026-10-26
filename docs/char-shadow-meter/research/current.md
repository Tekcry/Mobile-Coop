# Character shadows and the meter: today's code (master 2148ec969, 2026-10-25)
Owner: Sector Ops Build (job char-shadow-meter, FOLDED-PLAN J16). Status: research, read-only facts.

## 1. The light meter (gameplay)
- `GameState.updateLight` (src/game/gameState.ts:1659-1701) runs at `LIGHT.playerHz` 10 Hz (src/world/lights.ts:93):
  ticks flicker and sway on the shared sim clock (:1663-1666), then `f.bodyLevel(...)` for the local player (:1690,
  written to `localRef.light`, :1691) and for every remote (:1692-1700, from `RemotePlayer` feet / head / height /
  crouched / peek). Nothing is sent: each machine samples every player itself (src/net/remotePlayer.ts:77).
- Head sample: the rig height through `lightSampleHeight` (src/game/bodyHeight.ts:20; gameState.ts:1677), on a wall the
  sim body's head (`posedHeadSample`, :1683-1689).
- Static occluder for flashlights: `lightOccluder` (gameState.ts:1820-1829), a Havok ray to STATIC that stops 0.25 m
  short of the body (no character ever blocks).
- HUD: `this.hud.setLight(this.lightLevel, this.lightLevel < LIGHT.shadow)` (gameState.ts:2784); `LIGHT.shadow` 0.28,
  `lit` 0.6 (lights.ts:86-93, bible L6 fixed).

## 2. The light field (pure, src/world/lightField.ts)
- `totalAt` (:229) = `levelAt` + `dynamicAt`, clamped; `bodyLevel` (:240-247) = max(chest at 0.6 h, head at 0.95 h
  with the peek offset).
- `levelInto` (:261-301): ambient grid (trilinear) + bounce grid + `moonLight` x moon visibility (:278-281) + the lamps
  listed for the point's 2 m column (`lampGrid`, up to `LAMP_GRID_SLOTS` 24, src/voxel/lampBake.ts:856, :865; nearest
  first), each through `lampInto`; early out at 1.
- `lampInto` (:303-352): live state (on, destroyed, intensity, flicker, sway offset), photometric falloff x feathered
  cone written inline (no boxed returns, comment :185-189), baked visibility (`visInto`), the lamp's own door list.
- `dynamicInto` (:413-432): every non-baked light (flashlights) with the caller's `Occluder` callback and doors.
- No character term anywhere. `Occluder` is static only (src/world/lights.ts:142).
- Allocation test pattern: tests/lightField.test.ts:380 (`tests/helpers/allocPerCall.ts`).
- Moon: `LightBake.moonLight` (src/world/lightBake.ts:53), the moon grid and its direction `moon.dir`
  (lightBake.ts:89-90, :126).

## 3. Guard perception (reads the same samples)
- Perception of a player reads the owner's sample `p.light` (src/ai/enemy.ts:2447), else `fieldLight` at the aim point
  (enemy.ts:237-239, :2509). On the host `p.light` is `GameState.updateLight`'s value, so a character term in
  `bodyLevel` reaches the guards' fill rate for players with no `src/ai` change.
- Bodies: `field.totalAt(b.pos.x, b.pos.y + 0.2, b.pos.z, this.bodyOccluder)` once a second
  (src/ai/enemyManager.ts:3666-3675).
- Perception is host only; clients run puppets (gameState.ts:549, no `enemyMgr` on a client: :697-705).

## 4. The picture's character shadows (render only)
- Capsules, every preset that builds the baked lamps (all but `?gfx=min`): `GameState.rtCapsules`
  (gameState.ts:907-914) gives upright capsules, the local player first (height from the RIG head node, a render
  pose), then live guards from `enemyMgr` (none on a co-op client: the client's picture has no guard capsules), no
  partner, no bodies; `rtCapsule` radius 0.22, foot + 0.25 to head - 0.2 (gameState.ts:3644-3653); hooked at :618.
- `BakedLamps.frame` takes at most `MAX_CAPSULES` 16 (src/world/bakedLamps.ts:76, :504); `writeCapsules`
  (:692-724) lists per lamp the first `CAPS_PER_LAMP` 4 capsules within reach + 0.5 m, skipping characters a silhouette
  map holds.
- GLSL `lampCapsule` (bakedLamps.ts:1312-1332): own surface (within 1.6 r of the axis) never shadowed; soft edge
  `pen = r * 0.35 + behind * 0.12`; result `mix(0.15, 1.0, smoothstep(r - pen, r + pen, dist))`. Applied per lamp in
  the lamp loop (:1724-1732), product over the lamp's capsules.
- Silhouette maps (LR14): `LampSlotPicker` (src/world/charShadowSet.ts:197) picks the lamps nearest the local focus
  (player, camera); count per shadow tier `CHAR_SHADOW_PRESET` (charShadowSet.ts:46-54): Off 0, Low 1, Medium 1,
  High 2, Ultra 3, Epic 4; settings override `charShadowSpec` (:58). Inside a silhouette the lamp term is x 0.15
  (`CHAR_SHADOW.floor`, "the capsules' floor, so a preset change alters the shape, not the darkness",
  charShadowSet.ts:65+). Casters: players, guards, bodies, held weapons (src/world/charShadows.ts:1-10, "Rendering
  only" :8).
- Moon character shadows: the moon's cascades (`World.shadow`, src/world/world.ts:71; null while Shadows is Off), guards
  only within `GUARD_SUN_REACH` 40 m (src/world/sunCascadeCull.ts:5).
- Flashlight shadows: torch atlas (src/world/torchShadows.ts), character casters with the holder excluded (:131).

So: the picture already darkens EVERY lamp's term under a character on every preset (capsules), and draws the real
shape for the 1-4 nearest lamps (silhouettes) at the same 0.15 floor. Which lamps get silhouettes is preset
dependent (`LampSlotPicker` x `CHAR_SHADOW_PRESET`): gameplay may never read that pick.

## 5. Co-op
- Light state on / off / shot is host-authoritative (protocol 31, src/net/lampSync.ts); flicker and sway run on the
  shared clock. The meter value never crosses the wire.
- A client's guards are puppets: positions via `takedownVictims()` = the puppet list (src/net/coopClient.ts:239;
  gameState.ts:540), `pos`, `def.height`, `alive`.
- Net hook precedent for per-frame fills: `NetAttachment.shadows?(b)` (gameState.ts:218-219).

## 6. UI and docs that change wording
- Settings help: "Looks only: the light meter and the guards are the same either way."
  (src/ui/screens/settingsScreen.ts:340).
- docs/systems/lighting.md:225 "off / Low / Medium 0 lamps" (code: Low / Medium 1; :48 right); :244-249 the parity gap.
- Bible P1 test "any graphics preset ... agree" (docs/design-bible.md:85) vs L11 "the picture may show fewer lamps'
  shadows" (:288).

## 7. Tests and suites today
- Unit: tests/charShadowSet.test.ts, charShadows.test.ts, charShadowReach.test.ts, lightField.test.ts,
  perception.test.ts, coopPerception.test.ts, visionIsolation.test.ts (source-grep isolation pattern, :53).
- e2e: `e2e-darkness` (GPU list, src scripts/e2e-affected.mjs:19; 50% grey card read as screen luma at Epic,
  docs/systems/testing-tools.md:187-191; it already hides guard rigs, scripts/e2e-darkness.mjs:317),
  `e2e-lightbake` (same bake at min / low / epic), `e2e-stealth-ai` (meter and detection; it can pin the meter,
  scripts/e2e-stealth-ai.mjs:128), `e2e-coop` / `e2e-netmove` (co-op group). `lightSuites` picks the light suites
  for src/world light files (e2e-affected.mjs:118).
- No check for character shadows anywhere (Test Runner H1, Sector Ops V9).

## 8. Owners (Guard AI review 1d, docs/conformance-guard-ai/CONFORMANCE.md "1d")
- Sector Ops: lightField.ts, lights.ts Occluder, the meter sample gameState.ts:1660-1701, HUD :2784, the gameplay lamp
  set, lighting.md, tests/lightField.test.ts, the new contract src/world/charOccluders.ts.
- Guard AI: perception, guard / dog / body occluders (enemy.ts, enemyManager.ts:3666-3675, hitboxes.ts, guardHead.ts,
  bodyLie.ts), ai.md, perception tests.
- Player: operator volumes from the sim body (src/player/playerVolumes.ts:538 `playerBody`).
- Shared, Sector Ops first: charOccluders.ts, gameState.ts:1660-1701.
