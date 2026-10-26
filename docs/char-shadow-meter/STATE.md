# char-shadow-meter STATE
Owner: Sector Ops Build. Branch `feature/char-shadow-meter`, worktree `C:/NightShift/Mobile-Coop-char-shadow-meter`.

## Resume
- S1 in progress (Opus builder). Interface commit b3e70c165 ("char-shadow-meter S1: interface"): S3 cuts
  `feature/char-shadow-meter-s3` from it (PLAN.md:105-107).
- Job: FOLDED-PLAN J16, meter half (Sector Ops PR first; Guard AI perception and Player operator capsule after).
- Status: plan revised for plan check 1 (PLAN-CHECK.md, FIX, 6 items, all addressed). No code. Waits for a fresh Opus
  plan checker.
- Michael: "Meter and guards read them"; Q14 "A faint cue". No open question; A6 (moon at Shadows Off) goes to the
  orchestrator for his next look.
- Claims: PLAN.md:6-34 (block); claims-check rerun: 22 overlaps, all "rebase, no shared lines" or ordered, PLAN.md:192-221.
  For the orchestrator (other leads): guard-rules, guard-ai-mission-hooks, player-batch-j19, coop-kit, hud-guidance,
  coop4 (named dependency: `playerRefsInto` slot order, keyed by id here), test-runner-j20, route-runs-2.
- Slices: PLAN.md:136-143 (one owner per file; only S3 runs in parallel, two new files); done looks like
  PLAN.md:150-180; PRs PLAN.md:182-190 (A = S1 + S2 ~1.33k, B = S3 + S3b + S4 + S5 ~0.93k).
- Order: J1 #433 first (settings line, lighting.md:225 L16 fix already there); S1 -> S2 -> S3b -> S4 -> S5 on the job
  branch; S3 on `feature/char-shadow-meter-s3` from S1's interface commit (PLAN.md:105-107); S4 after J11 PR B
  (C1 + C2) is on master, card in `e2e-parity.mjs` part 4 (BRIEF.md:87-89 A13); J10 re-bake before S4's numbers and
  the walk (PLAN.md:252-261).
- Flag: BRIEF.md:72-79 A9 (`charShadowLight`, owner Sector Ops Build; walk areas Lighting, Sector Ops, Guard AI for the
  cue; switched on by Michael's yes on the first release walk card with J10's re-bake, PR B and Guard AI's cue PR).
- Settings text: BRIEF.md:91-103 (two strings by flag, from #433's wording, matches `CHAR_SHADOW_PRESET`).
- Code anchors: meter gameState.ts:1659-1701; field lightField.ts:229-352, :413-432; picture capsules
  gameState.ts:907-914, bakedLamps.ts:692-724, GLSL :1312-1332; silhouette pick charShadowSet.ts:46-58, :197;
  perception enemy.ts:2447; bodies enemyManager.ts:3666-3675; settings settingsScreen.ts:339-340.
- MUST-FIX BEFORE SWITCH-ON (2026-10-26, A2 check): S2c, a co-op client's partners in the contract (PLAN S2c row; cloud brief char-shadow-meter-s2c). Order S3b -> S2c -> S4.
- Next: start a fresh Opus plan checker on BRIEF + PLAN at this branch head (PLAN-CHECK.md check 1 is the prior verdict).

## Done
- 2026-10-25: research/current.md, BRIEF.md, PLAN.md, STATE.md (Opus planner).
- 2026-10-25: plan check 1 FIX (Opus); PLAN and BRIEF revised for its 6 items (Opus planner).

## History
- 2026-10-25: branch cut from origin/master 2148ec969.
