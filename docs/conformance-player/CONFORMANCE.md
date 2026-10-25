# Conformance review: Player Build (plan only)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". Plan only:
no src, test, map, script or config change. Brief: `docs/orchestrator/review-briefs/player.md` on origin/feature/menu.
Docs and code read from origin/master 829a933 (4.102.0, after #407); Tallow Wharf and the co-op kit from
origin/feature/mission-engine 00b6cde9c. Authority order: `CLAUDE.md` (G86).

Scope: movement and traversal, input, animation and mocap, takedowns / grabs / carry / the wheel, the co-op player and
kit, guard models; maps `ctcourse`, `campusOps`, `warehouseOps` and Tallow Wharf.

Fix sizes: S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a
fix that loosens a Michael-only rule; the options are in section 1b, as native multiple choice.

Summary: 10 hard-rule breaks (H1-H10: touch look, 4 hot-path allocation rows, `Math.hypot`, banned names in a doc,
character shadows, G327 shadow anim rate, the partner minimap blip), 39 rule and decision gaps (R1-R39), 9 stale docs
(S1-S9), 8 questions for Michael (Q1-Q9, Q4 dropped). Three own jobs (L): character-shadow parity (H7), civilians (R15), the
shoulder stand and rope descent kit moves (R32, R34).

## 1. Gap table

### 1a. Hard-rule breaks (CLAUDE.md "Hard rules (code)", VISION 4)

| # | Item | Rule | Current state | Gap and fix | Size | Michael? |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | In-game touch look and touch pause button | CLAUDE.md "no phone or touch work" (G12, G182 "No touch controls"; G232 touch is tuner only) | `src/input/touchLook.ts:1-72` (drag to look in play), `src/input/inputManager.ts:88-103`, `.touch-pause`; e2e `scripts/e2e-menus.mjs:738-766`; `docs/systems/input-and-loop.md:7-14`. Source: Michael's "Menus + camera" pick in `docs/archive/marlow-bays/BRIEF.md:182` (2026-10-22), never folded into DECISIONS | A Michael pick in a job doc against G182 / G232 and the hard rule. Fold the pick as a G182 exception, or remove ~3 files and the e2e block | S | Q1 |
| H2 | Player step allocates | CLAUDE.md "Hot paths allocate nothing" | `src/player/playerController.ts:485-486` (`new Vector3`, `Vector3.Zero()` per kinematic step), `:638` via `forwardVec()` `:814-816` (new Vector3 per grounded step), `:646`, `:650`, `:676` (air step), `:460-461` (headroom); `src/player/traversal.ts:209`, `:225`, `:233`, `:264`, `:295-296`; pad poll per frame `src/input/gamepadSource.ts:137` (`.map()`), `src/input/gamepadMapping.ts:136-171` (closures, temp objects) | Module scratch vectors and pooled results | M | no |
| H3 | Takedown offer scan allocates | Same | `find()` every step (`src/game/takedownController.ts:204`); `pickTakedown` builds a `ground` closure and plan literals per call (`src/game/takedown.ts:220-230`, also `:202`, `:289`, `:299`, `:327`, `:350`, `:365`); new offer objects (`takedownController.ts:315`, `:354`); LOS through `ballistics.ray` (`takedownController.ts:313`, `:346`), which allocates a result and two cloned vectors (`src/weapons/ballistics.ts:117-123`); up to 3 candidates per step | Pool plan and offer (the active plan needs its own copy: `start()` aliases `o.plan`); use the allocation-free `ballistics.hitDistance` (`ballistics.ts:84`) | M | no |
| H4 | Carry pick and wheel ring allocate | Same | `carryStep` runs `bodies.find((x) => ...)` every step for up to 1.5 s (`takedownController.ts:611`); the open wheel calls `refreshRing()` every step (`src/game/gadgetSystem.ts:186`), new arrays and objects (`:236-245`), `buildWheel` spreads (`src/game/selectionWheel.ts:50-52`) | Index loop; rebuild the ring only on change | S | no |
| H5 | `Math.hypot` | CLAUDE.md (`hyp2` / `hyp3`, never `Math.hypot`) | `src/operators/lab/retarget.ts:21`, `:22`, `:28` (Operator Lab, dev tool). Outside the area: `src/world/maps/campusS4Dress.ts:176` (build time; Sector Ops) | `hyp3` on `:21-22`; `:28` is a 4-argument hypot: inline sqrt | S | no |
| H6 | Reference-game names in a doc | G6, CLAUDE.md IP | `docs/operators/ART-DIRECTION.md:24` (the reference hero's suit by name), `:26` (the reference organisation and the publisher). `src/ai`, `src/operators`, `scripts/operators`, `docs/guard-models` are clean | Reword to "the reference hero" / "the reference game's organisations" | S | no |
| H7 | Meter and guards ignore character shadows | VISION 4 rule 1, G352, bible L11 (`docs/design-bible.md:286`) | `src/world/charShadows.ts:7`: "Rendering only: the light meter and guard perception read the light field, which has no character shadow". Guard figure, gun and armour already cast (`src/ai/guardBody.ts:142-143`, `src/ai/enemyRig.ts:30-37`, `src/world/world.ts:412-423`) | Known (VISION "not built yet", ROADMAP Now row 11). The build must read one fixed lamp set, never `charShadowSpec` (its lamp count follows the preset, `src/world/charShadowSet.ts:46-62`), or gameplay reads graphics state | L (own job: Sector Ops meter, Guard AI perception) | no |
| H8 | Off-screen guard with its shadow in view animates at 1/4 rate | VISION 4 rule 10, G327 (DECISIONS L1847), bible 5.7 (`design-bible.md:556`), 8 (`:1085`) | `src/ai/animTierView.ts:9-10`, `:89`: "seen" = the camera pass drew the body; shadow passes do not count. `src/ai/animTier.ts:65` then applies `ANIM_TIER_OFFSCREEN` (every 4th frame, `:28`); `animTier` is on by default (`src/core/flags.ts:133`); `docs/systems/ai.md:43` "Not built yet". The Sector Ops render freeze already counts shadows (`src/game/sectorGuardFreeze.ts:9`) | G327 not built. WIP `origin/wip/guard-ai-t1-shadow`; open #360 (tier 4 to 8, camera-only test) goes against G327: close it when the G327 PR opens (ROADMAP Now row 14) | M (Guard AI) | no |
| H9 | Partner drawn live on the minimap | VISION 4 rule 5 (no minimap or blip), G135 (no live partner position on any map), bible 5.9 C10 | Host adds an `ally` blip per partner each HUD frame (`src/net/coopHost.ts:1939-1945`), client the same (`src/net/coopClient.ts:1320-1324`); reach the minimap through `src/game/gameState.ts:750`, `:767`, drawn at `:3639`; ally colour `src/ui/hud/minimap.ts:86` | Delete both ally loops; folds into the minimap removal (ROADMAP Now row 7) | S | no |
| H10 | Partner anim loop and team-move step allocate | CLAUDE.md "Hot paths allocate nothing", `docs/systems/conventions.md:31-33` | `RemoteAvatar.update` every frame: new `RigPose` literal (`src/net/remoteAvatar.ts:751`; enemy / player / puppet reuse one), `vent` literal `:640`, `.some()` closure `:643`, template-string key `:625`. Every fixed step: `teamMates()` builds an object per mate (`coopHost.ts:1066`, `coopClient.ts:349`), called from `mate()` / `idle()` (`src/game/teamController.ts:662`, `:671`); new `this.offer` objects `:689-704`; for-of `:662`, `:675`, `:679` | Reuse scratch objects, index loops | S | no |

### 1b. Rule and decision gaps

| # | Item | Rule | Current state | Gap and fix | Size | Michael? |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Helmets by difficulty | G350 (DECISIONS L1975), bible 5.6 (`design-bible.md:503-507`), VISION 2 | Gear comes from slot tag, section default and alarm stage only (`src/ai/enemyManager.ts:2012-2015`, `:1022-1035`); `DifficultyDef` has no helmet field (`src/ai/archetypes.ts:176-193`); only `src/game/modes/sectorMode.ts:700`, `:941` call `setAlarmStage`; `docs/systems/ai.md:31-33`, `:217` "not built yet" | Realistic and Perfectionist guards get no helmet unless tagged. Give the preset to EnemyManager, helmet on place / spawn / revive / response for those two; wire the campaign mode when it exists; update `docs/guard-models/SPEC.md:292`, `docs/systems/world-and-characters.md:197-198`. No new art (every human kind has a helmet piece, `scripts/operators/data/guards.json`) | M (Guard AI / combat) | no |
| R2 | Perfectionist helmet can be shot off | G350, bible 5.6 | `src/ai/gear.ts:138-142`: head + helmet always sets `knockOff`; `src/ai/enemy.ts:2185-2188` knocks it off; `GEAR.helmetHits` 1 on every difficulty (`gear.ts:18`) | No Perfectionist exception (same slice as R1) | S | no |
| R3 | Alarm stage 2 gives no helmets | bible 5.7 (`design-bible.md:529`: "Level 2: more guards wear helmets and armour"), G155 | `src/ai/gear.ts:29-35` `GEAR_BY_STAGE`: armour at stage 2, helmet only at stage 3 | Add helmets at stage 2 for some guards (or fix the bible after CT research) | S | no |
| R4 | Dogs can be taken down | G348 (DECISIONS L1967), bible 5.8 (`design-bible.md:646`) | Only the grab and the hang-down exclude quadrupeds (`takedownController.ts:228`, `:342`); behind, front, side, corner, overCover, above, drop, below, window, inverted reach a dog; a dog behind gets a 'ko' row "Grab character" (`src/game/gameState.ts:1437-1438`); host `onTakedown` has no quadruped check (`src/net/coopHost.ts:871-899`); dogs carry a `takedownSpot` (`campusS4Data.ts:39`, `campusS5Data.ts:43`, `:45`; type requires it, `src/game/sectors.ts:82`); `docs/systems/takedowns.md:19-20` admits it | Exclude quadrupeds from every takedown kind, host check too | S | no |
| R5 | Dog kill has no penalty and adds score | G348 ("killing one carries a penalty") | Sector Ops counts a dog kill as a kill and adds `killScore` (`sectorMode.ts:1311-1318`) | Penalty undefined | S | Q2 |
| R6 | No lethal option on attached / "above" takedowns | G43 (L215), G210 (L1147), bible 5.4 (`design-bible.md:428-430`: tap knocks out, hold kills) | The menu row always starts a knockout (`gameState.ts:1502`); RT palm strike needs ground and not attached (`src/game/strikeController.ts:75-76`); only the hang-down has an RT path (`gameState.ts:2015-2020`) | RT tap / hold on every offered positional takedown, as hang-down A5 | M | no |
| R7 | Takedowns faster than the minimum | bible 5.4 (`design-bible.md:431`: about 1-1.5 s press to down), 5.12.2 (`:809`) | front / side / corner 0.92 s, below 0.9, inverted 0.9, window 0.95, assist 0.7, hang-down quick 0.6 (`src/game/takedown.ts:33-34`, `:72`, `:202`, `:278`, `:306`, `:335`); glove tiers cut to x0.78 (`src/progression/suit.ts:70`); `MIN_DURATION.takedown` 1.0 (`src/anim/audit/limits.ts:106`) is not audited | Raise to >= 1.0 s after tiers; audit it | S | no |
| R8 | Palm strike recovery 0.6 s | bible 5.4 (`design-bible.md:418-419`), loco M25 (5) (DECISIONS L604-605): about 1.4 s | `STRIKE.recover` 0.6 (`src/game/elbowStrike.ts:16`, comment "F1b ... footage had 1.4"); F1b has no recorded decision | Code against a higher doc | S | Q3 |
| R9 | Client RT-hold strike only knocks out | G210, bible 5.9 C11 / 5.17 D8 parity | No lethal flag on the wire (`strikeController.ts:40-43`, `:240`) | Wire field (the train bumps PROTOCOL_VERSION) | M | no |
| R10 | Carry is silent; crouch carry allowed | bible 5.3 (`design-bible.md:388`), verb catalogue (`:191`: "footsteps louder", standing) | Carry capped 0.8 m/s (`src/game/bodyCarry.ts:323`), under the 1.65 m/s silent band (`src/config/movement.ts:273-276`; `src/player/movement.ts:152`); no carry noise multiplier (`gameState.ts:2083`); crouch kept while carrying (`bodyCarry.ts:125-127`) | Add the carry footstep multiplier; block crouch during a carry (pick-up already stands, `bodyCarry.ts:125-127`) | S | no |
| R11 | No quiet put-down | bible 5.3 (`design-bible.md:389`) | Both drops make 3 m of noise (`bodyCarry.ts:16`, `:171`, `:197`); one row | Add "put down" (quiet, slow) beside "drop" (noise) | M | no |
| R12 | Interrogation intel is not kept | bible 5.4 (`design-bible.md:436`), 5.10 (`:735`) | Feed lines only (`src/game/intelReveal.ts:17-19`); the pause menu has objectives only (`src/ui/screens/pauseScreen.ts:41-47`). Note: G336 removed the field-menu map, not the notes | Notes list in the field menu | M (menu / HUD owner) | no |
| R13 | Extra rows in the grab menu | G203 (L1107: "should only show grab or return") | GRAB CHARACTER is followed by the faced door's rows and the item in reach (`gameState.ts:1437-1456`; code cites CT footage 052607) | G203 (Michael, later) outranks the CT-footage reference in the code: drop the door and item rows | S | no |
| R14 | Takedown row labels | G206 (L1122: "a single KNOCK OUT row") | Takedown / Drop attack / Pull over ledge / Pull through window / Choke (`gameState.ts:315-330`, `:1438`) | One KNOCK OUT label | S | no |
| R15 | Civilians and protected characters | G353 (L1988), bible 5.7 (`design-bible.md:549-551`), 5.8 (`:589-590`) | No civilian archetype or protected flag in code; no section restart on their death | Not built; the takedown side is a kill hook | L (own job: Guard AI archetype + Campaign mission framework) | no |
| R16 | Unarmed melee guard kind | G298 (every guard armed), bible 5.7 (`design-bible.md:563`) | `src/config/enemies.json:48-60` runner, melee only; placed `src/world/maps/warehouse.ts:96`, spawned `src/game/modes/missionMode.ts:47`, `:108` (parked modes); only Sector Ops validates arms (`sectors.ts:577-597`) | Give the runner a sidearm, or run the arms check on every mode | S | no |
| R17 | Three-lens goggle still selectable | G69, G195 | `src/cosmetics/avatarLook.ts:69` defaults to `'trilens'`; `src/cosmetics/catalog.ts:65` "Tri-lens goggles"; built at `src/player/characterRig.ts:1628-1650`; not drawn for the player (`src/operators/runtime/playerFigure.ts:52`) | Default `'headset'`, drop the catalog entry | S | no |
| R18 | Small gap hop still fires | G31 (L170), bible 5.3 | `src/player/traversal.ts:218-227`: Y at an edge above 3.5 m/s (run 4.0 qualifies) hops 1.4-3.2 m; listed in `docs/systems/movement.md:117` | Drop the trigger; keep the `hop` kind for wire / anim | S | no |
| R19 | Sprint-only paths left in code | G31 | `LADDER_SPRINT_RATE`, `PIPE_SPRINT` (`src/player/attachController.ts:683-685`, `src/player/attach.ts:61`, `:66`), `attachController.ts:775` and `RAPPEL.descendSprint` (`src/config/movement.ts:375`), driven by `inp.down('dash')` (`gameState.ts:1908`; `dash` also leaves the wall / peek, `:2843`, `:2941`); nothing binds `dash`. Anim side: sprint band `src/anim/audit/limits.ts:121`, "gear 6 sprint" `:124`, unreachable mocap sprint clip (`src/anim/mocap.ts:181`; `src/anim/animGraph.ts:2264-2271`, `sprintFrom` 5.0 `:2892`; top gear effort 4.0 `src/config/movement.ts:194` `GAIT_REF.stand` < `runTo` 4.2) | Dead code for removed moves; delete | S | no |
| R20 | Long auto-crawl duct in warehouseOps | G56, bible 5.3 | `src/world/maps/warehouseS3.ts:355-378`: riser 0 -> 4.7 m, then a 13.5 m crawl, 0.9 m box (`:367`). ctcourse, campus and Tallow Wharf have none (Tallow ducts 1.2 x 1.5) | Rebuild as a crouch-walk duct or a short duct end (map owner Sector Ops; the old map, G298) | M | no |
| R21 | Crouched wall slide 0.55 m/s | G35 (about 0.35 m/s), G210 | `src/player/wallController.ts:48-49`: standing 0.39, crouched 0.55 (CT footage audit, comment `:43-46`); `:131-137` slower below full stick | Crouched 57% above G35; set to ~0.35 (G356 starting value) | S | no |
| R22 | Camera adjusts by itself | G159 (never moves or adjusts by itself), G28 / bible 5.3 (`design-bible.md:393`, about 1.8 m) | `src/config/camera.ts:13`, `:20-21`: boom 1.8 tight / 2.8 open (2.2 crouched) on a spring (`:29-30`, `src/player/shoulderCamera.ts:324`); doorway push-in to 0.8 m (`camera.ts:99`, `shoulderCamera.ts:405-407`) | Automatic boom changes and push-in against G159 as written | S-M | Q5 |
| R23 | Hold / toggle coverage | bible 5.17 D7 (every hold gets hold or toggle) vs G214 (no toggle aim) | Toggles for crouch, wall, grab, held interactions (`src/core/settings.ts:98`, `:367-371`); none for the wheel (LB), reload (X), kill (RT hold), drop-into-hang, vent unscrew | D7 not met; D7 conflicts with G214 and the tap / hold pairs (G181, G192, G210) | M | Q6 |
| R24 | Objective on View tap / O | G343, G351 | View = `device`, no action (`src/input/padBinds.ts:52`); no O in `src/input/keyBindings.ts:43-68` | Binding not built (HUD part: menu / HUD owner; ROADMAP names Campaign Build for G343 / G351) | M | no |
| R25 | Forward lean from the jog | G217, bible 5.12 (`design-bible.md:759`: no forward lean until full speed, run 4.0 m/s) | `MOCAP_RUN_POSE` (`src/anim/mocap.ts:121`) eases the run carriage in from 2.0 to 3.0 m/s, chest pitch 0.26 rad (`characterRig.ts:3112-3116`); measured jog 13.7 deg vs walk 3.7 (`docs/anim-fix-pass/after-af2/numbers.md:12`, `:17`) | Move the ease to ~3.5-4.0 m/s, re-measure | S | no |
| R26 | Fix pass targets from CT footage | G210, VISION 3, bible (`design-bible.md:756`): a real-world trained operator | `docs/anim-fix-pass/BRIEF.md:27` "Authority: CT footage (G1)"; `PLAN.md:88` "10-20 deg (CT run)"; AF3 crouch trunk 30-38 deg from CT audit rows (`BRIEF.md:27-28`); code `mocap.ts:113`, `animGraph.ts:3027-3030` | The AF7-AF9 brief cites G210 and the operator standard (`docs/archive/anim-rework/BRIEF.md:89`); values re-derived where they differ | S doc, M values | no |
| R27 | Mocap no longer "as captured" | G271 (L1437), bible (`design-bible.md:752-753`) | AF A2 / A3 (`docs/anim-fix-pass/BRIEF.md:58`): `MOCAP_LAYERS` `pelHeight` / `trunkMean` / `bankWipe` / `armSmooth` = 0 (`mocap.ts:98-101`); crouch capture re-posed (`animGraph.ts:2947`); `BRIEF.md:44` "Michael's answers (none yet)" | An assumed override of a Michael decision, unconfirmed | S | Q7 |
| R28 | No player mocap switch | G298 ("hand-keyed set behind the switch"), G264 ("I want to be able to roll back"), bible (`design-bible.md:753-754`) | AF5 removed the Settings row (`src/ui/screens/settingsScreen.ts:158`); a stored `false` is ignored (`src/core/app.ts:135-141`); only `?mocap=0` and the tuner box (`app.ts:142-147`); flagged in #247 (BRIEF A1, `BRIEF.md:47`) | A narrowing of a Michael decision, unrecorded | S | Q8 |
| R29 | Partner anim fields on the wire | bible 5.17 D8 (`design-bible.md:956`: "no extra bandwidth") | AF6 added `t`, `gph`, `qs`, `hs`, `mo`, `mt`, `ax`, `az` (`src/net/protocol.ts:80-94`) under assumption A5 (`BRIEF.md:67`) | Contradicts D8; unrecorded | S (amend D8) / L (revert) | Q9 |
| R30 | Audit limits weaker than the bible | bible 5.12.2 item 6 (`design-bible.md:801` flick turn 0.4 s; `:805` raise 0.75 / 1.1 s) | `src/anim/audit/limits.ts:98` `turn180: 0.25`, `:102` `raise: 0.2`; real draw times `src/weapons/drawState.ts:25-26` | Set the bible values (check whether `raise` is the aim raise or the draw) | S | no |
| R31 | AF0-AF6 walk has no look video | RULES "Walk pacing", "Definition of done" | ROADMAP "Waiting on Michael" has had "Walk AF0-AF6" since 2026-10-23 ~20:45; no video path in master or feature/menu | Record a 1-2 min look video for the walk card (laptop GPU) | S-M | no |
| R32 | Human ladder (shoulder stand) missing; reach numbers disagree | G57 (L275: one 4.3-4.5 band for boost and human ladder), G180 (CT "Shoulder stand", `docs/ct-research/levels-digest.md`), G293, bible 5.9 C3 (`design-bible.md:668`, listed apart from the relay), level-design 11.8-11.9, 12.1 (`docs/level-design.md:306-307`), 12.2 (`:332`), open item 1 (`:674-675`) | `TeamKind` boost / ladder / throw / hang / rope (`src/game/teamMoves.ts:12`); wire kind `ladder` is the ledge relay (comment `:11`, host check `:60-65`), reaching `relayMax` 4.6 (`src/config/movement.ts:476`, above G57's 4.5); `TEAM.ladderGrab` 4.1 (`movement.ts:464`) and ladderFeet / Climb are read by no move (`src/game/teamController.ts:78` "No brace, no stack"; only a test, `tests/bunkerMap.test.ts:663`, `:1362`); mission-engine `docs/missions/PLAN.md` row 106 maps the human ladder to the relay; pull-up 4.3-4.5 on mission-engine (`src/game/kit/pullUp.ts:52-54`) | A kit job for the shoulder stand (move, wire, anims, tests); cap `relayMax` at 4.5; fix the 12.1 line and close open item 1; delete dead TEAM constants (`movement.ts:451-467`); orchestrator fixes PLAN row 106 | L (move) + S (docs, cap) | no |
| R33 | Revive heals to full | bible 5.9 C6 (a revive restores 35% health), 5.13 (`design-bible.md:854`) | `target.revive()` calls `health.reset()` (`src/game/playerTarget.ts:90-93`) = maxHp (`src/game/health.ts:30-31`); remote side `src/net/remotePlayer.ts:263`, client `coopClient.ts:916` | Revive to 35% | S | no |
| R34 | Rope descent missing | G293 ("rope brace / descent"), G180 (CT dual rope "rappels down or climbs up"), level-design 11.9 (`docs/level-design.md:272`) | The two-person rope starts only from its foot (`teamMoves.ts:66-73`; `teamController.ts:276-420`); `docs/design/scale-sheet.md:56` "a climb up only, no descent" | A kit job: descend on the held rope; fix the scale sheet | L + S | no |
| R35 | Marlow Yard revives can exceed 2 | G349 (campaign rule: at most twice), G126 | Course mode grants section-rating syringes into the host revive cap (`src/game/modes/courseMode.ts:832-834` -> `addSyringes`, `coopHost.ts:834-837`), limited only by preset + `SYRINGE_OVER_PRESET` 2 (`src/game/rating/sectionRating.ts:28`, `:169`): up to 4 | No grant in course mode, or cap at `REVIVES_PER_MISSION` | S | no |
| R36 | Marlow Yard startable solo | VISION 2 (2 players), bible 5.9 C1 (exactly two, no solo variants) | Host Start not blocked when alone (`src/net/coopUi.ts:628-635`); `startMatch` checks only over-capacity (`src/net/session.ts:349-353`); pair gates then dead-end a solo run (`courseState.ts:1160-1162`) | Block Start below 2 in course mode unless the dev `?course=solo` flag (`courseMode.ts:45-48`) | S | no |
| R37 | Campaign revive cap and player count (mission-engine) | G126 (2 per mission), G2 / VISION 2 (exactly 2) | Missions run in `sector` NetMode, so the cap is `syringesFor(difficulty)` 3 / 2 / 1 / 1 (origin/feature/mission-engine `src/net/coopHost.ts:203`, `SECTOR.syringes`); mission data needs players [2] (`missionDef.ts:185`) but one host can start; coop4 would let 4 in | Campaign: cap 2, capacity 2, Start blocked below 2 (Campaign Build) | S | no |
| R38 | Friendly fire not a host option | G141 (host option, on by default), bible 5.9 C8 | Hard-wired on in course mode only (`coopHost.ts:202` `this.ff = mode === 'course'`); client partner hit targets course only (`coopClient.ts:378`); no lobby setting | Lobby setting + wire field (the train bumps PROTOCOL_VERSION), `ff` in every mode | M | no |
| R39 | Held-open shutter invisible to guards (mission-engine) | mission-engine `docs/missions/PLAN.md` row 142 (KIT-SHUT "guard-visible open shutter") | `SHUTTER_NOTICE` / `shutterNoticePoint` defined (`src/game/kit/shutter.ts:84`), header "not wired here" (`:25`), unreferenced | Guard AI hook in stealthSystems | S-M | no |

### 1c. Docs out of date (lower docs against code or higher docs)

| # | Doc | Stale text | Truth | Size |
| --- | --- | --- | --- | --- |
| S1 | `docs/systems/movement.md` | `:16-19` G25-G36 "not a build target"; `:46` run 4.5; `:54-56`, `:60` start 0.3 / stop 0.25 / planted pivot / 720 deg/s; `:68` stepLenMax 0.95; `:92` roll tapped 0.7 s 3 m 1.5 m/s; `:108` stance times; `:149` split walls 2.6 m; `:251-252` slide by gear; `:255` stick pulled away leaves; `:26-27`, `:298-303` lean-out / SWAT exist; `:28-30` door menu and G40 not built; `:358` CLIMB_STANDOFF 0.28 | G356 starting values; `src/config/movement.ts:160`, `:210-217` (0.45 / 0.2 / 450 deg/s, no pivot), stepLen 1.3; roll held 0.75 s 2.3 m 2.5 m/s; stance 0.22 / 0.22; split 3.6 m (`:311-314`); `wallController.ts:528`, `:626-629`; door menu and G40 built; `attach.ts:191` 0.32 | S |
| S2 | `docs/systems/input-and-loop.md` | `:24`, `:191-192` G22 not built, B held 1 s cancels; `:216` full stick 4.5 m/s | Start cancels (`src/input/gamepadSource.ts:8-9`, `src/ui/screens/controlsScreen.ts:105`); 4.0 m/s | S |
| S3 | `docs/systems/takedowns.md` | `:13-16` palm strike not built, aware facing / heavies staggered; `:151-162` reach 1.2 / cone 90 / contact 0.5 / recovery 0.4 / stagger table; `:33` one candidate; `:34` frontal heavy lethal-only; `:43` Y for takedowns; `:48-49` shove stagger (removed per `:77`); `:3` cites replaced G49. Comment `src/game/gadgetSystem.ts:71` "time slows" | `elbowStrike.ts:8-35`, `:48-50` (1.3 / 140 deg / 0.08 / 0.6, always KO); 3 candidates (`takedownController.ts:27-29`); heavies 'ok' (`:353`); hold-A menu (`padBinds.ts:41`); `GRAB.shoveStagger` unused (`takedown.ts:119`); no time slow (G181) | S |
| S4 | `docs/systems/world-and-characters.md` | `:329-341` crouched and drawn sets hand-keyed, `MOCAP_LAYERS` all 0 but turnStep; `docs/art-credits.md:27` "the 'Mocap locomotion' switch" | Crouched sneak 136_09, sprint 127_07, aimed strafe 69_59 / 69_56 (`mocap.ts:176-195`); `motionArmCap` / `keyPelRate` 1 (`:95-96`); AF2 run carriage; no player switch since AF5 | S |
| S5 | `docs/design-bible.md` | `:353` run starts at about 4.2 m/s; `:946` D7 has no aim-toggle exception; D2 (`:936`) walk sway 3 cm or less | G217 and code 4.0 (`movement.ts:160`); G214; G242 (L1318) ~5 cm, `limits.ts:136` 0.05 | S (orchestrator fold) |
| S6 | Old job docs | `docs/mocap-trial/REPORT.md:6` "default OFF"; `docs/anim-fix-pass/BRIEF.md:24` the lifted "no refining" rule (G288); `src/weapons/drawState.ts:20`, `:30` link `docs/anim-natural/n3/DRAW-TIMES.md` (now `docs/archive/anim-natural/n3/`) | Archive released job docs (doc-guard #400); fix the link | S |
| S7 | `docs/operators/STATE.md` | `:9` Moth's goggle "amber"; `:37` a real pistol brand | G196 purple (its own `:3`, D36); bible 5.6 no real gun brands | S |
| S8 | `docs/design-bible.md` 5.9 C10 | `:691` "each player is a different operator, Wren or Moth" | G123 (both Wren until Moth is done); bible 5.14 (`:870-880`) and `src/net/remoteAvatar.ts:216` follow G123 | S (orchestrator fold) |
| S9 | `src/net/protocol.ts:38` comment | cites G2 for the 2-player cap | G308 (Sector Ops 4 after the redesign, Marlow 2) | S |

### 1d. Questions for Michael (native multiple choice; first option recommended)

| Q | Row | Question | Options |
| --- | --- | --- | --- |
| Q1 | H1 | In-game touch: your 2026-10-22 "Menus + camera" pick vs "no touch controls" (G182) | Keep menu taps and touch look, record it as a G182 exception / Remove touch look and the pause button, tuner touch only / Keep menu taps only |
| Q2 | R5 | What is the dog-kill penalty (G348)? | Breaks "no kills" only / Breaks "no kills" plus a score deduction / Also alerts the handler and nearby guards |
| Q3 | R8 | Palm strike recovery | Back to about 1.4 s / Keep 0.6 s and record it / Tune by hand in the tuner |
| Q4 | - | Dropped: G203 settles R13 (checker) | - |
| Q5 | R22 | Camera boom (G159) | Keep the space boom, drop the door push-in / Approve both as CT behaviour / Fixed 1.8 m, collision pull-in only |
| Q6 | R23 | Hold / toggle settings (D7 vs G214) | D7 covers pure holds only; tap / hold pairs and aim excepted / Add toggles for every hold except tap / hold pairs |
| Q7 | R27 | Mocap corrections over the capture (G271) | Decide at the AF0-AF6 walk / Keep the corrections / Back to as captured |
| Q8 | R28 | Mocap switch for players | Mocap only, dev rollback `?mocap=0` (as now) / Restore the Settings switch |
| Q9 | R29 | Partner anim fields on the wire (D8) | Allow small anim-state fields, amend D8 / Revert to locally derived only |

## 2. Checked, conforms

Movement, traversal and input:
- G210 analog speed, no sprint toggle: `src/player/speedGears.ts:42-56`, `src/config/movement.ts:151-179`; keyboard walk / run / creep `src/input/keyboardMouseSource.ts:347`.
- G26 stop slide <= 0.3 m: `src/anim/motion.ts:68`, `:525-530` (~0.27 m from 4.0 m/s). G27 1.7 s hold then ease: `src/player/playerController.ts:599-620`, `src/config/movement.ts:214-215`.
- G25 / G33 turns, no planted pivot, 180 in ~0.4-0.45 s: `motion.ts:438-519`, `movement.ts:217-224`. Back-walk at the slowest speed: `motion.ts:469-472`.
- G32 roll on held crouch, tap crouches: `playerController.ts:515-535`, `:720-728`; `traversal.ts:404-408`, `:481-487`. Landing roll the only automatic move: `traversal.ts:352-356`.
- G40 silent bands: `src/config/movement.ts:273-276`, `src/player/movement.ts:148-153`. G160 tense sneak: `playerController.ts:575-576`, `src/player/tenseSneak.ts`.
- G18 / G34 / G36 wall entry by button, peek at once, no pull-away, no lean-out or SWAT: `src/input/gamepadMapping.ts:71`, `wallController.ts:36`, `:77`, `:141-143`, `:520-528`, `:626-649`.
- G17 shoulder swap only while aiming: `src/player/player.ts:281`. G202 shoulder 0.15, FOV 86: `src/config/camera.ts:40`, `:131`.
- G181 / G192 wheel on LB hold, LB tap switches, `WHEEL_HOLD` 0.15, vision on D-pad left: `gamepadMapping.ts:69`, `:77`; `src/input/padBinds.ts:47`; `src/game/gadgetSystem.ts:182-201`; `src/input/inputState.ts:10`. No time slow: `closeWheel` restores no time scale (`gadgetSystem.ts:256-262`). G213 vision carousel on A: `gadgetSystem.ts:191-193`, `selectionWheel.ts:107-114`. G220 wheel scales: `src/ui/hud/gadgetWheel.ts:38-39`.
- G210 / G212 / G214 bindings, no toggle aim: `gamepadMapping.ts:64-68`, `:146-148`; `src/core/settings.ts:367`. G22 capture cancel on Start: `gamepadSource.ts:8-9`.
- D7 remapping, conflicts, IndexedDB persistence: `src/input/keyBindings.ts:155-166`, `src/input/conflicts.ts`, `src/core/app.ts:83`.
- G38 / G176 / G109 one gameplay body; gameplay never reads the rig or LOD: `camera.ts:46-47`, `src/player/attach.ts:299`, `src/player/playerVolumes.ts:6`.
- Level-design 12.1 facts: 50 deg slope (`playerController.ts:232`); split gaps 3.6 m, 1.2-1.95 m apart (`src/config/movement.ts:311-314`, `src/player/splitJump.ts:38-50`); 1.9 m box tops are lips (`src/world/anchors.ts:203`, `:334`); `WALL_JUMP.maxUp` 3.8, `TEAM.boostMax` 4.5. Except the human ladder line (R32).
- Co-op lip band 4.3-4.5 m on every live map: ctcourse `COOP_BAND` (`src/world/maps/ctcourseGreybox.ts:29`); campus lips 4.4; warehouse S3 4.4 (`warehouseS3.ts:380`); Tallow Wharf W1-W4 4.5 / 4.5 / 4.4 / 4.4, every other box `noLedge`; Tallow crouch ducts 1.2 x 1.5 (`tallowWharfKit.ts:46`, mission-engine).
- Optic cable (`src/player/opticCable.ts`): no per-step allocation, no `Math.hypot` (checker spot check).
- Traversal blocked while carrying: `gameState.ts:1930`. No `Math.hypot` in player, input, anim or config.

Animation and mocap:
- Mocap on by default (G264, G298): `src/core/settings.ts:161` `mocapLoco: true`, migration `:377`; `app.ts:140`. Gate met: `docs/mocap-trial/CHECK-5.md:3`, `CHECK-7.md:3`.
- CMU raw files not committed (`.mocap-cache` ignored, no `.bvh` / `.amc` / `.asf` tracked); each clip names its take (`src/anim/clips/mocap/*.ts:1-4`); subjects 16 / 69 / 127 / 136 credited (`docs/art-credits.md:19-30`); takes listed in `docs/mocap-trial/SOURCES.md`.
- G243 draw times from research 0.75 / 1.1 s (`src/weapons/drawState.ts:25-26`); per-clip speed slider (`src/anim/tuneClipSpeed.ts:24-38`).
- Anim hot paths: module scratch (`characterRig.ts:315-622`), allocation tests (`tests/helpers/allocPerCall.ts`); the only iterator hits are not per frame (`footPlanner.ts:527`, `animGraph.ts:2859`).
- No CT tracing: `scripts/anim-keys/ct/walk-105949.json` is a few points per phase, "not a trace".
- Stops and turns hand the feet to the planner (`mocap.ts:555-556`, `:566`).
- Realism items 1-4 (`src/anim/audit/limits.ts:10-71`) match the bible; tools and harness (`scripts/anim-audit.mjs`, `anim-sheet.mjs`, Studio loop list `studio.ts:214`, the tuner) as bible 5.12.3-5.12.4.
- Look-video rule landed 2026-10-24 21:50 (71f125151); no animation PR merged since; the only open PR touching rig files is #317 (5 lines, no look change).

Takedowns, grabs, carry:
- Grab first from behind (G23, G43): `takedown.ts:133`, `takedownController.ts:228`, `gameState.ts:1437`. Held guard shows only INTERROGATE when he has info, no BACK TO GAME, no B cancel (G203, G205): `gameState.ts:1425-1429`, `src/game/grabMenu.ts:44-46`, `src/game/contextMenu.ts:210`, `:215`. No release (G204): `takedownController.ts:497-516`. RT tap KO, RT hold kill, LT shield (G210): `grabMenu.ts:53-58`, `gameState.ts:1415`.
- No lethal / non-lethal switch (G192).
- A perfect rating always possible, no forced kill (VISION 4 rules 3-4, G127, G146): every offer has a non-lethal path (`gameState.ts:1502`); heavies overridden to 'ok' (`takedownController.ts:353`); enforcers blocked only frontally (`archetypes.ts:104-110`); the palm strike knocks any human out (`elbowStrike.ts:48-50`); a hang ending knocks out (`takedownController.ts:539-544`). Knockouts are not kills: `playstyle.ts:16`, `sectorMode.ts:1316-1318`, `courseMode.ts:1099`, `sectionRating.ts:74`, `:83`.
- Takedowns one move against helmets (G307 (2)): gear applies to bullets only (`enemy.ts:2181-2185`), the takedown hit is `melee` (`takedownController.ts:790`).
- Palm strike (G42) one-hit KO from any side, dogs excluded, host-approved in co-op: `elbowStrike.ts:64-66`, `strikeController.ts:93`, `:124`, `:232`. Dogs: no strike, grab or hang-down take; gas knocks dogs out (`gadgetSystem.ts:401-414`).
- Carry 0.8 m/s, no traversal, jump, team move or door menu; lift 2.0 s; hide spots remove the body; per-step code allocation-free: `gameState.ts:1536`, `:1917`, `:1930-1931`; `closeQuarters.ts:34`; `stealthSystems.ts:289-292`; `bodyCarry.ts:299-377`.
- Every detection explainable: takedown noise 1.2 / 3 m (`takedownController.ts:796-798`), strike 4 m (`strikeController.ts:242`), body drop 3 m (`bodyCarry.ts:171`, `:197`).
- Joint interrogation speech only (G148): `jointInterrogation.ts:52-72`. Synced takedown = two ordinary takedowns (G180): `dualTakedown.ts:1-23`. Marlow interrogation guard (G206): `ctcourseSets/a1Gate.ts:218`.
- No takedown on an alert guard who has spotted you: `takedownController.ts:273-278`. Host approves client takedowns: `coopHost.ts:871-899`.

Guard models:
- Gameplay never reads graphics state: `src/ai` imports nothing from quality, settings or the governor; the flag reads are render-only (`guardBody.ts:38`, `:42`, `animTierView.ts:84`, `helmetDrops.ts:85`); head hit volume from the sim (`guardHead.ts:1-8`, `hitboxes.ts:73`); anim tiers change the render pose only (`animTier.ts:20`); LOD pick render-only (`guardBody.ts:1-5`, `:226-239`).
- Meshes from in-repo headless Blender scripts (`scripts/operators/py/` bake_guard, guard_body, build_head, build_garment, build_gear); the only external art is the CC0 MPFB2 base-body data, pinned, not shipped (`fetch-base-body.mjs:1-4`, `:15`), credited `docs/art-credits.md:15-16`.
- Every placed guard on the live maps has a gun (G298): `enemyRig.ts:32-39`; grunt, officer, dog placed, enforcers with response teams (except the parked runner, R16).
- Guards male, taller than Wren, varied (G310, G320): heights 1.74-1.83 m vs 1.68 (`enemies.json`); look seed on the wire (`src/net/protocol.ts:173`).
- Helmet visuals follow the gameplay bit, co-op client included: `guardBody.ts:191-202`, `enemy.ts:856-875`, `protocol.ts:151`. Below Perfectionist the first head bullet knocks the helmet off with a stagger, the second kills (`gear.ts:133-149`, `enemy.ts:2185-2194`).
- Character shadow lamp counts (G315, bible L18): 1 on Low / Medium, 2-4 on High+ (`charShadowSet.ts:46-53`). No phone LOD (G173): `guardBody.ts:37-38`. Guard models dark behind `guardModels` (`flags.ts:132`).

Co-op player and kit:
- No static `src/net` import outside `src/net` on master, mission-engine or coop-real (only `import type`); the one
  runtime import is `import('./net/coopUi')` (`src/main.ts:326`), every call site behind `flags.coop` (`:328`, `:341`,
  `:450`, `:465`).
- PROTOCOL_VERSION on one line (`src/net/protocol.ts:20-21`, 59), bumped by the train (`scripts/merge-train.mjs:337-352`),
  no test asserts it. No `Math.hypot` in `src/net`, teamController, teamMoves or `src/game/kit`.
- Kit numbers against the bands: leg-up 2.4 to `boostMax` 4.5 (`src/config/movement.ts:459`, `teamMoves.ts:118-119`);
  throw `throwDist` 3.2 (`movement.ts:483`) for `throw_gap_max` 2.7; rope 2.2-6.0 (`:513-514`) = `rope_span`; pull-up
  4.3-4.5 (`pullUp.ts:53-54`) = `pull_lip`; shutter `holdGap` 0.9 (`shutter.ts:37`) = `shutter_gap_h` (both on
  mission-engine). Except the relay (R32).
- Kit moves present: boost, throw (+ throw KO, `src/net/throwKo.ts`), ledge relay, hang-down (+ hang takedown,
  `src/net/hangHold.ts`), two-person rope climb on master; pull-up and shutter on mission-engine through
  `src/game/kit/registry.ts`, allocation-free step code; vent unlock = leg-up + bolted door (`SectorBolt`
  `sectors.ts:237`; Marlow `a1Gate.ts`). Missing: shoulder stand (R32), rope descent (R34).
- G151 prompts name the move (`teamController.ts:205-280`, `:710-750`).
- Revive window 30 s, 2 per mission (G126, G349): `src/game/reviveClock.ts:8-10`; host wiring `coopHost.ts:563`, `:600`,
  `:1816-1826`; both down reloads the checkpoint (`coopHost.ts:565`, `courseState.ts:627-630`). Sector Ops syringes per
  difficulty (G188): `coopHost.ts:206`.
- Players per mode: course and sector capped at 2 (`protocol.ts:39-41`), Marlow 2 (G308); Sector Ops 4 waits on coop4
  #317 per G308's timing.
- VISION 4 rule 7 and G138: `exitZoneReady` needs both (`courseDef.ts:271-273`); pair gates and airlocks need 2; solo
  only under the dev flag (`courseMode.ts:45-48`); the validator checks a forced co-op gate per section
  (`scripts/level-validate.mjs:861`, `:871`).
- G135 beacon (goggle colour per slot: `operators/runtime/playerFigure.ts:134-137`, `goggle.ts:135-147`,
  `coopHost.ts:254-258`, `coopClient.ts:413-417`; host green, partner cyan as bible 5.14) and world pings both ways
  (`coopHost.ts:754-760`, `coopClient.ts:1308-1312`); no partner outline (the only overlay is thermal, `figure.ts:480-495`). Except the minimap
  blip (H9).
- No bot partner (G48). Partner blocking (C11, G52): `coopHost.ts:392`, `coopClient.ts:385`.
- G147 rejoin: 10 min hold, host "Resume hosting", a tokenless joiner takes the held slot (`src/core/rejoin.ts:1-13`,
  `main.ts:341-355`); course progress host-side IndexedDB (`coopUi.ts:442-444`, `courseMode.ts:761`, `:870`).
- Open PRs: #384 coop-lamp-guard and #389 client-intel are merged (train 88) and conform (`src/net` only; #389's wire
  field bumped by the train). #388 coop-real (draft, 80b9a0adc): game code only `src/net/localTransport.ts` (a test-only
  `&netdrop=` under `?net=local`), the rest e2e scripts and docs; conforms (G287, G51), not ready (c1b 0/3 in triage).

## 3. Unwalked features in the area

- ROADMAP "Waiting on Michael" (origin/feature/menu), Player / animation: last walk 4.72-4.73 (2026-10-23 ~13:55);
  unwalked AF0-AF6 animation fix pass (4.84.0), optic cable partner view, client body carry. Count 3: AT CAP. The cap
  limits switch-on only (RULES "Walk pacing", G355).
- AF0-AF6 (#247) shipped live with no flag, before the G288 cap; `?mocap=0` rolls back only the mocap-gated parts
  (AF1, AF2, the AF3 capture fix); AF3's step line, AF4a, AF4b and AF6 cannot be turned off. AF2's wrist jerk bar
  (<= 1.0 cm / frame) is not met (`docs/anim-fix-pass/AF2-REPORT.md:48-52`); assumptions A1, A2, A5 unanswered (Q7-Q9).
- AF7-AF9: a draft outside git (`C:/NightShift/scratch/ctcore/briefs/afp-next-pass.md`), blocked on the walk; it cites
  the lifted "no polish before playtest" rule and offers a "CT width" idle option, both to be corrected to G210 / G288
  before use (R26).
- #375 gm-flip: waits on Michael's look picks (lean sleeve skin, hem shards, weld puckers), then a one-click OK; it
  flips `guardModels` on by default. Its base is 675 commits behind master, so it needs a fresh train run. It is
  render-only, improves conformance (master's S1 body draws a visor helmet on every heavy whatever the gameplay bit,
  `characterRig.ts:1617-1620`), and does not address G327 or G350. Follow-ons: feature/gm-polish (menu warm-up of guard
  files for offline play, ships with #375), feature/gm-look (garment LODs from the welded shell; its cloth assert counts
  triangles rather than measuring bible 5.12.2's 2 cm; not ready).
- Flags in the area: `mocap` (URL only), `animTier` on by default (`flags.ts:133`, lacks G327), `guardModels` off
  (`flags.ts:132`).

## 4. Not checked

- No builds, tests, e2e, anim audits or GPU runs (plan only): in-game look, timings as felt and gm-flip's perf pass are
  unverified.
- G96 "exact CT pad layout, button for button": no CT button list on master (`docs/ct-prototype/CT-CONTROLS.md` is
  history); only the decided bindings were checked.
- Research-gated verbs with no rule yet: knife takedown (G76), held guard on a scanner (`grabMenu.ts:25` stub), body
  drag, doorway takedowns.
- Whether `limits.ts` `raise` is the draw or the aim raise; whether `POSTURE.runLean` (`animGraph.ts:3030`) shows on the
  drawn / aimed paths (if so R25 widens).
- `characterRig.ts` and `animGraph.ts` closures: pattern-grepped, not read line by line.
- Whether ClearMode / MissionMode (runner spawns, R16) are reachable without `?legacy=1` (`gameState.ts:731-740`).
