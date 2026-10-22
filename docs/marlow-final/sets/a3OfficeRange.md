# A3 - Set 3, the Office Range (set doc)

Status: SET DOC (PLAN.md slice 3 step 1), written 2026-10-23 by the A1-A4 set-doc agent, before any geometry.
Set id `a3OfficeRange`; file `src/world/maps/ctcourseSets/a3OfficeRange.ts`; plans `plans/a3OfficeRange-ground.svg`,
`plans/a3OfficeRange-gameplay.svg`. Sources: SPEC sections 5-7, 9 (A3 sheet, route summary), 10, 12, 13, 15, 18 (A3
rows); LIGHTING-PLAN section 3 (A3) and `MARLOW_CIRCUITS`; GREYBOX-HELPERS.md (with "Changes from the tests");
ENGINE-ANSWERS.md (Q2, Q7); `src/game/jammer.ts` (`JAMMER`, `hallStep`); `src/config/security.ts` (`CAMERA`);
`docs/level-design.md` section 13. Coordinates: x east, z north, metres, floor y 0, yaw radians with 0 = +z.
Decisions and contradictions: section 13 (`A3-D<n>` / `A3-C<n>`).

## 1. Space sheet

| Field | Content |
| --- | --- |
| Space | Set 3, the Office Range. Ground (y 0), 3.0 m ceilings. A commercial office floor at night: a west lift lobby, the corridor with a ceiling IR camera, three offices let to one tenant, an east lift lobby. Set box x 76-100, z 0-13 (24 x 13 m) |
| New mechanic | Teaches the timed jam relay (the jammer's 5 s hold, 5 s cooldown, 1.5 s reboot force strict alternation). Combines sneaking past one guard (the offices route) |
| Entry vantage | The west lobby at the archway (x 78.5, z 10.75): the camera, its red view grid on the corridor floor (G222), the recess and the far lobby, in a straight 17.5 m line. Out of the camera's 17 m range (unit test) and behind solid walls from the cleaner. Lit (lobby circuit 34): concealed by range and walls (P1) |
| Routes | Shadow (taught): "Jam the camera, I walk to the recess; jam again, I walk to the far lobby; then I jam for you." Secret / alternative: "Through office 1's lobby door and the communicating doors past the cleaner; out of office 3's corridor door on one short jam from the lobby." Loud: "Shoot the camera" (alarm stage, rating; host only until the client-shot fix). High: none (3 m offices, no high route; P11) |
| Loop | Offices 1-2-3 through the communicating doors and back along the corridor (office 2's recess door, office 3's corridor door) |
| Stepping stones | Corridor: west lobby -> the recess hide spot (88.6, 8.5), 10.0 m walk -> the east lobby (97.3, 10.75), about 9.6 m. Offices: desk runs, the trolley bay, each office's desks, 3-6 m apart |
| Guards | `a3-cleaner` (section 2) and the camera `cam-a3-hall` (section 2, device sheet). The camera never sees into the offices; the cleaner never enters the corridor (only the corridor-switch lure brings him into the west lobby, out of the camera's range), so neither covers the other: the player chooses corridor (camera) or offices (cleaner) |
| Lights | Corridor 30 (switch in the west lobby), offices 31-33 (a switch inside each office door), lobbies 34 (landlord's timer circuit, no switch). The camera ignores light (G240, SPEC rule 10): the corridor stays lit so the meter and the camera agree |
| Surfaces | Offices carpet tile (`carpet`, x0.6, the quiet floor); corridor vinyl (`concrete`, quiet); lobbies polished concrete (`concrete`). No loud floor: the set's pressure is the camera |
| Toys | The camera (jam, shoot), three office switches (lures), the corridor switch, the communicating doors, office 2's recess door, office 3's corridor door, the cleaner's trolley |
| Hide spots | The recess hide spot (88.6, 8.5) (from the camera); office 1's desk-run recess (x 79.8-80.8, z 7.0-8.2, 1.0 x 1.2); the trolley bay in office 2 (x 90.0-91.0, z 7.0-8.2). Bodies: every office is on the cleaner's loop |
| Traversal elements | The corridor and its recess (`jamRelay`), the archways. No lips. Section 1.3 |
| Exit | Pinch point: the east lobby (x 97-100). Checkpoint: L3 (x 100-106, z 7-13) by its 1.8 m sliding door at x 100, z 9.1-10.9. L3's glass slot shows the A4 security room: the duty officer's back at his monitors |
| Tension | 2 |

### 1.1 Dimensions (6 m grid: x 78, 84, 90, 96; z 6, 12)

| Piece | Plan box (x0-x1, z0-z1) | Height | Notes |
| --- | --- | --- | --- |
| Set box | 76-100, 0-13 | ceiling 3.0 (slab over), hall above | Box-edge walls are `facility.ts`'s (L2 x 76, L3 x 100, shell z 0, plant room z 13) |
| West lift lobby | 76-79.5, 0-13 | 3.0 | Lift doors (dressing) on its south part; L2 door at x 76, z 9.1-10.9; office 1's door in x 79.5 at z 4.0-5.2; the corridor archway x 79.5, z 9-12.5 |
| Corridor | 79.5-97, 9-12.5 | 3.0 | `jamRelay` (below): 3.5 x 17.5 m, walls 0.3 m, `noLedge` |
| Office 2 door reveal (recess) | 87.55-88.95, 7.85-9.0 | 3.0 | 1.0 m deep, 1.4 m wide; office 2's 1.2 m door at its back (z 7.85) |
| Office 1 | 79.5-85.4, 0-8.7 | 3.0 | Desks, desk run on the north wall, door to the west lobby |
| Office 2 | 85.4-91.2, 0-8.7 | 3.0 | Desks, the trolley bay, door at the back of the recess |
| Office 3 | 91.2-97, 0-8.7 | 3.0 | Desks, the far desk (95.5, 1.5); corridor door x 91.4-92.6 cut in the helper's wall (A3-D2); no door to the east lobby (A3-D3) |
| Frosted partitions | x 85.4 and x 91.2, z 0-8.7 | 3.0 | `kit.glass` frosted (stops sight, jam lines, bullets; passes baked light); a 1.2 m communicating door in each at z 1.8-3.0 |
| East lift lobby | 97-100, 0-13 | 3.0 | Under and behind the camera; L3 door at x 100, z 9.1-10.9; lift doors (dressing) on its south part |
| Camera `cam-a3-hall` | (96.6, y 2.8, 10.75), facing 270 deg (west), sweep 262-278, aim 8.75 m, `range` 14 (was 17; master camera-range cut 2026-10-23: sees the corridor from x 83.5 east) | - | From the helper; the builder sets `range: 17` (the helper leaves the 18 m default) (A3-D4) |

Doors and spacing: L2 door (76, 10) -> archway (79.5): an archway, not a door (scale sheet 5); office doors 3 m+ apart on
the corridor wall (recess door at x 88.25, office 3 door at x 92.0: 3.75 m); communicating doors 1.8 m from the south
wall's corner (>= 1.5). The lobbies are 3.5 and 3 m wide (corridor class, tight camera spaces) (A3-C3).

### 1.2 Heights and lips

No co-op lip and no top in the 3.8-4.5 band (3.0 m ceilings, slab over every room: the hall above is out of reach).
Desks 0.75 m and desk runs 0.9 m (no lips). The corridor walls are `noLedge` from the helper.

### 1.3 Greybox helper call

```ts
jamRelay({ id: 'a3-hall', at: { x: 79.5, z: 10.75 }, facing: '+x', length: 17.5, width: 3.5, height: 3.0,
  side: -1, recessDepth: 1.0, recessW: 1.4, camY: 2.8 });
// one recess at u 8.75 (x 88.25) on the south wall; hide spot ('runner') at u 9.1 -> (88.6, 8.5) against the
// camera-side cheek; jam posts (78.5, 10.75) and (98.0, 10.75); camera cam-a3-hall at (96.6, 2.8, 10.75)
// facing 270 deg; wayBack: the corridor both ways, the send-back to the west lobby
```

Post-processing before `applyGreybox` (plain data): split the south wall's east piece (x 88.95-97) to leave office 3's
1.2 m door at x 91.4-92.6 (A3-D2); add office 2's door leaf at the recess back; set the camera's `range: 17`; export
the hallway box and the camera as `A3_HALL` for the re-added `jammer.test.ts` cases.

Send-back (the one hard rule, G125): pass zones in the east lobby carry `hall: { camera: 'cam-a3-hall', box: [79.5, 9,
97, 12.5], lobby: [76.3, 0.3, 79.5, 12.7], back: [77.8, 10.75, pi/2], say: 'The camera had you. Back to the lobby,
and jam it properly this time.' }` (say 69 characters).

## 2. Guard sheets

### `a3-cleaner`

| Field | Content |
| --- | --- |
| Guard | `a3-cleaner`, kind `grunt` (SPEC rule 9: armed kinds only; dressed as a contract cleaner at the dressing pass), A3 squad, slot (83.0, 3.0), yaw pi (facing south at office 1's desk) |
| Job | The office cleaner: empties the bins desk by desk, office by office, through the suite's communicating doors |
| Route | `route: [[83, 3], [85.4, 2.4], [88.3, 3], [91.2, 2.4], [95.5, 1.5], [91.2, 2.4], [85.4, 2.4]]`, `waits: [5, 0, 5, 0, 5, 0, 0]`, `faces: [pi, NaN, pi, NaN, pi/2, NaN, NaN]`. Office 1 desk (5 s, facing the desk, south) -> door 1 -> office 2 desk (5 s, south) -> door 2 -> office 3 far desk (5 s, facing east) -> back through both doors without stopping. 25.4 m at 0.99 m/s = 25.7 s + 15 s: cycle about 41 s (A3-C1) |
| What he sees | Inside the office he stands in only: the frosted partitions and the corridor wall stop his sight (P17). Focus 55 deg to 25 m (the office's 6 x 8.7 m), periphery 12 m |
| Gaps | While he is in office 3 (about 15 s: the walk in, 5 s at the far desk, the walk out) offices 1 and 2 are empty; while he is in office 1, office 3 is empty |
| Isolation moment | Office 3's far desk (95.5, 1.5), 5 s facing east, his back to the communicating door at x 91.2: alone, lit but unwatched (the camera cannot see in); darkenable from cover by office 3's switch (LR4) |
| Covered by / covers | Nobody (the camera and he never see the same floor) |
| Lures | An office switch turned off (`lightsOut`, 25 m: every office switch reaches every desk): he walks to that switch by the office's door with his torch on (dark office, head under 0.35). Office 1's switch (79.7, 6.0) brings him to office 1's west wall beside the lobby door: a player in the west lobby takes him through the door from his left. Office 3's switch (93.0, 8.65) brings him to office 3's corridor door, his back to the far desk |
| Search | Inside the offices (search ring to 11 m, stops at the partitions' doors); nearest hide spots: the desk-run recess, the trolley bay, the west lobby beyond office 1's door |
| Body | Any office (all on his loop); the corridor is the camera's |

### `cam-a3-hall` (device sheet)

| Field | Content |
| --- | --- |
| Device | Ceiling IR camera (SPEC A3-2), from `jamRelay`: (96.6, y 2.8, 10.75), facing west, sweep +-8 deg, hFov 70, vFov 45 pitched to an 8.75 m floor patch, range 17 |
| Sees | The corridor x 79.6-96.6 (all of it but the archway line) in the dark or lit (G240); not the recess hide spot (tested by the helper), not the lobbies (the west one out of range, the east one behind the mount), not the offices |
| Beaten by | The held jammer (5 s + 1.5 s reboot = 6.5 s blind), two jammers in a row (J3), a shot (host only) |
| On a full spot | Send-back to the west lobby (`HALL_BACK_HOLD` 3 s) and the alarm stage (never a fail, G125) |

## 3. Beat chart rows

| Space | Tension | Mechanic taught | Combined | Release | Feeling |
| --- | --- | --- | --- | --- | --- |
| A3 the Office Range | 2 | Timed jam relay (four jams) | One guard (offices route) | The far lobby; the swap mirrors the first half | Strict alternation: "go... now hold... go" |
| L3 | 1 | - | - | Lobby; the officer's back through the glass | The plan for A4 starts here |

## 4. Coverage table (verbs in this set)

| Verb | Use here |
| --- | --- |
| Held jammer on a camera (relay) | Taught (C4): four jams, the cooldown and reboot |
| Two jammers on one target (J3) | Optional (both jam for a longer window) |
| Camera send-back (the one hard rule) | Taught (signposted by the first line) |
| Light switch lure | Tested (office switches: the cleaner) |
| Takedown from behind, hide a body | Optional (the far desk, the lured switch spots) |
| Doors (stealth open, communicating doors) | Used (the offices route) |
| Back to wall / peek at a corner | Optional (the archway, the recess cheek) |
| Shoot a camera | Optional loud route (host only today) |
| Leg-up, relay, throw, hang-down, rope, paired hack, console, dual takedown, timed isolator | Not used here |
| Split jump, wall jump, pipes, ladders, ducts, rappel, high routes | Not used: 3 m office floors have no believable element (SPEC 8) |

## 5. Tool / problem matrix

| Problem | Tools (at least three) |
| --- | --- |
| The camera over the corridor | Partner's jam (relay) / two jams back to back (J3) / the offices route / shoot it (loud) |
| The send-back | The recess hide spot / jam timing (the HUD's jam ring) / the partner keeps his place and jams again |
| The cleaner in the offices | Time his loop (office 3's 15 s) / lure him with an office switch / take him at the far desk / skip the offices (corridor) |
| Office 3's door inside the camera's near frame | Partner's jam from the west lobby (18.1 m) / a jam from the east lobby by whoever is through / shoot the camera |
| A body in an office | The desk-run recess / the trolley bay / the west lobby (out of his loop) |

## 6. Metrics check

| Element | Number | Window (source) | Pass |
| --- | --- | --- | --- |
| Corridor | 3.5 x 17.5 m | Corridor 3.5-4.0 m (scale sheet); `jamRelay` length <= 19 | Yes |
| First hop | 10.0 m walk (lane, then into the hide spot) = 5.9 s at 1.7 m/s | `JAM_WINDOW` 6.5 s (correction from the greybox tests) | Yes |
| Second hop | hide spot -> east lobby (97.3, 10.75) about 9.6 m (0.8 m to the lane + 8.8 m) = 5.7 s | 6.5 s | Yes |
| Recess spacing | 8.75 m | `JAM_HOP` 8.84 m | Yes |
| Jam posts to camera | 18.1 m (west), 1.4 m (east) | `JAMMER.range` 20 | Yes |
| Camera mount / range | 2.8 m / 17 m | `CAMERA.mountMin` 2.4-3.5; range <= 18 | Yes |
| West lobby out of range | archway 17.1 m from the camera | range 14 (was 17) | Yes (unit test "no lobby point seen") |
| Cooldown between one player's jams | 5 s | `JAMMER.cooldown` 5 | The partner waits in the recess 5-6 s |
| Cleaner cycle / stops | about 41 s; 5 s | LD 4.3: 25-45 s; 3-6 s | Yes |
| Offices | 5.9, 5.8, 5.8 m wide x 8.7 m | Play space >= 6 m (A3-C3) | Near (offices on the 6 m grid shifted by the lobby) |
| Doors | 1.2 x 2.1 (offices); 1.8 (L2, L3) | Door 1.2 x 2.1 | Yes |
| Takedown at the far desk | from the communicating door (91.2, 2.4) to behind him (94.8, 1.5): 3.7 m crouched in office 3 | Reach 1.8 | Yes (approach from behind) |
| Ceiling | 3.0 m | Rooms 3.0 m | Yes |

## 7. Lights (LIGHTING-PLAN section 3, `MARLOW_CIRCUITS`)

| Group | Key | Kind | Lamps (plan, y 2.95) | Switch / reason | Lure |
| --- | --- | --- | --- | --- | --- |
| 30 | `a3-corridor` | switch | 6 recessed panels at x 81, 84, 87, 90, 93, 96, z 10.75 | `a3-sw-corr` (78.6, 12.7), in the west lobby | cleaner (within 25 m: he walks out of office 1's lobby door to the switch; a lobby takedown spot) |
| 31 | `a3-office1` | switch | (81.5, 4.3), (84.0, 4.3) | `a3-sw-off1` (79.7, 6.0), inside office 1 by its lobby door | cleaner |
| 32 | `a3-office2` | switch | (87.3, 4.3), (89.6, 4.3) | `a3-sw-off2` (87.45, 7.65), on the recess back's jamb inside office 2 | cleaner |
| 33 | `a3-office3` | switch | (93.2, 4.3), (95.5, 4.3) | `a3-sw-off3` (93.0, 8.65), inside by the (moved) corridor door | cleaner |
| 34 | `a3-lobbies` | house | (77.75, 8.0) radius 6.0 intensity 1.5 (moved from (77.75, 6.5): at 6.5 the lobby read 0.18), (98.5, 6.5) downlights | None: the landlord's common-parts timer circuit | - |

- Zones: set `ambientZone` x 76-100, z 0-13 at 0.14 (`minY` -1, `maxY` 2.9: ceiling 3.0 - 0.1; `MARLOW_ZONES` uses 10,
  A3-C5).
- Dark pockets: none.
- Light-test spots (`LIGHT_SPOTS`): corridor centre (88.25, 10.75) >= 0.60 (pool); each office middle (82.5, 4.3),
  (88.3, 4.3), (94.1, 4.3) >= 0.40; with an office off its middle <= 0.24 (sampled 1.5 m+ from the frosted partitions:
  the neighbour's lamps pass the glass, A3-C6); the far desk (95.5, 2.3) >= 0.40; west lobby (77.8, 10.75) >= 0.40.
- Parity: frosted partitions pass baked light in the bake, the meter and the picture alike; a lured cleaner's torch
  lights the picture through a partition but not the meter (ENGINE-ANSWERS Q7, A3-C2): the gap is the safe direction
  (the picture is brighter than the meter).

## 8. Objective steps (N1) and per-player lines

Roles (claim): `roles: [{ role: 'b', zone: { box: [79.5, 9, 97, 12.5], y1: 1 } }]`: the first player into the
corridor takes B; the other (the first jammer) is A. A jam is not a course device press, so "A = the first jammer" has
no claim of its own; the zone claim settles both (A3-D5).

| Step | Shared | A | B | Done when |
| --- | --- | --- | --- | --- |
| `a3-in` | Jam the camera for each other. If it sees you, you start again. (63) | Hold the jammer on the camera while your partner moves. (55) | Move on the jam: the recess first, then the far lobby. (54) | `{ flag: 'a3-far1' }` (one player in the east lobby, `any`, with the hall rule) |
| `a3-swap` | Swap: the far player jams now. (30) | Move on your partner's jam: the recess, then the far lobby. (59) | Jam the camera from the far lobby for your partner. (51) | `{ flag: 'a3-far' }` (both in the east lobby, with the hall rule) |
| `a3-lock` | Both of you into holding room three. (36) | - | - | Last line (L3 cycles) |

- Pass zones: `a3-far1` (`any: true`) and `a3-far` (both), box [97.3, 0.3, 99.7, 12.7], `floorY` 0, each with the
  `hall` rule above. A player still "running" the hallway does not count; a clean arrival (camera stage 0) counts.
- Radio: enter "That camera sends you back to the lobby if it sees you. Jam it for each other." (78); second "It sees
  in the dark as well, so the light switch won't save you." (64, A3-D6, LIGHTING-PLAN open item); `a3-in` done
  "Good. Now the other way round."; send-back: the hall `say` line.

## 9. Co-op routes and timing (SPEC section 10: A3 target 1:30, min 0:50, max 2:30; cumulative 5:19)

### Route 1 (taught): the corridor relay

| # | Who | Action | Target | Running in A3 |
| --- | --- | --- | --- | --- |
| 1 | Both | Through L2's door to the west lobby; read the camera, the grid and the recess | 0:10 | 0:10 |
| 2 | A, B | A jams from the post (78.5, 10.75); B walks 10.0 m to the hide spot (5.9 s; B claims B on entry) | 0:07 | 0:17 |
| 3 | A | Cooldown 5 s (the camera reboots 1.5 s after the jam); B waits in the recess | 0:06 | 0:23 |
| 4 | A, B | A jams again; B walks 9.6 m to the east lobby (`a3-in` done) | 0:07 | 0:30 |
| 5 | B, A | B jams from the east post (98, 10.75); A walks to the hide spot | 0:07 | 0:37 |
| 6 | B | Cooldown | 0:06 | 0:43 |
| 7 | B, A | B jams again; A walks to the east lobby (`a3-swap` done) | 0:07 | 0:50 |
| 8 | Both | L3 door (2 m), open, both onto the pad | 0:05 | 0:55 |
| 9 | Both | First-run slack: finding the jam rhythm, one send-back on a first try | 0:35 | 1:30 |

Sum 1:30 (target). Min 0:50 (rows 1-8 with quick reads). Max 2:30 (two or three send-backs).

### Route 2 (alternative / secret): the offices

The first player through office 1's lobby door when the cleaner heads for office 3; follows him at a room's distance
(or waits in office 1's desk-run recess); when he is at the far desk (5 s, back to the door) passes behind him in
office 3 to its corridor door (or takes him there); the partner in the west lobby jams once (18.1 m); 5.3 m east (door x 91.4-92.6, the lobby from x 97) into the
east lobby (`a3-far1`). The second player then takes the corridor relay on the first player's jams (steps 5-7) or the
offices too. About 1:45-2:00.

Way back (C4): the corridor is ground level both ways; the send-back returns a seen player to the west lobby and the
partner keeps his place.

## 10. Self-critique (the 10 weakest points and the fix)

1. The send-back is harsh on a first try and repeats. Fix: the first line signposts it; the recess is a safe halfway
   point; the slack row allows one or two.
2. The relay is the same move four times. Fix: the swap mirrors the jammer's view (from behind the camera); J3 (both
   jamming) and the offices are variations; the set is short (1:30).
3. The offices route makes the corridor optional for one player and still needs one jam: it may read as "the better
   route" once the cleaner is taken. Fix: the cleaner's loop makes it slower; playtest checks if one route dominates.
4. The cleaner carries a torch when lured into a dark office (engine rule), against SPEC's "no torch" (A3-C2). Fix:
   accept the parity gap (picture brighter than the meter through frosted glass); no lure spot faces a partition.
5. The offices are 5.8-5.9 m wide (A3-C3). Fix: accepted; the lobbies take the grid's spare 6.5 m.
6. The east lobby is a 3 x 13 m strip with dead space south of z 7. Fix: lift doors and a services cupboard dress it;
   the L3 door and the jam post use the north half.
7. A player jamming from the east lobby stands 1.4 m behind and under the camera: the aim may be awkward. Fix: the
   post is the helper's (1 m off the end); e2e proves the jam from there; fallback: post at (98.8, 10.75).
8. The cleaner is an armed `grunt` (SPEC rule 9) playing a cleaner. Fix: the dressing pass gives him the trolley and
   overalls look when the guard avatar job lands (Future, M6).
9. The isolation moment is lit (LR4). Fix: office 3's switch darkens it from the corridor door side; the lure then
   moves him away from the desk, so the pair chooses dark or position.
10. A dark corridor (switch 30 off) tempts players: the camera still sends them back. Fix: LANTERN's second line;
    e2e asserts the send-back in the dark.

## 11. e2e route (`scripts/e2e-ctcourse/a3OfficeRange.mjs`, part `:2`, two pages)

Pages: A = host (P1, the odd-set lead), B = client (P2). The client claims B by entering the corridor first.

1. Start at L2's far door after A2; HUD `a3-in` on both pages.
2. Send-back case: the client walks into the corridor unjammed: the camera's stage reaches 2, the client is moved to
   (77.8, 10.75) on both pages, the LANTERN `say` line shows; the claim gave the client B (host A).
3. Dark case: the host switches `a3-sw-corr` off; the client walks in again unjammed: sent back again (G240); switch on.
4. Relay: host holds the jammer on `cam-a3-hall` from (78.5, 10.75); the client walks to (88.6, 8.5) inside the window;
   the client is not sent back; host's cooldown; second jam; the client to (98, 10.75): `a3-far1`, `a3-in` ticks.
5. Swap: the client jams from (98, 10.75); host walks to the hide spot, then (second jam) to the east lobby: `a3-far`,
   `a3-swap` ticks.
6. Both onto the L3 pad; L3 cycles; `a3-lock` done.
7. Lure case (LIGHTING-PLAN section 5): before step 4 (or on a restart), the host turns office 1's switch off while the
   cleaner is in office 2: his target moves to the switch; the office reads dark on both pages.
8. Unit cases re-added in `tests/ctcourse/a3OfficeRange.test.ts`: the cut `jammer.test.ts` hallway cases against
   `A3_HALL`; the west lobby not seen; the hide spot hidden; every walk inside the window.

Shot vantages: the west lobby at the archway looking east; office 2 looking east through the communicating door.

## 12. Playtest checklist (Michael, desktop)

- From the west lobby, is the camera, its grid and the recess readable at a glance?
- Is the jam rhythm learnable in one or two tries (the jam ring, the reboot, the cooldown)?
- Is the send-back fair: did you always know why you were sent back?
- Did either of you try the offices; was the cleaner's loop readable through the doors?
- Does the office switch lure feel useful (where he goes, where you take him)?
- Is any route strictly best (corridor vs offices)?
- Did it feel like a real office floor at night (carpet, frosted glass, lift lobbies)?

## 13. Decisions, corrections and contradictions

| Id | What | Why | Undo |
| --- | --- | --- | --- |
| A3-D1 (correction, job lead / greybox tests) | B's first hop is a 10.0 m walk; the hide spot is (88.6, 8.5) against the recess's camera-side cheek | The recess middle showed a body's edge to the camera on a longer corridor; every real walk is checked in the window | - (test-proven) |
| A3-D2 | Office 3's corridor door cut into the helper's south wall (post-processing the returned boxes) at x 91.4-92.6 (built; first planned at 93.4-94.6) | The camera pitches down 17.7 deg: a crouched head within about 2.1 m of the mount (x past 94.5) is out of frame, so a door at x 94 was nearly invisible to it and the offices route needed no jam (the undo note below); at x 92.0 every standing pace and the creep reach stage 2, a crouch walk peaks 0.83-0.98 and a crouched run 0.63-0.68 (the investigate band, no send-back). The helper makes one opening only (the recess) | Office 3 opens into the east lobby (then the offices route needs no jam and is solo) |
| A3-D3 | No door between office 3 and the east lobby; lobbies full depth (z 0-13) | Keeps the offices route co-op (one jam) and gives L3's door 3 m from each lobby corner | - |
| A3-D4 | Camera `range: 17` set by the builder | The helper leaves the 18 m default; SPEC wants the west lobby out of range | - |
| A3-D5 | The B claim alone (first into the corridor); A follows | `RoleClaim.press` takes course devices, not a jam | - |
| A3-D6 | Second LANTERN entry line about the dark | LIGHTING-PLAN open item "A dark corridor in A3" | Drop the line |
| A3-D7 | Offices 79.5-85.4, 85.4-91.2, 91.2-97 (SPEC 79-86, 86-93, 93-100); far desk (95.5, 1.5) (SPEC (98, 2)) | SPEC's office 3 (to x 100) overlaps the east lobby (x 97-100) and office 1 (from x 79) the west lobby (to 79.5) | - |
| A3-C1 | SPEC: cleaner cycle 35 s with 5 s stops at three desks; the walk alone is 25.7 s at the patrol pace (40.7 s with the stops) | 41 s used (LD 25-45) | 3 s stops (about 35 s) |
| A3-C2 | SPEC A3-5 "the cleaner carries no torch" vs the engine's torch rule (every human guard investigating in the dark) and SPEC rule 9 (no `src/ai` edits) | Parity gap accepted (safe direction) | A torch-free kind (AI change, Guard AI Build) |
| A3-C3 | SPEC 5 "play spaces >= 6 m clear" vs the offices (5.8-5.9 m) and lobbies (3-3.5 m) | Accepted; lobbies are connectors (tight camera spaces) | - |
| A3-C4 | LIGHTING-PLAN "a house-circuit lamp (10, 34, 90-98) never stands inside a set's walkable reach" vs its own group 34 lobby downlights inside A3 | The lobbies stay lit (safe zones, no guard enters, the camera ignores light) | Lobbies on group 30 |
| A3-C5 | `MARLOW_ZONES` gives every set `maxY` 10; SPEC 7 / ENGINE-ANSWERS Q3 say ceiling - 0.1 (2.9 here) | 2.9 asked of the lighting table's owner | - |
| A3-C6 | LIGHTING-PLAN "office off -> that office <= 0.24" vs frosted glass passing the neighbour office's light | Sample 1.5 m+ from the partitions; lamp radius 3 m | - |

Register additions (SPEC 18, A3): A3-9 Office desks and desk runs (cover, the cleaner's stops). A3-10 Lift doors in both
lobbies (dressing, closed: the landlord's lifts are off tonight). A3-11 Office 3 corridor door, office 1 lobby door
(the suite's doors).
