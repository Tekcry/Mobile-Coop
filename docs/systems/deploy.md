# Branches and deploy
Purpose: how branches map to the GitHub Pages slots (live, /preview/, /ct/, /kestrel/) and how a release is made.
Design authority: docs/design-bible.md (Section 9, Branches)

## Branches and deploy
- Work flows one way: `ct-movement` (working branch, `/<repo>/ct/`), then `dev` (`/<repo>/preview/`), then `master`
  (live, `/<repo>/`). Nothing is committed directly to `dev` or `master`; Claude never merges into them, Michael
  does. Pages hosts all three: the `dev` build is `VITE_PREVIEW=1` (`__PREVIEW__`, version label "PREVIEW", its own
  IndexedDB `shoulder-strike-preview`, the live worker's `navigateFallbackDenylist` skips `/preview/`). `preview.yml`
  checks `dev` pushes; `deploy.yml` (default branch, also on `workflow_run` of that check) builds all slots and
  deploys. Release = Michael merges `ct-movement` into `dev`, then `dev` into `master`. Map projects use their own
  branch off `ct-movement` (for example `feature/kestrel`).
- 3.2.0: a second preview slot, `ct-movement` at `/<repo>/ct/` (`VITE_PREVIEW_ID=ct`: `__PREVIEW_ID__`, label
  "PREVIEW CT", IndexedDB `shoulder-strike-ct`; the live worker's denylist skips `/ct/` too). `preview.yml` also
  checks `ct-movement` pushes; `deploy.yml` builds it when the branch exists.
- Kestrel slot: `feature/kestrel` at `/<repo>/kestrel/` (`VITE_PREVIEW_ID=kestrel`: label "PREVIEW KESTREL", IndexedDB `shoulder-strike-kestrel`, its own worker; the live worker's denylist skips `/kestrel/`). Same repository and Pages site, one deployment: `deploy.yml` builds each slot from its own branch, so the other slots do not change. `deploy.yml` always runs from the default branch, so the slot appears only once `deploy.yml`, `preview.yml` and the `vite.config.ts` denylist are on `master` (Michael merges, via `ct-movement` and `dev`). Boot straight into the map: `/<repo>/kestrel/?autostart=kestrel&mode=sandbox`.
