import { TransformNode, Vector3, type AbstractMesh, type Scene } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';

export type PickupKind = 'ammo' | 'health';

interface Pickup {
  kind: PickupKind;
  node: TransformNode;
  parts: AbstractMesh[];
  active: boolean;
  respawnT: number;
  base: Vector3;
}

/** Walk-over supply crates. Respawn after a delay (or on demand between waves). */
export class Pickups {
  private items: Pickup[] = [];
  private t = 0;
  respawnDelay = 30;
  onPickup: ((kind: PickupKind, who: string) => void) | null = null;

  constructor(
    scene: Scene,
    parts: PartLibrary,
    spots: readonly { pos: Vector3; kind: PickupKind }[],
  ) {
    for (const s of spots) {
      const node = new TransformNode(`pickup-${s.kind}`, scene);
      node.position.copyFrom(s.pos);
      const ps: AbstractMesh[] = [];
      const add = (shape: 'box' | 'cyl', hex: string, sc: [number, number, number], p: [number, number, number]): void => {
        const m = parts.instance(shape, hex, 'pickup-part');
        m.parent = node;
        m.scaling.set(...sc);
        m.position.set(...p);
        ps.push(m);
      };
      if (s.kind === 'health') {
        add('box', '#f1f1ef', [0.5, 0.32, 0.36], [0, 0.16, 0]);
        add('box', '#d9363e', [0.36, 0.1, 0.38], [0, 0.18, 0]);
        add('box', '#d9363e', [0.1, 0.1, 0.38], [0, 0.18, 0]);
        add('box', '#d9363e', [0.1, 0.34, 0.37], [0, 0.17, 0]);
      } else {
        add('box', '#4b5a3a', [0.6, 0.3, 0.38], [0, 0.15, 0]);
        add('box', '#f2c230', [0.62, 0.06, 0.4], [0, 0.22, 0]);
      }
      this.items.push({ kind: s.kind, node, parts: ps, active: true, respawnT: 0, base: s.pos.clone() });
    }
  }

  /** Returns kinds collected by a player at `feet`. */
  update(dt: number, players: readonly { id: string; feet: Vector3; needs: (k: PickupKind) => boolean }[]): void {
    this.t += dt;
    for (const it of this.items) {
      if (!it.active) {
        it.respawnT -= dt;
        if (it.respawnT <= 0) this.activate(it, true);
        continue;
      }
      it.node.position.y = it.base.y + 0.1 + Math.sin(this.t * 2 + it.base.x) * 0.06;
      it.node.rotation.y += dt * 1.2;
      for (const p of players) {
        if (Vector3.DistanceSquared(p.feet, it.base) < 1.4 * 1.4 && Math.abs(p.feet.y - it.base.y) < 1.2 && p.needs(it.kind)) {
          this.activate(it, false);
          it.respawnT = this.respawnDelay;
          this.onPickup?.(it.kind, p.id);
          break;
        }
      }
    }
  }

  private activate(it: Pickup, on: boolean): void {
    it.active = on;
    it.node.setEnabled(on);
  }

  /** Bit i set = pickup i available (coop snapshots). */
  get mask(): number {
    let m = 0;
    this.items.forEach((it, i) => {
      if (it.active && i < 30) m |= 1 << i;
    });
    return m;
  }

  /** Mirror the host's availability (coop client); animates but never collects. */
  setMask(m: number): void {
    this.items.forEach((it, i) => {
      if (i < 30) {
        const on = (m & (1 << i)) !== 0;
        if (on !== it.active) this.activate(it, on);
        it.respawnT = 1e9;
      }
    });
  }

  respawnAll(): void {
    for (const it of this.items) this.activate(it, true);
  }

  blips(): { x: number; z: number; kind: 'pickup' }[] {
    return this.items.filter((i) => i.active).map((i) => ({ x: i.base.x, z: i.base.z, kind: 'pickup' as const }));
  }

  dispose(): void {
    for (const it of this.items) {
      for (const p of it.parts) p.dispose();
      it.node.dispose();
    }
  }
}
