# anim-natural N0 - naturalness audit of Wren's animations

Branch `feature/anim-natural` at master 4.48.0 (ea3399ed). Read-only: no game code changed. Our animation only (no
reference footage traced). Row list: `feature/marlow-bays:docs/marlow-bays/COVERAGE.md` (80 rows).
Pass 1 (2026-10-22, desktop GPU, 10:05-10:26): summary, ranked fix list, per-row table for the rows captured; the rows
marked "not captured" need a second pass (list at the end).

Evidence: `docs/anim-natural/audit/<row>.webp` (GPU contact sheets, `E2E_GPU=1`, `?gfx=high`, Wren LOD0) and
`docs/anim-natural/audit/metrics.json` (numbers per row: `studio:<row>` and `proving:<row>`), both written by
`scripts/anim-natural/audit.mjs` (`studio`: Anim Studio loops on the spot, stage light, front 3/4; `proving`: scripted
input on Proving Grounds / Warehouse, 60 Hz headless steps, every step sampled). Turns also have a top-down foot plot
`<row>-top.webp` (heel to toe every 1/60 s, thick = planted, red dot = the turn input).

How the numbers read (all in the root frame, ranges are peak to peak over the capture):
- trunk: pelvis yaw range, shoulder-line yaw range, their twist range (deg); `counterCorr` -1 = pelvis and shoulders
  turn opposite (counter-rotation), +1 = they turn as one block.
- sway: pelvis lateral / vertical range (cm), head yaw / pitch range (deg).
- hands: wrist forward range (cm), peak wrist speed (m/s; above ~6 m/s in a gait is a pop or a whip).
- feet (Proving only; on the studio's treadmill a planted foot moves with the floor): the most a planted heel or toe
  moved in one plant (cm; standard < 1), the most a planted foot is turned from the pelvis (deg, the leg wind-up).
- gun: the held gun model's world speed per frame and its muzzle pitch (deg, + up): a stall = speed under 0.1 m/s
  between two moving spans.

Caveats: the Proving sheets are dark silhouettes (pass 2 found this is not back-lighting: her suit renders near-black in
the daylight maps from the sun side too; pass 2 sheets add an audit-only key light on her, and pass 1's `fixed` turn
camera stood ~15 m off, now fixed); the studio sheets are lit by the stage light. GPU visual reads are from Michael's desktop. Not run: e2e-anim's
CRAB table and anim-audit (logic numbers already in `docs/anim-rework/METRICS.md`).

## 1. Summary for Michael (worst first)

1. Jog / run turns: the body snaps 90 deg in 0.18 s (~500 deg/s) while the planted foot stays put; the pelvis lags
   up to 50 deg behind, the planted foot winds up to 25 deg against the pelvis and scrubs 4-9 cm on the floor (limit 1).
   That is the "legs sticking when turning". Same at walk / crouch turns, smaller (10-13 deg, 5-7 cm).
2. The draw's "random stop" is real and measured: the X (low ready) draw flicks the rifle off the back muzzle-down,
   muzzle-up and level in 3-4 frames (gun at 10-11 m/s: a pop), then holds it level at the shoulder for ~0.15 s,
   then drops it to low ready. The pistol does the same (level hold ~0.18 s, then drops). Cause: the swap clip's
   draw ends at a "pocket" key and holds it, then the low ready takes over.
3. The trunk barely moves in any gait: pelvis 3-5 deg and shoulders 3-7 deg peak to peak (a real walk is about
   8-12 / 7-10, a run 15-25 / 25-35); run reads the same as jog. This is the "stiff, robotic" look.
4. The head is locked to the camera: 0.0 deg yaw and pitch change in every gait. It reads as a camera on a stick.
5. Arms: the walk's hands hang almost still; the jog / run / back / sprint all swing the same ~21 cm. In turns
   the wrists whip at 13-16 m/s, and 22 m/s in the strafe (pops).
6. Weight shift is capped: pelvis side sway 1.6-1.8 cm in every gait (a walk is ~4-5 cm) by an old 3 cm limit.
7. Drawn stances are statues: low ready, aim and crouch aim standing show 0-0.4 deg trunk motion over 6 s (no
   breathing, no shift).
8. Swaps and draws to aim end in a hard stop or a one-frame jump (swap: 12 cm in one frame at the hand-off).
9. Holds and carries move the trunk as one block (pelvis and shoulders together, corr +0.85 / +0.95) and the
   carried / lifting feet slide 9-21 cm.
10. Pass 2 (`PASS2.md`): the hit flinch is invisible (0.9 deg) and firing kicks nothing (0 deg, 1.4 cm); co-op holders
    are statues with their hands off their partner; the mantle has no hand plant and the 2.6 m drop no air pose; the
    roll is an airborne somersault; the aimed turn on the spot swivels planted feet 51 deg.

## 2. Ranked fix list

Slices: N1 feet (CT Core, `src/anim/footPlanner.ts`, `turnFollow.ts`, `tuneStep.ts`), N2 body motion layer (CT Core,
`src/anim/animGraph.ts`, `clips/locomotion.ts`, `player/characterRig.ts` head / trunk), N3 weapons (Menu Notes,
`src/anim/clips/actions.ts` swap / draw keys, `src/weapons/playerWeapons.ts`, `drawState.ts`, `weaponCarry.ts`),
N4 the rest (owner per area: walls `src/anim/wallKeyed.ts`; close quarters `src/game/closeQuarters.ts`; traversal
`src/anim/clips/traverse.ts`; actions `clips/actions.ts`).

| # | Row (COVERAGE #) | What is wrong | Evidence | Fix (one line) | Slice |
| --- | --- | --- | --- | --- | --- |
| 1 | Run / jog turns (7) | Root yaw 90 deg in 0.18 s; pelvis lags to 50 deg (twist range 102 deg at run); planted foot wound up 19-25 deg and scrubbed 4.3-8.8 cm; stance splays wide at the corner | `turn90-run(-top)`, `turn180-run`, `turn90-jog(-top)`, `turn180-jog`; metrics `turn.*` | Turn-step rule: yaw rate x remaining stance or accumulated twist over ~15 deg lifts the planted foot early (pivot on the ball, heel up, then lift); the next landing aims along the new heading | N1 |
| 2 | Weapon draw to low ready, rifle (28) | Gun pops off the back (muzzle -52 -> +87 -> 0 deg in 3 frames, 10-11 m/s), holds level at the shoulder 0.12-0.15 s, then drops to low ready over 0.18 s; support hand joins late | `draw-lowready-rifle`; `gun.speeds` / `gun.pitch` | Draw straight to the wanted end pose (low ready when not aiming): one arc from the slot, ease-out settle; remove the back-pocket hold (`travelKeys` holds `backPocket` from 0.65 to 1.0 of the swap clip) | N3 |
| 3 | Weapon draw to low ready, pistol (28) | Rises smoothly, stops dead (3.96 -> 0.06 m/s in a frame), holds level 0.18 s, then drops 53 deg to low ready | `draw-lowready-pistol` | Same as 2 (the pocket key at 0.8 held to 1.0 is the hold) | N3 |
| 4 | Walk / jog / run trunk (2-4) | Pelvis yaw 3 / 5 / 5 deg, shoulders 3 / 7 / 7 deg peak to peak; run = jog exactly | `walk`, `jog`, `run`; `trunk.*` | Phase-locked layer: pelvis yaw +-4 / 7 / 10 deg and shoulders against it +-4 / 9 / 14 deg by speed, chest twists against the swinging arm; tuner sliders per state | N2 |
| 5 | Head in every gait (1-13, 16-23) | Head yaw and pitch range 0.0 deg (world-stabilised 0.98 in `characterRig` head) | every gait row `sway.headYawRange` | Stabilise pitch / translation but let ~30-50 % of the shoulder yaw and a 1-2 deg nod through; slider | N2 |
| 6 | Arm swing (2-5, 16) | Walk hands nearly still (sheet); wrist forward range ~21-23 cm in walk, jog, back and sprint alike (no speed scale) | `walk`, `back`, `sprint`, `curve-jog` | Swing amplitude by speed (walk ~30 cm, jog ~45, run pump), elbow flex by speed, the off phase of the shoulders | N2 |
| 7 | Arm whip in turns / strafe (6, 7) | Wrist peaks 13-16 m/s in 180 deg turns, 14.7 at a run 90, 22 m/s in the strafe | `turn180-jog`, `turn90-run`, `strafe`; `hands.wristSpeedMax` | Arm targets in the pelvis frame with a rate limit / inertialised swing phase through turns and gait swaps | N2 |
| 8 | Weight shift (2-13) | Pelvis lateral range 1.6-1.8 cm everywhere (`SWAY_MAX` 1.15 cm x 1.2) | every gait `sway.pelvisLatCm` | Sway over the support foot ~4-5 cm walk, 2-3 cm run; needs Michael's OK to lift the old 3 cm D2 cap (assumed: raise it) | N2 |
| 9 | Walk / crouch turns (7, 13) | Planted foot scrub 5.3-6.8 cm, wind-up 10-13 deg | `turn90-walk(-top)`, `crouch-turn90(-top)` | Same turn-step rule as 1 at walking cadence; pivot about the ball not the heel | N1 |
| 10 | Swap (28) | One-frame jump at the hand-off to aim (7.4 m/s = 12 cm in a frame); the raise lowers to 0 for the swap (blocked by design) and the gun is re-raised after | `swap-drawn` | Blend the swap end into the aim raise through the inertializer; no raise reset | N3 |
| 11 | Draw to aim, rifle / pistol (28, 17-18) | Rifle: a hitch at 0.13 s (1.3 -> 0.2 m/s) then muzzle swings -88 -> 0 deg in ~0.15 s; pistol arrives with a dead stop (4.9 -> 0.1 m/s) | `draw-rifle`, `draw-pistol` | Continuous reach -> grip -> lift -> settle with an ease-out and a 1-2 cm settle; no hitch at the grip | N3 |
| 12 | Drawn stances still (14, 15, 17, 18, 22) | 0-0.4 deg trunk motion, 0-0.1 cm pelvis motion over 5-6 s: a statue | `low-ready-rifle`, `low-ready-pistol`, `aim-still-*`, `crouch-aim-still` | Breathing (chest 0.5-1 deg), a slow weight shift every few seconds, gun sway that the aim reticle does not follow | N2 |
| 13 | Draw timing (28) | Rifle draw 0.3 s, pistol 0.5 s (`DRAW_TIME_*`) against the bible's 0.75 / 0.6 s raise minimum (5.12.2 row 6); chosen from footage in G2 | `drawState.ts` | Decision for Michael: keep G2 or slow the draw to the bible (a believable reach needs ~0.5 s) | N3 |
| 14 | Hostage walk, carry walk (44, 48) | Pelvis and shoulders turn together (corr +0.85 / +0.95); carry-walk planted slide 8.7 cm; lift slide 21 cm | `hold-walk`, `carry-walk`, `lift` | Counter-rotation and load lean on the hold / carry; feet re-step during the lift instead of sliding | N4 (closeQuarters) + N1 |
| 15 | Drop / land (69) | Planted slide 11 cm on landing; trunk 0 deg twist through the land | `drop-land` | Land with the planner's set-down at the landing spot; a small trunk / arm follow-through | N1 / N4 |
| 16 | Crouch gaits (9, 11, 23) | Sneak twist 4.4 deg, crouch walk 8.8 deg, crouch aim moving counterCorr -0.22 (barely counter) | `sneak`, `crouch-walk`, `crouch-aim-moving` | The N2 layer's crouch rows (smaller amounts, hips lower) | N2 |
| 17 | Aim glides (19-21) | Pelvis yaw 0.9-1 deg, shoulders 4.6-4.9 deg; strafe counterCorr -0.37 | `aim-glide-*` | Glide row in the N2 layer: pelvis twist with the step, chest held to the aim | N2 |
| 18 | Wall set (33-38) | Right planted foot turned 23 deg from the pelvis; prior: slide knees 1.3-1.5x, track 16-22 cm (anim-rework STATE) | `wall-set` | Wall side-step lands in the stance band; the keyed gate takes `input.wall` | N4 (walls) + N1 |
| 19 | Grenade throw (71) | Pelvis and shoulders turn as a block (corr +0.95, shoulders 47 deg): no hip lead | `grenade` | Throw sequence: hips lead, shoulders follow 0.05-0.1 s later, follow-through step | N4 (actions) |
| 20 | Stops (7) | Jog / run stop planted slide 1.6-2.1 cm; run stop pelvis twist 13 deg left in place | `stop-jog`, `stop-run` | Stop set-down lands where the foot is (slide under 1 cm); unwind the twist over the settle | N1 |
| 21 | Traversal set (50-56) | Trunk twist 10-18 deg, otherwise rigid; ladder top-out reads stiff (sheet) | `trav-*` | Body layer weight / sway rows for climbs (reach-side shoulder up, hips off the ladder) | N4 (traversal) |
| 22 | Door open (41) | Pelvis yaw 15 deg against shoulders 3 deg (the hips do the turn) | `trav-door` | Shoulders lead the reach to the leaf | N4 |

Pass 2 adds fixes 23-36 (ranked among themselves; where they sit against 1-22: 23 and 24 rank with 2-3, 25-27 with 9-14):

| # | Row (COVERAGE #) | What is wrong | Evidence | Fix (one line) | Slice |
| --- | --- | --- | --- | --- | --- |
| 23 | Hit flinch (79) | Invisible: shoulders 0.9 deg, torso pitch 0.2 deg after `rig.hit(1, +-0.8)`, aiming 0.2 deg | `hit-flinch-2`, `hit-flinch-aim`; `lean.*` | Additive hit layer: chest 6-10 deg away from the side hit, head snap, shoulder drop, a half step when standing, arms jolt; recovers over 0.4-0.6 s | N4 (`animGraph.hitReact`, CT Core) |
| 24 | Fire, recoil (25) | 1 s of rifle fire: gun 0.12 m/s, wrists 1.4 cm, trunk 0 deg; pistol the same | `fire-rifle`, `fire-pistol` | Per-shot kick through the arms into the shoulder: 2-4 cm back, 1-2 deg muzzle rise, shoulder and chest absorb, settle in ~0.1 s | N3 |
| 25 | Co-op holders (73, 75-77) | Role B trunk 0.0 deg through boost, throw, hang and rope; hands at the hips, not on A's foot, legs or the rope; A rises with no push | `pair-boost`, `pair-throw`, `pair-hang`, `pair-rope`; `b.trunk` | B's hands on the contact (cupped step, A's shins, the rope) with a braced lean and a leg push timed to A's rise | N4 (co-op team moves) |
| 26 | Mantle, ledge drop (61, 64) | Mantle 0.9 m with the hands at the sides (wrist range 3-7 cm); 2.6 m drop-down in one fixed half squat, no air or landing pose; drop from a pipe hang goes straight to a crouch | `mantle`, `drop-ledge`, `drop-hang` | Mantle: both hands plant on the top, then a knee; drop: step off, legs extend in the air, land into a knee bend | N4 (`clips/traverse.ts`) |
| 27 | Aimed turn on the spot (7) | 90 deg in 0.28 s in two steps; each planted foot swivels 51 deg and slides 4-5 cm | `turn-in-place-aim90 / -aim180(-top)` | The N1 turn-step rule at the aim's turn rate: step, do not swivel a planted foot past ~15 deg | N1 |
| 28 | Roll (66) | An airborne somersault: feet overhead off the ground at 0.47-0.6 s, wrists 28 m/s, slung rifle swings 106 deg | `roll` | Ground roll over the shoulder (hands, shoulder, back, feet in contact order), rifle held to the back | N4 (traversal) |
| 29 | Low ready gaits (16) | Arms locked to the gun (wrist range 0.6 / 1.8 cm walk / jog), head 0 deg, sway 1.2-1.7 cm | `lowready-*` | The N2 layer under a carried gun: chest twist and bob carry the gun, arms ride it with a small lag | N2 |
| 30 | Holds still (43, 44) | Wren's trunk 0.0 deg holding the guard, in play and in the studio clips | `hold-still`, `pair-hold_idle`, `pair-hold_back` | Breathing, weight shift and his struggle fed into her trunk | N4 (closeQuarters) |
| 31 | Crouch run (12) | The jog's arm swing (21.8 cm), trunk 5 / 6 deg, head 0 | `crouch-run` | N2 crouch-run row: lower, forward lean, shorter arm swing | N2 |
| 32 | Wall block (24) | The rifle swings to muzzle-up (69 deg) at the wall with a 0.42 s stall mid-swing | `wall-block`; `gun.stall` | Pull the gun in to the chest (CT) in one eased move; no stall | N3 |
| 33 | Dead channels (70, 72) | `pose.slide` and `pose.check` were never set in play | `dash-slide-driven`, `door-sweep-driven` | Michael 2026-10-22: "Delete them" (another agent removes the code) | done (decision) |
| 34 | Studio pairs (tool) | The hold pairs' guard is over-lit by the stage light; the puppets' ~0.5 s vanish seen in the first runs did not reproduce in the rerun (LOD 1 at 7-8 m every tile; likely the figure LOD band at the 9 m audit camera or a seek jump) | `pair-hold_choke`, `pair-*` labels | Keep the guard out of the stage lights | N4 (studio, low) |
| 35 | Low ready run (16) | Pelvis yaw +-25 deg with ~20 deg snaps in 0.05 s at each step (free run: 5 deg) | `lowready-run` (raw rows) | Find the snapping input (the drawn gait's counter-rotation at gear 5) and bring it into the N2 layer's range | N2 |
| 36 | Split brace (58) | A T-pose: both arms straight out level the whole brace, trunk still | `split-brace` | Hands braced on the walls at shoulder height, elbows bent, a slow breath / balance | N4 (traversal) |

## 3. Per-row table (naturalness 1 = broken, 5 = believable)

Scores are pass 1 reads of the sheet plus the numbers; rows marked "Pass 2" are pass 2 reads. "-" = not captured.

| # | Animation | Score | Sheet | Notes |
| --- | --- | --- | --- | --- |
| 1 | Idle | 3 | `idle` | Head scan 27 deg, shoulders 4 deg, pelvis still (0.1 deg); weight never shifts foot to foot |
| 2 | Walk | 2 | `walk` | Arms nearly still, trunk rigid (pelvis / shoulders 3 deg), no lateral weight shift (1.7 cm), head locked |
| 3 | Jog | 2 | `jog` | Trunk 5 / 7 deg, head locked, arms 21 cm |
| 4 | Run | 2 | `run` | Same trunk numbers as jog; forearms horizontal small pump; upright |
| 5 | Sprint / dash | 2 | `sprint` | Reads as the jog (same numbers); the dash tap may not reach a sprint under CT gears |
| 6 | Walk back, strafe | 2 | `back`, `strafe` | Strafe wrist pop 22 m/s; back = jog numbers |
| 7 | Start, stop, turn, pivot | 1 | `start-jog`, `stop-*`, `turn90-*`, `turn180-*`, `curve-jog`, `turn-in-place-aim90 / -aim180` | Turns: wind-up 10-25 deg, scrub 4-9 cm, pelvis lag 50 deg at run; curve fine. Pass 2: holstered she never turns on the spot (by design, `motion.ts`: standing holds facing), so the pass 1 scenario could not turn; aimed, 90 deg in 0.28 s in two steps, each planted foot swivels 51 deg and slides 4-5 cm (top plot fans) |
| 8 | Crouch idle | 3 | `crouch-idle` | Head scan 27 deg, shoulders 5 deg; ok |
| 9 | Sneak | 2 | `sneak` | Twist 4.4 deg, sway 1.8 cm |
| 10 | Tense sneak | 3 | `tense-sneak` | Pass 2: good counter-rotation (pelvis 7.5 / shoulders 3.3 deg, corr -0.99), long deliberate steps; knife hand parked (1.1 cm), head 0 deg |
| 11 | Crouch walk | 2 | `crouch-walk` | Twist 8.8 deg; prior: steps long (0.64 m) |
| 12 | Crouch run | 2 | `crouch-run`, `crouch-run-keyed` | Pass 2: in play the jog arm swing (21.8 cm) on a crouch, trunk 5 / 6 deg, head 0; the studio keyed clip (rerun) is better (hands low, small swing) but play does not use it |
| 13 | Crouch back / strafe | - | `crouch-turn90` | Crouch turn scrub 6.7 cm, wind-up 12.6 deg |
| 14 | Low ready still, rifle | 2 | `low-ready-rifle` | Statue over 6.6 s |
| 15 | Low ready still, pistol | 2 | `low-ready-pistol` | Statue |
| 16 | Low ready walk / jog / run | 2 | `lowready-walk / -jog / -run` | Pass 2: arms locked to the gun (wrist range 0.6 / 1.8 / 11 cm), head 0 deg, sway 1.2-1.7 cm; run: the pelvis really swings +-25 deg with ~20 deg snaps in 0.05 s at each step (rerun raw rows) |
| 17 | Aim still, rifle | 2 | `aim-still-rifle` | Statue (0 deg, 0.1 cm) |
| 18 | Aim still, pistol | 2 | `aim-still-pistol` | Statue |
| 19 | Aim glide forward | 3 | `aim-glide-fwd` | Shoulders 4.6, pelvis 1 deg; steady gun ok |
| 20 | Aim glide strafe | 3 | `aim-glide-strafe` | Weak counter (-0.37) |
| 21 | Aim glide back | 3 | `aim-glide-back` | ok, stiff hips |
| 22 | Crouch aim still | 2 | `crouch-aim-still` | Statue |
| 23 | Crouch aim moving | 2 | `crouch-aim-moving` | Barely counter-rotates (-0.22) |
| 24 | Wall block | 3 | `wall-block` | Pass 2: at the wall the rifle swings to muzzle-up (69 deg) and the gun stalls 0.42 s mid-way, then comes back down; reads, abrupt |
| 25 | Fire, recoil | 1 | `fire-rifle`, `fire-pistol` | Pass 2: 1 s of rifle fire moves nothing: gun 0.12 m/s, wrists 1.4 cm, trunk 0 deg (casings fly; no kick in the arms or shoulder) |
| 26 | Reload rifle | 3 | `reload-rifle` | Shoulders 17 deg with the reach; gun still 1 s while the mag changes (expected) |
| 27 | Reload pistol | 3 | `reload-pistol` | As 26 |
| 28 | Swap, draw, holster | 1 | `draw-lowready-*`, `draw-*`, `swap-drawn`, `holster-*`, `ready-to-aim` | The stop (rows 2-3 of the fix list), pops at the slot and the hand-off; holster and ready-to-aim are smooth (4) |
| 29 | Hand swap | - | `wall-edge-left`, `hand-swap-shoulder` | 2026-10-22 (N0 leftovers): a script problem, no game bug. The lean-out aim (and its swap) is gone by decision (G52, `wallController.ts:624-627`); the swap now runs on the peek at a left wall end with the gun out (`wallLeftHand`) and on the left-shoulder aim. The rows now push the stick toward the end in the world, draw first, and add the shoulder swap (PASS2.md "N0 leftovers"). Sheets pending the GPU run; software-GL logic check 18:19-18:46 passed (left end: edge reached, peek 1.0, weapon to the left hand 1.0, then the aim; shoulder swap: left hand 1.0 and back). Seen in the logic sheets (look pending GPU): the rifle swings muzzle-up over the shoulder mid-swap, wall and shoulder alike (as row 24) |
| 30 | Knife in hand | 3 | `knife-in-hand` | Pass 2: fist closed on the knife, the walk swings it as an empty hand (22.6 cm); no guard of the blade |
| 31 | Launcher in hand | - | - | not in the game (weapons.json: rifle and pistol only) |
| 32 | Jammer | 2 | `jammer` | = pistol aim still (row 18): 0 deg trunk, no pose of its own |
| 33-38 | Wall idle / slide / peek, crouched | 2 | `wall-set` | One studio loop (enter, slide both ways, leave); right foot wound 23 deg; prior knees / track out of range |
| 39 | Aim at a wall / peek aim | - | `wall-edge-left / -right / -low` | 2026-10-22 (N0 leftovers): no game bug. Aiming leaves the wall by design (A3 / loco M25, CT: `gameState.ts:2535`); she turned round because the camera still faced the wall. The rows now peek at the end, turn the view past it, then aim round the corner. Sheets pending the GPU run; software-GL logic check passed: left / right / low ends reached (edge 1 / -1 / 1), peek 1.0 on each, the aim leaves the wall and she aims round the corner (right end: no swap, as designed) |
| 40 | Door peek | 3 | `door-peek` | Pass 2 rerun (Stealth open pick, camera behind): steps to the latch side, a hand to the frame, holds, steps back |
| 41 | Door open, walk through | 3 | `trav-door` | Hips do the turn (15 vs 3 deg) |
| 42 | Grab | 3 | `grab` | Trunk as a block (corr +0.2), feet ok (1.2 cm) |
| 43 | Hostage hold still | 2 | `hold-still`, `pair-hold_idle` | Pass 2: trunk 0.0 deg in play and in the studio clip (rerun side-on) |
| 44 | Hostage walk | 2 | `hold-walk` | Block trunk (+0.85), slide 5.3 cm |
| 45 | Choke knockout | 3 | `hold-ko` | Shoulders 7.5 deg, feet still; hands fast (12.7 m/s, the strike) |
| 46 | Knife kill | 3 | `knife-kill`, `pair-hold_knife` | Pass 2: the strike and the lowering read; trunk turns as a block (corr +0.81); Wren dark in the Warehouse (guard bright) |
| 47 | Interrogate | 2 | `interrogate` | Pass 2 rerun: the free hand goes to his jaw (12 cm); trunk, head and stance 0.0 deg |
| 48 | Body pick-up, carry, drop | 2 | `lift`, `carry-walk` | Lift slide 21 cm; carry block trunk (+0.95), slide 8.7 cm |
| 49 | Elbow strike | - | `elbow-strike-guard` | 2026-10-22 (N0 leftovers): a script problem, no game bug. The guard snaps to a 0.5 m nav cell centre and could stand ~1.45 m off, past `STRIKE.reach` 1.3 m (the grab's 1.8 m reach hid it); the row now stands her 0.85 m behind him where he really is. Sheet pending the GPU run; software-GL logic check 18:46-18:51 passed: 0.85 m gap, the `altFire` tap started 1 strike (phase to 0.98 in 0.67 s), 1 knock-out. Trunk moves 0.8 deg (shoulders) through the strike: an arm-only strike, for N4 |
| 50 | Ladder | 3 | `trav-ladder` | Reach and step alternate; trunk twist 13 deg; top-out stiff |
| 51 | Drainpipe | 3 | `trav-pipeV` | Twist 10 deg |
| 52 | Pipe legs up | 3 | `trav-bar` | Twist 19 deg |
| 53 | Pipe / bar hang | 3 | `trav-pipeH` | Twist 12 deg |
| 54 | Ledge hang, shimmy | 3 | `trav-ledge` | Pelvis side sway 11 cm with the shimmy (good) |
| 55-56 | Vent crawl, unscrew, exit | 3 | `trav-vent` | Shoulders and pelvis not counter (corr -0.08) on the crawl |
| 57 | Rappel | 3 | `trav-rappel` | Head turns 63 deg (looks down the rope) |
| 58 | Split brace | 2 | `split-brace` | Pass 2 rerun: clean double jump into the split, then a T-pose (arms straight out level for 1.6 s), trunk still |
| 59 | Vault | 3 | `trav-vault` | Twist 13 deg |
| 60 | Window vault | 3 | `trav-window` | |
| 61-67 | Mantle, step up, climb up, drop, hop, roll, wall kick | 2 | `mantle`, `step-up`, `climb-up`, `drop-ledge`, `drop-hang`, `hop`, `roll`, `wall-kick` | Pass 2: mantle 0.9 m with no hand plant (wrists 3-7 cm); ledge drop 2.6 m in a fixed half squat (no air or land pose); drop from a pipe hang: straight to a crouch; roll reads as an airborne somersault (feet overhead, wrists 28 m/s, slung rifle swings 106 deg); hop, climb up and wall kick read (3) |
| 68 | Jump, air, fall | - | `drop-land` | Trunk 0 twist in the fall (arms only) |
| 69 | Land | 2 | `drop-land` | Planted slide 11 cm |
| 70 | Dash slide | deleted | `dash-slide-driven` | Deleted (Michael 2026-10-22: "Delete them"): `pose.slide` was never set in play; another agent removes the code |
| 71 | Gadget throw | 3 | `grenade` | Block rotation (+0.95), no hip lead |
| 72 | Doorway sweep | deleted | `door-sweep-driven` | Deleted (Michael 2026-10-22: "Delete them"): `pose.check` was never set in play; another agent removes the code |
| 73-78 | Co-op moves | 2 | `pair-boost`, `pair-relay`, `pair-throw`, `pair-hang`, `pair-rope`, `pair-revive` | Pass 2 (camera on the puppets): role B is a statue in boost, throw, hang and rope (trunk 0.0 deg) with the hands at the hips, not on A, the rope or a step; A is lifted with no push; relay and revive read (3) |
| 79 | Hit flinch | 1 | `hit-flinch-2`, `hit-flinch-aim` | Pass 2: `rig.hit` is the right call (pass 1 used it too); the flinch is invisible: shoulders 0.9 deg, torso pitch 0.2 deg, holstered or aiming |
| 80 | Downed | 3 | `pair-revive` (role B) | Solo has no pose; the revive pair lies B on its side, still |

## 4. What each slice measures to prove its fix (before -> target)

Run `E2E_GPU=1 node scripts/anim-natural/audit.mjs proving --only=<rows>` (and `studio`) before and after; the
numbers land in `metrics.json` under the same keys. e2e-anim's foot locking and CRAB metrics stay as guards.

- N1 feet: `turn90-walk / -jog / -run`, `turn180-jog / -run`, `crouch-turn90`, `stop-jog / -run`, `drop-land`,
  `carry-walk`, `lift`. `turn.plantSlideCm` 2.4-8.8 -> under 1; `turn.windDegMax` 10-25 -> under 15 (the trigger);
  `trunk.pelvisYawRange` at run turns 50 -> under 25 (no pelvis lag); top plots show a heel lift and a ball pivot at
  the corner, no fan about the heel; e2e-anim planted slide and knee separation not worse.
- N2 body layer: studio `walk / jog / run / sneak / crouch-walk / aim-glide-*`: pelvis yaw range 3 / 5 / 5 ->
  ~8 / 12 / 18, shoulder range 3 / 7 / 7 -> ~8 / 16 / 26, `counterCorr` < -0.8; `sway.pelvisLatCm` 1.6-1.8 -> 3-5
  (walk) and 2-3 (run); `sway.headYawRange` 0 -> 2-6 deg in gaits; wrist forward range 21 -> ~30 (walk) / 45 (jog);
  `hands.wristSpeedMax` in turns 13-22 -> under 6 m/s; drawn stills (`low-ready-*`, `aim-still-*`) twist 0 -> 0.5-2
  deg over 6 s, aim reticle unchanged; run differs from jog.
- N3 weapons: `draw-lowready-rifle / -pistol`, `draw-rifle / -pistol`, `swap-drawn`, `holster-*`, `ready-to-aim`:
  `gun.stall` null (no span under 0.1 m/s between moving spans), `gun.peak` 10-11 -> under ~4 m/s (no one-frame
  flips), muzzle pitch monotonic or one arc to the end pose (no level hold before the drop), end deceleration over
  >= 3 frames; timings logged against 5.12.2 row 6.
- N4: `hold-walk`, `carry-walk`, `grenade`, `trav-*`, `wall-set`: counterCorr from positive to negative on the
  walks, hip-lead on the throw (pelvis peak before shoulders), wall planted wind-up under 15 deg.

## Pass 2

Run 2026-10-22 13:41-14:00, rerun 14:09-14:16 (desktop GPU): see `docs/anim-natural/PASS2.md` (what ran, per-row scores, fixes 23-36, what is
still not captured and why). `node scripts/anim-natural/audit.mjs <studio|proving|all> --pass=2` runs pass 2's rows alone.
