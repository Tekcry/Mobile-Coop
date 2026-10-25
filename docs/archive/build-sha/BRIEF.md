# Build commit label - brief

Set by the orchestrator, 2026-10-19 (a small fix between laptop runner requests). Branch `feature/build-sha` off
master 4.7.0 (fca0e267), folder `C:/NightShift/Mobile-Coop-build-sha`.

## Problem
The in-game version label shows the wrong commit on the preview slots: /ct/ is built from ct-movement e5fc5870 but
reads "v4.6.5 PREVIEW CT · fca0e26" (master). `vite.config.ts` took GITHUB_SHA first, and every slot build in
`.github/workflows/deploy.yml` (dev, ct-movement, feature/kestrel checkouts) inherits the workflow's GITHUB_SHA,
which is master's.

## Fix
`pickBuildSha(gitHead, envSha)` in `src/core/buildSha.ts` (pure, Vitest `tests/buildSha.test.ts`): the checked-out
folder's `git rev-parse --short=7 HEAD` wins (each slot runs `npm run build` in its own checkout, which keeps `.git`);
GITHUB_SHA only when git fails or prints no hash. `deploy.yml` unchanged. `docs/systems/deploy.md` notes it.

## Verify
`npm run check`. The live label is checked on the next Pages deploy (the /ct/ slot should read e5fc587).

## Finish
One PR to master; the orchestrator sets the version (patch) and merges.
