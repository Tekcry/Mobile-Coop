# Conformance review: Marlow Build (plan only, no code)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". No src, test, map or config change.

## Docs
origin/master after #407 (and #400) land (until then read origin/feature/doc-final: `git show origin/feature/doc-final:<path>`).

## Scope
- Marlow Yard (`ctcourse`, Course mode): `src/world/maps/ctcourse*.ts`, `src/game/course/`, `src/game/modes/courseMode.ts` (markers :71-90), `src/ui/hud/courseHud.ts`; `docs/marlow-final/`.
- HUD guidance in every mode: compass and blip (`src/ui/hud/hud.ts:34-35`, :264; `src/game/gameState.ts:3634`), `src/ui/hud/minimap.ts` and its mode users, briefing and field-menu maps (`src/ui/screens/`), objective popup (G343, G351).
- mission-framework: PR #372 (5181c9db), feature/mission-engine 00b6cde9 (`src/game/mission/`, `src/ui/hud/missionHud.ts`, `docs/missions/` PLAN A1-A12).
- Tallow Wharf: `src/world/maps/tallowWharf.ts`, tallowWharfKit.ts, `docs/missions/prototypes/campaign-map/` (graph.json, SPEC, 3 gate-reach ERRs); prototypes Three Grey Coats, Two-Key Ledger.
- Level validator: `scripts/level-validate.mjs`, `scripts/metrics-gen.mjs`, `docs/level-validator/`, `docs/design/scale-sheet.md`; feature/level-validator-v6, feature/mission-validator, feature/route-runs.
- Guard cap: `scripts/guard-cap.mjs`, `docs/guard-cap/`, `MAX_ALIVE` (`src/ai/enemyManager.ts:83`, :135-136; G359 campaign 32).

## Compare against
- `docs/VISION.md` 2 (Campaign and Marlow Yard columns), 3 (objectives), 4 rules 3-7, 9, 5.
- `docs/level-design.md` Campaign and Training profiles, 4.9-4.11, 6.3-6.4, 9.3-9.4, 11.1-11.10, 13-14, Rule index, Open items.
- `docs/design-bible.md` 5.8, 5.10, 7.
- `docs/RULES.md` "Intake" step 5 (sign-off, validator, route-runs).
- DECISIONS G290, G292, G334, G336, G339, G340, G342, G343, G349, G351, G353, G357, G359, G361, G363.

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
