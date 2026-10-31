# Branches and deploy
Owner: the orchestrator. Status: current.
Purpose: how branches map to the GitHub Pages site and how a release is made.
Rules: `docs/DECISIONS.md` G83 (master is the only base), G179 (the `/ct/` preview), G183 (version numbers at each
merge); `docs/RULES.md` (who merges).

## Branches
- Master is the live game and the only base. Every job works on its own branch `feature/<job>`, cut from master, in
  its own folder `C:/NightShift/Mobile-Coop-<job>`, and ends in one PR to master.
- Merging: a PR merges to master once CI `check` is green (the train automation was removed 2026-11-01). The version
  step (G183) assembles the `changes/` fragments into `CHANGELOG.md` (`scripts/changelog-assemble.mjs`,
  `changes/README.md`): patch when every fragment says `kind: patch`, else minor; the release gets the tag `v4.x.y`.
- `dev` and `ct-movement` are not work branches (the old `ct-movement` -> `dev` -> `master` flow is history, G83). They
  are the pointer branches for two preview slots (below). Branch deletion: `docs/RULES.md` "Branches and previews".

## Pages slots
- What exists (process audit, 2026-10-19; G85's "one chosen preview", replaced by G179 and the `/preview/` slot):
  `deploy.yml` runs on the default branch (also on `workflow_run` of `preview.yml`) and builds the live game at
  `/<repo>/`, plus:
  - `dev` at `/<repo>/preview/` (`VITE_PREVIEW=1`): moved to the release commit after each release;
  - `ct-movement` at `/<repo>/ct/` (`VITE_PREVIEW_ID=ct`): the active prototype branch, moved by that job after each
    slice (frozen while Michael walks it);
  - `feature/kestrel` at `/<repo>/kestrel/` (`VITE_PREVIEW_ID=kestrel`) only while that branch exists on the remote.
  `preview.yml` runs lint and unit tests on pushes to those branches. Every slot build writes `version.json`
  (`{ version, sha }`). The live `node_modules` is cached by lockfile and `/preview/` reuses it (hard links) when dev's
  lockfile is the same.
- A preview build (`VITE_PREVIEW=1` or `VITE_PREVIEW_ID=<id>`; `__PREVIEW__`, `__PREVIEW_ID__` in `vite.config.ts`)
  has its own label ("PREVIEW" or "PREVIEW <ID>"), its own IndexedDB (`shoulder-strike-preview` or
  `shoulder-strike-<id>`, `src/save/db.ts`) and its own service worker; the live worker's `navigateFallbackDenylist`
  skips the preview paths. Every build's label shows the version and the commit (G183): the commit is the
  checked-out folder's own HEAD (`src/core/buildSha.ts`), so a slot shows its branch's commit; GITHUB_SHA (the
  workflow's trigger, master) is only the fallback when git fails. On `/preview/` every dark feature flag in
  `src/core/flags.ts` defaults on (`PREVIEW_ON`, `darkFlag`; Michael 2026-10-26 ~13:55, "All on in preview"); a URL
  `=0` turns one off; the live game and `/ct/` keep them off.
- The campus prebake (`scripts/prebake.mjs`) runs with the same preview signal (`src/core/previewBuild.ts`), so
  `/preview/` ships the lamps of its own campus layout (campusV2 every section); its CI cache key is
  `prebake-preview-*`, the live game's `prebake-live-*` (prebake-preview).
- Boot a preview straight into a map: `/<repo>/<slot>/?autostart=<mapId>&mode=<mode>`.

## Updates of an open game (sw-reload)
- The service worker uses `registerType: 'prompt'` (`vite.config.ts`, `clientsClaim` on, `skipWaiting` off): a new
  deploy's worker installs and waits; it never reloads an open window by itself. `src/pwa/pwa.ts` re-reads the screen
  each second and `src/pwa/updatePolicy.ts` (pure, tested) applies it (SKIP_WAITING, then one reload) only on the title
  or main menu with no match, no load screen and no co-op screen (`.coop-screen`) open; anywhere else it defers and
  shows "Update ready - restarts at the menu" once. Closing every window also applies it (the next launch).
- A worker another window activated takes the page over without a reload; the reload waits for the menu the same way
  (`controllerchange`; the first claim of a page that had no worker is not an update). Until that reload, a first lazy
  import of an old build's chunk can fail (the new worker dropped the old precache): rare, and far better than a
  mid-match reload.
