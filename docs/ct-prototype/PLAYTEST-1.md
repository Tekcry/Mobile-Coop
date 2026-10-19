# Playtest 1 (Michael, 2026-10-18, /ct/ at d69ba04)

Michael's verdicts and notes from the playtest checklist (artifact RA6bgQpeq1xALCXLviRLNp, db `notes`), verbatim.
Empty note = verdict only.

## Camera and aim (A2.1)
- cam-1 good. Walk, run, stop: camera never moves by itself.
- cam-2 off: "Should shift towards the right hand shoulder slightly, too centered"
- cam-3 off: "Not similar to CT, too high and not over shoulder enough."
- cam-4 good (release aim).
- cam-5 off: "Ok, gun doesnt change shoulder, and aiming view doesnt match CT, poor angle."
- cam-6 off: "Rifle and pistol take way too long to take out, too slow. Holster seems normal."
- cam-7 good: "Smooth" (stairs).
- cam-8 good: "Wall didn't show through, just hides character"
- general: "Not quite CT pure when aiming. Review whether aiming is toggled and slow/precise as per CT"

## Turn follow (A1.1)
- turn-1 off: "Legs and feet cross over, not working, legs should follow body to prevent issue"
- turn-2 off: "Same as above"
- turn-3 off: "Smooth turn but legs go backwards, too slow."
- turn-4 off: "Legs backwards again."
- turn-5 off: "Legs don't follow body, very unnatural"
- turn-6 off: "Legs cross over and are very unnatural"
- turn-7 off: "They're ok but move weird/unnatural in general" (guards)
- general: "Not CT pure as per footage."

## Pad, wall, doors (A3)
- pad-1 off: "Weapon aim is normally toggle, and changing weapon is difficult"
- pad-2 off: "Speed should be up and down, vision should use either left or right. NV is usually first also."
- wall-1 good. wall-4 good.
- wall-2 off: "Too slow, feels like it should be 50% faster."
- wall-3 off: "Camera moves out wrong, doesn't move out enough to look around corner."
- door-1 off: "Poor design, shouldn't be on middle of screen. Should be offset to top right"
- door-2 off: "Needs stick driven work"
- door-3 good: "Worked"
- door-4 off: "Yes one guard closed his own door, didn't notice me open one in cautious level."

## Strike and grab (A4)
- strike-1 off: "Inconsistent, feels unnatural and also works when no guard is nearby."
- strike-2 off: "Too slow"
- strike-3 off: "Slow"
- strike-4 good (RT holstered is right).
- grab-1 off: "Same as door complaint, menu poor location, also should be able to walk around with the guard and select using the menu also. I got stuck in the menu."
- grab-2 off: "Same as above."
- grab-3 good: "Works well, needs animations eventually."
- grab-4 off: "Worked but missing walking aiming etc."

## Goggles (A5)
- gog-1 off: "There is a flip animation in CT, as per fix in v3, swapping between modes doesn't cause flip, only turning on/off. There is a slight round outline of a goggle lense also in ct."
- gog-2 off: "Not like CT, needs review against CT screenshots."
- gog-3 off: "Doesn't work" (door silhouette)
- gog-4 off: "Electro works but should be more fuzzy/interference on electrical items. Night vision needs work, review CT style."
- gog-5 skip, gog-6 skip.

## Menus (merged)
- menu-1 good: "Good, brightness menu overlaps main menu, quit to menu also overlaps."
- menu-2 good: "Works, but not sure if it's CT layout. Doesn't seem to be."
- menu-3 off: "Remove if not needed, couldn't verify"

## Course (B1)
- course-2: "P1 couldn't read the panels, p2 worked. Stuck and couldn't move on. Also why are we reading panels??? We should be doing actions instead, or one panel at the start of each area telling us what to do."

## Co-op parity
- coop-1 good, coop-2 good, coop-3 good, coop-4 skip.

## Michael's answers to the follow-up questions (native multiple choice)
- D-pad vision side: "research how it was mapped in CT" (speed moves to D-pad up / down per pad-2).
- Draw speed: "About half (0.3 / 0.4 s)" (pistol about 0.3 s, rifle about 0.4 s; holster unchanged). Replaces G103's
  raise timings for the prototype.
- Course panels: "One panel per station" (a single optional panel at each station; the action opens the way).
- Vision reference: "Use the footage docs".

## Plan
- Fix round F1 after B2 lands (one code-changing agent at a time): camera, aim toggle, wall, menus top right, grab
  walk / aim, strike, doors, goggles, course panels, D-pad per the CT research.
- Turn follow failed twice: goes to an Opus implementer with the footage (RULES: Opus for anything stuck twice).
- Menu overlaps (menu-1) and the dead settings rows (menu-3) go to the menu job.
- After CT-CONTROLS.md: speed "D-pad up / down too"; goggles "incorporate blacklist style menu that allows selection of
  weapons, gadgets, and vision mode. Single button only toggles that one vision selected."; aim "Yes, CT scheme".
  Assumed (feel A1): the menu opens on LB hold, the vision toggle is D-pad left.
