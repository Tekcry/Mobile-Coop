# Morning walkthrough (Michael, 2026-10-19, about 10:00 Sydney)

The /ct/ preview holds the build pushed at 09:30 and stays frozen until you say otherwise. Work after 09:30 goes to
feature/ct-prototype only.

## How to start
- **CT training course, two players** (open in two tabs of one browser, host tab first):
  https://tekcry.github.io/Mobile-Coop/ct/?net=local&autostart=ctcourse&mode=course
- Movement, guards, doors, strike and grab: https://tekcry.github.io/Mobile-Coop/ct/?autostart=warehouse&mode=clear
- Turns and posture: https://tekcry.github.io/Mobile-Coop/ct/?autostart=proving&mode=sandbox
- Hard refresh (Ctrl+Shift+R) if an old build shows.
- Anti-crab readout (knees, foot track, knee over ankle, elbows; green in range, red out): Settings > Graphics > Show FPS
  overlay on (or F3); it shows under the frame-rate lines during play (docs/archive/anim-rework/METRICS.md).
- Playtest checklist (saves your notes for me): https://claude.ai/artifact/RA6bgQpeq1xALCXLviRLNp

## Controls (pad)
| Button | Holstered | Gun drawn |
| --- | --- | --- |
| X | draw (the aim toggle) | holster |
| LT | knockout palm strike (guard in reach only) | pistol: hold to jam a camera or laser (stand still) |
| RT | lethal palm strike | fire |
| A | interact, grab from behind, hack | reload |
| B | crouch (hold at a run: roll) | crouch |
| Y | jump / pull up | jump |
| L3 | back-to-wall | shoulder swap |
| R3 | - | zoom (scoped only) |
| LB | tap: switch weapon; hold: selection wheel (vision, guns, gadgets) | same |
| RB | co-op action (see the course) | same |
| D-pad up / down | max speed | same |
| D-pad left | vision on / off (the mode picked on the wheel) | same |
| D-pad right | use the picked gadget | same |
Keyboard: RMB draw, LMB fire / lethal, Z knockout and jam, Tab hold wheel, Space jump, E interact, Shift wall, F co-op
action, mouse wheel or = / - speed, N vision. Full tables: `F1A-CONTROLS.md`.

## The course (Marlow Yard, 8 stations in CT's training order)
The co-op action (RB / F) picks the move from your stance and where you stand:
| Station | What you do | Status |
| --- | --- | --- |
| 1 Panels | One optional panel per station says what to do | built |
| 2 Leg-up wall | One crouches and presses RB, the other runs in and presses RB, Y to pull up, then unbolt the door | built |
| 3 Camera | One draws the pistol (LB to it, X), aims at the camera and holds LT standing still; the other walks under it; swap | built |
| 4 Laser | One stands about 1 m before the beams and presses RB; the other runs in and presses RB (thrown over), then presses the red release | built (the jammer also works) |
| 5 Roof hatch | Leg-up and relay onto the roof (plates), then crouch on the striped square facing the hatch, RB; partner RB; holder's stick lowers; hanging player A at the panel | built |
| 6 Scanners | One scanner each, wait for both small lights green, A together, stay put | built |
| 7 Rope wall | Leg-up one player up; on top stand facing the partner and press RB to drop the rope; partner RB at the wall, stick up to climb | built |
| 8 Finish | Both into the exit zone; the results show time, alarms and revives | built |
Failing costs health, never the run: laser touch 15 HP, a late or abandoned scanner hack 10 HP (never below 1; none if the partner never started). A downed player can be
revived by the partner (hold A near them) within 30 s, at most twice per run; past that, or both down, the bay restarts.

## What changed overnight
- Wren is the character for both players (master merge).
- Posture: upright standing idle, CT crouch about 42 deg (two-foot squat, no kneel), run lean about 22 deg, hands
  by the thighs when crouched, feet on the ground; legs follow the body in turns (one step per 90 deg, no crossing,
  no backwards strides); wall stance arms hang.
- Your playtest notes: CT aim scheme, selection wheel, faster draw (0.3 / 0.4 s), camera further over the shoulder,
  door and grab menus top right, grab while walking, strike only in reach and faster, wall shuffle +50 %, wider peek,
  stick stealth open, guards notice opened doors, goggle flip only on on / off, lens ring, electro fuzz.
- Course: every station's real co-op move is in (leg-up, CT hanging-ladder relay, held jammer, partner throw,
  hang-down, paired scanners, two-person rope).

## Build on /ct/
feature/ct-prototype at the 09:30 push; e2e-ctcourse passed end to end (stations 1-8, revive, both in the exit zone; 682 s,
run alone). Not in it yet: the weapons PR (#7) and the menu PR now on master: they come in with the master merge after
your walkthrough.

## What to try first
1. The course end to end in two tabs (the table above).
2. Turns and the crouch in the Proving sandbox: spin the stick, flick 180 walking and running, crouch walk.
3. The selection wheel (hold LB), vision on D-pad left, draw with X, knockout with LT on a guard in the warehouse.

## Known broken or not built
- Throw, hang-down and rope have no bespoke animations (the vault and leg-up brace poses stand in); the rope line shows
  only on the holder's and climber's screens. Revive heals fully.
- Your partner's gun shows no jam light; light jamming not built; secondary fire is a stub.
- A co-op client's palm strike is always a knockout on the host; a client's bash is a plain open; the client's
  stealth open is push-to-open (no stick angle on the wire).
- Goggle looks (thermal, night) still need a review on your GPU; the thermal door ghost is unverified on a GPU.
- With a gun drawn, A reloads, so doors and the grab menu need a holster first.
- If your partner drops off a hang-down because the link to you timed out, you can stay frozen until you press B.
- A held stick spin can still pop the feet; idle knees slightly bent; head level, not slightly down.
- 13 older e2e suites carry stale assertions from the control changes (test clean-up T1 before the PR).

## Answered questions (Michael, 2026-10-19)
1. Selection wheel: LB hold, kept.
2. Lethal / non-lethal switch: not added; LT / RT is enough.
3. With a gun drawn, A reloads: kept.
4. Scanners: no HP cost when the partner never started; the 10 HP stays for a late or abandoned hack (built 2026-10-19).

## Polish list
`POLISH.md`: nothing there is worked on until you have played the core loop.
