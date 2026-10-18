# Deleted: tri-rotor drone, custom difficulty sliders, carried medkits - log (integrate/consolidate, 2026-10-18)

Batch 3c (iii). Michael's decisions: G7 / G115 (the tri-rotor drone and the custom difficulty sliders go), G106 (CT's fixed
difficulty levels), G20 / G98 (health comes back only at stationary wall medkits; no carried kits, no kit count, the X hold
freed). Nothing committed. Only one doc besides this log was edited: the binding table row `Medkit` in
`docs/systems/input-and-loop.md` (`tests/input.test.ts` parses that table; the emotes deletion did the same).

Save: `SAVE_VERSION` stays 9 (the existing v8 -> v9 migration is extended). Wire: `PROTOCOL_VERSION` stays 13.

## Files per deletion (for separate commits)

### A. Tri-rotor drone
- `src/game/gadgets.ts`, `src/game/gadgetSystem.ts`, `src/weapons/playerWeapons.ts`, `src/audio/gameAudio.ts`, `src/audio/sfx.ts`,
  `src/input/inputState.ts`, `src/input/keyboardMouseSource.ts`, `src/ui/icons.ts`, `src/ui/hud/gadgetWheel.ts`,
  `src/ui/screens/loadoutScreen.ts`, `src/ui/screens/controlsScreen.ts`, `src/vfx/cinematicPost.ts`, `src/voxel/voxelGroup.ts`,
  `src/game/course/courseWire.ts`, `src/save/schema.ts`, `src/save/migrations.ts`
- `tests/gadgets.test.ts`, `tests/save.test.ts`, `scripts/e2e-gadgets.mjs`

### B. Custom difficulty sliders
- `src/core/settings.ts`, `src/main.ts`, `src/ui/difficultyRows.ts`, `src/ui/screens/playScreen.ts`, `src/net/session.ts`,
  `src/net/coopUi.ts`
- `tests/difficulty.test.ts` (rewritten), `tests/settingsCover.test.ts`, `scripts/e2e-progression.mjs`

### C. Carried medkits
- Deleted: `src/game/medkitController.ts`
- `src/game/medkit.ts` (rewritten: stations only), `src/game/committedMoves.ts`, `src/game/localMoveState.ts`, `src/game/pickups.ts`,
  `src/game/health.ts`, `src/anim/animGraph.ts`, `src/player/moveState.ts`, `src/player/characterRig.ts`, `src/player/player.ts`,
  `src/input/actions.ts`, `src/input/conflicts.ts`, `src/input/gamepadSource.ts`, `src/input/padBinds.ts`, `src/ui/hud/hud.ts`,
  `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/remoteAvatar.ts`, `src/net/remotePlayer.ts`, `src/net/validate.ts`,
  `src/net/netSim.ts`, `src/world/mapDef.ts`, `src/world/maps/{dustDepot,embassy,mansion,port,provingGrounds,refinery,warehouse}.ts`
- `docs/systems/input-and-loop.md` (binding table row only)
- `tests/medkit.test.ts` (rewritten), `tests/input.test.ts`, `scripts/e2e-netmove.mjs`, `scripts/anim-audit.mjs`

### Shared (touched by more than one deletion)
- `src/game/gameState.ts` (A: remote-view comment, `gadgetKos` drops drone darts / shocks; B: `customDifficulty` option,
  `resolveDifficulty(d)`; C: the medkit controller, crates, station heal, HUD fields)
- `src/game/gameEvents.ts` (A: gadget phases `dart` / `destroyed`; C: `pickup` kind)
- `src/input/keyBindings.ts` (A: digits 1-7; C: the `medkit` bind)
- `src/styles.css` (A: comment; C: heal fill and kit count)
- `src/ai/archetypes.ts` (B: custom difficulty; C: `DifficultyDef.medkits`)
- `src/net/protocol.ts` (B: `dc` / `WireCustom`; C: `mk`, the medkit pickup kind, the medkit cmove)
- `tests/net.test.ts` (B: custom on the wire; C: medkit cmove), `tests/settings.test.ts` (B and C: old record with
  `customDifficulty` and a `medkit` key bind)
- `scripts/e2e-coop.mjs`, `scripts/e2e-mouse.mjs`, `scripts/e2e-pad.mjs` (B and C blocks)

## A. Tri-rotor drone (G7, G115)
- `GadgetId` / `GADGET_IDS` / `GADGETS`: `drone` removed (7 gadgets; the wheel has 7 slots, keyboard 1-7). `GadgetDef.use`
  loses `fly`. `DRONE`, `DroneState`, `droneStep` removed.
- `GadgetSystem`: `drone`, the `Drone` model (body, eye, three arms, rotors, voxelised), `launchDrone`, `destroyDrone`,
  `droneSeen` (guards noticing / shooting it), the drone remote view (flight, stun dart, shock burst, battery), its feed
  text (`DRONE <battery> RT dart Y shock B back`), the EMP knocking out the own drone, `stats.darts` / `stats.shocked`,
  `remote: 'drone'`. `enterRemote` now takes `'cam'` only. The remote-view framework stays (sticky cams use it).
- Audio: the gadget phases `dart` and `destroyed` (`GameEvents`), `sfx.gadget('dart')`.
- UI: the `drone` icon, the loadout description, keyboard 8 (`keyBindings` reserves Digit1-7 now; Controls screen "1-7").
- No network fields existed for the player drone (only gas / flash / EMP / noise cross the net). No unlock id existed.
- Save (v8 -> v9 extended): a loadout preset whose gadget is `drone` loses the field; `sanitizeSave` now accepts only a
  `GADGET_IDS` gadget in a preset (else the preset's default). The literal v8 test has a `drone` preset.
- Kept on purpose: enemy `droneOp` guards and `src/ai/reconDrone.ts`. They fly their own recon drone (a separate class:
  orbit the operator, spot players, alert the squad, shot down, dropped by EMP); they never used the player drone. AI not
  in scope. `e2e-enemies` "drone operator" stays.

## B. Custom difficulty sliders (G7, G106, G115; replaces loco D7's custom difficulty)
- `Difficulty` is now `DifficultyPreset` (rookie, normal, realistic, perfectionist; numbers unchanged). Removed:
  `'custom'`, `CustomDifficulty`, `CUSTOM_MIN / MAX / STEP`, `clampCustom`, `presetSliders`, `sanitizeCustom`,
  `basePreset`. `resolveDifficulty(d)` returns the preset. `parseDifficulty('custom')` reads Normal.
- Settings (`kv/settings`): `gameplay.customDifficulty` removed. Old records load: the sanitizer builds the gameplay
  object field by field, so the stored field is dropped (unit test with a literal old record).
- UI: `difficultyRows` is one row (the level); the three sliders (Guard perception, Guard aim, Alarm tolerance), the
  "Custom" entry and the "Custom base" row are gone from the Play screen and the co-op host lobby; `customSummary` gone.
- `GameOptions.customDifficulty`, `main.ts` autostart custom, `playScreen.customFor`.
- Wire (13 kept): `lobby` / `start` lose `dc`; `WireCustom`, `wireCustom` removed; `NetSession.custom`, `setCustom`,
  `StartInfo.custom` removed. An old `custom` difficulty parses as Normal.
- `scripts/e2e-progression.mjs` (legacy): the Play screen loop presses DOWN until Deploy has focus (cap 12) and asserts it.

## C. Carried medkits (G20, G98)
- Survey: wall medkit stations existed (`MapDef.medkitWalls`, interactable kind `medkitWall`, placed only on Proving
  Grounds in free roam; the bunker maps' `medkit` device mount points are geometry only, not wired). They gave a carried
  kit; now they heal directly: use (hold 0.6 s) heals 40 (`MEDKIT.heal`, `stationHeal`), single use, shown spent; at full
  health or down it is left for later ("Health full"). In co-op the host heals the client's host-authoritative health
  (`CoopHost.healAtStation`, was `giveMedkit`); the client mirrors the station from the host as before.
- Removed: `MedkitController` (file), `MedkitUse`, `medkitCarry`, `medkitDenial`, `addKit`, `MedkitTarget`,
  `SELF_TARGET`, `MEDKIT.time / mateTime / carry / carryRookie / max / padHold / replyTimeout / hostStates /
  hostEndSlack`; `GameState.medkit`; `DifficultyDef.medkits`; the kit count and heal-to-come fill on the HUD
  (`HudFrame.kits / heal`, CSS `.bar-fill.heal`, `.vital-kits`).
- Input: action `medkit`, KBM bind `medkit` (H), pad X hold not aiming (now does nothing; X tap reload and X hold while
  aiming = next weapon unchanged; `MEDKIT_HOLD` renamed `X_HOLD`, 0.4 s). Old settings with a `medkit` key bind load
  (dropped; unit test).
- Animation: `AnimInputs.medkit`, `MEDKIT_HANDS`, the kit / injector hand pose; `MovePose.medkit`, rig / player /
  remote avatar `medkit` input.
- Pickups: medkit crates removed (`PickupKind` is `'ammo'`); the 11 crates on dustDepot, embassy, mansion, port, Proving,
  refinery and warehouse deleted (ammo crates stay).
- Committed moves: `CKINDS` is `['strike']`; deny reasons `none` / `full` removed; `CRequest.kits / hp / maxHp`.
- Wire (13 kept): MoveState mode `medkit` (it was the last mode index, so no other index moved); `PlayerState.mk`; the
  `cmove` / `cstart` / `cdeny` kind `medkit`; pickup event kind `medkit`.
- No co-op "heal a partner" existed (self only was wired).

## Healing after this deletion
The only way to heal is a wall medkit station. Stations exist only on Proving Grounds (one, free roam) and wherever a test
adds one by hand. The campaign and mission maps (warehouse, embassy, mansion, port, refinery, dustDepot, the bunker) have
no stations and, with the crates gone, no healing at all. Placing stations in every map (G98) is a later job; not built
here. Health does not regenerate (bible 6). Revive (co-op downed partner) is unchanged.

## Unit tests changed
- `tests/gadgets.test.ts`: drone describe removed; the wheel test uses 7 slots.
- `tests/save.test.ts`: the literal v8 save has a `drone` preset; asserts it is dropped and the default comes back.
- `tests/difficulty.test.ts`: rewritten for the fixed levels (numbers pinned, old `custom` reads Normal, reaction, rewards).
- `tests/settings.test.ts`: custom-slider tests replaced by a literal old record with `customDifficulty` and a `medkit` key.
- `tests/settingsCover.test.ts`: expected gameplay object without `customDifficulty`.
- `tests/net.test.ts`: custom-on-the-wire test now asserts levels only / old `custom` reads Normal, no `dc`; `cmove` medkit
  is refused.
- `tests/medkit.test.ts`: rewritten: `stationHeal`, and no medkit action / move state / committed move / deny reasons.
- `tests/input.test.ts`: the binding table has 20 verb rows (was 21).

## E2E suites changed
No suite file deleted; `scripts/run-e2e.mjs` lists and `e2e-times.json` unchanged.
- `e2e-gadgets`: the drone scenario removed.
- `e2e-mouse`: the H-key medkit block replaced by a solo wall station check on Proving (+40 to 90, spent, full health
  refused); the custom slider block replaced by a difficulty row click (Normal -> Realistic, no sliders) and a Rookie
  match resolving Rookie's numbers; the `KeyH` entry dropped from the default-key list.
- `e2e-pad`: the X-hold medkit block removed; the pad custom slider check replaced by d-pad right on the Difficulty row
  (Realistic, no sliders) and the match running Realistic.
- `e2e-coop`: the custom difficulty block replaced by the host's fixed level (Realistic) reaching the client lobby read-only
  and running on both; the medkit block replaced by a client using the host's wall station (host heals 50 -> 90,
  mirrored, spent on both pages).
- `e2e-netmove`: the client medkit pose comparison removed.
- `e2e-progression` (legacy): the Deploy focus loop (see B).
- Helper `scripts/anim-audit.mjs`: the medkit scenarios (local and remote) and `medkitMetrics` removed; the frame's old
  `kitPh` column stays (always -1) so the layout does not shift.

## Lost coverage
- Drone flight, dart knock-out, battery (feature gone).
- Medkit use timing (1.5 s, damage interrupt, cancel give-back), host-run client heal over time, `cdeny none`, the medkit
  pose parity between host and client and its anim audit (feature gone).
- Custom slider drags and the host's sliders on the wire (feature gone).
- No check of the pad X hold doing nothing when not aiming (new behaviour; untested).

## Kept on purpose
- Gadget system, wheel, sticky cams and the remote-view feed (`post.setFeed`), other gadgets.
- Enemy `droneOp` and `ReconDrone` (see A). `sfx.pickup('medkit')` (now the station heal sound, via the `pickup` event).
- Wall medkit stations (`medkitWall`), `MapDef.medkitWalls`, the bunker `medkit` device mount points (geometry).
- `DifficultyDef.reaction` (each level's fixed value; the "alarm tolerance" slider is gone, the level number stays).
