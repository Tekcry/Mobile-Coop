# Step 18 - Final spec and integration plan (the run ends)

Model: Opus 5.5, High effort. One session. Unattended (DECISIONS D15).

## Objective

The final spec and the integration plan; the run ends here.

## Read (only these, plus the common files)

- BRIEF.md Stage 3; SPEC (all, grep); both DESIGN.md files; LOG.md open items.

## Do

1. Rewrite SPEC.md as the final spec (BRIEF Stage 3 list): the character detail sheet (bible 5.16), parts, kit and
   materials, LOD rules, phone vs desktop, measured budgets, animation and clipping risks (straps, harness, pouches,
   goggles vs the rig's joint limits and 5.12.2, the 10 cm height difference in paired moves and traversal), and the
   integration plan for after feature/ct-locomotion merges (files, A1 A3-A7 proportion fixes, the A-pose bind (D13),
   e2e and visual checks, CHANGELOG / TESTING / docs).
2. Tell Michael the run is complete and how to review (the step 17 page). Do NOT start another session.

## Out of scope

Asset changes.

## Checks (all must pass before the commit)

- The step's own outputs exist and work as described; `npm run check` passes.
- `npm run check` passes.

## Finish

- LOG.md: what was built, numbers, open items. STATE.md: the next step (keep it short).
- Commit and push `feature/operators`.
- Progress for Michael (D16): send this step's renders (screenshots for tooling steps) with SendUserFile (status
  proactive, display render) and a three-line note: what was built, what passed, what is open.
- The run ends: report to Michael; start nothing.
