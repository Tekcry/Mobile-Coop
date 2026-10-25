# guard-rules PR1 merge re-check
Owner: Guard AI Build. Status: current.
VERDICT: PASS

Re-checker (Opus 5.5, fresh), #450 `feature/guard-rules` head b718293df (merge 4d09af5c4 = 211a66d56 + origin/master
7df39dc60; conflicts in docs/systems/ai.md and takedowns.md resolved by the lead). Kept on feature/guard-ai so #450's
head does not move.

## Checks run
- `npm run typecheck:fast`: clean. eslint on PR1's 23 files: 0 errors; `node --check` on the 3 e2e scripts.
- `node scripts/doc-lint.mjs`: 0 errors. vitest on 98 files (PR1 tests plus everything importing enemy, enemyManager,
  gear, archetypes, sectors, sectorMode, coopHost, score, takedownController): 1452 pass, 2 skip.

## Docs resolution (`git show --remerge-diff 4d09af5c4`)
- ai.md dogs line: master's G374 wording plus PR1's "a gassed dog costs nothing".
- ai.md Sector Ops guard rules: PR1's shield / helmet / score facts kept (G374 added); master's response route,
  `responseTeam` and placeSlot-read tags kept; both sides' stale lines dropped. The shield claim matches the code
  (`s.shieldTeams === true`, sectorMode.ts:954; only campus S4 / S5 set it; live maps pass false).
- takedowns.md: master's stale "not built yet" gone, PR1's built facts with G374; the controller line keeps master's
  "nearest 3 tried" and heavy 'ok' plus PR1's "never a dog". No appended notes, no markers.

## Auto-merged code
- Shared files enemy.ts, enemyManager.ts, sectorMode.ts, sectors.ts, coopHost.ts, e2e-sectorops.mjs, TESTING.md,
  world-and-characters.md: no overlapping hunks; master's alloc rewrites and blips removal do not touch PR1's functions.

## Fix list
None.

## Polish
- takedowns.md:3 design-authority list could add G374.
- ai.md:710 archetypes line says heavy frontal = lethal only (master's text; the controller forces heavy 'ok').
- takedownController.ts:343 hangDown quadruped check is now unreachable (harmless).
