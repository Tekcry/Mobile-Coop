import { Vector3 } from '../core/babylon';
import type { InputState } from '../input/inputState';
import type { Player } from '../player/player';
import type { World } from '../world/world';
import { MASK } from '../physics/groups';
import type { Ballistics, RayHit } from './ballistics';
import { spreadDir } from './ballistics';
import type { Grenades } from './grenades';
import type { Vfx } from '../vfx/vfx';
import type { PartPattern } from '../world/partLibrary';
import { classWeight } from './weaponCarry';
import { GRENADE, WEAPONS, type WeaponDef, type WeaponId } from './weaponDefs';
import { WeaponModel, DEFAULT_WEAPON_COLORS, type WeaponColors } from './weaponModel';
import { computeStats, damageAt, recoilKick, sampleSpread, spreadDeg, NO_UPGRADES, type EffectiveStats, type StatMods, type WeaponUpgrades } from './weaponStats';

export interface LoadoutEntry {
  id: WeaponId;
  upgrades?: WeaponUpgrades;
  mods?: StatMods;
  colors?: WeaponColors;
  pattern?: PartPattern;
}

export interface WeaponSlot {
  def: WeaponDef;
  stats: EffectiveStats;
  mag: number;
  reserve: number;
  model: WeaponModel;
}

export type HitKind = 'hit' | 'head' | 'kill';

export interface CombatEvents {
  onHit?(kind: HitKind, weapon: WeaponId, damage: number): void;
  onShot?(def: WeaponDef): void;
  onReload?(def: WeaponDef): void;
  onDryFire?(def: WeaponDef): void;
  onSwap?(def: WeaponDef): void;
  onGrenade?(): void;
}

const DEG = Math.PI / 180;
/** Weapon swap (s): holster the current gun, draw the next (the model changes hands half way). */
const SWAP_TIME = 0.9;
/** Grenade throw (s) and the moment it leaves the hand. */
const GRENADE_TIME = 1.2;
const GRENADE_RELEASE = 0.68;
/** Reload durations relative to the weapon's base reload time: rifle 1.9 s -> 2.6 s / 3.1 s. */
export const RELOAD_TACTICAL_MULT = 1.37;
export const RELOAD_EMPTY_MULT = 1.63;

/** The local player's weapons: fire modes, spread/bloom, recoil, reload, swap, grenades. */
export class PlayerWeapons {
  readonly slots: WeaponSlot[] = [];
  index = 0;
  grenades = GRENADE.startCount;
  private cooldown = 0;
  private grenadeCd = 0;
  private reloadT = -1;
  private swapT = -1;
  private swapEquipped = false;
  private reloadTotal = 1;
  private reloadEmpty = false;
  private grenadeT = -1;
  private grenadeThrown = false;
  private bloom = 0;
  private shotIndex = 0;
  private sinceShot = 99;
  /** A semi-auto press made while the weapon was still coming up fires once it is raised. */
  private queuedT = 0;
  infiniteAmmo = false;
  /** Extra spread factor (blind fire from cover). */
  spreadMul = 1;
  /** Last hitscan shot (debugging / tests). */
  lastShot: { origin: Vector3; aim: Vector3; hit: Vector3; target: string } | null = null;
  events: CombatEvents = {};
  /** Shots/hits per weapon for accuracy + mastery. */
  readonly tally = new Map<WeaponId, { shots: number; hits: number; kills: number; heads: number }>();
  private tmpO = new Vector3();
  private tmpD = new Vector3();
  private muzzle = new Vector3();

  constructor(
    private world: World,
    private player: Player,
    private ballistics: Ballistics,
    private grenadeSys: Grenades,
    private vfx: Vfx,
    loadout: LoadoutEntry[],
    private rumble: (s: number, w: number, ms: number) => void,
  ) {
    for (const e of loadout) {
      const def = WEAPONS[e.id];
      const stats = computeStats(def, e.upgrades ?? NO_UPGRADES, e.mods);
      const model = new WeaponModel(world.scene, world.parts, def, e.colors ?? DEFAULT_WEAPON_COLORS, player.rig.weaponPivot, e.pattern);
      for (const m of model.parts) world.addShadowCaster(m);
      model.setVisible(false);
      this.recency.push(this.slots.length);
      this.slots.push({ def, stats, mag: stats.magSize, reserve: def.reserve, model });
    }
    this.equip(0);
  }

  get current(): WeaponSlot {
    return this.slots[this.index]!;
  }

  /** Fired within the last 0.2 s (coop animation flag). */
  get firingRecently(): boolean {
    return this.sinceShot < 0.2;
  }

  get reloading(): boolean {
    return this.reloadT >= 0;
  }

  get reloadProgress(): number {
    return this.reloading ? 1 - this.reloadT / this.reloadTotal : 0;
  }

  get swapping(): boolean {
    return this.swapT >= 0;
  }

  /** Throwing a grenade (wind-up to recovery): no firing, aiming or reloading. */
  get throwing(): boolean {
    return this.grenadeT >= 0;
  }

  private tallyFor(id: WeaponId): { shots: number; hits: number; kills: number; heads: number } {
    let t = this.tally.get(id);
    if (!t) {
      t = { shots: 0, hits: 0, kills: 0, heads: 0 };
      this.tally.set(id, t);
    }
    return t;
  }

  /** Slot indices, most recently held first (decides which spare guns show in the holsters). */
  private recency: number[] = [];

  /** Put every weapon except `held` (or all, during a swap) into the holsters; one per holster. */
  private holsterAll(held: number): void {
    const rig = this.player.rig;
    const used = new Set<string>();
    for (const j of this.recency) {
      const m = this.slots[j]!.model;
      if (j === held) continue;
      if (used.has(m.holsterSlot)) {
        m.setVisible(false);
        continue;
      }
      used.add(m.holsterSlot);
      m.holster(rig);
    }
  }

  private equip(i: number): void {
    this.recency = [i, ...this.recency.filter((j) => j !== i)];
    this.holsterAll(i);
    this.slots[i]!.model.hold(this.player.rig);
    this.index = i;
    const d = this.current.def;
    this.player.cam.adsZoom = this.current.stats.adsZoom;
    this.player.controller.speedMul = d.moveSpeedMult;
  }

  /** Spread half-angle in degrees right now (for the crosshair). */
  currentSpread(): number {
    const s = this.current;
    const moving = Math.min(1, this.player.controller.speed / 5);
    return spreadDeg(s.def, s.stats, this.player.cam.ads, moving, this.bloom) * this.spreadMul;
  }

  addAmmo(fraction: number): void {
    for (const s of this.slots) s.reserve = Math.min(s.def.reserve * 2, s.reserve + Math.ceil(s.def.reserve * fraction));
    this.grenades = Math.min(GRENADE.maxCarry, this.grenades + 1);
  }

  fixedUpdate(dt: number, inp: InputState): void {
    const s = this.current;
    this.player.reload = this.reloading ? this.reloadProgress : -1;
    this.player.reloadEmpty = this.reloadEmpty;
    this.player.swapT = this.swapT >= 0 ? this.swapT / SWAP_TIME : -1;
    this.player.grenadeT = this.grenadeT >= 0 ? this.grenadeT / GRENADE_TIME : -1;
    this.player.sinceShot = this.sinceShot;
    this.player.weaponWeight = s.def.weight ?? classWeight(s.def.class);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.grenadeCd = Math.max(0, this.grenadeCd - dt);
    this.sinceShot += dt;
    this.bloom = Math.max(0, this.bloom - s.def.spreadRecovery * dt);
    if (this.sinceShot > 0.35) this.shotIndex = 0;
    if (!this.player.alive) return;
    const ctl = this.player.controller;

    // swap (pressing again mid-swap keeps cycling)
    if ((inp.pressed('swapNext') || inp.pressed('swapPrev')) && this.slots.length > 1 && !this.throwing) {
      const d = inp.pressed('swapNext') ? 1 : -1;
      this.reloadT = -1;
      this.index = (this.index + d + this.slots.length) % this.slots.length;
      // a swap already past the holster point restarts from the draw; otherwise it keeps going
      if (this.swapT < 0 || this.swapEquipped) {
        this.swapT = 0;
        this.swapEquipped = false;
      }
      this.events.onSwap?.(this.current.def);
      return;
    }
    if (this.swapT >= 0) {
      this.swapT += dt;
      // half way: the outgoing gun reaches its holster and the next one comes out in the hand
      if (!this.swapEquipped && this.swapT >= SWAP_TIME * 0.45) {
        this.swapEquipped = true;
        this.equip(this.index);
      }
      if (this.swapT >= SWAP_TIME) this.swapT = -1;
    }
    // grenade: prep, pin, wind-up, release (thrown), recover
    if (this.grenadeT >= 0) {
      this.grenadeT += dt;
      if (!this.grenadeThrown && this.grenadeT >= GRENADE_TIME * GRENADE_RELEASE) {
        this.grenadeThrown = true;
        this.releaseGrenade();
      }
      if (this.grenadeT >= GRENADE_TIME) this.grenadeT = -1;
    }

    // reload
    if (this.reloadT >= 0) {
      this.reloadT -= dt;
      if (this.reloadT < 0) {
        const need = s.stats.magSize - s.mag;
        const take = this.infiniteAmmo ? need : Math.min(need, s.reserve);
        s.mag += take;
        if (!this.infiniteAmmo) s.reserve -= take;
      }
    } else if (inp.pressed('reload') && !this.throwing && !this.swapping && s.mag < s.stats.magSize && (s.reserve > 0 || this.infiniteAmmo)) {
      this.startReload();
    }

    // grenade
    if (inp.pressed('grenade') || inp.pressed('quick1')) this.throwGrenade();

    // fire
    if (inp.pressed('fire')) this.queuedT = 0.35;
    this.queuedT = Math.max(0, this.queuedT - dt);
    const wants = s.def.fireMode === 'auto' ? inp.down('fire') : this.queuedT > 0;
    if (!wants || this.swapping || this.reloading || this.throwing || ctl.weaponBlocked || this.cooldown > 0) return;
    // raise-to-fire: the trigger is live only once the weapon is up from its ready position
    if (!this.player.carry.canFire(this.player.carryIn)) return;
    this.queuedT = 0;
    if (s.mag <= 0) {
      if (inp.pressed('fire')) this.events.onDryFire?.(s.def);
      if (s.reserve > 0 || this.infiniteAmmo) this.startReload();
      return;
    }
    this.shoot();
  }

  /** Tactical reload (a round still chambered) or the longer empty reload (charging handle). */
  private startReload(): void {
    const s = this.current;
    this.reloadEmpty = s.mag <= 0;
    this.reloadTotal = s.stats.reloadTime * (this.reloadEmpty ? RELOAD_EMPTY_MULT : RELOAD_TACTICAL_MULT);
    this.reloadT = this.reloadTotal;
    this.events.onReload?.(s.def);
  }

  /** Start the throw; the grenade leaves the hand at the release point of the animation. */
  private throwGrenade(): void {
    if (this.grenades <= 0 || this.grenadeCd > 0 || this.throwing || this.swapping) return;
    this.grenades--;
    this.grenadeCd = GRENADE.cooldown;
    this.reloadT = -1;
    this.grenadeT = 0;
    this.grenadeThrown = false;
  }

  private releaseGrenade(): void {
    const cam = this.player.cam;
    const from = cam.pivot.add(new Vector3(0, 0.1, 0)).addInPlace(cam.forward.scale(0.5));
    const v = this.player.controller.cc.getVelocity();
    this.grenadeSys.throw(from, cam.forward.clone(), 'player', 'local', v);
    this.player.aimLockTimer = 0.4;
    this.events.onGrenade?.();
  }

  private shoot(): void {
    const s = this.current;
    const def = s.def;
    const cam = this.player.cam;
    s.mag--;
    this.cooldown = s.stats.fireInterval;
    this.sinceShot = 0;
    this.player.aimLockTimer = 0.7;
    this.player.kick = 1;
    this.tallyFor(def.id).shots++;

    // 1) where is the crosshair pointing? (ray starts level with the player, not behind the camera)
    cam.aimRay(this.tmpO, this.tmpD);
    const toPivot = cam.pivot.subtract(this.tmpO);
    const startAlong = Math.max(0, Vector3.Dot(toPivot, this.tmpD));
    const camStart = this.tmpO.add(this.tmpD.scale(startAlong));
    const aimEnd = camStart.add(this.tmpD.scale(def.range));
    const aimHit = this.ballistics.ray(camStart, aimEnd, MASK.PLAYER_SHOT);
    const aimPoint = aimHit.hit && aimHit.distance > 0.5 ? aimHit.point : aimEnd;

    // 2) fire from the muzzle towards the aim point (muzzle blocked by cover -> hits cover)
    s.model.muzzleWorld(this.muzzle);
    const shoulder = cam.pivot;
    const block = this.ballistics.ray(shoulder, this.muzzle, MASK.WORLD);
    const origin = block.hit ? shoulder : this.muzzle;
    const baseDir = aimPoint.subtract(origin).normalize();
    const spread = this.currentSpread();
    const dir = new Vector3();
    let firstEnd: Vector3 | null = null;
    for (let p = 0; p < def.pellets; p++) {
      const off = sampleSpread(spread, Math.random(), Math.random());
      spreadDir(baseDir, off.x, off.y, dir);
      if (def.kind === 'projectile') {
        this.ballistics.spawnProjectile(origin, dir.scale(def.projectileSpeed ?? 300), def.projectileGravity ?? 0, def.range / (def.projectileSpeed ?? 300) + 0.2,
          { team: 'player', id: 'local', collideWith: MASK.PLAYER_SHOT }, def.tracer,
          (h, d, travelled) => this.resolveHit(h, d, travelled, s));
        continue;
      }
      const end = origin.add(dir.scale(def.range));
      const h = this.ballistics.ray(origin, end, MASK.PLAYER_SHOT);
      this.lastShot = { origin: origin.clone(), aim: aimPoint.clone(), hit: h.point.clone(), target: h.target?.id ?? (h.prop ? 'prop' : h.hit ? 'world' : 'none') };
      this.resolveHit(h, dir.clone(), h.distance, s);
      if (!firstEnd || p % 3 === 0) {
        firstEnd = h.point;
        this.vfx.tracer(this.muzzle, h.point, def.tracer, def.pellets > 1 ? 0.012 : 0.022);
      }
    }
    // brass (not for the shotgun pump or sniper bolt mid-shot)
    if (def.class !== 'shotgun') this.vfx.casing(this.muzzle.subtract(baseDir.scale(0.3)), new Vector3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)));
    // muzzle flash, recoil, bloom
    this.vfx.muzzleFlash(this.muzzle, def.pellets > 1 ? 0.3 : def.class === 'pistol' ? 0.16 : 0.22);
    const k = recoilKick(def, s.stats, this.shotIndex++);
    const adsDamp = 1 - cam.ads * 0.35;
    cam.kick(k.pitch * DEG * adsDamp, k.yaw * DEG * adsDamp);
    cam.shake(def.class === 'sniper' ? 0.25 : def.class === 'shotgun' ? 0.2 : 0.04);
    this.bloom += def.spreadPerShot;
    this.rumble(def.class === 'shotgun' || def.class === 'sniper' ? 0.7 : 0.25, 0.4, def.class === 'smg' ? 40 : 70);
    this.events.onShot?.(def);
  }

  private resolveHit(h: RayHit, dir: Vector3, travelled: number, s: WeaponSlot): void {
    if (!h.hit) return;
    this.ballistics.impactFx(h, dir);
    const head = h.part === 'head';
    const dmg = damageAt(s.def, s.stats, travelled, head);
    if (h.target && h.target.team !== 'player') {
      const res = h.target.applyDamage({
        amount: dmg,
        point: h.point,
        dir,
        part: h.part ?? 'body',
        kind: 'bullet',
        attackerTeam: 'player',
        attackerId: 'local',
        weapon: s.def.id,
        sourcePos: this.player.cam.pivot.clone(),
        impulse: s.def.impulse,
      });
      const t = this.tallyFor(s.def.id);
      t.hits++;
      if (head) t.heads++;
      if (res.killed) t.kills++;
      this.events.onHit?.(res.killed ? 'kill' : head ? 'head' : 'hit', s.def.id, res.dealt);
    } else if (h.prop) {
      this.world.props.impulse(h.prop, dir.scale(s.def.impulse), h.point);
      this.world.props.damage(h.prop, dmg);
    }
  }

  dispose(): void {
    for (const s of this.slots) s.model.dispose();
  }
}
