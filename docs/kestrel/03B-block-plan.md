# Cinder Yard - campus block plan
Status: DRAFT (Part 1g-b done: adjacency must touch; Part 1g-c next)
Zones only: no rooms, doors or objects. Zones, corridors, cores and levels; room rectangles belong to P04 (Michael, 2026-10-11).

Metres, origin at the site's south-west corner, +X east, +Z north (schema 1). Rects are `[x0, z0, x1, z1]`, wall centrelines (RULES 6).

## 1. Grid and site

| Item | Rect [x0, z0, x1, z1] | Size | Source |
| --- | --- | --- | --- |
| Site | [0, 0, 108, 76] | 108 x 76 | brief 4; RULES 2 (at most 110 x 80) |
| Lane X01 | [0, 0, 108, 8]; depot facade (7.0 high) on z 0, lane fence on z 8 | 108 x 8 | brief 4 (6.0 carriageway + 2.0 footway), brief 5 X01 |
| Front yard X03 | [0, 8, 52, 30] | 52 x 22 | brief 5 X03 |
| Front yard X04 | [52, 8, 108, 30] | 56 x 22 | brief 5 X04 |
| West path X10 | [0, 30, 4, 60] | 4 x 30 | brief 5 X10 (A's west wall z 30-60) |
| Building A | [4, 30, 40, 60] | 36 x 30 (6 x 5 bays) | brief 2 (revision A 36 x 30, Michael 2026-10-11) |
| Gap X05 | [40, 30, 52, 60] | 12 x 30 (two bays) | brief 2, 4, 5 X05 |
| Building B | [52, 30, 100, 60] | 48 x 30 (8 x 5 bays) | brief 2 |
| B west strip | [52, 30, 70, 60] (two storeys) | 18 x 30 | brief 2, 12h |
| B hall block | [70, 30, 100, 60] (single storey) | 30 x 30 | brief 2, 12h |
| East drive X08 | [100, 30, 108, 76] | 8 x 46 | brief 5 X08 |
| Service passage X07 | [52, 60, 76, 62]: B north wall z 60 to wing south wall z 62 | 2.0 centreline, 1.55 clear | brief 4, 12e (F08 1.2-1.95) |
| Generator wing W | [52, 62, 76, 74] (behind B's west half) | 24 x 12 | brief 2, 4 |
| Transformer compound X09 | [76, 60, 100, 76] (behind B's east half) | 24 x 16 | brief 4, 5 X09 |
| Rear yard X06 | [0, 60, 52, 76] behind A and the gap, plus [52, 74, 76, 76] behind the wing | 52 x 16 + 24 x 2.0 | brief 5 X06 (corrected, see deviations) |
| Viaduct (north boundary) | on z 76, 9.0 to deck | - | brief 4 |
| East and west boundaries | lane fence type on x 0 and x 108 | - | brief 4 |

Self-check (node script over a 0.5 grid, this session): `items 13, area sum 8208 of 8208, cells not covered exactly once: 0`.

### Grid lines
- Bay 6.0 x 6.0, one grid for the whole campus (brief 2).
- X lines: x = 4, 10, 16, ..., 100 (every 6.0; 17 lines). A spans x 4-40, the gap x 40-52 (line x 46 runs across it), B x 52-100; strip / hall split on line x 70.
- Z lines: z = 30, 36, 42, 48, 54, 60 (6 lines). A spans z 30-60, B z 30-60.

### Deviations from the brief
- Service passage X07: 2.0 between wall centrelines, 1.55 clear, not 1.5 clear. A 1.5 clear passage needs centrelines 1.95 apart, off the 0.5 grid (RULES 6). 1.55 stays inside F08 1.2-1.95 (brief 12e).
- Rear strip behind the wing: 2.0 deep, not 2.5 (brief 5 X06), because the passage takes the extra 0.5. Passage is 48 (brief sum 36) and rear yard 880 (832 + 48; brief sum 892); the two differences cancel, so the site total stays 8208 (A 36 x 30 revision).
- Generator wing walls on z 62 and z 74 are off the structural grid (z lines 60, 66, 72). The wing stands on its own foundations behind the passage (brief 2), so it has its own grid offset 2.0 north; its x walls (52, 76) stay on campus lines (Michael, 2026-10-11).
- No other row of the proposed table changed.

## 2. Levels and footprints

| Level | Name | Floor (m) | Height (m) | Footprint | Source |
| --- | --- | --- | --- | --- | --- |
| B | Under the yard | -3.6 | 3.6 | TB01 [40, 24, 48, 30], TB03 [40, 30, 43, 47.5], TB04 [48, 27, 74, 30], shafts TB02 [48, 24, 49.5, 25.5] and BG32 [72, 30, 74, 32] (Part 1d) | brief 2, 4, 12c |
| U | Underfloor void | -1.6 | 1.6 to hall floor (1.5 clear under tiles) | [70, 36, 100, 50.5] (BU01, BU02; Part 1d) | brief 2, 12b |
| G | Ground | 0.0 | 4.2 (A, B strip); 6.6 to roof (hall block, wing) | Listed, not default: A [4, 30, 40, 60], B [52, 30, 100, 60], wing [52, 62, 76, 74]. The wing is outside `meta.buildings` footprints, so the default would miss it | brief 2; schema 2 levels[].footprint |
| F | First | 4.2 | 4.2 | A [4, 30, 40, 60], B strip [52, 30, 70, 60], link bridge [40, 40, 52, 43.5] (z0 = 40) in the gap, between AF17 and BF01 (Part 1b) | brief 2, 12h |
| H | Low roof | 6.6 | - (open roof, parapet 1.1 to 7.7) | Hall block [70, 30, 100, 60], wing [52, 62, 76, 74] | brief 2, 4 |
| L | Bridge roof | 7.8 | - (open roof) | Link bridge rect [40, 40, 52, 43.5] (z0 = 40; Michael, 2026-10-11) | brief 2 |
| R | Roof | 8.4 | - (open roof, parapet 1.1) | A [4, 30, 40, 60], B strip [52, 30, 70, 60] | brief 2 |

- H at 6.6 overlaps F's span (4.2-8.4) in height; their footprints do not overlap (schema 1).
- Bridge width 3.5 is wall-centreline; side walls exterior 0.45, so 3.05 clear (Michael, 2026-10-11).
- Bridge roof LF02 at 7.8 gets its own level L (Michael, 2026-10-11). L is a new level id; schema 1 lists B, U, G, F, H, S, R, so schema 1 needs `L` added (P03R or a schema revision).

## 3. Building A
Zones for G, F and R (Part 1b, prompts/P03B-1b-zones-r2.md). A zone holds brief rooms whose rect areas fill at most 85% of it, after its tight blocks (corridors, cores, stairs, shafts, risers, AF17, AF10); the spare space is for P04's extra corridors (Michael, 2026-10-11).

### 3.1 Plan form
- Bands south to north (wall centrelines): south row z 30-40 (10 deep), spine 40-43.5 (fixed by bridge z0 = 40), core band 43.5-50.5 (7), north corridor 50.5-54 (3.5, north wall on grid line z 54), north row 54-60 (6). 10 + 3.5 + 7 + 3.5 + 6 = 30 (brief 2, 12i).
- North row 6 deep (about 5.6 clear): normal cellular office depth, inside Michael's 5-6.5; every north-row room (5-6 on its short side) fits (brief 5).
- Main core turned (8 along x, 4 deep, lift on its east side): a core standing north-south needs an 8 band, leaving a 5 north row that loses AF08 (7 x 6). Stairs parallel to the corridor, entered off the spine at the floor landing, are normal office core practice (general knowledge). See 3.4.
- Corridor ring (brief 12i, "joined at both ends"): spine and north corridor joined by two 3.5 links through the band, west link at the west wall, east link beside the core. Patrols get a loop; every band zone has two corridor faces.
- Fire stair at the north-west corner off the north corridor's west end, exit on the west wall from the bottom landing (brief 8). The west wall at band level is the west link, so the stair cannot sit there.
- Plant gallery AF10 along the east wall (z 43.5-60), so chilled-water pipes leave A north of the bridge (X13, brief 7). Reader door off AF21's east end; AF11 in the north row against it; pipe riser AF19 on its west side.
- AG22 stays in the band at the east end, across the spine from goods (1b-G ASK-4, Michael). The south row cannot take it: G south needs 306.25 / 0.85 + 4 = 364 m2 of 360 with AG22, 340 without.

### 3.2 Fixed blocks
Same rect on every level listed.

| K-id | Levels | Rect [x0, z0, x1, z1] | Rooms by level | Size | Source |
| --- | --- | --- | --- | --- | --- |
| K-SPINE-G | G | [4, 40, 40, 43.5] | G AG10 | 36 x 3.5 | brief 5 AG10, 12i; window at both ends |
| K-SPINE-F | F | [4, 40, 36.5, 43.5] | F AF01 | 32.5 x 3.5 | brief 5 AF01; ends at AF17 |
| K-NCOR-G | G | [4, 50.5, 40, 54] | G AG26 | 36 x 3.5 | brief 5 AG26, 12i |
| K-NCOR-F | F | [4, 50.5, 36.5, 54] | F AF21 | 32.5 x 3.5 | brief 5 AF21, 12i; ends at AF10 |
| K-WLINK | G, F | [4, 43.5, 7.5, 50.5] | G -; F - | 3.5 x 7 | brief 12i (joined at both ends) |
| K-ELINK | G, F | [31, 43.5, 34.5, 50.5] | G -; F - | 3.5 x 7 | brief 12i |
| K-FS | G, F, R | [4, 54, 10.5, 57.5] | G AG21; F AF15; R AR04 | 6.5 x 3.5 | brief 8 (west end, exit on the west wall); 3.1 |
| K-RISER | G, F | [7.5, 49, 9.5, 50.5] | G AG25; F AF16 | 2 x 1.5 | brief 8 (west third, beside no stair); door off the west link |
| K-STAIR | G, F | [19.5, 43.5, 27.5, 47.5] | G AG18; F AF12 | 8 x 4 (turned) | brief 8 (north of the spine, east of centre: centre x 23.5 > 22) |
| K-LOBBY | G, F | [27.5, 43.5, 31, 46] | G AG20; F AF14 | 3.5 x 2.5 | brief 5, 8 |
| K-LIFT | G, F | [27.5, 46, 30, 48.5] | G AG19; F AF13 | 2.5 x 2.5 | brief 8 (east side, shares the core wall) |
| K-AF17 | F | [36.5, 40, 40, 43.5] | F AF17 | 3.5 x 3.5 (clear 3.2 x 3.2, brief 3.2 x 2.7) | brief 7 (in line with LF01, BF01) |
| K-BRIDGE | F, L | [40, 40, 52, 43.5] | F LF01; L LF02 | 12 x 3.5 | section 2; bridge z0 = 40 |
| K-AF10 | F | [36.5, 43.5, 40, 60] | F AF10 | 3.5 x 16.5 (brief 16; runs to the north wall) | brief 5, 7 (north-east, X13) |
| K-PIPE | F, R | [34.5, 43.5, 36.5, 45] | F AF19; R - | 2 x 1.5 | brief 8 (off AF10, hatch by the chillers) |

### 3.3 Zones
G and F tile A [4, 30, 40, 60] exactly; R lists only plant zones, the rest is open roof AR01. Fill = non-tight room rect areas / (zone area - tight blocks). Doors = metres of corridor wall the zone's corridor-door rooms need, of what it has (check script).

| Zone | Level | Rect [x0, z0, x1, z1] | Rooms | Area | Fill | Doors (need of available) | Note | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G-FRONT | G | [4, 30, 22, 40] | AG01, AG02, AG03, AG04 | 180 | 81.3% | 13 of 18 | zone 2, main door to X03; AG04 hatch to AG01 | brief 5, 7 |
| G-SOFF | G | [22, 30, 28.5, 40] | AG06 | 65 | 73.8% | 6 of 6.5 | south window (brief 5) | brief 5 |
| G-GOODS | G | [28.5, 30, 40, 40] | AG08, AG09 | 115 | 80.0% | 11 of 11.5 | zone 2, south-east, roller door | brief 5, 7 |
| G-SPINE | G | [4, 40, 40, 43.5] | AG10 | 126 | tight | - | spine | brief 5, 12i |
| G-WLINK | G | [4, 43.5, 7.5, 50.5] | - | 24.5 | tight | - | west link | brief 12i |
| G-SEC | G | [7.5, 43.5, 19.5, 50.5] | AG11, AG12, AG13, AG25 | 84 | 76.5% | 12 of 27.5 | 3+, all three on the spine, no contact with zone 2 | brief 6, 7 |
| G-CORE | G | [19.5, 43.5, 31, 50.5] | AG18, AG19, AG20, AG16, AG17 | 80.5 | 23.9% | 3.5 of 16 | main core; cleaner's store behind it off AG26 | brief 8 |
| G-ELINK | G | [31, 43.5, 34.5, 50.5] | - | 24.5 | tight | - | east link | brief 12i |
| G-EAST | G | [34.5, 43.5, 40, 50.5] | AG22, AG23 | 38.5 | 58.0% | 4 of 18 | across the spine from goods (1b-G ASK-4, Michael) | brief 7 |
| G-NCOR | G | [4, 50.5, 40, 54] | AG26 | 126 | tight | - | north corridor | brief 5, 12i |
| G-NW | G | [4, 54, 20, 60] | AG21, AG05, AG15 | 96 | 68.3% | 9 of 9.5 | fire stair; AG05 north window | brief 5, 8 |
| G-NE | G | [20, 54, 40, 60] | AG14, AG24 | 120 | 62.5% | 15 of 20 | locker room, LV switchroom | brief 5 |
| F-SW | F | [4, 30, 11, 40] | AF20 | 70 | 68.6% | 6 of 7 | office, south window | brief 5 |
| F-OPS | F | [11, 30, 40, 40] | AF02, AF03, AF05, AF06 | 290 | 54.5% | 24 of 25.5 | counter at the ops door beside tape and media | brief 7 |
| F-SPINE | F | [4, 40, 36.5, 43.5] | AF01 | 113.75 | tight | - | spine | brief 5 |
| F-VEST | F | [36.5, 40, 40, 43.5] | AF17 | 12.25 | tight | - | bridge vestibule | brief 7 |
| F-WLINK | F | [4, 43.5, 7.5, 50.5] | - | 24.5 | tight | - | west link | brief 12i |
| F-BW | F | [7.5, 43.5, 19.5, 50.5] | AF04, AF18, AF16 | 84 | 61.7% | 9 of 27.5 | records (walls to slab), staff WC | brief 5 |
| F-CORE | F | [19.5, 43.5, 31, 50.5] | AF12, AF13, AF14 | 80.5 | tight | - | main core | brief 8 |
| F-ELINK | F | [31, 43.5, 34.5, 50.5] | - | 24.5 | tight | - | east link | brief 12i |
| F-E | F | [34.5, 43.5, 36.5, 50.5] | AF19 | 14 | tight | - | pipe riser against AF10 | brief 8 |
| F-PLANT | F | [36.5, 43.5, 40, 60] | AF10 | 57.75 | tight | - | plant gallery on the east wall, X13 leaves north of the bridge | brief 7, 9 |
| F-NCOR | F | [4, 50.5, 36.5, 54] | AF21 | 113.75 | tight | - | north corridor | brief 5, 12i |
| F-NW | F | [4, 54, 21, 60] | AF15, AF07, AF09 | 102 | 75.7% | 10 of 10.5 | fire stair; offices, north windows | brief 5, 8 |
| F-NE | F | [21, 54, 36.5, 60] | AF08, AF11 | 93 | 82.8% | 14 of 15.5 | kitchen with windows; pump room against AF10 | brief 5, 7 |
| R-BULK | R | [4, 54, 10.5, 57.5] | AR04 | 22.75 | tight | - | over the fire stair | brief 8 |
| R-PLANT | R | [28, 43.5, 40, 54.5] | AR02, AR03 | 132 | 68.2% | - | chillers over AF19's hatch; AHU beside the spine; east roof edge at z 40-43.5 kept clear for the LF02 ladder | brief 9, 10 |

Check (`timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md`, this session): `zones 27, fixed 15, fails 0, info 0`.

### 3.4 Deviations
- Main core turned: stair 8 along x by 4 deep, lift on its east side, against tension d's "core 4.0 x 8.0, core and shaft 6.5 x 8.0 together" read north-south. Same core size, turned to keep the north row 6 deep (3.1).
- Corridors longer than the brief's 30: spine and north corridor 36 on G, 32.5 on F (F stops at AF17 and AF10). The two links (2 x 24.5 = 49 m2 per floor) are what brief 12i's ring needs; section 5 does not list them.
- AF17 3.5 x 3.5 (clear 3.2 x 3.2) against brief 3.2 x 2.7: it fills the spine width between the spine end and the bridge.
- AF10 16.5 long (brief 15.7 clear, rect 16): it runs to the north wall so X13 can leave anywhere on z 43.5-60.
- Door targets off the ring instead of AG10 or AF01: AG16, AG17 (AG26, behind the stair); AG21 and AF15 (north corridor west end; brief 8 says "west end of the spine"); AG25 and AF16 (west link); AF10 (AF21 east end, reader).
- No other row of the candidate changed.

### 3.5 Notes for P04, 1c and P03R
- P04: AG06 is 8 deep in a 10 deep zone; take the full depth or add a door lobby, keep the south window. AF02 takes 12 m of spine wall with AF03 beside it (nothing fits in front). AG24 and AG23 stay off the lift (brief 7). Rooms whose walls run to the slab (AG11-AG13, AG22, AG24, AF02, AF04-AF06, AF10, AF11) keep the corridor voids out (brief 7).
- 1c: bridge z0 = 40, so BF01 takes B's west wall at z 40-43.5. X13 leaves AF10's east wall north of the bridge (z 43.5-60), so BF13 sits at B's north-west.
- Level L footprint [40, 40, 52, 43.5]. The LF02 ladder lands on A's roof at the east edge, z 40-43.5.
- P03R: grid line z 42 runs down the middle of the spine and z 48 through the band, so columns stand in corridors and rooms. Recommend A's z column lines on the corridor walls: 30, 40, 43.5, 50.5, 54, 60. Brief 5 door targets and section 8's fire stair line need the ring wording (3.4).

## 4. Building B and generator wing
Zones for G, F, H and R (Part 1c, prompts/P03B-1c.md). Same 85% fill rule as section 3; hall block and wing are tiled by the brief (tight).

### 4.1 Plan form
- Strip [52, 30, 70, 60], two storeys. One north-south corridor at x 57-60.5 on both floors. West of it a 5 m band (entrance lobby, lockers, WC, riser, lift, main stair); east of it a 9.5 m band against the hall wall (goods on G, the secure route on F) (brief 5 widths; the only split whose widths close, section 2 of the prompt).
- Main stair B 4 x 8 at x 52-56, z 48.5-56.5, lift on its south side (brief 8). On F it lands on BF01's north side: the bridge lands on the west wall at z 40-43.5 (section 2) into BF01, which with its lift landing fills the west wall z 35-48.5.
- Fire stair B at the north-west corner, turned east-west, exit on the west wall off its bottom landing (brief 8). Its east end meets BG10 on G and BF05's end bay on F.
- BG10 runs along the north wall from the fire stair to the hall block, reaching X07, BG28 and BG11 (brief 5, 7).
- F: BF01 is the bridge lobby holding the stair landing, lift landing (BF04 as its bay, brief 8) and riser door; BF05 runs north to the fire stair and BF13. The secure column (mantrap, secure corridor, gallery, stair well) is the east band, entered off BF01 and BF05, so the bridge post sees the mantrap post (brief 7).
- BF13 at the strip's north-east, beside BG24's high level and the hall roof AHU (brief 9).
- Hall block [70, 30, 100, 60] in bands: carrier rooms south (z 30-36), hall (z 36-50.5), inner plant corridor and plant rooms north (z 50.5-60), cooling gallery east (x 96-100). Wing [52, 62, 76, 74] is one tight zone (brief 5 tiles both).

### 4.2 Fixed blocks
| K-id | Levels | Rect [x0, z0, x1, z1] | Rooms by level | Size | Source |
| --- | --- | --- | --- | --- | --- |
| KB-COR-G | G | [57, 30, 60.5, 56.5] | G BG05 | 3.5 x 26.5 (brief 26) | brief 5 BG05; BG04 is its bay in front of the lift (brief 8) |
| KB-COR-F | F | [57, 48.5, 60.5, 56.5] | F BF05 | 3.5 x 8 (brief 14; BF01 takes the south half) | brief 5 BF05 |
| KB-COR-F2 | F | [58.5, 56.5, 60.5, 60] | F - | 2 x 3.5 | BF05's end bay at the fire stair and BF13 |
| KB-STAIR | G, F | [52, 48.5, 57, 56.5] | G BG02; F BF02 | 5 x 8 (flights 2 x 1.85, 1.0 open well) | brief 8 (core 4.0 x 8.0); lands on BF01 (F) |
| KB-LIFT | G, F | [54.5, 46, 57, 48.5] | G BG03; F BF03 | 2.5 x 2.5 | brief 8 (south side of the core); doors east |
| KB-RISER | G, F | [55, 44.5, 57, 46] | G BG15; F BF12 | 2 x 1.5 | brief 8 (mid-strip, beside no stair) |
| KB-FS | G, F, R | [52, 56.5, 58.5, 60] | G BG12; F BF11; R BR02 | 6.5 x 3.5 (turned) | brief 8 (north-west corner, west wall exit) |
| KB-BG10 | G | [58.5, 56.5, 70, 60] | G BG10 | 11.5 x 3.5 (brief 14.5) | brief 5, 7 (X07, BG11, BG12, BG28) |
| KB-WELL | G, F | [67, 43, 70, 52] | G BG13; F BF10 | 3 x 9 | brief 5, 8, 12a (hall wall z 43-50.5) |
| KB-GALLERY | F | [67, 37.5, 70, 43] | F BF09 | 3 x 5.5 | brief 5, 12a (looks over the hall z 37.5-43) |

### 4.3 Zones
| Zone | Level | Rect [x0, z0, x1, z1] | Rooms | Area | Fill | Doors (need of available) | Note | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B-GW | G | [52, 30, 57, 56.5] | BG01, BG06, BG02, BG03, BG15 | 132.5 | 84.1% | 14 of 14.5 | entrance lobby on the south wall (X04 door), lockers, riser, lift, stair | brief 5, 8 |
| B-GCOR | G | [57, 30, 60.5, 56.5] | BG05, BG04 | 92.75 | tight | - | corridor, lift bay | brief 5, 8 |
| B-GGOODS | G | [60.5, 30, 70, 43] | BG07, BG08, BG09 | 123.5 | 79.4% | 12 of 13 | staging on the yard (X12), cage off it, build room on the hall wall | brief 5, 7 |
| B-GE | G | [60.5, 43, 70, 56.5] | BG13, BG11, BG14, BG16 | 128.25 | 70.4% | 7.5 of 13.5 | stair foot on the hall wall, switchroom off BG10, facilities office, WC | brief 5, 7 |
| B-GN | G | [52, 56.5, 70, 60] | BG12, BG10 | 63 | tight | - | fire stair, plant corridor on the north wall | brief 5, 8 |
| B-GHCAR | G | [70, 30, 96, 36] | BG29, BG30, BG31, BG33 | 156 | tight | - | carrier band; BG31 order sets TB04 (1d) | brief 5, 7 |
| B-GHALL | G | [70, 36, 96, 50.5] | BG20, BG21, BG22 | 377 | tight | - | hall, cages inside | brief 5 |
| B-GHPLANT | G | [70, 50.5, 96, 60] | BG24, BG25, BG26, BG27, BG28 | 247 | tight | - | BG24 on the hall's north side, rooms north of it, BG28 at the west end | brief 5, 7, 9 |
| B-GHCOOL | G | [96, 30, 100, 60] | BG23 | 120 | tight | - | cooling gallery, X08 fire exit | brief 5, 7 |
| W-GEN | G | [52, 62, 76, 74] | BG40, BG41, BG42, BG43 | 288 | tight | - | wing; catwalks inside BG40 | brief 2, 5 |
| B-FS | F | [52, 30, 60.5, 35] | BF15 | 42.5 | 70.6% | 6 of 8.5 | tenant work room off BF01 | brief 5 |
| B-FLOBBY | F | [52, 35, 60.5, 48.5] | BF01, BF04, BF03, BF12 | 114.75 | 65.1% | - | bridge lobby, post desk, lift landing, riser door | brief 5, 7, 8 |
| B-FBW | F | [52, 48.5, 57, 56.5] | BF02 | 40 | tight | - | main stair | brief 8 |
| B-FCOR | F | [57, 48.5, 60.5, 56.5] | BF05 | 28 | tight | - | staff corridor | brief 5 |
| B-FNW | F | [52, 56.5, 60.5, 60] | BF11 | 29.75 | tight | - | fire stair and BF05's end bay | brief 8 |
| B-FNE | F | [60.5, 53, 70, 60] | BF13 | 66.5 | 63.2% | 6 of 7 | valve room by BG24 and the hall roof (4.1) | brief 7, 9 |
| B-FSEC | F | [60.5, 30, 70, 53] | BF06, BF07, BF08, BF09, BF10, BF14 | 218.5 | 29.6% | 7.5 of 18 | mantrap off BF01 and BF05, secure corridor, gallery, stair well; staff WC | brief 5, 7 |
| B-HSUPPLY | H | [70, 44.5, 82, 54] | BR04, BR05 | 114 | 24.6% | - | AHU and shaft over the hall's north edge, near BF13 | brief 9 |
| B-RBULK | R | [52, 56.5, 58.5, 60] | BR02 | 22.75 | tight | - | fire stair bulkhead | brief 8 |

Check (`node scripts/kestrel/p03b-zones-check-b.mjs`, this session): `zones 19, fixed 10, fails 0`. A's check still `zones 27, fixed 15, fails 0, info 0`. G tiles B plus the wing (1728); F tiles the strip (540); H and R list plant and bulkheads only, the rest is open roof BR01, BR03, BR06.

### 4.4 Deviations
- Main stair B at x 52-56, z 48.5-56.5, not south-west behind BG01 (brief 8): on F the bridge and BF01 with its lift landing fill the west wall z 35-48.5, so the stair lands on BF01's north side.
- Fire stair B turned east-west (6.5 along the north wall), so its east end meets BG10 on G and BF05's end bay on F. Exit stays on the west wall off the bottom landing (brief 8).
- BG10 11.5 long (rect) against the brief's 14.5: the fire stair takes the north wall's west end. It still reaches X07, BG11, BG12 and BG28 (brief 7).
- BF05 8 long plus a 2 x 3.5 end bay (KB-COR-F2) against the brief's 14: BF01 takes the corridor's south half as the bridge lobby.
- BG04 and BF04 are bays of BG05 and BF01, not rooms (brief 8: "its lobby is a corridor bay").
- BF13 at the strip's north-east [60.5, 53, 70, 60], not north-west (brief 7): the west wall north of the bridge holds the stairs. X13 lands on the west wall at 5.0-6.5 and crosses in the 0.9 service void over the corridor (brief 9). From the north-east BF13 sits beside BG24's high level and the hall roof AHU, where its two branches go (brief 9), and above BG10 and BG11 as brief 7 asks.
- BF12 (riser) and BF15 (tenant work room) open off BF01, not BF05 (brief 5): both sit south of BF05 in the lobby zone.
- No other row of the candidate changed.
- Main stair B 5 wide (1.0 open well) so its east wall is BG05's wall; BG16 moved to B-GE (Part 1e, 6.3).

### 4.5 Notes for P04, 1d and P03R
- P04: B-GGOODS packs BG08 [60.5-64] beside BG07 [64-70] on the yard wall and BG09 6 x 7 on the hall wall north of BG07 (z 36-43 or 37-43). B-GE packs BG14 (5 x 6) then BG11 (5 x 7) along the corridor, BG11 touching BG10.
- P04: the wing puts BG42 and BG43 in one 6 x 12 column, so BG40's double doors to X09 and BG42's east-wall fill point (brief 9) cannot both be on outside walls. P04 chooses and records it.
- P04: the hall's rack rows keep aisles of at least 1.8 (RULES 6).
- 1d: BG31's place in B-GHCAR sets TB04's length (brief 30). BU01 and BU02 lie under B-GHALL and the cooling gallery band. The LF02 ladder lands on BR01 at the west edge, z 40-43.5.
- P03R: B's z column lines (36, 42, 48, 54) cross the hall and corridor bands. Brief 7 and 8 wording needs the deviations in 4.4.

## 5. Site, bridge roof, under the yard and level U

### 5.1 Plan
- Vault TB01 under the yard in front of the gap, north wall on A's front line (z 30); manhole TB02 is its own shaft on the vault's east wall, lid in the yard aisle where no bay is marked (brief 4).
- Tunnel A TB03 runs north from the vault under the gap along A's east wall line to AG23 on G-EAST's east wall (z 43.5-47.5). Tunnel B TB04 runs east under the yard along B's south wall to the carrier riser BG32 under BG31.
- Carrier band (1c 4.5) west to east: BG31, BG30, BG29, BG33 (4 + 9 + 4 + 9 = 26). BG31 at the west end gives the shortest tunnel.
- Level U is the hall zone BU01 plus the cooling gallery's hall band BU02; the carrier band, plant band and BG32 keep normal slabs (brief 12b).
- Gatehouse X02 at the lane fence's west end inside X03. Bin store X11 on the old generator plinth behind A, keeping the 3.5 path along the viaduct (z 72.5-76) and the way to the X07 gate clear.
- Apron X12 in front of BG07's roller door. Pipe rack X13 crosses the gap 1.0 north of the bridge, from AF10 to B's west wall in the BF01 zone, clear of both B stairs (main z 48.5-56.5, fire z 56.5-60).
- Bridge roof LF02 = the K-BRIDGE rect on level L. Open roofs are whole-roof zones; their plant and bulkheads are in 3.3 and 4.3.

### 5.2 Zones
| Zone | Level | Rect [x0, z0, x1, z1] | Rooms | Area | Note | Source |
| --- | --- | --- | --- | --- | --- | --- |
| S-LANE | G | [0, 0, 108, 8] | X01 | 864 | lane and footway, depot facade on z 0 | section 1; brief 4 |
| S-YARDA | G | [0, 8, 52, 30] | X03 | 1144 | yard and bays in front of A, goods-in apron | section 1; brief 5 X03 |
| S-YARDB | G | [52, 8, 108, 30] | X04 | 1232 | yard and bays in front of B | section 1; brief 5 X04 |
| S-GAP | G | [40, 30, 52, 60] | X05 | 360 | service way under the bridge and rack | section 1; brief 5 X05 |
| S-REAR | G | [0, 60, 52, 76] | X06 | 832 | rear yard behind A and the gap | section 1; brief 5 X06 |
| S-REAR2 | G | [52, 74, 76, 76] | X06 | 48 | strip behind the wing | section 1 deviation |
| S-PASS | G | [52, 60, 76, 62] | X07 | 48 | service passage, 1.55 clear | section 1; brief 4, 12e |
| S-DRIVE | G | [100, 30, 108, 76] | X08 | 368 | east service drive | section 1; brief 5 X08 |
| S-COMP | G | [76, 60, 100, 76] | X09 | 384 | transformer compound | section 1; brief 5 X09 |
| S-WPATH | G | [0, 30, 4, 60] | X10 | 120 | west path, fire stair A exit | section 1; brief 5 X10 |
| SI-GATE | G | [1, 8, 5, 11] | X02 | 12 | gatehouse at the lane fence west end, gates east of it | brief 4, 5 X02 (3.7 x 2.7) |
| SI-BIN | G | [8, 63, 12, 66] | X11 | 12 | bin store on the old generator plinth behind A | brief 3, 5 X11 (3.7 x 2.7) |
| SI-APRON | G | [60, 22, 70, 30] | X12 | 80 | loading apron in front of BG07 (x 64-70, 1c 4.5) | brief 5 X12 (10 x 8) |
| SI-RACK | G (5.0-6.5) | [40, 44.5, 52, 46.5] | X13 | 24 | pipe rack, AF10 to B west wall into the BF01 zone, 1.0 north of the bridge | brief 4, 5 X13, 9 |
| L-ROOF | L | [40, 40, 52, 43.5] | LF02 | 42 | bridge roof | section 2; brief 5 LF02 |
| T-VAULT | B | [40, 24, 48, 30] | TB01 | 48 | carrier vault under the yard in front of the gap | brief 4, 5 TB01 (7.7 x 5.7) |
| T-MH | B to G | [48, 24, 49.5, 25.5] | TB02 | 2.25 | manhole shaft on the vault's east wall, lid in the X03 aisle (see 5.3) | brief 4, 5 TB02 (1.2 x 1.2) |
| T-TUNA | B | [40, 30, 43, 47.5] | TB03 | 52.5 | A branch north under the gap to AG23 on G-EAST's east wall | brief 5 TB03 (2.6 wide) |
| T-TUNB | B | [48, 27, 74, 30] | TB04 | 78 | B branch east under the yard along B's south wall to BG32 | brief 5 TB04 (2.6 wide) |
| T-RISER | B to G | [72, 30, 74, 32] | BG32 | 4 | carrier riser under BG31 at the carrier band's west end | brief 5 BG32 (1.7 x 1.7) |
| U-HALL | U | [70, 36, 96, 50.5] | BU01 | 377 | hall underfloor void | brief 5 BU01 (25.7 x 14.2), 12b |
| U-COOL | U | [96, 36, 100, 50.5] | BU02 | 58 | cooling gallery plenum | brief 5 BU02 (3.7 x 14.2) |
| RF-A | R | [4, 30, 40, 60] | AR01 | 1080 | A roof, open; plant and bulkheads in 3.3 | section 2; brief 5 AR01 |
| RF-BS | R | [52, 30, 70, 60] | BR01 | 540 | B strip roof, open; bulkhead in 4.3 | section 2; brief 5 BR01 |
| RF-BH | H | [70, 30, 100, 60] | BR03 | 900 | hall roof, open; AHU and shaft in 4.3 | section 2; brief 5 BR03 |
| RF-W | H | [52, 62, 76, 74] | BR06 | 288 | wing roof, open | section 2; brief 5 BR06 |

Self-check (this session): D `zones 26, rows 126 of 126, fails 0`; A `zones 27, fixed 15, fails 0, info 0`; B `zones 19, fixed 10, fails 0`.

### 5.3 Deviations
- TB03 is 17.5 long (brief 10): A grew to 30 deep and AG22 / AG23 stay in G-EAST (1b, Michael's ASK-4).
- TB04 is 26 long (brief 30): BG31 at the carrier band's west end.
- Manhole TB02 beside the vault, not over it: a shaft is its own rect (Appendix A rule, as AG23 beside AG22). Its lid at x 48-49.5 lies in X03 (x 0-52), not X04 as brief 5 lists; it is still the aisle in front of the gap (brief 4).
- Level B sum 184.75 (brief 170): the tunnel lengths above.

### 5.4 Notes for P04, 1e and P03R
- P04: carrier band west to east BG31, BG30, BG29, BG33 (x 70-74, 74-83, 83-87, 87-96). AG23 on G-EAST's east wall within z 43.5-47.5.
- P04: BG13 (gallery stair foot, in B-GE) opens only into the hall, never into the strip (brief 2: the hall is entered only from the first floor).
- P04: BG05 on B's ground floor is one straight 26.5 corridor; give it hides for stealth flow (lift bay BG04, door recesses, the BG10 corner).
- P04 or P03R: brief 4 puts the east service gate beside the apron X12, but X12 is at x 60-70 and the drive X08 at x 100-108. Recommend the service gate on the lane fence opposite X08 (x 100-108), the apron reached across the yard aisle, and the brief wording changed.
- P03R: X13 at 5.0-6.5 (brief 5, 9) is 0.8-2.3 above B's first floor (4.2), while 1c 4.1 says it crosses in the 0.9 service void (7.2-8.1). Recommend the pipes rise inside B's west wall to the void, or the rack runs at 7.2-8.1 outside; the brief needs one line.
- P03R: brief 5 TB02 "Doors to" should read X03 (lid), not X04.
- 1e: TB02, AG23 and BG32 are shafts with fixed ladders between level B and G; the tunnel doors are 1e's ring entries.

## 6. Vertical circulation
Rise per storey 4.2 / 26 = 0.1615 (brief 8). Clear = rect - 0.3 each way (brief 5 convention).

### 6.1 Stairs, lifts, risers, shafts and roof ladders
| Id | Levels | Rect [x0, z0, x1, z1] | Kind | Rooms | Opens to | Fit | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-ASTAIR | G, F | [19.5, 43.5, 27.5, 47.5] | dogleg | AG18, AF12 | AG10, AF01 (south side, open) | clear 7.7 x 3.7; going 0.285: 12 x 0.285 + 2 x 2.0 = 7.42 of 7.7; flights 2 x 1.85 = 3.7 of 3.7 | brief 8; 3.2 K-STAIR |
| V-ALIFT | G, F | [27.5, 46, 30, 48.5] | lift | AG19, AF13 | AG20, AF14 (K-LOBBY, south side) | clear 2.2 x 2.2; pit 1.1; head 3.9 (to 8.1, under the 8.4 roof) | brief 8; 3.2 K-LIFT |
| V-AFS | G, F, R | [4, 54, 10.5, 57.5] | fire | AG21, AF15, AR04 | AG26, AF21 (south side, fire door); X10 (west wall exit); AR01 (roof door) | clear 6.2 x 3.2; flights 1.45 wide; going 0.285: landings (6.2 - 3.42) / 2 = 1.39 | brief 8; 3.2 K-FS |
| V-ARISER | G, F | [7.5, 49, 9.5, 50.5] | riser | AG25, AF16 | west link (locked door); north corridor voids (side doors) | clear 1.7 x 1.2 | brief 8; 3.2 K-RISER, 3.4 |
| V-APIPE | F, R | [34.5, 43.5, 36.5, 45] | riser | AF19 | AF10 (locked door); AR01 roof hatch in R-PLANT | clear 1.7 x 1.2 | brief 8; 3.2 K-PIPE |
| V-BSTAIR | G, F | [52, 48.5, 57, 56.5] | dogleg | BG02, BF02 | BG05 (G, east side); BF01 (F, south side) and BF05 (F, east side) | clear 4.7 x 7.7; going 0.285: 7.42 of 7.7; flights 2 x 1.85 + 1.0 open well = 4.7 | brief 8; 4.2 KB-STAIR (widened, 6.3) |
| V-BLIFT | G, F | [54.5, 46, 57, 48.5] | lift | BG03, BF03 | BG04 (BG05 bay, G), BF04 (BF01 bay, F); east side | clear 2.2 x 2.2; pit 1.1; head 3.9 | brief 8; 4.2 KB-LIFT |
| V-BFS | G, F, R | [52, 56.5, 58.5, 60] | fire | BG12, BF11, BR02 | BG10 (G, east side, fire door); BF05 end bay (F, east side); X05 (west wall exit); BR01 (roof door) | clear 6.2 x 3.2; going 0.285: landings 1.39 | brief 8; 4.2 KB-FS |
| V-BRISER | G, F | [55, 44.5, 57, 46] | riser | BG15, BF12 | BG05 (G, locked door); BF01 (F, 4.4) | clear 1.7 x 1.2 | brief 8; 4.2 KB-RISER |
| V-GAL | G, F | [67, 43, 70, 52] | straight | BG13, BF10 | BF09 (F, south end); BG20 (G, hall side, open) | clear 2.7 x 8.7; going 0.26, landing 2.4: 24 x 0.26 + 2.4 = 8.64 of 8.7; stair 2.4 of 2.7 | brief 8, 12a; 4.2 KB-WELL |
| V-AG23 | B to G | [38, 45, 40, 47] | shaft | AG23 | TB03 (door in its west wall on x 40); AG22 floor hatch (P04's AG22 covers it) | clear 1.7 x 1.7; 3.6 deep | brief 5 AG23, 8; 5.4 |
| V-BG32 | B to G | [72, 30, 74, 32] | shaft | BG32 | TB04 (riser door, north wall); BG31 floor hatch | clear 1.7 x 1.7; 3.6 | brief 5 BG32, 8; 5.2 T-RISER |
| V-TB02 | B to G | [48, 24, 49.5, 25.5] | manhole | TB02 | TB01 (east wall); X03 lid | clear 1.2 x 1.2; 3.6 | brief 5 TB02, 8; 5.2 T-MH |
| V-BR05 | H to G | [80, 48, 82, 50] | shaft | BR05 | BR03 grille (in B-HSUPPLY); BG20 diffuser panel, 6.0 drop | clear 1.7 x 1.7 | brief 5 BR05, 9; 4.3 B-HSUPPLY |
| V-LAD1 | R to L | [39.5, 41, 40, 42.5] | ladder | - | AR01 east edge, 0.6 down over the parapet to LF02 | hooped, step-over | brief 8, 10; 3.5 |
| V-LAD2 | R to L | [52, 41, 52.5, 42.5] | ladder | - | BR01 west edge, 0.6 down over the parapet to LF02 | hooped, step-over | brief 8, 10; 4.5 |
| V-LAD3 | R to H | [69.5, 57, 70, 58.5] | ladder | - | BR01 east edge, 1.8 down to BR03, clear of the AHU zone (z 44.5-54) | hooped, step-over | brief 8, 10 |

Self-check (this session, on this file):
- E `node scripts/kestrel/p03b-vert-check-e.mjs`: `vert 17, fails 0, info 2` (fire stair landings A and B, 6.3).
- A: `zones 27, fixed 15, fails 0, info 0`.
- B (BG02 / BF02 at 40): `zones 19, fixed 10, fails 0`.
- D: `zones 26, rows 126 of 126, fails 0`.

### 6.2 Fire stair per building
| Building | Escape stair or exits | Levels served | Ground exit | Upper door | Own footprint | Source |
| --- | --- | --- | --- | --- | --- | --- |
| A | V-AFS (AG21, AF15, AR04) | G, F, R | X10 on A's west wall | AG26 / AF21 (north corridor), AR01 roof door | yes | brief 8; 3.2 K-FS |
| B strip | V-BFS (BG12, BF11, BR02) | G, F, R | X05 on B's west wall | BG10 (G), BF05 end bay (F), BR01 roof door | yes | brief 8; 4.2 KB-FS |
| Wing | own exits, single storey | G | X07 / X09 doors | - | yes | brief 6 X07 / X09 row |
| Hall block | BG23 fire exit and BG20 equipment door, single storey | G | X08 (BG23), BG20 door | - | yes | brief 6, 7 |
| Bridge | each end leads to that building's fire stair | F | via A or B | AF17 / BF01 to AF21 / BF05 | no (link) | brief 7, 8; 3.2, 4.2 |

Main stairs are not escape stairs (brief 8, kept by Michael 2026-10-11), so each building's upper floor has one escape stair. Rough worst walks to it are about 52 m in A (F-OPS south-east corner) and about 31 m in B (BF15), against the usual 18 m single-direction limit for offices (general knowledge). Michael accepted this as game licence.

### 6.3 Deviations
- Main stair B 5 wide [52, 48.5, 57, 56.5] (brief 4.0): the extra 1.0 is the open well between the 1.85 flights, so the core's east wall is BG05's wall and BG02 opens onto BG05 (brief 5). Old 4 wide left a 0.7 clear strip.
- BG16 moved from B-GW to B-GE (B-GW 84.1%, B-GE 70.4%, script B); its old corner behind the lift had no corridor face.
- Fire stair landings 1.39 against 1.45 flight width (check E INFO, both A and B): Michael's rule "flights keep their length, flights fill the width" at going 0.285 in a 6.2 x 3.2 clear core.
- Gallery stair going 0.26 and landing 2.4 (brief 0.285, 2.0): 24 x 0.285 + 2.0 = 8.84 does not fit 8.7 clear, and a 2.0 landing is shorter than the 2.4 width. 2R + G = 0.583 (0.55-0.70, general knowledge).
- AG23 shaft rect [38, 45, 40, 47] beside TB03, top under AG22's floor (brief 5 hatch), as TB02 beside the vault (5.3).
- No other row of the candidate changed.

### 6.4 Notes for P04, 1f and P03R
- P04: AG22 covers AG23 [38, 45, 40, 47]; BG31 covers BG32's hatch; an aisle runs under BR05 [80, 48, 82, 50]; BG02's door is on its east wall onto BG05.
- P03R: brief 8 needs lines for the gallery stair going and landing and the 5 wide B core; fire stair landings: recommend going 0.27 (landings 1.48), game-invisible.
- 1f: ring doors on stairs and risers come from 6.1's "Opens to" column.

## 7. Ring entries
Where each control in brief 6 crosses between zones. Segment = the shared zone face P04 puts the door on; "plan" = a hatch or lid inside the zone. Rings from brief 6 (3+ written 3.5).

### 7.1 Site, Building A, bridge and under the yard
| Id | Level | From (ring) | To (ring) | Control | Between | Segment | Exempt | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RA01 | G | X01 (0) | X03 (1) | Main sliding gate and pedestrian gate, pedestrian reader; gatehouse officer releases | S-LANE / S-YARDA | z 8, x 5-16 | no | brief 6; 5.2 SI-GATE (gates east of the gatehouse) |
| RA02 | G | X01 (0) | X04 (1) | East service gate, chain and padlock | S-LANE / S-YARDB | z 8, x 100-108 | no | brief 6; 5.4 (opposite X08) |
| RA03 | G | X03 (1) | AG01 (2) | Main door, locked out of hours, intercom | S-YARDA / G-FRONT | z 30, x 4-22 | no | brief 6, 5 AG01 |
| RA04 | G | X03 (1) | AG08 (2) | Roller door by key switch inside; wicket door reader | S-YARDA / G-GOODS | z 30, x 28.5-40 | no | brief 6, 5 AG08 |
| RA05 | G | AG01 (2) | AG10 (3) | Reader, A card | G-FRONT / G-SPINE | z 40, x 4-22 | no | brief 6, 5 AG01 |
| RA06 | G | AG09 (2) | AG10 (3) | Reader, A card | G-GOODS / G-SPINE | z 40, x 28.5-40 | no | brief 6, 5 AG09 |
| RA07 | G | AG10 (3) | AG11, AG12, AG13 (3.5) | Reader, master card tier; key safe PIN inside AG13 | G-SPINE / G-SEC | z 43.5, x 7.5-19.5 | no | brief 6; 3.3 G-SEC |
| RA08 | F | AF01 (3) | AF03, AF05, AF06 (3) | Reader, master card tier (AF02 through AF03) | F-SPINE / F-OPS | z 40, x 11-36.5 | no | brief 6; 3.3 F-OPS |
| RA09 | F | AF01 (3) | AF04 (3) | Reader, master card tier | F-SPINE / F-BW | z 43.5, x 7.5-19.5 | no | brief 6; 3.3 F-BW |
| RA10 | F | AF21 (3) | AF10 (3) | Reader, master card tier | F-NCOR / F-PLANT | x 36.5, z 50.5-54 | no | brief 6; 3.4 (AF21 east end) |
| RA11 | F | AF17 (3) | LF01 (3) | Reader, A card | F-VEST / K-BRIDGE | x 40, z 40-43.5 | no | brief 6, 5 AF17 |
| RA12 | F | LF01 (3) | BF01 (3) | Reader, B-tier card or escort PIN; bridge post | K-BRIDGE / B-FLOBBY | x 52, z 40-43.5 | no | brief 6, 5 LF01 |
| RA13 | G | AG21 (3) | X10 (1) | Fire exit, exit only, no outside hardware, alarmed | V-AFS / S-WPATH | x 4, z 54-57.5 | yes (exit) | brief 6; 6.2 |
| RA14 | R | AR04 (3) | AR01 (3) | Roof door, key outside, thumb-turn inside (AF15 below) | R-BULK / RF-A | x 10.5, z 54-57.5 | no | brief 6; 3.3 R-BULK |
| RA15 | G | X03 (1) | TB02 (4) | Heavy lid, carriers' and Ostler's lifting keys | S-YARDA / V-TB02 | plan | yes (ASK-2) | brief 6; 5.3, 6.1 |
| RA16 | G | AG22 (3) | AG23 (4) | Locked floor hatch, key | G-EAST / V-AG23 | plan | no | brief 6; 6.1 |
| RA17 | B | TB04 (4) | BG32 (5) | Riser door at the tunnel end, reader B-tier or PIN | T-TUNB / T-RISER | z 30, x 72-74 | no | brief 6; 6.1 V-BG32 |

Self-check (this session):
- F `node scripts/kestrel/p03b-ring-check-f.mjs`: `ring 17 (RA 17, RB 0), rects 114, fails 0, info 1` (RA14: bulkhead inside the roof zone, expected).
- E: `vert 17, fails 0, info 2`; A: `zones 27, fixed 15, fails 0, info 0`; B: `zones 19, fixed 10, fails 0`; D: `zones 26, rows 126 of 126, fails 0`.

Deviations:
- RA02: east service gate on the lane fence opposite X08 (x 100-108), not beside X12 (brief 4); X12 is at x 60-70 and tankers use the drive (5.4).
- RA10: AF10's door is off AF21's east end, not AF01 (3.4).
- RA15: lid in X03, not X04 (brief 6; 5.3). RA14: from the bulkhead AR04 over AF15 (brief 6 names AF15).
- No other row of the candidate changed.

Notes for P04, 1f-b and P03R:
- P04: each door goes on its segment; RA01's gates sit east of the gatehouse so the officer sees both; RA07's three security doors share z 43.5 with no zone 2 contact (3.3 G-SEC).
- P03R: brief 4 east service gate wording (opposite X08).
- 1f-b: RA12's B reader is the bridge post's door; B's rows start at RB01.

### 7.2 Building B, hall, wing and compound
| Id | Level | From (ring) | To (ring) | Control | Between | Segment | Exempt | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB01 | G | X04 (1) | BG01 (2) | Staff door reader, B or contractor card | S-YARDB / B-GW | z 30, x 52-57 | no | brief 6, 5 BG01 |
| RB02 | G | X12 (1) | BG07 (2) | Roller door, key switch inside, locked at night | SI-APRON / B-GGOODS | z 30, x 64-70 | no | brief 6; 4.5 (BG07 x 64-70) |
| RB03 | G | BG01 (2) | BG05 (3) | Reader, B or contractor card | B-GW / B-GCOR | x 57, z 30-36 | no | brief 6, 5 BG01 |
| RB04 | G | BG07 (2) | BG05 (3) | Reader, B or contractor card | B-GGOODS / B-GCOR | x 60.5, z 30-43 | no | brief 6, 5 BG07 |
| RB05 | G | BG05 (3) | BG10 (3) | Reader, B-tier or contractor card (the door the technician wedges) | B-GCOR / KB-BG10 | z 56.5, x 58.5-60.5 | no | brief 6; 4.2 KB-BG10 |
| RB06 | G | BG10 (3) | BG28 (3) | Key | KB-BG10 / B-GHPLANT | x 70, z 56.5-60 | no | brief 6; 4.3 B-GHPLANT |
| RB07 | G | BG10 (3) | X07 (1) | Passage door, exit only, key cylinder outside | KB-BG10 / S-PASS | z 60, x 58.5-70 | yes (exit) | brief 6, 5 BG10 |
| RB08 | G | X07 (1) | BG40 (3) | Wing personnel door, key; push-bar exit | S-PASS / W-GEN | z 62, x 52-76 | yes (key) | brief 6, 5 BG40 |
| RB09 | G | X09 (3) | BG40 (3) | Double doors, key; push-bar exit | S-COMP / W-GEN | x 76, z 62-74 | no | brief 6, 5 BG40; 4.5 |
| RB10 | G | X08 (1) | X09 (3) | Compound gate, padlock | S-DRIVE / S-COMP | x 100, z 60-76 | yes (key) | brief 6, 5 X09 |
| RB11 | G | X07 (1) | X09 (3) | Compound gate from the passage, padlock | S-PASS / S-COMP | x 76, z 60-62 | yes (key) | brief 6, 5 X07, X09 |
| RB12 | G | BG20 (4) | BG24 (4) | Reader, B-tier; free exit | B-GHALL / B-GHPLANT | z 50.5, x 70-96 | no | brief 6, 5 BG24 |
| RB13 | G | BG20 (4) | BG09 (3) | Equipment door: no outside handle or reader, exit device inside, forced and held alarms to AG11 | B-GHALL / B-GGOODS | x 70, z 36-43 | yes (exit) | brief 6, 5 BG09 |
| RB14 | G | BG23 (4) | X08 (1) | Fire exit, exit only, no outside hardware, alarmed | B-GHCOOL / S-DRIVE | x 100, z 30-60 | yes (exit) | brief 6, 5 BG23 |
| RB15 | G | BG12 (3) | X05 (1) | Fire exit, exit only, no outside hardware, alarmed | KB-FS / S-GAP | x 52, z 56.5-60 | yes (exit) | brief 6; 6.1 V-BFS |
| RB16 | H | BR03 (3) | BR05 (4) | Bolted grille, alarm contact; key switch box beside it; roof key in AG13 | RF-BH / V-BR05 | plan | no | brief 6; 6.1 V-BR05 |
| RB17 | R | BR02 (3) | BR01 (3) | Roof door, key outside, thumb-turn inside (BF11 below) | B-RBULK / RF-BS | x 58.5, z 56.5-60 | no | brief 6; 4.3 B-RBULK |
| RB18 | G | BG20 (4) | BU01 (4) | Floor hatches, unlocked, hinged | B-GHALL / U-HALL | plan | no | brief 6; 5.2 U-HALL |

Inside zones (no face; P04 places): BG07 to BG09 reader (B-GGOODS); mantrap BF06 to BF07 outer, BF07 to BF08 inner, BF08 to BF09 sealed door (B-FSEC); BG29 to BG30 / BG33 and BG30 to BG31 readers (B-GHCAR); cages BG21, BG22 (B-GHALL); lift B (G landing on x 57, z 46-48.5 from the BG04 bay; F inside B-FLOBBY; locked off at night).

Self-check (this session):
- F `node scripts/kestrel/p03b-ring-check-f.mjs`: `ring 35 (RA 17, RB 18), rects 114, fails 0, info 2` (RA14, RB17: bulkheads inside the roof zones, expected).
- E: `vert 17, fails 0, info 2`; A: `zones 27, fixed 15, fails 0, info 0`; B: `zones 19, fixed 10, fails 0`; D: `zones 26, rows 126 of 126, fails 0`.

Deviations: none.

Notes for P04, 1g and P03R:
- P04: BG07's door to BG05 goes north of BG08 (or B-GGOODS is reordered), recorded; BF06 opens off BF05 (brief 5) on B-FSEC's west face at x 60.5, z 48.5-53, where the bridge post in BF01 can see it; BG13 opens only into the hall, on x 70, z 43-50.5; RB09's double doors and BG42's fill point share W-GEN's east wall (4.5).
- P04: brief 5 doors with no brief 6 control, same ring: BF05 to BF13 reader, BG05 to BG15 and BF01 to BF12 locked riser doors, X06 to X07 chain-link gate on x 52, z 60-62.
- 1g: RB16 is the rappel route R04 (routes.md); RB13 is the hall's only way out to the strip on G, alarmed.

## 8. Critical path
Solo ghost line, roof-shaft entry, carrier exit (mission brief 4.1). Waypoints are zone points, not doors; P04's path is longer. Vertical: stair floor 9.0, ladders their height, rappel 6.0 (6.1).

### 8.1 Legs
| Leg | Objective | Waypoints | Vertical | Length | Source |
| --- | --- | --- | --- | --- | --- |
| P01 | 1 | S-LANE 84,4 > S-YARDB 84,10 | 0 (lane fence) | 6.0 | MB 4 obj 1, 4.1; brief 4 (gatehouse west); 7.1 RA02 (exit 20 m east) |
| P02 | TA1 | S-YARDB 84,10 > S-YARDB 70,20 > S-YARDA 40,28 > S-YARDA 25,29.5 > G-SOFF 25,31 | 0 (window) | 64.83 | MB 4.1 TA1; brief 5 AG06 |
| P03 | TA1 | G-SOFF 25,31 > G-SPINE 25,41.75 > G-SPINE 5.75,41.75 > G-WLINK 5.75,47 > G-NCOR 5.75,52.25 > G-NCOR 15,52.25 > G-NW 15,56 | 0 | 53.5 | MB 4 TA1; brief 5 AG05; 3.3 |
| P04 | TA2 | G-NW 15,56 > G-NCOR 15,52.25 > G-NCOR 5.75,52.25 > G-SPINE 5.75,41.75 > G-SPINE 13.5,41.75 > G-SEC 13.5,45 | 0 | 34.5 | MB 4 TA2; brief 5 AG12 |
| P05 | TA3 | G-SEC 13.5,45 > G-SPINE 13.5,41.75 > G-SPINE 23.5,41.75 > F-SPINE 23.5,41.75 > F-SPINE 13.5,41.75 > F-BW 13.5,45 | 9.0 (V-ASTAIR G to F) | 35.5 | MB 4 TA3; brief 5 AF04; 6.1 |
| P06 | TA4 | F-BW 13.5,45 > F-SPINE 13.5,41.75 > F-SPINE 23.5,41.75 > G-SPINE 23.5,41.75 > G-SPINE 13.5,41.75 > G-SEC 13.5,45 | 9.0 (V-ASTAIR F to G) | 35.5 | MB 4 TA4; brief 5 AG13 |
| P07 | TB1 | G-SEC 13.5,45 > G-SPINE 13.5,41.75 > G-SPINE 5.75,41.75 > G-NCOR 5.75,52.25 > V-AFS 7.25,55.75 > RF-A 10.5,55.75 > RF-A 27,42 > RF-A 39.5,41.75 | 18.0 (V-AFS G to R) | 80.54 | MB 4.1 TB1; 6.1 V-AFS, V-LAD1; 3.3 R-PLANT |
| P08 | TB1, TB4 | RF-A 39.5,41.75 > L-ROOF 40,41.75 > L-ROOF 52,41.75 > RF-BS 52.5,41.75 > RF-BS 69.75,57.75 > RF-BH 70.5,57.75 > V-BR05 81,49 | 3.0 (V-LAD1 0.6, V-LAD2 0.6, V-LAD3 1.8) | 53.95 | MB 4.1 TB4; 6.1; routes R03 |
| P09 | 5 | V-BR05 81,49 > B-GHALL 81,49 | 6.0 (rappel) | 6.0 | MB 4.1 TB4, 5; routes R04 |
| P10 | 6 | B-GHALL 81,49 > B-GHALL 78,36.5 > B-GHCAR 78,33 | 0 | 16.35 | MB 4 obj 6; brief 5 BG29, BG30 |
| P11 | 7 | B-GHCAR 78,33 > T-RISER 73,31 > T-TUNB 73,28.5 > T-TUNB 49,28.5 > T-VAULT 47,28.5 > T-VAULT 47,24.75 > T-MH 48.75,24.75 | 7.2 (BG32 3.6 down, TB02 3.6 up) | 46.59 | MB 4.1 obj 7; routes R08; 5.2 |
| P12 | 7 | T-MH 48.75,24.75 > S-YARDB 104,9 > S-LANE 104,4 | 0 (east service gate RA02) | 62.45 | MB 4 obj 7; 7.1 RA02; question 1 |

Total: 495.7 m (RULES 2: 450-650).

### 8.2 Notes for P04, P06 and 1g-b
- Insertion at the lane fence's east half (x 84): a west insertion near A gives about 417 m, under the 450 floor; x 84 rather than x 96 keeps 20 m between the way in and the RA02 exit (MB 6 B10, a different path out).
- No-contact way per leg where not obvious: P01 dark fence, slow past the sensor lamps; P03 card from the drawer on the manager's walk; P07-P08 roofs need no reader (cameras looped at P04); P09 grille contact isolated with the roof key (RB16); P11 riser door exits free, B-tier card from TA4 (RA17); P12 under the generator test noise.
- P04 keeps AG06's window, AG05's door, the west link and the fire stair door on these lines, or records the added metres.
- P06 places the fence anchor at P01, the window anchor at AG06 (P02) and a gate climb at RA02 (P12).
- Off this line (other tracks and co-op): the mantrap (no ghost route, MB 4.1), the bridge doors RA11 / RA12 and TB3.
- Question 1 (Michael, 2026-10-11): where does the player leave the site? Options: east service gate RA02 (Recommended: unmanned, chained, at the end of the tanker drive by the compound and generator side, where the generator test noise covers the climb; 101 m from the gatehouse, 57.5 m from the manhole; total 495.7 m) or main vehicle gate RA01 (past the manned gatehouse; 43.7 m from the manhole; total 481.9 m). Answer: east service gate RA02.

Self-check (this session):
- Path `node scripts/kestrel/p03b-path-check-g.mjs`: `path legs 12, total 495.7`, `coverage moves 14, placed 6, open 7`, `fails 0`.
- F: `ring 35 (RA 17, RB 18), rects 114, fails 0, info 2`; E: `vert 17, fails 0, info 2`; A: `zones 27, fixed 15, fails 0, info 0`; B: `zones 19, fixed 10, fails 0`; D: `zones 26, rows 126 of 126, fails 0`.

Deviations: P12 ends at RA02 (x 104, z 8, opposite X08; Michael's fix, 7.1), over the gate to the lane, not at x 73 beside X12. P01 moved from x 96 to x 84 (P02 64.83, was 75.48) so the way in is not beside the exit. Total 495.7, was 472.8.

## 9. Adjacency
Brief 7 checked at zone level: rooms in one zone, zones sharing a face of at least 1.0, or plans overlapping for above and under. P04 keeps each relation when it places rooms.

### 9.1 Must touch
| Id | Item | Rooms | Zones | Relation | Result | P04 | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| J01 | T01 | AG11 AG12 AG13 | G-SEC | same | - | the three side by side on the spine face | brief 7 |
| J02 | T01 | AG11 AG12 AG13 / AG10 | G-SEC / G-SPINE | face | 12.0 on z 43.5, x 7.5-19.5 | doors only on this face, none on the north corridor | brief 7 |
| J03 | T02 | AG01 AG02 AG03 AG04 | G-FRONT | same | - | AG04's hatch in its wall to AG01 | brief 7 |
| J04 | T03 | AG08 AG09 | G-GOODS | same | - | - | brief 7 |
| J05 | T03 | AG08 AG09 / AG22 | G-GOODS / G-EAST | gap 3.5 | 3.5 across the spine, x 34.5-40 | AG22 opposite the goods door across the spine | brief 7; 3.1 (1b-G ASK-4, Michael) |
| J06 | T04 | AF02 AF03 AF05 AF06 | F-OPS | same | - | AF03 at AF02's door, AF05 and AF06 beside it | brief 7 |
| J07 | T05 | AF10 / AF11 | F-PLANT / F-NE | face | 6.0 on x 36.5, z 54-60 | AF11 in F-NE's east end | brief 7 |
| J08 | T05 | AF10 / X13 | F-PLANT / SI-RACK | face | 2.0 on x 40, z 44.5-46.5 | pipes leave AF10's east wall | brief 7, 9; 5.1 |
| J09 | T06 | AF17 / LF01 / BF01 | F-VEST / K-BRIDGE / B-FLOBBY | line | x 36.5-60.5 on z 40-43.5, all at 4.2 | BF01's bridge door on x 52, z 40-43.5 | brief 7; 2 |
| J10 | T07 | AG18 / AG19 | K-STAIR / K-LIFT | face | 1.5 on x 27.5, z 46-47.5 | - | brief 7, 8 |
| J11 | T07 | BG02 / BG03 | KB-STAIR / KB-LIFT | face | 2.5 on z 48.5, x 54.5-57 | - | brief 7, 8 |
| J12 | T08 | BF06 BF07 / BF05 | B-FSEC / B-FCOR | face | 4.5 on x 60.5, z 48.5-53 | BF06 and BF07 at B-FSEC's north-west corner | brief 7 |
| J13 | T08 | BF07 / BF01 | B-FSEC / B-FLOBBY | face | 13.5 on x 60.5, z 35-48.5 | mantrap post in sight of the bridge post across BF01 | brief 7 |
| J14 | T09 | BF08 BF09 | B-FSEC | same | - | BF08 runs from the mantrap to the gallery | brief 7 |
| J15 | T09 | BF09 / BF10 | KB-GALLERY / KB-WELL | face | 3.0 on z 43, x 67-70 | - | brief 7; 4.2 |
| J16 | T09 | BF10 BG13 | KB-WELL | same | - | BG13 opens only into the hall (5.4) | brief 7; 6.1 V-GAL |
| J17 | T10 | BG07 BG09 | B-GGOODS | same | - | BG09 north of BG07 (4.5) | brief 7 |
| J18 | T10 | BG09 / BG20 | B-GGOODS / B-GHALL | face | 7.0 on x 70, z 36-43 | equipment door on this face | brief 7 |
| J19 | T10 | BG07 / X04 | B-GGOODS / S-YARDB | face | 9.5 on z 30, x 60.5-70 | roller door to X12 | brief 7; 5.1 |
| J20 | T11 | BG24 BG25 BG26 BG27 | B-GHPLANT | same | - | BG24 along the south side, rooms north of it | brief 7 |
| J21 | T11 | BG24 / BG20 | B-GHPLANT / B-GHALL | face | 26.0 on z 50.5, x 70-96 | - | brief 7 |
| J22 | T11 | BG23 / BG20 | B-GHCOOL / B-GHALL | face | 14.5 on x 96, z 36-50.5 | - | brief 7 |
| J23 | T11 | BG23 / BU02 | B-GHCOOL / U-COOL | above | 58.0 (x 96-100, z 36-50.5) | - | brief 7; 5.2 |
| J24 | T12 | BG29 BG30 BG31 BG33 | B-GHCAR | same | - | order BG31, BG30, BG29, BG33 west to east (5.4) | brief 7 |
| J25 | T12 | BG31 / BG32 | B-GHCAR / T-RISER | above | 4.0 (x 72-74, z 30-32) | BG31's floor hatch over BG32 | brief 7; 6.1 V-BG32 |
| J26 | T12 | BG32 / TB04 | T-RISER / T-TUNB | face | 2.0 on z 30, x 72-74 | - | brief 7; 5.2 |
| J27 | T13 | BG28 / BG10 | B-GHPLANT / KB-BG10 | face | 3.5 on x 70, z 56.5-60 | BG28 at B-GHPLANT's west end | brief 7 |
| J28 | T13 | BF13 / BG10 | B-FNE / KB-BG10 | above | 33.25 (x 60.5-70, z 56.5-60) | - | brief 7 |
| J29 | T13 | BF13 / BG11 | B-FNE / B-GE | above | 33.25 (x 60.5-70, z 53-56.5) | BG11 touching BG10 (4.5) | brief 7 |
| J30 | T13 | BF13 / X13 | B-FNE / SI-RACK | gap 10.7 | 10.7 (BF13 north-east, deviation 4.4) | pipes run on in B's service void | brief 7, 9; 4.4 |
| J31 | T13 | BG11 / BG40 | B-GE / W-GEN | gap 5.5 | 5.5 across BG10 and X07 | - | brief 7 |
| J32 | T14 | TB01 / X03 | T-VAULT / S-YARDA | above | 48.0 (x 40-48, z 24-30) | - | brief 7; 5.1 |
| J33 | T14 | TB01 / X05 | T-VAULT / S-GAP | face | 8.0 on z 30, x 40-48 | - | brief 7; 5.1 |
| J34 | T14 | TB02 / TB01 | T-MH / T-VAULT | face | 1.5 on x 48, z 24-25.5 | - | brief 7; 5.3 |

Notes for P04 and P03R:
- T03: AG22 sits across the 3.5 spine from goods, not beside it (Michael, 1b-G ASK-4; 3.1). A short trolley run across one corridor is normal practice (general knowledge).
- T12: BG31 is above the carrier riser BG32, which meets TB04's east end; the ducts still rise once (5.1).
- T13: BF13 is at the strip's north-east (brief 7 says north-west), 10.7 from where X13 lands; pipes run on in B's service void (4.4). BG11 is 5.5 from the wing across BG10 and X07; cables cross under 6 m.
- T14: brief 7 asks for equal tunnel runs; TB03 is 17.5 and TB04 26 (5.3). For P03R, not a failure.
- T08: the 13.5 face is the sight line; P04 keeps BF01's partition to B-FSEC glazed, or an open line, so the two posts see each other (brief 7).
- T01: AG11-AG13 doors only on the spine face keeps the security suite a single-entry cluster, as real control rooms are (general knowledge).

Self-check (this session):
- Adjacency `node scripts/kestrel/p03b-adj-check-g.mjs`: `adjacency rows 34, items 14 of 14, rects 114, fails 0`.
- Path: `path legs 12, total 495.7`, `coverage moves 14, placed 6, open 7`, `fails 0`.
- F: `ring 35 (RA 17, RB 18), rects 114, fails 0, info 2`; E: `vert 17, fails 0, info 2`; A: `zones 27, fixed 15, fails 0, info 0`; B: `zones 19, fixed 10, fails 0`; D: `zones 26, rows 126 of 126, fails 0`.

Deviations: none (candidate kept unchanged).

## Appendix A. Room sketch for P04 (not binding)
Written by Part 1b-G before Michael's decision of 2026-10-11 that the block plan holds zones only. Kept as a sketch for P04 with its ASKs; nothing here binds P03B or P04. The frontage shortfall it hit (74.5 m of doors needed, 60 m of spine) is solved in P04 inside the zones.

### A ground (G) sketch
Building A [4, 30, 40, 54]. Spine AG10 runs east-west at z 40 to 43.5. South wall z 30 faces yard X03.

| Id | Rect [x0, z0, x1, z1] | Size | Touches (shared edge of 1.0 m or more) | Source |
| --- | --- | --- | --- | --- |
| AG01 | [6.5, 30, 15.5, 40] | 9 x 10 | AG02, AG03, AG04, AG10, AG21 | brief 5, 7; south wall, main door to X03 |
| AG02 | [15.5, 30, 20.5, 36] | 5 x 6 | AG01, AG04, AG06 | brief 5, 7 |
| AG03 | [4, 30, 6.5, 32.5] | 2.5 x 2.5 | AG01 | brief 5, 7 |
| AG04 | [15.5, 36, 20.5, 40] | 5 x 4 | AG01, AG02, AG10, AG15 | brief 5, 7 (hatch to AG01) |
| AG05 | [20, 49, 26, 54] | 6 x 5 | AG14, AG18 | brief 5; north wall |
| AG06 | [20.5, 30, 28.5, 36] | 8 x 6 | AG02, AG15 | brief 2, 5; south wall, window ajar |
| AG07 | [4, 48, 12, 54] | 8 x 6 | AG14 | MOVED: now AF20 on A first floor (Michael, 2026-10-11); this row is history, not on G |
| AG08 | [32, 30, 40, 40] | 8 x 10 | AG09, AG10 | brief 5, 7; south wall, roller door |
| AG09 | [29, 36, 32, 40] | 3 x 4 | AG08, AG10 | brief 5, 7 |
| AG10 | [10, 40, 40, 43.5] | 30 x 3.5 | AG01, AG04, AG08, AG09, AG11, AG12, AG13, AG15, AG16, AG17, AG18, AG20, AG22, AG25 | brief 5, 7; spine band, constraint 3 |
| AG11 | [15, 43.5, 21, 48.5] | 6 x 5 | AG10, AG12, AG13, AG14 | brief 5, 7 |
| AG12 | [21, 43.5, 26, 47.5] | 5 x 4 | AG10, AG11, AG18 | brief 5, 7 |
| AG13 | [12, 43.5, 15, 47.5] | 3 x 4 | AG10, AG11, AG25 | brief 5, 7 |
| AG14 | [12, 48.5, 20, 53.5] | 8 x 5 | AG05, AG07, AG11 | brief 5 |
| AG15 | [20.5, 36, 25.5, 40] | 5 x 4 | AG04, AG06, AG10 | brief 5; touches the spine |
| AG16 | [26, 38, 28.5, 40] | 2.5 x 2 | AG10 | brief 5 |
| AG17 | [33.5, 43.5, 35, 45.5] | 1.5 x 2 | AG10, AG20, AG22 | brief 5 (open recess) |
| AG18 | [26, 43.5, 30, 51.5] | 4 x 8 | AG05, AG10, AG12, AG19, AG20 | brief 8; north of spine, east of centre |
| AG19 | [30, 46, 32.5, 48.5] | 2.5 x 2.5 | AG18, AG20 | brief 8; east of the core |
| AG20 | [30, 43.5, 33.5, 46] | 3.5 x 2.5 | AG10, AG17, AG18, AG19 | brief 8 |
| AG21 | [4, 40, 7.5, 46.5] | 3.5 x 6.5 | AG01 | brief 8; west end, exit on x 4 |
| AG22 | [35, 43.5, 40, 47.5] | 5 x 4 | AG10, AG17, AG23 | brief 5, 7 |
| AG23 | [38, 47.5, 40, 49.5] | 2 x 2 | AG22 | brief 5; beside AG22, see ASK |
| AG24 | [31, 49, 38, 54] | 7 x 5 | - | brief 5 |
| AG25 | [10, 43.5, 12, 45] | 2 x 1.5 | AG10, AG13 | brief 8; spine west third |

Spine band: [10, 40, 40, 43.5] (bridge z0 for 1b-F is 40; bridge rect [40, 40, 52, 43.5]).

Self-check (node script, this session): `rects 25, area 731 of 731, grid 0, outside A 0, size mismatches 0, overlaps 0, must-touch failures 1 (AG21-AG10, see ASK-3), AG11-13 vs AG01-03/08/09 touching 0, lift touches AG18 and AG20 only`.

### Leftover (sketch)
133 m2 (864 - 731), unassigned rects (merged by script, rows may be split further):

| Rect [x0, z0, x1, z1] | m2 | Could be |
| --- | --- | --- |
| [7.5, 40, 10, 46.5] | 16.25 | Stair-foot lobby of AG21, spine west end (ASK-3) |
| [4, 32.5, 6.5, 40] | 18.75 | Dead space behind AG03, or a store off AG01 |
| [28.5, 30, 32, 36] | 21 | Dead space between AG06 and AG08, or a goods store |
| [4, 46.5, 12, 48] | 12 | Dead space (2 m band); wall thickness pocket |
| [26, 51.5, 31, 54] | 12.5 | Dead space north of the core, or a store |
| [38, 49.5, 40, 54] | 9 | Dead space at the north-east corner |
| 13 more slivers | 43.5 | 0.5 grid residue (mostly 0.5 to 2.0 m wide): wall pockets, shafts |

Michael answered ASK-1: leftover goes to the branch corridor first; what remains stays as wall and shaft pockets.

### Deviations (sketch)
- No rect sizes changed. Turned 90 degrees: AG02 (5 x 6), AG06 kept 8 x 6, AG08 (8 x 10), AG09 (3 x 4), AG17 (1.5 x 2), AG18 kept 4 x 8, AG21 (3.5 wide x 6.5 deep).
- Rooms with one outside wall lose 0.075 more clear (not resized): AG03, AG05, AG06, AG07 (two outside walls), AG08, AG24, AG22, AG23.
- Spine x 10-40, not 7.5-37.5: it must reach x 40 for the bridge in line with AF17. AG21 is 3.5 wide (x 4-7.5), so a 2.5 m foot lobby sits between AG21 and the spine (leftover [7.5, 40, 10, 43.5]). The "AG21 touches AG10" check therefore reads 0 and the fire door goes through that lobby.
- The lift (AG19) shares the AG18 core wall as brief 8 requires, although AG18 is marked "walls to slab". The lift check exempts AG18 and its own lobby AG20.
- AG23 is a separate rect beside AG22 (north edge), not overlapping it (schema 1b rule in the prompt).
- AG12 and AG13 do not touch each other. AG11 sits between them and touches both. Brief 7 asks AG11 with AG12 and AG13 only.

### ASKs (sketch)
Michael's answers (2026-10-11): ASK-2 use the leftover for a short branch corridor (kind corridor, 3.5 rect, 3.2 clear, ceiling 2.4, void) so AG05, AG06, AG07, AG14, AG24 each touch a corridor, moving rooms only as far as needed; if it cannot fit, write ASK and stop. ASK-3 accept the foot lobby. ASK-4 accept AG22 across the spine.

Extra self-check rule (every room touches a corridor or its own lobby; AG02 and AG03 use AG01, AG19 uses AG20, AG21 uses its foot lobby, AG23 uses the AG22 hatch): 5 failures, AG05, AG06, AG07, AG14, AG24. Layout unchanged.

ASK-5 (branch corridor cannot fit the north four; stopped as instructed). Why: the north half is 10.5 deep. A room off the spine takes 4 to 5, a corridor 3.5, and a north-wall room needs 5 to 6, so an east-west branch leaves 2. A north-south branch has only 3 wall slots (one west of it, one east of it, plus the spine row), and it needs 3.5 m of spine frontage, which is all used (60 m of 60). Fits: AG06 only. A 3.5 x 4 stub [25.5, 36, 29, 40] off the spine touches AG06's north edge, using leftover, if AG16 and AG17 move (they have no home: no frontage left). What would have to move, options (recommended first):
- (a) Split the load: a north-south branch [10, 43.5, 13.5, 54] at the spine's west end, AG25 and AG17 move onto it (frees 3.5 m of frontage), AG13, AG11, AG12, core, lobby slide 1.5 m east to x 13.5-35, AG24 west of it [5, 46.5, 10, 53.5], AG14 east [13.5, 48.5, 21.5, 53.5]; AG05 and AG07 still do not touch. Plus the AG06 stub; AG16 needs a home.
- (b) Reduce the count: AG07 (customer services) and AG05 move to the south row in place of AG06 and AG15, and AG06 goes north. Needs Michael to loosen "AG06 on the south wall".
- (c) Swap to a double-loaded north wing: shrink the spine rooms AG11-AG13 to the south half (needs AG02-AG04 or AG15 to move north), freeing the north half for an east-west branch at z 48.5-52 with rooms at z 52-54... does not work (2 deep).
- (d) Allow a second spine-parallel corridor by moving the spine to z 36-39.5 and AG01 to 9 x 10 turned 10 x 9 (loosens AG01 and AG08 constraints; Michael's approval).


Michael's answer to ASK-5 (2026-10-11): none of (a), (b) or (c); (d) is not approved either. Re-run as prompts/P03B-1b-G-r2.md: every room must reach a corridor or its own lobby by a door, with the brief's rules kept (AG06 on an outside wall with an openable window, no room below its brief clear size). Allowed: an L or loop corridor, a second short corridor, moving rooms, suites where a real building has them. The spine may move only with a written reason.
