# Thornbeck Mill: element register (level-design 16.9)
Owner: Night Shift | Campaign Build. Status: current (S1b greybox, `src/world/maps/thornbeckMill.ts`).

One row per element of the greybox, as `docs/level-design.md` 16.9 asks: every ladder, hatch, opening, cover object and
lamp has a real-world reason and a gameplay use. Coordinates are metres (x east, z north, origin the hall's south-west
corner, y up; the gallery deck top is +4.2). The plan is `PLAN.md` section 3 and `map-plan.svg`; the code names are in
`thornbeckMill.ts`. "Rule" is the level-design rule the row answers to (or the PLAN's own skip list, "PLAN skip n").

The mill: a 1890s timber-frame grain mill on a brick plinth, now a seed merchant's store; tonight a security contractor's
night crew holds it in a thunderstorm. The middle of the hall is the machinery floor (roller mills, a plan sifter, the
crane well): real, seen from the path and the gallery, never walked. Grain bins and sack walls stand where a working mill
keeps them, which is also what fences the path.

## Shell, openings and doors
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| H1 | Hall, 32 x 18 m, timber walls 9 m, one connected volume | A mill hall is one tall room: the machinery runs through it and the gallery overlooks it | The whole scene: one place, a directed path, nothing to explore | 2.1 real building; PLAN skip 2 (one path, Michael ~20:16) |
| H2 | Roof: one closed slab at 9.0 - 9.4 m (a flat greybox; the plan's gable ridge, about 12 m, comes with the dressing) | A mill is roofed; rain on it is the storm's sound | Keeps the sky out: the lightning enters only by the openings below (SO5); the intro camera rises to 7.5 m under it | 16.5.1 roofs fully covered; deviation: flat, not a ridge |
| H3 | Outer wall 3.6 m off the hall, 14 m tall (the play-area bound) | The yard's boundary wall | Nothing: keeps the play area closed, and no jump or split gap in the yard | greybox bound |
| W-S1..S3 | South windows x 2-4, 11-13, 21-23 (sill 1.0, head 3.4), clear glass | Day-light windows of the ground floor | Lightning comes in here; a flash band on the south aisle and the start bay, shadows behind the sacks and bins; bodies stop at the glass | 16.3.1 stated function; 5.1, 5.6 |
| W-W1 | West gable window z 3-5 | A gable window lights the start bay | Flash band over the start bay's west end (the players' wall) | 16.3.1; 5.6 |
| W-E1 | Office east window z 8.5-10 (sill 1.0, head 2.6) | The clerk's window onto the yard | Flash through the office window; G6's torch pans it | 16.3.1; 5.6 |
| W-N1..N4 | Gallery windows in the north wall x 4-6, 13-15, 17-19, 25-27 (1.0 over the deck) | Light for the loft floor | Flash bands across the gallery; the long gallery is lit in beats, not all along | 16.3.1; 5.6 |
| BG1 | Board gap, east wall z 2-3 (1.9 - 2.3), open | Weathered boards leave a gap behind the bin bank | A thin flash of light on the sealed bank; a body cannot pass it | 16.3.1; 5.6 |
| D1 | Hoist door, west gable z 15.8-17.4 at deck level, locked, 1.6 m | The loft's sack hoist opens onto its platform for loading from a crane | The way out: locked until every guard is down (the scene opens it); the exit zone is the platform | 16.3.6 skipped (PLAN skip 10); 16.3.1 |
| D2 | Stair foot gate, x 8.2-9.4 at the stair's foot, locked, bolted from the stair side | A sprung safety gate keeps loose grain and people off the loft stair; it latches behind whoever comes down and opens only from above | Opening one way only: the guards come down it; the players cannot go up it; no second way up from the start bay | 16.3.5 gate with an owner (the mill); 2.6 |
| D3 | Office west door z 11.6-12.8 | The clerk's door onto the sack bay | Stretch 3's goal and the meeting point of G4 + G5 (stretch 5) | 16.3.1 |
| D4 | Office north door x 29-30.2 | The clerk's second door onto the ladder lobby | Leaves the office for the ladder (stretch 6) | 16.3.1; 2 doors for the room |
| X1 | Exit sign over the hoist door | A real site signs its exit | A small green light that dies with the mains | 16.6.5 signs realistic |

## Vertical circulation
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| ST1 | Main stair x 8.2-9.4, z 10.2-15, 22 steps, 41 degrees, enclosed by 0.1 m walls on both sides, lintel over the foot gate | The mill's loft stair, steep as such stairs are; the plan draws it from z 10.4, 0.2 m longer here so a 0.5 m nav cell's rise stays under the guards' step | The way the opening four come down and G10 posts at the head; closed sides mean no drop into the machinery floor | 16.2.4 complete stair, housing walls; 16.2.1 stair core |
| L1 | Ladder up through the lobby's deck hatch at (31.2, 15.6), facing north, to the deck at z 16.05 | A loft ladder through a sack-hoist hatch; the lobby is the sack hoist's landing | Stretch 6's way up to the gallery; the only way up for the players | 16.2.1 / 16.2.3 / 16.2.7 bent (not a plant space; a second way up beside the stair's gate): needs Michael's reading, see the S1b report |
| HA1 | Deck hatch hole x 30.8-31.6, z 15.2-16.0, a rail each side (the ladder side open) | A hatch with a guard rail where a ladder opening is | The ladder's exit; a body cannot fall in sideways | 16.2.3 guard rail; 16.3.2 real opening |

## Gallery
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| GD1 | Gallery deck, +4.2 m, z 15-18 the length of the hall, timber boards, complete but for HA1 | A loft floor along the north wall carries the stores and the hoist | The upper half of the path: stretches 6-10 | 16.5.2 slab complete |
| GR1 | Guard rail 1.1 m, 0.1 deep, the south edge (x 0-8.1, 9.5-12, 20-32) | A loft edge carries a rail | Players cannot vault or mantle it (the probe misses a top that thin); no drop to the machinery floor | 16.5.3 1.1 m |
| GB1 | Crane-bay drop bar and hoist chain, x 12-20, an invisible 2.4 m collider with a drawn bar and chain | The crane well is open under the hoist; a drop bar and the hoist chain close the loft's edge there | Closes the crane bay to players (no way down); torch light and sight pass it, so G8 + G9's torches sweep the well | 16.5.3; 16.3.3 job at that spot |
| GP1..6 | Posts under the deck's south edge at x 2, 5.5, 11, 16, 21, 24.5 | Posts carry a loft | Visual support; stand on the machinery floor, never on the path | 2.1 real building |
| HP1 | Hoist platform x -2.6 to -0.4, z 15-18, deck height, rails on three sides | The sack hoist's platform outside the gable | The exit zone: both players on it ends the scene | 3.10 designed exit; 16.5.3 |
| GS1..GS3 | Sack stacks on the deck at x 3-5.4, 20-22.4, 26-28.4 (1.2 m, against the north wall) | Sacks wait at the hoist | Crouch cover: hide spots behind GS1 and GS2; GS2 is where the pair turns | 16.4.4 real object |

## Ground floor: fences, walls and cover
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| W1 | Grain bins W1, x 4.5-6.5, z 3-7.5, 2.8 m | Bins stand in rows in a mill | The intro's wall at the players' backs; G1 + G2 search round it | 16.4.1 named object; 3.1 dark vantage |
| BR1 | Bin row east of the start bay, x 9.4-10.6, z 5.2-10.4, 2.8 m | A row of bins | Fences the start bay's east side; closes the machinery floor | 16.4.1; PLAN skip 2 |
| BR2 | Bin row west of the sack bay, x 14.8-16, z 5.2-14.2, 2.8 m | A row of bins | Fences the sack bay's west side | 16.4.1 |
| BR3 | Bin row west of the mill bay, x 18.8-20, z 5.2-6.6, 2.8 m, and the niche z 6.6-8 (a 2.4 m plug at x 18.5-18.8) | A bin row ends; the gap beside it is a niche | The mill bay's hide niche (19.4, 7.3); the plug keeps the niche from joining the sealed pocket | 16.4.1; 4.7 hide spots |
| BB1 | Sealed bin bank, x 26-32, z 0-6, 2.8 m | A bank of bins boarded up behind the office | The office's south wall and the mill bay's east wall; the board gap lights it | 16.4.1 |
| SW1..SW4 | Sack walls 2.4 m: north of the start bay (x 0-8.2, z 9.2-10.4), north of the aisle (x 10.6-20, z 4-5.2), south of the sack bay (x 16-18.8, z 7.4-8.6), north of the sack bay (x 14.8-26, z 13-14.2) | Sacks are stacked in walls between the bins | Fence the path spaces from the machinery floor; the flash shadows | 16.4.1; 16.4.4; PLAN skip 2 |
| M1 | Roller mill M1, x 21.5-24, z 3.5-6, 2.2 m | A roller mill on the mill bay's floor | G3 stops in its shadow (K2); cover on the path | 16.4.1 |
| SA | Low sacks Sa x 1.5-3.9, z 1-2.2 (1.2 m) | Sacks by the window | First cover for the players at the start; hide spot behind it | 16.4.4 |
| SB1, SB2 | Low sacks x 13-14.2, z 0.2-1.2 and x 16.5-17.7, z 2.6-3.8 | Sacks along the south aisle | Stalking cover in the flash shadows; hide spot behind SB2 | 16.4.4 |
| SD1..SD3 | Low sacks x 17.5-19.9 z 11.2-12.4; x 17.6-18.8 z 8.8-9.6; x 23.6-24.8 z 8.6-9.4 | Sacks in the sack bay | Cover for the slip between the two sweeps | 16.4.4 |
| OF1 | Office: a 3.4 m timber box x 26-32, z 6-13, the bin bank its south side; partition x 26 (z 13-18) closes the lobby | A clerk's office built into the hall | G6's post; the lobby is the ladder's landing | 2.1 |
| DK1 | Desk x 28-30.4, z 10.6-11.4, 0.9 m | The clerk's desk | G6 stands at it; hide spot beside it | 16.4.1 |
| MF1 | Machinery floor pieces: plan sifter x 1-7, z 11.5-14; roller mill R2 x 11-14, z 6-9.6; crane-well hopper x 11-14.4, z 10.8-14.4 | The mill's machines; the well is where the crane lowers sacks | Seen from the path and the gallery, never walked; the well is under the crane bay | 16.4.1; PLAN skip 2 |

## Lamps, floors and hide spots
| Id | Element | Real-world reason (one line) | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| L1..L2 | Caged lamps in the start bay, (2.5, 5.0) and (7.5, 1.5), 4.8 m | A mill hangs caged industrial lamps from the trusses; no switch: the mains is one supply | Light the intro; die at the EMP (electric, no group) | 5.1 every light has a source; 16.8.1 |
| L3..L4 | The south aisle, (12, 2) and (17.5, 2) | Same | Same | 5.1 |
| L5 | The mill bay, (23, 2) | Same | Same | 5.1 |
| L6..L7 | The sack bay, (19, 10.5) and (24, 10.5) | Same | Same | 5.1 |
| L8 | The office, (29, 8) | Same | Same | 5.1 |
| L9 | The ladder lobby, (28.5, 14.2) | Same | Same | 5.1 |
| L10 | The machinery floor, (11, 12.5) | Same | Same | 5.1 |
| L11..L15 | The gallery, (4 / 11 / 17 / 24 / 30, 17.8) at 7.4 m | Lamps hang under the roof over the loft | Same | 5.1 |
| L16 | The hoist lamp, (0.3, 17.6) at 6.6 m | A lamp over the hoist door | Same | 5.1 |
| FL1 | Floors: boards upstairs (wood, loud); spilt grain and sacking on the path spaces below (`carpet`: the engine's quiet surface); the machinery floor the map default | A mill floor is boards and grain; sacking lies where sacks are moved | Footsteps: loud on the gallery, quiet below (G40) | 5.3 floors |
| HS1..HS6 | Hide spots for bodies: behind Sa (2.7, 0.55), behind SB2 (18.3, 3.2), the niche (19.4, 7.3), beside the desk (27.2, 10.2), behind GS2 (23.0, 17.5), behind GS1 (5.9, 17.5) | Places a body is out of a sweep's sight | A body left on the path is found by the next sweep: a spot by each kill stretch | 4.7 bodies and hide spots |
