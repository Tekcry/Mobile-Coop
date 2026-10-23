# LR16-4 check: the S2 reception panel as an untimed breaker board

Checker: Sonnet 5.5. Branch feature/sector-redesign-lr16-4 @ eb2c62c2 (base f85ef736). Brief: `docs/sector-redesign/briefs/LR16-4-board.md`.

## Verdict: PASS

No must-fix.

## Checked
- Data: the panel is gone from `S2_SWITCHES` (6 switches left); `S2_BOARDS` has one board at (-8.4, 0, -28.5), yaw -PI/2, groups `[S2_GROUPS.atrium]` (50), no `window`; `campusOps.ts` appends it last (`board-2`), so `board-0` (S4 yard, 75) and `board-1` (S5 garden, 84, `e2e-sectorops.mjs:3385`) keep their ids. Item total 196 (`sectorItemScope` green). Grep of `switch-<n>` / `switches[<n>]` in scripts and tests: only `switch-0` (S1) and warehouse indices; none past S1 on campusOps.
- Reachable on the nav grid: the new assert in the campusS2 nav test (within 1.1 m of a nav cell) passes on the real layout.
- Guard relight path: `StealthSystems` board `cut` sink reports a breaker fault (`lightsOut(.., group)`) for any untimed board; `breakerHost` resolves the board via `cutBoard`. `campusS2Board` tests 1-2 exercise it on real campusOps data (fault at the board, #1 gets `resetBreaker` to the board, `breakerReset` -> `cut[k]` 0, 4 lamps on, label, `lightSwitch {on:true}`). #1 sees his own room go dark by the room rule in `lightsOut` (`campusS2.test.ts:575-615`, panel in his room).
- Timed boards unchanged: yard / garden keep `window` 20, timed, refuse the guard (test 4 asserts real ids 0, 1, 2).
- Tests are not tuned: they read `campusOps.build` data, real group ids, real positions; the shot-pendant case destroys a real lamp through the registry.
- Light parity: the board cut runs `boardChanged` through the same `reg` lights registry as switches; no new item kind (`'switch'` item as before), so the co-op mirror and wire are unchanged. No `PROTOCOL_VERSION`, save, `src/ai`, `src/net`, `src/game` edit (diff touches only `campusS2.ts`, `campusOps.ts`, tests, e2e leg (d), docs).
- e2e leg (d): `node --check` OK; read it. `k` from `layout.boards` (group 50, no window), asserts no switch on group 50, 4 lamps, #1 > 9 m; uses `board-${k}`; 25 s of 0.5 s steps; reads `breakerGroup` at 0.5 s, nearest approach, relight time, `stealth.boards.cut[k] === 0` after the loop. Sound; `cut1` is declared before the loop and set after it (harmless init).

## Runs
- `npx tsc --noEmit`: clean.
- vitest (maxWorkers 2, slot lock): campusS2, campusS2Board, breaker, campusS4, campusS5, sectorItemScope, sectorIsolator, guardRelight, sectors, campusRuntimeNav: 10 files, 193 tests, all pass. No e2e, build or full run.

## Builder's deviations
1. `tests/breaker.test.ts` one-line lookup (`lay.boards` for the panel): accept. Required, and the numbers it asserts (11.95 m path) are unchanged because the position is.
2. No (d2) takedown-at-the-board e2e leg: accept; the S2 part has no takedown helper. The "takedown at the board leaves the atrium dark" claim rests on #255's own tests (`guardRelight`), not on a campusS2 test. Lead: list (d2) for a later slice if wanted.
3. #1 faces the panel in the unit test: accept, with a note. The test manager has `rooms: []`, so the witness rule falls back to sight, which needs the facing; in the real game #1 (yaw 0) is in the room whose pendants went dark and sees it by the room rule, covered by `campusS2.test.ts`. The unit test proves the walk and relight, not the witness choice.

## Polish (optional)
- `campusS2Board` could give the stand-in manager the real `rooms` so #1 keeps his real yaw 0 and still witnesses by the room rule.
- `tests/campusS2Board.test.ts` test 1 asserts the `lightsOut` args twice (computed and literal); keep the literal only.
- `docs/sector-redesign/SPEC.md` "Lighting rules": the added sentence makes the line long; wrap it.
- Greybox/dressing around the board mesh vs the old switch not re-checked visually (the art-kit hash test was already stale, per the build report).
