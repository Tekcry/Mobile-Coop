# Slice 1 brief - S1 Gatehouse and car park (builder: Sonnet 5.5; checker: Opus)

Written by the lead (Opus) 2026-10-23. Build exactly this; anything not covered here: pick the simplest option, log it
as an assumption in your report (the lead numbers it A64+), never ask. Greybox only (boxes, lamps, guards, devices,
objective). No dressing, no art, no refining.

## Read first (in this order, nothing else unless named)
1. `docs/systems/agent-preamble.md` (job = sector-redesign, port 4191; you never commit, push, stash, checkout).
2. `docs/sector-redesign/SPEC.md`: "Campus-wide rules" and "S1 - Gatehouse, staff car park and forecourt" (lines
   ~115-268) and "Unavoidable posted guards (M12)" row K1. These are the values; this brief only adds structure.
3. `docs/sector-redesign/PLAN.md` "Slice 1" and the "Common to every map slice" paragraph.
4. Pattern files to copy (read, then mirror their shape and idiom): `src/world/maps/warehouseOps.ts` (MapDef),
   `src/world/maps/warehouseS1.ts` (section geometry, lamps, switches, hide spots, spawns), `src/world/maps/warehouseSectors.ts`
   (SectorDef data), `src/world/maps/index.ts` (registration), `src/game/sectors.ts` (types: `SectorDef`,
   `SectorGuard`, `checkSectorGuards`), `tests/warehouseS1Light.test.ts` (test shape), `tests/nav.test.ts` and
   `src/ai/navBuild.ts` / `src/ai/navGrid.ts` (nav grid API for the route asserts).

## Files you own (create or edit only these)
- NEW `src/world/maps/campusOps.ts`: MapDef id `campusOps`, bounds x -70..70, z -84..70, `modes: ['sector']`,
  `navLayers: 5`. Builds S1 from `campusS1.ts` plus the other four building shells as plain greybox boxes (footprints
  from SPEC "Map structure decision" / the route table: S2 x -44..4 z -30..6, S3 x 10..64 z -30..0, S4 x -10..40 z 16..48,
  S5 x -66..-26 z 18..48; heights from the SPEC table) so the whole map's build / nav / bake cost is measurable.
- NEW `src/world/maps/campusS1.ts`: every S1 space in the SPEC room table (verge ... C1) at the SPEC boxes and heights;
  lamps with `group` ids `s1-park-w` (8 columns), `s1-park-e` (6), `s1-fore` (bollards), the gatehouse interior
  (switch by its door), canopy downlights (switch inside C1), the lane floodlight (no switch); switches: the feeder
  pillar board at (-31, -47) for `s1-park-w` + `s1-park-e`, the delivery-yard board for `s1-fore`; `ambientZone` 0.14 for
  the encounter spaces, 0.30 for C1; dark spaces with no lamp (verge, bin lane, bike shelter, plant roof, canopy top);
  14 parked cars (1.5 boxes) never within 4 m in plan of the canopy lip; the canopy as a free-standing 4.4 top on four
  0.3 columns, nothing under its S / E / W edges; plant roof 4.4 with 1.1 parapets on S and W, caged ladder at (-38, -41);
  hide spots, player spawns on the verge near (24, -79), nav seeds. Export `CAMPUS_COOP_LIPS` with CR1: lip on the
  canopy's east edge x -14, z -40..-34, top 4.4, boost floor 0, boost point (-13.5, -38).
- NEW `src/world/maps/campusSectors.ts`: `SectorDef[]` with index 0 = S1 fully (guards #1-#8 from the SPEC guard table,
  kinds and weapons exactly as listed, routes / waits / faces giving 25-45 s cycles, each guard with `role`, `zone`,
  `reason`; #3-#4 with `pair` on each other; cameras cam-gate and cam-walk with `range` 10 and the SPEC aims and a
  `reason`; alarm-gh; objective: download 10 s within 4 m at (18.5, -76), opens C1; reinforce points (11, -79) and
  (-33, -41); `perStage` 2, `alarmMax` 3; `dogs` 0). Indices 1-4 = S2-S5 STUBS: one objective box and the connector
  door per section, 0 guards, so the run chains section to section for testing.
  K1 (M12): guard #5 gets `role: 'posted'`, `zone: 'c1'`. The `post` field on `SquadSlot` does not exist yet (guard-ai
  adds it). Until then export `CAMPUS_POSTS: Record<string, { leash: number; highSecurity?: boolean; guards: string }>`
  keyed `'s1#5'` -> `{ leash: 5, guards: 'c1-door' }`, with a one-line comment that it moves onto the slot when
  guard-ai's `post` lands. Post point (-20, -35) facing S means the leash edge is >= 1 m off the C1 near door's nav cell
  only if the door is at z -34 and the leash is measured from the post: check it, and if the edge overlaps the door
  cell, move the post 1 m south and log it.
- EDIT `src/world/maps/index.ts`: register `campusOps` in `MAPS`. Do NOT add it to the listed maps (`listed.ts` /
  `LISTED_MAP_IDS`): that is slice 3. Warehouse Ops stays exactly as it is.
- NEW `tests/helpers/soloJumpReach.ts` and `tests/soloJumpReach.test.ts`: copy from
  `git show 7306dce9:tests/helpers/soloJumpReach.ts` (and its test) on origin/feature/sector-fixes-r2-jump; do not take
  that branch's warehouseS2 change.
- NEW `tests/campusS1.test.ts`: the PLAN "Common" list for S1: 8 guards, every human armed (`checkSectorGuards` passes),
  every route point on the nav grid, each cycle 25-45 s, cameras range 8-12 with a `reason`, CR1 passes
  `soloJumpThreats` + `soloTopLandingThreats` with 0.5 m margin, the headroom check (clear air to 6.2 over the lip), rule
  2 (no solo-standable top >= 1.2 m within 4 m in plan of the lip), element register ids E1-E12 each map to a built
  element (a comment per id naming it is enough where there is no runtime id); the M8 isolation check the warehouse
  tests use (`sectorCheck`) if it exists, otherwise skip and log; **K1 choke assert**: build the S1 nav grid, mark the
  cells inside guard #5's view cone at his post (his kind's sight range and half-angle from the AI config, facing S) as
  blocked, assert no path from the verge spawn to the C1 near door; unblock, assert a path exists.
- EDIT `scripts/e2e-sectorops.mjs`: add a campus part 1 after the Warehouse parts, same helpers, boot
  `?autostart=campusOps&mode=sector`. Minimum asserts (the rest of PLAN's e2e list is a bonus, log what you skip):
  (a) the map boots, 8 S1 guards alive, no console errors; (b) a scripted nav walk verge -> rear window -> download
  completes -> C1 opens -> enter C1 -> the connector seals -> section 2 stub loads; (c) the feeder board cuts
  `s1-park-w` and the light meter at a west-row point reads under 0.28; (d) two CR1 solo probes (a running jump at the
  canopy east lip from the kerb, a wall jump from the bin-store wall toward the plant roof parapet) never stand on the
  canopy. Keep every Warehouse part unchanged.
- NEW `changes/feature-sector-redesign.md` if absent, else append: one line "Sector Ops: new map campusOps (Saltmarsh
  Park), S1 greybox playable; not yet listed."

Never edit: `src/ai/*`, `src/net/*`, `src/security/*`, `ctDevices.ts`, `securityRoom.ts`, `warehouse*.ts`,
`docs/level-design.md`, `docs/templates/*`, `CHANGELOG.md`, `package.json`, the BRIEF / SPEC / PLAN / STATE files.

## Checks you run (desktop CPU is saturated: nothing heavier than this)
- `npx tsc --noEmit -p .` (timeout 600000).
- `npx vitest run tests/campusS1.test.ts tests/soloJumpReach.test.ts tests/sectors.test.ts` (timeout 600000).
- `npx eslint src/world/maps/campus*.ts tests/campusS1.test.ts tests/helpers/soloJumpReach.ts scripts/e2e-sectorops.mjs`.
- Do NOT run e2e or a build: the lead sends e2e to the laptop. Do `node --check scripts/e2e-sectorops.mjs`.

## Report
Write `docs/sector-redesign/checks/slice1-build.md`: files, the exact values you chose that the SPEC left open (post
points, yaws, waits, lamp positions), assumptions (numbered L1, L2 ... for the lead to renumber), what you skipped,
check results. Final message under 10 lines: done / not done, checks, open items.
