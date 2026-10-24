import { Vector3, type Scene } from '../core/babylon';
import { Hitboxes } from '../ai/hitboxes';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, playerBody } from '../player/playerVolumes';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { RemoteAvatar } from './remoteAvatar';

/**
 * Course friendly fire (D38) on a client: the partner's avatar gets head / body hit volumes so the local player's shots
 * resolve at once (hit marker, flash); the hit is sent to the host, which decides the damage. (rig-pose-fix S1, G11) The
 * volumes follow the sim body model (`playerBody`) of the partner as drawn (its interpolated position, MoveState and
 * stance), not the drawn rig's pose: the same head / body split the host's `partnerBoxes` judge.
 */
export class PartnerTarget implements Damageable {
  readonly team = 'enemy' as const;
  private boxes: Hitboxes;
  private head = new Vector3();
  private hips = new Vector3();
  private readonly bodyIn = emptyPlayerBodyIn();
  private readonly body = emptyPlayerBodyOut();
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

  /** Solid to the local player's body or not (a co-op partner blocks through its `PartnerBlocker` instead, D49). */
  setSolid(on: boolean): void {
    this.boxes.setSolid(on);
  }

  /** Per render frame, after the avatar is posed. */
  sync(): void {
    if (!this.alive) {
      this.boxes.setEnabled(false);
      return;
    }
    this.boxes.setEnabled(true);
    const b = playerBody(this.avatar.bodyIn(this.bodyIn), this.body);
    this.head.set(b.head.x, b.head.y, b.head.z);
    this.hips.set(b.pelvis.x, b.pelvis.y, b.pelvis.z);
    this.boxes.sync(this.avatar.pos, this.head, this.hips);
  }

  dispose(): void {
    this.boxes.dispose();
    this.registry.removeTarget(this);
  }
}
