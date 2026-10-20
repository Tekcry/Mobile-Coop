# Guard AI and model review (2026-10-20, orchestrator review on master b125599e, suggestions only)

Michael: "review guards, eventually we will need to upgrade their model with a new more accurate prototype that reflects
military guards. ... make them slower and more careful, move around with purpose, and not all be alerted at the same
time when they hear things break. Only one person needs to investigate etc - research enemy/guard AI. They shouldn't
just walk around aimlessly."

## 1. Today (from code)
- Patrol: `PatrolWalker` (src/ai/patrol.ts:51-187) walks fixed points (loop / ping-pong / timed), waits `PATROL.wait` 9 s
  (patrol.ts:37) or map `waits`, faces the next leg or `faces`. Post guards glance 0.6 rad every 14 s for 2.4 s
  (patrol.ts:39-41, 143-153). No randomness (G143, bible 5.7). Nothing happens at a stop: the Sector Ops roles
  (warehouseSectors.ts:30-48, 90-107, 143-163: goods-in checker, smoker, CCTV operator) are comments only, so guards read
  as aimless. docs/systems/ai.md:36 (wait 5.5, glance 10) is stale.
- Speeds (enemy.ts:133-137 x src/config/enemies.json): grunt patrol 0.99, investigate 1.08, search 1.17, run 3.2 m/s
  (chase / alarm, enemy.ts:1159, 1246): search is faster than patrol (backwards). Sector Ops tour guards use `runner`
  (patrol 1.43, investigate 1.56; melee, "civilian-clothed thug" factions.ts:24; a close noise sends a melee guard
  straight to combat, enemy.ts:564). Calm turns 60 deg/s; search uses the combat turn rate (enemy.ts:1617).
- Noise: `EnemyManager.hear` (enemyManager.ts:557-571) reaches every unalerted guard in radius (walls cut to 45%,
  `MUFFLE`); `Enemy.hear` (enemy.ts:560-573) sets `heard=true`; `AlertMachine` makes all of them suspicious
  (alertState.ts:125) and after 2.4 s all walk over (alertState.ts:135). `noiseSuspicion` (perception.ts:196-200) would
  ignore faint noises but `heard` overrides it. Result: every guard in range investigates the same spot. Radii: glass
  15 m (gameState.ts:1334-1341), suppressed pistol 9.8 m, bullet impact 4 m (gameState.ts:633-636). A shot-out lamp
  (stealthSystems.ts:418-429): 5 m noise + `lightsOut` (enemyManager.ts:267-283): the nearest calm guard within 25 m
  looks and every guard within 14 m turns, both without walls / line of sight (breaks bible L9). Loud gunfire: all
  within 28 m to combat (enemyManager.ts:542-553).
- After: investigate looks 4 s (+-1 rad sweep, enemy.ts:1121), gives up after 20 s; search 60 s on a widening ring
  2-11 m, 3 s per point, own bearing each (patrol.ts:193-199, enemy.ts:1091-1130). Bodies: all within 22 m search
  (enemyManager.ts:228-239). Sightings: 8 m shout at once, radio after 2.5 s to 22 m, not relayed (enemyManager.ts:
  168-180). Alarm: nearest alerted guard runs to a panel (officers favoured), 1.6 s, reinforcements (enemyManager.ts:
  286-310). Return: 45 s on edge after an investigation; permanent after a fight (alertState.ts:129); nearest route
  point (patrol.ts:156-186). Radio checks only in squads (Clear, Infiltration), never in Sector Ops.
- Maps: Marlow Yard one passive training guard on a post (ctcourse.ts:101-103); Sector Ops 8 / 8 / 9 per section.

## 2. Research
CT (docs/ct-research): suspicion alone starts a guard's own search, only a certain guard raises the alarm; guards call
each other and form impromptu search pairs (G11); a specific guard comes to fix a dead light (a lure); patrolling pairs
chat (overheard); alarm escalation (1st freebie, 2nd body armour, 3rd helmets, 4th permanent high alert); states
routine / curious / investigating / searching (team) / engaged / cooling, each with barks and animation; tours with
checkpoints, a missed checkpoint brings a supervisor.
General patterns: a squad coordinator (one incident per event, one investigator by path distance and role, sometimes
one cover guard, the rest acknowledge and stay on task; a silent investigator escalates to a buddy pair); staged
suspicion with decay; task patrols at points of interest (try a door, look out a window, read a panel, clipboard,
smoke, talk to a colleague, radio check-in), each with duration, facing and gesture, giving readable windows; pace by
state (relaxed 1.0-1.2 m/s, careful search ~0.8 at low ready with threshold stops, sprint only on alarm); military
reads: two-person patrols 4-6 m apart, pause before entering, corner sweeps, torch off on calm patrol and on with the
weapon while searching, one moves while the partner covers, radio reports before and after a check.

## 3. Plan
| # | Change | Hours | Risks |
| --- | --- | --- | --- |
| A | Hearing fix: a noise below the suspicious threshold only turns the head (`heard` no longer overrides) | 2-3 | e2e-stealth-ai "noise" retune |
| B | Guard coordinator in EnemyManager: one incident per event; one investigator by distance and kind (an officer sends someone, a dog never goes); one cover guard within 12 m holds and faces the spot; others bark "Copy" and look 3 s; investigator silent 25 s -> cover + buddy as a pair (G11); line of sight on lightsOut and the 14 m turn | 10-14 | e2e-stealth-ai bodies (keep bodies as a full search), lights; host-only, no wire change |
| C | Shared section alert tier with decay (G125): calm -> wary (search pace, torch, shorter waits) -> alarm stages, 90 s per step down | 6-8 | music (G67) follows guard states |
| D | Paces: patrol 1.05, investigate 0.85, search 0.75 with a 1-2 s stop every 4-6 m and calm turns, run only for combat / alarm; Sector Ops tour guards runner -> grunt / officer | 2-3 | sectorCheck CHECK_PATROL_PACE, sectors.test A2 isolation under phase drift, kestrel facts.json, e2e-stealth-ai torch loop |
| E | Task patrols: `PatrolRoute.tasks?` (door, window, panel, clipboard, smoke, radio, talk, torchSweep); the walker exposes the task, Enemy sets `rig.emote`, a bark / eavesdrop line; author the Sector Ops roles | 12-16 + 5-6 data | sectors.test isolation |
| F | Marlow Yard station-1 guard: smoke and radio idles in place; optional later lure-drill bay | 1-2 (+6) | e2e-ctcourse grab (he must not move) |
| G | Military touches: corner / threshold pause on calm investigations (reuse doorCheck), 1-2 two-person patrols per section (5 m), torch off on patrol, low ready while searching | 10-14 | G190 (pairs are the double-takedown beat: limit them) |
| H | Co-op wire: `act` code and torch state in EnemyState (protocol 25, already planned); client puppet takes low ready from `al` (enemyPuppet.ts:240) | 4-6 | e2e-coop, e2e-netmove, client torch parity |
Animation (keyed pipeline): careful low-ready walk 6 h, low-ready search stance and turn 4 h, look-around layer 2 h,
radio press-to-talk 1-2 h, door / panel / window / smoke / talk FK emotes 1-2 h each: ~22-28 h; guards need their own
gait profile (they share the player's graph today).

## 4. Guard model upgrade
Guards keep the old voxel / primitive CharacterRig bodies (enemyRig.ts:12-26, G123). The Wren runtime (one
OperatorLibrary per scene, one OperatorFigure per body posed from CharacterRig) already supports many bodies; a guard
model plugs into buildEnemyRig without gameplay change (perception reads the rig, so light parity holds).
1. Original concept sheet: night-shift site security, tactical uniform, low-profile plate carrier, cap (helmet variant
   for alarm stage 3), gloves, shoulder radio, holstered sidearm, slung rifle: 4-6 h.
2. Base body: male 1.77 m, MPFB2 CC0 data via operators:build, shared proportions.ts: 3-4 h.
3. Clothing and kit reusing Wren's generators (shirt 03b, trousers 05, gloves / boots 06, carrier 08 mockups, headwear,
   radio cable, holster): 25-35 h.
4. Bake, LOD0-2, KTX2, operators:check; one atlas; faction tint: 6-8 h.
5. Runtime: the same 19 joints + sling / holster anchors so guard_held_* clips and the poser work: 8-12 h.
6. Perf run with 25 guards (G187): 4 h.
Total ~50-70 h (+~10 h for 2-3 heads and the helmet). Risks: drawing / skinning 25 figures (Wren LOD0 18 MB); the rifle
waits on the Blender placeholder weapons job.

## 5. Ranked shortlist
1. A + light B: one investigator per noise (nearest calm guard), the rest turn, bark "Copy", stay; line of sight on
   lightsOut: 5-7 h.
2. D: search slower than patrol, low ready; tour guards off the runner kind: 3-4 h.
3. Radio callouts per incident ("Checking the east bay" / "Copy, holding"), text barks: 2-3 h.
4. Light E: four FK idle tasks (radio, door, window / panel, smoke) on existing stops for Sector Ops S1 and the Marlow
   Yard guard: 10-12 h.
5. Cover guard + silent-investigator escalation to a pair search: 6-8 h.
Shortlist ~26-34 h. Full plan A-H + animation ~90-120 h; model +50-70 h. Item 1 changes e2e-stealth-ai timings (noise,
lights, bodies); item 2 changes the Sector Ops isolation check; only H needs protocol 25 (pair it with the torch-state fix).
