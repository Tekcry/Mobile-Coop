# Play A re-check - PR #588 (feature/guard-ai-home, fix head 7bcfe85fe)

Fresh Opus re-checker. Read-only. Scope: the fix round `5ac9d35b5..7bcfe85fe` against PLAY-A-CHECK-A (wake-body 15 s
give-up) and PLAY-A-CHECK-B (uncapped 20000-expansion long plan).

## Verdict: PASS

## 1. Both FIX items closed

- **Check B (long plan per frame).** `EnemyManager.update` resets `longPlanFree` as its second statement, before any
  guard steps; the guards' only stepping path is the manager's `e.update(dt)` loop (no other production caller of
  `Enemy.update`; the one production `AiContext` is the manager's). `decide` runs every frame (the think cadence gates
  only `perceive`), so a denied guard asks again on the next frame. Both `homeLongPlan` call sites take the token:
  - line 2806: `part && !homeLong && longPlanFree()` then `homeLongPlan` at once; denied, he returns the partial `wp`
    (keeps walking).
  - line 2811 (stuck path): the token is asked only when `moved < homeMove && !homeLong`; granted, control falls to
    line 2816 `homeLongPlan` in the same call. Denied, the window stays over and `wp` is returned. No branch takes the
    token without using it, and it is freed every frame. `homeLong` is set on the first try, so one guard cannot hog
    it per point (no starvation). `longPlan` is one closure built at ctx creation; nothing allocates per frame.
  - Budget 10000 (per the commit, ~2.4 ms p50 / 3.2 ms max on S1): one per frame is within the bar.
  - S1 probe (scratch, deleted): all 8 S1 guards displaced 20-30 m and calmed in the same frame: 54 long plans over
    200 s, **max 1 per frame**.
- **Check A (wake-body give-up).** The revive walk is now `goTo(spot, .., partial)` + `walkStalled` (under 0.2 m in a
  5 s window); time no longer ends it. `reviveQuit` stops the same body being re-sent. Tests: a 16+ m path round a
  wall is woken after > 15 s; a body across a solid wall is given up within ~5 s and stays given up.

## 2. Progress give-ups: no freeze forever

A frozen guard is always caught (window displacement < 0.2 m). The partial-path walk is monotone towards the goal (the
nearest reached cell can only get nearer), ending in `routeMiss` (wp null: give-up). An in-place oscillation of more
than 0.2 m net per window has no hard ceiling inside the walk itself, but an outer one exists in normal play:
- the revive walk only runs in `searching`, which ends on `searchFor` / `searchTime` (and `onLevel` clears `reviving`),
  except for a hunting guard (fought aggressive / responder, never calms);
- the alarm run only runs in `alert`, which decays to `searching` after `lostSight` without sight.
The remaining case (hunting guard or a guard who keeps sight, and a physical jam that oscillates rather than stalls) is
speculative; not blocking in prototype mode (polish 1).

## 3. Normal patrol: no regression

S1 sim, 8 guards (gate post, cctv route, two timed loops, posted, smoker, patrol route, sentry route), 400 s calm, 30 Hz,
manager `doorStep`, shared `longPlan` token: **0 give-ups**, point changes 20 / 33 / 33 / 19 / 28 on the route guards,
posts within 0.1 m of spawn, **0 long plans** (none needed). Same numbers as the pre-fix base `5ac9d35b5` in the same
harness. The new `homeG` resets (`rejoinHome`, `!g`, pair talk) only restart the stuck window; the pair branch and
waits return before `homeStep`.

## 4. Tests

- `npm run typecheck:fast`: clean.
- `npx vitest run` guardHome, guardAiAlloc, guardAiAllocManager, alarmCall, alarmRepeat, posts, postsWiring,
  reviveClock, campusPosts, campusS1, pairs, pairsWiring, bodySearch, routeRunPair: **14 files, 194 tests pass**.

## Polish (not blocking)

1. Optional hard backstop (e.g. 60 s) on the revive walk and the alarm run for the never-calm / in-sight cases, in case
   a jam oscillates instead of stalling.
2. The revive walk takes no long plan: a body whose only way round is past `goTo`'s 3000 expansions walks to the
   partial dead end and is given up (bodies are noticed within ~17 m, so rare).
3. Pre-existing, also on `5ac9d35b5`: in the displacement probe the two timed-loop guards placed at (-26.3, -85.6) and
   (-39.7, -57.6) had a full path but `move` did not move them; they cycled `giveUp` through their points every ~5 s.
   Likely a degenerate spawn spot from the probe (not reachable in play by a walk); not from this fix.
4. `tests/guardHome.test.ts` header line 21-22 repeats "or a walk to a body to wake".
