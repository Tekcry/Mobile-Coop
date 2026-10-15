/**
 * ON6 lamps and circuits (pure, Babylon-free; tests/editor/lamps.test.ts): placing a fitting at the dot (ceiling height,
 * backed onto a wall face, on a desk or object, over a door, on a lamp post), drawing a linear fitting A to B, its params
 * from the catalogue's one conversion, wall switches, the default circuit of a new lamp, keeping `circuits[].lamps` in step
 * with `lamps[].circuit` (the model's link), the card's rows and steps, and the words. Records are the play file's
 * (docs/kestrel/schema.md section 3); the walk test builds them with src/world/maps/kestrelLights.ts.
 */
import facts from '../../scripts/kestrel/facts.json';
import { hyp2 } from '../core/mathx';
import { fmt, inRect, roomAt, snap, wallDir } from './geometry';
import { wallFaces } from './objects';
import { presetOf } from './catalogue';
import { aimDir, areaGrid, CIRCUIT_REASON, fittingOf, FITTINGS, KELVIN_STEPS, lightParams, onCeiling, SWITCH } from './lightCatalogue';
import type { Fitting } from './lightCatalogue';
import { alongWall, clampToRect, snapAxis, snapSlide } from './mount';
import type { SlideSnap } from './mount';
import { roofUnderside } from './roofGeometry';
import type { RoofData } from './roofGeometry';
import type { Change } from './model';
import type { CircuitRecord, Emergency, LampRecord } from '../world/maps/kestrelLights';
import type { Campus, Elem, Obj, Opening, Pt, Room, Wall } from './types';

export type Lamp = LampRecord;
export type Circuit = CircuitRecord;

const LF = facts.light;
const EPS = 1e-6;
const r3 = (v: number): number => +v.toFixed(3);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export type LampData = Pick<Campus, 'meta' | 'levels' | 'rooms' | 'walls' | 'openings'> & { objects?: Obj[]; exterior?: Campus['exterior']; lamps?: Lamp[]; circuits?: Circuit[]; roofs?: RoofData[] };

const nextId = (used: readonly { id: string }[], prefix: string): string => {
  const ids = new Set(used.map((e) => e.id));
  for (let n = 1; ; n++) if (!ids.has(`${prefix}${n}`)) return `${prefix}${n}`;
};
export const lampId = (d: Pick<LampData, 'lamps'>, more: readonly { id: string }[] = []): string => nextId([...(d.lamps ?? []), ...more], 'LP');
export const circuitId = (d: Pick<LampData, 'circuits'>): string => nextId(d.circuits ?? [], 'C');

/** The room a lamp is in, its level and that level's floor. */
export function lampRoom(d: Pick<LampData, 'rooms'>, l: Pick<Lamp, 'room'>): Room | undefined {
  return d.rooms.find((r) => r.id === l.room);
}
export function lampLevel(d: Pick<LampData, 'rooms'>, l: Pick<Lamp, 'room'>): string {
  return lampRoom(d, l)?.level ?? '';
}
/** A switch's level: its wall's. */
export function circuitLevel(d: Pick<LampData, 'walls'>, c: Circuit): string {
  return c.switch ? (d.walls.find((w) => w.id === c.switch!.wall)?.level ?? '') : '';
}

/** Ceiling height over a room: its own `ceiling`, else the underside of the slab above (the level height less facts room.slab). */
export function ceilingOf(d: Pick<LampData, 'levels'>, r: Room): number {
  const c = typeof r.ceiling === 'number' ? r.ceiling : 0;
  return c > 0 ? c : r3((d.levels.find((l) => l.id === r.level)?.height ?? 0) - facts.room.slab.value);
}

/** A ceiling surface over a plan point: its height above the level's floor and its outline (the slide snap's lines). */
export interface CeilingSurface {
  y: number;
  rect: [number, number, number, number];
  /** The room or roof id. */
  id: string;
}

/**
 * Michael 2026-10-14: the ceiling over a plan point on a level, as everything hung from a ceiling reads it (lamps,
 * devices, signs; the aim): the room's ceiling (`ceilingOf`), or a roof's underside where that is lower (a lowered flat
 * roof: the roof plane less its deck, as the walk test builds it), with that surface's outline. Null outside rooms.
 */
export function ceilingSurface(d: Pick<LampData, 'levels' | 'rooms'> & { roofs?: readonly RoofData[] }, level: string, x: number, z: number): CeilingSurface | null {
  const room = roomAt(d.rooms, level, x, z);
  if (!room) return null;
  const floor = d.levels.find((l) => l.id === level)?.floor ?? 0;
  let out: CeilingSurface = { y: ceilingOf(d, room), rect: [room.rect[0], room.rect[1], room.rect[2], room.rect[3]], id: room.id };
  for (const r of d.roofs ?? []) {
    const u = roofUnderside(r, x, z);
    if (u === null) continue;
    const rel = r3(u - floor);
    // (a roof under this floor belongs to a lower level; one over the ceiling is hidden by it)
    if (rel <= 0 || rel >= out.y - 1e-6) continue;
    out = { y: rel, rect: [r.rect[0], r.rect[1], r.rect[2], r.rect[3]], id: r.id };
  }
  return out;
}

/** The ceiling height over a point (above the level's floor), or null outside rooms (ceilingSurface). */
export function ceilingOver(d: Pick<LampData, 'levels' | 'rooms'> & { roofs?: readonly RoofData[] }, level: string, x: number, z: number): number | null {
  return ceilingSurface(d, level, x, z)?.y ?? null;
}

/** How far a light point stands off the ceiling or wall it fixes to: its body, at least facts light.surfaceGap (the bake). */
const gapOf = (body: number): number => Math.max(body, LF.surfaceGap.value);

/** A linear fitting's length (plan), 0 for a point fitting. */
export function lampLength(l: Pick<Lamp, 'at' | 'b'>): number {
  return l.b ? hyp2(l.b[0] - l.at[0], l.b[2] - l.at[2]) : 0;
}

/** Total lumens: the record's (else the catalogue's) times the length for a linear fitting. */
export function lampLumens(l: Pick<Lamp, 'fixture' | 'lumens' | 'at' | 'b'>): number {
  const f = fittingOf(l.fixture);
  const per = l.lumens ?? f?.lumens ?? 0;
  return f?.linear ? r3(per * lampLength(l)) : per;
}

const quarter = (yaw: number | undefined): boolean => Math.round(((yaw ?? 0) % 180) / 90) % 2 === 1;

/** The lamp's `params` again from the catalogue's one conversion (lumens, colour temperature, beam, aim, body). */
export function withParams(l: Lamp): Lamp {
  const f = fittingOf(l.fixture);
  if (!f) return l;
  const out = { ...l };
  const len = lampLength(l);
  let sx = quarter(l.yaw) ? f.body[2] : f.body[0];
  let sz = quarter(l.yaw) ? f.body[0] : f.body[2];
  if (f.linear && l.b) {
    sx = Math.max(Math.abs(l.b[0] - l.at[0]), f.body[0]);
    sz = Math.max(Math.abs(l.b[2] - l.at[2]), f.body[0]);
  }
  const sy = f.body[1];
  const oy = onCeiling(f) ? sy / 2 : f.mount === 'desk' ? -sy / 2 : f.mount === 'floor' ? sy / 2 - (f.height ?? 0) : 0;
  const dir: [number, number, number] = f.up ? [0, 1, 0] : l.aim ? aimDir(l.aim) : [0, -1, 0];
  out.params = lightParams({ lumens: f.linear ? (l.lumens ?? f.lumens) * Math.max(len, 0.1) : (l.lumens ?? f.lumens), kelvin: l.kelvin ?? f.kelvin, beam: l.beam ?? f.beam, dir, colour: f.colour, fixture: { sx, sy, sz, oy }, off: f.off });
  const area = lampArea(l, f, sx, sz);
  if (area) out.params.area = area;
  return out;
}

/**
 * Michael 2026-10-14: the light points across an area fitting's lit face (lightCatalogue `areaGrid`): a grid over a
 * troffer or panel's footprint (sx by sz, as turned), points along a strip's line; null for a one-point fitting, an
 * aimed one or a twin spot. Offsets from the lamp's point (a strip's middle), with each point's cell of the face.
 */
export function lampArea(l: Pick<Lamp, 'at' | 'b' | 'aim' | 'heads'>, f: Pick<Fitting, 'linear' | 'body'>, sx: number, sz: number): NonNullable<Lamp['params']['area']> | null {
  if (l.aim || (l.heads ?? 1) > 1) return null;
  const pts: [number, number][] = [];
  if (f.linear && l.b) {
    const lx = l.b[0] - l.at[0];
    const lz = l.b[2] - l.at[2];
    const n = areaGrid(hyp2(lx, lz), f.body[0]).nw;
    if (n < 2) return null;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      pts.push([r3(lx * t), r3(lz * t)]);
    }
    return { pts, sx: r3(Math.max(Math.abs(lx) / n, f.body[0])), sz: r3(Math.max(Math.abs(lz) / n, f.body[0])) };
  }
  const g = areaGrid(sx, sz);
  if (g.nw * g.nd < 2) return null;
  for (let i = 0; i < g.nw; i++) for (let k = 0; k < g.nd; k++) pts.push([r3(sx * ((i + 0.5) / g.nw - 0.5)), r3(sz * ((k + 0.5) / g.nd - 0.5))]);
  return { pts, sx: r3(sx / g.nw), sz: r3(sz / g.nd) };
}

/** The fitting's own defaults on a record (a new lamp, or a Type step): emergency, motion, breakable, heads. */
function withDefaults(l: Lamp, f: Fitting): Lamp {
  const out = { ...l } as Lamp;
  delete out.emergency;
  delete out.motion;
  delete out.heads;
  delete out.lumens;
  delete out.kelvin;
  delete out.beam;
  if (f.emergency) out.emergency = f.emergency;
  if (f.motion) out.motion = true;
  out.breakable = f.breakable;
  if (f.heads && f.heads > 1) out.heads = f.heads;
  if (f.aimPitch === undefined) delete out.aim;
  return withParams(out);
}

/** Owner by default: the room's building ("Building A"), else the site. */
export function defaultOwner(d: Pick<LampData, 'meta'>, r: Room | undefined, x: number, z: number): string {
  const b = r?.building ?? d.meta.buildings?.find((q) => x > q.footprint[0] && x < q.footprint[2] && z > q.footprint[1] && z < q.footprint[3])?.id;
  return b ? `Building ${b}` : 'Site';
}

export interface PlaceCtx {
  data: LampData;
  level: string;
  /** Plan step (meta.objectGrid). */
  grid: number;
  /** The ghost's turn (RB), degrees. */
  yaw: number;
}

/** A new lamp before it has an id and a circuit (both ''). */
export type NewLamp = Lamp;

export interface LampPlace {
  /** The lamps A would add (rack LEDs: one per rack), or none when it cannot go. */
  lamps: NewLamp[];
  why: string | null;
  /** The wall, object or opening it fixes to. */
  on: string | null;
  /** A pole lantern with no lamp post at the dot: A adds the post too (ON5 lamp post) at this point. */
  post: Pt | null;
}

/** The nearest axis-aligned wall face the dot is in front of (within facts light.wallReach). */
export function faceAt(walls: readonly Wall[], level: string, x: number, z: number): { axis: 0 | 1; pos: number; n: 1 | -1; s0: number; s1: number; id: string; gap: number } | null {
  let best: { axis: 0 | 1; pos: number; n: 1 | -1; s0: number; s1: number; id: string; gap: number } | null = null;
  for (const f of wallFaces(walls, level)) {
    const along = f.axis === 0 ? z : x;
    if (along < f.s0 - EPS || along > f.s1 + EPS) continue;
    const gap = ((f.axis === 0 ? x : z) - f.pos) * f.n;
    if (gap < -EPS || gap > LF.wallReach.value + EPS) continue;
    if (!best || gap < best.gap) best = { ...f, gap };
  }
  return best;
}

/** Yaw (degrees) a body faces out of a face: +x 90, -x 270, +z 0, -z 180. */
const faceYaw = (axis: 0 | 1, n: 1 | -1): number => (axis === 0 ? (n > 0 ? 90 : 270) : n > 0 ? 0 : 180);

const base = (f: Fitting, room: Room, d: LampData, at: [number, number, number], yaw: number, on: string | null): NewLamp => {
  const l: NewLamp = { id: '', fixture: f.id, owner: defaultOwner(d, room, at[0], at[2]), room: room.id, at, circuit: '', params: { radius: 0, intensity: 0, color: [1, 1, 1] } };
  if (yaw) l.yaw = yaw;
  if (on) l.on = on;
  if (f.aimPitch !== undefined) l.aim = [(f.alongWall ? yaw + 90 : yaw) % 360, f.aimPitch];
  return l;
};
const finish = (f: Fitting, l: NewLamp): NewLamp => withDefaults(l, f);
const none = (why: string): LampPlace => ({ lamps: [], why, on: null, post: null });

/** The object of one of `ids` under the dot on the level (the smallest). */
function objectUnder(d: LampData, level: string, x: number, z: number, ids: readonly string[]): Obj | null {
  let best: Obj | null = null;
  for (const o of d.objects ?? []) {
    if (o.level !== level || !ids.includes(o.preset ?? '') || !inRect(o.rect, x, z)) continue;
    if (!best || (o.rect[2] - o.rect[0]) * (o.rect[3] - o.rect[1]) < (best.rect[2] - best.rect[0]) * (best.rect[3] - best.rect[1])) best = o;
  }
  return best;
}

/** The opening on the level whose middle is nearest the dot (within facts light.openingReach), with its wall. */
export function openingAt(d: LampData, level: string, x: number, z: number): { o: Opening; w: Wall; mid: Pt } | null {
  let best: { o: Opening; w: Wall; mid: Pt; dist: number } | null = null;
  for (const o of d.openings) {
    const w = d.walls.find((q) => q.id === o.wall);
    if (!w || w.level !== level) continue;
    const dir = wallDir(w);
    const mid: Pt = [w.a[0] + dir[0] * o.at, w.a[1] + dir[1] * o.at];
    const dist = hyp2(x - mid[0], z - mid[1]);
    if (dist > LF.openingReach.value + EPS) continue;
    if (!best || dist < best.dist) best = { o, w, mid, dist };
  }
  return best ? { o: best.o, w: best.w, mid: best.mid } : null;
}

/** Where A puts fitting `f` at the dot, or why it cannot go. */
export function placeLamp(f: Fitting, x: number, z: number, c: PlaceCtx): LampPlace {
  const d = c.data;
  const g = c.grid;
  const roomOf = (px: number, pz: number): Room | null => roomAt(d.rooms, c.level, px, pz);
  if (onCeiling(f) || f.mount === 'floor') {
    const at: Pt = [snap(x, g), snap(z, g)];
    const room = roomOf(at[0], at[1]);
    if (!room) return none('Move into a room or yard');
    // Michael 2026-10-14: the surface over the point (a lowered roof's underside too), the same for the ghost and A
    const ceil = ceilingOver(d, c.level, at[0], at[1]) ?? ceilingOf(d, room);
    let y: number;
    if (f.mount === 'floor') y = f.height ?? 0;
    else if (f.mount === 'pendant') y = Math.min(f.height ?? Infinity, ceil - gapOf((f.drop ?? 0) + f.body[1]));
    else y = ceil - gapOf(f.body[1]);
    y = r3(y);
    if (y <= 0) return none(`The ceiling here is too low for a ${f.name.toLowerCase()}`);
    return { lamps: [finish(f, base(f, room, d, [at[0], r3(y), at[1]], c.yaw % 360, null))], why: null, on: null, post: null };
  }
  if (f.mount === 'wall') {
    const face = faceAt(d.walls, c.level, x, z);
    if (!face) return none('Move onto a wall face');
    const s = Math.min(face.s1, Math.max(face.s0, snap(face.axis === 0 ? z : x, g)));
    const across = r3(face.pos + face.n * gapOf(f.body[2] / 2));
    const p: Pt = face.axis === 0 ? [across, s] : [s, across];
    const room = roomOf(face.axis === 0 ? p[0] + face.n * 0.05 : p[0], face.axis === 0 ? p[1] : p[1] + face.n * 0.05);
    if (!room) return none('Move onto a wall face of a room or yard');
    const yaw = faceYaw(face.axis, face.n);
    return { lamps: [finish(f, base(f, room, d, [p[0], f.height ?? 0, p[1]], yaw, face.id))], why: null, on: face.id, post: null };
  }
  if (f.mount === 'pole') {
    const post = (d.exterior ?? []).find((e) => e.kind === 'lamp-post' && (e.level ?? c.level) === c.level && hyp2(e.a[0] - x, e.a[1] - z) <= LF.lampPick.value);
    const at: Pt = post ? [post.a[0], post.a[1]] : [snap(x, g), snap(z, g)];
    const room = roomOf(at[0], at[1]);
    if (!room) return none('Move into a yard (or onto a lamp post)');
    const floor = d.levels.find((l) => l.id === c.level)?.floor ?? 0;
    const top = post ? post.y1 - floor : facts.climb.lampPost.value;
    return { lamps: [finish(f, base(f, room, d, [at[0], r3(top), at[1]], c.yaw % 360, post?.id ?? null))], why: null, on: post?.id ?? null, post: post ? null : at };
  }
  if (f.mount === 'sign') {
    const op = openingAt(d, c.level, x, z);
    if (!op) return none('Move over a door (an opening)');
    const dir = wallDir(op.w);
    // the face on the dot's side
    const side = (x - op.mid[0]) * -dir[1] + (z - op.mid[1]) * dir[0] >= 0 ? 1 : -1;
    const off = op.w.t / 2 + gapOf(f.body[2] / 2);
    const p: Pt = [r3(op.mid[0] - dir[1] * off * side), r3(op.mid[1] + dir[0] * off * side)];
    const room = roomOf(p[0] - dir[1] * 0.05 * side, p[1] + dir[0] * 0.05 * side);
    if (!room) return none('Move over a door of a room or yard');
    const yaw = Math.round((Math.atan2(-dir[1] * side, dir[0] * side) * 180) / Math.PI + 360) % 360;
    return { lamps: [finish(f, base(f, room, d, [p[0], r3(op.o.sill + op.o.h + LF.signAbove.value), p[1]], yaw, op.o.id))], why: null, on: op.o.id, post: null };
  }
  // desk and object fittings
  const ids = f.onObjects ?? [];
  const o = objectUnder(d, c.level, x, z, ids);
  const names = [...new Set(ids.map((i) => presetOf(i)?.name.toLowerCase() ?? i))];
  if (!o) return none(`Move onto a ${names.slice(0, 2).join(' or ')}`);
  const room = roomOf((o.rect[0] + o.rect[2]) / 2, (o.rect[1] + o.rect[3]) / 2) ?? roomOf(x, z);
  if (!room) return none('The object is not in a room');
  if (f.mount === 'desk') {
    const at: Pt = [Math.min(o.rect[2], Math.max(o.rect[0], snap(x, g))), Math.min(o.rect[3], Math.max(o.rect[1], snap(z, g)))];
    return { lamps: [finish(f, base(f, room, d, [at[0], r3(o.y + o.h + (f.height ?? 0)), at[1]], c.yaw % 360, o.id))], why: null, on: o.id, post: null };
  }
  // on an object's front: the side nearest the dot, just off its face (a light inside a solid box would light nothing)
  const cx = (o.rect[0] + o.rect[2]) / 2;
  const cz = (o.rect[1] + o.rect[3]) / 2;
  const hw = (o.rect[2] - o.rect[0]) / 2;
  const hd = (o.rect[3] - o.rect[1]) / 2;
  const alongX = hw >= hd;
  // a row's front is one of its long sides; a single box takes the side the dot is nearest
  const useZ = f.perUnit ? alongX : Math.abs(z - cz) / Math.max(hd, EPS) >= Math.abs(x - cx) / Math.max(hw, EPS);
  const n = useZ ? (z >= cz ? 1 : -1) : x >= cx ? 1 : -1;
  const y = r3(o.y + (f.height ?? o.h / 2));
  const yaw = useZ ? (n > 0 ? 0 : 180) : n > 0 ? 90 : 270;
  const pts: Pt[] = [];
  if (f.perUnit) {
    const len = alongX ? hw * 2 : hd * 2;
    const unit = presetOf(o.preset ?? '')?.draw?.unit ?? presetOf(o.preset ?? '')?.w ?? len;
    const count = Math.max(1, Math.round(len / unit));
    for (let i = 0; i < count; i++) {
      const s = (alongX ? o.rect[0] : o.rect[1]) + (i + 0.5) * (len / count);
      pts.push(alongX ? [r3(s), r3(n > 0 ? o.rect[3] + 0.03 : o.rect[1] - 0.03)] : [r3(n > 0 ? o.rect[2] + 0.03 : o.rect[0] - 0.03), r3(s)]);
    }
  } else pts.push(useZ ? [r3(cx), r3(n > 0 ? o.rect[3] + 0.05 : o.rect[1] - 0.05)] : [r3(n > 0 ? o.rect[2] + 0.05 : o.rect[0] - 0.05), r3(cz)]);
  return { lamps: pts.map((p) => finish(f, base(f, room, d, [p[0], y, p[1]], yaw, o.id))), why: null, on: o.id, post: null };
}

/** A linear fitting drawn from a to b (on the plan step): at the ceiling, or at its height on a wall line. */
export function drawLamp(f: Fitting, a: Pt, b: Pt, c: PlaceCtx): { lamp: NewLamp | null; why: string | null } {
  const room = roomAt(c.data.rooms, c.level, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2) ?? roomAt(c.data.rooms, c.level, a[0], a[1]);
  if (!room) return { lamp: null, why: 'Move into a room or yard' };
  const ceil = ceilingOver(c.data, c.level, a[0], a[1]) ?? ceilingOf(c.data, room);
  const y = r3(onCeiling(f) ? ceil - gapOf(f.body[1]) : (f.height ?? 0));
  const l = base(f, room, c.data, [a[0], y, a[1]], 0, null);
  l.b = [b[0], y, b[1]];
  return { lamp: finish(f, l), why: null };
}

/** A wall switch at the dot (a wall face within facts light.wallReach), at SWITCH.height. */
export function placeSwitch(x: number, z: number, c: PlaceCtx): { sw: NonNullable<Circuit['switch']> | null; why: string | null; room: Room | null } {
  const face = faceAt(c.data.walls, c.level, x, z);
  if (!face) return { sw: null, why: 'Move onto a wall face for the switch', room: null };
  const s = Math.min(face.s1, Math.max(face.s0, snap(face.axis === 0 ? z : x, c.grid)));
  const across = r3(face.pos + face.n * (SWITCH.d / 2));
  const p: Pt = face.axis === 0 ? [across, s] : [s, across];
  return { sw: { at: [p[0], SWITCH.height, p[1]], wall: face.id }, why: null, room: roomAt(c.data.rooms, c.level, p[0], p[1]) };
}

/** The room a switch serves (the room its plate is in). */
export function switchRoom(d: Pick<LampData, 'rooms' | 'walls'>, c: Circuit): Room | null {
  return c.switch ? roomAt(d.rooms, circuitLevel(d, c), c.switch.at[0], c.switch.at[2]) : null;
}

/** The lamp nearest the dot on the level, within facts light.lampPick (A with a switch adds it). */
export function lampNear(d: LampData, level: string, x: number, z: number): Lamp | null {
  let best: { l: Lamp; dist: number } | null = null;
  for (const l of d.lamps ?? []) {
    if (lampLevel(d, l) !== level) continue;
    const b = l.b ?? l.at;
    const dist = Math.min(hyp2(l.at[0] - x, l.at[2] - z), hyp2(b[0] - x, b[2] - z), hyp2((l.at[0] + b[0]) / 2 - x, (l.at[2] + b[2]) / 2 - z));
    if (dist <= LF.lampPick.value + EPS && (!best || dist < best.dist)) best = { l, dist };
  }
  return best?.l ?? null;
}

/**
 * The circuit a new lamp goes on (ON6 decision 11): a switched fitting joins the nearest switch's circuit in its room,
 * else a new circuit (no switch yet); emergency, photocell and equipment lights join a circuit of their kind already in
 * the room, else a new one; PIR, desk and door lights each get their own. New circuits carry the real reason.
 */
export function defaultCircuit(d: LampData, l: Pick<Lamp, 'id' | 'room' | 'at' | 'fixture'>, taken: readonly string[] = []): { circuit: string; add: Circuit | null } {
  const f = fittingOf(l.fixture);
  const kind = f?.circuit ?? 'switched';
  const reason = CIRCUIT_REASON[kind];
  const cs = d.circuits ?? [];
  if (kind === 'switched') {
    let best: { c: Circuit; dist: number } | null = null;
    for (const c of cs) {
      if (!c.switch || c.unswitchable || switchRoom(d, c)?.id !== l.room) continue;
      const dist = hyp2(c.switch.at[0] - l.at[0], c.switch.at[2] - l.at[2]);
      if (!best || dist < best.dist) best = { c, dist };
    }
    if (best) return { circuit: best.c.id, add: null };
  } else if (kind === 'emergency' || kind === 'photocell' || kind === 'equipment') {
    const roomOf = new Map((d.lamps ?? []).map((q) => [q.id, q.room]));
    const same = cs.find((c) => c.unswitchable === reason && c.lamps.some((id) => roomOf.get(id) === l.room));
    if (same) return { circuit: same.id, add: null };
  }
  const id = nextId([...cs, ...taken.map((t) => ({ id: t }))], 'C');
  return { circuit: id, add: { id, switch: null, lamps: [l.id], unswitchable: reason } };
}

/**
 * The model's link for lamps and circuits (as vertical.ts `stairwellLink` for stairs): a lamp's `circuit` is the one
 * source; every change to it (added, moved to another circuit, renamed, deleted) brings the circuits' `lamps` lists along
 * in the same edit, so a lamp is on one circuit only. A circuit named that does not exist yet is made (the card's "New
 * circuit"); a circuit with no switch left with no lamps goes; a deleted circuit's lamps are left on none.
 */
export function circuitLink(d: Pick<LampData, 'circuits' | 'lamps'>, changes: readonly Change[]): Change[] {
  if (!changes.some((c) => c.coll === 'lamps' || (c.coll === 'circuits' && !c.after))) return [];
  const explicit = new Set(changes.filter((c) => c.coll === 'circuits').map((c) => c.id));
  const before = new Map<string, Circuit | null>();
  const work = new Map<string, Circuit>();
  const get = (id: string): Circuit | null => {
    if (!id || explicit.has(id)) return null;
    let w = work.get(id);
    if (!w) {
      const c = (d.circuits ?? []).find((q) => q.id === id);
      before.set(id, c ? clone(c) : null);
      w = c ? clone(c) : { id, switch: null, lamps: [], unswitchable: '' };
      work.set(id, w);
    }
    return w;
  };
  const out: Change[] = [];
  for (const c of changes) {
    if (c.coll === 'circuits' && c.before && !c.after) {
      // a deleted circuit: its lamps are on none
      for (const id of (c.before as unknown as Circuit).lamps) {
        const l = (d.lamps ?? []).find((q) => q.id === id);
        if (l && !changes.some((x) => x.coll === 'lamps' && x.id === id)) out.push({ coll: 'lamps', id, before: clone(l) as unknown as Elem, after: { ...clone(l), circuit: '' } as unknown as Elem });
      }
      continue;
    }
    if (c.coll !== 'lamps') continue;
    const from = (c.before as unknown as Lamp | null)?.circuit ?? '';
    const to = (c.after as unknown as Lamp | null)?.circuit ?? '';
    const newId = (c.after as unknown as Lamp | null)?.id ?? null;
    if (from === to && newId === c.id) continue;
    const a = get(from);
    if (a) a.lamps = a.lamps.filter((id) => id !== c.id);
    const b = get(to);
    if (b && newId && !b.lamps.includes(newId)) b.lamps.push(newId);
  }
  for (const [id, w] of work) {
    const was = before.get(id) ?? null;
    if (!was) {
      if (w.lamps.length) out.push({ coll: 'circuits', id, before: null, after: w as unknown as Elem });
    } else if (!w.switch && !w.lamps.length) out.push({ coll: 'circuits', id, before: was as unknown as Elem, after: null });
    else if (JSON.stringify(w) !== JSON.stringify(was)) out.push({ coll: 'circuits', id, before: was as unknown as Elem, after: w as unknown as Elem });
  }
  return out;
}

/** "Troffer 600 x 300 (LP3): 1800 lm, 4000 K, 110 deg beam, reach 4.5 m; on C2 (switch on WG012)". */
export function lampWords(d: LampData, l: Lamp): string {
  const f = fittingOf(l.fixture);
  const c = (d.circuits ?? []).find((q) => q.id === l.circuit);
  const len = lampLength(l);
  const parts = [`${fmt(lampLumens(l))} lm${len ? ` over ${fmt(len)} m` : ''}`, `${l.kelvin ?? f?.kelvin ?? 0} K`, `${l.beam ?? f?.beam ?? 0} deg beam`, `reach ${fmt(l.params.radius)} m`];
  if (l.emergency) parts.push(l.emergency);
  if (l.motion) parts.push('PIR');
  if (l.breakable) parts.push('breakable');
  const circ = c ? `on ${c.id} (${c.switch ? `switch on ${c.switch.wall}` : c.unswitchable || 'no switch yet'})` : 'on no circuit';
  return `${l.name || f?.name || l.fixture} (${l.id}): ${parts.join(', ')}; ${circ}`;
}

/** "Switch C2 on WG012: 4 lamps". */
export function circuitWords(c: Circuit): string {
  const n = c.lamps.length;
  return `${c.switch ? `Switch ${c.id} on ${c.switch.wall}` : `Circuit ${c.id}${c.unswitchable ? ` (${c.unswitchable})` : ''}`}: ${n} lamp${n === 1 ? '' : 's'}`;
}

// ---------- the card (D-pad) ----------
export interface LampRow {
  id: string;
  label: string;
  value: string;
  kind: 'list' | 'len' | 'flag';
}

const EMERGENCY: readonly ('' | Emergency)[] = ['', 'maintained', 'non-maintained'];
const EMERGENCY_WORDS: Record<string, string> = { '': 'no', maintained: 'maintained (always on)', 'non-maintained': 'non-maintained (mains-off only)' };

/** A lamp's card rows after Type and Name: lumens, colour temperature, beam, height, aim, the flags, circuit, owner. */
export function lampRows(l: Lamp): LampRow[] {
  const f = fittingOf(l.fixture);
  const rows: LampRow[] = [
    { id: 'lumens', label: f?.linear ? 'Lumens per m' : 'Lumens', value: `${l.lumens ?? f?.lumens ?? 0} lm${l.lumens !== undefined && l.lumens !== f?.lumens ? ` (catalogue ${f?.lumens ?? 0})` : ''}`, kind: 'list' },
    { id: 'kelvin', label: 'Colour temp', value: f?.colour ? 'its own colour' : `${l.kelvin ?? f?.kelvin ?? 0} K`, kind: 'list' },
    { id: 'beam', label: 'Beam', value: `${l.beam ?? f?.beam ?? 0} deg`, kind: 'list' },
    { id: 'height', label: 'Height', value: `${fmt(l.at[1])} m`, kind: 'len' },
  ];
  if (l.aim) rows.push({ id: 'aimYaw', label: 'Aim turn', value: `${l.aim[0]} deg`, kind: 'list' }, { id: 'aimPitch', label: 'Aim down', value: `${l.aim[1]} deg`, kind: 'list' });
  rows.push(
    { id: 'emergency', label: 'Emergency', value: EMERGENCY_WORDS[l.emergency ?? ''] ?? 'no', kind: 'list' },
    { id: 'motion', label: 'Motion (PIR)', value: l.motion ? 'yes' : 'no', kind: 'flag' },
    { id: 'breakable', label: 'Breakable', value: l.breakable ? 'yes' : 'no', kind: 'flag' },
    { id: 'circuit', label: 'Circuit', value: l.circuit || 'none', kind: 'list' },
    { id: 'owner', label: 'Owner', value: l.owner || 'none', kind: 'list' },
  );
  return rows;
}

const wrap = <T>(list: readonly T[], cur: T, dir: number): T => list[(Math.max(0, list.indexOf(cur)) + dir + list.length) % list.length]!;

/** Circuits a lamp can be put on from the card: those on its level (switches there, or lamps there), then a new one. */
export function circuitChoices(d: LampData, l: Lamp): string[] {
  const lv = lampLevel(d, l);
  const levelOf = new Map((d.lamps ?? []).map((q) => [q.id, lampLevel(d, q)]));
  const ids = (d.circuits ?? []).filter((c) => c.id === l.circuit || circuitLevel(d, c) === lv || c.lamps.some((id) => levelOf.get(id) === lv)).map((c) => c.id);
  return [...ids, circuitId(d)];
}

/** One D-pad step on a lamp's row (Type steps the fitting within its group and kind); null when nothing changes. */
export function stepLamp(d: LampData, l: Lamp, row: string, dir: 1 | -1, step: number): Lamp | null {
  const f = fittingOf(l.fixture);
  if (!f) return null;
  const a: Lamp = clone(l);
  if (row === 'type') {
    const fam = FITTINGS.filter((q) => q.group === f.group && q.linear === f.linear && q.mount === f.mount);
    if (fam.length < 2) return null;
    const nf = wrap(fam, f, dir);
    a.fixture = nf.id;
    if (nf.aimPitch !== undefined && !a.aim) a.aim = [a.yaw ?? 0, nf.aimPitch];
    return withDefaults(a, nf);
  }
  if (row === 'lumens') {
    const cur = l.lumens ?? f.lumens;
    const st = cur >= 2000 ? 500 : cur >= 500 ? 100 : 10;
    const v = Math.max(10, cur + dir * st);
    if (v === f.lumens) delete a.lumens;
    else a.lumens = v;
  } else if (row === 'kelvin') {
    if (f.colour) return null;
    const v = wrap(KELVIN_STEPS as readonly number[], l.kelvin ?? f.kelvin, dir);
    if (v === f.kelvin) delete a.kelvin;
    else a.kelvin = v;
  } else if (row === 'beam') {
    const v = Math.min(180, Math.max(10, (l.beam ?? f.beam) + dir * 10));
    if (v === f.beam) delete a.beam;
    else a.beam = v;
  } else if (row === 'height') {
    const v = Math.max(0, r3(l.at[1] + dir * step));
    a.at = [l.at[0], v, l.at[2]];
    if (a.b) a.b = [a.b[0], v, a.b[2]];
  } else if (row === 'aimYaw' && a.aim) a.aim = [(((a.aim[0] + dir * 15) % 360) + 360) % 360, a.aim[1]];
  else if (row === 'aimPitch' && a.aim) a.aim = [a.aim[0], Math.min(90, Math.max(-90, a.aim[1] + dir * 5))];
  else if (row === 'emergency') {
    const v = wrap(EMERGENCY, l.emergency ?? '', dir);
    if (v) a.emergency = v;
    else delete a.emergency;
  } else if (row === 'motion') {
    if (l.motion) delete a.motion;
    else a.motion = true;
  } else if (row === 'breakable') a.breakable = !l.breakable;
  else if (row === 'circuit') a.circuit = wrap(circuitChoices(d, l), l.circuit, dir);
  else if (row === 'owner') {
    const owners = [...new Set(['Site', ...(d.meta.buildings ?? []).map((b) => `Building ${b.id}`), ...(d.lamps ?? []).map((q) => q.owner).filter(Boolean)])];
    a.owner = wrap(owners, l.owner, dir);
  } else return null;
  const out = withParams(a);
  return JSON.stringify(out) === JSON.stringify(l) ? null : out;
}

/** Moved by (dx, dz) on the plan (both ends of a linear fitting); its room follows when it crosses into another. */
export function moveLamp(d: LampData, l: Lamp, dx: number, dz: number): Lamp {
  const a: Lamp = clone(l);
  a.at = [r3(l.at[0] + dx), l.at[1], r3(l.at[2] + dz)];
  if (l.b) a.b = [r3(l.b[0] + dx), l.b[1], r3(l.b[2] + dz)];
  const lv = lampLevel(d, l);
  const r = roomAt(d.rooms, lv, a.at[0], a.at[2]);
  if (r) a.room = r.id;
  return withParams(a);
}

/** A lamp slid on its surface: the lamp, the lines it snapped to (guides), and the ceiling it is under. */
export interface LampSlide {
  lamp: Lamp;
  snap: SlideSnap | null;
  surface: CeilingSurface | null;
  /** A wall fitting: the wall it slides along and the line (along it, from its start) it snapped to. */
  wall?: { id: string; t: number | null };
}

/**
 * Michael 2026-10-14: a placed lamp slid by (dx, dz) across the surface it is mounted on. A ceiling fitting moves over
 * the ceiling (on the grid `grid`), snapping to the surface's centre and quarter lines within `magnet` (`off`: LB held);
 * where the ceiling over the new point is another surface (a lowered roof, the next room) it keeps its drop under that
 * one; off every ceiling it stays at the edge of its own. A wall fitting slides along its wall (its height is the
 * triggers'), snapping to the wall's centre and quarter points. Linear and other fittings move as `moveLamp`.
 */
export function slideLamp(d: LampData, l: Lamp, dx: number, dz: number, opt: { grid: number; magnet: number; off: boolean }): LampSlide {
  const f = fittingOf(l.fixture);
  const lv = lampLevel(d, l);
  const g = opt.grid;
  if (f && !l.b && onCeiling(f)) {
    const c0 = lampCentre(l);
    const s0 = ceilingSurface(d, lv, c0[0], c0[1]);
    let x = snap(c0[0] + dx, g);
    let z = snap(c0[1] + dz, g);
    let s1 = ceilingSurface(d, lv, x, z);
    if (!s1 && s0) {
      [x, z] = clampToRect(x, z, s0.rect);
      s1 = ceilingSurface(d, lv, x, z);
    }
    const s = s1 ?? s0;
    const sn = s ? snapSlide(x, z, s.rect, opt.magnet, opt.off) : null;
    if (sn) {
      x = sn.x;
      z = sn.z;
    }
    const m = moveLamp(d, l, r3(x - c0[0]), r3(z - c0[1]));
    const dy = s0 && s ? s.y - s0.y : 0;
    if (Math.abs(dy) > 1e-6) m.at = [m.at[0], r3(Math.max(0.05, m.at[1] + dy)), m.at[2]];
    return { lamp: withParams(m), snap: sn && (sn.lx !== null || sn.lz !== null) ? sn : null, surface: s };
  }
  const w = f?.mount === 'wall' && !l.b ? d.walls.find((q) => q.id === l.on) : undefined;
  if (w) {
    const dir = wallDir(w);
    const len = hyp2(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const t0 = (l.at[0] - w.a[0]) * dir[0] + (l.at[2] - w.a[1]) * dir[1];
    let t = Math.min(len, Math.max(0, snap(t0 + alongWall(dx, dz, dir[0], dir[1]), g)));
    const line = opt.off ? null : snapAxis(t, 0, len, opt.magnet);
    if (line !== null) t = line;
    const k = t - t0;
    return { lamp: moveLamp(d, l, r3(dir[0] * k), r3(dir[1] * k)), snap: null, surface: null, wall: { id: w.id, t: line } };
  }
  return { lamp: moveLamp(d, l, snap(dx, g), snap(dz, g)), snap: null, surface: null };
}

/** The plan point of a lamp (a linear one's middle). */
export const lampCentre = (l: Pick<Lamp, 'at' | 'b'>): Pt => {
  const b = l.b ?? l.at;
  return [(l.at[0] + b[0]) / 2, (l.at[2] + b[2]) / 2];
};
