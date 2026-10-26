import type { Vector3} from '../core/babylon';
import { TransformNode, type AbstractMesh, type InstancedMesh, type Scene } from '../core/babylon';
import type { PartLibrary } from '../world/partLibrary';
import { hyp2 } from '../core/mathx';
import { ITEM_SCOPE_OFF, itemInScope } from './itemScope';
import type { ModeId } from './modes/gameMode';

/** Objectives (terminal, cache, extract), light switches, alarm panels, body hiding spots, bodies, doors. */
export type InteractKind = 'terminal' | 'cache' | 'extract' | 'switch' | 'alarm' | 'hide' | 'body' | 'door' | 'vip' | 'intel' | 'charge' | 'revive' | 'medkitWall' | 'crate';

/** Each kind's lit indicator colour (exported for the weapons crate's reset, E9-crate). */
export const KIND_COLOR: Record<InteractKind, string> = {
  terminal: '#3fc1ff',
  cache: '#ffd23f',
  extract: '#4fdc7c',
  switch: '#ffe08a',
  alarm: '#ff3b30',
  hide: '#2a2f36',
  body: '#2a2f36',
  door: '#2a2f36',
  vip: '#2a2f36',
  intel: '#ffd23f',
  charge: '#ff6b5a',
  revive: '#4fdc7c',
  medkitWall: '#d9363e',
  crate: '#f2c230',
};

/**
 * (sector-marks, G290) Does a session in `mode` draw the extraction beacon (the green disc and lit pole of an `extract`
 * item)? Never in Sector Ops (VISION 4 rule 5, no markers): its exits are zones only; the connector door, signs and
 * light show the way.
 */
export function drawsExitBeacon(mode: ModeId): boolean {
  return mode !== 'sector';
}

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
  /**
   * (sector-fixes-r RT) Offered only from one side: the feet past the plane through `pos` along this plan direction
   * (a team door's "Unbolt", the course F7 test, `onBoltSide`). None: any side.
   */
  side?: readonly [number, number];
  /**
   * (sector-fixes-r2) With `side`: the most the feet may be off the item along the plane (m, either way) and out from
   * it (m) (a team door's `boltHalfSpan` and `BOLT_DEPTH`, `inBoltReach`). None: no limit.
   */
  sideHalf?: number;
  sideDepth?: number;
  /** Noise radius (m) the hold makes while it runs (a manhole cover, a padlock); none = silent. */
  holdNoise?: number;
  /**
   * (sector-redesign cap fix) The Sector Ops section the item belongs to: a co-op host mirrors it only while that section
   * is live (`Interactables.scope`, `itemScope.ts`). None: always mirrored.
   */
  section?: number;
  /** (E9-crate) used by this machine's player: `nearest` skips it; `enabled` stays (the others still use it). */
  spent?: boolean;
  /** Called when used (else the mode handles it). */
  onUse?: (it: Interactable, who?: string) => void;
}

/**
 * Things to use: objectives (hackable terminals, intel cache, extraction beacon), light switches and alarm
 * panels on walls, spots to hide a body in (the container itself is level geometry) and the bodies
 * themselves (no visuals: the body is the visual). Proximity + tap or hold to use.
 */
export class Interactables {
  readonly items: Interactable[] = [];
  /**
   * (sector-redesign cap fix) The section whose items a co-op host mirrors (`ITEM_SCOPE_OFF`: every item; Sector Ops
   * sets the live section, -1 between sections). Local prompts are not affected.
   */
  scope = ITEM_SCOPE_OFF;
  private t = 0;

  constructor(
    private scene: Scene,
    private parts: PartLibrary,
    /** (sector-marks) Draw the `extract` beacon (`drawsExitBeacon`); false: an `extract` item has no visuals. */
    private readonly exitBeacon = true,
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
    } else if (kind === 'intel') {
      // a document folder on whatever it sits on
      add('box', '#c9b98a', [0.32, 0.04, 0.24], [0, 0.02, 0]);
      light = add('box', KIND_COLOR.intel, [0.08, 0.03, 0.08], [0.1, 0.05, 0.06]);
    } else if (kind === 'charge') {
      add('box', '#3a3f45', [0.5, 0.9, 0.5], [0, 0.45, 0]);
      light = add('box', KIND_COLOR.charge, [0.12, 0.08, 0.02], [0, 0.75, 0.26]);
    } else if (kind === 'hide' || kind === 'body' || kind === 'door' || kind === 'vip' || kind === 'revive') {
      // no visuals
    } else if (kind === 'terminal') {
      add('box', '#3a4048', [0.7, 1.1, 0.45], [0, 0.55, 0]);
      add('box', '#1c1f24', [0.6, 0.4, 0.05], [0, 0.95, 0.24]);
      light = add('box', '#3fc1ff', [0.5, 0.3, 0.02], [0, 0.95, 0.27]);
    } else if (kind === 'medkitWall') {
      // (locomotion step 15) a wall medkit station: a white box on the wall (facing +z), a red cross lit while stocked
      add('box', '#f1f1ef', [0.42, 0.34, 0.12], [0, 1.25, 0.06]);
      add('box', '#d9363e', [0.06, 0.2, 0.02], [0, 1.25, 0.125]);
      light = add('box', KIND_COLOR.medkitWall, [0.2, 0.06, 0.02], [0, 1.25, 0.127]);
    } else if (kind === 'cache') {
      add('box', '#59636b', [0.9, 0.5, 0.6], [0, 0.25, 0]);
      light = add('box', '#ffd23f', [0.92, 0.08, 0.62], [0, 0.45, 0]);
    } else if (kind === 'crate') {
      // (E9-crate) a non-solid greybox: olive body, darker lid band, an amber strip on the +z face (the indicator)
      add('box', '#4b5a3a', [0.9, 0.45, 0.55], [0, 0.225, 0]);
      add('box', '#3a4433', [0.92, 0.06, 0.57], [0, 0.45, 0]);
      light = add('box', KIND_COLOR.crate, [0.5, 0.08, 0.02], [0, 0.3, 0.28]);
    } else if (kind === 'extract' && !this.exitBeacon) {
      // (sector-marks, G290) no beacon: the exit is a zone only
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
      if (!it.enabled || it.done || it.spent || it.kind === 'extract') continue;
      if (only ? it.kind !== only : it.kind === 'hide') continue;
      if (it.side) {
        const dx = feet.x - it.pos.x;
        const dz = feet.z - it.pos.z;
        const depth = dx * it.side[0] + dz * it.side[1];
        if (depth <= 0) continue;
        if (it.sideDepth !== undefined && depth > it.sideDepth) continue;
        if (it.sideHalf !== undefined && Math.abs(dz * it.side[0] - dx * it.side[1]) > it.sideHalf) continue;
      }
      const d = hyp2(it.pos.x - feet.x, it.pos.z - feet.z);
      if (d < (it.reach ?? reach) && d < bd && Math.abs(it.pos.y - feet.y) < 1.5) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  /** Is `it` in the mirrored set (`scope`)? */
  inScope(it: Interactable): boolean {
    return itemInScope(it.section, this.scope);
  }

  /** How many items are in the mirrored set (debug / e2e: the wire cap holds for the live set). */
  scopedCount(): number {
    let n = 0;
    for (let i = 0; i < this.items.length; i++) if (this.inScope(this.items[i]!)) n++;
    return n;
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
