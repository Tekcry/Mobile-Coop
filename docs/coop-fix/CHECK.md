# coop-fix - check (2026-10-20)

Fresh checker, read only, `git diff 51af5ffb 5c70dc7b`. Nothing compiled or run (no `node_modules`).

## Verdict
FIX: 1 item. The rest passes on reading.

## Fix list (ranked by impact)

1. **The `?net=local` gate turns the hidden-page fix off in Michael's own same-device playtest path.**
   - `src/net/bgTicks.ts:11`: `if (flags.net === 'local') return () => undefined;`
   - The documented way to playtest co-op on one PC is two tabs of one browser with `?net=local`:
     `TESTING.md:121`, `docs/ct-prototype/B1-CTCOURSE.md:24`, and every B2-B6 playtest line. In two tabs one is
     always hidden (rAF stopped), so the host tab stops sending snapshots: bug 1 exactly, and the fix never runs there.
   - The real WebRTC path (`flags.net` defaults to `'webrtc'`, `src/core/flags.ts:92`) is covered.
   - The gate is not needed for the e2e: the `stepHeadless` stand-down (`loop.ts:73`, `bgTick.ts:34`, 1 s) already
     keeps the worker out while a pump drives the page.
   - Done looks like: the opt-out keys on automation, not the transport, e.g. `navigator.webdriver === true` (set by
     Playwright) or an explicit test param the e2e scripts pass; two hand-opened `?net=local` tabs take the hold;
     the `bgTicks.ts` comment, FIX-REPORT and `docs/systems/coop.md` say so; the hand check in FIX-REPORT adds "two
     tabs `?net=local`, host tab in the background: the host appears and moves on the joiner".
   - If a suite then shows changed timing (a hidden page stepped between pump calls more than 1 s apart, e.g.
     e2e-coop's `waitSim` gaps), keep the webdriver gate; do not go back to the transport gate.

## Checked and passing
- Types and lint (by reading): `import type` used (`bgTicks.ts:2`, `loop.ts:3` inline `type`); `private obj = OBJ_CONNECTING`
  widens to `string` (mutable field); `w.onmessage = this.onBgTick` is assignable; no `console`; no em dashes in the diff.
- `loop.ts`:
  - No double stepping: the tick returns at once when the page is visible (`:141`), and rAF and the tick share
    `lastT` (`:147`, `:159`), so each stretch of real time is fed once even if both fire.
  - Hide / show: the first tick after hide takes the time since the last rAF, capped at 0.1 s (`bgTick.ts:34`, and
    `frame` `:174`); the first rAF after show takes the time since the last tick. The 4-step cap and backlog drop are
    the same code.
  - Stand-down: manual mode and a `stepHeadless` call within 1 s give 0 and still consume `lastT` (no late catch-up).
  - No per-tick allocation: `bgIn` and `onBgTick` are made once; only the browser's MessageEvent.
  - Worker made only through `holdBackgroundTicks`, only from `src/net` (`coopHost.ts:171`, `coopClient.ts:134`),
    released in both `dispose()` via `offs` (`coopHost.ts:1242`, `coopClient.ts:710`); `GameState.dispose` calls
    `net.dispose()` (`gameState.ts:992`). Counted holds; release is once only.
  - Single player: `render` defaults to true, the manual branch renders as before, `stepHeadless` only adds one
    `performance.now()`. `src/core` imports nothing from `src/net`; `src/net` stays behind the dynamic import.
- Worker bundling / PWA: `new Worker(new URL('./bgTickWorker.ts', import.meta.url), { type: 'module' })` is the same
  pattern as the shipped `voxel/workerPool.ts:34`; the emitted `assets/bgTickWorker-*.js` matches the precache glob
  `**/*.{js,...}` (`vite.config.ts`). No network.
- Objective mirror:
  - First snapshot with `''` replaces the placeholder (`objectiveOnSnap`), Marlow Yard included.
  - Free Roam: `hookHud` seeds from `hud.objectiveText` (`coopHost.ts:200`); the HUD is per match
    (`gameState.ts:466`), so no stale text from an earlier match.
  - "Waiting for host" only after a first snapshot and 2 s of client sim; the next snapshot replaces it. A steady
    host at 15 Hz (`coopHost.ts:44`) never reaches 2 s; `objectiveOnSnap` returns null for an unchanged line: no
    flicker. Co-op never pauses the host sim (`gameState.ts:1042`).
- e2e:
  - Hooks exist: `net.avatars` / `net.remotes[].avatar`, `figure.current` / `renderMeshes`, `rig.root`, `player.cam.yaw/pitch`
    (yaw convention `sin/cos(yaw)` matches `shoulderCamera.ts:380`), `hud.objectiveText`.
  - The `isEnabled()` filter makes `n > 0` fail when the rig is disabled; `until` treats a throw as false.
  - The client page (B) is the front page, so its two rAF frames render and the active-mesh / frustum read is real.
  - Yaw and pitch are restored; no existing wait changed; the old `assert(true, ...)` became a real assert.
  - Bug 2 in Marlow Yard: the old code kept "Connecting to host…" (host `''` equals client `''`), so the new
    e2e-ctcourse assert would have failed. Bug 1 (hidden host) cannot be reproduced headless (pumped host): hand check
    stays, as FIX-REPORT says.
- `tests/coopFix.test.ts` runs the real `bgStepSeconds`, `GameLoop.holdBackgroundTicks` and the objective mirror.

## Polish (not blocking)
- `bgTick()` itself (shared `lastT`, stand-down, no step when visible) has no unit test: stub `document.hidden` and
  call it through a cast with a fake scene and hooks, counting `fixedUpdate` calls.
- The wiring tests are source regexes: brittle to a rename.
- The client's pause menu objective list (`gameState.ts:1031` reads `hud.objectiveText`) can list "Connecting to host…"
  or "Waiting for host…" as an objective.
- After the match ends, the client may switch to "Waiting for host…" under the results (HUD likely hidden).
- Pre-existing, two-tab `?net=local` only: the local transport heartbeat is a main-thread `setInterval`
  (`localTransport.ts:71`); after 5 min hidden Chrome's intensive throttling can starve it and drop the peer at 15 s.
  The bg tick could post the heartbeat, or note it for long two-tab playtests.
- The e2e camera helper restores yaw and pitch only (boom smoothing state moves for two frames); harmless.
