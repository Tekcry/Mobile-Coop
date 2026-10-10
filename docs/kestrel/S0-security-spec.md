# Security systems - spec
Status: DRAFT (reopened 2026-10-10 for revision fixes 1-2; was APPROVED)

Six systems for Cinder Yard, reused later (Mission 5 bank): CCTV cameras, the security desk (with its alarm panel and plant faults), card access (readers, keycards, cloning, mantrap), the iris scanner, infrared beams and PIR lights. Coordinates and yaw follow 00-facts.md section 2 (north +Z, yaw 0 faces +Z). `SNxx` are the numbers in section 5. Every device raises suspicion only through existing enemy functions (section 10). Nothing here fails the mission.

Bible lines followed: cameras are "light-dependent like guards, raise an alarm, can be shot, jammed or disrupted" (bible 5.7 Sensors); vision modes "never change detection" (5.5); `coopExtras` add cameras or beams at 3+ players (C7). The light disruptor, camera jammer, thermal and electro vision are bible Phase 6 / Phase 3 additions and are not built: they are not counted as counters here.

## 1. Real-world basis
| System | How the real device works |
| --- | --- |
| CCTV | Fixed IP cameras (domes, bullets) cover doors and aisles; a few pan-tilt units sweep on a preset tour. Lens field 30-100 deg horizontal. Most record to a VMS; a person watches live only at a staffed desk (general knowledge). |
| Security desk | One operator faces a wall of monitors plus an alarm / access-control workstation. Events (door forced, beam break, video loss) pop up and the operator radios a patrol to check. Plant faults reach the desk and the on-call engineer from the BMS (general knowledge). |
| Card access | Readers (HID-style, 13.56 MHz) beep and flash green on a valid card, red on a refused one; the door strike releases for a few seconds. Old 125 kHz prox cards are easy to clone: a handheld cloner held near the card copies it in seconds (general knowledge). |
| Mantrap / iris | A mantrap interlocks two doors so only one is open at a time; data halls often ask card plus biometric at the inner door. Iris readers need a live, open eye a short distance from the lens and refuse closed eyes (general knowledge). |
| IR beams | An emitter post sends an invisible near-infrared beam (about 850-950 nm) to a receiver post; interrupting it for a short time trips a zone on the intrusion panel. Night-vision tubes and camera sensors see the beam where dust or haze catches it (general knowledge). |
| PIR lights | A passive infrared sensor sees a warm body crossing its zones; slow movement crosses fewer zones and may not trigger. The lamp stays on for a set time after the last motion (general knowledge). |

## 2. Game rules
All state lives in one host-side `SecuritySystem` (pure logic in `src/security/`); doors stay in `Doors`, lamps in `LightRegistry`. "Calm guard" = alive, not knocked out, alert level below `alert`. "Dispatch" = the nearest calm guard to the point within `EnemyManager.RADIO` (22 m) gets `Enemy.searchAt(x, z)` after `ALERT.callIn` (2.5 s) and the desk operator barks a radio line (existing `RADIO_BARKS` path, subtitle). Desk "manned" = a calm guard within SN20 of the desk's seat point.

### 2.1 CCTV camera (fixed and sweep)
| Item | Rule |
| --- | --- |
| Detects | Each player body (`PlayerRef`, local and remote) inside the frame (SN01 x SN02) and within SN03. The same rays as `Enemy.perceive` (chest, head, hips) give `exposure`. Rate = `sightRate({dist, angle: 0, light: PlayerRef.light, crouched, speed, exposure, sensitivity: SENSITIVITY.unaware})`; no peripheral field, no close-range term, no `instantDetect`. Meter by `stepMeter`. Thinks at SN07. Light parity: same body light as guards (F24). |
| Time lit / dark | Derived from `PERCEPTION` (walking, full exposure): lit at 10 m about 1.3 s; crouched still lit at 10 m about 9 s; dark (light 0.28 or less) never at 10 m, about 13 s at 4 m. See SN08-SN10. |
| Stages (manned) | Meter 0.3 (`PERCEPTION.suspicious`): HUD arc white; nearest calm guard `notice(px, pz, meter)`. Meter 1: dispatch to the player's position. Still in frame SN11 after meter 1: the operator gets `Enemy.alert()`; the existing `assignAlarm` sends him to the desk alarm panel, `raiseAlarm` -> `onAlarm` -> `reinforce`. Leaving the frame drops the meter by `stepMeter`; escalation stops. |
| Stages (unmanned) | No live response. Events with a position go to the desk log (SN21 long). When the desk becomes manned again, the operator dispatches to the newest logged event once. |
| Bodies | Manned: a body in frame with light above `LIGHT.lit` for SN12 -> nearest calm guard `searchAt(bx, bz, body)` (existing revive path). |
| Shot / EMP | A hit on the housing (shot target box SN05) destroys it: offline for good. Manned: video loss -> `EnemyManager.lightsOut(camX, camZ)` (nearest calm guard investigates). EMP within `GADGETS.emp.radius` (9 m): offline for `GADGETS.emp.duration` (8 s), no video-loss event. |
| State | `SecuritySystem.cameras[i]`: yaw, sweep phase, meter per player, `online / looped / off / destroyed`. |

### 2.2 Security desk and alarm panel
| Item | Rule |
| --- | --- |
| Desk | Shows the feeds in its `feeds`. Has a seat point (desk `at` + SN19 along `facing` reversed). Manned test SN20. Feeds only matter while manned (2.1). |
| Panel | A wall panel (device `panel`) beside or inside the security room. Player actions (holds): "Loop cameras" (SN22): feeds show recorded empty footage, cameras in `controls` stop detecting, nobody notices. "Cameras off" (SN23): cameras in `controls` off; when the desk is next manned, after SN24 the operator dispatches a guard to the panel. "Beams off" (SN23): beams in `controls` disarmed; same notice rule. The panel is also an `AlarmPanel` in `EnemyManager.alarms`, so the existing hold-to-disable (`ALARM.disableTime` 1.2 s) stops the reinforcement call. |
| Plant faults | A `fault` device (CRAC unit or BMS panel) has "Trip cooling" (hold SN25). Desk manned: dispatch SN26 calm guards to the fault point. Always (BMS page): each id in `responders` gets `searchAt(fault point)`. Faults reset after SN27; a second trip within that time does nothing. Noise while held: SN28. |
| Stages | The desk itself never detects. All its outputs are dispatches, `alert()` on the operator, and the existing alarm panel run. |
| State | `SecuritySystem.desk`: manned, event log, panel flags (looped, camerasOff, beamsOff), fault timers. |

### 2.3 Card readers, keycards, cloning, mantrap
| Item | Rule |
| --- | --- |
| Reader | Bound to one door (`Door` anchor with `locked: true`). A player holding a card whose `opens` lists the reader: "Swipe card" (tap) -> green, door `locked` false for SN30, then relocks when closed. No card: red, double beep, nothing else (no alert). |
| Keycards | `cards[].heldBy` is a guard id or an object id. Object: "Take card" (tap). Guard: taken automatically when a takedown of the holder completes (Michael Q3), with a HUD line "Card taken"; while grabbing (`GRAB`) a card holder, the held person's card counts as carried. Cards belong to the player who took them. |
| Guards | A guard whose card opens a reader door passes it (beep, green); guards without a card never route through a reader door (P07 rule). |
| Clone | While grabbing (`GRAB`) a card holder: "Clone card" (hold SN32) copies the card to the player (same `opens`); the guard keeps his own card (Michael Q2). |
| Revoke | A card's holder found as a body (`EnemyManager.onBodyFound`) while the desk is manned: that card and its copies stop working after SN33. |
| Mantrap | Two doors (`door` outer, `door2` inner) with readers. Interlock: one door unlocks only while the other is closed and has been closed SN34. Inner door needs card then iris (2.4) inside one SN35 window. A door held open past SN36 logs a "door held" event (manned: dispatch to the mantrap). |
| State | `SecuritySystem.access`: card owners, clones, revoked ids, reader unlock timers, mantrap phase. Door open / lock state stays in `Doors`. |

### 2.4 Iris scanner
| Item | Rule |
| --- | --- |
| Detects | A person in its `enrolled` list (the night duty engineer and the duty manager `g-s2-manager`, because there is no civilian system yet), held by the existing grab (conscious, not knocked out), within SN38 of the scanner. Scan hold SN37. A knocked-out or dead person fails (closed eye). |
| Stages | Granted: green ring, its door (or the mantrap inner factor) unlocks as a reader would. Refused: red ring, no event. A grab seen by a guard follows the existing human-shield rules (`GRAB.hesitate`). |
| State | `SecuritySystem.access` (same as readers). |

### 2.5 Infrared beam
| Item | Rule |
| --- | --- |
| Detects | Segment `a`-`b` against each player's capsule (F01: radius 0.3, height 1.75 standing or 1.15 crouched). Only players trip beams. Real sites arm beams only where nobody walks at night, so guard routes never cross an armed beam (P07 rule). |
| Stages | Break (inside the capsule for SN44): receiver LED flashes red. Armed and manned: dispatch to the beam's midpoint. Second break of the same beam within SN45: dispatch SN26 guards. Unmanned: logged (2.1 unmanned rule). Never `alert()`: a beam does not see who broke it. |
| State | `SecuritySystem.beams[i]`: armed, broken timer. |

### 2.6 PIR motion light
| Item | Rule |
| --- | --- |
| Detects | Any body (players and guards) within SN50 horizontally of the sensor, on its level, moving faster than SN51. |
| Stages | Trigger: `LightRegistry.setOn(lamp, true)`; on for SN52 after the last trigger, then `setOn(lamp, false)`. Guards see the player by the normal light field (light parity). A calm guard with line of sight to the lamp within SN53 when a player turns it on gets `notice(lampX, lampZ, PERCEPTION.suspicious)`. |
| Off | The lamp's switch group off (`setGroup`) or the lamp destroyed (`destroy`, existing `lightsOut` response) or EMP (`disrupt`) stops the PIR lighting it. |
| State | `SecuritySystem.pirs[i]`: timer; lamp on / destroyed in `LightRegistry`. |

## 3. Readability (phone, Low preset)
| System | Cues |
| --- | --- |
| Camera | Housing box at least SN05 long, contrasting colour, a red status LED (emissive dot, SN06). Panning cameras visibly turn and pause. Motor whir: event only, sound comes with the audio phase (bible S7). Being watched shows on the same HUD awareness arcs as guards (level-design 8.3). No drawn cone. Destroyed: LED off, housing tilted. Looped / off: LED off. |
| Desk | Lit monitor wall (emissive). The operator is a visible guard at the seat. Radio barks with subtitles for every dispatch ("Beam break in the east corridor, check it"). |
| Panel | Zone LEDs: green armed, red alarm, off disarmed. "LOOP" text on the feed monitors while looped. |
| Reader | LED red idle, green on grant (SN30), red flash and double beep on refusal. |
| Mantrap | Lamp over each door: green may open, red interlocked. |
| Iris | Ring LED: blue idle, green granted, red refused. |
| Beam | Posts always visible with a red receiver LED. The beam line (SN46 thick, emissive) shows only with night vision on. Flashes on break. |
| PIR | A white sensor dome under the lamp; its lamp is a normal visible fixture. The light meter jumps the moment it turns on. |
| Fault | The CRAC / BMS panel has an amber fault lamp after a trip; the desk shows it. |

## 4. Counters (existing tools first)
| System | Counters |
| --- | --- |
| Camera | Stay in darkness (2.1 times); time the sweep (SN13-SN15); shoot the housing (alerts the manned desk); EMP; loop or switch off at the panel; take out or lure the operator (feeds then go unwatched); stay out of frame (corners, under the mount, SN04). |
| Desk | Lure the operator with a noise (noisemaker, `hear`) or a light out (`lightsOut`); take him down from behind or with gas; wait for the supervisor to leave on rounds; trip the cooling to pull other staff away. |
| Reader | Take a card (desk drawer, any takedown of a holder, held guard); clone a held guard's card; follow another route (window, vent, carrier entrance). |
| Mantrap | Card plus a grabbed enrolled person; the carrier entrance to the meet-me room. |
| Iris | Grab an enrolled person and walk them to it (gear 2 or slower, `GRAB.maxGear`); another route. |
| Beam | Crouch under a high beam (SN40); jump over a low beam (SN41); switch off at the panel; another route. |
| PIR | Move at SN51 or slower (standing gear 1, crouched gears 1-2); switch the lamp's circuit off; shoot the lamp; EMP. |

## 5. Numbers (proposals; S1-S3 make them constants in src/config/security.ts)
| Id | Name | Value | Unit | Reason |
| --- | --- | --- | --- | --- |
| SN01 | Camera horizontal field | 70 | deg | Mid-range varifocal lens; wider than a guard's 55 deg focus, no periphery |
| SN02 | Camera vertical field | 45 | deg | 16:9-ish frame |
| SN03 | Camera range | 18 | m | Under guard focus range 25; at 18 m lit walking it still takes about 9 s |
| SN04 | Camera mount height | 2.4-3.5 | m | Above F05 grab reach (2.7) only where meant to be unreachable; under 3.5 for readable housings |
| SN05 | Camera housing (shot box) | 0.35 x 0.15 x 0.15 | m | Readable at Low; a fair shot target |
| SN06 | Status LED size | 0.04 | m | Visible dot at 15 m on the phone (Phone check) |
| SN07 | Camera think rate | 4 | Hz | Same as guards |
| SN08 | Lit detection, walking, 10 m | about 1.3 | s | Derived: PERCEPTION rate 2.2, distPow 1.5, leak 0.2 |
| SN09 | Lit detection, crouched still, 10 m | about 9 | s | Derived (crouchMul 0.55, stillMul 0.55) |
| SN10 | Dark detection (light 0.28), walking, 4 m | about 13 | s | Derived; at 10 m never (rate under leak) |
| SN11 | Frame time after meter 1 before `alert()` | 2.0 | s | One more step before an alarm (level-design 9.1) |
| SN12 | Body seen on a feed | 2.0 | s | Lit body only; same idea as `bodyNoticed` |
| SN13 | Sweep angle (max) | 120 | deg | Real auto-pan presets; limits gaps |
| SN14 | Sweep speed | 15 | deg/s | Real auto-pan; a 90 deg sweep takes 6 s |
| SN15 | Pause at each end | 2.0 | s | A 90 deg sweep cycle = 16 s; gaps fall in F30's 3-8 s |
| SN19 | Desk seat offset | 0.8 | m | Chair behind a desk |
| SN20 | Desk manned radius | 2.0 | m | Seat point plus a step |
| SN21 | Desk event log length | 90 | s | Events older than this are not reviewed |
| SN22 | Hold: loop cameras | 6.0 | s | Ghost option costs time at the most watched spot |
| SN23 | Hold: cameras off / beams off | 2.0 | s | Fast but noticed later |
| SN24 | Delay before a manned desk notices off feeds | 10 | s | Gives time to leave the room |
| SN25 | Hold: trip cooling | 2.0 | s | Short, loud lure |
| SN26 | Guards sent to a fault / repeated beam break | 2 | count | Pulls staff, leaves posts |
| SN27 | Fault reset time | 120 | s | One lure per two minutes |
| SN28 | Trip noise radius | 4 | m | Same as `HOLD_NOISE_RADIUS` (F19) |
| SN30 | Reader unlock time | 5.0 | s | Real strike release 3-8 s |
| SN32 | Hold: clone card from a held guard | 3.0 | s | Handheld cloner read time |
| SN33 | Card revoke delay | 30 | s | Operator disables it in the access software |
| SN34 | Mantrap interlock (closed time before the other door unlocks) | 3.0 | s | Real interlock cycle |
| SN35 | Mantrap card-then-iris window | 10 | s | Two factors in one visit |
| SN36 | Door held open alarm | 30 | s | Real "door held" default |
| SN37 | Hold: iris scan | 2.0 | s | Real capture 1-2 s |
| SN38 | Iris reach (held person to scanner) | 0.8 | m | Close to the lens |
| SN39 | Mantrap full cycle (outer open to inner open) | about 8 | s | SN34 + doors + scan |
| SN40 | High beam height | 1.30-1.50 | m | Crouched capsule 1.15 (F01) + 0.15 clear; standing 1.75 breaks it |
| SN41 | Low beam height | 0.30-0.45 | m | Walking breaks it; a jump (about 0.8 m, F06) clears it |
| SN42 | Beam heights not allowed | 0.46-1.29 and over 1.50 | m | No legal pass under or over (except stacks, SN47) |
| SN43 | Min spacing between parallel beams | 1.2 | m | Capsule 0.6 wide plus a landing between jumps |
| SN44 | Beam break time inside capsule | 0.1 | s | Real response time; filters frame jitter |
| SN45 | Repeat break window | 60 | s | Second break is taken seriously |
| SN46 | Beam line thickness (night vision) | 0.03 | m | Readable on the phone without aliasing to nothing |
| SN47 | Beams per post pair | 1 or 2 | count | 2 (low + high) is impassable: only where the panel or another route exists |
| SN48 | Beam length | 1.5-12 | m | Indoor corridor to yard run |
| SN50 | PIR range | 6 | m | Ceiling sensor footprint |
| SN51 | PIR speed threshold | 1.0 | m/s | Standing gear 1 (0.8) and crouched gears 1-2 (0.5, 0.9) pass; standing gear 2 (1.3) and up trigger (F18) |
| SN52 | PIR on time | 30 | s | Real minimum settings are 10 s-20 min; short keeps it readable |
| SN53 | PIR notice range for guards | 12 | m | Peripheral range (`PERCEPTION.periphRange`) |
| SN60 | Max cameras per map | 12 | count | 4 Hz x 3 rays x 4 players; same order as 12 guards |
| SN61 | Max desks / panels per map | 1 / 2 | count | One control room |
| SN62 | Max readers / iris / mantraps | 12 / 2 / 2 | count | Draws (one instanced mesh each), readability |
| SN63 | Max beams per map | 10 | count | One instanced line mesh |
| SN64 | Max PIR lights per map | 6 | count | Each toggle remixes the phone lamp volume (lighting.md) |
| SN65 | Max faults per map | 2 | count | One lure per area |
| SN66 | Security draw calls (all devices) | 6 | draws | Within F29 Low 120 |
| SN67 | Test tolerances: derived times / detection / co-op yaw | 10% / 0.5 s / 5 deg | - | Unit and e2e margins (section 9) |

## 6. Map data (kestrel.security.json)
```json
{
  "devices": [
    { "id": "cam-lobby-1", "kind": "camera", "level": "ground", "at": [12.0, 8.5], "y": 3.0, "facing": 180,
      "sweep": [135, 225], "room": "lobby", "reason": "covers the lobby door" },
    { "id": "desk", "kind": "desk", "level": "ground", "at": [20.0, 10.0], "y": 0, "facing": 90, "room": "secroom",
      "feeds": ["cam-lobby-1"], "reason": "operator post" },
    { "id": "panel", "kind": "panel", "level": "ground", "at": [21.5, 11.0], "y": 1.4, "facing": 270, "room": "secroom",
      "controls": ["cam-lobby-1", "beam-c1"], "reason": "intrusion panel" },
    { "id": "rd-ops", "kind": "reader", "level": "ground", "at": [30.0, 12.5], "y": 1.1, "facing": 0, "room": "corr-e",
      "door": "op-ops-1", "reason": "ops office door" },
    { "id": "mt-hall", "kind": "mantrap", "level": "ground", "at": [34.0, 14.0], "y": 0, "room": "mantrap",
      "door": "op-mt-out", "door2": "op-mt-in", "reason": "data hall entry" },
    { "id": "iris-hall", "kind": "iris", "level": "ground", "at": [34.5, 15.5], "y": 1.6, "facing": 0, "room": "mantrap",
      "door": "op-mt-in", "enrolled": ["civ-engineer", "g-s2-manager"], "reason": "inner factor" },
    { "id": "beam-c1", "kind": "beam", "level": "ground", "a": [26.0, 1.4, 12.0], "b": [26.0, 1.4, 14.0],
      "room": "corr-e", "reason": "corridor trap, high beam" },
    { "id": "pir-yard-1", "kind": "pir", "level": "ground", "at": [8.0, 40.0], "y": 3.5, "lamp": "lamp-yard-3",
      "room": "yard", "reason": "yard path motion light" },
    { "id": "flt-crac", "kind": "fault", "level": "ground", "at": [40.0, 18.0], "y": 1.2, "facing": 180, "room": "plant",
      "responders": ["civ-engineer"], "reason": "CRAC trip lure", "minPlayers": 1 }
  ],
  "zones": [ { "id": "secure", "rooms": ["mantrap", "datahall", "mmr"], "secure": true } ],
  "cards": [ { "id": "card-mgr", "opens": ["rd-ops"], "heldBy": "g-s2-manager" } ]
}
```
(Coordinates above are placeholders for shape only; P04S places the real devices.)

Rules: `at` [x, z] and `y` (mount height above the level floor) on the 0.5 m grid, devices may use the 0.1 m object grid; `facing` and `sweep` are yaw degrees (0 = +Z); `a` / `b` are [x, y, z] with y above the level floor; every id unique; `door` / `door2` are opening ids from kestrel.arch.json; `lamp` a lamp id from kestrel.play.json; `heldBy` / `enrolled` / `responders` guard or civilian ids from kestrel.play.json or object ids; every device has a `reason` (why a real operator put it there, RULES section 5).

Added fields and why:
| Field | On | Why |
| --- | --- | --- |
| `door2` | mantrap | A mantrap is two doors in series |
| `enrolled` | iris | Biometric is per person, not per card |
| `controls` | panel | Which cameras and beams the panel switches (`feeds` is what the desk shows) |
| `responders` | fault | The BMS pages named staff (the duty engineer) whether or not the desk is manned |
| `minPlayers` | any (default 1) | Bible C7 `coopExtras`: devices that exist only at 3+ players |
| kind `fault` | new kind | Plant faults are a desk input (system 2); they need a placed source |

## 7. Co-op
- The host runs `SecuritySystem` and tests every player (local and remote `PlayerRef`, with the host's light for each, lighting.md). Clients never decide a device state.
- Clients see: camera yaws (simulated locally from the host clock and the device's sweep, corrected by state), LEDs, beam lines in their own night vision, PIR lamps (through the light state the host sends), reader / iris / mantrap lights, the panel and monitor state, their own HUD arcs for cameras watching them, the radio barks. Door open / lock state already syncs through `doors`.
- Actions from clients (swipe, take card, clone card, iris scan, panel holds, trip cooling) go through the existing `use` message; the host checks reach (F16) and conditions.
- Cards are owned per player; a card taken by one player is not in another's pocket.
- New messages (S4 designs them): `sec` {t, cams: [id, yaw, mode], beams: [id, armed, broken], pirs: [id, on], readers: [id, led], mantrap: [id, phase], panel: {looped, camsOff, beamsOff}, cards: [cardId, ownerId], arcs: [cameraId, meter]} sent when changed or every 2 s; `secEv` {kind: beamBreak | granted | refused | cameraDown | fault | revoked | cloned, id, at} for one-off cues.

## 8. Controls
All through the existing contextual interact (pad Y, keyboard E, touch action button; holds use the existing hold progress). Prompt words:
| Action | Prompt | Input |
| --- | --- | --- |
| Use a valid card | Swipe card | Tap |
| No valid card | No access | Shown greyed |
| Take card (object) | Take card | Tap |
| Take card (takedown) | none: automatic, HUD "Card taken" | - |
| Clone a held guard's card | Clone card | Hold SN32 |
| Iris with held person | Scan eye | Hold SN37 |
| Panel | Loop cameras / Cameras off / Beams off | Hold SN22 / SN23 |
| Fault | Trip cooling | Hold SN25 |
Panel options: the nearest unused action shows; repeated interact cycles them (S4 checks the prompt system can show one at a time; if not, three separate panel points).

## 9. Build plan (S1-S4)
| Step | New files | Unit tests | seclab contents | e2e checks (scripts/e2e-seclab.mjs) |
| --- | --- | --- | --- | --- |
| S1 cameras and desk | `src/config/security.ts`; `src/security/data.ts` (types, JSON parse and validation for every kind); `camera.ts` (sweep yaw, frame test, meter via `sightRate` / `stepMeter`); `desk.ts` (manned test, event log, panel flags, faults); `securitySystem.ts` (wiring: rays, enemy calls); `securityView.ts` (instanced housings, LEDs, monitors); `src/world/maps/seclab.ts` + `seclab.security.json` | data validation; sweep timing (SN13-15); frame test; derived detection times SN08-10 within 10%; unmanned log and review; loop / off flags; fault reset | Lit pad and dark pad under a fixed camera; a sweeping camera; desk with operator; panel; a fault point; a guard to dispatch | lit pad detected within SN08 + 0.5 s; dark pad not in 10 s; sweep gap; shot camera offline and a guard dispatched; desk emptied -> no dispatch, review on return; loop -> no detection |
| S2 access | `src/security/access.ts` (cards, readers, clones, revoke); `mantrap.ts` (interlock machine); `iris.ts` (enrolled, conscious, reach) | grant / refuse; unlock timer; card on takedown; clone from a held guard; revoke; interlock never opens both; card-then-iris window; knocked-out person refused | Reader door; card in a drawer; a guard with a card to take down and one to grab and clone; mantrap with card and iris; an enrolled guard to grab | swipe opens, relocks; refuse leaves locked; takedown gives the card; clone from a grabbed guard opens the door; mantrap interlock; grab + scan opens; unconscious refused |
| S3 beams and PIR | `src/security/beam.ts` (segment vs capsule, break timer); `pir.ts` (range, speed, timer) | capsule vs high beam standing / crouched; low beam walking / jumping; SN42 heights rejected by validation; PIR at each gear (SN51) | High beam, low beam, a stacked pair, the panel; PIR lamp over a corridor with a switch | crouch passes high beam; walk breaks low beam, jump clears it; panel off disarms; PIR on at gear 2, off at gear 1; switch and shot lamp stop it |
| S4 co-op, controls, facts | `sec` and `secEv` in `src/net/protocol.ts` (+ `parseMessage`, `tests/net.test.ts`); host send / client mirror in the net layer; prompt words; facts rows for SN numbers in 00-facts.md and the level-design section 12 rows (with Michael's OK) | message parse and clamps; client mirror from a literal snapshot | Same seclab, `?net=local` | 2 and 4 players: a client breaks a beam and the host dispatches; client swipe; client sees camera yaw within 5 deg of the host |

All S1-S3 logic is Babylon-free with Vitest tests. Each step runs `npm run check`, `npm run build`, `npm run e2e:quick`; GPU or Phone checks are "pending PC run" from cloud sessions.

## 10. Existing functions used
| Function | File | Used for |
| --- | --- | --- |
| `sightRate`, `stepMeter`, `lightFactor` (via sightRate), `PERCEPTION.suspicious` | src/ai/perception.ts | Camera detection meter |
| `SENSITIVITY.unaware`, `ALERT.callIn` | src/ai/alertState.ts | Camera sensitivity; dispatch delay |
| `Enemy.notice(x, z, level)` | src/ai/enemy.ts | Camera suspicious stage; PIR light on |
| `Enemy.searchAt(x, z, revive)` | src/ai/enemy.ts | Every dispatch; bodies on feeds |
| `Enemy.alert()` | src/ai/enemy.ts | Camera full sighting on the operator |
| `EnemyManager.alarms`, `assignAlarm` -> `raiseAlarm` -> `onAlarm`, `reinforce` | src/ai/enemyManager.ts, src/ai/alarm.ts (`AlarmPanel`, `ALARM`) | The one alarm, through the desk panel |
| `EnemyManager.lightsOut(x, z)` | src/ai/enemyManager.ts | Shot camera (manned), shot PIR lamp |
| `EnemyManager.hear(pos, radius)` | src/ai/enemyManager.ts | Trip noise (SN28) |
| `EnemyManager.onBodyFound` | src/ai/enemyManager.ts | Card revoke |
| `EnemyManager.enemies`, `EnemyManager.RADIO` | src/ai/enemyManager.ts | Nearest calm guard |
| `LightRegistry.setOn`, `setGroup`, `destroy`, `disrupt` | src/world/lights.ts | PIR lamps, circuits |
| `Doors.open`, `Doors.setOpen`, `Door.locked` | src/world/doors.ts | Readers, mantrap |
| `Interactables` (`kind`, `label`, `holdTime`, `reach`, `holdNoise`, `onUse`) | src/game/interactables.ts | Every player action |
| `GRAB`, `GRAB_KINDS` | src/game/takedown.ts | Iris and held card holder |
| `GADGETS.emp` | src/game/gadgets.ts | EMP on cameras |

## 11. ASK items
- ASK: `raiseAlarm` and `assignAlarm` are private; the path is `Enemy.alert()` on the operator, then the existing 2 Hz assignment. S1 confirms the operator is the nearest alerted guard to the desk panel; if not, it stops and reports.
- ASK: is there a public ray helper for the chest / head / hips test, or is it inside `Enemy.perceive`? S1 greps; if private, it stops and reports.
- ASK: the night duty engineer (civilian) must be grabbable by the existing grab (`GRAB_KINDS` 'behind' works on enemies). No civilian code was seen except a mention in src/ai/factions.ts. S2 / S5 decide how the civilian exists; until then iris tests use an enrolled guard.
- ASK: `InteractKind` is a closed list; S1-S2 use existing kinds with `label` and `onUse` (terminal for desk / panel / fault, door for readers and iris). If that breaks prompts or co-op `items`, stop and report.
- ASK: the HUD awareness arcs (`ui/hud/awareness.ts`) are fed by enemies; S1 checks they can take a camera as a source without a new HUD system.
- ASK: how shots reach non-light targets (`PlayerWeapons.onRay` -> `StealthSystems.shotRay`); S1 adds the camera box test beside `lightOnRay` only if the hook is open to it.

## 12. Questions for Michael (answered 2026-10-10)
1. Shot camera: a manned desk sends a guard after video loss (2.1).
2. Cloning: hold a cloner to a grabbed guard's card (2.3); a downed guard's card comes with the takedown (Q3).
3. Keycards on guards: taken automatically on any takedown of the holder (2.3).
4. Iris enrolment: the night duty engineer and the duty manager (no civilian system yet).
5. Cameras or beams switched off at the panel: noticed SN24 after the desk is next manned; a guard is sent (2.2).

Self-check: 6 systems, each with 2+ counters (section 4); only the existing functions in section 10; every number in section 5 or quoted from 00-facts.md / the code; no instant fail (worst case is the existing alarm and reinforcements); line count under 320.

## Revision log
| Date | Fix # | What changed | Status |
| --- | --- | --- | --- |
| 2026-10-10 | 1 | Iris enrols the night duty engineer and the duty manager (g-s2-manager): section 2.4, section 6 example enrolled list, section 12 answer 4 | done |
| 2026-10-10 | 2 | progress.md Decisions by Michael wording updated | done |

Downstream: S2 must recheck iris tests (the enrolled guard can be g-s2-manager); P04S must recheck the iris `enrolled` list; S4 must recheck iris sync.
