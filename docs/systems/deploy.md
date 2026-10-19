# Branches and deploy
Purpose: how branches map to the GitHub Pages site and how a release is made.
Rules: `docs/DECISIONS.md` G83 (master is the only base), G85 (previews), G183 (version numbers at each merge);
CLAUDE.md "Sessions" (who merges).

## Branches
- Master is the live game and the only base. Every job works on its own branch `feature/<job>`, cut from master, in
  its own folder `C:/NightShift/Mobile-Coop-<job>`, and ends in one PR to master.
- Merging: the orchestrator merges green PRs without asking (Michael, 2026-10-19); when auto mode blocks the merge,
  Michael merges. Master always holds every finished update; the orchestrator asks Michael when unsure. The orchestrator sets the version in the PR just before it merges (G183): a job or feature is a minor step,
  a fix or docs-only merge a patch; the merge commit gets the tag `v4.x.y`.
- `dev` and `ct-movement` are not work branches (the old `ct-movement` -> `dev` -> `master` flow is history, G83). They
  are the pointer branches for two preview slots (below). Deleting any branch is Michael's call.

## Pages slots
- What exists (process audit, 2026-10-19; G85's "one chosen preview" in its current form): `deploy.yml` runs on the
  default branch (also on `workflow_run` of `preview.yml`) and builds the live game at `/<repo>/`, plus:
  - `dev` at `/<repo>/preview/` (`VITE_PREVIEW=1`): the orchestrator moves it to master after each merge;
  - `ct-movement` at `/<repo>/ct/` (`VITE_PREVIEW_ID=ct`): the active prototype branch, moved by that job after each
    slice (frozen while Michael walks it);
  - `feature/kestrel` at `/<repo>/kestrel/` (`VITE_PREVIEW_ID=kestrel`) only while that branch exists on the remote.
  `preview.yml` runs lint and unit tests on pushes to those branches.
- A preview build (`VITE_PREVIEW=1` or `VITE_PREVIEW_ID=<id>`; `__PREVIEW__`, `__PREVIEW_ID__` in `vite.config.ts`)
  has its own label ("PREVIEW" or "PREVIEW <ID>"), its own IndexedDB (`shoulder-strike-preview` or
  `shoulder-strike-<id>`, `src/save/db.ts`) and its own service worker; the live worker's `navigateFallbackDenylist`
  skips the preview paths. Every build's label shows the version and the commit (G183).
- Boot a preview straight into a map: `/<repo>/<slot>/?autostart=<mapId>&mode=<mode>`.
