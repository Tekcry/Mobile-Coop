# Animation tuner v2 - state

## Now (2026-10-21 00:35)
Worktree and branch from master 6a4fb07f (4.20.1; node_modules junction to Mobile-Coop-menu-notes); BRIEF. Starts after
the camera-cue PR.

## Try first (for Michael)
- Stepping > run / crouchRun replant 0.8 fixes the stuck trailing foot (about 9 cm sooner, no slide). Defaults stay
  identity: his call (ITEM3.md).

## Next
1. Item 1 done (c32e7c26 + fix 0e73c3b2, CHECK1.md); laptop check + smoke, e2e-anim, e2e-menus on 0e73c3b2 queued.
   Item 2 implementer running (ITEM2.md when done).
2. Merge order (orchestrator): #65 tuner-camera, then #66 CT Core slices 4+5 (edits footPlanner.ts), then tuner-v2.
   After #66 lands: merge master into feature/tuner-v2 keeping both sides (our 13 footPlanner read hooks + slice 4's
   planner edits), laptop check + e2e-anim, then the PR's full e2e.
3. (done) Bring in the section registry (feature/tuner-camera @ df00a947: `src/anim/tuneRegistry.ts`, registerTuneSection;
   docs/anim-tuner/STATE.md "Section registry (for other jobs)"), merge or cherry-pick only its registry commits; do not
   touch the camera section or the pad map. Wire items 1-2 through it (one commit), check; then items 3 and 4.

## Open

## Polish list (non-blocking)

## Done
- 2026-10-21: worktree, BRIEF, STATE.

## Resume prompt
```
Night Shift | tuner-v2: RESUME. Folder C:/NightShift/Mobile-Coop-tuner-v2, branch feature/tuner-v2 (git pull --ff-only;
branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/tuner-v2/BRIEF.md,
STATE.md and docs/anim-tuner/STATE.md, and continue from "Now" / "Next" with docs/systems/session-method.md. Report to
"Night Shift | Orchestrator". Opus, high effort; lean tokens.
```
