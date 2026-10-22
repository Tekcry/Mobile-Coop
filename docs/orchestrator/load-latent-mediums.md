# Load-latent medium findings #7-#32 (orchestrator review, 2026-10-23 ~00:55, against master 102e6f41)

For Character Build's load-audit follow-up (feature/load-latent report c6437901). 22 real, 2 not real (#8, #16), 1 already
fixed (#32 by load-audit 777a056e), 1 tail risk (#10).

Correction to the report's planned fixes #10-#14: the host page A is backgrounded and the pump only steps it when A's rAF
did not run (ctcourse:34-55, course:29-48), so host hooks must run on the sim step, not rAF: a property accessor (the
watchTeam pattern) or a wrapper on `__app.loop['hooks'].fixedUpdate`. A shared `onHostStep(A, fn)` in e2e-net-lib covers
all of them. Start the ctcourse fixes from feature/load-audit (has waitHostSim).

| # | script:line (master) | check | fix |
| --- | --- | --- | --- |
| 7 | coop:543-569 (+~15) | client elbow strike knocks guard out | pin + `v.update=()=>{}` + calm every host rAF (`__tdPinOn` pattern); client rAF calls strike.begin() when pickTarget()===id; 6 s client game time, 90 s wall cap |
| 9 | coop:912-926 | offline retry recovers | `waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:120000})` (throws); selector waits 30 s |
| 10 | ctcourse:302-304 | camera reboots blind | host step hook snapshots `__ctdev.debug()` on the first step with cams[0].jam 1->2; assert on the snapshot |
| 11 | ctcourse:816-818 | 30 s window on host | `waitHostSim(A, 2500)`; log host time delta |
| 12 | ctcourse:720-722 | station 6 synced hacks | client presses c-sw-s6-b only; host step hook calls onUse(c-sw-s6-a,'local') on the first step with scan.ph[1]!=='idle' |
| 13 | ctcourse:766-768 | station 5 roof plates (PAIR_WINDOW 1.0) | client presses c-sw-s5-b; host step hook presses c-sw-s5-a on the first step the g-s5 gate's tb>=0 |
| 15 | ctcourse:595-598 | client back on roof, upright | `until(B, y>4.2 && tumble===0 && team.state==='none', null, 8000).catch()` then the same assert |
| 14 | course:279-280 | pair open | client half from Node; host step hook presses A's half when the gate's client stamp appears |
| 17 | feedback:31-38 | free camera flies >0.5 m | hold keys until in-page rAF sum of min(dt,0.1) reaches 0.7 s, 30 s wall cap |
| 18 | lightbake:28-31 | lamp plugin on every PBR material | same waitForFunction with timeout 120000 (keep .catch) |
| 19 | lightbake:67-68 | ray traced falls back to SSR | waitForFunction(ssr && !rtReflect, 60000).catch(), then the read |
| 20 | mouse:70-78 | RMB held draws and aims | poll until drawn or game time +4 s, 60 s wall cap |
| 21 | mouse:99-101 | X tap holsters | game-time budget 3 s, 60 s wall cap |
| 22 | pad:779-794, 883-893 | remap capture | new e2e-lib pressPair(P,b1,b2) in one evaluate; assert on recorded values |
| 23 | menus:248-268 | menuClock=fast shot change / fade | in-page rAF loop on summed min(dt,0.1), fail after 8 s (10 s), 120 s wall cap |
| 24 | menus:727-737 | pause / resume | untilTop loops 30 x frames(P,2), 60 s wall cap |
| 25 | desktop:263 | Hor+ / HUD inset | timeout 120000 |
| 28 | desktop:211-216 | no match kept in memory | up to 60 s: frames(page,2) then count() until 0 |
| 26 | offline:87, 99 | match / Infiltration offline | timeout 120000 |
| 27 | offline:93-97, 106 | Wren from cache (LOD2) | timeout 120000 |
| 29 | traverse:521-543 | Space grabs ledge / C lets go | pressUntil waits per press until done or game time +0.7 s (30 s cap) |
| 30 | weapons-carry:253, 259, 270 | loadout / backpack after boots | timeout 120000 |
| 31 | weapons-carry:262-270 | detailed avatar with backpack | replace the 600 ms wait with a poll of persisted settings + save records (30 s), then reload |
