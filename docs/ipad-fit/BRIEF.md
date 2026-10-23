# ipad-fit brief (Player Build, spare job)

iPad display fit for G182, menus and HUD only. From Michael's iPad screenshots on 4.72.0: (1) version label half below the
bottom-right edge, (2) a dark strip along the bottom, (3) the "integrated GPU ... Windows Settings" banner shows on iPad,
(4) the pause room line overflows into the help box.

## Assumed decisions
- A1 Windows detection by UA / platform string, not GPU name. Undo: drop the `runningOnWindows()` checks in src/core/app.ts
  (gpu toast) and src/ui/screens/settingsScreen.ts (GPU note).
- A2 No touch controls or other tablet work (G12 stays desktop only; G182 launch only). Undo: n/a (nothing added).
