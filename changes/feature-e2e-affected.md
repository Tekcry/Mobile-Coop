# E2E affected-suite selection
kind: patch
- Test tooling: `node scripts/run-e2e.mjs --affected <base-ref> [--wide] [--list]` picks the e2e suites a PR must pass from its
  committed diff (merge-base to HEAD, so it works on a detached commit); `--list` prints them and exits. The default is the
  DIRECT tier (only the suites that drive the changed area: e.g. optic-cable 13 jobs, guard-ai-carry-fix 7); `--wide` adds the
  cross-area readers (30 and 15). `src/weapons` -> `e2e-stealth-ai` + `e2e-sectorops:1` in both (train 30). The section rating
  files pick `e2e-section-rating`, the Marlow Yard sets and `scripts/e2e-ctcourse/` pick `e2e-ctcourse`, and every LEGACY / GPU
  suite is reachable from the area that owns it. Docs-only changes pick no suites. The maps live in the pure module
  `scripts/e2e-affected.mjs`; `--quick` keeps master's map and rules unchanged (`QUICK_COVERS` and `SUITE_DIRS`, checked row by
  row against a frozen copy of master's map at train 62). `tests/e2eAffected.test.ts`; `docs/systems/testing-tools.md`
  "Choosing suites for a change".
- Laptop queue: `node scripts/laptop-queue/request.mjs --sha <ref> --affected [--wide]` picks the suites from the diff against origin/master (DIRECT tier; `--wide` the cross-area set) instead of a hand-picked `--suites` list; a diff that reaches no browser suite is refused.
