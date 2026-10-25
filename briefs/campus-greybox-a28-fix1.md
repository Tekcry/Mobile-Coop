status: done feature/campus-greybox-a28 f3053a96a82a76bc4a1b6d5b31d3c16d0d2ead13
# campus-greybox A28 fix 1 (cloud, Opus): place a client that arrived before the host's run moved to section N

Lead: Night Shift | Sector Ops Build. PR #488 (start-at-section link). Two Opus checkers: FIX, the same one blocking item
(C:/NightShift/scratch/sector-ops-checks/a28-check-1.md B1, a28-check-2.md B1; summarised here). Opus builds (src/net).

- Branch: keep building on `feature/campus-greybox-a28` from its head 2e5465e32f05f541ddd9053b1e962e7093b55c86 (the PR
  branch; push to it only). Guard: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-a28`. If the head
  moved: `status: blocked head moved`.
- Brief of record: `docs/campus-greybox/briefs/A28.md` @ e95f5670c (on feature/campus-greybox), sections 1.5 and 2.6.

## The bug
`CoopHost` checks a remote only on its FIRST `pstate` (`src/net/coopHost.ts:709`, `!r.state` -> `firstPlace`). The host
listens from attach (`gameState.ts:932`), but `startAt` moves the run only in `SectorMode.start()` (`sectorMode.ts:365`),
called from `enter()` (`gameState.ts:1167`) after the warm-up and section-0 bake (`:972`, up to 6 s + bake). A client
(no nav grid, no EnemyManager) usually enters first and sends `pstate` in that window: `checkpointSpawns()` is still
section 1's start, `offSection` is false, `r.state` is set, and the client is never placed. When `start()` runs,
connector 1's near door locks: the client is stuck in unloaded section 1.

## The fix (checker option a; no wire change; the four 2.6 hunks stay byte-equal to 66c35a754's)
1. In `CoopHost`, a one-shot re-check once the mode has started: on the host's first `fixedUpdate` after `enter`
   (`fixedUpdate` only runs after `enter`; confirm by reading `gameState.ts`), for each remote that already has a
   state and is not restoring and not watched (the same exclusions `firstPlace` / the restore path use), call
   `firstPlace(r, r.feet.x, r.feet.y, r.feet.z)` once. A `boolean` member guards it; set it before the loop. No
   allocation (no closures, no iterators other than what the surrounding code already uses on remotes, no temp vectors;
   index loop if the remotes container allows it).
2. A normal run (no `sectorStart`) must stay identical: `offSection` is false for every remote standing at section 1's
   start, so the re-check changes nothing; say so in the report with the line that guarantees it.
3. Remotes that join after `start()` are untouched (their first state still runs `firstPlace` as before).
4. Only `src/net/coopHost.ts` plus tests; if the cleanest hook needs another file (e.g. a `NetAttachment` hook called
   from `startAt`, option b), use it only if (a) is impossible and say why.

## Tests
- Unit (`tests/sectorStart.test.ts` or the nearest existing CoopHost test helper; read `tests/joinWatch.test.ts` /
  `tests/spawnSlots.test.ts` for how a CoopHost / remote is faked): a client whose first state arrives BEFORE the mode
  starts at section N is placed at connector N-1's checkpoint on the first fixedUpdate after start; a normal run's
  client is not moved; a remote that arrives after start is placed once as before. Each must fail without the fix
  (try once, record in the report, do not commit the broken copy).
- e2e: in `scripts/e2e-sectorops.mjs` part 1's co-op leg, make the client enter first if the harness allows it
  cheaply (e.g. start the host page's match after the client page is in); otherwise note why not. Pending PC run.
- `npm run typecheck:fast`; `npx vitest run --maxWorkers=2 tests/sectorStart.test.ts tests/sectors.test.ts
  tests/sectorRecord.test.ts tests/joinWatch.test.ts tests/spawnSlots.test.ts` (+ any test file you add);
  `node --check scripts/e2e-sectorops.mjs`.

## Non-blocking, take it only if it is one line
Checker 1 polish: the client's results line is cut at 60 characters (`src/net/protocol.ts:604`), so "  ·  PRACTICE from
section N" can be lost on the client. If shortening the suffix to "  ·  PRACTICE" when the line is long is one line in
`sectorMode.ts`, do it; else list it.

## Done
Commit and push path-limited (never `git add -A`); commits end with "Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>". Report `docs/campus-greybox/checks/a28-fix1.md` (cause, fix with file:line, the normal-run
proof line, tests with counts and the fail-first runs, pending PC runs: e2e-sectorops:1 co-op leg, e2e-coop,
e2e-netmove). Then `status: done feature/campus-greybox-a28 <sha>` here with a short "## Report".

## Report (Night Shift | Sector Ops Build, desktop Opus, 2026-10-26)
Built locally (cloud unclaimed). Code 42f00660c, report f3053a96a: docs/campus-greybox/checks/a28-fix1.md. CoopHost placeEarly() once on the first fixedUpdate (coopHost.ts:1717-1735); tests/sectorStartCoop.test.ts 5 (fail-first recorded); 7 files 88 pass; e2e part 1 client enters first (pending PC run). Polish not taken (see report).
