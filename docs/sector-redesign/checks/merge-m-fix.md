# Merge head fix round (feature/sector-redesign-m, from 57a1dbc6)

Two failures at the merge of origin/master 4.70.0 (guard-ai S2-S5) into sector-redesign.

## 1. Unit: incidents.test.ts "uncoordinated (parked modes): the old rule ..."

`lightsOut(0, 0, 5, 3)` (a lamp at y 5) with a guard at y 0. Our floor rule in `lightsOutOld`,
`|e.pos.y - (y - 2.5)| > LIGHTS_OUT_FLOOR (2)`, read every `y` as a switch + 2.5: 0 vs 2.5 passed, but a lamp at 5 put the
floor at 2.5 and |0 - 2.5| = 2.5 > 2 dropped the guard.

Fix (`src/ai/enemyManager.ts`): `y` is a fixture height (a lamp, or a wall switch + 2.5). A guard is on the light's floor
when his feet are not above `y` and at most `LIGHTS_OUT_BELOW` (7, replaces `LIGHTS_OUT_FLOOR`) below it:
`if (floor && (e.pos.y > y || y - e.pos.y > LIGHTS_OUT_BELOW)) continue;`

- S2 reception panel (y 0 + 2.5): #1 at G (0) is 2.5 under it, sent; #4 on the L2 balcony (8.4) is above it, excluded.
- An L2 switch (8.4 + 2.5 = 10.9): a G guard is 10.9 under it (> 7), excluded; an L2 guard is sent.
- The incidents.test.ts lamp at 5: the guard at 0 is 5 under it, sent (test unchanged).

## 2. GPU e2e e2e-sectorops part 6 (d): "#1 walked to the reception panel" (12.0 m -> 12.0 m, lamps 0)

guard-ai's coordinated `lightsOut` only sends a guard who saw the light go: a fixture of the cut circuit in the room he
stands in (`roomAt(rooms, l.x, l.z, l.y - 1.5)` equal to his room), or in his sight field with one clear static ray.
Nobody who saw it means the incident closes; nobody is sent by distance any more.

Data (S2): #1 posts at (-20, 0, -24.9), yaw 0 (north, at the turnstiles), room `foyer` (x -30..-8, z -30..-23, y < 4.4).
The panel is at (-8.4, 0, -28.5), group 50 (`s2-atrium`), same room, 12.0 m off. The circuit was the three pendants at
y 9.0, (-22 / -18 / -14, -17), over the void (x -26..-10, z -20..-4).

- Room rule: the pendants test at y 7.5. The G hall stops at 4.4; the L1 rooms do not cover the void's plan. `roomAt` = -1
  for all three: never #1's room. (Raising the hall's height would not help either: #1 stands in the foyer, not the hall.)
- Sight rule: (-22, 9, -17) is in his focus cone (14 deg off, 11.0 m), but the ray from his eye (~1.55) reaches the void's
  south edge (z -20) at t = 4.9 / 7.9 = 0.62, height ~6.2. The L1 slab (top 4.4, underside 4.0) covers everything south
  of z -20, so the ray hits the slab at z ~-22.3. Same for the other two. Facing cannot fix it: the slab is in the way
  from anywhere at the desk.

So #1 physically cannot see the pendants go; guard-ai is right not to send him. The SPEC still wants the panel to lure #1.

Fix (data, `src/world/maps/campusS2.ts`): the reception downlight (-20, 3.9, -26.5) moves from its own unswitched group
53 onto the panel's circuit (`s2-atrium`, 4 lamps). It tests at y 2.4, room `foyer` = #1's room: the panel cut darkens
his own room and he reacts (the board sends him; he is 12.15 m from the incident, inside `lightPairR` 15, so he goes
first or as the pair's second). `S2_GROUPS.reception` (53, no switch, no lamp now) is removed. SPEC S2 "Lighting" updated.
Gameplay: the cut also darkens reception, which suits a lure (the turnstiles go dark while #1 walks to the panel).

Alternatives rejected: lowering the pendants below ~5.3 m (the slab line from the desk) changes the atrium's look, the
light field and the S2 light tests; changing the e2e to "whoever saw it" (#2 in the foyer, #4 on L2) breaks the SPEC's
lure #1 and depends on patrol phase.

No guard-ai change is required. Optional proposal for guard-ai (not made): a guard also "sees" a light go when its lit
area reaches his room (a fixture of the circuit within its radius of his room's box, with one ray to a point of that area),
which would cover any lamp whose fixture is out of sight but whose pool is in front of him.

## Tests

- `tests/enemyLightsOut.test.ts` (4): the reception switch sends #1 not #4; an L2 switch sends the L2 guard, never one two
  floors below (alone: nobody); a lamp 5 m up still sends the guard under it; no floor = nearest in plan.
- `tests/campusS2.test.ts` (40): the circuit test now 4 lamps on `s2-atrium` (3 at y 9); new test "the reception panel is
  seen by #1": #1's room is `foyer`; each pendant is in no room at l.y - 1.5 and its ray from his eye passes z -20 above
  the slab underside 4.0; exactly one circuit lamp (-20, 3.9, -26.5) is in his room; the panel is in his room.
- `tests/incidents.test.ts` unchanged, green.
- Also green: campusRuntimeNav, campusS1, campusS3, coopTorches, detailPass, enemyManagerDespawn, hearing, radioWiring,
  rooms, sectorRestart (13 files, 236 tests). `tsc --noEmit` clean; lint 0 errors.
- e2e (`scripts/e2e-sectorops.mjs` part 6 (d)): the lit count before the cut is now 4 (3 pendants + the reception
  downlight); the "#1 walked to it" assertion is unchanged. Pending the lead's GPU run.
