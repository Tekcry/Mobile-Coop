# guard-ai mill-hunt: H3 report (the glue)
Owner: Guard AI Build. Status: current.

Builder: Opus 5.5, 2026-10-27. Branch `feature/guard-ai-mill-hunt-h3` (origin/master 4.132.0 with
`feature/guard-ai-mill-hunt` merged: H1 `THORNBECK_HUNT`, H2 `src/ai/millHunt.ts`). PLAN rev 2 "Glue (H3)". Not touched:
`src/ai/millHunt.ts`, `thornbeckMill.ts`, `tests/millHunt*.test.ts` (board notes for the lead below). Ships dark.

## Changes (file:line at the branch head)
- `src/core/flags.ts:117`, `:311`: `flags.millHunt = darkFlag(params.get('millhunt'), PREVIEW_ON)`, owner Guard AI,
  switched on when Michael accepts it on his walk.
- `src/ai/enemy.ts`
  - `:35` imports `HUNT`; `:432` `MH_NEAR` 0.3 m (he stops inside `HUNT.arrive` 0.5, where the board counts him there).
  - `:1971-2012` `mhOn`, `mhPt`, `mhFace` (NaN none), `mhSpeed`; `mhStart()` (not down / taken / a dog: `mhOn`, goal
    where he stands; out of combat `searching` via `onLevel`, `SEARCH_PLAIN`, no room, no rush; in a fight he joins when
    it ends); `mhStop()`; `mhGoal(x, z, face, speed)` (the board's `out`).
  - `:3132` `i.hunting = (... as built) || this.mhOn` (A1: searching for good).
  - `:3490` searching branch, after the revive / entry walks, before the crew sweep: `if (lvl === 'searching' &&
    this.mhOn) return this.mhStep(dt)` (fold-ins 7, 11: the blackout and body searches' stimulus never moves him).
  - `:3627` `aimedMotion` false while `mhOn` (the board times its aims at the calm turn, also after a fight).
  - `:3635` `mhStep`: `goTo(mhPt, MH_NEAR)` on his storey at `min(mhSpeed, walkSpeed)`; within `HUNT.arrive` he faces
    `mhFace` (NaN: no face). Combat untouched.
- `src/ai/enemyManager.ts`
  - `:155` `MILL_HUNT_W1` (5.5, 5.25): the board's start point (PLAN "Order": first targets nearest W1). It is the
    scene's blackout search point (`pianoScene.ts` `SEARCH_X/Z`); importing the scene into the manager would pull its
    audio and intro, so it is a constant with a test that they agree. `:157` `mhOut` (module function: no closure).
  - `:390` `millHunt: HuntBoard<Enemy> | null` (public: tests, e2e).
  - `:2443` `sceneDarkOn`: talking pairs cleared as before; `huntBoard()` (`:2465`: flag on and the live section's
    `hunt` via `world.map.sectors[radioNet.section]`; else null) built empty; with it every guard `mhStart` + `admit`,
    no `sweepify`; without it the sweep as built.
  - `:2422` `placeSlot` while dark with the board: `mhStart` + `admit` (the spawn after the dark, a late spawn), never
    swept, no talking pair.
  - `:2478` `mhTick` (board tick): a hunt guard found calm is `mhStart`ed again; every hunt guard `searching` is
    admitted (a no-op once on; re-admits a guard whose fight ended); then `hb.tick(0.2)`.
  - `:4224` inside the `coordinated` 0.2 s block: `mhTick` replaces `glimpseFollow` while the board exists (fold-in 10).
  - `:2497` `sceneDarkOff`: every guard `mhStop`, board null. `:4446` `clear()`: an empty new board if one was live (a
    restart's despawn; the scene's next `sceneDark = true` builds it again anyway). `:1946` `revive`: a woken guard in
    the hunt `mhStart`s (admitted at the next tick).
- `scripts/e2e-piano.mjs`: `?millhunt=1` on both runs unless `E2E_MILLHUNT=0` (`?millhunt=0`: the old run). Co-op start
  check "no guard in combat" with the flag (`START_BAD` / `START_WHAT`), "no guard past suspicious" without; "no
  detection at the start" unchanged. Solo, after the cut and the stick check, guards blinded (the shared difficulty's
  `perception` 0, restored in `finally`): board on at phase 0; 30 s after the cut every live guard `searching` and
  `mhOn`; 60 s sampled every 0.5 s: no room above 2 by positions (board room boxes, per storey); the far ground guards'
  mean line distance to W1's stop falls; after the checkpoint restart: board on, phase 0, every live guard searching on
  the hunt (check 2 fold-in 5). `huntProbe` reads it all from `em.millHunt`.
- `scripts/e2e-affected.mjs` `DIRECT_COVERS`: `src/ai/millHunt` -> `e2e-piano`. `TESTING.md` one line; `docs/systems/ai.md`
  "Mill hunt" item under "Scene sweep"; `changes/feature-guard-ai-mill-hunt-h3.md` (minor).

## Tests
- `tests/millHuntGlue.test.ts` (14, all pass): real-class guards (`tests/helpers/sweepGuard.ts` plus the awareness
  fields), the real `searchAt` / `bodySearch` / `updateAwareness`; a manager on the mill (`world.map.sectors =
  THORNBECK_SECTORS`), guards placed after `sceneDark = true` as the scene does.
  - guard: `mhStart` (and never for a dog, held, down); past `searchTime` still searching (off the hunt: cooldown; after
    `mhStop`: cooldown); full meter -> `alert`, lost sight -> `searching`, still `mhOn`, and searching past
    `searchTime`; `mhStep` goal, pace, cap at walk, face only within `arrive`; blackout + body search do not move him.
  - manager: W1 = `SEARCH_X/Z`; flag on: all 12 searching, `mhOn`, unswept, no pairs, pairs are board units; G1 + G2
    hunt-driven after `blackoutSearchSlots` (kind blackout, still on the hunt), everyone searching past `searchTime`,
    G3 spread out; a fight drops him off the board, `searching` re-admits him at the same index, `cooldown` is put back;
    a late spawn (G3 20 s later) joins and from 15 s on no room above 2 by positions for 60 s; `clear` + dark again +
    spawn: a new board at phase 0, all admitted; dark off: board null, `mhOn` false; flag off: all swept, 4 watch-only
    pairs, no board, `update` runs `glimpseFollow` 5x / s and never `mhTick`; flag on: `update` runs `mhTick` 5x / s and
    never `glimpseFollow`; a section without `hunt`: no board.
  - allocation (`bytesPerCall`): `mhTick` over 12 guards reads 192 B a tick = one boxed double per member (the board's
    `out` call; an object would be 48 B+), bound 2 x 16 B a guard; a guard's `calmDecide` on the hunt 0 B (bound 48).
- Ran: `npm run typecheck:fast` clean; `npx vitest run` on the 78 test files importing `enemy.ts` / `enemyManager.ts` /
  `sceneSweep` / `helpers/sweepGuard` (pianoGuards, guardAiAllocManager, millHunt included): 78 files, 1188 passed,
  1 skipped; `tests/e2eAffected.test.ts` 46 passed; `tests/changesFragments.test.ts` passed; `node --check
  scripts/e2e-piano.mjs` ok. Not run (as briefed): the e2e itself.

## Counted lines (excluding docs)
`enemy.ts` +72 / -3, `enemyManager.ts` +78 / -3, `flags.ts` +5, `e2e-piano.mjs` +112 / -6, `e2e-affected.mjs` +2,
`tests/millHuntGlue.test.ts` +461: 730 added against the PLAN's ~350 (the test file is most of the excess; code 155).

## Notes for the two checkers
1. Beyond the PLAN text, each a line or two: the calm-put-back in `mhTick` (A1 "never cooldown or unaware": a woken,
   released or investigated guard); `revive` -> `mhStart`; `aimedMotion` off on the hunt (the board's aim timing
   assumes the calm turn); `clear()` swaps in an empty board so no stale `Enemy` stays on it between a restart's
   despawn and its `sceneDark = true`.
2. `mhStep` sits after the revive and entry walks: a hunt guard who finds a knocked-out mate walks over and wakes him
   first (as built), then the board drives him. A dead body's `bodySearch` (fold-in 11) only changes his search kind.
3. Combat: `alert` is untouched; the board drops a fighter on its own (`gone`), `mhTick` admits him once `searching`.
   His post-fight search is the board's walk, not the ring round the last known position (H4 moves the targets).
4. The incident board can still `sendTo` a hunt guard (`sendable` includes searching): `heard` is set, his level stays
   `searching`, the hunt keeps him. A `checkLight` / camera body send would make him `investigating`; when it ends the
   put-back rule returns him (none of those fire in the mill: the lamps are dead, no lights-out incident in the dark).
5. With the hunt there is no sweep pair, so GA6's missing-partner watch (F1 `PairMeet`) is not built: a partner's
   takedown is noticed only by sight / sound as built. If wanted, H4 can add the watch for board pairs.
6. e2e "closing in": Euclid distance to W1 is not monotone along the ground line (it winds round the mill bay), and at
   the start G3 spreads out and G4 regroups back to G5 (both away from W1), so the check takes ground guards whose
   line distance to W1's stop is over 15 m at 30 s (the far units: G5, G6 in the 12 set) and compares their mean at 30 s
   and 90 s. The window logs the fullest room and both means.
7. e2e co-op `PIN_FN` sets every guard `unaware` each host step; with the hunt `mhTick` sets the unpinned ones back to
   `searching` at 5 Hz between those steps. The pinned ones' `update` is a no-op, so the kills are unaffected; watch
   the kill section on the first e2e run.
8. "No detection at the start" with the flag on (fold-in 3) is not verified here (no e2e run). If it fails the fix is
   the start stops / aims in `THORNBECK_HUNT` (map file: not mine), not the assertion.

## For the lead (board, `src/ai/millHunt.ts`)
- A woken guard is a new `Enemy` (`revive` + `inherit`): `admit` gives him a new member index, and his partner's
  `mPartner` still points at the old (dropped) index, so `admit`'s pairing (`mPartner[k] < 0 && pairOf`) never re-pairs
  them: both go on as solos. Suggest: in `admit`, a new member whose `slotIdx` matches an off-board member takes that
  index (or clears the stale partner link).
- No stuck timeout (H2 note): a member whose spot is unreachable (`goTo` finds no path) stands, his unit never arrives,
  lower ranks queue. H3 has no fallback in `mhStep`; the unit test nav is open, so only the e2e will show it.
- `tick` boxes one double per member per tick through `out` (16 B each, 192 B for 12): not an object, within bounds;
  inlining could remove it, not needed.
- `MILL_HUNT_W1` is a manager constant; a `HuntDef.start` (map data) would remove it if the lead prefers.
