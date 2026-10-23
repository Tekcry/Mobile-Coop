# Campus art check (fresh Opus checker, 2026-10-23)

Checked: `feature/sector-redesign-art` at 5504e2e3 (18125450 adds docs only), diffed against the merge base with
`origin/feature/sector-redesign-polish` (`git diff 4a65d692...HEAD`). Read: CLAUDE.md "Hard rules" / "Current goal",
`briefs/ART-PLAN.md`, `briefs/ART-KIT.md`, `checks/art-join.md`, `art-kit-check.md`, `a64-lift.md`, `gear-check.md`,
`gear-sweep.md`, `art-s1..s5-build.md`, BRIEF A99. BRIEF.md has no A127-A157 lines: those items are only in ART-PLAN section 7.

## Verdict: PASS

Nothing is broken or unplayable. No blocking items. The polish list is below.

## Runs (desktop, `sr-slot-2.lock` held, one file at a time)
- `npx tsc --noEmit`: clean.
- vitest: campusArtGameplay 53, campusArtLight 5 (a real bake, 48 s: the dressed light hash differs, every protected point
  within 0.02), campusArtKit 13, campusArtRender 3, campusDressRules 25, campusGear 8, campusS1Dress 13, campusS2Dress 12,
  campusS3Dress 12, campusS4Dress 13, campusS5Dress 6, facilityProps 16, facilityKit 18, campusRuntimeNav 3, campusS1 51,
  campusS2 39, campusS3 32, campusS4 41, campusS5 29, sectors 27. All green.
- Scratch probes (in the session scratchpad, nothing committed): a dressed campus build takes 1.2-2.3 s in node and
  writes 229 art boxes (1303 -> 1532). Placements: 580 skin, 15 skin-hide, 1037 visual, 92 see, 128 solid. A float and
  clip scan found nothing real (see P6).
- Not run: e2e, `npm run check`, GPU shots and perf (batch 3, the lead's).

## 1. Gameplay untouched by props
- The diff touches no nav, cover, ledge, lip, perception, light-bake or `src/ai` code. `levelBuilder.ts` adds only the
  `door()` `leaf` option and `hidePieces`. `hidePieces` is render-only: it zeroes `lvl-box` instance matrices and never
  touches `BoxPiece`, physics or the bake. `anchors.ts` / `doors.ts` add only `Door.leaf`. No campus door uses `'slide'`.
- No section greybox file (`campusS1..S5.ts`, `campusLips.ts`) changed. `campusOps.ts` moves the old body into
  `buildCampus` with range recording and does nothing else. The greybox pin `1303/114/acb8cfbb` holds, and the gate's
  box-by-box test shows the dressed build changes only greybox colours.
- Data changes outside art: gear tags, S4 / S5 `sweep`, `CAMPUS_SCREEN_CAP` (A99) and S1 #7's `dormant`. The A99 tag has
  no reader, and the gear and sweep data were passed by gear-check.
- `tests/campusArtGameplay.test.ts` is a real gate. Both navs come from `runtimeNav` over each build's own boxes, so a
  blocking art box changes `navD`, and items (1) legs, (2) protected cells and (3) patrols fail. Cover (4), lip threats and
  the headroom prism (5), camera rays recomputed on the dressed boxes and laser tubes (6), reach with a segment test
  against art boxes (7), ledges (11) and `checkDressing` plus the budgets (8-10) all compare greybox with dressed. Each item
  has a liveness assert (`legs > 3`, `checked > 100`, protected ledges in S1-S4) or a self-test (11). The weak spots are
  coverage gaps, not fake checks (P3, P4).

## 2. Kit code
- **`door()` merge**: one opts type carries both `armoured` and `leaf`, and each setter writes its field only when set.
  The anchors of every existing door are unchanged. `Doors.write` zeroes only a `'slide'` leaf. Correct.
- **`group` on skin calls**: `skin` / `skinHide` / `skinCyl` / `skinRow` take an optional `group` and set it as `add`
  does. The renderer groups draws by material, not circuit, so `artCounts` and `counts()` stay consistent. The dressers'
  older lines that set `placements[i].group` after the call still work.
- **K2 sweep**: `keepouts.ts:337` caps each sweep point at storey 0 with `KEEP.patrol`. All sweep points are route points,
  so K1 already covered them (no placement changed). Correct.
- **Instancing and counts**: statics are merged per (section, material) and frozen. Emissive, alpha and skin-hide meshes
  are thin-instanced per (catalogue, section, piece, material). `artCounts` follows the same rule (skin-hide counts as
  instanced, and the merged materials are keyed per section), so the 40-draw budget is honest. The per-frame path
  (`frame` / `fill` / `groupLit`) loops by index, repaints only on a registry-version change and allocates nothing.
- **Babylon and network**: Babylon is imported only through `src/core/babylon.ts`, and the pure modules are Babylon-free.
  The GLBs are bundled through `import.meta.glob(?url)`, and the only `fetch` is of bundled URLs. None of the 6 GLBs has
  images or URIs. Blender runs as `-b --factory-startup -noaudio` with `windowsHide`, SEED and `PYTHONHASHSEED`, and the
  hero scripts import only `lib` and the stdlib. There is no external art.
- **G6**: no reference-game name in the diff.

## 3. Dressing per section
Tags, skins and heroes match the briefs as logged in the build reports. The `why` strings name the real reason. The
deviations are logged L-items that the kit report allows. Skins write no boxes. Every solid or see box passed K1-K13,
rule C and the gates, and none of the placements needed moving at the join. Hero placements that the kit refused are
left out and logged (S1 bikeRack K6 / parkBench K1, S3 gowning bench and lockers, S5 vault leaf, depositWall and
monitorWall). No dressing sits in a door zone (K3), a route or patrol capsule, a hide or takedown disc, a lip prism, a
laser tube or a clear camera ray. The A99 constant and the S1-S5 tests agree: every screen test counts every guard
against `CAMPUS_SCREEN_CAP`.

## 4. Light parity
- Solid art boxes are visible and collide, so they are in `canonicalLightSet`, the `lvl-box` shadow casters and guard
  sight, and the light gate baked them.
- See boxes are invisible: not in the bake, no render shadow, but they block sight, matching ART-PLAN 2. Visual pieces
  are held by rule V.
- Emissives add no light. They dim on their circuit, and the skin groups now reach them.
- Skin-hide (cars, van): the box stays in the bake and keeps collision and sight, while the skin casts the render shadow.
  Where the skin is lower than the box, the render shows a little more light than the meter (AS10, the safe direction,
  listed for Michael).

## 5. Repo hygiene
- No tracked `.pyc` or `__pycache__`. The one stale `.pyc` is deleted and `*.pyc` is ignored.
- `changes/feature-sector-redesign-art.md` follows `changes/README.md` (title line, `kind: minor`, bullets).
- No `CHANGELOG.md` edit. `package.json` adds only the `campus-props:build` script line, with no version change.

## Blocking items
None.

## Polish list (not blocking)
- **P1 Dressing cost per load.**
  - Where: `maps/campusDress.ts` `dressCampus`, from `buildCampus`.
  - What: the dressing runs on every campus load, on host and client. It takes 1.2-2.3 s in node on the loaded desktop (art-kit P9 measured 0.84 s with tags only).
  - Fix: measure in the batch-3 perf pass. If it shows in load time, the first lever is the K8 camera rays (built per section in `buildKeepouts`).
- **P2 Screen-count tests run on the dressed boxes.**
  - Where: `tests/campusS2.test.ts:741` (and the S3-S5 equivalents).
  - What: these tests use `SightWorld(b.boxes)` from `campusOps.build`, so invisible see boxes (chairs, shelving) now cut guard-in-view counts that the GPU still draws. The margin is large (worst 7 against the cap of 12).
  - Fix: build those tests' sight worlds from `buildCampus(b, { dress: false })`.
- **P3 Gate coverage gaps.**
  - Where: `tests/campusArtGameplay.test.ts`.
  - What:
    - Item (6) checks lasers against art boxes only. A skin's listed overhang (S4 `basketRun` 2.7 m hanger rods, `genset` stack, S5 chimney pots) is visual and is checked against neither K8 nor K9.
    - Item (4) compares cover only within the section bounds.
  - Why not blocking: no current placement is near a beam.
  - Fix: run `blocked` K8 / K9 on skin hulls in `checkDressing`.
- **P4 Split gaps depend on the dressing order** (art-kit P5, still open).
  - Where: `maps/campusDress.ts:101`.
  - What: the split gaps are computed lazily after section 1 has written its boxes.
  - Fix: compute them from the greybox before the loop.
- **P5 Art-kit P2 / P3 / P6 / P7 / P8 are still open** (mount derivation, long legs crossing a section, `?voxels=1` showing both box and skin, detail pass on art boxes, a failed build leaking meshes). The art-join "not applied" kit gaps also stay open: four car colours, `greenWall`, `skinFace`, the fit limits, decals, the door-frame exemption, the kitchen pieces.
- **P6 Two S5 hall portraits to check in the GPU shots.**
  - Where: `oh-hall` portraits at (-46.4, 18.15) and (-43.0, 18.15).
  - What: they mount at y 1.93 (`floorAt` hit a 1.93 m piece at the door wall), so the frames span 3.33-4.33 beside the front-door lintel and reach 0.13 m past the upper wall's base. They are flush, so this is visual only.
  - Check: views s5-a / s5-b.
- **P7 The fragment does not mention A99.**
  - What: the A99 screen-cap lift (merged from -cap) has no line in `changes/feature-sector-redesign-art.md`. It is test and data only (nothing reads `dormant`), so the omission is harmless.
  - Fix: add one line if the orchestrator wants it recorded.
- **P8 S1 hero errors are swallowed.**
  - Where: `campusS1Dress.ts:148`.
  - What: `hero()` catches `add` errors into `S1_OMITTED`. The S1 test pins that list, so a new refusal fails the test. That is fine, but it differs from the kit's "heroes throw" contract (S3 and S5 use the same pattern).

## P2 fixed

The S2-S5 screen-count tests now build their SightWorld from the undressed greybox (`buildCampus(bG, { dress: false })`), so dressing boxes no longer block sight lines. Worst counts (cap 12): S2 5, S3 6, S4 7, S5 6 (same as before; no section near the cap).
