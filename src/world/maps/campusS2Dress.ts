/**
 * Section 2 art dressing (sector-redesign ART-S2; ART-KIT stub, registered in `campusDress.ts`). The ART-S2 slice
 * replaces this file: `S2_ART_TAGS` (every room of `S2_ROOMS` -> its tag), `HERO_S2` (the section's hero
 * catalogue, `hero-s2.glb`) and `dressS2` (skins, heroes, then `d.base()` last; ART-PLAN 5.1). With empty tags
 * `base()` places nothing.
 */
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';

export const S2_ART_TAGS: Record<string, ArtTag> = {};
export const HERO_S2: PropCatalogue | null = null;
export function dressS2(d: CampusDresser): void {
  d.base();
}
