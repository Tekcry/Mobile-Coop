# mixamo-retarget I7 (rest) + I9 - report
Owner: Player Build. Status: current. (2026-10-26, feature/mixamo-i9; plan: [BATCH2-PLAN.md](BATCH2-PLAN.md) I7, I9.)

## Built
- Merged origin/feature/mixamo-i6 (cccb7b45: MIXAMO_LOCO, credits, I6 report) into the branch (9f5847d04); fix round:
  its new head ba01d0f7 (I4: recipe `turn` / `armIn`, stance trims) merged too (32ac667d3), both sides' options and rows kept.
- I7: `scripts/mocap/mixamoDup.mjs` (duplicate check, `dupOf` / `dupCm` in the manifest; the emitter skips a `dupOf`
  clip); recipe options in `mixamoEmit.mjs`: pack files (`pack-rifle/walk forward.fbx`, row title "Pro Rifle Pack: walk
  forward"), travel `-z` and `auto`, `mirror`, `place` 'game' | 'studio'; `mixamoTake.mjs` `mirrorTake` and
  `travelHeading` (nearest axis, diagonals over 22.5 deg and arcs over 20 deg flagged); `emit.mjs` travel axis `-z`;
  `KeyedTravel` gains `'-z'` (`keyed.ts`, a type only: nothing reads `travel` at runtime).
- I9: the 123 new files dumped (Blender, heavy.lock, about 2 min); 108 keyed recipes (the plan's 123 less its 15 channel
  clips, which wait for I11), all emitted: 24 game-slot modules in `src/anim/clips/mixamo/`, 84 Anim Studio only
  modules in `src/anim/clips/mixamo/studio/`.
  108 rows in the `mocapSources.ts` keyed block, 108 rows in `docs/art-credits.md`, CLIPS.md regenerated, one TESTING line.
- Every one of the 108 is in the Anim Studio's motion-capture list ("Motion capture (Mixamo): rifle walk forward").

## Numbers
- Dumped 123 / 123 (161 dumps in all with the 38 copied from the m4 worktree). Take self-check 123 OK, direction check
  under 8 deg on all.
- Leg scale (Wren / take) per pack, from CLIPS.md: root files 0.993; pack-pistol 0.993; pack-rifle 0.993; pack-shooter
  0.993; pack-action-adventure 0.993. Every pack is on the same 65-bone body (leg 0.788 m) as batch 1.
- Duplicates (start roots aligned, max joint distance, 1 cm rule): 18 pairs, 0 dropped. Near misses, kept as Studio
  only for Michael to judge: aa_run_to_stop 1.8 cm, aa_walking 3.8 cm, aa_crouched_sneaking_left 4.9 cm (same length
  and travel as the root takes: very likely the same capture re-exported). The others are other takes (47-352 cm).
- Travel auto: the pistol strafes resolve to -x (`pistol_strafe`) and +x (`pistol_strafe_2`); shooter strafes +x /
  -x; the 16 rifle diagonals at 44-46 deg are flagged `diagonal` (played on the nearest axis: Studio only); the arcs
  measure 4-22 deg of turn between halves, only `pistol_walk_backward_arc_2` over 20 deg (flagged).
- Gait cycles that fell back to loops (planner steps, no clip feet; flagged in CLIPS.md): 24. Cause: no pinned ankle
  window (duty 0: the backward and some left-side cycles land toe first, so the heel is past `PIN_PITCH` at contact),
  19 of them; 5 more have no clean strikes. Game-slot ones among them: `pistol_walk_backward`, `pistol_strafe`,
  `rifle_walk_backward`, `rifle_walk_left`.
- `aa_left_turn` / `aa_right_turn` do not turn the hips (0 deg of yaw): emitted as one-shots by progress, not turns.

## Lazy load (fix round: the checker found ~1.9 MB of new clips in the entry chunk)
- The 108 new modules (the 24 game slots, which no game code names yet, and `studio/`) are one lazy chunk:
  `src/anim/studioCapturesLazy.ts` globs them; `studio.ts` reaches it only through one `import()`
  (`loadStudioCaptures`, once) and its own eager glob leaves out the same names. Batch 1, I4 and I6 stay eager.
- The load starts when the Anim Studio opens (`studioStage.ts` constructor, and the panel's `sync` on show); when it
  lands the motion-capture group refills in table order (entries already listed keep their objects) and the Loop list
  rebuilds its options. All 108 rows show once loaded. The frame loop never runs it (`studioEntry` is unchanged).
- `npm run build` (heavy.lock): entry chunk `index-*.js` 4,064.17 kB (gzip 1,382.45 kB) after;
  `studioCapturesLazy-*.js` 1,422.51 kB (gzip 531.39 kB). Before (438830085) the same code sat in the entry chunk: about
  5,487 kB (gzip ~1,914 kB), derived as entry + lazy chunk (not built separately). Grep of the entry chunk:
  `name:"mocap_aa_idle"`, `name:"mocap_rifle_jump_up"`, `name:"mocap_pistol_idle"` 0 (each 1 in the lazy chunk);
  `name:"mocap_walking"` 1. Clip modules in the entry 50 (12 CMU + 38 Mixamo), in the lazy chunk 108. The names still
  occur once in the entry as `mocapSources.ts` row keys (title, take, cycle: no clip data).

## Per clip: game slot or Anim Studio only
Game slot (24, `place` game; wired later, not in this slice):
- I10 drawn set, pistol: pistol_idle, pistol_walk, pistol_run, pistol_walk_backward, pistol_strafe, pistol_strafe_2.
- I10 drawn set, rifle: rifle_idle, rifle_idle_aiming, rifle_walk_forward, rifle_run_forward, rifle_sprint_forward,
  rifle_walk_backward, rifle_walk_left, rifle_walk_right, rifle_walk_crouching_forward; optional turns
  rifle_turn_90_left / _right, rifle_crouching_turn_90_left / _right.
- I13 wall set: aa_left_cover_sneak, aa_right_cover_sneak, cover_idle, stand_cover_to_look, crouch_look_around_corner.
Anim Studio only (84, `place` studio):
- pack-pistol (14): run backward, the 8 arcs, kneeling idle, stand to kneel, kneel to stand, jump, jump 2.
- pack-rifle (36): idle crouching (+ aiming), the diagonals and crouched / run / sprint directions, run and sprint
  backward, jump up / loop / down, the 6 deaths.
- pack-shooter (15): all (the rifle pack fills the drawn slots).
- pack-action-adventure (17 keyed): stand to cover (2), cover to stand (2), idle 1-5, jumping up, walking, running,
  left / right turn, run to stop, crouched sneaking left / right.
- singles (2): looking_around (guard search candidate), taking_cover_idle (drawn wall pose stays procedural).
Channel clips (15, not emitted here: I11): vault_over_box, box_jump, stand_to_roll, climbing_a_rope, climbing_up_wall,
grenade_throw, reloading, pistol_aim, falling_to_landing, rifle_pull_out, rifle_put_away, drawing_gun, aa_falling_idle,
aa_hard_landing, aa_falling_to_roll.

## Tests
- `npm run typecheck:fast` green. Vitest: mixamoDriver, mixamoEmit, mixamoTake, mocapSources, mixamoLoco, mixamoMap,
  mixamoChannels, mixamoStance 97 pass + 1 skip; animStudio, animStudio2, guardTune, marlowT1a, mixamoTraverse,
  nowPlaying, tunerEffect, tunerLayout, tunerMouse, tunerReach, tunerReachProbe, mixamoSwitch 176 pass. eslint clean.
- New checks: dup pairing and `dupOf` on synthetic takes; `mirrorTake` (twice = identity) and `travelHeading` (axes,
  diagonal, arc, facing reversed); recipe options refused with their reasons; `rowTitle` / `modulePath`; every module in
  its `place` folder; a backward cycle's planted feet fall back along -z and its row backs on the treadmill; every pack
  clip's credits title cell starts with its pack name and names the file; a Studio-only module's "Used by" says so.
- Fix round: `npm run typecheck:fast` green; tests/studioCapturesLazy.test.ts (new: none of the 108 before the fill, all
  108 in table order after it, the eager / lazy sets split the folder, no src file names a lazy module); animStudio's
  capture-group test awaits the fill. 14 files (studioCapturesLazy, animStudio, animStudio2, guardTune, marlowT1a,
  mixamoTraverse, nowPlaying, tunerEffect, tunerLayout, tunerMouse, tunerReach, tunerReachProbe, mocapSources,
  mixamoEmit) 187 pass; after the i6 merge mixamoEmit, mixamoTake, mocapSources, mixamoLoco, mixamoStance, mixamoDriver,
  mixamoSwitch 79 pass + 1 skip. eslint clean on the touched files.

## Not done / left
- No in-game wiring: the game slots wait for I10 / I13. The default source (CMU) is unchanged: nothing in `animGraph` /
  `mixamo.ts` reads the new modules. When I10 / I13 import a game slot, they take its name out of the lazy patterns
  (`studioCapturesLazy.ts` and the negated list in `studio.ts`) or load it through I8's `ensureMixamo`;
  tests/studioCapturesLazy.test.ts fails while a src file names a lazy module.
- Bundle: done in the fix round (above). I8's game-capture loader (`ensureMixamo`, batch 1 off the entry) is still open.
- The 4 game-slot gaits that fell back need a backward / toe-first pin window in `emit.mjs` (I10, before wiring), or
  stay on the planner's steps.
- Laptop: e2e-studio, anim-audit (no e2e on the desktop).
