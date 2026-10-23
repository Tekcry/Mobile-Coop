# S567-check - fresh check of A5 the Substation (2109e81f), A6 the Pump House (c87ac9a6), A7 the Data Hall (7b3ddb8b)

Date 2026-10-23. Checker: fresh agent (built none of it). Read-only on code. Branch head 42af9795 (master 4.68.0 merged in).
Sources: the three set docs (section 13 over SPEC), `slices/S5.md`, `S6.md`, `S7.md`, the set files, tests, light json and e2e
modules, `docs/level-design.md` 16.10, PLAN "Slices 1-8", STATE MORNING-REVIEW (the A5 solo laser crossing is already listed for
Michael and is not re-raised here). CLAUDE.md rule: block only on broken or unplayable work; cosmetic notes are polish.

## Tests run
- `npx tsc --noEmit`: exit 0.
- `npx vitest run tests/ctcourse/a5Substation.test.ts tests/ctcourse/a6PumpHouse.test.ts tests/ctcourse/a7DataHall.test.ts
  tests/ctcourse.test.ts tests/ctcourseLight.test.ts`: "Test Files 2 failed | 3 passed (5), Tests 4 failed | 151 passed |
  1 skipped (156)". A5 (44) and A6 (37) green, `ctcourseLight` green. Failing: `a7DataHall.test.ts:451`, `:479`, `:507` and
  `ctcourse.test.ts:102` (camera range cut, A7 blocker 1). `ctcourse.test.ts:102` also lists `cam-a3-hall` (17 m) and
  `cam-a4-c1..c3` (18 m): those are A3 / A4's, not in this check, so the frame stays red until they are cut too.
- `node --check` on `scripts/e2e-ctcourse/a5Substation.mjs`, `a6PumpHouse.mjs`, `a7DataHall.mjs`: ok. No e2e run.
- Each commit touches only its set's files (`git show --stat`); no later change to them after the merge.
- Extra probe (scratchpad, esbuild bundle of `src/security/camera.ts` and the A7 part, nothing written to the repo): `a7-cam2`
  at range 14 (numbers in A7 blocker 1).

---

## A5 the Substation (2109e81f)

**Verdict: PASS.** No blockers, no should-fixes. Polish list below.

### What was checked and holds
- **Co-op only.** No lip in A5 (`part.lips` empty, none on `COOP_LIPS`, no generated ledge at the band). The beams are the gate:
  every beam gap is under a crouched body, the floor jump peaks under the top beam, no grip on the inner wall or header
  (`a5Substation.test.ts:337-352`). `beamThreats` over every solid on the approach side is empty; the drums (a real 1.8 m solo top)
  stand 4.1 m off the line, past `BEAM_KEEP_CLEAR` 4.0, and the check has teeth (SPEC's drum stack, a crate 2 m off and a top under
  the header threaten; one at the keep-clear does not, `:363-370`). Nothing else on the apron stands over 0.3 m. The bunds (1.2 m,
  standable) are all on the far side. The release is 11 m past the line, out of reach with the client's 0.75 m slack (`:409-417`).
  The panel-jam solo crossing (reboot window) is Michael's open item, not re-raised.
- **The mechanism.** `throwGateway` as the doc's call: walls 6 m `noLedge`, header 4.8 `overhead`, laser `laser-a5` 0.35 / 0.9 /
  1.45 with `offFlag a5-release`. The throw from 0.3-1.6 m behind the mark clears the beams, stays under the header and inside the
  gap and lands on the marked landing in the dark pocket and the claim zone; free air over the thrower and head room at the landing
  in the built map (`:372-407`). The far-side release is a shared pickup gate that sets the flag for good and unlocks `L5-near`
  (flag gate: no skip to the pad, `:419-438`). The flood is one group-52 cone, a jam target on a clear line from 27 aiming eyes at
  (60, 36); a jam zeroes its contribution and gives it back; the jammed strip and kiosk read 0.14 / 0.22 and one held jam gives
  about 9 s of dark against B's 5.3 s walk; a jammed flood lures nobody (`:441-533`). `panel-a5` is jammable from (60.5, 35.0) (the
  doc's spot loses some eyes, tested) and `laserLive` is off while jammed and rebooting (6.5 s), the crossing fits (`:535-559`).
- **Rules.** Inside `SET_BOX`, ids `a5-` / `A5-`; 9 lamps on 50-53, every one grouped, `electric` / `destructible` per row; tuned
  bands: pools 0.75 / 0.97, cuts 0.14-0.22, pockets 0.14, reads 0.51-0.68, standby 0.14 (all inside `levels.ts`: pool 0.55, cut
  0.24, pocket 0.22). No cameras. `a5-patrol` is an armed `grunt`, waits [4, 3, 0.1, 3] (no 0), loop 42 s with the teeth case for a
  0 wait. Every block 1.9 m or taller is `noLedge` (the switchroom roof at 4.0 too). Switchroom doors 1.2 x 2.1; gaps round pen 2
  1.85 / about 4 m. Lines 50-62 characters, ids within the limit, no dashes. Claim: the inner zone (the thrown player is B, it
  stands; the host thrown instead swaps the lines). Pass zone `a5-p-in1` (`any`, `floorY` 0) in `externalFlags`.
- **Deviations** (S5): no 6 m set ceiling (as A1 / A2), kiosk box turned, flood moved 0.25 m onto a bracket with a narrower cone,
  lamp positions and radii, switches off the slot / doorway, 0.1 s pass wait, A* round the kiosk, panel jam spot 1.5 m south. All
  sound and each undoable; the shared-file requests are the job lead's.
- **e2e module.** Follows the doc's route on two pages: the start reads both pages (lines, the release item, beams, `L5-near`
  locked, IR beams hidden in normal vision and drawn in night vision, lit / dark levels equal); the throw with real buttons and the
  bunker throw's settle checks, landing within 0.5 m, no beam hit or alarm change, `a5-in1`, ticks and claim on both pages; the
  flood jam (lamp off on both pages, strip <= 0.24 on both within 1 s, no lure); the client's kiosk press 0.6 m from the device;
  beams off and `L5-near` unlocked on both; the host walks the dead line with no hit; the variant after a restart (the reset
  asserted, the panel jam, the client on the beam line with no break, the release holding after the reboot). No set door is walked
  through (the runner handles L5); no lure wait; no hang. Asserts can fail (hits, alarm, levels, flags, ticks).

### Findings
| # | Severity | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| 1 | polish (e2e) | `scripts/e2e-ctcourse/a5Substation.mjs:265-267` | The variant's kiosk press is not gated on the patrol. The strip is lit (no flood jam in the variant), and when he leaves R2 for W (47.0, 34.6) he passes 1.7 m from the press spot. By my count the press lands about 6 s after he leaves the kiosk, about 4 s before he leaves R2. The only damage switched off is the host's, so a sighting under load could down the client. | Before the press, wait for `walker.idx === 1` (he has not left R2). If he has, park the client at the landing and press on the next `leftKiosk`. |
| 2 | polish (e2e) | `a5Substation.mjs:121` | `ownMax > 1.45 \|\| ownMax === 0` passes when no arc sample fell within 0.3 m of the line, so the arc assert can stay silent. The hit / alarm assert at `:124` still bites. | Sample the arc at 1/60 (or interpolate the crossing), and fail on `ownMax === 0`. |
| 3 | polish | `a5Substation.ts:183` with `GEAR` (`:104`) | The back door's leaf (hinge (41.0, 46), 1.2 m) swung 90 degrees into the room lies along x 41.0 down to z 44.8. That overlaps the switchgear run's north end (x 40.3-41.1, to z 45) by 0.2 m. It is a visual clip only: an open leaf has no body. | End the switchgear run at z 44.6, or hinge the door at x 42.2. |
| 4 | polish (playtest) | S5 open item | The apron switch (50) lure paths him through the gateway onto the apron (beams are no nav blocker), so the doc's "he cannot pass the beams' wall" does not hold. No step needs it. | Playtest; or move 50's switch to the inner side (doc self-critique 6). |
| 5 | polish | `src/world/lighting/marlowCircuits.ts` (S5 requests) | `MARLOW_POCKETS` A5 boxes, row 51's fitting text, the switch hints and LIGHTING-PLAN 3 differ from the build. No test reads them. | Job lead folds the S5 requests in. |
| 6 | polish | e2e coverage | Not walked: route 3 (R2 timing), route 4 (trench and switchroom secret, the lured switchroom takedown), the vantage's LD 15 full-cycle concealment at 0.38. | Playtest / later e2e. |

### 16.10 review (A5)
1. Room shape forcing a path: none (the inner wall is a security wall with one cable gateway).
2. Space with no purpose: none (the bund gap is R2's job and a hide spot; the trench path is the secret route).
3. Ladders: none. 4. Stairs: none. 5. Roof access: none (switchroom roof `noLedge`, nothing reaches it). 6. Roof objects: none.
7. Floor or roof not covered: no set ceiling, open to the 10 m hall roof (S5 deviation, as A1 / A2). No holes.
8. Unnamed block / object blocking a door: every block is named. The back-door leaf clips the switchgear (polish 3).
9. Barrier in front of a room: none (the bunds are the transformers' own).
10. Ladder in a floor hole: none. 11. Vents: none.
12. Dead end that needs an invented side entrance: none (the switchroom's back door is the HV two-exit rule, A5-C2).
13. Register rows: A5-1..12; `registerSum` equals the builder's counts.
14. Recognisable: yes (bunded transformers, switchroom with two exits, zone kiosk, cable trench).

---

## A6 the Pump House (c87ac9a6)

**Verdict: PASS.** No blockers, no should-fixes. Polish list below.

### What was checked and holds
- **Co-op only.** The one planned lip is `a6-gallery-lip` (4.4, x 40.8-45.3, normal -z), in `COOP_BAND` and on `COOP_LIPS`.
  `soloJumpThreats` is empty over every solid in the map, with a failing case (a 1.8 m crate 2.5 m off threatens, one at
  `GREY_KEEP_CLEAR` does not). Nothing standable stands in the keep-clear, there is no generated grip over 0.9 m, and the one manual
  ledge (`a6PumpHouse.test.ts:176-222`). The staff stair is the doc's solo "risky up" route onto the gallery, by design. The real
  gate is the drive panel:
  - the cage is closed at body height to the slab except for its locked door (egress from inside only);
  - the plate is 0.55 m, under a body's width;
  - the panel and the exit release are at least `INTERACT_REACH` from every body outside the cage and past `INTERACT_DY` from the
    deck and bridge;
  - the teeth case shows a release by the door would be reachable from his path (`:326-403`);
  - `a6-drive` alone unlocks `L6-near`, and a restart re-locks both (`:405-435`).
- **The cage slack note.** A body against the north / door face is 2.08 m from the panel / exit. That is under the host's 2.15 m
  client slack, so only a forced or modified client press from there is accepted. A real client is never offered either device (the
  e2e asserts it at all four faces). Accepted in STATE. Polish 1.
- **The mechanism.**
  - `hangPlate` as the doc's call: bridge 5 m over a 4.2 m cage, overhang 0.4. The holder's probe on the built map finds the drop
    through the plate (hang point z 64.75, 0.35 m off the cabinet).
  - `hangReaches` the panel at some depth up to `hangDepthMax`, not at the start depth. Panel `hold` 3, `holdNoise` 6. The buzzer
    is heard at the gap and pump 3, not at the desk, W or the gauge board (`noiseSuspicion`, `:437-449`).
  - Rope: `ropeRoom` ok, the foot within `ropeReach`, open air ahead of the holder.
  - Drop-to-cage: the panel and the exit release are in reach from the cage floor.
- **Rules.**
  - Inside `SET_BOX`, ids `a6-` / `A6-`. 8 lamps on 60-63, every one grouped, nothing on the dead 69. Handrail accents on 61.
  - Bands: pools 0.75-0.78, reads 0.52-0.95, cuts 0.14 / 0.19, pockets 0.14, standby 0.14. No cameras.
  - `a6-attendant`: armed `grunt`. Waits are 0.1 at every pass point (none 0), with a teeth case. A pass point W rounds the desk
    (the doc's legs clip it, tested). Loop 42.35 s.
  - Every block 1.9 m or taller is `noLedge`: pump motors at 4.0, the bridge, the screens, the stair fillers (the stair's underside
    is closed, with a teeth case).
  - Pump-2 gap 1.2 m; headroom 4.0 under the bridge. Lines 48-62 characters.
  - Claim: the gallery / bridge zone, `y0` 3.9 (the floor under the bridge claims nothing). Pass zone `a6-p-gal` needs both
    players, `floorY` 4.4.
- **e2e module.** It follows the doc on two pages.
  - The leg-up waits for `attach.phase === 'on'` before the pull-up.
  - The rope runs on real buttons and ticks `a6-gal` on both pages.
  - The hang-down is lowered until the panel is the hanger's nearest item (depth 1.5-2.5 asserted).
  - The buzzer check is real: the client's `holdPulseAt` reaches the host and the meter rises. It waits until he is calm within
    4.5 m.
  - The 3 s hold waits until he is at the desk and asserts he stays calm over 6 m away.
  - The gallery lure wait runs only when he is calm. Every loop point is within 25 m (unit-tested).
  - Pass 2:
    - the restart's resets are asserted;
    - the client is offered neither device at any of the four faces, and its forced presses from the west face (2.47 m) are
      refused;
    - the host claims B, the holder's B drops him, and he lands inside the cage;
    - he holds 3 s from the floor and presses the exit;
    - the cage door is opened by `use(A, 'door-<id>')` and asserted open on both pages.
  - Client presses are within reach. Asserts can fail.

### Findings
| # | Severity | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| 1 | polish (accepted) | `src/net/coopHost.ts` `inUseReach` vs `A6_CAGE` | The 2.08 m vs 2.15 m host slack above: only a forced client press is affected, and play is not. | S6's options: course-device slack under 0.68 m, or a 4.5 m cage (5.3 m bridge). |
| 2 | polish (dressing) | `a6PumpHouse.ts:169-177` (A6-9) | The staff stair (up to 4.4 m) has no rail on its open south side. Doc 1.1 says "handrails both sides"; 16.10 item 4. Today a player can step off the flight. | In dressing, add the visual rail as A2-17 does, plus a thin invisible `noLedge` collision rail along z 70.55 if stepping off should be blocked. |
| 3 | polish (e2e) | `a6PumpHouse.mjs:292-302`, `:312-336` | Pass 2 never waits on the attendant. The client stands 0.35 m off the cage's south face, 0.45 m from his path along z 61.2, about 6-8 s after the restart, while he is at G (6.6 m off, about 77 degrees to his side, at 0.14). The floor hold then buzzes while he may be on the west half. Only the host's damage is off. | Before the four-face loop, `waitAttendant({ minX: 55 }, ...)`, and the same before the drop. Or set the host's remote `damageMul = 0` for the client for the route. |
| 4 | polish (playtest) | S6 open item | The 61 lure targets the switch on the stair top (56.4, 5.6, 71.7). Whether the nav stops him on the floor or walks him up the stair onto the gallery is unverified. | Playtest; a two-way switch at the stair foot is the doc's fallback. |
| 5 | polish | `marlowCircuits.ts`, `ctcourseGreybox.ts` (S6 requests) | `MARLOW_POCKETS` A6 boxes, the switch hints, row 61's fitting text, LIGHTING-PLAN 3, and a `coopDeck` `gaps` option for the bridge junction. | Job lead / 0g. |
| 6 | polish | e2e coverage | Not walked: the relay (route 2), the stair (route 3), the P3 takedown, a full walk down the stair to L6 (teleported), the holder's concealment on the lit bridge (0.52). | Playtest. |

### 16.10 review (A6)
1. Forced path: none. 2. Purposeless space: none (the sump bay is the vantage). 3. Ladders: none.
4. Stair without handrails: the staff stair's open side (polish 2). The bridge has rails on both sides and the south end.
5. Roof access: none. 6. Roof objects: none.
7. Holes: the gland plate, for a real reason (cable gland opening, the hang-down). No ceiling, open to the hall roof.
8. Unnamed blocks: none (pumps, kerb, gauge board, desk, davit, cabinet). Nothing blocks a door.
9. Barrier: the sump's guard kerb (real: the old sump). 10. Ladder in hole: none. 11. Vents: none.
12. Invented side entrance: none (the outfall door is L6's near door, A6-C7).
13. Register rows: A6-1..14; counts equal the builder's. 14. Recognisable: yes (pump row, motor gallery, davit, drive cage, desk).

---

## A7 the Data Hall (7b3ddb8b)

**Verdict: FAIL** on one blocker: master's camera-range cut, with a 4-line fix. PASS once fixed. No should-fixes.

### Blocker
| # | Severity | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| 1 | blocker | `src/world/maps/ctcourseSets/a7DataHall.ts:109` (`A7_CAM2` `range: 18`) | Master 4.68.0 caps camera range at 4-14 m (`config/security.ts:19`, validator `security/data.ts:56`). Effects: `validateSecurity` fails (`ctcourse.test.ts:102`, `a7DataHall.test.ts:451`); `camRange` already clamps cam2 to 14 at runtime; two test geometries assume 18 (`:479` samples (83, 53.9) at 16.6 m; `:507` puts the x 85 lee at 15.95 m inside range). | (1) `a7DataHall.ts:109` `range: 18` -> `range: 14`. (2) `a7DataHall.test.ts:454` `range: 18` -> `range: 14`. (3) `:478` `pts` `[[83, 53.9], ...]` -> `[[86.5, 53.9], [88, 53.9], [94, 53.9]]`. (4) `:507`: assert the range only for the x 93 lee (`< camRange`), and assert the x 85 lee is past it (`> camRange`). That lee is then hidden twice, by its unit and by the cut. Then set doc 1.1 and the section 2 camera row: range 14. |

Why the exercise still works at 14 m (probed with the game's `inFrame`, `sweepYaw`, `camPitch` and `camRange`; `validateSecurity`
is clean at 14, aim 9 <= 14):
- With the axis west, cam2 frames a crouched or standing head from x 86 east (x 85.5 and 83 are out). The whole grating
  (x 86-92) and the pod door are covered; the corridor west of x 86 is unwatched.
- The blind windows at the grating's middle (89, 53.9) are unchanged: 4.10 s and 3.95 s per 17.33 s cycle (the window test's
  3.5-5 s holds).
- The x 93 lee (7.9 m) still hides by occlusion.
- The pod door approach (97.0, 55.1) is first framed 4.55 s after the 220-degree pause starts. The door's open spot
  (98.35, 55.25) is framed at 6.05 s.
- The rate falls off over 14 m, not 18. At the grating (10.6 m) the fill is about 0.43 of full, not 0.65, so A7-C4's marginal hop
  gets easier.
- The jammer line (`JAMMER.range` 20) is unaffected.

The doc's "corridor east of x 81.6" becomes "east of x 86". The e2e needs no change.

### What was checked and holds
- **Co-op only.**
  - No lip, no generated ledge or split, every collidable box `noLedge`. Racks 2.2, units 2.0, lid 2.4-2.5 and pod roof 2.6 are all
    over the mantle.
  - `soloJumpThreats` is empty for the lid's four edges and every mesh top, with teeth: a 1.2 m crate in the front aisle threatens
    the lid (`:313-332`).
  - Six fence anchors are locked by `anchorLock` gates on `a7-never`. Nothing sets it (pass zones, scanners, pickups, pairs and
    consoles are checked), and the anchors stay locked after `a7-pod` / `a7-sync`.
  - The kick band stops a body.
  - `scanStart` refuses one player on both terminals. No free floor point reaches both. T2 is reachable only in the pod (or cage),
    T1 only in the hall.
  - The pod is reached only by its south door or through the cage. `L7-near` and both cage doors open only on `a7-sync` (the pass
    zone alone opens nothing).
- **The mechanism.**
  - `sc-a7` on `a7-t1` / `a7-t2` sets `a7-sync`. The terminals are 10.1 m apart, strictly over `syncMinGap('scan')` 4.6 (the
    helper throws at the gap).
  - Device y 0, so the ready lamps hang in the mesh band. Each is seen from the other hack spot through the mesh, never through the
    kick band.
  - Sync at 0.5 s apart opens. At 2.0 s apart it fails the late player and resets both.
  - C2: cam1 (range 12) frames the front aisle's north mouth and the north apron, but not T1's spot; only the short aim keeps T1
    out (teeth).
  - The units' west lees hide a standing or crouched head from cam2. T2 and the pod are behind the corridor wall. The jam lines
    pass the mesh and are stopped by the kick band.
- **Rules.**
  - Inside `SET_BOX`, ids `a7-` / `A7-`. 15 lamps on 70-73, every one grouped; 70 has 7 against the plan's 6 (the lobby panel,
    A7-D4; the test asserts +1).
  - Bands: T1 pool 0.67, reads 0.48-0.90, cuts 0.14, standby 0.14.
  - Two cameras, within the A7 budget of 2. Both IR (layout data, G240). cam2's range is blocker 1.
  - `a7-tech`: armed `grunt`, waits [5, 0.1, 3, 0.1, 0.1], loop 35-41 s, teeth for a 0 wait. The 71 lure is in range from every
    loop point, and R1 is out of both cameras.
  - Doors 1.2 x 2.1 and 5 m or more apart. Aisles 3.0 m, corridor 3.4 m (2.55 m beside the units). Lines 33-73 characters.
  - Claim: the corridor box (P2 in first is B; the host in first is B; the first claim stands). Pass zone `a7-p-pod` (`any`,
    `floorY` 0). Split steps `a7-split` / `a7-sync` / `a7-lock`.
- **e2e module.** It follows the doc on two pages.
  - The start reads both pages: lines, terminals, `sc-a7` idle, the technician armed, both cameras, both cage doors and `L7-near`
    locked on host and client, the open doors never locked, levels equal.
  - The claim swap and restart come first, then the split.
  - The corridor runs lee to lee on cam2's real yaw and clock. The pod door opens in the 220-degree window. `cam2` stage 0 and no
    alarm change are asserted.
  - The hall door is opened on his R0 leg, and T1 is taken once he is west of x 83 behind row 1.
  - The ready glows change colour on both pages.
  - The fail check: the client starts on its own frame that sees T1 ready and loses 9-10 HP, no flag, both terminals idle.
  - The sync: the client starts at 0.5-1.5 s; both terminals are done on both pages, at no HP cost.
  - Every door (plant, pod, hall, both cage doors) is opened by `use(P, 'door-<id>')` with the player next to it, and asserted
    open on both pages before anyone moves through. The pod door's timing has margin at 14 m (above).
  - No lure wait, no hang. Asserts can fail.

### Findings (after the blocker)
| # | Severity | Where | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| 2 | polish | `a7DataHall.test.ts:472` | The C2 teeth case passes range 18 straight to `inFrame` (past the new cap). It still holds at 14, since T1 is 10.2 m away. | Pass `14` (or `camRange({ aim: 10.2, range: 14 })`). |
| 3 | polish (playtest) | S7 open item; `a7DataHall.mjs:159-214` | Walking up the west cross aisle (about t 15-17) he looks across aisle B's mouth at T1 (7.85 m, lit 0.67, 90 degrees to his right). In the e2e the host stands at T1 through steps 5-6 with the hall door left open, and no tech-calm assert. A periphery sighting would not fail the run, but it would in play. | Playtest; the S7 fallback is a short screen at aisle B's west end or T1 0.5 m north. |
| 4 | polish | `a7DataHall.ts:156` (A7-11) | The riser block (x 70.25-76.15, z 65.85-71.75) is a 6 x 6 m solid with no object behind it. It is named (16.10 item 8) but large. | Dressing: read it as a services riser / stair core (a door skin, signage). |
| 5 | polish | `marlowCircuits.ts` (S7 requests) | Group 70 `lamps` 6 -> 7, the switch hints, 71's `lure.from`. | Job lead. |
| 6 | polish | e2e coverage | Not walked: route 2 (cam1 jam-hop), route 3 (71 lure / R1 takedown), route 4 (loud grating), the corridor at walking pace (teleport legs between lees), the mesh climb refusal (anchor lock proven as data only). | Playtest. |

### 16.10 review (A7)
1. Forced path: none (the lobby's two doors are the split's start; the corridor is straight).
2. Purposeless space: the closed riser block (polish 4). Otherwise none.
3-6. Ladders, stairs, roof access, roof objects: none (the slab covers the hall; the pod roof and lid are unreachable).
7. Uncovered floor or roof: none. 8. Unnamed block / object blocking a door: none (the units, switches and racks are clear of every
door). 9. Barrier: none. 10-11. Ladder in hole, vents: none.
12. Invented side entrance: none (the corridor ends at the pod's real end door, A7-9).
13. Register rows: A7-1..11; counts equal the builder's (15 / 36 / 5 / 6). 14. Recognisable: yes (lobby, rack hall, colocation
cage, containment pod, plant corridor with CRAC units and a trench grating).
