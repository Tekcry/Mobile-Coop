# A7 cabinet: fresh check (marlow-a7-cabinet)

Verdict: **PASS**. Branch `feature/marlow-a7-cabinet`, commit 4aa56900 on origin/master 33fff449. Nothing edited, committed or run beyond tsc and single vitest files.

## Must-fix
None.

## Should-fix
None.

## Findings by item
1. Sight lines. `A7_CABINET` (x 90.4-91.6, z 60.2-63.7, h 1.75) is one solid `noLedge` box in the built level. The new tests take it from `b.boxes` (the built collision, the file's own `blockers` segment-vs-box over `solid`; the mesh is no box, as the engine's sight mask passes `b.fence`). They cover R0, the route's points 1 and 4, aisle B (x 78.5 to T1's spot, 0.25 m steps) and the front aisle (z 57.4-65.7), with 9 feet (T2's spot +/- 0.3 m) x 4 body heights: 0 open lines with the cabinet, and the teeth case shows R0 sees chest and head without it and that the cabinet alone stops them (`blockers` = [cab]). Without the cabinet the main test throws (`cab` undefined) as well.
   Heights against src/ai: eye `EYE_STAND` (1.55, `perception.ts:68`) x grunt scale (`Enemy.eye`, `enemy.ts:687`): the test uses the same constant and scale. Body samples as `Enemy.updateSight` takes them for a player target: chest `aimPoint` (remote player 1.3, `remotePlayer.ts`; test 1.35), head `headPoint` (1.6 standing; test 1.6 and 1.7), hips = head height x `EXPOSE_HIPS` 0.52 (0.83; test 0.85). The 0.02-0.05 m differences are harmless: every line is eye (<= 1.74 m even at the largest allowed guard height) down to a lower point, so it crosses the cabinet below 1.75 and the sample set cannot pass what the real ones fail. Hand check of aisle C's far end (84.4, 65.7) to the +0.3 corner foot still enters the box (north face), crossing at about 1.64 m. Not a must-fix.
   The test's `blockers` is a hand slab clip, not Havok's `ray`, but it is the file's existing helper over the built boxes, and `losClear`'s slack (0.2-0.35 m) cannot matter because the cabinet is 5 m from the target.
2. Lamps. The existing lamp-line case (eye 1.6, both lamps, no box) still passes. The new case pins that the state lamp (1.95) clears the cabinet by 1.7 cm and the ready lamp by 16 cm from the real standing eye (`PlayerController.eyeHeight` 1.6). Thin but real and pinned. Crouched eyes already lose the line to the own-side kick panel. Crossing door to door at z 64.5: clear for a 0.3 m body and with 0.3 m spare; the e2e step 7 `moveHost` targets (85.2, 63.3), (87.0, 64.5), (95.2, 63.3), (97.2, 64.5), (99.0, 59.4) are unblocked and 0.6 m or more off the cabinet (checked against `scripts/e2e-ctcourse/a7DataHall.mjs` lines 265-271, same coordinates). Nav: `runtimeNav` grid: cabinet cell blocked, a path (88, 61) to (94.5, 61) exists round its north end, every A7 seed, both hack spots and R0 walkable. The moved seed (91, 64.8) is on the crossing strip; the old seed (91, 63) was inside the box.
3. Light. `tests/ctcourseLight.test.ts` and the A7 light cases pass with the unchanged `a7DataHall.light.json`. No other light json or baked file references the A7 boxes (grep). The box is above `CANON_MIN_THICK` so it is in the canonical shapes; the builder's `CTLIGHT_PRINT` measurement (16 spots unchanged to two decimals) is consistent with the passing tests. No regen needed.
4. Test edits. Derived only: `GREY.boxes` 46 to 47, `solids` 36 to 37, checksum, one test title, imports. Nothing loosened; one describe added (6 cases).
5. Docs. Set doc cage row and "What he sees" updated; slice report complete and matches the code; `changes/feature-marlow-a7-cabinet.md` follows `changes/README.md` (title line, `kind: patch`, `- ` bullet wrapped with indent, file name = branch with `/` as `-`).

## Open item: T2 visible from the cage's north apron
Real but it does not break the set as designed. The technician's route (`A7_TECH_ROUTE`: R0, south turn, west cross aisle, aisle C's west end, aisle C's east end at x 84.4) never leaves x <= 84.4 or z >= 66 (north apron is z 67-71, x 84-96, the blind side of `a7-cam1`'s frame and the "high-risk" route's player area). Lures send him to (76.5, 56.3), the hall door (75.8, 60.4) or the plant door, none near the apron. Only a searching or alerted technician off his loop could see T2 from there; that is the case the set doc's design already treats as a failed run. Optional follow-up if wanted: a second cabinet or panel on the north face (not needed for `e2e-ctcourse:4`).

## Polish list
- Dress the cabinet (rack-prop skin, vents) in a visual pass (builder's item).
- Add 1.3 m (the remote player's real chest) to the body samples in the test to match `remotePlayer.aimPoint` exactly; the 1.35 stand-in is conservative-equivalent.
- State-lamp margin over the cabinet is 1.7 cm: a playtest question "is the state lamp readable from a standing hacker?" (the ready lamp has 16 cm). A 1.70 m cabinet would give more margin (state lamp 1.81 vs 1.77 clearance) if the 1.75 m height was only chosen for the 1.667 m guard crossing; the test would show whether guard lines stay blocked.
- Commit trailer says "Claude Opus 5.5"; this session's attribution reminder says "Claude Sonnet 5.5". Cosmetic.

## Commands and counts
- `npx tsc --noEmit -p tsconfig.json`: clean (no output, 35 s).
- `npx vitest run tests/ctcourse/a7DataHall.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`: 4 files passed, 111 passed, 1 skipped (the light print case).
- Extra single-file runs (one invocation, 11 files): `tests/ctcourse/facility.test.ts`, `ctcourseGreybox`, `cameraReach`, `camSpaces`, `courseMarks`, `lampGridLossless`, `detailPass`, `guardInfo`, `jammer`, `scanners`, `marlowWalkS10`: 11 passed, 173 passed. `voxelFit` was named in the command but ran no file, so no result for it (A7's own lid-thickness case in the A7 file covers the cabinet's voxel-friendly 5 cm grid dimensions: 1.2, 3.5, 1.75 are all multiples of 0.05).
- No e2e run: `e2e-ctcourse` part 4 on the laptop queue with guard-ai S23 is the real confirmation.
