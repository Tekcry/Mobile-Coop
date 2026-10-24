# A2 - Set 2, the Carriage Shed (set doc)

Status: SET DOC (PLAN.md slice 2 step 1), written 2026-10-23 by the A1-A4 set-doc agent, before any geometry. Amended
2026-10-23 for Michael's walk of 4.82.0 (`plans/WALK-4.82.md` X2b, X3): the neck has two lanes behind four closures, two
overwatch guards stand on the staging deck and being spotted fails the set (A2-D7 to A2-D10); sections 1, 2, 6-9, 11
and 13 below carry the change.
Set id `a2CarriageShed`; file `src/world/maps/ctcourseSets/a2CarriageShed.ts`; plans `plans/a2CarriageShed-ground.svg`,
`plans/a2CarriageShed-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A2 sheet, route summary), 10, 12, 13, 14 (N2),
15, 18 (A2 rows); LIGHTING-PLAN section 3 (A2) and `MARLOW_CIRCUITS` / `MARLOW_POCKETS`; GREYBOX-HELPERS.md (with
"Changes from the tests"); ENGINE-ANSWERS.md (Q2 lure, torches); `docs/level-design.md` section 13. Coordinates: x
east, z north, metres, floor y 0, yaw radians with 0 = +z. Decisions and contradictions: section 13 (`A2-D<n>` /
`A2-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 2, the Carriage Shed. Ground (y 0) plus the cleaning staging (y 4.4). A night freight siding: three roads, two short rakes of box vans, the shunting neck between them, the shunter's cabin, the carriage-cleaning staging. Set box x 28-70, z 0-20 (42 x 20 m); roof tie 7 m, ridge 9 m |
| New mechanic | Teaches timed light isolation (N2, the lure comes with it). Combines the leg-up (staging) |
| Entry vantage | From L1's door (x 28, z 11) to the mouth of the road 2 / road 3 gap at (33.5, 12.5), crouched: the neck, the shunter's post and loop, both cabinets' status lamps (cabinet 2 in sight from the vantage down the gap). Concealed by distance and stance (17.5 m from his post: a crouched still body fills under the 0.2 leak), and by road 2's van for most of his loop (P1) |
| Routes | Shadow (taught): "You cut the neck at cabinet one and wait in the coat corner; I cross the dark neck to cabinet two; then I cut it for you." High: "Leg-up at the staging's west end, crouch along behind the screens, down the east stair" (behind the two watchers). Loud: "Shoot the four high-bays" (host only until the client-shot fix; the shunter investigates). Secret: "Out of the cabin's back door, along the south cess behind road 1's vans" (to the closure at x 45.5; the neck is entered through the two gaps only) |
| Loop | The neck has two lanes (walk482): the road 1 / road 2 gap (z 6.3-8.7, the shunter's beat) and the road 2 / road 3 gap (z 11.3-13.7, the taught crossing). The south cess (z 0.25-3.7) and the north walkway (z 16.3-17.5) are closed at the rakes' neck ends (A2-D7); each runs only as far as its closure |
| Stepping stones | Shadow route: vantage (33.5, 12.5) -> the west gap 2/3 (41, 12.5), 7.5 m, hidden from the watchers by the road 3 van -> the dark neck when cut (10 m along z 12.5) -> the east gap 2/3 (56-66), occluded -> cabinet 2 (69.4, 13.4). Gaps of 10 m or less, each a van side or the made dark |
| Guards | `a2-shunter`, `a2-watch-w`, `a2-watch-e` (section 2): three guards, the cap. The two watchers never leave the deck; being spotted (any squad guard alerted) fails the set (A2-D8). Isolation moments: at cabinet 1 when lured (lit cabin, A behind him in the dark corner) and at the east end of his loop (66, 7.5) |
| Lights | Shed general 20 (switch by the west door), neck high-bays 21 (two-way isolators, 15 s, re-arm 3 s), cabin 22 (switch by the cabin door), staging 23 (switch at the east stair head). Chokepoint (the neck): darkened by the isolators or the jammer (one high-bay at a time) or shots; avoided by the staging (LD 5.2) |
| Surfaces | Ballast between the rails, 2 m wide on each road (`gravel`, loud x1.3); concrete cess, walkways and aprons (quiet); staging deck chequer plate (`metal`, loud x1.6). At crouched gears 1-3 every surface is silent; ballast and plate punish a walk or a run |
| Toys | Two isolators (cabinets 1, 2), the shed switch, the cabin switch, the staging switch, four high-bays (jam / shoot), the cabin's back door, the leg-up mark |
| Hide spots | The cabin's coat corner `a2-coat` (x 28.3-29.6, z 3.6-4.9, dark pocket); the road 2 / 3 gap of each rake (z 11.3-13.7); the north walkways behind road 3's vans (z 16.3-17.5). A body left in the neck or the cess is on the shunter's loop; a body in the coat corner is out of it |
| Traversal elements | Staging 4.4 m open loading edge x 31-35 (co-op lip, `coopDeck`), east stair, vans `noLedge` on 5.0 m centres (2.4 m gaps: no split gap), wheel stops 0.3 m. Section 1.3 |
| Exit | Pinch point: the east apron (x 66-70). Checkpoint: L2 (x 70-76, z 7-13) by its 1.8 m sliding door at x 70, z 9.1-10.9. L2's glass slot shows A3's west lobby and the camera at the far end of the corridor |
| Tension | 2 |

### 1.1 Dimensions (6 m grid: x 30, 36, 42, 48, 54, 60, 66; z 6, 12, 18)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set box | 28-70, 0-20 | roof tie 7, ridge 9 | Box-edge walls are `facility.ts`'s (L1 x 28, L2 x 70, shell z 0, gallery strip z 20) |
| Roads 1, 2, 3 | centres z 5, 10, 15, x 28.5-69.5 | rails flush | Ballast strips z c-1.0 to c+1.0 (`gravel`) |
| West rake vans (14) | 36-46, z c-1.3 to c+1.3 | 3.4 | One van per road, `noLedge`, 10 x 2.6 x 3.4 (A2-D1). Van gaps 2.4 m |
| East rake vans (14) | 56-66, as above | 3.4 | As the west rake |
| Wheel stops (5) | x 32.6-33.4 (west) on each road and 68.6-69.4 (east) on roads 1 and 3, 1.6 m wide | 0.3 | Low stops, not buffer beams (keep-clear, A2-D2); the buffer beam is drawn without collision. Road 2's east stop is not built: it stood in the L2 door's approach (A2-D10) |
| The neck | 46-56, 0-20 | - | 10 m open crossing under four high-bays; two lanes lead in (gap 1/2 and gap 2/3) |
| Neck closures (4) | x 45.5-46.0 and 56.0-56.5; south cess z 0.25-3.7, north walkway z 16.3-17.5 | 2.5 (cess), 4.4 (walkway, up to the deck) | `noLedge` solids at the rakes' neck ends (A2-D7), dressed with sheeting, plinth, stanchions, rails and a hazard board (visual skins) |
| Shunter's cabin | 28-32, 1-5 | 2.6, flat roof | 0.15 m walls, every piece `noLedge`. Door north face x 30.4-31.6 (z 5); back door east face z 2.0-3.2 (x 32). Inside: desk, cabinet 1, coat hooks in the north-west corner |
| Cabinet 1 (`a2-iso-1`) | (30.6, 1.2 y, 1.6) on the cabin's south wall, yaw 0 (faces +z) | device | Isolator push station, status lamp (device emissive) |
| Cabinet 2 (`a2-iso-2`) | (69.4, 1.2 y, 14.2) on the east wall, yaw -pi/2 (faces -x) | device | 4.2 m north of the L2 door |
| Staging | 30-62, 17.5-20 | 4.4 deck, 1.2 screens | `coopDeck` (below). Solid block to the floor, `noLedge`. Open loading edge x 31-35 (drop chain dressing, P13); screens on the rest of the edge |
| East stair | 62-69.7, 18.8-20 | 0 -> 4.4 | 27 risers of 0.163, run 0.285, rising west (foot at x 69.7). Handrails both sides |
| West end of the staging | x 30, z 17.5-20 | - | Barrier and permit-to-work board: the west stair is removed for repair (A2-D3) |
| North walkway | 30-45.5 and 56.5-66, 16.3-17.5 | - | 1.2 m between road 3's vans and the staging face (no split: van faces 3.4 < 3.6); closed at the neck ends by the closures |

Doors and spacing: L1 door (28, 11) to the cabin door (31, 5): about 6.7 m; L2 door (70, 10) to cabinet 2 (4.2 m, a
device, not a door). Doors on the route: L1 -> L2 (42 m of open floor).

### 1.2 Heights and lips

| Lip / top | Height | Builder | In `COOP_LIPS` | Note |
| --- | --- | --- | --- | --- |
| Staging open edge x 31-35 (`a2-stage-lip`) | 4.4 | `coopDeck` manual ledge | Yes | The only lip in the band in A2 |
| Staging screened edge, ends | 4.4 / 5.6 | `coopDeck` (`noLedge`, screens) | No | No unplanned lip |
| Van tops | 3.4 | hand boxes, `noLedge` | No | Under the band; noLedge over the mantle (no solo climb, no boost target) |
| Cabin roof | 2.6 | hand box, `noLedge` | No | - |
| Wheel stops | 0.3 | hand boxes | No | At 0.3: not a solo jump top |

L2's near door (x 70, z 9.1-10.9) has a clear approach from the east rake's end: nothing stands in x 66-70, z 9.1-10.9
(A2-D10).

Keep-clear (`GREY_KEEP_CLEAR` 4.7 m) round the open edge x 31-35, z 17.5 on the floor side: the road 3 west wheel stop
(33, 15) is 0.3 m (excluded, top not over 0.3); road 3's van (from x 36) is `noLedge` over the mantle (excluded). No
crates or bins on the floor x 26-40, z 12.8-17.5.

### 1.3 Greybox helper call

```ts
coopDeck({ id: 'a2-stage', at: { x: 46, z: 17.5 }, facing: '+z', span: 32, depth: 2.5, lip: 4.4,
  open: [-15, -11], screen: 1.2, stair: 'end', stairW: 1.2 });
// deck x 30-62, z 17.5-20; lip a2-stage-lip x 31-35 -> COOP_LIPS; legUp spot (33, 0, 17.0);
// stair x 62-69.7 along the back (z 18.8-20), 27 risers; wayBack: the east stair
```

The isolator gate (N2) is hand data: `{ kind: 'isolator', id: 'g-a2-neck', switchIds: ['a2-iso-1', 'a2-iso-2'],
group: 'a2-neck', seconds: 15, rearm: 3 }` (timings from `MARLOW_CIRCUITS`, L-A2).

## 2. Guard sheets

### `a2-shunter`

| Field | Content |
| --- | --- |
| Guard | `a2-shunter`, kind `grunt`, A2 squad, slot (51, 10), yaw -pi/2 (facing west along road 2) |
| Job | The yard shunter: walks the neck and checks the couplings on the east rake between moves |
| Route | `route: [[51, 10], [56, 7.5], [66, 7.5], [56, 7.5]]`, `waits: [4, 0, 3, 0]`, `faces: [-pi/2, NaN, pi/2, NaN]` (at the post he looks west down road 2; at the east end he faces the east wall, his back to the neck). Walk 31.2 m at the patrol walk (0.9 x 1.1 = 0.99 m/s) = 31.5 s + 7 s of stops: cycle about 38.5 s (A2-C1) |
| What he sees | At the post: focus 55 deg cone west to 25 m (road 2 and the van ends; the vantage's gap mouth sits at 8 deg off his line but 17.5 m out); periphery to 12 m. On the cess legs he looks along the cess between road 1 and road 2's vans. At (66, 7.5) he faces the east wall: the neck is behind him |
| Gaps | The 3 s stop at (66, 7.5) and the 10 s walk back: the neck behind him. The 4 s post stop: the neck in front |
| Isolation moment | At cabinet 1 when lured (alone, in the lit cabin facing the cabinet, A crouched in the dark coat corner 1.5-2 m behind him: the takedown spot). Also at (66, 7.5), his back to the set |
| Covered by / covers | One guard: none |
| Lures | Isolator press (`lightsOut` at the press point, the nearest calm guard within 25 m): cabinet 1 reaches him at the post (22.1 m) and on the legs west of about x 54.5; from (56, 7.5) it is 26.1 m (no lure) and from (66, 7.5) 36 m. Cabinet 2 reaches him at the post (18.9 m) and anywhere on his loop. The shed (20), cabin (22) and staging (23) switches lure him the same way (each within 25 m of part of his loop). A jammed lamp lures nobody (ENGINE-ANSWERS Q2) |
| Lured path | Post -> the cess between road 1 and road 2's vans (z 7.5) west -> (35, 7.5) -> cabin door (31, 5.3) -> cabinet 1 (30.6, 2.4): about 24 m at the investigate pace (1.08 m/s) after `hearLook` 2.4 s: arrives about 25 s after the press. In the cut neck his head reads under 0.35, so he takes his torch (keeps it to 0.45): it points along the cess, away from the neck crossing. He looks 4 s at the cabinet and gives up within 20 s, then walks back to his post |
| Search | After a sighting: the rakes' gaps and walkways (search ring to 11 m). Nearest hide spots: the coat corner, the road 2 / 3 gaps, the north walkways |
| Body | A body in the neck, the cess or the east apron is on his loop or his walk back |

### `a2-watch-w` and `a2-watch-e` (walk482 X2b)

| Field | Content |
| --- | --- |
| Guard | `a2-watch-w` (48.0, y 4.4, 17.9) and `a2-watch-e` (54.0, y 4.4, 17.9), kind `grunt` (armed), yaw pi (facing south over the neck); slots 2 and 3 of the A2 squad after the shunter (the e2e helpers read the first live guard) |
| Post | `{ leash: 0, highSecurity: true, guards: 'a2-neck' }`: they turn on the spot and never leave the deck; the board never sends them; a cut neck only lures them to look |
| Job | Overwatch of the staging: they stand behind the 1.2 m screens (z 17.6) with their eyes at 6.0 m over the lit neck |
| What they see | The lit neck at 5-8 m: the whole crossing along z 12.5 and all four lane mouths, at standing and crouched head heights (static sight rays in `tests/ctcourse/a2CarriageShed.test.ts`). In the cut neck the light is under the cut band, so a dark crossing is not seen |
| Hidden from them | The west gap 2/3 (x 41 and west, the centre line to x 43: the road 3 van hides it; from x 42 the east watcher looks in diagonally along the gap's south side), the cabin corner, cabinet 1 and cabinet 2 spots, the vantage |
| Rule | Being seen by any squad guard (alerted) restarts the set from its start, both players back in L1 (`BayDef.spotFail`, A2-D8). LANTERN: "Spotted. Back to the start of the set." |
| Fallback | If a playtest shows a watcher seeing a crouched player in the dark at 5-8 m: move both posts 1 m back (z 18.9) or change the yaw (plan X2) |

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| A2 the Carriage Shed | 2 | Timed light isolation; the lure that comes with it | Leg-up (staging) | The dark neck once crossed; the second pass is the mirror | "Kill the lights, I'll cross": the first live guard, beaten by the pair's timing |
| L2 | 1 | - | - | Lobby; the camera seen through the glass | Breathe; a camera next |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Timed isolator (N2) | Taught (C2) |
| Light switch / lights-out lure | Taught with the isolator; three plain switches as toys |
| Takedown from behind, carry and hide a body | Tested (the coat corner) |
| Crouch-walk at a silent gear | Tested (ballast and chequer plate punish faster gears) |
| Leg-up, ledge relay | Combined (staging, C3) |
| Lip hang / shimmy | Optional (along the staging's open edge) |
| Held jammer | Optional (a high-bay, about 10 s dark per 5 s jam; no lure) |
| Shoot a lamp | Optional loud route (host only today) |
| Doors | The cabin's two doors (stealth open, bash); L1 / L2 slide doors |
| Partner throw, hang-down, rope, paired hack, console, dual takedown | Not used here |
| Split jump, wall jump, pipes, ladders, ducts, rappel | Not used: vans on 5.0 m centres (2.4 m gaps, faces 3.4 m) avoid accidental split gaps; no believable element otherwise (SPEC 8) |
| Revive | Tested in slice 9 on the staging (deck 2.5 m deep: room beside a downed player) |

## 5. Tool / problem matrix

| Problem | Tools (at least three) |
| --- | --- |
| The lit neck (a chokepoint crossing) | Isolator (cabinet 1 or 2) / jam one high-bay at a time / shoot the high-bays / avoid by the staging / wait for his back at (66, 7.5) |
| The shunter on his loop | Lure him to cabinet 1 and take him from the coat corner / lure him to cabinet 2 and cross behind / time his east stop / avoid him on the staging |
| One player cannot isolate and cross | Partner isolates / two-way cabinets (each side cuts for the other) / the staging (leg-up and relay) |
| A 4.4 m staging edge, west stair removed | Leg-up / ledge relay / (way down) the east stair |
| A body | Coat corner (off his loop) / the gaps between vans / leave it and be quick |
| Loud floors (ballast, plate) | Silent crouched gears / the quiet cess and walkways / the jam-free darkness when cut |

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Neck crossing | 10 m at 1.7 m/s = 5.9 s | Inside the 15 s cut (9 s spare) | Yes |
| Solo isolate and cross | Cabinet 1 -> the east rake's west end by route 28.5 m = 16.8 s | Over the 15 s cut (one player cannot) | Yes |
| B's run press -> cabinet 2 | from the west gap (41, 12.5) along z 12.5: 28.4 m = 16.7 s | Cabinet 2 ready at 18 s (15 + 3) | Yes (B waits under 4 s; walk482) |
| Neck lanes | 2 (gap 1/2 z 6.3-8.7, gap 2/3 z 11.3-13.7), measured at x 45.75 and 56.25 | Was 4 (cess, 2 gaps, north walkway); test `the neck has two lanes` | Yes |
| Overwatch | 2 watchers, eye 6.0 m (deck 4.4 + 1.6) at (48, 17.9) and (54, 17.9) | Both see z 12.5 at x 47-55 and the four lane mouths at head heights 1.05 and 1.7; neither sees the west gap x <= 41, the cabin corner or cabinet 2 | Yes |
| Squad | 3 guards | `SET_GUARDS_MAX` 3 | Yes |
| L2 door approach | open floor along z 9.4, 10, 10.6 from x 66.4 to 69.7 | Road 2's east stop removed | Yes |
| Lure range, cabinet 1 | 22.1 m from the post | `LURE_RANGE` 25 | Yes (only near the post) |
| Lure range, cabinet 2 | 18.9 m from the post | 25 | Yes |
| Shunter's arrival at cabinet 1 | about 25 s | After the cut ends (15 s): he arrives in a lit cabin, no torch | Yes |
| Cycle / stops | 38.5 s; 4 s and 3 s | LD 4.3: 25-45 s; 3-6 s | Yes |
| Staging lip | 4.4 | `COOP_BAND` 4.3-4.5 | Yes |
| Leg-up mark | (33, 17.0), 0.5 m off the deck face | `LEGUP_STANDOFF` 0.5 for a deck (the wall correction is `boostWall` only) | Yes |
| Deck depth / stair | 2.5 m / 1.2 m | Stair width <= depth; 27 x 0.163 rise, 0.285 run | Yes |
| Vans | 3.4 tall, 2.4 m gaps | Split gaps need faces >= 3.6 m and 1.2-1.95 m apart | No split gap (as planned) |
| Walkway | 1.2 m | Between van and deck faces (3.4 / 4.4) | No split (van under 3.6) |
| Takedown from the coat corner | Corner (28.95, 4.25) to behind him at the cabinet (30.6, 3.2): 1.9 m, one step | Takedown reach 1.8 m | Yes (one step out) |
| Cabin | 4 x 4 | Play space >= 6 m (A2-C3) | Accepted: a real shunter's cabin, tight camera space |
| Doors | L1, L2 1.8 m (facility); cabin doors 1.2 x 2.1 | Door 1.2 x 2.1 | Yes |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan, y) | Switch / reason | Cut by | Lure |
| --- | --- | --- | --- | --- | --- | --- |
| 20 | `a2-shed` | switch | 6 strips on wires under the tie (y 6.5): (34, 10), (41, 7.5), (41, 12.5), (61, 7.5), (61, 12.5), (68, 10); reach stops short of the neck (x 46-56) | `a2-sw-shed` (28.6, 6.6), by the west door | switch, jam, shot | shunter (within 25 m) |
| 21 | `a2-neck` | isolator | 4 high-bays on the tie (y 6.8): (48.5, 6), (53.5, 6), (48.5, 14), (53.5, 14) | Cabinets `a2-iso-1` (in the cabin), `a2-iso-2` (by the east door): 15 s, re-arm 3 s, two-way | isolator, jam, shot | shunter (cabinet 1 from the post only) |
| 22 | `a2-cabin` | switch | 1 panel over the desk (30.6, 2.5, 2.5); the coat corner stays dark | `a2-sw-cabin` (31.6, 4.4), inside by the cabin door | switch, jam, shot | shunter |
| 23 | `a2-staging` | switch | 4 strips under the staging roof (y 7): (36, 19), (44, 19), (52, 19), (60, 19) | `a2-sw-staging` at the stair head (62.3, 19.4, y 4.4) (A2-C4) | switch, jam, shot | shunter |

- Zones: set `ambientZone` x 28-70, z 0-20 at 0.14 (`minY` -1, `maxY` 6.9); staging zone x 30-62, z 17.5-20, `minY`
  3.9, 0.14 (upper level, SPEC 7).
- Dark pocket: `a2-coat` (cabin coat corner, reason: the panel lamp is over the desk) <= 0.22 crouched.
- Light-test spots (`LIGHT_SPOTS`): neck centre (51, 10) and B's crossing line (51, 12.5; was z 16.9 until walk482) >= 0.60 lit,
  <= 0.24 with 21 cut (the crossing spots keep their names: 'A2 neck crossing', '... cut', '... west cut', '... east cut'); the rake gap (41, 12.5) >= 0.40; the vantage (33.5, 12.5) >= 0.40 (concealed by stance and distance, P1); cabinet
  1 standing spot (30.6, 3.0) >= 0.40 (no torch for the lured shunter); coat corner (28.95, 4.25) crouched <= 0.22;
  staging deck (46, 18.7, y 4.4) >= 0.40; cabinet 2 (68.8, 14.2) >= 0.40.
- Parity: every high-bay accent line (if any) on 21; the hall coves above the staging on 23 or 20; restart restores
  21 and re-arms the gate (N2).
- Timed window line: "Lights back in N s" (N1, `timer: 'g-a2-neck'`); radio `warn:g-a2-neck` "Lights back in five."

## 8. Objective steps (N1) and per-player lines

Roles (claim): `roles: [{ role: 'a', press: ['a2-iso-1'] }]`: the first player to press cabinet 1 takes A; the other
is B. Until then the lead (P2, even set) sees A.

| Step | Shared | A | B | Done when | Timer |
| --- | --- | --- | --- | --- | --- |
| `a2-neck` | Cut the neck lights and cross while the shunter checks. (55) | Isolate the neck lights at cabinet one, then hide in the cabin corner. (70) | Wait at the van ends, then cross the dark neck to cabinet two. (62) | `{ flag: 'a2-east1' }` (one player east of x 56) | `g-a2-neck` |
| `a2-back` | Now the other way round. (24) | Cross behind the shunter while your partner isolates. (53) | Isolate at cabinet two so your partner can cross. (49) | `{ flag: 'a2-east' }` (both east of x 56) | `g-a2-neck` |
| `a2-lock` | Both of you into holding room two. (34) | - | - | Last line (L2 cycles) | - |

- Pass zones: `a2-east1` (`any: true`) and `a2-east` (both), box x 56-70, z 0.3-19.7, `floorY` 0 (a player on the
  staging counts only once down the east stair, whose foot is at x 69.7). `PassZone.any` counts any player, not B by
  role (A2-C5).
- Radio: enter "The neck is on two isolators. Fifteen seconds of dark each time. Use them well." (79); then "Press while
  the shunter stands at the neck, or he won't come and look." (70, A2-D5); then "Two spotters on the staging. Seen in
  the neck lights and we start again." (79, walk482); `warn:g-a2-neck` "Lights back in five."

## 9. Co-op routes and timing (SPEC section 10: A2 target 1:45, min 1:00, max 3:00; cumulative 3:37)

### Route 1 (taught): isolate, cross, take him, isolate back

| # | Who | Action | Target | Running in A2 |
| --- | --- | --- | --- | --- |
| 1 | Both | Through L1's door to the vantage (33.5, 12.5); watch the loop | 0:10 | 0:10 |
| 2 | A, B | A into the cabin to cabinet 1 (9 m); B along the west gap 2/3 to (41, 12.5), out of the watchers' sight (8 m) | 0:10 | 0:20 |
| 3 | B calls | Wait for the shunter at his post (B stays out of the lit neck: the watchers see anyone standing in the light): half a cycle on average | 0:15 | 0:35 |
| 4 | A, B | A presses cabinet 1 (claims A; neck dark 15 s; the shunter is lured); A to the coat corner; B crosses the neck along z 12.5 (5.9 s, dark, under the watchers), on along the east gap 2/3 to cabinet 2 (`a2-neck` done at about 0:42) | 0:16 | 0:51 |
| 5 | A | The shunter arrives at cabinet 1 (about 25 s after the press, lit cabin); A takes him from behind, leaves him in the corner | 0:12 | 1:03 |
| 6 | A | Out of the cabin, north to the west gap 2/3 (41, 12.5) (14 m) | 0:13 | 1:16 |
| 7 | B, A | B presses cabinet 2 (ready since 0:53); A crosses the dark neck and joins B (`a2-back` done) | 0:14 | 1:30 |
| 8 | Both | To the L2 door (5 m), open, both onto the pad | 0:10 | 1:40 |
| 9 | Both | First-run slack | 0:05 | 1:45 |

Sum 1:45 (target). Min about 1:00 (no wait at step 3, no slack, the takedown skipped by crossing on the shunter's way
back). Max 3:00 (one failed crossing and a re-hide, or Route 1b).

### Route 1b (no takedown, the SPEC's mirror)

Steps 1-4 as above; A stays in the coat corner while the shunter looks (4 s) and gives up; he walks back to his post
(about 24 s). A follows to the west gap 2/3 (41, 12.5). With him back at the post, B presses cabinet 2: the lure
(18.9 m) sends him east toward cabinet 2; B walks south to the east apron's south corner (68, 4.5) out of his path;
A crosses the dark neck behind him (his torch points east). Both into L2 while he checks cabinet 2 (or one takes him
from behind there: his second isolation moment). About 2:30.

### Route 2 (high, slower, no light play)

Leg-up at the mark (33, 17.0) (claims nothing: no device pressed; the swap rule keeps the lead as A); relay the second
player up; both crouch along the deck behind the screens (27 m, about 16 s, chequer plate silent at crouched gears
1-3), passing behind the two watchers (they face south over the neck); down the east stair; both east of x 56 on the floor ticks both steps; L2. About 1:30.

Way back for a lone or downed player (C2, C3): both rakes are ground level; the cabinets re-arm; the east stair from
the staging; revive on the staging from the deck (slice 9).

## 10. Self-critique (the 10 weakest points and the fix)

1. The lure only works while the shunter is near his post (25 m); a press at the wrong time cuts the lights and brings
   nobody. Fix: LANTERN's second line; B's line says "wait"; the cut still lets B cross (the lure is a bonus).
2. The vantage is lit and only concealed by stance and distance (P1). Fix: the light test and the LD 15 e2e check a
   crouched still player there for a full cycle; fallback: a dark pocket at the gap mouth (P1 undo).
3. SPEC's 30 s cycle cannot be walked to x 66 at the patrol pace (A2-C1). Fix: 38.5 s with the same route (inside LD
   25-45); turning at x 63 gives about 34 s if Michael wants it shorter.
4. The isolator cuts for a press made by either cabinet, so a careless second press is wasted (no extension). Fix:
   the status lamps (amber while re-arming) and the HUD seconds left.
5. The staging route skips the whole lesson. Fix: it is slower (about 1:30 with the relay) and SPEC lists it as the
   high route; e2e drives the taught route.
6. The cabin is 4 x 4 (A2-C3): the takedown is in a tight camera space. Fix: `camSpaces` tight box for the cabin; the
   corner is 1.9 m from the shunter's spot.
7. The removed west stair is a change from SPEC's padlocked stair (A2-D3). Fix: dressing tells it (barrier, permit
   board, the landing's bolt holes); undo: a gated stair with full-height mesh.
8. One van per road per rake is thin as a "rake" (A2-D1). Fix: dressing adds coupled stock beyond the box walls (a
   painted backdrop of vans on the L1 / L2 walls) if it reads empty.
9. After a takedown in route 1 the second isolation lures nobody: the mirror pass teaches nothing new. Fix: route 1b
   is the full mirror; both pass the step; the e2e covers both lure directions (cabinet 1, then cabinet 2 in 1b).
10. The shot route is host only (a client's shot lamp relights in 2 s). Fix: Future item (SPEC 21); no exercise needs
    a shot.

## 11. e2e route (`scripts/e2e-ctcourse/a2CarriageShed.mjs`, part `:1`, two pages)

Pages: A = host (P1), B = client (P2). The client presses cabinet 1 (as LIGHTING-PLAN section 5 asks), so the client is
A; the host isolates in the second pass (the jobs swap on the step).

1. Start at L1's far door after A1; HUD `a2-neck` on both pages (client shows A as the even-set lead).
2. Client to cabinet 1's standing spot (30.6, 3.0); host to the west gap 2/3 (41, 12.5).
3. Wait until the host's `a2-shunter` is within 25 m of cabinet 1 (read on the host).
4. Client presses `c-a2-iso-1`: within one course message `a2-neck` group off on both pages; HUD "Lights back in" on
   both; the claim shows the client as A on both pages; a host press on `c-a2-iso-2` now does nothing (the gate's
   timer unchanged); `lightLevel` at (51, 12.5) <= 0.24 on both pages; the shunter is investigating and his distance
   to cabinet 1 falls.
5. Host walks to x 57 (teleport legs allowed) -> `a2-east1`, `a2-neck` ticks.
6. Client to the coat corner; when the shunter is within 1.8 m of the cabinet, client takes him from behind; assert down.
7. At 15 s the group is lit on both pages; at 18 s host presses `c-a2-iso-2`: cut again on both pages.
8. Client to x 57 -> `a2-east`, `a2-back` ticks; both onto the L2 pad; L2 cycles.
9. Restart check (before step 8 on a second pass, or a separate pass): press cabinet 1, then `restartCheckpoint`
   mid-cut: the group lit and the gate ready on both pages; the shunter respawned at (51, 10).
10. Route 1b variant (optional, if part `:1` time allows): no takedown; cabinet 2 pressed with him at the post: he
    heads for cabinet 2.

Shot vantages: the vantage (33.5, 12.5) looking east down the gap; the east stair head looking west along the staging.

Walk482 changes to the route (`scripts/e2e-ctcourse/a2CarriageShed.mjs`): step 2 expects three fresh calm guards (the shunter at his post, two
posted watchers on the deck, no body); new step 2b "spotted": the client stands in the lit neck at (51, 12.5), the host's
`mode.restarts` rises by one, the client is back at the set start on both pages, the "Spotted" line reaches both pages
(`radioLine` on the host, `wire.rl` on the client) and three fresh calm guards stand again; steps 3-6 use the crossing
line z 12.5 and the host waits in the west gap 2/3 (41, 12.5); each dark crossing asserts restarts unchanged and no
watcher alerted. The step needs slice S2's rule (`bay.spotFail`); the e2e is run on the laptop queue after both slices land.

## 12. Playtest checklist (Michael, desktop)

- From the vantage, can you read the shunter's loop and both cabinets' lamps within one cycle?
- Is the 15 s window right: does B cross with a few seconds spare, and does it feel tense?
- Does the lure read: does he come to cabinet 1 when you press at the right time, and is it clear why he does not
  when you press late?
- Does the coat corner work as the takedown spot (dark on the meter, he stands with his back to it)?
- Is the torch in the cut neck fair (he looks where he walks)?
- Is the staging route found, and is it slower than the light relay?
- Any way to isolate and cross alone? Any way onto the staging alone (wheel stops, vans)?
- LD 13: any route strictly best; did the shed feel like a real night siding?
- Walk482: does being seen in the lit neck restart the set at once and clearly? Can you cross the dark neck along gap 2/3
  under the two watchers without being seen? Is the L2 door approach clear? Does the neck read as two lanes?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A2-D1 | One 10 m van per road per rake: west x 36-46, east x 56-66 (SPEC "rakes at x 30-46 and x 56-68") | SPEC's 16 m and 12 m spans hold one 10 m van each; x 30-36 stays clear for the cabin, the wheel stops and the staging's leg-up | Add half-van "flat wagons" (under 1.2 m, `noLedge`) in the spare length |
| A2-D2 | Buffer stops are 0.3 m wheel stops (collision), the buffer beam drawn without collision | A 1.1 m buffer stop at (33, 15) is a solo jump top 2 m from the staging lip (`GREY_KEEP_CLEAR` 4.7) | Real buffer stops `noLedge` and taller than the mantle (1.9 m), which looks wrong |
| A2-D3 | Staging z 17.5-20 (SPEC z 17-20) and the west stair removed for repair (SPEC: a padlocked permit gate) | 1.2 m walkway in front of the deck (no slot); a gated stair is mantle-able over its 1.1 m handrail (a solo way up); the stair would leave the set box (x 22-30) | A gated west stair with full-height mesh both sides inside x 30-37.7 (staging then starts at x 37.7) |
| A2-D4 | Device ids `a2-iso-1` / `a2-iso-2` (as `MARLOW_CIRCUITS`), not SPEC's `a2-iso1` | One id across the lighting table and the course | Rename in both |
| A2-D5 | Extra LANTERN line on the press timing | The 25 m lure reaches him only near his post | Drop the line |
| A2-D6 | Shunter, kind `grunt` | SPEC rule 9 | - |
| A2-C1 | SPEC: cycle 30 s on a loop to x 66 and back; at 0.99 m/s that walk alone is 31.5 s | 38.5 s used (LD 25-45) | Turn at x 63 (about 34 s) |
| A2-C2 | SPEC: cabinet 1 to far cover "26 m by route"; the built route is 28.5 m | Either way over 15 s at 1.7 m/s | - |
| A2-C3 | SPEC 5 "play spaces >= 6 m" vs the 4 x 4 cabin | Accepted: a real cabin, not a play space | - |
| A2-C4 | LIGHTING hint switch spots (staging switch (66.5, 18.5)) vs the built stair head at x 62 | Builder positions win (L-A6) | - |
| A2-C5 | SPEC "B east of x 56" vs `PassZone.any` (any player, no role check) | The first across ticks it, whoever | A role-checked pass zone (new code) |
| A2-C6 | SPEC section 5 "no planned dark pocket within 4 m of a gallery wall": none in A2 (coat corner is at z 3.6-4.9) | - | - |
| A2-D7 | Four `noLedge` closures at the rakes' neck ends (x 45.5-46.0 and 56.0-56.5): the south cess z 0.25-3.7 to 2.5 m and the north walkway z 16.3-17.5 to the deck's 4.4 m (walk482 X2b) | Michael's walk of 4.82.0: "too many lanes. Needs to be more linear": four floor lanes into the neck become two (gap 1/2, the shunter's beat and lured walk, and gap 2/3, the taught crossing) | Remove the four boxes (A2-21) and their skins (A2-22); the cess and walkway lanes return |
| A2-D8 | Two overwatch guards `a2-watch-w` / `a2-watch-e` on the deck (48 / 54, 17.9, y 4.4), grunts, high-security posts with a leash of 0; the squad is the shunter then the watchers (3 = `SET_GUARDS_MAX`); radio line "Two spotters on the staging. Seen in the neck lights and we start again." (walk482 X2b); spotted fails the set through `BayDef.spotFail` (X2a, `ctcourse.ts`) | "being spotted on s2 should be a failure. Theres not enough guards in that section ... Guards watching from above that will see you if you try cross through the light" | Drop the two slots, the squad entries and the radio line; remove `spotFail` from the A2 bay |
| A2-D9 | The taught crossing moves from the north walkway (z 16.9, closed at the neck) to gap 2/3 (z 12.5); the light spots 'A2 neck crossing', '... cut', '... west cut', '... east cut' keep their names and move to z 12.5; baseline `a2CarriageShed.light.json` regenerated for A2 only; B's wait is the west gap 2/3 (41, 12.5) | The crossing must be in the watchers' view when lit and unseen when dark | Move the spots back to z 16.9 and drop the closures |
| A2-D10 | Road 2's east wheel stop (x 68.6-69.4, z 9.2-10.8) and its buffer skins are removed: five stops (walk482 X3) | It stood in the L2 near door's approach (door x 70, z 9.1-10.9): "obstacle on the floor in the way. Can get past but not good design" | Restore the stop (the `NO_STOP` rule in `a2CarriageShed.ts`) |

Register additions / changes (SPEC 18, A2): A2-8 amended: "East stair; west stair removed for repair (barrier, permit
board)". A2-10 Wheel stops 0.3 m (the roads' stops; five, none at road 2's east end; low so they are not a climb). A2-11 North walkway
(the cleaners' access along road 3, west of x 45.5 and east of x 56.5). A2-21 Neck closures (four, walk482). A2-22 Neck
closure dressing (visual skins).
