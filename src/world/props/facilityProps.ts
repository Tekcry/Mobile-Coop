/**
 * The props kit (marlow-final M5 / A6; pure, no Babylon at run time): the set dressing that makes each mock-up read as
 * a real site (security consoles and video walls, server racks, pallet racking, a goods van, a transformer, a pump set,
 * mesh cages, a banking counter and a strongroom door; batch 2: the gallery, lounge and holding-room furniture, the set
 * signs, and every remaining set prop of PROPS.md section 3). Design and rules: docs/marlow-final/PROPS.md.
 *
 * Meshes: one GLB built offline by `npm run props:build` (scripts/facility-props/build.py, Blender 5.2.2 headless) into
 * src/world/props/assets/facility-props.glb, drawn by `propRender.ts`, one thin-instanced mesh per (prop, material).
 *
 * Collision (gameplay never reads prop meshes): a prop is visual only. Each prop with a gameplay footprint lists the
 * boxes the level builder must hold (`PROP_COLLISION`, in the prop's frame); `propCollisionBox` returns them in world
 * space and `writePropBoxes` writes them into a `LevelBuilder`. Solid boxes are ordinary visible boxes set 1 cm inside
 * the prop's skin (collision, cover, ledges, nav, the canonical light shapes and the shadow casters, exactly a greybox;
 * the prop hides them, and `?gfx=min` shows them in `PROP_BOX_COLOR`). `see` boxes are collision-only (open racking,
 * welded mesh, a van's underframe, a machine's envelope): they stop movement, bullets and guard sight, light passes
 * them in the bake, the meter and the picture alike (the kit's glass rule).
 */

export const PROP_IDS = [
  'monitorWall',
  'securityDesk',
  'serverRack',
  'palletRackBay',
  'palletRackEnd',
  'boxVan',
  'transformer',
  'pumpUnit',
  'meshPanel',
  'bankCounter',
  'vaultDoor',
  'vaultLeaf',
  'beamTower',
  // batch 2 (0f)
  'galleryConsole',
  'galleryChair',
  'galleryScreen',
  'receptionDesk',
  'loungeSeat',
  'greenWall',
  'modelVitrine',
  'holdingBench',
  'kitCaseWall',
  'signPlate',
  'barrierPost',
  'checkerDesk',
  'bollard',
  'wicketBolt',
  'trackPanel',
  'bufferStop',
  'pushStation',
  'permitGate',
  'officeDesk',
  'officeChair',
  'filingCabinet',
  'cleanerTrolley',
  'palletLoad',
  'palletLoadLow',
  'dispatchDesk',
  'reachTruck',
  'zoneKiosk',
  'switchgearPanel',
  'cableDrum',
  'driveCabinet',
  'davitBox',
  'glandPlate',
  'pipeRun',
  'coolingUnit',
  'cableTray',
  'trenchGrating',
  'bankGrille',
  'timeLockPanel',
  'lightingBoard',
  'depositWall',
  'nightDesk',
  'cashCart',
] as const;
export type PropId = (typeof PROP_IDS)[number];

/** The GLB's materials (`<prop>.<material>` meshes; build.py MATERIALS, same order). */
export const PROP_MATERIALS = [
  'steel',
  'steelDark',
  'galv',
  'mesh',
  'rackBlue',
  'rackOrange',
  'timber',
  'cardboard',
  'wrap',
  'vanBody',
  'vanRoof',
  'iron',
  'transformer',
  'porcelain',
  'concrete',
  'pumpPaint',
  'safety',
  'oak',
  'marble',
  'brass',
  'plastic',
  'fabric',
  'glass',
  'leather',
  'foliage',
  'ballast',
  'red',
  'white',
  'screen',
  'lamp',
] as const;
export type PropMaterial = (typeof PROP_MATERIALS)[number];

/** The material looks (sRGB hex as the level's colours; the renderer converts to linear). `screen` and `lamp` are
 *  unlit emissive, coloured per instance (`PropPlacement.tint` / `lamp`). */
export const PROP_LOOK: Record<PropMaterial, { color: string; roughness: number; metallic: number; alpha?: number; emissive?: boolean }> = {
  steel: { color: '#7c7f82', roughness: 0.55, metallic: 0.6 },
  steelDark: { color: '#2c2e30', roughness: 0.5, metallic: 0.5 },
  galv: { color: '#adafb1', roughness: 0.45, metallic: 0.9 },
  mesh: { color: '#a0a2a4', roughness: 0.5, metallic: 0.9, alpha: 0.5 },
  rackBlue: { color: '#1b4f8f', roughness: 0.5, metallic: 0.3 },
  rackOrange: { color: '#e2581a', roughness: 0.5, metallic: 0.3 },
  timber: { color: '#a8875c', roughness: 0.85, metallic: 0 },
  cardboard: { color: '#a67b4f', roughness: 0.9, metallic: 0 },
  wrap: { color: '#d9dcdc', roughness: 0.35, metallic: 0 },
  vanBody: { color: '#6e3524', roughness: 0.75, metallic: 0.1 },
  vanRoof: { color: '#5f5f5c', roughness: 0.85, metallic: 0.1 },
  iron: { color: '#262422', roughness: 0.6, metallic: 0.7 },
  transformer: { color: '#7a8072', roughness: 0.55, metallic: 0.3 },
  porcelain: { color: '#5e3622', roughness: 0.2, metallic: 0 },
  concrete: { color: '#a5a29b', roughness: 0.9, metallic: 0 },
  pumpPaint: { color: '#2f6b4f', roughness: 0.45, metallic: 0.3 },
  safety: { color: '#f2b705', roughness: 0.5, metallic: 0.1 },
  oak: { color: '#6b4423', roughness: 0.45, metallic: 0 },
  marble: { color: '#e4e0d8', roughness: 0.15, metallic: 0 },
  brass: { color: '#c19a50', roughness: 0.3, metallic: 1 },
  plastic: { color: '#1b1b1c', roughness: 0.6, metallic: 0 },
  fabric: { color: '#2b2d31', roughness: 0.95, metallic: 0 },
  glass: { color: '#cfd8da', roughness: 0.05, metallic: 0, alpha: 0.2 },
  leather: { color: '#55311e', roughness: 0.55, metallic: 0 },
  foliage: { color: '#2f5a22', roughness: 0.8, metallic: 0 },
  ballast: { color: '#5d5a56', roughness: 0.95, metallic: 0 },
  red: { color: '#c0262b', roughness: 0.5, metallic: 0.1 },
  white: { color: '#e8e8e4', roughness: 0.5, metallic: 0 },
  screen: { color: '#ffffff', roughness: 1, metallic: 0, emissive: true },
  lamp: { color: '#ffffff', roughness: 1, metallic: 0, emissive: true },
};

/** Triangle budget per prop (the build report test holds every prop under it; PROPS.md section 3). */
export const PROP_TRI_BUDGET: Record<PropId, number> = {
  monitorWall: 400,
  securityDesk: 500,
  serverRack: 300,
  palletRackBay: 700,
  palletRackEnd: 200,
  boxVan: 1200,
  transformer: 1200,
  pumpUnit: 900,
  meshPanel: 120,
  bankCounter: 300,
  vaultDoor: 400,
  vaultLeaf: 600,
  beamTower: 200,
  galleryConsole: 500,
  galleryChair: 350,
  galleryScreen: 60,
  receptionDesk: 300,
  loungeSeat: 400,
  greenWall: 300,
  modelVitrine: 600,
  holdingBench: 120,
  kitCaseWall: 400,
  signPlate: 60,
  barrierPost: 250,
  checkerDesk: 250,
  bollard: 80,
  wicketBolt: 100,
  trackPanel: 300,
  bufferStop: 300,
  pushStation: 150,
  permitGate: 160,
  officeDesk: 250,
  officeChair: 350,
  filingCabinet: 120,
  cleanerTrolley: 300,
  palletLoad: 120,
  palletLoadLow: 120,
  dispatchDesk: 250,
  reachTruck: 900,
  zoneKiosk: 150,
  switchgearPanel: 200,
  cableDrum: 250,
  driveCabinet: 200,
  davitBox: 100,
  glandPlate: 80,
  pipeRun: 160,
  coolingUnit: 200,
  cableTray: 120,
  trenchGrating: 80,
  bankGrille: 200,
  timeLockPanel: 160,
  lightingBoard: 150,
  depositWall: 250,
  nightDesk: 400,
  cashCart: 200,
};

/** A set's prop dressing budget (PROPS.md section 1): triangles drawn and draws (one per (prop, material) placed). */
export const PROP_SET_BUDGET = { tris: 60_000, draws: 12 };

type V3 = readonly [number, number, number];
type Rgb = [number, number, number];

/** A gameplay box in the prop's frame (m): `lo` .. `hi`. `see`: collision-only (light and sight pass, see the header);
 *  `noLedge`: no generated ledge (racks, vans, plant: ROUTE-DRAFT risk 7). */
export interface PropBox {
  lo: V3;
  hi: V3;
  see?: boolean;
  noLedge?: boolean;
}

/** The boxes the level builder holds under each prop (`null`: visual only, or the device / door owns it). Solid boxes
 *  sit 1 cm inside the skin; each prop's skin stands at most `PROP_PROUD` (or its `PROP_OVERHANG`) off its box hull. */
export const PROP_COLLISION: Record<PropId, readonly PropBox[] | null> = {
  // plinth with trunking (low), and the frame behind the screens (the screens stand 5.5 cm proud of it)
  monitorWall: [
    { lo: [-1.84, 0, 0], hi: [1.84, 0.47, 0.34] },
    { lo: [-1.84, 0.47, 0], hi: [1.84, 2.59, 0.105] },
  ],
  // the console as a closed block (its knee space reads as a modesty panel in the greybox colour)
  securityDesk: [{ lo: [-1.19, 0, -0.44], hi: [1.19, 0.74, 0.44] }],
  // behind the perforated door, so the door's mesh shows the server faces
  serverRack: [{ lo: [-0.29, 0, -0.59], hi: [0.29, 2.19, 0.55], noLedge: true }],
  palletRackBay: [{ lo: [-1.35, 0, -0.55], hi: [1.35, 5.4, 0.55], see: true, noLedge: true }],
  // the closing frame stands inside the last bay's box (4.5 cm past it)
  palletRackEnd: null,
  // body (under the curved roof) and the open underframe
  boxVan: [
    { lo: [-4.54, 1.13, -1.26], hi: [4.54, 3.11, 1.26], noLedge: true },
    { lo: [-4.65, 0, -1.25], hi: [4.65, 1.13, 1.25], see: true, noLedge: true },
  ],
  // the bund walls (1.2 m low cover), the tank, and the unit's envelope (radiators, bushings, conservator)
  transformer: [
    { lo: [-2.99, 0, -2.49], hi: [2.99, 1.19, -2.26], noLedge: true },
    { lo: [-2.99, 0, 2.26], hi: [2.99, 1.19, 2.49], noLedge: true },
    { lo: [-2.99, 0, -2.26], hi: [-2.76, 1.19, 2.26], noLedge: true },
    { lo: [2.76, 0, -2.26], hi: [2.99, 1.19, 2.26], noLedge: true },
    { lo: [-1.49, 0.05, -0.79], hi: [1.49, 2.44, 0.79], noLedge: true },
    { lo: [-1.8, 0.05, -1.4], hi: [1.8, 3.5, 1.4], see: true, noLedge: true },
  ],
  // the 1.2 m plinth (low cover), the pump column inside the casings, and the motor's envelope
  pumpUnit: [
    { lo: [-1.19, 0, -1.19], hi: [1.19, 1.19, 1.19], noLedge: true },
    { lo: [-0.32, 1.19, -0.32], hi: [0.32, 3.79, 0.32], noLedge: true },
    { lo: [-0.6, 1.19, -0.6], hi: [0.6, 4.0, 0.6], see: true, noLedge: true },
  ],
  // the cage wall (G45: light passes welded mesh; the kick panel is not cover)
  meshPanel: [{ lo: [-0.75, 0, -0.025], hi: [0.75, 2.4, 0.025], see: true }],
  // low cover (1.2 m)
  bankCounter: [{ lo: [-1.19, 0, -0.38], hi: [1.19, 1.19, 0.36] }],
  // the jambs and the head; the opening is the level builder's door (`vaultDoorAnchor`)
  vaultDoor: [
    { lo: [-1.19, 0, -0.34], hi: [-0.71, 2.79, 0.34], noLedge: true },
    { lo: [0.71, 0, -0.34], hi: [1.19, 2.79, 0.34], noLedge: true },
    { lo: [-0.71, 2.21, -0.34], hi: [0.71, 2.79, 0.34], noLedge: true },
  ],
  vaultLeaf: null,
  // a thin pole: sight passes beside it
  beamTower: [{ lo: [-0.08, 0, -0.08], hi: [0.08, 2.39, 0.08], noLedge: true }],
  // batch 2 (0f). The gallery is out of bounds (sight only); hung and floor-flush props have no footprint
  galleryConsole: null,
  galleryChair: null,
  galleryScreen: null,
  // the tall visitor front under the transaction top, and the low staff side
  receptionDesk: [
    { lo: [-1.79, 0, 0.16], hi: [1.79, 1.09, 0.54] },
    { lo: [-1.79, 0, -0.54], hi: [1.79, 0.74, 0.16] },
  ],
  // base, the two arms and the back (the seat stays open above the cushion)
  loungeSeat: [
    { lo: [-0.415, 0, -0.415], hi: [0.415, 0.4, 0.415] },
    { lo: [-0.405, 0.4, -0.405], hi: [-0.31, 0.59, 0.405] },
    { lo: [0.31, 0.4, -0.405], hi: [0.405, 0.59, 0.405] },
    { lo: [-0.29, 0.4, -0.405], hi: [0.29, 0.77, -0.26] },
  ],
  greenWall: null,
  // the plinth, and the glass hood (light and the eye pass glass)
  modelVitrine: [
    { lo: [-0.99, 0, -0.59], hi: [0.99, 0.74, 0.59], noLedge: true },
    { lo: [-0.98, 0.75, -0.58], hi: [0.98, 1.1, 0.58], see: true, noLedge: true },
  ],
  // slab on two plate legs: collision only
  holdingBench: [{ lo: [-0.9, 0, -0.225], hi: [0.9, 0.45, 0.225], see: true }],
  // glass-fronted: a solid box would show through the glass
  kitCaseWall: [{ lo: [-0.6, 0, 0], hi: [0.6, 2.4, 0.5], see: true, noLedge: true }],
  signPlate: null,
  // the motor post only; the arm is visual (PROP_OVERHANG)
  barrierPost: [{ lo: [-0.19, 0, -0.19], hi: [0.19, 1.09, 0.19], noLedge: true }],
  // a closed block (the knee space reads as a modesty panel, PA5)
  checkerDesk: [{ lo: [-0.69, 0, -0.34], hi: [0.69, 0.74, 0.34] }],
  // inside the octagonal post
  bollard: [{ lo: [-0.06, 0, -0.06], hi: [0.06, 0.99, 0.06], noLedge: true }],
  wicketBolt: null,
  trackPanel: null,
  // an open frame of rail: collision only
  bufferStop: [{ lo: [-1.3, 0, -0.7], hi: [1.3, 1.25, 0.7], see: true, noLedge: true }],
  pushStation: null,
  // tube gate: the stair's block, collision only
  permitGate: [{ lo: [-0.5, 0, -0.05], hi: [0.5, 1.1, 0.05], see: true }],
  officeDesk: [{ lo: [-0.77, 0, -0.37], hi: [0.77, 0.74, 0.37] }],
  officeChair: null,
  filingCabinet: [{ lo: [-0.225, 0, -0.3], hi: [0.225, 1.31, 0.29] }],
  cleanerTrolley: [{ lo: [-0.55, 0, -0.25], hi: [0.55, 1, 0.25], see: true }],
  palletLoad: [{ lo: [-0.59, 0, -0.49], hi: [0.59, 1.39, 0.49] }],
  // 1.2 m: low cover
  palletLoadLow: [{ lo: [-0.59, 0, -0.49], hi: [0.59, 1.19, 0.49] }],
  dispatchDesk: [{ lo: [-0.89, 0, -0.34], hi: [0.89, 0.89, 0.34] }],
  // the chassis (solid) and the whole truck's envelope (mast, guard, reach legs, forks)
  reachTruck: [
    { lo: [-1.29, 0, -0.64], hi: [0.19, 0.99, 0.64], noLedge: true },
    { lo: [-1.3, 0, -0.65], hi: [1.3, 2.3, 0.65], see: true, noLedge: true },
  ],
  zoneKiosk: null,
  // a line-up module: 5 mm in at each side so neighbours' boxes never touch faces
  switchgearPanel: [{ lo: [-0.395, 0, -0.79], hi: [0.395, 2.29, 0.77], noLedge: true }],
  // inside the wound cable (solid), and the drum's envelope round the round flanges
  cableDrum: [
    { lo: [-0.42, 0.48, -0.54], hi: [0.42, 1.32, 0.54], noLedge: true },
    { lo: [-0.9, 0, -0.55], hi: [0.9, 1.8, 0.55], see: true, noLedge: true },
  ],
  driveCabinet: null,
  davitBox: null,
  glandPlate: null,
  // inside the pipe (solid), and the flanges' envelope
  pipeRun: [
    { lo: [-0.49, 0.15, -0.2], hi: [0.49, 0.55, 0.2], noLedge: true },
    { lo: [-0.5, 0, -0.35], hi: [0.5, 0.7, 0.35], see: true, noLedge: true },
  ],
  coolingUnit: [{ lo: [-0.89, 0, -0.44], hi: [0.89, 1.99, 0.42], noLedge: true }],
  cableTray: null,
  trenchGrating: null,
  bankGrille: null,
  timeLockPanel: null,
  lightingBoard: null,
  depositWall: [{ lo: [-0.595, 0, -0.29], hi: [0.595, 2.39, 0.27], noLedge: true }],
  nightDesk: [{ lo: [-1.19, 0, -0.44], hi: [1.19, 0.74, 0.44] }],
  // the cash box (solid) over its chassis and castors
  cashCart: [
    { lo: [-0.41, 0.15, -0.29], hi: [0.49, 1.09, 0.29] },
    { lo: [-0.5, 0, -0.3], hi: [0.5, 0.15, 0.3], see: true },
  ],
};

/** How far a prop's skin may stand off its box hull (m): the kit's skin rule. */
export const PROP_PROUD = 0.05;
/** Listed overhangs (m past the box hull), each where no player stands or reaches. */
export const PROP_OVERHANG: Partial<Record<PropId, { by: number; what: string }>> = {
  securityDesk: { by: 0.51, what: 'desk monitors, keyboard and phone on the worktop' },
  serverRack: { by: 0.08, what: 'the door handle' },
  boxVan: { by: 0.36, what: 'buffers at both ends and the curved roof' },
  bankCounter: { by: 0.14, what: 'the brass foot rail at the floor' },
  vaultDoor: { by: 0.17, what: 'hinge knuckles on the face' },
  barrierPost: { by: 6.1, what: 'the 6 m arm (down, 1.0-1.08 m up, visual only) and its hub' },
  checkerDesk: { by: 0.4, what: 'the monitor and logbook on the worktop' },
  officeDesk: { by: 0.5, what: 'the monitor, keyboard and mouse on the worktop' },
  dispatchDesk: { by: 0.3, what: 'the label printer, kettle and mugs on the top' },
  nightDesk: { by: 0.51, what: 'desk monitors, keyboard and phone on the worktop' },
};

/** Hung props: the origin is the bottom edge on the mounting face (the cable tray: under its trapeze strut); the
 *  placement's `y` is the mount height. Every other prop stands on its floor (PROPS.md section 1). */
export const PROP_HUNG: readonly PropId[] = ['galleryScreen', 'signPlate', 'pushStation', 'timeLockPanel', 'wicketBolt', 'cableTray'];

/** The rail head height of `trackPanel` (build.py TRACK_RAIL_TOP): a `boxVan` on the track stands at this `y`. */
export const TRACK_RAIL_TOP = 0.02;

/** Greybox colour of each prop's solid boxes (the `?gfx=min` path, and the colour seen if a skin gap shows one). */
export const PROP_BOX_COLOR: Record<PropId, string> = {
  monitorWall: '#2c2e30',
  securityDesk: '#7c7f82',
  serverRack: '#1b1b1c',
  palletRackBay: '#1b4f8f',
  palletRackEnd: '#1b4f8f',
  boxVan: '#6e3524',
  transformer: '#7a8072',
  pumpUnit: '#a5a29b',
  meshPanel: '#adafb1',
  bankCounter: '#6b4423',
  vaultDoor: '#262422',
  vaultLeaf: '#262422',
  beamTower: '#adafb1',
  galleryConsole: '#2c2e30',
  galleryChair: '#2c2e30',
  galleryScreen: '#1b1b1c',
  receptionDesk: '#e4e0d8',
  loungeSeat: '#55311e',
  greenWall: '#2f5a22',
  modelVitrine: '#2c2e30',
  holdingBench: '#6b4423',
  kitCaseWall: '#2c2e30',
  signPlate: '#2c2e30',
  barrierPost: '#7c7f82',
  checkerDesk: '#7c7f82',
  bollard: '#2c2e30',
  wicketBolt: '#262422',
  trackPanel: '#5d5a56',
  bufferStop: '#c0262b',
  pushStation: '#7c7f82',
  permitGate: '#f2b705',
  officeDesk: '#7c7f82',
  officeChair: '#2c2e30',
  filingCabinet: '#7c7f82',
  cleanerTrolley: '#1b1b1c',
  palletLoad: '#d9dcdc',
  palletLoadLow: '#d9dcdc',
  dispatchDesk: '#7c7f82',
  reachTruck: '#f2b705',
  zoneKiosk: '#7c7f82',
  switchgearPanel: '#7c7f82',
  cableDrum: '#1b1b1c',
  driveCabinet: '#7c7f82',
  davitBox: '#c0262b',
  glandPlate: '#adafb1',
  pipeRun: '#2f6b4f',
  coolingUnit: '#e8e8e4',
  cableTray: '#adafb1',
  trenchGrating: '#adafb1',
  bankGrille: '#c19a50',
  timeLockPanel: '#262422',
  lightingBoard: '#7c7f82',
  depositWall: '#262422',
  nightDesk: '#6b4423',
  cashCart: '#7c7f82',
};

/** Each prop's drawn footprint in its frame (m, x0 z0 x1 z1; the build report's bounds): the layout check keeps it in
 *  the set's box. */
export const PROP_FOOTPRINT: Record<PropId, readonly [number, number, number, number]> = {
  monitorWall: [-1.85, 0, 1.85, 0.36],
  securityDesk: [-1.2, -0.45, 1.2, 0.45],
  serverRack: [-0.3, -0.6, 0.3, 0.63],
  palletRackBay: [-1.4, -0.6, 1.35, 0.6],
  palletRackEnd: [-0.05, -0.57, 0.05, 0.57],
  boxVan: [-5, -1.31, 5, 1.31],
  transformer: [-3, -2.5, 3, 2.5],
  pumpUnit: [-1.2, -1.2, 1.2, 1.2],
  meshPanel: [-0.75, -0.025, 0.75, 0.025],
  bankCounter: [-1.2, -0.4, 1.2, 0.5],
  vaultDoor: [-1.2, -0.35, 1.2, 0.5],
  vaultLeaf: [-0.05, -0.81, 1.53, 0.05],
  beamTower: [-0.13, -0.13, 0.13, 0.13],
  galleryConsole: [-1.2, -0.45, 1.2, 0.45],
  galleryChair: [-0.3, -0.38, 0.3, 0.31],
  galleryScreen: [-0.98, 0, 0.98, 0.07],
  receptionDesk: [-1.8, -0.57, 1.8, 0.58],
  loungeSeat: [-0.43, -0.43, 0.43, 0.43],
  greenWall: [-0.6, 0, 0.6, 0.2],
  modelVitrine: [-1, -0.6, 1, 0.6],
  holdingBench: [-0.9, -0.23, 0.9, 0.23],
  kitCaseWall: [-0.6, 0, 0.6, 0.5],
  signPlate: [-0.6, 0, 0.6, 0.05],
  barrierPost: [-0.2, -0.2, 6.24, 0.2],
  checkerDesk: [-0.7, -0.35, 0.7, 0.36],
  bollard: [-0.11, -0.11, 0.11, 0.11],
  wicketBolt: [-0.21, 0, 0.2, 0.06],
  trackPanel: [-5, -1.3, 5, 1.3],
  bufferStop: [-1.3, -0.7, 1.3, 0.7],
  pushStation: [-0.3, 0, 0.3, 0.34],
  permitGate: [-0.5, -0.03, 0.5, 0.05],
  officeDesk: [-0.8, -0.4, 0.8, 0.4],
  officeChair: [-0.3, -0.35, 0.3, 0.31],
  filingCabinet: [-0.24, -0.31, 0.24, 0.32],
  cleanerTrolley: [-0.55, -0.25, 0.55, 0.25],
  palletLoad: [-0.6, -0.5, 0.6, 0.5],
  palletLoadLow: [-0.6, -0.5, 0.6, 0.5],
  dispatchDesk: [-0.9, -0.35, 0.9, 0.37],
  reachTruck: [-1.3, -0.65, 1.3, 0.65],
  zoneKiosk: [-0.4, -0.25, 0.4, 0.27],
  switchgearPanel: [-0.4, -0.8, 0.4, 0.82],
  cableDrum: [-0.9, -0.55, 0.9, 0.55],
  driveCabinet: [-0.6, -0.3, 0.6, 0.33],
  davitBox: [-0.41, -0.26, 0.41, 0.27],
  glandPlate: [-0.3, -0.3, 0.3, 0.3],
  pipeRun: [-0.5, -0.35, 0.5, 0.35],
  coolingUnit: [-0.9, -0.45, 0.9, 0.45],
  cableTray: [-0.5, -0.19, 0.5, 0.19],
  trenchGrating: [-0.5, -0.5, 0.5, 0.5],
  bankGrille: [-0.75, -0.04, 0.75, 0.04],
  timeLockPanel: [-0.25, 0, 0.25, 0.15],
  lightingBoard: [-0.6, 0, 0.6, 0.33],
  depositWall: [-0.6, -0.3, 0.6, 0.3],
  nightDesk: [-1.2, -0.45, 1.2, 0.45],
  cashCart: [-0.5, -0.3, 0.5, 0.3],
};

/** Module pitch of a row of repeated props (m along local x): bays and panels share their end frames / half posts,
 *  coupled vans meet buffer to buffer. */
export const PROP_PITCH: Record<PropId, number> = {
  monitorWall: 3.7,
  securityDesk: 2.4,
  serverRack: 0.6,
  palletRackBay: 2.7,
  palletRackEnd: 0.1,
  boxVan: 10,
  transformer: 6,
  pumpUnit: 3.6,
  meshPanel: 1.5,
  bankCounter: 2.4,
  vaultDoor: 2.4,
  vaultLeaf: 1.4,
  beamTower: 0.26,
  galleryConsole: 2.4,
  galleryChair: 0.8,
  galleryScreen: 2,
  receptionDesk: 3.6,
  loungeSeat: 0.85,
  greenWall: 1.2,
  modelVitrine: 2,
  holdingBench: 1.8,
  kitCaseWall: 1.2,
  signPlate: 1.2,
  barrierPost: 6.5,
  checkerDesk: 1.4,
  bollard: 1.5,
  wicketBolt: 0.4,
  trackPanel: 10,
  bufferStop: 2.6,
  pushStation: 0.6,
  permitGate: 1,
  officeDesk: 1.6,
  officeChair: 0.8,
  filingCabinet: 0.47,
  cleanerTrolley: 1.1,
  palletLoad: 1.2,
  palletLoadLow: 1.2,
  dispatchDesk: 1.8,
  reachTruck: 2.6,
  zoneKiosk: 0.8,
  switchgearPanel: 0.8,
  cableDrum: 2,
  driveCabinet: 1.2,
  davitBox: 0.8,
  glandPlate: 0.6,
  pipeRun: 1,
  coolingUnit: 1.8,
  cableTray: 1,
  trenchGrating: 1,
  bankGrille: 1.5,
  timeLockPanel: 0.5,
  lightingBoard: 1.2,
  depositWall: 1.2,
  nightDesk: 2.4,
  cashCart: 1,
};

/** Default per-instance colours (linear-ish, before the gain) of the screens and lamps. */
export const PROP_SCREEN_TINT: Rgb = [0.16, 0.26, 0.34];
export const PROP_LAMP_TINT: Partial<Record<PropId, Rgb>> & { default: Rgb } = {
  default: [0.25, 1.0, 0.4],
  beamTower: [1.0, 0.12, 0.08],
  vaultLeaf: [1.0, 0.55, 0.1],
  // warm LED lines, the sign's backlit face, the truck's beacon and the time lock's ready lamp
  receptionDesk: [1.0, 0.78, 0.5],
  kitCaseWall: [1.0, 0.78, 0.5],
  signPlate: [0.95, 0.92, 0.85],
  reachTruck: [1.0, 0.55, 0.1],
  timeLockPanel: [1.0, 0.55, 0.1],
};
/** Emissive gains: accents only, never brighter than the baked lamps (light parity). */
export const PROP_SCREEN_GAIN = 1.0;
export const PROP_LAMP_GAIN = 1.2;
/** The share of its colour an emissive instance keeps when its circuit is cut (as the kit's LED lines, `kitRender` LED_DARK). */
export const PROP_DARK = 0.06;

/** The emissive parts each prop's mesh has (the GLB's `<prop>.screen` / `<prop>.lamp` meshes; a test reads them from the GLB). */
export const PROP_EMISSIVE_PARTS: Partial<Record<PropId, readonly ('screen' | 'lamp')[]>> = {
  monitorWall: ['screen', 'lamp'],
  securityDesk: ['screen', 'lamp'],
  serverRack: ['lamp'],
  vaultLeaf: ['lamp'],
  beamTower: ['lamp'],
  galleryConsole: ['screen'],
  galleryScreen: ['screen'],
  receptionDesk: ['lamp'],
  kitCaseWall: ['lamp'],
  signPlate: ['lamp'],
  checkerDesk: ['screen'],
  pushStation: ['lamp'],
  officeDesk: ['screen'],
  reachTruck: ['lamp'],
  zoneKiosk: ['screen', 'lamp'],
  switchgearPanel: ['lamp'],
  driveCabinet: ['screen', 'lamp'],
  coolingUnit: ['screen'],
  timeLockPanel: ['lamp'],
  lightingBoard: ['lamp'],
  nightDesk: ['screen', 'lamp'],
};

/** Props whose lamp is the device's own status indicator, tinted by the device's state (`PropRender.setTint`), on the device's
 *  own control supply and on no lighting circuit (the isolator push station shows the contactor's state while its circuit is cut). */
export const PROP_OWN_SUPPLY: readonly PropId[] = ['pushStation'];

/** Does the placement show any light: a lamp part or a screen part whose colour is not black (a dark screen is `tint: [0, 0, 0]`). */
export function propGlows(p: Pick<PropPlacement, 'prop' | 'tint' | 'lamp'>): boolean {
  const parts = PROP_EMISSIVE_PARTS[p.prop];
  if (!parts) return false;
  const lit = (t: Rgb): boolean => t[0] > 0 || t[1] > 0 || t[2] > 0;
  if (parts.includes('screen') && lit(p.tint ?? PROP_SCREEN_TINT)) return true;
  return parts.includes('lamp') && lit(p.lamp ?? PROP_LAMP_TINT[p.prop] ?? PROP_LAMP_TINT.default);
}

/** Positions snap to this grid (m, x and z), heights to `PROP_SNAP_Y`. */
export const PROP_SNAP = 0.05;
export const PROP_SNAP_Y = 0.01;

/** The strongroom door: the leaf's hinge axis in the frame's frame (`vaultDoor` x, z; build.py VAULT_HINGE), the clear
 *  opening, and the leaf's swing sign (outward, to the frame's +z face). */
export const VAULT_HINGE = { x: -0.78, z: 0.43 };
export const VAULT_OPENING = { width: 1.4, height: 2.2 };
export const VAULT_SWING_SIGN = -1;

/** One placed prop: its origin in the world (the footprint centre on the floor; a wall prop's back on the wall face),
 *  a yaw about +y (Babylon's: local +z, the prop's front, -> (sin yaw, 0, cos yaw)). */
export interface PropPlacement {
  prop: PropId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** The `screen` mesh's colour (default `PROP_SCREEN_TINT`; [0, 0, 0] for a dark screen). */
  tint?: Rgb;
  /** The `lamp` mesh's colour (default `PROP_LAMP_TINT`). */
  lamp?: Rgb;
  /** Keep the yaw as given (default: snapped to 90 degrees). */
  free?: boolean;
  /** `vaultLeaf`: the `Door` anchor it follows (swings by its open state; the door's own leaf is not drawn). */
  door?: number;
  /** (S3-7 S1, light parity) The light circuit (`LightDef.group`) the placement's emissives sit on: they dim while no lamp of
   *  the group is on (cut by a switch, a jam, a shot), as the kit's grouped LED lines do. Unset: always lit. */
  group?: number;
  /** (S3-7 S1) A powered device (a laser id: the beam tower's lens) whose state the emissives follow: dark while it is
   *  off (`PropRender.setDevice`; render side, gameplay never reads it). Unset: no device. */
  device?: string;
  /** (marlow-polish P3-1) The shared course flag the `device` follows (on = set): `CtDevices` reads it and calls
   *  `setDevice`; the renderer never reads it. Unset: the device is driven some other way (a laser id). */
  flag?: string;
  /** (P3-1) The `lamp` colour shown, lit, while the `device` is off (a red / green status lamp). Unset: the lamp dims
   *  while off (`PROP_DARK`), as before. */
  lampOff?: Rgb;
}

/** A world-space gameplay box (`LevelBuilder.box` arguments). */
export interface PropWorldBox {
  c: [number, number, number];
  s: [number, number, number];
  yaw: number;
  visible: boolean;
  noLedge: boolean;
  color: string;
}

// ----------------------------------------------------------------------------------------------------------- maths

export const snap = (v: number, step = PROP_SNAP): number => Math.round(v / step) * step;

/** A yaw folded into [0, 2 pi). */
export function foldYaw(yaw: number): number {
  const t = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(t - 2 * Math.PI) < 1e-9 ? 0 : t;
}

/** The nearest multiple of 90 degrees, folded into [0, 2 pi). */
export function snapYaw(yaw: number): number {
  const q = Math.PI / 2;
  return foldYaw(Math.round(yaw / q) * q);
}

/** A placement snapped: x and z to 5 cm, y to 1 cm, the yaw to 90 degrees unless `free`. */
export function snapPlacement(p: PropPlacement): PropPlacement {
  return { ...p, x: snap(p.x), y: snap(p.y, PROP_SNAP_Y), z: snap(p.z), yaw: p.free ? foldYaw(p.yaw) : snapYaw(p.yaw) };
}

/** The yaw whose local +x runs from (x1, z1) towards (x2, z2). */
export const runYaw = (dx: number, dz: number): number => Math.atan2(-dz, dx);

/** A point of a prop's frame in the world. */
export function propToWorld(p: Pick<PropPlacement, 'x' | 'y' | 'z' | 'yaw'>, lx: number, ly: number, lz: number): [number, number, number] {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  return [p.x + lx * c + lz * s, p.y + ly, p.z - lx * s + lz * c];
}

/** The placement's world matrix (Babylon's layout: the yaw, then the position) into `out` at `o`. Allocation-free. */
export function propMatrix(p: Pick<PropPlacement, 'x' | 'y' | 'z' | 'yaw'>, out: Float32Array, o: number): void {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  out[o] = c;
  out[o + 1] = 0;
  out[o + 2] = -s;
  out[o + 3] = 0;
  out[o + 4] = 0;
  out[o + 5] = 1;
  out[o + 6] = 0;
  out[o + 7] = 0;
  out[o + 8] = s;
  out[o + 9] = 0;
  out[o + 10] = c;
  out[o + 11] = 0;
  out[o + 12] = p.x;
  out[o + 13] = p.y;
  out[o + 14] = p.z;
  out[o + 15] = 1;
}

/** The world-space boxes the level builder holds under a placed prop (`null`: visual only). */
export function propCollisionBox(p: PropPlacement): PropWorldBox[] | null {
  const boxes = PROP_COLLISION[p.prop];
  if (!boxes) return null;
  return boxes.map((b) => {
    const c = propToWorld(p, (b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, (b.lo[2] + b.hi[2]) / 2);
    return {
      c,
      s: [b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]],
      yaw: p.yaw,
      visible: !b.see,
      noLedge: !!b.noLedge,
      color: PROP_BOX_COLOR[p.prop],
    };
  });
}

/** What `writePropBoxes` writes into (a `LevelBuilder`; structural, so this module stays Babylon-free). */
export interface PropBoxBuilder {
  readonly boxes: readonly unknown[];
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: string, yaw?: number, pitch?: number, collide?: boolean, visible?: boolean): unknown;
  mark(from: number, flags: { overhead?: boolean; noLedge?: boolean; art?: boolean }): unknown;
}

/** Writes every placement's gameplay boxes into the level builder (the map builder's one call per set). */
export function writePropBoxes(b: PropBoxBuilder, placements: readonly PropPlacement[]): void {
  for (const p of placements) {
    const boxes = propCollisionBox(p);
    if (!boxes) continue;
    for (const w of boxes) {
      const from = b.boxes.length;
      b.box(w.c[0], w.c[1], w.c[2], w.s[0], w.s[1], w.s[2], w.color, w.yaw, 0, true, w.visible);
      if (w.noLedge) b.mark(from, { noLedge: true });
    }
  }
}

/**
 * A row of repeated props from (x1, z1) to (x2, z2) on a floor at `y`: whole modules of `PROP_PITCH` centred on the
 * line, local +x along it, the fronts (+z) to the left of the walk (`flip`: to the right). Ends snap to 5 cm, the yaw to
 * 90 degrees unless `free`. A row of `palletRackBay` gets its closing `palletRackEnd`.
 */
export function propRow(
  prop: PropId,
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  opts: { y?: number; flip?: boolean; free?: boolean; tint?: Rgb; lamp?: Rgb; pitch?: number; group?: number } = {},
): PropPlacement[] {
  x1 = snap(x1);
  z1 = snap(z1);
  x2 = snap(x2);
  z2 = snap(z2);
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 1e-6) return [];
  const pitch = opts.pitch ?? PROP_PITCH[prop];
  const n = Math.max(1, Math.floor(len / pitch + 1e-6));
  const ux = dx / len;
  const uz = dz / len;
  const base = runYaw(dx, dz) + (opts.flip ? Math.PI : 0);
  const yaw = opts.free ? foldYaw(base) : snapYaw(base);
  const y = snap(opts.y ?? 0, PROP_SNAP_Y);
  const off = (len - n * pitch) / 2;
  const out: PropPlacement[] = [];
  for (let i = 0; i < n; i++) {
    const t = off + (i + 0.5) * pitch;
    const p: PropPlacement = { prop, x: x1 + ux * t, y, z: z1 + uz * t, yaw, free: opts.free };
    if (opts.tint) p.tint = opts.tint;
    if (opts.lamp) p.lamp = opts.lamp;
    if (opts.group !== undefined) p.group = opts.group;
    out.push(p);
  }
  if (prop === 'palletRackBay') {
    // each bay's frame is at its local -x end: the bay whose +x end meets no other bay's frame gets the closing frame
    // (iterate the bays only: each closing frame pushed into `out` would itself find no frame past it and add another,
    // forever - the batch 1 hang)
    const half = pitch / 2;
    const bays = out.slice();
    for (const b of bays) {
      const [ex, , ez] = propToWorld(b, half, 0, 0);
      const covered = bays.some((o) => {
        const [fx, , fz] = propToWorld(o, -half, 0, 0);
        return Math.abs(fx - ex) < 1e-3 && Math.abs(fz - ez) < 1e-3;
      });
      if (!covered) out.push({ prop: 'palletRackEnd', x: ex, y, z: ez, yaw, free: opts.free });
    }
  }
  return out;
}

/** The strongroom door's frame and leaf (shut) at (x, z) on a floor at `y`, `yaw` the frame's (its +z face, where the
 *  leaf swings, is the public side), and the hinged `Door` the level builder adds for its opening:
 *  `b.door(a.hx, a.hy, a.hz, a.width, a.yaw, { height: a.height, swing: a.swing, leaf: 'slide', locked })` (`leaf:
 *  'slide'` so `Doors` draws no leaf of its own), then set the leaf's `door` to the anchor's id. */
export function vaultDoorProps(x: number, z: number, yaw: number, y = 0): { frame: PropPlacement; leaf: PropPlacement; anchor: { hx: number; hy: number; hz: number; width: number; height: number; yaw: number; swing: 1 | -1 } } {
  const frame = snapPlacement({ prop: 'vaultDoor', x, y, z, yaw });
  const [lx, , lz] = propToWorld(frame, VAULT_HINGE.x, 0, VAULT_HINGE.z);
  const leaf: PropPlacement = { prop: 'vaultLeaf', x: lx, y: frame.y, z: lz, yaw: frame.yaw, free: true };
  const [hx, , hz] = propToWorld(frame, -VAULT_OPENING.width / 2, 0, 0);
  // Doors: the shut leaf lies along (sin yaw, cos yaw) from the hinge (the frame's +x); it opens by yaw + swing x angle,
  // a negative turn of the frame's +x towards its +z face
  return { frame, leaf, anchor: { hx, hy: frame.y, hz, width: VAULT_OPENING.width, height: VAULT_OPENING.height, yaw: foldYaw(frame.yaw + Math.PI / 2), swing: VAULT_SWING_SIGN } };
}

// ------------------------------------------------------------------------------------------------------- checks

/** A set's box on the floor plan (m). */
export interface PropArea {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

/** The build report's shape (facility-props.json). */
export interface PropReport {
  pieces: Record<string, { meshes: Record<string, number>; triangles: number }>;
}

/** Triangles a set's placements draw (the report's per-prop counts). */
export function propTriangles(placements: readonly PropPlacement[], report: PropReport): number {
  let n = 0;
  for (const p of placements) n += report.pieces[p.prop]?.triangles ?? 0;
  return n;
}

/** Draws a set's placements cost: one thin-instanced mesh per (prop, material) placed. */
export function propDraws(placements: readonly PropPlacement[], report: PropReport): number {
  const seen = new Set<string>();
  let n = 0;
  for (const p of placements) {
    if (seen.has(p.prop)) continue;
    seen.add(p.prop);
    n += Object.keys(report.pieces[p.prop]?.meshes ?? {}).length;
  }
  return n;
}

/** A rectangle's corners on the floor plan (world x, z). */
function corners(p: PropPlacement, x0: number, z0: number, x1: number, z1: number): [number, number][] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ].map(([lx, lz]) => {
    const w = propToWorld(p, lx!, 0, lz!);
    return [w[0], w[2]] as [number, number];
  });
}

/** Separating-axis test of two convex quads on the floor plan: true when they overlap by more than `eps`. */
function quadsOverlap(a: [number, number][], b: [number, number][], eps: number): boolean {
  for (const q of [a, b]) {
    for (let i = 0; i < 4; i++) {
      const [ax, az] = q[i]!;
      const [bx, bz] = q[(i + 1) % 4]!;
      const len = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
      if (len < 1e-9) continue;
      const nx = -(bz - az) / len;
      const nz = (bx - ax) / len;
      let amin = Infinity;
      let amax = -Infinity;
      let bmin = Infinity;
      let bmax = -Infinity;
      for (const [x, z] of a) {
        const d = x * nx + z * nz;
        amin = Math.min(amin, d);
        amax = Math.max(amax, d);
      }
      for (const [x, z] of b) {
        const d = x * nx + z * nz;
        bmin = Math.min(bmin, d);
        bmax = Math.max(bmax, d);
      }
      if (amax - bmin <= eps || bmax - amin <= eps) return false;
    }
  }
  return true;
}

/**
 * A dressing pass's layout problems (empty: fine): a prop's drawn footprint outside the set's box, two props'
 * gameplay boxes overlapping on the floor plan (where their heights overlap; touching is fine: rows), and, with the
 * build report, the set over its triangle or draw budget (`PROP_SET_BUDGET`).
 */
export function checkPropLayout(placements: readonly PropPlacement[], area: PropArea, report?: PropReport): string[] {
  const out: string[] = [];
  const eps = 0.01;
  const name = (i: number): string => `${placements[i]!.prop}#${i}`;
  placements.forEach((p, i) => {
    const f = PROP_FOOTPRINT[p.prop];
    for (const [x, z] of corners(p, f[0], f[1], f[2], f[3])) {
      if (x < area.x0 - eps || x > area.x1 + eps || z < area.z0 - eps || z > area.z1 + eps) {
        out.push(`${name(i)} outside the set's box at (${x.toFixed(2)}, ${z.toFixed(2)})`);
        break;
      }
    }
  });
  const quads = placements.map((p) => (PROP_COLLISION[p.prop] ?? []).map((b) => ({ q: corners(p, b.lo[0], b.lo[2], b.hi[0], b.hi[2]), y0: p.y + b.lo[1], y1: p.y + b.hi[1] })));
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      let hit = false;
      for (const a of quads[i]!) {
        for (const b of quads[j]!) {
          if (a.y1 - b.y0 <= eps || b.y1 - a.y0 <= eps) continue;
          if (quadsOverlap(a.q, b.q, eps)) hit = true;
        }
      }
      if (hit) out.push(`${name(i)} overlaps ${name(j)}`);
    }
  }
  if (report) {
    const t = propTriangles(placements, report);
    const d = propDraws(placements, report);
    if (t > PROP_SET_BUDGET.tris) out.push(`${t} prop triangles (budget ${PROP_SET_BUDGET.tris})`);
    if (d > PROP_SET_BUDGET.draws) out.push(`${d} prop draws (budget ${PROP_SET_BUDGET.draws})`);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------------- builder

/**
 * A set's dressing list for a map builder: `const props = new FacilityProps()` ... `props.add(..)`, `props.row(..)`,
 * `props.vault(..)`, then `props.write(b)` (the gameplay boxes into the `LevelBuilder`) and hand `props.placements` to
 * the renderer (`PropRender`). Every placement is snapped (`snapPlacement`).
 */
export class FacilityProps {
  readonly placements: PropPlacement[] = [];

  /** One prop; returns its index (the renderer's handle for `setTint`). */
  add(
    prop: PropId,
    x: number,
    z: number,
    yaw: number,
    opts: { y?: number; free?: boolean; tint?: Rgb; lamp?: Rgb; door?: number; group?: number; device?: string; flag?: string; lampOff?: Rgb } = {},
  ): number {
    const p: PropPlacement = snapPlacement({ prop, x, y: opts.y ?? 0, z, yaw, free: opts.free });
    if (opts.tint) p.tint = opts.tint;
    if (opts.lamp) p.lamp = opts.lamp;
    if (opts.door !== undefined) p.door = opts.door;
    if (opts.group !== undefined) p.group = opts.group;
    if (opts.device !== undefined) p.device = opts.device;
    if (opts.flag !== undefined) p.flag = opts.flag;
    if (opts.lampOff) p.lampOff = opts.lampOff;
    this.placements.push(p);
    return this.placements.length - 1;
  }

  /** A row (`propRow`); returns the first index. */
  row(prop: PropId, x1: number, z1: number, x2: number, z2: number, opts: Parameters<typeof propRow>[5] = {}): number {
    const first = this.placements.length;
    this.placements.push(...propRow(prop, x1, z1, x2, z2, opts));
    return first;
  }

  /** The strongroom door (`vaultDoorProps`): adds the frame and the leaf, returns the anchor to add and the leaf's
   *  index (set `placements[leaf].door` to the anchor's id). */
  vault(x: number, z: number, yaw: number, y = 0): { leaf: number; anchor: ReturnType<typeof vaultDoorProps>['anchor'] } {
    const v = vaultDoorProps(x, z, yaw, y);
    this.placements.push(v.frame, v.leaf);
    return { leaf: this.placements.length - 1, anchor: v.anchor };
  }

  /** Writes the gameplay boxes (`writePropBoxes`). */
  write(b: PropBoxBuilder): this {
    writePropBoxes(b, this.placements);
    return this;
  }

  /** The layout check (`checkPropLayout`). */
  check(area: PropArea, report?: PropReport): string[] {
    return checkPropLayout(this.placements, area, report);
  }
}
