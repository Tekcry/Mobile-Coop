// Which e2e suites a change must pass: changed file paths in, a sorted unique suite list out. Pure (no fs, no git, no Babylon):
// `scripts/run-e2e.mjs` (`--quick`, `--affected <base-ref> [--wide]`) and tests/e2eAffected.test.ts import it. Keep in step with
// docs/systems/testing-tools.md ("Choosing suites for a change").
//
// Three maps, one per tier (the laptop is the bottleneck, so a PR runs the narrow one):
//  - DIRECT_COVERS (`--affected`, the default): only the suites that drive the changed area directly
//  - WIDE_COVERS (`--affected --wide`): DIRECT plus the cross-area readers (lamp readers, guard suites, the co-op group, ...)
//  - QUICK_COVERS (`--quick`): master's `--quick` map unchanged (the folders the change touched), with master's rules for
//    the files outside it (see quickSuitesForFile)
//
// A suite name may carry a part (`e2e-sectorops:1`): one job of a suite that runs in parts. A whole suite in the result
// absorbs its parts. Names outside the runner's lists (GPU suites, a suite whose script is gone) are filtered by the runner.

// (process audit) CORE leaves out the input suites (the slowest); `src/input/` and `src/ui/` still pick them.
export const CORE = ['e2e-move', 'e2e-combat', 'e2e-anim'];

// --quick: master's map, byte for byte (scripts/run-e2e.mjs on master before this branch). A path under `src/` not listed
// here runs CORE. tests/e2eAffected.test.ts holds a frozen copy and checks it row by row.
export const QUICK_COVERS = {
  // the first match wins: the specific `src/core/` files before the folder
  // (anim-studio) the studio, its drive and the tuner's snapshots: their own suite on top of what their folders run
  'src/anim/studio': ['e2e-studio', 'anim-audit', 'e2e-anim'],
  'src/anim/tuneHistory': ['e2e-studio'],
  // (anim-studio-2) the co-op role / traversal move sections: live on the local player (the team moves, traversal)
  'src/anim/moveTune': ['e2e-studio', 'e2e-coop', 'e2e-traverse', 'e2e-anim'],
  'src/game/studioStage': ['e2e-studio', 'e2e-tuner-phone'],
  // (marlow-bays item 26) the free view's touch orbit, pinch and pan
  'src/player/freeView': ['e2e-tuner-phone', 'e2e-studio', 'anim-audit', 'e2e-anim', 'e2e-move'],
  'src/world/maps/studio.ts': ['e2e-studio'],
  'src/save/animTuneStore': ['e2e-studio', 'e2e-menus'],
  'src/ui/studio': ['e2e-studio'],
  'src/ui/tuneSnapshots': ['e2e-studio', 'e2e-menus'],
  'src/ui/overlayProject': ['e2e-studio', 'e2e-menus'],
  'src/ui/animTune': ['e2e-studio', 'e2e-tuner-phone', 'e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus'],
  // (tuner-ui) the tuner panel's pure layout; (marlow-bays slice T) its mouse mode and selection target (tunerMouse, tunerTarget)
  'src/ui/tuner': ['e2e-studio', 'e2e-tuner-phone', 'e2e-menus'],
  'src/core/quality': ['e2e-desktop', 'e2e-lightbake'],
  'src/core/display': ['e2e-desktop'],
  'src/core/settings': ['e2e-desktop', 'e2e-menus'],
  'src/core/flags': ['e2e-park', ...CORE],
  'src/core/': ['e2e-offline', ...CORE],
  'src/input/': ['e2e-pad', 'e2e-mouse', 'e2e-move', 'e2e-menus'],
  'src/ui/hud/ratingCard': ['e2e-section-rating'],
  'src/ui/screens/missionsScreen': ['e2e-sectorops', 'e2e-menus', 'e2e-pad', 'e2e-park'],
  'src/ui/': ['e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus'],
  // the training course (T1b): its own suite on top of co-op
  'src/game/course/': ['e2e-course', 'e2e-ctcourse', 'e2e-coop'],
  'src/game/modes/courseMode.ts': ['e2e-course', 'e2e-ctcourse', 'e2e-coop', 'e2e-section-rating'],
  // Sector Ops (feature/sector-ops): its mode, sectors and Warehouse copy
  'src/game/modes/sectorMode.ts': ['e2e-sectorops', 'e2e-park', 'e2e-section-rating'],
  // (section-rating) the rating rules, the card and the record: their suite on top of the modes'
  'src/game/rating/': ['e2e-section-rating', 'e2e-sectorops', 'e2e-course'],
  'src/save/ratingRecord': ['e2e-section-rating'],
  'src/game/sectors': ['e2e-sectorops'],
  'src/world/maps/warehouseOps.ts': ['e2e-sectorops'],
  'src/world/maps/warehouseSectors.ts': ['e2e-sectorops'],
  // (sector-fixes-r RE) the Sector Ops section files (warehouseS1-S3: the co-op routes and team doors) and the usual world
  // suites; (sector-fixes-r fix) not e2e-ctcourse: Marlow Yard never loads warehouseOps
  'src/world/maps/warehouseS': ['e2e-sectorops', 'e2e-lightbake', 'e2e-levels', 'e2e-anchors'],
  'src/game/': ['e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-park', 'e2e-ctcourse', 'e2e-sectorops'],
  'src/physics/': ['e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-ct'],
  // the camera files (CAM): the camera bounds suite on top of what their folders run
  'src/player/shoulderCamera': ['e2e-camera-bounds', 'e2e-move', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-mouse'],
  'src/player/cameraBounds': ['e2e-camera-bounds', 'e2e-move', 'e2e-anim', 'e2e-clip'],
  'src/config/camera': ['e2e-camera-bounds', 'e2e-anim', 'e2e-clip', ...CORE],
  'src/player/': ['anim-audit', 'e2e-guard-carry', 'e2e-wall', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-weapons-carry'],
  'src/anim/': ['anim-audit', 'e2e-anim', 'e2e-clip', 'e2e-weapons-carry', 'e2e-move'],
  'src/cover/': ['e2e-stealth', 'e2e-clip', 'e2e-tactics', 'e2e-wall'],
  'src/weapons/': ['e2e-combat', 'e2e-weapons-carry', 'e2e-enemies', 'e2e-gadgets', 'e2e-clip'],
  'src/ai/': ['e2e-stealth-ai', 'e2e-guard-carry', 'e2e-levels', 'e2e-tactics', 'e2e-takedown', 'e2e-enemies'],
  'src/world/maps/kestrel': ['e2e-kestrel'],
  'src/world/maps/courselab.ts': ['e2e-course'],
  'src/world/maps/bunker': ['e2e-course'],
  'src/world/maps/ctcourse.ts': ['e2e-ctcourse'],
  // (marlow-final 0d) the set parts, the facility and the greybox helpers of Marlow Yard
  'src/world/maps/ctcourseSets/': ['e2e-ctcourse'],
  'src/world/maps/ctcourseGreybox.ts': ['e2e-ctcourse'],
  'src/world/': ['e2e-lightbake', 'e2e-guard-carry', 'e2e-levels', 'e2e-anchors', 'e2e-ctcourse'],
  'src/voxel/': ['e2e-lightbake', 'e2e-desktop'],
  'src/vfx/': ['e2e-desktop'],
  'src/net/coopUi': ['e2e-park', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  'src/net/': ['anim-audit', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse', 'e2e-sectorops'],
  'src/security/': ['e2e-security', 'e2e-sectorops'],
  'src/progression/': ['e2e-park'],
  'src/cosmetics/': ['e2e-park'],
  'src/save/sectorRecord': ['e2e-sectorops', 'e2e-menus'],
  'src/save/': ['e2e-park', 'e2e-offline', 'e2e-feedback'],
  'src/feedback/': ['e2e-feedback'],
  'src/audio/': ['e2e-foley', 'e2e-music', 'e2e-score', 'e2e-weapon-audio'],
  'src/pwa/': ['e2e-offline'],
  'src/config/': CORE,
};
// --quick, outside src/: master's rules (a suite script or its helper reruns that suite; the helper and the runner rerun CORE)
const QUICK_SCRIPT = /^scripts\/(smoke|anim-audit|e2e-(?!(?:[\w-]*-)?lib\.mjs$)[\w-]+)\.mjs$/;
const QUICK_CORE_FILES = /^(scripts\/(e2e-lib|run-e2e)\.mjs|package\.json|index\.html|vite\.config\.\w+|public\/)/;

/** The suites that read lamps and light (the GPU-only e2e-darkness is dropped by the runner outside `--gpu`). */
const lightSuites = (extra = ['e2e-levels', 'e2e-ctcourse']) => ['e2e-lightbake', 'e2e-desktop', 'e2e-stealth-ai', 'e2e-security', 'e2e-darkness', ...extra].filter((s, i, a) => a.indexOf(s) === i);

// --affected --wide: the wide set. A path under `src/` not listed here runs smoke + CORE. The first matching prefix wins, so a
// specific file comes before its folder. Cross-area rules (evidence: what each suite drives, grep of scripts/e2e-*.mjs):
//  - src/weapons -> e2e-stealth-ai and e2e-sectorops:1 (they set `weapons.lastShotNoise`, which drives guard hearing; train 30 failed in e2e-stealth-ai on a weapons-only change)
//  - src/ai -> the guard suites: e2e-stealth-ai, e2e-guard-carry, e2e-takedown, e2e-weapons-carry (guards carry weapons), e2e-coop (the host runs the guards), e2e-sectorops parts 1 and 6 (guards in sections, Saltmarsh Park)
//  - src/net, src/save, the wire (protocol, security/data) -> the co-op group e2e-coop, e2e-netmove, e2e-ctcourse
//  - src/world light files, src/voxel -> e2e-lightbake and the suites that read lamps (desktop, stealth-ai, security, darkness)
//  - src/player, src/anim -> the animation and movement suites (anim, clip, takedown, move, ...)
export const WIDE_COVERS = {
  // (anim-studio) the studio, its drive and the tuner's snapshots: their own suite on top of what their folders run
  'src/anim/studio': ['e2e-studio', 'anim-audit', 'e2e-anim'],
  'src/anim/tuneHistory': ['e2e-studio'],
  // (anim-studio-2) the co-op role / traversal move sections: live on the local player (the team moves, traversal)
  'src/anim/moveTune': ['e2e-studio', 'e2e-coop', 'e2e-traverse', 'e2e-anim'],
  'src/game/studioStage': ['e2e-studio', 'e2e-tuner-phone'],
  // (marlow-bays item 26) the free view's touch orbit, pinch and pan
  'src/player/freeView': ['e2e-tuner-phone', 'e2e-studio', 'anim-audit', 'e2e-anim', 'e2e-move'],
  'src/world/maps/studio.ts': ['e2e-studio'],
  'src/save/animTuneStore': ['e2e-studio', 'e2e-menus'],
  'src/ui/studio': ['e2e-studio'],
  'src/ui/tuneSnapshots': ['e2e-studio', 'e2e-menus'],
  'src/ui/overlayProject': ['e2e-studio', 'e2e-menus'],
  'src/ui/animTune': ['e2e-studio', 'e2e-tuner-phone', 'e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus'],
  // (tuner-ui) the tuner panel's pure layout; (marlow-bays slice T) its mouse mode and selection target (tunerMouse, tunerTarget)
  'src/ui/tuner': ['e2e-studio', 'e2e-tuner-phone', 'e2e-menus'],
  'src/core/quality': ['e2e-desktop', 'e2e-lightbake'],
  'src/core/display': ['e2e-desktop'],
  'src/core/settings': ['e2e-desktop', 'e2e-menus'],
  'src/core/flags': ['e2e-park', ...CORE],
  'src/core/': ['e2e-offline', ...CORE],
  'src/input/': ['e2e-pad', 'e2e-mouse', 'e2e-move', 'e2e-menus'],
  // (section-rating) the rating card: only its suite shows it
  'src/ui/hud/ratingCard': ['e2e-section-rating'],
  'src/ui/screens/missionsScreen': ['e2e-sectorops', 'e2e-menus', 'e2e-pad', 'e2e-park'],
  'src/ui/': ['e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus'],
  // the training course (T1b): its own suite on top of co-op
  'src/game/course/': ['e2e-course', 'e2e-ctcourse', 'e2e-coop'],
  'src/game/modes/courseMode.ts': ['e2e-course', 'e2e-ctcourse', 'e2e-coop', 'e2e-section-rating'],
  // Sector Ops (feature/sector-ops): its mode, sectors and Warehouse copy
  'src/game/modes/sectorMode.ts': ['e2e-sectorops', 'e2e-park', 'e2e-section-rating'],
  // (section-rating) the rating rules: their suite and the two modes that rate (master's --quick row); the record: its suite,
  // Sector Ops and the missions screen that reads it (a kv key, no save shape change: not the co-op group)
  'src/game/rating/': ['e2e-section-rating', 'e2e-sectorops', 'e2e-course'],
  'src/save/ratingRecord': ['e2e-section-rating', 'e2e-sectorops', 'e2e-menus'],
  'src/game/sectors': ['e2e-sectorops'],
  'src/world/maps/warehouseOps.ts': ['e2e-sectorops'],
  'src/world/maps/warehouseSectors.ts': ['e2e-sectorops'],
  // (sector-fixes-r RE) the Sector Ops section files (warehouseS1-S3: the co-op routes and team doors) and the usual world
  // suites; (sector-fixes-r fix) not e2e-ctcourse: Marlow Yard never loads warehouseOps
  'src/world/maps/warehouseS': ['e2e-sectorops', 'e2e-lightbake', 'e2e-levels', 'e2e-anchors'],
  'src/game/modes/clearMode.ts': ['e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-park', 'e2e-ctcourse', 'e2e-sectorops', 'e2e-clear'],
  'src/game/modes/missionMode.ts': ['e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-park', 'e2e-ctcourse', 'e2e-sectorops', 'e2e-modes'],
  'src/game/modes/infiltrationMode.ts': ['e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-park', 'e2e-ctcourse', 'e2e-sectorops', 'e2e-missions'],
  'src/game/missions.ts': ['e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-park', 'e2e-ctcourse', 'e2e-sectorops', 'e2e-missions'],
  'src/game/': ['e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-park', 'e2e-ctcourse', 'e2e-sectorops'],
  'src/physics/': ['e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-ct'],
  // the camera files (CAM): the camera bounds suite on top of what their folders run
  // (guard-ai carry fix) the smooth body and its effect recovery: e2e-guard-carry draws the guards' bodies, on top of src/player
  'src/player/smoothBody': ['e2e-guard-carry', 'anim-audit', 'e2e-wall', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-weapons-carry', 'e2e-takedown'],
  'src/player/bodyEffectRecovery': ['e2e-guard-carry', 'anim-audit', 'e2e-wall', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-weapons-carry', 'e2e-takedown'],
  'src/player/shoulderCamera': ['e2e-camera-bounds', 'e2e-move', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-mouse'],
  'src/player/cameraBounds': ['e2e-camera-bounds', 'e2e-move', 'e2e-anim', 'e2e-clip'],
  'src/config/camera': ['e2e-camera-bounds', 'e2e-anim', 'e2e-clip', ...CORE],
  'src/player/': ['anim-audit', 'e2e-guard-carry', 'e2e-wall', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-weapons-carry', 'e2e-takedown'],
  'src/anim/': ['anim-audit', 'e2e-anim', 'e2e-clip', 'e2e-weapons-carry', 'e2e-move', 'e2e-takedown'],
  'src/cover/': ['e2e-stealth', 'e2e-clip', 'e2e-tactics', 'e2e-wall'],
  // (train 30) weapons.lastShotNoise drives guard hearing: the stealth AI suite and Sector Ops part 1 read it
  'src/weapons/': ['e2e-combat', 'e2e-weapons-carry', 'e2e-enemies', 'e2e-gadgets', 'e2e-clip', 'e2e-stealth-ai', 'e2e-sectorops:1'],
  'src/ai/': ['e2e-stealth-ai', 'e2e-guard-carry', 'e2e-levels', 'e2e-tactics', 'e2e-takedown', 'e2e-enemies', 'e2e-weapons-carry', 'e2e-coop', 'e2e-sectorops:1', 'e2e-sectorops:6'],
  'src/world/maps/kestrel': ['e2e-kestrel'],
  'src/world/maps/courselab.ts': ['e2e-course'],
  'src/world/maps/bunker': ['e2e-course', 'e2e-bunker'],
  'src/world/maps/warehouse.ts': ['e2e-ct-warehouse', 'e2e-lightbake', 'e2e-guard-carry', 'e2e-levels', 'e2e-anchors', 'e2e-ctcourse'],
  'src/world/maps/warehouseDress': ['e2e-ct-warehouse', 'e2e-lightbake', 'e2e-guard-carry', 'e2e-levels', 'e2e-anchors', 'e2e-ctcourse'],
  'src/world/maps/ctcourse.ts': ['e2e-ctcourse', 'e2e-section-rating'],
  // (marlow-final 0d) the Marlow Yard set parts, facility and greybox helpers: e2e-ctcourse, and e2e-section-rating (rates A2-A8)
  'src/world/maps/ctcourseSets/': ['e2e-ctcourse', 'e2e-section-rating'],
  'src/world/maps/ctcourseGreybox.ts': ['e2e-ctcourse', 'e2e-section-rating'],
  // the lamp files (lights, lightBake, lightField, lightRig, bakedLamps, lampMath, lampMount, ambientGrid, darkCurve): the bake suite and the light readers
  'src/world/light': lightSuites(),
  'src/world/lamp': lightSuites(),
  'src/world/bakedLamps': lightSuites(),
  'src/world/ambientGrid': lightSuites(),
  'src/world/darkCurve': lightSuites(),
  'src/world/': ['e2e-lightbake', 'e2e-guard-carry', 'e2e-levels', 'e2e-anchors', 'e2e-ctcourse'],
  'src/voxel/': lightSuites([]),
  'src/vfx/': ['e2e-desktop'],
  'src/net/coopUi': ['e2e-park', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  // the wire (protocol.ts holds PROTOCOL_VERSION): the co-op group
  'src/net/remoteAvatar': ['anim-audit', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse', 'e2e-sectorops', 'e2e-coop-gpu'],
  'src/net/remotePlayer': ['anim-audit', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse', 'e2e-sectorops', 'e2e-coop-gpu'],
  'src/net/': ['anim-audit', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse', 'e2e-sectorops'],
  // the wire's mirrored camera count (a change needs a PROTOCOL_VERSION bump)
  'src/security/data': ['e2e-security', 'e2e-sectorops', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  'src/security/': ['e2e-security', 'e2e-sectorops'],
  'src/progression/': ['e2e-park', 'e2e-progression'],
  'src/cosmetics/': ['e2e-park', 'e2e-cosmetics'],
  'src/save/sectorRecord': ['e2e-sectorops', 'e2e-menus', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  // the save shape (schema, migrations, db, saveManager, courseRecord): the co-op group carries it in the session
  'src/save/': ['e2e-park', 'e2e-offline', 'e2e-feedback', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  'src/feedback/': ['e2e-feedback'],
  'src/audio/': ['e2e-foley', 'e2e-music', 'e2e-score', 'e2e-weapon-audio'],
  'src/pwa/': ['e2e-offline'],
  'src/config/': CORE,
};

// --affected (the default tier): the suites that drive the changed area directly, no cross-area readers (those are --wide).
// A path under `src/` not listed here runs smoke + CORE. The first matching prefix wins.
const GAME = ['e2e-gadgets', 'e2e-tactics', 'e2e-takedown', 'e2e-park'];
const LIGHT = ['e2e-lightbake', 'e2e-desktop', 'e2e-darkness'];
const COOP = ['e2e-coop', 'e2e-netmove', 'e2e-ctcourse'];
export const DIRECT_COVERS = {
  // the studio and tuner files: their own suites (the tuner / Anim Studio test tier), not their folder's
  'src/anim/studio': ['e2e-studio', 'e2e-anim'],
  'src/anim/tuneHistory': ['e2e-studio'],
  'src/anim/moveTune': ['e2e-studio', 'e2e-anim'],
  'src/game/studioStage': ['e2e-studio', 'e2e-tuner-phone'],
  'src/player/freeView': ['e2e-studio', 'e2e-tuner-phone'],
  'src/world/maps/studio.ts': ['e2e-studio'],
  'src/save/animTuneStore': ['e2e-studio', 'e2e-menus'],
  'src/ui/studio': ['e2e-studio'],
  'src/ui/tuneSnapshots': ['e2e-studio', 'e2e-menus'],
  'src/ui/overlayProject': ['e2e-studio', 'e2e-menus'],
  'src/ui/animTune': ['e2e-studio', 'e2e-tuner-phone', 'e2e-menus'],
  'src/ui/tuner': ['e2e-studio', 'e2e-tuner-phone', 'e2e-menus'],
  'src/core/': CORE,
  // the legacy suites in LEGACY / GPU are reachable from the area that owns them (the runner prints them REPORT ONLY)
  'src/config/camera': ['e2e-camera-bounds', ...CORE],
  'src/config/': CORE,
  'src/input/': ['e2e-pad', 'e2e-mouse', 'e2e-move', 'e2e-menus'],
  'src/ui/hud/ratingCard': ['e2e-section-rating'],
  'src/ui/screens/missionsScreen': ['e2e-sectorops', 'e2e-menus'],
  'src/ui/': ['e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus'],
  // src/game: the game suites; course suites only for the course, Sector Ops only for sectors and modes
  'src/game/course/': [...GAME, 'e2e-course', 'e2e-ctcourse'],
  'src/game/modes/courseMode.ts': [...GAME, 'e2e-course', 'e2e-ctcourse', 'e2e-section-rating'],
  'src/game/modes/sectorMode.ts': [...GAME, 'e2e-sectorops', 'e2e-section-rating'],
  'src/game/modes/clearMode.ts': [...GAME, 'e2e-sectorops', 'e2e-clear'],
  'src/game/modes/missionMode.ts': [...GAME, 'e2e-sectorops', 'e2e-modes'],
  'src/game/modes/infiltrationMode.ts': [...GAME, 'e2e-sectorops', 'e2e-missions'],
  'src/game/modes/': [...GAME, 'e2e-sectorops'],
  'src/game/missions.ts': [...GAME, 'e2e-missions'],
  'src/game/sectors': [...GAME, 'e2e-sectorops'],
  // (section-rating) the rating rules and record: their own suite (the modes that rate are --wide)
  'src/game/rating/': ['e2e-section-rating'],
  // (checker FIX) the co-op team moves need two pages; the Marlow Yard devices are driven by e2e-ctcourse's set steps
  'src/game/team': [...GAME, 'e2e-coop'],
  'src/game/pairPress': [...GAME, 'e2e-coop'],
  'src/game/dualTakedown': [...GAME, 'e2e-coop'],
  'src/game/ctDevices': [...GAME, 'e2e-ctcourse'],
  'src/game/reviveClock': [...GAME, 'e2e-ctcourse'],
  'src/game/laserPanels': [...GAME, 'e2e-ctcourse'],
  'src/game/': GAME,
  'src/physics/': ['e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-ct'],
  // (guard-ai carry fix) the smooth body and its effect recovery: e2e-guard-carry draws the guards' bodies
  'src/player/smoothBody': ['e2e-guard-carry', 'e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip'],
  'src/player/bodyEffectRecovery': ['e2e-guard-carry', 'e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip'],
  'src/player/shoulderCamera': ['e2e-camera-bounds', 'e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip'],
  'src/player/cameraBounds': ['e2e-camera-bounds', 'e2e-move', 'e2e-anim', 'e2e-clip'],
  // (checker FIX) traversal (ladders, pipes, ledges, vents) and the wall controller: their required suites on top
  'src/player/traversal': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-traverse'],
  'src/player/attach': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-traverse'],
  'src/player/gripStepper': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-traverse'],
  'src/player/handHold': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-traverse'],
  'src/player/traversePath': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-traverse'],
  'src/player/ventOpen': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-traverse'],
  'src/player/wallController': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-wall'],
  'src/player/wallBlock': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip', 'e2e-wall'],
  'src/player/': ['e2e-move', 'e2e-anim', 'e2e-stealth', 'e2e-clip'],
  'src/anim/': ['e2e-anim', 'e2e-clip', 'e2e-move'],
  'src/cover/': ['e2e-stealth', 'e2e-clip', 'e2e-tactics', 'e2e-wall'],
  // (train 30) weapons.lastShotNoise drives guard hearing: e2e-stealth-ai and Sector Ops part 1 read it
  'src/weapons/': ['e2e-combat', 'e2e-weapons-carry', 'e2e-stealth-ai', 'e2e-sectorops:1'],
  // the enemy archetypes (heavy, enforcer, sniper, dog): their legacy suite
  'src/ai/archetypes': ['e2e-enemies', 'e2e-stealth-ai', 'e2e-guard-carry', 'e2e-sectorops:1'],
  'src/ai/enemyDefs': ['e2e-enemies', 'e2e-stealth-ai', 'e2e-guard-carry', 'e2e-sectorops:1'],
  'src/ai/': ['e2e-stealth-ai', 'e2e-guard-carry', 'e2e-sectorops:1'],
  // the map files with their own suite
  'src/world/maps/kestrel': ['e2e-kestrel'],
  'src/world/maps/courselab.ts': ['e2e-course'],
  'src/world/maps/bunker': ['e2e-course', 'e2e-bunker'],
  'src/world/maps/ctcourse.ts': ['e2e-ctcourse'],
  'src/world/maps/ctcourseSets/': ['e2e-ctcourse'],
  'src/world/maps/ctcourseGreybox.ts': ['e2e-ctcourse'],
  'src/world/maps/warehouseOps.ts': ['e2e-sectorops'],
  'src/world/maps/warehouseSectors.ts': ['e2e-sectorops'],
  'src/world/maps/warehouseS': ['e2e-sectorops', 'e2e-levels', 'e2e-anchors'],
  // the Warehouse map itself: its routes suite (legacy) and the usual world suites
  'src/world/maps/warehouse.ts': ['e2e-ct-warehouse', 'e2e-levels', 'e2e-anchors'],
  'src/world/maps/warehouseDress': ['e2e-ct-warehouse', 'e2e-levels', 'e2e-anchors'],
  // the lamp files: the bake suite, the desktop renderer and the GPU darkness read-back (dropped outside --gpu)
  'src/world/light': LIGHT,
  'src/world/lamp': LIGHT,
  'src/world/bakedLamps': LIGHT,
  'src/world/ambientGrid': LIGHT,
  'src/world/darkCurve': LIGHT,
  'src/world/': ['e2e-levels', 'e2e-anchors'],
  'src/voxel/': LIGHT,
  'src/vfx/': ['e2e-desktop'],
  // the wire, the save shape and the mirrored camera count: the co-op group
  // the partner's figure on the joiner: the GPU co-op read-back (dropped outside --gpu)
  'src/net/remoteAvatar': [...COOP, 'e2e-coop-gpu'],
  'src/net/remotePlayer': [...COOP, 'e2e-coop-gpu'],
  'src/net/': COOP,
  'src/security/data': COOP,
  'src/security/': ['e2e-security', 'e2e-sectorops'],
  // (section-rating) a kv key, no save shape change: its own suite
  'src/save/ratingRecord': ['e2e-section-rating'],
  // (checker FIX) the Sector Ops record: the missions screen reads it (as --quick and --wide)
  'src/save/sectorRecord': ['e2e-sectorops', 'e2e-menus', ...COOP],
  'src/save/': COOP,
  'src/progression/': ['e2e-park', 'e2e-progression'],
  'src/cosmetics/': ['e2e-park', 'e2e-cosmetics'],
  'src/feedback/': ['e2e-feedback'],
  'src/audio/': ['e2e-foley', 'e2e-music', 'e2e-score', 'e2e-weapon-audio'],
  'src/pwa/': ['e2e-offline'],
};

// --affected, outside src/: a suite script or its helper reruns that suite; the helper and the runner rerun CORE; docs and tests
// need no browser (the -lib helpers are not suites: e2e-lib reruns CORE, e2e-net-lib the two-page suites in HELPERS)
export const SCRIPT = /^scripts\/(smoke|anim-audit|e2e-(?!affected\.mjs$|(?:[\w-]*-)?lib\.mjs$)[\w-]+)\.mjs$/;
export const HELPERS = { 'scripts/e2e-net-lib.mjs': ['e2e-netmove', 'anim-audit'] };
// (marlow-final 0d) the set step modules of e2e-ctcourse (scripts/e2e-ctcourse/<set>.mjs) rerun it; master's --quick rule too
export const SUITE_DIRS = { 'scripts/e2e-ctcourse/': ['e2e-ctcourse'] };
const inDir = (f) => Object.entries(SUITE_DIRS).find(([d]) => f.startsWith(d))?.[1];
const CORE_FILES = /^(scripts\/(e2e-lib|e2e-affected|run-e2e)\.mjs|package(-lock)?\.json|index\.html|vite\.config\.\w+|public\/)/;
// no browser run: docs, markdown, changelog fragments (docs/**, *.md, changes/**), unit tests, the e2e timings file
const NO_BROWSER = /^(docs\/|changes\/|tests\/|scripts\/e2e-times\.json$)|\.md$/i;

const norm = (f) => f.replace(/\\/g, '/').replace(/^\.\//, '');
const inMap = (map, f) => Object.entries(map).find(([p]) => f.startsWith(p))?.[1];

/** --quick, master's rules unchanged: any `src/` file (markdown too) takes its map row or CORE; outside src/, a helper, a suite's step module (SUITE_DIRS), a suite script, or the runner / build files. */
function quickSuitesForFile(f) {
  if (f.startsWith('src/')) return inMap(QUICK_COVERS, f) ?? CORE;
  if (HELPERS[f]) return HELPERS[f];
  if (inDir(f)) return inDir(f);
  if (QUICK_SCRIPT.test(f)) return [f.replace(/^scripts\/|\.mjs$/g, '')];
  if (QUICK_CORE_FILES.test(f)) return CORE;
  return null;
}

/** The suites one changed file reaches under `map` (DIRECT_COVERS by default; QUICK_COVERS applies master's --quick rules), or null when it needs no browser run. */
export function suitesForFile(file, map = DIRECT_COVERS) {
  const f = norm(file);
  if (map === QUICK_COVERS) return quickSuitesForFile(f);
  if (NO_BROWSER.test(f)) return null;
  if (f.startsWith('src/')) return inMap(map, f) ?? [...CORE]; // an unknown src path: smoke + the default set
  if (HELPERS[f]) return HELPERS[f];
  if (inDir(f)) return inDir(f);
  if (SCRIPT.test(f)) return [f.replace(/^scripts\/|\.mjs$/g, '')];
  if (CORE_FILES.test(f)) return [...CORE];
  return null;
}

/** Changed file paths in, a sorted unique suite list out: `smoke` plus the suites of every file that reaches the browser; empty when none does. A whole suite absorbs its parts. */
export function selectSuites(files, map = DIRECT_COVERS) {
  const picked = new Set();
  for (const file of files) {
    const hit = suitesForFile(file, map);
    if (!hit) continue;
    picked.add('smoke');
    for (const s of hit) picked.add(s);
  }
  return [...picked].filter((s) => !s.includes(':') || !picked.has(s.split(':')[0])).sort();
}

// ---- auto-train's auto-drop (scripts/auto-train.mjs pickDrops): which suites a train member reaches ----

/** The suites a change's paths reach under `map` (DIRECT_COVERS by default), `smoke` aside, parts as their suite: a Set. */
export function suiteSetFor(files, map = DIRECT_COVERS) {
  const out = new Set();
  for (const f of files ?? []) for (const s of suitesForFile(String(f), map) ?? []) out.add(String(s).split(':')[0]);
  return out;
}

/** Every prefix of `map` (QUICK_COVERS by default, any row, not only the first match) whose row names `suite` (parts as their suite), plus `src/` for a CORE suite (an unlisted src path runs CORE). */
export function coverFolders(suite, map = QUICK_COVERS) {
  const keys = Object.entries(map).filter(([, list]) => list.some((s) => s.split(':')[0] === suite)).map(([p]) => p);
  return CORE.includes(suite) ? [...keys, 'src/'] : keys;
}
