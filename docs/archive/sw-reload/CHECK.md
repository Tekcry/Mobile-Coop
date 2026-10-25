# sw-reload - fresh check (890e8a05)

## Verdict: FIX (one small change in `src/pwa/pwa.ts`)

Checked: `git diff origin/master...HEAD`, `npm run build` (ok), `npx tsc --noEmit` (0), `npx vitest run
tests/updatePolicy.test.ts` (6/6). No e2e (the lead sends e2e-coop, e2e-netmove, e2e-offline, smoke to the laptop).
Read vite-plugin-pwa 2.0.0 `dist/client/build/register.js` and workbox-window 7.4.1 `Workbox.js`.

## Required fix

1. `src/pwa/pwa.ts:57-63` - the reload after our own apply (and the "taken over" path) relies on vite-plugin-pwa's
   `onNeedReload`, which in prompt mode fires only when workbox-window's `controlling` event has `isUpdate` true.
   `isUpdate` is `Boolean(navigator.serviceWorker.controller)` captured once at register time (`Workbox.js:294`,
   the "controlling" listener in `register.js`). A page that had no controller at load - the first-install session
   (claimed later by `clientsClaim`) or a hard reload (Shift+F5) - gets `isUpdate` false, so when a new deploy is found
   during that session:
   - on the menu, `tick` sets `applying`, clears the timer and sends SKIP_WAITING; the new worker takes the page but
     `onNeedReload` never runs: no reload, `applying` stays true, the "restarts at the menu" toast was wrong, and the
     page keeps the old JS under a worker whose precache has dropped the old hashed chunks (a first `coopUi-*.js` /
     `net-*.js` import then misses the cache; online it 404s after a Pages deploy -> "Co-op unavailable", offline it
     fails);
   - when another window applies, `takenOver` is never set; the next menu `tick` calls `update(true)`, a no-op
     (`registration.waiting` is null), and the page is stranded the same way.

   Fix: listen to `navigator.serviceWorker`'s `controllerchange` directly instead of `onNeedReload`. Ignore the first
   claim (the controller was null before the change: remember `!!navigator.serviceWorker.controller` and update it on
   each change); on any later change: `applying` -> `location.reload()`, else `takenOver = true; pend()`. Keep
   `onNeedRefresh: pend`. The unit tests stay on the pure policy; `npm run check` is enough for this change.

## Verified (no change needed)

- No reload in a match or with a peer: `inMatch = !menuState || booting` covers the match, its pause menu, the results
  screen (GameState still runs), a match load (`releaseState` then async `GameState.create`) and the menu load
  (`bootHold`). Every co-op screen (`CoopScreen`, join, lobby, browse, connecting; `src/net/coopUi.ts:262/306/411/678/760`)
  carries `coop-screen`, and the screen stack removes popped screens from the DOM (`src/ui/screen.ts:140/157/166`), so
  `.coop-screen` is exact. `backToLobby` (`coopUi.ts:216`) runs `goToMenu` and `showLobby` in one task, so no tick sees
  the bare main menu between them. `?room=` and `?net=local` open their co-op screen behind `goToMenu`'s `bootHold`.
- First install still controls the page: `dist/sw.js` has `clientsClaim()`, no unconditional `self.skipWaiting()`, and
  the handler `"SKIP_WAITING"===e.data.type&&self.skipWaiting()`. A first install has no waiting phase, so
  `onOfflineReady` fires (installed, `isUpdate` false) and nothing reloads: e2e-offline's claim + A109 warm path and
  the co-op offline step keep working (they just no longer see the activation reload their comment mentions).
- `updateSW(true)` in 2.0.0 ignores its argument and only posts SKIP_WAITING; prompt mode never reloads by itself.
- Probe: one `setInterval` (guarded by `waiting`), cleared on apply, cheap (a class-list copy and one
  `querySelector`); runs until apply or page close. The toast shows once, never during the boot.
- No static `src/net` import: `src/pwa/pwa.ts` imports only `virtual:pwa-register` and `./updatePolicy` (no imports);
  `main.ts` adds none; the built `index-*.js` has no co-op screen code (only `coopUi-*.js` does).
- No runtime network added (the update check is the browser's own registration check, as before).

## Notes

- Two windows: when one on the menu applies, the other (mid-match) is taken over by the new worker at once (the
  browser moves every client of the registration on activate; `clientsClaim` is not involved) and the new worker's
  activate drops the old build's precache entries. With the fix that window reloads at its menu; until then a first-time
  lazy import of an old hashed chunk can fail. Unavoidable with one registration and far better than the old mid-match
  reload; worth a line in `docs/systems/deploy.md`.
- `probe` closes over `app` before `const app` (`src/main.ts:77-84`); safe because the callbacks fire after the async
  registration (the old `onReady` did the same), but brittle.

## Polish

- Move `setupServiceWorker(...)` below `const app = new App(canvas)` in `src/main.ts` (no TDZ reliance).
- `tests/updatePolicy.test.ts`: a case for `topClasses: ['title-screen']` with `coopOpen` true, and one for the
  results screen (`menuState: false`, a results class).
- `scripts/e2e-offline.mjs:50` comment still describes the autoUpdate activation reload.
