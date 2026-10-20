# Gadgets and vision
Purpose: the goggle vision modes, the gadget set, the wheel, remote views and effects.
Design authority: docs/DECISIONS.md (G76, G99-G102), then docs/design-bible.md (Section 5.5).

## Decided direction
- Decided (G76): CT's gadget and attachment set, settled by the CT co-op research (Deferred in DECISIONS). The 7 gadgets
  below are the current build, not the final set. The tool specs waiting on Kestrel and the research (optic cable,
  lockpick, hacking, pistol disruptor, launcher rounds, interrogation, knife) are in `docs/systems/ct-toolkit.md`.
- Decided, not built yet (G100): an instant cut between modes in CT's order (thermal, electro, night, off); no flip.
  Code: the cycle is off -> night -> thermal -> electro with a 0.2 s flip.
- Decided (G99): the modes are night, thermal and electro (built).
- Decided, not built yet (G101, G102): CT grain; thermal follows CT (CT colour ramp, people behind closed doors as a dim
  silhouette). Code: no seeing through walls, grain on all three modes (`vfx/visionLook.ts`).
- Decided, not built yet (G45): thermal never sees through glass.
- The player's tri-rotor drone is deleted (G7, G115); the enemy `droneOp` recon drone stays (`docs/systems/ai.md`).

## Vision modes (locomotion step 14)
- The goggles button (pad View tap, KBM N) cycles off -> night -> thermal -> electro -> off (`game/vision.ts`
  `VisionState`, `VISION_CYCLE`). Each switch is one `VISION.flip` 0.2 s goggle flip with the image changing at the middle;
  a press during a flip queues one more flip to the newest mode. The HUD label (NV / THERMAL / ELECTRO) shows for 1.5 s.
- Render-only and local-only (D8): never sent, never read by gameplay. Perception, the light meter and alarms give the same
  result in every mode (`tests/visionIsolation.test.ts`, e2e-stealth-ai `vision-detect`).
- Thermal: every live rig (player, team-mates, remote avatars, guards) and every dog body (`DogModel.setHeat`) glows at
  `THERMAL.bodyEmit`; a dead body cools linearly over `THERMAL.coolTime` 60 s in 1/16 steps.
- Electro: powered devices glow: security cameras (`sec-cam-*`), laser sights, the sticky-cam lens and interactables whose
  `kind` is in `ELECTRO_KINDS` (switch, alarm, terminal, charge). Lamp fixtures take the night-vision boost. The device
  list for electro is an open question (MOVE-15 in DECISIONS).
- Look and cost: `docs/systems/lighting.md` (vision modes) and `docs/systems/graphics-quality.md`.

## Gadgets (2.0 phase 5)
- `game/gadgets.ts` (pure): `GADGETS` (frag, sleeping gas, flashbang, EMP, noisemaker, sticky cam, proximity mine: carry /
  max, `use` throw | stick | place, fuse, radius, duration), `GADGET_IDS` (wheel order, clockwise from the top; 7 slots,
  keys 1-7), `GadgetInventory` (counts, selected, cycle, take, add, restock), `wheelSlot`, `predictArc`.
- `PlayerWeapons.gadgets` holds the counts (`grenades` = frags; pouches show them); `useGadget()` plays the throw (released
  through `onThrow(id, from, vel)` at the clip's release) or places (`onPlace`); `throwStart` is the launch point / velocity
  for the arc preview. `Grenades.throw(..., kind, color, fuse)`; non-frag kinds go off through `onDetonate`. Gadgets work
  holstered (G21).
- `game/gadgetSystem.ts` (`GameState.gadgets`): runs first each fixed step with the real input and returns true while the
  wheel or a remote view has it (the rest of the step then gets `blankInp`); `look()` takes the frame's look;
  `frameUpdate` after the player's camera (the remote view owns the camera; arc dots and landing ring).
- Wheel: hold `gadgetWheel` past `WHEEL_HOLD` (pad D-pad left, KBM Tab); the stick or look picks, release selects; with the vision slot lit, A (pad) / E (keys) is a carousel (night -> thermal -> electro -> night, `VISION_WHEEL`, `SelectionWheel.cycle`), the wheel opens on the current mode, no cursor-length pick;
  `loop.timeScale` `WHEEL_SLOW` 0.3 unless co-op. Overlay: `ui/hud/gadgetWheel.ts`.
- Effects: gas clouds (`Enemy.gas` seconds -> `knockOut` at `GAS_KO`); flashbang (`Enemy.blind(s)`: brain off, hands to
  face, then `alert()`; facing it the full duration; `CinematicPost.whiteOut` for the operator facing it); EMP
  (`LightRegistry.disrupt` + `update` each step, `lightsOut`, dazes close guards, drops enemy recon drones); noisemaker
  (stick-on, `hear` pulses); proximity mine (placed, arms after 1.5 s, an enemy within 1.6 m sets off a frag-strength
  blast).
- Sticky cam: stick-on; its feed is a remote view (`enterRemote('cam')`, `CinematicPost.setFeed`): fire = lure ping, Y =
  release its sleeping gas once, X = next cam, B / crouch / gadget = back.
- Gadget counts and the loadout: the loadout presets are named Silent / Flash / Loud in code (`progression/suit.ts`);
  decided, not built yet (G105): Stealth / Assault / Recommended everywhere.
