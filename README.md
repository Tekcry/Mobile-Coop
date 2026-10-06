# Shoulder Strike

A mobile-first, third-person stealth shooter in the style of Splinter Cell: Blacklist that runs in the browser and
installs as an app. Single player is complete and fully offline; online co-op (2-4) and PvP (up to 8) are optional.

- **Modes:** Hunter (clear every hostile, undetected if you can), Infiltration (four missions: uploads, bugs,
  rescues, sabotage, intel, extraction), Wave Survival, Mission, Training and Free Roam on the Warehouse (night),
  Dust Depot, the Embassy and the Proving Grounds. Co-op runs every mode; PvP has Team Deathmatch (4v4) and
  Free-for-all.
- **Stealth:** light and shadow, noise, alert states with a last known position, bodies, switches and shootable
  lamps, alarms, doors; night vision and sonar goggles; takedowns from every angle and Mark & Execute.
- **Traversal:** ladders, drainpipes, ledges, pipes, ducts, windows, ziplines, vaults and climbs.
- **Gadgets:** frag, sleeping gas, flashbang, EMP, noisemaker, sticky cam, tri-rotor drone, proximity mine.
- **Enemies:** guards, runners, heavies, snipers, shield enforcers, dogs, drone operators and officers, in
  urban, desert and maritime colours.
- **Combat:** 16 weapons with visible attachments, upgrades and camos; cover with peeks, blind fire, corners and
  cover-to-cover moves.
- **Progression:** XP, credits, play-style cash (Ghost / Panther / Assault), the suit, HQ upgrades, challenges,
  loadout presets, weapon mastery and an avatar customiser with emotes and tags.
- **Controls:** touch (editable layout), any standard controller (Xbox / PlayStation / MFi) with full menu
  navigation, keyboard and mouse; Settings > Accessibility lists every binding.
- **Built with:** TypeScript, Vite, Babylon.js 9 and Havok physics (WASM bundled), WebAudio synthesis, no external
  art or audio, and IndexedDB saves with export/import.

## Play

Open the GitHub Pages URL on a phone in landscape. To install:

- **Android (Chrome):** menu > Install app (or Add to Home screen).
- **iOS (Safari):** Share > Add to Home Screen.

Once the "Ready to play offline" toast has appeared, the installed app works in airplane mode.

## Develop

Needs Node 20.19+ or 22 (CI uses 22).

```sh
npm ci
npm run dev        # dev server, exposed on the LAN for phone testing (http://<your-ip>:5173)
npm run check      # lint + unit tests + typecheck + production build
npm run build      # production build into dist/
npm run preview    # serve dist/ (service worker active) for offline testing
npm run e2e        # headless end-to-end suites against dist/ (needs a build and a Chromium; see below)
```

URL flags: `?debug=1` (FPS/perf overlay, also F3 or a three-finger tap), `?autostart=<proving|depot|...>&mode=<sandbox|wave|mission>`
(skip menus), `?coop=0` (hide co-op), `?room=CODE` (join a co-op room), `?net=local` (co-op between tabs, no network).

The end-to-end suites use `playwright-core` with a preinstalled Chromium (`/opt/pw-browsers`); edit
`scripts/e2e-lib.mjs` to point at your Chromium if it lives elsewhere. Architecture, conventions and module
layout are in [CLAUDE.md](CLAUDE.md), the manual device checklist in [TESTING.md](TESTING.md), and the history in
[CHANGELOG.md](CHANGELOG.md).

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` lints, tests, builds with the right base path and publishes `dist/`.

1. Push the repository to GitHub (branch `main` or `master`).
2. In the repository go to **Settings > Pages > Build and deployment > Source** and choose **GitHub Actions**.
   This only has to be done once; without it the deploy job fails with a 404.
3. Push (or run the workflow from the **Actions** tab). The site appears at
   `https://<user>.github.io/<repository>/`. The build uses `VITE_BASE=/<repository>/` so every asset and the
   service worker scope resolve under that path.
4. For a custom domain or a user/organisation site served from `/`, set `VITE_BASE: /` in the workflow.

### Preview builds (`dev` branch)

Work in progress goes to the `dev` branch; the live game is the default branch. The site carries both:

- live: `https://<user>.github.io/<repository>/` (default branch)
- preview: `https://<user>.github.io/<repository>/preview/` (`dev`; the main menu shows the version with
  PREVIEW)

A push to `dev` runs **Preview check** (lint + tests); when it passes, **Build and deploy to GitHub Pages** rebuilds
the site from both branches (it runs on the default branch, so the Pages environment's branch rules allow it). A
push to the default branch does the same. The preview keeps its own save (IndexedDB `shoulder-strike-preview`), so
trying a new build never migrates or overwrites the live save, and the live game's offline worker never answers
for `/preview/`. To release, merge `dev` into the default branch.

Updates install automatically: the service worker precaches each new build and switches on the next launch.
Saves live in IndexedDB on each device and survive updates; the schema is versioned and migrated
(Settings > Data also exports/imports a save file).

## Co-op

Co-op is peer-to-peer over WebRTC (Trystero with public Nostr relays for signalling); there is no game server.
One player hosts and shares the 5-character room code or link; the host simulates the match and validates
everyone's hits, uses of objectives and takedowns. Co-op takes 2-4 players in any mode; Team Deathmatch and
Free-for-all take up to 8. It needs an internet connection; when offline the Co-op screen says so and single player is
unaffected. Some strict networks (symmetric NAT without TURN) can block peer connections.

## Licence

No licence has been chosen yet; all rights reserved by the repository owner.
