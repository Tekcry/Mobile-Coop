# Chaos Theory toolkit - spec (V0)
Status: spec; built so far: the optic cable at doors (3.2, prototype: `player/opticCable.ts`, `game/opticSystem.ts`,
`config/tools.ts`), the partner's kneel and cable over the wire (MoveState mode `optic`, optic-coop) and the engine side
of hatches, panels, grilles and shaft tops (`OpticPoint`, `LevelBuilder.opticGap`, `OpticSystem.pickPoint`, optic-coop);
open: an input for the gaps (F is the co-op action: Michael's call, section 2), placing gaps on a map (no spec names
one), a bound ping input, the camera's ease back.
The rest is not built. Approved by Michael on 2026-10-11 for Kestrel's Mission 1 (Dead Line, the
Kestrel map), pistol secondary revision. Kestrel is paused until after the CT co-op research (G53), and CT's gadget and
attachment set is settled by that research (G76), so this set may change before V1 starts.

What still holds from the 2026-10-11 approval: the engine gets the CT toolkit and each mission offers only the tools
that suit it through a mission kit (section 4); jamming lamps and cameras belongs to the pistol, not to a kit (now
G152's held jammer, built: 3.5); lockpick and hacking are minigames only, with no hold alternative; the kit per mission
is chosen when that mission is planned (Dead Line's kit in section 6 is history); the ring airfoil (3.8) and knife
(3.10) keep their specs for later (docs/backlog.md items 23-24). Chaos Theory is a design reference only: no names, art or text from it (G5, G6).

Changed by later decisions:
- G37: the toolkit's own wall hug is cancelled; the CT back-to-wall (`docs/systems/movement.md`) is the only wall move.
  V1 keeps the optic cable.
- G97: at a door the optic cable is one choice of the CT door menu (open, stealth open, bash, optic cable).
- G23: interrogation is a choice of CT's grab menu (knock out, kill, interrogate).
- G96: bindings follow CT's pad layout as built, with the anim-rework's aim, holster and strike (input-and-loop.md);
  the proposals in section 2 are checked against the built binding table.
- loco M20 Q1: the SWAT turn and the lean-out aim are removed.
- G12: desktop only (no touch controls).
- G152: the pistol's secondary shot (one shot, then a recharge) became the held jammer, which is built (3.5).
- G134, G153: each mission issues the two players complementary kits, fixed per mission; nobody picks a loadout
  (section 4). G105's Stealth / Assault / Recommended presets are gone.
- G243: draw times are real-world ones (rifle 1.1 s, pistol 0.75 s; `weapons/drawState.ts`), replacing G103.

## 1. Rules for every tool
- **Realism.** Each tool is real equipment used the way a real operative would use it. Real-world facts are tagged
  `(general knowledge)`; where unsure the text says so. Where no real device exists, the section says so plainly (3.5).
- **Ghost rule** (docs/kestrel/RULES.md section 1). Each tool is tagged **ghost-safe** (never knocks anyone down, grabs
  anyone or raises an alarm; a guard may investigate a noise, a light or a fault as long as nobody sees the player) or
  **louder only** (knocks down, grabs or alarms; never the only way past a control).
- **Detection.** No new detection model. Tools use what exists: guard sight through `Enemy.perceive` (light x stance x
  motion x exposure, F24), noise through `EnemyManager.hear(pos, radius)`, light changes through `EnemyManager.lightsOut(x,
  z)` and `LightRegistry.disrupt`, cameras through S0 2.1, dispatches through S0's dispatch rule (S0 = Kestrel's security
  spec). Civilians use the same perception (bible 5.7).
- **Numbers.** Every number is `(TUNE)` (a proposal the build session puts in a new `src/config/tools.ts`) or carries its
  source id (F.. from Kestrel's 00-facts.md, SN.. from S0-security-spec.md section 5, or a code reference). All are
  starting values (G10). No existing tuning value in src/config changes.
- **Camera.** The camera safety chain stays on for every tool: sphere casts head -> pivot -> shoulder -> camera, up / down
  probes, low-space framing, near plane only while close (`player/shoulderCamera.ts`, `player/cameraBounds.ts`,
  `config/camera.ts`). Each tool lists only what it needs on top.
- **Co-op.** The host decides every outcome (lock open, hack result, camera disabled, person down). Clients send requests
  through the existing `use` message (S0 section 7) or the weapon / grenade path; the host checks reach (F16: 1.5 m height
  rule) and the kit (section 4). New body poses are appended to the `MoveState` mode list (`player/moveState.ts`).
- **Animation.** Every new clip meets the realism standard (bible 5.12.2); contact sheets are a PC run.

## 2. Inputs
Tools use existing inputs wherever possible. Every binding below is a proposal; the build session checks it against the
built binding table (input-and-loop.md) and with grep in `src/input/keyBindings.ts` and `src/input/gamepadMapping.ts`, and stops and asks Michael
if one is taken.

| Use | Keyboard and mouse | Gamepad |
| --- | --- | --- |
| Contextual use (pick, hack, cut, question) | E (existing interact) | Y (existing) |
| Optic cable | Door menu at a door (G97). (optic-coop M1, Michael 2026-10-24) At hatches, panels, grilles and shaft tops the same action menu at the gap: OPEN TRAP (only where a closed panel covers the gap) and OPTIC CABLE (`game/gapMenu.ts`); no new key | The same: A, the action menu at the door or gap |
| Ping (co-op; optic-coop M2, Michael 2026-10-24) | Middle mouse (`ping`, was free) | R3 (`ping`); R3 is also Zoom, by context (Michael 2026-10-24 ~14:55 "contextual"): aiming a scoped weapon R3 zooms (no ping), otherwise it pings (no zoom); an allowed pair, no conflict |
| Launcher rounds (shocker, airfoil) | Tab wheel to select, G hold to aim, release to fire | D-pad left hold (wheel), D-pad right hold / release (existing `grenade`) |
| Pistol jammer (G152, built; 3.5) | RMB aims the drawn pistol, F (Co-op) held on the target | LT aims the drawn pistol, RB (Co-op) held on the target |
| Lockpick minigame | Mouse moves the pick round a dial (A / D also turn it) | Left stick angle |
| Hack minigame | Left click (proposal) locks a column | A (proposal) |
| Leave a tool | A move key away (proposal) | B (proposal) or stick away |

No fire-mode input exists: `fireMode` is only semi / auto weapon data (`weapons/weaponDefs.ts`). The jammer uses the
Co-op button while the pistol is aimed (`GameState.pistolAim`).

Contextual priority (code, `GameState`): takedown > co-op team move > traversal > interact.

## 3. Tools

### 3.1 Wall hug
Cancelled (G37). The CT back-to-wall is the wall move; its peek and the corner takedown are in `docs/systems/movement.md`
and `docs/systems/takedowns.md`.

### 3.2 Optic cable
| Item | Spec |
| --- | --- |
| Fiction | An under-door camera: a thin rigid or flexible fibre-optic or camera probe fed under a door or through a gap, with a small screen, used by police and military entry teams (general knowledge). |
| Works on | Doors with a gap under the leaf (most internal doors have one; general knowledge). Floor hatches in the raised floor (fed through the hatch edge), ceiling access panels (through the panel edge), vent grilles (between the slats), the top of the roof cooling shaft (down through the grille). Not: doors with seals (`seal: true`: rooms protected by gas suppression need sealed doors and often have drop seals, general knowledge, so the gas room, the data hall doors and the mantrap doors refuse with "Sealed"); solid walls; windows (look through them). |
| Controls | Section 2 (the action menu: at a door the door set's OPTIC CABLE; optic-coop M1, at a gap OPEN TRAP where it opens, then OPTIC CABLE). In the view: look stick / mouse turns the tip; night vision toggles as usual; ping (existing) marks what the tip sees. Leave with the leave input. |
| States and timing | Reach: within 1.0 m (TUNE) of the door, hatch or grille, crouched. Feed in 1.2 s (TUNE), out 0.6 s (TUNE). Tip yaw +-75 deg (TUNE), pitch -10 to +60 deg (TUNE), field of view 100 deg (TUNE). Tip 0.3 m (TUNE) past the far face, 0.05 m (TUNE) above the floor for doors; 0.3 m (TUNE) into the space for hatches, panels and grilles. Unlimited uses. |
| Noise and light | Silent. No light. The player kneels: crouched and still (the stillness and crouch multipliers behind SN09). |
| Noticed by | The tip is not a body and is never perceived. The player's own body on the near side is perceived as normal. |
| Security (S0) | With night vision on, the view shows beam lines behind the door (S0 3: beams show only in night vision). Cameras, PIR and readers behind the door are seen, not affected. |
| Ghost rule | Ghost-safe. |
| Co-op | `MoveState` mode `optic` (sub: door, hatch, panel, grille) so partners see the kneel and the cable. The view is local. Pings from the view go to the team (existing ping). Built (optic-coop): `a` the door or gap index, `ph` the cable fed out; the partner kneels, the right hand on the feed point, a thin cable from the hand toward the tip (`opticPlaceOf`, `opticCableEnd`, the owner's own cable is the same); a shaft top sends sub grille. (M2) Ping on middle mouse / R3; from the view it casts from the tip from the view's first step (`OpticSystem.tipRay`). |
| Camera | The camera leaves the body and sits at the tip; the scene renders once (no second camera). The tool places the tip only after a sphere cast (F23 padding 0.16) from the gap to the tip point is clear; otherwise "No gap". Near plane at its minimum, the camera safety chain is off while in the view, and the normal camera eases back in on leaving. A round vignette and a grain overlay mark the view (render only). |

### 3.3 Lockpick
| Item | Spec |
| --- | --- |
| Fiction | A pick and a tension wrench: the wrench turns the plug slightly while the pick sets each pin at the shear line (general knowledge). Wafer locks (lockers, cabinets, desk drawers, most car doors) are easier than pin-tumbler locks (general knowledge). High-security cylinders resist picking (general knowledge). |
| Works on | Mechanical keyed locks: lockers, cupboards, desk drawers, filing cabinets, key cabinets, rack doors, cage padlocks, office doors with a sash lock, car doors. Never on card readers, PIN keypads, electronic key safes, iris doors or the mantrap. A reader door's key override cylinder is high-security and refuses ("Too complex"). |
| Controls | Contextual use on a locked item: "Pick lock". Minigame (section 2): turn the pick to find each pin's sweet spot; the pin shivers more as the pick nears it; hold in the spot to set it. |
| States and timing | Tiers (map data `lock`): `wafer` 2 pins (TUNE), `pin` 4 pins (TUNE), `high` refused. Sweet spot 20 deg wide (TUNE), held 0.4 s (TUNE) per pin. Expected time: wafer about 5 s, pin about 12 s (TUNE). Slip (turning hard past the spot): lose one set pin. Set pins kept 10 s (TUNE) after leaving. Picks never run out. |
| Noise and light | Silent while picking. A slip clicks: noise 2 m (TUNE) via `hear`. No light. |
| Noticed by | The player is crouched and still (SN09 terms) at the lock; seen as any crouched body. A lock left open is a changed object; guards notice doors left open that should be shut (G41, not built yet). |
| Security (S0) | None on S0 devices. Cars: if the car is alarmed (map data `alarm: true`), opening a picked door sets the car alarm (on many cars opening a locked door without the fob sets it off; this varies by model, general knowledge); that is louder. Unalarmed cars open quietly. |
| Ghost rule | Ghost-safe (an alarmed car's door is louder only). |
| Co-op | The minigame runs on the player's own machine; the result goes to the host with `use` (kind `pick`). The host accepts only after the tier's minimum time (TUNE: 70% of the expected time) and opens the lock; lock state syncs (doors through `doors`, containers in a new `locks` list). Partners see the kneel pose (`MoveState` sub-state of `use`). |
| Camera | Close framing: boom 1.2 (TUNE), pivot at the hands; the camera safety chain still runs. The dial overlay sits low on the screen so the corridor stays in view. |

### 3.4 Hacking at terminals
| Item | Spec |
| --- | --- |
| Fiction | A pocket keystroke-injection device or a network implant plugged into a workstation's USB or network port, as penetration testers use (general knowledge). At a keypad: the housing is opened and a bypass tool is put on its wiring; opening the housing trips its tamper switch, which the alarm system logs (general knowledge). |
| Works on | Workstations and terminals listed in map data with `hack` (records PC, access control PC, CCTV recorder, BMS PC) and PIN keypads. Each lists the services it gives (section 5): read an intel flag, unlock a named door for a time, trip a named fault. A hack gives only what the mission data lists, so it never skips a mission control by accident. Never: card readers, iris, the mantrap, the alarm panel (it has its own holds, SN22-SN23). |
| Controls | Contextual use: "Hack". Minigame (section 2): columns of changing characters; each column briefly shows the right value; lock it while it shows. |
| States and timing | Terminal 4 columns, keypad 3 (TUNE). Window 20 s (TUNE). Each value shows 0.5 s every 1.5 s (TUNE); a wrong lock costs 2 s (TUNE). Keypad: open the housing first, hold 2.0 s (TUNE). Failure (window out): locked out 30 s (TUNE). Unlimited tries. |
| Noise and light | Typing: noise 1.5 m (TUNE). Opening a keypad housing: the existing hold noise (F19: 4 m, a pulse every 0.5 s). A terminal with a screen lamp lights the player as any lamp does; hacking adds no light. |
| Noticed by | The body as any crouched or standing still body at the terminal. Failure and keypad tamper are security events (below). |
| Security (S0) | Failure ("account locked") and keypad tamper each log an event with a position on the desk, as S0 2.1's unmanned rule logs camera events: a manned desk dispatches a guard (an investigation, not an alarm). Until S1 Part B builds the desk, V2 raises the event through one new hook that S1 Part B wires up. |
| Ghost rule | Ghost-safe (a dispatch is an investigation; it must find nobody). |
| Co-op | Minigame local; result to the host with `use` (kind `hack`), minimum time as 3.3. The host applies the service (door unlock through `doors`, intel flag to the team). |
| Camera | Close framing as 3.3, pivot at the screen or keypad. The minigame overlay leaves the edges of the view clear. |

### 3.5 Pistol jammer (G152, built)
Replaced by G152 (2026-10-18): the pistol's held jammer. Built in `game/jammer.ts` and `game/ctDevices.ts`; the live
spec is `docs/systems/gadgets.md` (Held pistol jammer). The 2026-10-11 secondary-shot spec (one shot at a lamp or
camera, then a 6 s recharge) is gone; it is in git history. What still holds from it: the jammer is part of the pistol
and always available, not a kit tool (section 4) and not on the wheel; lights and electronics only, never people; no
fielded real device does this, it is near-future fiction (general knowledge). Cameras see by their own IR (G298), so a
lamp put out never hides a player from a camera; only jamming the camera itself does.

### 3.6 Light disruptor
Merged into 3.5.

### 3.7 Shock round
| Item | Spec |
| --- | --- |
| Fiction | A wireless electroshock projectile fired from a 12-gauge launcher, which barbs onto the target and delivers a shock (a real less-lethal round, general knowledge). Fired from the rifle's launcher attachment (G76). |
| Works on | People (guards; civilians count as a rating penalty, bible 5.7). Not devices. |
| Controls | Select on the wheel; hold the gadget input to aim with the rifle, release to fire. |
| States and timing | Rounds per mission from the kit (Dead Line 2, TUNE). Range 20 m (TUNE). Direct hit only. Hit: knocked out, the same result as a non-lethal takedown. Raise: the rifle's draw time (G243, 1.1 s). |
| Noise and light | Launch 6 m (TUNE) via `hear`; the fall uses the existing knock-out path. A visible spark on hit (render only). |
| Noticed by | Guards who see the target fall, or the body later, react by the existing body rules. |
| Security (S0) | A body in a lit camera frame is seen as S0 2.1 (SN12). A card holder knocked out drops his card to the player as any takedown (S0 2.3). |
| Ghost rule | Louder only. |
| Co-op | Projectile through the existing weapon path; the host applies the knock-out. |
| Camera | Existing aim framing. |

### 3.8 Ring airfoil
Not built in V3 (backlog item 23). Whether it belongs is settled by the CT co-op research.
| Item | Spec |
| --- | --- |
| Fiction | A ring-shaped soft projectile from a launcher that knocks a person off balance (the ring airfoil projectile was a real less-lethal round, general knowledge). The rifle's launcher attachment. |
| Works on | People: a head hit on an unaware person knocks them out; any other hit staggers. Surfaces: a hit makes an impact noise (a lure). Not devices or lamps. |
| Controls | As 3.7. |
| States and timing | Rounds from the kit (TUNE: 3). Range 25 m (TUNE). Stagger 1 s (TUNE). |
| Noise and light | Launch 4 m (TUNE). Impact on a surface 8 m (TUNE) via `hear` at the impact point. No light. |
| Noticed by | A staggered guard is aware of an attack (alerts by the existing rules). Guards hear the impact and investigate it. |
| Security (S0) | None on devices. |
| Ghost rule | Louder only on a person. A shot into a wall as a lure is ghost-safe, like the noisemaker. |
| Co-op | As 3.7. |
| Camera | Existing aim framing. |

### 3.9 Interrogation
| Item | Spec |
| --- | --- |
| Fiction | A held person is quietly pressed for a code, a name or a route. Short and threatening; no torture is shown. |
| Works on | A person held by the existing grab (`GRAB`, `game/takedown.ts`): guards, and civilians once Kestrel's S6 builds them. Each person has 1-3 subtitled lines (bible 5.4) from mission data; a line can set an intel flag (a PIN, the cage number, who is iris-enrolled, a patrol). |
| Controls | While grabbing: "Interrogate" in the CT grab menu (G23); each press plays the next line. The other grab choices are knock out and kill. |
| States and timing | Each line 3 s (TUNE). A person with no lines answers "Nothing" once. Not offered while a guard sees the grab (the existing hostage rules apply). |
| Noise and light | No noise beyond the existing grab. No light. |
| Noticed by | As the existing grab. |
| Security (S0) | Works on a card holder or an enrolled person while held, alongside "Clone card" (SN32) and "Scan eye" (SN37). |
| Ghost rule | Louder only (it needs a grab). |
| Co-op | Request through `use` (kind `question`); the host plays the line; subtitles and the intel flag go to the whole team. |
| Camera | The grab camera, pushed in to boom 1.6 (TUNE) and turned so both faces show. |

### 3.10 Knife
Not built in V3 (backlog item 24). The knife is part of the CT kit (G76); its role is settled by the CT co-op research.
| Item | Spec |
| --- | --- |
| Fiction | A fixed-blade knife: a close-quarters weapon and a cutting tool for tarps, fabric, plastic sheeting and cable ties (general knowledge). |
| Works on | Lethal close takedowns (bible 5.4); objects with `cut: true` in map data (tarps, sheeting, fabric screens, cable-tied panels). Not: fences, locks, cables that carry power or data. |
| Controls | Takedown: the kill choice (G23). Cut: contextual use "Cut". |
| States and timing | Takedown: 1-1.5 s press to down (bible 5.4). Cut: hold 1.5 s (TUNE); the cut object becomes passable for good. No uses. |
| Noise and light | Takedown: existing takedown noise. Cut: 1 m (TUNE). No light. |
| Noticed by | Takedown: existing body rules. A cut object is a changed object. |
| Security (S0) | A card holder taken down gives his card (S0 2.3). |
| Ghost rule | Takedown louder only. Cutting is ghost-safe. |
| Co-op | Takedown as now (host approves). Cut through `use` (kind `cut`); object state syncs. |
| Camera | Takedown camera as now. Cut: close framing as 3.3. |

## 4. Mission kit
- **Tool ids.** New pure `src/game/tools.ts`: `ToolId = 'optic' | 'lockpick' | 'hack' | 'shocker' | 'interrogate'` (the
  built kit tools; `airfoil` and `knife` join when built) and a `TOOLS` table (name, use: `verb` / `wheel` / `launcher`,
  ghost tag, battery or rounds). The pistol jammer (3.5) is not a `ToolId`: it belongs to the pistol and is always
  available, in every mission and in no-kit modes.
- **Mission data.** `MissionDef` (`game/missions.ts`) gets an optional `kit`: `{ tools: ToolId[], gadgets: { <GadgetId>:
  count }, rounds: { shocker?: n, airfoil?: n } }`. `validateMissions` throws on an unknown id and clamps counts to
  `GADGETS[id].max` (`game/gadgets.ts`).
- **No kit** (Free Roam, the course, existing missions): every tool and every gadget's normal carry, so current content does
  not change.
- **At run time.** `GameState` builds `GadgetInventory` from the kit (gadgets not in the kit carry 0) and a kit set that
  every tool checks before it offers a prompt. A tool not in the kit shows no prompt, does not appear on the wheel, has no
  HUD battery and its input does nothing.
- **Loadout screen** (`ui/screens/loadoutScreen.ts`). In a mission with a kit: the gadgets page lists only kit gadgets; a
  read-only "Mission kit" panel lists each player's own tools with rounds and batteries. Decided, not built yet (G134,
  G153): the mission issues the two players complementary kits, fixed per mission, so a player does not choose a loadout
  and the presets go. The 2026-10-11 "every player carries the whole kit" is replaced.
- **Wheel.** Kit gadgets plus the kit's launcher rounds (shocker; airfoil when built); `wheelSlot(x, y, slots)` already
  takes the slot count.
- **Co-op.** Every peer reads the same mission definition; the host rejects tool requests outside the kit.
- **Debug.** `?kit=all` gives the full toolkit in any mode (tests and the tool lab map).

## 5. Map data the tools read
Proposed fields; Kestrel's P06 adds them to the play schema (docs/kestrel/schema.md) and P09 fixes them in the build
contract.
| Field | On | Values | Used by |
| --- | --- | --- | --- |
| `lock` | doors, containers (lockers, cupboards, drawers, key cabinet, rack doors, cage padlocks, car doors) | `none`, `reader` (S0), `wafer`, `pin`, `high` | 3.3 |
| `seal` | doors | `true` refuses the optic | 3.2 |
| `optic` | hatches, ceiling panels, grilles, shaft tops | `true`, with a tip point the builder checks | 3.2 (engine: `LevelBuilder.opticGap(kind, gap, normal into the space, tip?)`, default tip `OPTIC.into` 0.3 m along the normal; refusals "Too far" (1.0 m, the gap 0.6 m under to 2.4 m over the feet), "No gap" (the collision check gap -> tip); none placed yet) |
| `alarm` | cars | `true` / `false` | 3.3 |
| `hack` | terminals, keypads | `{ tier: terminal or keypad, services: [ "intel:<flag>", "unlock:<doorId>", "fault:<faultId>" ] }` | 3.4 |
| `cut` | tarps, sheeting, screens | `true` | 3.10 |
| `disrupt` | powered devices other than lamps, cameras and laser panels (the jammer's targets) | `true` (default false; none planned for Dead Line) | 3.5 |
| `lines` | mission data per guard or civilian id | 1-3 lines, optional `reveals: <flag>` | 3.9 |
Every placed item keeps a `reason` (docs/kestrel/RULES.md section 5): why a real site has that lock, terminal or tarp there.

## 6. Dead Line's kit (history: approved by Michael, 2026-10-11)
History, not a build target: Mission 1 "Dead Line" on the Kestrel map is paused (G53) and the first campaign missions go
on Tallow Wharf, campaign Mission 1 (G293; 2026-10-25 ~10:45). A mission's kit is chosen per mission (section 4). The table is kept as a worked
example.
Judged against the control ladder and the ghost rule (docs/kestrel/RULES.md section 1). The kit must give every
critical-path control a no-contact answer without letting a tool skip a control the mission depends on.
| Tool | Kit | Why |
| --- | --- | --- |
| Optic cable | In | Many closed doors, the raised-floor hatches into level U, the corridor ceiling voids and the roof shaft top: look before committing. Sealed doors (gas room, data hall, mantrap) refuse it, so the secure zone keeps its scouting cost (gallery, hatch, shaft). Ghost-safe. |
| Lockpick | In | Track B's no-contact credential: the technician's locker and the car door (badge in the glovebox; the key in the door stays the silent way, an alarmed car's picked door is louder). Card doors, the key safe, the mantrap and iris refuse it. Recommendation to P06: Pell's cage lock `high` (or a code lock) so the cage number and key safe code stay knowledge gates. |
| Hacking | In | Objective 4 is a records lookup: the records PC is the realistic place to read the cage number and the key safe code. Keypads (the B-tier PIN) get a hack with a cost (tamper dispatch) beside the PIN-on-a-note answer. Services are listed per terminal so no hack loops the cameras or opens the secure zone (objective 3 stays at the security room). |
| Shock round | In (2 rounds, TUNE) | One non-lethal ranged recovery tool for players who get spotted; louder only, rated. |
| Ring airfoil | Out | Same role as the shocker and the close strike; one launcher round type keeps the slice small. |
| Interrogation | In | The grab is already in Dead Line as a louder answer (iris, clone card). Questioning gives the louder answer to the knowledge gates (PIN, cage number, who is enrolled). |
| Knife | Out | No cuttable element is planned on the campus, and lethal takedowns exist without it. Revisit if P06 gives a real reason for one. |
The back-to-wall is a movement, always available. The pistol jammer (3.5) is always available; it is not part of any
kit. Existing gadgets in the kit: noisemaker, sticky cam, EMP and sleeping gas at their normal carry (`GADGETS`,
`game/gadgets.ts`). Out: frag and mine (lethal explosives on a site with civilians), flashbang (loud, overlaps gas).

## 7. Build plan (V1-V3)
History where it names Kestrel or Dead Line (paused, G53). Waits for the CT co-op research and Kestrel's restart (G53, G76); the work then runs prototype first, then the orchestrator
method (G87, docs/systems/session-method.md). V1-V3 may change the player controller, the camera, the grab and takedown
code, add `src/config/tools.ts` and the `toollab` debug map; no existing tuning value changes. All logic is pure and
Babylon-free with Vitest tests. Each session runs `npm run check` and `npm run e2e:quick`; GPU, contact sheets and
performance are "pending PC run" from cloud sessions. New e2e suite `scripts/e2e-toolkit.mjs` (REQUIRED, COVERS the tool
files in `scripts/run-e2e.mjs`), extended by each session. Test space: a debug map `toollab` (MAPS only, modes [], like
`seclab`).

| Session | Builds | Files (new / changed) | Unit tests | e2e (e2e-toolkit) | Michael tries |
| --- | --- | --- | --- | --- | --- |
| V1 | Optic cable (doors through the door menu, hatches, panels, grilles, shaft top). Done so far: doors (PR #239), the 2-player kneel and cable (optic-coop, e2e-netmove "optic cable"), the gaps' engine side (optic-coop); left: the gaps' input and map placement | New `src/player/opticCable.ts` (pure tip placement), `src/config/tools.ts`, `src/world/maps/toollab.ts`. Changed: `src/player/moveState.ts` (mode `optic`), `src/player/shoulderCamera.ts` (tip pose), input files (`optic` action), `src/ui/prompts.ts` | tip placement and refusal (sealed, no gap, wall behind) | optic view under a door shows a guard; sealed door refused; 2-player pose sync | Optic under a door, through a raised-floor hatch and a grille, on pad and keyboard |
| V2 | Lockpick (tiers, minigame); hacking (terminals, keypads, services, failure); lock and hack map fields; the security event hook | New `src/game/lockpick.ts`, `src/game/hack.ts` (pure), `src/ui/hud/` minigame overlays, `locks` net list. Changed: `src/world/doors.ts` (`lock` tiers), interactables, `src/net/protocol.ts` (`use` kinds `pick`, `hack`) | pin model and sweet spot; slip; kept progress; minimum-time check; hack columns, wrong lock, lockout; services applied only from data; tamper and failure events | wafer locker opens; `high` and reader refused; slip noise heard by a guard at 2 m, not at 4 m; car alarm on an alarmed car only; hack reads an intel flag; failure locks out and logs an event; client pick accepted, too-fast pick rejected | Pick a locker, a door and a car on pad and keyboard; hack a terminal and a keypad |
| V3 | Mission kit (section 4); the rifle launcher with the shock round; interrogation. Not the airfoil or knife | New `src/game/tools.ts`, shocker rounds in the weapon data. Changed: `src/game/missions.ts` (`kit`, `validateMissions`), `src/game/gadgets.ts` callers, `loadoutScreen.ts`, wheel, `src/game/takedown.ts` (the grab menu's interrogate) | kit validation and defaults (each player's own kit); wheel and loadout filtering; shocker outcome; interrogation lines and flags | kit hides out-of-kit prompts and wheel slots; out-of-kit client request rejected; shocker knocks out; question sets a flag for both players | Pick a mission with a kit and see each player's kit; shock and question a guard in toollab |

Kestrel order (when it restarts): V1-V3 run after Kestrel's P10 and before B3, so B3 builds the map with the tools in hand.
S1 Part B wires the hack events to the desk; S4 adds the camera's disabled state to `sec`; S6's civilians get questioning
through the grab.
