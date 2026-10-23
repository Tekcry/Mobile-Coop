/**
 * Section 4 art dressing (sector-redesign ART-S4; ART-KIT stub, registered in `campusDress.ts`). The ART-S4 slice
 * replaces this file: `S4_ART_TAGS` (every room of `S4_ROOMS` -> its tag), `HERO_S4` (the section's hero
 * catalogue, `hero-s4.glb`) and `dressS4` (skins, heroes, then `d.base()` last; ART-PLAN 5.1). With empty tags
 * `base()` places nothing.
 */
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';

export const S4_ART_TAGS: Record<string, ArtTag> = {};
export const HERO_S4: PropCatalogue | null = null;
export function dressS4(d: CampusDresser): void {
  d.base();
}
