/**
 * The facility kit (marlow-final M5; pure, no Babylon at run time): the reusable pieces that turn a greybox into the
 * luxury training hall of Marlow Yard (charcoal composite cladding, brushed trims, LED coves and slots, clear and
 * frosted glazing, motorised sliding doors, column cladding, the instructor gallery's glass balustrade). Design and
 * rules: docs/marlow-final/KIT.md.
 *
 * Meshes: one GLB built offline by `npm run kit:build` (scripts/facility-kit/py/build_kit.py, Blender 5.2.2
 * headless) into src/world/kit/assets/facility-kit.glb, drawn by `kitRender.ts`, one thin-instanced mesh per (piece,
 * material).
 *
 * Collision (gameplay never reads the kit's meshes): a map builder places kit pieces through `FacilityKit`, which
 * writes the gameplay piece into the `LevelBuilder` itself - the same box a greybox would have (collision, cover,
 * ledges, nav, the canonical light shapes, the shadow casters) - and records the visual instances over it. Skins sit
 * on the box faces (<= 6 cm proud, never inside the play space's 0.3 m capsule standoff), so nothing a player touches
 * differs from the box. Glass and balustrades are collision-only boxes (out of the light shapes: light passes them in
 * the bake, the meter, the guards and the picture alike, as the roof sheets). Trims, skirting and slots have no
 * collision. Sliding doors are the existing hinged `Door` (collision while closed, light, sight, sound, gates, co-op)
 * with `leaf: 'slide'`: only the drawn leaf changes.
 */
import type { Door } from '../anchors';
import type { LightInit } from '../lights';

export const KIT_PIECES = ['wallPanel', 'wallUpper', 'glassClear', 'glassFrosted', 'doorFrame', 'doorJamb', 'doorLeaf', 'ledSlot', 'skirting', 'column', 'handrail'] as const;
export type KitPiece = (typeof KIT_PIECES)[number];

/** The GLB's materials (`<piece>.<material>` meshes). */
export const KIT_MATERIALS = ['composite', 'metal', 'metalDark', 'reveal', 'glass', 'frosted', 'led', 'status'] as const;
export type KitMaterial = (typeof KIT_MATERIALS)[number];

/** Each piece's module in its own frame (m): x along the run, y up, z out of the face (build_kit.py). */
export const KIT_MODULE: Record<KitPiece, { x: number; y: number; z: number }> = {
  wallPanel: { x: 1.2, y: 3.0, z: 0.06 },
  wallUpper: { x: 1.2, y: 1.5, z: 0.03 },
  glassClear: { x: 1.5, y: 3.0, z: 0.08 },
  glassFrosted: { x: 1.5, y: 3.0, z: 0.08 },
  doorFrame: { x: 2.0, y: 2.42, z: 0.092 },
  doorJamb: { x: 2.0, y: 2.1, z: 1.0 },
  doorLeaf: { x: 1.0, y: 2.08, z: 0.044 },
  ledSlot: { x: 1.0, y: 0.045, z: 0.08 },
  skirting: { x: 1.0, y: 0.12, z: 0.022 },
  column: { x: 1.0, y: 3.0, z: 1.0 },
  handrail: { x: 1.5, y: 1.025, z: 0.07 },
};

/** Triangle budget per module (the build report test holds every piece under it). */
export const KIT_TRI_BUDGET: Record<KitPiece, number> = {
  wallPanel: 400,
  wallUpper: 80,
  glassClear: 300,
  glassFrosted: 300,
  doorFrame: 300,
  doorJamb: 60,
  doorLeaf: 300,
  ledSlot: 200,
  skirting: 120,
  column: 800,
  handrail: 300,
};

/** The material looks (sRGB hex, as the level's colours; the renderer converts to linear). */
export const KIT_LOOK: Record<KitMaterial, { color: string; roughness: number; metallic: number; alpha?: number; emissive?: boolean }> = {
  composite: { color: '#2a2d31', roughness: 0.55, metallic: 0.05 },
  metal: { color: '#b9bdc1', roughness: 0.3, metallic: 0.9 },
  metalDark: { color: '#3b3e42', roughness: 0.4, metallic: 0.75 },
  reveal: { color: '#0e0f10', roughness: 0.9, metallic: 0 },
  glass: { color: '#9fb8bf', roughness: 0.05, metallic: 0, alpha: 0.14 },
  frosted: { color: '#dde4e6', roughness: 0.55, metallic: 0, alpha: 0.68 },
  led: { color: '#ffffff', roughness: 1, metallic: 0, emissive: true },
  status: { color: '#ffffff', roughness: 1, metallic: 0, emissive: true },
};

/** Colour of a kit wall / column box (the greybox seen in the 12 mm panel joints and on the `?gfx=min` path). */
export const KIT_BOX_COLOR = '#17191b';
/** Colour of the collision-only glass / balustrade boxes (never drawn; the minimap may show it). */
export const KIT_GLASS_COLOR = '#9fb8bf';
/** Positions snap to this grid (m): 5 cm, a tenth of the nav cell. */
export const KIT_SNAP = 0.05;
/** How far a wall panel's face stands off the wall box (m): skirting on a clad wall sits on it. */
export const KIT_PANEL_DEPTH = 0.03;

export type LedTone = 'warm' | 'cool' | 'white';
/** LED colours (linear-ish emissive, x `LED_GAIN` when drawn): warm 3000 K, cool 5000 K. */
export const LED_TONES: Record<LedTone, [number, number, number]> = { warm: [1.0, 0.8, 0.58], cool: [0.7, 0.85, 1.0], white: [0.96, 0.97, 1.0] };
export const LED_GAIN = 1.6;
/** Door status bar colours (unlocked, locked). */
export const STATUS_OPEN: [number, number, number] = [0.25, 1.0, 0.45];
export const STATUS_LOCKED: [number, number, number] = [1.0, 0.18, 0.12];

/** A linear LED slot that is a real light is split into lights of at most this length (m): one bake light each. */
export const SLOT_SEGMENT = 2.4;
/** The slot's diffuser: its centre under the slot's top (m) and its size across and through (m). */
export const SLOT_DIFFUSER = { drop: 0.0275, width: 0.05, thick: 0.005 };

/** One drawn kit piece: its origin in the world, a yaw about +y (Babylon's: local +z -> (sin, 0, cos)) and the scale
 *  of its module on each local axis. */
export interface KitInstance {
  piece: KitPiece;
  x: number;
  y: number;
  z: number;
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
  /** The `led` mesh's colour. */
  tone: LedTone;
  /** The `led` mesh lights only while this lamp circuit has a lit lamp (none: always on, an accent line). */
  group?: number;
  /** The `led` mesh is drawn by a real light's fixture box instead (a slot that is a light): skipped. */
  noLed?: boolean;
  /** Door pieces: the `Door` anchor id they follow (leaves slide by its open state; the frame's bar shows its lock). */
  door?: number;
  /** Door leaf: the side it slides to (-1 local -x, +1 local +x). */
  side?: -1 | 1;
}

/** A kit sliding door: the anchor it follows and its opening (centre, piece yaw, width). */
export interface KitDoor {
  door: number;
  x: number;
  y: number;
  z: number;
  /** The pieces' yaw (local +x along the opening). */
  yaw: number;
  width: number;
  height: number;
}

export interface KitLayout {
  instances: KitInstance[];
  doors: KitDoor[];
}

/** What the kit writes into (a `LevelBuilder`; structural, so this module stays Babylon-free). */
export interface KitBuilder {
  readonly boxes: readonly unknown[];
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: string, yaw?: number, pitch?: number, collide?: boolean, visible?: boolean): unknown;
  door(hx: number, hy: number, hz: number, width: number, yaw: number, opts?: { height?: number; swing?: 1 | -1; locked?: boolean; breachable?: boolean; leaf?: 'swing' | 'slide' }): Door;
  light(init: LightInit): unknown;
  mark(from: number, flags: { overhead?: boolean; noLedge?: boolean }): unknown;
}

// ----------------------------------------------------------------------------------------------------------- maths

export const snap = (v: number, step = KIT_SNAP): number => Math.round(v / step) * step;

/** The nearest multiple of 90 degrees (LED slots that are lights: their fixture boxes are axis-aligned). */
export function snapYaw(yaw: number): number {
  const q = Math.PI / 2;
  const r = Math.round(yaw / q) * q;
  // fold -0 and 2 pi onto the same values
  const t = ((r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(t - 2 * Math.PI) < 1e-9 ? 0 : t;
}

/** A run of `len` metres in modules of `module`: how many and the stretch on each (whole modules, never gaps; the
 *  count whose stretch is nearest 1 by ratio, so a run of 3+ modules stretches by at most 1/6). */
export function tileRun(len: number, module: number): { n: number; scale: number; step: number } {
  const lo = Math.max(1, Math.floor(len / module));
  const hi = lo + 1;
  const n = Math.abs(Math.log(len / (lo * module))) <= Math.abs(Math.log(len / (hi * module))) ? lo : hi;
  return { n, scale: len / (n * module), step: len / n };
}

/** The yaw whose local +x runs from (x1, z1) towards (x2, z2). */
export const runYaw = (dx: number, dz: number): number => Math.atan2(-dz, dx);

/** A point of a piece's local frame (module units, before its scale) in the world. */
export function kitToWorld(inst: Pick<KitInstance, 'x' | 'y' | 'z' | 'yaw' | 'sx' | 'sy' | 'sz'>, lx: number, ly: number, lz: number): [number, number, number] {
  const c = Math.cos(inst.yaw);
  const s = Math.sin(inst.yaw);
  const px = lx * inst.sx;
  const pz = lz * inst.sz;
  return [inst.x + px * c + pz * s, inst.y + ly * inst.sy, inst.z - px * s + pz * c];
}

/** The instance's world matrix (Babylon's layout: scale, then the yaw, then the position) into `out` at `o`. */
export function kitMatrix(inst: Pick<KitInstance, 'x' | 'y' | 'z' | 'yaw' | 'sx' | 'sy' | 'sz'>, out: Float32Array, o: number): void {
  const c = Math.cos(inst.yaw);
  const s = Math.sin(inst.yaw);
  out[o] = inst.sx * c;
  out[o + 1] = 0;
  out[o + 2] = -inst.sx * s;
  out[o + 3] = 0;
  out[o + 4] = 0;
  out[o + 5] = inst.sy;
  out[o + 6] = 0;
  out[o + 7] = 0;
  out[o + 8] = inst.sz * s;
  out[o + 9] = 0;
  out[o + 10] = inst.sz * c;
  out[o + 11] = 0;
  out[o + 12] = inst.x;
  out[o + 13] = inst.y;
  out[o + 14] = inst.z;
  out[o + 15] = 1;
}

/** The motorised leaves' travel (0 shut .. 1 open) from the door's state: a smooth start and stop, the door-peek crack
 *  showing as a hand's-width part. Drawn only: collision, light and sight read the door's `open` as always. */
export function slideFraction(open: number, ajar: number): number {
  const t = Math.max(0, Math.min(1, Math.max(open, ajar)));
  return t * t * (3 - 2 * t);
}

/** Overlap of the two shut leaves at the meeting line (0: their brushed edge caps meet; any overlap z-fights), and the
 *  lip left showing when a leaf is in its pocket (m). */
export const LEAF_OVERLAP = 0;
export const LEAF_LIP = 0.03;

/** A leaf's centre along the opening (m from its centre, local +x) at travel `f`: shut at a quarter of the opening each
 *  side, open in the wall's pocket with `LEAF_LIP` showing. */
export function leafAlong(width: number, side: -1 | 1, f: number): number {
  return side * (width / 4 + f * (width / 2 - LEAF_LIP));
}

/** A leaf's centre (world x, z) at travel `f` (`leafAlong` on the opening's axis). */
export function leafPose(d: Pick<KitDoor, 'x' | 'z' | 'yaw' | 'width'>, side: -1 | 1, f: number): [number, number] {
  const along = leafAlong(d.width, side, f);
  return [d.x + along * Math.cos(d.yaw), d.z - along * Math.sin(d.yaw)];
}

/** Kit triangles a layout draws (per the build report's piece counts; `led` meshes a light draws are not counted). */
export function kitTriangles(layout: KitLayout, report: { pieces: Record<string, { meshes: Record<string, number> }> }): number {
  let n = 0;
  for (const i of layout.instances) {
    const p = report.pieces[i.piece];
    if (!p) continue;
    for (const [mat, t] of Object.entries(p.meshes)) if (!(i.noLed && mat === 'led')) n += t;
  }
  return n;
}

// ------------------------------------------------------------------------------------------------------- placement

export interface KitWallOpts {
  /** Wall box thickness (m): interior 0.3, exterior 0.45 (scale sheet). */
  thick?: number;
  /** Base height (m). */
  y?: number;
  /** Which faces get panels, walking from (x1, z1) to (x2, z2): 'right' is the face on the right hand. */
  faces?: 'both' | 'left' | 'right' | 'none';
  tone?: LedTone;
  /** Skirting with its LED line on the clad faces (default true). */
  skirting?: boolean;
  /** The LED lines' circuit (see `KitInstance.group`). */
  group?: number;
}

export interface KitSlotLight {
  radius?: number;
  intensity?: number;
  group?: number;
  /** Switchable by the jammer / EMP (default true). */
  electric?: boolean;
}

/**
 * The kit's placement API for map builders (`const kit = new FacilityKit(b)` ... `layout.kit = kit.layout`). Every
 * position is snapped to `KIT_SNAP`; yaws are radians. See docs/marlow-final/KIT.md for each call.
 */
export class FacilityKit {
  readonly instances: KitInstance[] = [];
  readonly doors: KitDoor[] = [];

  constructor(private b: KitBuilder) {}

  get layout(): KitLayout {
    return { instances: this.instances, doors: this.doors };
  }

  private add(i: Omit<KitInstance, 'tone'> & { tone?: LedTone }): KitInstance {
    const inst: KitInstance = { tone: 'warm', ...i };
    this.instances.push(inst);
    return inst;
  }

  /**
   * A clad wall between two floor points: the gameplay box (as `LevelBuilder.wall`, colour `KIT_BOX_COLOR`) and panel
   * runs (with skirting) on the chosen faces, up to `h` (wallUpper rows above 3.3 m).
   */
  wall(x1: number, z1: number, x2: number, z2: number, h: number, opts: KitWallOpts = {}): this {
    x1 = snap(x1);
    z1 = snap(z1);
    x2 = snap(x2);
    z2 = snap(z2);
    const t = opts.thick ?? 0.3;
    const y = opts.y ?? 0;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.1) return this;
    const wy = Math.atan2(dx, dz);
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;
    this.b.box(mx, y + h / 2, mz, t, h, len, KIT_BOX_COLOR, wy);
    const faces = opts.faces ?? 'both';
    const sides: number[] = faces === 'both' ? [1, -1] : faces === 'right' ? [1] : faces === 'left' ? [-1] : [];
    for (const s of sides) {
      // the face normal: the box's local +x (right hand) or -x
      const nx = s * Math.cos(wy);
      const nz = -s * Math.sin(wy);
      const yaw = Math.atan2(nx, nz);
      this.panelRun(mx + nx * (t / 2), mz + nz * (t / 2), len, yaw, h, y, opts.tone ?? 'warm', opts.group);
      if (opts.skirting !== false) this.skirtingRun(mx + nx * (t / 2 + KIT_PANEL_DEPTH), mz + nz * (t / 2 + KIT_PANEL_DEPTH), len, yaw, y, opts.tone ?? 'warm', opts.group);
    }
    return this;
  }

  /** Visual only: a panel run on an existing wall face. (x, z) is the run's centre on the face, `yaw` the face's outward
   *  normal (the run goes along local +x = (cos yaw, -sin yaw)), `h` the cladding height from `y`. */
  wallPanel(x: number, z: number, len: number, yaw: number, opts: { h?: number; y?: number; tone?: LedTone; group?: number } = {}): this {
    this.panelRun(snap(x), snap(z), len, yaw, opts.h ?? 3, opts.y ?? 0, opts.tone ?? 'warm', opts.group);
    return this;
  }

  /** Visual only: skirting with an LED toe-kick line on a face (as `wallPanel`); `standoff` off the face (on a clad
   *  wall: `KIT_PANEL_DEPTH`). */
  skirting(x: number, z: number, len: number, yaw: number, opts: { y?: number; tone?: LedTone; group?: number; standoff?: number } = {}): this {
    const so = opts.standoff ?? 0;
    this.skirtingRun(snap(x) + Math.sin(yaw) * so, snap(z) + Math.cos(yaw) * so, len, yaw, opts.y ?? 0, opts.tone ?? 'warm', opts.group);
    return this;
  }

  private panelRun(x: number, z: number, len: number, yaw: number, h: number, y: number, tone: LedTone, group: number | undefined): void {
    const run = tileRun(len, KIT_MODULE.wallPanel.x);
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const lower = Math.min(h, h > 3.3 ? 3 : h);
    const sy = lower / KIT_MODULE.wallPanel.y;
    const upper = h - lower;
    const rows = upper > 0.05 ? tileRun(upper, KIT_MODULE.wallUpper.y) : null;
    for (let i = 0; i < run.n; i++) {
      const tt = -len / 2 + (i + 0.5) * run.step;
      const px = x + tt * c;
      const pz = z - tt * s;
      this.add({ piece: 'wallPanel', x: px, y, z: pz, yaw, sx: run.scale, sy, sz: 1, tone, group });
      if (rows) for (let r = 0; r < rows.n; r++) this.add({ piece: 'wallUpper', x: px, y: y + lower + r * rows.step, z: pz, yaw, sx: run.scale, sy: rows.scale, sz: 1 });
    }
  }

  private skirtingRun(x: number, z: number, len: number, yaw: number, y: number, tone: LedTone, group: number | undefined): void {
    // one stretched instance per run (its profile does not change along x)
    this.add({ piece: 'skirting', x, y, z, yaw, sx: len / KIT_MODULE.skirting.x, sy: 1, sz: 1, tone, group });
  }

  /**
   * A glazed partition (the instructor gallery's windows, glass offices): a collision-only box `thick` deep (stops
   * movement, bullets and guard sight; not in the light shapes, so light passes as G45 has it for clear and frosted
   * glass) and 1.5 m modules with slim mullions, from `y` to `y + h`.
   */
  glass(x1: number, z1: number, x2: number, z2: number, h: number, opts: { frosted?: boolean; y?: number; thick?: number } = {}): this {
    x1 = snap(x1);
    z1 = snap(z1);
    x2 = snap(x2);
    z2 = snap(z2);
    const y = opts.y ?? 0;
    const t = opts.thick ?? 0.1;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.1) return this;
    const from = this.b.boxes.length;
    this.b.box((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2, t, h, len, KIT_GLASS_COLOR, Math.atan2(dx, dz), 0, true, false);
    this.b.mark(from, { noLedge: true });
    const yaw = runYaw(dx, dz);
    const run = tileRun(len, KIT_MODULE.glassClear.x);
    for (let i = 0; i < run.n; i++) {
      const tt = (i + 0.5) * run.step / len;
      this.add({ piece: opts.frosted ? 'glassFrosted' : 'glassClear', x: x1 + dx * tt, y, z: z1 + dz * tt, yaw, sx: run.scale, sy: h / KIT_MODULE.glassClear.y, sz: t / KIT_MODULE.glassClear.z });
    }
    return this;
  }

  /** The gallery's glass balustrade from (x1, z1) to (x2, z2) on a floor at `y`: a collision-only box `h` high (no
   *  ledge; a 1.0 m rail is not cover, scale sheet) and 1.5 m modules. */
  handrail(x1: number, z1: number, x2: number, z2: number, opts: { y?: number; h?: number; tone?: LedTone; group?: number } = {}): this {
    x1 = snap(x1);
    z1 = snap(z1);
    x2 = snap(x2);
    z2 = snap(z2);
    const y = opts.y ?? 0;
    const h = opts.h ?? 1.0;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.1) return this;
    const from = this.b.boxes.length;
    this.b.box((x1 + x2) / 2, y + h / 2, (z1 + z2) / 2, 0.1, h, len, KIT_GLASS_COLOR, Math.atan2(dx, dz), 0, true, false);
    this.b.mark(from, { noLedge: true });
    const yaw = runYaw(dx, dz);
    const run = tileRun(len, KIT_MODULE.handrail.x);
    for (let i = 0; i < run.n; i++) {
      const tt = (i + 0.5) * run.step / len;
      this.add({ piece: 'handrail', x: x1 + dx * tt, y, z: z1 + dz * tt, yaw, sx: run.scale, sy: h / 1.0, sz: 1, tone: opts.tone ?? 'cool', group: opts.group });
    }
    return this;
  }

  /** A clad column: the gameplay box (`w` x `d`, `h` high from `y`) and its cladding. */
  column(x: number, z: number, w: number, d: number, h: number, opts: { y?: number; tone?: LedTone; group?: number } = {}): this {
    x = snap(x);
    z = snap(z);
    const y = opts.y ?? 0;
    this.b.box(x, y + h / 2, z, w, h, d, KIT_BOX_COLOR);
    this.add({ piece: 'column', x, y, z, yaw: 0, sx: w, sy: h / KIT_MODULE.column.y, sz: d, tone: opts.tone ?? 'warm', group: opts.group });
    return this;
  }

  /**
   * A linear LED slot under a ceiling: (x, y, z) the run's centre at the ceiling's underside, `len` along local +x of
   * `yaw`. With `light` (default) it is a real light: one lamp per <= `SLOT_SEGMENT` m (snapped to 90 degrees, its
   * fixture box is the glowing diffuser, so the line goes dark with the lamp: jammer, EMP, switch, shot); `light:
   * false` is an accent line (no light, never in the bake).
   */
  ledSlot(x: number, y: number, z: number, len: number, yaw: number, opts: { tone?: LedTone; light?: KitSlotLight | false; group?: number } = {}): this {
    x = snap(x);
    z = snap(z);
    const tone = opts.tone ?? 'warm';
    const lit = opts.light !== false;
    const a = lit ? snapYaw(yaw) : yaw;
    this.add({ piece: 'ledSlot', x, y, z, yaw: a, sx: len / KIT_MODULE.ledSlot.x, sy: 1, sz: 1, tone, group: opts.group, noLed: lit });
    if (!lit) return this;
    const L = opts.light || {};
    const n = Math.max(1, Math.ceil(len / SLOT_SEGMENT - 1e-6));
    const seg = len / n;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const alongX = Math.abs(c) > 0.5;
    const col = LED_TONES[tone];
    for (let i = 0; i < n; i++) {
      const tt = -len / 2 + (i + 0.5) * seg;
      this.b.light({
        kind: 'lamp',
        x: x + tt * c,
        y: y - SLOT_DIFFUSER.drop,
        z: z - tt * s,
        radius: L.radius ?? 7,
        intensity: L.intensity ?? 0.9,
        color: [col[0], col[1], col[2]],
        electric: L.electric ?? true,
        destructible: true,
        group: L.group ?? -1,
        fixture: { sx: alongX ? seg - 0.004 : SLOT_DIFFUSER.width, sy: SLOT_DIFFUSER.thick, sz: alongX ? SLOT_DIFFUSER.width : seg - 0.004, oy: 0 },
      });
    }
    return this;
  }

  /**
   * A motorised double sliding door: the existing hinged `Door` anchor (collision while shut, light, sight, sound,
   * locks, gates and co-op unchanged) with its leaf drawn as two kit leaves sliding into the wall's pockets, a brushed
   * surround and motor head on both faces (a status bar: green unlocked, red locked), the opening's linings and, when
   * the wall is taller than the door, a lintel box over it. (x, z) is the opening's centre, `yaw` as
   * `LevelBuilder.door` (the shut leaf lies along (sin yaw, cos yaw)); the wall must run on at least `width / 2` past
   * each side (the pockets). Width 1.6 - 2.4 m (scale sheet double door: 1.8 or 2.0).
   */
  slidingDoor(x: number, z: number, width: number, yaw: number, opts: { y?: number; height?: number; wallThick?: number; wallH?: number; locked?: boolean; breachable?: boolean; lintel?: boolean } = {}): Door {
    x = snap(x);
    z = snap(z);
    const y = opts.y ?? 0;
    const height = opts.height ?? 2.1;
    const t = opts.wallThick ?? 0.3;
    const wallH = opts.wallH ?? 3;
    const ax = Math.sin(yaw);
    const az = Math.cos(yaw);
    const door = this.b.door(x - ax * width / 2, y, z - az * width / 2, width, yaw, { height, locked: opts.locked ?? false, breachable: opts.breachable ?? true, leaf: 'slide' });
    if (opts.lintel !== false && wallH > height + 0.01) this.b.box(x, y + (height + wallH) / 2, z, t, wallH - height, width, KIT_BOX_COLOR, yaw);
    // the pieces' yaw: local +x along the opening, local +z one face's normal
    const p = yaw - Math.PI / 2;
    const nx = Math.sin(p);
    const nz = Math.cos(p);
    const sx = width / KIT_MODULE.doorFrame.x;
    const sh = height / 2.1;
    for (const s of [1, -1]) this.add({ piece: 'doorFrame', x: x + nx * s * (t / 2), y, z: z + nz * s * (t / 2), yaw: s > 0 ? p : p + Math.PI, sx, sy: sh, sz: 1, door: door.id });
    this.add({ piece: 'doorJamb', x, y, z, yaw: p, sx, sy: sh, sz: t });
    const kd: KitDoor = { door: door.id, x, y, z, yaw: p, width, height };
    this.doors.push(kd);
    for (const side of [-1, 1] as const) {
      const [lx, lz] = leafPose(kd, side, 0);
      this.add({ piece: 'doorLeaf', x: lx, y, z: lz, yaw: p, sx: (width / 2 + LEAF_OVERLAP) / KIT_MODULE.doorLeaf.x, sy: (height - 0.02) / KIT_MODULE.doorLeaf.y, sz: 1, door: door.id, side });
    }
    return door;
  }
}
