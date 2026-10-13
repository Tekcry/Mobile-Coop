/**
 * Course data (training bunker framework, pure, Babylon-free): bays in order, the two-person airlocks between them,
 * gates, drills, radio lines and element switch-on flags. `validateCourse` checks a definition against the ids the
 * map really has (doors, switches, holds, anchors, light groups) and throws naming the bad id.
 */
import { AIRLOCK_SIZE, AIRLOCK_SIZE_TOL, COURSE_TEXT_MAX } from '../../config/course';
import type { SquadSlot } from '../../world/rooms';

/** Player index: 0 = P1 (host), 1 = P2 (client). */
export type PlayerIdx = 0 | 1;

export interface AirlockDef {
  id: string;
  /** Plan box [x0, z0, x1, z1] (world m). */
  box: [number, number, number, number];
  floorY: number;
  /** The door on the bay the players leave (locked for good once the airlock seals). */
  nearDoor: string;
  /** The door into the next bay (locked until the airlock seals). */
  farDoor: string;
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
/** A switch that sets a flag (per player when `perPlayer`). */
export interface PickupGate { kind: 'pickup'; id: string; switchId: string; flag: string; perPlayer: boolean }

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
  | PickupGate;

export type GateKind = GateDef['kind'];

export interface RadioLine {
  /** 'enter' (bay start), 'gate' (any gate opens), 'done' (drills done), or a gate / drill id. */
  at: 'enter' | 'gate' | 'done' | (string & {});
  text: string;
}

export interface CoursePoint { x: number; y: number; z: number }

/** A mandatory drill (D18, D30): ticked per player only by a real performed verb. */
export interface DrillDef {
  id: string;
  /** The verb that ticks it (`CourseState.tick`). */
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

/** A bay element and whether it is in its final form now or switches on when its feature lands. */
export interface ElementFlag { id: string; feature: string; final: boolean }

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
}

export interface CourseObjective { id: string; bay: string; text: string }

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
 * airlocks 6 x 6 (+-0.5); radio lines and drill steps <= 90 characters; every flag read is set by a pickup, a pair gate
 * or `def.externalFlags`.
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
  }

  const bayIds = new Set<string>();
  const gateIds = new Set<string>();
  const drillIds = new Set<string>();
  const elemIds = new Set<string>();
  const flagsSet = new Set<string>(def.externalFlags);
  const flagsRead: [string, string][] = [];
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
      }
    }
    for (const r of b.radio) text(b.id, r.text, 'radio line');
    for (const d of b.drills) {
      unique(drillIds, d.id, 'drill');
      if (!d.verb) fail(d.id, 'no verb');
      text(d.id, d.text, 'drill step');
      if ((d.count ?? 1) < 1) fail(d.id, 'count below 1');
    }
    for (const e of b.elements) unique(elemIds, e.id, 'element');
  });
  for (const [owner, flag] of flagsRead) if (!flagsSet.has(flag)) fail(owner, `flag '${flag}' is never set`);
  if (def.objectives) {
    const objIds = new Set<string>();
    for (const o of def.objectives) {
      unique(objIds, o.id, 'objective');
      if (!bayIds.has(o.bay)) fail(o.id, `unknown bay '${o.bay}'`);
      text(o.id, o.text, 'objective');
    }
  }
  return def;
}

/** A switch, a hold point or an airlock "Cycle" panel the map puts down (feet-level position, facing `yaw`). */
export interface CourseDevice {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Prompt label (default by gate kind). */
  label?: string;
}

/**
 * The map's course (`MapLayout.course`): the definition plus how its string ids map onto the built level: doors and
 * anchors to their `TraversalAnchors` ids, light groups to `LightDef.group` numbers, devices (switches, holds, airlock
 * Cycle panels, keyed by the id the definition uses; `end` is the course end device, "Finish" in the last bay, which
 * calls `CourseState.finish` and is refused like an airlock while that bay's drills are open) and the squad slots by id.
 */
export interface CourseLayout {
  def: CourseDef;
  doors: Record<string, number>;
  anchors?: Record<string, number>;
  groups?: Record<string, number>;
  devices: Record<string, CourseDevice>;
  squads: Record<string, SquadSlot>;
}

/** The ids a course layout really has (for `validateCourse`). */
export function layoutKnownIds(l: CourseLayout): CourseKnownIds {
  const devices = Object.keys(l.devices);
  return { doors: Object.keys(l.doors), switches: devices, holds: devices, anchors: Object.keys(l.anchors ?? {}), groups: Object.keys(l.groups ?? {}) };
}
