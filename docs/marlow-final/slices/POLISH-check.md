# marlow-polish checker report (fresh Opus)

Range: `053ff212..9de24cd9` (feature/marlow-polish). Commits 80389110, 24992aa7, 9de24cd9.

## Verdict: PASS

No blockers. One wire note for the job lead to see (below), not a block.

## Checks run
- `npx tsc --noEmit -p tsconfig.json`: clean.
- `npx vitest run tests/ratingWire.test.ts tests/marlowWalkS10.test.ts tests/securityCameraE8.test.ts tests/securityCamera.test.ts tests/sectorRatingHost.test.ts`: 5 files, 52 tests pass.
- `npx vitest run tests/net.test.ts tests/netSim.test.ts`: 2 files, 80 tests pass.
- Not run (per brief): `npm run check`, e2e.

## Wire (item 1)
- The wire shape did change vs 053ff212: the `sector` message gains an optional `rh: number[]`
  (`src/game/sectors.ts:889-891`, parsed at `src/net/protocol.ts:528-530` with the course message's `courseRh`).
  No other message changed.
- Not a bump case, judged against how section-rating landed in 42: origin/master is at 40, so 42 is unreleased;
  marlow-final's own 42 has no `sector.rt` at all, and section-rating added `sector.rt` / `course.rt` / `course.rh`
  inside 42 without a bump. This follows the same pattern and is compatible both ways inside 42: an older 42 parser
  (`sectorExtra`) builds its output from known keys only and drops `rh`; a newer client with no `rh` from the host
  skips the loop (`src/net/coopClient.ts:786`). Same clamps as `course.rh` (RH_MAX 64, -1..RH_HI, bad entry -1,
  non-array dropped), covered by the new `ratingWire.test.ts` case.
- If the lead reads the rule as "any new field bumps", this is the one place it applies.

## Correctness
- Host: `ratedSynced[i]` is written beside `run.marks[i]` at the one rating site (`src/game/modes/sectorMode.ts:1000-1001`);
  `rh` goes out only once a section is rated (`sectorMode.ts:1296`). A re-rated section after a restart overwrites both.
- Client: `rh` is applied only inside the `!this.sawSector` first-message branch (`coopClient.ts:781-795`), so periodic
  `sector` resends never push it again: idempotent per client instance. The `rt` section is skipped in `rh`
  (`src/net/validate.ts:279`) and pushed after it, so no duplicate line and index order holds. No grant, card or top-up.
- Ricochet (item 2): `nearestHousing` (`src/security/camera.ts:155-168`) is an exact lift of the old `shotRay` loop;
  host behaviour unchanged (`src/security/securitySystem.ts:253`). `CtDevices.ricochetRay` (`src/game/ctDevices.ts:334-343`)
  is client-only, reuses `ricoAt` / `ricoDown`, matches the host's `onRicochet` (8 sparks, `onImpact(at, false)`), local
  only, nothing on the wire, so no double sparks from a host echo. The `onRay` chain is installed once at attach after
  the lamp hook (`coopClient.ts:200-207`) and preserves it.
- Docs (item 3): SPEC, CONSTRAINTS, ENGINE-ANSWERS read 1.6 m consistently.

## Rules
- Single player: no new `src/net` import from `src/game` or `src/security`; `validate.ts` imports `game/course/courseWire` (net -> game, allowed).
- Hot paths: `ricochetRay` and `nearestHousing` allocate nothing. `packRated` allocates one array per `sector` send
  (`SEC_SEND` interval or change), alongside the existing `lk`, `dn` and `{ ...this.rt }` allocations: not a per-frame loop.
- Strict TS: clean. Changes fragment: `changes/feature-marlow-polish.md`, `kind: patch`.

## Polish list (non-blocking)
1. `src/net/protocol.ts:19`: the PROTOCOL 42 comment lists `sector.rt`, `course.rt`, `course.rh` but not the new
   `sector.rh`. Done looks like: the 42 sentence names "the `sector` message's `rh` (marlow-polish)".
2. `sectorMode.ts:231`: `ratedSynced` is not cleared with `run` (a new `SectorRun` at :269). Harmless today (each index
   is rewritten when rated, `packRated` reads only up to `marks.length`), but a reset helper would keep them paired.
3. A client that rejoins without a page reload (same `GameState`, new `CoopClient`) would push `rh` lines on top of the
   existing `g.sectionRatings` list. The same holds for the pre-existing `rt` push, so not new; worth one line in the
   rejoin e2e if that path keeps the list.
4. The client ricochet has no e2e coverage (unit test covers the pick only); a desktop-lane `e2e-coop` or Sector Ops
   client shot at a bulletproof camera would confirm the sparks count via `ct.ricochets`.
