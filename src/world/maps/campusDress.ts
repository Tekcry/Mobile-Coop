/**
 * The campus art registry (sector-redesign ART-KIT step 5, ART-PLAN 5 "Registration", AS3): the five section dressers,
 * pre-registered against their dress files, so the section slices (ART-S1 .. ART-S5) edit only their own
 * `campusS<N>Dress.ts` and never a shared line. `dressCampus` runs once per campus build (`buildCampus` with `dress`):
 * per section it recolours the section's greybox by room tag (`applyFinishes`), builds the section's dressing context,
 * runs its dresser (skins, heroes, then `base()`), writes the solid / see boxes and collects the placements for the
 * renderer. Pure (no Babylon at run time); gameplay reads only the boxes written here.
 */
import type { MapLayout } from '../mapDef';
import type { LevelBuilder } from '../levelBuilder';
import { buildCoverSegments } from '../../cover/coverData';
import { findSplitGaps } from '../../player/splitJump';
import { applyFinishes } from '../campusArt/finishes';
import { CampusDresser } from '../campusArt/dresser';
import { collectItems, type DressContext } from '../campusArt/keepouts';
import { facilityCatalogue, type ArtPlacement, type CatalogueSet, type PropCatalogue } from '../campusArt/catalogue';
import { CAMPUS_KIT } from '../campusArt/campusKit';
import type { ArtTag } from '../campusArt/artTags';
import type { RoomDef } from '../rooms';
import { CAMPUS_SECTORS } from './campusSectors';
import { CAMPUS_COOP_LIPS } from './campusLips';
import { S1_ROOMS } from './campusS1';
import { S2_ROOMS } from './campusS2';
import { S3_ROOMS } from './campusS3';
import { S4_ROOMS } from './campusS4';
import { S5_ROOMS } from './campusS5';
import { dressS1, HERO_S1, S1_ART_TAGS } from './campusS1Dress';
import { dressS2, HERO_S2, S2_ART_TAGS } from './campusS2Dress';
import { dressS3, HERO_S3, S3_ART_TAGS } from './campusS3Dress';
import { dressS4, HERO_S4, S4_ART_TAGS } from './campusS4Dress';
import { dressS5, HERO_S5, S5_ART_TAGS } from './campusS5Dress';

export type SectionDresser = (d: CampusDresser) => void;
export interface CampusArtLayout {
  placements: ArtPlacement[];
  /** Catalogue ids used ('F', 'K', 'H1', ...). */
  catalogues: string[];
}

const DRESSERS: readonly SectionDresser[] = [dressS1, dressS2, dressS3, dressS4, dressS5];
const TAGS: readonly Readonly<Record<string, ArtTag>>[] = [S1_ART_TAGS, S2_ART_TAGS, S3_ART_TAGS, S4_ART_TAGS, S5_ART_TAGS];
const HEROES: readonly (PropCatalogue | null)[] = [HERO_S1, HERO_S2, HERO_S3, HERO_S4, HERO_S5];
const ROOMS: readonly (readonly RoomDef[])[] = [S1_ROOMS, S2_ROOMS, S3_ROOMS, S4_ROOMS, S5_ROOMS];

/** The catalogues a section's dresser sees: F, K and its own hero set. */
export function sectionCatalogues(k: number): CatalogueSet {
  const cats: Record<string, PropCatalogue> = { F: facilityCatalogue(), K: CAMPUS_KIT };
  const h = HEROES[k];
  if (h) cats[h.id] = h;
  return cats;
}

/** Every catalogue the campus may draw (F, K, the heroes that exist), by id. */
export function campusCatalogues(): CatalogueSet {
  const cats: Record<string, PropCatalogue> = { F: facilityCatalogue(), K: CAMPUS_KIT };
  for (const h of HEROES) if (h) cats[h.id] = h;
  return cats;
}

/** Section k's dressing context over the built greybox (the split gaps are computed on first use, once per build). */
export function sectionContext(b: LevelBuilder, lay: MapLayout, k: number, splits: () => DressContext['splits']): DressContext {
  const sector = CAMPUS_SECTORS[k]!;
  const rooms = ROOMS[k]!;
  const inRooms = (x: number, z: number): boolean => rooms.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
  const hides: { x: number; y: number; z: number }[] = [];
  for (const h of lay.hideSpots ?? []) if (h.section === k) hides.push({ x: h.pos.x, y: h.pos.y, z: h.pos.z });
  if (k === 0) for (const s of lay.playerSpawns) hides.push({ x: s.pos.x, y: s.pos.y, z: s.pos.z });
  for (const s of lay.navSeeds ?? []) if (inRooms(s.x, s.z)) hides.push({ x: s.x, y: s.y, z: s.z });
  const devices = lay.security?.devices ?? [];
  return {
    section: k,
    rooms,
    tags: TAGS[k]!,
    sector,
    doors: b.anchors.doors,
    windows: b.anchors.windows,
    anchors: b.anchors,
    items: collectItems(lay, k, sector),
    hides,
    cameras: devices.filter((c) => c.section === k),
    levels: lay.security?.levels ?? {},
    lasers: (lay.lasers ?? []).filter((l) => l.section === k),
    lips: CAMPUS_COOP_LIPS,
    lamps: b.lights.lights.map((l) => ({ x: l.x, y: l.y, z: l.z })),
    boxes: b.boxes,
    cylinders: b.cylinders,
    get splits() {
      return splits();
    },
  };
}

/**
 * Dresses the five sections over the built greybox: `ranges[k]` is section k's `[i0, i1)` box range (`buildSection`),
 * recoloured by `applyFinishes`; each section's dresser runs on its own context, then writes its boxes.
 */
export function dressCampus(b: LevelBuilder, lay: MapLayout, ranges: readonly (readonly [number, number])[]): CampusArtLayout {
  let gaps: DressContext['splits'] | null = null;
  const splits = (): DressContext['splits'] => (gaps ??= findSplitGaps(buildCoverSegments(b.boxes, b.cylinders)).map((g) => ({ a: g.a, b: g.b })));
  const placements: ArtPlacement[] = [];
  const used = new Set<string>();
  for (let k = 0; k < DRESSERS.length; k++) {
    const range = ranges[k];
    if (range) applyFinishes(b.boxes, range, ROOMS[k]!, TAGS[k]!);
    const d = new CampusDresser(b, sectionContext(b, lay, k, splits), sectionCatalogues(k));
    DRESSERS[k]!(d);
    d.write();
    for (const p of d.placements) {
      placements.push(p);
      used.add(p.cat);
    }
  }
  return { placements, catalogues: [...used].sort() };
}
