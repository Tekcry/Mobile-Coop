# Load-latent e2e checks - static scan (2026-10-23)

Character Build, branch `feature/load-latent`, from master af56ab43 (v4.61.0). Report only: nothing run, no code changed.
Scope: every suite in `run-e2e.mjs` REQUIRED (31 suites, e2e-desktop parts 1, 2, 4). All scanned.

Counts: **6 high, 26 medium, 27 low** (59). Already-known fixes excluded: e2e-coop takedown offer (feature/coop-offer-load,
not in master), e2e-ct fence rattle (feature/ct-rattle-sample, not in master), netmove compares (#154), menus fling (#148),
studio throttle waits (#140, #143), crash-log page navigation (feature/load-audit 4da742ce, not in master).

## Facts that drive the ratings

- `loop.ts` caps a frame at 0.1 s and 4 fixed steps: at 2-3 fps the sim runs x0.2-0.3. A fixed wall wait gives less game
  time under load; `frames(n)` gives more. Suites in `loop.manual` + `stepHeadless` are deterministic (anim, stealth-ai,
  takedown, ct, gadgets, wall, clip, anchors, levels) apart from noise-sampler phase.
- **Systemic (two-page Marlow suites):** e2e-ctcourse, e2e-course and e2e-sectorops' co-op section pump the host sim
  headless (40 ms pump, about real time) while `waitSim` / `until` count the slowest page, the client. Under load the
  host's clock runs 3-5x the clock the waits measure, so any host-timed window (jam caps, offHold, pair windows, revive
  window) checked after a client-clock wait is at risk. Three of the six highs come from this.
- Pages from `ctx.newPage()` / own contexts keep Playwright's 30 s navigation and action defaults until 4da742ce lands
  (and 4da742ce sets navigation only, not the action timeout).

## High

| # | Suite | File:line | Assert | Why | Fix |
| --- | --- | --- | --- | --- | --- |
| 1 | e2e-ctcourse | scripts/e2e-ctcourse.mjs:459-464 | station 4: no break while the laser is jammed | 3 untils + moveClient + `sleep(2000)` on the client clock = 7-10 s of pumped host time; the 5 s jam + 1.5 s reboot ends, laser back on with the client on the beam | Re-pin the jam every host step (as sectorops `__forceJam`) or time the 2 s on A's clock (`__afterSim` on A) |
| 2 | e2e-ctcourse | scripts/e2e-ctcourse.mjs:344-347 | station 3: the lamp stays off after the release | `sleep(2000)` on the client clock vs JAM_LIGHT.offHold 4 s on the host; ratio > 2 and the lamp is flickering back | Wait 2 s of host sim (`__afterSim(2)` on A), or latch "lit" over that host window |
| 3 | e2e-ctcourse | scripts/e2e-ctcourse.mjs:286-290 | station 3: the jammed camera stops sweeping on both pages | needs `cams[0].jam === 1` after 2 untils + reads + `sleep(800)` client clock = 3-4 s+ host time, at the 5 s cap (jam goes 2) | Sample yaw over a host-sim window inside the jam, or hold the cap timer for the check |
| 4 | e2e-coop | scripts/e2e-coop.mjs:622-660 | client grabs a host guard from behind | Same shape as the fixed offer loop: host pinned/calmed once per attempt, offer sampled per 150 ms poll, must be `behind`; 6 attempts | coop-offer-load pattern: pin on every host rAF + client rAF latch that starts the grab the frame the offer shows, client game-time budget |
| 5 | e2e-mouse | scripts/e2e-mouse.mjs:40-43 | captured mouse movement looks | mouse delta applied to `cam.yaw` on a rendered frame; fixed 200 ms wall wait then one read; at 2-3 fps no frame may have run | `frames(page, 3)` or wait on the yaw change with a frame / game-time budget (keep > 0.1) |
| 6 | e2e-desktop:1 | scripts/e2e-desktop.mjs:228-239 | a crash leaves a report / a reload is not reported as a crash | `ctx.newPage()` page: goto/reload 30 s (4da742ce fixes) and `waitForSelector('.main-menu')` 30 s action default (4da742ce does not) | 4da742ce plus a 60 s boot wait as openPage (or `ctx.setDefaultTimeout`) |

## Medium

| # | Suite | File:line | Assert | Why | Fix |
| --- | --- | --- | --- | --- | --- |
| 7 | e2e-coop | e2e-coop.mjs:533-555 | client elbow strike knocks the host's guard out | `pinSk` only between 300 ms polls, no calm; `strike.begin()` once per attempt | Pin every host rAF; retry `begin` on the client frame |
| 8 | e2e-coop | e2e-coop.mjs:138-139 | client mirrors host enemies (abs <= 1) | compare right after host `stepHeadless(7.5)` spawned squads; client may hold an older snapshot | `until(B, puppets.size >= hostAlive - 1)` first |
| 9 | e2e-coop | e2e-coop.mjs:897-909 | co-op shows an offline state / retry recovers | SW control waited 200 x 50 ms wall and silently given up; selector waits 8 s / 5 s wall for a lazy chunk | Await `serviceWorker.controller` on the 120 s load budget (fail loudly); selector waits to the load budget |
| 10 | e2e-ctcourse | e2e-ctcourse.mjs:302-304 | the camera reboots blind (`jam === 2`) | 1.5 s host reboot vs a Node poll loop that can take 1-1.5 s wall at 3 fps | Latch the jam phase sequence in a host rAF hook (as `watchTeam`), assert 1 -> 2 |
| 11 | e2e-ctcourse | e2e-ctcourse.mjs:814-818 | station 8: the 30 s window runs on the host (`left > 15`) | `waitSim(2500)` on the client clock; at x0.2 about 12 s of host time passes | Read A's `g.time` before/after; assert `30 - left` equals host elapsed sim |
| 12 | e2e-ctcourse | e2e-ctcourse.mjs:722-724 | station 6: both hacks inside the window open the door | host press + client press via the client page; 1.5 s window on the pumped host | Fire the second press in-page on the host frame when the client's `use` arrives (as 697-707), or hold the pump |
| 13 | e2e-ctcourse | e2e-ctcourse.mjs:766-768 | station 5: both roof plates pressed | same race, PAIR_WINDOW 1.0 s host | as #12 |
| 14 | e2e-course | e2e-course.mjs:280-281 | pair open | same race, PAIR_WINDOW 1.0 s host | as #12 |
| 15 | e2e-ctcourse | e2e-ctcourse.mjs:595-598 | the client is back on the roof, upright | client read right after the host's `team.state === 'none'`; client may not have finished the pull-up | `until(B, y > 4.2 && tumble === 0 && state 'none')` first |
| 16 | e2e-netmove | e2e-netmove.mjs:319-328 | host copy stows within 0.1 s + one frame / holstered <= limit | host wall ms from receipt to stow; a second host frame at 150-500 ms overruns; `holMs` mixes clocks | Count host updates / render time from receipt (first update past receipt + 0.1 s), not wall ms |
| 17 | e2e-feedback | e2e-feedback.mjs:31-38 | the free camera flies (> 0.5 m) | keys held 700 ms wall; photo cam moves 3 m/s x dt (cap 0.1 s): 1-2 frames = 0.3-0.6 m | Hold until `__app.time` moved 0.7 s (wall cap as hang guard) |
| 18 | e2e-lightbake | e2e-lightbake.mjs:138-141 -> :210 | lamp plugin on every PBR material | 5 s wall wait for loaders, 4 browsers incl. Epic on software GL | Same wait on a 60-120 s load budget |
| 19 | e2e-lightbake | e2e-lightbake.mjs:180-183 -> :214 | Epic at Ray traced falls back to SSR | fixed 1500 ms wall then one read of the post stack | `waitForFunction` until `ssr` present (60 s), same assert |
| 20 | e2e-mouse | e2e-mouse.mjs:70-78 | RMB held draws and aims | 160 x 50 ms (8 s wall) for 1.5 s draw + ADS ramp; > 8 s at x0.2 | Game-time budget (`__app.current.time`, ~3 s), wall cap as hang guard |
| 21 | e2e-mouse | e2e-mouse.mjs:99-101 | an X tap holsters | 100 x 50 ms (5 s wall) for a 1.0 s game-time holster | as #20 |
| 22 | e2e-pad | e2e-pad.mjs:779-794, 883-893 | remap capture (A then R3, Start cancels "5 or 4", A then B) | capture expires on a 5 s wall timer (controlsScreen.ts:141) while press() spends frames; matches backlog's parked failure (`cap:false, screen:false`); KNOWN_FLAKY | Check `capturing` in the same input poll that delivers the button; read the countdown at the A poll |
| 23 | e2e-menus | e2e-menus.mjs:249-268 | ?menuClock=fast changes the shot / fade > 0.15 | shot director runs on capped frame dt; at 2 fps the x8 clock is x1.6; T2 needs > 8 s wall | Wait on director seconds / `shotChanges` with a director-time budget |
| 24 | e2e-menus | e2e-menus.mjs:727-737 | pause button tap pauses / Resume resumes | `untilTop` 3 s wall cap = one iteration at 0.5 fps; already failed once (train 9) | Budget in frames or game time (60 frames / 2 s of `__app.current.time`) |
| 25 | e2e-desktop:2 | e2e-desktop.mjs:263-264 | Hor+ and HUD inset (3 aspects) | warehouse match after goto waits 60 s; e2e-pad needed 120 s for the same | 120 s (`LOAD_MS`) |
| 26 | e2e-offline | e2e-offline.mjs:86-88, 99-101 | a match / Infiltration runs offline | same 60 s warehouse match wait | 120 s |
| 27 | e2e-offline | e2e-offline.mjs:93-97, 107-108 | offline player is Wren from the cache (LOD2) | 30 s wall for the texture transcode at ~1 fps; `waitOperator` defaults 120 s | `waitOperator(page, 3)` |
| 28 | e2e-desktop:1 | e2e-desktop.mjs:211-216 | no match kept in memory after it ends | async release polled 20 x 500 ms wall | Frame budget with GC between counts, wall cap as hang guard |
| 29 | e2e-traverse | e2e-traverse.mjs:521-543 | keyboard: Space grabs the ledge / C lets go | live loop, 18 x 40 ms wall per press, up to 4 re-presses: a re-press during a slow grab climbs off the ledge | Per-press game-time budget (0.7 s of `__app.current.time`), re-press only after it; or manual + fixed `stepHeadless` |
| 30 | e2e-weapons-carry | e2e-weapons-carry.mjs:253, 259, 272 | checkLoadout after reboots | goto/reload match boots wait 30 s for the player (openPage uses 120 s) | 120 s |
| 31 | e2e-weapons-carry | e2e-weapons-carry.mjs:264-288 | detailed avatar with a backpack | settings 250 ms timer + save 200 ms debounce + IDB write vs a fixed 600 ms wall wait before reload | `save.flush()`, poll IDB until both read back, then reload |
| 32 | smoke | smoke.mjs:13-16, 23 | boot status / anim tuner ok | own context + `ctx.newPage()`: goto keeps 30 s (not openPage; 4da742ce only covers `launch()`) | `setDefaultNavigationTimeout(120000)` or use `launch()` |

## Low

| # | Suite | File:line | Assert | Fix |
| --- | --- | --- | --- | --- |
| 33 | e2e-course | e2e-course.mjs:259-267, 285-286 | bolt / hold / egress opens (host gate read right after client `use`) | `until(A, gate open)` on sim clock |
| 34 | e2e-course | e2e-course.mjs:272-276 | timed hold stays open (6 s host, after client-clock waits + 400 ms wall) | Check on a host-sim deadline |
| 35 | e2e-ctcourse | e2e-ctcourse.mjs:513-530 | client arc clears the top beam (apex sampled per poll) | Latch max y at the line in a client fixed-step hook |
| 36 | e2e-ctcourse / e2e-sectorops | e2e-ctcourse.mjs:455-458, e2e-sectorops.mjs:637-639 | client sees the panel jammed / band off (transient polled 100 ms wall) | Latch in a client rAF hook |
| 37 | e2e-coop | e2e-coop.mjs:758-776 | holds the course guard (offer per poll, no pin) | Client rAF latch |
| 38 | e2e-coop / e2e-ctcourse | e2e-coop.mjs:23-48, e2e-ctcourse.mjs:61-86 | host avatar in view (2 rAF or 3 s setTimeout, first wins) | 2 rendered frames only, no wall cap |
| 39 | e2e-netmove | e2e-netmove.mjs:76-83 | waitForFunction 8 s wall, in-page polling, swallowed | e2e-net-lib `until` |
| 40 | e2e-sectorops | e2e-sectorops.mjs:133-137 | star saved with a best time (IDB 20 x 250 ms) | Load-budget wait or await the save |
| 41 | e2e-sectorops | e2e-sectorops.mjs:98-101 | cycle locks the near door (`cycling` after `sim(1.3)`, live loop adds steps) | Pause the real loop while stepping, or latch the phase |
| 42 | e2e-lightbake | e2e-lightbake.mjs:172-176 | only the level material compiles LAMP_LEVEL / SKY (60 x 500 ms) | Frame budget or 120 s |
| 43 | e2e-feedback | e2e-feedback.mjs:71-74 | saved to the device with its photos (`wait(400)` then IDB read) | Poll `feedback.all()` (30 s) |
| 44 | e2e-feedback | e2e-feedback.mjs:81-84 | listed after a reload (`wait(400)` then rows) | `waitForFunction(rows >= 1)` (30 s) |
| 45 | e2e-studio | e2e-studio.mjs:720, 725, 736, 768, 1027, 1041, 1167 | panel readout waits: 3 s wall cap, in-page polling, fall through | ~30 s cap or poll from Node |
| 46 | e2e-desktop:1 | e2e-desktop.mjs:130 | setup before "rebound key reloads" (60 s match wait) | 120 s |
| 47 | e2e-desktop:1 | e2e-desktop.mjs:108-110 | "Reverting ... in 10 s" (wall interval; one slow frame reads 9 s) | Read in the same wait that sees the dialog, or allow the counted-down value |
| 48 | e2e-desktop:1 | e2e-desktop.mjs:233-236 | crash note polled 40 x 100 ms | 30 s wait |
| 49 | e2e-pad | e2e-pad.mjs:489-491 | quit returns to main menu (`waitForTimeout(400)`) | `waitForFunction(.main-menu)` |
| 50 | e2e-mouse | e2e-mouse.mjs:205-213 | Esc pauses / Resume recaptures (300 ms then one read) | `waitForFunction` on the state |
| 51 | e2e-mouse | e2e-mouse.mjs:113-116 | T swaps weapons (1200 ms wall) | Wait on the index change |
| 52 | e2e-park | e2e-park.mjs:72 | lobby + `__coop` after the net chunk loads (15 s) | 60 s |
| 53 | e2e-offline | e2e-offline.mjs:127 | `.coop-offline` (8 s) | 30 s |
| 54 | e2e-move | e2e-move.mjs:136-197 | planted feet stay planted (per-frame samples, count depends on load) | Sample per fixed step in the wrapper + `__ff` |
| 55 | e2e-traverse | e2e-traverse.mjs:548 | boot wait after reload (60 s) | 120 s |
| 56 | e2e-ct / stealth-ai / takedown / traverse | e2e-ct.mjs:65-68, e2e-stealth-ai.mjs:13-17, e2e-takedown.mjs:14-18, e2e-traverse.mjs:121 | live `frames()` before manual sets a load-dependent `noiseT` / think phase (root of the rattle flake) | Reset the sampler phase after going manual, or always latch noise (`runNoise`) |
| 57 | e2e-tactics | e2e-tactics.mjs:220-224 | HUD exposure meter shows (one DOM read, live loop) | Latch `.show` over a window |
| 58 | e2e-tactics | e2e-tactics.mjs:238-252 | crouched sneak is near silent (noise sample phase, live loop) | Latch samples (`noiseT` reset) or go manual first |
| 59 | e2e-combat | e2e-combat.mjs:105-106 | d-pad right throws a grenade (read right after press; fast-GPU risk) | `sim(0.2)` or until the count drops |

## Checked clean

e2e-anim, e2e-stealth-ai, e2e-takedown, e2e-ct (beyond the known rattle), e2e-gadgets, e2e-wall, e2e-clip, e2e-anchors,
e2e-levels (manual + `stepHeadless`, noise latched); e2e-stealth, e2e-combat respawn / reload (sim-timed `forSim` / `sim`);
e2e-tuner-phone (per-event touch, one frame between moves); e2e-studio `panel()` reads after `frames(4-12)`.

## Suggested order

1. The Marlow host-pump class (#1-3, #10-15): one helper that waits on A's clock (`waitHost(ms)` reading A's
   `g.time`) fixes most of it; the pair-window races want the in-page second press.
2. #4 and #7 with the coop-offer-load pattern (land with PR #158's branch).
3. #5, #20, #21 (e2e-mouse) and #24 (menus): game-time / frame budgets.
4. Load-budget sweep: #6, #25-27, #30, #32, #46, #55 (one shared `LOAD_MS`), plus 4da742ce with `ctx.setDefaultTimeout`.

## Status and planned fixes (2026-10-23 ~00:50)
High findings: the three e2e-ctcourse highs (jam / lamp / camera windows on the host clock, new `waitHostSim` in
e2e-net-lib.mjs), the e2e-coop grab and the e2e-mouse look are fixed on feature/load-audit (0067b5f5, da629375); the
e2e-desktop:1 crash-log page and smoke's own context are covered there too (2746f123, 777a056e, 7d4dbc5f). Medium and
low findings are deferred (orchestrator). Planned fixes for the e2e-ctcourse mediums (asserts and limits unchanged):
- #11 station 8 (`waitSim(2500)` before "the 30 s window runs on the host (sim time)"): `waitHostSim(A, 2500)`; read the
  host's `__app.current.time` and `reviveClock.remaining(id)` before and after; put the host time elapsed in the message.
- #10 station 3 camera reboot: a host rAF hook installed before the cap ends records `{cool[0], jam, mode, frozen,
  alarm}` once, in the first frame `cams[0].jam` goes 1 -> 2; assert on that record, not a late `dev(A)` poll.
- #12 station 6 synced hack (1.5 s window): no `Promise.all`; a host rAF hook calls `onUse(it, 'local')` on
  `c-sw-s6-a` in the first host frame where `debug().scan.ph[1] !== 'idle'` (the client's start reached the host), then
  `use(B, 'c-sw-s6-b')`; read the host's result from the hook (same pattern as the existing `__s6` client hook).
- #13 station 5 roof plates (`PAIR_WINDOW` 1.0 s): press `c-sw-s5-b` on the client, a host rAF hook presses `c-sw-s5-a`
  in the first frame the client's press shows on the host (open: which host field shows it; see the pair-gate state in
  src/game/course/courseState.ts around 689).
- #15 station 5 "back on the roof, upright": `until(B, ...)` on `controller.pos.y > 4.2`, tumble 0 and
  `team.state === 'none'` before reading.
- #35, #36 transients read per poll: a page rAF hook latches the transient state every frame; assert on the latch.
