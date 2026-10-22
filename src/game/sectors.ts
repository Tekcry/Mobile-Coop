import type { SquadSlot } from '../world/rooms';
import type { DifficultyPreset } from '../ai/archetypes';
import { AIRLOCK_DOORWAY_CLEAR } from '../config/course';
import { ENEMIES } from '../ai/enemyDefs';

/**
 * Sector Ops (feature/sector-ops): a map split into sections played in order. Each section has one objective (a hack,
 * a grab or a download); then its connector opens: a short room with a near door (from the section) and a far door
 * (into the next). Every living player inside cycles it: the previous section unloads, the next one loads, and the
 * connector becomes the checkpoint (PLAN section 3). The last section ends at its extraction zone. Kills are optional,
 * so a ghost run (no kills, never spotted) is always possible (M3). No lives (M7): co-op revives with syringes; both
 * down, or solo, restarts the section at its checkpoint. Pure: the mode (`modes/sectorMode.ts`) puts it in the world.
 */
export type SectorObjectiveKind = 'hack' | 'grab' | 'download';

export interface SectorObjective {
  kind: SectorObjectiveKind;
  label: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/** Plan box [x0, z0, x1, z1] (world m, either corner order). */
export type PlanBox = [number, number, number, number];

/** A floor zone: a plan box on a floor (feet within `ZONE_Y_TOL` of `floorY`, default 0). */
export interface SectorZone {
  label: string;
  box: PlanBox;
  floorY?: number;
}

/** The room into the next section (PLAN section 3). */
export interface ConnectorDef extends SectorZone {
  /**
   * The near doorway's plan centre [x, z] (from this section): the cycle waits while someone stands in it
   * (`inDoorway`). Doors are found by their centres (`Doors.nearest`), never by id (ids are build order).
   */
  nearAt?: [number, number];
  /** The far doorway's plan centre [x, z] (into the next section). */
  farAt?: [number, number];
  /** More doorways of the next section that stay locked until this connector seals (side rooms off the connector). */
  sealUnlocks?: [number, number][];
  /** Where a restart puts the players once the connector has sealed (the next section's checkpoint). */
  checkpoint: Pose;
}

/** A route waypoint: [x, z] on the ground, or [x, z, y] on a raised floor (rack tops, the deck). */
export type RoutePt = readonly [number, number] | readonly [number, number, number];

/**
 * A named way through a section (M8): waypoints from the start (or checkpoint) to the objective (`pts[obj]`) and on to
 * the connector or the extraction. `climbs` lists the legs (i: pts[i] -> pts[i + 1]) taken by a ladder, a hop, a vault,
 * a climb or a cable that the guards' nav grid does not walk (the e2e nav check skips them).
 */
export interface SectorRoute {
  name: string;
  pts: readonly RoutePt[];
  obj: number;
  climbs?: readonly number[];
}

/** A section guard (M8): its slot, and the spot [x, z] where a player can take it down out of every other guard's sight. */
export interface SectorGuard extends SquadSlot {
  takedownSpot: [number, number];
  /**
   * (sector-redesign G20) A dog's handler: the index, in this section's `guards`, of the armed human guard it works with.
   * Required for a dog (`checkSectors`); the mode does not read it yet (the heel behaviour is guard-ai's, ENGINE.md
   * "Requests for guard-ai").
   */
  handler?: number;
  // (sector-redesign) Placement data for guard-ai (ENGINE.md "Requests for guard-ai"); optional, not read by any code yet.
  /** Squad id within the section (radio checks, the "missed" search, a dog's fallback handler). */
  squad?: number;
  /** Post / zone tags ('secure', 'perimeter', 'lobby', ...): what the guard's post protects. */
  zone?: string;
  /** Job ('gate', 'patrol', 'desk', 'handler', 'response', ...). */
  role?: string;
  /** Why the guard is there (M1 "have reason to what they are doing or protecting"); design text, may become a bark. */
  reason?: string;
  /** A talking-pair partner: the index in this section's `guards` of the guard he meets on his route. */
  pair?: number;
  /** A far guard that may sleep; read by guard-render (A64). */
  dormant?: boolean;
}

export interface SectorDef {
  id: string;
  name: string;
  /** Where the section starts. The run's checkpoint for section 1; later sections start at the previous connector. */
  start: Pose;
  objective: SectorObjective;
  /** The room into the next section; every section but the last has one. */
  connector?: ConnectorDef;
  /** The run's end (the last section only): every living player inside ends it. */
  extract?: SectorZone;
  /** The guards that spawn when the section loads (holding, unaware). */
  guards: SectorGuard[];
  /** Where alarm reinforcements come in (x, z; taken in turn), inside the section. */
  reinforce: [number, number][];
  /** Guards each alarm stage sends in here (A3): armed guards (`SECTOR_REINFORCE_KIND`, no heavies, G155). */
  perStage: number;
  /**
   * (sector-redesign G20, M10) How many dogs the section may have (default 0: none). Every dog needs a `handler`.
   * Sector Ops only (M10 "Include guard dogs"); G155 (no dogs) still holds for the co-op missions elsewhere.
   */
  dogs?: number;
  /** The ways to the objective and on to the exit (M8: at least 2). */
  routes: SectorRoute[];
  /** (sector-fixes-r RT) Team doors: doors bolted from one side (the course's B2 rule); none when absent. */
  bolts?: readonly SectorBolt[];
}

/**
 * (sector-fixes-r RT) A team door: a door bolted from one side (the course's B2 bolt, `BoltGate`). `at` is the door's
 * plan centre [x, z] (the door is found by position, `Doors.nearest`); `side` the unit plan direction from the door
 * toward the side that can unbolt it. The door starts locked; a player whose feet are past the door plane on `side`
 * (the course F7 test) within reach gets an "Unbolt" item; using it unlocks the door for both. A section restart
 * bolts its doors again. Guards treat a bolted door as any locked door (no guard route uses one).
 */
export interface SectorBolt {
  readonly at: readonly [number, number];
  readonly side: readonly [number, number];
  /** (sector-fixes-r2) The door's width (m) along its plane; `BOLT_DOOR_W` when absent. */
  readonly w?: number;
}

/** Reach (m) of a team door's "Unbolt" item (the course bolt's). */
export const BOLT_REACH = 1.6;

/** Is (x, z) on a bolt's unbolting side: past the door plane through `at` along `side` (course F7)? */
export function onBoltSide(b: SectorBolt, x: number, z: number): boolean {
  return (x - b.at[0]) * b.side[0] + (z - b.at[1]) * b.side[1] > 0;
}

/** (sector-fixes-r2) A team door's width (m) when its bolt gives none (the Warehouse's 1.2 doors). */
export const BOLT_DOOR_W = 1.2;
/** (sector-fixes-r2) How far (m) past the door's edge, along its plane, the "Unbolt" still reaches. */
export const BOLT_SIDE_MARGIN = 0.3;
/** (sector-fixes-r2) How far (m) out from the door plane, on the bolt side, the "Unbolt" reaches. */
export const BOLT_DEPTH = 1.2;

/** (sector-fixes-r2) Half the span (m) along the door plane from which a bolt can be worked: half the door plus the margin. */
export function boltHalfSpan(b: SectorBolt): number {
  return (b.w ?? BOLT_DOOR_W) / 2 + BOLT_SIDE_MARGIN;
}

/**
 * (sector-fixes-r2) Can feet at (x, z) work the bolt: on its side (`onBoltSide`), within `BOLT_DEPTH` of the door
 * plane and within `boltHalfSpan` of the door centre along the plane (so nobody unbolts it through the wall beside
 * the door, from a corridor running past its end). `Interactables.nearest` applies the same test (`sideHalf`,
 * `sideDepth`), so the prompt and the host agree.
 */
export function inBoltReach(b: SectorBolt, x: number, z: number): boolean {
  const dx = x - b.at[0];
  const dz = z - b.at[1];
  const depth = dx * b.side[0] + dz * b.side[1];
  const along = dz * b.side[0] - dx * b.side[1];
  return depth > 0 && depth <= BOLT_DEPTH && Math.abs(along) <= boltHalfSpan(b);
}

const BOLT_ID = /^c-sbolt-(\d+)-(\d+)$/;

/**
 * The "Unbolt" item id of section `sec`'s bolt `k`. The `c-` prefix puts it first in the co-op item list (the course
 * devices' rule, so the item cap never drops it); the client reads the bolt back from its own map data (`boltById`).
 */
export function boltItemId(sec: number, k: number): string {
  return `c-sbolt-${sec}-${k}`;
}

/** The bolt an "Unbolt" item id names (section, index and data), or null. */
export function boltById(defs: readonly SectorDef[] | undefined, id: string): { sec: number; k: number; bolt: SectorBolt } | null {
  const m = BOLT_ID.exec(id);
  if (!m || !defs) return null;
  const sec = Number(m[1]);
  const k = Number(m[2]);
  const bolt = defs[sec]?.bolts?.[k];
  return bolt ? { sec, k, bolt } : null;
}

/**
 * The team doors' state (host only, pure): which bolts are shut, per section. `use` is the host-authoritative press
 * (the user's feet must be on the bolt's side, the course B2 / F7 rule); `rebolt` shuts a section's bolts again (a
 * section restart, M9).
 */
export class SectorBolts {
  /** `shut[sec][k]`: the bolt is shut (its door locked). */
  readonly shut: boolean[][];

  constructor(readonly defs: readonly SectorDef[]) {
    this.shut = defs.map((d) => (d.bolts ?? []).map(() => true));
  }

  isShut(sec: number, k: number): boolean {
    return this.shut[sec]?.[k] === true;
  }

  /** A player at (x, z) used bolt `k` of section `sec`: true when it unbolts (shut, and the feet in reach, `inBoltReach`). */
  use(sec: number, k: number, x: number, z: number): boolean {
    const b = this.defs[sec]?.bolts?.[k];
    if (!b || !this.isShut(sec, k) || !inBoltReach(b, x, z)) return false;
    this.shut[sec]![k] = false;
    return true;
  }

  /** Shut every bolt of section `sec` again; returns the indices that were open (their doors lock again). */
  rebolt(sec: number): number[] {
    const out: number[] = [];
    const row = this.shut[sec];
    if (!row) return out;
    for (let k = 0; k < row.length; k++) {
      if (!row[k]) out.push(k);
      row[k] = true;
    }
    return out;
  }
}

/** Tuning (prototype values). */
export const SECTOR = {
  /** A hack is held this long (s). */
  hackTime: 3,
  /** A download runs this long (s) while a player stays within `downloadRange` of the terminal. */
  downloadTime: 10,
  downloadRange: 4,
  /** Alarm stages (G125: escalating, never ends the run) and the guards each stage sends in (A3). */
  alarmMax: 3,
  perStage: 2,
  /** Every living player inside the connector this long (s) starts the cycle (once the near doorway is clear). */
  connectorHold: 1,
  /** The cycle (s): the previous section unloads at its start, the next loads at `connectorLoadAt`, then the far door unlocks. */
  connectorCycle: 3,
  connectorLoadAt: 1.5,
  /** The near doorway counts as occupied within this distance (m) of its centre (the course airlock rule). */
  doorwayClear: AIRLOCK_DOORWAY_CLEAR,
  /** Every living player in the extraction zone this long (s) ends the run. */
  extractHold: 0.5,
  /**
   * The per-mode live guard cap (M6): a section's guards plus its alarm reinforcements (alarmMax x the section's
   * perStage). The co-op snapshot carries at most `MAX_ENEMIES` (32, `net/protocol.ts`), so this never goes above it.
   */
  maxAlive: 32,
  /** Revive syringes per op by difficulty (M7, A10): co-op only; solo restarts the section at its checkpoint. */
  syringes: { rookie: 3, normal: 2, realistic: 1, perfectionist: 1 } as Readonly<Record<DifficultyPreset, number>>,
} as const;

/**
 * (sector-restart, M9) The banner of a checkpoint restart. The co-op host's banners reach the client as `banner` events;
 * this title is also the client's cue to restore its own loadout and calm its music (no wire change, A1 in
 * `docs/sector-restart/BRIEF.md`).
 */
export const SECTOR_RESTART_TITLE = 'RESTARTING FROM CHECKPOINT';

/** Feet height tolerance (m) for a floor zone. */
export const ZONE_Y_TOL = 1.5;

/** Is (x, y, z) inside the zone? */
export function inZone(zone: SectorZone, x: number, y: number, z: number): boolean {
  const [x0, z0, x1, z1] = zone.box;
  return x >= Math.min(x0, x1) && x <= Math.max(x0, x1) && z >= Math.min(z0, z1) && z <= Math.max(z0, z1) && Math.abs(y - (zone.floorY ?? 0)) < ZONE_Y_TOL;
}

/** Is (x, z) in the connector's near doorway (it cannot close and lock)? Never when the doorway is unknown. */
export function inDoorway(c: ConnectorDef, x: number, z: number): boolean {
  const at = c.nearAt;
  if (!at) return false;
  const dx = x - at[0];
  const dz = z - at[1];
  return dx * dx + dz * dz < SECTOR.doorwayClear * SECTOR.doorwayClear;
}

/** The zone that ends the section: its connector, or the extraction for the last one. */
export function exitZone(def: SectorDef): SectorZone | null {
  return def.connector ?? def.extract ?? null;
}

/** Problems with a run's data (empty when fine): every section but the last has a connector, the last an extraction. */
export function checkSectors(defs: readonly SectorDef[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i]!;
    const last = i === defs.length - 1;
    if (!last && !d.connector) out.push(`${d.id}: no connector`);
    if (!last && d.extract) out.push(`${d.id}: an extraction before the last section`);
    if (last && !d.extract) out.push(`${d.id}: the last section has no extraction`);
    if (last && d.connector) out.push(`${d.id}: a connector after the last section`);
    d.bolts?.forEach((b, k) => {
      if (b.side[0] === 0 && b.side[1] === 0) out.push(`${d.id}: bolt ${k} side is zero`);
    });
    out.push(...checkSectorGuards(d));
  }
  return out;
}

/** (sector-redesign G3) The kind every alarm reinforcement spawns as: an armed guard, never a heavy (G155). */
export const SECTOR_REINFORCE_KIND = 'grunt' as const;

/**
 * (sector-redesign G3 / G20) A section's guard list against the Sector Ops rules (empty when fine): every human guard
 * carries a gun (M1 "they should all have weapons": no melee-only kinds such as the runner), no heavies (G155), at most
 * `dogs` dogs (default 0), and each dog names a handler: another guard of the section, armed and human.
 */
export function checkSectorGuards(d: SectorDef): string[] {
  const out: string[] = [];
  let dogs = 0;
  d.guards.forEach((g, k) => {
    const def = ENEMIES[g.kind];
    if (g.kind === 'heavy') out.push(`${d.id}: guard ${k} is a heavy (G155)`);
    if (def.quadruped) {
      dogs++;
      const h = g.handler === undefined ? undefined : d.guards[g.handler];
      if (!h) out.push(`${d.id}: dog ${k} has no handler`);
      else if (g.handler === k || ENEMIES[h.kind].quadruped || !ENEMIES[h.kind].weapon) out.push(`${d.id}: dog ${k}'s handler ${g.handler} is not an armed human guard`);
      return;
    }
    if (!def.weapon) out.push(`${d.id}: guard ${k} (${g.kind}) carries no gun (M1)`);
  });
  if (dogs > (d.dogs ?? 0)) out.push(`${d.id}: ${dogs} dogs, the section allows ${d.dogs ?? 0}`);
  return out;
}

// Connector events (a bitmask, so a step allocates nothing). The mode applies them in this order.
/** The objective is done: unlock the near door. */
export const CONN_UNLOCK_NEAR = 1;
/** The cycle starts: shut and lock the near door. */
export const CONN_LOCK_NEAR = 2;
/** Unload the previous section: its guards (alive, knocked out or dead, bodies too), cameras and lasers. */
export const CONN_UNLOAD = 4;
/** Load the next section: its guards behind the far door (unaware, on their routes), its devices. */
export const CONN_LOAD = 8;
/** The cycle is done: unlock the far door (the connector is the checkpoint). */
export const CONN_UNLOCK_FAR = 16;

export type ConnectorState = 'locked' | 'open' | 'cycling' | 'sealed';

/** What the mode feeds a connector each step (a reused object). */
export interface ConnectorInput {
  /** Every living player is inside the connector (and at least one is alive). */
  allInside: boolean;
  /** Nobody stands in the near doorway (`inDoorway`), so the near door can shut and lock. */
  doorwayClear: boolean;
}

/**
 * One connector (PLAN section 3): locked (objective open) -> open (objective done; the near door unlocks) -> cycling
 * (every living player inside for `connectorHold`, then the near door shuts and locks once its doorway is clear; the
 * previous section unloads at once, the next loads at `connectorLoadAt`) -> sealed (after `connectorCycle` the far door
 * unlocks). Step-driven: `step` returns the events (CONN_* bits) and allocates nothing. Leaving before the near door
 * locks resets the hold; once cycling, the cycle runs out (the door is locked behind them).
 */
export class ConnectorMachine {
  state: ConnectorState = 'locked';
  /** Time (s) every living player has been inside (open state). */
  insideT = 0;
  /** Cycle time (s). */
  t = 0;
  private loaded = false;
  private pending = 0;

  /** The objective is done: the near door unlocks (CONN_UNLOCK_NEAR on the next step). False when not locked. */
  open(): boolean {
    if (this.state !== 'locked') return false;
    this.state = 'open';
    this.insideT = 0;
    this.pending |= CONN_UNLOCK_NEAR;
    return true;
  }

  step(dt: number, input: ConnectorInput): number {
    let ev = this.pending;
    this.pending = 0;
    if (this.state === 'open') {
      this.insideT = input.allInside ? Math.min(SECTOR.connectorHold, this.insideT + dt) : 0;
      if (this.insideT >= SECTOR.connectorHold - 1e-9 && input.doorwayClear) {
        this.state = 'cycling';
        this.t = 0;
        this.loaded = false;
        ev |= CONN_LOCK_NEAR | CONN_UNLOAD;
      }
    } else if (this.state === 'cycling') {
      this.t += dt;
      ev |= this.advance(false);
    }
    return ev;
  }

  /** A started cycle ends at once (a restart during the cycle); returns the events it still owed. 0 when not cycling. */
  finish(): number {
    if (this.state !== 'cycling') return 0;
    return this.advance(true);
  }

  /** Back to locked (a restart, or the next section's connector). */
  reset(): void {
    this.state = 'locked';
    this.insideT = 0;
    this.t = 0;
    this.loaded = false;
    this.pending = 0;
  }

  private advance(now: boolean): number {
    let ev = 0;
    if (!this.loaded && (now || this.t >= SECTOR.connectorLoadAt - 1e-9)) {
      this.loaded = true;
      ev |= CONN_LOAD;
    }
    if (now || this.t >= SECTOR.connectorCycle - 1e-9) {
      this.state = 'sealed';
      ev |= CONN_UNLOCK_FAR;
    }
    return ev;
  }
}

export type SectorPhase = 'objective' | 'connector' | 'extract' | 'done';

/**
 * The run's progress: which section, its phase (objective, then its connector or the extraction), the download, the
 * alarm stage (carried over between sections, A3) and the checkpoint (section 1's start; after a connector seals, the
 * connector's checkpoint). `restartSection` puts the current section back as it began (M7: no lives).
 */
export class SectorRun {
  index = 0;
  phase: SectorPhase = 'objective';
  /** Download progress (s) of the current objective. */
  progress = 0;
  /** The download was started at its terminal. */
  downloading = false;
  /** Alarm stage 0..SECTOR.alarmMax, carried over between sections (A3). */
  alarm = 0;
  /** The alarm stage when the current section began (a restart goes back to it). */
  alarmAtStart = 0;
  /** Where a restart puts the players (a copy; the defs are never written). */
  readonly checkpoint: Pose = { x: 0, y: 0, z: 0, yaw: 0 };
  /** The current section's connector. */
  readonly conn = new ConnectorMachine();
  /** Time (s) every living player has been in the extraction. */
  private extractT = 0;

  constructor(readonly defs: readonly SectorDef[]) {
    const s = defs[0];
    if (!s) this.phase = 'done';
    else setPose(this.checkpoint, s.start);
  }

  get current(): SectorDef | null {
    return this.phase === 'done' ? null : (this.defs[this.index] ?? null);
  }

  /** The section a connector loads (null on the last). */
  get next(): SectorDef | null {
    return this.phase === 'done' ? null : (this.defs[this.index + 1] ?? null);
  }

  /** The current objective is done: its connector opens (or the extraction). False when it was not the objective's turn. */
  objectiveDone(): boolean {
    const s = this.current;
    if (this.phase !== 'objective' || !s) return false;
    this.downloading = false;
    if (s.connector && this.index + 1 < this.defs.length) {
      this.phase = 'connector';
      this.conn.open();
    } else {
      this.phase = 'extract';
      this.extractT = 0;
    }
    return true;
  }

  /** A download tick while in range; true when it completes (the connector opens). */
  download(dt: number): boolean {
    if (this.phase !== 'objective' || !this.downloading) return false;
    this.progress = Math.min(SECTOR.downloadTime, this.progress + dt);
    return this.progress >= SECTOR.downloadTime && this.objectiveDone();
  }

  /**
   * The connector step (connector phase only, else 0): its events (CONN_* bits). On CONN_UNLOCK_FAR the run has moved
   * on: the next section's objective, the connector as the checkpoint, the alarm stage recorded as its start.
   */
  step(dt: number, input: ConnectorInput): number {
    if (this.phase !== 'connector') return 0;
    const ev = this.conn.step(dt, input);
    if (ev & CONN_UNLOCK_FAR) this.advance();
    return ev;
  }

  /** The extraction step (extract phase only): true once every living player has held it `extractHold` (the run ends). */
  extractStep(dt: number, allInside: boolean): boolean {
    if (this.phase !== 'extract') return false;
    this.extractT = allInside ? this.extractT + dt : 0;
    if (this.extractT < SECTOR.extractHold - 1e-9) return false;
    this.phase = 'done';
    return true;
  }

  /** An alarm (A3): up one stage (capped); returns how many guards it sends in (0 once capped). */
  raiseAlarm(): number {
    const a = alarmStep(this.alarm, this.current?.perStage ?? SECTOR.perStage);
    this.alarm = a.stage;
    return a.send;
  }

  /**
   * Both down, or solo down (M7): the current section starts again from its checkpoint, its objective, download and
   * connector reset and the alarm back to its stage when the section began. Returns the connector events the mode
   * still has to apply: CONN_LOCK_NEAR when the near door had unlocked; a cycle already running finishes first (the
   * near door is locked behind the players), so the restart is of the next section and returns the cycle's owed
   * events (CONN_LOAD, CONN_UNLOCK_FAR). The mode respawns the section's guards and devices.
   */
  restartSection(): number {
    if (this.phase === 'done') return 0;
    let ev = 0;
    if (this.phase === 'connector' && this.conn.state === 'cycling') {
      ev = this.conn.finish();
      this.advance();
    } else if (this.phase === 'connector' && this.conn.state === 'open') ev = CONN_LOCK_NEAR;
    this.phase = 'objective';
    this.progress = 0;
    this.downloading = false;
    this.extractT = 0;
    this.conn.reset();
    this.alarm = this.alarmAtStart;
    return ev;
  }

  /** The connector sealed: the next section begins at it. */
  private advance(): void {
    const c = this.current?.connector;
    if (c) setPose(this.checkpoint, c.checkpoint);
    this.index++;
    this.phase = this.index < this.defs.length ? 'objective' : 'done';
    this.progress = 0;
    this.downloading = false;
    this.extractT = 0;
    this.conn.reset();
    this.alarmAtStart = this.alarm;
  }
}

function setPose(out: Pose, p: Pose): void {
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
  out.yaw = p.yaw;
}

/** The next alarm stage (capped) and how many guards it sends in (0 once capped; `perStage` per section, A3). */
export function alarmStep(stage: number, perStage: number = SECTOR.perStage): { stage: number; send: number } {
  if (stage >= SECTOR.alarmMax) return { stage, send: 0 };
  return { stage: stage + 1, send: perStage };
}

export interface SectorTally {
  time: number;
  /** Lethal kills (knock-outs are not kills, A4). */
  kills: number;
  /** Times spotted: guard detections plus camera alarms. */
  spotted: number;
}

export function fmtTime(s: number): string {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** The result line: time, kills, times spotted, and "Ghost" when there are none of either (A4). */
export function sectorResult(t: SectorTally): { ghost: boolean; line: string } {
  const ghost = t.kills === 0 && t.spotted === 0;
  return { ghost, line: `Time ${fmtTime(t.time)}  ·  Kills ${t.kills}  ·  Spotted ${t.spotted}${ghost ? '  ·  GHOST' : ''}` };
}

/** Co-op revive syringes for an op on `preset` (M7, A10); an unknown preset reads as Normal. */
export function syringesFor(preset: DifficultyPreset | undefined): number {
  return SECTOR.syringes[preset ?? 'normal'] ?? SECTOR.syringes.normal;
}

/**
 * The HUD mode info: "Section i/n", "Alarm a/max" and, in co-op, the revive syringes left (`syringes` null: solo, not
 * shown). Host and client build it the same way.
 */
export function sectorInfoHtml(section: number, sections: number, alarm: number, syringes: number | null): string {
  const sy = syringes === null ? '' : `<span>Syringes <b>${Math.max(0, syringes)}</b></span>`;
  return `<span>Section <b>${section}/${sections}</b></span><span>Alarm <b>${alarm}/${SECTOR.alarmMax}</b></span>${sy}`;
}

/**
 * (step 3, A9) What the host's `sector` message carries besides the devices (`sec`): the live section (`ls`, -1 none),
 * the locked door indices (`lk`), the cameras shot out (`dn`) and the revive syringes left (`sy`).
 */
export interface SectorNetExtra {
  ls: number;
  lk: number[];
  dn: string[];
  sy: number;
}
