# Night vision pass - state

## Now (2026-10-20 15:25)
Slice 1 implemented (uncommitted; report SLICE1.md; 50 unit tests, tsc, lint clean; not built). Desktop heavy.lock held by
CT Core (anim-rework S1 fix round); a waiting job (scratchpad nv-gpu.sh) takes it for: before shots on master in the
detached worktree C:/NightShift/Mobile-Coop-nv-pass-before, after shots on this tree, e2e-darkness on the GPU
(`scripts/nv-shots.mjs`, sheets in docs/nv-pass/shots/). Then the checker reads the sheets.

## Next
1. Slice 1 (implementer, then a fresh checker); slice 0 / GPU shots in the first desktop lock gap.
2. Slice 2.
3. Slice 3 after the orchestrator's go.

## Open
- Light parity: the body-fill fix stays in the render path (`LampPlugin`), never the ambient grid or light field.

## Polish list (non-blocking)

## Done
- 2026-10-20: worktree `C:/NightShift/Mobile-Coop-nv-pass` (feature/nv-pass from cf73f8b5, 4.14.0), BRIEF / PLAN /
  SURVEY / STATE.

## Resume prompt
```
Night Shift | Menu Notes Build: nv-pass RESUME. Folder C:/NightShift/Mobile-Coop-nv-pass, branch feature/nv-pass
(git pull --ff-only; branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then
docs/nv-pass/BRIEF.md, PLAN.md, SURVEY.md and this STATE.md, and continue from "Now" with the loop in
docs/systems/session-method.md. Report to "Night Shift | Orchestrator". Opus, high effort.
```
