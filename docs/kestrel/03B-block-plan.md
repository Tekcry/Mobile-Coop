# Cinder Yard - campus block plan
Status: DRAFT (Part 1a: site and levels)

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
- Generator wing walls on z 62 and z 74 are off the structural grid (z lines 60, 66, 72). The wing stands on its own foundations behind the passage (brief 2), so it has its own grid offset 2.0 north; its x walls (52, 76) stay on campus lines. ASK: is an offset wing grid acceptable, or should the wing move to grid lines (a 6.0 passage, which breaks brief 12e)?
- No other row of the proposed table changed.

## 2. Levels and footprints

| Level | Name | Floor (m) | Height (m) | Footprint | Source |
| --- | --- | --- | --- | --- | --- |
| B | Under the yard | -3.6 | 3.6 | Vault, carrier manhole shaft, service tunnel; rects set in Part 1d | brief 2, 4, 12c |
| U | Underfloor void | -1.6 | 1.6 to hall floor (1.5 clear under tiles) | Hall and cooling-gallery plenum band, inside the hall block [70, 30, 100, 60]; exact rect set with B's hall rooms in a later part | brief 2, 12b |
| G | Ground | 0.0 | 4.2 (A, B strip); 6.6 to roof (hall block, wing) | Listed, not default: A [4, 30, 40, 54], B [52, 30, 100, 60], wing [52, 62, 76, 74]. The wing is outside `meta.buildings` footprints, so the default would miss it | brief 2; schema 2 levels[].footprint |
| F | First | 4.2 | 4.2 | A [4, 30, 40, 54], B strip [52, 30, 70, 60], link bridge [40, z0, 52, z0 + 3.5] in the gap, between AF17 and BF01; z0 set with those rooms (Part 1b) | brief 2, 12h |
| H | Low roof | 6.6 | - (open roof, parapet 1.1 to 7.7) | Hall block [70, 30, 100, 60], wing [52, 62, 76, 74] | brief 2, 4 |
| R | Roof | 8.4 | - (open roof, parapet 1.1) | A [4, 30, 40, 54], B strip [52, 30, 70, 60] | brief 2 |

- H at 6.6 overlaps F's span (4.2-8.4) in height; their footprints do not overlap (schema 1).
- Bridge width 3.5 is wall-centreline; clear width is 3.2 with 0.3 interior walls or 3.05 with 0.45 exterior walls. ASK: which wall type for the bridge sides?
- ASK: bridge roof LF02 is at 7.8 (brief 2), on no level. Options: add a level for it, or treat it as an object top on F.
