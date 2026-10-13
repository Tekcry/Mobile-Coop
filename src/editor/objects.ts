/**
 * ON4 objects (pure, Babylon-free; tests/editor/objects.test.ts): placing a catalogue preset at the dot (turned, on the
 * object grid, backed onto a wall face), drawn rows in whole units, the aisle to the next parallel row, the stealth
 * badges and the stealth view's tints. Every rule number comes from scripts/kestrel/facts.json; a missing fact gives a
 * "no fact" note and no badge, never a typed number.
 */
import facts from '../../scripts/kestrel/facts.json';
import { fmt, normRect, snap } from './geometry';
import { groupPresets, presetOf } from './catalogue';
import type { Preset } from './catalogue';
import type { Campus, Obj, Rect, Wall } from './types';

const EPS = 1e-6;
const r3 = (v: number): number => +v.toFixed(3);

/** The facts the object rules read, by `group.name`; a missing one stays undefined. */
export const OBJECT_FACTS = ['player.standHeight', 'player.crouchHeight', 'traverse.stepMax', 'traverse.vaultMax', 'traverse.vaultDepth', 'traverse.mantleMax', 'reach.grabMax', 'reach.jumpGrab', 'lip.autoHeight', 'lip.minLength', 'rules.aisleMin', 'rules.aisleTallObject', 'rules.aisleMaxGap'] as const;
export type ObjectFact = (typeof OBJECT_FACTS)[number];
export type FactSet = Partial<Record<ObjectFact, number>>;

function readFacts(): FactSet {
  const out: FactSet = {};
  const all = facts as unknown as Record<string, Record<string, { value?: number } | undefined> | undefined>;
  for (const k of OBJECT_FACTS) {
    const [g, n] = k.split('.') as [string, string];
    const v = all[g]?.[n]?.value;
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}
export const FACTS: FactSet = readFacts();

// ---------- the object record ----------
/** Footprint size along x and z for a yaw (90 and 270 swap the preset's w and d). */
export function sizeFor(p: Pick<Preset, 'w' | 'd'>, yaw: number): [number, number] {
  return yaw % 180 === 0 ? [p.w, p.d] : [p.d, p.w];
}

/** A fresh object id: O001, O002 ... (schema.md section 2). */
export function objectId(d: Pick<Campus, 'objects'>): string {
  const used = new Set(((d.objects as Obj[] | undefined) ?? []).map((o) => o.id));
  for (let n = 1; ; n++) {
    const id = `O${String(n).padStart(3, '0')}`;
    if (!used.has(id)) return id;
  }
}

/** A new object of a preset on a footprint (key order as schema.md; `yaw` and `seeThrough` only when set). */
export function newObject(id: string, level: string, p: Preset, rect: Rect, yaw = 0): Obj {
  const o: Obj = { id, level, name: p.name, preset: p.id, rect, h: p.h, y: p.y };
  if (yaw) o.yaw = yaw;
  o.noLedge = p.noLedge;
  if (p.seeThrough) o.seeThrough = true;
  o.reason = '';
  return o;
}

// ---------- placing ----------
/** The footprint of a preset centred at (x, z), turned by `yaw`, its corner on the object grid. */
export function placeRect(p: Pick<Preset, 'w' | 'd'>, yaw: number, x: number, z: number, grid: number): Rect {
  const [w, d] = sizeFor(p, yaw);
  const x0 = snap(x - w / 2, grid);
  const z0 = snap(z - d / 2, grid);
  return [x0, z0, r3(x0 + w), r3(z0 + d)];
}

/** Axis-aligned wall faces on a level: plane `axis` (0: x = pos, 1: z = pos), the span on the other axis, outward normal. */
function wallFaces(walls: readonly Wall[], level: string): { axis: 0 | 1; pos: number; n: 1 | -1; s0: number; s1: number; id: string }[] {
  const out: { axis: 0 | 1; pos: number; n: 1 | -1; s0: number; s1: number; id: string }[] = [];
  for (const w of walls) {
    if (w.level !== level) continue;
    if (Math.abs(w.a[0] - w.b[0]) < EPS) {
      const s0 = Math.min(w.a[1], w.b[1]);
      const s1 = Math.max(w.a[1], w.b[1]);
      out.push({ axis: 0, pos: w.a[0] - w.t / 2, n: -1, s0, s1, id: w.id }, { axis: 0, pos: w.a[0] + w.t / 2, n: 1, s0, s1, id: w.id });
    } else if (Math.abs(w.a[1] - w.b[1]) < EPS) {
      const s0 = Math.min(w.a[0], w.b[0]);
      const s1 = Math.max(w.a[0], w.b[0]);
      out.push({ axis: 1, pos: w.a[1] - w.t / 2, n: -1, s0, s1, id: w.id }, { axis: 1, pos: w.a[1] + w.t / 2, n: 1, s0, s1, id: w.id });
    }
  }
  return out;
}

/**
 * Backs a footprint onto the nearest wall face within the closed-gap fact (rules.aisleMaxGap: a gap that small is closed
 * anyway): the side facing the wall moves onto its face. `wall` names the wall it now touches, if any.
 */
export function backToWall(rect: Rect, walls: readonly Wall[], level: string, F: FactSet = FACTS): { rect: Rect; wall: string | null } {
  const reach = F['rules.aisleMaxGap'];
  if (reach === undefined) return { rect, wall: null };
  let best: { shift: number; axis: 0 | 1; id: string } | null = null;
  for (const f of wallFaces(walls, level)) {
    const lo = f.axis === 0 ? rect[1] : rect[0];
    const hi = f.axis === 0 ? rect[3] : rect[2];
    if (Math.min(hi, f.s1) - Math.max(lo, f.s0) <= EPS) continue;
    // the object on the face's outward side: its near edge onto the face
    const near = f.n > 0 ? rect[f.axis] : rect[f.axis + 2]!;
    const gap = f.n > 0 ? near - f.pos : f.pos - near;
    if (gap < -EPS || gap > reach + EPS) continue;
    const shift = f.n > 0 ? -gap : gap;
    if (!best || Math.abs(shift) < Math.abs(best.shift)) best = { shift, axis: f.axis, id: f.id };
  }
  if (!best) return { rect, wall: null };
  const r = rect.slice() as Rect;
  r[best.axis] = r3(r[best.axis]! + best.shift);
  r[best.axis + 2] = r3(r[best.axis + 2]! + best.shift);
  return { rect: r, wall: best.id };
}

/** A preset placed at the dot: footprint, the wall it backs onto, and why it cannot go (a wall-mounted one off a wall). */
export function placeObject(p: Preset, yaw: number, x: number, z: number, grid: number, walls: readonly Wall[], level: string, F: FactSet = FACTS): { rect: Rect; wall: string | null; why: string | null } {
  const at = backToWall(placeRect(p, yaw, x, z, grid), walls, level, F);
  return { ...at, why: p.mount === 'wall' && !at.wall ? 'Move onto a wall' : null };
}

/** A quarter turn about the footprint's centre: w and d swap, the corner stays on the grid, the size is kept. */
export function turnObject(o: Obj, grid: number): Obj {
  const r = o.rect;
  const w = r[2] - r[0];
  const d = r[3] - r[1];
  const cx = (r[0] + r[2]) / 2;
  const cz = (r[1] + r[3]) / 2;
  const x0 = snap(cx - d / 2, grid);
  const z0 = snap(cz - w / 2, grid);
  const yaw = ((o.yaw ?? 0) + 90) % 360;
  const out: Obj = { ...o, rect: [x0, z0, r3(x0 + d), r3(z0 + w)] };
  if (yaw) out.yaw = yaw;
  else delete out.yaw;
  return out;
}

// ---------- rows ----------
/**
 * A drawn row from a to b (decision 9, as walls): along the longer axis, its length in whole `unit`s (racks) or on the
 * grid, at least one unit; `d` across, centred on the line with its edge on the grid. `n` is the number of units.
 */
export function rowRect(p: Preset, a: [number, number], b: [number, number], grid: number): { rect: Rect; n: number; axis: 0 | 1; yaw: number } {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const axis: 0 | 1 = Math.abs(dx) >= Math.abs(dz) ? 0 : 1;
  const along = axis === 0 ? dx : dz;
  const unit = p.draw?.unit ?? grid;
  const n = Math.max(1, Math.round(Math.abs(along) / unit));
  const len = r3(n * unit);
  const s0 = axis === 0 ? a[0] : a[1];
  const s1 = r3(s0 + (along < 0 ? -len : len));
  const c = axis === 0 ? a[1] : a[0];
  const c0 = snap(c - p.d / 2, grid);
  const c1 = r3(c0 + p.d);
  const rect = normRect(axis === 0 ? [s0, c0, s1, c1] : [c0, s0, c1, s1]);
  // a row along z is the preset turned a quarter (its d across x)
  return { rect, n, axis, yaw: axis === 0 ? 0 : 90 };
}

/** Units in a drawn row (whole racks), from its footprint. */
export function rowCount(o: Obj): number {
  const p = presetOf(o.preset as string | undefined);
  const unit = p?.draw?.unit;
  if (!unit) return 0;
  const len = Math.max(o.rect[2] - o.rect[0], o.rect[3] - o.rect[1]);
  return Math.round(len / unit);
}

// ---------- aisles ----------
export interface AisleInfo {
  gap: number;
  ok: boolean;
  words: string;
  other: string;
}

const onFloor = (o: Pick<Obj, 'y'>): boolean => Math.abs(o.y ?? 0) < EPS;

/**
 * The clear width to the next parallel tall object on the level (check A26: beside anything taller than
 * rules.aisleTallObject a gap is either closed, at most rules.aisleMaxGap, or a real aisle of rules.aisleMin).
 * Null when the object is not tall, no fact, or nothing runs beside it.
 */
export function aisleOf(rect: Rect, h: number, level: string, objs: readonly Obj[], skip: string | null, F: FactSet = FACTS): AisleInfo | null {
  const tall = F['rules.aisleTallObject'];
  const min = F['rules.aisleMin'];
  const closed = F['rules.aisleMaxGap'];
  if (tall === undefined || min === undefined || closed === undefined || h <= tall) return null;
  // the row runs along its longer side; the aisle is across it
  const along: 0 | 1 = rect[2] - rect[0] >= rect[3] - rect[1] ? 0 : 1;
  const cross = (1 - along) as 0 | 1;
  let best: { gap: number; id: string } | null = null;
  for (const o of objs) {
    if (o.id === skip || o.level !== level || !onFloor(o) || (o.h ?? 0) <= tall || !Array.isArray(o.rect)) continue;
    const r = o.rect;
    if (Math.min(rect[along + 2]!, r[along + 2]!) - Math.max(rect[along]!, r[along]!) <= EPS) continue;
    const gap = Math.max(r[cross]! - rect[cross + 2]!, rect[cross]! - r[cross + 2]!);
    if (gap <= EPS) continue;
    if (!best || gap < best.gap) best = { gap: r3(gap), id: o.id };
  }
  if (!best) return null;
  const ok = best.gap <= closed + EPS || best.gap >= min - EPS;
  const words = best.gap <= closed + EPS ? `closed up to ${best.id} (${fmt(best.gap)} m)` : ok ? `aisle ${fmt(best.gap)} m clear to ${best.id}` : `aisle ${fmt(best.gap)} m to ${best.id}: under ${fmt(min)} m`;
  return { gap: best.gap, ok, words, other: best.id };
}

// ---------- stealth badges ----------
export type Badge = 'full' | 'crouch' | 'vault' | 'climb' | 'hang';
export const BADGE_WORDS: Record<Badge, string> = { full: 'Full cover', crouch: 'Crouch cover', vault: 'Vault', climb: 'Climb', hang: 'Hang' };

/**
 * What an object does for the player (decision 10), from facts only: full cover (top above standing height), crouch
 * cover (top above crouch height, at or under standing), vault (top at or under the vault limit, thin enough), climb
 * (a mantle, or a lip within grab reach, not `noLedge`), hang (a lip the jump grabs, long enough). `seeThrough` gives no
 * cover. Cover, vault and mantle need the object standing on the floor. A missing fact: no badge, a note.
 */
export function badgesOf(o: Pick<Obj, 'rect' | 'h' | 'y' | 'noLedge' | 'seeThrough'>, F: FactSet = FACTS): { badges: Badge[]; notes: string[] } {
  const badges: Badge[] = [];
  const notes: string[] = [];
  const need = (what: string, ...ks: ObjectFact[]): number[] | null => {
    const vs = ks.map((k) => F[k]);
    if (vs.every((v) => v !== undefined)) return vs as number[];
    notes.push(`${what}: no fact (${ks.filter((k) => F[k] === undefined).join(', ')})`);
    return null;
  };
  const h = o.h ?? 0;
  const y = o.y ?? 0;
  const top = y + h;
  const floor = Math.abs(y) < EPS;
  const r = o.rect;
  const w = Math.abs(r[2] - r[0]);
  const d = Math.abs(r[3] - r[1]);
  const ledge = !o.noLedge;
  if (o.seeThrough) notes.push('See-through: no cover');
  else if (floor) {
    const c = need('Cover', 'player.standHeight', 'player.crouchHeight');
    if (c) {
      const [stand, crouch] = c as [number, number];
      if (top > stand + EPS) badges.push('full');
      else if (top > crouch + EPS) badges.push('crouch');
    }
  }
  if (floor) {
    const v = need('Vault', 'traverse.stepMax', 'traverse.vaultMax', 'traverse.vaultDepth');
    if (v) {
      const [step, vmax, vdepth] = v as [number, number, number];
      if (top > step + EPS && top <= vmax + EPS && Math.min(w, d) <= vdepth + EPS) badges.push('vault');
    }
  }
  const cl = need('Climb', 'traverse.stepMax', 'traverse.mantleMax', 'lip.autoHeight', 'reach.grabMax');
  if (cl && ledge) {
    const [step, mantle, lip, grab] = cl as [number, number, number, number];
    if ((floor && top > step + EPS && top <= mantle + EPS) || (top >= lip - EPS && top <= grab + EPS)) badges.push('climb');
  }
  const hg = need('Hang', 'lip.autoHeight', 'lip.minLength', 'reach.jumpGrab');
  if (hg && ledge) {
    const [lip, minLen, jump] = hg as [number, number, number];
    if (top >= lip - EPS && top <= jump + EPS && Math.max(w, d) >= minLen - EPS) badges.push('hang');
  }
  return { badges, notes };
}

/** The stealth view's tint (decision 11): full cover green, crouch cover yellow, climb blue, see-through grey; else none. */
export function stealthTint(o: Pick<Obj, 'rect' | 'h' | 'y' | 'noLedge' | 'seeThrough'>, F: FactSet = FACTS): string | null {
  if (o.seeThrough) return '#8e8e93';
  const b = badgesOf(o, F).badges;
  if (b.includes('full')) return '#30c85a';
  if (b.includes('crouch')) return '#ffd60a';
  if (b.includes('climb') || b.includes('hang') || b.includes('vault')) return '#0a84ff';
  return null;
}

/** The badges as short words for the card and the icon over the object ("Full cover, Climb"). */
export function badgeWords(o: Obj, F: FactSet = FACTS): string {
  const { badges, notes } = badgesOf(o, F);
  return [...badges.map((b) => BADGE_WORDS[b]), ...notes].join(', ') || 'No cover, no climb';
}

// ---------- the card ----------
export const TURNS = [0, 90, 180, 270] as const;

/** A preset swapped in (the card's Type row): sizes (kept turned), height, base and flags; a drawn row keeps its length. */
export function withPreset(o: Obj, p: Preset): Obj {
  const yaw = o.yaw ?? 0;
  const [w, d] = sizeFor(p, yaw);
  const r = o.rect;
  const out: Obj = { ...o };
  if (o.name === presetOf(o.preset as string | undefined)?.name || !o.name) out.name = p.name;
  out.preset = p.id;
  if (p.draw) {
    // keep the drawn length along the row, the new preset's width across
    const along = r[2] - r[0] >= r[3] - r[1] ? 0 : 1;
    out.rect = along === 0 ? [r[0], r[1], r[2], r3(r[1] + p.d)] : [r[0], r[1], r3(r[0] + p.d), r[3]];
  } else out.rect = [r[0], r[1], r3(r[0] + w), r3(r[1] + d)];
  out.h = p.h;
  out.y = p.y;
  out.noLedge = p.noLedge;
  if (p.seeThrough) out.seeThrough = true;
  else delete out.seeThrough;
  return out;
}

/** The next preset of the object's group (the Type row: left / right). */
export function stepPreset(o: Obj, dir: 1 | -1): Obj | null {
  const p = presetOf(o.preset as string | undefined);
  if (!p) return null;
  const ps = groupPresets(p.group).filter((q) => !!q.draw === !!p.draw);
  const i = ps.findIndex((q) => q.id === p.id);
  const next = ps[(i + dir + ps.length) % ps.length];
  return next && next.id !== p.id ? withPreset(o, next) : null;
}
