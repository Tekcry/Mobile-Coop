# Slices 4 + 5 check (fresh checker, Opus brief; review only, nothing edited)

Verdicts: **S4 PASS** (needs the merge-join fixes J1-J4 below, none is a builder error beyond item 1). **S5 FIX** (1 own must-fix, M8 exceptions, plus J1-J4).
Own must-fix count: S4 0 (1 shared e2e line), S5 1 (+ the same shared line). Merge-join must-fixes: 4 (J1-J4).

## Test results (run per worktree, single files)
- S4 `npx tsc --noEmit -p .`: clean. `vitest campusS4 + campusS2 + laserPanels`: 3 files, 96 tests pass.
- S5 `npx tsc --noEmit -p .`: clean. `vitest campusS5 + campusS2 + laserPanels`: 3 files, 85 tests pass.
- Not run (as ordered): e2e, build, full suite. Neither e2e block has ever run.

## S4 - acceptance
Met: 20 guards incl. 1 dog (handler 0), dormant only #10 #11 #16, K3 #19 posted + cone choke test, one pair gate (pg-cage) with solo bypass,
CR4 lips in `campusLips.ts` (+ `CAMPUS_COOP_LIPS` test), desk via `layout.security` 3rd arg (test 1), no pickups in x -10..40 (test),
E2 glass not used (NOC fence fallback), connector far door unchanged (C4 far, ground), start = C3 checkpoint (24,0,8), A64 worst 5 (10922 samples, 0 over 6).
Data read: route obj/climbs indices correct (18 / 14 / 17, climbs 5,9-15), mounts and switches sit on the faces they claim, doors >= 1.2 m apart, nothing blocks the
keypad doors, battery rack gaps, mantrap or flight. No overlapping box blocks a route that I could find.
### S4 must-fix
None of its own. Shared: J1 (e2e line 1612 fails on this branch alone: `S.slice(3).every(guards === 0)` but S4 has 20).
### S4 polish
1. `campusS4Data.ts:78` tanks are 1.6 high, 0.85 m from the 2.8 east wall (L6). A mantle of the tank then a jump could clear the wall. Raise tanks to 2.0 `noLedge` in `campusS4.ts` (`bx(b, tx0, tx1, 0, 1.6, ...)` -> 2.0 + `{ noLedge: true }`), or add an e2e probe.
2. NOC window is `b.fence` (anchor, climbable, 0.2 above basket top 4.4 along x 3.1..7.5 where B-N touches the wall): the high route can vault into the NOC past #14/#15 and reach the desk room. Accept for L10 or close x 3.1..7.5 of the band with solid.
3. High route basket leg passes 0.4 m (plan) over the pg-cage door (L12 only excludes it from the test). Doors are plan-found: confirm nothing offers the gate from the basket.
4. Dock pair (L3): both walkers cross at (24, 19.5) at the same instant every trip (same clock, mirror ends). Brief calls it "staggered" (A89). Suggest `t0` offset on #18 or accept.
5. `lay.boards.length` assertion at `tests/campusS4.test.ts:183` will break at merge (J3).
### S4 L-rulings
L1 yard lane x 35.3 / 34.8: acceptable (brief lane was inside tanks/generator). L2 acceptable (redundant lid). L3 acceptable, M8 passes, crossing is polish 4.
L4 acceptable. L5 acceptable: narrowing the build-out dark test to x 0..13.8 follows the brief's own contradiction (W aisle lamp (-2.5, 3.6, 34) lies inside its box); tell the planner.
L6 open, see polish 1. L7-L9 acceptable. L10 legitimate (see below). L11 acceptable (0.55 m clearance rule c). L12 acceptable with polish 3. L13, L14 acceptable. L15, L16 acceptable (e2e unrun).
### S4 test-count edits
`campusS2.test.ts:156` +8 = exactly the 8 S4 switches (list in `S4_SWITCHES`). `laserPanels.test.ts` 8 -> 9 = las-tray. `campusS2.test.ts:450,460` added `z < 16`: legitimate, B1's 0.4 slabs (top 4.4, x 3.1..4.1) matched S2's CR2 filter that had no z upper bound; S2 sits at z < 6. Narrow and correct. No assertion loosened.

## S5 - acceptance
Met: 24 guards incl. 2 dogs (handlers index 4 and 6), dormant only #1-#3 #15, K4 pair #9/#10 posted (`s5#9`, `s5#10`) with cone + shut pg-leaf test, CR6 pair gate (solo bypass side door),
CR7 test (`ropeRoom`, well flood closed sash, #9 line < 5 m), no leg-up lip, no pickups in S5, sash window open, start = C4 checkpoint (y 0), extract box, no connector, `levels 's5-l1': 4.2`,
A64 worst 6 (10688 samples, 0 over 6; 6 = the limit, at the boathouse roof, outdoors), core test, routes obj/climbs correct (11 / 12 / 24, climbs [11]), doors >= 1.2 m apart.
### S5 must-fix
1. **M8 exceptions beyond the brief** (L8): brief records 4 pairs (#5-#6, #7-#8, #9-#10, #16-#17). Test `tests/campusS5.test.ts:714` exempts 17 of 24 guards (adds #1-#4, #11, #13, #14, #20, #23), so M8 now checks 7 guards. SPEC says do not cut the count for M8.
   Change: either (a) the lead/planner records approval as a BRIEF A-number for #1-#3 (dormant standing group) and #13-#14 (gallery pair sees across the void, inherent to the briefed layout), and S5 gets geometry for #4 (hall walk ends in the control-room group's view), #11 (brief says "alone at the shaft door"; best 2 s), #20 and #23 (open lawn, in range of the terrace patrol / van; try a 2.2 `noLedge` screen box between the spot and the patrol line, unverified); or (b) Michael signs off the whole list. Do not leave it silent.
   Shared: J1 (line 1612).
### S5 polish
1. `S5_ARMOURED` type is narrower than S4's (`kind: 'door'` only, no `y?`): brief says same type. Make both identical when the engine item E10 lands.
2. L11: guards' grid steps over the 0.45 sill, so a guard can path through the open sash into the well. Open engine/nav item; leave in the follow-up list.
3. `S5_CAMERA_FLAGS` uses `boolean`, S4 uses `true`: align at E8.
4. L9: an extra roof point instead of a moved one. Harmless, keep; note S4's L12 solved the same plan-only door issue by excluding roof legs instead.
5. `tests/campusS5.test.ts:210` `expect(lay.boards).toEqual(S5_BOARDS)` breaks at merge (J3).
### S5 L-rulings
L1 (4 flights, not 6): acceptable, the brief was wrong (floors [0, 4.2, 8.4] = 2 storeys). L2 acceptable. L3 acceptable. L4 acceptable. L5, L6 acceptable.
L7 not acceptable alone, it is J1. L8 see must-fix 1. L9 acceptable. L10 acceptable. L11 acceptable, open item. L12-L16 acceptable.
### S5 test-count edits
`campusS2.test.ts:156` +9 = the 9 `S5_SWITCHES`. `laserPanels` 8 -> 9 = las-shaft. Both legitimate, nothing loosened.

## Merge joins (S4 then S5; `git diff 5a8973e6 <branch>` for each; SLICE4.md table confirmed, with the additions marked NEW)
- `src/world/maps/campusSectors.ts`:
  - imports: both lines, S4 then S5.
  - `CAMPUS_POSTS`: `...S4_POSTS, ...S5_POSTS,`.
  - `levels`: S5 only: `{ ground: 0, l1: 4.4, 's3-l1': S3_L1, 's5-l1': 4.2 }`.
  - devices: `...S3_CAMERAS, ...S4_CAMERAS, ...S5_CAMERAS,` then after the closing `],` S4's `desks: [...S4_DESKS],`.
  - `CAMPUS_ALARMS`: `...S3_ALARMS, ...S4_ALARMS, ...S5_ALARMS,`.
  - sector entries: replace both stubs with `S4_SECTOR,` `S5_SECTOR,`.
  - **NEW (J4a)** delete `const stubRoute = ...` (line ~299): both stubs were its last users, `noUnusedLocals` fails the typecheck otherwise.
- `src/world/maps/campusOps.ts`:
  - imports: both, S4 then S5.
  - `otherBuildings`: delete both `shell(...)` lines, keep both comments (S4's and S5's new text) and both `connector(...)` lines.
  - **NEW (J4b)** then delete `shell`, `interface Shell`, `type Gap` and `const PI` (PI is used only inside `shell`); update the `otherBuildings` doc comment ("three other buildings" is stale). Keep `T`, `WALL`, `SLAB`, `GROUND` (used by `connector`).
  - `STUB_NAV_SEEDS`: both deletions: leaves (24, 0, -14), (24, 0, 8), (-18, 0, 29).
  - `build`: `buildCampusS3(b); buildCampusS4(b); buildCampusS5(b);`.
  - layout arrays `S1, S2, S3, S4, S5` (navSeeds: `...S1, ...S2, ...STUB, ...S3, ...S4, ...S5`); `lasers: [...S3_LASERS, ...S4_LASERS, ...S5_LASERS]`, `laserPanels` likewise; `boards: [...S4_BOARDS, ...S5_BOARDS]`.
- `campusLips.ts`: S4 only. No conflict.
- `tests/campusS2.test.ts:156`: `5 + 7 + 9 + 8 + 9`. S4's `z < 16` hunks at 450/460 merge cleanly.
- `tests/laserPanels.test.ts:122-123`: comment "... Saltmarsh Park's four (las-gown, las-store; sector-redesign slice 3; + S4's las-tray, S5's las-shaft)", `toBe(10)`.
- `changes/feature-sector-redesign.md`: keep both appended lines, S4 first.
- `scripts/e2e-sectorops.mjs`: keep `campusS4Part` + its `want(6)` block (S4) then `campusS5Part` + block (S5), before the final `console.log`. Function names and locals do not collide.
- **J1 (line 1612, both branches fail it)**: replace `S.slice(3).every((s) => s.guards === 0)` with `S[3].id === 's4' && S[3].guards === 20 && S[4].id === 's5' && S[4].guards === 24` and the message tail with "section 4 built with 20, section 5 built with 24". (S4 alone: `S[3].guards === 20 && S.slice(4).every(...)`.) S5's L7 flagged it, S4's report missed it.
- **J2 (e2e)**: after the join S5's board is `board-1` (boards = S4, S5). In `campusS5Part` (f) change `x.id === 'board-0'` to `'board-1'` (or find the board by group 84).
- **J3 (unit tests)**: `tests/campusS4.test.ts:183` `lay.boards!.length` toBe(1) -> `lay.boards!.filter((q) => q.groups.includes(75)).length`; `tests/campusS5.test.ts:210` `expect(lay.boards).toEqual(S5_BOARDS)` -> `expect(lay.boards).toContainEqual(S5_BOARDS[0])`.
- Camera total after the join 7 + 3 + 3 = 13 <= `WIRE_CAMERAS` 16. Light groups 70-79 / 80-89 do not collide; the two ambient zones do not overlap; C4 box is shared and untouched.
- After joining, rerun tsc, campusS1-S5, campusRuntimeNav, laserPanels, then the full `npm run check` before any e2e.

## Gaps I could not close
Anything at runtime (both e2e blocks, nav legs on the real grid for S4 high route, CR4 probes, tank / wall jump) is unrun. Sightline and nav results rest on the unit tests, which pass.
