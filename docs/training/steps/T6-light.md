# Step T6 - light, ambient zones, surfaces (Block C)

Model: implementer opus, checker opus. Deps: TM (Block B done, the walk applied, locomotion 09-20 merged). Gameplay light only from the light field (bible 5.1).

## Read
- BAYS.md light plans: grep `Light plan:` (one table per bay) and each bay's "Sound" line; 7-70 (offsets)
- src/world/lights.ts 1-130 (LightDef :23-49, LightInit :59, group, destructible, electric, fixture, kind), 170-200
  (setGroup, destroy); src/world/levelBuilder.ts 383-404 (light, surface, ambientZone with minY / maxY)
- src/world/surfaces.ts 1-30 (Surface :6: concrete, metal, grate, wood, gravel, carpet); docs/systems/lighting.md 6-60
- src/world/mapDef.ts 54-55 (switches); T0-facts.md (light count and per-column cap answers)

## Task (decisions)
1. Every light in every BAYS light plan, through `LevelBuilder.light`: position from the fitting (0.15 m off its
   ceiling or wall), `radius` / `intensity` / `cone` from the fitting type (pendant, troffer, bulkhead, high bay, flood,
   batten, downlight, exit sign, desk lamp, rack LEDs, map table), colour from the bay's colour temperature, `fixture`
   box for shootable fittings, `destructible` per the plan (exit signs and emergency lamps true unless the plan says
   otherwise), `group` = the circuit (a number per circuit; keep a `BUNKER_CIRCUITS` table: id -> group, bay, switch).
2. Unswitched lamps (emergency, exit signs, equipment glow) get `group` -1 and the reason in a comment (16.8.1).
   Lamps off at start (B1 store, B3 chamber floods, B6 lockers, PIRs) are created off.
3. `MapLayout.switches`: every wall switch from the plans at its position and facing, with its group. The B5 mains
   breaker MB is a switch on a group set that turns L1, L2, L3 and the gallery battens off together (if one switch
   cannot drive three groups, give those lamps one group and log the choice).
4. Ambient zones per bay and storey (`ambientZone` with minY / maxY: B3 by gallery band, B6 mezzanine, B7 house storeys,
   B9 balconies) at the theme's 0.05 (TUNE) so unlit air is dark (below LIGHT dark 0.28).
5. Surfaces per BAYS: B1 store metal, kit room carpet (rubber reads as carpet), B2 galleries grate and walkway carpet,
   B3 galleries grate, B4 wall tops metal, B5 walkway grate and switch room carpet, B6 vinyl as concrete, office carpet,
   server room wood (raised floor knock), B7 cavern gravel and house wood stair, B8 catwalk grate, B9 balconies grate
   and plot floor carpet (lino reads quiet), cabins carpet.
6. Remove T2-T5's work lamps.
7. Light checks in a new `scripts/e2e-bunker.mjs` (section "light"; T8 grows the suite): single page
   `?autostart=bunker&mode=sandbox`, teleport to each planned dark pocket and lit pool (a table in the script built from
   BAYS: at least two per bay) and read the light field level at the body (`__app.current` light API per T0): dark
   pockets < 0.28, lit pools > 0.6; switch each bay's main circuit off and the lit pool drops below 0.28; the B5 MB
   drops L1-L3 but EM1 stays on; a shot on a destructible fixture destroys it.
8. Per-column lamp cap: assert no 2 m column carries more than the cap T0 found (unit test over the registry).

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course e2e-darkness smoke`. GPU items (PC-PASS
row 5) run at the Block C end, not here.

## Commit
"training T6: lights, circuits, switches, ambient zones and surfaces". Docs: LOG, STATE, CHANGELOG, PC-PASS row 5.

## Carry-over from T4's checker
- Key the B5 mains gate to the MB switch state (or to "all of L1-L3 off"), never to lamp states: shooting or EMPing a
  lamp must not open A5. L1-L3 as three SR switches need their own groups or an "all off" rule. Keep switch groups <= 12.
- From T5d (REVIEW-NOTES): B1's store switch K4 inside the DS door (local 2.2, 5.7) drives L1-7S and L1-9 (off at start);
  B2's L2-G1..3 breakable gallery bulkheads (objective 4a); the airlock pad borders' white / amber / green.
