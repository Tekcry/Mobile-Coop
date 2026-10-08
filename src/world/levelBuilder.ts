import { renderOpts } from './renderOpts';
import { surfaceAt, type Surface, type SurfaceArea } from './surfaces';
import { SURFACE_ID, type SurfaceAtlas } from './surfaceAtlas';
import { SurfacePlugin } from './surfacePlugin';
import { pieceKind } from './surfaceKinds';
import { detailPieces } from './detailPass';
import type { TierQuality } from '../core/quality';
import {
  PBRMaterial,
  Color3,
  CreateBox,
  CreateCylinder,
  Matrix,
  type Mesh,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeContainer,
  PhysicsShapeCylinder,
  Quaternion,
  CreatePlane,
  DynamicTexture,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import { LevelMaterialPlugin } from './levelMaterialPlugin';
import { buildCoverSegments, coverPointsFromSegments, coverStandoff, type CoverSegment } from '../cover/coverData';
import { findSplitGaps } from '../player/splitJump';
import { MOVEMENT } from '../config/movement';
import { proportions } from '../player/proportions';
import { hyp2 } from '../core/mathx';
import { generateLedges, makeLedge, suppressLedgesNear, TraversalAnchors, type Fence, type RappelPoint, type SplitAnchor, type Door, type Duct, type Grate, type Ladder, type Ledge, type P3, type PipeHorizontal, type PipeVertical, type WindowAnchor, type Zipline } from './anchors';
import { LightRegistry, type LightInit } from './lights';
import { levelVoxels, type LevelVoxels, type VoxelArt } from '../voxel/levelVoxels';
import { canonicalLightSet } from '../voxel/lightShapes';

/** Gap between a body in cover and the surface (shared by the player and AI). */
export const COVER_STANDOFF = coverStandoff(MOVEMENT.radius, proportions('broad').bodyDepthHalf);

export interface BoxPiece {
  c: [number, number, number];
  s: [number, number, number];
  yaw: number;
  pitch: number;
  color: string;
  collide: boolean;
  /** Collision-only pieces (e.g. the smooth ramp under stairs) are not rendered. */
  visible?: boolean;
  /** Never generate ledges from this piece (manual override). */
  noLedge?: boolean;
  /** Above head height over a walkable floor (ceiling slab, duct, catwalk): the nav grid samples the floor
   *  under it and does not treat it as a blocker. */
  overhead?: boolean;
  /** Visual-only dressing from the detail pass (never collides; the minimap skips it). */
  detail?: boolean;
}

export interface CylPiece {
  c: [number, number, number];
  r: number;
  h: number;
  color: string;
  collide: boolean;
}

export interface CoverPoint {
  pos: Vector3;
  /** Direction from the cover towards the protected side (unit, XZ). */
  normal: Vector3;
  /** Low cover can be shot over while crouched-peeking; high cover needs leaning out. */
  low: boolean;
  /** Cover face this point lies on, and the position along it. */
  seg: number;
  s: number;
}

export interface BuiltLevel {
  root: TransformNode;
  body: PhysicsBody;
  meshes: Mesh[];
  boxes: BoxPiece[];
  cylinders: CylPiece[];
  cover: CoverPoint[];
  /** Cover faces (player cover system + AI peeking). */
  coverSegments: CoverSegment[];
  /** Traversal anchors: generated ledges plus the map's ladders, pipes, ducts, windows, doors, ziplines. */
  anchors: TraversalAnchors;
  /** Every light of the level (gameplay light sampling + the renderer's capped real-light set). */
  lights: LightRegistry;
  /** Marked floor surfaces (footstep loudness / sound); unmarked floor is the map theme's default. */
  surfaces: SurfaceArea[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** The level material's procedural-surface plugin (3.0; rain sets `wet`). */
  surfacePlugin: SurfacePlugin | null;
  /** 3.0 voxels: the pieces rendered as voxels (their shapes, palette and grid); they are left out of `meshes`. */
  voxels: LevelVoxels | null;
  /** 3.6: the canonical light-bake shapes (packed), their bounds and hash - the same on every device and tier. */
  light: { shapes: Float32Array; lo: [number, number, number]; hi: [number, number, number]; hash: string };
  dispose(): void;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = Color3.FromHexString(hex);
  return [c.r, c.g, c.b];
}

/**
 * Collects modular pieces and builds them as thin instances (1 draw call per shape)
 * plus a single static Havok body with a container shape.
 */
export class LevelBuilder {
  readonly boxes: BoxPiece[] = [];
  readonly cylinders: CylPiece[] = [];
  bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
  /** Placed anchors (ledges are generated at build time and added after these). */
  readonly anchors = new TraversalAnchors();
  readonly lights = new LightRegistry();
  readonly surfaces: SurfaceArea[] = [];
  /** Manual ledge suppressions (x, z, radius). */
  private noLedgeAt: [number, number, number][] = [];

  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: string, yaw = 0, pitch = 0, collide = true, visible = true): this {
    this.boxes.push({ c: [cx, cy, cz], s: [sx, sy, sz], yaw, pitch, color, collide, visible });
    return this;
  }

  /** Box resting on y (bottom at y). */
  block(x: number, z: number, w: number, h: number, d: number, color: string, y = 0, yaw = 0): this {
    return this.box(x, y + h / 2, z, w, h, d, color, yaw);
  }

  floor(x: number, z: number, w: number, d: number, color: string, y = 0, thickness = 0.4): this {
    return this.box(x, y - thickness / 2, z, w, thickness, d, color);
  }

  /** Wall between two points on the ground. */
  wall(x1: number, z1: number, x2: number, z2: number, h: number, color: string, thick = 0.4, y = 0): this {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = hyp2(dx, dz);
    const yaw = Math.atan2(dx, dz);
    return this.box((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2, thick, h, len, color, yaw);
  }

  /** Wall along X at `z` from x0 to x1 with door gaps [a, b] (sorted, increasing). */
  wallX(z: number, x0: number, x1: number, gaps: readonly (readonly [number, number])[], h: number, color: string, thick = 0.3): this {
    let x = x0;
    for (const [a, e] of gaps) {
      if (a > x) this.wall(x, z, a, z, h, color, thick);
      x = e;
    }
    if (x1 > x) this.wall(x, z, x1, z, h, color, thick);
    return this;
  }

  /** Wall along Z at `x` from z0 to z1 with door gaps [a, b] (sorted, increasing). */
  wallZ(x: number, z0: number, z1: number, gaps: readonly (readonly [number, number])[], h: number, color: string, thick = 0.3): this {
    let z = z0;
    for (const [a, e] of gaps) {
      if (a > z) this.wall(x, z, x, a, h, color, thick);
      z = e;
    }
    if (z1 > z) this.wall(x, z, x, z1, h, color, thick);
    return this;
  }

  /** Inclined slab rising `rise` over `len` along yaw. */
  ramp(x: number, z: number, w: number, len: number, rise: number, color: string, yaw = 0, y = 0, visible = true): this {
    const pitch = -Math.atan2(rise, len);
    const slope = hyp2(len, rise);
    const t = 0.3;
    // Slab centre: midpoint of the top surface lowered by half thickness along the normal.
    const cy = y + rise / 2 - (t / 2) * Math.cos(pitch);
    return this.box(x, cy, z, w, t, slope, color, yaw, pitch, true, visible);
  }

  /** Stairs of `steps` steps rising `rise` over `len` along yaw (+Z when yaw=0). */
  stairs(x: number, z: number, w: number, len: number, rise: number, steps: number, color: string, yaw = 0, y = 0): this {
    const sd = len / steps;
    const sh = rise / steps;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    for (let i = 0; i < steps; i++) {
      const along = -len / 2 + sd * (i + 0.5);
      const hgt = sh * (i + 1);
      this.box(x + fx * along, y + hgt / 2, z + fz * along, w, hgt, sd, color, yaw, 0, false);
    }
    // Collide as a smooth ramp along the step nosings: no bumpy climbing for player or AI.
    this.ramp(x, z, w, len, rise, color, yaw, y, false);
    return this;
  }

  pillar(x: number, z: number, r: number, h: number, color: string, y = 0): this {
    this.cylinders.push({ c: [x, y + h / 2, z], r, h, color, collide: true });
    return this;
  }

  /** Waist-high cover (cover faces are generated for every solid piece at build time). */
  lowCover(x: number, z: number, len: number, color: string, yaw = 0, h = 1.05, thick = 0.6): this {
    return this.box(x, h / 2, z, thick, h, len, color, yaw);
  }

  /** Full-height cover wall chunk. */
  highCover(x: number, z: number, len: number, color: string, yaw = 0, h = 2.6, thick = 0.5): this {
    return this.box(x, h / 2, z, thick, h, len, color, yaw);
  }

  /** Bounding walls around the play area. */
  perimeter(minX: number, maxX: number, minZ: number, maxZ: number, h: number, color: string): this {
    this.bounds = { minX, maxX, minZ, maxZ };
    const t = 1;
    this.box((minX + maxX) / 2, h / 2, minZ - t / 2, maxX - minX + 2 * t, h, t, color);
    this.box((minX + maxX) / 2, h / 2, maxZ + t / 2, maxX - minX + 2 * t, h, t, color);
    this.box(minX - t / 2, h / 2, (minZ + maxZ) / 2, t, h, maxZ - minZ, color);
    this.box(maxX + t / 2, h / 2, (minZ + maxZ) / 2, t, h, maxZ - minZ, color);
    return this;
  }

  // --- traversal anchors (data + simple visuals; visuals never collide, so they make no cover or ledges)

  /** Ladder against a wall: climbing line at (x, z) from floor `y0` to the top floor `y1`, the climber
   *  facing `facing` (yaw, towards the wall). */
  ladder(x: number, z: number, y0: number, y1: number, facing: number, color = '#5b5f63', width = 0.5, rung = 0.3): Ladder {
    const fx = Math.sin(facing);
    const fz = Math.cos(facing);
    const rx = fz;
    const rz = -fx;
    const h = y1 - y0;
    // rails stand just off the wall, the rungs between them
    const off = 0.06;
    for (const sd of [-1, 1]) this.box(x + rx * sd * (width / 2) - fx * off, y0 + (h + 0.9) / 2, z + rz * sd * (width / 2) - fz * off, 0.05, h + 0.9, 0.05, color, facing, 0, false);
    for (let y = rung; y < h + 0.85; y += rung) this.box(x - fx * off, y0 + y, z - fz * off, width, 0.035, 0.035, color, facing, 0, false);
    return this.anchors.add<Ladder>({ kind: 'ladder', base: { x, y: y0, z }, top: { x: x + fx * 0.45, y: y1, z: z + fz * 0.45 }, facing, rung, width });
  }

  /** Vertical (drain) pipe at (x, z) from `y0` to `y1`; the climber faces `side` (yaw, towards the pipe). */
  pipeV(x: number, z: number, y0: number, y1: number, side: number, color = '#6d7378', radius = 0.06): PipeVertical {
    this.cylinders.push({ c: [x, (y0 + y1) / 2, z], r: radius, h: y1 - y0, color, collide: false });
    return this.anchors.add<PipeVertical>({ kind: 'pipeV', base: { x, y: y0, z }, top: { x, y: y1, z }, side, radius });
  }

  /** Horizontal pipe from a to b at height `y` (hang from it hand over hand). */
  pipeH(ax: number, az: number, bx: number, bz: number, y: number, color = '#6d7378', radius = 0.06): PipeHorizontal {
    const len = hyp2(bx - ax, bz - az);
    this.box((ax + bx) / 2, y, (az + bz) / 2, radius * 2, radius * 2, len, color, Math.atan2(bx - ax, bz - az), 0, false);
    return this.anchors.add<PipeHorizontal>({ kind: 'pipeH', a: { x: ax, y, z: az }, b: { x: bx, y, z: bz }, hangHeight: y, radius });
  }

  /** Zipline cable from a (high end) to b. */
  zipline(a: P3, b: P3, color = '#2b2d30'): Zipline {
    const len = hyp2(b.x - a.x, b.z - a.z);
    const pitch = Math.atan2(a.y - b.y, len);
    this.box((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, 0.025, 0.025, hyp2(len, a.y - b.y), color, Math.atan2(b.x - a.x, b.z - a.z), pitch, false);
    return this.anchors.add<Zipline>({ kind: 'zipline', a: { ...a }, b: { ...b } });
  }

  /** Crawlable duct along `path` (feet height) with entry / exit grates. */
  duct(path: P3[], entry: Grate, exit: Grate, grates: Grate[] = []): Duct {
    return this.anchors.add<Duct>({ kind: 'duct', path: path.map((p) => ({ ...p })), entry, exit, grates });
  }

  windowAt(cx: number, cy: number, cz: number, w: number, h: number, yaw: number, opts: { sill?: number; breakable?: boolean; open?: boolean } = {}): WindowAnchor {
    return this.anchors.add<WindowAnchor>({ kind: 'window', c: { x: cx, y: cy, z: cz }, w, h, yaw, sillHeight: opts.sill ?? cy - h / 2, breakable: opts.breakable ?? true, open: opts.open ?? false });
  }

  door(hx: number, hy: number, hz: number, width: number, yaw: number, opts: { height?: number; swing?: 1 | -1; locked?: boolean; breachable?: boolean } = {}): Door {
    return this.anchors.add<Door>({ kind: 'door', hinge: { x: hx, y: hy, z: hz }, width, height: opts.height ?? 2.1, yaw, swing: opts.swing ?? 1, locked: opts.locked ?? false, breachable: opts.breachable ?? true });
  }

  /**
   * (3.2.0) A rappel point at a roof / mezzanine edge (x, z on the edge, `y` the roof's floor), the rope hanging out
   * along `yaw` (the wall's outward normal) down `length` to the floor below. A small anchor plate shows it.
   */
  rappel(x: number, y: number, z: number, yaw: number, length: number, color = '#3a3d40'): RappelPoint {
    const nx = Math.sin(yaw);
    const nz = Math.cos(yaw);
    this.box(x - nx * 0.25, y + 0.06, z - nz * 0.25, 0.3, 0.12, 0.3, color, yaw, 0, false);
    this.cylinders.push({ c: [x - nx * 0.25, y + 0.35, z - nz * 0.25], r: 0.04, h: 0.5, color, collide: false });
    return this.anchors.add<RappelPoint>({ kind: 'rappel', top: { x, y, z }, nx, nz, length });
  }

  /**
   * (3.2.0) A chain-link fence from (ax, az) to (bx, bz) on floor `y`, `height` tall: posts and a top rail (visual),
   * a see-through mesh panel, and a body that stops movement (never bullets or sight: not a level piece, so no cover,
   * ledges or voxels).
   */
  fence(ax: number, az: number, bx: number, bz: number, height: number, y = 0, color = '#7b8288'): Fence {
    const len = hyp2(bx - ax, bz - az);
    const tx = (bx - ax) / len;
    const tz = (bz - az) / len;
    const posts = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= posts; i++) {
      const t = (i / posts) * len;
      this.cylinders.push({ c: [ax + tx * t, y + height / 2, az + tz * t], r: 0.035, h: height, color, collide: false });
    }
    this.box((ax + bx) / 2, y + height - 0.02, (az + bz) / 2, 0.05, 0.05, len, color, Math.atan2(tx, tz), 0, false);
    return this.anchors.add<Fence>({ kind: 'fence', a: { x: ax, y, z: az }, b: { x: bx, y, z: bz }, height, tx, tz, nx: tz, nz: -tx, len });
  }

  private buildFences(scene: Scene, root: TransformNode, name: string, meshes: Mesh[]): void {
    const fc = new PhysicsShapeContainer(scene);
    const tex = new DynamicTexture(`fenceTex-${name}`, { width: 128, height: 128 }, scene, true);
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = '#b8c0c6';
    ctx.lineWidth = 5;
    // chain-link diamonds (two wires crossing, tiling)
    for (let k = -128; k <= 256; k += 32) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + 128, 128);
      ctx.moveTo(k + 128, 0);
      ctx.lineTo(k, 128);
      ctx.stroke();
    }
    tex.hasAlpha = true;
    tex.update();
    const mat = new StandardMaterial(`fenceMat-${name}`, scene);
    mat.diffuseTexture = tex;
    mat.useAlphaFromDiffuseTexture = true;
    mat.transparencyMode = 1;
    mat.backFaceCulling = false;
    mat.specularColor = Color3.Black();
    mat.freeze();
    for (const f of this.anchors.fences) {
      const yaw = Math.atan2(f.tx, f.tz);
      const cx = (f.a.x + f.b.x) / 2;
      const cz = (f.a.z + f.b.z) / 2;
      const q = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
      const fs = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(0.06, f.height, f.len), scene);
      fs.filterMembershipMask = G.FENCE;
      fs.filterCollideMask = 0xffffffff & ~(G.STATIC | G.FENCE);
      fc.addChild(fs, new Vector3(cx, f.a.y + f.height / 2, cz), q);
      const plane = CreatePlane(`fence-${f.id}`, { width: f.len, height: f.height, sideOrientation: 2 }, scene);
      plane.parent = root;
      plane.position.set(cx, f.a.y + f.height / 2, cz);
      plane.rotation.y = yaw + Math.PI / 2;
      plane.material = mat;
      const uv = plane.getVerticesData('uv');
      if (uv) {
        for (let i = 0; i < uv.length; i += 2) {
          uv[i] = uv[i]! * f.len * 4;
          uv[i + 1] = uv[i + 1]! * f.height * 4;
        }
        plane.setVerticesData('uv', uv);
      }
      plane.freezeWorldMatrix();
      meshes.push(plane);
    }
    fc.filterMembershipMask = G.FENCE;
    fc.filterCollideMask = 0xffffffff & ~(G.STATIC | G.FENCE);
    const fenceNode = new TransformNode(`fences-${name}`, scene);
    fenceNode.parent = root;
    const fb = new PhysicsBody(fenceNode, PhysicsMotionType.STATIC, false, scene);
    fb.shape = fc;
  }

  /** Manual ledge (in addition to the generated ones). */
  ledge(ax: number, az: number, bx: number, bz: number, top: number, opts: { drop?: number; canHang?: boolean; canClimbUp?: boolean } = {}): Ledge {
    return this.anchors.add<Ledge>(makeLedge(ax, az, bx, bz, top, opts));
  }

  /** Mark the pieces added since `from` (an index into `boxes`): overhead and / or without ledges. */
  mark(from: number, flags: { overhead?: boolean; noLedge?: boolean }): this {
    for (let k = from; k < this.boxes.length; k++) {
      const b = this.boxes[k]!;
      if (flags.overhead) b.overhead = true;
      if (flags.noLedge) b.noLedge = true;
    }
    return this;
  }

  /** No generated ledges within `r` of (x, z). */
  noLedge(x: number, z: number, r: number): this {
    this.noLedgeAt.push([x, z, r]);
    return this;
  }

  /** A light (lamp, spot, window glow...). */
  light(init: LightInit): this {
    this.lights.add(init);
    return this;
  }

  /** Mark a floor area's surface (`top` = its walking height). */
  surface(kind: Surface, minX: number, maxX: number, minZ: number, maxZ: number, top = 0): this {
    this.surfaces.push({ kind, minX, maxX, minZ, maxZ, top });
    return this;
  }

  /** A box with its own ambient light level (an unlit interior under a roof). */
  ambientZone(minX: number, maxX: number, minZ: number, maxZ: number, ambient: number, minY = -1, maxY = 8): this {
    this.lights.addZone({ minX, maxX, minY, maxY, minZ, maxZ, ambient });
    return this;
  }

  /**
   * Build the level. With an `atlas` (3.0) the pieces are PBR with the procedural surfaces (a per-instance `surf`
   * id: floors by what is underfoot, `floor` the map's default; the rest by colour); without, the flat shading.
   */
  build(scene: Scene, name: string, opts: { atlas?: SurfaceAtlas; floor?: Surface; detail?: TierQuality; voxelSize?: number; fineSize?: number; art?: VoxelArt | null } = {}): BuiltLevel {
    const root = new TransformNode(`level-${name}`, scene);
    // visual-only dressing (3.0): never collides, so nav / cover / ledges are unchanged
    // (a map with a voxel art layer dresses itself in voxels: the box dressing is only for the plain path)
    if (opts.detail && !(opts.voxelSize && opts.art)) this.boxes.push(...detailPieces(this.boxes, name, opts.detail));
    // voxels (3.0): pieces thick enough become voxels; the rest stay thin-instanced boxes / cylinders
    const voxels = opts.voxelSize ? levelVoxels(this.boxes, this.cylinders, this.surfaces, opts.floor ?? 'concrete', opts.voxelSize, undefined, opts.art ?? null, opts.fineSize ?? 0) : null;
    let mat: StandardMaterial | PBRMaterial;
    let surfacePlugin: SurfacePlugin | null = null;
    if (opts.atlas) {
      const pm = new PBRMaterial(`levelMat-${name}`, scene);
      pm.albedoColor = Color3.White();
      pm.metallic = 0;
      pm.roughness = 1;
      // the game's lights are tuned to range falloff
      pm.usePhysicalLightFalloff = false;
      // PBR divides diffuse by pi: the lights were authored for the standard material
      pm.directIntensity = Math.PI;
      pm.environmentIntensity = 0.6;
      // the probe's cube is not prefiltered: blur it by roughness on the fly
      pm.realTimeFiltering = renderOpts.iblFilter;
      surfacePlugin = new SurfacePlugin(pm, opts.atlas, 'world');
      mat = pm;
    } else {
      const sm = new StandardMaterial(`levelMat-${name}`, scene);
      sm.diffuseColor = Color3.White();
      sm.specularColor = Color3.Black();
      new LevelMaterialPlugin(sm);
      mat = sm;
    }
    mat.freeze();
    const floorDefault = opts.floor ?? 'concrete';
    // PBR shades in linear space: the authored (sRGB) colours are converted
    const lin = (c: [number, number, number]): [number, number, number] => (opts.atlas ? [c[0] ** 2.2, c[1] ** 2.2, c[2] ** 2.2] : c);
    const kindOf = (hex: string, sx: number, sy: number, sz: number, cx: number, top: number, cz: number): number =>
      SURFACE_ID[pieceKind(hex, sx, sy, sz, sy <= 0.35 ? surfaceAt(this.surfaces, cx, top, cz, floorDefault) : null)];

    const boxMesh = CreateBox(`lvl-box`, { size: 1 }, scene);
    const cylMesh = CreateCylinder(`lvl-cyl`, { diameter: 1, height: 1, tessellation: 12 }, scene);
    const meshes = [boxMesh, cylMesh];
    for (const m of meshes) {
      m.material = mat;
      m.parent = root;
      m.isPickable = false;
      m.receiveShadows = true;
    }

    const container = new PhysicsShapeContainer(scene);
    const unitQ = Quaternion.Identity();
    const tmpQ = new Quaternion();

    // Boxes
    const asMesh = (i: number): boolean => this.boxes[i]!.visible !== false && !voxels?.voxelBox[i];
    const shown = this.boxes.filter((_b, i) => asMesh(i));
    const bm = new Float32Array(shown.length * 16);
    const bc = new Float32Array(shown.length * 4);
    const bs = new Float32Array(shown.length);
    const mtx = new Matrix();
    let vi = 0;
    this.boxes.forEach((b, i) => {
      Quaternion.RotationYawPitchRollToRef(b.yaw, b.pitch, 0, tmpQ);
      if (asMesh(i)) {
        Matrix.ComposeToRef(new Vector3(b.s[0], b.s[1], b.s[2]), tmpQ, new Vector3(b.c[0], b.c[1], b.c[2]), mtx);
        mtx.copyToArray(bm, vi * 16);
        const [r, g, bl] = lin(hexToRgb(b.color));
        // Subtle per-piece value jitter keeps large areas from looking flat.
        const j = 0.94 + (((i * 2654435761) % 1000) / 1000) * 0.1;
        bc.set([r * j, g * j, bl * j, 1], vi * 4);
        bs[vi] = kindOf(b.color, b.s[0], b.s[1], b.s[2], b.c[0], b.c[1] + b.s[1] / 2, b.c[2]);
        vi++;
      }
      if (b.collide) {
        const shape = new PhysicsShapeBox(Vector3.Zero(), unitQ, new Vector3(b.s[0], b.s[1], b.s[2]), scene);
        container.addChild(shape, new Vector3(b.c[0], b.c[1], b.c[2]), tmpQ.clone());
      }
    });
    boxMesh.thinInstanceSetBuffer('matrix', bm, 16, true);
    boxMesh.thinInstanceSetBuffer('color', bc, 4, true);
    if (opts.atlas) boxMesh.thinInstanceSetBuffer('surf', bs, 1, true);

    // Cylinders
    const cm = new Float32Array(Math.max(1, this.cylinders.length) * 16);
    const cc = new Float32Array(Math.max(1, this.cylinders.length) * 4);
    const cs = new Float32Array(Math.max(1, this.cylinders.length));
    let ci = 0;
    this.cylinders.forEach((c, i) => {
      if (!voxels?.voxelCyl[i]) {
        Matrix.ComposeToRef(new Vector3(c.r * 2, c.h, c.r * 2), unitQ, new Vector3(c.c[0], c.c[1], c.c[2]), mtx);
        mtx.copyToArray(cm, ci * 16);
        const [r, g, b] = lin(hexToRgb(c.color));
        cc.set([r, g, b, 1], ci * 4);
        cs[ci] = kindOf(c.color, c.r * 2, c.h, c.r * 2, c.c[0], c.c[1] + c.h / 2, c.c[2]);
        ci++;
      }
      if (c.collide) {
        const shape = new PhysicsShapeCylinder(new Vector3(0, -c.h / 2, 0), new Vector3(0, c.h / 2, 0), c.r, scene);
        container.addChild(shape, new Vector3(c.c[0], c.c[1], c.c[2]));
      }
    });
    if (ci) {
      cylMesh.thinInstanceSetBuffer('matrix', cm.subarray(0, ci * 16), 16, true);
      cylMesh.thinInstanceSetBuffer('color', cc.subarray(0, ci * 4), 4, true);
      if (opts.atlas) cylMesh.thinInstanceSetBuffer('surf', cs.subarray(0, ci), 1, true);
    } else {
      cylMesh.isVisible = false;
    }

    for (const m of meshes) {
      m.thinInstanceRefreshBoundingInfo(false);
      m.freezeWorldMatrix();
      m.doNotSyncBoundingInfo = true;
    }

    container.filterMembershipMask = G.STATIC;
    container.filterCollideMask = 0xffffffff & ~G.STATIC;
    container.material = { friction: 0.8, restitution: 0.05 };
    const body = new PhysicsBody(root, PhysicsMotionType.STATIC, false, scene);
    body.shape = container;
    // (3.2.0) fences: their own body (stops movement; bullets, sight and the level probes pass) and mesh panels
    if (this.anchors.fences.length) this.buildFences(scene, root, name, meshes);

    const coverSegments = buildCoverSegments(this.boxes, this.cylinders);
    // ledges from box tops; lips whose hang point would be outside the play area are dropped
    const anchors = this.anchors;
    generateLedges(this.boxes, anchors);
    const bd = this.bounds;
    for (const l of anchors.ledges) {
      if (l.piece === 0) continue;
      const mx = (l.a.x + l.b.x) / 2 + l.nx * 0.5;
      const mz = (l.a.z + l.b.z) / 2 + l.nz * 0.5;
      if (mx < bd.minX || mx > bd.maxX || mz < bd.minZ || mz > bd.maxZ) l.canHang = l.canClimbUp = false;
    }
    for (const [x, z, r] of this.noLedgeAt) suppressLedgesNear(anchors, x, z, r);
    // (3.2.0) split jump gaps between tall walls facing each other (after every other anchor: ids stay stable)
    for (const g of findSplitGaps(coverSegments)) {
      const mx = (g.a.x + g.b.x) / 2;
      const mz = (g.a.z + g.b.z) / 2;
      if (mx < bd.minX || mx > bd.maxX || mz < bd.minZ || mz > bd.maxZ) continue;
      anchors.add<SplitAnchor>({ kind: 'split', ...g });
    }
    const cover: CoverPoint[] = coverPointsFromSegments(coverSegments, COVER_STANDOFF).map((p) => ({
      pos: new Vector3(p.x, p.y, p.z),
      normal: new Vector3(p.nx, 0, p.nz),
      low: p.low,
      seg: p.seg,
      s: p.s,
    }));
    return {
      root,
      body,
      meshes,
      boxes: this.boxes,
      cylinders: this.cylinders,
      cover,
      coverSegments,
      anchors,
      lights: this.lights,
      surfaces: this.surfaces,
      bounds: this.bounds,
      surfacePlugin,
      voxels,
      light: canonicalLightSet(this.boxes, this.cylinders, name),
      dispose: () => {
        body.dispose();
        container.dispose();
        for (const m of meshes) m.dispose();
        mat.dispose();
        root.dispose();
      },
    };
  }
}
