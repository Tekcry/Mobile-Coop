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
**Bays in the cloud (Michael, ~16:30, chose "Bays in cloud").** Slices B (items 1, 2, 6) and M (items 3, 4) run in a
cloud session on this branch, `feature/marlow-bays` (merge origin/master first), alongside the animation tracks. Cloud
rules: unit tests and logic e2e only (e2e-coop, e2e-netmove, e2e-ctcourse, e2e-menus, e2e-sectorops); every GPU or
visual check (item 6's red lines and surround, the bay looks) is "pending PC run". Do not touch the animation tracks'
files (below). A co-op protocol change bumps PROTOCOL_VERSION past 25. Slice J (jammer, items 5, 7, 8) stays for a
local session later. One PR for B + M; the full e2e and the GPU look run on the PCs before the merge.

**Slice J on the laptop (Michael, ~17:50, "Yes").** Character Build (laptop) builds slice J (items 5, 7, 8: the bay 3
hallway, the jammer rules and buzz, the light flicker) between test requests; test runs always come first. Own branch
`feature/marlow-jammer` from master in `C:/NightShift/Mobile-Coop-marlow-jammer` (the cloud session holds
`feature/marlow-bays`). Laptop: logic e2e only; the bay 3 GPU look runs on the desktop before the merge. Protocol: the
jam state crosses the wire, so PROTOCOL_VERSION goes past 25; if the cloud B + M PR also bumps it, whichever merges
second takes the next number. Own PR; one checker, one fix round.

**Bay 3 floor lines (Michael, ~18:30):** "Don't show the red lines painted on the floor, that's the point of the red
laser overlay to show the cameras view area." Remove the painted sweep-edge lines (course spec M2's floor marking) in
slice J; the camera cue grid alone shows the view. Update the course spec line.

**Tracks (Michael, ~16:10: "is there anything we can do to split sessions to focus heavily on the animation work?";
chose three tracks, bays wait).** Three sessions at once, one owner per file area, the orchestrator merges A, B, C in
that order; the laptop tests all three:
- A - Course Ready Build: T1a (items 15-19, COVERAGE gaps 3-5 and the studio loops / weapon pick; gap 3 was already
  built there at 06dd5659: `src/anim/tuneRows.ts` ROW_ALIASES, the v2 tuner store with v1 migration, the split rows) on
  `feature/marlow-tuner-t1`, then T2. Owns `src/ui/tuner*`, `src/ui/studio*`, `src/anim/studio.ts`, `src/anim/tuneKeys*`,
  `scripts/anim-keys/*`.
- B - CT Core Build: T1b (COVERAGE gaps 1 and 2; gap 3 stays in A (16:20), so B builds on A's `tuneRows.ts` and v2
  store: reset `feature/anim-joints` to `origin/feature/marlow-tuner-t1` before the first commit, merge master once A
  lands; the split rows listed below are A's. Joints / Hands & feet / IK / Weapon bake into a generated base
  table every rig reads, the partner included; tables keyed by row id with move and action rows; split rows for
  crouched wall, crouch run, aim still, holds vs carries, rifle vs pistol) on `feature/anim-joints` in
  `C:/NightShift/Mobile-Coop-anim-joints`, from master 4.35.0. Owns `src/anim/tuneJoints*`, `src/anim/tuneV2Sections.ts`,
  `src/anim/tuneBake*`, `scripts/anim-tune-bake.mjs`, the row plumbing in `src/anim/animGraph.ts` and
  `src/player/*`. Exports made before T1b must bake (test with a literal old export). New rows register through the
  tuner registry, so A's panel shows them with no UI change.
- C - Menu Notes Build: T3 (item 21) on `feature/anim-skeleton` in `C:/NightShift/Mobile-Coop-anim-skeleton`, from master 4.35.0.
  Prototype first: the rig change in Blender (`-b` only), one test clip, a screenshot to the orchestrator before the
  full build. Owns the rig, the skin, `src/anim/clips/*`, `scripts/anim-keys/build*` (shared with A: A adds key fields,
  C adds clip channels; C rebases on A's merge). Merges after A and B.
- Cross-track rule: a change outside your area goes to that area's owner through the orchestrator.

22-25. (~17:30) Michael asked "Are any of these cheap/fast additions?" about what the tuner cannot do, and chose all four:
    22. Gear offsets (track B, after J2): sliders that move worn gear (holster, pouches, sling, the gun on her back,
        goggles) per socket, per state where useful, baked into the base table; the partner sees them. Fixes clipping
        without a model change.
    23. Key timing (track A, after T2): slide a key earlier / later in its clip (its phase), preview live, the bake
        writes the key file and rebakes the clip.
    24. Guard tuning (track A since ~22:20, Michael's pick; was track B): a guard target in the tuner and studio (a guard puppet) with its own rows
        (Joints, Weight, Stepping where guards use them), baked into a guard base table; Wren rows never touch guards.
    25. Add / delete keys (track A, after 23): insert a key between two (copying the blended pose) or remove one;
        mirrored clips keep their mirror; the bake rewrites the key file and the clip. Track C rebases its key-field
        work on 23 and 25.

26. (~19:00) "Is it difficult to do a fast ui adjustment for phones only? Touch input and controller will be used."
    (screenshot: the tuner on a phone in landscape, the F3 readout covering the left half, the panel crowding the
    right). Chose "Yes, tuner only": an exception to M21 (phones dropped) for the animation tuner and Anim Studio only;
    the game stays desktop-only. Track A, right after T2 (#86) merges, ahead of item 23 (park it): a phone layout
    (bottom sheet or collapsible drawer, touch targets >= 44 px, she stays in view), the debug readout off by default
    on phones with a toggle, touch camera (one-finger drag orbits, pinch zooms, two-finger drag pans), pad as today.
    Logic e2e at a phone viewport (touch emulation); a phone-size screenshot to the orchestrator before the PR.

27. (~19:30) "There should also be a way to rejoin a match you have left. The code should be displayed in the host and
    joiners session main menu in case either person gets disconnected so they can rejoin." Slice R (Bays Cloud, own
    PR from this branch after master 4.38.0). Assumed: R1 the room code shows in the pause menu and on the main menu
    for both players while a match is live or was left in the last 10 minutes ("Rejoin <code>" item on the main menu,
    one press); R2 a joiner who drops or leaves keeps its slot: the host holds its player (frozen, invulnerable, a
    "Reconnecting..." tag) for 10 minutes and a rejoin restores position, health, loadout and team state; R3 if the host
    drops, the joiner sees "Host disconnected - waiting (code)" and the host's main menu offers "Resume hosting <code>",
    which reopens the same room and restarts from the last checkpoint with the joiner rejoining on the code; R4 no new
    server: the same Trystero / Nostr room. Logic e2e via localTransport (drop and rejoin both sides).

28. (~19:50) Server browser, low priority, spare capacity only. Michael: "Yes add it to the pipeline. It can proceed as
    low priority whenever there is spare capacity. Must be prototype only, quick and fast to build." (No quick match:
    "Doesn't need to be a quick match option.") Slice S (Bays Cloud, after slice R): a Public / Private switch in the
    host lobby (default Private); a public room posts a notice (code, map, version, players) on the same Nostr relays,
    refreshed every ~30 s with an expiry, removed when full or closed; a "Browse rooms" list in the co-op menu (other
    versions hidden, live refresh, pad and keyboard / mouse) that joins by the code as today. No TURN relay, no
    server. Prototype only: a fake relay for unit and logic e2e, one real-relay check on the PC later. Own PR.

26b. (~20:10) Phone layout feedback on the 844x390 / 390x844 shots: "Smaller buttons, more compact. Adjust smaller with
    controller connected also". Touch: smaller targets (about 32-36 px, text 12-13 px), tighter rows and padding,
    the panel narrower (landscape about 38% wide, portrait about 45% high) so more of her shows and more sliders fit on
    the first screen. With a pad connected (the last input a pad), smaller again (no touch target minimum: about 26 px
    rows, 11-12 px text), since nothing is tapped. Switches live with the input device. Screenshots of both, at both
    orientations, before the PR.

29. (~22:45) Tuner v3, simpler (track A, FIRST: ahead of item 24). Michael, verbatim: "I've had instances with the
    controller where I couldn't access the state menu, it was jogging and I couldn't change it to walking, it kept
    closing the menu when I tried going up. The controller layout is slow, difficult, and not intuitive. I would like to
    scroll the menus with an analogue stick, and easily swap between adjusting camera and adjusting sliders. The body
    part diagram is useless and using d pad for menu usage is very loud clicking constantly. Can we make the Ui more
    minimalistic and easier to navigate with keyboard/mouse, controller, and touch? Its very confusing. Everything needs
    to be simpler. The body part highlight is too distracting and blocks the animation, it needs to be more subtle and
    have an option to be disabled entirely. I also need to be able to control the game with touch input (menu, control
    camera)." Touch scope chosen: "Menus + camera" (tap every menu and the pause menu, drag to look; no touch movement
    or combat).
    Direction (prototype first, screenshots and a written pad map to Michael before the full build):
    - Bug first: the pad's state drop-down closes on Up instead of moving (jog -> walk impossible). Fix and test.
    - Minimal panel: one column, top to bottom: tab, one "what" row (part / state / weapon as plain drop-downs, no body
      map), the sliders; everything else (search, pins, presets, playback extras) under one "More". Remove the body map.
    - Pad: left stick scrolls the list (analogue, repeat speeds up when held), left stick left / right changes the value
      (hold accelerates), A opens / picks, B backs out, LB / RB tabs, right stick always moves the camera (no mode
      switch), triggers zoom, View hands the pad to the game. D-pad still works but is optional. No UI click sound in
      the tuner (or a quiet one, with an off switch).
    - Keyboard / mouse: wheel scrolls, arrows move, click and drag sliders, right-drag or middle-drag moves the camera
      while the panel stays usable.
    - Touch: tap, drag sliders, swipe to scroll the panel, the camera gestures from item 26.
    - Highlight: subtle (a thin outline or small dot on the joint, no ring over her), with an off switch.
    - Game touch (outside the tuner): every menu and the pause menu tappable; a drag on the game view looks around;
      an on-screen pause button. No touch movement (M21 stays for play).
    - (~22:55) "The interface should be consistent between touch, controller, and k&m. It should only adapt to different
      screen sizes to ensure it fits properly on smaller screens. Search and recently used etc seems useless to me and
      takes up valuable interface room." So: one layout for every input (item 26b's pad-only density mode goes; input
      changes only the hint glyphs); only screen size changes the layout (dock vs drawer / sheet, scale). Search,
      recent and pinned sliders are removed, not moved under More.
    - (~23:25, iPad, screenshot `michael-ipad-2026-10-21.png`, 4.42.0): "iPad display strange ui fitment, blurred top,
      empty gap on bottom. Would love to be able to pinch, move, and zoom camera with touch" and "When opening sections
      for body parts that need to be scrolled to, the window automatically scrolls back to top". So: respect the safe
      areas (`env(safe-area-inset-*)`: the panel top sat under the iPad status bar and looked faded); size to the real
      visible height (`100dvh` / visualViewport, no gap at the bottom); touch camera gestures (one finger orbit, pinch
      zoom, two-finger pan) in EVERY layout, not only the phone one; the F3 readout off by default on touch devices;
      opening or folding a group keeps the scroll position (no jump to the top), and a newly opened group scrolls into
      view. Test at iPad sizes (1180x820, 820x1180) as well as phone and desktop.

30. (~01:20) Faster key editing. Michael: "I was adjusting the body to twist realistically while running but I had to
    adjust each key manually." Chose all but the curve view: "Proceed with all but the curve view."
    - Track A (after tuner v3): (a) Wave tool: pick a channel, set amount and timing (phase), and it fills every key with
      a smooth sine over the cycle; the mirrored half flips sign as the mirror rule says. (b) Apply to keys: one change
      applied to all keys or the ticked ones. (c) Smooth between: pick two keys, and the keys between get an eased
      blend. (d) Compare keys: a ghost of the previous (or a picked) key over the current one, plus a values diff line.
    - Track C (with or after S4, keyed.ts is C's): (e) Exact preview: the live preview samples the same Bezier curve as
      the Blender bake, so the in-betweens don't shift after a rebake.
    Each one bakes through the existing keys path; each its own small PR, or A's four in one.

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
