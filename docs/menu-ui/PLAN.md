# Menu UI run - plan

Authority: DECISIONS.md > bible > SPEC.md > this plan. Every step: `npm run check`, `npm run build && npm run
e2e:quick`, the suites it names, and the SPEC section 9 parity checklist on the screens it touches. All implementers
and checkers are Opus 5.5. Paths come from `feature/ct-locomotion` at 57c4fed: grep the named symbols first.

New e2e suite: `scripts/e2e-menus.mjs` (step 03), added to REQUIRED in `scripts/run-e2e.mjs` and to the `src/ui/` and
`src/input/` quick-map entries. It drives each screen three times (keyboard, mouse, fake pad), asserting focus, Back
targets, legend clicks and that glyph switching moves no element (bounding boxes equal within 0.5 px).

## Block A - framework and core screens (session 2)
| # | Step | Deliverable | Key files | Co-op check | Deps |
| --- | --- | --- | --- | --- | --- |
| 01 | tokens-font | Barlow Condensed bundled, tokens, access settings (text size, contrast, reduced motion), CLAUDE.md MD1 line, version | `src/styles.css`, `src/ui/fonts/`, `src/core/settings.ts`, `main.ts` | none | - |
| 02 | screen-template | `MenuScreen` template, ghost title, context panel, clickable legend with fixed glyph slots, live glyph switching | `src/ui/menuScreen.ts`, `src/ui/prompts.ts`, `src/ui/screen.ts` | none | 01 |
| 03 | input-parity | Hover focus, click confirm, WASD, Space, uiX / uiStart / uiAlt keys, mouse 4, hold-accelerate, wrap, tab memory, locked items, touch tap = confirm, `e2e-menus` | `src/ui/focusNav.ts`, `src/input/*`, `src/ui/widgets.ts`, `scripts/e2e-menus.mjs` | lobby nav unchanged | 02 |
| 04 | title-main | Title screen, flat main menu, brightness restyle, boot overlay restyle | `mainMenu.ts`, new `titleScreen.ts`, `brightnessScreen.ts`, `main.ts`, `index.html` | Co-op item offline counter | 03 |
| 05 | settings-remap | Settings tabs and rows, every row's description, Defaults per tab, resolution dialogs, Remap screen restyle (MD13), name Osk stub link | `settingsScreen.ts`, `controlsScreen.ts`, `resolutionPicker.ts`, `dataTab.ts`, `feedbackScreen.ts` (tab) | remap stays local (D8) | 03 |
Block A end: full e2e, perf trend, **Pause A** (Michael checks the core screens on keyboard, mouse and pad).

## Block B - remaining screens (session 3)
| # | Step | Deliverable | Key files | Co-op check | Deps |
| --- | --- | --- | --- | --- | --- |
| 06 | dialogs-osk | Dialog band, toasts, `Osk` component (code and full), Join screen, name entry, feedback note on pad | `widgets.ts`, `toast.ts`, new `osk.ts`, `src/net/coopUi.ts` (Join), `feedbackScreen.ts` | join by pad and keyboard | 05 |
| 07 | missions-briefing | Missions cards, Briefing (insertion, difficulty incl. Custom), Training and Free roam lists, Legacy screen; Play hub removed | `playScreen.ts` (split), new `missionsScreen.ts`, `briefingScreen.ts`, `config/missions.json` reads | none | 06 |
| 08 | loadout | Loadout root, lists with stat compare, attachments, legend replaces the action bar, tap = confirm | `loadoutScreen.ts`, `statBars.ts`, `operator.ts` | none | 06 |
| 09 | coop-lobby | Co-op root, offline, connecting, lobby (host / client, locked rows, spoiler line, custom difficulty read-only), error dialogs | `src/net/coopUi.ts` | e2e-coop two pages | 06 |
| 10 | terminal-pause | Field terminal, pause look (DOF + vignette / phone overlay), HUD hide, controller disconnect pause, results screen | `pauseScreen.ts`, new `src/vfx/pauseLook.ts`, `resultsScreen.ts`, `gameState.ts` (pause hook), `inputManager.ts` | co-op pause does not freeze | 06 |
Block B end: full e2e, perf trend, phone check, **Pause B** (Michael: pause blur on the PC, phone look, co-op pause).

## Block C - cinematic menu background (session 4)
| # | Step | Deliverable | Key files | Co-op check | Deps |
| --- | --- | --- | --- | --- | --- |
| 11 | shot-director | Pure shot director with unit tests, `?menuShot=` / `?menuClock=fast` hooks | new `src/world/menuShots.ts`, `tests/menuShots.test.ts` | none | 10 |
| 12 | menu-setups | Setups S1-S7 on the menu stage from the mock patch, operator poses, title silhouette, phone list, contact sheet script | `src/world/menuScene.ts`, new `src/world/menuSets.ts`, `scripts/menu-sheet.mjs` | lobby S7 | 11 |
| 13 | perf-finish | `perf.mjs --menu`, budgets (SPEC 8.4), phone hold, docs, REVIEW.md, PR | `scripts/perf.mjs`, docs | full e2e-coop | 12 |
Block C end: full e2e, perf, **Pause C** (Michael's final review), then BRIEF section 7.

Scope guard: Block A 5 steps (max 10), Block B 5 (max 10), Block C 3 (max 6).
