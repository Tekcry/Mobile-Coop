# Step 17 - input-pad (Block C)

Pad-first controls (D1, D5.12): a binding table for every verb; analog speed with gear snapping and hysteresis; the
rocker sets the maximum gear; rumble on landings, takedowns, shots and heavy footfalls; touch reduced to the D1 basic
scheme. Deps: 10-15. Model: implementer opus; checker opus. Local only: nothing here is sent (D8). (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A (`mark`, `execute`, sonar gone; `cover` = the context action) and steps 09-15 (strike, wall, SWAT,
door peek, medkit). Line numbers verified 2026-10-13 before Block A: grep the named symbol first.

## Read
- DECISIONS.md D1, D5.12; docs/design-bible.md 352-361 (5.3 speed and feel)
- docs/systems/input-and-loop.md 11-53 (Input section)
- src/input/actions.ts 1-60; src/input/gamepadMapping.ts 1-130 (PAD :5-22, tuning :31-37, GAME_BINDINGS :58-75,
  TapHold :81, `mapPad` :122); src/input/gamepadSource.ts 115-171 (rumble :155-161); src/input/inputManager.ts 110-125
- src/input/keyBindings.ts 9-110 (BINDS :44, FIXED_KEYS :76); src/input/touchControls.ts 1-60, 160-200 (layouts)
- src/core/settings.ts 25-35 (TOUCH_LAYOUT_VERSION :33), 140-160, 260-270, 460-480
- src/player/speedGears.ts 1-122 (`stickCurve` :24, `gearSpeed` :31, GearState :93-110); src/config/movement.ts 155-170
- src/player/playerController.ts 360-375 (gear step), 450-460; src/game/gameState.ts grep `rumble(` (~335, 437, 455, 467)

## Task
1. Binding table in docs/systems/input-and-loop.md (Input section): every verb x pad (Xbox names; PS / Nintendo
   glyphs from `PadStyle`) x KBM x touch (basic scheme or "-"): move, look, aim, fire / elbow strike, reload, medkit
   (X hold), crouch, jump / interact / takedown, context (back-to-wall, door peek, SWAT), sprint, gear rocker, swap,
   gadget, gadget wheel, vision, shoulder swap, ping, pause. Code and table agree (unit test reads GAME_BINDINGS).
2. Analog speed (pure `AnalogGear` in speedGears.ts): v = cap(maxGear) x stickCurve(mag); the snapped gear is the
   highest g <= maxGear whose up threshold v has passed, kept until v drops under its down threshold; speed = cap(g).
   Thresholds = midpoint of adjacent caps +- 15% of the gap (config/movement.ts:159-160), precomputed (m/s):

| boundary | stand up / down | crouch up / down |
|---|---|---|
| 1-2 | 1.125 / 0.975 | 0.76 / 0.64 |
| 2-3 | 1.755 / 1.545 | 1.16 / 1.04 |
| 3-4 | 2.52 / 2.28 | 1.625 / 1.475 |
| 4-5 | 3.45 / 3.15 | 2.125 / 1.975 |
| 5-6 | 4.58 / 4.22 | 2.625 / 2.475 |

   Derive the table from GEARS in code (no hard-coded copy) and pin it with a test against these values.
   Any tilt past the dead zone gives gear 1. Gear 6 only with sprint held, as today. Touch stick uses the same.
3. Max gear: D-pad up / down (the rocker, existing `speedUp` / `speedDown`) and the mouse wheel set the maximum gear
   (1-5); the stick moves within it. HUD gear pips show max and current.
4. Rumble table src/config/rumble.ts `{strong, weak, ms}`: landing soft 0.15 / 0.25 / 60, roll 0.35 / 0.45 / 110,
   heavy 0.8 / 0.8 / 200; takedown done 0.6 / 0.4 / 150; elbow hit 0.5 / 0.3 / 90; shot suppressed 0.12 / 0.2 / 45,
   loud 0.4 / 0.55 / 80; heavy footfall (gear 6 or carrying, per foot plant) 0.06 / 0.1 / 35; existing kill, hit and
   explosion calls move into the table. Only the local player's events rumble. Setting `gameplay.rumble` 0-1.
5. Touch reduced to D1: default layout = move stick, look area, aim, fire (elbow while holstered), crouch, jump,
   one context button (back-to-wall, door peek, takedown, interact, traverse), vision. Swap, gadget, wheel, sprint,
   shoulder, ping and speed buttons leave the layout and the layout editor; TOUCH_LAYOUT_VERSION + 1 (stored
   layouts reset). No other touch work.
6. Prompts show pad glyphs first when a pad is the last device (existing `PadStyle`).

## Tests
- tests/analogGear.test.ts: table values, hysteresis (no chatter at a threshold +- 0.02), max gear clamp, dead zone,
  crouch table, sprint gear 6, no allocation.
- tests/rumble.test.ts: every event maps to an entry; remote events never call rumble.
- tests/input.test.ts: the doc table rows match GAME_BINDINGS and BINDS (parse the markdown table).
- e2e-pad: stick 30% / 60% / 100% at max gear 5 -> gears 2 / 4 / 5 (stand); rocker down -> max 3 caps speed;
  rumble calls recorded by the fake pad on landing, takedown, shot. One check per verb in the table.
- e2e-mouse: wheel sets max gear; every KBM verb in the table fires its action.
- e2e-touch: the basic scheme (each D1 control) passes; removed buttons are absent.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-pad e2e-mouse e2e-touch e2e-move
  e2e-ct`
- `node scripts/anim-audit.mjs` local (gear changes: no pelvis jump, transition blend 0.1-0.25 s)
- Grep proofs: `grep -rn "rumble(" src --include=*.ts` shows only the table path and gamepadSource;
  `grep -rn "rumble\|gear" src/net` shows no new field.
- PC-PASS: rumble feel on a real pad, analog walk feel, pending PC run.

## Commit
"locomotion 17: pad binding table, analog gear snapping, rumble, basic touch scheme"
Then LOG, STATE, AUDIT (D5.12 row), CHANGELOG, TESTING, docs/systems/input-and-loop.md, ui.md.
