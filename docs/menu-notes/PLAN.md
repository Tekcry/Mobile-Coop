# Menu notes - plan

Loop: docs/systems/session-method.md (Opus implementer, fresh Opus checker, at most 1 fix round per slice).

| Slice | Notes | Content | Checks |
| --- | --- | --- | --- |
| 1 | 1, 3, 7 | Title music on the first input (or at once if the context runs); Back on the main menu does nothing (A1); one Controls place (A2) | check, smoke, e2e-menus, e2e-mouse, e2e-desktop, e2e-pad |
| 2 | 2, 4 | Night Shift load screen held until the menu stage's shaders and the hero LOD are ready (no visible swap); confirm the hero LOD is what the close-ups draw | check, smoke, e2e-menus; GPU shots of the first menu frames |
| 3 | 5, 6 | Blender rifle and pistol in the main-menu void with holding and idle poses (menu-only pose data); fix the hand through the magazine | check, smoke, e2e-menus; GPU contact sheets |
| End | - | CHANGELOG "Unreleased - menu-notes", TESTING.md lines, docs/systems/ui.md; full `npm run e2e` on the PR head; PR | full e2e |
