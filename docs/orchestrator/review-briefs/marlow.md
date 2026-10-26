# Conformance review: Marlow Build (plan only, no code)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". No src, test, map or config change.

## Docs
origin/master after #407 (and #400) land (until then read origin/feature/doc-final: `git show origin/feature/doc-final:<path>`).

## Scope
- Marlow Yard (`ctcourse`, Course mode): `src/world/maps/ctcourse*.ts`, `src/game/course/`, `src/game/modes/courseMode.ts` (markers :71-90), `src/ui/hud/courseHud.ts`; `docs/marlow-final/`.
- HUD guidance in Marlow Yard: the course markers and `courseHud.ts` above against the no-markers / objective rules as they apply to Marlow Yard (G292, G343, G351); the shared compass / minimap / map removal is Campaign Build's (campaign.md).
- Level validator and route-runs: `scripts/level-validate.mjs`, `scripts/metrics-gen.mjs`, `docs/level-validator/`, `docs/design/scale-sheet.md`; feature/level-validator-v6 (V6 `--require-measured`), feature/mission-validator, feature/route-runs (G330). The tools serve every map; Tallow Wharf's own ERRs are Campaign Build's.
- Guard cap: `scripts/guard-cap.mjs`, `docs/guard-cap/`, `MAX_ALIVE` (`src/ai/enemyManager.ts:83`, :135-136; the cap values per mode, G359 campaign 32).

## Compare against
- `docs/VISION.md` 2 (Marlow Yard column), 3 (objectives), 4 rules 3-7, 9, 5.
- `docs/level-design.md` Training profile, 4.9-4.11, 6.3-6.4, 9.3-9.4, 11.1-11.10, 13-14, Rule index, Open items.
- `docs/design-bible.md` 5.8, 5.10, 7.
- `docs/RULES.md` "Intake" step 5 (sign-off, validator, route-runs).
- DECISIONS G292, G330, G342, G343, G349, G351, G357, G359, G361, G363.

## Output
`docs/conformance-marlow/CONFORMANCE.md`:
1. Gap table, hard-rule breaks first: item | rule (doc + section / G) | current state with file:line | gap | fix size S/M/L | needs Michael?
   S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a fix that loosens a Michael-only rule; give native multiple-choice options.
2. "Checked, conforms": one line per scope item with no gap.
3. Rule fixes allowed at the cap (G355) marked as such.

## Where
Branch `feature/conformance-marlow` off origin/master, worktree `C:/NightShift/Mobile-Coop-conformance-marlow`. Commit and push each section; fragment `changes/feature-conformance-marlow.md` (`kind: patch`); a docs-only PR to master, "Conformance review: Marlow (plan only)". One fresh Opus checker (re-finds every file:line, checks each citation, looks for missed scope items) posts `checker`. Message the orchestrator with the PR number.

## Deadline
One session. Push a partial table every hour.
