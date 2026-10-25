# Slice 4 report: crouched movement, the crouched idle with the knee hand, crouched drawn, stand <-> crouch

Implementer (Opus), 2026-10-20 21:58 - 2026-10-21, uncommitted in `feature/ct-prototype` (base f46426a5). Scope: PLAN
slice 4 plus the crouched holstered set moved here by A4 and crouched drawn from slice 3; real-world operator technique
(BRIEF 3 "Stealth", "Balance and support", M6), never traced. Course Ready's S4 clips (`S4-KEYS.md`) wired, not re-keyed.

## What was built
- **The crouched keyed set** (`AnimGraph.crouchSet`, `KEYED_CROUCH`): `sneak` -> `crouch_walk` -> `crouch_run` cross-faded
  by the crouched effort pace (sneak to ~1.1 m/s, crouch walk ~1.45-1.9, crouch run from ~2.45), one continuous blend
  like slice 2; `crouch_idle` (the squat) by the still share. It mixes into both keyed sets (holstered and drawn) by the
  crouch blend, so stand <-> crouch is the controller's eased 0.22 s curve on the keyed pose too (before, the keyed
  weight cut out in 0.08 s as the crouch began).
  - Pelvis height: the clips' pel y is the whole crouch depth; by the crouched share it replaces the procedural drop
    (`o.keyed.pel[1] -= crouch x pose.pelY`; the rig still adds the keyed height).
  - Planner values: duty / lift from `KEYED_CROUCH_LEG` (sneak 0.66 / 4.5 cm, walk 0.60 / 6 cm, run 0.52 / 9 cm: no
    flight in the crouch run), track `halfK` 0.85 of the clips' 6.2 cm, the squat's `idleHalfK` 0.72 of its 12.2 cm
    (8.8 cm, about hip width), knee pole `kneeOut` -0.04 (a little in: knees over the toes on the narrow track).
  - In the game the clips read upright and high (trunk 17 / 21 / 26 deg, hips 17-25 cm under standing), so
    `KEYED_CROUCH_POSE` adds lean and drop per clip (sneak 0.08 rad / 2 cm, walk 0.12 / 3, run 0.20 / 5) with the keyed
    arms turned back by the lean (they still hang along the body). Measured: sneak 21 deg / hips 0.57 m, crouch walk
    28 / 0.62, crouch run 38 / 0.62 (standing walk 0.84 m); before (procedural) 40-49 deg / 0.49-0.56 m.
  - Stop and start: the squat's share eases in 0.22 s and out 0.12 s (`settleIn` / `settleOut`), the crouched pace is
    eased (`paceTau` over the moving share): a crouched quick stop let the hands jump 11 cm in a frame when the kneel flag
    released the held stop pace.
- **The crouched idle with the knee hand** (holstered, still): the keyed squat replaces the one-knee kneel
  (`KEYED_CROUCH.squat`; drawn still keeps the kneel). The keyed arms run (keyedArm with the clip's wrist frame: palm
  down, fingers forward) and the rig then puts each palm on top of its own posed knee (`RigTargets.kneeRest`,
  `CharacterRig.kneeRest`: the palm's miss from the knee top, `KNEE_REST` 6 cm over the joint, 1 cm ahead, moves the
  wrist target; the arm is re-aimed two-bone, the keyed wrist frame kept). The keyed arms alone missed by 11 cm (8 cm out,
  4 cm behind: the game's knees are not the preview's). Slow breathing: the squat's 12 s cycle (three breaths, weight
  shift, a 16 / 13 deg head scan, `period`); crouched the procedural breath slows to `BREATH.rateCrouch` (4.8 s a
  breath, was 3) and the kneel's cycle to `KNEEL_RATE` 0.7 (5.1 s, was 3.6).
- **Crouched drawn** (low ready and aiming, rifle and pistol): the drawn set crouched takes the crouched set's legs (and
  at low ready its trunk; aiming the upper body stays the procedural gun platform, `keyTrunk`). The glide's short
  side-step crouched too (`stepLength` glide no longer standing-only; the planner's `GLIDE_GAP` crouched): the crouched
  aimed strafe was a 35-44 cm crab with crossing feet. Drawn and still crouched: the procedural kneel as before, the keyed
  set fading under it (`RigTargets.kneel`); its knee pole in (`KNEEL_KNEE_OUT` 0.03, was 0.12: the knee 4.7 cm outside
  the ankle) and its feet in (`KNEEL_NARROW` 0.12). Crouched low ready elbows tuck more (`READY_ELBOW_TUCK_CROUCH` 0.8).
  Slice 3 standing unchanged (see the standing rows note below).
- **Planner** (`footPlanner.ts`): crouched landings keep the stance's gap (`FREE_GAP`, the 13 cm `minGap` held the crouch
  9-12.6 cm a foot), a planted foot steps back into `CROUCH_BAND` 3.5-10 cm (was 5.5-14; the turn scrub keeps the G1
  band: the crouched band there broke a crouched-spin landing), and the slice 2 open item: a stance change re-steps
  still feet for `RESTEP.window` 1.2 s at `RESTEP.err` 2 cm (crouch-sneak then stand kept the crouched spacing).
- **Tense sneak** (G1, close to an unaware guard): unchanged, the keyed set fades under it (its own carriage and hands).
- **Co-op**: no wire change (PROTOCOL_VERSION unchanged). A remote poses the same from MoveState (crouch, speed, its kneel
  timer, gun in hand). Hot paths allocate nothing (scratch poses `kCr` / `kF`, module scratch vectors in `kneeRest`).

## Numbers used (all named constants, `animGraph.ts` unless named)
| constant | value |
| --- | --- |
| KEYED_CROUCH | sneakTo 0.7, walkFrom 1.1, walkTo 1.6, runFrom 2.3 (crouched effort pace), ampMin 0.6, full 0.5, halfK 0.85, idleHalfK 0.72, kneeOut -0.04, period 12 s, settleIn 0.22 s, settleOut 0.12 s, paceTau 0.1 s, squat true |
| KEYED_CROUCH_LEG | sneak 0.66 / 0.045, walk 0.60 / 0.06, run 0.52 / 0.09 (duty / lift m) |
| KEYED_CROUCH_POSE | sneak 0.08 rad / 0.02 m, walk 0.12 / 0.03, run 0.20 / 0.05 (lean / drop) |
| KNEEL_NARROW, KNEEL_RATE, BREATH.rateCrouch | 0.12, 0.7, 1.3 rad/s |
| KNEE_REST, KNEEL_KNEE_OUT, READY_ELBOW_TUCK_CROUCH | up 0.06 / fwd 0.01 m, 0.03, 0.8 (`characterRig.ts`) |
| RESTEP, CROUCH_BAND | window 1.2 s / err 0.02 m, 0.035-0.10 m (`footPlanner.ts`) |
| CRAB_CROUCH_IDLE, KNEE_HAND, CROUCH_POP | track 10.5 cm; dist 7 cm, above 6 cm, palmDown 0.6, fingersFwd 0.3; 7.5 cm per frame (`audit/limits.ts`) |

## Metrics (e2e-anim, `CRAB_STATES=1 CRAB_JSON=1`, desktop, port 4191)
Before: HEAD f46426a5 built from `git archive` in the scratchpad, measured with this slice's e2e-anim (the crouched rows
are new). After: this tree. Columns: knees x hips mean (min-max) | planted track cm mean (min to max) | knee outside the
ankle cm | slide cm | elbow out cm. Ranges: knees 0.5-1.25, track <= 8 (idle / start / stop / aimed idle 10.5, aimed
strafe 20), knee out <= 3, slide < 1, elbows <= 6.

| state (holstered unless named) | m/s | before | after |
| --- | --- | --- | --- |
| crouch (gear 4, full stick) | 2.15 | 1.61 (1.47-1.74) / 9.5 (7.6 to 12.6) / 5.5 / 0 / 18.2 | 0.70 (0.65-0.76) / 5.2 (4.0 to 7.2) / 2.4 / 0 / 2.4 |
| sneak (stick 0.35) | 1.10 | 1.58 (1.48-1.66) / 9.0 (7.5 to 11.0) / 5.3 / 0 / 16.9 | 0.68 (0.65-0.70) / 5.2 (4.3 to 6.7) / 2.1 / 0 / 1.8 |
| crouched idle | 0 | 1.26 / 6.5 (4.2 to 8.8) / 4.8 / 0 / 9.1 (the kneel) | 0.84 / 8.4 (7.2 to 9.6) / -0.1 / 0 / -2.4 (the squat) |
| crouched start, speed 1 | 0.66 | 1.40 (1.27-1.49) / 6.8 (4.4 to 9.9) / 6.5 / 0 / 17.1 | 0.83 (0.81-0.84) / 7.7 (4.5 to 9.7) / 2.0 / 0 / 1.7 |
| crouched start, speed 3 | 1.31 | 1.45 (1.27-1.70) / 7.9 (4.4 to 11.6) / 5.6 / 0 / 17.4 | 0.81 (0.71-0.89) / 7.2 (4.4 to 10.2) / 2.2 / 0 / 2.3 |
| crouched stop, speed 1 | 0.05 | 1.45 (1.34-1.65) / 10.2 (8.5 to 10.9) / 5.3 / 0 / 16.9 | 0.76 (0.68-0.78) / 5.2 (4.4 to 6.3) / 2.6 / 0 / 1.7 |
| crouched stop, speed 3 | 0.10 | 1.50 (1.35-1.70) / 10.0 (7.9 to 10.9) / 5.4 / 0 / 17.3 | 0.74 (0.69-0.78) / 5.3 (4.2 to 5.7) / 2.5 / 0 / 2.3 |
| crouch run, speed 5 | 2.60 | 1.59 (1.44-1.73) / 9.8 (7.3 to 14.2) / 5.7 / 0 / 18.7 | 0.71 (0.62-0.81) / 5.2 (4.0 to 7.4) / 2.4 / 0 / 2.3 |
| rifle crouched low ready walk, speed 3 | 1.65 | 1.59 (1.47-1.70) / 9.2 (7.6 to 11.7) / 5.4 / 0 / 14.0 | 0.70 (0.66-0.73) / 5.1 (3.9 to 7.1) / 2.5 / 0 / 4.7 |
| rifle crouched aimed idle (kneel) | 0 | 1.23 / 6.9 (3.4 to 10.5) / 4.7 / 0 / 3.7 | 0.71 (0.66-0.72) / 5.3 (1.4 to 9.1) / 1.7 / 0 / 3.7 |
| rifle crouched aimed strafe, speed 1 | 0.41 | 1.89 (1.32-2.40) / 20.0 (-4.2 to 42.6) / 10.9 / 0 / 4.1 | 0.90 (0.68-1.10) / 9.4 (3.5 to 15.9) / 2.3 / 0 / 4.2 |
| rifle crouched aimed strafe, speed 2 | 0.48 | 2.00 (1.32-2.45) / 19.9 (-5.1 to 44.2) / 11.2 / 0 / 4.1 | 0.88 (0.68-1.11) / 9.2 (3.5 to 16.5) / 2.4 / 0 / 4.2 |

- Knee hand (crouched idle, 2 s): palm centre to the knee top max 27.2 cm, palm down -0.54 (facing up), fingers forward
  0.01 before; after 1.4 cm, 0.90, 0.95 (mean offset 0.5 cm in, 0.5 down, 0.9 forward).
- Stand <-> crouch on the posed rig (worst change of a joint's body-frame velocity per 60 Hz frame; hips, wrists, head,
  knees over planted feet), before -> after (cm): holstered still 6.1 -> 4.9; walking 7.1 -> 5.7; running 7.0 (an earlier
  before run with the knees unfiltered: 20.6) -> 6.4; crouched walk -> stop -> squat -> start 1.4 -> 2.6; sneak -> stand
  5.7 -> 4.9; low ready still 5.5 -> 6.3; low ready walking 5.6 -> 5.3; aiming still 5.0 -> 4.6; aimed strafe 4.6 -> 6.7.
  The 4.5-6.7 cm are the 0.22 s stance curve over a 25-37 cm hip travel (as before); `CROUCH_POP` 7.5 catches a snap.
- Standing rows (slice 2 holstered sub-states, slice 3 drawn): unchanged within noise (0.1-0.4 cm in a few idle and stop
  tracks: the recordings after a crouched one now re-step); all gated rows pass.

## Gates
- `CRAB_GATES.crouch` and `.sneak` on. New `CRAB_CROUCH_GATES` (all on) with `CRAB_CROUCH_CHECKS`; `crabCrouchRanges`
  (idle / start / stop / aimed idle: `CRAB_CROUCH_IDLE`, the aimed strafe: `CRAB_STRAFE` plus never crossing, the rest
  `CRAB_CROUCH`). The knee hand asserts under `idle` (`KNEE_HAND`). `CROUCH_POP_GATE` on.
- Ranges: none of the existing ranges changed. New with written reasons in `limits.ts`: `CRAB_CROUCH_IDLE` (the squat
  is a hip-width stance, the standing idle's 10.5 cm), `KNEE_HAND`, `CROUCH_POP`.

## Tests changed
- New `tests/keyedCrouch.test.ts`: crouched set at every pace (holstered keyed arms, drawn procedural arms); no pop
  creep -> crouch run; the clips own the depth, planner duty, narrow track; holstered still = squat (no kneel, knee hand
  share, wrist frame, stance), drawn still = kneel; a quick crouched stop has no jump; crouched glide step; the planner's
  re-step after a stance change; the crouched band.
- `keyedWalk.test.ts` (crouched now keyed, the squat's scan and keyHol), `keyedDrawn.test.ts` (crouched aiming drawn set
  and the glide step crouched), `turnFollow.test.ts` (the crouched spin's planted band is `CROUCH_BAND`),
  `animCrabMetrics.test.ts` (the gates).
- `scripts/e2e-anim.mjs`: crouched sub-states block, the knee hand, the stand <-> crouch pop block.
  `scripts/e2e-clip.mjs`: new holstered scenario "crouched holstered" (arms and hands vs thighs and trunk, tapered
  capsules, contact up to 3 cm; knees and feet apart). `scripts/anim-sheet.mjs`: scenarios crouchidle, crouchwalk,
  stand, sneakstand, aimcrouchstrafe.

## Results
| check | result | time |
| --- | --- | --- |
| e2e-anim before (CRAB_STATES, HEAD copy) | pass | 38 s |
| `npm run check` (lint 0 errors, 191 files / 2098 tests, build) | pass | 102 s |
| `E2E_PORT=4191 E2E_JOBS=2 npm run e2e:quick` (before the last small change: the crouched breath rate and the kneel cycle) | 8 ok; e2e-ct FAIL (fence climb rattle, load), e2e-stealth FAIL (look input, wall-clock, known) | 433 s |
| solo reruns | e2e-ct pass, e2e-stealth pass | 68 / 32 s |
| final `npm run check` (after the last change: crouched breath, kneel rate) | pass, 2098 tests | 95 s |
| final e2e-anim, gated (CRAB_STATES), 339 ok | pass | 31 s |
| final e2e-clip (crouched holstered: arms vs legs min -2.6 cm contact, knees 11.2, feet 10.5 cm) | pass | 9 s |
| GPU sheets (4189, before + after) | ok | ~1.5 min a set |

Not run (the job lead sends them to the laptop): e2e-ctcourse, e2e-coop, e2e-netmove. e2e-mouse not run: no speed changed.

## Files
src: `anim/animGraph.ts` (crouchSet, KEYED_CROUCH, KEYED_CROUCH_LEG, KEYED_CROUCH_POSE, KNEEL_NARROW, KNEEL_RATE,
BREATH.rateCrouch, RigTargets.kneel / kneeRest, the kneel gate, the crouched depth), `player/characterRig.ts`
(kneeRest, KNEE_REST, KNEEL_KNEE_OUT, READY_ELBOW_TUCK_CROUCH), `anim/footPlanner.ts` (RESTEP, CROUCH_BAND, crouched
gaps), `anim/motion.ts` (the glide crouched), `anim/audit/limits.ts` (gates, CRAB_CROUCH_*, KNEE_HAND, CROUCH_POP).
Scripts: `e2e-anim.mjs`, `e2e-clip.mjs`, `anim-sheet.mjs`. Tests: above. Docs: this report, `METRICS.md`,
`CHANGELOG.md` (Unreleased - anim-rework), `TESTING.md`, `docs/systems/movement.md`, `docs/systems/world-and-characters.md`.
No new keys or bakes (Course Ready's S4 clips as baked).

## Sheets (`docs/anim-rework/shots/s4/`, before over after)
`kneehand-close` (front three-quarter, close), `crouchidle-ots` (12 s cycle, frames 1 s apart), `sneak-side`,
`crouchwalk-front` (gear 3), `crouchrun-side` and `crouchrun-ots`, `aimcrouch-side` (crouched rifle aim: the kneel),
`aimcrouchstrafe-front`, `crouch-side` (stand -> crouch still), `sneakstand-front` (sneak, stop, stand: the re-step).

## What Michael should try on /ct/
- Holstered, crouch and stand still: a deep squat, each hand resting on top of its knee, palm down; slow breaths and a
  slow look round. Stand up and crouch again: no snap.
- Crouched, push the stick slowly to full: sneak, crouch walk, crouch run with no pop; from the front the knees and feet
  under the hips (no duck walk); the run leans forward and stays low.
- Sneak, stop, stand up: the feet step back under the hips.
- Draw (X) and walk crouched at low ready; hold LT and strafe crouched both ways: short side-steps, the feet never
  cross. Stop aiming crouched: one knee down as before.

## Open items / not done
- Assumed for Michael (proposed A6): holstered and still crouched the idle is the squat with the hands on the knees
  (Course Ready's keyed clip), not the one-knee kneel; drawn and still it still kneels. Undo: `KEYED_CROUCH.squat = false`.
  Note Michael's playtest 2 (F3) once called an old wide procedural squat "a gorilla"; this squat is narrow and upright.
- The lean / drop on top of the keyed clips (`KEYED_CROUCH_POSE`) is a game-side fix; better re-keyed in the clips
  (Course Ready's tuner multipliers can scale it meanwhile).
- Polish (S4-KEYS.md, not done): the crouch run forearms reach about horizontal at the front of the swing; the sneak's
  trailing knee about 20 cm off the floor at toe-off.
- Crouched step lengths unchanged (0.3 + 0.2 v): the crouch walk at 1.7 m/s steps 0.64 m, long for a low gait.
- The drawn crouched still is the procedural kneel (CT G1); its hands are the gun's. The wall side-on knee hand (slice 5)
  untouched.
- Remotes ease the crouch exponentially (10 / s), not on the owner's 0.22 s curve (as before).
- The pop check reads the stance curve itself (4.5-6.7 cm); a longer stance time would read lower but is a gameplay
  timing (`MOVEMENT.crouchTime` / `standTime`, e2e-anim asserts 0.2-0.3 s).

## STATE draft (for "Now")
- Slice 4 implemented (uncommitted, `S4-REPORT.md`): crouched holstered keyed set (sneak / crouch walk / crouch run, one
  blend; lean and drop added in game), the holstered crouched idle is the keyed squat with each palm on its knee (rig IK
  on the posed knee), slow breathing; crouched drawn on the crouched legs, the glide side-step crouched (the crouched
  aimed strafe crab fixed), the drawn kneel's knees in; stand <-> crouch on the keyed pose's crouch curve; the slice 2
  open item fixed (re-step on a stance change). CRAB_GATES crouch / sneak on, CRAB_CROUCH_GATES (7 states), KNEE_HAND
  and CROUCH_POP on. No wire change.
- Checks: npm run check pass; e2e:quick pass after solo reruns (e2e-ct, e2e-stealth); e2e-anim / e2e-clip pass. Next:
  independent check, laptop e2e-ctcourse / e2e-coop / e2e-netmove, Michael on /ct/ with `shots/s4/`, A6 (squat) to log.
