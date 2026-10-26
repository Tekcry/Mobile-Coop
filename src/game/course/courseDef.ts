/**
 * Course data (training bunker framework, pure, Babylon-free): bays in order, the two-person airlocks between them,
 * gates, drills, radio lines and element switch-on flags. `validateCourse` checks a definition against the ids the
 * map really has (doors, switches, holds, anchors, light groups) and throws naming the bad id.
 */
import { AIRLOCK_PAD_INSET, AIRLOCK_SIZE, AIRLOCK_SIZE_TOL, COURSE_TEXT_MAX } from '../../config/course';
import { hyp2 } from '../../core/mathx';
import type { SquadSlot } from '../../world/rooms';
import type { SecurityConsole } from './securityRoom';
import type { StationDef } from './stationDef';

/** Player index: 0 = P1 (host), 1 = P2 (client). */
export type PlayerIdx = 0 | 1;

/**
 * Player index of whoever used a course item: the host's own press (`'local'`, or undefined from older call sites) is
 * P1, a client (its peer id) P2. (marlow-bays item 2: the host's presses pass `'local'`; read as P2, a host unbolting
 * alone was tested on the client's feet and refused.)
 */
export function courseUser(by: string | undefined): PlayerIdx {
  return by === undefined || by === 'local' ? 0 : 1;
}

export interface AirlockDef {
  id: string;
  /** Plan box [x0, z0, x1, z1] (world m). */
  box: [number, number, number, number];
  floorY: number;
  /** The door on the bay the players leave (locked for good once the airlock seals). */
  nearDoor: string;
  /** The door into the next bay (locked until the airlock seals). */
  farDoor: string;
  /**
   * (coop-rejoin, walk item 4) The checkpoint's player slots: slot 0 (P1, the host) and slot 1 (P2), plan x, z inside
   * the box and the facing (default: the box middle for slot 0, the partner on a safe spot beside it). Map data.
   */
  spawns?: { x: number; z: number; yaw?: number }[];
}

/**
 * An airlock's pad (plan [minX, minZ, maxX, maxZ]): its box inset by AIRLOCK_PAD_INSET on every side, clear of the door
 * planes. `CourseState` tests feet against it and the mode draws its outline (one source). Writes into `out`.
 */
export function airlockPad(a: AirlockDef, out: [number, number, number, number]): [number, number, number, number] {
  const b = a.box;
  out[0] = Math.min(b[0], b[2]) + AIRLOCK_PAD_INSET;
  out[1] = Math.min(b[1], b[3]) + AIRLOCK_PAD_INSET;
  out[2] = Math.max(b[0], b[2]) - AIRLOCK_PAD_INSET;
  out[3] = Math.max(b[1], b[3]) - AIRLOCK_PAD_INSET;
  return out;
}

/** A switch unlocks a door for good. */
export interface LeverGate { kind: 'lever'; id: string; switchId: string; doorId: string }
/** A door opened only from one side: a press on the door from the side `side` points to (plan normal) unlocks it. */
export interface BoltGate { kind: 'bolt'; id: string; doorId: string; side: [number, number]; at: [number, number] }
/** Open while someone holds. */
export interface HoldGate { kind: 'hold'; id: string; holdId: string; doorId: string }
/** Open while held and `after` s more (default TIMED_HOLD_AFTER). */
export interface TimedHoldGate { kind: 'timedHold'; id: string; holdId: string; doorId: string; after?: number }
/** Two switches pressed within `window` s (default PAIR_WINDOW), either order: unlocks a door or sets a flag. */
export interface PairGate { kind: 'pair'; id: string; a: string; b: string; doorId?: string; flag?: string; window?: number }
/** Request-to-exit on the secure side: unlocks its doors for good. */
export interface EgressGate { kind: 'egress'; id: string; switchId: string; doorIds: string[] }
/** Unlocked while the light group is off; relocks when it comes back on unless both players are in the bay's exit airlock. */
export interface MainsGate { kind: 'mains'; id: string; group: string; doorId: string }
/** Unlocked once the course flag is set (a key, a card, a code). */
export interface FlagGate { kind: 'flag'; id: string; flag: string; doorId: string }
/** The anchor is unusable until the flag is set (the B3 fan guard). */
export interface AnchorLockGate { kind: 'anchorLock'; id: string; anchorId: string; flag: string }
/** A switch that sets a flag (per player when `perPlayer`). A security console's pickup gets a timer from its
 *  `SecurityConsole.seconds` / `rearm` (N3): the flag then clears after `seconds` and the console re-arms after `rearm`. */
export interface PickupGate { kind: 'pickup'; id: string; switchId: string; flag: string; perPlayer: boolean }
/**
 * (marlow-final N2) Timed light isolator: a press on any of `switchIds` (two-way: every cabinet on the circuit works)
 * turns course light group `group` off for `seconds`, then back on; presses while it is off do nothing; after it comes
 * back on the isolator re-arms in `rearm` s (default 0). The gate is "open" while the circuit is isolated; its remaining
 * seconds ride `PackedCourse.gates[].t` (the HUD's "Lights back in 9 s"), the re-arm time `gates[].tb`. Going dark is
 * the lights-out lure at the cabinet pressed. A `mains` gate on the same group opens with it.
 */
export interface IsolatorGate { kind: 'isolator'; id: string; switchIds: string[]; group: string; seconds: number; rearm?: number }

export type GateDef =
  | LeverGate
  | BoltGate
  | HoldGate
  | TimedHoldGate
  | PairGate
  | EgressGate
  | MainsGate
  | FlagGate
  | AnchorLockGate
  | PickupGate
  | IsolatorGate;

export type GateKind = GateDef['kind'];

/** (N2 / N3) A timed window's last seconds: the `gateWarn` event (radio `warn:<gate id>`) fires as it crosses this. */
export const TIMED_WARN = 5;

/** (N2 / N3) The radio line key spoken when timed gate `gateId` has TIMED_WARN s left ("Lights back in five."). */
export function warnKey(gateId: string): string {
  return `warn:${gateId}`;
}

/**
 * (J14 R1, STATIONS.md SA2) The `bay.radio` key of LANTERN's line when station `id` retries (what and where, G343): `seen`
 * / `caught` at `retry:<id>`, a drill window (`timer`) at `retry:<id>:timer`. No line: the retry is silent.
 */
export function retryKey(stationId: string, timer = false): string {
  return timer ? `retry:${stationId}:timer` : `retry:${stationId}`;
}

const STATION_RETRY: readonly string[] = ['none', 'station', 'caught'];

export interface RadioLine {
  /**
   * 'enter' (bay start), 'gate' (any gate opens), 'done' (drills done), a gate / drill / objective step id (spoken when
   * it opens / ticks / is done), or `warn:<gate id>` (a timed window's last TIMED_WARN s, N2 / N3).
   */
  at: 'enter' | 'gate' | 'done' | (string & {});
  text: string;
}

export interface CoursePoint { x: number; y: number; z: number }

/** A mandatory drill (D18, D30): ticked per player only by a real performed verb. */
export interface DrillDef {
  id: string;
  /**
   * The verb that ticks it (`CourseState.tick`), or `flag:<flag>` (FLAG_VERB): ticked when that course flag is set in the
   * bay (a pass zone, gate, pickup, console or scanner): a shared flag ticks every player it is open for, a per-player
   * flag (`<flag>@1` / `@2`) that player only.
   */
  verb: string;
  /** Who must do it: lead / second follow the swap rule (lead = P1 in odd bays, P2 in even bays). */
  who: 'both' | 'lead' | 'second' | 'either';
  /** The tutorial step (<= 90 characters). */
  text: string;
  /** Short name for the airlock refusal ("Waiting: P2 - ledge shimmy"); default the verb. */
  name?: string;
  /** A point or a device id the marker sits on. */
  marker: CoursePoint | string;
  /** Ticks needed per required player (default 1). */
  count?: number;
}

/** A drill verb prefix: `flag:<flag>` ticks the drill when the course flag is set (gap list row 6a). */
export const FLAG_VERB = 'flag:';

/** A bay element and whether it is in its final form now or switches on when its feature lands. */
export interface ElementFlag { id: string; feature: string; final: boolean }

/** A plan box [x0, z0, x1, z1] (world m) with an optional feet height range (y0 <= y < y1). */
export interface CourseZone { box: [number, number, number, number]; y0?: number; y1?: number }

/** Are feet at (x, y, z) in the zone? Pure, no allocation. */
export function inZone(zn: CourseZone, x: number, y: number, z: number): boolean {
  const b = zn.box;
  if (x < Math.min(b[0], b[2]) || x > Math.max(b[0], b[2]) || z < Math.min(b[1], b[3]) || z > Math.max(b[1], b[3])) return false;
  if (zn.y0 !== undefined && y < zn.y0) return false;
  if (zn.y1 !== undefined && y >= zn.y1) return false;
  return true;
}

/**
 * (gap list row 6b) A role claim: the bay's A / B jobs follow the route instead of the swap rule. The first player who
 * presses one of `press` (a course device id) or stands in `zone` takes `role`; the other takes the other job. One claim
 * per bay (the first wins) until the bay restarts. Without a claim the swap rule (`leadOf`) gives the roles.
 */
export interface RoleClaim { role: 'a' | 'b'; press?: string[]; zone?: CourseZone }

export interface BayDef {
  id: string;
  entry: string | 'start';
  exit: string | 'end';
  /** Squad slot ids spawned when the bay starts (and again on a restart). */
  squad: string[];
  gates: GateDef[];
  radio: RadioLine[];
  /** Drills in teaching order. */
  drills: DrillDef[];
  elements: ElementFlag[];
  /** (gap list row 6b) Role claims (first wins); none: the swap rule gives A (the lead) and B. */
  roles?: RoleClaim[];
  /** (section-rating S6, A5) A set with guards: rated on the four stealth marks at its exit (drill bays stay unrated, D31). */
  rated?: boolean;
  /** (section-rating S6) The name the rating card and the results line show (default the bay id). */
  title?: string;
  /**
   * (marlow-walk482 X2a) Spotted fails the set: once a live, non-passive squad guard is in combat, LANTERN says this line
   * and the set restarts from its start (`spotFailed`, `CourseMode.fixedUpdate`). At most COURSE_TEXT_MAX characters.
   */
  spotFail?: string;
  /** (J14 Marlow re-plan) The bay's numbered stations; absent on the built yard. */
  stations?: readonly StationDef[];
}

/**
 * (marlow-final N1) When an objective step is done:
 * - `{ flag }`: the course flag is set (any player's; `who: 'a' | 'b'` = by that role's player when the flag is set
 *   per player, `<flag>@1` / `@2`; a shared flag counts for both). A pass zone, pickup, pair, scanner, console or
 *   `externalFlags` flag. "B past x" is `{ flag: '<the one-player pass zone flag>' }` (the zone sets it, `PassZone.any`).
 * - `{ gate }`: the gate is open (any kind; a timed window counts the moment it opens).
 * - `{ all: [...] }`: every condition holds at once.
 * An array of conditions is "any of them".
 */
export type StepCond = { flag: string; who?: 'a' | 'b' } | { gate: string } | { all: StepCond[] };

/**
 * An objective step (N1, M4). A bay's steps are its objective list in route order. A step with `done` is a row of the
 * HUD's objective table, latched done (it stays done when the condition later clears, until the bay restarts) the first
 * step its condition holds. A step without `done` is the bay's last line: the HUD's step line once the steps with
 * `done` are all done (or the old one-line bay objective, course-ready F1). `a` / `b` are the lines for the A job (the
 * bay's lead by the swap rule, or a role claim) and the B job; `timer` names a timed gate (isolator, timed console,
 * timedHold) whose seconds left the HUD appends while it runs ("Lights back in 9 s"). Every text <= 90 characters.
 */
export interface CourseObjective {
  id: string;
  bay: string;
  /** The shared line. */
  text: string;
  a?: string;
  b?: string;
  done?: StepCond | StepCond[];
  timer?: string;
}

/** The HUD's words before a timed gate's seconds left ("Lights back in 9 s"). No allocation. */
export function timerLabel(g: GateDef | undefined): string {
  if (!g) return 'Time left';
  switch (g.kind) {
    case 'isolator':
      return 'Lights back in';
    case 'pickup':
      return 'Cameras back in';
    case 'timedHold':
      return 'Door locks in';
    default:
      return 'Time left';
  }
}

export interface CourseDef {
  id: string;
  bays: BayDef[];
  airlocks: AirlockDef[];
  objectives?: CourseObjective[];
  /**
   * Flags the mode sets through `CourseState.setFlag` (not a pickup or a pair gate), e.g. a keypad code learned from a
   * camera or a hack. `validateCourse` counts them as set (A8).
   */
  externalFlags?: string[];
  /**
   * (CT prototype, G138) The exit zone of the last bay: the course completes by itself once BOTH players stand in it
   * (plan box [x0, z0, x1, z1], feet within AIRLOCK_Y_TOL of floorY) and the bay's drills are done. None: the old
   * "Finish" device finishes the course.
   */
  exitZone?: { box: [number, number, number, number]; floorY: number };
}

/** Is a player's feet in the exit zone? Pure (the both-in rule's one test, unit-tested). */
export function inExitZone(zone: NonNullable<CourseDef['exitZone']>, x: number, y: number, z: number, yTol: number): boolean {
  const b = zone.box;
  return x >= Math.min(b[0], b[2]) && x <= Math.max(b[0], b[2]) && z >= Math.min(b[1], b[3]) && z <= Math.max(b[1], b[3]) && Math.abs(y - zone.floorY) < yTol;
}

/**
 * The final line of bay `bayId`: its first objective without `done` (the HUD's step line once the bay's steps are
 * done, or while the bay has no drills: course-ready F1), or null.
 */
export function bayObjective(def: CourseDef, bayId: string): string | null {
  const list = def.objectives;
  if (!list) return null;
  for (let i = 0; i < list.length; i++) if (list[i]!.bay === bayId && list[i]!.done === undefined) return list[i]!.text;
  return null;
}

/** A station panel's device id (sw-p1 ...): an optional read, never a gate (F1b). */
export function isPanelId(id: string): boolean {
  return /^sw-p\d+$/.test(id);
}

/** Players needed in the exit zone: both, or one under the dev solo flag. */
export function exitZoneReady(inside0: boolean, inside1: boolean, solo: boolean): boolean {
  return solo ? inside0 || inside1 : inside0 && inside1;
}

/** The ids the map really has. */
export interface CourseKnownIds {
  doors: readonly string[];
  switches: readonly string[];
  holds: readonly string[];
  anchors: readonly string[];
  groups: readonly string[];
}

/** Lead for bay index `bayIdx` (0-based): P1 in odd bays (B1, B3, ...), P2 in even bays (DECISIONS C3, D25). */
export function leadOf(bayIdx: number): PlayerIdx {
  return bayIdx % 2 === 0 ? 0 : 1;
}

const NO_DOORS: readonly string[] = [];

/** Doors a gate unlocks (allocates for single-door gates: call at load, not per step). */
export function gateDoors(g: GateDef): readonly string[] {
  switch (g.kind) {
    case 'egress':
      return g.doorIds;
    case 'pair':
      return g.doorId !== undefined ? [g.doorId] : NO_DOORS;
    case 'anchorLock':
    case 'pickup':
    case 'isolator':
      return NO_DOORS;
    default:
      return [g.doorId];
  }
}

function fail(id: string, why: string): never {
  throw new Error(`course: ${id}: ${why}`);
}

function unique(seen: Set<string>, id: string, what: string): void {
  if (!id) fail('(empty)', `${what} without an id`);
  if (seen.has(id)) fail(id, `duplicate ${what} id`);
  seen.add(id);
}

/**
 * Check a course: unique ids; every gate, airlock and drill names known ids; the bays chain start -> airlocks -> end;
 * airlocks 6 x 6 (+-0.5); radio lines, spotted lines and drill steps <= 90 characters; every flag read is set by a pickup, a pair gate
 * or `def.externalFlags`; (J14 R1) stations with unique numbers and a known retry kind, their guards in the bay's squad,
 * a stand-in gate of the bay, two finite marks and a done flag that is set somewhere.
 * Throws with the offending id; returns the definition.
 */
export function validateCourse(def: CourseDef, known: CourseKnownIds): CourseDef {
  const doors = new Set(known.doors);
  const switches = new Set(known.switches);
  const holds = new Set(known.holds);
  const anchors = new Set(known.anchors);
  const groups = new Set(known.groups);
  const need = (set: Set<string>, id: string, owner: string, what: string): void => {
    if (!set.has(id)) fail(owner, `unknown ${what} '${id}'`);
  };
  if (def.bays.length === 0) fail(def.id, 'no bays');

  const airIds = new Set<string>();
  for (const a of def.airlocks) {
    unique(airIds, a.id, 'airlock');
    need(doors, a.nearDoor, a.id, 'door');
    need(doors, a.farDoor, a.id, 'door');
    const w = Math.abs(a.box[2] - a.box[0]);
    const d = Math.abs(a.box[3] - a.box[1]);
    if (Math.abs(w - AIRLOCK_SIZE) > AIRLOCK_SIZE_TOL || Math.abs(d - AIRLOCK_SIZE) > AIRLOCK_SIZE_TOL) {
      fail(a.id, `airlock is ${w} x ${d}, not ${AIRLOCK_SIZE} x ${AIRLOCK_SIZE}`);
    }
    // (coop-rejoin) the slot points: at most two, inside the box by a body radius (a point on its edge stands in the
    // wall), two bodies apart
    const sp = a.spawns ?? [];
    if (sp.length > 2) fail(a.id, `airlock has ${sp.length} spawns, at most 2 (slot 0, slot 1)`);
    const m = 0.3;
    for (const p of sp) {
      if (p.x < Math.min(a.box[0], a.box[2]) + m || p.x > Math.max(a.box[0], a.box[2]) - m || p.z < Math.min(a.box[1], a.box[3]) + m || p.z > Math.max(a.box[1], a.box[3]) - m) fail(a.id, `airlock spawn (${p.x}, ${p.z}) is outside its box (${m} m in from its walls)`);
    }
    if (sp[0] && sp[1] && hyp2(sp[0].x - sp[1].x, sp[0].z - sp[1].z) < 0.9) fail(a.id, 'airlock spawns overlap (slot 0 and slot 1 under 0.9 m apart)');
  }

  const bayIds = new Set<string>();
  const gateIds = new Set<string>();
  const drillIds = new Set<string>();
  const elemIds = new Set<string>();
  const flagsSet = new Set<string>(def.externalFlags);
  const flagsRead: [string, string][] = [];
  const stationIds = new Set<string>();
  const stationNs = new Set<string>();
  const doneFlags: [string, string][] = [];
  const text = (owner: string, s: string, what: string): void => {
    if (!s) fail(owner, `empty ${what}`);
    if (s.length > COURSE_TEXT_MAX) fail(owner, `${what} is ${s.length} characters (max ${COURSE_TEXT_MAX})`);
  };

  def.bays.forEach((b, i) => {
    unique(bayIds, b.id, 'bay');
    if (!b.entry) fail(b.id, 'no entry');
    if (!b.exit) fail(b.id, 'no exit');
    const wantEntry = i === 0 ? 'start' : def.bays[i - 1]!.exit;
    if (b.entry !== wantEntry) fail(b.id, `entry '${b.entry}' should be '${wantEntry}'`);
    if (i === def.bays.length - 1) {
      if (b.exit !== 'end') fail(b.id, `the last bay's exit should be 'end'`);
    } else if (!airIds.has(b.exit)) fail(b.id, `unknown exit airlock '${b.exit}'`);
    if (b.entry !== 'start' && !airIds.has(b.entry)) fail(b.id, `unknown entry airlock '${b.entry}'`);

    for (const g of b.gates) {
      unique(gateIds, g.id, 'gate');
      for (const door of gateDoors(g)) need(doors, door, g.id, 'door');
      switch (g.kind) {
        case 'lever':
        case 'egress':
          need(switches, g.switchId, g.id, 'switch');
          break;
        case 'pickup':
          need(switches, g.switchId, g.id, 'switch');
          flagsSet.add(g.flag);
          break;
        case 'hold':
        case 'timedHold':
          need(holds, g.holdId, g.id, 'hold');
          break;
        case 'pair':
          need(switches, g.a, g.id, 'switch');
          need(switches, g.b, g.id, 'switch');
          if ((g.doorId === undefined) === (g.flag === undefined)) fail(g.id, 'a pair gate names a door or a flag');
          if (g.flag !== undefined) flagsSet.add(g.flag);
          break;
        case 'mains':
          need(groups, g.group, g.id, 'light group');
          break;
        case 'flag':
          flagsRead.push([g.id, g.flag]);
          break;
        case 'anchorLock':
          need(anchors, g.anchorId, g.id, 'anchor');
          flagsRead.push([g.id, g.flag]);
          break;
        case 'bolt':
          if (g.side[0] === 0 && g.side[1] === 0) fail(g.id, 'bolt side is zero');
          break;
        case 'isolator':
          if (g.switchIds.length === 0) fail(g.id, 'an isolator names at least one switch');
          for (const sw of g.switchIds) need(switches, sw, g.id, 'switch');
          need(groups, g.group, g.id, 'light group');
          if (!(g.seconds > 0)) fail(g.id, 'isolator seconds must be above 0');
          if ((g.rearm ?? 0) < 0) fail(g.id, 'isolator rearm below 0');
          break;
      }
    }
    for (const r of b.roles ?? []) {
      if (r.role !== 'a' && r.role !== 'b') fail(b.id, `role claim '${String(r.role)}' is not 'a' or 'b'`);
      if (!r.press?.length && !r.zone) fail(b.id, 'a role claim names a press or a zone');
      for (const sw of r.press ?? []) need(switches, sw, b.id, 'switch');
    }
    for (const r of b.radio) text(b.id, r.text, 'radio line');
    if (b.spotFail !== undefined) text(b.id, b.spotFail, 'spotted line');
    for (const d of b.drills) {
      unique(drillIds, d.id, 'drill');
      if (!d.verb) fail(d.id, 'no verb');
      text(d.id, d.text, 'drill step');
      if ((d.count ?? 1) < 1) fail(d.id, 'count below 1');
    }
    for (const e of b.elements) unique(elemIds, e.id, 'element');
    // (J14 R1) the stations, in play order (not always `n` order: A4 is 9, 8, 10): unique whole numbers, a known retry
    // kind, guards from the bay's squad, a stand-in that is a gate of the bay, two finite marks; `gates` may also name
    // devices (cameras, beams); done flags checked below once every flag set is known
    const bayGates = new Set(b.gates.map((g) => g.id));
    for (const s of b.stations ?? []) {
      unique(stationIds, s.id, 'station');
      if (!Number.isInteger(s.n) || s.n < 1) fail(s.id, `station number ${s.n} is not a whole number from 1`);
      unique(stationNs, String(s.n), 'station number');
      if (!STATION_RETRY.includes(s.retry)) fail(s.id, `station retry '${String(s.retry)}' is not none, station or caught`);
      if (s.drillS !== undefined && !(s.drillS > 0)) fail(s.id, 'station drillS must be above 0');
      if (s.marks.length !== 2) fail(s.id, 'a station has two start marks');
      for (const m of s.marks) if (![m.x, m.y, m.z, m.yaw].every(Number.isFinite)) fail(s.id, 'a station mark is not a finite point');
      for (const q of s.guards) if (!b.squad.includes(q)) fail(s.id, `station guard '${q}' is not in ${b.id}'s squad`);
      if (s.standIn !== undefined && !bayGates.has(s.standIn)) fail(s.id, `stand-in gate '${s.standIn}' is not a gate of ${b.id}`);
      if (!s.doneFlag) fail(s.id, 'a station names its done flag');
      doneFlags.push([s.id, s.doneFlag]);
    }
  });
  for (const [owner, flag] of flagsRead) if (!flagsSet.has(flag)) fail(owner, `flag '${flag}' is never set`);
  const objFlags = new Set((def.objectives ?? []).filter((o) => o.done !== undefined).map((o) => `obj:${o.id}`));
  for (const [owner, flag] of doneFlags) if (!flagsSet.has(flag) && !objFlags.has(flag)) fail(owner, `done flag '${flag}' is never set (a pass zone's flag goes in externalFlags)`);
  if (def.objectives) {
    const objIds = new Set<string>();
    const cond = (owner: string, c: StepCond): void => {
      if ('all' in c) {
        if (c.all.length === 0) fail(owner, 'an all condition is empty');
        for (const k of c.all) cond(owner, k);
      } else if ('gate' in c) {
        if (!gateIds.has(c.gate)) fail(owner, `unknown gate '${c.gate}'`);
      } else if (!flagsSet.has(c.flag)) fail(owner, `flag '${c.flag}' is never set (a pass zone's flag goes in externalFlags)`);
    };
    for (const o of def.objectives) {
      unique(objIds, o.id, 'objective');
      if (!bayIds.has(o.bay)) fail(o.id, `unknown bay '${o.bay}'`);
      text(o.id, o.text, 'objective');
      if (o.a !== undefined) text(o.id, o.a, 'A line');
      if (o.b !== undefined) text(o.id, o.b, 'B line');
      if (o.done !== undefined) {
        if (Array.isArray(o.done)) {
          if (o.done.length === 0) fail(o.id, 'an empty done list');
          for (const c of o.done) cond(o.id, c);
        } else cond(o.id, o.done);
      }
      if (o.timer !== undefined) {
        const tg = gateById(def, o.timer);
        if (!tg) fail(o.id, `unknown timer gate '${o.timer}'`);
        if (tg.kind !== 'isolator' && tg.kind !== 'pickup' && tg.kind !== 'timedHold') fail(o.id, `timer gate '${o.timer}' is not timed`);
      }
    }
  }
  return def;
}

/** The gate with id `id` in any bay, or null (load time: not for per-step paths). */
export function gateById(def: CourseDef, id: string): GateDef | null {
  for (const b of def.bays) for (const g of b.gates) if (g.id === id) return g;
  return null;
}

/** A switch, a hold point or a pickup the map puts down (feet-level position, facing `yaw`). */
export interface CourseDevice {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Prompt label (default by gate kind). */
  label?: string;
  /**
   * (marlow-final N4) Seconds the interact button must be held to use it (default 0: a tap). A completed hold counts as
   * the press (the A6 drive panel's isolate key, a time lock).
   */
  hold?: number;
  /** (N4) Noise radius (m) the hold pulses while it runs (the panel's buzzer); none = silent. */
  holdNoise?: number;
}

/**
 * (N4) The hold time of a course device's item (0 = a tap): its `hold`, except on a hold / timedHold gate's brace point
 * (`braced`: that is held for as long as the player stays, not timed).
 */
export function deviceHoldTime(dv: CourseDevice, braced: boolean): number {
  return braced ? 0 : Math.max(0, dv.hold ?? 0);
}

/**
 * The map's course (`MapLayout.course`): the definition plus how its string ids map onto the built level: doors and
 * anchors to their `TraversalAnchors` ids, light groups to `LightDef.group` numbers, devices (switches, holds, pickups;
 * airlocks have none, R6), keyed by the id the definition uses; `end` is the course end device, "Finish" in the last bay, which
 * calls `CourseState.finish` and is refused like an airlock while that bay's drills are open) and the squad slots by id.
 */
export interface CourseLayout {
  def: CourseDef;
  doors: Record<string, number>;
  anchors?: Record<string, number>;
  groups?: Record<string, number>;
  devices: Record<string, CourseDevice>;
  squads: Record<string, SquadSlot>;
  /** (sector-fixes S) Security room consoles: usable once their guard is down (`securityRoom.ts`). */
  consoles?: SecurityConsole[];
}

/** The ids a course layout really has (for `validateCourse`). */
export function layoutKnownIds(l: CourseLayout): CourseKnownIds {
  const devices = Object.keys(l.devices);
  return { doors: Object.keys(l.doors), switches: devices, holds: devices, anchors: Object.keys(l.anchors ?? {}), groups: Object.keys(l.groups ?? {}) };
}

/**
 * (marlow-final N8) Course definitions by map id: a map's course registers itself (a set builder may call it from the
 * map module; `CourseMode.start` does when the course runs), so the lobby's "Start at" counts the course's own bays
 * instead of assuming a number.
 */
const registered = new Map<string, CourseDef>();

export function registerCourse(mapId: string, def: CourseDef): void {
  registered.set(mapId, def);
}

/** Bays of map `mapId`'s registered course (0: none registered yet). */
export function registeredBayCount(mapId: string): number {
  return registered.get(mapId)?.bays.length ?? 0;
}
