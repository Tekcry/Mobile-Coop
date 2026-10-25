/**
 * The course state machine (host only, pure, Babylon-free). Inputs per fixed step: both players' feet and downed
 * flags (`setPlayer`), switch presses (`press`) and holds (`hold`), light group states (`setGroup`), flags
 * (`setFlag`), drill verbs (`tick`) and stats (`record`), then `update(dt)`. Outputs: door and anchor locks, the
 * current bay, the checkpoint, drill progress, the next drill per player, per-bay stats and `events`.
 *
 * Nothing completes a drill except `tick` (D30: no skip path). `solo` (the dev solo flag, D21, DECISIONS A6) makes one
 * player's ticks count for both, lets one player cycle an airlock, work both halves of a pair gate and restart the bay
 * when down; it never completes a drill.
 *
 * Per-step and per-query paths use indexed loops and allocate nothing (conventions.md hot paths).
 */
import { AIRLOCK_CYCLE, AIRLOCK_DOORWAY_CLEAR, AIRLOCK_Y_TOL, PAIR_WINDOW, RESTART_DELAY, TIMED_HOLD_AFTER } from '../../config/course';
import { pressPairHalf } from '../pairPress';
import {
  airlockPad,
  exitZoneReady,
  FLAG_VERB,
  gateDoors,
  inExitZone,
  inZone,
  leadOf,
  TIMED_WARN,
  type AirlockDef,
  type BayDef,
  type CourseDef,
  type CourseObjective,
  type DrillDef,
  type GateDef,
  type PlayerIdx,
  type RoleClaim,
  type StepCond,
} from './courseDef';
import type { SecurityConsole } from './securityRoom';
import type { StationDef } from './stationDef';

export type AirlockPhase = 'open' | 'waiting' | 'ready' | 'cycling' | 'sealed';

/**
 * (J14 R1) Why the players went back: `seen` (A1-A7 guard combat or a camera's full detection), `caught` (A8, combat held
 * CAUGHT_HOLD s), `timer` (a station's `drillS` window ran out), `out` (a downed bay restart with one player still up:
 * the partner is out), `down` (both down), `other` (J14 A26: a set's own way out of a soft-lock, e.g. A1's early drop
 * into the yard; the only cause that also retries a `retry: 'none'` station). Route-runs (J13 R4c) read seen / caught as
 * seen, timer as timer, out / down / other as other.
 */
export type RetryCause = 'seen' | 'caught' | 'timer' | 'out' | 'down' | 'other';
/** (J14 R1) The causes of a station retry (the downed ones restart the bay instead). */
export type StationCause = Exclude<RetryCause, 'out' | 'down'>;
/** (J14 R1) The last counted retry: `st` the station live when it fired (0 on a bay without stations). Host and client. */
export type LastRetry = { st: number; cause: RetryCause } | null;

export type CourseEvent =
  | { t: 'airlockCycling'; airlock: string }
  | { t: 'airlockCycled'; airlock: string; nearDoor: string; farDoor: string }
  | { t: 'gateOpened'; gate: string }
  | { t: 'gateClosed'; gate: string }
  | { t: 'flagSet'; flag: string }
  | { t: 'drillDone'; drill: string; player: PlayerIdx; complete: boolean }
  | { t: 'bayStarted'; bay: string; squad: string[] }
  | { t: 'bayRestart'; bay: string; squad: string[] }
  | { t: 'courseDone' }
  /** (N2 / N3) A timed window crossed its last TIMED_WARN s. */
  | { t: 'gateWarn'; gate: string }
  /** (N3) A timed flag ran out (a timed console's loop ended). */
  | { t: 'flagCleared'; flag: string }
  /** (N1) An objective step was latched done. */
  | { t: 'stepDone'; step: string }
  /** (gap list 6b) A role claim: player `a` has the A job in the current bay. */
  | { t: 'roleClaimed'; bay: string; a: PlayerIdx }
  /** (J14 R1) Station `st` retried: its gates and flags are reset; the mode resets its `guards`, devices and lamps and
   *  puts both players on its marks. */
  | { t: 'stationRetry'; st: number; cause: RetryCause; guards: readonly string[] };

export interface BayStats {
  time: number;
  detections: number;
  alarms: number;
  knockouts: number;
  kills: number;
  revives: number;
  teamMoves: number;
  /** Bodies the guards found. */
  bodies: number;
  /** (section-rating S6) Synced takedowns: two knock-outs by the two players within SYNC_WINDOW (team stat). */
  synced: number;
}
export type StatKind = Exclude<keyof BayStats, 'time'>;

export const REFUSE_PARTNER = 'Wait for your partner';
export const REFUSE_REVIVE = 'Revive first';
export const REFUSE_BOLT = 'Bolted from the other side';
/** A lone press of one half of a pair gate (course-ready F17): the partner must press the other half within the window. */
export const REFUSE_PAIR = 'Partner: press the other plate now';
/** The airlock status while one player stands on the pad (R6, D46): shown to both players. */
export const AIR_WAITING = 'Waiting for partner';
/** The airlock status while it cycles (the rear door shut and locked). */
export const AIR_CYCLING = 'Airlock sealed - cycling';
/** (N2) A press on an isolator inside its re-arm time. */
export const REFUSE_ISO_REARM = 'The isolator is re-arming';
/** (N3) A press on a timed console inside its re-arm time. */
export const REFUSE_CONSOLE_REARM = 'The console is rebooting';
/** (marlow-final) Seconds the claim zones stay shut after a bay restart (as the pass zones' `holdZones` 2 s). */
export const ROLE_HOLD = 2;

/** The `course` message body: plain JSON (state, locks, flags; T1b sends it). */
export interface PackedCourse {
  bay: number;
  done: boolean[];
  cp: string;
  clock: number;
  over: boolean;
  air: { phase: AirlockPhase; t: number }[];
  gates: { open: boolean; t: number; holders: number; ta: number; tb: number; pa?: number; pb?: number }[];
  flags: string[];
  /** [flag, bay index that set it]. */
  flagBay: [string, number][];
  groupsOff: string[];
  ticks: [number, number][];
  stats: BayStats[];
  /** Per-player totals over the course (what a player did: knock-outs, kills, revives, team moves). */
  pstats?: [BayStats, BayStats];
  /** Derived (for clients that mirror without running the state). */
  locks: string[];
  anchors: string[];
  /** (J14 R1) The live station's number (0: none, or a bay without stations). */
  st: number;
  /** (J14 R1) Counted retries (`CourseState.restarts`). */
  rs: number;
  /** (J14 R1) The last retry's station (`lastRetry.st`, 0 none). */
  rt: number;
  /** (J14 R1) The last retry's cause ('' none yet). */
  rc: RetryCause | '';
}

/** (J14 R1) A station at run time: its gates (precomputed, the drill window reads them per step) and done keys. */
interface StRt {
  def: StationDef;
  gates: GateRt[];
  /** `${doneFlag}@1` / `@2` (precomputed: the per-step checks must not allocate). */
  d1: string;
  d2: string;
}

const NO_ST_RT: StRt[] = [];

/**
 * (J14 R1 fix 7, lead decision b) Is station kit move `kit` playable on the host? How it is detected: it is not, in any
 * build yet. Player's move hookups (KS1-KS5, with their `kitMoves` switch on feature/coop-kit) are not on master, so this
 * answers false and every station's stand-in gate opens as its station goes live. Each KS slice replaces this with the
 * host's `kitMoves` check for its move (true: the stand-in stays locked and the real move is the way through).
 */
export function kitMoveOn(_kit: NonNullable<StationDef['kit']>): boolean {
  return false;
}
const NO_GATE_DOORS: readonly string[] = [];

interface GateRt {
  def: GateDef;
  /** Doors the gate unlocks (precomputed: `locked` must not allocate). */
  doors: readonly string[];
  bay: number;
  open: boolean;
  /** timedHold: seconds left after release. */
  t: number;
  /** Bit per player holding (hold, timedHold). */
  holders: number;
  /** pair: clock time of the last press of a / b (-1 = none). */
  ta: number;
  tb: number;
  /** pair: who pressed a / b last (player index, -1 = none): a pair needs two players unless `solo`. */
  pa: number;
  pb: number;
  /** flag / anchorLock / perPlayer pickup: `${flag}@1` and `${flag}@2` (precomputed: queries must not allocate); else ''. */
  key1: string;
  key2: string;
  /**
   * (N2 isolator, N3 timed console pickup) The window (s; 0 = not timed) and the re-arm time (s). While the window runs
   * `t` counts down; after it `tb` holds the clock time the re-arm ends (-1 = none).
   */
  secs: number;
  rearm: number;
}

/** (N1) A step condition, precomputed (no allocation per step). */
interface CondRt {
  /** 0 flag, 1 gate, 2 all, 3 any. */
  k: 0 | 1 | 2 | 3;
  flag: string;
  key1: string;
  key2: string;
  /** 0 any player, 1 the A job's player, 2 the B job's. */
  who: 0 | 1 | 2;
  gate: GateRt | null;
  kids: CondRt[];
}

/** (N1) An objective step at run time. */
interface StepRt {
  o: CourseObjective;
  /** The course flag that latches it done (`obj:<id>`; rides `PackedCourse.flags`, cleared by a bay restart). */
  key: string;
  cond: CondRt | null;
  /** The `timer` gate, or null. */
  timer: GateRt | null;
}

interface AirRt {
  def: AirlockDef;
  phase: AirlockPhase;
  t: number;
}

const NO_STEPS: readonly CourseObjective[] = [];
const NO_STEP_RT: StepRt[] = [];

export const newStats = (): BayStats => ({ time: 0, detections: 0, alarms: 0, knockouts: 0, kills: 0, revives: 0, teamMoves: 0, bodies: 0, synced: 0 });

export class CourseState {
  /** Current bay index (0-based). */
  bay = 0;
  /** Course clock (s). */
  clock = 0;
  /** The course is finished. */
  over = false;
  /** Checkpoint: 'start' or the last sealed airlock id. */
  checkpoint = 'start';
  /**
   * Dev solo flag (D21, A6): one player's ticks count for both; one player inside cycles an airlock; one player may press
   * both halves of a pair gate; one player down restarts the bay. Never completes a drill (D30).
   */
  solo = false;
  readonly done: boolean[];
  readonly stats: BayStats[];
  /** Per-player totals (only what `record` attributes to a player). */
  readonly pstats: [BayStats, BayStats] = [newStats(), newStats()];
  /** Events since the last `clearEvents()`. */
  readonly events: CourseEvent[] = [];
  /**
   * (J14 R1) Counted retries since the match start: every station retry (`retryStation`: seen, caught, timer) and every
   * downed bay restart (`restart('out' | 'down')`). The pause menu's restart and the built yard's spotted restart
   * (`restart()` with no cause) and A3's hall send-back do not count. Route-runs read it as `window.__course.restarts`.
   */
  restarts = 0;
  /** (J14 R1) The last counted retry, null before the first. */
  lastRetry: LastRetry = null;
  /** (J14 R1) Any bay has stations (the re-planned yard). */
  readonly hasStations: boolean;

  private readonly feet = [0, 0, 0, 0, 0, 0];
  private readonly padTmp: [number, number, number, number] = [0, 0, 0, 0];
  private readonly doorAt = new Map<string, [number, number]>();
  private readonly downed: [boolean, boolean] = [false, false];
  private readonly gates: GateRt[] = [];
  private readonly air: AirRt[] = [];
  private readonly airById = new Map<string, AirRt>();
  /** Drill progress, by global drill index: ticks per player. */
  private readonly ticks: [number, number][] = [];
  private readonly drillIdx = new Map<DrillDef, number>();
  private readonly flags = new Set<string>();
  private readonly flagBay = new Map<string, number>();
  private readonly groupsOff = new Set<string>();
  private downT = 0;
  /** (marlow-final) Seconds the claim zones stay shut after a bay restart: the players' old feet sit in the zone until the
   *  respawn moves them, which re-claimed the job at once (e2e A5 / A7 restart). */
  private roleHoldT = 0;
  /** Bumped whenever drill ticks may change (drillRefusal cache key, with the bay). */
  private tickGen = 0;
  private refusalGen = -1;
  private refusalBay = -1;
  private refusalText: string | null = null;
  /** (N1) Objective steps per bay, in route order. */
  private readonly steps: StepRt[][] = [];
  /** (gap list 6b) Per bay: the role-claim flags "P1 has A" / "P2 has A" (precomputed keys). */
  private readonly roleKeys: [string, string][] = [];
  /** (gap list 6a) Per bay: drills ticked by a flag (`flag:<flag>` verbs), with the flag name. */
  private readonly flagDrills: { d: DrillDef; flag: string }[][] = [];
  /** Whether `setPlayer` has given each player's feet yet (a role zone never claims for a player not there). */
  private readonly feetSet: [boolean, boolean] = [false, false];
  /** (J14 R1) Per bay: its stations in order. */
  private readonly stRt: StRt[][] = [];
  /** (J14 R1) The live station's index in the current bay's list (the list's length: none left). */
  private stIdx = 0;
  /** (J14 R1, J13 R4c) Stations whose retry is switched off until any bay restart. */
  private readonly retryOffSet = new Set<number>();
  /** (J14 R1) Flag -> the station live when it was set in the current bay (a station retry clears its own). */
  private readonly flagSt = new Map<string, number>();

  /**
   * `consoles` (the layout's security consoles): a console with `seconds` makes its pickup gate a timed loop (N3).
   */
  constructor(
    readonly def: CourseDef,
    consoles?: readonly SecurityConsole[],
  ) {
    this.done = def.bays.map(() => false);
    this.stats = def.bays.map(newStats);
    for (const a of def.airlocks) {
      const rt: AirRt = { def: a, phase: 'open', t: 0 };
      this.air.push(rt);
      this.airById.set(a.id, rt);
    }
    def.bays.forEach((b, i) => {
      for (const g of b.gates) {
        const keyed = g.kind === 'flag' || g.kind === 'anchorLock' || (g.kind === 'pickup' && g.perPlayer);
        const key1 = keyed ? `${g.flag}@1` : '';
        const key2 = keyed ? `${g.flag}@2` : '';
        let secs = 0;
        let rearm = 0;
        if (g.kind === 'isolator') {
          secs = g.seconds;
          rearm = g.rearm ?? 0;
        } else if (g.kind === 'pickup' && !g.perPlayer && consoles) {
          for (const c of consoles) {
            if (c.id === g.switchId && c.flag === g.flag && c.seconds !== undefined && c.seconds > 0) {
              secs = c.seconds;
              rearm = c.rearm ?? 0;
            }
          }
        }
        this.gates.push({ def: g, doors: gateDoors(g), bay: i, open: false, t: 0, holders: 0, ta: -1, tb: -1, pa: -1, pb: -1, key1, key2, secs, rearm });
      }
      const fd: { d: DrillDef; flag: string }[] = [];
      for (const d of b.drills) {
        this.drillIdx.set(d, this.ticks.length);
        this.ticks.push([0, 0]);
        if (d.verb.startsWith(FLAG_VERB)) fd.push({ d, flag: d.verb.slice(FLAG_VERB.length) });
      }
      this.flagDrills.push(fd);
      this.roleKeys.push([`role:${b.id}:A=P1`, `role:${b.id}:A=P2`]);
    });
    def.bays.forEach((b) => {
      const list: StepRt[] = [];
      for (const o of def.objectives ?? []) {
        if (o.bay !== b.id) continue;
        const cond = o.done === undefined ? null : Array.isArray(o.done) ? this.condAny(o.done) : this.condRt(o.done);
        list.push({ o, key: `obj:${o.id}`, cond, timer: o.timer !== undefined ? this.gateRt(o.timer) : null });
      }
      this.steps.push(list);
    });
    let any = false;
    def.bays.forEach((b, i) => {
      const list: StRt[] = [];
      for (const s of b.stations ?? []) {
        const gates: GateRt[] = [];
        for (const id of s.gates) for (const g of this.gates) if (g.bay === i && g.def.id === id) gates.push(g);
        list.push({ def: s, gates, d1: `${s.doneFlag}@1`, d2: `${s.doneFlag}@2` });
        any = true;
      }
      this.stRt.push(list);
    });
    this.hasStations = any;
    this.emitBayStarted();
    // (fix 7) the first station's stand-in (none on the re-plan today: station 1 teaches the boost)
    if (any) this.openStandIn();
  }

  private gateRt(id: string): GateRt | null {
    for (const g of this.gates) if (g.def.id === id) return g;
    return null;
  }

  /** (J14 R1 fix 3) The course doors gate `id` unlocks (none for a device id or an unknown gate). */
  gateDoorIds(id: string): readonly string[] {
    return this.gateRt(id)?.doors ?? NO_GATE_DOORS;
  }

  private condAny(list: readonly StepCond[]): CondRt {
    return { k: 3, flag: '', key1: '', key2: '', who: 0, gate: null, kids: list.map((c) => this.condRt(c)) };
  }

  private condRt(c: StepCond): CondRt {
    if ('all' in c) return { k: 2, flag: '', key1: '', key2: '', who: 0, gate: null, kids: c.all.map((x) => this.condRt(x)) };
    if ('gate' in c) return { k: 1, flag: '', key1: '', key2: '', who: 0, gate: this.gateRt(c.gate), kids: [] };
    return { k: 0, flag: c.flag, key1: `${c.flag}@1`, key2: `${c.flag}@2`, who: c.who === 'a' ? 1 : c.who === 'b' ? 2 : 0, gate: null, kids: [] };
  }

  get currentBay(): BayDef {
    return this.def.bays[this.bay]!;
  }

  /** Lead (the A job) of the current bay: a role claim, else the swap rule. */
  get lead(): PlayerIdx {
    return this.roleA(this.bay);
  }

  /** (gap list 6b) The player with the A job in bay `bayIdx`: the bay's role claim, else `leadOf` (the swap rule). */
  roleA(bayIdx: number): PlayerIdx {
    const k = this.roleKeys[bayIdx];
    if (k) {
      if (this.flags.has(k[0])) return 0;
      if (this.flags.has(k[1])) return 1;
    }
    return leadOf(bayIdx);
  }

  /** Has a role been claimed in bay `bayIdx` (default current)? */
  roleClaimed(bayIdx = this.bay): boolean {
    const k = this.roleKeys[bayIdx];
    return !!k && (this.flags.has(k[0]) || this.flags.has(k[1]));
  }

  clearEvents(): void {
    this.events.length = 0;
  }

  // ---- inputs ----

  setPlayer(p: PlayerIdx, x: number, y: number, z: number, downed: boolean): void {
    this.feet[p * 3] = x;
    this.feet[p * 3 + 1] = y;
    this.feet[p * 3 + 2] = z;
    this.downed[p] = downed;
    this.feetSet[p] = true;
  }

  /** A course door's plan centre (the mode sets the airlocks' rear doors once): the cycle waits while it is occupied. */
  setDoorPoint(id: string, x: number, z: number): void {
    this.doorAt.set(id, [x, z]);
  }

  setGroup(group: string, on: boolean): void {
    const wasOff = this.groupsOff.has(group);
    if (on === !wasOff) return;
    if (on) this.groupsOff.delete(group);
    else this.groupsOff.add(group);
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      const d = g.def;
      // (N2) the circuit came back on by other means (a wall switch) while isolated: the window ends now
      if (d.kind === 'isolator' && d.group === group && on && g.open) {
        this.endWindow(g);
        continue;
      }
      if (d.kind !== 'mains' || d.group !== group) continue;
      if (!on) this.setOpen(g, true);
      else if (!this.bothInside(this.exitAirlockOf(g.bay))) this.setOpen(g, false);
    }
  }

  setFlag(flag: string): void {
    this.addFlag(flag, this.bay);
  }

  /**
   * (N3) Clear a course flag (a timed console's loop ran out): the cameras reading it come back, flag gates on it relock.
   * Steps already latched stay done; drills stay ticked.
   */
  clearFlag(flag: string): void {
    if (!this.flags.delete(flag)) return;
    this.flagBay.delete(flag);
    this.flagSt.delete(flag);
    this.tickGen++;
    this.events.push({ t: 'flagCleared', flag });
  }

  /** Set a flag (owned by bay `bay`: its restart clears it); `flag:<flag>` drills of the current bay tick (6a). */
  private addFlag(flag: string, bay: number): void {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    this.flagBay.set(flag, bay);
    // (J14 R1) owned by the live station (its retry clears it); a done flag moves the live station on
    if (bay === this.bay && this.hasStations) {
      const n = this.station();
      if (n > 0) this.flagSt.set(flag, n);
      this.advanceStations();
    }
    this.tickGen++;
    this.events.push({ t: 'flagSet', flag });
    if (this.over) return;
    const fd = this.flagDrills[this.bay]!;
    for (let i = 0; i < fd.length; i++) {
      const e = fd[i]!;
      const f = e.flag;
      // a shared flag ticks every player the drill is open for; `<flag>@1` / `@2` that player only
      if (flag === f) {
        this.tickOne(e.d, 0);
        this.tickOne(e.d, 1);
      } else if (flag.length === f.length + 2 && flag.startsWith(f) && flag.charCodeAt(f.length) === 64 /* @ */) {
        const p: PlayerIdx = flag.charCodeAt(f.length + 1) === 49 /* 1 */ ? 0 : 1;
        this.tickOne(e.d, p);
        if (this.solo) this.tickOne(e.d, p === 0 ? 1 : 0);
      }
    }
  }

  /** A flag set globally or by either player. */
  hasFlag(flag: string): boolean {
    return this.flags.has(flag) || this.flags.has(`${flag}@1`) || this.flags.has(`${flag}@2`);
  }

  /** A flag set globally (a `perPlayer: false` gate, `setFlag`), not per player. No allocation: the per-frame device
   *  checks (camera and laser `offFlag`) use it (sector-fixes S). */
  hasShared(flag: string): boolean {
    return this.flags.has(flag);
  }

  /** A flag set globally or by player `p`. */
  hasFlagFor(flag: string, p: PlayerIdx): boolean {
    return this.flags.has(flag) || this.flags.has(`${flag}@${p + 1}`);
  }

  /**
   * Player `p` used `id`: a gate switch, a bolted door or a pickup. Returns a refusal to show, or null.
   * Airlocks have no button (R6, D46): an airlock id only answers why it is not cycling (nothing changes).
   */
  press(id: string, p: PlayerIdx): string | null {
    if (this.over || this.downed[p]) return null;
    const a = this.airById.get(id);
    if (a) return this.airRefusalFor(a, p);
    this.claimByPress(id, p);
    let refusal: string | null = null;
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      const d = g.def;
      switch (d.kind) {
        case 'lever':
          if (d.switchId === id) this.setOpen(g, true);
          break;
        case 'egress':
          if (d.switchId === id) this.setOpen(g, true);
          break;
        case 'bolt':
          if (d.doorId === id && !g.open) {
            const dx = this.feet[p * 3]! - d.at[0];
            const dz = this.feet[p * 3 + 2]! - d.at[1];
            if (dx * d.side[0] + dz * d.side[1] > 0) this.setOpen(g, true);
            else refusal = REFUSE_BOLT;
          }
          break;
        case 'pair':
          if (!g.open && (d.a === id || d.b === id)) refusal = this.pressPair(g, id === d.a, p) ?? refusal;
          break;
        case 'pickup':
          if (d.switchId === id) {
            if (g.secs > 0) {
              // (N3) a timed console: one loop at a time, then the re-arm
              if (g.open) break;
              if (this.clock < g.tb) {
                refusal = REFUSE_CONSOLE_REARM;
                break;
              }
              g.t = g.secs;
              g.tb = -1;
            }
            const flag = d.perPlayer ? (p === 0 ? g.key1 : g.key2) : d.flag;
            this.addFlag(flag, g.bay);
            this.setOpen(g, true);
          }
          break;
        case 'isolator':
          if (!g.open && d.switchIds.includes(id)) {
            // (N2) presses while isolated do nothing; inside the re-arm time the press is refused
            if (this.clock < g.tb) refusal = REFUSE_ISO_REARM;
            else {
              g.t = g.secs;
              g.tb = -1;
              g.pa = p;
              this.setOpen(g, true);
            }
          }
          break;
        default:
          break;
      }
    }
    return refusal;
  }

  /** Player `p` holds (down) or releases `holdId`. */
  hold(holdId: string, p: PlayerIdx, down: boolean): void {
    const bit = 1 << p;
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      const d = g.def;
      if ((d.kind !== 'hold' && d.kind !== 'timedHold') || d.holdId !== holdId) continue;
      const was = g.holders;
      g.holders = down && !this.downed[p] ? g.holders | bit : g.holders & ~bit;
      if (g.holders !== 0) {
        g.t = 0;
        this.setOpen(g, true);
      } else if (was !== 0) {
        if (d.kind === 'hold') this.setOpen(g, false);
        else g.t = d.after ?? TIMED_HOLD_AFTER;
      }
    }
  }

  /**
   * Player `p` performed `verb`: ticks the current bay's matching drills for that player (and for both under `solo`).
   * The only way a drill is ever done (D30).
   */
  tick(p: PlayerIdx, verb: string): void {
    if (this.over) return;
    const drills = this.currentBay.drills;
    for (let i = 0; i < drills.length; i++) {
      const d = drills[i]!;
      if (d.verb !== verb) continue;
      this.tickOne(d, p);
      if (this.solo) this.tickOne(d, p === 0 ? 1 : 0);
    }
  }

  /** Count a stat in the current bay (and for player `p` when the stat is theirs). */
  record(kind: StatKind, n = 1, p?: PlayerIdx): void {
    this.stats[this.bay]![kind] += n;
    if (p !== undefined) this.pstats[p][kind] += n;
  }

  /** The players reached the end (the exit lift): refuses like an airlock while drills are open. */
  finish(): string | null {
    if (this.over || this.currentBay.exit !== 'end') return null;
    const why = this.finishRefusal();
    if (why) return why;
    this.done[this.bay] = true;
    this.over = true;
    this.events.push({ t: 'courseDone' });
    return null;
  }

  /** Why the course cannot finish yet: open drills, a downed player, or (with an exit zone) not both players in it. */
  finishRefusal(): string | null {
    const why = this.drillRefusal();
    if (why) return why;
    const z = this.def.exitZone;
    if (!z) return null;
    if (this.anyDowned()) return REFUSE_REVIVE;
    return exitZoneReady(this.inExit(z, 0), this.inExit(z, 1), this.solo) ? null : REFUSE_PARTNER;
  }

  private inExit(z: NonNullable<CourseDef['exitZone']>, p: PlayerIdx): boolean {
    return inExitZone(z, this.feet[p * 3]!, this.feet[p * 3 + 1]!, this.feet[p * 3 + 2]!, AIRLOCK_Y_TOL);
  }

  /** Start at bay `n` (1-based, D20): earlier bays done, their airlocks sealed, checkpoint at bay n's entry airlock. */
  startAt(n: number): void {
    const idx = Math.max(0, Math.min(this.def.bays.length - 1, Math.floor(n) - 1));
    for (let i = 0; i < idx; i++) {
      this.done[i] = true;
      const a = this.airById.get(this.def.bays[i]!.exit);
      if (a) a.phase = 'sealed';
    }
    this.bay = idx;
    const entry = this.currentBay.entry;
    this.checkpoint = entry;
    this.events.length = 0;
    this.newBayStations();
    this.emitBayStarted();
  }

  /**
   * (J14 R1) Start at station `n` (`?course=station:<n>`; dev, tests, route-runs): its bay as `startAt` does, the bay's
   * earlier stations done (their done flags set). False: no station `n` in the course.
   */
  startStation(n: number): boolean {
    for (let b = 0; b < this.stRt.length; b++) {
      const list = this.stRt[b]!;
      for (let k = 0; k < list.length; k++) {
        if (list[k]!.def.n !== n) continue;
        this.startAt(b + 1);
        for (let i = 0; i < k; i++) this.addFlag(list[i]!.def.doneFlag, b);
        this.stIdx = k;
        return true;
      }
    }
    return false;
  }

  // ---- stations (J14 R1) ----

  /** The live station's number: the current bay's first station whose done flag is not set (0: none). No allocation. */
  station(): number {
    return this.liveRt()?.def.n ?? 0;
  }

  /** The live station, or null. */
  liveStation(): StationDef | null {
    return this.liveRt()?.def ?? null;
  }

  /** Station `n` of any bay, or null. */
  stationDef(n: number): StationDef | null {
    for (let b = 0; b < this.stRt.length; b++) {
      const list = this.stRt[b]!;
      for (let k = 0; k < list.length; k++) if (list[k]!.def.n === n) return list[k]!.def;
    }
    return null;
  }

  /** Does the current bay have stations (its spotted rule is the station retry, never `spotFail`)? */
  bayHasStations(): boolean {
    return (this.stRt[this.bay]?.length ?? 0) > 0;
  }

  /**
   * (J13 R4c hook, host) Switch station `n`'s retry off: it then acts as `retry: 'none'` (an alert, a caught hold or a drill
   * window ending plays out) until any bay restart. False: `n` is not a station of the current bay.
   */
  retryOff(n: number): boolean {
    const list = this.stRt[this.bay] ?? NO_ST_RT;
    for (let k = 0; k < list.length; k++) {
      if (list[k]!.def.n !== n) continue;
      this.retryOffSet.add(n);
      return true;
    }
    return false;
  }

  /** Is station `n`'s retry switched off (`retryOff`)? */
  isRetryOff(n: number): boolean {
    return this.retryOffSet.has(n);
  }

  /**
   * (J14 R1; BRIEF A1, A2; PLAN A17, A23) Retry the live station: only its gates (and their flags) and the flags set while
   * it was live (objective steps and a role claim among them); earlier stations stay done, drills stay ticked. Counts in
   * `restarts` / `lastRetry` and emits `stationRetry` (the mode resets its guards, devices and lamps and puts the players
   * on its marks). `n` (a set's drill window or beam, `CourseMode.stationRetry`): only while station `n` is live. False
   * (nothing changes): no live station (or not `n`), its retry is 'none' (unless the cause is `other`: a set's way out
   * of a soft-lock, J14 A26; nothing fails there, the pair is only put back) or switched off, or the course is over.
   */
  retryStation(cause: StationCause, n?: number): boolean {
    const s = this.liveRt();
    if (!s || this.over || (s.def.retry === 'none' && cause !== 'other') || this.retryOffSet.has(s.def.n)) return false;
    if (n !== undefined && n !== s.def.n) return false;
    const sn = s.def.n;
    // (fix 7) a stand-in standing open stays open (and its flag set) through the retry
    const keep = this.standInGate(s);
    const kd = keep?.def;
    const keepFlag = kd && (kd.kind === 'flag' || kd.kind === 'anchorLock' || kd.kind === 'pickup' || kd.kind === 'pair') ? kd.flag : undefined;
    for (let i = 0; i < s.gates.length; i++) {
      const g = s.gates[i]!;
      if (g === keep) continue;
      const d = g.def;
      if (d.kind === 'flag' || d.kind === 'anchorLock' || d.kind === 'pickup' || (d.kind === 'pair' && d.flag !== undefined)) {
        const f = d.flag!;
        this.dropFlag(f);
        this.dropFlag(`${f}@1`);
        this.dropFlag(`${f}@2`);
      }
      this.resetGate(g);
    }
    for (const [flag, k] of this.flagSt) if (k === sn && flag !== keepFlag) this.dropFlag(flag);
    // a stand-in the station's own gates do not hold (or one shut by hand) opens again
    this.openStandIn();
    this.roleHoldT = ROLE_HOLD;
    this.tickGen++;
    this.restarts++;
    this.lastRetry = { st: sn, cause };
    this.events.push({ t: 'stationRetry', st: sn, cause, guards: s.def.guards });
    return true;
  }

  /** Both players down (a lone player: the one there)? The cause a downed bay restart records: `down`, else `out`. */
  downCause(): 'out' | 'down' {
    return this.downed[0] && (this.downed[1] || !this.feetSet[1]) ? 'down' : 'out';
  }

  private liveRt(): StRt | null {
    return (this.stRt[this.bay] ?? NO_ST_RT)[this.stIdx] ?? null;
  }

  /** A new bay (or a restart of this one): its first station not done is live. */
  private newBayStations(): void {
    this.stIdx = 0;
    this.advanceStations();
    this.openStandIn();
  }

  /** Move the live station on past every station whose done flag is set (global or either player's); (fix 7) the new
   *  live station's stand-in opens. No allocation. */
  private advanceStations(): void {
    const list = this.stRt[this.bay] ?? NO_ST_RT;
    const was = this.stIdx;
    while (this.stIdx < list.length) {
      const s = list[this.stIdx]!;
      if (!this.flags.has(s.def.doneFlag) && !this.flags.has(s.d1) && !this.flags.has(s.d2)) break;
      this.stIdx++;
    }
    if (this.stIdx !== was) this.openStandIn();
  }

  /** (J14 R1 fix 7) Station `s`'s stand-in gate when it is to stand open (its kit move is not playable), else null. */
  private standInGate(s: StRt): GateRt | null {
    const id = s.def.standIn;
    if (id === undefined || (s.def.kit !== undefined && kitMoveOn(s.def.kit))) return null;
    return this.gateRt(id);
  }

  /**
   * (J14 R1 fix 7, lead decision b; PLAN "The five new-move stations") The live station's stand-in gate opens as the
   * station goes live while its kit move is not playable (`kitMoveOn`), and stays open through its retries. Host state:
   * the course wire's `gates` / `flags` take it to the client.
   */
  private openStandIn(): void {
    const s = this.liveRt();
    const g = s ? this.standInGate(s) : null;
    if (!g || this.gateOpen(g)) return;
    const d = g.def;
    if (d.kind === 'flag' || d.kind === 'anchorLock') {
      this.addFlag(d.flag, g.bay);
      return;
    }
    if ((d.kind === 'pickup' || d.kind === 'pair') && d.flag !== undefined) this.addFlag(d.flag, g.bay);
    this.setOpen(g, true);
  }

  /** A station retry drops a flag: as `clearFlag` (fix 5: `flagCleared`, so the mode's console edge tells the guards a
   *  looped console is back on); the caller counts `tickGen` once. */
  private dropFlag(flag: string): void {
    if (!this.flags.delete(flag)) return;
    this.flagBay.delete(flag);
    this.flagSt.delete(flag);
    this.events.push({ t: 'flagCleared', flag });
  }

  /** A gate back to shut (a restart or a station retry); a mains gate stays open while its group is off. */
  private resetGate(g: GateRt): void {
    const wasOpen = g.open;
    g.open = false;
    g.t = 0;
    g.holders = 0;
    g.ta = -1;
    g.tb = -1;
    g.pa = -1;
    g.pb = -1;
    if (g.def.kind === 'mains' && this.groupsOff.has(g.def.group)) g.open = true;
    if (wasOpen && !g.open) this.events.push({ t: 'gateClosed', gate: g.def.id });
  }

  /**
   * Restart the current bay (both players downed for RESTART_DELAY does it on its own): its gates and the flags set in
   * it reset, its exit airlock reopens; drills already ticked stay ticked (D36). Returns the squad slot ids to respawn;
   * the players respawn at `checkpoint`.
   * (J14 R1) `cause` (a downed restart: one out, or both down) counts it in `restarts` / `lastRetry` with the station it
   * interrupted; none (the pause menu, the built yard's spotted rule) does not. Every restart undoes the bay's stations
   * (G312) and turns every `retryOff` back on.
   */
  restart(cause?: 'out' | 'down'): string[] {
    const bi = this.bay;
    if (cause) {
      this.restarts++;
      this.lastRetry = { st: this.station(), cause };
    }
    this.retryOffSet.clear();
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      if (g.bay === bi) this.resetGate(g);
    }
    for (const [flag, b] of this.flagBay) {
      if (b !== bi) continue;
      this.flags.delete(flag);
      this.flagBay.delete(flag);
      this.flagSt.delete(flag);
    }
    this.newBayStations();
    const a = this.airById.get(this.currentBay.exit);
    if (a && a.phase !== 'sealed') {
      a.phase = 'open';
      a.t = 0;
    }
    this.downT = 0;
    this.roleHoldT = ROLE_HOLD;
    this.tickGen++;
    const squad = this.currentBay.squad.slice();
    this.events.push({ t: 'bayRestart', bay: this.currentBay.id, squad });
    return squad;
  }

  /** One fixed step. */
  update(dt: number): void {
    if (this.over) return;
    this.clock += dt;
    this.stats[this.bay]!.time += dt;
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      if (g.secs > 0) {
        // (N2 / N3) a timed window: the warning, then the end and the re-arm
        if (!g.open || g.t <= 0) continue;
        const before = g.t;
        g.t -= dt;
        if (before > TIMED_WARN + 1e-9 && g.t <= TIMED_WARN + 1e-9) this.events.push({ t: 'gateWarn', gate: g.def.id });
        if (g.t <= 1e-9) this.endWindow(g);
        continue;
      }
      if (g.def.kind !== 'timedHold' || g.holders !== 0 || g.t <= 0) continue;
      g.t -= dt;
      if (g.t <= 1e-9) {
        g.t = 0;
        this.setOpen(g, false);
      }
    }
    if (this.roleHoldT > 0) this.roleHoldT -= dt;
    else this.stepRoles();
    this.latchSteps();
    const a = this.airById.get(this.currentBay.exit);
    if (a && a.phase !== 'sealed') this.stepAirlock(a, dt);
    // the exit zone (G138): both players in it ends the course (the "Finish" device is the fallback without a zone)
    if (this.def.exitZone && this.currentBay.exit === 'end' && this.finishRefusal() === null) this.finish();
    const bothDown = this.solo ? this.downed[0] || this.downed[1] : this.downed[0] && this.downed[1];
    if (bothDown) {
      this.downT += dt;
      if (this.downT >= RESTART_DELAY - 1e-9) this.restart(this.downCause());
    } else this.downT = 0;
  }

  // ---- outputs ----

  /** Is the door locked by the course (an airlock or a gate)? */
  locked(doorId: string): boolean {
    for (let i = 0; i < this.air.length; i++) {
      const a = this.air[i]!;
      // the rear door shuts and locks for good once the cycle starts (R6, D48)
      if (a.def.nearDoor === doorId && (a.phase === 'sealed' || a.phase === 'cycling')) return true;
      if (a.def.farDoor === doorId && a.phase !== 'sealed') return true;
    }
    // every other gate on the door must be open (Fallow's L9 lift door: three keys and the pair); an open egress gate releases
    // the door on its own (marlow-final A8: the grille's mains gate or its request-to-exit opens it)
    let egress = false;
    let other = false;
    let otherShut = false;
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      const doors = g.doors;
      for (let j = 0; j < doors.length; j++) {
        if (doors[j] !== doorId) continue;
        const open = this.gateOpen(g);
        if (g.def.kind === 'egress') {
          if (open) return false;
          egress = true;
        } else {
          other = true;
          if (!open) otherShut = true;
        }
      }
    }
    // a door with only egress gates stays locked until one opens
    return other ? otherShut : egress;
  }

  /** Is the anchor locked (an anchorLock gate whose flag is not set)? */
  anchorLocked(anchorId: string): boolean {
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      const d = g.def;
      if (d.kind === 'anchorLock' && d.anchorId === anchorId && !this.gateOpen(g)) return true;
    }
    return false;
  }

  /** Every door the course names that is locked now. */
  lockedDoors(): string[] {
    const ids = new Set<string>();
    for (const a of this.air) {
      ids.add(a.def.nearDoor);
      ids.add(a.def.farDoor);
    }
    for (const g of this.gates) for (const d of g.doors) ids.add(d);
    return [...ids].filter((d) => this.locked(d));
  }

  lockedAnchors(): string[] {
    const out: string[] = [];
    for (const g of this.gates) if (g.def.kind === 'anchorLock' && this.anchorLocked(g.def.anchorId) && !out.includes(g.def.anchorId)) out.push(g.def.anchorId);
    return out;
  }

  isGateOpen(gateId: string): boolean {
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      if (g.def.id === gateId) return this.gateOpen(g);
    }
    return false;
  }

  /**
   * Is a bolt gate's "Unbolt" item live (course-ready F8)? Only while the bolt is shut and the course runs: once unbolted it
   * must not stay the nearest item and hide the door menu; a bay restart shuts the bolt and brings it back.
   */
  boltUsable(gateId: string): boolean {
    return !this.over && !this.isGateOpen(gateId);
  }

  airlockPhase(id: string): AirlockPhase | null {
    return this.airById.get(id)?.phase ?? null;
  }

  /**
   * The current bay's exit airlock status for the HUD (both players, R6): "Waiting for partner" with one on the pad,
   * the refusal naming the open objectives (or "Revive first") with both on it, "cycling" while it cycles, else null.
   * Cached strings: no allocation per frame.
   */
  airlockStatus(): string | null {
    const a = this.airById.get(this.currentBay.exit);
    if (!a || this.over) return null;
    switch (a.phase) {
      case 'waiting':
        return AIR_WAITING;
      case 'ready':
        return this.anyDowned() ? REFUSE_REVIVE : this.drillRefusal();
      case 'cycling':
        return AIR_CYCLING;
      default:
        return null;
    }
  }

  /** Ticks player `p` has on a drill of the course. */
  drillTicks(drillId: string, p: PlayerIdx): number {
    const bays = this.def.bays;
    for (let i = 0; i < bays.length; i++) {
      const drills = bays[i]!.drills;
      for (let j = 0; j < drills.length; j++) {
        const d = drills[j]!;
        if (d.id === drillId) return this.ticks[this.drillIdx.get(d)!]![p];
      }
    }
    return 0;
  }

  /** Is the drill done by the players it names (in bay `bayIdx`, default current)? */
  drillComplete(d: DrillDef, bayIdx = this.bay): boolean {
    const n = this.ticks[this.drillIdx.get(d)!]!;
    const c = d.count ?? 1;
    const lead = this.roleA(bayIdx);
    switch (d.who) {
      case 'both':
        return n[0] >= c && n[1] >= c;
      case 'lead':
        return n[lead] >= c;
      case 'second':
        return n[lead === 0 ? 1 : 0] >= c;
      case 'either':
        return n[0] >= c || n[1] >= c;
    }
  }

  /** Bumped whenever drill ticks may have changed (HUD change detection). */
  get gen(): number {
    return this.tickGen;
  }

  /** Is drill `d` player `p`'s to do (in bay `bayIdx`, default current)? `either` drills are both players'. */
  drillIsFor(d: DrillDef, p: PlayerIdx, bayIdx = this.bay): boolean {
    if (d.who === 'both' || d.who === 'either') return true;
    const lead = this.roleA(bayIdx);
    return d.who === 'lead' ? p === lead : p !== lead;
  }

  /** Player `p`'s part of the drill is still open. */
  drillOpenFor(d: DrillDef, p: PlayerIdx, bayIdx = this.bay): boolean {
    const n = this.ticks[this.drillIdx.get(d)!]!;
    const c = d.count ?? 1;
    const lead = this.roleA(bayIdx);
    switch (d.who) {
      case 'both':
        return n[p] < c;
      case 'lead':
        return p === lead && n[p] < c;
      case 'second':
        return p !== lead && n[p] < c;
      case 'either':
        return !this.drillComplete(d, bayIdx);
    }
  }

  /** The next drill of the current bay for player `p` (tutorial step and marker), or null when they are done. */
  nextDrill(p: PlayerIdx): DrillDef | null {
    const drills = this.currentBay.drills;
    for (let i = 0; i < drills.length; i++) if (this.drillOpenFor(drills[i]!, p)) return drills[i]!;
    return null;
  }

  /** Every drill of the current bay is done. */
  drillsDone(): boolean {
    const drills = this.currentBay.drills;
    for (let i = 0; i < drills.length; i++) if (!this.drillComplete(drills[i]!)) return false;
    return true;
  }

  /** Totals over every bay. */
  totals(): BayStats {
    const t = newStats();
    for (let i = 0; i < this.stats.length; i++) {
      const s = this.stats[i]!;
      t.time += s.time;
      t.detections += s.detections;
      t.alarms += s.alarms;
      t.knockouts += s.knockouts;
      t.kills += s.kills;
      t.revives += s.revives;
      t.teamMoves += s.teamMoves;
      t.bodies += s.bodies;
      t.synced += s.synced;
    }
    return t;
  }

  // ---- objective steps (N1) ----

  /** The objective steps of bay `bayIdx` (default current), in route order. */
  stepsOf(bayIdx = this.bay): readonly CourseObjective[] {
    const list = this.stepList(bayIdx);
    return list.length ? (this.stepObjs[bayIdx] ??= list.map((s) => s.o)) : NO_STEPS;
  }
  private readonly stepObjs: CourseObjective[][] = [];

  /** Is step `o` done? A step with `done`: latched (its `obj:<id>` flag). One without: its bay is done. */
  stepDone(o: CourseObjective): boolean {
    const s = this.stepRtOf(o);
    if (!s) return false;
    if (s.cond) return this.flags.has(s.key);
    const bi = this.bayIndexOf(o.bay);
    return this.over || (bi >= 0 && this.done[bi] === true);
  }

  /** Is step `id` done (tests, debug)? */
  isStepDone(id: string): boolean {
    for (let b = 0; b < this.steps.length; b++) {
      const list = this.steps[b]!;
      for (let i = 0; i < list.length; i++) if (list[i]!.o.id === id) return this.stepDone(list[i]!.o);
    }
    return false;
  }

  /** The current bay's first open step with `done` (an objective table row), or null when they are all done. */
  currentStep(): CourseObjective | null {
    const list = this.stepList(this.bay);
    for (let i = 0; i < list.length; i++) {
      const s = list[i]!;
      if (s.cond && !this.flags.has(s.key)) return s.o;
    }
    return null;
  }

  /** The current bay's last line (its first step without `done`), or null. */
  finalStep(): CourseObjective | null {
    const list = this.stepList(this.bay);
    for (let i = 0; i < list.length; i++) if (!list[i]!.cond) return list[i]!.o;
    return null;
  }

  /** Player `p`'s job in the current bay: 'a' (the lead, or a claim) or 'b'. */
  roleOf(p: PlayerIdx): 'a' | 'b' {
    return this.lead === p ? 'a' : 'b';
  }

  /** Player `p`'s line for step `o` (the A or B line by their job), or the shared line when the step has none. */
  stepLine(o: CourseObjective, p: PlayerIdx): string {
    const own = this.roleOf(p) === 'a' ? o.a : o.b;
    return own ?? o.text;
  }

  /** Seconds left on step `o`'s `timer` gate while its window runs (0: none or not running). */
  stepTimer(o: CourseObjective): number {
    const g = this.stepRtOf(o)?.timer;
    if (!g || !this.gateOpen(g)) return 0;
    if (g.secs > 0 || g.def.kind === 'timedHold') return Math.max(0, g.t);
    return 0;
  }

  /** Seconds left on timed gate `gateId`'s window (0: not running). */
  gateTimer(gateId: string): number {
    const g = this.gateRt(gateId);
    return g && g.open ? Math.max(0, g.t) : 0;
  }

  /** Seconds until timed gate `gateId` re-arms (0: ready). */
  gateRearm(gateId: string): number {
    const g = this.gateRt(gateId);
    return g && g.tb > this.clock ? g.tb - this.clock : 0;
  }

  /** (guard-ai S22, G6, A133) A guard turned console gate `gateId` back on: as its loop running out (the flag clears,
   *  the cameras come back, the gate closes, a timed console's re-arm starts). False: not a pickup gate or its flag was
   *  not set. Host only. */
  consoleBack(gateId: string): boolean {
    const g = this.gateRt(gateId);
    if (!g || g.def.kind !== 'pickup' || !this.flags.has(g.def.flag)) return false;
    this.endWindow(g);
    return true;
  }

  /**
   * Client mirror, per frame: run the timed windows down between two `course` messages (display only: nothing opens or
   * closes here; the next message corrects it). No allocation.
   */
  advanceMirror(dt: number): void {
    this.clock += dt;
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      if (g.open && g.t > 0 && (g.secs > 0 || (g.def.kind === 'timedHold' && g.holders === 0))) g.t = Math.max(0, g.t - dt);
    }
  }

  // ---- serialisation ----

  pack(): PackedCourse {
    return {
      bay: this.bay,
      done: this.done.slice(),
      cp: this.checkpoint,
      clock: this.clock,
      over: this.over,
      air: this.air.map((a) => ({ phase: a.phase, t: a.t })),
      gates: this.gates.map((g) => ({ open: g.open, t: g.t, holders: g.holders, ta: g.ta, tb: g.tb, pa: g.pa, pb: g.pb })),
      flags: [...this.flags],
      flagBay: [...this.flagBay],
      groupsOff: [...this.groupsOff],
      ticks: this.ticks.map((n) => [n[0], n[1]]),
      stats: this.stats.map((s) => ({ ...s })),
      pstats: [{ ...this.pstats[0] }, { ...this.pstats[1] }],
      locks: this.lockedDoors(),
      anchors: this.lockedAnchors(),
      st: this.station(),
      rs: this.restarts,
      rt: this.lastRetry?.st ?? 0,
      rc: this.lastRetry?.cause ?? '',
    };
  }

  /** Mirror a packed state (a client, or a host resuming). Ignores entries that do not fit this course. */
  apply(p: PackedCourse): void {
    this.bay = Math.max(0, Math.min(this.def.bays.length - 1, p.bay | 0));
    this.clock = p.clock;
    this.over = p.over;
    this.checkpoint = p.cp;
    for (let i = 0; i < this.done.length; i++) this.done[i] = p.done[i] === true;
    this.air.forEach((a, i) => {
      const s = p.air[i];
      if (s) {
        a.phase = s.phase;
        a.t = s.t;
      }
    });
    this.gates.forEach((g, i) => {
      const s = p.gates[i];
      if (s) {
        g.open = s.open;
        g.t = s.t;
        g.holders = s.holders;
        g.ta = s.ta;
        g.tb = s.tb;
        g.pa = s.pa ?? -1;
        g.pb = s.pb ?? -1;
      }
    });
    this.flags.clear();
    for (const f of p.flags) this.flags.add(f);
    this.flagBay.clear();
    for (const [f, b] of p.flagBay) this.flagBay.set(f, b);
    this.groupsOff.clear();
    for (const g of p.groupsOff) this.groupsOff.add(g);
    this.tickGen++;
    this.ticks.forEach((n, i) => {
      const s = p.ticks[i];
      if (s) {
        n[0] = s[0];
        n[1] = s[1];
      }
    });
    this.stats.forEach((s, i) => {
      const q = p.stats[i];
      if (q) Object.assign(s, q);
    });
    if (p.pstats) {
      Object.assign(this.pstats[0], p.pstats[0]);
      Object.assign(this.pstats[1], p.pstats[1]);
    }
    // (J14 R1) the live station as the host has it, the retry count and the last retry (one shape on both sides)
    const list = this.stRt[this.bay] ?? NO_ST_RT;
    let k = 0;
    while (k < list.length && list[k]!.def.n !== p.st) k++;
    this.stIdx = k;
    this.restarts = p.rs;
    const lr = this.lastRetry;
    if (!p.rc) this.lastRetry = null;
    else if (!lr || lr.st !== p.rt || lr.cause !== p.rc) this.lastRetry = { st: p.rt, cause: p.rc };
  }

  // ---- internals ----

  private stepList(bayIdx: number): StepRt[] {
    return this.steps[bayIdx] ?? NO_STEP_RT;
  }

  private stepRtOf(o: CourseObjective): StepRt | null {
    for (let b = 0; b < this.steps.length; b++) {
      const list = this.steps[b]!;
      for (let i = 0; i < list.length; i++) if (list[i]!.o === o) return list[i]!;
    }
    return null;
  }

  private bayIndexOf(id: string): number {
    const bays = this.def.bays;
    for (let i = 0; i < bays.length; i++) if (bays[i]!.id === id) return i;
    return -1;
  }

  /** (N2 / N3) A timed window ends: a timed console's flag clears; the gate closes and the re-arm starts. */
  private endWindow(g: GateRt): void {
    g.t = 0;
    g.tb = g.rearm > 0 ? this.clock + g.rearm : -1;
    if (g.def.kind === 'pickup') this.clearFlag(g.def.flag);
    this.setOpen(g, false);
  }

  /** (N1) Latch the current bay's steps whose condition holds (host, per step; no allocation unless one latches). */
  private latchSteps(): void {
    const list = this.stepList(this.bay);
    for (let i = 0; i < list.length; i++) {
      const s = list[i]!;
      if (!s.cond || this.flags.has(s.key) || !this.condHolds(s.cond)) continue;
      this.addFlag(s.key, this.bay);
      this.events.push({ t: 'stepDone', step: s.o.id });
    }
  }

  private condHolds(c: CondRt): boolean {
    switch (c.k) {
      case 0: {
        if (c.who === 0) return this.flags.has(c.flag) || this.flags.has(c.key1) || this.flags.has(c.key2);
        const a = this.lead;
        const p = c.who === 1 ? a : a === 0 ? 1 : 0;
        return this.flags.has(c.flag) || this.flags.has(p === 0 ? c.key1 : c.key2);
      }
      case 1:
        return !!c.gate && this.gateOpen(c.gate);
      case 2:
        for (let i = 0; i < c.kids.length; i++) if (!this.condHolds(c.kids[i]!)) return false;
        return true;
      case 3:
        for (let i = 0; i < c.kids.length; i++) if (this.condHolds(c.kids[i]!)) return true;
        return false;
    }
  }

  /** (6b) The current bay's claims by zone: the first player standing in a claim zone takes its job. */
  private stepRoles(): void {
    const roles = this.currentBay.roles;
    if (!roles || this.roleClaimed()) return;
    for (let r = 0; r < roles.length; r++) {
      const c = roles[r]!;
      const zn = c.zone;
      if (!zn) continue;
      for (let p = 0 as PlayerIdx; p < 2; p = (p + 1) as PlayerIdx) {
        if (!this.feetSet[p] || this.downed[p]) continue;
        if (inZone(zn, this.feet[p * 3]!, this.feet[p * 3 + 1]!, this.feet[p * 3 + 2]!)) {
          this.claim(p, c);
          return;
        }
      }
    }
  }

  /** (6b) A press on a claim device of the current bay takes its job (first claim only). */
  private claimByPress(id: string, p: PlayerIdx): void {
    const roles = this.currentBay.roles;
    if (!roles || this.roleClaimed()) return;
    for (let r = 0; r < roles.length; r++) {
      const c = roles[r]!;
      if (c.press && c.press.includes(id)) {
        this.claim(p, c);
        return;
      }
    }
  }

  private claim(p: PlayerIdx, c: RoleClaim): void {
    const a: PlayerIdx = c.role === 'a' ? p : p === 0 ? 1 : 0;
    this.addFlag(this.roleKeys[this.bay]![a], this.bay);
    this.events.push({ t: 'roleClaimed', bay: this.currentBay.id, a });
  }

  private emitBayStarted(): void {
    const b = this.currentBay;
    this.events.push({ t: 'bayStarted', bay: b.id, squad: b.squad.slice() });
  }

  private gateOpen(g: GateRt): boolean {
    const d = g.def;
    if (d.kind === 'flag' || d.kind === 'anchorLock') return this.flags.has(d.flag) || this.flags.has(g.key1) || this.flags.has(g.key2);
    return g.open;
  }

  private setOpen(g: GateRt, open: boolean): void {
    if (g.open === open) return;
    g.open = open;
    this.events.push(open ? { t: 'gateOpened', gate: g.def.id } : { t: 'gateClosed', gate: g.def.id });
  }

  /** One half of a pair gate pressed: opens it with the other half inside the window, else the lone-press hint (F17). */
  private pressPair(g: GateRt, isA: boolean, p: PlayerIdx): string | null {
    if (g.def.kind !== 'pair') return null;
    // (sector-redesign E3) the rule is shared with Sector Ops (`pairPress.ts`): two different players, unless the dev
    // solo flag lets one work both halves (A6), within the window
    if (!pressPairHalf(g, isA, p, this.clock, g.def.window ?? PAIR_WINDOW, this.solo)) return REFUSE_PAIR;
    // (marlow-final) addFlag also ticks the bay's flag drills
    if (g.def.flag !== undefined) this.addFlag(g.def.flag, g.bay);
    this.setOpen(g, true);
    return null;
  }

  private tickOne(d: DrillDef, p: PlayerIdx): void {
    if (!this.drillOpenFor(d, p)) return;
    const n = this.ticks[this.drillIdx.get(d)!]!;
    n[p] += 1;
    this.tickGen++;
    if (n[p] >= (d.count ?? 1)) {
      this.events.push({ t: 'drillDone', drill: d.id, player: p, complete: this.drillComplete(d) });
    }
  }

  private exitAirlockOf(bayIdx: number): AirRt | null {
    return this.airById.get(this.def.bays[bayIdx]!.exit) ?? null;
  }

  /** Feet on the airlock's pad: its box inset clear of the door planes (`airlockPad`), so no one on it is in a doorway. */
  private inside(a: AirlockDef, p: PlayerIdx): boolean {
    const x = this.feet[p * 3]!;
    const y = this.feet[p * 3 + 1]!;
    const z = this.feet[p * 3 + 2]!;
    const b = airlockPad(a, this.padTmp);
    return x >= b[0] && x <= b[2] && z >= b[1] && z <= b[3] && Math.abs(y - a.floorY) < AIRLOCK_Y_TOL;
  }

  /** Someone's feet within AIRLOCK_DOORWAY_CLEAR of the airlock's rear door (unknown door point: never). */
  private rearDoorwayOccupied(a: AirlockDef): boolean {
    const at = this.doorAt.get(a.nearDoor);
    if (!at) return false;
    for (let p = 0; p < 2; p++) {
      const dx = this.feet[p * 3]! - at[0];
      const dz = this.feet[p * 3 + 2]! - at[1];
      if (dx * dx + dz * dz < AIRLOCK_DOORWAY_CLEAR * AIRLOCK_DOORWAY_CLEAR) return true;
    }
    return false;
  }

  /** Both players inside (one under `solo`). */
  private bothInside(a: AirRt | null): boolean {
    if (!a) return false;
    return this.insideCount(a.def) >= this.need();
  }

  /** Players an airlock needs: 2, or 1 under the dev solo flag (A6). */
  private need(): number {
    return this.solo ? 1 : 2;
  }

  private insideCount(a: AirlockDef): number {
    return (this.inside(a, 0) ? 1 : 0) + (this.inside(a, 1) ? 1 : 0);
  }

  private anyDowned(): boolean {
    return this.downed[0] || this.downed[1];
  }

  /** "Waiting: P1 - a; P2 - b, c" for the current bay's open drills, or null. */
  private drillRefusal(): string | null {
    // Cached: rebuilt only when ticks or the bay change (airlockStatus and the course end refusal query it every step
    // and must not allocate).
    if (this.refusalGen === this.tickGen && this.refusalBay === this.bay) return this.refusalText;
    let text = '';
    const p1 = this.drillNames(0);
    const p2 = this.drillNames(1);
    const any = this.drillNames(-1);
    if (p1) text = 'P1 - ' + p1;
    if (p2) text += (text ? '; ' : '') + 'P2 - ' + p2;
    if (any) text += (text ? '; ' : '') + 'P1 or P2 - ' + any;
    this.refusalText = text ? 'Waiting: ' + text : null;
    this.refusalGen = this.tickGen;
    this.refusalBay = this.bay;
    return this.refusalText;
  }

  /** Comma-separated names of the current bay's open drills for player `p` (-1: the `either` drills). */
  private drillNames(p: PlayerIdx | -1): string {
    let out = '';
    const drills = this.currentBay.drills;
    for (let i = 0; i < drills.length; i++) {
      const d = drills[i]!;
      if (this.drillComplete(d)) continue;
      const mine = p === -1 ? d.who === 'either' : d.who !== 'either' && this.drillOpenFor(d, p);
      if (mine) out += (out ? ', ' : '') + (d.name ?? d.verb);
    }
    return out;
  }

  private cycleRefusal(a: AirRt): string | null {
    const n = this.insideCount(a.def);
    if (this.anyDowned()) return REFUSE_REVIVE;
    if (n < this.need()) return REFUSE_PARTNER;
    return this.drillRefusal();
  }

  /** Why the airlock is not cycling for player `p` on its pad (null: not the current exit, not on the pad, or cycling). */
  private airRefusalFor(a: AirRt, p: PlayerIdx): string | null {
    if (this.currentBay.exit !== a.def.id || a.phase === 'sealed' || a.phase === 'cycling') return null;
    if (!this.inside(a.def, p)) return null;
    return this.cycleRefusal(a);
  }

  /**
   * Automatic airlock (R6, D46): both on the pad (one under solo), none downed and the bay's drills done starts the
   * cycle by itself; the rear door then stays shut and locked for good. A downed player pauses the cycle (a both-down
   * restart reopens it); stepping off the pad does not abort it (the rear door is already locked behind them).
   */
  private stepAirlock(a: AirRt, dt: number): void {
    if (a.phase === 'cycling') {
      if (this.anyDowned()) return;
      a.t += dt;
      if (a.t >= AIRLOCK_CYCLE - 1e-9) this.seal(a);
      return;
    }
    const n = this.insideCount(a.def);
    a.phase = n === 0 ? 'open' : n < this.need() ? 'waiting' : 'ready';
    // belt and braces (the pad is already clear of the doorway): never start while the rear doorway is occupied, the
    // rear door is forced shut when the cycle starts
    if (a.phase === 'ready' && this.cycleRefusal(a) === null && !this.rearDoorwayOccupied(a.def)) {
      a.phase = 'cycling';
      a.t = 0;
      this.events.push({ t: 'airlockCycling', airlock: a.def.id });
    }
  }

  private seal(a: AirRt): void {
    a.phase = 'sealed';
    a.t = 0;
    this.done[this.bay] = true;
    this.checkpoint = a.def.id;
    this.events.push({ t: 'airlockCycled', airlock: a.def.id, nearDoor: a.def.nearDoor, farDoor: a.def.farDoor });
    if (this.bay < this.def.bays.length - 1) {
      this.bay++;
      this.newBayStations();
      this.emitBayStarted();
    }
  }
}
