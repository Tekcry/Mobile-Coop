import { Vector3, type Scene } from '../core/babylon';
import type { World } from '../world/world';
import type { DamageRegistry, HitInfo } from '../game/damage';
import type { Ballistics } from '../weapons/ballistics';
import type { Vfx } from '../vfx/vfx';
import type { NavGrid } from './navGrid';
import { Enemy, type AiContext, type PlayerRef } from './enemy';
import { ENEMIES, type EnemyKind } from './enemyDefs';
import { BUDGET, G, MASK } from '../physics/groups';
import type { CharacterRig } from '../player/characterRig';
import type { Grenades } from '../weapons/grenades';
import { GRAVITY } from '../physics/havok';
import { Body } from './body';
import { BODY } from './bodies';
import type { LightDef, Occluder } from '../world/lights';
import { rayOccluder, shadowAccuracyOn } from '../world/shadowAccuracy';
import { beamReach, type BeamHit } from '../world/torches';
import { ALARM_CALL, CommandCall, nearestPanel, type AlarmPanel } from './alarm';
import { hyp2, hyp3 } from '../core/mathx';
import { ARCHETYPE, type DifficultyDef } from './archetypes';
import { ALERT } from './alertState';
import { ReconDrone } from './reconDrone';
import { HEARING, ambientDb, effectiveReach, hearTier, wallMatters, WALL_FACTOR, type HearTier, type NoisySource } from './hearing';
import { MUFFLE } from '../config/noise';
import { CMD_ACK, CMD_SEND, GuardView, GV_BUSY, GV_DOWN, GV_HELD, GV_MELEE, GV_OFFICER, GV_POSTED, INCIDENT, IncidentBoard, LEVEL, lightInView, MODE_COVER, MODE_INVESTIGATE, MODE_LEAD, MODE_LIGHT, type IncidentKind, type PathLen } from './incidents';
import { EYE_STAND, PERCEPTION } from './perception';
import { roomAt, type RoomRect, type SquadSlot } from '../world/rooms';
import { reportGuardAi, sectionAt, squadId, validateGuardAi, type GuardSlotTags, type ReinforceEntry } from './guardAiData';
// (guard-ai S5b) the sector tags
import { alarmRunMul, callerRank, isSecureZone, ROLE_DESK, roleFlags, slotSquads, TAGS, zoneRadius } from './sectorTags';
import { CALL_KIND, callHold, hearsVoice, RADIO, RadioNet, type CallKind, type RadioSink } from './radioNet';
import type { P2 } from './navGrid';
// (guard-ai S7) cameras see bodies
import { MODE_BODY } from './incidents';
import { camBodyLine, type BarkEvent } from './barks';
import type { CameraBodyEvent } from '../security/securitySystem';
import { Awareness, CAUTION, MAX_KEYS } from './awareness';
import { bodyNoticed, bodyNoticeRange } from './bodies';
import { CoverGrid, coverSetFrom, type CoverSet } from './coverGrid';
import { gearFromTag, mergeGear, RESPONSE, stageGear, type GearTag, type GuardGear } from './gear';
import { SweepTeam } from './sweepTeam';
import { HelmetDrops } from './helmetDrops';
// (guard-ai S15) breaker faults and late discovery
import { MODE_BREAKER } from './incidents';
import { BREAKER, LATE } from './gear';
import { CIRCUIT_KEY, DARK_SHOT, DarkList, LATE_SCAN, type BreakerHost } from './breaker';
import { assignRoles, combatSeed, P_AGGRESSIVE, P_POST, P_STANDARD, R_NONE, R_REPORTER, RoleInput, RoleOutput, SQUAD } from './squadRoles';
// (guard-ai S10) talking pairs
import { PairMeet, PAIRS, pickMeet, type MeetPick, type PairGuard } from './pairs';
// (guard-ai S14) section alert: missed check-ins and loud shots
import { MISSING, SHOTS } from './gear';
// (guard-ai S17, Michael's walk of 4.72 G1) a tripped device is an incident at the device, never the player
import { DEVICE } from './gear';
import { MODE_DEVICE } from './incidents';
// (guard-ai S19, walk 4.72 G3) guards hurry to a dead body the radio reported
import { MODE_HELP } from './incidents';
import { URGENT } from './gear';
import { urgentKind } from './response';
import { ALERT_MISSING, ALERT_SHOTS, AlertCallLog, SectionCounters, unitOf, type SectionCounts } from './sectionAlert';
// (guard-ai S20) doors on the walker's way
import { DoorGate } from './doorGate';
// (guard-ai S22, G6) security consoles switched off: noticed when seen, turned back on (the breaker walk)
import { CONSOLE_FAULT, CONSOLE_GROUP, ConsoleFaults, consoleInView, isConsoleGroup, V_TAMPER, type ConsoleHost } from './consoleFault';
// (guard-ai S24, G139) one last known position per intruder
import { INTRUDERS, IntruderBoard } from './intruders';
import { MAX_INTRUDERS } from './targetPick';

/** (guard-ai S10) A talking pair: its meeting clock, and the two slot indices (`guardAtSlot`; A the lower). */
export interface TalkPair {
  readonly pm: PairMeet;
  readonly sa: number;
  readonly sb: number;
}

// Live guard cap. 12 = the Dead Line co-op peak of 10 chapter-active guards (furthest-behind and furthest-ahead
// player, each with their next chapter) plus the two alarm reinforcements; about 2.6 ms main thread (D1 guard cost).
export const MAX_ALIVE = 12;
/** (sector-redesign) Uncoordinated lights-out: the guard sent stands on the light's floor - his feet not above the
 *  fixture height `y` (a lamp, or a wall switch + 2.5) and at most this many m below it. */
export const LIGHTS_OUT_BELOW = 7;

/** (guard-ai S3, S6) A completed `command` call ("Command, contact. Send backup.") raises the alarm like a panel (M4).
 *  On since S6: a contact call that gets through starts one (`contactThrough`). Undo: false (panels only). */
export const RADIO_ALARM = true;

/** (guard-ai S4) The bit of guard key `k` in an awareness mask (0 when out of range). */
function keyBit(k: number): number {
  return k >= 0 && k < MAX_KEYS ? (1 << k) >>> 0 : 0;
}

/** (guard-ai S3) The radio net's tick (s): 10 Hz. */
const RADIO_TICK = 0.1;

/** (guard-ai S8, design 8) Squad tactics: roles tick (s, 2 Hz), smallest group that works together (a lone guard keeps
 *  today's tactics), how long a cover is skipped after its view ray or its path failed (s), and the overwatch view
 *  checks per tick (design: max 4 candidates). */
export const TACTICS = {
  tick: 0.5,
  minGroup: 2,
  blockS: 5,
  viewChecks: 4,
} as const;

/** (guard-ai S24) An intruder's chase field is rebuilt when his last known position moved this far (m, one nav cell)
 *  or the nav grid changed, and (a move) at most once per `FLOW_MIN` s; one rebuild per `update` at most. */
const FLOW_CELL = 0.5;
const FLOW_MIN = 0.5;

/** Owns enemies, the shared chase flow field, cover reservations, bodies (ragdolls), alarms and flashlights. */
export class EnemyManager {
  readonly enemies: Enemy[] = [];
  /** The live guard cap (M6: per mode). `MAX_ALIVE` everywhere but Sector Ops, which sets `SECTOR.maxAlive`. */
  maxAlive = MAX_ALIVE;
  private flowField: Float32Array;
  private flowT = 0;
  /** The nav grid's `version` the flow field was built under. */
  private flowVer = -1;
  private coverOwner = new Map<number, Enemy>();
  private ctx: AiContext;
  onKilled: ((e: Enemy, h: HitInfo) => void) | null = null;
  /** Audio hooks. */
  onEnemyShot: ((e: Enemy, from: Vector3, to: Vector3) => void) | null = null;
  onEnemyMelee: ((e: Enemy) => void) | null = null;
  onEnemyWindup: ((e: Enemy) => void) | null = null;
  kills = 0;
  /** Grenade system enemies throw with (set by the game state). */
  grenades: Grenades | null = null;
  /** Enemy assigned to flank a player holding cover (one at a time). */
  flanker: Enemy | null = null;
  private grenadeT = 0;
  /** Grenades thrown (tests / debug). */
  grenadesThrown = 0;
  /**
   * Stealth rules (Clear, Mission): enemies know where a player is only from sight, sound and each other,
   * chase the shared last known position and search it. Off (Wave): they are sent at the players.
   */
  stealth = false;
  /** Shared last known position of the players (the latest sighting / located noise). (guard-ai S24) The mirror of the
   *  freshest intruder (`intruders.freshest`), written after every report and forget: solo reads it as before; the
   *  guards read their own intruder's (`lkpOf`). */
  readonly lkp = new Vector3();
  private readonly earA = new Vector3();
  private readonly earB = new Vector3();
  lkpValid = false;
  /** Seconds since an alerted enemy last had a player in sight. (guard-ai S24) The freshest intruder's (mirrored). */
  sightT = 99;
  /** (guard-ai S24, A146) One last known position per intruder (player id -> slot); each guard hunts one (`Enemy.hunt`). */
  readonly intruders = new IntruderBoard();
  /** (guard-ai S24) `lkpOf`'s reused vector per slot. */
  private readonly lkpSlot: Vector3[] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  /** (guard-ai S24) Each intruder's chase field (made the first time his slot is valid), the position, nav version and
   *  clock it was built under, the round robin, and the goal scratch (filled in place). */
  private readonly slotFlow: (Float32Array | null)[] = [null, null, null, null];
  private readonly slotFlowX = new Float32Array(MAX_INTRUDERS);
  private readonly slotFlowY = new Float32Array(MAX_INTRUDERS);
  private readonly slotFlowZ = new Float32Array(MAX_INTRUDERS);
  private readonly slotFlowVer = new Int32Array(MAX_INTRUDERS).fill(-1);
  private readonly slotFlowT = new Float32Array(MAX_INTRUDERS);
  private slotFlowRR = 0;
  /** (guard-ai S24) Stealth: the all-players field has been blanked (`refreshFlow`). */
  private flowBlank = false;
  private readonly flowGoal: [number, number][] = [[0, 0]];
  private readonly flowGoalY = [0];
  /** (guard-ai S24) The intruder of the guard who raised the alarm: the reinforcements hunt him. */
  private alarmHunt = -1;
  /** (guard-ai S24 fix) The intruder the last contact call that got through named (-1 none since the clear / alarm
   *  reset): an alarm raised by a guard with no intruder sends its reinforcements after him. */
  private contactHunt = -1;
  /** Radio range for a detection call (m): the parked modes' call (`callAlert`) and body-found search. (guard-ai S3,
   *  S4) The live modes' contact and body calls reach the whole section (`radioNet`), not a circle. */
  static readonly RADIO = 22;
  /** Downed enemies lying in the world (findable, carriable). */
  readonly bodies: Body[] = [];
  /** A body was found by an enemy (audio / HUD / stats). */
  onBodyFound: ((e: Enemy, b: Body) => void) | null = null;
  /** A body appeared (GameState makes it carriable) or went for good. */
  onBodyAdded: ((b: Body) => void) | null = null;
  onBodyRemoved: ((b: Body) => void) | null = null;
  /** A knocked-out enemy was revived (modes count it back in). */
  onRevived: ((e: Enemy, b: Body) => void) | null = null;
  bodiesFound = 0;
  /** Alarm panels on the map; raised once per match (reinforcements). */
  readonly alarms: AlarmPanel[] = [];
  alarmRaised = false;
  /** The alarm went off: `e` raised it, at panel `p` (null: (guard-ai S6) by radio, a command call that got through). */
  onAlarm: ((e: Enemy, p: AlarmPanel | null) => void) | null = null;
  /** (guard-ai S6) How the alarm was raised ('' not yet; tests / e2e / debug). */
  alarmBy: '' | 'panel' | 'radio' = '';
  /**
   * (guard-ai S6, design 7, M4) The section's command call: once a contact call gets through, the caller (or the officer
   * in his voice range) holds a `command` call (`RADIO.report` x reaction) whose completion raises the alarm; cut, the
   * next guard in the fight takes it `ALARM_CALL.retry` s later; nobody left, no alarm. Stealth modes only (as panels).
   */
  readonly command = new CommandCall();
  /** The command call's numbers (tests / e2e read them from here). */
  readonly alarmCallTable = ALARM_CALL;
  private alarmRunner: Enemy | null = null;
  private alarmT = 0;
  /** Flashlight slots (dark maps) and who holds each. */
  private torches: LightDef[] = [];
  private torchOwner: (Enemy | null)[] = [];
  private world: World;
  /** Drone operators' recon drones. */
  readonly drones: ReconDrone[] = [];
  /** Dead / knocked-out dogs (their own bodies, lying where they fell). */
  private dogCorpses: Enemy[] = [];
  /** Squad rosters (members kept after they go down) for radio checks; reported silent members. */
  private squads = new Map<number, Enemy[]>();
  private silent = new Set<Enemy>();
  private radioT: number = ARCHETYPE.radio.period;
  /** Radio checks run / members found silent (tests). */
  radioChecks = 0;
  radioMisses = 0;
  /** (guard-ai S5b) The section slot list `placeSlot` last read the tags of, each slot's squad id, and the guard each
   *  slot index holds now (a woken guard replaces his old self; cleared with the guards). */
  private tagSlots: readonly unknown[] | null = null;
  private tagSquad = new Int32Array(32);
  private readonly slotGuard: (Enemy | null)[] = [];
  /** (guard-ai S10, GA2) The live section's talking pairs (`pairs.ts`): built in `placeSlot` when the second of a
   *  `pair` is placed, stepped at the board rate (`pairStep`); cleared with the slot tags. */
  readonly pairs: TalkPair[] = [];
  /** (guard-ai S10) Pairs not built (no timed loop, periods differ, no overlap within `PAIRS.meetMax`; tests / e2e). */
  readonly pairSkips: string[] = [];
  /** (guard-ai S10) Lines said and missing-partner searches sent by the pairs (tests / e2e). */
  pairLines = 0;
  pairMisses = 0;
  readonly pairTable = PAIRS;
  private pairT = 0;
  private readonly pairPick: MeetPick = { stopA: 0, stopB: 0, open: 0, close: 0, d: 0 };
  private readonly pairTmp: P2 = [0, 0];
  /** (guard-ai S5b) Who called the last radio check (tests / e2e; null none). */
  lastCheckCaller: Enemy | null = null;
  private buffT = 0;
  /** Callouts (GameState shows them). (guard-ai S9) `ev` / `n` / `unit`: the table line (`Enemy.bark`), for the co-op host. */
  onBark: ((e: Enemy, line: string, radio: boolean, ev?: BarkEvent, n?: number, unit?: number) => void) | null = null;
  /**
   * (guard-ai S1) Coordinated hearing: of the guards a noise reaches, one is sent to investigate and the rest only turn
   * to look (`hear`, `noise`). Off (Hunter, Mission: the parked modes): everyone in reach hears and walks over, and
   * gunfire sends everyone in reach to combat (the old rule).
   */
  coordinated = true;
  /** (guard-ai S1) The map's noisy things (machinery, generators, vents): they mask sounds for guards near them. */
  private noisy: readonly NoisySource[] = [];
  /** (guard-ai S5) The map's own noisy things (`MapLayout.guardAi.noisy`); Sector Ops swaps in a section's
   *  `SectorDef.noisy` on load and falls back to these. */
  readonly mapNoisy: readonly NoisySource[];
  /** The hearing table (tests / e2e read the numbers from here). */
  readonly hearingTable = HEARING;
  /** Hearing scratch (no allocation per noise): the perceivers' ids (tier-2 hearers, guards who saw a light go) and
   *  every guard's effective reach. */
  private hearWho = new Int32Array(32);
  private hearR = new Float32Array(32);
  /** (guard-ai S2) Path length over the nav grid for the board (straight when the line is clear; A* else). */
  private readonly pathA: P2 = [0, 0];
  private readonly pathB: P2 = [0, 0];
  private readonly paths: PathLen = {
    len: (ax, ay, az, bx, by, bz) => {
      const a = this.pathA;
      const b = this.pathB;
      a[0] = ax;
      a[1] = az;
      b[0] = bx;
      b[1] = bz;
      const nav = this.nav;
      if (nav.lineClear(a, b, ay, by)) return hyp3(bx - ax, by - ay, bz - az);
      const p = nav.findPath(a, b, 3000, ay, by);
      if (!p) return Infinity;
      let len = 0;
      let px = ax;
      let pz = az;
      for (let i = 0; i < p.length; i++) {
        const w = p[i]!;
        len += hyp2(w[0] - px, w[1] - pz);
        px = w[0];
        pz = w[1];
      }
      return len + hyp2(bx - px, bz - pz) + Math.abs(by - ay);
    },
  };
  /** (guard-ai S2) The incident board (design 3): one incident per event, who goes, acks, escalation. Coordinated
   *  modes only (one board: Sector Ops has one live section). */
  readonly board = new IncidentBoard(this.paths);
  /** The board's view of the guards (filled before each tick) and its 5 Hz clock. */
  private readonly view = new GuardView(32);
  private boardT = 0;
  /** The incident table (tests / e2e read the numbers from here). */
  readonly incidentTable = INCIDENT;
  /** (guard-ai stack-tip e2e fix) The body table and how far a body at a light level is noticed ahead (e2e bounds). */
  readonly bodyTable = BODY;
  readonly bodyNoticeRange = bodyNoticeRange;
  /**
   * (guard-ai S3, design 5, M5) The section radio net: one per section. Sector Ops loads one section at a time, so the
   * live section is this one net (cleared with the guards on every unload / restart: `despawnAll` -> `clear`); other
   * maps are one section (A6). Its `section` stays 0 (the manager is not told the Sector index; only the S6 alarm call
   * would use it). Coordinated modes only; ticked at 10 Hz with the board's view and the reaction lane.
   */
  readonly radioNet = new RadioNet(0);
  /** The radio table (tests / e2e read the numbers from here). */
  readonly radioTable = RADIO;
  private netT = 0;
  /** Per view index: the guard's reaction (difficulty x officer buff), the old `callAlert` factor. */
  private rxReaction = new Float32Array(32);
  /** The last few calls acknowledged (caller, incident, kind): one "Copy." per report, from its first receiver. */
  private readonly ackCaller = new Int32Array(8).fill(-1);
  private readonly ackInc = new Int32Array(8);
  private readonly ackKind = new Int32Array(8);
  private ackK = 0;
  /**
   * (guard-ai S4, design 4, M1 / M3) Awareness and caution (`awareness.ts`): guards by stable key (`Enemy.key`,
   * stamped at `spawn`, kept by a woken guard). A death (a body found dead, a kill seen) opens a held caution for the
   * guards aware of it (the finder or witnesses, his voice hearers, the section once his `body` report gets through);
   * it clears only when every one of them is dead or knocked out and not woken. A knockout found: the waker and the
   * woken guard search `CAUTION.koSearch`, stay cautious `koCautious`, then normal. Coordinated modes only; one table
   * (Sector Ops has one live section; cleared with the guards by `clear`).
   */
  readonly awareness = new Awareness();
  /** The caution table (tests / e2e read the numbers from here). */
  readonly cautionTable = CAUTION;
  /** Kills seen by a calm guard (tests / debug), and how many saw the last one. */
  killsWitnessed = 0;
  lastWitnesses = 0;
  /** The hold the last dead body (or witnessed kill) opened (tests / debug; -1 none). */
  lastHold = -1;
  /** `voiceMask`'s nearest calm hearer (scratch). */
  private voiceNear: Enemy | null = null;
  /**
   * (guard-ai S14, stealth over shooting 6 and 7, A40 / A41) Section alert (`sectionAlert.ts`): a missed check-in
   * (radio check, talking pair) or a loud shot heard by a calm guard is radioed (`missing` / `shots` call, cuttable);
   * delivered, each receiver is cautious for `MISSING.cautious` / `SHOTS.cautious` s (`Awareness.timedHold`), and a
   * shots call sends a pair to the spot. Coordinated modes only. An alert call carries its own incident id (`alertInc`:
   * -2, -3, ..., apart from the board's ids, the S4 holds and -1), so the S2 pair lead's own `missing` report (an ack,
   * the board's id) never merges with it in the radio queue; the log tells an alert call from those. `shotsCall` /
   * `shotsInc` / `shotsBy`: the open shots call (one per shots incident).
   */
  private readonly alertLog = new AlertCallLog();
  private alertSeq = 0;
  private shotsCall = -1;
  private shotsInc = 0;
  private shotsBy = -1;
  /** (guard-ai S14) The section's tallies for the section rating (bodies found, missed checks, shots calls, radio
   *  alarms), reset with the section (`clear`: every section load and restart). */
  private readonly counts = new SectionCounters();
  get sectionCounts(): SectionCounts {
    return this.counts;
  }
  /** The tables (tests / e2e read the numbers from here). */
  readonly missingTable = MISSING;
  readonly shotsTable = SHOTS;
  /** Where completed calls go (made once). */
  private readonly sink: RadioSink = {
    deliver: (gid, inc, kind, caller) => this.radioDeliver(gid, inc, kind, caller),
    alarm: (_section, caller) => this.radioAlarm(caller),
    completed: (caller, inc, kind) => {
      // the spotter's radio line, as the section hears it; (S4) the body reports
      if (kind === 'contact') {
        this.byNum(caller)?.bark('callIn');
        // (guard-ai S24 fix) a contact naming an intruder got through: command knows of him; an alarm raised with none
        // (its caller had no intruder) sends its reinforcements after him from now on
        if (inc >= 0) {
          this.contactHunt = inc;
          if (this.alarmRaised && this.alarmHunt < 0) this.alarmHunt = inc;
        }
        // (S6) the section knows: now command must be told (the alarm)
        this.contactThrough(caller);
      }
      else if (kind === 'body') {
        this.byNum(caller)?.bark('deadReport');
        // (S19) a calm guard hurries over to help search it
        this.bodyHelp(inc);
      }
      else if (kind === 'ko') this.byNum(caller)?.bark('koReport');
      // (S14) a missing guard or shots: the section is told
      else if (kind === 'missing' || kind === 'shots') this.alertThrough(caller, inc, kind);
    },
  };

  // ---- (guard-ai S8, design 8) squad tactics: roles per engaged group, the cover grid, the seeded combat RNG ----
  /** The level's AI cover as typed arrays (`owner` = the reserving guard's `num`, mirrored from `reserveCover`) and its
   *  4 m bucket grid. Built once at load (the cover is static). */
  readonly coverSet: CoverSet;
  readonly coverGrid: CoverGrid;
  /** Seconds left on each blocked cover (`coverSet.block`). */
  private coverBlockT: Float32Array;
  /** One reused role buffer pair (guard-ai S24: one group per intruder, run one after another). */
  private readonly roleIn = new RoleInput(32);
  private readonly roleOut = new RoleOutput(32);
  /** Group member -> guard, and guard list index -> member (-1 none); reused. */
  private roleWho: (Enemy | null)[] = new Array<Enemy | null>(32).fill(null);
  private roleMember = new Int16Array(32);
  /** (guard-ai S24) Guard list index -> he got a role from some intruder's group this tick (reused). */
  private roleMark = new Uint8Array(32);
  private roleT = 0;
  /** The last roles tick had an engaged group: its flank role replaces the single `flanker` (else a lone guard keeps
   *  today's flanker). */
  private rolesActive = false;
  /** (guard-ai S8, A7) Squad radio checks so far: the check period's spread is a fixed sequence, not dice. */
  private radioSeq = 0;
  /** The match's combat seed: `combatSeed(matchSeed, engagement, guard)` seeds each guard's dice. Modes / tests may
   *  set it. */
  matchSeed = 0x5eed;
  /** Engagements so far: one starts when a guard goes to combat with nobody else in it. */
  engagement = 0;
  /** (guard-ai S24) Per intruder slot: the guard (`num`) whose contact call opened that fight, its group's reporter; -1
   *  none. */
  private readonly callers = new Int32Array(MAX_INTRUDERS).fill(-1);
  /** The guard (`num`) whose contact call opened this engagement: the group's reporter; -1 none. (guard-ai S24) The
   *  freshest intruder's (slot 0 when none). */
  get contactCaller(): number {
    const f = this.intruders.freshest;
    return this.callers[f >= 0 ? f : 0]!;
  }
  /** The tables (tests / e2e read the numbers from here). */
  readonly squadTable = SQUAD;
  readonly tacticsTable = TACTICS;
  /** (guard-ai S12) Helmets shot off guards, lying where they fell (a pool; tests read `shown`). */
  readonly helmetDrops: HelmetDrops;
  /** (guard-ai S12) Scratch for `placeSlot`'s gear. */
  private readonly gearA: GuardGear = { helmet: false, armour: false };
  private readonly gearB: GuardGear = { helmet: false, armour: false };
  /** (guard-ai S13, item 4, A37) The alarm stage the mode set (`setAlarmStage`; Sector Ops only, 0 elsewhere) and its
   *  gear (`stageGear`): every guard placed (`placeSlot`) or woken (`revive`) gets it on top of his own. */
  alarmStage = 0;
  readonly alarmGear: GuardGear = { helmet: false, armour: false };
  /** (guard-ai S13, items 3 and 11, A38, A39) The response teams of the live section, in the order the alarms brought
   *  them (the index is the sweep's start offset); cleared with the guards (`clear`: a section unload or restart). */
  readonly teams: SweepTeam<Enemy>[] = [];
  // ----- (guard-ai S15, stealth over shooting item 8) breaker faults and late discovery -----
  /** The match's wall switches as the guards use them (`StealthSystems` sets it; null: no switches, a cut stays the S2
   *  light incident). */
  breakers: BreakerHost | null = null;
  /** (guard-ai S20) The doors as the walker sees them (built on the first update with doors). */
  private doorGate: DoorGate | null = null;
  /** (guard-ai S20) Doors a guard opened at the leaf (`doorStep`; tests). */
  doorOpens = 0;
  /** The tables (tests / e2e read the numbers from here). */
  readonly breakerTable = BREAKER;
  readonly lateTable = LATE;
  /** Dark fixtures no guard has reacted to (late discovery's list). */
  private readonly dark = new DarkList();
  /** Board time (s) of the last cut a guard noticed, per circuit: another inside `BREAKER.repeatT` is tampering. */
  private readonly lastFault = new Map<number, number>();
  /** Per circuit: the count of its switch cuts (each press that left it off) and the cut the guards last noticed, so a
   *  late find of a cut already noticed is that same fault again, never "a second cut" (tampering). */
  private readonly cutSeq = new Map<number, number>();
  private readonly faultCut = new Map<number, number>();
  private readonly faultTamper = new Map<number, boolean>();
  private lateT = 0;
  private lateK = 0;
  private readonly swP = new Float32Array(3);
  /** Breaker resets the guards made and late finds (tests / e2e). */
  breakerResets = 0;
  lateFinds = 0;
  // ----- (guard-ai S22, Michael's walk of 4.72 G6) security consoles -----
  /** The game's consoles as the guards use them (`CourseMode` sets it, `slices/S22.md`; null: a guard who notices one
   *  off walks over, but cannot turn it back on). */
  consoleHost: ConsoleHost | null = null;
  /** The consoles the game reported (`consoleState`), their cuts and the guards' verdicts. */
  readonly consoles = new ConsoleFaults();
  readonly consoleTable = CONSOLE_FAULT;
  /** Consoles the guards turned back on, and notices (a guard saw one off; tests / e2e). */
  consoleResets = 0;
  consoleFinds = 0;
  private conT = 0;
  private conK = 0;

  constructor(
    private scene: Scene,
    world: World,
    readonly nav: NavGrid,
    private registry: DamageRegistry,
    private ballistics: Ballistics,
    private vfx: Vfx,
    /** (locomotion step 19) The match's resolved difficulty (preset or custom; the host's in co-op). */
    readonly diff: DifficultyDef,
    private players: () => readonly PlayerRef[],
  ) {
    this.world = world;
    // (guard-ai S5) the map's guard-ai data: its noisy things mask hearing; dev / tests check it (warnings only)
    const gai = world.layout.guardAi;
    this.mapNoisy = gai?.noisy ?? [];
    this.noisy = this.mapNoisy;
    if (gai && import.meta.env.DEV) {
      const slots: SquadSlot[] = [];
      for (const r of world.layout.rooms ?? []) for (const s of r.squad ?? []) slots.push(s);
      reportGuardAi('map', validateGuardAi(gai, slots));
    }
    for (const l of world.level.lights.lights) {
      if (l.kind !== 'flashlight') continue;
      this.torches.push(l);
      this.torchOwner.push(null);
    }
    this.flowField = new Float32Array(nav.walk.length);
    // (guard-ai S8) the cover as typed arrays and its grid (indices match `reserveCover`)
    this.coverSet = coverSetFrom(world.level.cover);
    this.coverGrid = CoverGrid.fromSet(this.coverSet);
    this.coverBlockT = new Float32Array(this.coverSet.n);
    // (guard-ai S12) helmets shot off guards (built on the first drop)
    this.helmetDrops = new HelmetDrops(world.parts, (m) => world.addShadowCaster(m));
    this.ctx = {
      scene,
      world,
      nav,
      registry,
      ballistics,
      vfx,
      diff,
      players,
      flow: () => this.flowOf(-1),
      flowOf: (slot) => this.flowOf(slot),
      lkpOf: (slot) => this.lkpOf(slot),
      intruderId: (slot) => this.intruders.idOf(slot),
      enemies: () => this.enemies,
      cover: world.level.cover,
      coverSegments: world.level.coverSegments,
      rooms: world.layout.rooms ?? [],
      reserveCover: (e, idx) => {
        const o = this.coverOwner.get(idx);
        if (o && o !== e && o.alive) return false;
        this.releaseCover(e);
        this.coverOwner.set(idx, e);
        if (idx >= 0 && idx < this.coverSet.n) this.coverSet.owner[idx] = e.num;
        return true;
      },
      releaseCover: (e) => this.releaseCover(e),
      onKilled: (e, h) => {
        this.kills++;
        this.releaseCover(e);
        // (guard-ai S4) the awareness roster, and who saw it
        if (this.coordinated) this.downed(e);
        // (guard-ai S5b) his dog stays by him, searches round him and barks
        this.handlerDown(e);
        this.onKilled?.(e, h);
      },
      onShot: (e, a, b) => this.onEnemyShot?.(e, a, b),
      onBark: (e, line, radio, ev, n, unit) => this.onBark?.(e, line, radio, ev, n, unit),
      onMelee: (e) => this.onEnemyMelee?.(e),
      onWindup: (e) => this.onEnemyWindup?.(e),
      isFlanker: (e) => this.flanker === e,
      combatSeed: (e) => this.seedFor(e),
      blockCover: (idx) => this.blockCover(idx),
      throwGrenade: (e, from, to) => {
        // one grenade in the air at a time across the squad
        if (!this.grenades || this.grenadeT > 0) return false;
        this.grenadeT = 8;
        this.grenadesThrown++;
        const T = 1.15;
        const v = new Vector3((to.x - from.x) / T, (to.y + 0.3 - from.y + 0.5 * -GRAVITY.y * T * T) / T, (to.z - from.z) / T);
        this.grenades.throw(from, v, 'enemy', e.id, undefined, true);
        e.bark('grenade');
        return true;
      },
      stealth: () => this.stealth,
      coordinated: () => this.coordinated,
      lkp: this.lkp,
      lkpValid: () => this.lkpValid,
      // (guard-ai S24) his intruder's slot (by player id): its last known position follows him; the guard hunts it
      reportSighting: (p) => {
        p.spotted = true;
        const slot = this.intruders.slotFor(p.id);
        this.reportIntruder(slot, p.feet.x, p.feet.y, p.feet.z, true);
        return slot;
      },
      callAlert: (e) => {
        for (const o of this.enemies) {
          if (o === e || !o.alive || o.alerted) continue;
          const d = Vector3.Distance(o.pos, e.pos);
          if (d < EnemyManager.RADIO) o.radio((0.4 + d * 0.03 + Math.random() * 0.3) * this.diff.reaction * (o.buff ? ARCHETYPE.officer.reaction : 1), e.hunt);
        }
      },
      shout: (e) => {
        // (guard-ai S3) coordinated: the voice model (walls, masking); the parked modes: the old 8 m with jitter
        if (this.coordinated) {
          this.voice(e);
          return;
        }
        for (const o of this.enemies) {
          if (o === e || !o.alive || o.alerted) continue;
          if (hyp2(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < ALERT.shout && Math.abs(o.pos.y - e.pos.y) < 2.5) o.radio(0.3 + Math.random() * 0.3, e.hunt);
        }
      },
      radioCall: (e, inc, kind) => {
        if (this.coordinated) this.radioNet.startCall(e.num, inc, kind, callHold(kind, this.reactionOf(e)));
        // (guard-ai S8) the first contact call of an engagement makes its caller the group's reporter
        if (this.coordinated && kind === 'contact') this.noteCaller(e);
      },
      radioCut: (e) => {
        this.radioNet.cut(e.num);
      },
      radioOpen: (e) => this.radioNet.pendingFor(e.num) > 0,
      dropHelmet: (x, y, z, top, dx, dz, hex, w, h, d) => this.helmetDrops.drop(x, y, z, top, dx, dz, hex, w, h, d),
      // (guard-ai S15) the breaker walk: is the circuit still off; he worked the switch
      // (guard-ai S22) a console's pseudo circuit: its state as the game reported it, its own toggle path
      breakerOff: (group) => (isConsoleGroup(group) ? this.consoles.isOff(this.consoles.ofGroup(group)) : this.breakers ? this.breakers.isOff(group) : true),
      breakerReset: (_e, group) => {
        if (isConsoleGroup(group)) this.consoleReset(group);
        else if (this.breakers?.reset(group)) this.breakerResets++;
      },
      // (guard-ai S20) a shut door's leaf in his step: not taken; a door not locked is opened the player's way (its
      // sound, the close behind him and the co-op door sync as before) and he waits for the swing
      doorStep: (_e, x0, z0, x1, z1, y) => {
        const g = this.doorGate;
        if (!g) return true;
        const k = g.blocking(x0, z0, x1, z1, y);
        if (k < 0) return true;
        const doors = this.world.doors;
        const d = doors.list[k]!;
        if (d.target === 0 && !d.anchor.locked && doors.open(d, 'enemy')) this.doorOpens++;
        return false;
      },
      searchSlot: (e) => {
        let n = 0;
        for (const o of this.enemies) if (o !== e && o.alive && o.level === 'searching' && o.num < e.num) n++;
        return n;
      },
      addBody: (e, rig: CharacterRig, imp: Vector3, lethal: boolean) => {
        const b = new Body(scene, world, e.def, lethal, rig, imp, this.canRagdoll());
        b.enemyId = e.id;
        b.guardKey = e.key;
        b.guard = e;
        this.addBody(b);
      },
      bodies: () => this.bodies,
      bodyFound: (e, b) => this.bodyFound(e, b),
      revive: (b, by) => this.revive(b, by),
      alarmRaised: () => this.alarmRaised,
      raiseAlarm: (e, p) => this.raiseAlarm(e, p),
    };
    this.refreshFlow();
  }

  /** Bodies still simulating as ragdolls are under the budget. */
  canRagdoll(): boolean {
    let n = 0;
    for (const b of this.bodies) if (b.simulating) n++;
    return n < BUDGET.maxRagdolls;
  }

  addBody(b: Body): void {
    this.bodies.push(b);
    this.onBodyAdded?.(b);
    // cap: drop the oldest (found / hidden first)
    while (this.bodies.length > BODY.max) {
      let k = this.bodies.findIndex((x) => (x.found || x.hidden) && !x.carried);
      if (k < 0) k = this.bodies.findIndex((x) => !x.carried);
      if (k < 0) break;
      this.removeBody(this.bodies[k]!);
    }
  }

  removeBody(b: Body): void {
    const k = this.bodies.indexOf(b);
    if (k < 0) return;
    this.bodies.splice(k, 1);
    b.dispose();
    this.onBodyRemoved?.(b);
  }

  /**
   * A body was spotted: the finder searches round it (a knocked-out victim gets woken). Parked modes: the squad within
   * `RADIO` searches too. (guard-ai S4, design 4, M1) Coordinated: dead, the finder shouts (his voice hearers know, the
   * nearest calm one searches with him) and radios it (`body` call: the section knows once it gets through; A2: no
   * alarm); all of them, with `also` (the other witnesses of a kill), are held cautious (`awareness`). Knocked out: he
   * walks over and wakes him (`revive` -> `woke`); nobody else is told yet.
   */
  private bodyFound(e: Enemy, b: Body, also = 0): void {
    if (b.found || !b.present) return;
    b.found = true;
    this.bodiesFound++;
    this.counts.bodiesFound++;
    if (this.coordinated) {
      if (b.lethal) {
        e.bark('body');
        // (guard-ai S18, G2) a dead body's search: longer and wider than a plain one (`BODY_SEARCH`)
        e.bodySearch(b.pos.x, b.pos.z);
        const mask = (this.voiceMask(e) | keyBit(e.key) | also) >>> 0;
        // (guard-ai S19) the one who heard his "Man down!" hurries over
        this.voiceNear?.bodySearch(b.pos.x, b.pos.z, urgentKind('bodyDead'));
        const h = this.awareness.openHold('dead', mask);
        this.lastHold = h;
        // (guard-ai S19) the body his report is about, for the guards sent once it gets through
        this.noteBodyCall(h, b);
        this.radioNet.startCall(e.num, h, 'body', callHold('body', this.reactionOf(e)));
      } else {
        e.bark('koFound');
        e.searchAt(b.pos.x, b.pos.z, b);
      }
      this.syncCaution();
      this.onBodyFound?.(e, b);
      return;
    }
    e.bark('body');
    e.searchAt(b.pos.x, b.pos.z, b.lethal ? null : b);
    for (const o of this.enemies) {
      if (o === e || !o.alive || o.alerted) continue;
      if (Vector3.Distance(o.pos, e.pos) < EnemyManager.RADIO) o.searchAt(b.pos.x, b.pos.z, null);
    }
    this.onBodyFound?.(e, b);
  }

  /** (Sector Ops) A section load or restart: a panel alarm can be raised again, and no guard holds the run. (guard-ai
   *  S6) Nor the command call: no alarm is owed. */
  resetAlarm(): void {
    this.alarmRaised = false;
    this.alarmRunner = null;
    this.alarmBy = '';
    this.alarmHunt = -1;
    this.contactHunt = -1;
    this.command.clear();
  }

  /** An alerted enemy worked a panel, or (guard-ai S6) a command call got through (`p` null): reinforcements (once per
   *  match; Sector Ops once per section load). */
  private raiseAlarm(e: Enemy, p: AlarmPanel | null): void {
    if (this.alarmRaised || (p && p.disabled)) return;
    this.alarmRaised = true;
    this.alarmBy = p ? 'panel' : 'radio';
    // (guard-ai S24) the reinforcements hunt the intruder of the guard who raised it; (S24 fix) he has none: the one the
    // last contact call that got through named (command heard it), else none until one does (`sink.completed`)
    this.alarmHunt = e.hunt >= 0 ? e.hunt : this.contactHunt;
    this.alarmRunner = null;
    this.command.raised();
    this.onAlarm?.(e, p);
  }

  /**
   * (guard-ai S6, design 7, M4) A contact call from `caller` got through: the alarm is owed. Stealth modes with the radio
   * alarm on, no alarm yet: the officer in the caller's voice range (alive, free) holds the command call, else the caller,
   * else the next guard in the fight. One command call at a time (the net refuses a second).
   */
  private contactThrough(caller: number): void {
    if (!RADIO_ALARM || !this.stealth || !this.coordinated || this.alarmRaised) return;
    if (!this.command.owe()) return;
    const c = this.byNum(caller);
    let who: Enemy | null = null;
    if (c) {
      const list = this.enemies;
      for (let i = 0; i < list.length && !who; i++) {
        const o = list[i]!;
        if (o !== c && o.def.kind === 'officer' && this.canCall(o) && this.hearsShout(c, o) >= 0) who = o;
      }
      if (!who && this.canCall(c)) who = c;
    }
    if (!who) who = this.nextCaller();
    if (who) this.startCommand(who);
    else this.command.lapse();
  }

  /** (guard-ai S6) May he hold the command call (alive, free, not blinded, armed, not passive)? */
  private canCall(e: Enemy): boolean {
    return e.alive && !e.taken && e.blindT <= 0 && !e.def.melee && !e.dog && !e.passive;
  }

  /**
   * (guard-ai S6, design 7) The next guard to make the command call: one in the fight (in combat, or on the search after
   * it) who may call; out of the target's sight first ("hide and report"), then an officer, then the lower guard key
   * (no randomness, A7). Null when nobody is left.
   */
  private nextCaller(): Enemy | null {
    const list = this.enemies;
    let best: Enemy | null = null;
    let bs = Infinity;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (!this.canCall(e)) continue;
      if (!e.alerted && !(e.level === 'searching' && e.aware.fought)) continue;
      const s = (e.targetInView ? 1000 : 0) + (e.def.kind === 'officer' ? 0 : 100) + (e.key >= 0 ? e.key : 99) + e.num * 1e-6;
      if (s < bs) {
        bs = s;
        best = e;
      }
    }
    return best;
  }

  /** (guard-ai S6) `e` holds the command call ("Command, contact. Send backup."): the alarm when it gets through. */
  private startCommand(e: Enemy): void {
    const id = this.radioNet.startCall(e.num, -1, 'command', callHold('command', this.reactionOf(e)));
    if (id < 0) {
      this.command.refused();
      return;
    }
    this.command.start(e.num);
    e.bark('command');
  }

  /** (guard-ai S6) Sector Ops: the live section's index (the radio net's section; the alarm and its entries). */
  setSection(i: number): void {
    this.radioNet.section = i;
  }

  /**
   * (guard-ai S6, design 7, M1 "any reinforcements must be aggressive") Bring one reinforcement in at `at` (`yaw`), on
   * the alarm: aggressive, told by command (in combat on the shared last known position the next step), in `section`,
   * running `route` into it first when one is given (`ReinforceEntry.route`). The parked modes (`coordinated` off) keep
   * the old way: spawned alerted (`reinforce`). Null when the live cap is full or there is no floor there.
   */
  spawnReinforcement(kind: EnemyKind, at: Vector3, yaw: number, section: number, route: readonly (readonly [number, number])[] | null = null): Enemy | null {
    const e = this.spawn(kind, at, !this.coordinated, yaw);
    if (!e) return null;
    this.joinReinforcement(e, section, route);
    return e;
  }

  /** (guard-ai S6) A guard just spawned (and placed) on the alarm becomes a reinforcement (`spawnReinforcement`).
   *  (guard-ai S17, G1, A102) An alarm a device raised (`deviceAlert` within `DEVICE.fresh` s, nobody has seen anyone
   *  since: no last known position) brings him to the device's spot to search its room (`Enemy.joinAsResponder`), not
   *  to combat: in combat with no last known position he would go for the player wherever he is (before S24, A148). */
  joinReinforcement(e: Enemy, section: number, route: readonly (readonly [number, number])[] | null = null): void {
    e.section = section;
    if (!this.coordinated) {
      e.alert();
      e.tell(this.alarmHunt);
      return;
    }
    if (this.deviceFresh()) {
      const d = this.devSpot;
      e.joinAsResponder(route, d.x, d.z, this.roomOf(d.x, d.y, d.z));
      return;
    }
    // (guard-ai S24) told of the alarm caller's intruder
    e.joinAsReinforcement(route, this.alarmHunt);
  }

  /** (guard-ai S17) The last tripped device's spot (floor height) and board time (-Infinity: none since the clear). */
  private readonly devSpot = new Vector3();
  private devT = -Infinity;
  /** (guard-ai S17) Device alerts taken (tests / e2e). */
  deviceAlerts = 0;

  /** (guard-ai S19) The last few dead-body reports on the radio: the hold each call carries and its body (a fixed ring). */
  private readonly bcHold = new Int32Array(8).fill(-1);
  private readonly bcBody: (Body | null)[] = [null, null, null, null, null, null, null, null];
  private bcK = 0;
  /** (guard-ai S19) Reported bodies the board sent someone to (tests / e2e). */
  bodyHelps = 0;

  /** (guard-ai S19) A finder radios dead body `b` under hold `h` (his `body` call). */
  private noteBodyCall(h: number, b: Body): void {
    const j = this.bcK;
    this.bcK = (j + 1) % this.bcHold.length;
    this.bcHold[j] = h;
    this.bcBody[j] = b;
  }

  /**
   * (guard-ai S19, Michael's walk of 4.72 G3: "guards should rush to any triggered alarms or bodies reported") A finder's
   * `body` call about hold `h` got through: unless the body is gone (carried, hidden, removed), a `bodyDead` board
   * incident sends `URGENT.bodyHelpers` calm guards in range to hurry over and search it with him (`Enemy.helpSearch`).
   */
  private bodyHelp(h: number): void {
    for (let j = 0; j < this.bcHold.length; j++) {
      if (this.bcHold[j] !== h) continue;
      const b = this.bcBody[j]!;
      this.bcHold[j] = -1;
      this.bcBody[j] = null;
      if (!URGENT.enabled || URGENT.bodyHelpers < 1 || !b.present || b.carried || b.hidden || this.bodies.indexOf(b) < 0) return;
      const n = b.id ? Number.parseInt(b.id.slice(1), 10) : Number.NaN;
      const opened = this.board.opened;
      this.board.reportBodyCall(b.pos.x, b.pos.z, this.nav.heightAt(b.pos.x, b.pos.z, b.pos.y), Number.isFinite(n) ? n : 1000000 + j);
      this.boardStep(0);
      if (this.board.opened !== opened) this.bodyHelps++;
      return;
    }
  }

  /** (guard-ai S17) A device alert recent enough for an alarm's reinforcements, and no sighting since. (guard-ai S24,
   *  A150) `lkpValid` mirrors the freshest intruder: false = no valid slot. */
  private deviceFresh(): boolean {
    return DEVICE.enabled && !this.lkpValid && this.board.now - this.devT <= DEVICE.fresh;
  }

  /** (guard-ai S17) The room at a floor point (null: none, or the map has no rooms). */
  private roomOf(x: number, y: number, z: number): RoomRect | null {
    const rooms = this.ctx.rooms;
    const r = rooms.length ? roomAt(rooms, x, z, y + 0.1) : -1;
    return r >= 0 ? rooms[r]! : null;
  }

  /**
   * (guard-ai S17, Michael's walk of 4.72 G1: "theres no way they could no that unless they saw me. change it so they
   * come to look where the laser is and search the room") A device was tripped at (x, y, z): a laser's beam (its
   * midpoint, `beamSpot`), a camera's alarm (where it saw someone). `y` NaN: the nav floor there. `key`: the device
   * (`CtHooks.alertAt`). Coordinated modes only: a `device` incident on the board (one per device while open) sends the
   * nearest `DEVICE.want` calm guards to the spot to search its room, and the alarm's reinforcements that come in on it
   * search there too (`joinReinforcement`). Nothing here reads a player's position: no last known position is set.
   * Returns the incident id, -1 when ignored. Host only.
   */
  deviceAlert(x: number, y: number, z: number, key: number): number {
    if (!this.coordinated || !DEVICE.enabled) return -1;
    const fy = y === y ? y : this.nav.heightAt(x, z);
    this.devSpot.set(x, fy, z);
    this.devT = this.board.now;
    this.deviceAlerts++;
    const id = this.board.reportDevice(x, z, fy, key);
    this.boardStep(0);
    return id;
  }

  /** (guard-ai S6) The map's reinforcement entries for `section` (`MapLayout.guardAi.entries`); empty: none (the
   *  caller falls back to `MapLayout.reinforce`). Sector Ops reads `SectorDef.entries` itself. */
  entriesFor(section: number, out: ReinforceEntry[]): ReinforceEntry[] {
    out.length = 0;
    const es = this.world.layout.guardAi?.entries;
    if (es) for (let i = 0; i < es.length; i++) if (es[i]!.section === section) out.push(es[i]!);
    return out;
  }

  /**
   * (guard-ai S13, item 4, A37) The alarm stage is now `stage` (Sector Ops: a rise, a section load, a restart). Its gear
   * (`GEAR_BY_STAGE`: stage 2 armour, stage 3 armour and helmet) goes to every guard placed or woken from now on, and
   * with `now` at once to every living guard (the live section: Sector Ops loads one at a time), on top of the gear he
   * has. No camera is touched (the cameras are `CtDevices`'; item 4 "dont add cameras").
   */
  setAlarmStage(stage: number, now = true): void {
    this.alarmStage = stage;
    stageGear(stage, this.alarmGear);
    if (!now) return;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) if (list[i]!.alive) this.giveStageGear(list[i]!);
  }

  /** (guard-ai S13) The stage's gear on top of his own (nothing to give: his gear is left as it is). */
  private giveStageGear(e: Enemy): void {
    const g = this.alarmGear;
    if (!g.helmet && !g.armour) return;
    e.setGear(mergeGear(e, g, this.gearB));
  }

  /**
   * (guard-ai S13, items 3 and 11, A38, A39) A new response team for `section` (one per alarm): its sweep reads
   * `override` (`SectorDef.sweep`) if given, else `routes` and `posts` (thinned at the switch). Members join with
   * `joinTeam` as they spawn.
   */
  newTeam(section: number, override: readonly (readonly [number, number])[] | null, routes: readonly (readonly (readonly [number, number])[])[], posts: readonly (readonly [number, number])[]): SweepTeam<Enemy> {
    let n = 0;
    for (let i = 0; i < this.teams.length; i++) if (this.teams[i]!.section === section) n++;
    const t = new SweepTeam<Enemy>(n, section, override, routes, posts);
    this.teams.push(t);
    return t;
  }

  /** (guard-ai S13, A38) Guard `e` (spawned on the alarm) joins response team `t`; the shield guard always wears a helmet. */
  joinTeam(e: Enemy, t: SweepTeam<Enemy>): void {
    t.add(e);
    e.crew = t;
    if (e.def.kind === 'enforcer' && RESPONSE.shieldHelmet && !e.helmet) {
      this.gearB.helmet = true;
      this.gearB.armour = e.armour;
      e.setGear(this.gearB);
    }
  }

  /**
   * (guard-ai S13) The sweep source of a live map's section (outside Sector Ops, which reads its `SectorDef`): the route
   * points and post centres of the guards placed in `section` (not dogs, not response teams), into `routes` / `posts`.
   * Alarm time only (it fills the caller's lists).
   */
  sweepSource(section: number, routes: (readonly (readonly [number, number])[])[], posts: (readonly [number, number])[]): void {
    routes.length = 0;
    posts.length = 0;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (e.section !== section || e.dog || e.crew) continue;
      const r = e.routePoints;
      if (r && r.length) routes.push(r);
      else posts.push(e.postPoint);
    }
  }

  /** Bring a reinforcement squad in at `at` (alerted, told the last known position). */
  reinforce(kind: EnemyKind, at: Vector3, n: number): Enemy[] {
    const out: Enemy[] = [];
    for (let i = 0; i < n; i++) {
      // (guard-ai S8, A7) facing the last known position (else +z), not a random yaw; (S24, A150) the freshest intruder's
      const yaw = this.lkpValid ? Math.atan2(this.lkp.x - at.x, this.lkp.z - at.z) : 0;
      const e = this.spawn(kind, at.add(new Vector3((i - (n - 1) / 2) * 1.2, 0, (i % 2) * 1.1)), true, yaw);
      if (!e) continue;
      // (guard-ai S24) he hunts the alarm caller's intruder
      e.tell(this.alarmHunt);
      out.push(e);
    }
    return out;
  }

  /**
   * Lights went out at a point (a lamp shot out, a wall switch, a circuit cut; every lights-out path comes here).
   * (x, y, z): the fixture (or the switch: where guards walk to); `lightId` the lamp that went (registry id) or
   * `group` the circuit (-1 none: the point itself is the fixture).
   *
   * Coordinated (guard-ai S2, M1 goal 4): one `light` incident on the board. Its perceivers are the calm guards who SAW
   * it go: the fixture inside their sight field and range (the peripheral range counts, it is a bright change) with
   * one line-of-sight ray to it, or a fixture in the room they stand in (the room goes dark). No more 25 m / 14 m
   * through walls. The board sends one, or two when a second guard who saw it is within `INCIDENT.lightPairR` of it;
   * they check the light and its area and go back to normal (`Enemy.checkLight`); the others look a moment. The
   * bulb's pop and the round's impact (plain noises right there) merge into it: one event, not three.
   * Uncoordinated (Hunter, Mission): the old rule (the nearest calm guard within 25 m walks over, the rest within
   * 14 m look).
   */
  lightsOut(x: number, z: number, y = Number.NaN, lightId = -1, group = -1): void {
    if (!this.coordinated) {
      this.lightsOutOld(x, z, y);
      return;
    }
    const reg = this.world.level.lights;
    const fy = y === y ? y : this.nav.heightAt(x, z) + 2.5;
    const rooms = this.ctx.rooms;
    const list = this.enemies;
    this.hearRoom(list.length);
    const who = this.hearWho;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (!e.alive || e.alerted || e.passive || e.taken || e.def.melee) continue;
      const er = rooms.length ? roomAt(rooms, e.pos.x, e.pos.z, e.pos.y + 0.1) : -1;
      let saw = false;
      if (lightId >= 0 || group >= 0) {
        const ls = reg.lights;
        // the room he stands in goes dark (no ray), else the first fixture in view gets the one ray
        for (let k = 0; k < ls.length && !saw; k++) {
          const l = ls[k]!;
          if (lightId >= 0 ? l.id !== lightId : l.group !== group) continue;
          if (er >= 0 && roomAt(rooms, l.x, l.z, l.y - 1.5) === er) saw = true;
        }
        for (let k = 0; k < ls.length && !saw; k++) {
          const l = ls[k]!;
          if (lightId >= 0 ? l.id !== lightId : l.group !== group) continue;
          if (this.inSight(e, l.x, l.y, l.z)) {
            saw = this.seesPoint(e, l.x, l.y, l.z);
            break;
          }
        }
      } else {
        saw = (er >= 0 && roomAt(rooms, x, z, fy - 1.5) === er) || (this.inSight(e, x, fy, z) && this.seesPoint(e, x, fy, z));
      }
      // (guard-ai S5) a high-security post who saw it is lured to his leash edge, never sent by the board
      if (saw) {
        if (e.secure) e.lureTo(x, z, 0);
        else who[n++] = e.num;
      }
    }
    // the incident sits on the floor under the light (rough storey pick: 2.5 m under the fixture), where guards walk to
    const floor = this.nav.heightAt(x, z, fy - 2.5);
    // (guard-ai S15, A42) a circuit switched off at its switch: a fault (one goes to turn it back on), or tampering
    // (a circuit cut some other way, its switches still on: the S2 light incident as before)
    if (group >= 0 && lightId < 0 && BREAKER.reset && this.breakers?.isOff(group)) {
      this.circuitOut(group, x, this.switchFloor(x, z, fy - 2.5), z, n, true);
      return;
    }
    const key = lightId >= 0 ? lightId : group >= 0 ? CIRCUIT_KEY + group : -1;
    this.report('light', x, floor, z, key, n);
  }

  /**
   * (guard-ai S15, A42) Circuit `group` went dark at its switch (x, floor y, z), seen by the `n` guards in `hearWho`. The
   * first cut the guards notice is a fault: a `breaker` incident (one of them walks over at patrol pace and turns it
   * back on, `Enemy.resetBreaker`); another noticed within `BREAKER.repeatT` s of the last is tampering: the S2 light
   * incident at the switch (1-2 check it and the ring). Nobody saw it: nothing now (late discovery may find it).
   * `fresh`: a new cut (the press); false: a late find of the cut as it stands. The same cut noticed again (seen at the
   * time by guards who could not go, found later) is what it was then, a fault or tampering, its clock unchanged.
   */
  private circuitOut(group: number, x: number, y: number, z: number, n: number, fresh: boolean): void {
    if (fresh) this.cutSeq.set(group, (this.cutSeq.get(group) ?? 0) + 1);
    if (n === 0) return;
    const now = this.board.now;
    const cut = this.cutSeq.get(group) ?? 0;
    let tamper: boolean;
    if (this.faultCut.get(group) === cut) tamper = this.faultTamper.get(group) === true;
    else {
      const last = this.lastFault.get(group);
      tamper = last !== undefined && now - last < BREAKER.repeatT;
      this.lastFault.set(group, now);
      this.faultCut.set(group, cut);
      this.faultTamper.set(group, tamper);
    }
    this.report(tamper ? 'light' : 'breaker', x, y, z, CIRCUIT_KEY + group, n);
  }

  /**
   * (guard-ai S15, A43) Late discovery, every `LATE_SCAN.tick` s: a share of the guards (round robin, each about
   * `LATE_SCAN.perGuardHz` times a second) look for a dark fixture nobody has reacted to (`DarkList`: shot out, or its
   * circuit switched off) inside their focused sight cone within `LATE.range` m, with one line-of-sight ray. The first
   * found is reported as a witness would have: a shot lamp -> the S2 light check (he alone saw it: one goes); a cut ->
   * the breaker walk at the circuit's switch (or tampering inside `BREAKER.repeatT`). Once per fixture / circuit state
   * change (`DarkList.known`). Reads the light registry and collision only; no allocation.
   */
  private lateStep(): void {
    const reg = this.world.level.lights;
    const dl = this.dark;
    dl.refresh(reg, this.breakers);
    if (dl.n === 0) return;
    const list = this.enemies;
    const N = list.length;
    if (N === 0) return;
    const P = PERCEPTION;
    const range = Math.min(LATE.range, P.focusRange);
    const per = Math.min(N, Math.max(1, Math.ceil(N * LATE_SCAN.tick * LATE_SCAN.perGuardHz)));
    const ls = reg.lights;
    for (let j = 0; j < per; j++) {
      if (this.lateK >= N) this.lateK = 0;
      const e = list[this.lateK++]!;
      if (!e.alive || e.alerted || e.passive || e.taken || e.def.melee || e.dog || e.secure || e.runningAlarm || e.incident >= 0) continue;
      if (e.level !== 'unaware' && e.level !== 'cooldown') continue;
      const ey = e.pos.y + EYE_STAND * e.def.scale;
      for (let q = 0; q < dl.n; q++) {
        const l = ls[dl.ids[q]!];
        if (!l) continue;
        if (hyp3(l.x - e.pos.x, l.y - ey, l.z - e.pos.z) > range) continue;
        // a dark fixture is not a bright change: the focused cone only (no peripheral field)
        if (!lightInView(e.pos.x, ey, e.pos.z, e.yaw, l.x, l.y, l.z, P.focusHalf, range, 0, 0)) continue;
        if (!this.seesPoint(e, l.x, l.y, l.z)) continue;
        this.lateFind(e, l);
        return;
      }
    }
  }

  /** (guard-ai S15) Guard `e` found dark fixture `l` late: report it as its witness. */
  private lateFind(e: Enemy, l: LightDef): void {
    const reg = this.world.level.lights;
    this.lateFinds++;
    this.hearWho[0] = e.num;
    if (l.destroyed) {
      this.dark.markLight(l.id, DARK_SHOT);
      this.report('light', l.x, this.nav.heightAt(l.x, l.z, l.y - 2.5), l.z, l.id, 1);
      return;
    }
    this.dark.markGroup(reg, l.group);
    const s = this.swP;
    if (!this.breakers || !this.breakers.switchOf(l.group, e.pos.x, e.pos.z, s)) return;
    this.circuitOut(l.group, s[0]!, this.switchFloor(s[0]!, s[2]!, s[1]!), s[2]!, 1, false);
  }

  // ----- (guard-ai S22, Michael's walk of 4.72 G6) security consoles -----

  /**
   * (guard-ai S22) The game reports every toggle of security console `id` (its point: x, the floor it stands on y, z;
   * `on` after the toggle): the player's press, a timed loop running out, a restart, a guard's reset. A switch-off seen
   * at once (a calm, free guard with its screens in his sight field and a clear line, `consoleInView`) is noticed now;
   * else the next guard who sees it off notices it (`consoleStep`): a fault, the one walker turns it back on (the S15
   * breaker walk, `ConsoleHost.reset`); a second cut noticed inside `BREAKER.repeatT` s is tampering, the S2 light check
   * at the console, then a reset walk. Coordinated modes only (the parked modes ignore consoles).
   */
  consoleState(id: string, x: number, y: number, z: number, on: boolean): void {
    if (!this.coordinated || !CONSOLE_FAULT.enabled) return;
    const c = this.consoles;
    const i = c.set(id, x, y, z, on);
    if (!c.fresh || !c.pending(i, this.board.now, this.consoleBusy(i))) return;
    const list = this.enemies;
    this.hearRoom(list.length);
    const who = this.hearWho;
    let n = 0;
    for (let k = 0; k < list.length; k++) {
      const e = list[k]!;
      if (this.consoleFree(e) && this.seesConsole(e, i)) who[n++] = e.num;
    }
    if (n > 0) this.consoleNotice(i, n);
  }

  /**
   * (guard-ai S22) Is guard `e` watching the console at (x, floor y, z) now: awake, calm and free (not distracted: no
   * board task, investigation or search), its screens in his sight field with a clear line? For the game's refusal
   * ("the guard is watching the monitors"), so a console may be used while its guard is drawn away (`slices/S22.md`).
   */
  watchesConsole(e: Enemy, x: number, y: number, z: number): boolean {
    return this.consoleFree(e) && this.seesConsoleAt(e, x, y + CONSOLE_FAULT.screenY, z, y);
  }

  /** (guard-ai S22) A guard who may notice a console off: alive, calm (unaware or cooldown), on no task, not a dog, a
   *  melee kind, a high-security post (the board never sends one), held or running the alarm. */
  private consoleFree(e: Enemy): boolean {
    if (!e.alive || e.alerted || e.passive || e.taken || e.def.melee || e.dog || e.secure || e.runningAlarm || e.incident >= 0) return false;
    return e.level === 'unaware' || e.level === 'cooldown';
  }

  /** (guard-ai S22) Guard `e` sees console `i`'s screens. */
  private seesConsole(e: Enemy, i: number): boolean {
    const c = this.consoles;
    const y = c.y[i]!;
    return this.seesConsoleAt(e, c.x[i]!, y + CONSOLE_FAULT.screenY, c.z[i]!, y);
  }

  /** (guard-ai S22) The screen point (x, y, z) of a console on floor `fy` inside his sight field (`consoleInView`) with
   *  a clear line, or in the room he stands in (no wall between). One ray at most. */
  private seesConsoleAt(e: Enemy, x: number, y: number, z: number, fy: number): boolean {
    const ey = e.pos.y + EYE_STAND * e.def.scale;
    if (!consoleInView(e.pos.x, ey, e.pos.z, e.yaw, x, y, z)) return false;
    const rooms = this.ctx.rooms;
    if (rooms.length) {
      const er = roomAt(rooms, e.pos.x, e.pos.z, e.pos.y + 0.1);
      if (er >= 0 && roomAt(rooms, x, z, fy + 0.1) === er) return true;
    }
    return this.seesPoint(e, x, y, z);
  }

  /** (guard-ai S22) Someone is on console `i` now: a guard walking to turn it back on, or its incident still open. */
  private consoleBusy(i: number): boolean {
    const c = this.consoles;
    const inc = c.inc[i]!;
    if (inc >= 0 && this.board.slotOf(inc) >= 0) return true;
    const g = c.group(i);
    const list = this.enemies;
    for (let k = 0; k < list.length; k++) {
      const e = list[k]!;
      if (e.alive && e.breakerGroup === g) return true;
    }
    return false;
  }

  /** (guard-ai S22) The `n` guards in `hearWho` noticed console `i` off: the reset walk (`breaker`, one goes) or, a
   *  second cut inside `BREAKER.repeatT`, the S2 light check at it; at the floor by the console. */
  private consoleNotice(i: number, n: number): void {
    const c = this.consoles;
    const v = c.notice(i, this.board.now);
    this.consoleFinds++;
    const x = c.x[i]!;
    const z = c.z[i]!;
    c.inc[i] = this.report(v === V_TAMPER ? 'light' : 'breaker', x, this.switchFloor(x, z, c.y[i]!), z, CIRCUIT_KEY + c.group(i), n);
  }

  /** (guard-ai S22) A guard worked console group `g`: back on through the game's own toggle path. */
  private consoleReset(g: number): void {
    const c = this.consoles;
    const i = c.ofGroup(g);
    if (i < 0 || c.on[i] === 1 || !this.consoleHost) return;
    if (!this.consoleHost.reset(c.ids[i]!)) return;
    c.on[i] = 1;
    this.consoleResets++;
  }

  /**
   * (guard-ai S22) Every `LATE_SCAN.tick` s: a share of the guards (round robin, as late discovery, each about
   * `LATE_SCAN.perGuardHz` times a second) look for a console that is off and nobody is on; the first who sees one
   * notices it. No console off: one pass over the consoles. No allocation.
   */
  private consoleStep(): void {
    const c = this.consoles;
    const now = this.board.now;
    let any = false;
    for (let i = 0; i < c.n; i++) {
      if (c.pending(i, now, false)) {
        any = true;
        break;
      }
    }
    if (!any) return;
    const list = this.enemies;
    const N = list.length;
    if (N === 0) return;
    const per = Math.min(N, Math.max(1, Math.ceil(N * LATE_SCAN.tick * LATE_SCAN.perGuardHz)));
    for (let j = 0; j < per; j++) {
      if (this.conK >= N) this.conK = 0;
      const e = list[this.conK++]!;
      if (!this.consoleFree(e)) continue;
      for (let i = 0; i < c.n; i++) {
        if (!c.pending(i, now, false) || !this.seesConsole(e, i) || this.consoleBusy(i)) continue;
        this.hearWho[0] = e.num;
        this.consoleNotice(i, 1);
        return;
      }
    }
  }

  /** (guard-ai S15 laptop fix) The floor a guard stands on to work the switch at (x, z) whose floor is about `y`: the
   *  nearest walkable cell's height. `heightAt` there reads the wall's own column, whose surface is the wall's top (the
   *  Warehouse floor switch: 3.2 m), and the walker never counted as at the switch. */
  private switchFloor(x: number, z: number, y: number): number {
    const nav = this.nav;
    const c = nav.nearestWalkable(x, z, 4, y);
    return c >= 0 ? nav.cellHeight(c) : nav.heightAt(x, z, y);
  }

  /** Is the point inside this guard's sight field and range (a light going out: the peripheral range counts)? */
  private inSight(e: Enemy, x: number, y: number, z: number): boolean {
    const P = PERCEPTION;
    return lightInView(e.pos.x, e.pos.y + EYE_STAND * e.def.scale, e.pos.z, e.yaw, x, y, z, P.focusHalf, P.focusRange, P.periphHalf, P.periphRange);
  }

  /** One line-of-sight ray from the guard's eye to the point (static geometry; the last 0.4 m is slack: the fixture's
   *  own fitting). */
  private seesPoint(e: Enemy, x: number, y: number, z: number): boolean {
    const ey = e.pos.y + EYE_STAND * e.def.scale;
    const dx = x - e.pos.x;
    const dy = y - ey;
    const dz = z - e.pos.z;
    const d = hyp3(dx, dy, dz);
    const k = d > 0.4 ? (d - 0.4) / d : 0;
    this.earA.set(e.pos.x, ey, e.pos.z);
    this.earB.set(e.pos.x + dx * k, ey + dy * k, e.pos.z + dz * k);
    return this.ballistics.clear(this.earA, this.earB, MASK.SIGHT);
  }

  /** The old lights-out rule (uncoordinated modes): the nearest calm enemy within 25 m comes to look (with a
   *  flashlight in the dark), others within 14 m turn to look. No walls, no line of sight. `y` (the fixture, or a wall
   *  switch + 2.5) limits the one who comes to look to the floor under it (sector-redesign): his feet not above `y` and at
   *  most `LIGHTS_OUT_BELOW` under it, so a guard two storeys up over an atrium is not sent to a ground-floor switch, nor
   *  one two floors down to an L2 switch. */
  private lightsOutOld(x: number, z: number, y = Number.NaN): void {
    let best: Enemy | null = null;
    let bd = 25;
    const floor = !Number.isNaN(y);
    for (const e of this.enemies) {
      if (!e.alive || e.alerted || e.def.melee) continue;
      if (floor && (e.pos.y > y || y - e.pos.y > LIGHTS_OUT_BELOW)) continue;
      const d = hyp2(e.pos.x - x, e.pos.z - z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    for (const e of this.enemies) {
      if (!e.alive || e.alerted || e === best) continue;
      if (hyp2(e.pos.x - x, e.pos.z - z) < 14) e.notice(x, z, 0.32);
    }
    best?.hear(x, z, Math.max(6, bd * 1.6));
  }

  /** Assign the alarm runner: an alerted enemy near a working panel (stealth rules only). */
  private assignAlarm(): void {
    if (!this.stealth || this.alarmRaised || !this.alarms.length) return;
    const r = this.alarmRunner;
    if (r && r.alive && r.alerted && r.runningAlarm) return;
    this.alarmRunner = null;
    let best: Enemy | null = null;
    let bp: AlarmPanel | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || !e.alerted || e.def.melee) continue;
      const p = nearestPanel(this.alarms, e.pos.x, e.pos.z, 2, e.pos.y);
      if (!p) continue;
      // (guard-ai S5, A10) a high-security post never runs to a panel outside his leash
      if (!e.inLeash(p.x, p.z, 1)) continue;
      // an officer calls it in himself; (guard-ai S5b) a supervisor (role) before an officer
      const d = hyp2(p.x - e.pos.x, p.z - e.pos.z) * alarmRunMul(e.roleFlags, e.def.kind === 'officer');
      if (d < bd) {
        bd = d;
        best = e;
        bp = p;
      }
    }
    if (best && bp) {
      best.runAlarm(bp);
      this.alarmRunner = best;
    }
  }

  /** Flashlights: enemies looking for something in the dark switch one on; it follows their head. */
  private updateTorches(): void {
    const ts = this.torches;
    if (!ts.length) return;
    const reg = this.world.level.lights;
    const field = this.world.lightField;
    // release
    for (let i = 0; i < ts.length; i++) {
      const o = this.torchOwner[i];
      if (o && !(o.alive && o.torchWanted(field, true))) {
        this.torchOwner[i] = null;
        reg.setOn(ts[i]!.id, false);
      }
    }
    // acquire
    for (const e of this.enemies) {
      if (!e.alive || this.torchOwner.includes(e) || !e.torchWanted(field)) continue;
      const k = this.torchOwner.indexOf(null);
      if (k < 0) break;
      this.torchOwner[k] = e;
      reg.setOn(ts[k]!.id, true);
    }
    // follow; the beam stops at the first wall (rays along the centre and the cone's edges, round robin at 15 Hz
    // per torch), so it never lights the room behind
    this.torchTick = (this.torchTick + 1) % ts.length;
    for (let i = 0; i < ts.length; i++) {
      const o = this.torchOwner[i];
      if (!o) continue;
      const l = ts[i]!;
      o.placeTorch(l);
      if (i === this.torchTick || l.reach === undefined) l.reach = this.beamReach(l);
    }
  }

  private torchTick = 0;

  /** (shadow audit, `shadowAccuracy.ts`; default off) A body's light for the guards: flashlights tested against static
   *  geometry, as the player's light is (`GameState.lightOccluder`), so a torch behind a wall does not light a body. */
  private readonly bodyOccluder: Occluder | undefined = shadowAccuracyOn() ? rayOccluder((ax, ay, az, bx, by, bz) => this.beamHit(ax, ay, az, bx, by, bz)) : undefined;

  /** Longest unobstructed run of a cone light (`beamReach` in `world/torches.ts`, shared with the co-op client). */
  private beamReach(l: LightDef): number {
    return beamReach(l, this.beamHit);
  }

  /** One static-geometry ray for `beamReach` (allocation-free: two kept vectors). */
  private readonly beamHit: BeamHit = (ax, ay, az, bx, by, bz) => this.ballistics.hitDistance(this.earA.set(ax, ay, az), this.earB.set(bx, by, bz), G.STATIC);

  /** Who has a flashlight on (tests / debug). */
  get torchesOn(): number {
    let n = 0;
    for (const o of this.torchOwner) if (o) n++;
    return n;
  }

  /** (coop-torches) Does this guard hold a lit flashlight (the co-op snapshot's torch bit)? Allocation-free. */
  hasTorch(e: Enemy): boolean {
    for (let i = 0; i < this.torchOwner.length; i++) if (this.torchOwner[i] === e) return true;
    return false;
  }

  /**
   * Wake a knocked-out victim: back on their feet, searching. (guard-ai S4) He is the same guard (`Enemy.inherit`: key,
   * route, post, squad, room, what he knows), facing as he went down (A7: no random yaw); `by` woke him (`woke`).
   */
  private revive(b: Body, by: Enemy | null = null): void {
    if (!b.present || b.lethal) return;
    const old = b.guard;
    const e = new Enemy(this.ctx, b.def, b.pos.clone(), old ? old.yaw : 0);
    e.health.damage(e.health.maxHp * 0.4);
    if (old) {
      e.inherit(old, b.age);
      this.swapSquad(old, e);
      this.swapSlot(old, e);
      // (guard-ai S13) a response team member takes his place in the team again and never calms (he had fought)
      const tm = old.crew;
      if (tm) {
        tm.swap(old, e);
        e.crew = tm;
        old.crew = null;
        e.aware.fought = true;
      }
    }
    // (guard-ai S13, A37) the alarm stage's gear on top of what he went down in
    this.giveStageGear(e);
    this.enemies.push(e);
    this.removeBody(b);
    e.searchAt(e.pos.x, e.pos.z, null);
    if (by) this.woke(by, e);
    this.onRevived?.(e, b);
  }

  /** (guard-ai S4) A woken guard takes his old self's place on the squad roster (radio checks). */
  private swapSquad(old: Enemy, e: Enemy): void {
    this.silent.delete(old);
    if (old.squad < 0) return;
    const r = this.squads.get(old.squad);
    if (!r) return;
    const k = r.indexOf(old);
    if (k >= 0) r[k] = e;
    else if (!r.includes(e)) r.push(e);
  }

  /** (guard-ai S5b) A woken guard takes his old self's slot (`guardAtSlot`) and his dog (it heels on him again). */
  private swapSlot(old: Enemy, e: Enemy): void {
    const k = e.slotIdx;
    if (k >= 0 && k < this.slotGuard.length && this.slotGuard[k] === old) this.slotGuard[k] = e;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const d = list[i]!;
      if (d.handler !== old) continue;
      d.handler = e;
      d.leader = e;
    }
  }

  /**
   * (guard-ai S5b, ENGINE.md section 7 `handler`) A guard went down: a dog bound to him (alive, calm, not held) stays by
   * him (`Enemy.findLeader` keeps him), searches round him and barks: a noise of `TAGS.dogBark` m at the dog, which the
   * guards in reach hear (the board sends one; the dog itself is skipped).
   */
  private handlerDown(h: Enemy): void {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const d = list[i]!;
      if (d.handler !== h || !d.alive || d.alerted || d.taken) continue;
      d.searchAt(h.pos.x, h.pos.z, null);
      d.bark('dog');
      this.hear(d.pos, TAGS.dogBark, 'noise', d);
    }
  }

  /**
   * (guard-ai S4, M3, A4) `by` woke `e`: both search round the spot `CAUTION.koSearch` s, stay cautious `koCautious`
   * s, then normal (`awareness.startKo`; a hold the woken guard knew of holds again, A3). `by` radios it (`ko` call:
   * "Found him out cold"; the section only acknowledges it, nobody else turns cautious).
   */
  private woke(by: Enemy, e: Enemy): void {
    if (!this.coordinated) return;
    this.awareness.startKo(by.key, e.key);
    by.koSearch(e.pos.x, e.pos.z);
    this.radioNet.startCall(by.num, -1, 'ko', callHold('ko', this.reactionOf(by)));
    this.syncCaution();
  }

  /** (guard-ai S4) A guard went down (killed or knocked out; coordinated): the awareness roster, then who saw it. */
  private downed(e: Enemy): void {
    this.awareness.onDown(e.key, !e.ko);
    this.witnessKill(e);
    this.syncCaution();
  }

  /**
   * (guard-ai S4, design 4, M1) A guard went down in view: every calm guard who would notice his body there (the body
   * rule `bodyNoticed`: field of view, the light on him, distance to `BODY.range`) with one line-of-sight ray saw it.
   * The nearest finds the body at once (`bodyFound`: dead -> the shout, the report, held caution for every witness;
   * knocked out -> he goes to wake him, M1 "wake them up (if knocked out)", A14). A dog leaves no body: the witnesses
   * are held and the nearest searches and radios it. A witness who sees the player too is in combat by his own sight.
   */
  private witnessKill(v: Enemy): void {
    const list = this.enemies;
    const vx = v.pos.x;
    const vy = v.pos.y;
    const vz = v.pos.z;
    const light = this.world.lightField.totalAt(vx, vy + 0.2, vz, this.bodyOccluder);
    let mask = 0;
    let n = 0;
    let first: Enemy | null = null;
    let fd = Infinity;
    for (let i = 0; i < list.length; i++) {
      const o = list[i]!;
      if (o === v || !o.alive || o.alerted || o.taken || o.passive || o.def.melee || o.dog) continue;
      const d = hyp3(vx - o.pos.x, vy - o.pos.y, vz - o.pos.z);
      if (d >= BODY.range) continue;
      let a = Math.atan2(vx - o.pos.x, vz - o.pos.z) - o.yaw;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if (!bodyNoticed(d, a, light) || !this.seesPoint(o, vx, vy + 0.9, vz)) continue;
      n++;
      mask = (mask | keyBit(o.key)) >>> 0;
      if (d < fd) {
        fd = d;
        first = o;
      }
    }
    this.lastWitnesses = n;
    if (!first) return;
    this.killsWitnessed++;
    const bs = this.bodies;
    let b: Body | null = null;
    for (let i = 0; i < bs.length; i++) if (bs[i]!.enemyId === v.id) b = bs[i]!;
    if (b && b.present && !b.found) {
      this.bodyFound(first, b, b.lethal ? mask : 0);
      return;
    }
    // no body to find (a dog): the witnesses are held, the nearest searches and radios it
    first.bark('body');
    first.searchAt(vx, vz, null);
    const h = this.awareness.openHold('witness', mask);
    this.lastHold = h;
    this.radioNet.startCall(first.num, h, 'body', callHold('body', this.reactionOf(first)));
  }

  /** (guard-ai S4) Every guard's caution from the awareness table (5 Hz and after each change; no allocation). */
  private syncCaution(): void {
    const list = this.enemies;
    const aw = this.awareness;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (!e.alive) continue;
      const c = e.key >= 0 ? aw.cautionOf(e.key) : 0;
      if (c !== e.caution) e.setCaution(c);
    }
  }

  /** (guard-ai S4) The lowest guard key not held by a guard on the list or by a knocked-out body (he may be woken);
   *  -1 when all `MAX_KEYS` are taken. A dead guard's key is free again (`awareness.resetKey` on reuse). */
  private freeKey(): number {
    let used = 0;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) used |= keyBit(list[i]!.key);
    const bs = this.bodies;
    for (let i = 0; i < bs.length; i++) if (!bs[i]!.lethal) used |= keyBit(bs[i]!.guardKey);
    for (let k = 0; k < MAX_KEYS; k++) if (!(used & keyBit(k))) return k;
    return -1;
  }

  /** (guard-ai S4) A guard's caution (0 none, 1 timed, 2 held; tests / e2e). */
  cautionOf(e: Enemy): number {
    return e.key >= 0 && this.coordinated ? this.awareness.cautionOf(e.key) : 0;
  }

  private releaseCover(e: Enemy): void {
    // (guard-ai S8) and the cover set's mirror
    const ow = this.coverSet.owner;
    for (const [k, v] of this.coverOwner) {
      if (v !== e) continue;
      this.coverOwner.delete(k);
      if (k >= 0 && k < ow.length && ow[k] === e.num) ow[k] = -1;
    }
    e.coverIdx = -1;
  }

  get alive(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  /**
   * Remove a guard entirely (Sector Ops unloads a section): alive, knocked out or dead, with its body or ragdoll, its
   * recon drone, its squad place and its jobs (alarm run, flank, flashlight, cover). What `clear` does, for one guard.
   * No kill event: the co-op host stops reporting it, so the client drops its puppet without a ragdoll (`onSnap`, the
   * stale sweep) and its kept ragdoll (gone from the snapshot's `bodies`). Not for a guard held in a takedown.
   */
  despawn(e: Enemy): void {
    let k = this.enemies.indexOf(e);
    if (k >= 0) this.enemies.splice(k, 1);
    k = this.dogCorpses.indexOf(e);
    if (k >= 0) this.dogCorpses.splice(k, 1);
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i]!;
      if (d.operator !== e) continue;
      d.dispose();
      this.drones.splice(i, 1);
    }
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i]!;
      if (b.enemyId === e.id) this.removeBody(b);
    }
    for (const [, roster] of this.squads) {
      const j = roster.indexOf(e);
      if (j >= 0) roster.splice(j, 1);
    }
    this.silent.delete(e);
    // (guard-ai S13) out of his response team
    if (e.crew) {
      e.crew.remove(e);
      e.crew = null;
    }
    // (guard-ai S5b) out of his slot; his dog finds a squad mate again
    if (e.slotIdx >= 0 && this.slotGuard[e.slotIdx] === e) this.slotGuard[e.slotIdx] = null;
    for (let i = 0; i < this.enemies.length; i++) {
      const d = this.enemies[i]!;
      if (d.handler !== e) continue;
      d.handler = null;
      d.leader = null;
    }
    if (this.lastCheckCaller === e) this.lastCheckCaller = null;
    // (guard-ai S3) gone mid-call: the call is lost (his queued receptions are skipped: he is out of the view)
    this.radioNet.cut(e.num);
    // (guard-ai S4) gone for good: out of every hold, as if dead
    if (e.key >= 0) this.awareness.onDown(e.key, true);
    if (this.alarmRunner === e) this.alarmRunner = null;
    if (this.flanker === e) this.flanker = null;
    for (let i = 0; i < this.torchOwner.length; i++) {
      if (this.torchOwner[i] !== e) continue;
      this.torchOwner[i] = null;
      this.world.level.lights.setOn(this.torches[i]!.id, false);
    }
    this.releaseCover(e);
    // (guard-ai S24) gone: he hunts nobody (his intruder may be forgotten)
    e.hunt = -1;
    e.dispose();
  }

  /** Remove every guard, body and drone (a Sector Ops unload): `clear`, and the last known position is forgotten. */
  despawnAll(): void {
    this.clear();
    this.lkpValid = false;
    this.sightT = 99;
  }

  /**
   * (sector-restart, M9) A checkpoint restart: every guard, body and drone goes (`despawnAll`) and the manager's memory
   * is back at its match-start state, so the guards that load next start unaware on their routes. Cleared: the shared
   * last known position and its chase field, the time since a sighting, the alarm (raised flag and runner), the
   * flanker, the squad rosters and silent members, the grenade, radio-check, alarm-assign and buff clocks, and every
   * player's `spotted` flag. The tallies (kills, bodies found, radio checks) stay: they are the run's.
   */
  resetMemory(): void {
    this.despawnAll();
    this.resetAlarm();
    this.lkp.setAll(0);
    this.flowField.fill(Infinity);
    this.flowT = 0;
    // (guard-ai S24) and every intruder's chase field
    for (let i = 0; i < MAX_INTRUDERS; i++) this.slotFlow[i]?.fill(Infinity);
    this.slotFlowVer.fill(-1);
    this.slotFlowT.fill(0);
    this.slotFlowRR = 0;
    this.alarmT = 0;
    this.buffT = 0;
    this.grenadeT = 0;
    this.radioT = ARCHETYPE.radio.period;
    this.radioSeq = 0;
    const ps = this.players();
    for (let i = 0; i < ps.length; i++) ps[i]!.spotted = false;
    // (guard-ai S15) the new guards know of no dark fixture or cut circuit
    this.dark.clear();
    this.lastFault.clear();
    // (guard-ai S22) nor of a console off
    this.consoles.clear();
  }

  /**
   * (guard-ai S24 levels triage) A guard spawned alerted (the parked modes' reinforcements: Mission's pressure spawns,
   * Clear's alarm squads, `reinforce`; tests) is sent in by command: he is told of the intruder command knows of
   * (`commandHunt`) before he goes to combat, so he hunts that slot's last known position (and his contact names it).
   * Before this he had none and stood where he spawned (A148 left him no position). Nobody known: none (A148, G139: he
   * never goes for a player nobody saw or located).
   */
  private sendIn(e: Enemy): void {
    e.tell(this.commandHunt());
    e.alert();
  }

  /** (guard-ai S24 levels triage) The intruder command knows of: the alarm's while its position is valid, else the
   *  freshest (A150, as the response teams); -1 none. */
  private commandHunt(): number {
    const a = this.alarmHunt;
    return a >= 0 && this.intruders.valid[a] === 1 ? a : this.intruders.freshest;
  }

  spawn(kind: EnemyKind, pos: Vector3, alerted = true, yaw = 0): Enemy | null {
    if (this.alive >= this.maxAlive) return null;
    const c = this.nav.nearestWalkable(pos.x, pos.z, 8, pos.y);
    if (c < 0) return null;
    const [x, z] = this.nav.center(c);
    const e = new Enemy(this.ctx, ENEMIES[kind], new Vector3(x, this.nav.height[c]!, z), yaw);
    // (guard-ai S4) his stable key: a clean slate in the awareness roster
    e.key = this.freeKey();
    if (e.key >= 0) this.awareness.resetKey(e.key);
    if (alerted) this.sendIn(e);
    this.enemies.push(e);
    if (kind === 'droneOp') this.drones.push(new ReconDrone(this.scene, this.world.parts, this.registry, this.ballistics, this.vfx, e));
    return e;
  }

  /**
   * (guard-ai S5) A map mode placed guard `e` from `slot` in section `section` (call right after `spawn` and
   * `setPatrol`): his post (`slot.post`: a leash round his spawn point, facing `slot.yaw`; a high-security post never
   * leaves it, `posts.ts`), his behaviour profile and his section (Sector Ops passes the `SectorDef` index; omitted: the
   * `MapLayout.guardAi` zone he stands in, else 0).
   *
   * (guard-ai S5b) The sector tags (`sectorTags.ts`; ENGINE.md section 7), read as they are. `slots` (the section's
   * guard list, `SectorDef.guards`) and `index` (this slot's place in it) let the tags that name other slots work:
   * `squad` (none: the default cluster of posts within 12 m), a dog's `handler`, and `pair` (stored for S10). Without
   * `slots` only a hand-set `squad` joins. `zone`: a secure zone answers first inside its circle. `role`: radio-check
   * caller (desk), alarm runner (supervisor), light checker (rover first). `reason` is stored.
   *
   * (guard-ai S12) His gear: the slot's `gear` tag merged with the section default `sectionGear` (`SectorDef.gear`);
   * neither = no gear (Marlow Yard and the early sections are unchanged).
   */
  placeSlot(
    e: Enemy,
    slot: Pick<SquadSlot, 'yaw' | 'post' | 'profile'> & GuardSlotTags & { x?: number; z?: number; route?: [number, number][] },
    section?: number,
    slots?: readonly (GuardSlotTags & { x: number; z: number; y?: number })[],
    index = -1,
    sectionGear?: GearTag,
  ): void {
    e.section = section ?? sectionAt(this.world.layout.guardAi, e.pos.x, e.pos.z);
    e.profile = slot.profile ?? 'standard';
    e.setGear(mergeGear(gearFromTag(slot.gear, this.gearA), gearFromTag(sectionGear, this.gearB), this.gearA));
    // (guard-ai S13, A37) and the alarm stage's gear on top (a later spawn: next section, a restart at a carried stage,
    // a reinforcement)
    this.giveStageGear(e);
    // (guard-ai S8, A25) the squad-roles profile: a posted guard holds and watches (never point / flank), an aggressive
    // slot bounds first
    e.tacticsProfile = slot.post ? P_POST : slot.profile === 'aggressive' ? P_AGGRESSIVE : P_STANDARD;
    e.setPost(slot.post ?? null, slot.yaw);
    // (guard-ai S5b) the tags
    e.zone = slot.zone ?? '';
    e.job = slot.role ?? '';
    e.roleFlags = roleFlags(slot.role);
    e.reason = slot.reason ?? '';
    e.pairSlot = slot.pair ?? -1;
    e.zoneX = e.pos.x;
    e.zoneZ = e.pos.z;
    e.zoneR = isSecureZone(slot.zone) ? zoneRadius({ zone: slot.zone, post: slot.post, x: slot.x ?? e.pos.x, z: slot.z ?? e.pos.z, route: slot.route }) : 0;
    const inList = slots !== undefined && index >= 0 && index < slots.length;
    let sq = -1;
    if (inList) {
      if (slots !== this.tagSlots) {
        if (this.tagSquad.length < slots.length) this.tagSquad = new Int32Array(slots.length);
        slotSquads(slots, e.section, this.tagSquad);
        this.tagSlots = slots;
        // (guard-ai S10) a new section's list: its own pairs (nobody left standing in an old pair's hold)
        for (let k = 0; k < this.slotGuard.length; k++) {
          const o = this.slotGuard[k];
          if (o) o.pairFace = Number.NaN;
        }
        this.slotGuard.length = 0;
        this.pairs.length = 0;
      }
      sq = this.tagSquad[index]!;
      e.slotIdx = index;
      while (this.slotGuard.length < slots.length) this.slotGuard.push(null);
      // (guard-ai S10) a guard the slot held before is out of its pair: no hold left on him
      const prev = this.slotGuard[index];
      if (prev && prev !== e) prev.pairFace = Number.NaN;
      this.slotGuard[index] = e;
    } else if (slot.squad !== undefined) sq = squadId(e.section, slot.squad);
    // a dog with a handler: bound to him once he is placed (his squad then); else the slot's squad
    e.handlerSlot = e.dog && inList && slot.handler !== undefined ? slot.handler : -1;
    const h = e.handlerSlot >= 0 ? (this.slotGuard[e.handlerSlot] ?? null) : null;
    if (h && h !== e) this.bindDog(e, h);
    else if (sq >= 0) this.joinSquad(e, sq);
    // a handler placed after his dog
    if (inList && !e.dog) {
      const list = this.enemies;
      for (let i = 0; i < list.length; i++) {
        const d = list[i]!;
        if (d.dog && d.handlerSlot === index && d.handler === null) this.bindDog(d, e);
      }
    }
    // (guard-ai S10) the second of a talking pair placed: the pair is built
    if (inList) this.buildPair(e, index);
  }

  /**
   * (guard-ai S10, GA2, ENGINE.md section 7 `pair`) Guard `e` took slot `index`: his partner is the slot his `pair` tag
   * names, or a placed guard whose tag names him (one tag is enough). Both placed: one `PairMeet` (A = the lower slot,
   * id = section x 100 + it), meeting where `pickMeet` says (the nearest stops within `PAIRS.meetMax` whose stays
   * overlap, at the slower walker's speed: a timed loop walks at `walkSpeed`). The two walkers' loop times now line the
   * clocks up (they may have been placed at different moments). No window (no timed loop, periods differ, no overlap):
   * logged (`pairSkips`, a console warning) and skipped. Load time only.
   */
  private buildPair(e: Enemy, index: number): void {
    const sg = this.slotGuard;
    let j = e.pairSlot !== index ? e.pairSlot : -1;
    if (j < 0 || j >= sg.length || !sg[j])
      for (let k = 0; k < sg.length; k++) {
        const o = sg[k];
        if (k !== index && o && o.pairSlot === index) {
          j = k;
          break;
        }
      }
    const o = j >= 0 && j < sg.length ? (sg[j] ?? null) : null;
    if (!o || o === e) return;
    const lo = Math.min(index, j);
    const hi = Math.max(index, j);
    // a slot of a built pair placed again (a guard respawned into it, the same section list): the old pair goes and
    // is built afresh below, its clock lined up with the walkers as they stand now (the old clock ran on the guards
    // that went: kept, it would open the window at the wrong loop time)
    for (let k = 0; k < this.pairs.length; k++) {
      const p = this.pairs[k]!;
      if (p.sa === lo && p.sb === hi) {
        this.pairs.splice(k, 1);
        e.pairFace = Number.NaN;
        o.pairFace = Number.NaN;
        break;
      }
    }
    const A = index === lo ? e : o;
    const B = index === lo ? o : e;
    const id = e.section * 100 + lo;
    const why = this.pairWhyNot(A, B);
    if (why) {
      const msg = `section ${e.section} slots ${lo} + ${hi}: ${why}`;
      this.pairSkips.push(msg);
      console.warn(`guard-ai pairs: ${msg}`);
      return;
    }
    const ra = A.patrolRoute!;
    const rb = B.patrolRoute!;
    const ta = A.loopTime();
    const tb = B.loopTime();
    // the routes as the walkers stand now: loop time `t0` at this moment, the pair's clock starts with them
    const sa = { ...ra, loop: { ...ra.loop!, t0: ta } };
    const sb = { ...rb, loop: { ...rb.loop!, t0: tb } };
    const m = this.pairPick;
    if (!pickMeet(sa, sb, Math.min(A.def.walkSpeed, B.def.walkSpeed), PAIRS.meetMax, m)) {
      const msg = `section ${e.section} slots ${lo} + ${hi}: no overlapping stays at stops within ${PAIRS.meetMax} m`;
      this.pairSkips.push(msg);
      console.warn(`guard-ai pairs: ${msg}`);
      return;
    }
    const pa = ra.points[m.stopA]!;
    const pb = rb.points[m.stopB]!;
    const pm = new PairMeet({ id, period: ra.loop!.period, t0: ta, open: m.open, close: m.close, aPt: [pa[0], pa[1]], bPt: [pb[0], pb[1]] });
    this.pairs.push({ pm, sa: lo, sb: hi });
  }

  /** (guard-ai S10) Why two guards cannot be a talking pair ('' when they can). */
  private pairWhyNot(A: Enemy, B: Enemy): string {
    if (A.dog || B.dog) return 'a dog does not talk';
    const ra = A.patrolRoute;
    const rb = B.patrolRoute;
    if (!ra || !ra.loop || !rb || !rb.loop) return 'not both on a timed loop';
    if (Math.abs(ra.loop.period - rb.loop.period) > 1e-6) return `loop periods differ (${ra.loop.period} / ${rb.loop.period} s)`;
    return '';
  }

  /** (guard-ai S10) Fill one guard's side of a pair (null: not on the list). No allocation. */
  private fillPair(g: PairGuard, e: Enemy | null): void {
    if (!e || !e.alive || e.taken) {
      g.present = false;
      g.calm = false;
      return;
    }
    g.present = true;
    g.calm = e.pairCalm;
    g.x = e.pos.x;
    g.z = e.pos.z;
    const p = e.routePoint(this.pairTmp);
    g.routeX = p[0];
    g.routeZ = p[1];
  }

  /**
   * (guard-ai S10) Every pair, at the board rate, after the guards moved: fill both sides (`present` = alive, not held,
   * on the list; `calm` = `Enemy.pairCalm`), interrupt on a disturbance either reacts to (`Enemy.disturbed`), step,
   * then act: while meeting each holds at his meet point facing the other (`Enemy.pairFace`); a line is said over its
   * speaker (`Enemy.sayLine`); a missing request sends the one who is left (`pairMissing`). A missing pair whose two
   * guards are both up again (the partner woken) starts over. No allocation.
   */
  private pairStep(dt: number): void {
    const list = this.pairs;
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      const pm = p.pm;
      const A = this.guardAtSlot(p.sa);
      const B = this.guardAtSlot(p.sb);
      this.fillPair(pm.a, A);
      this.fillPair(pm.b, B);
      if ((pm.state === 'waiting' || pm.state === 'meeting') && ((pm.a.present && A!.disturbed) || (pm.b.present && B!.disturbed))) pm.interrupt();
      pm.step(dt);
      const meet = pm.state === 'meeting';
      if (A) this.pairHold(A, meet ? pm.faceA : Number.NaN, pm.def.aPt);
      if (B) this.pairHold(B, meet ? pm.faceB : Number.NaN, pm.def.bPt);
      if (pm.sayLine !== null) {
        const s = pm.sayWho === 0 ? A : B;
        if (s && s.alive) {
          s.sayLine(pm.sayLine);
          this.pairLines++;
        }
      }
      if (pm.requested) this.pairMissing(pm, A, B);
      else if (pm.state === 'missing' && pm.a.present && pm.b.present) pm.reset();
    }
  }

  /** (guard-ai S10) Hold `e` at his meet point facing `yaw` (NaN: let him go). */
  private pairHold(e: Enemy, yaw: number, pt: readonly [number, number]): void {
    e.pairFace = yaw;
    e.pairPt[0] = pt[0];
    e.pairPt[1] = pt[1];
  }

  /**
   * (guard-ai S10) A pair's partner never came (down, held, gone): the one left (`lookFor`) looks for him at his last
   * route point (`lookX` / `lookZ`). Coordinated: a `missing` incident there (keyed by the missing guard, as a radio
   * check's miss) with him as its only perceiver, so the board sends him as the lead and the nearest free guard covers
   * (S5b's path); the missing guard counts as missed (the next radio check does not miss him again). Parked modes: he
   * searches there himself.
   */
  private pairMissing(pm: PairMeet, A: Enemy | null, B: Enemy | null): void {
    const goer = pm.lookFor === 0 ? A : B;
    const gone = pm.lookFor === 0 ? B : A;
    if (!goer || !goer.alive) return;
    this.pairMisses++;
    this.counts.missedChecks++;
    if (gone) this.silent.add(gone);
    if (this.coordinated) {
      this.hearWho[0] = goer.num;
      this.report('missing', pm.lookX, goer.pos.y, pm.lookZ, gone ? gone.num : -1, 1);
      // (guard-ai S14, A40) and he radios that his partner is not answering: the section turns cautious once it gets
      // through (take him during the call: nobody else hears)
      this.missingCall(goer, pm.lookX, goer.pos.y, pm.lookZ);
    } else goer.searchAt(pm.lookX, pm.lookZ, null);
  }

  /** (guard-ai S5b) Bind a dog to its handler: it heels on him only and joins his squad. */
  private bindDog(d: Enemy, h: Enemy): void {
    d.handler = h;
    d.leader = h;
    if (h.squad >= 0) this.joinSquad(d, h.squad);
  }

  /** (guard-ai S5b) The guard that holds slot `index` of the section `placeSlot` read last (null none / down for good);
   *  S10's talking pairs find a partner with it. */
  guardAtSlot(index: number): Enemy | null {
    return index >= 0 && index < this.slotGuard.length ? this.slotGuard[index]! : null;
  }

  /** Put an enemy on a squad's roster (radio checks; the dog's handler comes from its squad). */
  joinSquad(e: Enemy, squad: number): void {
    e.squad = squad;
    let r = this.squads.get(squad);
    if (!r) {
      r = [];
      this.squads.set(squad, r);
    }
    if (!r.includes(e)) r.push(e);
  }

  /**
   * Squad radio checks (stealth rules): a calm caller checks in; a silent member gets looked for.
   * (guard-ai S5b) The caller: a desk role of the squad's section (`ROLE_DESK`, calm, the lowest key) calls every squad
   * of it; else the squad's own (a supervisor, else an officer, else the first). A silent member is a down guard nobody
   * has found (a dog is not on the radio). Coordinated modes: a `missing` incident at where he went down, the squad's
   * calm members its perceivers, so the board sends two of them (a lead, and a cover `INCIDENT.pairBack` short); the
   * parked modes: the caller searches there (the old rule).
   */
  radioCheckNow(): void {
    this.radioChecks++;
    const desk = this.deskCaller();
    this.lastCheckCaller = desk;
    if (desk) desk.bark('radioCheck');
    for (const [, roster] of this.squads) {
      let caller: Enemy | null = null;
      let rank = -1;
      let men = 0;
      for (let i = 0; i < roster.length; i++) {
        const m = roster[i]!;
        if (!m.dog) men++;
        if (!m.alive || m.alerted || m.dog || m.taken) continue;
        const r = callerRank(m.roleFlags, m.def.kind === 'officer');
        if (r > rank) {
          rank = r;
          caller = m;
        }
      }
      const r0 = roster[0];
      if (desk && r0 && r0.section === desk.section) caller = desk;
      // (S5b) a squad of one has nobody to answer him: no check of its own (a desk's covers him)
      else if (!caller || caller.level !== 'unaware' || men < 2) continue;
      else {
        caller.bark('radioCheck');
        this.lastCheckCaller ??= caller;
      }
      let first: Enemy | null = null;
      for (let i = 0; i < roster.length; i++) {
        const m = roster[i]!;
        if (m.alive || m.dog || this.silent.has(m) || this.bodyFoundOf(m)) continue;
        this.silent.add(m);
        this.radioMisses++;
        this.counts.missedChecks++;
        first ??= m;
        if (this.coordinated) this.reportMissing(m, roster);
        else caller.searchAt(m.pos.x, m.pos.z, null);
      }
      if (first) {
        // (guard-ai S14) "Unit three, report... Unit three? Nothing." and he radios it (one call per check, A40): the
        // section turns cautious once it gets through (take him during the call: nobody else hears)
        caller.bark('missed', unitOf(first.slotIdx, first.key));
        this.missingCall(caller, first.pos.x, first.pos.y, first.pos.z);
      } else
        for (let i = 0; i < roster.length; i++) {
          const m = roster[i]!;
          if (m !== caller && m.alive && !m.dog) {
            m.bark('radioOk');
            break;
          }
        }
    }
  }

  /** (guard-ai S5b) The section's radio-check caller: a calm desk-role guard (unaware, not held), the lowest key. */
  private deskCaller(): Enemy | null {
    let best: Enemy | null = null;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (!(e.roleFlags & ROLE_DESK) || !e.alive || e.alerted || e.taken || e.passive || e.level !== 'unaware') continue;
      if (!best || e.key < best.key) best = e;
    }
    return best;
  }

  /** (guard-ai S5b) Has his body been found already (the section knows; nobody misses him on the radio)? */
  private bodyFoundOf(m: Enemy): boolean {
    const bs = this.bodies;
    for (let i = 0; i < bs.length; i++) if (bs[i]!.enemyId === m.id && bs[i]!.found) return true;
    return false;
  }

  /** (guard-ai S5b) A squad member missed on a radio check: a `missing` incident at where he went down; his squad's
   *  calm, free members perceived it (the board sends two of them; none free: any two of the section). */
  private reportMissing(m: Enemy, roster: readonly Enemy[]): void {
    this.hearRoom(roster.length);
    const who = this.hearWho;
    let n = 0;
    for (let i = 0; i < roster.length; i++) {
      const o = roster[i]!;
      if (o === m || !o.alive || o.alerted || o.dog || o.taken || o.passive) continue;
      who[n++] = o.num;
    }
    this.report('missing', m.pos.x, m.pos.y, m.pos.z, m.num, n);
  }

  /** EMP at a point: recon drones in range drop. */
  empAt(x: number, y: number, z: number, r: number): number {
    let n = 0;
    for (const d of this.drones) {
      if (!d.alive) continue;
      if (hyp3(d.pos.x - x, d.pos.y - y, d.pos.z - z) <= r) {
        d.emp();
        n++;
      }
    }
    return n;
  }

  /** (guard-ai S1) Set the map's noisy things (masking for guards near them); none by default. */
  setNoisy(list: readonly NoisySource[]): void {
    this.noisy = list;
  }

  /** Room for `n` guards in the hearing scratch (grows by doubling: no allocation once the cast is in). */
  private hearRoom(n: number): void {
    if (n <= this.hearWho.length) return;
    let c = this.hearWho.length;
    while (c < n) c *= 2;
    this.hearWho = new Int32Array(c);
    this.hearR = new Float32Array(c);
  }

  /** (guard-ai S2) The board's view of every guard in the list (no allocation once the cast is in). */
  private fillView(): void {
    const list = this.enemies;
    const v = this.view;
    v.ensure(list.length);
    v.n = list.length;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      let f = 0;
      if (e.def.kind === 'officer') f |= GV_OFFICER;
      if (e.def.melee || e.dog) f |= GV_MELEE;
      if (e.taken) f |= GV_HELD;
      if (e.passive || e.runningAlarm) f |= GV_BUSY;
      if (!e.alive) f |= GV_DOWN;
      // (guard-ai S5) `mayLeave` false: the board never sends him out of his leash
      if (e.secure) f |= GV_POSTED;
      v.set(i, e.num, e.pos.x, e.pos.y, e.pos.z, LEVEL[e.level], f, e.incident);
      // (guard-ai S5b) his role class and secure zone
      v.setTags(i, e.roleFlags | 0, e.zoneX, e.zoneZ, e.zoneR > 0 ? e.zoneR : 0);
    }
  }

  /** (guard-ai S2) Report an event to the board with the `n` perceivers in `hearWho`, assign at once. */
  private report(kind: IncidentKind, x: number, y: number, z: number, key: number, n: number): number {
    const id = this.board.report(kind, x, z, y, key, this.hearWho, n);
    this.boardStep(0);
    return id;
  }

  /** (guard-ai S2) One board tick (`dt` 0: just assign / acknowledge), then its commands to the guards. */
  private boardStep(dt: number): void {
    this.fillView();
    const b = this.board;
    b.tick(dt, this.view);
    const o = b.out;
    for (let k = 0; k < o.n; k++) {
      const e = this.byNum(o.guard[k]!);
      if (!e) continue;
      const inc = o.inc[k]!;
      if (o.cmd[k] === CMD_SEND) {
        const m = o.mode[k]!;
        // (guard-ai S15) a guard reacts to this fixture / circuit going dark: late discovery leaves it alone
        // (guard-ai S22) a console's pseudo circuit is no fixture: late discovery is not told; the check has its own line
        const con = b.keyOf(inc) >= CIRCUIT_KEY + CONSOLE_GROUP;
        if ((m === MODE_LIGHT || m === MODE_BREAKER) && !con) this.dark.markKey(this.world.level.lights, b.keyOf(inc));
        if (m === MODE_LIGHT) e.checkLight(o.x[k]!, o.z[k]!, inc, o.arg[k]!, con ? 'consoleCheck' : 'lightOut');
        // (guard-ai S15, A42) a circuit switched off: walk to its switch and turn it back on
        else if (m === MODE_BREAKER) e.resetBreaker(o.x[k]!, o.z[k]!, o.y[k]!, inc, b.keyOf(inc) - CIRCUIT_KEY);
        else if (m === MODE_LEAD || m === MODE_COVER) e.pairSearch(o.x[k]!, o.z[k]!, inc, m === MODE_LEAD);
        // (guard-ai S3, S2 check polish 2) a plain noise or a lure that finds nothing ends calm; gunfire keeps the cooldown
        else if (m === MODE_INVESTIGATE) e.sendTo(o.x[k]!, o.z[k]!, inc, b.kindOf(inc) !== 'shots');
        // (guard-ai S7) a body a camera saw: the one nearest the incident's spot
        else if (m === MODE_BODY) {
          const body = this.camBodyOf(inc, o.x[k]!, o.z[k]!);
          if (body) e.checkBody(body, inc);
        }
        // (guard-ai S17, G1) a tripped device: to its spot, then search its room
        else if (m === MODE_DEVICE) e.respondDevice(o.x[k]!, o.z[k]!, inc, this.roomOf(o.x[k]!, o.y[k]!, o.z[k]!));
        // (guard-ai S19, G3) a dead body reported over the radio: hurry over and search it with its finder
        else if (m === MODE_HELP) e.helpSearch(o.x[k]!, o.z[k]!, inc);
      } else if (o.cmd[k] === CMD_ACK) e.ack(o.x[k]!, o.z[k]!, o.arg[k] === 1);
    }
    o.n = 0;
  }

  /** (guard-ai S3) A guard's reaction factor: the difficulty's, x the officer's when one is near (the old `callAlert`
   *  factor, no random term). */
  private reactionOf(e: Enemy): number {
    return this.diff.reaction * (e.buff ? ARCHETYPE.officer.reaction : 1);
  }

  /**
   * (guard-ai S3, design 5) The spotter's shout: every calm guard who hears it at the investigate tier of a
   * `RADIO.voice` reach (6 m in the open, ~2.7 m through one wall, less by a noisy machine) joins `RADIO.voiceDelay`
   * s later. Voice ignores sections. One wall ray per listener, only where one wall decides it.
   */
  private voice(e: Enemy): void {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const o = list[i]!;
      if (o === e || !o.alive || o.taken) continue;
      if (o.alerted) {
        // (guard-ai S24 fix) in combat with no intruder of his own: he hears which one the shouter names (G139)
        if (o.hunt < 0 && e.hunt >= 0 && this.hearsShout(e, o) >= 0) o.tell(e.hunt);
        continue;
      }
      // (guard-ai S24) the shouter's intruder
      if (this.hearsShout(e, o) >= 0) o.radio(RADIO.voiceDelay, e.hunt);
    }
  }

  /** (guard-ai S3) Does `o` hear `e`'s shout (the voice model)? The distance, or -1. One wall ray at most, only where
   *  one wall decides it. */
  private hearsShout(e: Enemy, o: Enemy): number {
    const d = hyp3(o.pos.x - e.pos.x, o.pos.y - e.pos.y, o.pos.z - e.pos.z);
    if (d >= RADIO.voice) return -1;
    const amb = this.noisy.length ? ambientDb(this.noisy, o.pos.x, o.pos.z, o.pos.y) : 0;
    if (!hearsVoice(d, 0, amb)) return -1;
    if (!hearsVoice(d, 1, amb)) {
      // a wall between them would stop it: one ray, head to head
      this.earA.set(e.pos.x, e.pos.y + 1.6, e.pos.z);
      this.earB.set(o.pos.x, o.pos.y + 1.6, o.pos.z);
      if (!this.ballistics.clear(this.earA, this.earB, MASK.HEARING)) return -1;
    }
    return d;
  }

  /** (guard-ai S4) The keys of the guards who hear `e`'s shout (a body found: "Man down!"), on their feet, not held,
   *  in combat too; the nearest calm one goes in `voiceNear` (he searches with the finder). */
  private voiceMask(e: Enemy): number {
    const list = this.enemies;
    let m = 0;
    let bd = Infinity;
    this.voiceNear = null;
    for (let i = 0; i < list.length; i++) {
      const o = list[i]!;
      if (o === e || !o.alive || o.taken || o.passive) continue;
      const d = this.hearsShout(e, o);
      if (d < 0) continue;
      m = (m | keyBit(o.key)) >>> 0;
      if (!o.alerted && !o.def.melee && !o.dog && d < bd) {
        bd = d;
        this.voiceNear = o;
      }
    }
    return m;
  }

  /** (guard-ai S3) One radio net tick (10 Hz): the board's view and the reaction lane, then complete / deliver. */
  private radioStep(dt: number): void {
    this.fillView();
    const v = this.view;
    if (this.rxReaction.length < v.n) {
      let c = this.rxReaction.length;
      while (c < v.n) c *= 2;
      this.rxReaction = new Float32Array(c);
    }
    const list = this.enemies;
    for (let i = 0; i < v.n; i++) this.rxReaction[i] = this.reactionOf(list[i]!);
    this.radioNet.tick(dt, v, this.sink, this.rxReaction, null);
    // (guard-ai S6) the command call: cut -> the next guard in the fight after `ALARM_CALL.retry` s; nobody: no alarm
    if (this.command.tick(dt, this.radioNet.commandOpen)) {
      const c = this.alarmRaised ? null : this.nextCaller();
      if (c) this.startCommand(c);
      else this.command.lapse();
    }
  }

  /**
   * (guard-ai S3) A completed call reaches guard `gid`: a contact puts him in combat on the next step (the shared last
   * known position; he does not relay it); a report (light, stand down, missing, ...) is acknowledged by its first
   * receiver only ("Copy.": a bark, nothing more).
   */
  private radioDeliver(gid: number, inc: number, kind: CallKind, caller: number): void {
    const e = this.byNum(gid);
    if (!e || !e.alive || e.taken) return;
    if (kind === 'contact') {
      // (guard-ai S24, A149) a contact's incident is its intruder slot: he learns of that player only (G139)
      e.radio(0, inc);
      return;
    }
    // (guard-ai S4) a death reported (`inc` is the hold): he knows of it now (held caution)
    if (kind === 'body' && this.awareness.addAware(inc, e.key)) this.syncCaution();
    // (guard-ai S14) a section alert (a guard not answering, shots): cautious, timed (a later call refreshes it); the
    // S2 pair lead's own `missing` report is only an ack
    else if ((kind === 'missing' || kind === 'shots') && this.alertLog.find(kind === 'shots' ? ALERT_SHOTS : ALERT_MISSING, inc, caller) >= 0) this.alertHold(e, kind);
    const k = CALL_KIND.indexOf(kind);
    for (let j = 0; j < this.ackCaller.length; j++) if (this.ackCaller[j] === caller && this.ackInc[j] === inc && this.ackKind[j] === k) return;
    const j = this.ackK;
    this.ackK = (j + 1) % this.ackCaller.length;
    this.ackCaller[j] = caller;
    this.ackInc[j] = inc;
    this.ackKind[j] = k;
    e.bark('ack');
  }

  /** (guard-ai S3, S6) A `command` call got through: the alarm (reinforcements, M4), no panel needed (`RADIO_ALARM`). */
  private radioAlarm(caller: number): void {
    if (!RADIO_ALARM || this.alarmRaised) return;
    const e = this.byNum(caller);
    if (!e) return;
    this.raiseAlarm(e, null);
    // (guard-ai S14) the section's tally
    if (this.alarmRaised) this.counts.radioAlarms++;
  }

  /**
   * (guard-ai S14) An alert call got through (one this manager logged: `missingCall` / `shotsHeard`; the S2 pair lead's
   * `missing` report is not one): the caller's report line, he is cautious too, the tally, and a shots call sends a pair
   * (lead + cover, G11) to the newest shot's spot with him as one who heard it (merged into the shots incident the shot
   * opened, whose one investigator then gets a cover).
   */
  private alertThrough(caller: number, inc: number, kind: CallKind): void {
    const isShots = kind === 'shots';
    const slot = this.alertLog.find(isShots ? ALERT_SHOTS : ALERT_MISSING, inc, caller);
    if (slot < 0) return;
    const e = this.byNum(caller);
    if (isShots) this.counts.shotsCalls++;
    if (!e) return;
    e.bark(isShots ? 'shotsReport' : 'missingReport');
    this.alertHold(e, kind);
    if (!isShots || !SHOTS.pair) return;
    const log = this.alertLog;
    this.hearRoom(1);
    this.hearWho[0] = e.num;
    const id = this.board.report('shots', log.x[slot]!, log.z[slot]!, log.y[slot]!, -1, this.hearWho, 1);
    this.board.wantPair(id);
    this.boardStep(0);
  }

  /** (guard-ai S14) `e` knows the section is on alert (`kind` `missing` / `shots`): his timed caution. */
  private alertHold(e: Enemy, kind: CallKind): void {
    const shots = kind === 'shots';
    if (shots ? !SHOTS.sectionCall : !MISSING.sectionCaution) return;
    if (this.awareness.timedHold(e.key, shots ? SHOTS.cautious : MISSING.cautious, shots ? ALERT_SHOTS : ALERT_MISSING)) this.syncCaution();
  }

  /** (guard-ai S14) A fresh incident id for an alert call: -2, -3, ... (never a board id, a hold or -1). */
  private alertInc(): number {
    this.alertSeq = (this.alertSeq + 1) % 0x3fffffff;
    return -1 - this.alertSeq;
  }

  /**
   * (guard-ai S14, item 6, A40) `caller` radios that a guard is not answering (the radio check missed him, or he is the
   * partner who never came; (x, y, z) where he was): a `missing` call, `RADIO.callIn` x reaction, cuttable, under its
   * own incident id. Coordinated modes, `MISSING.sectionCaution` on. The S5b / S10 pair search is the board's (as
   * built); this is only the section being told.
   */
  private missingCall(caller: Enemy, x: number, y: number, z: number): void {
    if (!this.coordinated || !MISSING.sectionCaution) return;
    const inc = this.alertInc();
    if (this.radioNet.startCall(caller.num, inc, 'missing', callHold('missing', this.reactionOf(caller))) < 0) return;
    this.alertLog.add(ALERT_MISSING, inc, caller.num, x, y, z);
  }

  /**
   * (guard-ai S14, item 7, A41) A loud shot at `pos` was heard (tier 1+) by calm guard `e` (the nearest calm hearer not
   * fighting): one `shots` call per shots incident. While the shots call is open a later shot joins it (its spot moves
   * to the newest shot); else a new incident and call (`RADIO.callIn` x reaction, cuttable; its delivery refreshes the
   * section's caution).
   */
  private shotsHeard(e: Enemy, pos: Vector3): void {
    if (!SHOTS.sectionCall) return;
    const log = this.alertLog;
    if (this.radioNet.isOpen(this.shotsCall)) {
      const s = log.find(ALERT_SHOTS, this.shotsInc, this.shotsBy);
      if (s >= 0) {
        log.x[s] = pos.x;
        log.y[s] = pos.y;
        log.z[s] = pos.z;
      }
      return;
    }
    const inc = this.alertInc();
    const id = this.radioNet.startCall(e.num, inc, 'shots', callHold('shots', this.reactionOf(e)));
    if (id < 0) return;
    this.shotsCall = id;
    this.shotsInc = inc;
    this.shotsBy = e.num;
    log.add(ALERT_SHOTS, inc, e.num, pos.x, pos.y, pos.z);
    e.bark('shots');
  }

  /** (guard-ai S14) May `e` call in shots he heard: calm (not in combat, not on the search after a fight), armed, a
   *  radio (not a dog, not passive, not held, not blinded)? */
  private mayCallShots(e: Enemy): boolean {
    return e.alive && !e.alerted && !e.taken && !e.passive && !e.def.melee && !e.dog && !(e.blindT > 0) && !(e.level === 'searching' && e.aware.fought);
  }

  /** (guard-ai S3) Seconds until this guard's open radio call gets through (0: none). Tests / e2e / debug. */
  radioLeft(e: Enemy): number {
    return this.radioNet.pendingFor(e.num);
  }

  /** (guard-ai S7) The security desk's radio line for a camera's body report: the camera's id and the line (GameState
   *  shows it at the camera, with the radio chirp). */
  onCameraLine: ((camera: string, line: string) => void) | null = null;
  /** (guard-ai S7) Camera body reports taken / ignored (tests / e2e). */
  camReports = 0;
  camIgnored = 0;

  /**
   * (guard-ai S7, design 9, M6) A camera saw a downed guard (`SecuritySystem.onBody`; IR, so dark or lit alike, G240).
   * Coordinated modes only (the parked modes have no board): a `camBody` incident on the board, one per body (a second
   * camera's report merges into it while it is open); the nearest 1 (knocked out) or 2 (dead) calm guards within
   * `INCIDENT.callR` by path walk over (`Enemy.checkBody`) and the body-found path takes over there (wake him, search).
   * A body already found by a guard, being carried, hidden or gone is ignored. A new incident gets the desk's radio
   * line (`label`: "Camera 2"; the room the body lies in). Returns the incident id, -1 when ignored. Host only.
   */
  cameraReport(ev: CameraBodyEvent, label = 'Camera'): number {
    if (!this.coordinated) return -1;
    const bs = this.bodies;
    let b: Body | null = null;
    let k = -1;
    for (let i = 0; i < bs.length; i++) {
      if (bs[i]!.id !== ev.bodyId) continue;
      b = bs[i]!;
      k = i;
      break;
    }
    if (!b || b.found || !b.present || b.carried || b.hidden) {
      this.camIgnored++;
      return -1;
    }
    this.camReports++;
    const n = Number.parseInt(b.id.slice(1), 10);
    const key = Number.isFinite(n) ? n : 1000000 + k;
    const floor = this.nav.heightAt(b.pos.x, b.pos.z, b.pos.y);
    const opened = this.board.opened;
    const id = this.board.reportBody(b.pos.x, b.pos.z, floor, key, b.lethal);
    if (this.board.opened !== opened) {
      const rooms = this.ctx.rooms;
      const r = rooms.length ? roomAt(rooms, b.pos.x, b.pos.z, floor + 0.1) : -1;
      this.onCameraLine?.(ev.camera, camBodyLine(label, r >= 0 ? rooms[r]!.name : '', b.lethal));
    }
    this.boardStep(0);
    return id;
  }

  /** (guard-ai S7) The body of a `camBody` incident: by its number (the incident's key), else the nearest present body
   *  within 1.5 m of its spot; null when it is gone. Once per guard sent. */
  private camBodyOf(inc: number, x: number, z: number): Body | null {
    const s = this.board.slotOf(inc);
    const key = s >= 0 ? this.board.key[s]! : -1;
    const bs = this.bodies;
    if (key >= 0 && key < 1000000) {
      const want = `b${key}`;
      for (let i = 0; i < bs.length; i++) if (bs[i]!.id === want) return bs[i]!.present ? bs[i]! : null;
    }
    let pick: Body | null = null;
    let pd = 1.5;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i]!;
      if (!b.present) continue;
      const d = hyp2(b.pos.x - x, b.pos.z - z);
      if (d < pd) {
        pd = d;
        pick = b;
      }
    }
    return pick;
  }

  /** The guard with this id (`Enemy.num`), null. */
  private byNum(num: number): Enemy | null {
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) if (list[i]!.num === num) return list[i]!;
    return null;
  }

  /**
   * One listener's hearing tier for a noise of `reach` at `pos` (`hearing.ts`): ambient masking at the guard, then the
   * wall ray only where one wall could change the tier (at head height: low cover and crates do not muffle, walls do).
   * Writes the effective reach into `hearR[i]`.
   */
  private tierOf(e: Enemy, i: number, pos: Vector3, reach: number, d: number, loud: boolean): HearTier {
    const amb = this.noisy.length ? ambientDb(this.noisy, e.pos.x, e.pos.z, e.pos.y) : 0;
    let r = effectiveReach(reach, 0, amb);
    if (!this.coordinated) {
      // (S1 check fix 4) the parked modes' exact old rule: the ray beyond `MUFFLE` of the reach, muffled to `MUFFLE`
      if (d > r * MUFFLE) {
        this.earA.set(pos.x, pos.y + 1.5, pos.z);
        this.earB.set(e.pos.x, e.pos.y + 1.6, e.pos.z);
        if (!this.ballistics.clear(this.earA, this.earB, MASK.HEARING)) r *= MUFFLE;
      }
    } else if (wallMatters(d, r, loud)) {
      this.earA.set(pos.x, pos.y + 1.5, pos.z);
      this.earB.set(e.pos.x, e.pos.y + 1.6, e.pos.z);
      if (!this.ballistics.clear(this.earA, this.earB, MASK.HEARING)) r *= WALL_FACTOR;
    }
    this.hearR[i] = r;
    return hearTier(d, r, loud);
  }

  /**
   * Gunfire (unsuppressed) audible to `reach` m. Coordinated (guard-ai S1, S2): walls and masking cut the reach per
   * listener; inside a quarter of it (tier 3) a guard goes to combat towards it; every other guard in reach turns to
   * look, and those inside half of it are reported to the incident board as a `shots` incident: one of them is sent to
   * look (and the shot locates the shooter for him). Guards already fighting locate it from anywhere in reach. A shot
   * behind walls far off sends nobody to combat. Held guards (grabbed, hostage, interrogated) hear nothing (S1 check
   * fix 1). (guard-ai S14, A41) The nearest calm guard who heard it (tier 1+) and is not sent to combat by it radios
   * "shots fired" (`shotsHeard`: one call per shots incident, cuttable; delivered, the section is cautious and a pair
   * goes). Uncoordinated (parked modes): everyone within `reach` goes to combat, no walls (the old rule).
   */
  noise(pos: Vector3, reach: number, by: string | null = null): void {
    const list = this.enemies;
    const n = list.length;
    let locate = false;
    // (guard-ai S24) the shot locates its shooter's intruder slot (`by` his player id; null: the freshest, else slot 0);
    // the hearers it sends to combat hunt him
    const b = this.intruders;
    const slot = by !== null ? b.slotFor(by) : b.freshest >= 0 ? b.freshest : 0;
    if (!this.coordinated) {
      for (let i = 0; i < n; i++) {
        const e = list[i]!;
        if (!e.alive || hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z) >= reach) continue;
        e.hearGunfire(pos.x, pos.z);
        e.tell(slot);
        locate = true;
      }
    } else {
      this.hearRoom(n);
      const who = this.hearWho;
      let nh = 0;
      // (guard-ai S14, A41) the nearest calm hearer this shot does not send to combat radios it ("shots fired")
      let callBy: Enemy | null = null;
      let callD = Infinity;
      for (let i = 0; i < n; i++) {
        const e = list[i]!;
        if (!e.alive || e.taken) continue;
        const d = hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z);
        if (d >= reach) continue;
        const tier = this.tierOf(e, i, pos, reach, d, true);
        if (tier === 0) continue;
        if (tier < 3 && d < callD && this.mayCallShots(e)) {
          callD = d;
          callBy = e;
        }
        if (e.alerted || tier === 3) {
          e.hearGunfire(pos.x, pos.z);
          e.tell(slot);
          locate = true;
        } else if (e.def.melee) e.hear(pos.x, pos.z, this.hearR[i]!);
        // (guard-ai S5) a high-security post: lured toward the shots to his leash edge (tier 2), never sent
        else if (e.secure && tier === 2) e.lureTo(pos.x, pos.z, this.hearR[i]!);
        else {
          e.hearTurn(pos.x, pos.z, this.hearR[i]!);
          if (tier === 2 && !e.passive) who[nh++] = e.num;
        }
      }
      if (nh > 0) {
        this.report('shots', pos.x, pos.y, pos.z, -1, nh);
        locate = true;
      }
      if (callBy) this.shotsHeard(callBy, pos);
    }
    if (locate) this.reportIntruder(slot, pos.x, pos.y, pos.z, false);
  }

  /**
   * A noise (footsteps, landings, glass...) audible to `reach` m: unalerted guards it reaches react by hearing tier
   * (`hearing.ts`: walls and masking near noisy things cut the reach per listener). Coordinated (guard-ai S1, S2):
   * every guard in reach turns to look (`Enemy.hearTurn`), and those inside half the reach (tier 2) are reported to the
   * incident board (`kind`: a plain noise or a lure): it sends one (`Enemy.sendTo`), the others acknowledge. A later
   * noise close by merges into the same incident (no second investigator; a guard already sent is not re-aimed).
   * Melee guards (dogs, runners) keep their own rule: in reach they hear it (and a dog close by charges). Held guards
   * hear nothing (S1 check fix 1). Uncoordinated (parked modes): everyone in reach hears and walks over.
   */
  hear(pos: Vector3, reach: number, kind: 'noise' | 'distraction' = 'noise', skip: Enemy | null = null): void {
    const list = this.enemies;
    const n = list.length;
    this.hearRoom(n);
    const who = this.hearWho;
    let nh = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i]!;
      if (e === skip || !e.alive || e.alerted || e.passive || e.taken) continue;
      const d = hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z);
      // ambient and walls only shrink the reach: beyond it nothing is heard
      if (d >= reach) continue;
      const tier = this.tierOf(e, i, pos, reach, d, false);
      if (tier === 0) continue;
      if (!this.coordinated || e.def.melee) e.hear(pos.x, pos.z, this.hearR[i]!);
      // (guard-ai S5, M1) a high-security post is distracted, not sent: at tier 2 the noise lures him to his leash edge
      // (looks, walks back); at tier 1 he turns, as anyone
      else if (e.secure && tier === 2) e.lureTo(pos.x, pos.z, this.hearR[i]!);
      else {
        e.hearTurn(pos.x, pos.z, this.hearR[i]!);
        if (tier === 2) who[nh++] = e.num;
      }
    }
    if (nh > 0) this.report(kind, pos.x, pos.y, pos.z, -1, nh);
  }

  /** Any enemy in combat (the operator has been detected). */
  get anyAlerted(): boolean {
    for (const e of this.enemies) if (e.alive && e.alerted) return true;
    return false;
  }

  /** Any enemy in combat or searching (the last known position matters). */
  get hunting(): boolean {
    for (const e of this.enemies) if (e.alive && (e.alerted || e.level === 'searching')) return true;
    return false;
  }

  // ---- (guard-ai S24, G139) one last known position per intruder ----

  /** Any living guard in combat or searching on intruder `slot` (his last known position matters). */
  huntingOf(slot: number): boolean {
    if (slot < 0) return false;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (e.alive && e.hunt === slot && (e.alerted || e.level === 'searching')) return true;
    }
    return false;
  }

  /** Intruder `slot`'s last known position (a reused vector per slot), null when -1 / not valid. */
  lkpOf(slot: number): Vector3 | null {
    const b = this.intruders;
    if (slot < 0 || slot >= MAX_INTRUDERS || b.valid[slot] !== 1) return null;
    return this.lkpSlot[slot]!.set(b.x[slot]!, b.y[slot]!, b.z[slot]!);
  }

  /** The chase field towards intruder `slot` (-1: the freshest's); none built yet, or the parked modes (`!stealth`):
   *  today's field (every player). */
  flowOf(slot: number): Float32Array {
    if (!this.stealth) return this.flowField;
    const s = slot >= 0 && slot < MAX_INTRUDERS ? slot : this.intruders.freshest;
    return (s >= 0 ? this.slotFlow[s] : null) ?? this.flowField;
  }

  /** Intruder `slot` seen (`seen`) or located at (x, y, z), then the mirror. -1: reported nowhere (a fifth player). */
  private reportIntruder(slot: number, x: number, y: number, z: number, seen: boolean): void {
    if (slot < 0) return;
    this.intruders.report(slot, x, y, z, seen);
    this.mirror();
  }

  /** The old shared fields follow the freshest intruder (`lkp`, `lkpValid`, `sightT`); none: not valid. */
  private mirror(): void {
    const b = this.intruders;
    const f = b.freshest;
    if (f < 0) {
      this.lkpValid = false;
      return;
    }
    this.lkp.set(b.x[f]!, b.y[f]!, b.z[f]!);
    this.lkpValid = b.valid[f] === 1;
    this.sightT = b.seenT[f]!;
  }

  /** Per intruder: valid, not seen for `INTRUDERS.forget` s and nobody hunting him: forgotten. */
  private forgetStep(): void {
    const b = this.intruders;
    let changed = false;
    for (let s = 0; s < MAX_INTRUDERS; s++) {
      if (b.valid[s] !== 1 || b.seenT[s]! <= INTRUDERS.forget || this.huntingOf(s)) continue;
      b.forget(s);
      changed = true;
    }
    if (changed) this.mirror();
  }

  /** Stealth: at most one intruder's chase field rebuilt (round robin over the slots that need it): never built, the
   *  nav grid changed, or his position moved a nav cell (at most once per `FLOW_MIN` s). Nothing allocated but each
   *  slot's field, once. */
  private slotFlowStep(dt: number): void {
    for (let s = 0; s < MAX_INTRUDERS; s++) if (this.slotFlowT[s]! > 0) this.slotFlowT[s] = this.slotFlowT[s]! - dt;
    if (!this.stealth) return;
    const b = this.intruders;
    const ver = this.nav.version;
    for (let k = 0; k < MAX_INTRUDERS; k++) {
      const s = (this.slotFlowRR + k) % MAX_INTRUDERS;
      if (b.valid[s] !== 1) continue;
      let f = this.slotFlow[s] ?? null;
      const x = b.x[s]!;
      const y = b.y[s]!;
      const z = b.z[s]!;
      const moved = hyp3(x - this.slotFlowX[s]!, y - this.slotFlowY[s]!, z - this.slotFlowZ[s]!) >= FLOW_CELL;
      if (f && this.slotFlowVer[s] === ver && !(moved && this.slotFlowT[s]! <= 0)) continue;
      if (!f) {
        f = new Float32Array(this.nav.walk.length);
        this.slotFlow[s] = f;
      }
      const g = this.flowGoal[0]!;
      g[0] = x;
      g[1] = z;
      this.flowGoalY[0] = y;
      this.nav.flowField(this.flowGoal, f, this.flowGoalY);
      this.slotFlowX[s] = x;
      this.slotFlowY[s] = y;
      this.slotFlowZ[s] = z;
      this.slotFlowVer[s] = ver;
      this.slotFlowT[s] = FLOW_MIN;
      this.slotFlowRR = (s + 1) % MAX_INTRUDERS;
      return;
    }
  }

  // ---- (guard-ai S8, design 8) squad tactics ----

  /**
   * One roles tick (2 Hz, coordinated modes). The engaged group is every guard in combat with cover tactics (one per
   * section: the section shares one last known position); `assignRoles` gives point, overwatch, flank, reporter (the
   * engagement's first caller) and search. The overwatch's low cover is checked with one view ray to the LKP (a failure
   * blocks it `TACTICS.blockS` and picks again, at most `TACTICS.viewChecks` times; high cover is seen past its edge
   * by the peek, so it is not checked). A point and a flanker never start moving while the other is on its way (both
   * standard). Then each guard's role, cover, moving flag, whether a squadmate is moving (the overwatch suppresses) and
   * whether the reporter's call is still open. A lone guard (`TACTICS.minGroup`) and everyone outside the group get
   * `R_NONE`: today's tactics. No allocation.
   */
  private rolesStep(dt: number): void {
    const set = this.coverSet;
    const bt = this.coverBlockT;
    for (let i = 0; i < set.n; i++) {
      if (bt[i]! <= 0) continue;
      bt[i] = bt[i]! - dt;
      if (bt[i]! <= 0) {
        bt[i] = 0;
        set.block[i] = 0;
      }
    }
    const list = this.enemies;
    if (this.roleMember.length < list.length) {
      const c = Math.max(list.length, this.roleMember.length * 2);
      this.roleMember = new Int16Array(c);
      this.roleMark = new Uint8Array(c);
    }
    const member = this.roleMember;
    const mark = this.roleMark;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      member[i] = -1;
      mark[i] = 0;
      if (!(e.alive && e.alerted)) e.closing = false;
    }
    // (guard-ai S24, A147) one group per intruder: the guards in combat on him, scored against his last known position
    const b = this.intruders;
    let groups = 0;
    for (let s = 0; s < MAX_INTRUDERS; s++) {
      let fighting = false;
      for (let i = 0; i < list.length && !fighting; i++) {
        const e = list[i]!;
        if (e.alive && e.alerted && e.hunt === s) fighting = true;
      }
      if (!fighting) this.callers[s] = -1;
      else if (b.valid[s] === 1 && this.rolesFor(s)) groups++;
    }
    this.rolesActive = groups > 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]!;
      if (mark[i] === 0 && e.role !== R_NONE) e.setRole(R_NONE, -1, false, false, false, false);
    }
  }

  /** (guard-ai S8, S24) The roles of intruder `slot`'s group (the guards in the group with `hunt === slot`): false when it
   *  is under `TACTICS.minGroup` (they keep today's tactics). Each member is marked in `roleMark`. */
  private rolesFor(slot: number): boolean {
    const set = this.coverSet;
    const list = this.enemies;
    const member = this.roleMember;
    const inp = this.roleIn;
    const out = this.roleOut;
    const who = this.roleWho;
    let n = 0;
    for (let i = 0; i < list.length && n < inp.cap; i++) {
      const e = list[i]!;
      if (e.hunt !== slot || !this.inGroup(e)) continue;
      member[i] = n;
      who[n] = e;
      inp.slot[n] = e.num;
      inp.x[n] = e.pos.x;
      inp.y[n] = e.pos.y;
      inp.z[n] = e.pos.z;
      inp.seesTarget[n] = e.seesTarget ? 1 : 0;
      inp.inCover[n] = e.state === 'inCover' && e.coverIdx >= 0 ? 1 : 0;
      inp.profile[n] = e.tacticsProfile;
      inp.coverIdx[n] = e.coverIdx;
      n++;
    }
    if (n < TACTICS.minGroup) {
      for (let i = 0; i < list.length; i++) member[i] = -1;
      for (let k = 0; k < n; k++) who[k] = null;
      return false;
    }
    inp.n = n;
    const b = this.intruders;
    inp.lkpX = b.x[slot]!;
    inp.lkpY = b.y[slot]!;
    inp.lkpZ = b.z[slot]!;
    inp.targetCoverT = this.targetCoverT();
    // (guard-ai walk 4.82 item 2, Michael: "He should report then attack you") the caller is the reporter only while his
    // call is open (the contact call, then a command call he holds); once it is through he takes a fighting role
    const caller = this.callers[slot]!;
    inp.callerSlot = caller >= 0 && this.radioNet.pendingFor(caller) > 0 ? caller : -1;
    inp.cover = set;
    inp.grid = this.coverGrid;
    for (let k = 0; k < TACTICS.viewChecks; k++) {
      assignRoles(inp, out);
      const ow = out.overwatch;
      if (ow < 0) break;
      const c = out.cover[ow]!;
      if (c < 0 || set.low[c] !== 1 || (inp.inCover[ow] === 1 && inp.coverIdx[ow] === c) || this.coverSees(c, slot)) break;
      this.blockCover(c);
      if (k === TACTICS.viewChecks - 1) {
        out.cover[ow] = -1;
        out.moving[ow] = 0;
        out.run[ow] = 0;
      }
    }
    // one of point and flank on the move at a time: the one already on its way finishes first
    const pt = out.point;
    const fl = out.flank;
    const ptGoing = pt >= 0 && who[pt]!.state === 'seekCover';
    const flGoing = fl >= 0 && who[fl]!.state === 'seekCover';
    if (pt >= 0 && fl >= 0 && inp.profile[pt] !== P_AGGRESSIVE && inp.profile[fl] !== P_AGGRESSIVE) {
      if (flGoing && !ptGoing) out.moving[pt] = 0;
      if (ptGoing && !flGoing) out.moving[fl] = 0;
    }
    const mates = ptGoing || flGoing;
    // each member's role now (a later group reserves round the covers this one took: `coverSet.owner` is shared)
    const mark = this.roleMark;
    for (let i = 0; i < list.length; i++) {
      const m = member[i]!;
      if (m < 0) continue;
      member[i] = -1;
      mark[i] = 1;
      const e = list[i]!;
      const r = out.role[m]!;
      e.setRole(r, out.cover[m]!, out.moving[m] === 1, out.run[m] === 1, mates, r === R_REPORTER && this.radioNet.pendingFor(e.num) > 0);
    }
    for (let k = 0; k < n; k++) who[k] = null;
    return true;
  }

  /** (guard-ai S8) In the engaged group: in combat, free (not held, passive, on an alarm run or closing in), a cover
   *  user (not melee, a dog, a sniper or an enforcer) and not holding a room (Clear / Infiltration squads keep it). */
  private inGroup(e: Enemy): boolean {
    const d = e.def;
    return e.alive && e.alerted && !e.taken && !e.passive && !e.runningAlarm && !e.closing && !e.dog && !d.melee && d.usesCover && d.kind !== 'sniper' && d.kind !== 'enforcer' && e.hold === null;
  }

  /** (guard-ai S8) How long a player has held cover (s; the longest), 0 when none does. */
  private targetCoverT(): number {
    const ps = this.players();
    let t = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]!;
      if (p.target.alive && p.cover) t = Math.max(t, p.coverT ?? 0);
    }
    return t;
  }

  /** (guard-ai S8) One view ray from a cover (standing head height) to the last known position (chest height). (guard-ai
   *  S24) Intruder `slot`'s. */
  private coverSees(c: number, slot: number): boolean {
    const s = this.coverSet;
    const b = this.intruders;
    this.earA.set(s.x[c]!, s.y[c]! + 1.5, s.z[c]!);
    this.earB.set(b.x[slot]!, b.y[slot]! + 1.2, b.z[slot]!);
    return this.ballistics.clear(this.earA, this.earB, G.STATIC);
  }

  /** (guard-ai S8) Skip a cover for `TACTICS.blockS` (no view, no path). */
  private blockCover(idx: number): void {
    if (idx < 0 || idx >= this.coverSet.n) return;
    this.coverSet.block[idx] = 1;
    this.coverBlockT[idx] = TACTICS.blockS;
  }

  /** (guard-ai S8) A contact call: its caller reports for the group unless an earlier caller of this engagement is still
   *  in the fight. (guard-ai S24) The group of his intruder (a caller with none reports for no group). */
  private noteCaller(e: Enemy): void {
    const s = e.hunt;
    if (s < 0 || s >= MAX_INTRUDERS) return;
    const k = this.callers[s]!;
    const c = k >= 0 ? this.byNum(k) : null;
    if (!c || !c.alive || !c.alerted) this.callers[s] = e.num;
  }

  /** (guard-ai S8) A guard has just gone to combat: his dice for this engagement (a new one when nobody else is in
   *  combat): `combatSeed(matchSeed, engagement, num)`. */
  private seedFor(e: Enemy): number {
    let others = false;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const o = list[i]!;
      if (o !== e && o.alive && o.alerted) {
        others = true;
        break;
      }
    }
    if (!others) this.engagement++;
    return combatSeed(this.matchSeed, this.engagement, e.num);
  }

  /** Pick (or drop) the flanker: someone with cover tactics once a player has held cover a while. */
  private assignFlanker(): void {
    const held = this.players().some((p) => p.target.alive && p.cover && (p.coverT ?? 0) > 4);
    if (!held) {
      this.flanker = null;
      return;
    }
    if (this.flanker?.alive) return;
    let best: Enemy | null = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive || !e.alerted || e.def.melee || !e.def.usesCover || e.hold) continue;
      // (guard-ai S23) his own distance to his target (co-op: not the host's player)
      const d = e.targetDist;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    this.flanker = best;
  }

  private refreshFlow(): void {
    // stealth: towards where they think the players are, never where they really are; (guard-ai S24) one field per
    // intruder (`slotFlowStep`)
    if (this.stealth) {
      this.flowVer = this.nav.version;
      // the field built for the players' real feet (before the mode set stealth) is dropped once: a guard with no
      // intruder follows the freshest's field, never that one (G139)
      if (!this.flowBlank) this.flowField.fill(Infinity);
      this.flowBlank = true;
      return;
    }
    this.flowBlank = false;
    const live = this.players().filter((p) => p.target.alive);
    const goals = live.map((p) => [p.feet.x, p.feet.z] as [number, number]);
    // heights pick the storey (a roof, an upper floor) the goal is on
    const ys = live.map((p) => p.feet.y);
    if (goals.length) this.nav.flowField(goals, this.flowField, ys);
    this.flowVer = this.nav.version;
  }

  update(dt: number): void {
    this.sightT += dt;
    this.intruders.step(dt);
    // (guard-ai S20) the door gate, built once (the door list is fixed for the map)
    if (!this.doorGate && this.world.doors.list.length) this.doorGate = new DoorGate(this.world.doors.list);
    this.helmetDrops.update(dt);
    // nobody hunting him any more: an intruder's last known position is forgotten (guard-ai S24: each on its own)
    this.forgetStep();
    this.slotFlowStep(dt);
    this.flowT -= dt;
    // (sector-fixes-r2 nav) a nav closure opened or shut (a team door): the flow field is rebuilt at once
    if (this.flowT <= 0 || this.flowVer !== this.nav.version) {
      this.flowT = 0.5;
      this.refreshFlow();
      // (guard-ai S8) coordinated with an engaged group: its flank role replaces the single flanker (a lone guard and
      // the parked modes keep it; e2e-wall's flanker-after-4 s runs in Clear, uncoordinated)
      if (this.coordinated && this.rolesActive) this.flanker = null;
      else this.assignFlanker();
    }
    this.alarmT -= dt;
    if (this.alarmT <= 0) {
      this.alarmT = 0.5;
      this.assignAlarm();
    }
    this.grenadeT = Math.max(0, this.grenadeT - dt);
    // officers buff squadmates round them
    this.buffT -= dt;
    if (this.buffT <= 0) {
      this.buffT = 0.5;
      this.updateBuffs();
    }
    if (this.stealth && this.squads.size) {
      this.radioT -= dt;
      if (this.radioT <= 0) {
        // (guard-ai S8, A7) +- jitter from a fixed low-discrepancy sequence (golden ratio), not dice: replayable
        this.radioSeq++;
        this.radioT = ARCHETYPE.radio.period + (((this.radioSeq * 0.618034) % 1) * 2 - 1) * ARCHETYPE.radio.jitter;
        this.radioCheckNow();
      }
    }
    // (guard-ai S2) the incident board at 5 Hz: assign, acknowledge, escalate, close
    if (this.coordinated) {
      this.boardT -= dt;
      if (this.boardT <= 0) {
        this.boardT += 0.2;
        if (this.boardT <= 0) this.boardT = 0.2;
        this.boardStep(0.2);
        // (guard-ai S4) timed caution counts down with the board; every guard's caution follows the table
        this.awareness.tick(0.2);
        this.syncCaution();
      }
      // (guard-ai S3) the section radio net at 10 Hz: calls complete, receivers hear them staggered
      this.netT -= dt;
      if (this.netT <= 0) {
        this.netT += RADIO_TICK;
        if (this.netT <= 0) this.netT = RADIO_TICK;
        this.radioStep(RADIO_TICK);
      }
      // (guard-ai S8) squad roles at 2 Hz: point, overwatch, flank, reporter, search
      this.roleT -= dt;
      if (this.roleT <= 0) {
        this.roleT += TACTICS.tick;
        if (this.roleT <= 0) this.roleT = TACTICS.tick;
        this.rolesStep(TACTICS.tick);
      }
      // (guard-ai S15, A43) late discovery of dark fixtures, a share of the guards per tick
      if (LATE.enabled) {
        this.lateT -= dt;
        if (this.lateT <= 0) {
          this.lateT += LATE_SCAN.tick;
          if (this.lateT <= 0) this.lateT = LATE_SCAN.tick;
          this.lateStep();
        }
      }
      // (guard-ai S22) a security console off: the next guard who sees it notices it
      if (CONSOLE_FAULT.enabled && this.consoles.n > 0) {
        this.conT -= dt;
        if (this.conT <= 0) {
          this.conT += LATE_SCAN.tick;
          if (this.conT <= 0) this.conT = LATE_SCAN.tick;
          this.consoleStep();
        }
      }
    }
    this.updateDrones(dt);
    // (guard-ai S13) the response teams: who leads, and the switch to the sweep after the search; (S24, A150) round the
    // freshest intruder (the mirror)
    for (let i = 0; i < this.teams.length; i++) this.teams[i]!.tick(this.lkpValid, this.lkp.x, this.lkp.z);
    const doors = this.world.doors;
    for (const e of this.enemies) {
      e.update(dt);
      // walking into a closed door pushes it open
      if (doors.list.length && e.alive) doors.pushOpen(e.pos.x, e.pos.z);
    }
    // (guard-ai S10) talking pairs at the board rate, after the guards moved
    if (this.pairs.length) {
      this.pairT -= dt;
      if (this.pairT <= 0) {
        this.pairT += PAIRS.tick;
        if (this.pairT <= 0) this.pairT = PAIRS.tick;
        this.pairStep(PAIRS.tick);
      }
    }
    this.updateTorches();
    // nobody in combat any more: no player is known to be there (takedowns open again)
    let fighting = false;
    for (const e of this.enemies) if (e.alive && e.level === 'alert') fighting = true;
    if (!fighting) {
      const ps = this.players();
      for (let i = 0; i < ps.length; i++) ps[i]!.spotted = false;
    }
    // bodies: settle, and sample the light on them now and then (how findable they are)
    const field = this.world.lightField;
    for (const b of this.bodies) {
      b.update(dt);
      b.lightT -= dt;
      if (b.lightT <= 0 && b.present) {
        b.lightT = 1;
        b.light = field.totalAt(b.pos.x, b.pos.y + 0.2, b.pos.z, this.bodyOccluder);
      }
    }
    // drop dead entries (a dog keeps its own body: kept to draw and dispose)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!;
      if (e.alive) continue;
      if (e.dog) this.dogCorpses.push(e);
      this.enemies.splice(i, 1);
    }
  }

  private updateBuffs(): void {
    const r = ARCHETYPE.officer.buffRadius;
    for (const e of this.enemies) {
      e.buff = false;
      if (!e.alive) continue;
      for (const o of this.enemies) {
        if (o === e || !o.alive || o.def.kind !== 'officer') continue;
        if (hyp2(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < r) {
          e.buff = true;
          break;
        }
      }
    }
  }

  /** A recon drone sees a player: its operator grows suspicious, then is alerted (the squad radioed). */
  private onDroneSpot = (d: ReconDrone, p: PlayerRef, full: boolean): void => {
    const op = d.operator;
    if (op.alerted || full) {
      if (!op.alerted) {
        op.notice(p.feet.x, p.feet.z, 0.99);
        op.bark('drone');
        op.alert();
      }
      // (guard-ai S24) that player's slot; the operator hunts him
      const slot = this.intruders.slotFor(p.id);
      this.reportIntruder(slot, p.feet.x, p.feet.y, p.feet.z, true);
      op.tell(slot);
    } else op.notice(p.feet.x, p.feet.z, Math.min(0.9, 0.3 + d.meter * 0.6));
  };

  private updateDrones(dt: number): void {
    const players = this.players();
    const perc = this.diff.perception;
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const d = this.drones[i]!;
      const floor = this.nav.heightAt(d.pos.x, d.pos.z);
      const keep = d.update(dt, players, perc, floor, this.onDroneSpot);
      if (!keep) {
        d.dispose();
        this.drones.splice(i, 1);
      }
    }
  }

  /** Render-rate animation (interpolated between fixed steps). */
  frameUpdate(dt: number, alpha: number): void {
    for (const e of this.enemies) e.frame(dt, alpha);
    for (const e of this.dogCorpses) e.frame(dt, alpha);
    for (const d of this.drones) d.frame(dt);
  }

  clear(): void {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    for (const e of this.dogCorpses) e.dispose();
    this.dogCorpses.length = 0;
    for (const d of this.drones) d.dispose();
    this.drones.length = 0;
    this.squads.clear();
    this.silent.clear();
    // (guard-ai S5b) the slot tags are read afresh on the next load
    this.tagSlots = null;
    this.slotGuard.length = 0;
    // (guard-ai S10) and the section's talking pairs
    this.pairs.length = 0;
    this.pairSkips.length = 0;
    this.pairT = 0;
    this.lastCheckCaller = null;
    // (guard-ai S2) nobody left to send: the incidents go too; (S3) and every call and queued reception
    this.board.clear();
    // (guard-ai S17) and the last tripped device; (S19) and the body reports
    this.devT = -Infinity;
    this.bcHold.fill(-1);
    this.bcBody.fill(null);
    this.radioNet.clear();
    // (S6) and the command call it may have owed
    this.command.clear();
    // (S4) and every caution: the section starts calm
    this.awareness.clear();
    this.lastHold = -1;
    this.ackCaller.fill(-1);
    // (guard-ai S14) no alert calls; the section's tallies start again (a section load, a restart)
    this.alertLog.clear();
    this.shotsCall = -1;
    this.counts.reset();
    for (const b of [...this.bodies]) this.removeBody(b);
    // nobody left to hold a job: the alarm run, the flank, the flashlights
    this.alarmRunner = null;
    this.flanker = null;
    const reg = this.world.level.lights;
    for (let i = 0; i < this.torches.length; i++) {
      if (this.torchOwner[i]) reg.setOn(this.torches[i]!.id, false);
      this.torchOwner[i] = null;
    }
    this.coverOwner.clear();
    // (guard-ai S8) no reservations, no blocked covers, no engagement
    this.coverSet.owner.fill(-1);
    this.coverSet.block.fill(0);
    this.coverBlockT.fill(0);
    this.callers.fill(-1);
    this.rolesActive = false;
    // (guard-ai S24) no intruder known (the players keep their slots); the reinforcements' intruder
    this.intruders.clear();
    this.mirror();
    this.alarmHunt = -1;
    this.contactHunt = -1;
    // (guard-ai S12) and the helmets on the floor
    this.helmetDrops.clear();
    // (guard-ai S13) and the response teams: only an unload or a restart ends them
    this.teams.length = 0;
    // (guard-ai S15) and what the guards knew of dark fixtures and cut circuits
    this.dark.clear();
    this.lastFault.clear();
    // (guard-ai S22) and of the consoles (the game reports each again on its next toggle)
    this.consoles.clear();
  }
}
