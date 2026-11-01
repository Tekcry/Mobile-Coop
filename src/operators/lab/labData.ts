/**
 * Lighting rigs, quality presets and the pose list (pure, no Babylon), from the removed Operator Lab: the guard variety
 * sheet (`guardSheet.ts`) reads them. `ktx2RemoteUrls` is runtime code (`ktx2.ts`, used by the game).
 */
import type { RigPose } from '../../player/characterRig';

type RGB = readonly [number, number, number];

export interface LabLight {
  kind: 'dir' | 'point';
  /** Direction the light travels (dir) or position relative to the figure's feet (point), metres. */
  v: RGB;
  color: RGB;
  intensity: number;
  shadows?: boolean;
}

export interface LightRig {
  id: string;
  label: string;
  background: RGB;
  /** Hemispheric fill: sky, ground, intensity. */
  ambient: { sky: RGB; ground: RGB; intensity: number };
  lights: LabLight[];
  exposure: number;
  contrast: number;
  /** The goggle glow stand-in (and its small light) is lit. */
  glow: boolean;
  /** Night vision: a green monochrome image through the goggle. */
  nightVision: boolean;
  /** The goggle's small point light (glow spill); false keeps only the lens glow. Default on when `glow`. */
  glowLight?: boolean;
  /** The generated studio environment the metals reflect (lab.ts studioEnv, A78). */
  env?: boolean;
  /** False turns bloom off whatever the preset (calibrated rigs: no halo). */
  bloom?: boolean;
}

/*
 * Light directions (step 11 fix round 1, A80): `v` is the direction the light travels in the Lab frame, the figure
 * facing +Z and the camera at +Z for yaw 0. A front key travels -Z, a back rim travels +Z, a light from above has
 * v.y < 0. Before A80 the reader's winding made Babylon light every face from its inside (two-sided lighting flipped
 * the normals), so each rig acted as if its lights came from -v; the rigs below are re-aimed for the corrected faces.
 */

export const LIGHT_RIGS: readonly LightRig[] = [
  {
    id: 'studio', label: 'Neutral studio', background: [0.09, 0.095, 0.105],
    ambient: { sky: [0.8, 0.82, 0.86], ground: [0.35, 0.35, 0.37], intensity: 0.65 },
    lights: [
      { kind: 'dir', v: [-0.45, -0.6, -0.65], color: [1, 0.98, 0.95], intensity: 2.2, shadows: true },
      { kind: 'dir', v: [0.7, -0.3, 0.5], color: [0.7, 0.78, 0.95], intensity: 0.9 },
    ],
    exposure: 1.0, contrast: 1.05, glow: false, nightVision: false, env: true,
  },
  {
    id: 'raking', label: 'Raking light (detail check)', background: [0.03, 0.03, 0.035],
    ambient: { sky: [0.4, 0.45, 0.55], ground: [0.12, 0.12, 0.14], intensity: 0.4 },
    lights: [
      { kind: 'dir', v: [-1, -0.12, -0.35], color: [1, 0.93, 0.82], intensity: 7, shadows: true },
      { kind: 'dir', v: [0.5, -0.1, 0.85], color: [0.62, 0.75, 1], intensity: 1.2 },
    ],
    exposure: 0.6, contrast: 1.15, glow: false, nightVision: false,
  },
  {
    // Step 11 (A78, fix round 1): the close-up rig. Calibrated so values keep their order (ACES): an 18 % grey card
    // facing the key renders sRGB 0.50 (measured by lab.greyCard() and printed on every close-up), the suit's
    // 0.02-0.06 albedo facing the key about sRGB 0.12-0.24 and mostly below that under the raking key (near-black); the
    // raking key, the back rim and the generated environment separate the materials by relief and sheen.
    id: 'detail', label: 'Close-up detail (calibrated raking)', background: [0.02, 0.022, 0.026],
    ambient: { sky: [0.45, 0.5, 0.6], ground: [0.12, 0.12, 0.14], intensity: 0.35 },
    lights: [
      { kind: 'dir', v: [-1, -0.25, -0.45], color: [1, 0.94, 0.85], intensity: 2.0, shadows: true },
      { kind: 'dir', v: [0.45, -0.3, -0.85], color: [0.62, 0.75, 1], intensity: 0.6 },
      { kind: 'dir', v: [0.35, -0.2, 1], color: [0.85, 0.9, 1], intensity: 2.2 },
    ],
    exposure: 0.72, contrast: 1, glow: false, nightVision: false, env: true, bloom: false,
  },
  {
    // Step 11 (A78): the same rig mirrored front to back, for the close-ups seen from behind (back plate, belt back)
    id: 'detailRear', label: 'Close-up detail, rear key', background: [0.02, 0.022, 0.026],
    ambient: { sky: [0.45, 0.5, 0.6], ground: [0.12, 0.12, 0.14], intensity: 0.35 },
    lights: [
      { kind: 'dir', v: [1, -0.25, 0.45], color: [1, 0.94, 0.85], intensity: 2.0, shadows: true },
      { kind: 'dir', v: [-0.45, -0.3, 0.85], color: [0.62, 0.75, 1], intensity: 0.6 },
      { kind: 'dir', v: [-0.35, -0.2, -1], color: [0.85, 0.9, 1], intensity: 2.2 },
    ],
    exposure: 0.72, contrast: 1, glow: false, nightVision: false, env: true, bloom: false,
  },
  {
    // Step 11 fix round 2 (item 5, A78): the close-up rig with the key from the front above, for metal facing the camera:
    // the key's mirror direction lands near the camera, so the satin gunmetal shows its highlight and split line
    id: 'detailFront', label: 'Close-up detail, front key (metal)', background: [0.02, 0.022, 0.026],
    ambient: { sky: [0.45, 0.5, 0.6], ground: [0.12, 0.12, 0.14], intensity: 0.35 },
    lights: [
      { kind: 'dir', v: [-0.3, -0.4, -0.87], color: [1, 0.94, 0.85], intensity: 2.0, shadows: true },
      { kind: 'dir', v: [0.6, -0.3, -0.7], color: [0.62, 0.75, 1], intensity: 0.5 },
      { kind: 'dir', v: [0.35, -0.2, 1], color: [0.85, 0.9, 1], intensity: 2.2 },
    ],
    exposure: 0.72, contrast: 1, glow: false, nightVision: false, env: true, bloom: false,
  },
  {
    // Step 11 fix round 1 (A78): the calibrated whole-figure rig for the turnaround and the compare sheet: a front key
    // from above, a cool back rim, the generated environment, no bloom; an 18 % grey card facing the key renders sRGB
    // 0.50 (printed on the sheet), so the near-black suit reads near black beside the game operator's flat navy.
    id: 'figure', label: 'Whole figure (calibrated)', background: [0.05, 0.055, 0.06],
    ambient: { sky: [0.45, 0.5, 0.6], ground: [0.12, 0.12, 0.14], intensity: 0.35 },
    lights: [
      { kind: 'dir', v: [-0.45, -0.6, -0.65], color: [1, 0.97, 0.92], intensity: 2.0, shadows: true },
      { kind: 'dir', v: [0.6, -0.3, 0.7], color: [0.7, 0.8, 1], intensity: 1.4 },
    ],
    exposure: 0.7, contrast: 1, glow: false, nightVision: false, env: true, bloom: false,
  },
  {
    // Step 11: the rim-light silhouette (ART-DIRECTION 2): back rims, no front light, a faint ambient. Fix round 2
    // (item 4): the two side rims come in flatter from the sides (they graze the edges a front view sees) and stronger,
    // and a third from above behind outlines the head, optic and the plate's shoulder line.
    id: 'rim', label: 'Rim light silhouette', background: [0.01, 0.012, 0.016],
    ambient: { sky: [0.2, 0.25, 0.35], ground: [0, 0, 0], intensity: 0.05 },
    lights: [
      { kind: 'dir', v: [0.75, -0.15, 0.65], color: [0.75, 0.85, 1], intensity: 3.6 },
      { kind: 'dir', v: [-0.75, -0.15, 0.65], color: [1, 0.9, 0.78], intensity: 3.6 },
      { kind: 'dir', v: [0, -0.6, 0.8], color: [0.85, 0.9, 1], intensity: 2.5 },
    ],
    exposure: 1.4, contrast: 1.05, glow: true, nightVision: false, glowLight: false,
  },
  {
    id: 'menu', label: 'Menu scene', background: [0.02, 0.03, 0.035],
    ambient: { sky: [0.25, 0.32, 0.4], ground: [0.05, 0.06, 0.07], intensity: 0.2 },
    lights: [
      { kind: 'dir', v: [-0.6, -0.5, -0.6], color: [0.95, 0.85, 0.7], intensity: 3, shadows: true },
      { kind: 'dir', v: [0.7, -0.2, 0.6], color: [0.35, 0.5, 0.8], intensity: 1.6 },
    ],
    exposure: 2, contrast: 1.1, glow: true, nightVision: false,
  },
  {
    id: 'hollowmere', label: 'Hollowmere night (sodium vs moon)', background: [0.012, 0.018, 0.03],
    ambient: { sky: [0.12, 0.18, 0.32], ground: [0.02, 0.025, 0.04], intensity: 0.25 },
    lights: [
      { kind: 'dir', v: [0.4, -0.7, 0.55], color: [0.45, 0.58, 0.95], intensity: 0.9, shadows: true },
      { kind: 'point', v: [-2.2, 3.2, 1.6], color: [1, 0.55, 0.18], intensity: 12 },
    ],
    exposure: 2.2, contrast: 1.1, glow: true, nightVision: false,
  },
  {
    id: 'dark', label: 'Full darkness, goggle glow only', background: [0, 0, 0],
    // fix round 2 (item 1): a starlight-level fill so a faint silhouette reads behind the lens glow
    ambient: { sky: [0.12, 0.15, 0.25], ground: [0, 0, 0], intensity: 0.4 },
    lights: [],
    exposure: 1, contrast: 1, glow: true, nightVision: false,
  },
  {
    id: 'nightvision', label: 'Night vision', background: [0, 0.02, 0],
    ambient: { sky: [0.5, 0.6, 0.5], ground: [0.2, 0.25, 0.2], intensity: 0.9 },
    lights: [{ kind: 'dir', v: [-0.3, -0.8, -0.5], color: [0.9, 1, 0.9], intensity: 1.2, shadows: true }],
    exposure: 1.4, contrast: 1, glow: false, nightVision: true,
  },
];

export interface QualityPreset {
  id: string;
  label: string;
  /** Render scale (1 = native). */
  scale: number;
  shadowMap: number;
  msaa: number;
  fxaa: boolean;
  ssao: boolean;
  bloom: boolean;
}

export const PRESETS: readonly QualityPreset[] = [
  { id: 'low', label: 'Low', scale: 0.75, shadowMap: 512, msaa: 1, fxaa: true, ssao: false, bloom: false },
  { id: 'high', label: 'High', scale: 1, shadowMap: 2048, msaa: 4, fxaa: false, ssao: false, bloom: true },
  { id: 'epic', label: 'Epic', scale: 1, shadowMap: 4096, msaa: 8, fxaa: false, ssao: true, bloom: true },
];

export interface PoseDef {
  id: string;
  label: string;
  /** null = the A-pose the body is bound in (no rig). */
  rig: Partial<RigPose> | null;
  /** Frames the rig runs before the snapshot, so inertialization and the foot planner settle. */
  settle: number;
  /** Moth only: shown in the list but flagged. */
  operator?: 'moth';
}

const BASE = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 } as const;

export const POSES: readonly PoseDef[] = [
  { id: 'apose', label: 'A-pose (bind)', rig: null, settle: 0 },
  { id: 'idle', label: 'Idle', rig: { ...BASE, armed: false }, settle: 90 },
  { id: 'crouch', label: 'Crouch', rig: { ...BASE, crouch: 1, armed: false }, settle: 90 },
  { id: 'sneak', label: 'Sneak', rig: { ...BASE, crouch: 0.6, speed: 0.9, localZ: 1, armed: false }, settle: 100 },
  { id: 'aimPistol', label: 'Aim pistol', rig: { ...BASE, aim: 1, armed: true, weight: 0.35 }, settle: 90 },
  { id: 'aimRifle', label: 'Aim rifle', rig: { ...BASE, aim: 1, armed: true, weight: 1 }, settle: 90 },
  { id: 'climbReach', label: 'Climbing reach (Moth)', rig: { ...BASE, grounded: false, traverse: 'climb', traverseT: 0.35 }, settle: 60, operator: 'moth' },
];

/**
 * Step 11 (D27): every KTX2 decoder URL that would leave the page (absolute http(s) on another origin, e.g. Babylon's
 * cdn.babylonjs.com defaults). Empty means the decoder runs from bundled files only. Pure, tested.
 */
export function ktx2RemoteUrls(urls: Readonly<Record<string, unknown>>, origin: string): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(urls)) {
    if (typeof v !== 'string' || !v) continue;
    if (/^(https?:)?\/\//i.test(v) && !v.startsWith(`${origin}/`)) out.push(`${k}=${v}`);
  }
  return out;
}
