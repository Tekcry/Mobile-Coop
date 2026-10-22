# Marlow Yard final - co-op scenario catalogue and training-yard sequence

Research for marlow-final (Course Ready Build, 2026-10-23). Read-only research; nothing here is decided until Michael
says so. Sources read in full: `CLAUDE.md`, `docs/ct-research/*` (levels, moves-mechanics, kit-design, design-kit,
code-inventory, DECISIONS-PENDING, README), `docs/design-bible.md` P6, 3, 4, 5.5, 5.7-5.9, 7, `docs/level-design.md`
section 11 (and 12), `docs/DECISIONS.md` co-op entries (G48-G57, G76-G81, G124-G160, G179, G184-G269). Device status
was spot-checked in `src/` (master worktree, 2026-10-23); the device inventory should confirm it.

Scrubbed (G6): no reference-game character, gear or organisation names. "CT" names the reference. CT missions are named
by place: Training, Panama (canal offices), Seoul, Chemical Bunker, Train Station, Nuclear Plant, UN HQ; V2 = the
PS2 / GameCube cut, HH = the handheld campaign.

**Tags for Michael's list:** L lights, C cameras, K locks, SR security room, J jammer, SH sync hack, W other wow.

**Device status:** EXISTS (in code now), PARTIAL (exists with a gap), NEW (not in code). Numbers are starting values
(G10).

What exists today (spot check): leg-up, ledge relay, partner throw, hang-down, two-person rope (`TeamKind` boost /
ladder / throw / hang / rope); the held jammer on lights, cameras and laser power panels (5 s max hold; a camera
reboots 1.5 s; a light stays off 4 s then flickers back); laser bands and their power panels; paired scanners (2 s hack,
1.5 s window, 10 HP only for a late or abandoned hack, G193); the security console (works once its guard is down; turns
its cameras off until the bay restarts, no timer); course gates lever, bolt, hold, timedHold (open while held + `after`
s), pair (window), egress, mains, flag, anchorLock, pickup; cameras that see in the dark (G240) with the red view grid
(G222) and the hallway send-back; guards who walk to a light that went out (`lightsOut`); grab, interrogation guard
(G206); revive with countdown; wall medkits; dual takedown as a 1.5 s banner only.

---

## 1. Catalogue: every distinct CT co-op set piece

Each entry: what the two players do; timing; devices; failure state in CT; why it is fun (research evidence).

### Reach and traversal

**S1 Over the wall, far-side bolt** (Training first wall; Train Station ticket-booth drop; Chemical Bunker control
room). Tags K, W.
- Do: A crouches and boosts B over a wall or onto a booth roof; B drops inside (onto a guard in Train Station) and opens
  the door locked from the far side.
- Timing: untimed; handshake a few seconds.
- Devices: Leg-Up; a door that opens only from inside.
- Fail: none; no room = head shake. Many pairs stalled here because crouch = boost, stand = throw was untaught.
- Fun: the first "two bodies reach where one cannot"; the door guarantees the reunion.

**S2 Window or ceiling entry** (Panama facade window and ceiling hole; Seoul hotel holes x4; Train Station tunnel
ledge, phone-booth roof, washroom ceiling). Tags W.
- Do: Leg-Up, then the boosted player hangs and the partner climbs his body (Ledge Relay); both arrive.
- Timing: untimed. Devices: Leg-Up + Ledge Relay at a 4.3-4.5 m lip (G57).
- Fail: a hidden ceiling route with no tell was CT's top stuck point.
- Fun: an ordinary facade becomes an entrance no guard watches; both act twice, nobody is stranded.

**S3 Launch over a laser, far-side release** (Training; Chemical Bunker laser corridor). Tags L, K.
- Do: A stands and throws B over a laser band; B, alone on the far side, hits a switch or computer that drops it.
- Timing: B is alone 20-30 s. Devices: Partner Launch with a landing reticule (red = no); laser band; release switch.
- Fail: touching the laser = alarm.
- Fun: the mode's signature move; the thrower is stranded and dependent.

**S4 Launch onto a lured guard** (Train Station bomb pair 1). Tags L, W.
- Do: A shoots out a far light; a guard walks to it; B throws A over the bomb laser so he lands on the guard (knockout).
- Timing: tied to the guard's walk. Devices: shootable light, guard lure, throw that knocks out at the landing.
- Fail: early throw = guard sees; touching the laser = detonation.
- Fun: "throw your buddy at guards" is the most quoted CT co-op memory.

**S5 Launch across a gap into a one-way door** (Chemical Bunker cryo tank). Tags K.
- Do: B is thrown across a tank, takes a guard, opens a one-way door for A. No way back.
- Devices: throw, one-way door. Fail: guard alerted. Fun: commitment; the pair cannot retreat.

**S6 Launch across a hall, stop the machine, rope back** (Nuclear Plant turbine hall). Tags W.
- Do: B is thrown to a far balcony, switches off the fans, climbs into the fan inlet and brings A up by rope.
- Devices: throw, fan machine with an off switch, rope. Fail: players did not read the fan's state ("what is the fan
  for?"). Fun: a machine changes the map; the lesson is to show machine state.

**S7 Belay climb** (Training last drill). Tags W.
- Do: B is thrown over barbed wire, climbs a pipe and drops a rope; A climbs while B steers him sideways clear of
  hazards.
- Devices: rope anchor (authored). Fail: none documented. Fun: continuous partner control, the most interdependent
  training drill.

**S8 Shaft descent and climb back** (Chemical Bunker silo A; V2 silo with wall sensors). Tags W.
- Do: A lowers B down a shaft; B presses a panel at the bottom and climbs back up A's rope; V2: A steers B past alarm
  sensors on the shaft wall.
- Devices: Belay Line, panel, wall sensors. Fail: sensor touch = alarm. Fun: a soft, spectacular opening move.

**S9 Operate-and-jump platform** (Chemical Bunker silo B). Tags W.
- Do: the panel now raises a platform; B rides, A operates it and jumps on at the last moment.
- Timing: a short boarding window. Devices: moving platform with a panel. Fail: miss it and go round. Fun: a timed
  team jump with a laugh in it.

**S10 Drop Line hack** (Training laser room; Panama duct keypad opening the gallery gates). Tags K, L.
- Do: A holds the rope and lowers B head-first through a hatch; A controls height; B hacks a computer or keypad that
  kills a laser grid or opens gates.
- Devices: Drop Line anchor, hack panel. Fail: players looked at the grille, not the ceiling (no tell).
- Fun: the most cinematic image; the hanging player's life is in the holder's hands.

**S11 Drop Line retrieve, plant, then listen** (Chemical Bunker sample from a cryo tank; Train Station bug on a payphone
in a vast hall, then wait and listen to the call). Tags W.
- Do: lowered player takes an item or plants a bug; both then hold position while the call plays.
- Devices: Drop Line, item or bug, scripted call. Fail: seen while hanging. Fun: upside down in the middle of a public
  hall; the wait is story, objective source and rest beat at once.

**S12 Stack under a watcher, timed demolition** (Seoul, two air-defence vehicles; V2 lift-shaft charge). Tags W.
- Do: one stands on the other's shoulders to plant a charge on a vehicle while a balcony watcher overlooks; detonate
  from cover; a 5 min timer (V1) runs around the second vehicle.
- Devices: Stack (authored), charge, a shown countdown with radio warnings. Fail: timer effect unknown; watcher alarm.
- Fun: taught then tested in one mission; timer pressure.

### The jammer and devices

**S13 Jam-and-pass, then swap** (Training corridor; Panama camera corridor). Tags C, J.
- Do: A stands still and holds the jammer on a camera; B crosses; B holds it from the far side; A crosses.
- Timing: the jammer's draining charge is the soft timer. Devices: held jammer, camera. Fail: camera sighting = alarm.
- Fun: the cheapest forced co-op; every camera becomes a two-person gate with no scripting.

**S14 Light kill for a pass** (Panama "broken elevator" corridor: one jams the overhead light while the other slips past
the camera; Train Station small room light). Tags L, J.
- Do: one holds a light off so the other can pass or drop unseen; swap.
- Devices: jammer on a light. Fail: seen in the light. Fun: making your own dark for someone else.

**S15 Laser-grid relay, breaker inside the grid** (Panama exhibition floor, crossed twice). Tags J, L.
- Do: one jams a glowing breaker box that sits inside the grid while the other crosses; swap; repeat on the way back.
- Devices: laser grid, jammable breaker (an email explains why it is only reachable remotely). Fail: beam = alarm.
- Fun: a visible draining charge while your partner is mid-grid (near-miss tension).

**S16 Flank the sentry** (Seoul turret hall and boat; Train Station repair-yard turret). Tags J.
- Do: one jams an automatic turret; the other runs behind it and switches it off at its panel.
- Devices: turret with a rear panel. Fail: shot. Fun: suppress-and-flank in two seconds. Note: lethal turrets only at
  military or private compounds (G128); a training stand-in is a tracking floodlight or camera with a rear isolator.

**S17 Jam-and-hack** (kit digest guide patterns; Panama server room uses a shot light instead). Tags C, J.
- Do: one jams the camera watching a computer while the other hacks it.
- Timing: hack must fit inside the jam. Devices: camera, terminal. Fail: camera alarm. Fun: protector and worker in one
  breath.

**S18 Escort past a jammed camera** (V2). Tags C, J.
- Do: one walks a captive to a scanner while the other jams the camera on the route. Fun: three-body choreography.

**S19 Leapfrog relay** (V2: turrets that cannot be switched off, duct gates opened alternately, throw then rope). Tags J,
K.
- Do: each opens the next stage for the other in turn. Fun: rhythm; nobody waits long.

### Sync actions

**S20 Paired scanners** (Training). Tags SH, K.
- Do: each player hacks one of two scanners on opposite walls; both must finish together.
- Devices: two scanners. Fail: a failed hack costs health (Training) or raises an alarm (missions). CT flaw: one player
  could do both. Fun: the "3, 2, 1, now".

**S21 Living Key: two captives at paired scanners** (Panama 3F, Chemical Bunker storage room). Tags SH, L, K.
- Do: hall lights off so a guard leaves the security office to fix them; A grabs him; B grabs the executive in his
  office at the far end; both force their captives to the paired scanners at the same moment; hacking both is the
  fallback.
- Devices: light switch lure, grab, force to scanner. Fail: wrong face = alarm; killing the protected executive fails.
- Fun: capture, split and sync folded into one beat; makes non-lethal play useful. Panama's first peak.

**S22 Two-station mix** (Chemical Bunker cryo chamber). Tags SH.
- Do: each enters his own colour sequence (3 / 4 / 5 inputs by difficulty) in turn, quickly.
- Fail: a wrong input releases ceiling gas that hurts or kills. Misfire in CT: lethal trial and error, PC inputs that
  did not register (A5, A6). Fun when forgiving; frustrating as shipped.

**S23 Spotter-Operator crane** (Chemical Bunker). Tags W.
- Do: A drives a crane from a control room with no view of the target; B stands at the missile cradle and talks him in
  with callouts (back, forward, left, right, lower, raise, stop).
- Fail: undocumented. Fun: the purest asymmetric-information beat; communication is the mechanic.

**S24 Laser-linked twin bombs, sync wire cut** (Train Station x3 in quick succession; Chemical Bunker warhead). Tags
SH, L.
- Do: a laser between two bombs splits the pair (each goes round to one bomb); thermal shows the live wire, which
  changes over time; both cut together, then a second wire before a timer ends.
- Devices: laser link, thermal, a device timer. Fail: touching the laser, a wrong wire or one player early =
  detonation. Fun: the tensest CT co-op moment; also the most-asked "how do we do this" (no prompts).

**S25 Paired switches and paired code lock** (V2 lifts and doors; V2 bunker; HH two switches). Tags SH, K.
- Do: buttons on both sides of a door pressed together; or each decodes half a code and the first waits. Fun: a light
  sync at chapter ends.

### Light, guards and roles

**S26 Light lure and ambush** (Panama: switch off the hall lights, the guard comes out; Train Station escalator).
Tags L.
- Do: one kills a light; the other waits in the dark where the guard will walk and takes him.
- Devices: switch or shot light, guards who come to fix lights. Fail: seen. Fun: you set the trap together.

**S27 Protect-while-act** (Panama archive: one searches the cabinet, the other takes the guard who comes to fix the
lights; Seoul officer and escorts; Train Station locker). Tags L.
- Do: a slow action by one, a scripted interrupter for the other. Fun: the non-acting player has a real job.

**S28 Double Drop** (every mission; a player favourite). Tags W.
- Do: both take one guard each at the same moment; if one is early, the other guard reacts.
- Fun: "coordinated multi-kills hook you". CT had no dedicated move: two ordinary takedowns timed together.

**S29 Blackout from above** (Chemical Bunker operating theatre: one shoots the X-ray light board from the ledge, the
other drops for two takedowns; the missile hall's lights shot out early from an overlook, used at the end). Tags L.
- Do: one owns the light, the other owns the guards. Fun: overlook, prepare, payoff.

**S30 Security computer shuts the cameras** (Chemical Bunker: a computer disables the camera system; UN HQ control
room with cameras off; Nuclear Plant security doors opened from a nearby computer). Tags SR, C, K.
- Do: reach the control computer (usually guarded), then the cameras or doors elsewhere go off.
- Fun: one action reshapes the whole next space. In our game: the sector-fixes security console (EXISTS).

**S31 Read the code as it is typed** (UN HQ: lure a guard to a keypad; watch him type through a stick-camera with
thermal or night vision; the partner can watch the feed). Tags K, W.
- Do: one lures, one watches. Fun: information only one can see.

**S32 Joint questioning** (Train Station locker code only given to both; Seoul double). Tags K, W.
- Do: one grabs and questions while the other takes the bodyguard; the code comes only to a joint interrogation. Our
  rule: two-person questioning is non-violent (G148).

**S33 Single entrant** (Train Station: one antidote dose, one player enters). Tags W.
- Do: the story assigns the roles; the other covers. Fun: forced asymmetry. CT flaw: a forced kill (A13).

**S34 Parallel routes that re-merge** (Train Station metro: split either side of a parked train, one dark side, one
narrow gap; sync cut; regroup through the dark car; V2 lift that stops on two floors). Tags SH.
- Do: each gets a personal mini-challenge; a defined merge. Fun: alone but together.

**S35 Escort and carry-out** (Seoul: one carries the captive, slow and unarmed; the other opens doors and clears).
Tags W.

**S36 Stun through a window, then breach** (Seoul cafe: stun the target from a ledge outside, then Leg-Up + Ledge Relay
in, break the lock before he flees). Tags K, W.

**S37 Rescue** (every mission: one falls in front of a guard, the other clears the room and revives within about
30 s). Tags W. The favourite player stories.

**Timed windows seen in CT** (for Michael's timed items): jammer charge (soft timer, about 20 s fan memory; ours 5 s
per hold); Seoul 5 min demolition timer (shown, radio warnings); UN HQ hidden 20 min bomb timer (players hated it, A14);
bomb wires that change over time; HH 15 s panel windows and a 6 min extraction countdown; V2 cycling floor laser crossed
in rhythm; V2 drone over a laser floor that wakes when a beam breaks.

**Also seen, minor:** zip line drop into an open arena (Seoul); balcony ledge shimmy in turn (Panama, solo moves);
motion-sensor doors; a metal detector shut at terminals (UN HQ); wall mines spotted in electro; a guard room that opens
only on an alarm.

---

## 2. Michael's list against the catalogue

| Michael's item | CT set pieces | Our device today |
| --- | --- | --- |
| Lights (timed isolation) | S3, S4, S10, S14, S15, S21, S26, S27, S29 | Jammer on a light (off 4 s after release) EXISTS; switches / light groups EXISTS; guards walk to a dead light EXISTS (relighting: check); a timed breaker blackout (zone dark for N s, then relit) NEW |
| Cameras | S13, S14, S17, S18, S30 | Camera + jammer (5 s hold, 1.5 s reboot) EXISTS; cameras see in the dark (G240): darkness never beats a camera, unlike CT |
| Locks (timed isolation) | S1, S5, S10, S19, S20, S21, S25, S30, S31, S32, S36 | Bolt (far side), lever, hold, timedHold (open while held + `after` s), flag, pair EXISTS; a timed maglock release with a shown countdown PARTIAL (timedHold has no visible countdown); keypad with an in-world code NEW; one-way door CHECK |
| Security room disables cameras | S30 (and S21's security-office lure) | Console EXISTS but off until bay restart; a timed shut-off (N s with a countdown) NEW; a two-key console NEW |
| Timed jammer exercises | S13, S14, S15, S16, S17, S18, S19 | Jammer EXISTS; laser power panels EXISTS; the 5 s hold + 1.5 s reboot is the timer |
| Hacking devices in sync | S20, S21, S22, S24, S25, S34 | Paired scanners EXISTS (2 s hack, 1.5 s window); Living Key NEW; live-wire cut NEW; a shown 3-2-1 / ready lights CHECK |
| Other co-op wow | S2, S4, S6-S12, S23, S28, S33, S35, S37 | Throw, hang-down, rope EXIST; throw-landing knockout NEW; Double Drop as a gate PARTIAL (banner only); Stack NEW; Spotter-Operator NEW |

---

## 3. Proposed 15-20 min training-yard sequence (8 areas)

**Fiction.** Marlow Yard stays the unit's assessment site. Today it is eight square test cells in a bunker gallery.
Proposal: the course runs through the yard's real buildings on the surface, then down the old ventilation shaft into
the bunker's signals hall for the finale. The instructors have rigged each building as a live security exercise: real
cameras, real locks, role-player guards (knockout only, reset by the instructors, G80). Each area has a function, a
reason for every device, and a one-way exit into the next (no backtracking). Every area has an encounter checkpoint at
its entry (bay restart, as today).

**Escalation.** Areas 1-3 teach single moves; 4-6 combine two; 7 is the rest and overlook; 8 is the climax with several
devices in sync. Roles alternate (who boosts, who is thrown, who jams).

**Times** are for a first-time pair that knows the controls (expert pair in brackets). Total about 15.5-19.5 min
(about 7 min expert).

### Area 1 - Gatehouse and perimeter wall (1.5-2 min, expert 0:40)

- **Setting.** The yard's vehicle gate after hours: a gatehouse with one floodlight on a pole over the apron, the
  pedestrian gate bolted from inside, a 4.4 m yard wall beside it. The gate guard (the interrogation guard, G206) sits
  in the gatehouse with his back to the window.
- **Teaches.** The handshake (crouch = Leg-Up, stand = Launch, named by the prompt, A20); Ledge Relay; making dark
  (shoot or switch the floodlight); the optional grab and interrogation.
- **Set piece.** S1 + S2: Leg-Up one over the wall in the dark strip; the boosted player unbolts the pedestrian gate from
  inside (far-side release). Optional: Ledge Relay so both go over the wall instead.
- **Solo-impossible.** Wall above solo reach (3.8 m) and inside the 4.5 m co-op band; the gate opens only from inside.
- **Timer.** None (soft opening).
- **Fail / retry.** The floodlight exposes; the gate guard turns and raises the first alert tier; restart at the gate.
- **Flow.** The gate opens onto the yard road, which runs straight to the office block door; the gate swings shut behind
  (one-way).
- **Devices.** Leg-Up, Ledge Relay, bolt gate, shootable lamp, interrogation guard: EXISTS.

### Area 2 - Office block corridor (1.5-2 min, expert 0:45)

- **Setting.** The ground-floor corridor of the yard office block, 18 m long, 2.4 m wide, one camera at the far end
  covering its length (it guards the stairs to the security office). A recessed fire-hose cabinet bay halfway (a real
  fitting) is the only blind pocket. One lit glazed office door near the far end.
- **Teaches.** The held jammer and its budget: 5 s hold, then a 1.5 s reboot, then the camera is live again.
- **Set piece.** S13 as a timed relay: A jams from the near end; B crouch-runs to the hose bay (about 9 m, about 5 s at
  crouched run); the camera comes back; A jams again; B reaches the far end; B jams from there for A (two holds again).
  S14 add-on: B also holds the lit office door's light off while A passes it.
- **Solo-impossible.** The jammer only works while held and standing still; the corridor needs two holds per crosser.
- **Timer.** The jam window (5 s + 1.5 s reboot), shown by the gun light and the camera's grid going dark.
- **Fail / retry.** The camera sees you: sent back to the lobby (the existing hallway send-back), alert tick.
- **Flow.** Far end: the stairs up to the security office (Area 3); the corridor door locks behind.
- **Devices.** Jammer, camera, send-back, light jam: EXISTS. Mid-corridor pocket: geometry only.

### Area 3 - Security office (2-2.5 min, expert 1:00)

- **Setting.** The first-floor security office: a monitor wall showing the yard cameras, a duty guard at the desk, a
  supervisor's key switch in a glass-fronted cubicle 6 m from the desk console (the real rule: the CCTV can be taken
  down for maintenance only with operator and supervisor together). The office lights are on a breaker in the landing
  outside.
- **Teaches.** Light lure (S26), grab or Double Drop, then a two-key action (S20 form) on a real security system.
- **Set piece.** S21 / S30 light-lure form: A throws the landing breaker; the duty guard walks out to it with a torch;
  B, waiting in the dark beside the breaker cupboard, takes him (or A and B take him and the patrolling guard on the
  landing together: Double Drop, S28). Then the shut-down: A at the console, B at the supervisor's key, both within the
  1.5 s window: the yard cameras go off for 45 s, with the countdown on the monitor wall.
- **Solo-impossible.** The console and key are 6 m apart inside a 1.5 s window; the guard lure needs one at the switch
  and one waiting where he walks (the breaker is in his view from the desk, so the switcher is exposed if he also waits).
- **Timer.** The 45 s camera blackout starts when both keys turn; it is the clock for Area 4.
- **Fail / retry.** A missed window resets both stations (no HP cost unless late or abandoned, G193) and ticks the alert
  tier; the guard sees you: alert tier, restart at the stairs. Players may also start the blackout and then fail Area 4:
  the console can be re-armed once the countdown ends (after 20 s).
- **Flow.** A fire door from the office opens onto an external steel stair down into the container yard (Area 4); the
  pair watch the yard from the landing while they run the console (overlook).
- **Devices.** Breaker / `lightsOut` lure, grab: EXISTS. Console needs its guard down: EXISTS. Two-key console: NEW
  (or reuse `pair` with the console and key as its two devices: PARTIAL). Timed camera shut-off with a shown countdown:
  NEW. Double Drop as a gate (two knockouts within 1.5 s sets a flag): PARTIAL (the banner exists).

### Area 4 - Container yard (2 min, expert 0:50)

- **Setting.** The open loading yard between the office block and the warehouse: three pole cameras over the lanes,
  stacked shipping containers (2.6 m each, two high = 5.2 m), one patrolling yard guard with a torch, a floodlit dock at
  the far side. The warehouse dock door is a roller door with a hand chain inside and a pedestrian door with a
  push-bar (opens from inside only, fire code).
- **Teaches.** Using a timed isolation; split routes that re-merge (S34); cameras off is not guards off.
- **Set piece.** With the cameras dark for 45 s, the pair split: A takes the low lane in the containers' shadow behind
  the guard; B is boosted onto the container stack (Leg-Up to the 2.6 m top, then a short climb) and runs the roof line
  to the dock canopy, drops behind the dock, and opens the pedestrian door from inside for A (S1 form). If the blackout
  runs out, the jammer holds one pole camera at a time (S13 fallback).
- **Solo-impossible.** The stack and canopy need the boost; the dock door opens only from inside; the three cameras
  cannot be jammed together by one player.
- **Timer.** The 45 s blackout from Area 3, shown on a yard clock (or the HUD course line).
- **Fail / retry.** A camera sees you after the blackout: alert tier and the yard guard investigates; the guard sees you:
  alert tier; restart at the bottom of the office stair, cameras re-armed.
- **Flow.** Through the dock door into the warehouse (Area 5); the door locks behind.
- **Devices.** Cameras, Leg-Up, inside-only door (bolt): EXISTS. Yard clock / visible countdown: NEW.

### Area 5 - Warehouse (2-2.5 min, expert 1:00)

- **Setting.** A cold-store warehouse: a high bay with racking aisles, a goods conveyor across the middle in a 1.2 m
  pit, a laser band across the conveyor gap (a theft-prevention beam added after a break-in, noted on a facilities
  memo on the dock desk), its power panel high on the far wall, the hall lights on one isolator at the dock (plant
  maintenance isolator), one guard on the far side.
- **Teaches.** Timed light isolation; Partner Launch with a far-side release; the throw as an attack.
- **Set piece.** S3 + S4 combined: B throws the light isolator (lights off while held + 10 s, then they come back) and
  lets go; the far guard walks towards the dock to check the dead lights; in the dark, A throws B over the laser band
  so he lands on the guard (knockout) or beside him; B hits the release (or A jams the panel from the near side, S15
  fallback) and the band drops for A.
- **Solo-impossible.** The throw needs a thrower; the release is on the far side; the blackout is too short to cross the
  pit alone and reach the panel.
- **Timer.** Lights off for the hold + 10 s (shown by a breaker lamp that blinks the last 3 s); the laser panel jam
  window (5 s + reboot) as the fallback.
- **Fail / retry.** Touching the beam: alarm tier; the guard sees you: alert tier; restart at the dock door.
- **Flow.** The far aisle leads to the warehouse office stair and up to the archive mezzanine (Area 6); a one-way gate.
- **Devices.** Partner throw, laser band, release, laser power panel, light switch group, `lightsOut` lure: EXISTS.
  Timed light isolator (hold + after) for lights: PARTIAL (timedHold exists for doors). Throw-landing knockout: NEW.

### Area 6 - Records archive (2-2.5 min, expert 1:00)

- **Setting.** The yard's records room on the mezzanine: lit, locked steel shelving cage with a keypad, a camera in the
  corner watching the cage door, a roof-light hatch in the ceiling above the keypad, reached from the warehouse roof
  walkway. A guard does a round to the archive every 60 s (a real tour).
- **Teaches.** Drop Line (S10), jam-and-hack (S17), protect-while-act (S27).
- **Set piece.** From the roof walkway, A lowers B head-first through the roof-light; A controls height; B hacks the
  keypad (2 s) to open the cage; the corner camera sweeps the keypad: B jams it while hanging (the jammer works on the
  rope), or A shoots the archive lamp first. The round guard arrives on schedule: B pulls up to hide (or neck-snap
  knockout), A keeps him steady. Inside the cage: the shaft key for Area 7 (per-run cage number read on the memo, G143).
- **Solo-impossible.** The hang needs a holder; the keypad is only reachable from above (the cage door is watched and
  lit).
- **Timer.** The guard round (60 s, readable from his radio line and torch) and the jam window.
- **Fail / retry.** Seen while hanging: alert tier, restart on the roof walkway.
- **Flow.** The key opens the ventilation-shaft head house on the roof (Area 7).
- **Devices.** Hang-down, hack panel, jammer, camera: EXISTS. Hide pose while hanging and hang neck-snap: CHECK. Pickup
  key item: EXISTS (pickup gate). Per-run code read in-world: NEW.

### Area 7 - Ventilation shaft into the bunker (1.5 min, expert 0:40; rest beat)

- **Setting.** The bunker's main air shaft (a real Cold War intake), 14 m deep, with a rope anchor at the head house;
  motion sensors on the shaft wall at two depths. At the bottom, a plant-room grille looks out over the signals hall:
  the overlook.
- **Teaches.** Belay Line steering (S7, S8); the overlook and plan (CT's missile hall).
- **Set piece.** A lowers B; A swings B sideways past the two wall sensors on B's left / right callouts; B lands, takes
  the slack, and A comes down the rope (B holds). At the grille, both see the finale: the two key consoles under lit
  placards, the camera, the laser fence across the hall, the two guards and the lit status board linking the consoles.
  A wall medkit is here.
- **Solo-impossible.** The rope needs a holder; the sensors need steering from above.
- **Timer.** None (rest).
- **Fail / retry.** A sensor touch: alert tier (the hall guards go to search), restart at the head house.
- **Flow.** The plant-room door opens onto the hall's upper gallery: no way back up.
- **Devices.** Rope: EXISTS (today: leg-up then rope up a wall). Lowering a partner and side steering: CHECK. Shaft wall
  sensors: NEW.

### Area 8 - Signals hall: the climax (3-4 min, expert 1:30)

- **Setting.** The bunker's two-level signals hall. The goods-lift blast door (the exit) opens only on a two-person
  release at two key consoles 20 m apart on opposite sides of a laser fence (the Cold War two-person rule, printed on a
  placard at each console). One camera on the floor console; the gallery console behind a maglock door; two guards on
  mutual watch on the floor; the hall lights on a mains switch on the gallery.
- **Teaches.** Nothing new: everything together, in sync.
- **Set piece, in order.**
  1. **Split** (S34): the laser fence (S24's splitting laser) keeps A on the gallery and B on the floor.
  2. **Jam-and-hack** (S17): A jams the floor camera from the gallery (5 s) while B hacks the floor terminal (2 s); the
     hack releases the gallery maglock for 10 s.
  3. **Timed lock** (K): A has 10 s to get through the gallery door before it relocks.
  4. **Lights and Double Drop** (S26, S28): A throws the hall mains (lights off 15 s); the two floor guards turn to look;
     B and A (dropping from the gallery stair) take them within the window (optional; a ghost route lets the pair wait
     out their patrol).
  5. **Two-key release** (S20, the climax sync): each at a console, ready lights on both placards and the status board,
     3-2-1, keys turned within 1.5 s.
  6. **Exit**: the blast door opens for 20 s; both must be in the goods lift (G138).
- **Solo-impossible.** The fence splits the pair; the camera must be jammed while the terminal is hacked; two consoles
  20 m apart in 1.5 s.
- **Timers.** The jam window (5 s + reboot), the maglock (10 s), the blackout (15 s), the sync window (1.5 s), the blast
  door (20 s). All shown; no hidden clock.
- **Fail / retry.** Beam touched or camera sight: alert tier and the guards search; a missed sync resets the consoles
  after 10 s and ticks the tier, never death (A5); restart at the gallery door.
- **Flow.** The goods lift ends the course (both in).
- **Devices.** Jammer, camera, laser fence, paired scanners as the consoles, mains switch, egress / flag gates: EXISTS.
  Timed maglock with countdown: PARTIAL (timedHold, no shown countdown). Ready lights and status board: CHECK. Double
  Drop gate: PARTIAL. Timed lights mains: PARTIAL. Blast door that stays open 20 s then closes: NEW.

### Pacing check

| Area | Min (first-time) | Beat | Intensity |
| --- | --- | --- | --- |
| 1 Gatehouse | 0-2 | small: Leg-Up, release | 1 |
| 2 Corridor | 2-4 | small: timed jam relay | 2 |
| 3 Security office | 4-6.5 | set piece 1: lure + two-key, cameras off | 3 |
| 4 Container yard | 6.5-8.5 | timed crossing, split + merge | 4 |
| 5 Warehouse | 8.5-11 | set piece 2: blackout + throw onto guard | 4 |
| 6 Archive | 11-13.5 | set piece 3: Drop Line + jam-and-hack | 3 |
| 7 Shaft | 13.5-15 | rest + overlook | 1 |
| 8 Signals hall | 15-19 | climax: split, jam-and-hack, timed lock, Double Drop, two-key | 5 |

A co-op beat every 1.5-2.5 min (denser than CT's 2-3 min, as a training course should be). No player idle over about
30 s: in every area both have a job. Every split ends at a named merge (dock door, cage, shaft foot, the lift).

### Move coverage

| Move / device | Areas |
| --- | --- |
| Leg-Up / Ledge Relay | 1, 4 |
| Partner Launch (+ landing knockout) | 5 |
| Drop Line | 6 |
| Belay Line | 7 |
| Jammer on camera / light / laser panel | 2, 4, 5, 6, 8 |
| Two-key (sync hack) | 3, 8 |
| Security room | 3 |
| Timed light isolation | 5, 8 |
| Timed lock | 4 (inside-only door), 8 (maglock, blast door) |
| Light lure / Double Drop | 3, 5, 8 |
| Grab / interrogation | 1, 3 |
| Revive, medkit | anywhere; medkit in 7 |

Not used (NEW in code, CT has them): Stack (S12), Living Key (S21 captive form), Spotter-Operator (S23), live-wire cut
(S24), two-station mix (S22). Candidates if Michael wants more: Living Key as an alternative at Area 3's console, a
Spotter-Operator hoist in Area 5.

---

## 4. Michael's words and which area answers them

| Michael (job prompt) | Area |
| --- | --- |
| "well designed training areas designed to replicate real map coop scenarios" (verbatim) | All 8: each is a real building with a reason and a CT source (Areas 1-8 cite S1-S37) |
| "(all the cool actions that players can do together)" (verbatim) | Move coverage table: every built team move plus jammer, two-key, lure, Double Drop |
| Timed isolation of lights (as relayed) | 5 (isolator hold + 10 s), 8 (mains 15 s) |
| Timed isolation of cameras (as relayed) | 3 -> 4 (45 s camera blackout), 2 / 6 / 8 (jam windows) |
| Timed isolation of locks (as relayed) | 8 (maglock 10 s, blast door 20 s); 1, 4 (inside-only doors) |
| A security room that disables cameras (as relayed) | 3 |
| Timed jammer exercises (as relayed) | 2 (relay with the 5 s budget), 6 (jam while hanging), 8 (jam-and-hack) |
| Hacking devices in sync (as relayed) | 3 (console + key), 8 (final two-key) |
| Other co-op "wow" moments (as relayed) | 4 (split over the container roofs), 5 (throw onto a guard), 6 (upside-down hack), 7 (shaft and overlook), 8 (climax) |
| One co-op run takes 15-20 min (as relayed) | Total about 15.5-19.5 min first-time |

---

## 5. Device features to check against the inventory

| Feature | Areas | Status |
| --- | --- | --- |
| Timed camera shut-off from the console, shown countdown, re-arm | 3, 4 | NEW (console today: off until bay restart) |
| Two-key console (console + supervisor key, 1.5 s window) | 3 | NEW, or `pair` gate reuse (PARTIAL) |
| Visible countdown for device windows (world clock or HUD course line) | 3, 4, 5, 8 | NEW (only the revive countdown exists) |
| Timed light isolator (lights off while held + N s, blink warning) | 5, 8 | PARTIAL (timedHold drives doors, not light groups) |
| Guards relight a light after checking | 3, 5 | PARTIAL (`lightsOut` sends a guard to look; relight CHECK) |
| Timed maglock release / blast door open for N s then relock | 8 | PARTIAL (timedHold, no countdown, no relock-on-timeout check) |
| Throw-landing knockout | 5 | NEW |
| Double Drop as a gate (two knockouts within 1.5 s set a flag) | 3, 8 | PARTIAL (banner only) |
| Jammer usable while hanging / on the rope | 6 | CHECK |
| Hang-down hide pose and neck-snap knockout | 6 | CHECK |
| Lowering a partner on the rope with side steering | 7 | CHECK (rope today: partner climbs up) |
| Shaft wall motion sensors | 7 | NEW |
| Per-run code or number read in-world (G143) | 6 | NEW |
| Ready lights and a linked status board on paired devices | 8 | CHECK |
| Guard on a timed round (60 s tour) | 6 | CHECK (patrol routes exist) |

## 6. Rules to raise with Michael

- Bible 5.8 says "No timers in stealth sections"; the timers here are shown device windows (jammer, blackout, lock),
  not a mission clock. A course-wide countdown would need his OK. None is proposed.
- Cameras see in the dark (G240): lights never beat a camera, unlike CT; lights and cameras stay separate verbs.
- The security console today needs its guard down and stays off until the bay restarts; Area 3 adds a two-key step and
  a 45 s limit. Both change his sector-fixes item.
- Area 7 asks the rope to lower a partner (CT's Belay descent); G110 ("no rope climb") was flagged against CT's rope
  in the research and is still listed as unconfirmed.
- Moving from eight bunker cells to surface buildings plus the bunker changes the map's fiction and size
  (`CTCOURSE-SPEC.md`, level-design 16); the map spec must be rewritten before any blockout.
