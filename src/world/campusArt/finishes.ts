/**
 * Campus finishes (sector-redesign ART-KIT step 4, ART-PLAN 3.4; pure): the material half of the kit. Recolours the
 * greybox boxes of a section by room tag and role (floor, wall, ceiling slab), so `?gfx=min` and a failed art load look
 * like the final palette (AS5). Only `BoxPiece.color` changes: never a footstep surface (`b.surface`), a size, a flag or a
 * light, so the canonical light hash, collision, cover and nav are the same (a test).
 *
 * Roles, by size: a floor is `sy <= 0.45 && sx * sz >= 4` with its top at the room's floor and inside the room; a wall
 * `sy >= 2 && min(sx, sz) <= 0.45` standing on the room's storey within 0.35 of its edge; a ceiling the `overhead` slab
 * over the room. Glass and collision-only boxes are left alone; a box bigger than the room (the site's ground, a whole
 * storey slab) is no room's finish.
 *
 * The surface each colour gives through `pieceKind` (by colour; a floor's footstep surface, where one is marked, still
 * decides its texture) is `FINISH_KIND`, held by a test: walls plaster (offices, lobbies, Old House corridors), concrete
 * (labs, plant, data hall: painted block), wood (Old House panelling), brick (Old House service wing); floors and ceilings
 * concreteFloor or wood (oak).
 */
import type { SurfaceKind } from '../surfaceAtlas';
import type { RoomDef } from '../rooms';
import type { BoxPiece } from '../levelBuilder';
import type { ArtTag } from './artTags';

type Finish = { floor?: string; wall?: string; ceiling?: string };

const CARPET = '#4a4d52';
const PLASTER = '#c9bfa8';
const CEIL = '#d9d9d4';
const VINYL = '#8b8780';
const TERRAZZO = '#c8c3b8';
const SEALED = '#8e9295';
const BLOCK = '#a5a29b';
const EPOXY = '#7d8a80';
const LAB_WALL = '#dfe2e0';
const RAISED = '#9a9ea2';
const HALL_WALL = '#9a9c9e';
const OAK = '#6b4a2b';
const OH_PLASTER = '#cbbf9f';
const QUARRY = '#7d6a55';
const BRICK = '#9a5440';
const ASPHALT = '#3a3c3e';
const PAVING = '#7a756c';
const MEMBRANE = '#5d6265';

const office: Finish = { floor: CARPET, wall: PLASTER, ceiling: CEIL };
const lab: Finish = { floor: EPOXY, wall: LAB_WALL, ceiling: '#e2e4e2' };
const plant: Finish = { floor: SEALED, wall: BLOCK };
const hall: Finish = { floor: RAISED, wall: HALL_WALL };
const formal: Finish = { floor: OAK, wall: OAK };
const service: Finish = { floor: QUARRY, wall: BRICK };

/** Floor / wall / ceiling colours per tag (sRGB hex). */
export const CAMPUS_FINISH: Readonly<Record<ArtTag, Finish>> = {
  'office-open': office,
  'office-cell': office,
  kitchen: { floor: VINYL, wall: '#d6d1c4', ceiling: CEIL },
  reception: { floor: TERRAZZO, wall: '#d2c8b0', ceiling: CEIL },
  atrium: { floor: TERRAZZO, wall: '#d2c8b0', ceiling: CEIL },
  lobby: { floor: TERRAZZO, wall: PLASTER, ceiling: CEIL },
  corridor: { floor: '#5a5d61', wall: PLASTER, ceiling: CEIL },
  mailroom: { floor: VINYL, wall: '#b8b4aa' },
  store: { floor: VINYL, wall: '#b8b4aa' },
  plant,
  security: office,
  gatehouse: office,
  'lab-hall': lab,
  'lab-clean': lab,
  'lab-gown': lab,
  'lab-store': lab,
  dock: plant,
  'data-hall': hall,
  cage: hall,
  noc: { floor: RAISED, wall: PLASTER, ceiling: CEIL },
  ups: plant,
  battery: plant,
  riser: plant,
  mantrap: hall,
  'oh-formal': formal,
  'oh-hall': formal,
  'oh-corridor': { floor: OAK, wall: OH_PLASTER },
  'oh-service': service,
  'oh-kitchen': service,
  'oh-archive': { floor: OAK, wall: OH_PLASTER },
  'oh-control': { floor: CARPET, wall: OH_PLASTER },
  'oh-ante': formal,
  strongroom: { floor: SEALED, wall: '#7c7f82' },
  'ext-verge': {},
  'ext-road': { floor: ASPHALT },
  'ext-carpark': { floor: ASPHALT },
  'ext-service': { floor: ASPHALT },
  'ext-shelter': { floor: PAVING },
  'ext-forecourt': { floor: PAVING },
  'ext-compound': { floor: ASPHALT },
  'ext-garden': {},
  'ext-terrace': { floor: PAVING },
  'ext-jetty': {},
  roof: { floor: MEMBRANE },
  'roof-plant': { floor: MEMBRANE },
  none: {},
};

/** The surface `pieceKind` gives each finish colour (by colour alone; walls at 3 m, floors and ceilings as slabs). */
export const FINISH_KIND: Readonly<Record<string, { wall?: SurfaceKind; slab: SurfaceKind }>> = {
  [CARPET]: { slab: 'concreteFloor' },
  [PLASTER]: { wall: 'plaster', slab: 'plaster' },
  [CEIL]: { slab: 'concreteFloor' },
  [VINYL]: { slab: 'concreteFloor' },
  [TERRAZZO]: { slab: 'concreteFloor' },
  [SEALED]: { slab: 'concreteFloor' },
  [BLOCK]: { wall: 'concrete', slab: 'concreteFloor' },
  [EPOXY]: { slab: 'concreteFloor' },
  [LAB_WALL]: { wall: 'concrete', slab: 'concreteFloor' },
  ['#e2e4e2']: { slab: 'concreteFloor' },
  [RAISED]: { slab: 'concreteFloor' },
  [HALL_WALL]: { wall: 'concrete', slab: 'concreteFloor' },
  [OAK]: { wall: 'wood', slab: 'wood' },
  [OH_PLASTER]: { wall: 'plaster', slab: 'plaster' },
  [QUARRY]: { slab: 'concreteFloor' },
  [BRICK]: { wall: 'brick', slab: 'corrugated' },
  [ASPHALT]: { slab: 'concreteFloor' },
  [PAVING]: { slab: 'concreteFloor' },
  [MEMBRANE]: { slab: 'concreteFloor' },
  ['#d6d1c4']: { wall: 'concrete', slab: 'concreteFloor' },
  ['#d2c8b0']: { wall: 'plaster', slab: 'plaster' },
  ['#b8b4aa']: { wall: 'concrete', slab: 'concreteFloor' },
  ['#7c7f82']: { wall: 'concrete', slab: 'concreteFloor' },
  ['#5a5d61']: { slab: 'concreteFloor' },
};

/** Recolours the boxes `range[0] .. range[1] - 1` by their rooms' tags; returns how many changed colour. */
export function applyFinishes(boxes: BoxPiece[], range: readonly [number, number], rooms: readonly RoomDef[], tags: Readonly<Record<string, ArtTag>>): number {
  let n = 0;
  const end = Math.min(range[1], boxes.length);
  for (let i = Math.max(0, range[0]); i < end; i++) {
    const b = boxes[i]!;
    if (b.glass || b.visible === false || b.detail) continue;
    const quarter = Math.abs(b.yaw - Math.round(b.yaw / (Math.PI / 2)) * (Math.PI / 2)) < 1e-3 && Math.abs(b.pitch) < 1e-6;
    if (!quarter) continue;
    const odd = Math.round(b.yaw / (Math.PI / 2)) % 2 !== 0;
    const sx = odd ? b.s[2] : b.s[0];
    const sz = odd ? b.s[0] : b.s[2];
    const sy = b.s[1];
    const bot = b.c[1] - sy / 2;
    const top = b.c[1] + sy / 2;
    let color: string | undefined;
    for (const r of rooms) {
      const f = CAMPUS_FINISH[tags[r.id] ?? 'none'];
      const floor = r.minY ?? 0;
      const inside = (m: number): boolean => b.c[0] >= r.minX - m && b.c[0] <= r.maxX + m && b.c[2] >= r.minZ - m && b.c[2] <= r.maxZ + m;
      const fits = sx <= r.maxX - r.minX + 1.0 && sz <= r.maxZ - r.minZ + 1.0;
      if (f.floor && sy <= 0.45 && sx * sz >= 4 && !b.overhead && Math.abs(top - floor) <= 0.05 && inside(0) && fits) color = f.floor;
      else if (f.wall && sy >= 2 && Math.min(sx, sz) <= 0.45 && bot >= floor - 0.1 && bot <= floor + 0.5 && inside(0.35)) color = f.wall;
      else if (f.ceiling && b.overhead && bot >= floor + 2 && bot <= floor + 8 && inside(0) && fits) color = f.ceiling;
      if (color) break;
    }
    if (color && color !== b.color) {
      b.color = color;
      n++;
    }
  }
  return n;
}
