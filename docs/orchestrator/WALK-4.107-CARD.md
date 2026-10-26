# Walk card: 4.106.0 + 4.107.0 (10 minutes)

Check the bottom of the main menu reads **v4.107.0** (or newer) before you start. Riskiest first.

1. **Guard rules** (Guard AI, on for everyone)
   - On Realistic and Perfectionist every guard wears a helmet from the start; on Rookie and Normal they get one at the second alarm. Riot shields only lead in Saltmarsh Park sections 4 and 5. Dogs can't be taken down (gas still works); killing a dog counts as a kill.
   - Menu: Sector Ops > Saltmarsh Park > set Difficulty to Realistic > Start. Then again on Normal.
   - Pass if guards wear helmets from the first second on Realistic but not on Normal, and section 1 sends no riot shields.
2. **Objective pop-up, objective list and Notes** (on for everyone, co-op too)
   - Tap View (pad) or O (keyboard) to see the current objective for a few seconds; it also pops up when the objective changes. The pause menu now has a full objective list and a Notes page of what guards told you.
   - Menu: Sector Ops > Saltmarsh Park > Start. In the match tap O / View, then Pause > Objectives, then interrogate a guard and open Pause > Notes.
   - Pass if the pop-up shows and fades, the list is right on both screens in co-op, and Notes shows the guard's line.
3. **Stars, Perfect and the main menu** (Sector Ops, on)
   - Clearing on a harder difficulty also fills the easier stars. No kills and no alarm shows PERFECT at the end. The stars beside Sector Ops on the main menu are Saltmarsh Park's.
   - Menu: Main menu > Sector Ops (look at the stars), then finish a section with no kills and no alarm.
   - Pass if the result line says PERFECT and the stars on the menu match your clears.
4. **Doors and lamp light** (lighting, on)
   - A door now blocks lamp light until it is past 15% open (was 5%). Only the first split second of an open or close looks different.
   - Menu: any Sector Ops match; open a door into a lit room from a dark one.
   - Pass if light spills through only once the door is clearly open, with no flicker.
5. **Mixamo moves on Wren** (animation, off in matches)
   - New Mixamo clips: ledge hang, shimmy left / right, ladder top-out, standing idle, crouched walk, crouch down and stand up. Ladder climb, lip climb-ups and vent crawl stay hand-made for now.
   - Menu: Settings > Graphics > Developer > Anim Studio (dev), then pick each Mixamo clip in the Loop list. In a match they need the Hand-made / CMU / Mixamo toggle, which is not out yet.
   - Pass if hands stay on the ledge in the hang and shimmy, and crouch down / stand up don't jerk (known risk: they pop more than the hand-made ones).
   - Look video: none yet (both PRs say pending until the toggle ships).

Nothing to walk yet: Saltmarsh Park lamp light shipped pre-built (off, no menu switch; on after the Sector Ops and Marlow Yard walks).

New unwalked switched-on features from these releases (all went on as fixes to shipped features, allowed at the cap):
- Player / animation: 0 (Mixamo is off in matches)
- Marlow Yard: 0
- Sector Ops: 1 (stars and Perfect)
- Guard AI: 1 (guard rules)
- Lighting: 1 (door light line)
- Outside these areas: 1 (objective pop-up, list and Notes, Campaign)

No walk needed: Marlow test fix (door flake), train build fixes (4.106.1), tests and docs.
