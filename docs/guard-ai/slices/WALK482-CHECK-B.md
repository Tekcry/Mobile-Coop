# Guard AI walk 4.82 (items 2 and 6) - check B (adversarial)

Verdict: PASS

Branch `feature/guard-ai-walk482` at e67614c0, diff `git diff 7fe4f6a2 e67614c0`. Read: agent preamble, CLAUDE.md hard
rules, WALK-4.82-REPORT items 2 and 6 (origin/feature/menu), WALK482.md, the full src / test / e2e diff, and the code
around it (`Enemy.decide` / `roleStep` / `updateAwareness`, `AlertMachine`, `RadioNet`, `EnemyManager` roles input and
`contactThrough`, `CtDevices.onCamera` / `raiseAlarm`, `SecuritySystem.bodyPass`, course and sector mode hooks).

Run (BelowNormal, CPU checked first): `npx tsc --noEmit -p .` clean. Vitest, 10 files, 141 tests, all pass:
loneGuardEngage, squadWiring, twoIntruders, trainingCamera, squadRoles, perception, radioWiring, securityBodies,
camBodyWiring, deviceTrip. No full vitest, `npm run check` or e2e (by the brief).

## Blockers

None. Nothing broken or unplayable found; no hard-rule breach (no allocation added in `decide` / `updateAwareness`,
no `Math.hypot` in src, no Babylon import, no wire or save change, changelog fragment only).

## What I tried to break (item 2) and why it holds

1. Suicidal loop (leave cover into fire every cycle). He leaves only after a whole hide / peek cycle with no sight
   (`lastSeenT` and `stateT` both >= 4.2 s), so a player who keeps showing himself keeps him in cover. Out of cover the
   chase branch either bounds to a cover at least 3 m nearer the last known position (`pickAdvance` excludes the cover he
   just left: `dT > myD - 3`, `dMe < 2.5`) or walks the last <= 7 m. Regaining sight sends him back to cover as before.
   Each cycle ends nearer, then in the search or `attack` (`dist < engageMin * 0.7`): it converges, no ping-pong.
2. `closingIn` set / cleared per frame. Reset once per `decide` after the early returns (alarm run, entry route,
   door check keep the last value, which is the right one), set again by every closing branch (chase out of sight,
   advance `seekCover`, advance hold in `inCover`, point bound in `roleStep`, which runs after the reset). Read a frame
   late by `updateAwareness`. A frame without it can only drop the cap back to today's 12 s, never extend it. Every
   `i.closing` read is gated by `alerted && !los`, so a stale value after the fight is harmless.
3. Stale `advancing`. Pre-existing (seekCover -> attack after 6 s keeps it). With the new code it only matters through
   `closer`, which needs `!los`; worst case a 30 s cap instead of 12 s. Polish 4.
4. 30 s cap with an unreachable last known position (no path, off grid, behind a locked door, on a ledge). Bounded:
   `chasePoint` returns null (he stands) or he stops short of the 1.5 m arrival, and `ALERT.lostSightClosing` turns it
   into a search at 30 s. Never forever. Polish 1 (no-progress drop-out).
5. Call cut mid-call (down / grabbed / blinded). `radioCut` -> `RadioNet.cut` closes every open call of his, so
   `pendingFor` is 0 at once: `radioOpen` cannot stick true, and the roles input stops naming him reporter on the next
   2 Hz tick. A call whose caller dies without a cut still closes at its due time (the tick's safety net). `onRadio` is
   refreshed on the same tick, as before.
6. `radioNet.pendingFor` per frame: a 16-slot scan, evaluated only when `closer` is true and he reached the new check
   in `inCover` (short-circuit `&&`). The roles input calls it at 2 Hz. One `RadioNet` for the manager (Sector Ops moves
   `section`, not the net), so there is no wrong-net lookup.
7. Two intruders: `callers[slot]` per intruder, `pendingFor(caller)` counts any open call of his. A guard whose call
   about intruder B is open stays reporter of A's group too. He is in one group only (his `hunt`), so no harm. The
   updated twoIntruders expectation (`point, overwatch, search, flank`) is the intended change.
8. Who else gets the 30 s cap: every coordinated-stealth guard closing out of sight with a hunt slot, not only the lone
   reporter. That includes radio receivers alerted by the call (today they search 12 s after the alert); they now advance
   cover to cover in combat for up to 30 s or until arrival. Coherent with "keep the last known position", but wider than
   the walk item. Polish 2.
9. A guard in `attack` (the 15 % no-cover roll) loses sight -> `chase` after 2.6 s and closes while his call is open.
   Today's behaviour too; the "not while the call is open" rule is a cover rule only. Fine.
10. Melee, dogs, enforcers in `attack`, holds / high-security posts, Wave / parked modes: `closer` false or the branch
    returns before any closing write: today's rules.

## Item 6

- `guardResponse: false` drops only the `alertAt` device incident and the body pass. The alarm stage still rises.
  In Marlow Yard (course mode) the stage is a stat (`record('alarms')`) and a banner: no reinforcements or response team
  exist there, so nothing else reaches a guard. In Sector Ops the stage brings reinforcements / a team, which a training
  camera would still trigger (now with no device spot). No Sector Ops camera sets the field, so nothing changes today.
  Should it suppress the stage too? For a training camera, probably yes, but that is the exercise rule (Marlow). Polish 5.
- Body pass skip: the camera's `bodySeen` set just stays empty; no other consumer. Camera bodies on CtDevices' own
  cameras are player-only (`this.bodies`), so the S3 camera has no body path to miss.
- Cameras never feed the intruder last known position (no `reportSighting` path from security), so no LKP leak.
- Saves / wire: unchanged (map data both sides build from; client `CtDevices` has no `alertAt`).
- Not in effect until Marlow adds `guardResponse: false` to `cam-s3` (`src/world/maps/ctcourse.ts` line ~192). The S3
  guard who sees the player himself still fights (exercise rule, Marlow).

## Likely e2e retunes (by design)

- `scripts/e2e-stealth-ai.mjs:539-606` 'report then engage' (new, unrun): 2 m arrival and 700 x 0.05 s budget may need
  tuning on the first run (as the builder says).
- `scripts/e2e-stealth-ai.mjs:473-537` 'lkp': the search must now start by arrival inside the 25 s window (500 x 0.05,
  line 505); at the 30 s cap `r.searching` (line 534) fails, and `r.end` (line 536) needs the search to start within
  ~15 s of the window (60 s search vs +50 s). Expected to pass (5 m walk), but this is the assert that moves first.
- `scripts/e2e-sectorops.mjs:3048-3090` S16 NOC pair: "the pair stay in combat" over 10 s (line 3085). Holds (they see
  him through the pane, `lastSeenT` stays low); a pair member who loses sight could now leave the NOC after 4.2 s if
  not a high-security post, which only changes the log line, not an assert.
- `scripts/e2e-stealth-ai.mjs:1015-1088` 'alarm call' (C) `mateUp`: the call-alerted mate now stays alerted longer
  (closing): only safer.
- No e2e asserts a role name or the reporter (grep `reporter|roleName` over scripts/e2e-*.mjs: none), and none asserts a
  guard response to `cam-s3` (e2e-ctcourse.mjs:280/299/369 only jam it).

## Expected conflicts

- origin/feature/guard-ai-s27 (0ae92fd4), `git merge-tree`:
  - `src/ai/enemy.ts` import line 46: union (`closeFromCover` + `SQUAD`).
  - `src/ai/enemy.ts` `inCover` ~2918: S27 moved `this.tactics(t)` after the `onRadio` block; this branch inserted the
    `closeFromCover` exit at the same place. Resolve: `onRadio` block, then `tactics(t)`, then `closeFromCover`.
  - `TESTING.md`: both add lines, keep both.
  - Clean but semantic: S27 open-wait (`roleStep` -> `pickCover`) leaves `closingIn` false (today's 12 s, as S27
    documents); `squadWiring.test.ts` merges clean and S27's new cases set roles directly, the S8 reporter cases are
    the same as here.
- origin/feature/guard-ai-s25 (8bd13e0c), `git merge-tree`:
  - `scripts/e2e-stealth-ai.mjs` ~543-842: both add a scenario after 'lkp' (keep both); S25 also edits 'lkp' (hide spot
    (0, -20), new `wallhack` spot) which this branch leaves alone.
  - `docs/systems/testing-tools.md` line ~174: both edit the stealth-ai list, keep both phrases.
  - `src/ai/enemy.ts` / `enemyManager.ts` merge clean. Semantic: S25's search plan starts at the alert -> searching
    switch, which now comes on arrival at the last known position (or the 30 s cap) instead of 12 s from cover. Its
    'search area' e2e (S25 diff, the 1600-step loop) times from `tS`, so it should hold, but 'near' now has the guard walk
    to the last known position in combat with the player crouched in the dark 5-7.5 m away: a sighting there would stop
    the search from starting (`tS` < 0). Rerun 'search area' and 'lkp' after the s25 merge.

## Polish (not blocking)

1. Closing with no progress (no path / standing still for a few seconds): drop `closingIn` so today's 12 s applies,
   instead of up to 30 s in combat near an unreachable spot.
2. Decide whether radio receivers (alerted by the call, never saw him) should get the 30 s closing cap or keep the 12 s
   one; today's diff gives it to them (combat music / HUD in combat longer). Document it in `docs/systems/ai.md` either way.
3. A guard shot from the dark while in cover does not reset `lastSeenT` (only sight does), so he may leave cover towards
   the stale last known position while being hit. Consider "hit in the last N s: hold" in `closeFromCover`.
4. `advancing` is not cleared on seekCover -> attack (pre-existing); clear it there so a later normal cover pick is not
   treated as an advance.
5. Training camera and the alarm stage: if Marlow wants the exercise to skip the stage, gate `raiseAlarm` in
   `onCamera` on the same field (Sector Ops would then also lose reinforcements from such a camera).
6. `pendingFor(caller)` counts any open call (body, shots, missing): a guard on a later body call becomes reporter again
   for that window. Harmless; a per-kind check would be stricter.
