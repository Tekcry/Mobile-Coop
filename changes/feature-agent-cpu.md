# Agent CPU: cached vitest transforms and incremental typecheck
kind: patch
- Vitest persists transformed modules across runs (`fsModuleCache: true`); transform was 75-88% of tracked time per run.
- New `npm run typecheck:fast` (incremental `tsc --noEmit`, build info in `node_modules/.cache`). `typecheck`, `build` and
  `check` are unchanged.
