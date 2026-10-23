# S23 Every player is seen - fresh check B (co-op play and robustness)

Verdict: PASS

Checked: `feature/guard-ai-s23` head a87ef34c against master 41204e30, brief `docs/guard-ai/slices/S23.md` (read from
`C:/NightShift/Mobile-Coop-guard-ai`, it is not in this worktree), code read before the build report. Lens: two players
in a co-op match, robustness.

## Blocking findings
None.

## What was checked (code-read results)
- **Which refs reach `perceive` on the host.** One player list, `GameState.playerRefsInto` (`src/game/gameState.ts:981-989`):
  `localRef` pushed first, then `coopHost.remoteRefs`. So index 0 is always the host's own player, which makes
  `seesIndex(0)` (`gameState.ts:2585`) correct. Refs are stable objects (`r.ref`, `src/net/coopHost.ts:357`), so the
  identity scan for `cur` (`src/ai/enemy.ts:1919`) works across thinks. A downed player has `alive` false and stays in
  the list (`P_DIST` Infinity, never picked). A dropped partner is spliced out (`coopHost.ts:376-377`, `436-437`) and
  put back on rejoin (`:401`). Index 0 never moves. A higher index can shift, but nothing in `src` reads
  `seesIndex(i > 0)` yet; S24 will. The client runs no guard brains and draws no arcs (`!this.puppet`, `gameState.ts:2578`).
  No change reaches the client.
- **Target pick** (`src/ai/targetPick.ts:55-75`).
  - Calm: the highest rate, ties to the nearer, nobody seen falls back to the nearest (today's behaviour).
  - Alerted: sticky on `cur` while he has `los`. Else the nearest with `los`. Seeing nobody, he keeps `cur` while alive.
    A dead `cur` fails `live()` and he moves on.
  - No lock on a player he can't see while another is in view. No frame-to-frame thrash in combat: once he switches
    off a hidden `cur`, he stays on the new one while he sees him.
  - Downed = dead: skipped.
- **Module scratch** (`enemy.ts:66-82`). For every guard, every slot `i < n` is written before it is read: `P_LOS`,
  `P_CHEST`, `P_HEAD`, `P_SMELL`, `P_RATE`, `P_EXPO`, `P_LIGHT` and `P_DIST` at the top of each iteration, and
  `P_ANGLE` for live players, the only ones `k` can be. `pickTarget`, `nearestTarget` and `live()` read only `i < n`.
  Nothing between the loop and the tail re-enters `perceive`: `losTo`, `lightField.totalAt` and `reportSighting` come
  after the reads. So no state leaks from one guard to the next. `MAX_INTRUDERS` 4 > 2 players: the unused slots are
  never read.
- **Solo parity.** `mayBeSeen` mirrors both terms of `sightRate`, including the behind factor
  (`targetPick.ts:26-31`, `perception.ts:157-180`). So a skipped player always had rate 0, and `instantDetect` needs
  the focus cone. Target, dist, rate, meter, stimulus and instant detect are unchanged. Only `los`, `lastKnown`,
  `lastSeenT` and `inSight` differ, for a player a calm guard cannot see at all.
  - The calm readers of `los` don't care: `torchRule` reads `los` only at level `alert`, and `sinceSeen` for a calm
    guard comes from `seenAt(rate)`.
  - The combat `entryStep` (`enemy.ts:2505`) runs only alerted, and alerted guards cast rays for every player.
- **Downstream of target / targetDist.**
  - `assignFlanker` (`enemyManager.ts:2668`): `targetDist` is at most one think stale. With nobody alive it is
    Infinity, so no flanker, which the `held` gate already requires.
  - The roles tick uses the shared LKP plus each guard's own `seesTarget`.
  - `spotted`, `reportSighting`, aim, grenade and chase all read `this.target`. The old code could already set it to
    player 1 (when he was nearer).
  - No `players()[0]` reader is left in `src/ai`.
- **Hard rules.**
  - No `src/net`, protocol or save change. The diff touches only `src/ai/{enemy,enemyManager,targetPick}.ts` and one
    line of `gameState.ts`. No static `src/net` import.
  - The hot path allocates nothing: `for` index loops, typed arrays, one `P_SIGHT` object, `hyp2`, no `Math.hypot`.
  - One `players()` call per think, as before.

## Polish (non-blocking)
1. **Only the picked player is tested.** `instantDetect` and the `spotted` mark at a sighting alert (`enemy.ts:1663`,
   `:1668`) run for the picked player only.
   - A second player inside 1.6 m in focus while the other has a higher, uncapped rate still fills the meter at
     `rate[k]` instead of setting it to 1 at once. That is under 0.4 s at `maxRate`.
   - A partner the guard also sees at the alert is not marked `spotted`. That was true before too: nearest only.
2. **A calm guard can switch targets each think.** When two players are both in view at near-equal rates, his target
   and `stimulus` can swap every think (~4 Hz), so he looks back and forth between them. Combat is sticky; calm is not
   (A143 picks the best seen each think). A small hysteresis would fix it, if a playtest shows it.
3. **A dog in combat ignores a smelled non-target.** Its pick uses only `los`. Example: the dog fights A, A goes beyond
   sight and smell, and B is smelled but not in sight. The dog stays on A (`smelled` false), so the fight cools.
   Before, it took the nearest (B) and kept going by smell. This is a rare edge case.
4. **Arcs and route-ending for a guard facing away.** The arc gate now reads `seesIndex(0)`, which uses the same
   `mayBeSeen` skip, so a calm guard facing away with his meter still up gives no arc. Before, a clear line behind him
   was enough. A responder on his search entry route (`enemy.ts:2237`, level `searching`) no longer ends the route on a
   line to a player behind him. Both arguably read better, but both are solo-visible changes. Watch the `e2e-stealth` /
   `e2e-stealth-ai` arcs in the regression run.
5. **Arc meter can be the partner's.** A calm guard with a clear line to the host (exposure > 0, but rate 0 in the dark)
   while his meter fills on the partner shows the host a white arc at the partner's meter. This fits A145 ("sees the
   host"), but the fill is the partner's.
6. **Brief docs not written.** Brief step 5's `docs/systems/coop.md` and `TESTING.md` lines are missing. The builder
   says so (deviation 6). Another agent is adding docs and the e2e-coop block in this worktree, so this is not checked
   here.

## What I ran (laptop, one at a time)
- `timeout 600 npx vitest run tests/coopPerception.test.ts tests/targetPick.test.ts tests/squadRoles.test.ts tests/armourFire.test.ts tests/armourFireWiring.test.ts tests/guardSpacing.test.ts`:
  6 files, 74 tests passed.
- `npx vitest run` on squadWiring, awarenessWiring, hearing, coopGuardAi, gearWiring and perception: 123 tests passed.
- `npx vitest run` on alarmCall, bodySearch, breaker, camBodyWiring, coopTorches, deviceTrip, enemyLightsOut,
  guardDoors, incidents, pairsWiring, postsWiring, radioWiring, responseWiring, sectionAlert, urgency and polishBatch:
  16 files, 239 tests passed.
- `npx eslint` on the 4 changed src files and the 2 new tests: clean.
- `npx tsc --noEmit -p .`: clean.
- Not run (as instructed): e2e, full `npm run check`. The brief's e2e-coop block and the solo regression suites
  (e2e-stealth-ai, e2e-stealth, e2e-takedown, e2e-tactics, e2e-sectorops, e2e-ctcourse, e2e-guard-carry) still need the
  Test Runner.
