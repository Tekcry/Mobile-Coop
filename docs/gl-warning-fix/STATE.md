# gl-warning-fix - state

## Now (2026-10-21): fixed (REPORT.md), GPU e2e-desktop PASS; PR open; laptop full e2e requested.
(earlier)
Branch feature/gl-warning-fix from master (worktree C:/NightShift/Mobile-Coop-gl-warning-fix). Orchestrator, Michael
approved ~09:30: the GPU-only "GL_INVALID_VALUE: glGetProgramiv: Program object expected" on the ray-traced + TAAU +
Panini path (docs/backlog.md item 27; e2e-desktop.mjs ~line 672 console-errors assert fails under E2E_GPU=1, on master
too). Opus implementer: find what queries a deleted program, fix in src, e2e-desktop under E2E_GPU=1 must pass; PR;
Character Build full e2e (software GL).

## Resume prompt
```
Night Shift | gl-warning-fix: RESUME. Folder C:/NightShift/Mobile-Coop-gl-warning-fix, branch feature/gl-warning-fix.
Read CLAUDE.md "Sessions" and docs/gl-warning-fix/STATE.md; continue from Now. Report to "Night Shift | Orchestrator".
```
