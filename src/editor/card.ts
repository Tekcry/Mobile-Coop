/**
 * The selection card on the D-pad (ON0a decision 4), pure: the editable rows of a selected element (Type first, then
 * its own fields) and one step of a row. Up / down picks a row, left / right steps it: lengths by the fine grid
 * (meta.objectGrid, 0.1 m), lists by one entry (wrapping), flags on / off. Babylon- and DOM-free
 * (tests/editor/card.test.ts); padControl.ts commits the result (quick steps on one row merge into one undo step).
 */
import { fmt, normRect, wallLen } from './geometry';
import { DOOR_NAMES, ROOM_KINDS, WALL_KINDS } from './ops';
import { BLINDS, familyOf, familyTypes, FLAG_SETTINGS, GLASS_KINDS, GLASS_WALL_DEFAULT, SETTING_LABELS, settingWords, shownSettings, stepSetting, withOpeningType } from './openingCatalogue';
import type { GlassData, Setting, SideCtx } from './openingCatalogue';
import { HOLE_KINDS, HOLE_NAMES, STAIR_FACTS, STAIR_TYPES, stairType, stairTypeOf, withStairType } from './vertical';
import type { Coll, Elem, Ladder, Opening, Pt, Rect, Roof, Room, Stair, Void, Wall } from './types';
import { ROOF_LABELS, ROOF_TYPES, roofSettingWords, roofType, shownRoofSettings, stepRoofSetting, withRoofType } from './roofGeometry';
import type { RoofSetting } from './roofGeometry';
import { stepPreset, turnObject } from './objects';
import { presetOf } from './catalogue';
import type { Campus, Ext, Obj } from './types';
import { pieceRows, stepPiece } from './climb';
import { finishOf } from './climbCatalogue';
import { stepFinish } from './finishes';
import { lampRows, stepLamp } from './lamps';
import type { Lamp, LampData } from './lamps';
import { fittingOf } from './lightCatalogue';
import { EMPLOYERS, GUARD_KINDS, guardKind, HIDE_KINDS, hideKind, JOBS, OBJECTIVE_KINDS, objectiveKind, ROSTER } from './missionCatalogue';
import type { Guard, Hide, Objective } from './mission';
import { deviceRows, deviceType, stepDevice } from './security';
import type { Device, SecData } from './security';
import { ceilingRows, crawlRows, stepCeiling, stepCrawl } from './ceilings';
import type { Ceiling, CrawlRecord } from './ceilings';
import { isDoor, plateDefault, signRows, signTexts, stepSign } from './signs';
import type { SignRecord } from './signs';

/** ON8: a guard's card: Type (the game's guard kind), Role (the brief's roster: name, employer and job), Employer, Job. */
function guardRows(g: Guard): CardRow[] {
  const role = ROSTER.find((r) => r.name === g.name);
  return [
    { id: 'type', label: 'Type', value: guardKind(g.kind).name, kind: 'list' },
    { id: 'role', label: 'Role', value: role?.name ?? '(own)', kind: 'list' },
    { id: 'employer', label: 'Employer', value: g.employer || '(none)', kind: 'list' },
    { id: 'job', label: 'Job', value: g.job || '(none)', kind: 'list' },
  ];
}

/** ON8: one step of a mission record's own rows (null: nothing to step). */
function stepMissionRow(coll: Coll, e: Elem, row: string, dir: 1 | -1): Elem | null {
  if (coll === 'guards') {
    const g = e as unknown as Guard;
    if (row === 'type') return { ...g, kind: wrap(GUARD_KINDS.map((k) => k.id), g.kind, dir) } as unknown as Elem;
    if (row === 'role') {
      const i = ROSTER.findIndex((r) => r.name === g.name);
      const r = ROSTER[(i < 0 ? (dir > 0 ? 0 : ROSTER.length - 1) : (i + dir + ROSTER.length) % ROSTER.length)]!;
      return { ...g, name: r.name, employer: r.employer, job: r.job } as unknown as Elem;
    }
    if (row === 'employer') return { ...g, employer: wrap(EMPLOYERS, g.employer, dir) } as unknown as Elem;
    if (row === 'job') return { ...g, job: wrap(JOBS, g.job, dir) } as unknown as Elem;
    return null;
  }
  if (coll === 'objectives') {
    const o = e as unknown as Objective;
    if (row === 'type') return { ...o, kind: wrap(OBJECTIVE_KINDS.map((k) => k.id), o.kind, dir) } as unknown as Elem;
    if (row === 'order') return o.order + dir < 1 ? null : ({ ...o, order: o.order + dir } as unknown as Elem);
    if (row === 'optional') return { ...o, optional: !o.optional } as unknown as Elem;
    return null;
  }
  if (coll === 'hides' && row === 'type') return { ...(e as unknown as Hide), kind: wrap(HIDE_KINDS.map((k) => k.id), (e as unknown as Hide).kind, dir) } as unknown as Elem;
  return null;
}

/** ON4: an object's card: Type (the preset), Name, size, height, base, turn, see-through, no ledge. */
function objectRows(o: Obj): CardRow[] {
  return [
    { id: 'type', label: 'Type', value: presetOf(o.preset)?.name ?? 'Object', kind: 'list' },
    nameRow(o),
    ...sizeRows(o.rect),
    { id: 'h', label: 'Height', value: m(o.h), kind: 'len' },
    { id: 'y', label: 'Base', value: m(o.y), kind: 'len' },
    { id: 'yaw', label: 'Turn', value: `${o.yaw ?? 0} degrees`, kind: 'list' },
    { id: 'seeThrough', label: 'See-through', value: o.seeThrough ? 'yes' : 'no', kind: 'flag' },
    { id: 'noLedge', label: 'No ledge', value: o.noLedge ? 'yes' : 'no', kind: 'flag' },
    idRow(o),
  ];
}

/** ON4: one D-pad step on an object's own rows (size rows, name and id are the shared ones). */
function stepObjectRow(o: Obj, row: string, dir: 1 | -1, step: number): Obj | null {
  const a: Obj = { ...o };
  if (row === 'type') return stepPreset(o, dir);
  if (row === 'yaw') {
    let t = o;
    for (let i = 0; i < (dir > 0 ? 1 : 3); i++) t = turnObject(t, step);
    return t;
  }
  if (row === 'h') a.h = Math.max(step, r3(o.h + dir * step));
  else if (row === 'y') a.y = Math.max(0, r3(o.y + dir * step));
  else if (row === 'seeThrough') {
    if (o.seeThrough) delete a.seeThrough;
    else a.seeThrough = true;
  } else if (row === 'noLedge') a.noLedge = !o.noLedge;
  else return null;
  return a;
}

/** ON10: the roof settings that are lengths and flags (the rest step through a list or by a degree). */
const ROOF_LEN: ReadonlySet<string> = new Set(['parapet', 'upstand', 'tooth', 'rise', 'overhang', 'fascia']);
const ROOF_FLAG: ReadonlySet<string> = new Set(['gutter', 'downpipes']);
/** A roof's card (ON10 decision 3): Type, Name, size, eaves height, then only its type's settings. */
function roofRows(r: Roof): CardRow[] {
  return [
    { id: 'type', label: 'Type', value: roofType(r.type).name, kind: 'list' },
    nameRow(r),
    ...sizeRows(r.rect),
    { id: 'base', label: ROOF_LABELS.base, value: roofSettingWords(r, 'base'), kind: 'len' },
    ...shownRoofSettings(r).map((s): CardRow => ({ id: s, label: ROOF_LABELS[s], value: roofSettingWords(r, s), kind: ROOF_LEN.has(s) ? 'len' : ROOF_FLAG.has(s) ? 'flag' : 'list' })),
    idRow(r),
  ];
}

/** Room access rings (schema.md: `ring`), shown as words. */
export const RING_NAMES = ['Perimeter (yard, public lane)', 'Level 1 - reception, goods-in', 'Level 2 - staff', 'Level 3 - higher card', 'Level 4 - data hall, tunnels', 'Level 5 - meet-me, riser'];
const DIRS = ['N', 'E', 'S', 'W'];
const DIR_WORDS: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };

export type CardKind = 'list' | 'len' | 'flag' | 'name' | 'id';
export interface CardRow {
  id: string;
  label: string;
  value: string;
  kind: CardKind;
}

/** Consecutive steps on one row within this many seconds are one undo step. */
export const CARD_MERGE_S = 1;

const cap = (s: string): string => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
const m = (v: number): string => `${fmt(v)} m`;
const nameRow = (e: Elem): CardRow => ({ id: 'name', label: 'Name', value: typeof e.name === 'string' && e.name ? e.name : '(none)', kind: 'name' });
/** ON2: the id, last on every card; A opens the keyboard to rename it (every reference follows). */
const idRow = (e: Elem): CardRow => ({ id: 'id', label: 'Id', value: e.id, kind: 'id' });
const sizeRows = (r: Rect): CardRow[] => [
  { id: 'width', label: 'Width', value: m(r[2] - r[0]), kind: 'len' },
  { id: 'depth', label: 'Depth', value: m(r[3] - r[1]), kind: 'len' },
];

/** Glass partition settings (ON9 decision 4): a wall of kind `glass`. */
const glassOf = (w: Wall): GlassData => ({ ...GLASS_WALL_DEFAULT, ...(w.glass && typeof w.glass === 'object' ? (w.glass as GlassData) : {}) });

/**
 * The card's rows for an element, Type first where the element has a type. An opening shows only the settings its type
 * has (ON9: no hinge on a sliding door); `ctx` gives the rooms and the wall for the side words.
 */
export function cardRows(coll: Coll, e: Elem, ctx: SideCtx = {}): CardRow[] {
  // ON13: a ceiling (type, height, hatches) and a crawl space
  if (coll === 'ceilings') return ceilingRows(e as Ceiling);
  if (coll === 'crawls') return crawlRows(e as CrawlRecord);
  // ON14: a sign (type, text and arrow for a wayfinding one, height, width)
  if (coll === 'signs') return signRows(e as SignRecord);
  if (coll === 'openings') {
    const o = e as Opening;
    const set = shownSettings(o, ctx.rooms ?? []).map((s): CardRow => ({ id: s, label: SETTING_LABELS[s], value: settingWords(o, s, ctx), kind: FLAG_SETTINGS.has(s) ? 'flag' : 'list' }));
    return [
      { id: 'type', label: 'Type', value: DOOR_NAMES[o.type] ?? o.type, kind: 'list' },
      nameRow(e),
      { id: 'w', label: 'Width', value: m(o.w), kind: 'len' },
      { id: 'h', label: 'Height', value: m(o.h), kind: 'len' },
      { id: 'sill', label: 'Sill', value: m(o.sill), kind: 'len' },
      { id: 'at', label: 'Along wall', value: m(o.at), kind: 'len' },
      ...set,
      // ON14: a door's name plate: on / off (on takes the room it opens into), and its text (left / right: the site's names, A types)
      ...(isDoor(o) ? plateRows(o) : []),
      idRow(e),
    ];
  }
  if (coll === 'walls') {
    const w = e as Wall;
    const g = glassOf(w);
    const glassRows: CardRow[] =
      w.kind === 'glass'
        ? [
            { id: 'glass', label: 'Glass', value: cap(g.kind ?? 'clear'), kind: 'list' },
            { id: 'blinds', label: 'Blinds', value: cap(g.blinds ?? 'none'), kind: 'list' },
            { id: 'breakable', label: 'Breakable', value: g.breakable ? 'yes' : 'no', kind: 'flag' },
          ]
        : [];
    return [
      { id: 'type', label: 'Type', value: w.kind === 'glass' ? 'Glass partition' : `${cap(w.kind)} wall`, kind: 'list' },
      nameRow(e),
      { id: 't', label: 'Thickness', value: m(w.t), kind: 'len' },
      { id: 'h', label: 'Height', value: m(w.h), kind: 'len' },
      { id: 'len', label: 'Length', value: m(wallLen(w)), kind: 'len' },
      ...glassRows,
      idRow(e),
    ];
  }
  if (coll === 'rooms') {
    const r = e as Room;
    return [
      { id: 'type', label: 'Type', value: cap(r.kind), kind: 'list' },
      nameRow(e),
      ...sizeRows(r.rect),
      { id: 'ring', label: 'Access', value: RING_NAMES[r.ring ?? 0] ?? String(r.ring), kind: 'list' },
      // ON5: the floor finish (its footstep loudness is on the card's foot)
      { id: 'finish', label: 'Floor finish', value: finishOf(r.finish)?.name ?? 'None', kind: 'list' },
      idRow(e),
    ];
  }
  if (coll === 'stairs') {
    const st = e as Stair;
    return [
      { id: 'type', label: 'Type', value: stairType(stairTypeOf(st)).name, kind: 'list' },
      nameRow(e),
      ...sizeRows(st.rect),
      { id: 'up', label: 'Climbs', value: DIR_WORDS[st.up] ?? st.up, kind: 'list' },
      { id: 'to', label: 'To level', value: st.to, kind: 'list' },
      idRow(e),
    ];
  }
  if (coll === 'roofs') return roofRows(e as Roof);
  if (coll === 'objects') return objectRows(e as Obj);
  // ON8: guards and mission markers (the path is edited with Selected > Edit path)
  if (coll === 'guards') {
    const rows = guardRows(e as unknown as Guard);
    return [rows[0]!, nameRow(e), ...rows.slice(1), idRow(e)];
  }
  if (coll === 'objectives') {
    const o = e as unknown as Objective;
    return [{ id: 'type', label: 'Type', value: objectiveKind(o.kind).name, kind: 'list' }, nameRow(e), { id: 'order', label: 'Order', value: String(o.order), kind: 'list' }, { id: 'optional', label: 'Optional', value: o.optional ? 'yes' : 'no', kind: 'flag' }, idRow(e)];
  }
  if (coll === 'hides') return [{ id: 'type', label: 'Type', value: hideKind((e as unknown as Hide).kind).name, kind: 'list' }, nameRow(e), idRow(e)];
  if (coll === 'spawns') return [idRow(e)];
  // ON12: a security device: Type (fixed / pan camera, card reader / card and PIN / keypad), Name, its own rows
  if (coll === 'devices') return [{ id: 'type', label: 'Type', value: deviceType(e as unknown as Device), kind: 'list' }, nameRow(e), ...deviceRows(e as unknown as Device), idRow(e)];
  if (coll === 'extraction') return sizeRows((e as unknown as { rect: Rect }).rect);
  // ON6: a lamp: Type (the fitting), Name, lumens, colour temperature, beam, height, aim, the flags, circuit, owner
  if (coll === 'lamps') return [{ id: 'type', label: 'Type', value: fittingOf((e as Lamp).fixture)?.name ?? (e as Lamp).fixture, kind: 'list' }, nameRow(e), ...lampRows(e as Lamp), idRow(e)];
  if (coll === 'exterior') {
    const rows = pieceRows(e as Ext);
    return [rows[0]!, nameRow(e), ...rows.slice(1), idRow(e)];
  }
  if (coll === 'voids') return [{ id: 'type', label: 'Type', value: HOLE_NAMES[(e as Void).kind] ?? (e as Void).kind, kind: 'list' }, nameRow(e), ...sizeRows((e as { rect: Rect }).rect), idRow(e)];
  if (coll === 'ladders') return [nameRow(e), { id: 'facing', label: 'Facing', value: DIR_WORDS[(e as Ladder).facing ?? 'N'] ?? '', kind: 'list' }, { id: 'to', label: 'To level', value: (e as Ladder).to, kind: 'list' }, idRow(e)];
  return [nameRow(e), idRow(e)];
}

const shownSettingIds: ReadonlySet<string> = new Set(Object.keys(SETTING_LABELS));
const wrap = <T>(list: readonly T[], cur: T, dir: number): T => list[(Math.max(0, list.indexOf(cur)) + dir + list.length) % list.length]!;
const r3 = (v: number): number => +v.toFixed(3);

export interface StepCtx {
  /** Length step (meta.objectGrid). */
  step: number;
  /** The opening's wall length (openings only), to keep it on its wall. */
  wallLen?: number;
  /** The file's levels (stairs and ladders: the To level row steps through the levels above `from`). */
  levels?: readonly { id: string; floor: number }[];
  /** Openings (ON9): the rooms and the wall, for the side settings and the type defaults. */
  rooms?: SideCtx['rooms'];
  wall?: SideCtx['wall'];
  /** ON5: the file, for a climb piece's rules (heights, the lip at a downpipe's top, vents and ducts). */
  data?: Pick<Campus, 'levels' | 'walls' | 'exterior' | 'openings' | 'rooms'>;
  /** ON13: the dot (a ceiling's Hatches row adds one there). */
  dot?: Pt;
}

/** ON14: a door's plate rows. */
function plateRows(o: Opening): CardRow[] {
  const on = typeof o.plate === 'string' && !!o.plate;
  return [{ id: 'plate', label: 'Name plate', value: on ? 'On' : 'Off', kind: 'flag' }, ...(on ? [{ id: 'plateText', label: 'Plate text', value: String(o.plate), kind: 'name' as const }] : [])];
}

/** At most this many card rows show while editing; more scroll with the lit row (ON9: a door has up to 16). */
export const CARD_ROWS_SHOWN = 9;
/** The rows shown while editing: a window of `max` rows that keeps the lit one inside. [start, end). */
export function cardWindow(n: number, lit: number, max = CARD_ROWS_SHOWN): [number, number] {
  if (n <= max) return [0, n];
  const start = Math.min(Math.max(0, lit - Math.floor(max / 2)), n - max);
  return [start, start + max];
}

/**
 * One step of a row: the element after it, or null when nothing changes (a name row, a length at its limit). Lengths
 * never go below one step; an opening stays on its wall; a wall's length moves its end b.
 */
export function stepCard(coll: Coll, e: Elem, row: string, dir: 1 | -1, c: StepCtx): Elem | null {
  const a = JSON.parse(JSON.stringify(e)) as Elem & Record<string, unknown>;
  const len = (v: number): number => Math.max(c.step, r3(v + dir * c.step));
  if (coll === 'ceilings') return c.data ? stepCeiling(c.data, e as Ceiling, row, dir, c.step, c.dot) : null;
  if (coll === 'crawls' && row !== 'name' && row !== 'id') return stepCrawl(e as CrawlRecord, row, dir, c.step);
  // ON14: a sign's rows; a door's plate (on with its default text, off) and its text through the site's names
  if (coll === 'signs' && row !== 'id') return c.data ? (stepSign(c.data as Campus, e as SignRecord, row, dir, c.step) as Elem | null) : null;
  if (coll === 'openings' && (row === 'plate' || row === 'plateText')) {
    const o = a as Opening;
    if (row === 'plate') {
      if (typeof o.plate === 'string' && o.plate) delete o.plate;
      else o.plate = plateDefault({ rooms: (c.rooms ?? c.data?.rooms ?? []) as Room[] }, o) || 'Room';
      return o;
    }
    if (!c.data) return null;
    const list = signTexts(c.data as Campus);
    const i = list.indexOf(String(o.plate ?? ''));
    o.plate = list[(i + dir + list.length) % list.length] ?? o.plate;
    return o;
  }
  if (coll === 'exterior' && row !== 'name' && row !== 'id') return c.data ? stepPiece(c.data, e as Ext, row, dir, c.step) : null;
  if ((coll === 'guards' || coll === 'objectives' || coll === 'hides') && row !== 'name' && row !== 'id') return stepMissionRow(coll, e, row, dir);
  if (coll === 'devices' && row !== 'name' && row !== 'id') return c.data ? (stepDevice(c.data as unknown as SecData, e as unknown as Device, row, dir, c.step) as unknown as Elem | null) : null;
  if (coll === 'lamps' && row !== 'name' && row !== 'id') return c.data ? stepLamp(c.data as unknown as LampData, e as Lamp, row, dir, c.step) : null;
  if (coll === 'rooms' && row === 'finish') {
    const f = stepFinish((e as Room).finish, dir);
    // the file has `finish: ""` on every room: keep the key where it is (a no-op save stays byte-identical)
    if (f || 'finish' in e) a.finish = f;
    else delete a.finish;
    return a as Elem;
  }
  if (coll === 'objects' && row !== 'width' && row !== 'depth' && row !== 'name' && row !== 'id') return stepObjectRow(e as Obj, row, dir, c.step) as Elem | null;
  if (coll === 'roofs' && row !== 'width' && row !== 'depth' && row !== 'name' && row !== 'id') {
    const r = e as Roof;
    if (row === 'type') return withRoofType(r, wrap(ROOF_TYPES.map((t) => t.id), roofType(r.type).id, dir)) as Elem;
    return stepRoofSetting(r, row as RoofSetting | 'base', dir, c.step) as Elem | null;
  }
  if (row === 'type') {
    if (coll === 'openings') {
      // ON9: doors flip through doors, windows through windows, with the new type's settings
      const o = e as Opening;
      return withOpeningType(o, wrap(familyTypes(familyOf(o.type)), o.type, dir), c.rooms ?? []) as Elem;
    } else if (coll === 'walls') {
      a.kind = wrap(WALL_KINDS, (e as Wall).kind, dir);
      if (a.kind === 'glass') a.glass = { ...GLASS_WALL_DEFAULT };
      else delete a.glass;
    } else if (coll === 'rooms') a.kind = wrap(ROOM_KINDS, (e as Room).kind, dir);
    else if (coll === 'stairs') return withStairType(e as Stair, wrap(STAIR_TYPES.map((t) => t.id), stairTypeOf(e as Stair), dir)) as Elem;
    else if (coll === 'voids') a.kind = wrap(HOLE_KINDS, (e as Void).kind as (typeof HOLE_KINDS)[number], dir);
    else return null;
  } else if (row === 'to' && (coll === 'stairs' || coll === 'ladders')) {
    const ls = c.levels ?? [];
    const from = ls.find((l) => l.id === (e as Stair).from);
    const above = ls.filter((l) => from && l.floor > from.floor).sort((p, q) => p.floor - q.floor).map((l) => l.id);
    if (above.length < 2 || !from) return null;
    a.to = wrap(above, (e as Stair).to, dir);
    // a stair takes the rule's risers for its new rise (the well moves with it: vertical.ts stairwellLink)
    const to = ls.find((l) => l.id === a.to)!;
    if (coll === 'stairs') a.risers = Math.max(2, Math.round((to.floor - from.floor) / STAIR_FACTS.riserHeight));
  } else if (coll === 'openings' && shownSettingIds.has(row)) {
    return stepSetting(e as Opening, row as Setting, dir, { rooms: c.rooms, wall: c.wall }) as Elem | null;
  } else if (coll === 'walls' && (row === 'glass' || row === 'blinds' || row === 'breakable')) {
    const g = glassOf(e as Wall);
    if (row === 'glass') g.kind = wrap(GLASS_KINDS, g.kind ?? 'clear', dir);
    else if (row === 'blinds') g.blinds = wrap(BLINDS, g.blinds ?? 'none', dir);
    else g.breakable = !g.breakable;
    a.glass = g;
  } else if (row === 'ring') a.ring = (((e as Room).ring ?? 0) + dir + RING_NAMES.length) % RING_NAMES.length;
  else if (row === 'up') a.up = wrap(DIRS, (e as Stair).up, dir);
  else if (row === 'facing') a.facing = wrap(DIRS, (e as Ladder).facing ?? 'N', dir);
  else if (coll === 'openings' && (row === 'w' || row === 'h' || row === 'sill' || row === 'at')) {
    const o = a as unknown as Opening;
    const L = c.wallLen ?? Infinity;
    if (row === 'sill') o.sill = Math.max(0, r3(o.sill + dir * c.step));
    else if (row === 'h') o.h = len(o.h);
    else if (row === 'w') {
      o.w = Math.min(len(o.w), r3(Math.min(o.at, L - o.at) * 2));
      if (o.w < c.step) return null;
    } else o.at = Math.min(r3(L - o.w / 2), Math.max(r3(o.w / 2), r3(o.at + dir * c.step)));
  } else if (coll === 'walls' && (row === 't' || row === 'h' || row === 'len')) {
    const w = a as unknown as Wall;
    if (row === 't') w.t = len(w.t);
    else if (row === 'h') w.h = len(w.h);
    else {
      const L0 = wallLen(e as Wall);
      if (L0 <= 0) return null;
      const L1 = len(L0);
      const k = L1 / L0;
      w.b = [r3(w.a[0] + (w.b[0] - w.a[0]) * k), r3(w.a[1] + (w.b[1] - w.a[1]) * k)];
    }
  } else if ((row === 'width' || row === 'depth') && Array.isArray(a.rect)) {
    const r = (a.rect as Rect).slice() as Rect;
    if (row === 'width') r[2] = r3(r[0] + len(r[2] - r[0]));
    else r[3] = r3(r[1] + len(r[3] - r[1]));
    a.rect = normRect(r);
  } else return null;
  return JSON.stringify(a) === JSON.stringify(e) ? null : (a as Elem);
}

/** The on-screen keyboard (A on the card's Name row), ten keys a row. */
export const KEYBOARD: readonly string[] = [...'ABCDEFGHIJ', ...'KLMNOPQRST', ...'UVWXYZ-()/', ...'0123456789', 'Space', 'Delete', 'Clear', 'Done'];
export const KEYBOARD_COLS = 10;

/** A key typed into a name: letters are capitals at the start of a word, small letters elsewhere; `raw` (ids) keeps every capital and drops spaces. 'Done' is the caller's. */
export function typeKey(text: string, key: string, raw = false): string {
  if (raw && key === 'Space') return text;
  if (raw && key.length === 1) return text + key;
  if (key === 'Space') return text.endsWith(' ') || !text ? text : `${text} `;
  if (key === 'Delete') return text.slice(0, -1);
  if (key === 'Clear') return '';
  if (key.length !== 1) return text;
  const start = !text || text.endsWith(' ') || text.endsWith('-') || text.endsWith('(') || text.endsWith('/');
  return text + (/[A-Z]/.test(key) && !start ? key.toLowerCase() : key);
}

/** The name list for an element kind: the names already used in that collection (sorted, no repeats). */
export function nameList(elems: readonly Elem[]): string[] {
  return [...new Set(elems.map((e) => (typeof e.name === 'string' ? e.name.trim() : '')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
