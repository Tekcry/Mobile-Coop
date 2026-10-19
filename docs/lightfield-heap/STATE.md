# lightField heap check under load - state

**Now (2026-10-19 22:20, paused for Michael's account switch):** the fix is committed and pushed (e0984128). Not done:
the 5 loaded `npm run check` runs on the final code, and the PR.

**Where the verification stands:**
- 5 loaded `npm run check` runs on the first version (6016e700): 5/5 PASS (unit run 13-21 s, e2e-menus alongside).
  Superseded by the later changes, so they do not count.
- Measured with `npx vitest run tests/lightField.test.ts --silent=false` on d5cf34fc (control rounds of 5000):
  e2e-menus alongside 6/6 PASS and alone 3/3 PASS; levelAt 32.4, bodyLevel 113.2-121.0, control 272.4 B a query
  every run.
- e0984128 (the control's rounds cut to 2000 so no scavenge fits in one; comments): not run yet.

**Next (resume):**
1. On the laptop, take `C:/NightShift/heavy.lock` and run at BelowNormal, port 4191, `E2E_JOBS=1`: 5 times, with
   `node scripts/run-e2e.mjs e2e-menus` running alongside from another built worktree (`npm run check` rebuilds
   `dist`, so the load must not serve this folder's `dist`): `npm run check`, then
   `npx vitest run tests/lightField.test.ts --silent=false` and log its "bytes per query" line. All 5 must pass.
2. Record the runs here; push; open one PR to master titled "lightfield-heap: the allocation check is stable under
   load"; tell the orchestrator. The orchestrator sets the version.

## Resume prompt
```
lightField heap fix: RESUME. Folder C:/NightShift/Mobile-Coop-lightfield-heap, branch feature/lightfield-heap (pushed).
Read CLAUDE.md, then docs/lightfield-heap/BRIEF.md and docs/lightfield-heap/STATE.md, and follow STATE "Next".
Laptop rules: heavy work one at a time with C:/NightShift/heavy.lock, E2E_JOBS=1, BelowNormal priority, port 4191,
headless, no GPU or visual checks; tests only, never game code. Laptop runner requests from CT Core, then Menu Notes,
then Sector Ops come before this job. Report to "Night Shift | Orchestrator" when the PR is open or if blocked.
```

## Done
- 2026-10-19: e0984128: the control's rounds are 2000 queries (about 0.5 MB, under the 1 MB minimum semi-space).
- 2026-10-19: d5cf34fc: every reading keeps its smallest round; the control's vector escapes into a 64-slot ring (a
  fully optimized control read 63 B and failed the relative check, 32.38 < 30.73).
- 2026-10-19: 6016e700: small rounds, up to 40 with 25 ms yields.
- 2026-10-19: branch off master fca0e267; BRIEF.
