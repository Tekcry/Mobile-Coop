# Gadgets
> Status: sonar is removed (locomotion step 02); the vision button cycles off / night / thermal / electro (step 14);
> the tri-rotor drone is parked (bible 6).
Purpose: the gadget set, the wheel, remote views and effects.
Design authority: docs/design-bible.md (Section 5.5)

## Vision modes (locomotion step 14, A26, A53)
- The goggles button (pad View, KBM N, touch vision) cycles off -> night -> thermal -> electro -> off
  (`game/vision.ts` `VisionState`, `VISION_CYCLE`). Each switch is one 0.2 s goggle flip with the image changing at
  the middle; a press during a flip queues one more flip to the newest mode. The HUD label (NV / THERMAL / ELECTRO)
  shows for 1.5 s after a switch.
- Render-only and local-only (D8): never sent, never read by gameplay. Perception, the light meter and alarms give
  the same result in every mode (`tests/visionIsolation.test.ts`, e2e-stealth-ai `vision-detect`).
- Thermal: every live rig (player, team-mates, remote avatars, guards) and every dog body (`DogModel.setHeat`,
  `LIVE_DOGS`) glows at `THERMAL.bodyEmit`; a dead guard's body or a dead dog cools linearly over
  `THERMAL.coolTime` 60 s in 1/16 steps. No seeing through walls (A26).
- Electro: powered devices glow: security cameras (`sec-cam-*`), laser sights, the sticky-cam lens and interactables
  whose `kind` is in `ELECTRO_KINDS` (switch, alarm, terminal, charge). Intel folders, cache crates, extract beacons,
  hide spots, doors, bodies, VIPs and revives stay dark. The list is built once per switch into electro. Lamp
  fixtures take the night-vision boost.
- Look and cost: `docs/systems/lighting.md` (vision modes) and `docs/systems/graphics-quality.md`.

## Gadgets (2.0 phase 5)
- `game/gadgets.ts` (pure): `GADGETS` (frag, sleeping gas, flashbang, EMP, noisemaker, sticky cam, tri-rotor drone,
  proximity mine: carry / max, `use` throw | stick | place | fly, fuse, radius, duration), `GADGET_IDS` (wheel order,
  clockwise from the top), `GadgetInventory` (counts, selected, cycle, take, add, restock), `wheelSlot`,
  `predictArc`, `DRONE` + `droneStep` (camera-relative flight, range from the launch point, altitude band, battery).
- `PlayerWeapons.gadgets` replaces the grenade count (`grenades` = frags; pouches show them); `useGadget()` plays
  the throw (released through `onThrow(id, from, vel)` at the clip's release) or places (`onPlace`); `throwStart`
  is the launch point / velocity the arc preview uses. `Grenades.throw(..., kind, color, fuse)`; non-frag kinds go
  off through `onDetonate`.
- `game/gadgetSystem.ts` (`GameState.gadgets`): runs first each fixed step with the real input and returns true while
  the wheel or a remote view has it (the rest of the step then gets `blankInp`); `look()` takes the frame's look
  (wheel cursor / remote view); `frameUpdate` after the player's camera (the remote view owns the camera: position,
  rotation, FOV; arc dots + landing ring; drone pose). Wheel: pad / keyboard hold `gadgetWheel` `WHEEL_HOLD`
  (stick or look picks, release selects), touch press toggles it and a slot tap selects (`hud.gadgets.onPick`);
  `loop.timeScale` `WHEEL_SLOW` unless co-op. Effects: gas clouds (`Enemy.gas` seconds -> `knockOut` at `GAS_KO`),
  flashbang (`Enemy.blind(s)`: brain off, hands-to-face emote, then `alert()`; facing it the full duration;
  `CinematicPost.whiteOut` for the operator facing it), EMP (`LightRegistry.disrupt` + `update` each step, `lightsOut`,
  dazes close guards, kills the operator's own drone), noisemaker (stick-on, `hear` pulses), sticky cam (stick-on,
  feed opens: lure ping (fire), gas once (Y), mark (RB / T), next (X), back (B / gadget)), drone (launch into the
  feed: fly where it looks, stun dart (fire, `knockOut`), shock burst (Y, non-lethal in `radius`, spends it), alerted
  guards in sight shoot it down, calm ones `notice`), mine (placed, arms after 1.5 s, an enemy within 1.6 m sets
  off a frag-strength blast). The feed look is `CinematicPost.setFeed`; `ui/hud/gadgetWheel.ts` (wheel + feed
  overlay text per input mode); touch: the action button is "Gas" / "Shock" in a feed, Mark is shown there too.
