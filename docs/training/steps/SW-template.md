# Switch-on step template (later runs, one per row of PLAN.md section 3)

Start a switch-on run with "Training: SW-<id>. Follow docs/training/steps/SW-template.md for SW-<id>." The orchestrator
copies this template to `steps/SW-<id>.md`, fills it from PLAN section 3's row and FEATURES.md, then runs the BRIEF
section 4 loop for it. Rules: docs/training/RULES.md.

## Read
- PLAN.md section 3 (the row), FEATURES.md rows whose status names the trigger, BAYS.md sections of the bays in the row
- The landed feature's own doc (docs/systems/*.md, or the step file on its branch) by section

## Task
1. Merge the feature's branch (`origin/feature/ct-locomotion` or `origin/feature/kestrel`) into feature/training-bunker
   with a merge commit (RULES); resolve conflicts keeping both behaviours; re-run `npm run check` and
   `npm run e2e:quick`; protocol version per RULES.
2. For each element in the row: flip its `ElementFlag.final` to true in src/world/maps/bunkerCourse.ts, replace the now
   form (switch / plain door / radio skip) with the feature's own device or verb, and remove its "not live" radio line.
3. Extend scripts/e2e-bunker.mjs for the bay sections touched: the final form works for host and client; the verb shows
   in the per-player log for both players where FEATURES says "(both)".
4. FEATURES.md: status column -> exists; placeholder column -> "-".

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course` plus the feature's own suite; e2e-coop and
e2e-netmove when the feature has a MoveState mode or a message; full `npm run e2e` at the end; GPU items for the bays
touched (RULES "GPU on this PC").

## Commit
"training SW-<id>: <feature> live in <bays>". Docs: LOG, STATE, FEATURES, CHANGELOG, TESTING (the bays' lines).
