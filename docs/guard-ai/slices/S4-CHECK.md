# S4 - Awareness and caution (fresh checker, 2026-10-23)

Commit fd3a0018 (S4 on 7a4167b2). I reviewed `git diff 7a4167b2 fd3a0018` in full against:
- BRIEF M1, M3, goals 2-3, A2, A3, A14-A16
- PLAN row S4
- design section 4
- `S4-module.md` and `S4.md`

## Verdict: PASS

Nothing is broken or unplayable. All three asks work and are bounded:
- A kill seen or a dead body found makes the guards who know cautious, and that caution is held.
- The held caution clears only when every aware guard is eliminated.
- A knockout found means the finder wakes him; both search, stay on edge, then go back to normal.

A woken guard is the same guard and keeps no stale combat state. No caution can outlive a section. Nothing new runs per
tick beyond a 5 Hz loop over 32 keys. The items below are polish or belong to later slices.

### Re-run here (desktop, single files only, no lock needed)
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint` on the 6 changed src files and `tests/awarenessWiring.test.ts`: exit 0, no output.
- `node --check scripts/e2e-stealth-ai.mjs`: OK.
- `npx vitest run` on 19 files:
  - awarenessWiring, awareness, radioWiring, enemyManagerDespawn, sectorRestart and securityBodies: 74 / 74 pass.
  - archetypes, cameraReach, campusS1, ctcourseLight, difficulty, incidents, pairs, perception, sectors,
    securityCamera, hearing, g7CloseQuarters and coopTorches: 251 pass, 1 skipped.
  - Together that is 325 pass, 1 skipped, which matches the implementer's report.
- Not run, as asked: the full `npm run check`, a full `vitest run` and e2e. The job lead runs e2e-stealth-ai,
  e2e-takedown and e2e-sectorops.

### Verified
- **Revive and `Enemy.inherit`** (`enemyManager.ts:609`, `enemy.ts:617`).
  - **The new `Enemy` starts clean.** Its alert level, `fought`, incident, radio call, `taken`, `blindT` and timers are
    all fresh. The new guard searches round the spot.
  - **Copied from the old guard:** his key, `squad`, `hold`, `passive`, `info` (null once spent), `post` and the walker.
    The walker's clock is moved on by `b.age`, so a timed loop rejoins on schedule. He rejoins at the nearest point,
    with `waitMul` reset by `setCaution(0)`.
  - **Facing:** he faces as he fell (`old.yaw`), with no `Math.random`.
  - **Hitboxes and registry target:** both are made by the new constructor. The old ones were disposed in `die()`
    (`enemy.ts:981`), so nothing is registered twice.
  - **Old references:** the old `Enemy` was already spliced from `enemies` by the dead-entry sweep. `swapSquad`
    (`:626`) puts the new guard in his roster slot and removes the old one from `silent`. The body that held
    `Body.guard` is removed in the same call.
  - **The rest drops the old guard by itself:**
    - Torch owners, the alarm runner and the flanker are released or checked by `alive`.
    - The dog's `findLeader` re-finds its leader when the old one is not `alive`.
    - The board and the radio net name guards by `num`, so a woken guard is simply a new guard there.
  - **Down hook order:** `die()` adds the body before `onKilled`, so `downed` -> `witnessKill` always finds it.
- **Keys** (`freeKey` `:720`, `spawn` `:820`).
  - A new guard takes the lowest key not held by a guard on the list or by a knocked-out body, and `resetKey` clears
    any stale bits. Reinforcements go through `spawn` too.
  - The worst case is `MAX_ALIVE` 12 + `BODY.max` 12 = 24 keys, so the 32 keys are never exhausted in practice.
    `keyBit` returns 0 outside 0-31.
  - A dead guard's key is free again. A knocked-out body removed by the body cap frees its key, and the next spawn
    clears it with `resetKey`. No collision, no leak.
- **Held caution.**
  - **What opens it:**
    - A body found dead (`bodyFound` `:369`) opens `openHold('dead', voiceMask | finder | witnesses)`.
    - The `body` radio call adds each receiver on delivery (`:1027`).
    - Cutting the finder (`radioCut` in `die()`) keeps the hold to the finder and his voice hearers.
  - **What clears it:** it clears only when `aware == 0`. A knocked-out guard is dormant and comes back on
    `startKo` -> `onRevived` (A3).
  - **Section and unload:** Sector unload and restart go through `despawnAll` -> `clear` -> `awareness.clear()`
    (`:1355`), with the radio net cleared too, so no hold outlives its section. `despawn` counts as dead (`:775`;
    nothing in src calls it today).
  - **No alarm (A2):** this path never calls `raiseAlarm`.
- **Timed knockout caution** (`woke` `:641`, `Enemy.koSearch` `:633`). `startKo(waker, woken)` gives search 60, then
  cautious 180, then 0.
  - The AlertMachine search (`ALERT.searchTime` 60) and the awareness search end together.
  - Cooldown then holds while `i.cautious` is set (`alertState.ts:149-150`).
  - At 240 s the cooldown has run 180 s, which is more than `cooldownTime` 45, so he goes unaware at once.
  - No guard is stuck: a guard who has not fought always returns to unaware once his caution is 0. A guard who has
    fought keeps his cooldown, as before.
  - The `ko` radio call only gets acknowledged. Nobody else turns cautious (M3).
- **A kill seen** (`witnessKill` `:663`).
  - **Event-driven:** it runs once per down event, never per tick.
  - **Who can be a witness:** one loop over the live list, at most 12. A calm guard who is not `taken`, passive, melee
    or a dog, standing within `BODY.range`.
  - **Cost:** `bodyNoticed` (field, light, distance) first, then at most one `seesPoint` ray per remaining guard. No
    allocation (scratch `earA` / `earB`, `hyp3`).
  - **Dead:** every witness is held, and the nearest finds the body.
  - **Knocked out:** the nearest goes to wake him (A14).
- **Cautious behaviour.**
  - `AlertInput.cautious` keeps a calm guard in cooldown. That gives sight x1.3 via `SENSITIVITY.cooldown`, and the
    board weights him with `cautiousMul`.
  - Patrol pace `PACE.cautious` 0.95 (`enemy.ts:1319`; not on timed loops).
  - `waitMul` 0.6 on route waits and post glances (`patrol.ts:113`, `:164`). Loop waits are still overridden by the
    schedule.
  - Torch rule as searching (`enemy.ts:855`).
  - No bark on unaware -> cooldown (`enemy.ts:884`).
  - `syncCaution` (`:707`) runs at 5 Hz and after each change, allocating nothing.
- **Parked modes.**
  - Hunter and Mission have `coordinated` false, so there is no `downed`, witness, hold, `woke` or `syncCaution`, and
    `bodyFound` takes the old 22 m path.
  - `revive` now inherits there too: see polish 2.
- **Hard rules.**
  - `awareness.ts` is Babylon-free. No `Math.hypot`; `hyp3` throughout.
  - New code allocates only on events (revive, spawn).
  - Strict TS and `import type` hold (`body.ts` imports `Enemy` as a type).
  - Gameplay reads `lightField` (the light bake), not graphics state.
- **Co-op.** No `src/net` change, and `PROTOCOL_VERSION` is untouched. Caution is host-only. The client sees it only
  as the `cooldown` level through the existing alert sync, plus the host-only text barks. Note for S9.
- **The calls against Michael's words.**
  - **A14** (a knockout seen means wake him, with timed caution) matches "wake them up (if knocked out)" and "if they
    were knocked out the caution can be limited".
  - **A16** (caution is the cooldown level; only death holds) keeps "become cautious" for bodies. Combat keeps
    `fought`, which is stronger.
  - **A15** (lowest free key) is deterministic. Its only cost is the "reinforcements on 24-31" nicety.
  - None of these reads breaks the ask.
- **Tests and e2e.** The 19 new unit tests cover every rule above.
  - The e2e `bodies` assert was replaced, not weakened. The mate is now strictly checked as 0 before the report
    arrives and as 2 / cooldown after it.
  - `revive` gained the key, timeline and calm checks.
  - The new `witness` scenario covers cut-before-report, report-through, the hold clearing only when the last aware
    guard is out, and a knockout seen.

## Fixes

None blocking.

## Polish list (later slices or the feel pass)
1. **A found dead body is never found again.**
   - Where: `lookForBodies` skips `b.found` (`enemy.ts:1193`).
   - Today: if the finder is cut before his report, every later guard walks past that first body without reacting.
     The finder's own body is still fresh, so the chain goes on, but the first body is "spent".
   - Done looks like: a guard who is not aware of the body's hold can still find it (open or join the hold). Best in
     S5 with the body report.
2. **Parked modes' revive changed.**
   - `revive` / `inherit` / `swapSquad` run in Hunter and Mission too: the woken guard keeps his route, post, squad
     slot and facing. Before, he stood at the body with a random yaw and his old self stayed on the roster as
     "silent".
   - Harmless, but the changelog line "Hunter and Mission keep the old rules" is not quite true.
   - Done looks like: gate `inherit` / `swapSquad` on `coordinated`, or reword the line.
3. **Passive guards learn of deaths by radio.**
   - `voiceMask` and the witness pass skip `passive`, but `radioDeliver` (`:1027`) adds any receiver to the hold. A
     passive training guard then turns held cautious and has to be taken out to clear it.
   - Course today has only two passive posted guards (no route), so the visible effect is faster post glances.
   - Done looks like: skip `passive` in the `body` delivery (or flag busy guards out of the hold).
4. **Dogs and melee guards can be aware.** `voiceMask` includes dogs and melee kinds, so a dog that hears "Man down!"
   must be killed for the caution to clear. Decide in S5 whether dogs count as aware.
5. **Caution cuts the current pause.** Caution setting in or clearing goes through `onLevel` unaware <-> cooldown,
   which calls `walker.rejoin` (`enemy.ts:931`) and sets `waitT = 0`. A guard pausing at a route point walks off at
   once.
6. **The board still raises `missing` for a woken investigator** (S2-CHECK polish 9 still open). The board names
   guards by `num`, and a woken guard gets a new one. A key -> num map in the `GuardView` refill would fix it (S5).
7. **Course `spawnSquad` and awareness.**
   - `spawnSquad` splices guards straight off `em.enemies` without `awareness.onDown`. The stale bits are harmless:
     no live guard holds them, and the next spawn on that key clears them with `resetKey`.
   - The woken course guard is still missing from `squadOf` (pre-existing, as reported).
8. **One section per map outside Sector Ops (A6).** In Infiltration, one body report makes every guard on the map held
   until each is out. This is by design until S5's zones, but worth a playtest note.
9. **A witnessed knockout with no body** falls to the dog branch and opens a `witness` hold. That needs the body cap
   to drop the brand-new body (only when every other body is carried), so it is negligible.
10. **Reinforcements take the lowest free key, not 24-31** (A15, documented). Harmless while keys never run out.
11. **Co-op (S9).** Clients see caution only as `cooldown` (alert sync); the walk pace comes through the synced
    positions. The barks `koFound`, `koReport` and `deadReport` are host HUD only, like the other barks.
