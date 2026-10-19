# Slices D+E brief (playtest 2, 2026-10-19)

Source: `PLAYTEST-2.md` (Michael's notes, verbatim), slices D+E. Prototype pass: playable and clearly closer to CT, no
polishing; every number a starting value (G10). anim-cleanup (PR #12) is merged: draw / holster travel in the hand,
traversal world grips and hand shapes are its work. Build on it, do not undo it. Wren is the player body: pose angles,
IK goals, clip keys and grip offsets may change; meshes, rig proportions and skinning do not.

Each note was re-checked against the code after anim-cleanup (job lead's survey, 2026-10-19). Line numbers are hints.

## D1 Holstering (rifle and pistol)
Michael: "holstering weapons looks strange, hand moves up weird with rifle, and pistol floats into position"
- Survey: travel now rides in the hand (anim-cleanup), but the pistol's paced travel (about 0.145 s) is shorter than
  the 0.2 s `GRIP_RATE` (animGraph.ts ~1026) needs to close the grip, and the swap clip's hR keys hold at the slot from
  0.5 to 0.6 (clips/actions.ts ~105-147): the gun leads the hand. Rifle: `TRAVEL_VIA.back` y 0.3 (weaponModel.ts ~59)
  carries it to head height; the path is a Bezier on top of a smoothstep (double ease).
- Done looks like: the gripping hand stays on the gun for the whole draw and holster (no gap, no lag, both weapons);
  the rifle goes over the shoulder to the back mount without the hand rising above the shoulder line; the pistol comes
  out of the thigh holster with the hand, no glide. Starting values: grip held at 1 while `travelling`; hR keys follow
  the gun; one ease on the travel; rifle via y about 0.12-0.15, x about 0.32, turn spread over the whole path.
- Keep the draw / holster durations (drawState.ts, playerWeapons.ts beats) unless the hand cannot follow; the
  e2e-netmove / e2e-coop 0.55 s holster budget must still hold.

## D2 Hanging shimmy
Michael: "hanging strafing the hands move too quickly, it doesnt look realistic, hand movements should be wider"
- Survey: anim-cleanup changed palm contact only. Ledge offsets ±0.22, slack 0.12, swing 0.13 s, lift 0.05 / 0.06
  (attachGrips.ts ~168-181, ~726-733), overlap at 50% (gripStepper.ts ~85-97), ledge speed 1.2 m/s (attach.ts ~73):
  about 5 hand steps a second.
- Done looks like: about 2 hand steps a second at the current speed, each a wider reach with a visible lift and small
  outward arc, one hand at a time. Starting values: offsets ±0.28-0.30, slack 0.22-0.26, swing 0.28-0.32 s, lift
  0.08-0.10, no overlap on ledges. The same treatment for horizontal pipe hand over hand (pipeH) if it reads as fast.
  Do not change the shimmy speed (1.2 m/s) in this slice; note in the report if it still looks fast.

## E1 Vertical pipe (drainpipe) climb
Michael: "pipe vertical climbing animation while moving is unnatural, it seems partially ok but then legs swing upside
down, and the hands look backwards"
- Survey: hands are likely fixed by anim-cleanup slice 3 (palms 0 deg off the pipe); re-check on a sheet. Legs: the
  CLIMB clip's fLY / fRY lift (up to 0.3 m, clips/traverse.ts ~42-70) is added on top of planted foot targets
  (characterRig.ts ~1682), unsynced with the foot stepper, so a foot can reach hip height straight ahead; the attached
  knee pole is horizontal (solveLegWorld ~2107, kneePoleYaw) and solveTwoBone flips when hip-ankle nears it
  (rigMath.ts ~47-62).
- Done looks like: knees always bend forward / outward toward the wall, never flip, through a full climb up and down;
  feet stay below the hips on the pipe, alternating with the hands. Starting values: no clip lift while a foot is
  planted (or drop fLY / fRY from CLIMB); attached knee pole with about +0.5 up plus forward; foot offR about 0.3,
  slack 0.16, back about 0.08. If the hands are still wrong, fix them; if not, leave them.

## E2 Ledge climb-up
Michael: "climbing up over ledge looks strange, floats over instead of climbing up onto knees"
- Survey: nothing changed by anim-cleanup. CLIMB_UP_TIME 0.85 s (attachController.ts ~71); root lift
  smooth(k/0.6) with forward from 0.45 (~873-884); hand weight releases from k=0 (~1123); no knee plant; pelY minimum
  -0.2 (clips/traverse.ts ~129-149).
- Done looks like, three readable phases: pull up (hands held, hook grip turning to palms pressing down on the top,
  chest to the lip), a knee (or shin) planted on the top with the body low and pitched forward, then stand up and step
  off. Hands stay planted until the knee is on. Starting values: about 1.1-1.2 s total; root y in two steps (lip - 0.3
  by k 0.4, top by 0.65); hand weight 1 - smooth((k-0.6)/0.3); knee plant 0.4-0.7 with pelY about -0.5, pelPitch about
  0.6. Co-op: remotes play the same from MoveState; if the longer time needs a wire change, bump PROTOCOL_VERSION.

## Tests
- `npm run check`; unit tests on the changed numbers updated, not skipped (tests/gripStepper.test.ts "shimmy at 1.2
  m/s keeps both hands within reach", tests/attach.test.ts, tests/drawState.test.ts, tests/handHold.test.ts,
  tests/rig.test.ts grips within 2 cm, tests/animAudit.test.ts).
- e2e to keep green: e2e-anim (draw / holster step < 0.1 per frame), e2e-traverse (grip reach, drainpipe speed, shimmy,
  hang climb-up to y 2.3, pipe hands), e2e-clip, e2e-weapons-carry, then the slice tier: e2e:quick + e2e-ctcourse +
  e2e-coop + e2e-netmove (src/player changes). Port 4193, one at a time, heavy slot.
- Do not edit e2e-ctcourse, e2e-coop, e2e-netmove, e2e-net-lib (Character Build owns their waits); report failures.
- Contact sheets before and after into `docs/ct-prototype/shots/de/` (GPU, heavy slot): holster / draw rifle and pistol
  (`scripts/anim-cleanup/sheets.mjs`, port 4189 or 4193), drainpipe, hang-shimmy, hang-climb with dense 0.6-1.5 s
  frames, pipe-hands (`scripts/anim-cleanup/traverse-shots.mjs`).

## Report
`docs/ct-prototype/DE-ANIM.md`: per note, what changed, numbers, files, before / after sheets, what is still off, what
Michael should try on /ct/.
