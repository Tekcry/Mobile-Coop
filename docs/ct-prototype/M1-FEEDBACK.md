# M1 feedback (Michael, 2026-10-18, after playing the /ct/ preview)

Overall: "it's on the right track".

## Michael's words (verbatim)
1. "Camera doesn't automatically adjust/move at all in CT, it's manually controlled."
2. "The characters crouching posture changes when in vicinity of an enemy and sneaking slowly, almost like trying to be
   quieter and moving on tippy toes and over exaggerated balancing."

## What it changes (for the core feel job)
1. Camera: no automatic movement while exploring: no swing toward travel, no lead room, no auto recentre. The player
   moves the camera only with the right stick / mouse. This replaces the "gentle swing toward travel" part of G29 and
   loco M20 Q11 (M2 / P2 item 1 lead room is dropped). Rigid follow of the character stays. Record as a G entry at
   merge.
2. Crouched sneak near enemies: at the slow crouched speeds, when a guard is near, the crouch walk changes to a tense
   variant: on the toes, careful placement, exaggerated balance (arms out / body sway as the footage shows). Check the
   footage catalogue (docs/archive/locomotion/research/ct-footage-catalogue.md) for clips that show it and measure: trigger
   distance or condition (guard nearby, aware or not), which speeds, transition time. Posture work, so it is built on
   Wren. Remotes must show it too (a MoveState flag if it is not derivable from data both ends have).

## Additional note (Michael, 2026-10-18, during round A2.1)
3. "Hips and legs seem to follow the body to prevent clipping or awkward stances when walking in circles or turning etc
   based off ct footage. Must review before making changes"

What it changes: in turns and tight walking circles the hips and legs follow the upper body so the feet never cross or
clip and the stance never looks awkward. Area A1 (body / anim graph). Before any code change, review the CT footage
evidence (docs/archive/locomotion/research/ct-footage-catalogue.md, ct-measure-turns.md) and bring the findings to Michael.
