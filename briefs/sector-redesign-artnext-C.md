status: done feature/sector-redesign-artnext-c 56557b58

Lead note (Sector Ops Build ~20:15): build LANE C items C1-C6 ONLY (render-freeze polish in src/game/sectorGuardFreeze.ts, src/game/sectorGuardFreezeView.ts and their tests). C7-C9 (src/ai/animFrozen.ts, src/ai/enemy.ts) wait: animFrozen.ts folds into master's animTier.ts when #226 enters its train; the lead does them then. BASE: feature/sector-redesign-artpol @ 72e87171. New branch feature/sector-redesign-artnext-c. Lanes A / B / D are another brief (-artnext): do not touch src/world/campusArt/*, campusDress.ts, campusS*Dress.ts, docs other than the report. Render only, host and client the same; gameplay reads nothing here; hot paths do not allocate. Unit tests only (tsc + the lane C test files, --maxWorkers=2). Report: docs/sector-redesign/checks/artnext-c-build.md.


# campus-art-next - the open campus art and freeze polish, one batch (Opus code, Sonnet dressers, Haiku docs)

Planner: Opus 5.5, 2026-10-23. Plans only. One branch, one checker, one batch PR (CLAUDE.md "Small and spare jobs ...
ride in one batch PR").

## Goal
Close the non-blocking polish the art checkers left open, so the campus reads as finished dressing (Michael ~18:15:
"a showcase no matter where you look") without touching routes, cover, nav or light parity. The current-goal rule
still applies: only items already on a checker's polish list; nothing new.

## Base and branch
- Base: master after #226 (`feature/sector-redesign-art`) merges, with `feature/sector-redesign-artpol` @ 72e87171
  (artpol + frzpol + perfa + perfg, checks PASS) merged on top; the lead writes the sha here. New branch:
  `feature/sector-redesign-artnext`.
- File:line below are at artpol 72e87171.
- Cloud build: `npx tsc --noEmit -p .`, `npx vitest run <files> --maxWorkers=2`. No e2e, GPU, `npm run check`.
- Lanes A, C, D run in parallel; lane B starts after lane A's kit API lands (it uses it). No two lanes share a file.
- Verify first: some items may already be done on the base. For each, check the cited line; if done, write "already
  done, file:line" in the report and skip it.

## Lane A - kit code (Opus). Files: `src/world/campusArt/{keepouts,catalogue,dresser,campusArtRender}.ts`, `src/world/maps/campusDress.ts`, kit tests
| # | Source | Item | Where | Do |
|---|---|---|---|---|
| A1 | art-check P4 / art-kit-check P5 | split gaps depend on dressing order | `campusDress.ts:101` | compute `findSplitGaps` from the greybox once, before the section loop (only when any section has tags) |
| A2 | art-join "not applied" S3 gap 1 | no `skinFace` (thin panel over one face of a box, flush) | `dresser.ts:129` `skin`, `:159` `skinRow` | add `d.skinFace(piece, boxIndex, face: 'n'|'e'|'s'|'w', o)`: a visual module tiled along that face, depth <= `ART_PROUD`, no collide box; K-rules as a wall-mounted visual |
| A3 | S3 gap 2 / S4 gap 1 | one fit range 0.8-1.25 for every piece | `catalogue.ts:127-128` `FIT_MIN` / `FIT_MAX`, `:157` | optional per-piece `fit: { min, max }` in the catalogue entry (default 0.8 / 1.25); allow `batteryRack` depth to 1.0 / `meshPanel` height to 3.0 / `labBench` length to 2.0 with their own limits |
| A4 | S3 gaps 3-4 | `add` errors carry no rule id; no `tryAdd` | `dresser.ts:70` | throw `ArtRuleError { rule: 'K5' | 'C' | ..., msg }`; add `d.tryAdd(piece, spots[], o)` returning the index placed or -1 (logs each refusal with its rule) |
| A5 | S4 gap 3 / S5 gap | `skin*` / `skinRow` take no `group` | `dresser.ts:129`, `:159` | `group` already in `o` for `skin`: make `skinRow` pass it to every module; remove the post-call `placements[i].group` writes in S4 / S5 in lane B |
| A6 | S4 gap 2 | floor decals kept out like boxes; `add` snaps y to 1 cm | `keepouts.ts:662` `blocked`, `:788` `overlapsGreybox`, `dressRules.ts:321` | a piece with hull height < 0.05 m on a floor is exempt from K1-K6 and the greybox overlap; y snaps to 1 mm for it |
| A7 | S5 gap | no door-frame exemption under K1 | `keepouts.ts:656` `OVER_DOOR`, `:722` | a `frame` piece class whose hull wraps a door opening (opening width + 0.2 at most) passes K1 for that door's legs |
| A8 | S5 gap | `kitchenRun` / `wallCupboards` not `fit` | `campusKit.ts:51-52`, `catalogue.ts:157` | mark both `fit` (modules along x) |
| A9 | art-check P8 | S1 hero errors swallowed (kit contract: heroes throw) | `campusS1Dress.ts:148-153` | lane B moves S1 to `tryAdd` and the explicit omit list; lane A only documents the contract in `dresser.ts` |
| A10 | artpol-frzpol polish 4 | `slice(n0)` assumes nothing pre-existing is removed | `campusArtRender.ts:165` | comment only |
Tests: `tests/campusArtKit.test.ts`, `tests/campusDressRules.test.ts`, `tests/campusArtGameplay.test.ts`,
`tests/campusArtRender.test.ts` - one case per item (A1 "split gaps are the greybox's whatever the order", A2
"skinFace is flush and visual", A3 "per-piece fit limits", A4 "tryAdd returns -1 with the rule id", A6 "a decal is not
a keepout", A7 "a door frame passes K1").

## Lane B - dressing (Sonnet, after lane A). Files: `src/world/maps/campusS{1..5}Dress.ts` and their tests
| # | Section | Item (source) | Do |
|---|---|---|---|
| B1 | S1 | cars in 2 of 4 colours (art-join S1 L4: 4 colours = 53 draws of 40) | only if the perfa merged emissives / casters left room (read `artCounts` S1 draws first; S1 sits at 39 of 40): use per-instance colour on one car material; else leave and log |
| B2 | S1 | hero errors swallowed (P8) | `tryAdd` + an explicit `S1_OMITTED` list asserted by the test |
| B3 | S2 | `greenWall` refused by rule V (art-join S2 L7) | place it with `skinFace` on the atrium wall at the two spots (`campusS2Dress.ts:225`) |
| B4 | S3 | gowning lockers and bench dropped (S3 skipped list) | lockers as `skinFace` on the partition wall faces that K2 / K5 allow; bench stays dropped if every spot still fails (log the rule ids) |
| B5 | S4 | `batteryRack` / `meshPanel` worked round with H4 pieces; floor tiles 5 of the hall | use the per-piece fit (A3) where it now fits; floor tile grid over the hall with the decal exemption (A6) |
| B6 | S5 | vault frame and leaf, kitchen run, deposit / monitor walls (S5 skipped list) | frame with A7, kitchen counter skinned with the `fit` kitchenRun (A8), cupboards over it; monitor wall as `skinFace` |
| B7 | S4 / S5 | post-call group writes | pass `group` in `skinRow` (A5) |
| B9 | S4 | `overhang.parts` only for basketRun (artpol-frzpol polish 3) | list the genset exhaust stack as a part at `campusS4Dress.ts:122` (from `hero-s4.glb`, as basketRun's rods) |
| B8 | S5 | two hall portraits at y 1.93 beside the lintel (art-check P6) | re-mount at the hall floor's y (not the door-wall piece's), keep them flush |
Rules: no placement may change routes, cover, nav or lips: `campusArtGameplay` gates pass per section; every
section's `artCounts` within 40 draws / 150 k tris / 2500 placements (ART-PLAN 6); log every dropped item with its rule
id. Tests: `tests/campusS{1..5}Dress.test.ts` (where they exist), `tests/campusArtGameplay.test.ts -t S<n>`.

## Lane C - guard render-freeze polish (Opus). Files: `src/game/sectorGuardFreeze.ts`, `src/game/sectorGuardFreezeView.ts`, `src/ai/animFrozen.ts`, `src/ai/enemy.ts` (only the lines named), their tests
| # | Source | Item | Where | Do |
|---|---|---|---|---|
| C1 | campus-perf-check polish 1 | stale hidden verdict on frustum re-entry | `sectorGuardFreezeView.ts:205-212` | verify: reset `memoWait[i] = 0` when `bits` goes 0 -> > 0 with `memoHidden` |
| C2 | polish 2 | no leg sample | `sectorGuardFreeze.ts:156-176` `occlusionPoints` | add a knee point (y + 0.4) |
| C3 | polish 5 | moon shadow off a roof edge | `sectorGuardFreeze.ts:176` (shadow points at y + 0.1) | also sample where the shadow line meets `y - shadowDrop` (`:93-95`) |
| C4 | polish 6 | no NullEngine test that a frozen guard's forced neck / head equals the unfrozen | test only | add it |
| C5 | frzpol polish 1 | over-budget non-edge hidden verdict kept up to `STALE` | `sectorGuardFreezeView.ts:49` `STALE = RETEST`, `:226` | verify done (STALE now = RETEST); add "over budget, a due non-edge hidden guard is drawn" |
| C6 | frzpol polish 2 | `rays` counts primary casts only | `sectorGuardFreezeView.ts` debug counter | count the see-through recasts too |
| C7 | perf-batch polish 1 | thaw draws the pre-freeze limb pose for a frame | `src/ai/animFrozen.ts` | on thaw, force one `rig.animate` with the carry before the frame |
| C8 | perf-batch2 polish 1 | foot stretch after a short freeze | `Enemy.frame` thaw path | when the root moved > 0.3 m since the freeze, reset the foot planner (as the jump rule) |
| C9 | perf-batch2 polish 2 | ragdoll seeded from the freeze pose | `enemy.ts` `die()` | if the root is disabled, one `rig.animate(0.1, rp)` before `addBody` |
Render only, host and client the same; gameplay reads nothing here. Tests: `tests/sectorGuardFreeze.test.ts`,
`tests/sectorGuardFreezeView.test.ts`, `tests/sectorGuardFreezeSeeThrough.test.ts`, `tests/animFrozen.test.ts` (if present).

## Lane D - docs (Haiku). Files: `TESTING.md` "Campus art", `docs/systems/world-and-characters.md` "Campus art kit", `changes/feature-sector-redesign-artnext.md`
- A156 docs (art-join "Open items"): a 5-line `TESTING.md` "Campus art" checklist (load, views s1-a..s5-g, no greybox
  showing, draws), and a "Campus art kit" section in `world-and-characters.md` (catalogue, dresser API incl. `skinFace` /
  `tryAdd` / per-piece fit, keepouts K1-K12, C, V, the gate test).
- art-check P7: one fragment line for the A99 screen-cap lift.
- The new fragment lists lanes A-C in plain bullets.

## Acceptance (whole batch)
- `npx tsc --noEmit -p .` clean; all files named above pass (`--maxWorkers=2`).
- Full dressed campus dump (as `artpol-build.md` did): routes, cover, nav, lips unchanged except where lane B adds a
  flush visual (`campusArtGameplay` all sections PASS).
- Light parity: art boxes keep `art: true` (no detail pieces); any new collide box is in `canonicalLightShapes` (the
  campus light hash moves; say so in the report).
- Report: `docs/sector-redesign/checks/artnext-build.md` (per item: done / already done / dropped with rule id).

## Laptop GPU checklist (lead, after done)
1. `scripts/campus-art-shots.mjs` 35 views before / after (S2 green wall, S3 gowning room, S4 battery room and floor
   tiles, S5 vault frame, kitchen, hall portraits s5-a / s5-b).
2. `artCounts` vs GPU draws per section (S1 / S2 at 39-40 of 40).
3. Freeze: knee point (guard on the S2 L1 gallery seen from below), S5 roof guard's moon shadow on the ground, thaw
   without a pose pop or foot stretch, `__sector.debug().guardFreezeRays` incl. recasts.
4. Campus load time vs #226.

## Do NOT touch
Lighting (`src/world/lampMath.ts`, `lightField.ts`, `bakedLamps.ts`, `src/voxel/*`: the LR16 lane), routes / nav /
cover data in the greybox sections (`campusS{1..5}.ts`), `?voxels=1` path (retired; art-kit P6 stays skipped),
`src/net/*`, guard AI behaviour.

## Model and size
Lane A Opus (~0.75 window), lane B Sonnet (~1 window, 5 sections, may split per section), lane C Opus (~0.5 window),
lane D Haiku (~0.2). Fresh checker: Sonnet for lanes B / D, Opus for A / C.

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
Built `feature/sector-redesign-artnext-c` @ 56557b58 on 72e87171, C1-C6 only (C7-C9, `animFrozen.ts`, `enemy.ts`
untouched). Full report: `docs/sector-redesign/checks/artnext-c-build.md`.
- C1 already done: `sectorGuardFreezeView.ts:213-216` (bits gain -> hidden memo `memoWait = 0`, urgent; existing test).
- C2 already done: `sectorGuardFreeze.ts:138`, `:170` (`FREEZE_KNEE` 0.4; existing test).
- C3 already done: `sectorGuardFreeze.ts:190-226`, `sectorGuardFreezeView.ts:265-276` (`shadowProbe` / `shadowLanding`).
- C4 done (test only): `tests/sectorGuardFreezeView.test.ts:280-316`, two NullEngine rigs, one frozen; neck / headNode /
  hips equal to 1e-6 after a forced world matrix.
- C5: `STALE = RETEST` already on base (`sectorGuardFreezeView.ts:51`, used `:233`); test "over budget, a due non-edge
  hidden guard is drawn" added (`tests/sectorGuardFreezeView.test.ts:318-357`).
- C6 done: `FreezeRay` carries an optional `recasts` counter, `seeThroughRay` counts every cast after the first, the
  freeze adds the evaluation's delta to `rays` (`sectorGuardFreezeView.ts:30-33, 79-101, 137, 185, 251-252`); no
  per-frame allocation. Test `tests/sectorGuardFreezeSeeThrough.test.ts:220-256`.
- C4 / C5 tests verified to fail on the broken code (old STALE 8; frozen rig not animated), then reverted.
Tests: tsc clean; eslint clean on changed files; sectorGuardFreeze 13 / 13, sectorGuardFreezeView 8 -> 10,
sectorGuardFreezeSeeThrough 6 -> 7 (27 -> 30, all pass).
Notes: C4 checks the rig, not the in-game frame: the frozen anim tier (`enemy.ts:2803`) skips `rig.animate` while frozen,
so forced limbs keep the pre-freeze pose until thaw (that is C7). `__sector.debug().guardFreezeRays` now includes
recasts; the old ray bound (`TESTS_PER_EVAL x FREEZE_TEST_RAYS`) counts first casts only, plus up to 6 recasts each.
