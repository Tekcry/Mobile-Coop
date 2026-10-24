// Visual gate viewpoints (job visual-gate, slice VG3; BRIEF A4, A5, A10, A15, A16; PLAN sections 2 and 3): the literal
// views, torch rigs and parity cards the gate shoots (`harness.mjs`, VG2) and measures (`metrics.mjs`, VG1). Pure data,
// no imports. Every coordinate is copied from origin/master (merge of train/69, 1dc3ecfa) and cited `<file>:<line>` there;
// a map edit that moves a view re-baselines that view (A4). Regions are world quads the harness projects in the page
// (A5); each quad comment cites the map-builder box it was read from (`file:line`, the helper's `b.box` line in brackets
// when the box comes through a helper). Rule bounds stay null until VG8 calibrates them; VG8 edits them here in place.
// Build notes, the per-view source table and the deviations: docs/visual-gate/checks/vg3-build.md.

/** World metres, Babylon axes (y up). @typedef {[number, number, number]} Vec3 */
/** @typedef {'low' | 'epic'} Preset */
/** @typedef {'ctcourse' | 'campusOps' | 'warehouseOps' | 'warehouse'} MapId */
/** Boot query WITHOUT gfx / weather (the harness adds `&gfx=<preset>&weather=clear`). @typedef {{ query: string, label: string }} MapCfg */
/** @typedef {'F1' | 'F2' | 'F4' | 'F5' | 'F5b' | 'F6' | 'F7' | 'F8'} Target */
/** null bounds until VG8 calibrates. @typedef {{ min?: number | null, max?: number | null, presets?: Preset[] }} Rule */
/** A world quad, 4 corners in order round the edge (a wall face, a floor patch, a ceiling band). @typedef {[Vec3, Vec3, Vec3, Vec3]} Quad */
/**
 * @typedef {{
 *   id: string,                      // unique; prefix m- / cp- / so- / wh- by map
 *   map: MapId,
 *   src: string,                     // origin/master file:line the coords came from
 *   feet: Vec3,                      // player teleport (meter / field point, 1.7 m body height)
 *   cam: Vec3, target: Vec3,         // photo camera eye and look-at
 *   regions: Record<string, Quad>,   // e.g. wall, upper, floor; 'whole' is implicit, never listed
 *   metrics: Record<string, ('haze' | 'blotch' | 'arc')[]>, // per region extras (stats always); keys subset of regions
 *   rules: Record<string, Rule>,     // '<region>.<metric>'; region in regions or 'whole'
 *   parity: Vec3[] | null,           // grey-card points (Epic only), null for most views
 *   targets: Target[],               // walk finds this view covers ([] for plain coverage views)
 *   known: string | null,            // e.g. 'F5b lr16-8-triage.md:65' (A10)
 * }} View
 */
/**
 * @typedef {{
 *   id: string, map: MapId, src: string,
 *   door: { at: Vec3, src: { 'v4.82.0': string, 'v4.88.0': string, master: string } } | null, // the shut door (centre) per tag; null for so-corner
 *   guard: { pos: Vec3, yaw: number },   // yaw: Enemy.yaw, facing (sin yaw, cos yaw) on (x, z) (src/world/torches.ts:44-50)
 *   feet: Vec3, cam: Vec3, target: Vec3,
 *   regions: Record<string, Quad>,   // must include 'leak'
 *   rules: Record<string, Rule>,     // 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 }
 *   targets: Target[], known: string | null,
 * }} Rig
 */

/** The four boot queries (no gfx / weather: the harness adds them). @type {Record<MapId, MapCfg>} */
export const MAPS = {
  // scripts/shots-ctcourse.mjs:50
  ctcourse: { query: 'autostart=ctcourse&mode=course', label: 'Marlow Yard' },
  // scripts/campus-art-shots.mjs:31 with sectorGuards 0 -> 1 (C0 M2: the cp-door rig needs a guard)
  campusOps: { query: 'autostart=campusOps&mode=sector&sectorGuards=1', label: 'Saltmarsh Park - Sector Ops' },
  // scripts/sector-lights-shots.mjs:33
  warehouseOps: { query: 'autostart=warehouseOps&mode=sector&sectorGuards=4', label: 'Warehouse - Sector Ops' },
  // scripts/e2e-darkness.mjs:10 (A16; scripts/sector-lights-shots.mjs:35 used mode=sandbox)
  warehouse: { query: 'autostart=warehouse&mode=clear', label: 'Warehouse' },
};

/** @type {Preset[]} */
export const PRESETS = ['low', 'epic'];

// Region metrics (brief "metrics"): stats always; wall adds blotch and arc, upper adds haze, floor adds nothing.
// Rules per target (brief "rules", PLAN section 2), bounds null: F1 / F8 upper.veil (max) and upper.contrast (min), Epic;
// F2 floor.nearBlack (max); F4 wall.arc (max), Epic; F6 whole.mean (min) and whole.nearBlack (max); F7 wall.blotch (max), Low.
// A view without a `floor` region frames no floor (the deviations in vg3-build.md say why for each).

/** @type {View[]} */
export const VIEWS = [
  // ---- Marlow Yard (ctcourse, 9): SHOT_VANTAGES (src/world/maps/ctcourse.ts:205); every one F6
  {
    id: 'm-a1-lounge',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a1Gate.ts:265', // vantage 'a1-lounge-door'
    feet: [5, 0, 11],
    cam: [3.2, 1.8, 10.2],
    target: [11.7, 1.6, 8],
    regions: {
      // the lounge's east wall face x 5.85 (a1Gate.ts:160 [:130]) and the sliding door's lintel (a1Gate.ts:167 [kit/facilityKit.ts:468]),
      // from 2.1 to under the lounge ceiling slab at 3.2 (a1Gate.ts:163)
      upper: [[5.85, 2.1, 8.4], [5.85, 2.1, 11.4], [5.85, 3.1, 11.4], [5.85, 3.1, 8.4]],
      // the same east wall face beside the shut sliding door (z 8.15 - 10.1, a1Gate.ts:160 [:130]), 2.7 m ahead
      wall: [[5.85, 0.6, 8.4], [5.85, 0.6, 10], [5.85, 2, 10], [5.85, 2, 8.4]],
    },
    metrics: { upper: ['haze'], wall: ['blotch', 'arc'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    parity: null,
    targets: ['F6'],
    known: null,
  },
  {
    id: 'm-a2-vantage',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a2CarriageShed.ts:371', // vantage 'a2-vantage'
    feet: [33.5, 0, 12.5],
    cam: [31.4, 1.7, 12.9],
    target: [52, 1.4, 12.3],
    regions: {
      // the site floor (ctcourseSets/facility.ts:659), 8 - 11 m ahead in the carriage shed
      floor: [[39.5, 0, 11.6], [42.5, 0, 11.6], [42.5, 0, 13.6], [39.5, 0, 13.6]],
      // the hall roof's underside at 10 (ctcourseSets/facility.ts:661 [:320]), 31 m out over the shed
      upper: [[59.7, 10, 7.8], [62.7, 10, 7.8], [62.7, 10, 10.8], [59.7, 10, 10.8]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    parity: null,
    targets: ['F6'],
    known: null,
  },
  {
    id: 'm-a3-lobby',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a3OfficeRange.ts:370', // vantage 'a3-lobby'
    feet: [78.5, 0, 10.75], // A3_POST_WEST (78.5, 10.75), ctcourseSets/a3OfficeRange.ts:74
    cam: [77.0, 1.7, 10.9],
    target: [96, 1.4, 10.75],
    regions: {
      // the corridor floor (site floor ctcourseSets/facility.ts:659 under the vinyl skin a3OfficeRange.ts:432 [:393])
      floor: [[80.3, 0.01, 9.4], [83.3, 0.01, 9.4], [83.3, 0.01, 12.4], [80.3, 0.01, 12.4]],
      // the corridor's south wall near its east end, plaster face z 9.03 (greybox a3OfficeRange.ts:235 [ctcourseGreybox.ts:641],
      // skin :396 [:379]), 2.0 to under the 3.0 ceiling slab
      upper: [[94, 2, 9.03], [97, 2, 9.03], [97, 2.9, 9.03], [94, 2.9, 9.03]],
      // F7 (BRIEF F7 row): the corridor's north wall x 81-96, y 1.8-2.9, on its plaster face z 12.47 (greybox z 12.5 - 12.8
      // a3OfficeRange.ts:235 [ctcourseGreybox.ts:641], skin :396 [:388])
      wall: [[81, 1.8, 12.47], [96, 1.8, 12.47], [96, 2.9, 12.47], [81, 2.9, 12.47]],
    },
    metrics: { floor: [], upper: ['haze'], wall: ['blotch', 'arc'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null }, 'wall.blotch': { max: null, presets: ['low'] } },
    parity: null,
    targets: ['F6', 'F7'],
    known: null,
  },
  {
    id: 'm-a4-aisle',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a4GoodsShed.ts:488', // vantage 'a4-main-aisle-east'
    feet: [110, 0, 40],
    cam: [110.8, 1.8, 40.6],
    target: [78, 1.5, 35.0],
    regions: {
      // the site floor (ctcourseSets/facility.ts:659) in the main aisle, 5 m ahead
      floor: [[104.1, 0, 38.2], [107.1, 0, 38.2], [107.1, 0, 41.2], [104.1, 0, 41.2]],
      // the south rack run's aisle face z 35.63 (a4GoodsShed.ts:241 [:220], skin :638 [:495]), 2.0 - 5.4, 19 m down the aisle
      upper: [[89.8, 2, 35.63], [94.8, 2, 35.63], [94.8, 5.4, 35.63], [89.8, 5.4, 35.63]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    parity: null,
    targets: ['F6'],
    known: null,
  },
  {
    id: 'm-a5-kiosk',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a5Substation.ts:416', // vantage 'a5-kiosk'
    feet: [48.5, 0, 33.2],
    cam: [47.3, 1.8, 31.6],
    target: [58, 1.2, 36],
    regions: {
      // the site floor (ctcourseSets/facility.ts:659), 5.5 m ahead
      floor: [[50.6, 0, 32.1], [53.6, 0, 32.1], [53.6, 0, 35.1], [50.6, 0, 35.1]],
      // the set boundary wall x 69.75 (ctcourseSets/facility.ts:293 [:262], skin a5Substation.ts:437 [:434, :425]), 2.0 - 4.5, 25 m out
      upper: [[69.75, 2, 40.3], [69.75, 2, 46.3], [69.75, 4.5, 46.3], [69.75, 4.5, 40.3]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    // Marlow parity cards (floor + 1.0, >= 1.2 m from any wall, in frame): a lamp pool, between pools, the darkest open spot
    parity: [[56.5, 1, 29.2], [51.8, 1, 34.3], [56.6, 1, 39.1]],
    targets: ['F6'],
    known: null,
  },
  {
    id: 'm-a6-kerb',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a6PumpHouse.ts:388', // vantage 'a6-kerb'
    feet: [51.0, 0, 56.6], // A6_VANTAGE (51.0, 56.6), ctcourseSets/a6PumpHouse.ts:119
    cam: [50.2, 1.3, 55.6],
    target: [51.5, 3.2, 66],
    regions: {
      // the hall's north wall face z 71.75 (ctcourseSets/facility.ts:293 [:261]) behind the motor gallery, 2.0 - 9.9, 21 m out
      upper: [[63.7, 2, 71.75], [61.7, 2, 71.75], [61.7, 9.9, 71.75], [63.7, 9.9, 71.75]],
      // the drive cage's south face z 62 and its locked door (a6PumpHouse.ts:276 [ctcourseGreybox.ts:641, :647]), 6.5 m ahead,
      // from over the sump kerb's line of sight (1.2) to 2.2
      wall: [[49.6, 1.2, 62], [53.4, 1.2, 62], [53.4, 2.2, 62], [49.6, 2.2, 62]],
    },
    metrics: { upper: ['haze'], wall: ['blotch', 'arc'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    parity: null,
    targets: ['F6'],
    known: null,
  },
  {
    id: 'm-a7-corridor',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a7DataHall.ts:445', // vantage 'a7-corridor'
    feet: [73.5, 0, 53.9],
    cam: [72.2, 1.7, 53.6],
    target: [92, 1.2, 54.0],
    regions: {
      // the site floor (ctcourseSets/facility.ts:659) in the corridor, 4 - 6 m ahead
      floor: [[75.4, 0, 52.7], [78.4, 0, 52.7], [78.4, 0, 54.7], [75.4, 0, 54.7]],
      // the corridor's south wall z 52.28 (ctcourseSets/facility.ts:293 [:261], skin a7DataHall.ts:473 [:462]), 2.0 - 3.4, 15 - 21 m out
      upper: [[87.4, 2, 52.28], [93.4, 2, 52.28], [93.4, 3.4, 52.28], [87.4, 3.4, 52.28]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    parity: null,
    targets: ['F6'],
    known: null,
  },
  {
    id: 'm-a8-vestibule',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/a8Strongroom.ts:662', // vantage 'a8-vestibule'
    feet: [107.4, 0, 64.5],
    cam: [106.8, 1.7, 64.0],
    target: [126, 1.4, 66],
    regions: {
      // the site floor (ctcourseSets/facility.ts:659 under the paint skin a8Strongroom.ts:850 [:712]), 5 m ahead
      floor: [[110.5, 0.01, 63], [113.5, 0.01, 63], [113.5, 0.01, 66], [110.5, 0.01, 66]],
      // the strongroom hall's east wall x 133.82 (a8Strongroom.ts:348 [:319], skin :708 [:672]), 2.0 - 9.0, 27 m out
      upper: [[133.82, 2, 63.8], [133.82, 2, 69.8], [133.82, 9, 69.8], [133.82, 9, 63.8]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    parity: null,
    targets: ['F6'],
    known: null,
  },
  {
    id: 'm-f-gallery',
    map: 'ctcourse',
    src: 'src/world/maps/ctcourseSets/facility.ts:747', // vantage 'f-gallery-from-a1'
    feet: [14.5, 0, 14],
    cam: [14, 1.8, 12],
    target: [14, 6, 21],
    regions: {
      // the hall's north wall z 19.75 under the gallery (ctcourseSets/facility.ts:293 [:261]), 2.0 - 4.5, 8 m out
      upper: [[19, 2, 19.75], [13, 2, 19.75], [13, 4.5, 19.75], [19, 4.5, 19.75]],
    },
    metrics: { upper: ['haze'] },
    rules: { 'whole.mean': { min: null }, 'whole.nearBlack': { max: null } },
    parity: null,
    targets: ['F6'],
    known: null,
  },

  // ---- Saltmarsh Park (campusOps, 10): scripts/campus-art-shots.mjs ROWS :36-77 ([name, feet, eye, target])
  {
    id: 'cp-s1-b',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:39',
    feet: [15, 0, -74],
    cam: [15, 1.7, -74],
    target: [19, 0.9, -77],
    regions: {
      // the gatehouse floor (the campus ground, campusOps.ts:120), 4 m ahead
      floor: [[15.9, 0, -78.3], [18.9, 0, -78.3], [18.9, 0, -75.3], [15.9, 0, -75.3]],
      // the south boundary wall z -84 (campusOps.ts:121, 6 m) through the gatehouse window, 2.0 - 3.1, 27 m out
      upper: [[37.6, 2, -84], [43.6, 2, -84], [43.6, 3.1, -84], [37.6, 3.1, -84]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },
  {
    id: 'cp-s1-f',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:43',
    feet: [-2, 0, -44],
    cam: [-2, 1.7, -44],
    target: [-20, 2, -36],
    regions: {
      // the forecourt ground (campusOps.ts:120), 6 m ahead
      floor: [[-8.5, 0, -43.3], [-5.5, 0, -43.3], [-5.5, 0, -40.3], [-8.5, 0, -40.3]],
      // the west boundary wall x -70 (campusOps.ts:121, 6 m), 2.0 - 6.0, 68 m out
      upper: [[-70, 2, -37.8], [-70, 2, -41.8], [-70, 6, -41.8], [-70, 6, -37.8]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    // campus parity cards: the canopy's lamp pool, between pools, the darkest open spot of the forecourt
    parity: [[-24.5, 1, -47.9], [-5.8, 1, -43.2], [-5.2, 1, -38.3]],
    targets: [],
    known: null,
  },
  {
    id: 'cp-s2-b',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:47',
    feet: [-12, 0, -22],
    cam: [-12, 1.7, -22],
    target: [-18, 6, -5],
    regions: {
      // the reception floor (campus ground campusOps.ts:120), 9 m ahead
      floor: [[-16.4, 0, -15.3], [-13.4, 0, -15.3], [-13.4, 0, -12.3], [-16.4, 0, -12.3]],
      // F8: the atrium roof's underside at 12 (campusS2.ts:374 [:300]), 27 m up and out
      upper: [[-29.5, 12, -4], [-24.5, 12, -4], [-24.5, 12, 1], [-29.5, 12, 1]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: { 'upper.veil': { max: null, presets: ['epic'] }, 'upper.contrast': { min: null, presets: ['epic'] } },
    parity: null,
    targets: ['F8'],
    known: null,
  },
  {
    id: 'cp-s2-d',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:49',
    feet: [-42, 4.4, -28],
    cam: [-42, 6.1, -28],
    target: [-32, 5, -10],
    regions: {
      // F8. The eye stands in the SW stair core's inner corner (core walls x -42.0 campusS2.ts:321 / z -28.0 :323 [:241, :242]),
      // 0.1 m under its landing slab (campusS2.ts:341): no open-plan floor or band is in frame. The one band above head height
      // (4.4 + 2.0) is the west corridor's wall z -20.1 (campusS2.ts:461 [:251, :241]) seen past the core wall the eye stands
      // on, 2 x 1.7 m, 8 m out (an open item in vg3-build.md: the source row frames the core, not the L1 open plan)
      upper: [[-42.5, 6.4, -20.1], [-43.5, 6.4, -20.1], [-43.5, 8.1, -20.1], [-42.5, 8.1, -20.1]],
    },
    metrics: { upper: ['haze'] },
    rules: { 'upper.veil': { max: null, presets: ['epic'] }, 'upper.contrast': { min: null, presets: ['epic'] } },
    parity: null,
    targets: ['F8'],
    known: null,
  },
  {
    id: 'cp-s3-a',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:54',
    feet: [23, 0, -19],
    cam: [23, 1.7, -19],
    target: [40, 2, -19],
    regions: {
      // F8: over the crane bay's 3.0 board screen (x 26.5, campusS3.ts:397, 3.5 m ahead, which hides the floor), the hall
      // roof's underside at 9 (campusS3.ts:329 [:309, :256]), 19 m out
      upper: [[35.8, 9, -14.6], [41.8, 9, -14.6], [41.8, 9, -8.6], [35.8, 9, -8.6]],
    },
    metrics: { upper: ['haze'] },
    rules: { 'upper.veil': { max: null, presets: ['epic'] }, 'upper.contrast': { min: null, presets: ['epic'] } },
    parity: null,
    targets: ['F8'],
    known: null,
  },
  {
    id: 'cp-s3-c',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:56',
    feet: [46, 0, -24],
    cam: [46, 1.7, -24],
    target: [51, 1.2, -15],
    regions: {
      // the hall floor (campus ground campusOps.ts:120), 5.5 m ahead (the eye stands on the EMC room's south face, campusS3.ts:389)
      floor: [[47.1, 0, -20.9], [50.1, 0, -20.9], [50.1, 0, -17.9], [47.1, 0, -17.9]],
      // the hall's north wall z -8.15 under the viewing corridor (campusS3.ts:373 / :376 [:295, :256]), 2.0 - 6.2, 16 m out
      upper: [[51.5, 2, -8.15], [45.5, 2, -8.15], [45.5, 6.2, -8.15], [51.5, 6.2, -8.15]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },
  {
    id: 'cp-s4-a',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:62',
    feet: [10.5, 0, 22.5],
    cam: [10.5, 1.7, 22.5],
    target: [10, 2, 32],
    regions: {
      // the data hall roof's underside at 7 (campusS4.ts:356 [:259]), 17 m out over the rack rows (the rack row ends
      // campusS4.ts:331 / :332 [:408, :259] hide the aisle floor)
      upper: [[1.5, 7, 34.9], [4.5, 7, 34.9], [4.5, 7, 37.9], [1.5, 7, 37.9]],
    },
    metrics: { upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },
  {
    id: 'cp-s4-e',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:66',
    feet: [-3, 3.6, 43],
    cam: [-3, 5.3, 43],
    target: [4, 4.5, 47],
    regions: {
      // the NOC floor slab at 3.6 (campusS4.ts:437 [:315, :259]), 5 m ahead
      floor: [[0.5, 3.6, 42.5], [3.5, 3.6, 42.5], [3.5, 3.6, 45.5], [0.5, 3.6, 45.5]],
      // the hall's north wall z 47.85 (campusS4.ts:347 [:298, :259]), 5.6 - 7.0, 8.5 m out
      upper: [[6.9, 5.6, 47.85], [0.9, 5.6, 47.85], [0.9, 7, 47.85], [6.9, 7, 47.85]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },
  {
    id: 'cp-s5-a',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:70',
    feet: [-48, 0, 20],
    cam: [-48, 1.7, 20],
    target: [-44, 3, 26],
    regions: {
      // the stair hall floor (campus ground campusOps.ts:120), 10 m ahead
      floor: [[-49.2, 0, 28.5], [-46.2, 0, 28.5], [-46.2, 0, 31.5], [-49.2, 0, 31.5]],
      // the hall's east wall x -38.1 (campusS5.ts:503 [:365, :311]), 2.0 - 3.9, 13 m out
      upper: [[-38.1, 2, 25.4], [-38.1, 2, 31.4], [-38.1, 3.9, 31.4], [-38.1, 3.9, 25.4]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },
  {
    id: 'cp-s5-d',
    map: 'campusOps',
    src: 'scripts/campus-art-shots.mjs:73',
    feet: [-39, 4.2, 43],
    cam: [-39, 5.9, 43],
    target: [-44, 5.2, 35],
    regions: {
      // the archive's L1 floor slab at 4.2 (campusS5.ts:481 [:383, :311]), 4 m ahead
      floor: [[-42.7, 4.2, 39.4], [-39.7, 4.2, 39.4], [-39.7, 4.2, 41.4], [-42.7, 4.2, 41.4]],
      // the roof slab's underside at 8.2 (campusS5.ts:482 [:383, :311]), 7.5 m out
      upper: [[-45.7, 8.2, 36.7], [-42.7, 8.2, 36.7], [-42.7, 8.2, 39.7], [-45.7, 8.2, 39.7]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },

  // ---- Sector Ops (warehouseOps, 5): scripts/sector-lights-shots.mjs ROWS :40-70 ([name, feet, cam, target, map?])
  {
    id: 'so-s1-goods-in',
    map: 'warehouseOps',
    src: 'scripts/sector-lights-shots.mjs:46',
    feet: [-20, 0, -16.5],
    cam: [-20.5, 1.7, -17],
    target: [-13, 4.2, -12],
    regions: {
      // F2: the bay floor (warehouse.ts:213) by the shut east shutter, 9 - 12 m out at the frame's foot
      floor: [[-11.2, 0.02, -17.5], [-8.2, 0.02, -17.5], [-8.2, 0.02, -14.5], [-11.2, 0.02, -14.5]],
      // F1: the bay's east wall x -8.15 past the high-bay (-11.65, 5.05, -11.2) (warehouseS1.ts:265 [:213] to 2.8, the void
      // west wall :271 from 2.8), 2.0 - 4.8, 14 m out
      upper: [[-8.15, 2, -11.4], [-8.15, 2, -9.4], [-8.15, 4.8, -9.4], [-8.15, 4.8, -11.4]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {
      'upper.veil': { max: null, presets: ['epic'] },
      'upper.contrast': { min: null, presets: ['epic'] },
      'floor.nearBlack': { max: null },
    },
    parity: null,
    targets: ['F1', 'F2'],
    known: null,
  },
  {
    id: 'so-s1-girder',
    map: 'warehouseOps',
    src: 'scripts/sector-lights-shots.mjs:61',
    feet: [22.5, 0, -13.6],
    cam: [22.5, 1.5, -13.6],
    target: [16, 3.0, -13.6],
    regions: {
      // the workshop floor (warehouse.ts:213), 12 m out
      floor: [[9.7, 0.02, -17.4], [12.7, 0.02, -17.4], [12.7, 0.02, -15.4], [9.7, 0.02, -15.4]],
      // F1: the workshop's west wall x 8.15 (warehouseS1.ts:267 / :268 [:213], :269, :275) seen under the girder and the
      // two HALL-beam strips at x 16 (z -15.8, -11.8), 2.0 - 3.3, 14 m out
      upper: [[8.15, 2, -11.6], [8.15, 2, -15.6], [8.15, 3.3, -15.6], [8.15, 3.3, -11.6]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: { 'upper.veil': { max: null, presets: ['epic'] }, 'upper.contrast': { min: null, presets: ['epic'] } },
    parity: null,
    targets: ['F1'],
    known: null,
  },
  {
    id: 'so-s1-workshop',
    map: 'warehouseOps',
    src: 'scripts/sector-lights-shots.mjs:48',
    feet: [10.5, 0, -16],
    cam: [10.5, 1.7, -16],
    target: [18, 3.6, -12.5],
    regions: {
      // the workshop floor (warehouse.ts:213), 7 m out
      floor: [[16.5, 0.02, -16.1], [18.5, 0.02, -16.1], [18.5, 0.02, -13.1], [16.5, 0.02, -13.1]],
      // the perimeter wall x 24 (warehouse.ts:212), 2.0 - 3.7, 14 m out
      upper: [[24, 2, -15.5], [24, 2, -9.5], [24, 3.7, -9.5], [24, 3.7, -15.5]],
      // F4: the compartment wall z -8.8, face -8.95 (warehouseS1.ts:245 [:212]), under the wall spots (15.6, 5.5, -9.25) and
      // (22.6, 5.5, -9.25) whose cones graze it (the workshop wall the hard arcs land on), 0.3 - 4.8, 9 m out
      wall: [[18.2, 0.3, -8.95], [14.2, 0.3, -8.95], [14.2, 4.8, -8.95], [18.2, 4.8, -8.95]],
    },
    metrics: { floor: [], upper: ['haze'], wall: ['blotch', 'arc'] },
    rules: { 'wall.arc': { max: null, presets: ['epic'] } },
    // Sector Ops parity card 1 of 3: under the pendants (19.9, -13.1), the lamp pool
    parity: [[19.9, 1, -13.1]],
    targets: ['F4'],
    known: null,
  },
  {
    id: 'so-s2-aisle',
    map: 'warehouseOps',
    src: 'scripts/sector-lights-shots.mjs:50',
    feet: [-12.5, 0, -5.4],
    cam: [-12.5, 1.7, -5.4],
    target: [-12.4, 3.4, 8],
    regions: {
      // the aisle floor (warehouse.ts:213), 7 m out
      floor: [[-13.5, 0.02, -0.3], [-10.5, 0.02, -0.3], [-10.5, 0.02, 2.7], [-13.5, 0.02, 2.7]],
      // the perimeter wall z 18 at the aisle's far end (warehouse.ts:212), 2.0 - 3.6, 23 m out
      upper: [[-11.3, 2, 18], [-13.3, 2, 18], [-13.3, 3.6, 18], [-11.3, 3.6, 18]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    // Sector Ops parity cards 2 and 3 of 3: between pools (the cross aisle), the darkest open spot (the aisle)
    parity: [[-10.9, 1, 5.4], [-11.8, 1, -0.6]],
    targets: [],
    known: null,
  },
  {
    id: 'so-s3-hall',
    map: 'warehouseOps',
    src: 'scripts/sector-lights-shots.mjs:54',
    feet: [1.5, 0, 4],
    cam: [1.5, 1.7, 4],
    target: [6, 3.9, 9],
    regions: {
      // the assembly hall floor (warehouse.ts:213), 17 m out
      floor: [[16.6, 0.02, 7.6], [19.6, 0.02, 7.6], [19.6, 0.02, 10.6], [16.6, 0.02, 10.6]],
      // the hall's north wall z 12, face 11.85 (warehouse.ts:256 [:45], warehouseS3.ts:204, the office door's lintel
      // warehouseS3.ts:210 [:155]), 2.0 - 3.2, 9 m out
      upper: [[7.9, 2, 11.85], [2.9, 2, 11.85], [2.9, 3.2, 11.85], [7.9, 3.2, 11.85]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },

  // ---- Warehouse (warehouse, 2): scripts/sector-lights-shots.mjs rows with map 'warehouse'
  {
    id: 'wh-floods-dock',
    map: 'warehouse',
    src: 'scripts/sector-lights-shots.mjs:68',
    feet: [-23, 0, -25.2],
    cam: [-22, 2.2, -25],
    target: [-13, 2.5, -19],
    regions: {
      // the yard ground (warehouse.ts:211) in front of the west dock door, 7 m out
      floor: [[-18.5, 0, -21.6], [-15.5, 0, -21.6], [-15.5, 0, -18.6], [-18.5, 0, -18.6]],
      // the facade's yard face z -18.15 (warehouse.ts:219 [:45], :463), 2.0 - 6.2, 22 m out
      upper: [[2.1, 2, -18.15], [-3.9, 2, -18.15], [-3.9, 6.2, -18.15], [2.1, 6.2, -18.15]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    // Warehouse parity cards: under the dock floods (the pool), between pools, the darkest open spot of the yard
    parity: [[-18.4, 1, -18.6], [-17.4, 1, -22.4], [-14.9, 1, -24.6]],
    targets: [],
    known: null,
  },
  {
    id: 'wh-flood-workshop',
    map: 'warehouse',
    src: 'scripts/sector-lights-shots.mjs:69',
    feet: [19, 0, -24.8],
    cam: [17, 2.4, -25],
    target: [11.5, 2.2, -19.5],
    regions: {
      // the yard ground (warehouse.ts:211) under the workshop door's flood, 8 m out
      floor: [[9.8, 0, -20.3], [12.8, 0, -20.3], [12.8, 0, -18.3], [9.8, 0, -18.3]],
      // the facade's yard face z -18.15 (warehouse.ts:219 [:45], :226, :463), 2.0 - 6.2, 10 m out
      upper: [[13.2, 2, -18.15], [7.2, 2, -18.15], [7.2, 6.2, -18.15], [13.2, 6.2, -18.15]],
    },
    metrics: { floor: [], upper: ['haze'] },
    rules: {},
    parity: null,
    targets: [],
    known: null,
  },
];

/**
 * The torch rigs (F5, F5b): a guard behind a shut hinged door (or down a side corridor) with the torch on, then off; the
 * leak is on - off over `leak` (PLAN section 2 F5 row). Door rule from scripts/e2e-darkness.mjs:188-212: door mid
 * m = hinge + (sin yaw, cos yaw) x width / 2, normal n = (cos yaw, -sin yaw) x s; guard at m + n x 1.2 facing the door
 * (yaw = atan2(-n.x, -n.z)), feet and cam at m - n x 2.2 (cam y floor + 1.6), target m at floor + 1.2. Each rig door's
 * anchor (hinge, yaw, width; not sliding, not locked) and the walls within 4 m are unchanged at v4.82.0, v4.88.0 and
 * origin/master (C0 P12; checked from map dumps at each tag, vg3-build.md).
 * @type {Rig[]}
 */
export const RIGS = [
  {
    id: 'so-door',
    map: 'warehouseOps',
    // the trade offices' corridor doors b.door(x, 0, -13.8, 1.2, PI / 2, { swing: 1 }), x -0.1: the transport office's door
    src: 'src/world/maps/warehouseS1.ts:311',
    door: {
      at: [0.5, 0, -13.8], // hinge (-0.1, 0, -13.8), width 1.2, yaw PI / 2: m = (0.5, -13.8)
      src: {
        'v4.82.0': 'src/world/maps/warehouseS1.ts:297',
        'v4.88.0': 'src/world/maps/warehouseS1.ts:311',
        master: 'src/world/maps/warehouseS1.ts:311',
      },
    },
    // s = 1: n = (0, -1); the guard in the transport office (z -18 to -13.8), the camera in the corridor (z -13.8 to -10.8)
    guard: { pos: [0.5, 0, -15.0], yaw: 0 },
    feet: [0.5, 0, -11.6],
    cam: [0.5, 1.6, -11.6],
    target: [0.5, 1.2, -13.8],
    regions: {
      // the leaf and 0.5 m of the corridor wall each side, floor to door top + 0.3, on the corridor face z -13.65
      // (the 0.3 wall on z -13.8, warehouseS1.ts:285 [:212], the head over the door :291 [:192])
      leak: [[-0.6, 0, -13.65], [1.6, 0, -13.65], [1.6, 2.4, -13.65], [-0.6, 2.4, -13.65]],
    },
    rules: { 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } },
    targets: ['F5'],
    known: null,
  },
  {
    id: 'cp-door',
    map: 'campusOps',
    // the gatehouse door b.door(16.4, 0, -73, 1.2, PI / 2, { swing: -1 }) in the gatehouse's north wall z -73 (campusS1.ts:194)
    src: 'src/world/maps/campusS1.ts:205',
    door: {
      at: [17, 0, -73], // hinge (16.4, 0, -73), width 1.2, yaw PI / 2: m = (17, -73)
      src: {
        'v4.82.0': 'src/world/maps/campusS1.ts:205',
        'v4.88.0': 'src/world/maps/campusS1.ts:205',
        master: 'src/world/maps/campusS1.ts:205',
      },
    },
    // s = 1: n = (0, -1); the guard inside the gatehouse (x 13.85 - 20.15, z -79.15 to -72.85), the camera on the verge outside
    guard: { pos: [17, 0, -74.2], yaw: 0 },
    feet: [17, 0, -70.8],
    cam: [17, 1.6, -70.8],
    target: [17, 1.2, -73],
    regions: {
      // the leaf and 0.5 m of wall each side, floor to door top + 0.3, on the wall's outer face z -72.85 (campusS1.ts:194,
      // the head over the door :195 [:176])
      leak: [[15.9, 0, -72.85], [18.1, 0, -72.85], [18.1, 2.4, -72.85], [15.9, 2.4, -72.85]],
    },
    rules: { 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } },
    targets: ['F5'],
    known: null,
  },
  {
    id: 'so-corner',
    map: 'warehouseOps',
    // the storage hall's racks: the side corridor is the aisle x -13.5 to -10.5 between R2N (x -15.8 to -13.5, z 7 - 15,
    // warehouseS2.ts:234) and the high bay R3N (x -10.5 to -8.2, z 7 - 15, the S2_COOP row warehouseS2.ts:77, built :236);
    // it meets the main corridor, the cross aisle z 4 - 7, at x -13.5 to -10.5. Same racks at v4.82.0 (:227, :77, :229)
    // and v4.88.0 (:234, :77, :236); every box in x -16 to -4, z 3 - 16 under 4.5 m is identical at the three tags.
    src: 'src/world/maps/warehouseS2.ts:77',
    door: null,
    // 5 m down the side aisle from its mouth (z 7), facing south along it towards the junction
    guard: { pos: [-12, 0, 12], yaw: Math.PI },
    // on the cross aisle 4 m east of the junction (x -10.5), facing R3N's corner: the beam's wall is R3N's west face x -10.5
    feet: [-6.5, 0, 4.6],
    cam: [-6.5, 1.6, 4.6],
    target: [-9.45, 1.2, 7],
    regions: {
      // the corner wall on the camera's side of the beam's wall: R3N's south face z 7 (warehouseS2.ts:236 highBay), 2 m
      // from the corner, floor to 2.5 (the haze wedge, lr16-8-triage.md A3)
      leak: [[-10.45, 0, 7], [-8.45, 0, 7], [-8.45, 2.5, 7], [-10.45, 2.5, 7]],
    },
    rules: { 'leak.mean': { max: 0.004 }, 'leak.p95': { max: 0.02 } },
    targets: ['F5b'],
    known: 'F5b lr16-8-triage.md:65-87',
  },
];
