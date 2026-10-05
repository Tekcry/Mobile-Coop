import { Vector3 } from '../core/babylon';
import type { DamageRegistry, Team } from '../game/damage';
import type { PropSystem } from '../world/props';
import { PROP_DEFS } from '../world/props';
import type { Vfx } from '../vfx/vfx';
import type { Ballistics } from './ballistics';
import { G } from '../physics/groups';

interface Pending {
  pos: Vector3;
  radius: number;
  damage: number;
  force: number;
  team: Team;
  attackerId: string;
}

/** Radial damage with line-of-sight, prop blasts, and chained explosive barrels (queued, never recursive). */
export class Explosions {
  private queue: Pending[] = [];
  /** Hook for camera shake / audio. Receives centre and radius. */
  onExplode: ((pos: Vector3, radius: number) => void) | null = null;
  /** Local player's own grenade detonated (coop clients forward it to the host). */
  onLocalBlast: ((pos: Vector3) => void) | null = null;

  constructor(
    private registry: DamageRegistry,
    private props: PropSystem,
    private vfx: Vfx,
    private ballistics: Ballistics,
  ) {
    props.onDestroyed = (p) => {
      const ex = PROP_DEFS[p.kind].explosive;
      if (ex) this.queue.push({ pos: p.node.position.clone(), radius: ex.radius, damage: ex.damage, force: ex.force, team: 'neutral', attackerId: '' });
    };
  }

  explode(pos: Vector3, radius: number, damage: number, force: number, team: Team, attackerId: string): void {
    this.queue.push({ pos: pos.clone(), radius, damage, force, team, attackerId });
    if (team === 'player' && attackerId === 'local') this.onLocalBlast?.(pos);
  }

  /** Process queued explosions (call once per fixed step). */
  update(): void {
    let guard = 8;
    while (this.queue.length && guard-- > 0) {
      const e = this.queue.shift()!;
      this.detonate(e);
    }
  }

  private detonate(e: Pending): void {
    this.vfx.explosion(e.pos, e.radius * 0.5);
    this.onExplode?.(e.pos, e.radius);
    this.props.blast(e.pos, e.radius, e.force);
    const c = new Vector3();
    for (const t of this.registry.targets) {
      if (!t.alive) continue;
      t.center(c);
      const d = Vector3.Distance(c, e.pos);
      if (d > e.radius) continue;
      // Line of sight against level geometry only.
      const los = this.ballistics.ray(e.pos.add(new Vector3(0, 0.25, 0)), c, G.STATIC);
      if (los.hit && los.distance < d - 0.3) continue;
      const falloff = Math.pow(1 - d / e.radius, 0.7);
      const dir = c.subtract(e.pos).normalize();
      t.applyDamage({
        amount: e.damage * falloff,
        point: c.clone(),
        dir,
        part: 'body',
        kind: 'explosion',
        attackerTeam: e.team,
        attackerId: e.attackerId,
        sourcePos: e.pos,
        impulse: e.force * falloff,
      });
    }
    // damage nearby explosive props (chain reaction)
    for (const p of this.props.props) {
      if (!p.alive || p.hp >= 9999) continue;
      const d = Vector3.Distance(p.node.position, e.pos);
      if (d < e.radius * 0.8) this.props.damage(p, e.damage * (1 - d / e.radius));
    }
  }
}
