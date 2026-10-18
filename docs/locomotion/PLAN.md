# Locomotion run - plan

Authority: DECISIONS.md > bible (1.13, 5.17) > this file. Inputs: AUDIT.md and docs/locomotion/audit/*.
Each step has a file in `steps/` (80 lines or fewer). Every step runs `npm run check` and `npm run e2e:quick`; a step that
touches a movement state or src/net also runs e2e-netmove and e2e-coop. Checks marked "rerun after 20" are recorded as
pending and rerun at the Block C end as two-page `?net=local` cases (M12: step 20 dropped; list in STATE.md). Block end: full `npm run e2e` (background) + `node scripts/perf-trend.mjs`.

Baselines (STATE.md): sim p95 2.65 ms, anim 0.0504 ms/char (this VM); netmove worst 3.7 cm (limit 10 cm).
Pre-existing failure: tests/kestrelMap.test.ts (kestrel-owned).

## Phase 5 hooks (built as hooks only)
- H1 drag accepts any target (`DragTarget = guard | body | player`), downed team-mate included; only guards / bodies are wired.
- H2 medkit use accepts any target (`useMedkit(target)`); only self is wired.
- H3 the generic committed-move request (`cmove` / `cstart {t0}` / `cdeny`) accepts future kinds (team moves, clutch saves).
- H4 team-move table entries for split-jump boost, back-to-back, pull-up, rappel anchor: kinds reserved, not built.

## Block A - Removals (sonnet implement, sonnet check)
| # | Step | Deliverable | Key files | Co-op check | Deps |
|---|---|---|---|---|---|
| 01 | remove-mark-execute | marks, execute, chevrons, input, `ex`, execCharges gone | game/marks.ts, executeController.ts, ui/hud/markers.ts, gameState, net | e2e-coop takedown still passes | - |
| 02 | remove-sonar | sonar pulse, marks, HUD, audio, difficulty flag, suit / HQ hooks gone; vision button = night only | game/vision.ts, gameState, archetypes, suit, sfx | e2e-coop | - |
| 03 | remove-shield | Health(100), no regen, `sh` removed from PlayerState, HUD shield bar gone | game/health.ts, playerTarget, remotePlayer, protocol, hud | e2e-coop downed / revive | - |
| 04 | remove-style | StealthRating stub, style cash gone, MissionRecord ghost / panther / assault dropped, SAVE_VERSION 8 + migration + literal v7 test | game/playstyle.ts, progression/*, save/* | e2e-coop results | - |
| 05 | remove-cover-player | player snap cover, glide, cover-to-cover, blind fire, cornerController removed; coverData / corners kept for AI; input `cover` kept as the context action (unbound behaviour) | src/cover, gameState, player, input, settings | e2e-netmove (cover cases removed) | - |
| 06 | remove-cover-rig-net | rig cover poses, MoveState `cover` slot renamed `wall` (reserved), COVER_SUB retired, PROTOCOL_VERSION 3, e2e-cover deleted, docs scrubbed, module map row | characterRig, moveState, remoteAvatar, scripts, docs | e2e-netmove, e2e-coop | 05 |

## Block B - Audit harness (sonnet implement, opus check)
| 07 | harness-local | scripts/anim-audit.mjs: drives the local player headless (stepHeadless) at 60 / 120 Hz, every gear, both stances, flat / stairs / slope; measures 5.12.2 + D2 + D5 metrics; fail list with frames; JSON out | scripts/anim-audit.mjs, a pure metrics module src/anim/audit/*.ts + tests | - | 06 |
| 08 | harness-remote | same metrics on a `?net=local` remote copy; joined to run-e2e (report mode until 34, then required); baseline in AUDIT.md | scripts/anim-audit.mjs, run-e2e.mjs | remote metrics recorded | 07 |

## Block C - Verbs, kit and input (sonnet implement; opus check for 11, 12, 12b, 14 and every net step)
| 09 | holster-draw | holstered unless aiming, no hip fire, ADS spread tuning; MoveState drawn bit + weapon in hand host-authoritative | weapons/playerWeapons, weaponStats, weapons.json, moveState, coopHost | netmove case drawn / holstered | 06 |
| 10 | elbow-strike | fire while holstered = elbow strike (committed); generic committed-move protocol `cmove` / `cstart {t0}` / `cdeny` (H3); MoveState `strike` | takedownController, protocol, coopHost, coopClient, moveState | netmove case; host denies | 09 |
| 11 | wall-core | back-to-wall: enter on context press near a wall >= 1.6 m (or low wall), slide along, exit; MoveState `wall`; feeds `localRef.cover` for AI; two players stack on one wall | new src/player/wallController.ts (pure core + tests), gameState, moveState, remoteAvatar | netmove case; stacking (rerun after 20: Block C end, two-page) | 06, 08 |
| 12 | wall-corner | corner peek, lean-out aim, SWAT turn, corner takedown from the wall; lean kind `lk` field (PROTOCOL_VERSION 7) | wallController, takedown.ts (highCover -> wall), camera | netmove peek / lean cases | 11 |
| 12b | wall-edge-aim | D9 open-side weapon at edges (left edge: pistol left hand, rifle left shoulder, camera follows, Inertializer switch, WALL_SUB leftHand); D10 low-wall crouched side lean vs over-the-top, head below the wall top; no protocol bump | wallController, characterRig, localMoveState, remoteAvatar | netmove left-edge lean and low-wall side lean | 12 |
| 13 | door-peek | context press at a closed door: crack open, peek, close; MoveState `doorPeek`; door state host-authoritative | world/doors, gameState, moveState | netmove case | 06 |
| 14 | vision | thermal and electro as post passes (local only, never detection); night vision stays the lighting gain; vision cycle night / thermal / electro / off | vfx/*, cinematicPost, gameState | none sent (unit test proves no protocol field) | 02 |
| 15 | medkits | health 100, medkit heals 40 over 1.5 s, damage interrupts, carry 2 (3 at Rookie), wall medkit entity on test maps, HUD health bar; host-authoritative counts; MoveState `medkit` (H2) | game/health, pickups, hud, protocol, moveState | netmove case; host counts | 03 |
| 16 | arsenal | campaign set curated; every real-brand gun renamed in data and UI; rest kept unused in code | config/weapons.json, attachments, loadout UI | - | 09 |
| 17 | input-pad | binding table for every verb (pad, KBM, basic touch) in docs/systems/input-and-loop.md; analog speed with gear snapping and hysteresis; bumper / rocker sets max gear; rumble on landings, takedowns, shots, heavy footfalls; touch reduced to the D1 basic scheme | input/*, speedGears, touchControls | local only | 10-15 |
| 18 | input-remap | full pad + KBM remap with conflict warnings and reset; hold / toggle for aim, crouch, wall, sprint, grab; persisted via Settings (IndexedDB through src/save/db) | input/*, core/settings, controlsScreen | local only | 17 |
| 19 | difficulty | custom difficulty: perception speed, guard aim, alarm tolerance sliders + presets; host's applies in co-op | ai/archetypes, enemy, settings, coopUi | client follows host values | 18 |

## Block D - Animation and camera (sonnet implement, opus check)
| 20 | bot-partner | DROPPED (M12, Michael 2026-10-15): no bot partner built; co-op is tested with the two-page e2e-netmove / e2e-coop suites, anim-audit remote rows and two browser tabs; the "rerun after 20" checks run at the Block C end as two-page cases | - | - | - |
| 20b | net-check | D11: network conditions simulator in the local / test transport (?netsim=typical, E2E_NETSIM=typical: 80 ms RTT, 20 ms jitter, 1% loss); e2e-netmove / coop once under typical in report mode; fix only clear breakages; tuning to BIBLE-PROPOSALS | src/net transport, e2e libs | report under typical | 19 |
| 21 | b1-bob | batch 1a: D2 fixes (heel-strike kick, walk sway, camera footstep kick removed, breathing and sway settle), trained posture D5.6 | anim/*, characterRig, shoulderCamera | remote audit | 20b |
| 21w | wall-polish | M14: back-to-wall polish (edge stop, crouch on any wall, 0.9 m/s shuffle, no pops / camera jerks / misfires) |
| 21v | vision-grain | M14: sensor grain + slight blur on thermal, electro, night (render only) |
| 22b | gait-rest | M17: quick 180, exertion breathing, stride warping, more pivots, carried rows (after the play test) |
| 22 | b1-gait | M14: slower speeds (-15-20%) + moderate momentum (0.3 s up, 0.25 s stop, turn inertia) with batch 1b: speed-scaled gait D5.1, accel / turn lean spring D5.2 (remotes derive accel locally), compression and settle D5.3, plant-and-pivot + stride warping D5.4, quick 180, exertion breathing D5.5 | anim/*, motion, footPlanner, remoteAvatar | remote audit | 21 |
| 23 | b1-ik | batch 1c: stairs / slopes full-body IK D5.10, look-at D5.8 (noise, team-mates, aim) | characterRig, footPlanner | remote audit | 22 |
| 24 | camera | CT camera + collision solver D5.13: spring-damper capsule follow, look-ahead, wall pull-in, auto shoulder swap at corners, FOV by gear and stance, one damped landing dip | shoulderCamera, cameraBounds, config/camera | local only | 21 |
| 25 | b2-weapon | M18: before starting, check the Wren operator model is in the game (?operator=wren); if not, PAUSE for Michael. batch 2: aim, reload, swap, throw, aim from attached states; muzzle discipline D5.7 (never sweeps team-mates), low-ready in tight spaces | animGraph, characterRig | team-mate muzzle test, two-page (page B in the aim line) | 22 |
| 26 | b3-traversal | batch 3: mantle, vault, step, drop, ladder, pipe, ledge, window, landing, roll; D5.3 settle on exits; D5.9 ledge hand IK; D5.11 momentum-scaled traversal; momentum carry | traversal, traversePath, clips | netmove traversal cases | 22 |
| 27 | b4-contact | batch 4: back-to-wall clip, takedowns, grab, carry; drag (new verb, MoveState `drag`, host-approved, H1); D5.9 door-frame / corner contact IK, duck under low geometry, sideways through gaps | clips, takedownController, characterRig | netmove drag case | 26 |
| 28 | b5-guards | batch 5: guard patrol / investigate / alert / search / radio / reactions / knock-outs; guard body language; look-at toward visible guards (D5.8) | ai/*, enemyPuppet, clips | guard pose on client | 27 |
| 29 | b6-rare | batch 6: pipes, split, wall jump, zipline, duct, vent drop; dedicated clips rappel, fence, brace | clips/traverse, attachController | netmove rare cases | 27 |
| 30 | b7-coop | batch 7: capsule separation, shoulder turn to pass, team-mate look-at, two-player wall stack polish, existing team moves (brace, boost, human ladder, dual takedown) get D5 + contact IK with no clipping; remote replays of everything; 4-player `?net=local` run (stacking, takedowns, elbow strike, medkits) | net/*, teamController, characterRig, e2e-netmove | 4-player run | 29 |
| 31 | tools-fixes | pose viewer; known fixes: thigh pistol vs elbow at slow crouch, brace prompt, human ladder by touch, thin fence | ui/debug, clips | - | 30 |
| 32 | metrics-freeze | final limits in src/config/animLimits.ts with unit tests; harness becomes a required suite | config, scripts/run-e2e.mjs | remote limits included | 31 |

## Block E - Finish
| 33 | training | Training rewritten for the final verbs, pad prompts first | game/training.ts, trainingMode | - | 32 |
| 34 | finish | merges (kestrel, master), versions, CHANGELOG, progress.md, PC-PASS checklist, REVIEW.md, PR | docs, package.json | full e2e | 33 |

Scope guard: Block A 6 steps (max 12), B 2 (4), C 12 (24, 12b added for D9-D10), D 13 (26; 12 after step 20 was dropped, M12), E 2 (4).
