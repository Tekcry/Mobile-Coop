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
 * Guards (J8-J9 A15): the opening is closed on the guards' nav grid for good (the winding gear is broken, the chain
 * seized): `arm(nav)` adds one closure per shutter, shut, after the grid is built (built at grid time the opening's far
 * side could be cut off as unreachable). Players keep the opening: the crawl is kinematic.
 *
 * Light (J8-J9 A16, light parity): each shutter is also an always-shut leaf in the world's light-door list
 * (`shutterLightLeaf`, `World.lightDoors`), the list the gameplay field (`LightField`), the baked lamps on screen and the
 * torch shadows test closed doors with, so the curtain stops lamp light in the meter, the guards' view and the picture
 * through one path; the held gap passes no lamp light (its few seconds). The bake itself sees the opening as air.
 *
 * Map use: `placeShutter(b, spec)` while building (the opening is a gap in the map's own wall, `spec.width` wide). The
 * world (J9 S1, `world.ts`) builds `ShutterDoors(scene, level)` when the level has specs, casts the curtains into the
 * flashlights' shadows, and arms them with the doors after the nav grid (`World.armDoors(nav)`); the team controller
 * calls `update(devices.list)` each fixed step after the kit ticks, on host and client. Babylon only through
 * `core/babylon`.
 */
import { Color3, CreateBox, Matrix, PBRMaterial, PhysicsBody, PhysicsMotionType, PhysicsShapeBox, Quaternion, TransformNode, Vector3, type Mesh, type Scene } from '../core/babylon';
import { G, doorMembership } from '../physics/groups';
import type { KitDevice } from '../game/kit/registry';
import { SHUTTER, addShutterSpec, isShutterDevice, shutterSpecsOf, type ShutterSpec } from '../game/kit/shutter';
import type { LevelBuilder } from './levelBuilder';
import type { FieldDoor } from './lightField';

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

/**
 * (J9 S1, A15) The guards' nav closure over an opening: as a door's (`sectorStage` `STAGE_NAV_ACROSS` deep, the width
 * + `STAGE_NAV_ALONG` long), so the cells either side of the plane within `across` are shut.
 */
export const SHUTTER_NAV = { across: 0.35, alongPad: 0.5 } as const;

/** The nav grid calls the closures need (`NavGrid`; the AI's grid, host and solo only). */
export interface ShutterNav {
  addClosure(cx: number, cz: number, hx: number, hz: number, yaw: number, y: number): number;
  setClosed(id: number, on: boolean): void;
}

/** A shutter's nav closure rect in `NavGrid.addClosure`'s terms: hx along the shutter, hz across (its normal is the yaw). */
export interface ShutterNavRect {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  yaw: number;
  y: number;
}

export function shutterNavRect(spec: ShutterSpec, out: ShutterNavRect): ShutterNavRect {
  out.cx = spec.x;
  out.cz = spec.z;
  out.hx = (spec.width + SHUTTER_NAV.alongPad) / 2;
  out.hz = SHUTTER_NAV.across;
  out.yaw = spec.yaw;
  out.y = spec.y;
  return out;
}

/** (J9 S1, A15) Shut each shutter's opening on the guards' grid (build time; allocates). Returns the closure ids. */
export function closeShutterNav(nav: ShutterNav, specs: readonly ShutterSpec[]): number[] {
  const r: ShutterNavRect = { cx: 0, cz: 0, hx: 0, hz: 0, yaw: 0, y: 0 };
  const ids: number[] = [];
  for (const sp of specs) {
    shutterNavRect(sp, r);
    const id = nav.addClosure(r.cx, r.cz, r.hx, r.hz, r.yaw, r.y);
    nav.setClosed(id, true);
    ids.push(id);
  }
  return ids;
}

/**
 * (J9 S1, A16) A shutter as a light door that is always shut: the leaf over the whole opening, in the door convention
 * (`FieldDoor`: the hinge at one end, the leaf along (sin yaw, cos yaw), so yaw = the shutter's normal + 90 degrees).
 */
export function shutterLightLeaf(spec: ShutterSpec): FieldDoor {
  const ax = Math.cos(spec.yaw);
  const az = -Math.sin(spec.yaw);
  const h = spec.width / 2;
  return { anchor: { hinge: { x: spec.x - ax * h, y: spec.y, z: spec.z - az * h }, yaw: spec.yaw + Math.PI / 2, width: spec.width, height: spec.height }, open: 0 };
}

/** The level's shutters as always-shut light doors (none = []). */
export function shutterLightLeaves(level: unknown): FieldDoor[] {
  return shutterSpecsOf(level).map(shutterLightLeaf);
}

/** One curtain's live state (the world piece). */
export interface ShutterSlot {
  spec: ShutterSpec;
  holdGap: number;
  open: number;
  bottom: number;
  index: number;
}

/** The curtains of a level, in spec order (pure: the `ShutterDoors` slots without their bodies). */
export function shutterSlotsOf(level: unknown): ShutterSlot[] {
  return shutterSpecsOf(level).map((spec, index) => ({ spec, holdGap: Math.min(spec.holdGap ?? SHUTTER.holdGap, spec.height), open: 0, bottom: 0, index }));
}

interface Slot extends ShutterSlot {
  body: PhysicsBody | null;
  node: TransformNode | null;
}

/** The level's shutter curtains: one thin-instanced mesh, a static body each (armed after the nav grid). */
export class ShutterDoors {
  private readonly slots: Slot[] = [];
  private readonly byId = new Map<string, Slot>();
  private mesh: Mesh | null = null;
  private buf: Float32Array | null = null;
  private armed = false;
  /** (A15) Each shutter's closure on the guards' nav grid (empty without a grid: a co-op client, a sandbox). */
  private navIds: number[] = [];
  private readonly m = new Matrix();
  private readonly q = new Quaternion();
  private readonly sc = new Vector3();
  private readonly p = new Vector3();
  private readonly box = { y: 0, h: 0 };

  constructor(
    private readonly scene: Scene,
    level: unknown,
  ) {
    const slots = shutterSlotsOf(level);
    if (!slots.length) return;
    for (const s of slots) {
      const slot: Slot = { ...s, body: null, node: null };
      this.slots.push(slot);
      this.byId.set(slot.spec.id, slot);
    }
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
    this.buf = new Float32Array(slots.length * 16);
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

  /**
   * Collision on, and (A15) each opening shut on the guards' grid when one is given (`nav`: the host's / solo grid; a
   * co-op client has none). Call once the nav grid is built (`World.armDoors`): built at grid time, a shut opening
   * could cut its far side off as unreachable.
   */
  arm(nav: ShutterNav | null = null): void {
    if (this.armed) return;
    this.armed = true;
    for (const s of this.slots) this.addBody(s);
    if (nav && this.slots.length) this.navIds = closeShutterNav(nav, this.slots.map((s) => s.spec));
  }

  /** (tests, tooling) The closures `arm` shut on the guards' grid. */
  get navClosures(): readonly number[] {
    return this.navIds;
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
