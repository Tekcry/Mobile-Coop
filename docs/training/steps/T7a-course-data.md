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
8. Radio lines: per bay, 4-8 LANTERN lines (enter, each gate, done; a line naming any drill that is not live yet:
   "That drill isn't live yet. Skip it." style), British spelling, <= 90 characters, dry, none during combat
   (the framework suppresses lines while any guard is at level alert). Team variants only (2 players).
9. Kit: every gadget at normal carry, every weapon class in the B8 kit lockers (the course loadout), `?kit=all`
   equivalent when V3's kit exists (an ElementFlag).

## Tests
`tests/bunkerCourse.test.ts`: validateCourse passes; every airlock box matches BAYS; every gate's door / switch exists in
the built level; every radio line <= 90 characters and has no em dash; every FEATURES "now form" row in a bay has an
element flag.

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course e2e-security smoke`. The checker walks one
headless player with T1b's `?course=solo` test flag (one player cycles airlocks) from B1 to L9 and confirms every gate opens with its now form.

## Commit
"training T7a: course data, gates, devices and radio for every bay". Docs: FEATURES.md statuses unchanged (now forms),
LOG, STATE, CHANGELOG.
