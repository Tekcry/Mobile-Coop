# S9-e2e - slice 9 cross-set e2e checks (revive per co-op surface, ghost run)

Agent: S9-e2e (marlow-final, desktop lane 4191). Files: `scripts/e2e-ctcourse.mjs` (edited),
`scripts/e2e-ctcourse/revive.mjs` (new), this report. No game file changed. Nothing committed.

## 1. Revive on each co-op surface (SPEC 12 "Revive", LD 15) - code done, not run

`revive.mjs` exports `SURFACES` (per set number) and `reviveOn(t, surface)`. The runner calls it after the walks of
sets 1, 2, 6 and 8 (before the holding room), so parts 1, 3 and 4 carry it. Per surface:

1. Budget: if the team's 2 revives are spent, `net.reviveClock.reset()` (test hook only; `freeRevive`). The rule is
   unchanged; the assert is "used went up by one".
2. Client teleported onto the surface, host beside it on the same level; both must be grounded within 0.3 m of the
   surface height (proves there is room to stand beside a downed player).
3. Client downed as the old dock finale did: the host's remote copy, `damageMul 1`, `protectT 0`, 1000 damage.
4. Asserts: the revive item lies within 0.4 m of the surface height; the game's own pick
   `interactables.nearest(hostFeet, 1.8, 'revive')` offers it from the host on the same level; on raised surfaces a probe
   point on the floor (inside the 1.6 m reach horizontally, 4.4 m under) is NOT offered it (the < 1.5 m height rule);
   `reviveClock.remaining` is in (0, 30].
5. The host uses the item (`onUse(it, 'local')`, as the dock finale: the 2.5 s hold is not pressed); the client is alive
   and grounded back on the surface; `used` is +1. A log line prints the item, host, distance, reach, seconds left and the
   probe's offsets.

| Set | Surface | y | Client (x, z) | Host (x, z) | Floor probe (x, y, z) | Source of the numbers |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | A1 yard | 0 | 17, 11 | 18.2, 11 | none (ground level) | `A1-yard` point, yard x 12.3-22 |
| 2 | A2 staging | 4.4 | 33, 18.1 | 34.2, 18.6 | 33, 0, 16.9 (1.2 m off) | `A2_DECK` z 17.5-19.75 (S2-check item 9), lip x 31-35 |
| 6 | A6 gallery | 4.4 | 41.6, 70.3 | 42.7, 70.9 | 41.6, 0, 69.2 (1.1 m off) | `A6_DECK` z 69.6-71.775, lip x 40.8-45.3, rope 43.15, 70.2 |
| 8 | A8 gallery | 4.4 | 107.9, 68.2 | 107.9, 69.4 | 107.9, 0, 68.2 (straight under) | west return x 106.25-109, z 56-75, open edge z 66-70.5 |

Host-to-client distance 1.2-1.25 m, inside the item's reach 1.6 m.

**Old dock revive (finale):** it still matches the layout (`dock` debug point in `facility.ts:696`, same calls), so it is
kept, with two fixes for the new order: it frees a revive first (the A8 gallery revive used one) and asserts used +1
instead of `used === 1`. The end-screen check now asserts `team.revives === revivesDone` (part 4: 2, full run: 5) instead
of 1.

**Ghost ledger (report only):** after every set's walk the runner logs the bay's detections, alarms, knock-outs, kills
and bodies (`__course.state.stats[bay]`). No assert; it is the input for the ghost design below.

## 2. Ghost run with every bonus - design for the lead (not code)

What it means: LD 7.3 bonuses are no alarms, no kills, undetected; G146 100% is no kills, no alarms, every primary
objective. The course has no separate bonus flags: the stats are per bay (`CourseState.stats`) and only the finale (A8)
gets a tier, `rateFinale` 'ghost' = detections 0, alarms 0, bodies 0, no knock-out or kill. "Two-body zero-failure path"
= both players, no retry, no fail branch.

Why not code here: a ghost run must still finish every step (the airlocks refuse while drills are open), and only the
set walks know the steps. Every walk also runs deliberate fail branches in the same function, with no switch to skip
them: checkpoint restarts (A1, A2, A6, A8 pass 2), takedowns / `knockOut` (A4, A8), alarm and escalation checks (A4,
A5, A7 failed sync 10 HP, A8), lures. Skipping them needs edits in the eight set modules (not mine).

Design:
- Runner: `--ghost` sets `t.ghost = true`; `run-e2e.mjs` gets a ghost entry (e.g. `e2e-ctcourse:ghost`, all 8 sets) or
  each part takes `--ghost`. With `t.ghost` the runner skips the part-1 pause restart and the surface revives.
- Each set module: `if (!t.ghost)` around its fail branches, so a ghost walk is its clean first pass only (no
  `restartCheckpoint`, no `knockOut` / takedown, no deliberate alarm, failed sync, send-back or lure).
- Asserts after each set: detections, alarms, kills, knockouts, bodies all 0 for that bay, and every objective row of
  the bay ticked (`.course-hud tr[data-step] td.done` on both pages). At the end: `stats.course.finale.tier === 'ghost'`,
  team alarms 0, kills 0, revives 0, `isEnded`.
- First step for the lead: read the ghost ledger lines from the next run of parts 1-4; a bay whose walk already logs
  all zeros needs no edit.

## 3. Runs

- `node --check`: `scripts/e2e-ctcourse.mjs` OK, `scripts/e2e-ctcourse/revive.mjs` OK.
- e2e: **not run: lock held** (`C:/NightShift/heavy.lock` = "Course Ready Build | build + sectorops:6 + vitest 57a1dbc6 |
  10:57"; desktop CPU was 35%). Per the brief, no wait.
- To run: `npm run build`, then `E2E_GPU=1 E2E_JOBS=1 E2E_PORT=4191 node scripts/run-e2e.mjs e2e-ctcourse:1`
  (A1 + A2 surfaces), `:3` (A6), `:4` (A8 + dock).

## 4. Game bugs and open items

- No game bug found (not run). Risks to watch in the first run: a prop or the A6 rope plate under the host's spot
  (the grounded check would fail with the y in the message); a guard at A2 / A8 seeing the players on the deck and
  shooting the client after the revive (the client stays damageable as before).
- Doc mismatch: SPEC 12 says the revive is offered within 1.8 m horizontally; the code sets the item's reach to 1.6
  (`src/net/coopHost.ts` `addRevive`, `it.reach = 1.6`). The test uses the code's value. Either the SPEC line or the
  reach should change (lead / Michael).
- The revive hold (2.5 s) is not pressed by any e2e (old dock finale and the new surfaces call `onUse`).
