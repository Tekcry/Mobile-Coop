# CT prototype - polish list

Cosmetic and feel items that do not block play. Nothing here is worked on until Michael has playtested the core loop
(Current goal, 2026-10-19). Source in brackets: PLAYTEST-1 check id or slice report.

## Feel and animation
- (Moved to the prototype, 2026-10-19: Michael via the main session, "fix the characters posture", in game, incl. the leg fix.) Turn follow: legs cross and step backwards (turn-1 to turn-6); plan in
  `A1-TURN-FIX-PLAN.md`. Slice P1 builds it with basic posture on Wren; fine tuning stays here.
- Guards move "weird / unnatural in general" (turn-7).
- Grab and carry need animations (grab-3).
- Tense sneak crouch near guards (G160), posture on Wren.
- First step a full stride; bank into running turns (M1).
- The frozen stop stance is not sent to the partner (M1).

## Camera and aim
- Exact explore offset toward the right shoulder, aim view angle and height against the footage (cam-2, cam-3, cam-5);
  F1 makes a first pass.
- Aim slow and precise as CT (gen-cam).

## Goggles
- Thermal, night and electro looks against the footage docs (gog-2, gog-4); electro interference on devices.
- Round goggle lens outline (gog-1).
- Goggle on the brow when off (G73); the stowed goggle export is Wren cleanup (G161).
- Thermal thresholds tuned on the GPU (A5).

## Doors and wall
- Lock picking (CT had it, G178; no code yet).
- Optic cable (stub).

## Tests and tools
- `anim-audit.mjs`, `anim-sheet` and `e2e-ct-warehouse.mjs` still drive the brace, the old stack and removed edge verbs.
- `e2e-ct` sprint check and stale pad-Y line; `e2e-camera-bounds` level U, `e2e-stealth` camera free-orbit (pre-existing).
- `docs/systems/testing-tools.md`: add e2e-ctcourse.
- Stale `.tac-gear` CSS, unused `sprintHold`.

## Menu job (sent to the main session)
- Brightness and quit-to-menu dialogs overlap the main menu (menu-1); remap screen vs CT layout (menu-2); dead settings
  rows (menu-3).
- T1 test cleanup (2026-10-19 e2e:quick after the Wren merge): update stale assertions in e2e-mouse, e2e-move,
  e2e-traverse, e2e-combat, e2e-enemies, e2e-modes, e2e-stealth, e2e-anchors, e2e-ct, e2e-ct-warehouse, e2e-editor
  (D-pad door tool) to the CT layout and removed moves; e2e-kestrel and e2e-camera-bounds pre-existing. Needed before
  the PR's full e2e.
- P1 check polish (P1-CHECK.md, PASS): loose turn test bounds (scrub < 4 rad at 60 Hz, plan 0.15); a held spin may
  pop feet; run lean moves guard and player head hit volumes slightly (they read rig bones); owner vs remote stride
  thresholds differ slightly; check the lean while carrying a body; e2e-anim spine-pitch allowance 0.16 for all
  segments.
- F1a check polish (F1A-CHECK.md, PASS): old saved binds can clash with the new defaults (warned, ids ignored); pad A
  is interact only holstered, reload drawn, so doors and the grab menu need a holster first (walkthrough question);
  `refreshRing` and the wheel hint allocate per step while the wheel is open (hot-path rule); client strike always a
  knockout on the host and left-shoulder gun right-handed on remotes (stubs); LB held 0.15 s opens the wheel instead
  of switching; RMB chord in pointermove may toggle draw twice (unconfirmed).
- F1b check polish (F1B-CHECK.md, PASS): noticeOpenDoors iterates a Set every 0.25 s (iterator allocation); a client
  sees a host-held door at up to 0.7 swing as fully open; a fully open door snaps to 0.7 if a peek starts on it; a
  pull-back to the crack can re-add the door body with a guard in the doorway.
- B3 check polish (B3-CHECK.md, PASS): `zoneSet` in ctDevices.ts is never cleared, so after a bay-3 restart the
  station 3 door may not reopen (latent: needs both players downed; fix with B8 revive / restart); `targets.find`
  closure while the jammer is held (hot path); client-reported speed trusted for the stand-still rule.
- Crouched hands reach toward the ground ahead of the knees: handed to the Character Build session (feature/anim-cleanup
  finishing session tunes animGraph xCrouch / zCrouch / flexCrouch for hands on the thighs, plus the wrist). This
  branch does not touch those three constants.
- B4 check polish (B4-CHECK.md, PASS): the host checks the throw landing ring (2.2-4.2 m, within 1 m of the floor) but
  not direction or geometry (a cheating client could land through a thin wall); some test titles still say protocol 17
  (asserts say 19); an unanswered throw offer holds the thrower still up to 20 s (B cancels).
- B5 check polish (B5-CHECK.md, PASS): a NaN floor at a map edge still offers the hang-down; the host does not
  re-raycast the claimed hang point; stale `teamPairs` entries; the holder can stay frozen after the partner drops on
  the lost-holder timeout (walkthrough: known issue, B / restart frees); narrow hatch probe.
- B6 check polish (B6-CHECK.md, PASS): a `?? 100` hp fallback skips the floor; the first finisher pays 10 HP if the
  partner never starts (by design, walkthrough note); a damageMul above 1 would break the 1 HP floor.
- B7 check polish (B7-CHECK.md, PASS): stale teamPairs entry after a lost-holder slide; hangPoint runs about 9 rays
  every idle frame for a standing player with a mate within 12 m (perf); a rope offer replaces the throw at any
  2.2-6 m edge; the climber clips the wall corner on top-out.
