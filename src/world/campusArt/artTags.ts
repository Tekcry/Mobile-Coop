/**
 * Campus room art tags (sector-redesign ART-KIT step 4, ART-PLAN 4.1; pure). Each section dress file tags every one of
 * its rooms (`S<N>_ART_TAGS`, room id -> tag); the base pass (`dressRules.ts`) dresses a room by its tag and
 * `finishes.ts` recolours its floor, walls and ceiling. The tags live in the dress files, not on `RoomDef` (AS9).
 */
export const ART_TAGS = [
  'office-open',
  'office-cell',
  'kitchen',
  'reception',
  'atrium',
  'lobby',
  'corridor',
  'mailroom',
  'store',
  'plant',
  'security',
  'gatehouse',
  'lab-hall',
  'lab-clean',
  'lab-gown',
  'lab-store',
  'dock',
  'data-hall',
  'cage',
  'noc',
  'ups',
  'battery',
  'riser',
  'mantrap',
  'oh-formal',
  'oh-hall',
  'oh-corridor',
  'oh-service',
  'oh-kitchen',
  'oh-archive',
  'oh-control',
  'oh-ante',
  'strongroom',
  'ext-verge',
  'ext-road',
  'ext-carpark',
  'ext-service',
  'ext-shelter',
  'ext-forecourt',
  'ext-compound',
  'ext-garden',
  'ext-terrace',
  'ext-jetty',
  'roof',
  'roof-plant',
  'none',
] as const;

export type ArtTag = (typeof ART_TAGS)[number];

/** Outdoor tags (an exit sign goes over a door whose far side is one of these, or no room at all). */
export const isOutdoor = (t: ArtTag | undefined): boolean => t !== undefined && (t.startsWith('ext-') || t === 'roof' || t === 'roof-plant');
