# Marlow Yard - route draft (route designer, marlow-final)

> Job lead note (2026-10-23): written before Michael's M5 / M6 answers. Its section 1 frame (a Victorian railway depot)
> conflicts with M5 (a very expensive, luxurious, believable training facility with an instructor gallery behind
> glass, LED strips, sliding doors) and M6 (lit by default, players cut the light). The spec keeps the route, sets,
> exercises and timings where they fit, and re-frames the facility per M5 / M6.

Sources read: `CLAUDE.md`, `BRIEF.md`, `STATE.md`, `docs/level-design.md` (all), `scale-sheet.md`, `map-spec.md`, `CTCOURSE-SPEC.md`, `docs/systems/movement.md` (speeds), `src/config/movement.ts` (`GEARS`, `WALL_JUMP`, `TEAM`), `src/config/course.ts`, `jammer.ts` / `scanners.ts` constants, `courseDef.ts` gate kinds, `docs/systems/coop.md`, `docs/ct-research/levels-digest.md` (Training, patterns, pacing, wow moments, anti-patterns, Pumphouse Nine), the moves digest section 1, `docs/story.md` (setting and missions), DECISIONS G80, G151, G152, G180, G206, G240.

Numbers used, all confirmed in code:
- **Speeds.** Standing 0.75 / 1.4 / 2.1 / 3.0 / 4.0 m/s, crouched 0.85 / 1.3 / 1.7 / 2.15 / 2.6 m/s. Silent up to 1.7 crouched and 1.4 standing. Timings assume about 1.5 m/s on stealth ground and 2.1 m/s in safe locks.
- **Reach.** Solo 3.8 m, boost 4.5 m, ladder grab 4.1 m. Co-op lips are built at 4.4 m.
- **Jammer.** 5 s use, 5 s cooldown, 1.5 s camera reboot, a light stays off 4 s after release, 20 m range, stand still.
- **Scanners.** 2 s hack, 1.5 s sync window, a failed hack costs 10 HP.
- **Course timers.** `PAIR_WINDOW` 1.0 s, `TIMED_HOLD_AFTER` 6 s, `DUAL_WINDOW` 1.5 s.
- **Cameras see in the dark (G240).** Darkness never beats a camera: only a jam, a loop or timing does.

---

## 1. The fiction and frame

Marlow Yard is a Victorian railway goods depot and carriage works on the old freight line outside Hollowmere. It closed in 1994 and NIGHT SHIFT bought it through a holding company. Its sheds are big, private and dark, so the unit's set crew builds full-scale rehearsal sets inside them from survey drawings of the kinds of site the operators will enter. The sets use second-hand real security hardware (IR cameras, beam towers, maglocks, time locks, lighting contactors) on real circuits, wired to each drill.

Each set rehearses one scenario from the campaign's world:
- a lorry gate (Mission 1's lane wall);
- a carriage siding (the Ashgrove siding);
- an office range and a warehouse floor (Cold Storage, Glass House);
- a grid substation (Substation Zero);
- a pump house (High Water);
- a data hall (Dead Line);
- a bank strongroom (The Strongroom).

The night crew are unit staff playing guards ("role-players"). They have the same eyes, ears and alert stages as real guards. A knocked-out role-player is replaced when the set resets (G80). LANTERN runs tonight's assessment from the yard's old signal box. Between sets the pair passes through the set crew's holding rooms (the locks). The next set is reset there, a briefing board explains the drill, and a wired-glass slot shows the set beyond.

This frame explains:
- why every area is one purpose-built scenario;
- why devices run on timers (the crew wires them to the drill);
- why the walls between sets are tall blank shed walls or set flats (7.5 m or to the roof), never climbable.

The current bunker frame (marlow-bunker, G225) is replaced. Rebuild freely (M1) allows it. Flag it for Michael.

## 2. The route

Eight sets (A1-A8), seven locks (L1-L7) and the exit dock. "A" and "B" are jobs, not host and client: either player takes either job.

Rules shared by every set:
- **Spotted** by a role-player: break line of sight and re-hide (9.2). Every guarded set has a loop.
- **Alarm** (a camera or role-player at the top stage): the set resets in about 3 s. Both players go back to the set's entry lock, devices re-arm and role-players return to their posts. This extends the existing bay restart. NEW rule (A3).
- **Timed windows** are started by the players, shown on the HUD and on the device (lamp, sound), never fail the run, and re-arm about 10 s after they end.
- **Strandings:** a thrown or lowered player always has a way back (a release, a push-bar door, a panel reachable from the floor).

### A1 - Gatehouse yard (mock-up: a depot service yard behind a lane wall)
- **Footprint:** 22 x 18 m, open air, in the old approach cutting with 7.5 m brick retaining walls on three sides. The goods-yard wall stands at x 12: 4.4 m high, 0.6 m thick brick, full width, with a 1.2 m wicket door bolted on the far side.
- **Entry / exit:** both start in the gatehouse (6 x 6 m, the lorry checker's office) and leave by L1 on the east side.
- **Elements:** gatehouse (gate checker), wall (boundary of the goods yard), wicket (staff gate, bolted from the yard side at night), one yard lamp on the gatehouse (photocell). Nothing else.
- **Observe / plan:** the gatehouse window shows the wall, the wicket and the briefing panels (as now) before anyone steps out.
- **Exercise (teach the handshake):** A crouches and boosts. B goes up, drops over and unbolts the wicket for A. Alternatively B hangs on the lip and A climbs him (ledge relay), so both go over the top. No threat.
- **Ways through:** boost and unbolt, or boost and ledge relay.
- **Teaches:** leg-up, ledge relay, the bolt. **Tests:** nothing.
- **Fail / retry:** nothing to fail. The wicket is B's way back.
- **Target:** 1:10.

### A2 - Carriage shed (mock-up: a night freight siding)
- **Footprint:** 42 x 20 m, truss tie 7 m, ridge 9 m. Three roads (tracks) run east-west on 5.0 m centres. Rakes of box vans (10 x 2.6 x 3.4 m) fill x 30-46 and x 56-68. An open shunting neck (x 46-56) between them is lit by four high-bays on the shed circuit.
- **Entry / exit:** L1 at the west, L2 at the east.
- **Elements:**
  - Vans: parked stock, sight cover, loops round the rakes.
  - Lighting push stations: cabinet 1 in the shunter's cabin by the west door, cabinet 2 by the east door. Two-way switching is real.
  - Carriage-cleaning staging along road 3 (north): a deck edge at 4.4 m, solid 1.2 m edge screens, a stair at its east end only. The west stair is behind a padlocked permit-to-work gate.
- **Guard:** the shunter, posted at the neck and facing west, with a 30 s loop along the cess.
- **Observe / plan:** from the dark west door between the buffer stops the pair sees:
  - the whole neck and the shunter's loop within one cycle;
  - both cabinets' status lamps (cabinet 2 is in sight from cabinet 1: the solution is in view of the problem).
- **Exercise (timed light isolation relay):**
  - A presses ISOLATE at cabinet 1. The neck's high-bays drop for 15 s (the contactor's timed restore), and the shunter walks to cabinet 1 to check.
  - A hides in the cabin's dark corner. This is the lure destination and takedown spot.
  - B, waiting at the near rake's end, crosses the 10 m neck at a crouch-walk in about 6 s.
  - B reaches cabinet 2 and isolates again. The shunter, if still up, now walks toward B, and A crosses behind him.
  - Cabinet 1 to the far cover is 26 m by route. A silent pace covers 25.5 m in 15 s, and the shunter walks that route, so the isolator cannot serve himself quietly.
- **Ways through:**
  - The light relay (shadow).
  - The staging: leg-up and ledge relay at its west end, then crouch behind the screens and take the east stair down (high, slower, no light play).
  - Shooting the high-bays (loud: the shunter investigates, rating cost).
- **Teaches:** timed light isolation. Lure and ambush comes free with it. **Tests:** leg-up (staging).
- **Fail / retry:** the rakes give loops for re-hiding. The cabinets re-arm after 10 s.
- **Target:** 1:45.

### A3 - Office range (mock-up: a commercial office corridor at night)
- **Footprint:** 24 x 13 m, single storey, 3.0 m ceilings.
  - Corridor: 3.5 m wide and 18 m long (x 79-97).
  - Three offices on the south side, 6-7 m wide, with frosted partitions (light only, G45) and communicating doors.
  - One ceiling IR camera at the east end (x 97, 2.8 m up), sweeping west.
- **Entry / exit:** L2 at the west lobby. L3, the far lobby, is out of the camera's frame under and behind it.
- **Elements:** camera (corridor security), the office 2 doorway recess at x 88 (a real door reveal, 1.0 m deep), communicating doors (a real office suite), cleaner's trolley.
- **Guard:** a cleaner role-player working through the offices on a 35 s loop. He is alone and dark at office 3's far desk.
- **Observe / plan:** through the lobby's glazed door both see the camera, its red view overlay, the recess and the far lobby.
- **Exercise (timed jam relay, teach):**
  - A jams from the lobby (18 m, in range) for 6.5 s of blindness. B crouch-walks 9 m to the recess (at least 1.4 m/s: "don't stop").
  - A sits out the 5 s cooldown, jams again, and B reaches L3.
  - Swap: B jams from L3 and A makes the same two hops. Four jams in all.
- **Ways through:**
  - The corridor: four timed jams, no guard.
  - The offices: one short jam each at office 3's door, 3 m from L3, but past the cleaner.
  - Shooting the camera (loud).
- **Teaches:** the held jammer under its timer. **Tests:** sneaking past one guard (offices).
- **Fail / retry:** the existing hallway send-back. Seen by the camera, you go back to the lobby and the partner keeps his place. In the offices: escape and re-hide.
- **Target:** 1:30.

### A4 - Goods shed: security room and goods floor (mock-up: a port warehouse with a security office)
- **Footprint:**
  - Security room: 6 x 6 x 3.0 m in the shed's south-east corner (the foreman's office). One door from L3 and one onto the floor, plus a wired-glass window and a monitor wall facing the floor.
  - Goods floor: 36 x 24 m, 7.5 m to the roof tie.
    - Wide-aisle pallet racking: rows east-west, 5.4 m high, `noLedge`, aisles 3.0-3.5 m (real reach-truck aisles).
    - Pick-floor mezzanine along the north wall at 3.3 m: chequer plate (loud), with stairs at both ends.
    - Dark glazed dispatch office and the dock wicket in the west end.
- **Entry / exit:** from L3 into the security room, out by the west dock wicket to L4.
- **Guards:**
  - Duty officer: seated at the monitors, back to the door; static and alone.
  - D1 and D2: a talking pair at the dispatch desk by the wicket, covering each other. Every 40 s D2 goes to the kettle in the dispatch office, which is the isolation moment for both.
  - Three IR cameras: C1 down the main aisle, C2 at the cross aisle and mezzanine stair, C3 over the wicket.
- **Observe / plan:** the security room window and monitors show the whole floor, the cameras and the dock pair before the console is touched.
- **Exercise 1 (security room):**
  - One player takes the duty officer from behind. Interrogating him gives two lines: "The console loops the floor cameras. Sixty seconds, then they reboot." and "Those two at the dock only split when the kettle boils."
  - B uses the console (it refuses while the officer is up, as now) and loops C1-C3 for 60 s, shown on the HUD. A waits at the floor door, and both go on the press.
- **Exercise 2 (timed crossing and dual takedown):**
  - Cross about 40 m before the reboot.
  - At the dock, A and B each come up behind one of the pair and take both inside 1.5 s. If one acts early, the other man reacts.
- **Ways through:**
  - The main aisle: fast, lit, needs the loop.
  - The mezzanine: dark, loud floor, slow.
  - The back aisle along the south wall: dark, crosses C2.
  - At the dock: dual takedown, wait for the kettle break and take D1 alone, or switch the dock lights off in the dispatch office (the lure sends D1 to the switch).
- **Teaches:** the security room and timed camera loop; the dual takedown. **Tests:** the jammer (the fallback once the loop ends), light switch lures.
- **Fail / retry:** the loop ending is not a fail. The cameras come back and the pair finishes with jams, or loops again (the console re-arms after 20 s; the security room is behind them, which is the only short return in the route).
- **Target:** 2:15.

### A5 - Substation compound (mock-up: an urban grid substation)
- **Footprint:** 30 x 24 m, open air.
  - Walls: the shed walls on two sides and 7.5 m transformer firewalls (real).
  - Two transformer pens: 3.5 m units, `noLedge`, in 1.2 m bunds (low cover).
  - An inner security wall at x 58 with a 6 m cable gateway, left open for tonight's cable-drum delivery and guarded by three IR beams between two beam towers.
  - Inside: the switchroom (12 x 6 x 4 m) on the west wall, a floodlight on the switchroom, and the zone control kiosk under it.
- **Entry / exit:** L4 into the east apron. L5 in the inner zone's north wall.
- **Guard:** a substation patrol on a 34 s loop through the inner zone, with a 4 s stop at the kiosk.
- **Observe / plan:** from the dark apron behind pen 2's bund both see the beams, the kiosk (the release is in sight across the beams), the floodlit apron in front of it and the patrol.
- **Exercise 1 (partner throw, teach):** A stands behind the bund and throws B over the beams into the dark between pen 2 and the switchroom. Wow option: throw B onto the patrol as he passes the landing, which knocks him out on landing as in CT. NEW if not built.
- **Exercise 2 (combine: jam a light):**
  - B must cross the floodlit 8 m in front of the kiosk.
  - A jams the floodlight through the gateway: up to 5 s held plus 4 s off.
  - B keys the zone disarm (the release, permanent as now). A walks through.
- **Ways through:**
  - Throw and release.
  - Jam the beams' power panel (existing, sector-fixes P). One player walks through the beams and keys the kiosk for the jammer.
  - Cross the floodlight in the patrol's gap instead of jamming.
- **Teaches:** the throw with far-side release. **Tests:** jamming a light; reading a patrol.
- **Fail / retry:** a broken beam raises the alarm stage and the patrol checks the gateway. The thrown player always has the kiosk.
- **Target:** 1:45.

### A6 - Pump house (mock-up: a tidal barrier pumping station)
- **Footprint:** 24 x 16 m, 9 m high.
  - Pump floor at y 0: three vertical pumps on 1.2 m plinths (low cover).
  - Motor gallery: 2.4 m wide along the north wall, deck edge 4.4 m, with a bridge over the drive bay and a staff stair at the lit east end by the attendant's desk.
  - Drive cage (mesh, solid 1.2 m kick panels, 2.4 m, push-bar door) under the bridge.
  - A 0.6 m cable gland plate in the bridge directly over the drive cabinet. Too small to drop through; a hang-down only, as the current hatch.
  - Outfall door on the east wall, interlocked shut while the duty pump runs (a real interlock).
- **Entry / exit:** L5 into the dark south-west corner. Out by the outfall door to L6.
- **Guard:** the pump attendant on a 32 s loop round the pumps. He passes the cage side-on and is alone at the far pump.
- **Observe / plan:** from the dark doorway behind the pump bank both see the loop, the cage, the gland plate's yellow lifting-point sign on the bridge (the A3 fix: the tell is visible from below) and the outfall door's red interlock lamp.
- **Exercise 1 (rope, short):** A boosts B onto the gallery at its dark west end. B takes the rescue line from the gallery's davit box (confined-space kit, real in wet-well stations) and drops it, and A climbs.
- **Exercise 2 (hang-down, teach):**
  - A at the gland plate lowers B head-first into the cage.
  - B hacks the drive panel as the attendant walks past (the near-miss). The pump runs down (the noise drops) and the interlock lamp goes green.
  - Both drop off the gallery's east end and leave by the outfall door.
  - Optional: a neck-snap if the attendant stops under the plate. NEW if not built.
- **Ways through:** rope (dark) or the staff stair (lit, timed on the attendant's desk stop); then the hang-down, the only way to the drive.
- **Teaches:** hang-down; the rope (see Risks 4). **Tests:** leg-up; patrol timing.
- **Fail / retry:**
  - B seen hanging: the attendant alerts. If built, the holder pulls B up; otherwise B drops into the cage, hacks from the floor (as the current S5 back room) and leaves by the push-bar.
  - Spotted on the floor: the pumps give loops.
- **Target:** 2:00.

### A7 - Server hall (mock-up: a colocation data hall with a two-person cage)
- **Footprint:** 30 x 20 m, 4.0 m slab.
  - Racks 2.2 m in rows east-west, aisles 3.0 m.
  - Target cage: 10 x 6 m, mesh, 2.4 m, x 88-98, z 58-64.
  - Plant corridor: 3.5 m wide along the south side, with 2.0 m cooling units (`noLedge`) and a 6 m grating over the cable trench (loud).
  - Entry lobby at the west end: a glazed door into the hall and one into the plant corridor, with the fire plan on the wall.
- **Entry / exit:** L6 into the lobby. L7 by the hall's east door, maglocked until the cage's dual control opens.
- **Guards and devices:** a tech role-player on a 40 s aisle loop with a torch, alone at the south aisle's end. IR cameras at the hall's north-east corner (fixed) and at the plant corridor's east door (sweeping).
- **Observe / plan:** both glazed doors and the fire plan show both routes, both terminals (T1 on the cage's west face, T2 on its east face, 10 m apart with the cage between) and the cameras.
- **Exercise (sync hack on split paths, teach):**
  - A takes the hall: the tech's loop plus the fixed camera.
  - B takes the plant corridor: the grating (silent crouch, slow) plus the sweeping camera.
  - Each path is about 45 s and each player's challenge is his own.
  - At the cage each terminal's "ready" lamp is visible through the mesh. Both hack (2 s) and must finish inside 1.5 s of each other. The cage unlocks the east door.
- **Ways through:** either player takes either path; the hall path has north or south aisles; the plant path is slow and silent or fast and loud.
- **Teaches:** split-path-and-sync. **Tests:** solo stealth under a patrol and a sweeping camera.
- **Fail / retry:** a failed sync costs the failing player 10 HP (CT; never below 1) and both terminals buzz. The buzz uses the existing hold noise and turns the tech toward the cage, so the pair hides in the rows and retries on his next gap.
- **Target:** 1:50.

### A8 - The Strongroom (graduation; mock-up: a Victorian bank's banking hall and vault)
- **Footprint:** 44 x 28 m.
  - Banking hall: 28 x 22 m, 9 m high, with 1.2 m counters (low cover).
  - Gallery: along the north wall, 3 m deep, deck edge and cornice at 4.4 m. The public stair is at the lit front by the night desk.
  - Security office: 8 x 6 x 3.0 m at gallery level on the gallery's east end, with its own stair down into the vault lobby (the office side opens it).
  - Vault lobby: 12 x 12 m, 5.5 m high (room for the throw's arc).
    - The public grille (3 m bars) on its west side, maglocked fail-safe on the hall's night circuit: the lights and the grille share one isolator.
    - An inner beam curtain at x 140.
    - Time-lock panels: T1 in the outer zone (north wall), T2 in the inner zone beside the vault door. They are 13.6 m apart.
  - Vault (4 x 8 m) and the cash-in-transit dock: 10 x 8 m, the exit zone.
- **Entry / exit:** L7 into the dark vestibule under the gallery's west end. Out through the vault to the cash dock, where both players in the exit zone end the course (G138).
- **Guards and cameras:**
  - N1: static at the lit night desk.
  - N2: a 40 s loop from the hall to the grille, with a 5 s stop looking through the bars and a 5 s talk at N1's desk.
  - The office's duty officer: seated and static.
  - Cameras: C1 over the hall floor, C2 on the east wall watching the last 10 m of gallery to the office door, C3 in the lobby on both panels.
- **Observe / plan:** from the vestibule both see every guard within one cycle, C1-C3, the lighting board (under the gallery by the staff door), the grille, and through the bars the beams and the panel lamps. The L7 board before it holds a scale model of the set, so the pair plans before entering. This is also the rest beat, with a wall medkit.
- **Sequence:**
  1. **Split.** A boosts B... rather: B boosts A to the gallery and stays on the floor (leg-up).
  2. **Cross-level jam.** From the dark centre of the hall floor, B jams C2 (about 15 m) while A covers the gallery's last 10 m to the office (jammer timer).
  3. **Security office.** A takes the duty officer and loops C1-C3 for 60 s. The master clock is on the HUD.
  4. **Timed light and lock isolation.** B isolates the hall circuit at the board: 25 s dark, grille open. N1 walks to the board, so B hides (lure; B can take N1 there). B slips through the grille. A comes down the office stair.
  5. **Throw.** A throws B over the inner beams.
  6. **Sync.** A at T1 and B at T2 hack together inside 1.5 s, on a "partner ready" lamp, before the loop ends and between N2's visits to the grille. The vault opens, the beams drop with the time lock, and both walk out to the cash dock.
- **Ways through:**
  - **Ghost:** time N1 and N2, no takedowns.
  - **Clear the hall:** a dual takedown when N2 stops at N1's desk. B takes N1 from behind the counters while A drops from the gallery onto N2 with the existing ledge takedown, inside 1.5 s.
  - **Loud:** shoot C2 or the hall lamps (alarm stage, rating cost).
  - **Gallery:** the boost or the public stair (timed on N1).
- **Tests:** everything (leg-up split, jam, security loop, light and lock isolation, lure, throw, sync, dual takedown).
- **Fail / retry:**
  - The loop ends: C3 returns. A hack in its view raises the alarm stage and the panels go into a 10 s tamper lockout; A can loop again (the office stair, 10 m).
  - The lights restore: the grille relocks; isolate again after 10 s, or the player inside opens it with the request-to-exit button (existing egress gate).
  - A failed sync: as in A7.
  - An alarm: the set resets to the vestibule.
- **Target:** 3:30.

### Escalation

| Set | New | Combined with |
| --- | --- | --- |
| A1 | Leg-up, ledge relay, bolt | - |
| A2 | Timed light isolation (lure for free) | Leg-up (staging) |
| A3 | Timed jam relay | One guard (offices route) |
| A4 | Security room camera loop, dual takedown | Jam fallback, light lure |
| A5 | Throw with release | Jam on a light, patrol timing |
| A6 | Hang-down (+ rope) | Leg-up, patrol timing |
| A7 | Split-path sync | Solo stealth, cameras |
| A8 | Graduation | All of the above, under two timers |

Kept from the current yard, so the existing devices and e2e steps carry over:
- S1 panels go to A1; the S1 guard's interrogation goes to the A4 and A8 duty officers (G206).
- S2 goes to A1, S3 to A3 and A4, S4 to A5.
- S5's leg-up, hatch and hack go to A6, as does S7's rope.
- S6 goes to A7, S8 to A8's exit.

Removed: the uniform 14 m bays, the plain obstacle walls, the bunker gallery.

## 3. Connections and the whole-yard plan

- **Locks.** Every lock is a set crew holding room: 6 x 6 x 3.2 m, two 1.2 m doors, a briefing board, a slot window into the next set (the 3.8 glimpse), the pad (both on it), and the checkpoint. The door behind locks for good, so there is no backtracking.
- **Walks.** Each transition is 6-8 m (about 12 s).
- **Rest beats.** Wall medkits in L4 (after the first peak) and L7 (the model room, a 30 s rest before the finale).
- **Route shape.** The route spirals:
  - east along the south row (A1-A3);
  - north into the goods shed;
  - west across the goods floor to the substation (A5);
  - north into the pump house;
  - east along the north row (A6-A8) to the cash dock.

Yard: 160 x 72 m (x east 0-160, z north 0-72), flat at y 0. The only upper levels are the A2 staging, A4 mezzanine, A6 gallery and A8 gallery and office (at most 3 walkable surfaces per column).

```
  z (m)  x (m) ->
       0         20        40        60        80        100       120       140       160
  72 |                                                      +---------------------+
  69 |                     +-----------+  +--------------+  |A8 STRONGROOM        |
  66 |                     |A6 PUMP    +--|A7 SERVER HALL|  |gallery 4.4 (north)  |
  63 |                     |HOUSE      |L6|W lobby, rows +--|banking hall    vault+----+
  60 |                     |gallery N  +--|   cage E     |L7|entry W         5.5 m|EXIT|
  57 |                     |drive cage |  |plant corr. S +--|                     |dock|
  54 |                     +-----------+  |              |  |                     +----+
  51 |                          |L5|      +--------------+  |                     |
  48 |                     +----+--+------+                 |                     |
  45 |                     |A5 SUBSTATION |                 +---------------------+
  42 |                     |inner  |beams||
  39 |                     |zone   | x58 ||
  36 |                     |              |--+-----------------+
  33 |                     |              |L4|A4 GOODS SHED    |
  30 |                     |              |--+dock   racking   |
  27 |                     |              |  |pair   aisles    |
  24 |                     +--------------+  |                 |
  21 | +----------+  +--------------------+  |                 |
  18 | |A1 GATE   |  |A2 CARRIAGE SHED    |  |           +--+  |
  15 | |YARD      +--|rakes lit gap rakes |  |           |SR|  |
  12 | |start     |L1|      x46-56        +--+-----------+--+--+
   9 | |  wall    +--|                    |L2|A3 OFFICES |L3|
   6 | |  x12     |  |                    +--|corridor   +--+
   3 | +----------+  |                    |  |cam at E   |
   0 |               +--------------------+  +-----------+
Route: A1 -> L1 -> A2 -> L2 -> A3 -> L3 -> SR -> A4 floor (SE to W dock) -> L4 -> A5 (E apron, W inner zone)
       -> L5 -> A6 -> L6 -> A7 (W lobby to E) -> L7 -> A8 (W vestibule to E vault) -> EXIT dock
```

Rough boxes (x0-x1, z0-z1):

| Area | Box | Area | Box |
| --- | --- | --- | --- |
| A1 | 0-22, 2-20 (gatehouse 0-6, 8-14) | L1 | 22-28, 8-14 |
| A2 | 28-70, 0-20 | L2 | 70-76, 7-13 |
| A3 | 76-100, 0-13 | L3 | 100-106, 7-13 |
| A4 | 76-112, 13-37 (SR 100-106, 13-19) | L4 | 70-76, 30-36 |
| A5 | 40-70, 24-48 | L5 | 50-56, 48-54 |
| A6 | 40-64, 54-70 | L6 | 64-70, 59-65 |
| A7 | 70-100, 50-70 | L7 | 100-106, 57-63 |
| A8 | 106-150, 44-72 | Exit | 150-160, 54-62 |

## 4. Timing table

First run, a pair who know the controls. Min is clean and quick. Max allows one failed attempt or one reset in that area.

| Step | Walk (m) | Min | Target | Max | Cumulative target |
| --- | --- | --- | --- | --- | --- |
| Start, briefing in the gatehouse | 0 | 0:15 | 0:30 | 0:45 | 0:30 |
| A1 Gatehouse yard | 25 | 0:40 | 1:10 | 2:00 | 1:40 |
| L1 | 8 | 0:08 | 0:12 | 0:20 | 1:52 |
| A2 Carriage shed | 55 | 1:00 | 1:45 | 3:00 | 3:37 |
| L2 | 8 | 0:08 | 0:12 | 0:20 | 3:49 |
| A3 Office range | 35 | 0:50 | 1:30 | 2:30 | 5:19 |
| L3 | 8 | 0:08 | 0:12 | 0:20 | 5:31 |
| A4 Security room + goods floor | 55 | 1:20 | 2:15 | 3:30 | 7:46 |
| L4 (medkit) | 8 | 0:08 | 0:12 | 0:20 | 7:58 |
| A5 Substation | 45 | 1:00 | 1:45 | 3:00 | 9:43 |
| L5 | 8 | 0:08 | 0:12 | 0:20 | 9:55 |
| A6 Pump house | 50 | 1:10 | 2:00 | 3:15 | 11:55 |
| L6 | 8 | 0:08 | 0:12 | 0:20 | 12:07 |
| A7 Server hall | 45 | 1:10 | 1:50 | 3:00 | 13:57 |
| L7 (model, medkit, rest) | 8 | 0:15 | 0:30 | 0:45 | 14:27 |
| A8 The Strongroom | 70 | 2:15 | 3:30 | 5:30 | 17:57 |
| Exit dock | 10 | 0:05 | 0:10 | 0:15 | 18:07 |
| **Total** | **~446 m** | **~10:50** | **~18:05** | **~29:30** | |

- **Walking.** About 446 m at about 1.5 m/s is about 5 min. The rest (about 70%) is exercises and waiting on patrols. The longest walk with no decision is the 10 m cash dock.
- **The 15-20 min band.** It holds if a first-run pair needs a retry in at most two or three areas. A retry in every area reaches the max column. If playtests run long, cut A3 by folding its jam relay into the A4 security room approach (saves about 1:40).
- **Co-op spacing.** A co-op beat about every minute, which is denser than CT's 2-3 min on purpose, as Pumphouse Nine argues for a test bed. Set pieces at about 6-8 min (A4), 13-14 min (A7) and 15-18 min (A8). Tension rises 1 (A1) to 5 (A8), with each lock at 1.

## 5. Risks and how the draft handles them

1. **Solo side by side** (A7's split paths, the jammer just standing).
   - Each split is at most 45 s and every waiting player has a live job: jam, hold the rope, hold the hang-down, ping patrols, watch from the security window.
   - The A7 paths end in sight of each other through the cage mesh with "ready" lamps.
   - The A8 split has cross-level help (B jams A's camera).
   - Target: nobody idle more than 30 s (research red flag: 60 s).
2. **One-player solves.**
   - A1: the wall is above solo reach and the bolt is on the far side.
   - A2: the isolator cannot reach cover inside the window at a silent pace, and the shunter walks his route.
   - A3: a jam needs stillness, so nobody jams himself across.
   - A5 and A6: two-body moves.
   - A7 and A8: the panels are 10-13.6 m apart with a cage or beams between, inside a 1.5 s window.
   - A4's console helps both, and its dual takedown needs two.
3. **Timers against LD 6.3 ("no forced timers in stealth sections").** The windows (15 s, 25 s, 60 s and the jam's 5 s) are player-started, always shown, re-armable, and never fail the run. Michael asked for timed exercises, but the spec must still list this for him as loosening L-a, never applied silently.
4. **LD 6.1 (one new mechanic per space).** A6 teaches the hang-down and uses the rope once with no threat. List it as L-b, or move the rope to A8's gallery as a second way up if Michael prefers.
5. **LD 3.2 (three routes plus a secret per guarded space).** The training sets give two or three ways each, not always shadow, high, loud and a secret. List it as L-c (the warehouse precedent L1 counted routes per section).
6. **Engine sight.**
   - Guards see straight up (12.1, G44 not built), so the high routes (A2 staging, A8 gallery) carry solid 1.2 m screens or cornices rather than relying on "guards do not look up".
   - Cameras see in the dark (G240): every camera is beaten by a jam, a loop or timing, never darkness. A3's panel says so.
   - Jam targets keep open line of sight. Check that the A4 window, A7 mesh and A8 grille collide as see-through for guards but do not block jam lines where a jam is planned through them. A8's planned jams do not pass through the grille.
7. **Accidental traversal.**
   - Box vans on 4.5 m track centres would leave 1.9 m gaps between 3.6 m faces, which is an automatic split gap. Use 5.0 m centres or 3.4 m vans (this draft uses both).
   - Racks, cooling units, transformers, the kiosk and the cage top must be `noLedge`.
   - No lips between 3.8 and 4.3 m except the planned 4.4 m co-op lips (A1 wall, A2 staging, A6 gallery, A8 gallery).
8. **New code for the mechanics catalogue to confirm** (A3: basic prototypes only):
   - a timed isolator (a light group off for N s, plus guards walking to relight, G180 G11);
   - the console loop on a timer (it is permanent now);
   - an alarm triggering the set reset;
   - active patrolling role-players in course mode (course guards are passive now);
   - "partner ready" lamps on the panels;
   - course bays laid out freely (the code assumes `bayX(i) = 22 i` in a line);
   - optional: the throw knockout on landing, the hang-down neck-snap, the holder raising a hung player.
9. **Two timers at once in A8** (60 s loop, 25 s lights) could confuse. Both are on the HUD with their own lamps and sounds. The order falls out of the space (the grille is in C1's view, so the loop comes first). There is at most one hard rule (none; alarms escalate).
10. **Outdoor sets** (A1, A5) need a sky fill under light parity. If the moon is unwanted, roof A1 as the lorry shed and A5 as an indoor gas-insulated switchgear hall, which is real at urban sites. Sizes are unchanged.
11. **Reading where to start** (CT misfires: the hang-down, the scanners). Every co-op device has a visible tell from the problem side (lifting-point sign, kiosk in view, ready lamps, fire plan, model room) and a prompt naming the move and who starts it (A20).
12. **Guard count.** At most 3 role-players per set, 12 across the yard, all spawned per set: inside `SQUAD_CAP` 9 and `MAX_ALIVE` 12. Each guard has a named isolation moment:
    - shunter: at cabinet 1;
    - cleaner: office 3's far desk;
    - D1 and D2: the kettle;
    - substation patrol: the kiosk stop;
    - attendant: the far pump;
    - tech: the south aisle's end;
    - N1: at the board;
    - N2: at the grille;
    - duty officers: seated and alone.
