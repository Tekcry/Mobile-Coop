# guard-rules S4 check A
Owner: Guard AI Build. Status: current.
Verdict: FIX

Checker A (Opus 5.5, AI behaviour and intent). Head 84a6c82c4, base 452e23035. Ran:
`npx vitest run tests/barkCause.test.ts tests/combatHearing.test.ts tests/archetypes.test.ts tests/coopGuardAi.test.ts`
(4 files, 67 tests, green) and `npm run typecheck:fast` (clean). Scope: only owned files changed (`src/ai/barks.ts`,
`src/ai/enemy.ts`, `tests/barkCause.test.ts`, `tests/combatHearing.test.ts`, `tests/coopGuardAi.test.ts`,
`docs/systems/ai.md`). Hot path: booleans and numbers only in `updateAwareness` / `onLevel`, getters read the array
without a copy, no `Math.hypot` in `src`. Wire: `BARK_EVENTS` append only (37 frozen, `heard` 37, `spotCall` 38), no
`src/net` edit. Lines original, under 90 characters, no reference names. Sight wins over sound in one tick (4a), a
glimpse during the suspicious moment wins (4b), calm transitions clear the moment, `riseN` moves only on rises,
`hearSearch` says `heard`, multiplayer reads the same `seen` (best target's rate) that drives the meter: all correct.

## Blocking
1. `src/ai/enemy.ts:2657-2661` (with the clear at 2116-2118): a stale sight latches for a guard who never changes
   level. `sawMoment` is set by any step with `rate > PERCEPTION.leak` and cleared only by `onLevel(.., cooldown |
   unaware)`, i.e. only on a transition. A guard who stays `unaware` (or a fought / cautious guard who stays in
   `cooldown` for good) and gets a short glimpse that never reaches `PERCEPTION.suspicious` (no arc shown, meter drains
   back to 0) keeps `sawMoment = true` indefinitely. Proved with a scratch test on the S4 stand-in: rate 0.5 for 10
   steps (meter ~0.15, still unaware), 3 minutes at rate 0 (meter 0), then a LOUD noise alone -> bark `investigate`
   ("Thought I saw something." in the rotation), `riseCause === RISE_SIGHT` instead of `heard` / `RISE_SOUND`.
   Why it blocks: A8 is "by what drove it" and P5 is "every detection explainable"; a sight minutes old with no
   feedback did not drive this rise. Worse, `riseCause` is S7's only hook: a lookout glimpsed below the arc earlier,
   later turned by footsteps (`hearTurn` -> suspicious), reads `RISE_SIGHT` and radios `spotCall` ("I saw something
   down there") for a sound, and J13 logs a sighting that never happened.
   Fix: end the calm moment when the evidence has drained. In the S4 block of `updateAwareness`, before the two sets:
   `if (this.aware.calmNow && this.meter <= 0) { this.sawMoment = false; this.heardMoment = false; }` (stepMeter has
   already run, so a seen step has meter > 0; `hear` raises the meter and `sendTo` sets `heard` after the clear, so
   both still read SOUND). Update the field doc / ai.md wording "since he was last calm" to "since he was last calm
   with nothing on his meter".
   Done looks like: a new `tests/barkCause.test.ts` case (sub-suspicious glimpse while unaware, meter drained to 0,
   then LOUD alone -> `['heard']`, `RISE_SOUND`) passes, and the same with the guard parked in `cooldown` with
   `aware.fought = true`; cases 1-8 stay green.

## Polish
1. `src/ai/enemy.ts:482-487`: `stimX` / `stimZ` are the last stimulus, not the cause's spot. In a moment with a glimpse
   and a noise, `riseCause` can be SIGHT while the stimulus is the noise (a `hear` after the sense step). Fine for S4;
   tell S7 its `spotCall` report point is "the last thing he turned to", or note it in ai.md.
2. `src/ai/enemy.ts:273-277`, `docs/systems/ai.md:118-122`: a tier-1 sound turn (`hearTurn`, meter up to
   `HEARING.turnMax` 0.45, no `heard` flag) makes him suspicious with `RISE_NONE`; the docs list NONE as a board task,
   a light, a body, a search call only. Name the `hearTurn` case (J13 will otherwise log "no cause" for a footstep), or
   count `turnT > 0` as sound.
3. Dogs: `rate` includes smell, so a dog's smell is `RISE_SIGHT`. One doc line.
4. A revived guard is a new `Enemy` (`enemyManager.ts` revive), so `riseN` restarts at 0: S7's per-slot last-`riseN`
   array must reset on revive / despawn or it can miss a rise. Hand to S7's brief.
5. RISE_NONE investigating rises use the `investigate` table, which now holds "Thought I saw something."; a non-sight
   rise can claim sight 1 time in 4. Today the board task's own line (`checking`, `lightOut`) holds the voice cooldown
   over it; worth a note, or a neutral-only table later.
6. Tests: no case for `sendTo` (S4-c: SOUND, `heard` held by the `checking` cooldown) or `checkLight` / `checkBody`
   (NONE -> `investigate`). `tests/combatHearing.test.ts:633` title still says "investigate bark".
7. Untracked `.vitest/` in the worktree: keep it out of commits.
