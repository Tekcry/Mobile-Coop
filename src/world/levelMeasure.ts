/**
 * (level-validator V6b, docs/level-validator/V6-PLAN.md) Greybox measurement core: what a map's connectivity graph
 * only declares (floor shadow, vantage visibility, LOS-break time, partner reach, link times), measured on the built
 * level in node with the game's own pure pieces: the light field the meter reads (`LightField.bodyLevel`, the
 * dark line `LIGHT.shadow`), the guards' nav grid (`NavGrid.findPath` / `flowField`) and the static sight lines
 * (`SightWorld.clear`, eye `EYE_STAND`, range `PERCEPTION.focusRange`). Speeds come from the `metrics` object
 * (`docs/design/metrics.json` `rules`), never from this file (M2).
 *
 * Tooling only: the game never imports this module (the CLI `scripts/level-measure.mjs` and the Vitest checks do).
 * Babylon-free; it allocates freely (not a hot path).
 */
import { hyp2, hyp3 } from '../core/mathx';
import { EYE_STAND, PERCEPTION } from '../ai/perception';
import type { NavGrid, P2, Waypoint } from '../ai/navGrid';
import type { SightWorld } from '../game/sectorCheck';
import { canonicalLightSet, fnv } from '../voxel/lightShapes';
import { bakeLamps } from '../voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../voxel/skyBake';
import { buildAmbientGrid } from './ambientGrid';
import { dressingOn } from './detailPass';
import { bakedLights, type LightBake } from './lightBake';
import { LightField } from './lightField';
import { BODY_HEIGHT } from './lighting/levels';
import { moonLight } from './lampMath';
import { LIGHT } from './lights';
import type { LevelBuilder } from './levelBuilder';
import type { MapDef } from './mapDef';
import { inRoom, type RoomRect } from './rooms';

/**
 * The measurement definitions of V6-PLAN "Measurement definitions" (how a measurement samples, not design targets:
 * the targets and speeds are the sheet's, read from `metrics`).
 */
export const MEASURE_DEF = {
  /** A floor cell is a walkable nav cell inside the `area` within this of the space's `storey` (m). */
  storeyTol: 1.0,
  /** A floor cell is seen when the eye has a clear line to this height over it (m). */
  targetY: 1.0,
  /** LOS-break cells: the space plus this much round it, so doors and the next room count (m). */
  ring: 6,
  /** The vantage search (no `vantage.at`): candidate feet points this far apart on the `from` space (m). */
  stride: 1,
} as const;

/** The tool tag written to `meta.measured.tool`. */
export const MEASURE_TOOL = 'level-measure 1';

/** Link kinds the nav grid does not model (it walks, climbs ladders and takes drops only, `navGrid.ts` NavLinkInput). */
export const OFF_NAV_KINDS: ReadonlySet<string> = new Set(['coop_boost', 'human_ladder', 'team_rope', 'rappel', 'wall_jump', 'split_jump', 'ledge', 'pipe', 'duct', 'window', 'hatch']);
/** Co-op kinds (graph-schema "Link kinds"; `scripts/level-validate.mjs` COOP_KINDS): a split leg is walked alone. */
const COOP_KINDS: ReadonlySet<string> = new Set(['coop_boost', 'human_ladder', 'pair_gate', 'team_rope']);
/** Kinds walked at the split speed when no time is measured or declared (`level-validate.mjs` WALK_KINDS). */
const WALK_KINDS: ReadonlySet<string> = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'fire_stair', 'open_stair', 'tunnel', 'pair_gate']);
/** One way unless `one_way: false` (`level-validate.mjs` ONE_WAY_KINDS). */
const ONE_WAY_KINDS: ReadonlySet<string> = new Set(['drop', 'rappel']);
const SPLIT_TAG = /^split:(.+):(a|b)$/;

type V3 = [number, number, number];
/** An `area` box: `[minX, minZ, maxX, maxZ]`. */
export type AreaBox = readonly [number, number, number, number];

/** The graph fields V6 reads (graph-schema.md + V6-PLAN "Schema additions"); everything else passes through. */
export interface MeasureSpace {
  id: string;
  type?: string;
  storey: number;
  tags?: readonly string[];
  /** A RoomDef id of the map's rooms, or a list of `[minX, minZ, maxX, maxZ]` boxes. */
  area?: string | readonly AreaBox[];
  vantage?: { from: string; sees_pct?: number; at?: readonly number[] };
}

export interface MeasureLink {
  from: string;
  to: string;
  kind: string;
  /** The opening / door point `[x, y, z]` the link passes. */
  at?: readonly number[];
  time_s?: number;
  length?: number;
  one_way?: boolean;
}

export interface MeasureGraphInput {
  meta: { map: string };
  spaces: readonly MeasureSpace[];
  links: readonly MeasureLink[];
}

/** A guard of the map's sector data (`SectorGuard` fits): its post and its route points stand in for its patrol. */
export interface MeasureGuard {
  x: number;
  z: number;
  y?: number;
  route?: readonly (readonly [number, number])[];
}

/** The part of `docs/design/metrics.json` V6 reads. */
export interface MeasureMetrics {
  rules: { split_speed_mps: number; reach_speed_mps: number } & Record<string, unknown>;
  sizes?: Record<string, unknown>;
}

export interface MeasureOptions {
  builder: Pick<LevelBuilder, 'boxes' | 'cylinders'>;
  field: Pick<LightField, 'bodyLevel'>;
  nav: NavGrid;
  sight: Pick<SightWorld, 'clear'>;
  guards: readonly MeasureGuard[];
  metrics: MeasureMetrics;
  /** The map's rooms (`MapLayout.rooms`): an `area` that names a RoomDef id is looked up here. */
  rooms?: readonly RoomRect[];
  /** The map (light-shape hash: its id and `detail`); default `graph.meta.map`, dressing on. */
  map?: Pick<MapDef, 'id' | 'detail'>;
  /** `meta.measured.date` (default today, ISO date). */
  date?: string;
}

/** `measured` of a space (V6-PLAN schema). A field is null where it does not apply or could not be measured. */
export interface SpaceMeasured {
  shadow_pct: number | null;
  sees_pct: number | null;
  vantage_at: V3 | null;
  los_break_s: number | null;
  cells: number;
  geom: string;
}

/** `measured` of a link: a nav time and path, or no time and why (the validator keeps the declared `time_s`). */
export type LinkMeasured = { time_s: number; path_m: number } | { time_s: null; why: string };

export interface SplitMeasured {
  a_s: number | null;
  b_s: number | null;
  reach_s: number | null;
}

export interface MetaMeasured {
  tool: string;
  date: string;
  geom: string;
  splits: Record<string, SplitMeasured>;
}

export interface MeasureResult {
  /** By space id: every space with an `area`. */
  spaces: Record<string, SpaceMeasured>;
  /** One per graph link, in graph order. */
  links: LinkMeasured[];
  meta: MetaMeasured;
  /** Report lines (`ERR ...`): unknown room ids, empty areas, ambiguous link edges, unreached cells. */
  errors: string[];
}

interface Area {
  boxes: AreaBox[];
  room: RoomRect | null;
}

/**
 * The light field of a built level in node (the pure bakers, as `World.create` + `bakeLevelLight` run them; the test
 * bake of `tests/campusArtLight.test.ts`): doors open by default (`doors: 'shut'` re-runs with every leaf shut).
 */
export function nodeLightField(b: LevelBuilder, map: Pick<MapDef, 'id' | 'theme' | 'detail'>, opts: { doors?: 'open' | 'shut' } = {}): LightField {
  const set = canonicalLightSet(b.boxes, b.cylinders, map.id, dressingOn(map));
  const reg = b.lights;
  reg.ambient = map.theme.lightLevel ?? 0.75;
  const mL = moonLight(map.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = map.theme.sunDir;
  const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: V3 = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as V3;
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  const open = opts.doors === 'shut' ? 0 : 1;
  return new LightField(bake, reg, b.anchors.doors.map((anchor) => ({ anchor, open })));
}

/** A required `rules` number (M2: no fallback value in code). */
function rule(metrics: MeasureMetrics, key: 'split_speed_mps' | 'reach_speed_mps'): number {
  const v = metrics.rules[key];
  if (typeof v !== 'number' || !(v > 0)) throw new Error(`levelMeasure: metrics.rules.${key} missing or not a positive number`);
  return v;
}

const isOneWay = (l: MeasureLink): boolean => l.one_way === true || (ONE_WAY_KINDS.has(l.kind) && l.one_way !== false);

/**
 * Measure a graph on a built level: `measured` for every space with an `area` and every link, `meta.measured` with the
 * split leg times and partner reach (V6-PLAN "Measurement definitions"). Pure: it reads the inputs, writes nothing.
 */
export function measureGraph(graph: MeasureGraphInput, opts: MeasureOptions): MeasureResult {
  const { nav, field, sight, metrics } = opts;
  const splitSpeed = rule(metrics, 'split_speed_mps');
  const reachSpeed = rule(metrics, 'reach_speed_mps');
  const errors: string[] = [];
  const mapId = opts.map?.id ?? graph.meta.map;
  const lightHash = canonicalLightSet(opts.builder.boxes, opts.builder.cylinders, mapId, opts.map ? dressingOn(opts.map) : true).hash;
  const navHash = fnv(new Uint8Array(nav.height.buffer, nav.height.byteOffset, nav.height.byteLength), fnv(nav.walk)).toString(36);
  const geom = `${lightHash}-${navHash}`;
  const byId = new Map(graph.spaces.map((s) => [s.id, s]));
  const roomById = new Map((opts.rooms ?? []).map((r) => [r.id, r]));
  const tmp: P2 = [0, 0];

  // --- areas and floor cells
  const areas = new Map<string, Area>();
  const floors = new Map<string, number[]>();
  for (const s of graph.spaces) {
    if (s.area === undefined) continue;
    let area: Area;
    if (typeof s.area === 'string') {
      const r = roomById.get(s.area);
      if (!r) {
        errors.push(`ERR ${s.id}: area '${s.area}' names no room of the map`);
        continue;
      }
      area = { boxes: [[r.minX, r.minZ, r.maxX, r.maxZ]], room: r };
    } else {
      area = { boxes: s.area.slice(), room: null };
    }
    areas.set(s.id, area);
    const cells = cellsIn(nav, area, 0, (h) => Math.abs(h - s.storey) <= MEASURE_DEF.storeyTol);
    floors.set(s.id, cells);
    if (!cells.length) errors.push(`ERR ${s.id}: area has no walkable floor cell within ${MEASURE_DEF.storeyTol} m of storey ${s.storey}`);
  }

  // --- light: dark per cell (cached; a cell is read by the shadow and the LOS-break passes)
  const litCache = new Map<number, boolean>();
  const lit = (i: number): boolean => {
    let v = litCache.get(i);
    if (v === undefined) {
      nav.centerInto(i, tmp);
      v = field.bodyLevel(tmp[0], nav.height[i]!, tmp[1], BODY_HEIGHT) >= LIGHT.shadow;
      litCache.set(i, v);
    }
    return v;
  };
  /** A clear sight line from an eye to the target point over cell i, within the focus range. */
  const sees = (eye: readonly number[], i: number): boolean => {
    nav.centerInto(i, tmp);
    const ty = nav.height[i]! + MEASURE_DEF.targetY;
    if (hyp3(tmp[0] - eye[0]!, ty - eye[1]!, tmp[1] - eye[2]!) > PERCEPTION.focusRange) return false;
    return sight.clear(eye[0]!, eye[1]!, eye[2]!, tmp[0], ty, tmp[1]);
  };
  const countSeen = (eye: readonly number[], cells: readonly number[]): number => {
    let n = 0;
    for (const i of cells) if (sees(eye, i)) n++;
    return n;
  };

  // --- spaces
  const spaces: Record<string, SpaceMeasured> = {};
  for (const s of graph.spaces) {
    const cells = floors.get(s.id);
    const area = areas.get(s.id);
    if (!cells || !area) continue;
    const m: SpaceMeasured = { shadow_pct: null, sees_pct: null, vantage_at: null, los_break_s: null, cells: cells.length, geom };
    spaces[s.id] = m;
    if (!cells.length) continue;
    let dark = 0;
    for (const i of cells) if (!lit(i)) dark++;
    m.shadow_pct = dark / cells.length;

    // vantage: the pinned feet point, else the best 1 m stride cell of the `from` space
    let vEye: V3 | null = null;
    if (s.vantage) {
      let at: V3 | null = null;
      if (s.vantage.at && s.vantage.at.length >= 3) {
        at = [s.vantage.at[0]!, s.vantage.at[1]!, s.vantage.at[2]!];
      } else {
        const from = floors.get(s.vantage.from);
        if (!from?.length) errors.push(`ERR ${s.id}: vantage.from '${s.vantage.from}' has no area / floor cells and no vantage.at`);
        else at = bestVantage(nav, from, cells, countSeen);
      }
      if (at) {
        vEye = [at[0], at[1] + EYE_STAND, at[2]];
        m.vantage_at = at;
        m.sees_pct = countSeen(vEye, cells) / cells.length;
      }
    }

    // LOS break (encounter spaces and any space with a vantage)
    if (s.type !== 'encounter' && !s.vantage) continue;
    const eyes: V3[] = vEye ? [vEye] : [];
    for (const g of opts.guards) {
      if (g.y !== undefined && Math.abs(g.y - s.storey) > MEASURE_DEF.storeyTol) continue;
      const fy = g.y ?? s.storey;
      const pts: (readonly [number, number])[] = [[g.x, g.z], ...(g.route ?? [])];
      for (const p of pts) if (inArea(area, p[0], p[1], fy, 0)) eyes.push([p[0], fy + EYE_STAND, p[1]]);
    }
    if (!eyes.length) continue;
    const exp = new Map<number, boolean>();
    const exposed = (i: number): boolean => {
      let v = exp.get(i);
      if (v === undefined) {
        v = lit(i) && eyes.some((e) => sees(e, i));
        exp.set(i, v);
      }
      return v;
    };
    const ring = cellsIn(nav, area, MEASURE_DEF.ring, () => true);
    const goals: P2[] = [];
    const ys: number[] = [];
    for (const i of ring) {
      if (exposed(i)) continue;
      goals.push(nav.center(i));
      ys.push(nav.height[i]!);
    }
    const dist = goals.length ? nav.flowField(goals, undefined, ys) : null;
    let worst = 0;
    for (const i of cells) if (exposed(i)) worst = Math.max(worst, dist ? dist[i]! : Infinity);
    if (worst === Infinity) errors.push(`ERR ${s.id}: an exposed floor cell has no break cell it can reach within ${MEASURE_DEF.ring} m of the area`);
    else m.los_break_s = (worst * nav.cell) / reachSpeed;
  }

  // --- links
  const centres = new Map<string, V3>();
  const centreOf = (id: string): V3 | null => {
    const c = centres.get(id);
    if (c) return c;
    const cells = floors.get(id);
    if (!cells?.length) return null;
    let sx = 0;
    let sz = 0;
    for (const i of cells) {
      nav.centerInto(i, tmp);
      sx += tmp[0];
      sz += tmp[1];
    }
    sx /= cells.length;
    sz /= cells.length;
    let best = cells[0]!;
    let bd = Infinity;
    for (const i of cells) {
      nav.centerInto(i, tmp);
      const d = hyp2(tmp[0] - sx, tmp[1] - sz);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    nav.centerInto(best, tmp);
    const out: V3 = [tmp[0], nav.height[best]!, tmp[1]];
    centres.set(id, out);
    return out;
  };
  const links: LinkMeasured[] = graph.links.map((l, k) => {
    const name = `link ${k} ${l.from} -> ${l.to} (${l.kind})`;
    if (OFF_NAV_KINDS.has(l.kind)) return { time_s: null, why: `${l.kind} is not on the nav grid (walks, ladders and drops only)` };
    const a = centreOf(l.from);
    const b = centreOf(l.to);
    if (!a || !b) return { time_s: null, why: `no area / floor cells on ${a ? l.to : l.from}` };
    let at: V3 | null = l.at && l.at.length >= 3 ? [l.at[0]!, l.at[1]!, l.at[2]!] : null;
    if (!at) {
      const e = edgePoint(nav, areas.get(l.from)!, areas.get(l.to)!, byId.get(l.from)!.storey, byId.get(l.to)!.storey, a, b);
      if (e.gaps === 0) return { time_s: null, why: `no walkable cell on the shared edge of ${l.from} and ${l.to} (set at)` };
      if (e.gaps > 1) errors.push(`ERR ${name}: the shared edge has ${e.gaps} gaps; set the link's at`);
      at = e.at;
    }
    const p1 = pathLength(nav, a, at);
    const p2 = pathLength(nav, at, b);
    if (p1 === null || p2 === null) return { time_s: null, why: `no nav path ${p1 === null ? `${l.from} centre -> at` : `at -> ${l.to} centre`}` };
    // a drop or ladder the nav does not link is walked round by the stairs: that is not its time
    if (!p1.links && !p2.links) {
      if (l.kind === 'drop') return { time_s: null, why: 'drop not on the guard nav (1.0-2.2 m only)' };
      if (l.kind === 'ladder') return { time_s: null, why: 'ladder not on the guard nav (no nav link on its path)' };
    }
    const path = p1.len + p2.len;
    return { time_s: path / splitSpeed, path_m: path };
  });

  // --- splits: leg times (the validator's legs, measured times first) and partner reach on the nav
  const splits: Record<string, SplitMeasured> = {};
  const legs = new Map<string, { a: string[]; b: string[] }>();
  for (const s of graph.spaces) {
    for (const t of s.tags ?? []) {
      const mt = SPLIT_TAG.exec(t);
      if (!mt) continue;
      const id = mt[1]!;
      if (!legs.has(id)) legs.set(id, { a: [], b: [] });
      legs.get(id)![mt[2] as 'a' | 'b'].push(s.id);
    }
  }
  const timeOf = (k: number): number | null => {
    const lm = links[k]!;
    if (lm.time_s !== null) return lm.time_s;
    const l = graph.links[k]!;
    if (typeof l.time_s === 'number') return l.time_s;
    if (WALK_KINDS.has(l.kind) && typeof l.length === 'number') return l.length / splitSpeed;
    return null;
  };
  for (const [id, leg] of legs) {
    const t = legTimes(graph, leg, timeOf);
    let reach: number | null = null;
    const ca = leg.a.flatMap((x) => floors.get(x) ?? []);
    const cb = leg.b.flatMap((x) => floors.get(x) ?? []);
    if (!ca.length || !cb.length) {
      errors.push(`ERR split ${id}: a leg has no area / floor cells (no reach measured)`);
    } else {
      const w = Math.max(worstTo(nav, ca, cb), worstTo(nav, cb, ca));
      if (w === Infinity) errors.push(`ERR split ${id}: some leg cell has no nav path to the other leg (rope / co-op only)`);
      else reach = (w * nav.cell) / reachSpeed;
    }
    splits[id] = { a_s: t.a, b_s: t.b, reach_s: reach };
  }

  return { spaces, links, meta: { tool: MEASURE_TOOL, date: opts.date ?? new Date().toISOString().slice(0, 10), geom, splits }, errors };
}

/** Is (x, z) (feet y) in the area, `pad` m round its boxes? A RoomDef area also checks the room's storey bounds. */
function inArea(a: Area, x: number, z: number, y: number, pad: number): boolean {
  if (a.room) return inRoom(a.room, x, z, pad, y);
  for (const b of a.boxes) if (x >= b[0] - pad && x <= b[2] + pad && z >= b[1] - pad && z <= b[3] + pad) return true;
  return false;
}

/** Walkable cells (any layer) whose centre is in the area grown by `pad`, with a height `keep` accepts (sorted, unique). */
function cellsIn(nav: NavGrid, a: Area, pad: number, keep: (h: number) => boolean): number[] {
  const out = new Set<number>();
  const tmp: P2 = [0, 0];
  for (const b of a.boxes) {
    const ix0 = Math.max(0, Math.floor((b[0] - pad - nav.ox) / nav.cell));
    const ix1 = Math.min(nav.w - 1, Math.floor((b[2] + pad - nav.ox) / nav.cell));
    const iz0 = Math.max(0, Math.floor((b[1] - pad - nav.oz) / nav.cell));
    const iz1 = Math.min(nav.h - 1, Math.floor((b[3] + pad - nav.oz) / nav.cell));
    for (let iz = iz0; iz <= iz1; iz++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const col = iz * nav.w + ix;
        for (let l = 0; l < nav.layers; l++) {
          const i = l * nav.cols + col;
          if (!nav.walk[i]) continue;
          const h = nav.height[i]!;
          if (!keep(h)) continue;
          nav.centerInto(i, tmp);
          if (inArea(a, tmp[0], tmp[1], pad ? Number.NaN : h, pad)) out.add(i);
        }
      }
    }
  }
  return [...out].sort((p, q) => p - q);
}

/** The worst over `from` cells of the nav distance (cells) to the nearest `to` cell (Infinity = some cell unreached). */
function worstTo(nav: NavGrid, from: readonly number[], to: readonly number[]): number {
  const goals = to.map((i) => nav.center(i));
  const d = nav.flowField(goals, undefined, to.map((i) => nav.height[i]!));
  let w = 0;
  for (const i of from) w = Math.max(w, d[i]!);
  return w;
}

/** The vantage search: the `from` cell (1 m stride) whose eye sees the most of the target cells (first on a tie). */
function bestVantage(nav: NavGrid, from: readonly number[], cells: readonly number[], countSeen: (eye: readonly number[], cells: readonly number[]) => number): V3 {
  const k = Math.max(1, Math.round(MEASURE_DEF.stride / nav.cell));
  let best: V3 | null = null;
  let bn = -1;
  const tmp: P2 = [0, 0];
  for (const i of from) {
    const col = i % nav.cols;
    if ((col % nav.w) % k !== 0 || ((col / nav.w) | 0) % k !== 0) continue;
    nav.centerInto(i, tmp);
    const h = nav.height[i]!;
    const n = countSeen([tmp[0], h + EYE_STAND, tmp[1]], cells);
    if (n > bn) {
      bn = n;
      best = [tmp[0], h, tmp[1]];
    }
  }
  if (best) return best;
  // fewer cells than the stride: the first one
  nav.centerInto(from[0]!, tmp);
  return [tmp[0], nav.height[from[0]!]!, tmp[1]];
}

/**
 * A link with no `at`: the walkable cells on the shared edge of the two areas (inside both grown by one nav cell, on
 * either storey), split into gaps (8-connected runs); the cell nearest both centres.
 */
function edgePoint(nav: NavGrid, a: Area, b: Area, ya: number, yb: number, ca: V3, cb: V3): { at: V3; gaps: number } {
  const pad = nav.cell;
  const near = (h: number): boolean => Math.abs(h - ya) <= MEASURE_DEF.storeyTol || Math.abs(h - yb) <= MEASURE_DEF.storeyTol;
  const inA = new Set(cellsIn(nav, a, pad, near));
  const both = cellsIn(nav, b, pad, near).filter((i) => inA.has(i));
  const set = new Set(both);
  const seen = new Set<number>();
  let gaps = 0;
  for (const s of both) {
    if (seen.has(s)) continue;
    gaps++;
    const stack = [s];
    seen.add(s);
    while (stack.length) {
      const i = stack.pop()!;
      for (const j of nav.neighbours(i)) {
        if (set.has(j) && !seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
  }
  let best = -1;
  let bd = Infinity;
  const tmp: P2 = [0, 0];
  for (const i of both) {
    nav.centerInto(i, tmp);
    const d = hyp2(tmp[0] - ca[0], tmp[1] - ca[2]) + hyp2(tmp[0] - cb[0], tmp[1] - cb[2]);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  if (best < 0) return { at: [0, 0, 0], gaps: 0 };
  nav.centerInto(best, tmp);
  return { at: [tmp[0], nav.height[best]!, tmp[1]], gaps };
}

/** The nav path a -> b: its length (m; the smoothed waypoints in plan, a ladder / drop by its own 3D run) and how many
 *  nav links (ladders, drops) it takes; null = no path. */
function pathLength(nav: NavGrid, a: V3, b: V3): { len: number; links: number } | null {
  const wps: Waypoint[] | null = nav.findPath([a[0], a[2]], [b[0], b[2]], nav.walk.length, a[1], b[1]);
  if (!wps) return null;
  let len = 0;
  let links = 0;
  let px = a[0];
  let pz = a[2];
  for (const w of wps) {
    len += hyp2(w[0] - px, w[1] - pz);
    px = w[0];
    pz = w[1];
    const lk = w.link;
    if (!lk) continue;
    links++;
    // the next waypoint lies past the link's far end: the run along the link, then on from its end
    const p = lk.pts;
    for (let j = 3; j < p.length; j += 3) len += hyp3(p[j]! - p[j - 3]!, p[j + 1]! - p[j - 2]!, p[j + 2]! - p[j - 1]!);
    px = p[p.length - 3]!;
    pz = p[p.length - 1]!;
  }
  return { len, links };
}

/**
 * Split leg times as `scripts/level-validate.mjs` composes them (graph-schema "How the checks read the graph"): the
 * link into the first leg space from the fork, the links between leg spaces, the fastest link out of the last leg space
 * to the rejoin space; solo links only, each at its measured time first. null: a hop with no link or no time.
 */
function legTimes(graph: MeasureGraphInput, leg: { a: string[]; b: string[] }, timeOf: (k: number) => number | null): { a: number | null; b: number | null } {
  if (!leg.a.length || !leg.b.length) return { a: null, b: null };
  const arcs: { from: string; to: string; k: number }[] = [];
  graph.links.forEach((l, k) => {
    if (COOP_KINDS.has(l.kind)) return;
    arcs.push({ from: l.from, to: l.to, k });
    if (!isOneWay(l)) arcs.push({ from: l.to, to: l.from, k });
  });
  const order = new Map(graph.spaces.map((s, i) => [s.id, i]));
  const byOrder = (x: string, y: string): number => order.get(x)! - order.get(y)!;
  const inLegs = new Set([...leg.a, ...leg.b]);
  const into = (first: string): Set<string> => new Set(arcs.filter((r) => r.to === first && !inLegs.has(r.from)).map((r) => r.from));
  const intoA = into(leg.a[0]!);
  const intoB = into(leg.b[0]!);
  const fork = [...intoA].filter((x) => intoB.has(x)).sort(byOrder)[0];
  const outOf = (x: string): Set<string> => new Set(arcs.filter((r) => r.from === x && !inLegs.has(r.to) && r.to !== fork).map((r) => r.to));
  const outB = outOf(leg.b[leg.b.length - 1]!);
  const rejoin = [...outOf(leg.a[leg.a.length - 1]!)].filter((x) => outB.has(x)).sort(byOrder)[0];
  if (rejoin === undefined) return { a: null, b: null };
  const one = (side: string[], intoSide: Set<string>): number | null => {
    const from = fork ?? [...intoSide].sort(byOrder)[0];
    if (from === undefined) return null;
    const hops: [string, string][] = [[from, side[0]!], ...side.slice(1).map((x, i): [string, string] => [side[i]!, x]), [side[side.length - 1]!, rejoin]];
    let total = 0;
    for (const [x, y] of hops) {
      let best: number | null = null;
      for (const r of arcs) {
        if (r.from !== x || r.to !== y) continue;
        const t = timeOf(r.k);
        if (t !== null && (best === null || t < best)) best = t;
      }
      if (best === null) return null;
      total += best;
    }
    return total;
  };
  return { a: one(leg.a, intoA), b: one(leg.b, intoB) };
}
