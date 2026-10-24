status: done feature/mission-kit-tick 93ef5c1e

# mission-framework KIT-TICK: per-tick kit hook + kit polish (unit tests only)
Lead: Night Shift | Marlow Build. Source: the KIT batch checker report (copied below, "Checker notes").

- Base: origin/feature/mission-engine @ 9e87b4b34. New branch: `feature/mission-kit-tick`.
- npm ci once. Unit tests only: no e2e, no GPU, no `npm run check`.

## Only these files
- src/game/kit/registry.ts
- src/game/teamController.ts
- src/game/kit/shutter.ts
- src/game/kit/pullUp.ts
- tests/kit/registry.test.ts
- tests/kit/shutter.test.ts
- tests/kit/pullUp.test.ts

## Build
1. `KitMove` (registry.ts:136) gains optional `tick?(h: KitHost, run: R, dt: number): void`.
   - The doc comment says it is called every fixed step for every registered move, whatever the team state, alive or not, before any early return.
2. TeamController.fixedUpdate (teamController.ts, about :202):
   - Before the `!alive` early return, loop the registered kit moves (the same registry list kitIdle uses, about :339) and call `tick` with each move's run.
   - Use an index loop. Allocate nothing: no closures or iterators per tick.
3. shutter.ts: move `syncShutters` out of SHUTTER_MOVE.idle / step (about :672-678 and :739) into SHUTTER_MOVE.tick.
   - Then a dropping or open shutter updates even while another kit move claims the idle press, during an offer, hang-down, rope, takedown or strike, while dead, or with no mates.
   - It must also drop on the page left behind when the holder disconnects mid-hold: no holder MoveState means the shutter drops.
4. Polish:
   - shutter.ts:197 `underZone` 0.4 -> 0.3, so a partner standing against the curtain is not "under" it.
   - `shutterOffer` (the 0.4 s grip) counts as busy: weapons and interact stay off while the holder is pinned to the bar.
     - Today `kitStateOffer` treats any `*Offer` as not busy. Add an explicit exception or a `busyOffer` flag on the move. Keep pullOffer as it is.
   - Typing:
     - Add `hangPoint` to `KitHost` and use it in pullUp.ts:189 (no duck-typing).
     - Replace shutter.ts:397 `hpOf`'s cast to `g.target.health` with a typed `KitHost` field (e.g. `health(): number`), implemented by TeamController.
5. Tests:
   - registry.test.ts: `tick` is called on every fixed step, including while dead and during a built-in offer.
   - shutter.test.ts:
     - With a pull move claiming idle, the shutter still drops.
     - With the holder gone, the shutter drops.
     - underZone 0.3.
     - shutterOffer is busy.
   - pullUp.test.ts: still green, using the typed hangPoint.

## Run
- `npx vitest run tests/kit/ tests/hangDownNet.test.ts tests/teamMoves.test.ts --maxWorkers=2`
- `npm run typecheck:fast`
- Hot paths stay allocation-free: hyp2 / hyp3, never Math.hypot.
- Strict TS with `import type`.

## Done when
- Tests green and typecheck clean.
- Branch pushed.
- A report at the end of this brief: what changed with file:line, test counts, deviations.
- `status: done feature/mission-kit-tick <sha>`.

## Checker notes (from C:/NightShift/scratch/mission-kit-check.md, desktop)
- syncShutters runs only from SHUTTER_MOVE.idle / step. The glob registers pullUp before shutter, so a pull idle that returns non-null skips it.
- It is also skipped in every built-in team state, during a takedown or strike, while dead, and with no mates: idle() returns before kitIdle (teamController.ts:763), and fixedUpdate's !alive return comes before that (:202).
- The page's mirror then freezes at its last gap. A partner who disconnects while holding leaves the shutter open on the other page until a mate rejoins.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
- `feature/mission-kit-tick` @ 93ef5c1e (one commit on 9e87b4b3; only the 7 listed files, +221 -32).
- registry.ts:160 `KitMove.tick?(h, run, dt)`, called every fixed step for every move, alive or not; :153 `busyOffer` flag, :245 `kitOfferFree()`, :128 `KitHost.health()`, :131 `KitHost.hangPoint`.
- teamController.ts:204 `fixedUpdate` calls `kitTick(dt)` (:341, index loop, no allocation) before the `!alive` return; :352 `health()`; :151 `busy` uses `kitOfferFree`.
- shutter.ts:671 `syncShutters` moved from idle / step into `SHUTTER_MOVE.tick`: a shutter now drops under a claiming pull move, in any team state, while dead, and with no mates (holder disconnected). :67 `underZone` 0.3. :667 `busyOffer: true` (`pullOffer` stays free). :487 / :615 use `h.health()`; `hpOf` gone. pullUp.ts:186 uses the typed `h.hangPoint`; the duck-typed `DropProbe` is gone.
- Tests: tests/kit/ + hangDownNet + teamMoves 87/87 (8 new; one existing shutter assert changed to busy = true; rerun by the builder session: 87/87). With `kitTick` switched off 6 fail (registry tick, 3 new shutter, 2 existing shutter). typecheck:fast and eslint clean.
- Deviations: busy via a `busyOffer` flag + `kitOfferFree` (kitStateOffer unchanged, the pose clock still reads shutterOffer as -1); `kitTick` also runs `kitSync` each step (reference compare, no allocation) so devices exist before the first tick; `syncShutters` gets the real `dt` (idle used 1/60); `health()` reads `g.target?.health.hp ?? NaN` for headless fakes; `health()` / `hangPoint` required on `KitHost` (TeamController the only implementer).
- Open: the crawl request timeout (`run.asked`) still counts only in `SHUTTER_MOVE.idle`, so it stalls while another move claims idle (minor, outside the brief).
