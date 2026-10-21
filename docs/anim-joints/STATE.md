# anim-joints - state

## Now
Slice J1 (the base table every Wren rig reads): implementer starting. Branch at 1db6e593 (track A's T1a) + these docs.

## Next
J1 checker, fix round, commit; J2 (move and action rows); PR after master has T1a.

## Open
- Approved by the orchestrator (~16:40), each edit minimal and named in the PR body: A3 `src/anim/tuneHands.ts` is
  ours; A7 `rig.tuneRows = true` in `operatorRig` (`src/operators/runtime/playerFigure.ts`, J1); A6 `RigPose.tuneTeam`
  in `src/net/remoteAvatar.ts` (no wire change: if one is needed, stop and tell the orchestrator) and one line in
  `src/game/studioStage.ts` posePuppet (J2). A cloud session (bays B + M) may touch `src/net`: expect a small merge.

## Done
- 2026-10-21 16:20: branch from `feature/marlow-tuner-t1` 1db6e593 (orchestrator, BRIEF "Tracks"); BRIEF, PLAN, STATE.

## Resume prompt
```
Night Shift | CT Core Build: anim-joints RESUME. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-joints/BRIEF.md,
PLAN.md and STATE.md in C:/NightShift/Mobile-Coop-anim-joints (branch feature/anim-joints; branch guard before every
write). Resume from STATE "Now": implementer + fresh checker per slice, one fix round; the desktop is the main test
machine (full e2e E2E_JOBS=2, port 4191, one heavy job under C:/NightShift/heavy.lock); the laptop ("Night Shift |
Character Build") only when the desktop lock is held. Message "Night Shift | Orchestrator" at each slice and the PR.
Model Opus, effort high.
```
