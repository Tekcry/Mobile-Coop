# guard-ai runner-armed: re-check of the triage fix round (442458ff7..13cf2b9c9)
Owner: Guard AI Build. Status: current.

Checker: fresh Opus 5.5 re-checker. Head checked: 13cf2b9c9 (PR #531). Each triage claim was checked against the
code, not taken from `RUNNER-ARMED-TRIAGE.md`.

Verdict: PASS

## Checks run
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/weapons-audio.test.ts tests/enemyArms.test.ts tests/runnerArmed.test.ts`: 3 files, 25/25.
- `node --check scripts/e2e-enemies.mjs`, `node --check scripts/e2e-modes.mjs`: both OK.
- No e2e run here (laptop queue only); the rerun of e2e-enemies, e2e-modes, e2e-levels and e2e-weapon-audio is pending.

## 1. CI `tests/weapons-audio.test.ts`: confirmed, fixed
- The test maps every `enemies.json` kind with a `weapon` to `GUARD_GUN` (`tests/weapons-audio.test.ts:58`). The
  runner now has a weapon block (`src/config/enemies.json:59-70`) and `GUARD_GUN` had no `runner`.
- His block is the grunt's exactly (`src/config/enemies.json:59-70` against `:13-23`: damage 7, rpm 420, burst 3-6,
  pause 0.9-1.8, spread 3.2, range 34, the same tracer), so `runner: 'ak'` (`src/audio/weapons/guns.ts:58`) matches the
  grunt. Without it he fell back to `'rifle'` (`src/audio/gameAudio.ts:79`); now he sounds like the grunt.

## 2. e2e-enemies "he presses in while he fires (13.8 -> 13.8 m)": a test setup bug, not a hidden gameplay bug
- Geometry confirmed: `b.block(4, 8.6, 10, 1.0, 0.9)` (`src/world/maps/warehouse.ts:325`) covers x -1..9, z 8.1..9.1,
  0.9 m high; the old spawn (8, 9) is inside it. `EnemyManager.spawn` snaps to the nearest walkable cell
  (`src/ai/enemyManager.ts:2017`); the north edge (z 9.1) is nearer than the south (z 8.1), so he stood behind it at
  z ~9.8: from the player at (8, -4) that is the 13.8 m reported.
- Why he did not close: the attack step (`src/ai/enemy.ts:3375-3383`) is a straight 2 m goal point (`goalPt`, no nav
  path); `move` (`src/ai/enemy.ts:3863-3934`) steers straight at it and `tryMove` only slides along an axis, so the
  conveyor stops the forward component. In range with sight (13.8 < engageMax 18) he stays in `attack`
  (`src/ai/enemy.ts:3364-3368`), firing over the 0.9 m block.
- Is that a gameplay bug the new lane hides? No, not one this PR adds or the brief asks to fix. The press is the
  aggressive guard's press by the brief's own words (brief step 3, "presses in like an aggressive guard",
  `ARCHETYPE.runner.pressIn`): `press = P_AGGRESSIVE || runner` feeds the same `away` term, so every aggressive guard
  already stops at a waist-high block in his fight. The armed runner standing behind a 0.9 m conveyor firing over it is
  how every armed guard fights. His run in (out of sight or past 21 m) still goes through `chasePoint`. No live map
  places a runner (brief "Facts"). Routing the press round low obstacles is the triage's noted polish candidate for
  all aggressive guards (Polish 1), not a fix for this slice.
- The new lane search is sound:
  - Deterministic: the static warehouse nav, scanned x -2..22 in order, first `nav.lineClear([x, 7], [x, -4])` wins
    (`scripts/e2e-enemies.mjs:209-213`). It is the same search and the same spawn / player spots the enforcer scenario
    uses on master (`scripts/e2e-enemies.mjs:131-136`), which passes on the laptop runs ("he pushes forward
    (11.2 -> 8.4 m)" across `C:/NightShift/scratch/runs`), so the lane exists and is about 11 m long.
  - It cannot pass without the runner moving: the player is teleported to (lx, -4) and stands still (the scenario runner
    calls `t.reset()` before each scenario, `scripts/e2e-enemies.mjs:66`, which releases input), and `d1 < d0 - 2` is
    measured on his own feet. If no lane is found, `lx` stays 8 and the old failure comes back rather than a false pass.
  - It exercises the press: spawned alerted in sight at 11 m (< engageMax 18, > engageMin + 3 = 7), he goes straight
    to `attack` (`usesCover` false) and presses until 7 m. Expected close in 8 s at 0.3-0.55 x 1.3 m/s on the
    diagonal step: about 2.5-4 m, over the 2 m bar. The unit test `tests/runnerArmed.test.ts:162` ("he presses in
    while he fires") pins the press itself.
  - The trace prints on a press failure only (`scripts/e2e-enemies.mjs:238`), useful if the laptop rerun is red.

## 3. e2e-modes "interact prompt near termA": stale since G5, the new assert is right
- G5 `d2bb25db9` (2026-10-20 06:34) is in the PR's base 29f03b6c0 and on master; `scripts/e2e-modes.mjs` was last
  edited on master by `f4252d2da` (2026-10-19 09:23), before it. The PR changes no `src/game` file.
- Since G5 `GameState.updateInteract` sets the centre prompt to null whenever no team move is active
  (`src/game/gameState.ts:1336-1339`), so `.hud-interact` reads "" for any item in reach on master too: the old assert
  could not pass after G5.
- `contextMenuStep` refills `ctxMenu` every step whether A is down or not (`src/game/gameState.ts:1422-1468`,
  `begin` / `add` / `end`), adding the item in reach as `m.add(ITEM_KIND, 'use', -1, label, it.holdTime)`. The
  terminal label is "Hack terminal" with a 3 s hold (`src/game/modes/missionMode.ts:35-36`). Reading
  `ctxMenu.opts.slice(0, count)` before pressing A is the same pattern e2e-takedown (`:124`, `:202`) and e2e-sectorops
  (`:1813`, `:2119`) use.
- Later steps work with the menu (`src/game/contextMenu.ts` `step`):
  - Holding A at a terminal: the press opens the list on row 1 in the same step; a hold row fills `holdT` while A
    stays down and runs at 3 s; `sim(3.4)` covers it. The run goes through `ctxRun` ITEM_KIND to `onUse` or
    `mode.onInteract` (`src/game/gameState.ts:1512-1515`), the same call as before G5. The "done" assert is unchanged.
  - The cache tap: `press(page, BTN.A)` holds A for exactly one input poll (`scripts/e2e-lib.mjs:277-306`). A down
    opens the list on row 1; the release on the next poll runs it ("Take intel", hold 0).
  - Row 1 is the item as long as no takedown offer and no closed door faced within 1.6 m come first
    (`doorMenuCandidate`, `src/game/gameState.ts:1535-1542`). The nearest warehouse doors (`warehouse.ts:392-397`) are
    over 4 m from the three stand points (termA 6.1,16.8; termB 23.5,-16.6; cache 15.9,16.3), and the squads start
    unaware, so row 1 should be the hack or the cache.

## FIX
None.

## Polish (not blocking)
1. The press never routes round a waist-high block in front of him (every aggressive guard, pre-existing): a follow-up
   for Michael if he wants pressing guards to step round low cover (the triage's note).
2. `scripts/e2e-modes.mjs:58-59` passes if "Hack terminal" is any row, but the hold acts on row 1. Asserting
   `opts[0].label` would make a guard's takedown row on top fail at the prompt line, not at "holding A hacks".
3. `docs/systems/audio.md:127` still lists "grunt AK" only; the triage's doc line ("grunt and runner AK") is for the
   lead.
4. `src/audio/weapons/guns.ts` is outside the brief's owned-file list (brief "Files"); the one-entry change is needed
   for the CI test, so note it in the PR body.
