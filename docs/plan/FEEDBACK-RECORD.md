# Michael's feedback record (from the retired documents)
Owner: the orchestrator. Status: current (a record of Michael's words, not rules; N45, 2026-11-02).

Kept when the old decisions, design bible and level standard were retired. These are his reactions and preferences
from October 2026; they inform design, they do not bind it. Sources (archived): `docs/DECISIONS.md` (G numbers),
`docs/design-bible.md`, `docs/level-design.md`.

## Movement and animation
- "The characters crouching posture changes when in vicinity of an enemy and sneaking slowly, almost like trying to be quieter and moving on tippy toes and over exaggerated balancing." - G160, 2026-10-18
- "I expect prototype animations for all of it, with no clipping and must be believable." - G199, 2026-10-19
- "I would rather you check review all animations against the videos and fine tune as necessary to more accurately replicate the movement system. This system is one of the highlights of the game" - G202, 2026-10-20
- "i played through it and want to focus on fine tuning the animations, they all look weird and unnatural" - G207, 2026-10-20
- "Legs are out too wide, looks like a crab. Elbows also go out too wide when moving quicker. This all translates to crouching too, and crouching idles too quick, and the hand resting on the knee is upside down and not sitting on the knee, looks weird" - G207, 2026-10-20 (bible 5.12)
- "the ct movement is getting worse. Can you ignore CT movement references." - G210, 2026-10-20
- "full speed is too quick, and the leg strides should be further apart with less steps, it's too many steps" - G217, 2026-10-20 (bible 5.12)
- "walking forward on all gears leans too much, it shouldn't lean at all until full speed which should be similar to the lean it has now" - G217, 2026-10-20
- "the legs when walking are too far apart, bring knees and legs in line with the body, I would say almost completely vertical." - G217, 2026-10-20
- "arms go out in front of body when moving, it looks weird like a zombie. Arms should stay parallel the body and swing naturally increase slightly more each time you speed up." - G217, 2026-10-20
- "none of the movement feel weighted, but we will focus on these animations first." - G217, 2026-10-20
- "There is animation issues, almost worse than before. I will wait for the anim tuner to try adjust it first." - G220, 2026-10-20
- "All movements must move naturally with twisting/swaying/balancing hands... The feet also need to get fixed... I want you to do a full pass over all animations and I will fine tune. Pulling any weapons out also should be believable, and there's a random stop animation when taking out the weapons" - G239, 2026-10-22
- "Only fix it if it will result in a more believable, realistic, less rigid run" - G250, 2026-10-22
- "everything else doesn't look convincing" - G264, 2026-10-22
- "Mocap, as captured" - G271, 2026-10-22
- "animations are not great, very wonky and unbelieveable" - G312, 2026-10-23
- "we need to fix all animations anyway, even the normal ones arent good" - G312, 2026-10-23

## Camera and controls
- "Camera doesn't automatically adjust/move at all in CT, it's manually controlled." - G159, 2026-10-18
- "the action menu that shows up requires holding A and selecting which option you would like to proceed with, including returning to game (no action). I want it to be identical." - G198, 2026-10-19
- "The action menu behind guard should only show grab or return, once they are grabbed it can show interrogate (if they have information), and rt or Lt to either knock out or kill, and aim button to aim pistol while holding them. It shouldn't have kill/knock out/carry in the list." - G203, 2026-10-20
- "The guard cannot be let go either, only knocked out. Killed, or used as human shield (aiming pistol)" - G204, 2026-10-20
- "There is no back to game option once the grab is initiated." - G205, 2026-10-20
- "pressing a button while in the weapon menu hovered over the vision mode to cycle between them ... press A ... like a carousel" - G213, 2026-10-20
- "Weapon wheel needs to adjust dynamically based on screen size. Also when is it getting a quick visual Ui pass to make it look better, like the reference." - G220, 2026-10-20

## Look, light and darkness
- "section 1 is ok, better than before at least but not perfect. Its hard to tell, the night vision is so poor. I cant see properly at night, and the bodies are very bright. It needs work to make it look more realistic, and to expand the goggle outline to be less intrusive and show more of the screen, it feels claustrophobic." - G213, 2026-10-20
- "Night vision is good now." - G220, 2026-10-20
- "opaque type of corrugated plastic sheet that allow light in but cant be passed through" - G221, 2026-10-20 (warehouse roof sheets)
- "lit, players cut it, but you can also use mixed zones if it ends up being a better result. In game levels are quite dark and not realistic" - G279, 2026-10-23 (level standard 5.1, 5.5)
- "review lighting also, i think the rules may be too strict and the levels are very dark and unrealistic. there shouldnt always be shadows, the player may have to make shadows (disabling lights etc)." - G295, 2026-10-23
- "not realistic" (his verdict on the lighting) - G312, 2026-10-23
- "nothing should be voxel" - G282, 2026-10-23 (bible 5.16)
- "yes i want to include this system now as its one of the main focus of the game" - G315, 2026-10-23 (character shadows from the nearest lamps)
- "Character shadows and new lighting is a huge improvement. Approve updating lighting throughout maps, however light positioning needs to be improved to prevent all the sharp light bleeding on the walls, the edge of lights should diffuse against walls/floors/etc unless something directly cuts off the light ray, depending on how far away it is. Must be realistic depiction of light." - G316, 2026-10-23
- "Disable returning to original lighting system, focus on only the one new system" - G316, 2026-10-23
- "I want to make sure we emphasis the light/shadow system like chaos theory did, like a showcase no matter where you look" - G316, 2026-10-23
- "Also, there was still guards torches showing through walls/doors, and their torches also need to be diffused and not so sharp." - G316, 2026-10-23
- "How do you know campus design gameplay flow is good, and that there is a realistic amount of light? On the current build the s1 car park is still very dark which is unrealistic, car parks are generally well lit" - G329, 2026-10-25
- "Real-world levels" (his pick for how light levels are set) - G329, 2026-10-25
- "Never" (his pick on dark spots from lights left off) - G367, 2026-10-25 (level standard 5.1)
- "the lights were blinding on epic setting" - G427, 2026-10-26

## Guards and stealth
- "a visible cue of where a cameras vision is ... a red laser grid that is projected onto the surfaces its monitoring possibly" - G222, 2026-10-20
- "Always, faint" (his pick for the camera laser grid) - G222, 2026-10-20
- "Maximum amount of guards allowable. If there are ways to increase this cap (for example moving to webgpu) then let me know and make suggestions." - G254, 2026-10-22
- "also note that right now every guard hears when things break or someone gets shot which is unrealistic. if they are within range they should hear it, depending on whether they are near something noisey, and if they see a guard get killed or find one dead/knocked out they should wake them up (if knocked out), report them dead, and become cautious. the only way to clear the cautious guards should be to eliminate any that are aware of what happened, but if they were knocked out the caution can be limited. if its a broken or distrupted light, one or two people should investigate (if only one is nearby then only one investigates), but they should return back to normal after investigating the light and general vicinity of the light. guards that get alerted should alert other guards, either by voice proximity or radio., but not everyone should be alerted at once. any guards in a highly secure zone should not leave their post or area if they are protecting something of high value or a security door that shouldnt be accessed, but they should still be able to be distracted at least. always want to improve enemy ai in general, making them smarter, work together, flank, use cover to hide and report, they should be smart and tactical, not just rush the player, but any reinforcements must be aggressive." - G299, 2026-10-23
- "I would prefer having as many guards as realistically possible to make it challenging." - G289, 2026-10-24 (level standard 4.9; scale sheet 8)

## Levels and missions
- "make sure the geometry and layout is altered to offer multiple paths to objective and throughout the level. having so many guards in one small area will be difficult to manage, there must be room to maneuver and take them out silently away from others." - G190, 2026-10-19
- "i would like the marlow yard audit to include finalising the map, finishing touches, making sure it flows well, not just simple square rooms with random walls/pipes/ladders in random places for the sake of using." - G272, 2026-10-23
- "im happy to remove the pads in each section that explain things also, we can have the objective list update and keep the players guided throughout the yard" - G277, 2026-10-23
- "make it a believable training facility that reproduces potential real level scenarios. Ensure lighting is sufficient, review the rule if needed. This facility should also be very expensive, and should adopt a design that is luxurious (LED strips, glass panel where an "instructor" can watch you train throughout the course, sliding doors, any suggestions you have, these do not have to be in the level, only giving examples)" - G278, 2026-10-23
- "regarding sector ops, i want to make it larger and with more sections (5 max), accomodate more guards in each section, more security that gradually gets harder, cameras need to have less range (they currently pick the player up well outside of the intended area), should have coop only pathways but still able to complete solo if someone wanted to. doesnt have to keep the same layout or warehouse map. level design must be well flowing, no random lasers or cameras for the sake of having them, why would they be there in that location, what are they protecting, why would there be melee only guards they should all have weapons, guards should interact with eachother and have reason to what they are doing or protecting. must take careful planning and observation to pass." - G295, 2026-10-23 (level standard 4.11)
- "Marlow is a training course and may have different rules to standard mission, ie its heavily guided and must teach the players the basics of coop gameplay." - G292, 2026-10-24
- "Marlow should be very linear, 1 route (until later sections where it teaches multiple objectives/split paths for players to help each other)" - G292, 2026-10-24
- "Objectives must name what and where, but no map, level design must flow naturally towards each objective." - G336, 2026-10-25
- "No maps at all" (his pick on briefing and field-menu maps) - G336, 2026-10-25
- "Marlow can use timed drills, it must force players into situations as a way of training them." - G342, 2026-10-25
- "Objectives can fade in/out in game, must be a short, plain English objective. Can we bind to a button to show temporarily? Should also should up when updating objective" - G343, 2026-10-25
- "Never stuck (Recommended)" (his pick for when a bot route-run passes) - G372, 2026-10-25
- "all are retries in marlow yard, as its a training exercise." - G370, 2026-10-25
- "Only the logical amount required to test the specific movement/game mechanic required. Doesn't necessarily always need a guard." - G376, 2026-10-25
- "Close all side routes, force all sections. Only keep a side route when training against enemies later in the training, same design rules as a campaign mission area" - G388, 2026-10-25
- "marlow yard in particular is an isolated training level which forces training of each individual coop move and coop gameplay, and does not need the same checks" - G392, 2026-10-25
- "All worked, the objectives are a bit confusing. when is the redesign landing? was that the original?" - G427, 2026-10-26
- "fail. seemed like nothing really changed that much. couldnt find the van near the carport, nothing floating or blocking though. not a big fan of the design, you can just sneak around the right hand side straight to the door and take out one guard. you can also walk straight out of the fence and out of the playable area." - G427, 2026-10-26 (Saltmarsh S1)
- "rear window worked, but seems like a poor design. shouldnt have a rear window, and the objective is so close to the spawn. right hand path is too easy to follow straight to door." - G427, 2026-10-26

## Co-op
- "2 player coop campaign only, unable to be completed solo." - G2, 2026-10-17 (bible 1)
- "areas should be well designed training areas designed to replicate real map coop scenarios (all the cool actions that players can do together). The yard must focus heavily on coop gameplay, including those discussed recently eg. timed isolation of lights, cameras, locks, accessing security room to disable cameras, timed jammer exercises, hacking devices in sync, and any other coop "wow thats cool" experience." - G272, 2026-10-23
- "All campaign missions are strictly coop and cannot be completed solo, must have forced coop traversal to proceed (help player climb a wall, throw coop player over a gap to open a locked pathway for the other player, and any suggestions you have)." - G292, 2026-10-24 (level standard 11.10)
- "Any other creative coop ideas" - G293, 2026-10-24 (level standard 11.9)
- "yes players must look exact in everyones games" - G400, 2026-10-25

## Characters and story
- "the operators must NOT look code-built. They must look as detailed and realistic as a modern AAA stealth game character" - G163, 2026-10-15
- "they must hold up when used up close in menu animations" - G163, 2026-10-15
- "fully covered, full stealth gear (fitted balaclava/hood plus goggles). No visible face or skin." - G164, 2026-10-15
- "I am expecting splinter cell inspired models that are original" - G165, 2026-10-15
- "operators can be slightly different sizes, i would prefer realism over fairness. the games focus is mostly coop" - G166, 2026-10-15
- "i do want hero version for the main menu and for any close up shots" - G162, 2026-10-16
- "I want more of a stealth operative design. Wetsuit fitted suit, slim body armour, tactical ammo storage/holsters" - G168, 2026-10-16
- "yes build a2, but create without the guns, they will be in game anyway" - G168, 2026-10-16
- "the goggles shouldn't flip up and down, they should just sit over the forehead, and be over the face when in use" - G169, 2026-10-16
- "the original one looked better but it can't flip up" - G169, 2026-10-16
- "Yes use hero for menu" - G162, 2026-10-18
- "after sector ops. i would prefer clear variety in guards. They can all be male, and larger build than Wren as she is quite small. Different types of guards should look different where needed (some may have armour, some without, some helmets etc), and also need to build additional coop player characters, but would rather fix this after all levels are completed" - G310, 2026-10-23
- "Why do the faces have to be low-detail? I don't think hero style detail but at least half decent" - G320, 2026-10-23
- "Same look always" (his pick: a guard keeps its look after a section restart) - G320, 2026-10-23
- "Update the cinematic. Prototype only at this stage. Must also return to the players view to start the mission once the emp had triggered. Should be a seamless transition." - G433, 2026-10-27

## Weapons and gear
- "any attachments (magazines, knife etc) can't be bent which they currently are. They are rigid and must be reflected that way on the character" - G170, 2026-10-17
- "I'd rather the character holds the gun properly. Make sure they line up and are believable at minimum. Stance must look believable also." - G177, 2026-10-19
- "adjust how the rifle is holstered so it makes logical sense how the character can equip it quickly and holster quickly, it's just floating" - G178, 2026-10-19
- "Holding weapons and holstering should at least look believable but only prototype quick run" - G178, 2026-10-19
- "Research what is believable and realistic" - G243, 2026-10-22 (bible 5.6 draw timings)

## Sound and music
- "Dark orchestral" with the note "Will review this as music progresses. No firm decision has been made." - AUDIO-03 in `docs/DECISIONS.md`; bible 5.2 S8 and Section 11 (undated)
- "Investigation Piano" (intro) and "Suspense Thriller" (mission) - G430, 2026-10-26 (his picks for the piano escape scene; bible 5.8)

## Other
- "I want the game to be pure chaos theory. Anything that isn't a part of the original chaos theory shouldn't exist." - G1, 2026-10-17 (bible 1)
- "We must get a working prototype working, only the basics required to make it work and functional to test features and gameplay. I don't want to spend hours or days fine tuning things that may not be used. Refinement can come later." - G4, 2026-10-17 (bible 1)
- "to be reviewed. currently when starting maps the level slowly builds while in game at the start, requires work to ensure map is fully loaded." - G394, 2026-10-25
- "i still dont know if the gameplay is solid yet, and you are spending a long time testing things that may not be used. remember that this still hasnt had a proper walkthrough / gameplay session with people." - G421, 2026-10-26
- "definitely keep in mind that this is all a prototype, and cannot get bogged down with fine tuning or re-running tests constantly." - G422, 2026-10-26
