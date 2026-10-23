# Campus art polish batch 3 (artpol, Opus builder, 2026-10-23)

Branch `feature/sector-redesign-artpol`, cut from #226 head 2276483a. Sources: `art-kit-check.md` polish P2, P3, P6, P7,
P8; `art-check.md` polish P1, P2; `polish2-check.md` polish 1-2.

**No placement moved.** The full dressed campus (placements and every box) was dumped from 2276483a and from this branch:
the two dumps are identical (229 art boxes, 1532 boxes), so routes, cover and nav stay as designed, and the
`checkDressing` gates pass on every section.

## Items

| Item | State | Where | What |
| --- | --- | --- | --- |
| art-kit P2 mount derivation | done | `keepouts.ts:610` `MOUNT_CEIL`, `keepouts.ts:649` | A raised piece with no wall behind it takes the ceiling rules only when its bottom is 1.9 m or more over its floor; below that it is `floor-free` (K1-K6, C, K7 rules 2 / 3, K12 apply). |
| art-kit P3 long legs | done | `keepouts.ts:328` `segInB`, `:331` `cap`, the `tube` filter below it | A leg (and a laser / anchor tube segment) is kept when the segment meets the section bounds grown by the margin, not only when an end lies inside. A leg that passes the section by is still dropped. |
| art-kit P8 failed build | done | `campusArtRender.ts:104` | `fromModels` wraps the build, observer and first frame: on a throw it calls `dispose()` and disposes any scene mesh made since the start (a mesh made before it reached a list), then rethrows. Nothing is hidden yet, so the greybox shows. |
| art-kit P6 `?voxels=1` box + skin | skipped | `levelBuilder.ts` `hidePieces` | Not small: the voxel split runs in `prepare`, before the art loads, and keeping a skin-hide box out of it means touching `src/voxel` or losing the box when the art fails. Voxels are retired (comparison flag, off by default). |
| art-kit P7 detail pass on art boxes | done | `levelBuilder.ts:62` `BoxPiece.art`, `:508` `mark`, `catalogue.ts:290`, `detailPass.ts:50` | `writeArtBoxes` marks every art box `art: true`; `detailPieces` skips them. It is the one function the drawn dressing and the light shapes (`canonicalLightShapes`) both call, so light parity holds. The greybox hash is unchanged (no art boxes in it). |
| art-check P2 screen counts | already done | `campusS2.test.ts:744`, `campusS3.test.ts:564`, `campusS4.test.ts:774`, `campusS5.test.ts:748` | The screen-count tests already build their `SightWorld` from `bG` (`buildCampus(bG, { dress: false })`): `art-check.md` "P2 fixed". Nothing to change. |
| polish2 1 K8 skip | done | `keepouts.ts:824-833`, `geometry.ts:67` `segEntryObb` | A ray is skipped only when the hull is entered no more than `SKIN_RAY_SLACK` (2 cm) along the ray before the greybox piece; an overhang that crosses the ray first is reported. |
| polish2 2 K9 skip | done | `keepouts.ts:834-859`, `catalogue.ts` overhang `parts`, `campusS4Dress.ts:117` | The plan-footprint skip holds only in the piece's own height band (its box or cylinder, 0.3 round). Above or below it the overhang is checked: by its hull box, or by its listed real parts when the catalogue gives them (segments with a radius; a beam must stay `SKIN_PART_CLEAR` 0.05 m off a part's surface). `basketRun` lists its two 2 cm hanger rods per module (from `hero-s4.glb`'s steel mesh: x 0, z +-0.48, y 0.4-3.0). With that, `las-tray` over B-cage passes (the rods clear it); without the parts the narrowed check flags it on the hull box. |
| art-check P1 dressing cost | done | see "Load time" | Measured first. The K8 camera rays are not the cost (about 14 ms for all five sections), so they are left as they are; the cost was the base pass's keepout tests and greybox scans. |

## Load time (node, `buildCampus(b, { dress: true })`, the loaded desktop)

Profile (`node --cpu-prof`, 4 builds): `blocked` (the K1-K6 capsule loop, `segRectDist` and its corner arrays, the
tube loop), `planRoom`'s `floorAt` / `ceilingAt` scans of all ~1300 boxes per candidate (plus a `slice` copy each),
`backGap` (60 steps x every nearby box) and `BoxGrid.query` (a `Set` and a spread per call). `buildKeepouts` for all
five sections, camera rays included: 8-14 ms.

Changes (output identical, see above):
- `segRectDist` walks the corners in place (no arrays); `geometry.ts:145`.
- `blocked`: a circumcircle reject before `segRectDist` for the capsules and the cover rule (`keepouts.ts:685`); a
  bounds reject per tube (`Tube.bb`, `keepouts.ts:748`).
- `backGap`: only collide boxes within reach of the 0.3 m search (`keepouts.ts:577`).
- `BoxGrid.query`: a per-query stamp instead of a `Set` (`keepouts.ts:181`).
- `planRoom`: `floorAt` / `ceilingAt` read the boxes over the point from the keepouts' grid plus any box written since
  (`dressRules.ts:267`), not every box.

Same machine, the two bundles run alternately, 6 builds each, 3 rounds (ms; the first build of each run is cold JIT):

| Build | 2276483a | artpol |
| --- | --- | --- |
| Cold (first) | 1098 / 1144 / 1884 | 754 / 1115 / 824 |
| Warm (builds 2-6) | 695-2891, typically 720-900 | 276-497, typically 300-400 |

The dressing cost per load is about halved cold and cut by about 60% warm. Remaining: `blocked` itself (~70 ms a
build) and the base pass bookkeeping; not worth more now.

## Tests

`npx tsc --noEmit` clean. eslint on every changed file clean. Single vitest files, each under an `sr-slot` lock:

| File | Passed |
| --- | --- |
| campusArtKit | 13 |
| campusDressRules | 29 (25 + 4 new) |
| campusArtGameplay | 53 |
| campusArtLight | 5 (a real bake) |
| campusArtRender | 3 |
| campusS1Dress / S2 / S3 / S4 / S5 | 13 / 12 / 12 / 13 / 6 |
| campusS1 / S2 / S3 / S4 / S5 | 51 / 39 / 32 / 41 / 29 |

The first gameplay run, before `basketRun` listed its rods, failed S4 items (6) and (8-10) on
`K9: skin basketRun within 0.3 of laser las-tray`: the narrowed K9 check measured the hull box over the band. Listing
the rods (the real geometry) cleared it.

New tests: `campusDressRules.test.ts` "artpol: mount, long legs, skin reach" (P2: body-height vs 1.9 m; P3: a +-100 m
route and beam crossing the section are kept, one passing by is not; polish2 1: a proud skin's ray skipped, an
overhang-first ray reported; polish2 2: a beam over the plan skipped in the band, caught above it, and measured by
listed parts when given); `campusArtKit.test.ts` writeArtBoxes (every art box `art`, the detail pass leaves it bare);
`campusArtRender.test.ts` (a build throwing in the caster hook leaks no mesh or material and hides nothing).

No e2e (not asked). Not touched: `sectorMode`, `src/game/sectorGuardFreeze*`, lamp shader files, `scripts/perf.mjs`,
`src/net`, `src/voxel`. No PROTOCOL or save change.
