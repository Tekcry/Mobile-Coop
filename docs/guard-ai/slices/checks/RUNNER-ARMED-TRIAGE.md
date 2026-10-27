# guard-ai runner-armed: triage of head 442458ff7
Owner: Guard AI Build. Status: current.

Three failures: CI unit, laptop e2e-enemies, laptop e2e-modes (run 20261026T025820-...-f574, both reran red).

## 1. CI `tests/weapons-audio.test.ts` "every guard ... a gun": `runner: expected undefined to be defined`
- Cause: game data gap from this PR. The test (`tests/weapons-audio.test.ts:58`) wants a `GUARD_GUN` sound for every
  kind with a `weapon`; the runner got one (`src/config/enemies.json`) but `GUARD_GUN` (`src/audio/weapons/guns.ts:57`)
  had no `runner`. In play he fell back to `'rifle'` (`src/audio/gameAudio.ts:79`), not the grunt's sound.
- Fix: `runner: 'ak'`. He carries the grunt's weapon block verbatim and the same `rifle` model (brief Q3 "rifle", A3),
  so he sounds like the grunt.

## 2. e2e-enemies runner: `he presses in while he fires (13.8 -> 13.8 m)`
- Cause: test bug (the scenario's lane). `scripts/e2e-enemies.mjs` spawned him at (8, 9) on "the sniper's lane", but
  the factory floor conveyor `b.block(4, 8.6, 10, 1.0, 0.9)` (`src/world/maps/warehouse.ts`, the floor contents; x -1..9,
  z 8.15..9.05) stands across x 8 and (8, 9) is inside it. `EnemyManager.spawn` snaps to the nearest walkable cell
  (`src/ai/enemyManager.ts:2017`), north of the conveyor (z ~9.8, hence d0 13.8 not 13). He sees and fires over the
  1 m conveyor, but the attack press (`src/ai/enemy.ts` `case 'attack'`, `away`) is a straight 2 m step, as an
  aggressive guard's is; `move` slides along the blocked axis (`tryMove`), so he never closes. The sniper never needs
  to walk at the player, so the lane looked clear. The game matches the brief (press "as an aggressive guard does").
- Fix: the runner scenario picks a clear lane the way the enforcer scenario does (`nav.lineClear([x, 7], [x, -4])`),
  spawns at (lx, 7) (11 m, above engageMin + 3 = 7), and prints a per-step brain trace when the press assert fails.
  Expected close over 8 s ~3-4 m (walk 1.3 x 0.3-0.55, half of it forward); the assert (> 2 m) is unchanged.
- Note (not fixed, pre-existing for every aggressive guard): the press never routes round a waist-high obstacle in
  front of him; he strafes and fires from behind it. Polish candidate if Michael wants it.

## 3. e2e-modes mission: `interact prompt near termA ("")`
- Cause: test bug, pre-existing on master, not this PR. Since G5 (`d2bb25db9`, 2026-10-20, the hold-A action menu)
  `GameState.updateInteract` (`src/game/gameState.ts` ~1336) clears the centre prompt whenever no team move is active;
  the item in reach is a context menu row (`contextMenuStep`, ~1460 `m.add(ITEM_KIND, 'use', -1, label, it.holdTime)`).
  G5 updated several suites but not `e2e-modes` (LEGACY; its last edit is `f4252d2da`, 2026-10-19, before G5). No
  laptop run in `runs/` (362 folders) ran e2e-modes before this one. The PR touches no `src/game` file.
- Fix: the assert reads the action menu rows (`g.ctxMenu.opts`, as e2e-sectorops / e2e-takedown do) for
  "Hack terminal". The hold-A hack and the A tap on the cache already match G5 (A down opens the list on row 1, a hold
  row fills while held and runs when full, a tap runs row 1; `src/game/contextMenu.ts` `step`).
- Unverified past the prompt (the suite stopped there): if a guard offers a takedown at a terminal, row 1 is the
  takedown, not the hack. Watch "holding A hacks termB" on the rerun.

## Doc line for the lead (`docs/systems/audio.md` ~127)
"`GUARD_GUN` maps the armed archetypes (grunt AK, ..." -> "(grunt and runner AK, ...".

## Checks
`npm run typecheck:fast` clean; `npx vitest run tests/weapons-audio.test.ts tests/enemyArms.test.ts
tests/runnerArmed.test.ts` 25/25; `node --check` on both e2e scripts. Laptop rerun: e2e-enemies, e2e-modes,
e2e-levels, plus e2e-weapon-audio (the `src/audio/` change).
