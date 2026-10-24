# SECTION-BAKE - per-section campus lamp bake (design brief)

Ask (Michael, 2026-10-24 ~17:50): "start the faster campus load now". Job slice of `feature/sector-redesign-bake` (branch
off master 95849c26). Builder: Opus. Report: `docs/sector-redesign/checks/section-bake-build.md`.

## Problem (measured)
- campusOps bakes every fixed lamp of all five sections before the match starts (`world/lightBake.ts`
  `bakeLevelLight` -> `voxel/lampJobs.ts` `bakeLevelLamps`, the worker pool). The cold first load waits for all of it;
  a warm load reads the IndexedDB cache (`lamps:` key, newest two kept).
- Node, one thread, this branch, desktop at ~85% CPU (`tests` scratch probe, one lamp per job): **134 lamps, 133.4 MB of
  visibility, 217 s** (LR16e check: 75-126 s on a quieter desktop). Per section, the lamps whose light can reach it
  (SB3 membership): S1 51 lamps / 195 s / 98.8 MB, S2 51 / 90 s / 62.5 MB, S3 46 / 94 s / 68.3 MB, S4 56 / 57 s / 49.4
  MB, S5 41 / 8 s / 15.7 MB. The cost sits in the big lamps: 30 floods and strips with a 19.2 m reach (box up to
  192 x 97 x 192 cells, 3.6 M cells each), most of them S1's car park and forecourt.
- So S1 (where every run starts) needs ~90% of the work: scoping the bake to the live section alone saves little on
  the first load. The gains come from three things together: (1) the bake no longer blocks the rest of the load (it
  runs beside the campus art, nav build and shader warm-up), (2) one lamp per worker job, biggest first (the old split
  gave each worker a contiguous run of lamps, and the floods sit together in the light order), (3) only the live
  section is waited for; the other sections bake in the background while it plays.

## What is baked when
1. `bakeLevelLight` (lightBake.ts) for an opted-in map (SB1) on a full-cache miss (SB2): the lamp layout is made at once
   (every lamp's box from `lampBox`: pure geometry; a zero visibility buffer of the full size; empty bounce), the moon
   is awaited as before, and a `SectionBaker` (`voxel/sectionJobs.ts`) starts baking. The returned `LightBake` carries it
   as `sections`. `World.create` (unchanged) builds the light field and the baked lamps over the shared buffers.
2. `GameState.create` waits for the live section (hint: section 0; SB5) beside the shader warm-up. Nothing plays
   before the live section's lamps have landed.
3. Background: the lamps not landed yet, section by section in the order live, live+1, ..., last, then the earlier
   ones; within a section biggest box first (SB6). `setLive(k)` (the host's `SectorMode.loadSection`, the client's
   `ls` from the existing `sector` message) moves section k to the front.
4. When every lamp has landed the joined result (byte-identical to `bakeLevelLamps`) is saved under the existing full
   key, so the next load is a cache hit exactly as today.

## Data per section
- `world/maps/campusBake.ts`: per section a list of plan rects (x0, z0, x1, z1; full height): the section's footprint
  (SPEC "Map structure decision"; S5 out to the west fence and the jetty, x -70) plus every connector box it shares (`CAMPUS_SECTORS[k].connector` belongs to k and
  k + 1), grown by `SECTION_MARGIN` 2 m.
- `world/sectionBake.ts` (pure): per lamp a section bitmask (Smi, up to 30 sections): the lamp counts for every
  section whose rects its influence square touches. Influence (SB3) = the lamp's plan square of half-size reach +
  `BOUNCE.reach` + 2 ambient cells + a lamp cell: the direct term is 0 past the reach (`photoFalloff` window), the
  bounce reaches at most `BOUNCE.reach` from a lit cell plus the cell its receivers are grown by, and a read blends
  the cell next door. A lamp on a border or in a connector simply counts for both sections.
- Per lamp at runtime: landed flag, its visibility in place in the full buffer (offset from the box sizes), its bounce
  box / data / bits (joined in light order on each landing batch).

## Parity proof (one field)
- Per-lamp independence: `bakeOne` and `bounceLamp` read one light, the canonical shapes and the map bounds only; the
  penumbra scratch is reset per lamp. A lamp baked alone gives the same bytes as in the full job (unit test).
- Every reader is the same structure as before: the light field (`LightField`), the picture (`BakedLamps`: atlas,
  data texture, fill texture) and the guards read the one shared result. A lamp not landed yet has visibility 0, no
  bounce and no door list: it lights nothing, on screen or in the meter.
- At a point p in the live region every lamp whose light (direct or bounce, read with its blend) can reach p is a member
  of that section, and the live section has landed before anything plays. So `levelAt(p)` equals the full bake's: the
  column lists (`lampGrid`) are pure geometry and the same; each listed lamp is either landed (same bytes, same door
  list from the same visibility) or reaches p with exactly 0 (outside its reach); the bounce sums are exact integers
  (`BounceGrid`: order-free), its wall bits are the same OR of identical per-cell bits.
- Unit tests: (a) a synthetic map with three sections, lamps on borders and in a connector, shut doors: section-by-section
  landing vs the full bake at 600+ random points per section (levelAt, bounceAt; exact equality), the joined result
  byte-identical to `bakeLamps`; (b) campus membership: every point of every `CAMPUS_SECTORS` section (starts,
  checkpoints, objectives, guards and their routes, reinforcements, entry routes, routes, extraction, connector boxes)
  and every room of the section lies inside its region, and at 2000 random points per region no non-member lamp is
  within its reach + bounce reach (no bake needed); (c) an opt-in heavy campus test (`SECTION_BAKE_FULL=1`) bakes S5's
  members and compares to the full bake at its points (laptop / CI time).

## Co-op
- Host and client bake the same bytes (same keys, same shapes, per-lamp determinism); only the landing time differs per
  machine, and landing only changes light outside the live region once the live section is in.
- Host: `SectorMode.loadSection(i)` calls `setLive(i)`; the connector cycle waits until section i + 1 is ready (SB9),
  which in play is long done. Restart: same section, nothing to do.
- Client: `setLive(ls)` from the `sector` message it already gets (`coopClient.onSector`). No wire change.
- Late joiner / rejoin into section k > 0: the client's load waits for section 0 (its hint), then k goes to the front
  when the first `sector` message arrives. Until k lands (seconds: its share of the bake on the client's pool) the
  client's own picture and meter lack those lamps; the host's guards are right. Open risk, named in the report.

## Gameplay never reads graphics state
- The section bake is gameplay data (the light bake). Fades are render only (SB8). Nothing reads presets, LOD or the
  governor. The worker count is the existing `workerCount()` (hardware, not a preset).

## Memory
- Same as today: the full visibility buffer (133 MB) and the atlas (one R8 3D texture) are made at load, zeros where
  not landed. Extra while baking: the per-lamp bounce parts (~ the joined bounce, a few MB) and one in-flight job per
  worker; freed when the joined result is saved.

## Hot paths
- Landing runs in promise callbacks between frames, never per frame. Per frame only: the fade step (an index list, no
  allocation) and at most `TILE_BUDGET` bytes of atlas tile uploads (`texSubImage3D`, time-sliced by z slabs). The light
  field's read path is unchanged.

## Fallbacks
- Full-cache hit, a map not in the table, `?fullbright=1` (its own id), the cheap path (`?gfx=min`: field only): the
  field still lands section by section; the full path is unchanged for other maps.
- A worker error: that lamp is baked inline on the main thread (a hitch, never a wrong light).
- No `texSubImage3D` (no engine internals): the whole atlas is re-uploaded once per landing batch.

## Assumed decisions (undo in brackets)
- SB1 Opt-in by map id (`SECTION_BAKE_MAPS`: campusOps only). [Remove the entry: the full path returns.]
- SB2 The full cache is read first; the section path runs on a miss and saves the joined result under the same key; no
  per-section cache entries. [Per-section keys would make a quit mid-bake keep its progress.]
- SB3 Conservative plan-square membership (full height). [A tighter test from the baked visibility needs the bake.]
- SB4 Section regions are authored rects (footprints + connectors + 2 m), checked by a coverage test against all
  section data. [Edit `campusBake.ts`.]
- SB5 The live-section wait moves from `World.create` to `GameState.create` (beside the shader warm-up); the hint is
  section 0. [Await inside `bakeLevelLight` instead: same result, less overlap.]
- SB6 One lamp per worker job, biggest first within a section (same bytes). Other maps keep their split.
  [`bakeLevelLamps` could take the same scheduling for every map.]
- SB7 The full pool (`workerCount()`) bakes in the background too; disposed when done or when the match ends.
- SB8 Lamps landing outside the live section fade in over 1.5 s (colour texel only, render only); live-section lamps
  appear at once. The bounce fill of a landing lamp is not faded (a dim fill, never in the live region). [`FADE_S` 0.]
- SB9 The host's connector cycle waits for the next section's bake (a hold, never a skip). [Drop the gate in
  `SectorMode.exitStep`.]
- SB10 The client follows the host's `ls`; no wire change.
- SB11 Quitting mid-bake cancels the background bake (no cache saved).
- SB12 e2e and tools that drive sections in sim time (`e2e-sectorops` `run()`, `perf.mjs`, `campus-art-shots.mjs`)
  wait for the whole bake after boot (`window.__app.current.world.lightBake.sections.done`).
- SB13 Worker failure: inline retry of the lamp.
- SB14 (added in the build) The cache write clones the whole result on the main thread (~133 MB): once the match plays
  it waits for the next section change (the connector cycle) or the match's end (`SectionBaker.markPlaying`,
  `saveIfDue`). A bake that finishes during the load is cached at once. [Save at `complete` always.]
