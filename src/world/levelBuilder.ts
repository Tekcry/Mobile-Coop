import {
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
  StandardMaterial,
  TransformNode,
  Vector3,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import { LevelMaterialPlugin } from './levelMaterialPlugin';
import { buildCoverSegments, coverPointsFromSegments, coverStandoff, type CoverSegment } from '../cover/coverData';
import { MOVEMENT } from '../config/movement';
import { proportions } from '../player/proportions';

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
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
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
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz);
    return this.box((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2, thick, h, len, color, yaw);
  }

  /** Inclined slab rising `rise` over `len` along yaw. */
  ramp(x: number, z: number, w: number, len: number, rise: number, color: string, yaw = 0, y = 0, visible = true): this {
    const pitch = -Math.atan2(rise, len);
    const slope = Math.hypot(len, rise);
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

  build(scene: Scene, name: string): BuiltLevel {
    const root = new TransformNode(`level-${name}`, scene);
    const mat = new StandardMaterial(`levelMat-${name}`, scene);
    mat.diffuseColor = Color3.White();
    mat.specularColor = Color3.Black();
    new LevelMaterialPlugin(mat);
    mat.freeze();

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
    const shown = this.boxes.filter((b) => b.visible !== false);
    const bm = new Float32Array(shown.length * 16);
    const bc = new Float32Array(shown.length * 4);
    const mtx = new Matrix();
    let vi = 0;
    this.boxes.forEach((b, i) => {
      Quaternion.RotationYawPitchRollToRef(b.yaw, b.pitch, 0, tmpQ);
      if (b.visible !== false) {
        Matrix.ComposeToRef(new Vector3(b.s[0], b.s[1], b.s[2]), tmpQ, new Vector3(b.c[0], b.c[1], b.c[2]), mtx);
        mtx.copyToArray(bm, vi * 16);
        const [r, g, bl] = hexToRgb(b.color);
        // Subtle per-piece value jitter keeps large areas from looking flat.
        const j = 0.94 + (((i * 2654435761) % 1000) / 1000) * 0.1;
        bc.set([r * j, g * j, bl * j, 1], vi * 4);
        vi++;
      }
      if (b.collide) {
        const shape = new PhysicsShapeBox(Vector3.Zero(), unitQ, new Vector3(b.s[0], b.s[1], b.s[2]), scene);
        container.addChild(shape, new Vector3(b.c[0], b.c[1], b.c[2]), tmpQ.clone());
      }
    });
    boxMesh.thinInstanceSetBuffer('matrix', bm, 16, true);
    boxMesh.thinInstanceSetBuffer('color', bc, 4, true);

    // Cylinders
    const cm = new Float32Array(Math.max(1, this.cylinders.length) * 16);
    const cc = new Float32Array(Math.max(1, this.cylinders.length) * 4);
    this.cylinders.forEach((c, i) => {
      Matrix.ComposeToRef(new Vector3(c.r * 2, c.h, c.r * 2), unitQ, new Vector3(c.c[0], c.c[1], c.c[2]), mtx);
      mtx.copyToArray(cm, i * 16);
      const [r, g, b] = hexToRgb(c.color);
      cc.set([r, g, b, 1], i * 4);
      if (c.collide) {
        const shape = new PhysicsShapeCylinder(new Vector3(0, -c.h / 2, 0), new Vector3(0, c.h / 2, 0), c.r, scene);
        container.addChild(shape, new Vector3(c.c[0], c.c[1], c.c[2]));
      }
    });
    if (this.cylinders.length) {
      cylMesh.thinInstanceSetBuffer('matrix', cm, 16, true);
      cylMesh.thinInstanceSetBuffer('color', cc, 4, true);
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

    const coverSegments = buildCoverSegments(this.boxes, this.cylinders);
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
      bounds: this.bounds,
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
