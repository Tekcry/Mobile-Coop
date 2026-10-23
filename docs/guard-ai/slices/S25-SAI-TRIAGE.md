# S25 e2e-stealth-ai triage (laptop, Opus, 2026-10-24)

Failure: `near: the search starts and asks the plan, built` on 8bd13e0c (run 20261023T112553, rerun same; also in S26).
The state: `tS` 17.8, `plans []`, `claims [[]]`, the guard 1.5 m from the hide spot (-4.75, -2.25) from 9 s to 20 s.

## Verdict: test bug (the 8bd13e0c 'near' pick), not the S25 code

8bd13e0c changed only the 'near' pick: it skips spots within 3 m of the guard's walk from (0, 5) to the last known
position (LKP). Before that, the best spot lay on his walk. Now it is (-4.75, -2.25), just past the 1.1 m gap in the
x -4 wall (`warehouse.ts:232` `gx4` gap z -2..-0.9). That spot is in his line of sight from the LKP (-0.5, 0) through
the gap: the ray crosses x -4 at z about -1.85, inside the gap.

- An alerted guard counts line of sight alone as seen, whatever the light (`enemy.ts:2187`,
  `seen = this.alerted ? this.los || this.smelled : ...`). Each sight reports the player's feet as the LKP
  (`enemyManager.ts:588` `reportSighting`).
- The evidence: `tS` 17.8 s. With no new sight, the search starts at 12 s at the latest (`alertState.ts:184`,
  `lostSight` 12, `sightT` 0.2 at the tp), or earlier when he reaches the LKP (`enemy.ts:2231`). So he saw the player
  again about 5.8 s after the tp.
- Then the LKP sat on the player, and the search's first point was the player's own cell (-4.75, -2.25). He never
  arrived within 1.1 m of it (from 9 s to 20 s, about 1.5 m off, in the gap). `searchK` stayed 0, so
  `searchPoint` / `buildPlan` were never asked and `plans` stayed empty.
- So the scenario was no longer the "he vanishes" premise the asserts test (S25.md 'near').

The S25 search code itself (`searchPointFor`, `buildPlan`, `enemy.ts:2385`) was not reached; nothing in it is implicated.

## Fix (scripts/e2e-stealth-ai.mjs only)

1. 'near' pick (`consider`): skip any spot in his sight from his walk (eyes every 0.5 m from (0, 5) to the LKP) or
   from 8 points 1.5 m round the LKP. The eyes sit on walkable cells, at his standing eye height read from the spawned
   guard (`e.eye`). The test is a static ray (mask 1) to the crouched hips, chest and head (+0.6 / 0.95 / 1.2 m), clear
   within 0.3 m (as `perception.ts:80` `losClear`).
2. A new assert: `near: after the tp he never sees him again`. The run records `resight`: the first time after 0.5 s
   that he is alerted with `sinceSeen` < 0.1. A broken premise now fails with its own message.
3. Diagnostics: a 1 s trace of his walk ([t, level, x, z, LKP, onPlan]) printed in the plan / closest asserts.

No assert was loosened.

## Not confirmed (open)
- The guard held about 1.5 m from his first search point, in the x -4 gap, for about 11 s (9 s to 20 s). An analytic
  nav probe (scratch vitest on `runtimeNav`, doors left out) shows the route `[-4.75,-1.25] -> [-4.75,-2.25]`
  through a one-cell-wide gap. The live field gives 5.6 m to the hide spot where the probe gives 6.1, so the live grid
  differs there. Why he stalled cannot be told without a run. With the fix the spot is out of sight, so the LKP no
  longer lands on the player, and this case should not come up. If the rerun still fails, the printed walk trace
  shows where he stops.
- Risk from S25B-RECHECK: the new pick ranks lower in the plan, so the 20 s window is too short. If that happens, read
  the printed plans for the hide spot's rank and apply the recheck's suggested change.

## Checks run
- `node --check scripts/e2e-stealth-ai.mjs`: OK.
- `npx vitest run tests/searchAreaWiring.test.ts`: 17 / 17 passed.
- Scratch nav probe (warehouse, `runtimeNav`): the gap geometry and routes quoted above.
- No local e2e (laptop rule). Laptop rerun queued on b384befc: set `s25-sai-fix`, suite `e2e-stealth-ai`, request `20261023T130835-night-shift-guard-ai-b384befc-75cc`.

## Round 2 (b384befc still failed 'near', desktop run + rerun; also on S26 97da4fdf)

New state: hide (-4.75, -0.25), out of his sight, and `resight` passed. But the walk trace shows his intruder's LKP at
[-4.8, -0.3], the player's true hide spot, from the first sample (0.1 s). tS was 12.3 s, about lostSight 12 s from a
sight at about 0.3 s. During the alert he took cover about 9.5 m north at (1.2-3.4, 9.5), the seeded cover-first roll
of 0.85 at the first sight. At tS he walked straight to the player. He was still about 2 m short at 24 s, so he never
reached point 0, never asked the plan, and `plans` stayed `[]`.

### Root cause: the test's teleport leaks the player's position into the LKP (test harness, not S25)
- The player's rig root is placed only in the render-side `frameUpdate` (`player.ts:371`
  `root.position.copyFrom(c.renderPos)`). `PlayerTarget.sync` runs in the fixed step (`gameState.ts:1884`) and reads
  the chest and head from the rig (`playerTarget.ts:85-110`).
- So on the first fixed step after a bare `t.tp`, the chest is still at the lit spot (-0.5, 0), in his sight. The
  alerted guard has LOS and calls `takeSighting`, and `reportSighting` (`enemyManager.ts:588`) reports `p.feet`, which
  the teleport has already moved to the hide spot. The LKP jumps onto the player.
- My round-1 `resight` check started at 0.5 s, so it missed this. Round 1's "re-sight through the x -4 gap" was only
  part of the story: the 8bd13e0c run had this same leak from the first step.
- In play the feet and the rig move together, at most one frame apart (centimetres). So this is a teleport-in-a-test
  artifact, not a game bug. The S25 wiring is as specified: point 0 is the LKP, then plan points (ai.md S25 "the first
  point is the last known position as before"). Asking the plan only after the look at the LKP is the design, so no
  src change.

### Fix (scripts/e2e-stealth-ai.mjs only)
1. After `t.tp(hide)`, one `g.frameUpdate(1 / 60, 1)`, so the body follows the teleport before the first sim step.
   This covers all three 'search area' runs: 'wall' and 'three' had the same leak.
2. `resight` is now checked from the first step, and a new 'near' assert checks that the LKP stays within 0.5 m of
   where he lost him (`lkpMoved`, with the time and the position).
3. The 'near' window now counts from his first plan point (`tP`: the first plan built in the search), with
   `closestP` / `closestPT` measured from then. It used to count from the search start. The walk back from cover
   (about 9.5 m, about 9 s) and the 3 s look at the LKP are point 0, not the plan's to answer for. The assert itself
   (within 1.5 m or found, 20 s) is unchanged, and a 45 s cap ends a run that never gets a plan.

### Checks
- `node --check scripts/e2e-stealth-ai.mjs`: OK. No src change (no tsc / vitest needed; round 1's
  `searchAreaWiring` 17/17 stands).
- Risk left: the hide's rank in the plan (S25B-RECHECK). The printed plans and the walk show it if 20 s from the plan
  is still short.
- Queued: set `s25-sai-fix2`, suite `e2e-stealth-ai`, on 923be420, request `20261023T133138-night-shift-guard-ai-923be420-40a9`.

## Round 3 (923be420: 'near' fails on the round-1 `resight` assert, run + rerun identical; S26 the same)

Log: `runs/20261023T133138-...-923be420-40a9/4189.log:64-70`. The plan side now works:
- `lkpMoved` null: the LKP stays at (-0.5, 0) for the whole run, so the round-2 tp fix holds.
- The search starts at tS 12 s. He walks back from cover (1.6, 9.6) to the LKP and looks there (23-25 s). The plan is
  built at 13.4 s into the search, round (-0.5, 0) with R 20 and 12 points. He claims (-3.3, 3.5), then (-4.7, -2.5).
- The run ended at tP + 10 s, on `closestP` < 1.5 m (prints 1.5; the guard was at (-3.6, -1.2), about 1.49 m from
  the hide spot (-4.75, -0.25), going through the x -4 gap to (-4.7, -2.5)).

### Cause: my own assert
`resight` fired at 0.05 s because the guard watched the lit player right up to the tp: `sinceSeen` was about 0 then,
and 0.05 s later it is still under 0.1. That was the clock counting on, not a sight. The LKP did not move.

### Fix (scripts/e2e-stealth-ai.mjs only)
- `resight` is now a drop in `sinceSeen` (a sight resets it to 0). It also fires if he is still in sight after 0.2 s
  (the clock under 0.1 there).
- The `near:` / `wall:` / `three:` run asserts printed "undefined" when there was no error. They now read
  `the run picks its spot and completes` / `the run completes`.

### Prediction for the rest of 'near', from the round-2 data
- "the search starts and asks the plan, built": 2 plans, 12 points. PASS.
- "a plan point within 3 m": (-4.7, -2.5) is 2.25 m from the hide spot. PASS.
- "a searcher comes to the dark spot within 20 s of his first plan point": `closestP` < 1.5 at 10 s, his second plan
  point. PASS. The margin is small (1.49 m), but the run is deterministic, and on through the gap he passes about
  1.0 m from it well inside the window. `found` is not needed: the assert is closest <= 1.5 OR found.
- "never homes in": false. PASS.
- 'wall' and 'three' have not run since round 1; their asserts are unchanged. The tp fix keeps the LKP where he lost
  him, which is what they assume.

### Checks
- `node --check scripts/e2e-stealth-ai.mjs`: OK. No src change.
