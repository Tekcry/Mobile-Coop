# visual-gate - state

## Now (2026-10-24 ~22:10)
- Plan written: BRIEF.md (ask verbatim, targets F1-F8, limits, A1-A14), PLAN.md (reuse map, metrics, viewpoints,
  baselines, train wiring, runtime estimate, 16 slices). Docs only; nothing built or run.

## Next
1. C0: one fresh Opus checker on PLAN.md (`docs/visual-gate/checks/C0.md`); lead applies its fixes.
2. Group A in parallel: VG1 metrics (Opus), VG2 shotPin + harness + M0 timing (Opus), VG3 viewpoints (Sonnet),
   VG4 store + baseline CLI (Sonnet). Strict briefs from PLAN.md section 8 rows + sections 3-5.
3. Group B: VG5 gate runner (Opus) and VG6 train wiring (Opus) in parallel.
4. Group C: VG7 noise + bootstrap; P1-P7 red / green proofs. Then VG8 calibration, C1 checker, VG9 chores, PR.

## Open
- Runtime is an estimate (~160 s); M0 (VG2) measures boots and renders on the laptop.
- Questions for Michael (PLAN.md:179-186): flag vs hold, who accepts look changes, add Medium. Defaults A1, A9, Low+Epic.
- F5b torch haze wedge is unfixed on master: the gate carries it as `known` (A10); no fix in this job.
- Old builds (v4.60.1 - v4.82.0) for proofs may have moved Marlow views (marlow-final v4.81.0): P3 / P2 check coords.

## Done
- 2026-10-24: research (walk finds F1-F8 with bad / fixed builds; reused scripts mapped); BRIEF, PLAN, STATE.

## Resume prompt
```
You are the job lead for visual-gate (Night Shift). Worktree C:/NightShift/Mobile-Coop-visual-gate, branch
feature/visual-gate. Branch guard before every write:
cd /c/NightShift/Mobile-Coop-visual-gate && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate"
Read: CLAUDE.md "Sessions" (:32-157), "Hard rules" (:198-225); docs/systems/agent-preamble.md;
docs/visual-gate/STATE.md (this file), BRIEF.md (A1-A14 at :53), PLAN.md.
Key pointers:
- Targets and their bad / fixed builds: BRIEF.md:27-39, PLAN.md:30-44.
- Reused code: PLAN.md:6-28 (e2e-darkness.mjs :25-145 probe + converge + luma; shots-ctcourse.mjs :62-75 meter vs
  field; campus-art-shots.mjs :24-63; sector-lights-shots.mjs :40-69; service.mjs runTrain :618-695).
- Viewpoints + data format: PLAN.md:46-83. Metrics API + tolerance floors: PLAN.md:85-107.
- Baselines (branch visual-baselines, pickBaseline, accept CLI): PLAN.md:109-120.
- Train wiring (status context visual-gate, PR comment, auto-train ignores it): PLAN.md:122-137.
- Runtime (estimate ~160 s, M0 measures): PLAN.md:139-143. Slices table + parallel groups: PLAN.md:145-177.
Next step: see "Next" above. Opus writes strict slice briefs (docs/visual-gate/briefs/<slice>.md), runs every checker;
Sonnet builds VG3 / VG4 / VG7 / P1-P7 from briefs; Haiku VG9. GPU runs only via the laptop queue
(node scripts/laptop-queue/request.mjs --alone ...), port 4189, E2E_GPU=1. No src look change (BRIEF Limits).
Progress goes in this STATE.md; message the orchestrator only when a PR opens, blocked, or Michael is needed.
```
