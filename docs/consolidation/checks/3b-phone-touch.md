# Check 3b - phone and touch deletion (2026-10-18)

Verdict: **PASS** (non-blocking notes below; none needs another fix round).

## What was checked
1. Diff (109 files, +693 / -2574). Read the diffs of `quality`, `qualityManager`, `governor`, `deviceTier`, `display`,
   `settings`, `app`, `inputManager`, `world`, `lightRig`, `postStack`, `e2e-lib`, `run-e2e`, plus `gameState`,
   `traversal`, `bakedLamps`, `voxelPlugin`, `cinematicPost`, `nightBloom` / `nightVision`, `darkCurve`, `menuScene`,
   `pwa`, `main`, `settingsScreen`, `controlsScreen`, `photoMode`, `training`, `takedownController`, `gadgetSystem`,
   `worldPrompts`, `styles.css`, `perf.mjs`, `smoke.mjs` and the converted e2e suites. Every removed branch was the
   phone / touch one; the desktop value is what remains in each case:
   - quality: `qualityLevel` shadow = `shadowSpec(f.shadows)`, panini = `v.panini`, preset / features unfiltered,
     output DPR cap `Infinity`, frame cap = `video.fpsCap`, governor on = `video.adaptive`.
   - governor: max level 10 (`MAX_LEVEL`, was `max = 10` off phones), `reset()` = level 0 (desktop passed 0).
   - deviceTier: desktop rule table unchanged; `deviceKey` writes `|desktop|`, the string desktop keys already held.
   - postStack: half float when supported, bloom kernel 64 / scale 0.5; lightRig: clustered unless minimal;
     nightBloom `BLOOM.bright` = old `BLOOM.desktop` (gameState always called `setLook(false)` on desktop);
     voxel AO full (aoLite was false), IBL `realTimeFiltering = true` (iblFilter was true); World baked lamps only on
     the voxel path, volume `null` (desktop `phoneCuts.lampVolume` was always false); cinematic dark floor was 0.
   - app: `--ui-scale` / `--hud-inset` from `window.innerWidth/Height` (viewRotation returned the same when not
     turned); `uiScale` keeps the desktop formula. CSS `.platform-desktop X` became `:root X` (same specificity).
   - input: kbm / pad paths untouched; touch-only additions removed (takedown `touchHeld`, gadget wheel toggle,
     `leap`, `lowerRequest`, world-prompt taps, touch-stick max gear, photo-mode left-half drag and arrows, which
     were shown only under `.input-touch`). The training gadget step is no longer skipped (it was skipped only in
     touch mode).
   - e2e-ct: `tap('leap')` -> `tap('jump')` keeps the four manual-jump checks (they pass).
2. Leftovers (src/, tests/, scripts/, not src/editor): no imports of the deleted modules, no `renderOpts`,
   `viewRotation`, `layoutEditor`, `phoneLook`, `isMobile`, `hasTouch`, `Pixel`, `'leap'`, `platform-` classes.
   Remaining hits are English words ("touch a wall", "untouched"), CSS `touch-action` properties, and comments /
   test names that describe the retired phone era. No dead code or dangling import (tsc and lint pass).
3. `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`: unchanged. `src/editor/lightView.ts`
   still builds `BakedLamps` with `{ floorY }` volume mode and `standard: true`; `LampVolume`, volume mode,
   `standardLook`, `remixes` and `DARK_STANDARD` are kept and typecheck (tsconfig includes `src`).
4. `tests/settings.test.ts` has a literal old record (full touch section, `video.platform` / `phoneOutput` /
   `phoneSetup`, custom pad / mouse / keys / audio / gameplay / video); it loads through `sanitizeSettings` and
   `SettingsStore` from fake-indexeddb, touch keys dropped, the rest kept. Settings live in `kv/settings`, not the
   versioned profile save, so `SAVE_VERSION` unchanged is correct. No `src/net` change: `PROTOCOL_VERSION` unchanged
   is correct.
5. `npm run check`: pass (lint 0 errors / 41 warnings, 130 files / 1495 tests, build ok). The first run had 5 unit
   timeouts (detailPass, rig, voxel: 5000 ms under machine load); those 3 files pass alone in 2 s and the full rerun
   passed.
6. E2E on port 4191, `E2E_JOBS=2`:
   - (a) smoke, e2e-ct, e2e-gadgets, e2e-bunker ok; e2e-foley FAIL (walk 3 plants < 4), e2e-mouse KILLED at 600 s.
     Solo: e2e-foley failed once more (9 s, same 3 plants), then passed (4 plants); e2e-mouse ok (405 s).
   - (b) e2e-lightbake, e2e-darkness ok; e2e-coop, e2e-netmove, e2e-pad FAIL (known flaky: coop selector timeout,
     netmove "zipline ends", pad "focus Report feedback"); e2e-desktop FAIL (conflict toast text empty), e2e-course
     FAIL (host sees the client, timeout). Solo: e2e-desktop ok (553 s), e2e-course ok (244 s).
   - Every non-flaky failure passed alone; e2e-mouse, e2e-foley and e2e-bunker each passed at least once alone or
     under load. Port 4191 freed and checked.
7. Flashbang white-out 0.00 in kbm mode: this diff cannot cause it. `GadgetSystem.flashbang` -> `post.whiteOut`
   reads only the camera position / forward and a clear line; no camera, `whiteOut`, kbm source or pointer-lock code
   changed (kbm `setMode` / `setGameplayActive` / `onLockLost` are as before). Before G13 the e2e page sat in touch
   mode, which hid whatever kbm does to that scenario (most likely the harness: kbm in a live match requests pointer
   lock, and `onLockLost` taps pause). Pre-existing; report only.
8. Deletion log matches the diff (files deleted / moved, ids, settings, quality / governor / deviceTier / app /
   benchmark / render removals, CSS, scripts, REQUIRED / KNOWN_FLAKY / CORE / COVERS / e2e-times edits, wire and save,
   tests, lost coverage, kept on purpose). Note 3 adds one omission.

## Non-blocking notes
1. e2e-foley's walk check sits on its threshold: speed 0.64 m/s in both the failing and the passing run, 3 or 4
   plants in 2.5 s against `>= 4`. Not caused by 3b (sim-time, pad input, no foley / gear / gait code touched); it
   follows from the step-22 slower caps meeting the foley branch's threshold (AUDIT.md already asks the prototype job
   to re-run e2e-foley).
   Done looks like: the walk window or threshold is set for the step-22 speeds (e.g. 3.5 s, or `>= 3`), or the suite is
   listed in `docs/backlog.md` "Flaky e2e suites" until the prototype job retunes it.
2. Suite run times on this machine are near the 600 s suite timeout: e2e-desktop 553 s and e2e-mouse 405 s solo
   (e2e-mouse was killed at 600 s under 2 jobs). Neither suite's environment got heavier in 3b (e2e-mouse already
   used a desktop context; e2e-desktop lost its phone block). Risk for the full `npm run e2e` under load.
   Done looks like: the full run uses `E2E_SUITE_TIMEOUT=900` on this machine, or the orchestrator accepts a solo
   rerun for a timeout kill.
3. Log omission: `perf.mjs`'s default path (`?gfx=min`, the cloud regression budget) used to run under Pixel 7
   emulation and now runs in the 1280 x 640 desktop context (via `launch()`); its draw / triangle budget was measured
   under the phone viewport, so the first perf run may read slightly different counts.
   Done looks like: the log's E2E or Scripts section says so, and the next perf run confirms the budget (GPU numbers
   pending PC run).
4. The Node-side `until()` in e2e-net-lib / e2e-coop / e2e-course / e2e-bunker swallows predicate errors
   (`.catch(() => false)`), so a predicate that throws now reads as a timeout instead of the error. Acceptable for a
   test helper.
