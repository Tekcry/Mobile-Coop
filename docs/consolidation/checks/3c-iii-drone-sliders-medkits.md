# Check: 3c (iii) tri-rotor drone, custom difficulty sliders, carried medkits (2026-10-18)

Verdict: **PASS**. Uncommitted tree on `integrate/consolidate`, 73 files (1 deleted, 1 new log).

## Results
1. Diff review and leftover grep (`src/ tests/ scripts/`): clean. No player-drone code (remaining `drone` hits are the
   enemy `droneOp` / `ReconDrone`, its archetype entry and bark, music text, and the v8 migration / sanitizer / test).
   No `customDifficulty` outside the old-record test, no `CustomDifficulty`, `clampCustom`, `presetSliders`,
   `basePreset`, `WireCustom`, `setCustom`, `customSummary`, "Custom base", `MedkitController`, `giveMedkit`,
   `addKit`, `SELF_TARGET`, `MEDKIT_HOLD`, `medkit` action / bind / move mode / cmove kind / pickup kind. `dc` / `mk`
   hits are unrelated locals (`navGrid`, flash gadget distance, `pings.ts`). `'medkit'` stays only as the local
   station-heal sound event (`sfx.pickup('medkit')`) and the bunker device geometry, both kept on purpose per the log.
2. Difficulty table: only `medkits` removed; every other number identical for all four levels.
3. Move state / wire: `medkit` was the last `MOVE_MODES` entry, so no index moved; `tests/moveState.test.ts`
   (ground 0, wall 1, takedown 16) passes. Host and client share the one table. `PROTOCOL_VERSION` 13.
4. Save / settings: `SAVE_VERSION` 9. Literal v8 save with a `drone` preset drops the gadget and the preset default
   comes back; the sanitizer now accepts only `GADGET_IDS` (all default presets use valid ids). Literal old settings
   record with `customDifficulty` and a `medkit` key loads without them. v1-v7 chain tests still pass.
5. Protected paths unchanged. `npm run check`: lint 0 errors (41 pre-existing warnings), 129 files / 1465 tests pass,
   build ok.
6. E2E (port 4191, `E2E_JOBS=2`): smoke, e2e-gadgets, e2e-mouse, e2e-missions, e2e-enemies, e2e-bunker ok.
   Failed in the batch, all passed solo: e2e-combat ("X starts reload", the flake already noted at loco 20b),
   e2e-course (client `player` undefined in `moveClient`, timing), e2e-pad (known flaky, Controls screen step),
   e2e-netmove (known flaky).
7. e2e-coop solo: run 1 and 2 failed at "client strike denied"; run 3 passed the whole suite, including the new
   blocks: difficulty (host Realistic reaches the client lobby read-only, both run p 1.3 / t 0.8 / Realistic) and the
   wall station (host heals the client 50 -> 90, mirrored, spent on both pages).
8. Legacy (`--legacy`): e2e-progression (with the Deploy focus fix), e2e-cosmetics, e2e-clear all pass.

## e2e-coop "client strike denied" (pre-existing, not merge-related)
Recorded at locomotion 20b before the consolidation (2 of 2 solo fails); this batch does not touch the strike path.
The test calls `strike.begin(skd)` on the client without checking the return value, then waits 5 s for
`count.denied` to rise and `active` to clear. Any reply the host sends (noTarget, rate, busy) or the client's own
0.4 s reply timeout raises `denied`, so a timeout most likely means `begin` returned false: the client's previous
strike (or a queued re-strike; the first strike's log shows `started: 2`) was still active, or `canStart()` failed
(weapon draw phase, not grounded). The test waits for the host's record to clear, not the client's strike.
Likely fix (test only): before the denied attempt, wait until `!strike.active && strike.canStart()` on the client,
assert `begin(skd)` returns true, and on timeout print the client's `active / t / approved / count` and the host's
`lastCommit`.

## Non-blocking notes (no fix needed for this batch)
- Pad X held past 0.4 s while not aiming now does nothing, so a slow X press loses the reload. This is what the log
  says ("X hold freed", G98), but you could make a hold that is not aiming reload too. Not covered by any test (listed
  under lost coverage).
- `tests/settings.test.ts` line 59: `});describe(` needs a line break. `src/input/gamepadSource.ts`: `}` and
  `else if` sit on separate lines. Formatting only.
- `useWallMedkit` shows "Health full" when the local player is down. It can only be reached from a test, because
  using a station needs a live player.
- A client healed at a station gets no heal sound or feed line; only the host emits the local `pickup` event.
