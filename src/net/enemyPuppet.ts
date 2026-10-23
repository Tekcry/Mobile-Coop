import { Vector3, type Scene } from '../core/babylon';
import type { CharacterRig, FkPose } from '../player/characterRig';
import type { WeaponModel } from '../weapons/weaponModel';
import { GuardCq, koCurve, seedOf, type GuardCqMode, type KoState } from '../game/closeQuarters';
import { buildEnemyRig } from '../ai/enemyRig';
import { Hitboxes } from '../ai/hitboxes';
import { DogModel } from '../ai/dogModel';
import { ENEMIES, type EnemyDef } from '../ai/enemyDefs';
import type { AlertLevel } from '../ai/alertState';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { TakedownVictim } from '../game/takedownController';
import type { World } from '../world/world';
import { SnapshotBuffer } from './interp';
import { AL_TORCH, type EnemyState } from './protocol';
import type { TorchHolder } from './torchMirror';
import { HOST_INFO, type GuardInfo } from '../ai/guardInfo';
import { hyp2 } from '../core/mathx';

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
  /** (PR 3) What INTERROGATE gets out of him, while the host says he has intel (`setIntel`); null: none, or spent. */
  info: GuardInfo | null = null;
  /** (PR 3) The lines he says: the course slot he appeared at (`infoAtSpawn`), null when none (then `HOST_INFO`). */
  spawnInfo: GuardInfo | null = null;
  /** (stealth-pays client intel) The host's last `EnemyState.in`. */
  private intel = false;
  /** A takedown started on the host and not yet finished / aborted (the controller clears `taken` first). */
  private seized = false;
  /** Seconds since the host last mentioned this enemy. */
  stale = 0;
  onShot: ((h: HitInfo) => void) | null = null;
  /** Takedown messages for the host. */
  onTakedown: ((phase: 'start' | 'done' | 'abort', lethal: boolean) => void) | null = null;

  constructor(
    scene: Scene,
    world: World,
    private registry: DamageRegistry,
    readonly id: string,
    kind: EnemyState['k'],
  ) {
    this.def = ENEMIES[kind];
    const built = buildEnemyRig(scene, world, this.def, `p${id}`);
    this.rig = built.rig;
    this.gun = built.gun;
    this.rig.setEnabled(false);
    if (this.def.quadruped) {
      this.dog = new DogModel(scene, world.parts, this.def.look.colors.torso, this.def.look.colors.accent);
      this.dog.setVisible(false);
    }
    this.hitboxes = new Hitboxes(scene, registry, this, this.def.scale, this.def.build);
  }

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
    return { dealt: h.amount * (h.part === 'head' ? this.def.headMult : this.def.armor), killed: false };
  }

  // --- takedown (local player) ---

  /** (G7) The held pose, the same code as the host's `Enemy` (`closeQuarters.GuardCq`). */
  private readonly cq = new GuardCq();
  private readonly cqEmote = (_r: CharacterRig, t: number): FkPose | undefined => this.cq.pose(t) ?? undefined;

  /** (stealth-pays client intel) The host's flag from each snapshot (`EnemyState.in`): INTERROGATE is offered from its
   *  rise until the host clears it. A local interrogation spends `info` at once and the flag, still set until the host
   *  hears of it, does not bring it back (only a rise does). */
  setIntel(on: boolean): void {
    if (on && !this.intel) this.info = this.spawnInfo ?? HOST_INFO;
    else if (!on) this.info = null;
    this.intel = on;
  }

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
      // (G7 fix) held by the partner: lowered with the knockout's own phase (the snapshot's crouch bit flips at half way)
      if (this.remoteHold) this.crouch = this.remoteLower;
      else this.crouch += ((st === 2 ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
      this.aim += ((st === 1 || st === 2 ? 1 : 0.2) - this.aim) * Math.min(1, dt * 8);
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
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const inv = moved > 1e-4 ? 1 / moved : 0;
    this.rig.animate(dt, {
      speed: this.speed,
      localX: (lx * cy - lz * sy) * inv,
      localZ: (lx * sy + lz * cy) * inv,
      grounded: true,
      crouch: this.crouch,
      aimPitch: 0,
      aim: this.def.melee || this.taken || this.remoteHold ? 0 : this.aim,
      kick: this.def.melee ? 0 : this.kick,
      melee: this.def.melee && this.kick > 0 ? 1 - this.kick : -1,
    });
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
    this.rig?.dispose();
    this.rig = null;
    this.dog?.dispose();
    this.dog = null;
  }
}
