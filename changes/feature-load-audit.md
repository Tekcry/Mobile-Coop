# Load audit
kind: patch
- Tests: every page of an e2e browser context gets the 120 s navigation default (was only pages opened through
  `openPage`): e2e-desktop's crash-log page (`ctx.newPage()`) ran past Playwright's 30 s on a loaded machine. Found by
  the load audit (master 4.61.0, three full GPU runs at E2E_JOBS=5, two with a CPU burner): the only load-only failure.
