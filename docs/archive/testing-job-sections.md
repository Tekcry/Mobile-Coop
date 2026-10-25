# Per-job manual checks (archived from TESTING.md, 2026-10-25)
Owner: Test Runner. Status: history.

Moved out unchanged by the Test Runner conformance fix T22 (G92: one short current list). Items may describe tools or
builds that have since changed. The current checklist is [TESTING.md](../../TESTING.md).

### Every tuner slider bakes (anim-bake-targets)
- [ ] Open the tuner: the info line says the baked values are built in (none of the 2026-10-22 values left as changes).
- [ ] Walk, jog and run: the feet land close to one line, the arms swing more at jog and run, the knees lift more at
  run; at low ready the elbows sit out and the rifle tuck is lighter, the pistol elbows untucked.
- [ ] Co-op: the partner shows the same track, swing and elbows. Guards look as before.

### Every slider bakes, also those with no code value (anim-bake-all)
- [ ] Tune one slider in each of Camera (FOV on explore, zoom on rifle aim), Gun (rifle aim gun up), Speed (aimed glide
  forward), Stepping (walk stride middle), Weight (walk chest damping), Body (walk step length, then jog at another
  value) and a co-op or traversal move (vault body fwd). Export, run `node scripts/anim-tune-bake.mjs <export> --dry-run`:
  every row "baked" or "baked (base table)", 0 manual; the walk and jog step lengths are two rows
  (`sections.body.walk.strideMul`, `sections.body.jog.strideMul`).
- [ ] After the real run and a reload (the tuner resets those sliders), each state looks and moves as it did tuned: the
  wider / narrower FOV while exploring, the rifle aim's zoom and gun height, the faster glide (gameplay), the step length
  at walk and jog apart. Hold the bypass: the baked values stay (they are the code defaults now).
- [ ] Co-op: the partner and the guards look as before (none of these act on other rigs, Stepping excepted: every foot
  planner reads it, as in the tuner).

### Wren's hands and joints (anim-skeleton S1+S2)
- [ ] Draw the rifle, then the pistol, close to the camera (third person, zoomed in): her fingers wrap the grip and
  the foregrip, with no fingers sticking straight out; the knuckles bend round, not in sharp folds.
- [ ] In the tuner, Hands & feet: move one finger's curl, then its spread: only that finger moves.
- [ ] Co-op: the partner's hands also close on their gun.
- [ ] Nothing else changed: walk, run, crouch, aim, a ladder; shoulders, arms and legs look as before.
- [ ] (S3+S4) Anim Studio: play skeleton_test: shrug, right shoulder forward, fingers curl one by one then spread, a
  left kick with the right foot planted.
- [ ] (S3+S4) Keys tab on jog: on a contact key raise the knee: the leg bends but the planted foot does not slide (foot
  slide readout under 0.5 cm); on a swing key the leg moves as keyed. A collarbone or finger field changes that key.
- [ ] (S3+S4) Joints tab: the collarbone row shrugs and pushes the shoulder forward; reset returns it exactly.

### Playtest 2 changes (controller, CT prototype; /ct/)
- [ ] (Replaced by anim-rework S1: the stick sets the speed, no d-pad speed.) Aiming looks noticeably slower than
  before.
- [ ] Back to a wall, shuffle to each end: the body leans only to the open side (swing the camera both ways: it never
  flips) and the camera slides past the edge as you look or push toward it. Holstered, the camera is always over the
  right shoulder; swap to the left while aiming, holster: it returns to the right and the next draw is on the right.
- [ ] Swap shoulders while aiming: no gun flick. Press A from a short distance (under 0.5 m): you settle onto the wall
  without sliding; from further away it does nothing.
- [ ] Footsteps from a creep to a sneak (crouched to the crouch walk) are quiet and the noise meter is silent; a run is
  louder on both.
- [ ] ADS frames the same relative to the body standing and crouched, rifle and pistol (crouched it is lower, at crouch
  height); aim up and down: the chest leans, the wrists stay straight. Legs stay under the body walking, running and
  turning on the spot; crouch idle kneels with a gun out (one knee down, back upright), crouch walking blends out of it
  cleanly.
- [ ] (anim-rework S4) Holstered, crouched: stand still (a deep squat, each hand on top of its knee, palm down, slow
  breaths, a slow look round); push the stick slowly to full: sneak, crouch walk, crouch run with no pop, knees and feet
  under the hips (from the front), the run leaning forward and low. Crouch and stand in every state (still, walking,
  running, low ready, aiming, strafing aimed): no snap. Sneak, stop, stand up: the feet step back under the hips.
- [ ] (anim-rework S2) Holstered, standing: push the stick slowly from a creep to full: the walk turns into a jog and a
  run with no pop, the knees and feet stay under the hips (from the front the legs look near vertical), the arms hang
  along the sides and swing a little more as you speed up, no lean until the run. Stand still: she breathes, shifts her
  weight and looks round slowly. Start, stop, turn round from a standstill and change direction 90 / 180 deg at a walk
  and a run: no foot slides, no hop.
- [ ] Draw and holster the rifle and pistol, standing and crouched: the hand stays on the gun the whole way; the rifle
  comes from the back straight to the shoulder (no low-ready dip).
- [ ] Hang from a ledge and shimmy: slow, one hand at a time, wide reaches. Drainpipe climb: knees bend up and forward.
  Ledge climb-up (1.3 s): pull up, the hands stay on the lip until a knee is on the top, then a smooth stand (no hop).
  A team boost climb-up still works.
- [ ] Marlow Yard A3 (co-op, marlow-jammer): the corridor camera. Aim the pistol at the camera, hold RB / F and
  stand still: the red grid goes, the camera stops turning, its LED flashes, a quiet buzz plays (both hear it); the HUD
  counts 5 s, then COOLDOWN 5 s; released, the camera stays blind 1.5 s and cannot be jammed meanwhile. One jams while
  the other runs; from the east lobby, the one through jams for the other; both there ends the step. The camera's
  grid never shows through a wall. Jam a lamp: it flickers off, stays off 4 s after you let go, flickers on.
  Walk the corridor without a jam: the camera catches you and you are put back at the west lobby (radio line).
- [ ] Camera range (camera-range): Marlow Yard A3 (camera range 14 m), stand in the west lobby in line with the corridor (stand, crouch,
  run on the spot): the camera never picks you up there; step a metre into the corridor and it does. Sector Ops: walk
  toward each camera from just past the far end of its red grid: nothing until you are inside the grid's far edge.
- [ ] Cameras and lasers (sector-fixes C): in Sector Ops and Marlow Yard A3 / A4 / A7 / A8 each camera points down at the floor
  in front of it; its red grid is faint (thin lines) and covers only that patch, never far walls or the ceiling, and it
  catches you only there. Lasers are invisible until night vision (not in thermal or electro); walking through one
  raises the alarm stage (banner, radio) and costs no health.
- [ ] Laser power panels (sector-fixes P): every laser has a small wall panel nearby, hidden (Sector Ops: in the office
  void off the workshop catwalk, behind the plant deck's AHU, on R2N's rack top by the VNA sensor, under the mezzanine
  behind the parts store's back shelf; Marlow Yard A5: high on the switchroom's south face, seen through the gateway; A8's curtain has its own).
  Electro shows it; its LED is green. Jam it from its vantage (pistol, RB / F, stand still): the LED blinks cyan and its
  lasers are off (walk through: no alarm), amber for the 1.5 s reboot, then the lasers are back. Aiming at the beams
  jams nothing. In co-op the partner's page shows the same.
- [ ] Scanners (co-op course; A7 terminals, A8 time locks): a lone hack with the partner never started costs nothing; a
  late or abandoned hack costs 10 HP; both hacks within 1.5 s open the cage (A7) or the vault (A8).
- [ ] Footage pass (G1-G4): walk, jog, run and turn on the spot: feet stay under the hips and turn with the body, the
  walk is upright, the run quick with a lean; stop from a run: a small split, upright; crouch and stop: she kneels at
  once; near an unaware guard, crouch-walk slowly: the tense high-kneed sneak with a hand over the knife.
- [ ] Camera: the yard frames the whole body from further back, rooms and airlocks closer; aim: head on the left, the
  reticle clear; FOV 86 (a saved 75 moves once).
- [ ] Rifle draw: muzzle up at the right shoulder, then down onto the line (no chest hold); holster near instant; aim,
  release and aim again quickly: no sweep through the body. Pistol: lower, compact two-handed hold.
- [ ] Walls (G6): crouch on a wall and slide: side-on, hand on the knee; reverse: she turns through; stop: she kneels.
  Open a door: a step to the latch, hand on the leaf; stealth open is slower. Grab a guard (G7): pull-in, forearm on
  the throat, walk him (slow), knock out (lowered), pick up a body (2 s lift), carry (slow), drop.
- [ ] Action menu (G5): near a door, hold A: BACK TO GAME on top, move the highlight, release on a row (it runs) or
  on BACK TO GAME (nothing); a quick tap runs row 1; behind a guard: GRAB CHARACTER only; holding him: no menu (only the
  Marlow Yard A1's checker, A4's and A8's officers have information: hold A, INTERROGATE, two lines, then no menu again), RT kills, LT knocks out, X aims (human shield), B / Y never let him go.
- [ ] Optic cable (ct-toolkit 3.2): at a closed door hold A, OPTIC CABLE: she kneels, after about 1.2 s the view is
  under the door on the far side at floor height (feed overlay); the stick turns it (+-75 deg, -10..+60 deg), D-pad
  left toggles vision, B or the stick pulled back leaves; a guard on your side still sees you kneeling.
- [ ] (optic-coop M1) At an optic gap (a hatch, ceiling panel, grille or shaft top; none placed on a map yet, so a dev
  level with `opticGap`): hold A: OPEN TRAP (only where a panel covers the gap) and OPTIC CABLE, the door menu's list;
  OPEN TRAP opens the panel quietly; OPTIC CABLE feeds the cable ("Too far" / "No gap" as at a door). Keyboard: E.
- [ ] Drainpipe: one reach per hand about a second, feet together; shimmy slow with the legs swinging; ledge climb-up
  ends crouched (hold the stick to stand); ladder slower up, faster down; rappel 0.6 m/s.

### Hits come from game state (rig-pose fix)
- [ ] Co-op: let a guard shoot each player in turn, standing, crouched and on a wall; both take head / body / leg hits the same way.
- [ ] Co-op: headshot a guard as the client, also one peeking from cover; it counts as a headshot.
- [ ] Shoot from a wall edge and while hanging upside down: rounds leave from the gun side and hit where aimed.
- [ ] Kill a guard at a ledge lip: the body lies on the floor below; pick it up on both machines.

### Tuner on a phone (marlow-bays item 26; the tuner and Anim Studio only, the game stays desktop only)
- [ ] On a phone, open the studio (`?autostart=studio`, or the main menu's studio row). Landscape: the panel is a
  drawer on the right, she stands in the left part; no F3 readout. Portrait: a bottom sheet, she stands above it.
- [ ] Tap "Hide panel" (the handle): only the header stays and she gets the whole screen; "Show panel" brings it back.
- [ ] Landscape: the drawer is about 38% of the width; portrait: the sheet about 45% of the height. Text small but
  readable (13 px).
- [ ] Press a button on a paired controller: the panel gets smaller again (26 px rows, 11 px text, one-line sliders, a
  narrower drawer / lower sheet) with no reload; touch the screen: back to the touch size.
- [ ] Tabs, buttons, chips, the body map's joints, the playback bar and the sliders are easy to hit with a thumb; the
  panel scrolls with a finger; a slider drags without scrolling the panel.
- [ ] One finger dragged on the scene turns the view round her; a pinch zooms; two fingers dragged move the view's
  centre; a tap on her head shows only the head's sliders. A drag on the panel never moves the camera.
- [ ] Settings > "Debug readout (F3)" shows and hides the readout; reopening the studio keeps the choice.
- [ ] A controller paired to the phone: the pad works as on desktop (tabs, rows, edit, View hands the pad over).
- [ ] On the desktop the panel looks as before (docked right, no handle).

### Tuner v3 and game touch (marlow-bays item 29)
- [ ] The tuner looks the same with the pad, the mouse and touch (only the hints change); on a phone (844 x 390 and
  390 x 844) scroll the Body tab to the end: the tabs and the playback bar stay at the top.
- [ ] Anim Studio, jog, Keyed ticked: Body > Lean and a Joints slider move her; Step length is greyed with
  "procedural only: the keyed clip is playing". Untick Keyed: Arm swing greys ("keyed clip only").
- [ ] No green skeleton over her at start; More > View aids turns it on.
- [ ] Weapon tab with a rifle: "Support hand ..." moves only the left hand; "Gun ... in the gun hand" moves the gun and
  the left hand stays on it; values read in cm and degrees.
- [ ] View tab: Side, then Side again: her right, then her left. "Around her" at 90 / 180: her right / her front; the
  right stick moves the slider.
- [ ] Keys tab: scroll down, focus a slider, step the key twice: the panel stays where it was.
- [ ] Touch screen, main menu: tap Settings, tap Back; in a match drag on the view to look round (she does not move),
  the pause button appears top centre, tap it, tap Resume; press a key: the button hides.

### Guard tuning (marlow-bays item 24)
- [ ] Anim Studio, Body tab: Who = Guard. A guard stands where Wren stood (she is hidden), idle; the what-row shows
  Who, then the guard state; the rows read "Right elbow bend" and the like.
- [ ] Loop list: Guard: patrol walk, run, aim, crouched aim, wall cover: each plays on the spot; the guard state list
  follows (walk, run, aim, crouched, wall cover). Pause and Speed work; the highlight dot sits on the guard.
- [ ] Patrol walk, a Guard joints elbow slider: the guard's elbow turns. Who = Wren, walk: her elbow is as before.
- [ ] Stepping tab, Who = Guard: Foot lift on the walk lifts the guard's feet; Weight tab, Who = Guard, patrol walk:
  Hip drop per step dips the guard's hips at each step (the lean and spring sliders need real travel: a match).
- [ ] A Hands & feet tab with Who = Guard shows "Wren's sliders: guards have ..." over her rows.
- [ ] Export with guard rows, Import it back: the guard values return. A Warehouse match: guards patrol with the tune.

### Key tools and the exact preview (marlow-bays item 30)
- [ ] Anim Studio, Keys tab, jog key 2: open "Key tools", Wave, Channel "Chest turn", Amount 8, "Fill keys": the chest
  turns side to side over the run (the other half mirrored); Undo once takes all of it back.
- [ ] Select a Keys slider (Right forearm twist), set it on key 2, Apply to keys with keys 3 and 4 ticked: only those
  change. Smooth between key 1 and key 4: keys 2 and 3 ease between the two poses.
- [ ] Tick Compare: a light grey ghost of the previous key shows over her (paused, she flicks to that key and back
  once) and a line "Key 2 vs key 1: ..." names the largest differences; untick: both go.
- [ ] Pad only: reach Compare, the fold, the tool list, Amount (left / right), the ticks and the buttons; keyboard and
  touch the same.
- [ ] Edit a jog key, export and rebake (BAKE.md): the in-betweens look as they did in the preview (no shift).

### Holds and carries (anim-natural N4)
- [ ] Warehouse: grab a guard, walk: her hips and shoulders turn against each other with each step (not as one block).
  Carry a body (grab menu Carry): she leans away from the shoulder the body is on and each step dips a little; she
  walks in to the body standing, crouches, and her feet step (no slide) before she stands with it. F3 tuner, "Holds
  and carries": each slider moves only its walk; reset puts it back.

### Campus detail art (Sector Ops, campusOps)
- [ ] Sector Ops, campus, `?gfx=min` first: the plain boxes show (no props) and every route below still plays. Then Epic.
- [ ] S1 (gatehouse, car park, grounds): walk the gate route, the verge and the car park. No prop stops you, blocks a
  hiding spot, a ledge, a vent or a door. The gatehouse desk, monitors and key cabinet stand on the inner walls. Cars,
  planters and trees look finished, nothing floats.
- [ ] S2 (HQ offices round the atrium): the atrium shows its hero set (the model on the reception desk, green wall,
  seating) and the offices their desks, boards and ceiling tiles. Both stair and lift routes stay open; no desk in a
  doorway or on a patrol line.
- [ ] S3 (lab block): lab hall, clean room and stores show their benches, hoods and shelving. Cover stays where it was;
  walk the gown room and the airlock doors free.
- [ ] S4 (data hall, plant, dock): racks, pods, UPS and battery racks, ducts and the dock fit their boxes. Climb every
  ledge and vent you used before; no rack edge blocks the lip. Raised-floor and pallets do not sink or float.
- [ ] S5 (Old House, strongroom): oak panel, bookcases, the fireplace and the strongroom vault set read as 1960s. The
  vault door, deposit wall and time-lock stay usable; the objective prompts still show.
- [ ] In each section: every lamp you see is a lamp the light meter reacts to. Stand in a shadow beside a prop: the
  meter stays dark; stand in light: it lights. Props never change what a guard or camera sees.
- [ ] No prop floats, sinks into a wall or clips another prop; no flicker or z-fighting up close.
- [ ] Frame rate holds steady in the busiest views (S2 atrium, S1 car park, S4 data hall) with 20 and with 24 guards
  (laptop GPU; the draw and triangle numbers are in `docs/systems/world-and-characters.md`, "Campus art kit").

### Campus art (artnext)
- [ ] Load: Sector Ops campus loads with no console error on `?gfx=min`, then Epic; the props show, and the load is no
  slower than the #226 build.
- [ ] Views s1-a to s5-g (`scripts/campus-art-shots.mjs`, laptop GPU): each shot reads as finished dressing; nothing
  floats, sinks or blocks a door, route, hiding spot or light.
- [ ] No greybox showing: no bare grey box where a skin or hero belongs (S2 green wall, S5 kitchen run).
- [ ] Draws: each section within 40 draws, 150 k triangles and 2500 placements (`world-and-characters.md`, "Campus art
  kit"); S1 35, S2 33 of 40, and the GPU draw count matches the `artCounts` in the dump.
- [ ] Gate: `tests/campusArtGameplay.test.ts` passes on the build (routes, cover, nav, lips, ledges, split gaps).
