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
  Mesh,
  VertexData,
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
import { G, glassMembership } from '../physics/groups';
import { LevelMaterialPlugin } from './levelMaterialPlugin';
import { markLampLevel } from './bakedLamps';
import { levelIsPbr, levelPbrMaterial } from './levelLitMaterial';
import { buildCoverSegments, coverPointsFromSegments, coverStandoff, type CoverSegment } from '../cover/coverData';
import { findSplitGaps } from '../player/splitJump';
import { MOVEMENT } from '../config/movement';
import { proportions } from '../player/proportions';
import { hyp2 } from '../core/mathx';
import { generateLedges, makeLedge, suppressLedgesNear, TraversalAnchors, type Fence, type RappelPoint, type SplitAnchor, type Door, type Duct, type Grate, type Ladder, type Ledge, type P3, type PipeHorizontal, type PipeVertical, type WindowAnchor, type Zipline } from './anchors';
import { LightRegistry, type LightInit } from './lights';
import { canonicalLightSet } from '../voxel/lightShapes';
import { sheetMesh, type SheetPiece } from './roofSheets';

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
  /** (artpol, art-kit P7) A campus art box (`writeArtBoxes`): the detail pass leaves it bare (its skin is the look). */
  art?: boolean;
  /** (guard-ai) Glass: 'clear' lets a guard's sight through, 'frosted' blocks it; hearing treats both as a wall.
   *  (E2, EW6) Light passes both (out of the canonical light shapes); a glass piece is never drawn as a solid box,
   *  never cover or a ledge, and its collision is its own body (`G.GLASS`: bodies stop, bullets pass). Place
   *  panes with `LevelBuilder.glass`. */
  glass?: 'clear' | 'frosted';
  /** (E10, A97) An armoured (bulletproof) glass pane: its body adds `G.GLASS_ARMOURED`, so player and enemy rounds stop
   *  on it (`MASK.PLAYER_SHOT` / `ENEMY_SHOT`) and never penetrate; light, sight (clear), hearing and bodies as plain glass. */
  armoured?: true;
}

/** (E2) A glass pane's depth (m): a fence's nav footprint (`navBuild`: 0.1), so a pane replaces a fence panel exactly. */
export const GLASS_THICK = 0.1;
/** (E2) The default glass colour (the minimap, the see-through mesh's tint). */
export const GLASS_COLOR = '#9fb8c4';
/** (E10) The pane bodies `buildGlass` makes: one per kind and armour. */
const GLASS_GROUPS = [
  { id: 'clear', kind: 'clear', armoured: false },
  { id: 'frosted', kind: 'frosted', armoured: false },
  { id: 'clear-armoured', kind: 'clear', armoured: true },
  { id: 'frosted-armoured', kind: 'frosted', armoured: true },
] as const;

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
  /** 3.6: the canonical light-bake shapes (packed), their bounds and hash - the same on every device and tier. */
  light: { shapes: Float32Array; lo: [number, number, number]; hi: [number, number, number]; hash: string };
  /**
   * (sector-redesign ART-KIT, render only) Stops drawing these boxes (indices into `boxes`): their `lvl-box` instance
   * matrices are zeroed, the buffer and the bounding info refreshed once. Never touches `BoxPiece` data, physics, cover,
   * nav or the light bake; a box drawn as voxels or not drawn is skipped. The campus art calls it for its box-hidden skins.
   */
  hidePieces(boxes: readonly number[]): void;
  /** (sector-redesign perf, render only) The translucent roof sheets (their collision boxes are in `body`). */
  sheets: readonly SheetPiece[];
  dispose(): void;
}

/** `LevelBuilder.build` / `prepare` options. */
export interface LevelBuildOptions {
  atlas?: SurfaceAtlas;
  floor?: Surface;
  detail?: TierQuality;
  dressing?: boolean;
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
  /** (warehouse-lamps) Translucent roof sheets (drawn as one see-through mesh; each also has a collision-only box). */
  readonly sheets: SheetPiece[] = [];
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
  lowWall(x: number, z: number, len: number, color: string, yaw = 0, h = 1.05, thick = 0.6): this {
    return this.box(x, h / 2, z, thick, h, len, color, yaw);
  }

  /** Full-height cover wall chunk. */
  highWall(x: number, z: number, len: number, color: string, yaw = 0, h = 2.6, thick = 0.5): this {
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

  door(hx: number, hy: number, hz: number, width: number, yaw: number, opts: { height?: number; swing?: 1 | -1; locked?: boolean; breachable?: boolean; leaf?: 'swing' | 'slide'; armoured?: boolean } = {}): Door {
    const d: Omit<Door, 'id'> = { kind: 'door', hinge: { x: hx, y: hy, z: hz }, width, height: opts.height ?? 2.1, yaw, swing: opts.swing ?? 1, locked: opts.locked ?? false, breachable: opts.breachable ?? true };
    // (marlow-final kit) only a sliding door carries the field: every other anchor stays as it was
    if (opts.leaf === 'slide') d.leaf = 'slide';
    // (E10) an armoured leaf: rounds stop on it, never through it (`doorMembership`); it opens, locks and bashes as any door
    if (opts.armoured) d.armoured = true;
    return this.anchors.add<Door>(d);
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
   * or ledges).
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

  /**
   * (E2, EW6) A glass pane from (ax, az) to (bx, bz) on floor `y`, `height` tall (DEC G45): `clear` passes light and
   * guard sight, `frosted` light only; bullets pass both unless `armoured` (E10: rounds stop, no penetration), hearing
   * treats both as a wall, bodies stop. One collision piece `GLASS_THICK` deep (the same nav footprint as a fence panel
   * on the same line), invisible as a box (`visible: false`: no solid mesh, cover, ledges or dressing), drawn as
   * a see-through pane.
   */
  glass(ax: number, az: number, bx: number, bz: number, height: number, y = 0, kind: 'clear' | 'frosted' = 'clear', color = GLASS_COLOR, opts: { armoured?: boolean } = {}): BoxPiece {
    const len = hyp2(bx - ax, bz - az);
    const p: BoxPiece = {
      c: [(ax + bx) / 2, y + height / 2, (az + bz) / 2],
      s: [GLASS_THICK, height, len],
      yaw: Math.atan2((bx - ax) / len, (bz - az) / len),
      pitch: 0,
      color,
      collide: true,
      visible: false,
      noLedge: true,
      glass: kind,
    };
    if (opts.armoured) p.armoured = true;
    this.boxes.push(p);
    return p;
  }

  /** (E2) The glass panes: their own static body (`G.GLASS`, frosted also `G.GLASS_FROSTED`) and one see-through
   *  thin-instanced mesh per kind (not in `meshes`: no shadow caster, as the light bake has it). */
  private buildGlass(scene: Scene, root: TransformNode, name: string): { dispose(): void } | null {
    const panes = this.boxes.filter((b) => b.glass);
    if (!panes.length) return null;
    const out: { dispose(): void }[] = [];
    const q = new Quaternion();
    const mtx = new Matrix();
    for (const group of GLASS_GROUPS) {
      const kind = group.kind;
      const list = panes.filter((b) => b.glass === kind && !!b.armoured === group.armoured);
      if (!list.length) continue;
      const member = glassMembership(kind, group.armoured);
      const collide = 0xffffffff & ~(G.STATIC | G.GLASS | G.GLASS_FROSTED | G.GLASS_ARMOURED);
      const gc = new PhysicsShapeContainer(scene);
      const buf = new Float32Array(list.length * 16);
      list.forEach((b, i) => {
        Quaternion.RotationYawPitchRollToRef(b.yaw, b.pitch, 0, q);
        if (b.collide) {
          const s = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(b.s[0], b.s[1], b.s[2]), scene);
          s.filterMembershipMask = member;
          s.filterCollideMask = collide;
          gc.addChild(s, new Vector3(b.c[0], b.c[1], b.c[2]), q.clone());
        }
        Matrix.ComposeToRef(new Vector3(b.s[0], b.s[1], b.s[2]), q, new Vector3(b.c[0], b.c[1], b.c[2]), mtx);
        mtx.copyToArray(buf, i * 16);
      });
      gc.filterMembershipMask = member;
      gc.filterCollideMask = collide;
      const node = new TransformNode(`glass-${group.id}-${name}`, scene);
      node.parent = root;
      const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, scene);
      body.shape = gc;
      const mesh = CreateBox(`glass-${group.id}`, { size: 1 }, scene);
      const mat = new PBRMaterial(`glassMat-${group.id}-${name}`, scene);
      mat.albedoColor = Color3.FromHexString(kind === 'frosted' ? '#dfe7ea' : list[0]!.color).toLinearSpace();
      mat.metallic = 0;
      mat.roughness = kind === 'frosted' ? 0.6 : 0.08;
      // (E10) armoured glass reads a little heavier (render only; gameplay reads the collision bits)
      mat.alpha = kind === 'frosted' ? 0.6 : group.armoured ? 0.24 : 0.16;
      mat.usePhysicalLightFalloff = false;
      mat.backFaceCulling = false;
      mat.freeze();
      mesh.material = mat;
      mesh.parent = root;
      mesh.isPickable = false;
      mesh.thinInstanceSetBuffer('matrix', buf, 16, true);
      mesh.thinInstanceRefreshBoundingInfo(false);
      mesh.freezeWorldMatrix();
      out.push({
        dispose: () => {
          body.dispose();
          gc.dispose();
          mesh.dispose();
          mat.dispose();
        },
      });
    }
    return { dispose: () => out.forEach((o) => o.dispose()) };
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
    // (lr16pol B) PBR where the level is (its material is made before the fences): the guard torches light the wire
    // as the floor beside it (`levelLitMaterial.ts`); the standard path keeps the standard material
    let mat: StandardMaterial | PBRMaterial;
    if (levelIsPbr(scene)) {
      const pm = levelPbrMaterial(`fenceMat-${name}`, scene, Color3.White());
      pm.albedoTexture = tex;
      pm.useAlphaFromAlbedoTexture = true;
      mat = pm;
    } else {
      const sm = new StandardMaterial(`fenceMat-${name}`, scene);
      sm.diffuseTexture = tex;
      sm.useAlphaFromDiffuseTexture = true;
      sm.specularColor = Color3.Black();
      mat = sm;
    }
    mat.transparencyMode = 1;
    mat.backFaceCulling = false;
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
  mark(from: number, flags: { overhead?: boolean; noLedge?: boolean; art?: boolean }): this {
    for (let k = from; k < this.boxes.length; k++) {
      const b = this.boxes[k]!;
      if (flags.overhead) b.overhead = true;
      if (flags.noLedge) b.noLedge = true;
      if (flags.art) b.art = true;
    }
    return this;
  }

  /** No generated ledges within `r` of (x, z). */
  noLedge(x: number, z: number, r: number): this {
    this.noLedgeAt.push([x, z, r]);
    return this;
  }

  /**
   * (warehouse-lamps) A translucent corrugated roof sheet over the opening x0..x1, z0..z1 between y0 and y1: solid (a
   * collision-only box, overhead, no ledges) but out of the light shapes (collision-only pieces are not baked), so the
   * moon reaches the floor under it as before; drawn as a pale see-through ridged panel that casts no shadow.
   */
  sheet(x0: number, x1: number, z0: number, z1: number, y0: number, y1: number): this {
    this.sheets.push({ x0, x1, z0, z1, y: (y0 + y1) / 2, y0: Math.min(y0, y1), y1: Math.max(y0, y1) });
    this.boxes.push({ c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], s: [x1 - x0, y1 - y0, z1 - z0], yaw: 0, pitch: 0, color: '#d9ddd2', collide: true, visible: false, overhead: true, noLedge: true });
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
  /**
   * The Babylon-free part of `build` (smooth-world): the visual-only dressing pass and the canonical light shapes.
   * Call once per builder (it adds the dressing to `boxes`). Tests use it to prove the light shapes are the same on
   * every path.
   */
  prepare(name: string, opts: LevelBuildOptions = {}): { light: BuiltLevel['light'] } {
    // visual-only dressing (3.0): never collides, so nav / cover / ledges are unchanged
    // (a map with `detail: false` (MapDef, ON0b) gets none at any tier; the light shapes below agree)
    const dressing = opts.dressing !== false;
    if (dressing && opts.detail) this.boxes.push(...detailPieces(this.boxes, name, opts.detail));
    // (the canonical light shapes ignore the dressing added above)
    return { light: canonicalLightSet(this.boxes, this.cylinders, name, dressing) };
  }

  build(scene: Scene, name: string, opts: LevelBuildOptions = {}): BuiltLevel {
    const root = new TransformNode(`level-${name}`, scene);
    const { light } = this.prepare(name, opts);
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
      pm.realTimeFiltering = true;
      surfacePlugin = new SurfacePlugin(pm, opts.atlas, 'world');
      // (smooth-world) the baked lamps treat it as level, not a body: no night-vision fill cap
      markLampLevel(pm);
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
    const asMesh = (i: number): boolean => this.boxes[i]!.visible !== false && !this.boxes[i]!.glass;
    const shown = this.boxes.filter((_b, i) => asMesh(i));
    const bm = new Float32Array(shown.length * 16);
    const bc = new Float32Array(shown.length * 4);
    const bs = new Float32Array(shown.length);
    const mtx = new Matrix();
    // (ART-KIT) box index -> its `lvl-box` instance (-1: not drawn as a box), for `hidePieces`
    const instOf = new Int32Array(this.boxes.length).fill(-1);
    let vi = 0;
    this.boxes.forEach((b, i) => {
      Quaternion.RotationYawPitchRollToRef(b.yaw, b.pitch, 0, tmpQ);
      if (asMesh(i)) {
        instOf[i] = vi;
        Matrix.ComposeToRef(new Vector3(b.s[0], b.s[1], b.s[2]), tmpQ, new Vector3(b.c[0], b.c[1], b.c[2]), mtx);
        mtx.copyToArray(bm, vi * 16);
        const [r, g, bl] = lin(hexToRgb(b.color));
        // Subtle per-piece value jitter keeps large areas from looking flat.
        const j = 0.94 + (((i * 2654435761) % 1000) / 1000) * 0.1;
        bc.set([r * j, g * j, bl * j, 1], vi * 4);
        bs[vi] = kindOf(b.color, b.s[0], b.s[1], b.s[2], b.c[0], b.c[1] + b.s[1] / 2, b.c[2]);
        vi++;
      }
      // (E2) glass panes have their own body (`buildGlass`)
      if (b.collide && !b.glass) {
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
    this.cylinders.forEach((c) => {
      Matrix.ComposeToRef(new Vector3(c.r * 2, c.h, c.r * 2), unitQ, new Vector3(c.c[0], c.c[1], c.c[2]), mtx);
      mtx.copyToArray(cm, ci * 16);
      const [r, g, b] = lin(hexToRgb(c.color));
      cc.set([r, g, b, 1], ci * 4);
      cs[ci] = kindOf(c.color, c.r * 2, c.h, c.r * 2, c.c[0], c.c[1] + c.h / 2, c.c[2]);
      ci++;
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
    // (E2, EW6) the glass panes: their own body and see-through meshes
    const glass = this.buildGlass(scene, root, name);
    // (warehouse-lamps) the roof sheets: one see-through mesh, not in `meshes` (no shadow caster: the moon passes as the bake has it)
    let sheetMat: PBRMaterial | null = null;
    if (this.sheets.length) {
      const a = sheetMesh(this.sheets);
      const sm = new Mesh('roofSheets', scene);
      const vd = new VertexData();
      vd.positions = a.positions;
      vd.normals = a.normals;
      vd.indices = a.indices;
      vd.applyToMesh(sm, false);
      sheetMat = new PBRMaterial('roofSheetMat', scene);
      sheetMat.albedoColor = Color3.FromHexString('#dfe4da').toLinearSpace();
      sheetMat.metallic = 0;
      sheetMat.roughness = 0.45;
      sheetMat.alpha = 0.55;
      sheetMat.usePhysicalLightFalloff = false;
      sheetMat.directIntensity = Math.PI;
      sheetMat.backFaceCulling = false;
      sheetMat.twoSidedLighting = true;
      sm.material = sheetMat;
      sm.parent = root;
      sm.isPickable = false;
      sm.freezeWorldMatrix();
    }

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
      light,
      sheets: this.sheets,
      hidePieces:(ids: readonly number[]) => {
        let any = false;
        for (const i of ids) {
          const v = i >= 0 && i < instOf.length ? instOf[i]! : -1;
          if (v < 0) continue;
          bm.fill(0, v * 16, v * 16 + 16);
          any = true;
        }
        if (!any) return;
        // the matrix buffer is static: set it again (one upload), then the bounds once
        boxMesh.thinInstanceSetBuffer('matrix', bm, 16, true);
        boxMesh.thinInstanceRefreshBoundingInfo(false);
      },
      dispose: () => {
        body.dispose();
        container.dispose();
        for (const m of meshes) m.dispose();
        mat.dispose();
        sheetMat?.dispose();
        glass?.dispose();
        root.dispose();
      },
    };
  }
}
