# Polish batch 2 check (P2-2, P2-3, P2-4), merged afefe329 (base a763ac39)

Checker: fresh Sonnet 5.5, read only. No e2e run (the laptop runs e2e-ctcourse:2 and :4).

## Verdicts
- P2-2 (9a48f512): PASS
- P2-3 (097eb946): PASS (lead rulings applied: derived collider-count asserts, A8 side step-on across the first tread only)
- P2-4 (1fd50f3c): PASS

## Blocking items
None.

## Should-fix
None.

## Findings per slice
- P2-2: `scripts/e2e-ctcourse/a3OfficeRange.mjs:214-237` sits after the host two-shot assert and before the kill; no existing line changed, no waitSim added, no src change.
  - It calls `g.weapons.onRay` (the hook `CoopClient` installs, `src/net/coopClient.ts:202-207`) along the camera axis as the host's `:208` shots do.
  - Asserts: client `ctDev.ricochets` +1 exactly, active `vfx.particles` rise, a ray at y-1.5 leaves the count unchanged (teeth), host camera online, host `security.ricochets` unchanged.
  - `ctDev.cams`, `ricochets` and `ricochetRay` (`src/game/ctDevices.ts:224,327,334`) exist and match the reads. `node --check` ok.
  - The optional host door-unlocked asserts are at :186 and :472.
- P2-3: rails are collision only.
  - A4: `a4GoodsShed.ts:96-100`, `:719-727`; A8: `a8Strongroom.ts:166-170`, `:970-979`. Both use `kit.handrail` per segment, copying A6's loop (`a6PumpHouse.ts:639-645`).
  - The test asserts `visible === false` and `noLedge` for all 18 (A4) and 26 (A8) boxes.
  - No greybox, lamp, circuit, guard or device edit. No `*.light.json` or bake file in the diff.
  - Teeth hold: geometry, no-gap, foot walk, centre and edge lanes, step-off blocked from the third tread, and the same probe against the list without the rails is clear.
  - Without the rails `toHaveLength(18)` / `(26)` fail. `soloJumpThreats` stays `[]` with a crate case that bites. A8 x 132.25, z 62-75 is clear.
  - Existing asserts edited: only the derived-count ones (A4 :190, :972, :1018, :1030, :1034, :1122; A8 :1421, :1451) plus the two allowed titles/selections (A8 :1465, :1857). No literal number edited.
- P2-4: the A7 and A6 test bodies were restructured into shared window lists. Every existing expectation is kept with the same `toEqual([])`. No set file touched.
  - A7 `clearWindows()` (15 windows) feeds both the old test and a new teeth test (`a7DataHall.test.ts:1070-1111`), which plants a 0.03 m cube per window and expects exactly it found.
  - A6 `a6PumpHouse.test.ts:989-1048` plants one per mark, device/switch/lamp point, plate column, cage door opening and leg-up floor window.
- Fragment `changes/feature-marlow-polish.md`: 4 new lines, one per slice (P2-1 included), 0 conflict markers.
- No wire, protocol or save change in these slices; no hot path touched (set-build code and tests only).

## Polish list
- A8: a side step-on to the stair reaches only the first tread (rail starts at z 67.85); the brief asked for two. Accepted by the lead.
- A6 teeth (`a6PumpHouse.test.ts:1021-1048`) probe the shared predicates (`overlap`, `inside`, `inPlateColumn`) with a planted cube, not the `level` list itself. They bite on a wrong predicate window but not on a skin-list change. Fine for a dressing test.
- P2-2 particle-count assert would be flaky only if the vfx pool were full of active particles (unlikely at that point of the walk).
- Rail starts snap to the kit's 0.05 m grid: A4 0.18 m and A8 0.02 m past the third tread's exact start.

## Commands run
- `npx tsc --noEmit -p tsconfig.json`: exit 0, no errors.
- `npx vitest run tests/ctcourse/a4GoodsShed.test.ts a6PumpHouse.test.ts a7DataHall.test.ts a8Strongroom.test.ts`: 4 files passed, 248 tests passed, 0 failed.
- `node --check scripts/e2e-ctcourse/a3OfficeRange.mjs`: ok.
- `git diff a763ac39 afefe329` over the scripts, set files, tests and fragment (read in full).
