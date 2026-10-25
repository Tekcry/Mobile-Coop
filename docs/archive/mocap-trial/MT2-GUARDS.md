# mocap-trial-2 - guards keep the hand-keyed set (implementer report, slug guardgate)

2026-10-23, Opus implementer, branch feature/mt2-guardgate from feature/mocap-on 7144a03c. Fixes CHECK-6 Required 1.

## Result
Done. The mocap switch now drives carriers only (`CharacterRig.carrier`: the player, player.ts:195, and the remote
partner, remoteAvatar.ts:157). Guards (`buildEnemyRig`: host guards and co-op guard puppets) pose bit for bit as with the
switch off, whatever the switch says, including a switch flipped mid-walk. Wren's ON pose is bit-identical to before.

## Why
With the switch on, a guard's holstered-style patrol walk (aim 0.2, stride 'facing') took the keyed walk band and with
it the mocap set's walk and clip feet: keyMocap 0.80, joints 22-30 cm off the OFF pose, 76 cm in a walking turn, and
17 / 64 guard identity hashes moved. BRIEF M4 and the Settings label ("Wren walks...") mean Wren only.

## Changes
- `src/anim/animGraph.ts`: `AnimInput.mocapOk` (default `true`, so a bare graph and the graph-level tests behave as
  before). `update()` sets three fields once a frame: `mOn = LOCO.mocap && i.mocapOk`, `mS = mOn ? LOCO.set :
  HAND_KEYED_SET`, `mSl = mOn && LOCO.slots`. Every switch read in the graph goes through them: `locomotion` pace (was
  :947), `capt` (:1030), the slot set / slot timers (:1784 / :1789), crouch capture `mcC` (:1832), the keyedSet pace
  (:1837), `keyMocap` (:1849), `keyedSet`'s clip set, share and slots (:1945, :1967 / :1968), the crouched capture's
  layer scales (:2036), the drawn crouched legs (:2251), and `clipFeet` (valid, the duty carry, the reset: :2463-2470).
  No `LOCO.` read is left in the graph outside those three assignments.
- `src/player/characterRig.ts`: `mOn = LOCO.mocap && this.carrier` set at the top of `animateFrame`, which also writes
  `i.mocapOk = this.carrier`. Used for `pin.mocap` (:1974, the planner's clip-plant rules), the switch-toggle check
  (`mocapWas`: the `switchFade` cross-fade start and `clipFootOff`, :1977-1985), the foot pitch rate cap (:1996), the
  rest-shift rate (:2409), `poleM` (:2555) and the crouched foot-yaw path (:2681).
- No allocation: three field writes in the graph and two in the rig per frame. The OFF path is unchanged (with the switch
  off `mOn` is false exactly where `LOCO.mocap` was, and `mS` / `mSl` equal `LOCO.set` / `LOCO.slots`).

## Numbers
- Guard ON vs OFF (grunt / heavy / officer; patrol walk 1.4, walk 1.4 then stop, walk 1.4 turning 2 rad/s, jog 3.0 then
  stop, run 5.0 then stop; switch on throughout and flipped on at frame 60 / off at 120): before, up to 0.79 in a world
  matrix element on the patrol walk alone (39,730 values differ); after, 0 values differ in every case, keyMocap 0,
  clip feet 0 frames.
- Guard identity fixture with `setMocapLocomotion(true)`: before 17 / 64 moved, after 64 / 64 match.
- Wren, switch ON (the mt-check dump driver with the switch on, operatorRig, 7 plans x 420 frames): carrier rows
  bit-identical to 7144a03c (0 values differ on all 7). Non-carrier Wren rows ON now equal the OFF rows (0 differ).
- Switch-OFF dump (`scratch/mt-check/repro/dump.test.ts`): md5 9ce3f3d1c70c299dca072d3a4f15f9ea, 31,065,812 B
  (byte-identical).
- mocapSwitch "no allocation per frame": passes (the bare-graph frame is unchanged; the gate adds field writes only).

## Tests
- New `tests/mocapGuards.test.ts` (3 tests): guard fixture 64 / 64 with the switch on (reuses
  `tests/helpers/animSkeletonGuardIdentity.ts`); guard ON and mid-walk flip bit-identical to OFF over 5 scenarios x 3
  kinds, keyMocap 0, no clip feet; control: the same build as a holstered carrier still takes the mocap set (keyMocap
  > 0.5, clip feet, pose moves). Run against 7144a03c's source the first two fail (17 / 64; 39,730 values).
- Run one file at a time, all pass: mocapPlayer (10 + 1 skipped), mocapSwitch 13 (incl. allocation), mocapFix2 11,
  mocapStopPitch 1, mocapShortStart 1, mocapRunTurn 4, mocapCrouch 6, mocapCrouchShift 2, mocapSprint 10,
  mocapQuickStop 7, mocapDefault 3, footPlanner 12, animSkeletonIdentity 1, animSkeletonGuardIdentity 1, mocapGuards 3.
- `npx tsc --noEmit -p .` clean; `npx eslint` on the three files clean. No e2e (brief).

## Not done / open
- Other non-carrier rigs also keep the hand-keyed set with the switch on: the menu preview Wren (menuScene.ts:438), the
  Anim Studio stage rigs (studioStage.ts:629 / :673), the VIP, the training dummy, the operator lab. Per M4 the switch is
  the player's and the partner's; if the Studio should preview the mocap set, set `carrier` on its Wren (one line).
- The comments at animGraph.ts `keyedSet` / `speedSet` still say "LOCO.set" for the switch's set (now `mS`, the same set
  on a carrier).

## Changelog entry (for the lead)
- Mocap locomotion: the switch now drives Wren only (the player and the co-op partner); guards keep their hand-keyed
  walk and the planner's feet with it on (they took the mocap walk and its clip feet before).
