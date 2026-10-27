/**
 * (mission-framework EN2) Sector Ops wiring: a MissionDef bound to `SectorMode` (PLAN section 3). Host / solo only (the
 * mode runs there); a co-op client gets the state as `ms` in the `sector` message (`packMission`, NET slice).
 *
 * - Lifecycle: a section's begin snapshots the runner and resets the rule tracker (`begin`); the host tick (`tick`) feeds
 *   the tracker (detections, team ghost), polls the flags Sector Ops already keeps (codes, keypads, pair gates, bolts),
 *   runs the runner, raises step events and checks the rules. Steps read these flags: a code flag the team holds
 *   (`SectorCodes`), `<section>-obj` (the section's own objective used), `<section>-key<k>` (keypad k opened),
 *   `<section>-gate<k>` (pair gate k open), `<section>-bolt<k>` (team door k unbolted); an interrogate step reads the
 *   `intel` event's `eid` (guard ids `sectorGuardId`: `<section>:<k>`, k the index in `SectorDef.guards`).
 * - Exit gate (PLAN section 2): in a mission section the sector objective no longer opens the exit (`gate`); the exit
 *   opens once every required step of the section but the extraction is done. The extraction is SectorRun's extract
 *   phase, or (the mission's last section is not the run's last) everyone in the section's connector (it cycles).
 *   A download objective opens its exit itself (SectorRun's download), so it is not gated: author it as the section's
 *   last step.
 * - A rule break: the radio line and a RULE BROKEN banner, then after RULE_HOLD s `restartSection` (a team rule in Sector
 *   Ops with 2+ players: that team's mission state only, `tracker.restartTeam`; the world restarts whole, see
 *   `restarted`). (mission-rules R1) No break ends the mission (G290): only the extraction sets `over`.
 * - Spook (A11): a decoy's read despawns the real target and respawns him unalerted at `bolt` with his info; he stays
 *   spooked across a restart (`MissionRunner.spookStep` is outside the snapshot; the tick bolts the respawned target
 *   again). With the named-target rule the decoy read also breaks it. (mission-rules R1, A18) The step's spook fact
 *   (`spookFact`, kept on restore) is set while he is spooked, so its `boltText` names his new place on host and client.
 * - (mission-rules R1) Protected targets (A1: an open interrogate step's target until his step is done, G145 / G353):
 *   killed before he talked on a step a named-target rule covers, that rule breaks and he moves, as after a decoy read
 *   (the Three Grey Coats page Michael signed: "killing Teale before he talks, breaks it", "He moves"); knocked out (or
 *   killed on a step no rule covers), the section restarts from its checkpoint with a SECTION RESTART banner and
 *   `PROTECTED_LINE`, not a rule break, and he is not moved (A2 / A3, Michael ~20:25 "Restart the section
 *   (Recommended)", BRIEF M6).
 * - Per-area alarm stages (beside SectorRun's one site stage, untouched): a camera / laser stage rise counts for the
 *   tracks whose boxes (and height band) hold the device, a guard's alarm for both; `onAlarm` hears every rise.
 * - (EN4, A23) `MissionDef.start`: the run begins at that section (`applyMissionStart`, before the mode starts; the
 *   start slot points follow, `missionStartSector`). `MissionDef.guards`: only the listed guards spawn (`spawns`).
 * No allocation per tick: flags, states and stages sit in arrays sized at construction.
 */
import type { Enemy, PlayerRef } from '../../ai/enemy';
import { flags } from '../../core/flags';
import type { GameEvents } from '../gameEvents';
import type { GameState } from '../gameState';
import type { SectorMode } from '../modes/sectorMode';
import { SECTOR, type SectorDef, type SectorPhase, type SectorRun } from '../sectors';
import { missionSpawnsGuard, spookFact, teamForSlot, type MissionDef, type MissionEvent, type TeamId } from './missionDef';
import { INTERROGATE_DECOY, MissionRunner } from './missionRunner';
import { RULE_HOLD, RULE_RESTART, RuleTracker, TEAM_A_BIT, TEAM_B_BIT, TEAM_BOTH, type ZoneGuard } from './ruleTracker';
import { packMission, type MissionWire } from './missionWire';

/** A section guard's mission id: `<section id>:<index in SectorDef.guards>`. */
export function sectorGuardId(sectionId: string, k: number): string {
  return `${sectionId}:${k}`;
}

/** Every guard id of the sections (`checkMission`'s `guards`). */
export function sectorGuardIds(defs: readonly SectorDef[]): Set<string> {
  const out = new Set<string>();
  for (const d of defs) for (let k = 0; k < d.guards.length; k++) out.add(sectorGuardId(d.id, k));
  return out;
}

/** The guard ids with GuardInfo lines (`checkMission`'s `talkers`: only they can be interrogated). */
export function sectorGuardTalkers(defs: readonly SectorDef[]): Set<string> {
  const out = new Set<string>();
  for (const d of defs) for (let k = 0; k < d.guards.length; k++) if ((d.guards[k]!.info?.lines.length ?? 0) > 0) out.add(sectorGuardId(d.id, k));
  return out;
}

/** The section index and guard index of a guard id, null when it names none of `defs`. */
export function parseGuardId(defs: readonly SectorDef[], id: string | undefined): { sec: number; k: number } | null {
  if (!id) return null;
  const at = id.lastIndexOf(':');
  if (at <= 0) return null;
  const sec = defs.findIndex((d) => d.id === id.slice(0, at));
  const k = Number(id.slice(at + 1));
  if (sec < 0 || !Number.isInteger(k) || k < 0 || k >= defs[sec]!.guards.length) return null;
  return { sec, k };
}

/** `?mission=<id>` (`flags.mission`, shared with Infiltration's autostart; null: none). (FLG) Null while
 *  `flags.missions` is off (`?missions=1` turns it on): Sector Ops runs as master. */
export function missionParam(): string | null {
  return flags.missions ? flags.mission : null;
}

/**
 * (campaign-mode CM3, PLAN 3.4) The mission a match binds: a co-op match's `GameOptions.sectorMission` (the start's
 * `sm`; '' none), else the page's own `?mission=` (`missionParam()`, a URL boot). Null while `flags.missions` is off.
 */
export function boundMissionId(opts: { readonly sectorMission?: string }): string | null {
  if (!flags.missions) return null;
  return opts.sectorMission !== undefined ? opts.sectorMission || null : missionParam();
}

/** (FLG) False when `?autostart` names a mission map (`MapDef.needsMissions`) while `flags.missions` is off: the URL boot
 *  falls back to the menu, so Tallow Wharf never runs as plain Sector Ops. */
export function mapBootAllowed(map: { readonly needsMissions?: boolean }): boolean {
  return !map.needsMissions || flags.missions;
}

/** The map's mission named `id` (null: no id, or the map has none of that id). */
export function pickMission(missions: readonly MissionDef[] | undefined, id: string | null): MissionDef | null {
  if (!id || !missions) return null;
  return missions.find((m) => m.id === id) ?? null;
}

/**
 * (EN4, A23) The run section index the mission starts at: its `start` among the run's sections; no start (or one the run
 * does not have): 0, as before.
 */
export function missionStartIndex(def: MissionDef | null, defs: readonly SectorDef[]): number {
  if (!def?.start) return 0;
  return Math.max(0, defs.findIndex((d) => d.id === def.start));
}

/** (EN4) The section the run starts at with the map's `?mission=<id>` mission (`startSlotPoints`; none: section 0). */
export function missionStartSector(sectors: readonly SectorDef[] | undefined, missions: readonly MissionDef[] | undefined, id: string | null): SectorDef | undefined {
  if (!sectors) return undefined;
  return sectors[missionStartIndex(pickMission(missions, id), sectors)];
}

/**
 * (EN4, A23) The run begins at section `i` (before the mode starts): its index, and the checkpoint at that section's
 * `start` (and `start2`), as SectorRun's constructor does for section 0. The earlier sections are never loaded: their
 * objectives and connectors are skipped, their marks stay unrated.
 */
export function applyMissionStart(run: SectorRun, i: number): void {
  const s = run.defs[i];
  if (i <= 0 || !s || run.phase !== 'objective' || run.index !== 0) return;
  run.index = i;
  const cp = run.checkpoint;
  cp.x = s.start.x;
  cp.y = s.start.y;
  cp.z = s.start.z;
  cp.yaw = s.start.yaw;
  run.checkpoint2 = s.start2 ?? null;
}

/** A section guard as the adapter reads it (an `Enemy` fits it). */
export interface MissionGuard extends ZoneGuard {
  readonly id: string;
  readonly ko: boolean;
  /** Held by a player (grabbed, taken down, a hostage). */
  readonly taken: boolean;
}

/** What the adapter reads of and asks of the mode (`bindSectorMission` builds it over `SectorMode`; tests fake it). */
export interface SectorMissionHost {
  readonly defs: readonly SectorDef[];
  /** SectorRun's live section index and phase. */
  index(): number;
  phase(): SectorPhase;
  /** The live section's connector is cycling (every player inside it). */
  cycling(): boolean;
  /** Players in the match (1 solo). */
  players(): number;
  /** A player id's slot (A9: 'local' / '' the host, 0). */
  slotOf(id: string): number;
  /** The stealth tally (`g.style.detections`). */
  detections(): number;
  /** The live guards (team ghost). */
  guards(): readonly ZoneGuard[];
  /** The live section's guard `k` (null: not spawned, or gone). */
  slotGuard(k: number): MissionGuard | null;
  hasCode(flag: string): boolean;
  keypadOpen(sec: number, k: number): boolean;
  gateOpen(sec: number, k: number): boolean;
  boltOpen(sec: number, k: number): boolean;
  /** The team holds code `flag` again (after a team restart dropped the section's codes). */
  regrant(flag: string): void;
  /** Open the live section's exit (the mode's objective done). */
  openExit(): void;
  /** `SectorMode.restartSection(team)`. */
  restart(team?: 'a' | 'b'): void;
  /** The mission's extraction: the op ends, cleared. */
  finish(): void;
  /** A radio line (subtitle; co-op: to the client too). */
  say(line: string): void;
  banner(title: string, sub: string): void;
  /** Despawn the live section's guard `k` and spawn him unalerted at `at` with his info; the new guard (null: none). */
  bolt(k: number, at: readonly [number, number, number]): MissionGuard | null;
  /** Raise a Guard AI walk-to hook (gameEvents `missionEvent`). */
  emit(ev: MissionEvent): void;
}

const POLL_CODE = 0;
const POLL_KEY = 1;
const POLL_GATE = 2;
const POLL_BOLT = 3;

/** Seconds a mission event / rule restart waits after a rule break (the radio line first). */
export const MISSION_RESTART_HOLD = RULE_HOLD;
export const RULE_BROKEN_TITLE = 'RULE BROKEN';
/** (mission-rules R1, A3) The protected restart's banner: the section restarts, no rule broke. */
export const SECTION_RESTART_TITLE = 'SECTION RESTART';

export class SectorMission {
  readonly def: MissionDef;
  readonly runner: MissionRunner;
  readonly tracker: RuleTracker;
  /** Per-area alarm stages: [team A's track, team B's track] (0..SECTOR.alarmMax). */
  readonly stages = new Int32Array(2);
  /** A camera / laser / guard alarm raised a stage: `teams` the track bits it counted for (TEAM_A_BIT / TEAM_B_BIT). */
  onAlarm: ((teams: number, stageA: number, stageB: number, camera: boolean) => void) | null = null;
  /** The mission's clock (s). */
  now = 0;
  /** Rule restarts this adapter asked for (tests). */
  ruleRestarts = 0;
  /** The mission is over (extracted): the tick does nothing more. */
  over = false;
  /** (EN4, A23) The run section index the mission starts at (`missionStartIndex`). */
  readonly startIndex: number;

  private readonly host: SectorMissionHost;
  /** Run section index -> mission section index (-1: not the mission's). */
  private readonly secMap: Int32Array;
  /** Run section index -> its `<section>-obj` flag. */
  private readonly objFlag: string[];
  /** Run section index -> its guard ids by guard index. */
  private readonly guardIds: string[][];
  /** (EN4, A23) Run section index -> 1 per guard index the mission spawns (null: every guard; no guard list). */
  private readonly spawnMask: (Uint8Array | null)[];
  private readonly pollFlag: string[] = [];
  private readonly pollKind: number[] = [];
  private readonly pollSec: number[] = [];
  private readonly pollK: number[] = [];
  /** Code flags the runner reads (re-granted after a team restart). */
  private readonly codeFlags: string[] = [];
  private readonly extract: number;
  /** Per step: its target's run section and guard index (interrogate steps), else -1. */
  private readonly targetSec: Int32Array;
  private readonly targetK: Int32Array;
  /**
   * (mission-rules R1) Per step: 1 when it is an interrogate step with a target and a `namedTarget` rule covers it (the
   * rule names the step, or no step): his kill before he talks breaks that rule; else it is the protected restart.
   */
  private readonly targetRule: Uint8Array;
  /** (mission-rules R1, A18) Per step: its spook fact ('' when it has no bolt). */
  private readonly spookFlag: string[];
  /** Per step: done and its events raised. */
  private readonly walked: Uint8Array;
  private readonly stageStart = new Int32Array(2);
  private detSeen = 0;
  /** A rule restart waiting out its hold (-1 none). */
  private pendT = -1;
  private pendTeam: 'a' | 'b' | undefined = undefined;
  /** The restart running is this adapter's own (a rule's). */
  private own = false;
  /** The spooked target as last bolted (the tick bolts a respawned one again). */
  private bolted: MissionGuard | null = null;
  /** A device tripped this tick (`deviceAt`), read by `cameraAlarm` (NaN: none). */
  private devX = Number.NaN;
  private devY = Number.NaN;
  private devZ = Number.NaN;
  private readonly offs: (() => void)[] = [];

  constructor(def: MissionDef, host: SectorMissionHost) {
    this.def = def;
    this.host = host;
    // the player count is read every tick (the mode is built before the players are in)
    this.runner = new MissionRunner(def, 1);
    this.tracker = new RuleTracker(def, 1, this.runner);
    const defs = host.defs;
    this.secMap = Int32Array.from(defs.map((d) => def.sections.indexOf(d.id)));
    this.objFlag = defs.map((d) => `${d.id}-obj`);
    this.guardIds = defs.map((d) => d.guards.map((_, k) => sectorGuardId(d.id, k)));
    this.spawnMask = def.guards ? this.guardIds.map((ids) => Uint8Array.from(ids, (id) => (missionSpawnsGuard(def, id) ? 1 : 0))) : defs.map(() => null);
    this.startIndex = missionStartIndex(def, defs);
    const reads = new Set(this.runner.flags);
    const codes = new Set<string>();
    defs.forEach((d, sec) => {
      for (const p of d.keypads ?? []) codes.add(p.code);
      for (const n of d.intel ?? []) codes.add(n.grants);
      d.keypads?.forEach((_, k) => this.addPoll(reads, `${d.id}-key${k}`, POLL_KEY, sec, k));
      d.pairGates?.forEach((_, k) => this.addPoll(reads, `${d.id}-gate${k}`, POLL_GATE, sec, k));
      d.bolts?.forEach((_, k) => this.addPoll(reads, `${d.id}-bolt${k}`, POLL_BOLT, sec, k));
    });
    // (mission-rules R1, A18) the spook facts: set by `spook()`, never polled as a code, kept on restore
    this.spookFlag = def.steps.map((s) => (s.kind === 'interrogate' && s.bolt ? spookFact(s) : ''));
    // any flag the runner reads may be a code an interrogation gives (`onIntelCode`): every one is polled as a code too
    for (const f of this.runner.flags) {
      if (this.spookFlag.includes(f)) continue;
      this.addPoll(reads, f, POLL_CODE, -1, -1);
      if (codes.has(f)) this.codeFlags.push(f);
    }
    for (const f of this.spookFlag) if (f) this.runner.keepOnRestore(f);
    this.extract = def.steps.findIndex((s) => s.kind === 'extract');
    const n = def.steps.length;
    this.targetSec = new Int32Array(n).fill(-1);
    this.targetK = new Int32Array(n).fill(-1);
    this.targetRule = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const s = def.steps[i]!;
      if (s.kind !== 'interrogate') continue;
      const t = parseGuardId(defs, s.target);
      if (t) {
        this.targetSec[i] = t.sec;
        this.targetK[i] = t.k;
      }
      if (s.target && def.rules.some((r) => r.kind === 'namedTarget' && (r.step === undefined || r.step === s.id))) this.targetRule[i] = 1;
    }
    this.walked = new Uint8Array(n);
  }

  private addPoll(reads: ReadonlySet<string>, flag: string, kind: number, sec: number, k: number): void {
    if (!reads.has(flag)) return;
    this.pollFlag.push(flag);
    this.pollKind.push(kind);
    this.pollSec.push(sec);
    this.pollK.push(k);
  }

  /** Subscribe the event feeds (the alarm, a body found, a gadget used, an interrogation's intel). */
  listen(events: { on<K extends keyof GameEvents>(type: K, fn: (p: GameEvents[K]) => void): () => void }, local: () => number): void {
    this.offs.push(
      events.on('alarm', () => this.guardAlarm()),
      events.on('bodyFound', (e) => this.bodyFound(e.x, e.z)),
      events.on('gadget', (e) => {
        if (e.phase === 'throw' || e.phase === 'place') this.gadget(local());
      }),
      events.on('intel', (e) => this.intel(e.eid, e.by)),
    );
  }

  /** The mission's mission section index for the run's live section (-1: not the mission's). */
  private liveSection(): number {
    return this.secMap[this.host.index()] ?? -1;
  }

  /** The extraction is done (the op ends cleared). */
  get finished(): boolean {
    return this.runner.finished;
  }

  /**
   * (fix round) A rule restart (or the protected restart) is waiting out its hold: the mode holds its exits (a connector
   * or the extraction finished inside the hold would forgive the broken rule).
   */
  get holding(): boolean {
    return this.pendT >= 0;
  }

  /** (EN4, A23) The run section `sec`'s guard `k` spawns with this mission (`loadSection`). */
  spawns(sec: number, k: number): boolean {
    const m = this.spawnMask[sec];
    return !m || m[k] === 1;
  }

  /** (EN4, A9) The objective list's viewer on this machine (host / solo: slot 0; solo carries both teams). No allocation. */
  viewer(): TeamId {
    return teamForSlot(0, this.runner.players, this.def.mode);
  }

  // ---- hooks from SectorMode ----

  /** A section begins (`beginSection`): a new one is snapshot; a restart's begin keeps the state `restarted` restored. */
  begin(index: number): void {
    if (this.over) return;
    const n = Math.max(1, this.host.players());
    this.runner.players = n;
    this.tracker.players = n;
    const si = this.secMap[index] ?? -1;
    if (si === this.runner.section) return;
    this.runner.snapshot(si, this.now);
    this.tracker.resetSection(this.now, false);
    this.stageStart.set(this.stages);
    this.bolted = null;
    this.syncWalked();
    this.detSeen = this.host.detections();
  }

  /**
   * The section restarted (`SectorMode.restartSection`, before its begin). The world (guards, doors, codes, devices,
   * players) restarted whole; the mission state goes back for `team` only when this adapter's team rule asked for it
   * (M1), else for everyone. (mission-rules R1) A restart this adapter did not ask for (everyone down, the pause menu)
   * only restores the state (the pending team's, if a team restart waits); it never ends the mission (G290).
   */
  restarted(team?: 'a' | 'b'): void {
    if (this.over) return;
    const own = this.own;
    // (fix round) a restart that lands on a pending team restart is that team's (everyone down meanwhile, the pause menu)
    const pending = this.pendT >= 0 ? this.pendTeam : undefined;
    this.pendT = -1;
    if (!own) team = pending;
    const si = this.liveSection();
    if (si >= 0) this.runner.restore(si, this.now, team);
    const teams = team !== undefined && this.def.mode === 'sector' && this.runner.players > 1;
    this.tracker.resetSection(this.now, true, team);
    if (!teams) this.stages.set(this.stageStart);
    else this.stages[team === 'a' ? 0 : 1] = this.stageStart[team === 'a' ? 0 : 1]!;
    // the world restart dropped the section's codes: the facts the other team keeps are held again
    if (teams) for (let i = 0; i < this.codeFlags.length; i++) if (this.runner.hasFlag(this.codeFlags[i]!)) this.host.regrant(this.codeFlags[i]!);
    this.bolted = null;
    this.syncWalked();
    this.detSeen = this.host.detections();
  }

  /**
   * The mode's objective is done (`objectiveDone`): true holds it (the section's steps are not done yet). Sets
   * `<section>-obj` first. A download that already opened its exit is not held.
   */
  gate(): boolean {
    if (this.over) return false;
    const si = this.liveSection();
    if (si < 0 || si !== this.runner.section) return false;
    this.runner.setFlag(this.objFlag[this.host.index()]!);
    this.runner.update(this.now);
    if (this.host.phase() !== 'objective') return false;
    return !this.runner.sectionDone(si);
  }

  /** A CT device is tripped at (x, y, z) (`alertAt`, before its stage rises; y NaN: unknown). */
  deviceAt(x: number, y: number, z: number): void {
    this.devX = x;
    this.devY = y;
    this.devZ = z;
  }

  /** A camera alarm / laser break (`cameraAlarm`); `rose`: the site stage went up (No alarms breaks too). */
  cameraAlarm(rose: boolean): void {
    const x = this.devX;
    const y = this.devY;
    const z = this.devZ;
    this.devX = this.devY = this.devZ = Number.NaN;
    if (this.over) return;
    this.tracker.onCameraAlarm(x, z, y);
    if (!rose) return;
    this.tracker.onAlarm(x, z, y);
    this.areaAlarm(this.tracker.teamsAt(x, z, y), true);
  }

  /** A guard's alarm (the `alarm` event: a panel or a command call; no position: both tracks). */
  guardAlarm(): void {
    if (this.over) return;
    this.tracker.onAlarm(Number.NaN, Number.NaN);
    this.areaAlarm(TEAM_BOTH, false);
  }

  /** A guard found a body at (x, z). */
  bodyFound(x: number, z: number): void {
    if (!this.over) this.tracker.onBodyFound(x, z);
  }

  /** A kill or knock-out (`onEnemyKilled`) by `attackerId` ('local' / '' the host). */
  kill(ko: boolean, attackerId: string): void {
    if (!this.over) this.tracker.onKill(this.host.slotOf(attackerId), ko);
  }

  /** A gadget used by the player in `slot` (the local `gadget` event; `onRemoteGadget` by id via `remoteGadget`). */
  gadget(slot: number): void {
    if (!this.over) this.tracker.onGadget(slot);
  }

  /** Co-op host: a client's gadget took effect. */
  remoteGadget(id: string): void {
    this.gadget(this.host.slotOf(id));
  }

  /**
   * An interrogation's `intel` event (`eid`: the guard's Enemy id; `by`: the asker's player id, none the host): the
   * target's step is done; a decoy spooks him and breaks a named-target rule for the asker's team (A9).
   */
  intel(eid: string | undefined, by?: string): void {
    if (!eid || this.over) return;
    const ri = this.host.index();
    const ids = this.guardIds[ri];
    if (!ids) return;
    let k = -1;
    for (let i = 0; i < ids.length && k < 0; i++) if (this.host.slotGuard(i)?.id === eid) k = i;
    if (k < 0) return;
    if (this.runner.interrogated(ids[k]!) !== INTERROGATE_DECOY) return;
    const st = this.runner.spookStep;
    this.tracker.onInterrogate(this.host.slotOf(by ?? 'local'), true, st);
    this.spook();
  }

  /** The op's extraction (`complete`): the extraction step is done. */
  extracted(): void {
    if (this.extract >= 0) this.runner.complete(this.extract);
    this.over = true;
  }

  /** The host tick (`fixedUpdate`, outside the op's end). No allocation. */
  tick(dt: number): void {
    if (this.over) return;
    this.now += dt;
    const n = Math.max(1, this.host.players());
    this.runner.players = n;
    this.tracker.players = n;
    if (this.pendT >= 0) {
      this.pendT -= dt;
      if (this.pendT < 0) {
        this.ruleRestarts++;
        this.own = true;
        this.host.restart(this.pendTeam);
        this.own = false;
      }
      this.devX = this.devY = this.devZ = Number.NaN;
      return;
    }
    const det = this.host.detections();
    if (det > this.detSeen) this.tracker.onDetections(det - this.detSeen);
    this.detSeen = det;
    this.tracker.scanGuards(this.host.guards());
    this.poll();
    this.runner.update(this.now);
    this.stepEvents();
    this.spook();
    const si = this.runner.section;
    if (si >= 0 && si === this.liveSection()) {
      const ph = this.host.phase();
      if (ph === 'objective' && this.runner.sectionDone(si)) this.host.openExit();
      else if (ph === 'connector' && this.extract >= 0 && this.runner.isOpen(this.extract) && this.host.cycling()) {
        // the mission's last section is not the run's last: everyone in its connector is the extraction
        this.runner.complete(this.extract);
        this.stepEvents();
        this.over = true;
        this.host.finish();
        return;
      }
    }
    this.protectedCheck();
    if (this.tracker.update(this.now) === RULE_RESTART) this.broke();
    this.devX = this.devY = this.devZ = Number.NaN;
  }

  /** The wire's `ms` (every sector send; allocates, like the rest of the extra). */
  wire(): MissionWire {
    return packMission(this.runner, this.tracker);
  }

  /** Test view. */
  debug(): Record<string, unknown> {
    return {
      id: this.def.id,
      section: this.runner.section,
      done: this.runner.doneBits,
      facts: this.runner.factBits,
      breaks: this.tracker.breaks,
      protectedRestarts: this.tracker.protectedBreaks,
      line: this.tracker.line,
      ruleRestarts: this.ruleRestarts,
      pending: this.pendT >= 0,
      spook: this.runner.spookStep,
      stages: [this.stages[0], this.stages[1]],
      finished: this.runner.finished,
      over: this.over,
    };
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.offs.length = 0;
    this.onAlarm = null;
    const w = globalThis as { __mission?: SectorMission };
    if (w.__mission === this) delete w.__mission;
  }

  // ---- internals ----

  /** A rule broke (RULE BROKEN) or the protected restart fired (SECTION RESTART, `lastRule` -1): the line, then the hold. */
  private broke(): void {
    const line = this.tracker.line;
    this.host.say(line);
    this.host.banner(this.tracker.lastRule < 0 ? SECTION_RESTART_TITLE : RULE_BROKEN_TITLE, line);
    this.pendT = MISSION_RESTART_HOLD;
    this.pendTeam = this.tracker.restartTeam;
  }

  /**
   * (mission-rules R1) The protected check, every tick after the spook and the exit, before the rules: an interrogate
   * step not yet done whose target (in the live section) is down. Killed on a step a named-target rule covers: that rule
   * is hit (the page Michael signed) and he will bolt after the restart (`spookStep`); while its scope is held the check
   * runs again next tick. Knocked out, or killed on a step no rule covers: the protected restart (A2 / A3, BRIEF M6),
   * which never sets or clears `spookStep`. No allocation.
   */
  private protectedCheck(): void {
    const ri = this.host.index();
    for (let i = 0; i < this.targetK.length; i++) {
      const k = this.targetK[i]!;
      if (k < 0 || this.targetSec[i] !== ri || this.runner.isDone(i)) continue;
      const e = this.host.slotGuard(k);
      if (!e) continue;
      // a knock-out is `!alive` too (`Enemy.knockOut` sets `ko`, then drains hp to 0), so a kill is `!alive && !ko`
      if (!e.alive && !e.ko && this.targetRule[i] === 1) {
        if (this.tracker.onTargetKilled(i)) {
          this.runner.spookStep = i;
          // the spook fact at once, as after a decoy read (he is dead, so nothing bolts until the restart respawns him)
          this.spook();
        }
        return;
      }
      if (!e.alive || e.ko) {
        this.tracker.onProtected();
        return;
      }
    }
  }

  private areaAlarm(teams: number, camera: boolean): void {
    if (teams & TEAM_A_BIT) this.stages[0] = Math.min(SECTOR.alarmMax, this.stages[0]! + 1);
    if (teams & TEAM_B_BIT) this.stages[1] = Math.min(SECTOR.alarmMax, this.stages[1]! + 1);
    this.onAlarm?.(teams, this.stages[0]!, this.stages[1]!, camera);
  }

  private poll(): void {
    const h = this.host;
    for (let i = 0; i < this.pollFlag.length; i++) {
      const f = this.pollFlag[i]!;
      if (this.runner.hasFlag(f)) continue;
      const kind = this.pollKind[i]!;
      const sec = this.pollSec[i]!;
      const k = this.pollK[i]!;
      const on = kind === POLL_CODE ? h.hasCode(f) : kind === POLL_KEY ? h.keypadOpen(sec, k) : kind === POLL_GATE ? h.gateOpen(sec, k) : h.boltOpen(sec, k);
      if (on) this.runner.setFlag(f);
    }
  }

  /** Steps newly done raise their Guard AI events (once; again after a restart takes the step back). */
  private stepEvents(): void {
    const steps = this.def.steps;
    for (let i = 0; i < steps.length; i++) {
      if (!this.runner.isDone(i)) {
        this.walked[i] = 0;
        continue;
      }
      if (this.walked[i] === 1) continue;
      this.walked[i] = 1;
      const evs = steps[i]!.events;
      if (evs) for (let k = 0; k < evs.length; k++) this.host.emit(evs[k]!);
    }
  }

  /** After a restore or a snapshot: the steps done now count as raised (a restart does not raise them again). */
  private syncWalked(): void {
    for (let i = 0; i < this.walked.length; i++) this.walked[i] = this.runner.isDone(i) ? 1 : 0;
  }

  /**
   * While a target is spooked: his step's spook fact is held (mission-rules R1, A18: set once, kept on restore), and while
   * his section is live a target not at his bolt point (spawned again) is bolted.
   */
  private spook(): void {
    const st = this.runner.spookStep;
    if (st < 0) return;
    const f = this.spookFlag[st];
    if (f) this.runner.setFlag(f);
    const k = this.targetK[st]!;
    if (k < 0 || this.targetSec[st] !== this.host.index()) return;
    const e = this.host.slotGuard(k);
    // (fix round) never while a player holds him (a grab, a takedown, a hostage): he bolts once let go
    if (!e || e === this.bolted || !e.alive || e.ko || e.taken) return;
    const at = this.def.steps[st]!.bolt;
    if (at) this.bolted = this.host.bolt(k, at);
  }
}

/**
 * Bind the match's mission to the mode (`boundMissionId`: the co-op start's, else the map's `?mission=<id>`; null: none
 * picked: Sector Ops runs as before). `slotEnemy` is the mode's live guard per index (the spook writes the bolted guard
 * back); `openExit` / `finish` the mode's objective done and op end.
 */
export function bindSectorMission(g: GameState, mode: SectorMode, slotEnemy: (Enemy | null)[], openExit: (s: SectorDef) => void, finish: () => void): SectorMission | null {
  const def = pickMission(g.world.map.missions, boundMissionId(g.opts));
  if (!def) return null;
  const refs: PlayerRef[] = [];
  const none: readonly Enemy[] = [];
  const run = mode.run;
  const host: SectorMissionHost = {
    defs: run.defs,
    index: () => run.index,
    phase: () => run.phase,
    cycling: () => run.conn.state === 'cycling',
    players: () => g.playerRefsInto(refs).length,
    slotOf: (id) => {
      if (id === 'local' || id === '') return 0;
      const rs = g.playerRefsInto(refs);
      for (let i = 0; i < rs.length; i++) if (rs[i]!.id === id) return i;
      return 1;
    },
    detections: () => g.style.detections,
    guards: () => g.enemyMgr?.enemies ?? none,
    slotGuard: (k) => slotEnemy[k] ?? null,
    hasCode: (f) => mode.codes.has(f),
    keypadOpen: (sec, k) => mode.codes.open[sec]?.[k] === true,
    gateOpen: (sec, k) => mode.team.gates.isOpen(sec, k),
    boltOpen: (sec, k) => mode.team.bolts.shut[sec]?.[k] === false,
    regrant: (f) => mode.onIntelCode(f),
    openExit: () => {
      const s = run.current;
      if (s) openExit(s);
    },
    restart: (team) => mode.restartSection(team),
    finish,
    say: (line) => {
      g.hud.barks.say('lantern', line, true);
      g.net?.radioLine?.(line);
    },
    banner: (title, sub) => g.hud.banner(title, sub, 2200),
    bolt: (k, at) => {
      const em = g.enemyMgr;
      const ri = run.index;
      const sec = run.defs[ri];
      const slot = sec?.guards[k];
      const e = slotEnemy[k];
      if (!em || !sec || !slot || !e) return null;
      const info = e.info;
      const p = e.pos.clone();
      p.set(at[0], at[1], at[2]);
      em.despawn(e);
      const b = em.spawn(slot.kind, p, false, slot.yaw, em.lookOfSlot(sec.id, k));
      slotEnemy[k] = b;
      if (!b) return null;
      b.info = info;
      // he stands at the bolt point (no route, no post to walk back to), his tags as before
      em.placeSlot(b, { ...slot, x: at[0], z: at[2], route: undefined, post: undefined }, ri, sec.guards, k, sec.gear);
      return b;
    },
    emit: (ev) => g.events.emit('missionEvent', ev.via === undefined ? { name: ev.name, guardTag: ev.guardTag, postId: ev.postId } : { name: ev.name, guardTag: ev.guardTag, postId: ev.postId, via: ev.via }),
  };
  const m = new SectorMission(def, host);
  m.listen(g.events, () => 0);
  (globalThis as { __mission?: SectorMission }).__mission = m;
  return m;
}
