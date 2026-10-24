/**
 * (mission KIT-SHUT) The roller shutter's world piece: the frame (head box and side guides, level builder boxes) and the
 * moving curtain (one thin-instanced box mesh) with a static body above the gap, as `Doors` does for hinged leaves.
 * The state is the kit device's (`game/kit/shutter.ts` `ShutterDevice`: closed / lifting / held / dropping, `open` = the
 * gap under the edge, already clamped over anyone under it): `update` draws each curtain at its gap and moves its body.
 *
 * Collision: shut (the gap under the guards' notice line, `SHUTTER.visibleFrac` of the hold gap) the body fills the
 * opening (movement, sight, light and rounds stop, as a closed door); open, the body starts at the gap (in
 * `BODY_STEP` steps, so a lift rebuilds it a handful of times): sight and rounds pass under it, and nobody fits under
 * it upright or crouched (crouch 1.15 m > the 0.9 m hold gap); the only way through is the crawl (kinematic).
 *
 * Map use: `placeShutter(b, spec)` while building (the opening is a gap in the map's own wall, `spec.width` wide), then
 * `new ShutterDoors(scene, level)` with the world, `arm()` once the nav grid is built, `update(team.devices.list)` each
 * frame (wiring: KIT-SHUT report). Babylon only through `core/babylon`.
 */
import { Color3, CreateBox, Matrix, PBRMaterial, PhysicsBody, PhysicsMotionType, PhysicsShapeBox, Quaternion, TransformNode, Vector3, type Mesh, type Scene } from '../core/babylon';
import { G, doorMembership } from '../physics/groups';
import type { KitDevice } from '../game/kit/registry';
import { SHUTTER, addShutterSpec, isShutterDevice, shutterSpecsOf, type ShutterSpec } from '../game/kit/shutter';
import type { LevelBuilder } from './levelBuilder';

/** The curtain's thickness, the head box (roller housing) and the side guides (m). */
export const SHUTTER_PIECE = {
  thickness: 0.06,
  headH: 0.45,
  headD: 0.5,
  guideW: 0.08,
  guideD: 0.16,
  color: '#7d8287',
  frame: '#5f6468',
} as const;

/** The body's bottom moves in steps of this (m). */
export const BODY_STEP = 0.15;

/** The curtain body's bottom over the floor for a gap: 0 while shut to the guards' eye, else the gap in `BODY_STEP`s. */
export function curtainBodyBottom(open: number, holdGap: number): number {
  if (open <= SHUTTER.visibleFrac * holdGap) return 0;
  return Math.floor(open / BODY_STEP + 1e-6) * BODY_STEP;
}

/** The drawn curtain: from the gap to the top of the opening (the rest is rolled into the head box). */
export function curtainBox(spec: Pick<ShutterSpec, 'y' | 'height'>, open: number, out: { y: number; h: number }): { y: number; h: number } {
  const g = Math.max(0, Math.min(spec.height - 0.02, open));
  out.h = spec.height - g;
  out.y = spec.y + g + out.h / 2;
  return out;
}

/**
 * Add a shutter to the level being built: the head box over the opening and a guide on each side (static boxes), and
 * the spec for the kit device and the world piece (`shutterSpecsOf(level)`).
 */
export function placeShutter(b: LevelBuilder, spec: ShutterSpec): ShutterSpec {
  const s = Math.sin(spec.yaw);
  const c = Math.cos(spec.yaw);
  const P = SHUTTER_PIECE;
  b.box(spec.x, spec.y + spec.height + P.headH / 2, spec.z, spec.width + 2 * P.guideW, P.headH, P.headD, P.frame, spec.yaw);
  for (const side of [-1, 1] as const) {
    const along = side * (spec.width / 2 + P.guideW / 2);
    b.box(spec.x + along * c, spec.y + spec.height / 2, spec.z - along * s, P.guideW, spec.height, P.guideD, P.frame, spec.yaw);
  }
  addShutterSpec(b.anchors, spec);
  return spec;
}

interface Slot {
  spec: ShutterSpec;
  holdGap: number;
  open: number;
  bottom: number;
  body: PhysicsBody | null;
  node: TransformNode | null;
  index: number;
}

/** The level's shutter curtains: one thin-instanced mesh, a static body each (armed after the nav grid). */
export class ShutterDoors {
  private readonly slots: Slot[] = [];
  private readonly byId = new Map<string, Slot>();
  private mesh: Mesh | null = null;
  private buf: Float32Array | null = null;
  private armed = false;
  private readonly m = new Matrix();
  private readonly q = new Quaternion();
  private readonly sc = new Vector3();
  private readonly p = new Vector3();
  private readonly box = { y: 0, h: 0 };

  constructor(
    private readonly scene: Scene,
    level: unknown,
  ) {
    const specs = shutterSpecsOf(level);
    if (!specs.length) return;
    specs.forEach((spec, index) => {
      const slot: Slot = { spec, holdGap: Math.min(spec.holdGap ?? SHUTTER.holdGap, spec.height), open: 0, bottom: 0, body: null, node: null, index };
      this.slots.push(slot);
      this.byId.set(spec.id, slot);
    });
    const mat = new PBRMaterial('shutterMat', scene);
    mat.albedoColor = Color3.FromHexString(SHUTTER_PIECE.color).toLinearSpace();
    mat.metallic = 0.6;
    mat.roughness = 0.55;
    mat.usePhysicalLightFalloff = false;
    mat.directIntensity = Math.PI;
    mat.freeze();
    const mesh = CreateBox('shutters', { size: 1 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;
    this.buf = new Float32Array(specs.length * 16);
    mesh.thinInstanceSetBuffer('matrix', this.buf, 16, false);
    this.mesh = mesh;
    for (const s of this.slots) this.write(s);
    mesh.thinInstanceBufferUpdated('matrix');
    mesh.thinInstanceRefreshBoundingInfo(false);
  }

  /** The curtains' mesh (null without shutters): a shadow caster for the flashlights, as the door leaves. */
  get curtainMesh(): Mesh | null {
    return this.mesh;
  }

  private write(s: Slot): void {
    const sp = s.spec;
    const b = curtainBox(sp, s.open, this.box);
    Quaternion.RotationYawPitchRollToRef(sp.yaw, 0, 0, this.q);
    this.sc.set(sp.width, b.h, SHUTTER_PIECE.thickness);
    this.p.set(sp.x, b.y, sp.z);
    Matrix.ComposeToRef(this.sc, this.q, this.p, this.m);
    this.m.copyToArray(this.buf!, s.index * 16);
  }

  /** Collision on (call once the nav grid is built: the guards' grid keeps the opening as the map makes it). */
  arm(): void {
    if (this.armed) return;
    this.armed = true;
    for (const s of this.slots) this.addBody(s);
  }

  private addBody(s: Slot): void {
    if (s.body || !this.armed) return;
    const sp = s.spec;
    const h = sp.height - s.bottom;
    const node = new TransformNode(`shutter-${sp.id}`, this.scene);
    node.position.set(sp.x, sp.y + s.bottom + h / 2, sp.z);
    node.rotationQuaternion = Quaternion.RotationYawPitchRoll(sp.yaw, 0, 0);
    const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, this.scene);
    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(sp.width - 0.04, h, SHUTTER_PIECE.thickness * 2), this.scene);
    shape.filterMembershipMask = doorMembership(false);
    shape.filterCollideMask = 0xffffffff & ~G.STATIC;
    body.shape = shape;
    s.body = body;
    s.node = node;
  }

  private removeBody(s: Slot): void {
    if (!s.body) return;
    s.body.shape?.dispose();
    s.body.dispose();
    s.node?.dispose();
    s.body = null;
    s.node = null;
  }

  /** Follow the kit devices (`TeamController.devices.list`): each curtain at its gap, its body at the gap's step. */
  update(devices: readonly KitDevice[]): void {
    if (!this.mesh) return;
    let moved = false;
    for (let i = 0; i < devices.length; i++) {
      const d = devices[i]!;
      if (!isShutterDevice(d)) continue;
      const s = this.byId.get(d.id);
      if (!s || s.open === d.open) continue;
      s.open = d.open;
      this.write(s);
      moved = true;
      const bottom = curtainBodyBottom(d.open, s.holdGap);
      if (bottom !== s.bottom) {
        s.bottom = bottom;
        this.removeBody(s);
        this.addBody(s);
      }
    }
    if (moved) {
      this.mesh.thinInstanceBufferUpdated('matrix');
      this.mesh.thinInstanceRefreshBoundingInfo(false);
    }
  }

  dispose(): void {
    for (const s of this.slots) this.removeBody(s);
    this.mesh?.material?.dispose();
    this.mesh?.dispose();
  }
}
