/**
 * The Roof tool's logic (ON10), pure: the roof types with their settings and realistic defaults (each with its source),
 * a new roof from an outline or a footprint, its default eaves height, the card's rows and steps, the type flip, and the
 * words (ridge height, the steepness flag against the game's slope limit, a flat roof against its roof level). The
 * geometry itself is `src/world/maps/kestrelRoofs.ts`, shared with the walk test and the plans. Babylon- and DOM-free
 * (tests/editor/roofGeometry.test.ts).
 */
import facts from '../../scripts/kestrel/facts.json';
import { fmt } from './geometry';
import type { Campus, Rect, Wall } from './types';
import { buildingAt } from './visibility';
import { hipRidgeLength, ROOF_COLOURS, ROOF_MATERIALS, roofShape, sawtoothCount } from '../world/maps/kestrelRoofs';
import type { Dir, RoofData, RoofType } from '../world/maps/kestrelRoofs';

export type { RoofData, RoofType } from '../world/maps/kestrelRoofs';
export { roofShape, roofPlan, roofParapets, roofTrim, roofWalkPieces, hipRidgeLength, sawtoothCount, roofHex, ROOF_COLOURS, ROOF_MATERIALS } from '../world/maps/kestrelRoofs';

const F = facts as unknown as Record<string, Record<string, { value: number }>>;
const fact = (g: string, k: string): number => {
  const f = F[g]?.[k];
  if (!f) throw new Error(`facts.json: ${g}.${k} is needed`);
  return f.value;
};
/** The steepest ground the player stands on (facts.json player.maxSlope: the controller's maxSlopeCosine). */
export const MAX_SLOPE = fact('player', 'maxSlope');
export const ROOF_FACTS = {
  parapet: fact('rules', 'parapet'),
  upstand: fact('roof', 'upstand'),
  fallMin: fact('roof', 'fallMin'),
  fallMax: fact('roof', 'fallMax'),
  overhangMax: fact('roof', 'overhangMax'),
  levelTol: fact('roof', 'levelTol'),
};

export type RoofSetting = 'pitch' | 'high' | 'ridge' | 'fall' | 'fallsTo' | 'edge' | 'parapet' | 'upstand' | 'tooth' | 'glazed' | 'rise' | 'overhang' | 'fascia' | 'material' | 'colour' | 'gutter' | 'downpipes';
/** Settings every type has. */
const COMMON: readonly RoofSetting[] = ['overhang', 'fascia', 'material', 'colour', 'gutter', 'downpipes'];

export interface RoofTypeEntry {
  id: RoofType;
  name: string;
  /** Its own settings, in card order (the common ones follow). */
  own: readonly RoofSetting[];
  /** Defaults; `ridge` is the longer side when absent. */
  defaults: Partial<RoofData>;
  src: string;
}

/** The roof catalogue: every type, its settings and its defaults. */
export const ROOF_TYPES: readonly RoofTypeEntry[] = [
  { id: 'flat', name: 'Flat', own: ['fall', 'fallsTo', 'edge', 'parapet', 'upstand'], defaults: { fall: ROOF_FACTS.fallMin, fallsTo: 'S', edge: 'parapet', parapet: ROOF_FACTS.parapet, upstand: ROOF_FACTS.upstand, overhang: 0, fascia: 0.3, material: 'membrane', colour: 'charcoal', gutter: false, downpipes: false }, src: '02-building-brief: flat single-ply roofs with 1.1 parapets; fall and upstand ON10' },
  { id: 'mono', name: 'Mono-pitch (skillion)', own: ['pitch', 'high'], defaults: { pitch: 10, high: 'N', overhang: 0.3, fascia: 0.2, material: 'metal', colour: 'grey', gutter: true, downpipes: true }, src: 'editor default: a metal deck skillion at 5-15 degrees, 300 mm eaves' },
  { id: 'gable', name: 'Gable', own: ['pitch', 'ridge'], defaults: { pitch: 25, overhang: 0.5, fascia: 0.2, material: 'tile', colour: 'terracotta', gutter: true, downpipes: true }, src: 'editor default: a tiled roof at 22.5-30 degrees, 450-600 mm eaves' },
  { id: 'hip', name: 'Hip', own: ['pitch'], defaults: { pitch: 25, overhang: 0.5, fascia: 0.2, material: 'tile', colour: 'terracotta', gutter: true, downpipes: true }, src: 'editor default: as the gable, hips on all four sides' },
  { id: 'sawtooth', name: 'Sawtooth', own: ['pitch', 'tooth', 'glazed'], defaults: { pitch: 25, tooth: 6, glazed: 'S', overhang: 0, fascia: 0.2, material: 'metal', colour: 'grey', gutter: true, downpipes: true }, src: 'editor default: factory north-light roof, 6 m teeth; the glass faces south, away from the sun in Australia' },
  { id: 'curved', name: 'Curved (barrel)', own: ['rise', 'ridge'], defaults: { rise: 1.5, overhang: 0.3, fascia: 0.2, material: 'metal', colour: 'grey', gutter: true, downpipes: true }, src: 'editor default: a curved metal roof rising about a tenth of its span' },
];
export const roofType = (id: string): RoofTypeEntry => ROOF_TYPES.find((t) => t.id === id) ?? ROOF_TYPES[0]!;
export const roofSettings = (type: string): RoofSetting[] => [...roofType(type).own, ...COMMON];

/** Steps and limits per setting (lengths 0.1 m, degrees 1). */
const LIMITS: Partial<Record<RoofSetting, { min: number; max: number; step: 'len' | 'deg' }>> = {
  pitch: { min: 1, max: 60, step: 'deg' },
  fall: { min: ROOF_FACTS.fallMin, max: ROOF_FACTS.fallMax, step: 'deg' },
  parapet: { min: 0.1, max: 3, step: 'len' },
  upstand: { min: 0.1, max: 1, step: 'len' },
  tooth: { min: 1, max: 20, step: 'len' },
  rise: { min: 0.1, max: 20, step: 'len' },
  overhang: { min: 0, max: ROOF_FACTS.overhangMax, step: 'len' },
  fascia: { min: 0, max: 0.6, step: 'len' },
};
const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
const DIR_WORDS: Record<string, string> = { N: 'North', E: 'East', S: 'South', W: 'West' };

export const ROOF_LABELS: Record<RoofSetting | 'base', string> = {
  base: 'Eaves height',
  pitch: 'Pitch',
  high: 'High side',
  ridge: 'Ridge',
  fall: 'Fall',
  fallsTo: 'Falls to',
  edge: 'Edge',
  parapet: 'Parapet height',
  upstand: 'Upstand height',
  tooth: 'Tooth width',
  glazed: 'Glass faces',
  rise: 'Rise',
  overhang: 'Overhang',
  fascia: 'Fascia depth',
  material: 'Material',
  colour: 'Colour',
  gutter: 'Gutter',
  downpipes: 'Downpipes',
};

/** The settings a roof shows on its card: a flat roof shows the parapet height or the upstand height, not both. */
export function shownRoofSettings(r: RoofData): RoofSetting[] {
  return roofSettings(r.type).filter((s) => !(r.type === 'flat' && ((s === 'parapet' && r.edge === 'upstand') || (s === 'upstand' && r.edge !== 'upstand'))) && !(s === 'downpipes' && !r.gutter));
}

const deg = (v: number): string => `${Math.round(v)} degrees`;
export function roofSettingWords(r: RoofData, s: RoofSetting | 'base'): string {
  const v = r[s];
  switch (s) {
    case 'pitch':
    case 'fall':
      return deg(Number(v ?? 0));
    case 'high':
    case 'fallsTo':
    case 'glazed':
      return DIR_WORDS[String(v ?? 'N')] ?? String(v);
    case 'ridge':
      return (v ?? longSide(r.rect)) === 'x' ? 'East-west' : 'North-south';
    case 'edge':
      return v === 'upstand' ? 'Upstand' : 'Parapet';
    case 'material':
      return ROOF_MATERIALS.find((m) => m.id === v)?.name ?? String(v ?? '');
    case 'colour':
      return ROOF_COLOURS.find((c) => c.id === v)?.name ?? String(v ?? '');
    case 'gutter':
      return v ? 'yes' : 'no';
    case 'downpipes':
      return v ? 'at the corners' : 'none';
    default:
      return `${fmt(Number(v ?? 0))} m`;
  }
}

const longSide = (rect: readonly number[]): 'x' | 'z' => (rect[2]! - rect[0]! >= rect[3]! - rect[1]! ? 'x' : 'z');
const r3 = (v: number): number => +v.toFixed(3);
const wrap = <T>(list: readonly T[], cur: T, dir: number): T => list[(Math.max(0, list.indexOf(cur)) + dir + list.length) % list.length]!;

/** One step of a roof setting (or the eaves height), or null at a limit. */
export function stepRoofSetting(r: RoofData, s: RoofSetting | 'base', dir: 1 | -1, lenStep: number): RoofData | null {
  const a = JSON.parse(JSON.stringify(r)) as RoofData;
  const lim = s === 'base' ? { min: 0, max: 100, step: 'len' as const } : LIMITS[s];
  if (lim) {
    const cur = Number(r[s] ?? 0);
    const st = lim.step === 'deg' ? 1 : lenStep;
    let v = r3(Math.min(lim.max, Math.max(lim.min, cur + dir * st)));
    if (s === 'rise') v = Math.min(v, r3((r.ridge ?? longSide(r.rect)) === 'x' ? (r.rect[3] - r.rect[1]) / 2 : (r.rect[2] - r.rect[0]) / 2));
    if (v === cur) return null;
    (a as Record<string, unknown>)[s] = v;
    return a;
  }
  if (s === 'high' || s === 'fallsTo' || s === 'glazed') a[s] = wrap(DIRS, (r[s] as Dir | undefined) ?? 'N', dir);
  else if (s === 'ridge') a.ridge = (r.ridge ?? longSide(r.rect)) === 'x' ? 'z' : 'x';
  else if (s === 'edge') a.edge = r.edge === 'upstand' ? 'parapet' : 'upstand';
  else if (s === 'material') {
    a.material = wrap(ROOF_MATERIALS.map((m) => m.id), r.material ?? 'metal', dir);
    a.colour = ROOF_MATERIALS.find((m) => m.id === a.material)?.colour ?? a.colour;
  } else if (s === 'colour') a.colour = wrap(ROOF_COLOURS.map((c) => c.id), r.colour ?? 'grey', dir);
  else if (s === 'gutter') {
    a.gutter = !r.gutter;
    if (!a.gutter) a.downpipes = false;
  } else if (s === 'downpipes') a.downpipes = !r.downpipes;
  else return null;
  return a;
}

/** A type's defaults on a roof: ridge along the longer side. */
function typeDefaults(type: RoofType, rect: Rect): Partial<RoofData> {
  const t = roofType(type);
  const d: Partial<RoofData> = { ...t.defaults };
  if (t.own.includes('ridge')) d.ridge = longSide(rect);
  return d;
}

/** Every setting key any type has (dropped when the type no longer has it). */
const ALL_SETTINGS: readonly string[] = [...new Set(ROOF_TYPES.flatMap((t) => [...t.own, ...COMMON]))];

/**
 * The Type row (ON10 decision 3): the new type with its own settings; the settings both types have stay (pitch, overhang,
 * the trim and the material), except to or from Flat, where the new type's defaults apply.
 */
export function withRoofType(r: RoofData, type: RoofType): RoofData {
  const out = JSON.parse(JSON.stringify(r)) as RoofData;
  const keep = new Set(r.type === 'flat' || type === 'flat' ? [] : roofSettings(type).filter((s) => roofSettings(r.type).includes(s)));
  for (const k of ALL_SETTINGS) if (!keep.has(k as RoofSetting)) delete out[k];
  out.type = type;
  const d = typeDefaults(type, r.rect);
  for (const [k, v] of Object.entries(d)) if (!(k in out)) out[k] = v;
  // field order: the record's own fields, then the settings in card order
  const ordered: RoofData = { id: out.id, ...(out.name ? { name: out.name } : {}), ...(out.building ? { building: out.building } : {}), level: out.level, rect: out.rect, base: out.base, type };
  for (const s of roofSettings(type)) if (out[s] !== undefined) (ordered as Record<string, unknown>)[s] = out[s];
  for (const [k, v] of Object.entries(out)) if (!(k in ordered)) ordered[k] = v;
  return ordered;
}

export const ROOF_ID_PREFIX = 'RF';
export function roofId(d: Campus): string {
  const used = new Set(((d.roofs as RoofData[] | undefined) ?? []).map((r) => r.id));
  for (let n = 1; ; n++) {
    const id = `${ROOF_ID_PREFIX}${String(n).padStart(2, '0')}`;
    if (!used.has(id)) return id;
  }
}

const UNDER_KINDS = new Set(['interior', 'exterior', 'glass']);
/**
 * The default eaves height (ON10 decision 1): the top of the walls under the outline (interior, exterior or glass walls on
 * this level or below, both ends inside it) that the most wall length reaches, else the top of this level (floor + storey
 * height).
 */
export function defaultBase(d: Campus, level: string, rect: Rect): number {
  const lv = d.levels.find((l) => l.id === level);
  const floorOf = (id: string): number | undefined => d.levels.find((l) => l.id === id)?.floor;
  const inside = (p: readonly number[]): boolean => p[0]! >= rect[0] - 0.5 && p[0]! <= rect[2] + 0.5 && p[1]! >= rect[1] - 0.5 && p[1]! <= rect[3] + 0.5;
  // the wall top most of the wall length under the outline reaches (a bulkhead on the roof does not lift the eaves)
  const runs = new Map<number, number>();
  for (const w of d.walls) {
    const f = floorOf(w.level);
    if (f === undefined || !UNDER_KINDS.has(w.kind) || (lv && f > lv.floor + 1e-6) || !inside(w.a) || !inside(w.b)) continue;
    const top = r3(f + w.h);
    runs.set(top, (runs.get(top) ?? 0) + Math.sqrt((w.b[0] - w.a[0]) ** 2 + (w.b[1] - w.a[1]) ** 2));
  }
  const best = [...runs].sort((p, q) => q[1] - p[1] || q[0] - p[0])[0];
  return r3(best ? best[0] : lv ? lv.floor + lv.height : 0);
}

/** A new roof over `rect`, drawn on `level`, with its type's defaults. */
export function newRoof(d: Campus, level: string, rect: Rect, type: RoofType, id: string): RoofData {
  const building = buildingAt(d.meta.buildings, (rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2);
  const base: RoofData = { id, ...(building && building !== 'site' ? { building } : {}), level, rect: rect.map(r3) as Rect, base: defaultBase(d, level, rect), type };
  return withRoofType(base, type);
}

/**
 * A on a building with the Roof tool (or a click without a drag): the building's footprint under the point, else the room
 * under it on this level grown to the outside faces of the walls on its edges (a gatehouse). Null when there is neither.
 */
export function footprintAt(d: Campus, level: string, x: number, z: number): { rect: Rect; what: string } | null {
  const inR = (r: readonly number[]): boolean => x >= r[0]! && x <= r[2]! && z >= r[1]! && z <= r[3]!;
  const b = (d.meta.buildings ?? []).filter((q) => inR(q.footprint)).sort((p, q) => area(p.footprint) - area(q.footprint))[0];
  if (b) return { rect: [...b.footprint] as Rect, what: `${b.name || `Building ${b.id}`} footprint` };
  const room = d.rooms.filter((r) => r.level === level && r.kind !== 'lane' && inR(r.rect)).sort((p, q) => area(p.rect) - area(q.rect))[0];
  if (!room) return null;
  const walls = d.walls.filter((w) => w.level === level);
  const on = (w: Wall, axis: 0 | 1, v: number, lo: number, hi: number): boolean => Math.abs(w.a[axis] - v) < 0.01 && Math.abs(w.b[axis] - v) < 0.01 && Math.max(w.a[1 - axis]!, w.b[1 - axis]!) > lo + 0.01 && Math.min(w.a[1 - axis]!, w.b[1 - axis]!) < hi - 0.01;
  const grow = (axis: 0 | 1, v: number, lo: number, hi: number): number => Math.max(0, ...walls.filter((w) => on(w, axis, v, lo, hi)).map((w) => w.t / 2));
  const [x0, z0, x1, z1] = room.rect;
  const out: Rect = [r3(x0 - grow(0, x0, z0, z1)), r3(z0 - grow(1, z0, x0, x1)), r3(x1 + grow(0, x1, z0, z1)), r3(z1 + grow(1, z1, x0, x1))];
  return { rect: out, what: `${room.name || room.id} with its walls` };
}
const area = (r: readonly number[]): number => (r[2]! - r[0]!) * (r[3]! - r[1]!);

/** The steepness flag (ON10 decision 5): the game's own limit, facts.json player.maxSlope. */
export function steepWords(r: RoofData): { steep: boolean; words: string } {
  const s = roofShape(r).steepest;
  if (r.type === 'flat') return { steep: false, words: 'walkable' };
  return s > MAX_SLOPE + 1e-6 ? { steep: true, words: `too steep to walk (game limit ${MAX_SLOPE} degrees)` } : { steep: false, words: `walkable up to the game limit of ${MAX_SLOPE} degrees` };
}

/**
 * A flat roof's top against its roof level (ON10 decision 6): the level with roof rooms over the outline whose floor is
 * nearest the top. Null when there is no such level or the heights agree.
 */
export function flatLevelCheck(d: Campus, r: RoofData): string | null {
  if (r.type !== 'flat') return null;
  const over = (q: readonly number[]): boolean => q[0]! < r.rect[2] && q[2]! > r.rect[0] && q[1]! < r.rect[3] && q[3]! > r.rect[1];
  const lvIds = new Set(d.rooms.filter((q) => q.kind === 'roof' && over(q.rect)).map((q) => q.level));
  const lvs = d.levels.filter((l) => lvIds.has(l.id)).sort((p, q) => Math.abs(p.floor - r.base) - Math.abs(q.floor - r.base));
  const l = lvs[0];
  if (!l || Math.abs(l.floor - r.base) <= ROOF_FACTS.levelTol) return null;
  const diff = r.base - l.floor;
  return `Top ${fmt(r.base)} m is ${fmt(Math.abs(diff))} m ${diff > 0 ? 'above' : 'below'} the ${l.name} floor (${fmt(l.floor)} m)`;
}

/** The card's foot and the side panel's summary: type, size, ridge, the steepness flag, the level check. */
export function roofWords(d: Campus, r: RoofData): { size: string; ridge: string; steep: boolean; warn: string | null } {
  const sh = roofShape(r);
  const w = r.rect[2] - r.rect[0];
  const dp = r.rect[3] - r.rect[1];
  const st = steepWords(r);
  let ridge = r.type === 'flat' ? `Top ${fmt(r.base)} m` : `Ridge ${fmt(sh.ridgeHeight)} m, eaves ${fmt(r.base)} m`;
  if (r.type === 'hip') ridge += `, ridge ${fmt(hipRidgeLength(r.rect))} m long`;
  if (r.type === 'sawtooth') ridge += `, ${sawtoothCount(r)} teeth`;
  if (r.type !== 'flat') ridge += `: ${st.words}`;
  return { size: `${roofType(r.type).name} roof, ${fmt(w)} x ${fmt(dp)} m`, ridge, steep: st.steep, warn: flatLevelCheck(d, r) };
}
