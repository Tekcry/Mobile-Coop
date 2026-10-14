/**
 * ON14: door name plates and wayfinding / safety signs, pure and Babylon-free (tests/editor/signs.test.ts).
 *
 * A door's `plate` (schema.md section 2 `openings[].plate`) is its name plate text; the plate shows the access level
 * colour of the door's card level (ON9, securityCatalogue.ts) and sits on the wall beside the latch edge on the outside
 * face (the side away from the room it names) at facts `sign.plateCentre`. A sign is a `signs[]` record: on a wall face
 * or hung under a ceiling, a kind from signCatalogue.ts, its text and arrow and its size. The walk test builds both as
 * thin non-colliding panels in their colour (`walkPanels`): the game has no way to draw text on a panel (LevelBuilder's
 * only DynamicTexture is the fence wire, levelBuilder.ts:305; the detail pass's own signs are plain coloured boxes,
 * detailPass.ts:94), and a 0.02 m panel is under the light bake's CANON_MIN_THICK, as the detail pass's signs are.
 */
import facts from '../../scripts/kestrel/facts.json';
import type { Change } from './model';
import type { Campus, Elem, Opening, Pt, Room, Wall } from './types';
import { fmt, roomAt, roomsEitherSide, wallDir, wallLen, wallPoint } from './geometry';
import { ceilingOver, faceAt as lampFaceAt } from './lamps';
import { familyOf } from './openingCatalogue';
import type { DoorData } from './openingCatalogue';
import { levelColour } from './securityCatalogue';
import { buildingAt } from './visibility';
import { hangsAtA } from '../world/maps/kestrelDoors';
import type { SignPanel } from '../world/maps/kestrelCampus';
import { ARROW_WORDS, ARROWS, isWayfinding, PLATE, SIGN_F, SIGN_KINDS, signFace, signKind } from './signCatalogue';
import type { Arrow } from './signCatalogue';

export interface SignRecord {
  id: string;
  level: string;
  /** Plan point of the face's centre. */
  at: Pt;
  /** Centre height above the level's floor. */
  y: number;
  /** The way the face looks, degrees (north = +z = 0, east = 90). */
  facing: number;
  /** The wall it is fixed to, or `hang` (under the ceiling, both faces). */
  wall?: string;
  hang?: boolean;
  kind: string;
  text: string;
  arrow: Arrow;
  /** Face width and height, metres. */
  size: [number, number];
  room?: string;
  name?: string;
  [k: string]: unknown;
}

const r3 = (v: number): number => +v.toFixed(3);
const snapTo = (v: number, g: number): number => r3(Math.round(v / g) * g);
const DEG = 180 / Math.PI;
const yawOf = (nx: number, nz: number): number => (((Math.round(Math.atan2(nx, nz) * DEG) % 360) + 360) % 360);

/** Room kinds that are passed through, not named on a plate (a door names the room off the corridor). */
const THROUGH = new Set(['corridor', 'stair', 'lane', 'yard', 'zone', 'roof', 'shaft']);

export const isDoor = (o: Pick<Opening, 'type'>): boolean => familyOf(o.type) === 'door';

/** The room a door opens into (decision 5): the one that is not a corridor, stair or outside; with two, where it swings. */
export function plateRoom(d: Pick<Campus, 'rooms'>, o: Opening): Room | null {
  const ids = (o.between ?? []).filter(Boolean);
  const rooms = ids.map((id) => d.rooms.find((r) => r.id === id)).filter((r): r is Room => !!r);
  const named = rooms.filter((r) => !THROUGH.has(r.kind));
  const swing = (o.door as DoorData | undefined)?.swing;
  const pick = (list: Room[]): Room | null => list.find((r) => r.id === swing) ?? list.find((r) => r.id === o.between?.[1]) ?? list[0] ?? null;
  return named.length ? pick(named) : pick(rooms);
}

/** A plate's default text: the name of the room it opens into (its id when it has no name); '' when there is none. */
export function plateDefault(d: Pick<Campus, 'rooms'>, o: Opening): string {
  const r = plateRoom(d, o);
  return r ? r.name || r.id : '';
}

/** The plate's colour: the door's card level colour (ON9), grey with no card level. */
export const plateColour = (o: Opening): string => levelColour((o.door as DoorData | undefined)?.level ?? 0);

/** Where a door's plate goes: beside the latch edge on the outside face, at the plate height; null if it cannot fit. */
export function platePlace(d: Pick<Campus, 'rooms' | 'walls'>, o: Opening): { at: Pt; facing: number; y: number; wall: Wall } | null {
  const w = d.walls.find((q) => q.id === o.wall);
  if (!w) return null;
  const L = wallLen(w);
  const dir = wallDir(w);
  const named = plateRoom(d, o)?.id ?? '';
  const [left] = roomsEitherSide(w, o.at, d.rooms);
  // the outside is the side away from the named room: the right normal when the named room is on the left
  const side = named && left === named ? -1 : 1;
  const n: Pt = [-dir[1] * side, dir[0] * side];
  const off = o.w / 2 + SIGN_F.plateGap.value + PLATE.w / 2;
  const latchB = familyOf(o.type) === 'door' ? hangsAtA(o, w, d.rooms) : true;
  const fits = (s: number): boolean => s >= PLATE.w / 2 - 1e-6 && s <= L - PLATE.w / 2 + 1e-6;
  const first = o.at + (latchB ? off : -off);
  const second = o.at + (latchB ? -off : off);
  const s = fits(first) ? first : fits(second) ? second : null;
  if (s === null) return null;
  const p = wallPoint(w, s);
  const k = w.t / 2 + SIGN_F.panelThick.value / 2;
  return { at: [r3(p[0] + n[0] * k), r3(p[1] + n[1] * k)], facing: yawOf(n[0], n[1]), y: SIGN_F.plateCentre.value, wall: w };
}

/** Decision 9: name plates on every door of a level (or of a building, every level) that has none, in one edit. */
export function autoPlates(d: Pick<Campus, 'rooms' | 'walls' | 'openings' | 'meta'>, scope: { level?: string; building?: string }): { changes: Change[]; added: number; had: number; none: number } {
  const changes: Change[] = [];
  let had = 0;
  let none = 0;
  for (const o of d.openings) {
    if (!isDoor(o)) continue;
    const w = d.walls.find((q) => q.id === o.wall);
    if (!w) continue;
    if (scope.level && w.level !== scope.level) continue;
    if (scope.building) {
      const p = wallPoint(w, o.at);
      if (buildingAt(d.meta.buildings, p[0], p[1]) !== scope.building) continue;
    }
    if (typeof o.plate === 'string' && o.plate) {
      had++;
      continue;
    }
    const text = plateDefault(d, o);
    if (!text) {
      none++;
      continue;
    }
    changes.push({ coll: 'openings', id: o.id, before: o as Elem, after: { ...JSON.parse(JSON.stringify(o)), plate: text } as Elem });
  }
  return { changes, added: changes.length, had, none };
}

// ---------- signs ----------

/** The next free sign id (SG-1, SG-2 ...). */
export function signId(d: Pick<Campus, 'signs'>): string {
  const used = new Set((d.signs ?? []).map((s) => s.id));
  for (let n = 1; ; n++) if (!used.has(`SG-${n}`)) return `SG-${n}`;
}

/** The text list (decision 6): the buildings (by letter, then by name), Exit, Reception, Goods In, then every room name (each once). */
export function signTexts(d: Pick<Campus, 'rooms' | 'meta'>): string[] {
  const out: string[] = [];
  const add = (s: string): void => {
    if (s && !out.includes(s)) out.push(s);
  };
  // "Building B" as people say it, then the building's own name
  for (const b of d.meta.buildings ?? []) add(`Building ${b.id}`);
  for (const b of d.meta.buildings ?? []) if (b.name) add(b.name);
  add('Exit');
  add('Reception');
  add('Goods In');
  for (const r of d.rooms) if (r.name && !THROUGH.has(r.kind)) add(r.name);
  return out;
}

/** The room's ceiling height above its floor (its own, else the storey less the slab). */
function ceilingAt(d: Pick<Campus, 'levels'>, r: Room, slab: number): number {
  const c = typeof r.ceiling === 'number' ? r.ceiling : 0;
  return c > 0 ? c : r3((d.levels.find((l) => l.id === r.level)?.height ?? 0) - slab);
}

export interface SignPlace {
  sign: SignRecord | null;
  why: string | null;
  words: string;
}

/**
 * A sign of `kindId` at the dot: on the wall face in front of it (within facts sign.wallReach), else hung under the
 * room's ceiling facing the way `lookYaw` looks back (a kind that only goes on a wall says why it cannot).
 */
export function placeSign(d: Pick<Campus, 'rooms' | 'walls' | 'levels' | 'meta'>, kindId: string, level: string, x: number, z: number, grid: number, lookYaw: number, text?: string, arrow?: Arrow): SignPlace {
  const k = signKind(kindId);
  const base = { level, kind: k.id, text: text ?? k.text, arrow: arrow ?? k.arrow, size: [k.w, k.h] as [number, number] };
  const f = lampFaceAt(d.walls, level, x, z);
  if (f && f.gap <= SIGN_F.wallReach.value + 1e-6 && k.mount !== 'hang') {
    const along = Math.min(f.s1 - k.w / 2, Math.max(f.s0 + k.w / 2, snapTo(f.axis === 0 ? z : x, grid)));
    const across = r3(f.pos + f.n * (SIGN_F.panelThick.value / 2));
    const at: Pt = f.axis === 0 ? [across, r3(along)] : [r3(along), across];
    const facing = f.axis === 0 ? (f.n > 0 ? 90 : 270) : f.n > 0 ? 0 : 180;
    const room = roomAt(d.rooms, level, at[0] + (f.axis === 0 ? f.n * 0.3 : 0), at[1] + (f.axis === 1 ? f.n * 0.3 : 0));
    const sign: SignRecord = { id: '', ...base, at, y: SIGN_F.wallCentre.value, facing, wall: f.id, ...(room ? { room: room.id } : {}) };
    return { sign, why: null, words: `${k.name} "${signFace(sign.text, sign.arrow)}" on ${f.id}, ${fmt(sign.y)} m up` };
  }
  if (k.mount === 'wall') return { sign: null, why: `${k.name} goes on a wall: bring the dot to a wall face`, words: '' };
  const room = roomAt(d.rooms, level, x, z);
  if (!room) return { sign: null, why: 'A hung sign needs a room (its ceiling) over the dot', words: '' };
  // Michael 2026-10-14: the ceiling over the point as the lamps read it (a lowered roof's underside too)
  const ceil = ceilingOver(d, level, snapTo(x, grid), snapTo(z, grid)) ?? ceilingAt(d, room, facts.room.slab.value);
  const y = r3(ceil - SIGN_F.hangGap.value - k.h / 2);
  if (y - k.h / 2 < SIGN_F.hangBottomMin.value - 1e-6) return { sign: null, why: `The ceiling here (${fmt(ceil)} m) is too low: a hung sign keeps ${fmt(SIGN_F.hangBottomMin.value)} m under it`, words: '' };
  const facing = (((Math.round((lookYaw + 180) / 90) * 90) % 360) + 360) % 360;
  const sign: SignRecord = { id: '', ...base, at: [snapTo(x, grid), snapTo(z, grid)], y, facing, hang: true, room: room.id };
  return { sign, why: null, words: `${k.name} "${signFace(sign.text, sign.arrow)}" hung in ${room.name || room.id}, ${fmt(y)} m up` };
}

/** A sign moved by (dx, dz): a hung one moves freely; a wall one stays on its wall (the move along it only). */
export function moveSign(d: Pick<Campus, 'walls'>, s: SignRecord, dx: number, dz: number): SignRecord {
  const out = JSON.parse(JSON.stringify(s)) as SignRecord;
  const w = s.wall ? d.walls.find((q) => q.id === s.wall) : undefined;
  if (w && !s.hang) {
    const dir = wallDir(w);
    const t = dx * dir[0] + dz * dir[1];
    const L = wallLen(w);
    const cur = (s.at[0] - w.a[0]) * dir[0] + (s.at[1] - w.a[1]) * dir[1];
    const nt = Math.min(L - s.size[0] / 2, Math.max(s.size[0] / 2, cur + t)) - cur;
    out.at = [r3(s.at[0] + dir[0] * nt), r3(s.at[1] + dir[1] * nt)];
    return out;
  }
  out.at = [r3(s.at[0] + dx), r3(s.at[1] + dz)];
  return out;
}

export interface SignRow {
  id: string;
  label: string;
  value: string;
  kind: 'list' | 'len' | 'name' | 'id';
}

/** The card's rows: Type, then Text and Arrow (wayfinding only), height, width, Id. */
export function signRows(s: SignRecord): SignRow[] {
  const way = isWayfinding(s.kind);
  return [
    { id: 'type', label: 'Type', value: signKind(s.kind).name, kind: 'list' },
    ...(way
      ? [
          { id: 'text', label: 'Text', value: s.text, kind: 'name' as const },
          { id: 'arrow', label: 'Arrow', value: ARROW_WORDS[s.arrow] ?? s.arrow, kind: 'list' as const },
        ]
      : []),
    { id: 'y', label: 'Height', value: `${fmt(s.y)} m`, kind: 'len' },
    { id: 'width', label: 'Width', value: `${fmt(s.size[0])} m`, kind: 'len' },
    { id: 'id', label: 'Id', value: s.id, kind: 'id' },
  ];
}

const wrap = <T>(list: readonly T[], cur: T, dir: 1 | -1): T => list[(Math.max(0, list.indexOf(cur)) + dir + list.length) % list.length]!;

/** One D-pad step on a sign's card row; null when the row does not step. */
export function stepSign(d: Pick<Campus, 'rooms' | 'meta'>, s: SignRecord, row: string, dir: 1 | -1, step: number): SignRecord | null {
  const a = JSON.parse(JSON.stringify(s)) as SignRecord;
  if (row === 'type') {
    // a hung sign steps through the kinds that hang; a wall sign through them all
    const kinds = SIGN_KINDS.filter((k) => !s.hang || k.mount !== 'wall').map((k) => k.id);
    const k = signKind(wrap(kinds, s.kind, dir));
    a.kind = k.id;
    a.size = [k.w, k.h];
    if (!isWayfinding(k.id) || !isWayfinding(s.kind)) {
      a.text = k.text;
      a.arrow = k.arrow;
    }
    return a;
  }
  if (row === 'text') {
    const list = signTexts(d);
    a.text = wrap(list, s.text, dir);
    return a;
  }
  if (row === 'arrow') {
    a.arrow = wrap(ARROWS, s.arrow, dir);
    return a;
  }
  if (row === 'y') {
    a.y = Math.max(s.size[1] / 2, r3(s.y + dir * step));
    return a;
  }
  if (row === 'width') {
    const k = signKind(s.kind);
    a.size = [Math.max(step, r3(s.size[0] + dir * step)), s.size[1] || k.h];
    return a;
  }
  return null;
}

/** The card's title and size line. */
export function signWords(s: SignRecord): { title: string; size: string } {
  const k = signKind(s.kind);
  return { title: `${k.name}: ${signFace(s.text, s.arrow)}`, size: `${fmt(s.size[0])} x ${fmt(s.size[1])} m, ${s.hang ? 'hung' : `on ${s.wall ?? 'a wall'}`}, ${fmt(s.y)} m up` };
}

/** The card's foot: what the game does with it. */
export function signFoot(s: SignRecord): string {
  return `In-world text (docs/story.md writing rules). The walk test builds a thin ${s.hang ? 'hung' : 'wall'} panel in its colour, no text yet; it never collides and is not a light shape`;
}

/** The plate's card words for a door. */
export function plateWords(o: Opening): string {
  return typeof o.plate === 'string' && o.plate ? `Plate "${o.plate}" (${levelWord(o)})` : 'No name plate';
}
const levelWord = (o: Opening): string => {
  const lv = (o.door as DoorData | undefined)?.level;
  return lv ? `card level ${lv} colour` : 'grey: no card level';
};

// ---------- the walk test ----------

/** Every plate and sign as the walk test's thin panels (absolute heights from the level floors). */
export function walkPanels(d: Pick<Campus, 'rooms' | 'walls' | 'openings' | 'levels' | 'signs'>): SignPanel[] {
  const floor = (id: string): number => d.levels.find((l) => l.id === id)?.floor ?? 0;
  const t = SIGN_F.panelThick.value;
  const out: SignPanel[] = [];
  for (const o of d.openings) {
    if (typeof o.plate !== 'string' || !o.plate) continue;
    const p = platePlace(d, o);
    if (!p) continue;
    out.push({ c: [p.at[0], r3(floor(p.wall.level) + p.y), p.at[1]], s: [PLATE.w, PLATE.h, t], yaw: (p.facing * Math.PI) / 180, colour: plateColour(o) });
  }
  for (const s of d.signs ?? []) {
    const k = signKind(s.kind);
    out.push({ c: [s.at[0], r3(floor(s.level) + s.y), s.at[1]], s: [s.size[0], s.size[1], t], yaw: (s.facing * Math.PI) / 180, colour: k.bg });
  }
  return out;
}
