# Step T7b - guards (Block C end step)

Model: implementer opus, checker opus. Deps: T7a. Enemies and tuning tables never change: change positions and routes.

## Read
- BAYS.md guard sheets: grep `Guard sheets` (B5 :300-385, B6 :386-485, B7 :493-569, B8 :570-644, B9 :645-735);
  sections 12 (tool / problem) and 13 (metrics: guard cycles)
- src/world/rooms.ts 20-39 (SquadSlot: kind, x, z, yaw, y, route, wait, waits, faces); config/enemies.json (grep
  `walkSpeed` per kind: grunt 0.9, runner 1.3, heavy 0.75, sniper 0.85, enforcer 0.8, dog 1.1, officer 0.85)
- src/ai/enemyManager.ts (MAX_ALIVE :25; alarms; reinforce; radio check); src/ai/archetypes.ts (grep `radio`, `buff`)
- docs/level-design.md section 4 (guards) and 15 (acceptance)
- src/game/course/courseState.ts (`bayStarted`, squad ids) and the course data from T7a

## Task (decisions)
1. Squads per bay in the course data (squad slot ids -> `SquadSlot`s in world coordinates from the guard sheets): B5 2,
   B6 3, B7 6, B8 3, B9 7 (the dog with its handler). Kinds, posts, routes, per-stop waits and facings (`waits`, `faces`)
   exactly as the sheets give them; `y` for upper storeys (B6 CR 9.6, B7 roof 6.4 and first floor 3.2, B8 scaffold 3.0,
   B9 balconies 4.5 / 9.0).
2. Each guard's cycle = route length / walk speed (loop routes walk at `walkSpeed`) + waits, between 25 and 45 s. Where a
   sheet's numbers fall outside (the sheets flag TUNE), shorten the legs inside the same space and log the change.
3. Glances (existing post behaviour) for posts; the officer's buff radius and the radio check are the archetypes' own.
4. B8: the three start calm at their posts; T7a's live-fire trigger alerts them.
5. B9: the bridge controller B9-O has no desk logic yet (S1 Part B): he is a post; CAM-P1 / P2 feed nobody (unmanned
   rule) until SW-S1.
6. Card / key holders: B6-GR and B6-GM now forms are switches (T7a); no card system code.
7. B9 ghost plan (BAYS B9 "Ghost plan", D32, D33): tune B9's routes, waits and facings so every crossing is watched by
   two or more, each opens 3-5 s once per cycle, and the two sync moments work only when both players act within the
   same second; log the final gap times.
8. Spawning: only the current bay's squad is alive (T1b spawns at `bayStarted`); assert at most 7 alive at any time.

## Tests
- `tests/bunkerCourse.test.ts`: every route's cycle in 25-45 s from the kind's walk speed; every stop in its bay's
  floor box and storey; the squad counts; total alive per bay <= 9.
- `scripts/e2e-bunker.mjs` section "guards" (single page, `?course=solo`): for each guarded bay, teleport to its vantage
  (debug point), wait one longest cycle with the player crouched and still: the meter stays under suspicious for every
  guard (level-design 15 darkness, vantage rule); walk into one planned lit pool on the route: noticed; switch its
  circuit off: no longer noticed and the nearest calm guard investigates (lure); every route point is on the nav grid.
- Noise: B5 grating at standing gear 4 draws B5-G1 to investigate; crouched gear 2 does not (level-design 15 noise).
- A body left on B7-W's route is found within two of his cycles.
- B9 (single page, `?course=solo` plus a scripted second avatar if T0 found one, else two pages): each sync moment
  fails when one half is done alone and passes when both halves land in the same second; every B9 crossing has a gap
  of at least 3 s and none longer than 5 s.

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course e2e-stealth-ai e2e-enemies smoke`.
Then the Block C end (BRIEF 4.5): full `npm run e2e` in the background, the perf trend, PC-PASS row 5 (light look per
bay, `E2E_GPU=1`), results recorded.

## Commit
"training T7b: guards for B5-B9". Docs: LOG, STATE, CHANGELOG, TESTING.md (a "Fallow" manual section: one line per bay),
PC-PASS results. Opus self-review at the block end against level-design section 4 and 15, logged.

## Carry-over from T5's check
Guard path queries use a 3000-expansion limit (src/ai/enemy.ts ~:953, 1362, 1403); B7-B9 storey changes need up to
17954 (bridge). Give B8 / B9 / B7 routes storey-local legs that meet at stair doors, or raise the limit only for
storey-changing queries and prove other maps' AI timing is unchanged (e2e-enemies, e2e-stealth-ai, perf trend).
