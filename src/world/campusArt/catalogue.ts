/**
 * The campus art catalogue layer (sector-redesign ART-KIT, ART-PLAN sections 2-3; pure: no Babylon at run time). One
 * shape for every prop catalogue the campus renderer draws: F (the marlow-final facility props, through an adapter over
 * `props/facilityProps.ts`, unedited), K (the campus base kit, `campusKit.ts`) and H1..H5 (one hero catalogue per
 * section, in the section dress files). A placement (`ArtPlacement`) names its catalogue, piece and light-parity class
 * (ART-PLAN 2): `solid` writes visible collide boxes 1 cm inside the skin, `see` writes collision-only boxes (light passes),
 * `visual` writes none (rule V must hold), `skin` / `skin-hide` dress an existing greybox box and write none.
 *
 * Gameplay never reads a catalogue mesh: the only gameplay output of this module is `writeArtBoxes` (the boxes a level
 * builder holds), which the dresser calls once per section at build time.
 */
import {
  PROP_BOX_COLOR,
  PROP_COLLISION,
  PROP_EMISSIVE_PARTS,
  PROP_FOOTPRINT,
  PROP_HUNG,
  PROP_IDS,
  PROP_LOOK,
  PROP_MATERIALS,
  PROP_OVERHANG,
  PROP_PITCH,
  PROP_PROUD,
  PROP_TRI_BUDGET,
  type PropBoxBuilder,
  type PropWorldBox,
} from '../props/facilityProps';
import facilityReport from '../props/assets/facility-props.json';
import type { BoxPiece, CylPiece } from '../levelBuilder';

export type V3 = readonly [number, number, number];
/** A gameplay box in the piece's frame (m): as facility `PropBox`. */
export interface ArtBox {
  lo: V3;
  hi: V3;
  see?: boolean;
  noLedge?: boolean;
}
export interface ArtLook {
  color: string;
  roughness: number;
  metallic: number;
  alpha?: number;
  emissive?: boolean;
}
/** A horizontal slab of a piece's drawn hull (piece frame, m): the profile of a piece whose hull is not one box (cars). */
export interface ArtSlab {
  y0: number;
  y1: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
export interface PropCatalogue {
  id: 'F' | 'K' | `H${1 | 2 | 3 | 4 | 5}`;
  /** File name under assets ('facility-props.glb', 'campus-kit.glb', 'hero-s1.glb'). */
  glb: string;
  ids: readonly string[];
  materials: readonly string[];
  /** By material name. */
  looks: Readonly<Record<string, ArtLook>>;
  collision: Readonly<Record<string, readonly ArtBox[] | null>>;
  footprint: Readonly<Record<string, readonly [number, number, number, number]>>;
  triBudget: Readonly<Record<string, number>>;
  hung: readonly string[];
  /** Pieces that may scale 0.8-1.25 per axis. */
  fit: readonly string[];
  overhang: Readonly<Record<string, { by: number; what: string }>>;
  emissive: Readonly<Record<string, readonly ('screen' | 'lamp')[]>>;
  /** Row module (m along local x). */
  pitch: Readonly<Record<string, number>>;
  /** (ART-KIT L3) The drawn hull per piece (piece frame, m: the build report's bounds within 1 cm, a test); `skinFit`,
   *  `ruleV` and the keepouts read it. A piece missing here falls back to its footprint, floor to `FALLBACK_H`. */
  bounds?: Readonly<Record<string, { lo: V3; hi: V3 }>>;
  /** (ART-KIT L3) Hull slabs for pieces whose hull is not one box (cars: body and cabin); `skinFit` (skin-hide) and rule V read them. */
  profile?: Readonly<Record<string, readonly ArtSlab[]>>;
  /** (ART-KIT L3) Greybox colour of a piece's boxes (the `?gfx=min` look); default `ART_BOX_COLOR`. */
  boxColor?: Readonly<Record<string, string>>;
  /** (ART-KIT L3) Open frames (members <= 5 cm, >= 70% open area): rule V's second exception. */
  open?: readonly string[];
  /** (ART-KIT L3) The piece's own light-parity class (ART-PLAN 3.1 / 3.2 "Class"; 'box' = box-only ids with no mesh). */
  classOf?: Readonly<Record<string, ArtPlacement['cls'] | 'box'>>;
  /** (ART-KIT L3) Emissive colour per material for own-supply emissives (exit signs), linear RGB before the gain. */
  ownSupply?: Readonly<Record<string, { tint: readonly [number, number, number]; gain: number }>>;
}

export interface ArtPlacement {
  cat: PropCatalogue['id'];
  prop: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Fit pieces only (each 0.8-1.25). */
  s?: [number, number, number];
  /** 0-4; -1 shared (connectors). */
  section: number;
  /** ART-PLAN section 2 (skin / skin-hide: over an existing greybox piece, writes none). */
  cls: 'solid' | 'see' | 'visual' | 'skin' | 'skin-hide';
  /** `b.boxes` index the skin covers. */
  skinOf?: number;
  /** `b.cylinders` index (tree trunks, posts) instead of a box. */
  skinCyl?: number;
  tint?: [number, number, number];
  lamp?: [number, number, number];
  /** Light circuit (emissives dim when cut). */
  group?: number;
  /** Visual and < 0.4 m: may drop at distance (perf lever only). */
  minor?: boolean;
  /** The real reason (16.0 reason test), one line. */
  why: string;
}

export const ART_PROUD = PROP_PROUD;
export const FIT_MIN = 0.8;
export const FIT_MAX = 1.25;
/** Greybox colour of a kit box with no `boxColor` entry. */
export const ART_BOX_COLOR = '#6f7275';
/** Hull height of a piece with no `bounds` entry (m). */
export const FALLBACK_H = 1;
/** Rule V (ART-PLAN 2): the body band over the floor, the width a visual part may have in it, the flush and ceiling limits. */
export const RULE_V = { band0: 0.5, band1: 2.1, width: 0.35, flush: 0.15, above: 2.3, overhangW: 0.6, overhangH: 0.5 } as const;
/** A box written by the dresser 1.9-4.2 m tall gets `noLedge` (campus rule 6). */
export const NO_LEDGE_H: readonly [number, number] = [1.9, 4.2];

export type CatalogueSet = Readonly<Record<string, PropCatalogue>>;
export interface CatReport {
  pieces: Record<string, { triangles: number; meshes: Record<string, number> }>;
}

// ------------------------------------------------------------------------------------------------------ the F adapter

interface FacilityReportShape {
  pieces: Record<string, { bounds: { min: number[]; max: number[] } }>;
}

/** ART-PLAN 3.1 marks these F pieces `fit` (non-uniform scale 0.8-1.25 to skin greybox boxes of slightly different sizes). */
export const F_FIT: readonly string[] = ['officeDesk', 'receptionDesk', 'securityDesk', 'serverRack', 'cableTray', 'coolingUnit', 'palletLoad', 'palletLoadLow', 'dispatchDesk'];

let fCat: PropCatalogue | null = null;

/** The marlow-final facility props as a campus catalogue (an adapter over `facilityProps.ts`; no edit there). */
export function facilityCatalogue(): PropCatalogue {
  if (fCat) return fCat;
  const rep = facilityReport as unknown as FacilityReportShape;
  const bounds: Record<string, { lo: V3; hi: V3 }> = {};
  for (const id of PROP_IDS) {
    const b = rep.pieces[id]?.bounds;
    if (b) bounds[id] = { lo: [b.min[0]!, b.min[1]!, b.min[2]!], hi: [b.max[0]!, b.max[1]!, b.max[2]!] };
  }
  fCat = {
    id: 'F',
    glb: 'facility-props.glb',
    ids: PROP_IDS,
    materials: PROP_MATERIALS,
    looks: PROP_LOOK,
    collision: PROP_COLLISION,
    footprint: PROP_FOOTPRINT,
    triBudget: PROP_TRI_BUDGET,
    hung: PROP_HUNG,
    fit: F_FIT,
    overhang: PROP_OVERHANG as Readonly<Record<string, { by: number; what: string }>>,
    emissive: PROP_EMISSIVE_PARTS as Readonly<Record<string, readonly ('screen' | 'lamp')[]>>,
    pitch: PROP_PITCH,
    bounds,
    boxColor: PROP_BOX_COLOR,
  };
  return fCat;
}

// ------------------------------------------------------------------------------------------------------------ maths

const sx = (p: ArtPlacement): number => p.s?.[0] ?? 1;
const sy = (p: ArtPlacement): number => p.s?.[1] ?? 1;
const sz = (p: ArtPlacement): number => p.s?.[2] ?? 1;

/** The placement's world matrix (Babylon's `Matrix.Compose(scale, yaw quaternion, position)` layout) into `out` at `o`. Allocation-free. */
export function artMatrix(p: ArtPlacement, out: Float32Array, o: number): void {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  const a = sx(p);
  const b = sy(p);
  const d = sz(p);
  out[o] = c * a;
  out[o + 1] = 0;
  out[o + 2] = -s * a;
  out[o + 3] = 0;
  out[o + 4] = 0;
  out[o + 5] = b;
  out[o + 6] = 0;
  out[o + 7] = 0;
  out[o + 8] = s * d;
  out[o + 9] = 0;
  out[o + 10] = c * d;
  out[o + 11] = 0;
  out[o + 12] = p.x;
  out[o + 13] = p.y;
  out[o + 14] = p.z;
  out[o + 15] = 1;
}

/** A point of the piece's frame (scaled) in the world. */
export function artToWorld(p: ArtPlacement, lx: number, ly: number, lz: number): [number, number, number] {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  const x = lx * sx(p);
  const z = lz * sz(p);
  return [p.x + x * c + z * s, p.y + ly * sy(p), p.z - x * s + z * c];
}

/** The piece's drawn hull in its frame (unscaled): the catalogue's bounds, else the footprint to `FALLBACK_H`. */
export function pieceHull(cat: PropCatalogue, prop: string): { lo: V3; hi: V3 } {
  const b = cat.bounds?.[prop];
  if (b) return b;
  const f = cat.footprint[prop] ?? [0, 0, 0, 0];
  return { lo: [f[0], 0, f[1]], hi: [f[2], FALLBACK_H, f[3]] };
}

/** The placement's hull as a world oriented box: plan centre, half sizes along the piece's x / z, yaw, y range. */
export interface WorldObb {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  yaw: number;
  y0: number;
  y1: number;
}

/** A local box (piece frame lo..hi) of a placement as a world OBB (scale applied). */
export function localObb(p: ArtPlacement, lo: V3, hi: V3): WorldObb {
  const [cx, , cz] = artToWorld(p, (lo[0] + hi[0]) / 2, 0, (lo[2] + hi[2]) / 2);
  const ya = p.y + lo[1] * sy(p);
  const yb = p.y + hi[1] * sy(p);
  return { cx, cz, hx: (Math.abs(hi[0] - lo[0]) * sx(p)) / 2, hz: (Math.abs(hi[2] - lo[2]) * sz(p)) / 2, yaw: p.yaw, y0: Math.min(ya, yb), y1: Math.max(ya, yb) };
}

/** The placement's hull in the world. */
export function hullObb(cat: PropCatalogue, p: ArtPlacement): WorldObb {
  const h = pieceHull(cat, p.prop);
  return localObb(p, h.lo, h.hi);
}

/** The world-space gameplay boxes of a placement (scaled; `null`: none). A `see` placement writes every box collision-only. */
export function artBoxes(cat: PropCatalogue, p: ArtPlacement): PropWorldBox[] | null {
  const boxes = cat.collision[p.prop];
  if (!boxes || !boxes.length) return null;
  const color = cat.boxColor?.[p.prop] ?? ART_BOX_COLOR;
  return boxes.map((b) => {
    const c = artToWorld(p, (b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, (b.lo[2] + b.hi[2]) / 2);
    const s: [number, number, number] = [(b.hi[0] - b.lo[0]) * sx(p), (b.hi[1] - b.lo[1]) * sy(p), (b.hi[2] - b.lo[2]) * sz(p)];
    return { c, s, yaw: p.yaw, visible: p.cls === 'solid' && !b.see, noLedge: !!b.noLedge || (s[1] >= NO_LEDGE_H[0] && s[1] <= NO_LEDGE_H[1]), color };
  });
}

/** Does the placement write boxes (solid / see)? */
export const writesBoxes = (p: ArtPlacement): boolean => p.cls === 'solid' || p.cls === 'see';

/** Writes the solid / see placements' boxes into the level builder (skips skin / skin-hide / visual); returns boxes written.
 *  Every box 1.9-4.2 m tall gets `noLedge` (campus rule 6). */
export function writeArtBoxes(b: PropBoxBuilder, cats: CatalogueSet, ps: readonly ArtPlacement[]): number {
  let n = 0;
  for (const p of ps) {
    if (!writesBoxes(p)) continue;
    const cat = cats[p.cat];
    if (!cat) throw new Error(`campus art: no catalogue ${p.cat}`);
    const boxes = artBoxes(cat, p);
    if (!boxes) continue;
    for (const w of boxes) {
      const from = b.boxes.length;
      b.box(w.c[0], w.c[1], w.c[2], w.s[0], w.s[1], w.s[2], w.color, w.yaw, 0, true, w.visible);
      if (w.noLedge) b.mark(from, { noLedge: true });
      n++;
    }
  }
  return n;
}

/** A yaw's quarter turns (0..3) when it is a multiple of 90 degrees (1e-3), else -1. */
export function quarterTurns(yaw: number): number {
  const q = yaw / (Math.PI / 2);
  const r = Math.round(q);
  if (Math.abs(q - r) > 1e-3) return -1;
  return ((r % 4) + 4) % 4;
}

/** A world axis-aligned box (a greybox piece at a quarter-turn yaw) in a placement's (unscaled) frame. */
function boxInFrame(p: ArtPlacement, c: readonly number[], hx: number, hy: number, hz: number): { lo: V3; hi: V3 } {
  const cs = Math.cos(p.yaw);
  const sn = Math.sin(p.yaw);
  const dx = c[0]! - p.x;
  const dz = c[2]! - p.z;
  // world -> local: x' = dx c - dz s ; z' = dx s + dz c (the inverse of artToWorld's rotation)
  const lx = dx * cs - dz * sn;
  const lz = dx * sn + dz * cs;
  const ex = Math.abs(cs) * hx + Math.abs(sn) * hz;
  const ez = Math.abs(sn) * hx + Math.abs(cs) * hz;
  return { lo: [lx - ex, c[1]! - hy - p.y, lz - ez], hi: [lx + ex, c[1]! + hy - p.y, lz + ez] };
}

/**
 * The skin rule (ART-PLAN 2). `skin`: the scaled hull encloses the greybox piece on every axis and stands at most
 * `ART_PROUD` (or the piece's listed overhang) off it. `skin-hide` (AS10): the box may stand outside the skin by at most 0.6
 * and only above 0.9 m; the skin stands at most `ART_PROUD` outside the box between 0.5 and 2.1 m. Null: fits.
 */
export function skinFit(cat: PropCatalogue, p: ArtPlacement, box: BoxPiece | CylPiece): string | null {
  const tq = quarterTurns(p.yaw);
  if (tq < 0) return `${p.prop}: skin yaw ${p.yaw.toFixed(3)} is not a quarter turn`;
  let f: { lo: V3; hi: V3 };
  if ('s' in box) {
    if (Math.abs(box.pitch) > 1e-3) return `${p.prop}: the greybox piece is pitched`;
    const rel = quarterTurns(box.yaw - p.yaw);
    if (rel < 0) return `${p.prop}: the greybox piece is not square to the skin`;
    const bx = box.s[0] / 2;
    const bz = box.s[2] / 2;
    // the box's half sizes along world x / z
    const qb = quarterTurns(box.yaw);
    const wx = qb === 1 || qb === 3 ? bz : bx;
    const wz = qb === 1 || qb === 3 ? bx : bz;
    f = boxInFrame(p, box.c, wx, box.s[1] / 2, wz);
  } else {
    f = boxInFrame(p, box.c, box.r, box.h / 2, box.r);
  }
  // the box in the scaled frame -> compare against the hull scaled
  const s = [sx(p), sy(p), sz(p)];
  const h = pieceHull(cat, p.prop);
  const slo = [h.lo[0] * s[0]!, h.lo[1] * s[1]!, h.lo[2] * s[2]!];
  const shi = [h.hi[0] * s[0]!, h.hi[1] * s[1]!, h.hi[2] * s[2]!];
  const axis = ['x', 'y', 'z'];
  if (p.cls === 'skin-hide') {
    const slabs = cat.profile?.[p.prop] ?? [{ x0: h.lo[0], x1: h.hi[0], y0: h.lo[1], y1: h.hi[1], z0: h.lo[2], z1: h.hi[2] }];
    const sc = slabs.map((q) => ({ x0: q.x0 * s[0]!, x1: q.x1 * s[0]!, y0: q.y0 * s[1]!, y1: q.y1 * s[1]!, z0: q.z0 * s[2]!, z1: q.z1 * s[2]! }));
    // the skin never stands more than ART_PROUD outside the box in the body band
    for (const q of sc) {
      if (q.y1 <= RULE_V.band0 || q.y0 >= RULE_V.band1) continue;
      if (q.x0 < f.lo[0] - ART_PROUD - 1e-3 || q.x1 > f.hi[0] + ART_PROUD + 1e-3 || q.z0 < f.lo[2] - ART_PROUD - 1e-3 || q.z1 > f.hi[2] + ART_PROUD + 1e-3) return `${p.prop}: skin-hide stands outside the box in the body band`;
    }
    // every point of the box: inside a slab (below 0.9), else within 0.6 of one (sampled on a 10 cm lattice of its surface)
    const dist = (x: number, y: number, z: number): number => {
      let best = Infinity;
      for (const q of sc) {
        const dx = Math.max(q.x0 - x, 0, x - q.x1);
        const dy = Math.max(q.y0 - y, 0, y - q.y1);
        const dz = Math.max(q.z0 - z, 0, z - q.z1);
        best = Math.min(best, Math.sqrt(dx * dx + dy * dy + dz * dz));
      }
      return best;
    };
    const n = [Math.max(1, Math.ceil((f.hi[0] - f.lo[0]) / 0.1)), Math.max(1, Math.ceil((f.hi[1] - f.lo[1]) / 0.1)), Math.max(1, Math.ceil((f.hi[2] - f.lo[2]) / 0.1))];
    for (let i = 0; i <= n[0]!; i++)
      for (let j = 0; j <= n[1]!; j++)
        for (let k = 0; k <= n[2]!; k++) {
          const x = f.lo[0] + ((f.hi[0] - f.lo[0]) * i) / n[0]!;
          const y = f.lo[1] + ((f.hi[1] - f.lo[1]) * j) / n[1]!;
          const z = f.lo[2] + ((f.hi[2] - f.lo[2]) * k) / n[2]!;
          const d = dist(x, y, z);
          if (y < 0.9 - 1e-6 ? d > 0.02 : d > 0.6 + 1e-3) return `${p.prop}: box point (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) is ${d.toFixed(2)} m outside the skin`;
        }
    return null;
  }
  const allow = Math.max(ART_PROUD, cat.overhang[p.prop]?.by ?? 0) + 1e-3;
  for (let k = 0; k < 3; k++) {
    if (slo[k]! > f.lo[k]! + 1e-3 || shi[k]! < f.hi[k]! - 1e-3) return `${p.prop}: the skin does not enclose the greybox piece on ${axis[k]} (${slo[k]!.toFixed(3)}..${shi[k]!.toFixed(3)} vs ${f.lo[k]!.toFixed(3)}..${f.hi[k]!.toFixed(3)})`;
    if (f.lo[k]! - slo[k]! > allow || shi[k]! - f.hi[k]! > allow) return `${p.prop}: the skin stands ${Math.max(f.lo[k]! - slo[k]!, shi[k]! - f.hi[k]!).toFixed(3)} m off the greybox piece on ${axis[k]} (allowed ${(allow - 1e-3).toFixed(2)})`;
  }
  return null;
}

/**
 * Rule V (ART-PLAN 2) for a visual placement: no part in the body band (floor + 0.5 .. floor + 2.1) wider than 0.35 m in
 * plan, unless the whole piece lies within 0.15 of a wall face (`wallDist`: the piece's farthest point from the wall it is
 * flush to; Infinity when free-standing) or above floor + 2.3. Floor clutter under 0.5 is free. Exceptions: open frames
 * (`cat.open`); listed desk-top overhangs (each <= 0.6 wide, <= 0.5 tall). Null: passes (and always for other classes).
 */
export function ruleV(cat: PropCatalogue, p: ArtPlacement, floorY: number, wallDist: number): string | null {
  if (p.cls !== 'visual') return null;
  if (cat.open?.includes(p.prop)) return null;
  const s = [sx(p), sy(p), sz(p)];
  const h = pieceHull(cat, p.prop);
  const slabs = cat.profile?.[p.prop] ?? [{ x0: h.lo[0], x1: h.hi[0], y0: h.lo[1], y1: h.hi[1], z0: h.lo[2], z1: h.hi[2] }];
  if (wallDist <= RULE_V.flush + 1e-6) return null;
  for (const q of slabs) {
    const y0 = p.y + q.y0 * s[1]! - floorY;
    const y1 = p.y + q.y1 * s[1]! - floorY;
    if (y1 <= RULE_V.band0 + 1e-6) continue;
    if (y0 >= RULE_V.above - 1e-6) continue;
    if (y0 >= RULE_V.band1 - 1e-6) continue;
    const w = Math.max((q.x1 - q.x0) * s[0]!, (q.z1 - q.z0) * s[2]!);
    if (w > RULE_V.width + 1e-6) {
      const o = cat.overhang[p.prop];
      if (o && w <= RULE_V.overhangW && y1 - y0 <= RULE_V.overhangH) continue;
      return `${p.prop}: a visual part ${w.toFixed(2)} m wide in the body band (${y0.toFixed(2)}..${y1.toFixed(2)} over the floor) needs a see or solid box (rule V)`;
    }
  }
  return null;
}

// ----------------------------------------------------------------------------------------------------------- counts

/** Is a material drawn by the merged static path (opaque, not emissive, not alpha)? */
export function mergedLook(look: ArtLook | undefined): boolean {
  return !!look && !look.emissive && look.alpha === undefined;
}

/**
 * Draws and triangles a section's placements cost under the renderer's draw rule (pure, `campusArtRender.ts` step 6):
 * one merged mesh per (section, material) for the static opaque meshes (not emissive, not alpha, not a `skin-hide` caster),
 * one thin-instanced mesh per (catalogue, section, piece, material) for the rest (emissive, alpha, casters). Box-only
 * pieces draw nothing. Placements: every placement of the section.
 */
export function artCounts(cats: CatalogueSet, reports: Readonly<Record<string, CatReport>>, ps: readonly ArtPlacement[], section: number): { draws: number; tris: number; placements: number } {
  const merged = new Set<string>();
  const inst = new Set<string>();
  let tris = 0;
  let n = 0;
  for (const p of ps) {
    if (p.section !== section) continue;
    n++;
    const cat = cats[p.cat];
    const rep = reports[p.cat]?.pieces[p.prop];
    if (!cat || !rep) continue;
    tris += rep.triangles;
    for (const mat of Object.keys(rep.meshes)) {
      if (mergedLook(cat.looks[mat]) && p.cls !== 'skin-hide') merged.add(mat);
      else inst.add(`${p.cat}|${p.prop}|${mat}|${p.cls === 'skin-hide' ? 'c' : ''}`);
    }
  }
  return { draws: merged.size + inst.size, tris, placements: n };
}
