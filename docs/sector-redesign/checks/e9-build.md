# E9-crate part (b) - crate model, placement data, tests, e2e (build report)

Branch `feature/sector-redesign-e9`, on top of part (a) (1dc25681). Part (a) engine / net files are untouched.

## Files
- `src/game/interactables.ts`: the `crate` branch of `Interactables.add` (A108): 0.9 x 0.45 x 0.55 body `#4b5a3a` (y 0.225), 0.92 x 0.06 x 0.57 lid band `#3a4433` (y 0.45), strip 0.5 x 0.08 x 0.02 at (0, 0.3, 0.28) returned as `light`. No collider.
- `src/world/maps/campusSectors.ts`: `crate` on s1-s3. `src/world/maps/warehouseSectors.ts`: `crate` on service / racking / floor. Only `crate` lines (plus a comment line each).
- `src/world/mapCheck.ts`: `checkSectorCrates(id, sectors)` (A109: missing crate, y within 0.3 of start, 1.0-3.0 m in plan from start, >= 1.2 m from every connector `nearAt` / `farAt`). The walkable-cell and yaw rules are in the test.
- `tests/weaponsCrate.test.ts` (9 tests): ledger once per player and restart reset; `crateReserve` cases and a 2000-sample property loop; `applyCrateEvent` (other player, fill, duplicate, rejoin mark, late fill); data for campusOps (3 crates, S1-S3) and warehouseOps (3), rule passes, ids distinct, crate cell and the cell 0.9 m in front of the strip are walkable on the runtime nav grid (`tests/helpers/runtimeNav.ts`); literal bad defs (no crate, 4 m, on a farAt, wrong floor).
- `scripts/e2e-sectorops.mjs` (node --check ok): new solo block after the M9 restart block (3 crates, only service-crate live; drain, use, totals equal loadout, gadgets unchanged, prompt gone, second use does nothing, restart gives back the checkpoint kit and a fresh crate, after C1 racking-crate live); co-op mirror leg at the end of the part-1 co-op block (client mirrors racking-crate, drains, uses, totals, prompt gone, host still offered, host `debug().crates[].used` has the client, second use refused, host restart brings the prompt back); part 6: S1 crate live at the start, after C1 only s2-crate live and one use tops up.
- `scripts/e2e-coop.mjs` (node --check ok): Infiltration leg before the rejoin leg (client mirror of a hand-added `crate-e2e`, drain, use, exact top-up, prompt gone, second use refused, host's own use, ledger lists both); after the rejoin the client's mirror is `spent` and its ammo sum unchanged.
- `changes/feature-sector-redesign.md`: line added.

## A-items
A100 (data S1-S3 + warehouse; live-only-in-section was part (a)), A108, A109 done; A101-A106 e2e legs written (the lead runs them). Brief item 7 (changes line) done.

## Crate points (x, y, z, yaw) and reasons
| Section | At | Yaw | Why |
| --- | --- | --- | --- |
| campus s1 (start 24, -79) | (25, 0, -78) | -PI/2 | verge east fence, 1.41 m from the start, strip faces west to the verge; nav cell walkable; clear of the route (goes west / north) |
| campus s2 (start -20, -32) | (-22.2, 0, -32) | PI/2 | C1 vestibule west wall, 2.2 m from start, strip into the room; > 1.2 m from both C1 doors (x -20) |
| campus s3 (start 7, 4.4, -14) | (7, C2_FLOOR, -15.3) | 0 | glazed bridge south wall, 1.3 m from start, strip to the walkway; both bridge doors > 1.9 m away |
| warehouse service (-20, -24.6) | (-21.8, 0, -25) | 0 | yard south wall, 1.8 m from start, strip faces north to the yard |
| warehouse racking (-14.5, -7.2) | (-15.8, 0, -7.2) | PI/2 | the brief's fire-lobby point; passes the rule (1.77 m from farAt, 2.06 m from nearAt) and the nav |
| warehouse floor (-1.2, 14.8) | (-3.2, 0, 16.4) | PI/2 | office west wall, 2.56 m from start, strip into the office; 1.83 m from nearAt (-4, 14.55); the east door (2, 16.05) and the south door are not blocked |

## S4 / S5 crate table (for the merge with the other branch; not applied here)
Stubs here have S4 start = C3 checkpoint (24, 0, 8) in the dock link (x 20-28, z 0-16) and S5 start = C4 checkpoint (-18, 0, 29) in the colonnade (x -26..-10, z 26..32). SPEC section plan (SPEC.md l.70-90). Verify with `checkSectorCrates` and the nav test after the merge (the real S4 / S5 rooms may differ from the stub shells).
| Section | At | Yaw | Why |
| --- | --- | --- | --- |
| s4 | (25.2, 0, 6.8) | -PI/2 | dock link east wall, 1.7 m from the checkpoint, strip faces west; > 6 m from the C3 near door and 9 m from the far door |
| s5 | (-17.2, 0, 27.0) | 0 | colonnade south wall, 2.2 m from the checkpoint, strip faces north; > 7 m from both C4 doors |

## L-numbered choices
- L1. S4 / S5 stubs are in this branch's `campusSectors.ts` but get no crate here (the lead's scope); `weaponsCrate.test.ts` checks the non-stub sections (names not ending `(stub)`), so campus expects 3. When S4 / S5 land with crates, change the campus count to 5 and drop the filter.
- L2. The co-op mirror e2e leg uses section 2's `racking-crate` and sits at the end of the part-1 co-op block (after the connector cycle), so the host restart it ends with cannot disturb later legs.
- L3. The test also checks the nav cell 0.9 m in front of the strip (yaw faces open floor, A109 last bullet).
- L4. A bug found and fixed during the build in my own code: a `sed` edit truncated `mapCheck.ts` in the first commit; fixed in the next commit (no part (a) file changed).

## Checks
- tsc clean; lint 0 errors (41 pre-existing warnings); vitest on weaponsCrate, crateWire and every campus / sector / warehouse / mapCheck / noAmmo / interact file: 29 files, 423 passed, 3 skipped. No e2e, no build.
