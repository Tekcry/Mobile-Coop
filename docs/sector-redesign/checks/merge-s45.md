# S4 + S5 + E8 join (branch `feature/sector-redesign-s45`)

Fix round and integrator after `checks/slice45-check.md` (4d009c4b). Base `feature/sector-redesign-m` (57a1dbc6, then its
de19debd merge-m fix merged in so PR 2 carries it). `feature/sector-redesign`, `-m` and the lead worktree are untouched.

## S5 fix (checker must-fix 1), `feature/sector-redesign-s5` 9dd3ab4b
M8 exceptions are back to the brief's four pairs (#5-#6, #7-#8, #9-#10, #16-#17). The test asserts that the other 16 guards
hold 3 s at their takedown spots. The guard count is unchanged (24). No extra L-exception was needed. Details are in
`slice5-build.md` L17:
- Control room: the 0.75 table is replaced by three rack rows (2.2 noLedge, x -56..-51.6, z 21.0 / 23.8 / 26.9) with an
  aisle by the east wall. #1-#3 each stand in their own bay. #4's hall walk starts in the north bay (-53, 28.4). The stage-1
  response route starts in the aisle (-50.8, 26.0).
- Gallery: a 2.2 noLedge screen at each arm's south end (x -47.4..-47.1 and -40.9..-40.6, z 18..21.6). #14's spot is now
  his south stop (-39.5, 19.1).
- #11: the third stop is in the vestibule (-39.0, 34.0), spot (-39.0, 34.3).
- #20: walks from the terrace gate to between the boathouse and the deck (-48.1, 62.2) and back, spot (-48.1, 62.6). This
  also frees #23.
- M8 (s): #1 180, #2 180, #3 24.25, #4 8.5, #11 7.25, #12 10.75, #13 7.25, #14 7.25, #15 21.5, #18 6, #19 180, #20 8.5,
  #21 4, #22 18.5, #23 19, #24 5.5.
- A64 is unchanged (worst 6, 0 over 6).

## Join order and resolutions
1. `origin/feature/sector-redesign-e8` (9fbd18c2): one conflict in `securitySystem.ts`. Both fields are kept: master's
   `onBody` (guard-ai S7) and E8's `onRicochet`.
2. `-s4` (ebbd5789): `changes/feature-sector-redesign.md` keeps both lines (the ammo line, then S4).
3. `-s5` (9dd3ab4b), joined per the SLICE4 merge table and the checker's join notes:
   - `campusSectors.ts`: S4 then S5 for the imports, posts, cameras, alarms and sector entries. `levels` has
     `'s5-l1': 4.2`. `desks: [...S4_DESKS]` is kept.
   - `campusOps.ts`: S4 then S5 for the imports, `build` and every layout array; `boards: [...S4_BOARDS, ...S5_BOARDS]`;
     the remaining `STUB_NAV_SEEDS` are (24, 0, -14), (24, 0, 8) and (-18, 0, 29).
   - `tests/campusS2.test.ts`: switches `5 + 7 + 9 + 8 + 9`.
   - `tests/laserPanels.test.ts`: 10 bands (+ las-tray, las-shaft).
   - `changes`: S4 line, then S5 line.
   - `scripts/e2e-sectorops.mjs`: rebuilt from the -s4 side plus S5's inserted block, so `campusS4Part` and its `want(6)`
     come first, then `campusS5Part` and its block, then the final log. `node --check` passes.
4. `origin/feature/sector-redesign-m` again (de19debd, the lights-out / S2 downlight fix): merged clean.

## J1-J4 and E8
- J1: the e2e part-6 boot assert now checks the real section counts (s1 8, s2 12, s3 16, s4 20, s5 24) and 13 cameras
  (S1 2, S2 3, S3 2, S4 3, S5 3).
- J2: `campusS5Part` (f) uses `board-1` (boards = S4, S5).
- J3: `campusS4.test.ts` counts and nav-checks only the group-75 board. `campusS5.test.ts` uses
  `toContainEqual(S5_BOARDS[0])`.
- J4: `stubRoute` is removed from `campusSectors.ts`. `shell`, `Shell`, `Gap` and `PI` are removed from `campusOps.ts`.
  The `otherBuildings`, sectors and map doc comments are updated.
- E8: every S4 camera has `bulletproof: true`. Every S5 camera has `bulletproof: true, thermal: true`. `S4_CAMERA_FLAGS`
  and `S5_CAMERA_FLAGS` are deleted, and their tests now assert the flags on the devices. The new "campus armour ramp"
  test (`securityCameraE8.test.ts`) checks: 3 S4 and 3 S5 cameras, all bulletproof, S5 all thermal, 13 cameras on the map.
- guard-ai posts (master): untouched. `S4_POSTS` / `S5_POSTS` stay in `CAMPUS_POSTS`. It compiles.

## Checks (no full vitest, build or e2e here: the lead runs them on the GPU lane)
- `npx tsc --noEmit -p .`: clean. `npm run lint`: 0 errors (41 warnings, all in `docs/**` scripts).
- vitest, the 30 files matching campus / sector / security / laser / isolator / keypad / pair / desk / noAmmo / enemyLights:
  467 tests pass. No file matches "mapCheck".
- S5 worktree (before the join): `campusS5.test.ts` 29/29.

## What the e2e run must watch
- Part 6 boot (J1): the 13-camera count assumes `__ctdev.debug().cams` lists every map camera (it listed 7 before).
- `campusS3Part` (e): the messages still say "the S4 stub loads". The check (index 3, id s4, phase objective) is still
  valid; only the text is stale.
- `campusS4Part` and `campusS5Part` have never run. S5 (f) depends on `board-1`.
- S5 runtime: #20 now walks into the extract box (x -50..-40, z 60..66) at his far stop. The e2e freezes the AI, but in
  play the jetty is guarded.
- S5 runtime: the rack aisle (1.3 m) and the response route through it. The runtime-nav unit test passes, but the
  stage-1 deploy is unrun.
- The S5 gallery screens and control-room racks change A64 and light only inside S5 (unit A64 unchanged). The lamp
  bake is not seen on the GPU yet.
- Open from the check (unchanged): S4 polish 1-4, S5 polish 1, 2 (L11 window nav) and 4.
