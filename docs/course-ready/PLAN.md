# course-ready - plan

Slices (each: implementer, fresh checker, at most 1 fix round; test tier "a slice" per CLAUDE.md).

## S1 - walkthrough audit and fixes
- Audit (read-only): `src/world/maps/ctcourse.ts`, `src/game/course/*`, the station devices (`src/game/ctDevices.ts`,
  `jammer.ts`, `scanners.ts`), `scripts/e2e-ctcourse.mjs` and `scripts/e2e-coop.mjs`, played as host and as client.
  Output: `AUDIT.md`, a numbered list of blockers and confusions per station (owner: us or CT Core).
- Fix ours in `src/world` / `src/game/course`; send CT Core's to the orchestrator.
- Tests: `tests/ctcourse.test.ts` extended for each fix; e2e-ctcourse (+ e2e-coop when `src/game` changed).

## S2 - prototype light pass
- Light survey: the light field level at every place a player must see (each station's route, panels, plates, team-move
  squares, switches, airlocks, exit) and at the hiding spots that should stay dark. Output: a table in `LIGHT.md`.
- Add or move lamps (`b.light`) so every must-see spot reads lit and the dark spots stay dark; a unit test asserts the
  table (light field, Babylon-free where possible).
- GPU shots (Michael's PC, port 4189, `E2E_GPU=1`, headless) per station into `shots/`.

## S3 - walkthrough guide and finish
- `WALKTHROUGH.md` (menu path, version label, per station both players' steps).
- CHANGELOG ("Unreleased - course-ready"), TESTING.md, `docs/systems/lighting.md` / world docs where touched.
- Full `npm run e2e` on the PR head (desktop lock or the laptop runner), PR to master (minor), report to the orchestrator.
