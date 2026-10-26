import type { SectionBakeDef } from '../sectionBake';

/**
 * (section-bake, SB4) Saltmarsh Park's bake regions: per section (`CAMPUS_SECTORS` order) the plan rects
 * [x0, z0, x1, z1] (full height) where gameplay reads the light while that section is live: its footprint
 * (SPEC "Map structure decision"), the yards and the extraction it walks, and every connector it shares (a connector
 * belongs to both sections it joins). `sectionBake.ts` grows each by `SECTION_MARGIN`. Pure data (no imports beyond the
 * type): `tests/sectionBakeCampus.test.ts` checks every point of the section data and every room lies inside.
 */
const C1: readonly [number, number, number, number] = [-24, -34, -16, -30];
const C2: readonly [number, number, number, number] = [4, -16, 10, -12];
const C3: readonly [number, number, number, number] = [22, 0, 26, 16];
const C4: readonly [number, number, number, number] = [-26, 26, -10, 32];

export const CAMPUS_BAKE: SectionBakeDef = {
  regions: [
    // S1: the gatehouse, the staff car park and the forecourt (the verge spawn and the ring road edge), C1
    [[-40, -84, 26, -34], C1],
    // S2: the HQ atrium block, C1 (its start), C2 (the L1 bridge)
    [[-44, -30, 4, 6], C1, C2],
    // S3: the labs, the annex and the east yard (x 64..70), C2 (its start), C3 (the dock link)
    [[10, -30, 70, 0], C2, C3],
    // S4: the data hall and the generator compound, C3 (its start), C4 (the colonnade)
    [[-10, 16, 40, 48], C3, C4],
    // S5: the Old House, its garden (to the west fence) and terrace, the shore path to the boathouse jetty (the extraction), C4 (its start)
    [[-70, 18, -26, 70], C4],
  ],
};
