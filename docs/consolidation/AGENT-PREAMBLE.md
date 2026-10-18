# Consolidation deletions - subagent preamble (2026-10-17)

You are a subagent of the consolidation orchestrator (docs/systems/session-method.md). Read this whole file first.

## Location and branch guard
- Work only in `C:\NightShift\Mobile-Coop-integrate`, branch `integrate/consolidate`. Never touch any other folder or
  branch. Before every command that writes files, run (Git Bash):
  `cd /c/NightShift/Mobile-Coop-integrate && test "$(git rev-parse --abbrev-ref HEAD)" = integrate/consolidate && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-integrate"`
- Never commit, push, stash, reset or checkout. The orchestrator commits.
- Never edit `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`. If a deletion needs a change
  there, stop and report it.

## Rules (CLAUDE.md hard rules hold)
- Desktop only, pad first then keyboard and mouse. Babylon only through `src/core/babylon.ts`. Strict TS
  (`import type`). No hot-path allocation; `hyp2` / `hyp3`, never `Math.hypot`. Single player never imports `src/net`
  statically. Saves only through `src/save`.
- Save shape: if a deletion changes what is saved, bump `SAVE_VERSION`, add a migration and a unit test with a literal old
  save. Prefer leaving unused fields readable (as the Wave removal kept `profile.stats.bestWave`) when that is simpler.
- Wire: `PROTOCOL_VERSION` is 12 (set by the Wave removal in this same unmerged branch). If your change alters the wire,
  set it to 13 if it is 12; if it is already 13, leave it. Update the tests that assert it.
- Docs (*.md): do not edit docs other than your deletion log, unless your brief says so. The docs rewrite is a later step.
- Before removing anything, grep `src/`, `tests/`, `scripts/` (including `scripts/run-e2e.mjs` REQUIRED / LEGACY /
  COVERS / KNOWN_FLAKY / CORE / PARTS lists and `scripts/e2e-times.json`) for every id, file and setting you remove, and
  update or delete every use. Deleted features take their tests and e2e checks with them; keep every check that covers
  something that stays.
- Michael's decisions: docs/DECISIONS.md (G entries). Pure Chaos Theory, 2-player co-op, Hunter mode stays (parked
  behind `?legacy=1`), sandbox, infiltration, mission (parked), course and the Fallow bunker stay.

## No hangs, low tokens
- Never run `npm run dev`, `npm run preview`, `npx vite preview` or any watch mode. Every shell command has a timeout.
- Logs: `tail -40` or grep. Source: grep, then line ranges; do not read huge files whole.
- Same error twice with no progress: stop and report. Budget: about 100 tool calls.

## Checks
- `npm run lint`, `npm test`, `npm run build` (or `npm run check`, which is all three).
- E2E suites only after a build, one runner at a time, on port 4191 only:
  1. Free the port: `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
  2. Run: `cd /c/NightShift/Mobile-Coop-integrate && E2E_PORT=4191 E2E_JOBS=2 E2E_SUITE_TIMEOUT=900 node scripts/run-e2e.mjs <suite> <suite> ...`
     (the runner starts and stops its own server; never start one yourself).
  3. When done: step 1 again, then check `netstat -ano | grep ":4191 .*LISTENING"` prints nothing.
- Known flaky suites (print KNOWN FLAKY, do not fail): e2e-coop, e2e-netmove, e2e-darkness, e2e-weapons-carry, e2e-pad.
  e2e-foley is known flaky too. Kestrel-owned pre-existing failures: e2e-editor, e2e-kestrel, e2e-camera-bounds level U. Another failure counts only if
  it also fails in a solo rerun.

## Deletion log
Write `docs/consolidation/deleted-<topic>.md` in the style of `docs/consolidation/deleted-modes.md`: files deleted, files
added or renamed, ids / settings / flags / bindings removed, wire and save changes, unit tests changed, e2e suites changed,
lost coverage, kept on purpose.

## Report (your final message, short)
Done / not done, files touched (count plus key ones), save / protocol changes, check results, suites run with pass /
fail, lost coverage, open items, anything you were unsure of.
