# Branches and deploy
Purpose: how branches map to the GitHub Pages slots (live, /preview/, /ct/) and how a release is made.
Design authority: docs/design-bible.md (Section 9, Branches)

## Branches and deploy
- Work goes to `dev`; the default branch (`master`) is the live game. Pages hosts both: live at `/<repo>/`, the
  `dev` build at `/<repo>/preview/` (`VITE_PREVIEW=1`: `__PREVIEW__`, version label "PREVIEW", its own IndexedDB
  `shoulder-strike-preview`, the live worker's `navigateFallbackDenylist` skips `/preview/`). `preview.yml` checks
  `dev` pushes; `deploy.yml` (default branch, also on `workflow_run` of that check) builds both and deploys. Release
  = merge `dev` into `master`.
- 3.2.0: a second preview slot, `ct-movement` at `/<repo>/ct/` (`VITE_PREVIEW_ID=ct`: `__PREVIEW_ID__`, label
  "PREVIEW CT", IndexedDB `shoulder-strike-ct`; the live worker's denylist skips `/ct/` too). `preview.yml` also
  checks `ct-movement` pushes; `deploy.yml` builds it when the branch exists.
