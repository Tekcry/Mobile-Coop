/**
 * Kestrel doors and windows as the game can build them today (ON9, pure, no Babylon). The editor's catalogue
 * (`src/editor/openingCatalogue.ts`) sets each opening's type and settings; this file holds the one copy of the side
 * maths both use (which side a leaf swings to, which end it hangs from) and turns the openings into the game's own
 * pieces for the editor's walk test: swing doors become `LevelBuilder.door` leaves, windows become the game's glass
 * panes (`LevelBuilder.windowAt`); sliding and glass doors stay gaps until stage DR. No number is typed here.
 */
type P2 = readonly [number, number];
interface WallLike {
  id: string;
  level: string;
  a: P2;
  b: P2;
  t: number;
}
interface RoomLike {
  id: string;
  level: string;
  rect: readonly [number, number, number, number];
}
export interface OpeningLike {
  id: string;
  wall: string;
  at: number;
  w: number;
  h: number;
  sill: number;
  type: string;
  between?: readonly string[];
  locked?: unknown;
  door?: unknown;
  glass?: unknown;
}

/** Types the game builds with its hinged door today (one leaf, or two for a double). */
export const HINGED_TYPES: ReadonlySet<string> = new Set(['door', 'fire-door', 'double']);
/** Window types: the game's glass pane (break, then climb through). */
export const WINDOW_TYPES: ReadonlySet<string> = new Set(['window', 'window-open', 'window-frosted', 'louvre', 'rooflight']);
/** Door types that open in the game only from stage DR (the walk test leaves a gap). */
export const DR_TYPES: ReadonlySet<string> = new Set(['slide-auto', 'slide-card', 'slide', 'glass-door', 'slide-gate']);

/** The words the walk test shows when the campus has a door the game cannot open yet. */
export const DR_NOTE = 'Sliding and glass doors open in the game from stage DR';

const field = (o: OpeningLike, obj: 'door' | 'glass', k: string): unknown => {
  const v = o[obj];
  return v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined;
};

function dirOf(w: WallLike): [number, number] {
  const dx = w.b[0] - w.a[0];
  const dz = w.b[1] - w.a[1];
  const L = Math.sqrt(dx * dx + dz * dz);
  return L > 1e-9 ? [dx / L, dz / L] : [1, 0];
}

/** The room on a wall's left normal side (+1) or right (-1) at `s` metres along it, by probing just past its face. */
function sideOf(w: WallLike, s: number, roomId: string, rooms: readonly RoomLike[]): 1 | -1 | 0 {
  const r = rooms.find((q) => q.id === roomId && q.level === w.level) ?? rooms.find((q) => q.id === roomId);
  if (!r) return 0;
  const d = dirOf(w);
  const off = w.t / 2 + 0.2;
  const px = w.a[0] + d[0] * s;
  const pz = w.a[1] + d[1] * s;
  const inside = (x: number, z: number): boolean => x > r.rect[0] && x < r.rect[2] && z > r.rect[1] && z < r.rect[3];
  if (inside(px - d[1] * off, pz + d[0] * off)) return 1;
  if (inside(px + d[1] * off, pz - d[0] * off)) return -1;
  return 0;
}

/**
 * Which side the leaf swings to: +1 the wall's left normal (-dz, dx), -1 the right. The room in `door.swing`, else
 * `between[1]` (schema.md); for outside, away from the room on the other side; else the left normal.
 */
export function swingSign(o: OpeningLike, w: WallLike, rooms: readonly RoomLike[]): 1 | -1 {
  const sw = field(o, 'door', 'swing');
  const room = typeof sw === 'string' ? sw : (o.between?.[1] ?? '');
  const side = room ? sideOf(w, o.at, room, rooms) : 0;
  if (side) return side;
  // outside (or not found): away from the room on the other side
  const other = o.between?.[0] === room ? (o.between?.[1] ?? '') : (o.between?.[0] ?? '');
  return other ? ((-sideOf(w, o.at, other, rooms) || 1) as 1 | -1) : 1;
}

/**
 * True when the leaf hangs (or a sliding leaf stacks) at the opening's `a` end. `side` is left / right as seen standing
 * on the side the door opens away from, facing it; absent means the `a` end (schema.md).
 */
export function hangsAtA(o: OpeningLike, w: WallLike, rooms: readonly RoomLike[], key: 'hinge' | 'stack' = 'hinge'): boolean {
  const side = field(o, 'door', key);
  if (side !== 'left' && side !== 'right') return true;
  return (side === 'left') === (leftEnd(o, w, rooms) === 'a');
}

/** The end that is on the left, seen from the side the door opens away from, facing it. */
export function leftEnd(o: OpeningLike, w: WallLike, rooms: readonly RoomLike[]): 'a' | 'b' {
  // facing f = sgn * nL; its left is -sgn * d: the a end when sgn is +1
  return swingSign(o, w, rooms) === 1 ? 'a' : 'b';
}

/** A hinged leaf for `LevelBuilder.door`. */
export interface DoorLeaf {
  id: string;
  hinge: [number, number, number];
  width: number;
  height: number;
  yaw: number;
  swing: 1 | -1;
  locked: boolean;
}
/** A glass pane for `LevelBuilder.windowAt` (centre, size, yaw whose forward is the wall's left normal). */
export interface Pane {
  id: string;
  c: [number, number, number];
  w: number;
  h: number;
  yaw: number;
  breakable: boolean;
}

/** One leaf from a hinge at `s` along the wall, closed toward `s + dir * width`, swinging to side `sgn`. */
function leaf(id: string, w: WallLike, floor: number, s: number, dir: 1 | -1, width: number, height: number, sgn: 1 | -1, locked: boolean): DoorLeaf {
  const d = dirOf(w);
  const vx = d[0] * dir;
  const vz = d[1] * dir;
  // the game turns the leaf by +swing on its yaw: its tip moves along (vz, -vx); pick the sign that heads to the swing side
  const nx = -d[1] * sgn;
  const nz = d[0] * sgn;
  const swing: 1 | -1 = vz * nx - vx * nz >= 0 ? 1 : -1;
  return { id, hinge: [w.a[0] + d[0] * s, floor, w.a[1] + d[1] * s], width, height, yaw: Math.atan2(vx, vz), swing, locked };
}

/**
 * The walk test's doors and panes from the campus: hinged types as game doors (a double as two half leaves), windows as
 * glass panes, every other type left a gap (`gaps` counts the DR types among them).
 */
export function walkOpenings(c: { levels: readonly { id: string; floor: number }[]; rooms: readonly RoomLike[]; walls: readonly WallLike[]; openings: readonly OpeningLike[] }): { doors: DoorLeaf[]; panes: Pane[]; drGaps: number } {
  const doors: DoorLeaf[] = [];
  const panes: Pane[] = [];
  let drGaps = 0;
  for (const o of c.openings) {
    const w = c.walls.find((q) => q.id === o.wall);
    const lvl = w && c.levels.find((l) => l.id === w.level);
    if (!w || !lvl) continue;
    const floor = lvl.floor + o.sill;
    const s0 = o.at - o.w / 2;
    const s1 = o.at + o.w / 2;
    if (HINGED_TYPES.has(o.type)) {
      const sgn = swingSign(o, w, c.rooms);
      const locked = o.locked === true;
      if (o.type === 'double') {
        doors.push(leaf(`${o.id}.a`, w, floor, s0, 1, o.w / 2, o.h, sgn, locked), leaf(`${o.id}.b`, w, floor, s1, -1, o.w / 2, o.h, sgn, locked));
      } else {
        const atA = hangsAtA(o, w, c.rooms);
        doors.push(leaf(o.id, w, floor, atA ? s0 : s1, atA ? 1 : -1, o.w, o.h, sgn, locked));
      }
    } else if (WINDOW_TYPES.has(o.type)) {
      const d = dirOf(w);
      const br = field(o, 'glass', 'breakable');
      panes.push({ id: o.id, c: [w.a[0] + d[0] * o.at, floor + o.h / 2, w.a[1] + d[1] * o.at], w: o.w, h: o.h, yaw: Math.atan2(-d[1], d[0]), breakable: br !== false });
    } else if (DR_TYPES.has(o.type)) drGaps++;
  }
  return { doors, panes, drGaps };
}
