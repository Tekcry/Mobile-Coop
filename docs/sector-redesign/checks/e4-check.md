# E4 check - EW8 breaker / timed isolator boards

Checker, read-only. Branch `feature/sector-redesign-e4`, commit 21528f35 vs 95097957.

## Verdict: PASS

Nothing blocking. No parity or host-authority break, nothing unplayable.

## Tests
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/sectorIsolator.test.ts tests/sectorLampSync.test.ts tests/sectorRestart.test.ts tests/sectors.test.ts tests/jammer.test.ts`: 5 files, 92 tests pass.

## Correctness (verified by reading)
- Breaker cut / restore: `IsolatorBoards.use` (src/game/isolators.ts:73-91) cuts every group through `setGroup(g, false)`, and the second use restores them. OK.
- Timed window returns once: `update` (isolators.ts:107-125) restores through `restore`, which zeroes `left[i]` and decrements `running`. It cannot fire twice. `cancel` and `switchBack` also zero the window. OK.
- `lightsOut` on every cut: the sink's `cut` (stealthSystems.ts:85-89) calls `em.lightsOut` at the board. It runs on the host for a client's use too (coopHost.onUse -> it.onUse). OK.
- Shot lamp during a window: `LightRegistry.setGroup` skips `destroyed` lamps (lights.ts:242), so the window's return never relights a shot lamp. OK.
- Jammed lamp during a window: `setGroup` moves only the jam base (`jamBase`), so the flicker is kept and the base is right when the jam ends. OK.
- Board cut, then a wall switch on the same group: `boardChanged` -> `syncGroup` flips the wall switch to "Lights on". Using the switch relights the group, and `followBoards` puts the breaker back to "Breaker off". OK.
- Isolator use during its window: the item is disabled, so `coopHost.onUse` rejects it on `!it.enabled`, and `use` returns `BOARD_NONE` anyway. OK.
- Ids: `board-<i>` and `switch-<i>` are separate strings. coopHost.onUse looks items up by exact id, and nothing parses switch ids by prefix. Labels are at most 16 chars (the wire caps at 24). Board items are added before alarms and doors, so the `MAX_ITEMS` cap does not drop them. OK.
- Host only: `StealthSystems` is built only in the non-puppet branch of gameState, so the client never runs boards. OK.

## Light parity
- Host: lamps change only through the registry, so the light field, the meter and the guards read the same state.
- Client: `setGroup` bumps `reg.version` on a change. `LampSender` sends on a version change (and every 2 s), and `lampState` reads `baseOn`, so a board's cut sets the switched-off bits. The window's return reaches the client on the next fixed step. The test at tests/sectorIsolator.test.ts:161 covers cut and return through the parser: per-lamp `on` and the meter match. OK.

## Restart (A50) and the I5 fix
Normal path is correct: `checkpointReset` -> `resetForRestart` -> `boards.cancel()`, then `startState.apply`, then `syncSwitches` -> `followBoards`.

Edge I5: a window still running when the next section begins is recorded off by `beginSection`'s `take` (sectorMode.ts:305). The same happens on the `CONN_UNLOCK_FAR` path (sectorMode.ts:521): there `take` runs after `cancel` has already dropped the window. Either way a restart leaves those lamps dark. It is recoverable by hand: after `follow`, the isolator reads its groups as off and shows "Power on", and the wall switches show "Lights on". So it does not block. Minimal fix (no wire change):
1. `IsolatorBoards.cancel()`: before zeroing, relight each running window's groups with `reg.setGroup(g, true)`, with no sink call (no cue, no feed). The normal path is unchanged, because `apply` then overrides with the recorded state. The `CONN_UNLOCK_FAR` `take` now records those lamps on.
2. `SectorMode.beginSection` after `take` (kit path): for each board with `left[i] > 0`, mark its groups on in the start state. Add `SectionStartState.markGroupOn(reg, group)`, which sets recorded `0 -> 1` for that group's lamps (leaving shot (2) and flashlight (-1) entries alone).

Add a test: start a window, `take`, run past the window, restart, and expect the groups on.

## Course mode / Marlow Yard
`boards` is optional. The constructor is guarded by `bd?.length`, `update` and `cancel` by `boards?.`, and `followBoards` returns early on null. No change for maps without boards. OK.

## Allocation / TS / text
- `IsolatorBoards.update` allocates nothing: it uses typed arrays and returns early when nothing is running. The builder's alloc test shows 0 B. The return event allocates (`{ on }` and the feed line) only once per window end. That is not per tick, so OK.
- Strict TS is clean. No gameplay read of graphics state.
- Feed text "Circuit restored" and the labels are voiceable. No reference-game names in the diff.

## Polish (non-blocking)
1. stealthSystems.ts:485-490 `boardChanged` calls `syncGroup` (which does not follow boards) and `showBoard(i)` only. A second board sharing a circuit goes stale. Example: breaker A cuts group 4, and breaker B on group 4 still shows "Breaker off". Using B fires a second `lightsOut` and click with no lamp change. Or an isolator window relights a group that a breaker cut, and the breaker stays "Breaker on". Fix: call `this.followBoards()` in `boardChanged` in place of `this.showBoard(i)`.
2. isolators.ts:131-139 `follow` treats a circuit whose lamps are all shot (or a group with no lamps) as cut. The board then sticks at "Breaker on" / "Power on", and an isolator can never start a window again. `syncSwitches` keeps its place when `live === 0`. Mirror that: skip the board when none of its groups has a live lamp.
3. "Circuit isolated" is never seen: the item is disabled during the window, so `nearest` never offers it (on the host or the client). Either keep it enabled with a no-op use, or drop the label.
4. Missing tests: two boards on one group, and a lamp shot during a window staying dark at the return. The code handles the shot lamp (lights.ts:242), but it is not pinned by a test.
5. `fixedUpdate` hardcodes `1 / 60` for the window tick. This matches the fixed step, but passing `dt` would be safer if the step changes.
