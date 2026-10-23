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
