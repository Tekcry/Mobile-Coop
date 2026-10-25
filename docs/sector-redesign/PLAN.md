# sector-redesign - plan (greybox slices)

Spec: `docs/sector-redesign/SPEC.md` (Saltmarsh Park, map `campusOps`, 5 sections). Smallest playable first; each slice
is an implementer + a fresh checker, at most 1 fix round (CLAUDE.md current goal). Greybox only: boxes, lamps,
guards, devices, objective; no dressing until Michael has played it. All e2e run with `E2E_GPU=1` on the laptop via
Character Build (branch + commit + named suites); unit tests run locally. EW / GA / EG ids are the SPEC's.

Common to every map slice: unit `tests/campusS<n>.test.ts` (guard count, every human armed, routes on the nav grid,
cycles 25-45 s, every camera `range` 8-12 with a `reason`, every laser with one panel, every co-op lip in
`CAMPUS_COOP_LIPS` passes `soloJumpThreats` + `soloTopLandingThreats` with 0.5 m, the headroom ray, rule 2 (no solo top
>= 1.2 m within 4 m), the M8 isolation-in-time check `sectorCheck`; the A64 screen count (no player point sees more than 6
awake guards unoccluded) and `dormant` only on allowed guards; for a section with an M12 choke (SPEC "Unavoidable posted
guards": K1 S1, K2 S2, K3 S4, K4 S5) the K guard's `post` block and the choke assert: with his view cone as a nav
blocker no route joins entry and objective / exit, without it one does); e2e `scripts/e2e-sectorops.mjs` gains a campus
part per section (`?autostart=campusOps&mode=sector`, section start flag). Done-when always includes: `npm run check`
green, the slice's e2e green on the laptop, STATE updated, pushed.

## Slice 0 - engine prerequisites for S1 (IN PROGRESS: slice-0 agent, started ~02:50)
Owned by the slice-0 agent in this folder (`src/game/sectors.ts`, `sectorMode.ts`, `sectorReset.ts`, `security/data.ts`,
`world/lights.ts`, strike files):
- EW1 arm every guard: no runners in Sector; reinforcement kinds grunt / officer (no heavies), per-section kinds.
- EW2 camera cap per section (not 12 per map).
- EW11 dog rules: palm-strike exclusion, handler pairing, per-section dog allowance in `tests/sectors.test.ts`.
- EW12 restart resets lamps and doors.
- Squad / post / zone / reason tags on `SectorGuard` as data (the shape guard-ai reads; written at the end of
  `research/ENGINE.md`). Squad behaviour itself is GA1 (guard-ai provides).
Tests: `tests/sectors.test.ts`, `tests/sectorRestart.test.ts`, `tests/sectorBolt.test.ts` (unchanged), new unit tests
per item; e2e `e2e-sectorops` (Warehouse must still pass: it is the regression map).
Done when: the items above merge into this branch, Warehouse Ops unchanged in play. Fallbacks if any slips: SPEC
"Engine work needed" column (S1 needs only EW1; EW12 slipping is a known gap, not a blocker).

## Slice L - Sector light-state co-op sync (protocol 31; ours)
EW7: the `sector` message (or a new light field beside it) carries light group states, shot lamps and jammed lamps;
host-authoritative (bible L10); the client applies them to its `LightField` and lamp rig; `PROTOCOL_VERSION` 31.
Files: `src/net/protocol.ts`, `src/game/modes/sectorMode.ts` (wire fields), `src/net/coopHost.ts` / client sim,
`src/world/lights.ts` (apply), tests asserting the version.
Tests: unit (encode / decode round trip, apply on a fake field; version test); e2e `e2e-coop`, `e2e-netmove`,
`e2e-sectorops` co-op part ("host cuts a switch -> client meter and guard light agree"; "client shoots a lamp" is host
only today: assert the host-side result).
Done when: in co-op Sector a switch, a shot lamp and a jam give the same picture, meter and guard reading on both
peers. Runs in parallel with slice 1; it gates the slice 1 **co-op light** playtest only.

## Slice 1 - S1 Gatehouse and car park, playable solo and co-op
Files: `src/world/maps/campusOps.ts` (MapDef: bounds x -70..70, z -84..70, `modes: ['sector']`, `navLayers` 5, the
five building shells as greybox boxes so EW16 measures the full map), `campusS1.ts` (S1 geometry, lamps with groups,
switches incl. the feeder board, hide spots, spawns, nav seeds, `CAMPUS_COOP_LIPS` entry CR1), `campusSectors.ts`
(SectorDef[0]: guards #1-#8 with tags, cam-gate, cam-walk, alarm-gh, objective download at the gatehouse PC, C1
connector, reinforce points; S2-S5 stub sections: an objective box + connector so the run chains for testing),
`src/world/maps/index.ts` (register; not in `LISTED_MAP_IDS` until slice 3), `tests/helpers/soloJumpReach.ts` +
`tests/soloJumpReach.test.ts` (taken from origin/feature/sector-fixes-r2-jump 7306dce9, not its warehouseS2 change).
Build sheet: the implementer writes the S1 exact values into SPEC "S1 build sheet" first (from the room table).
Tests: unit `tests/campusS1.test.ts` (common list + 8 guards, 2 cameras, CR1 lip rules, element register ids E1-E12
present). e2e `e2e-sectorops` campus part 1:
- Solo completes S1: nav legs verge -> gatehouse window -> download -> facade -> C1 near door; the connector seals;
  section 2 stub loads.
- Solo cannot use CR1: running jumps and wall jumps toward the canopy lip from the kerb, the column bases, the bike and
  smoking shelter roofs, a car roof, the facade corner, the bin-store wall: never stands on the canopy, never holds a
  grip (R2-JUMP probe pattern: top gear, press 0.8 m before the edge, edge take-off at 0.3 / 0.15 / 0.02).
- Solo reaches the canopy by the plant-roof ladder (LS 11.4) and is revived there by a partner in co-op.
- Co-op: host boosts client onto the canopy and the reverse; drop takedown on the doorman; both pass C1.
- Lights: the feeder board cuts `s1-park-w` (meter under 0.28 at a west row point) and draws the fence patrol; a
  crouched still player at the verge vantage stays under suspicious for a full cycle; cam-walk does not see the canopy
  top and does not fill past 10 m.
- EW16 measure: map build, nav build and bake times and memory vs Warehouse Ops on the laptop (logged in STATE).
Done when: S1 plays solo and co-op end to end into the S2 stub (built to the applied loosenings A23-A45); EW16 within A20's budget (or the fallback chosen and
logged); Michael's morning review has the greybox (M4).

## Slice 2 - S2 HQ atrium and offices
Needs: EW13 (merge origin/feature/g44-above) for the roof and balcony views; EW14 (`navLayers` 5 perf). EW5 keypad
and EW6 glass are slices E1 / E2: until then kp-fac is a plain door with #7 posted, meeting rooms have open fronts.
Files: `campusS2.ts`, `campusSectors.ts` (S2 data, CR2 lip), `tests/campusS2.test.ts`.
Tests: unit common list + 12 guards; e2e campus part 2: solo SW-stair route completes the hack; solo cannot reach the
L1 slab nose at the planter gap (from café tables, the feature stair, the balustrade); co-op leg-up + human ladder for
host and client; the reception pendant panel lures #1.
Done when: S1 -> S2 plays solo and co-op.

## Slice 3 - S3 lab block (first lasers)
Files: `campusS3.ts`, S3 data (CR3, las-gown, las-store, cam-view, cam-dock), `tests/campusS3.test.ts`.
Tests: unit common + 16 guards, each laser's panel visible from the near side; e2e campus part 3: solo completes the
grab by the stealth route; solo cannot reach the chamber roof from the floor (burn-in racks, benches, EMC room roof);
the gallery -> chamber roof solo step is allowed (from above); co-op leg-up; jamming las-store's panel lets a crouch
pass; the high-bay switch bank lures #16.
Done when: S1-S3 plays; then campusOps joins `LISTED_MAP_IDS` and the Sector selector (M11: Warehouse stays listed, both maps).

## Slice 4 - S4 data hall (first dog), gated by EW15
First: EW15 guard-cap perf run (12 / 16 / 24 awake) on the laptop GPU; result in STATE; if it fails, report, keep the
counts (M8), ask guard-ai for dormant guards.
Files: `campusS4.ts`, S4 data (dog team with EW11, CR4 lip, las-tray, pg-cage as a pair bolt until EW4), tests.
Tests: unit common + 20 guards incl. 1 dog; e2e campus part 4: solo hot-aisle route completes the download; solo cannot
reach the baskets from the floor (pod roofs `noLedge`, rack tops); the riser ladder reaches the basket landing; co-op
leg-up, jam-and-pass at las-tray; the rear gate refuses one player and opens for two.
Done when: S1-S4 plays; perf result logged.

## Slice 5 - S5 the Old House and extraction
Files: `campusS5.ts`, S5 data (24 guards incl. 2 dogs; count superseded by G328 / G362: S5 has 26 at two players, 3-4 add
tagged extras (G331), cap 32 (G332); built by campus-greybox, ROADMAP Now row 9; enforcer reinforcements, CR6 pg-arch, CR7 light well, extract).
Tests: unit common + 24 guards, peak 30 alive <= 32 with `perStage` 2; e2e campus part 5: solo anteroom route grabs the
token and extracts; the light well is not reachable solo from the garden or the terrace; co-op rope down the well and
the dual takedown; CR6 refuses one player; full run S1-S5 solo and co-op (time logged against 30-45 min).
Done when: the full campus plays end to end solo and co-op.

## Slices E - engine work the later sections need (ours; after or beside slices 2-5)
| Slice | Item | First used | Size | Tests |
| --- | --- | --- | --- | --- |
| E1 | EW5 keypads with codes from intel (BMS hack sets the code flags) | S2 | M | unit (flag -> door unlock), e2e-sectorops |
| E2 | EW6 clear / frosted glass (DEC G45) | S2, S3, S5 | M | unit (sight / light / bullets per kind), light parity e2e |
| E3 | EW3 pair bolt (R2-PATHS design 2), then EW4 pair gate in Sector | S4, S5 | S / M | `sectorBoltPair.test.ts`, e2e host / client |
| E4 | EW8 breaker / timed isolator device | S1-S5 (replaces board switches) | M | unit, e2e lure |
| E5 | EW9 alarm-stage extras: lockdown doors (never a softlock), lights to full, response-team route, dog release | S2-S5 | M | unit (stage -> actions), e2e-sectorops |
| E6 | EW10 security desk in Sector (operator post; console loops cameras) | S3, S4 | M | unit, e2e |
| E7 | EW-L1 chunk loading, only if EW16 fails | - | L | load / unload e2e |
| E8 | Stealth over shooting (Michael ~10:10, items 1 + 14): `bulletproof` camera flag (shots ricochet; jam, cut power or slip the sweep) and `thermal` flag; move the S3 cam-view / S4 / S5 side tables onto the camera data (A95, A96) | S3-S5 | S | unit (shot -> ricochet, no kill), e2e-sectorops |
| E9-crate | Ammo (Michael ~10:20): no ammo inside sections (done 88f5c33a, `checkMapLayout`); one weapons-crate refill at each section start / connector checkpoint, each player once, tops up to the starting loadout never above, weapon ammo only, restart resets it, used state per player (prompt gone). Per-player use tracked on the host: Opus plans the net part first (protocol: ours is 31; ask the orchestrator for a number if a wire change is needed), Sonnet builds the crate model and data | S1-S5 (warehouseOps too) | M | unit (once per player, cap, restart), e2e-sectorops + e2e-coop |
| E10 | Armoured routes (item 10): bulletproof glass / doors, each with a quiet bypass (vent, hack, hang-down) named in data (A97); the glass half needs E2 | S4, S5 | M | unit, e2e-sectorops |
Guard-ai provides (dependencies, not our slices): GA1 squads and radio checks, GA2 talking pairs, GA3 posted guards
that hold but can be distracted, GA4 light investigations by 1-2 guards (relight if it lands), GA5 staggered radio
alerts, GA6 reinforcement tactics. Our slices only place guards and tag them; each section is re-checked when a GA
item merges. Camera fill over range (EG2) comes from `feature/camera-range`.

## The old Warehouse map (M11 "Keep both")
`warehouseOps` stays as it is and stays listed as a second Sector Ops map, never delisted (Michael ~01:25). campusOps
joins the Sector selector beside it once S1-S3 is playable (slice 3); `e2e-sectorops` keeps its Warehouse parts.
