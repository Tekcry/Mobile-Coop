# Locomotion run - log

One short entry per step: what changed, numbers, commit.

## 00 setup - 93c6ee8
Branch, brief, rules, D1-D8 into bible 1.13 (5.17), perf-trend script. Baseline: check 1015/1016 (kestrel-owned fail), perf sim p95 2.65 ms / anim 0.0504 ms per char (budget x2.68 speed = 0.107), netmove worst 3.7 cm.

## 01 audit
4 Explore reports in audit/, opus checker: 108 rows (35 pass, 43 fix, 19 rework, 10 remove); 62 rows spot-checked, 54 pass, 8 line fixes, 0 dropped. Findings: walk sway 5.3 cm p2p (limit 3), heel-strike kick double dip, camera footstep kick, weapon sway never settles, knee / hip rate limits allow > 25 deg per frame, vault 0.42 / crouch-to-stand 0.28 / ladder sprint rung 0.2 / takedown 0.92 s under the bible minimums.

## 02 plan
PLAN.md and step files 01-34 (three opus writers), decisions A6-A32 logged.

## 01 remove-mark-execute
Mark & Execute gone end to end (game, HUD, input, touch layout v6, suit extraMarks, net `ex` / execCharges, tests, docs). Checks (opus checker): lint 0 errors; tests 1012/1013 (kestrel-owned fail); build ok; e2e quick 27 suites pass except e2e-progression without LEGACY (fails on pre-step code too; passes under --legacy). Note: deletions landed early in 87c397f (see REVIEW-NOTES).

## 02-04 remove-sonar, remove-shield, remove-style (batched)
Sonar gone (vision = night only); Health(100), no shield or regen, `sh` off the wire; StealthRating stub (alarms, kills, knockouts, detections), style cash and bars gone, MissionRecord {rating, score, plays, wins}, SAVE_VERSION 8 with v7 migration + literal v7 test, HQ sonar / marks and the executes challenge dropped, presets Silent / Flash / Loud (A33). Opus check PASS: lint 0 errors, tests 1013/1014 (kestrel-owned), build ok, e2e quick pass except timing flakes passing serially (e2e-stealth, e2e-levels, netmove, darkness), legacy suites pass. Toughness 150 -> 100 (pistol guard 26 dmg: 4 hits).

## 05 remove-cover-player
Player snap cover, glide, cover-to-cover, blind fire, coverAim and cornerController (A1) removed; enemy cover AI kept. Unplanned but correct: override cleared on respawn / revive; speedCap reset each fixed step (the corner controller used to do it). Round 1 FAIL (stuck vault override after traversal.reset -> e2e-anchors; lost touch pointer-events check) fixed; recheck PASS: lint 0 errors, tests 990/991 (kestrel-owned), build ok, e2e anchors / touch / traverse / stealth-ai / takedown / coop ok, netmove flaky (passes serially). Flanker and grenade flush lose their player trigger until step 11.

## 06 remove-cover-rig-net
Cover rig poses / clips gone, slot 1 `wall`, PROTOCOL_VERSION 3 (v2 hello refused, tested), A6 stance kept dormant, open-left mirroring restored dormant (renamed openLeft / EDGE_HAND_TIME, unit test), docs scrub, guard high-cover wallSide. Round 1 FAIL (deleted mirroring needed by D9; docs scrub incomplete; guard lean side) fixed; recheck PASS: lint 0 errors, tests 994/995 (kestrel-owned), build ok, 8 suites ok, netmove flaky (fence wrists 30-36 cm once in 2-job run, 0 serially). Block A complete.

## Block A end
Full e2e (2 jobs, 1903 s): all pass except e2e-stealth (flake, passes serially), e2e-netmove / e2e-darkness (known flaky) and e2e-kestrel (kestrel-owned, same on baseline). Perf A/B vs baseline: no regression. Merged origin/feature/kestrel (9 commits, no conflicts): lint 0 errors, tests 1026/1026 (kestrelMap fixed upstream), build ok, quick e2e ok except e2e-editor and e2e-kestrel (both kestrel-owned, identical on kestrel head).

## 07 harness-local
scripts/anim-audit.mjs + src/anim/audit/{limits,metrics}.ts + 25 unit tests. 3 fix rounds (r1: 13 metric definitions - overshoot vs cap, durations, wrist neutral, absolute grip, rising-edge strikes, vault drive, self-intersection arms / weapon, slope window, ray ground, polygon balance, weapon settle in chest frame, landing dip A35; r2: float tolerance, lowest sole point, local joint rate, 120 Hz step rounding, rebound; r3: deterministic idle phase, ground per sole point). Final: full run 47 s, quick 12 s, 92 rows, 563 fails, 0 flips across two runs. Real rig findings in steps/07-fixes-r1.md / r2.md, recorded at step 08.

## 08 harness-remote
Remote poses via ?net=local (A37: undrawn pages, 16 ms client tick). 3 fix rounds (r1: camera refresh - frozen camera had halved rig rate via anim LOD, local fails 690 -> 554; remote LOD placement; poseError split (A38); rubber-band pops; stopidle; clock resets; --band / --compare; run-e2e helper exclusion; r2: A39 gate scope; r3: settle wait after placement, lag fallback, 0.3 s settle, braceboost finding) plus A40 (remote poseError report-only until step 22). Final: lint 0 errors, tests 1052, build ok, compare no regression. Baseline: local 554 fails; remote 100 / 101. Real D8 findings: owner holds stopped stride while copy idles; copy head dips ~13 cm on acceleration; placement recovery > 1.2 s; remote crouch eased binary flag; brace pose offset 31 / 36 cm; gait phase not on the wire.

## Block B end
Full e2e (2 jobs): anim-audit report-only ok (129 s); stealth, mouse, weapons-carry, coop, netmove flaky (all pass serially); e2e-kestrel and e2e-camera-bounds (level U) kestrel-owned (identical on kestrel head). Perf trend: sim p95 2.5 / 2.7 ms, anim 0.0595 / 0.051 ms per char (baseline 0.0566): no rise.
- Kestrel merge 2 (Block B end, 14 commits): lint 0 errors, tests 1090/1090, build ok, quick e2e ok except e2e-editor / e2e-kestrel (kestrel-owned) and e2e-mouse (flaky, passed serially in Block B).

## 09 holster-draw
Holstered unless aiming, no hip fire, ADS spread, dw on the wire (PROTOCOL_VERSION 4), host rules (hostDrawPhase / hostHandsFree / hostShotAllowed / hostShotWeapon), A41-A43, ready hands. 4 implementers (budget) + 1 fix round (fire raised carry while holstered; latency force-holster; shot weapon unchecked; 4 audit rows - causes were stale holstered move speed and audit order; A43 reload). Checks: tests 1104, e2e serial all pass, quick pass (flakes only), netmove drawn / holstered <= 2 cm, holster stow 430-565 ms; anim baseline re-cut (local 354, remote 80). Carried: inertializer swap trigger and remote hip drop -> 22; holstered neckTwist / crouch balance -> 21; remote draw clip -> 25; drag holster -> 27.

## 10 elbow-strike
Elbow strike + cmove / cstart / cdeny + MoveState strike + PROTOCOL_VERSION 5 (A44). 2 implementers; remote mismatch root cause = strike reused the local attached stow overlay (handsBusy instead); elbow arc reworked after the audit caught arm-through-torso. Check PASS: tests 1122, serial e2e all pass, strike netmove 0.5 cm, audit strike rows 0 fails (joint rate 22.9 / 11.5 deg per frame, elbow 128 deg), baseline re-cut with strike rows. Carried: netmove / coop strike test flakes and a coop.md wording -> step 11; queued second strike vs RTT and a damage-cancel test -> step 30.

## 11 wall-core
Back-to-wall core: wallController (pure, 13 tests), MoveState wall slot 1 + WALL_SUB, PROTOCOL_VERSION 6, stacking >= 0.62 m on host and client, remotes pose from a / s with feet pinned under the pushed root, guards flank / flush a wall-held player, hold / toggle, e2e-wall, audit wall scenario. A45-A49. 3 implementers + 3 fix rounds (entry glide / overshoot, back gap, arm through torso, foot skate, ladder clip via stick re-entry, hold-mode loop, wire `a` validation, wall audit determinism). Committed with 3 items Blocked for the Block C end retry (STATE.md). Wall pose polish carried to step 27 (A47).

## 12 wall-corner
Corner peek, lean-out aim, low-wall over-the-top, step round, SWAT (mode 26), corner takedown, lk, PROTOCOL_VERSION 7, peek light parity (bodyLevel head offset, wallPeekOffset from MoveState). A50. 4 implementers + 1 fix round (remote lean yaw, SWAT stance, short-face edge choice, host SWAT replay keyed on mode, remote yaw ease, remote peek ease, tests). Check PASS: tests 1154, netmove peek / lean / SWAT settled <= 2.2 cm, mid-move root 8 cm (joints 70-103 cm, D8 deviation carried to step 27 under A47).

## 12b wall-edge-aim (D9 / D10)
Open-side weapon at edges (openSide, wallLeftHand, mirrored grip, EDGE_HAND_TIME 0.25 s, reversal rewind), low-wall side lean with head cap (A51), exposure and light from the posed head (local; host from its posed copy for remotes). 2 implementers + 2 fix rounds (switch reversal pop, pistol + rifle coverage, remote head cap / light parity, audit determinism: aim assist off and camera clock reset in the harness). Check PASS: tests 1170, netmove left-edge lean 1.1 cm, low-wall head 0.953 m local / host, peek heads 1 mm apart. Deviation: audit grips at edges 17-70 cm (D9 limit 2 cm) carried to step 27.

## 13 door-peek
Door peek (src/world/doorPeek.ts): crack 0.12 over 0.6 s keeps collision / light / guard sight closed (A25), camera through the crack +-35 deg, close / open / end exits, resume of an abandoned crack; host-checked `door` message, snapshot dcr, MoveState doorPeek (27), PROTOCOL_VERSION 8, client crack prediction; touch Peek / Close (A52). Real bug fixed: the session whitelist did not forward `door`. Proving shed got a hinged door in its doorway. 2 implementers + 1 fix round. Check PASS: tests 1194, netmove doorPeek joints <= 2 cm, leaf 0.120. Doorpeek pose fails carried to step 27.

## 14 vision
Thermal and electro as render-only post branches in the cinematic pass (vk uniform), cycle off / night / thermal / electro on pad Select, N, touch Vision; thermal warms rigs and dogs (LIVE_RIGS, LIVE_DOGS, glow on pattern.w) and cools bodies over 60 s; electro glows switch / alarm / terminal / charge, cameras, lasers, sticky-cam lens (A53). Isolation test: perception identical in all modes, nothing on the wire. 1 implementer + 1 fix round (dogs, electro filter). Check PASS: tests 1202, e2e serial all pass; quick-run failures are load flakes (stealth, mouse, darkness, pad).

## PC1 GPU catch-up (secondary desktop, M7)
Desktop baselines (STATE.md). PC-PASS 9-51 checked by 5 opus GPU agents (section 6 of PC-PASS.md): most pass on numbers, look items to Michael, ready hands carried to 21, holster pop to 25, wall / edge pose and the mid-switch weapon jump to 27. New bug: Epic desktop voxel PBR compile failed past 16 samplers once guards alerted (2 shadowed flashlights + CSM + clustered + micro detail): shadow pool capped at 1 with micro detail (A54), checked in e2e-desktop. Remote wall peek: remotes eased the 0.45 lean in over WALL.peekBlend (were snapping; settled ankle 3.9-4.3 cm in 2 of 3 runs, now 2.0-3.7 with the residual from the plain wall entry). HUD empty goggles gap. Harness fixes (shots, sheets, audit reset, e2e-wall midSwitch). Check PASS: tests 1202, quick suite hard fails only kestrel (known) and stealth / traverse (pass alone); e2e-desktop GPU passes except the ray-traced case (M8); audit local 539 (reset diffs, desktop baseline refreshed), remote no gated regression. M8 (no ray tracing here), M9 (port rule), M10 (speed) recorded.

## 15 medkits
src/game/medkit.ts (pure: heal 40 / 1.5 s, mate 2.0 s, carry 2 / 3 Rookie), medkitController, committed move `medkit` (cmove / cstart / cdeny none / full / hit), PlayerState `mk`, MoveState `medkit` 28, PROTOCOL_VERSION 9, health pickups -> kits, Proving `medkitWall`, HUD bar default on (A55-A58). 2 implementers (budget) + 1 fix round. Real bugs found: the host took back a client heal when its snapshots lagged the 0.35 s grace (now reads only post-start snapshots); interactables never existed in sandbox; the cancel refund overshot a clamped heal; the crouched medkit pose put the arms 10-14 cm into the torso (targets now follow the pelvis). Re-check: code PASS; tests 1212; quick (JOBS=2) only known flaky + kestrel + e2e-mouse Esc (passes 2 solo); audit local 541 / 0 regressions, medkit rows 0 fails (crouch footSinkR 5.85 = flat-crouch); remote pops gate noise re-banded (REVIEW-NOTES); perf-trend sim 1.05 ms, anim 0.033 ms/char.
Newly flaky on the desktop (passed 2 solo reruns each): e2e-mouse "losing the capture (Esc) pauses the match" (also Blocked 11b), e2e-modes, e2e-traverse ("touch: the action button grabs the ledge"), e2e-enemies, e2e-offline, e2e-stealth ("view follows look input"); unit tests detailPass / pvp / rig / voxel hit 5 s timeouts under load (pass alone).

## 16 arsenal
src/config/arsenal.ts: campaign set rifle / smg / shotgun / dmr + pistolSd / pistol, `campaignLoadout` / `issuedLoadout` / `campaignKit` mapped at use (no save change, A59), the issued rifle suppressed (A62), suppressor scope (A60), hold breath left for Phase 6 (A61); 14 guns renamed (A28 ids kept). 1 implementer (100-call budget) + 2 fix rounds. Real bugs found by the checkers: the co-op lobby sent the raw save loadout while campaign Infiltration issued the mapped one (host refused the client's weapon and shots for old saves, D8); the same mismatch under ?legacy=1 after the first fix; loadout preset panel / play setup / menu operator showed unmapped guns. Final re-check PASS: tests 1224, quick suite all pass apart from known-flaky pad (600 s cap) and touch (touchmove console error). Unit tests time out at 5 s under load (detailPass, pvp, rig, voxel), pass solo. e2e-offline newly flaky (passed 2 solo reruns, step 16 check 1).
