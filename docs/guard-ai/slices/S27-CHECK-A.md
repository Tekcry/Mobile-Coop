# S27 checker A (correctness vs the brief) - feature/guard-ai-s27 fe567fd6 (diff 7fe4f6a2..fe567fd6)

Verdict: PASS

Checker A, fresh Opus, 2026-10-23. Read: agent-preamble, CLAUDE.md hard rules, `slices/S27.md` (origin/feature/guard-ai),
`cloud-queue:briefs/guard-ai-S27.md` + builder report, A161-A164, the whole diff, and the code round it (`decide`,
`pickCover`, `setState`, `rolesFor`, `reserveCover`, `knownSpot`, `muzzle` / `eye`, `ballistics.clear`).

Runs: `npx tsc --noEmit -p .` clean. vitest `squadWiring`, `guardGunCarry`, `squadRoles`, `carryState`,
`coopGuardCarry`, `radioWiring`, `twoIntruders`, `armourFireWiring`: 8 files, 114 / 114 pass. No e2e (not in scope).

## Blockers
None.

## Done looks like - bullet by bullet
1. **No role guard upright and still in the open > 3 s: crouch, then today's cover pick; no cover: crouched** - holds.
   `src/ai/enemy.ts:2572-2590`: out of sight in chase / idle he sets `wantCrouch = true` every think; after
   `SQUAD.openWait` (or one think with role cover -1) he runs `pickCover` (reserves through `reserveCover`, sets
   `coverIdx` + `path`, `:3028-3075`), then `setState('seekCover')` + `coverPicked = true` (setState from chase does not
   release, `:904-918`, so the reservation stands; order is right since setState clears `coverPicked`). Pick failed:
   `openNoCover`, stays crouched in chase, no re-pick each think. Resets: sight / seekCover / inCover (`:2561-2564`),
   role change (`setRole :2520-2524`). The point with no role cover still closes (`:2567-2570`). The builder's deviation
   (no fallback to `attack` on a failed pick) matches the brief's own Goal and test (a); accepted.
2. **Overwatch suppresses only along a clear line; never changes `lastKnown`** - holds. `suppressLkp :2620-2640` writes
   `suppressAim` only; with `SQUAD.suppressView` one `ballistics.clear(muzzle, suppressAim, G.STATIC)` per
   `SUPPRESS_CHECK` 0.25 s (`:222-223`), blocked -> `suppressHeld++`, no `tryFire`. `aimAt :3137-3139` returns
   `suppressAim` only while `suppressing` (set around the one `tryFire`, `:2634-2638`), so attack / enforcer suppress
   (`:2721`, `:2793`) and blind fire keep `lastKnown`. `armourBlocks` reads the same `aimAt`, so the armour gate sees the
   same spot. Both callers (`:2591` open wait, `:2896` in cover) go through it. `knownSpot :1245` reads `huntPos` first,
   so S24's out-of-sight fallback is unaffected by the lost write.
3. **Reporter throws nothing and flanks nowhere while his call is open** - holds. `inCover :2887-2895`: the `onRadio`
   hold now returns before `tactics`; `attack :2796`: `!this.onRadio && this.tactics(t)` (rifle fire above it kept).
   `tactics :2934-2954` is the only grenade / flank-start path in `enemy.ts`; `onRadio` is only true for `R_REPORTER`
   (`setRole :2530`).
4. **After any alarm stage no live-section guard holstered** - holds. `carryCalm :1366-1369` ORs
   `ctx.alarmStage?.() > 0` into `calmArea`'s alarm; hook `enemyManager.ts:625-626` -> `alarmStage`, set by
   `setAlarmStage :914-920` (sectorMode `:573` section load with the run's stage, `:798` rise). Nothing else reads the
   hook (grep). A restart from a stage-0 checkpoint sets 0 -> holsters after `calmHold`.
5. **R_NONE, parked modes, lone guard unchanged** - holds. `roleStep` runs only for roles other than NONE / SEARCH
   (`:2729-2732`); roles only tick under `coordinated` (`enemyManager.ts` board block, `rolesStep :2971`); a lone guard
   is `R_NONE` (`TACTICS.minGroup`). `onRadio` false outside roles, so the `inCover` / `attack` reorders are no-ops there.
   `carryCalm` keeps the `ctx.stealth()` gate and `alarmStage` is 0 outside Sector Ops.

Solo / co-op: host only, no wire or save change (`PROTOCOL_VERSION`, `SAVE_VERSION` untouched). Co-op host's two
intruders: `suppressAim` comes from `huntPos()` (his own intruder's spot), so per-intruder groups suppress their own
spot. The client's puppets do not decide or carry (A126). `e2e-coop.mjs:1348` `kOwn` reads `knownPt`, which comes from
`huntPos`, not `lastKnown`: unaffected.

Hard rules: no allocation added (`suppressAim` made once, counters are numbers, `alarmStage?.() ?? 0` allocates
nothing); no `Math.hypot` in src; no graphics read (`eye` reads the sim `crouch`); no `src/net` import; no wire change.

Tests are real, not tautologies: the `squadWiring` probe runs the real `Enemy.prototype.decide` at 60 Hz with a stub ctx.
On the base `enemy.ts` (a) / (b) fail on `wantCrouch` (base sets `onRadio`), (c) fails on `lastKnown` and on rounds
through a blocked line, (d) fails because base `tactics` throws before the radio hold; each (d) case also asserts the
grenade IS thrown once the call clears, so the gated path is shown reachable. The carry test flips the stage both ways
and checks the no-hook case.

## Polish (ranked)
1. **The planned e2e one-mover assert will likely trip.** A point held by the one-mover rule now goes to `seekCover`
   after `openWait` (brief test (b) requires it), while the flank is still in `seekCover`: two of point / flank in
   `seekCover` at once (`rolesFor` counts `state === 'seekCover'` as going, `enemyManager.ts:2780-2786`). The brief's
   e2e line "at most one of point / flank in seekCover at once" conflicts with its own build step 1. Done looks like:
   the lead either scopes that assert to role bounds (`advancing` / `boundTo`), or gates the open-wait pick for point /
   flank while `mateMoving` (and accepts a longer crouched wait).
2. **A failed pick on a mate-owned cover ends the wait for good.** `pickCover` does not skip covers another live guard
   owns; `reserveCover` then fails, `openNoCover` is set and he stays crouched in the open until he sees his target or
   his role changes, even with free cover nearby. In a group the nearest protecting cover is often a mate's. Done looks
   like: `pickCover` skips `coverSet.owner` held by another live guard, or the open wait retries every `openWait`.
3. **Stale `advancing` on the open-wait pick.** `roleStep :2580-2584` does not clear `advancing`; a non-point role who
   last arrived in cover on an S6 advance (before roles) re-enters `inCover` in the advancing branch (`:2856-2869`):
   after `ADVANCE_HOLD` back to `chase`, one think, pick again - a cover/chase churn, and as overwatch he never reaches
   `suppressLkp`. Done looks like: `this.advancing = false` beside `coverPicked = true`.
4. **Stale suppress verdict across episodes.** `suppressCheckT` only counts down while `suppressLkp` runs; a new
   suppress episode (new spot, or after he moved) can fire up to 0.25 s on the old `suppressOk`. Small, but it can put a
   round into a wall and trip the planned e2e "suppressRounds stays 0". Done looks like: reset `suppressCheckT = 0` when
   suppression starts after a gap or when `suppressAim` moves more than ~0.5 m.
5. **Suppress from cover now mostly during the peek.** The muzzle uses the hide stance (`eye` crouched, behind low cover;
   behind the wall in high cover), so the line clears mainly in the peek phase / at the edge step-out. Correct to the
   letter of A162 (no rounds into his own cover either); fewer suppress rounds than S8. Feel item for Michael's walk.
6. Test (e) R_NONE is loose (`state === 'seekCover' || g.point !== null`) and there is no manager-level
   `coordinated: false` case; the brief asked for "today's steps exactly". Done looks like: assert the exact S8 chase
   goal (advance pick to the expected cover index, `wantCrouch` false, no `reserveCover` from the open wait).
7. `ai.md :222` says "one think with no role cover at all"; it is the second think (the first only crouches). Wording.
