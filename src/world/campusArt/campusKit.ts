/**
 * The campus base kit K (sector-redesign ART-KIT step 3, ART-PLAN 3.2 / 3.3; pure: no Babylon). Every piece of the table
 * with its size (as the footprint and the hull's height), triangle budget, light-parity class and gameplay boxes. Meshes:
 * `campus-kit.glb`, built offline by `npm run campus-props:build -- --set kit` (scripts/campus-props/kit.py, the pinned
 * Blender, headless); `campus-kit.json` is its report (triangles, bounds, meshes per material), which the kit test holds
 * against these tables.
 *
 * Frames (facility PROPS.md section 1, kept): a free-standing piece faces +z with its origin at the footprint centre on
 * the floor; a wall piece (footprint z0 = 0) has its back on the wall face at z 0 and is modelled at its mount height
 * over the floor (a whiteboard's board runs 0.9-2.1); a hung piece (`hung`: the exit sign, the duct run) has its origin
 * on its bottom edge (the exit sign's back on the wall face) and the placement's `y` is the mount height; a ceiling piece
 * (diffuser, smoke detector, ceiling grid: y range below 0) has its origin on its top face, placed at the ceiling's
 * underside (ART-KIT L4). Solid boxes sit 1 cm inside the skin; `see` boxes are collision-only (light passes).
 */
import { PROP_LOOK } from '../props/facilityProps';
import kitReport from './assets/campus-kit.json';
import { BIN_ENV, CHAIR_ENV, type ArtBox, type ArtLook, type ArtPlacement, type ArtSlab, type PropCatalogue, type V3 } from './catalogue';

type Cls = ArtPlacement['cls'] | 'box';
interface Row {
  id: string;
  /** Footprint x0 z0 x1 z1 (m, piece frame). */
  fp: readonly [number, number, number, number];
  /** Hull y range (m, piece frame). */
  y: readonly [number, number];
  cls: Cls;
  tris: number;
  /** Gameplay boxes: 'solid' (1 cm inside the hull), 'see' (the hull, collision-only), an explicit list, or none. */
  boxes?: 'solid' | 'see' | readonly ArtBox[];
  noLedge?: boolean;
  pitch?: number;
}

const ROWS: readonly Row[] = [
  { id: 'chairEnv', fp: [-0.3, -0.3, 0.3, 0.3], y: [0, 1.0], cls: 'box', tris: 0, boxes: [CHAIR_ENV] },
  { id: 'binEnv', fp: [-0.225, -0.225, 0.225, 0.225], y: [0, 0.9], cls: 'box', tris: 0, boxes: [BIN_ENV] },
  { id: 'meetingTable', fp: [-1.2, -0.6, 1.2, 0.6], y: [0, 0.74], cls: 'skin', tris: 200 },
  { id: 'printerMfd', fp: [-0.3, -0.325, 0.3, 0.325], y: [0, 1.15], cls: 'solid', tris: 200, boxes: 'solid' },
  { id: 'waterCooler', fp: [-0.16, -0.16, 0.16, 0.16], y: [0, 1.3], cls: 'visual', tris: 120 },
  { id: 'lockerBank', fp: [-0.45, -0.25, 0.45, 0.25], y: [0, 1.9], cls: 'solid', tris: 150, boxes: 'solid', noLedge: true, pitch: 0.9 },
  { id: 'shelving', fp: [-0.6, -0.25, 0.6, 0.25], y: [0, 2.0], cls: 'see', tris: 200, boxes: 'see', noLedge: true, pitch: 1.2 },
  { id: 'whiteboard', fp: [-0.9, 0, 0.9, 0.04], y: [0.9, 2.1], cls: 'visual', tris: 40 },
  { id: 'noticeBoard', fp: [-0.6, 0, 0.6, 0.03], y: [1.1, 2.0], cls: 'visual', tris: 40 },
  { id: 'wallClock', fp: [-0.175, 0, 0.175, 0.05], y: [2.025, 2.375], cls: 'visual', tris: 60 },
  { id: 'fireExtinguisher', fp: [-0.095, 0, 0.095, 0.2], y: [0.3, 0.95], cls: 'visual', tris: 80 },
  { id: 'fireCallPoint', fp: [-0.05, 0, 0.05, 0.05], y: [1.35, 1.45], cls: 'visual', tris: 30 },
  { id: 'exitSign', fp: [-0.2, 0, 0.2, 0.05], y: [0, 0.15], cls: 'visual', tris: 30 },
  { id: 'ceilingDiffuser', fp: [-0.3, -0.3, 0.3, 0.3], y: [-0.03, 0], cls: 'visual', tris: 40 },
  { id: 'smokeDetector', fp: [-0.06, -0.06, 0.06, 0.06], y: [-0.05, 0], cls: 'visual', tris: 30 },
  { id: 'ceilingGrid', fp: [-1.8, -1.8, 1.8, 1.8], y: [-0.02, 0], cls: 'visual', tris: 60 },
  { id: 'kitchenRun', fp: [-0.6, -0.3, 0.6, 0.3], y: [0, 0.9], cls: 'solid', tris: 150, boxes: 'solid', pitch: 1.2 },
  { id: 'wallCupboards', fp: [-0.6, 0, 0.6, 0.35], y: [1.45, 2.15], cls: 'visual', tris: 60, pitch: 1.2 },
  { id: 'fridge', fp: [-0.3, -0.325, 0.3, 0.325], y: [0, 1.8], cls: 'solid', tris: 80, boxes: 'solid' },
  { id: 'vendingMachine', fp: [-0.45, -0.4, 0.45, 0.4], y: [0, 1.85], cls: 'solid', tris: 150, boxes: 'solid' },
  { id: 'cafeTable', fp: [-0.45, -0.45, 0.45, 0.45], y: [0, 0.75], cls: 'skin', tris: 120 },
  { id: 'cafeChair', fp: [-0.225, -0.25, 0.225, 0.25], y: [0, 0.85], cls: 'see', tris: 120, boxes: [CHAIR_ENV] },
  { id: 'recyclingBins', fp: [-0.5, -0.2, 0.5, 0.2], y: [0, 0.9], cls: 'solid', tris: 80, boxes: 'solid' },
  { id: 'planterTrough', fp: [-1.0, -0.4, 1.0, 0.4], y: [0, 0.7], cls: 'skin', tris: 150, pitch: 2.0 },
  { id: 'plantPot', fp: [-0.3, -0.3, 0.3, 0.3], y: [0, 1.6], cls: 'see', tris: 300, boxes: 'see' },
  { id: 'labBench', fp: [-1.5, -0.45, 1.5, 0.45], y: [0, 1.6], cls: 'skin', tris: 350, pitch: 3.0 },
  { id: 'fumeHood', fp: [-0.75, -0.45, 0.75, 0.45], y: [0, 2.4], cls: 'solid', tris: 300, boxes: 'solid', noLedge: true },
  { id: 'gasCylinders', fp: [-0.6, -0.2, 0.6, 0.2], y: [0, 1.7], cls: 'see', tris: 400, boxes: 'see', noLedge: true },
  { id: 'instrumentCart', fp: [-0.3, -0.25, 0.3, 0.25], y: [0, 1.1], cls: 'see', tris: 250, boxes: 'see' },
  { id: 'batteryRack', fp: [-1.0, -0.4, 1.0, 0.4], y: [0, 1.2], cls: 'skin', tris: 300, pitch: 2.0 },
  { id: 'pduStrip', fp: [-0.075, 0, 0.075, 0.1], y: [0.2, 2.0], cls: 'visual', tris: 40 },
  { id: 'floorTileGrid', fp: [-1.5, -1.5, 1.5, 1.5], y: [0, 0.01], cls: 'visual', tris: 20 },
  { id: 'bookcase', fp: [-0.5, -0.2, 0.5, 0.2], y: [0, 2.2], cls: 'solid', tris: 200, boxes: 'solid', noLedge: true, pitch: 1.0 },
  { id: 'boardTable', fp: [-2.0, -0.7, 2.0, 0.7], y: [0, 0.76], cls: 'skin', tris: 250 },
  {
    id: 'chesterfield',
    fp: [-1.0, -0.45, 1.0, 0.45],
    y: [0, 0.8],
    cls: 'solid',
    tris: 400,
    // the seat (solid, low cover) and the whole sofa's envelope round the back and arms (collision-only)
    boxes: [
      { lo: [-0.99, 0, -0.44], hi: [0.99, 0.44, 0.44] },
      { lo: [-1.0, 0, -0.45], hi: [1.0, 0.8, 0.45], see: true },
    ],
  },
  { id: 'wingChair', fp: [-0.4, -0.4, 0.4, 0.4], y: [0, 1.1], cls: 'see', tris: 300, boxes: 'see' },
  // the hearth (solid, 0.15) on the floor; the surround and mantel stand flush on the wall (0.15 deep, visual)
  { id: 'fireplace', fp: [-0.8, 0, 0.8, 0.5], y: [0, 1.3], cls: 'solid', tris: 300, boxes: [{ lo: [-0.79, 0, 0.01], hi: [0.79, 0.14, 0.49] }] },
  { id: 'portraitFrame', fp: [-0.4, 0, 0.4, 0.05], y: [1.4, 2.4], cls: 'visual', tris: 40 },
  { id: 'sideboard', fp: [-1.0, -0.25, 1.0, 0.25], y: [0, 0.9], cls: 'solid', tris: 150, boxes: 'solid' },
  { id: 'longcaseClock', fp: [-0.25, -0.15, 0.25, 0.15], y: [0, 2.1], cls: 'solid', tris: 150, boxes: 'solid', noLedge: true },
  { id: 'radiatorCast', fp: [-0.5, 0, 0.5, 0.15], y: [0, 0.7], cls: 'visual', tris: 150 },
  { id: 'radiatorPanel', fp: [-0.6, 0, 0.6, 0.1], y: [0.15, 0.75], cls: 'visual', tris: 40 },
  { id: 'stoveRange', fp: [-0.6, -0.325, 0.6, 0.325], y: [0, 0.9], cls: 'solid', tris: 200, boxes: 'solid' },
  { id: 'carSilver', fp: [-0.9, -2.1, 0.9, 2.1], y: [0, 1.5], cls: 'skin-hide', tris: 1200 },
  { id: 'carBlack', fp: [-0.9, -2.1, 0.9, 2.1], y: [0, 1.5], cls: 'skin-hide', tris: 1200 },
  { id: 'carBlue', fp: [-0.9, -2.1, 0.9, 2.1], y: [0, 1.5], cls: 'skin-hide', tris: 1200 },
  { id: 'carWhite', fp: [-0.9, -2.1, 0.9, 2.1], y: [0, 1.5], cls: 'skin-hide', tris: 1200 },
  { id: 'bikeRack', fp: [-1.0, -0.3, 1.0, 0.3], y: [0, 1.0], cls: 'see', tris: 600, boxes: 'see', pitch: 2.0 },
  { id: 'wheelieBin', fp: [-0.3, -0.375, 0.3, 0.375], y: [0, 1.1], cls: 'solid', tris: 100, boxes: 'solid' },
  { id: 'binLarge', fp: [-0.7, -0.55, 0.7, 0.55], y: [0, 1.2], cls: 'skin', tris: 200 },
  { id: 'parkBench', fp: [-0.9, -0.3, 0.9, 0.3], y: [0, 0.8], cls: 'see', tris: 150, boxes: 'see' },
  { id: 'litterBin', fp: [-0.225, -0.225, 0.225, 0.225], y: [0, 0.9], cls: 'see', tris: 80, boxes: [BIN_ENV] },
  { id: 'feederPillar', fp: [-0.8, -0.2, 0.8, 0.2], y: [0, 1.5], cls: 'skin', tris: 150 },
  { id: 'siteSign', fp: [-0.75, -0.15, 0.75, 0.15], y: [0, 2.2], cls: 'solid', tris: 100, boxes: 'solid', noLedge: true },
  { id: 'reeds', fp: [-1.0, -1.0, 1.0, 1.0], y: [0, 0.49], cls: 'visual', tris: 300 },
  { id: 'treeSkin', fp: [-1.9, -2.0, 1.93, 2.0], y: [0, 6.5], cls: 'skin', tris: 1500 },
  { id: 'hedge', fp: [-0.5, -0.3, 0.5, 0.3], y: [0, 1.2], cls: 'skin', tris: 120, pitch: 1.0 },
  { id: 'acCondenser', fp: [-0.5, -0.225, 0.5, 0.225], y: [0, 1.0], cls: 'solid', tris: 250, boxes: 'solid' },
  { id: 'roofCowl', fp: [-0.25, -0.25, 0.25, 0.25], y: [0, 0.8], cls: 'see', tris: 80, boxes: 'see' },
  { id: 'ductRun', fp: [-0.5, -0.3, 0.5, 0.3], y: [0, 0.4], cls: 'visual', tris: 60, pitch: 1.0 },
];

/** The K piece ids (60: the four car colours are four ids; `chairEnv` and `binEnv` are box-only, no mesh). */
export const K_IDS: readonly string[] = ROWS.map((r) => r.id);
/** Box-only ids (no mesh in the GLB). */
export const K_BOX_ONLY: readonly string[] = ROWS.filter((r) => r.cls === 'box').map((r) => r.id);
/** The car colour ids (`fnv(roomId + index) % 4` picks one in the base pass). */
export const K_CARS: readonly string[] = ['carSilver', 'carBlack', 'carBlue', 'carWhite'];

function boxesOf(r: Row): readonly ArtBox[] | null {
  if (!r.boxes) return null;
  if (r.boxes === 'solid') return [{ lo: [r.fp[0] + 0.01, r.y[0], r.fp[1] + 0.01], hi: [r.fp[2] - 0.01, r.y[1] - 0.01, r.fp[3] - 0.01], noLedge: r.noLedge }];
  if (r.boxes === 'see') return [{ lo: [r.fp[0], r.y[0], r.fp[1]], hi: [r.fp[2], r.y[1], r.fp[3]], see: true, noLedge: r.noLedge }];
  return r.boxes;
}

/** The campus look table (ART-PLAN 3.3): the new K / H materials plus the facility looks the K meshes reuse (the same
 *  objects as `PROP_LOOK`, so a name in both tables has one look: a test). sRGB hex; the renderer converts to linear. */
export const CAMPUS_LOOK: Readonly<Record<string, ArtLook>> = {
  carpetGrey: { color: '#4a4d52', roughness: 0.95, metallic: 0 },
  laminate: { color: '#b9b3a6', roughness: 0.5, metallic: 0 },
  whiteGloss: { color: '#e9e9e4', roughness: 0.25, metallic: 0 },
  oakDark: { color: '#4a2e17', roughness: 0.5, metallic: 0 },
  brick: { color: '#7d4a36', roughness: 0.9, metallic: 0 },
  leatherGreen: { color: '#24402e', roughness: 0.55, metallic: 0 },
  paper: { color: '#d8d2c2', roughness: 0.9, metallic: 0 },
  carPaint1: { color: '#a9adb1', roughness: 0.3, metallic: 0.6 },
  carPaint2: { color: '#16181a', roughness: 0.3, metallic: 0.5 },
  carPaint3: { color: '#1f3f6e', roughness: 0.3, metallic: 0.5 },
  carPaint4: { color: '#e3e4e1', roughness: 0.3, metallic: 0.3 },
  tyre: { color: '#1a1a1a', roughness: 0.9, metallic: 0 },
  chrome: { color: '#c9cdd0', roughness: 0.15, metallic: 1 },
  labWhite: { color: '#dfe2e0', roughness: 0.45, metallic: 0 },
  epoxy: { color: '#6c7a6f', roughness: 0.35, metallic: 0 },
  copper: { color: '#b0643a', roughness: 0.35, metallic: 1 },
  lead: { color: '#5d6265', roughness: 0.7, metallic: 0.6 },
  bark: { color: '#3d2d20', roughness: 0.95, metallic: 0 },
  leaf: { color: '#2b4a22', roughness: 0.85, metallic: 0, alpha: 0.85 },
  exitGreen: { color: '#ffffff', roughness: 1, metallic: 0, emissive: true },
  // the facility looks the kit reuses (identical objects)
  steel: PROP_LOOK.steel,
  steelDark: PROP_LOOK.steelDark,
  galv: PROP_LOOK.galv,
  plastic: PROP_LOOK.plastic,
  fabric: PROP_LOOK.fabric,
  glass: PROP_LOOK.glass,
  white: PROP_LOOK.white,
  red: PROP_LOOK.red,
  concrete: PROP_LOOK.concrete,
  brass: PROP_LOOK.brass,
  foliage: PROP_LOOK.foliage,
  screen: PROP_LOOK.screen,
};

/** The K GLB's materials (kit.py MATERIALS, same names). */
export const K_MATERIALS: readonly string[] = [
  'steel',
  'steelDark',
  'galv',
  'plastic',
  'fabric',
  'glass',
  'white',
  'red',
  'concrete',
  'brass',
  'foliage',
  'screen',
  'laminate',
  'whiteGloss',
  'oakDark',
  'leatherGreen',
  'paper',
  'carPaint1',
  'carPaint2',
  'carPaint3',
  'carPaint4',
  'tyre',
  'chrome',
  'labWhite',
  'epoxy',
  'lead',
  'bark',
  'leaf',
  'exitGreen',
];

/** The car hull (ART-PLAN 3.2: body to 0.95, cabin to 1.5 over the middle 2.4); skinFit (skin-hide) and rule V read it. */
const CAR_PROFILE: readonly ArtSlab[] = [
  { x0: -0.9, x1: 0.9, y0: 0, y1: 0.95, z0: -2.1, z1: 2.1 },
  { x0: -0.8, x1: 0.8, y0: 0.95, y1: 1.5, z0: -1.2, z1: 1.2 },
];

interface KitReportShape {
  pieces: Record<string, { triangles: number; meshes: Record<string, number>; bounds: { min: number[]; max: number[] } }>;
}

function kitBounds(): Record<string, { lo: V3; hi: V3 }> {
  const rep = kitReport as unknown as KitReportShape;
  const out: Record<string, { lo: V3; hi: V3 }> = {};
  for (const r of ROWS) {
    const b = rep.pieces[r.id]?.bounds;
    out[r.id] = b ? { lo: [b.min[0]!, b.min[1]!, b.min[2]!], hi: [b.max[0]!, b.max[1]!, b.max[2]!] } : { lo: [r.fp[0], r.y[0], r.fp[1]], hi: [r.fp[2], r.y[1], r.fp[3]] };
  }
  return out;
}

const rec = <T>(f: (r: Row) => T | undefined): Record<string, T> => {
  const o: Record<string, T> = {};
  for (const r of ROWS) {
    const v = f(r);
    if (v !== undefined) o[r.id] = v;
  }
  return o;
};

/** The campus base kit catalogue (id 'K'). */
export const CAMPUS_KIT: PropCatalogue = {
  id: 'K',
  glb: 'campus-kit.glb',
  ids: K_IDS,
  materials: K_MATERIALS,
  looks: CAMPUS_LOOK,
  collision: rec((r) => boxesOf(r)),
  footprint: rec((r) => r.fp),
  triBudget: rec((r) => r.tris),
  hung: ['exitSign', 'ductRun'],
  // (artnext A8) kitchenRun / wallCupboards fit too: a kitchen counter box of another size takes the run's modules along x
  fit: ['meetingTable', 'ceilingGrid', 'cafeTable', 'planterTrough', 'labBench', 'batteryRack', 'floorTileGrid', 'boardTable', 'carSilver', 'carBlack', 'carBlue', 'carWhite', 'binLarge', 'feederPillar', 'treeSkin', 'kitchenRun', 'wallCupboards'],
  // (artnext A3) own fit limits: the S4 battery boxes are 1.0 deep (1.275), the S3 burn-in desk 2.0 long (0.673), the S5
  // kitchen counter 0.8 deep (1.367)
  fitRange: { batteryRack: { min: 0.8, max: 1.3 }, labBench: { min: 0.65, max: 1.25 }, kitchenRun: { min: 0.8, max: 1.4 } },
  overhang: {
    labBench: { by: 0.72, what: 'the reagent shelf on its open uprights over the bench' },
    fireplace: { by: 1.17, what: 'the surround and mantel, flush on the wall (0.15 deep) over the hearth' },
    treeSkin: { by: 2.5, what: 'the canopy from 3.0 m (above the body band) round the trunk' },
  },
  emissive: { vendingMachine: ['screen'], exitSign: ['lamp'] },
  pitch: rec((r) => r.pitch ?? r.fp[2] - r.fp[0]),
  bounds: kitBounds(),
  profile: { carSilver: CAR_PROFILE, carBlack: CAR_PROFILE, carBlue: CAR_PROFILE, carWhite: CAR_PROFILE },
  boxColor: { chairEnv: '#2c2e30', binEnv: '#3b3f42', bookcase: '#4a2e17', sideboard: '#4a2e17', longcaseClock: '#4a2e17', chesterfield: '#24402e', fireplace: '#7c7f82' },
  open: ['ceilingGrid', 'floorTileGrid'],
  classOf: rec((r) => r.cls),
  // the trunk is modelled over the S1 verge trees' pillars (r 0.3, 5 m); the S5 trees (r 0.35, 6 m) fit 1.17 / 1.2
  cylFit: { treeSkin: { r: 0.3, h: 5.0 } },
  // exit signs run on their own maintained supply (ART-PLAN 2): green, gain 0.6, never dimmed by a circuit
  ownSupply: { exitGreen: { tint: [0.1, 1.0, 0.3], gain: 0.6 } },
};
