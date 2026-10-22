# Slice 1 check - S1 Gatehouse and car park (checker: Opus, 2026-10-23)

Commit checked: d09b64e8 (head 9b83323e; nothing after d09b64e8 touches the campus files). Read-only: nothing edited but
this report.

## Verdict: PASS

Nothing is broken or unplayable. tsc and the six test files pass. Four things need a lead decision before slice 2. Item 4
(campusOps showing in the op list) is a one-line fix and should land before this merges. Item 2 (no CR1 drop takedown) is
the only design gap.

## Blocking findings
None.

## Recommendations (lead decides)

**1. Objective moved to (19.3, -76): accept.** `Interactables.nearest` (`src/game/interactables.ts:138`) uses a plan
reach of 1.8. A player at the open window stands at x >= 20.45, which is 1.95 m from (18.5, -76): the download could not
start from the verge, and the verge download is the whole point of E2. At (19.3, -76) the gap is 1.15 m. The PC sits on
the desk block (x 18.9-19.8), so it reads correctly. The 4 m download range still covers every route's objective point.
Log it as A6x and change the SPEC value to (19.3, -76). An engine reach override is not worth it.

**2. CR1 drop takedown: cut a soffit hatch in front of the doorman and keep his post.** The engine confirms the builder's
L9. `pickTakedown` (`src/game/takedown.ts:146`) needs line of sight. The `above` kind needs a plan reach <= 2.2 with a
1.1-4.6 m drop. A hang drop needs the guard within `dropReach` 1.0 of the landing point. The solid slab over (-20, -35)
blocks the line of sight, and the lips are 5-6.4 m away.
- **Change** (`campusS1.ts:291`): split the canopy slab into four boxes around a hatch at **x -20.6..-19.4, z -36.4..-35.3**
  (1.2 x 1.1, a lift-out rooflight or drainage hatch, open). Keep the doorman at (-20, -35), yaw PI, leash 5.
- **Takedown from above**: stand on the slab at (-20, 4.4, -36.7). The plan distance is 1.7, the drop 4.4, and the eye
  ray goes through the hatch (at y 4.4 it crosses z -36.16).
- **Drop takedown**: hang from the hatch's north lip (z -35.3). He is 0.6 m from the landing point, inside 1.0.
- **No bypass**: a player who falls through lands at z -35.4..-36.4, in front of him and in his cone, not in the pocket
  behind him by the door. Do not take the hatch north of z -35.3.
- **K1 still holds**: the choke assert only reads the ground storey, the hatch adds no ground route, the leash edge stays
  4 m off the door cell, and cam-walk and the four downlights stay where they are.
- **Tests to add**: a `pickTakedown` unit case for both kinds (`above` from (-20, 4.4, -36.7) and a hang `drop` from the
  north lip), with a line-of-sight ray against `solid`. Add the hatch to the rule-2 and headroom checks. Nothing
  standable is within 4 m: the planters are 7.4 m away.
- **Rejected: post moved to the canopy's east edge.** He would face the CR1 boost point from 3 m, which kills the leg-up.
  The door would also sit at the very edge of his peripheral cone (about 98 degrees).
- **Same fix (CR1 boost lit)**: the boost point (-13.5, -38) is lit by the canopy downlight at (-17, 4.1, -38). It is
  5.4 m away, inside that lamp's radius of 6.5, and 40 degrees off the beam axis, inside its 57-degree cone. It is also
  inside the doorman's peripheral cone (7.2 m, 65 degrees off his facing). The test
  `campusS1.test.ts` "the boost point ... is dark" leaves the canopy group out while its title says those lamps stop
  short. Move the two east downlights to x -18.5 and cut their radius to 4.5, so the "dark east end of the kerb" is dark.

**3. voxelFit 110 x 110 m: a test guard, not a budget.** The limit came in with 7705da07 (2026-10-07, "layer grids sized
by their filled shapes' exact bounds"). There the 2.5 cm prop layer had grown to a 61 m cube and its indirection texture
failed on software GL. The assert exists to catch a loose grid ("the grids hug what they hold"), and 110 was the largest
map at the time. It does not cite a memory or load budget. The voxel world is also off in play: `flags.voxels` is only on
with `?voxels=1` (`src/core/flags.ts:97`). A 154 x 154 m grid that hugs a 140 x 154 m map is not a break. The real
budget is A20 (build + nav + bake <= 2x Warehouse Ops on the laptop). The builder's node numbers sit under it (lamp bake
4.0 s against 9.8 s, moon bake 76 ms against 1071 ms). The nav build and browser load on the laptop are not measured yet,
so that stays open for the slice 3 or laptop run.
- **Do**: keep the edit, but key the limit to the map's own bounds, not to its id: grid area <= (map span + 16 m)^2,
  bunker excepted.

**4. Hide campusOps from the op list: one line.** `src/ui/screens/missionsScreen.ts:42`:
`MAPS.filter((m) => m.modes.includes('sector') && (m.sectors?.length ?? 0) > 0 && m.id !== 'campusOps')`, with the comment
`(sector-redesign) hidden until slice 3 lists it`. `sectorOps()` has no other caller.
- **Keep**: the autostart (`getMap`) and the map checks still see the map. The campusS1 test filters `MAPS`, not
  `sectorOps()`, so it stays valid.
- **Ownership**: missionsScreen.ts is not in the brief's owned files, so the lead grants it.
- **e2e to rerun**: `run-e2e.mjs` maps this file to e2e-sectorops, e2e-menus, e2e-pad and e2e-park, which all look up
  `data-op="warehouseOps"` and are unaffected.

**5. A64 (no more than 6 awake guards on screen): met at exactly 6, no margin.** Worked by hand, with no sampled test
(A64 came after the build).
- **Worst view**: from the north end of the verge, about (21..22, -62..-58), facing west-north-west. #3, #4, #5, #6, #7
  and #8 all fall inside a wedge of about 45 degrees. Cars (1.5) and weldmesh do not break the view.
- **Not in that view**: #1 and #2 are behind the gatehouse walls. #1 is seen only looking east through the reception
  window.
- **#6 is the marginal one**: from (22, -60) the smoking shelter's east panel misses the line by 0.1 m. At (24, -52) on
  the stealth route the panel hides him (5 in view).
- **Other points**: the car park at (6, -74) gives 5, the lane at (10, -62) at most 6 with a wide FOV, the canopy top
  at most 5.
- **Margin for slice 2**: lengthen the smoking shelter's east panel south by 1 m, or add a verge hedge or bin line at
  about (18, -62). Tag #7 `dormant` (allowed: not K, not a pair). Add the A64 sampled-frustum test.

## Other checks
- **K1 choke assert is real.** It blocks the cone cells on the ground storey (`i % nav.cols` is right: `cols` is the
  plan cell count). It asserts more than 50 cells are blocked, that there is no path from the verge to the door, that
  the pocket behind him stays free, and that a path exists again once unblocked. The cone uses `PERCEPTION` (focus 25 m
  at 27.5 degrees, peripheral 12 m at 100 degrees). The nav has no drop links, so roof routes cannot get round it in the
  test. In play, a drop off the canopy's east lip lands inside his cone.
- **Every human armed**: `checkSectorGuards` passes. The kinds and weapons match the SPEC table (officer = pistolSd,
  grunt = rifle). There are no dogs. 8 guards + 3 x 2 reinforcements = 14, under 32.
- **Cameras**: cam-gate and cam-walk are both range 10, with a reason and an aim (6 and 8 m, as in the SPEC). cam-walk
  sweeps 185-225 and hangs at y 3.4, under the soffit. `validateSecurity` is clean. cam-walk's 2 s pause has no data
  field (L16).
- **CR1 solo-proof tests are not vacuous.** The quarter-turn walls are converted to plain boxes, so they are in the set.
  The helper is byte-identical to 7306dce9, and so is its test. The planters (0.7, 1.8 m from the lip) are tested and
  cleared by the reach maths.
  - Exception: `CR1-south` (`campusS1.ts:94`) is degenerate (z0 = z1 = -40 at x -20), so its checks test one point,
    not the edge x -26..-14.
- **Hot paths**: pure map data and a build-time builder. Nothing per frame.
- **Strict TS**: `tsc --noEmit` exits 0.
- **Files**: all in the owned list, except the three map-set tests (rooms, detailPass, voxelFit). That is justified:
  those tests list `MAPS` ids. The commit's STATE.md change is the lead's.

## Tests run
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/campusS1.test.ts tests/soloJumpReach.test.ts tests/rooms.test.ts tests/detailPass.test.ts tests/voxelFit.test.ts tests/sectors.test.ts`:
  6 files, 94 tests pass.
- No e2e and no build, as briefed.

## Polish (not blocking)
1. Model `CR1-south` as a real segment, a (-26, -40) to b (-14, -40). `CoopLip` only holds x-constant lips: give it an
   a / b pair.
2. The pavilion facade (z -34, x -16..4, top 4.4, flush with the canopy) is an untested 4.4 lip with a wall below it.
   The planters' back face is 1.2 m off it, against rule 3's 1.0 (0.2 m of margin). Add it to the lip checks, or move
   the planters 0.5 m south.
3. The rule-2 test has dead code: `x0` and `&& x0 < 1e9` (`campusS1.test.ts`, the rule 2 block).
4. The SPEC contradicts itself: K1 lists "the canopy light cut" as a distraction, but the canopy switch is inside C1.
   Today the only way to cut it is to shoot it, which is fine. The SPEC text needs a fix.
5. The detailPass `ultra <= epic` guard is now skipped for every `detail: false` map but Kestrel. Better: skip it when
   `added.length === 0`.
6. e2e part 6 runs only as `e2e-sectorops:6`. Add `'6'` to `PARTS` in `run-e2e.mjs` when the lead sends it to the laptop.
