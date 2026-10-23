# S34-check - fresh check of A3 the Office Range (7286d6c6) and A4 the Goods Shed (e36d4b51 WIP + 5b787e09)

Date 2026-10-23. Checker: fresh agent (built neither). Read-only on code. Sources: the set docs `sets/a3OfficeRange.md` and
`sets/a4GoodsShed.md` (section 13 over SPEC), `slices/S3.md`, `slices/S4.md`, the set files, their tests and light JSON, the e2e modules,
`docs/level-design.md` 16.10, PLAN "Slices 1-8". CLAUDE.md rule: block only on broken or unplayable work; cosmetic notes are polish.
Mid-check the job lead merged master (42af9795): master's camera-range cut (`CAMERA.rangeMax` 14, `src/config/security.ts:19`;
validator `src/security/data.ts:56`; range falloff in `cameraRate`). The job lead asked for that to be treated as a blocker for each set.

## Tests run
- `npx tsc --noEmit`: exit 0 (before and after the merge).
- `node --check` on `scripts/e2e-ctcourse/a3OfficeRange.mjs` and `a4GoodsShed.mjs`: ok. No e2e run (laptop).
- `npx vitest run tests/ctcourse/a3OfficeRange.test.ts tests/ctcourse/a4GoodsShed.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts`:
  - before the merge: "Test Files 4 passed (4), Tests 119 passed | 1 skipped (120)";
  - after the merge (42af9795): "Test Files 3 failed | 1 passed (4), Tests 6 failed | 113 passed | 1 skipped (120)". Failing:
    `ctcourse.test.ts:102` (validateSecurity: `cam-a3-hall` range 17, `cam-a4-c1..c3` range 18, and `a7-cam2` range 18, not this check's set);
    `a3OfficeRange.test.ts` "the posts reach the camera" (:286 `camR` 14 not 17), "the camera sees the corridor" (:303 x 81 now out of range),
    "no path ... avoids the camera" (:425 seen area 37.3 m2 < 40), "no floor inside the corridor box west of x 94 is hidden" (:440);
    `a4GoodsShed.test.ts` "three cameras ... the data validates" (:914).
- Simulations (scratch, not in the repo): the game's own `inFrame` / `sweepYaw` / `cameraRate` / `stepCamMeter`, bundled with esbuild, over
  every sweep phase, to test solo crossings of A3's camera before and after the range cut.

---

## A3 the Office Range (7286d6c6)

**Verdict: FAIL (one blocker: the camera range cut).** Otherwise the build is sound and complete. Two should-fixes: A3's co-op gate leaks,
and one e2e step will probably fail.

### What was checked and holds
- **Contract.** Everything is inside `SET_BOX`. Ids are prefixed: `A3-*` doors, `a3-*` steps, switches and zones, `cam-a3-hall`, `a3-cleaner`.
  The register sums equal the builder's (14 lamps, 5 doors, 0 anchors). `checkSetPart` is clean. The stub is gone.
- **No lips.** There is no co-op lip. There is a slab ceiling at 3.0 over the whole set. Every block 1.9 m or taller is `noLedge`, and no
  generated grip is above 0.9 m (`a3OfficeRange.test.ts:197-210`).
- **The corridor.**
  - `jamRelay` 17.5 x 3.5, with the recess at 8.75 m (`JAM_HOP` 8.84). The hide spot (88.6, 8.5) is hidden from the lens for a crouched and
    a standing head, and the test has teeth.
  - Both hops fit one window at 1.7 m/s (10.0 m and 9.6 m against 6.5 s). The camera's own jam timeline is 6.5 s blind.
  - The camera: mount 2.8 m, sweep 262-278, aim 8.75, IR (`CAMERA.irLight`). It is the set's budget of 1.
- **Send-back.** `A3_HALL` is run through `hallStep`. A seen runner is sent back, a jammed run is clean, the hold behaves, and the say line is
  69 characters (`:489-545`).
- **Re-added `jammer.test.ts` cases.** All four come back in the set test:
  - the corridor is covered (made stronger by the flood fill);
  - the view stays inside the set (lobbies and offices are not seen, with an open-door tooth);
  - "one jam per runner" (`:256`, but weaker than its name: see should-fix 1);
  - the gate and hall-rule geometry.
- **The cleaner.**
  - Armed `grunt`, not passive.
  - Waits `[5, 0.1, 5, 0.1, 5, 0.1, 0.1]`: the 0.1 s pass-through. The doc's zeros freeze the walker, and the test proves it.
  - Loop 41 s on the walker. Every leg is open floor through the 1.2 m doors.
  - His sight is stopped by the partitions and the shut leaves.
  - Every switch is within 25 m of every loop point.
- **Lights.**
  - Groups 30-34. Every lamp is grouped, `electric` and `destructible` per its row, and `p.groups` equals the plan.
  - Bands: corridor pool 0.83, cut 0.14. Offices read 1.00 and cut 0.14 each. Lobbies 0.61, far desk 0.48, standby 0.14.
  - The group 34 house-lamp exemption in `ctcourse.test.ts:181-183` is the doc's A3-C4.
- **Steps, claim and pass zones.**
  - `a3-in` / `a3-swap` / `a3-lock`: every line is 90 characters or less, ids are 40 or less, there are no dashes, and `validateCourse` passes.
  - Claim: the B zone over the corridor (P1, the odd-set lead, reads A until then).
  - Pass zones: `a3-p-far1` (`any`) and `a3-p-far` (both), each carrying `A3_HALL`.
- **Doors and widths.** Five 1.2 x 2.1 doors, unlocked, each with a lintel, and every swing is clear of the desks. Corridor 3.5 m.
- **16.10 review.**
  - 1 None. 2 The east lobby's south half (z 0-9) has no use yet (doc self-critique 6: lift doors are dressing): polish.
  - 3-6 and 10 None (no ladders, stairs or roofs). 7 Covered by the slab.
  - 8 Every block is a named desk, run, cabinet or partition, and no door swing is blocked.
  - 9, 11 and 12 None. 13 Rows A3-1/2/4-12 (no A3-3 row: a numbering gap only). 14 Yes, a let office floor with lift lobbies.

### Blocker
| # | Where | Failure | Smallest fix |
| --- | --- | --- | --- |
| B1 | `src/world/maps/ctcourseSets/a3OfficeRange.ts:48` (`A3_CAMERA_RANGE = 17`, applied at `:141`) | After the master merge the camera fails `validateSecurity` ("range 17 m outside 4-14 m"). `ctcourse.test.ts:102` and 4 A3 cases fail, so `npm run check` is red. | Set `A3_CAMERA_RANGE = 14`. No geometry has to move. |

**B1 fix, step by step.**
- **Why nothing else moves.** The archway is 17.1 m from the lens, so the west lobby stays out of range. The west post (18.1 m) is still in
  jam reach (`JAMMER.range` 20; the host allows +3). The hall rule is unchanged.
- **Tests to update:**
  - `a3OfficeRange.test.ts:282` and `:286`: 17 -> 14.
  - `:303`: check the corridor from x 84 (`[84, 87, 90, 93]`). West of about x 83 the corridor is now past 14 m.
  - `:425`: lower the seen-area floor from 40 to 30 m2 (measured 37.3).
  - `:437`: change the unseen-in-box bound from `x > x0 + 0.4` to `x > 83.5`.
  - `:466` and `:526`: pass `camR` as `cameraRate`'s new 4th argument. They now default to the 12 m falloff, not the camera's.
- **e2e:**
  - `scripts/e2e-ctcourse/a3OfficeRange.mjs:102`: `range === 17` -> 14.
  - `:33`: move `SEEN` from (84, 10.75) to (87, 10.75). At 12.7 m a still body now fills at 0.22/s, which is about 48 s to stage 2, too
    close to the 90 s waits. At (87, 10.75) it is about 2.6 s.
- **Doc:** in set doc 1.1, 2 and 6, change "range 17" to 14 and "sees x 79.6-96.6" to about 83-94.5.
- **What changes in play.** Simulated over the sweep with the new falloff, an unjammed walker going mouth to east lobby is still sent back
  at every phase (crouch 1.7 / 2.6, jog 3.0, run 4.0). The taught relay, the hide spot and the send-back still work.
  - However, the first ~5 m of the corridor are now barely watched.
  - An unjammed crouched run reaches the recess at every phase (peak 0.89, never stage 2). That folds into should-fix 1.

### Should-fix
| # | Where | Finding | Smallest fix |
| --- | --- | --- | --- |
| 1 | `a3OfficeRange.ts:86, :130-134, :162` (office 3's corridor door); the relay as a whole | **The co-op gate has solo ways past it.** The set is still not finishable by one player: both must stand in the east lobby. But each player can cross alone, so the relay is optional. Details below. | Lock office 3's corridor door: `b.door(..., { height: A3_DOOR_H, locked: true })` at `:162`, or drop the door and the recut. The offices route then exits through office 2's recess door into the hide spot. Then take the relay rule to the job lead or Michael (G2). |
| 2 | `scripts/e2e-ctcourse/a3OfficeRange.mjs:162-166` | **Probable e2e failure.** Step 5 teleports the client out of the lobby before its send-back hold ends. Details below. | Add `await waitSim(3500)` before `moveClient(HIDE...)` at `:166`, as step 3 does at `:133`. |

**Should-fix 1: the solo crossings (simulated, every sweep phase).**
- **Office 3's door.** A lone player taps the jammer on the camera from office 3's doorway (92, 9.0), which has a clear line to the lens.
  Moving breaks the jam, and the 1.5 s reboot is blind. A run at 4 m/s covers the 5.4 m to the east lobby inside the reboot. This escapes at
  40/40 phases, before and after the range cut.
  - Without any jam, a crouched run of 2.15-2.6 m/s escapes at about 50-60% of phases. That rises to 100% with sweep timing, which can be
    read from inside office 3.
  - The test at `:447-486` only pins a 0.6 "investigate" peak for the crouched run, and that is not a send-back.
- **The corridor itself.** A self-jam lets a player creep 2.25 m while jamming, then the 1.5 s reboot sprint covers 6 m: 8.25 m blind.
  - Hop 1 peaks at 0.76 and hop 2 at 0.00, and both escape at every phase.
  - The case "a lone player cannot jam and cross" (`:256`) times the reboot leg at `SILENT_CROUCH` 1.7 m/s, not a sprint.
- **No geometry fix in the set.** At 14 m with the range falloff, no single-camera corridor stops this. Even a one-hop corridor with no hide
  spot is soloable from x 86 onward. A rule decision is needed:
  - send back at stage 1 for the hall;
  - the reboot does not blind the jamming player's own camera;
  - or accept it and record it against G2.

**Should-fix 2: the step 5 timing race.**
- The client is sent back at about T_cap + 3.3 s (1.5 s reboot, then about 1.8 s to fill at MID). It is held "sent back" for
  `HALL_BACK_HOLD` 3 s, until T_cap + 6.3.
- Step 5 teleports it to the hide spot at about T_cap + 6.5 (cooldown 5 s, `waitSim(500)`, `jamOn`), before or just after the hold ends.
- If the hold has not ended, zone `a3-p-far1` keeps the client `HALL_SENT` (`ctDevices.ts:855`, `jammer.ts:425-430`). It is then sent back
  from the east lobby, `a3-far1` never sets, and step 5 fails, or flakes at best.

### Polish
- `a3OfficeRange.mjs:222-237`: the host presses office 1's switch from the east lobby, 18.8 m away (`use` skips reach). Move the host to
  the switch first.
- e2e: `L2-far` (`:90`) and `L3-near` (`:246`) are asserted unlocked on the client page only.
- e2e: the swap jams from 1.4 m under the lens (a 43 degree up-aim). This is unproven; the fallback post is (98.8, 10.75) (doc 10.7).
- The hall box ends at x 97 and the far zone starts at 97.3. The 0.3 m gap is harmless, because the camera cannot see there.
- The offices read 1.00. Trim the panel radius to 3.8 if they look flat (S3).
- The cleaner opening shut doors and his nav through the 1.2 m doors are proven only by e2e step 7 (a wait of up to 90 s).
- Set doc updates from S3 requests 2 and 4: A3-D2's door x, hop 2 at 9.6 m, the lobby downlight, the switch hints.
- The register has no A3-3 row (a numbering gap).

---

## A4 the Goods Shed (e36d4b51 + 5b787e09)

**Verdict: FAIL (one blocker: the camera range cut).** Otherwise the build is sound and complete. Two should-fixes in the e2e: one will
certainly fail, one is a door the route never opens.

### What was checked and holds
- **Contract.** Everything is inside the three set boxes. Ids are prefixed (`A4-passage`, `A4-office`, `a4-*`, `cam-a4-c*`, `g-a4-*`). The
  register sums equal the builder's (20 lamps, 2 doors, 0 anchors), and the greybox is pinned by a checksum.
- **Co-op.** There is no co-op lip and no top in the 3.8-4.5 band.
  - Racking (5.4), the mezzanine block (3.3), the office walls and roof, the stair fillers and the rails (`kit.handrail`, 1.1 m, `noLedge`)
    are all `noLedge`.
  - `soloJumpThreats` is empty on the deck edge and every rack face, and has a teeth case.
  - A4 is co-op by the `a4-west` pass zone (both players) and the optional dual takedown. It has no co-op piece by design (SPEC 12).
- **The console (N3).** 60 s loop, 20 s re-arm, cameras 'looped' on the flag and back after.
  - `REFUSE_CONSOLE_REARM` comes inside the re-arm. A press while it loops does not reset the window. Officer up beats done, which beats
    re-arm.
  - A refused press claims nothing (A4-C9).
- **Guards.** Armed kinds only: `officer` and two `grunt`s, none passive.
  - The officer's two info lines are the doc's and are re-added from the guard-info cases.
  - The approach from L3's door stays outside his 100 degree periphery.
  - D2's 40 s master-clock loop has no wait of 0 (the `loop.leave` clock). The route is open floor through the office door, he stops 5 s at
    the kettle, and the same route without its clock differs.
- **Dual takedown.** The stacks are 0.7 m behind each man. The crouch spots are 1.84 m from him, inside `coverReach` 1.9, and
  `pickTakedown` answers `overCover` (null at the doc's spots).
- **Wicket.** `egress` gate on L4's east door (`L4-near`, built locked). Only the push bar opens it, and the bar is on the floor side.
- **Mezzanine and stairs.** A 3.3 m solid deck with rails on its three open edges. The stairs are 20 x 0.165 / 0.285, solid underneath.
  The deck and the stairs are `metal`.
- **Lights.**
  - Groups 40-43, with no lamp on 49. Every lamp is grouped and `p.groups` equals the plan.
  - Bands: main aisle 0.83, dock 0.68, room 0.92, deck 0.89. Back aisle, mouth, passage and crossing are 0.14 crouched. Every cut is 0.14,
    and standby is 0.14.
- **Cameras.** 3 = the budget, mounts 3.0, IR, `offFlag: 'a4-loop'`.
- **Text and widths.** Steps and lines are 90 characters or less, ids 40 or less. Doors are 1.2 x 2.1. Aisles are 3.05 / 3.5 / 3.5 / 3.75 /
  8.4 m.
- **16.10 review.**
  - 1 None. 2 None (the block under the mezzanine is a closed store).
  - 3, 5, 6 and 10 None.
  - 4 The stairs have no rail on their open south sides: dressing, polish.
  - 7 Covered (the room slab; the passage is under the gallery).
  - 8 Every block is named, and no door is blocked: the push bar sits beside L4's door and the desk is 3.2 m clear of it.
  - 9, 11 and 12 None. 13 Rows A4-1..13. 14 Yes, a port warehouse with a CCTV office and stairs at the mezzanine ends.

### Blocker
| # | Where | Failure | Smallest fix |
| --- | --- | --- | --- |
| B1 | `src/world/maps/ctcourseSets/a4GoodsShed.ts:243` (`range: 18` in the `cam()` helper) | After the master merge all three cameras fail `validateSecurity` ("range 18 m outside 4-14 m"). `ctcourse.test.ts:102` and `a4GoodsShed.test.ts:914` fail. | Set `range: 14`. The aims (11, 12, 8) stay within it. Tighten `a4GoodsShed.test.ts:920` from 18 to 14. In the doc's camera sheet (section 2), C2 no longer reaches the back-aisle crossing (z 25.8 is 17.8 m out) and C1 loses x 93.5-97.5. To keep the crossing watched, re-mount C2 on R2's east run's west end at (98.5, 3.0, 35.6) facing 180 (optional; nothing in the tests or the e2e depends on it). The e2e's C1 spot (100, 39.8) is 11.6 m out, so it still counts. |

### Should-fix
| # | Where | Finding | Smallest fix |
| --- | --- | --- | --- |
| 1 | `scripts/e2e-ctcourse/a4GoodsShed.mjs:77-78, :115, :203` | **Certain e2e failure.** `__ctdev.debug().cams` lists every map camera (`ctDevices.ts:321`, `:328`): A3's 1, A4's 3, A7's 2 and A8's. So `m.length === 3` fails in step 1 (`:115`), `allCams` never holds, and step 3's "never back on" sees A3's online camera (`:203`). | Filter to the set: `cams.filter((c) => c.id.startsWith('cam-a4-'))` in `camModes`, in `allCams` and at `:203`. |
| 2 | `a4GoodsShed.mjs:157, :211` and `:233-238` | The route's passage door (`A4-passage`) is never opened: the players are teleported through it shut. The header (`:19`) says doors are opened by `use` and asserted open. L4's east door is checked unlocked on the client page only. | Before step 4, `use(A, 'door-<A4-passage anchor>')` and assert it open on both pages (the door list). After the bar, also assert `L4-near` unlocked on the host's door list. |

### Polish
- e2e step 2 (`:130`): the host presses the floor switch from L3's pad (about 26 m; `use` skips reach). The lure itself is honest (D1 at
  3.5 m, within 25 m).
- e2e step 3 (`:167`): the officer is made awake with the client 0.8 m in front of him before the knock-out. Knock him out first, or keep
  him passive.
- e2e: the interrogation is not walked; only `info.lines.length === 2` is checked. The unit test covers INTERROGATE.
- e2e: the roles are never swapped. PLAN step 4 asks "host and client roles swapped once where the set has a claim", and the client always
  presses the console.
- D2's real walk through the 1.2 m office door (0.5 m nav cells), the stair nav and the real dual strike are proven only by e2e and
  playtest (S4 open items).
- LD 15 vantage: the back aisle's west end is dark but inside D1's focus cone at 9.7 m. It needs the perception run (S4).
- Docs: A4-C7 numbers, D2's timings and the switch hints (S4 requests).

---

## Out of this check's scope, seen on the way
- `a7-cam2` (`src/world/maps/ctcourseSets/a7DataHall.ts:109`, `range: 18`) also fails the 14 m cap and keeps `ctcourse.test.ts:102` red
  after both fixes above. A7's checker or fix round should set it to 14.
