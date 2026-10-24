# rig-pose-fix: state

## Resume
- ~14:00: S1 MERGED (bb750a5b); check S1 A FAIL B1 (host kneels the client during the tense sneak) -> fix round 6aafd7a7
  MERGED (30a8ec81; tests/remoteKneelTense.test.ts). Decisions for the orchestrator (CHECK-S1-A.md): D-S1b client head x1.3 /
  legs x0.75 on host (keep), D-S1c host judges the latest accepted client state (keep), roll x0.5 only for the client
  (pre-existing; decide). TODO before PR: tests/playerVolumes.test.ts allocation case flaky (67.8 vs 64 B; base reads the
  same): find the 16 B or make the measure robust (after S3, which may touch playerVolumes.ts). S3 building.
- ~13:05: S7 MERGED (e1831c62) -> 6dcac873. Opus checker W1 on S2 / S5 / S6 / S7 running (CHECK-W1.md). S1 still building.
  After S1: merge, then S3 (guard head; S6-REPORT one-liner for enemyPuppet.ts; merge S2 shotEye with S1's head; S7's
  openLeft flag into weapons via gameState.ts), two Opus checkers on S1 + S3 (+ S5 / S7 src/net bits), then ONE laptop
  batch run on the final head (e2e-combat, e2e-wall, e2e-netmove, e2e-coop, e2e-stealth-ai, e2e-guard-carry, e2e-stealth,
  e2e-ctcourse, e2e-sectorops, e2e-weapons-carry), changelog fragment changes/feature-rig-pose-fix.md, PR.
- ~12:20: MERGED S6 (dog head, 0fa92807), S5 (body pos / lie, e9a5eb35), S2 (shot origin, 9485eaaf) -> b189ed6a. Running: S1
  (rpf-s1, player volumes + wall head), S7 (rpf-s7, off b189ed6a: hand-switch timer, dummy head, mocap out of sim clock,
  RAGDOLL out of PLAYER_SHOT, LAMP_SHOT_ORIGIN 2.1 m for inverted claims). After S1: S3 (guard head + S6's enemyPuppet
  one-liner in S6-REPORT; merge S2 shotEye with S1's head), then the batch checker(s) and laptop suites. Open decisions
  (S5): dropped body lies along the carrier's side, head behind; instant drop across in front.
- 2026-10-24 ~11:35: job started (Michael approved ~11:25). Base master 0fab0afa 4.88.1 (own npm ci). Wave 1 Opus builders
  in worktrees Mobile-Coop-rpf-s1 / -s2 / -s5 / -s6 (branches feature/rpf-s1 ...), each merged into feature/rig-pose-fix
  after its build; then one checker for the wave. Wave 2: S3, S7.

```
Night Shift job rig-pose-fix (lead Player Build). Worktree C:/NightShift/Mobile-Coop-rig-pose-fix, branch
feature/rig-pose-fix. Read CLAUDE.md, docs/rig-pose-audit/BRIEF.md, PLAN.md, STATE.md, REPORT.md. Run PLAN waves; slice
worktrees C:/NightShift/Mobile-Coop-rpf-<s> (feature/rpf-<s>, node_modules junction to the job worktree). Opus builds and
checks; e2e only through the laptop queue. Update this file at every stop; WIP commits pushed at the 92% save.
```
