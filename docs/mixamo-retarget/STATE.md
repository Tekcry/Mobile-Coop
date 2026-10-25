# mixamo-retarget - state

## Resume (2026-10-25 ~21:10, new account; TOP PRIORITY, Michael ~20:10: "Top priority is getting new mixamo animations in so I can fine tune")
- Target: ONE PR (#452, big-pr), all 21 clips listed / tunable in Anim Studio's "Motion capture" group; in-game use
  later (I1-I3) behind `mixamo`. Menu path for Michael: Main menu > Anim Studio (dev) > Motion capture.
- Branch `feature/mixamo-retarget` = M1 + M2 (+ spine fix round) + M3 + M4 + M5 + M6 + changelog fragment, built in
  worktree `C:/NightShift/Mobile-Coop-mixamo-retarget-m4` (the -m4 branch is the same head). All slices merged.
- Regenerate (dumps in build/mocap/mixamo/raw, not in git; `node scripts/mocap/mixamo.mjs` makes them with Blender):
  keyed `node --import ./scripts/operators/ts-resolve.mjs scripts/mocap/mixamoEmit.mjs`, traversal
  `node scripts/mocap/mixamoChannels.mjs`. Direction check `node scripts/mocap/mixamoTake.mjs` (0.01 deg on all 21).
- Checks: Opus checker PASS on bf89487f (all but M4); M4 checker RUNNING on 60aefbe5; laptop e2e-studio + e2e-anim
  request 20261025T100929-night-shift-player-b-60aefbe5-0875 (set mixamo). typecheck + 9 vitests green (98 + 1 skip).
- Then: post `checker` on the head, PR ready (gh pr ready 452), affected-e2e, message the orchestrator at train-ready.
- Polish (checker, later PR): (1) art-credits licence sentence still a placeholder: copy the Mixamo FAQ sentence by hand
  before switch-on (A11); (2) CLIPS.md "Dir err" / M3-REPORT use retargetDirErrDeg (0 by construction): show the
  mixamoDirCheck numbers; (3) studio.ts pulls ~0.54 MB of generated clips into the game bundle (imported by
  gameState.ts, world/maps/index.ts): dynamic import or smaller LOOP_FPS / trims; (4) no probe that tuner rows move the
  keyed captures on carry / crawl / ledge / crouchIdle body states; (5) M4: onTop dropped in the two hang climb-ups
  (foot tops before release, as the game clip), freehang_climb ~4x faster than the take (judge in I2 video),
  hanging_idle needs 1/4.7 per s in I2, ladder top-out stand keys unused past 0.654; neck pivot 15 vs 7 cm (WIP ea5f6965).
- Open questions: licence sentence (A11); walk-cap ruling (A1); 30 vs 60 fps (A3, 30 assumed).
- Next: M4 checker verdict -> checker status + PR ready.

## History
- 2026-10-25 ~19:00: job opened by the orchestrator (Michael's Mixamo decision, ROADMAP Decided).

## I2 at the save (22:35, head 7f3734fba on feature/mixamo-i2)
- Done: d07dafb4 capture path boxes no doubles (alloc test passes); MIXAMO_ON braced_hang_to_crouch and climbing_ladder
  off (palms 29 cm off the lip / soles 38 cm vs hand-made 32); mixamoTraverse 10/10, mocapGuards guard climb pin passes.
- Failing: climbHands with the flag on: release wrists 9.9 cm a frame (limit 3), trunk step 20 cm (limit 9.6) - the
  freehang_climb stand-up end fading in past CLIMB_UP_CROUCH_K; the flag-off run timed out at 120 s under CPU load.
- Left: fix or switch off freehang_climb, changes/feature-mixamo-i2.md, I2-REPORT.md, merge origin/feature/mixamo-retarget.

## I2 fix round at the save
- Done (28566cd0c): crawl capture off in MIXAMO_ON (M4 yaw wrap: joints 13.8 cm a frame vs 0.5), crawl check, report and changelog.
- Done (this commit, not yet full-suite run): capture <-> hand-made switch inside traverse inertialized (animGraph mxLast); switch-frame tests (graph and rig).
- Done (this commit): allocation test warmed and alternating over 5 rounds, medians; 3 runs in a row pass (hang moving 1664 vs 2368, still 1305 vs 1737, climb-up 1305 vs 1401-1417).
- Done in the fix round (1f1ad42b): I2-REPORT bytes and test list, PLAN Claims (studioStage.ts, climbHands.test.ts), full vitest list (41 pass). Checker Opus PASS on 1f1ad42b.
- Done (CI alloc fix): real, not noise. `mixamoTrav` alone allocated 32-160 B a frame (kept channels' `evalCurve` not inlined: boxed time and value); `evalCurveIO` (curves.ts) and the capture doubles in a Float64Array make it 0; the test reads `mixamoTrav` directly (the whole frame swung 1.4 KB between rounds). 3 runs pass.

## I3 (2026-10-25, feature/mixamo-i3): built
- Done: WREN_STANCE / STANCE_SHOT (mixamo.ts), stanceShot in the keyed block (animGraph.ts), tests/mixamoStance.test.ts
  9/9, I3-REPORT.md, changes/feature-mixamo-i3.md; merged I2 28566cd0 and 1f1ad42b.
- MIXAMO_ON stand_to_crouch / crouch_to_stand both off (A8): over the 0.22 s stance the takes jump the joints 20.2 / 11.3 cm
  a frame (e2e-anim limit 7.5, hand-made 6.5 / 6.4); Studio only.
- Left: laptop run (affected-e2e src/anim, e2e-anim, e2e-move, e2e-stealth, anim-audit).

## I4 (feature/mixamo-i4)
- Done: recipe options `turn` (trunk yaw onto travel, mixamoTake.mjs `turnTake`) and `armIn` (mixamoEmit.mjs `armIn`),
  stance `trim`s, no head channel on the stance clips, `STANCE_SHOT.edge` 0.4; the four clips re-emitted; rows
  standing_idle, crouched_walking, stand_to_crouch, crouch_to_stand on (Michael 2026-10-26: Mixamo wins unless visibly
  broken); tests assert the shipped rows with hard caps (bone step 25 deg, planted slide). I4-REPORT.md.
- At the save: left = full CLIPS.md re-emit (partial runs keep it), the stance leg-channel check the I3 checker asked
  (knee readings equal the hand-made blend, not traced in mixKeyed), the animGraph `./mixamo` import fold, laptop e2e.
- Done (CI alloc fix): real, not noise. `mixamoTrav` alone allocated 32-160 B a frame (kept channels' `evalCurve` not inlined: boxed time and value); `evalCurveIO` (curves.ts) and the capture doubles in a Float64Array make it 0; the test reads `mixamoTrav` directly (the whole frame swung 1.4 KB between rounds). 3 runs pass.

## I6

At the save (00:44, 2026-10-26, branch feature/mixamo-i6):
- Done: recipes for the 7 locomotion clips (`slot` field, gait bands walk/jog/run); Mirror-note slug fix (`walking_left_turn_mirror`); `setMocapMixamo` (mocap.ts, all keyed slots) + `MIXAMO_LOCO` (empty) / `MIXAMO_ON` rows (mixamo.ts); tests/mixamoLoco.test.ts. Dumped 0 of 17 (both heavy locks held by the laptop queue all session); emitted 0; wired 0 clips (registry empty).
- Left: dump (`node scripts/mocap/mixamo.mjs` under a heavy lock: 17 to do), emit, rows in `MIXAMO_LOCO`, Studio rows, measure (slide / seam / knee / elbow vs CMU), recipes for the 10 later clips (turns, strafes, sneaks, backwards); mixamoEmit "one module per recipe" fails until emitted; mixamoSwitch (e) alloc test failed once (103 s, check if timeout or real), I6-REPORT, changes/feature-mixamo-i6.md.

I6 built (2026-10-26, feature/mixamo-i6):
- Done: 17 dumped (heavy2.lock), 17 emitted (turn kind, strafe band, faceTake, jog cycles), 17 Studio rows, CLIPS.md, 11 in `MIXAMO_LOCO`; rows on: walking, jogging, start / stop walking, right_turn, walking turns L / R, strafes L / R; off: running, fast_run (knees cross). Credits, I6-REPORT.md, changes/feature-mixamo-i6.md. mixamoLoco 16/16, related vitest 118 pass.
- Left: laptop run (affected-e2e src/anim, e2e-anim, e2e-move, anim-audit, e2e-studio), checker.

## I7
Pack driver (2026-10-26, feature/mixamo-i7; plan: [BATCH2-PLAN.md](BATCH2-PLAN.md) "(2) Driver change"):
- `scripts/mocap/mixamo.mjs` lists the root FBX files plus one level of `pack-*` folders (161 files: 55 root, 106 in
  pack-pistol 20 / pack-rifle 49 / pack-shooter 15 / pack-action-adventure 22). `file` is the path relative to the
  clip folder; dumps stay flat (`raw/<slug>.json`); skip-by-hash and `--only` unchanged.
- Slugs: pack prefix (pistol / rifle / shooter / aa; unknown `pack-<x>` -> `<x>`) unless the slug already starts with
  it; a digits-only note `(2)` -> `_2`; the Mirror rule kept; root slugs unchanged. All 161 unique and equal to the
  plan's Clip table; a collision still stops the run, naming both files.
- Manifest rows gain `pack` and `title` (the credits title cell: "Pro Rifle Pack: walk forward"; a root file its title).
- Not done here (later in I7 per the plan, or I9): the Blender dump, `mixamoDup.mjs`, the emitter / take recipe options.

## I9
At the save (05:30, 2026-10-26, branch feature/mixamo-i9 on I7 7b076225; I6 cccb7b45 report/MIXAMO_LOCO commits not in this base):
- Done: read the brief (BATCH2-PLAN I9, PLAN, M3/I6 reports); no dump started, no Blender run, no lock taken; no code yet.
- Left: copy raw dumps + manifest from Mobile-Coop-mixamo-retarget-m4 build/mocap/mixamo; dump the 123 new files under heavy(2).lock; I7 emitter options (pack, travel -z/auto, mirror, place) if missing; recipes, emit, Studio rows, CLIPS.md, art-credits rows, tests, I9-REPORT, changes/feature-mixamo-i9.md.

At the save (2026-10-26 ~08:50, feature/mixamo-i9):
- Merged origin/feature/mixamo-i6 (9f5847d04). Dump done: all 123 new files dumped (161 in build/mocap/mixamo/raw; heavy.lock taken and released in the same command; no Blender running). Take self-check 123/123 OK, leg scale 0.993 on every pack.
- I7 parts done (uncommitted before this save): mixamoDup.mjs (0 duplicates under 1 cm; aa_walking 3.8, aa_run_to_stop 1.8, aa_crouched_sneaking_left 4.9 cm: kept, Studio only), emitter travel -z / auto, mirror, place, pack titles; mixamoTake mirrorTake / travelHeading; KeyedTravel '-z'; studio.ts glob for clips/mixamo/studio/.
- I9: 108 keyed recipes, all emitted (24 game, 84 studio/), 108 Studio rows, 108 credits rows. 24 gaits fell back to loops (19 duty 0: toe-first / backward contacts, 5 no clean strikes; 4 of them game slots: I9-REPORT "Numbers").
- Left: fix 2 test fails (pistol_strafe planted-foot errs 0; aa_left_turn row cycle 0.017 < 0.2), tsc rerun, CLIPS.md check, I9-REPORT, changes/feature-mixamo-i9.md, final STATE.

I7 + I9 built (2026-10-26, feature/mixamo-i9): see [I9-REPORT.md](I9-REPORT.md).
- Done: I6 merged; mixamoDup (0 of 18 pairs dropped), recipe options (pack, travel -z / auto, mirror, place), 123 dumped, 108 keyed
  clips emitted (24 game slots, 84 Studio only in clips/mixamo/studio/), rows, credits, CLIPS.md, TESTING line, changelog.
  tsc green; 20 vitest files pass (273 + 1 skip); eslint clean. 24 gaits fell back to loops (duty 0 / no strikes), 4 of them game slots.
- Left: checker; laptop e2e-studio, anim-audit; I8 (lazy load, studio/ off the entry chunk); I10 / I13 wiring; I11 channel clips (15).

At the save (2026-10-26, I9 fix round, feature/mixamo-i9 on 438830085):
- Lazy glob: not done (no code changed). Found: the 24 new game-slot modules are named by no game code (mixamo.ts imports
  batch 1 / I4 / I6 by path), so they and clips/mixamo/studio/ can go behind one non-eager glob; batch 1 / I4 / I6 stay eager.
- Merge of origin/feature/mixamo-i6 (ba01d0f7): not started. Polish (stale "5 gaits" line, toe-first pin item in I10 / Left, ~1.9 MB): not done.
- Left: all of the fix round (lazy CAPTURE_CLIPS fill on opening the capture group / Set filter Mixamo or All, test of 108 rows, build entry-chunk grep and size before / after), the i6 merge, polish.

At the save (2026-10-26 ~10:35, I9 fix round, feature/mixamo-i9, head before this commit 7692c5804):
- Done: merged origin/feature/mixamo-i6 ba01d0f7 (32ac667d3; conflicts kept both sides: I4 turn / armIn + I7 options,
  rows for the I4 stance cycles; 7 vitest files 79 pass). Lazy load (d9abca110): `src/anim/studioCapturesLazy.ts` (the 24
  game slots + studio/, one chunk), `studio.ts` eager glob minus those names, `loadStudioCaptures()` once from the
  studio stage and the panel (Loop list refills); tests/studioCapturesLazy.test.ts (108 rows after the fill). tsc green,
  eslint clean, 14 related vitest files 187 pass. Polish (7692c5804): 24 gaits line, toe-first pin window in I10, changelog.
- Left: `npm run build` waiting on heavy.lock (laptop-queue holds it; take --wait 120 running), entry-chunk size before /
  after and the studio/ name grep, I9-REPORT numbers, final STATE line.
