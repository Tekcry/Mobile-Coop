# Guard cap: state

## Now (2026-10-23)
Tooling written, never executed. Rebased on master a71c8c02; dry-reviewed against src (hooks, globals, URLs all real)
and fixed (spawn height, cap = N, per-cell timeouts, sim-advance / shadow-counter flags, frame split by sim steps,
re-alert per sample, 5 s warm-up minimum, GPU-or-`--software` gate, CSV + REPORT.md fill). `node --check` passes. No
src change.

## Next
1. Laptop, on this branch, `npm ci` (the worktree has no node_modules), `npm run build`, free port 4189, take the GPU
   lock, then:
   `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse --counts=0,12,16,24 --warm=5 --secs=10 --out=docs/guard-cap`
   (~2 min per map x count, ~15-20 min). Output: `docs/guard-cap/guard-cap.json`, `guard-cap.csv`, `RESULTS.md`, and
   the results block of `REPORT.md` filled.
2. Read the flags and errors in `RESULTS.md`, apply `REPORT.md`'s decision rule, commit, PR.

## Open / risks for the first run
- Untested in a browser: a page-side mistake shows as a cell error (logged, the run continues); fix those first.
- `pageSpawn` may find fewer than N cells near a map's start: it logs "asked for N, got M".
- Marlow: removing the course's two passive squad guards leaves stale refs in `CourseMode.squad`; a bay start or
  restart would dispose them again. The player stands still, so no bay event should fire.
- Sector Ops: alerted guards may run to an alarm panel; reinforcements are blocked by `maxAlive = N`.
- The GPU timer query may be hidden by Chrome (GPU ms n/a; the uncapped frame ms still shows render cost).
- Headless GPU timings are relative, not fullscreen numbers.

## Done
- 2026-10-23: `scripts/guard-cap.mjs`, `REPORT.md` (method, empty tables, decision rule), changelog fragment.

## Resume prompt
```
Night Shift guard-cap job (branch feature/guard-cap, folder C:/NightShift/Mobile-Coop-guard-cap). Read CLAUDE.md,
docs/guard-cap/STATE.md and docs/guard-cap/REPORT.md. Run the command in STATE "Next" on the laptop GPU (port 4189,
heavy lock), fix any cell errors in scripts/guard-cap.mjs (no src change), fill REPORT.md from RESULTS.md, apply the
decision rule, commit, push, open a PR.
```
