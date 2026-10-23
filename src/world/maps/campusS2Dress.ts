/**
 * Section 2 art dressing (sector-redesign ART-S2, briefs/ART-S2.md; ART-KIT API in `src/world/campusArt`). `S2_ART_TAGS`
 * tags every room of `S2_ROOMS`; `dressS2` skins the greybox objects (desks and chairs, counters, tables, cages,
 * switchgear, shelving, lift doors, the CR2 planter), places the heroes, then `d.base()` last. A skin or hero that
 * fails its rule is logged (`S2_DRESS_LOG`, read by the section's test and the build report), never thrown: a build
 * must not break the game.
 */
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';
import { boxAt, pointSegDist } from '../campusArt/geometry';

export const S2_ART_TAGS: Record<string, ArtTag> = {
  post: 'mailroom',
  mail: 'mailroom',
  lift: 'lobby',
  store: 'store',
  foyer: 'reception',
  hall: 'atrium',
  hallne: 'lobby',
  plant: 'plant',
  roof: 'roof',
  l1sw: 'office-open',
  l1kitchen: 'kitchen',
  l1north: 'office-open',
  l1fac: 'office-cell',
  l1wing: 'office-open',
  l2sw: 'office-open',
  l2north: 'office-cell',
  l2wing: 'office-open',
};

export const HERO_S2: PropCatalogue | null = null;

/** What the last `dressS2` run skipped (a skin or hero that failed its rule), one line each. */
export const S2_DRESS_LOG: string[] = [];

const PI = Math.PI;

/** Runs one dressing step; a throw is logged with its label and the step is dropped. */
function attempt(label: string, fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch (e) {
    S2_DRESS_LOG.push(`${label}: ${(e as Error).message}`);
    return false;
  }
}

/** The distance from a plan point to the nearest route leg of the section (the K1 legs the chairs keep off). */
function routeDist(d: CampusDresser, x: number, z: number): number {
  let best = Infinity;
  for (const r of d.ctx.sector.routes) {
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1]!;
      const b = r.pts[i]!;
      best = Math.min(best, pointSegDist(x, z, a[0], a[1], b[0], b[1]));
    }
  }
  return best;
}

/** The L1 and L2 desks (`furn` loops: 1.6 x 0.75 x 0.8 blocks at floor + 0.375). */
const L1_DESKS: readonly (readonly [number, number])[] = [[-31.5, -4.5], [-31.5, 0.5], [-12, 3], [-12, 5]];
const L2_DESKS: readonly (readonly [number, number])[] = [[-34, 3], [-36, 1], [-16, 3.5], [-12, 3.5], [-33, -25.5]];

/** An office desk skin (the user's side away from the nearest route leg) and its chair, dropped when it throws. */
function desk(d: CampusDresser, x: number, z: number, floor: number): void {
  const i = boxAt(d.ctx.boxes, x, floor + 0.375, z);
  // the user sits at the desk's +z (yaw 0) or -z (yaw PI): the side away from the route
  const side = routeDist(d, x, z + 1.2) >= routeDist(d, x, z - 1.2) ? 1 : -1;
  if (!attempt(`desk ${x},${z},${floor}`, () => void d.skin('F:officeDesk', i, side > 0 ? 0 : PI, { why: 'office desk skin' }))) return;
  for (const s of [side, -side]) {
    if (attempt(`chair ${x},${z},${floor} side ${s}`, () => void d.add('F:officeChair', x, floor, z + s * 0.7, s > 0 ? PI : 0, { cls: 'see', why: 'chair at the desk' }))) return;
  }
}

export function dressS2(d: CampusDresser): void {
  S2_DRESS_LOG.length = 0;
  const bx = d.ctx.boxes;
  const [F1, F2] = [4.4, 8.4];

  // ---- the G floor
  attempt('cafe tables', () => {
    for (const [x, z] of [[-13, -9], [-13, -6.5], [-22.5, -9.5]] as const) d.skin('K:cafeTable', boxAt(bx, x, 0.375, z), 0, { why: 'cafe table skin' });
  });

  // ---- offices
  for (const [x, z] of L1_DESKS) attempt(`L1 desk ${x},${z}`, () => desk(d, x, z, F1));
  for (const [x, z] of L2_DESKS) attempt(`L2 desk ${x},${z}`, () => desk(d, x, z, F2));

  attempt('L2 board table', () => void d.skin('K:boardTable', boxAt(bx, -38, 8.775, 3), 0, { why: 'L2 board table skin' }));

  d.base();
}
