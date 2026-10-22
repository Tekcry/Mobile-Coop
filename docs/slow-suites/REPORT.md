# Slow suites audit (laptop GPU, E2E_JOBS=5)

Report only (2026-10-23, Character Build, master af56ab43 / v4.61.0). No game or test code changes.

## Data
| Set | Runs | Wall | Suites summed |
| --- | --- | --- | --- |
| JOBS=5 GPU, af56ab43 | loadaudit1 (no extra load), loadaudit2/3 (6-core CPU burner) | 316 / 353 / 361 s | 1489 / 1661 / 1698 s |
| JOBS=3 GPU | train8b, train10, train11, train12, train9c | 443-530 s | 1317-1575 s |
| JOBS=2 GPU | gpufull-00d7a653 | 842 s | 1677 s |
| Software GL J3 (history) | train6-6551afe9 (train7 unfinished) | 2024 s | 6025 s |

Replaying run-e2e's pool with each run's start order and suite times gives back the measured wall exactly (316 / 353 /
361 s). Load (load-audit*.csv): loadaudit1 CPU avg 49 %, p90 87 %, GPU 3D avg 26 %. With the burner, CPU avg 72-78 %,
p90 98-99 %. The GPU is never the limit.

## 1. Every suite (J5 median of 3, J3 median of 5, share of 1624 s, slowdown 3->5, J2, SW GL)
| Suite | J5 | J5 runs | J3 | Share | 3->5 | J2 | SW |
|---|---|---|---|---|---|---|---|
| e2e-ctcourse:1 | 198 | 198/197/203 | 193 | 12.2% | x1.03 | 198 | 221 |
| e2e-ctcourse:2 | 166 | 165/166/166 | 162 | 10.2% | x1.02 | 168 | 305 |
| e2e-ctcourse:3 | 161 | 159/161/162 | 157 | 9.9% | x1.03 | 164 | 449 |
| e2e-course | 158 | 156/158/161 | 156 | 9.7% | x1.01 | 181 | 535 |
| e2e-netmove | 148 | 144/153/148 | 136 | 9.1% | x1.09 | 126 | 480 |
| e2e-coop | 77 | 77/79/76 | 59 | 4.7% | x1.31 | 108 | 610 |
| e2e-menus | 71 | 49/71/73 | 43 | 4.4% | x1.65 | 46 | 784 |
| e2e-desktop:1 | 65 | 52/89/65 | 51 | 4.0% | x1.27 | 64 | 270 |
| e2e-sectorops | 52 | 43/52/52 | 42 | 3.2% | x1.24 | 55 | 177 |
| e2e-mouse | 42 | 34/42/58 | 30 | 2.6% | x1.40 | 46 | 186 |
| e2e-desktop:2 | 37 | 32/37/44 | 29 | 2.3% | x1.28 | 19 | 93 |
| e2e-anim | 37 | 30/37/39 | 23 | 2.3% | x1.61 | 55 | 69 |
| e2e-pad | 36 | 28/36/37 | 24 | 2.2% | x1.50 | 31 | 592 |
| e2e-studio | 35 | 33/35/36 | 32 | 2.2% | x1.09 | 23 | 137 |
| e2e-stealth-ai | 32 | 27/32/35 | 22 | 2.0% | x1.45 | 56 | 49 |
| e2e-ct | 30 | 26/30/33 | 23 | 1.8% | x1.30 | 29 | 69 |
| e2e-traverse | 30 | 30/35/26 | 17 | 1.8% | x1.76 | 35 | 82 |
| e2e-desktop:4 | 25 | 19/25/29 | 18 | 1.5% | x1.39 | 43 | 112 |
| e2e-move | 22 | 22/20/37 | 16 | 1.4% | x1.38 | 21 | 69 |
| e2e-lightbake | 22 | 21/22/27 | 20 | 1.4% | x1.10 | 57 | 103 |
| e2e-stealth | 19 | 16/19/20 | 15 | 1.2% | x1.27 | 15 | 46 |
| e2e-tuner-phone | 18 | 14/19/18 | 14 | 1.1% | x1.29 | 13 | 91 |
| e2e-offline | 17 | 14/17/19 | 14 | 1.0% | x1.21 | 18 | 30 |
| e2e-wall | 16 | 11/16/18 | 10 | 1.0% | x1.60 | 9 | 17 |
| e2e-weapons-carry | 16 | 12/16/17 | 12 | 1.0% | x1.33 | 20 | 22 |
| e2e-tactics | 14 | 11/14/14 | 10 | 0.9% | x1.40 | 10 | 15 |
| e2e-clip | 14 | 10/14/14 | 8 | 0.9% | x1.75 | 16 | 20 |
| e2e-takedown | 12 | 9/12/13 | 8 | 0.7% | x1.50 | 13 | 12 |
| e2e-feedback | 9 | 8/9/10 | 7 | 0.6% | x1.29 | 10 | 14 |
| smoke | 9 | 9/9/10 | 8 | 0.6% | x1.13 | 8 | 21 |
| e2e-gadgets | 9 | 7/9/9 | 6 | 0.6% | x1.50 | 7 | 12 |
| e2e-combat | 7 | 6/8/7 | 5 | 0.4% | x1.40 | 4 | 11 |
| e2e-levels | 7 | 6/7/7 | 5 | 0.4% | x1.40 | 4 | 7 |
| e2e-park | 7 | 6/7/8 | 5 | 0.4% | x1.40 | 4 | 10 |
| e2e-anchors | 6 | 5/6/7 | 4 | 0.4% | x1.50 | 3 | 5 |
| Sum | 1624 | | 1384 | | x1.17 | 1677 | 6025 |

Two kinds of suite:
- **Clock-bound:** ctcourse:1-3, course and netmove (831 s, 51 %). rAF is capped at display rate (E2E_UNCAP off,
  e2e-lib.mjs:18), so the sim runs at real time at best; the scripts wait on sim seconds (e2e-net-lib.mjs:48-80).
- **Throughput-bound:** the other 30. They slow down x1.2-1.8 under CPU contention.

run-e2e has parts only for e2e-desktop and e2e-ctcourse (run-e2e.mjs:53).

## 2. Critical path and start order
The queue is sorted longest first by scripts/e2e-times.json (run-e2e.mjs:193-194), with 5 slots filled as they free
(:251-253). The file is stale:
- Last committed 2026-10-20 (a99ce606).
- Rewritten only after an all-green full run in the worktree that ran it (:263-267); never committed back.
- sectorops, studio and tuner-phone are missing, so they sort as 0. anim is recorded as 5 s; it now takes 37 s.

So these start at positions 31-34 of 35; anim, studio and sectorops are the last finishers in all 3 runs. The first 5
starts are correct (ctcourse:1-3, course, netmove).

| Replay of J5 median times | Wall |
| --- | --- |
| Stale order | 347 s |
| Longest first | 325 s |
| sum / 5 | 325 s |
| Longest suite | 198 s |

Per run: 316 -> 301 s, 353 -> 334 s, 361 -> 344 s. At J3 the order costs only 1-6 s.

With the right order the wall is set by total work (sum / 5), not by the longest suite. Every 5 s of suite work removed
saves about 1 s of wall until the wall nears 198 s. Splitting a suite adds a boot, so it does not help at J5.

## 3. Why the top 6 are slow
| Suite | J5 | Boots | Literal fixed waits | Clock |
|---|---|---|---|---|
| ctcourse:1 | 198 | 1 match, 2 pages | 13.4 s + 3 airlocks x 4 s | sim |
| ctcourse:2 | 166 | 1 match, 2 pages | 9.4 s + 2 airlocks | sim |
| ctcourse:3 | 161 | 1 match, 2 pages | 5.9 s + 2 airlocks | sim |
| course | 158 | 4 matches, 7 page-matches | 7.2 s (+1.5 s Fallow) | wall |
| netmove | 148 | 1 match, 2 pages | about 63 s floor | sim |
| coop | 77 | 8 two-page loads + 1 offline page | 14.6 s | wall |

### e2e-ctcourse
- **Boot per part:** each part is a fresh browser with two pages, a Marlow Yard build and a join
  (e2e-ctcourse.mjs:21, :850-857), plus the avatar checks (:861-873).
- **Airlocks:** throughAirlock (:827-832) waits out the 4 s AIRLOCK_CYCLE (src/config/course.ts:7) in real time,
  7 times (28 s). e2e-course already skips its airlock with stepHeadless(4.5) (e2e-course.mjs:191).
- **Station 3 game timers on the live clock:** camera detection (:216, up to 90 s), stale-report window (:238-264),
  5 s jam cap (:303) and 1.5 s reboot (:310), cooldown about 5 s (:336), lamp off 4 s (:345-348).
- **Station 3 fixed sleeps:** 800/300/400/800/2000 ms (:288, :299, :308, :342, :346); aimAt 4 x 120 ms (:175-187);
  lt 300 ms (:190-197). Security room: 600 ms (:393) plus a 10 x 300 ms loop (:402-407).
- **Pause block (part 1):** 3 x 200 ms + 2200 ms (:873, :879, :885, :893).
- **Parts 2-3:** legUp 650 ms (:127, :133); laser 1500 + 2000 ms (:442, :463); throw 500/600/2500 ms (:480, :532,
  :544); rope 500/1200/400 ms (:615, :647, :675), plus climbs up to 30-40 s (:637, :663); revive 2500 ms (:816).
- **Polling:** 112 until() call sites, many inside moveHost / moveClient (:98-108). Each until reads both sim clocks
  first, then polls every 100 ms with 3 evaluates (e2e-net-lib.mjs:48-64). Estimated 15-30 s per part, not measured.
- **Unexplained remainder:** literal waits cover only 14-25 s per part. No per-section timing exists to split the rest
  into boot, polling and move time (no [profile] lines; E2E_PROFILE does not time until / waitSim).

### e2e-course
- **Four match loads:** lobby co-op on courselab (:110); bay-2 restart (:444); Fallow solo, a parked legacy map
  (:474-476, with wait 1500); walk-URL pair on courselab (:505-508) (every ctcourse part already boots this way,
  ctcourse :850-857).
- **Waits:** wall-time wait() (:16), 7.2 s in all. The host is pumped headless every 40 ms (:33-52).

### e2e-netmove
- **Setup:** one match (:14, :136), then about 13 sections.
- **compare():** runs 20 times (:52-108). Each call is at least 1.7 s of sim: settle loop of 300 ms or more (:65-71),
  fixed 800 ms (:73), host settle of 300 ms or more (:86-91), final 300 ms (:92). That is 34 s for the 20.
- **reset() and attach():** reset 18 x 600 ms (:132) = 10.8 s; attach 5 x 400 ms (:120).
- **Total floor:** about 63 s of sim before any move runs (wait = waitSim, :10).

### e2e-coop
- **Match loads:** 8 two-page loads (:123-124, :362, :418, :714-715, :725, :753, :800, :864-866) plus an offline page
  (:892). Warehouse is loaded 4 times.
- **Wall waits:** 11.6 s literal; 3000 ms at :785 runs twice, so 14.6 s.

### Next three
- **menus (71 s, 49 s unloaded):** 297 literal frames, 5.5 s of waitForTimeout (:48, :52, :277, :330-335), 10 page loads.
- **desktop:1:** a 4-run benchmark (:172-219).
- **sectorops:** slow mainly because it starts last.

## 4. Levers (report only)
| # | Lever | Where | J5 wall saving | Risk |
|---|---|---|---|---|
| 1 | Fresh committed e2e-times.json, a high default for unknown suites, and the laptop runner copies the file back after a green run | run-e2e.mjs:193-194, :263-267 | 15-22 s (347 -> 325) | None |
| 2 | E2E_JOBS=6 on the unloaded laptop | runner setting | est. 30-40 s (325 -> 288) | Medium: load flakes; needs 2-3 measured runs |
| 3 | netmove: replace the fixed 800 / 300 ms in compare and the 600 ms in reset with conditions | e2e-netmove.mjs:73, :92, :132 | est. 6 s | Low-medium |
| 4 | ctcourse: step pure timer waits headless on both pages (airlocks 28 s, station 3 timers about 15 s, revive 2.5 s) | ctcourse :827-832, :303-348, :816 | est. 9 s; also cuts ctcourse:1 by about 25 s | Medium: two-page clock drift |
| 5 | course: move the Fallow boot to e2e-bunker (legacy); drop the walk-URL pair | e2e-course.mjs:465-520 | est. 3-5 s | Low |
| 6 | until(): poll every 25-40 ms; skip the clock reads on a first-check hit | e2e-net-lib.mjs:48-64 | est. 5-10 s | Low-medium |
| 7 | coop: share matches between sections; sim-time instead of the 2 x 3000 ms wall waits | e2e-coop.mjs:418, :714, :725, :785 | est. 2-4 s | Medium |
| 8 | Per-section timestamps, or time until / waitSim / loads in E2E_PROFILE | e2e-lib.mjs:62-84 | 0 s; turns the estimates into measurements | None |
| 9 | Split or rebalance the ctcourse parts | run-e2e.mjs:53 | 0 s now; useful only once the wall nears 198 s | Low |

Levers 1 and 3-7 together: about 300-305 s. Adding lever 2: about 265-275 s, at which point ctcourse:1 starts to set
the wall.
