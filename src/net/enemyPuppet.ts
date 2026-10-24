import { Vector3, type InstancedMesh, type Scene } from '../core/babylon';
import type { CharacterRig, FkPose } from '../player/characterRig';
import type { WeaponModel } from '../weapons/weaponModel';
import { GuardCq, koCurve, seedOf, type GuardCqMode, type KoState } from '../game/closeQuarters';
import { buildEnemyRig, GuardGunCarry } from '../ai/enemyRig';
import { Hitboxes } from '../ai/hitboxes';
import { DogModel } from '../ai/dogModel';
import { ENEMIES, type EnemyDef } from '../ai/enemyDefs';
import type { AlertLevel } from '../ai/alertState';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { TakedownVictim } from '../game/takedownController';
import type { World } from '../world/world';
import { SnapshotBuffer } from './interp';
import { AL_ARMOUR, AL_CAUTION, AL_HELMET, AL_TORCH, alertCarry, alertLook, type EnemyState } from './protocol';
import type { TorchHolder } from './torchMirror';
import type { GuardInfo } from '../ai/guardInfo';
import { hyp2 } from '../core/mathx';
import { buildArmourParts, buildHelmetPart, buildShieldPart, gearColour, HELMET_FIT } from '../ai/gearParts';
import type { GuardBody } from '../ai/guardBody';
import { guardHelmetDrop } from '../ai/helmetDrops';
import { guardShieldFor } from '../ai/guardShield';
import { wireGuardAim } from '../ai/guardStance';
import { shieldBlocks } from '../ai/archetypes';
import { PG_ARMOUR, PG_DROP, PG_HELMET, predictDeflect, puppetGear } from './puppetGear';
import { carryRaise, carrySlotOf, mayHolster } from '../ai/carryState';
import { PuppetCarry } from './puppetCarry';
import type { RigPose } from '../player/characterRig';

/** (guard-ai S9) A dropped helmet for the client's pool (`HelmetDrops.drop`'s arguments). */
export type PuppetHelmetDrop = (x: number, y: number, z: number, top: number, dx: number, dz: number, hex: string, w: number, h: number, d: number) => void;

/** (guard-ai S9) The gear bits of `EnemyState.al`. */
const GEAR_BITS = AL_HELMET | AL_ARMOUR;

/** Wire alert level (`EnemyState.al & 3`) -> the local level a takedown reads. */
const LEVELS: AlertLevel[] = ['unaware', 'investigating', 'searching', 'alert'];

/**
 * Client-side stand-in for a host-simulated enemy: interpolated rig (the dog: its own body) + local hit volumes so
 * the client's own shots resolve instantly. Damage is only predicted (flash, hit marker); the hit is sent to the
 * host, which decides. Explosions are ignored (the host applies them). A takedown seizes it locally (held where the
 * attacker puts it) and asks the host to seize the real enemy; finishing it sends the outcome.
 */
export class EnemyPuppet implements Damageable, TakedownVictim, TorchHolder {
  readonly team = 'enemy' as const;
  readonly def: EnemyDef;
  readonly buf = new SnapshotBuffer<EnemyState>(30, 0.25);
  readonly pos = new Vector3();
  yaw = 0;
  rig: CharacterRig | null;
  /** (guard-models G7) The host guard's figure over the rig (`flags.guardModels`; null: the merged S1 body, the dog):
   *  its look from the wire seed (`AL_LOOK`), its pieces from the gear bits; it goes on with the rig after `die`. */
  private gbody: GuardBody | null = null;
  /** (G7 fix) His rifle (hidden while held, as the host's `Enemy`). */
  private gun: WeaponModel | null = null;
  private dog: DogModel | null = null;
  private hitboxes: Hitboxes | null;
  private crouch = 0;
  private aim = 0;
  private kick = 0;
  private flash = 0;
  private prev = new Vector3();
  private speed = 0;
  private head = new Vector3();
  private placed = false;
  private al = 0;
  /** (coop-torches) The shown state's `st` and torch bit (`AL_TORCH`). */
  private st = 0;
  private torchBit = false;
  dead = false;
  /** Seized by the local player's takedown (position from `holdAt`, not the host). */
  taken = false;
  /** (PR 3) What INTERROGATE gets out of him: the map slot he appeared at (`infoAtSpawn`, no wire data). */
  info: GuardInfo | null = null;
  /** A takedown started on the host and not yet finished / aborted (the controller clears `taken` first). */
  private seized = false;
  /** Seconds since the host last mentioned this enemy. */
  stale = 0;
  onShot: ((h: HitInfo) => void) | null = null;
  /** Takedown messages for the host. */
  onTakedown: ((phase: 'start' | 'done' | 'abort', lethal: boolean) => void) | null = null;
  /** (guard-ai S9) Our round predicted as stopped by his helmet or vest (the marker shows now; `DeflectLedger`). */
  onDeflect: (() => void) | null = null;
  /** (guard-ai S9) His helmet bit cleared: a helmet falls (the client's `HelmetDrops`). */
  onDropHelmet: PuppetHelmetDrop | null = null;

  // ----- (guard-ai S9, protocol 38) gear and caution from the snapshot's `al` -----
  /** The enforcer's riot shield (by kind, as the host's `Enemy`). */
  private shield: InstancedMesh | null = null;
  /** The S12 placeholder parts, built the first time his bits ask for them, then shown or hidden. */
  private helmetPart: InstancedMesh | null = null;
  private armourParts: InstancedMesh[] | null = null;
  private gearHex = '';
  /** The `al` his gear was last set from (-1: none yet). */
  private gearAl = -1;
  /** The direction of our last round his helmet stopped and when (the drop flies along it; else backwards). */
  private dropDx = 0;
  private dropDz = 0;
  private dropT = -1e9;
  private clock = 0;
  private cautionBit = false;

  // ----- (guard-ai A126, protocol 38) the S21 weapon carry from the snapshot's `al` (bits 7-8) -----
  /** Follows the host's carry phase (null: a kind that never holsters, or no gun): holstered / drawing / drawn /
   *  holstering, posed through the host's own path (`GuardGunCarry`, `RigPose.ready` / `swap`, `carryRaise`). */
  readonly carry: PuppetCarry | null = null;
  private gunCarry: GuardGunCarry | null = null;
  /** The newest wire carry (`alertCarry`, `WIRE_CARRY_*`). */
  private carryWire = 0;
  /** (guard-models G6n, M3) The host guard's look seed (`alertLook`, 0-127; `Enemy.look`): read from every snapshot
   *  state shown, so it is set before the rig first shows; constant for one guard id. */
  private lookSeed = 0;
  /** The rig pose, reused each frame. */
  private readonly rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };

  constructor(
    scene: Scene,
    private world: World,
    private registry: DamageRegistry,
    readonly id: string,
    kind: EnemyState['k'],
  ) {
    this.def = ENEMIES[kind];
    const built = buildEnemyRig(scene, world, this.def, `p${id}`);
    this.rig = built.rig;
    this.gun = built.gun;
    this.gbody = built.figure;
    this.rig.setEnabled(false);
    if (this.def.quadruped) {
      this.rig.standIn = true;
      this.dog = new DogModel(scene, world.parts, this.def.look.colors.torso, this.def.look.colors.accent);
      this.dog.setVisible(false);
    }
    // (guard-ai S9, S13) the response team's lead and every enforcer: the shield on his root (shown with the rig)
    if (this.def.kind === 'enforcer') {
      // (guard-models G7) with the figures: shield_riot's own GLB on his skeleton once its files are in, as the host
      const gs = this.gbody ? guardShieldFor(scene, this.gbody, (m) => world.addShadowCaster(m)) : null;
      if (gs) this.gbody!.shield = gs;
      else this.shield = buildShieldPart(world, this.rig.root, this.def.scale);
    }
    // (guard-ai A126) the carry as the host's `Enemy` builds it: a kind that ever holsters gets the gun's slot
    if (built.gun && mayHolster(this.def.kind, this.def.gun, !!this.def.melee, this.def.quadruped)) {
      const cls = built.gun.def.class;
      this.carry = new PuppetCarry(cls);
      this.gunCarry = new GuardGunCarry(built.rig, built.gun, carrySlotOf(cls));
    }
    this.hitboxes = new Hitboxes(scene, registry, this, this.def.scale, this.def.build);
  }

  /** (guard-ai S9) Shown wearing (tests / e2e): the helmet, the armour, the shield. */
  get gearShown(): { helmet: boolean; armour: boolean; shield: boolean } {
    const gb = this.gbody;
    if (gb) return { helmet: gb.helmetOn, armour: gb.armourOn, shield: (!!this.shield || !!gb.shield) && !this.dead };
    return { helmet: !!this.helmetPart?.isVisible, armour: !!this.armourParts?.[0]?.isVisible, shield: !!this.shield && !this.dead };
  }

  /** (guard-models G7, tests / e2e) The figure's visible piece ids (null: no figure). Allocates. */
  get shownPieces(): string[] | null {
    return this.gbody ? this.gbody.shownPieces() : null;
  }

  /** (guard-models G6n) His look seed from the host (`AL_LOOK`), for the guard figure's variant. */
  get look(): number {
    return this.lookSeed;
  }

  /** (guard-ai S9) The host says he is cautious (`AL_CAUTION`): calm, he carries at low ready. */
  get cautious(): boolean {
    return this.cautionBit;
  }

  /** (guard-ai S9) His gear from wire `al` (`puppetGear`): parts built on first need, a helmet falls when its bit
   *  clears on a guard already shown who did not jump `jumped` m. Only on a gear-bit change (no work per frame). */
  private applyGear(al: number, jumped: number): void {
    const prev = this.gearAl;
    this.gearAl = al;
    const rig = this.rig;
    if (!rig || this.dog) return;
    const bits = puppetGear(prev, al, jumped);
    // (guard-models G7, A5 / A6) the figure's pieces, and helmet_std's drop box; the placeholder parts only without it
    const gb = this.gbody;
    if (gb) {
      gb.setGear((bits & PG_HELMET) !== 0, (bits & PG_ARMOUR) !== 0);
      if (bits & PG_DROP) {
        if (!this.gearHex) this.gearHex = gearColour(this.def, this.world, 'helmet');
        const ours = this.clock - this.dropT < 1;
        const d = guardHelmetDrop(this.def.height, this.dropBox);
        this.onDropHelmet?.(this.pos.x, this.pos.y, this.pos.z, 1.65 * this.def.scale, ours ? this.dropDx : -Math.sin(this.yaw), ours ? this.dropDz : -Math.cos(this.yaw), this.gearHex, d[0]!, d[1]!, d[2]!);
      }
      return;
    }
    if (bits & PG_HELMET && !this.helmetPart) {
      this.gearHex = gearColour(this.def, this.world, 'helmet');
      this.helmetPart = buildHelmetPart(this.world, rig, this.gearHex);
    }
    if (bits & PG_ARMOUR && !this.armourParts) this.armourParts = buildArmourParts(this.world, rig, gearColour(this.def, this.world, 'accent'));
    if (this.helmetPart) this.helmetPart.isVisible = (bits & PG_HELMET) !== 0;
    const a = this.armourParts;
    if (a) for (let i = 0; i < a.length; i++) a[i]!.isVisible = (bits & PG_ARMOUR) !== 0;
    if (bits & PG_DROP) {
      // along our own round when it was ours (just now), else backwards from his facing (the host's round: A92)
      const ours = this.clock - this.dropT < 1;
      const dx = ours ? this.dropDx : -Math.sin(this.yaw);
      const dz = ours ? this.dropDz : -Math.cos(this.yaw);
      const H = rig.p.head;
      this.onDropHelmet?.(this.pos.x, this.pos.y, this.pos.z, 1.65 * this.def.scale, dx, dz, this.gearHex || '#22262b', H.w * HELMET_FIT.w, H.h * HELMET_FIT.h, H.d * HELMET_FIT.d);
    }
  }

  /** (guard-models G7) The figure's dropped-helmet box (w, h, d; m), reused. */
  private readonly dropBox = [0, 0, 0];

  get alive(): boolean {
    return !this.dead;
  }

  get alerted(): boolean {
    return (this.al & 3) === 3;
  }

  /** (coop-torches) His flashlight is on (`TorchMirror`): the snapshot's torch bit, while he is alive and still in
   *  the host's snapshots (one missed snapshot switches it off; the next one that lists him brings it back). */
  get torch(): boolean {
    return this.torchBit && !this.dead && this.stale === 0;
  }

  /** (coop-torches) Crouched as the host places the torch (`st` 2 = the host's crouch past half way). */
  get torchCrouch(): boolean {
    return this.st === 2;
  }

  get level(): AlertLevel {
    return LEVELS[this.al & 3]!;
  }

  get bodyRig(): CharacterRig {
    return this.rig!;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.7 : 1.0) * this.def.scale, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.85 : 1.25) * this.def.scale, 0);
  }

  applyDamage(h: HitInfo): DamageResult {
    if (this.dead || h.attackerTeam !== 'player' || h.attackerId !== 'local') return { dealt: 0, killed: false };
    // the local takedown's lethal strike
    if (h.kind === 'melee') {
      if (this.seized) this.onTakedown?.('done', true);
      this.seized = this.taken = false;
      return { dealt: h.amount, killed: false };
    }
    if (h.kind !== 'bullet') return { dealt: 0, killed: false };
    this.flash = 1;
    this.onShot?.(h);
    // (guard-ai S9) predicted as the host decides: a front round on the enforcer's shield does nothing; one his helmet
    // or vest stops is a deflect (the marker now; the host's `hitConfirm` deflect then adds none, `DeflectLedger`)
    if (this.def.kind === 'enforcer' && !this.taken && shieldBlocks(this.yaw, h.dir.x, h.dir.z)) return { dealt: 0, killed: false };
    const head = h.part === 'head';
    if (predictDeflect(this.gearAl < 0 ? 0 : this.gearAl, head, true, h.nonLethal === true, this.def.kind === 'heavy') && !this.dog) {
      if (head) {
        const dl = hyp2(h.dir.x, h.dir.z) || 1;
        this.dropDx = h.dir.x / dl;
        this.dropDz = h.dir.z / dl;
        this.dropT = this.clock;
      }
      this.onDeflect?.();
      return { dealt: 0, killed: false, deflect: true };
    }
    return { dealt: h.amount * (head ? this.def.headMult : this.def.armor), killed: false };
  }

  // --- takedown (local player) ---

  /** (G7) The held pose, the same code as the host's `Enemy` (`closeQuarters.GuardCq`). */
  private readonly cq = new GuardCq();
  private readonly cqEmote = (_r: CharacterRig, t: number): FkPose | undefined => this.cq.pose(t) ?? undefined;

  beginTakedown(choke: boolean, delay = 0): void {
    if (!this.seized) this.onTakedown?.('start', !choke);
    this.seized = this.taken = true;
    const rig = this.rig;
    if (!rig) return;
    this.cq.seed = seedOf(this.id);
    this.cq.seize(!choke, delay);
    this.gun?.setVisible(false);
    rig.emote = this.cqEmote;
    rig.emoteTime = 0;
  }

  /** (marlow-bays item 1) Solid to bodies or not, as the host's `Enemy`: the hostage held 0.32 m in front must not push
   *  the holder back (the takedown's `setSolid?.(false)` was a no-op here, so the client's own controller kept shoving
   *  into its hostage: slow, jittery movement while holding). Bullets still hit (`ENEMY_HITBOX` stays). */
  setSolid(on: boolean): void {
    this.hitboxes?.setSolid(on);
  }

  /** (G7) Held as a hostage here (the client's own grab): as the host's guard. */
  holdAsHostage(): void {
    if (this.rig && this.rig.emote === this.cqEmote) this.cq.set('hostage');
  }

  /** (G7) The knockout's limp / lowering, the interrogation. */
  holdPose(mode: GuardCqMode, k: number, lower = 0): void {
    if (!this.rig || this.rig.emote !== this.cqEmote) return;
    this.cq.set(mode);
    this.cq.k = k;
    if (mode === 'ko') this.crouch = lower;
  }

  holdAt(x: number, y: number, z: number, yaw: number): void {
    this.pos.set(x, y, z);
    this.yaw = yaw;
  }

  releaseTakedown(): void {
    if (!this.seized) return;
    this.seized = this.taken = false;
    this.hitboxes?.setSolid(true);
    if (this.rig) this.rig.emote = null;
    this.gun?.setVisible(true);
    this.onTakedown?.('abort', false);
  }

  /** (G7 fix) Held by the partner (the host's own grab, seen here): posed from the partner's MoveState as the host's
   *  guard (`ph` the knockout's / interrogation's progress, `sub` bit 1 the kill, bit 2 interrogating). Called each
   *  render frame while it lasts; `ph` < 0 lets go. */
  remoteHeld(ph: number, sub: number): void {
    const rig = this.rig;
    if (!rig || this.taken) return;
    if (ph < 0) {
      if (this.remoteHold) {
        this.remoteHold = false;
        this.hitboxes?.setSolid(true);
        if (rig.emote === this.cqEmote) rig.emote = null;
        this.gun?.setVisible(true);
      }
      return;
    }
    if (!this.remoteHold || rig.emote !== this.cqEmote) {
      this.remoteHold = true;
      // (marlow-bays item 1) not solid while the partner holds him, as on the host
      this.hitboxes?.setSolid(false);
      this.cq.seed = seedOf(this.id);
      this.cq.seize(false, 0);
      rig.emote = this.cqEmote;
      rig.emoteTime = 0;
      this.gun?.setVisible(false);
    }
    if (sub & 2) {
      this.cq.set('interrogate');
      this.cq.k = ph;
    } else if (ph > 0 && !(sub & 1)) {
      const ko = koCurve(ph, this.koTmp);
      this.cq.set('ko');
      this.cq.k = ko.limp;
      this.remoteLower = ko.lower;
    } else {
      this.cq.set(sub & 1 ? 'seizedLethal' : 'hostage');
      this.remoteLower = 0;
    }
  }

  /** (G7 fix) Held by the partner this frame (the crouch comes from the knockout's lowering, not the snapshot). */
  private remoteHold = false;
  /** (coop-walk-fixes P6) Held by a partner as a hostage now (not by our own takedown): the team takedown's offer. */
  get partnerHeld(): boolean {
    return this.remoteHold && !this.taken && !this.dead;
  }
  private remoteLower = 0;
  private koTmp: KoState = { limp: 0, lower: 0, bend: 0 };

  knockOut(h: HitInfo): void {
    void h;
    if (this.seized) this.onTakedown?.('done', false);
    this.seized = this.taken = false;
  }

  /** The host refused (or the enemy broke free there): let go locally. */
  deny(): void {
    this.seized = this.taken = false;
    this.hitboxes?.setSolid(true);
    if (this.rig) this.rig.emote = null;
    this.gun?.setVisible(true);
  }

  /** The host decides about glints. */
  glintFor(x: number, y: number, z: number): number {
    void x;
    void y;
    void z;
    return 0;
  }

  /** Muzzle flash pose for a shot the host reported. */
  fired(): void {
    this.kick = 1;
  }

  update(dt: number, renderTime: number): void {
    if (!this.rig || this.dead) return;
    this.clock += dt;
    if (!this.taken) {
      const s = this.buf.sample(renderTime);
      if (!s) return;
      this.pos.set(s.x, s.y, s.z);
      this.yaw = s.yaw;
      this.al = s.state.al;
      const st = s.state.st;
      // (coop-torches) the torch and the crouch it is held at, from the state shown now (as the position)
      this.st = st;
      this.torchBit = (s.state.al & AL_TORCH) !== 0;
      this.cautionBit = (s.state.al & AL_CAUTION) !== 0;
      this.carryWire = alertCarry(s.state.al);
      this.lookSeed = alertLook(s.state.al);
      // (guard-ai S9) gear from the state shown now; a jump since the last frame is a re-place, not a knock-off
      if (this.gearAl < 0 || ((s.state.al ^ this.gearAl) & GEAR_BITS) !== 0) this.applyGear(s.state.al, this.placed ? hyp2(this.pos.x - this.prev.x, this.pos.z - this.prev.z) : 0);
      // (G7 fix) held by the partner: lowered with the knockout's own phase (the snapshot's crouch bit flips at half way)
      if (this.remoteHold) this.crouch = this.remoteLower;
      else this.crouch += ((st === 2 ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
      // (guard-ai S9) the host's stance (`guardStance.ts`): searching / investigating raised, cautious and calm low ready
      this.aim += (wireGuardAim(st, s.state.al & 3, this.cautionBit) - this.aim) * Math.min(1, dt * 8);
    } else {
      // seized by our takedown (posed here, not sampled): the torch bit follows the host's newest state
      const ls = this.buf.latest();
      if (ls) this.torchBit = (ls.al & AL_TORCH) !== 0;
    }
    if (!this.placed) {
      this.placed = true;
      this.prev.copyFrom(this.pos);
      if (this.dog) this.dog.setVisible(true);
      else this.rig.setEnabled(true);
    }
    const lx = this.pos.x - this.prev.x;
    const lz = this.pos.z - this.prev.z;
    const moved = hyp2(lx, lz);
    this.speed += (Math.min(dt > 0 ? moved / dt : 0, 10) - this.speed) * Math.min(1, dt * 10);
    this.prev.copyFrom(this.pos);
    this.kick = Math.max(0, this.kick - dt * 8);
    this.flash = Math.max(0, this.flash - dt * 9);
    if (this.dog) {
      this.dog.update(dt, this.pos.x, this.pos.y, this.pos.z, this.yaw, this.speed, this.alerted ? 1 : 0, this.kick);
      this.hitboxes?.sync(this.pos, this.dog.head);
      return;
    }
    const r = this.rig.root;
    r.position.copyFrom(this.pos);
    r.rotation.y = this.yaw;
    this.rig.setFlash(this.flash * 0.75);
    const gb = this.gbody;
    if (gb) {
      // (guard-models G7, M3) the host's seed (read from the state shown: before the rig first shows), the flash
      gb.setLook(this.lookSeed);
      gb.flash = this.flash * 0.75;
    }
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const inv = moved > 1e-4 ? 1 / moved : 0;
    const rp = this.rp;
    rp.speed = this.speed;
    rp.localX = (lx * cy - lz * sy) * inv;
    rp.localZ = (lx * sy + lz * cy) * inv;
    rp.grounded = true;
    rp.crouch = this.crouch;
    rp.aimPitch = 0;
    rp.aim = this.def.melee || this.taken || this.remoteHold ? 0 : this.aim;
    rp.kick = this.def.melee ? 0 : this.kick;
    rp.melee = this.def.melee && this.kick > 0 ? 1 - this.kick : -1;
    // (guard-ai A126) the host's carry (S21): holstered he walks with ready hands, the draw / holster clip runs while the
    // gun travels, no raise until it is drawn; held in a takedown the gun is hidden and left where it is (as the host)
    const pc = this.carry;
    const gc = this.gunCarry;
    if (pc && gc) {
      pc.step(dt, this.carryWire);
      const cs = pc.c;
      if (!this.taken && !this.remoteHold) gc.apply(cs);
      rp.aim = carryRaise(rp.aim, cs);
      rp.ready = cs.holstered;
      rp.swap = cs.swapClip();
      rp.swapFrom = gc.slot;
      rp.swapTo = gc.slot;
    }
    this.rig.animate(dt, rp);
    this.rig.headNode.computeWorldMatrix(true);
    this.head.copyFrom(this.rig.headNode.getAbsolutePosition());
    this.hitboxes?.sync(this.pos, this.head);
  }

  /** Host confirmed the kill: drop hit volumes and hand the rig to a ragdoll (or remove it; a dog lies down). */
  die(): CharacterRig | null {
    if (this.dead) return null;
    this.dead = true;
    this.taken = false;
    this.hitboxes?.dispose();
    this.hitboxes = null;
    this.registry.removeTarget(this);
    const rig = this.rig;
    this.rig = null;
    if (this.dog) {
      this.dog.layDown();
      rig?.dispose();
      return null;
    }
    if (rig) {
      rig.heldWeapon = null;
      rig.emote = null;
    }
    // (guard-models G7) the figure rides the rig on into its ragdoll, unflashed (freed with the rig)
    if (this.gbody) this.gbody.flash = 0;
    this.gbody = null;
    return rig;
  }

  /** Per frame after death: the dog settles onto its side. */
  settle(dt: number): void {
    if (this.dead && this.dog) this.dog.update(dt, this.pos.x, this.pos.y, this.pos.z, this.yaw, 0, 0, 0);
  }

  dispose(): void {
    // (course-restart-hold) gone: never alive again, so a stale reference (a takedown, a hold) lets go of it
    this.dead = true;
    this.taken = this.seized = this.remoteHold = false;
    this.hitboxes?.dispose();
    this.hitboxes = null;
    this.registry.removeTarget(this);
    this.gbody?.dispose();
    this.gbody = null;
    this.rig?.dispose();
    this.rig = null;
    this.dog?.dispose();
    this.shield?.dispose();
    this.shield = null;
    this.dog = null;
  }
}
