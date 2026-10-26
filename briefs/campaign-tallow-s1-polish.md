status: open

# campaign J9 S1 polish: no shutter re-lift after a restart, resetKit scope test (Opus)
Owner: Campaign Build. Lead: Night Shift | Campaign Build. Released 2026-10-26 ~12:55.

Base: origin/feature/tallow-shutters at ec143486716ca39ef1d662fb8ca579b76f2b52e4 (S1 with its late hunks, S2, S2 fix1, PR T, engine with J7 PR D / E / F).
New branch: feature/tallow-s1-polish (cut from that sha). Cloud: guard on the branch name only
(`test "$(git rev-parse --abbrev-ref HEAD)" = feature/tallow-s1-polish`), per agent-preamble "Cloud sessions"; no
CPU wait in the cloud. Model: Opus (engine + co-op code). Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
Hard rules (`git show origin/master:CLAUDE.md`): hot paths allocate nothing (no closures / temporaries in tick code),
strict TS, `import type`. Never merge, rebase, stash, reset or force-push. No e2e (pending PC run).

## Only these files
- `src/game/kit/shutter.ts`
- `src/game/teamController.ts` (the `resetKit()` method only, ~:1277-1285)
- `tests/shutterWiring.test.ts`

## Why (two independent Opus checkers, both PASS with this as polish)
After a team-rule section restart (a mission rule broken, e.g. a kill on Two-Key Ledger) while the client is holding a
shutter, `resetKit()` shuts every shutter at once on both peers, but the host's `syncShutters` (shutter.ts ~:463-473)
still reads the client's last MoveState (holding) until the restart banner reaches the client. So the host's shutter
lifts again to the client's gap for about one network trip, then drops over `dropTime` (up to 0.6 s). The reset also
cleared the notice mark (`noticed` -1) and the stealth notice timer, so a freshly spawned guard within 9 m facing it
may notice a shutter that is already dropping. Also untested: `resetKit` ends only a shutter kit move (`kitKindOf(this.state) === 'shutter'`).

## Do
1. Read `src/game/kit/shutter.ts` (whole), `teamController.ts` `resetKit` / `end` / `kitTick`, `gameState.ts`
   `checkpointReset` (~:1080-1090), `coopClient.ts` ~:870-890 (the client's restart path) and `tests/shutterWiring.test.ts`.
2. A short hold-off after a reset: `resetKit()` stamps the shutter devices (or a module-level number in shutter.ts set
   through a small exported function such as `holdOffShutters(nowS)`) so that for ~0.5 s (`SHUTTER_RESET_HOLDOFF_S = 0.5`,
   a named constant with a one-line comment) `syncShutters` ignores a MATE's holding state and keeps every shutter shut;
   the local player's own hold is already ended by `end(true)`. Use the game's own fixed-step clock the surrounding code
   uses (no `Date.now()` / `performance.now()` if the module takes a time or dt already). Nothing allocates per tick.
   A real hold that starts after the window (the mate re-grabs) works as before. Maps without shutters: no change.
3. Tests in `tests/shutterWiring.test.ts`: (a) a mate's MoveState still says holding right after `resetKit()`: the
   shutter stays shut through the window (`open` 0, `phase` 'closed', `noticed` -1), and lifts again only for a hold
   seen after the window; (b) `resetKit()` with a non-shutter kit move active (a pull) does not call `end` (the state is
   unchanged), while the shutters still reset. Each test must fail without its code (say how you checked).
4. Checks: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/shutterWiring.test.ts tests/kit/shutter.test.ts tests/kit/registry.test.ts tests/kitNet.test.ts tests/tallowWharf/shell.test.ts tests/teamMoves.test.ts --maxWorkers=2`; `npx eslint` on the three files.

## Done looks like
Checks green; the diff touches the three files only (~60 lines); the report lists the design (where the window lives,
the clock it reads), file:line of each change, test counts, how each new test was shown to fail without its code, and
any deviation. Then line 1 becomes `status: done feature/tallow-s1-polish <sha>` (or `status: blocked <why>`).

## Report (append below)
