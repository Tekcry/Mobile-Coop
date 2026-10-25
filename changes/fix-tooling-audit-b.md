# Tooling audit B fixes
kind: patch
- Auto-train pacing reads the laptop queue as it is (`requests/` and `claims/`, one GraphQL call): busy while a request
  has no claim yet (under 12 h old) or a claim is open (under 3 h old). The old read looked for `pending/` / `running*`
  markers the branch never had, so every tick read idle and pacing never waited.
- Auto-train self-updates its checkout (fast-forward only, clean tree) right after each release as well as on idle
  ticks, before the next train is built; back-to-back trains had left it at train 80 with master at 86.
- `swap.mjs` save check reads the laptop slot locks (`heavy-4189.lock`, `heavy-4192.lock`) and any other
  `heavy*.lock` beside `heavy.lock` / `heavy2.lock`; a dead pid in any of them is an item.
- Affected e2e requests leave out the GPU-only and legacy suites (`affectedGateSuites`; the runner's GPU / LEGACY
  lists now live in `scripts/e2e-affected.mjs`), so affected-e2e never runs or gates on them.
- Dead scripts moved to `scripts/archive/` (no package script, workflow, live script or scheduled task used them):
  `ghost-strip`, `menu-shots3/4/5`, `menu-boot-time`, `camera-cue-shots`, `nv-shots`, `sector-fixes-c-shots`,
  `wheel-shots`, `laptop-runner.ps1`; doc paths updated.
