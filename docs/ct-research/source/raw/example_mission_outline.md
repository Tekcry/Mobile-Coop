# Example Mission Outline - "Load Test"

**About this outline**
- **Purpose.** It proves the bible, template and process work. It was produced by following LEVEL_DESIGN_PROCESS.md steps 0-13, filling MISSION_TEMPLATE.md, and reviewing against LEVEL_REVIEW_CHECKLIST.md. The review results are recorded at the end (§16).
- **Originality.** The mission is wholly original: a modern colocation data centre at night. It contains no names, places, characters or layouts from any existing game.
- **Real-world grounding** comes from the research notes on real security and architecture: data-centre services, mantraps, two-person rules, alarm chains, CCTV ranges, egress codes and scale.

---

## 0. Header
| Field | Value |
|---|---|
| Mission working title | Load Test |
| Version / date | v1.0 example |
| Owner(s) | Example (all roles simulated) |
| Campaign position | Mission 3 of 8 (assumed) |
| Target play time (average pair) | 45 min |
| Design decisions relied on (decided 2026-10-18; see OPEN_QUESTIONS) | D-01 modern day; D-02 escalating alert tiers + one mission hard rule; D-03 30 s revive, 2 per mission, encounter checkpoints; D-04 scored (non-lethal rewarded, no forced kills); D-05 lethal automated defences only at military/private compounds (none here); D-06 proximity voice optional modifier, off by default; D-07 heightened athletics allowed (this mission uses Leg-Up, Ledge Relay, Belay Line, Drop Line, Stack; no Partner Launch needed); D-09 two humans; D-11 identical characters, complementary kits; D-12 partner beacon + world pings, no partner marker, static floor plan only (no partner position) |
| Review gate status | All gates passed (see §16) |

---

## 1. Premise
- **Pitch.** Two operatives slip into a working colocation data centre during a scheduled generator load test. They copy a blackmail archive that a private intelligence broker hides in a leased server cage, without the broker ever learning it was touched.
- **Story context.**
  - The broker leases a small cage at "Fenwick Lane Data Centre" (fictional), a mid-sized colocation site on an industrial estate.
  - Leaked invoices show the broker pays for a nightly backup to the site's secure media vault.
  - If the broker suspects interference, the archive is moved and its victims lose any chance of evidence.
- **Why two operatives.**
  - Cage access at this site needs two separate staff credentials under the site's two-person rule for high-security cages.
  - The media vault uses dual control: a combination lock at the door, plus a remote release that security staff grant after checking the requester on camera.
  - Nobody can satisfy either alone.
- **Stakes.**
  - Success: the evidence is copied silently.
  - Failure: the broker is alerted, the archive is wiped remotely, and the source who leaked the invoices is exposed.
- **Tone.** A tense, quiet professional heist in a building that never sleeps. It is loud and cold in the halls and empty in the offices. Non-lethal play is expected; the staff are bystanders.

---

## 2. Real-world facility

### 2.1 Facility type and day-in-the-life
- **Type.** A Tier III colocation data centre: redundant power and cooling, and maintainable without shutdown.
- **What it does:**
  - Rents space, power and cooling to customers in shared halls, private cages and cabinets.
  - Runs a network operations centre (NOC) that watches power, cooling and alarms 24/7.
  - Receives equipment at a loading dock. New hardware is staged and built up in a build room before installation.
  - Keeps backup tapes in a secure media vault.
  - Tests its standby generators monthly under load.
  - Escorts customer visitors and logs every access.
- **Who works there on the mission night (02:00-03:30):**

  | Group | Numbers |
  |---|---|
  | Security officers | 3: reception and mantrap desk, security control room, roaming tour |
  | NOC engineers | 2 |
  | Generator contractor crew | 3: lead, technician, fuel-system technician |
  | Remote watcher (offsite) | 1, employed by the broker; sees only the broker's own cage camera |

- **Day-in-the-life (the mission night):**
  - **Night shift:** 22:00-06:00. The roaming officer runs a checkpoint tour every 30 min, with a 5-minute window per checkpoint.
  - **Load test at 02:30:** the contractor crew transfers the building onto generators for 40 minutes. The generator yard gets very loud and the yard floodlights go on.
  - **NOC engineers** are busy watching power transfer during the test, so screens show the power dashboards, not cameras.
  - **No deliveries at night.** The loading dock is closed but staffed by the contractors, whose van is parked there.
  - **Unusual today.** Cooling in Data Hall 2 is being rebalanced, so half its overhead lights are on manual "maintenance on" and a temporary floor-standing fan unit roars at the hall's east end.

### 2.2 Security profile
- **Tier.** Medium-high:
  - criticality: many customers' services;
  - symbolism: low;
  - population: low at night;
  - size: medium;
  - threat: targeted theft and insider risk.
- **Primary assets.** Customer equipment in data halls and cages; the media vault (tapes); the meet-me room (network interconnects).

| Layer | Deter | Detect | Delay | Response |
|---|---|---|---|---|
| Beyond perimeter | Lit approach road, no signage naming the site's customers | Two fixed cameras on the access road (detect range) | - | Control room calls the roaming officer |
| Perimeter | 2.4 m security fence; one vehicle gate; pedestrian turnstile with an adjacent swing gate | Fence-mounted intrusion sensors (zones F1-F6), PTZ camera on the yard | Fence and gate | Officer dispatched; control room tracks on PTZ |
| Site | Gatehouse lit at night; bollards | Cameras on the dock and generator yard; motion lighting on the walkways | Internal fence around the generator yard | Officer check within ~4 min |
| Building | Single public entrance through reception | Door contacts on every external door; dual-technology motion sensors in corridors (armed after 23:00 in the office wing only); cameras at the entrance (identify range) and corridors (recognise range) | Mantrap at reception (one person per cycle, card + PIN); card readers on halls | Control room can lock down doors remotely; calls police after confirmation |
| Asset | Customer cages: mesh walls to the deck with lockable doors; broker's cage has its own camera | Hall cameras (observe range along aisles); motion-activated lighting zones in halls; cage door contacts; vault door contact and vibration sensor | High-security cages: two-person rule (two staff badges within 10 s); vault: combination lock + remote release from security control; time-logged access | Officer to the hall within ~2 min; customer notified by the NOC |

- **Access control:**
  - Office wing: card.
  - Data halls: card + PIN.
  - High-security cages: two staff cards presented within 10 s, logged.
  - Media vault: door combination + remote release granted from security control after camera verification.
- **Two-person rules (real-world rationale).** High-value cages and the media vault use dual control, so no single insider can remove customer data. This mirrors the "no-lone zone" and two-person integrity practices used for high-value assets.
- **Known weaknesses on the night (each with a cause):**
  1. During the load test the NOC watches power dashboards. Camera monitoring falls to the control-room officer alone. *Cause: staffing for the test.*
  2. Data Hall 2's maintenance lighting is on manual, so motion-lighting alerts there are suppressed. *Cause: cooling rebalance.*
  3. The contractors propped the generator-yard personnel gate open with a fuel can to save swiping in and out. *Cause: staff habit.*
  4. The office-wing roof hatch to the chiller deck has a door contact that was bypassed (zone bypass) after false alarms in a storm last week, and the fault ticket is still open. *Cause: maintenance backlog.*
- **Alarm chain:**
  1. A single sensor trip is logged as "check".
  2. The control-room officer reviews the linked camera (30-60 s).
  3. If unclear, the roaming officer is sent (2-4 min).
  4. A second, adjacent zone tripping within 2 min means a confirmed intrusion: Alert Tier 2, and the control room locks down the halls.
  5. Police are called on confirmation; their arrival is outside the mission time.
- **Control room.** On the ground floor beside reception, staffed by one officer. It can lock and unlock doors, pan cameras, grant the vault remote release, and radio the officers.

---

## 3. Objective chain

| # | Tier | Objective | How players learn of it | Where | Co-op dependency | Fail state |
|---|---|---|---|---|---|---|
| 1 | P | Get inside the secure building | Briefing | Perimeter → building | Reach (Leg-Up + Ledge Relay onto the chiller deck) | - |
| 2 | P | Obtain two staff cage credentials | Briefing; staff routines overheard | NOC + build room | Protect-while-act (one clones a badge while the other watches the NOC engineer) | - |
| 3 | P | Image the broker's archive drive in Cage H-14 | Briefing | Data Hall 3 | Two-body (two credentials within 10 s at the cage reader) + protect-while-act (90 s imaging) | **Hard rule:** if the broker's cage camera *identifies* a player, the archive is wiped and the mission fails |
| 4 | P (twist) | Open the media vault and copy the offline backup tape | Revealed at about 50%: the drive's index file shows the cage copy is a decoy and the real archive goes nightly to tape | Media vault (first floor) | Spotter-Operator + Two-Key (one at the vault dial, one granting the remote release in security control) | - |
| 5 | P | Leave without the broker being alerted | Briefing | Generator yard → perimeter | Escort-free exit through the load-test noise | - |
| O1 | O | Plant a passive network tap in the meet-me room | Overheard NOC chat about the broker's cross-connect | Meet-me room | Belay Line into the overhead cable tray | - |
| O2 | O | Photograph the visitor log showing who escorts the broker's people | A sticky note on the reception desk says "H-14 visitors: see binder" | Reception back office | Protect-while-act during the mantrap guard's break | - |

- **Chain type.** Investigation, then extension. The decoy discovery sends the pair upstairs.
- **Twist (about 50%, minute ~22).**
  - While the drive images, both players see the archive's index file on the imaging rig's screen. It says "mirror → vault tape slot 7, nightly 02:45".
  - At the same moment the tape library's robot arm starts its nightly job, an audible whir behind the vault wall above.
  - Both players are at the cage when this happens.
- **Hard-fail rule (the mission's only one): "Don't be identified on the broker's cage camera."**
  - **Briefing:** explicit.
  - **In-world:** the camera is a different model, white with a blue status LED, unlike the site's black cameras.
  - **HUD:** a distinct icon and a pulsing ring show its *identify* zone, which covers only the cage door and the rack face.
  - **Grace:** being *seen* at the edge (detect range) triggers the watcher's "look closer" sequence, giving 3 seconds to break line of sight before identification.
- **Protected persons.** All staff are non-hostile bystanders and are marked as "staff". Harming them costs score heavily but does not fail the mission (D-04).
- **Unwinnable-state prevention:**
  - **Tape slot 7.** After 02:45 the tape is ejected to the transport case for the 06:00 courier. If players are late, the tape is still in the vault's transport case. Cues: the robot sound, the index file text, a printed courier schedule on the vault door. The state is recoverable.
  - **Credential clone.** If a badge clone fails (the badge holder moves away), the second staff badge is reachable from the contractor lead's lanyard at the generator yard. There are two sources of credentials.
- **Scoring:**
  - Clean rating: no injuries to staff, no Tier 2 alerts, all objectives including optionals.
  - Knockouts of staff count as "injuries" here, because staff are civilians.
  - Players can still choose sleep charges at a score cost.

---

## 4. Zone list

Every room has a real purpose.

| Zone | Name | Level | Rooms (purpose, users) | Occupancy at 02:00-03:30 | Devices (type, placement, reason) | Gameplay role |
|---|---|---|---|---|---|---|
| Z0 | Approach and perimeter | Exterior | Access road; vehicle gate; pedestrian turnstile with swing gate (egress); gatehouse (unstaffed at night, lights on) | None; patrol passes each 30 min | Fence sensors F1-F6; 2 road cameras (detect); yard PTZ | Opening, overlook from the embankment |
| Z1 | Generator yard | Exterior, fenced inside the site | 4 generator enclosures (container-sized, 2.6 m tall, roof walkways); fuel tank bund; switch house; personnel gate (propped open) | Contractor crew (3) from 02:20 | Yard camera (observe); floodlights during the test; gate contact (bypassed by the propped gate - the system shows "door held" fault, checked once per tour) | Landmark seen early; climax exit |
| Z2 | Chiller deck and roof | Roof of office wing (+8.5 m) | Chillers (cooling plant), roof hatch to the office-wing stair, cable ladder bridge to the data-hall roof | None | Roof hatch contact (zone bypassed: open ticket) | Entry; hidden network start |
| Z3 | Office wing, first floor | 1F | Open-plan office (customer service staff, day only); meeting room; break room with kitchenette; tech storage (spare parts, cages of disks); **media vault** (tape library, dual control); comms riser cupboard; WCs; two stair cores (east, west) | Empty; lights on motion sensors | Dual-tech motion sensors in corridors (armed after 23:00); vault door contact + vibration; corridor cameras (recognise); vault-door camera (identify) | Encounter + Story twist payoff |
| Z4 | Reception and security | GF | Lobby; reception desk; **mantrap** (two interlocked doors); back office (visitor logs, key safe); **security control room**; locker room | Reception officer (desk); control-room officer | Entrance camera (identify); lobby camera; mantrap sensors (single-occupancy); control room door card reader | Encounter (O2); Spotter-Operator station |
| Z5 | NOC | GF | Network operations centre (wall of screens, 6 desks; 2 engineers on shift); quiet room | 2 engineers | NOC door reader; no cameras inside (privacy policy); engineers' badges on lanyards | Protect-while-act (badge clone) |
| Z6 | Build room and loading dock | GF | Loading dock (2 bays, dock leveller); goods-in store; build room (staging benches, crash cart, label printers); packaging waste store | Contractor van at bay 2; dock lights on | Dock camera (observe); roller-shutter contacts; build-room reader | Alternate entry; credential source #2 |
| Z7 | Data Hall 2 | GF | 8 cold aisles of cabinets; raised floor 600 mm; overhead cable ladder racks at 3.2 m; CRAH cooling units along the walls; temporary fan unit (east) | NOC engineer walks through every 45 min | Hall cameras along the aisles (observe); motion-lighting zones (suppressed tonight - maintenance on); hall door reader | Noise-mask zone; parallel routes |
| Z8 | Data Hall 3 | GF | 6 aisles; private cages (mesh walls to the deck, cable entry openings 600 x 400 mm in the cage roofs under the overhead racks); **Cage H-14** (broker) | Empty | Hall cameras (observe); motion-lighting zones (ARMED: lights an aisle when someone enters, and the control-room officer is alerted to "lights on in Hall 3"); cage door contacts; **broker's cage camera** (identify, hard rule) | Signature set piece #1 |
| Z9 | Meet-me room | GF | Carrier cross-connect frames; overhead fibre trays; two racks per carrier | Empty | Door reader; one camera (recognise) on the door | Optional (O1), Belay Line |
| Z10 | Electrical and suppression plant | GF | UPS rooms A/B (battery strings, humming); switchgear room; inert-gas suppression cylinder room; fire control panel | Contractor technician during the test (switchgear) | Door readers; fire panel in the corridor; suppression pre-discharge strobes in the halls | Machine-state (power transfer); hazard awareness |
| Z11 | Service corridor | GF | Back-of-house corridor linking the dock, plant rooms and halls; fire doors to the yard (push-bar, alarmed) | Roaming officer tour route | Corridor cameras (recognise at the junctions); fire doors with "alarm will sound" contacts | Circulation, lure-and-ambush |

**Checks:**
- **Stair cores:** two (east and west) in the office wing; the halls are single-storey with roof access via a cat ladder.
- **Dead ends:** none over 5 m except plant rooms, which is acceptable.
- **Exits:** all external doors open from inside with push bars, and electric locks release on fire alarm.
- **Hidden network:**
  - the chiller deck;
  - the cable ladder bridge;
  - overhead cable ladder racks (600 mm wide, at 3.2 m, rated to carry heavy cable, plausible for a crouched climb only along the main trunk);
  - a raised floor (600 mm, crawlable only in Hall 2's cooling plenum section, with cable cutouts);
  - the service corridor.

**Scale sheet:**

| Element | Size |
|---|---|
| Doors | 0.9 m (hall doors 1.2 m double for equipment) |
| Headroom | 2.4 m offices; 4.2 m halls (structural) with racks at 3.2 m |
| Stairs | Rise 170 mm, going 280 mm |
| Corridors | 1.5 m (service corridor 2.0 m for equipment carts) |
| Cabinets | 0.6 x 1.2 x 2.2 m |
| Cage roof cable openings | 0.6 x 0.4 m |
| Generator enclosures | 12 x 2.5 x 2.6 m |

---

## 5. Guard roster and patrol logic

| ID | Role | Zones | Tour, checkpoints and windows | Routines | Paired with | Reaction to evidence |
|---|---|---|---|---|---|---|
| G1 | Reception and mantrap officer | Z4 | Static desk | Takes a 10-min break at 02:40 in the locker room (radio on); checks the visitor binder at 02:15 | G2 by radio | Investigates sounds in the lobby; calls G2 to pull up cameras |
| G2 | Control-room officer | Z4 | Static; watches 16 camera tiles; during the load test also takes power-transfer calls | Pans the PTZ to the yard at 02:30 (test start); grants remote releases on request (calls are logged) | G1, G3 | "Check" alerts → reviews linked camera → sends G3; confirmed → Tier 2 lockdown |
| G3 | Roaming officer | Z0, Z1, Z11, Z7, Z8, Z3 | Tour every 30 min. Checkpoints: CP1 gatehouse, CP2 yard gate, CP3 dock, CP4 Hall 2 door, CP5 Hall 3 door, CP6 office 1F east stair. Each has a 5-min window. A missed checkpoint triggers G2 to radio G3, then send G1 after 3 min | Stops at the yard to chat with the contractors (about 2 min) | G2 by radio | Re-closes the propped gate if he notices it (50% chance on each pass; the alarm-system "door held" fault reminds him); fixes lights left on |
| E1 | NOC engineer A | Z5, Z7, Z10 | Walks Hall 2 every 45 min (02:10, 02:55) | Watches the power dashboards during the test; makes tea at 02:20 (break room 1F, via the west stair) | E2 | Reports odd things to G2; never investigates alone |
| E2 | NOC engineer B | Z5 | Static at a desk | Leaves the badge on the desk lanyard while on a call | E1 | Same as E1 |
| C1-C3 | Contractor crew | Z1, Z10, Z6 | Lead (C1) in the yard; technician (C2) between switchgear and yard; fuel tech (C3) at the bund | C1 keeps a site-issued staff badge on a lanyard (credential source #2); C2 radios "transfer complete" at 02:31 | Each other | Shout to each other over the noise. They report strangers to G2 but are slow, because they are focused on the test |

- **Two-intruder handling.** Perception is tracked per player. A search targets the last known position of the player who was perceived. The other player's position is unknown to the AI unless that player is also perceived.
- **Alert states:** Routine → Curious → Investigating → Searching → Engaged (radio for help; staff flee) → Cooling down.
- **Alert tiers:**

  | Tier | Name | What happens |
  |---|---|---|
  | 0 | Routine | Normal night operations |
  | 1 | Check | One officer is diverted; cameras are reviewed |
  | 2 | Confirmed intrusion | Halls are locked down by the control room; the officers group up; the load test is paused (yard gets quiet) |
  | 3 | Police called | A 6-minute countdown is shown on the HUD to leave the site before police arrive. Escaping in time still completes the mission, at a heavy score cost |

---

## 6. Security systems (selected; full table abbreviated to key devices)

| ID | Type | Location / height | Coverage | Blind spots (real cause) | Armed | Trip effect | Counter |
|---|---|---|---|---|---|---|---|
| D1 | Fence intrusion sensors F1-F6 | Fence | Climb or cut | Zone F5 beside the generator yard: constant vibration from the test after 02:30 makes alarms there "fault-masked" | Always | Tier 1 check | Cross at F5 during the test, or use the propped gate |
| D2 | Yard PTZ camera | Pole, 6 m | Observe across the yard | While it is panned to the generators | Always | G2 sees | Time the pan; the generator enclosures block its view |
| D3 | Roof hatch contact | Office roof | Hatch | Zone bypassed (open ticket) | Bypassed | None | Entry route |
| D4 | Dual-tech motion sensors | 1F corridors, 2.3 m in the corners | Corridor length | The vault alcove is behind a column | After 23:00 | Tier 1 check | Hold-Down Device on a sensor; time with the tea break |
| D5 | Motion-lighting zones | Hall 3 aisles | An aisle lights up when someone enters | Cage interiors are not covered; lights stay off if the zone controller is held | Always | Lights on + "Hall 3 lights" alert to G2 | Belay or overhead route; Hold-Down Device on a zone controller |
| D6 | Broker's cage camera | H-14 corner post, 2.4 m | **Identify** zone: cage door + rack face. **Detect** zone: aisle end | Directly beneath it; behind the imaging rig cart | Always (offsite watcher) | Detect = 3 s "look closer"; identify = **mission fail** | Hold-Down Device suppresses it while held, and its feed freezes on the last frame. The watcher notices a frozen feed after 12 s, so jam in bursts |
| D7 | Cage reader (two-person) | H-14 door | Two staff badges within 10 s | - | Always | Wrong badge = Tier 1 check | Two cloned credentials, two players |
| D8 | Vault combination + remote release | 1F vault door; release in the control room | Both within a 15 s window | - | Always | Failed release = logged; a second failure = Tier 1 | Spotter-Operator |
| D9 | Hall cameras | Aisle ends, 3 m | Observe along the aisles | Glare from Hall 2's maintenance work lights facing the cameras; between cabinet rows | Always | G2 if watching | Use glare zones and aisle blocking |
| D10 | Suppression pre-discharge | Halls | Strobes + 30 s warning before an inert-gas discharge | - | Manual or fire detection | Evacuation; staff converge outside the hall | Not a player tool (no-go). Its abort switch is shown as a hazard |

**Machines with state:**

| Machine | States | Tells |
|---|---|---|
| Generators | Off → cranking → on-load | Sound (rising roar), floodlights on, the yard PA says "transfer in progress" |
| Tape library robot | Idle / running | Whir and amber light through the vault's glass vision panel |
| Temporary fan unit (Hall 2) | Fixed on | A roar at the east end |
| Hall 3 motion lights | Per-aisle on/off | Visible from the overhead racks |

---

## 7. Co-op beats

| ID | Zone | Type | Player 1 | Player 2 | Real-world justification | Alternative | Failure | Min |
|---|---|---|---|---|---|---|---|---|
| B1 | Z0 | Overlook + planning (info asymmetry) | Watches the gatehouse and road cameras from the embankment | Watches the yard PTZ pan cycle; pings the timing | Real perimeter cameras have pan cycles | - | - | 0-2 |
| B2 | Z0→Z2 | Leg-Up + Ledge Relay | Braces at the office-wing wall below the chiller deck parapet (3.4 m) | Climbs, hangs, then lets P1 climb past | The wall has no ladder; the roof is reached by a hatch inside | Swing gate at the turnstile (alarmed; Tier 1) | Noise if rushed | 3 |
| B3 | Z2→Z3 | Hold-and-pass | Holds the Hold-Down Device on the 1F corridor motion sensor D4 | Crosses to the stair; then holds the next sensor for P1 | Dual-tech sensors in corridors | Wait for E1's tea trip (he walks the corridor, so sensors are expected to trip) | Tier 1 check | 6 |
| B4 | Z3→Z5 | Parallel routes | West stair → NOC side corridor | Service riser cupboard → drop through the ceiling void to the NOC quiet room | Two stair cores and a riser | - | - | 8 |
| B5 | Z5 | Protect-while-act (credential 1) | Clones E2's badge from the desk lanyard with the cloner (20 s) | From the quiet-room door, watches E1 and pings when he turns; had earlier started a long job on the build-room printer by hand; on P1's cue P2 opens its paper tray, and the jam alarm draws E1 away | Engineers leave badges on lanyards; office printers beep loudly on a jam | Clone C1's badge in the yard (B10) | E2 notices → Curious; P1 must abort | 10-12 |
| B6 | Z11 | Lure-and-ambush (optional non-lethal) | Shoots a corridor light (or switches it off) | Hides in the dark recess and lets G3 pass after he checks the switch | Officers fix lights | Wait out the tour | G3 Curious | 14 |
| B7 | Z7 | Noise-mask zone + parallel routes | Crawls the raised-floor plenum (600 mm) under the fan unit's noise | Walks the overhead cable rack trunk above the cold aisles; spots for P1 | Raised floors carry cooling air; overhead racks carry cables | Walk the aisles between cameras using glare | Camera sighting → Tier 1 | 15-18 |
| B8 | Z8 | **Signature set piece #1: Drop Line into the cage** (see §10) | Anchors on the overhead rack above H-14's cable opening and lowers P2 head-down into the cage | Hangs inverted. Plugs the imaging rig into the drive bay with a quick-connect while staying out of the camera's identify zone (beneath the camera) | Cage roofs have cable entry openings under overhead racks | Front door with two credentials (B9) | Identified → mission fail; detected → 3 s grace | 19-21 |
| B9 | Z8 | Two-Key (cage reader) | Presents badge 1 | Presents badge 2 within 10 s, from the other side of the cage corner. The reader is on a 1.2 m-wide door; the two badge pads are at the corners | Two-person rule for high-security cages | B8 | Wrong timing = Tier 1 check | 19 (alt) |
| B10 | Z8 | Protect-while-act (imaging, 90 s) + Hold-Down bursts | Holds bursts on the broker's camera D6 (never over 12 s) | Supervises the imaging rig and swaps the drive tray. Must not stand in the identify zone | Imaging takes time; the frozen-feed check is a real watcher behaviour | - | Watcher's "look closer" | 21-23 |
| B11 | Z8 | **Twist (story)** - both see the index and hear the tape robot | - | - | Nightly backups to tape are standard | - | - | 22 |
| B12 | Z11→Z3 | Double Drop (optional, non-lethal) or ghost pass | Takes G3 at CP6 with a sleep charge | Simultaneously takes E1 returning from tea (score cost: staff) | Paired movement on the stairs at 02:55 | Wait in the break-room alcove for both to pass (ghost) | Tier 1 | 25 |
| B13 | Z3/Z4 | **Signature set piece #2: Spotter-Operator vault release** (see §10) | In the reception back office (during G1's break) at the secondary release terminal that G1 uses for escorted visitor releases. P1 queues a release request and watches the vault camera feed | At the vault door dialling the combination (read from a key-safe note in Z4 that P1 photographs and sends via Feed Share). P2 calls the timing | Real dual control: combination + remote release after camera verification | Wait for G2 to approve an unexplained request (50% suspicion → Tier 1) | Failed sync = logged; second failure = Tier 1 | 27-31 |
| B14 | Z3 | Belay Line (vault interior) | Anchors at the vault mezzanine rail and lowers P2 to the tape slot in the library's maintenance bay | Swaps tape 7 into the courier case's dummy, then copies it on the portable reader | Tape libraries have maintenance mezzanines | Ladder (noisy) | Robot arm moves at 02:45 - the timing window | 32-34 |
| B15 | Z9 | Optional O1 - Belay into the meet-me room fibre trays | Anchors at the cable tray | Places the tap | Fibre trays run above the frames | - | - | (optional) |
| B16 | Z1 | **Climax exit (sync + body)** | Leg-Up onto a generator enclosure roof walkway | Ledge Relay. Then both cross the enclosure roofs inside the floodlit yard while the generators roar (noise mask), timed to the PTZ pan, and drop to F5 | Generator enclosures have roof walkways for maintenance | Propped personnel gate (if still propped) | PTZ sighting → Tier 1 | 38-42 |

**Density check:**

| Minimum | Planned |
|---|---|
| Hold-and-pass ≥3 | B3 (×2 sensors), B10, B13 timing → ✓ |
| Free-move traversals ≥3 | B2, B16 Leg-Up + Relay, plus the generator-roof chain → ✓ (3) |
| Authored set piece ≥1 | B8 Drop Line, B14 Belay → ✓ |
| Split-and-sync ending in Two-Key ≥1 | B13 (and B9 alternative) → ✓ |
| Protect-while-act ≥1 | B5, B10 → ✓ |
| Information asymmetry ≥1 | B1, B13 → ✓ |
| Double Drop ≥1 | B12 (optional, or ghost) → ✓ |
| Parallel routes ≥1 | B4, B7 → ✓ |

**Multi-use moves:**

| Move | Uses |
|---|---|
| Leg-Up / Ledge Relay | Entry (B2); exit (B16); an optional alternative into the Hall 3 overhead racks from a cabinet top |
| Drop Line | Imaging (B8); dropping silently onto the Hall 3 floor behind the aisle-end camera (ghost route). Tampering with the broker's camera is deliberately not offered, because the watcher would notice |
| Belay Line | Vault tape (B14); meet-me tap (O1) |
| Hold-Down Device | Motion sensors (B3); broker's camera bursts (B10); Hall 3 lighting zone controller (alternative route) |

**Role alternation:**
- P1 anchors in B8, and P2 anchors in B14.
- P1 operates in B13, and P2 dials.
- P1 boosts in B2, and P2 boosts in B16.

**Idle check.** The longest wait is B5, where P2 watches. It is under 40 s and includes the printer-lure action. In B13 the dial and release are concurrent. ✓

**Communication:**
- Pings for "ready", "release now", "camera", "turn" and "go".
- Callouts for every move.
- The partner beacon is a coloured shoulder lamp, amber for P1 and teal for P2, shown only to players.
- The shared floor plan appears after O2 or once players reach Z4 (the fire-evacuation plan on the wall is photographed).
- All Two-Key Actions work with pings only. The B13 window is 15 s, widened to 25 s with no voice.

---

## 8. Ideal stealth route (zero-failure path for two; abbreviated)

| Step | Player 1 | Player 2 | Threats | Why undetected |
|---|---|---|---|---|
| 1 | Embankment overlook (Z0) | Same | Road cameras; PTZ | Out of range; in darkness |
| 2 | Waits at the F5 fence line until 02:30 | Same | F5 sensors | Fault-masked by generator vibration; PTZ panned to the generators |
| 3 | Crosses to the office-wing wall in the shadow of the switch house | Same | Yard camera | Enclosure 4 blocks its view |
| 4 | Leg-Up for P2 (B2) | Climbs, hangs, relays P1 | None on the roof | Parapet blocks the view from the yard |
| 5 | Enters the roof hatch (bypassed) | Follows | - | Zone bypassed |
| 6 | Holds D4 | Crosses to the west stair | D4 | Hold-Down Device suppresses it |
| 7 | Crosses; P2 holds D4b | Holds | D4b | Same |
| 8 | West stair → NOC side corridor | Riser cupboard → ceiling void → quiet room | E1 on a tea trip (02:20) | Timed: E1 is in the break room |
| 9 | Clones E2's badge while E2 is on a call | Watches E1 returning; sends the printer job | E2, E1 | E2 faces the screens; E1 is diverted to the build room |
| 10 | Service corridor west (dark recess) | Follows | G3 tour at CP4 (02:30-02:35) | Recess unlit; G3 passes |
| 11 | Hall 2: raised-floor plenum (B7) | Overhead rack trunk | Hall 2 cameras; E1's walk at 02:55 is later | Fan noise masks the crawl; overhead is above the camera cones |
| 12 | Overhead rack into Hall 3 above aisle 4 | Same | Motion-lighting zones | Overhead is not in the motion zones |
| 13 | Anchors Drop Line over H-14 | Inverted under the camera, out of its identify zone | D6 | Beneath the camera = blind spot (real mounting geometry) |
| 14 | Hold-Down bursts of at most 10 s while P2 swaps trays | Images (90 s) | D6 frozen-feed check | Bursts stay below the 12 s threshold |
| 15 | Both read the index (twist) | - | - | - |
| 16 | Back up to the overhead rack → roof cat ladder → office roof → east stair 1F | Same | G3 at CP6 (02:55-03:00); E1 back to the NOC | Ghost: wait in the break-room alcove for both to pass (B12 alternative) |
| 17 | Down the east stair → Z4 back office during G1's break (02:40-02:50, so arrive by 02:48) | Waits at the vault on 1F, out of the D4 cone | G1 on break; G2 at the screens | Back office has a door to the control room's release terminal alcove |
| 18 | Photographs the key-safe combination note and sends it via Feed Share | Dials | - | - |
| 19 | Requests the release while watching the vault feed. P2 calls "set" | Final digit within the 15 s window | G2 sees a queued request | The request is logged as "1F maintenance". G2 is on a power-transfer call (load test). Ghost window |
| 20 | Leaves the back office before G1 returns (02:50) and climbs the east stair to rejoin P2 at the vault (about 2 min) | Inside the vault; waits at the mezzanine rail, out of the vault-door camera's view | G1 returning; D4 on 1F | P1 times the D4 crossing with a Hold-Down burst |
| 21 | Anchors the Belay at the vault mezzanine rail (B14) | Lowered to the tape library maintenance bay; swaps tape 7 into the courier case's dummy and copies it | Robot arm at 02:45 or later | The tape is in the transport case (recoverable state) |
| 22 | Both go down the east stair → service corridor → dock; regroup (min 36). Then exit by Leg-Up onto the generator enclosure roofs (B16), not the alarmed yard fire doors | Same | PTZ; contractors | Generator roar masks noise; PTZ pan timed; the contractors face the generators |
| 23 | Drop at F5 → embankment | Same | - | Fault-masked during the test (it ends 03:10, a soft limit) |

**Checkpoints:**
- CP-A: after the entry onto the roof (min 5).
- CP-B: after credential 1 (min 13).
- CP-C: after imaging (min 24).
- CP-D: after the vault (min 35).
- **Maximum replay loss:** about 11 minutes (CP-A to CP-B). This is acceptable after the fix (see §16).

---

## 9. Pacing curve

| Min | Beat | Intensity | Type |
|---|---|---|---|
| 0-2 | Overlook planning (B1) | 1 | Opening |
| 3-5 | Generator start; F5 crossing; Leg-Up onto the roof (B2) | 2 | Opening (soft co-op) |
| 6-8 | Corridor sensor relay (B3); parallel routes (B4) | 2-3 | Build |
| 9-13 | NOC badge clone (B5) | 4 | Set piece (major) |
| 13-15 | Service corridor; G3 pass (B6) | 2 | Rest / build |
| 15-18 | Hall 2 noise crawl (B7) | 3 | Build |
| 19-23 | **Drop Line imaging under the broker's camera** (B8, B10) | 5 | Signature set piece #1 |
| 22 | Twist: the decoy and tape | 4 | Twist (≈50%) |
| 24-26 | Retreat over the racks; ghost past G3 and E1 (B12) | 2-3 | Rest |
| 27-31 | **Vault release Spotter-Operator** (B13) | 5 | Signature set piece #2 |
| 32-35 | Tape belay (B14) | 4 | Set piece |
| 36-37 | Regroup at the dock | 1 | Rest |
| 38-42 | **Generator-roof exit through the roar** (B16) | 4 | Climax / exit |
| 43-45 | F5 drop; embankment; debrief | 1 | Exit |

```
5 |                   ###        ##
4 |        ##       ###### #     ######      ###
3 |     ####   ###            ##        #
2 |  ##       #           ##              #
1 |##                                       ###   ##
  +----------------------------------------------------> min
   0    5    10   15   20   25   30   35   40   45
```

**Revive and checkpoints (D-03):**
- 30 s revive window, 2 per mission.
- Checkpoints at CP-A to CP-D.

**Escalation per tier:** see §5.

## 10. Planned wow moments

| Family | Moment | Spectator | Agency | Mutual need | Readability | Retell | Amplifier |
|---|---|---|---|---|---|---|---|
| Body | Hanging head-down through a cage's cable opening between humming server racks, imaging a drive directly *beneath* the camera that would end everything | ✓ | ✓ | ✓ (anchor + operator; camera bursts) | ✓ (the identify zone ring is shown) | "I hung upside down under their camera and copied the drive while you blinded it in bursts." | Real device used for its real purpose (cable opening); hidden information (only the anchor sees the frozen-feed timer) |
| Sync | One player sits in the security office asking the guard's own system to open the vault, while the other dials the last number on the call | ✓ | ✓ | ✓ | ✓ (both see the 15 s window) | "You opened the vault from the security office while I dialled it upstairs." | Information asymmetry: only P1 sees the camera feed, only P2 sees the dial |
| Story | The drive's index shows it is a decoy, and at that moment the tape robot whirs to life upstairs, the archive moving as you watch | ✓ | ✓ (both at the rig) | ✓ (both read it) | ✓ | "The real archive was being backed up to tape right above us." | Sound reveal plus a landmark the players have already passed (the vault vision panel) |
| Body (bonus) | Walking the roofs of four roaring generators in the floodlit yard, timing the camera, while the contractors shout below | ✓ | ✓ | ✓ (Leg-Up/Relay; PTZ timing) | ✓ | "We walked out over the generators during their own test." | Altitude and view; a real site event as cover |

## 11. Soundscape and lighting plan

| Zone | Ambient floor | Sources | Purpose |
|---|---|---|---|
| Z0 | Quiet (before 02:30) → medium | Distant road, wind; then generators | Danger, then cover |
| Z1 | **Loud** (02:30-03:10) | 4 generators on load, PA, contractors shouting | Sneak window; voice masking |
| Z2 | Medium | Chiller fans | Roof movement cover |
| Z3 | **Quiet** | HVAC whisper; office fridges; motion-light clicks | Danger (slow movement) |
| Z4 | Quiet / medium | Radio chatter, the reception TV muted, the mantrap door buzzer | Danger; G1's radio is a bark source |
| Z5 | Medium | Keyboard clatter, the engineers' calls, alerts | Barks carry information |
| Z7 | **Loud** | Server fans (~90+ dB), the temporary fan unit (east) | Sneak window; voice masking |
| Z8 | Loud | Server fans | Cover; imaging rig beeps are masked |
| Z10 | Loud hum | UPS, switchgear | Avoid (contractor present) |

**Benign-threat signposting.** The yard PA announces "load test in progress", and the contractors' shouting is about the generators. Players are told in-world that the noise is routine.

**Music state table:**

| State | Layers | Attack | Decay |
|---|---|---|---|
| Routine | None (ambience only) until trigger T1 (entering Z3) brings a low pulse | 4 s | - |
| Curious | Pulse + high texture | 1 s | 6 s after Routine resumes |
| Investigating / Searching | + percussion | 0.5 s | 8 s |
| Engaged | Full | Immediate | 10 s |
| Tier 2 / 3 | Full + siren motif | Immediate | Until the tier drops |

**Bark plan:**
- Officers radio status ("CP4 clear", "lights on in Hall 3, checking").
- Engineers comment on dashboards.
- Paired lines:
  - G2 to G3: "Did you prop the yard gate?"
  - G3: "Contractors again."
- Evidence lines: "Who left the riser door open?"
- Music ducks under radio chatter in Z4/Z5.

**Lighting plan:**
- **Office wing:** dark, with motion-lit corridors. Changeable: the Hold-Down Device on sensor-linked lights, and switching off corridor lights, which G3 fixes when he passes.
- **Hall 2:** half maintenance-lit, with glare zones facing the cameras.
- **Hall 3:** dark until motion triggers, and the overhead racks stay in shadow.
- **Yard:** floodlit during the test, with deep shadows behind the enclosures.
- **Landmark:** the floodlit generator yard is first seen from the embankment and again from the roof.

**Weather.** A dry, still night. No weather coupling (N/A: not needed).

**Partner beacons.** Amber and teal shoulder lamps, readable at 20 m in Hall 3's dark aisles (checked in the darkest zone).

## 12. Player communication aids
- Pings and callouts are covered in §7.
- **Partner awareness (D-12):** the beacon is always on and world pings mark spots and objects. There is no partner marker. The floor plan photographed in Z4 is static and does not show the partner's position.
- **Proximity voice:** an optional modifier, off by default.
- **Guidance channel:** a voiced remote handler on a shared earpiece. They brief at the embankment, confirm the load-test timings, react to the twist (min 22), and fall silent during Tier 2+ unless asked. Contractor and officer radio chatter acts as a second, overheard channel.

## 13. Failure, revive, checkpoints and loadout
- **Revive:** 30 s window, 2 per mission.
- **Checkpoints:** CP-A to CP-D.
- **Tier consequences:** see §5. Tier 3 adds a visible 6-minute timer.
- **Loadout (signals "nobody may know we were here").**
  - No lethal weapons for either player. The non-lethal tools are Stun/Blunt Rounds and a Throw-Cam.
  - P1 carries the badge cloner, the Hold-Down Device and the line kit, since P1 anchors B8 and B14.
  - P2 carries the imaging rig and the portable tape reader, since P2 is the one lowered in B8 and B14.
  - Both have Sensor Modes.
  - No lethal option appears on the loadout screen, which states the non-lethal expectation.

## 14. Estimated play time
| Profile | Estimate | Basis |
|---|---|---|
| Expert ghost pair | 25-30 min | Critical path with no waiting beyond the scheduled windows |
| Average pair | 40-50 min | Scheduled windows (the test at 02:30, G1's break at 02:40, the robot at 02:45) plus retries |
| First-time casual pair | 60-70 min | Exploration, optionals, failures |

## 15. Risks and open questions
- **Schedule-driven windows** (the test, the break, the robot) risk feeling like waiting. Mitigation: each window has an alternative (§3 recovery and the alternatives in §7). In-game time scales so waits are under 60 s.
- **The hard rule (camera identify)** must be tested for readability. Mitigation: a 3 s grace period and the zone ring.
- **Staff realism versus non-lethal scoring:** players may feel the staff are too easy to avoid. Tune patrol overlap.

---

## 16. Review record (LEVEL_REVIEW_CHECKLIST.md)

**Review method.** A simulated careful pair and a simulated careless pair were run through the outline (P12 procedure). Issues found in the first pass were fixed in this document. The fixes are listed at the end.

| ID | Level | Result | Evidence |
|---|---|---|---|
| A1 | MUST | PASS | §2.1 day-in-the-life with the test, shifts, break and robot schedule |
| A2 | MUST | PASS | §4: east and west stair cores in the office wing; halls single-storey |
| A3 | MUST | PASS | §4: no dead end over 5 m except plant rooms |
| A4 | MUST | PASS | §4: push-bar exits, locks release on fire alarm; the alarmed fire doors open from inside |
| A5 | MUST | PASS | §4: hidden network = chiller deck, cable ladder racks, raised-floor plenum (Hall 2 only), riser, service corridor; no duct maze |
| A6 | SHOULD | PASS | Lobby at the entrance, service corridor behind the halls, plant grouped |
| A7 | SHOULD | PASS | No signage of the broker's cage; navigation by intel and building logic |
| B1 | MUST | PASS | §4 table: function, users and occupancy for every room |
| B2 | MUST | PASS | Puzzles use the cage reader, vault dual control, imaging rig, tape library and generators for their real functions |
| B3 | SHOULD | PASS | Contents listed per room |
| B4 | SHOULD | PASS | The key-safe note, the courier schedule and the printer queue tell players things |
| C1 | MUST | PASS | §4 scale sheet |
| C2 | MUST | PASS | Leg-Up target 3.4 m parapet; rack height 3.2 m; cage opening 0.6 x 0.4 m (fits the inverted reach of the Drop Line, not a full-body pass) |
| C3 | SHOULD | PASS | Generator enclosure and building heights consistent |
| D1 | MUST | PASS | §3 sources per objective |
| D2 | MUST | PASS | Cage opening visible from the racks; release terminal visible through the back-office door glass; propped gate visible from the overlook |
| D3 | MUST | PASS | §6 machine-state tells |
| D4 | SHOULD | PASS | Generator yard seen from the embankment and the roof |
| D5 | SHOULD | PASS | Embankment overlook (B1); overhead racks over Hall 3 |
| D6 | SHOULD | PASS | Exit via the generator roofs, a different route from the entry |
| E1 | MUST | PASS | §7 density table |
| E2 | MUST | PASS (after fix 1) | Beat chart §9: small beats every ≤4 min after adding B6 and the B7 parallel crawl; set pieces at 9, 19, 27, 32 and 38 min |
| E3 | MUST | PASS | Cage needs two badges or anchor + hanger; vault needs remote release + dial; entry needs Leg-Up |
| E4 | MUST | PASS | Idle check §7 (longest wait about 40 s, with an action) |
| E5 | MUST | PASS | Merge points: NOC side corridor (B4), Hall 3 overhead (B7), 1F vault (B13-B14), dock (min 36). The longest separation, B13, is about 4 min **at first; FAIL → fix 2** (now P1 rejoins via the east stair within 2 min; the beacon and floor plan are available) |
| E6 | MUST | PASS | B9 10 s; B13 15 s (25 s no voice); non-lethal failure (log, then Tier 1) |
| E7 | MUST | PASS | Two-person cage rule; vault dual control (§2.2) |
| E8 | SHOULD | PASS | Multi-use list §7 |
| E9 | SHOULD | PASS | B8 has B9 as an alternative; B14 has the ladder alternative |
| E10 | SHOULD | PASS | Role alternation §7 |
| E11 | SHOULD | PASS | B13 (feed vs dial) |
| F1 | MUST | PASS (after fix 2) | §8 zero-failure path; step 20 corrected so P1 joins P2 at the vault for B14 |
| F2 | MUST | PASS | Alternatives per encounter (§7 column) |
| F3 | MUST | PASS | Corridor lights, Hall 3 zone controller, yard floodlights (cannot be changed, but shadowed by the enclosures; acceptable because the generators provide noise cover; noted) |
| F4 | SHOULD | PASS | G3 tour windows; E1 walks |
| F5 | SHOULD | PASS | Loops: the overhead racks and service corridor form a ring around Hall 2/3 |
| F6 | SHOULD | PASS | Escape from Hall 3 leads up to the racks, not into G3's tour |
| G1 | MUST | PASS | Exposure matches lighting (glare zones are drawn as glare) |
| G2 | MUST | PASS | Per-intruder perception §5 |
| G3 | MUST | PASS | Alert states and tiers §5; music §11 |
| G4 | MUST | PASS | One hard rule (broker's camera identify), shown three ways |
| G5 | MUST | PASS | All timers shown: the Tier 3 countdown; the robot schedule printed and audible |
| G6 | MUST | PASS | Tape recoverable after 02:45; second credential source |
| G7 | MUST | PASS | §6 camera ranges and real blind spots |
| G8 | SHOULD | PASS | The partner beacon dims when the partner is exposed (exposure tell) |
| G9 | SHOULD | PASS | Paired barks; ducking in Z4/Z5 |
| G10 | SHOULD | PASS | Single trip = check; adjacent zone = confirmed |
| H1 | MUST | PASS | §2.2 tier rationale |
| H2 | MUST | PASS | Five-layer table |
| H3 | MUST | PASS | Every device justified; vault, cages and meet-me secured |
| H4 | MUST | PASS | Four weaknesses with causes |
| H5 | SHOULD | PASS | Tour checkpoints and missed-checkpoint response |
| H6 | SHOULD | PASS | Alarm-chain delays used (B6, B13) |
| H7 | SHOULD | PASS | No lethal automated defences (D-05) |
| I1 | MUST | PASS | 40-50 min average |
| I2 | MUST | PASS | One twist at about 50% (min 22) |
| I3 | MUST | PASS | Rests at 13-15, 24-26 and 36-37 |
| I4 | MUST | PASS (after fix 3) | Revive 30 s; checkpoints were CP-A at 5 and CP-B at 19 (a 14 min loss) → **FAIL → fix 3**: CP-B moved to after the badge clone (min 13), so the maximum loss is about 11 min |
| I5 | SHOULD | PASS | Each objective moves the pair to a new zone |
| I6 | SHOULD | PASS | 5 primaries, 2 optionals |
| I7 | SHOULD | PASS | Non-lethal, scored; no forced harm |
| I8 | SHOULD | PASS | §13 loadout has no lethal tools, so the non-lethal expectation reads from the kit |
| J1 | MUST | PASS | §10 Body, Sync, Story |
| J2 | MUST | PASS | All five tests ticked with retells |
| J3 | SHOULD | PASS | Amplifiers listed |
| J4 | SHOULD | PASS | Signature set pieces (cage drop imaging; vault Spotter-Operator; generator-roof exit) not repeated |
| K1 | MUST | PASS | Soundscape table §11 |
| K2 | MUST | PASS | Music state table with attack and decay |
| K3 | MUST | PASS | Beacons checked in Hall 3 |
| K4 | SHOULD | PASS | Load-test PA |
| K5 | SHOULD | PASS | Staged lighting; landmark yard |
| K6 | SHOULD | N/A | No weather |
| K7 | SHOULD | PASS | §12 voiced handler throughout; overheard radio chatter as a second channel |
| L1 | MUST | PASS | `raw/ip_check.sh` scan: no hits; all names (Fenwick Lane, the broker) are invented |
| L2 | MUST | PASS | Premise (colocation data centre, imaging + tape vault, generator test cover) does not match any known mission combination in the research files' mission list; facility type not used there |
| L3 | MUST | PASS | Zone graph (embankment → generator yard → chiller roof → office wing → NOC → halls via racks → vault → generator roofs) is not a recognisable existing map |
| L4 | MUST | PASS | Transformations: (1) Drop Line moved from opening a gate to imaging media under an *identify-zone* camera inside a server cage (new space, device, purpose and staging); (2) the two-person gate is a combination + remote release Spotter-Operator, not a paired biometric scan with captives; (3) the exit uses a scheduled real-world facility event as cover, with no launch or throw moves |
| L5 | SHOULD | PASS | Originality prompt procedure applied manually (term scan, premise, layout, set-piece comparison) |
| M1 | MUST | PASS | All template sections filled; N/A only for weather |
| M2 | MUST | PASS (after fixes) | Cross-checks done; the vault-anchor contradiction fixed (fix 2) |
| M3 | SHOULD | PASS | Header lists the D-xx assumptions |

**Results summary**

| Section | MUST pass / total | SHOULD pass / total | Failures and fixes |
|---|---|---|---|
| A | 5/5 | 2/2 | - |
| B | 2/2 | 2/2 | - |
| C | 2/2 | 1/1 | - |
| D | 3/3 | 3/3 | - |
| E | 7/7 | 4/4 | E2 and E5 fixed (fixes 1-2) |
| F | 3/3 | 3/3 | F1 fixed (fix 2) |
| G | 7/7 | 3/3 | - |
| H | 4/4 | 3/3 | - |
| I | 4/4 | 4/4 | I4 fixed (fix 3) |
| J | 2/2 | 2/2 | - |
| K | 3/3 | 3/3 (+1 N/A) | - |
| L | 4/4 | 1/1 | - |
| M | 2/2 | 1/1 | - |

**Fixes applied during review:**
1. **E2 (beat spacing).** A small beat gap at minutes 13-15 was filled by B6 (lure-and-ambush or ghost pass in the service corridor), and B7 was made a parallel crawl/overhead split.
2. **E5 / F1 / M2.** The original route left P2 alone at the vault while P1 went to the dock, but the B14 Belay needs an anchor. Fixed: after the release, P1 returns up the east stair to the vault (about 2 min), and the dock regroup moves to min 36.
3. **I4 (replay loss).** CP-B moved from minute 19 to minute 13 (after the badge clone), capping replay loss at about 11 minutes.

**Sign-off.** All MUST items pass after the fixes. SHOULD items pass, or are N/A with a reason. The example mission meets the sign-off rule.
