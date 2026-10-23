# e2e-sectorops part 6 fix 2 (laptop GPU run at c92fc53b)

Failure: `the 3 s hack opens C2's card door (["objective",true,true])`, `scripts/e2e-sectorops.mjs:1706`.

## Cause (test stale, game right)
- S2 guard #7, the facilities officer (`src/world/maps/campusSectors.ts:114`), spawns at (-6.5, 4.4, 2.9) facing yaw 0,
  with the patrol (-6.5, 2.9) <-> (-2.5, 4.2), waits 28 / 6. That is exactly route 0's `obj` point (index 18), where the
  test stands to hack the BMS terminal (-6.5, 4.4, 4.3).
- Part 6 freezes the guards (`enemyMgr.update = () => {}`, line 1610), so #7 never leaves the desk. The player is
  teleported onto him, from behind (both face north). `TakedownController` still computes its offer each step, so the
  context menu (G5, CT order) lists "Grab character" as row 1 above "Hack". Holding A opens the list on row 1 (a row with
  no hold time), and the release after 3.4 s runs the grab, not the hack. The phase stays `objective`.
- Not caused by the E1 / E3 / E4 / E5 / E6 / lips merges: the campus has no desks or keypads (`kp-fac` is not built,
  slice2-build L15), and this assert never ran green since slice 2 ("unsure until run: the hack button hold at the BMS
  desk").
- In play a player hacks while #7 is at his other stop, or takes him down first. The game behaves as designed.

## Change (test only)
- `scripts/e2e-sectorops.mjs` (before the route walk, ~line 1689): find the S2 guard standing on (-6.5, 2.9) on L1,
  assert he is there, move him to his patrol's other stop (-2.5, 4.2), yaw 0 (where a player times the hack).
- After the reach assert (~line 1714): new assert that no takedown is on offer and the context menu's row 1 is "Hack"
  (prints the offer and the row labels on failure).
- `src/` unchanged: no fresh build needed (a test-script-only change keeps the c92fc53b build valid).

## Tests
- `node --check scripts/e2e-sectorops.mjs`: ok.
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run tests/campusS2.test.ts tests/contextMenu.test.ts`: 2 files, 49 tests passed.
- No unit test added: the cause is test setup, not pure logic.
- e2e not run (the lead reruns `e2e-sectorops` part 6 on the GPU).
