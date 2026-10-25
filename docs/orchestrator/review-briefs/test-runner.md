# Conformance review: Test Runner (plan only, no code)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". No script, test, queue or config change.

## Docs
origin/master after #407 (and #400) land (until then read origin/feature/doc-final: `git show origin/feature/doc-final:<path>`).

## Scope
- Suites: `scripts/run-e2e.mjs`, `scripts/e2e-*.mjs`, `scripts/e2e-affected.mjs` (`DIRECT_COVERS`), `scripts/e2e-quarantine.json`, `scripts/e2e-times.json`, `tests/` (vitest); `TESTING.md`.
- Queue: `scripts/laptop-queue/` (lib `pick`, `gatedCpu`, `FLAKE_BUDGET`, auto affected-e2e), `scripts/heavy-lock.mjs`, the desktop worker; branches laptop-queue, feature/laptop-queue-5 e53c71ba, feature/affected-flake; open #403.
- Hard-rule coverage: which suite asserts each VISION hard rule today (e.g. e2e-darkness for light parity, no compass / blip / minimap on any HUD, gameplay never reading graphics settings).

## Compare against
- `docs/RULES.md` "Test tiers", "Getting to master" (train-ready, stuck `affected-e2e`), "Machines" (slots, locks, headless), "Definition of done".
- `docs/systems/testing-tools.md` "The suites", "Choosing suites for a change", "Laptop queue", "Flakes and quarantine" (the flake rule's only owner), "GPU runs".
- `docs/VISION.md` 4 (each hard rule needs a check), 5 (route-runs, measured validator).
- `docs/level-design.md` 15 (acceptance tests every map has).
- DECISIONS G83, G183, G286, G319, G325.

Flake budget: per suite over the last 7 days (state.json `flakes`, `suiteRuns`, `flake-budget.md`): runs, flakes, quarantined, owner, expiry; expired or ownerless entries; e2e-coop quarantine ending 2026-10-26.

## Output
`docs/conformance-test-runner/CONFORMANCE.md`:
1. Gap table, broken rules first: item | rule (doc + section / G) | current state with file:line | gap | fix size S/M/L | needs Michael?
   S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a fix that loosens a Michael-only rule; give native multiple-choice options.
2. Hard rule | suite that asserts it | gap.
3. The flake budget table.
4. "Checked, conforms": one line per scope item with no gap.

## Where
Branch `feature/conformance-test-runner` off origin/master, worktree `C:/NightShift/Mobile-Coop-conformance-test-runner` (laptop). Commit and push each section; fragment `changes/feature-conformance-test-runner.md` (`kind: patch`); a docs-only PR to master, "Conformance review: Test Runner (plan only)". One fresh Opus checker (re-finds every file:line, checks each citation, looks for missed scope items) posts `checker`. Message the orchestrator with the PR number.

## Deadline
One session. Push a partial table every hour; queue work (trains, PR runs) keeps priority.
