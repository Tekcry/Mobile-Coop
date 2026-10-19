# Menu notes - plan

Loop: docs/systems/session-method.md (Opus implementer, fresh Opus checker, at most 1 fix round per slice).

| Slice | Notes | Content | Checks |
| --- | --- | --- | --- |
| 1 | 1, 3, 7 | Title music on the first input (or at once if the context runs); Back on the main menu does nothing (A1); one Controls place (A2) | check, smoke, e2e-menus, e2e-mouse, e2e-desktop, e2e-pad |
| 2 | 2, 4 | Night Shift load screen held until the menu stage's shaders and the hero LOD are ready (no visible swap); confirm the hero LOD is what the close-ups draw | check, smoke, e2e-menus; GPU shots of the first menu frames |
| 3 | 5, 6 | Blender rifle and pistol in the main-menu void with holding and idle poses (menu-only pose data); fix the hand through the magazine | check, smoke, e2e-menus; GPU contact sheets |
| End | - | CHANGELOG "Unreleased - menu-notes", TESTING.md lines, docs/systems/ui.md; full `npm run e2e` on the PR head; PR | full e2e |
| 4a | M1 | Title in full darkness (lights and exposure, no rim, glow or silhouette); the first press starts the goggle flicker-on on the existing close-up, with the music; launch only | check, smoke, e2e-menus; GPU shots of the dark title and the flicker |
| 4b | M1 | 6-8 tactical shot mock-ups (hero, weapons, menu poses) on one labelled GPU contact sheet for Michael; build only his picks | GPU contact sheet |
| 4c | M3 | On the press: prompt and wordmark fade out, black with no UI while the goggles flicker, then light rises and the menu fades in; a second press skips (A3) | check, e2e-menus, e2e-pad; GPU s4 frames |
| 4d | M4 | X5 into the live deck, X1-X4 / X6-X8 removed; the forehead glow removed at its source | check, e2e-menus; GPU sheet with 4c (X5, title close-up, flicker) |
