# Branches and deploy
Owner: the orchestrator. Status: current.
Purpose: how branches map to the GitHub Pages site and how a release is made.
Rules: `docs/DECISIONS.md` G83 (master is the only base), G183 (version numbers at each merge); `docs/RULES.md` (who
merges); `docs/plan/DECISIONS-2026-11.md` (one game: master is the only build, 2026-11-01).

## Branches
- Master is the live game and the only base. Every job works on its own branch `feature/<job>` (the cleanup stages use
  `cleanup/<stage>`), cut from master, in its own worktree folder, and ends in one PR to master.
- Merging: a PR merges to master once CI `check` is green (the train automation was removed 2026-11-01). The version
  step (G183) assembles the `changes/` fragments into `CHANGELOG.md` (`scripts/changelog-assemble.mjs`,
  `changes/README.md`): patch when every fragment says `kind: patch`, else minor; the release gets the tag `v4.x.y`.
- There are no pointer branches: `dev`, `ct-movement` and `feature/kestrel` fed the old `/preview/`, `/ct/` and
  `/kestrel/` slots and are gone (one game, 2026-11-01). Nothing deploys from any branch but master.

## The site (one build)
- `deploy.yml` runs on a push to the default branch (and by hand): it lints, tests and builds master once and publishes
  `dist/` at `/<repo>/`. On a pull request it runs only `lint`, `test` and `build-check` (no deploy); `check` is the one
  status to require. The build writes `version.json` (`{ version, sha }`). The live `node_modules` and the campus prebake
  folder are cached by lockfile / source hash.
- Every feature flag in `src/core/flags.ts` that the old preview switched on defaults on in this build
  (`PREVIEW_ON` is the constant `true`; `darkFlag`; Michael 2026-11-01, "master becomes the only game"). A URL `=0`
  turns one off for testing (`?ctxprompts=0`, `?kitmoves=0`, `?mixamo=0`). Stage J of the cleanup plan removes the flags.
- The build's label shows the version and the commit (G183): the commit is the checked-out folder's own HEAD
  (`src/core/buildSha.ts`); GITHUB_SHA is only the fallback when git fails. The game's save database is IndexedDB
  `shoulder-strike` (`src/save/db.ts`).
- The campus prebake (`scripts/prebake.mjs`) bakes the lamps of the shipped layout under the same defaults
  (`src/core/previewBuild.ts` reads the build environment; with no `VITE_PREVIEW*` it is the plain build); its CI cache
  key is `prebake-live-*`.
- `__PREVIEW__` / `__PREVIEW_ID__`, `previewBuild.ts` and the preview save name still exist in the code, unused by any
  build (stage J removes them).

## Old addresses forward (`/preview/`, `/ct/`, `/kestrel/`)
- After the build, `node scripts/write-redirects.mjs dist` writes, for each of the three old slots, `index.html` (a
  static page whose script does `location.replace('../' + location.search + location.hash)`, with a `<noscript>`
  refresh) and a replacement `sw.js`. So `/<repo>/preview/?autostart=<mapId>&mode=<mode>` opens
  `/<repo>/?autostart=<mapId>&mode=<mode>`. No network dependency.
- The replacement `sw.js` retires the old slot's service worker: a browser that had opened the old preview keeps that
  build's worker and cached copy until the worker script changes. The new worker activates at once, drops only the
  caches whose name carries that slot's scope, unregisters itself and forwards the open pages. (Caches share the
  origin with the main game, so nothing else is deleted.)
- The main game's worker keeps `navigateFallbackDenylist` for `/preview/`, `/ct/` and `/kestrel/` (`vite.config.ts`), so a
  visit to an old address is served the forwarding page from the network, not the game's app shell.
- Saves: the old preview kept its own IndexedDB (`shoulder-strike-preview`, `shoulder-strike-ct`). The game reads only
  `shoulder-strike`: nothing of the preview's settings or records shows on the main address. The old data stays in the
  browser, unread.

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
