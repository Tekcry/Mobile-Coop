# Test Runner batch (J20), PR-A: affected suites and runner
kind: patch
- `--affected` adds the co-op group (e2e-coop, e2e-netmove, e2e-ctcourse) for any file on the wire: `src/net/` and the
  files `src/net/protocol.ts` imports, read at the tested commit.
- Saltmarsh Park map files pick `e2e-sectorops` part 6 (all of `e2e-sectorops` with `--wide`).
- The audio suites join the legacy ones as REPORT ONLY: an affected request never gates on them.
- A quarantined suite that times out or crashes now fails the run; only an assert failure (exit 1) counts as KNOWN
  FLAKY. `E2E_REPORT` names suites that run REPORT ONLY in any run.
- `perf.mjs` prints the map and mode it measured.
