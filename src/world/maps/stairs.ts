/**
 * Stairs, pure and Babylon-free (ON2): the one place the stair maths lives. `stairSize` is the A11 sizing rule
 * (docs/kestrel/schema.md `stairs[].layout`, scripts/kestrel/check.mjs A11): risers from the floor-to-floor height, risers
 * per flight, the landing and the smallest rect. `stairLayout` turns a stair in the file into flights and landings; the
 * game's walk test (`kestrel.ts`) and the level editor's 3D both draw from it, and both split the risers between flights
 * with `stairSplit`. Every size the rule needs comes in as `StairFacts` (the editor reads scripts/kestrel/facts.json);
 * the layout reads only the file.
 */

/** The facts the sizing rule reads (scripts/kestrel/facts.json group `stair`). */
export interface StairFacts {
  riserHeight: number;
  going: number;
  maxRisersPerFlight: number;
  midLanding: number;
  fireLanding: number;
  fireWidth: number;
  mainWidth: number;
  featureWidth: number;
}

export interface StairQuery {
  /** Floor-to-floor height (m). */
  rise: number;
  kind: string;
  layout: 'dogleg' | 'straight';
  /** Clear flight width; default the kind's width. */
  width?: number;
}

export interface StairSize {
  risers: number;
  /** The real riser height: rise / risers. */
  riserHeight: number;
  going: number;
  flights: number;
  /** Risers in the longest flight. */
  perFlight: number;
  /** Landing depth (dogleg: the far landing; straight: each mid landing; 0 for one flight). */
  landing: number;
  width: number;
  /** The smallest rect: along the climb, and across it. */
  length: number;
  across: number;
  /** Over the per-flight maximum (a dogleg of more than twice the maximum). */
  tooMany: boolean;
}

/** The width a stair kind gets when none is given: fire 1.3, feature 2.4, main (and the rest) the main stair width. */
export function kindWidth(kind: string, f: StairFacts): number {
  if (kind === 'fire') return f.fireWidth;
  if (kind === 'feature') return f.featureWidth;
  return f.mainWidth;
}

/** Risers per flight, first flight first: a dogleg is two (the first takes the odd one), a straight run the fewest under the maximum or `flights`. */
export function stairSplit(risers: number, layout: string | undefined, maxPerFlight: number, flights?: number): number[] {
  const n = layout === 'dogleg' ? 2 : flights && flights >= 1 ? Math.floor(flights) : Math.max(1, Math.ceil(risers / maxPerFlight));
  const out: number[] = [];
  let left = risers;
  for (let i = 0; i < n; i++) {
    const k = Math.ceil(left / (n - i));
    out.push(k);
    left -= k;
  }
  return out;
}

/** The A11 rule: risers, flights, landing and the smallest rect for a stair climbing `rise`. */
export function stairSize(q: StairQuery, f: StairFacts): StairSize {
  const risers = Math.max(2, Math.round(q.rise / f.riserHeight));
  const width = q.width ?? kindWidth(q.kind, f);
  const split = stairSplit(risers, q.layout, f.maxRisersPerFlight);
  const perFlight = Math.max(...split);
  if (q.layout === 'dogleg') {
    const landing = q.kind === 'fire' ? f.fireLanding : f.midLanding;
    return { risers, riserHeight: q.rise / risers, going: f.going, flights: 2, perFlight, landing, width, length: (perFlight - 1) * f.going + landing, across: 2 * width, tooMany: perFlight > f.maxRisersPerFlight };
  }
  const flights = split.length;
  const landing = flights > 1 ? f.midLanding : 0;
  return { risers, riserHeight: q.rise / risers, going: f.going, flights, perFlight, landing, width, length: (risers - flights) * f.going + (flights - 1) * f.midLanding, across: width, tooMany: false };
}

// ---------- the layout the game and the editor draw ----------
export type Dir = 'N' | 'S' | 'E' | 'W';
type Rect = readonly [number, number, number, number];

/** What the layout reads of the file: the levels' floors, the walls (thickness, for the inset) and the openings (dogleg side). */
export interface StairCtx {
  levels: readonly { id: string; floor: number }[];
  walls: readonly { id: string; level: string; a: readonly [number, number]; b: readonly [number, number]; t: number }[];
  openings: readonly { wall: string; at: number }[];
}
export interface StairData {
  from: string;
  to: string;
  rect: Rect;
  up: Dir;
  width?: number;
  risers?: number;
  layout?: string;
  flights?: number;
}

export interface Flight {
  /** Centre of the flight's plan, width across, length along `yaw`. */
  c: [number, number];
  w: number;
  len: number;
  /** Climb direction (0 = +Z, as `LevelBuilder.stairs`). */
  yaw: number;
  /** Height of its low end, rise over its length, and the number of steps (risers). */
  y: number;
  rise: number;
  steps: number;
}
export interface StairLayout {
  flights: Flight[];
  /** Mid landing of a dog-leg: plan rect and top height. */
  landing: { rect: [number, number, number, number]; top: number } | null;
  /** The mid landings of a straight run of several flights. */
  landings: { rect: [number, number, number, number]; top: number }[];
  /** On flight 1 near its foot (level `from`) and on the last flight near its head (level `to`). */
  foot: [number, number];
  head: [number, number];
}

const DIR: Record<string, [number, number, number]> = { N: [0, 1, 0], S: [0, -1, Math.PI], E: [1, 0, Math.PI / 2], W: [-1, 0, -Math.PI / 2] };
const EPS = 1e-6;
/** A straight run with no `flights` field stays one flight in the layout, as the walk test always built it. */
const ONE_RUN = Infinity;

function floorOf(ctx: StairCtx, id: string): number {
  const l = ctx.levels.find((q) => q.id === id);
  if (!l) throw new Error(`kestrel stair: unknown level ${id}`);
  return l.floor;
}

/**
 * A stair as flights. Flights run from the stair rect's edge on the `from` side to the far edge, inset from the walls by half
 * the thinnest wall. A dog-leg is two flights side by side, a landing as deep as the stair is wide at the far end; the first
 * flight sits in the column nearer the opening on the `from` level's edge. A straight run with `flights` over 1 has a mid
 * landing (as deep as the stair is wide) between its flights, the rest of the rect shared by riser count.
 */
export function stairLayout(ctx: StairCtx, s: StairData): StairLayout {
  const f0 = floorOf(ctx, s.from);
  const f1 = floorOf(ctx, s.to);
  const [dx, dz, yaw] = DIR[s.up]!;
  const alongZ = dx === 0;
  const thin = ctx.walls.reduce((m, q) => Math.min(m, q.t), Infinity);
  const half = Number.isFinite(thin) ? thin / 2 : 0;
  const [x0, z0, x1, z1] = s.rect;
  const a0 = alongZ ? z0 : x0;
  const a1 = alongZ ? z1 : x1;
  const c0 = (alongZ ? x0 : z0) + half;
  const c1 = (alongZ ? x1 : z1) - half;
  const dir = alongZ ? dz : dx;
  const u0 = dir > 0 ? a0 : a1;
  const uFar = dir > 0 ? a1 : a0;
  const total = f1 - f0;
  const risers = s.risers ?? 2;
  const at = (u: number, c: number): [number, number] => (alongZ ? [c, u] : [u, c]);
  const w = s.width ?? Math.max(0.5, c1 - c0);
  const span = Math.abs(uFar - u0);
  if (s.layout !== 'dogleg') {
    const col = (c0 + c1) / 2;
    let split = stairSplit(risers, s.layout, ONE_RUN, s.flights);
    // mid landings as deep as the stair is wide; a rect too short for them: one run
    const mid = w;
    if (split.length > 1 && span - (split.length - 1) * mid <= EPS) split = [risers];
    const runLen = span - (split.length - 1) * mid;
    const flights: Flight[] = [];
    const landings: StairLayout['landings'] = [];
    let u = u0;
    let y = f0;
    split.forEach((k, i) => {
      const len = (runLen * k) / risers;
      const rise = (total * k) / risers;
      flights.push({ c: at(u + (dir * len) / 2, col), w, len, yaw, y, rise, steps: k });
      u += dir * len;
      y += rise;
      if (i < split.length - 1) {
        const ue = u + dir * mid;
        landings.push({ rect: alongZ ? [c0, Math.min(u, ue), c1, Math.max(u, ue)] : [Math.min(u, ue), c0, Math.max(u, ue), c1], top: y });
        u = ue;
      }
    });
    return { flights, landing: null, landings, foot: at(u0 + dir * 0.1, col), head: at(u - dir * 0.1, col) };
  }
  const run = span - w;
  const [n1, n2] = stairSplit(risers, 'dogleg', ONE_RUN) as [number, number];
  const rise1 = (total * n1) / risers;
  const uEnd = u0 + dir * run;
  const midU = (u0 + uEnd) / 2;
  const colLow = c0 + w / 2;
  const colHigh = c1 - w / 2;
  // the opening on the start edge decides the column of flight 1
  let first = colLow;
  for (const o of ctx.openings) {
    const wall = ctx.walls.find((q) => q.id === o.wall);
    if (!wall || wall.level !== s.from) continue;
    const onEdge = alongZ ? Math.abs(wall.a[1] - u0) < EPS && Math.abs(wall.b[1] - u0) < EPS : Math.abs(wall.a[0] - u0) < EPS && Math.abs(wall.b[0] - u0) < EPS;
    if (!onEdge) continue;
    const ai = alongZ ? 0 : 1;
    const centre = wall.a[ai]! + (wall.b[ai]! >= wall.a[ai]! ? 1 : -1) * o.at;
    if (centre > c0 && centre < c1) first = Math.abs(centre - colLow) <= Math.abs(centre - colHigh) ? colLow : colHigh;
  }
  const second = first === colLow ? colHigh : colLow;
  const lRect: [number, number, number, number] = alongZ ? [c0, Math.min(uEnd, uFar), c1, Math.max(uEnd, uFar)] : [Math.min(uEnd, uFar), c0, Math.max(uEnd, uFar), c1];
  return {
    flights: [
      { c: at(midU, first), w, len: run, yaw, y: f0, rise: rise1, steps: n1 },
      { c: at(midU, second), w, len: run, yaw: yaw + Math.PI, y: f0 + rise1, rise: total - rise1, steps: n2 },
    ],
    landing: { rect: lRect, top: f0 + rise1 },
    landings: [],
    foot: at(u0 + dir * 0.1, first),
    head: at(u0 + dir * 0.1, second),
  };
}
