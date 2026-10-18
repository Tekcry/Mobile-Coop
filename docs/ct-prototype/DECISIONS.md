# CT core feel job - decisions

Michael's words quoted verbatim; they move to `docs/DECISIONS.md` as G entries at merge. Assumed decisions are A1, A2,
... with how to undo them (cite as "feel A1" outside this job).

## Michael
| Date | Topic | Michael's words | Replaces |
| --- | --- | --- | --- |
| 2026-10-18 | Job shape | "Core feel first" / "I feel like I want to start fresh focusing on fine tuning first then gameplay." | prototype-first order for movement |
| 2026-10-18 | Speed of work | "I want a quicker prototype so we aren't wasting time" (Sonnet, medium implementers) | G88 for this job |
| 2026-10-18 | Camera | "Camera doesn't automatically adjust/move at all in CT, it's manually controlled." | G29 swing toward travel, loco M20 Q11 |
| 2026-10-18 | Sneak posture | "The characters crouching posture changes when in vicinity of an enemy and sneaking slowly, almost like trying to be quieter and moving on tippy toes and over exaggerated balancing." | - |
| 2026-10-18 | Camera code (review) | "Rewrite core (Recommended)": rewrite the framing and follow core of the shoulder camera; keep collision and near-plane code | - |
| 2026-10-18 | Turn follow (M1 note 3) | "Hips and legs seem to follow the body to prevent clipping or awkward stances when walking in circles or turning etc based off ct footage. Must review before making changes" | - |
| 2026-10-18 | Job shape (2) | "Prototype pass now (Recommended)": build each area once to the decision numbers, light tests, a short play, notes logged; fine tuning and Wren posture in a second pass after all five areas exist | G150 tune-until-sign-off per area (back to G4 for the first pass) |
| 2026-10-18 | Orchestrator model | "Keep Opus orchestrator"; implementers stay Sonnet, medium | - |
| 2026-10-18 | Stops | "After each area (Recommended)": five short stops (camera, body, wall and doors, strike and grab, goggles) | - |
| 2026-10-18 | Goal (G161) | "Prototype movement focus first ct-pure, then full coop loop"; "It can run overnight but not yet. I'm still awake. Also we should focus on the ct training coop session."; "Yes, push to ct-movement"; "Yes, Opus for those"; "Rebuild Fallow on it" | G150 tune-until-sign-off; Pumphouse Nine |
| 2026-10-18 | Turn follow plan | "Build 3 fixes, then play": after the camera round, scale turn rate with speed, planted feet follow the body in every state, remove reversal-pivot leftovers and fix the crossing guard (A1-TURN-FOOTAGE.md) | - |
| 2026-10-18 | Wall, doors, pad (review) | "Adjust, new pad (Recommended)": adjust wall and doors; rewrite the pad and key tables to CT's layout | - |
| 2026-10-18 | Other areas (review) | "Adjust all (Recommended)": body, anim graph, strike and grab, goggles, co-op wire are adjusted | - |
| 2026-10-18 | First round | "Cleanup + camera (Recommended)": delete auto recentre, aim assist, camera look-ahead; fix the stepAssist allocation; rerun e2e-netmove, e2e-pad, e2e-mouse; then the camera rewrite | - |

## Assumed
None yet.
