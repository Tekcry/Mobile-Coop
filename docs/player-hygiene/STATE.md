# player-hygiene: state
Owner: Night Shift | Player Build. Status: current.

Resume
- Folder `C:/NightShift/Mobile-Coop-player-hygiene`, branch `feature/player-hygiene` (guard:
  `git branch --show-current`), base master 2148ec969.
- Read: `docs/player-hygiene/BRIEF.md`, `docs/player-hygiene/PLAN.md` (slices S1-S6, claims block).
- Now (2026-10-26): S3 (takedown scan, d326b34e) and S4 (wheel ring, feaa680f) built by cloud builders, merged here (5f4dbf22);
  Opus checker PASS (both; fake ballistics in tests/coopWalkFixes.test.ts:120 and tests/hangDownTakedown.test.ts:78 gained
  `hitDistance`, added to the claims). PR: S3 + S4. S1 is PR #505 (feature/player-hygiene-s1); S2 on feature/player-hygiene-s2
  (fix round: platform-independent pad fixture); S1b on cloud-queue. The dog skip (`e.def.quadruped`) is already on master
  (takedownController.ts:307 after the merge); keep one copy if J15 re-adds it.
- Waiting: S5 on PR #317 (coop4, J4) merging; S6 on J1 PR #437 merging.
- Allocations left for J21 (BRIEF A3): `src/world/anchors.ts:785-815` reach search, `findJumpTarget`, attach probes.
- H1 touch kept (Q33): the orchestrator folds it into DECISIONS at the merge.
- Next: fresh Opus plan checker (`docs/templates/plan-check.md`, `node scripts/claims-check.mjs --plan
  docs/player-hygiene/PLAN.md --name feature/player-hygiene`), then S1-S4 in parallel.

Done
- 2026-10-25: Opus planner: code re-found on master 2148ec969, BRIEF, PLAN, STATE.
