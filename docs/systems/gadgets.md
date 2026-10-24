# Gadgets and vision
Purpose: the goggle vision modes, the gadget set, the wheel, remote views and effects.
Design authority: docs/DECISIONS.md (G76, G99-G102), then docs/design-bible.md (Section 5.5).

## Decided direction
- Decided (G76): CT's gadget and attachment set, settled by the CT co-op research (Deferred in DECISIONS). The 7 gadgets
  below are the current build, not the final set. The tool specs waiting on Kestrel and the research (optic cable,
  lockpick, hacking, pistol disruptor, launcher rounds, interrogation, knife) are in `docs/systems/ct-toolkit.md`.
- Built (G100, G181): an instant cut, no flip; the wheel picks the mode and one button turns it on and off.
- Decided (G99): the modes are night, thermal and electro (built).
- Built (G101, G102; LR16-6): CT grain; thermal follows CT (CT colour ramp; people behind closed doors as a dim blue
  posed silhouette, never through walls or glass: `docs/systems/lighting.md`, Thermal and electro).
- Decided, not built yet (G45): thermal never sees through glass.
- The player's tri-rotor drone is deleted (G7, G115); the enemy `droneOp` recon drone stays (`docs/systems/ai.md`).

## Vision modes (locomotion step 14)
- The goggles button (pad View tap, KBM N) turns the wheel's selected mode on and off (`game/vision.ts` `VisionState`
  `toggle`; G181); a wheel pick with the goggles on switches to it (`select`). Every change is an instant cut (G100): the
  first frame drawn after it is the new mode. Any change of the mode on screen shows the HUD label (NV / THERMAL /
  ELECTRO) for 1.5 s; the goggle sound plays on on / off only.
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

## Security cameras and lasers (sector-fixes C, Michael 2026-10-22 items 3-5)
- Camera aim (`security/camera.ts`): each camera's map data may set `aim` (m, the floor point at the centre of its frame:
  it pitches down by `camPitch` = atan2(mount height, aim)) and `range` (m, its detection range, at most `CAMERA.rangeMax`
  14; `camRange`). `CameraUnit.pitch` / `range` feed both detection (`covers` -> `inFrame`) and the cue: one source of
  truth. No `aim` looks level. Sector Ops: cam-yard aim 5 / range 10, cam-floor 7 / 14, the others 6 / 12
  (`warehouseSectors.ts`). Marlow Yard cam-s3 (the bay 3 hallway): aim 6.5 (`S3_CAMERA_AIM`, pitch 20 deg: heads covered end to end, the frame under the 4.5 m ceiling).
- Range and falloff (camera-range, Michael 2026-10-23: "cameras need to have less range (they currently pick the player up
  well outside of the intended area)"; every map): `camRange` = the camera's own `range`, else `CAMERA.aimReach` 2 x its
  `aim` (the floor patch centred on its aim point), else `CAMERA.range` 12 (was 18), never over `CAMERA.rangeMax` 14.
  cam-s3 is 13 m (was 18: it reached into the entry lobby); the Sector Ops ranges are already 2 x aim. `cameraRate` fills
  by the guard terms with the falloff over that range, 1 - (d / range)^2 (`CAMERA.edgePow`), not the guard's 25 m: close
  to the old fill times inside the zone, 0 at its edge, so the picked-up reach (`cameraReach`) is ~0.84-0.97 of the range
  by stance. One `cameraSight` serves the host's think and the co-op client's cue: no wire change. Measured per camera:
  `docs/camera-range/MEASURE.md` (`tests/cameraReach.test.ts`).
- Cue (`security/cameraCue.ts`, `vfx/cameraCueView.ts`): the sample grid spans the pitched field, the rays reach
  `cueReach(range)`, and the shader's frame mask (`CUE_MASK_GLSL`, mirrored by `cueEdge`) takes the camera's pitch and
  range, so the grid is drawn only where the camera can detect. Normal vision is very subtle (`CUE.line` 0.055,
  `fill` 0.006, `lineW` 0.6 px hairlines); electro keeps the stronger white lattice.
- Lasers (`game/jammer.ts`, `game/ctDevices.ts`): a break raises the alarm on the camera's path (`deviceAlarm`: one stage
  per `ALARM_GAP`, the course stat / Sector Ops `cameraAlarm` hook, the banner, a radio line) and never deals damage (the
  damage path is gone). The beams are infrared: drawn (glowing, `pattern.w`) only while the laser is on and night vision
  is on screen; hidden in normal, thermal and electro. Render only: the sensor reads `on`, never the drawing
  (`tests/laserAlarm.test.ts`). While night vision is on the glow is re-set every step (leaving electro zeroes the
  `pattern.w` of every mesh named `laser` in gameState's `paintElectro`). In Sector Ops a break goes through the same
  `cameraAlarm` hook as a camera (it counts in `camAlarms`).
- Laser power panels (sector-fixes P, Michael item 6; `game/laserPanels.ts`, `MapLayout.laserPanels`): every laser is
  powered by exactly one panel (one panel may power several bands of a group; `checkPanels`, every map in
  `tests/laserPanels.test.ts`). The panel is the lasers' jam point (A1): a jam target of kind `'panel'` at its door face
  (`panelTarget`, `PANEL.face` out of the wall); jamming it (the slice J rules: 5 s at most, a 5 s cooldown, stand
  still, a clear line) cuts every band it powers for the jam and its `JAMMER.reboot` (`laserLive`); the beams
  themselves are no jam targets. A Sector Ops panel of a section that is not live is dark and no target, like its
  lasers. Placement: near its bands, out of plain sight and hard to reach (behind cover, high, round a corner, in a
  crawl void), jammable from a vantage a player reaches; the test traces each through the level's pieces (hidden from
  the floor round its band, a clear line from the vantage). Look (render only, no collision): a box housing, door
  plate, seam, hinge, label strip, conduit and a status LED (green powered, cyan blink jammed, amber rebooting, dark
  when dead or released); electro paints the housing (parts named `PANEL_PART`). Co-op: the panel ids ride the existing
  `jam` claim and `sec.dv` timelines (protocol 29); the client mirrors the panel and its lasers.
