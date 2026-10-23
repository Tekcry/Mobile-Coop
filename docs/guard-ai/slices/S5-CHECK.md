# S5 - Posts and map data (fresh checker, 2026-10-23)

Commit 80efb8b4 on `feature/guard-ai-s5`. I reviewed `git diff 7a4167b2 80efb8b4` in full: `src/ai/enemy.ts`,
`enemyManager.ts`, `incidents.ts`, `guardAiData.ts`, the three modes, `tests/postsWiring.test.ts`,
`tests/incidents.test.ts`, `scripts/e2e-sectorops.mjs` and the docs. I checked it against BRIEF goal 7, M1, A10, A12
and A17-A19, PLAN rows S5 / S5b and "Data shapes", STATE "Open" (Course Ready K1-K4), and `slices/S5.md`. I also
re-read the pure module `src/ai/posts.ts`.

## Verdict: PASS

Nothing is broken or unplayable.
- A high-security post is never sent by the board.
- He is lured to his leash edge and back.
- Every combat, search, revive and alarm path is clamped or gated to his leash.
- Guards without a post, or on a normal post, behave exactly as before.

The items below are polish, or work that belongs to S4 / S5b. The PASS assumes the laptop's e2e runs are green: the
new `e2e-sectorops` part-1 block has not been run by anyone yet, and nor has `e2e-ctcourse` for the courseMode line.

### Re-run here (desktop, light runs only, as asked)
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint` on every changed src and test file: exit 0, no output. The e2e script is lint-ignored;
  `node --check scripts/e2e-sectorops.mjs` passes.
- `npx vitest run` on postsWiring, posts, guardAiData, incidents, radioWiring, hearing, enemyManagerDespawn,
  sectorRestart, securityBodies, ctcourse and sectors: 11 files, 201 / 201 passed.
- `npx vitest run` on coopTorches, awareness, campusS1 and perception: 4 files, 105 / 105 passed.
- Not run, as asked: e2e, the full `npm run check`, the full `vitest run`. They go to the laptop: `e2e-sectorops`
  (part 1, the posts block), `e2e-ctcourse` (courseMode line), `e2e-stealth-ai` and `e2e-ct-warehouse`.

### Verified
- **The board never sends a high-security post.**
  - `fillView` sets `GV_POSTED` for `e.secure` (`enemyManager.ts:765`).
  - `free()` excludes it (`incidents.ts:416`), and every assignment goes through `free()`: investigate, light check,
    the `callR` fallback and the missing pair (unit test at `postsWiring.test.ts:208`).
  - The lure paths replace the perceiver entry, so he is never reported to the board: `lightsOut` (`:434`), shots
    tier 2 (`:944`) and noise / distraction tier 2 (`:987`). At tier 1 he only turns, as anyone does. Close gunfire
    (tier 3) or already alerted: combat.
- **The lure ends.**
  - `PostLure` (`posts.ts`) caps the walk out at 12 s (`:176`). The look lasts 5 s and the face 0.8 s.
  - `lureStep` (`enemy.ts:863`) reports arrival against the previous step's target. `start` / `enter` clear `issued`,
    so a stale arrival never ends the walk back.
  - On done it calls `walker.rejoin` once. The post centre is the nav-snapped spawn cell (`spawn`,
    `enemyManager.ts:661-664`), so the walk back always has a walkable goal.
  - Facing comes back first from the face phase (post yaw), then from the walker's spawn yaw (= `slot.yaw`).
- **No re-trigger loop.**
  - A new lure within 1 m of the current look point during walk or look does not restart him (`enemy.ts:854-858`).
  - A stationary repeating source can restart him only after his look ends, so it is bounded by the source's life.
  - A tier-1 `hearTurn` during a lure is ignored: the `unaware` branch checks `lure.active` first (`:1356`).
  - The lure sets only a turn's meter floor: capped at `HEARING.turnMax` 0.45, which is below `investigate` 0.6;
    a light gives suspicious + 0.02. It sets no `heard`.
  - `turning` holds off the linger rule (`:1297`), so a lure never turns into an investigation (e2e asserts it).
  - A sighting, a search or combat cancels the lure (`onLevel`, `:952`).
- **The lure through the alert levels.**
  - Suspicious with no sighting: the lure keeps going (`:1381`).
  - Suspicious with a glimpse: he stops and looks, and the lure pauses (it is not lost).
  - Cooldown: the lure runs.
  - Grabbed: `lureTo` refuses. A released guard is alerted, which cancels the lure.
- **No path out of the leash for a high-security post.**
  - Calm investigate / search spots, from a body, a radio check (`enemyManager.ts:711`) or `pairSearch`, are clamped
    (`enemy.ts:1436-1438`). A search after combat is clamped too (the LKP sweep).
  - Revive: only a body within leash + 1 m (`:775`). The walk to it is not clamped, so at most about 0.4 m past the
    circle.
  - Alarm run: `assignAlarm` skips a panel outside leash + 1 m (`enemyManager.ts:498`). `runAlarm` has no other caller.
  - Combat:
    - `chasePoint` is clamped (`:1777`), which covers the flow field to the LKP and the melee chase. The enforcer push
      uses `chasePoint` too.
    - The strafe point is clamped (`:1647`).
    - `pickAdvance` / `pickCover` skip cover outside the leash (`:1792`, `:1829`), including the flanker and the
      sniper relocation.
    - A target or LKP more than 1.5 m outside the leash puts him on the `outside` hold back to `this.post`
      (`:1542`, `:1598-1603`). `this.post` is never reassigned after the constructor.
  - A radio contact join, a voice shout, `callAlert` or a released takedown all land in combat, so the clamps above
    hold.
  - The light check (`lc`) only starts from the board's `sendTo`, which never reaches him.
  - Parked modes (`coordinated` false: Hunter, Mission) still use `e.hear`, but the investigate spot is clamped.
- **No change for guards without a post or on a normal post.**
  - `inLeash` returns true unless `highSecurity`.
  - `secure` is false, so the `lureTo` branches, `GV_POSTED` and the panel skip are off.
  - `leashed` passes the point through.
  - The strafe and search clamps are gated on `highSecurity`.
  - `lure.active` stays false, so `turning`, `calmDecide` and the `onLevel` cancel do nothing.
  - `searchAt` revive gating returns true.
  - `placeSlot` with no `post` sets `postDef` null, `profile` 'standard' and a `section` that nothing reads yet.
  - `noisy` starts as `mapNoisy`, which is `[]` today (no live map has `guardAi`). Sector Ops sets `s?.noisy ?? []`,
    the same as before (no sector has `noisy`). No other `setNoisy` caller exists.
- **The mode one-liners are safe.**
  - `courseMode.ts:667` (Marlow Yard) and `infiltrationMode.ts:96` call `placeSlot` after `spawn` / `setPatrol`. No
    current slot has a `post`, so nothing changes.
  - `sectionAt` handles an undefined layout (`guardAiData.ts:154`).
  - Clear mode (parked) does not call it, which is correct.
  - Sector restart refills through `fill`, so posts survive a restart.
- **Load validation cannot throw.**
  - `validateGuardAi` (constructor, only when the map has `guardAi`) and `validatePosts` (per section load) run only
    under `import.meta.env.DEV`, and report through `console.warn` (`reportGuardAi`).
  - The e2e serves `dist/`, so no warnings there.
  - Every live map's sectors validate to `[]` (`postsWiring.test.ts:268`).
  - `CAMPUS_POSTS` (Course Ready's interim table) is untouched; map data stays with the map teams.
- **Hard rules.**
  - No allocation added in hot paths: `lureOut`, `lureP`, `lureGoal` and `leashTmp` are scratch; `clampToLeash` /
    `lurePoint` write into `out`.
  - The only new `new` is the `PostLure` field. `hyp2` everywhere; `posts.ts` uses `Math.sqrt`, never `Math.hypot`.
  - Strict TS is clean. No graphics state read.
- **The e2e block** (`e2e-sectorops.mjs:1800`) matches the PLAN acceptance:
  - The vault guard is never sent; the free guard is.
  - Phases go walk -> look -> back -> done.
  - The edge reached is 2.5-3.35 m and the look lasts >= 5 s.
  - The sweep stays within 0.6 + 0.15 rad. The tolerance is for the calm turn, as reported.
  - The worst level is suspicious. He ends back on the post facing it.
  - A search 15 m off stays within 3.4 m.
  - A normal post is sent past 3.5 m.

### The K4 promise (two lured keyholders, two single takedowns)
The code supports it. The e2e does not prove it: the e2e uses one guard and no takedown.
- Each keyholder is lured on his own, to his own leash point, facing the lure for >= 5 s.
- A tier-1 noise during the lure does not turn him.
- A choke (non-lethal) takedown's noise has a 1.2 m reach. Its tier 2 is 0.6 m, so it cannot re-lure the second
  keyholder.
- A lethal strike (3 m reach) re-lures the second keyholder toward the takedown spot only if he stands within 1.5 m of
  it. This is a note for Course Ready's K4 spacing.
- The board never sends either keyholder. So the solo order is: lure, choke one, choke the other while he still looks.
  It fits in the look window plus a re-lure.

### Revive loses the post
Not broken now. `EnemyManager.revive` (`enemyManager.ts:571`) builds a fresh `Enemy`, which already drops the slot's
route, `hold`, `info` and squad for every guard. That was true before S5. A revived keyholder becomes a free searcher,
which makes the level easier, not unplayable. The other keyholder can be the reviver only if the body lies within his
leash + 1 m. It becomes a must-fix in S4, which rewrites revive: carry `postDef` / `postYaw` / `section` / `profile`, or
call `placeSlot` again.

## Fixes

None blocking.

## Polish list (later slices or the feel pass)
1. **The walk back has no cap.**
   - Where: `posts.ts:182`.
   - `LURE.back` waits for an arrival with no timer. If the post becomes unreachable, or another body holds him more
     than 0.35 m off it, he stands in `back` for good. Then `lure.active` keeps `turning` true, which keeps the linger
     rule off, and he never faces his post again.
   - It is rare: the post is the snapped spawn cell, and guards push doors open. Only Sector barrier closures block
     nav.
   - Done looks like: `back` gives up after `POST.lureWalkMax` and goes to `face` / `done`, plus one unit test.
2. **A clamp point behind a wall can route him out of the leash.**
   - Where: `enemy.ts:858-873`, `:1436-1438`.
   - `lurePoint` / `clampToLeash` are geometric. When the clamped point sits behind a wall, `goTo` A* paths around,
     which can leave the circle. The lure walk is capped at 12 s, so this is bounded; the search spot is bounded by
     `investigateMax` and the unreachable skip.
   - This matters for door posts whose leash spans the wall (K1-K3, leash 5).
   - Done looks like: pull the look / search point toward the post until `nav.lineClear(post, point)`, or fall back to
     looking from the post.
3. **A K4-style e2e scenario.**
   - Two high-security posts 3 m apart, one lure. Choke one with the test hook. The other is still in `look`,
     unaware, and is not re-lured. Then choke him.
   - Best done with Course Ready's real K4 data, in their suite or ours once it lands.
4. **The linger rule is off while a lure is paused by a glimpse.**
   - Where: `enemy.ts:1297`.
   - `turning = lure.active` even when `rate > 0` holds the lure. So a faint, steady glimpse that keeps the meter
     between 0.15 and 0.6 holds him suspicious, staring, instead of the 3.2 s linger walk-over. The player controls
     this, so it is not stuck.
   - Done looks like: `turning = turnT > 0 || (lure.active && rate <= 0)`.
5. **Validation reads the slot's x, z.** `validatePosts` checks route points against the slot's x, z, but the post
   centre is the nav-snapped spawn cell (up to half a cell off, more if the slot is off the nav). Warnings only.
6. **The look-sweep and turn-back notes from `S5.md`.** The sweep's peak turn rate is above the calm turn, so the
   sweep is a little narrower than +-0.6. `returnFace` 0.8 s is shorter than a big turn back; the walker finishes it.
   There is no own lure bark.
7. **An unreachable lure goal re-runs A* every tick.** `goTo` re-runs `findPath` each tick while `routePath` is
   empty. An unreachable look point does this for up to 12 s. This is the existing pattern for investigations; worth
   one throttle when the perf pass comes.
