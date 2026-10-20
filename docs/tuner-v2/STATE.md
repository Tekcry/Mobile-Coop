# Animation tuner v2 - state

## Now (2026-10-21): DONE
Merged to master as 4.25.0 (PR #68, 52178c06; the orchestrator set the version and moved /preview/). Items 1-4 and the
registry wiring checked (CHECK1-4); full e2e PASS on db8bedc5 (laptop, 1824 s). This STATE commit is on feature/tuner-v2
after the merge: it reaches master only with a later docs merge.

## Try first (for Michael)
- Stepping > run / crouchRun replant 0.8 fixes the stuck trailing foot (about 9 cm sooner, no slide). Defaults stay
  identity: his call (ITEM3.md).

## Next
Nothing. Michael tries the tuner (Try first above); his feedback starts any follow-up.

## Open

## Polish list (non-blocking)
- e2e-menus is about 60 s longer with the tuner asserts; 100-entry pickers for the per-weapon sections; no blend between
  gait rows at band edges; muzzle flash off a scaled gun's tip; gun scale carries to the next gun for about 0.2 s; no
  finger joints in the rig (one curl per hand).

## Done
- 2026-10-21: merged as 4.25.0 (PR #68).
- 2026-10-21: items 1-4, registry wiring, checks (see Now).
- 2026-10-21: worktree, BRIEF, STATE.

## Resume prompt
```
Night Shift | tuner-v2: RESUME. Folder C:/NightShift/Mobile-Coop-tuner-v2, branch feature/tuner-v2 (git pull --ff-only;
branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/tuner-v2/BRIEF.md,
STATE.md and docs/anim-tuner/STATE.md, and continue from "Now" / "Next" with docs/systems/session-method.md. Report to
"Night Shift | Orchestrator". Opus, high effort; lean tokens.
```
