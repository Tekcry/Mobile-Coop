# Slice F brief (playtest-2 walk, 2026-10-19)

Source: `WALK-2026-10-19.md` (Michael's walk notes on /ct/ 624fca6b, verbatim, and the orchestrator's split). Michael:
"Still not an accurate recreation of CT movement. I will take more recordings for you to review." This slice takes only
the items that need no new footage. Prototype pass: playable and clearly closer to CT, no polishing; every number a
starting value (G10).

Hold until Michael's new footage (do NOT work on these): legs following the body rigidly (walk, turn, circle, the
occasional body bob); upper body rigid in ADS tilting at the hips, rifle on the shoulder without clipping, pistol aim;
shimmy lower-body swing; drainpipe arms slower, legs hugging the pipe; pistol draw naturalness.

## F1 Shoulder rule (replaces slice A's "last swap saved as the default shoulder")
Michael: "swapping to left shoulder then holstering leaves camera over left shoulder and takes out weapon on left again
- this is wrong. Always reset to right hand side aiming, and the camera only ever stays slightly over the right
shoulder when holstered."
- Holstered: the follow camera is always slightly over the right shoulder (no saved shoulder, no wall-side shoulder for
  the holstered follow camera).
- A left-shoulder swap lasts only while aiming. Holstering resets to the right; the next draw is on the right.
- Remove the saved default shoulder setting from slice A (or leave it unused with a migration-free default; no save
  shape change unless needed: if a settings field is dropped, follow the settings migration rules).
- Back to wall: decide from CT (`docs/ct-prototype/CT-CONTROLS.md`, `docs/ct-research/`) whether the wall side still
  sets the aiming shoulder while on the wall; keep it only while on the wall and aiming, never for the holstered camera.

## F2 Crouched ADS camera height
Michael: "Aiming camera doesn't follow body when crouching, it just stays at standing height."
- Crouched ADS frames from crouch height: the aim pivot follows the body down (B+C kept the standing pivot). The framing
  relative to the body stays the same standing and crouched (B+C's goal); only the height follows the body. The
  ceiling casts still clamp the camera.

## F3 Crouch idle kneels
Michael: "crouch idle should kneel down like CT instead of standing on both legs, character looks like a gorilla."
- Crouch idle (not moving): one knee down (CT's kneel), the other foot planted, upper body upright and compact, weapon
  close. Crouch walking keeps a crouch gait but blends out of the kneel cleanly when moving starts and back in after a
  short stop. Aiming from the kneel stays a kneel. References: the CT footage docs under `docs/research/ct-movement/`
  and `docs/ct-research/` (crouch / kneel entries), P1 posture shots.

## F4 Corner lean and camera slide
Michael: "body and camera still wrong when leaning at an edge, if I'm looking right around a corner, the camera needs to
slide sideways to allow better view, and the body obviously is only going to lean right only, it still leans/turns the
opposite way depending on camera view."
- At a wall edge the body leans only toward the open side of that edge; the lean side comes from the edge, never from
  the camera yaw. It must not flip as the camera swings.
- Looking round the corner slides the camera sideways toward the open side (enough to see past the edge), driven by how
  far the player looks / pushes toward the edge. Slice A's peek-side-in-camera-frame logic is the suspect for the flip.

## F5 Ledge climb-up: knees, then stand
Michael: "hands drop a little early, and the last bit seems like a jump. The player should climb onto knees then stand
up."
- Hands hold until the knee is planted on the top (hand weight releases only after the knee plant, not during it).
- No hop: the root never rises above the standing height on the top and has no upward velocity spike at the end; the
  stand-up from the knee is a smooth rise. Lengthen the climb-up if needed (starting value up to about 1.3 s).
- Team climb-ups keep `CLIMB_UP_TEAM`.

## F6 Rifle draw: no low-ready dip
Michael: "rifle has a weird low ready before holding up to shoulder."
- The rifle draw goes from the back mount straight to the shoulder / ready position, with no pass through a low-ready
  dip. Check the travel end point, the swap clip's hand keys and the ready pose blend after the travel. Pistol draw
  unchanged (fine-tuning waits for footage).

## F7 Speeds on the D-pad (question and prompt)
Michael: "D pad left and right is speed? Lowest speed is good now. Aiming is good too."
- Facts: Michael chose speed on D-pad up / down (2026-10-18 controls answer, playtest-2 note "dpad up and down should be
  walking speed"); stick deflection also sets speed (CT); D-pad left is the selected vision toggle (A1). CT itself has
  no D-pad speed.
- Find why he thinks left / right is speed: an in-game prompt, the controls list, a tutorial panel on Marlow Yard, or a
  binding that actually reads left / right. Make every prompt, panel and binding agree: speed = D-pad up / down (and
  the stick). If the wrong text is in a menu screen (`src/ui/screens/`, Menu Notes owns those), do not edit it: list the
  file and line in the report so the job lead can pass it on.
- The job lead answers Michael through the orchestrator.

## Limits
- Off limits: `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`, `docs/DECISIONS.md`,
  `docs/ROADMAP.md`, `src/world/menuScene.ts`, menu screens in `src/ui/screens/`, `src/player/goggleGlow.ts` (Menu
  Notes is removing the forehead glow), and the scripts e2e-ctcourse, e2e-coop, e2e-netmove, e2e-net-lib.
- Co-op: remotes pose from MoveState through the same code. A wire change takes PROTOCOL_VERSION 25 and updates the tests
  that assert it.
- Never bump package.json.

## Tests
`npm run check`; unit tests on changed numbers updated, not skipped (grep `tests/` and `scripts/` for the shoulder
default, crouched aim pivot, CLIMB_UP_TIME, travel keys, peek side). e2e on port 4193, one at a time, heavy slot:
e2e-wall, e2e-anim, e2e-clip, e2e-traverse, e2e-weapons-carry, e2e-pad, e2e-move, then e2e:quick, e2e-ctcourse,
e2e-coop, e2e-netmove. Ignore e2e-traverse "a tap kicks the grate in" only if it still fails on master.
Contact sheets (GPU, heavy slot) into `docs/ct-prototype/shots/f/`: crouch idle kneel (side, front), crouched ADS
(rifle, pistol) next to standing ADS, corner lean both edges with the camera swung both ways, ledge climb-up dense
0.6-1.6 s, rifle draw dense.

## Report
`docs/ct-prototype/F-REPORT.md`: per item, what changed, numbers, files, sheets, what is still off, what Michael should
try on /ct/; the F7 answer in one line for Michael.
