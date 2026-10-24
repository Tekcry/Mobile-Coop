status: done feature/player-batch-25-polish ac6f2e08f

# Brief: player-batch-25 polish - checker notes (Player Build, 2026-10-25 ~09:05)

Base: origin/feature/player-batch-25 b16c0ee7. New branch: feature/player-batch-25-polish (from that sha). Unit tests only.

## Items (from two Opus checker reports on b16c0ee7)
1. src/net/coopHost.ts: the mode's `restarts` read is duplicated in `onLampShot` and `sendLamps`; add one small private
   getter (e.g. `modeRestarts()`) used by both. No behaviour change.
2. changes/feature-player-batch-25.md: the lamp line says "Marlow Yard and Sector Ops"; the drop only fires in Sector
   Ops (Course raises `restarts` in the same step it resets lamps). Fix the wording.
3. scripts/operators/guard-bake.mjs: the `settled` guard's comment should say its real job (stop a second `closeSync`
   on a reused fd); rewrap the ~150-char `runAll` JSDoc line to the file's width.
4. tests/guardBakeAbort.test.ts: add a test that `main` (or the function main uses) passes the abort `cause` into the
   ABORT line; give the real-child `runJob` tests a 20 s timeout.

## Only files to edit
src/net/coopHost.ts, changes/feature-player-batch-25.md, scripts/operators/guard-bake.mjs, tests/guardBakeAbort.test.ts.

## Run
`npm run typecheck:fast`; `npx vitest run tests/courseLampWire.test.ts tests/courseLampHook.test.ts tests/sectorLampSync.test.ts tests/guardBakeAbort.test.ts tests/guardBakePlan.test.ts tests/changesFragments.test.ts`.

## Done
Branch pushed, report below (what changed, tests with counts), `status: done feature/player-batch-25-polish <sha>`.
Commit trailer: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Hyphens, not em dashes.

## Report (Night Shift | Cloud Builder 1, 2026-10-24T22:45Z)
Branch feature/player-batch-25-polish, 1 commit on b16c0ee7 (ac6f2e08f).
1. coopHost.ts: `private modeRestarts(): number` (beside `sendLamps`), used by `onLampShot` and `sendLamps`. No
   behaviour change.
2. changes/feature-player-batch-25.md: "In co-op Sector Ops, a client's round ..." (Marlow Yard dropped).
3. guard-bake.mjs: the `settled` comment now says only the first of 'error' / 'close' closes the log fd, since a second
   `closeSync` could close another file that reused the fd number; the `runAll` JSDoc rewrapped to 120.
4. guardBakeAbort.test.ts: new "main's ABORT line names the first lost job and its cause from runAll" (an aborted
   `runAll`'s `cause` through `abortLine` gives `ABORT_LINE (a: spawn EPERM)`, the chain main runs); the three
   real-child `runJob` tests take `REAL_CHILD_MS` 20 000.
- Tests: typecheck:fast clean; the 6 listed files, 82 tests pass; eslint clean (guard-bake.mjs is lint-ignored).
- Deviation: `main` itself is not driven: with Blender mocked to a missing exe, `main --stage prep` runs the real prep
  node job and outlasts 20 s, so the test covers the function main uses (the brief's alternative).
