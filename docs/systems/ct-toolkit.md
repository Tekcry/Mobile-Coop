# Chaos Theory toolkit - spec (V0)
Status: APPROVED (Michael, 2026-10-11)

Michael's decision (2026-10-11): the engine gets the full Chaos Theory toolkit; each mission offers only the tools that suit it, through a mission kit (section 4). This file is the spec the build sessions V1-V3 follow (section 7). V1-V3 build only Dead Line's kit (Michael, 2026-10-11); the light disruptor (3.6), ring airfoil (3.8) and knife (3.10) keep their specs here for later missions (docs/backlog.md items 22-24). Splinter Cell: Chaos Theory is a design reference only; no names, art or text from it.

## 1. Rules for every tool
- **Realism.** Each tool is real equipment used the way a real operative would use it. Real-world facts are tagged `(general knowledge)`; where unsure the text says so. Where no real device exists, the section says so plainly (3.6).
- **Ghost rule** (RULES.md section 1). Each tool is tagged **ghost-safe** (never knocks anyone down, grabs anyone or raises an alarm; a guard may investigate a noise, a light or a fault as long as nobody sees the player) or **louder only** (knocks down, grabs or alarms; never the only way past a control).
- **Detection.** No new detection model. Tools use what exists: guard sight through `Enemy.perceive` (light x stance x motion x exposure, F24), noise through `EnemyManager.hear(pos, radius)` (src/ai/enemyManager.ts:483), light changes through `EnemyManager.lightsOut(x, z)` (enemyManager.ts:258) and `LightRegistry.disrupt` (src/world/lights.ts:196), cameras through S0 2.1, dispatches through S0's dispatch rule (S0 section 2 header). Civilians use the same perception (bible 5.7).
- **Numbers.** Every number is `(TUNE)` (a proposal the build session puts in a new `src/config/tools.ts` and tunes) or carries its source id (F.. from 00-facts.md, SN.. from S0-security-spec.md section 5, or a code line). No existing tuning value in src/config changes.
- **Camera.** The camera fix (CAM, 2026-10-11) stays on for every tool: sphere casts head -> pivot -> shoulder -> camera, up / down probes, low-space framing under 1.9 m clear, near plane only while close (src/player/shoulderCamera.ts, src/player/cameraBounds.ts, src/config/camera.ts). Each tool lists only what it needs on top.
- **Co-op.** The host decides every outcome (lock open, hack result, camera jammed, person down). Clients send requests through the existing `use` message (S0 section 7) or the weapon / grenade path; the host checks reach (F16: 1.5 m height rule) and the kit (section 4). New body poses go into the `MoveState` mode enum (docs/ct-movement.md Phase 1: later phases add modes to this enum only).
- **Animation.** Every new clip meets the realism standard (bible 5.12.2); contact sheets are a PC run.

## 2. Inputs
Tools use existing inputs wherever possible. Bindings marked "proposal" are checked by the build session with grep in `src/input/keyBindings.ts` and `src/input/gamepadMapping.ts`; if one is taken, the session stops and asks Michael.

| Use | Desktop (keyboard and mouse) | Gamepad | Phone touch |
| --- | --- | --- | --- |
| Contextual use (pick, hack, cut, question, SWAT turn) | E (existing interact) | Y (existing) | Action button (existing) |
| Wall hug | E facing a high wall with nothing else in reach, or a move key held into the wall | Y, or left stick held into the wall | Action button "Wall", or move stick held into the wall |
| Optic cable (new action `optic`) | F (proposal) | R3 (proposal) | "Optic" chip beside the action button, shown only in reach |
| Wheel tools (jammer, disruptor, shocker, airfoil) | Tab wheel to select, G hold to aim, release to fire (jammer: fires while held) | D-pad left hold (wheel), D-pad right hold / release (existing `grenade`) | Existing wheel and gadget button |
| Lockpick minigame | Mouse moves the pick round a dial (A / D also turn it) | Left stick angle | Drag a finger round the dial |
| Hack minigame | Left click (proposal) locks a column | A (proposal) | Tap the column |
| Leave a tool | A move key away (proposal) | B (proposal) or stick away | Back chip or move stick away |

Lockpick and hacking are minigames only, with no hold alternative (Michael, 2026-10-11).

Contextual priority (docs/ct-movement.md Controls): takedown > co-op team move > CT move > traversal > interact > wall hug. The wall hug is last so it never steals a mantle, a door or a pickup.

## 3. Tools

### 3.1 Wall hug (back to the wall)
| Item | Spec |
| --- | --- |
| Fiction | Moving with the back flat to a wall keeps the body's outline small, and a corner is cleared a slice at a time by leaning out a little at a time ("slicing the pie") (general knowledge). Bible 4 and 5.3: back-to-wall replaces `src/cover`. |
| Works on | Any wall or object face at least 1.6 m tall (`HIGH_MIN`, src/cover/coverData.ts:58) and 0.5 m long (`MIN_FACE`, coverData.ts:60): walls, closed doors, racks, plant, parked vans. Edges: outside corners, door frames of open doorways, rack ends. Not: chain-link fences (see-through), glass (guards see through it as now), inside ducts and crawl voids under 1.5 m clear (F32). Standing and crouched versions. |
| Controls | Section 2. Slide: move along the wall. Peek: keep pushing past an edge. Lean out to aim: aim at an edge. SWAT turn: use at a doorway gap. Corner takedown: the existing takedown input when a guard walks round the corner. Leave: pull away. |
| States and timing | Enter within 0.6 m (TUNE) of the face, settle to contact in 0.2 s (TUNE), no snap from further. Stick-into-wall entry after 0.35 s (TUNE). Slide at the current gear speed (F18). Peek swings the view 0.5 m (TUNE) past the edge in 0.25 s (TUNE). SWAT turn 0.6 s (TUNE) across gaps up to 2.0 m (TUNE). Corner takedown reach 1.8 (F17 ground). No uses or cooldown. |
| Noise and light | Footsteps as the current gear (F19: silent up to crouch 1.9 m/s, stand 1.45 m/s). No light. The body's light is the normal meter (F24). |
| Noticed by | Normal sight on the body. Peeking exposes only the head ray and leaning the head and chest rays (the existing exposure rays), so a peek is far slower to spot than standing in the open. Cameras the same (S0 2.1 exposure). |
| Security (S0) | PIR: sliding faster than SN51 (1.0 m/s) triggers it as walking does. Beams: the capsule is unchanged (F01), so a beam along a wall still breaks. No device effect. |
| Ghost rule | Ghost-safe (the corner takedown is a takedown: louder only). |
| Co-op | New `MoveState` mode `wall`, sub = side, stance, edge action (peek, lean, SWAT). Partners see the pose. The host checks the corner takedown as any takedown. |
| Camera | New `ATTACH_FRAMING` entry `wall` (src/config/camera.ts:101): shoulder on the open side, boom 1.8 (TUNE). Peek: the pivot moves past the edge; the CAM head -> pivot cast clamps it so the camera never ends up behind the hugged wall. Lean-aim uses the ADS boom (F23: 1.5). |

### 3.2 Optic cable
| Item | Spec |
| --- | --- |
| Fiction | An under-door camera: a thin rigid or flexible fibre-optic or camera probe fed under a door or through a gap, with a small screen, used by police and military entry teams (general knowledge). |
| Works on | Doors with a gap under the leaf (most internal doors have one; general knowledge). Floor hatches in the raised floor (fed through the hatch edge), ceiling access panels (through the panel edge), vent grilles (between the slats), the top of the roof cooling shaft (down through the grille). Not: doors with seals (`seal: true`: rooms protected by gas suppression need sealed doors and often have drop seals, general knowledge, so the gas room, the data hall doors and the mantrap doors refuse with "Sealed"); solid walls; windows (look through them). |
| Controls | Section 2 (`optic`). In the view: look stick / mouse turns the tip; night vision toggles as usual; ping (existing) marks what the tip sees. Leave with the leave input. |
| States and timing | Reach: within 1.0 m (TUNE) of the door, hatch or grille, crouched. Feed in 1.2 s (TUNE), out 0.6 s (TUNE). Tip yaw +-75 deg (TUNE), pitch -10 to +60 deg (TUNE), field of view 100 deg (TUNE). Tip 0.3 m (TUNE) past the far face, 0.05 m (TUNE) above the floor for doors; 0.3 m (TUNE) into the space for hatches, panels and grilles. Unlimited uses. |
| Noise and light | Silent. No light. The player kneels: crouched and still (the stillness and crouch multipliers behind SN09). |
| Noticed by | The tip is not a body and is never perceived. The player's own body on the near side is perceived as normal. |
| Security (S0) | With night vision on, the view shows beam lines behind the door (S0 3: beams show only in night vision). Cameras, PIR and readers behind the door are seen, not affected. |
| Ghost rule | Ghost-safe. |
| Co-op | `MoveState` mode `optic` (sub: door, hatch, panel, grille) so partners see the kneel and the cable. The view is local. Pings from the view go to the team (existing ping). |
| Camera | The camera leaves the body and sits at the tip; the scene renders once (no second camera). The tool places the tip only after a sphere cast (F23 padding 0.16) from the gap to the tip point is clear; otherwise "No gap". Near plane at its minimum, the CAM chain is off while in the view, and the normal camera eases back in on leaving. A round vignette and a grain overlay mark the view (render only). |

### 3.3 Lockpick
| Item | Spec |
| --- | --- |
| Fiction | A pick and a tension wrench: the wrench turns the plug slightly while the pick sets each pin at the shear line (general knowledge). Wafer locks (lockers, cabinets, desk drawers, most car doors) are easier than pin-tumbler locks (general knowledge). High-security cylinders resist picking (general knowledge). |
| Works on | Mechanical keyed locks: lockers, cupboards, desk drawers, filing cabinets, key cabinets, rack doors, cage padlocks, office doors with a sash lock, car doors. Never on card readers, PIN keypads, electronic key safes, iris doors or the mantrap. A reader door's key override cylinder is high-security and refuses ("Too complex"). |
| Controls | Contextual use on a locked item: "Pick lock". Minigame (section 2): turn the pick to find each pin's sweet spot; the pin shivers more as the pick nears it; hold in the spot to set it. |
| States and timing | Tiers (map data `lock`): `wafer` 2 pins (TUNE), `pin` 4 pins (TUNE), `high` refused. Sweet spot 20 deg wide (TUNE), held 0.4 s (TUNE) per pin. Expected time: wafer about 5 s, pin about 12 s (TUNE). Slip (turning hard past the spot): lose one set pin. Set pins kept 10 s (TUNE) after leaving. Picks never run out. |
| Noise and light | Silent while picking. A slip clicks: noise 2 m (TUNE) via `hear`. No light. |
| Noticed by | The player is crouched and still (SN09 terms) at the lock; seen as any crouched body. A lock left open is a changed object; once the bible's "door left open" rule (5.7, "add") exists, an opened door counts. |
| Security (S0) | None on S0 devices. Cars: if the car is alarmed (map data `alarm: true`), opening a picked door sets the car alarm (on many cars opening a locked door without the fob sets it off; this varies by model, general knowledge); that is louder. Unalarmed cars open quietly. |
| Ghost rule | Ghost-safe (an alarmed car's door is louder only). |
| Co-op | The minigame runs on the player's own machine; the result goes to the host with `use` (kind `pick`). The host accepts only after the tier's minimum time (TUNE: 70% of the expected time) and opens the lock; lock state syncs (doors through `doors`, containers in a new `locks` list). Partners see the kneel pose (`MoveState` sub-state of `use`). |
| Camera | Close framing: boom 1.2 (TUNE), pivot at the hands; the CAM chain still runs (lockers in corners). The dial overlay sits low on the screen so the corridor stays in view. |

### 3.4 Hacking at terminals
| Item | Spec |
| --- | --- |
| Fiction | A pocket keystroke-injection device or a network implant plugged into a workstation's USB or network port, as penetration testers use (general knowledge). At a keypad: the housing is opened and a bypass tool is put on its wiring; opening the housing trips its tamper switch, which the alarm system logs (general knowledge). |
| Works on | Workstations and terminals listed in map data with `hack` (records PC, access control PC, CCTV recorder, BMS PC) and PIN keypads. Each lists the services it gives (section 5): read an intel flag, unlock a named door for a time, trip a named fault. A hack gives only what the mission data lists, so it never skips a mission control by accident. Never: card readers, iris, the mantrap, the alarm panel (it has its own holds, SN22-SN23). |
| Controls | Contextual use: "Hack". Minigame (section 2): columns of changing characters; each column briefly shows the right value; lock it while it shows. |
| States and timing | Terminal 4 columns, keypad 3 (TUNE). Window 20 s (TUNE). Each value shows 0.5 s every 1.5 s (TUNE); a wrong lock costs 2 s (TUNE). Keypad: open the housing first, hold 2.0 s (TUNE). Failure (window out): locked out 30 s (TUNE). Unlimited tries. |
| Noise and light | Typing: noise 1.5 m (TUNE). Opening a keypad housing: the existing hold noise (F19: 4 m, a pulse every 0.5 s). A terminal with a screen lamp in play data lights the player as any lamp does; hacking adds no light. |
| Noticed by | The body as any crouched or standing still body at the terminal. Failure and keypad tamper are security events (below). |
| Security (S0) | Failure ("account locked") and keypad tamper each log an event with a position on the desk, as S0 2.1's unmanned rule logs camera events: a manned desk dispatches a guard (S0 dispatch, an investigation, not an alarm). Until S1 Part B builds the desk, V2 raises the event through one new hook that S1 Part B wires up. |
| Ghost rule | Ghost-safe (a dispatch is an investigation; it must find nobody). |
| Co-op | Minigame local; result to the host with `use` (kind `hack`), minimum time as 3.3. The host applies the service (door unlock through `doors`, intel flag to the team: RULES section 1, intel is shared). |
| Camera | Close framing as 3.3, pivot at the screen or keypad. The minigame overlay leaves the edges of the view clear. |

### 3.5 Camera jammer
| Item | Spec |
| --- | --- |
| Fiction | A handheld infrared dazzler: a strong infrared LED beam aimed at a camera washes out its picture; many CCTV cameras see infrared and people do not (general knowledge). Radio jamming would not stop wired IP cameras, so the tool is optical (general knowledge). |
| Works on | S0 CCTV cameras (fixed and sweep) within range and in line of sight. Not: PIR sensors, beam receivers (they filter steady infrared; general knowledge, not certain), people, lamps. |
| Controls | Select on the wheel; hold the gadget input to raise and aim, jamming while held and on target; release to stop. |
| States and timing | Battery 10 s (TUNE); recharges fully in 20 s (TUNE) only while not in use. Range 15 m (TUNE; under camera range SN03 18 m, so a far camera cannot be jammed from where it sees you). On target = aim within 5 deg (TUNE) of the housing (SN05). Jammed camera: detection meter stops rising and falls by `stepMeter`; frame tests skipped. Jam continuous for more than 4 s (TUNE): the camera logs an "image fault" event at its position. |
| Noise and light | Silent. Its light is infrared: not in the gameplay light field, never seen by guards. The beam shows in night vision for every player (like beam lines, S0 3). |
| Noticed by | Guards and civilians see the body as normal; the beam is invisible to them. Cameras: as above. |
| Security (S0) | New camera mode `jammed` beside `online / looped / off / destroyed` (S0 2.1 State). Image fault events: manned desk dispatches a guard to the camera (S0 dispatch); unmanned, logged (S0 2.1). Looped or off cameras need no jamming. |
| Ghost rule | Ghost-safe (a fault dispatch is an investigation). |
| Co-op | The client sends jam start / stop with the camera id; the host checks range, line and battery (battery simulated on both, host wins) and sets `jammed`. The mode syncs in S4's `sec` message (S4 adds `jammed` to its camera modes). |
| Camera | Existing ADS framing (F23). No extra. |

### 3.6 Light disruptor
Not built in V3 (backlog item 22).
| Item | Spec |
| --- | --- |
| Fiction | No fielded real device does this (general knowledge): a pistol attachment that switches off a lamp or a camera for a few seconds is near-future fiction. A later mission decides whether it fits. |
| Works on | Lamps (including PIR lamps, S0 2.6 "Off") and S0 cameras. Not: readers, keypads, iris, beams, people. |
| Controls | Select on the wheel; hold the gadget input to aim with the sidearm, release to fire. |
| States and timing | One shot, then recharge 6 s (TUNE). Range 30 m (TUNE). Lamp: `LightRegistry.disrupt` on the hit lamp for 10 s (TUNE), radius 0.5 m (TUNE). Camera: offline 10 s (TUNE) with no video-loss event, as S0's EMP rule. |
| Noise and light | Shot silent (TUNE: 0 m). The lamp goes out through the light registry, so the screen, the meter and guards agree (light parity, bible 5.1). |
| Noticed by | Guards with the lamp in view respond as to a light out (bible L9, `lightsOut`): an investigation. |
| Security (S0) | Camera offline as above; PIR lamp stops while disrupted. |
| Ghost rule | Ghost-safe. |
| Co-op | Shot through the existing weapon path; the host applies `disrupt`; light state syncs (bible L10). |
| Camera | Existing ADS framing (F23: boom 1.5). |

### 3.7 Sticky shocker
| Item | Spec |
| --- | --- |
| Fiction | A wireless electroshock projectile fired from a 12-gauge launcher, which barbs onto the target and delivers a shock (a real less-lethal round, general knowledge). Fired from the multi-tool launcher under the primary (bible 5.6). |
| Works on | People (guards; civilians count as a rating penalty, bible 5.7). Not devices. |
| Controls | Select on the wheel; hold the gadget input to aim with the primary, release to fire. |
| States and timing | Rounds per mission from the kit (Dead Line 2, TUNE). Range 20 m (TUNE). Direct hit only. Hit: knocked out, the same result as a non-lethal takedown. Raise: the primary's draw time (bible 5.6, about 0.4 s). |
| Noise and light | Launch 6 m (TUNE) via `hear`; the fall uses the existing knock-out path. A visible spark on hit (render only). |
| Noticed by | Guards who see the target fall, or the body later, react by the existing body rules. |
| Security (S0) | A body in a lit camera frame is seen as S0 2.1 (SN12). A card holder knocked out drops his card to the player as any takedown (S0 2.3). |
| Ghost rule | Louder only. |
| Co-op | Projectile through the existing weapon path; the host applies the knock-out. |
| Camera | Existing ADS framing (F23). |

### 3.8 Ring airfoil
Not built in V3 (backlog item 23).
| Item | Spec |
| --- | --- |
| Fiction | A ring-shaped soft projectile from a launcher that knocks a person off balance (the ring airfoil projectile was a real less-lethal round, general knowledge). Multi-tool launcher (bible 5.6). |
| Works on | People: a head hit on an unaware person knocks them out; any other hit staggers. Surfaces: a hit makes an impact noise (a lure). Not devices or lamps. |
| Controls | As 3.7. |
| States and timing | Rounds from the kit (TUNE: 3). Range 25 m (TUNE). Stagger 1 s (TUNE; the bible's elbow-strike stagger is about 1 s, 5.4). |
| Noise and light | Launch 4 m (TUNE). Impact on a surface 8 m (TUNE) via `hear` at the impact point. No light. |
| Noticed by | A staggered guard is aware of an attack (alerts by the existing rules). Guards hear the impact and investigate it. |
| Security (S0) | None on devices. |
| Ghost rule | Louder only on a person. A shot into a wall as a lure is ghost-safe, like the noisemaker. |
| Co-op | As 3.7. |
| Camera | Existing ADS framing. |

### 3.9 Interrogation
| Item | Spec |
| --- | --- |
| Fiction | A held person is quietly pressed for a code, a name or a route. Short and threatening; no torture is shown. |
| Works on | A person held by the existing grab (`GRAB`, src/game/takedown.ts:53): guards, and civilians once S6 builds them. Each person has 1-3 subtitled lines (bible 5.4) from mission data; a line can set an intel flag (a PIN, the cage number, who is iris-enrolled, a patrol). |
| Controls | While grabbing: contextual use "Question"; each press plays the next line. Then the existing grab choices (knock out, kill, human shield, drag; bible 5.4). |
| States and timing | Each line 3 s (TUNE). A person with no lines answers "Nothing" once. Not offered while a guard sees the grab (the existing human-shield rules apply). |
| Noise and light | No noise beyond the existing grab. No light. |
| Noticed by | As the existing grab. |
| Security (S0) | Works on a card holder or an enrolled person while held, alongside "Clone card" (SN32) and "Scan eye" (SN37). |
| Ghost rule | Louder only (it needs a grab). |
| Co-op | Request through `use` (kind `question`); the host plays the line; subtitles and the intel flag go to the whole team. |
| Camera | The grab camera, pushed in to boom 1.6 (TUNE) and turned so both faces show. |

### 3.10 Knife
Not built in V3 (backlog item 24). Lethal takedowns stay as they are without it.
| Item | Spec |
| --- | --- |
| Fiction | A fixed-blade knife: a close-quarters weapon and a cutting tool for tarps, fabric, plastic sheeting and cable ties (general knowledge). |
| Works on | Lethal close takedowns (the existing hold on the takedown input, bible 5.4); objects with `cut: true` in map data (tarps, sheeting, fabric screens, cable-tied panels). Not: fences, locks, cables that carry power or data. |
| Controls | Takedown: hold the takedown input (existing). Cut: contextual use "Cut". |
| States and timing | Takedown: 1-1.5 s press to down (bible 5.4). Cut: hold 1.5 s (TUNE); the cut object becomes passable for good. No uses. |
| Noise and light | Takedown: existing takedown noise. Cut: 1 m (TUNE). No light. |
| Noticed by | Takedown: existing body rules. A cut object is a changed object (bible 5.7 "door left open" rule, once it exists). |
| Security (S0) | A card holder taken down gives his card (S0 2.3). |
| Ghost rule | Takedown louder only. Cutting is ghost-safe. |
| Co-op | Takedown as now (host approves). Cut through `use` (kind `cut`); object state syncs. |
| Camera | Takedown camera as now. Cut: close framing as 3.3. |

## 4. Mission kit
- **Tool ids.** New pure `src/game/tools.ts`: `ToolId = 'wallHug' | 'optic' | 'lockpick' | 'hack' | 'jammer' | 'shocker' | 'interrogate'` (the built tools; `disruptor`, `airfoil` and `knife` join when a later session builds them) and a `TOOLS` table (name, use: `verb` / `wheel` / `launcher`, ghost tag, battery or rounds).
- **Mission data.** `MissionDef` (src/game/missions.ts:49) gets an optional `kit`: `{ tools: ToolId[], gadgets: { <GadgetId>: count }, rounds: { shocker?: n, airfoil?: n } }`. `validateMissions` throws on an unknown id (as it does on a bad objective type) and clamps counts to `GADGETS[id].max` (src/game/gadgets.ts). `wallHug` is always added: it is a movement (bible 4 P4), not equipment.
- **No kit** (sandbox, training, existing missions): every tool and every gadget's normal carry, so current content does not change.
- **At run time.** `GameState` builds `GadgetInventory` from the kit (gadgets not in the kit carry 0) and a kit set that every tool checks before it offers a prompt. A tool not in the kit shows no prompt, does not appear on the wheel, has no HUD battery and its input does nothing.
- **Loadout screen** (src/ui/screens/loadoutScreen.ts). In a mission with a kit: the gadgets page lists only kit gadgets; a read-only "Mission kit" panel lists the tools with rounds and batteries (every player carries the whole kit, as in Chaos Theory); a preset naming a gadget outside the kit falls back to the kit's first gadget. Weapons stay under the bible's loadout kits (5.6).
- **Wheel.** Kit gadgets plus the kit's wheel tools (jammer and shocker now; disruptor and airfoil when built); `wheelSlot(x, y, slots)` already takes the slot count.
- **Co-op.** Every peer reads the same mission definition; the host rejects tool requests outside the kit.
- **Debug.** `?kit=all` gives the full toolkit in any mode (tests and the tool lab map).

## 5. Map data the tools read
Proposed fields; P06 adds them to the play schema (docs/kestrel/schema.md) and P09 fixes them in the build contract.
| Field | On | Values | Used by |
| --- | --- | --- | --- |
| `lock` | doors, containers (lockers, cupboards, drawers, key cabinet, rack doors, cage padlocks, car doors) | `none`, `reader` (S0), `wafer`, `pin`, `high` | 3.3 |
| `seal` | doors | `true` refuses the optic | 3.2 |
| `optic` | hatches, ceiling panels, grilles, shaft tops | `true`, with a tip point the builder checks | 3.2 |
| `alarm` | cars | `true` / `false` | 3.3 |
| `hack` | terminals, keypads | `{ tier: terminal or keypad, services: [ "intel:<flag>", "unlock:<doorId>", "fault:<faultId>" ] }` | 3.4 |
| `cut` | tarps, sheeting, screens | `true` | 3.10 |
| `lines` | mission data per guard or civilian id | 1-3 lines, optional `reveals: <flag>` | 3.9 |
Every placed item keeps a `reason` (RULES section 5): why a real site has that lock, terminal or tarp there.

## 6. Dead Line's kit (approved by Michael, 2026-10-11)
Judged against the control ladder and the ghost rule (RULES.md section 1). The kit must give every critical-path control a no-contact answer without letting a tool skip a control the mission depends on.
| Tool | Kit | Why |
| --- | --- | --- |
| Wall hug | In (always) | Corridors, door frames and rack ends on both buildings; the base of ghost movement. |
| Optic cable | In | Many closed doors, the raised-floor hatches into level U, the corridor ceiling voids and the roof shaft top: look before committing. Sealed doors (gas room, data hall, mantrap) refuse it, so the secure zone keeps its scouting cost (gallery, hatch, shaft). Ghost-safe. |
| Lockpick | In | Track B's no-contact credential: the technician's locker and the car door (badge in the glovebox; the key in the door stays the silent way, an alarmed car's picked door is louder). Card doors, the key safe, the mantrap and iris refuse it. Recommendation to P06: Pell's cage lock `high` (or a code lock) so the cage number and key safe code stay knowledge gates. |
| Hacking | In | Objective 4 is a records lookup: the records PC is the realistic place to read the cage number and the key safe code. Keypads (the B-tier PIN) get a hack with a cost (tamper dispatch) beside the PIN-on-a-note answer. Services are listed per terminal so no hack loops the cameras or opens the secure zone (objective 3 stays at the security room). |
| Camera jammer | In | Track B crosses cameras before Track A blinds the security room; a short jam is the ghost answer there, a long one gets a guard sent. Battery stops it replacing objective 3. |
| Light disruptor | Out | No real equivalent (3.6). Bible L8's two ways to change light are already met by switches, breakable lamps, the fuse boxes and EMP. |
| Sticky shocker | In (2 rounds, TUNE) | One non-lethal ranged recovery tool for players who get spotted; louder only, rated. |
| Ring airfoil | Out | Same role as the shocker and the elbow strike; one launcher round type keeps the slice small. |
| Interrogation | In | The grab is already in Dead Line as a louder answer (iris, clone card). Questioning gives the louder answer to the knowledge gates (PIN, cage number, who is enrolled). |
| Knife | Out | No cuttable element is planned on the campus, and lethal takedowns exist without it. Revisit if P06 gives a real reason for one (for example dust sheeting on a fit-out). |
Existing gadgets in the kit: noisemaker, sticky cam, EMP and sleeping gas at their normal carry (`GADGETS`, src/game/gadgets.ts:33-37). Out: frag and mine (lethal explosives on a site with civilians), flashbang (loud, overlaps gas), tri-rotor (parked).

## 7. Build plan (V1-V3)
Preconditions for each: V0 APPROVED and CAM APPROVED. RULES.md section 11 exception (Michael, 2026-10-11, recorded in progress.md): V1-V3 may change the player controller, the camera, the grab and takedown code, add `src/config/tools.ts` and the `toollab` debug map; no existing tuning value changes. All logic is pure and Babylon-free with Vitest tests; constants go in a new `src/config/tools.ts`. Each session runs `timeout 900 npm run check`, `timeout 900 npm run build`, `timeout 1500 npm run e2e:quick`; GPU, contact sheets and performance are "pending PC run" from cloud sessions. New e2e suite `scripts/e2e-toolkit.mjs` (REQUIRED, COVERS the tool files in scripts/run-e2e.mjs), extended by each session; every new touch prompt is added to `scripts/e2e-touch.mjs`. Test space: a debug map `toollab` (MAPS only, modes [], like `seclab`). Each session may run as Part A and Part B if it nears its budget.

| Session | Builds | Files (new / changed) | Unit tests | e2e (e2e-toolkit) | Michael tries |
| --- | --- | --- | --- | --- | --- |
| V1 | Wall hug (slide, peek, door-frame peek, lean-aim, SWAT turn, corner takedown); optic cable (doors, hatches, panels, grilles, shaft top); snap cover in `src/cover` replaced and deleted, with its tests and e2e checks (bible Phase 3; Michael, 2026-10-11) | New `src/player/wallHug.ts` (pure face and edge finder), `wallHugController.ts`, `src/player/opticCable.ts` (pure tip placement), `src/config/tools.ts`, `src/world/maps/toollab.ts`. Changed: `src/net/moveState.ts` (modes `wall`, `optic`), `src/config/camera.ts` (`ATTACH_FRAMING.wall`), `src/player/shoulderCamera.ts` (tip pose), input files (`optic` action), `src/ui/prompts.ts` | face height and length rules; edge detection at corners and door frames; tip placement and refusal (sealed, no gap, wall behind); SWAT gap limit | enter only within 0.6 m; slide speed = gear; peek exposes the head only (guard meter slower than standing); SWAT turn crosses a doorway; optic view under a door shows a guard; sealed door refused; camera never behind the hugged wall (CAM checks); 2-player pose sync | Hug a corridor wall and peek both ways; SWAT turn across an open door; optic under a door, through a raised-floor hatch and a grille; same on the phone |
| V2 | Lockpick (tiers, minigame); hacking (terminals, keypads, services, failure); lock and hack map fields; the security event hook | New `src/game/lockpick.ts`, `src/game/hack.ts` (pure), `src/ui/hud/` minigame overlays, `locks` net list. Changed: `src/world/doors.ts` (`lock` tiers), interactables, `src/net/protocol.ts` (`use` kinds `pick`, `hack`) | pin model and sweet spot; slip; kept progress; minimum-time check; hack columns, wrong lock, lockout; services applied only from data; tamper and failure events | wafer locker opens; `high` and reader refused; slip noise heard by a guard at 2 m, not at 4 m; car alarm on an alarmed car only; hack reads an intel flag; failure locks out and logs an event; client pick accepted, too-fast pick rejected | Pick a locker, a door and a car on desktop, pad and phone; hack a terminal and a keypad; judge whether both minigames are fair on the phone |
| V3 | Mission kit (section 4); camera jammer; multi-tool launcher with the sticky shocker; interrogation. Not the disruptor, airfoil or knife (backlog 22-24) | New `src/game/tools.ts`, `src/game/jammer.ts` (pure battery), shocker rounds in the weapon data. Changed: `src/game/missions.ts` (`kit`, `validateMissions`), `src/game/gadgets.ts` callers, `loadoutScreen.ts`, wheel, `src/security/camera.ts` (`jammed`), `src/game/takedown.ts` (question) | kit validation and defaults; wheel and loadout filtering; battery drain and recharge; jam stops the meter; 4 s fault event; shocker outcome; interrogation lines and flags | kit hides out-of-kit prompts and wheel slots; jammer blinds a camera, battery runs out, long jam logs an event; shocker knocks out; question sets a flag for both players | Pick a mission with a kit and see the loadout; jam a sweeping camera; shock and question a guard in toollab |

Order: the handover order already reads "toolkit builds V1-V3 (all before B3)". V1, V2 and V3 run after P10 and must all be APPROVED before B3 starts, so B3 builds the map with the tools in hand. S1 Part B wires the hack and jammer events to the desk; S4 adds `jammed` to `sec`; S6's civilians get questioning through the grab.

## 8. Questions for Michael (answered 2026-10-11)
1. Dead Line's kit: approved as proposed.
2. Light disruptor, ring airfoil and knife: not built in V3; V3 builds only Dead Line's kit. Specs stay here; backlog items 22-24.
3. Snap cover: V1 replaces it with the wall hug and deletes it.
4. RULES.md section 11 exception: granted for V1-V3 as listed (section 7); it also brings the toolkit into the RULES.md section 2 scope.
5. Lockpick and hacking: minigames only, no hold alternative.

## 9. Self-check (V0)
- Every tool in section 3 has all ten rows (fiction, works on, controls, states and timing, noise and light, noticed by, security, ghost rule, co-op, camera): pass.
- Every number is (TUNE) or carries F.., SN.., a bible section or a code line: pass.
- Ghost-safe tools never knock down, grab or alarm; tools that do (corner takedown, shocker, airfoil on a person, interrogation, knife takedown, alarmed car) are louder only: pass.
- Under 400 lines: pass.
