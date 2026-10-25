# Conformance review: Sector Ops Build (plan only, no code)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". No src, test, map or config change.

## Docs
origin/master after #398, #402, #404 land (until then read `C:/NightShift/Mobile-Coop-doc-polish-l`).

## Scope
- Saltmarsh Park S1-S5: `src/world/maps/campusOps.ts`, campusS1-S5*.ts, campusSectors.ts, campusBake.ts, `src/world/campusArt/`; `src/game/modes/sectorMode.ts`, sector*.ts in `src/game/`; stars `src/save/sectorRecord.ts`; `docs/sector-redesign/` (sign-offs, G328); campus graphs in `docs/level-validator/campus-run/`; feature/campus-greybox c2f1f131 (BRIEF, PLAN, lanes S1-S5); `warehouseOps` (the old map).
- Lighting on every map: `src/world/` light files (lightBake.ts, lightField.ts, sectionBake.ts, lights.ts, lampMath.ts, darkCurve.ts, charShadows.ts, torchShadows.ts, `lighting/`); the meter; feature/light-realism bd8b843e (`scripts/light-measure/`); `docs/systems/lighting.md`.
- Visual gate: feature/visual-gate (PLAN VG1-VG8), `scripts/e2e-darkness.mjs`, `docs/visual-gate/`, #385.

## Compare against
- `docs/VISION.md` 2 (Sector Ops column), 4 rules 1, 2, 9, 10; 5.
- `docs/level-design.md` Sector Ops profile, 3.2, 4.4, 4.9, 4.11, 4.12, 5.2, 5.5, 11.1-11.7, 14, 15, Rule index.
- `docs/design-bible.md` 5.1 (P1, L-rules incl. character shadows), 5.8, 7, 8.
- `docs/systems/performance.md` budgets.
- DECISIONS G297, G307, G316, G328, G329, G331, G333, G352, G362.

Check per map: real lux bands vs stealth from real gaps (rule 2); character shadows in the meter (G352, not built); graphs with `players: [1,2,3,4]`, per-count guards (two-player counts S1 15 / S2 18 / S3 20 / S4 25 / S5 26), `unavoidable` tags; a higher clear fills lower stars.

## Output
`docs/conformance-sector-ops/CONFORMANCE.md`:
1. Gap table, hard-rule breaks first: item | rule (doc + section / G) | current state with file:line | gap | fix size S/M/L | needs Michael?
   S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a fix that loosens a Michael-only rule; give native multiple-choice options.
2. "Checked, conforms": one line per scope item with no gap.
3. A per-map lighting line (map | band source | measured or not | gap).

## Where
Branch `feature/conformance-sector-ops` off origin/master, worktree `C:/NightShift/Mobile-Coop-conformance-sector-ops`. Commit and push each section; fragment `changes/feature-conformance-sector-ops.md` (`kind: patch`); a docs-only PR to master, "Conformance review: Sector Ops (plan only)". One fresh Opus checker (re-finds every file:line, checks each citation, looks for missed scope items) posts `checker`. Message the orchestrator with the PR number.

## Deadline
One session. Push a partial table every hour.
