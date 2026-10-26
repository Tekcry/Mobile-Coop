# map-ready S4 build report (cloud)
Owner: Night Shift | Sector Ops Build. Status: current.

Built by Night Shift | Cloud Builder 3 (Opus), 2026-10-25 ~23:25, from the cloud-queue brief `briefs/map-ready-S4.md`.
Branch `feature/map-ready-s4`: the desktop WIP (1afb22600 steps 1-3, d42ddb80b steps 4-6) reviewed against
`docs/map-ready/briefs/S4.md` steps 1-7, then two fix commits (a8f5fccd, b6920178) and this report. Unit tests only.

## Per step
1. Key (A16, live): `src/world/lightBake.ts` `lampKeyOf` / `moonKeyOf` (no seed), `LightBake.source` set in
   `bakeLevelLight` (`none` / `cache` / `baked` / `shipped`); the full path now reads the cache first and calls
   `bakeLevelLamps` only on a miss. WIP correct as written; no change.
2. Format: `src/world/shippedBake.ts` `packLamps` / `unpackLamps` / `joinShipped` (magic `NSLB`, format 1, layout as the
   brief). `joinShipped` matches the baker's landing (`sectionJobs.ts` `landed`: `vis` at `lampLayout().at[i]`, a
   bounce part only when it has data, missing wall bits as zeros) and `joinBounce`. No change.
3. Prebake: `scripts/prebake.mjs`, `scripts/prebake/{plan.ts,plan.prebake.ts,shard-0..7.prebake.ts,join.prebake.ts,
   vitest.prebake.config.ts}`, `package.json` build script, `.gitignore` line. Fixed (a8f5fccd):
   - `PREBAKE=0` now removes `.prebake-cache/current.json`: an earlier run's file was otherwise still emitted by the
     build (the brief: a skipped prebake ships no bake).
   - The plan counts as cached only when the manifest holds the key AND every file it names exists (a partial
     `actions/cache` restore would otherwise fail the cap step on a missing file instead of baking again).
   Checked here without baking: `npx vitest list --config scripts/prebake/vitest.prebake.config.ts plan.prebake` /
   `shard-` find the plan file and the 8 shard files; the plan phase alone ran (3.8 s): campusOps 134 lamps, key
   `lamps:campusOps:v7:c1:y3jl5g:f25tgk`, folder `omp8nt`, lo [-72, -2, -86], hi [72, 16, 72] (the folder deleted
   after); `PREBAKE=0 node scripts/prebake.mjs` prints "prebake skipped" and removes a planted `current.json`.
4. Emit + worker rules: `scripts/prebake/emit.ts` (`apply: 'build'`, `generateBundle` emits `current.json`'s files as
   `bakes/<name>`), `vite.config.ts` (before `VitePWA`), `src/pwa/precacheGlobs.ts` (`**/bakes/**` ignored),
   `src/pwa/runtimeCaching.ts` (`bakes` CacheFirst 16 / [200], `bakes-manifest` NetworkFirst 2, before `weapons`),
   `tests/swRuntimeCaching.test.ts` (count 5, the route list, five URL cases). No change.
5. Runtime read: `readShippedLamps` (same-origin base only, manifest map / key / versions / lamp count, every file in
   parallel, size + sha256, gzip magic -> `DecompressionStream`, `unpackLamps`, `joinShipped`, one `[bake] shipped
   miss: <why>` line on any failure); `lightBake.ts` `lampJob` section path: cache miss + `flags.mapReady` -> shipped
   hit (`source: 'shipped'`, no `SectionBaker`), `held.dead` -> null. No change.
6. `src/voxel/sectionJobs.ts` `markPlaying` calls `saveIfDue()` before `playing = true`. `lampJobs.ts` untouched (a
   shipped or cache hit starts no baker, so nothing is written). No change.
7. `tests/shippedBake.test.ts`: the WIP's cases plus (b6920178) the emit plugin case, and the lint fix (`import()` type
   in `vi.mock` -> `import type * as LampJobs`).

## Tests (this box, 4 cores, `--maxWorkers=2`)
- `npx tsc --noEmit -p .`: clean. The prebake files tsc's include does not reach (`scripts/prebake/*.ts`; plan.ts is
  reached through the test) checked with a temporary config extending tsconfig.json (deleted after): clean.
- eslint on every changed .ts file: clean (`scripts/prebake.mjs` is eslint-ignored by the repo config).
- `npx vitest run tests/shippedBake.test.ts tests/sectionBake.test.ts tests/sectionBakeCampus.test.ts
  tests/sectionBakeRobust.test.ts tests/swRuntimeCaching.test.ts tests/guardAssetsOffline.test.ts
  tests/lightBakeAbort.test.ts`: 7 files, 57 passed, 2 skipped (the `dist/sw.js` route test needs a fresh build; the
  heavy campus superset needs `SECTION_BAKE_FULL`). `tests/shippedBake.test.ts`: 12 passed (keys 4, prebake key 1,
  parity and misses 5, markPlaying 1, emit 1).
- Other key users after the A16 key change: `tests/lampFlicker.test.ts tests/lampSway.test.ts tests/lightField.test.ts
  tests/glass.test.ts tests/lampBoxAlign.test.ts tests/lampGridLossless.test.ts tests/campusS2.test.ts`: 7 files, 109
  passed (181 s).

## Deviations (each with its undo)
1. `ShippedFile` carries `rawBytes` / `rawSha256` beside the brief's `bytes` / `sha256` (WIP): a server that decoded the
   gzip hands over the packed bytes, which are checked against their own size and hash. Undo: drop the two fields and
   skip the check for a non-gzip body.
2. `LightBake.source` is optional (`source?:`), not required: `tests/helpers/bounceRoom.ts:21` builds a `LightBake`
   literal and is not an owned file. `bakeLevelLight` always sets it. Undo: make it required and add `source` there.
3. The two fixes in step 3 above (not in the brief's text; both close a stale or failed-build path).

## Pending PC run
- The real prebake on the desktop under `heavy.lock` (`PREBAKE_THREADS=4`): seconds, every file size, the caps (STOP
  rule of step 3 if over 16 MB a file / 48 MB the map). Not run here (cloud brief).
- CI build-check on the PR (proves the prebake on the runner; record its seconds and sizes) and the `actions/cache`
  steps in deploy.yml.
- A local `npm run build`, then `tests/swRuntimeCaching.test.ts`' dist test (skipped here: no build in cloud).
- Laptop queue: affected (LIGHT group), `e2e-sectorops` part 6 with the flag off; the `shipped` proof with S1's
  `scripts/map-ready-measure.mjs --gated` once S1 and S4 are both on `feature/map-ready`.
- A16 is live: every PC's existing IndexedDB lamp and moon caches miss once after this ships (the key format changed),
  one rebake each.
