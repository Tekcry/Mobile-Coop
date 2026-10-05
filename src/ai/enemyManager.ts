import { Vector3, type Scene } from '../core/babylon';
import type { World } from '../world/world';
import type { DamageRegistry, HitInfo } from '../game/damage';
import type { Ballistics } from '../weapons/ballistics';
import type { Vfx } from '../vfx/vfx';
import type { NavGrid } from './navGrid';
import { Enemy, type AiContext, type PlayerRef } from './enemy';
import { ENEMIES, type Difficulty, type EnemyKind } from './enemyDefs';
import { Ragdoll } from './ragdoll';
import { BUDGET } from '../physics/groups';
import type { CharacterRig } from '../player/characterRig';

export const MAX_ALIVE = 10;

/** Owns enemies, the shared chase flow field, cover reservations and ragdolls. */
export class EnemyManager {
  readonly enemies: Enemy[] = [];
  private ragdolls: Ragdoll[] = [];
  private flowField: Float32Array;
  private flowT = 0;
  private coverOwner = new Map<number, Enemy>();
  private ctx: AiContext;
  onKilled: ((e: Enemy, h: HitInfo) => void) | null = null;
  /** Audio hooks. */
  onEnemyShot: ((e: Enemy, from: Vector3, to: Vector3) => void) | null = null;
  onEnemyMelee: ((e: Enemy) => void) | null = null;
  onEnemyWindup: ((e: Enemy) => void) | null = null;
  kills = 0;

  constructor(
    scene: Scene,
    world: World,
    readonly nav: NavGrid,
    registry: DamageRegistry,
    ballistics: Ballistics,
    vfx: Vfx,
    public difficulty: Difficulty,
    private players: () => readonly PlayerRef[],
  ) {
    this.flowField = new Float32Array(nav.walk.length);
    this.ctx = {
      scene,
      world,
      nav,
      registry,
      ballistics,
      vfx,
      difficulty,
      players,
      flow: () => this.flowField,
      enemies: () => this.enemies,
      cover: world.level.cover,
      reserveCover: (e, idx) => {
        const o = this.coverOwner.get(idx);
        if (o && o !== e && o.alive) return false;
        this.releaseCover(e);
        this.coverOwner.set(idx, e);
        return true;
      },
      releaseCover: (e) => this.releaseCover(e),
      onKilled: (e, h) => {
        this.kills++;
        this.releaseCover(e);
        this.onKilled?.(e, h);
      },
      onShot: (e, a, b) => this.onEnemyShot?.(e, a, b),
      onMelee: (e) => this.onEnemyMelee?.(e),
      onWindup: (e) => this.onEnemyWindup?.(e),
      canRagdoll: () => this.ragdolls.filter((r) => !r.done).length < BUDGET.maxRagdolls,
      addRagdoll: (_e, rig: CharacterRig, imp: Vector3) => this.ragdolls.push(new Ragdoll(scene, rig, imp)),
    };
    this.refreshFlow();
  }

  private releaseCover(e: Enemy): void {
    for (const [k, v] of this.coverOwner) if (v === e) this.coverOwner.delete(k);
    e.coverIdx = -1;
  }

  get alive(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  spawn(kind: EnemyKind, pos: Vector3, alerted = true, yaw = 0): Enemy | null {
    if (this.alive >= MAX_ALIVE) return null;
    const c = this.nav.nearestWalkable(pos.x, pos.z, 8);
    if (c < 0) return null;
    const [x, z] = this.nav.center(c);
    const e = new Enemy(this.ctx, ENEMIES[kind], new Vector3(x, 0, z), yaw);
    if (alerted) e.alert();
    this.enemies.push(e);
    return e;
  }

  /** Alert enemies within radius (gunfire noise). */
  noise(pos: Vector3, radius: number): void {
    for (const e of this.enemies) if (e.alive && Vector3.Distance(e.pos, pos) < radius) e.alert();
  }

  private refreshFlow(): void {
    const goals = this.players()
      .filter((p) => p.target.alive)
      .map((p) => [p.feet.x, p.feet.z] as [number, number]);
    if (goals.length) this.nav.flowField(goals, this.flowField);
  }

  update(dt: number): void {
    this.flowT -= dt;
    if (this.flowT <= 0) {
      this.flowT = 0.5;
      this.refreshFlow();
    }
    for (const e of this.enemies) e.update(dt);
    for (const r of this.ragdolls) r.update(dt);
    // drop dead entries
    for (let i = this.enemies.length - 1; i >= 0; i--) if (!this.enemies[i]!.alive) this.enemies.splice(i, 1);
    for (let i = this.ragdolls.length - 1; i >= 0; i--) if (this.ragdolls[i]!.done) this.ragdolls.splice(i, 1);
  }

  clear(): void {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    for (const r of this.ragdolls) r.dispose();
    this.ragdolls.length = 0;
    this.coverOwner.clear();
  }
}
