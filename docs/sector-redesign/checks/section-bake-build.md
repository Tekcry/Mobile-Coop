# section-bake build report (feature/sector-redesign-bake)

Ask: Michael 2026-10-24 ~17:50, "start the faster campus load now". Design and decisions SB1-SB14:
`docs/sector-redesign/briefs/SECTION-BAKE.md`. Builder: Opus, desktop agent (node only: no e2e, no GPU, no build).

## What changed
- `src/world/sectionBake.ts` (new, pure): the opt-in table `SECTION_BAKE_MAPS` / `sectionBakeFor` (:39, :43; campusOps
  only), `inSectionRegion` (:49), membership `lampSectionMasks` (:66; influence = reach + `LAMP_INFLUENCE_PAD` :34),
  `lampLayout` (:90), `joinBounce` (:113), `sectionOrder` (:133), `SectionPlan` (:145: live first, biggest box first,
  ready / landed), `slabDepth` (:229).
- `src/world/maps/campusBake.ts` (new, data): the five regions (footprints + shared connectors, S5 to x -70).
- `src/voxel/sectionJobs.ts` (new): `SectionBaker` (:46): one lamp per worker job, landing into the shared result,
  listeners per batch (a section that completes flushes at once), `whenReady(k)`, `setLive(k)`, inline retry on a worker
  error (SB13), the joined result cached under the full key at a quiet moment (SB14: `markPlaying`, `saveIfDue`),
  `dispose` (SB11). `sectionBakerOf(r)` (:42).
- `src/voxel/lampJobs.ts`: `readLampCache` (:43) split out of `bakeLevelLamps` (same behaviour), `saveLamps` exported
  (:111).
- `src/world/lightBake.ts`: `LightBake.sections` (:60); `bakeLevelLight` takes the section path for an opted-in map on a
  cache miss (:98), else exactly as before.
- `src/world/bounceGrid.ts`: the constructor's body moved to `load` (:82, same results); `adopt(bounce, fresh, k)` (:131)
  adds landed lamps (exact integer sums; their boxes dirty).
- `src/world/lightField.ts`: `lampDoorListInto` (:94; `lampDoorLists` calls it, same lists); the field listens for
  landings (:173, `landed` :177: door lists, bounce adopt).
- `src/world/bakedLamps.ts`: `LAND_FADE_MS` 1500 / `TILE_BUDGET` 4 MB (:71, :73); landing state from the baker (:307);
  `landed` (:725: door lists and texels, live-section tiles uploaded at once, others queued), `stepLanding` (:761, per
  frame from `frame` :489: tile slabs within the budget, then the fades; no allocation), `uploadTile` (:819,
  `texSubImage3D` from `r.vis`), `reuploadAtlas` (:848, fallback). The colour texel is x `fade` in `update`,
  `writeFlicker` and `lampLit`.
- `src/game/gameState.ts`: the load waits for the live section beside the shader warm-up, then `markPlaying` (:937);
  `dispose` stops the bake (:1210).
- `src/game/modes/sectorMode.ts`: `loadSection` puts its section first (:678); the connector cycle waits for the next
  section's lamps (:829, SB9).
- `src/net/coopClient.ts`: the client's `ls` (existing `sector` message) puts that section first (:944). No wire change,
  `PROTOCOL_VERSION` untouched.
- `scripts/e2e-lib.mjs` (:221): an autostart page waits for the whole bake after the match starts (no-op on every other
  map): e2e suites, `perf.mjs` and `campus-art-shots.mjs` see the full bake as before (SB12).
- Docs: `docs/systems/lighting.md` "Per-section lamp bake", `TESTING.md` (section-bake line), the brief, this report,
  `changes/feature-sector-redesign-bake.md`.
- Not touched: `src/world/world.ts`, `src/world/sunCascadeCull.ts`, `src/game/sectorGuardFreeze*`, `src/ai`,
  `src/game/course`, `courseMode.ts`, `ctcourse*`, `tests/lightField.test.ts`. No hook was needed in `world.ts`: the
  baker rides on `LightBake` / the `LampResult` the world already passes on.

## Tests (node, `--maxWorkers=2`, slot lock sr-slot-4)
- `npx tsc --noEmit -p .`: clean. eslint on the changed files: clean.
- New `tests/sectionBake.test.ts` (11): membership (border and doorway lamps count for two), bake order, the plan,
  layout = the full bake's boxes, slab budget; **parity**: a three-section strip with lamps in each section, on a border
  and in a doorway, shut doors: the field built before anything lands and fed by a hand-run pool equals the full bake's
  `levelAt` and `bounceAt` EXACTLY at 700 random points of the live section (section 0; then section 2 put live out of
  order, the late joiner; then section 1 with a door opened and a lamp switched off between landings) and at 1200 points
  once all landed; the joined result byte-identical to `bakeLamps` (boxes, vis, bounce boxes / data / bits), the bounce
  grids' `g` / `bits` equal; a lamp baked alone = its bytes in the full job; dispose releases waiters; a failed worker is
  baked inline; SB14 (the cache write waits for a section change).
- New `tests/sectionBakeCampus.test.ts` (3 + 1 heavy, skipped unless `SECTION_BAKE_FULL=1`): one region per section;
  every point of every `CAMPUS_SECTORS` section (starts, checkpoints, connector boxes and doors, objectives, guards,
  routes, takedown spots, reinforcements, entry run-ins, sweeps, keypads, bolts, crate, extraction) and every room
  corner inside its region (first run caught the S5 garden at x -70: region widened); at 2000 random points per region
  no non-member lamp within reach + bounce pad.
- Existing, passing: bounceGrid, lightField, lampBounce, shadowAccuracy, lampDataUpload, lampBake, lampAtlasFit,
  lampPluginGap, sectorRestart, sectors, changesFragments (71 + 123 tests in two runs).

## Measured (node, one thread, desktop; per lamp, then scheduled on W workers)
campusOps: 134 lamps, 133 M cells, **103 s** of lamp bake (vis 98 s, bounce 5 s; an earlier run under ~85% load: 217 s).
Members per section: S1 52 lamps / 88.6 s, S2 56 / 46.7 s, S3 42 / 48.2 s, S4 59 / 35.5 s, S5 44 / 6.8 s.

| Workers (`hardwareConcurrency - 4`) | before: the load waits (contiguous split) | after: the load waits (S1, biggest first) | after: everything in |
| --- | --- | --- | --- |
| 2 | 91.2 s | 44.3 s | 51.6 s |
| 4 (8-core desktop) | 61.6 s | **22.2 s** | 25.8 s |
| 8 (12-core) | 57.4 s | **11.6 s** | 12.9 s |

- The big win is the scheduling: the old split gave each worker a contiguous run of lamps and the 30 big floods
  (19.2 m reach, 3.6 M cells, 2-5 s each) sit together, so one worker carried most of the bake. S1 holds 86% of the
  work, so waiting for S1 alone adds only ~3.6 s at W 4 over a balanced full bake; later section entries cost nothing
  (all landed ~26 s after the start at W 4).
- On top: the wait now runs beside the campus art load, the GameState build and the shader warm-up (not measured in
  node; laptop GPU run needed). Expected cold-load saving at W 4: ~39 s of bake wait, less whatever the overlap hid
  already. Warm loads (cache hit) unchanged.

## Open risks
1. Late joiner / rejoin into section k > 0: the client's load still waits for section 0 (its hint) and only then gets
   `ls`; its own picture and meter lack section k's lamps for k's share of the bake (seconds; the host's guards are
   right). A start-section hint on the `start` message would fix it (a wire change; not done).
2. A run that reaches a connector before the background is done (a very fast run on a 2-worker machine): the host's
   cycle waits silently until the next section is in (SB9); the client is not gated.
3. The `texSubImage3D` tile upload uses Babylon internals (`_gl`, `_bindTextureDirectly`, `UNPACK_ALIGNMENT` 1); without
   them the whole atlas is re-uploaded per batch (a big hitch). Needs the laptop GPU run (e2e-lightbake on campus is not
   in that suite; check by hand: no black tiles, no hitch spikes in the first 30 s).
4. Background workers compete with the main thread for the first ~25 s of S1 on low-core machines (pool = hc - 4,
   min 2). The bounce re-pack per landing batch (whole fill texture, ~1.7 MB) is throttled to 4 Hz as before.
5. The region rects are authored (SB4). Guard search points (`searchArea`) are bounded by nav path within locked doors,
   so they stay in the section; a new outdoor area or route outside a region must extend `campusBake.ts` (the coverage
   test catches section data and rooms, not raw nav cells).
6. `scripts/guard-cap.mjs` does not use `e2e-lib`'s launch: a campus measurement there runs beside the background bake
   for its first ~25 s.
7. The bounce fill of a landing lamp outside the live section is not faded (a dim fill, outside the live region).

## e2e for the lead (laptop queue, `E2E_GPU=1`)
- `e2e-lightbake`, `e2e-darkness` (field / picture paths touched in `bakedLamps.ts`, `lightField.ts`, `bounceGrid.ts`)
- `e2e-sectorops --part=6` and `--part=7,8,9` (campus parts: cold cache, the e2e-lib wait, the connector gate)
- `e2e-coop`, `e2e-netmove` (`coopClient.ts`, `gameState.ts`)
- By hand on the laptop GPU: the TESTING.md section-bake line (cold-load time vs 4.92.0, no pop, S2 lit at once).

## Fix round (lead, 2026-10-24 ~19:55)
- Check B must-fix: `uploadTile` (src/world/bakedLamps.ts) clears flip-Y through the engine cache (`_unpackFlipY(false)`, as Babylon's updateRawTexture3D) and turns UNPACK_PREMULTIPLY_ALPHA off around `texSubImage3D` (restored after); without `_unpackFlipY` it returns false (the whole-atlas fallback). tsc clean; sectionBake / sectionBakeCampus / bounceGrid 25 pass (1 heavy skipped).
- Check A: PASS, polish P1-P8 (check-A.md). Check B polish 1-10 (check-B.md). Held for after Michael's playtest.
