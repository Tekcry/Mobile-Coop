# A1 - Set 1, the Gate (set doc)

Status: SET DOC (PLAN.md slice 1 step 1), written 2026-10-23 by the A1-A4 set-doc agent, before any geometry.
Set id `a1Gate`; file `src/world/maps/ctcourseSets/a1Gate.ts`; plans `plans/a1Gate-ground.svg`,
`plans/a1Gate-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A1 sheet, route summary), 10, 12, 13, 15, 18 (A1 rows);
LIGHTING-PLAN section 3 (A1); GREYBOX-HELPERS.md (with "Changes from the tests"); ENGINE-ANSWERS.md;
`docs/level-design.md` section 13 field lists. Coordinates: x east, z north, metres, floor y 0, yaw in radians with
0 = +z (`SquadSlot.yaw`). Decisions and contradictions: section 13 (ids `A1-D<n>` / `A1-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 1, the Gate. Ground (y 0). A goods-yard lorry gate after hours, with the facility's arrival lounge. Set box x 0-22, z 2-20 (22 x 18 m), open to the 10 m hall roof |
| New mechanic | Teaches the leg-up, the ledge relay and the bolt (the handshake). Combines nothing |
| Entry vantage | The lounge's sliding door (x 6, z 11): from it both see the wall, the striped mark, the wicket's locked handle, the cabin and the gallery glazing above the north wall. No perceiving guard (the checker is passive), so the vantage is safe by design |
| Routes | Co-op (taught): "I crouch at the mark, you take the leg-up, drop in and unbolt the wicket for me." Relay variant: "You hang on the lip, I climb you, we both drop in." Shadow / high / loud / secret: not applicable (unguarded teach set, SPEC route summary; P11) |
| Loop | Not applicable (no perceiving guard). The apron is open both ways round the cabin |
| Stepping stones | Not applicable (no threat). Cover for the habit: the cabin, the lounge corner, the wall foot |
| Guards | `a1-checker`, passive (section 2). Nobody covers anybody; no isolation moment needed |
| Lights | Lounge coves group 10 (house circuit, no switch), apron flood group 11 (photocell), yard bulkheads group 12 (switch in the cabin), cabin panel group 13 (switch by the cabin door). Ambient: lounge 0.30, set 0.14 standby. No chokepoint to darken (section 7) |
| Surfaces | Lounge polished concrete (quiet, `concrete`); apron and yard concrete setts (quiet, `concrete`); cabin floor `wood` (dressing). No loud floor: nothing hears |
| Toys | Cabin switches (yard 12, cabin 13), the apron flood (jam / shoot), the cabin door, the wicket (bolt), the checker (grab, interrogate, knock out) |
| Hide spots | None needed (no perceiving guard). The cabin's back corner reads as one for the habit |
| Traversal elements | Boundary wall 4.4 m (co-op lip, `boostWall`), wicket (bolt gate), leg-up mark (P16). Section 1.3 |
| Exit | Pinch point: the yard (x 12.6-22). Checkpoint: L1 (x 22-28, z 8-14) by its 1.8 m sliding door at x 22, z 10.1-11.9; L1's glass slot shows A2's west end and the first van |
| Tension | 1 |

### 1.1 Dimensions (6 m grid: lines at x 0, 6, 12, 18; z 6, 12, 18)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set box | 0-22, 2-20 | hall 10 m | Box-edge walls are `facility.ts`'s (south shell z 2, gallery strip wall z 20, L1 wall x 22, west shell x 0) |
| Arrival lounge | 0-6, 8-14 | 3.2 m ceiling, walls to the 10 m roof (`noLedge`) | Clients' reception: marble-look desk, leather seats, green wall (0e / props). Walls z 8 and z 14 and x 6 are this set's (0.30 m flats with the kit's charcoal panels) |
| Lounge door | x 6, z 10.1-11.9 | 2.1 | `kit.slidingDoor` 1.8 m (N9: Open only). Spawns (2, 10) and (2, 12), yaw +pi/2 (facing +x) |
| Lorry apron | 6-11.7, 2-20 | - | Open concrete |
| Boundary wall | 11.7-12.3, 2-20 | 4.4 (coped) | `boostWall` (below). 0.6 m brick. Hall coves show above it |
| Wicket | in the wall, z 10.4-11.6 | 2.1 | 1.2 m door, locked approach side, bolt on the yard side |
| Vehicle gate | wall face, z 4-7 | 3.0 | Chained lorry gate: dressing on the wall's apron face, no opening, no collision of its own (A1-D3) |
| Gate checker's cabin | 7-10, 15-18 | 2.6 walls, flat roof | 0.15 m walls, all `noLedge` (over the mantle, so no solo climb: A1-D4). Door south face x 8.0-9.2; window east face (looks at the apron and wall) |
| Yard | 12.3-22, 2-20 | - | Open concrete to L1. Yard bulkheads on the wall's yard face |
| Leg-up mark | 10.3-11.3, 5.5-6.5 | paint | Centre (10.8, 6): 0.9 m off the wall's apron face (x 11.7), helper `WALL_STANDOFF` (A1-D1, correction) |

Doors and spacing (scale sheet 4-5): lounge door (6, 11) to the wicket (12, 11): 6.0 m open floor; wicket to the L1
door (22, 11): 9.7 m; the wicket is 7.8 m from the wall's south end and 8.4 m from its north end (>= 1.5 m).

### 1.2 Heights and lips

| Lip / top | Height | Builder | In `COOP_LIPS` | Note |
| --- | --- | --- | --- | --- |
| Boundary wall, apron face (`a1-wall-near`) | 4.4 | `boostWall` (generated lips both faces, hands kept 0.25 m off the ends) | Yes | The leg-up and relay lip |
| Boundary wall, yard face (`a1-wall-far`) | 4.4 | `boostWall` | Yes | A boosted player may hang here; a yard-side hang drops into the yard |
| Wicket head | 2.1-4.4 | `boostWall` (wicket head box) | Part of the wall lip | Lip runs on over the wicket |
| Cabin roof | 2.6 | hand box, `noLedge` | No | Excluded by `soloJumpThreats` (noLedge over the mantle) |
| Lounge walls | 10 (to roof) | hand boxes, `noLedge` | No | No roof surface to stand on |

Keep-clear (`GREY_KEEP_CLEAR` 4.7 m, correction): no solo-standable top (over 0.3 m, not a `noLedge` box over the
mantle) within 4.7 m of either wall face on the approach side. The cabin (east face x 10, 1.7 m from the apron face)
is inside that radius, so it must stay `noLedge` on every piece including the door head and the window sill; no
crates, bins or bollards on the apron or in the yard (dressing stays flat, under 0.3 m, or against the box walls more
than 4.7 m away).

### 1.3 Greybox helper call

```ts
boostWall({ id: 'a1-wall', at: { x: 12, z: 11 }, facing: '+x', span: 18, lip: 4.4, thick: 0.6,
  wicket: 0, wicketW: 1.2, spot: -5 });
// door A1-wall-wicket (course id A1-wicket by rename, A1-D2); gate { kind: 'bolt', id: 'g-a1-wicket', side: [1, 0], at: [12, 11] }
// spot legUp at (10.8, 0, 6); lips a1-wall-near / a1-wall-far -> COOP_LIPS; wayBack: the wicket
```

The helper names its door `<id>-wicket` and its gate `g-<id>-wicket`. With `id: 'a1-wall'` that gives
`a1-wall-wicket` / `g-a1-wall-wicket`; SPEC wants door `A1-wicket` and gate `g-a1-wicket`, so the builder renames both
in the returned data before `applyGreybox` (A1-D2).

## 2. Guard sheets

### `a1-checker`

| Field | Content |
| --- | --- |
| Guard | `a1-checker`, kind `grunt` (armed kind, SPEC rule 9), `passive: true`, A1 squad (bay A1), slot (9.0, 16.5), yaw +pi/2 (facing +x, through the cabin's east window at the apron and wall) |
| Job | The gate checker: logs lorries in and out at his cabin desk. Tonight the gate is chained and he sits out his shift |
| Route | None: a post at his desk. No waits, no facings beyond the post |
| What he sees | Nothing: a passive training role-player sees and hears nothing (`Enemy.passive`) |
| Gaps | Always open |
| Isolation moment | Always (passive, inside the cabin, out of the gallery's line) |
| Covered by / covers | None |
| Lures | None (passive guards do not react to lights out or noise) |
| Search | None |
| Info lines (`info`, G206 / P14) | "I only log the lorries. That wicket's bolted on the yard side every night." / "The instructors watch from the glass up there. They mark everything you do." |
| Kept for | e2e-coop's bay-1 guard (`e2e-coop.mjs:750-790`): grabbable from behind, not alerted. The e2e teleports a player 1.1 m behind him: the cabin floor at (7.9, 16.5) is clear (desk at x 9.4-9.85, chair at the slot) |

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| Arrival lounge | 1 | - (read the objective, open a slide door) | - | It is the start | A luxury reception; the gallery above says "you are being watched and marked" |
| A1 the Gate | 1 | Leg-up, ledge relay, bolt | - | The whole set is safe | The first handshake: neither of you gets over alone |
| L1 | 1 | - | - | Quiet lobby, glimpse of A2's first van | Breathe; next is a guard |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Leg-up | Taught (C1) |
| Ledge relay | Taught (variant, C1) |
| Lip hang / shimmy | Taught incidentally (the boosted player hangs; shimmy along the 18 m lip is free) |
| Hang-drop | Used (dropping into the yard from the lip) |
| Bolt / door from the far side | Taught (the wicket) |
| Grab, interrogate, knock out | Optional (the checker; info lines) |
| Partner throw, hang-down, rope, paired hack, jammer, dual takedown, timed devices | Not used here (later sets) |
| Light switches | Optional (yard and cabin switches: the first switch the player meets) |
| Split jump, wall jump, pipes, ladders, ducts, rappel | Not used on the route (SPEC 8: no believable element) |
| Revive | Tested in slice 9 (a player downed in the yard) |

## 5. Tool / problem matrix

| Problem | Tool 1 | Tool 2 | Tool 3 |
| --- | --- | --- | --- |
| A 4.4 m wall out of solo reach | Leg-up (one up, unbolt) | Ledge relay (both up) | The wicket from the yard side (the second player's way through) |
| A bolted wicket | The bolt from the yard side | Both over the top by relay (no wicket needed) | - (a bash does not open a bolted door: deliberate) |
| A passive guard in a cabin | Ignore him | Grab and interrogate (info) | Knock out / switch his cabin light off (no effect: he is passive) |

The matrix is thin by design: A1 is the unguarded teach set (SPEC route summary; P11 covers fewer routes).

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Wall lip | 4.4 m | `COOP_BAND` 4.3-4.5 (`WALL_JUMP.maxUp` 3.8 + 0.5, `TEAM.boostMax` 4.5) | Yes |
| Wall thickness | 0.6 m | > `LEDGE.climbDepth` 0.38 (wall top walkable for the relay) | Yes |
| Relay hang | 4.4 m | `TEAM.relayMax` 4.6 | Yes |
| Leg-up mark standoff | 0.9 m | `WALL_STANDOFF` 0.9 (near lip wins at any thickness 0.4-1.2) | Yes |
| Leg-up floor to lip | 4.4 m | `TEAM.legUpMin` 2.4 to `boostMax` 4.5 | Yes |
| Room over the booster | open to 10 m | `TEAM.roomUp` 2.6, `roomSide` 1.0 (apron open on both sides of the mark) | Yes |
| Solo threats | cabin `noLedge`, nothing else on the apron | `GREY_KEEP_CLEAR` 4.7 m | Yes, if the dressing keeps the apron flat |
| Wicket | 1.2 x 2.1 | Door 1.2 x 2.1; >= 1.5 m from a wall end | Yes (7.8 m) |
| Lounge door | 1.8 x 2.1 | `kit.slidingDoor` 1.6-2.4 | Yes |
| Doors on the route | 6.0 m and 9.7 m apart | >= 5 m open floor | Yes |
| Lounge | 6 x 6 | Play space >= 6 m (drawn on wall lines: 5.7 m clear, A1-C3) | Near (accepted for a reception) |
| Checker grab spot | 1.1 m behind | Takedown reach 1.8 m; e2e teleport 1.1 m | Yes |
| Hang-drop into the yard | lip 4.4, hands to feet about 2.2 m | A hang-drop, no fall damage expected | Yes (e2e checks health) |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan) | Switch / reason | Lure |
| --- | --- | --- | --- | --- | --- |
| 10 | `a1-lounge` | house | 4 warm cove slots at (1.5, 9.5), (4.5, 9.5), (1.5, 12.5), (4.5, 12.5), y 3.1 | None: instructors' house circuit | - |
| 11 | `a1-apron` | photocell | 1 sodium flood on the cabin's south-east corner (10.1, 2.8, 14.9), aimed south along the wall, radius about 11 m | None: photocell | - |
| 12 | `a1-yard` | switch | 3 sodium bulkheads on the wall's yard face (12.4, 3.6, z 5 / 11 / 17) | `a1-sw-yard` (8.2, 15.4), in the cabin by its door | - (no perceiving guard) |
| 13 | `a1-cabin` | switch | 1 panel (8.5, 2.5, 16.5) | `a1-sw-cabin` (8.8, 15.4), by the cabin door | - |

- Zones: set `ambientZone` x 0-22, z 2-20 at 0.14 (`minY` -1, `maxY` 9.9); lounge x 0-6, z 8-14 at 0.30 (`maxY` 3.1).
- Dark pockets: none (no perceiving guard).
- Meter / guard reads (light-test spots for `LIGHT_SPOTS`): the wicket from the apron (11.2, 11) and from the yard
  (12.8, 11) >= 0.60 (the bolt reads); the mark (10.8, 6) >= 0.60; the apron centre (9, 10) >= 0.40; the yard centre
  (17, 11) >= 0.40; with 12 off the yard (17, 11) <= 0.24; the lounge (3, 11) 0.30 +- 0.05.
- Parity: the hall's coves above the 4.4 m wall are accent lines on group 12 (or lit slots on 12), never 10. If one
  flood cannot hold the mark at 0.60, add a second photocell bulkhead on the lounge's east face (group 11): a row change
  in `MARLOW_CIRCUITS` (lighting agent's file; ask the job lead) (A1-D6).
- Nothing lures (no perceiving guard).

## 8. Objective steps (N1) and per-player lines

Roles (claim, N1): `roles: [{ role: 'a', zone: { box: [10.3, 5.5, 11.3, 6.5], y1: 1 } }]`: the first player to stand on
the striped mark takes A (the booster); the other is B. A zone cannot tell a crouch, so the claim is "on the mark"
(A1-D5). Until claimed, the lead (P1, odd set) sees A.

| Step | Shared | A | B | Done when |
| --- | --- | --- | --- | --- |
| `a1-over` | Get over the yard wall together: one boosts, one climbs. (56) | Crouch at the striped mark and give your partner a leg-up. (58) | Take the leg-up, drop into the yard and unbolt the wicket gate. (63) | `[{ gate: 'g-a1-wicket' }, { flag: 'a1-yard' }]` (wicket open, or both in the yard) |
| `a1-lock` | Both of you into holding room one. (34) | - | - | Last line (L1 cycles) |

- `a1-yard`: pass zone (both players, `floorY` 0) x 12.6-22, z 2.3-19.7 (feet within 1 m of y 0, so a player on the
  wall top at 4.4 does not count).
- Radio (LANTERN): enter "Evening. Same rules as the real thing. Over the wall, open the gate for your partner." (85);
  `a1-over` done "Good. That is the handshake. You will use it all night." (55).
- Drills: one `flag:a1-yard` drill (who `both`) is not needed: the step gates nothing. The bay's exit is the L1 pad.

## 9. Co-op routes and timing (SPEC section 10: lounge 0:30 + A1 1:10, min 0:40, max 2:00)

### Route 1 (taught): leg-up and unbolt

| # | Who | Action | Target time | Running |
| --- | --- | --- | --- | --- |
| 0 | Both | Spawn in the lounge, read the step, open the slide door (the lounge row) | 0:30 | 0:30 |
| 1 | Both | Walk 7 m to the wall; A stands on the mark (claims A) and crouches | 0:10 | 0:40 |
| 2 | A, B | A offers the leg-up; B runs in, is boosted (0.9 s) and hangs on the apron-face lip, climbs onto the wall top | 0:10 | 0:50 |
| 3 | B | Hang from the yard face and drop into the yard | 0:05 | 0:55 |
| 4 | B | Walk 5 m to the wicket, press the bolt from the yard side (`g-a1-wicket` opens; `a1-over` done) | 0:10 | 1:05 |
| 5 | A | Walk 5 m from the mark through the wicket | 0:10 | 1:15 |
| 6 | Both | Walk 10 m to the L1 door, open it, both onto the pad | 0:10 | 1:25 |
| 7 | Both | First-run slack (the offer prompt, a missed run-in, the checker's lines) | 0:15 | 1:40 |

A1 rows 1-7 = 1:10 (target); with the lounge 1:40 cumulative, as SPEC section 10. Min (clean, no slack): 0:40.
Max (a fumbled boost twice, the checker interrogated): about 2:00.

### Route 2 (variant): leg-up and relay

Rows 1-2 as above; then B stays hanging on the apron-face lip with the relay offer; A climbs B (`relayClimb` 1.4 s) onto
the wall top; both hang from the yard face and drop; `a1-yard` sets (both in the yard). The wicket stays bolted. Same
target (0:05 faster, the unbolt and the walk round are skipped; the relay costs a few seconds to read).

Way back for a lone or downed player (C1): the wicket from the yard side; the yard is ground level; revive in the
yard (slice 9).

## 10. Self-critique (the 10 weakest points and the fix)

1. Unguarded set: no stealth teaching at all. Fix: none wanted (T2, the teach set); the cabin switches show the first
   switch, and the checker shows the grab and info for free.
2. The checker's cabin sits 1.7 m from the wall's apron face, inside `GREY_KEEP_CLEAR`. Fix: every cabin piece
   `noLedge` (over the mantle); the set test runs `soloJumpThreats` over the A1 boxes.
3. The striped mark sits in front of the chained vehicle gate's dressing: a player may read the gate as the way. Fix:
   the chain and padlock read clearly; the objective line names the mark.
4. The relay variant may never be found. Fix: the slice 9 e2e drives it; LANTERN's done line can hint "or climb each
   other" if Michael wants it.
5. A boosted player may hang on the yard face (the old 0.5 m mark bug). Fix: the helper's 0.9 m `WALL_STANDOFF`
   (correction applied, A1-D1); e2e asserts the hang side.
6. The wall's north end meets the facility wall under the gallery sill (y 4.2-4.5): a player walking the wall top may
   find a sill lip. Fix: the facility's sill is `noLedge` (0d), the glazing stops bodies; the set test checks no lip
   over the wall's end within 1 m.
7. The lounge is 6 m on wall lines (5.7 clear). Fix: accepted (a reception, not a play space); flagged A1-C3.
8. One apron flood may not light both the mark and the wicket to 0.60. Fix: tune the radius, else a second photocell
   bulkhead on group 11 (A1-D6).
9. The yard behind the wall is empty and uninteresting. Fix: dressing only (yard markings, a weighbridge plate under
   0.3 m, the L1 door's backlit plate "SET 2 - CARRIAGE SHED").
10. Two players may both stand on the mark at once; the claim takes the first. Fix: the B line reads "take the leg-up",
    so the second knows; the claim resets on a restart.

## 11. e2e route (`scripts/e2e-ctcourse/a1Gate.mjs`, part `:1`, two pages)

Pages: A = host (P1), B = client (P2). The set's claim is used to swap the lead once: the client takes A.

1. Start: both pages in the lounge at the spawns; HUD step `a1-over` shared line on both; host shows the A line (lead,
   unclaimed), client the B line.
2. Client walks to the mark (10.8, 6): the claim gives the client A; the host's line switches to B, the client's to A.
3. Client crouches and offers the leg-up; host runs in and is boosted; assert the host hangs on the apron-face lip
   (`a1-wall-near`, normal -x) and climbs onto the wall top (y 4.4).
4. Host hangs from the yard face and drops; assert health unchanged and feet at y 0, x > 12.6.
5. Before the host unbolts, the client tries the wicket from the apron side: assert it stays locked. Then the host
   presses the bolt from the yard side; assert `g-a1-wicket` open on both pages and `a1-over` ticked.
6. Client walks through the wicket; both walk to L1, open its door, stand on the pad; L1 cycles; `a1-lock` done.
7. Variant (after `restartCheckpoint` at the bay start): host on the mark (host = A), client boosted, client hangs
   with the relay offer, host climbs the client, both drop; `a1-yard` set with the wicket still locked.
8. Light: both pages read the wicket lit (meter band >= mid); the client turns the yard switch off and both pages read
   the yard (17, 11) dark; switch on again.
9. Kept for e2e-coop: `a1-checker` alive, passive, grabbable from behind (that suite's own check, unchanged).

Shot vantages (`SHOT_VANTAGES`): the lounge door looking east at the wall; the yard looking west at the wicket.

## 12. Playtest checklist (Michael, desktop)

- From the lounge door, is it clear what to do without any panel (the line, the mark, the bolted wicket)?
- Does the leg-up land you on the near side every time, and can you shimmy along the lip?
- Did either of you find the relay variant without being told?
- Does the bolt read lit from both sides; does the wicket refuse from the apron side?
- Does the facility read as a luxury rehearsal centre (lounge, gallery, coves above the brick wall)?
- Any way over the wall alone (cabin, wall end, gallery sill)? Report the spot.
- The general LD 13 questions: was any route strictly best (the relay vs the wicket), and did the set feel like a
  real goods-yard gate?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A1-D1 (correction, job lead / greybox tests) | Leg-up mark at (10.8, 6), 0.9 m off the wall face, not SPEC's (11.2, 6) | From 0.5 m the boost search takes the yard-side lip (`WALL_STANDOFF`) | - (test-proven) |
| A1-D2 | Builder renames the helper's `a1-wall-wicket` / `g-a1-wall-wicket` to SPEC's `A1-wicket` / `g-a1-wicket` | Keep SPEC ids | Use the helper ids and update SPEC |
| A1-D3 | The chained vehicle gate is dressing on a solid wall, not an opening | An opening with a 3 m leaf gives a solo-reachable top beside the co-op lip | A real opening with a leaf `noLedge` to 4.4 |
| A1-D4 | Cabin kept at SPEC's x 7-10, z 15-18, every piece `noLedge` | It is inside the 4.7 m keep-clear; `soloJumpThreats` excludes `noLedge` boxes over the mantle | Move the cabin to x 3.8-6.8 (4.9 m off) |
| A1-D5 | The A claim is a zone on the mark (standing, not crouching) | `RoleClaim.zone` has no stance test | A device press on the mark |
| A1-D6 | A second apron bulkhead (group 11) only if the light test fails | One flood for 0.60 at both the mark and the wicket is unproven | - |
| A1-D7 | Checker kind `grunt`, info lines written here | SPEC rule 9 (armed kinds); SPEC gives no text | Edit the lines |
| A1-C1 | SPEC A1 "yard beyond (x 12.6-22)" vs the 0.6 m wall at x 12 (yard face 12.3) | Pass zone starts at 12.6, keeping a player on the wall top out | - |
| A1-C2 | GREYBOX-HELPERS body text still says `GREY_KEEP_CLEAR` 3.0; the code and the job lead say 4.7 | 4.7 used | - |
| A1-C3 | SPEC 5 "play spaces 6 m clear" vs the 6 x 6 lounge box on wall lines (5.7 clear) | Accepted (reception) | Lounge x 0-6.3 |
| A1-C4 | SPEC lists no register row for the arrival lounge and its spawns | Added below | - |

Register additions (SPEC 18, A1): A1-8 Arrival lounge (clients' reception; spawns, start; slide door: every facility
door slides). A1-9 Lounge sliding door (house; Open only, N9). A1-3 amended: the vehicle gate is wall-face dressing.
