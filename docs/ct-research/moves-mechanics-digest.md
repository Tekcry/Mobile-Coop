# CT co-op moves and mechanics - digest

> Research record (2026-10-18). Where it disagrees with docs/DECISIONS.md or docs/VISION.md, those win. Superseded
> points: 1.1's G81 marked spots (G151: team moves anywhere with room); 2.2's "30-second revive, 2 per mission" (Sector
> Ops: G188 syringes and checkpoints; the campaign keeps the 30 s revive, G126); 2.5 and 2.14 "at most one signposted hard rule per mission" (G290: up
> to 2 strict rules, breaking one restarts the section); 2.14's timer note (2026-10-25: campaign and Sector Ops use soft
> windows only, no countdown that closes a route; Marlow Yard may use timed drills); 2.6 heavies (campaign per G155; Sector Ops has dogs, late armour and riot shields, G297, G307;
> helmets by difficulty, 2026-10-25); 2.17's camera (G210, G227: CT movement references are ignored, Michael tunes it);
> 2.19's "strictly two humans, no solo variants" (the campaign and Marlow Yard only; Sector Ops takes 1 to 4 players and
> solo, G280, G308).

Scrubbed digest of the Chaos Theory (CT) co-op research for the Night Shift prototype. It covers every two-player
move, the co-op rules, how they map onto Michael's decisions (G1-G122 in `docs/DECISIONS.md`, D-01 to D-25 in
`source/raw/OPEN_QUESTIONS.md`), and the smallest co-op loop a prototype needs.

Sources: `source/02-coop-moves.md`, `source/03-mechanics.md`, `source/05-hud-and-camera.md`, `source/00-index.md`
(conventions), `source/raw/OPEN_QUESTIONS.md` (D-01 to D-25), `source/raw/DESIGN_BIBLE.md` sections 3 and 12. The
sources are unscrubbed; this file is not. Go to the sources for citations and per-claim source lists.

## 0. Conventions

**Confidence tags** (shortened from `00-index.md` section 3):

| Tag | Meaning |
|---|---|
| [C] | Confirmed by two or more independent sources |
| [1] | One source only |
| [U] | Inferred or uncertain; sources conflict or evidence is weak |
| [?] | Unknown; the research found nothing |
| [A] | Analysis: the researchers' design reading, not a fact about CT |

**Platforms.** V1 = Xbox / PC, the reference build (one continuous level per mission). V2 = PS2 / GameCube (missions
split into 4-5 sub-levels, split-screen only). HH = the separate handheld co-op campaign (N-Gage / DS). Unless a line
says otherwise, a fact is V1.

**Mission codes** (V1 order). M0 = the co-op training course. M1 = corporate office mission. M2 = occupied city
mission. M3 = weapons bunker mission. M4 = metro station mission. DL1 = power plant download. DL2 = diplomatic tower
download. P1 = host (blue goggle lamp), P2 = client (red goggle lamp).

**Decision ids.** D-xx = Michael's research decisions of 2026-10-18 (`OPEN_QUESTIONS.md`). G-xx = `docs/DECISIONS.md`.
"Open" = no decision covers it yet.

**Generic verb names** (`DESIGN_BIBLE.md` section 3). Used throughout instead of CT's names.

| Generic name | What it is in CT terms | Family in CT |
|---|---|---|
| Leg-Up | Crouched player lifts the partner to a ledge or vaults him over a wall | Free |
| Ledge Relay | The hanging player lets the partner climb his body to the ledge | Free |
| Partner Launch | Standing player rolls back and throws the partner over a barrier; knocks out anyone at the landing | Free |
| Belay Line | One player holds a rope while the other descends or climbs it; holder steers sideways | Authored |
| Drop Line | Holder lowers the partner head-down through a hatch to hack, grab, neck-snap or hide | Authored |
| Stack | One player stands on the other's shoulders to reach a high device | Authored |
| Hand-Off | Give a marked item to the partner | Team |
| Feed Share | Watch the partner's deployed camera feed | Team |
| Pick-Up | Revive a downed partner within a time window | Team |
| Context Callouts | Automatic recorded lines: waiting, done, needs help, up / down / left / right / stop | Team |
| Two-Key Action | Two devices actuated together (paired scanners, wires, switches, code lock, two-station mix) | Sync |
| Living Key | A captive forced to a biometric scanner | Sync |
| Double Drop | Two linked guards neutralised at the same moment | Tactic |
| Spotter-Operator | One drives a machine blind, the other sees the target and directs | Sync |
| Hold-Down Device | The pistol's co-op jammer: suppresses one light, camera, laser or turret while held still | Gadget |
| Throw-Cam, Stun Round, Blunt Round | Launcher-fired camera (recon, noise lure, gas), stun charge, non-lethal blunt round | Gadget |
| Sensor Modes | Night, thermal and electro vision (G99) | Gadget |
| Under-Door Scope, Pick and Force | Optic cable under doors; lock pick or break the lock | Gadget |

Other scrubbed terms: "mission device" = the wrist computer with Goals / Notes / Data / Map / Equipment pages;
"controller" = the radio handler; "remote hack device" = the long-range scan / hack tool CT disabled in co-op;
"revive injector" = the carried revive item.

---

## 1. Two-player moves

### 1.0 Rules shared by every move

**Two families plus team and sync actions.** [C]
- **Free moves** (Leg-Up, Ledge Relay, Partner Launch) use a dedicated Co-op Action button and work almost anywhere
  with room. In missions there are no floor markers; ledges and windows just read as climbable at two-person height
  [A]. Only the training course marks spots, with striped floor squares [1]. The versus mode showed a boost icon only
  where a boost was possible [1].
- **Authored moves** (Belay Line, Drop Line, Stack) use the normal Interact button and appear as named entries in the
  context menu only at anchors the designer placed. [C]
- **Team interactions** (Pick-Up, Hand-Off, Feed Share) and **sync actions** also use Interact via the context menu. [C]

**The handshake** (bible 3.6). [C]
1. One player initiates: takes a pose and waits. A recorded line tells the partner he is waiting.
2. The partner's HUD shows a Co-op Action icon. The partner walks up and completes with the same button or menu entry.
3. The animation plays; a second line confirms completion.
4. Graceful failure: a free move with no room makes the player shake his head and the pad vibrate; no penalty. [1]

**Buttons** (G96 copies CT's pad layout button for button).

| Action | Xbox | PS2 | GameCube | PC |
|---|---|---|---|---|
| Co-op Action (free moves; replaces the whistle) | Black | L2 | Z + D-pad left | F or Page Down [1] |
| Interact (authored moves, Pick-Up, Hand-Off, sync) | A | X | A | Space / Enter [1] |
| Rope holder steers partner (Belay sideways, Drop Line up / down) | L / R triggers | L1 / R1 | ? | primary / secondary fire [1] |
| Rope rider climbs | left stick | left stick | ? | ? |
| Drop Line hide pose ("inverse crouch") | left trigger | L1 | ? | hold secondary fire [1] |
| Directional callouts (rope, crane) | click and hold left stick + direction; release = "Stop" | ? | ? | ? |
| Revive | A (menu "Heal Teammate") | X | ? | Insert [1] |
| Text chat | HUD chat box | none | none | T / End [1] |

Rest of the Xbox co-op pad [1]: LT knockout / secondary fire, RT lethal / primary fire, Y jump, X equip, B crouch,
White quick inventory, Back mission device, Start pause, D-pad vision modes and Throw-Cam, right stick camera.

**Unknown for every move** [?]: initiator wait limit, animation lengths, timing windows, heights and distances in
metres, and whether free moves are blocked near enemies or during alarms. Every number in the new game is a starting
value (G10).

**New-game rules that apply to all moves.**
- D-07 (heightened athletics): showpiece moves (Partner Launch, Drop Line) sit alongside grounded ones. This matches
  CT, which had both.
- D-08: sync timing windows do not scale with difficulty.
- D-11: identical characters with complementary kits; asymmetry comes from position and kit, as in V1.
- D-17 and D-12: callouts and beacon colours replace any need for voice to complete a move.
- G81 (boosts only at marked spots) conflicts with CT (see section 3).

### 1.1 Leg-Up (boost)

- **What.** The crouched player is the platform; the partner steps into his hands or knee and is either lifted to grab
  a ledge or pipe above (auto-grab [1]) or vaulted clean over a wall. Outcome is chosen by the geometry. [C]
- **Trigger.** Initiator crouches and presses Co-op Action; partner walks up and presses Co-op Action. [C] Standing
  instead gives a Partner Launch, and players at the first training wall did not know which pose did what. [C]
  Player reports disagree on who presses first. [U]
- **Where.** Free move, anywhere with room. [C]
- **Sizes and timing.** Not documented. Described as "a height one body cannot reach: a window, a high ledge, a wall
  top". [?] G57 sets 4.3-4.5 m for the shared Leg-Up / Ledge Relay ledge band.
- **Use.** The most common move: about 3-5 per V1 mission on the guide route, usually chained with Ledge Relay; in
  every mission except M3. V2 counts 1-3 per mission. [1]
  - M0: first obstacle; boost the partner over a wall, he opens a door locked from the far side. Later, Leg-Up +
    Ledge Relay onto a roof before the Drop Line station.
  - M1: facade into an open second-floor window (also the exit route); a ceiling opening in a far hall.
  - M2: hotel wall hole to a higher hole; up through a floor hole in the next room; a low wall; an upstairs window.
  - M4: tunnel ledge (required, height); onto a ticket booth roof, then drop through its trapdoor onto the guard
    inside and open the door for the partner (Leg-Up alone); onto a phone booth roof before a Drop Line; into a
    washroom ceiling duct to reach a lower platform.
  - V2: crates, docks ledges, walkways, a desk to an upper floor, a ceiling opening players got stuck under.
- **CT failure cases.** No room = head shake. Players stuck at the first wall (crouch vs stand). One V2 spot left the
  booster unable to follow without the Ledge Relay. Hidden ceiling routes caused the most stuck points. [C]
- **Real analogue** [A]: two-person climbing assist used by climbers and tactical teams.
- **New rule.** Free move per CT; G81 says marked spots only (conflict, section 3). Height band G57. Handshake as 1.0.

### 1.2 Ledge Relay (human ladder)

- **What.** The second half of a Leg-Up: the player already hanging from a ledge or pipe becomes a ladder; the partner
  below climbs his body to the ledge, so nobody is stranded. [C]
- **Trigger.** Hanging player presses Co-op Action; partner beneath presses Co-op Action and climbs. [C] A V2 player
  notes the boosted player must press again after landing. [1]
- **Where.** Any ledge or pipe. [C] **Sizes, timing.** [?]
- **Use.** Almost always right after a Leg-Up; see 1.1. Not a named training objective, but on the training route. [1]
- **Design value** [A]: both players act twice and end up together; pattern "boost-then-ladder vertical entry" turns
  an ordinary facade into an entrance a lone guard would never watch.
- **New rule.** As CT, sharing G57's ledge band. G52 counts "human ladder" among the four built team moves.

### 1.3 Partner Launch (throw)

- **What.** Two uses. [C]
  1. Traversal: launches the partner in a flying arc over a barrier that cannot be walked through: a laser grid, a
     walkway gap, barbed wire, water, a tank.
  2. Attack: anyone standing near the landing point is hit and knocked out. Players threw partners at guards on purpose.
- **Trigger.** Initiator stands (not crouched), faces away from the landing, presses Co-op Action, then steers a
  landing reticule; red = impossible. Partner presses Co-op Action and is thrown. [C] Animation: the thrower rolls
  backwards and launches the partner with his feet (a real judo sacrifice throw). [1]
- **Where.** Free move, anywhere with room. Not in the versus mode. [C]
- **Sizes, timing.** No distance, arc height or window documented; the red reticule is the only stated limit. [?]
- **Use.** 0-2 per mission. [1]
  - M0: over a laser, thrown player hits the switch beyond; over barbed wire, thrown player climbs a pipe and starts a
    Belay Line; a final throw (2-3 throws on the route). Third thing taught.
  - M3: past the second laser set in a corridor (thrown player kills lasers at a computer); over a tank, thrown
    player knocks out a guard and opens a one-way door (no backtracking).
  - M4: as an attack: one player shoots a light to lure a guard; the other throws his partner over the bomb laser so
    he lands on the guard; then both go to their bombs.
  - DL1: across a turbine hall to a far balcony; thrown player stops the fans and brings the partner up by rope. [1]
  - V2: across water; across walkway gaps in leapfrog with Belay Line; over lasers to reach a scanner.
- **Failure.** The thrower is stranded until the thrown player releases him (switch, computer, scanner, rope, door).
- **Reception.** The mode's signature memory ("throw your buddy at guards"). [C]
- **New rule.** D-07 explicitly allows it ("Partner Launch"). Every launch needs a far-side release device (pattern
  "throw-across with far-side release" [A]). Knock-out at landing kept.

### 1.4 Belay Line (dual rappel)

- **What.** A rope descent or ascent with no fixed ladder. Either the holder lowers the partner down a shaft, or the
  partner climbs up a rope the holder extends from above. [C]
- **Trigger.** At a rope anchor one picks "initiate rappel" from the context menu, the other "complete rappel". [C]
- **Control split.** Holder swings the rider side to side with the triggers to steer round hazards such as wall
  alarm sensors; rider moves up and down with the stick and can use the pistol, including the jammer. Rider can send
  "Left / Right / Stop" callouts. [C]
- **Where.** Placed anchors only. Rope is not an inventory item. [C] **Sizes, timing.** [?]
- **Use.** V1: once in M0 (last drill: needs continuous partner control) and once in M3 (lowered down a silo to a
  panel, climbs back up the partner's rope). DL1 rope assist [1]; DL2 opens with a rappel to a window-washing
  platform (whether two-person is unknown) [U]. V2: once in the bunker silo (steering past wall alarm detectors) and
  three times in the station (shaft, two climb-ups after throws).
- **Failure.** Touching the shaft's alarm detectors (consequence undocumented). [?]
- **New rule.** Authored move. Note G110 ("no rope climb"): CT's co-op rope includes climbing up the partner's rope;
  Michael to confirm that G110 means solo rope climbing only (section 3).

### 1.5 Drop Line (hang upside down)

- **What.** The holder lowers the partner head-first, rope at the ankles, through a ceiling hatch, trapdoor or hole,
  raising and lowering him with the triggers. [C]
- **What the hanging player can do.** [C]
  - Hack nearby computers and keypads (in person).
  - Use the pistol, including the jammer.
  - Pull up into an "inverse crouch" to hide.
  - Grab and neck-snap an unaware guard below (the only grab menu entry while hanging).
  - Send "Up / Down / Stop" callouts.
- **Trigger.** "Initiate" / "complete" entries in the context menu at a placed spot. [C]
- **Where.** Placed spots only (striped square in training). **Sizes, timing.** [?]
- **Use.** About one per mission. [1]
  - M0: hack the computer that kills a laser grid in a room reachable only from above (fourth drill).
  - M1: inside an air duct, hack the keypad that opens a ground-floor gallery's gates.
  - M3: lowered into a cryo tank from above to collect a sample.
  - M4: from a phone booth roof, plant a bug on the payphone, then listen to the call (required).
  - V2: into the cryo chamber; down a shaft to fetch a fuse for a circuit box.
- **Failure.** Players looked at the grille, not the ceiling, and did not find where to start it. Solutions above the
  problem need a visible tell. [C]
- **Reception.** The most cinematic move; critics' favourite was the upside-down neck snap. [C]
- **New rule.** D-07 explicitly allows it ("Drop Line"). Authored anchor with a visible tell from below (bible
  anti-pattern A3).

### 1.6 Stack (shoulder stand)

- **What.** The top player interacts with something just out of reach without needing a ledge (a charge point, a
  hatch) and can use weapons. What the bottom player can do is undocumented. [C]
- **Trigger.** "Initiate climb shoulder" / "complete climb on" in the context menu. [C]
- **Where.** Placed spots only. Not taught in training. [C] **Sizes, timing.** [?]
- **Use.** M2 twice: plant a charge on the rear of each of two mobile air-defence vehicles with a watcher on a high
  balcony, detonate from cover; mission notes spell it out. A 5-minute timer runs around the second (V1) / a 4-minute
  timer (V2). V2 also: on a lift car roof, plant a charge on the shaft wall to blow the car's trapdoor. [C]
- **Design value** [A]: used twice in one mission, it teaches then tests.
- **New rule.** Authored move, grounded tier of D-07.

### 1.7 Hold-Down Device alternation (jam and pass)

- **What.** The pistol's co-op-only jammer. Aim at an electronic device (light, camera, laser emitter or its breaker,
  turret or its panel, mobile sensor) and hold the secondary trigger. It works only while held and while charge
  remains; moving cancels it. [C]
- **Indicator.** A light on the gun: red, green on a jammable target (visual only). [C]
- **Charge.** Drains while held, refills automatically; rapid tapping stretches it. No length documented; one player
  report of about 20 s on a drone. [U] V2 uses the drain as a soft timer. [1]
- **Noise.** Silent, but some disabled devices crackle and lure guards. [1]
- **Patterns.** [C]
  - Jam and pass, then swap: one holds a camera / laser / turret off while the other crosses, then roles swap.
  - Turret flank: one jams the turret while the other runs behind it to its off switch.
  - Turret leapfrog (V2): turrets that cannot be switched off; each jams for the other in turn.
  - Light kill: hold a light off so the partner can drop or pass unseen.
  - Jam and hack: one jams the camera watching a computer while the other hacks it.
  - Escort: jam a camera while the partner walks a captive to a scanner.
- **Use.** In every mission, everywhere on V2; the second drill in training. [C] Usable while on a rope or shoulders.
- **Design value** [A]: one player physically cannot get both past a camera alone, so every camera becomes a
  two-person gate with no scripting; target a small co-op beat (jam-and-pass or a boost) every 2-4 minutes.
- **New rule.** G76 keeps the pistol "light / electronics disruptor" (CT's jammer). D-01 (modern day) keeps it
  plausible. Charge numbers open.

### 1.8 Two-Key Actions (synchronised devices)

**General rule.** Both players act at paired devices at the same moment via the context menu. Online without
headsets the timing requirement is removed: the first selects and presses, then the second does, and the game syncs
them. Tolerance window undocumented. [C] One player could solo some "dual" tasks (both training scanners, both mixing
stations) [C]. On PC several of these inputs failed to confirm (bomb, mixing). [C]

| Device | How it works in CT | Where | Tag |
|---|---|---|---|
| Paired retinal scanners | Both scanners satisfied at once: hack both (failed hack costs health in training, sounds an alarm elsewhere) or force two captives (Living Key) | M0, M1 (a guard plus the executive), M3 (two guards), V2 bunker and office | [C] |
| Paired bomb wires | Two bombs on facing walls with a laser between; touching it detonates (fail). Both cut the live wire together; thermal (or pad rumble) shows which wire is live; the live wire changes over time; a second simultaneous cut follows before a timer ends | M4 x3 (V2 x4), M3 missile warhead | [C] |
| Paired switches | Buttons on both sides of a door or lift pressed together | V2 only (4 places); HH once | [1] |
| Paired code lock | Each decodes a code; the first done waits so both lock in together | V2 bunker | [1] |
| Two-station mix | Each player at his own station enters his own colour sequence (randomised per run; 3 / 4 / 5 inputs on the three difficulties). Wrong input releases ceiling gas that badly hurts or kills | M3 | [C] |

- **Use.** A sync action in every story mission on V1 except M2; in every V2 mission. Emails explain each one before
  players reach it (diegetic tutorial). [C]
- **Reception.** The bomb is the tensest moment and the most-asked "how do we do this". Mixing split opinion: lethal
  trial and error, unclear inputs. [C]
- **New rule.** D-08: sync windows do not scale with difficulty. D-20: some codes, items or rooms are randomised per
  run and read in-world (CT's mixing sequence and serum type did this). Bible: forgiving tolerance, per-input
  feedback, relaxed sync without voice, failure escalates rather than kills (anti-patterns A5, A6). Tolerance value
  open.

### 1.9 Spotter-Operator (crane)

- **What.** One player drives a crane from a control room with no view of the target; the other stands at the target
  and directs with callouts "Back / Forward / Left / Right / Lower / Raise / Stop" (picked from a HUD communication
  entry, then stick and triggers). A simultaneous wire cut follows. M3 only; V2 replaces it with a panel. [C]
- **Design value** [A]: purest asymmetric-information beat; "communication itself is the mechanic".
- **New rule.** Open (set piece, not prototype). D-12 world pings could serve as the non-voice channel.

### 1.10 Living Key (captive at a scanner)

- **What.** Grab a person, walk him to a retinal scanner, force the scan, then choke him out. Paired scanners take two
  captives at once. The wrong face raises an alarm. [C]
- **Use.** M1: lights switched off in a hall so a guard comes out to fix them; one player grabs him while the other
  grabs the executive in his office; both forced to the paired scanners together. A game note says the executive on
  one scanner and any guard on the other is easiest; if the executive is unconscious, hack instead. M3: two guards.
  V2: two stunned guards after a flash; a single captive escorted past a jammed camera. [C]
- **Design value** [A]: folds capture, split and sync into one beat; non-lethal play becomes useful.
- **New rule.** Fits D-04 (non-lethal rewarded) and G23 (grab menu). Open as a set piece.

### 1.11 Double Drop and co-op ambushes

- **What.** No dedicated move: both players take two guards at the same moment with ordinary attacks, grabs or gadgets
  so neither can raise the alarm. If one fires early, the other guard reacts. Gas Throw-Cams, Stun Rounds and Blunt
  Rounds help take two at once. Partner Launch and the Drop Line neck snap are the two moves that are themselves
  takedowns. [C]
- **Ambush patterns.** [1 each] One shoots a light, the other drops on the guard who comes to look; boost onto a roof
  and drop through a trapdoor onto a guard; lights off, one searches while the other takes the guard who comes to fix
  them; a ledge-hang pull-over timed with the partner's gas.
- **Reception.** Among the most praised moments ("coordinated multi-kills hook you"). [C]
- **New rule.** G52 lists "dual takedown" among the four built team moves; CT had no such move (section 3). D-04
  scoring applies.

### 1.12 Two-person questioning and protect-while-act

- **CT.** Some intel came only from both players questioning the same person together (M4 key code; M2 the target's
  double). How two players question at once is undocumented. [C] More often one grabs and questions while the other
  takes the escorts or watches the door. Questioning is silent to the AI. [C]
- **New rule.** D-25: yes, non-violent: one distracts or bluffs while the other reads a device or reaction. D-04:
  questioning and coercion depiction follows the scored violence stance.

### 1.13 Relays (one opens the way for the other)

- **CT patterns.** Leg-Up over a wall, partner opens the door from inside (M0). Thrown player opens a one-way door
  (M3). One player enters a control room by keypad and hits the switch that opens the lab for his partner (M3).
  Booth trapdoor then door (M4). V2 duct gates opened alternately at control boxes. Operate-and-jump: one operates a
  platform and jumps on at the last moment (M3). [C / 1]
- **Design value** [A]: "leapfrog relay"; every split ends at a merge point or a sync action.
- **New rule.** Level-design pattern, no rule needed.

### 1.14 Team interactions

| Interaction | CT | New rule |
|---|---|---|
| Pick-Up | See 2.2 | D-03 |
| Hand-Off | Equip an item, approach, pick "share equipment"; only items marked with a dot can be given; cancel before the partner accepts. Shipped and explained by training pop-ups. V1 kits were asymmetric (P1 launcher payloads; P2 grenades) [C] | D-11 complementary kits makes it useful; which items are marked is open |
| Feed Share | When one fires a Throw-Cam, the other picks "accept view sharing" to watch, at any distance; disabled in split-screen. Not taught. Used for spotting and for reading keypad codes guards type [C / 1] | Open; D-10 split-screen would disable it as CT did |
| Shared intel | Reading a computer updates both mission devices [C] | Keep (no decision needed) |

### 1.15 Carrying and escort

- **CT.** No two-person carry. One carries (slow, cannot fight) while the other opens doors and jams cameras. M2 ends
  by carrying the target to a truck; M1 carries a guard to the scanner. [C / 1]
- **New rule.** Open; pattern "escort extraction" [A].

### 1.16 Not in CT

- Back-to-back wall climb: lore text only; reception may mean the Ledge Relay. [U]
- Dedicated dual takedown, two-person carry, partner wall jump (V2 only has both doing a solo split jump at once),
  named "swing", "trampoline" or "sacrifice" moves: not found. [C absence]
- Pings, gestures and world markers: none documented. [?]
- The HH campaign had no acrobatic moves at all, only "heal ally" plus hard class roles. [1]

### 1.17 Moves summary

| Move | Family | Trigger | Xbox / PC button | Spot | Per V1 mission | Taught in M0 | New rule |
|---|---|---|---|---|---|---|---|
| Leg-Up | Free | Crouch + Co-op Action; partner completes | Black / F | Anywhere with room | 3-5 (not M3) | Drill 1 | Free per CT vs G81 marked; G57 4.3-4.5 m |
| Ledge Relay | Free | Hanging player presses; partner climbs | Black / F | Any ledge or pipe | With Leg-Up | On route | G57 |
| Partner Launch | Free | Stand, face away, aim reticule | Black / F | Anywhere with room | 0-2 | Drill 3 | D-07 allowed |
| Belay Line | Authored | Menu initiate / complete | A / Space | Rope anchors | 0-1 | Drill 7 (last) | Authored; G110 check |
| Drop Line | Authored | Menu initiate / complete | A / Space | Hatches, ducts, booth tops | About 1 | Drill 4 | D-07 allowed |
| Stack | Authored | Menu initiate / complete | A / Space | Placed spots | M2 x2 | No | Authored |
| Hold-Down alternation | Gadget | Hold secondary fire on device | LT / secondary | Any electronic device | Every mission | Drill 2 | G76 |
| Two-Key Action | Sync | Both select at paired devices | A / Space | Set pieces | Most missions | Drill 5 (scanners) | D-08, D-20 |
| Spotter-Operator | Sync | Communication entry + stick | A, stick | One set piece | M3 | No | Open |
| Pick-Up | Team | Partner "heal teammate" | A / Insert | Anywhere | - | Pop-up | D-03 |
| Hand-Off | Team | "Share equipment" | A / Space | Near partner | - | Pop-up | Open |
| Feed Share | Team | "Accept view sharing" | A / Space | Any distance | - | No | Open |

**Training order (M0)** [C]: read panels; Leg-Up over a wall; jam a camera; launch over a laser; Leg-Up + Ledge Relay
then Drop Line hack; paired scanners; launch over wire then Belay Line; final launch; reach the end. 3-4 min expert,
9-16 min casual. Moves get more interdependent along the way [A]: early ones only need the partner to complete; later
ones need continuous control (rope) and simultaneity (scanners).

**Mission lengths (V1, typical stealth run)** [C]: M1 16-35 min, M2 20-35, M3 25-45, M4 13-35, DL1 about 30, DL2
about 34. Casual runs roughly double.

---

## 2. Mechanics

Each entry: CT did X [tag]; new-game rule (D-xx, G-xx or open).

### 2.1 Friendly fire

- CT: Xbox had a host match option "friendly fire" (default unknown). PC had no menu toggle and its settings file sets
  it on. V2 and HH unknown. [1 each; U for PC "always on"] Partners could shock each other (a known invisibility glitch
  depends on it). [C] Solo friendly fire on allies zeroed the rating; the co-op score effect is unknown. [?] Partner
  Launch knocking out a guard is a move effect, not friendly fire. [C]
- New rule: **D-18: host option, on by default.** Settles G49's friendly-fire part. Score effect of hitting the partner
  open.

### 2.2 Down, revive and death

- CT: at zero health a player is not killed but drops unconscious and must wait. [C] An automatic line tells the
  partner he needs help. [1] The partner has **about 30 s** to reach him and pick "heal teammate" while standing over
  him; the revive injector restores **about 50% health**. [C] Each player carries **one** injector, so **two revives
  per team per mission**. [C] (V2: possibly 2 each per sub-level [1].) Not reached in 30 s = mission fails for both.
  [C] Using both revives means the next down cannot be healed [U]. Both down at once: undocumented. [?] Fall damage
  downs rather than kills (players exploited it to skip a lift). [1] Some hazards may kill outright (contaminated room
  without antidote, mixing gas, falls); unclear whether they down or kill. [U]
- New rule: **D-03: 30-second revive, 2 per mission; both down = reload the last checkpoint.** Open: heal amount
  (CT 50%), whether the two revives are per player (CT) or a team pool, what happens on a third down, whether
  hazards kill or down, the downed player's camera (CT undocumented [?]).

### 2.3 Health and medkits

- CT: own life bar per player; partner health shown on the Xbox HUD, not on PS2. [1 each] Health comes back only from
  **wall medkit cabinets** used as in solo; no loadout lists a medkit; the injector is the only carried healing. [C]
  Heal by difficulty (solo-derived, co-op not separately stated): **full on Normal, 50% on Hard, less on Expert.** [C]
  Reusable or not: undocumented; a save bug that destroys the kit suggests one kit object per cabinet, i.e. single use.
  [U] Whether one cabinet heals both players: [?]. Sparse: 1 in M0, 3 in M2, none documented elsewhere. [C / ?]
  Damage taken rises with difficulty. [C] A failed training scanner hack costs health. [1]
- New rule: G20 / G98 wall stations only, confirmed by CT. **G119 is answered by the research as: heal scales with
  difficulty (full / 50% / less), probably single use, sparse placement** [U on reuse]; consistent with D-08
  (resources scale). Michael to confirm the exact amounts and single use.

### 2.4 Difficulty

- CT: three fixed levels, Normal / Hard / Expert, shared with solo; the host picks it. [C] What scales [C]: damage
  taken; hacking gets harder on Expert; medkits heal less; wall mines can be disarmed only on green on Expert; the
  two-station mix sequence grows 3 / 4 / 5. Guard perception: conflicting player claims (Expert "highly sensitive"
  vs "only damage changes"); no game text. [U] A separate no-ammo replay mode (firearms start empty, reduced non-lethal
  gadgets) unlocked after the campaign; the downloads first appeared only after it on Xbox. [C]
- New rule: **D-08: perception, alert tolerance and resources scale; sync timing windows do not.** G106: CT fixed
  levels, no sliders, no alarm-tolerance setting. Compatible if "alert tolerance" is a property of each fixed level,
  not a player setting; CT itself never scaled alarm tolerance (no abort on V1). Michael to confirm. The no-ammo
  replay mode: open (not mentioned in any decision).

### 2.5 Alarms and alert tiers

- CT V1: an alarm counter sits above the light meter; each alarm has "global repercussions". [C]
  - **Raised by:** a guard reaching a wall alarm panel (shooting a fleeing guard first prevents it), camera sightings,
    failing or late-aborting a hack, the wrong face at a scanner, lasers and motion detectors. A guard raises it only
    once certain; suspicion alone starts a personal search. [C] Bodies raise it only if a guard or live camera sees
    them. [C]
  - **Four stages** [C]:

    | Alarm | Effect |
    |---|---|
    | 1st | Freebie: guards respond, then write it off |
    | 2nd | Guards put on body armour (about half chest damage) |
    | 3rd | Helmets (headshots need a face hit) |
    | 4th | Permanent high alert; guards fortify positions and use furniture as cover |

  - **No alarm count aborts a V1 mission**, except DL2 (general alarm = abort). [C] V2 fails a sub-level on the third
    alarm; HH aborts on the third with radio warnings after the first and second. [1 / C]
  - Active alarm: guards draw weapons and search, then return to duty; music rises at once and settles as it decays.
    Whether the counter itself drops is unknown. [1 / ?] Some rooms open only when an alarm is raised (extra guards).
    [1]
  - Score: every alarm costs score; perfect needs none. [C]
- New rule: **D-02: escalating alert tiers, no abort, plus at most one signposted hard rule per mission.** Matches
  CT V1. D-05: lethal automated defences (turrets) only at military or private compounds; elsewhere realistic
  responses. G63 / G67 music steps sit on top. Tier effects (armour, helmets, fortify) and any decay: open; CT's four
  stages are the default to copy.

### 2.6 Heavies and armoured guards

- CT: **no heavy guard archetype** in co-op on any platform. Armour comes only from alarm stages 2 and 3, applies to
  every guard and only to guards. [C for stages; ? for heavies] Special enemies that do exist: automatic machine-gun
  turrets (jammed then switched off at their panel; some V2 turrets can only be suppressed), a drone over a laser
  floor that wakes when a beam is broken (V2), mobile ceiling sensors (V2), and one masked night-vision enemy spawned
  by an alarm (V2). [C / 1] No dogs appear anywhere in the co-op research. [?]
- New rule: **G49 (the research decides heavies) is answered: CT co-op has no heavies; armour is an alarm-tier
  effect.** G42's "heavies cannot be palm-struck" then has nothing to apply to, and G42's dog exception has no CT co-op
  basis. Michael to confirm dropping heavies (and dogs) from the co-op campaign. D-05 limits turrets to compounds.

### 2.7 Guard senses

**Sight and light.**
- CT: each player has his own light meter; at the far left he is effectively invisible; more light = seen from
  further; in bright light any guard with line of sight notices at once. [C] The meter, not how dark the screen looks,
  decides; a known readability gap [1 / A]. Almost every light can be shot out, switched off or held off with the
  jammer; killing a light alerts nearby guards, who come to fix it (a usable lure). [C] Light is a shared resource:
  one kills a light so the other can move. [C] No way to see the partner's meter. [?] Lightning windows exist in solo;
  co-op weather unknown. [1 / ?] Ordinary cameras are beaten by darkness alone. [1]
- New rule: the game's light parity hard rule (what the player sees, the meter and guards agree) deliberately fixes
  CT's gap. **D-21: lit windows are systemic: they expose anyone in them, both ways; dark rooms hide** (CT had this only
  as a DL2 fail rule of unclear meaning [U]). Partner exposure indicator: open (CT had none).

**Looking up.**
- CT: undocumented. Related facts only: guards on stairs watch a climb; a balcony watcher covers a Stack site; the
  Drop Line has a hide pose, which implies a hanging player can be seen. [?]
- New rule: **G44 (guards see poorly above them)** stands; the research neither confirms nor contradicts it.

**Hearing and noise.**
- CT: a noise meter under the light meter shows the player's noise against an ambient marker; noise above it can be
  heard. [C] Slow or crouched is quieter; stick speed sets noise; grass and carpet quiet, metal and wood loud; a missed
  shot into a wall is loudest; breaking a lock is fast but noisy; grabs, questioning and device talk are silent. [1 /
  C] Ambient sources (generators, machinery, storms, radios, war noise) raise the marker and open windows to move. [C]
  Guards walk to a sound to investigate and, in a fight, aim at the last spot the player's noise rose above ambient.
  [1] No whistle in co-op: the whistle button became the Co-op Action button. [C] Lures: Throw-Cam noise, shot-out
  lights, crackling devices, a thrown partner, and (online) real voices. [C]
- New rule: G40 silent speed bands and G61 (the meter shows what guards hear) match CT. No whistle follows from G96
  if the co-op button reuses it; open.

**Real voice (microphone).**
- CT: on Xbox Live and PC online, guards heard players' headset speech within a radius (default sensitivity 50 =
  about 2 m for normal speech); speech showed on the sound meter; players whispered, hid talk under ambient noise or
  talked on purpose to lure. Host options: voice detection on / off and sensitivity, voice-only matches. Not on V2
  (split-screen). The most-praised systemic detail. [C]
- New rule: **D-06: opt-in modifier, off by default, visible and tunable.** **D-17: partner voice always clear**
  (earpiece model, no distance fade; CT never stated [?]).

**Cameras, sensors and bodies.**
- CT: being seen on a camera raises an alarm. [C] Sensors: lasers, motion sensors, mobile ceiling sensors, wall alarm
  detectors in a rope shaft, a metal detector (DL2). [C / 1] Bodies count only if a guard or live camera sees them
  (no automatic sweep); a guard who finds a body goes to high alert at once. [C / 1] Searching guards notice open
  doors, shot-out lights and missing colleagues. [C] A guard who finds a knocked-out colleague kicks him awake (and is
  himself an opening). [1]
- New rule: G41 (guards notice doors that should be shut) matches. Body and wake rules: no decision; CT is the
  default (G1).

**Awareness states and two intruders.**
- CT: graded awareness (routine, suspicious / searching, alert / combat); searching guards move carefully, use
  flashlights and flares, form impromptu search teams and talk to each other. [C] Perfect score requires never being
  recognised as an intruder; suspicion is fine. [C] How the AI handles two intruders: unknown. [?] One reviewer saw
  guards bumping into each other and alerting others while the players were hidden (an unearned alert). [1]
- New rule: **D-16: guards know only what they saw.** The shared alert tier rises, but nobody knows a second intruder
  exists until one is seen or evidence suggests it. G11 keeps only CT ideas: guards fixing lights, search teams and
  adaptive music are CT; a last-known-position marker is not (guards only aim at the last noise spot).

### 2.8 Doors

- CT: doors, keypads and scanners are worked through the context menu; the exact door option list is not described
  for co-op. [C / ?]
  - **Lock:** pin-sequence pick or break the lock (faster, noisy); guide routes often just break it. Pin counts rise
    across the campaign (2-4 early, 5 in M4, 6 in DL2). [C / 1]
  - **Under-Door Scope** before entering. [1]
  - **Bash:** door-bash a guard behind the door, timed with thermal (M2 route). [1]
  - **Keypads:** codes from emails, overheard calls and questioning; optional rooms behind spare codes. [C]
  - **Hacking:** by touch, in person; no remote hacking in co-op per the guide (conflicting binding evidence) [1 / U];
    failing or late-aborting a hack sounds an alarm; harder on Expert. [C]
  - **Retinal scanners:** hack, Living Key, or wrong face = alarm. [C]
  - **Other types:** opened by the partner from the far side; one-way doors (commitment points); motion-sensor doors;
    emergency doors that open only from inside; security doors controlled by a computer; V2 paired switches and relay
    gates; a fuse gate. [C / 1]
  - Guards notice open doors; doors slammed in a partner's face are remembered comedy. [C]
- New rule: **G97 (open, stealth open, bash with knock-out, optic cable)** is confirmed for bash and scope; "stealth
  open" is solo CT, not shown in the co-op sources [?]; pick / break the lock and keypad codes should join the list.
  **D-19: no remote hacking tool; all hacking is hands-on** (matches the guide). **D-20: some codes, items or rooms
  are randomised per run and read in-world.** G31: no sprint bash, bash only from the door menu (CT: no contrary
  evidence).

### 2.9 Interrogation

- CT: grab a person from behind, then question him for intel or codes; silent to the AI. [C] Some people can be
  questioned twice. [1] Joint questioning by both players gives intel one player cannot get (M4 key code; M2 double).
  [C] Questioning a key person first earns points (M2). [1] Some people cannot be grabbed or questioned (DL2's
  antagonist), and DL1 has nobody to question. [1]
- New rule: **D-25: two-person questioning, non-violent** (one distracts or bluffs, the other reads a device or
  reaction). **D-22: story-critical characters protected until their role is done**; killing them earlier fails with
  clear warning. Questioning menu wording: open.

### 2.10 Grab

- CT (no full grab menu printed) [C / 1]:
  - **Grab** a guard or civilian from behind (silent).
  - **Carry** a grabbed or unconscious person.
  - **Interrogate.**
  - **Force to a device** (retinal scan).
  - **Knock out / choke out** (free for score).
  - **Kill** (costs score; one scripted required kill in M4 does not count).
  - **Push** a stunned guard into another (lowers the stealth rating; DL2 trick).
  - Drop Line **neck snap** and **ledge pull-over** from a hang.
  - Human shield: undocumented [?]. One report of a non-lethal press turning lethal and failing the mission. [1]
- New rule: **G23 (grab first, then knock out, kill or interrogate) and G43 (ground takedown grabs first)** confirmed.
  Add "force to a device" and "carry" to the grab menu for Living Key and escort. D-04 scores the choice.

### 2.11 Checkpoints and saving

- CT V1: **no automatic checkpoints.** Pause menu Quick Save / Save / Load; saving waits for the partner; the host can
  ask to save permanently and the partner can refuse; a save reloads only with the same teammate. [C] V2 saves only
  between sub-levels. [C] HH has checkpoints that also lower the alarm level. [C / 1] A failure for one is a failure
  for both; reviewers called full restarts with a weaker partner punishing. [C]
- New rule: **D-03: encounter checkpoints cap replay loss at about 10 min; both down = reload the last checkpoint.**
  **D-24: any partner can join a saved mission; progress belongs to the host.** Both change CT on purpose (CT had
  manual saves and same-partner reloads). Whether the pause-menu manual save also exists: open.

### 2.12 One player caught, detected or down

- CT: detection escalates for both players (tiers), never ends a V1 mission alone (except DL2). [C] A downed player
  becomes a 30 s rescue task for the partner; the favourite player stories are rescues ("clear the room, revive him").
  [C] Pairs blamed each other for alarms. [C] Split-screen leaks information. [1]
- New rule: D-02, D-03 and D-16 as above. No per-player failure; mission failure is shared (CT and D-03 agree).

### 2.13 Scoring and rating

- CT: end screens show an objective review (Completed / Failed only in co-op) and statistics (alarms, kills, knockouts,
  civilians, bodies found). Each player gets his own percentage from the team stats. [C] **Perfect score**: no kills
  or injuries (knockouts free, objective knockouts exempt), never recognised as an intruder, no bodies found, no
  alarms, all primary, secondary and opportunity objectives. [C] Civilian kills cost heavily; solo friendly fire zeroed
  the rating. [C / 1] Two missions could not reach 100% because of bugs (caps at 90% and 97%). [C]
- New rule: **D-04: scored; lethal and non-lethal allowed, non-lethal and ghost play rewarded, no forced kills.**
  **D-23: perfect = no kills + no alarms + all primary objectives; optional objectives are bonus; every mission must be
  testably 100%-able** (fixes CT's caps). D-23 drops CT's "no bodies found" and "never recognised"; Michael to confirm
  that was intended. Per-player vs team score: open.

### 2.14 Hard-fail rules

- CT (V1) [C unless marked]:

  | Mission | Hard fails |
  |---|---|
  | All | Downed player not revived in about 30 s |
  | M0 | None (kills lower the rating) [1] |
  | M1 | Killing the protected executive |
  | M2 | The target dies; the target escapes by an unsabotaged boat (plan only in an optional email); killing his double before questioning [1]; a 5-minute timer after a friendly plane is shot down (fail effect unknown) |
  | M3 | None explicit; wrong mixing input releases gas |
  | M4 | Touching the laser between paired bombs; entering a contaminated room without the antidote (only one dose); the informant killed before the locker stage [1]; bomb countdown |
  | DL1 | None documented [1] |
  | DL2 | Killing a guard or civilian; a general alarm; the metal detector [1]; being seen in lit windows [1]; a hidden 20-minute timer announced at 20 / 10 / 5 / 1 min by text only |

  V2 adds third-alarm sub-level fails. HH: three alarms, 30 s heal, host drop ends the session.
- New rule: **D-02: at most one signposted hard rule per mission** (DL2 had four, which D-02 rules out). **D-22:
  protected characters fail the mission only with clear warning.** **D-05: lethal automated defences only at
  military or private compounds.** Hidden timers: bible pillar P2 forbids them ("never a hidden timer"); CT's DL2
  timer was hidden.

### 2.15 Extraction

- CT: an "Extraction" interaction inside an extraction zone ends the mission. Places: back to the insertion truck
  (M1), deliver the target to a truck (M2), a boat at a dock (M3; a message fires if objectives are incomplete), jump
  onto a passing train roof (M4), a side door (DL1), no extraction after the defusal (DL2). [C / 1] Whether both must
  be present: no string says so; one V2 training hint says one player is enough. [?]
- New rule: **D-15: both players must reach the exit.**

### 2.16 Partner awareness

- CT: told apart by goggle lamp colour, P1 blue and P2 red (enemies cannot see the glow in fiction). [C / 1] Partner
  health on the Xbox HUD; Co-op Action icon when the partner is ready; automatic callouts; a text chat box (Xbox, PC).
  [C / 1] Every map had a mission-device map page; its legend has no teammate entry; whether the partner is shown is
  unknown (it appears static). [?] No pings or markers documented. [?] Reviewers complained partners wander looking for
  each other. [1] Players without mics coordinated by miming with jumps. [C]
- New rule: **D-12: follow CT: partner beacon (a distinct light colour per player) plus world pings; no partner marker,
  no live partner position on any map.** World pings are not documented in CT (G1 / G11 tension); Michael chose them
  explicitly, so D-12 stands, but flag it. **D-17: partner voice always clear.**

### 2.17 Camera

- CT: third-person, right stick; split-screen is a vertical split (P1 left). Distance, height, shoulder offset, FOV,
  collision and corner behaviour are **not documented** in the co-op research. [?] Vision overlays slide over the view.
  [1] The downed player's view is unknown. [?] PC co-op ran capped at about 30-35 fps and desynced if the two PCs had
  different FOV or resolution. [C]
- New rule: **D-14: over-the-shoulder, strict corner peek (the camera sees little the character cannot).** G28 (about
  1.8 m, head at screen centre) and G29 (rigid follow, gentle swing, no bob, no aim zoom) come from Michael's footage,
  not this research; they are compatible with D-14. G17 (shoulder swap only while aiming) stands.

### 2.18 HUD and meters

- CT V1 co-op HUD [1, Xbox manual]: life bar; light meter; noise meter with ambient marker; context interaction menu;
  selected item; ammo; communication box at the top; objective icon; teammate status (partner health); Co-op Action
  icon; alarm counter above the light meter; text chat box; a timer when one is triggered. PS2 drops partner health
  and chat and adds an objective bar. [1] No waypoints, no partner markers. [A / ?] The jammer status is a light on the
  gun, not a HUD element. [C] Objectives and intel live in the mission device (Goals, Notes, Data, Map, Equipment);
  notes carry explicit co-op hints ("climb on each other's shoulders", "both cut the active wire at the same time").
  [C] Shared device screens (bomb, mixing) lacked clear prompts and caused the most help requests. [C]
- New rule: G77 (in-game HUD follows CT), G107 (no stance or gear icons), G108 (objectives in the menu) all match
  CT. G98 (no medkit count) matches. Open: partner health on the HUD (Xbox had it), text chat, the alarm counter's
  look. Bible lesson [A]: shared device screens need on-screen input prompts, a visible live-wire indication and a
  visible countdown.

### 2.19 Network and session

- CT: Xbox split-screen, System Link and online; PC LAN and online only; V2 split-screen only. Two players maximum
  in co-op. The host picks mission, mode, difficulty and (Xbox) friendly fire and voice options. [C]
- New rule: **D-09: strictly two humans, no AI partner, no solo variants** (= G2, G48, G50, G111). **D-10: online,
  split-screen and LAN; no cross-play.** D-10's split-screen is not in any G entry and the game is a browser PWA tested
  with two tabs; Michael to confirm split-screen scope. D-24 (any partner rejoins) as 2.11.

### 2.20 Setting, story and kit (context)

- D-01 modern day; D-13 standalone co-op story (G9, G120 consistent); D-11 identical characters, complementary
  per-mission kits (G71 Wren and Moth, G109 same movement: consistent; CT's V1 kits were asymmetric, V2 symmetric).

---

## 3. Mapping to `docs/DECISIONS.md`

Verdicts: **confirmed** (CT research agrees); **changed by D-xx** (a later research decision replaces or extends it);
**research says X, Michael to confirm** (conflict or new information); **no bearing** entries are omitted.

| G | Decision (short) | Verdict |
|---|---|---|
| G1 | Pure CT; nothing outside CT | Confirmed as the frame, but several D answers knowingly depart from CT: D-03 checkpoints, D-12 world pings, D-15 both extract, D-23 perfect-rating rule, D-24 any partner rejoins. Michael to confirm these D answers override G1 where they differ |
| G2 | Two-player campaign only | Confirmed; D-09 |
| G3 | Recreate the CT co-op levels | Confirmed; the moves and patterns above are the level grammar |
| G9 | No traitor, no PvP finale | Confirmed; D-13 standalone story |
| G11 | Only CT ideas from the nine | Research settles it: guards fixing lights, guard search teams, adaptive music and eavesdropping (the M4 bugged call, a V2 overheard pair) are CT; a last-known-position marker is not (guards only aim at the last noise spot). Michael to confirm the keep list |
| G16 | No aim assist | No co-op data; stands |
| G17 | Shoulder swap only while aiming | No co-op data; compatible with D-14 |
| G18 / G96 | Exact CT pad layout | Research gives the Xbox co-op layout: Black = Co-op Action (replacing the whistle), A = interact, B crouch, Y jump, LT knockout / secondary, RT lethal / primary, X equip, White quick inventory, Back mission device, D-pad vision modes. Confirmed as the template |
| G20 / G98 | Wall medkit stations only, no carried kits, no HUD count | Confirmed: CT co-op health came only from wall cabinets; the revive injector was the only carried item |
| G23 | Grab first, then knock out, kill or interrogate | Confirmed. Research adds carry and force-to-scanner entries; D-25 adds non-violent two-person questioning |
| G28 | Camera about 1.8 m, head centred | No research data (CT camera numbers undocumented); D-14 compatible |
| G29 | Rigid follow, gentle swing, no bob, no aim zoom | No research data; D-14 compatible |
| G31 | Sprint-only moves removed; bash only from the door menu | Confirmed (CT bash appears only as a door action) |
| G32 | Roll on held crouch | Confirmed by a V2 route ("hold crouch while running" to roll under lasers) |
| G40 / G61 | Silent speed bands; meter shows what guards hear | Confirmed: CT noise vs ambient marker; slow and crouched quieter |
| G41 | Guards close doors and notice open ones | Confirmed (searching guards notice open doors) |
| G42 | Palm strike knocks out every human guard; no dogs, no heavies | Research says CT co-op has no heavies and no dogs; armour is an alarm-tier effect on all guards. Michael to confirm dropping heavies and dogs |
| G43 | Ground takedown grabs first; drop, ledge, window, pipe takedowns | Confirmed (CT ledge pull-over, drop takedowns, Drop Line neck snap) |
| G44 | Guards see poorly above them | Research silent (undocumented); stands |
| G45 | Glass rule | Research silent; D-21 lit windows expose both ways is consistent |
| G48 / G50 / G111 | No bot, two players max, no solo route | Confirmed; D-09 |
| G49 | Research decides friendly fire, heavies and similar | Friendly fire changed by D-18 (host option, on by default). Heavies: research says none in CT co-op (see G42). Michael to confirm heavies |
| G52 | Four team moves exist: brace, boost, human ladder, dual takedown | Research says CT has no dedicated dual takedown (Double Drop is two ordinary takedowns timed together) and no "brace" move; CT's free moves are Leg-Up, Ledge Relay, Partner Launch. Michael to confirm the built set is renamed / replaced |
| G57 | Ledge band 4.3-4.5 m for boost and human ladder | Research has no heights; not contradicted. Stays a starting value |
| G63 / G67 | Music: Cautious on search, chase after seen | Consistent with CT (music rises on detection, settles as the alarm decays) |
| G71 / G109 | Two operators, same movement | Consistent with D-11 (identical characters, complementary kits) |
| G76 | CT kit only, pistol with light / electronics disruptor | Confirmed: the pistol jammer is the co-op Hold-Down Device. Research adds Throw-Cam (Feed Share), Stun and Blunt Rounds, flash / smoke / gas grenades. D-19: no remote hack device |
| G77 / G107 / G108 | HUD follows CT; no stance icons; objectives in the menu | Confirmed (CT co-op HUD list in 2.18). Open: partner health readout, text chat box |
| G78 | Fallow is the co-op tutorial "although CT has none" | Research says CT did have a co-op tutorial: the training course (V1) and a team training level (V2), drills in the order Leg-Up, jam, launch, Drop Line, paired scanners, Belay Line. Michael to confirm the wording and use CT's drill order for the rebuild (G79) |
| G79 | Bunker rebuilt on CT moves | Research gives the move set and order (1.17) |
| G81 | Boosts only at marked spots | Research says CT boosts (and Ledge Relay, Partner Launch) were free moves usable almost anywhere with room; only the training course marked spots; only versus showed a boost icon. Michael to confirm (free in campaign, marked in Fallow is the CT split) |
| G82 | Text radio now, voice later | Consistent; CT's downloads used text-only radio and players missed the voice |
| G97 | Door list: open, stealth open, bash (knock-out), optic cable | Confirmed for bash and scope; research adds pick / break lock and keypads; "stealth open" not documented in co-op sources. Michael to confirm the full list |
| G99 / G100 / G102 | Night, thermal, electro; thermal as CT | Confirmed in co-op use (thermal shows the live bomb wire; electro finds cameras and turrets) |
| G105 | Loadouts Stealth / Assault / Recommended | Not in this research (see the kit file); D-11 complementary kits applies |
| G106 | CT fixed difficulties, no alarm-tolerance setting | Changed by D-08: perception, alert tolerance and resources scale per level; sync windows do not. CT scaled damage, hacking, medkit heal, mine rules and sync sequence length; perception unclear. Michael to confirm "alert tolerance" is per level, not a setting |
| G110 | No prone crawl, no rope climb | Research says CT co-op Belay Line includes climbing up the partner's rope. Michael to confirm G110 means solo rope climbing only |
| G114 / G6 | Name ban | Applied in this file |
| G117 | Campaign maps follow the research | Confirmed; patterns in section 1 |
| G119 | Medkit heal amount and reuse: research decides | Research says heal scales with difficulty (full on Normal, 50% on Hard, less on Expert; solo-derived) and a cabinet is probably single use [U]; placement sparse. Michael to confirm numbers |
| G120 | Mission 8 written with the missions | Consistent with D-13 |
| G122 | Michael brings his own research | This digest is built from it |

D answers with no G entry yet (candidates for new G numbers when the research merges): D-01, D-02, D-03, D-04, D-05,
D-06, D-07, D-10, D-12, D-14, D-15, D-16, D-17, D-19, D-20, D-21, D-22, D-23, D-24, D-25.

---

## 4. Minimum co-op loop

The smallest set that makes a two-player prototype feel like CT co-op, in build order. Each item says why.

1. **The handshake framework.** Initiate pose, partner cue (icon plus recorded callout), complete, confirm, graceful
   refusal with no penalty. Every move and sync action sits on it; CT players stalled when the handshake was not
   taught (crouch vs stand). Build once, reuse for everything.
2. **Per-player light and noise stealth with readable meters.** Each player's own light meter and noise-vs-ambient
   meter, lights that can be shot or switched off, guards that come to fix them. Light as a shared resource is the
   ground every co-op beat stands on, and the game's parity rule must hold for both players.
3. **Leg-Up plus Ledge Relay.** The most used pair (3-5 per mission), the first drill, and the clearest "two bodies
   reach where one cannot". The relay guarantees nobody is stranded. Needs one ledge band (G57).
4. **Hold-Down Device alternation.** One holds a camera, light or laser off while the other passes, then swap. In
   every CT mission; the cheapest forced cooperation with no scripting; supplies the small beat every 2-4 minutes.
5. **Guards that know only what they saw, with escalating alert tiers and no abort** (D-16, D-02). Graded awareness,
   bodies and open doors as evidence, CT's four alarm stages. Two imperfect players make more mistakes; escalation
   absorbs them instead of ending the run.
6. **Pick-Up revive and shared failure** (D-03). 30 s window, two per mission, both down = checkpoint reload. Turns
   one player's mistake into the other's rescue, the source of CT's favourite stories.
7. **Grab menu plus takedowns, enabling Double Drop** (G23, G43). Grab, knock out, kill, carry; two guards taken at
   once with ordinary takedowns. The most praised synchronised moment, needing no new move.
8. **One Two-Key Action with relaxed sync.** A paired device (scanners or a two-switch door) where the first input
   waits for the second, with clear per-input feedback and a non-lethal failure. It is the rendezvous that pulls a
   split pair back together and carries CT's "3, 2, 1, now" tension.
9. **Partner Launch with a far-side release.** The signature move; doubles as a knock-out attack; the thrower is
   stranded until the thrown player opens the way, which teaches dependence (D-07 allows it).
10. **Drop Line at one authored anchor.** The most cinematic move and the clearest "my life is in your hands"; proves
    the authored-anchor tier and the hanging player's hack, hide and neck-snap actions.
11. **Partner beacon colours and automatic callouts** (D-12, D-17). Blue / red lamps and the waiting / done / needs
    help lines keep co-op playable without voice; world pings come after.
12. **Both-player extraction and shared intel** (D-15). Reading a computer updates both devices; the mission ends only
    when both reach the exit, so the loop has a finish line.

Defer until after the prototype: Belay Line, Stack, Spotter-Operator, Living Key, Feed Share, Hand-Off, two-person
questioning (D-25), carry and escort, randomised solutions (D-20), proximity voice (D-06), split-screen (D-10).

**A test layout that covers items 1-10** follows CT's own training order: a wall to Leg-Up over (partner opens a door
from inside), a camera corridor to jam past, a laser with a switch beyond for the launch, a roof reached by Leg-Up and
Ledge Relay with a Drop Line hatch over a computer, then a paired-scanner door, with two guards on mutual watch for a
Double Drop and an exit both must reach.

---

## 5. Open items for Michael (from this digest)

1. G81 marked boost spots vs CT free moves (free anywhere in missions, marked only in training).
2. Heavies and dogs: CT co-op has neither; armour comes from alarm tiers (G42, G49).
3. G52's four team moves (brace, dual takedown) vs CT's set (Leg-Up, Ledge Relay, Partner Launch; Double Drop is a
   tactic, not a move).
4. G110 "no rope climb" vs CT's Belay Line climb-up.
5. G78 says CT had no co-op tutorial; CT had one in both builds.
6. G119 medkit numbers: full / 50% / less by difficulty, probably single use.
7. G106 vs D-08: alert tolerance per fixed level, not a setting.
8. D-23 drops CT's "no bodies found" and "never recognised" from the perfect rating.
9. D-03, D-12 (world pings), D-15, D-24 depart from CT; confirm they override G1.
10. D-10 split-screen in a browser PWA.
11. Revive details: heal amount (CT 50%), per-player or pooled revives, third down, hazard deaths vs downs.
12. Sync tolerance window, jammer charge length, move heights and timings: no CT numbers exist; all starting values.
