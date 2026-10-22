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

## Held pistol jammer (CT prototype B3; marlow-jammer)
- `game/jammer.ts` (pure, `tests/jammer.test.ts`), run by `game/ctDevices.ts` (course and Sector Ops; host authority,
  client mirror over `sec`, `docs/systems/coop.md`). Aim the drawn pistol (LT / RMB) and hold Co-op (RB / F) on a
  camera, laser or lamp the aim has a clear static line to (`JAMMER.range` 20 m, cone 0.16 rad), standing still
  (`stillSpeed` 0.45 m/s).
- Per player (J1): one jam lasts at most `useMax` 5 s; it ends at 5 s, on a release, on a move or on aiming at another
  target, and each end starts the `cooldown` 5 s. The 20 s charge model is gone.
- Per device (`DevJam`, A3): jammed while anyone holds it, then it recovers and nobody can jam it meanwhile: a camera or
  a laser 1.5 s (`reboot`); a lamp 4 s off then a 0.5 s flicker on (`JAM_LIGHT`). A jammed / rebooting camera is blind
  (mode off: its grid fades, no meter), frozen (`CameraUnit.frozen`: its clock stops, the sweep resumes where it
  stopped), its LED flashing while jammed (`SecurityView`). A jammed lamp follows `lightLit` in the light registry.
- Cameras see by their own IR (Michael M3, `CAMERA.irLight` in `config/security.ts`): putting lamps out (jam, EMP, shot)
  hides a player from guards and the meter, never from a camera; only jamming the camera itself (or shooting it) does.
- Feedback: the HUD line under the reticle (`jamHudText`), the gun light (cyan pulse jamming, dim red cooling, amber on a
  rebooting target, green aimed, red idle) and the buzz (`audio/jamBuzz.ts`: a quiet synth voice at the nearest jammed
  device, positional, on both pages; A4).

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
- Wheel: hold `gadgetWheel` past `WHEEL_HOLD` (pad LB, KBM Tab), over the live game with no time slow (G181); the stick or look picks, release selects; with the vision slot lit, A (pad) / E (keys) is a carousel (night -> thermal -> electro -> night, `VISION_WHEEL`, `SelectionWheel.cycle`), the wheel opens on the current mode, no cursor-length pick.
  (sector-fixes W, Michael item 8) The vision slot (`WHEEL_HOME` 0) is the default: lit on open and whenever the cursor
  is in the dead zone (`wheelSegment`), so LB + A cycles the modes with no stick and no other pick is held. Under the
  pad the right stick's position is the cursor (`InputState.stick`, dead zone only, no curve or invert;
  `SelectionWheel.place` + `settle`), not its look rate; a stick back in the centre keeps its slot `WHEEL_LETGO_S`
  0.08 s (stick and LB let go together still pick it), and A / E with the stick centred is the vision slot at once.
  The mouse moves the cursor by deltas (`look`); back in the centre it is the vision slot. Overlay: `ui/hud/gadgetWheel.ts` (wheel-ui: SVG ring segments, the
  highlighted one lit and lifted, an inner bar on the current ones, icon + count per item, the vision slot shows the
  mode with an NV / TH / EM row, the item name in the centre disc); its size from `ui/hud/wheelLayout.ts` `fitWheel`
  (130 + 0.36 x height px, centred in the safe area, clear of `.hud-top` and the hint box, which moves under the ring
  on narrow screens), measured on open, resize and hint change.
- Effects: gas clouds (`Enemy.gas` seconds -> `knockOut` at `GAS_KO`); flashbang (`Enemy.blind(s)`: brain off, hands to
  face, then `alert()`; facing it the full duration; `CinematicPost.whiteOut` for the operator facing it); EMP
  (`LightRegistry.disrupt` + `update` each step, `lightsOut`, dazes close guards, drops enemy recon drones); noisemaker
  (stick-on, `hear` pulses); proximity mine (placed, arms after 1.5 s, an enemy within 1.6 m sets off a frag-strength
  blast).
- Sticky cam: stick-on; its feed is a remote view (`enterRemote('cam')`, `CinematicPost.setFeed`): fire = lure ping, Y =
  release its sleeping gas once, X = next cam, B / crouch / gadget = back.
- Gadget counts and the loadout: the loadout presets are named Silent / Flash / Loud in code (`progression/suit.ts`);
  decided, not built yet (G105): Stealth / Assault / Recommended everywhere.
