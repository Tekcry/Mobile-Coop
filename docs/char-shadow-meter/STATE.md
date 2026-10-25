# char-shadow-meter STATE
Owner: Sector Ops Build. Branch `feature/char-shadow-meter`, worktree `C:/NightShift/Mobile-Coop-char-shadow-meter`.

## Resume
- Job: FOLDED-PLAN J16, meter half (Sector Ops PR first; Guard AI perception and Player operator capsule after).
- Status: plan written (BRIEF, PLAN, research/current.md). No code. Waits for a fresh Opus plan checker (RULES
  Intake 4), then S1.
- Michael: "Meter and guards read them"; Q14 "A faint cue". No open question; A6 (moon at Shadows Off) goes to the
  orchestrator for his next look.
- Design: fixed per-point lamp set (every lit lamp >= 0.04 in the column, plus moon and flashlights); one sim capsule
  per character in `src/world/charOccluders.ts`; the picture's round shadows read the same capsules; nothing on the
  wire; `ShadowCues` for Guard AI. Flag `charShadowLight` default off (`?charlight=1`).
- Code anchors: meter gameState.ts:1659-1701; field lightField.ts:229-352, :413-432; picture capsules
  gameState.ts:907-914, bakedLamps.ts:692-724, GLSL :1312-1332; silhouette pick charShadowSet.ts:46-58, :197;
  perception enemy.ts:2447; bodies enemyManager.ts:3666-3675.
- PRs: A = S1 + S2 (~1.27k, Opus), B = S3 + S4 + S5 (~0.91k; S3 Opus, S4 Sonnet, S5 Haiku). Two Opus checkers each;
  PR A also needs e2e-coop + e2e-netmove (src/game).
- J10 dependency: build dark now; GPU card numbers, thresholds and the walk after J10's re-bake (PLAN section 5).
- Next: start a fresh Opus plan checker on BRIEF + PLAN at this branch head; on PASS brief S1 (Opus, worktree
  `feature/char-shadow-meter`) and S3 (Opus, `feature/char-shadow-meter-s3`, after S1's interface commit).

## Done
- 2026-10-25: research/current.md, BRIEF.md, PLAN.md, STATE.md (Opus planner).

## History
- 2026-10-25: branch cut from origin/master 2148ec969.
