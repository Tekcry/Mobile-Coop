# Step 05 - settings-remap (Block A, then Pause A)
Settings on the tab strip and row template with a description for every row (MD9), Defaults per tab, the resolution
dialogs, and the locomotion step 18 Remap screen in the new template (MD13). Deps: 03 (04 for entry points). Model:
Opus 5.5 / Opus 5.5. Local only (remap and hold / toggle stay local, D8).

## Read
- SPEC.md 7.11-7.14, 7.22 (Feedback tab), 4.3 (remap capture, sliders); DECISIONS MD9, MD13, MD17, MD18.
- `src/ui/screens/settingsScreen.ts` (all tabs), `controlsScreen.ts` (step 18 Pad and Keyboard tabs, capture),
  `resolutionPicker.ts`, `dataTab.ts`, `feedbackScreen.ts` `feedbackTab`, `layoutEditor.ts` (toolbar only),
  `src/ui/widgets.ts` `TabView`, `src/input/keyBindings.ts` `captureNext`, pad capture code from step 18.
- Prototype `SCR.settings`, `sRows()`, `SCR.remap`, `capture()`.

## Task
1. GAME / SETTINGS on `MenuScreen` with `tabs`: Controls, Touch (touch platforms), Gameplay, Graphics (Display on
   phones), Audio, Accessibility, Feedback, Data. LB / RB glyph bumps at both ends of the strip, clickable.
2. Controls tab per SPEC 7.11 (merges today's Controller and Mouse & Keyboard tabs; the key list moves to Remap). Mouse
   section hidden on mobile. Status line for the controller.
3. Every row has a description (SPEC 7.11 and the prototype's text; write the missing ones in the same voice, British
   spelling, at most 2 sentences). Section labels as `grp` rows (not focusable).
4. X Defaults: dialog "Reset <tab> to defaults?" Cancel / Reset (Cancel focused); resets that tab only.
5. Graphics: any quality row change sets Preset to Custom. Resolution: picker (list in a dialog band) then "Keep this
   resolution?" Revert (focused) / Keep with a 10 s countdown that reverts.
6. Accessibility: Subtitles shown as a locked row "Always on" (reason "Subtitles carry the story, so they are always
   on."). Remove the Controls reference button (MD19).
7. Remap (CONTROLS / REMAP): tabs Controller / Keyboard and mouse (current device first); rows with binding glyphs;
   capture overlay with a 5 s countdown; cancel = pad Menu / Esc / click Cancel / timeout; B is capturable (MD13);
   mouse buttons capturable on the KBM tab; conflict ⚠ on both rows plus "N actions share a binding" line; X Clear,
   Y Reset all (confirm, Cancel first). Keep step 18's `findConflicts` and persistence.
8. Gameplay: Player name row opens a temporary text field until step 06's Osk (keyboard only; pad shows the locked
   reason "Arrives in step 06" - remove in 06).
9. Feedback and Data tabs as rows; empty state for no notes; destructive actions confirm.
10. Layout editor: toolbar restyled as legend items; mark it touch-only in the parity checklist.

## Tests
- e2e-menus: settings default focus, LB / RB / Q / E / click tab switching with per-tab memory, cycler by arrows,
  A/D, click arrows and confirm; slider hold accelerate; Defaults dialog safe default; remap capture on pad (B binds,
  Menu cancels) and keyboard (Esc cancels), conflict warning, Reset all.
- e2e-desktop (graphics, resolution keep / revert, frame cap), e2e-pad (settings slider, remap then play), e2e-mouse
  (remap crouch, sprint hold vs toggle), e2e-touch (Touch tab, layout editor), e2e-feedback (Feedback tab).

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus e2e-desktop e2e-pad
  e2e-mouse e2e-touch e2e-feedback`.
- Block A end: full `npm run e2e` (background), `node scripts/perf-trend.mjs`, then Pause A (BRIEF 6).

## Commit
"menu-ui 05: settings tabs and rows with descriptions, remap screen, resolution dialogs"
Then LOG, STATE (Pause A), CHANGELOG, TESTING, docs/systems/ui.md, input-and-loop.md (remap capture cancel).
