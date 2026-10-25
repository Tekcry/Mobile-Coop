# campus-greybox S1 lane - build report (G1-G6)

Lane S1, branch `feature/campus-greybox-s1` (cut at 024c7c172, after V2-SEED), built from `docs/campus-greybox/briefs/S1.md`.
Cloud builder: unit tests only (`npm run typecheck:fast`, single vitest files with `--maxWorkers=2`). Every e2e, GPU,
level-measure and screenshot leg is "pending PC run" (listed per slice).

Tag sources as in the brief: D = `S1-detail.md` @7c021f01, SVG = `S1-plan-0.svg`, GR = plan graph, SY = `SYNC.md`, B =
`campusS1.ts` on origin/master, SEC = `campusSectors.ts` on origin/master, SS / LD = scale sheet / level-design @6c3f4a87.

**SS / LD check (every slice).** Every SS line the brief cites (16, 18, 34, 35, 40, 42, 46, 49, 51, 52, 60, 69, 70, 97,
147-149, 153) was read at 6c3f4a87 and found by content on origin/master with the same value. LD:60 (cycles 25-45 s) moved
on master to scale sheet section 10 ("Patrol cycle | 25 - 45 s", same value); LD:158 (co-op lip 4.3-4.5 over the 3.8 solo
reach) is master LD 11.8 / `sizes.coop_lip` 4.3-4.5 (same); LD:397 "Roofs are fully covered" is master LD 16.5.1 (same).
No value changed: nothing to ask.

## G1 Perimeter (D:304)

**Files:** `src/world/maps/campusV2/s1.ts`, `s1Data.ts`, `tests/campusV2S1.test.ts` (new),
`docs/sector-redesign/graph/v2/campusOps-S1.json`, `changes/feature-campus-greybox-s1.md` (new), this report.
`s1Dress.ts` unchanged (the build dresses as is).

**Step 0, the light block.** `S1_V2_COPY = false` (s1Data.ts:186). `S1_LIGHTS` (s1Data.ts:21-36) with the PROVISIONAL /
TODO(light-realism) header (s1Data.ts:11-12), today's values exactly: columnsW / columnsE (B:147-148), column pillar 6.0 /
0.15, lamp y 6.0 r 12 i 0.9 SODIUM cone (0,-1,0,1.15) w 0.6 on parkW / parkE (B:231-238); bollards x list (B:150) z -45.5,
post 0.9 / 0.08, y 0.85 r 4.5 i 0.5 SODIUM w 0.2 on fore (B:267-270); canopy four points (B:152) y 4.1 r 4.5 i 0.85 WHITE
cone (0,-1,0,1.0) w 0.5 on canopy (B:292); dock (-33, 2.7, -40.4) r 5 i 0.8 WHITE cone (0,-0.8,-0.6,1.0) w 0.4 on fore
(B:314); laneFlood (9, 6.0, -66) r 12 i 0.8 SODIUM cone (0,-1,0,1.15) w 0.6, pole 6.0 / 0.15 on lane (B:221-222); gate
(17, 2.9, -76) r 5.5 i 0.9 WHITE w 0.6 on gate (B:214). `SODIUM` / `WHITE` exported from the block (s1Data.ts:15-16).
The types `S1Lights`, `S1Lamp`, `S1LampRow` and `s1Lamps(L)` (the block as single fittings, the tests' source) are in
s1.ts:150-208. `S1_PARTS.build = (b) => buildCampusS1(b, S1_LIGHTS)` (s1Data.ts:163, A23). `PARK_COLUMNS_W/E`,
`BOLLARD_XS`, `CANOPY_LAMPS` in s1.ts are re-exports of the block's lists (s1.ts:147, from s1Data.ts:38-41). Every lamp,
column pillar, the lane pole and the bollard posts are drawn from `L` (s1.ts:211-227 `lamp`; gate :281, lane :288-289,
columns :297-303, bollards :332-336, canopy :358, dock :380).

**Geometry built (s1.ts:238-256).** The seven `b.fence` calls are gone (B:183-189). Palisade boxes, STEEL, collide, noLedge
(one `b.mark(f0, { noLedge: true })` at :256): south x -40..8 (:242), gate leaf x 8..14 (:243, A1), x 14..23.4 (:244),
re-hung cut panel x 23.4..24.6 (:245), x 24.6..26 (:246); east x 26 z -80..-34 (:247); west x -40 z -80..-40 (:248);
north-east z -34 x 4..26 (:249). Screens 2.4 (:252-255): gatehouse roof south edge (16.75, 4.5, -79) 6.5 x 0.1; plant roof
west edge (-40, 5.6, -37) 0.1 x 6; pavilion west end (-40, 5.6, -32) 0.1 x 4; pavilion east end (3.7, 5.6, -32) 0.1 x 4. The
1.1 west parapet (B:306) is deleted (s1.ts:372 comment). The bin store west wall (B:241) is deleted (s1.ts:306 comment); its
N and E walls stay for G4. Numbers: D:38-49, SVG:465-492 (as the brief).

**Lights, devices, guards, lips:** unchanged. Sync nodes built in G1: none (no device moved).

**Dress:** no change. The three bin skins still find their boxes; `campusOps.build` (dressed) runs in every v2 test.
`S1_OMITTED` unchanged.

**Graph:** `graph/v2/campusOps-S1.json` was already byte-equal to `git show 7c021f01:.../plan/campusOps-S1.json` (V2-SEED
copied 9eb7b9c6, same bytes), so the replace was a no-op. Notes: `s1-verge` and `s1-lane` "PLAN (...)" -> "BUILT G1
(s1.ts:238-256; ...)". `syncs` untouched.

**Tests** (`tests/campusV2S1.test.ts`, 7): S1 is v2 on; G1 nav flood (seed (24,-79), the shut C1 near door as a blocker,
frame [-46,-86,32,-26]: every walkable cell in x -40..26, z -80..-30); palisade closed and anti-climb (8 boxes, 2.4 high,
0.1 thick, noLedge, south line x -40..26 with no gap, no fence anchor in S1); roof screens (4, noLedge; no parapet at x
-39.85); out of reach; bin store west wall gone; S1_LIGHTS is the one source (every lit S1 registry lamp matches a block
entry by position, reach, intensity, group; 29 lit, as-built intensities per circuit). Run with the slice set:
`campusV2S1`, `campusS1`, `campusS1Dress`, `campusRuntimeNav`, `campusV2`: **5 files, 83 passed, 0 failed**. Typecheck and
eslint on the owned files clean.

**Deviations.**
- D-G1-1 "G1 out of reach" is asserted as: each palisade / screen piece is noLedge, thinner than the body (0.1 < 2 x
  `MOVEMENT.radius` 0.6), never a take-off in either helper, and carries no generated lip. The helpers' landing test
  (`soloTopLandingThreats`) reads only a target's plan box, not its depth, so run with a 0.1 m palisade as the "top" it
  lists any 1.2 box near it; that raw list is printed under `CAMPUS_PRINT` instead of asserted (see finding F1).
- D-G1-2 The S1 dead bike-shelter fitting (B:254-255) stays dead in G1 (its colour is now a literal; G3 replaces it with
  the lit `S1_LIGHTS.bikes`). The "29 lit" count excludes it.

**Findings for the lead.**
- F1 The raw landing list for the west palisade (x -40) names the three as-built bins (1.2 high, 1.06 m and 2.66 m off it).
  G4's bins (A12) stand closer still (x -39.95..-38.55, against the palisade). A player cannot stand on a 0.1 m top, so this
  is not a hole on the greybox numbers, but if the PC walk shows the capsule perching on the palisade from a bin, the bins
  move 0.6 m east (a lead call, not taken).

**Pending PC runs (G1).** e2e-sectorops:1..6 (`E2E_GPU=1`, default flags: proves v2 stays dark); no GPU / visual leg.

## G2 Gatehouse (D:305)

**Status.** Built and green. The first push (8e622ee4b) stopped on one assert (B-G2-1, below); the lead answered "add it"
and the finishing commit adds the mirrored noLedge point (A27-cloud).

**B-G2-1 and its fix (deviation D-G2-1, assumption A27-cloud).** The brief says the east strip's south lip "is cut by the G1
screen". It is not: the screen is a 0.1 box at z -79 (z -79.05..-78.95), 0.1 m inside the slab's south edge z -79.15, so the
generator kept the lip `(19, 3.3, -79.15) -> (20.15, 3.3, -79.15)` hangable. Fix: `b.noLedge(19.575, -79.15, 0.4)` (s1.ts:285),
the mirror of the north-end call. **A27-cloud:** the south end of the east roof strip is suppressed by a noLedge point because
the z -79 screen sits 0.1 inside the slab edge. Undo: move the screen to z -79.15, or drop the point.

**Geometry built (s1.ts:260-302; replaces B:192-214).** Walls 3.0 / T 0.3 / WALL: S `wallX(-79, 13.5, 20)` (:264), N
`wallX(-72.5, 13.5, 20, [[16.4, 17.6], [18.6, 19.8]])` (:265), W `wallZ(13.5, -79, -72.5, [[-76.6, -75.4]])` (:266), E
`wallZ(20, -79, -72.5, [[-76.6, -75.4], [-74.4, -73.2]])` (:267); door head (17, -72.5) (:268). Four panes, each a 0.9 sill
and a 2.1..3.0 head (:270-273): reception W (13.5, -76), E2 (20, -76), fixed rear (20, -73.8), north (19.2, -72.5, along x).
Roof slab y 3.15 h 0.3 overhead (:274-282): west (15.575, -75.75) 4.45 x 6.8, middle south (18.4, -78.775) 1.2 x 0.75,
middle north (18.4, -74.775) 1.2 x 4.85, all with the walls / sills / heads noLedge (`b.mark(g0)` :279); the east strip
(19.575, -75.75) 1.15 x 6.8 not noLedge (:281); `b.noLedge(19.575, -72.35, 0.4)` (:283), `b.noLedge(19.575, -79.15, 0.4)`
(:285, A27-cloud), `b.noLedge(18.4, -77.8, 0.7)` (:286). The hatch x 17.8..19.0, z -78.4..-77.2 is open (A3). Condenser `box(20.4, 1.6, -78.4, 0.5, 0.8, 0.9)` not noLedge
(:288, A4). Door `b.door(16.4, 0, -72.5, 1.2, PI / 2, { swing: -1 })` (:289). Windows (:290-295): reception closed
breakable, E2 open breakable, fixed rear and north closed not breakable (A2). CCTV desk `block(18.8, -73.0, 1.6, 0.75, 0.7)`
(:297, A5); PC desk and kettle counter unchanged (:298-299). Lamps: the tube `L.gate` lit (:301), the desk lamp
`L.deskLamp` (:302). Numbers: D:60-73, SVG:472-482 (as the brief).

**Lights.** `S1_LIGHTS.deskLamp` (s1Data.ts:37): (18.6, 1.2, -73.4) r 2.5 i 0.9 SODIUM group gate w 0.2 (D:67; A6).
`S1Lights.deskLamp` added (s1.ts:194-195) and to `s1Lamps`. Lit S1 lamps: 30. Measured (analytic, unoccluded, as the v1
test): the PC desk (19.35, 0.9, -76) reads 0.792 lit, 0.140 with the gate circuit cut (under `LIGHT.shadow` 0.28).

**Devices.** `S1_DOORS.gatehouse = [17, -72.5]` (s1.ts:38); the gate switch (15.7, 0, -72.8) yaw PI (s1.ts:131).

**Data (s1Data.ts).** `S1_DESKS` desk-gate (:113, D:73, SY:9). `S1_ALARMS` (15.0, -72.8) (:116, D:61). Guards: #1 (:57)
officer post (14.6, -76) yaw -PI/2, takedown (15.1, -76) (A7); #2 (:60) desk (18.3, -73.6) 28 s, kettle (18.4, -77.65) 5 s
(A8), operator 1; #9 (:101, index 8) officer (15.2, -73.6) 20 s -> (17, -71.6) 5 s, faces [0, -PI/2], role desk. Cycles:
#2 41.7 s, #9 30.8 s (the test formula).

**Sync-node src lines (for the lead's SYNC.md / graph `syncs[].src`).** `sync-s1-gate-desk`: the desk entry
`src/world/maps/campusV2/s1Data.ts:113` (`S1_DESKS` desk-gate, at [18.8, -73.2], cameras cam-gate / cam-walk, operator 1 =
#2 at :60). Ids and device positions match SYNC.md 7c021f01 (SY:9).

**Dress (s1Dress.ts).** `H1:gateDesk` skin -> `bx(18.8, 0.375, -73.0)`; `H1:keyCabinet` z -73.15 -> -72.65; `H1:visitorBoard`
x 14.15 -> 13.65; `H1:monitorBank` z -73.15 -> -72.65. **New refusal:** the kit refuses `H1:monitorBank` at (18.8, -72.65)
by rule V (its back spans the new fixed north pane x 18.6..19.8: no wall behind it). Added to `S1_OMITTED` with rule 'V'
(s1Dress.ts:136). PC desk and kettle skins unchanged. Lead call: move the bank west on the N wall (e.g. x 17.9) if the
monitors should show (not done: a new coordinate).

**Graph.** `s1-gatehouse` note "PLAN (C2)" -> "BUILT G2 (s1.ts:260-302; C2)"; `s1-gateroof` -> "BUILT G2 (s1.ts:274-286;
C2)". Targets untouched.

**Tests** (`tests/campusV2S1.test.ts`, 15: G1 7 + G2 8). G2: box / door / corner distances; glazing band; roof east lip and
hatch (passes with A27-cloud); SE climb; light (tube + desk lamp, cut reading); desk-gate + `checkSectors` [] + DESK_POST_RADIUS;
alarm and switch; #1 / #2 / #9 on nav and cycles. The G1 light test now asserts lit = the block's lamp count (30 after
G2) and the block's as-built intensities. Slice set (`campusV2S1`, `campusS1`, `campusS1Dress`, `campusRuntimeNav`,
`campusV2`): **91 tests, 91 passed**. Typecheck and eslint clean.

**Findings for the lead.**
- F2 The G2 condenser (top 2.0, (20.4, -78.4), z -78.85..-77.95) stands 1.1 m from the south palisade (z -80, top 2.4).
  The helpers' raw landing list has a running jump off it reaching the palisade top (lands up to 3.6 m). The palisade is
  too thin to stand on, but a jump off a 2.0 m top may clear a 2.4 m fence 1.1 m away and land outside S1 (the ring road).
  Not measurable in a unit test; PC walk item. A fix would move the condenser north (e.g. z -77.6) or raise the palisade
  by the gatehouse (lead call).
- F3 #2's desk stop (18.3, -73.6) is in the 0.5 m nav cell centred z -73.75, 0.4 m off the desk face, as A5 says.

**Pending PC runs (G2).** e2e-sectorops:1..6 (`E2E_GPU=1`, default flags).
