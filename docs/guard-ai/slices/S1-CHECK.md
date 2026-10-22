# S1 - Hearing (fresh checker, 2026-10-24)

Commit cd37c3e8, reviewed `git diff 0284c523 cd37c3e8` in full against BRIEF M1 / goal 1, PLAN row S1, design
section 2 and the implementer's report `S1.md`.

## Verdict: PASS

Nothing is broken or unplayable. The tiers, wall dB, masking at the listener, one investigator per noise, gunfire tiers
with walls and the LKP rule match goal 1 and design section 2. The items below do not block. Fix 1 is a one-line logic
fix worth doing now or at the start of S2. The others are test strength and parity notes.

### Re-run here
- `npx vitest run tests/hearing.test.ts tests/perception.test.ts tests/enemyManagerDespawn.test.ts tests/coopTorches.test.ts tests/sectorRestart.test.ts`: 5 files, 70 / 70 pass.
- `npx tsc --noEmit -p tsconfig.json` (the build's typecheck step): clean.
- `npm run lint`: 0 errors, 41 warnings (old ones, none in the changed files).
- e2e not run (laptop): `e2e-stealth-ai`, `e2e-sectorops`, plus the slice tier (`e2e-ctcourse`, `e2e-coop`, `e2e-netmove`).

### Verified
- `hearing.ts`: imports only `core/mathx` (no Babylon). `hearTier` uses `!(d < r)`, so NaN gives tier 0. Boundaries
  are strict `<` (combat at a quarter, investigate at half, turn at the full reach). `ambientDb` is 3D only when both
  heights are set; `e.pos.y` is always set, so NaN cannot come from y. `wallMatters` casts the ray only where one
  wall changes the tier.
- A walled shot at 20 m: effective reach 12.65 m, so tier 0. Nobody hears it and no LKP is set (unit test). Combat
  only inside 0.25 x the effective reach (7 m open, 3.2 m walled).
- The shared LKP is set only for tier 3, guards already fighting, or the sent guard. Turners set nothing. Uncoordinated
  `noise()` is exactly the old loop.
- Who is filtered out:
  - Dead and KO guards: `alive` is false, since KO zeroes health.
  - Passive guards: skipped in `hear`, and never put on the tier-2 list in `noise`.
  - Takedown and strike noises: emitted after the victim is down, so the victim never takes the assignment.
  - Dogs and runners: keep `Enemy.hear` and are never the investigator.
- Modes: Clear (Hunter) and Mission set `coordinated = false`. Infiltration, Course and Sector default to true. Sandbox
  has no manager. The co-op host's remote footsteps and shots go through the same `hear` / `noise`.
- No allocation in the hear loop:
  - Scratch arrays are typed and grow by doubling only.
  - Wall rays reuse the `earA` / `earB` vectors.
  - No closures, iterators or `Math.hypot` in `hearing.ts`, `hear`, `noise` or `sendOne`.
  - `playerRefsInto(this.aiRefs)` replaces the per-call `[...]` allocation.
  - No consumer of `players()` stores or mutates the shared array (checked: EnemyManager, Enemy, ReconDrone, SecuritySystem).
- Turners cannot drift into investigating from one sound. The meter is capped at 0.45 and decays 0.18/s. It falls
  below `lingerMeter` (0.15) after about 1.7 s, before the 3.2 s linger rule fires.
- e2e retunes:
  - `noise` and `loud` read their distances from `hearingTable` and `NOISE`.
  - The new `one investigates` scenario is a real test: 4 guards inside half the reach, exactly one investigates and
    it is the nearest, the others move less than 1 m.
  - The new `loudFar` check is also real: tier 2, so suspicious and then investigating.
  - No other suite in a coordinated mode asserts hearing (grepped `e2e-ctcourse`, `course`, `coop`, `netmove`,
    `missions`, `stealth`).

## Non-blocking fixes (ranked by impact)

1. **A seized or held guard takes the one investigator slot.**
   - Where: `src/ai/enemyManager.ts:632` (`hear`) and `:603` (`noise`).
   - Problem: a guard with `e.taken` (a hostage or an interrogation hold) is alive and not passive, and he is always
     the nearest hearer to the holder's own noises. While a player holds a guard, his footsteps, rattles and
     suppressed shots send nobody: the held guard is "sent" (he has no brain while held) and every other tier-2 guard
     only turns.
   - Done looks like: `|| e.taken` is added to the skip at `:632` and to the tier-2 condition at `:603`, plus one unit
     test: a held guard at 0.5 m and a free guard at 4 m, and the free guard gets `hear`.
2. **e2e `shots`: the suppressed check cannot fail at the moment it is read.**
   - Where: `scripts/e2e-stealth-ai.mjs:741` / `:786`.
   - Problem: the level is read 0.2 s after the shot, but `investigating` only comes after `hearLook` (2.4 s). The
     old "everyone walks over" rule would pass this assert too.
   - Done looks like: step about 2.6 s more, then assert he is still not `investigating` (and `suppTurn` is true).
3. **e2e-sectorops: the suppressed-shot check no longer separates suppressed from loud.**
   - Where: `scripts/e2e-sectorops.mjs:460` / `:481`.
   - Problem: at the far spot the loud shot now alerts nobody either, so a regression that sent suppressed shots down
     the loud path would still pass. The new control (`:483` on) proves only that the loud path works close in.
   - Done looks like: after the suppressed shot, also assert that no guard is `turning` or `suspicious`. The spot is
     beyond the suppressed reach of every guard's path, so this is safe. That pins the suppressed reach (16.8 m) on
     its own.
4. **"Parked modes unchanged" is not exact for ordinary noises.**
   - Where: `src/ai/enemyManager.ts:561`.
   - Problem: with `coordinated = false` the wall ray is now cast for d in [0.226, 0.45) x reach, which the old code
     never did. A walled guard there gets `e.hear` with radius 0.45 x reach, so his meter floor is lower, and a dog's
     charge (s >= 0.6) can change. `heard` still forces suspicious, so the outcome is nearly the same; this matters
     only for Clear e2e edge cases (`e2e-enemies`, `e2e-gadgets`, `e2e-takedown`).
   - Done looks like: when `!this.coordinated`, cast the ray only for `d > reach * WALL_FACTOR` (the old rule).

## Polish list (S2 or the feel pass)
- `Enemy.hearTurn` (`src/ai/enemy.ts:592`) overwrites the stimulus of a guard who was already sent and is still
  `suspicious` (his `sound` flag stays set). He then walks to the later noise, which already has its own investigator,
  and nobody checks the first one. The S2 board should own the target per sent guard.
- With footsteps every 0.25 s, the non-picked tier-2 turners keep the meter at 0.3 or more and stay suspicious. The
  linger rule (meter >= 0.15 after 3.2 s) then sends them too, so a walking player close by can still pull several
  guards (the report notes the "nearest changes" variant). S2 dedupe should cover both.
- `pickNearest` (`src/ai/hearing.ts:106`) uses straight 2D distance while the tiers use 3D. A guard on the floor above
  or below can be picked. S2 uses path length.
- `calmDecide`'s new turn branch (`src/ai/enemy.ts:1067`) returns a fresh object each step, like the other branches of
  that function (an old pattern). Make it a reused decision object when that function is cleaned up.
- The e2e-sectorops control teleports the player 2.45 m behind the guard. A sight detection in those 0.8 s would also
  pass it. Low risk (he faces away, closeRange is 1.8 m). A guard-side `meter < 1` read before the shot would close it.
- `docs/systems/ai.md:36` "Inputs" does not list `hearTurn`.
- `noise()` sends a searching guard who is nearest as the investigator (`e.hear` does nothing to a search, apart from
  the LKP now pointing at the shot). Fine for now; S2 / S4 decide whether searchers go to shots.
