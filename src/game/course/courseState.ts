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
import { airlockPad, exitZoneReady, gateDoors, inExitZone, leadOf, type AirlockDef, type BayDef, type CourseDef, type DrillDef, type GateDef, type PlayerIdx } from './courseDef';

export type AirlockPhase = 'open' | 'waiting' | 'ready' | 'cycling' | 'sealed';

export type CourseEvent =
  | { t: 'airlockCycling'; airlock: string }
  | { t: 'airlockCycled'; airlock: string; nearDoor: string; farDoor: string }
  | { t: 'gateOpened'; gate: string }
  | { t: 'gateClosed'; gate: string }
  | { t: 'flagSet'; flag: string }
  | { t: 'drillDone'; drill: string; player: PlayerIdx; complete: boolean }
  | { t: 'bayStarted'; bay: string; squad: string[] }
  | { t: 'bayRestart'; bay: string; squad: string[] }
  | { t: 'courseDone' };

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
}

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
}

interface AirRt {
  def: AirlockDef;
  phase: AirlockPhase;
  t: number;
}

export const newStats = (): BayStats => ({ time: 0, detections: 0, alarms: 0, knockouts: 0, kills: 0, revives: 0, teamMoves: 0, bodies: 0 });

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
  /** Bumped whenever drill ticks may change (drillRefusal cache key, with the bay). */
  private tickGen = 0;
  private refusalGen = -1;
  private refusalBay = -1;
  private refusalText: string | null = null;

  constructor(readonly def: CourseDef) {
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
        this.gates.push({ def: g, doors: gateDoors(g), bay: i, open: false, t: 0, holders: 0, ta: -1, tb: -1, pa: -1, pb: -1, key1, key2 });
      }
      for (const d of b.drills) {
        this.drillIdx.set(d, this.ticks.length);
        this.ticks.push([0, 0]);
      }
    });
    this.emitBayStarted();
  }

  get currentBay(): BayDef {
    return this.def.bays[this.bay]!;
  }

  /** Lead of the current bay. */
  get lead(): PlayerIdx {
    return leadOf(this.bay);
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
      if (g.def.kind !== 'mains' || g.def.group !== group) continue;
      if (!on) this.setOpen(g, true);
      else if (!this.bothInside(this.exitAirlockOf(g.bay))) this.setOpen(g, false);
    }
  }

  setFlag(flag: string): void {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    this.flagBay.set(flag, this.bay);
    this.events.push({ t: 'flagSet', flag });
  }

  /** A flag set globally or by either player. */
  hasFlag(flag: string): boolean {
    return this.flags.has(flag) || this.flags.has(`${flag}@1`) || this.flags.has(`${flag}@2`);
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
            const flag = d.perPlayer ? (p === 0 ? g.key1 : g.key2) : d.flag;
            if (!this.flags.has(flag)) {
              this.flags.add(flag);
              this.flagBay.set(flag, g.bay);
              this.events.push({ t: 'flagSet', flag });
            }
            this.setOpen(g, true);
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
    this.emitBayStarted();
  }

  /**
   * Restart the current bay (both players downed for RESTART_DELAY does it on its own): its gates and the flags set in
   * it reset, its exit airlock reopens; drills already ticked stay ticked (D36). Returns the squad slot ids to respawn;
   * the players respawn at `checkpoint`.
   */
  restart(): string[] {
    const bi = this.bay;
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      if (g.bay !== bi) continue;
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
    for (const [flag, b] of this.flagBay) {
      if (b !== bi) continue;
      this.flags.delete(flag);
      this.flagBay.delete(flag);
    }
    const a = this.airById.get(this.currentBay.exit);
    if (a && a.phase !== 'sealed') {
      a.phase = 'open';
      a.t = 0;
    }
    this.downT = 0;
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
      if (g.def.kind !== 'timedHold' || g.holders !== 0 || g.t <= 0) continue;
      g.t -= dt;
      if (g.t <= 1e-9) {
        g.t = 0;
        this.setOpen(g, false);
      }
    }
    const a = this.airById.get(this.currentBay.exit);
    if (a && a.phase !== 'sealed') this.stepAirlock(a, dt);
    // the exit zone (G138): both players in it ends the course (the "Finish" device is the fallback without a zone)
    if (this.def.exitZone && this.currentBay.exit === 'end' && this.finishRefusal() === null) this.finish();
    const bothDown = this.solo ? this.downed[0] || this.downed[1] : this.downed[0] && this.downed[1];
    if (bothDown) {
      this.downT += dt;
      if (this.downT >= RESTART_DELAY - 1e-9) this.restart();
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
    for (let i = 0; i < this.gates.length; i++) {
      const g = this.gates[i]!;
      const doors = g.doors;
      for (let j = 0; j < doors.length; j++) if (doors[j] === doorId && !this.gateOpen(g)) return true;
    }
    return false;
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
    const lead = leadOf(bayIdx);
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
    const lead = leadOf(bayIdx);
    return d.who === 'lead' ? p === lead : p !== lead;
  }

  /** Player `p`'s part of the drill is still open. */
  drillOpenFor(d: DrillDef, p: PlayerIdx, bayIdx = this.bay): boolean {
    const n = this.ticks[this.drillIdx.get(d)!]!;
    const c = d.count ?? 1;
    const lead = leadOf(bayIdx);
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
    }
    return t;
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
  }

  // ---- internals ----

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
    const win = (g.def.window ?? PAIR_WINDOW) + 1e-9;
    if (isA) {
      g.ta = this.clock;
      g.pa = p;
    } else {
      g.tb = this.clock;
      g.pb = p;
    }
    const other = isA ? g.tb : g.ta;
    if (other < 0) return REFUSE_PAIR;
    // two different players, unless the dev solo flag lets one work both halves (A6)
    if (!this.solo && (isA ? g.pb : g.pa) === p) return REFUSE_PAIR;
    if (this.clock - other <= win) {
      if (g.def.flag !== undefined && !this.flags.has(g.def.flag)) {
        this.flags.add(g.def.flag);
        this.flagBay.set(g.def.flag, g.bay);
        this.events.push({ t: 'flagSet', flag: g.def.flag });
      }
      this.setOpen(g, true);
      return null;
    }
    if (isA) g.tb = -1;
    else g.ta = -1;
    return REFUSE_PAIR;
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
      this.emitBayStarted();
    }
  }
}
