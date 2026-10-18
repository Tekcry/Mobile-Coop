# Deleted maps - log (integrate/consolidate, 2026-10-17)

Michael's decision (docs/DECISIONS.md G12, G91: "Delete now", "Archive the docs"): the retired maps are deleted with their
tests: the 1934 Kestrel Exchange (`exchange`), the Trunk Annex (`trunk-annex`), Dead Line v1 (`dead-line`) and Dead Line
v2 (`dead-line-v2`). Their design data moves to `docs/archive/maps/design/`. Other docs that mention them are not edited
(later docs step); nothing committed.

Nothing in `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**` or `scripts/kestrel/**`
imported any of it (`scripts/kestrel/render-top.mjs` only names `scripts/g1v2-plan.mjs` in a comment as its origin).

## Files deleted
- Maps: `src/world/maps/exchange.ts`, `trunkAnnex.ts`, `trunkAnnex.data.json`, `deadLine.ts`, `deadLine.geo.json`,
  `deadLineV2.ts`, `deadLineV2.geo.json`.
- `src/ai/loopSchedule.ts` (timed guard loops on a master clock): only the Trunk Annex used it.
- Unit tests: `tests/exchangeMap.test.ts`, `tests/trunkAnnexMap.test.ts`, `tests/deadLineMap.test.ts`,
  `tests/deadLineV2Map.test.ts`, `tests/loopSchedule.test.ts`.
- E2E suites: `scripts/e2e-fp-map.mjs`, `e2e-fp-trunk.mjs`, `e2e-dead-line.mjs`, `e2e-dead-line-menu.mjs`,
  `e2e-dead-line-v2.mjs`, `e2e-dead-line-v2-menu.mjs`. Each was only about its map (boot, rooms, routes, teleports, the
  map's mission card); none covered anything that stays.
- Helper scripts: `scripts/gen-dead-line.mjs`, `gen-dead-line-v2.mjs` (geo.json generators), `g1-floors.mjs`,
  `g1-perf.mjs`, `g1v2-perf.mjs`, `g1v2-plan.mjs` (Dead Line gate renders and perf).

## Files moved (git mv)
`docs/design/` -> `docs/archive/maps/design/`: `map-dead-line.json`, `map-dead-line.png`, `map-dead-line-v2.json`,
`dead-line-v2-area1.svg`, `dead-line-v2-engine-check.md`, `map-dead-line-core.mjs`, `map-dead-line-engine.mjs`,
`map-dead-line-sim.mjs`, `map-trunk-annex.json`. `docs/archive/maps/README.md` lists them. The other Exchange / Annex /
Dead Line design docs were already in `docs/archive/maps/` (D0 docs cleanup).

## Ids / entries removed
- `src/world/maps/index.ts`: the four imports and `MAPS` entries (now `warehouse, proving, kestrel, seclab, courselab,
  bunker`); the header comment.
- `src/world/maps/listed.ts`: `LISTED_MAP_IDS` is now `warehouse, proving, kestrel`.
- `src/config/missions.json`: missions `exchange-greybox`, `trunk-annex`, `dead-line`, `dead-line-v2` (these were the
  Play-screen and co-op lobby mission cards, the "Dead Line menus"). 10 missions remain (4 Warehouse listed, 6 parked).
- Autostart ids `exchange`, `trunk-annex`, `dead-line`, `dead-line-v2`: now fall back to Proving Grounds like any
  unknown id (`getMap`).
- `scripts/run-e2e.mjs`: the six suites from REQUIRED and from COVERS (`src/game/`, `src/ai/`, `src/world/`). They were
  in no other list; `scripts/e2e-times.json` had no entries for them.
- No flags, bindings, settings or perf / soak / shot scenarios referenced these maps (`perf.mjs`, `soak.mjs`,
  `shot.mjs` checked).
- `src/config/noise.ts`: header comment points at the archived design scripts.

## Wire / save
- No wire change (`PROTOCOL_VERSION` stays 12): map and mission ids were always free strings on the wire.
- No save change (`SAVE_VERSION` stays 8): `profile.missions` is keyed by any `[a-z0-9-]` id, so records for the deleted
  missions stay readable and are simply never shown.

## Unit tests changed
- `tests/rooms.test.ts`: the map id list; the Dead Line nested-room exception removed.
- `tests/missions.test.ts`: listed missions are Warehouse only.
- `tests/voxelFit.test.ts`: the Dead Line v2 area bound removed.
- `tests/net.test.ts`: a new session defaults to Infiltration (follow-up below).

## Lost coverage
- The six map suites and four map unit tests (map-only). The timed master-clock patrol loop (`loopSchedule`) has no
  user left and went with its test.

## Kept on purpose
- `Patrol` per-point `waits` (`src/ai/patrol.ts`): a generic patrol option, two lines; only the Annex set it.
- `MapDef.debugPoints` and the debug teleport menu: Kestrel, Seclab and the bunker use them.
- The generic hold-noise path (`Interactable.holdNoise`) and `MANHOLE_LIFT_NOISE_RADIUS`: no remaining map sets hold noise and no runtime code reads the constant (only `tests/holdNoise.test.ts`); kept as a small generic path, not removed. Also: `e2e-course` failed once in a parallel run (client saw the lever door unlock after 1994 ms, limit 500) and passed solo.
- `docs/design/scale-sheet.md`: cited by `scripts/kestrel/facts.json` and `src/editor/climbCatalogue.ts`.
- Code comments elsewhere that mention Dead Line (`enemyManager.ts` guard cap, `nav.test.ts`, `patrol.ts`, `kestrel.ts`
  where "Dead Line" is the Mission 1 name of the Kestrel map): left for the docs step.

## Follow-up: lobby default
After the Wave removal `NetSession.mode` defaulted to the parked Hunter (`clear`); the lobby UI switched a non-legacy
host to Infiltration afterwards.
- `src/net/session.ts`: the default `mode` is now `infiltration`.
- `src/net/coopUi.ts`: a new host room is set explicitly: Infiltration with the first listed mission, or Hunter with
  `?legacy=1` (so `e2e-coop`, which runs with `legacy=1`, still starts on Hunter). `isParkedMode` import dropped.
- `tests/net.test.ts`: host and client sessions start on `infiltration`. `e2e-park` already asserts a non-legacy room
  starts on Infiltration; `e2e-coop` unchanged.

## Checks
- `npm run check`: pass.
- E2E (port 4191): smoke, e2e-levels, e2e-missions, e2e-modes, e2e-park, e2e-offline pass; e2e-coop failed once in the
  parallel run (known flaky, "offline state" selector timeout) and passed solo. Extra (co-op touched): e2e-netmove pass;
  e2e-course failed once in parallel (lever lock sync 1994 ms vs 500) and passed solo.
