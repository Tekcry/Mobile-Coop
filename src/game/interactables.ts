import { TransformNode, Vector3, type AbstractMesh, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';

export type InteractKind = 'terminal' | 'cache' | 'extract';

export interface Interactable {
  id: string;
  kind: InteractKind;
  pos: Vector3;
  label: string;
  /** Seconds the interact button must be held (0 = tap). */
  holdTime: number;
  enabled: boolean;
  done: boolean;
  progress: number;
  node: TransformNode;
  parts: AbstractMesh[];
  light: InstancedMesh | null;
}

/** Objective props: hackable terminals, intel cache, extraction beacon. Proximity + hold-to-use. */
export class Interactables {
  readonly items: Interactable[] = [];
  private t = 0;

  constructor(
    private scene: Scene,
    private parts: PartLibrary,
  ) {}

  add(id: string, kind: InteractKind, pos: Vector3, label: string, holdTime: number): Interactable {
    const node = new TransformNode(`int-${id}`, this.scene);
    node.position.copyFrom(pos);
    const ps: AbstractMesh[] = [];
    const add = (shape: 'box' | 'cyl', hex: string, sc: [number, number, number], p: [number, number, number]): InstancedMesh => {
      const m = this.parts.instance(shape, hex, 'int-part');
      m.parent = node;
      m.scaling.set(...sc);
      m.position.set(...p);
      ps.push(m);
      return m;
    };
    let light: InstancedMesh | null = null;
    if (kind === 'terminal') {
      add('box', '#3a4048', [0.7, 1.1, 0.45], [0, 0.55, 0]);
      add('box', '#1c1f24', [0.6, 0.4, 0.05], [0, 0.95, 0.24]);
      light = add('box', '#3fc1ff', [0.5, 0.3, 0.02], [0, 0.95, 0.27]);
    } else if (kind === 'cache') {
      add('box', '#59636b', [0.9, 0.5, 0.6], [0, 0.25, 0]);
      light = add('box', '#ffd23f', [0.92, 0.08, 0.62], [0, 0.45, 0]);
    } else {
      add('cyl', '#3a4048', [2.6, 0.08, 2.6], [0, 0.04, 0]);
      light = add('cyl', '#4fdc7c', [0.12, 3.2, 0.12], [0, 1.6, 0]);
    }
    const it: Interactable = { id, kind, pos: pos.clone(), label, holdTime, enabled: false, done: false, progress: 0, node, parts: ps, light };
    this.items.push(it);
    this.setEnabled(it, false);
    return it;
  }

  setEnabled(it: Interactable, on: boolean): void {
    it.enabled = on;
    if (it.light) this.parts.setColor(it.light, on ? (it.kind === 'extract' ? '#4fdc7c' : it.kind === 'cache' ? '#ffd23f' : '#3fc1ff') : '#2a2f36');
  }

  /** Nearest enabled interactable within reach of `feet`. */
  nearest(feet: Vector3, reach = 1.8): Interactable | null {
    let best: Interactable | null = null;
    let bd = reach;
    for (const it of this.items) {
      if (!it.enabled || it.done || it.kind === 'extract') continue;
      const d = Math.hypot(it.pos.x - feet.x, it.pos.z - feet.z);
      if (d < bd && Math.abs(it.pos.y - feet.y) < 1.5) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  update(dt: number): void {
    this.t += dt;
    for (const it of this.items) {
      if (it.light && it.enabled && !it.done) it.light.isVisible = Math.floor(this.t * 3) % 2 === 0 || it.kind !== 'terminal';
    }
  }

  dispose(): void {
    for (const it of this.items) {
      for (const p of it.parts) p.dispose();
      it.node.dispose();
    }
  }
}
