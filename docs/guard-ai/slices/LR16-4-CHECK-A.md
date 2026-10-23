# LR16-4 guards relight - fresh check A (host board path, end to end)

Verdict: PASS

Branch `feature/guard-ai-relight` at `fbf32636` (one commit on master `41204e30`). Lens: the board path on the host,
end to end.

## Blocking findings

None.

## What was checked

- **Non-timed board cut -> S15 walk -> relight.** `sink.cut` (`src/game/stealthSystems.ts:102-111`) runs after
  `use` has cut every circuit and `boardChanged` has synced the wall switches off. It calls `lightsOut(x, z, y + 2.5, -1, liveGroup)`, the same y convention
  as `toggle`. `isOff(gr)` is true there (no running window, base off, the wall switch off or a cut board), so
  `EnemyManager.lightsOut` takes the `circuitOut` fault path at the board's point (`src/ai/enemyManager.ts:983`). The
  walk (`Enemy.breakerStep`, `src/ai/enemy.ts:1099`) checks `breakerOff` every step. At the end it calls `reset(gr)`, then
  `cutBoard`, then `switchBack`, then `restore(i, BACK_HAND)`. That runs `setGroup` on every circuit (shot lamps are skipped) and then
  `sink.back`, which goes through `boardChanged`, `syncGroup(on)` and `followBoards`, re-runs `showBoard` (label "Breaker off", enabled, lit indicator)
  and emits `lightSwitch`. The co-op lamp sync reads the registry (`net/lampSync.ts`), so it is host-authoritative with
  no wire change. `cut[i]` is cleared by `restore`. `running` is untouched, because `switchBack` refuses while `left > 0`,
  so the counter cannot drift.
- **Shot lamps.** `liveGroup` skips a fully shot circuit. If every circuit of the board is shot out, the cut is the plain
  S2 look. A partly shot circuit relights only its live lamps (covered by a test).
- **Timed window rule.** `switchBack`, `cutBoard`, `holding`, `isOff` and `reset` agree: while a timed window runs, no
  guard path turns its circuit on. This also holds through a wall switch: before this commit, late discovery could find
  such a circuit `isOff` through its synced-off wall switch and `resetCircuit` it mid-window. That is now closed. A walk
  already going on that circuit ends at its next step.
- **S5 garden / S4 yard timed boards.** `sink.cut` for a timed board still calls `lightsOut(x, z)` (identical to
  master). Their circuits (84, 75) have no wall switches. `isOff` for them was false on master (no switch) and is still
  false: `holding` while running, base on afterwards. The only other way to get `cut = 1, left = 0` is `follow` with
  the circuit dark, and no live mechanism does that to these circuits. Behaviour is unchanged.
- **Restart / unload.** `resetForRestart` calls `cancel()` (the windows are dropped, the circuits come on silently).
  The start state then puts the lamps back and `syncSwitches` runs `follow`, which recomputes `cut`. The guards are
  respawned on a restart, and any walk still alive ends at its next step through `breakerOff === false` once the circuit
  is on. A new map builds a new `StealthSystems` and `em.breakers`. No stale-board walk can act.
- **Maps without boards (Course / Marlow Yard).** `boards` is null: `isOff` returns false for a circuit with no switch
  (as before), and `reset` falls through to `resetCircuit`. No change.
- **Allocation / maths.** `holding`, `cutBoard`, `liveGroup`, `isOff` and `reset` use index loops and
  `readonly number[].includes`, so nothing allocates. `cutBoard` uses `hyp2`. `breakerOff` runs every walk step and stays
  O(boards + lights) with no allocation.
- **Hard rules.** No new `src/net` import, no `Math.hypot`, strict TS clean, no wire or save change.

## Polish

1. **No live map has a breaker board.** `S4_BOARDS` and `S5_BOARDS` are both timed (`window: 20`), and campusOps is
   the only map with `boards`. So the new board relight path cannot be reached in the shipping game today. Wall-switch
   relight was already S15's. The player-visible change from this slice is effectively nil, apart from the
   timed-window guard above, which has no live trigger because no timed circuit has a wall switch. The audit's gap row 10
   ("never relights") was stale for wall switches. TESTING.md line 166 asks the tester to "switch off a hall at ... a
   breaker board", but no breaker board exists in any map, so that half of the walk cannot be done.
2. **`reset` / `isOff` call `cutBoard(group, 0, 0)` (nearest the world origin), not the board the guard is standing
   at** (`src/game/stealthSystems.ts:529, 540`). With two cut boards on one circuit, the guard works board A and board B
   flips. If A also holds a circuit B lacks, A then follows to "uncut" while that circuit stays dark, and nobody relights it. Passing
   the guard's position (or the walk's switch point) would fix it. This needs overlapping board data, which no map has.
3. **`switchOf` prefers any cut board over a nearer wall switch** (`stealthSystems.ts:493`). When a single-circuit board
   follows a wall switch to "cut", late discovery sends the guard to the board, not the switch. The board's
   `switchBack` then puts every circuit of the board back on, not only the one switched off.
4. **Only the board's first live circuit is reported** (`stealthSystems.ts:108`). On a multi-circuit board, a guard who
   sees only the second circuit's lamps is not a witness at the time. Late discovery picks it up later, so this is
   acceptable.
5. **A pre-existing `follow` quirk, now relevant to relight.** Board [4, 6] is cut, then the player turns wall switch 4
   on. The board follows to uncut, circuit 6 stays dark, and `isOff(6)` is false, so neither late discovery nor a walk
   will relight it.

## What I ran

- `timeout 600 npx tsc --noEmit -p .`: exit 0.
- `timeout 600 npx vitest run tests/guardRelight.test.ts tests/sectorIsolator.test.ts tests/breaker.test.ts tests/incidents.test.ts`:
  4 files, 80 tests passed.
- Read `git diff 41204e30..HEAD` in full, plus `src/game/isolators.ts`, the `StealthSystems` board, switch, breaker
  host and restart paths, `src/ai/breaker.ts`, `EnemyManager.lightsOut` / `circuitOut` / `lateStep` / `lateFind`,
  `Enemy.resetBreaker` / `breakerStep`, `sectorMode.beginSection`, the campus S4/S5 board and switch data, the
  spec (lr16-0 audit row 10 and the LR16-4 bullet) and CLAUDE.md "Hard rules" and "Current goal".
