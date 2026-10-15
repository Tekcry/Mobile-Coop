/**
 * Operator Lab data (pure, no Babylon): lighting rigs, quality presets, the pose list, camera views, the close-up list and
 * the colour-blind matrices. The Lab (`lab.ts`) and the sheet script (`scripts/operator-sheet.mjs`) both read this, so a
 * sheet and the Lab show the same thing. Dev-only: nothing here is imported by the game.
 */
import type { RigPose } from '../../player/characterRig';
import type { KitZone } from '../kit';

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
}

export const LIGHT_RIGS: readonly LightRig[] = [
  {
    id: 'studio', label: 'Neutral studio', background: [0.09, 0.095, 0.105],
    ambient: { sky: [0.8, 0.82, 0.86], ground: [0.35, 0.35, 0.37], intensity: 0.65 },
    lights: [
      { kind: 'dir', v: [-0.45, -0.6, 0.65], color: [1, 0.98, 0.95], intensity: 2.2, shadows: true },
      { kind: 'dir', v: [0.7, -0.3, -0.5], color: [0.7, 0.78, 0.95], intensity: 0.9 },
    ],
    exposure: 4.5, contrast: 1.05, glow: false, nightVision: false,
  },
  {
    id: 'raking', label: 'Raking light (detail check)', background: [0.03, 0.03, 0.035],
    ambient: { sky: [0.4, 0.45, 0.55], ground: [0.12, 0.12, 0.14], intensity: 0.4 },
    lights: [
      { kind: 'dir', v: [-1, -0.12, 0.35], color: [1, 0.93, 0.82], intensity: 7, shadows: true },
      { kind: 'dir', v: [0.5, -0.1, -0.85], color: [0.62, 0.75, 1], intensity: 1.2 },
    ],
    exposure: 4.5, contrast: 1.15, glow: false, nightVision: false,
  },
  {
    id: 'menu', label: 'Menu scene', background: [0.02, 0.03, 0.035],
    ambient: { sky: [0.25, 0.32, 0.4], ground: [0.05, 0.06, 0.07], intensity: 0.2 },
    lights: [
      { kind: 'dir', v: [-0.6, -0.5, 0.6], color: [0.95, 0.85, 0.7], intensity: 3, shadows: true },
      { kind: 'dir', v: [0.7, -0.2, -0.6], color: [0.35, 0.5, 0.8], intensity: 1.6 },
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
    ambient: { sky: [0.02, 0.03, 0.05], ground: [0, 0, 0], intensity: 0.02 },
    lights: [],
    exposure: 1, contrast: 1, glow: true, nightVision: false,
  },
  {
    id: 'nightvision', label: 'Night vision', background: [0, 0.02, 0],
    ambient: { sky: [0.5, 0.6, 0.5], ground: [0.2, 0.25, 0.2], intensity: 0.9 },
    lights: [{ kind: 'dir', v: [-0.3, -0.8, 0.5], color: [0.9, 1, 0.9], intensity: 1.2, shadows: true }],
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
  /** Sheen, anisotropy and clear-coat off; the cheaper look a phone gets. */
  phoneLook: boolean;
}

export const PRESETS: readonly QualityPreset[] = [
  { id: 'low', label: 'Low', scale: 0.75, shadowMap: 512, msaa: 1, fxaa: true, ssao: false, bloom: false, phoneLook: false },
  { id: 'high', label: 'High', scale: 1, shadowMap: 2048, msaa: 4, fxaa: false, ssao: false, bloom: true, phoneLook: false },
  { id: 'epic', label: 'Epic', scale: 1, shadowMap: 4096, msaa: 8, fxaa: false, ssao: true, bloom: true, phoneLook: false },
  { id: 'phone', label: 'Phone look', scale: 0.6, shadowMap: 512, msaa: 1, fxaa: true, ssao: false, bloom: false, phoneLook: true },
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

export interface CamView {
  id: string;
  label: string;
  /** Camera azimuth around the figure (rad, 0 = in front), elevation (rad) and the figure's yaw is fixed. */
  yaw: number;
  pitch: number;
}

/** Turnaround angles (BRIEF 2.2): front, 3/4 front, side, 3/4 back, back. Yaw is the camera's, 0 = in front of the figure. */
export const TURNAROUND: readonly CamView[] = [
  { id: 'front', label: 'Front', yaw: 0, pitch: 0 },
  { id: 'front34', label: '3/4 front', yaw: Math.PI / 4, pitch: 0 },
  { id: 'side', label: 'Side', yaw: Math.PI / 2, pitch: 0 },
  { id: 'back34', label: '3/4 back', yaw: (3 * Math.PI) / 4, pitch: 0 },
  { id: 'back', label: 'Back', yaw: Math.PI, pitch: 0 },
];

export interface CloseUp {
  id: string;
  label: string;
  /** Joint the camera targets, plus an offset from it (metres, figure frame: +X its right, +Y up, +Z forward). */
  joint: string;
  offset: RGB;
  /** Camera distance (m, 0.3-1) and azimuth (0 = in front). */
  distance: number;
  yaw: number;
  pitch: number;
  /** Kit zones whose built items are called out on the sheet. */
  zones: readonly KitZone[];
  /** Words that must appear in an item's `where` or `name` for it to be called out here (any); empty = the zone. */
  match: readonly string[];
}

export const CLOSEUPS: readonly CloseUp[] = [
  { id: 'head', label: 'Head, hood and goggle housing', joint: 'head', offset: [0, 0.02, 0.06], distance: 0.7, yaw: 0.35, pitch: 0.05, zones: ['head'], match: [] },
  { id: 'neckRear', label: 'Hood rear, harness and battery', joint: 'head', offset: [0, 0, -0.05], distance: 0.7, yaw: Math.PI - 0.4, pitch: 0.1, zones: ['head'], match: ['rear', 'battery', 'hood'] },
  { id: 'chestFront', label: 'Chest rig, front', joint: 'chest', offset: [0, 0.02, 0.1], distance: 0.9, yaw: 0.25, pitch: 0.05, zones: ['torso'], match: ['front', 'chest', 'shirt', 'zip', 'collar'] },
  { id: 'chestRear', label: 'Chest rig, rear', joint: 'chest', offset: [0, 0.02, -0.1], distance: 0.9, yaw: Math.PI - 0.25, pitch: 0.05, zones: ['torso'], match: ['back', 'rear', 'rifle'] },
  { id: 'shoulder', label: 'Shoulder strap and buckle', joint: 'shL', offset: [-0.02, 0.04, 0], distance: 0.6, yaw: -0.6, pitch: 0.2, zones: ['torso'], match: ['shoulder', 'strap', 'arm', 'sleeve', 'elbow'] },
  { id: 'handPalm', label: 'Hand and glove, palm', joint: 'wrR', offset: [0, -0.07, 0.03], distance: 0.4, yaw: 0.3, pitch: -0.2, zones: ['hands'], match: [] },
  { id: 'handBack', label: 'Hand and glove, back', joint: 'wrL', offset: [0, -0.07, 0], distance: 0.4, yaw: -0.6, pitch: 0.4, zones: ['hands'], match: [] },
  { id: 'belt', label: 'Belt and holster', joint: 'pelvis', offset: [0.12, 0, 0.04], distance: 0.8, yaw: 0.9, pitch: 0.05, zones: ['belt', 'legs'], match: [] },
  { id: 'knee', label: 'Knee', joint: 'knR', offset: [0.02, 0, 0.06], distance: 0.6, yaw: 0.4, pitch: 0.05, zones: ['legs'], match: ['knee', 'trouser'] },
  { id: 'boots', label: 'Boots and soles', joint: 'anL', offset: [0, -0.06, 0.08], distance: 0.7, yaw: -0.7, pitch: -0.1, zones: ['feet'], match: [] },
  { id: 'harness', label: 'Climbing harness and hardware (Moth)', joint: 'pelvis', offset: [0, 0, 0.08], distance: 0.9, yaw: 0.3, pitch: 0.05, zones: ['climbing'], match: [] },
];

/** Machado, Oliveira and Fernandes 2009, severity 1.0, applied to linear RGB. */
export const COLOUR_BLIND: Readonly<Record<string, readonly number[]>> = {
  normal: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900],
};

export function simulate(kind: string, rgb: RGB): [number, number, number] {
  const m = COLOUR_BLIND[kind];
  if (!m) throw new Error(`unknown colour-blind kind: ${kind}`);
  const c = (v: number): number => Math.max(0, Math.min(1, v));
  return [
    c(m[0]! * rgb[0] + m[1]! * rgb[1] + m[2]! * rgb[2]),
    c(m[3]! * rgb[0] + m[4]! * rgb[1] + m[5]! * rgb[2]),
    c(m[6]! * rgb[0] + m[7]! * rgb[1] + m[8]! * rgb[2]),
  ];
}

/** Goggle glows to test: Wren's square housing (strong green, D13) and Moth's round lenses (a cooler, dimmer green). */
export const GLOWS: readonly { id: string; label: string; rgb: RGB }[] = [
  { id: 'wren', label: 'Wren', rgb: [0.35, 1, 0.19] },
  { id: 'moth', label: 'Moth', rgb: [0.3, 0.9, 0.55] },
];

/** Hollowmere guard torch and sodium lamp, to see whether a glow could be mistaken for them. */
export const REFERENCE_LIGHTS: readonly { id: string; label: string; rgb: RGB }[] = [
  { id: 'sodium', label: 'Sodium lamp', rgb: [1, 0.55, 0.18] },
  { id: 'moon', label: 'Moon', rgb: [0.45, 0.58, 0.95] },
];

/** The kit items to call out in a close-up, from the built ids (pure: the sheet script reads the built ids from the build). */
export function calloutsFor<T extends { id: string; zone: string; where: string; name: string }>(
  items: readonly T[], built: ReadonlySet<string>, c: CloseUp,
): T[] {
  return items.filter((i) => {
    if (!built.has(i.id) || !c.zones.includes(i.zone as KitZone)) return false;
    if (c.match.length === 0) return true;
    const text = `${i.where} ${i.name}`.toLowerCase();
    return c.match.some((m) => text.includes(m));
  });
}
