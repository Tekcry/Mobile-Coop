/**
 * Section 3 art dressing (sector-redesign ART-S3; ART-KIT stub, registered in `campusDress.ts`). The ART-S3 slice
 * replaces this file: `S3_ART_TAGS` (every room of `S3_ROOMS` -> its tag), `HERO_S3` (the section's hero
 * catalogue, `hero-s3.glb`) and `dressS3` (skins, heroes, then `d.base()` last; ART-PLAN 5.1). With empty tags
 * `base()` places nothing.
 */
import type { ArtTag } from '../campusArt/artTags';
import type { PropCatalogue } from '../campusArt/catalogue';
import type { CampusDresser } from '../campusArt/dresser';

export const S3_ART_TAGS: Record<string, ArtTag> = {};
export const HERO_S3: PropCatalogue | null = null;
export function dressS3(d: CampusDresser): void {
  d.base();
}
