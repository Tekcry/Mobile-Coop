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
import { CAMPUS_PARTS } from './campusSections';

export type SectionDresser = (d: CampusDresser) => void;
export interface CampusArtLayout {
  placements: ArtPlacement[];
  /** Catalogue ids used ('F', 'K', 'H1', ...). */
  catalogues: string[];
}

// (campus-greybox P0) each section's dresser, tags, hero set and rooms from its live or v2 parts (`campusSections.ts`)
const DRESSERS: readonly SectionDresser[] = CAMPUS_PARTS.map((p) => p.dress);
const TAGS: readonly Readonly<Record<string, ArtTag>>[] = CAMPUS_PARTS.map((p) => p.artTags);
const HEROES: readonly (PropCatalogue | null)[] = CAMPUS_PARTS.map((p) => p.hero);
const ROOMS: readonly (readonly RoomDef[])[] = CAMPUS_PARTS.map((p) => p.rooms);

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

/** Section k's dressing context over the built greybox (the split gaps come from the greybox, computed once before the dressing loop). */
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
    // the Old House chimney stacks: an oh-formal room under one gets its fireplace (ART-PLAN 4.2)
    chimneys: CAMPUS_PARTS[k]!.chimneys,
    get splits() {
      return splits();
    },
  };
}

/** (artnext A1, tests only) The section order (default 0..4) and a hook that sees each section's context. */
export interface DressOrder {
  order?: readonly number[];
  onContext?: (ctx: DressContext) => void;
}

/**
 * Dresses the five sections over the built greybox: `ranges[k]` is section k's `[i0, i1)` box range (`buildSection`),
 * recoloured by `applyFinishes`; each section's dresser runs on its own context, then writes its boxes.
 */
export function dressCampus(b: LevelBuilder, lay: MapLayout, ranges: readonly (readonly [number, number])[], o: DressOrder = {}): CampusArtLayout {
  // (polish2, art P4; artnext A1) the split gaps from the bare greybox, once, before any section writes its boxes (and
  // only when a section has a tagged room): no dressing-order effect
  const tagged = TAGS.some((t) => Object.keys(t).length > 0);
  const gaps: DressContext['splits'] = tagged ? findSplitGaps(buildCoverSegments(b.boxes, b.cylinders)).map((g) => ({ a: g.a, b: g.b })) : [];
  const splits = (): DressContext['splits'] => gaps;
  const placements: ArtPlacement[] = [];
  const used = new Set<string>();
  for (const k of o.order ?? DRESSERS.map((_, i) => i)) {
    const range = ranges[k];
    if (range) applyFinishes(b.boxes, range, ROOMS[k]!, TAGS[k]!);
    const ctx = sectionContext(b, lay, k, splits);
    o.onContext?.(ctx);
    const d = new CampusDresser(b, ctx, sectionCatalogues(k));
    DRESSERS[k]!(d);
    d.write();
    for (const p of d.placements) {
      placements.push(p);
      used.add(p.cat);
    }
  }
  return { placements, catalogues: [...used].sort() };
}
