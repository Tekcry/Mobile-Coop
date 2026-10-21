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

Added ~14:10:
11. "There should also be a keyed tick box isntead of finding the keyed loop."
12. "are there any outstanding tuner fixes? the UI is currently very pool" (poor). Asked what is poor, he picked all
    four: hard to read, cluttered, hard to navigate, looks unfinished.

13. (~14:35) "When i use any of the states, the character actually moves on screen and doesnt stay on the spot. is
    there another button to press? its good to have this but i want to be able to swap between loop on the spot or
    actual movement". The toggle exists (Anim Studio, View tab, Loop player, "Loop on the spot", only for a moving state
    picked in the loop list); he could not find it or it did not hold. Fix: in the studio, picking a state in any tab's
    state drop-down plays that state's loop; "Loop on the spot" sits on every tab (a header toggle, plus a key and a pad
    button) and works for every moving state; if a state still drifts with it on, that is a bug to fix.

14. (~14:50) "can you also make the anim level brighter, the character is quite dark. more light is fine but wont help
    if the character is moving though". Anim Studio stage only: a three-point rig (key, fill, rim) that follows her
    (moves with the root, keeps its angle to the camera or to her facing), a brighter ambient, and a "Stage light"
    slider in the View tab (default bright). Studio only: the game's lighting and light parity are untouched.

15. (~15:00) "how would i fix forearms rotating when jogging, using keys? how do the keys work" / "theres no key steps
    within the keys menu either, so i dont understand how to view each frame". Fix: in the Keys tab, picking a clip and
    key plays that clip in the studio (outside it, on the player) paused on that key; "< key" / "key >" buttons (and pad
    bumpers or D-pad) step the keys with the picker following; a readout "jog - key 2 of 8 (mirror of 6), frame 8";
    the mirrored key named; the edited bone highlighted (item 10). A one-line hint in the tab: "Key edits change one pose;
    whole-cycle changes go in the state tabs."

16. (~15:05) "whenevr im in a certain tab, whichever part/key i select should automatically play, ie if i select a
    weapon stance, the character should swap automatically to that stance, if i select walk it should start walking. i
    should be able to alter speed/steps/pause etc no matter which window im in". Fix (extends 13 and 15): every pick in
    every tab (state, weapon stance, clip, key, co-op pair, traversal move) drives what plays at once; a playback bar
    docked on every tab (play / pause, < key / key >, frame scrub, speed, loop on the spot) with keys and pad buttons
    that work from any tab.

17. (~15:15) "there is a forearm twist that i cant see to fix, the only forearm adjustment is forearm in. shouldnt there
    be roll, x, y etc for each body part?" Fix: the Keys tab gets pitch / yaw / roll for every arm joint it edits
    (upper arm, forearm, wrist) and the trunk joints, named plainly ("Forearm twist" for the roll about the bone), as
    the Joints part already has for whole states. The bake writes them (key file fields or new channels; say which).
18. (~15:15) "adjusting left arm in keyed section also does the exact same thing for the right. I dont mind it but if
    they were uneven i dont know how id adjust them separetly". Mirrored clips copy a key edit onto its mirror key (the
    other arm half a cycle later). Fix: a "Mirror" tick box in the Keys tab (default on, current behaviour); off, the
    edit goes to this key only and the mirror key keeps its own values (the bake writes the clip unmirrored where they
    differ).
19. (~15:25) "i dont see an option just to view idle aiming stance either, only moving forward/strafing/backwards, How
    do i just adjust aiming stance?" The studio has no standing aim loop (only aim glide fwd / strafe / back; the tuner's
    `aim` body group and `rifle.aim` / `pistol.aim` gun groups exist). Fix: studio loops for aim standing, crouch aim
    standing and crouch aim moving, and a weapon pick (rifle / pistol) that applies to every armed loop.
20. (~15:30) "can you check and make sure i have full control over every stance and every body part. There are quite a
    few things missing which i have listed now." Fix: first a coverage audit, `docs/marlow-bays/COVERAGE.md`: every
    player animation the game plays (stances, moves, armed / aimed per weapon, crouch, walls, holds and carries,
    traversal, takedowns, co-op moves, gadgets, hit / death) as rows; columns: a studio loop to view it, state
    sliders, Joints with 3 axes for every joint (trunk, head, shoulders, upper arms, forearms, wrists, hands / fingers,
    hips, knees, ankles, toes), per-key editing with 3 axes, left / right separately, the bake writing it. Every gap
    is filled in T1 unless it needs a rig change (say so in the table). The orchestrator sends Michael the table before
    T1's PR.
Items 17-20 go in slice T1 with 15 and 16. T1 split (orchestrator OK, ~15:45): T1a = items 15-19 + COVERAGE gaps 3-5;
T1b = gaps 1-2 (Joints / Hands & feet / IK / Weapon bake and every rig reads them; move and action rows), taking
exports made before T1b (test with a literal old export).
21. (~15:50) Rig gaps from COVERAGE.md, Michael chose all three: per-finger control, a real clavicle, per-key legs.
    Slice T3 after T1b (rig change: the Blender rig, the voxel / mesh skin, the clip channels, the bake; the co-op wire
    if a pose crosses it).

Goal: quick prototype fixes so Michael can replay bays 1-3 in co-op and continue. No polish beyond the list.

## Order
- **Slice T (tuner, first: Michael is animating now):** items 9 and 10. Its own small PR so it reaches him fast.
  - 9: while the tuner is open with keyboard and mouse, the pointer is free (no pointer lock); a toggle (key + panel
    button) between "game camera" (normal mouse look, panel ignores the mouse until toggled back) and "drag view"
    (left-drag on the scene orbits the camera, wheel zooms, the panel stays clickable). Default drag view.
  - 10: the selected part, bone, weapon or clip is highlighted in the scene (outline or marker on the bone / mesh) and in
    the panel (the row and tab), clear in both light and dark.
  - 11: a "Keyed" tick box on the current state (on: play its keyed clip / loop; off: procedural), instead of finding
    the keyed loop in the Keys tab.
- **Slice T2 (tuner UI redesign, its own PR right after T):** item 12. Readable (larger text and values, contrast),
  decluttered (a compact panel that never covers the character; collapsed groups; only the current part's sliders),
  fewer steps (the part picked by clicking the body or a body map, recent / pinned sliders, search kept), and styled
  like the game's menus (same fonts, colours, focus look). Pad, keyboard and mouse all keep working. Show Michael a
  screenshot of the new layout before the PR.
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
