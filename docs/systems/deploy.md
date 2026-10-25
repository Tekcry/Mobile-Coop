# Branches and deploy
Owner: the orchestrator. Status: current.
Purpose: how branches map to the GitHub Pages site and how a release is made.
Rules: `docs/DECISIONS.md` G83 (master is the only base), G179 (the `/ct/` preview), G183 (version numbers at each
merge); `docs/RULES.md` (who merges).

## Branches
- Master is the live game and the only base. Every job works on its own branch `feature/<job>`, cut from master, in
  its own folder `C:/NightShift/Mobile-Coop-<job>`, and ends in one PR to master.
- Merging: no one merges a PR by hand. Auto-train (`docs/systems/auto-train.md`) builds `train/<n>` from the
  `train-ready` PRs and `scripts/merge-train.mjs` merges it when CI and the laptop e2e are green (`docs/RULES.md`
  "Getting to master"). merge-train's version commit on the train sets the version (G183): patch when every member's
  fragment says `kind: patch`, else minor (`changes/README.md`); the release merge gets the tag `v4.x.y`. The orchestrator settles conflicts
  and the failures auto-drop cannot place.
- `dev` and `ct-movement` are not work branches (the old `ct-movement` -> `dev` -> `master` flow is history, G83). They
  are the pointer branches for two preview slots (below). Branch deletion: `docs/RULES.md` "Branches and previews".

## Pages slots
- What exists (process audit, 2026-10-19; G85's "one chosen preview", replaced by G179 and the `/preview/` slot):
  `deploy.yml` runs on the default branch (also on `workflow_run` of `preview.yml`) and builds the live game at
  `/<repo>/`, plus:
  - `dev` at `/<repo>/preview/` (`VITE_PREVIEW=1`): `scripts/merge-train.mjs` moves it to the merge commit after each
    release and dispatches the deploy (below);
  - `ct-movement` at `/<repo>/ct/` (`VITE_PREVIEW_ID=ct`): the active prototype branch, moved by that job after each
    slice (frozen while Michael walks it);
  - `feature/kestrel` at `/<repo>/kestrel/` (`VITE_PREVIEW_ID=kestrel`) only while that branch exists on the remote.
  `preview.yml` runs lint and unit tests on pushes to those branches.
- A preview build (`VITE_PREVIEW=1` or `VITE_PREVIEW_ID=<id>`; `__PREVIEW__`, `__PREVIEW_ID__` in `vite.config.ts`)
  has its own label ("PREVIEW" or "PREVIEW <ID>"), its own IndexedDB (`shoulder-strike-preview` or
  `shoulder-strike-<id>`, `src/save/db.ts`) and its own service worker; the live worker's `navigateFallbackDenylist`
  skips the preview paths. Every build's label shows the version and the commit (G183): the commit is the
  checked-out folder's own HEAD (`src/core/buildSha.ts`), so a slot shows its branch's commit; GITHUB_SHA (the
  workflow's trigger, master) is only the fallback when git fails.
- Boot a preview straight into a map: `/<repo>/<slot>/?autostart=<mapId>&mode=<mode>`.

## One deploy per release (audit 2026-10-24 finding 9)
- `scripts/merge-train.mjs` merges with the commit body line `merge-train: Pages deploy is dispatched after dev moves`.
  `deploy.yml` skips that merge's master push, and `preview.yml` skips dev's push of it (so no `workflow_run` deploy
  either); `deploy.yml` also skips a `workflow_run` whose head commit carries the line.
- After dev moves, merge-train dispatches `deploy.yml` once on master (`gh workflow run deploy.yml -f tested_sha=<head
  CI passed on> -f version=<v>`). When the live checkout's tree equals that head's tree (a GitHub merge of a train that
  already contains master), lint and vitest are skipped: CI ran them on that tree. Otherwise they run as before. The
  live `node_modules` is cached by lockfile and `/preview/` reuses it (hard links) when dev's lockfile is the same.
- Every slot build writes `version.json` (`{ version, sha }`). merge-train then waits up to `MERGE_TRAIN_DEPLOY_WAIT_MIN`
  (default 20; 0 = dispatch only) for the run, fetches `/preview/version.json` and prints `PREVIEW: OK - /preview/ serves
  <v>`, `PREVIEW: STALE - ...` or `PREVIEW: UNKNOWN - ...`. The wait runs after the train lock is released on a hand run
  (inside the caller's lock under auto-train). It never changes the exit code: the release is done.
- Pushes to master that are not merge-train merges (a hand merge), and the `ct-movement` / `feature/kestrel` slots,
  still deploy as before (with lint and vitest). A hand move of dev with the marker commit: `node scripts/merge-train.mjs
  repair` or `gh workflow run deploy.yml`.

## Repair after a dying release
- The tail of a release (tag `v<version>`, dev, closing member PRs, the deploy dispatch) only does what is missing:
  the tag when origin has none (a tag on another commit is reported, never moved), dev when it does not contain the
  merge, member PRs that are open with their head in master.
- `merge-train release <n> <version> "<title>"` of a train already in master runs only that tail (exit 0).
- `node scripts/merge-train.mjs repair` runs the tail for the latest released version (origin/master's package.json):
  it finds that version's commit and the merge that brought it in, and dispatches the deploy when dev moved or when
  `/preview/` does not serve that version yet.

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
