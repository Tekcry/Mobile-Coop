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
- M1 (2026-10-19 19:55, through the orchestrator): "Can you mock up new tactical shots for the main menu. Keep the main/first view as the close up of wrens goggles flicking on. Can you change it so it's full darkness until pressing the start button, which causes wrens goggles to flicker on in the darkness. Adjust darkness to suit so you can't see wren at all until pressing the button." Done as slice 4a (title in full darkness, the first press starts the goggle flicker-on on the existing close-up; launch only) and slice 4b (6-8 tactical shot mock-ups on one contact sheet; only the shots Michael picks are built).
- M2 (2026-10-19, on the slice 2 sheet, through the orchestrator): "Don't show any loading text, just fade in the press any button text when it's loaded." Asked whether NIGHT SHIFT should fade in with the prompt: "Night shift should be visible always, but prompt should fade in once loaded". Done in slice 4a: one black screen with the wordmark from boot, no status text or progress line, the load gate unchanged, only the prompt fades in when it opens (also on a gate failure or cap).
- M3 (2026-10-19, on the slice 4a sheet, through the orchestrator): "Goggles should flicker in full darkness first, then main menu". On the press the prompt and NIGHT SHIFT fade out, the screen stays black with no menu UI while the goggles flicker on, then the light rises on the close-up and the main menu fades in; the music still starts on the press; input is blocked until the menu is in (slice 4c).
- M4 (2026-10-19, on the slice 4b sheet, through the orchestrator): "X5 only" - X5 (on the sights) joins the live deck; X1-X4 and X6-X8 are dropped. And: "there is also a random glow above wren on her forehead, it doesn't look right." The third single glow on the helmet above the two lenses is removed at its source (shared code if that is where it lives, so it goes in-game too) (slice 4d).

## Assumed decisions (undo in brackets)
- A1 Note 3 read as "remove the way back": the main menu already returned to the title on Back (menu-ui MD2), so the
  note asks for that to stop. Back on the main menu now does nothing. [Undo: restore `MainMenuScreen.onBackToTitle` in
  `src/main.ts`.]
- A2 Note 7: Settings > Controls is the one place for controls (hold / toggle, sensitivities, Remap controls); the
  Pause menu's separate "Controls" item is removed. [Undo: re-add the pause item in `pauseScreen.ts`.]
- A3 (M3) A second press during the flicker sequence skips straight to the lit main menu (the orchestrator's suggestion). [Undo: drop the skip in the title sequence so input stays blocked until the menu is in.]
