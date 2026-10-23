# E2E affected-suite selection
kind: patch
- Test tooling: `node scripts/run-e2e.mjs --affected <base-ref> [--list]` picks the e2e suites a PR must pass from its committed diff
  (merge-base to HEAD, so it works on a detached commit); `--list` prints them and exits. The folder -> suites map moved
  to the pure module `scripts/e2e-affected.mjs` (shared by `--quick`) and was widened with cross-area rules: `src/weapons`
  -> `e2e-stealth-ai` + `e2e-sectorops:1` (train 30), `src/ai` -> the guard suites, `src/net` / `src/save` / the wire ->
  the co-op group, lamp files and `src/voxel` -> the light suites, `src/player` / `src/anim` -> takedown too. Docs-only
  changes pick no suites. `tests/e2eAffected.test.ts`; `docs/systems/testing-tools.md` "Choosing suites for a change".
