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
import type { LightDef } from '../world/lights';
import { beamReach, type BeamHit } from '../world/torches';
import { nearestPanel, type AlarmPanel } from './alarm';
import { hyp2, hyp3 } from '../core/mathx';
import { ARCHETYPE, type DifficultyDef } from './archetypes';
import { ALERT } from './alertState';
import { ReconDrone } from './reconDrone';
import { HEARING, ambientDb, effectiveReach, hearTier, wallMatters, WALL_FACTOR, type HearTier, type NoisySource } from './hearing';
import { MUFFLE } from '../config/noise';
import { CMD_ACK, CMD_SEND, GuardView, GV_BUSY, GV_DOWN, GV_HELD, GV_MELEE, GV_OFFICER, GV_POSTED, INCIDENT, IncidentBoard, LEVEL, lightInView, MODE_COVER, MODE_INVESTIGATE, MODE_LEAD, MODE_LIGHT, type IncidentKind, type PathLen } from './incidents';
import { EYE_STAND, PERCEPTION } from './perception';
import { roomAt, type SquadSlot } from '../world/rooms';
import { reportGuardAi, sectionAt, validateGuardAi } from './guardAiData';
import { CALL_KIND, callHold, hearsVoice, RADIO, RadioNet, type CallKind, type RadioSink } from './radioNet';
import type { P2 } from './navGrid';
// (guard-ai S7) cameras see bodies
import { MODE_BODY } from './incidents';
import { camBodyLine } from './barks';
import type { CameraBodyEvent } from '../security/securitySystem';
import { Awareness, CAUTION, MAX_KEYS } from './awareness';
import { bodyNoticed } from './bodies';

// Live guard cap. 12 = the Dead Line co-op peak of 10 chapter-active guards (furthest-behind and furthest-ahead
// player, each with their next chapter) plus the two alarm reinforcements; about 2.6 ms main thread (D1 guard cost).
export const MAX_ALIVE = 12;
/** (sector-redesign) Uncoordinated lights-out: the guard sent stands on the light's floor - his feet not above the
 *  fixture height `y` (a lamp, or a wall switch + 2.5) and at most this many m below it. */
export const LIGHTS_OUT_BELOW = 7;

/** (guard-ai S3) A completed `command` call ("Command, contact. Send backup.") raises the alarm like a panel (M4).
 *  Off until S6 starts command calls and finishes the alarm; nothing starts one yet. */
export const RADIO_ALARM = false;

/** (guard-ai S4) The bit of guard key `k` in an awareness mask (0 when out of range). */
function keyBit(k: number): number {
  return k >= 0 && k < MAX_KEYS ? (1 << k) >>> 0 : 0;
}

/** (guard-ai S3) The radio net's tick (s): 10 Hz. */
const RADIO_TICK = 0.1;

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
  /** Shared last known position of the players (the latest sighting / located noise). */
  readonly lkp = new Vector3();
  private readonly earA = new Vector3();
  private readonly earB = new Vector3();
  lkpValid = false;
  /** Seconds since an alerted enemy last had a player in sight. */
  sightT = 99;
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
  onAlarm: ((e: Enemy, p: AlarmPanel) => void) | null = null;
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
  private buffT = 0;
  /** Callouts (GameState shows them). */
  onBark: ((e: Enemy, line: string, radio: boolean) => void) | null = null;
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
  /** Where completed calls go (made once). */
  private readonly sink: RadioSink = {
    deliver: (gid, inc, kind, caller) => this.radioDeliver(gid, inc, kind, caller),
    alarm: (_section, caller) => this.radioAlarm(caller),
    completed: (caller, _inc, kind) => {
      // the spotter's radio line, as the section hears it; (S4) the body reports
      if (kind === 'contact') this.byNum(caller)?.bark('callIn');
      else if (kind === 'body') this.byNum(caller)?.bark('deadReport');
      else if (kind === 'ko') this.byNum(caller)?.bark('koReport');
    },
  };

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
    this.ctx = {
      scene,
      world,
      nav,
      registry,
      ballistics,
      vfx,
      diff,
      players,
      flow: () => this.flowField,
      enemies: () => this.enemies,
      cover: world.level.cover,
      coverSegments: world.level.coverSegments,
      rooms: world.layout.rooms ?? [],
      reserveCover: (e, idx) => {
        const o = this.coverOwner.get(idx);
        if (o && o !== e && o.alive) return false;
        this.releaseCover(e);
        this.coverOwner.set(idx, e);
        return true;
      },
      releaseCover: (e) => this.releaseCover(e),
      onKilled: (e, h) => {
        this.kills++;
        this.releaseCover(e);
        // (guard-ai S4) the awareness roster, and who saw it
        if (this.coordinated) this.downed(e);
        this.onKilled?.(e, h);
      },
      onShot: (e, a, b) => this.onEnemyShot?.(e, a, b),
      onBark: (e, line, radio) => this.onBark?.(e, line, radio),
      onMelee: (e) => this.onEnemyMelee?.(e),
      onWindup: (e) => this.onEnemyWindup?.(e),
      isFlanker: (e) => this.flanker === e,
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
      reportSighting: (p) => {
        p.spotted = true;
        this.lkp.copyFrom(p.feet);
        this.lkpValid = true;
        this.sightT = 0;
      },
      callAlert: (e) => {
        for (const o of this.enemies) {
          if (o === e || !o.alive || o.alerted) continue;
          const d = Vector3.Distance(o.pos, e.pos);
          if (d < EnemyManager.RADIO) o.radio((0.4 + d * 0.03 + Math.random() * 0.3) * this.diff.reaction * (o.buff ? ARCHETYPE.officer.reaction : 1));
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
          if (hyp2(o.pos.x - e.pos.x, o.pos.z - e.pos.z) < ALERT.shout && Math.abs(o.pos.y - e.pos.y) < 2.5) o.radio(0.3 + Math.random() * 0.3);
        }
      },
      radioCall: (e, inc, kind) => {
        if (this.coordinated) this.radioNet.startCall(e.num, inc, kind, callHold(kind, this.reactionOf(e)));
      },
      radioCut: (e) => {
        this.radioNet.cut(e.num);
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
    if (this.coordinated) {
      if (b.lethal) {
        e.bark('body');
        e.searchAt(b.pos.x, b.pos.z, null);
        const mask = (this.voiceMask(e) | keyBit(e.key) | also) >>> 0;
        this.voiceNear?.searchAt(b.pos.x, b.pos.z, null);
        const h = this.awareness.openHold('dead', mask);
        this.lastHold = h;
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

  /** (Sector Ops) A section load or restart: a panel alarm can be raised again, and no guard holds the run. */
  resetAlarm(): void {
    this.alarmRaised = false;
    this.alarmRunner = null;
  }

  /** An alerted enemy worked a panel: reinforcements (once per match). */
  private raiseAlarm(e: Enemy, p: AlarmPanel): void {
    if (this.alarmRaised || p.disabled) return;
    this.alarmRaised = true;
    this.alarmRunner = null;
    this.onAlarm?.(e, p);
  }

  /** Bring a reinforcement squad in at `at` (alerted, told the last known position). */
  reinforce(kind: EnemyKind, at: Vector3, n: number): Enemy[] {
    const out: Enemy[] = [];
    for (let i = 0; i < n; i++) {
      const e = this.spawn(kind, at.add(new Vector3((i - (n - 1) / 2) * 1.2, 0, (i % 2) * 1.1)), true, Math.random() * 6);
      if (e) out.push(e);
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
    const key = lightId >= 0 ? lightId : group >= 0 ? 100000 + group : -1;
    this.report('light', x, floor, z, key, n);
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
    return this.ballistics.clear(this.earA, this.earB, G.STATIC);
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
      // an officer calls it in himself
      const d = hyp2(p.x - e.pos.x, p.z - e.pos.z) * (e.def.kind === 'officer' ? 0.25 : 1);
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
    }
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
    const light = this.world.lightField.totalAt(vx, vy + 0.2, vz);
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
    for (const [k, v] of this.coverOwner) if (v === e) this.coverOwner.delete(k);
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
    this.alarmT = 0;
    this.buffT = 0;
    this.grenadeT = 0;
    this.radioT = ARCHETYPE.radio.period;
    const ps = this.players();
    for (let i = 0; i < ps.length; i++) ps[i]!.spotted = false;
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
    if (alerted) e.alert();
    this.enemies.push(e);
    if (kind === 'droneOp') this.drones.push(new ReconDrone(this.scene, this.world.parts, this.registry, this.ballistics, this.vfx, e));
    return e;
  }

  /**
   * (guard-ai S5) A map mode placed guard `e` from `slot` in section `section` (call right after `spawn` and
   * `setPatrol`): his post (`slot.post`: a leash round his spawn point, facing `slot.yaw`; a high-security post never
   * leaves it, `posts.ts`), his behaviour profile and his section (Sector Ops passes the `SectorDef` index; omitted: the
   * `MapLayout.guardAi` zone he stands in, else 0). S5b reads the squad / handler / zone / role tags here.
   */
  placeSlot(e: Enemy, slot: Pick<SquadSlot, 'yaw' | 'post' | 'profile'>, section?: number): void {
    e.section = section ?? sectionAt(this.world.layout.guardAi, e.pos.x, e.pos.z);
    e.profile = slot.profile ?? 'standard';
    e.setPost(slot.post ?? null, slot.yaw);
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

  /** Squad radio checks (stealth rules): a calm caller checks in; a silent member gets looked for. */
  radioCheckNow(): void {
    this.radioChecks++;
    for (const [, roster] of this.squads) {
      let caller: Enemy | null = null;
      for (const m of roster) {
        if (!m.alive || m.alerted || m.dog) continue;
        if (!caller || m.def.kind === 'officer') caller = m;
      }
      if (!caller || caller.level !== 'unaware') continue;
      caller.bark('radioCheck');
      let missed = false;
      for (const m of roster) {
        if (m.alive || this.silent.has(m)) continue;
        this.silent.add(m);
        this.radioMisses++;
        missed = true;
        caller.searchAt(m.pos.x, m.pos.z, null);
      }
      if (missed) caller.bark('missed');
      else
        for (const m of roster)
          if (m !== caller && m.alive && !m.dog) {
            m.bark('radioOk');
            break;
          }
    }
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
        if (m === MODE_LIGHT) e.checkLight(o.x[k]!, o.z[k]!, inc, o.arg[k]!);
        else if (m === MODE_LEAD || m === MODE_COVER) e.pairSearch(o.x[k]!, o.z[k]!, inc, m === MODE_LEAD);
        // (guard-ai S3, S2 check polish 2) a plain noise or a lure that finds nothing ends calm; gunfire keeps the cooldown
        else if (m === MODE_INVESTIGATE) e.sendTo(o.x[k]!, o.z[k]!, inc, b.kindOf(inc) !== 'shots');
        // (guard-ai S7) a body a camera saw: the one nearest the incident's spot
        else if (m === MODE_BODY) {
          const body = this.camBodyOf(inc, o.x[k]!, o.z[k]!);
          if (body) e.checkBody(body, inc);
        }
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
      if (o === e || !o.alive || o.alerted || o.taken) continue;
      if (this.hearsShout(e, o) >= 0) o.radio(RADIO.voiceDelay);
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
      e.radio(0);
      return;
    }
    // (guard-ai S4) a death reported (`inc` is the hold): he knows of it now (held caution)
    if (kind === 'body' && this.awareness.addAware(inc, e.key)) this.syncCaution();
    const k = CALL_KIND.indexOf(kind);
    for (let j = 0; j < this.ackCaller.length; j++) if (this.ackCaller[j] === caller && this.ackInc[j] === inc && this.ackKind[j] === k) return;
    const j = this.ackK;
    this.ackK = (j + 1) % this.ackCaller.length;
    this.ackCaller[j] = caller;
    this.ackInc[j] = inc;
    this.ackKind[j] = k;
    e.bark('ack');
  }

  /** (guard-ai S3) A `command` call got through: the alarm (reinforcements, M4), behind `RADIO_ALARM` until S6. */
  private radioAlarm(caller: number): void {
    if (!RADIO_ALARM || this.alarmRaised) return;
    const e = this.byNum(caller);
    if (!e) return;
    const p = nearestPanel(this.alarms, e.pos.x, e.pos.z, Infinity, e.pos.y) ?? this.alarms[0];
    if (p) this.raiseAlarm(e, p);
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
   * fix 1). Uncoordinated (parked modes): everyone within `reach` goes to combat, no walls (the old rule).
   */
  noise(pos: Vector3, reach: number): void {
    const list = this.enemies;
    const n = list.length;
    let locate = false;
    if (!this.coordinated) {
      for (let i = 0; i < n; i++) {
        const e = list[i]!;
        if (!e.alive || hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z) >= reach) continue;
        e.hearGunfire(pos.x, pos.z);
        locate = true;
      }
    } else {
      this.hearRoom(n);
      const who = this.hearWho;
      let nh = 0;
      for (let i = 0; i < n; i++) {
        const e = list[i]!;
        if (!e.alive || e.taken) continue;
        const d = hyp3(e.pos.x - pos.x, e.pos.y - pos.y, e.pos.z - pos.z);
        if (d >= reach) continue;
        const tier = this.tierOf(e, i, pos, reach, d, true);
        if (tier === 0) continue;
        if (e.alerted || tier === 3) {
          e.hearGunfire(pos.x, pos.z);
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
    }
    if (locate) {
      this.lkp.copyFrom(pos);
      this.lkpValid = true;
    }
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
  hear(pos: Vector3, reach: number, kind: 'noise' | 'distraction' = 'noise'): void {
    const list = this.enemies;
    const n = list.length;
    this.hearRoom(n);
    const who = this.hearWho;
    let nh = 0;
    for (let i = 0; i < n; i++) {
      const e = list[i]!;
      if (!e.alive || e.alerted || e.passive || e.taken) continue;
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
      const d = this.players()[0] ? Vector3.Distance(e.pos, this.players()[0]!.feet) : 0;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    this.flanker = best;
  }

  private refreshFlow(): void {
    // stealth: towards where they think the players are, never where they really are
    const live = this.players().filter((p) => p.target.alive);
    const goals = this.stealth ? (this.lkpValid ? [[this.lkp.x, this.lkp.z] as [number, number]] : []) : live.map((p) => [p.feet.x, p.feet.z] as [number, number]);
    // heights pick the storey (a roof, an upper floor) the goal is on
    const ys = this.stealth ? [this.lkp.y] : live.map((p) => p.feet.y);
    if (goals.length) this.nav.flowField(goals, this.flowField, ys);
    this.flowVer = this.nav.version;
  }

  update(dt: number): void {
    this.sightT += dt;
    // nobody hunting any more: the last known position is forgotten
    if (this.lkpValid && this.sightT > 2 && !this.hunting) this.lkpValid = false;
    this.flowT -= dt;
    // (sector-fixes-r2 nav) a nav closure opened or shut (a team door): the flow field is rebuilt at once
    if (this.flowT <= 0 || this.flowVer !== this.nav.version) {
      this.flowT = 0.5;
      this.refreshFlow();
      this.assignFlanker();
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
        this.radioT = ARCHETYPE.radio.period + (Math.random() * 2 - 1) * ARCHETYPE.radio.jitter;
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
    }
    this.updateDrones(dt);
    const doors = this.world.doors;
    for (const e of this.enemies) {
      e.update(dt);
      // walking into a closed door pushes it open
      if (doors.list.length && e.alive) doors.pushOpen(e.pos.x, e.pos.z);
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
        b.light = field.totalAt(b.pos.x, b.pos.y + 0.2, b.pos.z);
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
      this.lkp.copyFrom(p.feet);
      this.lkpValid = true;
      this.sightT = 0;
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
    // (guard-ai S2) nobody left to send: the incidents go too; (S3) and every call and queued reception
    this.board.clear();
    this.radioNet.clear();
    // (S4) and every caution: the section starts calm
    this.awareness.clear();
    this.lastHold = -1;
    this.ackCaller.fill(-1);
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
  }
}
