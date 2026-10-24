// The --quick folder -> suites map of scripts/run-e2e.mjs (`npm run e2e:quick`), pure, so other scripts reuse it
// (scripts/auto-train.mjs maps a failed train member to the suites its change touches). Keep in step with
// docs/systems/testing-tools.md.

// --quick: which suites cover which source folder (a path under `src/` not listed here runs CORE).
// (process audit) CORE leaves out the input suites (the slowest); `src/input/` and `src/ui/` still pick them.
export const CORE = ['e2e-move', 'e2e-combat', 'e2e-anim'];
export const COVERS = {
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
// outside src/: a suite script or its helper reruns that suite (the helper and this runner rerun CORE); docs and tests need no browser
// (the -lib helpers are not suites: e2e-lib reruns CORE, e2e-net-lib the two-page suites in HELPERS)
export const SCRIPT = /^scripts\/(smoke|anim-audit|e2e-(?!(?:[\w-]*-)?lib\.mjs$)[\w-]+)\.mjs$/;
export const HELPERS = { 'scripts/e2e-net-lib.mjs': ['e2e-netmove', 'anim-audit'] };
// (marlow-final 0d) the set step modules of e2e-ctcourse (scripts/e2e-ctcourse/<set>.mjs) rerun it
export const SUITE_DIRS = { 'scripts/e2e-ctcourse/': ['e2e-ctcourse'] };

/** The suites one changed path picks in a quick run (`smoke` aside, always on), or null when it reaches no browser (docs, tests). */
export function coverFile(f) {
  if (f.startsWith('src/')) return Object.entries(COVERS).find(([p]) => f.startsWith(p))?.[1] ?? CORE;
  if (HELPERS[f]) return HELPERS[f];
  const dir = Object.keys(SUITE_DIRS).find((d) => f.startsWith(d));
  if (dir) return SUITE_DIRS[dir];
  if (SCRIPT.test(f)) return [f.replace(/^scripts\/|\.mjs$/g, '')];
  if (/^(scripts\/(e2e-lib|run-e2e|quick-covers)\.mjs|package\.json|index\.html|vite\.config\.\w+|public\/)/.test(f)) return CORE;
  return null;
}

/** The suites a change's paths pick in a quick run, `smoke` aside (a Set; paths with `\` are read as `/`). */
export function quickSuitesFor(files) {
  const out = new Set();
  for (const f of files ?? []) for (const s of coverFile(String(f).replace(/\\/g, '/')) ?? []) out.add(s);
  return out;
}

/** Every COVERS prefix whose list names `suite` (any match, not only the first), plus `src/` itself for a CORE suite. */
export function coverFolders(suite) {
  const keys = Object.entries(COVERS).filter(([, list]) => list.includes(suite)).map(([p]) => p);
  return CORE.includes(suite) ? [...keys, 'src/'] : keys;
}
