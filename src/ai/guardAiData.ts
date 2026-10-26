/**
 * Guard-ai map data (pure: no Babylon / DOM): the types map teams fill and the validators they run in their tests
 * (guard-ai S5 / S5b, design section 11, PLAN "Data shapes"). Every field is optional and the defaults reproduce the
 * game before guard-ai: no zones = one section (0), no noisy sources = no masking, no entries = the map's own
 * reinforcement points, no squads = `defaultSquads` clusters.
 *
 * Wiring (a later step, not this file): `SquadSlot.post?: PostDef` / `profile?: BehaviourProfile` / `key?: number`
 * (rooms.ts), `MapLayout.guardAi?: GuardAiLayout` (mapDef.ts), `SectorDef.noisy?` / `entries?` (sectors.ts; the section
 * is the SectorDef's index), `EnemyManager.placeSlot(e, slot, section)`.
 *
 * Sections and squads: a guard belongs to one section (a Sector Ops `SectorDef` index, or a `GuardZone.section` on
 * other maps) and, inside it, to one squad. A squad's global id is `squadId(section, squad)` = section x 100 + squad, so
 * squads of different sections never share an id (`EnemyManager.joinSquad`). Hand-set squads (`SectorGuard.squad`)
 * use 0..`DEFAULT_SQUAD_BASE - 1`; the clusters `defaultSquads` builds for guards with none use
 * `DEFAULT_SQUAD_BASE + cluster`.
 */
import type { RoomRect, SquadSlot } from '../world/rooms';
import type { GearTag } from './gear';
import type { NoisySource } from './hearing';
import { POST, type PostDef } from './posts';

export type { GearTag } from './gear';
export type { NoisySource } from './hearing';
export type { PostDef } from './posts';

/** A section's area on a non-Sector map (`MapLayout.guardAi.zones`): radio reaches the guards of its section only. */
export interface GuardZone {
  id: string;
  section: number;
  rects: RoomRect[];
}

/** Where alarm reinforcements come into a section (design section 7). */
export interface ReinforceEntry {
  section: number;
  at: [number, number];
  y?: number;
  /** Walked (run) into the section; none = straight to the last known position by nav. */
  route?: [number, number][];
  yaw?: number;
}

/** A named squad of a section (radio checks, pairs, role groups). */
export interface GuardSquadDef {
  id: string;
  section: number;
  /** The officer's slot id (barks, alarm runner preference); free text, not validated. */
  officer?: string;
}

/** `MapLayout.guardAi` (wiring step). */
export interface GuardAiLayout {
  /** Non-Sector maps; none = one section (0) for the whole map. */
  zones?: GuardZone[];
  /** Noisy things that mask hearing (hearing.ts). */
  noisy?: NoisySource[];
  /** None = the map's `reinforce` / `SectorDef.reinforce` points. */
  entries?: ReinforceEntry[];
  squads?: GuardSquadDef[];
}

/** Behaviour profile of a hand-placed guard (`SquadSlot.profile`, wiring step); reinforcements are always aggressive. */
export type BehaviourProfile = 'standard' | 'aggressive';

/** The slot fields guard-ai reads. A `SquadSlot` today, and with the wiring step `post` / `profile` / `key` on it and
 *  `squad` on `SectorGuard`, satisfies it as it is. */
export type GuardSlot = Pick<SquadSlot, 'x' | 'z' | 'y' | 'route' | 'free'> & {
  post?: PostDef;
  profile?: BehaviourProfile;
  /** Guard key override in its section (else the slot's index among its section's slots). */
  key?: number;
  /** Hand-set squad number in its section (`SectorGuard.squad`). */
  squad?: number;
  /** Gear tag (`GuardSlotTags.gear`); `validateGuardAi` rejects any other value. */
  gear?: GearTag;
  /** The guard's kind (`SquadSlot.kind`); `validateGuardAi` rejects 'enforcer' (shield guards come in response teams only). */
  kind?: SquadSlot['kind'];
};

/**
 * (guard-ai S5b) The Sector Ops guard tags `EnemyManager.placeSlot` reads (ENGINE.md section 7; `SectorGuard` in
 * src/game/sectors.ts carries them as they are; `sectorTags.ts` says what each drives). All optional.
 */
export interface GuardSlotTags {
  /** Squad number in the section (0..`DEFAULT_SQUAD_BASE - 1`): radio checks, the missed-member search. */
  squad?: number;
  /** A dog's handler: the index, in the section's guard list, of the guard it heels on. */
  handler?: number;
  /** Area / post label ('lobby', 's3-hall', 'secure', 's3-sec'): a secure one answers first inside its circle. */
  zone?: string;
  /** The job ('patrol', 'desk', 'supervisor', 'gate', ...): radio-check caller, alarm runner, light checker. */
  role?: string;
  /** Why he is there (design text; a later bark). */
  reason?: string;
  /** Talking-pair partner (index in the section's guards); stored for S10. */
  pair?: number;
  /** Gear he wears from the start: helmet / armour / both (read by `placeSlot` in S12; none = no gear). */
  gear?: GearTag;
  post?: PostDef;
}

/** A plan box (map bounds for `validateGuardAi`). */
export type PlanBounds = Pick<RoomRect, 'minX' | 'maxX' | 'minZ' | 'maxZ'>;

/** Squad ids: section x 100 + squad. */
export const SECTION_SQUAD_BASE = 100;
/** First squad number of the `defaultSquads` clusters; hand-set squads stay below it. */
export const DEFAULT_SQUAD_BASE = 50;
/** Guard keys per section (awareness masks are 32-bit). */
export const MAX_GUARD_KEYS = 32;
/** Posts within this many metres of each other (chained) form one default squad (ENGINE.md section 7: ~12 m). */
export const SQUAD_CLUSTER_M = 12;
/** Posts more than this far apart in height are on different storeys: never one default squad. */
export const SQUAD_STOREY_M = 2.5;
/** Ranges `validateGuardAi` enforces on noisy sources. */
export const NOISY_LIMITS = { dbMin: 0, dbMax: 30, radiusMin: 1, radiusMax: 20 } as const;

/** Global squad id of squad `squad` in section `section`. */
export function squadId(section: number, squad: number): number {
  return section * SECTION_SQUAD_BASE + squad;
}

/**
 * Default squads for the slots of ONE section that have no hand-set `squad`: single-linkage clusters of their posts
 * (x, z) within `radius` m of each other (chained; never across storeys, `SQUAD_STOREY_M`, when both heights are set).
 * Writes into the caller's `out` (length >= slots.length): `out[i]` = the cluster index of slot i (0, 1, ... numbered by
 * each cluster's first slot, so the result is stable for the same data), or -1 for a slot with a hand-set `squad`
 * (join it to `squadId(section, slot.squad)`). Join a clustered slot to `squadId(section, DEFAULT_SQUAD_BASE + out[i])`.
 * Returns the number of clusters. Load time only (allocates one scratch array).
 */
export function defaultSquads(
  slots: readonly Pick<GuardSlot, 'x' | 'z' | 'y' | 'squad'>[],
  out: Int32Array | number[],
  radius = SQUAD_CLUSTER_M,
): number {
  const n = slots.length;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (i: number): number => {
    while (parent[i]! !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const r2 = radius * radius;
  for (let i = 0; i < n; i++) {
    const a = slots[i]!;
    if (a.squad !== undefined) continue;
    for (let j = i + 1; j < n; j++) {
      const b = slots[j]!;
      if (b.squad !== undefined) continue;
      if (a.y !== undefined && b.y !== undefined && Math.abs(a.y - b.y) > SQUAD_STOREY_M) continue;
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      if (dx * dx + dz * dz > r2) continue;
      const ra = find(i);
      const rb = find(j);
      if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
    }
  }
  // number clusters by their first slot (roots are the smallest index of their cluster)
  const label = new Int32Array(n).fill(-1);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (slots[i]!.squad !== undefined) {
      out[i] = -1;
      continue;
    }
    const r = find(i);
    if (label[r]! < 0) label[r] = count++;
    out[i] = label[r]!;
  }
  return count;
}

function inRect(r: PlanBounds, x: number, z: number): boolean {
  return x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
}

/** The section of a point on a non-Sector map: the first zone with a rect containing it, else `fallback` (0). */
export function sectionAt(layout: GuardAiLayout | undefined, x: number, z: number, fallback = 0): number {
  const zones = layout?.zones;
  if (!zones) return fallback;
  for (let i = 0; i < zones.length; i++) {
    const zn = zones[i]!;
    for (let k = 0; k < zn.rects.length; k++) if (inRect(zn.rects[k]!, x, z)) return zn.section;
  }
  return fallback;
}

/** The values a `gear` tag may take. */
const GEAR_TAGS: readonly string[] = ['helmet', 'armour', 'both'];

const isInt = (v: number): boolean => Number.isInteger(v);
const finite = (v: number): boolean => Number.isFinite(v);

/**
 * Per-slot post checks (map teams call it on a map's or a section's slots): a leash is finite, either exactly 0 (stays
 * on the spot) or at least `POST.minLeash`; a posted guard's route stays inside his leash; a high-security post must be
 * stood (not `free`, no route point outside the leash); a lookout (guard-rules S7, A9) has a leash of at most
 * `POST.lookoutLeash` and is never `free` (he holds his perch); `profile` is 'standard' or 'aggressive'. `label` prefixes
 * each error (e.g. the section id). Returns the errors (empty when fine).
 */
export function validatePosts(slots: readonly GuardSlot[], label = 'slot'): string[] {
  const errs: string[] = [];
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    const who = `${label} ${i}`;
    if (s.profile !== undefined && s.profile !== 'standard' && s.profile !== 'aggressive') errs.push(`${who}: unknown profile '${String(s.profile)}'`);
    const p = s.post;
    if (!p) continue;
    if (!finite(p.leash) || p.leash < 0) {
      errs.push(`${who}: leash ${p.leash} must be a number >= 0`);
      continue;
    }
    if (p.leash !== 0 && p.leash < POST.minLeash) errs.push(`${who}: leash ${p.leash} must be 0 or >= ${POST.minLeash}`);
    if (p.highSecurity && s.free) errs.push(`${who}: a high-security post cannot be free (it must stand its post)`);
    if (p.lookout && p.leash > POST.lookoutLeash) errs.push(`${who}: a lookout's leash ${p.leash} must be at most ${POST.lookoutLeash} m`);
    if (p.lookout && s.free) errs.push(`${who}: a lookout cannot be free (he holds his perch)`);
    const route = s.route;
    if (route) {
      const r = p.leash + POST.arrive;
      for (let k = 0; k < route.length; k++) {
        const [px, pz] = route[k]!;
        const dx = px - s.x;
        const dz = pz - s.z;
        if (dx * dx + dz * dz > r * r) {
          errs.push(`${who}: route point ${k} is outside the leash (${p.leash} m)${p.highSecurity ? ' of a high-security post' : ''}${p.lookout ? ' of a lookout' : ''}`);
          break;
        }
      }
    }
  }
  return errs;
}

/** (guard-ai S5) The load-time check's output (dev and tests only; the callers gate on `import.meta.env.DEV`): one
 *  console warning per error, prefixed with `where`. Warnings, never a throw: a bad post must not stop a map loading. */
export function reportGuardAi(where: string, errs: readonly string[]): void {
  for (let i = 0; i < errs.length; i++) console.warn(`guard-ai data (${where}): ${errs[i]}`);
}

export interface ValidateGuardAiOpts {
  /** Map plan bounds: entries (and their routes) and noisy sources must lie inside. */
  bounds?: PlanBounds;
  /** Number of sections (Sector Ops: `sectors.length`); valid sections are 0..n-1. Default: the zones' sections, or
   *  section 0 alone when there are no zones. */
  sections?: number;
  /** Every slot belongs to this section (a Sector Ops `SectorDef`'s guards); default: `sectionAt` per slot. */
  section?: number;
}

/**
 * Check a layout and its slots: zones (unique ids, sections >= 0, rects with min < max), noisy sources (`db` 0..30,
 * `radius` 1..20, unique ids, inside bounds, known section), entries (known section, inside bounds with their routes),
 * squads (unique id per section, known section), guard keys (`slot.key` or the index in its section: integers
 * 0..31, unique per section), hand-set squads (integers 0..`DEFAULT_SQUAD_BASE - 1`), gear tags (helmet / armour / both),
 * no `enforcer` kind (shield guards only come in response teams, S11) and `validatePosts`.
 * Returns the errors (empty when fine).
 */
export function validateGuardAi(layout: GuardAiLayout, slots: readonly GuardSlot[], opts: ValidateGuardAiOpts = {}): string[] {
  const errs: string[] = [];
  const { bounds } = opts;
  const zones = layout.zones ?? [];

  // the known sections
  const known = new Set<number>();
  if (opts.sections !== undefined) for (let i = 0; i < opts.sections; i++) known.add(i);
  else if (zones.length) for (const zn of zones) known.add(zn.section);
  else known.add(0);
  if (opts.section !== undefined) known.add(opts.section);
  const sectionOk = (s: number): boolean => isInt(s) && s >= 0 && known.has(s);

  const zoneIds = new Set<string>();
  for (const zn of zones) {
    if (zoneIds.has(zn.id)) errs.push(`zone ${zn.id}: duplicate id`);
    zoneIds.add(zn.id);
    if (!isInt(zn.section) || zn.section < 0) errs.push(`zone ${zn.id}: section ${zn.section} must be an integer >= 0`);
    else if (opts.sections !== undefined && !known.has(zn.section)) errs.push(`zone ${zn.id}: section ${zn.section} does not exist`);
    if (!zn.rects.length) errs.push(`zone ${zn.id}: no rects`);
    for (const r of zn.rects) if (!(r.minX < r.maxX && r.minZ < r.maxZ)) errs.push(`zone ${zn.id}: rect ${r.id} has min >= max`);
  }

  const noisyIds = new Set<string>();
  for (const n of layout.noisy ?? []) {
    if (noisyIds.has(n.id)) errs.push(`noisy ${n.id}: duplicate id`);
    noisyIds.add(n.id);
    if (!(n.db >= NOISY_LIMITS.dbMin && n.db <= NOISY_LIMITS.dbMax)) errs.push(`noisy ${n.id}: db ${n.db} outside ${NOISY_LIMITS.dbMin}..${NOISY_LIMITS.dbMax}`);
    // (piano escape GA7, check B) an infinite radius is map-wide (`mapWideNoise`, rain on the roof): no range or bounds check
    const wide = n.radius === Number.POSITIVE_INFINITY;
    if (!wide && !(n.radius >= NOISY_LIMITS.radiusMin && n.radius <= NOISY_LIMITS.radiusMax)) errs.push(`noisy ${n.id}: radius ${n.radius} outside ${NOISY_LIMITS.radiusMin}..${NOISY_LIMITS.radiusMax}`);
    if (!finite(n.x) || !finite(n.z)) errs.push(`noisy ${n.id}: position is not finite`);
    else if (bounds && !wide && !inRect(bounds, n.x, n.z)) errs.push(`noisy ${n.id}: outside the map bounds`);
    if (n.section !== undefined && !sectionOk(n.section)) errs.push(`noisy ${n.id}: section ${n.section} does not exist`);
  }

  const entries = layout.entries ?? [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    if (!sectionOk(e.section)) errs.push(`entry ${i}: section ${e.section} does not exist`);
    const [ex, ez] = e.at;
    if (!finite(ex) || !finite(ez)) errs.push(`entry ${i}: position is not finite`);
    else if (bounds && !inRect(bounds, ex, ez)) errs.push(`entry ${i}: outside the map bounds`);
    if (bounds && e.route) {
      for (let k = 0; k < e.route.length; k++) {
        const [px, pz] = e.route[k]!;
        if (!inRect(bounds, px, pz)) {
          errs.push(`entry ${i}: route point ${k} outside the map bounds`);
          break;
        }
      }
    }
  }

  const squadIds = new Set<string>();
  for (const sq of layout.squads ?? []) {
    if (!sectionOk(sq.section)) errs.push(`squad ${sq.id}: section ${sq.section} does not exist`);
    const k = `${sq.section}/${sq.id}`;
    if (squadIds.has(k)) errs.push(`squad ${sq.id}: duplicate id in section ${sq.section}`);
    squadIds.add(k);
  }

  // guard keys per section, hand-set squads
  const perSection = new Map<number, Set<number>>();
  const indexIn = new Map<number, number>();
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    const sec = opts.section ?? sectionAt(layout, s.x, s.z);
    const idx = indexIn.get(sec) ?? 0;
    indexIn.set(sec, idx + 1);
    const key = s.key ?? idx;
    if (!isInt(key) || key < 0 || key >= MAX_GUARD_KEYS) errs.push(`slot ${i}: key ${key} must be an integer 0..${MAX_GUARD_KEYS - 1} (section ${sec})`);
    let keys = perSection.get(sec);
    if (!keys) perSection.set(sec, (keys = new Set<number>()));
    if (keys.has(key)) errs.push(`slot ${i}: key ${key} is not unique in section ${sec}`);
    keys.add(key);
    if (s.squad !== undefined && (!isInt(s.squad) || s.squad < 0 || s.squad >= DEFAULT_SQUAD_BASE)) {
      errs.push(`slot ${i}: squad ${s.squad} must be an integer 0..${DEFAULT_SQUAD_BASE - 1}`);
    }
    if (s.gear !== undefined && !GEAR_TAGS.includes(s.gear)) errs.push(`slot ${i}: gear '${String(s.gear)}' must be one of ${GEAR_TAGS.join(', ')}`);
    if (s.kind === 'enforcer') errs.push(`slot ${i}: kind 'enforcer' is not allowed in a section guard list (shield guards only come in response teams)`);
  }

  errs.push(...validatePosts(slots));
  return errs;
}
