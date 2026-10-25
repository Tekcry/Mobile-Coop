# Menu job - subagent preamble (2026-10-18)

Read this whole file first. You implement one menu slice; the orchestrator commits.

## Location and guard
- Work only in `C:\NightShift\Mobile-Coop-menu`, branch `feature/menu`. Before every write:
  `cd /c/NightShift/Mobile-Coop-menu && test "$(git rev-parse --abbrev-ref HEAD)" = feature/menu && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-menu"`
- Never commit, push, stash, reset or checkout. Never touch other folders or branches.
- Never edit: `src/world/menuScene.ts` and the 3D menu background (Wren's poses come in a later slice), `src/editor/**`,
  `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`, `docs/DECISIONS.md`. Do not change player, anim,
  movement or AI code.

## What to follow
- CLAUDE.md hard rules. docs/DECISIONS.md (G77 menus Arkham plan; G12 desktop only: ignore every phone / touch item in
  the menu docs, MD16 is void; G22 remap capture cancels with Menu / Start or Esc, B stays bindable; G106 fixed
  difficulties, no Custom; G108 objectives live in the menu; D-11 / Michael 2026-10-18: kits are fixed per mission and
  complementary, so the loadout screen shows the issued kit rather than letting players choose; G2 two players).
- docs/menu-ui/SPEC.md (grep the screens you build), docs/menu-ui/DECISIONS.md (MD1-MD20), the step files your brief
  names in docs/menu-ui/steps/, docs/menu-ui/SLICE1.md (what slice 1 built: tokens, `src/ui/menuScreen.ts` template,
  title, main menu). Reuse the MenuScreen template; do not invent a second style.
- Prototype first (G87): working and visible, no polishing. Skip items the brief does not name; list them as skipped.
- Before changing a default, selector or screen flow, grep scripts/ and tests/ for assertions on it and update them.

## Checks
- `npm run check`; then e2e on port 4191 only, one runner at a time:
  1. Free the port: `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`
  2. `cd /c/NightShift/Mobile-Coop-menu && E2E_PORT=4191 E2E_JOBS=2 E2E_SUITE_TIMEOUT=900 node scripts/run-e2e.mjs <suites>`
     (it serves dist/ itself after `npm run build`; never start a server for it).
  3. Free the port again at the end.
- Known flaky (a failure prints KNOWN FLAKY): e2e-coop, e2e-netmove, e2e-darkness, e2e-weapons-carry, e2e-pad,
  e2e-foley, e2e-bunker. e2e-coop's "client strike denied" step is a known open failure. Any other failure counts only
  if it also fails a solo rerun.
- Never run `npm run dev` or watch modes. Every shell command has a timeout. Logs: tail -40 or grep.
- Leave `tests/__snapshots__/visionIsolation.test.ts.snap` out (line endings only).

## Screenshots
Extend `scripts/menu-shots.mjs` (slice 1) to save 1920x1080 PNGs of every screen you built into
`docs/menu-ui/shots/<slice>-*.png` (software GL; layout only).

## Docs and report
Write `docs/menu-ui/<SLICE>.md` (built, files, skipped, open items, results) like SLICE1.md. Final message, short:
built / skipped, files, check and e2e results, screenshot paths, open items.
