# Branches and deploy
Purpose: how branches map to the GitHub Pages site and how a release is made.
Rules: `docs/DECISIONS.md` G83 (main is the only base), G85 (one chosen preview), G93 (versions at merge).

## Branches
- Master is the live game and the only base. Every job works on its own branch `feature/<job>`, cut from master, in
  its own folder `C:/NightShift/Mobile-Coop-<job>`, and ends in one PR to master. Claude never merges; Michael does.
- `ct-movement` and `dev` are retired (G83); the old `ct-movement` -> `dev` -> `master` flow is history.
- Release = Michael merges a job's PR into master; Pages rebuilds the live game. The version is set in the job's last
  commit (`CLAUDE.md`, Definition of done).

## Pages slots
- Rule (G85): the live game at `/<repo>/` plus one test copy that shows the job branch Michael chooses.
- Built today, until the Pages preview job (`docs/progress.md`) rewrites the workflows: `deploy.yml` runs on the
  default branch (also on `workflow_run` of `preview.yml`) and builds the live game, plus `dev` at `/<repo>/preview/`
  (`VITE_PREVIEW=1`), `ct-movement` at `/<repo>/ct/` (`VITE_PREVIEW_ID=ct`) and `feature/kestrel` at `/<repo>/kestrel/`
  (`VITE_PREVIEW_ID=kestrel`), each only while its branch exists. `preview.yml` runs lint and unit tests on pushes to
  those branches.
- A preview build (`VITE_PREVIEW=1` or `VITE_PREVIEW_ID=<id>`; `__PREVIEW__`, `__PREVIEW_ID__` in `vite.config.ts`)
  has its own label ("PREVIEW" or "PREVIEW <ID>"), its own IndexedDB (`shoulder-strike-preview` or
  `shoulder-strike-<id>`, `src/save/db.ts`) and its own service worker; the live worker's `navigateFallbackDenylist`
  skips the preview paths.
- Boot a preview straight into a map: `/<repo>/<slot>/?autostart=<mapId>&mode=<mode>`.
