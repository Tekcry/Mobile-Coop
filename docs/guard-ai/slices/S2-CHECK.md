# S2 - Incident board (fresh checker, 2026-10-23)

Commits 661c258a (S2), 977cf0f5 (fix), b19fe74b (fix 2). Reviewed `git diff cd37c3e8 b19fe74b -- src tests scripts` in
full against BRIEF M1, goals 4-5, A2-A12; PLAN row S2; design sections 3 and 10; `S2.md` (build, fix round, fix round
2); `S1-CHECK.md` fixes 1-4.

## Verdict: PASS

Nothing is broken or unplayable. The board does what goals 4 and 5 (part) and design 3 ask. Every incident has a bound
on its life. No guard can be left stuck investigating by the board. The items below are polish or belong to later
slices.

### Re-run here
- `npm run check` under the desktop `heavy.lock`, taken atomically at 07:57 and released at 08:04: exit 0. Lint has 0
  errors (41 old warnings, none in the S2 files). 291 files / 3199 tests pass (8 skipped). Build OK. The run also
  picked up the other agents' new untracked test files, and they passed too.
- Before that: `npx vitest run tests/incidents.test.ts tests/hearing.test.ts tests/perception.test.ts` passed
  80 / 80.
- e2e not run, as asked. They are already green on the desktop: `e2e-stealth-ai` twice and `e2e-sectorops`; also
  `e2e-ct-warehouse`, `e2e-ctcourse`, `e2e-coop` and `e2e-netmove` on 977cf0f5.

### Verified
- **One incident per event, merging.**
  - Noise, shots and distraction merge within 6 m (3D) and 10 s of the last report.
  - A light merges by its id, or `100000 + group` for a circuit.
  - The bulb's pop and the round's impact are plain noises within 6 m on the plan, so they merge into the light. This
    works because `stealthSystems.shotRay` now calls `lightsOut` before `noise`.
  - A light takes over a noise still waiting for its investigator (`incidents.ts:369`). A merge only adds perceivers.
  - Gunfire never merges into a plain noise, and `missing` never merges.
- **Who goes** (`best`, `incidents.ts:437`).
  - Only the 3 nearest by straight 3D distance get a path query. Score = path length x officer 1.6 x cooldown 0.8.
  - Ties go to the lower view index. With no path for any of the three, the straight-nearest goes.
  - `free()` excludes melee, dogs (`fillView` flags `def.melee || e.dog`), held, busy (passive, alarm run), down,
    tasked guards, and any level other than unaware, suspicious or cooldown. An alert or searching guard can never be
    grabbed, and `Enemy.sendable` checks again.
  - If `sendTo` refuses, the next tick sees the task as -1 and the incident closes, so nothing leaks.
- **Lights.**
  - A light sends 2 only when a second guard who saw it is within 15 m of it (`incidents.ts:521`), else 1.
  - Perceivers are guards in the room of a fixture of that light or circuit, or guards with the fixture in view plus
    one static line-of-sight ray. The 25 m / 14 m through-wall rule is gone in coordinated modes. `lightsOutOld` is
    the unchanged old body.
  - A light nobody saw sends nobody and closes after `mergeT`, unless a heard pop merges into it first.
  - No NaN y: `y === y` falls back to `heightAt + 2.5`, and `heightAt` returns 0 off the nav.
- **The light check is bounded** (`lightCheck.ts`).
  - The walk in gives up at 30 s. The look at the light lasts 2 s.
  - Each ring point gives up at 12 s whether or not a path is still being followed (`:145-148`). A ring point
    without a clear nav line from the light's anchor is pulled in halfway, else skipped. The worst case is 86 s.
  - `AlertInput.hold` is true only while `lc.active`. `onLevel` stops the check on any level but investigating. A
    glimpse (meter >= investigate) drops it.
  - At the end, `standDown()` sets unaware (cooldown only if he has fought) and `walker.rejoin` puts him back on his
    route, so he ends calm on his route.
- **Escalation and closing.**
  - A guard down (gone from the list or `GV_DOWN`) or held for 25 s raises `missing` at his last seen spot. The 2
    nearest free guards go: the lead to the spot, the cover 5 m short of it on his own side. A `missing` incident
    never escalates again.
  - The board stores guard ids (`Enemy.num`), never list indices. A revived guard is a new `Enemy` with a new num,
    so no incident id carries over. `despawnAll` calls `clear`, which calls `board.clear`.
  - Pool: the 16 slots have every exit bounded: done investigators, `mergeT` with no candidate, `giveUp` for
    `missing`. When all are open, `alloc` drops the oldest open one, so the pool can never jam.
- **Paces** (`PACE`, `enemy.ts:145`).
  - Patrol stays 1.1 (`CHECK_PATROL_PACE` holds).
  - Coordinated: investigate 0.85, calm search 0.75 with the calm turn. A search entered from alert keeps 1.3 and the
    aimed turn (`combatSearch`, which only `onLevel` sets; the LKP-arrival path at `:1142` calls `onLevel` too).
  - Walking to a revive stays at 1.3.
  - Uncoordinated: `investigatePace`, `searchPace` and `aimedMotion` reduce exactly to the old 1.2 / 1.3 and
    `alerted || searching`.
- **A patrol wait of 0** passes straight through (`patrol.ts:113`). The branch sits under `else`, after the
  loop-clock branch, so loop routes are untouched. The warehouse runner and officer routes (`warehouseSectors.ts:109,
  160, 162`) no longer freeze.
- **S1 checker fixes.**
  1. `e.taken` is skipped in `hear` (both modes) and in coordinated `noise`, and the board never sends a held guard.
  2. e2e `shots`: an extra 2.6 s step, then "still not walked over".
  3. e2e-sectorops: no guard who was calm before the suppressed shot turns.
  4. Uncoordinated `tierOf` uses the exact old `d > r x MUFFLE` ray (checked against 0284c523).

  The S1 polish items on re-aiming (`hearTurn` returns once he has a task), the linger pull (`AlertInput.turning`) and
  the 2D pick (now 3D) are done too.
- **`coordinated = false`.** No board tick, the old `hear` / `noise` / `lightsOut`, the old paces and the old turn.
  `turning` and `hold` are only set by coordinated-only paths.
- **Hard rules.**
  - `incidents.ts` and `lightCheck.ts` import only `core/mathx`, `./incidents` and a `type` from `navGrid`: no
    Babylon.
  - `tick`, `report`, `follow`, `ackAll`, `fillView`, `boardStep` and the `hear` / `noise` loops allocate nothing:
    typed pools and scratch that grows by doubling only, `hyp2` / `hyp3`, no `Math.hypot`. The closures (`paths`,
    `lcWalker`) are made once.
  - Strict TS and `import type` hold (tsc in the build is clean).
- **Tests and e2e.**
  - The unit tests cover every rule above: count, weights, exclusions, ties, 3D, light 1 / 2, far witness, no
    witness, dedupe, pop / impact merge, takeover, merge window, close, missing pair geometry, held escalation, pool
    cap, the fix-round light pair, the stuck ring point, and combat vs calm search pace.
  - No e2e assert was weakened:
    - `lights` gained a "light incident at (0, -3)" check.
    - `light pair` is new and strict: exactly two go, the third moves less than 1 m, both stand down unaware and are
      back on their routes, 0 escalations.
    - `shots` and `e2e-sectorops` were tightened (S1 fixes 2 and 3).

## Fixes

None blocking.

## Polish list (later slices or the feel pass)
1. **A full pool can close a new `missing` incident.**
   - Where: `incidents.ts:599` / `:375`.
   - With 16 open, `report('missing')` inside `follow(s)` can evict slot `s` itself (when it is the oldest). Then
     `busy === 0` closes the brand-new `missing` at `:607`.
   - Done looks like: `alloc` skips the slot being followed, or the escalation is queued until after the loop.
     Needs 16 open incidents, so it is rare.
2. **An evicted incident loses its follow.** `alloc` dropping an assigned incident means its investigator, if he
   later goes down, never raises `missing`. Fine at 16 per section; S5 should revisit with per-section boards.
3. **Noise investigators still end in the 45 s cooldown.** Design 3 says no caution for noise or light. Goal 4 (lights)
   is met; noise ending in cooldown is the old behaviour, as the open items say.
4. **The pace table is incomplete.** Design 10 also asks for a 1 s stop at doorways while investigating, a 1-2 s
   stop every 4-6 m while searching, and a cautious patrol at 0.95. None is in S2 (the caution pace comes with S3).
5. **Barks.**
   - `checking` has no `{room}` yet.
   - `ack` "Copy." always goes over the radio; design 10 has the radio only if they were radioed, else a glance.
   - Text only, host HUD only (as reported).
6. **Not quite allocation-free.**
   - `NavGrid.center` returns a fresh tuple. `LightCheck.pickRingPoint` / `step` call it at the start of each stage
     (at most about 10 per check), so the docstring's "no allocation per step" is near, not exact. A `centerInto`
     would close it.
   - `findPath` in `paths.len` allocates (at most 3, or 6 for a pair, per new incident).
   - `lightStep` and `calmDecide` return fresh decision objects (an old pattern).
7. **A light over unwalkable ground floors at y 0.** `lightsOut` takes the light's floor from `heightAt`, which
   returns 0 off the nav (over racking, a void), so on a multi-storey map the floor can be the ground. This is the
   report's "rough storey pick".
8. **A wait of 0 drops the facing at that point.** `patrol.ts:113` passes through a 0 wait with no `faces` look, so a
   0 point no longer faces anywhere. Only Kestrel's editor (paused) makes one-point `wait: 0` guards
   (`src/editor/mission.ts:714`). Worth one line in `docs/systems/ai.md`.
9. **The board sees a revived investigator as gone.** A KO'd investigator revived inside 25 s is a new `Enemy`, so
   `missing` still fires for him. Acceptable until S4 (bodies, caution).
