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
| 2026-10-18 | Goal (G179) | "Prototype movement focus first ct-pure, then full coop loop"; "It can run overnight but not yet. I'm still awake. Also we should focus on the ct training coop session."; "Yes, push to ct-movement"; "Yes, Opus for those"; "Rebuild Fallow on it" | G150 tune-until-sign-off; Pumphouse Nine |
| 2026-10-18 | Bunker (B0 questions) | Relay "CT hanging ladder (Recommended)"; other bays "Park behind a flag (Recommended)"; level "Fresh compact level"; fail cost "Health hit (CT) (Recommended)" | B0 survey mapping onto bays 1-4 |
| 2026-10-18 | Playtest 1 answers | D-pad "research how it was mapped in CT"; draw "About half (0.3 / 0.4 s)"; panels "One panel per station"; vision "Use the footage docs" | G103 raise timings (prototype) |
| 2026-10-18 | Controls (after CT-CONTROLS.md) | Speed "D-pad up / down too" (plus stick push and the wheel); goggles "incorporate blacklist style menu that allows selection of weapons, gadgets, and vision mode. Single button only toggles that one vision selected."; aim "Yes, CT scheme" (X draws / holsters as a toggle, LT knockout / RT lethal holstered, LT / RT fire drawn, L3 shoulder and R3 zoom aiming, LB tap switch / hold menu, A also reloads) | G100 cycle order; the CLAUDE.md "Blacklist is history" line for this one menu (Michael's explicit pick) |
| 2026-10-18 | Turn follow plan | "Build 3 fixes, then play": after the camera round, scale turn rate with speed, planted feet follow the body in every state, remove reversal-pivot leftovers and fix the crossing guard (A1-TURN-FOOTAGE.md) | - |
| 2026-10-18 | Wall, doors, pad (review) | "Adjust, new pad (Recommended)": adjust wall and doors; rewrite the pad and key tables to CT's layout | - |
| 2026-10-18 | Other areas (review) | "Adjust all (Recommended)": body, anim graph, strike and grab, goggles, co-op wire are adjusted | - |
| 2026-10-18 | First round | "Cleanup + camera (Recommended)": delete auto recentre, aim assist, camera look-ahead; fix the stepAssist allocation; rerun e2e-netmove, e2e-pad, e2e-mouse; then the camera rewrite | - |
| 2026-10-19 | Walkthrough questions (relayed by the orchestrator, not verbatim) | Wheel "LB hold, keep it"; lethal / non-lethal switch "no, LT / RT is enough"; gun drawn, A reloads "keep it"; scanners "no HP cost when the partner never started; keep the 10 HP for a late or abandoned hack" (a later slice) | - |
| 2026-10-19 | Hang shimmy speed (relayed by the orchestrator, not verbatim) | "Slow the hang shimmy to about 0.7 m/s so the hands step slower and wider" (was 1.2 m/s; slice D2b) | - |

## Assumed
| A1 | Selection menu on LB hold (weapons, gadgets, vision mode), LB tap switches weapon; vision toggle on D-pad left; D-pad right free (gadget quick use if one is selected); D-pad up / down speed | Undo: move the toggle to D-pad right or the menu to another button in `padBinds.ts` |
