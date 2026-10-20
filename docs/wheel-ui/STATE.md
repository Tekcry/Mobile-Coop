# Selection wheel restyle - state

## Now (2026-10-21 00:05)
Checker PASS (CHECK.md) on d8c69347; laptop PASS there (check 2057 tests, smoke, e2e-gadgets, e2e-pad, e2e-menus). GPU
23:40-23:44 (served build verified): wheel 420 -> 518 px at 1920x1080, 420 -> 490 at 2170x1000; shots in
docs/wheel-ui/shots/. Master 8a9b40a5 merged (8838229e; CHANGELOG conflict only, both kept). PR to master open.

## Next
1. The orchestrator merges. After the merge: remove C:/NightShift/Mobile-Coop-wheel-ui-before (`cmd //c rmdir` its
   node_modules junction first, then `git worktree remove --force`).

## Open

## Polish list (non-blocking)
- Frame time with the wheel open 17.2 -> 19.6 ms in one sample each (before always first): re-sample 3x alternating;
  if still > 1.5 ms worse, drop `filter: drop-shadow` on `.sw-seg.hl` (`src/styles.css`). The checker found no per-frame
  DOM / style / layout work while open.
- A phone landscape shot (844x390); the vision slot shows "NV" twice (drop the duplicate tag).

## Done
- 2026-10-21: checker PASS, GPU shots, master merged, PR.
- 2026-10-20: slice 1 (0ed8c2f5) + review fixes (d8c69347).
- 2026-10-20: worktree, BRIEF, STATE.

## Resume prompt
```
Night Shift | wheel-ui: RESUME. Folder C:/NightShift/Mobile-Coop-wheel-ui, branch feature/wheel-ui (git pull --ff-only;
branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/wheel-ui/BRIEF.md
and STATE.md, and continue from "Now" / "Next" with the loop in docs/systems/session-method.md. Report to
"Night Shift | Orchestrator". Opus, high effort; lean tokens.
```
