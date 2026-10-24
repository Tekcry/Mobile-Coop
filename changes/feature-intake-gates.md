# Intake gates and the PR size cap
kind: patch
- Intake gates (process audit 2026-10-24): BRIEF splits "Michael said" from "Michael picked", PLAN carries a claims
  block, a fresh Opus plan checker runs before build, maps and looks get a one-page sign-off, and slices stay at
  ~1.5k lines or ~4 h with unfinished work dark behind a flag (`docs/systems/session-method.md` "Intake").
- Templates: `docs/templates/brief.md`, `plan.md`, `plan-check.md`, `signoff.md`, `walk-card.md` (walk pacing: at most 3
  unwalked features per area, a 10-minute risk-ranked walk card per release).
- CI: a `pr-size` job inside `check` fails a PR over 1500 counted changed lines (generated assets, snapshots,
  lockfiles and docs not counted) unless it has the `big-pr` label; train and docs-only PRs are exempt
  (`scripts/pr-size.mjs`).
- `scripts/claims-check.mjs` reports overlapping file globs, maps, wire and save claims between open job PLANs.
