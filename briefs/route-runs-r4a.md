status: claimed Night Shift | Cloud Builder 3 2026-10-26T00:10+11:00
# J13 route-runs, slice R4a (Opus-grade brief): harness core, one page

Lead: Night Shift | Marlow Build. Plan passed (Opus plan check 3, PASS on 6fab6ef0f). R1, R2 and R3 are on master.
Sector Ops' campus v2 greybox exit waits on this harness: build it next.

- Base: origin/master (57a02d4ef or newer: it holds `scripts/route-run/plan.mjs`, `progress.mjs`, `report.mjs` from
  R1-R3). New branch: `feature/route-runs-r4a`. Push every sub-step.
- Read first: `docs/systems/agent-preamble.md` (origin/master), then the spec:
  `git show origin/feature/route-runs-2:docs/route-runs/PLAN.md` slice **R4a** (search `**R4a Harness core`, ~line 135
  to the R4b slice) - build it word for word, including the three seam modules (`steps.mjs`, `causes.mjs`,
  `course.mjs`, every kind `stub` / no-op here) and the selftest fixture with its `expect` block - and the BRIEF entries
  it cites (`docs/route-runs/BRIEF.md` on the same branch: Restarts and retries :117-138, Dead stops :77-82, A2, A5, A13,
  A14, A15). Reuse `scripts/e2e-lib.mjs` (`launch`) and the patterns in `scripts/e2e-ctcourse.mjs:304` (courseBay) and
  `scripts/e2e-sectorops.mjs` part 6 (sections through the connector cycle). `--publish` follows the
  `scripts/laptop-queue/request.mjs` git-plumbing pattern (temp index, no checkout, retry on a lost push race) to
  branch `route-run-results`.
- Extra requirement (Sector Ops, campus v2 greybox exit): the boot URL keeps any query params the caller passes in
  `<url>` - in particular `?campusv2=N` - on every page the harness opens (R4b adds the second page; build the URL
  helper so both pages share it). A unit test pins it.
- J14 hooks now on their way (dark, `feature/marlow-replan-r1`): `window.__course.restarts`, `lastRetry = { st, cause }
  | null`, host-only `__course.retryOff(n)`, `?course=station:<n>`. R4a's `course.mjs` stays no-op; do not depend on
  them yet.
- Only files to edit: `scripts/route-run.mjs`, `scripts/route-run/driver.mjs`, `scripts/route-run/publish.mjs`,
  `scripts/route-run/steps.mjs`, `scripts/route-run/causes.mjs`, `scripts/route-run/course.mjs`,
  `tests/fixtures/route-run/selftest.graph.json`, a unit test for the pure parts (args parsing, URL helper, `--merge`,
  the dry run) `tests/routeRunCli.test.ts`, and `changes/feature-route-runs-r4a.md` (kind: patch). Do not edit R1-R3's
  modules; if you need a change there, write it in your report for the lead.
- Hard rules (`CLAUDE.md` on origin/master): headless and invisible, never `E2E_HEADED`, no pointer lock; hot paths in
  the in-page driver allocate nothing per step; use `hyp2` / `hyp3`.
- Tests to run (unit only, no e2e, no GPU, no browser, no npm run check): `npx tsc --noEmit -p .`,
  `npx vitest run tests/routeRunCli.test.ts` plus the R1-R3 test files (`tests/routeRun*.test.ts`), and
  `node scripts/route-run.mjs --dry-run ...` on the campus S1 graph (it must not launch a browser). Every browser check
  (the selftest, the campus S1 code-route run) is "pending PC run": the lead requests it on the laptop queue.
- Done: the R4a "Done" line's code parts hold; the laptop runs are left for the lead.
- Report: append what changed, tests with counts, deviations, and anything the lead must request on the laptop; set
  `status: done feature/route-runs-r4a <sha>`.
