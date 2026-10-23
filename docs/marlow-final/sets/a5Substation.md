# A5 - Set 5, the Substation (set doc)

Status: SET DOC (PLAN.md slice 5 step 1), written 2026-10-23 by the A5-A8 set-doc agent, before any geometry.
Set id `a5Substation`; file `src/world/maps/ctcourseSets/a5Substation.ts`; plans `plans/a5Substation-ground.svg`,
`plans/a5Substation-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A5 sheet, route summary), 10, 12, 13, 15, 18 (A5
rows); LIGHTING-PLAN section 3 (A5) and `MARLOW_CIRCUITS` / `MARLOW_POCKETS`; GREYBOX-HELPERS.md (with "Changes from
the tests" and the job lead's corrections of 2026-10-23); ENGINE-ANSWERS.md (Q2 lure, Q8 jam line); `docs/level-design.md`
section 13. Coordinates: x east, z north, metres, floor y 0, yaw radians with 0 = +z. Decisions and contradictions:
section 13 (`A5-D<n>` / `A5-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 5, the Substation. Ground (y 0), one storey. An urban grid substation built indoors as a switchgear hall: the east apron where tonight's cable drums were delivered, the inner security wall with its 6 m cable gateway held by three IR beams, the inner zone with two transformer pens, the switchroom and the zone control kiosk. Set box x 40-70, z 24-48 (30 x 24 m), no set ceiling slab as built (open to the hall's roof; the inner wall alone is 6 m; the hall's charcoal panels and coves above) |
| New mechanic | Teaches the partner throw with a far-side release. Combines the held jammer on a light (the flood) and patrol timing |
| Entry vantage | From L4's door (70, 33) to the north end of the drum stack, (64.9, 34.0), crouched: through the gateway the kiosk (47, 33), the floodlit strip, the beams (night vision), the beam towers' panel high on the switchroom face, and the patrol's whole loop (K, R2 and R4 all lie inside the gateway's view cone from here). Concealed by stance and distance (8.5 m from his R4 stop, the nearest; a crouched still body in the apron's mid light stays under the 0.2 leak) and by the drums from the south half of the zone (P1) |
| Routes | Shadow (taught): "I throw you over by the drums, you wait in the dark by the transformer; when he walks off west I jam the flood, you key the kiosk." Alternative (the second tool): "I jam the beam panel, you walk through in the 6.5 s, then you key the kiosk for me." Timing: "Cross the flood strip while he stands behind pen 1." Loud: "Walk the beams" (alarm stage; he comes to the gateway). Secret: "From the landing, round pen 2, along the cable trench, in by the switchroom's back door and out of its front door, 3 m from the kiosk." |
| Loop | Round pen 1 is closed on its south side (the bund meets the set wall, A5-D4), so the shadow-route loop is round pen 2: the landing, the gap between pen 2 and the inner wall (1.85 m), the trench path, the gap between pen 2 and the switchroom (4 m) and back south. A second loop runs through the switchroom (two doors) |
| Stepping stones | B's shadow route: the landing pocket (56, 36) -> 9 m of floodlit strip (made dark by the jam) -> the kiosk (47.6, 33) -> 7.6 m back to pen 2's west face (49.4, 41): every gap 9 m or less, each a pocket, a jam or a bund. A's route after the release: the drums -> the gateway (3 m) -> along the inner wall's west face behind pen 2 (the 1.85 m gap, out of the zone's lamps) -> the trench path -> L5 door |
| Guards | `a5-patrol` (section 2). One guard: no overlap. Isolation moments: R2 behind pen 1 (dark, alone, facing south, every cycle) and in the switchroom when lured by 51 (dark when 51 is off) |
| Lights | Apron 50 (switch by the L4 door), inner zone 51 (switch inside the switchroom door), kiosk flood 52 (photocell: jam or shoot only), kiosk panel light 53 (emergency supply, no switch). Chokepoint (the kiosk strip): darkened by the jam or by shooting the flood; avoided by timing (his R2 stop) or shortened by the secret route (LD 5.2) |
| Surfaces | Concrete apron and inner zone (quiet); gravel in the bunds (`gravel`, loud: inside the bund walls only); the cable trench's chequer-plate lids along the north wall (`metal`, loud: the secret route's price) |
| Toys | The flood (jam, shoot), the beam panel (jam), the inner switch (lure), the apron switch, the kiosk (release), the switchroom's two doors, the leg-free throw spot. Lure destinations: 51 off sends him into the switchroom (a dark takedown spot); a shot flood sends him to the strip; the apron switch (50) sends him to the gateway's inner face (he cannot pass the beams' wall) |
| Hide spots | The landing pocket `a5-landing` (x 53.5-57.7, z 34-39.5); the bund gap behind pen 1 (x 40.2-42, z 24.3-29.3, a 1.8 m slot); the switchroom when 51 is off; the gap between pen 2 and the inner wall; the drum stack (apron). A body left on the strip or by the kiosk is on his loop (K and the strip, every 44 s) |
| Traversal elements | The throw gateway (`throwGateway`, section 1.3); bunds 1.2 m (low cover, not climbed); transformers, switchroom roof and inner wall `noLedge`. No lip in the co-op band in A5 |
| Exit | Pinch point: the trench path at the L5 door (x 52.1-53.9, z 48). Checkpoint: L5 (x 50-56, z 48-54) under the north gallery strip; its near door is a `flag` gate on `a5-release` (no walking through the beams to the pad). L5's glass slot shows A6's dark sump bay and the pump row |
| Tension | 3 |

### 1.1 Dimensions (6 m grid: x 40, 46, 52, 58, 64, 70; z 24, 30, 36, 42, 48)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set box | 40-70, 24-48 | no set ceiling slab as built (a 6 m slab would cut the gallery glazing, 4.5-7.5 m); the zone's `maxY` is 9.9 | Box-edge walls are `facility.ts`'s (L4 door x 70, z 32.1-33.9; L5 door z 48, x 52.1-53.9; gallery glazing above 4.5 m on the south, north and east walls) |
| Apron | 58.15-70, 24-48 | - | Concrete. The cable drums and the throw spot |
| Cable drum stack | 62.1-64.3, 29.4-33.0 | 1.8 | Two by two `cableDrum` (1.8 dia x 1.1) on their sides, one collide box. 4.05 m from the beam line's south end (A5-D1) |
| Inner security wall | 57.85-58.15, 24-33 and 39-48 | 6.0 (to the ceiling) | `throwGateway` walls, `noLedge`. No lip on a security wall (register A5-1) |
| Cable gateway | x 58, z 33-39 (6 m) | header underside 4.8 | Three IR beams at 0.35 / 0.9 / 1.45 between two `beamTower`s at (58, 33.1) and (58, 38.9) |
| Pen 1 (south-west) | bund 42-48, 24.3-29.3; unit 43.2-46.8, 25.4-28.2 | bund 1.2; unit 3.5 | `transformer` prop; its south bund wall stands against the set wall (A5-D4). Unit `noLedge` |
| Pen 2 (north of the gateway) | bund 50-56, 40.5-45.5; unit 51.2-54.8, 41.6-44.4 | bund 1.2; unit 3.5 | Bund 6 x 5 (the prop's size, SPEC said z 40-46, A5-D5). Unit `noLedge` |
| Switchroom | 40.2-46.0, 36-46 | walls 4.0, flat roof | 0.3 m walls; roof box `noLedge` (4.0 is in the band, A5-D2). Front door east face z 41.0-42.2 (x 46); back door north face x 41.0-42.2 (z 46). Inside: a `switchgearPanel` run on the west wall (x 40.3-41.1, z 37-45, 2.3 m). 6 x 10 (SPEC 12 x 6 at z 36-48, A5-C2) |
| Zone control kiosk | 46.75-47.25, 32.6-33.4 (built: with the doc's box the helper's press spot (47.6, 33.0) is 0.2 m from the face, closer than a body's radius; device at (47.0, 1.2, 33.0), yaw pi/2, faces +x) | 1.5 | `zoneKiosk`; the release (`sw-a5-release`). 1.0 m clear in front (east) |
| Flood (group 52) | (44.5, 4.2, 35.6) on a bracket 0.25 m out from the switchroom's south face (on the face the jammer's line from the apron grazes the wall's east end) | - | Cone light aimed at (51.5, 0, 34), outer 0.55 rad (31.5 deg), radius 10.5, intensity 1.5 (at 38 deg the inner zone's read spot (51, 29) reads 0.25 with 51 off); the lit strip about x 46-54, z 30.5-36 |
| Beam power panel (`panel-a5`) | (43.0, 3.2, 35.85) on the switchroom's south face, yaw pi (faces -z) | - | Existing laser panel (electro). Powers `laser-a5` |
| Cable trench | 46.0-57.85, 46.6-47.775 | lids flush | Chequer-plate lids (`metal`, loud); the 1.2 m path along the north wall behind pen 2 and the switchroom |
| Landing pocket | 53.5-57.7, 34-39.5 | - | `a5-landing`: no lamp reaches it (section 7) |

Doors and spacing: L4 door (70, 33) -> nearest set door, the switchroom front door (46, 41.6): 25 m. Switchroom front
door -> back door: 6.2 m. L5 door (53, 48) -> switchroom back door (41.6, 46): 11.6 m. Every pair over 5 m.

### 1.2 Heights and lips

| Lip / top | Height | Builder | In `COOP_LIPS` | Note |
| --- | --- | --- | --- | --- |
| Inner wall and gateway header | 6.0 / 4.8-6.0 | `throwGateway` (`noLedge`, header `overhead`) | No | To the ceiling: no lip (SPEC A5) |
| Switchroom walls and roof | 4.0 | hand boxes, `noLedge` | No | 4.0 is in the 3.8-4.5 band: `noLedge` is required (LD 11.5) |
| Transformer units | 3.5 | prop collision, `noLedge` | No | Over the 1.9 m auto-lip line |
| Bunds | 1.2 | prop collision | No | Low cover, a mantle; a bund top is a solo-standable top (see the keep-clear) |
| Drum stack | 1.8 | hand box | No | Under 1.9: no auto lip; a solo-standable top (keep-clear below) |
| Kiosk, beam towers | 1.5 / 2.39 | prop | No | Towers: thin pole, `noLedge` |

No lip in the co-op band in A5. Keep-clear (`BEAM_KEEP_CLEAR` 4.0 m from the beam line on the approach side): the drum
stack's nearest corner (62.1, 33.0) is 4.05 m from the line's south end (58, 33); nothing else on the apron stands over
0.3 m. On the far side the keep-clear does not apply (a player there is already past the beams).

### 1.3 Greybox helper call

```ts
throwGateway({ id: 'a5', at: { x: 58, z: 36 }, facing: '-x', gap: 6, span: 24, wallH: 6, header: 4.8, thick: 0.3,
  beams: [0.35, 0.9, 1.45], stand: 1.2, release: { u: 11, v: -3 } });
// facing -x: u = -x, v = +z. Walls z 24-33 and 39-48 (noLedge), header z 33-39 at 4.8-6.0 (noLedge, overhead);
// laser `laser-a5` (58, 33) -> (58, 39), ys [0.35, 0.9, 1.45], offFlag `a5-release`;
// spots: throw (59.2, 0, 36), runner (60.2, 0, 36), landing (56.0, 0, 36);
// release device `sw-a5-release` at (47.0, 1.2, 33.0) facing +x (the kiosk), gate
// { kind: 'pickup', id: 'g-a5-release', switchId: 'sw-a5-release', flag: 'a5-release', perPlayer: false };
// press spot (47.6, 0, 33.0); wayBack: the far-side release turns the beams off for good.
```

Hand data beside it: `LaserPanelDef { id: 'panel-a5', lasers: ['laser-a5'], x: 43.0, y: 3.2, z: 35.85, yaw: Math.PI }`;
the L5 near door gate `{ kind: 'flag', id: 'g-a5-l5', flag: 'a5-release', doorId: <facility's L5 near door id> }`.

## 2. Guard sheets

### `a5-patrol`

| Field | Content |
| --- | --- |
| Guard | `a5-patrol`, kind `grunt`, A5 squad, slot (47.9, 33.4) (K), yaw -pi/2 |
| Job | Substation security on the night round: reads the kiosk's alarm log, checks pen 1's bund sump gauge (on the bund's west end), checks the gateway's beam towers |
| Route | `route: [[47.9, 33.4], [41.3, 31.0], [47.0, 34.6], [56.5, 37.6]]`, `waits: [4, 3, 0.1, 3]` (0.1 at W as built: a wait of 0 freezes `PatrolWalker`), `faces: [-pi/2, pi, NaN, pi/2]`. K = the kiosk (facing west, the log), R2 = the gap mouth behind pen 1 (facing south, the sump gauge), W = a waypoint north of the kiosk, R4 = the gateway's north tower (facing east, through the gateway). Walk 33.3 m at the patrol pace (0.9 x 1.1 = 0.99 m/s) = 33.6 s + 10 s of stops: cycle 42.0 s on the walker as built (43.6 s without the 0.45 m arrival radius) (A5-C1). K -> R2 is not a straight leg: the straight line clips the kiosk, so his A* goes round it (under 1 m longer; undo: a 0.1 s pass point at (47.6, 32.0)) |
| Timeline (t = leaving K) | 0-7.1 K -> R2, walking west (back to the gateway). 7.1-10.1 R2 stop, facing south. 10.1-16.2 to W, walking north-east past the kiosk. 16.2-26.2 W -> R4 along the strip, facing the landing. 26.2-29.2 R4 stop, facing east through the gateway onto the apron. 29.2-38.0 R4 -> K, walking west-south-west (back to the gateway). 38.0-42.0 K stop facing west (as built; the doc's plain sum ran 4 s longer) |
| What he sees | At K: focus west over pen 1 and the switchroom's south face; the strip is behind him. At R2: south into the bund gap; the kiosk is 135 deg off his facing (outside the periphery). At R4: focus 55 deg east through the 6 m gateway to 25 m (the throw spot and the apron's centre); periphery to 12 m (the landing pocket beside him). Walking W -> R4 he looks straight at the landing |
| Gaps | t 30-10 (24 s across the cycle end): his back to the gateway and the landing (the throw window opens at t 31-34 when he is 4 m past the landing). t 0-10: his back to the strip and the kiosk (the jam-and-key window). t 10-30: he walks the strip to the gateway (B must be off the strip and out of the landing by t 16) |
| Isolation moment | R2 (41.3, 31.0), t 7.1-10.1: alone, in the `a5-pen1` dark pocket, facing the bund, unwatched (no camera in A5). And in the switchroom when lured by 51 (dark when 51 is off): a takedown from the switchroom's north-west corner |
| Covered by / covers | One guard: none. He covers the landing from R4 and the strip from W -> R4 |
| Lures | Inner switch 51 off (`a5-sw-inner`, inside the switchroom door): he walks to the switch (inside the switchroom, about 9 m from K), looks 4 s, gives up within 20 s; the zone is dark but for the strip and the kiosk lamp, so he takes his torch. Apron switch 50 off (`a5-sw-apron`, by L4): 22-24 m from most of his loop; he walks to the inner wall's west face nearest the switch (he cannot pass the beams' wall: the beams are a laser, not a door) and looks. A shot flood: he walks to the strip. A jammed flood or panel lures nobody (ENGINE-ANSWERS Q2) |
| Search | After a sighting: round pen 2 and the switchroom (search ring 11 m). Nearest hide spots: the landing pocket, the bund gap, the pen 2 / inner wall gap, the switchroom (dark only with 51 off) |
| Body | A body on the strip, at the kiosk or in the landing is on his loop within one cycle; in the bund gap behind pen 1 it is 2 m from R2 (found); in the switchroom it is found only if he is lured there again |

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| A5 the Substation | 3 | The partner throw with a far-side release | The held jammer on a light (the flood); patrol timing | The beams going dark for good when B keys the kiosk; A walks through | "Over you go, I've got the light": the first time one player is stranded on purpose and the other must free him |
| L5 | 1 | - | - | A quiet lobby under the north gallery; the glimpse of A6's dark sump bay | Breathe; height next |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Partner throw | Taught (C6): over the 1.45 m top beam into the dark |
| Far-side release (pickup switch) | Taught: the kiosk turns the beams off for good |
| Held jammer on a lamp | Combined (the flood, 15.7 m through the gateway; about 10 s dark per 5 s jam) |
| Held jammer on a laser panel | Optional second tool (the beam panel, 17.5 m: 6.5 s with the beams off) |
| Light switch / lights-out lure | Toy (51 into the switchroom, 50 to the inner wall) |
| Takedown from behind, carry and hide a body | Optional (R2 behind pen 1; the switchroom when lured) |
| Crouch-walk at a silent gear | Tested on the trench lids (secret route) |
| Night vision | Needed to read the beams (IR, seen only in night vision) |
| Doors | The switchroom's two doors (stealth open, bash); L4 / L5 slide doors |
| Shoot a lamp | Optional loud route (the flood; host only today) |
| Leg-up, relay, hang-down, rope, paired hack, console, dual takedown | Not used here (C6 is the throw) |
| Split jump, wall jump, pipes, ladders, ducts, rappel | Not used: no believable element (SPEC 8); the trench is a covered cable trench, not a crawl route |
| Revive | Not a co-op surface (ground level); revive on the floor as anywhere |

## 5. Tool / problem matrix

| Problem | Tools (at least three) |
| --- | --- |
| The beams across the whole gateway | Partner throw / jam the beam panel (6.5 s) / walk them (loud: alarm stage) / the kiosk release (for good) |
| The floodlit strip in front of the kiosk | Jam the flood / his R2 stop (timing) / the secret route through the switchroom (3 m of strip) / shoot the flood (loud) |
| The patrol on his loop | Time his back (t 30-10) / lure him into the switchroom (51) and take him / take him at R2 behind pen 1 / hide in the landing pocket or the bund gap |
| The thrower stranded on the apron | The kiosk release (partner) / the panel jam (partner walks back through in 6.5 s) / walk the beams (loud) |
| A body | The bund gap behind pen 1 (off the strip, but next to R2) / the switchroom / leave it and be quick |
| Loud floors (trench lids, bund gravel) | Silent crouched gears / the quiet concrete either side / the jammed-flood dark instead |

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Throw landing | Thrower 1.2 m behind the line, landing 2.0 m past (`TEAM.throwDist` 3.2) | `throwGateway` tests: feet over the top beam, head under the 4.8 header, `throwRoom` ok | Yes |
| Throw free air | Thrower at (59.2, 36), no slab (free air to the hall roof; the header is 4.8-6.0) | `TEAM.throwUp` 2.2 over the standing thrower | Yes |
| Drum stack (solo jump over the beams) | Nearest corner 4.05 m from the line, top 1.8 | `BEAM_KEEP_CLEAR` 4.0 (2.72 m for a 1.8 m top) | Yes (A5-D1) |
| Release out of reach from the near side | Kiosk 11 m past the line | `throwGateway` throws under 1.85 m | Yes |
| Flood jam | (60, 1.6, 36) -> (44.5, 4.2, 35.6): 15.7 m, through the gateway | `JAMMER.range` 20; the line passes the 6 m opening (no wall, no glass) | Yes |
| Panel jam | (60.5, 1.6, 35.0) -> (43.0, 3.2, 35.85): 17.5 m (from the doc's (60.5, 36.5) some aiming eyes lose the panel behind the switchroom's east end) | `JAMMER.range` 20; 6.5 s with the beams off | Yes |
| B's crossing under the jam | Landing -> kiosk press spot 9.0 m at 1.7 m/s = 5.3 s | `JAM_LIGHT` about 9.5-10 s dark | Yes (4 s spare) |
| B off the strip after the key | Kiosk -> pen 2's west face 7.6 m = 4.5 s | Before he walks back past the kiosk (t 10-17) | Yes |
| Panel-jam walk-through | Gateway crossing about 1 s; B then keys the kiosk 10 m on | 6.5 s window | Yes |
| Lure range, 51 | Switch (45.8, 40.7) from any loop point: 8.3-12.3 m | `LURE_RANGE` 25 | Yes |
| Lure range, 50 | Switch (69.7, 36.0) from R4 13 m, from K 21.9 m, from R2 28.4 m | 25 | From R4, W and K; not R2 |
| Cycle / stops | 43.6 s; 4 / 3 / 3 s | LD 4.3: 25-45 s; 3-6 s | Yes (A5-C1) |
| Inner wall and header | 6.0 to the ceiling / header 4.8 | No lip (security wall); throw apex under the header | Yes |
| Switchroom roof | 4.0 | In the band: `noLedge` | Yes (A5-D2) |
| Gaps round pen 2 | 1.85 m (inner wall) and 4 m (switchroom) | Nav agent 0.64 m; a player 0.6 m | Yes |
| Bund gap behind pen 1 | 1.8 m x 5 m | Hide spot, not a route | Yes |
| Doors | L4 / L5 1.8 m (facility); switchroom 1.2 x 2.1 | Doors 1.2 x 2.1; 5 m between doors | Yes |
| Pockets vs gallery glazing | `a5-landing` 8.5 m from the north wall; `a5-pen1` z >= 28, 4 m from the south wall | SPEC 5: no planned dark pocket within 4 m of a gallery wall | Yes (A5-D3) |
| Clearance | 1.0 m in front of the kiosk, the switchroom doors and the switchgear | LD 16.4.2 | Yes |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan, y) | Switch / reason | Cut by | Lure |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | `a5-apron` | switch | 3 wall bulkheads (y 3.5): (69.55, 29.5), (69.55, 38.5) on the east wall (radius 9, intensity 1.2), (64.0, 47.55) on the north wall (radius 9, intensity 1.0); radius 9 not 5: a 5 m bulkhead does not reach the apron read spot (66, 36) | `a5-sw-apron` (69.7, 36.0), by the L4 door, north of the glass slot (the hint (69.4, 35.2) is on it) | switch, jam, shot | patrol, from R4 / W / K |
| 51 | `a5-inner` | switch | 3 wall bulkheads (y 3.5): (57.65, 27.0) on the inner wall's west face (south end; radius 9, intensity 1.0), (51.0, 24.45) on the south wall (radius 9, intensity 1.2; x 51.0 so (51, 29) reads 0.51), (46.35, 44.5) on the switchroom's east face (radius 7, intensity 1.0); 1 panel in the switchroom (43.1, 3.7, 41.0) (radius 5, intensity 0.8); none reaching the landing pocket (A5-C3) | `a5-sw-inner` (45.8, 40.7), on the wall beside the switchroom's front door (the hint (45.4, 41.6) is in the doorway) | switch, jam, shot | patrol (into the switchroom) |
| 52 | `a5-flood` | photocell | 1 cone flood (44.5, 4.2, 35.6), aimed at (51.5, 0, 34), outer half-angle 0.55 rad (31.5 deg), radius 10.5, intensity 1.5 | None: photocell security flood | jam, shot | none (a jam lures nobody) |
| 53 | `a5-kiosk` | emergency | 1 panel light in front of the kiosk keypad (47.5, 1.45, 33.0) (the doc's (47.0, 1.5, 33.0) is inside the kiosk body), radius 1.2, intensity 0.1: lights the keypad, not the operator | None: the kiosk's emergency supply | jam, shot | none |

- Zones: set `ambientZone` x 40-70, z 24-48 at 0.14 (`minY` -1, `maxY` 9.9 as built: no 6 m slab, see the set box row; `MARLOW_ZONES` uses 10). No upper level.
- Dark pockets: `a5-landing` x 53.5-57.7, z 34-39.5 (reason: no fitting reaches it; the flood's cone and radius stop
  short and pen 2 shades it from the switchroom's bulkhead) and `a5-pen1` x 40.3-42.5, z 28-31.5 (reason: behind pen
  1's transformer, outside the flood's cone, the zone's bulkheads on the far side). Both <= 0.22 crouched. Both boxes
  differ from `MARLOW_POCKETS` (A5-C3).
- Light-test spots (`LIGHT_SPOTS`): the strip centre (50.5, 33.5) >= 0.60 lit and <= 0.24 with 52 off (51, 53 on); the
  kiosk press spot (47.6, 33.0) >= 0.60; the landing (55.6, 36.8) crouched <= 0.22; R2 (41.3, 31.0) <= 0.22; the inner
  zone read spot (51, 29) >= 0.40 and <= 0.24 with 51 off; the apron (66, 36) >= 0.40; the vantage (64.9, 34.0)
  between 0.22 and 0.45 (concealed by stance and distance, P1; the LD 15 e2e check is the authority).
- Parity: no kit LED line on 52 / 53; the hall coves above the set on 51; the gallery lamps over the south, north and
  east walls stop short of the glass (`spillsPast` false). The beams are IR (night vision only), not light: no parity
  term. Restart restores every group (they are all in `course.groups`).
- No timed window in A5: the jam's own window is the timer (no HUD seconds). Radio on the jam: none.

## 8. Objective steps (N1) and per-player lines

Roles (claim): `roles: [{ role: 'b', zone: { box: [40.3, 24.3, 57.8, 47.7] } }]`: the first player into the inner zone
(the thrown player) takes B; the other is A. Until then the lead (P1, odd set) sees A.

| Step | Shared | A | B | Done when | Timer |
| --- | --- | --- | --- | --- | --- |
| `a5-throw` | Throw one of you over the beams. The release is at the kiosk. (61) | Stand by the drums at the gateway and throw your partner over. (62) | Land in the dark behind the transformer and wait for the jam. (61) | `{ flag: 'a5-in1' }` (one player west of x 57.8) | - |
| `a5-kiosk` | Kill the floodlight so the kiosk can be reached unseen. (55) | Jam the floodlight through the gateway for your partner. (56) | Cross under the jam and key the release at the kiosk. (53) | `{ flag: 'a5-release' }` | - |
| `a5-lock` | Beams are off. Both of you into holding room five. (50) | - | - | Last line (L5 cycles) | - |

- Pass zone: `a5-in1` (`any: true`), box x 40.3-57.8, z 24.3-47.7, `floorY` 0. The panel-jam route ticks it too (the
  first player through the gateway), which is right: that player then keys the kiosk.
- Radio: enter "Those beams cover the whole gateway. One of you goes over, the other stays put." (79); then "The patrol
  reads the kiosk log. Throw while his back is to the gateway." (71, A5-D6); on `a5-release` "Beams are down. Both of
  you, out by holding room five." (54).

## 9. Co-op routes and timing (SPEC section 10: A5 target 1:45, min 1:00, max 3:00; cumulative 9:43)

### Route 1 (taught): throw, flood jam, release

| # | Who | Action | Target | Running in A5 |
| --- | --- | --- | --- | --- |
| 1 | Both | Through L4's door (70, 33) to the vantage (64.9, 34.0), 6 m; crouch; night vision on to read the beams | 0:10 | 0:10 |
| 2 | Both | Watch the patrol round once from the vantage (the R4 stop facing the apron is the danger) | 0:30 | 0:40 |
| 3 | A, B | When he leaves R4 walking west (t 30): A to the throw mark (59.2, 36), B to the runner spot (60.2, 36) | 0:06 | 0:46 |
| 4 | A, B | The throw (1 s) at t 33-35: B lands at (56.0, 36) in `a5-landing` (claims B; `a5-throw` ticks) | 0:03 | 0:49 |
| 5 | B | B crouched still in the pocket while he stops at K, facing west (t 39.7-43.7) | 0:08 | 0:57 |
| 6 | A, B | He leaves K walking west (t 0): A jams the flood from (60, 36) (15.7 m); B crosses 9 m (5.3 s) to (47.6, 33) and keys the release (`a5-release`: beams off for good, the L5 gate opens; `a5-kiosk` ticks) | 0:08 | 1:05 |
| 7 | B | B off the strip, north to pen 2's west face (49.4, 41) and on to the trench path (54, 47), before he walks back past the kiosk (t 10) | 0:06 | 1:11 |
| 8 | A | A back behind the drums while he walks east and stops at R4 facing the apron (t 17-30); when he turns west, A walks through the gateway, north along the inner wall's west face (the pen 2 gap) to the trench path | 0:20 | 1:31 |
| 9 | Both | To the L5 door (52.1-53.9, z 48), both onto the pad; L5 cycles | 0:10 | 1:41 |
| 10 | Both | First-run slack | 0:04 | 1:45 |

Sum 1:45 (target). Min about 1:00 (enter on his westward walk, no watch at step 2, throw at once, A through the
gateway while B is still at the kiosk, no slack). Max 3:00 (a broken beam on a mistimed throw: the alarm stage rises
and he comes to the gateway; re-hide in the pocket or the bund gap and retry on the next cycle).

### Route 2 (the second tool): jam the beam panel

A at (60.5, 35.0) jams `panel-a5` (17.5 m, through the gateway) while he is at R2 or walking to it: the beams are off
6.5 s; B walks through (claims B), crouches in the landing pocket; B times the strip on his R2 stop (no flood jam: A's
jammer cools 5 s) and keys the kiosk; A walks through. About 1:40.

### Route 3 (timing only, no jam)

Throw as route 1; B crosses the lit strip while he stands at R2 facing south (t 7.1-10.1: the kiosk is 135 deg off his
facing, outside the periphery) and keys. Tighter: B must leave the pocket at t 2-4, while he still walks west.

### Route 4 (secret): the trench and the switchroom

From the landing B goes north through the pen 2 / inner wall gap, west along the trench lids (crouched: silent at
crouched gears 1-3), in by the switchroom's back door, through the switchroom and out of its front door (46, 41.6),
then 8.6 m south along its east face to the kiosk: the last 3 m in the flood. A jam is still useful for the last 3 m;
without it, the R2 stop. About 2:00. Variant: B presses 51 off inside the front door, steps back into the switchroom's
north-west corner and takes the patrol when he comes to the switch (the lured isolation moment), then keys the kiosk
at leisure.

Way back for a lone or downed player (C6): the kiosk release frees the thrower; the L5 door needs the release, so
nobody reaches the pad past the beams without it; a thrown player who cannot reach the kiosk waits in the pocket for
the next cycle (no softlock: the kiosk is always reachable from the inner zone).

## 10. Self-critique (the 10 weakest points and the fix)

1. The patrol's cycle is 44 s, not SPEC's 34 s (A5-C1): the throw window is long and the set may feel slow. Fix: if
   playtests drag, drop the R2 stop to the gap mouth (41.8, 32.6) for about 38 s; the isolation moment stays dark.
2. The vantage is lit (apron mid light) and concealed only by stance and distance (P1). Fix: the LD 15 e2e check (a
   crouched still player for a full cycle); fallback: an apron dark pocket at the drums (move bulkhead (69.55, 29.5) to
   (69.7, 24.6)).
3. The kiosk faces the strip, so a player keying it stands in the flood; with no jam and bad timing, detection is
   near-instant at 2-6 m. Fix: the route-1 jam is the taught answer; the HUD line says so; R2 is a real second answer.
4. The patrol stands at R4 1.6 m from the landing pocket for 3 s each cycle: a throw at the wrong time lands B at his
   feet. Fix: LANTERN's second line; the throw window is 24 s long; the e2e throws at t 33.
5. The secret route ends 3 m from the kiosk in the flood, so it is only partly a way round the strip. Fix: it trades
   the 9 m crossing for 3 m and gives the switchroom takedown; it stays "secret", not a bypass.
6. The apron switch (50) lures him to the inner wall's face, which has no use (he cannot reach the apron). Fix: it is a
   toy that teaches "he cannot come through"; or move 50's switch to the inner zone side if playtests find it
   confusing.
7. Pen 1 has no loop round it (its bund meets the set wall, A5-D4), so the shadow loop is round pen 2 only. Fix: the
   switchroom's two doors make the second loop; acceptable for a teach set.
8. The flood is a cone light: if the bake treats cone edges softly the pen 1 pocket may read mid. Fix: the light test
   spot at R2; move the flood 1 m east on the switchroom face if R2 reads over 0.22.
9. The panel-jam route (route 2) is as fast as the taught route and skips the throw. Fix: it needs the panel seen in
   electro and a 17.6 m jam at the range edge; the objective lines teach the throw; both are "several tools" (LD 7.1).
10. The shot flood is host only (a client's shot lamp relights in 2 s). Fix: Future item (SPEC 21); no exercise needs
    a shot.

## 11. e2e route (`scripts/e2e-ctcourse/a5Substation.mjs`, part `:3`, two pages)

Pages: host (P1) and client (P2). A5 is an odd set (lead P1 sees A); the client is thrown (B by the zone claim), so
the claim moves B to the client against the swap rule's default (the client sees B anyway as non-lead; the assert is
that the claim holds after the throw).

1. Start at L4's far door after A4 (or "Start at" A5); HUD `a5-throw` on both pages (host A line, client B line).
2. Host to the throw mark (59.2, 36), client to the runner spot (60.2, 36); wait until the host's `a5-patrol` is at or
   past R4 heading west (route index 3 -> 0, read on the host).
3. Client requests the throw; host accepts: the client lands within 0.5 m of (56.0, 36); `a5-in1` set; `a5-throw`
   ticks on both pages; the claim shows the client as B on both; no laser alarm counted (`__ctdev.debug()` alarm stage
   0).
4. Wait for the patrol to leave K (index 0 -> 1). Host jams the flood (`a5-flood` lamp jammed on both pages);
   `lightLevel` at (50.5, 33.5) <= 0.24 on both pages within 1 s; the patrol's state stays calm (no lure).
5. Client walks to (47.6, 33) and presses `c-sw-a5-release`: `a5-release` set; `laser-a5` off on both pages;
   `a5-kiosk` ticks; the L5 near door unlocked.
6. Client to the trench path (54, 47); host through the gateway (no laser touch counted) and north to (57, 46.5).
7. Both onto the L5 pad; L5 cycles; A6's list shows on both pages.
8. Variant pass (time allowing): restart A5; host jams `panel-a5` (laser off 6.5 s on both pages); client walks
   through at (58, 36) with no alarm; client keys the kiosk.
9. Unit cases moved here from `tests/jammer.test.ts` / `tests/laserPanels.test.ts` (SPEC 16): `A5_LASER` heights and
   offFlag, `A5_PANEL` and its jam spot (60.5, 1.6, 35.0) with the vantage trace (the panel's line of sight from the
   apron through the gateway), the hidden-box case.

Shot vantages: the vantage (64.9, 34.0) looking west through the gateway; the kiosk (48.5, 33.2) looking east at the
gateway; the trench path (56.5, 47) looking south-west along pen 2.

## 12. Playtest checklist (Michael, desktop)

- From the drums, can you read the patrol's whole loop, the beams (night vision) and the kiosk within one cycle?
- Is the throw timing readable (his back to the gateway), and does the landing feel safe and dark?
- Does the flood jam give B enough time to key the kiosk and get off the strip?
- Is it clear that the thrower is stuck until the kiosk is keyed, and does the moment the beams die feel good?
- Do you find the panel jam, the R2 timing or the switchroom secret route? Is any of them strictly better?
- Can one player get over the beams alone (the drums, the bunds, a running jump)?
- Is the 44 s patrol too slow to wait for?
- LD 13: any detection you could not understand; did the set feel like a real substation?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A5-D1 | Drum stack moved to x 62.1-64.3, z 29.4-33.0 (SPEC x 60-63, z 29-33), still 1.8 m tall | Correction (job lead, helper tests): at 2 m from the beam line a lone player runs off the 1.8 m top over the beams (2.72 m reach); 4.05 m clears `BEAM_KEEP_CLEAR` 4.0 for any top | A stack 1.9 m or taller marked `noLedge` back at x 60-63 |
| A5-D2 | Switchroom roof and walls `noLedge` | 4.0 m is inside the 3.8-4.5 band: an unplanned boost target (LD 11.5) | Raise the switchroom to 4.6 m or more |
| A5-D3 | Isolation spot R2 at (41.3, 31.0) and pocket `a5-pen1` at z 28-31.5 (SPEC "x 41, z 27") | SPEC 5: no planned dark pocket within 4 m of a gallery wall; the south wall z 24 has the south strip's glazing | Back to z 27 with the gallery lamps' spill checked by the light test |
| A5-D4 | Pen 1's south bund wall stands against the set wall (z 24.3-29.3, SPEC z 25-30) | A 0.78 m slot behind the bund is a dead space nobody can use; a real bund may use the building wall | A 1.8 m service gap behind pen 1 (pen at z 26-31; R2 moves north) |
| A5-D5 | Pen 2 bund 6 x 5 at z 40.5-45.5 (SPEC 6 x 6 at z 40-46) | The `transformer` prop's bund is 6.0 x 5.0 | Scale the bund to 6 x 6 |
| A5-D6 | Extra LANTERN line on the throw timing | The R4 stop is easy to miss | Drop the line |
| A5-D7 | Release device id `sw-a5-release` (helper name) with SPEC's gate id `g-a5-release` and flag `a5-release` | One id from the helper; the SPEC names match | Rename the device in one place |
| A5-D8 | Patrol kind `grunt` | SPEC rule 9 (normal guards) | - |
| A5-C1 | SPEC: cycle 34 s round kiosk -> pen 1 -> switchroom door -> gateway; at 0.99 m/s that loop is about 45 m (45 s walking alone) | Loop trimmed to K -> R2 -> W -> R4 (the switchroom door is the lure destination instead of a stop): 42.0 s as built (43.6 s planned), inside LD 25-45 | Drop the R2 spur to the gap mouth (about 38 s) |
| A5-C2 | SPEC: switchroom x 40-46, z 36-48 "on the west wall" and a secret "cable trench edge path, z 46-48 behind the switchroom": both cannot hold | Switchroom 6 x 10 at z 36-46 with a second (back) door: HV switchrooms over a few metres long need two exits; the trench path runs behind it and the back door ends the dead end | Switchroom to z 48 and no secret route (P11 fallback) |
| A5-C3 | `MARLOW_POCKETS` `a5-pen2` [46.2, 33, 49.5, 38] sits on the floodlit strip in front of the kiosk, and `a5-pen1` [42.5, 25, 45.5, 28.5] is inside pen 1's bund; `MARLOW_CIRCUITS` 51 puts all 4 bulkheads "on the inner wall", which would light the landing | The landing is where the helper puts it (56, 36) and the isolation spot is behind pen 1; pockets here are `a5-landing` [53.5, 34, 57.7, 39.5] and `a5-pen1` [40.3, 28, 42.5, 31.5]; 51 is 3 bulkheads away from the landing plus the switchroom panel. The lighting agent's file needs these boxes (shared file: reported to the job lead) | Follow the table's boxes and move the throw to suit |
| A5-C4 | SPEC: "B lands 3.2 m past, at about x 56, z 38"; `TEAM.throwDist` 3.2 is from the thrower, so the landing is 2.0 m past the line (x 56.0) on the throw axis z 36 | Helper numbers | - |
| A5-C5 | SPEC: the vantage "occluded from the patrol by the drums and the gateway's south pier" and seeing the kiosk across the gateway: one point cannot be both (a view through the gateway is a view back) | Vantage at the drums' north end, concealed by stance and distance (P1) | A dark pocket at the vantage (P1 fallback) |
| A5-C6 | `MARLOW_CIRCUITS` lure for 51 `from: [47, 30]` | The patrol's points here; the range check passes from every point | - |

Register additions / changes (SPEC 18, A5): A5-5 amended: "Switchroom 6 x 10, two doors (HV switchroom exit rule)".
A5-8 amended: "Cable trench along the north wall, chequer-plate lids (loud)". A5-11 Pen 1 sump gauge on the bund's
west end (the patrol's R2 job). A5-12 Switchroom back door (the second exit; the secret route's way in).
