/**
 * (guard-ai S5b) The Sector Ops guard tags (ENGINE.md section 7 on sector-redesign; `SectorGuard` in
 * src/game/sectors.ts), read as they are by `EnemyManager.placeSlot`. Pure (no Babylon / DOM), unit-tested
 * (tests/sectorGuardTags.test.ts).
 *
 * - `squad` (number in the section): the guard joins squad `squadId(section, squad)`; a guard with none joins the
 *   default cluster of posts within `SQUAD_CLUSTER_M` (`defaultSquads`); a dog joins its handler's squad. Squad radio
 *   checks then run in Sector Ops, and a down member nobody has found is missed and looked for.
 * - `handler` (a dog's handler, index in the section's guards): the dog heels on him only; down, it stays by him.
 * - `zone` (an area label): a secure zone (`isSecureZone`) makes its guard answer a disturbance inside his zone circle
 *   first (`zoneRadius`); every guard walks back to his own post / route after a search (the patrol walker).
 * - `role` (the job, free text): sorted into classes (`roleFlags`): a desk role calls the section's radio checks, a
 *   supervisor runs to the alarm before an officer and sends someone rather than going, a rover (patrol) checks a light
 *   before a fixed post does.
 * - `reason` is stored (design text; a later bark). `pair` is stored as a hook for S10 (talking pairs).
 */
import { DEFAULT_SQUAD_BASE, defaultSquads, squadId, type GuardSlotTags } from './guardAiData';

/** Role classes (bit flags; `roleFlags`). */
export const ROLE_DESK = 1;
export const ROLE_SUPERVISOR = 2;
/** Walks a round: checks a light that went out before a fixed post does. */
export const ROLE_ROVER = 4;
/** Stands a job (a gate, a desk, a badge check): sent to a light last. */
export const ROLE_FIXED = 8;

/** The role words Course Ready uses (campusSectors.ts) and the classes they mean; any other word is class 0. */
export const ROLE_CLASS: Readonly<Record<string, number>> = {
  desk: ROLE_DESK | ROLE_FIXED,
  cctv: ROLE_DESK | ROLE_FIXED,
  operator: ROLE_DESK | ROLE_FIXED,
  supervisor: ROLE_SUPERVISOR,
  patrol: ROLE_ROVER,
  tour: ROLE_ROVER,
  response: ROLE_ROVER,
  gate: ROLE_FIXED,
  posted: ROLE_FIXED,
  post: ROLE_FIXED,
  sentry: ROLE_FIXED,
  keyholder: ROLE_FIXED,
  bridge: ROLE_FIXED,
  reception: ROLE_FIXED,
};

/** The tag numbers (prototype values, G4). */
export const TAGS = {
  /** A secure-zone guard's score (and straight-distance rank) x this for a disturbance inside his zone circle. */
  secureFirst: 0.25,
  /** A secure-zone guard's zone circle (m round his post) when he has no post leash; his route's reach + `routeMargin`
   *  when that is larger. */
  secureR: 8,
  routeMargin: 2,
  /** Alarm run: distance to the panel x this (the nearest scaled distance runs). Officer kind 0.25 (the old rule). */
  supervisorAlarm: 0.1,
  officerAlarm: 0.25,
  /** Light check score x: a rover goes first, a fixed post last. */
  lightRover: 0.8,
  lightFixed: 1.5,
  /** A supervisor sends someone (as an officer kind does: `INCIDENT.officerMul`). */
  supervisorSend: 1.6,
  /** A dog whose handler goes down barks over him: a noise of this reach (m) at the dog. */
  dogBark: 14,
} as const;

/** Role class flags of a role word (case-insensitive; unknown or none: 0). */
export function roleFlags(role: string | undefined): number {
  if (!role) return 0;
  return ROLE_CLASS[role.toLowerCase()] ?? 0;
}

/**
 * Is this zone tag a secure zone? 'secure', or a word of it (split on '-' / '_') is 'secure' or 'sec' ('s3-sec',
 * 'secure-vault', 'lab_secure'). Course Ready tags areas ('lobby', 's3-hall'); only these answer first.
 */
export function isSecureZone(zone: string | undefined): boolean {
  if (!zone) return false;
  const z = zone.toLowerCase();
  let start = 0;
  for (let i = 0; i <= z.length; i++) {
    if (i < z.length && z[i] !== '-' && z[i] !== '_') continue;
    const w = z.slice(start, i);
    if (w === 'secure' || w === 'sec') return true;
    start = i + 1;
  }
  return false;
}

/** The zone circle's radius (m round the slot's x, z) of a secure-zone guard: his post leash when he has one (> 0),
 *  else `secureR`, or his route's reach + `routeMargin` when larger. 0 when the zone is not secure. */
export function zoneRadius(slot: Pick<GuardSlotTags, 'zone' | 'post'> & { x: number; z: number; route?: readonly (readonly [number, number])[] }): number {
  if (!isSecureZone(slot.zone)) return 0;
  const leash = slot.post?.leash ?? 0;
  if (leash > 0) return leash;
  let r: number = TAGS.secureR;
  const route = slot.route;
  if (route)
    for (let k = 0; k < route.length; k++) {
      const p = route[k]!;
      const d = Math.sqrt((p[0] - slot.x) * (p[0] - slot.x) + (p[1] - slot.z) * (p[1] - slot.z)) + TAGS.routeMargin;
      if (d > r) r = d;
    }
  return r;
}

/** The board's score multiplier for a guard of role class `flags` (a light: `light` true). */
export function roleSendMul(flags: number, light: boolean): number {
  let m = flags & ROLE_SUPERVISOR ? TAGS.supervisorSend : 1;
  if (light) {
    if (flags & ROLE_ROVER) m *= TAGS.lightRover;
    else if (flags & ROLE_FIXED) m *= TAGS.lightFixed;
  }
  return m;
}

/** The alarm runner's distance multiplier: a supervisor before an officer before anyone. */
export function alarmRunMul(flags: number, officer: boolean): number {
  if (flags & ROLE_SUPERVISOR) return TAGS.supervisorAlarm;
  return officer ? TAGS.officerAlarm : 1;
}

/** A squad radio check's own caller rank (highest calls; ties: the first on the roster). */
export function callerRank(flags: number, officer: boolean): number {
  if (flags & ROLE_SUPERVISOR) return 2;
  return officer ? 1 : 0;
}

/**
 * The global squad id of every slot of ONE section (`out[i]`, length >= slots.length): a hand-set `squad` ->
 * `squadId(section, squad)`; none -> its default cluster of posts (`defaultSquads`, `DEFAULT_SQUAD_BASE + cluster`); a
 * dog with a valid `handler` -> its handler's squad. Load time (allocates the clustering scratch).
 */
export function slotSquads(
  slots: readonly (Pick<GuardSlotTags, 'squad' | 'handler'> & { x: number; z: number; y?: number })[],
  section: number,
  out: Int32Array,
): void {
  const n = slots.length;
  const cl = new Int32Array(n);
  defaultSquads(slots, cl);
  for (let i = 0; i < n; i++) {
    const s = slots[i]!;
    out[i] = s.squad !== undefined ? squadId(section, s.squad) : squadId(section, DEFAULT_SQUAD_BASE + cl[i]!);
  }
  for (let i = 0; i < n; i++) {
    const h = slots[i]!.handler;
    if (h !== undefined && h >= 0 && h < n && h !== i) out[i] = out[h]!;
  }
}
