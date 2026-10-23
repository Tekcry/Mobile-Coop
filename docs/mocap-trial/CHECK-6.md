# mocap-trial-2 - check 6 (fresh checker, Opus, on feature/mocap-on d60f374f)

2026-10-23. Verdict: **FIX** (1 required item). Round F does what MT2-FIXF.md says: clip plants hold the heel / ball on
straight gaits and turns (all 64 turn rows and 5 straight rows <= 0.01 cm, twist at lift 14.3 deg). No regression against
CHECK-5 beyond one toggle row (A8 class, note). Switch OFF is byte-identical. The flip and its migration are correct.
The required item is about scope: with the switch on (now the default), every guard and co-op guard puppet walks with
the CMU mocap set and clip feet. No doc covers this and no test runs it.

## Required
1. **Guards run the mocap set by default.** `buildEnemyRig` guards (host guards and co-op client puppets) at a
   holstered-style patrol walk (aim 0.2, stride 'facing') take the keyed walk band (`keyedOk`, animGraph.ts:1779). With
   `LOCO.mocap` on, `o.keyMocap` (animGraph.ts:1849) and the share in `keyedSet` (animGraph.ts:1967) give them the mocap
   set's walk and clip feet. Nothing gates this on the rig being Wren. Headless (c6out/zzguard.txt, grunt / heavy /
   officer):
   - patrol walk 1.4: keyMocap 0.80 ON (0 OFF), clip feet on 180 / 180 frames, joints up to 21.9-22.7 cm off the OFF
     pose;
   - walk 1.4 turning 2 rad/s: joints up to 76 cm off;
   - jog 3.0 then stop: keyMocap 0.77, joints up to 29.7 cm off;
   - aim walk: unchanged (0.00 cm).

   The identity fixtures run with the switch on (c6out/zzidon.txt): guards 17 / 64 hashes differ (every kind's walk and
   aimWalk; dog:crouchAim). Wren 3 / 40 differ: partner:moves (expected), state:aimPistol, state:wall.

   This contradicts the brief and the UI. BRIEF M4 says "the hand-keyed set stays behind the switch", the Settings label
   says "Wren walks...", and FIX-1.md says "guards ... uncapped". No test has driven a guard with the switch on:
   animSkeletonGuardIdentity runs with `LOCO` at its module default (off).

   Suggested fix: gate the mocap set on a per-rig flag. The natural one is `CharacterRig.carrier` (true for the player,
   player.ts:195, and remote players, remoteAvatar.ts:157; false for guards and the menu preview). Pass it in AnimInput
   (e.g. `i.mocapOk = this.carrier`) and use `LOCO.mocap && i.mocapOk` at animGraph.ts:947 (mPace), :1030 (`capt`),
   :1832 / :1837 / :1849 (crouch capture, keyedSet pace, keyMocap), :2251, :2463-2470 (clip feet / duty carry), and in
   the rig at characterRig.ts:1974 (`pin.mocap`), :1996, :2409, :2555, :2681. Then add a test: guard identity with
   `setMocapLocomotion(true)` matches the OFF fixture (64 / 64).
   If guards are meant to use the mocap set, that needs a recorded decision (A10) and a guard ON pop / slide sweep, not
   a silent default.

## Notes (not blocking)
- zzplayer, new flag (toggle group, A8 class): `G toggle jog 2.8 off 0.31` TGL kneeL-ankleL 25.0 deg (CHECK-5 23.9; OFF
  17.0). Probe (c6out/zzprobe.txt): 0.11 s after toggling back ON, a planner plant becomes a clip plant (frame 131,
  anchored, pitch 0.44) and lifts 2 frames later; the lift frame steps 25.0 deg. A8 names run / sprint toggles only.
  Add this row to A8's numbers in the PR body, or ease the lift of a just-taken-over clip plant.
- Round F raised one landing pop, within the rule: `B v 5 flick 90 off 0` ON kneeR-ankleR 22.9 -> 28.4 deg (OFF 59.0),
  on a clip plant's landing frame (frame 414: contact, clipPlant, anchored, plantT 0). It is the rig-limit skip for
  anchored clip plants (characterRig.ts:2661-2663) on the landing frame. 22 other ON rows are worse than CHECK-5, all
  within the rules; the largest are B 5.0 flicks +1.4 to +2.7 deg (OFF 48-62) and A 1.4 x 0.3 go 1.73 pelvis
  0.55 -> 1.35 cm (OFF 3.74).
- Remote partner, approximated headless (c6out/zzremote.txt, 43 plans): root on the CT path; rig speed from 20 Hz
  snapshots low-passed at 10/s as in remoteAvatar.ts:349-353; no quickStop / holdSpeed. ON is mostly far better than
  OFF (v 5 starts: pelvis 4.81 vs 7.31 cm, bone 25 vs 34-40). Three marginal flags against an approximate harness:
  - flick 2.8 180 off 0: pelvis 2.01 cm (limit 2.00, OFF 0.72);
  - crouch at 2.8: pelvis 3.56 vs OFF 3.15 (the E crouch note class);
  - ladder: bone 24.6 vs OFF 22.6.

  Worth one look on the e2e-coop run; not required.
- zzalloc2: ON <= OFF on the minimum (13,842 vs 19,386 B; 10,703 vs 12,803 B per frame). The medians are ~1-2% higher
  ON (35,870 vs 35,607; 26,103 vs 25,674): noise of the NullEngine baseline.
- Test tier: the PR touches src/player and src/core/settings, and every e2e suite now runs with mocap ON (no script sets
  `?mocap`). The slice row needs e2e-coop / e2e-netmove besides the full e2e and the GPU e2e-anim the lead runs.

## Checks
1. **Round F.**
   - tests/mocapPlayer.test.ts: 10 passed, 1 skipped (item 5, A8).
   - Turn rows (jog / run 90 / 180, 8 offsets x 2 sides): contact slide <= 0.01 cm, twist at lift 14.3 deg on all 64.
   - Straight rows: walk 1.4 0.01, 2.0 0.00, jog 2.93 0.00, run 4.2 0.01, sprint 5.0 0.00 cm (3+ plants each).
   - Measure parity with e2e-anim.mjs:389-510: the helper's `turnFeet` / `straightFeet` (tests/helpers/mocapPlayer.ts:150-194)
     use the same reading. That is metrics.ts `contactSlide` on the rendered heel / ball (footGeom HEEL_BACK / TOE_BALL /
     HEEL_DOWN on the ankle node, as e2e's `contactPts`) over every `planner.contact` plant, and the same lift rule (twist
     from `pin.yaw` while planted, taken at the frame contact drops).
   - The helper covers more than e2e: 8 turn offsets over the gait phase and a window from 0.2 s before the turn,
     against e2e's single 1.0 s pre-roll and 1.2 s window. The turn itself is CT's rate with a pace dip, not the
     controller. It is the same measure, run more strictly.
   - gaitNumbers change (mocapMeasure.ts:237-241, `plantedSlide` on the ankle -> `footSlide`): **fair, not a loosening.**
     It is exactly e2e-anim's foot locking read (e2e-anim.mjs:384: anchored-at-first-frame plants at heel / ball, others
     at the ankle). The old ankle read was blind to a pinned ankle's contact slide (base 0.00 while the heel / ball moved
     5.1 cm). An anchored plant whose ankle travelled without its contact being held would still fail. The new straight
     test reads every plant at the contact independent of `held`. The limit (1 cm) is unchanged, and the pin check
     (`pinErr` < 0.5 cm) is still asserted.
2. **No regression vs CHECK-5.**
   - zzplayer (188 plans, c6out/zzplayer.txt): 9 flagged = CHECK-5's 8 (6 G toggles A8, 2 E crouch 2.76 vs 2.71 note) +
     the G jog toggle above.
   - OFF columns identical to c5out on all 188 rows (diff script c6out/diff.mjs).
   - repro2 zzstarts (450 starts): ON worst 19.2 deg, 0 over 24 in all 15 rows.
   - zzstops: ON worst 20.3 deg (2.2 m/s) vs OFF 29.2-38.0.
   - zzalloc2: ON <= OFF (above).
3. **Switch OFF byte-identical.** The repro dump is 31,065,812 B, md5 9ce3f3d1c70c299dca072d3a4f15f9ea. The dump does
   not call the switch. It runs on `LOCO`'s module default (`mocap: false`, src/anim/mocap.ts:166), and only app.ts:137
   / :141 apply the stored setting. Neither is imported by the dump, so it does not depend on the stored default.
4. **The flip.**
   - Default on (settings.ts:157), `MOCAP_V = 1` (:165).
   - Migration (settings.ts:371): with no `mocapV`, or below 1, the setting takes the default (on); at 1 or above, the
     stored value. `sanitizeSettings` always writes `mocapV: MOCAP_V` (:326), so the first `update` persists it.
   - tests/mocapDefault.test.ts covers: an old save with off turns on once; a save at 1 keeps off through a round trip.
     A save at 1 with a broken value goes to the default (mocapSwitch:395).
   - The Settings reset of the Gameplay tab sets it on (settingsScreen.ts:212). The label is updated (:156).
   - Co-op: `LOCO` is global and only app.ts writes it, so a partner drawn here follows this machine's setting. Nothing
     in src/net or src/save mentions mocap, so nothing goes on the wire.
   - No `SAVE_VERSION` bump needed: settings live in the kv store, and `camV` is the precedent.
   - Remote avatars and guards: see Required 1 and the remote note.
5. **Repo tests, one file at a time:**
   - mocapDefault 3/3, mocapSwitch 13/13, mocapFix2 11/11, mocapStopPitch 1/1, mocapShortStart 1/1, mocapRunTurn 4/4,
     mocapCrouch 6/6, mocapCrouchShift 2/2, mocapSprint 10/10, mocapQuickStop 7/7, mocapPlayer 10 + 1 skipped;
   - settings 14/14, settingsCover 1/1, footPlanner 12/12;
   - animSkeletonIdentity and animSkeletonGuardIdentity: 1 + 1 skipped each;
   - tsc --noEmit clean (zz copies excluded); eslint src/anim src/player/characterRig.ts src/core/settings.ts exit 0.

## Code read (round F)
- `holdPitch` (footPlanner.ts:780-787) mirrors anchorFeet's re-place (:758-769) for the rig's capped pitch. It is called
  only in the switch-on pitch-cap branch (characterRig.ts:1996-2003).
- The `uncrossIn` ramp (footPlanner.ts:878-890) runs only for a `clipOwn` mover, so OFF is unchanged.
- The `heelP` fade on lift (:1457) runs only when `clipPlant`.
- All the new gates are ON-only, consistent with the byte-identical dump.

## Ran (scratch/mt2/check6 = git archive d60f374f; outputs scratch/mt2/c6out; scripts c6out/run.sh, run2.sh)
- From run.sh, in order: mocapPlayer (with MOCAP_PLAYER_LOG); zzplayer; zzstarts; zzstops; zzalloc2; the repro dump
  (as tests/zzdump.test.ts); the 15 repo files; tsc; eslint.
- New probes in tests/:
  - zzremote: remote-avatar-style driving;
  - zzprobe: per-frame state at the G jog toggle and B 5.0 flick worst frames;
  - zzidon: the identity fixtures with the switch on;
  - zzguard: buildEnemyRig guards OFF vs ON.
- No GPU suites, no e2e.
