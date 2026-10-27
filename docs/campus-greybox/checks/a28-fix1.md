# campus-greybox A28 fix 1 - a co-op client that arrived before the host's run moved to section N

Builder: Night Shift | Sector Ops Build (desktop, Opus). Branch `feature/campus-greybox-a28` from 2e5465e32. Brief:
cloud-queue `briefs/campus-greybox-a28-fix1.md`; checker B1 in `a28-check-1.md` and `a28-check-2.md`; brief of record
`docs/campus-greybox/briefs/A28.md` @ e95f5670c sections 1.5 and 2.6.

## Cause
`CoopHost` judges a remote only on its first `pstate` (`coopHost.ts:709`, `!r.state` -> `firstPlace`). The host listens
from attach (`gameState.ts:932`) but `startAt` moves the run only in `SectorMode.start()`, called from `enter()`
(`gameState.ts:1167`) after the warm-up and bake. A client that enters first sends its states in that window: the
checkpoint is still section 1's start and no door is locked, so `offSection` is false, `r.state` is set, and the client
is never judged again. After `start()` it is stuck behind connector 1's locked near door.

## Fix (checker option a; no wire change)
- `src/net/coopHost.ts:1717` `earlyPlaced` (boolean member), `:1726` `placeEarly()`: sets the flag first, then for each
  remote with a state, not watched (`joins.watching`) and not being restored (`joins.restoring`), calls
  `firstPlace(r, r.feet.x, r.feet.y, r.feet.z)` (`:1729`). Called once from the top of `fixedUpdate` (`:1735`).
- `fixedUpdate` runs only after `enter`: `App.setState` calls `next.enter()` and only then `loop.attach(...)`
  (`src/core/app.ts:383-384`); the match reaches `setState` only after `GameState.create` resolves (`src/main.ts:399`).
- No allocation beyond one `Map.values()` iterator, once per match (the same container walk `fixedUpdate` already does).
- Placed next to `fixedUpdate`, away from the 2.6 hunks: `firstPlace`, its call in `receive` and the import are
  byte-equal to 66c35a754's (`git diff 2e5465e32 -- src/net/coopHost.ts` is one 18-line addition at :1714).
- Remotes whose first state comes after the first step: `earlyPlaced` is set, so `placeEarly` never runs again; they
  take `receive`'s `firstPlace` path as before.

## Normal run (no `sectorStart`) stays identical
`src/game/spawnPlace.ts:101`: `for (const p of checkpoint) if (hyp2(p.x - x, p.z - z) < JOIN_START_M) return false;` - an
early client stands at section 1's start (`placeStart`, at most 2.3 m off), which is still the checkpoint, so
`offSection` is false and `firstPlace` returns at `coopHost.ts:455`. A client that walked further inside section 1
before the host's first step still has a walk to section 1's start (`spawnPlace.ts:102`, `canWalk`: no locked door
between), so it is not moved either. Every other mode returns at `coopHost.ts:455` (`mode?.id !== 'sector'`).

## Tests
`tests/sectorStartCoop.test.ts` (new, 5 tests; a host stand-in on `CoopHost.prototype` as `courseLampWire.test.ts`, the
real `fixedUpdate`, `receive`, `firstPlace`, `joinSpot`, `JoinWatch`; `localMoveState` mocked, per-step systems stubbed):
1. first state before start -> placed on the first step after start, the restore goes to connector N-1's `checkpoint2`;
   none more after it arrives.
2. the re-check runs once (a restore that ran out is not re-placed by later steps).
3. normal run: an early client at its start spot or 10 m into section 1 is not moved.
4. a client whose first state comes after start is placed once on that state, as before.
5. a client already restoring or watched when the host starts is left to that path.

Fail-first (working copy only, not committed):
- the `placeEarly` call removed: tests 1 and 2 fail (`expected "place" to be called 1 times, but got 0 times`); 3-5 pass
  (they guard behaviour the fix must not change, so they cannot fail without it).
- mutant, flag never set: test 2 fails (called 2 times).
- mutant, no watched / restoring exclusion: test 5 fails (called 1 time).

Runs (desktop at 96-100% CPU for 20 min from other sessions, so run at BelowNormal priority through
`C:/NightShift/scratch/ctcore/low.mjs`):
- `npm run typecheck:fast`: clean.
- `npx vitest run --maxWorkers=2 tests/sectorStart.test.ts tests/sectors.test.ts tests/sectorRecord.test.ts
  tests/joinWatch.test.ts tests/spawnSlots.test.ts tests/sectorStartCoop.test.ts tests/courseLampWire.test.ts`: 7 files,
  88 tests passed (`courseLampWire` added: it is the other `CoopHost.prototype` stand-in).
- `node --check scripts/e2e-sectorops.mjs`: OK.

## e2e harness (written, not run)
`scripts/e2e-sectorops.mjs` part 1's co-op leg now makes the client enter first, deterministically: before
`startMatch` the host page's `app.setState` is wrapped so the loaded Sector Ops match is held (`window.__held`); the leg
waits for the client page's match and for every held remote to have a state, asserts the host has not entered, then
releases it. The rest of the leg (checkpoint, section 2 mirror) is unchanged. The inlined start is `startMode`'s steps
(settings, ready, `startMatch`, `damageMul` 0).

Pending PC run: `e2e-sectorops:1` (co-op leg), `e2e-coop`, `e2e-netmove`.

## Polish (not taken)
Checker 1's client results line cut at 60 characters (`protocol.ts:604`): not one line. The base line already reaches
about 50-65 characters ("Time ... · Kills ... · Spotted ... · Marks ..."), so shortening the suffix to "  ·  PRACTICE"
alone does not keep it on the client, and it would change the host's line that `tests/sectorStart.test.ts:140-142` and
the solo e2e leg (`e2e-sectorops.mjs:248`, "PRACTICE from section 3") assert. Left on the polish list.
