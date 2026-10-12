/**
 * Kestrel roofs (ON10), pure and import-free so the editor, the walk test and the plan script (`scripts/kestrel/plans.mjs`
 * imports this file directly) share one copy: a roof record (schema.md section 2 `roofs[]`) to planes (convex polygons),
 * its ridge and hip lines, the plan's arrows and heights, and the boxes and panes the walk test builds.
 *
 * Every roof is an axis-aligned plan rect (the wall line); `base` is the eaves height at that line. An overhang carries the
 * same slope past the wall line, so the eaves drop by overhang x tan(pitch) and the ridge stays where it is. Every sloped
 * plane rises toward one compass direction, so the walk test builds it from strips the game's boxes can tilt (yaw and pitch).
 * Flat roofs are level at `base`: the fall (1-2 degrees) is drawn as arrows, not modelled in height (it is in the screed).
 */

export type Dir = 'N' | 'E' | 'S' | 'W';
export type P3 = [number, number, number];
export type RoofType = 'flat' | 'mono' | 'gable' | 'hip' | 'sawtooth' | 'curved';
export const ROOF_TYPE_IDS: readonly RoofType[] = ['flat', 'mono', 'gable', 'hip', 'sawtooth', 'curved'];

/** A roof as the campus file stores it. The editor writes every setting its type has. */
export interface RoofData {
  id: string;
  name?: string;
  building?: string;
  /** The level it was drawn on (the editor shows and selects it there). */
  level: string;
  rect: [number, number, number, number];
  /** Eaves height above ground floor level, at the wall line. */
  base: number;
  type: string;
  /** Degrees (mono, gable, hip, sawtooth). */
  pitch?: number;
  /** Mono: the high side. */
  high?: Dir;
  /** Gable ridge, curved barrel axis: along x (east-west) or z (north-south). */
  ridge?: 'x' | 'z';
  /** Flat: fall in degrees and the side it falls to. */
  fall?: number;
  fallsTo?: Dir;
  /** Flat: a parapet wall or a low upstand round the edge, and their heights. */
  edge?: 'parapet' | 'upstand';
  parapet?: number;
  upstand?: number;
  /** Sawtooth: tooth width and the side the glass faces. */
  tooth?: number;
  glazed?: Dir;
  /** Curved: rise of the barrel above the eaves. */
  rise?: number;
  overhang?: number;
  fascia?: number;
  material?: string;
  colour?: string;
  gutter?: boolean;
  downpipes?: boolean;
  [k: string]: unknown;
}

/** Build sizes (metres), each with its source. Geometry resolution (strips, facets) is drawing only. */
export const ROOF_BUILD = {
  deck: { value: 0.2, src: 'editor default: typical roof deck and insulation depth' },
  parapetThick: { value: 0.3, src: 'editor default: blockwork parapet (RULES s6 interior wall 0.3)' },
  upstandThick: { value: 0.2, src: 'editor default: typical membrane upstand kerb' },
  fasciaThick: { value: 0.05, src: 'editor default: fascia board, at the light bake minimum (lightShapes CANON_MIN_THICK)' },
  gutter: { value: 0.15, src: 'editor default: typical 150 mm eaves gutter' },
  downpipe: { value: 0.1, src: 'editor default: typical 100 mm downpipe' },
  strip: { value: 0.5, src: 'drawing only: the walk test builds a sloped plane from strips this long' },
  facets: { value: 12, src: 'drawing only: facets across a barrel roof' },
} as const;
const B = (k: keyof typeof ROOF_BUILD): number => ROOF_BUILD[k].value;

/** Roof colours (the card's Colour row), plain names. */
export const ROOF_COLOURS: readonly { id: string; name: string; hex: string }[] = [
  { id: 'grey', name: 'Grey', hex: '#8d9096' },
  { id: 'dark-grey', name: 'Dark grey', hex: '#55595f' },
  { id: 'charcoal', name: 'Charcoal', hex: '#36393d' },
  { id: 'off-white', name: 'Off-white', hex: '#d6d3ca' },
  { id: 'terracotta', name: 'Terracotta', hex: '#9b5434' },
  { id: 'green', name: 'Green', hex: '#4e6a4b' },
  { id: 'blue-grey', name: 'Blue-grey', hex: '#5c6c7c' },
];
/** Roof materials and the colour each starts with. */
export const ROOF_MATERIALS: readonly { id: string; name: string; colour: string; src: string }[] = [
  { id: 'metal', name: 'Metal deck', colour: 'grey', src: 'editor default: profiled steel sheet' },
  { id: 'concrete', name: 'Concrete', colour: 'off-white', src: 'editor default: cast slab' },
  { id: 'membrane', name: 'Membrane', colour: 'charcoal', src: '02-building-brief: flat single-ply roofs' },
  { id: 'tile', name: 'Tile', colour: 'terracotta', src: 'editor default: concrete or clay tiles' },
];
export const roofHex = (r: Pick<RoofData, 'colour' | 'material'>): string => {
  const id = r.colour ?? ROOF_MATERIALS.find((m) => m.id === r.material)?.colour ?? 'grey';
  return (ROOF_COLOURS.find((c) => c.id === id) ?? ROOF_COLOURS[0]!).hex;
};

export type PlaneKind = 'roof' | 'end' | 'glass';
export interface RoofPlane {
  kind: PlaneKind;
  /** A convex polygon, in order round its edge. */
  pts: P3[];
  /** The direction it rises toward (sloped roof planes), null when level or upright. */
  up: Dir | null;
  /** Slope in degrees (0 level, 90 upright). */
  pitch: number;
}
export interface RoofEdge {
  a: P3;
  b: P3;
  /** A low, level edge (a gutter runs along it). */
  eaves: boolean;
}
export interface RoofShape {
  planes: RoofPlane[];
  /** The outer edges of the roof planes (fascia and barge boards). */
  edges: RoofEdge[];
  ridges: [P3, P3][];
  hips: [P3, P3][];
  /** Highest point of the roof surface. */
  ridgeHeight: number;
  /** The steepest walkable-surface slope, degrees (glass and end walls not counted). */
  steepest: number;
  /** The plan outline with the overhang. */
  outer: [number, number, number, number];
}

const tanD = (deg: number): number => Math.tan((deg * Math.PI) / 180);
const atanD = (v: number): number => (Math.atan(v) * 180) / Math.PI;
const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * A plan frame: `a` across (the slope axis), `c` along (the ridge axis). `w` maps (a, y, c) to world [x, y, z].
 * axis 'x': the ridge runs along x, so a = z (rising +a is north); axis 'z': a = x (rising +a is east).
 */
interface Frame {
  a0: number;
  a1: number;
  c0: number;
  c1: number;
  w: (a: number, y: number, c: number) => P3;
  aPlus: Dir;
  aMinus: Dir;
  cPlus: Dir;
  cMinus: Dir;
}
function frame(rect: readonly number[], axis: 'x' | 'z'): Frame {
  const [x0, z0, x1, z1] = rect as [number, number, number, number];
  return axis === 'x'
    ? { a0: z0, a1: z1, c0: x0, c1: x1, w: (a, y, c) => [c, y, a], aPlus: 'N', aMinus: 'S', cPlus: 'E', cMinus: 'W' }
    : { a0: x0, a1: x1, c0: z0, c1: z1, w: (a, y, c) => [a, y, c], aPlus: 'E', aMinus: 'W', cPlus: 'N', cMinus: 'S' };
}
/** The frame whose `a` runs toward `d` (N or S: a = z; E or W: a = x), and whether d is +a. */
const frameToward = (rect: readonly number[], d: Dir): [Frame, boolean] => [frame(rect, d === 'N' || d === 'S' ? 'x' : 'z'), d === 'N' || d === 'E'];

export const outerRect = (r: Pick<RoofData, 'rect' | 'overhang'>): [number, number, number, number] => {
  const o = Math.max(0, r.overhang ?? 0);
  return [r.rect[0] - o, r.rect[1] - o, r.rect[2] + o, r.rect[3] + o];
};
const longAxis = (rect: readonly number[]): 'x' | 'z' => (rect[2]! - rect[0]! >= rect[3]! - rect[1]! ? 'x' : 'z');

/** The roof as planes, edges, ridge and hip lines. */
export function roofShape(r: RoofData): RoofShape {
  const b = r.base;
  const o = Math.max(0, r.overhang ?? 0);
  const outer = outerRect(r);
  const planes: RoofPlane[] = [];
  const edges: RoofEdge[] = [];
  const ridges: [P3, P3][] = [];
  const hips: [P3, P3][] = [];
  const quadEdges = (p: P3[], eaves: (boolean | null)[]): void => {
    for (let i = 0; i < p.length; i++) {
      const ev = eaves[i];
      if (ev !== null && ev !== undefined) edges.push({ a: p[i]!, b: p[(i + 1) % p.length]!, eaves: ev });
    }
  };
  let ridgeHeight = b;
  let steepest = 0;
  const type = r.type as RoofType;

  if (type === 'gable' || type === 'mono' || type === 'sawtooth') {
    const p = r.pitch ?? 0;
    const t = tanD(p);
    steepest = p;
    // the frame across the slope: gable by its ridge setting, mono by its high side, sawtooth by its glazed side
    const [f, plus] = type === 'gable' ? [frame(r.rect, r.ridge ?? longAxis(r.rect)), true] : frameToward(r.rect, (type === 'mono' ? r.high : r.glazed) ?? 'N');
    const e = frame(outer, type === 'gable' ? (r.ridge ?? longAxis(r.rect)) : f.aPlus === 'N' ? 'x' : 'z');
    const span = f.a1 - f.a0;
    // s: distance from the low wall line in the rising direction; a(s) back to the frame
    const aOf = (s: number): number => (plus ? f.a0 + s : f.a1 - s);
    const up = plus ? f.aPlus : f.aMinus;
    if (type === 'gable') {
      const half = span / 2;
      const ac = (f.a0 + f.a1) / 2;
      const top = b + half * t;
      const be = b - o * t;
      const s1: P3[] = [f.w(e.a0, be, e.c0), f.w(e.a0, be, e.c1), f.w(ac, top, e.c1), f.w(ac, top, e.c0)];
      const s2: P3[] = [f.w(e.a1, be, e.c1), f.w(e.a1, be, e.c0), f.w(ac, top, e.c0), f.w(ac, top, e.c1)];
      planes.push({ kind: 'roof', pts: s1, up: f.aPlus, pitch: p }, { kind: 'roof', pts: s2, up: f.aMinus, pitch: p });
      quadEdges(s1, [true, false, null, false]);
      quadEdges(s2, [true, false, null, false]);
      for (const c of [f.c0, f.c1]) planes.push({ kind: 'end', pts: [f.w(f.a0, b, c), f.w(f.a1, b, c), f.w(ac, top, c)], up: null, pitch: 90 });
      ridges.push([f.w(ac, top, e.c0), f.w(ac, top, e.c1)]);
      ridgeHeight = top;
    } else if (type === 'mono') {
      const top = b + span * t;
      const sLo = -o;
      const sHi = span + o;
      const pl: P3[] = [f.w(aOf(sLo), b + sLo * t, e.c0), f.w(aOf(sLo), b + sLo * t, e.c1), f.w(aOf(sHi), b + sHi * t, e.c1), f.w(aOf(sHi), b + sHi * t, e.c0)];
      planes.push({ kind: 'roof', pts: pl, up, pitch: p });
      quadEdges(pl, [true, false, false, false]);
      // the two cheeks and the high wall under the roof
      for (const c of [f.c0, f.c1]) planes.push({ kind: 'end', pts: [f.w(aOf(0), b, c), f.w(aOf(span), b, c), f.w(aOf(span), top, c)], up: null, pitch: 90 });
      planes.push({ kind: 'end', pts: [f.w(aOf(span), b, f.c0), f.w(aOf(span), b, f.c1), f.w(aOf(span), top, f.c1), f.w(aOf(span), top, f.c0)], up: null, pitch: 90 });
      ridgeHeight = b + sHi * t;
    } else {
      // sawtooth: n teeth across the span, each a slope rising toward the glazed side and an upright glass face
      const n = sawtoothCount(r);
      const tw = span / n;
      const th = tw * t;
      for (let k = 0; k < n; k++) {
        const s0 = k * tw - (k === 0 ? o : 0);
        const s1 = (k + 1) * tw;
        const y0 = b + (s0 - k * tw) * t;
        const pl: P3[] = [f.w(aOf(s0), y0, e.c0), f.w(aOf(s0), y0, e.c1), f.w(aOf(s1), b + th, e.c1), f.w(aOf(s1), b + th, e.c0)];
        planes.push({ kind: 'roof', pts: pl, up, pitch: p });
        quadEdges(pl, [k === 0, false, null, false]);
        planes.push({ kind: 'glass', pts: [f.w(aOf(s1), b, f.c0), f.w(aOf(s1), b, f.c1), f.w(aOf(s1), b + th, f.c1), f.w(aOf(s1), b + th, f.c0)], up: null, pitch: 90 });
        for (const c of [f.c0, f.c1]) planes.push({ kind: 'end', pts: [f.w(aOf(k * tw), b, c), f.w(aOf(s1), b, c), f.w(aOf(s1), b + th, c)], up: null, pitch: 90 });
        ridges.push([f.w(aOf(s1), b + th, e.c0), f.w(aOf(s1), b + th, e.c1)]);
      }
      ridgeHeight = b + th;
    }
  } else if (type === 'hip') {
    const p = r.pitch ?? 0;
    const t = tanD(p);
    steepest = p;
    const axis = longAxis(r.rect);
    const f = frame(r.rect, axis);
    const e = frame(outer, axis);
    const half = (f.a1 - f.a0) / 2;
    const ac = (f.a0 + f.a1) / 2;
    const top = b + half * t;
    const be = b - o * t;
    const eh = half + o;
    // the ridge ends a half span (plus the overhang) in from each end; a square roof meets at a point
    const rc0 = Math.min(e.c0 + eh, (e.c0 + e.c1) / 2);
    const rc1 = Math.max(e.c1 - eh, (e.c0 + e.c1) / 2);
    const R0 = f.w(ac, top, rc0);
    const R1 = f.w(ac, top, rc1);
    const C00 = f.w(e.a0, be, e.c0);
    const C01 = f.w(e.a0, be, e.c1);
    const C10 = f.w(e.a1, be, e.c0);
    const C11 = f.w(e.a1, be, e.c1);
    const pointy = rc1 - rc0 < 1e-6;
    planes.push({ kind: 'roof', pts: pointy ? [C00, C01, R0] : [C00, C01, R1, R0], up: f.aPlus, pitch: p });
    planes.push({ kind: 'roof', pts: pointy ? [C11, C10, R0] : [C11, C10, R0, R1], up: f.aMinus, pitch: p });
    planes.push({ kind: 'roof', pts: [C10, C00, R0], up: f.cPlus, pitch: p });
    planes.push({ kind: 'roof', pts: [C01, C11, R1], up: f.cMinus, pitch: p });
    edges.push({ a: C00, b: C01, eaves: true }, { a: C01, b: C11, eaves: true }, { a: C11, b: C10, eaves: true }, { a: C10, b: C00, eaves: true });
    if (!pointy) ridges.push([R0, R1]);
    hips.push([C00, R0], [C10, R0], [C01, R1], [C11, R1]);
    ridgeHeight = top;
  } else if (type === 'curved') {
    const axis = r.ridge ?? longAxis(r.rect);
    const f = frame(r.rect, axis);
    const e = frame(outer, axis);
    const S = f.a1 - f.a0;
    const rise = Math.max(0.01, Math.min(r.rise ?? 0, S / 2));
    const R = (S * S) / 4 / (2 * rise) + rise / 2;
    const ac = (f.a0 + f.a1) / 2;
    const yAt = (u: number): number => {
      const q = Math.min(Math.abs(u), R * 0.999);
      return b + rise - R + Math.sqrt(R * R - q * q);
    };
    const N = B('facets');
    const uo = S / 2 + o;
    const us: number[] = [];
    for (let i = 0; i <= N; i++) us.push(-uo + (2 * uo * i) / N);
    for (let i = 0; i < N; i++) {
      const u0 = us[i]!;
      const u1 = us[i + 1]!;
      const y0 = yAt(u0);
      const y1 = yAt(u1);
      const pl: P3[] = [f.w(ac + u0, y0, e.c0), f.w(ac + u0, y0, e.c1), f.w(ac + u1, y1, e.c1), f.w(ac + u1, y1, e.c0)];
      const pitch = atanD(Math.abs(y1 - y0) / (u1 - u0));
      steepest = Math.max(steepest, pitch);
      planes.push({ kind: 'roof', pts: pl, up: Math.abs(y1 - y0) < 1e-9 ? null : y1 > y0 ? f.aPlus : f.aMinus, pitch });
      quadEdges(pl, [i === 0, false, i === N - 1, false]);
    }
    // the two end walls under the barrel, on the wall line
    for (const c of [f.c0, f.c1]) {
      const pts: P3[] = [];
      for (let i = 0; i <= N; i++) {
        const u = -S / 2 + (S * i) / N;
        pts.push(f.w(ac + u, i === 0 || i === N ? b : yAt(u), c));
      }
      planes.push({ kind: 'end', pts, up: null, pitch: 90 });
    }
    ridges.push([f.w(ac, b + rise, e.c0), f.w(ac, b + rise, e.c1)]);
    ridgeHeight = b + rise;
  } else {
    // flat (and any unknown type): level at the eaves height
    const [x0, z0, x1, z1] = outer;
    const pl: P3[] = [
      [x0, b, z0],
      [x1, b, z0],
      [x1, b, z1],
      [x0, b, z1],
    ];
    planes.push({ kind: 'roof', pts: pl, up: null, pitch: 0 });
    const low = r.fallsTo ?? 'S';
    // edges S, E, N, W in that order round the quad
    const sides: Dir[] = ['S', 'E', 'N', 'W'];
    quadEdges(pl, sides.map((d) => d === low && r.edge !== 'parapet'));
  }
  return { planes, edges, ridges, hips, ridgeHeight: r3(ridgeHeight), steepest, outer };
}

/** Sawtooth teeth: the span over the tooth width, rounded, at least one. */
export function sawtoothCount(r: Pick<RoofData, 'rect' | 'glazed' | 'tooth'>): number {
  const d = r.glazed ?? 'N';
  const span = d === 'N' || d === 'S' ? r.rect[3] - r.rect[1] : r.rect[2] - r.rect[0];
  return Math.max(1, Math.round(span / Math.max(0.1, r.tooth ?? span)));
}

/** Hip ridge length: the long side less the short side (0 for a square roof: a pyramid). */
export const hipRidgeLength = (rect: readonly number[]): number => r3(Math.abs(rect[2]! - rect[0]! - (rect[3]! - rect[1]!)));

// ---------- the plan ----------
export interface RoofPlanMarks {
  /** Dashed: the outline with the overhang; solid thin: the wall line. */
  outer: [number, number, number, number];
  wall: [number, number, number, number];
  ridges: [[number, number], [number, number]][];
  hips: [[number, number], [number, number]][];
  /** Arrows pointing down the slope (fall arrows on a flat roof), from `at` toward `to`. */
  arrows: { at: [number, number]; to: [number, number] }[];
  /** Height labels in metres: the ridge (or top) and the eaves. */
  labels: { at: [number, number]; text: string }[];
}

const DIR_V: Record<Dir, [number, number]> = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };
const fmtM = (v: number): string => `${Math.round(v * 100) / 100}`;

export function roofPlan(r: RoofData): RoofPlanMarks {
  const sh = roofShape(r);
  const flat2 = (s: [P3, P3]): [[number, number], [number, number]] => [
    [s[0][0], s[0][2]],
    [s[1][0], s[1][2]],
  ];
  const arrows: RoofPlanMarks['arrows'] = [];
  const len = Math.min(r.rect[2] - r.rect[0], r.rect[3] - r.rect[1]) / 6;
  const arrow = (c: [number, number], d: Dir): void => {
    const v = DIR_V[d];
    arrows.push({ at: [c[0] - (v[0] * len) / 2, c[1] - (v[1] * len) / 2], to: [c[0] + (v[0] * len) / 2, c[1] + (v[1] * len) / 2] });
  };
  const flip: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
  if (r.type === 'flat') arrow([(r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2], r.fallsTo ?? 'S');
  else
    for (const p of sh.planes) {
      if (p.kind !== 'roof' || !p.up) continue;
      // one arrow per sloped plane (a barrel: the two eaves facets only)
      if (r.type === 'curved' && p !== sh.planes[0] && p !== sh.planes[B('facets') - 1]) continue;
      let cx = 0;
      let cz = 0;
      for (const q of p.pts) {
        cx += q[0] / p.pts.length;
        cz += q[2] / p.pts.length;
      }
      arrow([cx, cz], flip[p.up]);
    }
  const c: [number, number] = [(r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2];
  const labels: RoofPlanMarks['labels'] = [];
  if (r.type === 'flat') labels.push({ at: c, text: `Top ${fmtM(r.base)}` });
  else {
    const rg = sh.ridges[0];
    labels.push({ at: rg ? [(rg[0][0] + rg[1][0]) / 2, (rg[0][2] + rg[1][2]) / 2] : c, text: `Ridge ${fmtM(sh.ridgeHeight)}` });
    labels.push({ at: [c[0], r.rect[1]], text: `Eaves ${fmtM(r.base)}` });
  }
  return { outer: sh.outer, wall: [...r.rect], ridges: sh.ridges.map(flat2), hips: sh.hips.map(flat2), arrows, labels };
}

// ---------- the walk test's pieces ----------
export interface RoofBox {
  c: P3;
  s: P3;
  yaw: number;
  pitch: number;
  colour: string;
}
export interface RoofPane {
  c: P3;
  w: number;
  h: number;
  yaw: number;
}
export interface RoofCtx {
  /** Rects cut out of the roof (roof lights: voids of kind `rooflight` under it). */
  cuts?: readonly (readonly number[])[];
  /** A level floor already makes the flat roof's slab (level R's roof rooms): no second slab. */
  slabCovered?: boolean;
  /** Parapet edges (S, E, N, W) that already have a wall in the file. */
  walledEdges?: readonly Dir[];
  /** Ground height for the downpipes' feet. */
  ground?: number;
}

/** Yaw that turns a box's local +z onto a compass direction (north +z = 0, east +x = 90 degrees). */
export const DIR_YAW: Record<Dir, number> = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 };

/** Interval [lo, hi] of a convex 2D polygon on the line u = at (its v values), or null. */
function sliceAt(poly: readonly [number, number][], at: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    if ((p[0] - at) * (q[0] - at) > 0) continue;
    if (Math.abs(q[0] - p[0]) < 1e-9) {
      lo = Math.min(lo, p[1], q[1]);
      hi = Math.max(hi, p[1], q[1]);
      continue;
    }
    const v = p[1] + ((at - p[0]) / (q[0] - p[0])) * (q[1] - p[1]);
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  return hi > lo + 1e-6 ? [lo, hi] : null;
}

/** [lo, hi] less every cut interval. */
function subtract(lo: number, hi: number, cuts: readonly [number, number][]): [number, number][] {
  let out: [number, number][] = [[lo, hi]];
  for (const [c0, c1] of cuts) {
    const next: [number, number][] = [];
    for (const [a, b] of out) {
      if (c1 <= a || c0 >= b) next.push([a, b]);
      else {
        if (c0 > a) next.push([a, c0]);
        if (c1 < b) next.push([c1, b]);
      }
    }
    out = next;
  }
  return out.filter(([a, b]) => b - a > 0.05);
}

/** A box along segment a-b: `thick` across, `h` tall, centre `dy` above the segment. */
export function bandBox(a: P3, b: P3, thick: number, h: number, dy: number, colour: string): RoofBox {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const dyAB = b[1] - a[1];
  const hz = Math.sqrt(dx * dx + dz * dz);
  const len = Math.sqrt(hz * hz + dyAB * dyAB);
  return { c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + dy, (a[2] + b[2]) / 2], s: [thick, h, len], yaw: Math.atan2(dx, dz), pitch: -Math.atan2(dyAB, hz), colour };
}

/** Parapets or upstands round a flat roof (S, E, N, W), standing on the roof inside the wall line. */
export function roofParapets(r: RoofData, skip: readonly Dir[] = []): { dir: Dir; box: RoofBox }[] {
  if (r.type !== 'flat') return [];
  const para = r.edge !== 'upstand';
  const h = para ? (r.parapet ?? 0) : (r.upstand ?? 0);
  if (h <= 0) return [];
  const t = para ? B('parapetThick') : B('upstandThick');
  const [x0, z0, x1, z1] = r.rect;
  const y = r.base;
  const col = para ? '#8d9096' : roofHex(r);
  const sides: [Dir, P3, P3][] = [
    ['S', [x0, y, z0 + t / 2], [x1, y, z0 + t / 2]],
    ['E', [x1 - t / 2, y, z0], [x1 - t / 2, y, z1]],
    ['N', [x0, y, z1 - t / 2], [x1, y, z1 - t / 2]],
    ['W', [x0 + t / 2, y, z0], [x0 + t / 2, y, z1]],
  ];
  return sides.filter(([d]) => !skip.includes(d)).map(([dir, a, b]) => ({ dir, box: bandBox(a, b, t, h, h / 2, col) }));
}

/** Fascia boards, gutters and downpipes (shared by the editor's 3D and the walk test). */
export function roofTrim(r: RoofData, ground = 0): RoofBox[] {
  const sh = roofShape(r);
  const out: RoofBox[] = [];
  const fascia = r.fascia ?? 0;
  const trimCol = '#e9e7e1';
  const flatParapet = r.type === 'flat' && r.edge !== 'upstand';
  if (fascia > 0 && !flatParapet) for (const e of sh.edges) out.push(bandBox(e.a, e.b, B('fasciaThick'), fascia, -fascia / 2, trimCol));
  if (r.gutter) {
    const g = B('gutter');
    for (const e of sh.edges) {
      if (!e.eaves) continue;
      // just outside the eaves line, its top at the eaves
      const dx = e.b[0] - e.a[0];
      const dz = e.b[2] - e.a[2];
      const L = Math.sqrt(dx * dx + dz * dz) || 1;
      const [cx, cz] = [(r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2];
      let nx = -dz / L;
      let nz = dx / L;
      if ((e.a[0] - cx) * nx + (e.a[2] - cz) * nz < 0) [nx, nz] = [-nx, -nz];
      const off = (B('fasciaThick') + g) / 2;
      const a: P3 = [e.a[0] + nx * off, e.a[1], e.a[2] + nz * off];
      const b: P3 = [e.b[0] + nx * off, e.b[1], e.b[2] + nz * off];
      out.push(bandBox(a, b, g, g, -g / 2, trimCol));
      if (r.downpipes) {
        const d = B('downpipe');
        for (const p of [a, b]) {
          const top = p[1] - g;
          if (top - ground > 0.1) out.push({ c: [p[0], (top + ground) / 2, p[2]], s: [d, top - ground, d], yaw: 0, pitch: 0, colour: trimCol });
        }
      }
    }
  }
  return out;
}

/** The pieces the walk test builds: the roof as boxes (strips on a slope), its glazing as panes, trim, parapets. */
export function roofWalkPieces(r: RoofData, ctx: RoofCtx = {}): { boxes: RoofBox[]; panes: RoofPane[] } {
  const sh = roofShape(r);
  const col = roofHex(r);
  const endCol = '#b9b6ae';
  const T = B('deck');
  const boxes: RoofBox[] = [];
  const panes: RoofPane[] = [];
  const cuts = (ctx.cuts ?? []).map((c) => [c[0]!, c[1]!, c[2]!, c[3]!] as const);
  for (const p of sh.planes) {
    if (p.kind === 'roof' && p.pitch === 0) {
      if (ctx.slabCovered) continue;
      // level slab: the outline less the roof lights, as strips along x
      const ys = p.pts[0]![1];
      const [x0, z0, x1, z1] = sh.outer;
      const zs = [z0, z1, ...cuts.flatMap((c) => [c[1], c[3]])].filter((z) => z >= z0 && z <= z1).sort((a, b) => a - b);
      for (let i = 0; i + 1 < zs.length; i++) {
        const za = zs[i]!;
        const zb = zs[i + 1]!;
        if (zb - za < 1e-6) continue;
        const zm = (za + zb) / 2;
        for (const [a, b] of subtract(x0, x1, cuts.filter((c) => zm > c[1] && zm < c[3]).map((c) => [c[0], c[2]] as [number, number])))
          boxes.push({ c: [(a + b) / 2, ys - T / 2, zm], s: [b - a, T, zb - za], yaw: 0, pitch: 0, colour: col });
      }
      continue;
    }
    if (p.kind === 'roof' && p.up) {
      // a slope: strips across it, each tilted to the plane
      const ns = p.up === 'N' || p.up === 'S';
      const poly = p.pts.map((q): [number, number] => (ns ? [q[2], q[0]] : [q[0], q[2]]));
      const s0 = Math.min(...poly.map((q) => q[0]));
      const s1 = Math.max(...poly.map((q) => q[0]));
      const n = Math.max(1, Math.ceil((s1 - s0) / B('strip') - 1e-9));
      const ds = (s1 - s0) / n;
      // the plane's height as y = A x + C z + D (from three corners)
      const [P0, P1, P2] = [p.pts[0]!, p.pts[1]!, p.pts[2]!];
      const ux = P1[0] - P0[0], uy = P1[1] - P0[1], uz = P1[2] - P0[2];
      const vx = P2[0] - P0[0], vy = P2[1] - P0[1], vz = P2[2] - P0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (ny < 0) [nx, ny, nz] = [-nx, -ny, -nz];
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      [nx, ny, nz] = [nx / nl, ny / nl, nz / nl];
      const yAt = (x: number, z: number): number => P0[1] - (nx * (x - P0[0]) + nz * (z - P0[2])) / ny;
      const pitch = (p.pitch * Math.PI) / 180;
      for (let k = 0; k < n; k++) {
        const sm = s0 + (k + 0.5) * ds;
        const span = sliceAt(poly, sm);
        if (!span) continue;
        const cutIv = cuts.filter((c) => (ns ? sm > c[1] && sm < c[3] : sm > c[0] && sm < c[2])).map((c) => (ns ? [c[0], c[2]] : [c[1], c[3]]) as [number, number]);
        for (const [q0, q1] of subtract(span[0], span[1], cutIv)) {
          const qm = (q0 + q1) / 2;
          const x = ns ? qm : sm;
          const z = ns ? sm : qm;
          const y = yAt(x, z);
          boxes.push({ c: [x - (nx * T) / 2, y - (ny * T) / 2, z - (nz * T) / 2], s: [q1 - q0, T, ds / Math.cos(pitch)], yaw: DIR_YAW[p.up], pitch: -pitch, colour: col });
        }
      }
      continue;
    }
    // upright: an end wall in columns, or glazing as a pane
    const alongX = Math.abs(p.pts[0]![2] - p.pts[1]![2]) < 1e-6 && p.pts.every((q) => Math.abs(q[2] - p.pts[0]![2]) < 1e-6);
    const poly = p.pts.map((q): [number, number] => [alongX ? q[0] : q[2], q[1]]);
    const h0 = Math.min(...poly.map((q) => q[0]));
    const h1 = Math.max(...poly.map((q) => q[0]));
    const fixed = alongX ? p.pts[0]![2] : p.pts[0]![0];
    if (p.kind === 'glass') {
      const y0 = Math.min(...poly.map((q) => q[1]));
      const y1 = Math.max(...poly.map((q) => q[1]));
      const hm = (h0 + h1) / 2;
      panes.push({ c: alongX ? [hm, (y0 + y1) / 2, fixed] : [fixed, (y0 + y1) / 2, hm], w: h1 - h0, h: y1 - y0, yaw: alongX ? 0 : -Math.PI / 2 });
      continue;
    }
    const n = Math.max(1, Math.ceil((h1 - h0) / B('strip') - 1e-9));
    const dh = (h1 - h0) / n;
    for (let k = 0; k < n; k++) {
      const hm = h0 + (k + 0.5) * dh;
      const iv = sliceAt(poly, hm);
      if (!iv || iv[1] - iv[0] < 0.05) continue;
      const cy = (iv[0] + iv[1]) / 2;
      boxes.push({ c: alongX ? [hm, cy, fixed] : [fixed, cy, hm], s: alongX ? [dh, iv[1] - iv[0], T] : [T, iv[1] - iv[0], dh], yaw: 0, pitch: 0, colour: endCol });
    }
  }
  for (const pp of roofParapets(r, ctx.walledEdges ?? [])) boxes.push(pp.box);
  boxes.push(...roofTrim(r, ctx.ground ?? 0));
  return { boxes, panes };
}
