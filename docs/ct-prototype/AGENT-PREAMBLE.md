# CT prototype - subagent preamble (2026-10-18)

Read this whole file first. You implement one prototype slice; the orchestrator commits. Prototype first (G4): working
and playable, no polishing, every number a starting value (G10).

## Location and guard
- Work only in `C:\NightShift\Mobile-Coop-ct-prototype`, branch `feature/ct-prototype`. Before every write:
  `cd /c/NightShift/Mobile-Coop-ct-prototype && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ct-prototype && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-ct-prototype"`
- Never commit, push, stash, reset or checkout. Never touch other folders or branches.
- Never edit `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`, `docs/DECISIONS.md`,
  `src/world/menuScene.ts`, menu screens in `src/ui/screens/` (the menu job owns them on another branch).
- Wren (the new player body) lands later from the operators branch: do NOT change character meshes, rig proportions or
  skinning; posture / pose angles wait for Wren unless your brief says otherwise.

## What to follow
- CLAUDE.md hard rules (Babylon only via src/core/babylon.ts, no hot-path allocation, hyp2 / hyp3, gameplay never
  reads graphics state, single player never imports src/net statically, saves only via src/save).
- docs/DECISIONS.md (G entries your brief cites). The plan: `C:\NightShift\Mobile-Coop-ct-research\docs\ct-prototype\PLAN.md`
  (read-only; it lives on the research branch until that PR merges). Footage numbers:
  docs/archive/locomotion/PROTOTYPE-PLAN.md and docs/archive/locomotion/research/ct-measure-*.md.
- Co-op parity: remotes pose from MoveState; a wire change bumps PROTOCOL_VERSION (13 -> 14 once for this branch).
- Before changing a default, speed, timing or binding, grep scripts/ and tests/ for assertions on it; update them to
  the new numbers or mark them `// prototype: revisit` and skip, never leave them failing.

## Checks (light, no fix rounds)
- `npm run check`; then e2e on port **4193** only (the menu job uses 4191), one runner at a time:
  1. Free the port: `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4193 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
  2. `cd /c/NightShift/Mobile-Coop-ct-prototype && E2E_PORT=4193 E2E_JOBS=1 E2E_SUITE_TIMEOUT=900 node scripts/run-e2e.mjs <suites>`
     (after `npm run build`; it serves dist/ itself).
  3. Free the port again at the end.
- Known flaky: e2e-coop, e2e-netmove, e2e-darkness, e2e-weapons-carry, e2e-pad, e2e-foley, e2e-bunker (e2e-coop's
  "client strike denied" is a known open failure). Another session runs e2e at the same time, so a timing failure
  counts only if it also fails a solo rerun.
- Never run `npm run dev` or watch modes. Every shell command has a timeout. Logs: tail -40 or grep.

## Report
Write `docs/ct-prototype/<SLICE>.md` (built, numbers used, files, skipped, tests changed, results, what Michael should
try when he plays). Final message, short: built / skipped, check and e2e results, how Michael plays it (URL params).

## Heavy slot (Michael, 2026-10-19)
Before any heavy run (npm run check, full vitest, npm run build, any e2e, GPU shots) check `C:\NightShift\heavy.lock`.
If it exists, do not start the run: keep coding and re-check every few minutes. If absent, write
"CT Core Build | <slice> | <time>" into it, run, and delete it when done. One or two small vitest files are light work.
