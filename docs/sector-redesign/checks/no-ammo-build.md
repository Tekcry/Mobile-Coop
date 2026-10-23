# No ammo pickups inside sections - build report (2026-10-23)

Rule (Michael, revised ~10:20): no ammo pickups within sections; a between-section weapons crate refill (once per player) follows in a later slice, not built here.

## Removed (every `kind: 'ammo'` entry; `'ammo'` was the only PickupKind, no mixed pickups; medkit walls and gadgets untouched)
- warehouseS1.ts:105 (2), warehouseS2.ts:42 (1), warehouseS3.ts:56 (1)
- campusS1.ts:112 (2), campusS2.ts:169 (1), campusS3.ts:193 (1)
- warehouse.ts:510 (3), provingGrounds.ts:205 (2), dustDepot.ts:233 (3), embassy.ts:428 (1), mansion.ts:419 (2), port.ts:417 (2), refinery.ts:382 (2)
- Already empty: ctcourse, courselab, kestrel, seclab, studio, bunker. warehouseOps / campusOps just concatenate the S*_PICKUPS lists (now empty).
- The Pickups system, `MapLayout.pickups` and the `Ammo refilled` feed line stay (the later crate may reuse them).

## Check
- New `src/world/mapCheck.ts`: `checkMapLayout(id, layout)` rejects any ammo entry in `layout.pickups` (in-section list); comment says between-section crates use a later separate field.

## Tests
- New `tests/noAmmoPickups.test.ts`: every map in MAPS builds with empty pickups and a clean check; the check rejects a literal layout with one ammo pickup.
- No existing unit test or e2e asserted these pickups. `warehouseS2Light.test.ts:163` has a spot labelled "the ammo" at the old crate position; still a valid light spot, left.

## Results
- tsc --noEmit: clean. eslint on changed files: clean.
- vitest: noAmmoPickups, campusS1-S3, warehouseS1-S3Light, warehouseCoopS1-S3, warehouseDress, detailPass: all pass.
- Not run: full check, e2e.

## e2e coverage
e2e-ctcourse unaffected (empty pickups). Maps that load these lists: warehouse-ops / campus-ops sector suites, e2e-coop, and the legacy Warehouse routes suites (e2e:legacy).

## Changelog
changes/feature-sector-redesign.md: "Ammo pickups removed from inside sections (a between-section weapons crate refill follows; Michael, 2026-10-23)."
