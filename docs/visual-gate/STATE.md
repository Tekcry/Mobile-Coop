# visual-gate - state

## Now (2026-10-24 ~23:40, after the swap)
- VG1 Opus check PASS (checks/vg1-check.md, polish 1-6 held: arc orientation gap before P5, veil blind to partial
  beams -> VG8 uses contrast, blotch 0 on small regions -> VG3 / VG5 keep wall regions >= 60 px, emd n = 0 skip);
  merged into feature/visual-gate 2ca4e6dd.
- VG2 (cloud cb0ba57c): Opus check FIX M1 (late-spawned guards unparked) -> fix round db18caff (all placed guards
  tagged, untagged parked + resettled <= 3 rounds, pin throws on untagged; quadrupeds parked; aimReady in the row;
  polish 2-4 left for VG5). Merged 28d59fdd.
- VG4 (cloud ebe376eb): Sonnet check FIX (second accept silently replaced) -> Opus fix round 350001ee (accept needs
  --replace, recordRun `replace: true` option, key / flag validation; 20 tests). Merged 618c812b. VG7 must pass
  --replace to widen an accept.
- VG3 (cloud 8262611b) merged a3362896; Sonnet check PASS c43ef47e (polish: 16 floor / upper regions under 60 px in
  one axis, m-f-gallery has no wall region, campusS3 :397 -> :396).
- 2026-10-25 ~04:20: M0 sent (laptop alone, set visual-m0, master fc4dc9ab; json + png to
  C:/NightShift/scratch/visual-gate/m0 on the laptop). On the verdict: write M0.md, eyeball PNGs, PLAN 7 ladder.
- VG6 = PR #367 (feature/visual-gate-train, own PR off master): check PASS, master merged fe16741b; after train 74
  (#366) one import line clashes at service.mjs ~:92: keep both imports.
- Cloud-queue (bcbc3608): visual-gate-vg5 (gate runner, off a3362896) and visual-gate-vg1-polish (metrics polish 1 /
  5 / 6, branch feature/visual-gate-vg1p). On done: Opus checker each, merge into feature/visual-gate.

## Earlier (2026-10-24 ~23:00)
- C0 plan check FIX applied (lead fix round, `checks/c0-plan-check.md` end): M1 pin order, M2 campus guard, P1 (no src
  hook: pin = `__app.loop.timeScale = 0`, zero src diff), P2-P17 adopted except P11's e2e-affected addition (PLAN 10).
- Group A strict briefs ready: `briefs/VG1.md` (metrics, Opus), `VG2.md` (harness + M0 command, Opus), `VG3.md`
  (viewpoints, Sonnet), `VG4.md` (store + CLI, Sonnet). Disjoint files (PLAN section 8 table). Nothing built or run.
- ~23:30 DISPATCHED (desktop C: nearly full, ~490 MB per worktree, so no new worktrees): VG1 Opus agent in worktree
  -visual-gate-vg1 (branch feature/visual-gate-vg1 @ 0b7f46f4; agents do not commit: the lead commits from
  checks/vg1-build.md); VG2 / VG3 / VG4 as cloud briefs `briefs/visual-gate-vg2..4.md` on cloud-queue (6e29ea80; cloud
  builders cut feature/visual-gate-vg2..4 from 0b7f46f4 and push). On resume: check the -vg1 worktree + report, and
  each cloud brief's status line; rerun VG1 from its brief if the report is missing. Then one checker per batch (Opus
  for VG1 / VG2, Sonnet for VG3 / VG4), then M0 via the laptop queue.

## Next
1. Builders: cut `feature/visual-gate-vg1` .. `-vg4` from the feature/visual-gate head, worktrees
   `C:/NightShift/Mobile-Coop-visual-gate-vg<N>`, start all four in parallel, each from its brief + the preamble.
2. On each report (`checks/vg<N>-build.md`): one fresh checker per batch (Opus for VG1 / VG2, Sonnet for VG3 / VG4),
   then merge all four into feature/visual-gate (disjoint files) and push.
3. M0: send the request command from `checks/vg2-build.md` (master sha, gate copied from origin/feature/visual-gate);
   write `docs/visual-gate/M0.md` from Test Runner's reply; eyeball the PNGs for VG3 framing; apply the PLAN 7 ladder.
4. Group B briefs (VG5 gate runner, VG6 train wiring), then group C (VG7, P1-P7), VG8, C1, VG9, PR.

## Open
- Runtime estimate ~170-225 s (PLAN 7): the ladder will likely be needed; M0 decides.
- Questions for Michael (PLAN.md section 9): flag vs hold, who accepts look changes, add Medium. Defaults A1, A9, Low+Epic.
- F5b torch haze wedge is unfixed on master: the gate carries it as `known` (A10); no fix in this job.
- Old builds (v4.60.1 - v4.82.0) for proofs may have moved Marlow views (marlow-final v4.81.0): P3 / P2 check coords.
- VG3 may find no door unchanged at v4.82.0, v4.88.0 and master on a map: it stops and reports (lead decides).

## Done
- 2026-10-24: research (walk finds F1-F8 with bad / fixed builds; reused scripts mapped); BRIEF, PLAN, STATE.
- 2026-10-24: C0 plan check (FIX: M1, M2, P1-P17).
- 2026-10-24: C0 fix round (PLAN, BRIEF A6 / A7 / A14, new A15 / A16) and group A briefs VG1-VG4.

## Resume prompt
```
You are the job lead for visual-gate (Night Shift), session "Night Shift | Sector Ops Build". Worktree
C:/NightShift/Mobile-Coop-visual-gate, branch feature/visual-gate. Branch guard before every write:
cd /c/NightShift/Mobile-Coop-visual-gate && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate"
Read: CLAUDE.md "Sessions" (:32-157), "Hard rules" (:198-225); docs/systems/agent-preamble.md;
docs/visual-gate/STATE.md (this file: Now / Next), BRIEF.md (Limits :41, A1-A16 :54-100).
Key pointers (docs/visual-gate/PLAN.md):
- Reuse map with origin/master 92d0205d line refs: :9-58 (pin via loop.timeScale :26-31; fixed step, lights, torches :32-40).
- Targets F1-F8 and bad / fixed builds: :60-74. Viewpoints: :76-92. Pinning order (C0 M1, the harness spec): :94-114.
- Metrics :116-132; baselines :134-143; train wiring :145-162; runtime + M0 request command :164-176.
- Slices: parallel-safety table :180-192, slice table :198-217, proof mechanics :219-225; Michael questions :227-232;
  held polish :234-238.
- Briefs: docs/visual-gate/briefs/VG1.md (metrics, Contract for LumaImage / Mask / Pt2 / Stats / Flag), VG2.md
  (harness, Contract for Settle / Capture / Projection, M0 command), VG3.md (viewpoints, Contract for View / Rig /
  MapCfg), VG4.md (store, RunRecord / AcceptRecord / pickBaseline). Reports land in docs/visual-gate/checks/<slice>-build.md.
- C0 check and the fix-round log: docs/visual-gate/checks/c0-plan-check.md.
Rules: Opus writes briefs and runs every fresh checker; Sonnet builds VG3 / VG4 / VG7 / P1-P7 from briefs; Haiku VG9.
Builders never commit; the lead commits and merges. No src/ change in this job (zero src diff). GPU / timing runs only
via the laptop queue, sent by the lead (node scripts/laptop-queue/request.mjs --alone ..., port 4189, E2E_GPU=1).
Builders: single vitest files with --maxWorkers=2, npm run typecheck:fast; no e2e, no GPU, no npm run check.
Progress goes in this STATE.md; message the orchestrator only when a PR opens, blocked, or Michael is needed.
```
