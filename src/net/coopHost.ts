import { Vector3 } from '../core/babylon';
import { emptyKinds } from '../ai/enemyDefs';
import type { GameState, ModeId, NetAttachment } from '../game/gameState';
import type { Difficulty } from '../ai/archetypes';
import type { Enemy } from '../ai/enemy';
import type { HitInfo } from '../game/damage';
import type { Interactable } from '../game/interactables';
import type { BlobShadows } from '../vfx/blobShadows';
import { WEAPONS, GRENADE } from '../weapons/weaponDefs';
import { MASK } from '../physics/groups';
import { Hitboxes } from '../ai/hitboxes';
import { defaultHq, hqStats } from '../progression/suit';
import { SD_OPEN_NOISE } from '../weapons/sdRounds';
import type { NetSession } from './session';
import { TickLimiter, type CourseWire } from '../game/course/courseWire';
import type { SecWire } from '../game/ctDevices';
import { syringesFor, type SectorNetExtra } from '../game/sectors';
import { DROP_BODY_ID, eventQueueKeeps, gaitWire, motionWire, ITEM_KINDS, markIntel, MAX_DOORS, MAX_EVENTS, MAX_ENEMIES, MAX_ITEMS, PF, BARK_CAM, BARK_TEXT, hitConfirmKind, packAlert, type EndStats, type EnemyState, type Msg, type NetEvent, type NetItem, type PlayerInfo, type PlayerState, type UseOnlyGadget, snapEnemyState, snapItem, snapPlayerState, wirePlayerState } from './protocol';
import { RemoteAvatar } from './remoteAvatar';
import { RemotePlayer } from './remotePlayer';
import { HoldClock, holdFeed, stepHoldFeed, type HoldFeed } from './holdFeed';
import { goggleColour } from '../operators/runtime/goggle';
import type { OperatorFigure } from '../operators/runtime/figure';
import type { PlayerSlot, TeamRef } from '../game/playerSlots';
import { PartnerBlocker, partnerPassable } from './partnerBlocker';
import { checkBlast, checkShot, clientStepNoise, hostLampShots, hostShotAllowed, hostShotWeapon, lampShotStale, maxHitDamage, playersHostile, SHOT_UNDER, SHOT_UNDER_HANG } from './validate';
import { localFlags, htmlToInfo } from './netShared';
import { keepSimInBackground } from './bgTicks';
import { hostHoldPulse, inUseReach } from './holdPulse';
import { LAMP_LOS_SLACK, LampSender, lampShotOk, lampTargetId, SWAY_TARGET, swayShotOk, swayTargetId } from './lampSync';
import { lampReachProbe } from '../world/lights';
import { hyp2 } from '../core/mathx';
import { barkIndex } from '../ai/barks';
import { wireCarry } from './puppetCarry';
import { localMoveState } from '../game/localMoveState';
import { emptyMoveState, moveChanged } from '../player/moveState';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, playerBody } from '../player/playerVolumes';
import { hostCrackOk } from '../world/doorPeek';
import { contactDelay, GRAB } from '../game/takedown';
import { hangHoldStep, hangingMove, type HangSpot } from './hangHold';
import { koCurve, type KoState } from '../game/closeQuarters';
import { checkTeamRequest, inOpenMove, isKitKind, OPEN_MOVE_GRACE, type TeamKind, type TeamMoveKind, type TeamSide } from '../game/teamMoves';
import { kitMove } from '../game/kit/registry';
import { kitEnd, kitPairOver, newKitPair, PULL_PAIR_S, pullLag, sameAttempt, SHUTTER_PAIR_S, type KitPair } from './kitNet';
import { ThrowKo } from './throwKo';
import { checkCommitted, type CKind, type CTargetView } from '../game/committedMoves';
import { STRIKE, STRIKE_DUR } from '../game/elbowStrike';
import { DualClock } from '../game/dualTakedown';
import { assistHolder } from './assistTakedown';
import type { TakedownVictim } from '../game/takedownController';
import { stationHeal } from '../game/medkit';
import { ReviveClock } from '../game/reviveClock';
import { campaignReviveCap, isCampaignMission } from '../game/mission/campaign';
import type { MissionDef } from '../game/mission/missionDef';
import { pickMission } from '../game/mission/sectorMission';
import type { CourseMode } from '../game/modes/courseMode';
import type { PickupKind } from '../game/pickups';
import { hasInfo, takeInfo } from '../ai/guardInfo';
import { revealIntel, revealJoint } from '../game/intelReveal';
import { hasJoint, JOINT, JOINT_BLUFF_FEED, jointBluffer, jointHasLines, jointOf, type Bluff, type JointIntel } from '../game/jointInterrogation';
import { interrogationEnded } from '../game/intel';
import type { TeamMate } from '../game/teamController';
import type { PlayerRef } from '../ai/enemy';
import { joinSpawn, slotSpawn, type SlotPoint, type SpawnBody } from '../game/spawnSlots';
import { OutFollow } from '../game/sectorOut';
import { canWalk, offSection, spawnProbe, startSlotPoints } from '../game/spawnPlace';
import { HALL_BACK_HOLD } from '../game/jammer';
import { hostTrapKey, openTrapGaps } from '../game/gapMenu';
import { JOIN_PLACE, JOIN_RESYNC, JOIN_REVIVE_QUIET_S, JoinWatch } from './joinWatch';
import { ClockSync, HOST_INTERP_DELAY } from './interp';
import { CT, TEAM } from '../config/movement';
import type { Body } from '../ai/body';
import { BODY } from '../ai/bodies';
import { DROP_NOISE } from '../game/bodyCarry';
import { bodyItem, hideOk, inCarryReach, letGoHeard, pickupDenied } from './bodyCarryNet';
import { CarryView } from './carryView';
import { judgeRewound, newRewound, pushHist, rewindHist, stanceBody, stanceHead, type Hist, type Rewound } from './shotHistory';

const SNAP_HZ = 15;
const HISTORY_HZ = 20;
/** (rig-pose-fix S3) Samples kept per guard (1.2 s, past `MAX_REWIND`). */
const HISTORY_MAX = Math.ceil(HISTORY_HZ * 1.2);
const MAX_REWIND = 0.6;
/** (afp AF6) `HOST_INTERP_DELAY` (interp.ts; was 0.1). */
const INTERP_DELAY = HOST_INTERP_DELAY;
/** Items and door states are re-sent at least this often (s), else only when they change. */
const ITEMS_EVERY = 2;
/** Seconds to revive a downed team-mate (HQ medic training divides it). */
const REVIVE_TIME = 2.5;
/** Shot noise radius (m) like the local player's (`GameState` SHOT_NOISE); suppressed shots only raise suspicion. */
const SHOT_NOISE = 28;
/** A client takedown: the victim within this of the client (m), and let go after this long without an outcome (s). */
const TD_REACH = 3;
const TD_MAX = 6;
/** (coop4 A20) A timed team move keeps both players busy this long past its length (s). */
const TEAM_BUSY_SLACK = 0.5;

/**
 * (sector-ops step 3, M7, A10; mission-rules R5, G126, A7) The host's revive rules for a match, set on `clock`: Sector
 * Ops gives the op's syringes per difficulty (G188); a campaign mission (`missionId`, the session's `sectorMission`, on
 * the map's `missions`) gives `CAMPAIGN.revives` (2) at every difficulty; any other mode keeps the clock's default (2).
 * The window stays `REVIVE_WINDOW` (30 s) everywhere. True for a campaign mission: its cap is never topped up
 * (`addSyringes`). Runs once, in the constructor.
 */
export function matchRevives(clock: ReviveClock, mode: ModeId, difficulty: Difficulty | undefined, missions: readonly MissionDef[] | undefined, missionId: string, players = 2): boolean {
  if (mode !== 'sector') return false;
  const def = pickMission(missions, missionId || null);
  // (coop4 A4, merge 10) `players` at the op start: one more syringe per player beyond 2 (`syringesFor`)
  clock.cap = campaignReviveCap(def, syringesFor(difficulty, players));
  return isCampaignMission(def);
}

type Tally = EndStats['players'][string];
const emptyTally = (): Tally => ({ kills: 0, headshots: 0, byKind: emptyKinds(), weaponKills: {} });

/** The enemy alert level on the wire (`EnemyState.al`): level, seized, (25, coop-torches) his flashlight on and (32,
 *  guard-ai S9) cautious, helmet, armour, (A126) his S21 weapon carry (read only: `Enemy.carry`'s phase), (G6n) his look seed. */
function alertCode(e: Enemy, torch: boolean): number {
  const l = e.level;
  const a = l === 'alert' ? 3 : l === 'searching' ? 2 : l === 'suspicious' || l === 'investigating' ? 1 : 0;
  return packAlert(a, e.taken, torch, e.caution > 0, e.helmet, e.armour, wireCarry(e.carry.phase), e.look);
}

/** (coop4) A remote's or a ref's player slot. */
function slotKey(x: TeamRef | RemotePlayer): number {
  return x instanceof RemotePlayer ? x.ref.slot : x.slot;
}

/** (coop4) Insertion sort by player slot, in place (<= 4 entries, no allocation). */
function sortBySlot<T extends TeamRef | RemotePlayer>(a: T[]): void {
  for (let i = 1; i < a.length; i++) {
    const p = a[i]!;
    const k = slotKey(p);
    let j = i - 1;
    while (j >= 0 && slotKey(a[j]!) > k) {
      a[j + 1] = a[j]!;
      j--;
    }
    a[j + 1] = p;
  }
}

/** (G135, coop4 A15) A body's goggle colour by player slot: slot 0 keeps the lens asset's green (`goggleColour`). */
function glowBySlot(figure: OperatorFigure, slot: number): void {
  figure.setGlowColour(slot === 0 ? null : goggleColour(slot));
}

/** (coop4 round fix, check B) The host's out follow view scan: `Map.forEach` with this module function and a reused
 *  context, so a step while out makes no iterator or closure. */
interface HostFollowScan {
  f: OutFollow;
  out: ReadonlySet<string>;
}
function followSetRemote(this: HostFollowScan, r: RemotePlayer): void {
  if (r.alive && !r.held && !this.out.has(r.id)) this.f.set(r.ref.slot, r.avatar.pos);
}

/**
 * Host side of a match. The host runs the full simulation (AI, modes, pickups, objectives) and owns every outcome:
 * client shots are re-checked against lag-compensated positions, client grenades are re-detonated here, health for
 * every player lives here, client uses of objectives / doors / revives and client takedowns are checked for reach.
 * Co-op: a downed player can be revived by a team-mate (an interactable on the body); everyone down hands over to
 * the mode (lives / checkpoint / defeat).
 */
export class CoopHost implements NetAttachment {
  private remotes = new Map<string, RemotePlayer>();
  /** The remotes' refs in slot order (coop4), kept on join / leave so `g.remotePlayers()` never allocates. */
  private readonly remoteRefs: TeamRef[] = [];
  /** The solo accessor this host replaced (restored on dispose). */
  private readonly soloRemotes: () => readonly PlayerRef[];
  private queue: NetEvent[] = [];
  private time = 0;
  private snapT = 0;
  private histT = 0;
  private noiseT = 0;
  /** (spare 9) A client's interrogation progress per seized enemy (MoveState ph while sub bit 2; -1 none). */
  private readonly interPh = new Map<string, number>();
  private itemsT = 0;
  private itemsSig = '';
  private doorsSig = '';
  /** (CHECK-M B1) The open trap gaps (`trp`), refilled each snapshot (no allocation; a copy goes on the wire). */
  private readonly trpBuf: number[] = [];
  private bodiesSig = '';
  /** (coop-carry) Each client's body carry (by player id): the host's `Body` (carried) shown on its avatar. */
  private carries = new Map<string, CarryView>();
  private history = new Map<string, Hist[]>();
  private tallies = new Map<string, Tally>();
  private offs: (() => void)[] = [];
  private obj = '';
  private info = '';
  private tracerBudget = 0;
  private tmp = new Vector3();
  private tmpB = new Vector3();
  private tmpH = new Vector3();
  /** Revive points on downed players (co-op). */
  private revives = new Map<string, Interactable>();
  /** Enemies seized by a client's takedown: enemy id -> client id and seconds held; (hostage-gait) the hold point feed. */
  private seized = new Map<string, { by: string; t: number; hostage?: boolean; hang?: HangSpot } & HoldFeed>();
  /** (coop-walk-fixes P6) A client's team takedown under way on a partner's hostage: client id -> enemy id. */
  private assists = new Map<string, string>();
  /** (joint-interrogation, G148) Live bluffs: bluffer id -> the guard and the host time it started. Stale entries go at
   *  the next read's check (`jointBluffer`); nothing per step. Public for the e2e. */
  readonly bluffs = new Map<string, Bluff>();
  /** (joint-interrogation) A bluffer's distance to the guard being read (Infinity: gone or down); bound once. */
  private jointEid = '';
  private readonly bluffDist = (id: string): number => {
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === this.jointEid);
    if (!e) return Infinity;
    if (id === this.s.selfId) return this.g.player.alive ? hyp2(e.pos.x - this.g.player.position.x, e.pos.z - this.g.player.position.z) : Infinity;
    const r = this.remotes.get(id);
    return r && r.alive ? hyp2(e.pos.x - r.feet.x, e.pos.z - r.feet.z) : Infinity;
  };
  /** (P6) A client's `grab` MoveState target ('' none), for `assistHolder` (bound once: no closure per call). */
  private readonly grabTid = (id: string): string => {
    const mv = this.remotes.get(id)?.state?.mv;
    return mv && mv.m === 'grab' ? (mv.tid ?? '') : '';
  };
  /** (hostage-gait) Render time vs sim time for the hold feed (set each frame with the remote bodies). */
  private readonly holdClock = new HoldClock();
  /** (G7) Scratch for a client hold's knockout pose. */
  private koTmp: KoState = { limp: 0, lower: 0, bend: 0 };
  /** Shot noise edges per client. */
  private firing = new Map<string, number>();
  /** Course mode: per partner hit volumes the host's own shots resolve against. */
  private partnerBoxes = new Map<string, Hitboxes>();
  /** Course mode (D38): team damage on (player hit volumes), co-op rules otherwise (downed, revivable, no frags). */
  private readonly ff: boolean;
  /** Course mode: `ctick` rate limit per client. */
  private ctickLim = new Map<string, TickLimiter>();
  /** Free roam: respawn timers. */
  private respawnIn = new Map<string, number>();
  private reviveTime: number;
  /** (B8, G126) 30 s revive window, 2 revives per mission; past either the player is out until the checkpoint. */
  readonly reviveClock = new ReviveClock();
  /** (mission-rules R5, G126, Q19) The match runs a campaign mission: 2 revives, never topped up (`addSyringes`). */
  private readonly campaign: boolean;
  private readonly expired: string[] = [];
  /** Whole seconds last written into each revive label (the label carries the countdown to every page). */
  private reviveSec = new Map<string, number>();
  /** (sector-redesign slice L, protocol 31) Sector Ops: the fixed lights' state to the client (`lamps`), null elsewhere. */
  private readonly lampTx: LampSender | null;
  /** (coop-real F1b, S2) A client's round through a lamp is checked and shot out: Sector Ops and Course mode. */
  private readonly lampShots: boolean;
  /** A `lamps` message goes on the next step whatever changed (a join, a rejoin, a section restart). */
  private lampForce = true;
  /** The mode's restart count last seen (a section restart forces a `lamps` send). */
  private lampRestarts = 0;
  /** (coop-real F1c) The host sim time (`time`) of the mode's last set / section restart (Course mode, Sector Ops):
   *  a client's lamp round fired before it is stale (`lampShotStale`). */
  private lampRestartAt = -Infinity;
  /** A client's lamp shots: rate limit per client (a lamp shot is a second message for a round). */
  private lampLim = new Map<string, TickLimiter>();
  private readonly lampA = new Vector3();
  private readonly lampB = new Vector3();
  /** (coop4 N1, A24) Sector Ops (up to 4 players): the snapshot's numbers go rounded (`snapPlayerState` etc.) to keep it
   *  inside its budget; the course (Marlow Yard, A27) and the legacy modes send them as before. */
  private readonly round: boolean;
  /** (39, LR16-5b) A client's pendant shots (`sw-<id>`): rate limit per client (a second message for a round). */
  private swayLim = new Map<string, TickLimiter>();

  constructor(
    private g: GameState,
    private s: NetSession,
  ) {
    const mode = g.opts.mode;
    this.ff = mode === 'course';
    this.round = mode === 'sector';
    if (this.ff) g.target.friendly = (h) => this.friendly(h, s.selfId);
    this.reviveTime = REVIVE_TIME / hqStats(g.opts.hq ?? defaultHq()).reviveSpeed;
    // (sector-ops step 3, M7, A10) Sector Ops: the revives are the op's syringes, per difficulty; (mission-rules R5,
    // G126) a campaign mission: 2 at every difficulty. `g.world.map` is set: the world is built before `attach`.
    // (coop4 A4) the team pool scales with the players at the op start (late joiners do not change it)
    this.campaign = matchRevives(this.reviveClock, mode, g.opts.difficulty, g.world.map.missions, s.sectorMission, s.players.size);
    this.lampTx = mode === 'sector' ? new LampSender() : null;
    this.lampShots = hostLampShots(mode);
    this.soloRemotes = g.remotePlayers;
    g.remotePlayers = () => this.remoteRefs;
    for (const p of s.players.values()) if (p.id !== s.selfId) this.addRemote(p);
    this.recolour();
    this.offs.push(
      s.events.on('lobby', ({ players }) => {
        for (const p of players) {
          if (p.id === s.selfId || this.remotes.has(p.id)) continue;
          this.addRemote(p);
          this.lampForce = true;
        }
        for (const id of [...this.remotes.keys()]) if (!players.some((p) => p.id === id)) this.removeRemote(id);
        // (coop4) slots never move during a match; the refs follow the session's table all the same
        for (const [id, r] of this.remotes) r.ref.slot = this.slotOf(id);
        sortBySlot(this.remoteRefs);
        this.recolour();
      }),
      s.events.on('peerLeft', ({ id, name }) => {
        this.removeRemote(id);
        this.recolour();
        g.app.toasts.show(`${name} left`, 'warn');
      }),
      s.events.on('game', ({ msg, from }) => this.receive(msg, from)),
      // (marlow-bays R2) a joiner dropped mid-match: held where it stood until it rejoins
      s.events.on('away', ({ id, name }) => this.hold(id, name)),
      s.events.on('rejoin', ({ id, name }) => {
        this.unhold(id, name);
        this.lampForce = true;
      }),
      // (coop-rejoin, walk item 7) the running match went to one client again (a late join, a rejoin, a reconnect):
      // the host places it on its first state
      s.events.on('late', ({ id }) => this.late(id)),
    );
    // (coop-rejoin) a course match going to one client starts at the current bay (its load lands by the checkpoint)
    if (mode === 'course') s.lateBay = () => g.mode?.resumeBay?.() ?? 1;
    this.hookHud();
    this.hookCombat();
    // (39, LR16-5b) every kick the host accepts (our rounds, the guards' rounds, blasts, bumps, a client's checked
    // round: `GameState` and `onSwayShot` make them on the shared clock) goes to the clients, applied verbatim there
    const sway = g.world.level.lights.sway;
    if (sway) {
      sway.onKick = (id, t, a, h) => this.push({ e: 'sway', id, t, a, h });
      this.offs.push(() => (sway.onKick = null));
    }
    // (coop-fix, bug 1) a hidden host page (the joiner's window over it) keeps simulating and sending snapshots
    this.offs.push(keepSimInBackground(g));
  }

  /** (G135, coop4 A15) Every body's goggle colour from its player slot (`GOGGLE_COLOURS`: host green, then cyan,
   *  magenta, warm white): the partner beacon. */
  private recolour(): void {
    glowBySlot(this.g.player.figure, 0);
    for (const [id, r] of this.remotes) glowBySlot(r.avatar.figure, this.slotOf(id));
  }

  /** (coop4 A10) Players in the session: connected plus held (the host and every remote, held ones included). */
  teamSize(): number {
    return 1 + this.remotes.size;
  }

  /** Attacker id on the wire ('local' / '' = the host). */
  private who(id: string): string {
    return id === 'local' || id === '' ? this.s.selfId : id;
  }

  /** Can `a` hurt `b`? Course mode (D38): anyone but themselves; co-op: never. */
  private hostile(a: string, b: string): boolean {
    return playersHostile(this.ff, a, b);
  }

  /** Course mode: hits that do not hurt `victim` (its own). */
  private friendly(h: HitInfo, victim: string): boolean {
    if (h.attackerTeam !== 'player') return false;
    return !this.hostile(this.who(h.attackerId), victim);
  }

  private hookHud(): void {
    const hud = this.g.hud;
    // (coop-fix, bug 2) an objective set before the hook (Free Roam's, `gameState.ts` create) reaches the client too
    this.obj = hud.objectiveText;
    const setObjective = hud.setObjective.bind(hud);
    hud.setObjective = (t) => {
      this.obj = t;
      setObjective(t);
    };
    const setModeInfo = hud.setModeInfo.bind(hud);
    hud.setModeInfo = (html) => {
      this.info = htmlToInfo(html);
      setModeInfo(html);
    };
    const banner = hud.banner.bind(hud);
    hud.banner = (title, sub = '', ms) => {
      // the local player's own DOWN / respawn banners stay local
      if (title !== 'DOWN' && title !== 'ELIMINATED') this.push({ e: 'banner', title, sub });
      banner(title, sub, ms);
    };
    // (spare 9) interrogation intel reaches the team as feed lines
    this.offs.push(this.g.events.on('intel', (ev) => { for (const text of ev.lines) this.push({ e: 'feed', text }); }));
  }

  private hookCombat(): void {
    const g = this.g;
    const em = g.enemyMgr;
    if (em) {
      const prevKilled = em.onKilled;
      em.onKilled = (e, h) => {
        prevKilled?.(e, h);
        this.onKill(e, h);
      };
      // (32, guard-ai S9) every line the host shows goes to the clients: a table line by index (`barkLine` rebuilds
      // it), a talking pair's line and the security desk's camera line as text
      const prevBark = em.onBark;
      em.onBark = (e, line, radio, ev, n, unit) => {
        prevBark?.(e, line, radio, ev, n, unit);
        const b = ev === undefined ? -1 : barkIndex(ev);
        if (b >= 0) this.push({ e: 'bark', id: e.id, b, n: n ?? 0, u: unit ?? 0, r: radio });
        else this.push({ e: 'bark', id: e.id, b: BARK_TEXT, n: 0, u: 0, r: radio, t: line });
      };
      const prevCam = em.onCameraLine;
      em.onCameraLine = (cam, line) => {
        prevCam?.(cam, line);
        this.push({ e: 'bark', id: cam, b: BARK_CAM, n: 0, u: 0, r: true, t: line });
      };
      const prevShot = em.onEnemyShot;
      em.onEnemyShot = (e, from, to) => {
        prevShot?.(e, from, to);
        if (this.tracerBudget-- > 0) {
          this.push({ e: 'tracer', ax: from.x, ay: from.y, az: from.z, bx: to.x, by: to.y, bz: to.z, c: e.def.weapon?.tracer ?? '#ffd27a' });
        }
      };
    }
    const prevBoom = g.explosions.onExplode;
    g.explosions.onExplode = (pos, r) => {
      prevBoom?.(pos, r);
      this.push({ e: 'boom', x: pos.x, y: pos.y, z: pos.z, r });
    };
    // the host's own gas / flash / EMP / noisemaker: everyone sees it
    g.gadgets.onLocal = (kind, at) => {
      if (kind === 'gas' || kind === 'flash' || kind === 'emp' || kind === 'noise') this.push({ e: 'gadget', player: this.s.selfId, kind, x: at.x, y: at.y, z: at.z });
    };
    this.offs.push(
      g.events.on('takedown', (e) => {
        if (e.phase === 'done') this.takedownDone(this.s.selfId);
      }),
    );
  }

  /** Takedowns finished by two players within `DUAL_WINDOW` s: a dual takedown (`DualClock`). */
  private readonly dualClock = new DualClock();
  /** Dual takedowns this match (tests). */
  duals = 0;
  /** (joint-interrogation) Joint reads this match (tests). */
  joints = 0;

  private takedownDone(by: string): void {
    const first = this.dualClock.note(by, this.time);
    if (first === null) return;
    const sub = `${this.name(first)} + ${this.name(by)}`;
    this.g.hud.banner('DUAL TAKEDOWN', sub, 1800);
    this.push({ e: 'banner', title: 'DUAL TAKEDOWN', sub });
    this.duals++;
    // (spare 12, A3) counted as its own event for section-rating (no extra knockout)
    this.g.style.record('dualTakedown', this.g.detected);
    this.g.events.emit('dualTakedown', { a: first, b: by, detected: this.g.detected });
  }

  private push(e: NetEvent): void {
    if (eventQueueKeeps(this.queue.length, e)) this.queue.push(e);
  }

  private spawnPoint(i: number): Vector3 {
    const sp = this.g.world.layout.playerSpawns;
    return (sp[i % sp.length] ?? sp[0]!).pos;
  }

  private addRemote(p: PlayerInfo): void {
    const g = this.g;
    const avatar = new RemoteAvatar(g.world, g.vfx, g.ballistics, p);
    avatar.onFire = (cls, at, gun, quiet) => g.events.emit('remoteShot', { cls, x: at.x, y: at.y, z: at.z, gun, quiet });
    const slot = this.slotOf(p.id);
    const r = new RemotePlayer(g.scene, g.registry, p.id, avatar, this.spawnPoint(slot));
    r.ref.slot = slot;
    r.onDamaged = (h) => this.push({ e: 'hurt', player: p.id, x: h.sourcePos.x, z: h.sourcePos.z, boom: h.kind === 'explosion' });
    r.onDeath = () => this.onRemoteDeath(r);
    r.loadout = p.loadout;
    if (this.ff) {
      r.friendly = (h) => this.friendly(h, p.id);
      // the host's own shots hit the partner (course mode) through its own hit volumes (head / body)
      if (this.hostile(this.s.selfId, p.id)) this.partnerBoxes.set(p.id, new Hitboxes(g.scene, g.registry, r, 1, 'average'));
      r.shootable = true;
    }
    // (T5b2, D49) a partner blocks the host's body as the host blocks theirs on the client; course friendly fire's hit
    // boxes then take bullets only
    r.blocker = new PartnerBlocker(g.scene, p.id);
    this.partnerBoxes.get(p.id)?.setSolid(false);
    this.remotes.set(p.id, r);
    this.remoteRefs.push(r.ref);
    sortBySlot(this.remoteRefs);
    if (!this.tallies.has(p.id)) this.tallies.set(p.id, emptyTally());
  }

  /** (R2) Held joiners' spots (restored on the rejoin) and (coop-rejoin) the watch over a client the match went to
   *  again, placed on its reload (fix round B1); the restores it repeats. */
  private readonly joins = new JoinWatch();
  /** (R2) Rejoined joiners still loading: held until their first state arrives. */
  private readonly rejoining = new Set<string>();

  /** (coop-rejoin) The match went to client `id` again (`start` sent to it alone): watched for its reload, which loads
   *  at the start area of the bay that `start` carried. */
  private late(id: string): void {
    this.joins.late(id, startSlotPoints(this.g, this.s.lateBay?.()), this.time);
  }

  /** (coop-rejoin, coop4 A19) Player slot of remote `id`: the session's slot table (fixed for the match; the host is
   *  slot 0); 1 for an id the table does not know. */
  private slotOf(id: string): PlayerSlot {
    const s = this.s.slotOf(id);
    return s === -1 || s === 0 ? 1 : s;
  }

  /** (coop-rejoin) The host's feet and facing (a spawn beside the host starts from it). */
  private hostPoint(): SlotPoint {
    const p = this.g.player.position;
    return { x: p.x, y: p.y, z: p.z, yaw: this.g.player.cam.yaw };
  }

  /**
   * (coop-rejoin, walk item 7) A state from a client the match went to again (`JoinWatch.state`): on the first, the
   * section state goes at once (items, doors, lamps, the course / sector message); on its reload (no state before, or
   * a jump into its start area; fix round B1: its first states can still be its old match's) it is put where the host
   * decides (`joinSpawn`): Course and Sector Ops, the current checkpoint at its slot point, or beside the host when the
   * checkpoint cannot reach the host; other modes, where its slot was held, else beside the host. It goes as the
   * `restore` event, repeated until the client stands there.
   */
  private joinStep(r: RemotePlayer, x: number, z: number): void {
    const j = this.joins.state(r.id, r.state ? r.feet : null, x, z, this.time);
    if (j & JOIN_RESYNC) {
      this.itemsT = 0;
      this.lampForce = true;
      this.g.mode?.resync?.();
    }
    if (!(j & JOIN_PLACE)) return;
    this.joins.place(r.id, this.joinSpot(r, this.joins.heldSpot(r.id)), this.time);
    r.allowTeleport(3);
  }

  /**
   * (mission-framework NET3, belt and braces) Remote `r`'s first state of the match, at (x, y, z): in Sector Ops, a body
   * outside the current section (`offSection`: away from the checkpoint and no walk to it, e.g. a client that started
   * at section 0 of a later-start mission) is put at the checkpoint (`joinSpot`), repeated as a `restore` until it
   * stands there. Every other mode, and a remote in the section, is untouched.
   */
  private firstPlace(r: RemotePlayer, x: number, y: number, z: number): void {
    const mode = this.g.mode;
    if (mode?.id !== 'sector' || !offSection(this.g, mode.checkpointSpawns?.() ?? [], x, y, z)) return;
    this.joins.place(r.id, this.joinSpot(r, null), this.time);
    r.allowTeleport(3);
  }

  /** (coop-rejoin) Where the host puts remote `r` as it (re)joins mid-run (`joinSpawn`, `held`: its held spot). */
  private joinSpot(r: RemotePlayer, held: SlotPoint | null): SlotPoint {
    const g = this.g;
    const mode = g.mode;
    const host = this.hostPoint();
    const others: SpawnBody[] = [host];
    for (const o of this.remotes.values()) if (o !== r && !o.held) others.push(o.feet);
    const out: SlotPoint = { x: 0, y: 0, z: 0, yaw: 0 };
    joinSpawn(
      {
        sectioned: mode?.id === 'course' || mode?.id === 'sector',
        // (marlow-play-2 C9) Course: the live station's marks (`CourseMode.joinSpawns`), not the holding room
        checkpoint: (mode as { joinSpawns?(): SlotPoint[] } | null | undefined)?.joinSpawns?.() ?? mode?.checkpointSpawns?.() ?? [],
        reachable: (from) => canWalk(g, from, host),
        host,
        others,
        probe: spawnProbe(g),
      },
      this.slotOf(r.id),
      held,
      out,
    );
    return out;
  }

  /**
   * (marlow-bays R2) A joiner dropped mid-match: its body stays where it stood (frozen: no states arrive), takes no
   * damage, and is out of the guards' and the course's player list until it rejoins; a line names the hold. A guard it
   * held is let go and a team move it was in ends.
   */
  private hold(id: string, name: string): void {
    const r = this.remotes.get(id);
    if (!r || r.held) return;
    r.held = true;
    this.rejoining.delete(id);
    const i = this.remoteRefs.indexOf(r.ref);
    if (i >= 0) this.remoteRefs.splice(i, 1);
    for (const [eid, sz] of this.seized) {
      if (sz.by !== id) continue;
      this.push({ e: 'tdDenied', player: id, enemy: eid });
      this.release(eid);
    }
    if (this.teamPairs.has(id)) this.onTeamMove(id, 'end', '', 0, 0, 0);
    this.teamClear(id);
    // (coop-carry) a body it carried is put down where it stood
    this.remoteDrop(id);
    // (coop4 merge A2) a held player's bluff goes (its frozen feet would still pass the bluff reach at the next read)
    this.bluffs.delete(id);
    this.joins.hold(id, { x: r.feet.x, y: r.feet.y, z: r.feet.z, yaw: r.state?.yaw ?? 0 });
    this.g.hud.setNetNotice(`${name} disconnected - reconnecting... (room ${this.s.code})`);
    this.g.app.toasts.show(`${name} disconnected. Their place is held for 10 minutes (room ${this.s.code}).`, 'warn');
    // (coop4 round fix, check A P2) Sector Ops at 3-4: everyone connected is OUT or down and the last one up dropped:
    // the section restarts now, not when it rejoins or its hold ends (`outIds` is empty at 1-2 players and in the
    // course, so they are unchanged)
    if (this.g.outIds.size > 0 && this.g.mode && !this.g.anyPlayerAlive()) this.g.mode.onPlayerDeath();
  }

  /** (R2) The held joiner is back on the room; it stays held while its match loads (`resume` on its first state). */
  private unhold(id: string, name: string): void {
    if (!this.remotes.get(id)?.held) return;
    this.rejoining.add(id);
    this.g.hud.setNetNotice(`${name} rejoining... (room ${this.s.code})`);
  }

  /** (R2) The rejoined joiner's first state: in play again, and put back where it was held (`restore`, repeated until
   *  it stands there, for 30 s). */
  private resume(r: RemotePlayer): void {
    this.rejoining.delete(r.id);
    r.held = false;
    if (!this.remoteRefs.includes(r.ref)) {
      this.remoteRefs.push(r.ref);
      sortBySlot(this.remoteRefs);
    }
    this.joins.resume(r.id, this.time);
    // (E9-crate, A106) the crates it used: its prompt stays gone (`fill` false: no top-up)
    for (const id of this.g.crates?.usedBy(r.id) ?? []) this.push({ e: 'crate', player: r.id, id, fill: false });
    this.g.hud.setNetNotice(null);
    this.g.app.toasts.show(`${r.avatar.info.name} rejoined`);
  }

  /** (R2) Each state from a rejoined joiner: until it stands where it was held (or placed), the restore goes out
   *  every 0.5 s (`JoinWatch.restoreStep`). */
  private restoreStep(r: RemotePlayer): void {
    if (r.held) return;
    const at = this.joins.restoreStep(r.id, r.feet.x, r.feet.z, this.time);
    if (this.joins.restoring(r.id)) r.allowTeleport(3);
    if (at) this.push({ e: 'restore', player: r.id, x: at.x, y: at.y, z: at.z, yaw: at.yaw });
  }

  private removeRemote(id: string): void {
    const r = this.remotes.get(id);
    if (!r) return;
    this.partnerBoxes.get(id)?.dispose();
    this.partnerBoxes.delete(id);
    this.joins.drop(id);
    this.rejoining.delete(id);
    this.teamClear(id);
    // (coop4, Guard AI AI1) the guards forget this intruder's slot (the same id rejoining gets its slot and last known
    // position back)
    this.g.enemyMgr?.intruderLeft(id);
    this.bluffs.delete(id);
    if (r.held) this.g.hud.setNetNotice(null);
    this.dropRevive(id);
    for (const [eid, s] of this.seized) if (s.by === id) this.release(eid);
    this.remoteDrop(id);
    r.dispose();
    this.remotes.delete(id);
    const i = this.remoteRefs.indexOf(r.ref);
    if (i >= 0) this.remoteRefs.splice(i, 1);
    // (coop4 round fix) an OUT leaver is no longer OUT (its slot bit leaves the wire's mask at once)
    this.g.mode?.onPlayerLeft?.(id);
    // a leaver can end a co-op match if everyone left standing is down
    if (this.g.mode && !this.g.anyPlayerAlive()) this.g.mode.onPlayerDeath();
  }

  // --- downed / revive (co-op) ---

  private anyoneUp(except: string): boolean {
    if (except !== this.s.selfId && this.g.player.alive) return true;
    // (marlow-bays R2) a held (dropped) partner cannot revive anyone
    for (const r of this.remotes.values()) if (r.id !== except && r.alive && !r.held) return true;
    return false;
  }

  private onRemoteDeath(r: RemotePlayer): void {
    this.endPairOf(r.id);
    // (coop-carry) down: the body drops where he fell
    this.remoteDrop(r.id);
    this.g.hud.feedItem(`${r.avatar.info.name} is down`, 'warn');
    if (!this.g.mode) {
      this.respawnIn.set(r.id, 3); // free roam
      return;
    }
    if (this.anyoneUp(r.id) && this.g.interactables) {
      if (this.reviveClock.down(r.id)) this.addRevive(r.id, r.feet, r.avatar.info.name);
      else this.goOut(r.id);
    } else this.g.mode.onPlayerDeath();
  }

  /**
   * (B8, G126) `id` cannot be revived (window over or no revives left): out until the next checkpoint. In the course
   * the next checkpoint is the bay restart (the airlock needs both players), so the bay restarts.
   */
  private goOut(id: string): void {
    this.dropRevive(id);
    // (coop4 merge A1) an OUT player's bluff goes, whoever's slot (its carry went at its death, `onRemoteDeath`, and
    // `carryStep` drops any carrier not alive)
    this.bluffs.delete(id);
    this.reviveClock.clear(id);
    const nm = id === this.s.selfId ? this.name(id) : (this.remotes.get(id)?.avatar.info.name ?? 'Operator');
    this.g.hud.feedItem(`${nm} is out until the checkpoint`, 'warn');
    if (id === this.s.selfId) this.g.hud.setDownTimer('OUT - wait for the checkpoint');
    if (this.g.mode?.id === 'course') this.g.mode.onPlayerDeath();
    // (sector-ops step 3) Sector Ops: an operator out restarts the section at its checkpoint; (coop4 OUT) from 3 players
    // the mode keeps them out until the next connector instead
    else this.g.mode?.onPlayerOut?.(id === this.s.selfId ? 'local' : id);
  }

  /** (coop4 OUT) Sector Ops: the OUT operators `ids` ('local' = this host) come back at the checkpoint, each on its slot
   *  (the map's slot point, else beside the team), clear of the players up and of each other, full health. */
  returnOut(ids: readonly string[]): void {
    const g = this.g;
    const cps = g.mode?.checkpointSpawns?.() ?? [];
    const hp = g.player.position;
    const area: SlotPoint[] = cps.length ? cps : [{ x: hp.x, y: hp.y, z: hp.z, yaw: g.player.cam.yaw }];
    const others: SpawnBody[] = [];
    if (g.player.alive) others.push({ x: hp.x, y: hp.y, z: hp.z });
    for (const r of this.remotes.values()) if (r.alive) others.push({ x: r.feet.x, y: r.feet.y, z: r.feet.z });
    const probe = spawnProbe(g);
    const back: { id: string; slot: number }[] = [];
    for (const id of ids) {
      if (id === 'local') back.push({ id: this.s.selfId, slot: 0 });
      else {
        // (coop4 round fix, checks A / B) a held (dropped) OUT player comes back too: left dead it would rejoin as a
        // downed body nobody can revive (its revive point went at `goOut`), blocking the next connector
        const r = this.remotes.get(id);
        if (r) back.push({ id, slot: r.ref.slot });
      }
    }
    back.sort((a, b) => a.slot - b.slot);
    for (const b of back) {
      const o: SlotPoint = { x: 0, y: 0, z: 0, yaw: 0 };
      slotSpawn(area, b.slot, others, probe, o);
      const p = new Vector3(o.x, o.y, o.z);
      others.push(p);
      if (b.id === this.s.selfId) {
        g.player.cam.yaw = o.yaw;
        this.reviveOne(b.id, p);
      } else {
        // a held one: its hold now points at the new checkpoint spot (`resume` restores it there on its rejoin; a
        // rejoin already loading keeps its watch, so its first state still resyncs the section)
        if (this.remotes.get(b.id)?.held) this.joins.rehold(b.id, { x: p.x, y: p.y, z: p.z, yaw: o.yaw });
        else this.joins.respawned(b.id, this.time);
        this.reviveOne(b.id, p);
      }
    }
  }

  /** (B8) A partner's revive in the course counts on the results (team and the reviver). */
  private courseRecordRevive(by: string | undefined): void {
    if (this.g.mode?.id !== 'course') return;
    const p = !by || by === 'local' || by === this.s.selfId ? 0 : 1;
    (this.g.mode as CourseMode).state?.record('revives', 1, p);
  }

  /** A revive point on a downed player (held by a team-mate). */
  private addRevive(id: string, at: Vector3, name: string): void {
    const ints = this.g.interactables;
    if (!ints || this.revives.has(id)) return;
    const sec = Math.ceil(this.reviveClock.remaining(id));
    const it = ints.add(`revive-${id}`, 'revive', at, sec > 0 ? `Revive ${name} (${sec})` : `Revive ${name}`, this.reviveTime);
    it.reach = 1.6;
    ints.setEnabled(it, true);
    it.onUse = (_it, by) => {
      // (B8) a partner's revive counts against the mission cap; with none left the player is out
      if (!this.reviveClock.revive(id)) {
        this.goOut(id);
        return;
      }
      this.courseRecordRevive(by);
      this.reviveOne(id, null);
    };
    this.revives.set(id, it);
    this.reviveSec.set(id, sec);
    if (id === this.s.selfId && sec > 0) this.g.hud.setDownTimer(`DOWN - revive in ${sec} s`);
  }

  private dropRevive(id: string): void {
    const it = this.revives.get(id);
    if (!it) return;
    this.g.interactables?.remove(it);
    this.revives.delete(id);
    this.reviveSec.delete(id);
  }

  /** Bring `id` back where it lies (or at `at`). */
  private reviveOne(id: string, at: Vector3 | null): void {
    this.dropRevive(id);
    this.reviveClock.clear(id);
    if (id === this.s.selfId) {
      this.g.hud.setDownTimer(null);
      if (this.g.player.alive) return;
      if (at) this.g.player.controller.teleport(at, this.g.player.cam.yaw);
      this.g.target.revive();
      this.g.hud.banner('BACK IN', '', 1500);
      return;
    }
    const r = this.remotes.get(id);
    if (!r || r.alive) return;
    const p = at ?? r.feet.clone();
    r.revive(p, 2);
    if (at) this.joins.moved(id, this.time, JOIN_REVIVE_QUIET_S);
    this.push({ e: 'revive', player: id, x: p.x, y: p.y, z: p.z });
    this.g.hud.feedItem(`${r.avatar.info.name} is back in`);
  }

  private name(id: string): string {
    return this.s.players.get(id)?.name ?? 'Operator';
  }

  private onKill(e: Enemy, h: HitInfo): void {
    const by = this.who(h.attackerId);
    this.push({ e: 'kill', enemy: e.id, kind: e.def.kind, by, head: h.part === 'head' });
    this.history.delete(e.id);
    this.seized.delete(e.id);
    this.interPh.delete(e.id);
    const t = this.tallies.get(by);
    if (t && by !== this.s.selfId) {
      t.kills++;
      t.byKind[e.def.kind]++;
      if (h.part === 'head') t.headshots++;
      if (h.weapon) t.weaponKills[h.weapon] = (t.weaponKills[h.weapon] ?? 0) + 1;
      this.g.hud.feedItem(`${this.remotes.get(by)?.avatar.info.name ?? 'Ally'}: ${e.def.name} ${h.part === 'head' ? 'headshot' : 'down'}`);
    }
  }

  // --- incoming ---

  /** (afp AF6) Per joiner: its send clock against ours (ClockSync), and the last stamp. */
  private readonly sendClocks = new Map<string, { c: ClockSync; last: number }>();
  /**
   * (afp AF6) The local time (s) a joiner's state stands for: its send clock `t` mapped through a ClockSync (the
   * lowest latency seen wins quickly, slower arrivals nudge it back gently), so the network's jitter and a retransmit's
   * bunched states no longer bend the interpolation spans (arrival stamps did: up to ~0.4 m a frame off the pace under
   * netsim typical). No `t`: the arrival time. Kept increasing.
   */
  private stateTime(id: string, t: number | undefined): number {
    const now = performance.now() / 1000;
    let e = this.sendClocks.get(id);
    if (!e) this.sendClocks.set(id, (e = { c: new ClockSync(), last: -Infinity }));
    let at = now;
    if (t !== undefined) {
      e.c.observe(t, now);
      at = e.c.toLocal(t);
    }
    at = Math.max(at, e.last + 1e-3);
    e.last = at;
    return at;
  }

  private receive(msg: Msg, from: string): void {
    const r = this.remotes.get(from);
    if (!r) return;
    switch (msg.t) {
      case 'pstate':
        // (R2) a rejoined joiner's first state: back in play; its first states come from its fresh spawn (the jump back
        // is allowed)
        if (this.rejoining.has(from)) this.resume(r);
        // (coop-rejoin) a client the match went to again: watched for its reload (its old match may still send first)
        if (this.joins.watching(from)) this.joinStep(r, msg.s.x, msg.s.z);
        // (mission-framework NET3) a remote's first state of the match, outside the current section: placed there
        else if (!r.state && !this.joins.restoring(from)) this.firstPlace(r, msg.s.x, msg.s.y, msg.s.z);
        if (this.joins.restoring(from)) r.allowTeleport(3);
        r.accept({ ...msg.s, id: from }, this.time, this.g.world.level.anchors, this.g.world.level.coverSegments, this.g.world.doors.list.length, this.g.world.level.opticPoints.length);
        r.avatar.buf.push(this.stateTime(r.id, msg.s.t), r.state!);
        if (msg.s.mv) this.g.mode?.onRemoteMove?.(r.id, msg.s.mv.m);
        this.restoreStep(r);
        break;
      case 'shot':
        // (31, slice L) a client's round through a lamp: the host checks it and shoots the lamp out
        if (msg.target.startsWith('lt-')) this.onLampShot(r, msg);
        // (39, LR16-5b) a client's round past a swinging pendant: the host checks it and kicks it
        else if (msg.target.startsWith(SWAY_TARGET)) this.onSwayShot(r, msg);
        else if (this.ff && (msg.target === this.s.selfId || this.remotes.has(msg.target))) this.onPlayerShot(r, msg);
        else this.onShot(r, msg);
        break;
      case 'blast':
        if (r.alive && checkBlast(msg, r.feet) && r.takeBlast(this.time)) {
          this.g.explosions.explode(new Vector3(msg.x, msg.y, msg.z), GRENADE.radius, GRENADE.damage, GRENADE.force, 'player', from);
        }
        break;
      case 'use':
        if (msg.pulse) this.onHoldPulse(r, msg.id);
        else this.onUse(r, msg.id);
        break;
      case 'door':
        this.onDoorCrack(r, msg.i, msg.crack);
        break;
      case 'panel':
        this.onPanel(r, msg.g);
        break;
      case 'ctick': {
        let lim = this.ctickLim.get(r.id);
        if (!lim) this.ctickLim.set(r.id, (lim = new TickLimiter()));
        if (r.alive && lim.take(this.time)) this.g.mode?.onRemoteVerb?.(r.id, msg.verb);
        break;
      }
      case 'jam':
        // (CT prototype B3) the held jammer's target; the host steps the charge and the stand-still rule itself
        // (jammer-fixes, 27) with the client's camera eye: the host checks the line from where the client aimed
        // (coop4 D1) with the sender's slot: its jam's entry in `SecWire`
        if (r.alive) this.g.mode?.onRemoteJam?.(r.id, msg.tgt, msg.e, r.ref.slot);
        break;
      case 'td':
        this.onTakedown(r, msg);
        break;
      case 'tmove':
        this.onTeamMove(r.id, msg.kind, msg.partner, msg.target, msg.s, msg.gy, msg.lx, msg.lz);
        break;
      case 'cmove':
        this.onCommitted(r.id, msg.kind, msg.id, msg.target);
        break;
      case 'gadget': {
        // thrown from near the sender, one a second at most
        const last = this.gadgetAt.get(r.id) ?? -9;
        if (!r.alive || this.time - last < 1 || hyp2(msg.x - r.feet.x, msg.z - r.feet.z) > 40) return;
        this.gadgetAt.set(r.id, this.time);
        this.g.gadgets.remoteEffect(msg.kind, new Vector3(msg.x, msg.y, msg.z));
        this.g.mode?.onRemoteGadget?.(r.id, msg.kind);
        this.push({ e: 'gadget', player: r.id, kind: msg.kind, x: msg.x, y: msg.y, z: msg.z });
        break;
      }
      case 'gused': {
        // (mission NET) a client's frag / mine / sticky cam thrown or placed (no effect message): the mode counts it
        // (NET2) the rate window is per kind: a different gadget at once still counts
        let at = this.gusedAt.get(r.id);
        if (!at) {
          at = { frag: -9, mine: -9, stickyCam: -9 };
          this.gusedAt.set(r.id, at);
        }
        if (!r.alive || this.time - at[msg.kind] < 0.25) return;
        at[msg.kind] = this.time;
        this.g.mode?.onRemoteGadget?.(r.id, msg.kind);
        break;
      }
      case 'ping': {
        // one a second at most, from somewhere near the sender
        const last = this.pingAt.get(r.id) ?? -9;
        if (this.time - last < 0.8 || hyp2(msg.x - r.feet.x, msg.z - r.feet.z) > 150) return;
        this.pingAt.set(r.id, this.time);
        this.push({ e: 'ping', player: r.id, x: msg.x, y: msg.y, z: msg.z, target: msg.target });
        this.g.addPing(r.id, msg.x, msg.y, msg.z, msg.target, this.color(r.id));
        break;
      }
    }
  }

  /** A client used a mirrored item: it must be usable, and in reach of where the host has the client. */
  private onUse(r: RemotePlayer, id: string): void {
    // (coop-carry) body requests never reach the host's own carry items (they would carry for the host)
    if (id === DROP_BODY_ID) {
      this.remoteDrop(r.id, true);
      return;
    }
    if (id.startsWith('body-')) {
      this.remotePickUp(r, id);
      return;
    }
    if (id.startsWith('hide-')) {
      this.remoteHide(r, id);
      return;
    }
    if (!r.alive) return;
    const it = this.g.interactables?.items.find((i) => i.id === id);
    if (!it || !it.enabled || it.done) return;
    if (!inUseReach(it, r.feet.x, r.feet.y, r.feet.z)) {
      r.violations++;
      return;
    }
    if (it.kind === 'revive' && it.id === `revive-${r.id}`) return;
    // course mode: what the item does is the client's (a door it opens is its door verb, DECISIONS A23)
    const mode = this.g.mode;
    mode?.onRemoteUse?.(r.id, true);
    if (it.onUse) it.onUse(it, r.id);
    else mode?.onInteract?.(it);
    mode?.onRemoteUse?.(r.id, false);
  }

  /**
   * (marlow-final Q12, SPEC N4) A client's noisy hold pulsed (its first moment, then every `HOLD_NOISE_PULSE` s): the
   * guards hear it at the item, the way `GameState` makes them hear the host's own hold. Alive, the item live, noisy
   * and in the use reach, and no faster than the hold pulses; a pulse that fails is dropped (no violation: the hold
   * may end on the reach edge).
   */
  private onHoldPulse(r: RemotePlayer, id: string): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    const it = this.g.interactables?.items.find((i) => i.id === id);
    const f = r.feet;
    if (!it?.holdNoise || !hostHoldPulse(it, r.alive, f.x, f.y, f.z, this.time, this.holdPulseAt.get(r.id) ?? -Infinity)) return;
    this.holdPulseAt.set(r.id, this.time);
    // (coop4, Guard AI A172) the noise names its holder (as the host's own hold does): guards already fighting or
    // searching locate him; calm guards ignore the maker
    em.hear(it.pos, it.holdNoise, 'noise', null, r.ref.id);
  }

  /** Course mode: the course state, locks and lights to every client. */
  course(w: CourseWire): void {
    this.s.send({ t: 'course', ...w });
  }

  /** Sector Ops: the cameras, jams and alarm stage to every client (objectives and banners go as items and events). */
  sector(sec: SecWire, extra: SectorNetExtra): void {
    this.s.send({ t: 'sector', sec, ...extra });
  }

  /** (sector-redesign EW5) Sector Ops: a radio line (a keypad code found) to every client, as the existing `feed` event. */
  radioLine(text: string): void {
    this.push({ e: 'feed', text });
  }

  /** Sector Ops: the syringes left this op (the revive cap less the revives used). */
  revivesLeft(): number {
    return Math.max(0, this.reviveClock.cap - this.reviveClock.used);
  }

  /** (section-rating S3) A rating's syringe reward: `n` (a whole 0-9) more revives this op. (mission-rules R5, G126,
   *  Q19 "None") Nothing in a campaign mission: its 2 revives are never topped up. */
  addSyringes(n: number): void {
    // (J14 F1, conformance M3, G126) the one "no syringe grant outside Sector Ops" rule: Course mode keeps 2 revives
    if (this.g.opts.mode !== 'sector' || this.campaign) return;
    const k = Number.isFinite(n) ? Math.max(0, Math.min(9, Math.floor(n))) : 0;
    this.reviveClock.cap += k;
  }

  /** Sector Ops (step 3): every guard a client holds is let go and the client told (`tdDenied` aborts its takedown or
   *  grab), before the section's guards are despawned. */
  releaseHolds(): void {
    for (const [eid, s] of this.seized) {
      this.push({ e: 'tdDenied', player: s.by, enemy: eid });
      this.release(eid);
    }
  }

  /** (locomotion step 13) A client's door-peek crack: in reach (door centre within 1.5 m of its feet), closed and
   *  unlocked; the same `Doors.crack` the host's own player uses. A request on an open door is ignored. */
  private onDoorCrack(r: RemotePlayer, i: number, on: boolean): void {
    const doors = this.g.world.doors;
    const d = doors.list[i];
    if (!r.alive || !d || Math.abs(d.anchor.hinge.y - r.feet.y) > 2) return;
    if (!hostCrackOk(d, r.feet.x, r.feet.z, on)) {
      if (d.target === 0) r.violations++;
      return;
    }
    doors.crack(d, on);
  }

  /** (optic-coop, CHECK-M B1) A client's OPEN TRAP at optic gap `g`: the gap has a trap panel still closed and the
   *  client's feet are in the menu's reach (`hostTrapKey`), else dropped (a bad index, a far or dead client, a trap
   *  already open). The host opens it in its world; the snapshots' `trp` open it on every client. */
  private onPanel(r: RemotePlayer, g: number): void {
    if (!r.alive) return;
    const w = this.g.world;
    const key = hostTrapKey(w.level.opticPoints, g, w.breakables, r.feet.x, r.feet.y, r.feet.z);
    if (key) w.breakables.open(key, 'unscrew');
  }

  /** A client's takedown on a host enemy: seize it (in reach, calm or not facing), finish it, or let go. */
  private onTakedown(r: RemotePlayer, m: Extract<Msg, { t: 'td' }>): void {
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === m.target);
    const deny = (): void => this.push({ e: 'tdDenied', player: r.id, enemy: m.target });
    if (!e || !e.alive) {
      if (m.ph === 'start') deny();
      return;
    }
    // (coop-walk-fixes P6) the team takedown on a partner's hostage (the guard stays in the holder's hands until done)
    if (m.kind === 'assist') {
      this.onAssist(r, m, e, deny);
      return;
    }
    // (joint-interrogation, G148) a bluff on a partner's hostage: speech only, never the seize path below (an older
    // host would seize him: the wire-semantics change the train's PROTOCOL_VERSION bump covers)
    if (m.kind === 'bluff') {
      if (m.ph === 'start') this.onBluff(r.id, r.alive, r.feet.x, r.feet.z, e, deny);
      return;
    }
    const held = this.seized.get(e.id);
    if (m.ph === 'start') {
      // (G348) never a dog, whatever the client offered
      if (!r.alive || e.def.quadruped || (held && held.by !== r.id) || (!held && e.taken) || (r.ref.spotted && e.level === 'alert') || hyp2(e.pos.x - r.feet.x, e.pos.z - r.feet.z) > TD_REACH) {
        deny();
        return;
      }
      // (G7) the struggle from the client's contact (derived from where it stands: no wire data)
      e.beginTakedown(!m.lethal, contactDelay(r.feet.x, r.feet.z, e.pos.x, e.pos.z, e.yaw, !!e.def.quadruped));
      this.seized.set(e.id, { by: r.id, t: 0, ...holdFeed() });
      // (joint-flake-3 check) a td 'start' resets interPh: a read aborted mid-way (the td 'abort' ends the seize before
      // a seized step sees the hold go) never counts as ended on this new hold's first step (`interrogationEnded`)
      this.interPh.delete(e.id);
      return;
    }
    if (!held || held.by !== r.id) return;
    this.seized.delete(e.id);
    this.interPh.delete(e.id);
    if (m.ph === 'abort') {
      e.releaseTakedown();
      return;
    }
    e.taken = false;
    e.bodyRig.emote = null;
    const dir = new Vector3(e.pos.x - r.feet.x, 0, e.pos.z - r.feet.z).normalize();
    const hit = { amount: 9999, point: e.pos.clone(), dir, part: 'body' as const, kind: 'melee' as const, attackerTeam: 'player' as const, attackerId: r.id, sourcePos: r.feet.clone(), impulse: 1 };
    if (m.lethal) e.applyDamage(hit);
    else e.knockOut(hit);
    this.g.enemyMgr?.hear(r.feet, m.lethal ? 3 : 1.2, 'noise', null, r.ref.id);
    this.takedownDone(r.id);
    this.g.mode?.onRemoteTakedown?.(r.id, m.kind ?? '');
  }

  /** (P6) Who else holds `e` as a hostage than `by` (null: nobody; no team takedown). */
  private holderOf(e: Enemy, by: string): string | null {
    const hh = this.g.takedown.hostage;
    return assistHolder(e.id, by, this.s.selfId, hh ? hh.id : '', this.seized, this.grabTid);
  }

  /** (P6) NetAttachment: another player holds `v` as a hostage (the host's own offer; a client's comes from its MoveState
   *  view of the partner, `CoopClient.partnerHolds`). */
  partnerHolds(v: TakedownVictim): boolean {
    const s = this.seized.get(v.id);
    return !!s && s.hostage === true && this.grabTid(s.by) === v.id;
  }

  /** (P6) NetAttachment: the host's own team takedown; applied at its `done` (the host checked the offer itself). */
  assistTakedown(v: TakedownVictim, ph: 'start' | 'done' | 'abort', lethal: boolean): void {
    if (ph !== 'done') return;
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === v.id);
    const holder = e && e.alive ? this.holderOf(e, this.s.selfId) : null;
    if (e && holder) this.assistApply(this.s.selfId, e, lethal, holder, this.g.player.position);
  }

  /** (joint-interrogation) A bluff by `by` (alive, feet at x, z) on guard `e`: another player holds him as a hostage
   *  (`holderOf`, the assist rule), he has joint information left, the bluffer within `JOINT.reach`; else `deny`. Accepted:
   *  stored with the host time, and both players see the bluff line. */
  private onBluff(by: string, alive: boolean, x: number, z: number, e: Enemy, deny: () => void): void {
    if (!alive || !e.alive || !this.holderOf(e, by) || !hasJoint(e) || hyp2(e.pos.x - x, e.pos.z - z) > JOINT.reach) {
      deny();
      return;
    }
    const b = this.bluffs.get(by);
    // (check should-fix) the line once per live bluff: a repeat press or a replay on the same guard renews it quietly
    const fresh = !b || b.eid !== e.id || this.time - b.t0 > JOINT.window;
    if (b) {
      b.eid = e.id;
      b.t0 = this.time;
    } else this.bluffs.set(by, { eid: e.id, t0: this.time });
    if (!fresh) return;
    this.radioLine(JOINT_BLUFF_FEED);
    this.g.hud.feedItem(JOINT_BLUFF_FEED);
  }

  /** (joint-interrogation) NetAttachment: the host's own bluff (the BLUFF row), the same checks; a denial shows nothing. */
  jointBluff(v: TakedownVictim): void {
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === v.id);
    if (!e) return;
    const p = this.g.player.position;
    this.onBluff(this.s.selfId, this.g.player.alive, p.x, p.z, e, () => {});
  }

  /** (joint-interrogation) NetAttachment: the host's own read of `v` ends; another player's live bluff on him counts
   *  (spent and counted). */
  jointLive(v: TakedownVictim, j: JointIntel | null): boolean {
    return this.jointFor(v.id, this.s.selfId, j);
  }

  /** (joint-interrogation) A read of guard `eid` held by `holder` ends now: a live bluff by another player on him (the
   *  holder's own entry never counts) is spent (`bluffs.delete`) and counted (`joints`). Runs on the read's end only. */
  private jointFor(eid: string, holder: string, j: JointIntel | null): boolean {
    // (check should-fix) spent and counted only when there are joint lines to reveal (`j`: read before `takeInfo`)
    if (this.bluffs.size === 0 || !jointHasLines(j)) return false;
    this.jointEid = eid;
    const by = jointBluffer(this.bluffs, eid, holder, this.time, this.bluffDist);
    if (by === null) return false;
    this.bluffs.delete(by);
    this.joints++;
    return true;
  }

  /** (P6) A client's team takedown: `start` checks it (alive, in reach, the guard held as a hostage by another player),
   *  `done` applies it when still so, `abort` forgets it. */
  private onAssist(r: RemotePlayer, m: Extract<Msg, { t: 'td' }>, e: Enemy, deny: () => void): void {
    if (m.ph === 'abort') {
      if (this.assists.get(r.id) === e.id) this.assists.delete(r.id);
      return;
    }
    const holder = r.alive ? this.holderOf(e, r.id) : null;
    const d = hyp2(e.pos.x - r.feet.x, e.pos.z - r.feet.z);
    if (m.ph === 'start') {
      if (!holder || d > TD_REACH) deny();
      else this.assists.set(r.id, e.id);
      return;
    }
    if (this.assists.get(r.id) !== e.id) return;
    this.assists.delete(r.id);
    // (the holder let go, or the pair walked apart, since the start: nothing happens; the client's view follows the host's)
    if (!holder || d > TD_REACH) return;
    this.assistApply(r.id, e, m.lethal, holder, r.feet);
  }

  /** (P6) The team takedown lands: the holder's hold ends (a client's here; the host's own grab sees him down and ends),
   *  the guard is knocked out (or killed: `lethal`) by `by`, heard as a takedown, and both players are credited: a
   *  dual takedown (`takedownDone` for the holder, then the striker: the host's own through its `takedown` event). */
  private assistApply(by: string, e: Enemy, lethal: boolean, holder: string, src: Vector3): void {
    if (holder !== this.s.selfId) {
      this.seized.delete(e.id);
      this.interPh.delete(e.id);
    }
    e.taken = false;
    e.bodyRig.emote = null;
    const dir = new Vector3(e.pos.x - src.x, 0, e.pos.z - src.z).normalize();
    const hit = { amount: 9999, point: e.pos.clone(), dir, part: 'body' as const, kind: 'melee' as const, attackerTeam: 'player' as const, attackerId: by === this.s.selfId ? 'local' : by, sourcePos: src.clone(), impulse: 1, takedown: 'assist' };
    if (lethal) e.applyDamage(hit);
    else e.knockOut(hit);
    this.g.enemyMgr?.hear(src, lethal ? 3 : 1.2);
    this.takedownDone(holder);
    if (by === this.s.selfId) return;
    this.takedownDone(by);
    this.g.mode?.onRemoteTakedown?.(by, 'assist');
  }

  // --- (3.2.0 phase 5) team moves ---

  /** Team-mates of the host (co-op: every other player; TDM: the same side). */
  /** (3.2.0 phase 5) The host's own team-move requests go through the same check as the clients'. */
  teamRequest(kind: TeamMoveKind, partner: string, target: number, ss: number, gy: number, lx?: number, lz?: number): void {
    this.onTeamMove(this.s.selfId, kind, partner, target, ss, gy, lx, lz);
  }

  teamEnd(): void {
    this.onTeamMove(this.s.selfId, 'end', '', -1, 0, 0);
  }

  /** (CT prototype B5) The host's own end of a hang-down (pull up or drop). */
  teamHangEnd(k: 'pull' | 'drop'): void {
    this.onTeamMove(this.s.selfId, 'hangEnd', '', k === 'drop' ? 1 : 0, 0, 0);
  }

  /** (step 11, D8) Clients with their back to segment `seg` (metres along it) for the host's own stacking. */
  wallOthers(seg: number, out: Float64Array): number {
    let n = 0;
    for (const r of this.remotes.values()) {
      const mv = r.state?.mv;
      if (n < out.length && r.alive && mv?.m === 'wall' && mv.a === seg) out[n++] = mv.s;
    }
    return n;
  }

  private mateOut: TeamMate[] = [];
  teamMates(): readonly TeamMate[] {
    const out = this.mateOut;
    out.length = 0;
    for (const r of this.remotes.values()) {
      if (!r.alive) continue;
      const mv = r.state?.mv;
      out.push({ id: r.id, pos: r.avatar.pos, yaw: r.avatar.yaw, mode: mv?.m ?? 'ground', anchor: mv?.a ?? -1, s: mv?.s ?? 0, sub: mv?.sub ?? 0 });
    }
    return out;
  }

  /** Pairs in a human ladder (each id -> the other). */
  private teamPairs = new Map<string, string>();
  /** (mission NET) The kit pairs (both ids -> the pair): who may end it how, the pull-up's start and verdict. */
  private kitPairs = new Map<string, KitPair>();
  /** (NET2) A hang-down / rope pair's start (both ids -> host t0): its ends' attempt check. */
  private pairT0 = new Map<string, number>();
  /** (coop4 A20) Players in a running team move: id -> its partner and the host time it ends (a timed move: its length
   *  + `TEAM_BUSY_SLACK`; a hang-down / rope: until its end). A player offering serves one partner at a time. */
  private readonly teamActive = new Map<string, { mate: string; until: number; climber: string; t0: number }>();

  /** (coop4 A20) Is `b` in a running team move with someone other than `a` (a second claimant is denied `taken`)? A
   *  hang-down / rope (open-ended) is over once its climber is no longer in its pose (net check M1: several client ends,
   *  such as a downed hanger or "partner gone", send the host nothing). Runs on a request only. */
  private teamBusy(b: string, a: string): boolean {
    const e = this.teamActive.get(b);
    if (!e) return false;
    const openOver = e.until === Infinity && this.time - e.t0 > OPEN_MOVE_GRACE && !inOpenMove(this.teamSide(e.climber));
    if (e.until <= this.time || openOver) {
      this.teamClear(b);
      return false;
    }
    return e.mate !== a;
  }

  /** (coop4 A20) `a` (the climber / runner) and `b` start a team move of `kind` (both busy until it ends). */
  private teamMark(kind: TeamKind, a: string, b: string): void {
    // (coop4 merge 10) a kit move (paired: the pull-up, the shutter) keeps both busy for its pair's life (`newKitPair`)
    const len = kind === 'boost' ? TEAM.boostTime : kind === 'ladder' ? TEAM.relayClimb : kind === 'throw' ? TEAM.throwTime : kind === 'pull' ? PULL_PAIR_S : kind === 'shutter' ? SHUTTER_PAIR_S : Infinity;
    const until = this.time + len + TEAM_BUSY_SLACK;
    this.teamActive.set(a, { mate: b, until, climber: a, t0: this.time });
    this.teamActive.set(b, { mate: a, until, climber: a, t0: this.time });
  }

  /** (coop4 A20) `id`'s team move ended (its end, a drop, a leave, a stale open move): it and its partner are free, and a
   *  hang / rope pair entry naming the two is dropped (no stray `tend` later). */
  private teamClear(id: string): void {
    const e = this.teamActive.get(id);
    if (!e) return;
    this.teamActive.delete(id);
    if (this.teamActive.get(e.mate)?.mate === id) this.teamActive.delete(e.mate);
    // (coop4 merge 10) through master's `unpair`: the pair's attempt start and kit record go with it
    if (this.teamPairs.get(id) === e.mate && this.teamPairs.get(e.mate) === id) this.unpair(id, e.mate);
  }
  private teamLast = new Map<string, number>();
  private teamMv = emptyMoveState();
  /** (throw-ko) Partner throws in flight: the thrown player coming down on a guard knocks him out (host-authoritative). */
  readonly throwKo = new ThrowKo<Enemy>(
    (by) => (by === this.s.selfId ? this.g.player.alive : (this.remotes.get(by)?.alive ?? false)),
    (by, e, at) => this.throwKnockOut(by, e, at),
  );

  /** (throw-ko) The thrown player `by` (feet at `at`) came down on `e`: knocked out through the game's own path. */
  private throwKnockOut(by: string, e: Enemy, at: { readonly x: number; readonly y: number; readonly z: number }): void {
    const src = new Vector3(at.x, at.y, at.z);
    const dir = new Vector3(e.pos.x - at.x, 0, e.pos.z - at.z);
    if (dir.lengthSquared() > 1e-6) dir.normalize();
    e.knockOut({ amount: 9999, point: e.pos.clone(), dir, part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: by === this.s.selfId ? 'local' : by, sourcePos: src, impulse: 1, takedown: 'throw' });
    this.g.enemyMgr?.hear(src, STRIKE.noise);
  }

  private teamSide(id: string): TeamSide | null {
    const self = id === this.s.selfId;
    const r = self ? null : this.remotes.get(id);
    if (!self && !r) return null;
    const p = self ? this.g.player.position : r!.feet;
    const mv = self ? localMoveState(this.g, this.teamMv) : r!.state?.mv;
    // (mission NET) crouched as the host has them (its own controller, a client's PF.crouch): the shutter's crawl needs it
    const crouch = self ? this.g.player.controller.crouched : ((r!.state?.f ?? 0) & PF.crouch) !== 0;
    return { id, x: p.x, y: p.y, z: p.z, mode: mv?.m ?? 'ground', alive: self ? this.g.player.alive : r!.alive, anchor: mv?.a ?? -1, s: mv?.s ?? 0, sub: mv?.sub ?? 0, crouch };
  }

  /** A team-move request (a client's `tmove`, or the host's own): checked on both players' states, then started. */
  private onTeamMove(by: string, kind: TeamMoveKind | 'end' | 'hangEnd', partner: string, target: number, ss: number, gy: number, lx?: number, lz?: number): void {
    const self = this.s.selfId;
    if (kind === 'hangEnd' || kind === 'end') this.lapseKitPair(by);
    // (NET2) a hangEnd's `ss` is its attempt key (`kitAttemptKey` of the start's t0; 0 unknown): a stale end is ignored
    if (kind === 'hangEnd' && this.kitPairs.has(by)) {
      this.kitHangEnd(by, target === 1 ? 'drop' : 'pull', ss);
      return;
    }
    if (kind === 'hangEnd') {
      // (CT prototype B5) either player ends the hang-down: pulled up (0) or dropped (1, the holder's release)
      const other = this.teamPairs.get(by);
      if (!other || !sameAttempt(this.pairT0.get(by), ss)) return;
      this.unpair(by, other);
      this.teamClear(by);
      const k = target === 1 ? 'drop' : 'pull';
      this.s.send({ t: 'tend', a: by, b: other, k });
      if (by === self || other === self) this.g.team.ended(k);
      return;
    }
    if (kind === 'end') {
      // (NET3, NET2 check B1) an end's `ss` is its attempt key too (the kit pair's or the hang / rope pair's start; 0
      // unknown: the host's own, a player down): a stale end crossing a new start is ignored
      const other = this.teamPairs.get(by);
      if (!other || !sameAttempt(this.kitPairs.get(by)?.t0 ?? this.pairT0.get(by), ss)) return;
      this.unpair(by, other);
      this.teamClear(by);
      this.s.send({ t: 'tend', a: by, b: other });
      if (other === self) this.g.team.ended();
      return;
    }
    const a = this.teamSide(by);
    const b = this.teamSide(partner);
    const deny = (reason: string): void => {
      this.s.send({ t: 'tdeny', a: by, reason });
      if (by === self) this.g.team.denied(reason);
    };
    if (!a || !b) return deny('far');
    const now = this.time;
    if (isKitKind(kind)) {
      // (mission NET) a kit move: its claimed point (`claimsPoint`: the start carries it as `l`), its rule, a pair
      // when the move is paired, started at once (not the boost / relay path)
      const m = kitMove(kind);
      const land = m?.claimsPoint && lx !== undefined && lz !== undefined ? { x: lx, y: gy, z: lz } : undefined;
      // (coop4 A20, merge 10) a partner in another player's move is `taken`, as for the other moves (else the
      // `unpairOf(partner)` below would end that pair silently)
      const why = checkTeamRequest({ kind, a, b, target: -1, targetUp: gy - b.y, sinceLast: now - (this.teamLast.get(by) ?? -99), land, bBusy: this.teamBusy(partner, by) });
      this.teamLast.set(by, now);
      if (why) return deny(why);
      // (NET2) a new move ends both players' earlier pairs (a pull-up's kept pair, a lingering shutter)
      this.unpairOf(by);
      this.unpairOf(partner);
      if (m?.paired) {
        this.teamPairs.set(by, partner);
        this.teamPairs.set(partner, by);
        const kp = newKitPair(kind, by, partner, now);
        this.kitPairs.set(by, kp);
        this.kitPairs.set(partner, kp);
      }
      this.teamMark(kind, by, partner);
      const start = land ? { kind, a: by, b: partner, target: -1, s: 0, t0: now, l: [land.x, land.y, land.z] as [number, number, number] } : { kind, a: by, b: partner, target: -1, s: 0, t0: now };
      this.s.send({ t: 'tstart', ...start });
      if (by === self || partner === self) this.g.team.begin(start, self);
      this.g.mode?.onTeamMove?.(by === self ? undefined : by, partner === self ? undefined : partner);
      return;
    }
    const anchor = target >= 0 ? this.g.world.level.anchors.get(target) : null;
    const toss = kind === 'throw' || kind === 'hang' || kind === 'rope';
    const land = toss && lx !== undefined && lz !== undefined ? { x: lx, y: gy, z: lz } : undefined;
    const why = checkTeamRequest({ kind, a, b, target: anchor ? target : -1, targetUp: gy - b.y, sinceLast: now - (this.teamLast.get(by) ?? -99), land, bBusy: this.teamBusy(partner, by) });
    this.teamLast.set(by, now);
    if (why) return deny(why);
    // (NET2) a new move ends both players' earlier pairs: a pull-up's kept pair no longer takes this move's hangEnd
    this.unpairOf(by);
    this.unpairOf(partner);
    if (toss && land) {
      // (CT prototype B4) the partner throw: the runner flies over the thrower to the claimed (bounded) landing; (B5) the
      // hang-down: `a` is lowered head-first at the claimed (bounded) hang point by the holder `b` (a pair until it ends)
      if (kind === 'hang' || kind === 'rope') {
        this.teamPairs.set(by, partner);
        this.teamPairs.set(partner, by);
        this.pairT0.set(by, now);
        this.pairT0.set(partner, now);
      }
      const start = { kind, a: by, b: partner, target: -1, s: 0, t0: now, l: [land.x, land.y, land.z] as [number, number, number] };
      if (kind === 'throw') this.throwKo.start(by, now, a.x, a.y, a.z, land.x, land.y, land.z);
      this.teamMark(kind, by, partner);
      this.s.send({ t: 'tstart', ...start });
      if (by === self || partner === self) this.g.team.begin(start, self);
      this.g.mode?.onTeamMove?.(by === self ? undefined : by, partner === self ? undefined : partner);
      return;
    }
    // the relay climbs the hanger's own ledge at the hanger's own spot (never the climber's claim)
    const relay = kind === 'ladder';
    const start = { kind, a: by, b: partner, target: relay ? (b.anchor ?? -1) : anchor ? target : -1, s: relay ? (b.s ?? 0) : ss, t0: now };
    this.teamMark(kind, by, partner);
    this.s.send({ t: 'tstart', ...start });
    if (by === self || partner === self) this.g.team.begin(start, self);
    this.g.mode?.onTeamMove?.(by === self ? undefined : by, partner === self ? undefined : partner);
  }

  /** (mission NET) A kit pair's end from `by`: the kit's rules (`kitEnd`), relayed to both as `tend` k. */
  private kitHangEnd(by: string, k: 'pull' | 'drop', key: number): void {
    const p = this.kitPairs.get(by);
    if (!p || !sameAttempt(p.t0, key)) return;
    const self = this.s.selfId;
    const v = kitEnd(p, by, k, this.time, pullLag(p.b === self));
    if (!v) return;
    if (kitPairOver(p, v)) this.unpair(p.a, p.b);
    this.s.send({ t: 'tend', a: p.a, b: p.b, k: v });
    if (p.a === self || p.b === self) this.g.team.ended(v);
  }

  /** (mission NET) A kit pair past its time (a pull-up's haul is over): gone without a word. */
  private lapseKitPair(id: string): void {
    const p = this.kitPairs.get(id);
    if (p && this.time > p.until) this.unpair(p.a, p.b);
  }

  /** Two players no longer in a team move together (the pair and its kit record). */
  private unpair(a: string, b: string): void {
    // (coop4 A20, merge 10) the two are no longer busy with each other
    if (this.teamActive.get(a)?.mate === b) this.teamActive.delete(a);
    if (this.teamActive.get(b)?.mate === a) this.teamActive.delete(b);
    if (this.teamPairs.get(a) === b) {
      this.teamPairs.delete(a);
      this.pairT0.delete(a);
    }
    if (this.teamPairs.get(b) === a) {
      this.teamPairs.delete(b);
      this.pairT0.delete(b);
    }
    const p = this.kitPairs.get(a);
    if (p && (p.b === b || p.a === b)) {
      this.kitPairs.delete(a);
      if (this.kitPairs.get(b) === p) this.kitPairs.delete(b);
    }
  }

  /** (NET2) Player `id`'s earlier pairs end without a word (a new move of theirs was accepted). */
  private unpairOf(id: string): void {
    const p = this.kitPairs.get(id);
    if (p) this.unpair(p.a, p.b);
    const o = this.teamPairs.get(id);
    if (o !== undefined) this.unpair(id, o);
  }

  /** (mission NET) A player down mid-move: their pair ends (the partner's move ends as on a leave). */
  private endPairOf(id: string): void {
    this.lapseKitPair(id);
    if (this.teamPairs.has(id)) this.onTeamMove(id, 'end', '', 0, 0, 0);
  }

  // --- (locomotion step 10, A5 / H3) committed moves: the elbow strike ---

  private commitLast = new Map<string, number>();
  /** The last committed-move decision (tests, debugging). */
  lastCommit = '';
  /** Clients' strikes the host is running: contact at t0 + 0.5 s, done at t0 + 0.9 s. */
  private strikes = new Map<string, { id: number; target: string; t0: number; hp0: number; hit: boolean }>();

  /** The host's own request: the same check, no message (the start / refusal still goes out to everyone). */
  commitRequest(kind: CKind, id: number, target: string): void {
    this.onCommitted(this.s.selfId, kind, id, target);
  }

  /** The host's own strike was interrupted (damage). */
  commitCancel(id: number, reason: string, kind: CKind = 'strike'): void {
    if (reason === 'hit') this.s.send({ t: 'cdeny', a: this.s.selfId, id, kind, reason: 'hit' });
  }
  /** A wall medkit station used by client `who` (G20 / G98): heals it (host-authoritative health); false when it is
   *  down or at full health. */
  healAtStation(who: string): boolean {
    const r = this.remotes.get(who);
    if (!r) return false;
    const hp = stationHeal(r.health.hp, r.health.maxHp, r.alive, this.g.opts.difficulty ?? 'normal');
    if (hp === null) return false;
    r.health.heal(hp - r.health.hp);
    return true;
  }

  /** (E9-crate) Client `who` used weapons crate `id` for the first time (the host's ledger): it tops up (the `crate` event,
   *  fill; its ammo is its own). */
  crateUsed(who: string, id: string): void {
    if (this.remotes.has(who)) this.push({ e: 'crate', player: who, id, fill: true });
  }

  private onCommitted(by: string, kind: CKind, id: number, target: string): void {
    const self = by === this.s.selfId;
    const r = self ? null : this.remotes.get(by);
    if (!self && !r) return;
    const now = this.time;
    const feet = self ? this.g.player.position : r!.feet;
    let tv: CTargetView | null = null;
    if (target) {
      const e = this.g.enemyMgr?.enemies.find((x) => x.id === target);
      tv = e ? { alive: e.alive, seized: e.taken || this.seized.has(e.id), ko: e.ko, dist: hyp2(e.pos.x - feet.x, e.pos.z - feet.z) } : { alive: false, seized: false, ko: false, dist: Infinity };
    }
    const alive = self ? this.g.player.alive : r!.alive;
    const mode = self ? 'ground' : (r!.state?.mv?.m ?? 'ground');
    const active = !self && this.strikes.has(by);
    const why = checkCommitted({
      kind,
      alive,
      downed: !alive,
      mode,
      active,
      sinceLast: now - (this.commitLast.get(by) ?? -99),
      target: tv,
      slack: self ? 0 : STRIKE.lagSlack,
    });
    this.commitLast.set(by, now);
    this.lastCommit = `${kind} ${target || '-'} ${why ?? 'ok'} (${mode}${active ? ', running' : ''})`;
    if (why) {
      this.s.send({ t: 'cdeny', a: by, id, kind, reason: why });
      if (self && kind === 'strike') this.g.strike.denied(id, why);
      return;
    }
    this.s.send({ t: 'cstart', kind, a: by, id, target, t0: now });
    if (kind !== 'strike') return;
    if (self) this.g.strike.accepted(id, 0);
    else this.strikes.set(by, { id, target, t0: now, hp0: r!.health.hp, hit: false });
  }

  /** Clients' strikes: interrupted by damage before contact, contact at t0 + 0.5 s (reach and cone again). */
  private runStrikes(): void {
    for (const [by, k] of this.strikes) {
      const r = this.remotes.get(by);
      const el = this.time - k.t0;
      if (!r || !r.alive || el >= STRIKE_DUR) {
        this.strikes.delete(by);
        continue;
      }
      if (k.hit) continue;
      if (r.health.hp < k.hp0) {
        k.hit = true;
        this.s.send({ t: 'cdeny', a: by, id: k.id, kind: 'strike', reason: 'hit' });
        continue;
      }
      if (el < STRIKE.hitAt) continue;
      k.hit = true;
      const yaw = r.state?.yaw ?? 0;
      this.g.strike.applyHit(by, r.feet, yaw, yaw + (r.state?.mv?.ay ?? 0), k.target, STRIKE.lagSlack);
    }
  }

  private release(eid: string): void {
    this.seized.delete(eid);
    this.interPh.delete(eid);
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === eid);
    if (e?.alive) e.releaseTakedown();
  }

  /** (rig-pose-fix S3) A guard's rewound place for a judge (`shotHistory.rewindHist`). */
  private readonly rw: Rewound = newRewound();

  /**
   * Shared checks: geometry against the rewound target, line of sight, the damage cap. Returns the damage and leaves the
   * judged body / head points in `tmpB` / `tmpH`. (rig-pose-fix S3, G7) A guard (`rw`): a head claim is judged against
   * his rewound sim head, else the rewound head the client is shown (`shotHistory.judgeRewound`), never a stance
   * constant. The head tolerance stays `checkShot`'s 0.7 x 1.1 m x scale (0.77 m for a 1.0 guard): it covers the client's
   * interpolation (snapshots at 15 Hz vs history at 20 Hz, the clock sync error: ~0.15 m at a run), the puppet's eased
   * crouch and speed against the host's (up to ~0.3 m in a crouch change), the stride bob (the puppet's mean phase,
   * < 5 cm) and the head sphere's radius (0.12 m). A player (course friendly fire, `rw` null) keeps the stance points.
   */
  private judge(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>, feet: Vector3, scale: number, rw: Rewound | null): number {
    const def = WEAPONS[m.w];
    const claim = { origin: { x: m.ox, y: m.oy, z: m.oz }, dir: { x: m.dx, y: m.dy, z: m.dz }, part: m.part };
    // (hang-down, A6) a client hanging head-first shoots from under its turned-over root
    const under = hangingMove(r.state?.mv) ? SHOT_UNDER_HANG : SHOT_UNDER;
    let verdict;
    if (rw) verdict = judgeRewound(claim, r.feet, rw, scale, def.range, 1.1 * scale, under, this.tmpB, this.tmpH);
    else verdict = checkShot(claim, r.feet, stanceBody(feet, 0, scale, this.tmpB), stanceHead(feet, 0, scale, this.tmpH), def.range, 1.1 * scale, under);
    const aim = m.part === 'head' ? this.tmpH : this.tmpB;
    if (!verdict.ok) {
      r.violations++;
      return 0;
    }
    // line of sight against level geometry (props/characters do not block validation)
    const o = this.tmp.set(m.ox, m.oy, m.oz);
    const los = this.g.ballistics.ray(o, aim, MASK.HOST_LOS);
    if (los.hit && los.distance < Vector3.Distance(o, aim) - 0.4) return 0;
    return Math.min(m.dmg, maxHitDamage(def, m.part === 'head'));
  }

  private onShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    if (!r.alive) return;
    const enemy = this.g.enemyMgr?.enemies.find((e) => e.id === m.target);
    if (!enemy || !enemy.alive) return;
    // (step 09, D8) no hip fire: the host's draw phase for the shooter must be drawn
    // (fix 3) and only with the weapon it holds or one from its lobby loadout (the rate limit and damage read m.w)
    if (!hostShotAllowed(r.state?.mv?.dw) || !hostShotWeapon(m.w, r.state?.w, r.loadout) || !r.takeShot(m.w, this.time)) return;
    // (rig-pose-fix S3) his rewound feet, crouch and heads; no history yet (just spawned): his place now
    const rw = this.rw;
    if (!rewindHist(this.history.get(enemy.id), m.rt, this.time, MAX_REWIND, rw)) {
      rw.feet.x = enemy.pos.x;
      rw.feet.y = enemy.pos.y;
      rw.feet.z = enemy.pos.z;
      rw.crouch = enemy.crouchBlend;
      const h = enemy.simHead;
      rw.head.x = h.x;
      rw.head.y = h.y;
      rw.head.z = h.z;
      enemy.wireHead(rw.wire);
    }
    const dmg = this.judge(r, m, enemy.pos, enemy.def.scale, rw);
    if (dmg <= 0) return;
    const aim = (m.part === 'head' ? this.tmpH : this.tmpB).clone();
    const res = enemy.applyDamage({ amount: dmg, point: aim, dir: new Vector3(m.dx, m.dy, m.dz), part: m.part, kind: 'bullet', attackerTeam: 'player', attackerId: r.id, weapon: m.w, sourcePos: new Vector3(m.ox, m.oy, m.oz), impulse: WEAPONS[m.w].impulse });
    // (32, guard-ai S9) a round his helmet or vest stopped: the client shows the deflect marker as the host's own does
    // (its hits and kills it predicts on its puppet; kills also come as `kill`)
    if (res.deflect) this.push({ e: 'hitConfirm', player: r.id, kind: 'deflect' });
  }

  /**
   * (sector-redesign slice L, protocol 31; coop-real F1b, S2: Course mode too) Sector Ops and Course mode: a client's
   * round through a lamp (`shot` target `lt-<id>`). The host checks the draw, the weapon, a rate (4 a second), the
   * round's origin at the shooter's body, the lamp first along the claimed ray in its own registry (`lampShotOk`) and a
   * clear static line to it; then shoots it out as its own round would (sparks, noise, a guard comes to look). The
   * client sees it dark from the next `lamps` message (Sector Ops) or `course` message (`lights.dead`, Course mode).
   * A round fired before the mode's last restart is dropped quietly (`lampShotStale`, coop-real F1c).
   */
  private onLampShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    if (!this.lampShots || !r.alive || !this.g.stealth) return;
    const id = lampTargetId(m.target);
    if (id < 0 || !hostShotAllowed(r.state?.mv?.dw) || !hostShotWeapon(m.w, r.state?.w, r.loadout)) return;
    // (coop-real F1c) a round fired before the last set / section restart (in flight across it): the restart put the
    // lamps back, so it would shoot one out in the fresh run; dropped with no violation, before the rate limit
    if (lampShotStale(m.rt, this.lampRestartAt)) return;
    // (player-batch-25) a restart `sendLamps` has not polled yet (the pause menu's restart runs outside the mode's
    // fixedUpdate, so `lampRestartAt` lags it by up to a frame): the round cannot be judged against it, so it is
    // dropped the same way (Sector Ops and Course mode both count `restarts`)
    if (((this.g.mode as { restarts?: number } | null)?.restarts ?? 0) !== this.lampRestarts) return;
    // (coop-real F1b fix) an honest repeat round at a lamp we already have out (the client's mirror lags a message):
    // nothing to do and no violation (`lampShotOk` would refuse it as one)
    const reg = this.g.world.level.lights;
    if (reg.lights[id]?.destroyed) return;
    let lim = this.lampLim.get(r.id);
    if (!lim) this.lampLim.set(r.id, (lim = new TickLimiter()));
    if (!lim.take(this.time)) return;
    const o = { x: m.ox, y: m.oy, z: m.oz };
    if (!lampShotOk(reg, id, o, { x: m.dx, y: m.dy, z: m.dz }, m.dist, r.feet, WEAPONS[m.w].range)) {
      r.violations++;
      return;
    }
    // (polish2) a hit only through the mount reach at the claimed landing needs a clear static line up to the head, as
    // our own rounds (`StealthSystems.shotRay`) and the client's `lampRay` test it
    const end = Math.min(m.dist, WEAPONS[m.w].range);
    const p = this.lampA;
    const h = lampReachProbe(reg, id, m.ox, m.oy, m.oz, m.ox + m.dx * end, m.oy + m.dy * end, m.oz + m.dz * end, p);
    if (h > 0 && !this.g.ballistics.clear(p, this.lampB.set(p.x, p.y + h, p.z), MASK.WORLD)) return;
    const l = reg.lights[id]!;
    const a = this.lampA.set(m.ox, m.oy, m.oz);
    const b = this.lampB.set(l.x, l.y, l.z);
    if (this.g.ballistics.hitDistance(a, b, MASK.HOST_LOS) < Vector3.Distance(a, b) - LAMP_LOS_SLACK) return;
    this.g.stealth.shootLight(id);
  }

  /**
   * (39, LR16-5b) A client's round past a swinging pendant (`shot` target `sw-<id>`). The host checks the draw, the
   * weapon, a rate (4 a second), the round's origin at the shooter's body (`swayShotOk`) and that nothing static stops
   * the claimed segment short (its end within `LAMP_LOS_SLACK`); then its own kick test on that segment
   * (`SwaySet.shotKickOne`, on the shared clock) decides, and an accepted kick goes to everyone as a `sway` event.
   */
  private onSwayShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    const sway = this.g.world.level.lights.sway;
    if (!sway || !r.alive) return;
    const id = swayTargetId(m.target);
    if (id < 0 || !hostShotAllowed(r.state?.mv?.dw) || !hostShotWeapon(m.w, r.state?.w, r.loadout)) return;
    let lim = this.swayLim.get(r.id);
    if (!lim) this.swayLim.set(r.id, (lim = new TickLimiter()));
    if (!lim.take(this.time)) return;
    const k = swayShotOk(this.g.world.level.lights, id, { x: m.ox, y: m.oy, z: m.oz }, r.feet);
    if (k < 0) {
      r.violations++;
      return;
    }
    const len = Math.min(m.dist, WEAPONS[m.w].range);
    const a = this.lampA.set(m.ox, m.oy, m.oz);
    const b = this.lampB.set(m.ox + m.dx * len, m.oy + m.dy * len, m.oz + m.dz * len);
    if (this.g.ballistics.hitDistance(a, b, MASK.HOST_LOS) < len - LAMP_LOS_SLACK) return;
    sway.shotKickOne(k, a.x, a.y, a.z, b.x, b.y, b.z, this.time);
  }

  /** Course mode: a client's hit on another player (the host or a client), judged at the target's current place. */
  private onPlayerShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    if (!r.alive || !this.hostile(r.id, m.target)) return;
    const self = m.target === this.s.selfId;
    const victim = self ? null : this.remotes.get(m.target)!;
    if (self ? !this.g.player.alive : !victim!.alive) return;
    // (step 09, D8) no hip fire: the host's draw phase for the shooter must be drawn
    // (fix 3) and only with the weapon it holds or one from its lobby loadout (the rate limit and damage read m.w)
    if (!hostShotAllowed(r.state?.mv?.dw) || !hostShotWeapon(m.w, r.state?.w, r.loadout) || !r.takeShot(m.w, this.time)) return;
    const feet = (self ? this.g.player.position : victim!.feet).clone();
    const dmg = this.judge(r, m, feet, 1, null);
    if (dmg <= 0) return;
    const hit: HitInfo = {
      amount: dmg,
      point: (m.part === 'head' ? this.tmpH : this.tmpB).clone(),
      dir: new Vector3(m.dx, m.dy, m.dz),
      part: m.part,
      kind: 'bullet',
      attackerTeam: 'player',
      attackerId: r.id,
      weapon: m.w,
      sourcePos: new Vector3(m.ox, m.oy, m.oz),
      impulse: WEAPONS[m.w].impulse,
    };
    const res = self ? this.g.target.applyDamage(hit) : victim!.applyDamage(hit);
    const kind = hitConfirmKind(res.dealt, res.killed, res.deflect === true, m.part === 'head');
    if (kind) this.push({ e: 'hitConfirm', player: r.id, kind });
  }

  // --- outgoing ---

  /** The host's own movement state (sent in every snapshot; a change sends a snapshot at once). */
  private mvNow = emptyMoveState();
  private mvSent = emptyMoveState();

  private selfState(): PlayerState {
    const g = this.g;
    const p = g.player;
    const c = p.controller;
    const th = g.target.health;
    // (afp AF6) the gait clock / CT stop for the partner's stride (the snapshot's `time` times it)
    const gw: { gph?: number; qs?: number; hs?: number; mo?: number; mt?: number; ax?: number; az?: number } = {};
    gaitWire(c.motion.phase, c.ct, c.stopEaseT, c.stopHold, c.holdSpeed, CT.stopEase, CT.stopBlend, gw);
    motionWire(c.override?.kinematic ? null : c.motion.state, c.motion.stateT, c.motion.ax, c.motion.az, gw);
    return {
      ...gw,
      mv: localMoveState(g, this.mvNow),
      id: this.s.selfId,
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      yaw: c.yaw,
      pitch: p.cam.pitch,
      speed: c.speed,
      f: localFlags(g),
      w: g.weapons.current.def.id,
      hp: th.hp,
      sc: g.weapons.shotCount & 255,
    };
  }

  private pingAt = new Map<string, number>();
  /** (Q12) Each client's last accepted hold noise pulse (host time). */
  private holdPulseAt = new Map<string, number>();
  private gadgetAt = new Map<string, number>();
  /** (mission NET) Each client's last `gused` per kind (a frag / mine / sticky cam used; 4 a second each at most). */
  private gusedAt = new Map<string, Record<UseOnlyGadget, number>>();

  private color(id: string): string {
    return this.s.players.get(id)?.tag.color ?? '#4fdc7c';
  }

  /** The host's own ping: shown here and sent to everyone. */
  ping(x: number, y: number, z: number, target: string): void {
    const me = this.s.selfId;
    this.push({ e: 'ping', player: me, x, y, z, target });
    this.g.addPing(me, x, y, z, target, this.color(me));
  }

  /** Usable things clients mirror (bodies and hiding spots stay with whoever is carrying). */
  private items(): NetItem[] {
    const out: NetItem[] = [];
    // course devices (`c-` ids: switches, levers, pickups, bolts, the finish) first, so the cap never drops them (D48:
    // a map's door items filled the list before them and the client saw no course prompts); (E9-crate, A107) the
    // weapons crates too
    // (sector-redesign cap fix) Sector Ops mirrors only the live section's items and the untagged ones (objective, exit,
    // connector doors, revives); every section's items stay registered on the host (`Interactables.scope`)
    const ints = this.g.interactables;
    const list = ints?.items ?? [];
    for (let pass = 0; pass < 2; pass++) {
      // (coop-carry) the bodies (lying, or whose shoulder they are on) after the course devices and crates
      if (pass === 1) this.bodyItems(out);
      for (const it of list) {
        if (out.length >= MAX_ITEMS) break;
        if ((it.id.startsWith('c-') || it.kind === 'crate') !== (pass === 0)) continue;
        if (ints && !ints.inScope(it)) continue;
        const k = it.kind as NetItem['k'];
        // (coop-carry) bodies go as `bodyItems` (with their carrier), not as the host's own pick-up items
        if (k === 'body' || !ITEM_KINDS.includes(k)) continue;
        const n: NetItem = { id: it.id, k, x: it.pos.x, y: it.pos.y, z: it.pos.z, yaw: it.node.rotation.y, label: it.label.slice(0, 24), hold: it.holdTime, reach: it.reach ?? 1.8, on: it.enabled && !it.done };
        // (30, Q12) a noisy hold's radius: the client's own hold pulses it back (`use.pulse`) and its noise meter reads it
        if (it.holdTime > 0 && it.holdNoise) n.hn = it.holdNoise;
        out.push(this.round ? snapItem(n) : n);
      }
    }
    return out;
  }

  /** (coop-carry) One item per body not hidden: lying (`on`) or carried (`by`: the host's own carry from its lift, a
   *  client's from the host's accept). */
  private bodyItems(out: NetItem[]): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    const own = this.g.stealth?.carry ?? null;
    for (const b of em.bodies) {
      if (out.length >= MAX_ITEMS) break;
      if (!b.enemyId || b.hidden) continue;
      const by = b === own ? this.s.selfId : this.carrierOf(b);
      const n = bodyItem(b.id, b.enemyId, b.pos.x, b.pos.y, b.pos.z, b.present, by, BODY.reach);
      // (coop4 merge A3) rounded in Sector Ops as every other item (`snapItem`, the 4-player snapshot budget, A24)
      out.push(this.round ? snapItem(n) : n);
    }
  }

  /** (coop-carry) The client carrying body `b` ('' none). */
  private carrierOf(b: Body): string {
    for (const [id, v] of this.carries) if (v.body === b) return id;
    return '';
  }

  /** (coop-carry) A client asks to pick body `id` (`body-<Body.id>`) up: the host's carry rules, then the lift begins
   *  (`Body.beginHoist`: off the floor list at once), on the client's shoulder here at `CQ.liftRise`. */
  private remotePickUp(r: RemotePlayer, id: string): void {
    const em = this.g.enemyMgr;
    const b = em?.bodies.find((x) => `body-${x.id}` === id);
    if (!b) return;
    let seizing = false;
    for (const sz of this.seized.values()) if (sz.by === r.id) seizing = true;
    const deny = pickupDenied({
      alive: r.alive,
      held: r.held,
      carrying: this.carries.has(r.id),
      seizing,
      mode: r.state?.mv?.m,
      present: b.present,
      taken: this.g.stealth?.carry === b || this.carrierOf(b) !== '',
      bx: b.pos.x,
      by: b.pos.y,
      bz: b.pos.z,
      fx: r.feet.x,
      fy: r.feet.y,
      fz: r.feet.z,
      reach: BODY.reach,
    });
    if (deny === 'far') r.violations++;
    if (deny) return;
    this.carries.set(r.id, new CarryView(b, r.avatar));
  }

  /** (coop-carry) Client `id`'s body put down at its side (its put down's hand-over, its death, its drop-out): a ragdoll
   *  the guards hear (`DROP_NOISE`) and can find. */
  private remoteDrop(id: string, asked = false): void {
    const v = this.carries.get(id);
    if (!v) return;
    this.carries.delete(id);
    const ok = this.g.enemyMgr?.canRagdoll() ?? false;
    // (fix round) a lift the client let go of before the hoist (its `drop-body`): laid back quietly, as the host's own
    // crouch let-go; (recheck) down, held or gone mid-lift is heard, as solo
    if (!letGoHeard(v.onShoulder, asked)) {
      v.letGo(ok);
      return;
    }
    const at = v.drop(ok);
    this.g.enemyMgr?.hear(at, DROP_NOISE);
  }

  /** (coop-carry) A client hides its body at hiding spot `id` (`hide-<i>`, the host's item): carrying and in reach. */
  private remoteHide(r: RemotePlayer, id: string): void {
    const v = this.carries.get(r.id);
    const it = this.g.interactables?.items.find((i) => i.id === id && i.kind === 'hide');
    if (!it || !hideOk(r.alive, !!v, inCarryReach(it.pos.x, it.pos.y, it.pos.z, r.feet.x, r.feet.y, r.feet.z, it.reach ?? 1.5))) return;
    this.carries.delete(r.id);
    v!.hide();
    const st = this.g.stealth;
    if (st) st.bodiesHidden++;
    this.g.hud.feedItem(`${r.avatar.info.name}: body hidden`);
  }

  /** (coop-carry) Each fixed step: the clients' carries (the hoist lands at `CQ.liftRise`); a carrier down or held drops
   *  it where he stands; a body the match removed (a restart, the cap) ends its carry. */
  private carryStep(dt: number): void {
    const em = this.g.enemyMgr;
    for (const [id, v] of this.carries) {
      const r = this.remotes.get(id);
      if (!em || em.bodies.indexOf(v.body) < 0 || v.body.hidden) {
        v.clear();
        this.carries.delete(id);
        continue;
      }
      if (!r || !r.alive || r.held) {
        this.remoteDrop(id);
        continue;
      }
      v.step(dt);
    }
  }

  private doors(): number[] {
    const out: number[] = [];
    for (const d of this.g.world.doors.list) if (d.target === 1 && out.length < MAX_DOORS) out.push(d.index);
    return out;
  }

  /** (step 13) Cracked doors (door peek), capped at MAX_DOORS. */
  private cracked(): number[] {
    const out: number[] = [];
    for (const d of this.g.world.doors.list) if (d.cracked && out.length < MAX_DOORS) out.push(d.index);
    return out;
  }

  private snapshot(): void {
    const players: PlayerState[] = [this.selfState()];
    for (const r of this.remotes.values()) {
      if (!r.state) continue;
      players.push({ ...r.state, x: r.feet.x, y: r.feet.y, z: r.feet.z, hp: r.health.hp, f: ((r.alive ? r.state.f & ~PF.dead : r.state.f | PF.dead) & ~PF.spotted) | (r.ref.spotted ? PF.spotted : 0) });
    }
    const enemies: EnemyState[] = [];
    const em = this.g.enemyMgr;
    for (const e of em?.enemies ?? []) {
      if (!e.alive || enemies.length >= MAX_ENEMIES) continue;
      // (coop-torches) every snapshot carries every listed guard's torch bit (no deltas), so a guard that drops out of
      // the list and comes back is shown right from his first snapshot; the client places the light from x, y, z,
      // yaw and st as `Enemy.placeTorch` does here
      const es: EnemyState = { id: e.id, k: e.def.kind, x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw, st: e.crouchBlend > 0.5 ? 2 : e.aiming ? 1 : 0, hp: e.health.fraction, al: alertCode(e, !!em && em.hasTorch(e)) };
      // (stealth-pays client intel) his unspent intel: the client offers INTERROGATE from this, both modes;
      // (coop4 N1, A24) numbers rounded on the wire (`snapEnemyState`): the 4-player snapshot budget
      markIntel(es, hasInfo(e));
      enemies.push(this.round ? snapEnemyState(es) : es);
    }
    const snap: Extract<Msg, { t: 'snap' }> = { t: 'snap', time: this.time, players: players.map(this.round ? snapPlayerState : wirePlayerState), enemies, obj: this.obj, info: this.info, pk: this.g.pickups?.mask ?? 0 };
    // items and doors when they change (and every few seconds for late joiners)
    const items = this.items();
    const doors = this.doors();
    // bodies still lying (not carried off, hidden or revived): clients keep those ragdolls
    const bodies: string[] = [];
    for (const b of this.g.enemyMgr?.bodies ?? []) if (b.enemyId && !b.hidden && !b.carried && bodies.length < MAX_ENEMIES) bodies.push(b.enemyId);
    const bsig = bodies.join();
    const isig = items.map((i) => `${i.id}${i.on ? 1 : 0}${i.label}${i.by ?? ''}`).join();
    const dcr = this.cracked();
    const trp = openTrapGaps(this.g.world.level.opticPoints, this.g.world.breakables, this.trpBuf);
    const dsig = `${doors.join()}/${dcr.join()}/${trp.join()}`;
    if (isig !== this.itemsSig || dsig !== this.doorsSig || bsig !== this.bodiesSig || this.itemsT <= 0) {
      this.itemsSig = isig;
      this.doorsSig = dsig;
      this.bodiesSig = bsig;
      this.itemsT = ITEMS_EVERY;
      snap.items = items;
      snap.doors = doors;
      snap.dcr = dcr;
      if (trp.length) snap.trp = trp.slice();
      snap.bodies = bodies;
    }
    this.s.send(snap);
    if (this.queue.length) {
      this.s.send({ t: 'ev', events: this.queue.splice(0, MAX_EVENTS) });
    }
  }

  /** (rig-pose-fix S3, G7 / G20) Each live guard's sim feet, crouch, sim head (`simHead`) and shown head (`wireHead`)
   *  for the judge's rewind (`shotHistory.ts`). The old rig branch (G20: a rig head / pelvis, never passed a rig) is gone. */
  private recordHistory(): void {
    const enemies = this.g.enemyMgr?.enemies;
    if (!enemies) return;
    const w = this.histWire;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i]!;
      if (!e.alive) continue;
      let h = this.history.get(e.id);
      if (!h) this.history.set(e.id, (h = []));
      pushHist(h, HISTORY_MAX, this.time, e.pos, e.crouchBlend, e.simHead, e.wireHead(w));
    }
  }
  private readonly histWire = { x: 0, y: 0, z: 0 };

  /** Enemies hear the clients too: footsteps by speed and stance, shots by their weapon (suppressed = suspicion). */
  private remoteNoise(dt: number): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    this.noiseT -= dt;
    const steps = this.noiseT <= 0;
    if (steps) this.noiseT = 0.25;
    for (const r of this.remotes.values()) {
      const st = r.state;
      if (!r.alive || !st) continue;
      if (steps) {
        // (guard-ai S26 fix) the host player's rule on the client's own sent speed and stance (never the snapshot-delta
        // estimate: a crouch-walk is silent, a teleport makes no step); (step 11) a back-to-wall slide is heard at the
        // crouch band (bible 5.3)
        const n = clientStepNoise(st, r.stepOk);
        if (n > 0) em.hear(r.feet, n, 'noise', null, r.ref.id);
      }
      const t = (this.firing.get(r.id) ?? 0) - dt;
      if (st.f & PF.firing && t <= 0) {
        this.firing.set(r.id, 0.4);
        const quiet = (st.f & PF.quiet) !== 0;
        // (guard-ai S14, A46) as in solo: SHOT_NOISE x the weapon's noise (9.8 m for the CT guns), at most the quiet cap;
        // (spare 7) a suppressed gun out of quiet rounds fires open at its open noise
        if (quiet) em.hear(r.feet, SHOT_NOISE * Math.min(WEAPONS[st.w].noise ?? 1, 0.6), 'noise', null, r.ref.id);
        else em.noise(r.feet, SHOT_NOISE * (SD_OPEN_NOISE[st.w] ?? WEAPONS[st.w].noise ?? 1), r.ref.id);
      } else this.firing.set(r.id, t);
    }
  }

  /** (LR16-5) The shared sim clock: the time the snapshots carry (the client's `ClockSync` tracks it). */
  simTime(): number {
    return this.time;
  }

  /** (coop4 OUT, A16) The host's own follow view while it is out. */
  private readonly follow = new OutFollow();
  /** (coop4 round fix) `followStep`'s reused scan context (`followSetRemote`). */
  private readonly followScan: HostFollowScan = { f: this.follow, out: new Set<string>() };

  /** (coop4 OUT) Out (Sector Ops, 3-4 players): the view follows a teammate who is up; the switch-target input (next
   *  weapon) moves to the next one. Off as soon as we are up again. No allocation per step. */
  private followStep(): void {
    const g = this.g;
    const pl = g.player;
    if (pl.alive || !g.outIds.has('local')) {
      if (pl.followFeet) {
        pl.followFeet = null;
        this.follow.reset();
      }
      return;
    }
    const f = this.follow;
    f.begin();
    this.followScan.out = g.outIds;
    this.remotes.forEach(followSetRemote, this.followScan);
    pl.followFeet = f.pick(g.app.input.state.pressed('swapNext') ? 1 : 0);
  }

  /** (campus-greybox A28 fix 1) The remotes' first states were judged before the mode started (`placeEarly`, once). */
  private earlyPlaced = false;

  /**
   * (campus-greybox A28 fix 1) The host's first step after `enter` (`mode.start()`; the loop runs `fixedUpdate` only
   * after it): a remote whose first state came while the host was still loading was judged against the run as built
   * (section 1, no door locked). A run that `start()` moved (`?sectorStart=N`) is judged once more here: each remote with
   * a state, not watched and not being restored, goes through `firstPlace` at its feet. A normal run stands at section
   * 1's start, so nothing moves; a remote whose first state comes later takes `receive`'s path as before.
   */
  private placeEarly(): void {
    this.earlyPlaced = true;
    for (const r of this.remotes.values()) {
      if (r.state && !this.joins.watching(r.id) && !this.joins.restoring(r.id)) this.firstPlace(r, r.feet.x, r.feet.y, r.feet.z);
    }
  }

  /** (spare 9) Guard `e` held by client `by` (its MoveState `sub` / `ph`, each step): when the client's interrogation
   *  ends, the host spends his information and gives the team the intel. */
  private clientRead(e: Enemy, by: string, sub: number, ph: number): void {
    const eid = e.id;
    if (interrogationEnded(this.interPh.get(eid) ?? -1, sub)) {
      const info = e.info;
      // (joint-interrogation) checked before `takeInfo` spends him; the holder (by) is never his own bluffer
      const joint = !!info && info.lines.length > 0 && this.jointFor(eid, by, jointOf(info));
      // (mission NET) the guard's id (a mission's interrogate step, the decoy's spook) and the client's (its team)
      if (takeInfo(e)) revealIntel(this.g, e.pos, info, eid, by);
      if (joint) revealJoint(this.g, e.pos, jointOf(info));
    }
    this.interPh.set(eid, sub & 2 ? ph : -1);
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.followStep();
    if (!this.earlyPlaced) this.placeEarly();
    if (this.strikes.size) this.runStrikes();
    if (this.throwKo.active && this.g.enemyMgr) this.throwKo.step(this.time, this.g.enemyMgr.enemies);
    this.itemsT -= dt;
    for (const r of this.remotes.values()) r.update(dt);
    if (this.carries.size) this.carryStep(dt);
    // revive points follow the bodies; client-held enemies are let go if the client never finishes
    for (const [id, it] of this.revives) {
      const r = this.remotes.get(id);
      const at = id === this.s.selfId ? this.g.player.position : r?.feet;
      if (at) it.pos.copyFrom(at);
      if (id === this.s.selfId ? this.g.player.alive : !r || r.alive) this.dropRevive(id);
    }
    this.stepReviveClock(dt);
    for (const r of this.remotes.values()) r.ref.shield = null;
    for (const [eid, s] of this.seized) {
      s.t += dt;
      const by = this.remotes.get(s.by);
      // (3.2.0) a client holding the guard as a hostage: kept in front of them (and a shield) for as long as it lasts
      const mv = by?.state?.mv;
      // (hang-down, A7) a client hanging head-first keeps the guard it took (grab or neck snap), lifted under its head
      if (by && by.alive && hangingMove(mv) && hangHoldStep(this.g.enemyMgr?.enemies, eid, s, by.avatar.pos.x, by.avatar.pos.y, by.avatar.pos.z, dt)) {
        s.t = 0;
        continue;
      }
      if (by && by.alive && mv?.m === 'grab' && mv.tid === eid) {
        const e = this.g.enemyMgr?.enemies.find((x) => x.id === eid);
        if (e && e.alive) {
          s.t = 0;
          // (marlow-bays item 1) placed from the client's drawn (interpolated) body, not its raw 20 Hz state: the hostage
          // stays with the body on screen instead of running 0.1 s ahead in steps (each step a velocity spike in holdAt)
          const at = by.avatar.pos;
          const yaw = by.avatar.yaw;
          if (!s.hostage) {
            s.hostage = true;
            e.holdAsHostage();
            e.setSolid(false);
          }
          const sy = Math.sin(yaw);
          const cy = Math.cos(yaw);
          // (hostage-gait) the drawn body moves once per frame; below 60 fps 2+ steps see one pose and holdAt's speed
          // (his gait) flickers 2x / 0. The feed moves the point every step (holdFeed.ts); a jump places him first
          if (stepHoldFeed(s, at.x + sy * GRAB.hold + cy * GRAB.side, at.z + cy * GRAB.hold - sy * GRAB.side, this.holdClock, this.time, dt)) e.pos.set(s.hfX, at.y, s.hfZ);
          e.holdAt(s.hfX, at.y, s.hfZ, yaw);
          // (G7) the client's knockout lowers him here too, its interrogation turns his head (MoveState ph / sub)
          this.clientRead(e, s.by, mv.sub, mv.ph);
          if (mv.sub & 2) e.holdPose('interrogate', mv.ph);
          else if (mv.ph > 0 && !(mv.sub & 1)) {
            const ko = koCurve(mv.ph, this.koTmp);
            e.holdPose('ko', ko.limp, ko.lower);
          } else if (mv.ph === 0) e.holdAsHostage();
          by.ref.shield = e;
          continue;
        }
      }
      s.hfOn = false;
      // (joint-flake-3) no grab on him this step: a grab that ended mid-read leaves a stale ph, which
      // `interrogationEnded` (any progress counts) would count as a finished read on a re-grab within TD_MAX
      this.interPh.delete(eid);
      if (s.t > TD_MAX || !by || !by.alive) this.release(eid);
    }
    this.remoteNoise(dt);
    for (const [id, t] of this.respawnIn) {
      const left = t - dt;
      if (left > 0) {
        this.respawnIn.set(id, left);
        continue;
      }
      this.respawnIn.delete(id);
      this.reviveOne(id, this.spawnPoint(this.slotOf(id)));
    }
    this.histT -= dt;
    if (this.histT <= 0) {
      this.histT = 1 / HISTORY_HZ;
      this.recordHistory();
    }
    this.snapT -= dt;
    // the host's own mode / sub-state changed (a ladder, a vault): snapshot now
    const mv = localMoveState(this.g, this.mvNow);
    if (moveChanged(this.mvSent, mv)) {
      Object.assign(this.mvSent, mv);
      this.mvSent.c = mv.c ? { ...mv.c } : undefined;
      this.snapT = 0;
    }
    if (this.snapT <= 0) {
      this.snapT = 1 / SNAP_HZ;
      this.tracerBudget = 10;
      this.snapshot();
    }
    this.sendLamps(dt);
  }

  /** (sector-redesign slice L, protocol 31) Sector Ops: the fixed lights' state on a change, a join / rejoin, a section
   *  restart and every `LAMP_KEEPALIVE` s. Allocation-free unless it sends. (coop-real F1c) In every mode it first notes
   *  the time of the mode's last restart (`lampRestartAt`, the stale lamp round rule). */
  private sendLamps(dt: number): void {
    const rs = (this.g.mode as { restarts?: number } | null)?.restarts ?? 0;
    if (rs !== this.lampRestarts) {
      this.lampRestarts = rs;
      this.lampForce = true;
      this.lampRestartAt = this.time;
    }
    const tx = this.lampTx;
    if (!tx) return;
    const w = tx.step(this.g.world.level.lights, dt, this.lampForce);
    this.lampForce = false;
    if (w) this.s.send({ t: 'lamps', n: w.n, of: w.of, sh: w.sh });
  }

  /** (B8) The revive windows: countdown labels (whole seconds), the host's own HUD timer, the out rule. */
  private stepReviveClock(dt: number): void {
    const ex = this.expired;
    ex.length = 0;
    this.reviveClock.step(dt, ex);
    for (let i = 0; i < ex.length; i++) this.goOut(ex[i]!);
    for (const [id, it] of this.revives) {
      const sec = Math.ceil(this.reviveClock.remaining(id));
      if (sec <= 0 || this.reviveSec.get(id) === sec) continue;
      this.reviveSec.set(id, sec);
      const nm = id === this.s.selfId ? this.name(id) : (this.remotes.get(id)?.avatar.info.name ?? 'Operator');
      it.label = `Revive ${nm} (${sec})`;
      if (id === this.s.selfId) this.g.hud.setDownTimer(`DOWN - revive in ${sec} s`);
    }
  }

  /** (rig-pose-fix S1, G12) A partner's sim body (friendly-fire volumes from the drawn copy's state, not its rig). */
  private readonly partnerIn = emptyPlayerBodyIn();
  private readonly partnerOut = emptyPlayerBodyOut();
  private readonly partnerHead = new Vector3();
  private readonly partnerHips = new Vector3();
  frameUpdate(dt: number): void {
    const now = performance.now() / 1000 - INTERP_DELAY;
    this.holdClock.frame(now, this.time);
    for (const r of this.remotes.values()) {
      r.avatar.update(dt, now);
      // (rig-pose-fix S1, G3 / G4) the client's hit volumes, perception points and wall head come from its sim body at
      // the accepted state (`RemotePlayer.accept`), no longer from this drawn copy's rig
      r.blocker?.sync(r.avatar.pos, r.crouched, r.alive && !partnerPassable(r.avatar.mode));
      const hb = this.partnerBoxes.get(r.id);
      if (!hb) continue;
      if (!r.alive) {
        hb.setEnabled(false);
        continue;
      }
      hb.setEnabled(true);
      const b = playerBody(r.avatar.bodyIn(this.partnerIn), this.partnerOut);
      hb.sync(r.avatar.pos, this.partnerHead.set(b.head.x, b.head.y, b.head.z), this.partnerHips.set(b.pelvis.x, b.pelvis.y, b.pelvis.z));
    }
  }

  shadows(b: BlobShadows): void {
    for (const r of this.remotes.values()) {
      const p = r.avatar.pos;
      b.add(p.x, p.y, p.z, 0.42);
    }
  }

  onLocalDeath(): boolean {
    const g = this.g;
    this.endPairOf(this.s.selfId);
    if (!g.mode) return false;
    // co-op: someone can still come and get you
    if (this.anyoneUp(this.s.selfId) && g.interactables) {
      if (!this.reviveClock.down(this.s.selfId)) {
        // (B8) no revives left: out until the checkpoint
        g.hud.banner('DOWN', 'No revives left', 3000);
        this.goOut(this.s.selfId);
        return true;
      }
      g.hud.banner('DOWN', 'A team-mate can revive you', 3000);
      this.addRevive(this.s.selfId, g.player.position, this.name(this.s.selfId));
      return true;
    }
    return false;
  }

  /** (marlow-jammer fix round 1) The camera hallway sends player `who` back: the host's copy moves at once (a
   *  teleport is allowed), the client moves itself on the `back` event. Health and state are kept. */
  sendBack(who: string, x: number, y: number, z: number, yaw: number): void {
    const r = this.remotes.get(who);
    if (!r || !r.alive) return;
    r.moveTo(x, y, z);
    this.joins.moved(who, this.time, HALL_BACK_HOLD);
    this.push({ e: 'back', player: who, x, y, z, yaw });
  }

  /** The host respawned at a checkpoint (co-op): everyone down comes back beside it, (coop-rejoin, walk item 4) each
   *  on its own slot of the checkpoint (the map's slot point, else a safe spot beside the host's). */
  onRespawn(at: Vector3): void {
    this.reviveClock.checkpoint();
    this.g.hud.setDownTimer(null);
    const cps = this.g.mode?.checkpointSpawns?.() ?? [];
    const c0 = cps[0];
    const area: SlotPoint[] = c0 && hyp2(c0.x - at.x, c0.z - at.z) < 1 ? cps : [{ x: at.x, y: at.y, z: at.z, yaw: this.g.player.cam.yaw }];
    const others: SpawnBody[] = [{ x: at.x, y: at.y, z: at.z }];
    const probe = spawnProbe(this.g);
    // (coop4 A14) slot by slot (1, 2, 3): each on its slot of the checkpoint or the first free ring spot beside it,
    // clear of the ones placed before it
    const order = this.bySlot;
    order.length = 0;
    for (const r of this.remotes.values()) order.push(r);
    sortBySlot(order);
    for (const r of order) {
      const o: SlotPoint = { x: 0, y: 0, z: 0, yaw: 0 };
      slotSpawn(area, r.ref.slot, others, probe, o);
      const p = new Vector3(o.x, o.y, o.z);
      others.push(p);
      // (fix round, check A P2) a restore still repeating (join or held spot) stops: it would pull the partner back
      if (!r.alive || this.g.mode?.id === 'sector' || this.g.mode?.id === 'course') this.joins.respawned(r.id, this.time);
      if (!r.alive) this.reviveOne(r.id, p);
      else if (this.g.mode?.id === 'sector' || this.g.mode?.id === 'course') {
        // (sector-ops step 3) a section restart is a clean retry: a partner still up comes back to the checkpoint too;
        // (course-ready F3) the course's bay restart too, so the relocked gates never shut an alive partner out
        r.revive(p, 2);
        this.push({ e: 'revive', player: r.id, x: p.x, y: p.y, z: p.z });
      }
    }
  }

  /** (coop4) Scratch: the remotes in slot order (`onRespawn`). */
  private readonly bySlot: RemotePlayer[] = [];

  reviveAll(): void {
    for (const r of this.remotes.values()) if (!r.alive) this.reviveOne(r.id, this.spawnPoint(r.ref.slot));
  }

  pickers(): { id: string; feet: Vector3; needs: (k: PickupKind) => boolean }[] {
    const out = [];
    for (const r of this.remotes.values()) {
      if (!r.alive) continue;
      out.push({ id: r.id, feet: r.feet, needs: (_k: PickupKind) => true });
    }
    return out;
  }

  onPickup(kind: PickupKind, who: string): void {
    const r = this.remotes.get(who);
    if (!r) return;
    this.push({ e: 'pickup', player: who, kind });
  }

  onEnd(won: boolean, subtitle: string): void {
    const st = this.g.stats;
    const players: EndStats['players'] = {
      [this.s.selfId]: { kills: st.kills, headshots: st.headshots, byKind: { ...st.byKind }, weaponKills: { ...st.weaponKills } },
    };
    for (const [id, t] of this.tallies) if (this.remotes.has(id)) players[id] = t;
    // flush pending events (kill feed, banners) before the result
    this.snapshot();
    this.s.send({ t: 'end', stats: { won, subtitle, score: st.score, players } });
  }

  dispose(): void {
    for (const o of this.offs) o();
    for (const hb of this.partnerBoxes.values()) hb.dispose();
    this.partnerBoxes.clear();
    for (const r of this.remotes.values()) r.dispose();
    this.remotes.clear();
    this.remoteRefs.length = 0;
    this.g.remotePlayers = this.soloRemotes;
    this.g.gadgets.onLocal = null;
    this.s.lateBay = null;
  }
}
