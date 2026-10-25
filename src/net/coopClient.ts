import { Vector3 } from '../core/babylon';
import type { GameState, NetAttachment } from '../game/gameState';
import type { TakedownVictim } from '../game/takedownController';
import type { BlobShadows } from '../vfx/blobShadows';
import { Body, deathLieOn } from '../ai/body';
import { newLie } from '../ai/bodyLie';
import { ClientCarry } from './clientCarry';
import { CarryView } from './carryView';
import { carryChange, clientBodyPrompt } from './bodyCarryNet';
import { BUDGET, G } from '../physics/groups';
import { TorchMirror } from './torchMirror';
import { LAMP_TARGET, LampMirror, SWAY_TARGET } from './lampSync';
import { SWAY } from '../world/lampSway';
import { lampReachProbe, lightOnRay, type LightDef } from '../world/lights';
import { BODY } from '../ai/bodies';
import type { HitInfo } from '../game/damage';
import { Interactables, KIND_COLOR, type Interactable } from '../game/interactables';
import { CRATE_DARK, applyCrateEvent } from '../game/crateLedger';
import type { NetSession } from './session';
import { BARK_CAM, BARK_TEXT, DROP_BODY_ID, gaitWire, motionWire, PF, type EndStats, type Msg, type NetEvent, type NetItem, type PlayerState, wirePlayerState } from './protocol';
import { CT } from '../config/movement';
import { CLIENT_INTERP_DELAY, ClockSync, sendClock } from './interp';
import type { CKind } from '../game/committedMoves';
import { RemoteAvatar } from './remoteAvatar';
import { setPlayerGlow } from '../operators/runtime/playerFigure';
import { EnemyPuppet } from './enemyPuppet';
import { infoAtSpawn } from '../ai/guardInfo';
import { PartnerTarget } from './partnerTarget';
import { PartnerBlocker, partnerPassable } from './partnerBlocker';
import type { TeamMate } from '../game/teamController';
import type { TeamKind } from '../game/teamMoves';
import { clampEnd, clientForcedHolster, coopSessionStats, ratingViewFromWire, ratingViewsFromRh } from './validate';
import { RatingCard, type RatingView } from '../ui/hud/ratingCard';
import { GADGETS } from '../game/gadgets';
import { applyOpenTraps } from '../game/gapMenu';
import { GRANT_GADGETS, putRating } from '../game/rating/sectionRating';
import { stationHeal } from '../game/medkit';
import { applyCourseWire, clientCourseFrame, clientCourseSummary, disposeClientCourse } from '../game/modes/courseMode';
import { COURSE_RESTART_TITLE, isClientVerb, type ClientVerb } from '../game/course/courseWire';
import { CtDevices } from '../game/ctDevices';
import { newSeenBody, remoteHeadY, type SeenBody } from '../security/securitySystem';
import { CourseFeed } from '../game/course/courseFeed';
import { infoToHtml, localFlags } from './netShared';
import { keepSimInBackground } from './bgTicks';
import { OBJ_CONNECTING, objectiveOnSnap, objectiveOnStall, showMirrorLine } from './objectiveMirror';
import { hyp3 } from '../core/mathx';
import { localMoveState } from '../game/localMoveState';
import { dropBadOpticMove, dropBadWallMove, emptyMoveState, moveChanged } from '../player/moveState';
import { CrackPrediction } from '../world/doorPeek';
import { markCompleted } from '../save/sectorRecord';
import { HoldPulseWatch } from './holdPulse';
import { BOLT_DEPTH, SECTOR_RESTART_TITLE, boltById, boltHalfSpan, type SectorRatingWire } from '../game/sectors';
import { barkLine, BARK_EVENTS, RADIO_BARKS } from '../ai/barks';
import { HelmetDrops } from '../ai/helmetDrops';
import { DeflectLedger } from './puppetGear';
import { stampKeptBodies } from './keptBodies';
import { DESK_NONE, deskItemId, deskModeOf } from '../game/sectorDesks';
import { placeSlot, startSlotPoints } from '../game/spawnPlace';
import type { SlotPoint } from '../game/spawnSlots';
import { SectorListMirror } from '../game/sectorObjectives';
import type { ObjectiveLine } from '../ui/screens/pauseScreen';

const SEND_HZ = 20;
/** (afp AF6) `CLIENT_INTERP_DELAY` (interp.ts; was 0.12). */
const INTERP_DELAY = CLIENT_INTERP_DELAY;

/**
 * Client side of a match. Only the local player is simulated (predicted); enemies, modes, pickups, objectives, doors
 * and health come from host snapshots. Own hits are resolved against local puppets (course: the partner's hit volumes)
 * for instant feedback and sent to the host for the real outcome; objectives, doors and revives are used through
 * mirrored interactables (`use`); takedowns seize a puppet here and the host's enemy there (`td`).
 */
export class CoopClient implements NetAttachment {
  private avatars = new Map<string, RemoteAvatar>();
  /** (G7 fix) The puppet the partner holds (posed from its MoveState). */
  private heldPuppet: EnemyPuppet | null = null;
  private puppets = new Map<string, EnemyPuppet>();
  private puppetList: EnemyPuppet[] = [];
  private targets = new Map<string, PartnerTarget>();
  /** (T5b2, D49) The co-op partners' bodies (every non-opponent): they block the local player as he blocks them. */
  private blockers: { id: string; a: RemoteAvatar; b: PartnerBlocker }[] = [];
  /** Bodies the host still has lying, by enemy id (dropped when its `snap.bodies` leaves one out). (coop-carry) A `Body`
   *  (was a bare ragdoll), so this page lifts, carries and puts down the very body it shows. */
  private kept = new Map<string, Body>();
  /** (coop-carry) Our own body carry (`GameState.carrier` on a client). */
  readonly carry: ClientCarry;
  /** (coop-carry) Each mirrored body's carrier by enemy id (the host's `NetItem.by`), and the partners' carries shown. */
  private carriers = new Map<string, string>();
  private views = new Map<string, CarryView>();
  private readonly mirrorSeen = new Set<string>();
  /** (coop-carry fix round) Each mirrored body item by enemy id, with the host's lying state (`bodyPrompt`). */
  private bodyItems = new Map<string, { it: Interactable; on: boolean }>();
  /** (rig-pose-fix S5) Scratch for a kill's body lie (the host's `Body` lie, P13). */
  private deathLie = newLie();
  /** (LR16-6 fix) When each kept body went down (`time`): its body-heat cooling (`stampBodies`). Render only. */
  private readonly keptAt = new Map<string, number>();
  private dying: EnemyPuppet[] = [];
  private clock = new ClockSync();
  private sendT = 0;
  private time = 0;
  private offs: (() => void)[] = [];
  /** The mirror's line: the host's objective, or the connecting / waiting notice (objectiveMirror.ts). Shown only
   *  through `showLine` (hud-guidance B3: a notice on the net-status line, a host objective on the objective line). */
  private obj = OBJ_CONNECTING;
  private info = '';
  /** (coop-fix) A snapshot has arrived, and the seconds since the last one (the "Waiting for host" notice). */
  private gotSnap = false;
  private sinceSnap = 0;
  private ended = false;
  private lastBlast: { p: Vector3; t: number } | null = null;
  private ints: Interactables | null = null;
  private items = new Map<string, Interactable>();
  /** (marlow-final Q12) The mirrored noisy holds: each pulse of our own hold goes to the host's guards. */
  private holdPulses = new HoldPulseWatch();
  private readonly sendPulse = (id: string): void => this.s.toHost({ t: 'use', id, pulse: true });
  /** (E9-crate) The weapons crates this player used (fed only by `crate` events; cleared on a section restart). */
  private readonly crateSpent = new Set<string>();
  /** Sector Ops: the client's mirror of the cameras and lasers. */
  private sec: CtDevices | null = null;
  /** (hud-guidance B4, HG8) Sector Ops: the field menu's full list, from the host's live section and objective line. */
  private list: SectorListMirror | null = null;
  /** (sector-restart) The section our checkpoint loadout was recorded for (the host's live section only moves on). */
  private kitSection = 0;
  /** (section-rating S3) The host's last section rating as the HUD card shows it (null before the first). */
  rating: RatingView | null = null;
  /** (section-rating S3) Bumped on each new rating (the HUD shows the card when it changes). */
  ratingSeq = 0;
  /**
   * (section-rating S3) Called once per new granted rating with the gadget the grant topped up here (by name, or
   * undefined when none or several); not for the op's last section (that one goes to the results). Sector Ops sets it
   * to the rating card below.
   */
  onRating: ((v: RatingView, gadgetName?: string) => void) | null = null;
  /** The section index of the last rating taken (-1 none; a restart never re-rates, so a new index is a new rating). */
  private ratedSec = -1;
  /** (section-rating fix) The card's copy of a rating, its grant trimmed to what lands here (reused). */
  private readonly cardView: RatingView = {
    sectionId: '',
    title: '',
    marks: 0,
    synced: 0,
    grant: { gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 },
  };
  /** (integration) A sector message has arrived since this client connected (the first one's rating is history). */
  private sawSector = false;
  /** (integration) Sector Ops: the section rating card on our HUD (null elsewhere). */
  private card: RatingCard | null = null;
  /** (coop-torches) The guards' flashlights: the world's slots lit and placed from the snapshot's torch bits. */
  readonly torches: TorchMirror;
  private readonly torchA = new Vector3();
  private readonly torchB = new Vector3();
  /** (polish2) The mount-reach probe's ends (`lampReachProbe`). */
  private readonly reachA = new Vector3();
  private readonly reachB = new Vector3();
  /** (sector-redesign slice L, protocol 31) Sector Ops: the host's fixed lights (switched, shot) on this page's registry,
   *  so the picture, the meter and the guards' torch reads match the host's; null elsewhere. */
  lamps: LampMirror | null = null;
  /** (guard-ai S9, protocol 38) Dropped helmets shown here (built on the first drop), the deflect markers our puppets
   *  predicted against the host's confirms, and the host's deflect confirms for us (tests / e2e). */
  helmetDrops: HelmetDrops | null = null;
  private readonly deflects = new DeflectLedger();
  deflectConfirms = 0;
  /** (guard-ai S9) The host's guard lines shown here (tests / e2e). */
  barksShown = 0;
  /** The cue for a lamp the host reports newly shot out (the host's own sparks). */
  private readonly lampSparks = (l: LightDef): void => this.g.vfx.sparks(new Vector3(l.x, l.y, l.z), Vector3.Down(), 10, '#fff1c8');

  constructor(
    private g: GameState,
    private s: NetSession,
  ) {
    // (coop-torches) the beam stops at the first wall as on the host (`beamReach`, one static ray each, no allocation)
    this.torches = new TorchMirror(g.world.level.lights, (ax, ay, az, bx, by, bz) => g.ballistics.hitDistance(this.torchA.set(ax, ay, az), this.torchB.set(bx, by, bz), G.STATIC));
    this.offs.push(s.events.on('game', ({ msg }) => this.receive(msg)));
    // (coop-carry) our carry: the host decides the pick up and the hide (`use`), our put down tells it
    this.carry = new ClientCarry(g, () => this.ints, (id) => this.s.toHost({ t: 'use', id }), () => this.canRagdoll());
    // (G135) the goggle colours follow the host's player order (host green, us cyan as the partner)
    this.recolour();
    this.offs.push(s.events.on('lobby', () => this.recolour()));
    // (coop-rejoin, walk item 4) our own slot of the start area (the map's slot point, else a safe spot beside the
    // host's), before our first `pstate` (the host takes a first state anywhere): a course bay-N start's entry airlock
    // (D20), Sector Ops' first section, else the map's spawns. A late join or rejoin is then placed by the host.
    this.placeStart();
    if (g.opts.mode === 'course') {
      const feed = new CourseFeed(g, true);
      this.feed = feed;
      this.offs.push(g.events.on('takedown', (e) => {
        if (e.phase === 'start') this.tdKind = e.kind;
      }));
      this.offs.push(() => feed.dispose(), () => disposeClientCourse(g));
    }
    if (g.opts.mode === 'sector') {
      // Sector Ops: the cameras and lasers as the host's `sector` message drives them; our jam goes to the host
      const ct = new CtDevices(g, 'client', { say: () => undefined, record: () => undefined, dirty: () => undefined });
      this.sec = ct;
      g.ctDev = ct;
      this.list = new SectorListMirror(g.world.map.sectors ?? []);
      // (sector-restart, M9) our loadout as section 1 begins: a checkpoint restart gives it back
      g.weapons.markCheckpoint();
      // (slice L) the host's lamps (`lamps`); our lamp rounds go to the host below
      this.lamps = new LampMirror();
      this.offs.push(() => {
        ct.dispose();
        g.ctDev = null;
      });
      // (section-rating integration) the host's section ratings on our own card (the host's mode shows its own)
      const card = new RatingCard(g.hud.el);
      this.card = card;
      this.onRating = (v, name) => card.show(v, name);
      this.offs.push(() => {
        card.el.remove();
        this.card = null;
        this.onRating = null;
      });
    }
    // (slice L; coop-real F1b, S2: Course mode too) our round through a lamp asks the host to shoot it out
    // (host-authoritative); first in the onRay chain, the sway and ricochet hooks chain after it
    if (clientLampShots(g.opts.mode)) {
      g.weapons.onRay = (a, b) => this.lampRay(a, b);
      this.offs.push(() => (g.weapons.onRay = null));
    }
    // (39, LR16-5b) Marlow Yard's swinging pendants: our round past one asks the host to kick it (no local kick: the
    // host's `sway` event swings it on both pages alike)
    const sway = g.world.level.lights.sway;
    if (sway) {
      this.swaySent = new Float64Array(sway.n).fill(-Infinity);
      const prevRay = g.weapons.onRay;
      g.weapons.onRay = (a, b) => {
        prevRay?.(a, b);
        this.swayRay(a, b);
      };
      this.offs.push(() => (g.weapons.onRay = null));
    }
    g.explosions.onLocalBlast = (p) => {
      this.lastBlast = { p: p.clone(), t: this.time };
      s.toHost({ t: 'blast', x: p.x, y: p.y, z: p.z });
    };
    // (locomotion step 10) the host resolves committed moves (strike contact) on its guards
    g.strike.authority = false;
    // our gas / flash / EMP / noisemaker: the host applies it to the guards
    g.gadgets.onLocal = (kind, at) => {
      if (kind === 'gas' || kind === 'flash' || kind === 'emp' || kind === 'noise') s.toHost({ t: 'gadget', kind, x: at.x, y: at.y, z: at.z });
    };
    g.takedownVictims = () => this.puppetList;
    // (LR16-6 fix) our kept bodies cool as the host's do (render-only body heat)
    g.bodyStamp = (f) => this.stampBodies(f);
    this.offs.push(() => (g.bodyStamp = null));
    // wall medkit stations are the host's, mirrored (the host heals: health is host-authoritative)
    const own = g.interactables;
    if (own) for (const it of own.items.filter((x) => x.kind === 'medkitWall')) own.remove(it);
    if (g.opts.mode !== 'sandbox' || !own) {
      this.ints = new Interactables(g.scene, g.world.parts);
      (g as { interactables: Interactables | null }).interactables = this.ints;
    } else this.ints = own;
    // (free roam mirrors only the host's wall medkits)
    if (g.opts.mode === 'sandbox') this.mirrorOnly = 'medkitWall';
    // (coop-fix, bug 2) the placeholder is the mirror's value: the first snapshot replaces it, an empty host
    // objective (course mode sets none) included. (hud-guidance B3, HG9) It shows on the net-status line; the objective
    // line holds only the host's objective, so the client's own free roam line goes until the first snapshot.
    g.hud.setObjective('');
    this.showLine(this.obj);
    // (coop-fix, bug 1) a hidden client page keeps simulating and sending its states
    this.offs.push(keepSimInBackground(g));
    // (marlow-polish) our own round off a bulletproof camera (Sector Ops, Marlow Yard): the host's ricochet sparks and
    // impact sound on our screen too (local only; the mirror's CtDevices is read per shot, the course one comes later)
    const prevRay = g.weapons.onRay;
    g.weapons.onRay = (a, b) => {
      prevRay?.(a, b);
      g.ctDev?.ricochetRay(a, b);
    };
    this.offs.push(() => (g.weapons.onRay = null));
  }

  private get renderTime(): number {
    return this.clock.now(performance.now() / 1000) - INTERP_DELAY;
  }

  private receive(msg: Msg): void {
    if (this.ended) return;
    switch (msg.t) {
      case 'snap':
        this.onSnap(msg);
        break;
      case 'ev':
        for (const e of msg.events) this.onEvent(e);
        break;
      case 'course':
        applyCourseWire(this.g, msg);
        break;
      case 'sector':
        this.onSector(msg);
        break;
      case 'lamps':
        this.lamps?.apply(this.g.world.level.lights, msg, this.lampSparks);
        break;
      case 'end':
        this.onEndMsg(msg.stats);
        break;
      // (3.2.0 phase 5) team moves the host started / refused / ended for this player
      case 'tstart':
        if (msg.a === this.s.selfId || msg.b === this.s.selfId) this.g.team.begin(msg, this.s.selfId);
        break;
      case 'tdeny':
        if (msg.a === this.s.selfId) this.g.team.denied(msg.reason);
        break;
      // (locomotion step 10, A5) this player's committed move started at host time t0 / refused / interrupted
      case 'cstart':
        if (msg.a !== this.s.selfId) break;
        if (msg.kind === 'strike') this.g.strike.accepted(msg.id, this.clock.now(performance.now() / 1000) - msg.t0);
        break;
      case 'cdeny':
        if (msg.a !== this.s.selfId) break;
        if (msg.kind === 'strike') this.g.strike.denied(msg.id, msg.reason);
        break;
      case 'tend':
        if (msg.a === this.s.selfId || msg.b === this.s.selfId) this.g.team.ended(msg.k);
        break;
    }
  }

  /** (3.2.0 phase 5) Team-mates for team moves (co-op: every other player; TDM: the same side). */
  teamRequest(kind: TeamKind, partner: string, target: number, ss: number, gy: number, lx?: number, lz?: number): void {
    this.s.toHost((kind === 'throw' || kind === 'hang' || kind === 'rope') && lx !== undefined && lz !== undefined ? { t: 'tmove', kind, partner, target, s: ss, gy, lx, lz } : { t: 'tmove', kind, partner, target, s: ss, gy });
  }

  /** (locomotion step 10, A5) Ask the host for a committed move. */
  commitRequest(kind: CKind, id: number, target: string): void {
    this.s.toHost({ t: 'cmove', kind, id, target });
  }

  /** (B5) End the hang-down: `target` 1 = drop, 0 = pull up. */
  teamHangEnd(k: 'pull' | 'drop'): void {
    this.s.toHost({ t: 'tmove', kind: 'hangEnd', partner: '', target: k === 'drop' ? 1 : 0, s: 0, gy: 0 });
  }

  teamEnd(): void {
    this.s.toHost({ t: 'tmove', kind: 'end', partner: '', target: -1, s: 0, gy: 0 });
  }

  /** (step 11, D8) The other players with their back to segment `seg` (metres along it), from their MoveStates. */
  wallOthers(seg: number, out: Float64Array): number {
    let n = 0;
    for (const a of this.avatars.values()) {
      const mv = a.buf.latest()?.mv;
      if (n < out.length && !a.dead && mv?.m === 'wall' && mv.a === seg) out[n++] = mv.s;
    }
    return n;
  }

  private mateOut: TeamMate[] = [];
  teamMates(): readonly TeamMate[] {
    const out = this.mateOut;
    out.length = 0;
    for (const [id, a] of this.avatars) {
      if (a.dead) continue;
      out.push({ id, pos: a.pos, yaw: a.yaw, mode: a.mode, anchor: a.anchor, s: a.s, sub: a.sub });
    }
    return out;
  }

  partnerBodies(out: SeenBody[], from: number): number {
    let n = 0;
    for (const a of this.avatars.values()) {
      if (a.dead) continue;
      const k = from + n++;
      const b = out[k] ?? (out[k] = newSeenBody());
      b.crouched = (a.flags & PF.crouch) !== 0;
      b.speed = a.moveSpeed;
      b.head.set(a.pos.x, remoteHeadY(a.pos.y, b.crouched), a.pos.z);
    }
    return n;
  }

  private avatar(st: PlayerState): RemoteAvatar | null {
    let a = this.avatars.get(st.id);
    if (!a) {
      const info = this.s.players.get(st.id);
      if (!info) return null;
      const g = this.g;
      a = new RemoteAvatar(g.world, g.vfx, g.ballistics, info);
      a.onFire = (cls, at, gun, quiet) => g.events.emit('remoteShot', { cls, x: at.x, y: at.y, z: at.z, gun, quiet });
      this.avatars.set(st.id, a);
      setPlayerGlow(a.figure, [...this.s.players.values()], st.id);
      // course mode (D38): the partner can be shot (the host decides the damage, co-op rules)
      if (g.opts.mode === 'course') {
        const t = new PartnerTarget(g.scene, g.registry, st.id, a);
        t.onShot = (h) => this.sendShot(st.id, h);
        this.targets.set(st.id, t);
        // a partner's hit boxes take bullets only: its body is the blocker below (the same on the host)
        t.setSolid(false);
      }
      this.blockers.push({ id: st.id, a, b: new PartnerBlocker(g.scene, st.id) });
    }
    return a;
  }

  /** (coop-rejoin) Our player slot: 1 + our place among the joiners in the host's lobby order (the host is slot 0). */
  private slot(): number {
    let i = 1;
    for (const p of this.s.players.values()) {
      if (p.host) continue;
      if (p.id === this.s.selfId) return i;
      i++;
    }
    return 1;
  }

  /** (coop-rejoin, walk item 4) Our start: our slot of the start area, clear of the host's slot 0 point. */
  private placeStart(): void {
    const g = this.g;
    const pts = startSlotPoints(g);
    const base = pts[0];
    if (!base) return;
    const out: SlotPoint = { x: 0, y: 0, z: 0, yaw: 0 };
    if (placeSlot(g, pts, this.slot(), [base], out) === 'none') return;
    g.player.controller.teleport(new Vector3(out.x, out.y, out.z), out.yaw);
    g.player.cam.yaw = out.yaw;
  }

  /** (G135) Every body's goggle colour from its player slot: the partner beacon. */
  private recolour(): void {
    const ps = [...this.s.players.values()];
    setPlayerGlow(this.g.player.figure, ps, this.s.selfId);
    for (const [id, a] of this.avatars) setPlayerGlow(a.figure, ps, id);
  }

  private dropAvatar(id: string): void {
    // (coop-carry) a partner gone while carrying: the host drops it where he stood (the mirror follows); the view goes
    const gone = this.avatars.get(id);
    for (const [eid, v] of this.views) {
      if (v.avatar !== gone) continue;
      v.drop(this.canRagdoll());
      this.views.delete(eid);
    }
    this.avatars.get(id)?.dispose();
    this.avatars.delete(id);
    this.targets.get(id)?.dispose();
    this.targets.delete(id);
    const i = this.blockers.findIndex((e) => e.id === id);
    if (i >= 0) {
      this.blockers[i]!.b.dispose();
      this.blockers.splice(i, 1);
    }
  }

  private onSnap(m: Extract<Msg, { t: 'snap' }>): void {
    const g = this.g;
    this.clock.observe(m.time, performance.now() / 1000);
    const seen = new Set<string>();
    for (const p of m.players) {
      if (p.id === this.s.selfId) {
        this.applySelf(p);
        continue;
      }
      seen.add(p.id);
      // (step 11 r3) a wall segment outside this level: the copy poses as ground, never from a stale face
      dropBadWallMove(p, g.world.level.coverSegments.length);
      // (optic-coop) an optic gap this level does not have: no kneel spot or cable from it
      dropBadOpticMove(p, g.world.level.opticPoints.length);
      this.avatar(p)?.buf.push(m.time, p);
    }
    for (const id of [...this.avatars.keys()]) if (!seen.has(id)) this.dropAvatar(id);
    const live = new Set<string>();
    for (const e of m.enemies) {
      live.add(e.id);
      let p = this.puppets.get(e.id);
      if (!p) {
        const np = new EnemyPuppet(g.scene, g.world, g.registry, e.id, e.k);
        np.onShot = (h) => this.sendShot(np.id, h);
        // (guard-ai S9) our own deflect shown at once; his helmet falling when the host's bit clears
        np.onDeflect = () => this.deflects.predict(this.time);
        np.onDropHelmet = (x, y, z, top, dx, dz, hex, w, h, d) => this.dropHelmet(x, y, z, top, dx, dz, hex, w, h, d);
        // (PR 3) the lines the training guard says: the course slot he appeared at (both sides load the same map); whether
        // he still has intel is the host's `in` flag (stealth-pays client intel, below)
        np.spawnInfo = infoAtSpawn(g.world.layout.course?.squads, e.x, e.z);
        // the kind of our own takedown (its 'start' event) goes with the result: the host ticks the course verb (A23)
        np.onTakedown = (ph, lethal) => this.s.toHost(ph === 'done' && this.tdKind ? { t: 'td', target: np.id, ph, lethal, kind: this.tdKind } : { t: 'td', target: np.id, ph, lethal });
        this.puppets.set(e.id, np);
        p = np;
      }
      p.stale = 0;
      p.setIntel(e.in === 1);
      p.buf.push(m.time, e);
    }
    // enemies the host no longer reports (despawned without a kill event)
    for (const [id, p] of this.puppets) {
      if (!live.has(id) && !p.dead && (p.stale += 1 / 15) > 0.5) {
        // (course-restart-hold) our takedown or grab on him ends before his rig goes
        if (g.takedown.active?.e === p) g.takedown.abort();
        p.dispose();
        this.puppets.delete(id);
      }
    }
    this.puppetList = [...this.puppets.values()];
    g.pickups?.setMask(m.pk);
    if (m.items) {
      this.syncItems(m.items);
      this.deskSync();
      this.carryMirror(m.items);
    }
    if (m.doors) this.syncDoors(m.doors, m.dcr ?? []);
    // (optic-coop, CHECK-M B1) the host's open trap panels (a gap this level lacks is skipped; a trap never closes)
    if (m.trp) applyOpenTraps(g.world.level.opticPoints, m.trp, g.world.breakables);
    if (m.bodies) {
      // carried off, hidden or revived on the host (snaps and events arrive in order, so a kept body is listed)
      // (coop-carry) a carried body is not in `bodies` (the host lists lying ones): the carry mirror owns it
      for (const id of [...this.kept.keys()]) if (!m.bodies.includes(id) && !this.carriers.has(id)) this.dropBody(id);
    }
    this.gotSnap = true;
    this.sinceSnap = 0;
    const obj = objectiveOnSnap(this.obj, m.obj);
    if (obj !== null) this.showLine(obj);
    if (m.info !== this.info) {
      this.info = m.info;
      g.hud.setModeInfo(infoToHtml(m.info));
    }
  }

  /** Mirror the host's usable things: create / move / enable; gone from the list = removed. */
  /** (step 15) Sandbox: mirror only this item kind into the client's own interactables. */
  private mirrorOnly: NetItem['k'] | null = null;

  /**
   * (sector-redesign E6, EW10) Sector Ops: each security desk's mode (looped, off) read back from its mirrored console
   * label (`deskModeOf`) onto our cameras, from our own map data's desk list (no wire change). Per snapshot, not per frame.
   */
  private deskSync(): void {
    const ct = this.sec;
    const desks = this.g.world.layout.security?.desks;
    if (!ct || !desks) return;
    for (let i = 0; i < desks.length; i++) {
      const it = this.items.get(deskItemId(i));
      ct.setDesk(desks[i]!.cameras, it ? deskModeOf(it.label) : DESK_NONE);
    }
  }

  /** (E9-crate, A105) The host restarted the section: every crate usable again here. */
  private clearCrates(): void {
    this.crateSpent.clear();
    for (const it of this.items.values()) {
      if (it.kind !== 'crate') continue;
      it.spent = false;
      it.progress = 0;
      if (it.enabled) this.ints?.setIndicator(it, KIND_COLOR.crate);
    }
  }

  private syncItems(list: NetItem[]): void {
    const ints = this.ints;
    if (!ints) return;
    const keep = new Set<string>();
    for (const n of list) {
      if (this.mirrorOnly && n.k !== this.mirrorOnly) continue;
      keep.add(n.id);
      let it = this.items.get(n.id);
      if (!it) {
        it = ints.add(n.id, n.k, new Vector3(n.x, n.y, n.z), n.label, n.hold, n.yaw);
        it.reach = n.reach;
        const id = n.id;
        it.onUse = () => this.s.toHost({ t: 'use', id });
        // (E9-crate, A103) at the loadout the use is not sent (the host does not hold our ammo)
        if (n.k === 'crate') {
          const crate = it;
          crate.onUse = () => {
            if (this.g.weapons.atLoadout()) {
              this.g.hud.feedItem('Ammo full');
              crate.progress = 0;
              return;
            }
            this.s.toHost({ t: 'use', id });
            // (E8/E9 check P1) a held button does not re-send `use` every frame until the `crate` event lands
            crate.progress = 0;
          };
        }
        // (sector-fixes-r RT) a team door's "Unbolt" is offered on its side only: the side from this client's own map
        // data (no wire change); the host checks the side again on the `use`
        const bolt = boltById(this.g.world.map.sectors, id);
        if (bolt) {
          it.side = bolt.bolt.side;
          // (sector-fixes-r2) the same span and depth as the host's item (inBoltReach)
          it.sideHalf = boltHalfSpan(bolt.bolt);
          it.sideDepth = BOLT_DEPTH;
        }
        // (30, Q12) a noisy hold: our own hold pulses it to the host, and our noise meter reads it as the host's does
        if (n.hn && n.hold > 0) {
          it.holdNoise = n.hn;
          this.holdPulses.add(it);
        }
        this.items.set(n.id, it);
      }
      it.pos.set(n.x, n.y, n.z);
      it.node.position.set(n.x, n.y, n.z);
      it.label = n.label;
      if (n.k === 'medkitWall') it.done = !n.on;
      // your own revive point is for the others
      // (coop-carry fix round) a body we have no lying body for (never saw him fall) offers no pick up here
      if (n.k === 'body' && n.e) this.bodyItems.set(n.e, { it, on: n.on });
      const on = n.k === 'body' ? clientBodyPrompt(n.on, !!n.e && this.kept.get(n.e)?.present === true) : n.on && n.id !== `revive-${this.s.selfId}`;
      const flip = it.enabled !== on;
      if (flip) ints.setEnabled(it, on);
      if (!on) it.progress = 0;
      // (E9-crate, A104) used by this player: no prompt here, the strip dark (the others still see it lit)
      if (n.k === 'crate') {
        const sp = this.crateSpent.has(n.id);
        if ((it.spent === true) !== sp) {
          it.spent = sp;
          if (on) ints.setIndicator(it, sp ? CRATE_DARK : KIND_COLOR.crate);
        } else if (flip && on && sp) ints.setIndicator(it, CRATE_DARK);
      }
    }
    for (const [eid, b] of this.bodyItems) if (!keep.has(b.it.id)) this.bodyItems.delete(eid);
    for (const [id, it] of this.items) {
      if (keep.has(id)) continue;
      this.holdPulses.remove(it);
      ints.remove(it);
      this.items.delete(id);
    }
    // (B8, G126) the downed client's countdown: the host writes the seconds left into its revive point's label
    const own = this.items.get(`revive-${this.s.selfId}`);
    const sec = own ? /\((\d+)\)$/.exec(own.label)?.[1] : undefined;
    if (own) this.g.hud.setDownTimer(sec ? `DOWN - revive in ${sec} s` : 'DOWN');
    else if (!this.g.player.alive && this.g.opts.mode === 'course') this.g.hud.setDownTimer('OUT - wait for the checkpoint');
    else this.g.hud.setDownTimer(null);
  }

  private syncDoors(open: number[], cracked: readonly number[]): void {
    const doors = this.g.world.doors;
    const pred = (this.crackPred ??= new CrackPrediction(doors.list.length));
    for (const d of doors.list) {
      doors.setOpen(d, open.includes(d.index));
      // (step 13) the host's cracks (door peek); a local prediction holds for about a round trip (fix r1)
      if (d.target === 0) doors.crack(d, pred.resolve(d.index, cracked.includes(d.index), this.time));
    }
  }

  /** (step 13 fix r1) The local crack predictions against the snapshots' `dcr`. */
  private crackPred: CrackPrediction | null = null;

  /** (locomotion step 13) Ask the host to crack door `i` (or close its crack); predicted locally by the caller. */
  doorCrack(i: number, on: boolean): void {
    (this.crackPred ??= new CrackPrediction(this.g.world.doors.list.length)).predict(i, on, this.time);
    this.s.toHost({ t: 'door', i, crack: on });
  }

  /** (optic-coop, CHECK-M B1) OPEN TRAP at optic gap `g`: the host checks and opens it; it opens here from the
   *  snapshots' `trp` (no prediction: the panel is collision, so the host's world decides). */
  panelOpen(g: number): void {
    this.s.toHost({ t: 'panel', g });
  }

  /** Host-authoritative health for the local player. */
  /** The host says guards in combat know this operator is there. */
  private selfSpotted = false;

  spotted(): boolean {
    return this.selfSpotted;
  }

  /** (LR16-5) The shared sim clock: the host's time from the snapshots (`ClockSync`; before the first one the local
   *  clock). Moving lights run on it. (lr16pol E) The client trails the host by its one-way latency, as every host
   *  state; snapping to the step (`tickFlicker`, `tickSway`) absorbs jitter only. */
  simTime(): number {
    return this.clock.now(performance.now() / 1000);
  }

  /** (coop-walk-fixes P6) A partner (the host or another client) holds guard `v` as a hostage: his puppet is posed from
   *  that partner's `grab` MoveState (`remoteHeld`). The team takedown on him is on offer here. */
  partnerHolds(v: TakedownVictim): boolean {
    const p = this.puppets.get(v.id);
    return !!p && p === v && p.partnerHeld;
  }

  /** (P6) Our team takedown on a partner's hostage: the host checks and applies it (`td`, kind `assist`); the guard goes
   *  down when the host's kill event comes back. */
  assistTakedown(v: TakedownVictim, ph: 'start' | 'done' | 'abort', lethal: boolean): void {
    this.s.toHost({ t: 'td', target: v.id, ph, lethal, kind: 'assist' });
  }

  /** (joint-interrogation, G148) Our bluff on a partner's hostage (the BLUFF row): the host checks and stores it, and its
   *  `feed` line comes back; a denial (`tdDenied` on a partner-held puppet) changes nothing here (A6). */
  jointBluff(v: TakedownVictim): void {
    this.s.toHost({ t: 'td', target: v.id, ph: 'start', lethal: false, kind: 'bluff' });
  }

  private applySelf(p: PlayerState): void {
    this.selfSpotted = (p.f & PF.spotted) !== 0;
    const g = this.g;
    // (step 09, D8) the host forced holstered (busy hands, downed): only when its own rule on this client's current
    // MoveState agrees, so an echo that has not caught up with a draw yet (latency) never cancels it (fix 2)
    if (p.mv && clientForcedHolster(p.mv.dw, g.weapons.drawPhase, this.mvNow, p.hp <= 0)) g.weapons.forceHolster();
    const h = g.target.health;
    h.hp = p.hp;
    if (p.hp <= 0 && g.player.alive) {
      g.player.alive = false;
      g.hud.banner('DOWN', g.opts.mode === 'sandbox' ? 'Respawning…' : 'A team-mate can revive you', 2500);
    }
  }

  /** (slice L) Our round's segment: the first lamp along it that can be shot goes to the host as a `shot` at `lt-<id>`
   *  (the host checks it and shoots it out; we see it dark from its next `lamps`, or (coop-real F1b) its next `course`
   *  `lights.dead` in Course mode). Nothing is shot out here. */
  private lampRay(a: Vector3, b: Vector3): void {
    const reg = this.g.world.level.lights;
    const id = lightOnRay(reg, a.x, a.y, a.z, b.x, b.y, b.z);
    const l = id >= 0 ? reg.lights[id] : undefined;
    if (!l || !l.destructible || l.destroyed) return;
    // (polish2) the host's mount-reach probe (`StealthSystems.shotRay`, `onLampShot`): never ask for a lamp it refuses
    const p = this.reachA;
    const h = lampReachProbe(reg, id, a.x, a.y, a.z, b.x, b.y, b.z, p);
    if (h > 0 && !this.g.ballistics.clear(p, this.reachB.set(p.x, p.y + h, p.z), G.STATIC)) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = hyp3(dx, dy, dz) || 1;
    this.s.toHost({ t: 'shot', w: this.g.weapons.current.def.id, ox: a.x, oy: a.y, oz: a.z, dx: dx / len, dy: dy / len, dz: dz / len, target: LAMP_TARGET + id, part: 'body', rt: Math.max(0, this.renderTime), dist: len, dmg: 0 });
  }

  /** (39, LR16-5b) Per pendant: when we last asked the host to kick it (this page's clock; `SWAY.minGap` apart). */
  private swaySent: Float64Array | null = null;

  /** (39, LR16-5b) Our round's segment: each pendant it would kick (`SwaySet.shotKicks`, where it hangs here) goes to the
   *  host as a `shot` at `sw-<id>`; the host re-tests the claimed segment and sends the kick to everyone. */
  private swayRay(a: Vector3, b: Vector3): void {
    const sway = this.g.world.level.lights.sway;
    const sent = this.swaySent;
    if (!sway || !sent) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = hyp3(dx, dy, dz);
    if (len < 1e-3) return;
    for (let k = 0; k < sway.n; k++) {
      if (this.time - sent[k]! < SWAY.minGap || !sway.shotKicks(k, a.x, a.y, a.z, b.x, b.y, b.z)) continue;
      sent[k] = this.time;
      this.s.toHost({ t: 'shot', w: this.g.weapons.current.def.id, ox: a.x, oy: a.y, oz: a.z, dx: dx / len, dy: dy / len, dz: dz / len, target: SWAY_TARGET + sway.ids[k]!, part: 'body', rt: Math.max(0, this.renderTime), dist: len, dmg: 0 });
    }
  }

  private sendShot(target: string, h: HitInfo): void {
    const o = h.sourcePos;
    const dx = h.point.x - o.x;
    const dy = h.point.y - o.y;
    const dz = h.point.z - o.z;
    const len = hyp3(dx, dy, dz) || 1;
    this.s.toHost({
      t: 'shot',
      w: h.weapon ?? this.g.weapons.current.def.id,
      ox: o.x,
      oy: o.y,
      oz: o.z,
      dx: dx / len,
      dy: dy / len,
      dz: dz / len,
      target,
      part: h.part,
      rt: Math.max(0, this.renderTime),
      dist: len,
      dmg: Math.min(1000, h.amount),
    });
  }

  private name(id: string): string {
    return this.s.players.get(id)?.name ?? 'Operator';
  }

  private onEvent(e: NetEvent): void {
    const g = this.g;
    const me = this.s.selfId;
    switch (e.e) {
      case 'tracer': {
        const a = new Vector3(e.ax, e.ay, e.az);
        g.vfx.tracer(a, new Vector3(e.bx, e.by, e.bz), e.c, 0.02);
        g.vfx.muzzleFlash(a, 0.2);
        g.events.emit('remoteShot', { cls: 'rifle', x: a.x, y: a.y, z: a.z });
        // nearest puppet gets the firing pose
        let best: EnemyPuppet | null = null;
        let bd = 2.5;
        for (const p of this.puppets.values()) {
          const d = Vector3.Distance(p.pos, a);
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
        best?.fired();
        break;
      }
      case 'boom': {
        const pos = new Vector3(e.x, e.y, e.z);
        const lb = this.lastBlast;
        if (lb && this.time - lb.t < 1.5 && Vector3.Distance(lb.p, pos) < 2) break; // already shown locally
        g.vfx.explosion(pos, e.r * 0.5);
        g.explosions.onExplode?.(pos, e.r);
        break;
      }
      case 'kill': {
        const p = this.puppets.get(e.enemy);
        if (p) {
          if (g.takedown.active?.e === p) g.takedown.abort();
          const rig = p.die();
          if (rig) {
            // the oldest kept body makes room (as the host's BODY.max does)
            if (this.kept.size >= BODY.max) {
              for (const [id, b] of this.kept) {
                if (b.carried) continue;
                this.dropBody(id);
                break;
              }
            }
            // (rig-pose-fix S5, P13) the host's Body lies at his sim feet and yaw at death plus the settle along the fall
            // (`bodyLie.ts`). The wire carries no body position, so the same lie from the puppet's last host state, the
            // fall away from his killer (the host's is the killing round's or blow's way); the ragdoll eases onto it
            const s = p.buf.latest();
            const fx = s ? s.x : p.pos.x;
            const fy = s ? s.y : p.pos.y;
            const fz = s ? s.z : p.pos.z;
            const src = e.by === me ? g.player.position : (this.avatars.get(e.by)?.pos ?? g.player.position);
            const away = new Vector3(fx - src.x, 0, fz - src.z);
            const lie = deathLieOn(this.deathLie, g.ballistics, fx, fy, fz, s ? s.yaw : p.yaw, away.x, away.z, rig.p);
            if (away.lengthSquared() > 1e-6) away.normalize();
            away.scaleInPlace(12).addInPlaceFromFloats(0, 3, 0);
            // (coop-carry) a `Body` as the host's: a ragdoll under the budget, else laid straight on the lie (was disposed:
            // nothing to carry here)
            const body = new Body(g.scene, g.world, p.def, false, rig, away, this.canRagdoll(), lie);
            body.enemyId = e.enemy;
            this.kept.set(e.enemy, body);
            this.keptAt.set(e.enemy, this.time);
            // (fix round) the host's item may have come first (the snapshot before this event): its prompt now
            this.bodyPrompt(e.enemy);
          } else this.dying.push(p);
          this.puppets.delete(e.enemy);
          this.puppetList = [...this.puppets.values()];
        }
        if (e.by === me) {
          g.hud.hitMarker('kill');
          g.app.sfx.hitMarker('kill');
          g.app.input.haptic('kill');
          g.hud.feedItem(`${p?.def.name ?? 'Hostile'} ${e.head ? 'headshot' : 'down'}`, 'kill');
        } else {
          g.hud.feedItem(`${this.name(e.by)}: ${p?.def.name ?? 'hostile'} ${e.head ? 'headshot' : 'down'}`);
        }
        break;
      }
      case 'tdDenied': {
        if (e.player !== me) break;
        const p = this.puppets.get(e.enemy);
        if (p && g.takedown.active?.e === p) g.takedown.abort();
        // (P6) a denied team takedown: the partner still holds him (his puppet stays posed from that hold)
        if (!p?.partnerHeld) p?.deny();
        break;
      }
      case 'banner':
        g.hud.banner(e.title, e.sub);
        // (sector-restart, M9) the host restarted the section: our side of the clean start (loadout, gadgets, music)
        if (e.title === SECTOR_RESTART_TITLE && g.opts.mode === 'sector') {
          g.checkpointReset();
          // (guard-ai S9) a clean start: the dropped helmets go, as the host's `clear`
          this.helmetDrops?.clear();
          // (E9-crate, A105) every crate usable again
          this.clearCrates();
        }
        // (marlow-final S10, M2) the same for a Marlow Yard set restart (our carried body let go, gadgets out gone)
        else if (e.title === COURSE_RESTART_TITLE && g.opts.mode === 'course') g.checkpointReset();
        break;
      case 'feed':
        // a radio line (subtitle), also kept in the feed: the host's interrogation intel arrives as these and the host
        // shows it in its feed (`revealIntel`); a bark alone left the client's feed without it
        g.hud.barks.say('lantern', e.text, true);
        g.hud.feedItem(e.text);
        // (hud-guidance B5, BRIEF A9) and in Field Terminal > Notes (the host's keypad radio lines ride `feed` too)
        g.notes.add(e.text);
        break;
      case 'pickup':
        if (e.player !== me) break;
        if (e.kind === 'ammo') g.weapons.addAmmo(0.5);
        g.events.emit('pickup', { kind: e.kind });
        g.hud.feedItem('Ammo refilled');
        break;
      case 'crate': {
        // (E9-crate) we used a crate: top up on the use itself (`fill`), only hide the prompt on a rejoin re-send
        const r = applyCrateEvent(this.crateSpent, me, e);
        if (!r) break;
        if (r === 'fill') {
          g.weapons.crateTopUp();
          g.events.emit('pickup', { kind: 'ammo' });
          g.hud.feedItem('Weapons refilled');
        }
        const it = this.items.get(e.id);
        if (it) {
          it.spent = true;
          it.progress = 0;
          if (it.enabled) this.ints?.setIndicator(it, CRATE_DARK);
        }
        break;
      }
      case 'hurt': {
        if (e.player !== me) break;
        const pp = g.player.position;
        g.hud.damageFrom(Math.atan2(e.x - pp.x, e.z - pp.z) - g.player.cam.yaw);
        g.player.cam.shake(e.boom ? 0.5 : 0.12);
        g.app.input.haptic('hurt');
        g.app.sfx.playerHurt();
        break;
      }
      case 'back':
        // (marlow-jammer fix round 1) the camera hallway sent us back to the entry lobby, facing the hallway
        if (e.player !== me) break;
        g.team.end(true);
        g.player.controller.override = null;
        g.traversal.reset();
        g.player.controller.teleport(new Vector3(e.x, e.y, e.z), e.yaw);
        g.player.cam.yaw = e.yaw;
        break;
      case 'revive':
        if (e.player !== me) break;
        g.player.controller.override = null;
        g.traversal.reset();
        // (strike-pops, n4d polish 1) a bay or section restart brings an alive partner back too: no strike or kill
        // follow-through carried onto the restarted player (the host's own respawn does the same)
        g.strike.reset();
        g.player.controller.teleport(new Vector3(e.x, e.y, e.z), g.player.cam.yaw);
        g.target.revive();
        g.hud.setDownTimer(null);
        g.hud.banner('BACK IN', '', 1500);
        break;
      case 'restore':
        // (marlow-bays R2) rejoined: back where the host held us (health, down state and the team's state come as usual)
        if (e.player !== me) break;
        g.player.controller.override = null;
        g.traversal.reset();
        g.player.controller.teleport(new Vector3(e.x, e.y, e.z), e.yaw);
        g.player.cam.yaw = e.yaw;
        break;
      case 'hitConfirm':
        // (guard-ai S9, protocol 38) hits and kills are shown from our puppets at once (kills by `kill`); a deflect we
        // did not predict (his gear bit not here yet) shows as the host's own deflect does (marker and ping)
        if (e.player !== me || e.kind !== 'deflect') break;
        this.deflectConfirms++;
        if (this.deflects.confirm(this.time)) {
          g.hud.hitMarker('deflect');
          g.app.sfx.hitMarker('deflect');
        }
        break;
      case 'bark': {
        // (guard-ai S9, protocol 38) the host's guard lines, as the host shows them (over the speaker, the subtitle,
        // the radio chirp)
        const text = e.b === BARK_CAM || e.b === BARK_TEXT;
        const line = text ? (e.t ?? null) : barkLine(e.b, e.n, e.u);
        if (!line) break;
        const ev = BARK_EVENTS[e.b];
        const radio = text ? e.r : ev !== undefined && RADIO_BARKS.has(ev);
        g.hud.barks.say(e.b === BARK_CAM ? `cam:${e.id}` : e.id, line, radio);
        g.events.emit('bark', { radio });
        this.barksShown++;
        break;
      }
      case 'gadget':
        if (e.player !== me) g.gadgets.remoteEffect(e.kind, new Vector3(e.x, e.y, e.z));
        break;
      case 'sway':
        // (39, LR16-5b) the host's pendant kick, verbatim: both pages then swing it alike on the shared clock
        g.world.level.lights.swayImpulse(e.id, e.t, e.a, e.h);
        break;
      case 'ping':
        if (e.player !== me) g.addPing(e.player, e.x, e.y, e.z, e.target, this.s.players.get(e.player)?.tag.color ?? '#4fdc7c');
        break;
    }
  }

  /**
   * Sector Ops (A9, step 3): the host's devices for the live section only (others off), its door locks, its shot-out
   * cameras.
   */
  private onSector(msg: Extract<Msg, { t: 'sector' }>): void {
    const ct = this.sec;
    // (section-rating fix) the rating first: a top-up in the same message as a new `ls` goes into that checkpoint loadout
    if (!this.sawSector) {
      // (integration) a late join / rejoin: a rating already on the wire was shown and granted before we came; it
      // only goes to the results list (no card, no top-up)
      this.sawSector = true;
      // (marlow-polish) every section rated before the last one, from `rh` (results lines only)
      if (msg.rh) for (const v of ratingViewsFromRh(msg.rh, msg.rt?.sec ?? -1, this.g.world.map.sectors ?? [])) putRating(this.g.sectionRatings, v);
      if (msg.rt) {
        this.ratedSec = msg.rt.sec;
        const v = ratingViewFromWire(msg.rt, this.g.world.map.sectors ?? []);
        if (v) {
          this.rating = v;
          putRating(this.g.sectionRatings, v);
        }
      }
    } else if (msg.rt && msg.rt.sec !== this.ratedSec) this.takeRating(msg.rt);
    // (sector-restart, M9) a later section went live (the connector loaded it): our loadout now is the one a restart of
    // it gives back (the host records its own as the section begins)
    if (msg.ls !== undefined && msg.ls > this.kitSection) {
      this.kitSection = msg.ls;
      this.g.weapons.markCheckpoint();
    }
    // (section-bake, SB10) the host's live section bakes first here too (a late join or rejoin past section 1)
    if (msg.ls !== undefined && msg.ls >= 0) this.g.world.lightBake?.sections?.setLive(msg.ls);
    if (ct) {
      if (msg.ls !== undefined && msg.ls !== ct.liveSection) ct.setLive(msg.ls);
      if (msg.ls !== undefined) this.list?.onLive(msg.ls);
      if (msg.dn) ct.applyDestroyed(msg.dn);
      if (msg.sec) ct.apply(msg.sec);
    }
    if (msg.lk) {
      const doors = this.g.world.doors;
      for (const d of doors.list) {
        const on = msg.lk.includes(d.index);
        if (d.anchor.locked !== on) doors.setLocked(d, on);
      }
    }
    // the HUD line (section, alarm, syringes) comes with the snapshot's `info` (the host's mode info, mirrored)
  }

  /** (section-rating S3) A new host rating: kept for the HUD, told to `onRating`, mirrored on `window.__sectionRating`. */
  private takeRating(rt: SectorRatingWire): void {
    const v = ratingViewFromWire(rt, this.g.world.map.sectors ?? []);
    this.ratedSec = rt.sec;
    if (!v) return;
    this.rating = v;
    this.ratingSeq++;
    // (integration) every rating for the op-end results lines
    putRating(this.g.sectionRatings, v);
    // the gadget part of the grant on our own kit (the host tops up only its own player): noisemaker first, then gas,
    // each up to its starting carry, as the host's grant does; once per rating (a new `sec`). The extraction's rating
    // carries no grant (the host zeroes it).
    let n = rt.gadget;
    let name: string | undefined;
    let ids = 0;
    let added = 0;
    for (const id of GRANT_GADGETS) {
      if (n <= 0) break;
      const k = this.g.gadgets.topUp(id, n, GADGETS[id].carry);
      if (k <= 0) continue;
      n -= k;
      added += k;
      ids++;
      name = GADGETS[id].name.toLowerCase();
    }
    if (ids !== 1) name = undefined;
    // (section-rating fix) the card names only what lands here: the charges actually added, a medkit only when the
    // host's heal would heal us now (the view kept for the results and the hook is what was earned)
    const c = this.cardView;
    c.sectionId = v.sectionId;
    c.title = v.title;
    c.marks = v.marks;
    c.synced = v.synced;
    const g = this.g;
    const h = g.target.health;
    c.grant.gadget = added;
    c.grant.syringe = v.grant.syringe;
    c.grant.medkit = stationHeal(h.hp, h.maxHp, g.player.alive, g.opts.difficulty ?? 'normal') !== null ? v.grant.medkit : 0;
    c.grant.alarmStep = v.grant.alarmStep;
    // the test hook in the host's shape (SectionRatingHook): the client counts nothing and gives nothing itself
    const w = window as unknown as { __sectionRating?: { stats: unknown; last: RatingView | null; lastGrant: unknown } };
    if (w.__sectionRating) w.__sectionRating.last = v;
    else w.__sectionRating = { stats: null, last: v, lastGrant: null };
    // the op's last section (rated at the extraction) shows on the results screen, not the card
    const defs = this.g.world.map.sectors ?? [];
    if (rt.sec < defs.length - 1) this.onRating?.(c, name);
  }

  private onEndMsg(raw: EndStats): void {
    this.ended = true;
    const end = clampEnd(raw, this.time);
    // (sector-ops step 3, M7) a completed op fills this player's star too (no best time: the host keeps the clock)
    if (this.g.opts.mode === 'sector' && end.won) void markCompleted(this.g.world.map.id, this.g.opts.difficulty ?? 'normal', 0);
    Object.assign(this.g.stats, coopSessionStats(this.g.stats, end, this.s.selfId));
    if (this.inCourse) this.g.stats.course = clientCourseSummary(this.g) ?? undefined;
    this.g.endSession(end.won, end.subtitle);
  }

  /**
   * (hud-guidance B3, HG9) Every write of the mirror's line, and the one host-objective write: a connection notice goes
   * to the net-status line (the objective keeps its text); a host objective clears the notice and goes to the objective
   * line (the HUD pops it up only on a real change, so a stall ending on the same objective shows nothing new).
   */
  private showLine(t: string): void {
    this.obj = t;
    // (hud-guidance B4) the host's objective also tells the field menu's list which row is current
    if (showMirrorLine(this.g.hud, t)) this.list?.onText(t);
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.sendT -= dt;
    // (coop-fix) snapshots stopped (a stalled or gone host): say so on the net-status line until the next one
    this.sinceSnap += dt;
    const stall = objectiveOnStall(this.obj, this.gotSnap, this.sinceSnap);
    if (stall !== null) this.showLine(stall);
    // the movement state: a new mode or sub-state (a ladder, a vault) goes out at once, not on the next tick
    const mv = localMoveState(this.g, this.mvNow);
    if (this.feed) {
      // drillDetect derives every verb; only the local-only ones go to the host (it derives the rest, C10)
      const out = this.feed.step();
      for (let i = 0; i < out.length; i++) {
        const v = out[i]!;
        if (isClientVerb(v)) this.ctick(v);
      }
    }
    // (Q12) our noisy hold's first moment and each pulse go to the host, whose guards hear them at the item
    if (this.holdPulses.size) this.holdPulses.step(this.sendPulse);
    const changed = moveChanged(this.mvSent, mv);
    if (this.sendT > 0 && !changed) return;
    this.sendT = 1 / SEND_HZ;
    Object.assign(this.mvSent, mv);
    this.mvSent.c = mv.c ? { ...mv.c } : undefined;
    const g = this.g;
    const p = g.player;
    const c = p.controller;
    // (afp AF6) the send clock (the host times the state by it) and the gait clock / CT stop (the partner's stride)
    const sentAt = sendClock(this.sentWall, this.sentSim, performance.now() / 1000, this.time);
    this.sentWall = sentAt;
    this.sentSim = this.time;
    const gw: { gph?: number; qs?: number; hs?: number; mo?: number; mt?: number; ax?: number; az?: number } = {};
    gaitWire(c.motion.phase, c.ct, c.stopEaseT, c.stopHold, c.holdSpeed, CT.stopEase, CT.stopBlend, gw);
    motionWire(c.override?.kinematic ? null : c.motion.state, c.motion.stateT, c.motion.ax, c.motion.az, gw);
    this.s.toHost({
      t: 'pstate',
      s: wirePlayerState({
        ...gw,
        t: sentAt,
        id: this.s.selfId,
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        yaw: c.yaw,
        pitch: p.cam.pitch,
        speed: c.speed,
        f: localFlags(g),
        w: g.weapons.current.def.id,
        hp: g.target.health.hp,
        sc: g.weapons.shotCount & 255,
        mv,
      }),
    });
  }

  /** (afp AF6) The last state's send clock and sim time (`sendClock`). */
  private sentWall = -Infinity;
  private sentSim = 0;

  /** The movement state this step and the last one sent (change detection). */
  private mvNow = emptyMoveState();
  private mvSent = emptyMoveState();

  frameUpdate(dt: number): void {
    if (this.inCourse) clientCourseFrame(this.g, dt);
    this.sec?.frame(dt);
    this.card?.update(dt);
    const t = this.renderTime;
    for (const a of this.avatars.values()) a.update(dt, t);
    // (G7 fix) the partner holding one of the host's guards: his puppet posed from the partner's MoveState (hostage,
    // the knockout's lowering, the interrogation), as the host poses him (no wire data)
    let held: EnemyPuppet | null = null;
    for (const a of this.avatars.values()) {
      if (!a.holdTid) continue;
      const p = this.puppets.get(a.holdTid);
      if (!p) continue;
      held = p;
      p.remoteHeld(a.holdPh, a.holdSub);
      break;
    }
    if (this.heldPuppet && this.heldPuppet !== held) this.heldPuppet.remoteHeld(-1, 0);
    this.heldPuppet = held;
    for (const tg of this.targets.values()) tg.sync();
    for (let i = 0; i < this.blockers.length; i++) {
      const e = this.blockers[i]!;
      e.b.sync(e.a.pos, (e.a.flags & PF.crouch) !== 0, !e.a.dead && !partnerPassable(e.a.mode));
    }
    for (const p of this.puppetList) p.update(dt, t);
    // (coop-torches) after the guards moved: their torches as the host's (placed from what is drawn)
    this.torches.update(this.puppetList);
    for (const p of this.dying) p.settle(dt);
    this.helmetDrops?.update(dt);
    for (const b of this.kept.values()) b.update(dt);
    // (coop-carry) a partner's carry: the hoist lands on his shoulder, his load eases in
    for (const v of this.views.values()) v.step(dt);
  }

  /** (coop-carry fix round) Body `eid`'s pick-up prompt from the host's lying state and our own body of him. */
  private bodyPrompt(eid: string): void {
    const m = this.bodyItems.get(eid);
    const ints = this.ints;
    if (!m || !ints) return;
    const on = clientBodyPrompt(m.on, this.kept.get(eid)?.present === true);
    if (m.it.enabled !== on) ints.setEnabled(m.it, on);
    if (!on) m.it.progress = 0;
  }

  /** (coop-carry) Bodies simulating as ragdolls are under the budget (as the host's `EnemyManager.canRagdoll`). */
  private canRagdoll(): boolean {
    let n = 0;
    for (const b of this.kept.values()) if (b.simulating) n++;
    return n < BUDGET.maxRagdolls;
  }

  /**
   * (coop-carry) The host's body items: who carries what. A new carrier starts the lift (ours: `ClientCarry.begin`; a
   * partner's: `CarryView` on his avatar); a carrier gone with the body still listed is the put down (ours: the host
   * dropped it, our own put down already ran); a carried body gone from the list was hidden.
   */
  private carryMirror(list: NetItem[]): void {
    const seen = this.mirrorSeen;
    seen.clear();
    for (const n of list) {
      if (n.k !== 'body' || !n.e) continue;
      const eid = n.e;
      seen.add(eid);
      const prev = this.carriers.get(eid) ?? '';
      const now = n.by ?? '';
      const ch = carryChange(prev, true, now);
      if (ch === 'none') continue;
      if (ch === 'drop' || ch === 'retake') {
        this.letGo(eid, prev);
        // (recheck) `syncItems` ran while our body was still carried: the prompt now that it lies
        this.bodyPrompt(eid);
      }
      if (now) this.carriers.set(eid, now);
      else this.carriers.delete(eid);
      if (ch === 'take' || ch === 'retake') this.takeUp(eid, now);
    }
    for (const [eid, prev] of this.carriers) {
      if (seen.has(eid)) continue;
      this.carriers.delete(eid);
      if (prev === this.s.selfId) this.carry.hostHide(eid);
      else {
        this.views.get(eid)?.hide();
        this.views.delete(eid);
      }
    }
  }

  private takeUp(eid: string, by: string): void {
    const b = this.kept.get(eid);
    const me = by === this.s.selfId;
    if (!b || !b.present) {
      // nothing lying here to lift (joined after he fell): ours goes back to the floor on the host
      if (me) this.s.toHost({ t: 'use', id: DROP_BODY_ID });
      return;
    }
    if (me) {
      this.carry.begin(b);
      return;
    }
    const a = this.avatars.get(by);
    if (a) this.views.set(eid, new CarryView(b, a));
  }

  private letGo(eid: string, by: string): void {
    if (by === this.s.selfId) {
      this.carry.hostDrop(eid);
      return;
    }
    const v = this.views.get(eid);
    if (!v) return;
    this.views.delete(eid);
    // (fix round) let go of before the hoist (a crouch): laid back where it lies, as on the carrier's page
    if (v.onShoulder) v.drop(this.canRagdoll());
    else v.letGo(this.canRagdoll());
  }

  /** (guard-ai S9) A puppet's helmet falls (the pool is built on the first drop, as the host's). */
  private dropHelmet(x: number, y: number, z: number, top: number, dx: number, dz: number, hex: string, w: number, h: number, d: number): void {
    const world = this.g.world;
    const drops = (this.helmetDrops ??= new HelmetDrops(world.parts, (m) => world.addShadowCaster(m)));
    drops.drop(x, y, z, top, dx, dz, hex, w, h, d);
  }

  /** (guard-ai S9) Where guard `who`'s line shows: over his puppet's head (false: not here or down). */
  barkAt(who: string, out: Vector3): boolean {
    const p = this.puppets.get(who);
    if (!p || p.dead) return false;
    out.set(p.pos.x, p.pos.y + (p.def.quadruped ? 1.0 : 2.15 * p.def.scale), p.pos.z);
    return true;
  }

  /** (LR16-6 fix) `GameState.bodyStamp`: mark the kept bodies' rigs as bodies this render frame with their age, so
   *  their body heat cools as the host cools its own (`paintHeat`). Render only, no allocation (`keptBodies.ts`). */
  stampBodies(f: number): void {
    stampKeptBodies(this.kept, this.keptAt, this.time, f);
  }

  private dropBody(id: string): void {
    const r = this.kept.get(id);
    if (!r) return;
    // (coop-carry) a body carried here goes with it (a restart, the oldest making room)
    this.carry.lost(id);
    this.views.get(id)?.clear();
    this.views.delete(id);
    this.carriers.delete(id);
    this.kept.delete(id);
    this.keptAt.delete(id);
    r.dispose();
  }

  onLocalDeath(): boolean {
    return true;
  }

  /** Course mode: a verb only this client sees (C10); the host rate-limits and ticks it. */
  private ctick(verb: ClientVerb): void {
    if (this.inCourse) this.s.toHost({ t: 'ctick', verb });
  }
  /** Course mode (CT prototype B3): the held jammer's target for the host. */
  sendJam(tgt: string, eye: { x: number; y: number; z: number }): void {
    if (!this.inCourse && !this.sec) return;
    // (jammer-fixes, 27) a claim carries the camera eye (cm), a release nothing (on change and the heartbeat only)
    if (tgt === '') this.s.toHost({ t: 'jam', tgt });
    else this.s.toHost({ t: 'jam', tgt, e: [Math.round(eye.x * 100) / 100, Math.round(eye.y * 100) / 100, Math.round(eye.z * 100) / 100] });
  }
  private get inCourse(): boolean {
    return this.g.opts.mode === 'course';
  }
  /** Course mode: the local drill feed (C10). */
  private feed: CourseFeed | null = null;
  /** Course mode: the kind of our last takedown (sent with its `td` result). */
  private tdKind = '';

  /** Own ping: shown at once, the host relays it. */

  ping(x: number, y: number, z: number, target: string): void {
    this.feed?.ping();
    const me = this.s.selfId;
    this.s.toHost({ t: 'ping', x, y, z, target });
    this.g.addPing(me, x, y, z, target, this.s.players.get(me)?.tag.color ?? '#4fdc7c');
  }

  shadows(b: BlobShadows): void {
    for (const a of this.avatars.values()) b.add(a.pos.x, a.pos.y, a.pos.z, 0.42);
    for (const p of this.puppetList) if (p.alive) b.add(p.pos.x, p.pos.y, p.pos.z, 0.4 * p.def.scale);
  }

  /** (hud-guidance B4, G343 / HG8) Field Terminal > Objectives in Sector Ops: the host's rows as this client mirrors
   *  them; null elsewhere or before the host's first section number (GameState then shows its own line). */
  objectiveLines(): ObjectiveLine[] | null {
    return this.list?.lines() ?? null;
  }

  dispose(): void {
    for (const o of this.offs) o();
    for (const id of [...this.avatars.keys()]) this.dropAvatar(id);
    for (const p of this.puppets.values()) p.dispose();
    for (const p of this.dying) p.dispose();
    this.carry.dispose();
    for (const v of this.views.values()) v.clear();
    this.views.clear();
    this.carriers.clear();
    for (const b of this.kept.values()) b.dispose();
    this.torches.clear();
    this.helmetDrops?.clear();
    this.puppets.clear();
    this.puppetList = [];
    this.dying.length = 0;
    this.kept.clear();
    this.keptAt.clear();
    this.holdPulses.clear();
    this.ints?.dispose();
    this.g.explosions.onLocalBlast = null;
    this.g.gadgets.onLocal = null;
  }
}

/** (coop-real F1b, S2) Does a client send its lamp rounds (`shot` at `lt-<id>`) to the host in this mode? Sector Ops and
 *  Course mode (the host's rule: `hostLampShots`). */
export function clientLampShots(mode: string | undefined): boolean {
  return mode === 'sector' || mode === 'course';
}
