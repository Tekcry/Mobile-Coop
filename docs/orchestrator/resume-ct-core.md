# Resume - Night Shift | Player Build (formerly CT Core Build; resumed 2026-10-23 after the ~12:20 swap)

Rules: CLAUDE.md on origin/feature/menu "Heavy-usage throughput", "Token rules", "Account swap" (95% slow down, save by
98%, small work to 100%; at the orchestrator's save message commit agent worktrees as WIP). No mid-window clears. Opus
plans / checks / anim + net code; Sonnet builds from strict briefs; max 3 tsc / vitest agents; desktop CPU < 80%.
e2e always E2E_GPU=1: laptop (Character Build) for coop / netmove / ctcourse and batches; desktop heavy.lock (4191,
CPU < 80%) / heavy2.lock (4192, CPU < 50%) for single suites. Agent rules: scratch/mt2/COMMON.md, COMMON-SPARE.md
(subagents may be refused writing REPORT.md: the lead writes it from the hand-back). Push this file with
scratch/ctcore/push-resume.sh <file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

## Open (master 4.71.0, 3c460923)
| Job | Branch, folder C:/NightShift/Mobile-Coop-<x> | Head | Next |
| --- | --- | --- | --- |
| PR #207 batch 22 | feature/ctcore-batch-22, folder ctcore-batch | 99c37251 | strike-pops + hang-down + dual-reward + traverse-fix-2; check PASS (scratch/ctcore/b22-CHECK.md, polish list); master merged. Laptop GPU 8/8 GREEN on 99c37251 (338 s), posted in #207; orchestrator told train-ready. LEFT train 24: e2e-clip "ladder climb: knees never knock" 8.9 cm vs > 9.0 (e2e-clip.mjs:250; master passes). Opus fix round in folder Mobile-Coop-b22-fix (on this branch): fix the game, rerun e2e-clip / traverse / anim. Then merge into batch-23, one laptop request (+ e2e-clip), train-ready #207 + #214 together for train 25. |
| mocap-strafe r3 DONE (restart slide 0, flip pelvis 1.51 / 1.36, diag slide 0, knee 2.9, OFF md5 same, e2e-anim + clip PASS); fresh Opus recheck running -> scratch/ctcore/msc3-CHECK.md, then own PR. History: | feature/mocap-strafe | f34e21c9 | Round 2 149f419c met knee-out / alloc / assert / OFF md5 (docs/mocap-trial/MT2-STRAFE.md "Fix round 2"). Round 3 goals: restart after 0.3 s stand slide 3.87 cm -> <= 0.5 (footPlanner, rig reachNeed / stOff timing), flip pelvis pops 3.34 / 2.36 cm -> <= OFF + 0.5 (OFF 1.11 / 0.93), diagonal flip slide 1.21 -> <= 0.5. Keep knee-out <= 3.0 (pistol R speed 2 at 2.9), OFF md5 9ce3f3d1... / 31,065,812 B. Then e2e-anim + e2e-clip, fresh Opus recheck (msc-CHECK.md scope + these), own PR. |
| sd-rounds spare 7 (Sonnet) | feature/sd-rounds | 2ef4000f DONE | Vitest 40/40, tsc, eslint, e2e-combat + e2e-weapon-audio GPU green; REPORT.md in. Fixed weapon-audio's pre-existing reload step (A -> X hold; first X hold after shots not read, script holds twice: checker look). Next batch, the #207 checker scope reused (fresh Opus). Near-miss with Guard AI #208: WeaponSlot fields just above HitKind (playerWeapons.ts ~55). |
| team-climb (Opus) | feature/team-climb off 3c460923 | a5559685 WIP | CLIMB_UP_TEAM: rope-top lip grips (teamController ropeTop reachL / reachR, remoteAvatar), ease teamController.ts ~347-348 rise `min(1, e*1.7)` and `across` jump at e 0.4 (5.7 cm pop), tests/teamClimb.test.ts, e2e coop / netmove / traverse. Off traverse-fix-2's hunks. Next batch. |
| spare 9 interrogation-intel (Sonnet) | feature/interrogation-intel off batch-22 99c37251 | a2984b63 DONE | intel.ts / intelReveal.ts, takedownController, coopHost relay; no wire / save / src/ai change. Vitest 40/40, tsc, eslint, e2e-takedown GPU green. e2e-coop relay assert untested (laptop batch). patrolRoute getter rides guard-ai-s8 (compiles without). Part B (modes' onIntelCode) after marlow-final / sector-redesign. |

| batch 23 (train 25) | feature/ctcore-batch-23 off batch-22, folder ctcore-batch | 58368e10 PR #214 | = interrogation-intel a2984b63 + sd-rounds 2ef4000f + team-climb 2805b65e (coop.md conflict: both bullets kept). Checker PASS (scratch/ctcore/b23-CHECK.md, polish list). Laptop asked for coop, netmove, ctcourse, takedown, traverse, anim, combat, weapon-audio on dc8919cd (58368e10 = + test comment) -> post in #214, train-ready message. |

| ipad-fit (Sonnet, Michael ~13:05 via orchestrator: into #214) | feature/ipad-fit off batch-23 58368e10 | 58368e10 | Brief scratch/ctcore/briefs/spare-ipad-fit.md (version label, safe-area strip, GPU banner Windows only, pause room note). e2e-menus + e2e-desktop on the desktop lane, then merge into batch-23 / #214. |
| spare 6 pose-parity (Opus) | feature/pose-parity off batch-23 58368e10 | 58368e10 | Agent writes docs/pose-parity/BRIEF.md then builds: aim side on the wire (PROTOCOL 31 -> 32 if free), remote melee -1 clamp, baked sections on the partner. Laptop e2e-coop / netmove after. Next batch (24). |

## Next window, at once (parallel, CPU < 80%; orchestrator: max 2 tsc / vitest agents while CPU > 80%)
1. (done after the swap) r3, team-climb, sd-rounds restarted from the heads above; spare 9 started. Spare 12 dual-reward is
   in #207. If cut off again: restart each with the table's goals.
2. Wait for hand-backs (no polling).
3. #207 verdict -> train-ready message. Next batch (feature/ctcore-batch-23 off master) = sd-rounds + team-climb +
   spare 9, one Opus checker, laptop coop / netmove / ctcourse.
4. Later spares (docs/orchestrator/spare-jobs.md on feature/menu): 7 crouch pops after mocap-strafe (same rig / footPlanner
   files). 16 partner rig start is already merged (partner-seed). 6 started.

## Resume prompt
```
Night Shift | CT Core Build: RESUME after the ~12:20 account swap. Model Opus, effort high. Read CLAUDE.md
("Sessions": "Heavy-usage throughput", "Token rules", "Account swap"; on origin/feature/menu if newer than master), then
docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md). Copy it to C:/NightShift/scratch/ctcore/resume-ct-core.md and
push updates with scratch/ctcore/push-resume.sh. A heavy.lock / heavy2.lock naming CT Core Build with no node / bash
process of ours is stale: delete it. Message "Night Shift | Orchestrator" once that you resumed, then only at PR open /
train-ready / blocked / Michael needed. Work "Next window" top down. e2e always E2E_GPU=1.
```
