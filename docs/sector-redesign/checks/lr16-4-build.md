# LR16-4 build: the S2 reception panel is an untimed breaker board

Builder: Sonnet 5.5. Base: feature/sector-redesign-lr16-entry f85ef736 (guard-ai #255 on master and in the base). Brief: `docs/sector-redesign/briefs/LR16-4-board.md`.

## Changes
- `src/world/maps/campusS2.ts`: the reception panel switch (-8.4, 0, -28.5) is removed from `S2_SWITCHES`; new `S2_BOARDS: BoardDef[]` (same position and yaw, groups `[S2_GROUPS.atrium]`, no `window`); `BoardDef` type import.
- `src/world/maps/campusOps.ts`: `boards: [...S4 (3), ...S5 (4), ...S2 (1)]`, so `board-0` (S4 yard) and `board-1` (S5 garden) keep their ids and the panel is `board-2`. Item total stays 196 (`sectorItemScope` green).
- `tests/campusS2.test.ts`: switch count 5+6+9+8+9; "the reception panel is a board" (no atrium switch, one board, groups `[50]`, no `window`, section 1, foyer x -30..-8 z < -23); `panel` from `lay.boards` (same room as #1); the board is within 1.1 m of a nav cell (added to the nav-grid test).
- `tests/campusS2Board.test.ts` (new, 4 tests, real campusOps data): the cut reports a breaker fault on circuit 50 at the board; #1 sent to the cut board, `breakerReset` relights all 4 lamps via `switchBack` (cut[k] 0, label "Breaker off", `lightSwitch {on:true}`); a shot pendant stays dark; the S4 / S5 boards keep `window` 20, are timed, a running window refuses the guard.
- `scripts/e2e-sectorops.mjs` (campus S2 part, leg (d) only): finds `board-${k}` (`layout.boards`, group 50, untimed), asserts no switch on group 50, 4 lamps on, #1 > 9 m off; after the cut #1 is sent (breaker task 50), comes within 2 m, lamps back, `g.stealth.boards.cut[k] === 0`. Header comment updated.
- `tests/breaker.test.ts` (outside the brief's list): the "Sector Ops campus on the guards' runtime nav" test found the panel in `lay.switches`; now `lay.boards` (one line). Without it the test failed.
- `TESTING.md`, `docs/sector-redesign/SPEC.md` "Lighting rules", `changes/feature-sector-redesign-lr16-4.md`.
- No wire, PROTOCOL or save change. No `src/game`, `src/ai`, `src/net`, other maps, or ctcourse / Marlow files touched.

## Tests (vitest, maxWorkers 2, slot lock)
- `npx tsc --noEmit` clean; `npm run lint` 0 errors (42 existing warnings).
- campusS2 (40) + campusS2Board (4) + campusS4 + campusS5 + sectorItemScope + sectorIsolator + guardRelight + sectorDesk + sectors + campusRuntimeNav: 10 files, 184 tests, all pass.
- breaker + campusS2 + campusS2Board: 3 files, 71 tests, pass. campusS1, campusS3, polishBatch pass.
- `node --check scripts/e2e-sectorops.mjs` OK. No e2e run.
- Pre-existing, not mine: `tests/campusArtGameplay.test.ts` "greybox at the ART-KIT cut" fails (hash `1303/114/d9289634` vs pinned `acb8cfbb`) with and without this change (verified by reverting the two src files).

## Deviations
- `tests/breaker.test.ts` edited (see above).
- (d2) takedown-at-the-board variant NOT added: the S2 part of e2e-sectorops has no takedown helper (the only `takedown` use is an offer check). For the lead.
- Unit guard-relight test places #1 facing the board (yaw from the post to the panel); the brief said "the desk's way".

## Laptop suites to run
`e2e-sectorops:6` (the campus S2 part, leg (d); `E2E_GPU=1`) and `e2e-coop` (a board item mirrors to the client; item count 196 unchanged).

## Risks
- The leg (d) timing (#1 reaches the board within 25 s sim) is unverified in a browser; the path is the same 12 m as the old switch.
- Board mesh differs from the switch mesh (greybox/dressing around the panel not re-checked visually; the campus greybox hash was already stale).
