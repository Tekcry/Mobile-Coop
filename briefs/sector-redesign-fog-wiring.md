status: open

# Sector Ops: fog fix wiring test (follow-up to PR #339, fog check polish P1)

Lead: Night Shift | Sector Ops Build (brief 2026-10-24 ~21:40; orchestrator released it: a test, not refining).
Unit tests only: no e2e, no GPU, no npm run check.

Base: `feature/sector-redesign-fog` @ 031b54f1 (PR #339, campus fixed lights haze only under their shade). New branch:
`feature/sector-redesign-fog2` cut from that sha. Read first on the base: `docs/sector-redesign/checks/fog-check.md`
("Polish" P1), `docs/sector-redesign/checks/fog-triage.md`, CLAUDE.md "Hard rules" (hot paths allocate nothing;
Babylon only through src/core/babylon.ts).

The gap: the chain map `theme.lampBeams` -> `gameState.ts:613` (PostStack option `lampBeams`) -> `postStack.ts:467-471`
(`writeVolLight(..., beams)`) has no test. Dropping the gameState line or the last argument at postStack.ts:471 passes
every test today.

Only these files: `src/vfx/volLights.ts`, `src/vfx/postStack.ts` (only the vol-light loop in `frame`, lines ~463-474),
`src/game/gameState.ts` (only the `lampBeams:` line ~613), `tests/volLights.test.ts` (or one new
`tests/volLightsWiring.test.ts`), `docs/sector-redesign/checks/fog-wiring.md` (your report). Nothing else.

Build:
1. In `volLights.ts` export a pure, allocation-free `mapLampBeams(theme: { lampBeams?: boolean } | undefined): boolean`
   (default true) and use it at gameState.ts:613 (`lampBeams: mapLampBeams(world.map.theme)`).
2. Move the body of PostStack's vol-light loop into an exported allocation-free function in `volLights.ts`, e.g.
   `writeVolLights(lights, ids, n, lampBeams, pos, dir, col): number` (returns the count written), and call it from
   `postStack.ts` `frame` with `this.opts.lampBeams ?? true`. Behaviour must be identical; no closures, no temporaries.
3. Tests (node, no Babylon engine):
   - `mapLampBeams`: undefined theme / no field -> true; false -> false.
   - The real map defs: campusOps's theme gives false; ctcourse and warehouseOps give true (import the map defs the way
     existing map tests do; if importing a map pulls Babylon, read the `theme` object only from the module that defines it).
   - `writeVolLights` with a fake light list mixing a coned fixed lamp (no fixture model), an LED fixture and a
     flashlight: with lampBeams false only the flashlight writes a beam (same fields `writeVolLight` writes today);
     with true the coned lamp beams too. Assert the count and the per-slot beam flag / length the shader reads.
   - A guard test that fails if PostStack stops passing the option: assert `postStack.ts` source calls
     `writeVolLights(` with `lampBeams` (read the file text with node fs; one regex) and that `gameState.ts` source
     contains `mapLampBeams(`. Name it clearly as a wiring guard.
4. Run: `npx tsc --noEmit -p .` and `npx vitest run tests/volLights*.test.ts --maxWorkers=2`. Report counts.

Done: branch pushed, tsc clean, the tests above pass, report `docs/sector-redesign/checks/fog-wiring.md` (what changed,
test counts, deviations), status line `done feature/sector-redesign-fog2 <sha>`.
