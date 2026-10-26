import { Vector3 } from '../core/babylon';
import { flags } from '../core/flags';
import { hyp2 } from '../core/mathx';
import { G } from '../physics/groups';
import { TEAM } from '../config/movement';
import { findJumpTarget, anchorLength, type JumpTarget } from '../world/anchors';
import { attachPose, GAMEPLAY_HEIGHT } from '../player/attach';
import { ATTACH_SUB } from '../player/moveState';
import { boostPath, inBoostBand, legUpRoom, relayPath, relaySlot, throwArc, throwDistAt, throwLanding, throwRoom, setThrowSites, clearThrowSites, THROW_SUB, HANG_SUB, HANG_HEAD, hangDepth, hangDepthMax, hangEndOf, hangFollow, hangRootY, ROPE_SUB, ropeClimb, ropeEndOf, ropeFromTop, ropeOverPath, ropeStepOff, ROPE_DESCENT_ARM,ropeRoom, ropeSlide, ropeTopY, findRopeLip, ropeClimbPull, newRopeLip, ropeClimbGripW, ropeLipHands, ropeTopGripW, ropeTopPath, ROPE_TOP_HANDS, ROPE_TOP_PATH, KIT_SUB_MASK, isKitKind, type KitKind, type TeamKind, type TeamMoveKind } from './teamMoves';
import { clearGripAxis } from '../player/attachGrips';
import type { GameState } from './gameState';
import type { ThrowSite } from '../world/mapDef';
import { KIT_POSE_LOCAL } from '../anim/clips/team';
import { KitDevices, isKitState, kitKindOf, kitMove, kitMoveOfState, kitMoves, kitOfferFree, kitPoseK, kitStateSub, kitStateWireMode, type KitHost, type KitMove, type KitState } from './kit/registry';
import { isShutterDevice, resetShutter } from './kit/shutter';

// (mission KIT0) every co-op kit move file registers itself with the registry (`kit/registry.ts`): a new move is a new
// file in `game/kit/`, no edit here
import.meta.glob('./kit/*.ts', { eager: true });

/** A team-mate as the team moves see them (from the net layer). */
export interface TeamMate {
  id: string;
  pos: Vector3;
  yaw: number;
  /** Their movement mode (`MoveState.m`). */
  mode: string;
  /** Their attached anchor id, position along it and attach sub bits (a hanging mate's relay offer is `ATTACH_SUB.relay`). */
  anchor?: number;
  s?: number;
  sub?: number;
}

/** A team move the host started: `a` climbs, `b` offers (crouched for a leg-up, hanging for a relay). */
export interface TeamStart {
  kind: TeamMoveKind;
  a: string;
  b: string;
  target: number;
  s: number;
  /** (B4) A throw's landing (feet). */
  l?: [number, number, number];
}

export type TeamState =
  | 'none'
  | 'offer'
  | 'relayOffer'
  | 'boost'
  | 'assist'
  | 'relayUp'
  | 'relayHold'
  | 'throwOffer'
  | 'throwAssist'
  | 'throw'
  // (B5) the hang-down: the holder offers / holds; the partner is lowered, hangs, is pulled up or dropped
  | 'hangOffer'
  | 'hangHold'
  | 'hangDown'
  | 'hanging'
  | 'hangPull'
  | 'hangDrop'
  // (B7) the two-person rope: the holder offers / holds at the top; the partner climbs, tops out or slides down
  | 'ropeOffer'
  | 'ropeHold'
  | 'ropeClimb'
  | 'ropeTop'
  | 'ropeSlide'
  // (coop-kit A1, R34) the rappel: a partner beside the holder goes over the edge onto the rope, then climbs down it
  | 'ropeOver'
  // (mission KIT0) a co-op kit move's state: its pose id (`KIT_POSE_IDS`), run by its own file (`kit/registry.ts`)
  | KitState;

const HOLDER_STATES: readonly TeamState[] = ['hangOffer', 'hangHold', 'ropeOffer', 'ropeHold'];
const ROPE_HOLDER: readonly TeamState[] = ['ropeOffer', 'ropeHold'];
const ROPE_CLIMBER: readonly TeamState[] = ['ropeClimb', 'ropeTop', 'ropeSlide', 'ropeOver'];
const HANGER_STATES: readonly TeamState[] = ['hangDown', 'hanging', 'hangPull', 'hangDrop'];

const REFUSE_SHOW = 2;

/**
 * Co-op team moves, the local side (CT prototype B2). The Co-op action (RB / F) starts them (G151: anywhere with room):
 * - crouched on the ground: offer a LEG-UP (`offer`, wire mode `brace`: still, hands cupped). The partner runs in, presses
 *   the Co-op action and is boosted onto the ledge in reach (G57 band); the offerer assists.
 * - standing on the ground: offer the PARTNER THROW (B4, CT 1.3; `throwOffer`, wire mode `brace` + `THROW_SUB`). The
 *   partner runs in, presses the Co-op action and is thrown on over the thrower in an arc (`throw`, wire mode `boost`),
 *   landing `TEAM.throwDist` m past them (a throw site's length at a named site, tallow-fixes A24), crouched. The runner
 *   checks the room first (a polite refusal when blocked).
 * - hanging from a ledge: offer the LEDGE RELAY (`relayOffer`: the relay bit in the attach sub). The partner under them
 *   presses the Co-op action and climbs up the hanging body to the same ledge (`relayUp`); the hanger holds still
 *   meanwhile (`relayHold`) and then pulls up with the normal climb.
 * The host checks every request (`teamMoves.ts` `checkTeamRequest`) on both players' movement states. No brace, no stack.
 */
export class TeamController implements KitHost {
  state: TeamState = 'none';
  /** The partner in the current move (or the offering team-mate). */
  partner = '';
  /** What the Co-op action would complete now: a crouched mate offering (a boost target or none) or a hanging mate. */
  offer: { mate: TeamMate; boost: JumpTarget | null; relay: boolean; toss?: boolean; hang?: boolean; rope?: boolean; down?: boolean } | null = null;
  /** (B5) The hang-down: the hang point (x / z), the edge's height, the floor under the hang (NaN = none), the head's
   *  depth under the edge (the holder's own; the hanger follows the holder's), the deepest it may go. */
  readonly hang = { x: 0, z: 0, edgeY: 0, floorY: NaN, depth: 0, max: 0, lostT: 0, sent: false, vy: 0, yaw: 0 };
  private hp2 = { x: 0, z: 0, floorY: NaN };
  /** The world prompt now (names the move and who starts it) and where it is drawn; null = none. */
  prompt: string | null = null;
  readonly promptAt = new Vector3();
  /** Seconds into the current committed part (public for the kit moves, `KitHost`). */
  t = 0;
  private start: TeamStart | null = null;
  private from = new Vector3();
  private kin = new Vector3();
  private pt = { x: 0, y: 0, z: 0 };
  private hp = { x: 0, y: 0, z: 0, yaw: 0 };
  /** Counts (tests): offers, boosts, relays, denials; (coop-kit A1) rappels down the rope and steps off at its floor. */
  readonly count = { offers: 0, boosts: 0, ladders: 0, throws: 0, hangs: 0, pulls: 0, drops: 0, ropes: 0, tops: 0, slides: 0, descents: 0, stepOffs: 0, denied: 0, ends: 0 };
  /** (B4) The last throw's landing check ('ok' or why not; tests). */
  lastThrowRoom = '';
  /** (tallow-fixes A24) the last throw's length (tests, e2e) */
  lastThrowDist = 0;
  lastDenied = '';
  /** Why the last move ended early (tests, debugging). */
  endWhy = '';
  private refuse = '';
  private refuseT = 0;
  private sides = [0, 0, 0, 0];
  private a = new Vector3();
  private b = new Vector3();
  private land = { x: 0, z: 0, dx: 0, dz: 0 };
  private to = new Vector3();
  /** (mission KIT0) This level's kit devices (the kit device hook; `kit/registry.ts`). */
  readonly devices = new KitDevices();
  /** (KIT0) Each kit move's run data on this controller, and the level its devices were set up for. */
  private kitRuns = new Map<KitKind, object>();
  private kitLevel: unknown = null;
  /** (tallow-fixes TD-b) This map's throw sites, registered for the throw length (null = none). */
  private readonly sites: readonly ThrowSite[] | null;

  constructor(readonly g: GameState) {
    // (TD-b) the map's throw sites (host and client build the same map: no wire); a headless test may have no world.
    // Always set, null too, so a map with no sites overwrites the previous map's list.
    const list = g.world?.layout?.throwSites ?? null;
    this.sites = list && list.length > 0 ? list : null;
    setThrowSites(this.sites);
  }

  /** (TD-b) Clears the throw sites this controller set (only its own: a newer controller's list stays). */
  dispose(): void {
    if (this.sites) clearThrowSites(this.sites);
  }

  /** Team-mates from the net layer (none in single player). */
  mates(): readonly TeamMate[] {
    return this.g.net?.teamMates?.() ?? [];
  }

  /** (anim-studio-2) Seconds into the current committed part (the move sections' contact window; visual only). */
  get partT(): number {
    return this.t;
  }

  /** In a team move that owns the body (an offer waiting on the ground or a hang offer is not: the player stays free). */
  get active(): boolean {
    return this.state !== 'none' && this.state !== 'relayOffer';
  }

  /** The hanger is held still while the partner climbs. */
  get hangLock(): boolean {
    return this.state === 'relayHold';
  }

  get busy(): boolean {
    return this.active && this.state !== 'offer' && this.state !== 'hangOffer' && this.state !== 'ropeOffer' && !kitOfferFree(this.state);
  }

  /** (B5) Hanging head-first from the partner's hands (the interact button stays free: the hack). */
  get hangingDown(): boolean {
    return HANGER_STATES.includes(this.state);
  }

  /** (hang-down) Hanging settled under the partner's hands, no end asked: the hanging player's actions are live (the
   *  hold-A menu, the grab and the neck snap, the pistol). Lowering, the pull-up and the drop are not. */
  get hangActs(): boolean {
    return this.state === 'hanging' && !this.hang.sent;
  }

  /** Free air over the head and the four side clearances (m): the leg-up's room (G151). */
  private room(): boolean {
    const g = this.g;
    const c = g.player.controller;
    this.a.set(c.pos.x, c.pos.y + 1.0, c.pos.z);
    this.b.set(c.pos.x, c.pos.y + 1.0 + TEAM.roomUp + 0.4, c.pos.z);
    const hu = g.ballistics.ray(this.a, this.b, G.STATIC);
    // the ray starts 1.0 up; the toss needs the air over the crouched head (1.05)
    const up = hu.hit ? hu.distance + 1.0 - 1.05 : Infinity;
    for (let i = 0; i < 4; i++) {
      const yaw = c.yaw + (i * Math.PI) / 2;
      this.b.set(c.pos.x + Math.sin(yaw) * (TEAM.roomSide + 0.3), c.pos.y + 0.8, c.pos.z + Math.cos(yaw) * (TEAM.roomSide + 0.3));
      this.a.set(c.pos.x, c.pos.y + 0.8, c.pos.z);
      const h = g.ballistics.ray(this.a, this.b, G.STATIC);
      this.sides[i] = h.hit ? h.distance : Infinity;
    }
    return legUpRoom(up, this.sides);
  }

  refused(text: string): void {
    this.refuse = text;
    this.refuseT = REFUSE_SHOW;
    this.g.app.toasts.show(text, 'warn');
  }

  /** Hanging on a ledge, settled (not blending on or off). */
  private hanging(): boolean {
    const t = this.g.traversal;
    return t.attached && t.attach.kind === 'ledge' && t.attach.phase === 'on';
  }

  /**
   * Fixed step (before traversal). `coopPressed` the Co-op action, `bPressed` the crouch / B control (cancels an offer).
   * Returns true when the team move took the press.
   */
  fixedUpdate(dt: number, coopPressed: boolean, bPressed: boolean, moveY = 0): boolean {
    const g = this.g;
    const c = g.player.controller;
    // (KIT-TICK) every registered kit move's per-tick upkeep first, whatever the state, alive or not
    this.kitTick(dt);
    // (J9 S1) the shutter curtains follow the kit devices (host and client; nothing without shutters)
    this.g.world?.shutters?.update(this.devices.list);
    if (!g.player.alive) {
      if (this.state !== 'none') this.end(true);
      this.prompt = null;
      return false;
    }
    if (this.refuseT > 0) this.refuseT -= dt;
    this.prompt = this.refuseT > 0 ? this.refuse : null;
    if (this.prompt) this.promptAt.set(c.pos.x, c.pos.y + 1.9, c.pos.z);
    switch (this.state) {
      case 'none':
        return this.idle(coopPressed);
      case 'offer':
        // crouched, still, hands cupped; the partner comes to us (B stands up, a timeout lets go)
        this.t += dt;
        this.hold();
        this.prompt = 'Leg-up offered: waiting for your partner';
        this.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
        if (bPressed || coopPressed || this.t > TEAM.offerTime || !c.grounded) {
          c.swallowCrouch = bPressed;
          this.end(false);
        }
        return true;
      case 'relayOffer':
        // hanging, still free to pull up; letting go or climbing ends the offer
        this.t += dt;
        this.prompt = 'Relay offered: waiting for your partner';
        this.promptAt.set(c.pos.x, c.pos.y + 0.6, c.pos.z);
        if (!this.hanging() || coopPressed || this.t > TEAM.offerTime) this.end(false);
        return coopPressed;
      case 'assist':
        // lifting the climber: the boost's time, then free
        this.t += dt;
        this.hold();
        if (this.t >= TEAM.boostTime) this.end(false);
        return true;
      case 'relayHold':
        // the partner climbs our body: hold the hang still, then the normal pull-up is ours
        this.t += dt;
        if (this.t >= TEAM.relayClimb + 0.25 || !this.partnerPos()) this.end(false);
        return true;
      case 'throwOffer':
        // standing still, ready to throw; the partner runs in (B / Co-op cancels, a timeout lets go)
        this.t += dt;
        c.override = { velocity: { x: 0, z: 0 }, yaw: c.yaw, turnRate: 0, crouch: false };
        this.prompt = 'Throw offered: your partner runs in and presses Co-op';
        this.promptAt.set(c.pos.x, c.pos.y + 1.9, c.pos.z);
        if (bPressed || coopPressed || this.t > TEAM.offerTime || !c.grounded) {
          c.swallowCrouch = bPressed;
          this.end(false);
        }
        return true;
      case 'throwAssist':
        // throwing: held still for the flight
        this.t += dt;
        c.override = { velocity: { x: 0, z: 0 }, yaw: c.yaw, turnRate: 0, crouch: false };
        if (this.t >= TEAM.throwTime) this.end(false);
        return true;
      case 'throw':
        this.runThrow(dt);
        return true;
      case 'boost':
        this.runBoost(dt);
        return true;
      case 'relayUp':
        this.runRelay(dt);
        return true;
      case 'hangOffer':
        // (B5) crouched at the edge, braced; the partner comes to us (B / Co-op cancels, a timeout lets go)
        this.t += dt;
        this.hold();
        this.prompt = 'Hang-down offered: your partner presses Co-op';
        this.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
        if (bPressed || coopPressed || this.t > TEAM.offerTime || !c.grounded) {
          c.swallowCrouch = bPressed;
          this.end(false);
        }
        return true;
      case 'hangHold':
        this.runHold(dt, coopPressed, bPressed, moveY);
        return true;
      case 'hangDown':
      case 'hanging':
      case 'hangPull':
      case 'hangDrop':
        this.runHang(dt, coopPressed, bPressed);
        return true;
      case 'ropeOffer':
        // (B7) at the edge with the rope down, braced; the partner below comes to its foot (B / Co-op takes it back)
        this.t += dt;
        this.hold();
        // (coop-kit A1) with the `descent` kit id the partner may also rappel down it from beside us
        this.prompt = flags.kitMoves.has('descent') ? 'Rope down: your partner presses Co-op at its foot or beside you' : 'Rope down: your partner presses Co-op at its foot';
        this.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
        if (bPressed || coopPressed || this.t > TEAM.offerTime || !c.grounded) {
          c.swallowCrouch = bPressed;
          this.end(false);
        }
        return true;
      case 'ropeHold':
        this.runRopeHold(dt, coopPressed, bPressed);
        return true;
      case 'ropeClimb':
      case 'ropeTop':
      case 'ropeSlide':
      case 'ropeOver':
        this.runRope(dt, coopPressed, bPressed, moveY);
        return true;
      default:
        return this.kitStep(dt, coopPressed, bPressed, moveY);
    }
  }

  // ---- (mission KIT0) the co-op kit: each move in its own file (`kit/registry.ts`) ----

  private kitRunOf(m: KitMove): object {
    let r = this.kitRuns.get(m.kind);
    if (!r) {
      r = m.newRun();
      this.kitRuns.set(m.kind, r);
    }
    return r;
  }

  /** The kit device hook: the registered moves add their devices once per level. */
  private kitSync(): void {
    // (a headless test's GameState may have no world: no devices then)
    const level: unknown = this.g.world?.level ?? null;
    if (level === this.kitLevel) return;
    this.kitLevel = level;
    this.devices.clear();
    const ms = kitMoves();
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      m.setupDevices?.(this, this.kitRunOf(m), this.devices, level);
    }
  }

  /** (KIT-TICK) Every fixed step, before any early return: each registered move's `tick` (index loop, no allocation). */
  private kitTick(dt: number): void {
    const ms = kitMoves();
    if (!ms.length) return;
    this.kitSync();
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      if (m.tick) m.tick(this, this.kitRunOf(m), dt);
    }
  }

  /** (KIT-TICK, `KitHost`) The local player's hp now; NaN = no target (a headless test's GameState). */
  health(): number {
    return this.g.target?.health.hp ?? NaN;
  }

  /** No move running: the registered kit moves first (null = none applies here, the built-ins run). */
  private kitIdle(coopPressed: boolean, free: boolean, near: number): boolean | null {
    const ms = kitMoves();
    if (!ms.length) return null;
    this.kitSync();
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      if (!m.idle) continue;
      const took = m.idle(this, this.kitRunOf(m), coopPressed, free, near);
      if (took !== null) {
        this.kitPose(m);
        return took;
      }
    }
    return null;
  }

  /** A kit state's fixed step (its move's `step`); a state whose move is not registered ends. */
  private kitStep(dt: number, coopPressed: boolean, bPressed: boolean, moveY: number): boolean {
    const m = kitMoveOfState(this.state);
    if (!m) {
      this.endWhy = 'kit: no move registered';
      this.end(true);
      return false;
    }
    this.kitSync();
    m.step(this, this.kitRunOf(m), dt, coopPressed, bPressed, moveY);
    this.kitPose(m);
    return true;
  }

  /** The kit pose clock and gap for `teamPoseOfState` (`KIT_POSE_LOCAL`). */
  private kitPose(m: KitMove | null): void {
    const st = this.state;
    if (m && isKitState(st)) {
      KIT_POSE_LOCAL.k = kitPoseK(st, this.t, m.times);
      KIT_POSE_LOCAL.gap = m.gap ? m.gap(this, this.kitRunOf(m)) : NaN;
    } else {
      KIT_POSE_LOCAL.k = -1;
      KIT_POSE_LOCAL.gap = NaN;
    }
  }

  /** (KitHost) Ask the host for a kit move. */
  kitRequest(kind: KitKind, partner: string, target: number, s: number, gy: number, lx?: number, lz?: number): void {
    this.partner = partner;
    this.g.net?.teamRequest?.(kind, partner, target, s, gy, lx, lz);
  }

  // ---- (CT prototype B7) the two-person rope (CT 1.4 Belay Line) ----

  /** The rope's foot, the top-out spot beside the holder, the climber's feet height on the rope. (coop-kit A1) `top`:
   *  this climber came from the top (the rappel; wire `s` 1); `armed`: it has gone `ROPE_DESCENT_ARM` under the rope's
   *  top (the top counts as a top-out again); `slideAfter`: let go while going over, slide once on the rope. */
  readonly rope = { x: 0, z: 0, edgeY: 0, floorY: 0, y: 0, yaw: 0, ox: 0, oz: 0, tx: 0, ty: 0, tz: 0, lostT: 0, sent: false, slideWhy: '', vy: 0, m0: 0, px: 0, pz: 0, top: false, armed: false, slideAfter: false };
  /** (team-climb) The lip the rope goes over (found as the top-out starts: the hands' grips). */
  readonly ropeLip = newRopeLip();
  private readonly ropePath = { rise: 0, across: 0 };
  private ropeGrips = false;
  private readonly lipA = new Vector3();
  private readonly lipB = new Vector3();
  /** (team-climb) The lip search's ray (once per top-out). */
  private readonly lipRay = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, n: { x: number; y: number; z: number }): number => {
    this.lipA.set(ax, ay, az);
    this.lipB.set(bx, by, bz);
    const h = this.g.ballistics.ray(this.lipA, this.lipB, G.STATIC);
    if (!h.hit) return 2;
    n.x = h.normal.x;
    n.y = h.normal.y;
    n.z = h.normal.z;
    const l = Vector3.Distance(this.lipA, this.lipB);
    return l > 1e-6 ? h.distance / l : 0;
  };

  /** The holder: braced at the edge while the partner climbs; Co-op or B lets go (the climber slides down safely). */
  private runRopeHold(dt: number, coopPressed: boolean, bPressed: boolean): void {
    const r = this.rope;
    this.t += dt;
    this.hold();
    const c = this.g.player.controller;
    this.prompt = r.sent ? null : 'Holding the rope: Co-op or B lets go';
    this.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
    if (!this.partnerPos()) {
      this.endWhy = 'rope: partner gone';
      this.end(true);
      return;
    }
    const k = ropeEndOf(false, coopPressed, bPressed);
    if (k && !r.sent) {
      r.sent = true;
      c.swallowCrouch = bPressed;
      this.g.net?.teamHangEnd?.(k);
    }
    // the host's reply lost: free again (the climber slides down on its own, `TEAM.ropeLost`)
    if (r.sent && (r.lostT += dt) > 3) {
      this.endWhy = 'rope: no end reply';
      this.end(true);
    }
  }

  /** The climber: up / down the rope on the own stick, over the edge at the top; let go = a slide to the floor. */
  private runRope(dt: number, coopPressed: boolean, bPressed: boolean, moveY: number): void {
    const g = this.g;
    const c = g.player.controller;
    const r = this.rope;
    this.t += dt;
    if (this.state === 'ropeSlide') {
      r.y = ropeSlide(r.y, dt, r.floorY);
      // (team-climb) the pull in to the face undone by height on the way down
      const pin = ropeClimbPull(ropeTopY(r.edgeY) - r.y);
      this.kin.set(r.x + r.ox + r.px * pin, r.y, r.z + r.oz + r.pz * pin);
      c.override = { kinematic: this.kin, yaw: r.yaw, turnRate: 20, crouch: false };
      g.player.pose.traverse = 'climb';
      g.player.pose.traverseT = 0;
      if (r.y <= r.floorY + 1e-3) {
        this.count.slides++;
        this.finishRope();
      }
      return;
    }
    if (this.state === 'ropeOver') {
      this.runRopeOver(dt);
      return;
    }
    if (this.state === 'ropeTop') {
      // over the edge to beside the holder: up first, then in, from the rope's top pulled in to the face; (team-climb)
      // each eased at both ends (ropeTopPath), the rise carrying the rope climb's speed in (was: the rise stopped dead at
      // k 0.56 and the move in started with a jump at e 0.4, a 5.7 cm pop)
      const k = Math.min(1, this.t / TEAM.ropeTop);
      const x0 = r.x + r.ox + r.px;
      const z0 = r.z + r.oz + r.pz;
      const y0 = ropeTopY(r.edgeY);
      const p = ropeTopPath(k, r.m0, this.ropePath);
      this.kin.set(x0 + (r.tx - x0) * p.across, y0 + (r.ty - y0) * p.rise, z0 + (r.tz - z0) * p.across);
      c.override = { kinematic: this.kin, yaw: r.yaw, turnRate: 20, crouch: false };
      g.player.pose.traverse = 'climbUp';
      g.player.pose.traverseT = k;
      // (team-climb) the palms on the lip while the body rises over them, on the team clip (CLIMB_UP_TEAM: the grip
      // weight starts low, so characterRig's `ledgeClimb` stays false)
      if (this.ropeLip.ok) {
        const rig = g.player.rig;
        ropeLipHands(this.ropeLip, x0, z0, r.yaw, 0.25 * (rig.height / GAMEPLAY_HEIGHT), ropeTopGripW(k), rig.reachL, rig.reachR);
        this.ropeGrips = true;
      }
      if (k >= 1) {
        this.count.tops++;
        this.finishRope();
      }
      return;
    }
    // climbing: the holder must still hold (their MoveState), else the climber slides down after a while
    const m = this.mate(this.partner);
    if (m && m.mode === 'brace' && ((m.sub ?? 0) & ROPE_SUB) !== 0) r.lostT = 0;
    else if ((r.lostT += dt) > TEAM.ropeLost) {
      this.endWhy = 'rope: holder let go';
      this.slideNow('holder let go');
      return;
    }
    // (coop-kit A1) a rappeller on the floor (the frame before put the feet there) with the stick held down steps off:
    // free on its feet, the holder freed by the host's `tend` drop
    if (r.top && !r.sent && ropeStepOff(r.y, r.floorY, moveY)) {
      r.sent = true;
      g.net?.teamHangEnd?.('drop');
      this.count.stepOffs++;
      this.finishRope();
      return;
    }
    const top = ropeTopY(r.edgeY);
    r.y = ropeClimb(r.y, moveY, dt, r.floorY, top);
    // (team-climb) the climb's speed (the top-out's rise carries it in)
    r.vy = moveY > 0 ? moveY * TEAM.ropeUp : 0;
    // (team-climb) pulled in to the face on the rope's last stretch (by height: ropeClimbPull), so the hands reach the lip
    const below = top - r.y;
    const pin = ropeClimbPull(below);
    const bx = r.x + r.ox + r.px * pin;
    const bz = r.z + r.oz + r.pz * pin;
    this.kin.set(bx, r.y, bz);
    c.override = { kinematic: this.kin, yaw: r.yaw, turnRate: 20, crouch: false };
    g.player.pose.traverse = 'climb';
    g.player.pose.traverseT = ((((r.y - r.floorY) / 0.7) % 1) + 1) % 1;
    // (team-climb) the hands start for the lip on the rope's last stretch (at most ROPE_TOP_HANDS.preW at its top)
    if (this.ropeLip.ok && below < ROPE_TOP_HANDS.pre) {
      const rig = g.player.rig;
      ropeLipHands(this.ropeLip, bx, bz, r.yaw, 0.25 * (rig.height / GAMEPLAY_HEIGHT), ropeClimbGripW(below), rig.reachL, rig.reachR);
      this.ropeGrips = true;
    } else this.dropRopeGrips();
    // (coop-kit A1) a rappeller: the top tops out again only once it has been down the rope a little
    if (r.top && !r.armed && below >= ROPE_DESCENT_ARM) r.armed = true;
    this.prompt = r.sent ? null : r.top ? 'On the rope: stick down to rappel (hold down at the floor to step off); Co-op or B lets go' : 'On the rope: stick up / down; Co-op or B lets go';
    this.promptAt.set(c.pos.x, c.pos.y + 2.0, c.pos.z);
    const k = ropeEndOf(r.y >= top - 1e-3 && (!r.top || r.armed), coopPressed, bPressed);
    if (k === 'pull') {
      // topped out: the holder is free (the host tells them); over the edge now
      if (!r.sent) g.net?.teamHangEnd?.('pull');
      r.sent = true;
      this.state = 'ropeTop';
      this.t = 0;
      this.ropeTopBegin();
    } else if (k === 'drop' && !r.sent) {
      r.sent = true;
      g.net?.teamHangEnd?.('drop');
      this.slideNow('let go');
    }
  }

  /**
   * (coop-kit A1, R34) The rappeller goes over the edge: from where it stood beside the holder onto the rope's top (pulled
   * in to the face), the top-out's path backwards (`ropeOverPath`) over `TEAM.ropeOver`, the palms on the lip as the body
   * goes down past them. Placeholder pose (A2 animates it): the team climb-up clip run backwards (`traverseT` 1 -> 0).
   * Then on the rope at its top (`ropeClimb`), or a slide when the holder let go meanwhile.
   */
  private runRopeOver(dt: number): void {
    const g = this.g;
    const c = g.player.controller;
    const r = this.rope;
    // the holder must still hold (their MoveState); let go: finish going over, then slide down
    const m = this.mate(this.partner);
    if (m && m.mode === 'brace' && ((m.sub ?? 0) & ROPE_SUB) !== 0) r.lostT = 0;
    else if ((r.lostT += dt) > TEAM.ropeLost) r.slideAfter = true;
    const k = Math.min(1, this.t / TEAM.ropeOver);
    const x0 = r.x + r.ox + r.px;
    const z0 = r.z + r.oz + r.pz;
    const y0 = ropeTopY(r.edgeY);
    const p = ropeOverPath(k, this.ropePath);
    this.kin.set(x0 + (r.tx - x0) * p.across, y0 + (r.ty - y0) * p.rise, z0 + (r.tz - z0) * p.across);
    c.override = { kinematic: this.kin, yaw: r.yaw, turnRate: 20, crouch: false };
    g.player.pose.traverse = 'climbUp';
    g.player.pose.traverseT = 1 - k;
    if (this.ropeLip.ok) {
      const rig = g.player.rig;
      ropeLipHands(this.ropeLip, x0, z0, r.yaw, 0.25 * (rig.height / GAMEPLAY_HEIGHT), ropeTopGripW(1 - k), rig.reachL, rig.reachR);
      this.ropeGrips = true;
    }
    this.prompt = null;
    if (k < 1) return;
    r.y = y0;
    r.vy = 0;
    this.t = 0;
    if (r.slideAfter) {
      this.endWhy = 'rope: holder let go';
      this.slideNow('holder let go');
    } else this.state = 'ropeClimb';
  }

  private slideNow(why: string): void {
    this.dropRopeGrips();
    this.rope.slideWhy = why;
    this.state = 'ropeSlide';
    this.t = 0;
  }

  /** (team-climb) The top-out starts: the rise's starting slope (the climb's speed carried in). */
  private ropeTopBegin(): void {
    const r = this.rope;
    const d = r.ty - ropeTopY(r.edgeY);
    r.m0 = d > 0.05 ? (r.vy * ROPE_TOP_PATH.riseEnd * TEAM.ropeTop) / d : 0;
  }

  /** (team-climb) The climber on the rope: the lip it goes over (the hands' grips) and the top-out's pull in to it. */
  private ropeLipFind(): void {
    const r = this.rope;
    const L = this.ropeLip;
    r.px = r.pz = 0;
    if (findRopeLip(this.lipRay, r.x + r.ox, r.z + r.oz, r.yaw, r.edgeY - 0.3, r.edgeY + 0.3, L)) {
      // the pull in: from the body's distance off the face to ROPE_TOP_PATH.pullOut (never out)
      const off = (r.x + r.ox - L.x) * L.nx + (r.z + r.oz - L.z) * L.nz;
      const pull = Math.max(0, off - ROPE_TOP_PATH.pullOut);
      r.px = -L.nx * pull;
      r.pz = -L.nz * pull;
    }
  }

  /** (team-climb) The top-out's hands off the lip (no grip axis left for the next reach). */
  private dropRopeGrips(): void {
    if (!this.ropeGrips) return;
    this.ropeGrips = false;
    const rig = this.g.player.rig;
    rig.reachL.w = rig.reachR.w = 0;
    clearGripAxis(rig.reachL);
    clearGripAxis(rig.reachR);
    rig.reachL.liftOff = rig.reachR.liftOff = undefined;
  }

  private finishRope(): void {
    const g = this.g;
    this.dropRopeGrips();
    g.player.controller.override = null;
    g.player.pose.traverse = 'none';
    this.state = 'none';
    this.start = null;
    this.partner = '';
  }

  /** The top-out spot beside the holder at (`hx`, `hy`, `hz`) facing `yaw`: a side with floor, else just behind them. */
  private ropeTopSpot(hx: number, hy: number, hz: number, yaw: number): void {
    const r = this.rope;
    const g = this.g;
    const sx = Math.cos(yaw);
    const sz = -Math.sin(yaw);
    for (let i = 0; i < 2; i++) {
      const k = i === 0 ? 0.8 : -0.8;
      const x = hx + sx * k;
      const z = hz + sz * k;
      this.a.set(x, hy + 1.0, z);
      this.b.set(x, hy - 0.4, z);
      const fh = g.ballistics.ray(this.a, this.b, G.STATIC);
      if (fh.hit && Math.abs(fh.point.y - hy) < 0.3) {
        r.tx = x;
        r.ty = fh.point.y;
        r.tz = z;
        return;
      }
    }
    r.tx = hx - Math.sin(yaw) * 0.6;
    r.ty = hy;
    r.tz = hz - Math.cos(yaw) * 0.6;
  }

  // ---- (CT prototype B5) the hang-down (CT 1.5 Drop Line) ----

  /**
   * A drop ahead of a player at (`px`, `py`, `pz`) facing `yaw` (G151: any edge with room): looked for `TEAM.hangProbe` m
   * ahead, the air clear to it at waist height and no floor within `TEAM.hangDrop` m under it. Writes the hang point (a
   * little past the edge) and the floor under it; null = no drop there.
   */
  hangPoint(px: number, py: number, pz: number, yaw: number): { x: number; z: number; floorY: number } | null {
    const g = this.g;
    const dx = Math.sin(yaw);
    const dz = Math.cos(yaw);
    const out = this.hp2;
    for (let d = 0.4; d <= TEAM.hangProbe + 1e-3; d += 0.3) {
      const x = px + dx * d;
      const z = pz + dz * d;
      this.a.set(px, py + 0.5, pz);
      this.b.set(x, py + 0.5, z);
      if (g.ballistics.ray(this.a, this.b, G.STATIC).hit) return null;
      this.a.set(x, py + 0.5, z);
      this.b.set(x, py - TEAM.hangDrop, z);
      if (g.ballistics.ray(this.a, this.b, G.STATIC).hit) continue;
      // over the drop: a little further in when that is still clear (the middle of a hatch)
      let hx = x + dx * 0.15;
      let hz = z + dz * 0.15;
      this.a.set(hx, py + 0.5, hz);
      this.b.set(hx, py - TEAM.hangDrop, hz);
      if (g.ballistics.ray(this.a, this.b, G.STATIC).hit) {
        hx = x;
        hz = z;
      }
      this.a.set(hx, py - 0.2, hz);
      this.b.set(hx, py - 30, hz);
      const fh = g.ballistics.ray(this.a, this.b, G.STATIC);
      out.x = hx;
      out.z = hz;
      out.floorY = fh.hit ? fh.point.y : NaN;
      return out;
    }
    return null;
  }

  /** The holder: braced at the edge, the stick moves the partner up / down; Co-op pulls them up, B lets them drop. */
  private runHold(dt: number, coopPressed: boolean, bPressed: boolean, moveY: number): void {
    const h = this.hang;
    this.t += dt;
    this.hold();
    h.depth = hangDepth(h.depth, moveY, dt, h.max);
    const c = this.g.player.controller;
    this.prompt = h.sent ? null : 'Holding: stick up / down; Co-op pulls up, B lets go';
    this.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
    if (!this.partnerPos()) {
      this.endWhy = 'hang: partner gone';
      this.end(true);
      return;
    }
    const k = hangEndOf(true, coopPressed, bPressed);
    if (k && !h.sent) {
      h.sent = true;
      c.swallowCrouch = bPressed;
      this.g.net?.teamHangEnd?.(k);
    }
    // the host's reply lost: free again after a while (the partner lets go on their own, `TEAM.hangLost`)
    if (h.sent && (h.lostT += dt) > 3) {
      this.endWhy = 'hang: no end reply';
      this.end(true);
    }
  }

  /** The hanging partner: lowered head-first, follows the holder's depth, pulled up or dropped at the end. */
  private runHang(dt: number, coopPressed: boolean, bPressed: boolean): void {
    const g = this.g;
    const c = g.player.controller;
    const h = this.hang;
    this.t += dt;
    g.player.pose.traverse = 'none';
    if (this.state === 'hangDrop') {
      // head-first drop: turned feet-down at once, falls to the floor under the hang, lands crouched
      g.player.pose.tumble = 0;
      h.vy += 9.8 * dt;
      const y = c.pos.y - h.vy * dt;
      const floor = Number.isFinite(h.floorY) ? h.floorY : c.pos.y - 3;
      this.kin.set(h.x, Math.max(floor, y), h.z);
      c.override = { kinematic: this.kin, yaw: h.yaw, turnRate: 20, crouch: true };
      if (y <= floor) this.finishHang('drop');
      return;
    }
    if (this.state === 'hangPull') {
      // back up over the edge to where we stood beside the holder; the body turns upright half way
      const k = Math.min(1, this.t / TEAM.hangPull);
      const e = k * k * (3 - 2 * k);
      const y0 = hangRootY(h.edgeY, h.depth);
      this.kin.set(h.x + (this.from.x - h.x) * e, y0 + (this.from.y - y0) * Math.min(1, e * 1.6), h.z + (this.from.z - h.z) * e);
      c.override = { kinematic: this.kin, yaw: h.yaw, turnRate: 20, crouch: true };
      g.player.pose.tumble = k < 0.5 ? Math.PI : 0;
      if (k >= 1) this.finishHang('pull');
      return;
    }
    // the holder's depth (their MoveState `s`), eased; a holder no longer holding lets go after a while
    const m = this.mate(this.partner);
    if (m && m.mode === 'brace' && ((m.sub ?? 0) & HANG_SUB) !== 0) {
      h.lostT = 0;
      h.depth = hangFollow(h.depth, Math.max(TEAM.hangMin, Math.min(TEAM.hangMax, m.s ?? h.depth)), dt);
    } else if ((h.lostT += dt) > TEAM.hangLost) {
      this.endWhy = 'hang: holder let go';
      this.dropNow();
      return;
    }
    const ry = hangRootY(h.edgeY, h.depth);
    if (this.state === 'hangDown') {
      const k = Math.min(1, this.t / TEAM.hangLower);
      const e = k * k * (3 - 2 * k);
      this.kin.set(this.from.x + (h.x - this.from.x) * e, this.from.y + (ry - this.from.y) * e, this.from.z + (h.z - this.from.z) * e);
      if (k >= 1) this.state = 'hanging';
    } else this.kin.set(h.x, ry, h.z);
    c.override = { kinematic: this.kin, yaw: h.yaw, turnRate: 20, crouch: false };
    g.player.pose.tumble = Math.PI;
    // (hang-down) A the item in reach (A9), the hold-A menu by a guard (grab), RT the neck snap, LT the pistol
    this.prompt = h.sent ? null : 'Hanging: A to use what is in reach, hold A by a guard to grab, RT takes him down, LT aims; Co-op to be pulled up';
    this.promptAt.set(c.pos.x, c.pos.y + 0.4, c.pos.z);
    const k = hangEndOf(false, coopPressed, bPressed);
    if (k && !h.sent) {
      h.sent = true;
      g.net?.teamHangEnd?.(k);
    }
  }

  private dropNow(): void {
    const c = this.g.player.controller;
    this.state = 'hangDrop';
    this.t = 0;
    this.hang.vy = 0;
    // turned feet-down where the head was
    this.kin.set(this.hang.x, c.pos.y - HANG_HEAD, this.hang.z);
    c.override = { kinematic: this.kin, yaw: this.hang.yaw, turnRate: 20, crouch: true };
    this.g.player.pose.tumble = 0;
  }

  private finishHang(k: 'pull' | 'drop'): void {
    const g = this.g;
    const c = g.player.controller;
    if (k === 'pull') this.count.pulls++;
    else this.count.drops++;
    c.override = null;
    g.player.pose.tumble = 0;
    c.setCrouchToggle();
    this.state = 'none';
    this.start = null;
    this.partner = '';
  }

  private mate(id: string): TeamMate | null {
    for (const m of this.mates()) if (m.id === id) return m;
    return null;
  }

  /** No move running: find what a Co-op press would complete, show the prompt, start an offer on a press. */
  private idle(coopPressed: boolean): boolean {
    const g = this.g;
    const c = g.player.controller;
    this.offer = null;
    const mates = this.mates();
    if (!mates.length || g.takedown.active || g.strike.active) return false;
    const free = !g.traversal.committed && !g.traversal.attached && c.grounded && !c.override;
    let near = Infinity;
    for (const m of mates) near = Math.min(near, hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z));
    // (mission KIT0) the co-op kit's moves first: one that applies here takes the press. (FLG) Only with `?coopkit=1`
    // (`flags.coopKit`): off, no kit offer anywhere (Marlow Yard's 4.3-4.5 m lips keep the leg-up, M1)
    const kit = flags.coopKit ? this.kitIdle(coopPressed, free, near) : null;
    if (kit !== null) return kit;
    if (free) {
      // a mate crouched in reach (a leg-up) or hanging right over us (the relay)
      let bd: number = TEAM.relayReach;
      for (const m of mates) {
        if (m.mode === 'brace' && ((m.sub ?? 0) & KIT_SUB_MASK) !== 0) continue; // (KIT0) offering a kit move
        const d = hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z);
        const toss = m.mode === 'brace' && ((m.sub ?? 0) & THROW_SUB) !== 0;
        const hang = m.mode === 'brace' && ((m.sub ?? 0) & HANG_SUB) !== 0;
        const rope = m.mode === 'brace' && ((m.sub ?? 0) & ROPE_SUB) !== 0;
        if (rope) {
          // (B7) a partner holding a rope at an edge over us: climb it from its foot
          const up = m.pos.y - c.pos.y;
          if (d < TEAM.ropeReach && up > TEAM.ropeMin - 0.4 && up < TEAM.ropeMax + 0.4) {
            bd = 0;
            this.offer = { mate: m, boost: null, relay: false, rope: true };
          } else if (d < TEAM.ropeReach && ropeFromTop(m.pos.y, c.pos.y) && flags.kitMoves.has('descent')) {
            // (coop-kit A1, R34) beside the holder on their floor: rappel down it (the `descent` kit id)
            bd = 0;
            this.offer = { mate: m, boost: null, relay: false, rope: true, down: true };
          }
        } else if (hang) {
          if (d < TEAM.hangReach && Math.abs(m.pos.y - c.pos.y) < 0.4 && d < bd) {
            bd = d;
            this.offer = { mate: m, boost: null, relay: false, hang: true };
          }
        } else if (toss && d < TEAM.throwReach && Math.abs(m.pos.y - c.pos.y) < 0.4 && d < bd) {
          bd = d;
          this.offer = { mate: m, boost: null, relay: false, toss: true };
        } else if (!toss && m.mode === 'brace' && d < TEAM.partnerReach && Math.abs(m.pos.y - c.pos.y) < 0.4 && d < bd) {
          bd = d;
          this.offer = { mate: m, boost: this.boostTarget(m), relay: false };
        } else if (m.mode === 'ledge' && ((m.sub ?? 0) & ATTACH_SUB.relay) !== 0 && d < bd && m.pos.y - c.pos.y > 0.3 && m.pos.y - c.pos.y < TEAM.relayMax) {
          bd = d;
          this.offer = { mate: m, boost: null, relay: true };
        }
      }
    }
    const o = this.offer;
    if (o && o.rope && o.down) {
      // (coop-kit A1, R34) the rappel: the same rope point the climb uses (in front of the holder), the same request; the
      // host tells the two apart by height
      this.prompt = 'Co-op: rappel down the rope (two-person rope)';
      this.promptAt.set(c.pos.x, c.pos.y + 1.9, c.pos.z);
      if (coopPressed) {
        const p = this.hangPoint(o.mate.pos.x, o.mate.pos.y, o.mate.pos.z, o.mate.yaw);
        if (!p || ropeRoom(o.mate.pos.y, p.floorY) !== 'ok') this.refused('The rope does not reach the ground here');
        else {
          this.partner = o.mate.id;
          this.g.net?.teamRequest?.('rope', o.mate.id, -1, 0, o.mate.pos.y, p.x, p.z);
        }
      }
      return coopPressed;
    }
    if (o && o.rope) {
      this.prompt = 'Co-op: climb the rope (two-person rope)';
      this.promptAt.set(c.pos.x, c.pos.y + 2.0, c.pos.z);
      if (coopPressed) {
        const p = this.hangPoint(o.mate.pos.x, o.mate.pos.y, o.mate.pos.z, o.mate.yaw);
        if (!p || !Number.isFinite(p.floorY) || Math.abs(p.floorY - c.pos.y) > 0.5) this.refused('The rope does not reach you here');
        else {
          this.partner = o.mate.id;
          this.g.net?.teamRequest?.('rope', o.mate.id, -1, 0, o.mate.pos.y, p.x, p.z);
        }
      }
      return coopPressed;
    }
    if (o && o.hang) {
      // (B5) the partner's hang-down offer: be lowered head-first over the edge in front of them
      this.prompt = 'Co-op: be lowered head-first (hang-down)';
      this.promptAt.set(o.mate.pos.x, o.mate.pos.y + 1.3, o.mate.pos.z);
      if (coopPressed) {
        const p = this.hangPoint(o.mate.pos.x, o.mate.pos.y, o.mate.pos.z, o.mate.yaw);
        if (!p) this.refused('No drop in front of your partner');
        else {
          this.partner = o.mate.id;
          this.g.net?.teamRequest?.('hang', o.mate.id, -1, 0, o.mate.pos.y, p.x, p.z);
        }
      }
      return coopPressed;
    }
    if (o) {
      this.prompt = o.toss ? 'Co-op: get thrown over (partner throw)' : o.relay ? 'Co-op: climb your partner up to the ledge' : o.boost ? 'Co-op: take the leg-up' : 'Leg-up offered: no ledge in reach here';
      this.promptAt.set(o.mate.pos.x, o.mate.pos.y + (o.relay ? 0.5 : o.toss ? 1.9 : 1.3), o.mate.pos.z);
      if (coopPressed) {
        if (o.toss) this.requestThrow(o.mate);
        else if (o.relay) this.request('ladder', o.mate.id, o.mate.anchor ?? -1, o.mate.s ?? 0, 0);
        else if (o.boost) this.request('boost', o.mate.id, o.boost.anchor.id, o.boost.s, o.boost.grip.y);
        else this.refused('No ledge to boost to here');
      }
      return coopPressed;
    }
    // start one: hanging = the relay; crouched on the ground = the leg-up; standing = the partner throw (B4)
    if (this.hanging()) {
      if (near < 12 && !this.prompt) {
        this.prompt = 'Co-op: offer a ledge relay';
        this.promptAt.set(c.pos.x, c.pos.y + 0.6, c.pos.z);
      }
      if (coopPressed) {
        this.state = 'relayOffer';
        this.t = 0;
        this.count.offers++;
        this.partner = '';
        return true;
      }
      return false;
    }
    if (!free) return false;
    // the standing offer is named only with the partner close by (else it would sit over the head all the time)
    // (B5) crouched facing a drop (a roof edge, a hatch): the hang-down instead of the leg-up
    // (B7) standing facing a drop: the two-person rope instead of the throw
    const drop = near < 12 ? this.hangPoint(c.pos.x, c.pos.y, c.pos.z, c.yaw) : null;
    // (G4) a climb-up / ladder / vent now ends crouched by itself (CT): that crouch counts as standing here, so the rope
    // and the throw stay one press away; a crouch the player chose offers the hang-down / leg-up. Standing up (the crouch
    // no longer wanted, the body not up yet) also counts as standing.
    const crouched = c.crouched && c.crouchIntent && !c.autoCrouch;
    if (near < (crouched || drop ? 12 : 4) && !this.prompt) {
      this.prompt = drop ? (crouched ? 'Co-op: offer a hang-down (lower your partner)' : 'Co-op: drop a rope for your partner (crouch: hang-down)') : crouched ? 'Co-op: offer a leg-up' : 'Co-op: offer a partner throw (crouch for a leg-up)';
      this.promptAt.set(c.pos.x, c.pos.y + (crouched ? 1.5 : 1.9), c.pos.z);
    }
    if (!coopPressed) return false;
    if (!crouched && c.autoCrouch) c.standUp();
    if (drop && !crouched) {
      // (B7) the rope: it needs ground under the edge within its length (polite refusal otherwise)
      const room = ropeRoom(c.pos.y, drop.floorY);
      if (room !== 'ok') {
        this.refused(room === 'short' ? 'Too low for a rope: just drop down' : 'The rope does not reach the ground here');
        return true;
      }
      const r = this.rope;
      r.x = drop.x;
      r.z = drop.z;
      r.edgeY = c.pos.y;
      r.floorY = drop.floorY;
      r.sent = false;
      r.lostT = 0;
      this.state = 'ropeOffer';
      this.t = 0;
      this.count.offers++;
      this.partner = '';
      return true;
    }
    if (drop) {
      const h = this.hang;
      h.x = drop.x;
      h.z = drop.z;
      h.edgeY = c.pos.y;
      h.floorY = drop.floorY;
      h.max = hangDepthMax(c.pos.y, drop.floorY);
      this.state = 'hangOffer';
      this.t = 0;
      this.count.offers++;
      this.partner = '';
      return true;
    }
    if (crouched) {
      if (!this.room()) this.refused('No room for a leg-up here');
      else {
        this.state = 'offer';
        this.t = 0;
        this.count.offers++;
        this.partner = '';
      }
      return true;
    }
    // standing: the partner throw (B4) - free air over the thrower; where the runner lands is checked on their side
    if (!this.throwRoomUp()) this.refused('No room for a throw here');
    else {
      this.state = 'throwOffer';
      this.t = 0;
      this.count.offers++;
      this.partner = '';
    }
    return true;
  }

  /** Free air over the standing thrower (the runner goes over their head). */
  private throwRoomUp(): boolean {
    const g = this.g;
    const c = g.player.controller;
    this.a.set(c.pos.x, c.pos.y + 1.0, c.pos.z);
    this.b.set(c.pos.x, c.pos.y + 1.0 + TEAM.throwUp, c.pos.z);
    return !g.ballistics.ray(this.a, this.b, G.STATIC).hit;
  }

  /**
   * The runner's side of a throw (G151): the landing past the thrower, nothing solid along the arc (sampled at the feet
   * and the head), a floor there within reach and head room over it. Asks the host when it fits, else a polite refusal.
   */
  private requestThrow(m: TeamMate): void {
    const g = this.g;
    const c = g.player.controller;
    // (tallow-fixes A24) the direction first (runner -> thrower, or the thrower's yaw under 5 cm), then the site's length
    throwLanding(c.pos.x, c.pos.z, m.pos.x, m.pos.z, m.yaw, this.land);
    const dist = throwDistAt(m.pos.x, m.pos.z, this.land.dx, this.land.dz);
    this.lastThrowDist = dist;
    const l = throwLanding(c.pos.x, c.pos.z, m.pos.x, m.pos.z, m.yaw, this.land, dist);
    const by = m.pos.y;
    // the landing floor: down from well over the landing spot
    this.a.set(l.x, by + TEAM.throwDrop + 1.6, l.z);
    this.b.set(l.x, by - TEAM.throwDrop - 0.2, l.z);
    const fh = g.ballistics.ray(this.a, this.b, G.STATIC);
    const floorY = fh.hit ? fh.point.y : NaN;
    let head = 0;
    if (fh.hit) {
      this.a.set(l.x, floorY + 0.1, l.z);
      this.b.set(l.x, floorY + 0.1 + 1.8, l.z);
      const hh = g.ballistics.ray(this.a, this.b, G.STATIC);
      head = hh.hit ? hh.distance : 1.8;
    }
    // the arc, in 8 legs, at the feet (+0.3) and the head (+1.6)
    let clear = fh.hit;
    const y1 = fh.hit ? floorY : by;
    for (let i = 0; i < 8 && clear; i++) {
      for (let k = 0; k < 2 && clear; k++) {
        const off = k === 0 ? 0.3 : 1.6;
        throwArc((i / 8) * TEAM.throwTime, c.pos.x, c.pos.y, c.pos.z, l.x, y1, l.z, this.pt);
        this.a.set(this.pt.x, this.pt.y + off, this.pt.z);
        throwArc(((i + 1) / 8) * TEAM.throwTime, c.pos.x, c.pos.y, c.pos.z, l.x, y1, l.z, this.pt);
        this.b.set(this.pt.x, this.pt.y + off, this.pt.z);
        if (g.ballistics.ray(this.a, this.b, G.STATIC | G.GLASS).hit) clear = false;
      }
    }
    const room = throwRoom(clear, floorY - by, head);
    this.lastThrowRoom = room;
    if (room !== 'ok') {
      this.refused(room === 'floor' ? 'No floor to land on there' : 'No room for the throw there');
      return;
    }
    this.partner = m.id;
    this.g.net?.teamRequest?.('throw', m.id, -1, 0, floorY, l.x, l.z);
  }

  /** Crouched, still, back to the cupped-hands pose. */
  hold(): void {
    const c = this.g.player.controller;
    c.override = { velocity: { x: 0, z: 0 }, yaw: c.yaw, turnRate: 0, crouch: true };
    this.g.player.pose.traverse = 'brace';
  }

  /** The lip / pipe / split a leg-up from this offering mate reaches (from the toss apex, in the boost band). */
  private boostTarget(m: TeamMate): JumpTarget | null {
    const g = this.g;
    const floor = m.pos.y;
    // searched from 1.15 m under the highest boost (a jump takes lips up to 1.2 m above): lips out of a wall jump's reach.
    // Any way round the offering mate (G151: anywhere), the way they face first.
    const apex = { x: m.pos.x, y: floor + TEAM.boostMax - 1.15, z: m.pos.z };
    for (let i = 0; i < 4; i++) {
      const yaw = m.yaw + (i * Math.PI) / 2;
      const t = findJumpTarget(g.world.level.anchors, apex, -1, Math.sin(yaw), Math.cos(yaw), 1, 2.2, 0.2);
      if (t && inBoostBand(t.grip.y - floor)) return t;
    }
    return null;
  }

  private request(kind: TeamKind, partner: string, target: number, s: number, gripY: number): void {
    this.partner = partner;
    this.g.net?.teamRequest?.(kind, partner, target, s, gripY);
  }

  /** The host started a team move this player is part of. */
  begin(s: TeamStart, self: string): void {
    const g = this.g;
    const c = g.player.controller;
    this.start = s;
    this.t = 0;
    this.from.copyFrom(c.pos);
    if (isKitKind(s.kind)) {
      // (mission KIT0) a kit move: its own file sets the state (an unregistered kind is ignored)
      const m = kitMove(s.kind);
      if (m) {
        m.begin(this, this.kitRunOf(m), s, self);
        this.kitPose(m);
      }
      return;
    }
    const boost = s.kind === 'boost';
    if (s.kind === 'rope') {
      // (B7) `a` climbs the rope `b` holds; `l` = the rope's foot (x, the edge's y, z)
      const r = this.rope;
      r.sent = false;
      r.lostT = 0;
      r.top = false;
      r.armed = false;
      r.slideAfter = false;
      if (s.a === self && s.l && ropeFromTop(s.l[1], c.pos.y)) {
        this.beginDescent(s);
      } else if (s.a === self && s.l) {
        this.partner = s.b;
        this.state = 'ropeClimb';
        r.x = s.l[0];
        r.edgeY = s.l[1];
        r.z = s.l[2];
        r.y = c.pos.y;
        r.floorY = c.pos.y;
        // hang off the rope on the climber's side, facing it
        const dx = c.pos.x - r.x;
        const dz = c.pos.z - r.z;
        const d = hyp2(dx, dz);
        r.ox = d > 0.05 ? (dx / d) * 0.35 : 0;
        r.oz = d > 0.05 ? (dz / d) * 0.35 : -0.35;
        r.yaw = Math.atan2(-r.ox, -r.oz);
        const hp = this.partnerPos();
        const hyaw = this.mate(s.b)?.yaw ?? r.yaw + Math.PI;
        this.ropeTopSpot(hp ? hp.x : r.x, r.edgeY, hp ? hp.z : r.z, hyaw);
        this.ropeLipFind();
        this.count.ropes++;
      } else if (s.b === self && this.state === 'ropeOffer') {
        this.partner = s.a;
        this.state = 'ropeHold';
      }
      return;
    }
    if (s.kind === 'hang') {
      // (B5) `a` is lowered head-first at the hang point `l` (x, edge y, z) by the holder `b`
      const h = this.hang;
      h.sent = false;
      h.lostT = 0;
      h.depth = TEAM.hangStart;
      if (s.a === self && s.l) {
        this.partner = s.b;
        this.state = 'hangDown';
        h.x = s.l[0];
        h.edgeY = s.l[1];
        h.z = s.l[2];
        h.yaw = Math.atan2(h.x - c.pos.x, h.z - c.pos.z);
        h.vy = 0;
        this.a.set(h.x, h.edgeY - 0.2, h.z);
        this.b.set(h.x, h.edgeY - 30, h.z);
        const fh = g.ballistics.ray(this.a, this.b, G.STATIC);
        h.floorY = fh.hit ? fh.point.y : NaN;
        this.count.hangs++;
      } else if (s.b === self && this.state === 'hangOffer') {
        this.partner = s.a;
        this.state = 'hangHold';
      }
      return;
    }
    if (s.kind === 'throw') {
      if (s.a === self && s.l) {
        this.partner = s.b;
        this.state = 'throw';
        this.to.set(s.l[0], s.l[1], s.l[2]);
        this.count.throws++;
      } else if (s.b === self) {
        this.partner = s.a;
        this.state = 'throwAssist';
      }
      return;
    }
    if (s.a === self) {
      this.partner = s.b;
      this.state = boost ? 'boost' : 'relayUp';
      if (boost) this.count.boosts++;
      else this.count.ladders++;
    } else if (s.b === self) {
      this.partner = s.a;
      this.state = boost ? 'assist' : 'relayHold';
    }
  }

  /**
   * (coop-kit A1, R34) The rappel starts (the host accepted a rope request from beside the holder; `l` = the rope point:
   * x, the edge's y, z): the floor under the rope point by a ray, the body on the rope's far side from the holder facing
   * in, the spot it stands on now as the over-the-edge path's start (and the top-out's end, should it climb back up).
   */
  private beginDescent(s: TeamStart): void {
    const g = this.g;
    const c = g.player.controller;
    const r = this.rope;
    const l = s.l!;
    this.partner = s.b;
    this.state = 'ropeOver';
    r.top = true;
    r.x = l[0];
    r.edgeY = l[1];
    r.z = l[2];
    this.a.set(r.x, r.edgeY - 0.2, r.z);
    this.b.set(r.x, r.edgeY - 30, r.z);
    const fh = g.ballistics.ray(this.a, this.b, G.STATIC);
    // (the host and the requester both checked the rope reaches a floor; a missing one is the rope's full length down)
    r.floorY = fh.hit ? fh.point.y : r.edgeY - TEAM.ropeMax;
    r.y = ropeTopY(r.edgeY);
    r.vy = 0;
    r.m0 = 0;
    // out from the holder through the rope point (the wall's far side), facing back in; no holder seen: its facing
    const hp = this.partnerPos();
    const hyaw = this.mate(s.b)?.yaw ?? Math.atan2(r.x - c.pos.x, r.z - c.pos.z);
    let dx = hp ? r.x - hp.x : Math.sin(hyaw);
    let dz = hp ? r.z - hp.z : Math.cos(hyaw);
    const d = hyp2(dx, dz);
    if (d < 0.05) {
      dx = Math.sin(hyaw);
      dz = Math.cos(hyaw);
    } else {
      dx /= d;
      dz /= d;
    }
    r.ox = dx * 0.35;
    r.oz = dz * 0.35;
    r.yaw = Math.atan2(-r.ox, -r.oz);
    r.tx = c.pos.x;
    r.ty = c.pos.y;
    r.tz = c.pos.z;
    this.ropeLipFind();
    this.count.ropes++;
    this.count.descents++;
  }

  /** The host refused a request. */
  denied(reason: string): void {
    this.count.denied++;
    this.lastDenied = reason;
    this.refused(
      reason === 'far' ? 'Too far from your partner for that' : reason === 'noTarget' || reason === 'tooHigh' ? 'No ledge to reach from here' : reason === 'notBraced' || reason === 'notOffering' ? 'Your partner is no longer offering' : reason === 'taken' ? 'Your partner is busy with someone else' : 'Not now',
    );
  }

  /** The partner (or the host) ended the move. */
  ended(k?: 'pull' | 'drop'): void {
    if (isKitState(this.state)) {
      // (mission KIT0) its move decides (default: free)
      const m = kitMoveOfState(this.state);
      if (m?.ended) m.ended(this, this.kitRunOf(m), k);
      else this.end(false);
      return;
    }
    if (k && ROPE_CLIMBER.includes(this.state)) {
      // (B7) the holder let go: slide down; topped out: already over the edge
      if (this.state === 'ropeClimb' && k === 'drop') this.slideNow('holder let go');
      // (coop-kit A1) going over the edge: finish onto the rope, then slide down
      else if (this.state === 'ropeOver' && k === 'drop') this.rope.slideAfter = true;
      return;
    }
    if (k) {
      // (B5) the hang-down ended: the holder is free; the partner is pulled up or drops
      if (HOLDER_STATES.includes(this.state)) this.end(false);
      else if (this.state === 'hangDown' || this.state === 'hanging') {
        if (k === 'drop') this.dropNow();
        else {
          this.state = 'hangPull';
          this.t = 0;
        }
      }
      return;
    }
    if (this.state === 'relayUp') {
      this.endWhy = 'relay: partner ended it';
      this.end(true);
    }
    else if (this.state === 'relayHold') this.end(false);
  }

  /** The partner's feet (its avatar), null when it is gone. (B8: the rope line reads it.) */
  partnerPos(): Vector3 | null {
    const ms = this.mates();
    for (let n = 0; n < ms.length; n++) if (ms[n]!.id === this.partner) return ms[n]!.pos;
    return null;
  }

  /** (anim-n4b, track A) The partner's facing (its avatar's yaw), NaN when it is gone: the team pose's contact. */
  partnerYaw(): number {
    const ms = this.mates();
    for (let n = 0; n < ms.length; n++) if (ms[n]!.id === this.partner) return ms[n]!.yaw;
    return NaN;
  }

  /** Climber: the step-up and toss, then onto the anchor. */
  private runBoost(dt: number): void {
    const g = this.g;
    const s = this.start!;
    const c = g.player.controller;
    const p = this.partnerPos();
    const a = g.world.level.anchors.get(s.target);
    if (!p || !a) {
      this.endWhy = !p ? 'boost: no partner' : 'boost: no anchor';
      this.end(true);
      return;
    }
    this.t += dt;
    const h = GAMEPLAY_HEIGHT;
    const hang = attachPose(a, s.s, 1, h, this.hp);
    const gy = hang.y + 1.9 * (h / 1.75);
    boostPath(this.t, this.from.x, this.from.y, this.from.z, p.x, p.y, p.z, hang.x, gy, hang.z, 1.9 * (h / 1.75), this.pt);
    this.kin.set(this.pt.x, this.pt.y, this.pt.z);
    c.override = { kinematic: this.kin, yaw: hang.yaw, turnRate: 20 };
    g.player.pose.traverse = 'climbUp';
    g.player.pose.traverseT = Math.min(1, this.t / TEAM.boostTime);
    if (this.t >= TEAM.boostTime) {
      c.override = null;
      g.player.pose.traverse = 'none';
      this.state = 'none';
      this.start = null;
      if (!g.traversal.attachCtl.attachTo(a, s.s, 'side', 1, 0.15)) this.endWhy = 'boost: attach refused';
    }
  }

  /** The thrown player: the arc over the thrower to the landing, then on the feet, crouched (B4). */
  private runThrow(dt: number): void {
    const g = this.g;
    const c = g.player.controller;
    this.t += dt;
    throwArc(this.t, this.from.x, this.from.y, this.from.z, this.to.x, this.to.y, this.to.z, this.pt);
    this.kin.set(this.pt.x, this.pt.y, this.pt.z);
    c.override = { kinematic: this.kin, yaw: Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z), turnRate: 20 };
    g.player.pose.traverse = 'vault';
    g.player.pose.traverseT = Math.min(1, this.t / TEAM.throwTime);
    if (this.t >= TEAM.throwTime) {
      c.override = null;
      g.player.pose.traverse = 'none';
      c.setCrouchToggle();
      this.state = 'none';
      this.start = null;
    }
  }

  /** Climber of the ledge relay: up the hanging partner's body to the same ledge, then hang beside them. */
  private runRelay(dt: number): void {
    const g = this.g;
    const s = this.start!;
    const c = g.player.controller;
    const a = g.world.level.anchors.get(s.target);
    if (!this.partnerPos() || !a) {
      this.endWhy = 'relay: no partner or anchor';
      this.end(true);
      return;
    }
    this.t += dt;
    const s2 = relaySlot(s.s, anchorLength(a));
    const hang = attachPose(a, s2, 1, GAMEPLAY_HEIGHT, this.hp);
    relayPath(this.t, this.from.x, this.from.y, this.from.z, hang.x, hang.y, hang.z, this.pt);
    this.kin.set(this.pt.x, this.pt.y, this.pt.z);
    c.override = { kinematic: this.kin, yaw: hang.yaw, turnRate: 20 };
    g.player.pose.traverse = 'climbUp';
    g.player.pose.traverseT = Math.min(1, this.t / TEAM.relayClimb);
    if (this.t >= TEAM.relayClimb) {
      c.override = null;
      g.player.pose.traverse = 'none';
      this.state = 'none';
      this.start = null;
      if (!g.traversal.attachCtl.attachTo(a, s2, 'side', 1, 0.15)) this.endWhy = 'relay: attach refused';
    }
  }

  /** (J9 S1, A27) A section restart puts the kit back: our own shutter move ends, every shutter drops shut at once. */
  resetKit(): void {
    if (kitKindOf(this.state) === 'shutter') this.end(true);
    const l = this.devices.list;
    for (let i = 0; i < l.length; i++) {
      const d = l[i]!;
      if (isShutterDevice(d)) resetShutter(d);
    }
  }

  /** Back to free movement. */
  end(aborted: boolean): void {
    const g = this.g;
    if (isKitState(this.state)) {
      // (mission KIT0) the kit move undoes its own overrides first
      const m = kitMoveOfState(this.state);
      if (m?.end) m.end(this, this.kitRunOf(m), aborted);
      KIT_POSE_LOCAL.k = -1;
      KIT_POSE_LOCAL.gap = NaN;
    }
    if (this.state !== 'none') this.count.ends++;
    if (HANGER_STATES.includes(this.state) || ROPE_CLIMBER.includes(this.state)) {
      this.dropRopeGrips();
      g.player.pose.tumble = 0;
      g.player.controller.override = null;
      if (g.player.pose.traverse === 'climb') g.player.pose.traverse = 'none';
    }
    this.state = 'none';
    this.start = null;
    this.offer = null;
    if (this.state === 'none' && g.player.controller.override && !g.traversal.attached) g.player.controller.override = null;
    if (g.player.pose.traverse === 'climbUp' || g.player.pose.traverse === 'brace' || g.player.pose.traverse === 'vault') g.player.pose.traverse = 'none';
  }

  /** Movement mode on the wire for this state (null: the regular one; a hanging offer rides the attach sub bit). */
  get mode(): 'brace' | 'boost' | null {
    switch (this.state) {
      case 'offer':
      case 'assist':
      case 'throwOffer':
      case 'throwAssist':
      case 'hangOffer':
      case 'hangHold':
      case 'ropeOffer':
      case 'ropeHold':
        return 'brace';
      case 'boost':
      case 'relayUp':
      case 'throw':
      case 'hangDown':
      case 'hanging':
      case 'hangPull':
      case 'hangDrop':
      case 'ropeClimb':
      case 'ropeTop':
      case 'ropeSlide':
      case 'ropeOver':
        return 'boost';
      default:
        // (mission KIT0) a kit state: the holder `brace`, the partner `boost`
        return isKitState(this.state) ? kitStateWireMode(this.state) : null;
    }
  }

  /** (B4) The team mode's sub on the wire: `THROW_SUB` for the throw (offer, throwing, thrown), else 0. (KIT0) A kit
   *  state: its move's bit (`KIT_SUB`). */
  get wireSub(): number {
    if (isKitState(this.state)) return kitStateSub(this.state);
    if (ROPE_HOLDER.includes(this.state) || ROPE_CLIMBER.includes(this.state)) return ROPE_SUB;
    if (HOLDER_STATES.includes(this.state) || HANGER_STATES.includes(this.state)) return HANG_SUB;
    return this.state === 'throwOffer' || this.state === 'throwAssist' || this.state === 'throw' ? THROW_SUB : 0;
  }

  /** (B5) The team mode's `s` on the wire: the holder's hang depth (m), else 0. (coop-kit A1) A rope climber that came
   *  from the top (the rappel): 1, so remotes can pose its over-the-edge (A2); no wire shape change. */
  get wireS(): number {
    if (isKitState(this.state)) {
      // (mission KIT0) its move's (the shutter: the gap)
      const m = kitMoveOfState(this.state);
      return m?.wireS ? m.wireS(this, this.kitRunOf(m)) : 0;
    }
    if (ROPE_CLIMBER.includes(this.state)) return this.rope.top ? 1 : 0;
    return this.state === 'hangHold' ? this.hang.depth : this.state === 'hangOffer' ? TEAM.hangStart : 0;
  }

  /** The attach sub bits to add while hanging (the relay offer, held while the partner climbs). */
  get attachBits(): number {
    return this.state === 'relayOffer' || this.state === 'relayHold' ? ATTACH_SUB.relay : 0;
  }
}
