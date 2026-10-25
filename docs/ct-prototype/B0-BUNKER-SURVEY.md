# B0 - bunker survey (read-only, 2026-10-18)

Goal (G179, G180): the Fallow bunker rebuilt as CT's co-op training level on the pure-CT moves, played start to finish by two players. Sources read: FEEL-PLAN phase 2, levels digest 2.1 and 3.1, moves digest 1.0-1.8, 1.14, 1.17, 2.2-2.3, 2.15, DECISIONS G57, G78-G80, G117, G126, G130, G138, G151, G152, G155, G179, G180, docs/archive/training (BAYS, FEATURES, STATE, DECISIONS, RULES), `src/world/maps/bunker*.ts`, `src/game/course`, the team and net code, the e2e suites.

## 1. CT's co-op training

Drill order (all primary; one lesson per station; flow is linear; every station splits the pair and reunites them in seconds through a built-in device):

| # | Drill | Teaches | Facts the research gives |
| --- | --- | --- | --- |
| 1 | Read the wall panels | Panels explain each move; striped floor squares mark where contextual moves happen | Tracked for score (100% needs a re-read) |
| 2 | Leg-up over a wall | Co-op Action button; crouch = leg-up, stand = throw (the pair's classic stuck point) | Wall with a door locked from the far side; the boosted player opens it for the partner |
| 3 | Jam a camera | Hold-and-pass, then swap | Corridor with one camera; jammer works only while held and while charged (G152) |
| 4 | Partner throw over a laser | Throw with far-side release; the thrower is stranded until the thrown player acts | Laser barrier, a switch beyond it. The mode's signature, "third thing you do" |
| 5 | Leg-up plus ledge relay, then hang-down hack | Vertical entry, two levels at once | Small room with a laser at its door; roof route; hang-down to a computer that drops the grid; a wall medkit is in this room |
| 6 | Paired retinal scanners | Simultaneity | One player can do both alone; a failed hack costs health |
| 7 | Throw over barbed wire, pipe climb, two-person rope | Continuous partner control | Thrown player climbs a pipe and starts the rope; the holder steers the climber clear |
| 8 | Final throw to the end zone | Finish | PS2 / GC: one player enough at the exit; D-15 / G138 says both |

Also taught by pop-up: revive (about 30 s, about 50% heal, 1 injector each, 2 per team). Length: 3-4 min expert, 9-16 min casual. Guards: none documented (maybe one dummy). A kill lowers the rating, does not fail.

Undocumented (so every number is a G10 starting value): room geometry between stations, every height, throw distance and arc, rope length, jammer charge (one report about 20 s on a drone), sync tolerance, initiator wait limit, what a laser touch costs in training, lighting. Known CT failure cases to design against: crouch vs stand confusion at wall one, scanner confusion, rope and hatch start points not visible, tutorial assumed solo knowledge.

## 2. The bunker today

State: nine bays B1-B9, airlocks A1-A8, exit lift L9, about 2840 lines of map code, built to BAYS v2 under course rules R1-R8 (G117: linear, unavoidable). The course framework is done (airlocks, gates incl. `pair`, `hold`, `timedHold`, `bolt`, `flag`, `pickup`, `anchorLock`, `mains`, drill ticking, bay restart, results, `COURSE_MAX = 2`). BUT every `BayDef.drills` array is empty, every squad is empty, and guards, circuits, security devices, re-lamp, re-glaze, return turnstiles and the Phase 5 elements are stubs (training STATE: T6 / T7a / T7b not started). So the bunker today is a walkable, gated shell with objective text lists and no live drills.

| Bay | Content (objective list) | Verdict for the CT level |
| --- | --- | --- |
| B1 Muster 20x14 | Locker, crouch, elbow-strike pad, ADS draw, gear run, stop, quick 180, dark store + light switch, night vision, ping | Keep as drill 1 (panels) only. Cut quick 180 and the gear run (sprint gear). Elbow strike is gone (A4 palm strike). Dark store / switch: cut for the smallest path |
| B2 Lanes 52x9x9 | Step, vault, mantle, sprint-vault-mantle chain, lamp, ladder, hand-over-hand pipe, hang, hang-drop, trench jump, roll, downpipe, ledge shimmy, corners, gap jump, drops, windows, quick 180 | Solo movement course. Cut the sprint chain (4), sprint trench (9), quick 180 (22). The rest are CT solo moves but not CT's co-op training. Reuse the 52 m x 9 shell for drills 2-4 |
| B3 Intake shaft 14x14x26 | Split jump, wall jump, pipe legs, flip drop, hoist and davit rappel, zipline, fan guard fence, duct grille / louvre | All CT solo moves, none CT training. Reuse the vertical shaft, rappel points and the RF roof hatch as the relay / hang-down room. Rest parked |
| B4 Cistern 12x26 | Brace, boost onto W1 (4.4), bolt door, human ladder W2 (4.25), timed-hold sluice, C3 ladder, boost to OP (4.4), lowered ladder | Closest to CT: it already is leg-up plus relay plus a one-holds-one-passes hold. Keep |
| B5 Plant | Thermal, circuits, shoot lamp, EMP, noisemaker, takedown, breaker | Cut (guards; EMP removed, G152) |
| B6 Mock Site | Duct, back-to-wall, peek, lean-out, SWAT turn, door peek, cards, cameras, takedowns | Cut (lean-out and SWAT removed; guards) |
| B7 House | Takedown variants, dual takedown, grab, question, carry, drag | Cut (dedicated dual takedown removed, G180; CT training has no guards) |
| B8 Range | Weapons, gadgets incl. EMP, live fire | Cut |
| B9 Plot | Keys, case, lift with the pair gate K-A / K-B | Cut; keep only the idea of an exit lift or zone |

Heights to re-check:
- G57 band 4.3-4.5 m. B4 W1 4.4 and OP 4.4 are in band; W2 is 4.25, held by `ladderGrab` 4.1 + 0.2 = 4.3 (A35). `TEAM.boostMax` 4.5, `TEAM.ladderGrab` 4.1, `TEAM.ladderFeet` 1.45.
- A51 (geometry, not the drill tick, stops skips) conflicts with G151 (free team moves anywhere with room). Every lip within 4.5 m of a pair's floor, and every throw landing, must be screened (2.4 m `noLedge` glass) or sit over 4.5, or be the intended obstacle. B3's wall-jump lips (2.7-3.8) and B4 W2 were already "not closable by geometry".
- Throw range, apex and landing are undocumented: cap with ceilings or screens so a throw cannot skip an element; the red-reticule rule gives the limit.
- Every jump and reach must be re-run on the pure-CT jump (G78, G79) once phase 1 numbers are final.

## 3. Moves and mechanics: code vs needed

| Need | State | Where | Size |
| --- | --- | --- | --- |
| Co-op Action button | Partial: bound (RB / F / PageDown) but the action is `ping` | `input/padBinds.ts`, `keyBindings.ts`, `gamepadMapping.ts` | small |
| Leg-up (crouch + Co-op Action, free anywhere) | Partial: boost exists but via Y-hold "brace" against a wall and a Y tap; `brace` is a removed move. Boost target search, `boostPath`, host check, e2e exist | `game/teamController.ts` (349 lines), `teamMoves.ts`, `config/movement.ts` TEAM, `net/validate.ts`, `player/moveState.ts` | medium |
| Ledge relay (hanging player becomes the ladder) | Partial: shoulder-stack human ladder (`stacked` sub 1 / 2); CT's hanging-body ladder is different | same files plus `player/attach*.ts` | medium (stack renamed) / large (hang-body) |
| Partner throw, far-side release | Missing. Only gadget throws and the `boostPath` arc exist. Needs initiator wait, stand pose, reticule (red = no), arc, landing check, knock-out at landing, thrower stranded until release | new `game/partnerThrow.ts`, `net/validate.ts`, `coopHost.ts`, `protocol.ts` | large |
| Hang-down hack (Drop Line) | Missing. Solo ledge hang and rappel exist; no inverted partner-held pose, holder up / down, or hack while hanging | `player/attach*`, `anim`, `net/remoteAvatar.ts`, new move | large |
| Paired scanners (two-key sync) | Partial: course `pair` gate (two switches within `PAIR_WINDOW` 1.0 s). Missing: scanner device and prompt, first-waits latch (CT online relaxed sync), failed-hack health cost, per-input feedback | `game/course/courseDef.ts`, `courseState.ts`, `config/course.ts` | small-medium |
| Two-person rope | Partial: solo rappel (mode `rappel`, anchors, rope drawn on the remote). Missing: holder control (steer, lower, raise), rider climbing the held rope, handshake, rider can use the pistol | `player/attachController.ts`, `world/anchors.ts` RappelPoint, `net/*` | large |
| Held jammer | Missing. EMP is a thrown gadget (`game/gadgets.ts`, relay in `coopHost`). Camera exists with stages and `cameraDown` (`security/camera.ts`, `securitySystem.ts`) | new `game/jammer.ts`, `security/*`, pistol secondary | medium |
| Laser grid and switch | Missing (`security/data.ts` supports `camera` only) | `security/data.ts` | medium |
| Revive: 30 s window, 2 per mission, 50% heal | Partial: revive interactable held 2.5 s, no bleed-out, no cap; both down restarts the bay (`RESTART_DELAY`) | `net/coopHost.ts` 288-340, `game/interactables.ts` | small-medium |
| Wall medkits by difficulty | Partial: station heals a fixed 40, single use; `Difficulty` exists in the protocol | `game/medkit.ts`, `coopHost.ts` | small |
| Both players extract | Missing: the course end is a device one player can press; L9 uses a pair gate | `game/modes/courseMode.ts` (`finish`), `course/courseState.ts` | small |
| Per-player lamp colour | Done (A5, `player/goggleGlow.ts`) | | - |
| Read panels | Partial: info interactables exist; panel read verb and 100% re-read tracking do not | `game/interactables.ts`, drill verbs | small |
| Drill data for new verbs | Framework done (`course/drillDetect.ts` VERBS, `DrillDef`); no drills defined | `world/maps/bunker.ts` courseDef | small |

Two-page e2e infrastructure exists: `scripts/e2e-net-lib.mjs` (`hostAndJoin`, `startMode`, `until`), `e2e-bunker.mjs` (autostart `?net=local&autostart=bunker&mode=course`, headless pump for the background host page, G13), `e2e-course.mjs` (gates, drills), `e2e-netmove.mjs` (brace, boost and human ladder cases, to be rewritten for Co-op Action).

## 4. Recommended mapping (smallest path to "two players finish it")

Principle: do not rebuild nine bays. Keep the framework (airlocks, gates, restart, results), cut B5-B9 and A5-A8 from the course (parked, not deleted), reuse the B1-B4 shells, and add compact new rooms only where a CT drill has no home. Keep G117 (linear, unavoidable) and G80 (resets). Target 9-16 min casual.

| CT drill | Home | Work |
| --- | --- | --- |
| 1 Panels | B1, reduced: panels on the walls, floor squares, then A1 | cut every other B1 line; panel read verb |
| 2 Leg-up wall + far-side door | B2 lane start: one 4.4 m wall with a door bolted from the far side (B4 W1 + `bolt` gate pattern) | new wall in the lane; cut all other B2 elements from the line |
| 3 Camera jam-and-pass | B2 lane middle: corridor, one camera, swap roles | held jammer, camera hold gate |
| 4 Throw over laser | B2 lane end: laser barrier, switch beyond, thrower freed by it; a return path for the thrown player (A61 style) | partner throw, laser device |
| 5 Relay + hang-down | B3 shaft shell: leg-up and relay to the RF roof, hatch (already a below-only hatch to ML), computer in the room below, laser grid at its door, wall medkit | relay, Drop Line, laser grid |
| 6 Paired scanners | B4 C1 entry cell | scanner device, latch sync |
| 7 Wire wall, pipe, rope | B4: W1 / W2 (4.4) as the barbed-wire wall (throw over), pipe, rope from the gallery VG | throw, two-person rope; cut OP boost |
| 8 Final throw + end zone | B4 OP end; A4 replaced by an exit zone | both-extract zone |

Order bend: B3 (shaft) sits between B2 and B4 in the line, so drill 5 comes before 6 and 7 as in CT, and drills 6-8 share B4. This keeps CT order with no relocation. If B3's hatch geometry does not fit drill 5, drill 5 moves to a new small room.

Cut from the line: sprint, SWAT, lean-out, quick 180, brace, dual takedown, EMP, all guard and weapon drills, the dark-store and card-and-key chains. Keep B2 / B3 solo traversal parked behind a flag (they are CT solo moves).

Resets (G80, A61): a stranded thrown player always has a way back (turnstile or ladder to the start); the hatch and rope get a visible tell (CT failure case); a drill resets when a player leaves mid-move or disconnects; both-down restarts the bay. Lamp re-lamp and pane re-glaze reduce to nothing because no kept drill uses a lamp or pane.

Open geometry risk: with free moves (G151) every lip within 4.5 m and every throw landing can skip an element. Fix with 2.4 m screens on skip routes and a throw cap (start values: range 6-8 m, apex under a 3.5 m screen or the ceiling).

## 5. Revised slices

| Slice | Content | Model | Two-player e2e |
| --- | --- | --- | --- |
| B1 Shell | Cut the course to B1-B4 + exit zone, panel drills, new drill defs, `COURSE_MAX` 2, both-extract zone, wall medkit by difficulty, lamp colours check, Co-op Action wired as an action (no moves yet) | Sonnet | Both pages walk the airlocks to the exit with new gates open; the exit refuses until both stand in it |
| B2 Leg-up + relay | Replace brace with crouch + Co-op Action, free anywhere with room, prompt names the move; relay as the renamed shoulder stack first; drill 2 wall and door | Sonnet | Rewrite the netmove brace / boost / ladder cases; wall one: host leg-up, host opens the far door, client follows; crouch vs stand prompt text |
| B3 Held jammer + camera + laser | Jammer on pistol secondary, charge, stand still, camera hold gate, laser device and switch, EMP removed from the kit | Sonnet | Host holds the camera off while the client crosses; swap; the client page shows the same camera state |
| B4 Partner throw | Handshake, reticule, arc, far-side release, stranded thrower, landing knock-out | Opus | Throw over the laser, thrown player hits the switch, thrower freed; red-reticule refusal; remote arc within tolerance |
| B5 Hang-down hack | Drop Line move, holder control, hack while hanging, grid drops; wall medkit in the room | Opus | Host lowers the client, client hacks, grid drops on both pages; disconnect mid-move resets |
| B6 Paired scanners | Scanner device, first-waits latch, failed-hack cost | Opus (sync) | Both within, then outside, the old 1.0 s window; one player doing both alone |
| B7 Rope | Holder steers, rider climbs, pipe start, throw-over-wire reuse | Opus (two-body sync) | Holder swings the rider past a sensor; rider climbs; both reach the top |
| B8 Revive and finish | 30 s bleed-out, 2 per mission, 50% heal, both down restarts the bay; both extract; full-course run | Opus | Down, revive within 30 s, third down fails; both-down restart; the full eight-drill run on two pages |

Order as FEEL-PLAN; B6 can move earlier (cheapest sync). Add one full-course two-page suite (`scripts/e2e-ctcourse.mjs`, autostart style as `e2e-bunker.mjs`) that grows one section per slice and joins the quick set.

## 6. Questions for Michael

1. Ledge relay: which?
   a) CT's hanging-body ladder (the hanging player is the ladder).
   b) Keep the shoulder-stack human ladder, renamed, for the prototype.
   c) Shoulder stack now, hang-body after the loop plays.
2. B5-B9 and the solo traversal bays: what happens to them?
   a) Cut from the course now, files parked behind a flag.
   b) Keep B2 / B3 solo traversal as an optional tail after drill 8.
   c) Delete them.
3. Level shape: reuse the old shells or build fresh?
   a) Reuse the B1-B4 shells and add rooms (smallest; drill order bent to fit).
   b) A fresh compact linear level of eight stations, reusing only the framework (cleaner, 3-4 min expert, more build).
4. What does a laser touch or failed scanner hack cost in training (CT does not say; CT's scanner fail costs health)?
   a) Health hit and an alarm line, drill continues.
   b) Radio line only, no penalty.
   c) The drill restarts.
