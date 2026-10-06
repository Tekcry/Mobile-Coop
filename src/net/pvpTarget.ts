import { Vector3, type Scene } from '../core/babylon';
import { Hitboxes } from '../ai/hitboxes';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { RemoteAvatar } from './remoteAvatar';

/**
 * PvP on a client: an opponent's avatar gets head / body hit volumes so the local player's shots resolve at once
 * (hit marker, flash); the hit is sent to the host, which rewinds the target and decides the damage.
 */
export class PvpTarget implements Damageable {
  readonly team = 'enemy' as const;
  private boxes: Hitboxes;
  private head = new Vector3();
  onShot: ((h: HitInfo) => void) | null = null;

  constructor(
    scene: Scene,
    private registry: DamageRegistry,
    readonly id: string,
    private avatar: RemoteAvatar,
  ) {
    this.boxes = new Hitboxes(scene, registry, this, 1, 'average');
  }

  get alive(): boolean {
    return !this.avatar.dead;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.avatar.pos).addInPlaceFromFloats(0, 1, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.avatar.pos).addInPlaceFromFloats(0, 1.3, 0);
  }

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || h.attackerId !== 'local' || h.kind !== 'bullet') return { dealt: 0, killed: false };
    this.onShot?.(h);
    return { dealt: h.amount * (h.part === 'head' ? 1.3 : 1), killed: false };
  }

  /** Per render frame, after the avatar is posed. */
  sync(): void {
    if (!this.alive) {
      this.boxes.setEnabled(false);
      return;
    }
    this.boxes.setEnabled(true);
    this.avatar.rig.headNode.computeWorldMatrix(true);
    this.head.copyFrom(this.avatar.rig.headNode.getAbsolutePosition());
    this.boxes.sync(this.avatar.pos, this.head);
  }

  dispose(): void {
    this.boxes.dispose();
    this.registry.removeTarget(this);
  }
}
