# interrogation-intel report (CT Core spare 9)

## What
Interrogating a guard with information now also gives: door codes (authored `GuardIntel.codes`), cameras near him (count,
sweep cycle) and patrols near him (count, loop time), as feed lines (<= 60 chars) for every player. Decisions A1-A5: BRIEF.md.

## Files
New `src/game/intel.ts` (pure), `src/game/intelReveal.ts`, `tests/intel.test.ts`. Edited `gameMode.ts` (`onIntelCode?`),
`gameEvents.ts` (`intel`), `takedownController.ts` (holdTalk reveal, not on a puppet), `net/coopHost.ts` (interPh map, the
client's interrogation end seen from MoveState, `intel` -> `feed` relay), `scripts/e2e-takedown.mjs`
(`grab-interrogate-intel`), `scripts/e2e-coop.mjs` (relay check), docs/systems takedowns.md and coop.md, TESTING.md, fragment.
No wire, save or src/ai change.

## Tests
- vitest: intel 13, guardInfo 6, grabMenu 3, takedown 18: pass. tsc and eslint on touched files: clean.
- e2e-takedown (desktop lane 4192, GPU, E2E_JOBS=1): pass (17 s; first run failed only on my cumulative `grabs.interrogated` assert, fixed to a delta). e2e-coop: not run (laptop batch).

## Open items
- Done (batch-23, PATROL-TIMING.md): Guard AI added `Enemy.patrolRoute` (master 4.74.0); patrol lines now read it.
- Part B (A5): done (stealth-pays S1, S2; `docs/stealth-pays/`). `courseMode.onIntelCode` sets the course flag (`externalFlags` for a gate); sectorMode copies `slot.info` to `e.info` at spawn and `onIntelCode` calls `SectorCodes.grantCode(flag, sec)`. Play is unchanged until map owners author `GuardIntel.codes` (no Sector map has `info` yet).
- A client interrogating from the hang-down gives only the guard's own lines (stealth-pays P1, parked: needs a wire change and a PROTOCOL number).
- Sector co-op client: its puppet reads guard info only from `layout.course?.squads` (`coopClient.ts:326`), so once a Sector map authors `info` the client never sees INTERROGATE on that guard (host / solo only; `src/net`, polish).

## Changelog line
Interrogation now gives door codes, nearby camera sweep times and patrol loop times as feed lines.
