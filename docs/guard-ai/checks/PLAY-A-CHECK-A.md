# Play A check A - PR #588 (feature/guard-ai-home, head 5c795a73e)

Checker A (fresh Opus, behaviour and play). Read-only. Intent: PLAY-PASS.md section 2 (P1-1, P2-1, P2-2, P3-5) and
section 3 Slice A.

## Verdict: FIX

1. **The 15 s revive cap drops reachable bodies (P3-5 overshoots; normal-play regression, VISION rule 8).**
   `enemy.ts` calmDecide searching branch: `reviveT += dt; if (reviveT < GIVE_UP.runMax) ...` is a flat walk-time cap at
   revive pace (`walkSpeed * PACE.revive` = about 1.1 m/s), so it covers only about 15.5 m of path. Bodies are noticed
   out to about 16.6 m in full light (`bodyNotice`), and any detour (a wall, a window seen through, a fence) pushes the
   path past that. Probe (calm officer, open test floor): body 12 m straight / 17.8 m path round a wall: **gave up at
   15.0 s, 1.5 m from the body**. He then searches with the body as his first search point (`searchAt` set the stimulus
   there), stands on it and never wakes him; `b.found` is already set, so no other guard will either. A guard walking up
   to a downed mate and ignoring him is not explainable.
   Fix: give the revive walk up only when it cannot get there: no path (`goTo` null with `routeMiss` / `routeNear`) or
   no progress (the `homeStep` window: under `GIVE_UP.homeMove` m in `GIVE_UP.homeT` s), not on elapsed time. Add a
   guardHome case: a reachable body with a path over 16 m is woken; the cut-floor body (no path) is still given up.

## Checked and fine

- **Normal patrol unchanged.** Probe on the S1 grid this branch builds (`campusV2` [1]; 8 guards here, #525 not in):
  every guard walked his route / held his post for 400 s with `walker.giveUp` spied: **0 give-ups**, timed loop 2/3
  on schedule (38 point changes). Waits, timed stops, post standing and the talking-pair branch return before
  `homeStep`, so the stuck window does not run while he stands. Guard-guard jams are freed by the S20 squeeze-past
  before 10 s. A post guard who gives up gets his real post back at the next `rejoin` (cooldown or unaware entry, lure
  done, breaker end).
- **homeY.** Set at spawn from `nav.heightAt(spawn, SquadSlot.y)`, carried by `inherit` (woken guards, also from a
  carried body); reinforcements / sweep teams take their spawn storey; co-op clients run puppets, the host runs
  `Enemy`. The 1.2 m test is only used for posts (`away`); routes on single-layer ramps still resolve (lineClear ends on
  the only layer). Multi-storey routes behave as before (they were already 2D).
- **Alarm.** `alarmStep` is a faithful extraction plus the give-up; `raiseAlarm`, `alarmOpen`, `alarmRepeat` and the
  radio call are untouched. `alarmQuit` clears on leaving alert; `assignAlarm` skips only barred guards and picks the
  next. S1 probe, grunt runner from every walkable spot within 30 m of the panel (213 starts): 185 reach it (max
  14.8 s), 17 drop at once (no path within 3000, as intended), 11 drop at 15 s. Of those 11, 9 are pre-existing snags
  (stuck 1.5 m from the panel or at (20.8, -80.5)) that used to freeze for good; 2 (path 47-50 m) were still moving.
- **Lure walk back** capped at `lureWalkMax`; face, done, `rejoin`, then the calm walk home: no freeze.
- **Hot paths**: no closures or temporaries added; `hyp2` used. `homeLongPlan` (20000 expansions) costs about
  1.7-3.3 ms in node, once per point.
- `npm run typecheck:fast`: clean. `tests/guardHome.test.ts`: 10/10. AI batches (45 files: alarm, alarmRepeat,
  awareness, body search, breaker, revive clock, doors, polish A/B/2, spacing, pairs, posts, locked-door path, response,
  search area, sector restart, squad, two intruders, incidents, alloc, sweep, campus S1, course station, marlow N4,
  route-run pair, campus posts, co-op guard AI, replay determinism, perception and more): 747 passed, 0 failed.

## Polish

1. The alarm run's 15 s cap is time, not progress: a runner still closing on a 47-50 m path drops it (2/213 S1 starts).
   A progress window (as `homeStep`) would keep those.
2. `homeG` / `homeT` / `homeLong` survive a direct `walker.rejoin` (lure done, breaker end) and a pair talk; a stale
   window can skip the long plan once. Reset `homeG` in those paths or when `walker.step` returns null.
3. A post guard given up while `away` (another storey, no way up) re-runs the 20000 long plan every ~5 s for the calm
   spell (the given-up spot is re-aimed at `homeY`). Harmless, but wasted A*.
4. A post guard who gives up stands off his post with no bark: a short "can't get through" line would make it readable.
