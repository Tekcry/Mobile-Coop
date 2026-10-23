// Which e2e suites a change must pass: changed file paths in, a sorted unique suite list out. Pure (no fs, no git, no Babylon):
// `scripts/run-e2e.mjs` (`--quick`, `--affected <base-ref>`) and tests/e2eAffected.test.ts import it. Keep in step with
// docs/systems/testing-tools.md ("Choosing suites for a change").
//
// A suite name may carry a part (`e2e-sectorops:1`): one job of a suite that runs in parts. A whole suite in the result
// absorbs its parts. Names outside the runner's lists (GPU suites, a suite whose script is gone) are filtered by the runner.

// (process audit) CORE leaves out the input suites (the slowest); `src/input/` and `src/ui/` still pick them.
export const CORE = ['e2e-move', 'e2e-combat', 'e2e-anim'];

/** The suites that read lamps and light (the GPU-only e2e-darkness is dropped by the runner outside `--gpu`). */
const lightSuites = (extra = ['e2e-levels', 'e2e-ctcourse']) => ['e2e-lightbake', 'e2e-desktop', 'e2e-stealth-ai', 'e2e-security', 'e2e-darkness', ...extra].filter((s, i, a) => a.indexOf(s) === i);

// A path under `src/` not listed here runs smoke + CORE. The first matching prefix wins, so a specific file comes before its folder.
// Cross-area rules (evidence: what each suite drives, grep of scripts/e2e-*.mjs):
//  - src/weapons -> e2e-stealth-ai and e2e-sectorops:1 (they set `weapons.lastShotNoise`, which drives guard hearing; train 30 failed in e2e-stealth-ai on a weapons-only change)
//  - src/ai -> the guard suites: e2e-stealth-ai, e2e-takedown, e2e-weapons-carry (guards carry weapons), e2e-coop (the host runs the guards), e2e-sectorops parts 1 and 6 (guards in sections, Saltmarsh Park)
//  - src/net, src/save, the wire (protocol, security/data) -> the co-op group e2e-coop, e2e-netmove, e2e-ctcourse
//  - src/world light files, src/voxel -> e2e-lightbake and the suites that read lamps (desktop, stealth-ai, security, darkness)
//  - src/player, src/anim -> the animation and movement suites (anim, clip, takedown, move, ...)
export const COVERS = {
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
  'src/ui/screens/missionsScreen': ['e2e-sectorops', 'e2e-menus', 'e2e-pad', 'e2e-park'],
  'src/ui/': ['e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus'],
  // the training course (T1b): its own suite on top of co-op
  'src/game/course/': ['e2e-course', 'e2e-ctcourse', 'e2e-coop'],
  'src/game/modes/courseMode.ts': ['e2e-course', 'e2e-ctcourse', 'e2e-coop'],
  // Sector Ops (feature/sector-ops): its mode, sectors and Warehouse copy
  'src/game/modes/sectorMode.ts': ['e2e-sectorops', 'e2e-park'],
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
  'src/player/': ['anim-audit', 'e2e-wall', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-weapons-carry', 'e2e-takedown'],
  'src/anim/': ['anim-audit', 'e2e-anim', 'e2e-clip', 'e2e-weapons-carry', 'e2e-move', 'e2e-takedown'],
  'src/cover/': ['e2e-stealth', 'e2e-clip', 'e2e-tactics', 'e2e-wall'],
  // (train 30) weapons.lastShotNoise drives guard hearing: the stealth AI suite and Sector Ops part 1 read it
  'src/weapons/': ['e2e-combat', 'e2e-weapons-carry', 'e2e-enemies', 'e2e-gadgets', 'e2e-clip', 'e2e-stealth-ai', 'e2e-sectorops:1'],
  'src/ai/': ['e2e-stealth-ai', 'e2e-levels', 'e2e-tactics', 'e2e-takedown', 'e2e-enemies', 'e2e-weapons-carry', 'e2e-coop', 'e2e-sectorops:1', 'e2e-sectorops:6'],
  'src/world/maps/kestrel': ['e2e-kestrel'],
  'src/world/maps/courselab.ts': ['e2e-course'],
  'src/world/maps/bunker': ['e2e-course'],
  'src/world/maps/ctcourse.ts': ['e2e-ctcourse'],
  // the lamp files (lights, lightBake, lightField, lightRig, bakedLamps, lampMath, lampMount, ambientGrid, darkCurve): the bake suite and the light readers
  'src/world/light': lightSuites(),
  'src/world/lamp': lightSuites(),
  'src/world/bakedLamps': lightSuites(),
  'src/world/ambientGrid': lightSuites(),
  'src/world/darkCurve': lightSuites(),
  'src/world/': ['e2e-lightbake', 'e2e-levels', 'e2e-anchors', 'e2e-ctcourse'],
  'src/voxel/': lightSuites([]),
  'src/vfx/': ['e2e-desktop'],
  'src/net/coopUi': ['e2e-park', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  // the wire (protocol.ts holds PROTOCOL_VERSION): the co-op group
  'src/net/': ['anim-audit', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse', 'e2e-sectorops'],
  // the wire's mirrored camera count (a change needs a PROTOCOL_VERSION bump)
  'src/security/data': ['e2e-security', 'e2e-sectorops', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  'src/security/': ['e2e-security', 'e2e-sectorops'],
  'src/progression/': ['e2e-park'],
  'src/cosmetics/': ['e2e-park'],
  'src/save/sectorRecord': ['e2e-sectorops', 'e2e-menus', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  // the save shape (schema, migrations, db, saveManager, courseRecord): the co-op group carries it in the session
  'src/save/': ['e2e-park', 'e2e-offline', 'e2e-feedback', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse'],
  'src/feedback/': ['e2e-feedback'],
  'src/audio/': ['e2e-foley', 'e2e-music', 'e2e-score', 'e2e-weapon-audio'],
  'src/pwa/': ['e2e-offline'],
  'src/config/': CORE,
};

// Outside src/: a suite script or its helper reruns that suite; the helper and the runner rerun CORE; docs and tests need no browser
// (the -lib helpers are not suites: e2e-lib reruns CORE, e2e-net-lib the two-page suites in HELPERS)
export const SCRIPT = /^scripts\/(smoke|anim-audit|e2e-(?!affected\.mjs$|(?:[\w-]*-)?lib\.mjs$)[\w-]+)\.mjs$/;
export const HELPERS = { 'scripts/e2e-net-lib.mjs': ['e2e-netmove', 'anim-audit'] };
const CORE_FILES = /^(scripts\/(e2e-lib|e2e-affected|run-e2e)\.mjs|package(-lock)?\.json|index\.html|vite\.config\.\w+|public\/)/;
// no browser run: docs, markdown, changelog fragments (docs/**, *.md, changes/**), unit tests, the e2e timings file
const NO_BROWSER = /^(docs\/|changes\/|tests\/|scripts\/e2e-times\.json$)|\.md$/i;

const norm = (f) => f.replace(/\\/g, '/').replace(/^\.\//, '');

/** The suites one changed file reaches, or null when it needs no browser run. */
export function suitesForFile(file) {
  const f = norm(file);
  if (NO_BROWSER.test(f)) return null;
  if (f.startsWith('src/')) return Object.entries(COVERS).find(([p]) => f.startsWith(p))?.[1] ?? [...CORE]; // an unknown src path: smoke + the default set
  if (HELPERS[f]) return HELPERS[f];
  if (SCRIPT.test(f)) return [f.replace(/^scripts\/|\.mjs$/g, '')];
  if (CORE_FILES.test(f)) return [...CORE];
  return null;
}

/** Changed file paths in, a sorted unique suite list out: `smoke` plus the suites of every file that reaches the browser; empty when none does. A whole suite absorbs its parts. */
export function selectSuites(files) {
  const picked = new Set();
  for (const file of files) {
    const hit = suitesForFile(file);
    if (!hit) continue;
    picked.add('smoke');
    for (const s of hit) picked.add(s);
  }
  return [...picked].filter((s) => !s.includes(':') || !picked.has(s.split(':')[0])).sort();
}
