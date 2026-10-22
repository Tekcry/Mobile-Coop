import { PhysicsRaycastResult, Vector3, type PhysicsEngine } from '../core/babylon';
import type { SwapReach } from '../anim/clips/actions';
import type { InputState } from '../input/inputState';
import type { Settings } from '../core/settings';
import type { World } from '../world/world';
import type { AvatarLook } from '../cosmetics/avatarLook';
import type { CharacterRig, RigPose } from './characterRig';
import type { OperatorFigure } from '../operators/runtime/figure';
import { loadPlayLods, operatorRig } from '../operators/runtime/playerFigure';
import { PlayerController, type PlayerInput } from './playerController';
import { ShoulderCamera } from './shoulderCamera';
import { avatarFactory } from '../cosmetics/avatarFactory';
import { DRAW_RAISE, WeaponCarry, emptyCarryInput } from '../weapons/weaponCarry';
import { wrapPi } from '../anim/motion';
import { hyp2 } from '../core/mathx';
import { CT, MOVEMENT } from '../config/movement';
import { gearCap } from './speedGears';
import { GEARS } from '../config/movement';
import { G } from '../physics/groups';
import { WALL, WALL_LOOK_PITCH, WALL_TURN, WALL_TURN_RATE, wallHandPoint, wallHeadYaw, wallMoveK, wallRootPush, wallTurnRate, wallYawOffset } from './wallController';
import type { TraverseKind } from '../anim/animGraph';
import { emptyStanceInput, WeaponStance, type WeaponStateId } from './weaponStance';
import { TUNE_LOCAL, TUNE_STATE, tuneBegin, tuneEnd, tuneRoot } from '../anim/tune';
import { WEIGHT_POSE, weightFrameIn, weightJumpKind } from '../anim/weight';
import { weightBegin, weightEnd } from './weightTune';
import { handsWeaponOf } from '../anim/tuneHands';
import { tuneV2Frame } from '../anim/tuneV2Sections';
import { tuneGuardFrame } from '../anim/tuneGuard';
import { tuneKeysFrame } from '../anim/tuneKeys';
import { MOVE_TUNE_TEAM, moveTuneBegin, moveTuneEnd, moveTuneRoot, moveTuneSelect } from '../anim/moveTune';
import { TEAM_POSE_LOCAL, TeamPoser } from '../anim/clips/team'; // (anim-n4b, track A)

/** Pose inputs other systems (back-to-wall, traversal, takedowns, team moves) drive on the player's rig. */
export interface PlayerPose {
  /** Back to a wall (set by back-to-wall, step 11). */
  wall: boolean;
  /** Wall side in the character's frame (-1 left, 1 right): the slide's facing (step 11). */
  wallSide: number;
  /** (step 11) The wall's outward normal and tangent (a -> b) and the body line's distance from the face (m). */
  wallNx: number;
  wallNz: number;
  wallTx: number;
  wallTz: number;
  wallGap: number;
  /** (step 11) The face plane: n . p on the wall's face. */
  wallFace: number;
  /** Lean around an edge (-1 left .. 1 right), hips planted. */
  lean: number;
  /** (step 12b, D10) World height the head stays under (low-wall side lean), NaN = none. */
  headCap: number;
  traverse: TraverseKind;
  traverseT: number;
  /** (anim-n4b) The committed move's top above its start feet and start-to-end distance (m; the traversal sets them while
   *  a move runs): the mantle's hand plant. */
  traverseH?: number;
  traverseD?: number;
  /** Takedown strike progress 0..1, or < 0. */
  melee: number;
  /** (G7) Close quarters (a held guard, a body lifted / carried / put down): spine bend (rad), pelvis drop (m), the
   *  hold's side sway (m). Set each fixed step by GameState from the takedown and stealth controllers. */
  bend: number;
  bendDrop: number;
  sway: number;
  /** (G7) A scripted step-in under a kinematic override: the legs step from the measured speed. */
  freeGait: boolean;
  /** (marlow-bays T1a) The bend is over a body (the stealth controller's lift / carry / drop), not a held guard. */
  carryBody?: boolean;
  /** (anim-n4) The carried body's load: its shoulder (1 right, -1 left) x its weight on it (0..1, the hoist / put down). */
  carrySide?: number;
  /** (anim-n4 fix) The body lift's step-in 0..1, -1 no lift (the rig's lift crouch pose). */
  liftStep?: number;
  /** (3.2.0) Whole-body tumble about the hips (rad; pipe legs up / inverted), 0 = upright. */
  tumble: number;
  /** (G6) The rig root's step toward a wall edge while peeking (world XZ, m; `WallCore.stX`). Visual only. */
  wallStepX?: number;
  wallStepZ?: number;
  /** (doorPeek parity) Still, the feet settle on the stance spots (`RigPose.settleFeet`): the door peek, set by GameState. */
  settle?: boolean;
}

const Q = { membership: G.PLAYER, collideWith: G.STATIC };

/**
 * The local player: input -> controller (fixed step) -> camera + rig (per frame). Owns the weapon carry
 * state (ready positions, raise-to-fire) and the context probes that pick a ready position (walls in
 * front, tight corridors). Look input is rate-capped so the view never out-turns the body.
 */
export class Player {
  readonly controller: PlayerController;
  readonly rig: CharacterRig;
  /** (operators 11e, D31 / G123) Wren, drawn on the rig; the rig stays the gameplay and pose body. */
  readonly figure: OperatorFigure;
  readonly cam: ShoulderCamera;
  readonly carry = new WeaponCarry();
  readonly carryIn = emptyCarryInput();
  /** (anim-rework S1) The weapon state: holstered / low ready / aiming / the sling draw (`weaponStance.ts`). X taps
   *  holster / draw, X held reloads while drawn, LT (RMB, the `ads` action) held aims. */
  readonly stance = new WeaponStance();
  private readonly stanceIn = emptyStanceInput();
  /** (M4) Set by GameState each step: a traversal or a busy move (attached, a team move, a takedown, a carry, a strike)
   *  holds the weapon state: the gun goes away for it and comes back to the state it had. */
  weaponSuspend = false;
  /** Set by GameState each step: holding a guard (X does nothing; the aim is the pistol shield). */
  weaponLocked = false;
  /** Set by GameState each step: the input is blanked (a held context menu, the gadget wheel). */
  inputBlank = false;
  /** The aim is wanted (LT / RMB held, never a toggle; `forceAds`). `ads` is that, gated by what
   *  the body allows (a hard landing, a climb); gameplay that asks for the one-handed sidearm while attached reads this
   *  raw request. */
  adsWanted = false;
  /** Aiming (the over-the-shoulder camera, the raise, the trigger). */
  ads = false;
  /** Aim regardless of input (tests and scripted sequences). */
  forceAds = false;
  /** Set by weapons when firing (kept for callers; the carry's raise now drives the pose). */
  aimLockTimer = 0;
  kick = 0;
  alive = true;
  /** Reload progress 0..1 (or -1), set by PlayerWeapons for the animation layer. */
  reload = -1;
  /** (G2, AUDIT-AIM row 16) A reload asked for while holstered (A43): the draw comes straight to the compressed ready. */
  reloadQueued = false;
  /** Reload is the empty one; weapon swap and grenade throw progress 0..1 or -1 (set by PlayerWeapons). */
  reloadEmpty = false;
  swapT = -1;
  /**
   * (3.2.0) Aiming a sidearm while attached (split, hanging inverted): the aim's centre (world yaw), its yaw half
   * range and pitch band (rad, + up), and whether the body hangs upside down. Null: no aiming while traversing.
   */
  attachAim: { yaw: number; range: number; pitchMin: number; pitchMax: number; inverted: boolean } | null = null;
  /**
   * (operators step 11e, G176) Visual only: the rig root's offset from the controller's (gameplay) root while attached,
   * so a body shorter than the 1.75 m gameplay height still meets its grips. Written by the attach controller each
   * render frame (zero when not attached); gameplay never reads it.
   */
  readonly rootLift = { x: 0, y: 0, z: 0 };
  /** Where the hand holsters the outgoing gun and draws the next (carry slot kinds). */
  swapFrom: SwapReach = 'backC';
  swapTo: SwapReach = 'backC';
  grenadeT = -1;
  private rigPose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, lookYaw: 0, lookPitch: 0 };
  /** Seconds since the last shot and weapon mass factor (set by PlayerWeapons). */
  sinceShot = 99;
  /** (step 09) The weapon is drawn (`PlayerWeapons.drawPhase` 2, set by the weapons each step): only then does
   *  the trigger raise the carry (holstered, fire does nothing). */
  weaponDrawn = false;
  weaponWeight = 1;
  /** (G6, AUDIT-WALLS row 12) A wall right in front of the raised weapon (0..1; set by GameState each fixed step). */
  muzzleBlock = 0;
  /** Pose driven by back-to-wall / traversal / takedowns / team moves. */
  /** (step 11) Back-to-wall blend 0..1 (the rig's push onto the face) and the off hand's wall point. */
  private wallK = 0;
  /** (21w) The rig root's yaw (rate-limited on a wall). */
  private visYaw = 0;
  /** (G6) Seconds on the wall this time (the settled side-on turn rate). */
  private wallT = 0;
  private wallHandPt: Vector3 | null = null;
  readonly pose: PlayerPose = { wall: false, wallSide: 0, wallNx: 0, wallNz: 0, wallTx: 0, wallTz: 0, wallGap: 0, wallFace: 0, lean: 0, headCap: NaN, traverse: 'none', traverseT: 0, melee: -1, tumble: 0, bend: 0, bendDrop: 0, sway: 0, freeGait: false };
  /** Context flags for the ready position (set by the corner systems each step). */
  context = { doorway: false };
  /** Called when landing from a fall (speed in m/s). */
  onLand: ((speed: number) => void) | null = null;
  /** (locomotion step 17) A landing in a band (`LandingKind`: soft / roll / heavy) and a foot plant (rumble). */
  onLanding: ((kind: string) => void) | null = null;
  onFootPlant: (() => void) | null = null;
  /** (anim-weight) The carried-gear spring's offset (body frame, m) for the carried guns (PlayerWeapons sets it). */
  onWeightGear: ((dx: number, dy: number, dz: number) => void) | null = null;
  /** (anim-weight) The Weight layers' frame input (reused) and last frame's foot plant, motion state and traversal. */
  private readonly weightIn = weightFrameIn();
  /** (anim-n4b, track A) The co-op team pose (the holder's working body, the leg-up's push) from TEAM_POSE_LOCAL. */
  private readonly teamPose = new TeamPoser();
  private weightPlant = false;
  private weightMotion = '';
  private weightTraverse = 'none';
  /** (F1) The draw wanted last step: holstering (its falling edge) resets the shoulder to the right. */
  private wasDrawn = false;
  private landingsSeen = 0;
  private wasGrounded = true;
  private fallSpeed = 0;
  private probeT = 0;
  private rr = new PhysicsRaycastResult();
  private a = new Vector3();
  private b = new Vector3();

  constructor(
    readonly world: World,
    look: AvatarLook,
    spawn: { pos: Vector3; yaw: number },
    private getSettings: () => Settings,
  ) {
    this.controller = new PlayerController(world.scene, spawn.pos, spawn.yaw);
    const op = operatorRig(world.scene, avatarFactory(world.parts, look, 'player-part'), look, 'player', (m) => world.addShadowCaster(m));
    this.rig = op.rig;
    this.figure = op.figure;
    this.rig.carrier = true;
    loadPlayLods(this.figure);
    this.cam = new ShoulderCamera(world.scene);
    this.cam.yaw = spawn.yaw;
    // (F1, playtest 2) every mission starts on the right shoulder (`gameplay.defaultShoulder` is no longer read)
    this.cam.shoulder = 1;
    this.applyFov();
    const eng = world.scene.getPhysicsEngine() as PhysicsEngine;
    this.rig.groundProbe = (x, z, yFrom) => {
      this.rr.reset();
      eng.raycastToRef(this.a.set(x, yFrom, z), this.b.set(x, yFrom - 1.2, z), this.rr, Q);
      return this.rr.hasHit ? this.rr.hitPoint.y : null;
    };
  }

  get position(): Vector3 {
    return this.controller.pos;
  }

  /** (anim-rework S1) The weapon state this step (holstered / lowReady / aiming / slingDraw; read by the anim code). */
  get weaponState(): WeaponStateId {
    return this.stance.state;
  }

  /** (anim-rework S1) The gun is wanted out (low ready or aiming) and nothing holds it away (the weapons draw it). */
  get drawWanted(): boolean {
    return this.stance.drawWanted;
  }

  /** Weapon raised enough to be "aiming" (tightest turn and look rates). */
  get aiming(): boolean {
    return this.carry.raise > 0.5;
  }

  private ray(from: Vector3, to: Vector3): boolean {
    this.rr.reset();
    (this.world.scene.getPhysicsEngine() as PhysicsEngine).raycastToRef(from, to, this.rr, Q);
    return this.rr.hasHit;
  }

  private applyFov(): void {
    const v = this.getSettings().video;
    this.cam.baseFovDeg = v.fovH;
    this.cam.maxFovDeg = v.maxFov;
  }

  /** Walls in front (muzzle would clip) and close on both sides (corridor): picks compressed/high ready. */
  private probeContext(): void {
    const c = this.controller;
    const yaw = this.cam.yaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const y = c.pos.y + (c.crouched ? 0.9 : 1.35);
    const reach = 0.95;
    this.carryIn.nearWall = this.ray(this.a.set(c.pos.x, y, c.pos.z), this.b.set(c.pos.x + fx * reach, y, c.pos.z + fz * reach));
    const side = 0.8;
    const left = this.ray(this.a.set(c.pos.x, y, c.pos.z), this.b.set(c.pos.x - fz * side, y, c.pos.z + fx * side));
    const right = this.ray(this.a.set(c.pos.x, y, c.pos.z), this.b.set(c.pos.x + fz * side, y, c.pos.z - fx * side));
    this.carryIn.tight = left && right;
  }

  /** Simulation step. */
  fixedUpdate(dt: number, inp: InputState): void {
    const s = this.getSettings();
    const c = this.controller;
    // (anim-rework S1) the three weapon states: X taps holster / draw (held: reload while drawn), LT / RMB held aims
    // (from holstered through the slower sling draw), release drops to low ready; a traversal holsters for the move and
    // the state comes back after it (M4)
    const si = this.stanceIn;
    // (a scripted tap, `InputState.tap('draw')`: pressed with no down, reads as a one-step press)
    si.xDown = inp.down('draw') || inp.pressed('draw');
    si.aimDown = inp.down('ads');
    si.alive = this.alive;
    // (the one-handed sidearm aim from an attach counts too: its LT never sets the free state's low ready)
    si.suspended = this.weaponSuspend || this.pose.traverse !== 'none' || this.attachAim !== null;
    si.locked = this.weaponLocked;
    si.gunOut = this.weaponDrawn;
    si.forceAim = this.forceAds;
    si.blank = this.inputBlank;
    this.stance.update(dt, si);
    this.adsWanted = this.stance.aimWanted;
    this.ads = this.adsWanted;
    // a hard landing lowers the weapon for a moment (the aim is still wanted: it comes back up); a climb puts it away
    if (c.weaponBlocked) this.ads = false;
    if (this.pose.traverse !== 'none' && !this.attachAim) this.ads = false;
    // G17: the shoulder swap works only while aiming
    if (inp.pressed('shoulderSwap') && this.ads) this.cam.swapShoulder();
    // (F1, playtest 2 "always reset to right hand side aiming") a left-shoulder swap lasts only while drawn: holstering
    // (X, a climb, death) resets to the right, so the holstered camera sits over the right shoulder and the next draw is
    // on the right. A hard landing's brief lowering keeps the draw wanted, so it keeps the side.
    const drawn = this.stance.drawWanted || this.adsWanted;
    if (this.wasDrawn && !drawn) this.cam.resetShoulder();
    this.wasDrawn = drawn;
    this.controller.weightDrawn = drawn; // (anim-weight) the Weight section's drawn group (momentum)
    this.aimLockTimer = Math.max(0, this.aimLockTimer - dt);

    // weapon carry: ready position from context, raised only to aim or fire
    this.probeT -= dt;
    if (this.probeT <= 0) {
      this.probeT = 0.1;
      this.probeContext();
    }
    const ci = this.carryIn;
    ci.ads = this.ads;
    // (A3) the trigger is live only while aiming: no raise-to-fire from low ready
    ci.fire = this.alive && this.weaponDrawn && this.ads && inp.down('fire');
    ci.sinceShot = this.sinceShot;
    ci.doorway = this.context.doorway;
    ci.dashing = c.weaponBlocked;
    // reloading, swapping and throwing all keep the weapon tucked in and down
    // (F6) a long gun's draw from the back raises with its travel once it leaves the slot (no low-ready dip first);
    // (CT prototype G2, AUDIT-AIM row 7) the pistol's draw from the holster raises with its travel too (it waited for the
    // whole clip at the compressed ready: about 0.8 s to the eye; CT about 0.55 s)
    // (G2, row 16) a reload asked for while holstered draws straight to the compressed ready (no low-ready pass)
    // (a gun-to-gun swap keeps the raise until the next gun leaves its slot, 0.5: the hands are empty before it)
    const backDraw = this.swapT >= (this.swapFrom === this.swapTo ? DRAW_RAISE.from : 0.5) && (this.swapTo === 'backL' || this.swapTo === 'backC' || this.swapTo === 'backR' || this.swapTo === 'thigh');
    ci.reloading = this.reload >= 0 || this.reloadQueued || (this.swapT >= 0 && !backDraw) || this.grenadeT >= 0;
    ci.raiseTime = backDraw ? DRAW_RAISE.time : 0;
    ci.traversing = this.pose.traverse !== 'none' && !this.attachAim;
    ci.coverRaise = this.pose.lean !== 0;
    ci.weight = this.weaponWeight;
    this.carry.update(dt, ci);

    const pi: PlayerInput = {
      moveX: inp.move.x,
      moveY: inp.move.y,
      crouchPressed: inp.pressed('crouch'),
      crouchHeld: inp.down('crouch'),
      crouchToggle: s.gameplay.crouchToggle,
      ads: this.ads,
      aiming: this.aiming,
      reloading: this.reload >= 0,
    };
    if (!this.alive) pi.moveX = pi.moveY = 0;
    c.fixedUpdate(dt, pi, this.cam.yaw);
    if (!c.grounded) this.fallSpeed = Math.max(this.fallSpeed, -c.cc.getVelocity().y);
    if (c.grounded && !this.wasGrounded && this.fallSpeed > 4) this.onLand?.(this.fallSpeed);
    if (c.grounded) this.fallSpeed = 0;
    this.wasGrounded = c.grounded;
    if (c.landings !== this.landingsSeen) {
      this.landingsSeen = c.landings;
      this.onLanding?.(c.lastLanding);
    }
  }

  /** Render-rate update: look, camera, animation. */
  /** Controller teleports seen (each resets the feet). */
  private teleportsSeen = 0;
  /** Foot plants (heel strikes on the ground) so far, and the side of the last one (-1 left, 1 right). Read by the
   *  movement foley; cosmetic. */
  footPlants = 0;
  footPlantSide = 1;

  frameUpdate(dt: number, alpha: number, look: { x: number; y: number }, move?: { x: number; y: number }): void {
    const c = this.controller;
    if (this.alive && dt > 0) {
      // free orbit: look input applies in full, the same frame, in every state (the body never holds
      // the view back; when aiming the body turns to the view instead)
      this.cam.addLook(look.x, look.y);
      // (3.2.0) a sidearm from a split / an inverted hang: the aim stays within the band the body can turn to
      const at = this.attachAim;
      if (at && this.carry.raise > 0.05) {
        const d = wrapPi(this.cam.yaw - at.yaw);
        if (Math.abs(d) > at.range) this.cam.yaw = at.yaw + Math.sign(d) * at.range;
        this.cam.pitch = Math.max(at.pitchMin, Math.min(at.pitchMax, this.cam.pitch));
      }
    }
    this.cam.adsTarget = this.ads ? 1 : 0;
    this.applyFov();
    c.interpolate(alpha);
    this.cam.crouch = c.crouchBlend;
    this.cam.lean = this.pose.lean;
    this.cam.update(dt, c.renderPos, c.crouchBlend);
    this.world.frame(c.renderPos, dt);

    const root = this.rig.root;
    root.position.copyFrom(c.renderPos);
    root.position.x += this.rootLift.x;
    root.position.y += this.rootLift.y;
    root.position.z += this.rootLift.z;
    // (step 21w, A85) on a wall, entering it and leaving it, the body's turn is rate-limited (the 180 deg entry turn
    // was ~44 deg in one frame): visual only, the capsule and gameplay keep the controller's yaw
    // (step 21w, A85: WALL_TURN_RATE, shared with the remote copy) keep limiting after the wall until the gap closes,
    // so a large turn just after leaving never snaps the rest in one frame
    // (G6) crouched on a wall the body turns side-on toward the travel (AUDIT-WALLS row 1: `wallYawOffset`), and the
    // turn follows CT's curves (`wallTurnRate`: the front-loaded entry, the 0.45 s side-on reversal, the turn-out)
    const cp = this.pose;
    this.wallT = cp.wall ? this.wallT + dt : 0;
    const visGoal = cp.wall ? wrapPi(c.renderYaw + wallYawOffset(c.crouchBlend, cp.wallSide)) : c.renderYaw;
    if (cp.wall || this.wallK > 0 || Math.abs(wrapPi(visGoal - this.visYaw)) > 0.05) {
      const d = wrapPi(visGoal - this.visYaw);
      const mx = (cp.wall || this.wallK > 0 ? wallTurnRate(Math.abs(d), cp.wall, this.wallT >= WALL_TURN.settleT, c.crouchBlend) : WALL_TURN_RATE) * dt;
      this.visYaw = wrapPi(this.visYaw + Math.max(-mx, Math.min(mx, d)));
    } else this.visYaw = c.renderYaw;
    root.rotation.y = this.visYaw;
    tuneRoot(root.position, this.visYaw); // (anim-tuner) visual body offset, identity unless a slider moved
    // (anim-studio-2) the co-op role / traversal move sections: this player's own role only (the partner never reads them)
    moveTuneSelect(MOVE_TUNE_TEAM.group, MOVE_TUNE_TEAM.k, cp.traverse ?? 'none');
    moveTuneRoot(root.position, root.rotation);
    this.kick = Math.max(0, this.kick - dt * 8);
    // (step 11) back to a wall: the rig's back onto the face (the capsule keeps its standoff), the off hand on it
    this.wallK = Math.max(0, Math.min(1, this.wallK + (cp.wall ? dt : -dt) / 0.2));
    const wk = this.wallK * this.wallK * (3 - 2 * this.wallK);
    if (wk > 0) {
      // (G6) the larger of the body's turn and the shoulders' (the chest turned toward the travel, the side-on crouch)
      const push = (wallRootPush(cp.wallGap, this.rig.p.bodyDepthHalf, Math.max(Math.abs(Math.sin(this.visYaw - Math.atan2(cp.wallNx, cp.wallNz))), Math.abs(this.rig.shoulderTurnSin(cp.wallNx, cp.wallNz))), this.rig.p.shoulderHalf, c.crouchBlend) - TUNE_LOCAL.wallGapAdd) * wk;
      root.position.x -= cp.wallNx * push;
      root.position.z -= cp.wallNz * push;
      // (G6, AUDIT-WALLS row 9) the peek's step toward the edge
      root.position.x += (cp.wallStepX ?? 0) * wk;
      root.position.z += (cp.wallStepZ ?? 0) * wk;
    }
    if (cp.wall) {
      const wh = (this.wallHandPt ??= new Vector3());
      // the free hand (the weapon hand's other) flat on the wall on its own side, out past the hip: never across the
      // body whichever way the slide faces (the character's left is the face's +t)
      const side = this.rig.weaponHand;
      wallHandPoint(c.renderPos.x, c.renderPos.y, c.renderPos.z, cp.wallNx, cp.wallNz, cp.wallTx, cp.wallTz, cp.wallFace, side, c.crouchBlend, wh);
      this.rig.wallHand = wh;
    } else this.rig.wallHand = null;
    // aiming: the upper body follows the aim; not aiming the view orbits freely and only the head glances
    // towards where the camera looks (spine, arms and gun stay put until an action raises the weapon)
    const rel = wrapPi(this.cam.yaw - this.visYaw);
    const raise = this.carry.raise;
    const aimYaw = rel * raise;
    const w = this.carry.w;
    // the rig pose object is reused every frame (no per-frame allocation)
    const rp = this.rigPose;
    const m = c.motion;
    rp.speed = c.speed;
    rp.localX = c.localMove.x;
    rp.localZ = c.localMove.z;
    // (G6) the posed body's own frame: side-on on a wall the slide is a crouch-walk forward, not a sidestep (the
    // controller's local move is in the capsule's frame, which keeps facing out)
    const visOff = wrapPi(this.visYaw - c.renderYaw);
    if (cp.wall && Math.abs(visOff) > 1e-3) {
      const co = Math.cos(visOff);
      const so = Math.sin(visOff);
      rp.localX = c.localMove.x * co - c.localMove.z * so;
      rp.localZ = c.localMove.x * so + c.localMove.z * co;
    }
    rp.wallTurn = cp.wall ? Math.abs(Math.sin(this.visYaw - Math.atan2(cp.wallNx, cp.wallNz))) : 0;
    rp.wallBlock = this.muzzleBlock;
    rp.grounded = c.grounded;
    rp.crouch = c.crouchBlend;
    rp.kneel = c.kneeling;
    rp.tense = c.tense;
    rp.aimPitch = this.cam.pitch * raise;
    rp.aimYaw = aimYaw;
    // hanging upside down: the spine turns the mirrored way and the raised weapon points along the view in world
    // space (not tumbled over with the body)
    const inv = this.attachAim?.inverted === true;
    if (inv) {
      rp.aimYaw = -wrapPi(rel + Math.PI) * raise;
      rp.aimPitch = -this.cam.pitch * raise;
    }
    rp.aimWorldYaw = inv ? this.cam.yaw : undefined;
    rp.aimWorldPitch = inv ? this.cam.pitch : undefined;
    rp.lookYaw = Math.max(-1.1, Math.min(1.1, rel)) * 0.5 * (1 - raise);
    rp.lookPitch = Math.max(-0.6, Math.min(0.6, this.cam.pitch)) * 0.5 * (1 - raise);
    // (step 11) on a wall the head turns along the slide (the facing side); (G6, AUDIT-WALLS row 3) further and dropped
    // forward while sliding, straight ahead side-on
    if (cp.wall) {
      const mk = wallMoveK(c.speed);
      rp.lookYaw = wallHeadYaw(cp.wallSide, mk, c.crouchBlend, visOff, raise, Math.abs(cp.lean) / WALL.peekLean);
      rp.lookPitch = rp.lookPitch - WALL_LOOK_PITCH * mk * (1 - raise);
    }
    rp.aim = this.carry.raise;
    rp.carry = w;
    rp.weight = this.weaponWeight;
    rp.kick = this.kick;
    rp.landing = Math.min(1, c.landT * 2);
    rp.reload = this.reload;
    rp.reloadEmpty = this.reloadEmpty;
    rp.swap = this.swapT;
    rp.swapFrom = this.swapFrom;
    rp.swapTo = this.swapTo;
    rp.grenade = this.grenadeT;
    rp.wall = cp.wall;
    rp.settleFeet = cp.settle === true;
    rp.wallSide = cp.wallSide;
    rp.wallNx = cp.wallNx;
    rp.wallNz = cp.wallNz;
    rp.wallFace = cp.wallFace;
    rp.lean = cp.lean;
    rp.headCap = Number.isNaN(cp.headCap) ? undefined : cp.headCap;
    rp.traverse = cp.traverse;
    rp.traverseT = cp.traverseT;
    rp.traverseH = cp.traverseH ?? 0;
    rp.traverseD = cp.traverseD ?? 0;
    rp.tuneTeam = MOVE_TUNE_TEAM.group; // (anim-joints J2) this player's own team role: the tuner's team rows
    rp.melee = cp.melee;
    rp.bend = cp.bend;
    rp.bendDrop = cp.bendDrop;
    rp.carryBody = cp.carryBody === true;
    rp.carrySide = cp.carrySide ?? 0;
    rp.liftStep = cp.liftStep ?? -1;
    rp.sway = cp.sway;
    rp.tumble = cp.tumble;
    // motion driver: gait clock (interpolated), state, acceleration in the body frame, velocity
    // (G7) a scripted step-in (the grab, a takedown approach, the step to a body): the gait from the measured root speed
    // (no motion driver runs under the override: its frozen clock slid the feet and left the legs a metre behind)
    const freeGait = cp.freeGait && !!c.override?.kinematic;
    // (G6) side-on on a wall the crouch-walk's clock comes from the posed (forward) pace, as on the remote copy (the
    // driver's clock is the capsule's sidestep cadence: long dragging strides)
    const sideOn = cp.wall && (rp.wallTurn ?? 0) > 0.5;
    rp.phase = freeGait || sideOn ? -1 : c.renderPhase;
    rp.motion = freeGait ? undefined : m.state;
    rp.motionT = freeGait ? 0 : m.stateT;
    rp.quickStop = c.ct ? (c.stopEaseT >= 0 ? CT.stopEase : CT.stopBlend) : 0;
    rp.holdSpeed = c.stopHold ? c.holdSpeed : 0;
    const by = this.visYaw;
    rp.accelFwd = m.ax * Math.sin(by) + m.az * Math.cos(by);
    rp.accelSide = m.ax * Math.cos(by) - m.az * Math.sin(by);
    rp.velX = c.override?.kinematic ? undefined : m.outX;
    rp.velZ = c.override?.kinematic ? undefined : m.outZ;
    rp.goalYaw = m.goalYaw;
    // (A1.2) free movement strides along the facing; aiming, the wall and traversal follow the velocity
    rp.stride = c.ct && this.carry.raise <= 0.5 && !cp.wall ? 'facing' : 'velocity';
    rp.faceGoal = m.faceGoal;
    // anticipation at render rate: the stick this frame against the current pace, along the body
    if (move && this.alive && !c.override) {
      const mag = Math.min(1, hyp2(move.x, move.y));
      const cy = this.cam.yaw;
      const wx = Math.cos(cy) * move.x + Math.sin(cy) * move.y;
      const wz = -Math.sin(cy) * move.x + Math.cos(cy) * move.y;
      const along = mag > 0.05 ? (wx * Math.sin(by) + wz * Math.cos(by)) / mag : 0;
      // the top pace of the stance: the intent is the stick's push against the pace
      const top = gearCap(GEARS.count, c.crouched);
      rp.intent = mag * Math.max(0, along) - c.speed / top;
    } else rp.intent = 0;
    // stopping: the last steps land where the body will come to rest
    const sp = m.speed;
    // (step 22) a Chaos Theory stop eases out through the pace spring (M14 momentum): its remaining travel
    const stopD = c.ct ? m.ctStopDistance() : sp > 0.01 ? (sp * sp) / (2 * MOVEMENT.decelMax) + sp * (MOVEMENT.decelMax / MOVEMENT.jerkMax) * 0.5 : 0;
    rp.restX = c.renderPos.x + (sp > 0.01 ? (m.vx / sp) * stopD : 0);
    rp.restZ = c.renderPos.z + (sp > 0.01 ? (m.vz / sp) * stopD : 0);
    // a teleport (respawn, insertion) puts the feet straight into a stance at the new spot (the rig only notices
    // jumps over 2 m between frames)
    if (c.teleports !== this.teleportsSeen) {
      this.teleportsSeen = c.teleports;
      this.rig.planner.L.init = this.rig.planner.R.init = false;
    }
    // (anim-weight) the Weight layers (lean, loading, springs, anticipation; identity: no offset), this rig only
    const wi = this.weightIn;
    wi.dt = dt;
    wi.x = c.renderPos.x;
    wi.y = c.renderPos.y;
    wi.z = c.renderPos.z;
    wi.yaw = by;
    wi.speed = c.speed;
    wi.accelFwd = rp.accelFwd;
    wi.yawRate = m.yawRate;
    wi.grounded = c.grounded;
    wi.plant = this.weightPlant;
    wi.landings = c.landings;
    wi.fall = c.lastFall;
    wi.start = m.state === 'move' && this.weightMotion !== 'move' && this.weightMotion !== '' && m.speed < 0.3;
    wi.jump = cp.traverse !== this.weightTraverse && weightJumpKind(cp.traverse);
    wi.teleports = c.teleports;
    this.weightMotion = m.state;
    this.weightTraverse = cp.traverse;
    tuneBegin(rp, this.rig, dt); // (anim-tuner) the local player's slider values, this rig only (pass 2: eased over dt)
    const handW = handsWeaponOf(this.rig);
    // (tuner-v2 wiring) the panel values of this state / weapon into the item 1-2 tables; (anim-joints J2) plus the move /
    // action rows this rig picked last frame (the panel follows the strongest at weight 0.5 or more)
    tuneV2Frame(TUNE_STATE.body, handW, this.rig.tuneSt ? this.rig.tuneSt.pick : null);
    tuneGuardFrame(); // (item 24, track A) the guard rows into the guard tables every guard rig reads
    tuneKeysFrame(); // (tuner-v2 item 4) Keys section edits -> the keyed clips' per-key offset tables
    // (anim-joints J1) the Joints / Hands & feet / IK / Weapon windows: the rig opens its own inside animate (tuneRows)
    this.teamPose.begin(dt, TEAM_POSE_LOCAL, rp, this.rig); // (anim-n4b, track A) the co-op team pose (GameState wrote it)
    moveTuneBegin(rp, this.rig); // (anim-studio-2) the move sections selected above (identity unless a slider moved)
    try {
      weightBegin(wi, c.crouched, this.wasDrawn); // inside the try: weightEnd always closes it
      this.rig.animate(dt, rp);
    } finally {
      moveTuneEnd(this.rig);
      tuneEnd(this.rig);
      weightEnd();
      this.teamPose.end(this.rig); // (anim-n4b, track A)
    }
    if (this.onWeightGear) this.onWeightGear(WEIGHT_POSE.gearX, WEIGHT_POSE.gearY, WEIGHT_POSE.gearZ);
    // footfalls (no camera bob, D2: the view follows the smoothed capsule only)
    const pl = this.rig.planner;
    this.weightPlant = pl.L.landed || pl.R.landed;
    if ((pl.L.landed || pl.R.landed) && c.grounded) {
      this.onFootPlant?.();
      // the foley plays real foot plants (audio reads this; nothing in gameplay does)
      this.footPlants++;
      this.footPlantSide = pl.L.landed ? -1 : 1;
    }
    this.cam.applyBodyFade(this.rig);
    // Wren follows the camera fade (the head hide; the whole-body hide is the rig root's) and the rig's pose
    const f = this.figure;
    f.setHeadVisible(this.cam.headVisible);
    f.setHeat(this.rig.heat);
    f.update(this.world.scene.activeCamera);
  }

  dispose(): void {
    this.figure.dispose();
    this.rig.dispose();
    this.controller.dispose();
    this.cam.camera.dispose();
  }
}
