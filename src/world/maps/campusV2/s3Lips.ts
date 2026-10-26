// (campus-greybox S3) The v2 lab block's co-op lips CR3 and CR3b (sub-lane r6, slice R6; brief `docs/campus-greybox/briefs/S3.md`).
// `s3.ts` re-exports the list; the campus list `CAMPUS_COOP_LIPS` is built once in `campusLips.ts` (P0's wiring).
import type { CoopLip } from '../campusS1';

/**
 * CR3 (kept, D:143-146): the chamber's west face, a 4.4 lip over the hall floor; its roof is also reached from above by the
 * gallery spur (no softlock). CR3b (D:147-150, AS10, P9): the goods landing's hatch edge, x 18 over the loading pad (0.1),
 * the manual ledge `s3L1.ts` builds there (the landing slab is noLedge); the way down from the landing is a solo drop.
 */
export const S3_COOP_LIPS: readonly CoopLip[] = [
  {
    id: 'CR3',
    section: 2,
    lip: { x: 30, z0: -22, z1: -14, y: 4.4, n: { x: -1, z: 0 } },
    top: { x0: 30, x1: 36, z0: -22, z1: -14, top: 4.4 },
    boost: { floor: 0, x: 29.2, z: -18 },
    solo: 'the north stair; the gallery spur reaches the chamber roof from above (no softlock)',
  },
  {
    id: 'CR3b',
    section: 2,
    lip: { x: 18, z0: -6, z1: -3, y: 4.5, n: { x: 1, z: 0 } },
    top: { x0: 10, x1: 18, z0: -7, z1: 0, top: 4.5 },
    // (derived: 0.8 m off the lip, as CR3) on the loading pad
    boost: { floor: 0.1, x: 18.8, z: -4.5 },
    solo: 'the north stair (the way down is a solo drop)',
  },
];
