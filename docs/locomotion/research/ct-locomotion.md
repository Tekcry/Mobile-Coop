# Chaos Theory on-foot locomotion vs Night Shift

Research for PLAY-NOTES Play test 2: P1 (start / stop), P2 (speeds, weight), P3 (turns), P4 (posture), P14 (CT movement overall), P15 (aim camera), P16 (shoulder swap). Written 2026-10-17 by a research subagent. Read-only on code; nothing here is a decision. Traversal and close combat are in `ct-traversal-combat.md`; this file covers ground locomotion, posture, camera and the aim / shoulder system.

## Method and limits

- Web via WebSearch + WebFetch. Fandom (HTTP 402), GameSpot, GameFAQs, PCGamingWiki, WSGF, ModDB, Neoseeker and Grouvee (HTTP 403) could not be fetched. Claims from those come from **search-result snippets only** and are marked (snippet).
- **Best primary source found:** the official CT PC manual on Ubisoft's support CDN (S1). Unlike the ManualsLib copy used in `ct-traversal-combat.md`, its text layer is clean (extracted with `pdftotext`).
- **Second-best source: the original Splinter Cell (2002) UnrealScript** as published in the EnhancedSC patch repo (S2). This is **SC1, not CT**. CT (2005) was built by the same studio on the same engine codebase lineage (inference: same class names, same controls, same mouse-wheel speed system), but CT reworked animation (S4, S5), so SC1 numbers are a **baseline, not CT's values**. Every SC1 number is labelled "SC1". Speed and stance logic that is native C++ (`SetGroundSpeed`, `SetWalkingCameraMode`) is not visible; camera distances live in an ini that is not in the repo.
- SC1 units: 1 Unreal unit ~ 1 cm (inference: the hero is 5'11" / 180 cm in S1; his SC1 collision cylinder is 2 x 87.5 = 175 uu tall). Rotation: 65536 units = 360 deg.
- The GDC 2005 talk "Concepts & Animating [the hero] in Splinter Cell: Chaos Theory" (Eric Bibeau, Gilles Monteil) exists as audio only (S16); its content is unknown here. Listening to it is the best remaining lead.
- No YouTube transcript or frame-by-frame timing was available. **No source gives CT timings in seconds.** Measuring CT footage is the only way to get them.
- One file was downloaded to the scratchpad for text extraction (Game Developer Aug 2005 PDF, media.gdcvault.com, 9.6 MB); it held only a 3ds Max ad mentioning CT.
- "Stated" = a source says it. "Inference" = my reading, flagged.

## Sources

| Key | Source | URL |
| --- | --- | --- |
| S1 | CT PC manual (Ubisoft support CDN, 2005) | http://static9.cdn.ubi.com/customersupportfaqfiles/archived/222401_SCCT0665_PCS_MNL_guts.pdf |
| S2 | SC1 UnrealScript (EnhancedSC repo): `EPlayerController.uc`, `EPawn.uc`, `ESam.uc`, `EchelonGameInfo.uc`, `EPlayerCam.uc` | https://github.com/Joshhhuaaa/EnhancedSC/tree/main/UnrealScript |
| S3 | GameRevolution FAQ (VampireHorde), Xbox "Stealth Controls" | https://www.gamerevolution.com/guides/29920-splinter-cell-chaos-theorysplinter-cell-chaos-theory-splinter-cell-chaos-theory-faq |
| S4 | Game Anim, "Basics: IK and Weight" (21 Oct 2005) | https://www.gameanim.com/2005/10/21/splinter-cell-ik-and-weight/ |
| S5 | 80 Level, "A Look Back at CT's Animations" (2024), citing Thomas Ripoll Kobayashi | https://80.lv/articles/a-look-back-at-tom-clancy-s-splinter-cell-chaos-theory-s-animations/ (post: https://twitter.com/tomrkobayashi/status/1792965074774270462) |
| S6 | Wikipedia, CT | https://en.wikipedia.org/wiki/Tom_Clancy%27s_Splinter_Cell:_Chaos_Theory |
| S7 | Depth of Field, "A Requiem to [the hero]" (2013) | https://depthoffield1.wordpress.com/2013/10/13/a-requiem-to-sam-fisher-the-mechanics-of-splinter-cell-chaos-theory-2005-and-splinter-cell-blacklist-2013/comment-page-1/ |
| S8 | Steam thread "sneaking" | https://steamcommunity.com/app/13570/discussions/0/846945579791873001/ |
| S9 | Steam thread on speed control | https://steamcommunity.com/app/13570/discussions/0/1620599015901837449 |
| S10 | Steam thread on controller vs keyboard | https://steamcommunity.com/app/13570/discussions/0/3835424220128873066 |
| S11 | TechEnclave PC review (2005) | https://techenclave.com/threads/splinter-cell-chaos-theory-pc-review.4838/ |
| S12 | FutureFive review | https://futurefive.co.nz/story/splinter-cell-chaos-theory |
| S13 | GameSpot "First Look" preview, 2004 (snippet) | https://www.gamespot.com/articles/tom-clancys-splinter-cell-chaos-theory-first-look/1100-6116458 |
| S14 | GamesXtreme review (snippet) | https://www.gamesxtreme.com/article/3306/tom-clancys-splinter-cell-chaos-theory-review |
| S15 | Steam (Clandestine) thread comparing CT's camera | https://steamcommunity.com/app/290530/discussions/0/616198900637978599/ |
| S16 | GDC 2005 talk listing / audio | https://gdcvault.com/play/1019947/Concepts-Animating-Sam-Fisher-in , https://archive.org/details/GDC2005Bibeau |
| S17 | WSGF CT FOV guide (snippet) | https://wsgf.org/phpBB3/viewtopic.php?p=37877 |
| S18 | Steam thread "This or Chaos Theory?" (Blacklist forum) | https://steamcommunity.com/app/235600/discussions/0/357286663696698609/ |
| S19 | ResetEra "LTTP: CT and Blacklist" | https://www.resetera.com/threads/lttp-splinter-cell-chaos-theory-and-blacklist.390844/ |
| S20 | Athlon Outdoors, Fred Mastison, "Shoulder Transition with Rifle" | https://athlonoutdoors.com/article/shoulder-transition-with-rifle/ |
| S21 | RECOIL, Dan Brokos, "You Don't Have a Weak Side" | https://www.recoilweb.com/you-dont-have-a-weak-side-129270.html |
| S22 | Gun Digest, pistol transfer to support hand (Mark Redl) | https://gundigest.com/gun-videos/gundigest-tv/video-transferring-your-pistol-to-your-support-hand |
| S23 | ModDB "CT First Person Mod" (snippet) | https://www.moddb.com/games/tom-clancys-splinter-cell-chaos-theory/addons/splinter-cell-chaos-theory-first-person-mod |
| S24 | Grouvee user review (snippet) | https://www.grouvee.com/user/TheKentuckian/reviews/3189326/ |

## 1. Speed control

Stated:
- PC: mouse wheel up = "ZOOM IN / ACCELERATE", wheel down = "ZOOM OUT / DECELERATE" (one control does both: zoom when a zoomable view is up, speed otherwise). There is **no run or sprint key** in the PC default layout: W/A/S/D, Shift jump, C crouch / stand, Q back to wall / switch shoulder, E use / equip. [S1 p.8]
- "Walk/run is handled by the forward/backward movement of the mouse wheel." [S11]
- Controller: speed (and so noise) is set by how far the analog stick is pushed. [S9, S10]
- "Five movement speeds each while crouching or standing." [S7] Consistent with SC1 code: `m_maxSpeedInterval=5`, the wheel steps `m_curWalkSpeed` 1..5, and the stick input is multiplied by `step / 5`. [S2 `EchelonGameInfo.uc`, `EPlayerController.uc` IncSpeed / DecSpeed, PlayerMove] The original SC1 starts at step 1 (slowest) per the patch author's comment `m_defautSpeed=5 // ... Default speed in original game is 1`. [S2]
- Diagonal keys make the hero "much faster" and louder; a player says it is "one notch faster". [S8] (Inference: un-normalised W+D input; the EnhancedSC patch added a "Normalize movement" fix for exactly this in SC1. [S2 PlayerMove])
- Players find the stick finer than the wheel ("wicked subtle with the analog stick" [S8]; "precise movements, not just full throttle" [S10]) and the wheel awkward ("too many moving steps to scroll between" (snippet, S10 search)). One player's working setting: "roll all the way down then up three clicks" for "quiet but quick". [S9]
- Crouching: "Movement is slower, but quieter, and [the hero] is less visible while crouched." [S1 p.9]
- Noise: HUD "Noise meter bar: Indicates how much noise [the hero] is making and how noisy the environment around [the hero] is" [S1 p.13]; the hero must stay quieter than the ambient level [S6]. Speed is the main noise lever [S7, S9].

SC1 baseline numbers (not CT) [S2 `EPlayerController.uc` defaults]:

| Value | uu/s | ~m/s |
| --- | --- | --- |
| `m_speedRun` (standing, top) | 420 | 4.2 |
| `m_speedWalk` | 120 | 1.2 |
| `m_speedRunCr` (crouched, top) | 299 | 3.0 |
| `m_speedWalkCr` | 60 | 0.6 |
| `m_speedWalkFP` / `m_speedWalkFPCr` (aiming, stand / crouch) | 120 / 75 | 1.2 / 0.75 |
| `m_speedWalkSniping` (scoped) | 100 | 1.0 |
| `m_speedBTW` / `m_speedBTWCr` (back to wall) | 130 / 75 | 1.3 / 0.75 |
| `m_RollSpeed` | 350 | 3.5 |
| `m_onGroundAccel` | 2000 uu/s^2 | 20 m/s^2 |

Inference: the crouched top speed (3.0 m/s) is fast; crouch in SC was "slower but quieter", not a crawl. How the five steps map onto walk..run is in native code (not visible).

## 2. Starts, stops and turns

Stated (CT):
- **Stops freeze the stride in place.** Instead of blending to idle or playing a stop clip, CT "combines foot and root-bone IK to hold the current pose". Method: (1) slow or stop the walk / run / sneak cycle on its current frame, at a rate set by momentum; (2) drop any mid-stride foot to the floor by IK, keeping its horizontal position; (3) drop the root so the hero takes his weight, settling into a more comfortable pose, **only in non-duress situations**; the root drop overshoots slightly for "a natural bounce"; (4) when moving again, the cycle resumes from the held frame. Result: "a fully variable, player-defined idle pose ... at any point in a broken stride"; his left hand can stay on his leg as he settles. [S4]
- Same for crouch: "the game freezes the frame of the animation with just a barely visible breathing movement", which gives responsiveness "so you can stop instantly". [S5]
- **Direction changes:** the player can change direction "at any point in a walk or run cycle, whichever foot is down"; rather than wait for the right foot, CT **locks the feet in position and orientation during the weight shift**. The author calls it a stylistic workaround that softens but does not remove the unnatural shift. [S4]
- Feet conform to stairs and ramps by IK while walking and standing. [S4]
- The S4 author's verdict: these details remove floating feet and repetitive idles; realistic characters move away from "twitch gaming and instant response", which suits Splinter Cell. [S4]

SC1 baseline (CT changed the stop, per S4; the rest is likely inherited, inference) [S2]:
- Facing turns toward the stick direction (camera-relative) through a **damped** rotation, not a snap: base 80000 units/s (~440 deg/s) applied as `RotateTowardsRotator(target, 160000, damping 0.5)`, and the rate **falls with speed**: `rot * (1 - v / (4 x runSpeed))`, i.e. 75 % at full run. Velocity is rotated with the body, so a turn carries momentum round rather than braking. [`EPlayerController.uc` `SetPawnRotation`]
- **Body banks into turns:** `RollPawn(speedRatio x turnRatio x 2000)`, up to ~11 deg of roll at full run and full turn rate. [same function]
- **Turning in place is a stepping cycle:** when standing still and the body yaws faster than 10000 units/s (~55 deg/s), SC1 loops a turn-in-place clip (`ATurnRight`, played reversed for left; crouched: `ATurnRightCrouch`) with a 0.05 s blend. Below that rate the idle holds. [`EPawn.uc` `PlayWait`]
- Walk and jog are two **phase-synchronised** cycles blended by speed (`LoopAnim(AWalk)` + `SynchAnim(AJogg, WalkingRatio)`, playback rate scaled by the cycle-length ratio), so every in-between speed has matching feet. Same for crouch walk / crouch jog. [`EPlayerController.uc` `PlayOnGround`]
- A full run to a dead stop plays a short vocal / gear sound. After 7 s at >= 65 % pace standing, a breathing-hard loop starts. [`PlayOnGround`, `PlayerTick`]
- Default pawn yaw speed `YawTurnSpeed=52000` (~286 deg/s). [`EPawn.uc` defaults]

Reversals: no CT source describes a reversal or pivot animation. (Inference: with the S4 foot lock and the damped SC1 turn, a 180 at pace is a quick swing with planted feet, not a dedicated pivot clip.)

## 3. Posture and animation

Stated:
- Driving (locomotion) and idle animations keep the legs **slightly bent** so the IK never hyper-extends them. [S4] This is a knee detail; no source describes a bent-over torso.
- Idle variety: SC1 plays a random special idle only after 60 s without input and never with a weapon in hand. [S2 `EPawn.uc` `ShouldPlaySpecialWait`] CT's player idle is the frozen, breathing stride pose. [S4, S5]
- Head: SC1 turns the hero's head toward where the camera looks, clamped to +-60 deg standing, +-45 deg crouched, and only when the camera is not behind him (dot > -0.4). [S2 `PawnLookAt`]
- Arms near enemies: the hero "slowly moves his hand to his knife" when close to enemies (snippet of a GameSpot user review; URL https://www.gamespot.com/tom-clancys-splinter-cell-chaos-theory/user-reviews/2200-117233/).
- **Weapon carry:** the weapon is drawn on demand: "Use/Equip" (PC E) [S1 p.8, p.11]; Xbox "X BUTTON: EQUIP WEAPON" [S3]. The manual tells you to "Get your weapon out before bashing the door, if needed" [S1 p.11], so the weapon is **not** always out. No source states whether it stays drawn while walking or how the hero holds it at rest. (SC1 holsters on leaving aim mode: `s_Targeting.EndState` calls `SheathWeapon()` [S2]; CT behaviour unconfirmed.)
- Reviews: "Animation is simply superb ... perhaps one of the best skeletal animation to date" [S11]; "weightiness", the hero "moves with purpose" unlike later titles (snippet, S24); "the attention to detail in even the most basic of sam's movements" [S19]; "In Chaos Theory he moves perfectly" vs "a few too many animations when sneaking around in Blacklist" [S18].
- Production: animated in 3ds Max (Autodesk ad, Game Developer Aug 2005). An undated 2007 wiki mirror claims SC (2002) used motion capture for NPCs but hand-animated the hero's complex moves (https://wikipedia2007.classicistranieri.com/s/p/l/Splinter_Cell_3f0d.html); uncited and about SC1, so weak. Animation credits: Gilles Monteil (animation artistic director), Eric Bibeau (animation programmer) (snippet, https://www.mobygames.com/game/20691/tom-clancys-splinter-cell-chaos-theory/credits/windows/).

Not found: any source describing the hero's standing spine angle, arm hang or crouch silhouette in words. Settle it from footage.

## 4. Crouch / stand, roll, jump, landings, falls

Stated:
- Crouch is a toggle key ("Crouch/Stand up", PC C; Xbox B). [S1, S3]
- Roll: "Press and hold the Crouch key while running to do a roll." [S1 p.10] SC1 detail: needs a full push and speed above the crouched-run speed; crouch is held 0.2 s before the roll starts; the roll moves at 3.5 m/s, steers only slightly (15000 units/s, only within 90 deg of facing), and **ends in a crouched jog**, standing up only if crouch is pressed again during the roll. [S2 `s_Roll`, `PlayerMove`]
- Jump: Shift / Y. Mantle = jump while pushing into low objects; jump grabs ledges above the head; split jump in a narrow high corridor. [S1 p.9-10]
- SC1 jump split [S2 `EPawn.uc` jump code]: standing (horizontal speed <= 0.1 m/s) = a vertical jump that zeroes velocity (`AJumpStart`, cannot be started crouched); moving = a forward jump that picks the **left or right lead-foot clip from the current run-cycle phase**; low air control (`AirControl=0.1`).
- SC1 landings [S2 `PlayLanding`]: crouch held = quiet landing (from >= 4 m/s fall speed); fall speed >= 7.5 m/s = hard landing clip that stops the hero; no input = short landing clip; running landing = the jump's last frame is the first run frame, so he runs straight on.
- SC1 fall damage [S2]: damage starts at 12.5 m/s vertical impact (`MinBeforeDamage=1250`) and is linear to death at 15 m/s (`MaxBeforeDeath=1500`); above that the fall-to-death clip and scream play in the air. Inference (g ~ 9.8 m/s^2, gravity not checked): hard landing from ~2.9 m, damage from ~8 m, death from ~11.5 m.
- CT: no fall damage figures found. The manual notes ring-airfoil-hit NPCs "falling from great heights may be killed by the fall". [S1 p.16]
- SC1 crouch / stand is one transition clip (`AWaitCrouchIn`) played forward to crouch and reversed to stand, at 1.2x rate. [S2 `PlayWait`]

## 5. Exploration camera

Stated:
- Default view is third person "looking slightly over your shoulder", with full right-stick control. [S12] "It defaults to a third person view ... never got stuck in a corner." [S11]
- CT's camera "switches sides automatically (and smoothly) depending on your input", moving the hero aside to open the screen in the direction you look; the hero is otherwise "usually close to the center of the screen". [S15]
- Default FOV 75 (`DesiredFOV` / `DefaultFOV`, `[Engine.PlayerController]` in `SplinterCell3User.ini`), Hor+ (75 deg horizontal at 4:3, ~59 deg vertical, inference from the UE2 convention). (snippet, S17)
- SC1 camera [S2 `EPlayerCam.uc`]: separate parameter sets per mode (walking, walking crouched, back to wall, aim, sniping, carry, ...), each with distances per space size (a tight-space "minute" size exists); max yaw speed 40000 units/s (~220 deg/s), pitch 25000 (~137 deg/s), pitch limit +-90 deg; a "reset behind [the hero]" at ~412 deg/s. The distances themselves are in an ini not in the repo.
- No source mentions camera bob in CT. (Inference: none intended; the S4 approach is about stable feet and pose, not camera motion.)

## 6. Aim camera (P15)

Stated:
- Aiming uses an over-the-shoulder view; a mod exists to replace "the over-the-shoulder aiming view" with first person. (snippet, S23)
- "An option to switch the over the shoulder view from right to left has been added." [S11]
- The rifle's sniper attachment = scoped first-person view with zoom on the mouse wheel / left stick; "hold breath" while scoped (Xbox left trigger). Sight magnifications: 1.5x reflex, 1.5x-3.5x scope. [S3, S6] Scope on PC is key 1 (user report, snippet: https://steamcommunity.com/app/13570/discussions/0/1642045003593504692).
- SC1: aiming turns the camera at half speed (`m_turnMul=0.5`); scoped turn rate scales with zoom (`zoom / FOV x 0.25`); the aiming camera is its own mode (`ECM_FirstPerson`, `ECM_FirstPersonCr`, `ECM_Sniping`); moving while aiming is a strafe set (forward / back / left / right blend) at 1.2 m/s standing, 0.75 crouched. [S2 `s_Targeting`, `s_PlayerSniping`, `ESam.uc` ABlendSniping]

Not found: the exact aim-camera offset, distance or transition time in CT. (Inference from the SC1 mode table and the mod description: the aim camera is a separate, tighter shoulder framing with the body following the camera; the transition is a camera-mode blend, length unknown.)

## 7. Shoulder swap (P16)

Stated:
- "While in the Aiming mode, press the Back to Wall key to switch your weapon from one shoulder to another. That way you will be able to aim at any angle." [S1 p.11] Xbox: click the left stick ("SWITCH FROM LEFT TO RIGHT CROSSHAIRS") [S3]; "click in the left thumbstick to switch shoulder" (snippet, S14).
- "[The hero] can move the gun to the other side of his body in a firing position." [S6] The 2004 preview called it a "shoulder switch" that lets you "change which hand is holding your gun on the fly". (snippet, S13)
- It is **manual** (a button, only in aim mode). The exploration camera's side swing is separate and automatic [S15].
- No source describes the swap animation (duration, hand order). Inference: since S6 / S13 say the gun moves to the other side and changes hand, the hero fires the rifle and pistol from the left side mirrored; whether it is a true mirror of the rig or a dedicated transition clip is unknown.

How real shooters do it:
- **Rifle** (S20, Mastison): put the rifle on safe given the amount of motion; push the rifle forward off the strong shoulder; drive the buttstock into the support-side shoulder; strong hand releases the pistol grip and moves forward to the handguard, then the support hand moves back to the pistol grip and takes a firing grip; switching feet at the same time is "not critical" but helps; reverse to return. "Do not try to do this quickly when you first begin." Purpose: expose less of the body round a corner on the support side. Done when your kit lets you run the carbine from either side. [S21]
- **Pistol** (S22): the transfer is a hand-to-hand handoff, keeping the gun-hand fingers, "mainly the thumb", out of the receiving hand's way; the gun stays pointed at the threat. (Detail of the palm-to-palm pressing method is snippet-only.)

## 8. What players praise and criticise

- Praise: the graded speed control ("brilliant in both their immediate simplicity and the complexity they allowed" [S7]); "slow and methodical", "very slow and deliberate movement speed" builds tension [S19]; freedom of movement "far superior" to Conviction / Blacklist, "isn't clunky to control" [S9]; superb animation [S11]; moves "perfectly" [S18]; responsiveness from the frozen pose [S5].
- Criticism: the scroll wheel is hard to use for fine speed ("makes it impossible for me to ghost" [S9]; "couldn't get the hang of the scroll wheel" [S8]); diagonal keys add a notch of speed [S8]; a sensitive stick makes too much noise (S10); keyboard and mouse "feels ... off" [S10]; "some jank from that era", "how [the hero] handles weapons" [S19]; one player preferred Blacklist's movement and gunplay [S19].

## Implications for Night Shift

Current values for reference (`src/config/movement.ts`): six gears, standing caps 0.65-4.15 m/s, crouch 0.42-2.3 m/s; `CT.stopTime` 0.25 s, `stopBlend` 0.12 s; `turnRate` 720 deg/s; roll on a crouch tap at gear >= 5.

- **P1 start / stop ("stop mid animation when walking / crouching, not sprinting").** This is CT's documented technique [S4, S5]: on release, slow the cycle to a stop on its current frame (rate by momentum), IK-drop the swinging foot straight down where it is, then settle the root a little with a small overshoot, and resume the cycle from that frame. S4 limits the settle to "non-duress", which fits Michael's "just not when sprinting": at top pace a short run-stop (or brake) is acceptable, below it the frozen stride. Our 0.12 s blend to idle is the opposite (it is the "blend into idle" CT replaced). Keep the 0.25 s pace stop; change what the pose does.
- **P1 / P4 posture ("stand up straight", "bent over").** No source describes the hero's torso angle in words. S4 only says idle and locomotion keep the **knees** slightly bent. So: upright spine, slight knee flex, no forward torso lean at walk; any lean should be speed-scaled and small. Confirm against footage before tuning.
- **P1 / P4 arms.** CT draws the weapon on demand [S1, S3], so arms-free walking (current M14 N8 "holstered") is CT-correct; relaxed arms with natural swing, not a carry pose. The brief claim that CT keeps the rifle always out is **not** supported by the manual.
- **P2 weight.** CT's weight comes from pose and feet, not slow response: frozen-stride stops with a root settle and overshoot, foot IK on slopes, locked feet during direction changes [S4]. SC1 adds body bank into turns (~11 deg max at run), a turn rate that drops with speed, and momentum carried round turns [S2]. Speeds are fine per Michael; SC1's top run (4.2 m/s) is close to our 4.15.
- **P3 turns ("snap", spinning makes legs "bendy and confused").** CT / SC1 pattern: (a) damped facing turn (SC1 ~440 deg/s base with smoothing; ours is 720 deg/s), slowing with speed; (b) in place, a **looping step-turn clip** whenever yaw rate exceeds ~55 deg/s (mirrored for left), instead of twisting legs by IK; (c) while moving, plant and lock the feet during the weight shift rather than rotating them [S4]. Spinning in circles should play a continuous stepping turn, never a leg twist.
- **P14 overall.** The CT feel = five graded speeds (stick or wheel) with noise tied to pace [S1, S7]; no sprint key (top step is a run); crouch is slower but not a crawl; roll = hold crouch while running, ends crouched [S1, S2]; walk / jog cycles phase-synced across speeds [S2]. Our six gears with a sprint are a superset; whether gear 6 sprint stays is Michael's call.
- **P15 aim camera.** CT aims from a separate over-the-shoulder mode, with a scoped first-person view for the sniper attachment, slower turning while aiming (SC1 half speed) and walk-speed strafing [S2, S11, S23]. A tighter shoulder framing on aim is CT-consistent; exact CT offsets are unsourced, so tune by eye against footage.
- **P16 shoulder swap.** In CT it is a button (back-to-wall key / left-stick click) **only while aiming**, and the gun physically moves to the other side and hand [S1, S6, S13]. A realistic transition per S20: rifle pushed forward off the shoulder, stock driven to the other shoulder, then the hands trade places (firing hand to the handguard, support hand to the grip); pistol per S22: a hand-to-hand handoff with the muzzle held on target. The exploration camera's automatic side swing [S15] is a separate thing and does not move the weapon.
- **Open leads.** The GDC 2005 Bibeau / Monteil talk audio [S16]; frame-by-frame timing of CT footage (stop settle, turn-in-place, roll, shoulder swap) for numbers no text source gives.
