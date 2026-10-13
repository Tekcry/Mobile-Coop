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
