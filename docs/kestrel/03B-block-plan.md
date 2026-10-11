# Cinder Yard - campus block plan
Status: DRAFT (Part 1a done; Part 1b zones next)
Zones only: no rooms, doors or objects. Zones, corridors, cores and levels; room rectangles belong to P04 (Michael, 2026-10-11).

Metres, origin at the site's south-west corner, +X east, +Z north (schema 1). Rects are `[x0, z0, x1, z1]`, wall centrelines (RULES 6).

## 1. Grid and site

| Item | Rect [x0, z0, x1, z1] | Size | Source |
| --- | --- | --- | --- |
| Site | [0, 0, 108, 76] | 108 x 76 | brief 4; RULES 2 (at most 110 x 80) |
| Lane X01 | [0, 0, 108, 8]; depot facade (7.0 high) on z 0, lane fence on z 8 | 108 x 8 | brief 4 (6.0 carriageway + 2.0 footway), brief 5 X01 |
| Front yard X03 | [0, 8, 52, 30] | 52 x 22 | brief 5 X03 |
| Front yard X04 | [52, 8, 108, 30] | 56 x 22 | brief 5 X04 |
| West path X10 | [0, 30, 4, 54] | 4 x 24 | brief 5 X10 |
| Building A | [4, 30, 40, 54] | 36 x 24 (6 x 4 bays) | brief 2 |
| Gap X05 | [40, 30, 52, 54] | 12 x 24 (two bays) | brief 2, 4, 5 X05 |
| Building B | [52, 30, 100, 60] | 48 x 30 (8 x 5 bays) | brief 2 |
| B west strip | [52, 30, 70, 60] (two storeys) | 18 x 30 | brief 2, 12h |
| B hall block | [70, 30, 100, 60] (single storey) | 30 x 30 | brief 2, 12h |
| East drive X08 | [100, 30, 108, 76] | 8 x 46 | brief 5 X08 |
| Service passage X07 | [52, 60, 76, 62]: B north wall z 60 to wing south wall z 62 | 2.0 centreline, 1.55 clear | brief 4, 12e (F08 1.2-1.95) |
| Generator wing W | [52, 62, 76, 74] (behind B's west half) | 24 x 12 | brief 2, 4 |
| Transformer compound X09 | [76, 60, 100, 76] (behind B's east half) | 24 x 16 | brief 4, 5 X09 |
| Rear yard X06 | [0, 54, 52, 76] behind A and the gap, plus [52, 74, 76, 76] behind the wing | 52 x 22 + 24 x 2.0 | brief 5 X06 (corrected, see deviations) |
| Viaduct (north boundary) | on z 76, 9.0 to deck | - | brief 4 |
| East and west boundaries | lane fence type on x 0 and x 108 | - | brief 4 |

Self-check (node script over a 0.5 grid, this session): `items 13, area sum 8208 of 8208, cells not covered exactly once: 0`.

### Grid lines
- Bay 6.0 x 6.0, one grid for the whole campus (brief 2).
- X lines: x = 4, 10, 16, ..., 100 (every 6.0; 17 lines). A spans x 4-40, the gap x 40-52 (line x 46 runs across it), B x 52-100; strip / hall split on line x 70.
- Z lines: z = 30, 36, 42, 48, 54, 60 (6 lines). A spans z 30-54, B z 30-60.

### Deviations from the brief
- Service passage X07: 2.0 between wall centrelines, 1.55 clear, not 1.5 clear. A 1.5 clear passage needs centrelines 1.95 apart, off the 0.5 grid (RULES 6). 1.55 stays inside F08 1.2-1.95 (brief 12e).
- Rear strip behind the wing: 2.0 deep, not 2.5 (brief 5 X06), because the passage takes the extra 0.5. Site sum is unchanged: passage 48 (was 36), rear yard 1192 (was 1204), total 8208.
- Generator wing walls on z 62 and z 74 are off the structural grid (z lines 60, 66, 72). The wing stands on its own foundations behind the passage (brief 2), so it has its own grid offset 2.0 north; its x walls (52, 76) stay on campus lines (Michael, 2026-10-11).
- No other row of the proposed table changed.

## 2. Levels and footprints

| Level | Name | Floor (m) | Height (m) | Footprint | Source |
| --- | --- | --- | --- | --- | --- |
| B | Under the yard | -3.6 | 3.6 | Vault, carrier manhole shaft, service tunnel; rects set in Part 1d | brief 2, 4, 12c |
| U | Underfloor void | -1.6 | 1.6 to hall floor (1.5 clear under tiles) | Hall and cooling-gallery plenum band, inside the hall block [70, 30, 100, 60]; exact rect set with B's hall rooms in a later part | brief 2, 12b |
| G | Ground | 0.0 | 4.2 (A, B strip); 6.6 to roof (hall block, wing) | Listed, not default: A [4, 30, 40, 54], B [52, 30, 100, 60], wing [52, 62, 76, 74]. The wing is outside `meta.buildings` footprints, so the default would miss it | brief 2; schema 2 levels[].footprint |
| F | First | 4.2 | 4.2 | A [4, 30, 40, 54], B strip [52, 30, 70, 60], link bridge [40, z0, 52, z0 + 3.5] in the gap, between AF17 and BF01; z0 set with those rooms (Part 1b) | brief 2, 12h |
| H | Low roof | 6.6 | - (open roof, parapet 1.1 to 7.7) | Hall block [70, 30, 100, 60], wing [52, 62, 76, 74] | brief 2, 4 |
| L | Bridge roof | 7.8 | - (open roof) | Link bridge rect [40, z0, 52, z0 + 3.5] (Michael, 2026-10-11) | brief 2 |
| R | Roof | 8.4 | - (open roof, parapet 1.1) | A [4, 30, 40, 54], B strip [52, 30, 70, 60] | brief 2 |

- H at 6.6 overlaps F's span (4.2-8.4) in height; their footprints do not overlap (schema 1).
- Bridge width 3.5 is wall-centreline; side walls exterior 0.45, so 3.05 clear (Michael, 2026-10-11).
- Bridge roof LF02 at 7.8 gets its own level L (Michael, 2026-10-11). L is a new level id; schema 1 lists B, U, G, F, H, S, R, so schema 1 needs `L` added (P03R or a schema revision).

## 3. Building A
Zones for G, F and R are written by Part 1b (prompts/P03B-1b-zones.md). A zone holds brief rooms whose rect areas fill at most 85% of it; the spare space is for P04's extra corridors (Michael, 2026-10-11).

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
