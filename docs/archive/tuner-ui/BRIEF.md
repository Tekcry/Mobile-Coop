# tuner-ui - brief

Job lead: "Night Shift | Course Ready Build" (desktop), from the orchestrator 2026-10-21 (~09:15), top priority (ahead
of coop-torches, parked). Branch `feature/tuner-ui` from master 14e0b7a3, folder `C:/NightShift/Mobile-Coop-tuner-ui`.
PR to master. Michael's screenshot: `docs/tuner-ui/tuner-ui-2026-10-21.png`.

## Michael's words (verbatim)
"Review the animation ui layout. Not practical for controller use. It's such a long list. Can you make l1/r1 cycle tabs
horizontally, and make sure there's a drop down list that shows when I click into a list so I can see what I'm changing
to. Also too many options at once, needs to be cycled through menus one at a time, ie select body state first then work
through animations. Make ui adapt so it's not so big too. All values are missing until I click into the slider and move
it."
"Menu/tab order must be logical and easy to navigate with controller. Setting the loop should automatically change the
state to match also. Add an option to loop on the spot instead of actually moving."
"Character also moves in pause menu."
"Make sure all text is plain English, no filler, simplified. Use button symbols when controller is connected. Help text
also shouldn't cover any UI."
"Selecting front/side views etc doesn't actually lock in that position. It should be able to be selected and locked so I
can edit animation locked to that angle"

## What the screenshot shows (orchestrator)
- Value boxes and several buttons are unreadable (dark on dark, white on white: Export, Share / Copy, Reset all, Clear
  log, Pause, Step, Reset group).
- Everything sits in one tall scroll.
- The pad-edit hint strip overlaps the last rows.
- Demo / loop and body state are separate pickers.

## Goal (one layout pass)
- LB / RB cycle top-level tabs horizontally, in a logical order (e.g. View, Body, Hands & feet, Weapon, Stepping,
  Weight, Camera, Keys, Co-op, Settings).
- Inside a tab, one step at a time: pick the state from a visible drop-down list (A opens it, D-pad moves, A picks, B
  backs out), then its sliders.
- Every value shown at all times, readable on dark.
- The panel scales to the screen (compact, with a size setting).
- Picking a loop sets the state to match; a loop "on the spot" option (treadmill, no travel) next to "move on circle".
- The game is paused while the tuner or Pause is open: no character movement behind Pause.
- Plain short labels; pad button glyphs when a pad is connected (keys otherwise).
- The hint strip is reserved space, never over the UI.
- Camera snaps (front / side / back / top) lock: the view holds that angle while editing until unlocked or another is
  picked.
- Defaults and saves unchanged (identity, IndexedDB, export). e2e-menus and e2e-studio updated for the new navigation.
- Quick prototype first is fine. One implementer, one checker, one fix round, then a PR and the laptop full e2e.
