# Guard cap: state

## Now (2026-10-23)
Tooling written, never executed (WIP commit under a usage limit; laptop test slots busy). `scripts/guard-cap.mjs`
passes `node --check`. No src change.

## Next
1. Laptop, on this branch rebased on 4.62.0, `npm run build`, free port 4189, take the GPU lock, then:
   `E2E_GPU=1 E2E_PORT=4189 node scripts/guard-cap.mjs --maps=sectorops,ctcourse --counts=0,12,16,24 --warm=3 --secs=10 --out=docs/guard-cap`
   (~2-3 min per map x count). Output: `docs/guard-cap/guard-cap.json`, `docs/guard-cap/RESULTS.md`.
2. Fill `REPORT.md` from `RESULTS.md`, apply its decision rule, commit, PR.

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
