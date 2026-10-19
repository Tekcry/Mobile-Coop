# Audit: traversal (2026-10-20)

Covered: mantle, jump-grab, hang, shimmy, climb-up, drops and landings, drainpipe, ladder, free rope, rappel, duct, floor
trap; rail vault and beam walk from the catalogue only (stopped early on the usage limit, rows marked "estimate").
Clips frame-stepped: 110522, 110616, 054411, 112102, 111335, 111731, 111234, 110818. Frames: `pc/ct-work/frames/traversal/`.

Rulers: hero about 1.8 m (hands-to-feet in a dead hang about 2.2 m), vent panel 2.6-3 m, ladder rungs (count only, the
camera foreshortens them), pipe bracket bands. Speeds are +-20 % (tracking camera); periods are +-0.1 s.

## Delta table (most visible first)

| # | item | CT (clip @ s, value, how) | ours (file:symbol, value) | delta | fix | size | feel |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Drainpipe hand cadence | 054411 3.4-5.7: one reach per hand per cycle, cycle 1.1-1.2 s (compact at 3.4-3.8, 4.35-4.9, 5.5; extended 3.96-4.28, 5.08-5.4); a reach about 0.5 m; swing about 0.3 s (crop frames) | `attachGrips.ts` pipeV: hand slack 0.16, lead 0.8 (reach about 0.29 m), swing 0.18 s scaled by speed -> about 3 reaches/s per hand at 0.9 m/s | hands about 3x too busy (Michael: "arms need to move slower") | pipeV `h.slack` 0.16 -> 0.5, keep lead 0.8 (reach about 0.9 m, so one reach per hand per 1.1 s at 0.85 m/s); `h.swingTime` floor 0.3 s (drop the 0.18*(0.9/sp) scaling for pipeV) | S | 3 |
| 2 | Drainpipe legs | 054411: both feet together on the wall either side of the pipe, knees drawn up to hip / chest height in the compact phase, then both legs push and the body extends (inchworm); hips 0.3-0.4 m off the wall, body side-on; no alternating feet | `attachGrips.ts` pipeV feet offL 0.12 / offR 0.38, alternating stepper; `traverse.ts` CLIMB (ladder cycle shared) | wrong pattern: alternating ladder feet read as flailing (Michael: "don't hug the pipe and jitter") | pipeV: feet one pair (offL = offR = 0.25, both step together, `overlap` off, step when the hands finish a reach); new clip `PIPE_CLIMB`: compact pose (knees 100-110 deg, thighs near horizontal) to extended (knees 30 deg) over the cycle; root speed surges in the 0.3 s push (1.6x mean) and holds 0.6x in the regrip | M | 3 |
| 3 | Drainpipe speed | 054411 up 2.0-7.3 s, down 7.5-12.9 s (both climbed hand over hand, same cycle 1.1-1.2 s); about 0.85-0.95 m/s (estimate, band vs hero) | `attach.ts` ATTACH.pipeV speed 0.9; PIPE_SLIDE 3.2 | speed fine; CT climbs down, no slide seen | keep 0.9; make down the same cycle reversed (it is); slide stays as an extra | S | 1 |
| 4 | Hang shimmy speed and rhythm | 110522 65.3-69.9: 0.5 m/s (vent panel 142 px over 4.6 s at 59 px/m); full cycle 1.0 s (66.0 = 67.0 = 68.0 pose): lead hand reaches out (about 0.3 s), trailing hand closes (about 0.3 s), short hold; hand span 0.55-0.8 m; arms straight, fingers over the lip | `attach.ts` ATTACH.ledge speed 0.7; `attachGrips.ts` ledge swing 0.28 s, about 0.39 m a reach, about 1.8 reaches/s per hand | 40 % fast, hands about 2x too busy | ATTACH.ledge speed 0.7 -> 0.5; ledge `h.swingTime` 0.28 -> 0.32, `h.leadTime` 0.42 -> 0.5 (reach about 0.5 m, one per hand per 1.0 s), hands spread 0.26 -> 0.3 each side at rest | S | 3 |
| 5 | Shimmy lower-body swing | 110522 66.0-68.9 (crop): the body hangs as a pendulum from the hands; the legs trail the travel by about 15-17 deg (feet about 0.3 m behind the hips) as the lead hand reaches, swing through vertical as the trailing hand closes, period 1.0 s (one swing per hand cycle); legs together, knees soft | `traverse.ts` HANG static; no hip swing tied to the hand stepper | missing (Michael: "bottom of the body needs to swing naturally") | in `attachGrips` (ledge, pipeH hands) drive a pelvis roll / leg yaw from the stepper phase: angle = -16 deg * sign(v) * cos(2 pi phase), eased by speed (0 at rest, full at 0.5 m/s); settle over 0.6 s on a stop with one overshoot; feet stay together | M | 3 |
| 6 | Climb-up from a hang | 110522 52.8-54.1: pull 52.8 -> chest at the lip 53.0 (0.2 s) -> lead knee raised high outside the arm 53.2 -> knee on top 53.3 (0.5 s) -> crouched on top 53.6 (0.8 s) -> stands walking 54.1 (1.3 s, stick held). 110616 24.93-26.0: knee on at 25.33 (0.4 s), crouched on top 26.0 and stays crouched (stick released) | `attachController.ts` CLIMB_UP_TIME 1.3, ends standing; knee planted k 0.56 (0.73 s) | knee 0.2-0.3 s late; CT ends in a crouch unless the stick is held | CLIMB_UP_TIME 1.3 -> 0.85 to the crouch (knee at k 0.55 = 0.47 s); add `climbUpStand` 0.45 s that only runs with the stick held, else exit crouched (crouch flag on); lead knee path wide (out 0.25 m) | M | 3 |
| 7 | Mantle onto a waist crate (about 1 m) | 110522 11.0-12.16: hands on the top 11.0, knee up 11.5, standing on top 12.0-12.16 (1.0-1.15 s, walking pace); onto a second crate 20.0-21.3 (1.3 s) | `traversal.ts` TRAVERSE_TIME.mantle 1.0 (MIN 0.75); `movement.ts` pickTraversal mantle <= 1.8 m | time matches; check the pose has the knee (not verified in our renders) | keep 1.0; MIN_TIME.mantle 0.75 -> 0.9; mantle path: knee on top at k 0.5 | S | 2 |
| 8 | Jump-grab to a hang | 110616 22.93-23.5 (lip about 2.2-2.4 m): arms up, jump, hands on at 0.55 s; 110616 8.2-8.46 low lip 0.3 s | `attachController.ts` ledgeBelow enter ATTACH.ledge.enter 0.3 | about right for low lips; 0.55 s for a full-reach jump | enter time = 0.3 + 0.25 * clamp((lip - 2.0) / 0.4) s | S | 1 |
| 9 | Drop from a hang and landing | 110522 71.6 release: arms fling up and out wide, legs part; lands about 71.95 (0.35 s) in a deep crouch, hands near the floor, holds crouched; 110616 9.6 -> 9.8 (0.2 s, feet about 0.3 m up), crouch held 0.4-1 s | ledge exit `drop` (ATTACH.ledge.exit 0.4) | close; release pose and the held crouch not in ours (estimate) | release pose: arms out to about 120 deg spread for 0.15 s; land into crouch and leave crouch on (stand on stick / crouch press) | S | 2 |
| 10 | Ladder cadence | 112102 9.19-10.66 (crop): full cycle 1.2 s (9.19 = 10.39 pose), one hand reach every 0.6 s, each hand 2 rungs a reach -> 1.7 rungs/s; opposite knee lifts with each reach | `attach.ts` LADDER_RUNG_RATE 3 (0.9 m/s at 0.3 m rungs) | about 1.8x fast | LADDER_RUNG_RATE 3 -> 1.7 (0.5 m/s); ladder `h.slack` rung*1.05 -> rung*1.9 so each hand moves 2 rungs; hand swing 0.3 s; LADDER_SPRINT_RATE 5 -> 3 (estimate) | S | 3 |
| 11 | Ladder top-out | 112102 12.2-13.2: hand over the top 12.2, both hands on the platform 12.4, torso over 13.0, standing 13.2, crouches at 13.4 (about 1.0 s) | `attach.ts` ATTACH.ladder.exit 0.45; end 0.2 m in from the top | about 2x short | ladder top exit 0.45 -> 1.0 s with a knee-on-top pose like the climb-up (reuse CLIMB_UP crouch half) | M | 2 |
| 12 | Ladder release | 112102 7.5-8.03: let go near the bottom, short fall (about 0.13 s), lands standing with both arms flung out to the sides held about 0.45 s | ladder has no drop (`a.kind !== 'ladder'`); B = slide 4.5 m/s | CT lets go; slide not seen in any clip | allow drop on the ladder below 1.2 m feet height; land pose arms out 0.45 s; keep the slide (not contradicted) | S | 1 |
| 13 | Rappel hook-on | 111731 2.0 menu gone -> 4.2 in position (about 2.0 s): steps over the edge, sits into the rope, camera top-down close on his back | `movement.ts` RAPPEL.hookTime 0.8 | 2.5x short | RAPPEL.hookTime 0.8 -> 1.8 (estimate) | S | 2 |
| 14 | Rappel pose and speed | 111731 4.2-13.4, 19.2-23.7: legs out on the wall, knees 60-90 deg, torso leaned back 30-45 deg off the wall, top hand up the rope, brake hand at the hip; slow steady walk down; tucked ball pose at 18.6-18.9 (pause) | RAPPEL.descend 1.6, descendSprint 3.0 | CT looks well under 1 m/s (estimate; the camera tracks) | RAPPEL.descend 1.6 -> 0.8 (estimate), add a wall step cycle (about 1 step / 0.6 s) | S | 2 |
| 15 | Rappel push-off and drop | 111731 24.0-25.8: unhook, push off, airborne 24.6-25.5 (0.9 s), lands one knee deep on a ledge 25.5-25.8, stands 26.1 | unhook only under RAPPEL.unhookHeight 2.0 | CT drops from higher | RAPPEL.unhookHeight 2.0 -> 4.0 (estimate) with the drop landing of #9 | S | 1 |
| 16 | Duct crawl camera | 111234 37-41.8: camera about 0.3-0.5 m behind and just above the helmet, the helmet fills the lower centre; head bobs side to side with a 1.0-1.2 s cycle; hands and knees | `attach.ts` camera 'duct'; ATTACH.duct speed 0.9 | camera distance to check in camera.ts (camera agent); speed 0.6-1.0 m/s (estimate) | keep 0.9; duct camera offset about 0.4 m behind, 0.1 m above the head; head bob +-0.05 m lateral at the crawl period | S | 2 |
| 17 | Floor trap open and drop | 110818 9.33 select -> crouched shuffle to the grate 9.6-10.7 -> lift 10.93-12.0 (1.1 s, lid swings to vertical) -> lowers feet first 15.2 -> hangs, drops, lands crouched 16.0 (0.8 s); camera top-down high, cuts to below at the drop | no floor trap (only a ceiling vent drop from a duct, VENT_LOWER 1.5) | missing | see Missing 2 | M | 2 |
| 18 | Rail vault / rail climb-over | 111424 1.0 (one leg and both hands over at a run), 3.0-4.5 (hands on the rail, legs kicked up and over, lands crouched); 111823 7.5-9.0 (sprawled over the rail, perched, lowers on the far side, crouched 9.0): estimate, not frame-stepped | `traversal.ts` vault 0.7 s (MIN 0.42), height <= 1.25 m | vault time roughly fits (about 1.0-1.5 s for the climb-over from a crouch); the slow climb-over variant is missing | add a crouched rail climb-over (1.5 s, sit on the rail at k 0.4, lower on the far side) when crouched or at walk; keep the 0.7 s vault at a run | M | 2 |

## Missing entirely

1. Free-hanging rope, GRAB ONTO ROPE (N2-1, 111335 1.0-48). Measured: grab 1.6-2.0 s; climb up 0.37 m/s (wall panel
   edge, 115 px over 2.6 s at 123 px/m), cycle 1.2 s: hands reach up with the legs hanging (3.8, 5.0, 6.2), then the knees
   tuck high and the feet lock the rope (4.2-4.4, 5.4-5.6) and the legs stand up; body near vertical. Down 0.4-0.45 m/s
   hand over hand, same cycle, no slide. Top: comes over the lip and kneels (16.5-17.5); going over the top onto the rope
   takes about 2.0 s (21.6-23.8, the body swings under the lip). Camera side-on at a fixed distance, top-down on the
   descent. Plan: new attach kind `rope` (vertical axis, speed 0.37 up / 0.43 down, enter 0.4 s, top exit 1.0 s with the
   climb-up crouch, top entry 2.0 s), a `ROPE_CLIMB` clip (foot lock cycle above), the hands on one vertical grip line
   (pipeV stepper with slack 0.45); prompt from the A menu "Grab onto rope". Reuse the B7 team rope's top-out.
2. Floor trap (N2-3, 110818 9-16.5, 111234 4.5-10). Plan: a `hatch` anchor in the floor; menu OPEN TRAP: 1.1 s crouched
   lift (lid to vertical, hinged), then a lower-in (reuse LOWER_TIME 0.7 into a hang at the hole edge) and the hang drop
   (#9); OPTIC CABLE through it (H5 in the gadget area). Hold the crouch pose over the hole while open.
3. Crouched rail climb-over (111823 7.5-9.0, 111424 13.0-14.0: sits astride, then drops to a crouch). See #18.
4. Beam / ledge-top walk (N3, 110522 29.5-35.5): one leg over a beam, then a normal walk along a catwalk; footage is
   unclear (catalogue "poor"), so no balance walk is proven. Plan: none until clearer footage; normal walk on narrow tops.

## Clipping and believability risks

- Our renders under `pc/ct-work/ours/traverse/` and `docs/ct-prototype/shots/f/traverse/` were not reviewed this pass
  (stopped on the usage limit). Known from POLISH.md: the climb-up hands drift 8-22 cm off the lip at 1.1-1.2 s and 45 cm
  at 1.3 s, and the left foot hangs off the edge at 1.5 s; ending the climb-up crouched at 0.85 s (#6) removes the long
  late phase where the drift happens.
- Slowing the shimmy and pipe reaches (#1, #4, #10) makes each reach longer: check against `ARM_SWEEP_RATE` (11 rad/s);
  a 0.5 m reach on Wren's arm needs at least about 0.12 s, so 0.3 s swings are safe.
- The pendulum swing (#5) must keep the feet off the wall face: limit the swing toward the wall to 0.
- Ladder top-out at 1.0 s: the knee must land on the platform, not the top rung (B7 polish: climber clips the wall
  corner on top-out).

## Not measurable from the footage

- Rappel speed and duct speed: the camera tracks the hero and the walls repeat (brick courses, grates), so no fixed ruler.
- Ladder rung spacing in metres: the low camera foreshortens the rungs; speeds in #10 assume 0.3 m rungs.
- Ladder slide: never used in the clips (no evidence for or against).
- Rail vault take-off distance and the beam walk: not frame-stepped (usage limit); catalogue times only.
- Pipe legs-up, inverted hang, zipline, fence, window vault, split jump: not in any traversal clip.
