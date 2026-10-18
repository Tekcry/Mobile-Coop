# Morning walkthrough (Michael, 2026-10-19, about 10:00 Sydney)

DRAFT, finalised at 09:30. The /ct/ preview is frozen from 09:30 until you say otherwise.

## How to start
- CT training course, two players (open in two tabs of one browser):
  https://tekcry.github.io/Mobile-Coop/ct/?net=local&autostart=ctcourse&mode=course
- Movement and guards: https://tekcry.github.io/Mobile-Coop/ct/?autostart=warehouse&mode=clear
- Turns and posture: https://tekcry.github.io/Mobile-Coop/ct/?autostart=proving&mode=sandbox
- Hard refresh (Ctrl+Shift+R) if the old build shows.
- Playtest checklist (saves your notes for me): https://claude.ai/artifact/RA6bgQpeq1xALCXLviRLNp

## Controls now (pad)
| Button | Holstered | Gun drawn |
| --- | --- | --- |
| X | draw (aim toggle) | holster |
| LT | knockout palm strike | jammer (pistol, hold) / secondary |
| RT | lethal palm strike | fire |
| A | interact, grab from behind | reload |
| B | crouch (hold at a run: roll) | crouch |
| Y | jump | jump |
| L3 | back-to-wall | shoulder swap |
| R3 | - | zoom (scoped only) |
| LB | tap: switch weapon; hold: selection wheel | same |
| RB | co-op action (leg-up offer when crouched, relay when hanging) | same |
| D-pad up / down | max speed up / down | same |
| D-pad left | vision on / off (mode picked on the wheel) | same |
| D-pad right | use the selected gadget | same |
Keyboard: RMB draw, LMB fire / lethal, Z knockout, Tab hold wheel, Space jump, E interact, Shift wall, F co-op action,
mouse wheel speed. Full tables: `F1A-CONTROLS.md`.

## What changed overnight
- Wren is the character for both players (master merge).
- Posture: CT crouch 35-45 deg, run lean about 22 deg, feet on the ground; legs follow the body in turns (one step
  per 90 deg, no crossing, no backwards strides); wall stance arms hang.
- Your playtest notes: CT aim scheme, selection wheel, faster draw, camera further over the shoulder, menus top right,
  grab while walking, strike only in reach and faster, wall shuffle +50 %, wider peek, stick stealth open, guards
  notice doors, goggle flip only on on / off, lens ring, electro fuzz, one panel per station.
- Course: leg-up and the CT hanging-ladder relay are real at stations 2 and 5.

## What to try
(filled in at 09:30)

## Known broken or not built
(filled in at 09:30)
- Posture still off (from the P1b stills): the standing idle leans forward with the head pushed out and both arms
  reaching forward; crouched idle drops onto one knee (kneel) after about 0.5 s.

## Open questions for you
1. Selection wheel button: LB hold (now; the D-pad is speed and vision) or a D-pad hold as in your screenshot?
2. Lethal / non-lethal centre switch on the wheel: not built, since LT knockout / RT lethal covers it. Add it?
3. With a gun drawn, A reloads, so doors and the grab menu need a holster first. Keep, or interact on A always and
   reload elsewhere?

## Polish list
`POLISH.md` (nothing there is worked on until you have played the core loop).
