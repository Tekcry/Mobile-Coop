# anim-joints - state

## Now
Slice J1 (the base table every Wren rig reads): implementer starting. Branch at 1db6e593 (track A's T1a) + these docs.

## Next
J1 checker, fix round, commit; J2 (move and action rows); PR after master has T1a.

## Open
- A6 / A7: one-line hooks outside our area requested from the orchestrator (`operatorRig` sets `rig.tuneRows`;
  `remoteAvatar` and `studioStage` pass the team role into the pose).
- A3: `src/anim/tuneHands.ts` taken by T1b (no track listed it).

## Done
- 2026-10-21 16:20: branch from `feature/marlow-tuner-t1` 1db6e593 (orchestrator, BRIEF "Tracks"); BRIEF, PLAN, STATE.

## Resume prompt
```
Night Shift | CT Core Build: anim-joints RESUME. Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-joints/BRIEF.md,
PLAN.md and STATE.md in C:/NightShift/Mobile-Coop-anim-joints (branch feature/anim-joints; branch guard before every
write). Resume from STATE "Now": implementer + fresh checker per slice, one fix round; desktop runs only check and one
or two named suites (E2E_JOBS=1, port 4191, C:/NightShift/heavy.lock), three or more suites and the full e2e go to
"Night Shift | Character Build" on the laptop. Message "Night Shift | Orchestrator" at each slice and the PR.
Model Opus, effort high.
```
