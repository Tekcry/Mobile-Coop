# Task: Saltmarsh Park - a five-section Sector Ops raid on a corporate research campus

Spec writer, 2026-10-23 (overnight; Michael asleep: assumptions are BRIEF A1-A22, no questions). Shape: the map-spec
template, section by section. For Michael's morning review (M4) with PLAN.md and the first greybox.

Authority: BRIEF M1-M10 > DECISIONS > bible > `docs/level-design.md` (LS) > this spec. Inputs: `research/CT-LEVELS.md`
(CT rules R1-R10), `research/CONCEPT.md` (the campus), `research/ENGINE.md` (engine facts EF1-EF10 = its section 0,
gaps G1-G25 = its section 6), R2-PATHS.md (pair bolt), R2-JUMP.md (`soloTopLandingReach`), the lighting proposal
(`docs/lighting-review/PROPOSAL.md` on origin/feature/marlow-final, items LR1-LR12), `docs/warehouse-redesign/SPEC.md`.
Frame: x west to east, z south to north (+z north), y up, metres; yaw 0 = +z; camera `facing` in degrees, 0 = +z.
ENGINE.md gaps are written EG1-EG25; DECISIONS items "DEC G155"; engine work items EW1..; guard-ai items GA1..

---

## Context (fill)
Night Shift (repo Tekcry/Mobile-Coop). Branch `feature/sector-redesign` (cut from sector-fixes-r2 + master 4.63.1).
Goal: a new Sector Ops map, `campusOps` ("Saltmarsh Park"): the research campus of Orrin Systems on the estuary edge,
five buildings joined by quiet connectors, raided at 02:00 on key-ceremony night for a prototype relay controller, its
build logs and the signing key. Security ramps building by building, every guard is armed and has a job, every device
protects something, the site is lit like a real one and the players make their own dark. Solo or co-op (DEC G185);
co-op gets extra routes, solo always completes. It follows LS in full with the "Applied loosenings" (A23-A45).

## Scope (template fixed section - deviation applied, A45)
The template says "existing systems only". M1 cannot be met that way (armed dogs' handlers, keypads, light sync,
pair gates, camera cut): the engine items are listed in "Engine work needed", each sized, owned and with a fallback,
and built in PLAN slice 0 / slice L / slices E. Guard **behaviour** (hearing, bodies, light investigations, posted
guards, radio, squads, reinforcement tactics) is owned by the guard-ai job ("guard-ai provides"); this job owns map
data and `sectorMode` (placement, archetype per guard, dog allowance, post / zone / squad / reason tags, restart
resets, camera cap). Enemy tuning tables never change for this map. Other maps: no changes (Warehouse: M11 "Keep both", stays listed).

## Originality (fixed)
Original design. Do not copy `warehouse*.ts` layouts, coordinates, room ids, colours, set pieces or guard routes; the
Warehouse files may be read only for API patterns (`warehouseOps.ts` shell + per-section builder + sector data).
Names are original (G6): Orrin Systems, Saltmarsh Park, Larchmont Guarding, Tidewater, Hollowmere (story.md).

## Rules for working (fixed, with the job's changes)
Template rules 1-10 hold, except: the phases are PLAN.md's greybox slices (M4); the progress log is
`docs/sector-redesign/STATE.md`; spec change requests go to STATE "Open". Confirm every named file, field and constant
by grep before use; if one differs, record it in STATE and use the real one.

---

## Map structure decision
**One map, `campusOps`, five `SectorDef` sections, all five buildings' geometry built once.**
- Why: sections are pure data in `SectorDef[]` and only one is live at a time (EF1): guards, cameras, lasers, panels
  and alarms load per section, the `ConnectorMachine` seals the connector behind the players and makes it the
  checkpoint. Per-section maps would need a mid-run map swap (collision, nav, light bake, co-op resync: a new L-size
  system that does not exist). A single static collision body, one nav grid and one bake are what the engine does now.
- Cost: about 140 x 154 m bounds (x -70..70, z -84..70) against the Warehouse's 48 x 44 (about 10x the area). Nav is a
  0.5 m grid over the bounds (`navBuild.ts`), `navLayers` 5 for S2's four storeys: about 86k columns x 5. Light bake and
  load time grow with area and lamp count (EG25).
- Guard: slice 1 builds all five building shells as greybox boxes (walls, slabs, roofs only) plus S1 in full, and
  measures build time, nav build time, bake time and memory on the laptop GPU. Budget (A20): load < 2x the Warehouse
  Ops load on the same machine. Fallback if it fails: per-section chunk loading (Engine work EW-L1, L) or the compact
  campus (buildings moved together; connectors shortened to 6-10 m), whichever is cheaper.
- Map id `campusOps` is new: a new stars record; `src/main.ts:151` hardcodes `warehouseOps` for the menu stars (A8).

## Building brief (fill)
- Type and era: a 1990s-2010s corporate research campus (Saltmarsh Park, Orrin Systems), plus the 1960s founding house.
- Purpose: Orrin designs industrial control electronics; its Tidewater relay controllers are the failover units Halcyon
  Grid Services bought (story.md section 5). Guarding: Larchmont Guarding (officers pistols, patrol crew rifles).
- Tonight: quarterly key-ceremony night. Two keyholders have the Old House strongroom open, security doubled there; a
  courier is due at 03:00 with replacement drives for the data hall. That is why the campus is busy at 02:00.
- Site (plan below): ring road on the south edge (z -84, map edge), staff car park and gatehouse, HQ offices round an
  atrium, lab block east, data hall north, the Old House north-west by the lake, boathouse jetty on the north shore.
- Construction: steel frame and curtain wall (S2-S4), brick (S5). Storeys: S2 G 0 / L1 4.4 / L2 8.4 / roof 12.3; S3
  G 0 / L1 4.5, test hall 9.0 clear; S4 hall 7.0 clear, plant deck 7.3; S5 G 0 / L1 4.2 / lead roof 8.4. Doors 1.0 x
  2.1 (double 1.8), corridors 1.8-2.4, fire stairs 2.6 x 5.6 cores (`maps/stairs.ts` sizing), walls 0.3 external /
  0.15 partitions. Max 5 walkable surfaces per column (S2), elsewhere 3.
- Palette and light: night, clear, light wind off the marsh. Lit like a working site at night (LR1 applied, A33; see
  "Lighting rules" below). Grade cool sodium outside, neutral LED inside, warm tungsten in the Old House.

```
 z  70 +-- marsh fence ------------[EXTRACT boathouse jetty x -50..-40, z 60..66]--------- lake edge ----+
 z  48 |   +===== S5 OLD HOUSE =====+          +================ S4 DATA HALL ================+       |
       |   | x -66..-26 z 18..48    |<== C4 ===| x -10..40 z 16..48                            |       |
 z  18 |   +------------------------+ colonnade+======================^========================+       |
       |                            x -26..-10, z 26..32             C3 dock link x 20..28, z 0..16    |
 z   6 |      +====== S2 HQ ATRIUM ======+                  +========== S3 LABS ==========+             |
       |      | x -44..4  z -30..6        |==== C2 (L1) ===>| x 10..64  z -30..0            |             |
 z -30 |      +============^==============+ bridge x 4..10  +===============================+             |
       |                   C1 staff entrance vestibule x -24..-16, z -34..-30                           |
 z -34 |  +=========== S1 GATEHOUSE, STAFF CAR PARK, FORECOURT  x -40..26  z -80..-34 ==========+       |
 z -84 +--[gate x 8..14, gatehouse x 14..20]------------ ring road (map edge) --------------------------+
     x -70        -40           -10   0    10          30           50          70
```

| Sec | Building | Footprint (m) | Storeys / heights | In by | Out by (seals behind) | Guards | Est. min |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Gatehouse, staff car park, forecourt | 66 x 46 | 1; gatehouse roof 3.3; canopy and plant roof 4.4 | Verge, SE | C1 vestibule (badge door) | 8 | 6 |
| S2 | HQ offices round an atrium | 48 x 36 | G 4.4, L1 4.0, L2 3.9, roof 12.3; atrium 13.2 | C1 | C2 glazed bridge on L1 | 12 | 7 |
| S3 | Lab block | 54 x 30 | G 4.5, L1 4.5; test hall 9.0 clear | C2 | C3 dock link | 16 | 8 |
| S4 | Data hall, plant deck, generator yard | 50 x 32 | hall 7.0; NOC mezz 3.6; deck 7.3 | C3 | C4 colonnade | 20 (1 dog) | 9 |
| S5 | Old House | 40 x 30 | G 4.2, L1 4.2, roof 8.4 + 1.1 parapet | C4 | Extract at the jetty | 24 (2 dogs) | 10 |

Run: 40 min of sections + 4 connectors (~1 min each) = ~44 min careful co-op; ~30 min for a practised pair (M7).

## Stealth verbs found in the building (fill)
| Verb | Real element |
| --- | --- |
| Split jump | S4 cable riser (1.6 m shaft between riser wall and UPS room wall, 7.0 tall); S5 light-well corner |
| Horizontal pipe | S3 test hall chilled-water main at 5.6 along the south wall; S4 hot-aisle cable tray (pipe anchor) |
| Lip hang / shimmy / gap jump | S2 L1 balcony slab nose (planter gap); S3 escape gallery; S5 parapet and chimney ledges |
| Wall jump | S1 bin-store corner (3.0 wall); S5 walled-garden buttress (2.8) |
| Ladders, drainpipes | Caged plant ladders (S1 delivery yard, S3 crane walkway, S4 riser); S5 cast-iron downpipes on the service wing |
| Ducts and vents | S2 ceiling void over the L1 open-plan (0.9 m, maintenance hatch at the comms room); S4 return-air plenum |
| Rappel / rope | S5 roof parapet to the terrace (rappel); S5 light well (two-person rope) |
| Fence | S1 inner weldmesh fence and bin-store fence; S4 generator compound fence |
| Doors, windows | Staff doors everywhere; gatehouse rear window; S5 sash windows; S4 mantrap (two interlocked doors) |
| Cover, hide spots | Parked cars, planters, desks, lockers, server pods, stacks; hide spots in stores and plant rooms |
| Not used | Lifts (EW: none; shafts only), roller doors (static dressing, EG19), roof hatches (EG18), zipline |

---

## Campus-wide rules (bind every section; checked per slice)

**Co-op-only reach (LS 11.3-11.5, R2-JUMP, CONCEPT section 4).** Every co-op lip is listed in an exported
`CAMPUS_COOP_LIPS` constant and passes, in unit tests (`soloJumpThreats`, `soloTopLandingThreats` from
`tests/helpers/soloJumpReach.ts`, taken from origin/feature/sector-fixes-r2-jump 7306dce9) and in e2e probes:
1. Lip at 4.3-4.5 m over the floor it is boosted from (solo `WALL_JUMP.maxUp` 3.8 + 0.5; `TEAM.boostMax` 4.5).
2. Nothing solo-standable at 1.2 m or higher within 4.0 m in plan of the lip (a running jump + fall grab catches a 4.4
   lip from a 1.18 m top; +0.5 margin on the helper's reach).
3. No solo-standable surface 0.6-1.7 m within 1.0 m of a wall below the lip; prefer no wall below the lip at all.
4. No solo top within `soloTopLandingReach` + 0.5 m of the co-op top (a 4.0 top lands on a 4.4 top across 3.10 m).
5. **Headroom:** a 4.4 lip has clear air to ~6.2-6.3 (`climbRoom`: top + 0.1 to + 1.8, 0.45 + `HANG.out` inside).
6. Boxes 1.9-4.2 m that are not planned routes are `noLedge`; `noLedge` does not stop the 1.8 mantle.
7. Every co-op top is also reachable solo by a longer or riskier route, or drops out to a solo surface (LS 11.4:
   revive and leave alone). The co-op **pathway** is co-op-only; the surface is not ("LD A2": co-op-only from the
   floor it starts on).
8. Each co-op route names its solo bypass to the same pinch point (LS 3.3) and is the better trade (shorter, safer, an
   overwatch or a takedown from above), never the only way.

**Team doors.** Pair gates (two key switches, both within a window) and pair bolts (R2-PATHS design 2: the bolt draws
only while the partner pushes the leaf on the near side, within 1.5 m) are the only door-type co-op gates. A plain
`SectorBolt` is not used (EG11: one player alone unbolts it).

**Cameras (M1, R4).** Range 8-12 m, set per camera with `range` and an `aim` floor point on its protected door, aisle or
terminal; the cone ends at the zone's far wall. The fill falloff over the camera's own range is the camera-range job's
cut (EG2, `feature/camera-range`); this map sets the data only. Cameras see in the dark (DEC G240): beaten by the
jammer, a route round, shooting them, or (EW10) the security desk. Total 13 > the 12-per-map cap (EG1, slice 0).

**Lasers (R5).** Raise an alarm stage, never kill; each has one power panel (jam it to cut the bands), visible from
the near side, with a reason. Drawn in night vision only (engine fact): every laser fixture is a visible emitter box.

**Lighting rules (M9; LR1-LR12 applied, A33-A44).** Working areas are lit with a visible fitting, a circuit (`group`) and a
switch or board where a real one would be (LS 5.1, 16.8.1). Encounter spaces use a standby fill under the shadow
line, `ambientZone` 0.14 (LR7 applied, A10 / A39), so a cut circuit is true
dark for picture, meter and guards. Outdoors: moon + sodium columns; transit spaces and connectors 0.30. Dark only
where nobody works, each dark pocket named with its reason. "Breakers" and "boards" are real boards since EW8 (A11):
guards relight cut breakers and boards (guard-ai S15, LR16-4); timed isolators stay the player's. A light cut draws the
nearest calm armed guard within 25 m (engine `lightsOut`); the S2 reception panel is the one untimed board (lure #1). **Co-op light parity needs slice L (protocol 31)** before any co-op playtest
that cuts a light (EF7).

**Guards (M1, M8, R6-R8).** All humans armed: officer (pistolSd), grunt (rifle), enforcer (pistolSd + shield). (Michael
2026-10-23 ~10:10 item 3, guard-ai's validateGuardAi: no enforcer in any section guard list; shields come only with
guard-ai's alarm response teams. The tables' enforcer rows place an officer, S5's standing team grunts.) No
runner, heavy, sniper or droneOp (A3, A12; droneOp is not mirrored in co-op). Dogs are melee animals at a handler's
heel (A2). Every guard has an employer (Larchmont), a job, a reason at each stop, a cycle of 25-45 s with stops 3-6 s,
an isolation moment (LS 4.4: spot and second, written in the slice's guard sheet) and an overlap partner (LS 4.5).
Data tags per guard (our data, guard-ai reads them): `post | zone | squad | reason`. Counts 8 / 12 / 16 / 20 / 24 with
`perStage` 2 and `alarmMax` 3: S5 peaks at 24 + 6 = 30 <= `SECTOR.maxAlive` 32 and `MAX_ENEMIES` 32 (EF2). Dogs count.
Perf (guard-cap #180, A64): render-bound, ~4-6 visible awake guards fit 60 Hz at Epic. Counts stay; no more than 6
awake guards on screen at once from any player position (layout breaks the view); far guards tagged `dormant: true`
(never a K choke guard, a mid-cycle pair or a handler). Guard-render (Character Build) provides LOD and dormancy.

**Interactions (R7).** Built today: shouts (8 m), radio call-ins, a shared last known position, body discovery and KO
revival, door shutting, lights-out investigation. From guard-ai (dependencies, not our slices): GA1 squads and radio
checks in Sector Ops (a missed partner is searched for), GA2 talking pairs with bark exchanges, GA3 posted guards that
hold but can be distracted, GA4 light investigations by 1-2 guards (and relighting if it lands), GA5 staggered radio
alerts, GA6 aggressive reinforcements with flank / cover / report. Until GA2 lands, a talking pair is two guards whose
`PatrolRoute.loop` master clocks meet at one point and `faces` turn them to each other (A16).

**Escalation (DEC G125, never ends the run).** Today: stage 1-3 (camera / laser / panel), each stage spawns `perStage`
2 alerted guards at the section's `reinforce` points, carried across connectors. Reinforcement kinds: grunt / officer
(slice 0, no heavies); S5 stage reinforcements are grunts (shields come only with guard-ai's response teams). Per-section extras below are EW9
(lockdown, lights to full, the response team's deploy route); fallback: stage reinforcements only.

**Observation (R8, LS 3.1).** Each space opens on a two-person vantage out of every guard's view for the whole cycle,
from which every guard there is seen within one cycle. Vantages are dark or occluded (A23); those
that rely on occlusion are marked (A23).

---

## The route

### S1 - Gatehouse, staff car park and forecourt (8 guards, ~6 min, tension 2: lights + cameras)
**Footprint** x -40..26, z -80..-34 (66 x 46), ground only. Perimeter: weldmesh 2.4 (`fence`) on z -80 (gate x 8..14)
and x -40 / x 26; the HQ south facade (z -30) and the lab block's west flank close the north.

**Rooms and spaces** (greybox boxes; the slice 1 build sheet fixes the exact values):
| Id | Space | Box (x, z) | Height | Notes |
| --- | --- | --- | --- | --- |
| verge | Marsh verge, insertion | 20..26, -80..-56 | ground | Dark (no lamps; reeds and two trees); a cut fence panel at (24, -80) is the start |
| gatehouse | Gatehouse: reception window, CCTV desk, kettle | 14..20, -79..-73 | roof 3.3 | Door north (17, -73); reception window west; rear window east (20, -76) |
| lane | Barrier lane | 8..14, -80..-60 | ground | Rising-arm barrier at z -77, island with cam-gate |
| park | Staff car park, 4 rows x 15 bays | -36..6, -76..-52 | ground | 14 parked cars (1.5 roofs, hide cover), column lamps 6.0 |
| bins | Bin store + feeder pillar lane | -40..-30, -52..-44 | walls 3.0, open top | Feeder pillar (board) at (-31, -47); bin store corner = the wall jump onto its 3.0 wall |
| bikes | Bike shelter | -10..0, -50..-46 | roof 2.4 | 6.5 m from the canopy lip (rule 2) |
| smoke | Smoking shelter | 6..10, -50..-47 | roof 2.4 | Faces the car park |
| forecourt | Drop-off bay and walkway | -30..6, -46..-34 | ground | Kerbed bay x -26..-14; no cars under the canopy (rule 2) |
| canopy | Entrance canopy | -26..-14, -40..-34 | top 4.4 | Solid aluminium soffit 4.2, four round columns 0.3, no wall below the S / E / W edges |
| plantroof | HQ ground-floor plant roof | -40..-26, -40..-34 | top 4.4 | Joins the canopy at x -26; caged ladder from the delivery yard at (-38, -41); 1.1 parapet on its S and W edges (no grab from the bin-store wall) |
| dyard | Delivery yard | -40..-26, -46..-40 | ground | Dock door into HQ at (-33, -40) (locked: S2 side door, `sealUnlocks`) |
| C1 | Staff entrance vestibule (connector) | -24..-16, -34..-30 | 3.0 | Near door (-20, -34) badge door; far door (-20, -30) into S2 reception; checkpoint, ambient 0.30 |

**Objective.** Download (10 s, within 4 m) tonight's visitor list and the courier badge template from the gatehouse PC
(19.3, -76), through the open rear window from the dark verge. Opens C1 (the cloned courier badge).

**Routes.**
- Stealth (solo): verge -> rear window download -> along the dark east fence to (24, -52) -> the forecourt's east end
  behind the smoking shelter (smoker faces south) -> along the HQ facade planters -> the doorman from the east side
  while cam-walk looks south-west -> C1. Loop: round the gatehouse, or west through the car park rows and back.
- Shadow (made): board at the feeder pillar cuts the west half of the car park (group `s1-park-w`): the fence patrol
  walks to it (lure), the west rows go dark -> bin store -> delivery yard -> the doorman from the west.
- High (solo): delivery yard caged ladder (past the delivery sentry's sweep) -> plant roof 4.4 -> canopy -> drop
  behind the doorman. Long and through the sentry: the solo price for the same overwatch.
- Loud: through the barrier (cam-gate), take the gate officer, the panel race in the gatehouse, straight to C1.
- **Co-op only (CR1): leg-up onto the canopy** from the dark east end of the kerb (-13.5, -38); lip 4.4 on the canopy's
  east edge (x -14, z -40..-34). Overwatch of the doorman and the forecourt; drop takedown behind him under cam-walk's
  frame (the camera aims SW, its floor point 8 m out: the door foot is outside the frame). Solo cannot: free-standing
  canopy on round columns, internal drainage, no wall under the edge, nothing >= 1.2 m within 4 m (bikes 6.5 m, cars
  kept out by the kerb), headroom open sky. Solo bypass: the stealth route to the doorman, or the high route.

**Guards (8; all Larchmont).**
| # | Role | Kind / weapon | Post / patrol | Reason | Interacts |
| --- | --- | --- | --- | --- | --- |
| 1 | Gate officer | officer / pistolSd | Post at the reception window (16, -76), faces W | Works the barrier, waits for the 03:00 courier | Talks to #2 every ~40 s when #2 brings tea (pair stop, GA2) |
| 2 | CCTV officer | officer / pistolSd | Post at the CCTV desk (18, -74); kettle (19, -78) every ~40 s, 5 s | Watches cam-gate / cam-walk monitors | Alone at the kettle, back to the rear window (isolation); covered by #1 through the glass |
| 3-4 | Car-park pair | grunt / rifle + officer / pistolSd | Talking loop of the 4 rows, ~42 s, stops at the row ends | Two car break-ins last month: they try door handles | Each other (pair); first to answer the west-half board (lure) |
| 5 | Doorman | officer / pistolSd | Post under the canopy at the C1 door (-20, -35), faces S | Badge check at the only staff door | Covered by cam-walk; isolation when cam-walk sweeps away (sweep 25 s) |
| 6 | Smoker | grunt / rifle | Post in the smoking shelter (8, -48.5), faces S | On his break | Turns to #5 at each of the pair's row-end stops (barks) |
| 7 | Fence patrol | grunt / rifle | Back-and-forth west fence (-38, -76) <-> bin store (-34, -50), ~34 s | Fence line check after the break-ins | Isolation at the bin store end (dark); comes to the feeder board if cut |
| 8 | Delivery sentry | grunt / rifle | Sweep at the dock door (-33, -41), +-60 deg, 12 s | Waits for the courier with a cage trolley | Covers the caged ladder; overlaps #7 at the bin store mouth |

**Security register.**
| Id | Device | Protects | Why there | Weak side (cause) | Range / aim |
| --- | --- | --- | --- | --- | --- |
| cam-gate | Camera on the barrier island, y 3.0 | The barrier and the gatehouse door | ANPR / tailgating camera (insurer's condition) | Fixed (no sweep), faces south down the lane: the verge and the rear window are behind it | 10 m, aim 6 m S |
| cam-walk | Camera under the canopy soffit at (-17, -34.5), y 3.4 | The walkway from the car park to the staff door | Staff entrance camera | Under the soffit: cannot see the canopy top; sweeps 40 deg SW-S, 2 s pause | 10 m, aim 8 m SW |
| alarm-gh | Alarm panel in the gatehouse by the door | The site | Where the officer raises it | Inside a lit room with two officers | - |
Lasers: none (outdoors; R2-CT: lasers come with assets). Keypads: none (S2 teaches them).

**Lighting.** Lit: sodium columns on the car park (two groups: `s1-park-w` (8 columns), `s1-park-e` (6), cut at the
feeder pillar board), lane floodlight (photocell, shot only), gatehouse interior (switch by its door: lure #1), canopy
downlights (C1 door circuit; switch inside C1: not cuttable from S1), forecourt bollards (`s1-fore`, board in the
delivery yard). Dark by reason: the verge (outside the lit site), the bin-store lane (no fitting behind the fence), the
bike shelter (fitting tagged out: a fault ticket on the post), the plant roof and canopy top. The player makes the
rest: the west-half board, one column shot, the forecourt bollards.

**Observe and plan.** From the verge (dark, behind the gatehouse): #1 and #2 through the gatehouse glass, the pair's loop,
the smoker. From the canopy top (co-op): #5, #8, cam-walk's sweep. The player learns which half one board kills, who
comes to fix it, and that cam-walk covers the walkway, not the canopy top.

**Escalation.** Stage 1: #1-#2 search from the gatehouse; reinforce points the lane (11, -79) and the dock door.
Stage 2: +2 (grunt / officer). Stage 3: +2. (EW9: lights to full; C1 stays openable: never a softlock.)

**Element register (LS 16.9, S1; S2-S5 registers come with their slice, A13).**
| Id | Element | Real reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| E1 | Cut fence panel (24, -80) | Marsh path, panel cut by anglers (fault ticket) | Insertion | LS 16.3 |
| E2 | Gatehouse rear window | Open for the kettle steam | Download from the dark verge | LS 16.3.1 |
| E3 | Weldmesh fences 2.4 | Site perimeter / bin store | Climbable alone (`fence`): a loud-ish short cut | 16.3 |
| E4 | Bin-store walls 3.0 | Screens the bins | Wall jump corner, dark lane | 16.4 |
| E5 | Feeder pillar board | Feeds the car-park columns | Cuts `s1-park-w` (lure #7, #3-4) | 16.8.1 |
| E6 | Parked cars (14) | Night staff and lab cars | Cover; roofs 1.5 kept >= 4 m from E8 | 16.4 |
| E7 | Bike / smoking shelters 2.4 | Staff amenities | Cover; roofs kept >= 4 m from E8 | 16.4 |
| E8 | Entrance canopy 4.4 | Drop-off weather cover | CR1 co-op lip and overwatch | 11.3 |
| E9 | Plant roof 4.4 + caged ladder | HQ condensers on the ground-floor plant room | Solo high route to E8 (LS 11.4) | 16.2.1 |
| E10 | Kerb and planters | Drop-off bay, keeps cars off the canopy | Cover along the facade; keeps rule 2 | 16.4 |
| E11 | Column lamps, bollards, floodlight | Car park / forecourt lighting | Lit pools; cut or shot | 16.8.1 |
| E12 | Dock door (locked) | Goods-in to HQ | S2 side door (opens when C1 seals) | 16.3.5 |

### S2 - HQ atrium and offices (12 guards, ~7 min, tension 3: + keypads, alarm panels, glass)
**Footprint** x -44..4, z -30..6 (48 x 36). G 0 (4.4 high), L1 4.4, L2 8.4, roof 12.3; the atrium x -26..-10,
z -20..-4 runs to a roof light at 13.2. Two enclosed fire stairs (SW x -42..-39.4, z -28..-22.4; NE x 0..2.6,
z 0..5.6) with roof bulkheads; a feature stair in the atrium (lit, watched: the loud way up). `navLayers` 5 (EG16).
**Rooms.** G: reception and turnstiles (S), café under the atrium (N half), post room (SW, the C1 side), lift lobby
(dummy lift doors), mail / goods room (dock door from S1). L1: balconies, open-plan offices N and E (PIR off), meeting
rooms with glass fronts (EW6; greybox fence panels), breakout kitchen, facilities office (NE, the objective), comms
room with UPS, the C2 bridge landing (E, x 4). L2: offices, executive meeting suite, lift lobby. Roof: plant room,
atrium roof light (look-down only), two bulkheads.
**Objective.** Hack (3 s) the BMS terminal in the facilities office (L1 NE): the lab block's door codes (EW5) and the
lighting schedule. Opens C2.
**Routes.**
- Stealth: C1 -> post room -> SW fire stair -> L1 dark open-plan along the north side -> crouch under the meeting
  rooms' frosted band -> keypad -> facilities office; out by L2 to the NE stair and down to the bridge landing (loop:
  two stairs, two floors).
- High: SW stair bulkhead -> roof past the atrium roof light (overwatch of every balcony) -> NE bulkhead -> L1 landing.
- Loud: turnstiles (cam-turnstile), the feature stair, push to the facilities office.
- **Co-op only (CR2): leg-up + human ladder at the café planter gap.** The L1 balcony slab nose at 4.4 over the dark café
  (6 m gap in the glass balustrade where a planter trough stands flush; the rest of the edge has a 1.1 m balustrade
  and is `noLedge`). One boosts, the top player relays the other (`TEAM` ladder, partner 0.3-4.6 below). Headroom:
  atrium air to 13.2. Solo cannot: no wall below (slab overhang), café tables 0.75 (under 1.2), the feature stair kept
  >= 6 m from the gap and `noLedge`. Payoff: skips reception, the lobby loop and the SW stair. Solo bypass: SW stair.
**Guards (12).**
| # | Role | Kind | Post / patrol | Reason | Interacts |
| --- | --- | --- | --- | --- | --- |
| 1 | Reception officer | officer | Post at the desk facing the turnstiles | Front of house; monitors cam-turnstile / cam-lift | Alarm runner to alarm-rcp; answers the pendant panel (lure) |
| 2 | Lobby patrol | grunt | Loop reception, café, lift lobby, ~40 s | Ground-floor round | Stops at #1's desk (pair stop); isolation in the dark café |
| 3 | L1 balcony | officer | Back-and-forth along the balcony, ~36 s | Looks down into the atrium at each end | Covered by #4 across the void (LS 4.5) |
| 4 | L2 balcony | grunt | Back-and-forth, opposite phase, ~36 s | Watches L1 across the void | Covers #3 |
| 5-6 | Coffee pair | grunt + officer | Talking pair at the L1 kitchen, one refills every ~45 s | Their break; they talk about the ceremony (story leak) and the keypad code (EW5 intel) | Each other; the refill trip is the isolation |
| 7 | Facilities officer | officer | Post at the BMS desk, to the plotter every ~40 s | Night facilities duty; sets the lighting schedule | Answers the L1 corridor switch (lure) |
| 8 | Comms checker | grunt | Loop L1 corridor, comms room UPS, ~38 s | Reads the UPS panel each round | Passes #7's door (glance) |
| 9 | Stair tour | officer | Loop clocking both L2 fire doors, ~44 s | Clocking round | First to a report on L2 |
| 10 | L2 lift sentry | grunt | Sweep at the L2 lift lobby | Watches the corridor to the executive suite | Overlaps #9 |
| 11 | Bridge officer | officer | Post at the C2 card door, L1 | The only internal link to the labs | Exit pinch; under cam-bridge |
| 12 | Mailroom guard | grunt | Post at the goods door, G | Receives the courier's paperwork | Overlaps #2 at the post room |
**Security register.**
| Id | Device | Protects | Why there | Weak side (cause) | Range / aim |
| --- | --- | --- | --- | --- | --- |
| cam-turnstile | Camera over reception, y 3.2 | The turnstile line | Tailgating (front of house) | Faces the turnstiles; the post room door is behind it | 8 m |
| cam-lift | Camera in the G lift lobby | The lifts (the way to L2's executive suite) | Lift abuse after a laptop theft | Fixed; the fire stairs are not on CCTV (cost) | 8 m |
| cam-bridge | Camera over the C2 card door, L1 | The bridge door and landing | The lab block's only link | Sees the landing, not the NE stair door 6 m along | 9 m |
| kp-fac | Keypad, facilities office | The BMS terminal | Building controls | Code overheard (#5-6) or on the comms-room handover board | - (EW5) |
| alarm-rcp, alarm-brg | Alarm panels at reception and the bridge landing | The building | Guard posts | Both beside posted guards | - |
**Lighting.** Lit: atrium pendants and the reception downlight (`s2-atrium`, reception panel: lure #1, who sees his own
room go dark - from the desk the pendants are above the L1 slab line; each lamp shootable), balcony downlights
(`s2-l1-bal`, `s2-l2-bal`, switch at each stair door), corridor night level 25% per floor, kitchen, facilities office.
Dark by reason: open-plan offices and meeting rooms (PIR, nobody there), fire stairs (emergency pools at
landings), comms room (LEDs), roof plant room.
**Observe.** From the post room door (dark): #1, #2, cam-turnstile. From the SW stair L1 door (vision panel; occlusion
vantage, A23): #3, #4 in opposite phase, #5-6, #7 through the facilities glass.
**Escalation.** Stage 1 search; stage 2: reinforce at the goods door and the L2 lift lobby; stage 3 +2. EW9: the bridge
card door locks at stage 2 with the NE stair's roof route left open (no softlock).

### S3 - Lab block (16 guards, ~8 min, tension 3-4: + lasers, clear glass)
**Footprint** x 10..64, z -30..0 (54 x 30). G 0 (4.5), L1 4.5; test hall x 22..52, z -28..-8, 9.0 clear with a crane
rail at 6.0; north band (z -8..0) two storeys. Stairs: north (x 40..42.6, z -6..-0.4) and south-west (x 12..14.6).
**Rooms.** G: test hall with the environmental chamber (x 30..36, z -22..-14, 4.4 high, refrigeration plant on top) and
the shielded EMC room (x 42..48, z -24..-16, 4.0), burn-in racks (2.2 high, along the east wall, >= 4.5 m from the
chamber), goods-in dock (N, the C3 side), gas cage outside the east wall. L1 (north band): glass viewing corridor along
the hall's north edge, clean room with gowning room and pass-through, prototype store, write-up office, the block's
security room; steel escape gallery at 4.5 on the hall's north wall (door into the north stair).
**Objective.** Grab the Tidewater prototype board in the prototype store (L1). Opens C3.
**Routes.**
- Stealth: C2 landing -> SW stair down -> west door -> round the EMC room (high-bay row 1 off) -> under the viewing
  corridor (glass both ways: a timing problem) -> north stair -> the store's back corridor (keypad kp-store) -> the
  beams (jam the panel, or crouch the gap at the reset).
- High: crane walkway (caged ladder SW) at 6.0 along the hall -> north stair landing window: overwatch of both hall patrols.
- Loud: kill the high bays, run the viewing corridor, take the keyholder, set off the store beams, run for C3.
- **Co-op only (CR3): leg-up onto the environmental chamber roof** (lip 4.4 on its west face; headroom 4.6 to the 9.0
  roof; the chamber's own ladder is behind a padlocked anti-climb guard, A30) -> step onto the escape gallery (4.5) ->
  north stair L1, past the viewing-corridor pair. Solo cannot: smooth insulated panels, no bench or rack >= 1.2 within
  4 m, no wall jump to 4.4. The gallery is solo-reachable from the north stair (LS 11.4). Solo bypass: the stealth route.
- Co-op dual takedown: the viewing-corridor pair (one each end); solo waits for their split at the store end.
**Guards (16).**
| # | Role | Kind | Post / patrol | Reason | Interacts |
| --- | --- | --- | --- | --- | --- |
| 1 | Bridge landing officer | officer | Post at the C2 arrival | Checks cards from the HQ side | Faces the bridge; back to the SW stair |
| 2-3 | Viewing-corridor pair | officer + grunt | Talking back-and-forth, ~40 s | The prototype is in the building: doubled round | Each other; split at the store end (isolation) |
| 4 | Gowning sentry | grunt | Post at the pass-through | Nobody enters the clean room at night | Covers the beam curtain |
| 5 | Store keyholder | officer | Post at the store hatch | Holds the key; signs the board out at 06:00 | Overlaps #2-3 at the store end |
| 6-7 | Test-hall patrols | grunt x 2 | Loops round the chambers, opposite phase, ~42 s | Floor round | Cover each other at the chamber ends |
| 8 | Burn-in watcher | grunt | Post at the racks; log desk every ~30 s | Logs rack temperatures (an overnight test) | Answers the high-bay switch bank |
| 9 | Dock officer | officer | Post at the dock desk | Receives the courier at 03:00 | Alarm runner (alarm-dock) |
| 10 | Dock patrol | grunt | Back-and-forth dock to gas cage, ~35 s | Checks the gas-cage padlock | Isolation behind the gas cage |
| 11 | Stair tour | officer | Loop clocking both stairs, ~44 s | Clocking round | Investigator on reports |
| 12 | Security room operator | officer | Post; kettle every ~40 s | Watches the lab cameras | Isolation at the kettle |
| 13 | Write-up officer | officer | Post facing the corridor glass | Reads test reports on the radio (barks) | Sees the viewing corridor |
| 14 | East yard patrol | grunt | Back-and-forth outside the east windows, ~38 s | Glimpses in through the high windows | Finds bodies left in view |
| 15 | Shift supervisor | officer | Long loop between posts, ~45 s | Visits every post (GA1: a missing guard is searched for) | First responder |
| 16 | Crane-bay sentry | grunt | Sweep at the hall's west door | The hall door from the HQ side | Answers the switch bank |
**Security register.**
| Id | Device | Protects | Why there | Weak side (cause) | Range / aim |
| --- | --- | --- | --- | --- | --- |
| las-gown | Beam curtain (3 beams) across the pass-through | The clean room | Cleanroom intrusion detection: nobody ungowned | Panel in the gowning room wall, visible through its door | - |
| las-store | Two beams across the store's inner aisle | The prototype shelf | Fitted after a sample went missing | Reset / power panel by the store door, near side | - |
| cam-view | Camera at the viewing corridor's store end | The store door and corridor end | The prototype store | Faces west down the corridor; the store's back corridor is behind it | 10 m |
| cam-dock | Camera over the dock door | The dock door | Goods-in | Fixed, faces in | 10 m |
| kp-store, kp-sec | Keypads, store and security room | Store; camera room | Access control | Codes from the S2 BMS hack (EW5) | - |
| alarm-dock, alarm-sec | Panels at the dock desk and the security room | The block | Guard posts | - | - |
**Lighting.** Lit: high-bay LEDs in three rows (`s3-hb-1..3`, switch bank by the west door: lure #16, #8; fittings at
8.5 shootable; jammer), viewing corridor (two door switches), burn-in task lights, dock. Dark by reason: chamber
roofs (no fittings above 4.4), the EMC room (shielded, off when not testing), gas cage, east yard between windows.
**Observe.** From the C2 landing glass (occlusion vantage, A23; dark landing once `s2` corridor light is off): the whole
hall. From the north stair half-landing (dark): #2-3, #13, #5.
**Escalation.** Stage 1 search; stage 2 reinforce at the dock and the west door; EW9: the store locks at stage 2 with
its back corridor open.

### S4 - Data hall (20 guards incl. 1 dog, ~9 min, tension 4: + dog, mantrap, dual custody)
**Footprint** x -10..40, z 16..48 (50 x 32). Hall x -4..34, z 20..44, 7.0 clear; hot-aisle containment pods (roofs 3.0,
`noLedge`, not a route), cable baskets on ladder racks at 4.4 over the cold aisles, slab 7.0 (2.6 m over the baskets:
headroom OK, the tightest; fallback slab 7.5). NOC on a 3.6 m mezzanine with a window over the hall; UPS and battery
rooms (W), loading dock (S, the C3 side), plant deck at 7.3 (chillers), cable riser (NE, caged ladder 0 -> 4.4 basket
landing -> 7.3 deck), fenced generator compound east (x 34..40). Mantrap at the main entrance (EG19-free: two plain
doors, an interlock is EW9 or dressing).
**Objective.** Download (10 s) the build and signing logs at the cage terminal (Orrin's mesh cage, x 14..22, z 32..40).
Opens C4.
**Routes.**
- Stealth: C3 -> dock pair's gaps -> dark battery room -> the hot aisles (crouch; pod checks on a timer) -> the cage
  from its back corner (front gate after the keyholder) -> terminal; out by the UPS corridor to the colonnade.
- High: NE fire stair bulkhead -> plant deck past the deck patrol -> riser ladder down -> basket landing or floor.
- Loud: the mantrap by force, straight down the cold aisle, the cage.
- **Co-op only (CR4): leg-up onto the cable baskets** from the dark end of hot aisle 3 (lip 4.4), a dark run over the
  hall to the cage; the beam pair las-tray (jam-and-pass: one jams the panel, one crosses; A29) -> hang-down into the
  cage. Solo cannot: pod roofs `noLedge` at 3.0, no rack top >= 1.2 within 4 m of the lip (racks are inside pods). The
  baskets are solo-reachable from the riser landing (LS 11.4). Solo bypass: the hot aisles.
- **Co-op only (CR5): dual-custody rear gate.** Two key switches 8 m apart on the cage's west and north posts (a real
  two-person rule) open the rear gate (pair gate, EW4; fallback pair bolt EW3). Solo bypass: the front gate after the
  keyholder (#9) is dealt with.
**Guards (20).**
| # | Role | Kind | Post / patrol | Reason | Interacts |
| --- | --- | --- | --- | --- | --- |
| 1-2 | Dog team | grunt handler + dog | Handler loop round the generator compound, dog heels, ~44 s | Diesel stolen from the tanks twice | Dog smells 6 m (light ignored); answers the compound board |
| 3 | Yard gate officer | officer | Post at the service-yard gate | Lets the courier van in | Overlaps #1-2 |
| 4 | Mantrap officer | officer | Post at the mantrap desk | Admits one at a time | Answers the hall lighting panel (lure) |
| 5-6 | Security room pair | officer + officer | Talking post at the monitors | Operator and site supervisor | Alarm runners |
| 7-8 | Cold-aisle patrols | grunt x 2 | Loops, ~40 s | Floor round | Opposite phase |
| 9 | Cage keyholder | officer | Post at the cage front gate | Holds one of the two cage keys | Under cam-cage |
| 10-11 | Hot-aisle checkers | grunt x 2 | Back-and-forth, ~40 s | Read the pod thermometers | Isolation inside the pod ends |
| 12 | Battery checker | grunt | Loop UPS / battery rooms, ~36 s | Reads cell voltages | - |
| 13 | Plant deck patrol | grunt | Back-and-forth along the chillers, ~40 s | A chiller alarm earlier tonight | Covers the riser top |
| 14-15 | NOC pair | officer x 2 | Talking post at the NOC window | Watch the hall and screens | Overlook the hall (hostile vantage) |
| 16 | Stair tour | officer | Loop clocking two stairs, ~44 s | Clocking round | Investigator |
| 17-18 | Dock pair | grunt x 2 | Unload the 03:00 drives (staggered trips) | The courier delivery | Each other |
| 19 | Colonnade sentry | grunt | Post at the C4 gate | The Old House is closed tonight | Exit pinch |
| 20 | Roaming investigator | officer | Long loop, first to any report | Mobile supervisor | Visits posts (GA1) |
**Security register.**
| Id | Device | Protects | Why there | Weak side (cause) | Range / aim |
| --- | --- | --- | --- | --- | --- |
| cam-mantrap | Camera in the mantrap | The entrance interlock | Admission record | Inside the mantrap only | 8 m |
| cam-cage | Camera on the cage's SE post | The cage front gate and terminal | High-value servers | Faces the gate; the rear gate is behind it | 9 m |
| cam-dock4 | Camera over the loading dock | The dock door | Goods-in | Fixed, faces in | 10 m |
| las-tray | Two beams along the cable basket over the cage | The cage from above | Overhead intrusion detection on a high-security cage | Panel on the riser wall at the basket landing | - |
| kp-batt, kp-deck | Keypads, battery room and plant deck door | Battery room; chillers | Safety (hydrogen) and plant access | Codes: S2 BMS hack | - |
| pg-cage | Dual-custody key switches | The cage rear gate | Two-person rule | 8 m apart: two bodies | 1.0 s window (EW4) |
| alarm-sec4, alarm-mt, alarm-dk | Panels: security room, mantrap, dock | The hall | Guard posts | - | - |
**Lighting.** Lit: cold-aisle LEDs (`s4-cold-1..3`, hall panel by the mantrap: lure #4), NOC, dock floodlight (shot),
compound floodlights (board in the compound: lure #1-2, the dog searches by nose). Dark: above the pods (nobody works
at 3-7 m), plant deck (task lights at each chiller), the riser, the battery room (lights off; PIR is A6).
**Observe.** From the C3 roller-door lobby (dark): the dock pair and the yard. From the battery room door: two aisles.
From the plant deck through the NOC roof light: #14-15. The dog is heard before it is seen.
**Escalation.** Stage 1 search; stage 2: the handler releases the dog to the last seen spot (EW9; fallback: the dog
stays at heel), reinforce at the dock and the UPS corridor; stage 3 +2 grunts.

### S5 - The Old House (24 guards incl. 2 dogs, ~10 min, tension 5, the set piece)
**Footprint** x -66..-26, z 18..48 (40 x 30). Brick, G 0 (4.2), L1 4.2, lead roof 8.4 with a 1.1 parapet; stair hall
with a first-floor gallery (centre); inner light well (x -48..-44, z 30..34, open to the sky, no door, a window into
the anteroom); walled garden (W, 2.8 walls); lake terrace (N) to the boathouse jetty (extraction x -50..-40, z 60..66).
**Rooms.** G: entrance hall, strongroom (open tonight) and its anteroom (audit table), security control room (the
response team), service wing (kitchen, plant, back door). L1: gallery, boardroom, CEO suite, records archive (rolling
stacks) with a dual-control cage to the document-lift shaft (no car: a shaft with a plant ladder down to the anteroom's
back, A15). Roof: walk, chimney stacks, stair bulkhead.
**Objective.** Grab the signing key token in the strongroom; then extract at the jetty (the extraction zone).
**Routes.**
- Stealth: C4 -> service wing back door -> service stair -> L1 dark archive -> the anteroom side door after the escort's
  cycle -> the token; out by the terrace with the uplights off, between the dog teams, to the jetty.
- High: stair bulkhead -> lead roof behind the marksman (chimneys as cover) -> rappel off the north parapet to the
  terrace, or the service wing's low roof -> walled garden (hang-drop).
- Loud: front door; stage 1 deploys the response team; fight to the strongroom; run for the jetty.
- **Co-op only (CR6): dual-control archive cage** (two key switches 9 m apart): opens the document-lift shaft; one goes
  down the shaft ladder into the anteroom's dark back while the partner covers from the archive (pair gate EW4;
  fallback pair bolt EW3). Solo bypass: the anteroom side door.
- **Co-op only (CR7): rope down the light well** - the partner lowers the other 6.0 m (two-person rope 2.2-6.0, A29)
  from the roof into the well for a takedown through the anteroom window on the keyholders from behind (dual takedown:
  the climax). Out by the anteroom window (solo-reachable from the anteroom, LS 11.4). Solo cannot: 6 m drop, no
  downpipe (internal rainwater), no door. Solo bypass: the anteroom from the hall.
**Guards (24).**
| # | Role | Kind | Post / patrol | Reason | Interacts |
| --- | --- | --- | --- | --- | --- |
| 1-4 | Armed response team | grunt x 4 | Post in the control room; one walks the hall every ~45 s | Standing reaction force for the ceremony | Deploy at stage 1 (EW9; fallback: stage reinforcements are grunts) |
| 5-8 | Dog teams (2) | grunt handler + dog, x 2 | Loops: walled garden; lake terrace, ~44 s | Grounds patrol for the ceremony | Answer the garden board; meet at the terrace gate |
| 9-10 | Keyholders | officer x 2 | Talking post in the anteroom | Two-person rule: neither alone with the token | Each other (dual takedown target) |
| 11 | Auditor's escort | officer | Back-and-forth anteroom to the shaft door, ~30 s | Escorts audit papers | Isolation at the shaft door |
| 12 | Entrance hall officer | officer | Post facing the front door | Front door | Under cam-hall |
| 13-14 | Gallery patrols | grunt x 2 | Back-and-forth round the gallery, opposite phase, ~40 s | Overlook the stair hall: the hostile vantage | Look down when the chandelier dies (lure) |
| 15 | Boardroom post | officer | Post | Board papers laid out for 08:00 | - |
| 16-17 | CEO suite pair | officer + grunt | Talking post at the suite door | The CEO's safe and laptop | Each other |
| 18 | Archive patrol | grunt | Loop through the stacks, ~42 s | Archive round | Isolation in the dark stacks |
| 19 | Roof marksman | grunt (rifle) | Sweep from the roof walk over the lake approach | Overwatch for the response team | Sees the terrace and jetty path. A lookout post (leash 1 m, guard-rules S9, A9), read with `?lookouts=1` |
| 20 | Terrace gate post | grunt | Post at the terrace gate | Lake-side door | Overlaps the terrace dog team |
| 21 | Service wing patrol | grunt | Loop kitchen, plant, back door, ~38 s | Service round | Answers the garden board |
| 22 | Colonnade arrival officer | officer | Post at the C4 end | Checks anyone from the data hall | Entry pinch |
| 23 | Response van driver | grunt | Post at the van by the north lane | The team's ride; overlooks the jetty path | - |
| 24 | Stair tour | officer | Loop clocking the back stair and the bulkhead, ~44 s | Clocking round | Investigator |
**Security register.**
| Id | Device | Protects | Why there | Weak side (cause) | Range / aim |
| --- | --- | --- | --- | --- | --- |
| cam-hall | Camera in the entrance hall | The front door and the stair foot | Main entrance | Faces the door; the service corridor is behind it | 10 m |
| cam-gallery | Camera on the gallery | The archive door | Records | Fixed; the back stair door is out of frame | 9 m |
| cam-terrace | Camera on the terrace wall | The terrace gate and lawn | Lake-side approach | Ends at the lawn edge; the boathouse path under the trees is outside it | 12 m |
| las-shaft | Beams across the shaft landing door in the anteroom | The anteroom from the shaft | The lift is not used during the ceremony, so it is armed | Panel in the archive by the cage (far side for the solo; near side for CR6) | - |
| kp-arch, kp-ctl | Keypads: archive and control room | Records; the response team | Access | Codes from the S2 BMS hack | - |
| pg-arch | Dual-control key switches | The archive cage to the shaft | Paper twin of the strongroom's two-person rule | 9 m apart | 1.0 s (EW4) |
| alarm-ctl, alarm-ante, alarm-ter | Panels: control room, anteroom, terrace gate | The house | Guard posts | - | - |
**Lighting.** Lit: chandelier (shoot: a lure for #13-14) and gallery wall lights (`s5-gal`, switch at each end), boardroom,
anteroom, terrace bollards and garden uplights (`s5-garden`, board in the service wing: lure #21 and the garden dog
team), roof walk dark except the marksman's position light. Dark: archive aisles (per-aisle lights off), the garden's
west wall, the boathouse path under the trees, the roof behind the chimneys, the light well.
**Observe.** From the colonnade end (dark): the service wing and a dog team. From the archive: the gallery and, through
the audit room glass (EW6), the anteroom. From the roof bulkhead: the marksman and both dog teams. A ghost run never
meets the response team.
**Escalation.** Stage 1: the response team deploys from the control room (EW9) and the dogs are released; stage 2-3:
+2 grunts each at the front door and the service door; the jetty extraction stays open (G125).

---

## Unavoidable posted guards (M12)
Michael ~01:50: "make sure there are sections where at least one guard is unavoidable to reach the objective/exit. they
must be distracted, knocked out, or killed." BRIEF A60-A63. Each choke guard is placed as `SectorGuard` data with
`role: 'posted'`, `zone`, `reason` and guard-ai's `post` block; the behaviour (hold, pulled to the leash edge by a lure,
return facing) is guard-ai GA3.

| K | Section | Guard | Choke | `post` | Allowed distractions | Solo clear | Co-op option | Assert |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K1 | S1 | #5 doorman (-20, -35), faces S | C1 near door, the only staff door | leash 5, guards `c1-door` | noise, thrown item, the canopy light cut | lure him to the leash edge in cam-walk's sweep-away, takedown from behind | CR1 drop takedown from the canopy | no route verge -> C1 near door past his cone |
| K2 | S2 | #11 bridge officer, L1 | C2 card door, the labs' only link | leash 5, guards `c2-door` | noise, thrown item (from the NE stair door, out of cam-bridge) | lure, then takedown or slip through | one lures from the NE stair, the other slips | no route C1 far door -> C2 door past his cone |
| K3 | S4 | #19 colonnade sentry | C4 gate | leash 5, guards `c4-gate` | noise, thrown item, the colonnade lights | lure, then slip or takedown | one lures, the other slips | no route C3 -> C4 gate past his cone |
| K4 | S5 | #9-10 keyholders, talking post | Anteroom, the token (objective) | leash 3 each, `highSecurity`, guards `token` | noise, the anteroom light | lure turns one away; two single takedowns inside his look time | CR7 dual takedown from the light well | no route C4 -> token past either cone |

Build-time rule: the leash edge (K1-K3) sits at least 1 m off the door's nav cell, so a lure opens the way. S3 has no
choke (A60). Slice build sheets give the exact post point, yaw and leash; the slice's unit test checks the `post` block
is present for each K guard.

## Co-op routes (summary)
| Id | Section | Verb | Lip / device | Solo bypass | Engine need |
| --- | --- | --- | --- | --- | --- |
| CR1 | S1 | Leg-up, drop takedown | Canopy E edge 4.4 | Facade stealth route, or the plant-roof ladder | none |
| CR2 | S2 | Leg-up + human ladder | L1 slab nose 4.4 at the planter gap | SW fire stair | none |
| CR3 | S3 | Leg-up, step to the gallery | Chamber roof 4.4 | Stealth route to the north stair | none |
| CR4 | S4 | Leg-up, jam-and-pass, hang-down | Cable baskets 4.4 | Hot aisles | A29 (verbs) |
| CR5 | S4 | Dual-custody gate | pg-cage | Front gate after the keyholder | EW4 (or EW3) |
| CR6 | S5 | Dual-control gate | pg-arch | Anteroom side door | EW4 (or EW3) |
| CR7 | S5 | Two-person rope, dual takedown | Light well 6.0 | Anteroom from the hall | A29 (verb) |
Each lip: unit reach tests (rules 1-6) and e2e probes (solo cannot from every nearby top; host and client co-op can;
a player downed on the top is revived).

## Mission and modes (fill)
- `modes: ['sector']`; `navLayers` 5; `theme.lightLevel` 0.14 indoors via `ambientZone`, outdoor moon fill under the
  shadow line; connectors 0.30. No mission entry (Sector Ops lists maps by `modes`).
- Briefing (story rules, text radio): "Evening. Saltmarsh Park. Orrin built the relay that switches the city's backup
  on." / "You want three things: the prototype board, the build logs and the key that signs them." / "Larchmont runs
  the guarding. Armed, bored, and tonight they have a ceremony to watch." / "Gate, offices, labs, data hall, then the
  Old House. Lights are on everywhere. Make your own dark."
- Objectives in route order: S1 download, S2 hack, S3 grab, S4 download, S5 grab + extract.
- Per section in `SectorDef`: `reinforce` (2-3 points each, named above), `perStage` 2, `alarms`, `switches`,
  `hideSpots`, `routes` (the M8 check data), `bolts` none.

## Engine work needed
Size S < 1 day, M 1-3 days, L new system. Owner: slice 0 (in progress, slice-0 agent), L (ours, protocol 31), E
(ours, later slices), GA (guard-ai provides), CR (camera-range job).
| Id | Item (ENGINE gap) | Needed by | Size | Owner | Fallback |
| --- | --- | --- | --- | --- | --- |
| EW1 | Arm every guard: no runners; reinforcements grunt / officer, grunt in S5, no enforcer (EG3, SPEC Guards note) | S1 | S | slice 0 | none needed (placement uses armed kinds) |
| EW2 | Camera cap per section, not 12 per map (EG1) | S5 (13th camera) | S | slice 0 | drop cam-dock4 |
| EW3 | Pair bolt (R2-PATHS design 2) (EG11) | S4, S5 | S | E | team door cut; solo bypass only |
| EW4 | Pair gate (two key switches) usable in Sector mode (EG11) | S4, S5 | M | E | EW3 at the same door |
| EW5 | Keypads with codes found in intel (EG10, EG24) | S2-S5 | M | E | plain door with a posted guard (code beat cut) |
| EW6 | Glass per DEC G45: clear (sight, light) and frosted (light) (EG14) | S2, S3, S5 | M | E | open frames / fence panels; no frosted band |
| EW7 | Sector light-state co-op sync: groups, shot and jammed lamps, `PROTOCOL_VERSION` 31 (EG8) | S1 co-op | M | slice L | solo-only playtests of light cuts until it lands |
| EW8 | Breaker / timed isolator device (EG9) | S1-S5 | M | E | a switch at the board (A11) |
| EW9 | Alarm-stage extras: lockdown doors, lights to full, response-team deploy route, dog release (EG12) | S2-S5 | M | E | stage reinforcements only |
| EW10 | Security desk in Sector (loop / switch off cameras) (EG13) | S3, S4 | M | E | operator is a plain post |
| EW11 | Dog rules: palm-strike exclusion, explicit handler, per-section dog allowance (EG20) | S4 | S | slice 0 | grunt patrol instead of the dog |
| EW12 | Restart resets lamps and doors (EG22) | S1 | S | slice 0 | restart keeps cut lights (known gap) |
| EW13 | Merge G44 (guards see poorly above) from origin/feature/g44-above (EG15) | S2 high routes | S | E | high routes rely on darkness |
| EW14 | `navLayers` 5 perf check (EG16) | S2 | S | E | S2 L2 drops to offices only (4 surfaces) |
| EW15 | Guard-cap perf run 12 / 16 / 24 awake on the laptop GPU (EG23) | S4, S5 | S run / M-L fix | E | report the risk; do not cut the count (M8); dormant guards (guard-ai) |
| EW16 | Map size measure: build, nav, bake, memory (EG25) | S1 slice | S | slice 1 | EW-L1 chunks or the compact campus |
| EW-L1 | Per-section chunk loading | only if EW16 fails | L | E | compact campus |
| CR | Camera fill over the camera's own range (EG2) | all | S | camera-range job | data `range` 8-12 only |
| GA1-GA6 | Squads + radio checks, talking pairs, posted guards, light investigations / relight, staggered alerts, reinforcement tactics (EG4-EG7) | all | - | guard-ai | timed `loop` meetings; engine defaults |
Not used, so not needed: lifts (EG17), hatches (EG18), roller doors (EG19), drone mirror (EG21).

## Applied loosenings (Michael: apply, logged and undoable)
Michael ~01:42: "Apply, logged and undoable". Applied **for this map only** as assumed decisions (BRIEF A23-A45, each
with its undo); `docs/level-design.md`, the template and the bible are not edited. The design above is built to them.
| A | # | Rule | Applied as | Why | Used by | Undo |
| --- | --- | --- | --- | --- | --- | --- |
| A23 | P1 | LS 3.1 dark entry vantage | Out of every guard's view by darkness or occlusion (same as LR2) | A lit site has few dark doorways | S2 SW stair door, S3 C2 landing | Each occlusion vantage gets a dark pocket |
| A24 | P2 | LS 3.5 stepping stones 4-8 m | A light cuttable from the route counts | M1 "make shadows" | S1 car park, S4 cold aisles | Add cover / hide spots at 4-8 m |
| A25 | P3 | LS 5.1 | Lit default with standby fill (LR1, LR7) | M9 | all | Ambient 0.30, darker default |
| A26 | P4 | LS 5.2 two ways to darken | One way, or crossed by timing, at a deliberate lit test | Photocell columns, S3 viewing corridor | S1, S3 | Add a second way (board / jam) |
| A27 | P5 | LS 4.4 isolation in the dark | Alone and unwatched, dark or darkenable from cover (LR4) | Lit work posts | S1 #2, S4 #14-15 | Move those stops into dark pockets |
| A28 | P6 | LS 15 darkness test | Lit vantages tested for "out of sight" (LR8) | Follows P1 | tests | Dark-only test |
| A29 | P7 | LS 11.6 co-op verbs | Adds the two-person rope, hang-down, jam-and-pass, pair gate | All exist in the engine or the course | CR4-CR7 | CR4 basket overwatch only, CR5-CR6 pair bolts, CR7 cut |
| A30 | P8 | LS 11.2 no locked-door teases | Visible dual-control doors and a padlocked ladder guard allowed | Real hardware with an owner (16.3.5) | CR3, CR5, CR6 | No ladder on the chamber; plain doors |
| A31 | P9 | Warehouse L1-L15 (DEC G266) | Carried to the campus | Same prototype stage | all | Per-rule, back to LS |
| A32 | P10 | LS 4.2 patrol mix per space | Per section | 8-24 guards per section | all | Re-mix adjacent spaces |
| A33 | LR1 | New LS 5.5 "lit by default" | Spaces lit as the real building; players make the dark; named dark pockets | M1, M9 | all | Dark default |
| A34 | LR2 | LS 3.1 | = A23 | | | = A23 |
| A35 | LR3 | LS 3.9 checkpoint in the dark | Dark, or a quiet connector no guard enters | Connectors at 0.30 | C1-C4 | Connectors to 0.14 |
| A36 | LR4 | LS 4.4 | = A27 | | | = A27 |
| A37 | LR5 | LS 5.2 / bible L8 ways to darken | Switch, breaker / isolator, held jammer, shot; at least one not a shot | EMP removed (G152); quiet first | all | LS 5.2 wording |
| A38 | LR6 | LS 6.3 no forced timers | Player-started device windows allowed (jam, isolator, loop); no failing area clock | EW8 isolators | S1-S5 | No timed isolators |
| A39 | LR7 | G225 fill 0.30 | Encounter spaces 0.14 standby fill, transit 0.30 (= A10) | Cut circuits read dark | all | 0.30 everywhere |
| A40 | LR8 | LS 15 darkness test | = A28, plus: a cut circuit drops the pool under 0.28 on host and client | Parity | tests | = A28 |
| A41 | LR9 | Bible L7 | Darkness is the exception, and true dark | Reading | all | - |
| A42 | LR10 | Template / space sheet Lights field | Slice build sheets record the lit default, circuits, cut ways, dark pockets | Build contract | build sheets | Old field |
| A43 | LR11 | Bible 7 light plan | Same per section in the build sheets | Build contract | build sheets | Old field |
| A44 | LR12 | LS 12.1 sync fact | Recorded; slice L (protocol 31) closes it | Fact | slice L | - |
| A45 | P12 | Template "existing systems only" | This job builds the EW items above | M1 needs them | all | Map only; EW items become Future |

## Engine questions (confirm at slice 0-1, by grep)
- Does a download need line of sight, or only 4 m (S1 window)? Is `ambientZone` per area enough for 0.14 / 0.30?
- Does `climbRoom` pass on the canopy top's edge with the HQ facade 6 m behind? (e2e probe.)
- Can a `SectorGuard` carry `kind: 'dog'` with a named handler after EW11? Can `perStage` kinds be set per section?

## Future
Lifts, hatches, roller doors, PIR lights (A6), a CCTV operator who radios what he sees, shift change (guard-ai).

## Report format (fixed)
Files changed; decisions; checks with summary lines; undone items; manual checks per space in `TESTING.md`; STOP.
