import { crackedHandle } from '../world/doorPeek';
import { OPTIC } from '../config/tools';
import { emptyOpticPlace, opticCableEnd, opticPlaceOf } from '../player/opticCable';
import { DOOR } from '../world/doors';
import { KNEEL_STILL } from '../player/playerController';
import { tenseNear } from '../player/tenseSneak';
import { WALL, WALL_LOOK_PITCH, WALL_SUB, WALL_TURN, WALL_TURN_RATE, wallHandPoint, wallHeadYaw, wallMoveK, wallPeekOffset, wallPoint, wallRootPush, wallSideFromSub, wallTurnRate, wallYawOffset } from '../player/wallController';
import { COVER_STANDOFF } from '../world/levelBuilder';
import { muzzleBlock } from '../player/wallBlock';
import { PhysicsRaycastResult, Vector3, type PhysicsEngine } from '../core/babylon';
import type { CharacterRig, RigPose } from '../player/characterRig';
import { newTeamPoseIn, teamPoseOfWire, TeamPoser } from '../anim/clips/team'; // (anim-n4b, track A)
import type { OperatorFigure } from '../operators/runtime/figure';
import { loadPlayLods, operatorRig, partnerFigureFrame } from '../operators/runtime/playerFigure';
import { avatarFactory } from '../cosmetics/avatarFactory';
import { WeaponModel, DEFAULT_WEAPON_COLORS } from '../weapons/weaponModel';
import { WEAPONS, type WeaponId } from '../weapons/weaponDefs';
import { assignCarrySlots } from '../weapons/carrySlots';
import { classWeight } from '../weapons/weaponCarry';
import { GrenadePouches } from '../weapons/grenadePouches';
import { G, MASK } from '../physics/groups';
import type { World } from '../world/world';
import type { Vfx } from '../vfx/vfx';
import type { Ballistics } from '../weapons/ballistics';
import { ExtrapBlend, sampleSpeed, SnapshotBuffer } from './interp';
import { MOTION_WIRE, PF, type PlayerInfo, type PlayerState } from './protocol';
import { hyp2 } from '../core/mathx';
import { AttachGrips } from '../player/attachGrips';
import { easeInOut, wrapPi, type MotionState } from '../anim/motion';
import { GRAB_KILL_BLOW, KILL_SEEN, KILL_TAIL_END, killWarp, strikeWarp, TAKEDOWN_BLOW, type KillBlow } from '../anim/strikeBody';
import { MOVEMENT, RAPPEL, TEAM } from '../config/movement';
import { GAMEPLAY_HEIGHT } from '../player/attach';
import { findRopeLip, newRopeLip, ROPE_SUB, ropeLipHands, ropeSeenStep, type RopeSeen } from '../game/teamMoves';
import { attachGripWeight, climbUpFootWeight, emptyMovePose, isAttachedMode, moveKneels, poseFromMoveState, TAKEDOWN_SUB_BLOW, unpackAttachSub, type MoveCommit, type MoveMode } from '../player/moveState';
import { traversePath, type PathKind } from '../player/traversePath';
import type { TraverseKind } from '../anim/animGraph';
import { teamRowOfWire } from '../anim/tuneMoveRows';
import { moveTuneBegin, moveTuneEnd, moveTuneRoot, moveTuneSelectBase, teamContactKOfWire } from '../anim/moveTune';
import { bodyRigRoot, bodyRigWallGap } from '../anim/tune';
import { clearGripAxis } from '../player/attachGrips';
import { GRAB } from '../game/takedown';
import { easeRemoteSpeed, isShownTeleport, REMOTE_SPEED_MAX, seedHeading } from './remoteSeed';
import { bodyFromMoveState, PLAYER_OPERATOR_HEIGHT, wireKneel, type PlayerBodyIn } from '../player/playerVolumes';
import type { MoveState } from '../player/moveState';
import { RemoteShots } from './remoteShots';
import { bodyPoint, CQ, ease, holdHandsLocal, koCurve, type KoState } from '../game/closeQuarters';
import { RemoteKnife } from './remoteKnife'; // (piano-knife S3)
import { KnifeModel } from '../weapons/knifeModel';
import { WREN_HANDS } from '../operators/handFrame';

/** Rope slots per remote (`Ropes` keys). */
let ropeKeys = 0;
/** (doorPeek parity) The feet's floor probe filter, as the local player's rig (`Player`). */
const GROUND_Q = { membership: G.PLAYER, collideWith: G.STATIC };

/**
 * Another player's body, rendered from interpolated states: rig animation from speed / flags and (3.2.0) their
 * movement state - attached grips, committed moves replayed from their start, takedowns - posed by the same
 * code as the local player (`poseFromMoveState`, `AttachGrips`, `traversePath`); their weapon (stowed while both
 * hands are busy), and muzzle flashes + tracers while their firing flag is set.
 */
export class RemoteAvatar {
  readonly rig: CharacterRig;
  /** (operators 11e) Wren, drawn on the rig. */
  readonly figure: OperatorFigure;
  /** (step 13) The door-peek handle reach (world) and whether it is set. */
  private readonly doorHand = { x: 0, y: 0, z: 0 };
  private doorHandOn = false;
  /** (G7) The hold hands are on (a grab), the bend over a held guard (rad, m), scratch. */
  private grabHandOn = false;
  /** (G7 fix) Holding a guard this frame: his id ('' = none) and the MoveState ph / sub (the client poses its puppet
   *  of him from them: `EnemyPuppet.remoteHeld`). */
  holdTid = '';
  holdPh = 0;
  holdSub = 0;
  /** (piano-knife S3) The partner's knife kill posed from its MoveState, the knife in its hand (built on first use), and
   *  the guard's drawn rig by id (set once by the owner: the client's puppet, the host's enemy; null: none). */
  readonly knife = new RemoteKnife();
  private knifeModel: KnifeModel | null = null;
  private knifeOn = false;
  victimRigOf: ((tid: string) => CharacterRig | null) | null = null;
  private cqBend = 0;
  private cqDrop = 0;
  /** (coop-carry) A body on this partner's shoulder (`CarryView`): its weight 0..1 (the carry bend and lean), the
   *  shoulder (1 right, -1 left) and the body whose knees take the hands (null: none). */
  carryLoad = 0;
  carrySide = 1;
  carryKnees: { knees(outL: Vector3, outR: Vector3): void } | null = null;
  private carryHandOn = false;
  private readonly kneeL = new Vector3();
  private readonly kneeR = new Vector3();
  private hhL = { x: 0, y: 0, z: 0 };
  private hhR = { x: 0, y: 0, z: 0 };
  private koTmp: KoState = { limp: 0, lower: 0, bend: 0 };
  /** (anim-n4d, M1) The last kill blow seen (null none), its last phase, and its follow-through after the kill (the
   *  blow's phase past 1; -1 not started): as the owner's `TakedownController` tail, pose only. */
  private blowB: KillBlow | null = null;
  private blowU = 0;
  private tailU = -1;
  readonly buf = new SnapshotBuffer<PlayerState>(40, 0.25);
  /** (afp AF6) The step back from an extrapolation, blended out (`ExtrapBlend`). */
  private readonly xb = new ExtrapBlend();
  /** (afp AF6) The shown body yaw off the wall: rate-limited after a wall until it meets the owner's, as the owner's
   *  `visYaw` (player.ts: WALL_TURN.out while the wall eases out, then WALL_TURN_RATE until the gap is under 0.05). */
  private visYaw = 0;
  /** (afp AF6) The stance transition's linear clock (0 standing .. 1 crouched), as the owner's `crouchK`. */
  private crouchK = 0;
  private visLimit = false;
  /** (afp AF6) The owner's velocity at the render time (the buffer's span-middle blend, lightly smoothed; m/s). */
  private vx = 0;
  private vz = 0;
  readonly pos = new Vector3();
  yaw = 0;
  pitch = 0;
  flags = 0;
  private models = new Map<WeaponId, WeaponModel>();
  private pouches: GrenadePouches;
  private weapon: WeaponId | null = null;
  /** (coop-walk-fixes P7) The partner's rounds from its `sc` counter (one shot each, at most at the fire rate). */
  private readonly shots = new RemoteShots();
  private kick = 0;
  private crouch = 0;
  private aim = 0;
  private prev = new Vector3();
  private speed = 0;
  /** (F3) Crouched and still (s): the owner's kneel (its controller: crouched and still for `KNEEL_STILL` s). */
  private kneelT = 0;
  /** (rig-pose-fix S1 fix round, check A B1) This frame's tense sneak (no kneel beside an unaware guard), for `bodyIn`. */
  private tense = false;
  /** (G1, audit row 18) Landing recovery (s) from the fall the snapshots show, as the owner's controller times it. */
  private landT = 0;
  private airTop = Number.NaN;
  private tmpA = new Vector3();
  private tmpB = new Vector3();
  private placed = false;
  /** (partner-seed) True for the frame the rig is first placed: its eased state is seeded from the owner's. */
  private justPlaced = false;
  private seedH = { x: 0, z: 0 };
  /** Movement state posing: the grips on the anchor in use, the pose families, a committed move replaying. */
  private grips = new AttachGrips();
  private gripAnchor = -1;
  private gripFace = 1;
  private sPrev = 0;
  private mp = emptyMovePose();
  /** (PC1 fix) The head-first peek eased as the owner's (`WALL.peekBlend` each way, from the peek bit). */
  private peekK = 0;
  /** (step 11) Back to a wall: the body-line point, `s` shown (tests), the rig's push onto the face, the hand point. */
  private wp = { x: 0, z: 0, yaw: 0 };
  /** (step 12 r1) The eased wall yaw and whether it was set last frame. */
  private wallYaw = 0;
  private wallYawOn = false;
  /** (G6) Seconds on the wall (the owner's settled side-on turn rate). */
  private wallOnT = 0;
  /** (G6) The peek's root step toward the edge (world XZ, from WALL_SUB as `wallPeekOffset`). */
  private peekStep = { x: 0, z: 0 };
  /** (G6, AUDIT-WALLS row 12) The raised weapon's wall block (as the owner's, from its own ray) and its scratch. */
  private blockA = new Vector3();
  private blockB = new Vector3();
  wallS = 0;
  private wallK = 0;
  private wallNx = 0;
  private wallNz = 0;
  private wallFace = 0;
  private wallHandPt = new Vector3();
  private replay: { t: number; c: MoveCommit; path: PathKind; pose: TraverseKind } | null = null;
  private lastCommit = -1;
  /** (step 12 r1) The mode of the last replayed commit: the SWAT turn counts its own commits (`swatN`), so the same
   *  `n` in another committed mode is a new move. */
  private stowed = false;
  private kin = { x: 0, y: 0, z: 0 };
  private pa = { x: 0, y: 0, z: 0 };
  private pb = { x: 0, y: 0, z: 0 };
  /** The movement mode shown now (tests, host checks). */
  mode: MoveMode = 'ground';
  /** (rig-pose-fix S1) The capsule's yaw (the owner's; on a wall the face normal, not the side-on visual turn) and the
   *  MoveState at the render time: the sim body model's input (`bodyIn`). */
  private bodyYaw = 0;
  private bodyMv: MoveState | undefined = undefined;
  /** The attached anchor, position along it and attach sub bits of the last state (team moves: a hanging relay offer). */
  anchor = -1;
  sub = 0;
  s = 0;
  private pipeKey = 'hands>hands';
  private readonly ropeKey = `remote-${++ropeKeys}`;
  private roped = false;
  /** (optic-coop) The optic cable: the place its MoveState poses (the kneel's hand, the tip), its prop slot, shown. */
  private readonly opticPl = emptyOpticPlace();
  private readonly opticEnd = { x: 0, y: 0, z: 0 };
  private readonly opticKey = `${this.ropeKey}-optic`;
  private opticOn = false;
  /** Seconds the remote has held still on its anchor (settling onto the owner's grips waits for it). */
  private stillT = 0;
  private carryW = { low: 1, high: 0, compressed: 0 };
  /** (anim-n4b, track A) The co-op team pose from its MoveState (and our side of the move, `TEAM_LINK`), as the owner's. */
  private readonly teamPose = new TeamPoser();
  private readonly teamIn = newTeamPoseIn();
  /** (team-climb) On a team-mate's rope: seconds in, the lip (looked for once), the top-out and grips as seen. */
  private ropeT = 0;
  private ropeLooked = false;
  private readonly ropeLip = newRopeLip();
  private readonly ropeSeen: RopeSeen = { top: false, w: 0 };
  private ropeGrips = false;
  private readonly lipA = new Vector3();
  private readonly lipB = new Vector3();
  private readonly lipRay = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, n: { x: number; y: number; z: number }): number => {
    this.lipA.set(ax, ay, az);
    this.lipB.set(bx, by, bz);
    const h = this.ballistics.ray(this.lipA, this.lipB, G.STATIC);
    if (!h.hit) return 2;
    n.x = h.normal.x;
    n.y = h.normal.y;
    n.z = h.normal.z;
    const l = Vector3.Distance(this.lipA, this.lipB);
    return l > 1e-6 ? h.distance / l : 0;
  };
  /** Fire sound hook: the weapon's class and id, the muzzle, (P7) whether the round was suppressed (`PF.quiet`). */
  onFire: ((cls: string, at: Vector3, gun: WeaponId, quiet: boolean) => void) | null = null;

  constructor(
    private world: World,
    private vfx: Vfx,
    private ballistics: Ballistics,
    readonly info: PlayerInfo,
  ) {
    // (operators 11e, G123: "Both play as Wren") the partner is Wren too, posed from MoveState as before
    const op = operatorRig(world.scene, avatarFactory(world.parts, info.look, 'remote-part'), info.look, `remote-${info.id}`, (m) => world.addShadowCaster(m));
    this.rig = op.rig;
    this.figure = op.figure;
    this.rig.carrier = true;
    // (A5, G135) partner beacon: the host is player 1 (blue), a joiner player 2 (red); both ends hold `info.host`
    this.rig.setBeacon(info.host ? 1 : 2);
    loadPlayLods(this.figure);
    this.pouches = new GrenadePouches(world.parts, this.rig, undefined, false);
    for (const m of this.pouches.parts) world.addShadowCaster(m);
    // (doorPeek parity) the planted feet on the floor under them, as the owner's rig (without it they stood at the
    // snapshot root: 2 cm up wherever the owner's capsule rests off the floor, e.g. at a door peek or on a wall)
    const eng = world.scene.getPhysicsEngine() as PhysicsEngine | null;
    if (eng) {
      const rr = new PhysicsRaycastResult();
      const ga = new Vector3();
      const gb = new Vector3();
      this.rig.groundProbe = (x, z, yFrom) => {
        rr.reset();
        eng.raycastToRef(ga.set(x, yFrom, z), gb.set(x, yFrom - 1.2, z), rr, GROUND_Q);
        return rr.hasHit ? rr.hitPoint.y : null;
      };
    }
    this.rig.setEnabled(false);
  }

  /** (camera-cue fix) The eased ground speed the rig animates from (m/s). */
  get moveSpeed(): number {
    return this.speed;
  }

  get dead(): boolean {
    return (this.flags & PF.dead) !== 0;
  }

  /** (char-shadow-meter S2c) A state has been shown: `pos` is real. */
  get shown(): boolean {
    return this.placed;
  }

  /** A model for a carried weapon (created once, kept for the session). */
  private model(id: WeaponId): WeaponModel {
    let m = this.models.get(id);
    if (!m) {
      m = new WeaponModel(this.world.scene, this.world.parts, WEAPONS[id], DEFAULT_WEAPON_COLORS, this.rig.weaponPivot, undefined, { mesh: true, caster: (c) => this.world.addShadowCaster(c) });
      for (const part of m.renderMeshes) this.world.addShadowCaster(part);
      this.models.set(id, m);
    }
    return m;
  }

  /** In the hands: `id` (or stowed with the rest while climbing / in a takedown); every other carried weapon (lobby
   *  loadout + any seen held) in its own slot. */
  private setWeapon(id: WeaponId, stowed = false): void {
    if (id === this.weapon && stowed === this.stowed) return;
    this.stowed = stowed;
    for (const w of this.info.loadout) this.model(w);
    this.model(id);
    const ids = [...this.models.keys()];
    const slots = assignCarrySlots(ids.map((w) => ({ cls: WEAPONS[w].class, length: this.models.get(w)!.ext.z1 - this.models.get(w)!.ext.z0 })));
    ids.forEach((w, i) => {
      const m = this.models.get(w)!;
      const slot = slots[i];
      if (w === id && !stowed) return;
      if (slot) m.holster(this.rig, slot);
      else m.setVisible(false);
    });
    if (!stowed) this.model(id).hold(this.rig);
    this.weapon = id;
  }

  /**
   * (team-climb) A climber on a team-mate's rope (wire mode `boost` + ROPE_SUB; nothing new on the wire): the lip it goes
   * over, looked for once a moment into the climb (from its feet up to the rope's reach, along its facing); then, as the
   * owner's teamController, its hands start for the lip on the rope's last stretch and its top-out (the feet past the
   * rope's top) plays the team clip at the wire phase with the palms on the lip (`ropeSeenStep`). No allocation per frame
   * (the one search's rays may).
   */
  private ropeFrame(dt: number, roping: boolean, ph: number, mp: { traverse: TraverseKind; traverseT: number }): void {
    const rs = this.ropeSeen;
    if (!roping) {
      if (this.ropeT > 0) {
        this.ropeT = 0;
        this.ropeLooked = false;
        this.ropeLip.ok = false;
        rs.top = false;
        rs.w = 0;
        this.dropRopeGrips();
      }
      return;
    }
    this.ropeT += dt;
    if (!this.ropeLip.ok && !this.ropeLooked && this.ropeT >= 0.25) {
      this.ropeLooked = true;
      findRopeLip(this.lipRay, this.pos.x, this.pos.z, this.yaw, this.pos.y + 0.6, this.pos.y + TEAM.ropeMax + 0.5, this.ropeLip);
    }
    if (!this.ropeLip.ok) return;
    ropeSeenStep(rs, this.pos.y, this.ropeLip.y, ph, dt);
    if (rs.top) {
      mp.traverse = 'climbUp';
      mp.traverseT = ph;
    }
    if (rs.w > 0) {
      ropeLipHands(this.ropeLip, this.pos.x, this.pos.z, this.yaw, 0.25 * (this.rig.height / GAMEPLAY_HEIGHT), rs.w, this.rig.reachL, this.rig.reachR);
      this.ropeGrips = true;
    } else this.dropRopeGrips();
  }

  private dropRopeGrips(): void {
    if (!this.ropeGrips) return;
    this.ropeGrips = false;
    const rg = this.rig;
    rg.reachL.w = rg.reachR.w = 0;
    clearGripAxis(rg.reachL);
    clearGripAxis(rg.reachR);
    rg.reachL.liftOff = rg.reachR.liftOff = undefined;
  }

  /** Render-rate update at `renderTime` (in the buffer's clock). */
  update(dt: number, renderTime: number): void {
    const s = this.buf.sample(renderTime);
    if (!s) return;
    if (!this.placed) {
      this.placed = true;
      this.justPlaced = true;
      this.rig.setEnabled(true);
      this.prev.set(s.x, s.y, s.z);
      this.lastCommit = s.state.mv?.c?.n ?? -1;
      this.xb.reset();
      this.visYaw = s.yaw;
      this.visLimit = false;
    }
    // (afp AF6) a new state after an extrapolation: the step back blends out instead of showing in one frame
    this.xb.apply(s, dt);
    this.pos.set(s.x, s.y, s.z);
    this.yaw = s.yaw;
    this.bodyYaw = s.yaw;
    const st = s.state;
    const mv = st.mv;
    this.bodyMv = mv;
    this.pitch = st.pitch;
    this.flags = st.f;
    this.shots.observe(st.sc);
    this.mode = mv?.m ?? 'ground';
    this.anchor = mv?.a ?? -1;
    this.sub = mv?.sub ?? 0;
    this.s = mv?.s ?? 0;
    // a committed move (vault, mantle, roll, ...) replays from its start along the same path
    if (mv?.c && mv.c.n !== this.lastCommit) {
      this.lastCommit = mv.c.n;
      const path: PathKind = mv.m === 'windowVault' ? 'vault' : mv.m === 'landing' ? 'drop' : (mv.m as PathKind);
      this.replay = { t: 0, c: mv.c, path, pose: mv.m as TraverseKind };
    }
    const rp = this.replay;
    let replayK = -1;
    if (rp) {
      rp.t += dt;
      replayK = Math.min(1, rp.t / rp.c.dur);
      const c = rp.c;
      this.pa.x = c.x0;
      this.pa.y = c.y0;
      this.pa.z = c.z0;
      this.pb.x = c.x1;
      this.pb.y = c.y1;
      this.pb.z = c.z1;
      traversePath(rp.path, this.pa, this.pb, c.top, c.v, replayK, this.kin);
      this.pos.set(this.kin.x, this.kin.y, this.kin.z);
      if (replayK >= 1) this.replay = null;
    }
    const attached = !!mv && isAttachedMode(mv.m) && !rp;
    // (locomotion step 11) back to a wall, settled: the body line from the segment and `s` (interpolated on the same
    // segment, as the attached `s`), the yaw from the face normal
    const wseg = mv?.m === 'wall' && !rp ? this.world.level.coverSegments[mv.a] : undefined;
    if (wseg && mv!.ph >= 1) {
      const from = s.from.mv;
      const to = s.to.mv;
      const sv = from && to && from.m === 'wall' && to.m === 'wall' && from.a === to.a ? from.s + (to.s - from.s) * Math.max(0, Math.min(1, s.k)) : mv!.s;
      wallPoint(wseg, sv, COVER_STANDOFF, this.wp);
      this.bodyYaw = this.wp.yaw;
      // across the wall: where the owner's capsule actually rests (its collision skin keeps it a little out)
      const off = Math.max(-0.05, Math.min(0.1, (this.pos.x - this.wp.x) * wseg.nx + (this.pos.z - this.wp.z) * wseg.nz));
      this.pos.x = this.wp.x + wseg.nx * off;
      this.pos.z = this.wp.z + wseg.nz * off;
      // (A3) the body faces out from the wall, eased at the owner's wall turn rate (never snapped); (G6) crouched it
      // turns side-on toward the travel, at the owner's turn curves (`wallYawOffset`, `wallTurnRate`)
      if (!this.wallYawOn) this.wallOnT = 0;
      this.wallOnT += dt;
      const target = wrapPi(this.wp.yaw + wallYawOffset(this.crouch, wallSideFromSub(mv!.sub)));
      if (!this.wallYawOn) this.wallYaw = s.yaw;
      const d = wrapPi(target - this.wallYaw);
      const step = wallTurnRate(Math.abs(d), true, this.wallOnT >= WALL_TURN.settleT, this.crouch) * dt;
      this.wallYaw = wrapPi(this.wallYaw + (Math.abs(d) <= step ? d : Math.sign(d) * step));
      this.yaw = this.wallYaw;
      this.wallYawOn = true;
      this.wallS = sv;
      this.visYaw = this.wallYaw;
      this.visLimit = true;
    } else {
      this.wallYawOn = false;
      // (afp AF6) off the wall the turn back to the owner's yaw is rate-limited, as the owner's (it snapped in a frame)
      if (this.visLimit || this.wallK > 0) {
        const d = wrapPi(s.yaw - this.visYaw);
        const mx = (this.wallK > 0 ? wallTurnRate(Math.abs(d), false, false, this.crouch) : WALL_TURN_RATE) * dt;
        this.visYaw = wrapPi(this.visYaw + Math.max(-mx, Math.min(mx, d)));
        this.visLimit = Math.abs(wrapPi(s.yaw - this.visYaw)) > 0.05;
        if (!this.visLimit) this.visYaw = s.yaw;
      } else this.visYaw = s.yaw;
      this.yaw = this.visYaw;
    }
    // (locomotion step 13, D8) a door peek: the hand away from the hinge on the handle of the leaf as cracked (`ph`),
    // the side from where the body stands
    const pd = mv?.m === 'doorPeek' && !rp ? this.world.doors.list[mv.a] : undefined;
    if (pd) {
      const a = pd.anchor;
      const side = (this.pos.x - a.hinge.x) * Math.cos(a.yaw) - (this.pos.z - a.hinge.z) * Math.sin(a.yaw) >= 0 ? 1 : -1;
      crackedHandle(a, side, mv!.ph, DOOR.openAngle, this.doorHand);
      const reach = mv!.sub & 1 ? this.rig.reachL : this.rig.reachR;
      const other = mv!.sub & 1 ? this.rig.reachR : this.rig.reachL;
      // (anim-cleanup) a door handle is not a grip axis
      clearGripAxis(reach);
      reach.x = this.doorHand.x;
      reach.y = this.doorHand.y;
      reach.z = this.doorHand.z;
      reach.w = Math.min(1, reach.w + dt / 0.25);
      other.w = 0;
      this.doorHandOn = true;
    } else if (this.doorHandOn) {
      this.rig.reachL.w = this.rig.reachR.w = 0;
      this.doorHandOn = false;
    }
    // (ct-toolkit 3.2, optic-coop) the optic cable: the right hand on the feed point and the cable from it as far as the
    // owner has fed it (`ph`), placed from the door or gap and where this body kneels, as the owner's (`opticPlaceOf`)
    const opl = mv?.m === 'optic' && !rp ? opticPlaceOf(mv.sub, this.world.doors.list[mv.a]?.anchor, this.world.level.opticPoints[mv.a], this.pos.x, this.pos.z, DOOR.thickness, this.opticPl) : null;
    if (opl) {
      const r = this.rig.reachR;
      clearGripAxis(r);
      r.x = opl.hx;
      r.y = opl.hy;
      r.z = opl.hz;
      r.w = Math.min(1, mv!.ph * 3);
      const e = opticCableEnd(opl, mv!.ph, this.opticEnd);
      if (mv!.ph > 0.02) this.world.ropes.set(this.opticKey, opl.hx, opl.hy, opl.hz, e.x, e.y, e.z, OPTIC.cableR);
      else this.world.ropes.hide(this.opticKey);
      this.opticOn = true;
    } else if (this.opticOn) {
      this.rig.reachR.w = 0;
      this.world.ropes.hide(this.opticKey);
      this.opticOn = false;
    }
    // (G7, AUDIT-WALLS rows 5, 19, 20) holding a guard: the owner's hold hands in the body frame (the hostage stands
    // GRAB.hold in front on every machine), lowered with the knockout, the left hand to his jaw interrogating; the
    // bend over him from the same MoveState numbers as the owner's
    this.cqBend = 0;
    this.cqDrop = 0;
    this.holdTid = mv?.m === 'grab' && !rp ? mv.tid : '';
    this.holdPh = mv ? mv.ph : 0;
    this.holdSub = mv ? mv.sub : 0;
    if (mv?.m === 'grab' && !rp) {
      const rg = this.rig;
      holdHandsLocal(GRAB.hold, GRAB.side, this.hhL, this.hhR);
      const kill = (mv.sub & 1) !== 0;
      const inter = (mv.sub & 2) !== 0;
      let lower = 0;
      this.cqBend = CQ.holdBend;
      if (!kill && !inter && mv.ph > 0) {
        const ko = koCurve(mv.ph, this.koTmp);
        lower = ko.lower;
        this.cqBend = CQ.holdBend + (CQ.koBend - CQ.holdBend) * ko.bend;
        this.cqDrop = CQ.koDrop * ko.bend;
      }
      const e = inter ? ease(mv.ph / 0.12) * (1 - ease((mv.ph - 0.85) / 0.15)) : 0;
      clearGripAxis(rg.reachL);
      clearGripAxis(rg.reachR);
      bodyPoint(this.pos.x, this.pos.y, this.pos.z, this.yaw, this.hhL.x, this.hhL.y - 0.38 * lower + 0.1 * e, this.hhL.z + 0.12 * lower + 0.02 * e, rg.reachL);
      rg.reachL.w = 1;
      bodyPoint(this.pos.x, this.pos.y, this.pos.z, this.yaw, this.hhR.x, this.hhR.y - 0.38 * lower, this.hhR.z + 0.12 * lower, rg.reachR);
      rg.reachR.w = kill || mv.dw !== 0 ? 0 : 0.9;
      this.grabHandOn = true;
    } else if (this.grabHandOn) {
      this.rig.reachL.w = this.rig.reachR.w = 0;
      this.grabHandOn = false;
    }
    // (step 09) the weapon in hand from the owner's draw phase (host-authoritative `dw`: 0 holstered, which covers
    // busy hands on an anchor and takedowns; the sidearm from a split / an inverted hang / a hostage is drawn)
    // a holster shows from the newest state, not the interpolated one (a discrete hand state: no INTERP_DELAY on top
    // of the holster, so the remote stows within ~0.15 s of the owner's gun reaching its slot). (anim-natural N3) The
    // owner's holster now takes 0.9 / 1.0 s (pistol / rifle; a traversal's still 0.15 s, HOLSTER_TIME_MOVE): `dw` stays
    // 3 (holstering) through it, so the remote keeps the gun in hand that long and stows it in step with the owner
    // (the owner's own draw / holster motion is local; the remote holds and glides, as before)
    this.setWeapon(st.w, mv ? mv.dw === 0 || this.buf.latest()?.mv?.dw === 0 : false);
    let moved = hyp2(this.pos.x - this.prev.x, this.pos.z - this.prev.z);
    // (partner-seed) first placed, or teleported (bay start, checkpoint reset, respawn): the eased speed and the heading
    // come from the owner's state, not 0 / the jump (a partner first seen already walking slowly played a start)
    const reseed = !!mv && (this.justPlaced || isShownTeleport(moved, dt));
    this.justPlaced = false;
    const inst = dt > 0 ? moved / dt : 0;
    // (3.2.0) the owner's own speed when it sends a move state (interpolation jitter is not a gait); (afp AF6) blended
    // across the span at render rate, as the owner's pace (the older state's pace stepped at 15-20 Hz, then eased at 10 / s)
    if (mv && !rp) this.speed = Math.min(Math.max(sampleSpeed(s), 0), REMOTE_SPEED_MAX);
    else this.speed = easeRemoteSpeed(this.speed, reseed ? st.speed : inst, dt, reseed);
    // (afp AF6) the owner's velocity (the buffer's continuous span blend), smoothed over 0.04 s: the stride heading, the
    // planner's velocity and the derived lean / stop (MotionDerive) read it instead of per-frame position deltas
    const vk = reseed ? 1 : 1 - Math.exp(-dt / 0.04);
    this.vx += (s.vx - this.vx) * vk;
    this.vz += (s.vz - this.vz) * vk;
    const free = !!mv && !rp && !isAttachedMode(mv.m);
    let lx = free ? this.vx * dt : this.pos.x - this.prev.x;
    let lz = free ? this.vz * dt : this.pos.z - this.prev.z;
    if (free) moved = hyp2(lx, lz);
    if (reseed) {
      seedHeading(s.from.x, s.from.z, s.to.x, s.to.z, this.speed, dt, this.seedH);
      lx = this.seedH.x;
      lz = this.seedH.z;
      moved = hyp2(lx, lz);
    }
    this.prev.copyFrom(this.pos);
    const f = this.flags;
    // (afp AF6) the owner's stance curve (playerController.updateStance: linear over crouchTime / standTime, eased in and
    // out), the bit from the state nearer the render time (an exponential ease at 10 / s led the owner's crouch by ~0.1 s
    // and stood up late)
    const cWant = ((s.k >= 0.5 ? s.to.f : s.from.f) & PF.crouch) !== 0 ? 1 : 0;
    if (reseed) this.crouchK = cWant;
    else if (cWant > this.crouchK) this.crouchK = Math.min(cWant, this.crouchK + dt / MOVEMENT.crouchTime);
    else this.crouchK = Math.max(cWant, this.crouchK - dt / MOVEMENT.standTime);
    this.crouch = easeInOut(this.crouchK);
    const aimTarget = mv ? mv.r : f & (PF.ads | PF.firing) ? 1 : 0.15;
    this.aim += (aimTarget - this.aim) * Math.min(1, dt * 10);
    // ready position weights eased to the owner's (`MoveState.rd`)
    const rd = mv?.rd ?? 0;
    const cw = this.carryW;
    const ck = Math.min(1, dt / 0.15);
    cw.low += ((rd === 0 ? 1 : 0) - cw.low) * ck;
    cw.high += ((rd === 1 ? 1 : 0) - cw.high) * ck;
    cw.compressed += ((rd === 2 ? 1 : 0) - cw.compressed) * ck;
    this.kick = Math.max(0, this.kick - dt * 8);
    const r = this.rig.root;
    r.position.copyFrom(this.pos);
    r.rotation.y = this.yaw;
    // (pose-parity) the baked Body root offset (body fwd / up, the hold's guard gap / side), as the owner's `tuneRoot`, from
    // this rig's own applied base (identity until a bake sets one)
    const bb = this.rig.tuneSt?.bodyBase;
    if (bb) bodyRigRoot(bb, r.position, this.yaw);
    // the pose families from the movement state; on an anchor the hands and feet grip it like the player's
    const pk = wseg && mv!.sub & WALL_SUB.peek ? 1 : 0;
    this.peekK = wseg ? (pk ? Math.min(1, this.peekK + dt / WALL.peekBlend) : Math.max(0, this.peekK - dt / WALL.peekBlend)) : 0;
    const mp = mv ? poseFromMoveState(mv, this.grips.cadence(), this.mp, this.peekK) : emptyMovePose();
    // (step 11) on a wall: the rig's back onto the face and the off hand on it (as the player's rig)
    this.wallK = Math.max(0, Math.min(1, this.wallK + (wseg ? dt : -dt) / 0.2));
    if (wseg) {
      this.wallNx = wseg.nx;
      this.wallNz = wseg.nz;
    }
    const wk = this.wallK * this.wallK * (3 - 2 * this.wallK);
    if (wk > 0) {
      // (G6) as the owner (Player.frameUpdate)
      const push = (wallRootPush(COVER_STANDOFF, this.rig.p.bodyDepthHalf, Math.max(Math.abs(Math.sin(this.yaw - Math.atan2(this.wallNx, this.wallNz))), Math.abs(this.rig.shoulderTurnSin(this.wallNx, this.wallNz))), this.rig.p.shoulderHalf, this.crouch) - (bb ? bodyRigWallGap(bb) : 0)) * wk;
      r.position.x -= this.wallNx * push;
      r.position.z -= this.wallNz * push;
      // (G6, AUDIT-WALLS row 9) the peek's step toward the edge, as the owner's rig (the MoveState peek bit, eased)
      if (wseg) {
        wallPeekOffset('wall', mv!.sub, wseg.tx, wseg.tz, this.peekStep, this.peekK);
        const k = (WALL.peekStep / WALL.peekOut) * wk;
        r.position.x += this.peekStep.x * k;
        r.position.z += this.peekStep.z * k;
      }
    }
    if (wseg && mp.wall) {
      this.wallFace = wseg.nx * wseg.ax + wseg.nz * wseg.az;
      wallHandPoint(this.pos.x, this.pos.y, this.pos.z, wseg.nx, wseg.nz, wseg.tx, wseg.tz, this.wallFace, this.rig.weaponHand, this.crouch, this.wallHandPt);
      this.rig.wallHand = this.wallHandPt;
    } else this.rig.wallHand = null;
    // (anim-n4d, M1) a kill blow's follow-through: the owner's takedown ended on the kill (the wire moved on), the arc
    // plays on from contact as the owner's (a strike below takes it over)
    const blowB = mv && !rp ? (mv.m === 'takedown' && mv.sub & TAKEDOWN_SUB_BLOW ? TAKEDOWN_BLOW : mv.m === 'grab' && mv.sub & 1 ? GRAB_KILL_BLOW : null) : null;
    if (blowB) {
      this.blowB = blowB;
      this.blowU = mv!.ph;
      this.tailU = -1;
    } else if (this.blowB) {
      this.tailU = this.tailU >= 0 ? this.tailU + dt / this.blowB.dur : this.blowU >= KILL_SEEN ? 1 : KILL_TAIL_END;
      if (this.tailU < KILL_TAIL_END) mp.melee = killWarp(this.tailU, this.blowB);
      else {
        this.blowB = null;
        this.tailU = -1;
      }
    }
    // (locomotion step 10) the strike's phase eased between the two states around the render time (the sampled state is
    // the older one: a 20 Hz step in `ph` would jerk the elbow arc); a strike starting eases in from phase 0
    const sa = s.from.mv;
    const sb = s.to.mv;
    if (sb?.m === 'strike' && (mv?.m === 'strike' || mv?.m === 'ground') && !rp) {
      // (a denial blends back down; a queued second strike restarts from 0)
      const ph0 = sa?.m === 'strike' && sa.ph < sb.ph + 0.5 ? sa.ph : 0;
      mp.melee = strikeWarp(ph0 + (sb.ph - ph0) * Math.min(1, Math.max(0, s.k))); // (anim-n4c M1) as the local pose
    }
    if (attached && this.world.level.anchors.all[mv!.a]) {
      const a = this.world.level.anchors.all[mv!.a]!;
      const from = s.from.mv;
      const to = s.to.mv;
      // the position along the anchor between the two states (the same anchor), else the newest
      const sv = from && to && from.a === to.a && isAttachedMode(from.m) && isAttachedMode(to.m) ? from.s + (to.s - from.s) * Math.max(0, Math.min(1, s.k)) : mv!.s;
      const sub = unpackAttachSub(mv!.sub);
      // a new anchor, or (3.2.0) turned round on a pipe: re-grip
      if (this.gripAnchor !== mv!.a || (a.kind === 'pipeH' && sub.face !== this.gripFace)) {
        this.grips.setPipe(a, sv, sub.face, 'hands', 'hands', this.rig.height);
        this.grips.setup(a, sv, sub.face, this.rig.height);
        this.gripAnchor = mv!.a;
        this.gripFace = sub.face;
        this.sPrev = sv;
        this.pipeKey = 'hands>hands';
      }
      // (3.2.0) a horizontal pipe's sub-state and its changes: the grips re-grip as the owner's did
      if (a.kind === 'pipeH') {
        const to = sub.pipeTo ?? sub.pipe;
        const key = `${sub.pipe}>${to}`;
        if (key !== this.pipeKey) {
          this.pipeKey = key;
          this.grips.setPipe(a, sv, sub.face, sub.pipe, to, this.rig.height);
        }
        this.grips.pipeK = sub.pipeTo && sub.phase === 'on' ? mv!.ph : 1;
      }
      // (3.2.0 phase 3) a rope's sideways offset and kick-out swing, a fence's climb height
      this.grips.u = mv!.u ?? 0;
      this.grips.outOff = a.kind === 'rappel' && sub.phase === 'on' && mv!.ph > 0 ? Math.sin(Math.PI * mv!.ph) * RAPPEL.swingOut : 0;
      this.grips.aimFree = a.kind === 'rappel' ||
        a.kind === 'split' || (a.kind === 'pipeH' && sub.pipe === 'inverted' && !sub.pipeTo) ? this.aim : 0;
      const v = dt > 0 ? (sv - this.sPrev) / dt : 0;
      this.sPrev = sv;
      const vent = sub.phase === 'exit' && (sub.exit === 'ventDrop' || sub.exit === 'drop') ? { drop: 1, progress: mv!.ph, kinY: this.pos.y } : null;
      // at rest: settle onto the owner's planted grips (stepping is history dependent)
      this.stillT = Math.abs(v) < 0.01 ? this.stillT + dt : 0;
      const follow = !!mv!.gp && this.stillT > 0.25 && !mv!.gp.some((g) => Number.isNaN(g));
      if (follow) this.grips.settleTo(mv!.gp!);
      // (following the owner's grips the remote makes no stepping decisions of its own)
      // (ct-prototype E2) a climb-up holds the hands until the knee is on, the feet leave a drainpipe first
      const pullUp = sub.exit === 'climbUp' && (a.kind === 'ledge' || a.kind === 'pipeV');
      this.grips.footW = climbUpFootWeight(pullUp && sub.phase === 'exit', mv!.ph);
      this.grips.update(dt, a, sv, v, sub.face, attachGripWeight(sub.phase, mv!.ph, a.kind === 'duct' && sub.phase === 'exit' && sub.exit === 'none' ? 'crawlOut' : pullUp), this.rig, vent, !follow);
      // (G176) the rendered body sits off the gameplay root by its height's lift (visual only)
      r.position.x += this.grips.lift.x;
      r.position.y += this.grips.lift.y;
      r.position.z += this.grips.lift.z;
    } else if (this.gripAnchor >= 0) {
      this.grips.release(this.rig);
      this.gripAnchor = -1;
    }
    if (rp) {
      mp.traverse = rp.pose;
      mp.traverseT = replayK;
    }
    // (team-climb) on a partner's rope: the top-out on the team clip and the hands on the lip, as the owner's
    this.ropeFrame(dt, !!mv && !rp && mv.m === 'boost' && mv.sub === ROPE_SUB, mv ? mv.ph : 0, mp);
    // (pose-parity) the baked co-op role / traversal move sections, as the owner's (`player.ts` moveTuneSelect): the
    // partner's role from the wire, the base table only (identity until a bake sets one)
    const tuneTeam = mv && !rp ? teamRowOfWire(mv.m, mv.sub) : '';
    moveTuneSelectBase(tuneTeam, teamContactKOfWire(tuneTeam, mv ? mv.ph : 0), mp.traverse);
    moveTuneRoot(r.position, r.rotation);
    // (step 12b, D9) weapon hand from WALL_SUB.leftHand (the open side at a left edge): the rig blends the switch
    // over EDGE_HAND_TIME as the owner's did
    // (pose-parity) and off the wall the owner's left-shoulder aim (`PF.aimLeft`, every mode), as the owner's openLeft
    this.rig.openLeft = (!!mv && !rp && mp.leftHand && (mv.sub & WALL_SUB.leftHand) !== 0) || (f & PF.aimLeft) !== 0;
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const inv = moved > 1e-4 ? 1 / moved : 0;
    // hanging inverted (tumbled over): the spine aims mirrored, the raised weapon along the view in world space
    const upside = mp.tumble > 2;
    // (F3) the crouch idle kneel, as the owner's controller decides it (crouched and still a moment, free on the ground)
    // (G6) and side-on crouched on a wall (the graph kneels there only side-on, as the owner's)
    // (optic-coop) and feeding the optic cable (`moveKneels`; under a ceiling panel the owner stands: no crouch bit)
    this.kneelT = this.crouch > 0.5 && this.speed < 0.15 && moveKneels(mv?.m) ? this.kneelT + dt : 0;
    // (G1, audit row 26) the tense sneak: crouched on the ground near an unaware guard (the same guards as the owner's)
    const tense = this.crouch > 0.5 && mv?.m === 'ground' && tenseNear(this.pos.x, this.pos.z);
    this.tense = tense;
    // (G1, audit row 18) the landing clip from the fall the snapshots show (the owner's controller: recovery from 3 m/s)
    const onGround = (f & PF.grounded) !== 0 || mp.traverse !== 'none';
    if (!onGround) this.airTop = Number.isNaN(this.airTop) ? this.pos.y : Math.max(this.airTop, this.pos.y);
    else if (!Number.isNaN(this.airTop)) {
      const v = Math.sqrt(Math.max(0, 2 * 18 * (this.airTop - this.pos.y)));
      if (v > 3) this.landT = Math.min(0.7, 0.15 + (v - 3) * 0.08);
      this.airTop = Number.NaN;
    }
    this.landT = Math.max(0, this.landT - dt);
    // (afp AF6) the owner's gait clock between the two states around the render time (forward, wrapping), as the
    // owner's rig plays it (player.ts: none side-on on a wall); the CT stop's blend and held pace from the state
    const wallTurn = mp.wall ? Math.abs(Math.sin(this.yaw - Math.atan2(this.wallNx, this.wallNz))) : 0;
    const ga = s.from.gph;
    const gb = s.to.gph;
    let gaitPh = -1;
    if (free && ga !== undefined && gb !== undefined && (mv.m === 'ground' || (mv.m === 'wall' && wallTurn <= 0.5))) {
      const d = (((gb - ga) % 1) + 1) % 1;
      gaitPh = d < 0.5 ? (ga + d * Math.max(0, s.k)) % 1 : s.k >= 1 ? gb : ga;
    }
    // (afp AF6) the owner's motion state at the render time: the newer state's from the moment it began (its time in
    // it back from its stamp), else the older one's, timed on (start / stop / turn / pivot as the owner's)
    let motion: MotionState | undefined;
    let motionT = 0;
    const moA = s.from.mo;
    const moB = s.to.mo;
    if (free && moA !== undefined && moB !== undefined) {
      const el = Math.max(0, s.k) * s.span;
      const bAt = s.span - (s.to.mt ?? 0);
      if (moB !== moA && el >= bAt) {
        motion = MOTION_WIRE[moB];
        motionT = el - bAt;
      } else {
        motion = MOTION_WIRE[moA];
        motionT = (s.from.mt ?? 0) + el;
      }
    }
    // (afp AF6) the owner's acceleration across the span, in this body's frame (the lean, the mocap stop slot), as its rig
    let accelFwd: number | undefined;
    let accelSide: number | undefined;
    const axA = s.from.ax;
    const axB = s.to.ax;
    if (motion !== undefined && axA !== undefined && axB !== undefined) {
      const ka = s.k < 0 ? 0 : s.k > 1 ? 1 : s.k;
      const ax = axA + (axB - axA) * ka;
      const az = (s.from.az ?? 0) + ((s.to.az ?? 0) - (s.from.az ?? 0)) * ka;
      accelFwd = ax * sy + az * cy;
      accelSide = ax * cy - az * sy;
    }
    // (coop-carry) carrying a body: the hands on its knees over the shoulder, as the owner's (`BodyCarry.frameUpdate`)
    if (this.carryKnees && this.carryLoad > 0) {
      const rg = this.rig;
      this.carryKnees.knees(this.kneeL, this.kneeR);
      clearGripAxis(rg.reachL);
      clearGripAxis(rg.reachR);
      rg.reachR.x = this.kneeR.x;
      rg.reachR.y = this.kneeR.y;
      rg.reachR.z = this.kneeR.z;
      rg.reachR.w = this.carryLoad;
      rg.reachL.x = this.kneeL.x;
      rg.reachL.y = this.kneeL.y - 0.05;
      rg.reachL.z = this.kneeL.z;
      rg.reachL.w = 0.8 * this.carryLoad;
      this.carryHandOn = true;
    } else if (this.carryHandOn) {
      this.rig.reachL.w = this.rig.reachR.w = 0;
      this.carryHandOn = false;
    }
    const rpose: RigPose = {
      speed: this.speed,
      kneel: this.kneelT > KNEEL_STILL && !tense,
      tense,
      landing: Math.min(1, this.landT * 2),
      localX: (lx * cy - lz * sy) * inv,
      localZ: (lx * sy + lz * cy) * inv,
      grounded: (f & PF.grounded) !== 0 || mp.traverse !== 'none',
      // (afp AF6) free on foot: the owner's velocity and turn rate at the render time (the rig measured both from the
      // interpolated root, whose 15-20 Hz corners stepped the gait clock and the derived stop)
      velX: free ? this.vx : undefined,
      velZ: free ? this.vz : undefined,
      yawRate: free && !this.visLimit && !this.wallYawOn ? s.vyaw : undefined,
      phase: gaitPh >= 0 ? gaitPh : undefined,
      quickStop: free ? (st.qs ?? 0) : 0,
      holdSpeed: free ? (st.hs ?? 0) : 0,
      motion,
      motionT,
      accelFwd,
      accelSide,
      crouch: this.crouch,
      aimPitch: (upside ? -this.pitch : this.pitch) * this.aim,
      aimYaw: mv ? (upside ? -wrapPi(mv.ay + Math.PI) : mv.ay) * this.aim : 0,
      aimWorldYaw: upside && mv ? this.yaw + mv.ay : undefined,
      aimWorldPitch: upside ? this.pitch : undefined,
      tumble: mp.tumble,
      // lowered: only the head glances where the owner looks (as the player's rig)
      // (G6) on a wall: the owner's `wallHeadYaw` (further while sliding, ahead side-on)
      lookYaw: mp.wall ? wallHeadYaw(mp.wallSide, wallMoveK(this.speed), this.crouch, wrapPi(this.yaw - this.wp.yaw), this.aim, Math.abs(mp.lean) / WALL.peekLean) : mv ? Math.max(-1.1, Math.min(1.1, mv.ay)) * 0.5 * (1 - this.aim) : 0,
      lookPitch: Math.max(-0.6, Math.min(0.6, this.pitch)) * 0.5 * (1 - this.aim) - (mp.wall ? WALL_LOOK_PITCH * wallMoveK(this.speed) * (1 - this.aim) : 0),
      aim: this.aim,
      carry: this.carryW,
      // (feature/weapons) the held gun's mass factor, as the owner's rig (a raised sidearm is held out: PISTOL_REACH)
      weight: this.weapon ? (WEAPONS[this.weapon].weight ?? classWeight(WEAPONS[this.weapon].class)) : 1,
      kick: this.kick,
      wall: mp.wall,
      // (doorPeek parity) the door peek's feet on the stance spots when still, as the owner's
      settleFeet: mp.settle,
      // (A1.2) as the owner: free movement strides along the facing (no faceGoal: the planner caps its turn guess)
      stride: this.aim > 0.5 || mp.wall || mp.settle ? 'velocity' : 'facing',
      wallSide: mp.wallSide,
      wallTurn,
      wallBlock: this.aim > 0.05 && mv && !upside ? muzzleBlock(this.ballistics, this.pos.x, this.pos.y, this.pos.z, this.yaw + mv.ay, this.pitch, this.crouch, this.blockA, this.blockB) : 0,
      wallNx: this.wallNx,
      wallNz: this.wallNz,
      wallFace: this.wallFace,
      lean: mp.lean,
      traverse: mp.traverse,
      traverseT: mp.traverseT,
      // (anim-n4b) the replayed move's geometry: the mantle's hand plant on the edge
      traverseH: rp ? rp.c.top - rp.c.y0 : 0,
      traverseD: rp ? hyp2(rp.c.x1 - rp.c.x0, rp.c.z1 - rp.c.z0) : 0,
      // (anim-joints J2, A6) the partner's own team role (its move mode and sub on the wire): the tuner's team rows
      tuneTeam: mv ? teamRowOfWire(mv.m, mv.sub) : '',
      melee: mp.melee,
      bend: this.cqBend + CQ.carryBend * this.carryLoad,
      bendDrop: this.cqDrop + CQ.carryDrop * this.carryLoad,
      // (coop-carry) the carry walk and its lean away from the loaded shoulder, as the owner's pose
      carryBody: this.carryLoad > 0,
      carrySide: this.carrySide * this.carryLoad,
    };
    // (piano-knife S3) a knife kill: the knife in hand (the gun hand hold steps aside: `holdingKnife`; the weapon is
    // holstered from the owner's `dw`), her clip and hands on the guard as drawn here (`RemoteKnife`)
    const kOn = !!mv && !rp && !this.dead && this.knife.read(mv);
    if (kOn) {
      let km = this.knifeModel;
      if (!km) km = this.knifeModel = new KnifeModel(this.world.scene, this.rig, WREN_HANDS.R, (m) => this.world.addShadowCaster(m));
      if (!km.visible) km.show(true);
      this.knifeOn = true;
      this.knife.attacker(this.rig, this.victimRigOf ? this.victimRigOf(this.knife.tid) : null, km);
    } else if (this.knifeOn) {
      this.knifeOn = false;
      this.knife.off(this.rig);
      this.knifeModel?.show(false);
    }
    // (anim-n4b, track A) a team move: the holder's working body / the leg-up's push, from the same state as the owner's
    teamPoseOfWire(mv && !rp ? mv.m : '', mv ? mv.sub : 0, mv ? mv.s : 0, mv ? mv.ph : 0, this.info.id, this.teamIn);
    this.teamPose.begin(dt, this.teamIn, rpose, this.rig);
    moveTuneBegin(rpose, this.rig); // (pose-parity) the move sections selected above
    try {
      this.rig.animate(dt, rpose);
    } finally {
      moveTuneEnd(this.rig);
      this.teamPose.end(this.rig);
    }
    // (3.2.0 phase 3) on a rope: draw it from the anchor to the harness
    const ra = mv?.m === 'rappel' ? this.world.level.anchors.all[mv.a] : null;
    if (ra && ra.kind === 'rappel') {
      const h = this.rig.hips;
      h.computeWorldMatrix(true);
      const hp = h.getAbsolutePosition();
      this.world.ropes.set(this.ropeKey, ra.top.x - ra.nx * 0.25, ra.top.y + 0.55, ra.top.z - ra.nz * 0.25, hp.x, hp.y, hp.z);
      this.roped = true;
    } else if (this.roped) {
      this.world.ropes.hide(this.ropeKey);
      this.roped = false;
    }
    // downed: lie on the side
    r.rotation.z = this.dead ? Math.PI / 2 : 0;
    if (this.dead) r.position.y += 0.22;
    // Wren on the rig (render only)
    partnerFigureFrame(this.figure, this.rig, dt, this.world.scene.activeCamera);
    this.fireVisuals(dt);
  }

  private fireVisuals(dt: number): void {
    if (this.dead || !this.weapon) {
      this.shots.clear();
      return;
    }
    const def = WEAPONS[this.weapon];
    // (coop-walk-fixes P7) one round per step of the partner's counter (was: every fire interval while `PF.firing`,
    // fired within 0.2 s, was set: a single shot played twice)
    if (!this.shots.step(dt, Math.max(0.06, 60 / def.rpm))) return;
    const quiet = (this.flags & PF.quiet) !== 0;
    const m = this.models.get(this.weapon)!;
    const muzzle = m.muzzleWorld(this.tmpA);
    const cp = Math.cos(this.pitch);
    const end = this.tmpB.set(muzzle.x + Math.sin(this.yaw) * cp * 60, muzzle.y + Math.sin(this.pitch) * 60, muzzle.z + Math.cos(this.yaw) * cp * 60);
    const hit = this.ballistics.ray(muzzle, end, MASK.WORLD | G.GLASS_ARMOURED);
    this.vfx.tracer(muzzle, hit.point, def.tracer, def.pellets > 1 ? 0.012 : 0.02);
    // (P7) a suppressed round's flash is small, as the owner's own (`PlayerWeapons.shoot`)
    this.vfx.muzzleFlash(muzzle, (def.pellets > 1 ? 0.3 : 0.2) * (quiet ? 0.35 : 1));
    this.kick = 1;
    this.onFire?.(def.class, muzzle, def.id, quiet);
  }


  /**
   * (rig-pose-fix S1, G11 / G12) The sim body model's input from this copy at the render time: the interpolated
   * position, the owner's capsule yaw, the eased crouch and peek, the kneel, the pace and its sideways share, the
   * MoveState's mode fields and the attach lift. A partner's friendly-fire volumes (client `PartnerTarget`, host
   * `partnerBoxes`) come from `playerBody` on it, never from this rig's pose. No allocation.
   */
  bodyIn(out: PlayerBodyIn): PlayerBodyIn {
    out.x = this.pos.x;
    out.y = this.pos.y;
    out.z = this.pos.z;
    out.yaw = this.bodyYaw;
    out.crouch = this.crouch;
    out.kneel = wireKneel(this.kneelT, this.tense, KNEEL_STILL);
    out.speed = this.speed;
    const sp = hyp2(this.vx, this.vz);
    out.strafe = sp > 0.01 ? Math.abs(this.vx * Math.cos(this.bodyYaw) - this.vz * Math.sin(this.bodyYaw)) / sp : 0;
    out.pitch = this.pitch;
    out.height = PLAYER_OPERATOR_HEIGHT;
    bodyFromMoveState(this.bodyMv, this.peekK, out);
    const att = !!this.bodyMv && isAttachedMode(this.bodyMv.m);
    const l = this.grips.lift;
    out.liftX = att ? l.x : 0;
    out.liftY = att ? l.y : 0;
    out.liftZ = att ? l.z : 0;
    return out;
  }
  dispose(): void {
    if (this.opticOn) this.world.ropes.hide(this.opticKey);
    this.pouches.dispose();
    for (const m of this.models.values()) m.dispose();
    this.models.clear();
    this.knifeModel?.dispose();
    this.knifeModel = null;
    this.figure.dispose();
    this.rig.dispose();
  }
}
