# A4 - Set 4, the Goods Shed (set doc)

Status: SET DOC (PLAN.md slice 4 step 1), written 2026-10-23 by the A1-A4 set-doc agent, before any geometry.
Set id `a4GoodsShed`; file `src/world/maps/ctcourseSets/a4GoodsShed.ts`; plans `plans/a4GoodsShed-ground.svg`,
`plans/a4GoodsShed-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A4 sheet, route summary), 10, 12, 13, 14 (N3), 15,
17, 18 (A4 rows), 19 (Q11); LIGHTING-PLAN section 3 (A4), `MARLOW_CIRCUITS` / `MARLOW_POCKETS`; GREYBOX-HELPERS.md;
ENGINE-ANSWERS.md (Q2, Q7, Q11); `src/game/course/securityRoom.ts` (N3); `src/game/takedown.ts` (reach 1.8, over cover
1.9); `src/ai/perception.ts`; `docs/level-design.md` section 13. Coordinates: x east, z north, metres, floor y 0, yaw
radians with 0 = +z. Decisions and contradictions: section 13 (`A4-D<n>` / `A4-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 4, the Goods Shed. Ground (y 0) plus the pick mezzanine (y 3.3). A port warehouse with its security room: the security room (x 100-106.6, z 13-19.6, 3.0 m), the staff passage under the gallery (x 101-104, z 19.6-24), the goods floor (x 76-112, z 24-48, 7.5 m to the roof tie) |
| New mechanic | Teaches the security room's timed camera loop (N3) and the dual takedown (optional, P10). Combines the jammer (fallback when the loop ends) and the light-switch lure |
| Entry vantage | Two: L3's glass slot onto the security room (the officer's back at his monitors, about 5 m away); then the passage mouth (102.5, 24.3), dark, onto the back aisle and the cross aisle with C2's red grid. The dock pair is read from the back aisle's west end (84.5, 25.8), inside the dark pocket `a4-back`: D1, D2, the desk, the kettle office and C3 over the wicket in one view. All three out of every guard's view (the officer faces north; the pair face each other, north-south; racking R1 occludes the back aisle) |
| Routes | Fast (A): "Loop the cameras, then straight up the cross aisle and west along the lit main aisle." Shadow (B): "Along the dark back aisle past C2's crossing to the dock's south side." High: "The east stair, the mezzanine (loud plate, out of C1 and C2), down the west stair behind the dispatch office." Loud: "Shoot C1-C3" (alarm stage, rating; host only today). At the dock: dual takedown; or wait for the kettle break and take D1 alone, then D2 at the kettle; or switch the floor lights off at the dispatch office (D1 comes to the switch). Secret: none (P11) |
| Loop | The racking rows: back aisle - cross aisle - aisle 2 - main aisle - east lane, round either rack block (x 86-95, x 98.5-108) |
| Stepping stones | Shadow route: passage mouth -> back aisle (dark, 3 m wide, R1 alongside) 18 m -> back aisle west end (84.5, 25.8) -> stack S (79.6, 29.8), 5.9 m. Main route: cross aisle racking ends every 2.4-3.5 m; the main aisle is the deliberate lit crossing (needs the loop) |
| Guards | `a4-officer` (static post, isolated by design); `a4-dock1`, `a4-dock2` (talking pair covering each other; D2's kettle break every 40 s). Cameras C1-C3 (`offFlag` `a4-loop`). Section 2 |
| Lights | Security room 40 (switch by the L3 door), floor high-bays 41 (switch at the dispatch office door: the lure), racking aisles 42 (switch at the west end), mezzanine 43 (two-way, both stair heads), bulk-store row 49 dead (motion sensors off tonight: the dark back aisle). No light timer: the 60 s window is the camera loop; cameras ignore light (SPEC rule 10) |
| Surfaces | Floor and security room concrete (quiet); mezzanine and its stairs chequer plate (`metal`, loud x1.6); the passage vinyl (quiet) |
| Toys | The console (N3 loop), C1-C3 (jam, shoot), the floor switch (lure), the aisle and mezzanine switches, the kettle (D2's clock), the dock wicket's push bar, the security room door, the dispatch office door |
| Hide spots | The dispatch office's west corner (unlit, behind the kettle counter); the racking end bays (x 84-86 and 108-110 at each row end); the passage (dark). A body at the desk is found by D2 on his return; a body in the security room is on nobody's route |
| Traversal elements | Mezzanine (3.3 m deck, front handrail, `noLedge`), two stairs, racking 5.4 m (`noLedge`), pallet stacks 1.2 m (low cover at the dock). No co-op lip |
| Exit | Pinch point: the dock (x 76-84). Checkpoint: L4 (x 70-76, z 30-36, under the bridge) through L4's east door at x 76, z 32.1-33.9, released from the floor side by the push bar (the dock wicket, A4-D3). L4 has a medkit; its glass slot shows A5's apron |
| Tension | 3 |

### 1.1 Dimensions (6 m grid: x 78, 84, 90, 96, 102, 108; z 18, 24, 30, 36, 42, 48)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set boxes | security room 100-106.6, 13-19.6; passage 101-104, 19.6-24; floor 76-112, 24-48 | 3.0 / 4.2 / roof tie 7.5 | Box-edge walls are `facility.ts`'s (L3 z 13, plant room x 100, L4 x 76, gallery strip z 24, shell). The passage cuts the south service corridor (A4-C4) |
| Security room | 100-106.6, 13-19.6 (6.0 m clear) | 3.0 | L3's far door at z 13, x 102.1-103.9 (facility, 1.8 m slide). Console desk x 104.0-106.3, z 18.6-19.4; monitor wall over it (x 103.8-106.4, lit screens, dressing); passage door x 101.7-102.9 in the north wall (1.2 m) |
| Staff passage | 101-104, 19.6-24 | 4.2 (gallery underside) | 3.0 m wide, one door at the room end, open (archway) to the floor at z 24 |
| Back aisle | 76-112, 24.3-27.3 | - | Dark pocket `a4-back` x 84-110 (bulk-store row, group 49 dead) |
| Racking R1 | 86-95 and 98.5-108, 27.3-29.7 | 5.4 | Back-to-back pallet racking, `noLedge` |
| Aisle 2 | 86-108, 29.7-33.2 | - | 3.5 m reach-truck aisle (strips 42) |
| Racking R2 | 86-95 and 98.5-108, 33.2-35.6 | 5.4 | `noLedge` |
| Cross aisle | 95-98.5, 24.3-44 | - | 3.5 m; C2 looks down it |
| Main aisle | 76-112, 35.6-44 | - | 8.4 m main traffic aisle (high-bays 41); C1 down its east half, C3 its west end |
| East lane | 108-112, 24.3-44 | - | 4 m |
| Mezzanine | 86-106, 44-48 | 3.3 deck | Solid block (closed store below), chequer plate, 1.1 m handrail on the south edge, every edge `noLedge` |
| West stair | 80.3-86, 46.8-48 | 0 -> 3.3 | 20 risers 0.165, run 0.285, rising east to the deck; handrails both sides; reached by the strip x 76-86, z 44-46.8 behind the dispatch office |
| East stair | 106-111.7, 46.8-48 | 0 -> 3.3 | Rising west; foot by the east wall |
| Dispatch office | 76-82.6, 38-44 (6.3 clear) | 3.0 | Clear glazing (`kit.glass`) on its south and east faces (stops sight; passes light); door x 77.7-78.9 on the south face; kettle counter on its west wall (kettle at (76.9, 39.5)); no lamp tonight (L-A5) |
| Dock desk | 79.2-80.8, 32.6-33.4 | 1.0 | Standing desk (not low cover: 1.0 m) |
| Pallet stack N | 79.8-81.0, 35.1-35.9 | 1.2 | Low cover behind D1 (dispatch waiting), 0.7 m behind him (A4-C7) |
| Pallet stack S | 79.0-80.2, 30.1-30.9 | 1.2 | Low cover behind D2, 0.7 m behind him (A4-C7) |
| Dock wicket | L4's east door, x 76, z 32.1-33.9 | 2.1 | Facility door; push bar `a4-pushbar` at (76.5, 1.0, 34.6) on the floor side (A4-D3) |
| Dock roller shutter | x 76 face, z 37-40 | 3.0 | Closed, dressing (no opening) |

Doors and spacing: L3 door (103, 13) -> passage door (102.3, 19.6): 6.6 m; passage door -> mouth (archway); dispatch
office door (78.3, 38) -> L4 door (76, 33): 5.5 m; doors >= 1.5 m from corners (passage door 1.55 m from the room's
west corner; office door 1.5 m from its south-west corner).

### 1.2 Heights and lips

| Top | Height | Builder | Note |
| --- | --- | --- | --- |
| Racking | 5.4 | hand boxes, `noLedge` | Over the co-op band; no lip, no climb |
| Mezzanine deck edge | 3.3 | hand box, `noLedge`, 1.1 m handrail (`kit.handrail`) | Inside solo wall-jump reach (2.7-3.8) if it had a lip: so no lip, the stairs are the only way up (A4-D5) |
| Pallet stacks | 1.2 | hand boxes | Low cover; not near any co-op lip (none in A4) |
| Dispatch office roof | 3.0 | hand box, `noLedge` | No roof access |
| Desks, console | 0.75-1.0 | hand boxes | - |

No co-op lip in A4; no top in the 3.8-4.5 band (racking 5.4, mezzanine 3.3, office 3.0).

### 1.3 Helpers and hand data

No greybox helper (SPEC 12: A4 has no co-op piece). Hand data:

```ts
// N3 timed console (securityRoom.ts SecurityConsole)
{ id: 'a4-console', guard: 'a4-officer', flag: 'a4-loop', seconds: 60, rearm: 20 }
// its pickup gate (the timer the HUD shows: "Cameras back in N s")
{ kind: 'pickup', id: 'g-a4-console', switchId: 'a4-console', flag: 'a4-loop', perPlayer: false }
// the dock wicket (A4-D3)
{ kind: 'egress', id: 'g-a4-wicket', switchId: 'a4-pushbar', doorIds: ['<L4 east door id from facility.ts>'] }
// cameras: cam-a4-c1, cam-a4-c2, cam-a4-c3, each offFlag 'a4-loop' (A4 camera budget 3)
```

## 2. Guard sheets

### `a4-officer`

| Field | Content |
| --- | --- |
| Guard | `a4-officer`, kind `officer` (armed kind, SPEC rule 9), A4 squad, slot (104.8, 17.6), yaw 0 (facing north at the monitor wall) |
| Job | The site's duty security officer: watches the floor cameras from the CCTV desk |
| Route | None: a static post at the desk (glances only) |
| What he sees | Focus north (the monitor wall, the passage door at his left-front); periphery to +-100 deg, 12 m. The L3 door (103, 13.2) is 158 deg off his facing: out of every cone. A player entering crouched at a silent gear reaches 1.8 m behind him (104.8, 15.8) unseen |
| Gaps | Always (static, facing away from the L3 door) |
| Isolation moment | Always: alone in the room, the door behind him, by design (SPEC) |
| Covered by / covers | Nobody; the floor guards are 25 m+ away behind walls |
| Lures | The room switch `a4-sw-sec` (101.2, 13.3) turned off brings him to it (2 m from the L3 door); not needed |
| Search | The room and the passage; hide spots: the passage (dark), L3 is locked behind |
| Info lines (P14) | "The console loops the floor cameras. Sixty seconds, then they reboot." (69) / "Those two at the dock only split when the kettle boils." (55) |
| Console rule | The console refuses while he is up (`CONSOLE_GUARD_UP`) |

### `a4-dock1` (D1, "the man nearest the office")

| Field | Content |
| --- | --- |
| Guard | `a4-dock1`, kind `grunt`, A4 squad, slot (80.0, 34.4), yaw pi (facing south across the desk at D2) |
| Job | Dock loader, booking tonight's container out at the dispatch desk, talking to his mate |
| Route | None: a talking post (glances) |
| What he sees | South: past D2 to stack S, the dock's south side and aisle 2's west end (the man who would come for D2). His back is to the dispatch office and stack N |
| Gaps | While D2 is at the kettle (about 24 s every 40 s) nobody watches D1's back except C3 |
| Isolation moment | Alone at the desk while D2 is away (lit, under the dock high-bay; darkenable by the floor switch, which lures him); or at the floor switch when lured (dark, torch on, facing the switch, his back to the main aisle) |
| Covered by / covers | Covers D2 (sees his attacker); covered by D2 |
| Lures | The floor switch `a4-sw-floor` (79.4, 37.85) off: he is the nearest calm guard (3.5 m; D2 at the desk 6.3 m), walks to it with his torch (the floor is cut). While D2 is at the kettle (3.0 m from the switch) D2 is the nearer and goes instead (A4-C6) |
| Search | The dock and the main aisle's west end; hide spots: the dispatch office corner, the racking end bays |

### `a4-dock2` (D2, "the man nearest the racking", the kettle man)

| Field | Content |
| --- | --- |
| Guard | `a4-dock2`, kind `grunt`, A4 squad, slot (80.0, 31.6), yaw 0 (facing north across the desk at D1) |
| Job | Dock loader; makes the tea: every 40 s he walks to the kettle in the dispatch office and waits for it |
| Route | Timed loop (`loop: { period: 40, leave: [...], t0: 0 }`): `route: [[80, 31.6], [78.4, 31.8], [78.3, 37.3], [78.3, 38.5], [76.95, 39.5], [78.3, 38.5], [78.3, 37.3], [78.4, 31.8]]` (through the office door), `loop { period: 40, leave: [17, 18.4, 24, 24.9, 31.3, 32.7, 33.6, 39.3], t0: 0 }` (the leave clock: no pass-through wait is needed): at the grunt's 0.9 m/s he stands at the desk about 16 s, walks 10.0 m to the kettle, stops there 5 s facing west (-pi/2, his back to the office door), walks back; away from the desk 23.6-24.1 s, departures 40 s apart. Cycle 40 s |
| What he sees | At the desk: north, past D1 to stack N, the main aisle's west end and the office door (the man who would come for D1). At the kettle: the office's west wall |
| Gaps | His kettle walk and stop (about 24 s) |
| Isolation moment | At the kettle: alone in the unlit dispatch office (dark, glazing stops the floor's sight), back to the door, 5 s (+ the walk in) |
| Covered by / covers | Covers D1; covered by D1 |
| Lures | The floor switch, only while he is at the kettle (he is then the nearer) |
| Search | The dock, the office, aisle 2's west end |
| Body | A body left at the desk is found by him on his return |
| Kettle path vs A's spot | His path passes 1.8-2.1 m west of A's crouch spot behind stack N (periphery, crouched and still: under the 0.2 leak by the numbers; the LD 15 check). Set up at stack N after he is back (A4-C7) |

### Cameras (device sheets)

| Camera | Mount (x, y, z), facing | Sees | Beaten by |
| --- | --- | --- | --- |
| `cam-a4-c1` | (111.5, 3.0, 39.8), 270 deg (west), sweep +-15, range 14 (was 18; master camera-range cut) | The main aisle x 93.5-111.5 and the east lane's north end | The loop, a jam (from the cross aisle, 15 m), a shot |
| `cam-a4-c2` | (96.75, 3.0, 43.6) on the mezzanine's south face, 180 deg (south), sweep +-10, aim 12, range 14 (was 18; master camera-range cut) | The cross aisle z 25.6-41 and its crossing of the back aisle and aisle 2 | As above (jam from the back aisle's west end is 18+ m: from x 92 in the back aisle) |
| `cam-a4-c3` | (76.4, 3.0, 33.0) over the wicket, 90 deg (east), sweep +-20, aim 8, range 14 (was 18; master camera-range cut) | The dock x 79.5-94 (the pair, the stacks, the main aisle's west end); under the mount (x 76-79.3) out of frame | As above (jam from the main aisle at x 88-94) |

All share `offFlag: 'a4-loop'`: the console loops them for 60 s (N3: the `looped` mode, view fade and LED), then they
come back on both pages; the console re-arms 20 s later. Mounts at 3.0 m keep the 3.3 m mezzanine deck out of every
frame.

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| A4 security room | 3 | The console loop (take the officer, use his desk) | Takedown, interrogation | The loop on | "We own the cameras now" |
| A4 goods floor and dock | 3 | Dual takedown (optional) | Timed crossing, light lure, jam fallback | Through the wicket | The first set piece (6-8 min): a clock, two men covering each other |
| L4 | 1 | - | - | Medkit, rest under the bridge | The first real release |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Security console, timed loop (N3) | Taught (C5) |
| Takedown from behind, grab, interrogate | Tested (the officer; his info plans the dock) |
| Dual takedown (two takedowns finished within 1.5 s) | Taught, optional (P10; banner only, no flag: ENGINE-ANSWERS Q11) |
| Light switch lure | Combined (the floor switch draws D1) |
| Held jammer on a camera | Combined (fallback when the loop ends) |
| Hide a body | Tested (D2 finds a body at the desk) |
| Crouch at silent gears on a loud floor | Tested (the mezzanine's chequer plate) |
| Stairs / high route | Used (mezzanine) |
| Push-bar egress | Used (the wicket) |
| Leg-up, relay, throw, hang-down, rope, paired hack, timed isolator | Not used here |
| Split jump, wall jump, pipes, ladders, ducts, rappel | Not used: racking is `noLedge` (never climbable, register A4-3); no believable element (SPEC 8) |

## 5. Tool / problem matrix

| Problem | Tools (at least three) |
| --- | --- |
| Three cameras over the floor | Console loop (60 s) / jam one at a time / the dark back aisle and the mezzanine dodge C1 (C2 still crosses) / shoot (loud) |
| The duty officer at the console | Takedown from behind (the L3 door is out of his cones) / lure with the room switch / the console waits until he is down (no other way) |
| The talking pair covering each other | Dual takedown from both stacks / the kettle break (D1 alone, then D2 at the kettle) / the floor switch lure (D1 to the switch) / a body found by D2 (re-hide) |
| A lit main aisle | The loop / the back aisle (dark) / the mezzanine / the floor switch (cuts 41, lures D1) |
| A loud mezzanine | Silent crouched gears / the back aisle instead / the cameras looped (only guards hear) |
| The loop running out | Re-loop (console re-arms 20 s after) / jam C3 from the main aisle / wait under C3's mount at the wicket |

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Main route passage mouth -> stack N | 38.9 m = 22.9 s at 1.7 m/s (18.5 s at 2.1) | Inside the 60 s loop with the takedown (SPEC "about 40 m") | Yes |
| Shadow route mouth -> stack S | 24.4 m = 14.4 s | 60 s | Yes |
| High route mouth -> stack N | about 68 m = 40 s | 60 s (slow by design) | Yes, barely: the dual takedown then needs a second loop or the kettle |
| Dual takedown | stacks 0.7 m behind each man; crouch spots (80.4, 36.2) and (79.6, 29.8) against the stacks' far faces, 1.84 m from the man (over-cover reach `TAKEDOWN.coverReach` 1.9; `pickTakedown` answers `overCover` there, A4-C7) | `takedown.reach` 1.8; window 1.5 s on finish times (Q11) | Yes |
| Officer approach | L3 door -> 1.8 m behind him: 2.9 m, outside his 100 deg periphery the whole way | `PERCEPTION.periphHalf` 100 deg | Yes |
| D2 kettle walk | 10.0 m each way (the office door detour) at 0.9 m/s; 5 s stop; 40 s period | SPEC 8 m, 40 s; LD stops 3-6 s | Yes |
| Lure range | floor switch -> D1 3.5 m, -> D2 6.3 m | Nearest calm guard within 25 m | D1 (D2 when at the kettle) |
| Racking aisles | 3.0 (back), 3.5 (aisle 2, cross aisle), 4 (east lane), 8.4 (main) | Aisles 3.0-3.5 (reach-truck) | Yes |
| Security room | 6.0 clear | Play space >= 6 m (SPEC draws it 6.6 for this) | Yes |
| Passage | 3.0 x 4.4 | Corridor >= 3.0 | Yes |
| Stairs | 20 x 0.165 rise, 0.285 run, 1.2 m wide | Scale sheet | Yes |
| Mezzanine edge 3.3 m | `noLedge` + handrail | Solo wall-jump band 2.7-3.8: no lip allowed | Yes |
| Camera mounts | 3.0 | `CAMERA.mountMin` 2.4-3.5; under the 3.3 deck | Yes |
| Cameras in A4 | 3 | Per-set budget 3 (PLAN 2); map 12 | Yes |
| Doors on the route | 6.6 m, 5.5 m apart | >= 5 m | Yes |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan) | Switch / reason | Lure |
| --- | --- | --- | --- | --- | --- |
| 40 | `a4-secroom` | switch | 2 panels (102, 2.95, 16.3), (105, 2.95, 16.3) | `a4-sw-sec` (101.2, 13.3), by the L3 door | officer |
| 41 | `a4-floor` | switch | 8 high-bays (y 7.2): dock (79.5, 33); main aisle (80, 39.8), (86, 39.8), (92, 39.8), (98, 39.8), (104, 39.8), (110, 39.8); east lane (110, 35.0); none reaches the back aisle pocket (built radius 9, intensity 1.15: radius 7 cannot reach a head 5.5 m below a lamp at 7.2) | `a4-sw-floor` (79.4, 37.85), on the pier east of the dispatch office door (A4-C8) | D1 (D2 when at the kettle) |
| 42 | `a4-aisles` | switch | 6 strips over aisle 2 (y 5.6): x 87.5, 90.5, 93.5, 100, 103, 106 at z 31.45 (R1 shades the back aisle) | `a4-sw-aisles` (76.3, 28.0), at the west end | D2 |
| 43 | `a4-mezz` | switch | 4 strips over the deck (y 6.3): x 89, 94, 99, 104 at z 46 | Two-way: `a4-sw-mezz-w` (87.0, 47.7), `a4-sw-mezz-e` (105.0, 47.7), on the north wall by the stair heads, switch height 4.5 m (A4-C8) | - |
| 49 | `a4-bulk` | dead | 0 lit (fittings at intensity 0 over the back aisle) | Motion sensors set off tonight | - |

- Zones (A4-C5): security room x 100-107, z 13-20 at 0.14 (`maxY` 2.9); passage x 101-104, z 20-24 (`maxY` 4.1);
  floor x 76-112, z 24-48 (`maxY` 7.4); mezzanine x 86-106, z 44-48 (`minY` 2.8). `MARLOW_ZONES` has one box
  [76, 13, 112, 48] up to 10 m, which wraps the plant room and the south gallery strip (LIGHTING-PLAN 6 "Zone overlap").
- Dark pocket: `a4-back` (x 84-110, z 24.3-27.3: the bulk-store row on motion sensors) <= 0.22 crouched.
- Light-test spots (`LIGHT_SPOTS`): main aisle (92, 39.8) >= 0.60 (pool); the dock between the men (80, 33) >= 0.60;
  aisle 2 (90.5, 31.45) >= 0.40; back aisle (90, 25.8) and its west end (84.5, 25.8) <= 0.22 crouched; with 41 off,
  (92, 39.8) and (80, 33) <= 0.24; the kettle (77.5, 39.5) <= 0.24 (the office is unlit; glazing passes some floor light);
  security room (103.3, 16.3) >= 0.40; mezzanine deck (96, 46, y 3.3) >= 0.40.
- Parity: the mezzanine strips must not lift the main aisle over 0.24 with 41 off; the passage under the gallery has no
  lamp (dark connector); the gallery glazing over the back aisle (z 24, y 4.5+) passes no gallery light (spill rule).
- Cameras ignore all of this (G240, rule 10): the back aisle is dark for D1 / D2, never for C2.

## 8. Objective steps (N1) and per-player lines

Roles (claim): `roles: [{ role: 'b', press: ['a4-console'] }]`: the first player to press the console takes B; the
other (the officer's taker) is A. Until then the lead (P2, even set) sees A. Check in e2e whether a refused press
(officer up) claims (A4-C9).

| Step | Shared | A | B | Done when | Timer |
| --- | --- | --- | --- | --- | --- |
| `a4-room` | Take the duty officer quietly, then loop the floor cameras from his desk. (73) | Take the officer from behind while your partner waits. (54) | Use the console once the officer is down. (41) | `{ flag: 'a4-loop' }` | - |
| `a4-floor` | The cameras are blind for sixty seconds. Cross to the dock. (59) | Main aisle: move fast while the cameras are looped. (51) | Back aisle or mezzanine: keep out of the lit rows. (50) | `{ flag: 'a4-west' }` (both west of x 84) | `g-a4-console` |
| `a4-dock` | Two at the dock desk. Take one each, together, or wait for the kettle. (70) | Take the man nearest the office when your partner is set. (57, A4-D4) | Take the man nearest the racking when your partner is set. (58, A4-D4) | `{ gate: 'g-a4-wicket' }` (the push bar pressed, A4-D3) | `g-a4-console` |
| `a4-lock` | Both of you into holding room four. There is a medkit there. (60) | - | - | Last line (L4 cycles) | - |

- Pass zone `a4-west` (both): box [76.3, 24.3, 84, 47.7], `floorY` 0 (the mezzanine and the west stair's upper part
  do not count; the stair foot at x 80.3 does).
- Radio: enter "The duty officer's console loops the floor cameras. Sixty seconds. Don't dawdle." (80); `a4-loop`
  set "Cameras looped. Go."; `warn:g-a4-console` "Cameras back in five."; after the dual takedown banner nothing new
  (no flag, Q11).

## 9. Co-op routes and timing (SPEC section 10: A4 target 2:15, min 1:20, max 3:30; cumulative 7:46)

### Route 1 (taught): officer, loop, cross, dual takedown, wicket

| # | Who | Action | Target | Running in A4 |
| --- | --- | --- | --- | --- |
| 1 | Both | L3's glass slot: the officer's back; open the door | 0:10 | 0:10 |
| 2 | A | Crouch 2.9 m to behind the officer; grab, interrogate (two lines, 2.6 s apart), knock out | 0:20 | 0:30 |
| 3 | B | Press the console (claims B): `a4-loop` set, C1-C3 looped 60 s | 0:05 | 0:35 |
| 4 | Both | Through the passage door and the passage to the mouth (7 m) | 0:10 | 0:45 (loop 10 s) |
| 5 | A, B | A: back aisle -> cross aisle -> main aisle -> crouch at stack N (38.9 m); B: back aisle -> stack S (24.4 m); `a4-floor` done when both are west of x 84 | 0:25 | 1:10 (loop 35 s) |
| 6 | Both | Read the pair (D2 at the desk), wait out a kettle walk if it is on, call it | 0:15 | 1:25 (loop 50 s) |
| 7 | A, B | Step in together (0.85 m each), two takedowns finished inside 1.5 s (banner) | 0:05 | 1:30 (loop 55 s) |
| 8 | Either | Push bar (`g-a4-wicket` opens, `a4-dock` done), both through onto L4's pad (C3 returns at 1:35; the door is under its mount) | 0:10 | 1:40 |
| 9 | Both | First-run slack: the interrogation, a kettle cycle, one re-loop (console re-arms 20 s after the loop) | 0:35 | 2:15 |

Sum 2:15 (target). Min 1:20 (no slack, a quick read). Max 3:30 (the loop runs out; back for a re-loop or a jam relay on
C3; a re-hide after D2 finds a body).

### Route 2 (kettle break): one at a time

Steps 1-5 as above. When D2 leaves for the kettle, A takes D1 at the desk from behind (from stack N, his back to it);
B follows D2 into the dark office and takes him at the kettle (his back to the door). Bodies to the office's west
corner. About 2:30.

### Route 3 (lure)

Steps 1-5; A (or B) switches the floor lights off at `a4-sw-floor` with D2 at the desk: the floor is dark, D1 walks
3.4 m to the switch with his torch; the switcher has stepped back into the strip behind the office (82.8, 44.5) and
takes him from behind at the switch; D2 turns to look (14 m) and then holds; B takes D2 from stack S. About 2:20. Note:
the cut floor makes the meter dark but never the cameras.

### Route 4 (high)

Steps 1-4; A or both by the east lane and the east stair, along the mezzanine (crouched: silent on the plate at gears
1-3), down the west stair, behind the office to stack N. About 40 s for the crossing: the loop runs out at the dock
(re-loop or C3 jam).

Way back (C5): the security room stays open (the route's one short return for a re-loop); the wicket is egress from
the floor side.

## 10. Self-critique (the 10 weakest points and the fix)

1. The dual takedown in a lit dock is hard: each man sees the other's attacker for about 0.5 s. Fix: stacks 0.7 m (as built)
   behind each man; the kettle and lure routes are the easier ways; the takedown stays optional (P10).
2. The monitor wall does not show the camera feeds (no feed render in the engine) (A4-C1). Fix: the observe beat moves
   to the passage mouth and the back aisle's west end; the monitor wall is lit screens (dressing).
3. The 60 s loop is generous for the main route and short for the high route. Fix: intended (fast vs slow); the re-arm
   (20 s) makes the return worth it.
4. D2's kettle path passes 1.8-2.1 m from A's crouch spot (A4-C7). Fix: the line tells A to wait until "your partner
   is set"; the LD 15 vantage check at that spot; built: the stacks moved 0.7 m nearer their men and the spots to their far faces (A4-C7).
5. The floor-switch lure picks D2 when he is at the kettle (nearest guard) (A4-C6). Fix: documented in the guard sheets;
   the radio does not promise D1.
6. The mezzanine is reachable only by stairs and its edge is a 3.3 m `noLedge` rail: no overwatch takedown from above.
   Fix: accepted (a takedown from above over a rail is not believable); the mezzanine is the quiet-cameras route.
7. "Both through the wicket" became "the push bar pressed" (A4-D3): a pair could open it and still be on the floor.
   Fix: `a4-lock` (L4 cycle) needs both anyway.
8. A dark pocket under the gallery glazing breaks SPEC 5's "no planned dark pocket within 4 m of a gallery wall"
   (A4-C3). Fix: the gallery lamps stop short of the glass (spill rule); the light test checks the pocket <= 0.22.
9. The officer stands (no seated pose in the engine) though SPEC says seated. Fix: dressing (a chair behind him);
   a seated pose is a Guard AI / animation item.
10. The A / B lines for the dock were SPEC's "by the desk / by the kettle" (both men stand at the desk). Fix: reworded
    by position (A4-D4); undo is SPEC's text.

## 11. e2e route (`scripts/e2e-ctcourse/a4GoodsShed.mjs`, part `:2`, two pages)

Pages: A = host (P1), B = client (P2). The host takes the officer (A), the client presses the console (B).

1. Start at L3's far door after A3; HUD `a4-room` on both pages (client shows A: even-set lead, unclaimed).
2. Console refusal: the client presses `c-a4-console` with the officer up: refused (`CONSOLE_GUARD_UP`); record
   whether it claimed B (A4-C9).
3. Host walks behind `a4-officer` (1.1 m) and grabs him from behind; interrogate: both info lines appear (the
   guard-info cases cut from `guardInfo.test.ts` are re-added as unit cases in `tests/ctcourse/a4GoodsShed.test.ts`);
   knock out.
4. Client presses the console: `a4-loop` set on both pages; C1-C3 in `looped` mode on both; the claim shows the client
   as B; HUD "Cameras back in" counting down on both.
5. Both teleport along the routes to stack N (host) and stack S (client); `a4-west` set, `a4-floor` ticks.
6. Dual takedown: both start a takedown from behind within 0.3 s of each other; assert both guards down and the dual
   counter up on the host (`duals`), the banner on both pages.
7. Client presses `c-a4-pushbar`: `g-a4-wicket` open, `a4-dock` ticks; both onto the L4 pad; L4 cycles; the medkit is
   there.
8. Loop timing: at 60 s after the press `a4-loop` clears and the cameras are back on both pages; a press at 70 s is
   refused (`CONSOLE_REARM`); at 80 s it loops again.
9. Light (LIGHTING-PLAN section 5): before step 6 on a restart pass, the back aisle (90, 25.8) reads dark on both pages;
   the floor switch darkens (92, 39.8) on both pages and `a4-dock1` heads for it.

Shot vantages: the security room door looking at the officer; the passage mouth looking west down the back aisle; the
main aisle's east end looking west to the dock.

## 12. Playtest checklist (Michael, desktop)

- From L3's slot and the passage mouth, can you plan the room and the floor before touching the console?
- Is the officer takedown and his two lines clear; does the console refusal explain itself?
- Is the 60 s loop readable (camera LEDs, the HUD seconds, LANTERN's five-second warning)?
- Did the dual takedown work for you; did "if one acts early the other reacts" feel fair?
- Did you find the kettle break or the lure on your own?
- Did the back aisle feel dark and the main aisle lit; did the mezzanine feel loud?
- Any route strictly best (main aisle vs back aisle vs mezzanine)?
- Did it feel like a real port warehouse with its CCTV office?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A4-D1 | Floor layout: back aisle, R1, aisle 2, R2, main aisle, mezzanine block on the north wall, cross aisle x 95-98.5, east lane, dispatch office in the north-west | SPEC gives rows east-west and aisle widths only | - |
| A4-D2 | Mezzanine x 86-106, z 44-48, stairs along the north wall at both ends (heads at x 86 and 106) | Keeps the main aisle open; the dispatch office in the north-west | - |
| A4-D3 | The dock wicket is L4's east door (facility), held by an egress gate on a push bar; `a4-dock` done = the gate open | A separate wicket in a set wall 1-2 m before L4's door breaks the 5 m door rule; SPEC's "both through the wicket" would equal the L4 cycle | A wicket in a set wall at x 82 with L4's door 6 m behind (shrinks the dock) |
| A4-D4 | Dock lines by position ("nearest the office" / "nearest the racking") instead of SPEC's "by the desk" / "by the kettle" | Both men stand at the desk; the lure needs D1 on the office side | SPEC's text |
| A4-D5 | Mezzanine edge `noLedge` with a handrail | A 3.3 m lip is solo wall-jump reach | - |
| A4-D6 | Officer kind `officer`; loaders `grunt` | SPEC rule 9 | - |
| A4-C1 | SPEC "the monitor wall (render: the floor cameras' views)" vs no feed render in the engine (`securityView.ts` draws camera bodies only) | Lit screens (dressing); vantages moved to the passage mouth and the back aisle | A feed render (new code, Future) |
| A4-C2 | `MARLOW_CIRCUITS` lure hint "D1 from (79.5, 33)" and switch hints vs the built points | Builder positions win (L-A6) | - |
| A4-C3 | SPEC 5 "no planned dark pocket within 4 m of a gallery wall" vs `a4-back` (z 24.3-27.3) under the south gallery glazing (z 24) | Pocket kept (SPEC A4 and LIGHTING-PLAN both name it); spill rule keeps it dark | Move the pocket to aisle 2 (then the shadow route crosses C2 in aisle 2) |
| A4-C4 | The staff passage (x 101-104, z 19.6-24) crosses the south service corridor (z 20-24) | `facility.ts` must break its corridor at x 101-104 (shared-file request to the job lead / 0d) | - |
| A4-C5 | `MARLOW_ZONES` A4 box [76, 13, 112, 48] up to 10 m wraps the plant room and the gallery strip; SPEC 7 asks per-level zones | Four zones asked of the lighting table's owner | - |
| A4-C6 | SPEC "the lure sends D1" vs the nearest-guard rule: while D2 is at the kettle, D2 is the nearer | Documented | - |
| A4-C7 | D2's kettle path passes 1.8-2.1 m from A's stack N spot | Set up after he returns; LD 15 check; built with the stacks 0.7 m nearer their men (over-cover reach) | The doc's z values (a step round the stack's end, about 2 m of crouch walk) |
| A4-C8 | LIGHTING hint switch points (floor (82.4, 36.6), aisles (77, 28), mezzanine (78, 46.4) / (110, 46.4)) vs the built doors and stair heads | Built points (L-A6) | - |
| A4-C9 | N1 "the first press of a named device takes the role": unclear whether a refused console press (officer up) claims | e2e records it; if it claims, the player who pokes it first becomes B | Claim on the `a4-loop` flag (no such claim kind) |

Register additions (SPEC 18, A4): A4-11 Pallet stacks 1.2 m at the dock (tonight's dispatch waiting: low cover). A4-12
Dock desk (the loaders' booking desk). A4-13 Dock roller shutter (closed, dressing). A4-6 amended: the wicket is L4's
door released by the push bar.
