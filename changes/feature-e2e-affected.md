# E2E affected-suite selection
kind: patch
- Test tooling: `node scripts/run-e2e.mjs --affected <base-ref> [--wide] [--list]` picks the e2e suites a PR must pass from its
  committed diff (merge-base to HEAD, so it works on a detached commit); `--list` prints them and exits. The default is the
  DIRECT tier (only the suites that drive the changed area: e.g. optic-cable 13 jobs, guard-ai-carry-fix 7); `--wide` adds the
  cross-area readers (29 and 15). `src/weapons` -> `e2e-stealth-ai` + `e2e-sectorops:1` in both (train 30). Docs-only changes
  pick no suites. The maps live in the pure module `scripts/e2e-affected.mjs`; `--quick` keeps master's map and rules unchanged
  (`QUICK_COVERS`, checked row by row against a frozen copy). `tests/e2eAffected.test.ts`; `docs/systems/testing-tools.md`
  "Choosing suites for a change".
