import { Vector3, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import type { WeaponModel } from '../weapons/weaponModel';
import { buildEnemyRig } from './enemyRig';
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
import { DIFFICULTY, type Difficulty, type EnemyDef } from './enemyDefs';
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
import { instantDetect, noiseSuspicion, seenAt, sightRate, stepMeter, type SightInput } from './perception';
import { ALERT, AlertMachine, emptyAlertInput, type AlertLevel } from './alertState';
import { PatrolWalker, searchPoint, PATROL, type PatrolRoute } from './patrol';
import { BODY, bodyNoticed } from './bodies';
import type { Body } from './body';
import { ALARM, alarmStandPoint, type AlarmPanel } from './alarm';
import type { LightDef } from '../world/lights';
import type { LightField } from '../world/lightField';
import { ARCHETYPE, glint, heavyMult, shieldBlocks, smellRate, sniperRelocate } from './archetypes';
import { BarkVoice, RADIO_BARKS, type BarkEvent } from './barks';
import { DogModel } from './dogModel';
import type { InstancedMesh } from '../core/babylon';

export type EnemyState = 'idle' | 'chase' | 'attack' | 'seekCover' | 'inCover' | 'melee' | 'dead';

/** A guard looking for something switches his torch on below this static light level; keeps it on below `TORCH_KEEP`. */
export const TORCH_DARK = 0.35;
export const TORCH_KEEP = 0.45;

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
  difficulty: Difficulty;
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
  /** Down (killed or knocked out): the rig becomes a body in the world. */
  addBody(e: Enemy, rig: CharacterRig, impulse: Vector3, lethal: boolean): void;
  bodies(): readonly Body[];
  bodyFound(e: Enemy, b: Body): void;
  revive(b: Body): void;
  alarmRaised(): boolean;
  raiseAlarm(e: Enemy, p: AlarmPanel): void;
  /** Stealth rules: enemies only know where the target is from what they see and hear (else they are
   *  sent at it, as in Wave). */
  stealth(): boolean;
  /** Shared last known position of the target (valid once anyone has seen / located it). */
  lkp: Vector3;
  lkpValid(): boolean;
  /** An alerted enemy sees the target: the shared last known position follows it. */
  reportSighting(p: PlayerRef): void;
  /** Detected: radio the squad. */
  callAlert(e: Enemy): void;
  /** The spotter's shout: squadmates close by join at once (no radio needed). */
  shout?(e: Enemy): void;
  /** This enemy's slot among the searchers (fans the sweep out). */
  searchSlot(e: Enemy): number;
  /** A callout (shown near the speaker; radio lines chirp). */
  onBark?(e: Enemy, line: string, radio: boolean): void;
}

let nextId = 1;
const rand = (a: number, b: number): number => a + Math.random() * (b - a);
/** Calm paces (x the combat walk, which is a slow aimed walk): patrol, investigating, searching. */
const PATROL_PACE = 1.1;
const INVESTIGATE_PACE = 1.2;
const SEARCH_PACE = 1.3;
/** Out of sight in combat: walking up on the last known position (x walk speed); a hold between bounds (s). */
const ADVANCE_PACE = 1.15;
const ADVANCE_HOLD = 2.5;
/** Body sample heights for exposure (fractions of the target's height above the feet, then the head). */
const EXPOSE_HIPS = 0.52;

export class Enemy implements Damageable {
  readonly num = nextId++;
  readonly id = `e${this.num}`;
  readonly team = 'enemy' as const;
  readonly health: Health;
  readonly pos: Vector3;
  yaw = 0;
  state: EnemyState = 'idle';
  private stateT = 0;
  private rig: CharacterRig;
  private gun: WeaponModel | null;
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
  private pauseT = rand(0.6, 1.4);
  private windup = 0;
  private meleeCd = 0;
  private crouch = 0;
  private wantCrouch = false;
  private peekCycles = 0;
  private strafe = Math.random() < 0.5 ? 1 : -1;
  private strafeT = 0;
  private stagger = 0;
  private aimPitch = 0;
  private kick = 0;
  private head = new Vector3();
  private tmp = new Vector3();
  private tmpEye = new Vector3();
  private tmpHead = new Vector3();
  private tmpHips = new Vector3();
  private desired = new Vector3();
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
  private sight: SightInput = { dist: 0, angle: 0, light: 1, crouched: false, speed: 0, exposure: 0, sensitivity: 1 };
  private alertIn = emptyAlertInput();
  private walker: PatrolWalker;
  /** Where the last stimulus (glimpse, noise) came from, and whether there is one. */
  private stimulus: P2 = [0, 0];
  private hasStimulus = false;
  private heard = false;
  private gunfire = false;
  private called = 0;
  /** Seconds until a spotter's radio call goes out (0 = none pending); taking them out first stops it. */
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
  /** Searching round its own stimulus (a body, a light) rather than the shared last known position. */
  private searchOwn = false;
  /** A knocked-out squadmate to wake (found body). */
  private reviving: Body | null = null;
  /** Running to an alarm panel (combat), and time spent working it. */
  private alarm: AlarmPanel | null = null;
  private alarmT = 0;
  private alarmPt: P2 = [0, 0];
  private meP: P2 = [0, 0];
  private coverPose: 'none' | 'low' | 'high' = 'none';
  private coverPeek = 0;
  /** Last place the target was seen (aim point) and seconds since. */
  private lastKnown = new Vector3();
  private lastSeenT = 99;
  private blindPlan = false;
  private grenadeCd = rand(5, 10);
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
    const d = DIFFICULTY[ctx.difficulty];
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
    this.hitboxes = new Hitboxes(ctx.scene, ctx.registry, this, def.scale, def.build);
    this.voice = new BarkVoice(this.num);
    const parts = ctx.world.parts;
    if (def.quadruped) {
      // the dog: its own body on the shared brain; the humanoid rig stays hidden
      this.rig.root.setEnabled(false);
      this.gun?.dispose();
      this.gun = null;
      this.dog = new DogModel(ctx.scene, parts, def.look.colors.torso, def.look.colors.accent);
    }
    if (def.kind === 'enforcer') {
      const sh = parts.instance('rbox', '#20242b', 'shield');
      sh.parent = this.rig.root;
      sh.scaling.set(0.58, 0.95 * def.scale, 0.07);
      sh.position.set(-0.08, 1.05 * def.scale, 0.45);
      const visor = parts.instance('rbox', '#7fb6d9', 'shield-visor');
      visor.parent = sh;
      visor.scaling.set(0.6, 0.12, 0.5);
      visor.position.set(0, 0.32, 0.4);
      this.shield = sh;
    }
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
  /** Flashbanged: blind and staggering for this long (no perception, no fire), then alert. */
  blindT = 0;
  /** Seconds breathing sleeping gas (the gadget system knocks out at its threshold; decays outside). */
  gas = 0;

  /** Blinded by a flashbang: hands to the face, staggering on the spot, then straight to combat. */
  blind(seconds: number): void {
    if (!this.alive || this.taken) return;
    this.blindT = Math.max(this.blindT, seconds);
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

  /** Grabbed: the brain stops, the body struggles (arms up to the attacker's hold, head back). */
  beginTakedown(choke: boolean): void {
    this.taken = true;
    this.endLink();
    this.burstLeft = 0;
    this.windup = 0;
    this.vel.setAll(0);
    this.rig.emote = (_r, t) => {
      const k = Math.min(1, t * 5);
      const w = Math.sin(t * 17) * 0.12 * k;
      return choke
        ? { neck: [-0.55 * k, 0, 0], shoulderL: [-1.9 * k, 0, -0.4 * k + w], shoulderR: [-1.9 * k, 0, 0.4 * k - w], elbowL: [0, 0, -1.7 * k], elbowR: [0, 0, 1.7 * k], pelvisLift: -0.08 * k }
        : { neck: [0.35 * k, 0, 0], chest: [0.25 * k, 0, 0], shoulderL: [-0.8 * k, 0, -0.6 * k + w], shoulderR: [-0.8 * k, 0, 0.6 * k - w] };
    };
    this.rig.emoteTime = 0;
  }

  /** (3.2.0) Held as a hostage: upright against the operator's chest, head back, hands up at the arm round the neck. */
  holdAsHostage(): void {
    this.rig.emote = (_r, t) => {
      const k = Math.min(1, t * 5);
      const w = Math.sin(t * 11) * 0.06 * k;
      return { neck: [-0.3 * k, w, 0], chest: [-0.08 * k, 0, 0], shoulderL: [-1.5 * k, 0, -0.35 * k + w], shoulderR: [-1.5 * k, 0, 0.35 * k - w], elbowL: [0, 0, -1.9 * k], elbowR: [0, 0, 1.9 * k] };
    };
    this.rig.emoteTime = 0;
  }

  /** (3.2.0) Held as a hostage: not solid to the operator's body (bullets still hit). */
  setSolid(on: boolean): void {
    this.hitboxes.setSolid(on);
  }

  /** Place the seized body (fixed step). */
  holdAt(x: number, y: number, z: number, yaw: number): void {
    this.pos.set(x, y, z);
    this.yaw = yaw;
  }

  /** Let go (an interrupted takedown): staggered (`stagger` s; a shove: longer), and very much aware now. */
  releaseTakedown(stagger = 0.6): void {
    if (!this.taken) return;
    this.taken = false;
    this.hitboxes.setSolid(true);
    this.rig.emote = null;
    this.stagger = stagger;
    this.alert();
  }

  /** (3.2.0) Seconds this guard has seen its target holding a hostage (the hesitation before aimed fire). */
  private shieldT = 0;

  /** The target was in line of sight (any body sample) at the last think. */
  get inSight(): boolean {
    return this.sight.exposure > 0;
  }

  /** The animated body (sonar marks). */
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
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 1.0 : 1.55) * this.def.scale, 0);
  }

  /** Say a line for `ev` (the dog growls whatever the event). */
  bark(ev: BarkEvent): void {
    if (!this.alive) return;
    const e = this.dog && ev !== 'blind' ? 'dog' : ev;
    const line = this.voice.say(e);
    if (line) this.ctx.onBark?.(this, line, RADIO_BARKS.has(e));
  }

  /** Shots stopped by the enforcer's shield (tests). */
  shieldBlocks = 0;

  /** The dog's handler: the nearest living, calm-or-not humanoid of its squad (or anyone close) - kept once found. */
  private findLeader(): Enemy | null {
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

  /** A training target: sees and hears nothing (the training course). */
  passive = false;

  /** The perception multiplier: difficulty, plus an officer close by. */
  private get perceptionMul(): number {
    if (this.passive) return 0;
    return DIFFICULTY[this.ctx.difficulty].perception * (this.buff ? 1.1 : 1);
  }

  private setState(s: EnemyState): void {
    if (this.state === s) return;
    if (s !== 'inCover') {
      this.coverPose = 'none';
      this.coverPeek = 0;
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
    if (this.called <= 0) this.called = delay;
  }

  /** Something to search for without a sighting (a body, lights cut) around (x, z); with `revive`, wake that
   *  knocked-out victim first. */
  searchAt(x: number, z: number, revive: Body | null = null): void {
    if (!this.alive || this.alerted) return;
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
    this.searchReq = true;
    this.searchOwn = true;
    if (revive) this.reviving = revive;
  }

  /** Something caught the eye at (x, z) (not enough to walk over): raise the meter to `level` and look. */
  notice(x: number, z: number, level: number): void {
    if (!this.alive || this.alerted) return;
    this.meter = Math.max(this.meter, level);
    this.stimulus[0] = x;
    this.stimulus[1] = z;
    this.hasStimulus = true;
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
    const lvl = this.aware.level;
    const looking = lvl === 'investigating' || lvl === 'searching' || (lvl === 'alert' && !this.los);
    return looking && field.levelAt(this.pos.x, this.pos.y + 1.4, this.pos.z) < (holding ? TORCH_KEEP : TORCH_DARK);
  }

  /** The flashlight follows the head: at eye height ahead of the face, pointing where it looks (a bit down). */
  placeTorch(l: LightDef): void {
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    l.x = this.pos.x + s * 0.35 + c * 0.15;
    l.y = this.pos.y + (this.crouch > 0.5 ? 1.0 : 1.45) * this.def.scale;
    l.z = this.pos.z + c * 0.35 - s * 0.15;
    const cone = l.cone;
    if (cone) {
      const p = 0.16;
      cone.dx = s * Math.cos(p);
      cone.dy = -Math.sin(p);
      cone.dz = c * Math.cos(p);
    }
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
    if (to === 'suspicious') this.bark('suspicious');
    else if (to === 'investigating') this.bark('investigate');
    else if (to === 'alert') this.bark('contact');
    else if (to === 'searching' && from === 'alert') this.bark(this.def.kind === 'officer' ? 'search' : 'lost');
    else if (to === 'cooldown') this.bark('clear');
    if (to === 'alert') {
      this.meter = 1;
      if (this.state === 'idle') this.setState('chase');
      // a radioed alert is not relayed (no chain across the map). A loud alert (gunfire, a hit) is called in at
      // once; a sighting is shouted to guards close by and radioed after `ALERT.callIn` - take the spotter out
      // before that and nobody else hears of it
      if (!this.alertIn.called) {
        if (this.loudAlert || this.gunfire || !this.ctx.stealth()) this.ctx.callAlert(this);
        else {
          if (this.target && this.los) this.target.spotted = true;
          this.ctx.shout?.(this);
          this.radioT = ALERT.callIn * DIFFICULTY[this.ctx.difficulty].reaction * (this.buff ? ARCHETYPE.officer.reaction : 1);
        }
      }
      this.loudAlert = false;
    } else if (from === 'alert') {
      // combat over: drop out of cover / fights and search
      this.alarm = null;
      this.setState('idle');
      this.burstLeft = 0;
      this.windup = 0;
    }
    if (to === 'searching') {
      this.searchK = 0;
      this.spotSet = false;
      if (from === 'alert') this.searchOwn = false;
    }
    if (to !== 'searching') this.reviving = null;
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
    // getting shot in the open pushes cover users to find cover
    if (this.def.usesCover && this.state === 'attack' && Math.random() < 0.5) this.setState('seekCover');
    if (!this.health.alive) this.die(h);
    return { dealt, killed: !this.health.alive };
  }

  private die(h: HitInfo, lethal = true): void {
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

  /** Fixed-step brain + movement. */
  update(dt: number): void {
    if (!this.alive) return;
    this.walker.tick(dt);
    this.stateT += dt;
    this.prevPos.copyFrom(this.pos);
    this.prevYaw = this.yaw;
    // in a takedown: the attacker drives the body, the brain is off
    if (this.taken) {
      this.syncHitboxes();
      return;
    }
    // flashbanged: no brain until the eyes clear, then combat
    if (this.blindT > 0) {
      this.blindT -= dt;
      this.vel.setAll(0);
      this.syncHitboxes();
      if (this.blindT <= 0) {
        this.blindT = 0;
        this.rig.emote = null;
        this.alert();
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
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.stagger = Math.max(0, this.stagger - dt);
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

    // on a ladder / dropping off a ledge: the route drives the body until it is off
    if (this.link) {
      this.runLink(dt);
      this.syncHitboxes();
      return;
    }
    const goal = this.decide(dt);
    this.move(dt, goal.point, goal.speed, goal.face);
    this.crouch += ((this.wantCrouch ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    this.syncHitboxes();
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
    this.targetLight = best.light ?? this.ctx.world.lightField.totalAt(this.tmp.x, this.tmp.y, this.tmp.z);
    // awareness: sight fill rate from distance, field of view, light, stance, motion and exposure
    const si = this.sight;
    si.dist = bd;
    si.angle = wrapAngle(Math.atan2(best.feet.x - this.pos.x, best.feet.z - this.pos.z) - this.yaw);
    si.light = this.targetLight;
    si.crouched = best.crouched;
    si.speed = best.speed;
    si.exposure = this.alerted ? (this.los ? 1 : 0) : n / samples;
    si.sensitivity = this.aware.sensitivity * this.perceptionMul;
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
    const h = this.ctx.ballistics.ray(eye, to, G.STATIC);
    return !h.hit || h.distance > Vector3.Distance(eye, to) - slack;
  }

  /** Per fixed step: the awareness meter and the alert level. */
  private updateAwareness(dt: number): void {
    const seen = this.alerted ? this.los || this.smelled : seenAt(this.rate);
    this.sinceSeen = seen ? 0 : this.sinceSeen + dt;
    if (!this.alerted) this.meter = stepMeter(this.meter, this.rate, dt, this.sinceSeen);
    if (this.called > 0) {
      this.called -= dt;
      if (this.called <= 0) this.alertIn.called = true;
    }
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
    if ((moved && this.routeT <= 0) || this.routePath.length === 0) {
      this.routeT = 1;
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
        const ly = this.walker.lookYaw;
        // (walls in the way: along an A* path; the walker's own arrival radius decides when it is there)
        const wp = g ? (this.goTo(g, dt, 0.05) ?? g) : null;
        return { point: wp, speed: def.walkSpeed * (this.walker.route?.loop ? 1 : PATROL_PACE), face: g || Number.isNaN(ly) ? null : ly };
      }
      case 'suspicious': {
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
                this.ctx.revive(rv);
              }
              return { point: null, speed: 0, face: Math.atan2(rv.pos.x - this.pos.x, rv.pos.z - this.pos.z) };
            }
            return { point: this.goTo(this.spot, dt, 0.9), speed: def.walkSpeed * SEARCH_PACE, face: null };
          }
        }
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
          } else searchPoint(cx, cz, this.searchK - 1, this.ctx.searchSlot(this), this.spot);
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
        const d = hyp2(this.spot[0] - this.pos.x, this.spot[1] - this.pos.z);
        const there = d < 1.1;
        if (there) {
          this.spotArrived = true;
          if (this.spotLookT === 0) this.lookBase = this.yaw;
          this.spotLookT += dt;
          if (lvl === 'searching' && this.spotLookT >= PATROL.searchLook) {
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
        return { point: wp, speed: def.walkSpeed * (lvl === 'searching' ? SEARCH_PACE : INVESTIGATE_PACE), face: null };
      }
      default:
        return { point: null, speed: 0, face: null };
    }
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
          if (this.alarmT >= ALARM.holdTime) {
            this.alarm = null;
            this.ctx.raiseAlarm(this, ap);
          }
          return { point: null, speed: 0, face: ap.yaw + Math.PI };
        }
        this.alarmT = 0;
        return { point: this.goTo(this.alarmPt, dt, 0.5), speed: def.runSpeed, face: null };
      }
    }
    // stealth: out of sight they go for where they last knew the target was, not where it is
    const known = this.los || this.smelled || !this.ctx.stealth() || !this.ctx.lkpValid() ? t.feet : this.ctx.lkp;
    const tp: P2 = [known.x, known.z];
    this.knownPt[0] = known.x;
    this.knownPt[1] = known.z;
    this.advanceCd -= dt;
    // holding a room against a target outside it
    const outside = this.hold !== null && !inRoom(this.hold, t.feet.x, t.feet.z, 1.5, t.feet.y);
    if (this.doorCheck > 0 && !this.los) return { point: null, speed: 0, face: null };

    // ---- melee (runner) ----
    if (def.melee) {
      if (this.dist <= def.melee.range && this.meleeCd === 0) {
        this.meleeCd = def.melee.cooldown;
        this.kick = 1;
        this.ctx.onMelee?.(this);
        t.target.applyDamage({
          amount: def.melee.damage * DIFFICULTY[this.ctx.difficulty].damage,
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
    switch (this.state) {
      case 'idle':
      case 'chase': {
        if (this.los && this.dist <= def.engageMax) {
          // in a fight they get behind something first
          this.advancing = false;
          this.setState(def.usesCover && Math.random() < 0.85 ? 'seekCover' : 'attack');
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
          return { point: this.chasePoint(tp, false), speed: def.walkSpeed * ADVANCE_PACE, face: null };
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
        } else if (def.usesCover && this.stateT > rand(2.5, 4.5)) {
          this.setState('seekCover');
        }
        // strafe / keep range
        if (this.strafeT <= 0) {
          this.strafeT = rand(2, 4);
          this.strafe = Math.random() < 0.5 ? 1 : -1;
        }
        const away = this.dist < def.engageMin ? -1 : 0;
        const dx = t.feet.x - this.pos.x;
        const dz = t.feet.z - this.pos.z;
        const len = hyp2(dx, dz) || 1;
        const sx = (-dz / len) * this.strafe + (dx / len) * away;
        const sz = (dx / len) * this.strafe + (dz / len) * away;
        const sp: P2 = [this.pos.x + sx * 2, this.pos.z + sz * 2];
        if (this.hold) clampToRoom(this.hold, sp[0], sp[1], 0.6, sp);
        return { point: sp, speed: def.walkSpeed * (this.windup > 0 || this.burstLeft > 0 ? 0.3 : 0.55), face: toTarget };
      }
      case 'seekCover': {
        if (!this.coverPicked) {
          this.coverPicked = true;
          if (!this.pickCover()) {
            this.setState('attack');
            return { point: null, speed: 0, face: toTarget };
          }
        }
        if (this.stateT > 6) this.setState(this.advancing && !this.los ? 'chase' : 'attack');
        if (this.los && this.stateT > 0.5 && def.kind !== 'sniper') this.tryFire(dt);
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
        if (this.advancing && !this.los) {
          this.coverPose = cp.low ? 'low' : 'high';
          this.wantCrouch = cp.low;
          if (this.stateT > ADVANCE_HOLD) this.setState('chase');
          return { point: [cp.pos.x, cp.pos.z], speed: def.walkSpeed, face: toTarget };
        }
        this.advancing = false;
        // flanked? leave
        const dirX = t.feet.x - cp.pos.x;
        const dirZ = t.feet.z - cp.pos.z;
        const l = hyp2(dirX, dirZ) || 1;
        const protects = (cp.normal.x * dirX + cp.normal.z * dirZ) / l;
        if (protects < 0.2 || this.peekCycles >= 5 || this.dist < def.engageMin * 0.7) {
          this.peekCycles = 0;
          this.setState('attack');
          return { point: null, speed: 0, face: toTarget };
        }
        if (this.tactics(t)) return { point: null, speed: 0, face: toTarget };
        // hide / peek cycle; some hide phases blind-fire over/around the cover at the last position
        const cycle = this.stateT % 4.2;
        const peeking = cycle > 2.4;
        this.wantCrouch = cp.low ? !peeking : false;
        if (cycle < dt * 1.5) this.blindPlan = Math.random() < 0.3;
        if (peeking) {
          this.tryFire(dt);
          if (cycle > 4.15) this.peekCycles++;
        } else if (this.blindPlan && cycle > 0.6 && cycle < 1.6 && this.lastSeenT < 6) this.tryFire(dt, 'blind');
        // high cover: step out past the nearest edge to peek (same faces the player uses)
        let pt: P2 = [cp.pos.x, cp.pos.z];
        this.coverPose = cp.low ? 'low' : 'high';
        this.coverPeek = 0;
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
      this.grenadeCd = rand(12, 18);
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
    return p;
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
    for (let i = 0; i < cover.length; i++) {
      const c = cover[i]!;
      const dMe = hyp2(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (dMe > (this.relocating ? 22 : 14)) continue;
      if (this.relocating && dMe < 5) continue;
      if (this.hold && !inRoom(this.hold, c.pos.x, c.pos.z, -0.2, c.pos.y)) continue;
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
    if (!w || !t || (mode === 'aim' && !this.los) || this.dist > w.range) {
      this.windup = 0;
      return;
    }
    // (3.2.0) a human shield in sight: hold fire a moment, then only aimed shots (at the exposed head)
    if (t.shield) {
      this.shieldT += dt;
      if (this.shieldT < GRAB.hesitate || mode !== 'aim') return;
    } else this.shieldT = 0;
    if (this.burstLeft <= 0) {
      this.pauseT -= dt;
      if (this.pauseT > 0) return;
      if (w.windup > 0 && this.windup < w.windup) {
        if (this.windup === 0) this.ctx.onWindup?.(this);
        this.windup += dt;
        return;
      }
      this.burstLeft = Math.round(rand(w.burstMin, w.burstMax));
    }
    if (this.fireT > 0) return;
    this.fireT = 60 / w.rpm;
    this.burstLeft--;
    if (this.burstLeft <= 0) {
      this.pauseT = rand(w.pauseMin, w.pauseMax);
      this.windup = 0;
    }
    this.shoot(t, w, mode);
  }

  private shoot(t: PlayerRef, w: NonNullable<EnemyDef['weapon']>, mode: 'aim' | 'suppress' | 'blind' = 'aim'): void {
    const d = DIFFICULTY[this.ctx.difficulty];
    const origin = this.eye(new Vector3());
    origin.y -= 0.2 * this.def.scale;
    origin.x += Math.sin(this.yaw) * 0.45 + Math.cos(this.yaw) * 0.18;
    origin.z += Math.cos(this.yaw) * 0.45 - Math.sin(this.yaw) * 0.18;
    // blind fire comes over / around the cover; suppressive and blind fire go at the last known spot
    if (mode === 'blind') origin.y = Math.max(origin.y, this.pos.y + 1.25);
    const aim = mode === 'aim' ? ((this.losHead || t.shield) && t.target.headPoint ? t.target.headPoint(new Vector3()) : t.target.aimPoint(new Vector3())) : this.lastKnown.clone();
    const dir = aim.subtract(origin).normalize();
    // accuracy: settles in over the first second of sight, worse against moving/rolling targets
    const settle = Math.min(1, 0.45 + (this.losT * 0.55) / DIFFICULTY[this.ctx.difficulty].reaction);
    if (this.def.kind === 'sniper') this.shotsHere++;
    const moving = Math.min(1, t.speed / 5);
    const modeMul = mode === 'blind' ? 3 : mode === 'suppress' ? 1.6 : 1;
    const spread = (w.spreadDeg * (1 + moving * 0.8) * (t.crouched ? 0.9 : 1) * modeMul) / (d.accuracy * settle * (this.buff ? ARCHETYPE.officer.accuracy : 1));
    const off = sampleSpread(spread, Math.random(), Math.random());
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
    // separation from other enemies and players
    const others = this.ctx.enemies();
    for (let k = 0; k < others.length; k++) {
      const o = others[k]!;
      if (o === this || !o.alive) continue;
      const dx = this.pos.x - o.pos.x;
      const dz = this.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 1.1 && d2 > 1e-4) {
        const d = Math.sqrt(d2);
        desired.x += (dx / d) * (1.1 - d) * 3;
        desired.z += (dz / d) * (1.1 - d) * 3;
      }
    }
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
    this.motion.step(dt, mi, this.alerted || this.level === 'searching' ? ENEMY_MOTION : ENEMY_CALM_MOTION);
    this.vel.x = this.motion.outX;
    this.vel.z = this.motion.outZ;
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
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

  /** Hit volumes follow the body (fixed step; the head from the last rendered pose). */
  private syncHitboxes(): void {
    this.hitboxes.sync(this.pos, this.head);
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
    const aiming = this.def.melee ? 0 : this.state === 'attack' || this.state === 'inCover' || this.burstLeft > 0 || this.windup > 0 ? 1 : lvl === 'investigating' || lvl === 'searching' ? 0.7 : lvl === 'suspicious' ? 0.4 : 0.2;
    const m = this.motion;
    const rp = this.rp;
    rp.speed = sp;
    rp.localX = (this.vel.x * c - this.vel.z * s) * inv;
    rp.localZ = (this.vel.x * s + this.vel.z * c) * inv;
    rp.crouch = this.crouch;
    rp.aimPitch = this.aimPitch;
    rp.aim = aiming;
    rp.kick = this.def.melee ? 0 : this.kick;
    rp.melee = this.def.melee && this.kick > 0 ? 1 - this.kick : -1;
    rp.cover = this.coverPose;
    rp.lean = this.coverPeek;
    rp.dash = !this.def.melee && sp > this.def.runSpeed * 0.8 && aiming < 0.5 ? 1 : 0;
    rp.phase = m.phase;
    rp.motion = m.state;
    rp.motionT = m.stateT;
    rp.accelFwd = m.ax * s + m.az * c;
    rp.accelSide = m.ax * c - m.az * s;
    rp.velX = this.vel.x;
    rp.velZ = this.vel.z;
    rp.goalYaw = m.goalYaw;
    rp.traverse = this.climbing ? 'climb' : 'none';
    rp.traverseT = this.climbT;
    if (this.climbing) rp.aim = 0;
    if (this.dog) {
      const alertK = lvl === 'unaware' ? 0 : 1;
      this.dog.update(dt, r.position.x, r.position.y, r.position.z, r.rotation.y, sp, alertK, this.kick);
      this.head.copyFrom(this.dog.head);
    } else {
      this.rig.animate(dt, rp);
      this.rig.headNode.computeWorldMatrix(true);
      this.head.copyFrom(this.rig.headNode.getAbsolutePosition());
    }
    if (this.laser) this.sniperFx();
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
