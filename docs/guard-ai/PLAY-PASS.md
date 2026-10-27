# Guard AI - play pass for Michael's first /preview/ playthrough

Owner: Guard AI Build (laptop). Status: current, 2026-10-26. Prototype mode (ROADMAP "PROTOTYPE MODE", "Prototype, not
polish"): playable over perfect, no tuning passes, one closest test set per PR.

Method: code reading of `src/ai`, `courseMode.ts`, `sectorMode.ts`, `stealthSystems.ts`, plus the probe
`tests/guardPlayProbe.test.ts` (report only: `GUARD_PROBE=1 npx vitest run tests/guardPlayProbe.test.ts`). It builds
both maps as /preview/ boots them, puts every guard on the guards' runtime nav grid (`tests/helpers/runtimeNav.ts`,
with the doors locked at the start shut), and checks each guard's spawn cell, posts inside solids and route legs. It also
checks the walk home after a search at `Enemy.goTo`'s own A* budget (3000 expansions). It ran on master `ee1abab6b`,
on #574 (`feature/marlow-replan-base` 3c0d7c537) and on #525 (`feature/campus-greybox-s1-c` 5b2c40bf4). No e2e and no
browser were used.

## 1. What a player meets

**What /preview/ shows depends on open PRs.** On master today, `ctcourseReplan` is the built yard: every `replan/<set>.ts`
is an S0 stub, and A2's spotted rule is dropped with no stations to replace it. The v2 S1 is a mirror of the live S1
(8 guards). Michael's play needs **#574** (the re-plan sets and station retries) and **#525** (the 15-guard v2 S1). The
rosters below are those PR heads.

### Marlow Yard (`ctcourseReplan`, #574)
Course mode spawns only the live set's squad (`courseMode.spawnSquad`). Every guard is armed (G298): grunt rifle,
officer pistol. A station retry (`seen` = a guard or camera at full detection; A8 `caught`) puts the station's guards
back fresh.

| Set | Guards (kind, post or route) | Cameras | Notes |
| --- | --- | --- | --- |
| A1 Gate | a1-checker grunt, seated post, PASSIVE (blind, deaf) | - | not rated |
| A2 Carriage Shed | a2-shunter grunt, 4-point route (re-plan: watchers removed, post faces east) | - | stations 3-5 |
| A3 Office Range | none (cleaner removed) | cam-a3-hall, no guard response | stations 6-7 |
| A4 Goods Shed | a4-officer post (has info); a4-dock1 post; a4-dock2 post 2.8 m from dock1 (re-plan: no route) | c1, c2, c3 (c3 fixed) | stations 8-10, synced takedown on the dock pair |
| A5 Substation | a5-patrol grunt, 4-point route; a5-watcher grunt post at the kiosk (new) | - | station 13 |
| A6 Pump House | a6-attendant grunt, 9-point route (re-routed) | - | stations 14-16 |
| A7 Data Hall | a7-tech 5-point route; a7-tech2 2-point round (new) | a7-cam1, a7-cam2 | station 17 |
| A8 Strongroom | a8-night1 2-point route; a8-night2 5-point route; a8-officer post on the gallery (y 4.4) | a8-cam1..3 | stations 18-20, `caught` retry |

**Alarms.** Marlow has no alarm panels and no `layout.reinforce` or `guardAi` entries. A guard in combat raises one
alarm per load by radio command call. The banner then says "ALARM / Reinforcements inbound", but no team spawns
(`stealthSystems.onAlarm` returns). The runner (armed, #531 merged) has no panel to run to here. A station retry
resets the guards' memory and alarm.

**Guard-rules flags.** Course slots carry no `pair` tags and no lookout posts, and there are no dogs. So `guardPairs`
(#558), `lookouts` and `dogRelease` (PR4 on `feature/guard-rules-pr4`, no PR yet) change nothing in Marlow.

### Saltmarsh Park S1 (campusOps, `campusV2` on, #525)
15 guards (live / master mirror: 8). `perStage` 2, alarm stages up to 3, so at most 6 reinforcements: 15 + 6 = 21, under
the cap of 32. There are no dogs. Start (24, -79).

| # | Guard | Post / route | Tags |
| --- | --- | --- | --- |
| 0 | officer | post at the gate window | gate, gatehouse |
| 1 | officer | desk <-> kettle | cctv, gatehouse |
| 8 | officer | log <-> barrier | desk, gatehouse |
| 2 + 3 | grunt + officer | car-park aisle, timed 42 s loop | talking pair 2/3 |
| 9 | officer | car-park rows by the gate | patrol |
| 6 | grunt | west fence | perimeter |
| 13 | grunt | east fence | perimeter |
| 4 | officer | C1 badge door, leash 5 | posted |
| 5 + 14 | grunt post + officer 2-point | smoking shelter | pair tag 5/14 (does not form, see P3-4) |
| 7, 10 | grunts | goods door sentry sweep; storeman | dock |
| 11 | grunt | drop-off walkway | forecourt |
| 12 | officer | kerb post | escort |

- **Cameras:** cam-gate and cam-walk. Full detection raises the alarm stage.
- **Alarm panel:** one, in the gatehouse at (15, -72.8). The armed runner (#531) runs to it. The radio command call
  usually raises the alarm first.
- **Each stage** sends 2 armed reinforcements in turn, to (11, -79) and (-33, -41). Their response team sweeps the
  section and never stands down (by design, `sweepTeam.ts`) until the section restarts. `alarmRepeat`: up to 3 guard
  alarms per load.
- **Guard-rules flags:** `guardPairs` (#558): the car-park pair 2/3 notice a missing partner within about 3 s and go to
  look (live after #558). `lookouts` is only the S5 marksman and S1 has no dogs, so PR4 does not touch this play.

## 2. Play-risk bugs (ranked)

The probe found **no static data faults** on either map. Every spawn finds a nav cell (snap under 0.75 m), no post is
inside a solid, and every route leg and spawn -> route[0] has a path with the doors locked at the start shut. Every
reinforce point reaches the start. The risks are behavioural.

**P1-1. After a search, a guard walks into a wall and stands there for good.**
- **Code:** `Enemy` patrol branch, `src/ai/enemy.ts:2791`: `this.goTo(g, dt, 0.05) ?? g`. `goTo` caps A* at 3000
  expansions (`enemy.ts:2731`), about 35-40 m around walls. When it fails, the `?? g` fallback heads straight at the
  route point or post. `tryMove` refuses the step, the 1 s replan fails the same way, and calm has no timer.
- **Where it hits (probe, spots within 45 m of home that fail):**
  - v2 S1 (#525): gate officer 0: 74 / 474; desk officer 8: 43 / 498 (every one more than 20 m out); smoker 5: 7 / 621.
  - Master mirror S1: 30-55 % for every guard.
  - Marlow (within 30 m of home): 0. Sets are small, and a retry resets the guards.
- **Symptom:** a guard who chased you out of the gatehouse never gets back in.
- Post walk-backs (`patrol.ts:163`) share the same path.

**P2-1. The alarm runner freezes: he stops shooting and never reaches the panel.**
- **Code:**
  - `assignAlarm` (`enemyManager.ts:1643`) picks him by straight-line distance, within 30 m, with no path check.
  - `enemy.ts:3241`: the run returns before any fire branch.
  - `enemy.ts:2659`: `this.alarm !== null` keeps `seeing` true, so he never drops to a search.
- **Where:** S1's one panel is inside the gatehouse, so a guard outside it hits the same 3000 budget.
- **How long:** usually freed in seconds, when the radio call raises the alarm. He stays frozen if the caller is taken
  down.

**P2-2. A guard who calms on another storey patrols the wrong floor.**
- **Code:** `goTo` with no y uses his own height (`enemy.ts:2709`), and route points are 2D.
- **Where:** Marlow A8's gallery officer (y 4.4). If he chases you down and calms, he "arrives" on the ground under his
  post and stands there.
- S1 has no upper-floor guards.

**P2-3. The re-plan yard without #574 has no retry rule at all.**
- **Cause:** on master, `ctcourseReplan` drops A2's `spotFail` (`ctcourse.ts`, J14 A1) and has no stations.
- **Symptom:** being spotted in any set is a live firefight with armed guards until both players are down. That breaks
  G370 ("every failure is a retry").
- **Fix:** depends on #574 landing before the play (owner ask below).

**P3 notes.**
- **P3-1.** Course alarm banner: "Reinforcements inbound" but none come (`stealthSystems.ts:547`; courseMode has no
  `alarmQuiet`).
- **P3-2.** `courseMode.spawnSquad` breaks on the first failed spawn, so the rest of the set's squad is silently missing
  (`courseMode.ts:1497`). None fail today; the guard is the probe.
- **P3-3.** `sectorMode.fill` breaks on any failed spawn (`sectorMode.ts:929`). A slot with no nav cell would stall
  every pending guard behind it, reinforcements included, for the whole load. None fail today.
- **P3-4.** v2 S1 smoker pair 5/14 never forms with `guardPairs` on. 14 has an untimed route and no `post`, so
  `postedWhyNot` says "not both standing a post"; it only warns to the console. This is a data fix.
- **P3-5.** No general stuck watchdog in `Enemy.move`. Uncovered: the lure walk back (`posts.ts:182`, no time cap), the
  revive walk to an unreachable body (`enemy.ts:2806`) and sweep followers. Device responders sent upstairs search the
  floor below (`enemy.ts:2918` drops the incident y): S3 / S4 only, not this play.

## 3. Fix slices (file-disjoint, both can start now in parallel)

Test sets come from `affectedPick(files, { max: 1 })` (the `--affected --list` logic, cap 1).

**Slice A - guards get home (Opus, AI behaviour).** P1-1, P2-1, P2-2.
- **Files:** `src/ai/enemy.ts`, `src/ai/patrol.ts`, new `tests/guardHome.test.ts`.
- **Fix:**
  1. Patrol / post branch: `goTo(g, dt, 0.05, homeY, true)` (partial path, A184), and drop `?? g`. If `routeNear` holds
     with under 0.2 m of progress in 5 s, the walker moves on (`advance`; a post guard takes the reached cell as his
     post for this calm spell).
  2. Alarm run: clear `this.alarm` when `goTo` returns null with `routeMiss`, or after 15 s of running.
  3. The walker keeps the spawn height (`SquadSlot.y`) as `homeY` for the calm `goTo`.
  4. The same 15 s give-up for `reviving`, and `POST.lureWalkMax` on the lure walk back (P3-5).
  - No allocation in the loop; no new tuning numbers beyond these caps.
- **Vitest guard:** `tests/guardHome.test.ts`, built on `tests/guardDoors.test.ts`'s EnemyManager-plus-nav setup over
  the v2 S1 grid (`runtimeNav`). Gate officer 0 is set calm 35 m out on the far side of the gatehouse and must reach
  his post within 60 s. Plus the A8 officer case on the ctcourse grid.
- **Test set:** `e2e-stealth-ai`.

**Slice B - spawns and the course banner (Opus or Sonnet from this brief).** P3-1, P3-2, P3-3.
- **Files:** `src/game/modes/courseMode.ts`, `src/game/modes/sectorMode.ts`.
- **Fix:**
  - courseMode: `alarmQuiet(): boolean { return true; }`. In `spawnSquad`, `continue` past a failed slot, not `break`.
  - sectorMode `fill`: break only at the cap (`em.alive >= em.maxAlive`). Otherwise drop that pending slot with one
    `console.warn`.
- **Vitest guard:** turn the probe's spawn and route checks into assertions for `ctcourseReplan` and campus S1 (a new
  asserting `tests/guardPlaySpawns.test.ts`; keep `guardPlayProbe` as the report).
- **Test set:** `e2e-section-rating` (the pick). The closer course check is `e2e-ctcourse` if the lead adds one.

No third or fourth slice: the remaining items are owner data (section 4), or P3 with no play impact.

## 4. Message the owner

**Marlow Build: #574.**
- "Land #574 (re-plan sets and station retries) before Michael's playthrough. Without it, /preview/'s `ctcourseReplan`
  has no spotted rule and no stations (P2-3)."
- "If it cannot land in time, ask the orchestrator to set `marlowReplan` off on /preview/, so the built yard with A2's
  spot rule plays."

**Sector Ops Build: #525.**
- "Land #525 before the play: the v2 S1 is the 15-guard section, and master's mirror is the old 8."
- "Give S1 v2 guard 14 (the second smoker) a `post` (for example `{ leash: 2 }`) so the 5/14 posted pair forms with
  `guardPairs` (P3-4)."
- "/preview/ turns every `campusV2` section on. Land each section's v2 stack whole (S2 #526-#529, S3 #539-#544, S4
  #545-#547, S5 #533-#535). A shell PR without its guards PR puts the mirrored live guards into new geometry."

**Guard AI Build (this lead).** #558 then PR4 as planned. Nothing in them is needed for Marlow or S1 beyond the car-park
pair.
