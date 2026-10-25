# Fallow training bunker - feature matrix

One row per player-facing feature or verb in the repo and in the plans. Every row is either placed in a bay or listed
as out of scope with a reason (section 9). Bays: B1-B9 and the airlocks A1-A8 (BAYS.md). "Who": both players, or the
role and where the other player gets it (DECISIONS C3).

**Status key.** `exists` = on this branch (feature/kestrel base) today. `loco NN` = locomotion step NN
(`origin/feature/ct-locomotion:docs/locomotion/PLAN.md`); steps 01-08 are done there (Blocks A, B), step 09 is next.
`S1B`, `S2`, `S3`, `S4`, `S5` = security stages (docs/kestrel/progress.md: S1 Part A done, the rest not started).
`V1`, `V2`, `V3` = toolkit stages (not started). `DR` = door kinds stage. `P1`-`P6` = bible roadmap phases (planned).
`backlog N` = docs/backlog.md item. `T1` = the course framework (PLAN section 2, new).

**Check key.** `e2e-bunker` = the new course suite (two pages `?net=local`, one step per bay, PLAN T8). `bot` = the full
course with the dev bot as P2 (loco 20). Other names are existing suites (docs/systems/testing-tools.md).
**Sync key.** What the row proves crosses the network correctly: the `MoveState` mode the partner poses from, or the
host-authoritative message.

**Drills (D30).** A row is a mandatory drill in a bay only where that bay's v2 objective table (BAYS.md) has an
objective line for it; its who follows that line: "(both)" or "(each)" = ticked per player, "(either)" = one tick from
either player, a role (P1 / P2) = that player. Every other placement is "placed": the verb or system is available there,
not mandatory, and neither the airlock nor the bot run counts it. Drills run in their now form until their feature
lands; a row whose objective line is greyed ("not a drill until ... lands") has its element built but no tick yet. The
airlock refuses until the bay's objective lines are done. Locomotion steps 09-20
are merged before Block C (D15), so their rows run in their final form from the first playable build.

**Drill lists (v2, T5c).** Each bay's "Objectives" table in BAYS.md v2 is that bay's drill list: one explicit
objective line per drill (R5, A47), its who (each / either / role) and its element. Movement rows are "both" in every
bay (R3: one shared course); team moves and the split drills keep their roles (section 11).

## 1. Movement
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Speed gears 1-6, gear kept through stances | exists | B1 (both) | `MoveState.g`; `moveSpeedCap` on the host | e2e-move; e2e-bunker B1 gear run on both pages | - |
| Instant stop / start, stop hold | exists | B1 (both) | remote pose at rest within 10 cm | e2e-move, e2e-anim | - |
| Crouch / stand / kneel | exists | B1 (both) | `MoveState` stance | e2e-netmove | - |
| Quick 180 | loco 22 | B1, B2 (both) | remote turn without a slide | anim-audit (remote) | Not a drill until loco 22 lands (D30) |
| Momentum carry | loco 26 | B2 (both: vault-mantle chain, jump-pipe chain) | committed move with entry speed (`MoveCommit`) | anim-audit, e2e-bunker B2 | Moves work without carry |
| Forward roll | exists | B2 (both) | `kind 'roll'` replayed | e2e-move, e2e-netmove roll | - |
| Manual jump | exists | B2 (both) | jump arc on the remote | e2e-ct | - |
| Step, vault, mantle | exists | B2 (both) | `traversePath` replay | e2e-move, e2e-clip | - |
| Drop, lower into a hang, hang-drop | exists | B2 (both) | attach mode `hang` | e2e-traverse | - |
| Landing bands soft / roll / heavy, landing noise | exists | B2 (both) | host hears the landing (`eventNoise`) | e2e-traverse landing bands | - |
| Ladder (bottom / top entry, slide) | exists | B2 (both), B3 (catcher and return ladders: as needed, not a drill), B4 (P1: C3 ladder, objective 8; either: outlet ladder, objective 11), B6 (both: AH plant ladder, objective 1), B8 (P2: the tower, objective 18) | attach `ladder`, grips within 10 cm | e2e-anchors, e2e-netmove ladder | - |
| Drainpipe | exists | B2 (both) | attach `pipeV` | e2e-netmove drainpipe | - |
| Ledge hang, shimmy, outside corner, gap jump, climb up | exists | B2 (both), B7 bench (route, optional) | attach `ledge` | e2e-traverse, e2e-netmove ledge | - |
| Horizontal pipe: hands | exists | B2 (both), B3 (both) | attach `pipeH` | e2e-netmove pipe | - |
| Pipe legs up, inverted, flip drop | exists | B3 (both), B7 water main (route; its drop and inverted takedowns are section 5 rows) | `ATTACH_SUB` pipe bits | e2e-ct, e2e-netmove legs up / inverted | - |
| Split jump (double tap, brace, jump up out of it) | exists | B3 (both) | mode `split` | e2e-ct, e2e-netmove split | - |
| Wall jump: straight, inside corner | exists | B3 (both: straight WJ1, corner WJ2), B5 genset roofs, B7 annex (routes, optional) | mode `wallJump` | e2e-ct, e2e-ct-warehouse | - |
| Rappel: speeds, kick out, sideways, kick through a window, unhook | exists | B3 (both: two stages, BAYS v2), B9 (route, optional: the bridge) | mode `rappel`, rope drawn on the remote | e2e-ct, e2e-netmove rappel | - |
| Zipline | exists | B3 (both), B9 (route, optional: B-2 to the lobby) | attach `zipline` | e2e-anchors, e2e-netmove zipline | - |
| Fence: climb, shimmy, rattle above gear 3, flip over | exists | B3 (both) | mode `fence`; host hears the rattle | e2e-ct fence, e2e-netmove fence | - |
| Duct crawl; wall grille unscrew vs kick | exists | B3 (both: twin ducts, each player unscrews one grille and kicks one louvre), B6 supply duct (both) | attach `duct`; `Breakables.open` | e2e-traverse duct, e2e-netmove duct | - |
| Ceiling vent drop and roll | exists | B6 (both: the shared line into records) | committed drop registered as a landing | e2e-traverse vent drop | - |
| Windows: open vault vs glazed break | exists | B2 (both: each vaults the open window and breaks a pane; the panes re-glaze, A54), B7 (placed) | breakable state (host) | e2e-traverse windows | - |
| Back-to-wall: enter, slide, leave; two players stacked | loco 11 (V1 lists it too; the locomotion step builds it) | B6 (both, objective 4), B7 (placed) | mode `wall` | e2e-netmove wall, bot stacking | - (merged before Block C, D15) |
| Corner peek, lean-out aim, SWAT turn, corner takedown | loco 12 | B6 (each: peek, lean-out aim, SWAT turn, objectives 5-7), B7 (either: corner takedown, objective 4) | `lk` lean kind | e2e-netmove peek / lean | - (merged before Block C, D15) |
| Open-side weapon at edges; low-wall side lean | loco 12b | B6 (placed), B7 sandbags (placed: route, optional) | `WALL_SUB` leftHand | e2e-netmove left-edge lean | - (merged before Block C, D15) |
| Door: open quietly, open fast, bash | exists | B6 (placed), B7 (both, objective 1) | `doors` open indices | e2e-tactics, e2e-coop doors | - |
| Door peek (crack open) | loco 13 | B6 (both, objective 8), B7 (placed) | mode `doorPeek` | e2e-netmove door peek | - (merged before Block C, D15) |
| Floor settle, camera respects walls | exists | all | local only | e2e-camera-bounds | - |
| CT camera and collision solver | loco 24 | all (tight: B3 duct, B6 corridor) | local only (never sent, bible C11) | e2e-camera-bounds | Current camera |

## 2. Co-op team moves and co-op systems
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Brace | exists | B4 (P1: objective 1, W1; either: objective 9, the outlet boost), B9 boost gap (placed) | mode `brace`; `tmove` / `tstart` | e2e-netmove team, e2e-bunker B4 | - |
| Boost | exists | B4 C1 (P2 boosted), B9 | mode `boost`, host check of both sides | e2e-netmove phase 5 cases | - |
| Human ladder | exists | B4 C2 (P1 climbs) | mode `stacked` sub 1 / 2 | e2e-netmove human ladder | - |
| Split-jump boost | P5 (hook H4) | B4 overflow channel | committed move `cmove` / `cstart` (loco 10) | e2e-bunker B4 (when live) | Element built; not a drill until P5 lands (D30) |
| Back-to-back climb | P5 (H4) | B4 float shaft | as above | as above | Element built; not a drill until P5 lands (D30) |
| Pull-up | P5 (H4) | B4 outlet platform | as above | as above | Boost onto the platform (required drill) |
| Rappel anchor (partner holds the rope) | P5 (H4) | B4 sump | as above | as above | Element built; not a drill until P5 lands (D30) |
| Dual takedown | exists | B7 pair (both) | `DUAL_WINDOW` 1.5 s banner relayed | e2e-coop dual takedown | - |
| Sync (3-2-1 countdown, each acts manually) | P5 | B7 pair, B9 keys (both) | countdown start time from the host | e2e-bunker B7, B9 | T1 "two switches within 1.0 s"; a radio line "together" |
| Clutch save (team-only marker on a guard detecting a partner) | P5 | B9 sniper (greyed: objective line "not drills until Phase 5 lands"; element built, no tick) | marker relayed to the team only | e2e-bunker B9 | None (radio window rule already erases the sighting) |
| Downed and revive | exists | B8 (placed), B9 (placed; drag and medkit on a mate greyed until Phase 5) | `revive` interactable; `onLocalDeath` | e2e-coop revive | - |
| Drag a downed team-mate into shadow | P5 (hook H1 at loco 27) | B9 dark ring (greyed: not a drill until Phase 5 lands) | host decides who holds the body (bible C11) | e2e-bunker B9 | Revive in place |
| Medkit on a team-mate | P5 (hook H2 at loco 15) | B9 (greyed: not a drill until Phase 5 lands) | host-authoritative counts | e2e-bunker B9 | Self medkit only |
| Pings (typed: Go, Hold, Target, Light, Here, Danger, Sync) and quick lines | exists (untyped); typed P5 | B1 (both), B2 across the glass, B6 operator to runner | `ping` msg, host rate 0.8 s | e2e-coop pings | Untyped ping |
| Team-mate soft outline; distinct operators | P5 | all | lobby operator per player | e2e-cosmetics (operator), e2e-coop | Default look |
| Two-person airlock, automatic (marked pad: one on it "Waiting for partner", both on it seal, cycle and open; no button; lock behind; checkpoint) | T1, T5b (R6, D46) | A1-A8 (both) | host course state; both pages see the doors lock | e2e-bunker every airlock; bot | Required before the build (PLAN 2) |
| Bay restart when both are down | T1 | every bay | host restarts; clients rebuild the squad | e2e-bunker B5 forced | Required |
| Team results and highlights | P5 (C18) | end (both) | host report in `end` | e2e-bunker end | Existing results screen |
| Friendly fire (shots and blasts hurt the partner; downed, then revive) | T1b (D38) | all, B8 especially (placed: always on, not a drill) | host-validated hits on the partner (PvP hit paths, co-op rules) | e2e-course, e2e-bunker B8 | - |
| B9 ghost tier (Ghost / Silent / Loud) and its two sync moments | T1c (D32, D33) | B9 (placed: shown on the results, not a drill) | host rating in `end` | e2e-bunker B9 ghost run (T8b) | - |
| Bot partner playable as P2 from the debug menu | T8c (D35; needs loco 20) | all | the bot is a normal client | e2e-bunker with the bot | Two tabs or a friend |
| Host leaves: session ends | exists | any | `NetSession` peer leave | e2e-coop host leaving | - |
| Connection test and network stats | P5 (C19) | lobby (outside the map) | - | - | - |

## 3. Weapons, health and combat
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Holstered unless aiming; draw by aiming; no hip fire | loco 09 | B1, B8 (both) | MoveState drawn bit; weapon in hand host-authoritative | e2e-netmove drawn / holstered | - (merged before Block C, D15) |
| ADS spread tuning | loco 09 | B8 (placed: tuning felt in objective 2's aimed fire, not a drill) | host `maxHitDamage` validation | e2e-combat | - (merged before Block C, D15) |
| Elbow strike (fire while holstered) | loco 10 | B1 pad (each, objective 3), B7 (either, objective 10) | `cmove` committed move; MoveState `strike`; host may deny | e2e-netmove strike | - (merged before Block C, D15) |
| Pistol, SMG, rifle, shotgun, sniper; curated names | exists; names loco 16 | B8 (both; sniper: lead P2 from the tower, P1 in B9 if wanted) | validated hits (`shot`) | e2e-combat | Current names |
| Reload, swap | exists | B8 (both) | remote clip events | e2e-combat, e2e-weapons-carry | - |
| Suppressed vs loud shots (noise) | exists | B8 (both) | host hears `PF.quiet` / `PF.firing` | e2e-tactics | - |
| Penetration | exists | B8 PW (both) | host ray check | e2e-combat | - |
| Headshots, split hit volumes | exists | B8 dummies (both) | host `judge` with posed head | e2e-combat | - |
| Explosive barrels | exists | B8 BR (either) | blast check `validate.ts` | e2e-combat | - |
| Fire from attached states (split, inverted pipe sidearm) | exists | B3 (optional) | attach aim band | e2e-ct | - |
| Aim assist, recoil | exists | B8 | local | e2e-anim | - |
| Health 100, no regeneration | loco 03 (done on ct-locomotion) | all | `sh` removed from PlayerState | e2e-coop | Current health and shield |
| Medkits: self, wall medkits | loco 15 | A4, A6, A8, B9 (placed: use when hurt, not a drill) | MoveState `medkit`; host counts | e2e-netmove medkit | - (merged before Block C, D15) |
| Enemy attacks: guards fire, one grenade at a time, flanker, suppression | exists | B8 live fire (roles: P2 objective 19, P1 objective 20), B9 (placed) | host AI; puppets on clients | e2e-tactics, e2e-combat | - |

## 4. Gadgets and toolkit
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Gadget wheel (slow time solo only) | exists | B8 (placed: used to pick the gadgets for objectives 10-16, no line of its own) | none (co-op never slows) | e2e-gadgets | - |
| Frag grenade | exists | B8 (either: objective 9, the barrels with a shot or a frag; each: objective 10, a frag in the lanes) | blast check on the host | e2e-gadgets | - |
| Sleeping gas | exists | B8 dummies (each, objective 11), B9 dog (placed) | `gadget` relay, host `remoteEffect` | e2e-coop client gas cloud | - |
| Flashbang (white-out) | exists | B8 (both) | relay | e2e-gadgets | - |
| EMP (lights, cameras) | exists | B5 (each, objective 4), B8 lamp gantry (each, objective 13), B9 (placed) | relay; light state | e2e-gadgets | - |
| Noisemaker | exists | B5 (each, objective 5), B7 skip (placed), B8 (each, objective 14) | relay; host `hear` | e2e-gadgets | - |
| Sticky cam (feed, lure ping, gas) | exists | B8 shoot-house (either: objective 15), B6 (placed) | relay of the gas | e2e-gadgets | - |
| Proximity mine | exists | B8 gate (either) | host blast | e2e-gadgets | - |
| Throw an object (bottle, can) | P6 | B5, B8 (each, greyed lines until Phase 6) | thrown object state | e2e-bunker (when live) | Noisemaker covers the lure |
| Pistol secondary (camera jammer + light disruptor) | V3 | B8 lamp gantry and CAM-R (each, greyed line until V3); B5 EM1, B6 CAM3, B9 CAM-P2 (placed) | host range / line / charge check; light state; `sec` (S4) | e2e-toolkit, e2e-bunker B8 | Shoot the lamp (destroyed, not timed) |
| Shock round | V3 | B8 dummy (each, greyed line until V3); B8-E, B9 (placed) | weapon path; host knock-out | e2e-toolkit | Gas or takedown |
| Ring airfoil | backlog 23 | B8 lane (each, greyed line until the backlog item lands) | weapon path | - | Not a drill until it lands (D30) |
| Knife (lethal takedown, cut tarps) | backlog 24 | B7: a dust sheet over the cavern's north-east recess (cut: a hide spot) | `use` kind `cut` | - | Recess open |
| Wall hug (toolkit row) | loco 11 | see section 1 | - | - | - (merged before Block C, D15) |
| Optic cable | V1 | B6 locker and records doors (each, objective 10, greyed until V1), B7 house doors (placed) | MoveState `optic`; pings from the view | e2e-toolkit | Door peek / open the door |
| Lockpick (minigame) | V2 | B6 locker 7 (operator P2), B9 key A drawer (lead P1), B9 key B locker (second P2); B6 manager's door (`pin`) | `use` kind `pick`, host minimum time | e2e-toolkit | Locker opens with "Open" |
| Hacking (minigame; terminal, keypad) | V2 | B6 records PC (runner P1, alternate), B6 exit keypad (alternate) | `use` kind `hack` | e2e-toolkit | Numbered switches / the records PC as a plain terminal |
| Interrogation | V3 | B7 officer (lead P1) | `use` kind `question`; intel to the team | e2e-toolkit, e2e-bunker B7 | Desk drawer switch |
| Mission kit (per-mission tools) | V3 | course: the full kit (`?kit=all` equivalent in the course data) | every peer reads the same kit | e2e-toolkit | All tools on |

## 5. Takedowns and grabs
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Takedown from behind | exists | B5 (each, objective 6), B6 (roles: P2 desk operator, objective 14; P1 rounds officer, objective 18), B7 (each, objective 2) | `td start/done` seizes the host enemy | e2e-takedown, e2e-coop client takedown | - |
| Front, side (calm only) | exists | B7 (either) | as above | e2e-takedown | - |
| Corner takedown | exists (from the wall: loco 12) | B6 L-turn on B6-GR, B7 house corner | as above | e2e-takedown | - (merged before Block C, D15) |
| Over a low obstacle | exists | B7 sandbags | as above | e2e-takedown | - |
| Drop takedown (from hang / pipe / split / zipline / rappel) | exists | B7 water main on B7-W (second P2) | as above, approach = fall time | e2e-takedown drop | - |
| Ledge pull (below) | exists | B7 parapet on B7-R (lead P1) | as above | e2e-takedown | - |
| Window takedown | exists | B7 manager's window on B7-O (lead P1) | as above | e2e-takedown | - |
| Inverted takedown (pipe) | exists | B7 water main (either) | as above | e2e-takedown | - |
| Tap = knock out, hold = lethal | exists | B7 | host applies | e2e-takedown | - |
| Heavy: frontal grab lethal only | exists | B7-H, B9-1 | host archetype rule | e2e-enemies | - |
| Grab: walk, sidearm, human shield, knock out, kill, shove | exists | B6 (runner P1 walks B6-GM to the iris), B7 (either), B8 | mode `grab` (`tid`); host keeps the seized guard | e2e-takedown, e2e-coop | - |
| Use a held guard on a scanner (iris) | S2 | B6 IR1 (runner P1) | `use`; host checks enrolled + conscious | e2e-seclab | Iris door is a plain locked door opened by the egress switch |
| Carry and hide bodies | exists | B7 recesses, lockers, skip (both) | host body list (`snap.bodies`) | e2e-coop kept / hidden bodies | - |
| Drag bodies | loco 27 | B7 (both) | MoveState `drag`; host decides the holder | e2e-netmove drag | Carry |
| Card taken on a takedown; clone while grabbing | S2 | B6 B6-GR card B (runner P1) | `sec` cards owner (S4) | e2e-seclab | "Card" pickup switch |

## 6. Vision, light and sound
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Light meter (one light field, light parity) | exists | B1 dark store (both), every guarded bay | host computes `PlayerRef.light` per remote | e2e-darkness, e2e-stealth-ai | - |
| Night vision (tube, auto-gain, bloom) | exists | B1 store (both), B3 dark chamber (optional) | local only | e2e-darkness | - |
| Thermal vision | loco 14 | B5 hot gensets (each, objective 1), B9 (placed) | none sent (unit test: no protocol field) | unit test | - (merged before Block C, D15) |
| Electro (EMF) vision | loco 14 | B6 wiring, cameras, readers (both) | none sent | unit test | - (merged before Block C, D15) |
| Light switches and circuits | exists | every bay | switch interactables in `items`; light state | e2e-stealth-ai, e2e-coop | - |
| Shoot out lamps | exists | B2 (each, objective 4a), B5 (each, objective 3), B7 (each, objective 16a), B8 gantry (each, objective 17), B9 (each, objective 2a) | host `shotRay`; light state | e2e-stealth-ai | - |
| Light state synced to clients | FP S7a / bible L10 (planned) | every bay | lamp on / off / destroyed on clients | e2e-coop light case | Clients see their own registry from switch events (existing items) |
| Fuse box / mains breaker (a guard sent to reset it) | P1 (step parked) | B5 MB (lead P1) | host light groups; reset by a guard | e2e-bunker B5 | Switch on the L1-L3 group + T1 mag lock gate |
| Maintained emergency lamps (stay on with the mains off) | P1 with the fuse box | B5 EM1-3, every exit sign | light state | e2e-bunker B5 | Unswitched lamps (no group) |
| PIR motion light | S3 | B5 fuel bay, B6 L-turn, B9 B-2 west | `sec` pirs (S4) | e2e-seclab | Plain lamp, off |
| Flashlights carried into the dark | exists | B5 (G1, G2), B7, B9 | flashlight pose on puppets | e2e-stealth-ai | - |
| Doors block light | exists | B6, B7 | door state | e2e-darkness | - |
| Footstep noise by surface, loud / quiet floors | exists | B1 store, B2 galleries, B5 grating, B6 raised floor, B7 gravel, B9 balconies | host hears client footsteps by `noiseRadius` | e2e-stealth-ai, e2e-tactics | - |
| Noise muffled by walls | exists | B5, B6 | host `hear` | e2e-tactics | - |
| Sound meter (noise against the local ambient) | P2 | all | local HUD | - | Existing noise pulse on the tactical strip |
| Noise masking, ambient zones | P2 | B3 fan, B5 gensets | host ambient level | - | Gensets are plain props |
| Whistle | P2 | B5 (each, greyed line until Phase 2), B7 (each, greyed line until Phase 2) | host `hear` from the client | - | Noisemaker |

## 7. Security
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| CCTV fixed and sweep (detection meter, arcs) | S1 Part A done | B6 CAM1-4 (P2: loops them, objective 15), B8 CAM-R, B9 CAM-P1/P2 (placed) | camera yaw within 5 deg on clients, arcs (S4) | e2e-seclab | - (built) |
| Security desk, operator, dispatch, unmanned log | S1B | B6 SD, B9 bridge desk | `sec` panel, barks | e2e-seclab | Cameras without a desk (no live response) |
| Alarm panel: loop cameras, cameras off, beams off | S1B | B6 PN (operator P2) | `sec` panel flags | e2e-seclab | Course switch that disables cameras (T1) |
| Desk console view (a player watches the feeds) | planned (PLAN 2 item 3) | B6 (operator P2) | local view of host-sent camera state | e2e-bunker B6 | The lit sign seen from CR |
| Plant fault (trip cooling) | S1B | B6 CRAC (either) | dispatch on the host | e2e-seclab | Noisemaker lure |
| Card readers, access levels, keycards | S2 | B6 (roles: P2 RD2, objective 13; P1 RD3 / RD4, objective 20; RD1 / RD2 electro vision each, objective 9) | door lock state; `sec` readers | e2e-seclab | T1 "card" switches + locked doors |
| Card clone, revoke | S2 | B6 (runner P1) | `sec` cards | e2e-seclab | - |
| Mantrap interlock, egress button | S2 | B6 MT (runner P1, then operator P2) | `sec` mantrap phase | e2e-seclab | Two locked doors + egress switch |
| Iris scanner | S2 | B6 IR1 (runner P1) | as above | e2e-seclab | Egress switch |
| Infrared beams high / low | S3 | B6 corridor (placed: the runner P1 meets them on the L-leg; P2 turns them off, objective 16), B9 lobby (route) | `sec` beams; beam lines in night vision | e2e-seclab | None (corridor open) |
| Security co-op sync and controls (`sec`, `secEv`) | S4 | B6, B9 | itself | e2e-seclab 2 and 4 players | Host-only devices |
| Dormant guards (every guard spawns, at most 12 awake) | S5 | course squads | host spawns | e2e-bunker | T1 spawns each bay's squad at its airlock |
| Alarm and reinforcements | exists | B9 panel, staff tunnel (placed: a consequence, never ticked) | host `onAlarm`, reinforce | e2e-stealth-ai, e2e-modes | - |

## 8. Guards (AI)
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Perception: light x stance x motion x exposure | exists | B5-B9 | per-player `PlayerRef`; `PF.spotted` | e2e-stealth-ai | - |
| Alert states, awareness arcs, LKP ghost, search | exists | B5-B9 | puppet alert levels `al` | e2e-coop Hunter puppet alert levels | - |
| Radio window, shout, spotter taken first tells nobody | exists | B7, B9 | host | e2e-stealth-ai | - |
| Radio check | exists | B7 squad | host | e2e-enemies | - |
| Bodies found; non-lethal bodies revived | exists | B7 (B7-W finds), B9 | host body list | e2e-stealth-ai | - |
| Lure by lights out; noise investigation | exists | B5, B7, B9 | host | e2e-stealth-ai | - |
| Doorway check | exists | B6, B7 | host | e2e-clear | - |
| Patrol loops, posts with glances | exists | B5-B9 | puppet poses | e2e-stealth-ai | - |
| Per-stop guard facing | P6 (editor data has it) | B5-B9 guard sheets | host | e2e-bunker | Glances only |
| Multi-level nav (stairs, ladder links) | exists | B7 house, B9 balconies | host | e2e-levels | - |
| Heavy (plates, frontal lethal only) | exists | B7-H, B9-1 | host | e2e-enemies | - |
| Enforcer (shield, pushes) | exists | B8-E, B9-4 | host | e2e-enemies | - |
| Sniper (laser, glint, relocates) | exists | B8-S, B9-3 | laser drawn on clients | e2e-enemies | - |
| Dog (smell in the dark) | exists | B9-D | host | e2e-enemies | - |
| Officer (buff, alarm first) | exists | B6-GM, B7-O, B9-O | host | e2e-enemies | - |
| Guard body language | loco 28 | B5-B9 | guard pose on clients | anim-audit | Current poses |
| Custom difficulty (host's applies in co-op) | loco 19 | course (host) | clients follow the host's values | e2e-pad / e2e-mouse | - (merged before Block C, D15) |
| Civilians | P6 | B7 exercise umpire (east door) | host perception | - | Spot left empty |

## 9. Course, mission and interface
| Feature | Status | Bay (who) | Co-op sync it proves | e2e or bot check | Placeholder if not built |
| --- | --- | --- | --- | --- | --- |
| Course mode (co-op, 2 players), course data | T1 | all | host course state message | e2e-bunker | Required (PLAN 2) |
| Objective list always on screen, explicit objective lines, ticked per player (R5) | T5b; lines from BAYS v2 (T5d-T5g, T7a) | every bay (both) | host course state per player | e2e-bunker (both pages from spawn) | Drill short names (A47) until the lines land |
| Gates: one-side bolt, hold, timed hold, two switches at once, egress, mag lock on mains, flag (isolator, cards, code) | T1 | B3 isolator, B4, B5, B6, B7 store, B8 catwalk stair, B9 (v2 has no B2 lever gates: R3) | door lock state on clients | e2e-bunker | Required |
| Objectives (keys, case, extract) | exists (`ObjectiveChain`) | B9 | `items` sync | e2e-missions | - |
| Checkpoints, restart from checkpoint | P4 (T1 does the course's own) | airlocks | host | e2e-bunker | T1 |
| Text radio and subtitles (LANTERN, solo / team variants) | P4 (barks exist) | every bay | radio lines to both | e2e-bunker | Barks path (`RADIO_BARKS`) through T1 |
| Briefing | P4 | B1 briefing room | - | - | Radio lines |
| Stealth rating and results | loco 04 stub; P4 | end | host report | e2e-bunker end | Existing results |
| HUD: gear pips, light meter, arcs, world prompts, subtitles | exists | all | local | e2e-touch, e2e-pad | - |
| Controls: pad first, mouse and keyboard, basic touch (locomotion D1) | exists; pad table loco 17 | all | local | e2e-pad, e2e-mouse, e2e-touch on B1-B2 | - |
| Remapping, hold / toggle | loco 18 | course (settings) | local | e2e-pad, e2e-mouse | - (merged before Block C, D15) |
| Training dummies | exists | B1 strike pad, B8 lanes | host damage | e2e-combat | - |

## 10. Out of scope (with the reason)
| Feature | Reason |
| --- | --- |
| Snap cover, cover glide, cover-to-cover, blind fire over cover | Removed (bible 6; loco 05, 06). Back-to-wall replaces it. |
| Mark & Execute | Removed (bible 6; loco 01). |
| Sonar goggles | Removed (bible 6; loco 02). Thermal and electro replace it. |
| Ghost / Panther / Assault style tracker and cash | Removed (bible 6; loco 04). |
| Regenerating shield | Removed (loco 03). |
| PvP Team Deathmatch, Free-for-all | Parked (bible 6). The bunker is co-op only (D1). |
| Hunter, Wave Survival, the old Mission mode | Parked / retired (bible 6). |
| Credits, unlocks, shop, suit, HQ, challenges, weapon mastery, attachment unlocks | Parked (bible 6). The course uses the course kit loadout. |
| Camos, outfits, emotes, appearance editing | Parked (bible 6). |
| Tri-rotor drone gadget, recon drone, drone operator | Parked (bible 6). |
| Minimap | Parked (bible 6). |
| The Confrontation (traitor finale, versus) | Removed (G9): Mission 8 has no traitor and no versus finale (bible 5.15). |
| 3-4 players, `coopExtras` | The bunker is exactly 2 players (D2). The bible's 4-player e2e stays on other maps. |
| Solo play, solo routes | Co-op only (D1). Solo teaching is Training mode; solo testing uses the bot. |
| Quicksave | Decided against (bible 11, 2026-10-08). |
| Photo mode, feedback notes, benchmark, debug overlay | Dev tools; they work in the bunker but are not course content. |
| Parked maps (Embassy, Mansion, Port, Refinery, Dust Depot) | Parked (bible 6). |

## 11. Per-player coverage (DECISIONS C3; BAYS v2)
Every row in sections 1-8 marked "(both)" is done by each player in its bay; every movement row is "both" (R3: B2 and
B3 are one shared course, so the v1 rappel / zipline split is gone). Split rows and where each player gets them:
| Verb | P1 | P2 |
| --- | --- | --- |
| Boost (boosted) / brace | B4 braces (C1), climbs the human ladder (C2); B4 outlet boost (either) | B4 boosted (C1), human ladder holder (C2) |
| Timed hold (sluice) | B4 holds | B4 passes |
| Mains breaker / crossing | B5 breaker | B5 crosser |
| Drop takedown / ledge pull / window takedown | B7 ledge pull, window takedown | B7 drop takedown; B9 drop from the rappel (optional) |
| Interrogation | B7 (lead) | B9 controller B9-O (optional, flavour line) |
| Lockpick | B9 key A desk drawer (`wafer`); B6 manager's door (optional) | B6 locker 7, B9 key B locker |
| Iris / mantrap with a held guard | B6 (runner) | - (operator passes on the egress) |
| Security desk (loop, beams off, feeds) | - | B6 (operator) |
| Sniper rifle from the tower | B9 (optional, a sniper rifle on B-2) | B8 (lead) |
| Floor advance / cease fire | B8 (floor) | - (overwatch) |
e2e-bunker logs which player performed each verb; the bot run (loco 20) fails if a "(both)" verb is missing for a player.
"(both)" / "(each)" mark only placements with an "each" objective line in BAYS v2; "placed", "route", "optional"
and "as needed" are places the verb can be used, not drills, and the bot run does not count them (the Drills rule above).
