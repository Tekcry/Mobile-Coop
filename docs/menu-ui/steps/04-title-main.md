# Step 04 - title-main (Block A)
Title / press start (MD2), the flat main menu (MD6), the brightness screen and the boot overlay in the new look.
Deps: 03. Model: Opus 5.5 / Opus 5.5. Local only.

## Read
- SPEC.md 7.1-7.4, 7.7, 7.8 (entries only), 7.9; DECISIONS MD2, MD5, MD6, MD19; prototype `SCR.title`, `SCR.main`.
- `src/ui/screens/mainMenu.ts` (`MainMenuScreen.entries`), `src/main.ts` entries (~106-139) and `goToMenu`,
  `src/ui/screens/brightnessScreen.ts`, `src/ui/screens/profileBadge.ts`, `index.html` `#boot`, `src/core/legacy.ts`.
- Save reads for progress: `src/save` (mission results, best rating), training progress source (grep "training" in
  src/game/course).

## Task
1. `titleScreen.ts`: SPEC 7.2. Shown once per launch before the main menu; skipped by `?autostart`, returning from a
   match, and under webdriver unless `?title=1`. Any button / key / click / tap continues and unlocks audio. Background:
   the current menu stage framing until step 12 adds S1.
2. Main menu on `MenuScreen` (list): Continue (counter = mission %; hidden without a checkpoint), Missions (unlocked /
   8), Co-op (counter "Offline" when offline), Training (done / total), Free roam, Loadout, Settings, Feedback (open
   notes count); Legacy before Settings with `?legacy=1`. Context under the list. Entries stay registrable through
   `MainMenuScreen.entries` (keys, order, counter callback, context, onSelect).
3. Until step 07 exists: Missions / Continue / Training / Free roam open today's `PlayScreen` preset to that mode, so
   nothing is lost mid-run.
4. Back on the main menu returns to the title screen (MD2), not a no-op.
5. Profile badge hidden unless legacy (MD19). Item icons removed. Version bottom-right.
6. Brightness: BRIGHTNESS / CALIBRATION on the template (slider default focus, Done; Back = Skip on first run).
   Order on first run: title -> main menu -> brightness on top.
7. Boot overlay: NIGHT / SHIFT ghost, a 1 px progress line, status text; the match-loading variant shows mission name,
   district and the first briefing line (until step 07 provides data: map name only).

## Tests
- e2e-menus: title (any key / click / pad A / tap), main menu default focus, every item's Back returns focus to it,
  Back -> title; keyboard, mouse, pad.
- e2e-park, smoke, e2e-pad, e2e-touch, e2e-offline: update selectors to `data-key` (`continue`, `missions`, `coop`,
  `training`, `freeroam`, `loadout`, `settings`, `feedback`, `legacy`); smoke and autostart paths skip the title.
- `tests/legacy.test.ts`: Legacy entry only with the flag.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus e2e-park smoke e2e-pad
  e2e-touch e2e-offline e2e-dead-line-menu`.
- GPU (PC): `E2E_GPU=1 node scripts/shot.mjs` of title and main menu at 1080p and the phone look (add to PC-PASS
  if not run).

## Commit
"menu-ui 04: title screen, flat main menu, brightness and boot in the new look"
Then LOG, STATE, CHANGELOG, TESTING (phone: title tap, main menu tap targets), docs/systems/ui.md.
