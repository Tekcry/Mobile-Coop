# marlow-bays - brief

Job lead: Night Shift | Course Ready Build. Branch `feature/marlow-bays` in `C:/NightShift/Mobile-Coop-marlow-bays`
(from master 4.33.0, c3af5fac). Starts once coop-torches has its PR open; it merges master again after coop-torches
lands (both touch the co-op protocol).

## The ask (Michael, 2026-10-21 ~13:50, from his co-op run up to bay 3 of Marlow Yard)
"I have a list of fixes up to bay 3 of marlow yards. Can i give them to you to prototype/quick fix, while i work on
animations. Once you have completed fixes i will revist those bays and continue."

Verbatim list:
1. "coop player unusual and slow movement when holding guard"
2. "bay 2 unbolt door doesnt work. it says bolted from other side when entering the room, but doesnt say anything when
   unbolting after jumping over. stays closed and locked. seemed to work with both players on that side?"
3. "add a menu option to restart at checkpoint in sector ops and coop"
4. "add a menu option to return to lobby (which brings players connected players too) which returns to the lobby menu."
5. "bay 3 the camera view is inside the airlock once door opens, it needs to be in that bay area only and it should be
   impossible to pass without one player jamming in to walk past, then the second player jamming it for the first player
   to walk past. Should be more of a hallway."
6. "camera red grid is good, but remove the flashing red surround and keep it grid only. there is also random red lines
   on the floor in bay 3, dont know what they are for."
7. "the jammer doesnt seem to work. when it does work, it should make a quiet buzzing/interference noise both players can
   hear, and the red grid should disappear as it cant see anymore. when releasing, there should be a 1.5 second delay
   where the camera comes back online. this cannot be interrupted by another jam until its back online. the camera
   should also stop moving and the camera light should flash during jamming. limit jammer to 5 second use, with a 5
   second cooldown."
8. "when jamming lights, the light should flicker then turn off. once jammer is released, the light should remain off
   for 4 seconds, then flicker back on"
9. "animation dev keyboard and mouse is hard to use as the player camera locks the mouse in position, how can i adjust it
   so i can either use the normal camera, or click and drag the screen to change camera view and i can still select all
   the sliders etc?"
10. "can you clearly highlight the body part/weapon/animation that is currently selected and being adjusted."

Goal: quick prototype fixes so Michael can replay bays 1-3 in co-op and continue. No polish beyond the list.

## Order
- **Slice T (tuner, first: Michael is animating now):** items 9 and 10. Its own small PR so it reaches him fast.
  - 9: while the tuner is open with keyboard and mouse, the pointer is free (no pointer lock); a toggle (key + panel
    button) between "game camera" (normal mouse look, panel ignores the mouse until toggled back) and "drag view"
    (left-drag on the scene orbits the camera, wheel zooms, the panel stays clickable). Default drag view.
  - 10: the selected part, bone, weapon or clip is highlighted in the scene (outline or marker on the bone / mesh) and in
    the panel (the row and tab), clear in both light and dark.
- **Slice B (bays 1-3 bugs):** items 1, 2, 6 (remove the flashing surround; find the bay 3 floor red lines: remove if a
  debug or unused visual, otherwise say what they are).
- **Slice J (jammer):** items 7, 8 and the bay 3 hallway (item 5). Co-op synced (both players see and hear it).
- **Slice M (menu):** items 3, 4.

## Assumed decisions (undo by telling the orchestrator)
- A1: In co-op, restart at checkpoint and return to lobby are host actions that take both players; the client's pause
  menu shows them disabled with "Host only" and keeps its own Leave.
- A2: Restart at checkpoint in solo Sector Ops and in co-op Marlow Yard both reload the last checkpoint; a confirm dialog
  first (Stay focused by default).
- A3: Jammer limits (5 s use, 5 s cooldown, a 1.5 s camera reboot that cannot be re-jammed) apply to every jam target;
  the light timing (flicker off, 4 s off after release, flicker back on) applies to lights.
- A4: The buzz is a quiet WebAudio synth voice at the jammed device, heard by both players through the normal
  positional mix.
- A5: Bay 3 becomes a narrow hallway the camera covers end to end; the camera's view stays inside the bay (no view into
  the airlock); one jam cannot cover both players: player A jams while B passes, then B jams for A (the 5 s limit and
  the 1.5 s reboot make it a real handoff).
- A6: Item 1 (slow co-op movement holding a guard) is investigated on the client and host; fix the cause, keep the
  solo carry speeds.

## Limits
Hard rules in CLAUDE.md. Gameplay never reads graphics state; light parity holds for jammed lights (meter and guards see
the light off). A co-op protocol change bumps PROTOCOL_VERSION after coop-torches' 25. One checker per slice, one fix
round. Tests: check, the suites the slice touches (e2e-coop, e2e-netmove, e2e-ctcourse, e2e-menus, e2e-anim / studio
for slice T), full e2e on the laptop before each PR; GPU look of bay 3 on the desktop.
