# LR16-W part S3 - section 3 at night (build report)

Builder: Opus 5.5, 2026-10-24. Branch `feature/sector-redesign-lr16w-s3` off `67f3661a`. Brief: `docs/sector-redesign/briefs/LR16-W.md`
"Part S3". Files: `src/world/maps/warehouseS3.ts` (`S3_LAMPS` and the stores-cage lines only), `src/world/maps/warehouseSectors.ts`
(section 3 block, lines 172-207, nothing within 3 lines of sections 1 / 2), `tests/warehouseS3Light.test.ts` (POCKETS: the
crane operator's entry follows his L6 move, same name). No light-model, constant, band or assert change.

## Result
- `warehouseS3Light`: every assert green (11 / 11). Was 4 red asserts: 67 stealth reds, 1 low (C3 far doorway), 1 dark
  (stores officer), the +0.05 pockets (supervisor +0.053, crane operator +0.12, east bay +0.14; the stores officer was also +0.27).
- `warehouseS2Light`: the 5 S3-owned C3 office points green (R1[14] R2[20] R3[16] (-1, 15) 1.00 -> 0.51, C3 checkpoint
  1.00 -> 0.55, C3 near door 0.87 -> 0.45). S2's other reds are S2's / S1's (44 high, 4 low; were 49 + 4).
- `warehouseS1Light`: no point moved (print diff empty).
- No C-entry: every owned red cleared with the brief's levers.

## Method
Step 0 base prints (b1-b3) and the probe, then a linear model of the field: per point and per S3 lamp, the direct level per
unit intensity (written out analytically: `PHOTO` falloff x the w^2 window x the feathered cone x the baked vis; max error
6e-6 against `LightField.lampAt`) plus the lamp's bounce per unit, from a node dump of the real bake (untracked `zz`
probes, deleted). Intensities were solved against the bands with margins (route 0.43-0.52, KEY 0.47-0.52, WORK 0.60-0.74,
pockets <= 0.28 and +0.042), then verified with the real tests and prints after every geometry change (each beam,
radius, move and the occluder re-baked).

## Changed lines (lever, why realistic)
Night state: each level is the fitting's LED night setting (L1). Hall strips stay 0.5-1.1 (raises capped at 1.3x of
today, used where one strip is the only light on a route stretch that another strip was over-lighting); room panels go to
0.03-0.4 because the photometric near field puts a panel 1-1.3 m over a head at 3-7x the level 3 m away.

| id | fitting (old position) | change | lever and reason |
| --- | --- | --- | --- |
| #76 | hall (-2.8, -2.6) | i 1.046 -> 1.109 (x1.06) | L1. West strip end: the walkway ladder foot (KEY) and R2[4]; offsets #77's dim |
| #77 | hall (2.4, -2.6) | i 1.346 -> 1.039 (x0.77) | L1. The cage counter keeps its pool (0.60); less spill into the crane operator's corner |
| #78 | hall (7.6, -2.6) | i 0.321 -> 0.194 (x0.60) | L1. Crane corner and R3[8] |
| #79 | hall (12.8, -2.6) | r 7.77 -> 7, i 0.442 -> 0.575 (x1.30) | L1 (the radius is the photometric reach). Lights the x 14.9 corridor (R1[20], R1[21], the plant room door outside) while its reach ends short of the crane operator's corner |
| #80 | hall (18.26, -2.6) | i 0.294 -> 0.249 (x0.85) | L1. The header grips (with the L4 move below) |
| #82 | hall (-2.8, 3.4) | i 0.7 -> 0.512 (x0.73) | L1 |
| #84 | hall (7.6, 3.4) | i 1.429 -> 0.964 (x0.67) | L1. The press stays a pool (fitter 0.58); R3[7] moved off it (L4) |
| #85 | hall (12.8, 3.4) | i 0.7 -> 0.91 (x1.30) | L1. Takes over R1[20], R2[12] and the main's middle from #86 |
| #86 | hall (18, 3.4) | r 5.96 -> 4.2, i 0.333 -> 0.42 (x1.26), beam 0.6 | L2 high-bay optic (34 deg half angle) and a shorter reach: the east bay pocket (37-40 deg off its axis, 5.5 m away) falls outside, R1[19] (11 deg) keeps its pool |
| #87 | hall (22.15, 3.4) | i 0.7 -> 0.507 (x0.72) | L1 |
| #88 | hall (-2.8, 9.4) | i 0.552 -> 0.529 (x0.96) | L1 |
| #90 | hall (7.6, 9.4) | i 0.517 -> 0.56 (x1.08) | L1. The packing end's pool 0.59 (R1[4] moved off it) |
| #91 | hall (12.8, 9.4) | i 0.502 -> 0.537 (x1.07), beam 0.6 | L2: the forklift top (31-38 deg off its axis) keeps ~0.15 of its light, R1[6]'s floor (19 deg) all of it |
| #92 | hall (18, 9.4) | i 0.646 -> 0.753 (x1.17) | L1. R1[18] and the main's middle (were 0.42 / 0.44) |
| #100-#102 | deck strips (14.5 / 17.25 / 20, 13.2) | i 0.521 / 0.287 / 0.216 -> 0.167 / 0.048 / 0.044 | L1 night level (0.17-0.32x): bodies on the deck stand 0.9 m under them |
| #104 | south wall (-3, -8.35) | i 0.399 -> 0.043 (x0.11) | L1. R2[6] on the walkway stands 0.4 m under it |
| #106, #108 | south wall (5 / 13, -8.35) | i 0.337 / 0.438 -> 0.332 / 0.376 | L1 |
| #109, #110 | south wall over the lobby roof (17 / 21, -8.35) | i 0.895 / 1.056 -> 0.162 / 0.149 | L1. Heads on the lobby roof are 0.2 m under them |
| #111 | C3 office panel (-2.5, 13.5) | -> (-2, 13.5), i 0.307 -> 0.16 | L3 the x -2.5 column moved 0.5 m east with #113 (the 2 x 2 grid kept, 2.5 m pitch) and L1: it carries the C3 route (checkpoint, R1[1], the far door) with less on the near door |
| #112 | C3 office panel (0.5, 13.5) | i 0.45 -> 0.03 (x0.07) | L1 (lowest lit setting): R*[1] stands 1.7 m from it |
| #113 | C3 office panel (-2.5, 16.5), dead | -> (-2, 16.5), r 4.5 -> 1.8, i 0 -> 0.156 | L3 a dead fitting turned on, over the desk: the office's pool (desk 0.60), the route in its rim |
| #114 | C3 office panel (0.5, 16.5) | i 0.278 -> 0.049 | L1. R3[1] (1, 16.05) is under it |
| #115 | parts store (10, 12.8) | i 0.202 -> 0.044 (x0.22) | L1. R1[5] and the supervisor's pocket |
| #119 | manager's office (5, 15) | i 0.498 -> 0.381 (x0.77) | L1 |
| #120-#123, #125 | production office | i 0.278 / 0.282 / 0.25 / 0.578 / 0.626 -> 0.097 / 0.086 / 0.045 / 0.074 / 0.085 | L1 office night state: #123 / #125 over the clerk's and the terminal's desks are the pools (clerk 0.60, terminal 0.68, objective 0.75); the z 15.7 row is fill. No beam was needed |
| #126-#128 | plant room | i 1.296 / 1.143 / 1.366 -> 0.197 / 0.117 / 0.234 | L1 (0.10-0.17x): the engineer's panel 0.74, the doors and the grate 0.51-0.52 |
| #129 | fire lobby (18, -7.2) | i 1.184 -> 0.11 (x0.09) | L1 |
| #130 | fire lobby (21, -7.2), dead | i 0 -> 0.068 | L3 the dead fitting lit: the lobby, the extract and the tour guard's spot share one low level |
| #131 | exit sign (23.7, -7.2) | r 3.69 -> 1.5, i 0.71 -> 0.127 | L1 to a sign. Radius 1.5, not the brief's 0.6: at 0.6 nothing reaches the tour guard's spot (23, -7.9) and #130 alone cannot hold it at 0.38+ without the extract going over; 1.5 gives the exit door a green glow (0.98 right at the sign, 0.52 at the guard's spot) |
| #133 | new: the C3 door light | an LED bulkhead on the office door's lintel, hall side, (-0.6, 2.4, 11.55), group 51, downlight cone 0.96, r 1, i 0.03 | The brief's door-light option, appended as its own room entry at the end of `S3_LAMPS` (ids #76-#132 unchanged). A downlight over the threshold lights the doorway outside (0.42 -> 0.51) and the far door; the lintel keeps it off R*[1] inside. Placed over the east half of the 1.1 m gap so the far door gets about as much as the doorway |

Occluder (L5, the stores-cage lines): the secure store at the cage's back, sheet steel on the existing mesh: a top
(1.5, 2.43, -7.325) 3.0 x 0.06 x 2.65 over x 0-3, z -8.65 to -6.0 (under the crane walkway), and the west side (0, 1.2,
-7.325) 0.06 x 2.4 x 2.65 on the x 0 fence. Both are rendered boxes in the light set (>= 0.05 thick), marked `overhead`
and `noLedge` (no nav surface, no ledge; the fence's own nav blocker is unchanged). The top cuts #77 (the brief's plan);
the side is needed too: #76's rays to the corner enter through the west mesh at y 1.9-2.3, under the top. The counter
(4.7, -5) is outside it (0.60). Realistic: a lockable steel store at the back of a parts cage.

Route waypoints (L4, `warehouseSectors.ts` section 3; each <= 1.0 m, same surface, same way, `obj` and `climbs` kept):

| point | old -> new | move | why |
| --- | --- | --- | --- |
| R1[4] | (9.6, 7.6) -> (10.2, 7.6) | 0.6 m east along its leg | off the packing end's pool (#90), so the packing end keeps 0.59 |
| R1[12], R1[14], R2[17], R2[19] | (22.9, 15.6, 3.3) -> (23.5, 15.35, 3.3) | 0.65 m, toward the grille | it stood under #122; beside the grille (KEY) both read the same rim (0.51 / 0.48) |
| R2[3] | (-3, 9) -> (-3, 8.2) | 0.8 m south on the west strip line | off #88's axis (the porter's spot and the doorway keep #88) |
| R2[10], R2[26] (roof) and R2[11] (grip) | (17, -2.1, 3.8 / 5.8) -> (17, -1.4, 3.8 / 5.8) | 0.7 m north on the plant roof and the 5.8 header | off #80; the grip is still on the header (z -3.0 to -1.2) |
| R2[25] (grip) | (17, -1.6, 5.8) -> (17, -1.4, 5.8) | 0.2 m | the same |
| R3[7] | (9.8, 4) -> (10.6, 4) | 0.8 m east (0.4 m clear of the CNC) | off the press's pool (#84), the brief's suggestion |
| R3[9] | (14.9, -4.2) -> (14.9, -3.6) | 0.6 m north | the z -4.2 spot sits in section 1's spill through the corridor door (0.23 before any S3 lamp) |

Guard (L6): the crane operator's post, first route point and takedown spot (8, -6.8) -> (7.3, -7.5) (0.99 m), under the
walkway's edge (z -7.45) and west of the die rack; the S3 test's POCKETS entry follows (same name). The brief's (8, -7.6)
does not work: the z -2.6 strips' rays reach a head under the walkway from the north (they cross y 2.9 at z -6.05), so the
walkway shades nothing there; (7.3, -7.5) is darker (+0.042 with #79's shorter reach). `tests/sectors.test.ts` (M8) passes.

## Red points, base -> after (S3 print; "red" = outside the test band at base)
Points whose route waypoint moved show "old -> new" position.

| | point | band | base | after |
| --- | --- | --- | --- | --- |
| red | R1[0] (-1.2, 14.8) | 0.4-0.55 | 1.00 | 0.55 |
| red | R1[1] (-0.95, 12.6) | 0.4-0.55 | 1.00 | 0.52 |
|  | R1[2] (-0.95, 11.2) | 0.4-0.55 | 0.42 | 0.51 |
|  | R1[3] (-1.6, 7.6) | 0.4-0.55 | 0.48 | 0.46 |
| red | R1[4] (9.6, 7.6) -> (10.2, 7.6) | 0.4-0.55 | 0.79 | 0.53 |
| red | R1[5] (10.4, 12.6) | 0.4-0.55 | 1.00 | 0.43 |
|  | R1[6] (12.4, 10.8) | 0.4-0.55 | 0.57 | 0.53 |
| red | R1[7] (13.5, 10.8, 2.2) | 0.4-0.55 | 1.00 | 0.42 |
| red | R1[8] (13.6, 12.3, 3.3) | 0.4-0.55 | 1.00 | 0.53 |
| red | R1[9] (16.6, 12.4, 3.3) | 0.4-0.55 | 1.00 | 0.42 |
| red | R1[10] (17, 13.8, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R1[11] (17, 15.3, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R1[12] (22.9, 15.6, 3.3) -> (23.5, 15.35, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R1[13] (23.3, 17.3, 3.3) | 0.45-0.8 | 1.00 | 0.74 |
| red | R1[14] (22.9, 15.6, 3.3) -> (23.5, 15.35, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R1[15] (17, 15.3, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R1[16] (17, 13.8, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R1[17] (20, 12.3, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
|  | R1[18] (20, 11.2) | 0.4-0.55 | 0.45 | 0.47 |
|  | R1[19] (18.6, 4) | 0.4-0.55 | 0.47 | 0.43 |
|  | R1[20] (14.9, -0.3) | 0.4-0.55 | 0.40 | 0.42 |
|  | R1[21] (14.9, -6.3) | 0.4-0.55 | 0.44 | 0.43 |
| red | R1[22] (17.8, -6.6) | 0.4-0.55 | 1.00 | 0.52 |
| red | R1[23] (22.5, -7.2) | 0.4-0.55 | 1.00 | 0.48 |
| red | R2[0] (-1.2, 14.8) | 0.4-0.55 | 1.00 | 0.55 |
| red | R2[1] (-0.95, 12.6) | 0.4-0.55 | 1.00 | 0.52 |
|  | R2[2] (-0.95, 11.2) | 0.4-0.55 | 0.42 | 0.51 |
|  | R2[3] (-3, 9) -> (-3, 8.2) | 0.4-0.55 | 0.54 | 0.50 |
|  | R2[4] (-3, -6.6) | 0.4-0.55 | 0.53 | 0.53 |
|  | R2[5] (-3.4, -6.9) | 0.4-0.55 | 0.46 | 0.46 |
| red | R2[6] (-3.2, -8, 3) | 0.4-0.55 | 1.00 | 0.52 |
|  | R2[7] (4, -8, 3) | 0.4-0.55 | 0.55 | 0.52 |
|  | R2[8] (12, -8, 3) | 0.4-0.55 | 0.57 | 0.52 |
| red | R2[9] (16.6, -6.6, 3.2) | 0.4-0.55 | 1.00 | 0.52 |
| red | R2[10] (17, -2.1, 3.8) -> (17, -1.4, 3.8) | 0.4-0.55 | 0.82 | 0.53 |
| red | R2[11] (17, -2.1, 5.8) -> (17, -1.4, 5.8) | 0.4-0.55 | 0.82 | 0.53 |
|  | R2[12] (17, -0.5, 5) | 0.4-0.55 | 0.49 | 0.40 |
| red | R2[13] (17, 12.4, 5) | 0.4-0.55 | 1.00 | 0.51 |
| red | R2[14] (17, 12.4, 3.3) | 0.4-0.55 | 1.00 | 0.51 |
| red | R2[15] (19.6, 13.9, 3.3) | 0.4-0.55 | 1.00 | 0.47 |
| red | R2[16] (19.6, 15.2, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R2[17] (22.9, 15.6, 3.3) -> (23.5, 15.35, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R2[18] (23.3, 17.3, 3.3) | 0.45-0.8 | 1.00 | 0.74 |
| red | R2[19] (22.9, 15.6, 3.3) -> (23.5, 15.35, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R2[20] (19.6, 15.2, 3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R2[21] (19.6, 13.9, 3.3) | 0.4-0.55 | 1.00 | 0.47 |
| red | R2[22] (17, 12.4, 3.3) | 0.4-0.55 | 1.00 | 0.51 |
| red | R2[23] (17, 12.4, 5) | 0.4-0.55 | 1.00 | 0.51 |
|  | R2[24] (17, -0.5, 5) | 0.4-0.55 | 0.49 | 0.40 |
| red | R2[25] (17, -1.6, 5.8) -> (17, -1.4, 5.8) | 0.4-0.55 | 0.66 | 0.53 |
| red | R2[26] (17, -2.1, 3.8) -> (17, -1.4, 3.8) | 0.4-0.55 | 0.82 | 0.53 |
| red | R2[27] (16.6, -6.6, 3.2) | 0.4-0.55 | 1.00 | 0.52 |
| red | R2[28] (21.7, -7.2, 3.2) | 0.4-0.55 | 1.00 | 0.52 |
| red | R2[29] (22.5, -7.2) | 0.4-0.55 | 1.00 | 0.48 |
| red | R3[0] (-1.2, 14.8) | 0.4-0.55 | 1.00 | 0.55 |
| red | R3[1] (1, 16.05) | 0.4-0.55 | 1.00 | 0.40 |
| red | R3[2] (3, 16.05) | 0.4-0.55 | 0.70 | 0.53 |
|  | R3[3] (3.2, 13) | 0.4-0.55 | 0.55 | 0.45 |
| red | R3[4] (5.15, 12.6) | 0.4-0.55 | 0.63 | 0.51 |
|  | R3[5] (5.15, 11.2) | 0.4-0.55 | 0.50 | 0.45 |
| red | R3[6] (9.6, 10.4) | 0.4-0.55 | 0.72 | 0.47 |
| red | R3[7] (9.8, 4) -> (10.6, 4) | 0.4-0.55 | 1.00 | 0.53 |
|  | R3[8] (10, -4.6) | 0.4-0.55 | 0.53 | 0.53 |
|  | R3[9] (14.9, -4.2) -> (14.9, -3.6) | 0.4-0.55 | 0.55 | 0.50 |
|  | R3[10] (15.2, -3.3) | 0.4-0.55 | 0.53 | 0.45 |
| red | R3[11] (16.9, -3.3) | 0.4-0.55 | 1.00 | 0.52 |
| red | R3[12] (22.4, -1.8) | 0.4-0.55 | 1.00 | 0.51 |
| red | R3[13] (23.65, 15.42, 3.3) | 0.4-0.55 | 1.00 | 0.51 |
| red | R3[14] (23.3, 17.3, 3.3) | 0.45-0.8 | 1.00 | 0.74 |
| red | R3[15] (23.65, 15.3, 3.3) | 0.4-0.55 | 1.00 | 0.48 |
| red | R3[16] (22.4, -1.8) | 0.4-0.55 | 1.00 | 0.51 |
| red | R3[17] (16.9, -3.3) | 0.4-0.55 | 1.00 | 0.52 |
|  | R3[18] (15.2, -3.3) | 0.4-0.55 | 0.53 | 0.45 |
|  | R3[19] (14.9, -6.3) | 0.4-0.55 | 0.44 | 0.43 |
| red | R3[20] (17.8, -6.6) | 0.4-0.55 | 1.00 | 0.52 |
| red | R3[21] (22.5, -7.2) | 0.4-0.55 | 1.00 | 0.48 |
| red | connector: C3 checkpoint | 0.45-0.55 | 1.00 | 0.55 |
| red | connector: C3 far doorway outside | 0.45-0.55 | 0.42 | 0.51 |
|  | walkway ladder foot | 0.45-0.55 | 0.46 | 0.46 |
|  | plant room west door, outside | 0.45-0.55 | 0.53 | 0.45 |
| red | plant room west door, inside | 0.45-0.55 | 1.00 | 0.52 |
| red | the grate | 0.45-0.55 | 1.00 | 0.51 |
| red | the grille | 0.45-0.55 | 1.00 | 0.48 |
| red | the window, outside | 0.45-0.55 | 1.00 | 0.47 |
| red | the lobby | 0.45-0.55 | 1.00 | 0.52 |
| red | the extract centre | 0.45-0.55 | 1.00 | 0.49 |
| red | the hatch edge (lobby roof) | 0.45-0.55 | 1.00 | 0.52 |
|  | the main's middle | 0.4-0.55 | 0.44 | 0.44 |
|  | the fitter (the press) | 0.55-0.8 | 0.79 | 0.58 |
|  | the packing end | 0.55-0.8 | 0.70 | 0.59 |
|  | the cage counter | 0.55-0.8 | 0.71 | 0.60 |
| red | the engineer's panel | 0.55-0.8 | 1.00 | 0.74 |
| red | the clerk | 0.55-0.8 | 1.00 | 0.60 |
| red | the terminal | 0.55-0.8 | 1.00 | 0.68 |
|  | the porter's spot | 0.4-0.55 | 0.50 | 0.49 |
| red | the tour guard's spot (the lobby) | 0.4-0.55 | 1.00 | 0.52 |
|  | supervisor's spot (the parts store) | dark<=0.3 | 0.17 | 0.13 |
|  | loader's spot (the deck, west staging) | dark<=0.3 | 0.15 | 0.15 |
|  | crane operator's spot (under the walkway) | dark<=0.3 | 0.24 | 0.16 |
| red | stores officer's spot (the cage corner) | dark<=0.3 | 0.39 | 0.14 |
|  | the east bay by the plant room | dark<=0.3 | 0.30 | 0.20 |
|  | the deck's west end | dark<=0.3 | 0.13 | 0.13 |
Pockets (S3 lamps off -> on): supervisor 0.12 -> 0.13 (+0.011, was +0.053), loader +0.031, crane operator (moved) 0.12 ->
0.16 (+0.042, was +0.12), stores officer 0.12 -> 0.14 (+0.016, was 0.39 / +0.27), east bay 0.16 -> 0.20 (+0.044, was
+0.14), the deck's west end +0.006.

Edge rows after (within 0.035 of a band edge, TOL included): R1[0] / R2[0] / R3[0] and the C3 checkpoint (-1.2, 14.8) 0.55
(margin 0.02); R2[12] / R2[24] (17, -0.5, 5) 0.40 (0.02); R3[1] (1, 16.05) 0.40 (0.02); the plant room west door outside
0.45 (0.02); the walkway ladder foot 0.46 (0.03). Pockets: the crane operator +0.042 and the east bay +0.044 (limit +0.05).

## Brightest floor point per room (after; 0.5 m grid, feet on the floor, clear of solids)
| room | brightest | where | mean |
| --- | --- | --- | --- |
| assembly hall | 1.00 | (-3.1, -3.4) under #76, off-route | 0.53 |
| stores cage | 0.85 | (1.9, -4.9) the counter side | 0.46 |
| plant room | 0.84 | (21.9, -3.2) the AHU side | 0.58 |
| fire lobby | 0.98 | (23.4, -7.4) at the exit sign | 0.42 |
| parts store | 0.47 | (9.9, 12.4) its door | 0.16 (the supervisor's pocket room) |
| C3 office | 0.94 | (-2.1, 13.4) under #111 (the desk pool 0.60) | 0.53 |
| manager's office | 1.00 | (3.9, 14.4) under #119 | 0.63 |
| mezzanine deck | 1.00 | (14.4, 12.9) under #100 at the deck edge | 0.25 |
| production office | 1.00 | (17.9, 15.9) between the clerk's desk and the door | 0.63 |

Work pools: fitter 0.58, packing end 0.59, cage counter 0.60, engineer's panel 0.74, clerk 0.60, terminal 0.68, objective
0.75. Routes in the 0.40-0.55 rim, pockets 0.13-0.20.

## Other sections (print diff, |delta| > 0.005)
- S1: empty.
- S2: the 5 owned points above, plus:
  - R1[13] / R2[19] / R3[15] (-4.8, 14.55) 0.544 -> 0.526 (-0.018: the C3 panels' bounce through the near door; within +-0.02).
  - "connector: C3 far door" (-0.55, 12) 0.54 -> 0.50 (-0.04). Not on the brief's owned list, but it is the C3 office's
    own threshold (C3 boundary -> S3), and it cannot hold 0.52 with the near door and the checkpoint in band: #111 lights
    the near door 2-3x as much as the far door, #88 is capped by the porter's spot, #112 is shaded by the jamb. It sits
    mid-band (0.45-0.55). Lead call: accept it as a C3 boundary point (INT re-checks it with #111 / #88 / #133).

## Tests (desktop, single files, `--maxWorkers=2`, slot lock, CPU guard)
- `warehouseS3Light`: 11 / 11 green.
- `warehouseS1Light`: 1 red assert (S1's 68, unchanged); `warehouseS2Light`: 2 red asserts (S2's 44 high and 4 low; were
  49 and 4).
- `sectors`, `warehouseCoopS1`, `warehouseCoopS2`, `warehouseCoopS3`, `warehouseLamps`, `lampAudit`, `lampBoxAlign`,
  `warehouseDress`, `sectorLampSync`, `rooms`, `detailPass`, `lampFlicker`, `lampAtlasFit`: 13 files, 173 / 173 passed.
- `npx tsc --noEmit` clean; `npx eslint` on the three touched files clean.
- Not run (rules): e2e, build, full vitest. The moved route points need `e2e-sectorops` (legs on nav, detour) on the
  laptop after INT.

## Open for the lead / Michael
1. S2 "connector: C3 far door" 0.54 -> 0.50 (above). The near door now reads 0.45-0.46 (min 0.43): S2's #70 change there
   must not drop it by more than 0.02; INT re-checks.
2. Exit sign #131 radius 1.5 (brief: 0.6), reason above.
3. Raises over today's level on hall strips (x1.06-1.30: #76, #79, #85, #86, #90, #91, #92): the night state moves light
   off the over-lit spots onto the strips that serve route stretches; all within 1.3x.
4. GPU sheet (laptop): the C3 office desk pool, the cage's steel store, the door light, the beams on #86 / #91.
