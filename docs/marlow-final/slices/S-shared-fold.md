# S-shared-fold - the set builders' "Requests for shared files" folded in

Date 2026-10-23. Not committed. Edited only: `src/world/lighting/marlowCircuits.ts`, `docs/marlow-final/LIGHTING-PLAN.md`,
`docs/marlow-final/sets/a3OfficeRange.md`, `a4GoodsShed.md`, `a5Substation.md`, `a6PumpHouse.md`, `a7DataHall.md`, and this file.
Set doc camera ranges (14 m, job lead) left as they were.

## Requests
| Slice | Request | Result |
| --- | --- | --- |
| S3 1 | `tests/ctcourse.test.ts` group 34 exemption | Skipped: already there (line 183, `set === 'a3OfficeRange' && l.group === 34`). |
| S3 2 | A3 switch hints | Applied: `a3-sw-corr` (78.6, 12.7); offices 1-3 now (79.7, 6.0) / (87.45, 7.65) / (93.0, 8.65) (a small `A3_OFFICE_SWITCH` table; the row builder no longer uses 72 + 7n + 1.2, 8.1). |
| S3 3 | `scripts/e2e-times.json` | Skipped (not mine; after the first full e2e run). |
| S3 4 | `a3OfficeRange.md`: D2 door x, second hop, lobby downlight, switch points | Applied: door x 91.4-92.6 (sections 1.1, 4, A3-D2 with the reason), spacing 3.75 m, second hop 9.6 m / 5.7 s (three places), offices-route walk 5.3 m, downlight (77.75, 8.0) r 6.0 i 1.5, switch points (table and lure text). |
| S3 5 | `src/ai/patrol.ts` waits 0 | Skipped (comes with guard-ai). |
| S4 a | A4 switch hints | Applied: floor (79.4, 37.85), sec (101.2, 13.3), aisles (76.3, 28.0), mezz-w (87.0, 47.7), mezz-e (105.0, 47.7). `a4-floor` lure stop unchanged. |
| S4 b | `MARLOW_ZONES` A4 row | Kept: `tests/marlowLightingCircuits.test.ts` ("zones: every set at standby") needs one zone per `MARLOW_ROOMS` key, so the row cannot go. |
| S4 c | e2e-times | Skipped. |
| S4 d | `a4GoodsShed.md` (C7: stacks, spots, D2 timings, pass-through wait; SVGs) | Applied to the doc text: stacks N z 35.1-35.9, S z 30.1-30.9 (0.7 m behind each man), crouch spots (80.4, 36.2) / (79.6, 29.8) at 1.84 m (`overCover`), D2's built route and `loop` clock (no pass-through wait), 10.0 m each way, away about 24 s, switch points, lure distances, high-bay radius 9 / i 1.15, A4-C7 / A4-C8 rows. The two plan SVGs (`plans/a4GoodsShed-*.svg`) are not in the owned list and were not touched. |
| S5 a | `MARLOW_POCKETS`: `a5-pen2` -> `a5-landing`; `a5-pen1` box | Applied exactly as written. |
| S5 b | 51 fitting text; `a5-sw-apron` (69.7, 36.0); `a5-sw-inner` (45.8, 40.7) | Applied. |
| S5 c | LIGHTING-PLAN 3 A5 | Applied: 3 bulkheads (inner wall, south wall, switchroom face) + switchroom panel; pockets `a5-landing` and `a5-pen1` with boxes and reasons. |
| S5 d | `a5Substation.md` | Applied: kiosk box, flood position / cone / radius, lamp positions and radii, switches, no 6 m slab and `maxY` 9.9, panel jam spot (60.5, 35.0) (17.5 m), K -> R2 detour, lure range 50 from R4, W and K (21.9 m), switchgear run x 40.3-41.1, wait 0.1 and cycle 42.0 s with the built timeline. |
| S5 e/f | patrol.ts, e2e-times | Skipped. |
| S6 a | `src/world/maps/ctcourseGreybox.ts` (`coopDeck` gaps) | Skipped (not mine). |
| S6 b | A6 pockets: `a6-sump`, `a6-pump3`, add `a6-westfloor` | Applied. `a6-westfloor` reason "The west gallery fittings overhead are tagged out (69)", use "The leg-up spot under the tagged-out gallery fittings" (the request's quote read as the use). |
| S6 c | A6 switch hints; row 61 fitting | Applied: `a6-sw-floor` (63.7, 60.4); `a6-sw-gallery` (56.4, 71.7) y 4.4; fitting "A pendant over the bridge and two bulkheads on the gallery wall". |
| S6 d | LIGHTING-PLAN 3 A6 | Applied: 61 lures to the gallery front by the stair head (both mentions), fittings, `a6-westfloor` added to the pockets. |
| S6 e | `src/ai/patrol.ts`, `src/net/*` host slack, e2e-times | Skipped (not mine). |
| S6 doc | `a6PumpHouse.md` (no explicit item; the report's deviations) | Applied: attendant route with W and waits 0.1, loop 42.35 s, high-bays, 61 pendant and bulkheads, cage light, switch points, gallery switch z 71.7. |
| S7 a | A7: group 70 lamps 6 -> 7; hints `a7-sw-rows` (75.8, 60.4), `a7-sw-aisles` (76.6, 56.0), `a7-sw-plant` (71.6, 55.6); 71 `lure.from` -> [84.4, 60.6] | Applied. |
| S7 b | patrol.ts, e2e-times | Skipped. |
| S7 c | `a7DataHall.md`: lid 2.4-2.5, T1/T2 device y 0 (housing 1.2), plant door z 55.8, lees, plant switch | Applied (also lamp radii / positions, switch points, waits 0.1, cycle 35-41 s). The "C9 is SPEC's C9 row" note needs no text change: the doc's C9 mentions (taught hack, way back) already read as SPEC's rows, and the cam1 / T1 contradiction is already A7-C2. |

## Open item for the job lead (a test I may not touch)
`tests/ctcourse/a7DataHall.test.ts` line 547 asserts `by(70).length` equals `circuitOf(70)!.lamps + 1`, which was written against the old row (6). With the row at 7 it fails ("expected 7 to be 8"). Fix, one line: `expect(by(70).length).toBe(circuitOf(70)!.lamps);` (the test's own title already says 7). Left alone because that file is another agent's.

## Checks
- `npx tsc --noEmit`: errors only in `tests/ctcourse/a8Strongroom.test.ts` (another agent's work in progress: unused imports and one `id` type error); none in my files.
- `npx eslint src/world/lighting/marlowCircuits.ts tests/ctcourse.test.ts`: exit 0.
- `npx vitest run tests/marlowLighting*.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/ctcourse/`: "Test Files  2 failed | 13 passed (15), Tests  2 failed | 392 passed | 1 skipped (395)". Failures: `a7DataHall.test.ts` lamps + 1 (mine: the pin above, not edited) and `a8Strongroom.test.ts` C2 gallery-deck frame (A8 in progress, not mine). No test pinned an old hint value; `marlowLighting*` all pass.
