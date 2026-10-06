import {
  Color3,
  CreateBox,
  Matrix,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  Quaternion,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Mesh,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import type { Grate, TraversalAnchors } from './anchors';

/** How a panel opens: glass shatters, a grate is kicked in (loud) or unscrewed (quiet). */
export type OpenHow = 'break' | 'kick' | 'unscrew';

interface Panel {
  key: string;
  kind: 'glass' | 'grate';
  body: PhysicsBody;
  node: TransformNode;
  index: number;
  open: boolean;
  pos: Vector3;
}

/** Grate size (m): a square vent cover. */
export const GRATE_SIZE = 0.7;

/**
 * Panels that block a traversal route until opened: the glass in glazed windows and the covers on duct grates.
 * Each is its own small static body (the level's container body cannot drop a child) and a thin instance of
 * one mesh per kind (2 draw calls). Opening disposes the body and hides the instance. Keys: `glass:<windowId>`,
 * `grate:<ductId>:entry|exit|<i>`.
 */
export class Breakables {
  private panels = new Map<string, Panel>();
  private glass: Mesh | null = null;
  private grates: Mesh | null = null;
  private glassM: Float32Array | null = null;
  private grateM: Float32Array | null = null;
  /** Called when a panel opens (audio, noise, vfx). */
  onOpen: ((key: string, how: OpenHow, at: Vector3) => void) | null = null;

  constructor(
    private scene: Scene,
    anchors: TraversalAnchors,
  ) {
    const glass: { key: string; c: Vector3; s: Vector3; yaw: number; pitch: number }[] = [];
    const grates: { key: string; c: Vector3; s: Vector3; yaw: number; pitch: number }[] = [];
    for (const w of anchors.windows) {
      if (w.open) continue;
      glass.push({ key: `glass:${w.id}`, c: new Vector3(w.c.x, w.c.y, w.c.z), s: new Vector3(w.w, w.h, 0.03), yaw: w.yaw, pitch: 0 });
    }
    const grate = (key: string, g: Grate): void => {
      const flat = g.where !== 'wall';
      grates.push({ key, c: new Vector3(g.pos.x, g.pos.y, g.pos.z), s: new Vector3(GRATE_SIZE, flat ? 0.04 : GRATE_SIZE, flat ? GRATE_SIZE : 0.04), yaw: flat ? 0 : Math.atan2(g.nx, g.nz), pitch: 0 });
    };
    for (const d of anchors.ducts) {
      grate(`grate:${d.id}:entry`, d.entry);
      grate(`grate:${d.id}:exit`, d.exit);
      d.grates.forEach((g, i) => grate(`grate:${d.id}:${i}`, g));
    }
    if (glass.length) {
      const m = new StandardMaterial('glassMat', scene);
      m.diffuseColor = new Color3(0.6, 0.78, 0.86);
      m.specularColor = new Color3(0.6, 0.6, 0.6);
      m.alpha = 0.3;
      m.backFaceCulling = false;
      m.freeze();
      [this.glass, this.glassM] = this.build('glass', glass, m);
    }
    if (grates.length) {
      const m = new StandardMaterial('grateMat', scene);
      m.diffuseColor = new Color3(0.32, 0.35, 0.37);
      m.specularColor = Color3.Black();
      m.freeze();
      [this.grates, this.grateM] = this.build('grate', grates, m);
    }
  }

  private build(kind: 'glass' | 'grate', list: { key: string; c: Vector3; s: Vector3; yaw: number; pitch: number }[], mat: StandardMaterial): [Mesh, Float32Array] {
    const scene = this.scene;
    const mesh = CreateBox(`${kind}Panels`, { size: 1 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;
    const buf = new Float32Array(list.length * 16);
    const q = new Quaternion();
    const mtx = new Matrix();
    list.forEach((p, i) => {
      Quaternion.RotationYawPitchRollToRef(p.yaw, p.pitch, 0, q);
      Matrix.ComposeToRef(p.s, q, p.c, mtx);
      mtx.copyToArray(buf, i * 16);
      const node = new TransformNode(`${p.key}`, scene);
      node.position.copyFrom(p.c);
      node.rotationQuaternion = q.clone();
      const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, scene);
      const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), p.s, scene);
      shape.filterMembershipMask = G.STATIC;
      shape.filterCollideMask = 0xffffffff & ~G.STATIC;
      body.shape = shape;
      this.panels.set(p.key, { key: p.key, kind, body, node, index: i, open: false, pos: p.c.clone() });
    });
    mesh.thinInstanceSetBuffer('matrix', buf, 16, false);
    mesh.thinInstanceRefreshBoundingInfo(false);
    return [mesh, buf];
  }

  has(key: string): boolean {
    return this.panels.has(key);
  }

  /** True if the key is open or was never a panel (an open window, a grate-less vent). */
  isOpen(key: string): boolean {
    const p = this.panels.get(key);
    return !p || p.open;
  }

  /** Open a panel. Returns false if it is already open (or missing). */
  open(key: string, how: OpenHow): boolean {
    const p = this.panels.get(key);
    if (!p || p.open) return false;
    p.open = true;
    p.body.shape?.dispose();
    p.body.dispose();
    p.node.dispose();
    const buf = p.kind === 'glass' ? this.glassM : this.grateM;
    const mesh = p.kind === 'glass' ? this.glass : this.grates;
    if (buf && mesh) {
      // collapse the instance (zero scale) so it no longer draws
      for (let k = 0; k < 12; k++) buf[p.index * 16 + k] = 0;
      mesh.thinInstanceBufferUpdated('matrix');
    }
    this.onOpen?.(key, how, p.pos);
    return true;
  }

  dispose(): void {
    for (const p of this.panels.values()) {
      if (p.open) continue;
      p.body.shape?.dispose();
      p.body.dispose();
      p.node.dispose();
    }
    this.panels.clear();
    this.glass?.material?.dispose();
    this.glass?.dispose();
    this.grates?.material?.dispose();
    this.grates?.dispose();
  }
}
