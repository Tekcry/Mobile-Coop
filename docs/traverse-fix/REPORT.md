# traverse-fix (CT Core Build, spare job 8) - report

Job row: "Traversal: ledge-end hand fall-through, climb-up hands let go early, rifle draw -1.5 cm vs e2e-clip -2 cm"
(from `docs/ct-prototype/STATE.md` open items D2b / D+E). Branch `feature/traverse-fix`, merged with master 4.68.0.

## Items
1. **Ledge-end hand fall-through - done.** At a lip's end the leading hand sits clamped at `max`; the trailing hand's
   speed lead re-gripped on (or through) it (minimum gap 2.7 cm at 0.8 m/s, 0 at 1.2 m/s; up to 32 cm crossing mid-lip on
   the first quick reach). `GripConfig.minGap` (gripStepper): a limb on the other side of the body never re-grips nearer
   than this to the other limb's grip, nor past it; when pinned back behind where it is, it stays put. Set for ledges
   only (`LEDGE_HAND_GAP` 0.12 m, attachGrips); ladders and drainpipes keep their hands passing by design.
2. **Climb-up hands let go early - not done here (mocap clip only).** The grips already hold the hands at weight 1
   until k 0.38 (the knee is planted by 0.36) and release over 0.38 - 0.5 (`CLIMB_UP_HANDS`). The palms leave the lip
   earlier because the shoulders rise out of arm reach (arm ~0.54 m). Measured headless (NullEngine rig, CLIMB_UP alone):
   shoulder over root 1.27 m at k 0.21, 0.94 at 0.30, 0.84 from 0.33 to 0.48 (hips 0.41, torso only ~30 deg forward).
   With `CLIMB_UP_PATH`'s root that is 0.44, 0.61, 0.80, 0.84 m over the lip at k 0.30 / 0.33 / 0.36 / 0.38 (in game the
   earlier agent saw 0.60 m at 0.32, 0.92 m at 0.39). The grips only set targets; a lower or later root path
   (attachController, CT's knee-on-top timing at 0.4 - 0.5 s) would sink the planted knee into the block. The fix is in
   `src/anim/clips/traverse.ts` CLIMB_UP (a mocap file, out of bounds for spare jobs): pitch the trunk forward over the
   lip while the knee comes on (pelPitch + spPitch about 1.1 - 1.3 rad combined over k 0.30 - 0.50, so the shoulders sit
   within ~0.5 m of the top, then come upright into the crouch by 0.654), then the palms can stay on the lip until the
   right foot is on top (k 0.52). Kept as `it.todo` in `tests/traverseFix.test.ts` "(traverse-fix 2)" for the mocap owner.
3. **Rifle draw clearance - done.** `TRAVEL_VIA.sling` [0.3, -0.22, 0.14] -> [0.4, -0.22, 0.04] (further out from the
   hip, less forward). e2e-clip "sling draw + glide": trunk -1.5 -> +0.9 cm, legs 0.2 -> 2.8 cm (z 0.22 forward was worse,
   -2.6 cm and into the thigh).

## Files
- `src/player/gripStepper.ts` (`GripConfig.minGap`), `src/player/attachGrips.ts` (`LEDGE_HAND_GAP`, ledge config)
- `src/weapons/weaponModel.ts` (`TRAVEL_VIA.sling`)
- `tests/traverseFix.test.ts` (items 1 and 3; item 2 todo with the measurement)

## Tests (desktop, after merging master 4.68.0)
- Vitest, one file at a time: traverseFix 2 passed + 1 todo (7 s); gripStepper 9 (3 s); attachGripsG4 4 (2 s); attach 14
  (3 s); animN4bTraverse 13 (5 s); backDiagTravel 2 (5 s); animGear 9 (7 s); animGoggle 4 (7 s); carry 9 (2 s);
  readyHands 2 (6 s); tuneHands 12 (7 s).
- `npx tsc --noEmit -p .` clean (23 s); eslint clean on the changed files.
- e2e (E2E_GPU=1, port 4192, heavy2.lock, one at a time): e2e-traverse pass, 81 asserts (18 s; shimmy hands reach their
  grips 0.0 cm); e2e-clip pass (12 s; sling draw + glide trunk 0.9 cm, legs 2.8 cm, head 1.3 cm).

## Open items
- Item 2 needs the mocap owner (CLIMB_UP trunk pitch over the lip); then turn the todo into a test.
- Not judged by eye: the hands' look at a lip end (they now wait rather than bunch up).

## Changelog line
Ledge hands never re-grip through each other at a lip's end; the rifle's sling draw clears the trunk.
