# Step 21w - back-to-wall polish (Michael's play check, M14 N1-N3, N5)

Model: implementer opus (budget ~100); checker opus (movement state + net). Depends on: 21. Commit: "locomotion 21w: back-to-wall polish".

## Read
- docs/locomotion/PLAY-NOTES.md, DECISIONS.md M14, D8, D9, D10, A1, A23, A45, A47; bible 5.3 (grep -n '5.3' docs/design-bible.md).
- src/player/wallController.ts (grep the entry, slide, edge, peek, lean, swat, leave paths), src/config/movement.ts WALL, src/player/shoulderCamera.ts (wall / peek framing), src/anim/animGraph.ts wall poses, src/net/remoteAvatar.ts wall branch, scripts/e2e-wall.mjs, scripts/e2e-netmove.mjs wall cases, steps/11, 12, 12b, 27 carried lines.

## Task (Michael's notes, play-tested on the laptop)
1. Edge behaviour: pushing along the wall at an end STOPS the body at the edge and keeps it on the wall (no walking round the corner, no falling off). Pushing further toward the open side peeks (head), aim leans out (D9 / D10 unchanged). Only pulling the stick away from the wall (held, not a brush) or the context button leaves the wall. Outside corners and wall ends both behave this way.
2. Crouch on any wall: the crouch input works while on a high wall (crouched back-to-wall, same slide / peek / lean rules, D10 for low walls unchanged); stand / crouch transitions on the wall without leaving it.
3. Slide speed: a slow shuffle, ~0.9 m/s standing at full stick, ~0.6 m/s crouched, analog below; sidestep cadence matches the speed (no foot skate).
4. No pops or snapping: entry, slide start / stop, edge stop, peek in / out, lean in / out, crouch / stand on the wall, leave and SWAT all blend (Inertializer, <= 0.25 s), joint rate within the audit limit.
5. Camera: no jerks or clipping at edges and corners: the wall / peek framing eases (no single-frame jumps), the camera never goes inside geometry (sweep test), shoulder side follows the edge smoothly.
6. Control: entry only on an intentional context press near a wall facing it within the step 11 rules; no accidental peeks from small stick noise (deadzone / hold time on the edge push); reliable peek when intended.
7. Pose: body and shoulder blades on the wall (gap <= 3 cm, no clip), holstered arms relaxed per M14 (off hand may rest on the wall when still), no weapon through the wall.
8. Co-op (D8): remotes pose from MoveState wall bits including crouched-on-high-wall; add WALL_SUB bits only if needed (PROTOCOL_VERSION bump then). Two players stacking still work.

## Tests
- e2e-wall: edge stop (push 2 s past the end: still on the wall at the edge, position within 5 cm of the end), crouch on a high wall, slide speed 0.9 / 0.6 m/s (+-10%), leave only on pull-away / button, peek needs a deliberate push, camera per-frame jump <= a bound, no geometry inside.
- e2e-netmove: crouched high wall case and edge stop under 10 cm; stacking >= 0.6 m.
- anim-audit wall / walledge / wallopen / walllow rows: no new fails; pops and joint rate at entry / leave within limits where step 27 is not required.
- Unit tests for any pure edge / speed logic.

## Checks
- `npm run check`; implementer: e2e-wall, e2e-netmove, e2e-coop, e2e-pad, e2e-mouse once each (port 4191). Checker: e2e:quick (M11), GPU anim-audit local + remote with --compare, anim-sheet wall / wallcrouch / wallslide / walledge (side, front, ots) read by eye, perf-trend.
- PC-PASS: Michael plays the wall system on the laptop at the pause after 21v.
- Carry from step 21 (fix round 1, REVIEW-NOTES): hairline wall rows wallopenL-rifle selfUpperArmL 2.0 cm (0.02018 m), wallopenR-rifle elbowR 150.77 deg, walllowR selfUpperArmR 3.6 -> 5.8 mm (step 21's arm changes). Also worse local wall rows (fix round 2 re-check): walledge@60 footSinkL 10.5 -> 11.8 cm; walllowL selfForearmL 6.7 -> 7.7 cm; walllowR footSlideL 5.2 -> 5.7 cm and footFloatL 3.0 -> 3.7 cm; wallopenR-pistol footSlideL 2.2 -> 2.5 cm; wall@120 footSlideL 0.4 cm and footSinkL 0.4 mm; remote wallopenL selfUpperArmL 2.4-2.6 cm. Fix with the wall poses here.
