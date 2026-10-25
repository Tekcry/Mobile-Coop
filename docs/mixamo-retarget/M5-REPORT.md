# mixamo-retarget M5 - report (source label, Anim Studio, tuner)
Owner: Player Build. Status: done (2026-10-25), branch `feature/mixamo-retarget-m5`. Michael ~19:05: "make sure i can fine
tune in anim dev just in case i have to."

## Built
- **Source table** `src/anim/mocapSources.ts`: clip name -> `{ source: 'cmu' | 'mixamo', title, take?, credit, studio }`.
  12 CMU rows by hand (takes and seconds from the module headers). Two empty marker blocks: `// @mixamo-keyed-begin/-end`
  (M3) and `// @mixamo-trav-begin/-end` (M4). Lookups: `mocapSource(name)`, `mocapSourceTag(name)` (0 / 1 CMU / 2 Mixamo),
  `mocapSourceTagWord`. These are Map lookups and allocate nothing.
- **Now playing** (`nowPlaying.ts`):
  - `GraphPlaying.trav: Clip | null` is the traversal channel clip the graph plays.
  - The line names the source: "motion-capture (CMU) walk", "mix, 70% motion-capture (CMU) walk, 30% hand-made",
    "motion-capture (CMU) walk clip" (Studio). With I2 it will read "motion-capture (Mixamo) hang" (the body state's word, else
    the clip's). A hand-made traversal clip reads as before.
  - The move's source comes from `noteMoveSources(LOCO.set)`, called once per switch change in `setMocapLocomotion` and once
    at load, so it follows whatever set I1 resolves.
  - The packed key adds the clip-or-traversal tag, a which-one bit and the 2-bit source. It stays under 2^28 (a small
    integer, never a boxed double).
- **Graph write** (`animGraph.ts`, minimal): a `travNow` field set where `TRAVERSE_CLIP` is picked, then
  `P.trav = this.travNow` in `notePlaying` (null under a studio clip). It is one reference write and allocates nothing. I did
  it now, so I2 only swaps clips in the table and the label follows.
- **Anim Studio "motion capture" group** (`studio.ts`):
  - Clip modules are found by file: `import.meta.glob('./clips/mocap/*.ts')` and `./clips/mixamo/*.ts`, as `tuneKeys.ts` does.
  - One loop per row whose module exists, placed after the hand-keyed clips and before the pairs.
  - Keyed rows go through `keyed()` (id `keyed:mocap_<name>`). The label is "motion capture (CMU): walk". The pace is the
    clip's stride over its cycle. The Studio pins the body state the game plays it in (`CLIP_BODY` gains the capture rows).
  - Channel rows reuse their prop's traversal loop as `trav:<loop>/<slug>`.
  - With zero Mixamo rows the group shows the 12 CMU captures. Mixamo rows appear by themselves when M3/M4 add modules and rows.
- **Captures on the Studio drive play as the game plays them** (`studioDrive.ts`): a clip with a source row is sampled with
  `MOCAP_LAYERS` and `keyMocap = 1`. Rows the game keeps off a capture (arm swing, twist, lean, elbow out) stay off it in the
  Studio too. Hand-made clips are unchanged.
- **Tuner**:
  - `tunerLayout.ts`: `plainLoop` shows a capture label as is ("Motion capture (CMU): walk"). `loopGroups` maps
    `trav:<loop>/<slug>` to its loop's groups.
  - `animTunePanel.ts`: a capture loop in the Studio uses the `mocap` effect mode, so the same rows grey as in the game.
  - `tunerEffect.ts`: new data, `NO_EFFECT.ledge.procedural` = the three Body foot reach rows. A lip has no foot plants, so the
    probe found they move nothing on the hang and shimmy. They now grey with "Does nothing in this move".
  - `KEYS_MOCAP_NOTE` is unchanged. The probe did not need it: traversal clips are not keyed clips, and today the hand-made
    clips play.
- **Attached-state probe** (`tests/helpers/attachProbe.ts`, run from `tests/tunerReachProbe.test.ts`):
  - A Wren rig is driven as `attachController` drives it: `AttachGrips` on a lip or ladder, `attachPose`, the cadence or
    climb-up progress, and `player.ts`'s tuning-window order.
  - It covers 5 states: hang, shimmy, ladder, lip climb-up, ladder top-out.
  - Rows moved: Body attached rows, 8 Joints rows, Hands & feet place rows, Limb reach, the Speed climb row (`shimmyMul`,
    `ladderMul`, through `speedAttachMul`), and the Climb and vault rows for the climb-up.
  - It asserts every row moves the pose except an exact known list, and that the tuner greys exactly that list.
  - `ATTACH_PROBE_SETUPS` holds only the hand-made clip set today. I2 adds a Mixamo setup there to prove the same rows on the
    captures.
  - A check fails if any channel row's Studio loop is not probed. `trav:vent` (crawl) is listed as open for I2.
- `TESTING.md`: one Studio line (the motion-capture group, the source words, `?mixamo=1`).
- `scripts/e2e-studio.mjs`: its four `^Now playing: motion-capture walk$` waits now expect "motion-capture (CMU) walk". The
  same commit as the text change.

## Decisions
- One packed key under 2^28. A key past the small-integer range would come back from the call as a 16 B boxed double.
- The CMU strafe-left plays in place because the Studio treadmill only travels right. Strafe-right uses the treadmill.
- CMU one-shot cycles are frames / 40 (`ONESHOT_FPS`); start and stop use their seconds constants.
- Channel captures in the Studio play the game's traversal on the prop. Until I2 lands, the hand-made clip plays there; the
  loop's tune text says so.
- The lip climb-up's three Climb and vault foot rows move nothing (the feet hang free). They stay live because the ladder
  top-out uses them (proved by the `topOut` state) and both share the one group `trav.climbUp`.

## Files
New: `src/anim/mocapSources.ts`, `tests/mocapSources.test.ts`, `tests/helpers/attachProbe.ts`, this report.
Edited: `src/anim/nowPlaying.ts`, `src/anim/mocap.ts` (2 lines), `src/anim/animGraph.ts` (trav write only),
`src/anim/studio.ts`, `src/anim/studioDrive.ts`, `src/ui/tunerLayout.ts`, `src/ui/tunerEffect.ts` (data),
`src/ui/animTunePanel.ts` (effect mode), `tests/nowPlaying.test.ts`, `tests/animStudio.test.ts`, `tests/tunerLayout.test.ts`
(a capture has no Keys table), `tests/tunerReachProbe.test.ts`, `scripts/e2e-studio.mjs`, `TESTING.md`.
Not edited: `studioTraversal.ts`, `tunerReach.ts`, `src/player/*`, `src/net/*`, `src/game/*`.

## Commits
- c3fc576c4: the source table, Now playing source words, the traversal clip field.
- 98091bc28: the Studio motion capture group, captures on the drive as in the game, the source tests.
- 0b46ec45c: the attached-state probe, ledge foot rows greyed, Studio captures in the mocap effect mode.
- (this report): see the branch head.

## Tests and results
`npm run typecheck:fast` clean. vitest, all pass:
- nowPlaying 21: source words, the `trav` field, keys under 2^28, 0 B per frame with a ladder playing.
- mocapSources 5.
- animStudio, animStudio2, animStudioPairsView, tunerLayout, tunerMouse, tunerReach, tunerHands, tunerV3, guardTune,
  marlowT1a, marlowT2, teamPose, cqGait, keyLegTwist, tuneClipSpeed, tuneKeysTime, animGear, animMoveRows,
  animSkeletonClip, animSkeletonRows, e2eAffected: 304 tests.
- animSkeletonIdentity, animSkeletonBake, mocapSwitch, mocapGuards: pass.
- tunerReachProbe (the mocap probe plus the attached probe, about 225 s with tunerReach and tunerEffect), tunerEffect.
e2e not run (laptop queue): e2e-studio, e2e-anim, anim-audit.

## What M3 / M4 must do to add a row
1. Commit the module: `src/anim/clips/mixamo/<slug>.ts` (keyed) or `trav_<slug>.ts` (channel), clip name `mocap_<slug>`.
2. Write one row per line inside your marker block of `src/anim/mocapSources.ts`. The file header has an example of each:
   - keyed (M3): `studio: { kind: 'keyed', body, cycle, move?, crouch?, drawn?, aim?, circle? }`;
   - channel (M4): `studio: { kind: 'trav', loop: 'trav:ledge' | 'trav:ladder' | 'trav:vent' }`.
   Use `source: 'mixamo'`, `credit: MIXAMO_CREDIT`, and `title` = the Mixamo title.
3. Make sure the clip's art-credits row (M6) has the same repo path, clip name, the mixamo.com URL and the licence.
   `tests/mocapSources.test.ts` checks all of this, plus row placement and kind.
Nothing else: the Studio, the line and the probe coverage check pick the row up.

## Open items
- **I2 (traversal):**
  - Add a Mixamo setup to `ATTACH_PROBE_SETUPS` that switches the Wren traversal table to the captures.
  - Add a crawl probe state for `trav:vent`.
  - Make `tunerReach` tag the attached rows "Both" while a channel capture plays (today "Hand-made" is right: the flag is off).
  - If the braced-hang captures ever plant the feet on the wall, take the ledge foot rows out of `NO_EFFECT.ledge`.
- **I1:** when a Mixamo clip fills a `LocoClipSet` slot, the line names it by itself through `noteMoveSources`. A capture on a
  new body state (the standing idle) needs a `MOCAP_STATE_OF`-style entry in `tunerReach`.
- **Studio reach tags:** on a capture loop the tags read "Hand-made" rather than "Not playing now". `notePlaying` still reports
  mocap 0 under a studio clip; I left it alone to keep the `animGraph` edit minimal. The greying is right.
- **Changelog:** no fragment written; the PR owner adds `changes/feature-mixamo-retarget*.md`.
- **Checker:** read every Mixamo title against G6 when the rows land.

## What Michael should try in the Anim Studio
- Main menu > Anim Studio > Loop list: under the keyed clips, "Motion capture (CMU): walk", "... jog", "... run", "... sprint",
  "... start", "... stop", the turns, "... crouch walk" and "... strafe l / r".
- Pick "Motion capture (CMU): walk". The Now playing line says "motion-capture (CMU) walk clip".
- Turn a knee in Body > Joints or move a foot in Hands & feet: the capture follows, as in a match. Arm swing is greyed; it
  does nothing on a capture.
- In a match, walking reads "Now playing: motion-capture (CMU) walk".
- On a ledge or ladder (traversal loops), body forward/up, hand reach and spacing, Joints, and the Speed climb rows all move
  her. The ledge foot rows are greyed.
- Mixamo rows appear as "Motion capture (Mixamo): ..." once M3/M4 land them. The climbing ones sit on their props and play
  the capture with `?mixamo=1` after I2.
