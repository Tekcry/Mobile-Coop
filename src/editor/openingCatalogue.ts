/**
 * Doors, windows and glass (ON9, pure): the catalogue of opening types (name, family, default size, leaf, the settings
 * that apply), the realistic defaults per type, the settings in words and one step of a setting. Babylon- and DOM-free
 * (tests/editor/openingCatalogue.test.ts). The data: `openings[].type`, an optional `openings[].door` (door settings)
 * and `openings[].glass` (glass settings), and `walls[].glass` on a wall of kind `glass` (schema.md section 2). An
 * absent setting means the type's default, so files written before ON9 read the same. Stage DR builds the behaviour.
 */
import facts from '../../scripts/kestrel/facts.json';
import { leftEnd } from '../world/maps/kestrelDoors';
import type { Opening, Room, Wall } from './types';

export type Family = 'door' | 'window';
/** What fills the opening: a solid leaf, glass, a mesh (gates), or nothing (an arch). */
export type Leaf = 'solid' | 'glass' | 'mesh' | 'none';
/** How it moves: swing (one hinged leaf), double, slide, roll (a shutter), none (an arch or a fixed pane), hung, louvre. */
export type Motion = 'swing' | 'double' | 'slide' | 'roll' | 'none' | 'hung' | 'louvre';
export type Setting = 'hinge' | 'stack' | 'swing' | 'oneWay' | 'locked' | 'reader' | 'level' | 'closer' | 'alarmed' | 'vision' | 'glass' | 'blinds' | 'breakable' | 'opens';

export interface CatEntry {
  id: string;
  name: string;
  family: Family;
  leaf: Leaf;
  motion: Motion;
  w: number;
  h: number;
  sill: number;
  /** The settings the card shows for this type, in card order. */
  settings: readonly Setting[];
  /** Michael 2026-10-14: one kind in other versions (the carousel's versions: D-pad up / down). */
  series?: string;
  /** Where the size comes from. */
  src: string;
}

const F = facts.door;
const SWING_SET: readonly Setting[] = ['hinge', 'swing', 'oneWay', 'locked', 'reader', 'level', 'closer', 'alarmed', 'vision'];
const GLASS_SWING: readonly Setting[] = ['hinge', 'swing', 'oneWay', 'locked', 'reader', 'level', 'closer', 'alarmed', 'glass', 'breakable'];
const GLASS_SLIDE: readonly Setting[] = ['stack', 'oneWay', 'locked', 'reader', 'level', 'alarmed', 'glass', 'breakable'];
const WINDOW_SET: readonly Setting[] = ['glass', 'blinds', 'breakable', 'opens'];
const EDITOR = 'editor default: typical product';

/** Every opening type, doors first (the Openings tab's order; the card's Type row flips within a family in this order). */
export const CATALOGUE: readonly CatEntry[] = [
  { id: 'door', name: 'Single door', family: 'door', leaf: 'solid', motion: 'swing', w: F.singleWidth.value, h: F.singleHeight.value, sill: 0, settings: SWING_SET, src: `facts door.singleWidth, singleHeight (${F.singleWidth.src})` },
  { id: 'fire-door', name: 'Fire door', family: 'door', leaf: 'solid', motion: 'swing', w: facts.stair.fireDoorWidth.value, h: F.singleHeight.value, sill: 0, settings: SWING_SET, src: `facts stair.fireDoorWidth, door.singleHeight (${facts.stair.fireDoorWidth.src})` },
  { id: 'double', name: 'Double door', family: 'door', leaf: 'solid', motion: 'double', w: F.doubleWidthA.value, h: F.singleHeight.value, sill: 0, settings: ['swing', 'oneWay', 'locked', 'reader', 'level', 'closer', 'alarmed', 'vision'], src: `facts door.doubleWidthA (${F.doubleWidthA.src})` },
  { id: 'glass-door', name: 'Glass swing door', family: 'door', leaf: 'glass', motion: 'swing', w: F.singleWidth.value, h: F.singleHeight.value, sill: 0, settings: GLASS_SWING, src: `facts door.singleWidth, singleHeight (${F.singleWidth.src})` },
  { id: 'slide-auto', name: 'Sliding glass door (automatic)', series: 'slide-glass', family: 'door', leaf: 'glass', motion: 'slide', w: F.doubleWidthB.value, h: F.singleHeight.value, sill: 0, settings: GLASS_SLIDE, src: `facts door.doubleWidthB (${F.doubleWidthB.src}): a two-leaf automatic slider's clear width` },
  { id: 'slide-card', name: 'Sliding glass door (card)', series: 'slide-glass', family: 'door', leaf: 'glass', motion: 'slide', w: F.doubleWidthB.value, h: F.singleHeight.value, sill: 0, settings: GLASS_SLIDE, src: `facts door.doubleWidthB (${F.doubleWidthB.src})` },
  { id: 'slide', name: 'Sliding door (manual)', family: 'door', leaf: 'solid', motion: 'slide', w: F.singleWidth.value, h: F.singleHeight.value, sill: 0, settings: ['stack', 'locked', 'reader', 'level', 'alarmed', 'vision'], src: `facts door.singleWidth (${F.singleWidth.src})` },
  { id: 'roller', name: 'Roller shutter', family: 'door', leaf: 'solid', motion: 'roll', w: F.rollerWidth.value, h: F.rollerHeight.value, sill: 0, settings: ['locked', 'reader', 'level', 'alarmed'], src: `facts door.rollerWidth, rollerHeight (${F.rollerWidth.src})` },
  { id: 'gate', name: 'Gate', family: 'door', leaf: 'mesh', motion: 'swing', w: F.singleWidth.value, h: 2.4, sill: 0, settings: ['hinge', 'swing', 'oneWay', 'locked', 'reader', 'level', 'closer', 'alarmed'], src: `facts door.singleWidth; height ${EDITOR} (a pedestrian gate in a 2.4 m fence, P03B 2d-2b)` },
  { id: 'slide-gate', name: 'Sliding gate', family: 'door', leaf: 'mesh', motion: 'slide', w: F.wideOpeningMax.value + F.wideOpeningMin.value, h: 2.4, sill: 0, settings: ['stack', 'locked', 'reader', 'level', 'alarmed'], src: `facts door.wideOpeningMin + wideOpeningMax (${F.wideOpeningMax.src}): a vehicle gate; height ${EDITOR}` },
  { id: 'hatch', name: 'Hatch', family: 'door', leaf: 'solid', motion: 'swing', w: 0.9, h: 0.9, sill: 0, settings: ['hinge', 'swing', 'locked', 'alarmed'], src: `${EDITOR} (an access hatch; a floor or ceiling hatch is a Floor hole until stage DR)` },
  { id: 'arch', name: 'Arch (no leaf)', family: 'door', leaf: 'none', motion: 'none', w: F.singleWidth.value, h: F.singleHeight.value, sill: 0, settings: [], src: `facts door.singleWidth, singleHeight (${F.singleWidth.src})` },
  { id: 'window', name: 'Fixed window', series: 'fixed-window', family: 'window', leaf: 'glass', motion: 'none', w: 1.2, h: 1.2, sill: 0.9, settings: WINDOW_SET, src: EDITOR },
  { id: 'window-open', name: 'Opening window (top hung)', family: 'window', leaf: 'glass', motion: 'hung', w: 1.2, h: 1.2, sill: 0.9, settings: WINDOW_SET, src: EDITOR },
  { id: 'window-frosted', name: 'Frosted fixed window', series: 'fixed-window', family: 'window', leaf: 'glass', motion: 'none', w: 1.2, h: 1.2, sill: 0.9, settings: WINDOW_SET, src: EDITOR },
  { id: 'louvre', name: 'Louvre window', family: 'window', leaf: 'glass', motion: 'louvre', w: 0.9, h: 0.9, sill: 1.2, settings: WINDOW_SET, src: EDITOR },
  { id: 'rooflight', name: 'Roof light', family: 'window', leaf: 'glass', motion: 'none', w: 1.2, h: 0.6, sill: 2.2, settings: WINDOW_SET, src: `${EDITOR} (high in the wall under the roof; a glazed hole in a roof slab is the Floor hole tool's Roof light)` },
];

const BY_ID = new Map(CATALOGUE.map((c) => [c.id, c]));
/** The entry for a type; an unknown type (a `grille` from an older file) reads as a single door with no settings. */
export function catEntry(type: string): CatEntry {
  return BY_ID.get(type) ?? { ...BY_ID.get('door')!, id: type, name: type, settings: [] };
}
export const familyOf = (type: string): Family => catEntry(type).family;
export const familyTypes = (f: Family): string[] => CATALOGUE.filter((c) => c.family === f).map((c) => c.id);
export const isGlassLeaf = (type: string): boolean => catEntry(type).leaf === 'glass';

export const READERS = ['none', 'card', 'card-pin', 'keypad', 'key-switch'] as const;
export type Reader = (typeof READERS)[number];
export const GLASS_KINDS = ['clear', 'frosted', 'wired', 'tinted'] as const;
export type GlassKind = (typeof GLASS_KINDS)[number];
export const BLINDS = ['none', 'open', 'half', 'closed'] as const;
export type Blinds = (typeof BLINDS)[number];
export const READER_WORDS: Record<Reader, string> = { none: 'None', card: 'Card', 'card-pin': 'Card and PIN', keypad: 'Keypad', 'key-switch': 'Key switch' };
/** Card access levels (S0 2.3), 0-5. */
export const LEVELS = [0, 1, 2, 3, 4, 5] as const;

/** `openings[].door`: every field optional (absent = the type's default). */
export interface DoorData {
  /** Hinge side, seen from the side the door opens away from, facing it. */
  hinge?: 'left' | 'right';
  /** A sliding leaf's stack side, seen as the hinge is. */
  stack?: 'left' | 'right';
  /** The room id the leaf swings into ('' = outside). */
  swing?: string;
  /** The room id of the side that opens freely (push bar); the other side needs the key or card, or cannot open. */
  oneWay?: string;
  reader?: Reader;
  /** Card access level 0-5 (S0 2.3). */
  level?: number;
  closer?: boolean;
  alarmed?: boolean;
  /** A glass vision panel in a solid leaf. */
  vision?: boolean;
}
/** `openings[].glass` and `walls[].glass`. */
export interface GlassData {
  kind?: GlassKind;
  blinds?: Blinds;
  breakable?: boolean;
  /** Windows: it opens (an opening big enough per the facts can be climbed through). */
  opens?: boolean;
}

/** Room context for the side settings. */
export interface SideCtx {
  wall?: Wall;
  rooms?: readonly Room[];
}

const OUTSIDE_KINDS = new Set(['lane', 'yard', 'roof']);
/** The "inner" room of an opening: a stair first, else the one that is not outside. */
function innerRoom(between: readonly string[], rooms: readonly Room[]): string {
  const [a = '', b = ''] = between;
  const ra = rooms.find((r) => r.id === a);
  const rb = rooms.find((r) => r.id === b);
  const stairy = (r?: Room): boolean => !!r && (r.kind === 'stair' || /stair/i.test(r.name ?? ''));
  if (stairy(ra) !== stairy(rb)) return stairy(ra) ? a : b;
  const out = (r?: Room): boolean => !r || OUTSIDE_KINDS.has(r.kind);
  if (out(ra) !== out(rb)) return out(ra) ? b : a;
  return b;
}

/** The other side of an opening from `room`. */
export function otherSide(between: readonly string[], room: string): string {
  const [a = '', b = ''] = between;
  return room === a ? b : a;
}

/** One-way: the side that opens freely is the one the leaf swings away from (push to exit). */
export const oneWayFromSwing = (between: readonly string[], swingRoom: string): string => otherSide(between, swingRoom);

/** The settings a type starts with when placed (realistic per type, ON9 decision 5). */
export function typeDefaults(type: string, between: readonly string[], rooms: readonly Room[]): { door?: DoorData; glass?: GlassData; locked?: boolean } {
  const e = catEntry(type);
  const has = (s: Setting): boolean => e.settings.includes(s);
  const out: { door?: DoorData; glass?: GlassData; locked?: boolean } = {};
  if (e.family === 'door' && e.settings.length) {
    const d: DoorData = {};
    const inner = innerRoom(between, rooms);
    if (has('swing')) d.swing = between[1] ?? '';
    if (has('stack')) d.stack = 'left';
    if (has('reader')) d.reader = type === 'roller' ? 'key-switch' : type === 'slide-card' ? 'card' : 'none';
    if (has('closer')) d.closer = type === 'fire-door' || type === 'double' || type === 'glass-door';
    if (has('alarmed')) d.alarmed = type === 'fire-door';
    if (has('vision')) d.vision = type === 'double';
    if (type === 'fire-door') {
      // fire doors: free from the stair (or the inside) out, swinging the way people escape
      d.oneWay = inner;
      d.swing = otherSide(between, inner);
    }
    if (type === 'slide-card') {
      const rings = between.map((id) => rooms.find((r) => r.id === id)?.ring).filter((v): v is number => typeof v === 'number');
      d.level = rings.length ? Math.max(...rings) : 2;
      out.locked = true;
    }
    out.door = d;
  }
  if (e.leaf === 'glass') {
    const g: GlassData = { kind: type === 'window-frosted' ? 'frosted' : type === 'rooflight' ? 'wired' : 'clear', breakable: true };
    if (e.family === 'window') {
      g.blinds = 'none';
      g.opens = type === 'window-open' || type === 'louvre';
    }
    out.glass = g;
  }
  return out;
}

/** The glass settings of a wall of kind `glass` when it has none. */
export const GLASS_WALL_DEFAULT: Required<Pick<GlassData, 'kind' | 'blinds' | 'breakable'>> = { kind: 'clear', blinds: 'none', breakable: true };

const obj = <T>(v: unknown): T => (v && typeof v === 'object' ? (v as T) : ({} as T));

/** An opening's settings with its type's defaults filled in. */
export function effective(o: Opening, rooms: readonly Room[]): { door: DoorData; glass: GlassData; locked: boolean } {
  const def = typeDefaults(o.type, o.between ?? [], rooms);
  return { door: { ...def.door, ...obj<DoorData>(o.door) }, glass: { ...def.glass, ...obj<GlassData>(o.glass) }, locked: o.locked === true };
}

/** The settings the card shows: the type's, and Card level only with a card reader. */
export function shownSettings(o: Opening, rooms: readonly Room[]): Setting[] {
  const e = catEntry(o.type);
  const r = effective(o, rooms).door.reader;
  return e.settings.filter((s) => s !== 'level' || r === 'card' || r === 'card-pin');
}

/** Frosted glass or closed blinds block sight but pass light (bible 5.1; the game from stage DR). */
export const blocksSight = (g: GlassData): boolean => g.kind === 'frosted' || g.blinds === 'closed';

const roomWord = (id: string, rooms: readonly Room[]): string => (id ? (rooms.find((r) => r.id === id)?.name || id) : 'Outside');
const yn = (b: boolean | undefined): string => (b ? 'yes' : 'no');
const cap = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export const SETTING_LABELS: Record<Setting, string> = { hinge: 'Hinge', stack: 'Slides to', swing: 'Swings into', oneWay: 'One-way', locked: 'Locked', reader: 'Reader', level: 'Card level', closer: 'Self-closing', alarmed: 'Alarmed', vision: 'Vision panel', glass: 'Glass', blinds: 'Blinds', breakable: 'Breakable', opens: 'Opens' };
export const FLAG_SETTINGS: ReadonlySet<Setting> = new Set(['locked', 'closer', 'alarmed', 'vision', 'breakable', 'opens']);

/** A setting's value in words. */
export function settingWords(o: Opening, s: Setting, c: SideCtx): string {
  const rooms = c.rooms ?? [];
  const { door, glass, locked } = effective(o, rooms);
  switch (s) {
    case 'hinge':
    case 'stack': {
      const v = door[s];
      if (v) return cap(v);
      // absent: the a end (schema.md), in the left / right words when the wall is known
      return c.wall ? (leftEnd(o, c.wall, rooms) === 'a' ? 'Left' : 'Right') : 'Left';
    }
    case 'swing':
      return roomWord(door.swing ?? o.between?.[1] ?? '', rooms);
    case 'oneWay':
      return door.oneWay === undefined ? 'no' : `free from ${roomWord(door.oneWay, rooms)}`;
    case 'locked':
      return yn(locked);
    case 'reader':
      return READER_WORDS[door.reader ?? 'none'];
    case 'level':
      return door.level === undefined ? 'none' : `Level ${door.level}`;
    case 'closer':
    case 'alarmed':
    case 'vision':
      return yn(door[s]);
    case 'glass':
      return cap(glass.kind ?? 'clear');
    case 'blinds':
      return cap(glass.blinds ?? 'none');
    case 'breakable':
    case 'opens':
      return yn(glass[s]);
  }
}

const wrap = <T>(list: readonly T[], cur: T, dir: number): T => list[(Math.max(0, list.indexOf(cur)) + dir + list.length) % list.length]!;

/** One step of a setting: the opening after it (a new object), or null when nothing changes. */
export function stepSetting(o: Opening, s: Setting, dir: 1 | -1, c: SideCtx): Opening | null {
  const rooms = c.rooms ?? [];
  const eff = effective(o, rooms);
  const a = JSON.parse(JSON.stringify(o)) as Opening;
  const door = (): DoorData => (a.door = { ...obj<DoorData>(a.door) }) as DoorData;
  const glass = (): GlassData => (a.glass = { ...obj<GlassData>(a.glass) }) as GlassData;
  const between = o.between ?? [];
  switch (s) {
    case 'hinge':
    case 'stack': {
      const cur = settingWords(o, s, c) === 'Right' ? 'right' : 'left';
      door()[s] = cur === 'left' ? 'right' : 'left';
      break;
    }
    case 'swing': {
      const sides = [between[0] ?? '', between[1] ?? ''];
      if (sides[0] === sides[1]) return null;
      door().swing = otherSide(sides, eff.door.swing ?? sides[1]!);
      break;
    }
    case 'oneWay': {
      // none, then each side
      const list = ['-', between[0] ?? '', between[1] ?? ''];
      const next = wrap(list, eff.door.oneWay ?? '-', dir);
      if (next === '-') delete door().oneWay;
      else door().oneWay = next;
      break;
    }
    case 'locked':
      a.locked = !eff.locked;
      break;
    case 'reader':
      door().reader = wrap(READERS, eff.door.reader ?? 'none', dir);
      break;
    case 'level':
      door().level = wrap<number>(LEVELS, eff.door.level ?? 0, dir);
      break;
    case 'closer':
    case 'alarmed':
    case 'vision':
      door()[s] = !eff.door[s];
      break;
    case 'glass':
      glass().kind = wrap(GLASS_KINDS, eff.glass.kind ?? 'clear', dir);
      break;
    case 'blinds':
      glass().blinds = wrap(BLINDS, eff.glass.blinds ?? 'none', dir);
      break;
    case 'breakable':
    case 'opens':
      glass()[s] = !eff.glass[s];
      break;
  }
  return JSON.stringify(a) === JSON.stringify(o) ? null : a;
}

/**
 * The opening as another type of its family (the card's Type row): the new type's defaults, keeping the hinge, swing,
 * stack, one-way, lock and card level already set where the new type has them. Sizes stay.
 */
export function withOpeningType(o: Opening, type: string, rooms: readonly Room[]): Opening {
  const a = JSON.parse(JSON.stringify(o)) as Opening;
  a.type = type;
  const e = catEntry(type);
  const def = typeDefaults(type, o.between ?? [], rooms);
  const old = obj<DoorData>(o.door);
  delete a.door;
  delete a.glass;
  if (def.door) {
    const d: DoorData = { ...def.door };
    // a fire door keeps its own swing and one-way (out from the stair or the inside)
    const keep = type === 'fire-door' ? (['hinge', 'level'] as const) : (['hinge', 'stack', 'swing', 'oneWay', 'level'] as const);
    for (const k of keep) if (old[k] !== undefined && e.settings.includes(k)) (d as Record<string, unknown>)[k] = old[k];
    a.door = d;
  }
  if (def.glass) a.glass = { ...def.glass, ...(isGlassLeaf(o.type) ? { kind: obj<GlassData>(o.glass).kind ?? def.glass.kind } : {}) };
  if (def.locked !== undefined && o.locked !== true) a.locked = def.locked;
  return a;
}

/** Plain words for a door or glass settings change (the review log). */
export function settingsChangeWords(before: unknown, after: unknown): string {
  const a = obj<Record<string, unknown>>(before);
  const b = obj<Record<string, unknown>>(after);
  const parts: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
    const label = (SETTING_LABELS[k as Setting] ?? (k === 'kind' ? 'Glass' : k)).toLowerCase();
    const v = b[k];
    parts.push(v === undefined ? `${label} cleared` : typeof v === 'boolean' ? `${label} ${v ? 'on' : 'off'}` : k === 'reader' ? `${label} ${READER_WORDS[v as Reader] ?? String(v)}` : k === 'level' ? `card level ${String(v)}` : `${label} ${v === '' ? 'outside' : String(v)}`);
  }
  return parts.join(', ');
}
