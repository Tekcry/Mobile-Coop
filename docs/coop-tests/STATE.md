# Co-op test fix - state

**Now (2026-10-19):** started. Branch made, docs written; steps 1-4 in progress (script edits, then solo runs on the
laptop).

**Next:** sim-clock waits and the 960 x 480 viewport in the four two-page suites, the netmove walk-off, then solo runs
of e2e-netmove, e2e-ctcourse, e2e-coop, then e2e-coop off Hunter.

**Open:**
- CT Core's 0.75 m wall-entry commit (expected conflict in e2e-netmove: take 0.75).
- netmove "stacked on one wall" (:441) reads the remote's feet after an 800 ms wall wait (CT Core: likely the same
  lag).

## Done
- 2026-10-19: branch `feature/coop-tests` off `feature/process-audit` 7a01b254; BRIEF and STATE.

## Resume prompt
```
Co-op test fix: RESUME. Folder C:/NightShift/Mobile-Coop-coop-tests, branch feature/coop-tests. Read CLAUDE.md, then
docs/coop-tests/BRIEF.md and STATE.md, and carry on from "Next". Report to the Night Shift | Orchestrator session.
```
