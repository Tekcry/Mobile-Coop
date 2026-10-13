# Step T5b - Michael's walk notes (Block C start)

Model: implementer opus, checker opus. Deps: T5 and Michael's notes in docs/training/WALK-NOTES.md (D27).
If WALK-NOTES.md is missing or empty: log "no walk notes", mark T5b done and go to TM.

## Read
- docs/training/WALK-NOTES.md (all of it); BAYS.md only the bay sections the notes name; the bunker map files they touch

## Task
1. Turn the notes into a numbered fix list in LOG.md under T5b (one line each: bay, note, fix, BAYS change if any).
2. Apply every geometry, anchor, door and spawn fix. A note that changes a route, gate or guard job: update BAYS.md (the
   sheet and the register row) and log it under "Spec change requests" (D12: no approval needed).
3. A note asking for a new system or a new verb: not built here; list it in REVIEW-NOTES.md as a proposal.
4. Re-run the map tests (lips, split gaps, co-op lips, nav order).

## Checks
`timeout 900 npm run check`; `node scripts/plan-svg.mjs`; `node scripts/run-e2e.mjs e2e-course e2e-anchors smoke`.

## Commit
"training T5b: walk notes applied". Docs: BAYS.md (changed sheets), LOG, STATE.
