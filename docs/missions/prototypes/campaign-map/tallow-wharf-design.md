# Tallow Wharf design deliverables - WIP (stopped)

Status: WIP, withdrawn by its owner on 2026-10-25 (plan first). These are the research notes gathered before the stop,
not the 7-section deliverable. Every citation is at 00b6cde9. Keys: `W1.ts`..`W4.ts`, `Kit.ts`, `Map.ts`, `Sectors.ts`,
`Missions.ts` = `src/world/maps/tallowWharf{W1..W4,Kit,,Sectors,Missions}.ts`; `graph` =
`docs/missions/prototypes/campaign-map/graph.json`.

## Validator (master 4632c933, `node scripts/level-validate.mjs <abs graph.json>`)
`3 error(s), 6 warning(s).` The errors are the gate-reach ERRs of CONFORMANCE TW3. Way back per co-op gate (gate-reach
times, printed by a patched copy of the validator; shutters are two-way gates and not timed):

| Gate | Link (graph line) | Way back (s) | Within 15 s |
| --- | --- | --- | --- |
| C1 | w1-canal-steps -> w1-gallery, coop_boost (graph:662) | 9.8 | yes |
| C1 | w1-market -> w1-gallery, coop_boost (graph:673) | 2.0 | yes |
| C3 | w2-arcade -> w2-walkway, coop_boost / team_rope / team_pull (graph:821, :832, :843) | 2.0 each | yes |
| C4 | w2-pawn-loft -> w2-reading-room, team_throw (graph:947) | 20.0 | no (TW3) |
| C4 | w2-pie-loft -> w2-clock-loft, team_throw (graph:958) | 28.2 | no (TW3) |
| C5 | w2-arcade-roof -> w3-roof, team_throw (graph:1007) | 13.7 | yes |
| C7 | w3-passage -> w3-chute, coop_boost (graph:1210) | 8.7 | yes |
| C9 | w4-back-lane -> w4-shed-three, coop_boost (graph:1325) | 10.7 | yes |
| C10 | w4-canal-ledge -> w4-jetty, team_pull (graph:1415) | 15.8 | no (TW3) |

## Guards (Sectors.ts:105-181): takedown spots and walk times
Takedown spot = `behind` / `behindRoute` (Sectors.ts:49-61). Walk time is route length over the grunt walk speed 0.9 m/s
(`src/config/enemies.json:7`; loops x1, back-and-forth x `PACE.patrol` 1.1, `src/ai/enemy.ts:2537`,
`src/ai/response.ts:31`), stops excluded: an estimate, not a measured cycle (TW10).

| Guard | Space | Type | Position / route | Walk time | Takedown spot |
| --- | --- | --- | --- | --- | --- |
| W1:0 | w1-market | loop | (14,17)-(34,17)-(34,28)-(14,28), 62 m | ~69 s | (14, 18.5) |
| W1:1 | w1-market | loop | (34,40)-(12,40)-(12,31)-(34,31), 62 m | ~69 s | (34, 38.5) |
| W1:2 | w1-market | back-and-forth | (11,18)-(11,42) | ~48 s | (11, 16.5) |
| W1:3 | w1-market | posted | (22, 42.5) facing S, under the clock | - | (22, 44) |
| W1:4, 5 | w1-fish-hall | talking pair | (16, 50), (17.2, 50) | - | (14.5, 50), (18.7, 50) |
| W1:6 | w1-fish-hall | loop | (12,47)-(33,47)-(33,56.5)-(12,56.5), 61 m | ~68 s | (12, 48.5) |
| W1:7, 8 | w1-tea-stall | talking pair (extras) | (15, 10), (16.2, 10.6) | - | (13.5, 10), (17.7, 10.6) |
| W2:0 | w2-arcade | loop | (42,50)-(74,50)-(74,57)-(42,57), 78 m | ~87 s | (42, 51.5) |
| W2:1 | w2-arcade | posted | (55, 60.8) stair foot | - | (55, 62.3) |
| W2:2 | w2-arcade | back-and-forth | (44,54)-(70,54) | ~53 s | (42.5, 54) |
| W2:3 | w2-reading-room | posted, y 4.5 | (55.5, 75) stair head | - | (55.5, 76.5) |
| W2:4 | w2-reading-room | loop, y 4.5 | (46,76)-(58,76)-(58,79)-(46,79), 30 m | ~33 s | (46, 77.5) |
| W2:5 | w2-reading-room | posted, y 4.5 | (47, 78.2) reader | - | (47, 79.7) |
| W2:6 | w2-reading-room | posted, y 4.5 (extra: Teale) | (51, 75.4) | - | (51, 76.9) |
| W2:7 | w2-pawn-loft | posted, y 4.5 (extra: Fenn) | (46, 66) | - | (47.4, 65.46) |
| W2:8 | w2-pie-shop | posted (extra: Garrow) | (60, 66) | - | (60, 67.5) |
| W2:9 | w2-pie-loft | posted, y 4.5 (extra: night clerk) | (60, 66.8) | - | (60, 68.3) |
| W3:0 | w3-east-yard | loop | (102,40)-(112,40)-(112,47)-(102,47), 34 m | ~38 s | (102, 41.5) |
| W3:1 | w3-east-yard | dog, running line (TW1) | (112.5,46)-(109.5,46) | ~6 s | (111, 46) |
| W3:2 | w3-lodge | posted (twist walker) | (117, 48) | - | (117, 49.5) |
| W3:3, 4 | w3-east-wing | posted clerks | (110, 57.4), (116, 57.4) | - | (110, 58.9), (116, 58.9) |
| W3:5 | w3-east-wing | loop | (108,56)-(118,56)-(118,72)-(108,72), 52 m | ~58 s | (108, 57.5) |
| W3:6 | w3-east-wing / front hall | back-and-forth | (108,68)-(100,68) | ~16 s | (109.5, 68) |
| W3:7 | w3-west-wing | posted clerk | (90, 55.4) | - | (90, 56.9) |
| W3:8 | w3-west-wing | loop | (83,68)-(85.5,58)-(83,58), 22.8 m | ~25 s | (83, 66.5) |
| W3:9 | w3-west-wing / front hall | back-and-forth | (99,68)-(90,66) | ~19 s | (100.46, 68.33) |
| W4:0 | w4-shed-yard | loop | (46,26)-(70,26)-(70,9)-(46,9), 82 m | ~91 s | (46, 24.5) |
| W4:1 | w4-shed-yard | handler, back-and-forth | (50,20)-(66,20) | ~32 s | (48.5, 20) |
| W4:2 | w4-shed-yard | dog (TW1) | (51.5,20.5)-(67.5,20.5) | ~32 s | (50, 20.5) |
| W4:3 | w4-shed-yard | posted, crane leg | (60, 13.6) | - | (60, 15.1) |
| W4:4, 5 | w4-shed-yard | minders' pair (TGC twist) | (48, 26), (49.2, 26) | - | (49.5, 26), (47.7, 26) |
| W4:6 | w4-shed-three | posted tally clerk | (74, 24) | - | (74, 25.5) |
| W4:7 | w4-shed-three | posted customs locker | (80.8, 11.2) facing N | - | (79.4, 10.6) set by hand |
| W4:8, 9 | w4-shed-three | dockers' pair | (76, 16), (77.2, 16) | - | (74.5, 16), (78.7, 16) |
| W4:10 | w4-shed-three | hand truck, back-and-forth | (78,24)-(78,12) | ~24 s | (78, 25.5) |
| W4:11 | w4-shed-three | foreman loop | (74,12)-(85,12)-(85,26)-(74,26), 50 m | ~56 s | (74, 13.5) |

Spawned per mission: `WHARF_GUARD_MISSIONS` (Sectors.ts:200-203).

## Findings for the deliverable (not yet written up)
Build gaps with a TW row:
- Both shutters are closed stand-ins (W1.ts:136-137, W4.ts:156-157): W1 cannot be left (TW2).
- Lit by default everywhere (W1.ts:150, W2.ts:229; theme Map.ts:76-79); no space type or band (TW4, G329).
- 4 restart points, none per encounter space (Sectors.ts:39-46, :316, :338, :360) (TW13).
- Hide spots: 8 for 9 encounter spaces; none in w3-east-yard or w3-east-wing (W3.ts:303) (TW14).
- No `medkitWalls` (Map.ts:88-104) (TW15). No civilian kind: clerks, readers and decoys are `grunt` (TW20, G353).
- Dogs W3:1 and W4:2 (Sectors.ts:148, :168) (TW1). Loft ladder through a hatch in a let loft (W2.ts:201-204) (TW22).

Build gaps with no TW row found (to raise with the Campaign Build lead):
- No `surface` marks: every floor is the default concrete (`src/world/mapDef.ts:37-38`), so the iron fire escape, the
  gantry and the stages are not loud floors (5.3). No `ambientZone` and no `noisy` sources either: the sound plan has
  nothing to describe.
- No stair has a handrail or balustrade: the fire escape (W3.ts:158-161), the west-wing gallery stair (W3.ts:257), the
  jetty steps (W4.ts:134) (16.2.4).
- No parapet on the W1 gallery (W1.ts:81-84) or on the arcade roof's south edge at z 62 (W2.ts:201-208) (16.5.3).
- The W3 roof's coal-yard edge is a 2.2 m screen with no named object (W3.ts:56, Kit.ts:322-335) (16.4.1).
- The W2 lightwell drain (W2.ts:164-165) is there so a fall-in is not a softlock: a gameplay reason (2.2).
- Duct ends are open holes, no grate or inspection door (W1.ts:84, :110; W2.ts:137; W4.ts:111) (16.7.4).
- Vantages that the plan suggests are blocked (unmeasured, TW10): w1-fish-hall from the gallery (the warden's stair core
  W1.ts:114-116 and the hall's west wall W1.ts:133 stand between); w2-reading-room from the arcade roof (no window in the
  reading room's south wall, W2.ts:219); w4-shed-three from the gantry (the shed roof W4.ts:149 is solid under the
  visual-only glazing W4.ts:150); w4-shed-yard from the gantry (the 2.2 m solid drop guards W4.ts:58-65 stand above the
  eye line).
- The chute's yard hatch is 4.4 m above the coal yard (W3.ts:215-224), not 2.2 m as the SPEC says (SPEC:81).
- The TKL hint names a brass plate (Missions.ts:150) but no `board` intel grants `tkl-gate-code`; only the overheard
  clerk does (Sectors.ts:238).
- The crane gantry's legs stand inside shed three through its roof (W4.ts:165, :149).
- The passage's bulkhead lamp (W3.ts:284, group 88) is unswitchable and unshootable over the C7 boost spot, on W3's only
  way out, with no route around (5.2; the jammer still works on it: `electric` true).

## Lamp groups (for the light plan)
W1 60-67 (W1.ts:151-158; switches :166-170; 65 canal photocell, 66 clock face clockwork, 67 passage bulkhead have no
switch). W2 70-76 (W2.ts:230-236; every group switched, :244-250). W3 80-90 (W3.ts:275-287; switches :295-301; 81
starts off; 86 lantern moonlight, 88 passage bulkhead, 89 coal yard and cartway photocell, 90 turret clock have no
switch). W4 91-97 (W4.ts:173-184; switches :203-205; 94 quay photocell, 95 lane lamp (no reason given), 96 emergency,
97 aviation have no switch).

## Bolts (Sectors.ts:206-228), the side that draws each
W1 warden's stair foot (stair side), fish hall back door (passage side). W2 pawn stair top and pie stair top (loft
side), clock door (clock-loft side), both taking-in doors (loft side). W3 chute hatch (chute side), coal-yard door (yard
side), bridge door (counting-house side), cart gate roller (cartway side). W4 shed three yard door (inside), jetty gate
(jetty side). Keypad: the east gate (Sectors.ts:369). Pair gate: the strongroom door (Sectors.ts:370-377). No cameras,
lasers or alarm panels (Map.ts:103).
