# Night Shift

An original third-person stealth game in the spirit of Splinter Cell: Chaos Theory (renamed from Silent But Deadly). It
runs in the browser and installs as an app. Light and shadow is the core. Solo is complete and fully offline; the
campaign is also playable in online co-op for 2-4 players.

- **Stealth:** a light meter that matches what guards see, noise by gear and surface, alert states with a last known
  position (guards follow across storeys, up stairs and ladders), bodies, switches and shootable lamps, doors; night
  vision and thermal goggles.
- **Movement:** speed gears, instant stop, roll, split and wall jumps, pipes, rappel, fences, ladders, ledges, ducts,
  windows, vaults and climbs; co-op team moves.
- **Takedowns:** from every angle, plus the grab; a holstered weapon unless aiming.
- **Gadgets:** frag, sleeping gas, flashbang, EMP, noisemaker, sticky cam, drone, proximity mine.
- **Campaign:** solo or 1-4 co-op (Infiltration). The current build target is the vertical slice, Mission 1 "Dead Line"
  (`docs/kestrel/`); the maps in the menu today are greyboxes and test spaces.
- **Parked:** Wave, Hunter, Mission, PvP, the economy and cosmetics are behind `?legacy=1`.
- **Controls:** touch (editable layout), any standard controller with full menu navigation, keyboard and mouse;
  Settings > Accessibility lists every binding.
- **Built with:** TypeScript, Vite, Babylon.js 9 and Havok physics (WASM bundled), WebAudio synthesis, no external art
  or audio, and IndexedDB saves with export/import.
- **Docs:** design authority is [docs/design-bible.md](docs/design-bible.md); status is [docs/progress.md](docs/progress.md).

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

URL flags: `?debug=1` (FPS/perf overlay, also F3 or a three-finger tap), `?autostart=<mapId>&mode=<sandbox|infiltration|training>`
(skip menus), `?legacy=1` (parked content), `?coop=0` (hide co-op), `?room=CODE` (join a co-op room), `?net=local` (co-op between tabs, no network).

The end-to-end suites use `playwright-core` with a preinstalled Chromium (`/opt/pw-browsers`); edit
`scripts/e2e-lib.mjs` to point at your Chromium if it lives elsewhere. Architecture, conventions and module
layout are in [CLAUDE.md](CLAUDE.md) and [docs/systems/](docs/systems/), the manual device checklist in
[TESTING.md](TESTING.md), and the history in [CHANGELOG.md](CHANGELOG.md).

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` lints, tests, builds with the right base path and publishes `dist/`.
Setup once: push to GitHub, then **Settings > Pages > Build and deployment > Source > GitHub Actions** (without it
the deploy job fails with a 404). The build uses `VITE_BASE=/<repository>/` so assets and the service worker resolve
under that path; for a site served from `/`, set `VITE_BASE: /` in the workflow.

### Branches and slots

Work flows one way: `ct-movement` (working branch), then `dev`, then `master` (live). Nothing is committed directly
to `dev` or `master`; Michael does the merges. The site carries all three:

- live: `https://<user>.github.io/<repository>/` (`master`)
- preview: `https://<user>.github.io/<repository>/preview/` (`dev`; the menu shows PREVIEW)
- ct preview: `https://<user>.github.io/<repository>/ct/` (`ct-movement`; PREVIEW CT)
- kestrel preview: `https://<user>.github.io/<repository>/kestrel/?autostart=kestrel&mode=sandbox` (`feature/kestrel`; PREVIEW KESTREL)

Each preview keeps its own save (IndexedDB `shoulder-strike-preview`, `shoulder-strike-ct`), so a new build never
overwrites the live save. Details: [docs/systems/deploy.md](docs/systems/deploy.md).

Updates install automatically: the service worker precaches each new build and switches on the next launch. Saves
live in IndexedDB on each device and survive updates (Settings > Data exports and imports a save file).

## Co-op

Co-op is peer-to-peer over WebRTC (Trystero with public Nostr relays for signalling); there is no game server. One
player hosts and shares the 5-character room code or link; the host simulates the match and validates everyone's
hits, uses of objectives and takedowns. It takes 2-4 players, needs an internet connection, and single player is
unaffected when offline. Some strict networks (symmetric NAT without TURN) can block peer connections.

## Licence

No licence has been chosen yet; all rights reserved by the repository owner.
