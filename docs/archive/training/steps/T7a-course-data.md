# Step T7a - course data, gates, devices, radio (Block C)

Model: implementer opus, checker opus. Deps: T6. Data and wiring through the course framework only (no new systems).

## Read
- BAYS.md each bay's "Co-op split and gate", "Sequence", device tables (B6 :386-485, B9 :645-735), the airlock rule (7-70)
- FEATURES.md "Placeholder if not built" column (the now forms)
- src/game/course/courseDef.ts (T1a types); the course stubs in the bunker files
- docs/story.md 28-58 (tone and radio rules), 94-122 (LANTERN's voice); src/security/data.ts (camera records)
- src/game/missions.ts 160-230 (ObjectiveChain) for B9's objectives; src/world/mapDef.ts 54-66

## Task (decisions)
1. `src/world/maps/bunkerCourse.ts`: the full `CourseDef` for bays B1-B9 and airlocks A1-A8 (replace the stubs), validated
   by `validateCourse` in a unit test. Gates in their now forms per FEATURES; every element listed as an `ElementFlag`
   with its feature id and `final: false` (or true where the feature exists today).
2. B1: per-player locker pickups ("Open locker", perPlayer flag `kitted`); A1 needs both kitted.
3. B2: lever gates (each lane's lever -> the other lane's x 24 door). B3: anchorLock on the fan guard until the CR
   isolator switch flag. B4: bolt (W1 door from the C2 side), timedHold (the sluice), the C3 ladder open.
4. B5: mains gate (A5's door while the MB group is off). B6: card pickups (A in locker 7, B on a switch at B6-GR's
   desk as the now form, M at the mantrap post) setting flags; flag gates on RD1-RD4; the mantrap egress switch; the
   exit keypad as three numbered switches with the right one shown by a lit sign seen from CR (a wrong press: every B6
   guard investigates the keypad via the existing hear path); S6's top door locks after both pass.
5. B7: "Store key" switch at B7-O's desk -> flag gate on the store door. B8: the cease-fire switch -> bolt gate opens the
   catwalk stair; live fire: both players past the firing line after the weapon drills (a course trigger box) -> the course
   alerts B8's squad (`alert()`), logged as an event. B9: objectives key A, key B, case (pickups -> flags), the pair gate
   on the two key switches (window 1.0 s) -> lift doors; both in the lift -> `courseDone`.
6. Devices now: S1 cameras through `MapLayout.security` for B6 CAM1-4, B8 CAM-R, B9 CAM-P1 / P2 (fixed / sweep per
   BAYS), with no desk (S1 Part A has none); every other device is a mount point with its now form above.
7. Hide spots, alarms (B9 panel), reinforce (B9 staff tunnel), objectives in `MapLayout`.
8. Drills (D18, D30): every FEATURES row placed in a bay becomes a `DrillDef` in teaching order, with its `who` (both,
   lead, second, either per FEATURES section 11 and the swap rule), its tutorial text (what to press, glyph tokens for
   pad / keyboard, <= 90 characters) and its marker (device id or point). Rows marked "not a drill until ... lands"
   get an ElementFlag but no drill. No drill can be skipped.
9. Radio lines: per bay, 4-8 LANTERN lines (enter, each gate, done), British spelling, <= 90 characters, dry, none
   during combat (the framework holds them while a guard is at level alert). Team variants only (2 players).
10. Kit: every gadget at normal carry, every weapon class in the B8 kit lockers (the course loadout), `?kit=all`
   equivalent when V3's kit exists (an ElementFlag).

## Tests
`tests/bunkerCourse.test.ts`: validateCourse passes; every airlock box matches BAYS; every gate's door / switch exists in
the built level; every radio line <= 90 characters and has no em dash; every FEATURES "now form" row in a bay has an
element flag; every placed FEATURES row is a drill or is marked "not a drill until it lands"; every drill has a
marker and a text.
`scripts/e2e-bunker.mjs` gains the B1 airlock refusal check: both on the A1 pad with B1 drills open, the HUD names the
open objectives and the rear door stays unlocked (A48).

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course e2e-security smoke`. The checker walks one
headless player with T1b's `?course=solo` test flag (one player cycles airlocks) from B1 to L9 and confirms every gate opens with its now form.

## Commit
"training T7a: course data, gates, devices and radio for every bay". Docs: FEATURES.md statuses unchanged (now forms),
LOG, STATE, CHANGELOG.

## Carry-over from T4 (A9, A37)
- B6 readers: restore a per-player "swipe card" verb (a reader opens for the player holding that card; D30), so the
  mantrap egress is not redundant. S6's top door: a gate kind that relocks after both players pass.
- From T5 (A40, A43): move B7-O's window stop and B7-R's ledge-pull stop to the built window and parapet; make
  "unbolt the catwalk stair (CS)" a B8 drill so the co-op beat survives the vaultable rail.
- From T5d (REVIEW-NOTES, UPPER_ELEMENTS): B2's RL2 door `B2-rl2` (locked) becomes the A61 one-way single-occupancy return
  turnstile; the 2E practice panes re-glaze (A54); the A61 re-lamp rule; B1's strike post as a TrainingDummy at (12.5, 10).
- From T5e (REVIEW-NOTES, SHAFT_ELEMENTS): B3 `B3-w5` / `B3-mlr` (locked) and NR's gap become A61 turnstiles; CR's window the sprung rope-only pane (A53); RF's hatch below-only; duct grilles unscrew-only and louvres kick-only, self-closing; B4 rail gate; B4 P5 float shaft and greyed line.
- From T5f (REVIEW-NOTES, PLANT2_ELEMENTS): B5 circuits L1-L4, HB / CG lamps and re-lamp; B6 security mount points as devices; RELIEF_DOORS for T7b; S6 relock.
- B6 roles bind per player (R3, A37): card M on the shared CO lets one player open RD2-RD4 and key 2 needs no code, so
  T7a's per-role drill ticks must make the operator / runner split mandatory for two players.
- From T5g (REVIEW-NOTES, DEEP_ELEMENTS): B7 / B8 / B9 circuits and re-lamps; B8 props and CAM-R; B9 devices (CAM-P1 / P2,
  desk, beam, PIR, alarm, reinforce, P3 switch in the duct door); greyed lines (whistle, drag, V3, Phase 5 / 6); DEEP_RELIEF_DOORS for T7b.
