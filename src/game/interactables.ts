import type { Vector3} from '../core/babylon';
import { TransformNode, type AbstractMesh, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';
import { hyp2 } from '../core/mathx';

/** Objectives (terminal, cache, extract), light switches, alarm panels, body hiding spots, bodies. */
export type InteractKind = 'terminal' | 'cache' | 'extract' | 'switch' | 'alarm' | 'hide' | 'body';

const KIND_COLOR: Record<InteractKind, string> = {
  terminal: '#3fc1ff',
  cache: '#ffd23f',
  extract: '#4fdc7c',
  switch: '#ffe08a',
  alarm: '#ff3b30',
  hide: '#2a2f36',
  body: '#2a2f36',
};

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
  /** Reach from the feet (m; default 1.8). */
  reach?: number;
  /** Called when used (else the mode handles it). */
  onUse?: (it: Interactable) => void;
}

/**
 * Things to use: objectives (hackable terminals, intel cache, extraction beacon), light switches and alarm
 * panels on walls, spots to hide a body in (the container itself is level geometry) and the bodies
 * themselves (no visuals: the body is the visual). Proximity + tap or hold to use.
 */
export class Interactables {
  readonly items: Interactable[] = [];
  private t = 0;

  constructor(
    private scene: Scene,
    private parts: PartLibrary,
  ) {}

  add(id: string, kind: InteractKind, pos: Vector3, label: string, holdTime: number, yaw = 0): Interactable {
    const node = new TransformNode(`int-${id}`, this.scene);
    node.position.copyFrom(pos);
    node.rotation.y = yaw;
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
    if (kind === 'switch') {
      // a wall box (its back on the wall, facing +z in its own frame)
      add('box', '#4a4f55', [0.14, 0.22, 0.05], [0, 1.3, 0.025]);
      light = add('box', KIND_COLOR.switch, [0.05, 0.05, 0.02], [0, 1.34, 0.055]);
    } else if (kind === 'alarm') {
      add('box', '#6b1c18', [0.32, 0.42, 0.07], [0, 1.4, 0.035]);
      add('box', '#d9d9d9', [0.14, 0.14, 0.02], [0, 1.36, 0.075]);
      light = add('box', KIND_COLOR.alarm, [0.08, 0.05, 0.03], [0, 1.55, 0.08]);
    } else if (kind === 'hide' || kind === 'body') {
      // no visuals
    } else if (kind === 'terminal') {
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
    if (it.light) this.parts.setColor(it.light, on ? KIND_COLOR[it.kind] : '#2a2f36');
  }

  /** Indicator colour (switch: lamps on / off). */
  setIndicator(it: Interactable, hex: string): void {
    if (it.light) this.parts.setColor(it.light, hex);
  }

  /**
   * Nearest enabled interactable within reach of `feet` (each item's own reach when it has one); `only`
   * restricts to one kind. Hiding spots are only offered through `only` (with a body on the shoulder).
   */
  nearest(feet: Vector3, reach = 1.8, only?: InteractKind): Interactable | null {
    let best: Interactable | null = null;
    let bd = Infinity;
    for (const it of this.items) {
      if (!it.enabled || it.done || it.kind === 'extract') continue;
      if (only ? it.kind !== only : it.kind === 'hide') continue;
      const d = hyp2(it.pos.x - feet.x, it.pos.z - feet.z);
      if (d < (it.reach ?? reach) && d < bd && Math.abs(it.pos.y - feet.y) < 1.5) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  remove(it: Interactable): void {
    const k = this.items.indexOf(it);
    if (k < 0) return;
    this.items.splice(k, 1);
    for (const p of it.parts) p.dispose();
    it.node.dispose();
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
