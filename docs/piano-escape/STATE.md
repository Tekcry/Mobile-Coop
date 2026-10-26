# piano-escape - STATE
Owner: Night Shift | Campaign Build. Status: current.

## RESUME 2026-10-26 ~21:00 (Night Shift | Campaign Build; Michael ~19:40: piano scene is the main focus)
Worktree C:/NightShift/Mobile-Coop-piano-escape, branch feature/piano-escape (from master 1b58989ed). ROADMAP Now row 20.
1. BRIEF A1-A11 (A11: scene-only Guard AI work for the blackout; sight stays light parity).
2. PLAN + map-plan.svg + SIGNOFF: Opus plan check PASS after fix round 1 + one SIGNOFF line (c3fbee933;
   C:/NightShift/scratch/campaign/piano-plan-check.md, polish notes at its end). Knife gate call per Player Build:
   `setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))` (src/game/knifeKill.ts on feature/piano-knife).
3. Michael approved the SIGNOFF ~20:15 ("Approve, build it"; BRIEF M2). Orchestrator lines up GA1 / GA3 / GA4 / GA5 and
   SO1-SO4.
4. Wave 1 building (desktop, Sonnet, CPU 62% at start): S1 shell + greybox on feature/piano-escape-s1
   (C:/NightShift/Mobile-Coop-piano-escape-s1, brief scratch/campaign/piano/S1-brief.md -> S1-report.md) and S3 music on
   feature/piano-escape-s3 (-s3, S3-brief.md -> S3-report.md). Both from feature/piano-escape 158163476; disjoint files.
   Rerun a builder whose report is missing. Then ONE Sonnet checker for the batch (S1 + S3; game files: request
   e2e-coop + e2e-netmove for the PR), merge both into feature/piano-escape, PR to master (dark, `pianoEscape`).
5. Then S2 (Opus, intro + EMP on stubs: brief from PLAN S2 when wave 1 is in checking); S4 (Opus) waits for knife S1 +
   S3, GA1 / GA3, SO1-SO3.
6. Player Build: feature/piano-knife (plan 2b690b417), S1 building on feature/piano-knife-s1 (PB1 + PB5); PB4 in its S3.
Next: S1 + S3 reports -> batch checker -> merge -> PR; write the S2 brief.
