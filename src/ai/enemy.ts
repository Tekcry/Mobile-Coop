import { Vector3, type Scene } from '../core/babylon';
import type { CharacterRig, FkPose } from '../player/characterRig';
import { GuardCq, seedOf, type GuardCqMode } from '../game/closeQuarters';
import type { WeaponModel } from '../weapons/weaponModel';
import { buildEnemyRig, GuardGunCarry } from './enemyRig';
import { calmArea, carryRaise, carrySlotOf, GuardCarry, mayHolster } from './carryState';
import { Hitboxes } from './hitboxes';
import { Health } from '../game/health';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { World } from '../world/world';
import type { Ballistics } from '../weapons/ballistics';
import type { Vfx } from '../vfx/vfx';
import type { NavGrid, NavLink, P2, Waypoint } from './navGrid';
import { COVER_STANDOFF, type CoverPoint } from '../world/levelBuilder';
import { coverPose, nearestEdge, type CoverSegment } from '../cover/coverData';
import { coverQuality, flanks, type CoverSpot } from '../game/tactics';
import type { EnemyDef } from './enemyDefs';
import { G, MASK } from '../physics/groups';
import { GRAB } from '../game/takedown';
import { spreadDir } from '../weapons/ballistics';
import { sampleSpread } from '../weapons/weaponStats';
import { wrapAngle } from '../player/playerController';
import { emptyMotionInput, MotionDriver } from '../anim/motion';
import { ENEMY_CALM_MOTION, ENEMY_MOTION } from '../config/movement';
import type { RigPose } from '../player/characterRig';
import { clampToRoom, inRoom, roomAt, type RoomRect } from '../world/rooms';
import { hyp2 } from '../core/mathx';
import { EYE_STAND, instantDetect, losClear, noiseSuspicion, PERCEPTION, seenAt, sightRate, stepMeter, type SightInput } from './perception';
import { ALERT, AlertMachine, callInDelay, emptyAlertInput, type AlertLevel } from './alertState';
import { HEARING } from './hearing';
import { PatrolWalker, PATROL, type PatrolRoute } from './patrol';
import { ARMOUR_FIRE, ArmourGate } from './armourFire';
import { PACE, paceSpeed, ringPoint, SEARCH_BODY, SEARCH_DEVICE, SEARCH_PLAIN, searchSpec, urgentKind } from './response';
import { SEPARATION, steerFrom, stepApart, tooClose, type SepOut } from './separation';
import { BODY, bodyNoticed } from './bodies';
import type { Body } from './body';
import { alarmStandPoint, raiseTime, type AlarmPanel } from './alarm';
import type { LightDef, Occluder } from '../world/lights';
import type { LightField } from '../world/lightField';
import { ARCHETYPE, carriesTorch, glint, heavyMult, shieldBlocks, smellRate, sniperRelocate, torchRule, type DifficultyDef } from './archetypes';
import { placeTorch } from '../world/torches';
import { BarkVoice, RADIO_BARKS, type BarkEvent } from './barks';
import { INCIDENT, MODE_BODY, MODE_BREAKER, MODE_COVER, MODE_DEVICE, MODE_HELP, MODE_INVESTIGATE, MODE_LEAD, MODE_LIGHT } from './incidents';
import { BREAKER_WALK } from './breaker';
import { isConsoleGroup } from './consoleFault';
import { P_AGGRESSIVE, P_STANDARD, profileOf, R_FLANK, R_NONE, R_OVERWATCH, R_POINT, R_REPORTER, R_SEARCH, ROLES, Rng, type BehaviourProfile as TacticsProfile, type Role } from './squadRoles';
import type { GuardInfo } from './guardInfo';
import type { CallKind } from './radioNet';
import { LC_DONE, LC_FACE, LightCheck, type LightCheckWalker } from './lightCheck';
import { clampToLeash, inLeash, LURE, lurePoint, POST, PostLure, type PostDef, type PostLureOut } from './posts';
import type { BehaviourProfile } from './guardAiData';
import { DogModel } from './dogModel';
import { emoteBlind, emoteBlindEnd, emoteSeize, emoteStep, guardHead, guardHeadRest, leanStep, newEmoteState, newLeanState, type GuardHeadIn, type GuardHeadRest } from './guardHead';
import { CAUTION } from './awareness';
import type { InstancedMesh } from '../core/babylon';
import { GuardAnimTier } from './animTierView';
import { ANIM_TIER_FROZEN_CARRY_MAX } from './animTier';
import { BREAKER, gearHit, type GearHit, type GuardGear } from './gear';
import { buildArmourParts, buildHelmetPart, buildShieldPart, gearColour, HELMET_FIT } from './gearParts';
import { guardAim } from './guardStance';
import { SWEEP_NEAR, type SweepTeam } from './sweepTeam';

/** (guard-ai S12) Scratch for `gearHit` (one hit at a time; the damage path allocates nothing for gear). */
const GEAR_OUT: GearHit = { mult: 1, knockOff: false, stagger: 0 };

export type EnemyState = 'idle' | 'chase' | 'attack' | 'seekCover' | 'inCover' | 'melee' | 'dead';

/** The torch thresholds live with the pure torch rule (`archetypes.ts`). */
export { TORCH_DARK, TORCH_KEEP } from './archetypes';

/** What enemies can target (local or remote players). */
export interface PlayerRef {
  id: string;
  target: Damageable;
  feet: Vector3;
  speed: number;
  crouched: boolean;
  /** Cover face the player is using (null in the open) and seconds spent in it. */
  cover?: CoverSpot | null;
  coverT?: number;
  /** Near-miss / impact report for suppression (local player only). */
  suppress?(from: Vector3, to: Vector3, hit: boolean): void;
  /** Light level on the body 0..1 (sampled by the owner; enemies sample it themselves when absent). */
  light?: number;
  /** (locomotion step 12) Peeking past a wall edge: the head's horizontal offset from the feet (m), where its light
   *  is sampled (light parity, bible 5.1). Remotes set it from their MoveState. */
  peekX?: number;
  peekZ?: number;
  /** (operators 11e r1, G166) Standing height of the body shown (m; its rig's), where its light is sampled off a wall
   *  (`lightSampleHeight`); absent: the 1.75 m standard body. Set locally by each side: nothing is sent. */
  height?: number;
  /** (step 12b fix r2, light parity) On a wall: the host's posed head centre of a remote (its RemoteAvatar rig), the
   *  one sample its light, head point and posed body share; null / absent elsewhere. */
  head?: Vector3 | null;
  /** Seen by a guard in combat this alert: those guards know this player is there (no takedowns on them). Cleared
   *  when no guard is in combat any more. Each player separately (co-op). */
  spotted?: boolean;
  /** (3.2.0) A hostage held in front as a human shield: guards hold fire a moment, then aim at the head only, and
   *  their shots hit the hostage first. */
  shield?: Damageable | null;
}

export interface AiContext {
  scene: Scene;
  world: World;
  nav: NavGrid;
  registry: DamageRegistry;
  ballistics: Ballistics;
  vfx: Vfx;
  /** (locomotion step 19) The match's difficulty, resolved once at match start (resolveDifficulty). */
  diff: DifficultyDef;
  players(): readonly PlayerRef[];
  flow(): Float32Array;
  enemies(): readonly Enemy[];
  cover: readonly CoverPoint[];
  /** Cover faces (for peeking around the nearest edge). */
  coverSegments: readonly CoverSegment[];
  /** Room tags of the map (empty when it has none). */
  rooms: readonly RoomRect[];
  reserveCover(e: Enemy, idx: number): boolean;
  releaseCover(e: Enemy): void;
  onKilled(e: Enemy, h: HitInfo): void;
  onShot?(e: Enemy, from: Vector3, to: Vector3): void;
  onMelee?(e: Enemy): void;
  onWindup?(e: Enemy): void;
  /** Lob a grenade from `from` to land near `to`; false if unavailable. */
  throwGrenade?(e: Enemy, from: Vector3, to: Vector3): boolean;
  /** This enemy is the one assigned to flank a player holding cover. */
  isFlanker?(e: Enemy): boolean;
  /** (guard-ai S8) Seed of his combat RNG for the engagement he has just joined (`combatSeed` in squadRoles.ts). */
  combatSeed?(e: Enemy): number;
  /** (guard-ai S8) No path to this cover: the role picks skip it for a few seconds. */
  blockCover?(idx: number): void;
  /** Down (killed or knocked out): the rig becomes a body in the world. */
  addBody(e: Enemy, rig: CharacterRig, impulse: Vector3, lethal: boolean): void;
  bodies(): readonly Body[];
  bodyFound(e: Enemy, b: Body): void;
  /** Wake the knocked-out guard of body `b`; `by` woke him (guard-ai S4: both turn cautious, timed). */
  revive(b: Body, by: Enemy): void;
  alarmRaised(): boolean;
  raiseAlarm(e: Enemy, p: AlarmPanel): void;
  /** Stealth rules: enemies only know where the target is from what they see and hear (else they are
   *  sent at it, as in Wave). */
  stealth(): boolean;
  /** (LR16t) Static geometry for the light field's flashlights (`EnemyManager.bodyOccluder`): the light on a target
   *  without its own sample is tested as a body's is, so a torch behind a wall does not light it. */
  lightOccluder?: Occluder;
  /** (guard-ai S2) Coordinated guards (the incident board): the new paces (A9) and the calm turn when searching.
   *  Absent / false (Hunter, Mission): the old paces. */
  coordinated?(): boolean;
  /** Shared last known position of the target (valid once anyone has seen / located it). */
  lkp: Vector3;
  lkpValid(): boolean;
  /** An alerted enemy sees the target: the shared last known position follows it. */
  reportSighting(p: PlayerRef): void;
  /** Detected: radio the squad (the parked modes: at once, 22 m). */
  callAlert(e: Enemy): void;
  /** The spotter's shout: squadmates close by join at once (no radio needed). (guard-ai S3) Coordinated: the voice
   *  model (`RADIO.voice` through walls and masking, +`RADIO.voiceDelay`); parked modes: the old 8 m. */
  shout?(e: Enemy): void;
  /** (guard-ai S3) Start a radio call on the section net (coordinated modes): nothing is sent until it completes
   *  (`callHold`); `inc` the board's incident (-1: a contact). */
  radioCall?(e: Enemy, inc: number, kind: CallKind): void;
  /** (guard-ai S3) He went down, was grabbed or blinded: his open radio calls are lost. */
  radioCut?(e: Enemy): void;
  /** This enemy's slot among the searchers (fans the sweep out). */
  searchSlot(e: Enemy): number;
  /** A callout (shown near the speaker; radio lines chirp). (guard-ai S9) `ev`, `n`, `unit`: the table line it is (the
   *  event, its line index, the unit it names; absent for a line said verbatim, a talking pair's), for the co-op host. */
  onBark?(e: Enemy, line: string, radio: boolean, ev?: BarkEvent, n?: number, unit?: number): void;
  /** (guard-ai S12) His helmet was shot off: a dropped helmet (colour `hex`, size `w`, `h`, `d`) falls from `top` m
   *  above his feet (x, y, z) to the floor beside them, flung along (dx, dz) (the pooled `HelmetDrops`). */
  dropHelmet?(x: number, y: number, z: number, top: number, dx: number, dz: number, hex: string, w: number, h: number, d: number): void;
  /** (guard-ai S15) Circuit `group` is still switched off at its switches (absent: taken as off). */
  breakerOff?(group: number): boolean;
  /** (guard-ai S15) He worked the switch: circuit `group` back on (the player's own toggle path, `StealthSystems`). */
  breakerReset?(e: Enemy, group: number): void;
  /** (guard-ai S20) May he step from (x0, z0) to (x1, z1) at feet height y past the doors (`DoorGate.blocking`)? False:
   *  a shut door's leaf is in the way (the manager opens it when it is not locked; he waits). Absent: no doors. */
  doorStep?(e: Enemy, x0: number, z0: number, x1: number, z1: number, y: number): boolean;
}

let nextId = 1;
/** (LR16t) The light field at a point for a guard's perception, its flashlights tested with the context's occluder
 *  (`AiContext.lightOccluder`), as a body's light is. */
export function fieldLight(ctx: Pick<AiContext, 'world' | 'lightOccluder'>, x: number, y: number, z: number): number {
  return ctx.world.lightField.totalAt(x, y, z, ctx.lightOccluder);
}

/** The paces table lives in `response.ts` (pure; guard-ai S19 added the rush), re-exported here for its readers. */
export { PACE };
const PATROL_PACE = PACE.patrol;
/** Out of sight in combat: walking up on the last known position (x walk speed); a hold between bounds (s). */
const ADVANCE_PACE = 1.15;
const ADVANCE_HOLD = 2.5;
/** (guard-ai S6 + S8) The hold between bounds: a point (S8 role) or an aggressive guard (S6 reinforcements) holds his
 *  profile's (`profileOf(tacticsProfile).advanceHold`: aggressive 0.8 s, post 4 s), everyone else `ADVANCE_HOLD`
 *  (2.5 s, as before); an aggressive guard's last stretch is a jog (x run speed), not `ADVANCE_PACE`. */
const AGGRESSIVE_JOG = 0.75;
/** (guard-ai S6) A reinforcement gives up his entry route after this long (s; a blocked route). */
const ENTRY_MAX = 30;
/** Body sample heights for exposure (fractions of the target's height above the feet, then the head). */
const EXPOSE_HIPS = 0.52;

export class Enemy implements Damageable {
  readonly num = nextId++;
  /** (guard-ai S8, A7) Seeded combat dice (bursts, strafes, cover-first, spread, grenade timing; mulberry32): seeded
   *  by `num` at spawn, reseeded per guard per engagement when he goes to combat (`AiContext.combatSeed`). Declared
   *  first: the field initialisers below draw from it. The think cadence (`thinkT`) stays on `Math.random`: it is
   *  perception, not combat. */
  readonly rng = new Rng(Math.imul(this.num, 2654435761));
  readonly id = `e${this.num}`;
  readonly team = 'enemy' as const;
  readonly health: Health;
  readonly pos: Vector3;
  yaw = 0;
  state: EnemyState = 'idle';
  private stateT = 0;
  private rig: CharacterRig;
  private gun: WeaponModel | null;
  /** (guard-ai S21, walk 4.72 G5) Holstered in a calm area (`carryState.ts`): stepped in `update`, gates fire, posed in
   *  `frame` (`gunCarry`, null: a kind that never holsters). */
  readonly carry: GuardCarry;
  private gunCarry: GuardGunCarry | null = null;
  private hitboxes: Hitboxes;
  private vel = new Vector3();
  /** Same root motion as the player: weighted starts/stops, stepped turns, stride-synced gait. */
  private motion: MotionDriver;
  private motionIn = emptyMotionInput();
  private prevPos = new Vector3();
  private prevYaw = 0;
  private rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
  private target: PlayerRef | null = null;
  private los = false;
  private losT = 0;
  private dist = 99;
  private thinkT = Math.random() * 0.25;
  /** Light level on the target at the last think (0 dark .. 1 lit). */
  targetLight = 1;
  private path: Waypoint[] = [];
  coverIdx = -1;
  private burstLeft = 0;
  private fireT = 0;
  /** (guard-ai S16) The armour fire gate: the muzzle -> aim line's first hit armoured holds fire (debug / tests read it). */
  readonly fireGate = new ArmourGate();
  /** (guard-ai S16) A reposition away from armour: the next cover pick takes only spots with a clear fire line. */
  private armourPick = false;
  private readonly fireFrom = new Vector3();
  private readonly fireTo = new Vector3();
  /** (guard-ai S16) Rounds fired (debug / tests). */
  roundsFired = 0;
  private pauseT = this.rng.range(0.6, 1.4);
  private windup = 0;
  private meleeCd = 0;
  private crouch = 0;
  private wantCrouch = false;
  private peekCycles = 0;
  private strafe = this.rng.next() < 0.5 ? 1 : -1;
  private strafeT = 0;
  private stagger = 0;
  private aimPitch = 0;
  private kick = 0;
  private head = new Vector3();
  /** (guard-render S3a) The human guard's head hit volume comes from the sim (`guardHead`), not the rendered rig. */
  private readonly headRest: GuardHeadRest;
  private readonly headIn: GuardHeadIn = { x: 0, y: 0, z: 0, yaw: 0, crouch: 0, speed: 0, moveX: 0, moveZ: 0, phase: 0, aim: 0, aimPitch: 0, wall: false, wallSide: 0, lean: 0, leanDrop: 0, held: null, heldK: 0, koK: 0, blind: 0, poseW: 0, climb: false };
  private readonly headLean = newLeanState();
  /** (S3a fix round) Whose emote the rig shows, for the head (`guardHead.emoteStep`, shared with the parity harness). */
  private readonly emoteSt = newEmoteState();
  /** (guard-render S4) How often the rig solves its pose (`animTier.ts`). */
  private readonly animTier: GuardAnimTier;
  private tmp = new Vector3();
  private tmpEye = new Vector3();
  private tmpHead = new Vector3();
  private tmpHips = new Vector3();
  private desired = new Vector3();
  /** (guard-ai S20) The separation's out pair (`separation.ts`). */
  private sepOut: SepOut = { x: 0, z: 0 };
  /** (guard-ai S20 check) Held by the hard spacing with somewhere to go (s); squeezing past, the time left (s); this
   *  step was cut or refused by it. */
  private sepStall = 0;
  private sepFree = 0;
  private sepHit = false;
  private lunge = 0;
  private coverPicked = false;
  /** Out of sight in combat: moving up on the last known position cover to cover (a bound, then a hold). */
  private advancing = false;
  private advanceCd = 0;
  /** Where the target is believed to be (the real position in sight, else the shared last known one). */
  private readonly knownPt: P2 = [0, 0];
  private flash = 0;
  /** Alert level (unaware .. alert) and the awareness meter towards the target (0..1). */
  readonly aware = new AlertMachine();
  meter = 0;
  /** Sight fill rate at the last think (/s) and seconds since the target was last in sight. */
  private rate = 0;
  sinceSeen = 99;
  private sight: SightInput = { dist: 0, angle: 0, light: 1, crouched: false, speed: 0, exposure: 0, sensitivity: 1, pitch: 0 };
  private alertIn = emptyAlertInput();
  private walker: PatrolWalker;
  /** Where the last stimulus (glimpse, noise) came from, and whether there is one. */
  private stimulus: P2 = [0, 0];
  private hasStimulus = false;
  private heard = false;
  /** (guard-ai S1) Seconds left looking towards a sound he was not sent to (`hearTurn`): stands and faces it. */
  private turnT = 0;
  /** (guard-ai S2) The incident this guard was sent to by the board (its id), -1 none; cleared when he is back
   *  (calm), in combat, or on another search. */
  incident = -1;
  /** What he was sent to do (`MODE_*` in `incidents.ts`). */
  private incMode = 0;
  /** (guard-ai S3) Sent to a plain noise or a lure (not gunfire): an empty investigation ends calm (`calmEnd`). */
  private incCalm = false;
  /** (guard-ai S7) The body a camera saw that the board sent him to (`checkBody`), null none; and seconds on the walk. */
  camBody: Body | null = null;
  private camBodyT = 0;
  /** The light check (`lightCheck.ts`, pure); `lightC` its light's floor point (the e2e reads it). */
  private readonly lc = new LightCheck();
  readonly lightC: P2 = this.lc.c;
  /** The light check's walker: `goTo` and its A* path (made once). */
  private readonly lcWalker: LightCheckWalker = {
    walkTo: (p, dt) => this.goTo(p, dt),
    following: () => this.routePath.length > 0,
    dropPath: () => {
      this.routePath.length = 0;
    },
  };
  private gunfire = false;
  private called = 0;
  /** Seconds until a spotter's radio call goes out (0 = none pending); taking them out first stops it. The parked modes
   *  only: (guard-ai S3) the live modes' call is on the radio net (`EnemyManager.radioLeft`). */
  radioT = 0;
  /** The alert being raised is loud (shot, hit, a flashbang): it is called in at once. */
  private loudAlert = false;
  private searchReq = false;
  /** Investigating / searching: the current spot, how far round the search ring, and the look-round. */
  private spot: P2 = [0, 0];
  private spotSet = false;
  private spotArrived = false;
  private spotLookT = 0;
  private lookBase = 0;
  private searchK = 0;
  private routePath: Waypoint[] = [];
  private routeGoal: P2 = [NaN, NaN];
  private routeT = 0;
  /** The nav grid's `version` the route was planned under (a bolted door opened or shut since: replan). */
  private routeVer = -1;
  /** Searching round its own stimulus (a body, a light) rather than the shared last known position. */
  private searchOwn = false;
  /** (guard-ai S18) The search's kind (`response.ts` `SEARCH_*`): plain, a dead body's (longer, wider), a device's. */
  private searchKind: number = SEARCH_PLAIN;
  /** (guard-ai S19, walk 4.72 G3) Hurrying to it (an alarm, a reported body, shots, a missing man: `urgentKind`): his
   *  investigate / search walk is a jog (`paceSpeed`) until he first gets to the spot. */
  private rush = false;

  /** (guard-ai S19) Hurrying to an incident (e2e / debug). */
  get rushing(): boolean {
    return this.rush;
  }
  /** (guard-ai S2 fix 2) This search follows combat (alert -> searching: the walk on to the last known position and
   *  the sweep round it): the old pace and the aimed turn. Only a calm search (a body, a call, a pair) is slow. */
  private combatSearch = false;
  /** A knocked-out squadmate to wake (found body). */
  private reviving: Body | null = null;
  /** Running to an alarm panel (combat), and time spent working it. */
  private alarm: AlarmPanel | null = null;
  private alarmT = 0;
  private alarmPt: P2 = [0, 0];
  private meP: P2 = [0, 0];
  private coverPose: 'none' | 'low' | 'high' = 'none';
  private coverPeek = 0;
  /** Rendering only: side of the cover wall in the guard's frame for the flat-back stance (-1 left, 1 right, 0 unknown). */
  private coverWallSide = 0;
  /** Last place the target was seen (aim point) and seconds since. */
  private lastKnown = new Vector3();
  private lastSeenT = 99;
  private blindPlan = false;
  private grenadeCd = this.rng.range(5, 10);
  /** Assigned to flank a player holding cover (debug / tests). */
  flanking = false;
  /**
   * Room this enemy holds (Clear mode squads): it fights from inside, takes cover inside and never
   * chases out; with the target outside it falls back to its post and watches the last known position.
   */
  hold: RoomRect | null = null;
  /** Squad (Clear: the room's index) for radio checks; -1 = none. */
  squad = -1;
  /** An officer is close by: better aim, faster reactions (set by the manager). */
  buff = false;
  /** Callouts. */
  readonly voice: BarkVoice;
  /** The dog's handler (found among its squad) and whether it can smell the target now. */
  leader: Enemy | null = null;
  private smelled = false;
  /** Four-legged body (the dog), shown instead of the humanoid rig. */
  readonly dog: DogModel | null = null;
  /** Enforcer shield; sniper laser and scope glint. */
  private shield: InstancedMesh | null = null;
  private laser: InstancedMesh | null = null;
  private glintMesh: InstancedMesh | null = null;
  /** Sniper: shots from this position and time since the first; picking a new post. */
  shotsHere = 0;
  private postT = 0;
  private relocating = false;
  /** Sniper relocations (tests). */
  relocations = 0;
  private post: P2 = [0, 0];
  /** Room index at the last think, and a short pause at doorways when moving into a new room unseen. */
  private room = -1;
  private doorCheck = 0;

  constructor(
    private ctx: AiContext,
    readonly def: EnemyDef,
    spawn: Vector3,
    yaw = 0,
  ) {
    const d = ctx.diff;
    this.health = new Health(def.hp * d.hp);
    this.pos = spawn.clone();
    this.pos.y = ctx.nav.heightAt(spawn.x, spawn.z, spawn.y);
    this.yaw = yaw;
    this.motion = new MotionDriver(yaw);
    this.prevPos.copyFrom(this.pos);
    this.prevYaw = yaw;
    this.post = [this.pos.x, this.pos.z];
    this.walker = new PatrolWalker(null, this.pos.x, this.pos.z, yaw, this.num);
    const built = buildEnemyRig(ctx.scene, ctx.world, def, this.id);
    this.rig = built.rig;
    this.gun = built.gun;
    // (guard-ai S21) the carry: a kind that ever holsters gets the gun's slot (the rifle on his back, the pistol on his thigh)
    const gunCls = built.gun ? built.gun.def.class : '';
    this.carry = new GuardCarry(mayHolster(def.kind, def.gun, !!def.melee, def.quadruped), gunCls);
    if (built.gun && this.carry.on) this.gunCarry = new GuardGunCarry(built.rig, built.gun, carrySlotOf(gunCls));
    // (guard-render S4) anim tiers: off-screen / far guards solve their pose less often (`animTier.ts`)
    this.animTier = new GuardAnimTier(ctx.scene, this.rig.voxel?.meshes[0] ?? null, this.num);
    this.hitboxes = new Hitboxes(ctx.scene, ctx.registry, this, def.scale, def.build);
    this.headRest = guardHeadRest(def.height, def.build, def.gun !== null, def.melee ? 0 : def.runSpeed);
    this.voice = new BarkVoice(this.num);
    const parts = ctx.world.parts;
    if (def.quadruped) {
      // the dog: its own body on the shared brain; the humanoid rig stays hidden
      this.rig.root.setEnabled(false);
      this.rig.standIn = true;
      this.gun?.dispose();
      this.gun = null;
      this.dog = new DogModel(ctx.scene, parts, def.look.colors.torso, def.look.colors.accent);
    }
    // (guard-ai S9) the shield builder is shared with the co-op client's puppet (`gearParts.ts`)
    if (def.kind === 'enforcer') this.shield = buildShieldPart(ctx.world, this.rig.root, def.scale);
    if (def.kind === 'sniper') {
      this.laser = parts.instance('cyl', '#ff2a1a', 'laser');
      this.laser.isVisible = false;
      this.glintMesh = parts.instance('sphere', '#ffffff', 'glint');
      this.glintMesh.isVisible = false;
    }
    this.frame(0, 1);
  }

  get alive(): boolean {
    return this.health.alive;
  }

  /** Seized in a takedown (the attacker's controller places the body; no brain). */
  taken = false;

  /** (guard-ai S20) Solid to the other guards' separation: alive and not held in a takedown (`separation.ts`). */
  get solid(): boolean {
    return this.alive && !this.taken;
  }
  /** Flashbanged: blind and staggering for this long (no perception, no fire), then alert. */
  blindT = 0;
  /** Seconds breathing sleeping gas (the gadget system knocks out at its threshold; decays outside). */
  gas = 0;

  /** Blinded by a flashbang: hands to the face, staggering on the spot, then straight to combat. */
  blind(seconds: number): void {
    if (!this.alive || this.taken) return;
    // (guard-ai S3) hands to his face: the call he was making is lost
    this.ctx.radioCut?.(this);
    this.blindT = Math.max(this.blindT, seconds);
    emoteBlind(this.emoteSt);
    this.bark('blind');
    this.burstLeft = 0;
    this.windup = 0;
    this.vel.setAll(0);
    this.rig.emote = (_r, t) => {
      const k = Math.min(1, t * 6);
      const w = Math.sin(t * 9) * 0.1;
      return { neck: [0.45 * k, w, 0], chest: [0.3 * k, 0, 0], shoulderL: [-2.1 * k, 0, -0.5 * k], shoulderR: [-2.1 * k, 0, 0.5 * k], elbowL: [0, 0, -2.2 * k], elbowR: [0, 0, 2.2 * k], pelvisLift: -0.06 * k };
    };
    this.rig.emoteTime = 0;
  }

  /** (G7) The held pose (`closeQuarters.GuardCq`): seized, hostage, the knockout's limp, the interrogation. */
  private readonly cq = new GuardCq();
  private readonly cqEmote = (_r: CharacterRig, t: number): FkPose | undefined => this.cq.pose(t) ?? undefined;

  /** Grabbed: the brain stops; (G7) the body struggles once the attacker reaches him, `delay` s after the press (arms up
   *  to the attacker's hold, head back; the old pose started at the press and sank the feet 8 cm with a pelvis offset). */
  beginTakedown(choke: boolean, delay = 0): void {
    // (guard-ai S3) seized before the call got through: nobody else is told
    this.ctx.radioCut?.(this);
    this.taken = true;
    // the held pose replaces the flashbang's emote (one emote at a time): the head follows the held pose only
    emoteSeize(this.emoteSt);
    this.endLink();
    this.burstLeft = 0;
    this.windup = 0;
    this.vel.setAll(0);
    this.cq.seed = seedOf(this.id);
    this.cq.seize(!choke, delay);
    // (G7) his rifle out of the posed hands (it floated at the hold); back on release
    this.gun?.setVisible(false);
    this.rig.emote = this.cqEmote;
    this.rig.emoteTime = 0;
  }

  /** (3.2.0) Held as a hostage: upright against the operator's chest, head back, hands up at the arm round the neck;
   *  (G7, row 19) a flail now and then. Blends from the seized pose (the emote clock runs on). */
  holdAsHostage(): void {
    if (this.rig.emote !== this.cqEmote) {
      this.cq.seed = seedOf(this.id);
      this.cq.seize(false, 0);
      this.rig.emote = this.cqEmote;
      this.rig.emoteTime = 0;
    }
    this.cq.set('hostage');
  }

  /** (G7) The hold's pose: the knockout (`k` the limp, `lower` his crouch as he is lowered) or the interrogation (`k`). */
  holdPose(mode: GuardCqMode, k: number, lower = 0): void {
    if (this.rig.emote !== this.cqEmote) return;
    this.cq.set(mode);
    this.cq.k = k;
    if (mode === 'ko') this.crouch = lower;
  }

  /** (3.2.0) Held as a hostage: not solid to the operator's body (bullets still hit). */
  setSolid(on: boolean): void {
    this.hitboxes.setSolid(on);
  }

  /** Place the seized body (fixed step, 60 Hz). (G7) His velocity follows (eased), so a hostage walks with the hero
   *  (the gait from his speed) instead of sliding on planted feet. */
  holdAt(x: number, y: number, z: number, yaw: number): void {
    if (this.taken) {
      this.vel.x += ((x - this.pos.x) * 60 - this.vel.x) * 0.35;
      this.vel.z += ((z - this.pos.z) * 60 - this.vel.z) * 0.35;
    }
    this.pos.set(x, y, z);
    this.yaw = yaw;
  }

  /** Let go (an interrupted takedown): staggered (`stagger` s; a shove: longer), and very much aware now. */
  releaseTakedown(stagger = 0.6): void {
    if (!this.taken) return;
    this.taken = false;
    this.hitboxes.setSolid(true);
    this.rig.emote = null;
    this.crouch = 0;
    this.vel.setAll(0);
    this.gun?.setVisible(true);
    // (G7) the held yaw is his facing now (the driver kept the one from before the seize)
    this.motion.reset(this.yaw);
    this.stagger = stagger;
    // (guard-ai S3) already in combat when seized (his call was cut): he calls it in again
    if (this.alerted && this.netOn) this.callContact();
    else this.alert();
  }

  /** (locomotion step 10) Seconds left of an elbow strike's stagger (a second strike inside it knocks out). */
  strikeStaggerT = 0;

  get strikeStaggered(): boolean {
    return this.strikeStaggerT > 0;
  }

  /** (step 10) Hit by an elbow strike he faced: staggered `seconds`, his aim broken (burst and wind-up dropped). */
  strikeStagger(seconds: number): void {
    if (!this.alive || this.taken) return;
    this.stagger = Math.max(this.stagger, seconds);
    this.strikeStaggerT = seconds;
    this.sinceStagger = 0;
    this.burstLeft = 0;
    this.windup = 0;
    this.vel.setAll(0);
    this.alert();
  }

  // ----- (guard-ai S12) gear: helmet and body armour (`gear.ts`; research/stealth-over-shooting.md items 2, 13) -----

  /** He wears a helmet (the first bullet to the head knocks it off: no damage, a stagger). */
  helmet = false;
  /** He wears body armour (bullets to the body deal no damage, a stagger at most every `GEAR.staggerCd` s). */
  armour = false;
  /** Seconds since his last stagger (the vest's stagger cooldown); large at spawn so the first vest hit staggers. */
  sinceStagger = 1e9;
  /** The placeholder gear parts (A45), built once on first use and toggled: the helmet on his head node, the plates. */
  private helmetPart: InstancedMesh | null = null;
  private armourParts: InstancedMesh[] | null = null;
  private gearHex = '';

  /** Put gear on him (or take it off): `placeSlot` (slot tag + section default), a woken guard (`inherit`), and S13's
   *  alarm stages. Parts are built the first time he needs them (load time), then only shown or hidden. A dog wears
   *  nothing (S12 checker: a section default or stage gear must not make a dog bulletproof with no visible gear). */
  setGear(g: GuardGear): void {
    this.helmet = !this.dog && g.helmet === true;
    this.armour = !this.dog && g.armour === true;
    this.showGear();
  }

  /** The gear parts match `helmet` / `armour` (a dog has none; nothing is built for a guard without gear). */
  private showGear(): void {
    if (this.dog) return;
    if (this.helmet && !this.helmetPart) this.buildHelmet();
    if (this.armour && !this.armourParts) this.buildArmour();
    if (this.helmetPart) this.helmetPart.isVisible = this.helmet;
    const a = this.armourParts;
    if (a) for (let i = 0; i < a.length; i++) a[i]!.isVisible = this.armour;
  }

  /** The helmet: the rig's combat-helmet part on his head node (over a cap). (guard-ai S9) `gearParts.ts`, shared
   *  with the co-op client's puppet. */
  private buildHelmet(): void {
    this.gearHex = gearColour(this.def, this.ctx.world, 'helmet');
    this.helmetPart = buildHelmetPart(this.ctx.world, this.rig, this.gearHex);
  }

  /** Body armour: the rig's armour plates (front and back on the torso node, shoulder caps). */
  private buildArmour(): void {
    this.armourParts = buildArmourParts(this.ctx.world, this.rig, gearColour(this.def, this.ctx.world, 'accent'));
  }

  /** The helmet comes off: hidden on his head, a dropped helmet at his feet flung away from the shot. */
  private knockHelmetOff(h: HitInfo): void {
    this.helmet = false;
    if (this.helmetPart) this.helmetPart.isVisible = false;
    const H = this.dog ? null : this.rig.p.head;
    if (H) {
      const dl = hyp2(h.dir.x, h.dir.z) || 1;
      this.ctx.dropHelmet?.(this.pos.x, this.pos.y, this.pos.z, 1.65 * this.def.scale, h.dir.x / dl, h.dir.z / dl, this.gearHex || '#22262b', H.w * HELMET_FIT.w, H.h * HELMET_FIT.h, H.d * HELMET_FIT.d);
    }
  }

  /** (3.2.0) Seconds this guard has seen its target holding a hostage (the hesitation before aimed fire). */
  private shieldT = 0;

  /** The target was in line of sight (any body sample) at the last think. */
  get inSight(): boolean {
    return this.sight.exposure > 0;
  }

  /** The animated body (LKP ghost). */
  get bodyRig(): CharacterRig {
    return this.rig;
  }

  /** In combat (the alert level). */
  get alerted(): boolean {
    return this.aware.alert;
  }

  get level(): AlertLevel {
    return this.aware.level;
  }

  /** Walk a route while unaware (null = stand post at the spawn point). */
  setPatrol(route: PatrolRoute | null): void {
    this.walker = new PatrolWalker(route, this.post[0], this.post[1], this.yaw, this.num);
    this.setCaution(this.caution);
  }

  /** (CT Core spare 9) The route he walks while unaware (null: a post); read by interrogation intel. */
  get patrolRoute(): PatrolRoute | null {
    return this.walker.route;
  }

  /** 0 standing .. 1 crouched (cover). */
  get crouchBlend(): number {
    return this.crouch;
  }

  /** Weapon raised (coop snapshots). */
  get aiming(): boolean {
    return this.state === 'attack' || this.state === 'inCover' || this.burstLeft > 0 || this.windup > 0;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.7 : 1.0) * this.def.scale, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.85 : 1.25) * this.def.scale, 0);
  }

  private eye(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 1.0 : EYE_STAND) * this.def.scale, 0);
  }

  /** Say a line for `ev` (the dog growls whatever the event). (guard-ai S14) `unit` >= 1: a line that names that unit
   *  ("Unit three, report..."), where the event has one (`BARKS_UNIT`). */
  bark(ev: BarkEvent, unit = 0): void {
    if (!this.alive) return;
    const e = this.dog && ev !== 'blind' ? 'dog' : ev;
    const line = unit >= 1 ? this.voice.sayUnit(e, unit) : this.voice.say(e);
    if (line) this.ctx.onBark?.(this, line, RADIO_BARKS.has(e), e, this.voice.lastLine, unit);
  }

  /** Shots stopped by the enforcer's shield (tests). */
  shieldBlocks = 0;

  /** The dog's handler: the nearest living, calm-or-not humanoid of its squad (or anyone close) - kept once found. */
  private findLeader(): Enemy | null {
    // (guard-ai S5b) a dog with a handler (the `handler` tag) heels on him only; down, it stays by him
    const hd = this.handler;
    if (hd) {
      this.leader = hd;
      return hd;
    }
    const l = this.leader;
    if (l && l.alive) return l;
    this.leader = null;
    let best: Enemy | null = null;
    let bd = 10;
    for (const o of this.ctx.enemies()) {
      if (o === this || !o.alive || o.dog) continue;
      if (this.squad >= 0 && o.squad !== this.squad) continue;
      const d = hyp2(o.pos.x - this.pos.x, o.pos.z - this.pos.z);
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    this.leader = best;
    return best;
  }

  /** Sniper aiming: how much its scope glints towards a viewer at (x, y, z), 0..1. */
  glintFor(x: number, y: number, z: number): number {
    if (this.def.kind !== 'sniper' || !this.alive || this.taken || this.blindT > 0) return 0;
    const aiming = this.windup > 0 || ((this.state === 'attack' || this.state === 'inCover') && this.los);
    if (!aiming) return 0;
    this.eye(this.tmpEye);
    return glint(this.yaw, this.aimPitch, this.tmpEye.x, this.tmpEye.y, this.tmpEye.z, x, y, z);
  }

  /** A passive guard: sees and hears nothing (the benchmark flight, tests). */
  passive = false;
  /** (PR 3) What INTERROGATE gets out of him (null: nothing, or spent); set by the squad slot that spawned him. */
  info: GuardInfo | null = null;
  /** (guard-ai S4, design 4) Stable guard key in his section (0-31: the awareness roster), stamped at spawn by the
   *  manager and kept by a woken guard (`inherit`); -1 none (keys run out, or no manager). */
  key = -1;
  /** (guard-ai S4) His caution (`awareness.ts` `Caution`: 0 none, 1 timed, 2 held), written by the manager. */
  caution = 0;

  /** (guard-ai S4) Set his caution: cautious he stays on edge (cooldown: sight x `CAUTION.sens`), patrols at
   *  `PACE.cautious` and pauses x `CAUTION.waitMul`. */
  setCaution(c: number): void {
    this.caution = c;
    this.walker.waitMul = c > 0 ? CAUTION.waitMul : 1;
  }

  /**
   * (guard-ai S4) A woken guard is the guard who went down (`EnemyManager.revive` builds a new `Enemy` on the body):
   * his key, squad, held room, passive flag, what he knows (`info`, unless spent), the sniper post and his patrol
   * walker (route, post and facing; its clock moved on by `downFor` s, so a timed loop rejoins where the schedule
   * says), back on the route at the nearest point. (guard-ai S5) He keeps his post too: the leash (centre `post`),
   * its facing and high security, his section and profile (any lure in progress is dropped). (guard-ai S12) And his
   * helmet and armour as they were at the knockout.
   */
  inherit(o: Enemy, downFor = 0): void {
    this.key = o.key;
    this.squad = o.squad;
    this.hold = o.hold;
    this.passive = o.passive;
    this.info = o.info;
    this.post[0] = o.post[0];
    this.post[1] = o.post[1];
    this.setPost(o.postDef, o.postYaw);
    this.section = o.section;
    this.profile = o.profile;
    this.tacticsProfile = o.tacticsProfile;
    // (guard-ai S5b) and his sector tags
    this.slotIdx = o.slotIdx;
    this.zone = o.zone;
    this.zoneX = o.zoneX;
    this.zoneZ = o.zoneZ;
    this.zoneR = o.zoneR;
    this.job = o.job;
    this.roleFlags = o.roleFlags;
    this.reason = o.reason;
    this.pairSlot = o.pairSlot;
    this.handlerSlot = o.handlerSlot;
    this.handler = o.handler;
    this.walker = o.walker;
    this.walker.tick(downFor);
    this.walker.rejoin(this.pos.x, this.pos.z);
    this.setCaution(0);
    // (guard-ai S12) his gear as it was when he went down (a helmet shot off stays off)
    this.setGear(o);
  }

  /** (guard-ai S4, M3) The knockout search: search round (x, z) from now (a waker already searching starts over, so
   *  he and the woken guard search `CAUTION.koSearch` together). */
  koSearch(x: number, z: number): void {
    if (!this.alive || this.alerted) return;
    if (this.aware.level === 'searching') {
      this.aware.t = 0;
      this.searchK = 0;
      this.spotSet = false;
      this.combatSearch = false;
    }
    this.searchAt(x, z, null);
  }

  /**
   * (guard-ai S18, Michael's walk of 4.72 G2: "guards investigating dead bodies give up too easily") A dead body at
   * (x, z): he searches round it the body's way (`SEARCH_BODY`: `BODY_SEARCH` in `gear.ts`, longer and wider than a
   * plain search) before the held caution. Already searching (a call, a pair, another body): he starts over round it.
   * (guard-ai S19) `rush`: he hurries there first (the one who heard the finder's shout, a guard sent on the report).
   */
  bodySearch(x: number, z: number, rush = false): void {
    if (!this.alive || this.alerted) return;
    if (this.aware.level === 'searching') {
      this.aware.t = 0;
      this.searchK = 0;
      this.spotSet = false;
      this.combatSearch = false;
    }
    this.searchAt(x, z, null, SEARCH_BODY);
    this.rush = rush;
  }

  /**
   * (guard-ai S19, walk 4.72 G3: "guards should rush to any triggered alarms or bodies reported") The finder's radio
   * report of a dead body got through and the board sends him (calm, free, in range): he answers ("On my way!"),
   * hurries to the body and searches it the body way (S18) with the finder. His task holds through the search.
   */
  helpSearch(x: number, z: number, incident: number): void {
    if (!this.sendable) return;
    this.bodySearch(x, z, urgentKind('bodyDead'));
    this.incident = incident;
    this.incMode = MODE_HELP;
    this.turnT = 0;
    this.bark('joining');
  }

  /** The perception multiplier: difficulty, plus an officer close by. */
  private get perceptionMul(): number {
    if (this.passive) return 0;
    return this.ctx.diff.perception * (this.buff ? 1.1 : 1);
  }

  private setState(s: EnemyState): void {
    if (this.state === s) return;
    if (s !== 'inCover') {
      this.coverPose = 'none';
      this.coverPeek = 0;
      this.coverWallSide = 0;
    }
    if (this.state === 'inCover' || this.state === 'seekCover') {
      if (s !== 'inCover') this.ctx.releaseCover(this);
    }
    this.state = s;
    this.stateT = 0;
    this.wantCrouch = false;
    this.coverPicked = false;
  }

  /** A noise from (x, z) audible to `radius` (m): suspicion by distance, and a place to look. */
  hear(x: number, z: number, radius = 8): void {
    if (this.alerted || !this.alive || this.passive) return;
    const s = noiseSuspicion(hyp2(x - this.pos.x, z - this.pos.z), radius);
    if (s <= 0) return;
    if (this.def.melee && s >= 0.6) {
      this.alert();
      return;
    }
    this.meter = Math.max(this.meter, s);
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.heard = true;
  }

  /**
   * (guard-ai S1) A sound he hears but is not sent to (hearing tier 1, or a tier-2 hearer the coordinator did not
   * pick): stop and look towards it for `ALERT.hearLook`, the meter pushed to the sound's floor (`noiseSuspicion`,
   * capped at `HEARING.turnMax`, so a sound alone never makes him investigate). No `heard` flag: he never walks over.
   * Already investigating or searching: only the meter (he keeps his own spot). `radius` 0: no meter bump.
   */
  hearTurn(x: number, z: number, radius = 0): void {
    if (this.alerted || !this.alive || this.passive) return;
    if (radius > 0) {
      const s = Math.min(noiseSuspicion(hyp2(x - this.pos.x, z - this.pos.z), radius), HEARING.turnMax);
      if (s > this.meter) this.meter = s;
    }
    const lvl = this.aware.level;
    // (guard-ai S2) sent somewhere by the board: the board owns his target (a later noise does not re-aim him)
    if (lvl === 'investigating' || lvl === 'searching' || this.incident >= 0) return;
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.turnT = ALERT.hearLook;
  }

  /** (guard-ai S1) Looking towards a sound he was not sent to (tests / debug). */
  get turning(): boolean {
    return this.turnT > 0;
  }

  /** (guard-ai S2) May the board's command reach him (alive, calm enough, a brain)? */
  private get sendable(): boolean {
    return this.alive && !this.alerted && !this.passive && !this.taken;
  }

  /**
   * (guard-ai S2) The board sends him to a noise, gunfire heard far off or a lure at (x, z): he says so on the radio,
   * looks (`ALERT.hearLook`), then walks over and looks round (the `heard` path), and is back to his route after.
   */
  sendTo(x: number, z: number, incident: number, calm = false): void {
    if (!this.sendable) return;
    this.incident = incident;
    this.incMode = MODE_INVESTIGATE;
    this.incCalm = calm;
    // (guard-ai S19) gunfire (not calm) is urgent: he hurries over; a plain noise or a lure keeps the calm pace
    this.rush = urgentKind(calm ? 'noise' : 'shots');
    this.turnT = 0;
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.heard = true;
    this.bark('checking');
  }

  /**
   * (guard-ai S2, M1 goal 4) The board sends him to a light that went out at (x, z) (its floor point, or the switch):
   * walk there at the investigate pace, look at the fixture, sweep a 4-point ring 2-6 m round it (`INCIDENT.lightCheck`
   * s at the spot), say "nothing here" and go back to his route calm (no cooldown: "return back to normal"). `slot` 1:
   * the second of a pair (his ring starts offset). Torch on in the dark (the investigating torch rule).
   */
  checkLight(x: number, z: number, incident: number, slot = 0, line: BarkEvent = 'lightOut'): void {
    if (!this.sendable) return;
    this.incident = incident;
    this.incMode = MODE_LIGHT;
    this.turnT = 0;
    this.lc.start(x, z, slot);
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    // (guard-ai S3) his report is a radio call: the section hears it once it completes (an ack, nothing more)
    // (guard-ai S22) a security console switched off again: its own line
    this.bark(line);
    this.ctx.radioCall?.(this, incident, 'light');
    const from = this.aware.level;
    if (from !== 'investigating') {
      this.aware.set('investigating');
      this.onLevel(from, 'investigating');
    }
    this.spotSet = false;
  }

  /**
   * (guard-ai S2, G11) An investigator went quiet: the board sends a pair to (x, z) (where he was last). The lead
   * radios it and searches the spot; the cover searches from `INCIDENT.pairBack` short of it.
   */
  pairSearch(x: number, z: number, incident: number, lead: boolean): void {
    if (!this.sendable) return;
    if (lead) {
      this.bark('missing');
      this.ctx.radioCall?.(this, incident, 'missing');
    }
    this.searchAt(x, z, null);
    // (guard-ai S19) a man not answering (or a shots call's cover): they hurry to the spot
    this.rush = urgentKind(lead ? 'missing' : 'shots');
    this.incident = incident;
    this.incMode = lead ? MODE_LEAD : MODE_COVER;
    this.turnT = 0;
  }

  /**
   * (guard-ai S7, design 9, M6) A camera saw a downed guard and the board sends him to it: no pause to look first (it
   * is an order over the radio, like the light check), straight to investigating at the investigate pace towards the
   * body. Close to it, with a clear line to it, the body-found path takes over (`AiContext.bodyFound`: a knocked-out
   * guard is woken, the area searched). The body gone (carried, hidden, found by someone else) or the walk over
   * `INCIDENT.bodyWalk` s: he looks round where he is (the usual end of an investigation). A glimpse drops it.
   */
  checkBody(b: Body, incident: number): void {
    if (!this.sendable) return;
    this.incident = incident;
    this.incMode = MODE_BODY;
    this.turnT = 0;
    // (guard-ai S19) a body a camera reported: he hurries to it
    this.rush = urgentKind('camBody');
    this.camBody = b;
    this.camBodyT = 0;
    this.stimulus[0] = b.pos.x;
    this.stimulus[1] = b.pos.z;
    this.hasStimulus = true;
    this.bark('checking');
    const from = this.aware.level;
    if (from !== 'investigating') {
      this.aware.set('investigating');
      this.onLevel(from, 'investigating');
    }
    this.spotSet = false;
  }

  /** (guard-ai S7) Per step on the walk to a camera's body (`checkBody`): follow it, hand over to the body-found path. */
  private stepCamBody(dt: number): void {
    const b = this.camBody;
    if (!b) return;
    this.camBodyT += dt;
    if (this.aware.level !== 'investigating') {
      this.camBody = null;
      return;
    }
    if (this.meter >= PERCEPTION.investigate) {
      // a glimpse: he investigates what he saw (the board sees him off its task)
      this.camBody = null;
      this.incident = -1;
      return;
    }
    // (guard-ai S18) a dead body found on the way by the other guard sent with him (or anyone): he joins its search
    // ((S19) still hurrying if he was)
    if (b.found && b.lethal && b.present && !b.carried && !b.hidden) {
      this.camBody = null;
      this.bodySearch(b.pos.x, b.pos.z, this.rush);
      return;
    }
    if (!b.present || b.found || b.carried || b.hidden || this.camBodyT >= INCIDENT.bodyWalk) {
      this.camBody = null;
      return;
    }
    this.stimulus[0] = b.pos.x;
    this.stimulus[1] = b.pos.z;
    if (hyp2(b.pos.x - this.pos.x, b.pos.z - this.pos.z) >= BODY.close) return;
    this.tmpHips.set(b.pos.x, b.pos.y + 0.15, b.pos.z);
    if (!this.losTo(this.eye(this.tmpEye), this.tmpHips, 0.35)) return;
    this.camBody = null;
    this.ctx.bodyFound(this, b);
  }

  // ----- (guard-ai S15, stealth over shooting item 8, A42) the breaker reset walk -----
  /** The circuit he is walking to turn back on (-1 none); the switch, his stand point by it (`brkAt`) and its floor
   *  height, seconds at the switch and on the walk. */
  private brkGroup = -1;
  private readonly brkSw: P2 = [0, 0];
  readonly brkAt: P2 = [0, 0];
  private brkY = 0;
  private brkT = 0;
  private brkWalkT = 0;
  private readonly brkGoal: { point: P2 | null; speed: number; face: number | null } = { point: null, speed: 0, face: null };

  /** (guard-ai S15) The circuit he is walking to turn back on, -1 none (e2e / debug). */
  get breakerGroup(): number {
    return this.brkGroup;
  }

  /**
   * (guard-ai S15, A42) A circuit he saw go dark is a fault, not an attack: the board sends him (the one witness) to its
   * switch at (x, z) (floor `y`). He says so ("Breaker's gone again."), walks over at his patrol pace without leaving his
   * calm level (a glimpse on the way may make him suspicious; anything more drops the walk), works the switch
   * `BREAKER.resetT` s and the circuit comes back on (`AiContext.breakerReset`: the player's own toggle path), then he
   * rejoins his route. No ring check, no radio call. The circuit back on by other means (the player, a timed isolator)
   * ends the walk; so does `BREAKER_WALK.giveUp` s without getting there.
   */
  resetBreaker(x: number, z: number, y: number, incident: number, group: number): void {
    if (!this.sendable || group < 0) return;
    const lvl = this.aware.level;
    if (lvl !== 'unaware' && lvl !== 'cooldown' && lvl !== 'suspicious') return;
    this.incident = incident;
    this.incMode = MODE_BREAKER;
    this.turnT = 0;
    this.brkGroup = group;
    this.brkSw[0] = x;
    this.brkSw[1] = z;
    this.brkAt[0] = x;
    this.brkAt[1] = z;
    this.brkY = y === y ? y : this.pos.y;
    // the walkable cell by the switch (the switch is on a wall)
    const nav = this.ctx.nav;
    const c = nav.nearestWalkable(x, z, 4, this.brkY);
    if (c >= 0) {
      const cc = nav.center(c);
      this.brkAt[0] = cc[0];
      this.brkAt[1] = cc[1];
      // (guard-ai S15 laptop fix) he stands on that cell: its height, not the point's (a wall column's surface is the
      // wall's top, and the "at the switch" test below would never pass: he walked up to it and gave up after 30 s)
      this.brkY = nav.cellHeight(c);
    }
    this.brkT = 0;
    this.brkWalkT = 0;
    this.routePath.length = 0;
    // (guard-ai S22, G6) a security console rides the same walk (a pseudo circuit): its own line
    this.bark(isConsoleGroup(group) ? 'console' : 'breaker');
  }

  /** (guard-ai S15) The walk is over (done, given up, dropped): off the board's task, back to his route. */
  private endBreaker(): void {
    if (this.brkGroup < 0) return;
    this.brkGroup = -1;
    if (this.incMode === MODE_BREAKER) this.incident = -1;
    this.routePath.length = 0;
    this.walker.rejoin(this.pos.x, this.pos.z);
  }

  /** (guard-ai S15) One step of the reset walk: to the switch at patrol pace, work it, the circuit back on. */
  private breakerStep(dt: number): { point: P2 | null; speed: number; face: number | null } {
    const g = this.brkGoal;
    g.point = null;
    g.speed = 0;
    g.face = null;
    this.brkWalkT += dt;
    // the circuit came back on by other means (the player, a timed isolator relighting itself): nothing left to do
    if (this.ctx.breakerOff?.(this.brkGroup) === false) {
      this.endBreaker();
      return g;
    }
    const d = hyp2(this.brkAt[0] - this.pos.x, this.brkAt[1] - this.pos.z);
    if (d > BREAKER_WALK.reach || Math.abs(this.brkY - this.pos.y) > 1.2) {
      this.brkT = 0;
      if (this.brkWalkT >= BREAKER_WALK.giveUp) {
        this.endBreaker();
        return g;
      }
      g.point = this.goTo(this.brkAt, dt, BREAKER_WALK.reach * 0.8, this.brkY);
      g.speed = this.def.walkSpeed * (this.caution > 0 ? PACE.cautious : PATROL_PACE);
      return g;
    }
    // at the switch: face it and work it
    this.brkT += dt;
    g.face = Math.atan2(this.brkSw[0] - this.pos.x, this.brkSw[1] - this.pos.z);
    if (this.brkT >= BREAKER.resetT) {
      const group = this.brkGroup;
      this.endBreaker();
      this.ctx.breakerReset?.(this, group);
    }
    return g;
  }

  /** (guard-ai S2) Someone else is checking what he perceived: look towards it `INCIDENT.ackLook` s and carry on
   *  (`copy`: say "Copy."). Already busy (sent, investigating, searching): only the line. */
  ack(x: number, z: number, copy: boolean): void {
    if (!this.alive || this.alerted || this.passive || this.taken) return;
    if (copy) this.bark('ack');
    const lvl = this.aware.level;
    if (this.incident >= 0 || lvl === 'investigating' || lvl === 'searching') return;
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.turnT = Math.max(this.turnT, INCIDENT.ackLook);
  }

  /** Gunfire close by: straight to combat, towards it. */
  hearGunfire(x: number, z: number): void {
    if (!this.alive) return;
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.gunfire = true;
  }

  /** A squadmate radioed a detection: alert after a short reaction delay. */
  radio(delay: number): void {
    if (!this.alive || this.alerted) return;
    // (guard-ai S3) 0: the next step (the radio net's stagger already holds his reaction)
    if (this.called <= 0) this.called = delay > 0 ? delay : 1e-6;
  }

  /** (guard-ai S3) The radio net runs (coordinated modes with a manager that wires it). */
  private get netOn(): boolean {
    return this.ctx.radioCall !== undefined && (this.ctx.coordinated?.() ?? false);
  }

  /** (guard-ai S3, M5) In combat and not told by anyone: shout (voice range joins at once) and start the contact call
   *  (the section hears it, staggered, once it completes; take him out first and only the voice hearers know). */
  private callContact(): void {
    this.ctx.shout?.(this);
    this.ctx.radioCall?.(this, -1, 'contact');
  }

  /** Something to search for without a sighting (a body, lights cut) around (x, z); with `revive`, wake that
   *  knocked-out victim first. (guard-ai S18) `kind`: the search's numbers (`response.ts` `SEARCH_*`). */
  searchAt(x: number, z: number, revive: Body | null = null, kind: number = SEARCH_PLAIN): void {
    if (!this.alive || this.alerted) return;
    // (guard-ai S17) a plain search keeps to no room (`respondDevice` sets one after this); (S19) nor hurries (the
    // urgent callers set it after this)
    this.searchRoom = null;
    this.searchKind = kind;
    this.rush = false;
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.searchReq = true;
    this.searchOwn = true;
    // (guard-ai S5) a high-security post wakes no one outside his leash (he searches from its edge)
    if (revive && this.inLeash(revive.pos.x, revive.pos.z, 1)) this.reviving = revive;
  }

  /** Something caught the eye at (x, z) (not enough to walk over): raise the meter to `level` and look. */
  notice(x: number, z: number, level: number): void {
    if (!this.alive || this.alerted) return;
    this.meter = Math.max(this.meter, level);
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
  }

  // ----- (guard-ai S5) posts: the leash, high security and the lure (design 6, goal 7, M1, A10, A12) -----

  /** His post (`EnemyManager.placeSlot`): a leash circle of `postDef.leash` m round his spawn point (`post`), facing
   *  `postYaw`; null = a free guard. A normal post is sent anywhere like any guard (`mayLeave`); a high-security one
   *  (`secure`) never leaves the circle: searches, investigations and combat moves are clamped into it, the board never
   *  sends him, and a distraction pulls him to the circle's edge (`lureTo`). */
  postDef: PostDef | null = null;
  postYaw = 0;
  /** (guard-ai S5) His section (Sector Ops: the `SectorDef` index; other maps `sectionAt`) and behaviour profile
   *  ('standard' / 'aggressive': a slot's `profile`; (guard-ai S6) every alarm reinforcement is 'aggressive', M1). */
  section = 0;
  profile: BehaviourProfile = 'standard';
  // (guard-ai S5b) the sector tags `EnemyManager.placeSlot` read (sectorTags.ts); kept by a woken guard (`inherit`)
  /** His slot's index in his section's guard list (-1: not a section slot, e.g. a reinforcement). */
  slotIdx = -1;
  /** His `zone` tag; a secure zone's circle (round his post) he answers first inside (`zoneR` 0: not secure). */
  zone = '';
  zoneX = 0;
  zoneZ = 0;
  zoneR = 0;
  /** His `role` tag (`job`: the slot's role word; S8's numeric `role` is his combat role) and its class flags
   *  (`ROLE_DESK`, `ROLE_SUPERVISOR`, `ROLE_ROVER`, `ROLE_FIXED`). */
  job = '';
  roleFlags = 0;
  /** His `reason` tag (design text; a later bark). */
  reason = '';
  /** (S10 hook) His talking-pair partner's slot index (the `pair` tag; -1 none); `EnemyManager.guardAtSlot` finds him. */
  pairSlot = -1;
  /** (guard-ai S10) While his talking pair meets: the yaw that faces his partner (NaN: no meeting) and his meet point;
   *  the manager writes them at every pair step (`EnemyManager.pairStep`). */
  pairFace = Number.NaN;
  readonly pairPt: P2 = [0, 0];
  private readonly pairGoal: { point: P2 | null; speed: number; face: number | null } = { point: null, speed: 0, face: null };

  // (guard-ai S10) his patrol route: `get patrolRoute()` (CT Core spare 9, after `setPatrol`)

  /** (guard-ai S10) His timed loop's time now (s), NaN without one. */
  loopTime(): number {
    return this.walker.loopTime();
  }

  /** (guard-ai S10) The route point he is at or heading for (his post without a route), written into `out`. */
  routePoint(out: P2): P2 {
    const r = this.walker.route;
    const p = r && r.points.length > 0 ? r.points[Math.min(this.walker.idx, r.points.length - 1)]! : this.post;
    out[0] = p[0];
    out[1] = p[1];
    return out;
  }

  /** (guard-ai S10) Calm enough to stand and talk: unaware, not cautious, not on a board task, not held. */
  get pairCalm(): boolean {
    return this.aware.level === 'unaware' && this.caution === 0 && this.incident < 0 && !this.taken && this.camBody === null;
  }

  /** (guard-ai S21, A120) In a calm area (`calmArea`): calm himself, no alarm, not a high-security post, not on a
   *  response; stealth rules only (the parked modes keep low ready). */
  private carryCalm(): boolean {
    return this.ctx.stealth() && calmArea(this.aware.level, this.caution, this.incident >= 0 || this.camBody !== null, this.ctx.alarmRaised(), this.secure, this.responder || this.crew !== null);
  }

  /** (guard-ai S10) Reacting to something that leaves his level as it is: a look toward a sound, a lure, a glimpse
   *  building (sight evidence above the leak). A talk stops for it (`PairMeet.interrupt`). */
  get disturbed(): boolean {
    return this.turnT > 0 || this.lure.active || this.rate > PERCEPTION.leak;
  }

  /** (guard-ai S10) Say a talking pair's line: spoken (not radio), over his head like a bark; the line is the pair's
   *  table string, so the voice table and its cooldown are skipped. */
  sayLine(text: string): void {
    if (!this.alive) return;
    this.ctx.onBark?.(this, text, false);
  }

  /** A dog's `handler` tag (slot index, -1 none) and the guard it is bound to once he is placed: it heels on him only,
   *  and stays by him when he goes down (`findLeader`). */
  handlerSlot = -1;
  handler: Enemy | null = null;

  /** (guard-ai S6) His profile's numbers (`squadRoles.ts` `profileOf(tacticsProfile)`, S8's numeric code; one source for
   *  the profile numbers): advance hold, cover first, run to contact, never calm. */
  get behaviour(): Readonly<TacticsProfile> {
    return profileOf(this.tacticsProfile);
  }

  /** (guard-ai S6) Has the target in sight now (the command caller is picked from guards who do not: "hide and report"). */
  get targetInView(): boolean {
    return this.los;
  }

  /** (guard-ai S6, design 7) A reinforcement's run-in route (`ReinforceEntry.route`): the next point and the seconds on it;
   *  null = none (straight to the last known position by nav). */
  private entry: readonly (readonly [number, number])[] | null = null;
  private entryK = 0;
  private entryT = 0;
  private readonly entryP: P2 = [0, 0];

  /** (guard-ai S6) Still running his entry route (e2e / debug). */
  get entering(): boolean {
    return this.entry !== null;
  }

  /**
   * (guard-ai S6, design 7, M1 "any reinforcements must be aggressive") He came in on the alarm: profile aggressive, told
   * by command (the next step he is in combat on the shared last known position, `radio(0)`: he answers, he does not call
   * a contact in), and he first runs `route` into the section (if any) unless he sees the target on the way.
   */
  joinAsReinforcement(route: readonly (readonly [number, number])[] | null): void {
    // the S5 string (the e2e filter) and S8's numeric code (the jog, strafes, role weights and `profileOf` read it)
    this.profile = 'aggressive';
    this.tacticsProfile = P_AGGRESSIVE;
    this.entry = route && route.length ? route : null;
    this.entryK = 0;
    this.entryT = 0;
    this.radio(0);
  }

  // ----- (guard-ai S17, Michael's walk of 4.72 G1) a tripped device: its spot and its room, never the player -----
  /** The room a device's search keeps to (null: none); `searchAt` clears it, leaving the search drops it. */
  private searchRoom: RoomRect | null = null;
  /** (guard-ai S17) Came in on a device's alarm (`joinAsResponder`): his search of its spot never ends (an aggressive
   *  reinforcement never calms, S6; a response team sweeps after it, S13). */
  responder = false;
  private readonly entryGoal: { point: P2 | null; speed: number; face: number | null } = { point: null, speed: 0, face: null };

  /** (guard-ai S17) The room a device's search keeps to (e2e / debug; null none). */
  get searchRoomId(): string | null {
    return this.searchRoom ? this.searchRoom.id : null;
  }

  /**
   * (guard-ai S17, G1: "change it so they come to look where the laser is and search the room") The board sends him to a
   * tripped device at (x, z) (a laser beam's midpoint, where a camera saw someone): no pause to look first (the alarm
   * went off), straight to the spot, then he searches round it inside `room` (the room the spot is in; null: round the
   * spot). He knows nothing of the player: no last known position, his own spot (`searchOwn`). Back to his route,
   * on edge, when the search runs out (`standDown` radio line).
   */
  respondDevice(x: number, z: number, incident: number, room: RoomRect | null): void {
    if (!this.sendable) return;
    this.searchAt(x, z, null, SEARCH_DEVICE);
    this.searchRoom = room && inRoom(room, x, z, 0.5) ? room : null;
    // (guard-ai S19) the alarm went off: he hurries there
    this.rush = urgentKind('device');
    this.incident = incident;
    this.incMode = MODE_DEVICE;
    this.turnT = 0;
    this.bark('tripped');
  }

  /**
   * (guard-ai S17, A102) He came in on an alarm a device raised, with no sighting to go on: profile aggressive as every
   * reinforcement (S6, M1), he runs `route` in (if any), then searches the device's spot at (x, z) inside `room` and
   * never calms (`responder`). Not in combat: combat with no last known position would put him on the player
   * wherever he is (the walk's "they somehow know ive climbed elsewhere").
   */
  joinAsResponder(route: readonly (readonly [number, number])[] | null, x: number, z: number, room: RoomRect | null): void {
    this.profile = 'aggressive';
    this.tacticsProfile = P_AGGRESSIVE;
    this.entry = route && route.length ? route : null;
    this.entryK = 0;
    this.entryT = 0;
    this.responder = true;
    this.searchAt(x, z, null, SEARCH_DEVICE);
    this.searchRoom = room && inRoom(room, x, z, 0.5) ? room : null;
    // (guard-ai S19) a reinforcement on an alarm hurries to its spot
    this.rush = urgentKind('device');
  }

  /** (guard-ai S6, S17) One step of his run-in route (`ReinforceEntry.route`), at his run speed; null when there is none
   *  left (he saw the target, ran it to its end, or gave it up after `ENTRY_MAX` s). In combat and on a responder's
   *  search. */
  private entryStep(dt: number): { point: P2 | null; speed: number; face: number | null } | null {
    const en = this.entry;
    if (!en) return null;
    this.entryT += dt;
    if (this.los || this.entryK >= en.length || this.entryT > ENTRY_MAX) {
      this.entry = null;
      return null;
    }
    const p = en[this.entryK]!;
    this.entryP[0] = p[0];
    this.entryP[1] = p[1];
    const wp = this.goTo(this.entryP, dt, 0.8);
    if (!wp || hyp2(p[0] - this.pos.x, p[1] - this.pos.z) < 1) this.entryK++;
    const g = this.entryGoal;
    g.point = wp;
    g.speed = this.def.runSpeed;
    g.face = null;
    return g;
  }

  /** (guard-ai S13, item 11) His response team (its sweep after the search; null: none; `team` is the damage side) and
   *  his rank in it (written by `SweepTeam.tick`: 0 the leader, 1.. the stack behind him, -1 down or held). */
  crew: SweepTeam<Enemy> | null = null;
  teamRank = -1;
  private readonly sweepP: P2 = [0, 0];
  private readonly sweepGoal: { point: P2 | null; speed: number; face: number | null } = { point: null, speed: 0, face: null };

  /** (guard-ai S13) His patrol route's points (null: none), for a response team's sweep source (alarm time only). */
  get routePoints(): readonly (readonly [number, number])[] | null {
    return this.walker.route?.points ?? null;
  }

  /** (guard-ai S13) His post centre (his spawn point), for a response team's sweep source. */
  get postPoint(): readonly [number, number] {
    return this.post;
  }

  /**
   * (guard-ai S13, item 11, A39) The sweep, one step (searching, his team sweeping). The leader walks to the team's
   * current point at the search pace and looks round it `SWEEP.dwell` s (an unreachable point is skipped); a follower
   * keeps his place in the stack behind the leader (`SweepTeam.follow`), jogging when he is well behind, and looks the
   * way the leader looks once there. The torch follows the searching rule (`torchWanted`). No allocation.
   */
  private sweepStep(dt: number, tm: SweepTeam<Enemy>): { point: P2 | null; speed: number; face: number | null } {
    const out = this.sweepGoal;
    const pace = this.def.walkSpeed * this.searchPace;
    const p = this.sweepP;
    const L = tm.leader;
    if (L === this || L === null) {
      const i = tm.point;
      p[0] = tm.pts[2 * i]!;
      p[1] = tm.pts[2 * i + 1]!;
      const d = hyp2(p[0] - this.pos.x, p[1] - this.pos.z);
      if (d <= SWEEP_NEAR) {
        if (tm.dwellT === 0) this.lookBase = this.yaw;
        tm.lead(dt, this.pos.x, this.pos.z);
        this.spotArrived = true;
        out.point = null;
        out.speed = 0;
        out.face = this.lookBase + Math.sin(tm.dwellT * 1.6) * 1.0;
        return out;
      }
      tm.lead(dt, this.pos.x, this.pos.z);
      const wp = this.goTo(p, dt);
      // unreachable: on to the next one
      if (!wp && this.routePath.length === 0) tm.next();
      out.point = wp;
      out.speed = pace;
      out.face = null;
      return out;
    }
    tm.follow(this.teamRank, L.pos.x, L.pos.z, p);
    const d = hyp2(p[0] - this.pos.x, p[1] - this.pos.z);
    if (d < 0.8) {
      out.point = null;
      out.speed = 0;
      out.face = L.yaw;
      return out;
    }
    out.point = this.goTo(p, dt, 0.8);
    out.speed = d > SWEEP_NEAR + 3 ? this.def.runSpeed * 0.6 : pace;
    out.face = null;
    return out;
  }
  private readonly lure = new PostLure();
  private readonly lureOut: PostLureOut = { x: 0, z: 0, yaw: 0, moving: false, phase: LURE.idle };
  private readonly lureP: P2 = [0, 0];
  private readonly lureGoal: { point: P2 | null; speed: number; face: number | null } = { point: null, speed: 0, face: null };
  private readonly leashTmp: P2 = [0, 0];

  /** (guard-ai S5) Give him a post (his spawn point is its centre; `yaw` his post facing), or none. */
  setPost(def: PostDef | null, yaw: number): void {
    this.postDef = def;
    this.postYaw = yaw;
    this.lure.cancel();
  }

  /** (guard-ai S5) A high-security post: never leaves his leash (`mayLeave` false). */
  get secure(): boolean {
    return this.postDef !== null && this.postDef.highSecurity === true;
  }

  /** (guard-ai S5) May he stand at (x, z)? Always for a free guard or a normal post; a high-security post: inside his
   *  leash (+ `margin` m). */
  inLeash(x: number, z: number, margin = 0): boolean {
    const p = this.postDef;
    if (!p || !p.highSecurity) return true;
    return inLeash(x, z, this.post[0], this.post[1], p.leash + margin);
  }

  /** (guard-ai S5) The lure's phase (`LURE` in posts.ts: idle 0, walk 1, look 2, back 3, face 4, done 5). e2e / debug. */
  get lurePhase(): number {
    return this.lure.phase;
  }

  /** (guard-ai S5) The leash point he looks from (valid once lured). e2e / debug. */
  get lureLook(): Readonly<P2> {
    return this.lure.look;
  }

  /**
   * (guard-ai S5, M1 "they should still be able to be distracted at least") A high-security posted guard is lured by a
   * noise, a thrown item or a light cut in his area at (x, z): he walks to the point of his leash nearest it, looks
   * toward it `POST.lureLook` s (sweep <= `POST.lureSweep`, A12), walks back and faces his post (`PostLure`). `radius`:
   * the noise's effective reach at him (the meter floor, as `hearTurn`); 0 = a light (a fixed small floor). A new lure
   * at the same leash point while he walks out or looks does not restart him. Anyone else: nothing (the board decides).
   */
  lureTo(x: number, z: number, radius = 0): void {
    const p = this.postDef;
    if (!p || !p.highSecurity || !this.alive || this.alerted || this.passive || this.taken) return;
    const s = radius > 0 ? Math.min(noiseSuspicion(hyp2(x - this.pos.x, z - this.pos.z), radius), HEARING.turnMax) : PERCEPTION.suspicious + 0.02;
    if (s > this.meter) this.meter = s;
    const lvl = this.aware.level;
    // already looking round (clamped into his leash): the meter only
    if (lvl === 'investigating' || lvl === 'searching') return;
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.turnT = 0;
    const lu = this.lure;
    if (lu.phase === LURE.walk || lu.phase === LURE.look) {
      lurePoint(x, z, this.post[0], this.post[1], p.leash, this.lureP);
      if (hyp2(this.lureP[0] - lu.look[0], this.lureP[1] - lu.look[1]) < 1) return;
    }
    lu.start(x, z, this.post[0], this.post[1], this.postYaw, p.leash);
  }

  /** (guard-ai S5) One step of the lure: walk out (investigate pace), look, walk back, face the post. */
  private lureStep(dt: number): { point: P2 | null; speed: number; face: number | null } {
    const o = this.lureOut;
    const lu = this.lure;
    // at the target the previous step gave (the first step after `start` ignores it)
    const at = hyp2(o.x - this.pos.x, o.z - this.pos.z) < POST.arrive + 0.05;
    const was = lu.phase;
    const ph = lu.step(dt, at, o);
    if (ph === LURE.done && was !== LURE.done) this.walker.rejoin(this.pos.x, this.pos.z);
    const g = this.lureGoal;
    if (o.moving) {
      this.lureP[0] = o.x;
      this.lureP[1] = o.z;
      g.point = this.goTo(this.lureP, dt, POST.arrive);
      g.speed = this.def.walkSpeed * this.investigatePace;
      g.face = null;
    } else {
      g.point = null;
      g.speed = 0;
      g.face = o.yaw;
    }
    return g;
  }

  /** (guard-ai S5) A combat move point clamped into a high-security leash (a scratch point; others unchanged). */
  private leashed(p: Waypoint | null): Waypoint | null {
    const d = this.postDef;
    if (!p || !d || !d.highSecurity || inLeash(p[0], p[1], this.post[0], this.post[1], d.leash)) return p;
    return clampToLeash(p[0], p[1], this.post[0], this.post[1], d.leash, this.leashTmp);
  }

  /** Assigned to raise the alarm at this panel. */
  runAlarm(p: AlarmPanel): void {
    this.bark('alarm');
    this.alarm = p;
    this.alarmT = 0;
    alarmStandPoint(p, this.alarmPt);
  }

  get runningAlarm(): boolean {
    return this.alarm !== null;
  }

  /** Looking for something in the dark (investigating, searching, or hunting unseen): a flashlight on. Dark is the
   *  field's static level where he stands (3.6: lamps count, not just the ambient); one already on stays on up to
   *  `TORCH_KEEP`, so walking through a lamp's pool does not flick it. */
  torchWanted(field: LightField, holding = false): boolean {
    // (coop-torches) the test hook (e2e-coop) forces the rule; a dog still carries none
    const o = this.torchOverride;
    if (typeof o === 'boolean') return o && carriesTorch(this.def);
    // (warehouse-redesign M1) dogs carry no light: the rule says no before the field is read
    // (guard-ai S4, design 4) cautious and calm: the torch rule of a searching guard
    const lvl = this.caution > 0 && this.aware.calmNow ? 'searching' : this.aware.level;
    return torchRule(this.def, lvl, this.los, this.def.quadruped ? 1 : field.levelAt(this.pos.x, this.pos.y + 1.4, this.pos.z), holding);
  }

  /** (coop-torches) Tests / debug only: true or false forces the torch rule (`torchWanted`); null (always in play)
   *  leaves it to the rule. */
  torchOverride: boolean | null = null;

  /** The flashlight follows the head (`placeTorch` in `world/torches.ts`, shared with the co-op client). */
  placeTorch(l: LightDef): void {
    placeTorch(l, this.pos.x, this.pos.y, this.pos.z, this.yaw, this.crouch > 0.5, this.def.scale);
  }

  /** Straight to combat (spawned alerted, shot, tests). */
  alert(): void {
    if (this.alerted || !this.alive) return;
    this.loudAlert = true;
    this.aware.set('alert');
    this.onLevel('unaware', 'alert');
  }

  /** Side effects of an alert-level change. */
  private onLevel(from: AlertLevel, to: AlertLevel): void {
    // (guard-ai S15) the breaker walk is calm: a glimpse that comes to nothing (suspicious and back) keeps it, anything
    // more drops it (the board sees him off its task); while it lasts the task lines below stay quiet
    if (this.brkGroup >= 0 && to !== 'suspicious' && to !== 'unaware' && to !== 'cooldown') this.endBreaker();
    const task = this.brkGroup >= 0 ? -1 : this.incident;
    if (to === 'suspicious') this.bark('suspicious');
    else if (to === 'investigating') this.bark('investigate');
    // (guard-ai S3) told by a shout or the radio: he answers, he did not see anyone
    else if (to === 'alert') this.bark(this.alertIn.called && this.netOn ? 'joining' : 'contact');
    else if (to === 'searching' && from === 'alert') this.bark(this.def.kind === 'officer' ? 'search' : 'lost');
    // (guard-ai S4) unaware -> cooldown is caution setting in: nothing to say
    else if (to === 'cooldown' && from !== 'unaware') this.bark(task >= 0 ? 'standDown' : 'clear');
    else if (to === 'unaware' && task >= 0) this.bark('standDown');
    // (guard-ai S3) back from the board's task: his "nothing here" is a radio call (the section acks it)
    if ((to === 'cooldown' || to === 'unaware') && task >= 0) this.ctx.radioCall?.(this, task, 'standDown');
    // (guard-ai S2) off the board's task: back (calm), in combat, or on another search (a body, a call)
    if (task >= 0) {
      // (guard-ai S17) a device's responder keeps his task on its search, as the missing pair does; (S19) so does a
      // guard sent to a reported body
      const pair = this.incMode === MODE_LEAD || this.incMode === MODE_COVER || this.incMode === MODE_DEVICE || this.incMode === MODE_HELP;
      const keep = to === 'suspicious' || to === 'investigating' ? !pair : to === 'searching' ? pair : false;
      if (!keep) this.incident = -1;
    }
    if (to !== 'investigating') this.lc.stop();
    if (to !== 'investigating') this.camBody = null;
    // (guard-ai S5) a sighting, a search or combat takes over from a lure
    if (to === 'investigating' || to === 'searching' || to === 'alert') this.lure.cancel();
    if (to === 'alert') {
      // (guard-ai S8) his combat dice for this engagement (seeded per guard per engagement, replayable)
      this.rng.reseed(this.ctx.combatSeed?.(this) ?? Math.imul(this.num, 2654435761));
      this.meter = 1;
      if (this.state === 'idle') this.setState('chase');
      // a radioed alert is not relayed (no chain across the map). A loud alert (gunfire, a hit) is called in at
      // once; a sighting is shouted to guards close by and radioed after `ALERT.callIn` - take the spotter out
      // before that and nobody else hears of it
      // (guard-ai S3, M5) coordinated: every alert of his own (a sighting, a hit, gunfire close by, spawned alerted) is
      // shouted (the voice model) and called in over the section net (2.5 s x reaction, then staggered by distance);
      // a guard told by a shout or the radio does not relay. Proposal A13: loud alerts take the same call.
      if (!this.alertIn.called && this.netOn) {
        if (!this.loudAlert && !this.gunfire && this.ctx.stealth() && this.target && this.los) this.target.spotted = true;
        this.callContact();
      } else if (!this.alertIn.called) {
        if (this.loudAlert || this.gunfire || !this.ctx.stealth()) this.ctx.callAlert(this);
        else {
          if (this.target && this.los) this.target.spotted = true;
          this.ctx.shout?.(this);
          this.radioT = callInDelay(this.ctx.diff.reaction) * (this.buff ? ARCHETYPE.officer.reaction : 1);
        }
      }
      this.loudAlert = false;
    } else if (from === 'alert') {
      // combat over: drop out of cover / fights and search
      this.alarm = null;
      this.setState('idle');
      this.burstLeft = 0;
      this.windup = 0;
      this.fireGate.reset();
      this.armourPick = false;
    }
    if (to === 'searching') {
      this.searchK = 0;
      this.spotSet = false;
      if (from === 'alert') {
        this.searchOwn = false;
        // (guard-ai S18) combat's search is a plain one
        this.searchKind = SEARCH_PLAIN;
      }
    }
    this.combatSearch = to === 'searching' && (from === 'alert' || (from === 'searching' && this.combatSearch));
    if (to !== 'searching') this.reviving = null;
    // (guard-ai S17) a device's room bounds only its own search (combat's search is round the last known position)
    if (to !== 'searching' || from === 'alert') this.searchRoom = null;
    // (guard-ai S19) back to calm or into combat: no more hurrying
    if (to === 'unaware' || to === 'cooldown' || to === 'alert') this.rush = false;
    if (to === 'investigating') this.spotSet = false;
    if (to === 'unaware' || to === 'cooldown') {
      this.hasStimulus = false;
      this.walker.rejoin(this.pos.x, this.pos.z);
    }
  }

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || (h.attackerTeam === 'enemy' && !h.shieldHit)) return { dealt: 0, killed: false };
    // a sleep bolt: down at once, knocked out
    if (h.nonLethal) {
      const hp = this.health.hp;
      this.knockOut(h);
      return { dealt: hp, killed: true };
    }
    let mult = h.part === 'head' ? this.def.headMult : this.def.armor;
    const kind = this.def.kind;
    if (h.kind !== 'explosion') {
      // heavy: plates in front, an exposed back, the face plate a weak point
      if (kind === 'heavy') mult = heavyMult(this.yaw, h.dir.x, h.dir.z, h.part === 'head' ? 'head' : 'body');
      // enforcer: rounds from the front stop on the shield
      if (kind === 'enforcer' && h.kind === 'bullet' && !this.taken && shieldBlocks(this.yaw, h.dir.x, h.dir.z)) {
        this.ctx.vfx.sparks(h.point, h.dir.scale(-1), 5, '#d8e4ff');
        this.shieldBlocks++;
        if (!this.alerted && h.sourcePos) {
          this.stimulus[0] = h.sourcePos.x;
          this.stimulus[1] = h.sourcePos.z;
          this.hasStimulus = true;
        }
        this.alert();
        return { dealt: 0, killed: false };
      }
    }
    // (guard-ai S12) gear (`gearHit`): a helmet soaks the first bullet to the head (knocked off), body armour stops
    // bullets to the body (a stagger at most every `GEAR.staggerCd` s); the heavy keeps its own plates; melee,
    // explosions and sleep bolts (above) are untouched
    let gearStagger = 0;
    if (kind !== 'heavy' && h.kind === 'bullet' && (this.helmet || this.armour)) {
      const g = gearHit(h.part, h.kind, false, this, this.sinceStagger, GEAR_OUT);
      if (g.knockOff) this.knockHelmetOff(h);
      if (g.mult <= 0) return this.deflect(h, g.stagger);
      mult *= g.mult;
      gearStagger = g.stagger;
    }
    // one round to the head drops any guard but a heavy (its face plate rules above)
    const headshot = h.kind === 'bullet' && h.part === 'head' && kind !== 'heavy';
    const dealt = this.health.damage(headshot ? this.health.hp : h.amount * mult);
    this.flash = 1;
    if (!this.alerted && h.sourcePos) {
      this.stimulus[0] = h.sourcePos.x;
      this.stimulus[1] = h.sourcePos.z;
      this.lastKnown.copyFrom(h.sourcePos);
      this.lastSeenT = 0;
    }
    this.alert();
    if (dealt > 35) this.stagger = 0.35;
    if (gearStagger > 0 && this.health.alive) this.strikeStagger(gearStagger);
    // getting shot in the open pushes cover users to find cover
    if (this.def.usesCover && this.state === 'attack' && this.rng.next() < 0.5) this.setState('seekCover');
    if (!this.health.alive) this.die(h);
    return { dealt, killed: !this.health.alive };
  }

  /** (guard-ai S12) A bullet stopped by his helmet or vest: sparks, no damage, staggered `stagger` s (the strike
   *  stagger: no fire, aim broken; 0 = none), then the normal "I'm hit" reaction (combat on the shot's origin, his
   *  contact call). */
  private deflect(h: HitInfo, stagger: number): DamageResult {
    this.ctx.vfx.sparks(h.point, this.tmpN.copyFrom(h.dir).scaleInPlace(-1), 6, '#e8eef5');
    this.flash = 1;
    if (!this.alerted && h.sourcePos) {
      this.stimulus[0] = h.sourcePos.x;
      this.stimulus[1] = h.sourcePos.z;
      this.lastKnown.copyFrom(h.sourcePos);
      this.lastSeenT = 0;
    }
    this.bark('deflect');
    if (stagger > 0) this.strikeStagger(stagger);
    this.alert();
    if (this.def.usesCover && this.state === 'attack' && this.rng.next() < 0.5) this.setState('seekCover');
    return { dealt: 0, killed: false, deflect: true };
  }
  private readonly tmpN = new Vector3();

  private die(h: HitInfo, lethal = true): void {
    // (guard-ai S3) killed or knocked out before his call got through: it is lost
    this.ctx.radioCut?.(this);
    this.setState('dead');
    this.hitboxes.dispose();
    this.ctx.registry.removeTarget(this);
    if (this.laser) this.laser.isVisible = false;
    if (this.glintMesh) this.glintMesh.isVisible = false;
    if (this.dog) {
      // the dog lies where it fell (no humanoid body to find or carry)
      this.dog.layDown();
      this.rig.dispose();
      this.ctx.onKilled(this, h);
      return;
    }
    this.rig.heldWeapon = null;
    // (artnext C9) killed while render-frozen (a partner's shot, a grenade out of view): the rig still holds the pose at
    // the freeze, so solve it once at his current place first; the ragdoll and `Body.pos` then never depend on whether
    // this page's camera saw him
    if (!this.rig.root.isEnabled(false)) this.animTier.solveNow(this.rig, ANIM_TIER_FROZEN_CARRY_MAX, this.rp);
    const imp = h.dir.scale(Math.min(80, 8 + h.impulse * 3) * (h.kind === 'explosion' ? 2.5 : 1));
    imp.y += h.kind === 'explosion' ? 25 : 3;
    // the rig stays in the world as a body (ragdoll when one can be spared)
    this.ctx.addBody(this, this.rig, imp, lethal);
    this.ctx.onKilled(this, h);
  }

  /** Went down knocked out (not killed). */
  ko = false;

  /** Knocked out (non-lethal takedown): down like a kill, but wakes if a squadmate finds the body. */
  knockOut(h: HitInfo): void {
    if (!this.alive) return;
    this.ko = true;
    this.health.damage(this.health.hp);
    this.die(h, false);
  }

  /** (F1a) Killed outright by a melee finisher (the lethal palm strike): down like a kill, armour and the heavy plates
   *  ignored, no alert. */
  killOutright(h: HitInfo): void {
    if (!this.alive) return;
    this.health.damage(this.health.hp);
    this.die(h, true);
  }

  /** Fixed-step brain + movement. */
  update(dt: number): void {
    if (!this.alive) return;
    this.walker.tick(dt);
    this.stateT += dt;
    this.sinceStagger += dt;
    this.prevPos.copyFrom(this.pos);
    this.prevYaw = this.yaw;
    // in a takedown: the attacker drives the body, the brain is off
    if (this.taken) {
      this.syncHitboxes(dt);
      return;
    }
    // flashbanged: no brain until the eyes clear, then combat
    if (this.blindT > 0) {
      this.blindT -= dt;
      this.vel.setAll(0);
      this.syncHitboxes(dt);
      if (this.blindT <= 0) {
        this.blindT = 0;
        emoteBlindEnd(this.emoteSt);
        this.rig.emote = null;
        // (guard-ai S3) in combat before the flash (his call was cut): he calls it in again
        if (this.alerted && this.netOn) this.callContact();
        else this.alert();
      }
      return;
    }
    this.voice.tick(dt);
    if (this.radioT > 0) {
      this.radioT -= dt;
      if (this.radioT <= 0) {
        this.radioT = 0;
        if (this.alerted) {
          this.ctx.callAlert(this);
          this.bark('callIn');
        }
      }
    }
    if (this.shotsHere > 0) this.postT += dt;
    this.fireT = Math.max(0, this.fireT - dt);
    this.fireGate.step(dt);
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.stagger = Math.max(0, this.stagger - dt);
    this.strikeStaggerT = Math.max(0, this.strikeStaggerT - dt);
    this.lastSeenT += dt;
    this.grenadeCd -= dt;
    this.doorCheck = Math.max(0, this.doorCheck - dt);
    this.strafeT -= dt;
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.22 + Math.random() * 0.08;
      this.perceive();
    }
    if (this.los) this.losT += dt;
    else this.losT = 0;
    this.updateAwareness(dt);
    // (guard-ai S21) holstered in a calm area, drawn above it (no fire until the draw ends, `tryFire`)
    this.carry.step(dt, this.carryCalm());

    // on a ladder / dropping off a ledge: the route drives the body until it is off
    if (this.link) {
      this.runLink(dt);
      this.syncHitboxes(dt);
      return;
    }
    const goal = this.decide(dt);
    this.move(dt, goal.point, goal.speed, goal.face);
    this.crouch += ((this.wantCrouch ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    this.syncHitboxes(dt);
  }

  private perceive(): void {
    // entering a new room without sight of the target: stop at the threshold and check it first
    const rooms = this.ctx.rooms;
    if (rooms.length) {
      const ri = roomAt(rooms, this.pos.x, this.pos.z, this.pos.y);
      if (ri !== this.room) {
        if (this.room >= 0 && ri >= 0 && this.alerted && !this.los && this.state === 'chase' && !this.def.melee) this.doorCheck = 0.7;
        this.room = ri;
      }
    }
    // nearest living player
    let best: PlayerRef | null = null;
    let bd = Infinity;
    for (const p of this.ctx.players()) {
      if (!p.target.alive) continue;
      const d = Vector3.Distance(p.feet, this.pos);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    this.target = best;
    this.dist = bd;
    if (!best) {
      this.los = false;
      this.rate = 0;
      return;
    }
    const eye = this.eye(this.tmpEye);
    // line of sight to the chest, head and hips: in combat any of them is enough to shoot at; the fraction
    // in view scales how fast an unaware enemy notices
    best.target.aimPoint(this.tmp);
    // (G44) elevation of the chest above the eye line: the vertical view limit (perception `pitchFactor`)
    const pitch = Math.atan2(this.tmp.y - eye.y, hyp2(this.tmp.x - eye.x, this.tmp.z - eye.z));
    const chest = this.losTo(eye, this.tmp, 0.3);
    if (chest) this.lastKnown.copyFrom(this.tmp);
    let head = false;
    let n = chest ? 1 : 0;
    this.losHead = false;
    if (best.target.headPoint) {
      best.target.headPoint(this.tmpHead);
      head = this.losTo(eye, this.tmpHead, 0.2);
      if (head) {
        n++;
        if (!chest) {
          this.losHead = true;
          this.lastKnown.copyFrom(this.tmpHead);
        }
      }
    }
    this.los = chest || head;
    // hips (only needed for the meter, so skipped in combat)
    if (!this.alerted) {
      const top = best.target.headPoint ? this.tmpHead.y : this.tmp.y + 0.4;
      this.tmpHips.set(best.feet.x, best.feet.y + (top - best.feet.y) * EXPOSE_HIPS, best.feet.z);
      if (this.losTo(eye, this.tmpHips, 0.2)) n++;
    }
    const samples = best.target.headPoint ? 3 : 2;
    if (this.los) this.lastSeenT = 0;
    // light on the target (perception reads it): the owner's sample, else the light field at the aim point
    this.targetLight = best.light ?? fieldLight(this.ctx, this.tmp.x, this.tmp.y, this.tmp.z);
    // awareness: sight fill rate from distance, field of view, light, stance, motion and exposure
    const si = this.sight;
    si.dist = bd;
    si.angle = wrapAngle(Math.atan2(best.feet.x - this.pos.x, best.feet.z - this.pos.z) - this.yaw);
    si.light = this.targetLight;
    si.crouched = best.crouched;
    si.speed = best.speed;
    si.exposure = this.alerted ? (this.los ? 1 : 0) : n / samples;
    si.sensitivity = this.aware.sensitivity * this.perceptionMul;
    // in combat the guard tracks the target in 3D, and a dog's low eye looks up at everyone: no vertical limit
    si.pitch = this.alerted || this.dog !== null ? 0 : pitch;
    this.rate = sightRate(si);
    // the dog smells what it cannot see (no light or line of sight needed)
    this.smelled = false;
    if (this.dog) {
      const sm = smellRate(bd, best.crouched) * this.perceptionMul;
      if (sm > 0) {
        this.smelled = true;
        if (sm > this.rate) this.rate = sm;
        best.target.aimPoint(this.lastKnown);
        this.lastSeenT = 0;
      }
    }
    if (!this.alerted && !this.passive && instantDetect(si)) this.meter = 1;
    if (this.rate > 0 && !this.alerted) {
      // what caught the eye: look there (and investigate there)
      this.stimulus[0] = best.feet.x;
      this.stimulus[1] = best.feet.z;
      this.hasStimulus = true;
    }
    if (this.alerted && this.los) this.ctx.reportSighting(best);
    this.lookForBodies(eye);
  }

  /** Not in combat: notice a downed body (light, distance, field of view, line of sight). One ray at most. */
  private lookForBodies(eye: Vector3): void {
    if (this.alerted || this.def.melee) return;
    const bodies = this.ctx.bodies();
    let pick: Body | null = null;
    let pd = Infinity;
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i]!;
      if (b.found || !b.present) continue;
      const d = hyp2(b.pos.x - this.pos.x, b.pos.z - this.pos.z);
      if (d >= pd || d >= BODY.range) continue;
      const ang = wrapAngle(Math.atan2(b.pos.x - this.pos.x, b.pos.z - this.pos.z) - this.yaw);
      if (!bodyNoticed(d, ang, b.light)) continue;
      pd = d;
      pick = b;
    }
    if (!pick) return;
    this.tmpHips.set(pick.pos.x, pick.pos.y + 0.15, pick.pos.z);
    if (this.losTo(eye, this.tmpHips, 0.35)) this.ctx.bodyFound(this, pick);
  }

  private losTo(eye: Vector3, to: Vector3, slack: number): boolean {
    return losClear(this.ctx.ballistics, eye, to, slack);
  }

  /** Per fixed step: the awareness meter and the alert level. */
  private updateAwareness(dt: number): void {
    const seen = this.alerted ? this.los || this.smelled : seenAt(this.rate);
    this.sinceSeen = seen ? 0 : this.sinceSeen + dt;
    if (this.turnT > 0) this.turnT -= dt;
    if (!this.alerted) this.meter = stepMeter(this.meter, this.rate, dt, this.sinceSeen);
    if (this.called > 0) {
      this.called -= dt;
      if (this.called <= 0) this.alertIn.called = true;
    }
    // (guard-ai S7) on the walk to a body a camera saw: the body-found path takes over there (`i.search` below)
    if (this.camBody) this.stepCamBody(dt);
    const i = this.alertIn;
    i.meter = this.meter;
    // outside stealth rules (Wave) they are sent at the target: combat never cools into a search; nor does a
    // run to an alarm panel
    i.seeing = seen || (this.alerted && !this.ctx.stealth()) || this.alarm !== null;
    i.arrived = this.spotArrived;
    i.sinceSeen = this.sinceSeen;
    i.heard = this.heard;
    i.damaged = false;
    i.gunfire = this.gunfire;
    i.search = this.searchReq;
    // (guard-ai S2) a glimpse during the light check: he drops it and investigates what he saw (the board sees him off
    // its task and closes the light)
    if (this.lc.active && this.meter >= PERCEPTION.investigate) {
      this.lc.stop();
      this.incident = -1;
    }
    // (guard-ai S7) the walk to a camera's body runs on its own clock too (`INCIDENT.bodyWalk`)
    i.hold = this.lc.active || this.camBody !== null;
    // (guard-ai S5) a lured posted guard is dealing with it: the linger rule does not walk him off his leash
    i.turning = this.turnT > 0 || this.lure.active || this.brkGroup >= 0;
    // (guard-ai S3, S2 check polish 2) sent to a plain noise / lure: nothing found -> back to normal, no cooldown
    i.calmEnd = this.incident >= 0 && this.incMode === MODE_INVESTIGATE && this.incCalm;
    // (guard-ai S4) cautious (a death he knows of, a knockout he found or woke from): on edge, never unaware
    i.cautious = this.caution > 0;
    // (guard-ai S6) an aggressive guard who has fought (a reinforcement) never calms: his search does not end
    // (guard-ai S17) so does a responder on a device's alarm (he came in on it, the stage stays up)
    i.hunting = (this.aware.fought || this.responder) && profileOf(this.tacticsProfile).neverCautious;
    // (guard-ai S18) the search's length by its kind (a dead body's is longer)
    i.searchFor = searchSpec(this.searchKind).time;
    const from = this.aware.level;
    if (this.aware.step(dt, i)) this.onLevel(from, this.aware.level);
    // in combat without sight: arriving at the last known position with nothing there starts the search
    if (this.aware.level === 'alert' && !this.los && this.ctx.stealth() && this.state === 'chase' && this.sinceSeen > 1.5) {
      const k = this.ctx.lkpValid() ? this.ctx.lkp : null;
      if (k && hyp2(k.x - this.pos.x, k.z - this.pos.z) < 1.5) {
        this.aware.set('searching');
        this.onLevel('alert', 'searching');
      }
    }
    if (this.aware.level !== 'alert' && this.meter >= 1) this.meter = 0.99;
    i.called = false;
    this.heard = false;
    this.gunfire = false;
    this.searchReq = false;
  }

  /** Head towards a floor point: straight when the line is clear, else along an A* path (replanned when the
   *  goal moves). Returns the next waypoint, or null when there. */
  private goTo(p: P2, dt: number, near = 0.6, y = Number.NaN): Waypoint | null {
    // no height given: the storey nearest its own (patrol routes and heard spots are floor points)
    if (y !== y) y = this.pos.y;
    const me = this.meP;
    me[0] = this.pos.x;
    me[1] = this.pos.z;
    if (hyp2(p[0] - me[0], p[1] - me[1]) < near && (y !== y || Math.abs(y - this.pos.y) < 1.2)) return null;
    const nav = this.ctx.nav;
    if (nav.lineClear(me, p, this.pos.y, y)) {
      this.routePath.length = 0;
      return p;
    }
    this.routeT -= dt;
    const moved = !(hyp2(p[0] - this.routeGoal[0], p[1] - this.routeGoal[1]) < 1.5);
    if ((moved && this.routeT <= 0) || this.routePath.length === 0 || this.routeVer !== nav.version) {
      this.routeT = 1;
      this.routeVer = nav.version;
      this.routeGoal[0] = p[0];
      this.routeGoal[1] = p[1];
      this.routePath = nav.findPath(me, p, 3000, this.pos.y, y) ?? [];
      if (this.routePath.length === 0) return null;
    }
    const wp = this.routePath[0]!;
    // a ladder / drop waypoint is taken (and dropped) by `move`
    if (!wp.link && hyp2(wp[0] - me[0], wp[1] - me[1]) < 0.4) this.routePath.shift();
    return this.routePath[0] ?? p;
  }

  /** Not in combat: patrol / post, look at a stimulus, investigate it, or search. */
  private calmDecide(dt: number): { point: P2 | null; speed: number; face: number | null } {
    const def = this.def;
    const lvl = this.aware.level;
    this.spotArrived = false;
    switch (lvl) {
      case 'unaware':
      case 'cooldown': {
        // (guard-ai S5) a high-security post lured to his leash edge and back
        if (this.lure.active) return this.lureStep(dt);
        // (guard-ai S15) the breaker reset walk (calm: his patrol pace)
        if (this.brkGroup >= 0) return this.breakerStep(dt);
        // (guard-ai S1) a sound he was not sent to: stand and look towards it a moment (`hearTurn`)
        if (this.turnT > 0 && this.hasStimulus) return { point: null, speed: 0, face: Math.atan2(this.stimulus[0] - this.pos.x, this.stimulus[1] - this.pos.z) };
        // the dog heels beside its handler
        if (this.dog) {
          const h = this.findLeader();
          if (h) {
            const s = Math.sin(h.yaw);
            const c = Math.cos(h.yaw);
            const heel = ARCHETYPE.dog.heel;
            this.spot[0] = h.pos.x + c * heel - s * 0.5;
            this.spot[1] = h.pos.z - s * heel - c * 0.5;
            const far = hyp2(this.spot[0] - this.pos.x, this.spot[1] - this.pos.z);
            if (far < 0.5) return { point: null, speed: 0, face: h.yaw };
            return { point: this.goTo(this.spot, dt, 0.3), speed: far > 3 ? def.runSpeed * 0.6 : def.walkSpeed * PATROL_PACE * 1.2, face: null };
          }
        }
        const g = this.walker.step(dt, this.pos.x, this.pos.z);
        // (guard-ai S10) his talking pair is meeting: on to his meet point, then stand there facing his partner. The
        // walker still steps (its clock and schedule run on): he walks on late after the talk and the timed loop's
        // next stop takes the delay back
        const pf = this.pairFace;
        if (pf === pf) {
          const pg = this.pairGoal;
          const pp = this.pairPt;
          if (hyp2(pp[0] - this.pos.x, pp[1] - this.pos.z) > PATROL.arrive) {
            pg.point = this.goTo(pp, dt, 0.05) ?? pp;
            pg.speed = def.walkSpeed;
            pg.face = null;
          } else {
            pg.point = null;
            pg.speed = 0;
            pg.face = pf;
          }
          return pg;
        }
        const ly = this.walker.lookYaw;
        // (walls in the way: along an A* path; the walker's own arrival radius decides when it is there)
        const wp = g ? (this.goTo(g, dt, 0.05) ?? g) : null;
        // (guard-ai S4, A9) cautious: a slower, watchful patrol (a timed loop keeps its schedule's pace)
        return { point: wp, speed: def.walkSpeed * (this.walker.route?.loop ? 1 : this.caution > 0 ? PACE.cautious : PATROL_PACE), face: g || Number.isNaN(ly) ? null : ly };
      }
      case 'suspicious': {
        // (guard-ai S5) the lure's own suspicion: keep at it (a glimpse of something stops him to look)
        if (this.lure.active && this.rate <= 0) return this.lureStep(dt);
        // (guard-ai S15) the breaker walk goes on once nothing is in sight (a glimpse stops him to look)
        if (this.brkGroup >= 0 && this.rate <= 0) return this.breakerStep(dt);
        // stop and look at what caught the eye / ear
        const face = this.hasStimulus ? Math.atan2(this.stimulus[0] - this.pos.x, this.stimulus[1] - this.pos.z) : null;
        return { point: null, speed: 0, face };
      }
      case 'investigating':
      case 'searching': {
        const rv = this.reviving;
        if (lvl === 'searching' && rv) {
          if (!rv.present) this.reviving = null;
          else {
            this.spot[0] = rv.pos.x;
            this.spot[1] = rv.pos.z;
            if (hyp2(rv.pos.x - this.pos.x, rv.pos.z - this.pos.z) < 1.1) {
              // kneel over the victim and bring them round
              this.wantCrouch = true;
              rv.reviveT += dt;
              if (rv.reviveT >= BODY.reviveTime) {
                this.reviving = null;
                this.wantCrouch = false;
                this.ctx.revive(rv, this);
              }
              return { point: null, speed: 0, face: Math.atan2(rv.pos.x - this.pos.x, rv.pos.z - this.pos.z) };
            }
            return { point: this.goTo(this.spot, dt, 0.9), speed: def.walkSpeed * PACE.revive, face: null };
          }
        }
        // (guard-ai S17) a responder runs his entry route in before he searches the device's spot
        if (lvl === 'searching' && this.entry) {
          const eg = this.entryStep(dt);
          if (eg) return eg;
        }
        // (guard-ai S13) a response team past its search of the last known position sweeps the section
        const crew = this.crew;
        if (lvl === 'searching' && crew && crew.sweeping) return this.sweepStep(dt, crew);
        if (lvl === 'investigating' && this.lc.active) return this.lightStep(dt);
        if (lvl === 'investigating') {
          // the latest stimulus is the spot
          this.spot[0] = this.stimulus[0];
          this.spot[1] = this.stimulus[1];
          if (!this.hasStimulus) {
            this.spot[0] = this.pos.x;
            this.spot[1] = this.pos.z;
          }
        } else if (!this.spotSet) {
          // next point of the sweep round the last known position (or the stimulus)
          const k = this.ctx.lkpValid() && this.ctx.stealth() && !this.searchOwn ? this.ctx.lkp : null;
          const cx = this.hasStimulus && !k ? this.stimulus[0] : k ? k.x : this.pos.x;
          const cz = this.hasStimulus && !k ? this.stimulus[1] : k ? k.z : this.pos.z;
          if (this.searchK === 0) {
            this.spot[0] = cx;
            this.spot[1] = cz;
          } else ringPoint(cx, cz, this.searchK - 1, this.ctx.searchSlot(this), searchSpec(this.searchKind), this.spot);
          const c = this.ctx.nav.nearestWalkable(this.spot[0], this.spot[1], 4);
          if (c >= 0) {
            const cc = this.ctx.nav.center(c);
            this.spot[0] = cc[0];
            this.spot[1] = cc[1];
          }
          this.spotSet = true;
          this.spotLookT = 0;
        }
        if (this.hold && !inRoom(this.hold, this.spot[0], this.spot[1])) clampToRoom(this.hold, this.spot[0], this.spot[1], 0.8, this.spot);
        // (guard-ai S17) a device's search keeps to the device's room
        const sr = this.searchRoom;
        if (sr && lvl === 'searching' && !inRoom(sr, this.spot[0], this.spot[1])) clampToRoom(sr, this.spot[0], this.spot[1], 0.8, this.spot);
        // (guard-ai S5) a high-security post never joins a search outside his leash: he looks from its edge
        const pd = this.postDef;
        if (pd && pd.highSecurity) clampToLeash(this.spot[0], this.spot[1], this.post[0], this.post[1], pd.leash, this.spot);
        const d = hyp2(this.spot[0] - this.pos.x, this.spot[1] - this.pos.z);
        const there = d < 1.1;
        if (there) {
          // (guard-ai S19) there: the hurry is over (the search goes on at its pace)
          this.rush = false;
          this.spotArrived = true;
          if (this.spotLookT === 0) this.lookBase = this.yaw;
          this.spotLookT += dt;
          // (guard-ai S18) the look per point by the search's kind
          if (lvl === 'searching' && this.spotLookT >= searchSpec(this.searchKind).look) {
            this.searchK++;
            this.spotSet = false;
          }
          // look round: sweep either side of the arrival facing
          return { point: null, speed: 0, face: this.lookBase + Math.sin(this.spotLookT * 1.6) * 1.0 };
        }
        this.spotLookT = 0;
        const wp = this.goTo(this.spot, dt);
        if (!wp && lvl === 'searching' && this.routePath.length === 0 && d > 1.1) {
          // unreachable: skip it
          this.searchK++;
          this.spotSet = false;
        }
        // (guard-ai S19) hurrying to it: a jog (`paceSpeed`), else his calm pace
        return { point: wp, speed: paceSpeed(this.rush, lvl === 'searching' ? this.searchPace : this.investigatePace, def.walkSpeed, def.runSpeed), face: null };
      }
      default:
        return { point: null, speed: 0, face: null };
    }
  }

  /** (guard-ai S2) Coordinated (the incident board) or the parked modes' old rules. */
  private get coordinated(): boolean {
    return this.ctx.coordinated?.() === true;
  }

  private get investigatePace(): number {
    return this.coordinated ? PACE.investigate : PACE.oldInvestigate;
  }

  /** (guard-ai S2 fix 2) A search after combat keeps the old pace (A9's slow search is the calm one). */
  private get searchPace(): number {
    return this.coordinated && !this.combatSearch ? PACE.search : PACE.oldSearch;
  }

  /** The aimed motion (fast turn): in combat, any search in the parked modes, a search after combat. */
  private get aimedMotion(): boolean {
    return this.alerted || (this.level === 'searching' && (!this.coordinated || this.combatSearch));
  }

  /** (guard-ai S2) The light check, step by step (investigating; `LightCheck`): walk to the light, look, the ring,
   *  then stand down. */
  private lightStep(dt: number): { point: P2 | null; speed: number; face: number | null } {
    const r = this.lc.step(dt, this.pos.x, this.pos.y, this.pos.z, this.yaw, this.ctx.nav, this.lcWalker);
    if (r === LC_DONE) {
      this.standDown();
      return { point: null, speed: 0, face: null };
    }
    if (r === LC_FACE) {
      this.spotArrived = true;
      return { point: null, speed: 0, face: this.lc.face };
    }
    const p = this.lc.point;
    return { point: p, speed: p ? this.def.walkSpeed * this.investigatePace : 0, face: null };
  }

  /** (guard-ai S2) The light check is done: "nothing here", back to his route calm (cautious only if he has fought). */
  private standDown(): void {
    this.lc.stop();
    const to = this.aware.fought ? 'cooldown' : 'unaware';
    this.aware.set(to);
    this.onLevel('investigating', to);
  }

  // ---- (guard-ai S8, design 8) squad tactics: the role the manager gives him in an engaged group ----
  /** Behaviour profile code for the squad roles (`P_STANDARD` / `P_AGGRESSIVE` / `P_POST`, squadRoles.ts):
   *  `EnemyManager.placeSlot` sets `P_POST` for a guard with a post, `P_AGGRESSIVE` for `profile: 'aggressive'`, else
   *  standard; a woken guard keeps it (`inherit`); S6 reinforcements `P_AGGRESSIVE`. (A numeric code beside S5's string
   *  `profile`.) */
  tacticsProfile = P_STANDARD;
  /** Role in the engaged group (`R_*`, the manager's 2 Hz `assignRoles`); `R_NONE` outside one, or in the parked
   *  modes: today's tactics. `R_SEARCH` also keeps today's tactics. */
  role = R_NONE;
  /** The cover the role wants (index into `ctx.cover`), -1 none. */
  private roleCover = -1;
  /** The group lets him leave cover for it now (one point and one flanker moving at a time). */
  private roleMoving = false;
  /** May run (between covers, or aggressive): the e2e / debug read it. */
  roleRun = false;
  /** A squadmate (point or flank) is moving: the overwatch suppresses the last known position. */
  private mateMoving = false;
  /** The reporter's contact call is still open: he stays down and holds his fire. */
  private onRadio = false;
  /** Point with no cover left to bound to: walking the last stretch to the last known position (out of the group;
   *  the manager clears it when he leaves combat). */
  closing = false;
  /** `roleStep`'s goal, reused (decide runs every frame: no allocation). */
  private readonly roleGoal: { point: P2 | null; speed: number; face: number | null } = { point: null, speed: 0, face: null };

  /** The role's name (tests, e2e, debug). */
  get roleName(): Role {
    return ROLES[this.role] ?? 'none';
  }

  /** The target was in line of sight at the last think (the manager's role input). */
  get seesTarget(): boolean {
    return this.los;
  }

  /** (manager, 2 Hz) This tick's role. No allocation. (S5 + S8, A18) A high-security post never takes a role cover
   *  outside his leash: it is dropped (he holds where he is, inside it), and he never bounds as point or flank (his
   *  `P_POST` weights are 0; with any other profile that role is dropped to today's leashed tactics). */
  setRole(role: number, cover: number, moving: boolean, run: boolean, mateMoving: boolean, onRadio: boolean): void {
    if (this.secure) {
      if (role === R_POINT || role === R_FLANK) role = R_SEARCH;
      const cv = cover >= 0 ? this.ctx.cover[cover] : undefined;
      if (cover >= 0 && (!cv || !this.inLeash(cv.pos.x, cv.pos.z))) {
        cover = -1;
        moving = false;
        run = false;
      }
    }
    if (role === R_OVERWATCH && mateMoving && !this.mateMoving && this.alive && this.alerted) this.bark('covering');
    this.role = role;
    this.roleCover = cover;
    this.roleMoving = moving;
    this.roleRun = run;
    this.mateMoving = mateMoving;
    this.onRadio = onRadio && role === R_REPORTER;
  }

  /**
   * The role's moves before today's state machine: go to the role's cover when the group lets him (a trip once
   * started is finished; a standard point bounds only out of sight and after `advanceHold` in cover), and out of sight
   * in the open wait for the group (no walk-up into the open). Null: today's state machine carries on.
   */
  private roleStep(dt: number, toTarget: number): { point: P2 | null; speed: number; face: number | null } | null {
    if (this.closing) return null;
    const role = this.role;
    const c = this.roleCover;
    const aggressive = this.tacticsProfile === P_AGGRESSIVE;
    const there = c >= 0 && c === this.coverIdx && (this.state === 'inCover' || this.state === 'seekCover');
    const travelling = this.state === 'seekCover' && this.coverPicked;
    const g = this.roleGoal;
    g.point = null;
    g.speed = 0;
    g.face = toTarget;
    if (c >= 0 && !there && !travelling && this.roleMoving && this.stagger <= 0) {
      const go = role !== R_POINT || aggressive || (!this.los && (this.state !== 'inCover' || this.stateT >= profileOf(this.tacticsProfile).advanceHold));
      if (go) {
        if (this.boundTo(c, role === R_POINT)) {
          if (role === R_POINT) this.bark('moving');
          else if (role === R_FLANK) this.bark('flanking');
          return g;
        }
        // no path (blocked for a while) or taken: no new A* every frame until the next roles tick
        this.roleCover = -1;
      }
    }
    if (this.los || (this.state !== 'chase' && this.state !== 'idle')) return null;
    // out of sight in the open with no cover to bound to: the point walks the last stretch (out of the group, today's
    // advance at ADVANCE_PACE, a jog if aggressive); the rest wait for the group
    if (role === R_POINT && c < 0) {
      this.closing = true;
      return null;
    }
    this.wantCrouch = this.onRadio;
    if (role === R_OVERWATCH && this.mateMoving && profileOf(this.tacticsProfile).suppress) this.suppressLkp(dt);
    return g;
  }

  /** Path to cover `idx`, reserve it and go (`seekCover`); a point's bound is an advance. False: no path (blocked for
   *  a while) or taken. */
  private boundTo(idx: number, advance: boolean): boolean {
    const c = this.ctx.cover[idx];
    if (!c) return false;
    const path = this.ctx.nav.findPath([this.pos.x, this.pos.z], [c.pos.x, c.pos.z], 3000, this.pos.y, c.pos.y);
    if (!path) {
      this.ctx.blockCover?.(idx);
      return false;
    }
    this.setState('seekCover');
    if (!this.ctx.reserveCover(this, idx)) return false;
    this.coverPicked = true;
    this.advancing = advance;
    // (S16 merge) the group's cover wins over a pending armour pick (it would only go stale)
    this.armourPick = false;
    this.coverIdx = idx;
    this.path = path;
    this.peekCycles = 0;
    return true;
  }

  /** Overwatch: suppressive fire at the shared last known position while a squadmate moves (his own fresher sight
   *  is today's suppress). */
  private suppressLkp(dt: number): void {
    if (!this.ctx.lkpValid() || this.lastSeenT < 2.5) return;
    const k = this.ctx.lkp;
    this.lastKnown.set(k.x, k.y + 1.1, k.z);
    this.tryFire(dt, 'suppress');
  }

  private decide(dt: number): { point: P2 | null; speed: number; face: number | null } {
    const def = this.def;
    const t = this.target;
    if (!this.alerted) return this.calmDecide(dt);
    if (!t) return { point: null, speed: 0, face: null };
    if (this.stagger > 0) return { point: null, speed: 0, face: this.faceTarget() };
    const toTarget = this.faceTarget();
    // raising the alarm: run to the panel and work it (unless it is disabled or already raised)
    const ap = this.alarm;
    if (ap) {
      if (ap.disabled || this.ctx.alarmRaised()) this.alarm = null;
      else {
        const d = hyp2(this.alarmPt[0] - this.pos.x, this.alarmPt[1] - this.pos.z);
        if (d < 0.8) {
          this.alarmT += dt;
          if (this.alarmT >= raiseTime(this.ctx.diff.reaction)) {
            this.alarm = null;
            this.ctx.raiseAlarm(this, ap);
          }
          return { point: null, speed: 0, face: ap.yaw + Math.PI };
        }
        this.alarmT = 0;
        return { point: this.goTo(this.alarmPt, dt, 0.5), speed: def.runSpeed, face: null };
      }
    }
    // (guard-ai S6, design 7) a reinforcement runs his entry route into the section first (until he sees the target)
    const eg = this.entryStep(dt);
    if (eg) return eg;
    // stealth: out of sight they go for where they last knew the target was, not where it is
    const known = this.los || this.smelled || !this.ctx.stealth() || !this.ctx.lkpValid() ? t.feet : this.ctx.lkp;
    const tp: P2 = [known.x, known.z];
    this.knownPt[0] = known.x;
    this.knownPt[1] = known.z;
    this.advanceCd -= dt;
    // holding a room against a target outside it
    // (guard-ai S5) a high-security post holds his leash the same way (radios, never chases out of it)
    const outside = (this.hold !== null && !inRoom(this.hold, t.feet.x, t.feet.z, 1.5, t.feet.y)) || !this.inLeash(known.x, known.z, 1.5);
    if (this.doorCheck > 0 && !this.los) return { point: null, speed: 0, face: null };

    // ---- melee (runner) ----
    if (def.melee) {
      if (this.dist <= def.melee.range && this.meleeCd === 0) {
        this.meleeCd = def.melee.cooldown;
        this.kick = 1;
        this.ctx.onMelee?.(this);
        t.target.applyDamage({
          amount: def.melee.damage * this.ctx.diff.damage,
          point: t.feet.clone(),
          dir: t.feet.subtract(this.pos).normalize(),
          part: 'body',
          kind: 'melee',
          attackerTeam: 'enemy',
          attackerId: this.id,
          sourcePos: this.pos.clone(),
          impulse: 2,
        });
      }
      if (this.dist < 6 && this.dist > 2.2 && this.los && this.lunge <= 0 && this.meleeCd < 0.2) this.lunge = 0.35;
      this.lunge -= dt;
      const speed = this.lunge > 0 ? def.melee.lunge : def.runSpeed;
      if (this.dist < 1.2) return { point: null, speed: 0, face: toTarget };
      return { point: this.chasePoint(tp, true, known.y), speed, face: null };
    }

    // ---- ranged ----
    // sniper: a few shots from a post, then move to another (the laser and glint gave it away)
    if (def.kind === 'sniper' && sniperRelocate(this.shotsHere, this.postT) && this.state !== 'seekCover') {
      this.shotsHere = 0;
      this.postT = 0;
      this.relocating = true;
      this.relocations++;
      this.ctx.releaseCover(this);
      this.coverIdx = -1;
      this.setState('seekCover');
    }
    // enforcer: shield up, walks into the fire
    if (def.kind === 'enforcer' && this.state === 'attack') {
      if (this.los) this.tryFire(dt);
      else if (this.lastSeenT < 2.5) this.tryFire(dt, 'suppress');
      if (!this.los && this.stateT > 3) this.setState('chase');
      const close = this.dist <= def.engageMin + 0.5;
      return { point: close ? null : this.chasePoint(tp, false), speed: ARCHETYPE.enforcer.pushSpeed, face: toTarget };
    }
    // (guard-ai S8) a role in the engaged group: bounds, holds and waits by role (else today's tactics below)
    // (S16 merge) before the armour check: a bound the group has started or allows is not cut short by it; in sight the
    // role step returns null and the armour check below runs for a role-holding guard too (his fire is gated in `tryFire`)
    if (this.role !== R_NONE && this.role !== R_SEARCH && def.usesCover) {
      const g = this.roleStep(dt, toTarget);
      if (g) return g;
    }
    // (guard-ai S16) armour on the fire line, the target in sight: he holds fire (the gate in `tryFire`) and after
    // `ARMOUR_FIRE.moveAfter` repositions: a cover spot with a clear fire line, else round by the nav (chase); held to a
    // room or a post leash he only holds, still tracking him (sight and the alert level are unchanged)
    if (this.los && this.fireGate.blocked && this.fireGate.plan(!outside) === 'move') {
      // (S16 merge) the cover he leaves is armoured to the target: the role picks skip it (`TACTICS.blockS`) and his
      // role cover is dropped until the next roles tick, so the group does not send him straight back to it
      if (this.coverIdx >= 0) this.ctx.blockCover?.(this.coverIdx);
      this.roleCover = -1;
      this.ctx.releaseCover(this);
      this.coverIdx = -1;
      this.advancing = false;
      this.peekCycles = 0;
      if (def.usesCover) {
        this.armourPick = true;
        this.relocating = true;
        this.setState('seekCover');
        this.coverPicked = false;
      } else this.setState('chase');
      return { point: null, speed: 0, face: toTarget };
    }
    switch (this.state) {
      case 'idle':
      case 'chase': {
        // (guard-ai S16) repositioning away from armour: no stop to engage while the line stays armoured
        const armourMove = this.los && this.fireGate.moveT > 0 && this.armourBlocks(t, 'aim', dt);
        if (armourMove) return { point: this.chasePoint(tp, false), speed: def.runSpeed * 0.75, face: null };
        if (this.los && this.dist <= def.engageMax) {
          // in a fight they get behind something first (guard-ai S8: the profile's weight against the seeded dice)
          this.advancing = false;
          // (guard-ai S6) the profile's cover-first weight (standard 0.85, as before; aggressive 0.3); (S8) seeded roll
          this.setState(def.usesCover && this.rng.next() < profileOf(this.tacticsProfile).coverFirst ? 'seekCover' : 'attack');
          return { point: null, speed: 0, face: toTarget };
        }
        if (outside) {
          // hold: back to the post, weapon on the last known position
          const face = Math.atan2(this.lastKnown.x - this.pos.x, this.lastKnown.z - this.pos.z);
          const atPost = hyp2(this.post[0] - this.pos.x, this.post[1] - this.pos.z) < 0.5;
          return { point: atPost ? null : this.post, speed: def.walkSpeed, face: this.lastSeenT < 30 ? face : null };
        }
        // out of sight (stealth): move up on the last known position from cover to cover, weapon on it, never a
        // run into the open; the last stretch is walked
        if (!this.los && this.ctx.stealth() && def.usesCover) {
          const dk = hyp2(tp[0] - this.pos.x, tp[1] - this.pos.z);
          if (dk > 7 && this.advanceCd <= 0) {
            if (this.pickAdvance(tp, known.y)) {
              this.setState('seekCover');
              this.coverPicked = true;
              this.advancing = true;
              return { point: null, speed: 0, face: toTarget };
            }
            this.advanceCd = 1.5;
          }
          // (guard-ai S8) an aggressive guard (reinforcements) closes at a jog
          return { point: this.chasePoint(tp, false), speed: this.tacticsProfile === P_AGGRESSIVE ? def.runSpeed * AGGRESSIVE_JOG : def.walkSpeed * ADVANCE_PACE, face: null };
        }
        return { point: this.chasePoint(tp, false), speed: this.los ? def.walkSpeed : def.runSpeed, face: null };
      }
      case 'attack': {
        // lost sight a moment ago: keep their head down with suppressive fire at the last position
        if (this.los) this.tryFire(dt);
        else if (this.lastSeenT < 2.5) this.tryFire(dt, 'suppress');
        if (this.tactics(t)) return { point: null, speed: 0, face: toTarget };
        if (!this.los && this.stateT > 2.6) {
          this.setState('chase');
        } else if (this.dist > def.engageMax + 3) {
          this.setState('chase');
        } else if (def.usesCover && this.stateT > this.rng.range(2.5, 4.5)) {
          this.setState('seekCover');
        }
        // strafe / keep range (guard-ai S8: an aggressive guard presses in to close range)
        if (this.strafeT <= 0) {
          this.strafeT = this.rng.range(2, 4);
          this.strafe = this.rng.next() < 0.5 ? 1 : -1;
        }
        const away = this.dist < def.engageMin ? -1 : this.tacticsProfile === P_AGGRESSIVE && this.dist > def.engageMin + 3 ? 1 : 0;
        const dx = t.feet.x - this.pos.x;
        const dz = t.feet.z - this.pos.z;
        const len = hyp2(dx, dz) || 1;
        const sx = (-dz / len) * this.strafe + (dx / len) * away;
        const sz = (dx / len) * this.strafe + (dz / len) * away;
        const sp: P2 = [this.pos.x + sx * 2, this.pos.z + sz * 2];
        if (this.hold) clampToRoom(this.hold, sp[0], sp[1], 0.6, sp);
        const spd = this.postDef;
        if (spd && spd.highSecurity) clampToLeash(sp[0], sp[1], this.post[0], this.post[1], spd.leash, sp);
        return { point: sp, speed: def.walkSpeed * (this.windup > 0 || this.burstLeft > 0 ? 0.3 : 0.55), face: toTarget };
      }
      case 'seekCover': {
        if (!this.coverPicked) {
          this.coverPicked = true;
          if (!this.pickCover()) {
            // (guard-ai S16) no spot with a clear line: round by the nav instead
            if (this.fireGate.moveT > 0) {
              this.relocating = false;
              this.setState('chase');
            } else this.setState('attack');
            return { point: null, speed: 0, face: toTarget };
          }
        }
        if (this.stateT > 6) this.setState(this.advancing && !this.los ? 'chase' : 'attack');
        // (guard-ai S8) the reporter holds his fire while he is on the radio
        if (this.los && this.stateT > 0.5 && def.kind !== 'sniper' && !this.onRadio) this.tryFire(dt);
        const wp = this.path[0];
        if (!wp) {
          this.setState('inCover');
          return { point: null, speed: 0, face: toTarget };
        }
        if (!wp.link && hyp2(wp[0] - this.pos.x, wp[1] - this.pos.z) < 0.35) this.path.shift();
        return { point: wp, speed: this.advancing ? def.runSpeed * 0.75 : def.runSpeed, face: null };
      }
      case 'inCover': {
        const cp = this.ctx.cover[this.coverIdx];
        if (!cp) {
          this.setState('attack');
          return { point: null, speed: 0, face: toTarget };
        }
        // a bound done: hold here a moment covering the way ahead, then the next
        // (guard-ai S8) a point holds `advanceHold` and bounds again when the manager gives it a cover (`roleStep`); with
        // none left to bound to it walks the last stretch (`closing`: out of the group)
        if (this.advancing && !this.los) {
          this.coverPose = cp.low ? 'low' : 'high';
          this.wantCrouch = cp.low;
          // (guard-ai S6) an aggressive guard (a lone or unroled reinforcement too) bounds after his profile's 0.8 s
          const roled = this.role === R_POINT;
          if (this.stateT > ((roled || this.tacticsProfile === P_AGGRESSIVE) ? profileOf(this.tacticsProfile).advanceHold : ADVANCE_HOLD)) {
            if (!roled) this.setState('chase');
            else if (this.roleCover < 0 || this.roleCover === this.coverIdx) {
              this.closing = true;
              this.setState('chase');
            }
          }
          return { point: [cp.pos.x, cp.pos.z], speed: def.walkSpeed, face: toTarget };
        }
        this.advancing = false;
        // flanked? leave (guard-ai S8: a guard with a role does not step out after 5 peeks: he holds and reports)
        const dirX = t.feet.x - cp.pos.x;
        const dirZ = t.feet.z - cp.pos.z;
        const l = hyp2(dirX, dirZ) || 1;
        const protects = (cp.normal.x * dirX + cp.normal.z * dirZ) / l;
        const holds = this.role !== R_NONE && this.role !== R_SEARCH;
        // (guard-ai S8) a point that has held its cover 5 peeks without a sight of him walks the last stretch (out of
        // the group: the next tick picks a new point), so a held group still closes in
        if (holds && this.role === R_POINT && this.peekCycles >= 5 && !this.los) {
          this.peekCycles = 0;
          this.closing = true;
          this.setState('chase');
          return { point: null, speed: 0, face: toTarget };
        }
        if (protects < 0.2 || (this.peekCycles >= 5 && !holds) || this.dist < def.engageMin * 0.7) {
          this.peekCycles = 0;
          this.setState('attack');
          return { point: null, speed: 0, face: toTarget };
        }
        if (this.tactics(t)) return { point: null, speed: 0, face: toTarget };
        // (guard-ai S8) the reporter stays down while he calls it in; the overwatch suppresses while a squadmate moves
        if (this.onRadio) {
          this.coverPose = cp.low ? 'low' : 'high';
          this.wantCrouch = true;
          this.coverPeek = 0;
          return { point: [cp.pos.x, cp.pos.z], speed: def.walkSpeed, face: toTarget };
        }
        if (this.role === R_OVERWATCH && this.mateMoving && !this.los && profileOf(this.tacticsProfile).suppress) this.suppressLkp(dt);
        // hide / peek cycle; some hide phases blind-fire over/around the cover at the last position
        const cycle = this.stateT % 4.2;
        const peeking = cycle > 2.4;
        this.wantCrouch = cp.low ? !peeking : false;
        if (cycle < dt * 1.5) this.blindPlan = this.rng.next() < 0.3;
        if (peeking) {
          this.tryFire(dt);
          if (cycle > 4.15) this.peekCycles++;
        } else if (this.blindPlan && cycle > 0.6 && cycle < 1.6 && this.lastSeenT < 6) this.tryFire(dt, 'blind');
        // high cover: step out past the nearest edge to peek (same faces the player uses)
        let pt: P2 = [cp.pos.x, cp.pos.z];
        this.coverPose = cp.low ? 'low' : 'high';
        this.coverPeek = 0;
        // (rendering) the wall sits on the side away from the open edge the guard leans past
        const wseg = cp.low ? undefined : this.ctx.coverSegments[cp.seg];
        this.coverWallSide = wseg ? (cp.s < wseg.len / 2 ? -1 : 1) : 0;
        if (!cp.low && peeking) {
          const seg = this.ctx.coverSegments[cp.seg];
          const edge = seg ? nearestEdge(seg, cp.s) : null;
          if (seg && edge && edge.dist < 3) {
            const p = coverPose(seg, edge.side < 0 ? -0.45 : seg.len + 0.45, COVER_STANDOFF + 0.2);
            pt = [p.x, p.z];
            // lean towards the open side, seen from the enemy (facing the cover)
            this.coverPeek = -edge.side;
          } else {
            const side = this.strafe;
            pt = [cp.pos.x - cp.normal.z * 0.9 * side, cp.pos.z + cp.normal.x * 0.9 * side];
          }
        }
        return { point: pt, speed: def.walkSpeed, face: toTarget };
      }
      default:
        return { point: null, speed: 0, face: null };
    }
  }

  /**
   * Squad tactics against a player holding cover: the assigned flanker moves to cover that sees past
   * it; anyone in range may lob a grenade to flush them out. Returns true if it acted this step.
   */
  private tactics(t: PlayerRef): boolean {
    const pc = t.cover;
    if (!pc || this.def.melee) {
      this.flanking = false;
      return false;
    }
    if (this.grenadeCd <= 0 && (t.coverT ?? 0) > 6 && this.dist > 7 && this.dist < 22 && this.lastSeenT < 8 && this.ctx.throwGrenade) {
      this.grenadeCd = this.rng.range(12, 18);
      const from = this.eye(new Vector3());
      if (this.ctx.throwGrenade(this, from, t.feet)) {
        this.kick = 1;
        return true;
      }
    }
    if (!this.flanking && this.def.usesCover && this.ctx.isFlanker?.(this) && !flanks(pc, this.pos.x, this.pos.z)) {
      this.flanking = true;
      this.setState('seekCover');
      return true;
    }
    return false;
  }

  private faceTarget(): number {
    const t = this.target;
    if (!t) return this.yaw;
    if (!this.los && this.ctx.stealth() && this.ctx.lkpValid()) return Math.atan2(this.ctx.lkp.x - this.pos.x, this.ctx.lkp.z - this.pos.z);
    return Math.atan2(t.feet.x - this.pos.x, t.feet.z - this.pos.z);
  }

  /** Direct line if clear, else follow the shared flow field. Runners zigzag. */
  private chasePoint(tp: P2, zig: boolean, ty = Number.NaN): Waypoint | null {
    const nav = this.ctx.nav;
    const me: P2 = [this.pos.x, this.pos.z];
    let p: Waypoint | null;
    if (this.dist < 18 && nav.lineClear(me, tp, this.pos.y, ty)) p = tp;
    else p = nav.flowNext(this.ctx.flow(), me[0], me[1], this.pos.y);
    if (p && !p.link && zig && this.dist > 5) {
      const dx = p[0] - me[0];
      const dz = p[1] - me[1];
      const l = hyp2(dx, dz) || 1;
      const s = Math.sin(this.stateT * 4 + this.pos.x) * 0.6;
      const cand: P2 = [p[0] + (-dz / l) * s, p[1] + (dx / l) * s];
      if (nav.lineClear(me, cand, this.pos.y)) p = cand;
    }
    return this.leashed(p);
  }

  /** Next bound towards the last known position: cover closer to it (by 3 m at least), facing it, within 12 m. */
  private pickAdvance(tp: P2, ty: number): boolean {
    const cover = this.ctx.cover;
    const myD = hyp2(tp[0] - this.pos.x, tp[1] - this.pos.z);
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < cover.length; i++) {
      const c = cover[i]!;
      const dMe = hyp2(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (dMe < 2.5 || dMe > 12) continue;
      if (Number.isFinite(ty) && Math.abs(c.pos.y - ty) > 2.5 && Math.abs(c.pos.y - this.pos.y) > 2.5) continue;
      if (this.hold && !inRoom(this.hold, c.pos.x, c.pos.z, -0.2, c.pos.y)) continue;
      if (!this.inLeash(c.pos.x, c.pos.z)) continue;
      const dx = tp[0] - c.pos.x;
      const dz = tp[1] - c.pos.z;
      const dT = hyp2(dx, dz);
      if (dT > myD - 3 || dT < 3) continue;
      if ((c.normal.x * dx + c.normal.z * dz) / dT < 0.3) continue;
      if (!this.ctx.nav.isWalkable(this.ctx.nav.cellOf(c.pos.x, c.pos.z, c.pos.y))) continue;
      const score = dT + dMe * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0 || !this.ctx.reserveCover(this, best)) return false;
    const c = cover[best]!;
    const path = this.ctx.nav.findPath([this.pos.x, this.pos.z], [c.pos.x, c.pos.z], 3000, this.pos.y, c.pos.y);
    if (!path) {
      this.ctx.releaseCover(this);
      return false;
    }
    this.coverIdx = best;
    this.path = path;
    return true;
  }

  private pickCover(): boolean {
    const t = this.target;
    if (!t) return false;
    const cover = this.ctx.cover;
    let best = -1;
    let bestScore = Infinity;
    const armourPick = this.armourPick;
    this.armourPick = false;
    let casts = 0;
    for (let i = 0; i < cover.length; i++) {
      const c = cover[i]!;
      const dMe = hyp2(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (dMe > (this.relocating ? 22 : 14)) continue;
      if (this.relocating && dMe < 5) continue;
      if (this.hold && !inRoom(this.hold, c.pos.x, c.pos.z, -0.2, c.pos.y)) continue;
      if (!this.inLeash(c.pos.x, c.pos.z)) continue;
      // (from where they believe the target is: never the real position out of sight)
      const dx = this.knownPt[0] - c.pos.x;
      const dz = this.knownPt[1] - c.pos.z;
      const dT = hyp2(dx, dz);
      const flank = this.flanking && t.cover;
      if (dT < (flank ? 4 : this.def.engageMin) || dT > this.def.engageMax) continue;
      if ((c.normal.x * dx + c.normal.z * dz) / dT < (flank ? 0.3 : 0.55)) continue;
      // flanker: only spots that see past the player's cover
      if (flank && t.cover && !flanks(t.cover, c.pos.x, c.pos.z)) continue;
      if (!this.ctx.nav.isWalkable(this.ctx.nav.cellOf(c.pos.x, c.pos.z, c.pos.y))) continue;
      const q = coverQuality({ nx: c.normal.x, nz: c.normal.z, low: c.low, x: c.pos.x, z: c.pos.z }, [{ x: this.knownPt[0], z: this.knownPt[1] }]);
      const score = dMe + Math.abs(dT - 14) * 0.5 - q * 6;
      if (score < bestScore) {
        // (guard-ai S16) away from armour: only a spot whose fire line (standing muzzle -> the target) is clear of it,
        // cast only for a spot that would be the new best, at most `ARMOUR_FIRE.coverCasts` per pick
        if (armourPick) {
          if (casts >= ARMOUR_FIRE.coverCasts) continue;
          casts++;
          this.fireFrom.set(c.pos.x, c.pos.y + (EYE_STAND - 0.2) * this.def.scale, c.pos.z);
          if (this.ctx.ballistics.armouredFirst(this.fireFrom, t.target.aimPoint(this.fireTo), MASK.ENEMY_SHOT)) continue;
        }
        bestScore = score;
        best = i;
      }
    }
    if (best < 0 || !this.ctx.reserveCover(this, best)) return false;
    const c = cover[best]!;
    const path = this.ctx.nav.findPath([this.pos.x, this.pos.z], [c.pos.x, c.pos.z], 3000, this.pos.y, c.pos.y);
    if (!path) {
      this.ctx.releaseCover(this);
      return false;
    }
    this.coverIdx = best;
    this.path = path;
    if (this.relocating) {
      this.shotsHere = 0;
      this.postT = 0;
    }
    this.relocating = false;
    return true;
  }

  private tryFire(dt: number, mode: 'aim' | 'suppress' | 'blind' = 'aim'): void {
    const w = this.def.weapon;
    const t = this.target;
    // (guard-ai S21) the draw first: no shot until the gun is in his hands
    if (!w || !t || (mode === 'aim' && !this.los) || this.dist > w.range || (this.carry && !this.carry.drawn)) {
      this.windup = 0;
      return;
    }
    // (3.2.0) a human shield in sight: hold fire a moment, then only aimed shots (at the exposed head)
    if (t.shield) {
      this.shieldT += dt;
      if (this.shieldT < GRAB.hesitate || mode !== 'aim') return;
    } else this.shieldT = 0;
    // (guard-ai S16) armour first on the fire line: no wind-up, no burst, no round (the cached verdict, before every round)
    if (this.armourBlocks(t, mode, dt)) {
      this.windup = 0;
      this.burstLeft = 0;
      return;
    }
    if (this.burstLeft <= 0) {
      this.pauseT -= dt;
      if (this.pauseT > 0) return;
      if (w.windup > 0 && this.windup < w.windup) {
        if (this.windup === 0) this.ctx.onWindup?.(this);
        this.windup += dt;
        return;
      }
      this.burstLeft = Math.round(this.rng.range(w.burstMin, w.burstMax));
    }
    if (this.fireT > 0) return;
    this.fireT = 60 / w.rpm;
    this.burstLeft--;
    if (this.burstLeft <= 0) {
      this.pauseT = this.rng.range(w.pauseMin, w.pauseMax);
      this.windup = 0;
    }
    this.shoot(t, w, mode);
  }

  /** The muzzle (eye height less 0.2, forward and to the right); blind fire comes over / around the cover. */
  private muzzle(out: Vector3, mode: 'aim' | 'suppress' | 'blind'): Vector3 {
    this.eye(out);
    out.y -= 0.2 * this.def.scale;
    out.x += Math.sin(this.yaw) * 0.45 + Math.cos(this.yaw) * 0.18;
    out.z += Math.cos(this.yaw) * 0.45 - Math.sin(this.yaw) * 0.18;
    if (mode === 'blind') out.y = Math.max(out.y, this.pos.y + 1.25);
    return out;
  }

  /** The aim point before spread: the head or the body; suppressive and blind fire go at the last known spot. */
  private aimAt(t: PlayerRef, mode: 'aim' | 'suppress' | 'blind', out: Vector3): Vector3 {
    if (mode !== 'aim') return out.copyFrom(this.lastKnown);
    return (this.losHead || t.shield) && t.target.headPoint ? t.target.headPoint(out) : t.target.aimPoint(out);
  }

  /** (guard-ai S16) The fire line's first hit is armoured (the gate, cached per guard; no allocation). */
  private armourBlocks(t: PlayerRef, mode: 'aim' | 'suppress' | 'blind', dt: number): boolean {
    const from = this.muzzle(this.fireFrom, mode);
    const to = this.aimAt(t, mode, this.fireTo);
    const nav = this.ctx.nav;
    const mask = t.shield ? MASK.ENEMY_SHOT | G.ENEMY_HITBOX : MASK.ENEMY_SHOT;
    return this.fireGate.gate(this.ctx.ballistics, from, to, mask, nav.cellOf(from.x, from.z, from.y), nav.cellOf(to.x, to.z, to.y), dt);
  }

  private shoot(t: PlayerRef, w: NonNullable<EnemyDef['weapon']>, mode: 'aim' | 'suppress' | 'blind' = 'aim'): void {
    const d = this.ctx.diff;
    const origin = this.muzzle(new Vector3(), mode);
    const aim = this.aimAt(t, mode, new Vector3());
    this.roundsFired++;
    const dir = aim.subtract(origin).normalize();
    // accuracy: settles in over the first second of sight, worse against moving/rolling targets
    const settle = Math.min(1, 0.45 + (this.losT * 0.55) / d.reaction);
    if (this.def.kind === 'sniper') this.shotsHere++;
    const moving = Math.min(1, t.speed / 5);
    const modeMul = mode === 'blind' ? 3 : mode === 'suppress' ? 1.6 : 1;
    const spread = (w.spreadDeg * (1 + moving * 0.8) * (t.crouched ? 0.9 : 1) * modeMul) / (d.accuracy * settle * (this.buff ? ARCHETYPE.officer.accuracy : 1));
    const off = sampleSpread(spread, this.rng.next(), this.rng.next());
    spreadDir(dir, off.x, off.y, dir);
    const end = origin.add(dir.scale(w.range));
    // (3.2.0) shooting at a player holding a hostage: the hostage's hit volumes are in the way
    const h = this.ctx.ballistics.ray(origin, end, t.shield ? MASK.ENEMY_SHOT | G.ENEMY_HITBOX : MASK.ENEMY_SHOT);
    this.ctx.vfx.tracer(origin, h.point, w.tracer, 0.02);
    this.ctx.vfx.muzzleFlash(origin, this.def.kind === 'heavy' ? 0.3 : 0.2);
    this.kick = 1;
    this.ctx.onShot?.(this, origin, h.point);
    for (const p of this.ctx.players()) p.suppress?.(origin, h.point, h.target === p.target);
    if (!h.hit) return;
    this.ctx.ballistics.impactFx(h, dir);
    if (h.target && h.target === t.shield) {
      h.target.applyDamage({ amount: w.damage * d.damage, point: h.point, dir, part: h.part ?? 'body', kind: 'bullet', attackerTeam: 'enemy', attackerId: this.id, sourcePos: origin, impulse: 1, shieldHit: true });
    } else if (h.target && h.target.team === 'player') {
      h.target.applyDamage({
        amount: w.damage * d.damage,
        point: h.point,
        dir,
        part: h.part ?? 'body',
        kind: 'bullet',
        attackerTeam: 'enemy',
        attackerId: this.id,
        sourcePos: origin,
        impulse: 1,
      });
    } else if (h.prop) {
      this.ctx.world.props.impulse(h.prop, dir.scale(3), h.point);
    }
  }

  private move(dt: number, goal: Waypoint | null, speed: number, face: number | null): void {
    const nav = this.ctx.nav;
    if (goal?.link) {
      // dogs never climb: they wait at the foot
      if (this.def.quadruped) goal = null;
      else if (hyp2(goal[0] - this.pos.x, goal[1] - this.pos.z) < 0.5) {
        this.beginLink(goal.link);
        return;
      }
    }
    const desired = this.desired.setAll(0);
    if (goal) {
      desired.set(goal[0] - this.pos.x, 0, goal[1] - this.pos.z);
      const l = desired.length();
      if (l > 0.05) desired.scaleInPlace(Math.min(speed, l / dt) / l);
      else desired.setAll(0);
    }
    // separation from other enemies and players: (guard-ai S20) the soft push as before plus a sidestep round a guard
    // ahead on his line (`separation.ts`); held and downed guards push nobody
    const others = this.ctx.enemies();
    const gl = hyp2(desired.x, desired.z);
    const sep = this.sepOut;
    sep.x = 0;
    sep.z = 0;
    // (guard-ai S20 check) the hard spacing and the sidestep hold unless he is squeezing past (a stall, below): then
    // the soft push only, as before S20
    const hard = !(this.sepFree > 0);
    if (!hard) this.sepFree -= dt;
    steerFrom(this, gl > 1e-4 ? desired.x / gl : 0, gl > 1e-4 ? desired.z / gl : 0, hard ? gl : 0, others, sep);
    desired.x += sep.x;
    desired.z += sep.z;
    this.sepHit = hard && hyp2(sep.x, sep.z) > 0.05;
    const pls = this.ctx.players();
    for (let k = 0; k < pls.length; k++) {
      const p = pls[k]!;
      const dx = this.pos.x - p.feet.x;
      const dz = this.pos.z - p.feet.z;
      const d = hyp2(dx, dz);
      if (d < 0.9 && d > 1e-3) {
        desired.x += (dx / d) * (0.9 - d) * 4;
        desired.z += (dz / d) * (0.9 - d) * 4;
      }
    }
    // root motion through the driver: weighted starts and stops, turns at the aim rate
    const running = speed > this.def.walkSpeed * 1.2;
    const mi = this.motionIn;
    mi.vx = desired.x;
    mi.vz = desired.z;
    const dl = hyp2(desired.x, desired.z);
    mi.yaw = face ?? (dl > 0.3 ? Math.atan2(desired.x, desired.z) : this.motion.yaw);
    mi.aiming = face !== null && !this.def.melee;
    mi.sprinting = running;
    // (guard-ai S2) coordinated guards on a calm search turn at the calm rate (the old rules, or after combat: aimed)
    this.motion.step(dt, mi, this.aimedMotion ? ENEMY_MOTION : ENEMY_CALM_MOTION);
    this.vel.x = this.motion.outX;
    this.vel.z = this.motion.outZ;
    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    const x0 = this.pos.x;
    const z0 = this.pos.z;
    // (guard-ai S20) never nearer than SEPARATION.min to another guard: the step is cut at that circle (he slides round)
    if (hard && stepApart(this, nx, nz, others, sep)) {
      this.sepHit = true;
      nx = sep.x;
      nz = sep.z;
      this.vel.x = (nx - this.pos.x) / dt;
      this.vel.z = (nz - this.pos.z) / dt;
    }
    this.navCell = nav.cellOf(this.pos.x, this.pos.z, this.pos.y);
    if (!this.tryMove(nx, nz)) {
      // slide along an axis
      if (!this.tryMove(nx, this.pos.z)) {
        this.vel.x = 0;
        if (!this.tryMove(this.pos.x, nz)) this.vel.z = 0;
      } else {
        this.vel.z = 0;
      }
      if (this.vel.x === 0 && this.vel.z === 0) this.motion.reset(this.motion.yaw);
    }
    // (guard-ai S20 check) two guards face to face in a doorway or a narrow corridor cannot step round each other, and
    // the spacing held both there forever: held by it (pushed off, cut or refused) with somewhere to go, at under a
    // quarter of his pace, for SEPARATION.stall s, he squeezes past for SEPARATION.squeeze s (the soft push only)
    if (hard && this.sepHit && gl > 0.05 && hyp2(this.pos.x - x0, this.pos.z - z0) < gl * dt * 0.25) {
      this.sepStall = (this.sepStall > 0 ? this.sepStall : 0) + dt;
      if (this.sepStall >= SEPARATION.stall) {
        this.sepStall = 0;
        this.sepFree = SEPARATION.squeeze;
      }
    } else this.sepStall = 0;
    const gh = nav.heightAt(this.pos.x, this.pos.z, this.pos.y);
    this.pos.y += (gh - this.pos.y) * Math.min(1, dt * 12);
    this.yaw = this.motion.yaw;
    if (this.target) {
      this.target.target.aimPoint(this.tmp);
      const dy = this.tmp.y - (this.pos.y + 1.4 * this.def.scale);
      this.aimPitch = Math.atan2(dy, Math.max(0.5, this.dist));
    }
  }

  // --- ladders and drops (nav links) ---

  /** The link being taken (route points flat x, y, z) and the distance along it. */
  private link: NavLink | null = null;
  private linkS = 0;
  /** On a ladder's climb (pose) and the climb phase. */
  private climbing = false;
  private climbT = 0;
  /** Links taken (tests). */
  linksTaken = 0;

  private beginLink(l: NavLink): void {
    this.link = l;
    this.linkS = 0;
    this.climbT = 0;
    this.linksTaken++;
    if (this.routePath[0]?.link === l) this.routePath.shift();
    if (this.path[0]?.link === l) this.path.shift();
    this.vel.setAll(0);
    this.motion.reset(this.motion.yaw);
  }

  private endLink(): void {
    if (!this.link) return;
    this.link = null;
    this.climbing = false;
    this.navCell = -1;
  }

  /** Move along the link's route: walking legs at a walk, a ladder's rise at climbing speed, a drop falls. */
  private runLink(dt: number): void {
    const l = this.link!;
    const p = l.pts;
    // the leg the distance is on
    let s = this.linkS;
    for (let k = 0; k + 3 < p.length; k += 3) {
      const len = Math.sqrt((p[k + 3]! - p[k]!) ** 2 + (p[k + 4]! - p[k + 1]!) ** 2 + (p[k + 5]! - p[k + 2]!) ** 2);
      if (s <= len || k + 6 >= p.length) {
        const dy = p[k + 4]! - p[k + 1]!;
        const flat = hyp2(p[k + 3]! - p[k]!, p[k + 5]! - p[k + 2]!);
        const vertical = Math.abs(dy) > flat;
        const speed = !vertical ? 1.5 : l.kind === 'drop' ? 6 : dy > 0 ? 1.1 : 1.4;
        s += speed * dt;
        this.linkS += speed * dt;
        const t = len > 1e-4 ? Math.min(1, s / len) : 1;
        this.pos.set(p[k]! + (p[k + 3]! - p[k]!) * t, p[k + 1]! + dy * t, p[k + 2]! + (p[k + 5]! - p[k + 2]!) * t);
        if (!vertical && flat > 0.05) this.yaw = this.motion.yaw = Math.atan2(p[k + 3]! - p[k]!, p[k + 5]! - p[k + 2]!);
        this.climbing = vertical && l.kind === 'ladder';
        if (this.climbing) this.climbT += dt * speed * 1.6;
        if (t >= 1 && k + 6 >= p.length) {
          this.endLink();
          this.navCell = l.b;
          this.motion.reset(this.yaw);
          return;
        }
        return;
      }
      s -= len;
    }
    this.endLink();
  }

  /** Only the target's head is in sight (the rest is behind cover). */
  private losHead = false;

  private navCell = -1;

  /** Move to (x, z) if the nav grid allows the step (no closure: called every step for every enemy). */
  private tryMove(x: number, z: number): boolean {
    // (guard-ai S20) a shut door's leaf, or a step into another guard (the slides too), is not taken
    if (this.ctx.doorStep && !this.ctx.doorStep(this, this.pos.x, this.pos.z, x, z, this.pos.y)) return false;
    // (guard-ai S20 check) not while he squeezes past (`sepFree`)
    if (!(this.sepFree > 0) && tooClose(this, x, z, this.ctx.enemies())) {
      this.sepHit = true;
      return false;
    }
    const nav = this.ctx.nav;
    const cur = this.navCell;
    const c = nav.cellNear(cur, x, z);
    if (c === cur || (c >= 0 && nav.canStep(cur < 0 ? c : cur, c)) || !nav.isWalkable(cur)) {
      if (c >= 0 && nav.isWalkable(c)) {
        this.pos.x = x;
        this.pos.z = z;
        return true;
      }
    }
    return false;
  }

  /** Hit volumes follow the body (fixed step). A human guard's head comes from the sim state (`guardHead`: the pose
   *  fit tested against the rig in `tests/guardHeadParity.test.ts`), the dog's from its model. */
  private syncHitboxes(dt: number): void {
    if (!this.dog) {
      const h = this.headIn;
      leanStep(this.headLean, this.coverPeek, dt);
      const sp = hyp2(this.vel.x, this.vel.z);
      const sn = Math.sin(this.yaw);
      const cs = Math.cos(this.yaw);
      h.x = this.pos.x;
      h.y = this.pos.y;
      h.z = this.pos.z;
      h.yaw = this.yaw;
      h.crouch = this.crouch;
      h.speed = sp;
      // (S3a fix round) the velocity in his frame (strafe, backpedal) and the gait clock, as `frame` gives the rig
      h.moveX = this.vel.x * cs - this.vel.z * sn;
      h.moveZ = this.vel.x * sn + this.vel.z * cs;
      h.phase = this.motion.phase;
      h.climb = this.climbing;
      h.aim = this.taken || this.climbing ? 0 : this.aimWeight();
      h.aimPitch = this.aimPitch;
      h.wall = this.coverPose === 'high';
      h.wallSide = h.wall ? this.coverWallSide : 0;
      h.lean = this.headLean.bd;
      h.leanDrop = this.headLean.dr;
      // (S3a fix round, finding 3) the rig shows one emote: the held pose from contact, else the flashbang's while it
      // is his; with none, the last one fades out (`emoteStep`)
      const cq = this.cq;
      emoteStep(this.emoteSt, h, this.taken, this.blindT > 0, cq.mode, cq.delay, cq.k, dt);
      guardHead(h, this.headRest, this.head);
    }
    this.hitboxes.sync(this.pos, this.head);
  }

  /** The weapon-raise weight the rig gets (`frame`) and the head fit reads: 1 firing, down to 0.2 unaware. (guard-ai S9)
   *  `guardStance.ts` (shared with the co-op puppet): cautious and calm, low ready. */
  private aimWeight(): number {
    return this.def.melee ? 0 : guardAim(this.state === 'attack' || this.state === 'inCover' || this.burstLeft > 0 || this.windup > 0, this.aware.level, this.caution > 0);
  }

  /** Render-rate animation with interpolation between fixed steps. */
  frame(dt: number, alpha: number): void {
    if (!this.alive) {
      if (this.dog) this.dog.update(dt, this.pos.x, this.pos.y, this.pos.z, this.yaw, 0, 0, 0);
      return;
    }
    const r = this.rig.root;
    Vector3.LerpToRef(this.prevPos, this.pos, alpha, r.position);
    r.rotation.y = this.prevYaw + wrapAngle(this.yaw - this.prevYaw) * alpha;
    const sp = hyp2(this.vel.x, this.vel.z);
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const inv = sp > 0.01 ? 1 / sp : 0;
    this.kick = Math.max(0, this.kick - dt * 8);
    this.flash = Math.max(0, this.flash - dt * 9);
    this.rig.setFlash(this.flash * 0.75);
    const lvl = this.aware.level;
    const aiming = this.aimWeight();
    const m = this.motion;
    const rp = this.rp;
    rp.speed = sp;
    rp.localX = (this.vel.x * c - this.vel.z * s) * inv;
    rp.localZ = (this.vel.x * s + this.vel.z * c) * inv;
    rp.crouch = this.crouch;
    rp.aimPitch = this.aimPitch;
    rp.aim = this.taken ? 0 : aiming;
    rp.kick = this.def.melee ? 0 : this.kick;
    rp.melee = this.def.melee && this.kick > 0 ? 1 - this.kick : -1;
    rp.wall = this.coverPose === 'high';
    rp.wallSide = rp.wall ? this.coverWallSide : 0;
    rp.lean = this.coverPeek;
    rp.dash = !this.def.melee && sp > this.def.runSpeed * 0.8 && aiming < 0.5 ? 1 : 0;
    // (G7) held (a hostage walked by the operator): no brain drives the motion driver, so the gait runs from his
    // measured speed (`holdAt`), not a frozen clock
    rp.phase = this.taken ? -1 : m.phase;
    rp.motion = this.taken ? undefined : m.state;
    rp.motionT = this.taken ? 0 : m.stateT;
    rp.accelFwd = this.taken ? 0 : m.ax * s + m.az * c;
    rp.accelSide = this.taken ? 0 : m.ax * c - m.az * s;
    rp.velX = this.vel.x;
    rp.velZ = this.vel.z;
    rp.goalYaw = this.taken ? this.yaw : m.goalYaw;
    // (A1.2) not aiming and walking forward: the stride runs along the facing (no strafe / back clip on a patrol turn)
    rp.stride = !rp.wall && aiming < 0.5 && rp.localZ > 0.5 ? 'facing' : 'velocity';
    rp.traverse = this.climbing ? 'climb' : 'none';
    rp.traverseT = this.climbT;
    if (this.climbing) rp.aim = 0;
    // (guard-ai S21, walk 4.72 G5) holstered in a calm area: hands empty with the armed carriage (`ready`; `armed` follows
    // the gun in hand), the draw / holster clip (`swap`, one slot) while the gun travels (`GuardGunCarry`); no raise
    // until it is drawn. A pistol on the thigh sets the rig's `thighGear` itself (WeaponModel).
    const gc = this.gunCarry;
    if (gc) {
      const cs = this.carry;
      if (!this.taken) gc.apply(cs);
      rp.aim = carryRaise(rp.aim, cs);
      rp.ready = cs.holstered;
      rp.swap = cs.swapClip();
      rp.swapFrom = gc.slot;
      rp.swapTo = gc.slot;
    }
    if (this.dog) {
      const alertK = lvl === 'unaware' ? 0 : 1;
      this.dog.update(dt, r.position.x, r.position.y, r.position.z, r.rotation.y, sp, alertK, this.kick);
      this.head.copyFrom(this.dog.head);
    } else {
      // (guard-render S4) full rate in a takedown / held, a scripted emote or a climb (and near any player: the tier);
      // (perfg, folded into `animTier.ts`) the FROZEN tier: a rig the render freeze disabled is not animated (C8 at its thaw)
      this.animTier.animate(this.rig, dt, rp, this.ctx.players(), this.taken || this.climbing || this.rig.emote !== null);
    }
    if (this.laser) this.sniperFx();
  }

  /**
   * (artnext C7) The render freeze re-enabled his rig root (`SectorGuardFreeze.thaw`, in the camera evaluation after this
   * frame's `frame`, which skipped the solve): solve the pose now with the carried time, so the first frame drawn is
   * current, not the pose at the freeze. Render only (gameplay reads none of the pose). No allocation.
   */
  thawPose(): void {
    if (!this.alive || this.dog || this.rig.root.isDisposed()) return;
    this.animTier.solveNow(this.rig, 0, this.rp);
  }

  /** Sniper: the laser from the scope along the aim while it aims, and the glint (sized for the local view). */
  private sniperFx(): void {
    const laser = this.laser!;
    const t = this.target;
    const on = !!t && !this.taken && this.blindT <= 0 && (this.windup > 0 || ((this.state === 'attack' || this.state === 'inCover') && this.los));
    laser.isVisible = on;
    if (!on || !t) return;
    const eye = this.eye(this.tmpEye);
    t.target.aimPoint(this.tmp);
    const dx = this.tmp.x - eye.x;
    const dy = this.tmp.y - eye.y;
    const dz = this.tmp.z - eye.z;
    const len = Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));
    laser.position.set(eye.x + dx * 0.5, eye.y + dy * 0.5, eye.z + dz * 0.5);
    laser.scaling.set(0.012, len, 0.012);
    laser.rotation.set(Math.acos(Math.max(-1, Math.min(1, dy / len))), Math.atan2(dx, dz), 0);
    const g = this.glintMesh!;
    const k = glint(this.yaw, this.aimPitch, eye.x, eye.y, eye.z, this.tmp.x, this.tmp.y, this.tmp.z);
    g.isVisible = k > 0.05;
    if (g.isVisible) {
      g.position.set(eye.x + Math.sin(this.yaw) * 0.25, eye.y - 0.02, eye.z + Math.cos(this.yaw) * 0.25);
      g.scaling.setAll(0.08 + 0.12 * k);
    }
  }

  dispose(): void {
    if (this.alive) {
      this.hitboxes.dispose();
      this.ctx.registry.removeTarget(this);
      this.gun?.dispose();
      this.rig.dispose();
    }
    this.dog?.dispose();
    this.shield?.dispose();
    this.laser?.dispose();
    this.glintMesh?.dispose();
    this.ctx.releaseCover(this);
    // gone from the world: never counts as alive again (stale references see it)
    this.health.hp = 0;
  }
}
