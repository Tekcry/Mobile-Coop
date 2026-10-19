# Menu notes - brief

Job lead: "Night Shift | Menu Notes Build" (desktop), branch `feature/menu-notes`, folder
`C:/NightShift/Mobile-Coop-menu-notes`, started 2026-10-19 from master 4.6.8 (da93405c). One PR to master,
"menu-notes: Michael's walk-test menu notes"; the orchestrator sets the version (a minor step) and merges.

## The ask
Michael 2026-10-19 18:40: "can you do the other menu fixes etc from my feedback". His walk-test notes
(`docs/menu-ui/SLICES.md` lines 50-58, verbatim):
1. Music starts at the "press any key" title screen.
2. Preload shaders and the hero before showing it (it is jumpy while loading); a Night Shift load screen is fine.
3. No way back from the main menu to the "press any key" screen.
4. Check the menu model is really the full hero quality.
5. The hand clips the magazine in the menu idle stance.
6. Bring the rifle and pistol into the main menu, with holding and idle poses.
7. The Controls menu and Settings > Controls do the same thing: merge them.

Not in scope: the selection wheel restyle (CT Core, later), anything in gameplay.

## Limits
- Prototype effort (CLAUDE.md "Current goal"); any new pose meets the bible's realism standard (5.12.2).
- Music is WebAudio synthesis / the existing bundled score only (hard rule); no downloads.
- CT Core comes first for the desktop `heavy.lock`; logic suites go to the laptop runner (Character Build) when it is held.
  GPU checks (shot / anim-sheet, `E2E_GPU=1`, port 4189) only on the desktop when the lock is free.
- Files other branches change - do not edit: `src/anim/animGraph.ts`, `src/anim/clips/actions.ts`,
  `src/anim/clips/traverse.ts`, `src/player/attachController.ts`, `src/net/remoteAvatar.ts` (CT Core);
  `src/ui/screens/briefingScreen.ts`, `missionsScreen.ts` (Sector Ops). `scripts/e2e-menus.mjs` is shared with Sector
  Ops: small, separate edits; keep #18's condition wait for the slider hold. Menu poses live in menu-only code or data.

## Michael's answers
(none yet)

## Assumed decisions (undo in brackets)
- A1 Note 3 read as "remove the way back": the main menu already returned to the title on Back (menu-ui MD2), so the
  note asks for that to stop. Back on the main menu now does nothing. [Undo: restore `MainMenuScreen.onBackToTitle` in
  `src/main.ts`.]
- A2 Note 7: Settings > Controls is the one place for controls (hold / toggle, sensitivities, Remap controls); the
  Pause menu's separate "Controls" item is removed. [Undo: re-add the pause item in `pauseScreen.ts`.]
