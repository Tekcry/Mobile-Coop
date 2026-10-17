# Consolidation to master (M26, Michael, 2026-10-17)

Goal: one branch with all finished and paused work, one PR to master that Michael merges (Claude never merges into
master). Then master is the base for every job, one feature branch per job.

## Branches (2026-10-17, commits ahead of / behind origin/master)
| Branch | Include | Notes |
| --- | --- | --- |
| feature/ct-locomotion (462 / 3) | yes, first | Already contains feature/kestrel. Paused at step 22; the CT prototype (PROTOTYPE-PLAN.md) is built AFTER the merge on a fresh branch. |
| feature/kestrel (372 / 3) | via locomotion | Fully inside ct-locomotion. |
| feature/footsteps (101 / 3) | yes | Done. |
| feature/weapon-audio (110 / 3) | yes | Done. |
| feature/music (110 / 3) | yes, as is | Needs revising later on a fresh branch. |
| feature/training-bunker (409 / 3, last 2026-10-14) | yes | Built, needs Michael's walkthrough later; fixes on a fresh branch. Expect most conflicts here. |
| feature/menu-ui-spec (3 / 0) | yes | Docs only. |
| ct-movement (94 / 3) | only commits not already in the above | Check with `git log --cherry-pick`. |
| feature/operators (125 / 3) | NO | In progress (Character Creation session). It merges master into itself at its next stop and gets its own PR. |
| dev, feature/exchange-map (0 ahead) | no | Stale. |
| playtest/combined | no | Throwaway (locomotion + audio); replaced by this. |

## How (orchestrator method, docs/systems/session-method.md)
1. New worktree, never in another session's folder:
   `git -C C:/NightShift/Mobile-Coop-locomotion fetch origin && git -C C:/NightShift/Mobile-Coop-locomotion worktree add -b integrate/consolidate C:/NightShift/Mobile-Coop-integrate origin/master`, then `npm ci`.
   Branch guard for every write: branch `integrate/consolidate`, toplevel `C:/NightShift/Mobile-Coop-integrate`.
   Push only `git push -u origin integrate/consolidate`. Ports 4189 / 4191 rules as docs/locomotion/RULES.md (M9).
2. Merge in this order, one merge commit each (`git merge --no-ff origin/<branch>`): ct-locomotion, footsteps,
   weapon-audio, music, training-bunker, menu-ui-spec, then any ct-movement commits not already present.
3. Conflict rules: keep both sides' behaviour; the locomotion movement stays as on ct-locomotion (step 22 state);
   audio hooks attach to locomotion's foot-plant events (as playtest/combined did, see its merge commits for the
   resolutions of .gitignore, eslint, package.json (higher version, union of scripts), run-e2e.mjs (union of suites,
   e2e-cover stays removed), flags.ts, settings.ts, player.ts, CHANGELOG, TESTING, testing-tools.md). Desktop only
   (M21): no phone work in resolutions. If a conflict is unclear, keep both and log it in the PR body.
4. After each merge: `npm run check`. At the end: `npm run build` and the full `npm run e2e` (E2E_PORT=4191,
   E2E_JOBS=2, background). Known flaky and kestrel-owned failures as RULES.md; anything else is fixed in the
   consolidation branch (merge fixes only, no feature work).
5. Version: one minor bump above the highest version in any merged branch, one CHANGELOG entry listing what came in.
6. Open the PR integrate/consolidate -> master (gh pr create). Body: what is merged, conflicts and how they were
   resolved, check / e2e results, "operators not included", and the after-merge plan below. Michael merges.

## After Michael merges
- Delete (only with Michael's go-ahead): dev, feature/exchange-map, feature/kestrel, feature/footsteps,
  feature/weapon-audio, ct-movement, playtest/combined, claude/new-session-*; ct-locomotion and training-bunker
  once nothing is left on them.
- New branches from master, one per job: `feature/ct-prototype` (PROTOTYPE-PLAN.md P1-P4; its docs stay in
  docs/locomotion/), `feature/music-revision`, `feature/bunker-walkthrough` (after Michael's walkthrough notes).
- Operators: merges master into feature/operators at its next stopping point, then its own PR.

## Documentation audit and vision questions (M27, Michael, 2026-10-17) - BEFORE the PR is opened
Michael: "audit all documentation between them, and ask me questions to ensure the main branch is clear and accurate. I want to revisit all decisions and rules etc, ask me as many questions as possible. My vision must be clear."
1. Audit (read-only, parallel opus agents, one per area): every branch's CLAUDE.md, docs/design-bible.md, docs/progress.md, docs/story.md, docs/level-design.md, docs/systems/*.md, and each run's own docs (docs/locomotion/, docs/kestrel/, docs/training/, docs/music or audio docs, docs/operators/ on origin/feature/operators read-only, menu-ui-spec docs). Find: contradictions between branches, rules that are stale (phones, Blacklist systems, old branch flow ct-movement -> dev -> master, removed systems), decisions that were never confirmed by Michael (ASSUMED A-numbers across all runs), duplicated or conflicting numbers (speeds, budgets, controls), and anything the new decisions (M20 pure CT, M21 desktop only, M22 prototype first, M25, M26) overturn.
2. Write docs/consolidation/AUDIT.md in the consolidation worktree: each finding with file:line on each branch.
3. Questions for Michael: turn every finding and every open ASSUMED decision into multiple-choice questions (recommended option first, plain English), grouped by area (vision and pillars, platform and performance, controls, movement and camera, stealth and AI, co-op, levels and maps, audio and music, art and characters, UI and HUD, story, process and branches). Ask them with the native multiple-choice UI in rounds of 4, as many rounds as needed; also publish them as a phone page (Artifact with a db, like the earlier decisions pages) so Michael can answer away from the desk. Ask as many as needed for his vision to be clear.
4. Record his answers as decisions in one master-level file, docs/DECISIONS.md (new; each entry quotes him), and rewrite CLAUDE.md, the bible and the system docs on the consolidation branch so master states one clear, current vision with no contradictions. Old run-specific decision files stay as history and point to docs/DECISIONS.md.
5. Only then: full checks and the PR.
