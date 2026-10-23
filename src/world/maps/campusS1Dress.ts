/**
 * Section 1 art dressing (sector-redesign ART-S1; ART-KIT stub, registered in `campusDress.ts`). The ART-S1 slice
 * replaces this file: `S1_ART_TAGS` (every room of `S1_ROOMS` -> its tag), `HERO_S1` (the section's hero
 * catalogue, `hero-s1.glb`) and `dressS1` (skins, heroes, then `d.base()` last; ART-PLAN 5.1). With empty tags
 * `base()` places nothing.
 */
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';

export const S1_ART_TAGS: Record<string, ArtTag> = {};
export const HERO_S1: PropCatalogue | null = null;
export function dressS1(d: CampusDresser): void {
  d.base();
}
