FIX: 1 blocking item (B2 one-mover rule regression). Everything else in group B, C2 and C3 passes.

# Guard AI polish - check B (group B, C2, C3 and the A/B seams)

Fresh Opus checker, 2026-10-24. Branch `feature/guard-ai-polish`, head 4ea3f562, `git diff origin/master...HEAD`.
Line numbers are from 4ea3f562.

## Blocking

1. **B2 drops the one-mover hold when the point's role cover is re-picked in the middle of his bound.**
   `enemyManager.ts:3361-3362` counts a role trip only when `coverIdx === out.cover[k]`, and `out.cover` comes from
   this tick's `assignRoles`. While a guard is in `seekCover`, `inp.inCover` is 0 (`enemyManager.ts:3318`), so
   `held = -1` (`squadRoles.ts:422`). The cover he is walking to then has to pass the point's advance rule again
   (`squadRoles.ts:326`: it must be `advanceGain` = 2 m closer to the LKP than he is). So for the last ~2 m of every
   point bound, his role cover becomes another cover further forward. He keeps walking to the old one:
   `travelling` is true (`enemy.ts:2901`), so he does not re-bound. The manager no longer counts him as going. If the
   point's new `moving` is 0 (the overwatch is moving, or flank-first), the flank is let go too, and two guards bound
   at once. Before B2, any `seekCover` held the flank.
   - Proof, scratch probe (squadWiring's layout plus one cover at (0.5, -5); the point in `seekCover` to cover 0 at
     (0, -8.6)): with `roleTrip` true the point's role cover becomes 5 and `flank.moving` is true. With `roleTrip`
     false (the 4.97.1 rule) `flank.moving` is false.
   - The e2e will not catch it: `scripts/e2e-stealth-ai.mjs:2745` counts `mv` with the same test
     (`coverIdx === roleCover`).
   - Smallest fix: "a trip to his role cover" has to mean the trip `boundTo` started, not this tick's pick.
     - In `Enemy`, add a `roleBound` flag. `boundTo` sets it true on success (`enemy.ts:2977`). Clear it wherever
       `seekCover` starts from `pickCover` (the open-wait pick, `enemy.ts:2944`, and the other `setState('seekCover')`
       sites) and when the state leaves `seekCover`. Expose it through a getter.
     - In the manager, use `ptGoing = ptTrip && (!POLISH_B.roleTrip || who[pt].roleBound)`, and the same for the
       flank.
     - Count the e2e's `mv` with the same flag.
     - Add a guardPolishB case: the point mid-bound with his role cover re-picked keeps the flank held.

## Evidence per item

**Tests run (one worker).** All 11 files pass on HEAD (215 tests): guardPolishB, combatHearing, searchAreaWiring,
squadRoles, breaker, guardRelight, consoleFault, lockedDoorPath, perception, searchArea, squadWiring. eslint is clean
on the changed B/C files.

**Do the riskiest tests fail on master's behaviour?** I ran them in a scratch copy of HEAD with each undo const set to
the 4.97.1 value:
- B1, two cuts in 60 s: fails ("expected 1 to be 2").
- B1, walker knocked out: fails when run alone (`-t "knocked out"`). In the full file it passes even with
  `retry = Infinity`, because the file's `afterEach` puts `retry` back to 20 after the first test.
- B4: fails in 3 searchAreaWiring cases, including the new "12 new points".
- B5: fails ("expected [0,-1] to not include 0").

The undo paths equal master for B1 and B5, and are near it for B4. B8 fails on master by reading: master casts the ray
before `consoleBusy`.

**B1 (A168): a cut circuit nobody fixed is relit. PASS.**
- The same cut noticed again with no open incident and no walker turns from tampering into a fault, the reset walk
  (`enemyManager.ts:1191-1198`). While the check is open it merges as before.
- `relightStep` (`:1246-1264`, run first in `lateStep` `:1278`) unmarks the circuit (`breaker.ts:124-133`) after
  `retry` 20 s of: still off, no open incident on its key and no living walker (`circuitBusy` `:1227-1238`).
- Incidents close once nobody is busy on them (`incidents.ts:862`, `:686`), so a knocked-out walker, a give-up or a
  walk drawn away all free the circuit.
- Course mains gates (A63) and running timed windows read `isOff` false (`stealthSystems.ts:387-391`). They are never
  tracked, flipped or relit.
- The course isolator windows are 15 s and 25 s (`marlowCircuits.ts:159`, `:189`), shorter than the check plus the
  20 s hold, so a guard cannot relight early.
- DarkList: `unmarkGroup` resets only `DARK_CUT` lamps; shot lamps stay known.
- `cutN` is cleared at section load and in `clear` (`:1886`, `:3817`).
- No per-step allocation: the arrays grow at event rate only (`trackCut` `:1210`).
- Undo: `BREAKER_WALK.retry = Infinity`, which also guards the flip (`:1195`).

**B2. FIX** (blocking item 1). Without it the change does what the plan says. A2's open-wait pick skips the held role
cover (`enemy.ts:2944`), so an open-wait pick is never mistaken for a role trip. A6 (`advancing = false`) does not
affect the manager test. `mates` still counts any trip (`enemyManager.ts:3368`), so the overwatch still covers. Undo:
`POLISH_B.roleTrip`.

**B3. PASS.**
- The throttle restart now runs only on the hunt-switch branch (`enemyManager.ts:2875`, `:2886`). In combat,
  `combatHearAct` is non-zero only for a body noise (`hearing.ts:124`), so nothing that mattered is lost.
- A searcher is now re-told (`retell` `:2888`): `pendingHunt` is replaced, where `tell` used to keep the old A.
- Seam with A4: `retell` sets `calledMask` only when the guard is alerted (`enemy.ts:1472-1477`). For a searcher it
  sets `pendingHunt`, and `onLevel('alert')` sets the mask (`enemy.ts:2020-2022`). No double call.
- Undo: `POLISH_B.hearSlot`.

**B4. PASS.**
- `finish` records a point once into a 48-entry ring (`searchArea.ts:185-195`). `reset(..., keep)` keeps the ring only
  on a rebuild round the same position (`enemyManager.ts:3174`). Every full reset (`:2972`, `:3055`, `:3806`)
  forgets it.
- Candidates within `spacing` of the centre or of a searched point are skipped before `offer` (`:3194`, `:3211`). The
  old re-mark pass is kept only for the undo (`:3230`).
- When every point is searched the plan is empty and the ring takes over until the next rebuild. Nothing loops.
- Cost: at most (2m+1)^2 x 48 `hyp2` per rebuild, no allocation. The old `doneX` / `doneZ` scratch is gone.
- Seams with A11-A13: A11 snaps the guard's spot, not the plan point, so no conflict. A12's heard spot releases the
  claim, it does not finish the point. A13: see polish 1.
- Undo: `PLAN_SKIP_SEARCHED`.

**B5. PASS.**
- `rolesTickStart` runs at the start and end of `rolesStep` (`:3277`, `:3291`). Every `viewChecks` retry starts from
  `takenBase` (`squadRoles.ts:475`). `rolesCommit` runs after the group's last assign (`:3354`).
- Covers a member holds stay protected through `owner` (`squadRoles.ts:429`), so a later group never loses its own
  held cover.
- The coop4 rotation (A178) still decides which group picks first.
- Undo: `ROLES_SHARE_TAKEN`.

**B6. PASS.** A flashbanged guard is skipped at the top of `hear` (`:2824`). This also silences a blinded dog and the
parked modes, which matches the plan ("as :789 / :2397"). Undo: `POLISH_B.blindHear`.

**B7 (A182). PASS.**
- Both `tell(alarmHunt)` calls are gated (`:904`, `:1102`). `sendIn`'s tell happens before `alert()`, so the alerted
  guard binds from `pendingHunt` (`enemy.ts:2019-2022`).
- With nothing valid he has `hunt` -1. In the coordinated modes his first sighting makes the contact call
  (`enemy.ts:1521`), which is the "binds on the next call or sighting" the plan wants. The parked modes have no radio
  net (`netOn`).
- Undo: `POLISH_B.alarmTell`.

**B8. PASS.** Who is ready is worked out once per console per step, before any ray (`:1434`, `:1448`). `consoleBusy`
does not depend on the guard. The scratch array grows only with capacity (`c.x.length`). The test proves 0 rays while
the console is busy.

**B9. PASS.** `keyOf` runs only for the light and breaker modes, once instead of 2-3 times (`:2403`). The behaviour is
the same.

**B10. PASS.**
- The listed loops are index loops: panels `:1519`, torches `:1557`, the getters `:2913`, `:2920`, the flanker
  `:3465`, update `:3602`, bodies `:3626`, buffs `:3646`, `frameUpdate` `:3739`.
- Iteration is the same as `for...of`: pushes during the loop are seen, and removal still happens in the reverse
  splice loop after it.
- `updateBuffs` skips the inner loop when no officer is alive.

**C2. PASS.** `setOpen` now fires `onLocked` in both directions while the door is locked (`doors.ts:296`), after
`target` is set. `LockedDoorNav.sync` toggles only what changed (`lockedDoors.ts:64-69`), so the next update does no
second replan (the test checks `nav.version`). `setOpen` returns early when nothing changes, so the hook stays at event
rate. There is no undo const (polish 2).

**C3. PASS.** `perception.test.ts:468-473`: a ray-only miss with `distance: 0` is clear at both slacks.

**Co-op parity:** every change is host-side manager logic. Nothing in `src/net`, the wire or the save shape.

## Polish (not blocking)
1. A13 seam: `searchDoneFor` ignores `reached` (`enemyManager.ts:3120-3122`). A clamp-moved plan point is finished
   and, with B4, also goes into the searched ring, so nobody looks there round this LKP. This is the same as master,
   which re-marked it done. A13's `reached = false` only takes effect if the manager releases the point instead of
   finishing it, and only for clamped points: unreachable points also send false.
2. C2 changes behaviour with no undo const (the "every behaviour change" rule). Suggest a `LOCKED_OPEN_SYNC` const in
   `doors.ts`.
3. B1: a switch no guard can reach is walked to again about every 50 s (30 s give-up plus the 20 s hold) for the rest
   of the section. This is bounded and by design, but worth a line in ai.md.
4. guardPolishB mutates `as const` tables (`walk.retry`, `POLISH_B`), and `afterEach` restores them. This hides the
   undo run of the knock-out test when the file runs as a whole. A `beforeEach` with the default would make each case
   stand alone.
5. The B5 second test asserts `ROLES_SHARE_TAKEN === true`, which is trivial.
6. Remaining `for...of` loops at event rate:
   - `get alive` (`enemyManager.ts:1788`) is read per step by infiltration and clear modes while reinforcements are
     pending (`infiltrationMode.ts:84`).
   - `searchSlot`, `callAlert` and `shout` (`:637`, `:649`, `:685`).
7. `circuitBusy` and `consoleBusy` repeat the same walker scan (code health).
8. After the last `viewChecks` retry, the blocked overwatch cover stays in `taken` for the later groups. It is blocked
   anyway, so this is harmless.
