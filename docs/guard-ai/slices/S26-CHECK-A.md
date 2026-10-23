# S26 check A (correctness vs the brief) - fresh Opus, 2026-10-23

Verdict: PASS

Checked: feature/guard-ai-s26 at 1fcab6e3, S26's own diff `git diff origin/feature/guard-ai-s25 1fcab6e3 -- src tests`
against `docs/guard-ai/slices/S26.md` (origin/feature/guard-ai), the cloud brief + builder report, A155-A160.
Runs (CPU 54% at start): `npx tsc --noEmit -p .` clean; vitest `combatHearing`, `intruders`, `searchAreaWiring`,
`hearing`, `searchArea`, `twoIntruders`: 6 files, 88 / 88 pass. No e2e run (not in scope).

## Blockers

None. No hot-path allocation (`hearFight`, `reportHeard`, `hearSearch` allocate nothing; the cell centre is inlined
to avoid `NavGrid.center`'s array, the formula matches `navGrid.ts:397-402`), no `Math.hypot` in src, no graphics read,
no new `src/net` import, no wire or save change (`coopHost.ts` gains only an argument at three call sites).

## Done-looks-like, bullet by bullet

1. **Searchers hear and walk to it at search pace, then resume: holds.**
   - `enemyManager.ts:2591-2595` routes a searching or alerted non-melee guard to `hearFight` (coordinated + stealth +
     `COMBAT_HEAR.enabled`, `:2588`). `hearFight` `:2622-2646`: reach (`hyp3`), `tierOf` as S1 (walls only where they
     decide the tier, masking at the guard), `combatHearAct`; a searcher (not a sweeping crew) releases his plan claim
     and calls `Enemy.hearSearch` (`:2633-2637`).
   - `enemy.ts:1000-1022` `hearSearch`: spot = noise snapped within 4 cells, `spotSet`, `spotLookT` 0, `searchK` kept,
     `planPoint` false, `rush` false, `heardT` 0, `investigate` bark ("I heard something." is in `barks.ts:56`) gated by
     `COMBAT_HEAR.bark`. The search branch (`enemy.ts:2434-2489`) skips the next-point pick while `spotSet`, walks at
     `paceSpeed(rush=false, searchPace)`, looks `searchSpec(kind).look`, `searchK++`, and since `planPoint` is false no
     `searchDone` is called; the next pick continues the plan / ring. Leash and room clamps (`:2458-2464`) still apply
     after the re-aim, so a high-security post keeps his leash and a device search its room.
   - Crouch-walk never heard: `noiseRadius` returns 0 in the silent band (`movement.ts:151-152`), and both callers
     gate on `> 0` (`gameState.ts:1905-1906`, `coopHost.ts:1297-1299`). Sprint reach: test asserts `STEP` 6.5-7.5 m
     read from the game (`combatHearing.test.ts:33,168-169`).
2. **Combat guard out of sight relocates the LKP, heard not seen: holds.**
   - `reportHeard` (`enemyManager.ts:2656-2666`) -> `reportIntruder(slot, .., false)` -> `IntruderBoard.report`:
     `locT` 0 always, `seenT` only when seen (`intruders.ts:68-69`); `mirror` keeps `sightT = seenT` (`:2725`), so the
     e2e's "`em.lkp` moves, `em.sightT` not reset" will hold.
   - The guard's hunt reads the slot: `knownSpot` -> `huntPos` -> `lkpOf(hunt)` (`enemy.ts:1316-1323`); the slot's
     chase field rebuilds on a move >= one cell (`slotFlowStep`, `enemyManager.ts:2742-2770`); roles read `flowOf`.
   - S25 plan: a heard centre > `PLAN_MOVE` from the plan resets it at once (`:2665`); `buildPlan` sizes the area from
     `locT` (`:2862-2863`, A157). Test (e) proves the full chain: claim released, plan reset, the other searcher's
     `finishBy` is a no-op and his next point comes from the plan rebuilt round the step.
3. **G139: holds for the board, partly for the "turn".** `slotFor(by)` locates only the maker (`:2640-2642`); the hunt
   moves only when `h < 0 || h === slot || locT[h] >= 8` (`:2644-2648`). Test (d) checks B located, A untouched, hunt
   stays A, then B after 9 s. Gap (not a blocker, see note 1): a guard in combat who hears B while A is fresh does not
   turn at all.
4. **Lures pull searchers, never combat: holds.** `combatHearAct` (`hearing.ts:122-128`): state 2 with a lure or a
   by-null noise -> 0; state 1 lure -> 1 when `searchLures`. `hearFight` skips the guard in combat before any ray
   (`:2629`). Test (g): bottle and glass move the searcher, not the combat guard; no slot moves.
5. **Calm guards and parked modes unchanged: holds.** Parked / `enabled` false / non-stealth: `fight` false and the
   loop is the old one word for word (the `alerted` skip moved below the fight branch, `:2596`). Calm levels
   (unaware, suspicious, investigating, cooldown) never enter `hearFight`. Melee kinds keep `e.hear`. Tests (i) and
   "calm guards" cover all three switches and the calm path.
6. **Solo on slot 0: holds.** `localRef.id` is `'local'` (`gameState.ts:539`), the same ref `playerRefsInto` gives the
   AI first (`:986-993`), so sightings and heard noises share one slot. Test (j): `lkp` / `lkpValid` / `freshest` 0,
   `sightT` runs on.
7. **Co-op client noises identical: holds for every client noise the host hears.** `coopHost.ts:725` (takedown),
   `:1299` (steps), `:1307` (quiet shot) pass `r.ref.id`, the same id S24's `noise` passes (`:1308`). The host does
   not hear a client's landing, roll, fence rattle or hold at all (pre-existing, no S26 change).

## Tests: real, not tautologies
- `combatHearing.test.ts` drives the real `EnemyManager.hear` / `hearFight` / `reportHeard`, the real
  `Enemy.hearSearch` / `knownSpot` / `tell` on the prototype, a stub ray that is actually consulted (b asserts it was
  called, c and g assert it was not), and the real S25 plan objects (e). The table test re-states the rule in `want`
  (`:154-158`), which is close to a mirror, but it enumerates all 96 cases and the defaults are pinned separately.
- `intruders.test.ts` (`locT` vs `seenT`, `clear`) and `searchAreaWiring.test.ts` (`areaRadius(0.5)` after a heard
  report 10 s after the sighting) test exactly A157.
- Not unit-tested (acceptable): the walk itself to the heard spot and the resume (the e2e scenario covers it), the
  leash clamp after a re-aim.

## Correctness notes
1. **Combat guard hearing B while A is fresh does nothing visible** (`enemyManager.ts:2636`, `heardInFight` only
   restarts the throttle). The done bullet says "turns (combat)"; build step 3 says "in combat that is all". Brief is
   inconsistent; the build step was followed. If the lead wants the turn: a combat look (`turnT` towards the noise,
   no hunt change), new small `Enemy` method, `hearTurn` returns early for alerted guards.
2. **That same no-switch call restarts his 1.5 s throttle** (`:2636`): for 1.5 s he cannot hear A's own steps. Restart
   only when he took the slot, or keep it (it is the A160 "one re-aim per 1.5 s" read loosely).
3. **Builder deviation 3 (lead call), acceptable as built:** a calm (body / device / pair) searcher's body-noise act 2
   reports the slot and sets his hunt (`:2640-2648`), per build steps 1 and 3. Side effects: the slot turns valid,
   `lkpValid` true, so `deviceFresh` (`:908`) is false and alarm reinforcements go to the heard spot, not the device;
   a sweep team's `begin` (`sweepTeam.ts:96`) centres on it. His own ring stays on his stimulus (`searchAt` sets
   `searchOwn`, `enemy.ts:1371`). Reasonable (a heard intruder is better news than a device trip).
4. **Searching guards left the S1 calm path** (intended): they no longer get `hearTurn`'s meter bump (capped 0.45,
   never decisive) and are no longer perceivers of a `noise` incident, so a noise only searchers hear files no S2
   incident. Harmless: the searcher goes himself.
5. **Deviation 2 (hunt set directly plus `tell`)** is right: `tell` alone only sets `pendingHunt` for an unalerted
   guard (`enemy.ts:1299-1304`). Edge: a searcher with a `pendingHunt` A from an earlier call who switches to B keeps
   `pendingHunt` A, so going to combat without a sighting he hunts A (`enemy.ts:1816`). Rare.
6. A heard report of a forgotten slot by a guard in combat revives it (`valid` 1, `seenT` old); it stays because he
   now hunts it (`huntingOf`). Correct.

## Polish
- Player-made noises still passing no `by` (outside the brief's list): body drop (`stealthSystems.ts:348,372`),
  strike (`strikeController.ts:242`), client assist takedown (`coopHost.ts:786`), throw-KO (`coopHost.ts:848`). Host
  and client are symmetric, so no co-op asymmetry; a follow-up can tie them to their maker.
- The host's LKP ghost (`gameState.ts:2600-2609`) hides once a heard report moves the slot > 1.5 m from the captured
  pose; it never moves to the heard spot. CT's ghost is the last sighting, so fine for now; worth a look on the walk.
- A heard noise does not extend the search clock: a searcher can time out on the walk to the heard spot. Tuning,
  if Michael sees it.
- Client step noise lacks the host's `SURFACE_NOISE` and suit factor (`coopHost.ts:1298` vs `gameState.ts:1905`),
  pre-existing.
- `combatHearAct` table test mirrors the rule; one or two hand-written spot rows would read clearer.
