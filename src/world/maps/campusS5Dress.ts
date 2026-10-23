/**
 * Section 5 art dressing (sector-redesign ART-S5; ART-KIT stub, registered in `campusDress.ts`). The ART-S5 slice
 * replaces this file: `S5_ART_TAGS` (every room of `S5_ROOMS` -> its tag), `HERO_S5` (the section's hero
 * catalogue, `hero-s5.glb`) and `dressS5` (skins, heroes, then `d.base()` last; ART-PLAN 5.1). With empty tags
 * `base()` places nothing.
 */
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';

export const S5_ART_TAGS: Record<string, ArtTag> = {};
export const HERO_S5: PropCatalogue | null = null;
export function dressS5(d: CampusDresser): void {
  d.base();
}
