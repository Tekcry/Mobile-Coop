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
import type { NavGrid, P2 } from './navGrid';
import type { CoverPoint } from '../world/levelBuilder';
import { DIFFICULTY, type Difficulty, type EnemyDef } from './enemyDefs';
import { G, MASK } from '../physics/groups';
import { spreadDir } from '../weapons/ballistics';
import { sampleSpread } from '../weapons/weaponStats';
import { turnTowards, wrapAngle } from '../player/playerController';

export type EnemyState = 'idle' | 'chase' | 'attack' | 'seekCover' | 'inCover' | 'melee' | 'dead';

/** What enemies can target (local or remote players). */
export interface PlayerRef {
  id: string;
  target: Damageable;
  feet: Vector3;
  speed: number;
  crouched: boolean;
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
  reserveCover(e: Enemy, idx: number): boolean;
  releaseCover(e: Enemy): void;
  onKilled(e: Enemy, h: HitInfo): void;
  onShot?(e: Enemy, from: Vector3, to: Vector3): void;
  onMelee?(e: Enemy): void;
  onWindup?(e: Enemy): void;
  canRagdoll(): boolean;
  addRagdoll(e: Enemy, rig: CharacterRig, impulse: Vector3): void;
}

let nextId = 1;
const rand = (a: number, b: number): number => a + Math.random() * (b - a);

export class Enemy implements Damageable {
  readonly id = `e${nextId++}`;
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
  private target: PlayerRef | null = null;
  private los = false;
  private losT = 0;
  private dist = 99;
  private thinkT = Math.random() * 0.25;
  private path: P2[] = [];
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
  private desired = new Vector3();
  private lunge = 0;
  private coverPicked = false;
  private flash = 0;
  alerted = false;

  constructor(
    private ctx: AiContext,
    readonly def: EnemyDef,
    spawn: Vector3,
    yaw = 0,
  ) {
    const d = DIFFICULTY[ctx.difficulty];
    this.health = new Health(def.hp * d.hp);
    this.pos = spawn.clone();
    this.pos.y = ctx.nav.heightAt(spawn.x, spawn.z);
    this.yaw = yaw;
    const built = buildEnemyRig(ctx.scene, ctx.world, def, this.id);
    this.rig = built.rig;
    this.gun = built.gun;
    this.hitboxes = new Hitboxes(ctx.scene, ctx.registry, this, def.scale, def.build);
    this.syncVisual(0);
  }

  get alive(): boolean {
    return this.health.alive;
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

  private setState(s: EnemyState): void {
    if (this.state === s) return;
    if (this.state === 'inCover' || this.state === 'seekCover') {
      if (s !== 'inCover') this.ctx.releaseCover(this);
    }
    this.state = s;
    this.stateT = 0;
    this.wantCrouch = false;
    this.coverPicked = false;
  }

  alert(): void {
    if (this.alerted || !this.alive) return;
    this.alerted = true;
    if (this.state === 'idle') this.setState('chase');
  }

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || h.attackerTeam === 'enemy') return { dealt: 0, killed: false };
    const mult = h.part === 'head' ? this.def.headMult : this.def.armor;
    const dealt = this.health.damage(h.amount * mult);
    this.flash = 1;
    this.alert();
    if (dealt > 35) this.stagger = 0.35;
    // getting shot in the open pushes cover users to find cover
    if (this.def.usesCover && this.state === 'attack' && Math.random() < 0.5) this.setState('seekCover');
    if (!this.health.alive) this.die(h);
    return { dealt, killed: !this.health.alive };
  }

  private die(h: HitInfo): void {
    this.setState('dead');
    this.hitboxes.dispose();
    this.ctx.registry.removeTarget(this);
    this.rig.heldWeapon = null;
    const imp = h.dir.scale(Math.min(80, 8 + h.impulse * 3) * (h.kind === 'explosion' ? 2.5 : 1));
    imp.y += h.kind === 'explosion' ? 25 : 3;
    if (this.ctx.canRagdoll()) {
      this.ctx.addRagdoll(this, this.rig, imp);
    } else {
      this.rig.dispose();
    }
    this.ctx.onKilled(this, h);
  }

  /** Fixed-step brain + movement. */
  update(dt: number): void {
    if (!this.alive) return;
    this.stateT += dt;
    this.fireT = Math.max(0, this.fireT - dt);
    this.meleeCd = Math.max(0, this.meleeCd - dt);
    this.stagger = Math.max(0, this.stagger - dt);
    this.strafeT -= dt;
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.22 + Math.random() * 0.08;
      this.perceive();
    }
    if (this.los) this.losT += dt;
    else this.losT = 0;

    const goal = this.decide(dt);
    this.move(dt, goal.point, goal.speed, goal.face);
    this.crouch += ((this.wantCrouch ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    this.syncVisual(dt);
  }

  private perceive(): void {
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
      return;
    }
    const eye = this.eye(this.tmpEye);
    best.target.aimPoint(this.tmp);
    const h = this.ctx.ballistics.ray(eye, this.tmp, G.STATIC);
    this.los = !h.hit || h.distance > Vector3.Distance(eye, this.tmp) - 0.3;
    if (!this.alerted) {
      // idle enemies notice within a forward cone or when very close
      const toward = Math.atan2(best.feet.x - this.pos.x, best.feet.z - this.pos.z);
      const inCone = Math.abs(wrapAngle(toward - this.yaw)) < 1.1;
      if ((this.los && inCone && bd < 30) || bd < 6) this.alert();
    }
  }

  private decide(dt: number): { point: P2 | null; speed: number; face: number | null } {
    const def = this.def;
    const t = this.target;
    if (!this.alerted || !t) return { point: null, speed: 0, face: null };
    if (this.stagger > 0) return { point: null, speed: 0, face: this.faceTarget() };
    const toTarget = this.faceTarget();
    const tp: P2 = [t.feet.x, t.feet.z];

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
      return { point: this.chasePoint(tp, true), speed, face: null };
    }

    // ---- ranged ----
    switch (this.state) {
      case 'idle':
      case 'chase': {
        if (this.los && this.dist <= def.engageMax) {
          this.setState(def.usesCover && Math.random() < 0.6 ? 'seekCover' : 'attack');
          return { point: null, speed: 0, face: toTarget };
        }
        return { point: this.chasePoint(tp, false), speed: def.runSpeed, face: null };
      }
      case 'attack': {
        this.tryFire(dt);
        if (!this.los && this.stateT > 1.2) {
          this.setState('chase');
        } else if (this.dist > def.engageMax + 3) {
          this.setState('chase');
        } else if (def.usesCover && this.stateT > rand(5, 9)) {
          this.setState('seekCover');
        }
        // strafe / keep range
        if (this.strafeT <= 0) {
          this.strafeT = rand(1.2, 2.6);
          this.strafe = Math.random() < 0.5 ? 1 : -1;
        }
        const away = this.dist < def.engageMin ? -1 : 0;
        const dx = t.feet.x - this.pos.x;
        const dz = t.feet.z - this.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        const sx = (-dz / len) * this.strafe + (dx / len) * away;
        const sz = (dx / len) * this.strafe + (dz / len) * away;
        return { point: [this.pos.x + sx * 2, this.pos.z + sz * 2], speed: def.walkSpeed * (this.windup > 0 || this.burstLeft > 0 ? 0.4 : 0.8), face: toTarget };
      }
      case 'seekCover': {
        if (!this.coverPicked) {
          this.coverPicked = true;
          if (!this.pickCover()) {
            this.setState('attack');
            return { point: null, speed: 0, face: toTarget };
          }
        }
        if (this.stateT > 6) this.setState('attack');
        if (this.los && this.stateT > 0.5) this.tryFire(dt);
        const wp = this.path[0];
        if (!wp) {
          this.setState('inCover');
          return { point: null, speed: 0, face: toTarget };
        }
        if (Math.hypot(wp[0] - this.pos.x, wp[1] - this.pos.z) < 0.35) this.path.shift();
        return { point: wp, speed: def.runSpeed, face: null };
      }
      case 'inCover': {
        const cp = this.ctx.cover[this.coverIdx];
        if (!cp) {
          this.setState('attack');
          return { point: null, speed: 0, face: toTarget };
        }
        // flanked? leave
        const dirX = t.feet.x - cp.pos.x;
        const dirZ = t.feet.z - cp.pos.z;
        const l = Math.hypot(dirX, dirZ) || 1;
        const protects = (cp.normal.x * dirX + cp.normal.z * dirZ) / l;
        if (protects < 0.2 || this.peekCycles >= 3 || this.dist < def.engageMin * 0.7) {
          this.peekCycles = 0;
          this.setState('attack');
          return { point: null, speed: 0, face: toTarget };
        }
        // hide / peek cycle
        const cycle = this.stateT % 3.6;
        const peeking = cycle > 2.0;
        this.wantCrouch = cp.low ? !peeking : false;
        if (peeking) {
          this.tryFire(dt);
          if (cycle > 3.55) this.peekCycles++;
        }
        // high cover: step out sideways to peek
        let pt: P2 = [cp.pos.x, cp.pos.z];
        if (!cp.low && peeking) {
          const side = this.strafe;
          pt = [cp.pos.x - cp.normal.z * 0.9 * side, cp.pos.z + cp.normal.x * 0.9 * side];
        }
        return { point: pt, speed: def.walkSpeed, face: toTarget };
      }
      default:
        return { point: null, speed: 0, face: null };
    }
  }

  private faceTarget(): number {
    const t = this.target;
    if (!t) return this.yaw;
    return Math.atan2(t.feet.x - this.pos.x, t.feet.z - this.pos.z);
  }

  /** Direct line if clear, else follow the shared flow field. Runners zigzag. */
  private chasePoint(tp: P2, zig: boolean): P2 | null {
    const nav = this.ctx.nav;
    const me: P2 = [this.pos.x, this.pos.z];
    let p: P2 | null;
    if (this.dist < 18 && nav.lineClear(me, tp)) p = tp;
    else p = nav.flowNext(this.ctx.flow(), me[0], me[1]);
    if (p && zig && this.dist > 5) {
      const dx = p[0] - me[0];
      const dz = p[1] - me[1];
      const l = Math.hypot(dx, dz) || 1;
      const s = Math.sin(this.stateT * 4 + this.pos.x) * 0.6;
      const cand: P2 = [p[0] + (-dz / l) * s, p[1] + (dx / l) * s];
      if (nav.lineClear(me, cand)) p = cand;
    }
    return p;
  }

  private pickCover(): boolean {
    const t = this.target;
    if (!t) return false;
    const cover = this.ctx.cover;
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < cover.length; i++) {
      const c = cover[i]!;
      const dMe = Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
      if (dMe > 14) continue;
      const dx = t.feet.x - c.pos.x;
      const dz = t.feet.z - c.pos.z;
      const dT = Math.hypot(dx, dz);
      if (dT < this.def.engageMin || dT > this.def.engageMax) continue;
      if ((c.normal.x * dx + c.normal.z * dz) / dT < 0.55) continue;
      if (!this.ctx.nav.isWalkable(this.ctx.nav.cellOf(c.pos.x, c.pos.z))) continue;
      const score = dMe + Math.abs(dT - 14) * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0 || !this.ctx.reserveCover(this, best)) return false;
    const c = cover[best]!;
    const path = this.ctx.nav.findPath([this.pos.x, this.pos.z], [c.pos.x, c.pos.z], 3000);
    if (!path) {
      this.ctx.releaseCover(this);
      return false;
    }
    this.coverIdx = best;
    this.path = path;
    return true;
  }

  private tryFire(dt: number): void {
    const w = this.def.weapon;
    const t = this.target;
    if (!w || !t || !this.los || this.dist > w.range) {
      this.windup = 0;
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
      this.burstLeft = Math.round(rand(w.burstMin, w.burstMax));
    }
    if (this.fireT > 0) return;
    this.fireT = 60 / w.rpm;
    this.burstLeft--;
    if (this.burstLeft <= 0) {
      this.pauseT = rand(w.pauseMin, w.pauseMax);
      this.windup = 0;
    }
    this.shoot(t, w);
  }

  private shoot(t: PlayerRef, w: NonNullable<EnemyDef['weapon']>): void {
    const d = DIFFICULTY[this.ctx.difficulty];
    const origin = this.eye(new Vector3());
    origin.y -= 0.2 * this.def.scale;
    origin.x += Math.sin(this.yaw) * 0.45 + Math.cos(this.yaw) * 0.18;
    origin.z += Math.cos(this.yaw) * 0.45 - Math.sin(this.yaw) * 0.18;
    const aim = t.target.aimPoint(new Vector3());
    const dir = aim.subtract(origin).normalize();
    // accuracy: settles in over the first second of sight, worse against moving/rolling targets
    const settle = Math.min(1, 0.45 + this.losT * 0.55);
    const moving = Math.min(1, t.speed / 5);
    const spread = (w.spreadDeg * (1 + moving * 0.8) * (t.crouched ? 0.9 : 1)) / (d.accuracy * settle);
    const off = sampleSpread(spread, Math.random(), Math.random());
    spreadDir(dir, off.x, off.y, dir);
    const end = origin.add(dir.scale(w.range));
    const h = this.ctx.ballistics.ray(origin, end, MASK.ENEMY_SHOT);
    this.ctx.vfx.tracer(origin, h.point, w.tracer, 0.02);
    this.ctx.vfx.muzzleFlash(origin, this.def.kind === 'heavy' ? 0.3 : 0.2);
    this.kick = 1;
    this.ctx.onShot?.(this, origin, h.point);
    if (!h.hit) return;
    this.ctx.ballistics.impactFx(h, dir);
    if (h.target && h.target.team === 'player') {
      h.target.applyDamage({
        amount: w.damage * d.damage,
        point: h.point,
        dir,
        part: 'body',
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

  private move(dt: number, goal: P2 | null, speed: number, face: number | null): void {
    const nav = this.ctx.nav;
    const desired = this.desired.setAll(0);
    if (goal) {
      desired.set(goal[0] - this.pos.x, 0, goal[1] - this.pos.z);
      const l = desired.length();
      if (l > 0.05) desired.scaleInPlace(Math.min(speed, l / dt) / l);
      else desired.setAll(0);
    }
    // separation from other enemies and players
    for (const o of this.ctx.enemies()) {
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
    for (const p of this.ctx.players()) {
      const dx = this.pos.x - p.feet.x;
      const dz = this.pos.z - p.feet.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.9 && d > 1e-3) {
        desired.x += (dx / d) * (0.9 - d) * 4;
        desired.z += (dz / d) * (0.9 - d) * 4;
      }
    }
    this.vel.x += (desired.x - this.vel.x) * Math.min(1, dt * 10);
    this.vel.z += (desired.z - this.vel.z) * Math.min(1, dt * 10);
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    const cur = nav.cellOf(this.pos.x, this.pos.z);
    const tryMove = (x: number, z: number): boolean => {
      const c = nav.cellOf(x, z);
      if (c === cur || (c >= 0 && nav.canStep(cur < 0 ? c : cur, c)) || !nav.isWalkable(cur)) {
        if (c >= 0 && nav.isWalkable(c)) {
          this.pos.x = x;
          this.pos.z = z;
          return true;
        }
      }
      return false;
    };
    if (!tryMove(nx, nz)) {
      // slide along an axis
      if (!tryMove(nx, this.pos.z)) {
        this.vel.x = 0;
        if (!tryMove(this.pos.x, nz)) this.vel.z = 0;
      } else {
        this.vel.z = 0;
      }
    }
    const gh = nav.heightAt(this.pos.x, this.pos.z);
    this.pos.y += (gh - this.pos.y) * Math.min(1, dt * 12);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const targetYaw = face ?? (sp > 0.3 ? Math.atan2(this.vel.x, this.vel.z) : this.yaw);
    this.yaw = turnTowards(this.yaw, targetYaw, this.def.turnSpeed * dt);
    if (this.target) {
      this.target.target.aimPoint(this.tmp);
      const dy = this.tmp.y - (this.pos.y + 1.4 * this.def.scale);
      this.aimPitch = Math.atan2(dy, Math.max(0.5, this.dist));
    }
  }

  private syncVisual(dt: number): void {
    const r = this.rig.root;
    r.position.copyFrom(this.pos);
    r.rotation.y = this.yaw;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const inv = sp > 0.01 ? 1 / sp : 0;
    this.kick = Math.max(0, this.kick - dt * 8);
    this.flash = Math.max(0, this.flash - dt * 9);
    this.rig.setFlash(this.flash * 0.75);
    const aiming = this.def.melee ? 0 : this.state === 'attack' || this.state === 'inCover' || this.burstLeft > 0 || this.windup > 0 ? 1 : 0.2;
    this.rig.animate(dt, {
      speed: sp,
      localX: (this.vel.x * c - this.vel.z * s) * inv,
      localZ: (this.vel.x * s + this.vel.z * c) * inv,
      grounded: true,
      crouch: this.crouch,
      roll: -1,
      aimPitch: this.aimPitch,
      aim: aiming,
      kick: this.def.melee ? 0 : this.kick,
      melee: this.def.melee && this.kick > 0 ? 1 - this.kick : -1,
      sprint: !this.def.melee && sp > this.def.runSpeed * 0.8 && aiming < 0.5,
    });
    this.rig.headNode.computeWorldMatrix(true);
    this.head.copyFrom(this.rig.headNode.getAbsolutePosition());
    this.hitboxes.sync(this.pos, this.head);
  }

  dispose(): void {
    if (this.alive) {
      this.hitboxes.dispose();
      this.ctx.registry.removeTarget(this);
      this.gun?.dispose();
      this.rig.dispose();
    }
    this.ctx.releaseCover(this);
  }
}
