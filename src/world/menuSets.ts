// (menu-ui slice 6) The cinematic menu background: hero shots of Wren in a black void (Michael 2026-10-19; a style
// reference only, no rooms or set pieces). Each shot is a camera pass (arc, crane, track, tilt, orbit, push: a start and
// an end pose eased over the shot, with its own lens) and a light pass (rims, a narrow raking key, a moving sweep, the
// goggle powering on). Everything is built once at menu start: a shot change only moves the three shared spot lights
// and the camera, so nothing is built or compiled per shot.
import {
  type AbstractMesh,
  Color3,
  CreateCylinder,
  CreateDisc,
  CreatePlane,
  DynamicTexture,
  type Mesh,
  type Scene,
  StandardMaterial,
  Vector3,
  VertexBuffer,
} from '../core/babylon';

type V3 = [number, number, number];

/** One of the three shared spots: 0 key, 1 rim, 2 second rim. Positions relative to Wren's feet; she faces -z (towards
 *  the default camera), so her right is -x and her back is +z. `to` / `atTo`: the lamp / its aim travel over the shot. */
export interface SetLight {
  pos: V3;
  at: V3;
  /** Full cone angle (rad). */
  angle: number;
  exponent: number;
  intensity: number;
  color: V3;
  to?: V3;
  /** The aim travels there over the shot (a beam sweeping across from a fixed lamp). */
  atTo?: V3;
}

/** A camera pose: arc rotate angles (`alpha` is added to -PI/2, so 0 is straight in front of her, + towards her left,
 *  PI behind; `beta` < PI/2 looks down, > PI/2 looks up), distance, and the point looked at (relative to her feet). */
export interface CamPose {
  alpha: number;
  beta: number;
  radius: number;
  target: V3;
}

export interface HeroShot {
  id: string;
  /** Vertical field of view (rad): a long lens is small. */
  fov: number;
  /** Depth of field focal length (mm, where the preset has depth of field): longer = a shallower field. Default 50. */
  lensMm?: number;
  /** A dutch roll (rad, + clockwise on screen), subtle. */
  roll?: number;
  from: CamPose;
  to: CamPose;
  /** Where Wren sits across the frame: 0 centre, 1 the right edge (keeps the menu list over black on the left). */
  frameX: number;
  lights: [SetLight, SetLight, SetLight];
  /** The goggle powers on over this part of the shot (t from, t to); absent = on throughout. */
  goggleOn?: [number, number];
  /** The light (index) thrown by the goggle: its intensity follows the goggle level. */
  glowLight?: number;
  /** A faint glow card far behind her (relative to her feet), seen past the silhouette. */
  backGlow?: { pos: V3; size: number; level: number };
}

/** The void: Wren's place in the scene (far from today's stage). */
export const VOID_ORIGIN = new Vector3(100, 0, 0);
/** Wren faces the default camera. */
export const VOID_YAW = Math.PI;

const KEY: V3 = [1, 0.9, 0.78];
const RIM: V3 = [0.62, 0.78, 1];
/** The goggle's green, for the light it throws on the brow and cheeks. */
const NV: V3 = [0.45, 1, 0.55];
const DEG = Math.PI / 180;

/** A light at azimuth `az` (arc rotate convention, round Wren) and elevation `el`, `d` m from `t`, aimed at it. */
function around(t: V3, az: number, el: number, d: number, angle: number, intensity: number, color: V3, sweep?: V3): SetLight {
  const c = Math.cos(el) * d;
  const l: SetLight = { pos: [t[0] + Math.cos(az) * c, t[1] + Math.sin(el) * d, t[2] + Math.sin(az) * c], at: t, angle, exponent: 4, intensity, color };
  if (sweep) {
    l.at = [t[0] - sweep[0], t[1] - sweep[1], t[2] - sweep[2]];
    l.atTo = [t[0] + sweep[0], t[1] + sweep[1], t[2] + sweep[2]];
  }
  return l;
}

/**
 * The macro rig for an equipment shot: a narrow key raking in about 95 degrees round from the lens (`side` +1 / -1
 * picks the side; it skims the surface so the normal detail and edges catch), a rim from behind the piece, a weaker
 * rim the other side. `sweep`: the key's aim travels across the piece (from target - sweep to target + sweep).
 */
function macro(target: V3, camAlpha: number, side: number, key: number, keyUp: number, sweep?: V3): [SetLight, SetLight, SetLight] {
  const cam = -Math.PI / 2 + camAlpha;
  return [
    around(target, cam + side * 1.65, keyUp, 0.85, 0.34, key, KEY, sweep),
    around(target, cam - side * 2.7, 0.3, 0.9, 0.5, 7, RIM),
    around(target, cam + side * 2.6, 0.2, 0.9, 0.5, 2.5, RIM),
  ];
}

function equip(id: string, fov: number, from: CamPose, to: CamPose, lights: [SetLight, SetLight, SetLight], lensMm?: number, roll = 0): HeroShot {
  return { id, fov: fov * DEG, from, to, frameX: 0.3, lights, lensMm, roll };
}

/** The title's light (also the main menu's opening hold): a low-key face, a rim, and the goggle's green thrown on the
 *  brow and cheeks (light 2, scaled by the goggle level). */
const FACE: [SetLight, SetLight, SetLight] = [
  { pos: [0.5, 1.85, -0.8], at: [0, 1.56, -0.05], angle: 0.5, exponent: 3, intensity: 2.7, color: KEY },
  { pos: [-0.65, 1.85, 0.55], at: [0, 1.64, 0], angle: 0.5, exponent: 3, intensity: 9, color: RIM },
  { pos: [0, 1.57, -0.3], at: [0, 1.53, 0], angle: 0.7, exponent: 2, intensity: 0.22, color: NV },
];

/**
 * T1 the title: Wren facing the lens, the face and goggle filling the frame right of centre; the goggle flickers on.
 * T2 the main menu's opening: the same shot carried on from the title (no cut), easing back a touch to clear the list,
 * held, before the equipment shots. H1-H6 equipment and armour macros (Michael: hard tactical pieces only, no straps or clothing), each its own angle,
 * lens and pass, none straight on.
 */
export const HERO_SHOTS: readonly HeroShot[] = [
  {
    id: 'T1',
    fov: 22 * DEG,
    from: { alpha: -0.22, beta: 1.58, radius: 1.0, target: [0, 1.585, -0.04] },
    to: { alpha: -0.15, beta: 1.57, radius: 0.92, target: [0, 1.59, -0.04] },
    frameX: 0.32,
    lights: FACE,
    goggleOn: [0.12, 0.36],
    glowLight: 2,
  },
  {
    id: 'T2',
    fov: 22 * DEG,
    from: { alpha: -0.15, beta: 1.57, radius: 0.92, target: [0, 1.59, -0.04] },
    to: { alpha: -0.26, beta: 1.58, radius: 1.08, target: [0, 1.585, -0.04] },
    frameX: 0.36,
    lights: FACE,
    glowLight: 2,
  },
  // the goggle housing and its mount: low from her left front, a long lens arcing in
  equip('H1', 18, { alpha: 0.85, beta: 1.68, radius: 0.66, target: [0.03, 1.565, -0.17] }, { alpha: 0.55, beta: 1.64, radius: 0.6, target: [0.02, 1.565, -0.18] }, macro([0.02, 1.6, -0.12], 0.7, 1, 2.2, 0.9), 62, 0.07),
  // the plate carrier's front plate: low from her left, pushing in while the key slides down the plate
  equip('H2', 22, { alpha: 0.75, beta: 1.72, radius: 0.75, target: [0.02, 1.22, -0.13] }, { alpha: 0.62, beta: 1.68, radius: 0.64, target: [0.02, 1.22, -0.14] }, macro([0.02, 1.22, -0.13], 0.7, -1, 4, 0.8, [0, 0.07, 0])),
  // the magazine pouches on the carrier: low from her right, sliding across while the key sweeps over them
  equip('H3', 22, { alpha: -0.7, beta: 1.74, radius: 0.72, target: [-0.05, 1.06, -0.13] }, { alpha: -0.55, beta: 1.7, radius: 0.68, target: [-0.02, 1.06, -0.14] }, macro([-0.03, 1.06, -0.13], -0.62, 1, 7, 0.5, [0.06, 0, 0]), undefined, -0.09),
  // the belt pouches: low three-quarter from her left, sliding along the belt under a grazing beam
  equip('H4', 20, { alpha: 0.45, beta: 1.68, radius: 0.82, target: [-0.05, 0.9, -0.12] }, { alpha: 0.35, beta: 1.66, radius: 0.76, target: [-0.15, 0.9, -0.13] }, macro([-0.09, 0.87, -0.12], 0.4, -1, 3.5, 0.25, [0.12, 0, -0.04])),
  // the thigh holster and pocket on the right leg: from her right, arcing round the front
  equip('H5', 22, { alpha: -1.35, beta: 1.62, radius: 0.7, target: [-0.17, 0.72, -0.02] }, { alpha: -1.0, beta: 1.58, radius: 0.66, target: [-0.17, 0.74, -0.04] }, macro([-0.17, 0.73, -0.03], -1.18, -1, 2.6, 0.7), undefined, 0.12),
  // the back plate and the kit on it: high from behind her left shoulder, arcing round
  equip('H6', 26, { alpha: 2.55, beta: 1.2, radius: 0.95, target: [0.02, 1.25, 0.12] }, { alpha: 2.95, beta: 1.25, radius: 0.88, target: [0, 1.25, 0.12] }, macro([0.01, 1.25, 0.12], 2.75, 1, 7.5, 1.15)),
];

/** A visible light cone: additive, fading from the lamp to its far end (apex at the origin, along -Y). */
export function lightCone(scene: Scene, name: string, len: number, half: number, color: V3, glow: number): Mesh {
  const cone = CreateCylinder(name, { height: len, diameterTop: 0.08, diameterBottom: 2 * len * Math.tan(half), tessellation: 32, subdivisions: 10, cap: 0 }, scene);
  const pos = cone.getVerticesData(VertexBuffer.PositionKind)!;
  const cols = new Float32Array((pos.length / 3) * 4);
  for (let i = 0; i < pos.length / 3; i++) {
    // brightest just below the lamp, fading out towards the floor
    const t = (pos[i * 3 + 1]! + len / 2) / len;
    cols.set([1, 1, 1, Math.pow(t, 2) * (1 - Math.pow(t, 12))], i * 4);
  }
  cone.setVerticesData(VertexBuffer.ColorKind, cols);
  cone.hasVertexAlpha = true;
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.disableLighting = true;
  mat.diffuseColor = Color3.Black();
  mat.specularColor = Color3.Black();
  mat.emissiveColor = new Color3(color[0] * glow, color[1] * glow, color[2] * glow);
  mat.alphaMode = 1; // ALPHA_ADD
  mat.disableDepthWrite = true;
  mat.backFaceCulling = false;
  cone.material = mat;
  cone.isPickable = false;
  return cone;
}

export interface VoidSet {
  meshes: AbstractMesh[];
  /** The back glow card (placed and faded per shot). */
  glow: Mesh;
  /** Its gradient; `level` is the glow strength. */
  glowTex: DynamicTexture;
}

/** The void's geometry: a near-black floor under Wren so the boots have contact, and the back glow card. */
export function buildVoid(scene: Scene): VoidSet {
  const floor = CreateDisc('menuVoidFloor', { radius: 0.9, tessellation: 32 }, scene);
  floor.rotation.x = Math.PI / 2;
  floor.position.copyFrom(VOID_ORIGIN);
  const m = new StandardMaterial('menuVoidFloorMat', scene);
  m.diffuseColor = Color3.FromHexString('#060607');
  m.specularColor = new Color3(0.02, 0.02, 0.02);
  floor.material = m;
  // the glow card: a soft radial gradient, additive, facing the camera
  const tex = new DynamicTexture('menuBeam-glowTex', { width: 128, height: 128 }, scene, true);
  const c = tex.getContext() as unknown as CanvasRenderingContext2D;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#7f7f7f');
  g.addColorStop(1, '#000000');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  tex.update();
  const glow = CreatePlane('menuBeam-backGlow', { size: 1 }, scene);
  glow.billboardMode = 7; // BILLBOARDMODE_ALL
  const gm = new StandardMaterial('menuBeam-backGlowMat', scene);
  gm.disableLighting = true;
  gm.emissiveTexture = tex;
  gm.emissiveColor = new Color3(0, 0, 0);
  gm.diffuseColor = Color3.Black();
  gm.specularColor = Color3.Black();
  gm.alphaMode = 1; // ALPHA_ADD
  gm.disableDepthWrite = true;
  glow.material = gm;
  glow.isPickable = false;
  glow.receiveShadows = false;
  tex.level = 0;
  return { meshes: [floor], glow, glowTex: tex };
}

/** The idle sway the stage adds on top of the rig's breathing idle (pure): a slow yaw drift (rad). */
export function idleSway(t: number): number {
  return Math.sin(t * 0.35) * 0.025 + Math.sin(t * 0.83) * 0.008;
}
