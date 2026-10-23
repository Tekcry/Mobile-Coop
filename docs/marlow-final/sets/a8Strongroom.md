# A8 - Set 8, the Strongroom (set doc)

Status: SET DOC (PLAN.md slice 8 step 1), written 2026-10-23 by the A5-A8 set-doc agent, before any geometry.
Set id `a8Strongroom`; file `src/world/maps/ctcourseSets/a8Strongroom.ts`; plans `plans/a8Strongroom-ground.svg`,
`plans/a8Strongroom-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A8 sheet, route summary), 10, 12, 13, 14 (N2, N3,
N6), 15, 18 (A8 rows); LIGHTING-PLAN section 3 (A8) and `MARLOW_CIRCUITS` / `MARLOW_POCKETS`; GREYBOX-HELPERS.md (with
"Changes from the tests" and the job lead's corrections of 2026-10-23); ENGINE-ANSWERS.md (Q2 lure, Q6 revive, Q8 jam
line and grille, Q9 mains relock, Q10 panel height, Q11 dual takedown); `docs/level-design.md` section 13. Coordinates:
x east, z north, metres, floor y 0, yaw radians with 0 = +z; camera facings in degrees with 0 = +z, 90 = +x. Decisions
and contradictions: section 13 (`A8-D<n>` / `A8-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 8, the Strongroom (graduation). Ground (y 0) plus the public gallery and the security office (floor y 4.4). A Victorian bank's banking hall with oak counters and a night desk, the public gallery along the north wall and returning down the west wall over the vestibule, the security office at gallery level with its own stair down to the vault lobby, the vault lobby behind the public grille with its inner beam curtain and two time-lock panels, the vault and, beyond its open back, the cash dock. Set box x 106-150, z 50-78 (44 x 28 m); hall 9 m, office 3.0 m, vault lobby 5.5 m |
| New mechanic | None new: everything in sync. The leg-up split, the cross-level jam, the security office loop (N3, 60 s), the timed light and lock isolation (N2, 25 s, the `mains` grille), the partner throw, the paired hack (second scanner pair, N6), under two windows |
| Entry vantage | The vestibule under the gallery's return, (107.4, 64.5): N1 at the night desk and his sweep, N2's whole round (desk, grille, the south-east floor), C1's grid over the public floor, C2 high on the east wall over the gallery's last 8 m, the lighting board under the gallery, the grille. Dark (`a8-vest`, no fitting under the return) and out of N1's sweep (it covers the front, south-west to south-east) |
| Routes | Ghost (taught): "Boost me onto the gallery; you jam the gallery camera while I reach the office; I take the officer and loop the cameras; you kill the hall lights at the board and slip through the grille behind N2; I come down the office stair; I throw you over the beams; both time locks on the lamps." Takedown variant: "You take N1 when he comes to look at the board." Clear the hall: "Both on the floor: you take N1 from behind the desk, I take N2 at the talk, together." Gallery alternative: "The public stair at the lit front, while N1 looks south-west." Loud: "Shoot C2, or every chandelier (the grille opens for good)" (alarm stage, rating; host only today) |
| Loop | Round the counters (the main run and its return) on the floor; the under-gallery strip (z 75-77.8) and the vestibule join the west bays to the east side |
| Stepping stones | B: vestibule (107.6, 64.5) -> the leg-up mark (109.5, 68.25), 4 m, dark -> the jam spot behind the main counter (118.0, 67.2), 8.5 m, dark (`a8-west`) -> under the gallery to the board (126.4, 76.5), 17.6 m, under the slab -> the east side (132.9, 76) -> the grille (133.6, 62), 14 m in the made dark. A: the return and the north gallery behind the 1.2 m balustrade (25.6 m, dark west and middle bays) -> the pier at x 125 -> 9 m on the jam to the office door |
| Guards | `a8-night1` (N1, static post with head turns), `a8-night2` (N2, the hall patrol), `a8-officer` (seated, static). N1 covers N2's grille stop and the south-east floor (overlap, LD 4.5). Isolation moments: N1 at the board when lured; N2 at the grille while N1 is lured or down; the officer alone by design |
| Lights | Hall night circuit 81 (front chandeliers, counter lamps, the desk lamp; the lighting board isolator, 25 s, re-arm 5 s; the grille's `mains` gate reads it), gallery wall lights 82 (switch at the public stair head), security office 83 (switch by its door), vault lobby 84 (the time lock's circuit, no switch). The vestibule and the west bays have no fitting (the night circuit lights only the front). Chokepoint (the grille approach): darkened by the board or the jammer (one lamp at a time); avoided by the long way round the counters under the C1 loop |
| Surfaces | Marble hall floor (`tile`: loud at a run, quiet crouched); gallery oak boards (quiet); the security office carpet (quiet); the vault lobby's steel plate (`metal`, loud above crouched gears 1-3) |
| Toys | The board (isolator, lure), the gallery switch, the office switch, the chandeliers and counter lamps (jam, shoot), three cameras (jam, loop, shoot), the console, the grille (and its request-to-exit button), the office stair's foot door, the public stair |
| Hide spots | The vestibule; the west bays behind the main counter (`a8-west`); the board's west side under the gallery (dark when 81 is cut); the counter ends; the security office (once the officer is down). A body at the board, at the counters' east end or at the grille is on N2's loop (N2 passes W2 and the grille every 40 s); a body in the vestibule or the west bays is off it |
| Traversal elements | The gallery's open loading edge on the return (co-op lip 4.4, z 66-70.5); the public stair and the office stair (27 risers each); the throw over the inner beam curtain (`throwGateway`); the time locks (`syncStation`). Section 1.3 |
| Exit | Pinch point: the vault door (`flag` gate on `a8-sync`). Exit: through the vault's open back to the cash dock (x 150-160, z 58-66, the exit zone, facility.ts); both in the zone end the course (G138) |
| Tension | 5 |

### 1.1 Dimensions (6 m grid: x 106, 112, 118, 124, 130, 136, 142, 148; z 54, 60, 66, 72, 78)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set box | 106-150, 50-78 | hall 9.0 | Box-edge walls are `facility.ts`'s (L7 door x 106, z 59.1-60.9; the cash dock x 150-160; the north strip's glazed end bay looks in over the west wall above 4.5 m) |
| Banking hall | 106-134, 50-78 | 9.0, chandeliers | Its east wall x 134 (0.3) from z 50 to 71.4 with the grille gate; the office above from z 71.4 |
| Public gallery, north run | 106.2-134, 75-77.775 | slab 4.0-4.4 | Hand-built slab on columns (A8-C2), `noLedge`, `overhead`; 1.2 m solid balustrade (cornice) along its front edge z 75 except the public stair head (x 130.5-131.7). Columns 0.4 m at x 115, 121, 127, 133 on z 75 |
| Public gallery, west return | 106.2-109, 56-75 | slab 4.0-4.4 | Same slab; columns at (109, 56.2), (109, 62), (109, 68). Open loading edge along x 109 from z 66.0 to 70.5 (the co-op lip, drop chain dressing, P13); the balustrade on the rest of x 109 |
| Vestibule | 106.2-109, 56-75 under the return | headroom 4.0 | L7 opens into it at z 59.1-60.9. No fitting (`a8-vest`) |
| Under-gallery strip | 106.2-134, 75-77.775 under the north run | headroom 4.0 | The lighting board on the north wall at (127.0, 0.9, 77.6), facing south (`lightingBoard`) |
| Public stair | 130.5-131.7, 67.3-75.0 | 0 -> 4.4 | 27 risers of 0.163, run 0.285, rising north to the gallery; handrails both sides (`kit.handrail`); the steps over 1.9 m `noLedge` |
| Oak counters | main run 114.0-126.0, 65.5-66.24; return 125.26-126.0, 58.3-65.5 | 1.2 | `bankCounter` modules (2.38 x 0.74 x 1.19 collision), low cover. Main run starts at x 114 (A8-D2) |
| Night desk | 127.3-129.7, 70.0-70.9 | 0.75 | `nightDesk`. N1 behind it at (128.5, 71.6) |
| Security office | 134-144, 71.4-78 | floor 4.4, ceiling 7.4 | Floor a solid block to y 4.4 (closed back offices below), `noLedge`. Door `A8-office` on its west wall (x 134, z 76.0-77.2) from the gallery's east end. Console `a8-console` (143.7, 5.6, 74.7) on the east wall, the officer at (142.9, 74.7) facing east (his back to the door). Wall medkit `a8-medkit` (138.5, 5.6, 77.55). Stair-head door `A8-stair-top` on its south wall (z 71.4, x 142.6-143.8). 10 x 6.6 (SPEC 8 x 6.6, A8-C1) |
| Office stair | flight 134.5-142.2, 70.0-71.2; head landing 142.2-144.2, 68.15-71.4 (y 4.4); foot landing 134.3-135.5, 68.15-71.2 | 0 -> 4.4 | Enclosed stairwell along the vault lobby's north side, the flight against its north wall (2.15 m from the lobby wall, A8-C9), 27 risers, rising east. Foot door `A8-stair-foot` (z 68, x 134.4-135.6) into the lobby's outer zone: an `egress` door (push bar `a8-stair-bar` on the stair side) |
| Vault lobby | 134.15-145.85, 56.15-67.85 | 5.5 | Steel plate floor. Own ceiling and zone |
| Public grille | gate `A8-grille` on x 134, z 61.1-62.9 (1.8 m, maglocked, swing into the lobby) | 3.0 bars | `mains` gate on `a8-night`; opaque while shut (Q8). The fixed panels either side are the wall, panelled (A8-C12). Request-to-exit button `a8-rte` (135.9, 1.1, 67.85) on the lobby's north wall, 2.35 m from the hall side (A8-C9) |
| Inner beam curtain | x 140, z 56.5-67.5 (piers 0.5 m) | header 4.8 | `throwGateway`, three beams 0.35 / 0.9 / 1.45; `offFlag` `a8-sync` (the helper's release removed, A8-D4) |
| Time lock T1 (`a8-t1`) | (137.0, 1.2, 67.85) on the lobby's north wall, yaw pi (faces south); spot (137.0, 67.25) | - | Outer zone. Out of reach from the office stair (2.75 m) |
| Time lock T2 (`a8-t2`) | (145.85, 1.2, 59.6) on the lobby's east wall, yaw -pi/2 (faces west); spot (145.25, 59.6) | - | Inner zone, beside the vault door. 12.1 m from T1 |
| Vault door | `A8-vault` on x 146, opening z 61.3-62.7 (`vaultDoor` frame 2.4 wide) | 2.2 | `flag` gate on `a8-sync`; `vaultLeaf` turns with the door |
| Vault | 146.35-150, 58-66 | 3.0 | Deposit walls (`depositWall`) north and south; its back open to the cash dock |
| Closed areas | 134.15-149.8, 50.2-55.85 (back offices); 144.2-149.8, 66.15-77.8 (plant) | - | Solid, no doors on the route |

Doors and spacing: L7 door (106, 60) -> the office door (134, 76.6, upper floor): far apart; office door -> stair-top
door (143.2, 71.4): 10.6 m; stair-foot door (135, 68) -> grille (134, 62): 6.1 m; grille -> vault door (146, 62): 12
m. Every pair over 5 m.

### 1.2 Heights and lips

| Lip / top | Height | Builder | In `COOP_LIPS` | Note |
| --- | --- | --- | --- | --- |
| Return's open edge x 109, z 66.0-70.5 (`a8-gallery-lip`) | 4.4 | manual ledge on the hand slab (coopDeck's numbers) | Yes | The only lip in the band in A8 |
| Gallery front with balustrade, slab ends | 4.4 / 5.6 | slab `noLedge`, balustrade `noLedge` | No | P8: the balustrade hides a crouched A from the floor |
| Office floor block, stair-head landing | 4.4 | hand boxes, `noLedge` | No | In the band: `noLedge` required |
| Public stair steps over 1.9 m | 1.9-4.4 | `b.stairs`, `noLedge` on the high steps, handrails | No | No side lips on the flight |
| Counters, night desk | 1.2 / 0.75 | prop collision | No | Solo-standable tops (keep-clear below) |
| Columns | to the slab | hand boxes | No | No top exposed |

Keep-clear (`GREY_KEEP_CLEAR` 4.7 m) round the open edge (x 109, z 66.0-70.5) on the hall side: the main counter's west
end (114.0, 65.5) is 5.0 m away; nothing else over 0.3 m in x 104-113.7. Keep-clear (`BEAM_KEEP_CLEAR` 4.0 m) on the
beam curtain's approach side (x 136-140): only wall-mounted panels (T1, the request-to-exit button); no top over 0.3 m.

### 1.3 Greybox helper calls

```ts
throwGateway({ id: 'a8', at: { x: 140, z: 62 }, facing: '+x', gap: 11, span: 12, wallH: 5.5, header: 4.8, thick: 0.3,
  beams: [0.35, 0.9, 1.45], stand: 1.2 });
// piers z 56-56.5 and 67.5-68 (noLedge), header z 56.5-67.5 at 4.8-5.5; laser `laser-a8` (140, 56.5) -> (140, 67.5);
// spots: throw (138.8, 0, 62), runner (137.8, 0, 62), landing (142.0, 0, 62).
// Then drop the helper's release device `sw-a8-release` and its pickup gate, and set the laser's offFlag to
// `a8-sync`: the beams drop with the time lock (SPEC A8; A8-D4).

syncStation({ id: 'a8', kind: 'scan', a: { x: 137.0, z: 67.85, yaw: Math.PI }, b: { x: 145.85, z: 59.6, yaw: -Math.PI / 2 },
  y: 1.2 });
// 12.1 m: over syncMinGap('scan') 4.6, strictly (correction 6). Scanner `sc-a8`, flag `a8-sync`; the device keys
// renamed to SPEC-style `a8-t1` / `a8-t2` (A8-D5). Hack spots (137.0, 67.25), (145.25, 59.6).
```

The gallery is hand-built with `coopDeck`'s numbers (lip 4.4, one manual ledge on the open span, screens elsewhere,
`noLedge`) because the vestibule and the board sit under it and `coopDeck` is a solid block (A8-C2; helper request to
0g: a `solid: false` slab option). Hand data: the isolator `{ kind: 'isolator', id: 'g-a8-night', switchIds:
['a8-board'], group: 'a8-night', seconds: 25, rearm: 5 }`; the grille `{ kind: 'mains', id: 'g-a8-grille', group:
'a8-night', doorId: 'A8-grille' }` and its request-to-exit `{ kind: 'egress', id: 'g-a8-rte', switchId: 'a8-rte',
doorIds: ['A8-grille'] }`; the stair foot `{ kind: 'egress', id: 'g-a8-stair', switchId: 'a8-stair-bar', doorIds:
['A8-stair-foot'] }`; the vault `{ kind: 'flag', id: 'g-a8-vault', flag: 'a8-sync', doorId: 'A8-vault' }`; the console
`SecurityConsole { id: 'a8-console', guard: 'a8-officer', flag: 'a8-loop', seconds: 60, rearm: 20 }` with its pickup
gate `g-a8-console`.

## 2. Guard sheets

### `a8-night1` (N1)

| Field | Content |
| --- | --- |
| Guard | `a8-night1`, kind `grunt`, A8 squad, slot (128.5, 71.6), yaw pi |
| Job | The night desk clerk: signs in the cash crews, watches the front of the hall from the desk |
| Route | A post with head turns: `route: [[128.5, 71.6], [128.5, 71.6]]`, `waits: [6, 6]`, `faces: [pi + 0.6, pi - 0.6]` (south-west, then south-east, every 6 s) |
| What he sees | Focus 55 deg: facing south-west, the counters' east end, the public floor's middle and the public stair's foot; facing south-east, the grille (10.7 m, 8 deg off), the public floor's south-east and N2's SE point. Periphery to 12 m. Not the west bays (the jam spot (118, 67.2) is 33 deg past his south-west facing and 11.4 m away), not the gallery (the balustrade), not the under-gallery strip behind him |
| Gaps | Facing south-west (6 s of every 12): the grille approach is 70 deg off his facing (periphery only). Behind him (north) always |
| Isolation moment | At the board when lured (dark: 81 is cut; alone under the gallery, facing the board, his back to the counters): the takedown spot |
| Covered by / covers | He covers N2's grille stop and the south-east floor (facing south-east); N2 covers the desk's west side at the talk |
| Lures | The board (`a8-board`, 81 cut): 5.6 m from his post; he is the nearest calm guard unless N2 is at the talk (6.4 m: N1 still nearer, N2 turns to look). After `hearLook` 2.4 s he walks to the board (about 5 s at the investigate pace), takes his torch (head under 0.35 in the cut), looks 4 s, gives up within 20 s, walks back. The gallery switch (82) and the office switch (83) are upstairs (on another storey: he walks to the floor under them) |
| Search | After a sighting: round the counters and the desk (search ring 11 m). Nearest hide spots: the under-gallery strip, the counters' north side, the west bays |
| Body | A body at the board is found by N2 only if he is lured there; at the desk it is found by N2 at the talk (every 40 s) |

### `a8-night2` (N2)

| Field | Content |
| --- | --- |
| Guard | `a8-night2`, kind `grunt`, A8 squad, slot (126.4, 71.2) (TALK), yaw pi/2 |
| Job | The hall patrol: checks the public grille is locked, walks the front, talks to the desk |
| Route | `route: [[126.4, 71.2], [129.6, 66.5], [133.2, 62.0], [131.0, 58.5], [127.0, 66.9]]`, `waits: [5, 0, 5, 0, 0]`, `faces: [pi/2, NaN, pi/2, NaN, NaN]`. TALK = west of the night desk, facing N1; G = the grille (facing it: the gate is opaque while shut, so he sees the bars only); SE = the south-east floor; W2 = the counters' east end. Walk 29.2 m at 0.99 m/s = 29.5 s + 10 s of stops: cycle about 39.5 s |
| Timeline (t = leaving TALK) | 0-5.7 to W1 (south-east, past the stair foot). 5.7-11.5 to the grille. 11.5-16.5 G stop facing east. 16.5-20.7 south-west to SE. 20.7-30.1 north-north-west to W2 (his back to the grille). 30.1-34.5 north to TALK. 34.5-39.5 TALK facing east |
| What he sees | At G: the shut gate (nothing beyond); an open gate shows him the lobby (84 on) and anyone at T1 or the throw spot. At TALK: N1 and the desk's west side, the public stair. On the SE -> W2 leg: the counters' return and the public floor's middle |
| Gaps | t 16.5-40: away from the grille (t 20.7-34.5 walking away from it, his back to it) |
| Isolation moment | At the grille while N1 is lured to the board or down (N1 is the one who covers the grille): dark when 81 is cut |
| Covered by / covers | N1 covers his grille stop and his SE point (facing south-east). He covers the desk (the talk) and the counters' east end |
| Lures | The board: he is nearer than N1 only at the talk's start (6.4 vs 5.6 m: N1 is always nearer), so the board never brings N2; within 14 m he turns to look (at TALK, W1 and W2). A shot chandelier: the nearest calm guard |
| Search | After a sighting: the front (search ring 11 m). Nearest hide spots: the counters' return, the under-gallery strip |
| Body | His loop passes the grille, the counters' east end and the desk: a body there is found within one cycle |

### `a8-officer`

| Field | Content |
| --- | --- |
| Guard | `a8-officer`, kind `grunt`, A8 squad, slot (142.9, 74.7), `y` 4.4, yaw pi/2; seated at the console, static (no route) |
| Job | The vault company's duty officer at the CCTV console, back to the door |
| What he sees | The monitor wall (east). The office door is behind him (west) |
| Isolation moment | Always, by design (alone in the office) |
| Info lines (G206, P14) | "The board under the gallery kills the hall lights. The grille is on the same circuit." (85); "Both time locks turn together. The beams in the lobby drop with them." (69) |
| Lures, search, body | None planned (the office is upstairs and closed); a body in the office is found by nobody unless the alarm stage brings a search |

### Cameras (all three `offFlag` `a8-loop`; the console loops them for 60 s)

| Camera | Mount | Watches | Beaten by |
| --- | --- | --- | --- |
| `a8-cam1` (C1) | (120.0, 3.2, 50.4) on the hall's south wall, facing 0 deg, `aim` 8, `range` 16 | The public floor south of the counters (z 51-66) | The counters (crouched on their north side); the loop; a jam |
| `a8-cam2` (C2) | (133.75, 73.0) on the hall's east wall, `level` `a8-gallery` (floor 4.4, `levels: { 'a8-gallery': 4.4 }`), `y` 3.0 over it, facing 290 deg, `aim` 6, `range` 10 | The gallery deck's last 8 m (x 126-134) and the office door | The cross-level jam from the west bays (18.0 m); the loop (afterwards) |
| `a8-cam3` (C3) | (134.45, 3.2, 56.45) in the lobby's south-west corner, facing 45 deg, `aim` 8, `range` 14 | Both time locks, the throw spot, the beam curtain, the grille's inside | The loop (the sync must finish inside it) |

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| A8 the Strongroom | 5 | - (graduation) | Leg-up split, cross-level jam, security office loop, timed light and lock isolation with the lure, partner throw, paired hack, optional dual takedown, under two windows (60 s loop, 25 s lights) | The vault door swinging open and the walk out to the lit cash dock | "Everything at once, in sync": the pair run their own plan from the model, each window opened by the other |
| Cash dock | 1 | - | - | "ASSESSMENT COMPLETE" slot board; the course ends | Done |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Leg-up (and ledge relay) | Combined: the split onto the return's open span |
| Held jammer on a camera, cross-level | Combined: B on the floor jams C2 for A on the gallery |
| Takedown from behind | Combined: the officer (required for the console); N1 at the board (optional) |
| Security console loop (N3) | Combined: 60 s, re-arm 20 s |
| Timed light isolation (N2) and the lure | Combined: the board, 25 s; N1 walks to it |
| Timed lock (`mains`) | Combined: the grille opens while 81 is off |
| Egress (request-to-exit, push bar) | Used: the grille's button from inside; the office stair's foot door |
| Partner throw | Combined: over the inner beam curtain |
| Paired hack (N6 second pair) | Combined: the time locks |
| Dual takedown | Optional (clear the hall: N1 and N2 at the talk) |
| Doors | The office door, the stair doors, the grille (open and close from the door menu), the vault door on the sync |
| Crouch-walk at a silent gear | Tested on the lobby's steel plate and the marble at a run |
| Shoot a lamp / camera | Optional loud route (host only today) |
| Hang-down, rope | Not used here (P10: the rope could move here if Michael strikes it from A6) |
| Split jump, wall jump, pipes, ladders, ducts, rappel | Not used: no believable element (SPEC 8) |
| Revive | Tested in slice 9 on the gallery (2.8 m deep: room beside a downed player) |

## 5. Tool / problem matrix

| Problem | Tools (at least three) |
| --- | --- |
| The gallery (4.4 m, no stair at the dark end) | Leg-up / ledge relay / the public stair at the lit front (timed on N1's south-west look) |
| C2 over the gallery's last 8 m | B's cross-level jam / the loop (only after the office: too late) / shoot it (loud) |
| The duty officer at the console | Takedown from behind / interrogate first (his lines plan the next beats) / (no other way: the console needs him down) |
| The shut grille | The board (25 s, `mains`) / shoot every 81 lamp (open for good, loud) / the request-to-exit from inside once someone is through |
| N1 watching the front | The board's lure (N1 to the board) / his south-west look (timing) / take him at the board / dual takedown at the talk |
| N2's round past the grille | His 24 s away from it / close the grille behind you / take him at the grille while N1 is away |
| The beam curtain | The throw / the time lock (the beams drop with it) / walk them (alarm stage) |
| Two time locks 12 m apart across the beams | One player each / the ready lamps / nothing for one player (helper-proved) |
| C3 over both locks | The loop / a jam (a free hand needed: not during the hack) / the sync inside the loop |

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Gallery lip | 4.4 | `COOP_BAND` 4.3-4.5 | Yes |
| Leg-up mark | (109.5, 68.25), 0.5 m off the slab edge | `LEGUP_STANDOFF` 0.5 for a deck edge | Yes |
| Lip keep-clear | Main counter's west end 5.0 m | `GREY_KEEP_CLEAR` 4.7 | Yes (A8-D2) |
| Cross-level jam | (118.0, 1.0, 67.2) -> C2 lens (133.75, 7.4, 73.0): 18.0 m; the line passes south of the gallery slab and 3.6 m over the public stair | `JAMMER.range` 20; no glass, wall or slab on the line | Yes |
| A's hop under C2 | Pier (125, 76.4) -> office door (134, 76.6) 9.0 m at 1.7 m/s = 5.3 s | `JAM_WINDOW` 6.5 s | Yes (1.2 s for the door) |
| Board lure | Desk -> board 5.6 m; N1 arrives about 8 s after the press | `LURE_RANGE` 25 | Yes |
| B to the grille (ghost) | Board -> grille 19.5 m at 1.7 m/s = 11.5 s | 25 s cut | Yes (13 s spare) |
| B to the grille (takedown) | 8 s wait + 2 s takedown + 11.5 s = 21.5 s | 25 s cut | Yes (3.5 s spare; A8-C10) |
| A down the office stair | Console -> foot door about 13 m + 2 doors, about 9 s | Inside the loop | Yes |
| Throw | Thrower 1.2 m from the line, landing 2.0 m past, header 4.8 under the 5.5 ceiling | `throwGateway` tests | Yes |
| Beam keep-clear | No top over 0.3 m in x 136-140 | `BEAM_KEEP_CLEAR` 4.0 | Yes |
| Time locks | 12.1 m, hack 2 s inside 1.5 s | `syncMinGap('scan')` 4.6 strictly; `SCANNER` | Yes |
| Sync inside the loop | Loop start -> sync about 30-45 s | 60 s | Yes (15-30 s spare) |
| T1 from the office stair | 2.75 m horizontal | `INTERACT_REACH` 1.8 | Yes (A8-C9) |
| Request-to-exit from the hall | 2.35 m from a body at the gate | `INTERACT_REACH` 1.8 | Yes (A8-C9) |
| N2 cycle / stops | 39.5 s; 5 / 5 s | LD 4.3: 25-45 s; 3-6 s | Yes |
| N1 head turns | 6 s each | LD stops 3-6 s | Yes |
| Cameras in the budget | 3 | A8 budget 3; 12 per map | Yes |
| Guards | 3 alive | SPEC: at most 3 per set | Yes |
| Stairs | 27 x 0.163, run 0.285, 1.2 wide, handrails both sides | Scale sheet; LD 16.2.4 | Yes |
| Office | 10 x 6.6 (6.0 clear), 3.0 high | Play space 6 m clear | Yes |
| Vault lobby | 11.7 x 11.7, 5.5 high | Throw free air (`TEAM.throwUp` 2.2 over the thrower) | Yes |
| Doors | Office, stair, vault, grille 1.2-1.8 x 2.1-2.2 | Doors; 5 m apart | Yes |
| Pockets vs gallery glazing | `a8-vest` against the west wall under the end bay's glass | SPEC 5: 4 m rule | Shaded by the return's slab (A8-C8) |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan, y) | Switch / reason | Cut by | Lure |
| --- | --- | --- | --- | --- | --- | --- |
| 81 | `a8-night` | isolator | 3 front chandeliers (y 7.5, radius about 9, floor pool about 5): (130.0, 62.0), (124.0, 58.0), (128.0, 69.5); 3 counter lamps (y 1.4, radius 2): (121.0, 65.9), (124.8, 65.9), (125.6, 61.5); the desk lamp (128.5, 1.0, 70.4) | `a8-board` (127.0, 0.9, 77.6), the lighting board under the gallery: 25 s, re-arm 5 s (L-A2); the grille's `mains` gate reads the group | isolator, jam, shot (all seven shot: the grille open for good) | N1 (to the board) |
| 82 | `a8-gallery` | switch | 3 brass wall lights over the gallery's east bays (y 6.6, radius 3): (126.0, 77.6), (129.5, 77.6), (133.0, 77.6) | `a8-sw-gallery` (131.1, 5.6, 75.3), at the public stair head | switch, jam, shot | the nearest guard to the floor under it |
| 83 | `a8-office` | switch | 2 ceiling panels (y 7.2): (137.5, 74.7), (141.5, 74.7) | `a8-sw-office` (134.6, 5.6, 75.6), inside by its door | switch, jam, shot | none (upstairs) |
| 84 | `a8-vault` | device | 2 ceiling panels (y 5.3, radius 5): (137.0, 62.0), (143.0, 62.0) | None: on the time lock's circuit | jam, shot | none |

- Zones: set `ambientZone` x 106-150, z 50-78 at 0.14 (`minY` -1, `maxY` 8.9); gallery zone x 106-134, z 56-78, `minY`
  3.9, 0.14 (upper level); office zone x 134-144, z 71-78, `minY` 3.9, `maxY` 7.3, 0.14; vault lobby zone x 134-146,
  z 56-68, `maxY` 5.4, 0.14.
- Dark pockets (<= 0.22 crouched): `a8-vest` x 106.3-110, z 60-68 (no fitting under the return) and `a8-west` x 110-118,
  z 66.3-74.5 (the night circuit lights only the front; the west bays are unlit at night). Both as `MARLOW_POCKETS`.
- Light-test spots: the front (128, 66.5) >= 0.60 lit and <= 0.24 with 81 cut; the grille approach (133.0, 62.0) >= 0.60
  and <= 0.24 with 81 cut; the board's west side (126.0, 76.5) <= 0.40 lit and <= 0.24 cut; the jam spot (118.0, 67.2)
  and the leg-up mark (109.5, 68.25) crouched <= 0.22; the vestibule (107.6, 64.5) <= 0.22; the gallery's east bays
  (130, 76.4, y 4.4) >= 0.40; the office (139, 74.7, y 4.4) >= 0.40; T1 and T2 spots >= 0.40.
- Parity: the hall coves above the counters on 81 (they go dark in the cut); the gallery handrail LED line on 82; the
  ready lamps, the grille's lock bar and the vault's time-lock lamp are device emissives. The board's 25 s and its
  re-arm ride the isolator gate; a restart restores every group, relocks the grille and re-arms the console.
- Timed windows: the console's loop (`timer: 'g-a8-console'`, "Cameras back in N s") on the steps after the office; the
  isolator's 25 s shows on the board and in LANTERN's lines ("Lights back in five.", "Grille's locking again.").

## 8. Objective steps (N1) and per-player lines

Roles (claim): `roles: [{ role: 'a', zone: { box: [106.2, 56, 134, 77.775], y0: 3.9 } }]`: the first player onto the
public gallery takes A; the other is B (the floor player). Until then the lead (P2, even set) sees A.

| Step | Shared | A | B | Done when | Timer |
| --- | --- | --- | --- | --- | --- |
| `a8-split` | Split up: one onto the gallery, one stays on the floor. (55) | Take the boost to the gallery at the dark west end. (51) | Boost your partner up, then keep to the counters. (49) | `{ flag: 'a8-gal1' }` (one player on the gallery) | - |
| `a8-office` | Get to the security office unseen and loop the cameras. (55) | Reach the office on your partner's jam, then take the officer. (62) | Jam the gallery camera from the floor for your partner. (55) | `{ flag: 'a8-loop' }` | - |
| `a8-grille` | Kill the hall lights to open the grille. Sixty seconds on the loop. (67) | Come down the office stair into the vault lobby. (48) | Isolate the hall lights at the board, then slip through the grille. (67) | `{ flag: 'a8-lobby' }` (both in the vault lobby) | `g-a8-console` |
| `a8-beams` | Over the beam curtain to the second time lock. (46) | Throw your partner over the beams. (34) | Land by the vault door and take time lock two. (46) | `{ flag: 'a8-inner1' }` (one player east of x 140.4) | `g-a8-console` |
| `a8-sync` | Both time locks together, on the ready lamps. (45) | Hack time lock one on your partner's count. (43) | Hack time lock two on your partner's count. (43) | `{ flag: 'a8-sync' }` | `g-a8-console` |
| `a8-out` | The vault is open. Both of you out to the cash dock. (52) | - | - | Last line (both in the exit zone) | - |

- Pass zones: `a8-gal1` (`any: true`) box x 106.2-134, z 56-77.775, `floorY` 4.4; `a8-lobby` (both) box x 134.3-145.7,
  z 56.3-67.7, `floorY` 0; `a8-inner1` (`any: true`) box x 140.4-145.7, z 56.6-67.4, `floorY` 0.
- Radio: enter "Last one. Everything you've done tonight, in one room. Take your time." (70); `warn:g-a8-night` "Lights
  back in five." (20); on the restore "Grille's locking again." (23); `warn:g-a8-console` "Cameras back in five." (21);
  on `a8-sync` "Vault open. Well done, both of you." (35).

## 9. Co-op routes and timing (SPEC section 10: A8 target 3:30, min 2:15, max 5:30; cumulative 17:57, then the dock)

### Route 1 (taught, ghost): split, jam, loop, isolate, throw, sync

| # | Who | Action | Target | Running in A8 |
| --- | --- | --- | --- | --- |
| 1 | Both | Through L7's door into the vestibule; the vantage (107.4, 64.5) | 0:10 | 0:10 |
| 2 | Both | Watch N2 round once (39.5 s); N1's head turns; C1-C3's grids; the board and the grille | 0:40 | 0:50 |
| 3 | A, B | To the leg-up mark (109.5, 68.25), 4 m; B boosts A onto the return's open span (claims A; `a8-split` ticks) | 0:06 | 0:56 |
| 4 | A, B | A crouches north along the return and east along the north gallery behind the balustrade to the pier at x 125 (25.6 m); B to the jam spot (118.0, 67.2) behind the main counter (8.5 m) | 0:18 | 1:14 |
| 5 | B, A | B jams C2 (18.0 m); A crosses the last 9 m to the office door and in (5.3 s + the door) | 0:08 | 1:22 |
| 6 | A, B | A takes the officer from behind (interrogate first if wanted: his lines). B (in parallel) under the gallery to the board's west side (126.4, 76.5), 17.6 m | 0:08 | 1:30 |
| 7 | B, A | B watches N2: when N2 walks toward the grille (t 0-6), B calls; A presses the console (`a8-loop`, 60 s; `a8-office` ticks) and heads for the stair | 0:25 | 1:55 |
| 8 | B | N2 stands at the grille (t 11.5-16.5): B presses the board (81 cut 25 s, the grille unlocked; N1 walks to the board) | 0:05 | 2:00 |
| 9 | B, A | B goes at once east under the gallery, behind N1's walk, and down the east side (x 132.9) behind N2's back (19.5 m, 11.5 s); opens the grille, through, closes it. A down the office stair and through the foot door into the outer zone (about 9 s); `a8-grille` ticks | 0:15 | 2:15 |
| 10 | A, B | A at the throw mark (138.8, 62), B at the runner spot; the throw; B lands at (142.0, 62) (`a8-beams` ticks) | 0:06 | 2:21 |
| 11 | A, B | A to T1 (5.5 m), B to T2 (3.9 m); both ready lamps; hack together (`a8-sync`: the vault door opens, the beams drop) | 0:08 | 2:29 |
| 12 | Both | Through the vault's open back to the cash dock (8 m); both in the exit zone (`a8-out`; the course ends) | 0:06 | 2:35 |
| 13 | Both | First-run slack: a missed N2 window (a second wait at step 7 or 8, up to one cycle) or one re-jam | 0:55 | 3:30 |

Sum 3:30 (target). Min about 2:15 (no watch at step 2 and N2's window on arrival: about 2:00-2:15). Max 5:30 (the loop
runs out: C3 returns and a hack in its view raises the alarm stage; A climbs the office stair again through the open
foot door and re-loops after the 20 s re-arm; or the lights restore with B outside: the grille relocks; B isolates
again after the 5 s re-arm).

### Route 1b (takedown at the board)

As route 1 to step 8; B stays at the board's west side; N1 arrives about 8 s after the press, faces the board with his
torch; B takes him from behind (the lured isolation moment), then the grille (11.5 s): through about 21.5 s after the
press (3.5 s spare). N1 down also frees the public stair and the front for the rest of the run.

### Route 2 (clear the hall)

Both on the floor (no split yet): B along the under-gallery strip to behind N1 (128.5, 74.5); A along the strip and
south to (124.6, 72.0), west of N2's talk spot. At N2's talk (t 34.5-39.5, N2 facing east, N1 facing south) both take
their man inside 1.5 s (the dual takedown banner; Q11: any two takedowns by different players within 1.5 s). Then the
gallery by the public stair (no N1), the office (C2 still sees the gallery: B jams it), the loop, the board (no lure
needed) and the grille at leisure (N2 down). About 3:00.

### Route 3 (gallery by the public stair)

A goes up the lit public stair while N1 looks south-west (the stair foot is 2.8 m east of the desk: 20 deg off his
south-west look in the periphery, 6 s per turn): risky; it lands A on the gallery's last 4 m, under C2 (B's jam still
needed).

### Route 4 (loud)

Shoot C2 (alarm stage) or all seven 81 lamps (the grille opens for good: `groupBaseOn` false; N1 investigates the
shots). Host only today (SPEC 7, 21).

Way back for a lone or downed player (C10): the public stair from the gallery; the office stair down; the grille's
request-to-exit from inside; the beams drop with the time lock; a downed player on the gallery is revived from the
gallery (slice 9).

## 10. Self-critique (the 10 weakest points and the fix)

1. The sequence is long and gated twice on N2's 40 s cycle (the console call, the board press): a first run will wait.
   Fix: the slack row; the L7 model and the officer's lines give the plan; if it drags, drop N2's talk stop (cycle
   about 34 s).
2. The cross-level jam is 18 m, near the 20 m range edge, from one spot. Fix: the jam spot is named by the B line and
   striped (P16); any spot in the west bays' east half (x 116-118) works; the e2e pins the line.
3. The ghost route has B pass behind N1's lured walk in the dark at 2-3 m. Fix: N1 walks with his torch (looking where
   he walks) and B is behind him; route 1b (the takedown) is the safe variant.
4. An open grille shows N2 the lobby on his next grille stop; a careless pair is spotted from the hall. Fix: the
   B line says "slip through"; LANTERN's "Grille's locking again"; closing it is one door-menu press.
5. A on the gallery is hidden by the balustrade from the floor, so only C2 matters up there (P8). Fix: as designed;
   the cross-level jam is the lesson.
6. The dual takedown is on the floor, not "A drops from the gallery onto N2" (A8-C3). Fix: a drop needs a second 4.4 m
   hang edge at the lit front (a co-op lip in the band): not planned; Route 2 keeps the dual takedown.
7. The office stair and the office moved from SPEC's boxes (A8-C1): the stair now lands in the outer zone. Fix: the L7
   model shows it; the register row is amended.
8. The grille's fixed panels are wall, not bars (A8-C12): a "grille" that is only a gate. Fix: dressing draws bars on
   the gate and brass panelling on the wall; the gate is opaque while shut as Q8 says.
9. T1 sits 2.5 m from the stair foot door: A can hack from the doorway's lee, but C3 still covers it. Fix: as designed
   (the loop is the cover).
10. Shots are host only. Fix: Future (SPEC 21); no exercise needs a shot.

## 11. e2e route (`scripts/e2e-ctcourse/a8Strongroom.mjs`, part `:4`, two pages)

Pages: host (P1) and client (P2). Pass 1: the host is A (gallery), the client is B (floor). Pass 2 (claim swap): the
client takes the boost first and the HUD shows the client as A on both pages; then the grille relock check.

1. Start at L7's far door after A7 (or "Start at" A8); HUD `a8-split` on both pages (A8 even: client shows A until the
   claim).
2. Both to the leg-up mark; client braces, host takes the leg-up onto the return: `a8-gal1` set, `a8-split` ticks, the
   claim shows the host as A on both pages.
3. Client to the jam spot (118.0, 67.2); host to the pier (125, 76.4, y 4.4). Client jams `a8-cam2`: C2 jammed on both
   pages; host walks to the office door within the window: no camera detection counted.
4. Host takes `a8-officer` from behind; host presses `c-a8-console`: `a8-loop` set on both pages, C1-C3 in the looped
   mode on both, the HUD shows "Cameras back in" on both; `a8-office` ticks.
5. Wait for `a8-night2` at the grille stop (route index 2, read on the host; the client in the dark at the jam spot), then
   the client to the board's west side; client presses `c-a8-board`: group `a8-night` off on both pages; the grille unlocked; `a8-night1` heads for the board; a
   second press does nothing.
6. Client walks the east side to the grille (teleport legs allowed in the dark), opens it, steps in, closes it. Host
   down the office stair: the push bar `c-a8-stair-bar` opens the foot door. `a8-lobby` set; `a8-grille` ticks.
7. Client requests the throw at the runner spot; host throws: client lands within 0.5 m of (142.0, 62); no laser alarm;
   `a8-inner1`; `a8-beams` ticks.
8. Both hack (`c-a8-t1` host, `c-a8-t2` client) starting 0.5 s apart: `a8-sync`; `laser-a8` off; `A8-vault` unlocked;
   `a8-sync` ticks; the loop still running (HUD seconds > 0).
9. Both through the vault into the cash dock's exit zone: the course ends (both in, G138) on both pages.
10. Pass 2 (restart A8): the client takes the boost (claim: client A). Grille relock: the host (B in this pass) presses the
    board, opens the grille, steps through, leaves it open; after 25 s the group is lit on both pages and the gate is
    locked but stays open (Q9); close it from the door menu: shut and locked; press `c-a8-rte` from inside: it opens
    (egress). Assert `c-a8-rte` cannot be used from the hall side of the gate (2.35 m).
11. Unit cases (`tests/ctcourse/a8Strongroom.test.ts`, moved from `tests/scanners.test.ts` / `tests/guardInfo.test.ts`):
    `A8_SCANNERS` (ids, flag, spacing strictly over `syncMinGap`), the `a8-officer` info lines (90 characters or
    less), the gallery lip in `COOP_LIPS` and `soloJumpThreats` empty, `BEAM_KEEP_CLEAR` on the curtain's approach
    side, T1 out of reach from the office stair, C2's `level` and mount height (`validateSecurity`).

Shot vantages: the vestibule (107.4, 64.5) looking east over the counters; the gallery pier (125, 76.4, y 4.4) looking
east at C2 and the office door; the outer zone (137.0, 64) looking east over the beams at the vault door.

## 12. Playtest checklist (Michael, desktop)

- From the vestibule (and the L7 model), can you plan the whole sequence and read N1, N2 and the cameras in one cycle?
- Does the split feel good: A up and away, B with a real job (the jam, then the board)?
- Is the 25 s cut long enough to reach the grille, and does the lure (N1 to the board) read?
- Is the 60 s loop a fair pressure, or too tight / too loose for the throw and the sync?
- Does closing the grille behind you feel like a choice, or a chore?
- Is the dual takedown at the desk ever used, or is the ghost route strictly best?
- Can one player do any step alone (the grille from the hall, both time locks, the beams)?
- LD 13: any detection you could not understand; did it feel like a Victorian bank at night, and like a finale?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A8-D1 | The gallery is a hand slab on columns with `coopDeck`'s numbers (lip 4.4, one manual ledge, balustrade, `noLedge`) | The vestibule and the board are under it; `coopDeck` builds a solid block (helper request to 0g: a slab option) | A solid north gallery and the board on its face; the vestibule moves out from under the return |
| A8-D2 | Main counter starts at x 114 (5 m from the lip) | `GREY_KEEP_CLEAR` 4.7: a 1.2 m counter top 2.6 m from the lip is a solo jump to it | - |
| A8-D3 | Board at (127.0, 0.9, 77.6) (LIGHTING hint (118, 74.4)) | 5.6 m from N1 (a short lure) and 19.5 m from the grille (inside the 25 s with a takedown) | (118, 77.6): the takedown variant then misses the cut |
| A8-D4 | The helper's beam release removed; `laser-a8` `offFlag` `a8-sync` | SPEC: "the beams drop with the time lock" | - |
| A8-D5 | Time-lock ids `a8-t1` / `a8-t2`, scanner `sc-a8` (renamed from `syncStation`'s keys) | SPEC-style names in the tests | Keep the helper's names |
| A8-D6 | Isolator re-arm 5 s | L-A2 (`MARLOW_CIRCUITS`); SPEC gives none | Edit `timed` |
| A8-D7 | Guards kind `grunt`; N1 a two-point post with 6 s turns; the officer static with `y` 4.4 | SPEC rule 9; `SquadSlot` posts | - |
| A8-D8 | The console timer shows on the steps after `a8-office` | The loop is the window that ends the run's chance; the 25 s cut shows on the board and in radio | Timer `g-a8-night` on `a8-grille` |
| A8-C1 | SPEC: office stair "x 142-145, z 68-77, one straight flight down south" into the vault lobby; that lands at x 142-145, inside the inner zone past the beam curtain (x 140), so the throw would be pointless | Stairwell along the lobby's north side (z 68.15-71.4), flight descending west to a foot door at x 134.4-135.6 (outer zone); the office widened to x 134-144 to reach the stair head | SPEC's stair and the curtain moved east of x 145 (then T2 has no room) |
| A8-C2 | SPEC: the vestibule "under the gallery's return"; GREYBOX-HELPERS: "the A8 split uses `coopDeck`" (a solid block to the floor) | Hand slab (A8-D1) | - |
| A8-C3 | SPEC: "A drops from the gallery onto N2, the existing drop takedown"; N2's talk spot is 3.8 m south of the gallery front, and a hangable gallery edge at the lit front would be a second 4.4 m lip in the co-op band | The dual takedown is done with both on the floor (Route 2) | A planned second lip over the desk (in `COOP_LIPS`) |
| A8-C4 | SPEC: N2's "40 s loop hall -> grille, 5 s stop at the grille, 5 s talk at N1's desk" | Kept: 39.5 s | - |
| A8-C5 | SPEC: T1 and T2 "13.6 m apart" | 12.1 m (T1 on the north wall out of the stair's reach, T2 beside the vault door) | - |
| A8-C6 | SPEC: "B jams C2 (about 15 m)" from behind the counters out of N1's sweep | 18.0 m from (118.0, 67.2): the nearest counter spot out of N1's sweep and periphery | - |
| A8-C7 | `MARLOW_CIRCUITS` board at (118, 74.4) with N1's lure "from [128, 64]" | N1's desk at (128.5, 71.6) by the lit front and the public stair; the board at (127, 77.6) (A8-D3). Shared file: reported | - |
| A8-C8 | SPEC 5: no dark pocket within 4 m of a gallery wall; the north strip's end bay looks into A8 over the west wall, and `a8-vest` sits against it | The return's slab is between the end bay's glass (above 4.5 m) and the vestibule (under 4.0 m): no spill reaches it; the light test samples it | - |
| A8-C9 | Course devices have no side and `Interactables.nearest` has no line-of-sight test (GREYBOX-HELPERS change 5): a request-to-exit by the gate and a T1 over the stair would be pressed through the wall | The request-to-exit 2.35 m from the hall side; the office stair's flight 2.75 m from T1 | - |
| A8-C10 | SPEC: "B hides or takes him there" | The takedown variant fits the 25 s with 3.5 s spare; the ghost route has 13 s spare | Board nearer the grille |
| A8-C11 | SPEC: "A loops again (the office stair, 10 m)"; the office stair's foot door "opens only from the office side" | It stays open once A came down (doors stay open until closed); if shut, the way up is lost for that try | A two-way staff door with a keypad (Future) |
| A8-C12 | SPEC: "the public grille (3 m bars at x 134)"; Q8: no see-through leaf exists, and a fixed bar panel built as `b.fence` would pass sight while the gate does not (LD 2.5) | Only the gate carries bars (opaque while shut); the rest of x 134 is wall, panelled | Fence-mesh panels and accept the gate's difference |
| A8-C13 | A camera on the gallery: `CameraDevice.y` is the mount over its level's floor and `validateSecurity` checks it against 2.4-3.5 | C2 `level: 'a8-gallery'` with `levels: { 'a8-gallery': 4.4 }` and `y` 3.0 (world 7.4) | - |

Register additions / changes (SPEC 18, A8): A8-2 amended: "Public gallery on columns (slab), cornice and balustrade,
open loading edge on the return z 66-70.5". A8-4 amended: "Security office 10 x 6.6 at gallery level; office stair in
an enclosed stairwell along the vault lobby's north side, foot door with a push bar". A8-6 amended: "Public grille gate
1.8 m on the night circuit, request-to-exit button inside". A8-12 Lighting board under the gallery at (127, 77.6) (the
hall's night-circuit isolator). A8-13 Wall medkit in the security office (F6). A8-14 Closed back offices and plant
(x 134-150 south and north-east): solid, no doors.
