# gl-warning-fix - state

## Now (2026-10-21 11:40): PAUSED (account switch)
PR #79, head 005a4cfa (+ this STATE commit). Fix in src/core/babylon.ts (REPORT.md). GPU e2e-desktop full PASS on
09520e9e (95 ok). Fresh checker: FIX (CHECK.md), both items done in 005a4cfa: tests/glWarningFix.test.ts (pins Babylon
9.29.0, fails loudly if the internals move; passes) and the isProgram guard for a context restored between retries.
tsc and eslint clean. In flight: CT Core's desktop `npm ci` + `npm run check` + full e2e on 005a4cfa (software GL; the
laptop is offline), result to me and the orchestrator. Not done: a GPU e2e-desktop rerun on 005a4cfa (my 11:19 attempt
stopped at the build's typecheck with no error text while CT Core's npm ci ran; tsc alone passes afterwards).

## Next
1. CT Core's result; optionally the GPU e2e-desktop rerun on 005a4cfa (desktop lock, port 4189). The orchestrator merges.

## Resume prompt
```
Night Shift | gl-warning-fix: RESUME. Folder C:/NightShift/Mobile-Coop-gl-warning-fix, branch feature/gl-warning-fix.
Read CLAUDE.md "Sessions" and docs/gl-warning-fix/STATE.md; continue from Now. Report to "Night Shift | Orchestrator".
```
