# anim-tuner - implementer report (2026-10-20)

## What was built
- **Table** (`src/anim/tune.ts`): pure, no Babylon, no DOM.
  - A `TUNABLES` registry: id, label, kind (mul / add), default, min, max, step, unit, groups, hook.
  - Preallocated values per group: `TUNE_BODY.<group>.<id>` and `TUNE_GUN.<weapon.state>.<id>`.
  - `TUNE_CUR` holds the values the hooks read. `TUNE_LOCAL` keeps the local player's last selection.
  - It also has state selection, the animate window (`tuneBegin` / `tuneEnd`), set and reset per slider, group and all,
    the change log, export, and snapshot / load.
  - Every default is identity (multiplier 1, offset 0).
- **Local player only:** `player.ts` calls `tuneBegin(rp, rig)` just before the local player's `rig.animate` and
  `tuneEnd(rig)` just after.
  - Inside that window `TUNE_CUR` holds the local player's values. At every other time it is identity.
  - So guards, the VIP, remote co-op copies and menu rigs never see a tuned value.
  - Nothing goes on the wire: no MoveState or protocol change.
- **Panel** (`src/ui/animTunePanel.ts`): F3 > **Anim**, beside Tune.
  - Fixed top right, so the overlay and the anti-crab readout (top left) stay visible.
  - Two sections, Body state and Gun hold (weapon x state). Each has a picker that follows the current state while
    "follow" is ticked.
  - Plain range sliders with a readout that turns orange when changed, and "x" to reset one slider.
  - Buttons and toggles: Reset group, Reset all (asks to confirm), "changed only", "barrel marker", Export, Clear log.
  - The barrel marker is a magenta line from the muzzle 12 m out along the bore, with a ball at the end.
  - A "now: <body> / <gun>" line shows the current state.
- **Save** (`src/save/animTuneStore.ts`): its own IndexedDB database `<save db>-animtune` (store `tune`, key `current`).
  - It sits outside the save schema: no SAVE_VERSION bump, not localStorage.
  - Loaded at start; written 0.4 s after the last change.
- **Export** downloads `anim-tune-<YYYY-MM-DD>.json`:
  `{ magic: 'night-shift-anim-tune', version: 1, exported, changed: [{group,id,label,kind,unit,value,default}], log: [{t, group, id, from, to}] }`.
  - A continuous drag of one slider (moves within 1.5 s) is one log entry. The log keeps the last 5000.
- **Hook:** `window.__animTune` (`get`, `set`, `changed`, `exportJson`, `log`, `state`, `body`, `gun`, `cur`, `local`).
  Works in any build, behind F3.

## State selection (`selectBodyGroup`, highest priority first)
1. **hold:** a close-quarters bend (`bend` or `bendDrop` > 0).
2. **Traversal:**
   - `climb` = ladder.
   - `pipeClimb` / `pipeLegs` / `pipeInv` = pipe.
   - `hang` = ledge when a hand hooks a lip, otherwise hang.
   - `crawl` = crawl.
   - `crawlOut` / `ventDrop` = vent.
   - Other traversals: identity.
3. **Back to wall:** lean ≠ 0 = wallPeek; speed > 0.15 = wallSlide; otherwise wallIdle.
4. **Aiming** (aim > 0.5): aimCrouch if crouched, otherwise aim.
5. **Crouched:** crouchIdle below 0.15 m/s, sneak below 1.2, otherwise crouchWalk.
6. **Armed and standing still:** lowReady.
7. **Standing:** idle below 0.15, walk below 2.2, jog below 3.7, otherwise run (the crab readout's bands).

**Gun group:** armed only. Pistol when the weapon mass is below 0.8, otherwise rifle. Then aim / aimCrouch / lowReady.

## Tunables
| id | kind | groups | code value | hook |
| --- | --- | --- | --- | --- |
| trackMul | mul | ground groups, wall x3, hold | stance `half` (keyed track half / hip width) | animGraph.ts |
| kneeOutMul | mul | all body | KNEE_OUT / keyed kneeOut; CLIMB_KNEE_OUT | characterRig.ts |
| kneeLiftMul | mul | moving, ladder, pipe | gait liftH; CLIMB_KNEE_UP | animGraph.ts, characterRig.ts |
| strideMul | mul | walk, jog, run, sneak, crouchWalk, aim, aimCrouch, wallSlide, hold | stepLength | motion.ts, playerController.ts (`tuneSim`) |
| pelvisYAdd | add m | all body | pelvis.y (crouch depth) | animGraph.ts |
| leanAdd | add rad | all body | spine.pitch; keyed spine pitch | animGraph.ts, keyed.ts |
| armSwingMul / armSwingGrow | mul / add per m/s | walk, jog, run, sneak, crouchWalk | keyed arm points about the clip mean + READY_HANDS swingT | keyed.ts, animGraph.ts |
| elbowOutAdd | add m | idle, walk, jog, run | keyed elbow point x | characterRig.ts |
| elbowPoleMul | mul | all body | arm IK pole outward share 0.55 | characterRig.ts |
| headTurnMul | mul | all body | RigPose.lookYaw | tune.ts tuneBegin |
| peekLeanMul | mul | wallPeek | RigPose.lean (clamped ±1.5) | tune.ts tuneBegin |
| wallGapAdd | add m | wall x3 | wallRootPush | player.ts |
| bodyFwdAdd / bodyUpAdd | add m | ladder, pipe, ledge, vent, crawl, hang (+ hold for fwd) | rig root offset, visual only | player.ts `tuneRoot` |
| handUp/Fwd/OutAdd | add m | attached x6, hold | rig.reachL/R + grip points; Out = shimmy spacing | tune.ts (restored after animate) |
| footUp/Fwd/OutAdd | add m | attached x6 | rig.plantL/R | tune.ts |
| guardGapAdd / guardSideAdd | add m | hold | (pass 3) visual: her rig root back / the other way; GRAB.hold / side untouched | player.ts `tuneRoot` |
| gunFwd / gunUp / gunSide | add m | 6 gun groups | weaponPivot position (side mirrored) | characterRig.ts |
| gunPitch / gunYaw / gunCant | add rad | 6 gun groups | weapon pitch / yaw / roll | characterRig.ts |
| sightYAdd | add m | aim groups | SIGHT_EYE in sightToEye | characterRig.ts |
| headDropMul | mul | aim groups | NECK_WELD | characterRig.ts |
| tuckMul | mul | aim groups | AIM_ELBOW_TUCK | characterRig.ts |

In `animGraph.ts` and `characterRig.ts` every hook is a one-line multiplier or offset on an existing line, plus one
import line each (CT Core constraint).

## Not covered
- **Stock depth:** folded into "gun fwd". It moves along the body's forward axis, not along the bore.
- **Gun up while aiming:** `sightToEye` holds the sight at the eye, so "gun up" mainly shows at low ready. When aimed,
  use "sight height vs eye".
- **Support elbow on its own:** `tuckMul` and `elbowPoleMul` act on both arms.
- **No slider:** WALL_STANCE / WALL_SIDE_POSE / WALL_BACK, KNEE_HAND, HOLD_HAND, CLIMB_STANDOFF / PIPE_STANDOFF, the
  keyed idle's arm motion, READY_HANDS widths, per-clip duty.
- **Other weapons:** SMG, shotgun and sniper share the rifle groups.
- **Transitions:** moving between groups pops.

## Files
- **New:** `src/anim/tune.ts`, `src/ui/animTunePanel.ts`, `src/save/animTuneStore.ts`, `tests/animTune.test.ts`.
- **Hooks:** `src/anim/animGraph.ts`, `keyed.ts`, `motion.ts`; `src/player/characterRig.ts`, `player.ts`,
  `playerController.ts`; `src/ui/debugOverlay.ts` (pass 3: `src/game/takedownController.ts` is back to master).
- **Suite:** `scripts/smoke.mjs`, one check.
- **Docs:** CHANGELOG, TESTING, `docs/systems/ui.md` (new "Debug overlay (F3)" section), `docs/systems/testing-tools.md`.

## Assumed decisions
- **A1.** The table is `src/anim/tune.ts` (pure), so hot paths import it without pulling the UI. Undo: move the file.
- **A2.** Selection rules as above:
  - Aiming overrides crouch and speed.
  - lowReady only when armed and standing still. Armed and moving uses walk / jog / run.
  - Speed bands match the crab readout.
  - Undo: `selectBodyGroup`.
- **A3.** crawl = moving in a duct; vent = the vent exits; ledge = a hand hooked on a lip; hang = the other hangs.
  Undo: `selectBodyGroup`.
- **A4.** The gun group is picked by weapon mass (below 0.8 = pistol). Undo: `selectGunGroup`.
- **A5.** Distance to the ladder / pipe / guard is a visual rig-root offset, not the sim standoffs. Undo: `tuneRoot` in
  `player.ts`.
- **A6.** (revised in pass 3) "Gap to guard" and "guard side offset" are visual only: during the hold they offset the
  local player's rig root (`tuneRoot`, `player.ts`): back along her facing by the gap, and the other way by the side
  offset. Gameplay reads no tuner value: `GRAB.hold` / `GRAB.side`, `holdAt` and the guard's position are as on master,
  and `takedownController.ts` is reverted. Her hands stay on the guard's world grip points, so the arms reach.
  Undo: the guard terms in `tuneRoot`.
- **A7.** Step length scales `stepLength` around the local motion driver step and inside the animate window.
  - Speed is unchanged; cadence changes.
  - Undo: the `tuneSim` lines and the `motion.ts` factor.
- **A8.** Hand / foot reach offsets shift `reachL/R` and `plantL/R` only for the animate call, then restore them. Undo:
  the shift block in `tuneBegin`.
- **A9.** One arm-swing multiplier covers both the keyed clips and the procedural swing. Growth adds per m/s. Undo: the
  `armSwingK` reads.
- **A10.** On keyed clips, the lean is a pitch on the keyed spine (`tuneKeyedLean`). Undo: the `keyed.ts` line.
- **A11.** A separate panel top right instead of rows in the Tune grid, and its own IndexedDB database. Undo: delete the
  database `<save db>-animtune`.
- **A12.** Change-log entries merge within 1.5 s; the log is capped at 5000.
- **A13.** The e2e check went into `smoke` (it already boots with `?debug=1`).
- **A14.** Reset all asks for confirmation.

## Tests
- **`tests/animTune.test.ts`, 16 tests:**
  - Defaults are identity; clamping; group membership.
  - Reset per slider, per group and all.
  - The change log, including merging a drag.
  - Export shape and file name.
  - Snapshot round trip; group selection (24 poses).
  - The begin / end window, with restore over 10,000 frames.
  - The IndexedDB round trip.
  - The real `AnimGraph` inside and outside the window.
- **`scripts/smoke.mjs`:** opens F3 > Anim, moves the walk "foot width" slider through the page, checks the value and
  the log, then puts it back.
- **Implementer's checks:** tsc clean, eslint clean, vitest 16 / 16.

## What Michael should try
1. Start a match, press F3, click **Anim**. Move with the pad so the mouse is free for the sliders.
2. **Walk:** "foot width / track" and "knee out" while watching the crab readout; also "arm swing amount" and "elbow out".
3. **Crouch:** "pelvis height / crouch depth", "forward lean", "knee out".
4. **Wall:** "gap to wall", "head turn"; when peeking, "peek lean".
5. **Ladder / pipe / ledge:** "body fwd", "hand reach up", "hand spacing (out)", "foot reach".
6. **Guns:** draw the rifle, then the pistol; tick "barrel marker" and aim. Try "muzzle pitch", "cant", "sight height vs eye".
7. **Grab a guard:** "gap to guard", "guard side offset".
8. **Export:** downloads `anim-tune-<date>.json`; send it back. Values survive a reload.

## Pass 2 (2026-10-20): pad and phone entry, touch, share; the stiff-walk sliders
- **Entry without F3:**
  - Pause > "Animation tuner (dev)" (key `anim-tuner`, after Quit; `src/ui/screens/pauseScreen.ts:88-99`) opens the
    panel and resumes, so you can move and tune.
  - Settings > Graphics > Developer > "Animation tuner (dev)" (`src/ui/screens/settingsScreen.ts:380-382`).
  - F3 > Anim still works. The panel now stays open over play, with or without the overlay (the overlay's end-frame hook
    drives it before its own visibility check), until the header's x.
- **Phone fit:** a header bar with fold (_ / +) and close (x); width `min(340px, 45vw)`; `max-height: calc(100vh - 8px)`
  with `overflow-y: auto` and `overscroll-behavior: contain`; rows, sliders, pickers and buttons at least 28 px high.
- **Touch isolation:** the panel stops pointer, mouse, click, wheel, touch and context-menu events at itself (bubble
  phase), so the menus' hover focus and the look never see them. Key events are not stopped (WASD keeps working);
  buttons blur after a click and sliders on change.
- **Share / Copy:** `navigator.share` with a File when `canShare({ files })` allows; else `navigator.clipboard.writeText`;
  else the JSON in a read-only text box, selected on focus. Each step is feature-detected and in try / catch; closing the
  share sheet (AbortError) stops there. Export (the plain download) is unchanged.
- **Stiff walk (CT Core).** Two new sliders, defaults identity. The walk, jog and run groups now open with:
  1. arm swing amplitude (`armSwingMul`);
  2. **stance knee flex** (`kneeFlexAdd`, NEW, add m, -0.03..0.15; idle, walk, jog, run): shortens the planted leg's soft-knee
     length `legLen` (SOFT_KNEE_STAND), so the pelvis drops and the knees bend at contact and in stance;
     `src/player/characterRig.ts:1762` (one-line read);
  3. **trunk / shoulder counter-rotation** (`trunkTwistMul`, NEW, mul 0..3; walk, jog, run): scales the keyed spine and
     chest yaw about the clip mean (a swing-twist split of each joint's deviation from `meanQ`; `tuneKeyedTwist`, called
     at `src/anim/keyed.ts:171`), and the procedural gait clips' spine yaw (`tuneMoveTwist` on the locomotion blend,
     `src/anim/animGraph.ts:748`, a wrap of the existing line);
  4. step length (`strideMul`), now labelled "step length (cadence at the same speed)".
  The registry order puts these four first in every group that has them.
- **Tests:** 2 new in `tests/animTune.test.ts` (18 in all, pass):
  - the keyed walk's spine and chest yaw deviation doubles at x2 (pelvis and neck untouched; identity outside the
    window), and the gait blend's spine yaw scales alone;
  - on the real rig, walking at 1.4 m/s with knee flex 0.06 m puts the hips more than 1.5 cm lower.
- **Suite:** `scripts/e2e-menus.mjs` pause-items assert now expects `...,quit,anim-tuner`. The smoke check is unchanged
  and still valid: it opens through the Anim button. Opening from the pause menu was not added to smoke, because smoke
  boots to the title with no match to pause.
- **Checks:** `npx tsc --noEmit -p .` clean; eslint on the changed files clean; `npx vitest run tests/animTune.test.ts`
  18 / 18 pass. e2e not run.

### Assumed decisions (pass 2)
- **A15.** The panel is independent of the overlay. Closing F3 no longer hides it; only its x or the Anim button does.
  Undo: put the overlay visibility gate back in `AnimTunePanel.show` and `frame`.
- **A16.** The pause row comes after Quit, so the menu's existing order and focus stay. Undo: move the row in `pauseScreen.ts`.
- **A17.** The Settings entry sits in Graphics under a "Developer" group, after Benchmark. Undo: the two lines in
  `settingsScreen.ts`.
- **A18.** Key events are not stopped at the panel (keyboard play keeps working). Pointer, touch, wheel and click events
  are. Undo: the event list in the panel constructor.
- **A19.** Stance knee flex also shows in idle, so the standing knees can soften. Undo: its `groups`.
- **A20.** Trunk counter-rotation covers the spine and chest (keyed) and the spine yaw channel (procedural). The pelvis yaw
  (hip twist) is left alone, as the counter to it. Undo: the twist slots in `tuneKeyedTwist`.

## Pass 3 (2026-10-20): review fixes for PR #56
- **Keyboard:** a key released while a panel input has focus still releases (`keyboardMouseSource.ts`: only the keydown
  is ignored on INPUT / TEXTAREA targets), so a key held when focus lands on a slider never sticks. Checkboxes and pickers
  blur on change; sliders blur on pointerup / pointercancel / touchend / touchcancel / lostpointercapture (and on change).
- **Follow:** never rebuilds while a slider is pressed or a panel input / picker has focus. A new state takes over only
  after holding 300 ms (`FOLLOW_HOLD_MS`). A manual pick turns follow off and unticks it.
- **Pause:** "Animation tuner (dev)" now sits before Quit (`resume, objectives, settings, report-feedback, anim-tuner,
  quit`), so Up from Resume still wraps to Quit. The `e2e-menus` pause-items assert matches this order.
- **Gameplay reads no tuner value:** `takedownController.ts` reverted to master. The guard gap and side offset are
  visual, through the hold's rig-root offset (`tuneRoot`); see A6.
- **Safety:** `try { rig.animate } finally { tuneEnd }` in `player.ts`, and `try { motion.step } finally { tuneSim(false) }`
  in `playerController.ts`.
- **Target hints** (CT Core): `TUNE_HINTS` / `tuneHint` in `tune.ts`. The real-world target sits as a small grey line under
  arm swing, stance knee flex, knee lift, counter-rotation, pelvis height and step length in walk (1.4 m/s), jog (3.0)
  and run (4.0). Text only; no default changed.
- **Tests:** 2 new (20 in all, pass): the hold's visual gap / side offset on the rig root, with `takedownController.ts`
  free of tuner reads; the hints present on the walk / jog / run sliders and every default still identity.
  `npx tsc --noEmit -p .` and eslint on the changed files are clean. No build or e2e run (dist/ in use).
- **A21.** Follow's 300 ms hold also applies to the gun section. Opening the panel or ticking follow switches at once.
  Undo: `FOLLOW_HOLD_MS`.

## Pass 4 (merge of master 4.19.1, slice 3)
- Conflicts in animGraph.ts, motion.ts, characterRig.ts resolved on slice 3's code with the hooks re-applied: lean on the keyed spine pitch, stride on all three stepLength returns (the glide steps included), head drop on NECK_WELD, elbow pole and tuck on the merged tuck (AIM_ELBOW_TUCK / READY_ELBOW_TUCK).
- New gun tunable `glideTwistMul` (aim groups) on GLIDE.yawCut; `tuckMul` now in every gun group (low ready tucks too since slice 3). Defaults identity.
