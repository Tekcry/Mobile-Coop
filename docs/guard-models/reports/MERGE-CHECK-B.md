# guard-models PR check B (flag OFF landing)

Checker B (fresh Opus, did not build it), on 89c10827 (`origin/master...89c10827`, 172 files, +25,033 / -127).

## Verdict: FAIL (one blocker, small fix)

## Blocker
B1. The service worker's `guards` runtime rule references a name that does not exist in the worker, so with the flag
off it breaks the runtime caching of every non-precached same-origin GET that reaches it: Wren's play LODs, the hero
GLBs and the level kits (`campus-kit`, `facility-kit`, `facility-props`) never reach the `operators` cache. Offline play
regresses for every player, flag or not.
- `vite.config.ts:115`: `urlPattern: ({ url, sameOrigin }) => sameOrigin && GUARD_ASSET_URL.test(url.pathname)`.
  workbox-build serializes `urlPattern` functions with `toString()`; the import from `src/pwa/precacheGlobs.ts` does not
  go with it. The built worker (`dist/sw.js`, built from 89c10827) has
  `s.registerRoute(({url:s,sameOrigin:e})=>e&&GUARD_ASSET_URL.test(s.pathname), ...)`, and `GUARD_ASSET_URL` appears
  nowhere else in `sw.js` (one occurrence).
- Effect: workbox's `Router.findMatchingRoute` calls `route.match` with no try / catch, and the fetch listener calls
  `respondWith` only after it returns. So for a same-origin request that no earlier route takes (the precache, the
  navigation route, the weapons rule), `match` throws a ReferenceError and the browser fetches from the network
  uncached. The `operators` rule after it is never reached. `warmPlayLods` (menu and level load) fetches through the
  worker, gets network responses and caches nothing. Online play looks the same; offline, Wren's figure and the kit
  GLBs fail. The guard GLBs are still never precached or fetched (good), but this is a flag-off regression in shared
  code.
- `tests/guardAssetsOffline.test.ts:75-80` tests the regex alone, so it passes. Not covered: the serialized function.
  The G9 e2e set was queued before this commit.
- Fix (either one):
  (a) `vite.config.ts:115`: inline the literal: `urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/guard-[^/]+\.glb$/.test(url.pathname)`.
  Then make the test read `vite.config.ts` as text and check it contains `GUARD_ASSET_URL.source`, or better, check that
  a built `dist/sw.js` has no `GUARD_ASSET_URL`.
  (b) `urlPattern: GUARD_ASSET_URL`. workbox serializes a RegExp as a literal and matches it against `url.href`. The
  match is not at index 0, so workbox does not use it for cross-origin requests, which is what we want.
  After the fix, rebuild and grep `dist/sw.js` for the literal. Run `e2e-offline` on the laptop queue: it covers the
  operators cache, and it is cheap insurance here.

## (1) Nothing visible or timing-relevant with the flag off: PASS (polish L1)
- `flags.guardModels` is `params.get('guardmodels') === '1'` (`src/core/flags.ts:132`); the test confirms the default is
  off.
- `buildEnemyRig` and `buildBodyRig` build a `GuardBody` only when `guardModelsFor(def)` is true. Otherwise `figure`
  and `gbody` are null, and every new branch in `Enemy` (`showGear`, the helmet knock-off, `frame`, `thawPose`, `die`,
  `dispose`), `Body` and `EnemyPuppet` is a null check that falls through to the old code. The S1 merged body, the
  placeholder helmet / armour / shield parts and the box helmet drop are unchanged.
- Level load: `gameState.ts:938-939` awaits `whenReadyAsync` alone with the flag off, exactly as before;
  `warmGuardModels` is not called (it also returns 0 early on the flag). `HelmetDrops.drop` reads the helmet_std mesh
  only behind `flags.guardModels`.
- Spawns: `EnemyManager.spawn` / `joinTeam` and `SectorMode` compute the look seed (`posLook` / `slotLook` /
  `teamLook`, a hash per spawn, not per frame). The look rides the wire (`AL_LOOK`, `AL_MAX` 65535) whatever the flag,
  by design (M3). The `PROTOCOL_VERSION` bump is left to the train build, as required.
- Module load: the guard modules build only small constant tables (kit maps and sets, scratch matrices). No global
  `RegisterMaterialPlugin`, no shader compile or GPU allocation until a `GuardBody` exists.
- L1, shared code not behind the flag: `src/world/lightRig.ts:453-476 / 562 / 642-650 / 711`. Every caster now has an
  `onEffectiveEnabledStateChangedObservable` callback (one bound closure per rig, added at load), and `fillCasters`
  skips disabled meshes. With the flag off, the master render freeze (rig root enabled / disabled) and the merged body
  now set `castersDirty`, so the frame after a freeze or thaw refills every placed shadow map's list (a pass over all
  casters per slot) and `slice()`s a list when it changes. Nothing visible changes: an RTT already skipped disabled
  meshes. There is a small extra CPU cost and an allocation on freeze toggles. G8's OFF runs (c76cf326 onward) already
  include it. Polish: measure, or debounce to the existing pick interval for character meshes.

## (2) The 29 MB guard assets are never precached or fetched with the flag off: PASS on the guard files (B1 is the side effect)
- `dist/sw.js` precache manifest: no `guard-*.glb` entry (no `guard-` string at all; only the `guard_*` anim chunks).
  `PRECACHE_GLOBS` takes no `.glb`, and `PRECACHE_IGNORES` adds `**/guard-*.glb` / `**/guard-*.ktx2`.
- `guardAssets.ts:25-26`: the eager `?url` glob yields hashed URL strings only, and the JSON glob inlines 886 bytes (three files).
  `guardAsset()` / `shieldUrls()` run only from `GuardBody`, `guardWarm`, `guardShieldFor` (only with a `gbody`) and
  `helmetSource` (only behind the flag), so with the flag off they are never called. The test checks that a resolve
  calls no fetch.
- `dist/assets` holds the 12 GLBs (8.3 / 3.0 / 0.6 MB average, 7.6 / 2.8 / 0.6 lean, 4.4 / 1.7 / 0.3 broad, shield
  0.17 MB): emitted, not referenced at load.

## (3) Bundle: guard runtime in the main chunk: PASS (polish L2)
- All guard runtime code is imported statically (`enemyRig.ts` -> `guardBody.ts` -> `guardFigure.ts`,
  `guardFigurePlugin.ts`, `guardVariant.ts` + `guards.json` 19 KB, `guardTints.ts`; `enemy.ts` -> `guardShield.ts`,
  `helmetDrops.ts` -> `guardHelmet.ts`; `gameState.ts` -> `guardWarm.ts`), so it lands in `index-*.js` (3,226 KB raw /
  1,082 KB gzip; `GuardFigurePlugin` and the asset URLs are in it). The GLB loader (`figure.ts` `loadModel`,
  `parseGlb`, KTX2) was already in main for Wren, so nothing new and large comes with it.
- Measured with esbuild: guardBody + guardWarm + guardShield + guardHelmet + guardLook and their guard-only imports
  (core, figure, pose and manifest excluded, as main already has them) come to about 50 KB minified / 17 KB gzip.
  That is about 1.5% of the main chunk. Not a blocker.
- L2: a dynamic `import()` of a guard module behind `flags.guardModels` (as `src/net` is behind `flags.coop`) would
  drop those ~50 KB from first load. The seam would be `buildEnemyRig` / `buildBodyRig` / `guardShieldFor` taking a
  preloaded module from `GameState` at level load. Worth doing when G8 flips the default only if first-load parse time
  matters; otherwise leave it.

## (4) Docs, fragment and TESTING match the code: PASS (polish L3-L5)
- `changes/feature-guard-models.md` (kind: minor): default off, `?guardmodels=1` on, files never precached, the
  `guards` cache, `AL_LOOK` bits 9-15. Matches `flags.ts`, `protocol.ts` and `vite.config.ts`.
- `docs/systems/world-and-characters.md` guards section: default OFF, `?guardmodels=1`, the precache lists, the
  `guards` rule, the one asset seam. All match.
- IP: the added lines have no reference-game character, gear or organisation names (grep of the full added diff
  outside assets). Gear ids are generic.
- L3 `TESTING.md:231`: "Until the bake's guard files are bundled the figure is Wren's stand-in" is stale; the files
  are bundled (ae211857). Also :213 "until G8 makes it the default": fine, but G8 is on HOLD.
- L4 `docs/systems/performance.md:29`: "measured numbers come from G8 (pending)". G8 has run (HOLD, numbers in
  STATE.md and `docs/guard-models/run-g8/`). Point there, or add the one-line ON vs OFF delta at 24.
- L5 the fragment says "`?guardmodels=0` is today's merged body". True, but redundant while the default is off.
  Optional wording.

## (5) Open items in STATE: PASS (polish L6)
- G8 HOLD with numbers: "G8 budget run" table + Resume ~16:25 / ~17:55 (S11 rerun: sectorops alert +1.7, campus alert
  +2.5 ms p95 ON vs OFF). Present.
- Perf follow-up: Resume ~17:55 (read-only Opus profile of per-guard Babylon cost, then a fix and the flip). Present.
- Gap placement: Open "garment seam gaps" with the per-garment mm. Present.
- L6: "Open" (`STATE.md:130-140`) lists only G8 and the seam gaps. Add three lines there:
  - the S11 numbers and the perf-follow-up item (now only in Resume);
  - the G10 look-pass list from ~11:50 (green debug markers on faces, low face variety, tone 0 too pale, jagged
    hairline, dark uniforms, shield missing from the broad file: check that this one is closed by the shield GLBs now
    bundled);
  - "Michael's sheet notes: none received yet (G10 waits)", so the orchestrator sees the M2 dependency.
  Also confirm that the S11 merge items (animTierView `skipped`, `gb.skip`, `isEnabled(false)`, thawPose P1) are
  marked done: they are in the code (`animTierView.ts:56`, `enemy.ts` frame / thawPose, `guardBody.ts:236`).

## Runs (this checker, one at a time)
- `tests/guardAssetsOffline.test.ts` 6 / 6, `tests/guardAssets.test.ts` 34 / 34, `tests/guardFigure.test.ts` 17 / 17,
  `tests/guardBody.test.ts` 16 / 16, `tests/changesFragments.test.ts` 1 / 1: all pass.
- `npx tsc --noEmit -p .`: clean (exit 0).
- No e2e, no full vitest, no `npm run check` (as briefed). Read `dist/sw.js`, `dist/workbox-*.js` and `dist/assets`
  from the existing build of 89c10827.

## After B1
Re-check is small: the `vite.config.ts` line, a test that pins the serialized pattern, a rebuild that greps `sw.js`,
and `e2e-offline`. Then PASS for landing with the flag off.
