# rig-pose-fix: brief

- Ask: Michael 2026-10-24 ~11:25 (via the orchestrator), "Yes, add to roadmap": build the 8 ranked fix slices of
  `docs/rig-pose-audit/REPORT.md` (Player Build spare job 12, backlog 28) in rank order, independent slices in parallel.
- Goal: gameplay never reads the animated / rendered pose (CLAUDE.md hard rule "Gameplay never reads graphics state";
  light parity). Hit volumes, perception points, shot origins, guard / dog heads, body positions and the wall head sample
  come from sim state, fitted to the rig where they must match it (as `src/ai/guardHead.ts` did for guards).
- Limits: the current-goal rule (no refining); Opus builds and checks (anim, src/net); one checker per batch; one batch
  PR per train. The report was written on master 4.80.0: every file:line in it is re-found on the job's base (4.88.1).
- Branch `feature/rig-pose-fix` (folder `C:/NightShift/Mobile-Coop-rig-pose-fix`), off master 0fab0afa (4.88.1).
- Assumed decisions (undo by reverting the slice):
  - A1: slice 4 (wall head) folds into slice 1 (the report allows it): one sim player body model for open play and walls.
  - A2: A51 (`docs/locomotion/DECISIONS.md`, posed rig for the wall light sample) is superseded by the sim wall head fitted
    to the rig; the light meter and the guards then read the same point on both machines (light parity).
  - A3: slice 8 (G13 hostage hold, G19 partner blocker) is review only: kept as is and noted for the orchestrator.
