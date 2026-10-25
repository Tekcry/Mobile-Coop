# Animation tuner - pad control (tuner-pad)

> Superseded by tuner-camera pass 2: the current map is `STATE.md` "Pad map" (every control by pad, edit mode, a Y
> menu, View freezes). This file is the tuner-pad history.

Michael chose native pad control of the animation tuner, so he can tune, walk to check, and tune again without a mouse.

## What was built
- `src/ui/animTunePad.ts` (pure, `tests/animTunePad.test.ts`): `TunePadCtl`, modes `off` (panel closed), `tuner` (the
  pad drives the panel) and `game` (the pad plays). Fed a button bit mask and the left stick X once per frame; edge
  presses, the left / right repeat, the stick rate and the "quiet" rule (after opening, closing or switching, every press
  is swallowed until all buttons are up). No allocation per frame.
- `src/input/gamepadSource.ts`: `padHook`, called with the active pad before the bindings on every poll (not during a
  remap capture). Returning true takes the pad that frame: the pad's held actions are released, look and the menu
  repeats reset, nothing reaches the `InputState`, so neither the game nor the menus see it. A press still sets the
  input mode to the pad.
- `src/core/app.ts`: sets the hook to `AnimTunePanel.padPoll`.
- `src/ui/animTunePanel.ts`: `padPoll` applies the commands; a "PAD:" line under the header shows the mode; the focused
  row gets an amber outline and tint. Nudges go through the slider's own input handler (same save, log and display).
  Follow does not rebuild the rows while the tuner has the pad. `window.__animTune.pad()` returns the mode and the
  focused group / id (tests).
- `scripts/e2e-menus.mjs` (pause block): Pause > Animation tuner by A, D-pad down, right nudge (left at the top of the
  range), Y reset, the left stick does not reach the game, B closes.

## Button map (while "PAD: tuner")
| Button | Does |
| --- | --- |
| D-pad up / down | Previous / next slider (body rows, then the gun rows; wraps). Edge only. |
| D-pad left / right | Nudge by the slider's step; held: repeats after 0.35 s every 0.06 s, x5 steps after 1 s. |
| Left stick X | Analogue nudge: past a 0.2 deadzone, full tilt crosses the slider's whole range in 2 s. |
| LB / RB | Previous / next state group of the focused slider's section (follow turns off, as a manual pick). |
| Y | Reset the focused slider. |
| A | Export (`anim-tune-<date>.json`). |
| B | Close the panel (the pad goes back to the game). |
| View (Back / Select) | Give the pad to the game ("PAD: game"); press again to take it back. |

Everything else (Start, triggers, right stick, stick clicks, X) does nothing while the tuner has the pad.

## Assumed decisions (how to undo)
- A1. Opening the panel always takes the pad, from any entry (Pause, Settings, F3). Keyboard and mouse are never
  affected, so this only matters with a pad. Undo: in `AnimTunePanel.show()` call `this.pad.open()` only for the pause
  entry (pass a flag from `pauseScreen.ts`), else set `this.pad.mode = 'game'`.
- A2. B closes the panel (not "release to the game"); View is the switch between tuner and game. Undo: in
  `TunePadCtl.update`, make B set `mode = 'game'` and `quiet = true` instead of `o.close`.
- A3. View is the toggle because it is unbound in play by default (the "Mission device", no action yet). While the
  panel is in "PAD: game", a View press still switches to the tuner (a verb rebound onto View would then not fire).
  Undo: change `TUNE_PAD_TOGGLE` in `animTunePad.ts` (for example to a chord) and its test.
- A4. D-pad up / down do not repeat on hold (edge only, as asked); only left / right repeat.
- A5. LB / RB act on the section that holds the focused slider; the gun section is reached by D-pad down past the last
  body slider. The same field stays focused when the new group has it.
- A6. While the tuner has the pad, the menus get no pad input either (opened from Settings, B closes the panel first).
- A7. The focus mark shows only while the tuner has the pad.

## Files
`src/ui/animTunePad.ts`, `src/ui/animTunePanel.ts`, `src/input/gamepadSource.ts`, `src/core/app.ts`,
`tests/animTunePad.test.ts`, `scripts/e2e-menus.mjs`, `CHANGELOG.md`, `TESTING.md`, `docs/systems/ui.md`.
