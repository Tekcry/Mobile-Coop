# Playtest 2 (Michael, 2026-10-19, /ct/ at 7e6229d: master merged in, menu and weapons)

Relayed by the main session. Michael wants the gameplay and animation issues fixed before any menu work.

## Michael's notes (verbatim)
- music should start as soon game starts at the press any key to start screen
- can shaders or anything pre-load before starting, so the hero avatar is ready when shown. its a bit jumpy while loading. You can put a load screen at the start if you need to with Night Shift title
- shouldnt be able to return to main menu where it says press any key to start
- is the model on menu actually full hero quality?
- hand clips in idle stance on the magazine on menu
- can we introduce the rifle and pistol to the main menu, with holding and idle poses
- theres a controls menu and settings menu, doing the same thing?
- controls are strange, dpad up and down should be walking speed
- night vision goggle surround looks weird, try similar to CT actuals design without copying it
- aiming down sights has improved but still doesnt match CT actual aiming down site. can you compare directly between them and fine tune. in CT the aiming view doesnt seem to change when crouched either, regardless of weapon
- corner peek still doesnt function correctly, when im strafing left the camera moves as it should when im strafing right, and when im strafing right it moves as is im strafing left. it seems backwards
- make the weapon wheel slightly bigger and refine it so its not just boxes, similar to the reference image but original
- aiming down sights should be less sensitive, like the character is focusing on accuracy over speed. estimated 70% less sensitivity
- bobbing while walking
- lowest walk speed is too slow, i would use speed 2 as the slowest instead
- foot steps are too loud compared to the noise meter, should be much quieter
- back to wall snaps from too far away and the player slides over
- over the shoulder camera always defaults right handed when aiming regardless of previous shoulder used. also follow camera always uses the one view (rh shoulder) and remains consistent regardless of shoulder selected after aiming
- swapping shoulders when aiming the gun flicks up high, looks weird
- holstering weapons looks strange, hand moves up weird with rifle, and pistol floats into position
- pistol aiming looks unnatural
- hanging strafing the hands move too quickly, it doesnt look realistic, hand movements should be wider
- pipe vertical climbing animation while moving is unnatural, it seems partially ok but then legs swing upside down, and the hands look backwards
- climbing up over ledge looks strange, floats over instead of climbing up onto knees
- aiming weapons around seems to tilt at the wrists only which is unnatural, i think the whole upper body should remain tight and in position while aiming similar to the CT reference images. arms are too outstretched also
- legs when walking and running and turning are not right. i think they should remain in line with the body at all times as they currently stick too far away and look weird.
- crouching stance hands look weird, use CT reference videos to fix. same problem legs

## Approved plan (Michael: "Yes, go")
1. Finish PR #9 (station 3 pistol draw, full e2e green); the main session merges it, then brings feature/anim-cleanup
   into master (draw / holster to the real mounts, hand shapes, traversal grips: overlaps groups D and E; do not rework
   those before it lands).
2. Slices, each with an independent check, then a push to ct-movement so Michael can feel it:
   - **A** (now, on this branch; no anim-cleanup files): D-pad up / down = walk speed and speed 2 becomes the slowest;
     ADS sensitivity about 70 % lower; corner peek direction inverted; the chosen shoulder carries into aiming and back
     to the follow camera; no upward flick on a shoulder swap while aiming; back-to-wall snaps from a shorter distance
     with no slide; footsteps much quieter, matched to the noise meter; remove the walking camera bob (bible: no bob).
   - **B+C** (after #9 and anim-cleanup are in master): ADS against the CT footage (aim view unchanged when crouched,
     every weapon; upper body tight, not wrist-only tilting; arms less outstretched; natural pistol aim); legs in line
     with the body walking, running and turning; crouch hands and legs from the CT references.
   - **D+E**: rifle and pistol holstering (check what anim-cleanup fixed); hanging shimmy with wider, slower hands;
     vertical pipe climb (legs swing upside down, hands backwards); ledge climb-up onto the knees, not floating.
   - Later, not now: night-vision goggle surround redesign (operators / Blender), weapon wheel restyle (bigger, not just
     boxes, original), all menu items (music at the title, preload and a Night Shift load screen, title not returnable,
     hero quality check, menu hand clip, rifle and pistol in the menu, controls vs settings menus).
