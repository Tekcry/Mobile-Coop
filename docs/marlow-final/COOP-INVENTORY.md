# Marlow Yard - co-op inventory (marlow-final, researcher)

Source: `C:/NightShift/Mobile-Coop-marlow-final` at af56ab43 + docs. Read-only research. Every code claim cites file:line.
"In Yard" means placed in map `ctcourse` (`src/world/maps/ctcourse.ts`) today.

## 0. Engine facts the exercises lean on
- **Cameras see by their own IR** (G240, Michael M3): `CAMERA.irLight` 1 (`src/config/security.ts:45`). Dark corners, jammed lamps and shot lamps hide a player from guards and the light meter, never from a camera. Only jamming the camera, shooting it or its console beats it. Any "light isolation" exercise works against guards, not cameras.
- **Light parity is built in.** Switches (`LightRegistry.setGroup`, `src/world/lights.ts:239`), jams (`applyJamLight`, `src/game/jammer.ts:184`) and shots all go through the registry. The light field, meter, guards and picture all read the registry.
- **Course guards are not on stealth rules.** Only Clear, Infiltration, Mission and Sector set `em.stealth = true` (`src/game/modes/infiltrationMode.ts:55`, `sectorMode.ts:107`). Course mode never does. In the Yard a guard who sees you fights alone: no shared last-known position, no radio relay, no alarm-panel runner (`src/ai/enemyManager.ts:288`).
- **Both Yard guards are passive** (see nothing, hear nothing; `ctcourse.ts:211-212`). Squad slots already support patrol routes (`src/world/rooms.ts:29-37`, applied at `courseMode.ts:666`), so a live patrolling guard is data only.
- **Guards do not see poorly above them yet.** G44 is "decided, not built" (`docs/systems/ai.md:9`). Sight is a horizontal cone only (`src/ai/perception.ts:138-161`), so a hang-down near-miss over a live guard is not safe today.
- **Shot lamps never come back on a bay restart in the Yard.** `resetLights` returns early when the layout has no `groups` (`src/game/modes/courseMode.ts:679-684`), and `ctcourse` sets none (`ctcourse.ts:631`). A retry after shooting a lamp starts darker than the first try.
- **Alarm stages in the course are a stat.** `raiseAlarm` puts up a banner and counts stages to `ALARM_MAX` 3, one stage per `ALARM_GAP` 5 s at most (`src/game/ctDevices.ts:967`, `jammer.ts:343-356`). Guards do not escalate.

## 1. Co-op mechanics in code now

### 1.1 Team moves (handshake: the initiator offers, the partner completes with Co-op RB / F)
All of them: the client sends `tmove` and the host checks `checkTeamRequest` (`src/game/teamMoves.ts:55`) in `CoopHost.onTeamMove` (`src/net/coopHost.ts:715`). The host answers `tstart`, `tdeny` or `tend` (`src/net/protocol.ts:171-187`), so every move is host-authoritative. The triggers live in `TeamController.idle` (`src/game/teamController.ts:583-745`) and the start in `begin` (`:828`). Numbers are in `TEAM` (`src/config/movement.ts:438-500`).

| Move | A | B | Trigger | Timings | In Yard |
|---|---|---|---|---|---|
| Leg-up (boost) | Crouches + Co-op: the platform | Walks within 1.2 m, Co-op: tossed to a ledge | Crouched offer `teamController.ts:722` | Ledge 2.4-4.5 m, toss 0.9 s, offer waits 20 s (`movement.ts:447-462`) | S2, S5, S7 (striped squares, `ctcourse.ts:52`) |
| Ledge relay (human ladder) | Hanging on the ledge + Co-op | Below, Co-op: climbs A's body | `teamController.ts:691-703` | Reach 1.6 m, hang up to 4.6 m, climb 1.4 s | S5 roof (and S2) |
| Partner throw | Stands + Co-op: thrower | Within 1.6 m, Co-op: thrown | Standing offer `teamController.ts:734`, landing checked by the runner `:760` | Lands 3.2 m past, apex 1.7 m, 1.0 s flight (`movement.ts:470-475`) | S4 over the laser band |
| Hang-down (drop line) | Crouched at a drop + Co-op: holder, stick sets depth | Co-op: lowered head-first; A (interact) uses a device in reach; Co-op pulls up, B drops | `teamController.ts:707-720`, `runHang` `:497` | Depth 1.0-2.5 m, lower 0.8 s, pull 0.9 s, holder lost 1.5 s (`movement.ts:480-489`) | S5 roof hatch to hack panel (`ctcourse.ts:164-165, 577`) |
| Two-person rope (belay) | Standing at a drop + Co-op: holds the rope | Co-op at its foot, climbs with the stick | `teamController.ts:688-706`, `runRope` `:323` | Drop 2.2-6.0 m, up 1.0 m/s (`movement.ts:494-498`) | S7 rope wall |
| Revive | Downed | Uses the revive point on the body | `CoopHost.addRevive` `coopHost.ts:429` | 30 s window, 2 per mission (`src/game/reviveClock.ts:8-10`) | Yes (course-wide) |
| Dual takedown | Takedown | Takedown | Two finishes by different players within `DUAL_WINDOW` 1.5 s give a banner (`coopHost.ts:57-58, 261-272`) | 1.5 s | No live guard pair placed |
| Pings | - | - | `ping` message, host rate 0.8 s (`protocol.ts:189`) | - | Yes |

Not built:
- Hanging player using the pistol or jammer, or a neck-snap (`runHang` offers only use, pull and drop, `teamController.ts:543`).
- Throw-landing knockout.
- Shoulder stand.
- Feed share.
- Back-to-back (not in CT anyway, moves digest 1.16).
- Co-op body carry. `StealthSystems.carry` exists, but bodies are not in the client item mirror (`coopHost.ts:998`).

### 1.2 Held pistol jammer (G152, G212)
- **What both do.** Aim the drawn pistol (LT / RMB) and hold Co-op (RB / F) on a camera, a lamp or a laser power panel. The jammer must stand still (`stillSpeed` 0.45 m/s). Range 20 m, 0.16 rad cone, clear static line needed (`src/game/jammer.ts:14-39`).
- **Per player.** One jam lasts at most 5 s (`useMax`), then a 5 s cooldown (`jammer.ts:16-18`).
- **Per device.** A camera or panel reboots for 1.5 s and cannot be jammed meanwhile (`jammer.ts:21`, `recoverTime`). A lamp flickers off over 0.5 s, stays off for the hold, stays off 4 s after release, then flickers back on over 0.5 s (`JAM_LIGHT`, `jammer.ts:43-48`).
- **Cameras while jammed.** Blind, frozen sweep, LED flashing (`CtDevices.applyJam`, `src/game/ctDevices.ts:870`).
- **Net sync.** The client sends `jam {tgt, e}` every 0.25 s while held, with a 0.7 s stale timeout (`protocol.ts:204`, `coopClient.ts:723-724`). The host checks line of sight from the client's eye within 1.5 m of its head (`ctDevices.ts:707`), steps every jammer and device (`ctDevices.ts:742-777`), and sends `SecWire` (camera clocks, who jams what, jam left `ch`, cooldown `cd`, device timelines `dv`, alarm stage) inside `course` (`ctDevices.ts:82-97, 993`). The client mirrors it (`apply` `:1010`). Protocol 29.
- **In Yard.** S3 camera hallway. Every electric lamp is a jam target (`ctDevices.ts:345-350`). The S4 laser panel.

### 1.3 Cameras and the security room
- **Camera unit** (`src/security/camera.ts:152`): modes online, looped, off, destroyed (`:18`). `looped` is never set anywhere.
- **Detection.** Sweep 15 deg/s with a 2 s pause at each end; FOV 70 x 45 deg; range up to 18 m with per-camera `aim` pitch; think rate 4 Hz (`src/config/security.ts:9-38`). Per-player meters: suspicious at 0.3, full at 1 (`camera.ts:103`).
- **Alarm.** A full meter raises an alarm stage (`ctDevices.ts:978`). A faint red grid shows the camera's view (G222).
- **Hallway hard rule.** A player the camera has in the hallway is sent back to the entry lobby: `hallStep` (`jammer.ts:424`), `stepHall` (`ctDevices.ts:811`). The client gets a `back` event (`protocol.ts:135`, `coopHost.ts:1268`).
- **Security room (sector-fixes S).** A duty guard stands at the monitors. Once he is down, the console sets a flag that switches off every camera with that `offFlag` until the bay restarts. Pure rules: `src/game/course/securityRoom.ts:10-41`. Refused while the guard is up (`courseMode.ts:328-336`). Applied on both pages (`ctDevices.ts:880-889`). It rides the course flags with no wire change.
- **In Yard.** S3: camera `cam-s3` (`ctcourse.ts:116-119, 192`); room, guard and console (`ctcourse.ts:166-189, 484-493, 542`); pass zone (`:128-135`).
- **Limits.** The cameras-off is permanent until a bay restart: no timer and no loop.

### 1.4 Lasers and power panels
- **Laser band.** A break raises the alarm and never hurts (`ctDevices.ts:943`). The beams are drawn only in night vision (`:933`).
- **Power panel.** Every laser has exactly one panel (`src/game/laserPanels.ts:14-55`). Jamming the panel cuts every band it powers for the jam plus the 1.5 s reboot (`laserLive` `:55`). That is up to about 6.5 s off per jam. Electro shows the panel.
- **Course flag.** A flag can switch a band off for good (`LaserDef.offFlag`).
- **Net.** Panel ids ride `jam` and `sec.dv` (protocol 29).
- **In Yard.** S4 band (`ctcourse.ts:149`), panel high on the far south wall, jammed diagonally from `S4_PANEL_JAM` (`:157-159`), and the far-side red release (`:546`).

### 1.5 Sync devices (two inputs inside a window)

| Device | Rule | Code | Net | In Yard |
|---|---|---|---|---|
| Paired scanners | Each player hacks their own panel (press once, stay within 2 m for 2.0 s). Both must finish within 1.5 s. A late or abandoned hack costs 10 HP and resets both; a partner who never started resets both at no cost (G193). | `src/game/scanners.ts:12-23, 65, 99`; host `scanPress` `ctDevices.ts:446`, `stepScan` `:465` | Host-authoritative; state in `sec.sc` (`ctDevices.ts:96, 1004`) | S6 (`ctcourse.ts:140, 580-587`) |
| Pair gate | Two switches pressed within `PAIR_WINDOW` 1.0 s, either order. Opens a door or sets a flag. Needs two players. | `courseDef.ts:55`, `courseState.ts:686-689`, `src/config/course.ts` `PAIR_WINDOW` | Host state, packed `course` message | S5 roof plates (`ctcourse.ts:315, 571-572`) |
| Pass zone | Both inside a box sets a flag | `ctDevices.ts:780-801` | Host | S3 far lobby |

Limits:
- **Scanners.** Only the first pair on a map is built (`ctDevices.ts:358`, `lay.scanners?.[0]`). Panels work only at ground level (`feet.y < 1.5`, `ctDevices.ts:439`).
- **Pair gate.** No work time at the device: it is a press, not a hack.

### 1.6 Lights
- **Wall switches.** `layout.switches` toggles a lamp group; every switch on the circuit follows. Lights-off calls `lightsOut` (`src/game/stealthSystems.ts:68-75, 414-428`). Clients press through the item mirror's `use`. Group states reach clients in the `course` message's `lights.groups` (`courseMode.ts:730-734`, `courseWire.ts:13`), but only for groups named in `layout.groups`.
- **Lights-out lure.** The nearest calm guard within 25 m comes to look; others within 14 m turn to look (`src/ai/enemyManager.ts:268-287`).
- **No guard relight.** No guard ever switches a light back on (searched src/ai and src/game).
- **Shooting lamps.** `StealthSystems.shotRay` (`stealthSystems.ts:432`) works in the course.
- **Mains gate.** A door unlocked while a light group is off, relocked when it comes back on (`courseDef.ts:59`, `courseState.ts:194-201`). Used only in `courselab` (`src/world/maps/courselab.ts:122-123`).
- **Timed and generic holds.** `hold` and `timedHold` gates: open while held, plus `TIMED_HOLD_AFTER` 6 s (`courseDef.ts:51-53`). Not used in the Yard.
- **In Yard.** No switches, no light groups, no breakers. Only jammable and shootable lamps.

### 1.7 Doors, locks and hacking
- **Course doors.** Locked by gates: bolt (opens from the far side only, S2), lever, flag, pair, egress, mains (`courseDef.ts:47-65`). Locks ride `course.locks`.
- **Door menu.** Open, stealth open, bash (knocks out a guard 1.3 m behind the door). Optic cable is a stub: "Optic cable: not built yet" (`src/game/doorMenu.ts:11-33`, `gameState.ts:1422-1423`). Locked doors list nothing (`doorMenu.ts:5`).
- **Not built.** Lockpick, keypads, and the hack minigame (spec only, `docs/systems/ct-toolkit.md` 3.3 and 3.4, "Status: spec only").
- **Hold interactables exist.** `Interactables.add(..., holdTime)` (`src/game/interactables.ts:60`). The hold rides the item mirror (`NetItem.hold`, `protocol.ts:115`; `coopClient.ts:359`), but course devices always pass 0 (`courseMode.ts:251`).
- **"Hack" today** is a plain press: the S5 hang-down hack panel is a lever gate (`ctcourse.ts:316`).

### 1.8 Interrogation and grab
- **Grab.** RT tap knocks out, RT hold kills, LT gives the human shield. Interrogate appears only when the guard has info (`src/game/grabMenu.ts:1-31`).
- **Force to device (living key).** A stub: "not yet" (`grabMenu.ts:25`).
- **Joint questioning (G148).** Built (joint-interrogation): the partner beside the hold BLUFFs, the holder's INTERROGATE within 6 s gives the joint-only lines to both (`src/game/jointInterrogation.ts`; the A8 duty officer carries two).
- **In Yard.** S1 passive guard with two medkit lines (`ctcourse.ts:203-213`); S3 duty guard's line.

### 1.9 Other
- **Wall medkits.** S5 and S8 (`ctcourse.ts:621-624`).
- **Exit.** Both players in the exit zone end the course (`ctcourse.ts:216`).
- **Airlocks.** Both players on the pad cycle in 4 s (`src/config/course.ts`).
- **Course protocol.** `course` host to all, `ctick` client to host, `use`.

## 2. Gaps against Michael's list (smallest prototype each)

| Michael's item | Today | Smallest prototype | Size | Protocol bump |
|---|---|---|---|---|
| **Timed isolation of lights** | Partly. Jam a lamp (up to 5 s held + 4 s off, one lamp); shoot (permanent); wall switches (permanent toggle, none in the Yard); mains gate. No timed breaker. No guard who comes to relight. | (a) **Breaker gate**: new kind `breaker {switchId, group, seconds}` in `courseDef.ts`, a timer in `courseState`, `reg.setGroup` plus `stealth.syncGroup` in `courseMode`. The Yard gets `groups` and grouped lamps. The client sees the state flip through the existing `lights.groups`; countdown via radio or objective text. Also fix `resetLights` so restarts restore Yard lamps. (b) Optional CT relight: on lights-out the nearest calm guard walks to the switch and turns it back on (`enemy.ts` / `enemyManager.ts` + switch positions). | (a) ~70-90 lines; (b) ~100-130 lines | No (both use existing `lights.groups`) |
| **Cameras** | Built (sweep, meter, IR, jam, shoot, grid, hallway rule). | Layout only. Optionally `looped` mode as a timed security-room loop. | 0 | No |
| **Locks** | Course-door gates only. No lockpick, keypad or hack minigame. | **Hold device**: `CourseDevice.hold?: number` passed to `ints.add` at `courseMode.ts:251`, used with a lever gate. "Pick lock" or "hack keypad" becomes an N-second still hold with a noise pulse. Keypad codes read in-world (G143) need a code-pick UI (~150 lines); defer. | ~15-25 lines | No (`NetItem.hold` exists). The host does not re-check the hold time; acceptable for a prototype. |
| **Security room camera disable** | Built and placed (S3). Permanent until bay restart. Duty guard passive. | **Timed console**: `SecurityConsole.seconds`; the host clears the flag after T s (needs a flag-clear in `courseState` + a timer in `courseMode`). Cameras come back on both pages through the packed state. Make the duty guard live (patrol between monitors and door). | ~35-50 lines + data | No |
| **Timed jammer exercises** | Built (5 s use, 5 s cooldown, 1.5 s reboot, 4 s lamp off). Only S3 uses it. | Layout only: camera chains whose timing forces alternation (section 4, E5 and E7). Optional HUD line with the partner's jam left and cooldown (already on the wire as `sec.ch` / `sec.cd`). | 0 / ~20 lines | No |
| **Hacking devices in sync** | Partly. One scanner pair per map, ground level only; pair gate (press-only, 1.0 s). | (a) **Hold device + pair gate**: two hold devices (e.g. 3 s each) whose completions feed a pair gate's window. A second "hack in sync" with no new rules. (b) Several scanner pairs: `scan` becomes an array and `sc` a list. (c) CT wire cut: a scanner-pair variant with a live wire randomised per run, visible only in thermal (render), wrong wire = alarm + reset. | (a) ~10 lines over the hold device; (b) ~60 lines; (c) ~150 lines | (a) No; (b) yes, `SecWire.sc` shape, 30; (c) yes |

Other CT co-op mechanics not built, by the same yardstick:
- Living key (Force to device): ~120 lines, probably a bump for a held-guard-at-scanner claim.
- Joint interrogation (G148): ~60 lines, no bump if it runs as host flags.
- Throw onto a guard knocks him out: ~30 lines in `onTeamMove`, no bump.
- Co-op body carry: needs a wire item.
- Optic cable: `ct-toolkit.md` 3.2, ~200 lines, local view plus a `MoveState` sub, so a bump.
- G44 look-up penalty: ~15 lines in `perception.ts`, no bump.
- `em.stealth = true` in course mode, so live guards radio and run to alarm panels: 1 line, a behaviour change.

## 3. CT co-op scenarios a training yard should copy
From `docs/ct-research` only (levels digest 2.1-2.7 and 3.2; moves digest 1.x). Ranked by how well current systems support them.

| # | Scenario (where in CT) | A | B | Timing pressure | Why it is a "wow" | Support |
|---|---|---|---|---|---|---|
| 1 | Camera jam-and-pass, then swap (Training 3, Panama 4, Bunker 12) | Holds the jammer still on the camera | Runs the corridor to cover, then jams it from the far side for A | A jam lasts 5 s; the runner must make cover before it ends | "Jamming a camera while the partner runs" is named by players; each protects the other in turn | Full (S3) |
| 2 | Laser grid relay at a breaker inside the grid (Panama exhibition hall) | Jams the breaker or panel | Crosses the grid; then they swap from the far side | About 6.5 s of beams off per jam (5 + 1.5 reboot) | A visible draining window; the breaker sits in the grid itself | Full (panel jam) |
| 3 | Throw over a laser, far-side release (Training 4, Bunker 7) | Throws | Lands alone, hits the release to free A | The thrown player is stranded until he acts | The mode's signature move, third thing taught | Full (S4) |
| 4 | Boost-and-climb into a window or ceiling (Panama facade, Seoul hotel, Train Station booth) | Platform, then climbed | Boosted, hangs, becomes the ladder | Low; a handshake | Altitude change; a route a guard never watches | Full (S2, S5) |
| 5 | Security room: down the watcher, kill the cameras (Bunker "a computer can disable the camera system"; UN HQ control room) | Jams the hallway camera so B can slip in | Takes out the duty guard, uses the console | Jam 5 s to reach the room door; in CT the cameras then stay off | Turning the enemy's eyes off from his own chair | Full, permanent; timed version needs ~40 lines |
| 6 | Split-path two-key sync (Training 6 scanners, Pumphouse finale) | Own route and mini-challenge to device A | Own route to device B | Both finish within 1.5 s (scanners) / 1.0 s (pair gate) | Separated, each unable to see the other's device; a spoken countdown | Full for one pair; more via pair gates |
| 7 | Reach-in from above to hack (Training 5, Panama duct keypad) | Holds and controls depth | Hangs head-first, presses the panel that opens the gate | The holder must stay put; the partner is in his hands | CT's most cinematic image | Full on a passive room; near-miss under a live guard needs G44 |
| 8 | Dual rope up a shaft (Training 7, Bunker silo) | Holds at the top | Climbs | Continuous control | Trust | Full (S7) |
| 9 | Make-your-own-dark lure and ambush (Panama 3F hall, Train Station water tunnel, Bunker hall) | Kills a light (switch, jam, shot) | Waits in the dark where the guard walks to look | The lure fires as the light dies | "One shoots a light, the other drops on the guard who comes to look" | Partial: `lightsOut` lure built; live guards, Yard switches and relight missing |
| 10 | Timed blackout to cross a lit room (CT kills lights everywhere; handheld 15 s panel windows) | Throws a breaker (group dark for T s) | Crosses or takes the guard in the dark | Breaker clock; in CT a guard comes to fix it | Visible light lane both players made | Partial: needs the breaker gate (~80 lines) |
| 11 | Protect-while-act (Panama archive, Seoul keypad + hall light) | Slow action (hack or search hold) | Handles the interrupter (jams the watching camera or takes the guard who comes) | The hold length against the interrupter's walk | Gives the non-acting player a real job | Partial: hold device (~20 lines) + a scripted interrupter |
| 12 | Simultaneous takedown (double drop, "co-op ambushes") | Takes guard 1 | Takes guard 2 | Within 1.5 s or the other reacts | Among the most praised moments | Built (dual takedown); needs a live guard pair |
| 13 | Living key at paired scanners (Panama 3F double capture, Bunker storage) | Captures a guard, walks him to scanner A | Captures another, scanner B | Sync scan | Folds capture, split and sync into one beat | Not built (Force to device stub) |
| 14 | Laser-linked bomb wire cut (Train Station x3, Bunker warhead) | Cuts at bomb A | Cuts at bomb B, across a laser | Same moment; the live wire shows only in thermal | The tensest CT beat | Not built (scanner pair is the template) |
| 15 | Operator and spotter (Bunker crane) | Operates blind | Directs with callouts or pings | Communication is the mechanic | Purest information-asymmetry beat | Not built (pings only) |

## 4. Proposed exercises (each one CT scenario)
- Order follows CT's rising interdependence: handshake, then hold-and-pass, then strand, then simultaneity, then continuous control (levels digest 2.1).
- Roles alternate per exercise.
- Every exercise: observe first, then plan (an overlook or window into the space, the solution in sight of the problem, levels digest A3), and a fail that escalates, never kills.
- Retry is the bay's checkpoint restart (pause menu, or both downed for 2 s).
- Light parity reminder: cameras ignore lamps (IR). Lamps only change the meter and the guards.

| # | Exercise (CT scenario) | Setup | A | B | Sync / timing | Fail and retry | Observe-then-plan | Light parity | Time | New code |
|---|---|---|---|---|---|---|---|---|---|---|
| E1 | **Window entry** (#4) | Dark loading bay; lit 2nd-storey window at 4.4 m; bolted door below | Crouch, leg-up B | Hangs, relays A up (or unbolts from inside) | Handshake only | No room: refusal text; no penalty | From the dark bay both see the window and the door's bolt side | Bay below 0.28 (meter dark); window lit so the target reads | 1.5 min | None |
| E2 | **Camera corridor relay** (#1) | 10 m corridor, sweeping camera at the far end; dark side-lobby at each end | Jams the camera (still, aimed) | Crouch-runs in under 5 s, jams from the far end for A | 5 s jam + 1.5 s reboot; 5 s cooldown each | Seen: alarm stage + sent back (existing hall rule) | Entry lobby sightline down the corridor; the camera grid shows its sweep | Corridor lit (meter lit) on purpose: only the jam saves you, not the dark | 2 min | None (reuse S3) |
| E3 | **Security room, timed** (#5) | Off the far lobby: duty guard (live, short patrol desk to door) watching two cameras over a second gallery no single jam can cover | Waits at the gallery mouth | Slips into the room (dark), takes the guard from behind, uses the console: cameras off 30 s | Console clock 30 s; A must cross the gallery inside it (radio counts down) | Guard sees B: fight + alarm. Clock runs out with A inside: cameras back, alarm, sent back. Restart re-arms. | B sees the guard through the door's wired-glass window first; A sees both cameras' grids | Room dim (one panel lamp, jammable); gallery lit (cameras would see anyway) | 2.5 min | Timed console + live guard data (~40 lines) |
| E4 | **Laser hall: panel relay** (#2) | Grid across a hall; power panel high on a pillar inside the grid, seen from a vantage on each side, shown in electro | Jams the panel from the near vantage | Crosses in the 6.5 s window, then jams from the far vantage for A | One jam = beams off 5 s + 1.5 s reboot | Break: alarm stage + radio (no damage) | NV shows the beams, electro shows the panel; both scout before committing | Hall lit; beams IR (NV only) | 2 min | None |
| E5 | **Jammer chain** (timed jammer, #1 extended) | Three cameras along an L-route; cam 2 covers cam 1's far end, so jams must hand off | Jams cam 1 while B runs | Jams cam 2 from the corner while A runs; A then jams cam 3 for B | Each player's 5 s cooldown forces strict alternation; a pair who jams out of turn has no jam left | Seen: alarm + sent back to the chain's start | A raised overlook shows all three grids at once | Route dim; irrelevant to cameras | 2.5 min | None (layout); optional partner jam HUD (~20 lines) |
| E6 | **Throw over the line** (#3) | Laser band in a doorway gap; red release on the far wall in plain sight | Throws B | Lands, presses the release; band off for good | Thrower stranded until the release | Break: alarm stage; retry | The release is visible through the gap (A3 fix) | Far side lit at the release | 1.5 min | None (reuse S4) |
| E7 | **Breaker blackout + lure** (#9, #10) | Lit room, one live patrolling guard; breaker cupboard in a dark side corridor | Throws the breaker: room group dark 20 s | Crosses the dark room to the exit door; or ambushes the guard who walks to the breaker | Breaker clock 20 s; the guard reaches the cupboard in about 10-12 s | Guard sees B in the light: fight + alarm; lights restore on restart | Both watch the patrol through a doorway first | The room drops from lit to under 0.28: the meter and the guard agree | 2 min | Breaker gate + Yard light groups + `resetLights` fix (~80 lines); relight optional (~120) |
| E8 | **Double drop** (#12) | Two live guards chatting at a table under one lamp | Takes guard 1 from behind | Takes guard 2 within 1.5 s | Dual takedown banner inside 1.5 s; early = the other reacts | One alerted: fight; restart | From a dark doorway both pick their man | Jam the table lamp first (optional) to darken the approach | 1.5 min | Live guard data only |
| E9 | **Annex roof + hang-down hack** (#4, #7) | Roofed annex; roof plates; hatch over a back room; hack panel under it | Holds, controls depth | Hangs, hacks the panel (a 3 s hold) that opens the grid door | Plates within 1.0 s; holder still; hack hold 3 s | Holder moves: B drops into the room (never stuck, existing) | The hatch tell is visible from the floor and roof | Back room lit at the panel | 2 min | Hold on the hack panel (~15 lines); near-miss guard below only after G44 (~15 lines) |
| E10 | **Jam-and-hack** (#11) | Terminal watched by a camera; terminal is a 4 s hold; a guard walks in on a timer when the hack starts | Hacks (still, 4 s) | Jams the camera for him, then deals with the guard (takedown) | 4 s hack inside a 5 s jam; guard arrives about 8 s after the start | Camera full: alarm + hack reset; guard sees A: fight | B picks a jam spot from which he also covers the guard's door | Terminal lit (screen); B's spot dark | 2 min | Hold device (~15) + timed interrupter (~30 lines) |
| E11 | **Split-path sync hack** (#6) | Two routes split by a wall: A's under a laser band (crawl under the low beam), B's past a lamp-lit post (jam the lamp); scanners 20 m apart at the end | Own route + scanner A | Own route + scanner B | Both finish within 1.5 s (2 s hack each); "Start on two green lights" | Late or abandoned: 10 HP + reset (G193) | A window at the split shows both scanners and a shared status light | Each route has one lit hazard the player clears alone | 3 min | None (reuse S6 scanners; a second sync point uses hold + pair gate) |
| E12 | **Rope shaft out + extract** (#8) | 4.4-6 m shaft wall; exit zone above | Leg-up one; holds the rope | Climbs | Continuous control | Let go: slides down, retry | Wall-top lamp shows the holder strip | Top lit, shaft dim | 1.5 min | None (reuse S7) |

**Total.** About 23.5 min if all twelve run; over the 15-20 min target (M3). Hitting it means cutting or merging. Example: drop E6 and fold E12's rope into E1, about 20.5 min. Dropping E8 as well gives about 19 min.

**Needs new code:**
- E3: timed console.
- E7: breaker gate, plus the `resetLights` restart fix.
- E9: hold device.
- E10: hold device + interrupter.

No exercise needs a PROTOCOL_VERSION bump. A bump comes only with several scanner pairs (`sc` array), the wire-cut device, the living key or the optic cable.

**Data-only changes:** E8, plus live (non-passive) guards in E3 and E7.

**Behaviour flags worth deciding in the spec (left for Michael):**
- `em.stealth = true` in course mode, for radios and alarm runners.
- Building G44, so guards see poorly above them; E9's near-miss depends on it.
