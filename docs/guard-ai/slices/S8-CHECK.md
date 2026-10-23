# S8 - Tactics (fresh checker, 2026-10-23)

Commit 54627243 on `feature/guard-ai-s8`. Reviewed `git diff ae1f1895 54627243` in full (`src/ai/enemy.ts`,
`enemyManager.ts`, `barks.ts`, `tests/squadWiring.test.ts`, `tests/incidents.test.ts`, docs) against CLAUDE.md
(current goal, hard rules), BRIEF goal 8 and A23-A25, Michael's words ("making them smarter, work together, flank, use
cover to hide and report, they should be smart and tactical, not just rush the player, but any reinforcements must be
aggressive"), PLAN row S8, design section 8, `S8-module.md` and `S8.md`.

## Verdict: PASS

Nothing is broken or unplayable. Roles only run in coordinated modes with a shared LKP and 2+ free cover users. Every
wait a role adds is bounded in the stealth modes by the existing 12 s lost-sight rule (`ALERT.lostSight`,
`alertState.ts:178`), which drops the guard to searching and out of the group. The parked modes keep the old flanker
and tactics. The S5 leash holds. No per-tick allocation was added. Combat dice are seeded. The items below are polish,
or they belong to S6.

### Re-run here
- `npx tsc --noEmit`: exit 0.
- `npx eslint src/ai/barks.ts src/ai/enemy.ts src/ai/enemyManager.ts tests/incidents.test.ts tests/squadWiring.test.ts`:
  exit 0.
- `npx vitest run tests/squadRoles.test.ts tests/squadWiring.test.ts tests/incidents.test.ts tests/radioWiring.test.ts
  tests/awarenessWiring.test.ts tests/postsWiring.test.ts tests/camBodyWiring.test.ts`: 7 files, 134 / 134 pass.
- Not run, as ordered: full `npm run check`, full vitest, e2e (the laptop runs e2e separately).

### Verified
- **Who forms the group.**
  - `inGroup` (`enemyManager.ts:1462`) admits only guards that are alerted, free and use cover. It excludes melee
    guards, dogs, snipers, enforcers, room holders (`hold`), passive guards, held guards, alarm runners and closing
    guards.
  - `rolesStep` runs only inside the `coordinated` block (`:1605`) and only with `lkpValid`.
  - With fewer than `minGroup` members, everyone gets `R_NONE`.
  - The guard lists of the live modes:
    - Infiltration squads hold rooms, so they never group.
    - Marlow Yard's two Course guards are passive.
    - Free Roam has no manager.
    - So today roles appear in Sector Ops, in alarm reinforcements, and in e2e-stealth-ai, which forces
      `coordinated` on.
- **No deadlock.**
  - **Waiting out of sight in the open.** A role guard out of sight in the open waits (`roleStep`, `enemy.ts:1727-1736`)
    when he has no cover to move to or the group has not let him move yet. In stealth (Sector, Infiltration) he
    reaches `searching` 12 s after his own last sight, which takes him out of the group.
  - **Point.**
    - A point with no cover sets `closing` (`:1730`) and walks the last stretch. A point that reaches its cover sets
      `closing` after `advanceHold` (2.5 s) unless the roles tick has given him a new cover. That is the usual case,
      because a held cover in band is kept.
    - A point that reached cover through today's `seekCover` closes after 5 peeks. Before that, the 12 s rule takes
      him to searching.
    - `closing` is cleared when he leaves combat.
  - **Path failures.**
    - `boundTo` (`:1741`) runs one A* per attempt.
    - With no path, it blocks the cover for 5 s and clears `roleCover`, so it is not re-pathed every frame.
    - When the reservation fails, `seekCover` falls back to today's `pickCover`.
    - When the cover cannot be reached, the `seekCover` 6 s timeout ends the trip, and the next try comes at least
      6 s later.
  - **Firing back.**
    - With a line of sight, `roleStep` returns null at once, so today's state machine fights as before.
    - In cover, a role guard keeps peeking and firing (`holds` at `:1962` only stops the step-out after 5 peeks).
    - The reporter holds fire only while his own contact call is open (`radioNet.pendingFor`, a few seconds). A
      player inside `engageMin * 0.7`, or a flank on his cover, still sends him to `attack`, which fires.
  - **Point and flank never both start at once.** The one already on its way finishes first. Both are standard;
    aggressive guards may both move.
- **Earlier slices.**
  - S2 incidents and light checks, S7 camera body walks and S5 lures all happen below the alert level, so those
    guards are never in a group.
  - S3:
    - `noteCaller` hooks the existing `radioCall`, for contact calls in coordinated modes only.
    - The `radioCut` path is unchanged.
  - S4:
    - `inherit` carries `tacticsProfile`, and the revive keeps S4's yaw.
    - Cover reservations are released on death and on knockout (`setState('dead')` and `onKilled`), so `coverSet.owner`
      never keeps a downed guard.
  - S5:
    - `placeSlot` gives any posted guard `P_POST`, whose point and flank weights are 0.
    - `setRole` (`:1680`) turns point or flank into search for a high-security guard and drops a role cover outside
      his leash.
    - With no cover he waits where he stands, inside the leash.
    - Search keeps today's leashed tactics.
    - The A* path to a cover inside the leash is followed without a clamp. That is the same as S5's own leashed
      `pickCover`, so it is not a regression.
  - S7: camBodyWiring passes, and the camera code is untouched.
- **Parked modes.**
  - Clear and Mission set `coordinated = false`, so `rolesStep` never runs and every guard stays `R_NONE`.
  - With `R_NONE`, `holds` is false and the 5-peek step-out is kept, and `ADVANCE_HOLD` is unchanged.
  - `assignFlanker` runs as before: `flanker` is nulled only when `coordinated && rolesActive`.
  - Clear and Mission never call `placeSlot`, so every guard there is `P_STANDARD`. `coverFirst` is 0.85, the old
    85%.
  - The only change in the parked modes is where the dice come from.
- **Determinism.**
  - `Enemy.rng` is declared right after `num`, so the field initialisers draw from it.
  - It is reseeded on going to combat through `combatSeed(0x5eed, engagement, num)`.
  - The remaining `Math.random` calls in `src/ai` are:
    - `thinkT` (`enemy.ts:205`, `:1256`), as documented.
    - The parked `callAlert` and shout jitter (`enemyManager.ts:360`, `:371`).
    - The parked recon drone's angle.
  - Reinforcement yaw and the radio-check spread are now fixed.
  - No `Math.hypot` in `src/ai`.
- **Allocation.**
  - `rolesStep` reuses `RoleInput`, `RoleOutput`, `roleWho` and `roleMember`. `roleMember` only grows past 32 guards,
    and the guard cap is 12.
  - It uses scratch vectors (`earA` / `earB`) for the view ray.
  - `roleStep` returns the reused `roleGoal`. `setRole` allocates nothing.
  - `releaseCover`'s `Map` iteration is older code, and it runs on a reservation, not per tick.
- **Wire.** Barks never cross the wire (`src/net` has no bark reference). `PROTOCOL_VERSION` is untouched. Co-op
  clients have no manager, so they run no roles.

### e2e scenarios likely to change (not run here)
- **e2e-levels (REQUIRED suite; `src/ai/` maps to it in `run-e2e.mjs`). Medium risk.**
  - `LADDER_SEED = 7919` seeds `Math.random` for the runner's ladder chases. The note there says unseeded climbs took
    9-30 s against a 30 s budget.
  - The `Enemy` constructor used to draw 4 numbers (`thinkT`, `pauseT`, `strafe`, `grenadeCd`) and now draws 1. Combat
    draws no longer come from `Math.random` either. So every `thinkT` draw after the first shifts in the seeded
    stream, and the chase is a different (still repeatable) run.
  - If "a runner climbs the rack ladder to the player" or the climb-down fails on time, try another seed. That is a
    test-only change.
- **e2e-stealth-ai. Low risk.**
  - It is the only suite that forces `coordinated = true`.
  - These scenarios now form groups: 'radio', 'radio window', 'radio stagger', 'witness' (only if somebody goes to
    combat) and the reinforcements in 'alarm'. Their asserts check alert times, levels, caution and alarm counts,
    never positions or approach.
  - 'lkp' is a lone guard (the others are passive), so it keeps today's tactics.
  - 'vision-detect' compares three runs on the same seed against each other, so the new draw order cancels out.
- **e2e-sectorops. Low risk.**
  - The alarm-runner scenario: the runner is excluded from the group, and the asserts check stage and raised.
  - The restart scenario checks `!flanker`, a clear LKP and unaware guards. `clear()` resets the roles, the caller and
    the reservations, and the spawn gives `R_NONE`.
  - The posts lure scenario never goes to combat.
- **e2e-ct-warehouse: no risk.** It covers traversal and takedown offers only, in Clear (uncoordinated), and it is in
  the LEGACY list.
- **e2e-wall:flanker** (LEGACY, Clear, uncoordinated): `assignFlanker` is unchanged. Only the dice changed, and the
  grenade is forced with `grenadeCd = 0`.
- **e2e-tactics** (Mission, uncoordinated, 5 grunts, 40 s): only the dice changed, and "near misses suppress" has a wide
  margin.
- **e2e-takedown:** one guard in Clear.
- **e2e-ctcourse:** passive guards, no groups.
- **New S8 e2e:** none was added (`S8.md` explains why, and sketches it). See polish 2.

## Fixes

None blocking.

## Polish list (later slices or the feel pass)
1. **Reinforcements are standard, and Michael said they "must be aggressive".**
   - `reinforce()` (`enemyManager.ts:482`) leaves `tacticsProfile` at `P_STANDARD`. Sector and Infiltration alarm
     reinforcements now join the group like anyone else.
   - A reinforcement chosen as an overwatch with no cover, or one waiting on the point, stands at the entry until the
     12 s rule ends it. Before S8 he walked to the LKP.
   - S6 owns this (A25). It is a one-line pull-forward: `if (e) e.tacticsProfile = P_AGGRESSIVE;` in `reinforce`.
     Better still, also give aggressive guards no wait in `roleStep`.
2. **The 4-guard contact has no e2e.** PLAN row S8 names e2e-stealth-ai, and `S8.md` sketches the scenario. Add it once
   the laptop has run the branch.
3. **A role guard with no cover waits in the open.**
   - In `roleStep` (`enemy.ts:1727-1736`), an overwatch or reporter with `roleCover < 0`, out of sight, stands upright
     and still until the 12 s rule ends it.
   - A flank or point waiting for the group does the same.
   - Before S8 they advanced to the LKP. It is bounded, but the player sees guards frozen in the open.
   - Done looks like: a role with no cover takes today's `seekCover` / `pickCover`, or `R_SEARCH`, instead of
     standing. Or he crouches at least.
4. **Non-stealth modes never time out the wait.**
   - With `stealth` off, `i.seeing` stays true while he is alerted (`enemy.ts:1411`), so the 12 s rule never fires. A
     role guard waiting, or holding cover out of sight, waits forever.
   - No live map hits this today: Course has passive guards only, and Free Roam has no manager. Parked Fallow (Course,
     `?legacy=1`) could.
   - Done looks like: `rolesStep` runs only when `this.stealth` is on, or there is a hold timeout per role.
5. **The overwatch suppresses a stale LKP even when it cannot see it.**
   - `suppressLkp` (`enemy.ts:1761`), called from the open-wait path, can fire through a wall at the LKP. Only an
     overwatch cover gets the view ray.
   - It also overwrites the guard's own `lastKnown` (`:1764`), which blind fire uses later.
   - Done looks like: suppress only from cover with the view ray passed, and use a separate scratch for the aim point.
6. **A cover blocked for the overwatch is blocked for every role.** `blockCover(c)` after a failed overwatch view ray
   (`enemyManager.ts:1429`) also hides that cover from the point, flank and reporter for 5 s. Done looks like: a
   per-role block, or a block that applies to overwatch only.
7. **The reporter can still throw a grenade while on the radio.** `tactics(t)` (`enemy.ts:1976`) runs before the
   `onRadio` hold (`:1978`).
8. **A point usually closes after one bound.**
   - Its held cover gets the stay bonus, so `roleCover === coverIdx` after `advanceHold`, which sets `closing`.
   - This matches A25 ("walks the last stretch"), but design 8's "bounds cover-to-cover" rarely chains more than one
     bound.
   - Feel-pass call: `stayBonus`, or skip the stay bonus for a point that has already bounded.
9. **`roleRun` is computed but nothing reads it** (`seekCover` uses today's run speed). That is harmless, because
   `seekCover` is the only place a role guard runs.
10. **Stale docs in `S8.md`.** "Numbers used" (`:57`) still says "Profiles: everyone `P_STANDARD` (no posts...)". The
    A25 summary (`:103`) says "everyone standard until S5 / S6". Both predate the chain merge, where `placeSlot` sets
    the profiles. `BRIEF.md` A25 is current.
11. **Peek-and-report is the existing 4.2 s peek cycle,** not design 8's 1-2 s peek-and-duck past 12 m. `S8.md` says
    so. It is a feel-pass item.
