# Step 10 - terminal-pause (Block B, then Pause B)
The Field terminal pause menu (MD7), the pause look (MD14), controller disconnect (MD12) and the results screen.
Deps: 06. Model: Opus 5.5 / Opus 5.5. Net: co-op pause must not freeze the simulation (as today).

## Read
- SPEC.md 7.19-7.21, 7.25, 4.3 (controller disconnect); DECISIONS MD7, MD12, MD14; bible 5.8 (no quicksave, Restart
  from checkpoint, results categories), 5.10 field terminal (the old 5.15 Act 2 locks are void since G9).
- `src/ui/screens/pauseScreen.ts`, `resultsScreen.ts`, `src/game/gameState.ts` (`pause`, `menuOpen`),
  `src/core/app.ts` `onVisibility`, `src/input/inputManager.ts` (disconnect), `src/vfx` post stack:
  `DefaultRenderingPipeline` DOF setup, `vfx/dofAperture.ts`, `CinematicPost` vignette; `docs/systems/graphics-quality.md`
  (MOBILE_OFF, DOF). Prototype `SCR.pause`, `setBg()` pause branch.

## Task
1. FIELD / TERMINAL list: Resume, Objectives, Radio log, Map, Settings, Restart from checkpoint, Report feedback, Quit
   to main menu. Context under the list. Objectives: current objective text; Radio log: this session's radio lines
   (if a log exists; else "No messages yet."); Map: "The map arrives with the mission framework." Co-op: no Restart,
   context "The mission keeps running."
2. Back / B / Start / Esc resume. Restart and Quit confirm (Cancel first). Settings opens Settings; its Back returns
   here. Act 2 locks (brightness, gamma, FOV) show as locked rows with the reason when the mission sets them.
3. `src/vfx/pauseLook.ts`: on a `ui:pause` event, ease DOF in over 250 ms (focus distance = camera to the local
   player's chest, small f-stop) and raise the vignette, centred on the player; off on resume. Only on presets with
   DOF; Low and phones use a CSS overlay `rgba(3,5,6,.82)` plus the left shade; no `backdrop-filter`. Reduced motion:
   instant. Gameplay code never reads it. The HUD hides while paused.
4. Controller disconnect: solo mission -> pause + dialog "Controller disconnected" (Continue focused; any key, click
   or reconnect dismisses); co-op -> the dialog without freezing; menus -> toast. Reconnect toast.
5. Results (MISSION / RESULTS): rating %, the bible categories as rows, best rating; Continue (default), Retry, Main
   menu; co-op Play again -> lobby. Back = Main menu.

## Tests
- Unit: pause look state machine (pure part: target aperture over time, off on resume, instant with reduced motion).
- e2e-menus: pause list on all devices, Restart / Quit dialogs, Settings round trip with focus memory.
- e2e-pad (pause flow, disconnect -> paused + dialog), e2e-mouse (Esc pauses, Resume recaptures), e2e-offline
  (background pauses), e2e-coop (pause does not freeze), e2e-missions / e2e-modes (results screen keys).
- GPU (PC): `E2E_GPU=1` shots of the paused frame at Epic and at Low, and the phone look.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus e2e-pad e2e-mouse
  e2e-offline e2e-coop e2e-missions`.
- Perf (PC): `E2E_GPU=1 node scripts/perf.mjs --budget` with a paused sample: paused frame <= gameplay frame.
- Block B end: full `npm run e2e`, perf trend, phone check hold (3 min, phone look), then Pause B.

## Commit
"menu-ui 10: field terminal pause with depth-of-field look, controller disconnect, results screen"
Then LOG, STATE (Pause B), CHANGELOG, TESTING (phone: pause overlay; desktop: blur keeps the player sharp),
docs/systems/ui.md, graphics-quality.md (pause look), performance.md if numbers moved.
