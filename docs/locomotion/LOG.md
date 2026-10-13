# Locomotion run - log

One short entry per step: what changed, numbers, commit.

## 00 setup - 93c6ee8
Branch, brief, rules, D1-D8 into bible 1.13 (5.17), perf-trend script. Baseline: check 1015/1016 (kestrel-owned fail), perf sim p95 2.65 ms / anim 0.0504 ms per char (budget x2.68 speed = 0.107), netmove worst 3.7 cm.

## 01 audit
4 Explore reports in audit/, opus checker: 108 rows (35 pass, 43 fix, 19 rework, 10 remove); 62 rows spot-checked, 54 pass, 8 line fixes, 0 dropped. Findings: walk sway 5.3 cm p2p (limit 3), heel-strike kick double dip, camera footstep kick, weapon sway never settles, knee / hip rate limits allow > 25 deg per frame, vault 0.42 / crouch-to-stand 0.28 / ladder sprint rung 0.2 / takedown 0.92 s under the bible minimums.
