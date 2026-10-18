/**
 * ON5 climb pieces and exterior features (pure, Babylon-free; tests/editor/climb.test.ts): placing a piece at the dot
 * (backed onto a wall face, drawn between two points, on a window, along a wall top, or standing at the dot), what the
 * player can do with it from the reach facts and the engine's own move list, the `climbable` flag from those rules (or
 * by hand, with a reason), and the card's rows and steps. Every rule number comes from scripts/kestrel/facts.json; a
 * missing fact gives a "no fact" note, never a typed number.
 */
import facts from '../../scripts/kestrel/facts.json';
import { familyOf } from './openingCatalogue';
import { hyp2 } from '../core/mathx';
import { fmt, projectOnWall, snap, wallDir, wallPoint } from './geometry';
import { wallFaces } from './objects';
import { CLIMB_PIECES, pieceOf } from './climbCatalogue';
import type { ClimbPiece, ExtKind } from './climbCatalogue';
import type { Campus, Ext, Opening, Pt, Wall } from './types';

const EPS = 1e-6;
const r3 = (v: number): number => +v.toFixed(3);

/** The facts the climb rules read, by `group.name`; a missing one stays undefined. */
export const CLIMB_FACTS = [
  'player.standHeight',
  'player.radius',
  'reach.grabMin',
  'reach.grabMax',
  'reach.jumpGrab',
  'lip.autoHeight',
  'lip.minLength',
  'lip.climbDepth',
  'duct.crouchHeight',
  'duct.crouchWidth',
  'stair.riserHeight',
  'stair.going',
  'stair.maxRisersPerFlight',
  'stair.fireWidth',
  'climb.pipeLipRise',
  'climb.pipeLipReach',
  'climb.pipeRadius',
  'climb.wallReach',
  'climb.ledgeDepth',
  'climb.ledgeDepthMin',
  'climb.ledgeDepthMax',
  'climb.ledgeThick',
  'climb.sillDepth',
  'climb.sillThick',
  'climb.copingThick',
  'climb.copingOverhang',
  'climb.ventW',
  'climb.ventH',
  'climb.ventSill',
  'climb.lampPost',
  'climb.lampPostSize',
  'climb.fenceHeight',
  'climb.fenceRattle',
] as const;
export type ClimbFact = (typeof CLIMB_FACTS)[number];
export type ClimbFacts = Partial<Record<ClimbFact, number>>;

function readFacts(): ClimbFacts {
  const out: ClimbFacts = {};
  const all = facts as unknown as Record<string, Record<string, { value?: number } | undefined> | undefined>;
  for (const k of CLIMB_FACTS) {
    const [g, n] = k.split('.') as [string, string];
    const v = all[g]?.[n]?.value;
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}
export const CFACTS: ClimbFacts = readFacts();

/** A fact or a "no fact" error (a rule that needs it says so instead of guessing). */
function need(F: ClimbFacts, k: ClimbFact): number {
  const v = F[k];
  if (v === undefined) throw new Error(`no fact ${k}`);
  return v;
}

// ---------- the record ----------
/** A fresh exterior id: E001, E002 ... (schema.md section 2). */
export function extId(d: Pick<Campus, 'exterior'>): string {
  const used = new Set((d.exterior ?? []).map((e) => e.id));
  for (let i = 1; ; i++) {
    const id = `E${String(i).padStart(3, '0')}`;
    if (!used.has(id)) return id;
  }
}

const floorOf = (d: Pick<Campus, 'levels'>, level: string | undefined): number => d.levels.find((l) => l.id === level)?.floor ?? 0;
const levelHeight = (d: Pick<Campus, 'levels'>, level: string): number => d.levels.find((l) => l.id === level)?.height ?? 0;
/** The ground: the level nearest floor 0 (an editor rename of G keeps working). */
const groundFloor = (d: Pick<Campus, 'levels'>): number => (d.levels.length ? d.levels.reduce((a, l) => (Math.abs(l.floor) < Math.abs(a.floor) ? l : a)).floor : 0);
const lineLen = (e: Pick<Ext, 'a' | 'b'>): number => hyp2(e.b[0] - e.a[0], e.b[1] - e.a[1]);

/** The floor the rules measure from: the level it was placed from; a parapet coping is reached from the ground outside. */
export function floorUnder(d: Pick<Campus, 'levels'>, e: Pick<Ext, 'kind' | 'level'>): number {
  return e.kind === 'parapet' ? groundFloor(d) : floorOf(d, e.level);
}

// ---------- rules (decisions 2 and 3) ----------
export interface ClimbVerdict {
  climbable: boolean;
  /** The engine's move used (an AnchorKind and MOVE_MODES entry), or null. */
  move: string | null;
  /** What the player can do, in words, with the heights. */
  words: string;
}

/** Distance from (x, z) to the segment a-b. */
function segDist(a: Pt, b: Pt, x: number, z: number): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const L2 = dx * dx + dz * dz;
  const t = L2 > EPS ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)) : 0;
  return hyp2(x - a[0] - dx * t, z - a[1] - dz * t);
}

/**
 * The lip a downpipe climbs off onto at its top (attachController.pipeLip: a hangable ledge within `climb.pipeLipReach`
 * of the pipe top and `climb.pipeLipRise` of its height): a wall top (not covered by a wall standing on it) or a
 * ledge-like piece's top. Null when there is none.
 */
export function pipeLip(d: Pick<Campus, 'levels' | 'walls' | 'exterior'>, e: Ext, F: ClimbFacts = CFACTS): { top: number; what: string } | null {
  const reach = need(F, 'climb.pipeLipReach');
  const rise = need(F, 'climb.pipeLipRise');
  const [x, z] = e.a;
  let best: { top: number; what: string } | null = null;
  const take = (top: number, what: string): void => {
    if (Math.abs(top - e.y1) <= rise + EPS && (!best || Math.abs(top - e.y1) < Math.abs(best.top - e.y1))) best = { top, what };
  };
  const near = (w: Wall): boolean => segDist(w.a, w.b, x, z) <= w.t / 2 + reach + EPS;
  for (const w of d.walls) {
    if (!near(w)) continue;
    const top = floorOf(d, w.level) + w.h;
    // a wall with another standing on it (the storey above) has no lip at its top
    if (d.walls.some((q) => q !== w && near(q) && Math.abs(floorOf(d, q.level) - top) < 0.01)) continue;
    take(r3(top), `the top of wall ${w.id}`);
  }
  for (const q of d.exterior ?? []) {
    if (q.id === e.id || !['ledge', 'stringcourse', 'sill', 'parapet'].includes(q.kind)) continue;
    if (segDist(q.a, q.b, x, z) <= (q.depth ?? 0) / 2 + reach + EPS) take(q.y1, `${pieceOf(q.kind)?.name.toLowerCase() ?? q.kind} ${q.id}`);
  }
  return best;
}

/** What the player can do with a piece, from the facts and the engine's moves (the flag ignores `override`). */
export function climbRules(d: Pick<Campus, 'levels' | 'walls' | 'exterior'>, e: Ext, F: ClimbFacts = CFACTS): ClimbVerdict {
  const p = pieceOf(e.kind);
  if (!p) return { climbable: false, move: null, words: `${e.kind}: not a climb piece the editor knows` };
  try {
    return rulesOf(d, e, p, F);
  } catch (err) {
    return { climbable: false, move: p.move, words: `${p.name}: ${(err as Error).message}` };
  }
}

function rulesOf(d: Pick<Campus, 'levels' | 'walls' | 'exterior'>, e: Ext, p: ClimbPiece, F: ClimbFacts): ClimbVerdict {
  const floor = floorUnder(d, e);
  const len = lineLen(e);
  const jump = need(F, 'reach.jumpGrab');
  const reachWords = (h: number): string => (h <= jump + EPS ? 'a jump from the floor reaches it' : `over the ${fmt(jump)} m jump reach: reach it from a pipe, ladder or ledge`);
  switch (p.id) {
    case 'downpipe': {
      const run = e.y1 - e.y0;
      const base = e.y0 - floor;
      if (run < need(F, 'player.standHeight')) return { climbable: false, move: 'pipeV', words: `Downpipe ${fmt(run)} m: shorter than the player (${fmt(need(F, 'player.standHeight'))} m), nothing to climb` };
      if (base > need(F, 'reach.grabMax') + EPS) return { climbable: false, move: 'pipeV', words: `Downpipe ${fmt(run)} m: its foot is ${fmt(base)} m up, over the ${fmt(need(F, 'reach.grabMax'))} m grab reach` };
      const lip = pipeLip(d, e, F);
      const top = lip ? `top lip ${fmt(lip.top)} m within reach (${lip.what}): climbs off onto it` : `no lip within ${fmt(need(F, 'climb.pipeLipRise'))} m of its ${fmt(e.y1)} m top: climb up and back down`;
      return { climbable: true, move: 'pipeV', words: `Downpipe ${fmt(e.y1)} m: climbable, ${top}` };
    }
    case 'pipe': {
      const h = e.y0 - floor;
      if (len < need(F, 'lip.minLength') - EPS) return { climbable: false, move: 'pipeH', words: `Horizontal pipe ${fmt(len)} m long: under ${fmt(need(F, 'lip.minLength'))} m, too short to hang from` };
      if (h < need(F, 'reach.grabMin') - EPS) return { climbable: false, move: 'pipeH', words: `Horizontal pipe ${fmt(h)} m up: under the ${fmt(need(F, 'reach.grabMin'))} m grab height, not hangable (it is in the way)` };
      return { climbable: true, move: 'pipeH', words: `Horizontal pipe ${fmt(h)} m up: hang hand over hand along ${fmt(len)} m, ${reachWords(h)}` };
    }
    case 'ledge':
    case 'sill':
    case 'parapet': {
      const h = e.y1 - floor;
      const depth = e.depth ?? 0;
      const name = p.id === 'parapet' ? 'Parapet coping' : p.id === 'sill' ? 'Window sill' : 'Ledge';
      if (len < need(F, 'lip.minLength') - EPS) return { climbable: false, move: 'ledge', words: `${name} ${fmt(len)} m long: under the ${fmt(need(F, 'lip.minLength'))} m lip length, no hang` };
      if (h < need(F, 'lip.autoHeight') - EPS) return { climbable: false, move: 'ledge', words: `${name} ${fmt(h)} m up: under the ${fmt(need(F, 'lip.autoHeight'))} m lip height, no hang` };
      const up = depth >= need(F, 'lip.climbDepth') - EPS ? 'climb up onto it' : `too shallow to climb onto (${fmt(depth)} m, needs ${fmt(need(F, 'lip.climbDepth'))} m)`;
      return { climbable: true, move: 'ledge', words: `${name} ${fmt(h)} m up${p.id === 'parapet' ? ' from the ground' : ''}: hang and shimmy, ${up}; ${reachWords(h)}` };
    }
    case 'vent': {
      const [w, h] = e.size ?? [0, 0];
      const duct = (d.exterior ?? []).find((q) => q.kind === 'duct' && (hyp2(q.a[0] - e.a[0], q.a[1] - e.a[1]) <= need(F, 'climb.wallReach') + EPS || hyp2(q.b[0] - e.a[0], q.b[1] - e.a[1]) <= need(F, 'climb.wallReach') + EPS));
      if (!duct) return { climbable: false, move: 'duct', words: `Vent grille ${fmt(w)} x ${fmt(h)} m: a grille only (no duct starts here)` };
      return { climbable: duct.climbable, move: 'duct', words: `Vent grille ${fmt(w)} x ${fmt(h)} m: the way into duct ${duct.id}` };
    }
    case 'duct': {
      const [w, h] = e.size ?? [0, 0];
      const ends = (['a', 'b'] as const).map((k) => (d.exterior ?? []).find((q) => q.kind === 'vent' && hyp2(q.a[0] - e[k][0], q.a[1] - e[k][1]) <= need(F, 'climb.wallReach') + EPS)?.id);
      const vents = ends[0] && ends[1] ? `, from ${ends[0]} to ${ends[1]}` : ends[0] || ends[1] ? `, a vent at one end only (${ends[0] ?? ends[1]})` : ', no vent at either end';
      const body = need(F, 'player.radius') * 2;
      if (w < body - EPS || h < body - EPS) return { climbable: false, move: 'duct', words: `Duct crawl ${fmt(len)} m, ${fmt(w)} x ${fmt(h)} m clear: narrower than the player (${fmt(body)} m)${vents}` };
      const crouch = h >= need(F, 'duct.crouchHeight') - EPS && w >= need(F, 'duct.crouchWidth') - EPS;
      const how = crouch ? `crouch-move through it (the ${fmt(need(F, 'duct.crouchHeight'))} m crawl rule)` : `crawl through it (under the ${fmt(need(F, 'duct.crouchHeight'))} m x ${fmt(need(F, 'duct.crouchWidth'))} m crouch size)`;
      return { climbable: true, move: 'duct', words: `Duct crawl ${fmt(len)} m, ${fmt(w)} x ${fmt(h)} m clear: ${how}${vents}` };
    }
    case 'fire-escape': {
      const rise = e.y1 - e.y0;
      const n = Math.max(1, Math.round(rise / need(F, 'stair.riserHeight')));
      const going = len / n;
      const max = need(F, 'stair.maxRisersPerFlight');
      const steep = going < need(F, 'stair.going') - EPS ? `; steeper than the ${fmt(need(F, 'stair.going'))} m going (${fmt(going)} m)` : '';
      const flight = n > max ? `; over ${max} risers in one flight: a real one turns at a landing` : '';
      return { climbable: false, move: null, words: `Fire escape stair ${fmt(rise)} m: walked up (a stair, not a climb), ${n} risers over ${fmt(len)} m${steep}${flight}` };
    }
    case 'lamp-post':
      return { climbable: false, move: null, words: `Lamp post ${fmt(e.y1 - e.y0)} m: climbing a lamp post is not in the game yet (its lamp comes with the lights part)` };
    case 'fence': {
      const h = e.y1 - e.y0;
      return { climbable: true, move: 'fence', words: `Chain-link fence ${fmt(h)} m: climb over it; climbed fast it rattles (heard at ${fmt(need(F, 'climb.fenceRattle'))} m)` };
    }
  }
  return { climbable: false, move: null, words: p.name };
}

/** The piece with `climbable` from the rules, unless set by hand (`override`, `reason` says why). */
export function withRules(d: Pick<Campus, 'levels' | 'walls' | 'exterior'>, e: Ext, F: ClimbFacts = CFACTS): Ext {
  if (e.override) return e;
  const v = climbRules(d, e, F);
  return v.climbable === e.climbable ? e : { ...e, climbable: v.climbable };
}

/** The card's and the dot's words: the rules, and "set by hand" when overridden. */
export function pieceWords(d: Pick<Campus, 'levels' | 'walls' | 'exterior'>, e: Ext, F: ClimbFacts = CFACTS): string {
  const v = climbRules(d, e, F);
  if (!e.override || e.climbable === v.climbable) return v.words;
  return `${v.words}. Set by hand to ${e.climbable ? 'climbable' : 'not climbable'}: ${e.reason || 'no reason given'}`;
}

/** Flip the flag by hand (Properties or the card): an override with a reason; flipping back to the rules clears it. */
export function setClimbable(d: Pick<Campus, 'levels' | 'walls' | 'exterior'>, e: Ext, on: boolean, reason: string, F: ClimbFacts = CFACTS): Ext {
  const rule = climbRules(d, { ...e, override: false }, F).climbable;
  const out: Ext = { ...e, climbable: on };
  if (on === rule) delete out.override;
  else {
    out.override = true;
    out.reason = reason || e.reason || 'set by hand';
  }
  return out;
}

// ---------- placing (decisions 1 and 8) ----------
export interface PlaceCtx {
  data: Pick<Campus, 'levels' | 'walls' | 'exterior' | 'openings'>;
  level: string;
  grid: number;
}

/** A compass letter for the way a climber faces a wall face whose outward normal is `n` along `axis`. */
const faceLetter = (axis: 0 | 1, n: 1 | -1): string => (axis === 0 ? (n > 0 ? 'W' : 'E') : n > 0 ? 'S' : 'N');

/** The tallest wall top along the wall line at (x, z), on any level (a downpipe runs from the ground to the parapet). */
export function wallTopAt(d: Pick<Campus, 'levels' | 'walls'>, x: number, z: number, F: ClimbFacts = CFACTS): number | null {
  const reach = need(F, 'climb.pipeLipReach');
  let top: number | null = null;
  for (const w of d.walls) {
    if (segDist(w.a, w.b, x, z) > w.t / 2 + reach + EPS) continue;
    const t = floorOf(d, w.level) + w.h;
    if (top === null || t > top) top = r3(t);
  }
  return top;
}

/** A wall-backed point piece (downpipe, vent) at the dot, or why not. */
function wallPoint1(kind: ExtKind, x: number, z: number, c: PlaceCtx, F: ClimbFacts): { e: Omit<Ext, 'id'> | null; why: string | null; wall: string | null } {
  const reach = need(F, 'climb.wallReach');
  let best: { axis: 0 | 1; pos: number; n: 1 | -1; s0: number; s1: number; id: string; gap: number } | null = null;
  for (const f of wallFaces(c.data.walls, c.level)) {
    const along = f.axis === 0 ? z : x;
    if (along < f.s0 - EPS || along > f.s1 + EPS) continue;
    const across = f.axis === 0 ? x : z;
    const gap = (across - f.pos) * f.n;
    if (gap < -EPS || gap > reach + EPS) continue;
    if (!best || gap < best.gap) best = { ...f, gap };
  }
  if (!best) return { e: null, why: 'Move onto a wall face', wall: null };
  const floor = floorOf(c.data, c.level);
  const off = kind === 'downpipe' ? need(F, 'climb.pipeRadius') : 0;
  const s = Math.min(best.s1, Math.max(best.s0, snap(best.axis === 0 ? z : x, c.grid)));
  const at = r3(best.pos + best.n * off);
  const p: Pt = best.axis === 0 ? [at, s] : [s, at];
  const facing = faceLetter(best.axis, best.n);
  if (kind === 'downpipe') {
    const top = wallTopAt(c.data, p[0], p[1], F) ?? r3(floor + levelHeight(c.data, c.level));
    return { e: { kind, a: p, b: [p[0], p[1]], y0: floor, y1: top, climbable: false, reason: '', level: c.level, wall: best.id, facing }, why: null, wall: best.id };
  }
  const y0 = r3(floor + need(F, 'climb.ventSill'));
  const size: [number, number] = [need(F, 'climb.ventW'), need(F, 'climb.ventH')];
  return { e: { kind, a: p, b: [p[0], p[1]], y0, y1: r3(y0 + size[1]), climbable: false, reason: '', level: c.level, wall: best.id, facing, size }, why: null, wall: best.id };
}

/** The window nearest the dot (a window-family opening on the level within reach) for a sill. */
function sillAt(x: number, z: number, c: PlaceCtx, F: ClimbFacts): { e: Omit<Ext, 'id'> | null; why: string | null; wall: string | null } {
  const reach = need(F, 'climb.wallReach');
  let best: { o: Opening; w: Wall; dist: number; side: number } | null = null;
  for (const o of c.data.openings) {
    if (familyOf(o.type) !== 'window') continue;
    const w = c.data.walls.find((q) => q.id === o.wall);
    if (!w || w.level !== c.level) continue;
    const pr = projectOnWall(w, x, z);
    if (pr.s < o.at - o.w / 2 - EPS || pr.s > o.at + o.w / 2 + EPS || pr.dist > w.t / 2 + reach + EPS) continue;
    const dir = wallDir(w);
    const side = (x - w.a[0]) * -dir[1] + (z - w.a[1]) * dir[0] >= 0 ? 1 : -1;
    if (!best || pr.dist < best.dist) best = { o, w, dist: pr.dist, side };
  }
  if (!best) return { e: null, why: 'Move onto a window', wall: null };
  const { o, w, side } = best;
  const dir = wallDir(w);
  const depth = need(F, 'climb.sillDepth');
  const out = (w.t / 2 + depth / 2) * side;
  const at = (s: number): Pt => {
    const q = wallPoint(w, s);
    return [r3(q[0] - dir[1] * out), r3(q[1] + dir[0] * out)];
  };
  const top = r3(floorOf(c.data, c.level) + o.sill);
  return { e: { kind: 'sill', a: at(o.at - o.w / 2), b: at(o.at + o.w / 2), y0: r3(top - need(F, 'climb.sillThick')), y1: top, climbable: false, reason: '', level: c.level, wall: w.id, depth }, why: null, wall: w.id };
}

/** A coping along the top of the wall nearest the dot. */
function copingAt(x: number, z: number, c: PlaceCtx, F: ClimbFacts): { e: Omit<Ext, 'id'> | null; why: string | null; wall: string | null } {
  const reach = need(F, 'climb.wallReach');
  let best: { w: Wall; dist: number } | null = null;
  for (const w of c.data.walls) {
    if (w.level !== c.level) continue;
    const dist = projectOnWall(w, x, z).dist;
    if (dist <= w.t / 2 + reach + EPS && (!best || dist < best.dist)) best = { w, dist };
  }
  if (!best) return { e: null, why: 'Move onto a wall', wall: null };
  const w = best.w;
  const y0 = r3(floorOf(c.data, c.level) + w.h);
  return { e: { kind: 'parapet', a: [w.a[0], w.a[1]], b: [w.b[0], w.b[1]], y0, y1: r3(y0 + need(F, 'climb.copingThick')), climbable: false, reason: '', level: c.level, wall: w.id, depth: r3(w.t + 2 * need(F, 'climb.copingOverhang')) }, why: null, wall: w.id };
}

/** A drawn piece from a to b with the kind's default heights and section on the editing level. */
export function drawnPiece(kind: ExtKind, a: Pt, b: Pt, c: PlaceCtx, F: ClimbFacts = CFACTS): Omit<Ext, 'id'> {
  const floor = floorOf(c.data, c.level);
  const storey = levelHeight(c.data, c.level);
  const base = { kind, a: [a[0], a[1]] as Pt, b: [b[0], b[1]] as Pt, climbable: false, reason: '', level: c.level };
  switch (kind) {
    case 'pipe': {
      const y = r3(floor + need(F, 'reach.grabMax'));
      return { ...base, y0: y, y1: y };
    }
    case 'ledge': {
      // a string course at the floor line above (the storey height), standing out from the wall face
      const depth = need(F, 'climb.ledgeDepth');
      const top = r3(floor + storey);
      const line = onFace(a, b, depth, c, F);
      return { ...base, a: line[0], b: line[1], y0: r3(top - need(F, 'climb.ledgeThick')), y1: top, depth, ...(line[2] ? { wall: line[2] } : {}) };
    }
    case 'duct': {
      // from a vent at the start (its bottom), else on the floor; the crouch section (F32)
      const vent = (c.data.exterior ?? []).find((q) => q.kind === 'vent' && hyp2(q.a[0] - a[0], q.a[1] - a[1]) <= need(F, 'climb.wallReach') + EPS);
      const size: [number, number] = [need(F, 'duct.crouchWidth'), need(F, 'duct.crouchHeight')];
      const y0 = vent ? vent.y0 : floor;
      return { ...base, y0, y1: r3(y0 + size[1]), size };
    }
    case 'fire-escape': {
      const y1 = r3(floor + storey);
      const n = Math.max(1, Math.round((y1 - floor) / need(F, 'stair.riserHeight')));
      return { ...base, y0: floor, y1, size: [need(F, 'stair.fireWidth'), n] };
    }
    case 'fence':
      return { ...base, y0: floor, y1: r3(floor + need(F, 'climb.fenceHeight')) };
    default:
      return { ...base, y0: floor, y1: floor };
  }
}

/** A ledge line moved onto the nearest wall face within reach of its start (its centre `depth / 2` out), and the wall. */
function onFace(a: Pt, b: Pt, depth: number, c: PlaceCtx, F: ClimbFacts): [Pt, Pt, string | null] {
  const reach = need(F, 'climb.wallReach');
  let best: { axis: 0 | 1; pos: number; n: 1 | -1; id: string; gap: number } | null = null;
  for (const f of wallFaces(c.data.walls, c.level)) {
    const along = f.axis === 0 ? a[1] : a[0];
    if (along < f.s0 - EPS || along > f.s1 + EPS) continue;
    const gap = ((f.axis === 0 ? a[0] : a[1]) - f.pos) * f.n;
    if (gap < -EPS || gap > reach + EPS) continue;
    if (!best || gap < best.gap) best = { ...f, gap };
  }
  if (!best) return [a, b, null];
  const at = r3(best.pos + (best.n * depth) / 2);
  return best.axis === 0 ? [[at, a[1]], [at, b[1]], best.id] : [[a[0], at], [b[0], at], best.id];
}

/** Where A would put a non-drawn piece at the dot (with `climbable` from the rules), or why it cannot go there. */
export function placePiece(kind: ExtKind, x: number, z: number, id: string, c: PlaceCtx, F: ClimbFacts = CFACTS): { e: Ext | null; why: string | null; wall: string | null } {
  const p = pieceOf(kind)!;
  let r: { e: Omit<Ext, 'id'> | null; why: string | null; wall: string | null };
  if (p.place === 'wallPoint') r = wallPoint1(kind, x, z, c, F);
  else if (p.place === 'window') r = sillAt(x, z, c, F);
  else if (p.place === 'wallTop') r = copingAt(x, z, c, F);
  else if (p.place === 'point') {
    const floor = floorOf(c.data, c.level);
    const at: Pt = [snap(x, c.grid), snap(z, c.grid)];
    const sz = need(F, 'climb.lampPostSize');
    r = { e: { kind, a: at, b: [at[0], at[1]], y0: floor, y1: r3(floor + need(F, 'climb.lampPost')), climbable: false, reason: '', level: c.level, size: [sz, sz] }, why: null, wall: null };
  } else return { e: null, why: null, wall: null };
  if (!r.e) return { e: null, why: r.why, wall: null };
  return { e: withRules(c.data, { id, ...r.e } as Ext, F), why: null, wall: r.wall };
}

/** A drawn piece being drawn: from its start to the dot, the rules applied. */
export function drawPiece(kind: ExtKind, id: string, a: Pt, b: Pt, c: PlaceCtx, F: ClimbFacts = CFACTS): Ext {
  return withRules(c.data, { id, ...drawnPiece(kind, a, b, c, F) } as Ext, F);
}

/** Moved by (dx, dz): both ends; the rules again (a downpipe may leave its lip). */
export function movePiece(d: PlaceCtx['data'], e: Ext, dx: number, dz: number): Ext {
  return withRules(d, { ...e, a: [r3(e.a[0] + dx), r3(e.a[1] + dz)], b: [r3(e.b[0] + dx), r3(e.b[1] + dz)] });
}

// ---------- the card (decision 8: the D-pad edits it, Type first) ----------
export interface PieceRow {
  id: string;
  label: string;
  value: string;
  kind: 'list' | 'len' | 'flag';
}

/** Kinds a Type step flips through: the pieces placed the same way (a downpipe and a vent; the drawn ones). */
export function typeFamily(kind: string): ExtKind[] {
  const p = pieceOf(kind);
  if (!p) return [];
  return CLIMB_PIECES.filter((q) => q.place === p.place).map((q) => q.id);
}

const m = (v: number): string => `${fmt(v)} m`;
/** The rows a piece's card has after Name (lengths and the flag); the type first. */
export function pieceRows(e: Ext): PieceRow[] {
  const p = pieceOf(e.kind);
  const rows: PieceRow[] = [{ id: 'type', label: 'Type', value: p?.name ?? e.kind, kind: 'list' }];
  const [w, h] = e.size ?? [0, 0];
  const add = (id: string, label: string, v: number): void => void rows.push({ id, label, value: m(v), kind: 'len' });
  switch (p?.id) {
    case 'downpipe':
      add('y0', 'Bottom', e.y0);
      add('y1', 'Top', e.y1);
      break;
    case 'pipe':
      add('y0', 'Height', e.y0);
      add('len', 'Length', lineLen(e));
      break;
    case 'ledge':
    case 'sill':
    case 'parapet':
      add('top', 'Top', e.y1);
      add('depth', 'Depth', e.depth ?? 0);
      add('len', 'Length', lineLen(e));
      break;
    case 'vent':
      add('y0', 'Bottom', e.y0);
      add('sw', 'Width', w);
      add('sh', 'Height', h);
      break;
    case 'duct':
      add('y0', 'Bottom', e.y0);
      add('sw', 'Width', w);
      add('sh', 'Height', h);
      add('len', 'Length', lineLen(e));
      break;
    case 'fire-escape':
      add('y1', 'Top', e.y1);
      add('sw', 'Width', w);
      add('len', 'Length', lineLen(e));
      break;
    case 'lamp-post':
      add('y1', 'Top', e.y1);
      break;
    case 'fence':
      add('fh', 'Height', e.y1 - e.y0);
      add('len', 'Length', lineLen(e));
      break;
  }
  rows.push({ id: 'climbable', label: 'Climbable', value: `${e.climbable ? 'yes' : 'no'}${e.override ? ' (by hand)' : ''}`, kind: 'flag' });
  return rows;
}

/**
 * One D-pad step on a piece's row (lengths by `step`, never below one step; Type through its family; Climbable by hand),
 * then the rules again. Null when nothing changes.
 */
export function stepPiece(d: PlaceCtx['data'], e: Ext, row: string, dir: 1 | -1, step: number, F: ClimbFacts = CFACTS): Ext | null {
  const a: Ext = JSON.parse(JSON.stringify(e)) as Ext;
  const len = (v: number): number => Math.max(step, r3(v + dir * step));
  const p = pieceOf(e.kind);
  if (row === 'type') {
    const fam = typeFamily(e.kind);
    if (fam.length < 2) return null;
    const kind = fam[(fam.indexOf(p?.id ?? fam[0]!) + dir + fam.length) % fam.length]!;
    const c: PlaceCtx = { data: d, level: e.level ?? '', grid: step };
    const fresh = p?.place === 'draw' ? drawnPiece(kind, e.a, e.b, c, F) : (placePiece(kind, e.a[0], e.a[1], e.id, c, F).e ?? null);
    if (!fresh) return null;
    const out: Ext = { ...fresh, id: e.id, a: e.a, b: e.b, kind } as Ext;
    if (e.name) out.name = e.name;
    if (e.facing && !out.facing) out.facing = e.facing;
    return withRules(d, out, F);
  }
  if (row === 'climbable') return setClimbable(d, e, !e.climbable, e.reason, F);
  if (row === 'y0' && p?.id === 'pipe') a.y0 = a.y1 = Math.max(0, r3(e.y0 + dir * step));
  else if (row === 'y0') {
    a.y0 = r3(e.y0 + dir * step);
    if (p?.id === 'vent' || p?.id === 'duct') a.y1 = r3(a.y0 + (e.size?.[1] ?? 0));
    else if (a.y0 > e.y1 - step) return null;
  } else if (row === 'y1') {
    a.y1 = r3(e.y1 + dir * step);
    if (a.y1 < e.y0 + step) return null;
    if (p?.id === 'fire-escape' && a.size) a.size = [a.size[0], Math.max(1, Math.round((a.y1 - a.y0) / need(F, 'stair.riserHeight')))];
  } else if (row === 'top') {
    a.y1 = r3(e.y1 + dir * step);
    a.y0 = r3(e.y0 + dir * step);
  } else if (row === 'fh') a.y1 = r3(e.y0 + len(e.y1 - e.y0));
  else if (row === 'depth') {
    const lo = p?.id === 'ledge' ? need(F, 'climb.ledgeDepthMin') : step;
    const hi = p?.id === 'ledge' ? need(F, 'climb.ledgeDepthMax') : Infinity;
    a.depth = Math.min(hi, Math.max(lo, r3((e.depth ?? 0) + dir * step)));
  } else if (row === 'sw' || row === 'sh') {
    const s: [number, number] = [...(e.size ?? [step, step])];
    s[row === 'sw' ? 0 : 1] = len(s[row === 'sw' ? 0 : 1]);
    a.size = s;
    if (row === 'sh' && (p?.id === 'vent' || p?.id === 'duct')) a.y1 = r3(a.y0 + s[1]);
  } else if (row === 'len') {
    const L0 = lineLen(e);
    if (L0 <= EPS) return null;
    const k = len(L0) / L0;
    a.b = [r3(e.a[0] + (e.b[0] - e.a[0]) * k), r3(e.a[1] + (e.b[1] - e.a[1]) * k)];
  } else return null;
  const out = withRules(d, a, F);
  return JSON.stringify(out) === JSON.stringify(e) ? null : out;
}

/** "Downpipe (E001)" for the status line and the change log. */
export function pieceName(e: Ext): string {
  return `${e.name || pieceOf(e.kind)?.name || e.kind} (${e.id})`;
}

/** The length of a drawn piece, for the live words (0 for a point piece). */
export const pieceLen = (e: Ext): number => lineLen(e);

