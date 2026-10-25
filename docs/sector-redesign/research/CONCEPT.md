# Sector Ops redesign - concept draft (for SPEC.md)

Research agent, 2026-10-23 (overnight, Michael asleep: assumptions logged in section 6, no questions).
Inputs: BRIEF M1-M10, `docs/level-design.md` (LS), `docs/templates/map-spec.md`, `docs/design/scale-sheet.md`,
`docs/story.md`, `docs/archive/warehouse-redesign/SPEC.md` (old map), R2-PATHS.md (origin/feature/sector-fixes-r2-paths),
`research/CT-LEVELS.md` (its ten rules are followed here). ENGINE.md had not landed when this was written.
Frame as the old spec: x west to east, z south to north (+z north), y up, metres. All names are original (G6).

What worked in the Warehouse and is kept: a real building brief first, every guard with a job and an isolation moment,
cycles 25-45 s, ceiling voids and plant spaces as the high route, the C1 isolation-in-time check, connectors as
checkpoints. What failed: pockets and filler blocks to pass checks, 4.4 m co-op lips under 6.0 m roofs (no climb-up
headroom), solo tops in jump range of co-op lips (G267), cameras seeing past their zone, a dark-everywhere look.

---

## 1. The campus

**Saltmarsh Park, the research campus of Orrin Systems**, on the estuary edge east of Hollowmere's ring road (a new
Sector Ops site; not a campaign district). Orrin designs industrial control electronics. Its "Tidewater" relay
controllers are the failover hardware Halcyon Grid Services bought (story.md section 5: the failover that answers to
the Client). Night Shift is sent in to bring out a prototype controller, its firmware build logs and the signing key,
the proof of who can command the failover units. Guarding is contracted to **Larchmont Guarding** (armed: officers
carry pistols, the patrol crew rifles; story.md: they believe they protect a business). Tonight is the quarterly
key-ceremony night: two keyholders have the old strongroom open in the Old House, so security is doubled there, and a
courier is due at the data hall at 03:00 with replacement drives. That is why the campus is busy at 02:00.

Briefing (LANTERN, 4 lines, story rules):
"Evening. Saltmarsh Park. Orrin built the relay that switches the city's backup on."
"You want three things: the prototype board, the build logs and the key that signs them."
"Larchmont runs the guarding. Armed, bored, and tonight they have a ceremony to watch."
"Gate, offices, labs, data hall, then the Old House. Lights are on everywhere. Make your own dark."

**Objective chain** (each section's objective opens the next section's connector, as now: `SectorObjectiveKind`
hack / grab / download):
1. S1 Gatehouse: download tonight's visitor list and badge template from the gatehouse PC (download, 10 s): the
   cloned courier badge opens the staff entrance (C1).
2. S2 HQ: hack the building management (BMS) terminal in the facilities office: it holds the lab block's door codes
   and the lighting schedule (hack).
3. S3 Labs: grab the Tidewater prototype board from the prototype store (grab).
4. S4 Data hall: download the firmware build and signing logs from Orrin's build servers in the customer cage
   (download).
5. S5 Old House: grab the signing key token from the open strongroom during the key ceremony (grab), then extract at
   the boathouse jetty.

**Site plan** (ASCII, roughly 1 char = 2.5 m in x; footprints exact in the table). One map; sections load their
guards and devices through connectors (G186).

```
 z  70 +-- marsh fence ------------[EXTRACT boathouse jetty x -50..-40, z 60..66]--------- lake edge ----+
       |                      lake / reed bed                                                          |
 z  48 |   +===== S5 OLD HOUSE =====+          +================ S4 DATA HALL ================+       |
       |   | x -66..-26 z 18..48    |<== C4 ===| x -10..40 z 16..48  (hall 7.0 high, plant deck  |       |
       |   | 1960s brick, G + 1 +   | colonnade| 7.3, chiller roof)  generator compound east     |       |
 z  18 |   | roof, walled garden    | x-26..-10|                                               |       |
       |   +------------------------+ z 26..32 +======================^========================+       |
       |                                          service yard        C3 dock link x 20..28, z 0..16     |
 z   6 |      +====== S2 HQ ATRIUM ======+                  +========== S3 LABS ==========+             |
       |      | x -44..4  z -30..6        |==== C2 L1 =====>| x 10..64  z -30..0            |             |
       |      | 3 storeys + atrium 13.2 h | glazed bridge   | 2 storeys + test hall 9.0 h   |             |
 z -30 |      +============^==============+ x 4..10, z -14  +===============================+             |
       |                   C1 staff entrance vestibule x -24..-16, z -36..-30                           |
 z -36 |  +=========== S1 GATEHOUSE, STAFF CAR PARK, DELIVERY BAY  x -40..20  z -80..-36 =========+       |
 z -80 +--[gate x 8..14 + gatehouse]----------------- ring road (map edge) -----------------------------+
     x -70        -40           -10   0    10          30           50          70
```

| Section | Building | Footprint (m) | Storeys | In by | Out by (one-way: seals behind) |
| --- | --- | --- | --- | --- | --- |
| S1 | Gatehouse, staff car park, delivery bay | 60 x 44 | 1 (gatehouse roof 3.3; canopy 4.4) | Ring-road verge, dark SW corner | C1 staff entrance vestibule (badge door) |
| S2 | HQ offices round a full-height atrium | 48 x 36 | G 4.5, L1 +4.5, L2 +8.4, roof 12.3 (atrium to 13.2) | C1 | C2 first-floor glazed link bridge (card door) |
| S3 | Lab block: test hall, clean room, prototype store | 54 x 30 | G 4.5, L1 +4.5; test hall 9.0 clear | C2 | C3 dock link corridor (roller-door lobby) |
| S4 | Data hall with plant deck and generator yard | 50 x 32 | Hall 7.0 clear; plant deck 7.3; NOC mezz 3.6 | C3 | C4 covered colonnade to the Old House |
| S5 | Old House: executive suite, archive, strongroom | 40 x 30 | G 4.2, L1 +4.2, lead roof +8.4 with parapet | C4 | Extraction zone at the boathouse jetty |

Connectors are real lobbies with no guard, a glimpse of the next space (LS 3.8) and the checkpoint on the dark
floor. They seal behind (the existing connector cycle): a badge vestibule, a bridge card door, a roller-door lobby, a
colonnade gate. Walking time between them is the building's real distance; no zig-zag (LS 16.6.1).

---

## 2. The sections

Guard kinds in the code (`enemies.json`): officer (pistol), grunt (rifle), enforcer (plated, pistol), sniper (rifle),
dog (with a handler, `enemy.ts:1036`). The runner has no weapon: **no runners** (M1 "they should all have weapons").
No heavies (G155, armour comes with alarm stages). Dogs only S4-S5 (M10; see A2).

Per section: teach one new device, test it, combine it with the earlier ones (LS 6.1). Ramp:
S1 lights + cameras; S2 + keypads + alarm panels; S3 + lasers + glass; S4 + dog + mantrap + dual-custody cage;
S5 everything + armed response team + two dog teams.

### S1 - Gatehouse and staff car park (8 guards, est. 6 min, tension 2)

**Purpose.** The only vehicle way in: barrier, gatehouse (reception window, CCTV desk, kitchenette), a 60-bay staff
car park lit by column lamps, a delivery bay at the HQ's south-west corner, a smoking shelter, bin store and bike
store along the inner fence. Objective: the gatehouse PC (download, its window lets it run from the dark verge
behind the gatehouse within 4 m).

**Guards (8).**
| Role | Kind | Type | Reason |
| --- | --- | --- | --- |
| Gate officer | officer | post, gatehouse window | Works the barrier, waits for the 03:00 courier |
| CCTV officer | officer | post, rises to the kettle every ~40 s | Watches the two car-park cameras; kettle stop is his isolation moment |
| Car-park pair | grunt + officer | talking loop, ~42 s | Car break-ins last month: they check door handles and talk about it (barks) |
| Canopy doorman | officer | post under the staff entrance canopy | Badge check at the only staff door |
| Smoker | grunt | post in the smoking shelter | On his break; faces the car park, back to the bin-store lane |
| Fence patrol | grunt | back-and-forth inner fence to bin store, ~34 s | Fence line check after the break-ins |
| Delivery sentry | grunt | sweep at the delivery bay door | Waits for the courier with a cage trolley |

**Devices.** `cam-gate` on the barrier island (range 10 m, the barrier and the gatehouse door: the ANPR and
tailgating camera). `cam-park` on the HQ facade at 4 m (range 12 m, the staff entrance and the canopy approach,
not the whole car park). Alarm panel inside the gatehouse (where the officer would raise it). No lasers outdoors.

**Lighting.** Lit default: column lamps on photocells (unswitchable by day logic, LS 16.8.1) fed from one feeder
pillar in the bin-store lane: its breaker kills the west half of the car park (a lure: the fence patrol walks to it).
Lamps can also be shot. The canopy downlights are on the HQ's door circuit (switch inside the vestibule, so not
reachable from S1). Dark by reason: the verge behind the gatehouse, the bin-store lane (no lamps behind the fence),
the bike store, under the trees on the west bank. The shadow route is mostly made by the player (the breaker, one
column shot).

**Routes.**
- Stealth: verge, behind the gatehouse (download through the window), bin-store lane, breaker off, the dark west
  rows, delivery bay side door when the sentry turns, round to the vestibule.
- Loud: through the barrier, take the doorman at the canopy, straight in; cam-gate raises the first alarm.
- Co-op only: **boost onto the entrance canopy** (4.4 m top, solid aluminium soffit: no glass, so no sight from below,
  G45): overwatch of the doorman (drop takedown), then in through the vestibule's clerestory night-purge vent (open
  for night cooling) straight into C1, past cam-park. Solo cannot: the canopy stands on
  four slim round columns with internal drainage, no wall, no downpipe, kerbed drop-off bay (no cars parked under it:
  car roofs at 1.5 m would be solo jump tops). Solo bypass: the stealth route to the same vestibule.

**Observe and plan.** From the verge the player sees the gate officer, the CCTV officer's kettle cycle through the
gatehouse glass, the car-park pair's loop and the smoker. Learns: which half of the car park one breaker kills, and
that cam-park covers the canopy, not the rows.

### S2 - HQ atrium and offices (12 guards, est. 7 min, tension 3)

**Purpose.** Orrin's head office: reception and café round a 13.2 m atrium with balconies on L1 and L2, open-plan
offices off it (PIR lighting, mostly off at 02:00), meeting rooms with clear glass fronts and a frosted manifestation
band at 0.9-1.5 m, facilities office and comms room on L1, two enclosed fire stairs and a feature stair in the atrium.
Objective: hack the BMS terminal in the facilities office (L1, north-east).

**Guards (12).**
| Role | Kind | Type | Reason |
| --- | --- | --- | --- |
| Reception officer | officer | post, desk facing the turnstiles | Front of house; second monitor for the two lobby cameras |
| Lobby patrol | grunt | loop reception, café, lift lobby, ~40 s | Ground-floor round |
| L1 balcony | officer | back-and-forth along the balcony, ~36 s | Looks down into the atrium at each end stop |
| L2 balcony | grunt | back-and-forth, opposite phase, ~36 s | Covers the L1 balcony across the void (LS 4.5) |
| Coffee pair | grunt + officer | talking pair at the L1 breakout kitchen, one refills every ~45 s | Their break; they talk about the ceremony at the Old House (story leak) |
| Facilities officer | officer | post at the BMS desk, walks to the plotter every ~40 s | Night facilities duty: he sets the lighting schedule |
| Comms checker | grunt | loop L1 corridor, comms room UPS, back, ~38 s | Reads the UPS panel each round |
| Stair tour | officer | loop clocking both L2 fire doors, ~44 s | Clocking round (investigator on reports) |
| L2 lift sentry | grunt | sweep at the L2 lift lobby | Watches the corridor to the executive meeting suite |
| Bridge officer | officer | post at the C2 bridge card door | The bridge to the labs is the only internal link |
| Mailroom guard | grunt | post at the rear goods door, ground | Receives the courier's paperwork |

**Devices.** `cam-turnstile` (range 8 m, the turnstile line: tailgating). `cam-lift-g` (range 8 m, the lift
lobby). `cam-bridge` over the C2 card door on L1 (range 9 m, the bridge door and its landing). Keypad on the
facilities office (code: overheard from the coffee pair, or read on the comms-room handover board; engine: A4).
Alarm panels at the reception desk and the L1 bridge landing (guard posts). No lasers yet.

**Lighting.** Lit default: atrium pendants (switched on the reception lighting panel and by the BMS schedule),
balcony downlights, corridor night level (25%) on every floor, lit kitchen, lit facilities office. Players cut:
the L1 corridor circuit at its switch by the stair door; atrium pendants by shooting (each a visible fixture) or at
the reception panel (lure: the reception officer walks to it); the meeting-room lights are already off (PIR).
Dark by reason: closed meeting rooms and open-plan offices (PIR off), the fire stairs (emergency lights only, small
pools at the landings), the comms room (equipment LEDs), the roof plant room.

**Routes.**
- Stealth: C1, the post room, the ground-floor fire stair, the L1 dark open-plan offices along the north side,
  meeting rooms (crouch under the frosted band), keypad, facilities office; out along the L2 offices to the far fire
  stair and back down to the bridge landing (a loop: two stairs, two floors).
- High: the roof: fire stair bulkhead (LS 16.2.5), across the roof past the atrium roof-light (glazed smoke vent:
  look-down only, overwatch of every balcony), down the far bulkhead to the L1 bridge landing.
- Loud: through the turnstiles (cam-turnstile), up the feature stair, push to the facilities office.
- Co-op only: **boost and belay at the atrium planter** - a 1.0 m solid planter upstand on the L1 balcony edge makes a
  4.4 m lip over the ground floor's dark café seating (atrium: clear air to 13.2, so the climb-up has room). One
  player boosts the other onto the planter, who belays the partner up the 4.4 m by rope (`TEAM.rope*`, 2.2-6.0 m).
  Solo cannot: no wall below the planter (it overhangs on the balcony slab nose), the café has only 0.75 m tables and
  they sit over 4 m away in plan (A5 reach check). Solo bypass: the fire stair.

**Observe and plan.** From the dark post room door: reception, lobby loop and cam-turnstile's patch. From the L1 fire
stair door (vision panel): both balconies and their opposite phase, the coffee pair, the facilities office through
its glass. The player learns where the keypad code comes from and that the bridge officer is the exit pinch.

### S3 - Lab block (16 guards, est. 8 min, tension 3-4)

**Purpose.** Ground: the test hall (9.0 m clear, crane rail, two walk-in chambers: an environmental chamber 6 x 8 x
4.4 high and a shielded EMC room), burn-in racks running an overnight test, goods-in dock at the north end, gas
cage outside the east wall. L1: a glass viewing corridor along the test hall, the clean room (gowning room,
pass-through), the prototype store, a write-up office and the block's own security room. Objective: grab the
prototype board in the prototype store (L1).

**Guards (16).**
| Role | Kind | Type | Reason |
| --- | --- | --- | --- |
| Bridge landing officer | officer | post at the C2 arrival | Checks cards from the HQ side |
| Viewing-corridor pair | officer + grunt | talking back-and-forth, ~40 s | The prototype is in the building: doubled round |
| Gowning sentry | grunt | post at the clean-room pass-through | Nobody enters the clean room at night |
| Store keyholder | officer | post at the prototype store hatch | Holds the store key; signs out the board at 06:00 |
| Test hall patrols (2) | grunt x 2 | loops round the chambers, opposite phase, ~42 s | Floor round; cover each other at the chamber ends |
| Burn-in watcher | grunt | post at the burn-in racks, walks to the log desk every ~30 s | Logs rack temperatures every five minutes (real overnight test) |
| Dock officer | officer | post at the dock desk | Receives the courier at 03:00 |
| Dock patrol | grunt | back-and-forth dock to gas cage, ~35 s | Checks the gas cage padlock |
| Stair tour | officer | loop clocking both stairs, ~44 s | Clocking round |
| Security room operator | officer | post, kettle stop every ~40 s | Watches the lab cameras |
| Write-up officer | officer | post in the write-up office, faces the corridor glass | Reads the test reports out loud on the radio (barks) |
| East yard patrol | grunt | back-and-forth outside the east windows, ~38 s | Glimpses in through the high windows; finds bodies left by them |
| Shift supervisor | enforcer | long loop between the posts, ~45 s | Visits every post; first responder to a report |
| Crane bay sentry | grunt | sweep at the test hall's west door | The hall's door from the HQ side |

**Devices.** First lasers: a **beam curtain** across the clean-room pass-through (protects the clean room from
anyone not gowned: real cleanroom intrusion detection) and **two beams across the prototype store's inner aisle**
(protect the shelf; reset panel visible from the door, CT-LEVELS rule 5). Cameras: `cam-viewing` (range 10 m,
the viewing corridor's store end), `cam-dock` (range 10 m, the dock door). Keypads on the store and the security
room (codes from the S2 BMS hack). Alarm panels at the dock desk and the security room. Clear glass (G45) is the new
read: the viewing corridor sees the whole test hall, and the hall sees the corridor.

**Lighting.** Lit default: the test hall high-bay LEDs in three rows (one switch bank by the west door, a lure for
the crane bay sentry), the viewing corridor (lit, glass both sides), the burn-in racks' own task light, the lit
dock. Players cut: the high-bay rows (switch bank, shot fittings at 8.5 m, jammer), the corridor at its two door
switches. Dark by reason: the chamber roofs (no lights above 4.4: nobody works there), the EMC room (shielded, lights
off when not testing), the gas cage, the east yard between the windows, the write-up office side room.

**Routes.**
- Stealth: C2, the dark west door, round the EMC room in the hall (high-bay row 1 off), under the viewing corridor
  (guards above do not look down well, G44, and glass sight works both ways: a timing problem), L1 by the north
  stair, the store from its back corridor (keypad), the beams (jammer or crouch the gap at the reset).
- High: the crane rail maintenance walkway (fixed caged ladder at the south-west, LS 16.2.1 plant ladder: approved as
  L3 for the warehouse) along the hall at 6.0 to the north stair landing window. Overwatch of both hall patrols.
- Loud: kill the high-bay lights, run the viewing corridor, take the keyholder, set off the store beams, run.
- Co-op only: **boost onto the environmental chamber roof** (4.4 m, refrigeration plant on top, clear air to 9.0).
  The chamber's own roof ladder is behind a **locked anti-climb ladder guard** (a real padlocked steel door on the
  ladder: standard practice). From the roof a dark step across onto the north wall's steel escape gallery (4.5, door
  into the north stair; no wall jump reaches it: 4.5 over the floor), past the viewing-corridor pair.
  Solo cannot: no ladder, smooth insulated panel walls, no rack or bench within 4 m of the lip (A5). Solo bypass:
  the stealth route to the same north stair.
- Co-op dual takedown: the viewing-corridor pair (one player each end); solo waits for their split at the store end.

**Observe and plan.** From the C2 landing glass the player sees the whole test hall: both patrols, the burn-in
watcher and the dock. From the north stair half-landing: the viewing corridor pair, the write-up officer, the store
keyholder. Learns: which lights the switch bank kills and who comes to fix them, where the beam reset is.

### S4 - Data hall (20 guards incl. 1 dog, est. 9 min, tension 4)

**Purpose.** Orrin's own small data hall: a 50 x 32 m single-storey hall (7.0 m clear) with hot-aisle containment
pods (pod roofs 3.0, overhead cable baskets on ladder racks at 4.4, slab 7.0), a mantrap entrance, a NOC room on a
3.6 m mezzanine with a glass window over the hall, UPS and battery rooms, a loading dock, a plant deck at 7.3 with
chillers, and a fenced generator compound to the east. The customer-style mesh cage holds Orrin's build servers.
Objective: download the build and signing logs at the cage terminal.

**Guards (20).**
| Role | Kind | Type | Reason |
| --- | --- | --- | --- |
| Dog team | grunt handler + dog | handler loop round the generator compound, dog heels, ~44 s | Diesel was stolen from the tanks twice (barks) |
| Yard gate officer | officer | post at the service-yard gate | Lets the courier van in |
| Mantrap officer | officer | post at the mantrap desk | Admits one at a time; checks the courier |
| Security room pair | officer + enforcer | talking post at the monitors | Operator and site supervisor |
| Hall patrols (4) | grunt x 4 | two cold-aisle loops, two hot-aisle back-and-forths, ~40 s | Rounds; hot-aisle checks read the pod thermometers |
| Cage keyholder | officer | post at the cage gate | Dual-custody cage: he holds one key |
| Battery room checker | grunt | loop UPS room, battery room, ~36 s | Reads the cell voltages |
| Plant deck patrol | grunt | back-and-forth along the chillers, ~40 s | Chiller alarm earlier tonight |
| NOC pair | officer x 2 | talking post at the NOC window | Watch the hall and the screens |
| Stair tour | officer | loop clocking the two fire stairs, ~44 s | Clocking round |
| Dock pair | grunt x 2 | work the dock: unload the 03:00 drives (staggered) | The courier delivery |
| Colonnade sentry | grunt | post at the C4 gate | The Old House is closed to everyone tonight |
| Roaming investigator | enforcer | long loop, first to any report | Mobile supervisor |

**Devices.** Mantrap at the main entrance (two interlocked doors: only one open at a time; the stealth way avoids
it). Cameras: `cam-mantrap` (range 8), `cam-cage` (range 9, the cage gate and terminal), `cam-dock` (range 10).
Lasers: a beam pair across the cable-basket run where it passes over the cage (real: overhead intrusion detection
over a high-security cage). Keypads on the battery room and the plant deck door. Alarm panels in the security room,
the mantrap desk and the dock. Dual-custody cage lock: see the co-op route.

**Lighting.** Lit default: the hall's aisle LEDs (cold aisles bright, hot aisles inside the pods dim), the NOC, the
dock floodlight, the generator compound floodlights. Players cut: cold-aisle rows at the hall's lighting panel by the
mantrap (lure: the mantrap officer), the compound floodlights at its distribution board (lure: the dog team, which
then searches with the dog's nose: noise and scent, not light), the dock lamp by shooting. Dark by reason: above the
pods (nobody works at 3-7 m), the plant deck at night (task lights only at each chiller), the cable riser, the
battery room (lights off, auto on entry would be engine work: A6).

**Routes.**
- Stealth: C3, the dock pair's gaps, the dark battery room, the hot aisles inside the pods (crouch, the patrols'
  checks are on a timer), the cage from its back corner, terminal; out by the UPS corridor to the colonnade.
- High: fire stair bulkhead to the plant deck (LS 16.2.5), along the chillers past the deck patrol, down the caged
  plant ladder inside the cable riser (LS 16.2.1), out at the riser door at floor level beside the cage.
- Loud: the mantrap by force (alarm 1), straight down the cold aisle, the cage.
- Co-op only (1): **boost onto the cable baskets** (4.4 m lip, slab 7.0: clear air 2.6 m, enough for the 1.9 m
  climb-up; A5) above the pod roofs, a dark run over the hall to the cage, then the beam pair (jam-and-pass: one jams,
  one crosses, CT-LEVELS section 4), hang-down into the cage. Solo cannot: pod roofs (3.0) are suspended ceiling tiles
  (`noLedge`, collapse in the fiction: not standable), no ladder rack reaches the floor. Solo bypass: the hot aisles.
- Co-op only (2): **dual-custody cage gate** (two key switches 8 m apart on the cage's two gates, a real two-person
  rule for high-security cages; the course's pair gate, window 1.0 s: a sprint covers 4.2 m). It opens the cage's rear
  gate. Solo bypass: the front gate after the keyholder is dealt with (his key opens it alone).

**Observe and plan.** From the C3 roller-door lobby: the dock pair's cycle and the yard. From the battery room door
(dark): two hall patrols' aisles. From the plant deck through the NOC roof light: the NOC pair. The player learns
the dog team's loop from the noise of the dog (heard before seen).

### S5 - The Old House (24 guards incl. 2 dogs, est. 10 min, tension 5, the set piece)

**Purpose.** Orrin's 1960s founding building: two storeys of brick round a stair hall with a first-floor gallery,
the boardroom and CEO suite on L1, a records archive (rolling stacks) on L1 with a document lift down to the
strongroom anteroom, the original defence-contract strongroom on the ground floor (open tonight for the key
ceremony), a security control room for the armed response team, a walled garden and a lake terrace, a lead roof with
a 1.1 m parapet (roof access by the stair bulkhead). Objective: the signing key token in the strongroom; then
extraction across the terrace to the boathouse jetty.

**Guards (24).**
| Role | Kind | Type | Reason |
| --- | --- | --- | --- |
| Armed response team (4) | enforcer x 4 | post in the control room; one walks the hall every ~45 s | Standing reaction force for the ceremony; deploys at alarm 1 |
| Dog teams (2 x 2) | grunt handler + dog, x 2 | loops: walled garden, lake terrace, ~44 s | Grounds patrol for the ceremony night |
| Keyholders | officer x 2 | talking post in the strongroom anteroom | Two-person rule: neither may be alone with the token |
| Auditor's escort | officer | back-and-forth anteroom to the document lift, ~30 s | Escorts the audit papers between lift and table |
| Entrance hall officer | officer | post facing the front door | Front door |
| Gallery patrols (2) | grunt x 2 | back-and-forth round the gallery, opposite phase, ~40 s | Overlook the stair hall: the hostile vantage |
| Boardroom post | officer | post | Board papers laid out for 08:00 |
| CEO suite pair | officer + grunt | talking post at the suite door | The CEO's safe and laptop |
| Archive patrol | grunt | loop through the stacks, ~42 s | Archive round |
| Roof marksman | sniper | sweep from the roof walk over the lake approach | Overwatch for the response team |
| Terrace gate post | grunt | post at the terrace gate | Lake side door |
| Service wing patrol | grunt | loop kitchen, plant, back door, ~38 s | Service round |
| Colonnade arrival officer | officer | post at the C4 end | Checks anyone from the data hall |
| Response van driver | grunt | post at the van by the north lane | The van is the team's ride: it overlooks the jetty path |
| Stair tour | officer | loop clocking the back stair and the bulkhead, ~44 s | Clocking round |

**Devices.** Everything learnt before, each with its reason: `cam-hall` (range 10, the front door and the stair
foot), `cam-gallery` (range 9, the archive door), `cam-terrace` (range 12, the terrace gate and lawn), lasers across
the document-lift landing door in the anteroom (nobody uses the lift during the ceremony, so it is armed), keypads on the archive and the control room, alarm panels at the
control room, the anteroom and the terrace gate. Dual-control archive cage (pair gate) to the document lift.

**Lighting.** Lit default: the stair hall chandelier and gallery wall lights (one switch by the front door; the
chandelier can be shot: a real CT beat), the lit boardroom and anteroom, terrace bollards and garden uplights on a
timer at the service wing board, the roof walk unlit except the marksman's position light. Players cut: the gallery
circuit (switch at each end), the garden uplights (board in the service wing: lure the service patrol), the
chandelier (shoot: draws both gallery patrols to look down, a lure). Dark by reason: the archive stacks (lights per
aisle, off), the walled garden's west wall, the boathouse path under the trees, the roof behind the chimneys.

**Routes.**
- Stealth: C4, the service wing back door, the service stair to L1, the dark archive, the dual or the keypad door
  into the anteroom side, the token while the escort is at the lift; out by the terrace with the uplights off,
  between the dog teams, the jetty.
- High: the stair bulkhead to the lead roof, past the marksman (behind him, chimney stacks as cover), down the
  service wing roof's low side to the walled garden (2.8 m wall, hang-drop).
- Loud: front door, the response team deploys (alarm 1 sends them), fight to the strongroom, run for the jetty.
- Co-op only (1): **dual-control archive cage** (two key switches 9 m apart, the strongroom's paper twin of the
  two-person rule): opens the document lift, which drops one player into the anteroom's back (the lift car is dark):
  the token while the partner covers. Solo bypass: the anteroom side door after the escort's cycle.
- Co-op only (2): **belay down the light well** - from the roof the partner lowers the other 6.0 m into the inner
  light well behind the strongroom (rope max 6.0) for a takedown from behind on the keyholders (dual takedown, the
  climax). Solo cannot: 6 m drop, no downpipe (rainwater runs inside), the light well has no door (it is a 1960s
  ventilation court). Solo bypass: the anteroom from the hall.

**Observe and plan.** From the colonnade end: the service wing, a dog team's loop across the garden. From the archive
(dark): the gallery patrols and the anteroom through the clear glass of the audit room. From the roof bulkhead: the
marksman's sweep and both dog teams. The player learns the response team only deploys on an alarm: a ghost run never
meets them.

**Run time.** 6 + 7 + 8 + 9 + 10 = 40 min plus connectors (about 1 min each): 30-45 min (M7) on a careful run.

---

## 3. Flow

- **Loops.** S1 the car park rows round the gatehouse; S2 two fire stairs and two floors; S3 the test hall round the
  chambers and the viewing corridor above; S4 cold aisle, hot aisle, UPS corridor; S5 the gallery round the stair hall
  and the garden round the service wing. Every shadow route has one (LS 3.4).
- **Vantages.** One dark vantage per volume (the warehouse L11 / L15 rule): listed per section above. Landmarks: the
  Old House roof and its lit boardroom are visible from the S3 north stair landing and the S4 plant deck (a glimpse of
  the set piece, CT-LEVELS section 6).
- **Sightlines.** Long ones on purpose: the atrium void (S2), the viewing corridor glass (S3), the cold aisles (S4),
  the terrace lawn (S5). Decision points at the doors and corners between them.
- **Escalation** (the existing stages, `SECTOR.alarmMax` 3; G125: never ends the run):
  - Stage 1 (a camera, a beam, a guard at a panel): guards search, the section's lights go to full (security mode:
    switches undone, breakers stay off, shot lamps stay dark); in S5 the response team deploys.
  - Stage 2: lockdown: the section's card doors on the critical path lock (a loud and a solo way stay open: never a
    softlock); reinforcements `perStage` 2 come in at the section's reinforce points; in S4-S5 the handlers release the
    dogs (they track by scent to the last seen spot).
  - Stage 3: the armed response team (enforcers) from the gatehouse van; helmets on (G155).
  - The stage carries across connectors (as now): a loud S2 makes S3 harder.
- **Guards interact** (CT-LEVELS rule 7): talking pairs in every section; a fixer for every cut circuit; the shift
  supervisor and the roaming investigator visit posts (a missing guard on his round raises a search); radio checks.

---

## 4. Engine fit notes (flags for ENGINE.md and the spec)

- **Climb-up headroom.** A 4.4 m lip needs clear air to about 6.2-6.3 m (`climbRoom`: top + 0.1 to top + 1.8, 0.45 m
  + `HANG.out` in). Every co-op lip above sits in a tall volume: canopy (open sky), atrium (13.2), test hall (9.0),
  data hall (7.0: 2.6 m over the baskets, the tightest; confirm in greybox, fallback: slab 7.5). The S5 light well
  is a rope descent, no climb-up.
- **Solo jump reach** (`tests/helpers/soloJumpReach.ts`, take it from origin/feature/sector-fixes-r2-jump):
  `LEAP.vy` 5.6, gravity 18: apex 0.87 m; `FALL_GRAB.maxAbove` 2.35. A running jump catches a 4.4 lip only from a top
  at 1.18 m or higher; from a 1.8 m mantle top it reaches about 3.9 m across. Rule for the spec: **no standable top
  1.2 m or higher within 4.0 m in plan of a co-op lip**.
- **Wall jump from low tops.** `WALL_JUMP` 2.7-3.8 m over the feet with a wall within 1.0 m: a 0.75 m desk or a 1.5 m
  car roof under a wall puts a 4.4 lip in solo reach. Rule: **no standable surface 0.6-1.7 m within 1.0 m of a wall
  below a co-op lip**, and co-op lips have no wall below (canopy, planter overhang, chamber side away from benches,
  baskets over open aisles).
- **Mantle 1.8 on `noLedge`.** Planters, pod roofs, desks, crates under 1.8 are mantled alone; over 1.9 they become
  lips unless `noLedge`. Pod roofs must be `noLedge` and not standable (or above 1.9 and `noLedge`, still mantled if
  under 1.8: keep them at 3.0).
- **Glass (G45) is decided, not built** (LS 12.2). `windowAt` and fence panels exist (fences pass sight and bullets).
  Clear glass partitions in S2-S5 need a piece that blocks movement and bullets and passes sight and light; frosted
  bands and blinds need one that passes light only. **New engine work** (or greybox clear glass as fence panels and no
  frosted band).
- **Guard cap.** S5 at 24 plus `perStage` 2 x `alarmMax` 3 = 30, under `SECTOR.maxAlive` 32 and the co-op snapshot
  `MAX_ENEMIES` 32 (`perStage` 3 would be 33: keep 2 in S5). Dogs count. The perf run at 12 / 16 / 24 awake (ROADMAP
  guard cap) is not done: **perf risk at 20-24**, measure on the laptop GPU before S4-S5 are dressed; do not cut the
  count (M8).
- **Map size.** About 140 x 150 m of campus in one map: light bake, ambient grid and nav build area are far larger than
  the 48 x 36 m warehouse. Confirm build time and memory; fallback: each section its own map chunk swapped by the
  connector (engine work).
- **Nav layers.** S2 has ground, L1, L2, roof (4 surfaces per column, more with the planter and stair landings): set
  `MapDef.navLayers` 5. Nothing below y -1.5 (no basement: the strongroom is on the ground floor for that reason).
- **Needed, not in Sector Ops today:** keypads (course `CourseDef` flags only), pair gates (course `PairGate`, window
  `PAIR_WINDOW`), alarm-stage lockdown doors, lights to full on alarm, dogs released on stage 2 (dogs and handlers
  exist), objective kinds stay hack / grab / download. Motion-sensor (PIR) lights are optional (A6). Cameras use
  per-device `camRange`; the camera-range job sets the default cut.
- **R2 lesson.** Team doors need no geometry if they are pair gates; pockets under low roofs fail on headroom. Every
  co-op lip gets the unit reach test (LS 15) and an e2e climb-up before the spec calls it done.

---

## 5. Proposed loosenings (for Michael; never applied)

| # | Rule | Proposal | Why |
| --- | --- | --- | --- |
| P1 | LS 3.1 dark entry vantage | A vantage is out of every guard's view by darkness **or** by occlusion (a vision panel, a stair door, a lit room seen from a dark one) | A lit site has few dark doorways; the vantage's job is safety and sight |
| P2 | LS 3.5 darkness, cover or hide spot every 4-8 m | Count a light the player can cut from the route as a stepping stone | M1 "the player may have to make shadows" |
| P3 | LS 5.1 darkness only where nobody works | Keep, and add: the default is a working site's night lighting (security, corridor night level, lit task areas); dark only with a reason (PIR off, plant, closed rooms, unlit yards) | M9 "lit like a real site" |
| P4 | LS 5.2 every lit chokepoint darkened two ways and avoided one way | Darkened one way (breaker or shot) **or** crossed by timing a guard's turn, when the chokepoint is a deliberate test | Photocell car park columns and the S3 viewing corridor are real lit crossings |
| P5 | LS 4.4 isolation moment alone, in the dark, unwatched | Alone and unwatched; the dark may be player-made (a lamp within reach that can be cut) | Lit work posts (the gatehouse, the NOC) |
| P6 | LS 15 darkness test at each vantage and dark pocket | Test lit vantages for "out of sight", dark ones as now | Follows P1 |
| P7 | LS 11.6 co-op verbs boost, human ladder, dual takedown | Add the belay rope, hang-down, jam-and-pass and the pair gate (two key switches) | All exist in the engine or the course; CT's co-op set (CT-LEVELS section 4) |
| P8 | LS 11.2 no locked-door teases | Allow a visibly dual-control door (two key switches) and a padlocked ladder guard | Real security hardware with a stated owner (16.3.5) |
| P9 | Warehouse L1-L15 (approved for the warehouse, G266) | Carry them to the campus, notably L1 / L2 (routes per section), L3 / L12 (plant ladders), L8 (co-op band with G151), L9 / L10 (greybox deliverables), L11 / L15 (vantage per volume) | Same prototype stage, same mode |
| P10 | LS 4.2 no two adjacent spaces with the same patrol mix | Per section, not per space | Five big sections of 8-24 guards each |

---

## 6. Assumptions (for BRIEF A-numbers; each with its undo)

- A1 Company, site and guard firm names are new (Orrin Systems, Saltmarsh Park, Larchmont Guarding, Tidewater): a
  Sector Ops site, not a campaign mission. Undo: rename, or move the site into a story district.
- A2 Dogs in S4-S5 against G155 (no dogs in co-op missions): M10 is newer and Sector Ops is not the campaign (G185).
  Undo: drop the dog teams, replace each with a grunt patrol.
- A3 No runners (unarmed) and no heavies (G155); armour only on the response team (enforcers). Undo: swap kinds.
- A4 Keypad codes are found in the level (overheard, a handover board, the BMS hack), not typed: a keypad is a
  locked door that opens once the code flag is set (course model). Undo: plain locked doors with keys.
- A5 Every co-op lip has the two reach rules in section 4; café tables, benches and car bays are kept 4 m clear.
- A6 Lights are switched, breakered or shot; no motion-sensor lights in the first build. Undo: add PIR lights later.
- A7 Guard counts 8 / 12 / 16 / 20 / 24 (M8), `perStage` 2 in every section.
