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
  /** Kit ids out of frame in this view, never called out (fix round 1, item 4). */
  exclude?: readonly string[];
  /** Kit ids from other zones that are in frame here, always called out when built (fix round 3, item 2). */
  include?: readonly string[];
  /** Suit zones (SUIT_FEATURES ids) visible in this view, called out when the suit build has them. */
  suit?: readonly string[];
  /** Light rig for this close-up (default: `detail`, or `detailRear` for views from behind). */
  rig?: string;
}

/**
 * Step 11 fix round 1 (item 4): the suit's built zones, which the kit data holds as one item ("Stealth suit"). Each is
 * built when the suit's sim report has it: `inserts` = insert-name prefixes (details.inserts), `detail` = a key of
 * details (or details.suit) that must be set. ART-DIRECTION 9.1 gives the jobs.
 */
export interface SuitFeature {
  id: string;
  name: string;
  where: string;
  job: string;
  inserts?: readonly string[];
  detail?: string;
}

export const SUIT_FEATURES: readonly SuitFeature[] = [
  { id: 'shell', name: 'Suit shell', where: 'the whole suit outside the zones below', job: 'matte stretch-woven shell with a 1.6 mm tonal diamond micro-emboss that reads only at 0.3-1 m', detail: 'suit' },
  { id: 'seams', name: 'Bonded, taped seams', where: 'every panel seam', job: 'an 8 mm bonded tape instead of stitching: smooth tension, silent, nothing to snag', detail: 'bonded' },
  { id: 'zip', name: 'Chest zip and garage (suit)', where: 'diagonal, left of the collar to the right ribs; garage at the collar under the hood skirt', job: 'the suit closure; the garage hides the puller', detail: 'zip' },
  { id: 'forearmGrip', name: 'Forearm grip panels', where: 'outer forearms, bonded into the sleeves', job: 'rubberised micro-pebble grip for crawling and wall contact', inserts: ['forearmGrip'] },
  { id: 'kneeGrip', name: 'Knee grip panels', where: 'front of each knee, bonded into the legs', job: 'rubberised micro-pebble grip for kneeling and crawling', inserts: ['kneeGrip'] },
  { id: 'elbow', name: 'Elbow abrasion panels', where: 'elbows, bonded into the sleeves', job: 'denser weave where the elbows take the wear', inserts: ['elbow'] },
  { id: 'yoke', name: 'Shoulder yoke abrasion panels', where: 'shoulder yokes, under the harness straps', job: 'denser weave where the straps and wall contact rub', inserts: ['yoke'] },
  { id: 'seat', name: 'Seat abrasion panels', where: 'seat, either side of the centre seam', job: 'denser weave for sitting, sliding and the rappel ring', inserts: ['seat'] },
  { id: 'stretch', name: 'Stretch knit zones', where: 'inner elbows and rear shoulders', job: 'free movement for reaching and climbing', inserts: ['innerElbow', 'rearShoulder'] },
  { id: 'underarmVent', name: 'Underarm vent panels', where: 'torso sides under the arms, front and back', job: 'laser-perforated (1.4 mm holes, 3.2 mm pitch, darker mesh behind) to dump heat', inserts: ['vent'] },
  { id: 'kneeVent', name: 'Knee-back vent panels', where: 'backs of the knees', job: 'laser-perforated, dumps heat where the leg bends', inserts: ['kneeVent'] },
  { id: 'thumbLoops', name: 'Thumb loops (suit)', where: 'sleeve ends, under the glove cuffs', job: 'keep the sleeves down when the arms reach', detail: 'thumbLoops' },
];

/** The suit features the build has (pure: `report` is the suit's sim.json, `materials` its exported material names). */
export function builtSuitFeatures(report: { details?: Record<string, unknown> } | null, materials: readonly string[] = []): Set<string> {
  const out = new Set<string>();
  if (!report?.details) return out;
  const d = report.details;
  const suit = (d.suit ?? {}) as Record<string, unknown>;
  const names = ((d.inserts ?? []) as { name: string }[]).map((i) => i.name);
  for (const f of SUIT_FEATURES) {
    if (f.inserts) {
      if (f.inserts.some((p) => names.some((n) => n.startsWith(p)))) out.add(f.id);
      continue;
    }
    if (f.detail === 'suit') out.add(f.id);
    else if (f.detail === 'thumbLoops') { if (materials.some((m) => m.includes('thumb loop'))) out.add(f.id); }
    else if (f.detail && (d[f.detail] || suit[f.detail])) out.add(f.id);
  }
  return out;
}

export const CLOSEUPS: readonly CloseUp[] = [
  // Lab frame (fix round 1, A80): the figure faces +Z with its RIGHT on +X, so a camera yaw > 0 looks at its LEFT side
  // and yaw < 0 at its right side.
  // fix round 3 (item 2): the earpiece sits in the ear under the hood and balaclava and is never visible, so no close-up
  // calls it out (its cable shows on collar and ptt); each list names only what its own frame shows (the cable runs
  // under the hood skirt and the balaclava above the collar, so head and neckRear leave it out).
  // step 11 retry (11-fixes-r4, SPEC 1): every item clearly identifiable in a frame is called out, not only the frame's
  // subject (judged on the step 11 retry renders); items cut by the frame edge past recognition stay out (head: the PTT
  // at the bottom edge; chestFront / ribsSide: the cut belt pouches; thighR: the sleeves behind the left thigh).
  // 11-retry-fixes-r1: the thumb loops sit under the glove cuffs and are never visible (the earpiece rule), so handPalm,
  // handBack and forearm exclude them; edge items added: forearm (belt, sleeve hanger, its buckle), neckRear (goggle
  // housing side and lug), beltFront (sleeve panel top edge).
  { id: 'head', label: 'Head, hood and goggle housing', joint: 'head', offset: [0, 0.02, 0.06], distance: 0.7, yaw: 0.35, pitch: 0.05, zones: ['head'], match: [], include: ['harnessShoulders'], exclude: ['batteryPack', 'earpiece', 'earpieceCable', 'ptt'], suit: ['shell'] },
  { id: 'neckRear', label: 'Hood rear, harness and battery', joint: 'head', offset: [0, 0, -0.05], distance: 0.7, yaw: Math.PI - 0.4, pitch: 0.1, zones: ['head'], match: ['rear', 'battery', 'hood'], include: ['goggle', 'goggleBand', 'goggleCable', 'crownStrap', 'sideStraps', 'harnessShoulders'], exclude: ['earpiece', 'earpieceCable'], suit: ['shell'] },
  { id: 'chestFront', label: 'Chest rig, front', joint: 'chest', offset: [0, 0.02, 0.1], distance: 0.9, yaw: 0.25, pitch: 0.05, zones: ['torso'], match: ['front', 'chest', 'shirt', 'zip', 'collar'], include: ['harnessShoulders', 'magBuckle', 'torsoSideStraps', 'pistolMagPouch'], exclude: ['backPlate', 'radio', 'weaponMount', 'ptt'], suit: ['shell', 'seams', 'yoke', 'elbow'] },
  { id: 'chestRear', label: 'Chest rig, rear', joint: 'chest', offset: [0, 0.02, -0.1], distance: 0.9, yaw: Math.PI - 0.25, pitch: 0.05, zones: ['torso'], match: ['back', 'rear', 'rifle'], include: ['harnessShoulders', 'torsoSideStraps', 'pistolMagPouch', 'gloves'], exclude: ['magPouches', 'gadgetSlot', 'knife', 'suitZip'], suit: ['shell', 'seams', 'stretch', 'yoke', 'elbow'] },
  // fix round 2 (item 2): from above and left of the left shoulder: the strap's run from behind the shoulder over its top
  // down to the chest-plate tab and its magnetic buckle, with the PTT, the radio and earpiece cables on the strap
  { id: 'shoulder', label: 'Shoulder strap and buckle', joint: 'shL', offset: [0.02, 0.02, 0.03], distance: 0.7, yaw: 1.0, pitch: 0.75, zones: ['torso', 'head'], match: ['shoulder', 'buckle'], include: ['chestPlate', 'suitZip', 'gadgetSlot', 'magPouches', 'torsoSideStraps', 'gloves', 'hood', 'balaclava'], exclude: ['knife'], suit: ['yoke', 'shell', 'seams', 'underarmVent'] },
  { id: 'handPalm', label: 'Hand and glove, palm', joint: 'wrR', offset: [0, -0.07, 0.03], distance: 0.4, yaw: 0.3, pitch: -0.2, zones: ['hands'], match: [], exclude: ['thumbLoops'], suit: ['shell'] },
  { id: 'handBack', label: 'Hand and glove, back', joint: 'wrL', offset: [0, -0.07, 0], distance: 0.4, yaw: -0.6, pitch: 0.4, zones: ['hands'], match: [], exclude: ['thumbLoops'], suit: ['shell'] },
  { id: 'belt', label: 'Belt and holster hanger, front right', joint: 'pelvis', offset: [0.12, -0.04, 0.05], distance: 0.85, yaw: -0.75, pitch: 0.1, zones: ['belt', 'legs'], match: [], include: ['magBuckle', 'ribSegments', 'magPouches', 'gloves'], exclude: ['rappelRing', 'dronePod', 'slingSocket', 'sleevePanel', 'throwableSleeves', 'pistolMagPouch'], suit: ['shell'] },
  { id: 'knee', label: 'Knee', joint: 'knR', offset: [0.02, 0, 0.06], distance: 0.6, yaw: 0.4, pitch: 0.05, zones: ['legs'], match: ['knee', 'trouser'], include: ['legBands', 'magBuckle', 'thighHolster'], suit: ['kneeGrip', 'shell', 'seams'] },
  { id: 'boots', label: 'Boots and soles', joint: 'anL', offset: [0, -0.06, 0.08], distance: 0.7, yaw: -0.7, pitch: -0.1, zones: ['feet'], match: [], suit: ['shell', 'seams'] },
  // Step 11: Wren's review close-ups (A2, D22-D25)
  { id: 'collar', label: 'Collar, zip garage and hood skirt', joint: 'neck', offset: [0, -0.02, 0.07], distance: 0.45, yaw: 0.35, pitch: 0.12, zones: ['head', 'torso'], match: ['collar', 'zip', 'hood', 'neck', 'balaclava', 'earpiece'], include: ['harnessShoulders', 'magBuckle', 'chinStrap', 'radioCable'], exclude: ['headHarness', 'earpiece'], suit: ['zip', 'shell', 'seams', 'yoke'] },
  { id: 'ribsSide', label: 'Rib segments from the side', joint: 'chest', offset: [0.1, -0.1, 0.06], distance: 0.55, yaw: -1.2, pitch: 0.05, zones: ['torso'], match: ['rib', 'chest plate', 'side strap'], include: ['suitZip', 'magPouches', 'waistBelt', 'medPouch', 'gloves'], exclude: ['backPlate', 'radio', 'weaponMount', 'gadgetSlot', 'knife'], suit: ['shell', 'seams', 'underarmVent'] },
  { id: 'backPlate', label: 'Back plate: radio, cable and mount point', joint: 'chest', offset: [0, 0.02, -0.1], distance: 0.75, yaw: Math.PI - 0.15, pitch: 0.12, zones: ['torso'], match: ['back', 'radio', 'mount', 'antenna'], include: ['harnessShoulders', 'torsoSideStraps', 'pistolMagPouch', 'gloves'], suit: ['shell', 'stretch', 'yoke', 'elbow'] },
  { id: 'ptt', label: 'Left shoulder: PTT and both cables', joint: 'shL', offset: [0.04, -0.04, 0.06], distance: 0.5, yaw: -0.45, pitch: 0.25, zones: ['torso', 'head'], match: ['ptt', 'shoulder', 'cable', 'earpiece'], include: ['suitZip'], exclude: ['goggleCable', 'earpiece'], suit: ['yoke', 'shell', 'seams', 'elbow'] },
  // fix round 3 (item 2): the belt's magnetic closure (a torso-zone kit item) is in frame and called out
  { id: 'beltFront', label: 'Belt, front', joint: 'pelvis', offset: [0, 0.03, 0.1], distance: 0.75, yaw: 0.15, pitch: 0.1, zones: ['belt'], match: [], include: ['magBuckle', 'ribSegments', 'magPouches', 'thighHolster', 'throwableSleeves', 'sleeveHanger', 'sleevePanel'], exclude: ['rappelRing', 'dronePod', 'slingSocket'], suit: ['shell'] },
  // step 11b (D28, A88): the left hip from its side: the pistol magazines at 9 o'clock, the sling socket behind them at
  // about 8 o'clock, the cam pouch at the front edge, all on the waist belt (the drone pod moved to the rear right)
  { id: 'hipL', label: "Left hip: pistol magazines and the 8 o'clock sling socket", joint: 'pelvis', offset: [-0.15, 0.02, 0], distance: 0.6, yaw: 1.45, pitch: 0.1, zones: ['belt'], match: ['left hip', 'rear left'], include: ['waistBelt', 'camMinePouch', 'magPouches', 'ribSegments', 'sleeveHanger', 'gloves'], suit: ['shell'] },
  { id: 'beltBack', label: 'Belt, back: rappel ring and drone pod', joint: 'pelvis', offset: [0, 0.03, -0.1], distance: 0.75, yaw: Math.PI, pitch: 0.12, zones: ['belt'], match: ['back', 'rear', 'rappel'], include: ['waistBelt', 'pistolMagPouch', 'slingSocket', 'throwableSleeves', 'thighHolster'], suit: ['seat', 'shell'] },
  { id: 'thighR', label: 'Right thigh: the empty holster', joint: 'hipR', offset: [0.12, -0.18, 0.01], distance: 0.85, yaw: -1.3, pitch: 0.05, zones: ['legs'], match: ['holster', 'right', 'band', 'hanger'], include: ['gloves', 'magBuckle', 'knife'], exclude: ['sleeveHanger', 'sleevePanel', 'throwableSleeves'], suit: ['shell'] },
  // step 11b (D28): the outer left thigh from the left front: the knife at the panel's front edge, the three straight
  // sleeves behind it
  { id: 'thighL', label: 'Left thigh: knife, throwable sleeves and caps', joint: 'hipL', offset: [0.0, -0.16, 0.02], distance: 0.65, yaw: 1.0, pitch: 0.1, zones: ['legs'], match: ['sleeve', 'left', 'band', 'panel'], include: ['magBuckle'], exclude: ['thighHolster', 'holsterHanger'], suit: ['shell'] },
  { id: 'forearm', label: 'Forearm grip panel', joint: 'elL', offset: [0, -0.1, 0.02], distance: 0.5, yaw: 0.7, pitch: 0.15, zones: ['torso', 'hands'], match: ['grip', 'forearm', 'thumb'], include: ['gloves', 'pistolMagPouch', 'waistBelt', 'sleeveHanger', 'magBuckle'], exclude: ['thumbLoops'], suit: ['forearmGrip', 'elbow', 'stretch', 'seams', 'underarmVent', 'shell'] },
  { id: 'underarm', label: 'Underarm vent and side strap', joint: 'shR', offset: [-0.04, -0.17, 0.01], distance: 0.65, yaw: -1.35, pitch: -0.15, zones: ['torso'], match: ['vent', 'side strap', 'underarm'], include: ['chestPlate', 'ribSegments', 'magPouches', 'suitZip'], suit: ['underarmVent', 'shell', 'seams', 'forearmGrip', 'elbow'] },
  // fix round 2 (item 5): the belt's flush magnetic closure at about 0.3 m (gunmetal halves, split line, rubber edge),
  // seen from the mirror direction of the detailFront key (from below left), where the satin lobe peaks
  { id: 'buckle', label: 'Belt closure: magnetic buckle', joint: 'pelvis', offset: [0.01, 0.03, 0.12], distance: 0.3, yaw: 0.3, pitch: -0.4, zones: ['torso', 'belt'], match: ['buckle', 'waist belt'], include: ['camMinePouch', 'medPouch', 'ribSegments'], suit: ['shell', 'seams'], rig: 'detailFront' },
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
    if (!built.has(i.id) || c.exclude?.includes(i.id)) return false;
    if (c.include?.includes(i.id)) return true;
    if (!c.zones.includes(i.zone as KitZone)) return false;
    if (c.match.length === 0) return true;
    const text = `${i.where} ${i.name}`.toLowerCase();
    return c.match.some((m) => text.includes(m));
  });
}

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
