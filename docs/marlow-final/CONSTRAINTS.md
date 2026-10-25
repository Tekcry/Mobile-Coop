# CONSTRAINTS - marlow-final (standards checker)

Read in full: `CLAUDE.md`, `docs/level-design.md` (402 lines), `docs/templates/map-spec.md`, `docs/design/scale-sheet.md`, `docs/marlow-final/BRIEF.md` (including M4 at commit 3dc2ac65), `docs/marlow-final/STATE.md`, `docs/ct-prototype/CTCOURSE-SPEC.md`, `docs/systems/{performance,lighting,ai,world-and-characters}.md`. Grepped `docs/DECISIONS.md`, `docs/design-bible.md`, `docs/ct-research/design-kit-digest.md`, `src/`.

Authority order (CLAUDE.md "Every session" 4, G86): Michael > DECISIONS > bible > level-design / the map docs > CLAUDE.md > code. The spec may tighten the standard. It may loosen a rule only with Michael's written approval (CLAUDE.md "Hard rules"; level-design line 3; BRIEF "Limits"). It must LIST any loosening and never apply one.

Scope ruling: Marlow Yard is "the campaign for now" (G184, DECISIONS l.992). So G253 ("Campaign maps are co-op only") applies, and level-design section 11's solo rules (11.1, 11.2, the solo part of 11.4, the solo ghost run in 15) do not bind it (level-design open item 1, l.384-388). The old CTCOURSE-SPEC ran under "G117 / training D41". That does not apply here: G117 binds only the Fallow bunker, and BRIEF makes the standard binding.

---

## 1. Checklist the new spec must satisfy

Format: rule - source - how to verify.

### A. Architecture (level-design 2, 16)
1. Building brief: purpose, era, site, construction (grid, wall thickness, storey heights), every room with original purpose / size / present use, circulation, services, palette and lighting. Gameplay design starts after it - LD 2.1 l.15, 13 l.198, 16.1.1 l.299; template "Building brief" - every template field filled; every training area named as a real room of a real training facility.
2. Every route element (ladder, pipe, roof, duct, hatch, opening, cover object, lamp) has an element-register row with a one-line real reason. "So the player can" is never a reason - LD 2.2 l.17, 16.0 l.295, 16.9 l.354-361 ("a missing row fails review") - count register rows against every `b.light`, collidable `b.box`, anchor and door in the code.
3. A verb-to-element table; a verb with no believable element is left out and named - LD 2.3 l.20; template "Stealth verbs" - table filled, including the "Not used" row.
4. Real proportions:
   - door 1.2 x 2.1, height never below 2.0 or above 2.2;
   - corridor 3.5-4.0 m, never under 3.0;
   - play space at least 6 m on the short side;
   - ceilings 3.0 m for rooms, 4.5-6 m for halls; storey 3.3 m;
   - stairs: rise 0.165, run 0.28-0.285;
   - crouch duct 1.2 x 1.5; walk-in tunnel at least 2.1;
   - low cover 1.2 m (a 1.0 m rail does not hide);
   - curb or step 0.15-0.40, never 0.40-0.45.

   Source: LD 2.4, 16.1.2 l.300 ("never smaller"); scale-sheet 1, 3. Verify: dimensions in the spec, plus a unit test on door and corridor widths.
5. Spacing:
   - door centres at least 3 m apart on one wall;
   - no door within 1.5 m of a corner;
   - at least 5 m of open floor between doors on a route;
   - cover every 8 m; no straight run over 12 m;
   - no door within 1.5 m of a stair end.

   Source: scale-sheet 4, 5. Verify: a metrics-check row per door.
6. A structural grid; walls, columns and cores sit on it - LD 16.1.3 - grid stated; coordinates on it.
7. Consistent visual language: same look = same behaviour (every leg-up mark, every lip of a kind) - LD 2.5, 16.2.6 - register "Rule" column; unit test that every lip of the climbable look is in the planned list.
8. Gates are real locks, fences and doors with an owner; no invisible walls - LD 2.6, 16.3.5 - no `visible:false` blockers on a route unless declared; every gate's owner in the register.
9. Vertical circulation:
   - only stair cores, fire stairs, or ladders inside plant spaces or shafts;
   - no ladder beside a stair; no ladder in a floor hole;
   - every stair complete (handrails, no gaps);
   - roof access by a bulkhead or fire stair.

   Source: LD 16.2.1-16.2.5. Verify: 16.10 Q3, Q4, Q5, Q10 answered.
10. Openings: each has a function; no hole except a real opening; no barrier in front of a door or window; a vent is the end of a real duct - LD 16.3.1-16.3.4 - 16.10 Q7, Q8, Q9, Q11.
11. Objects: each block is a named real object; 1.0 m clearance in front of panels, doors and escape routes; roof objects are roof equipment; low cover comes from real objects - LD 16.4.1-16.4.4 - 16.10 Q6, Q8.
12. Roofs fully covered; upper floors enclosed; a 1.1 m parapet or rail where people work on a roof - LD 16.5.1-16.5.3 - 16.10 Q7; check every roof a drill uses.
13. Rooms are rectangles on the grid; no zig-zag partitions to force a path; access matches value; no dead end that needs an invented side entrance; circulation reads as a hierarchy - LD 16.6.1-16.6.4 - 16.10 Q1, Q2, Q12, Q14.
14. Ducts and tunnels are real systems with real ends. Ducts sit inside walls, slabs or ceiling voids: a free-standing duct box under 1.8 m is an accidental mantle; one over 1.9 m becomes a lip - LD 16.7.1-16.7.5 - a brief row per duct (carries, owner, size, access, end).
15. Every lamp has an owner, a fitting and a switch, or a stated reason it has none. Every guard has an employer and a job. Floors come from the room's real finish - LD 16.8.1-16.8.3 - register; layout `switches` / light `group`.
16. The 16.10 review checklist is answered in the spec, each item "none" or a fix list - LD 16.10 l.363-380 - a section in the spec.

### B. Space structure (LD 3)
17. A linear spine of encounter spaces joined by connectors; routes rejoin at a pinch point; no route skips a space - LD 3 l.29, 3.3 - e2e nav path from insertion to extract passes the spaces in order (LD 15 l.277).
18. Entry vantage: dark, outside every guard's view for the whole cycle, every guard visible within one cycle - LD 3.1 - e2e: a crouched still player at the vantage stays under suspicious for a full cycle (LD 15 l.278).
19. Every guarded space has shadow / high / loud routes; at least half also have a secret route; no route strictly best - LD 3.2 - space sheet "Routes" field.
20. A loop on the shadow route of every guarded space; no dead end on a stealth route - LD 3.4 - space sheet "Loop" field.
21. Stepping stones (dark, cover or hide spot) every 4-8 m on shadow routes - LD 3.5 - space sheet spacing figures.
22. Sightlines and corners are used on purpose - LD 3.7 - beat chart / space sheet.
23. Quiet connectors that glimpse the next space - LD 3.8 - airlock or connector rows say what each one reveals.
24. A checkpoint before every encounter space, on a floor, dark, out of view; replay loss of about 10 minutes at most - LD 3.9; G126; bible 7 "Checkpoint plan" - bay restart point per area.

### C. Guards (LD 4) - every guard that perceives
25. A real job; a mix of patrol types (no two adjacent spaces with the same mix); cycles 25-45 s, stops 3-6 s, gaps 3-8 s; an isolation moment; overlapping coverage; lure destinations; bodies matter; survivable searches - LD 4.1-4.8; bible 6 "Never: random patrols" - a guard sheet per guard (LD 13 l.225-235); e2e: every route point on the nav grid, cycles 25-45 s (LD 15 l.281).
26. No heavies or dogs (G155). Patrols fixed, but some codes, items or rooms may vary per run (G143) - `SquadSlot.kind` only `grunt` / `officer` etc.

### D. Light and sound (LD 5, bible 5.1)
27. Every lit pool has a visible source and a switch by a door - LD 5.1, 16.8.1 - each lamp maps to a `switches` entry / group (the current yard has none).
28. Every lit chokepoint can be darkened two ways (switch, shot, the held jammer, G152; the EMP is gone) and avoided one way - LD 5.2; bible L8 - space sheet "Lights" field.
29. Loud and quiet floors side by side, from real finishes - LD 5.3, 16.8.3 - surface kinds set; e2e: a loud floor draws the guard above a silent gear only (LD 15 l.280).
30. Light parity: the picture, the meter and the guards agree; lamps baked; gameplay reads only the light field - CLAUDE.md "Hard rules"; bible L1-L6; BRIEF "Limits" - `tests/ctcourseLight.test.ts`-style level bands; e2e darkness and lit-pool checks (LD 15 l.278-279).
31. Readable at the Low preset - LD 5.4 - GPU shots at Low (laptop, Character Build).
32. Cameras see by their own IR, not by lamps - `lighting.md` l.8-10 - no exercise may assume darkness hides a player from a camera.

### E. Pacing (LD 6)
33. Teach, test, twist: one new mechanic per space, introduced safely, then combined; a set piece last that uses everything - LD 6.1 - beat chart "mechanic taught / combined".
34. Tension rises with a release after every peak - LD 6.2, 13 l.237 - beat chart, tension 1-5.
35. No forced timers in stealth sections - LD 6.3; bible 6 "Never" - no area fail clock (see tension T4).
36. Guide without waypoints (landmarks, light, sightlines); with M4, the objective list guides and the explainer pads go - LD 6.4; bible 6 "Never: world waypoints"; BRIEF M4 - no panel devices; objectives per area, with per-player lines on splits.

### F. Agency (LD 7)
37. A tool / problem matrix with at least three tools per problem - LD 7.1, 13 l.243 - matrix in the spec.
38. At least two toys per space (switches, breakable lamps, doors, windows, vents, lure spots) - LD 7.2 - space sheet "Toys" field.
39. Ghost, non-lethal and lethal play all viable; no forced kill; 100% testable (no kills, no alarms, every primary) - LD 7.3; G127; G146 - e2e ghost run with every bonus (LD 15 l.282), using a two-body zero-failure path.
40. Gadgets help, never required - LD 7.4 - each drill's required tool is a move or the pistol jammer, not a gadget.

### G. Fairness, failure, exploration (LD 8-10)
41. Every detection is explainable and telegraphed; the same cues everywhere - LD 8.1-8.3 - no map-specific detection rule.
42. Detection escalates step by step; failure is a new situation; instant failure only through the mission's own rule, and at most one, signposted - LD 9.1-9.3; G125 - count hard rules (today: the S3 hallway send-back).
43. Secrets, environmental storytelling, sightlines to plan ahead - LD 10.1-10.3 - space sheet.

### H. Co-op (LD 11 as amended by G253; bible 5.9)
44. Every exercise needs both players - BRIEF "Goal"; bible P6, C4; G2, G132 - per area: what fails with one player.
45. Co-op lip at 4.3-4.5 m: at least 0.5 m over the solo reach `WALL_JUMP.maxUp` 3.8 and within `TEAM.boostMax` 4.5 - LD 11.3; G57 - an exported co-op lips constant plus a unit test that each is out of solo reach (template "Scope"; LD 15 l.283).
46. Unplanned boost targets: every lip or pipe 3.8-4.5 m above its floor is planned or has `noLedge`. This binds harder under G151 ("team moves anywhere with room") - LD 11.5; LD 12.1 "box tops >= 1.9 m become lips" - unit test over every box top in that band.
47. No softlocks: a lone player can always get back to the partner (stair, drop, floor-side panel). A player downed on each co-op surface can be revived - LD 11.4 (non-solo intent); G126 - e2e revive on each co-op surface (LD 15 l.284).
48. Co-op verbs are the game's CT set (G180: leg-up, ledge relay, partner throw, hang-down, two-person rope, revive; jammer handoff, paired hacks). New verbs are Future work - LD 11.6; G180 - list any new verb for Michael.
49. Both players extract - G138; bible 5.8 - exit zone needs both.
50. A co-op plan per space; light, sound, checkpoint, medkit plans - bible 7 l.~940-950; G98 - sections in the spec (medkit stations in the map).
51. Each co-op route works for host and client - LD 15 l.283 - e2e-ctcourse on two pages; e2e-coop / e2e-netmove when `src/net`, `src/player` or `src/game` change (CLAUDE.md test tiers).

### I. Engine and text
52. Re-confirm every Section 12 constant by grep in Phase 0 - LD l.4-5, 12 header, 14 Phase 0; template "Rules for working" 2 - an engine-facts table with file:line.
53. Tuning tables never change for a map; change the geometry - LD 12.1 last bullet - no diff in `src/config/movement.ts`, enemies, perception, `LIGHT`.
54. No accidental split gaps: facing faces at least 3.6 m tall and 1.2-1.95 m apart make one automatically - LD 12.1 - e2e: split gaps exactly the planned ones (LD 15 l.276).
55. `ambientZone` `minY` / `maxY` per storey; designed slopes at 45 deg or less; nothing walkable under about -1.5 m - LD 12.1 - map test.
56. Radio, objectives and guard lines: 90 characters or less, British, voiceable; no reference-game names - G82, G6; `COURSE_TEXT_MAX` 90 - `validateCourse`.
57. Perf budgets on desktop - LD 15 l.285; CLAUDE.md DoD (the map touches rendering) - one GPU perf run via Character Build. Record the result; block only on broken.

### J. Deliverables (LD 13) - in the job folder
58. Floor plans SVG: 1 m = 10 px, grid every 6 m, north up, one file per storey. Separate `*-gameplay.svg` overlays: routes in four colours, guard routes, lit pools, loud floors, vantages, co-op routes - LD 13 l.202-205; `scripts/plan-svg.mjs` exists for the build comparison (LD 14 Phase 3).
59. A space sheet per space, a guard sheet per guard, the beat chart, the coverage table, the tool / problem matrix, the metrics check, a self-critique (10 weakest points with fixes) and the playtest checklist - LD 13 l.207-259. The coverage table's verb list comes from `docs/systems/input-and-loop.md` plus the CT research (open item 7).
60. Acceptance tests: anchors engage from their approach (pad); `e2e-anchors.mjs` covers the map; split gaps as planned; nav order; darkness, noise and patrol checks; every guard alive at start; a body on a route is found; co-op checks; perf - LD 15 l.273-285 - e2e-ctcourse rewritten (A1); e2e-anchors already references ctcourse (1 hit).

---

## 2. Engine limits (grep-confirmed 2026-10-23)

Re-checked by the Phase 0 engine answers (`ENGINE-ANSWERS.md` question 1, commit 52632ed6): every value holds; the line
references and six claims below were corrected on 2026-10-23 (spec writer).

**Map extents**
- No hard cap in code (`LevelBuilder.bounds`, `src/world/levelBuilder.ts:130`, :228).
- References: the current yard is 172 x 16 m (`CT_BOUNDS`, `ctcourse.ts:100`); Fallow is 143 x 147 (`bunker.ts:10`).
- Cost scales with area:
  - nav 0.5 m cells x layers;
  - moon bake 0.5 m cells (`skyBake.ts:276`);
  - ambient grid 1 m (`ambientGrid.ts:9`);
  - each lamp's bake box covers its reach in 0.2 m cells (`LAMP_CELL`, `lampBake.ts:15`).
- Theme fog: 40-120 m (`ctcourse.ts:374`).

**Lamps and lights**
- At most 8 baked lamps per 2 m plan column (`LAMP_GRID = 2`, `LAMP_GRID_SLOTS = 8`, `lampBake.ts:313-315`). The light field uses the same list (`lighting.md`), so a 9th lamp reaching a column is dropped for gameplay and picture alike. Design at 8 or fewer per column.
- No total lamp count cap found.
- A lamp tests at most 4 doors between it and what it lights (`DOORS_PER_LAMP = 4`, `lightField.ts:29`).
- Real light pool: `MAX_REAL_LIGHTS` 48 (`lightRig.ts:19`). With baked lamps the pool holds 4 lights and 2 shadowed (`BAKED_POOL` / `BAKED_SHADOWS`, `lightRig.ts:27-28`), used for torches.
- Real lights per preset (unbaked path, nearest first): Low 8, Medium 12, High 16, Ultra 20, Epic 32; `?gfx=min` 8 (`quality.ts:53-72`).
- Character soft shadows: 16 capsules, 4 per lamp (`MAX_CAPSULES`, `bakedLamps.ts:54-55`).
- Guard flashlight slots: 4 (`FLASHLIGHTS`, `torches.ts:15`).

**Volumetrics (render only)**
- `VOL_LIGHTS` 12 uniform slots (`postStack.ts:30`).
- Per preset: Low 2 (volumetrics off), Medium / High 6, Ultra 8, Epic 12 nearest (`quality.ts:53-57`).
- Lamp haze marches at most 3.2 m (`VOL_LAMP_MAX`); a beam at most 14 m (`VOL_BEAM_MAX`, `volLights.ts:18-20`).

**Physics**
- Dynamic props 28, ragdolls 4, projectiles 24 (`BUDGET`, `physics/groups.ts:35-39`).
- Bodies kept: 12 (`BODY.max`, `ai/bodies.ts:16`).

**Guards**
- `MAX_ALIVE` 12 awake (`enemyManager.ts:32`, the default of the instance's `maxAlive`; `spawn` returns null at the cap, :458). Course mode keeps 12.
- `SQUAD_CAP` 9 exists only in the Infiltration and Hunter modes (`infiltrationMode.ts:14`, `clearMode.ts:12`); it does not apply to Course mode.
- Course mode spawns each bay's squad at bay start and removes the old squad first (`courseMode.ts:634-670`, splice and dispose :644-648). A failed spawn (the cap, or no walkable cell within 8 m) skips the rest of that bay's squad (:661). The removal does not use `em.despawn`, so knocked-out bodies stayed after a restart; slice 0a switches to `em.despawn`.
- Course mode ran with `em.stealth` false: a guard in combat radios every calm guard within 22 m, chases real positions, never searches or cools down, and detections never count. marlow-final sets it true (assumed A8, slice 0a).
- So the practical limit is 12 or fewer alive per area. G254: "as many guards as allowed", and suggest ways past the cap.

**Cameras**
- 12 per map (`SECURITY_LIMITS.cameras`, `config/security.ts:50`, checked by `validateSecurity`, `security/data.ts:39`, count check :61).
- Mount 2.4-3.5 m, range 4-18 m, aim at least 2 m, sweep at most 120 deg (`config/security.ts:16-34`).
- Only `camera` devices are built (`data.ts:47`).
- IR: every living player in the camera's cone reads light 1 (`irLight`, `config/security.ts:45`; one ray, lens to head, `security/camera.ts:84`, `securitySystem.ts:51-57`). Guards and the light meter still read the lamps.

**Nav grid**
- Cell 0.5 m (`navBuild.ts:78`), agent radius 0.32 (:79), headroom 1.7 (:9).
- Drops 1.0-2.2 m one way (`navBuild.ts:11-12`); step 0.45 (:80; player 0.42).
- Surfaces need normal.y > 0.65 (about 49 deg, `navBuild.ts:98`).
- 3 layers per column by default (`DEFAULT_NAV_LAYERS`, `navBuild.ts:14`); `MapDef.navLayers` raises it (Fallow 5). `NavGrid` takes any count (`navGrid.ts:187`), but the sampler casts at most 8 rays per column (`navBuild.ts:91`), so a 9th surface is never found.
- The sampler stops at y -1.5 and casts to y -2.
- A door 1.2 m or wider always passes the grid; 1.0 m only on cell-aligned centres (scale-sheet 4).
- Patrol points are `[x, z]` (`rooms.ts` `SquadSlot.route`). Engine question: the storey pick for routes on upper floors.

**Doors**
- Light, sound and sight pass past `DOOR_SHUT` 0.05 of the swing (`lightField.ts:27`); the crack (0.12, `doorPeek.ts:13`) counts as closed.
- Guards close doors (G41 built): a calm guard shuts a door he opened 1.5 s after he is 2.2 m clear (`stealthSystems.ts:22`, :556-571). Its `occupied` check (:539-544) and the door menu's close (:105) look only at the host's player and guards, so it can shut a door onto the client; slice 0a adds the remote players.
- A `mains` relock only locks a door; it never shuts it (`courseState.ts:194-205`, `doors.ts:200-202`). Only an airlock's rear door is forced shut (`courseMode.ts:700-704`).
- Bash at a sprint; quiet open noise 2 m, bash 10 m (`stealthSystems.ts:24`, :30).
- No door count cap found.

**Anchors**
- No count cap found.
- Box tops at 1.9 m or more become lips automatically; use `noLedge` / `mark` (LD 12.1). The 1.9 m filter is the box top's world Y, not its height over the local floor (`anchors.ts:319-325`): on an upper storey every solid visible box passes it, so upper-floor furniture and rails need `noLedge`. Invisible collide boxes (kit glass, kit handrails) are never lips (`anchors.ts:319`).

**Course framework**
- Every bay boundary is an airlock 6 x 6 m (tolerance 0.5; `AIRLOCK_SIZE` `config/course.ts:18`, tolerance :20), enforced by `validateCourse` (`courseDef.ts:213`, airlock check :229-233).
- Bays chain start -> A1..An -> end (`courseDef.ts:247-256`).
- Airlock cycle 4 s; pad inset 1.0; doorway clear 0.75.
- `PAIR_WINDOW` 1.0 s; `TIMED_HOLD_AFTER` 6 s; `RESTART_DELAY` 2 s; text 90 characters.

**Timing devices (synced exercises)**
- Jammer (`jammer.ts:14-46`): hold at most 5 s; cooldown 5 s; camera reboot 1.5 s; range 20 m; the jammer must stand still (0.45 m/s).
- Jammed lamp: 0.5 s flicker, off while held, 4 s off after release, 0.5 s flicker on.
- Scanner (`scanners.ts:12-22`): hack 2.0 s; sync window 1.5 s; a fail costs 10 hp.
- Laser: `ALARM_MAX` 3 stages, `ALARM_GAP` 5 s (`jammer.ts:343`, :345).
- Jam line: one ray against static bodies with 0.4 m slack at the target (`JAMMER.losSlack`); `b.fence` mesh passes it, collide boxes, kit glass and shut doors stop it. A jammed lamp lures no guard (only switches, isolators and shot lamps call `lightsOut`).
- Sync windows never scale with difficulty (G131).

**Reach** (`config/movement.ts`)
- `WALL_JUMP.maxUp` 3.8 (:338); `TEAM.boostMax` 4.5 (:459).
- `TEAM.ladderGrab` 4.1 (:464) has no reader: the shoulder-stand human ladder is gone. The co-op "ladder" is the ledge relay: the partner hangs 0.3-4.6 m above the climber, within 1.6 m horizontally (`relayReach` / `relayMax`, `movement.ts:475-476`; `teamMoves.ts:60-66`). The leg-up reaches 4.5 m, so 4.4 m lips serve both moves.

**Revive**
- 30 s window; 2 revives per mission as a team total (`reviveClock.ts:8-10`); a 2.5 s hold divided by the HQ revive speed (`coopHost.ts:51`, :148).
- LD 12.1's "there is no bleed-out" is stale.
- The height rule: the revive is an interactable on the downed body (`coopHost.ts:401`, :428-433), moved onto it every step (:1125-1129), offered within 1.6 m horizontally (the item's `reach`; the 1.8 m default does not apply) and under 1.5 m of height between the item and the reviver's feet (`interactables.ts:132-140`); the host accepts a client's use within 2.55 m and 2 m of height (`coopHost.ts:575`). A player downed on a ledge or deck is revived only from that level.

**Draws, CPU, memory** (`docs/systems/performance.md`)
- At most 600 draws and 8 M triangles per frame over every pass.
- Per preset: Low 120, Medium 170, High 230, Ultra 250 draws (0.8-2 M triangles).
- `?gfx=min` regression check: at most 55 draws and 0.2 M triangles; sim p95 2.5 ms (`perf.mjs`, `performance.md:32-34`). The doc also has a gfx=min CPU line (main 3.6 ms, sim 1.1 ms, `performance.md:18`).
- Epic: main thread p95 5.5 ms; sim p95 2.9 ms; animation 0.075 ms per character.
- Allocations: 11.5 MB/s at most.
- Memory: VRAM 12 GB at Epic; tab 6 GB; JS heap 1.5 GB; load 4 s cold / 1.5 s cached (Warehouse figures, "pending a PC run").

---

## 3. Template sections (`docs/templates/map-spec.md`)

1. **Title** - "Task: <Map name> - <one-line pitch>".
2. **Context (fill)** - base branch and goal in 2-3 sentences (building, setting, fantasy); "follows `docs/level-design.md` in full". Fix the stale text:
   - Night Shift, not "Silent But Deadly";
   - branch `feature/marlow-final`, not `feature/<map-id>-map`;
   - the master merge is allowed (STATE "Open"), which overrides the template's "never merge" (the orchestrator flow, CLAUDE.md).
3. **Scope: existing systems only (fixed)** - map, tests, scripts, docs; no new movement, AI, takedown kinds, interactable kinds, objective types, net messages, HUD, bindings or mode logic. Anything else is a "Future" item. Files: `src/world/maps/ctcourse*.ts`, an exported co-op lips constant, unit tests. See T12 for the A3 / M4 clash.
4. **Originality (fixed)** - do not open other map builders (only `index.ts`, `listed.ts`, `storey.ts`; the ctcourse files are this map). Learn calls from `levelBuilder.ts`, `storey.ts`, `anchors.ts`. Do not copy the Sector Ops warehouse's layouts or set pieces.
5. **Rules for working (fixed)** - grep before naming; one phase at a time; honest checks; spec saved verbatim; progress log; approved docs are the contract; hyphens. Rule 8 ("update CHANGELOG.md") is overridden by G183 / G260: changelog fragment only.
6. **Building brief (fill)** - building type and era; original purpose; present use and who is there tonight; site and footprint; construction (grid, walls, storey heights, at most 3 walkable surfaces per column unless `navLayers`); rooms; real dimensions; palette, lighting, grade, weather.
7. **Stealth verbs found in the building (fill or delegate)** - the verb / element table. Rows: split jump, horizontal pipe, lip hang / shimmy / gap jump / corner, wall jump, ladders and drainpipes, ducts and vents, rappel, fence, doors and windows, cover and hide spots, not used.
8. **The route (fill or delegate)** - spaces in path order. Each: what it is, what is there tonight, the new mechanic, the shadow / high / loud / secret routes, the loop, guards' jobs, isolation moments and overlaps, toys, the objective, the connector after. Ends with "Guard total: <n>". The template says 9 or fewer; see T8.
9. **Co-op routes (fill or delegate)** - each route: where, the real reason solo cannot use it, the solo route to the same surface. Under G253 / G180, fill it as each area's co-op exercise: the CT verbs used, the real-world reason it needs two, the way back for a lone or downed player, the per-player objective lines (M4).
10. **Mission and modes (fill)** - `modes: ['course']`; objectives in route order (`CourseDef.objectives`); rules; theme (light level, grade); `reinforce`, `alarms`, `hideSpots`, `switches`. There is no `missions.json` entry for Course mode.
11. **Engine questions for Phase 0 (fill)** - see T-list items below (per-area ambient, guard count per area, `ladderGrab`, revive height, glass).
12. **Phases (fixed)** - 0 setup / grep; 1 architecture; 2 gameplay design; 3..n build per area with `plan-svg`; guards and mission; dressing and verification. M2 "plan, then build" removes the stops (Michael's written answer). "Michael's phone notes" becomes desktop (G12).
13. **Future recommendations (fixed)** - one paragraph per system the map would benefit from; not built.
14. **Report format (fixed)** - files changed, decisions, checks with summary lines, undone items, manual desktop checks per space (`TESTING.md`). "Phone" becomes desktop (G12).

---

## 4. Known tensions

**T1 - LD 11 "solo first" / solo invariance / "anyone can leave alone" vs G2 / G253.**
- Settled by G253 (DECISIONS l.1327) through G184. The spec cites G253; no loosening is needed.
- Keep 11.3 (lip out of solo reach), 11.5 (no unplanned boost targets) and the no-softlock intent of 11.4 (a lone player can always get back; revive on every co-op surface).
- 11.2's "no co-op markers" falls with solo invariance under G253. The CT striped squares may stay.
- The standard's own text stays unedited (it changes only with Michael's approval).

**T2 - LD 3.2 three routes plus a secret, 3.4 loops, 3.5 stepping stones vs single-solution drill cells.**
- The rules bind guarded spaces only.
- Preferred: an unguarded drill cell is a teach beat (LD 6.1). Every area with a perceiving guard gets the shadow / high / loud routes, with the co-op verb as one of them, and a loop.
- Loosening to LIST if wanted: "guarded drill areas have one taught co-op route plus one fallback".

**T3 - LD 6.1 one new mechanic per space vs areas combining lights, cameras, locks and the security room.**
- Fits if each area teaches one thing and later areas combine; the set piece last uses everything.
- The spec's beat chart must show it.

**T4 - LD 6.3 and bible 6 "Never: forced timers in stealth sections" vs "timed isolation of lights", "timed jammer exercises", "hacking in sync".**
- Preferred: time pressure comes only from device behaviour (jammer 5 s, lamp 4 s off, reboot 1.5 s, scanner window 1.5 s, `PAIR_WINDOW` 1 s, `TIMED_HOLD_AFTER` 6 s; the CT sync, G131) and patrol clockwork. No area countdown that fails the run; course time is score only.
- Loosening to LIST: a visible fail-on-timeout area clock (for example a breaker that restores power after N seconds and resets the area).

**T5 - LD 9.2-9.3 and G125 (at most one hard rule, signposted) vs several "fail = back to start" exercises.**
- Today the S3 camera send-back is the one hard rule.
- Preferred: other exercises fail by escalation (alarm stage, guards investigate, a scanner fail costs hp, a bay restart only when both are down).
- Loosening to LIST (a DECISIONS-level change): more than one send-back rule.

**T6 - G225 "keep the open floor at 0.30" vs LD 3.1 dark vantage, 3.5 darkness every 4-8 m, 5.1, bible L7.**
- 0.30 is above `LIGHT.shadow` 0.28, so on the open floor a light out never makes a player dark. "Timed isolation of lights" would then teach nothing.
- Preferred reading: G225 sets the induction / transit floor. Purpose-built stealth areas get their own `ambientZone` below 0.28.
- LIST for Michael explicitly: this reading narrows his G225 wording, so ask rather than assume.

**T7 - Cameras outside the light model (`lighting.md` l.8-10) vs light-plus-camera exercises.**
- Darkness never defeats a camera. Exercises must pair lights against guards and the jammer or the console against cameras.
- No loosening.

**T8 - Guard counts.**
- The template says guard total 9 or fewer so every guard spawns at the start; LD 15 says every guard is alive at the start.
- Course mode spawns per bay; `MAX_ALIVE` 12; G254 says as many as allowed.
- Preferred: 9 or fewer alive per area at that area's start.
- LIST: a yard total over 9 (allowed only because course mode spawns per area) as a template loosening.
- Passive training guards (G206; S3 duty guard A3) are role-players, not section-4 guards. LIST that classification. Every perceiving guard meets section 4 in full.

**T9 - 15-20 min (M3) vs pacing and size.**
- No code size cap. The current yard is 3-4 min practised, 9-16 min casual (CTCOURSE-SPEC l.7).
- The kit's pacing numbers (co-op beat every 2-4 min, set piece 6-10 min, rest 30-90 s, separation 3 min or less, idle 60 s or less; design-kit-digest 1.7, 1.9) are proposals under G157, not binding.
- Suggest using them as SHOULD guidance and timing each area (A2).

**T10 - LD 3.6 "guards do not look up" vs code.**
- Guard sight is a horizontal cone with no vertical limit (LD 12.1; G44 not built). High routes need occluders (parapets, lips, ceilings); they must not rely on height alone.
- Open item 2; no loosening.

**T11 - Glass (G45) is not built.**
- No window passes sight today. Observation of a next space must use openings, monitors or sightlines (LD 10.3, 3.8).

**T12 - Template "Scope: existing systems only" vs A3 (a new mechanic only where an exercise needs it) and M4 (per-area objective list with per-player lines).**
- Per-player objective lines may need new HUD, objective or wire behaviour.
- Preferred: data-only through `CourseDef` if it already supports per-player lines (check).
- Otherwise LIST it as a template loosening, Michael-approved by M4's words? M4 asks for the feature but not for a template change, so list it. If it touches the wire, bump `PROTOCOL_VERSION`.
- Any new co-op verb is Future work under LD 11.6: LIST it.

**T13 - Template "Co-op routes: brace and boost, human ladder, dual takedown ... the solo route".**
- Outdated: G180 removed the brace and the dedicated dual takedown, and G253 removes the solo route.
- Use the G180 CT set. This is a doc fix, not a loosening.

**T14 - LD 16.5.3 roof rail 1.1 m vs a co-op lip at a roof edge (annex relay).**
- Preferred: the lip is on a climbing face or access gap with a real reason; rails elsewhere.
- Otherwise LIST.

**T15 - LD 16.2.1 vertical circulation vs training climbing walls and towers.**
- Climbing walls are player traversal (16.2.6), allowed with register reasons.
- A ladder only inside a plant room or shaft, or on a training tower named as such.
- S7's 1.1 m "return stair" is not a stair (riser limit 0.115-0.19, scale-sheet 6): call it climbing blocks, or build a real stair.

**T16 - Scale-sheet minimums vs real-scenario mock-ups.**
- Real corridors are 1.5-1.8 m; the rule is never under 3.0 (16.1.2 "never smaller").
- Keep 3.0+ and say the mock-up is widened for two operators.

**T17 - LD 13 / 14 process vs G55, G87 and M2.**
- The deliverables go in `docs/marlow-final/`, not `docs/archive/prompts/` (open item 5).
- No phase stops (open item 6; M2).
- The coverage table's verb source is open item 7.
- The scale sheet predates the CT camera (open item 8, G54): re-measure corridor widths, as an engine question.

**T18 - Perf.**
- LD 15 requires perf budgets; CLAUDE.md forbids perf tuning before the playtest.
- Run once on the laptop GPU (Character Build). Block only on broken.

---

## 5. Current map compliance (`src/world/maps/ctcourse*.ts`, master af56ab43)

**Facts**
- Extents x -1..171, z -1..15 (172 x 16 m, one 14 m-wide gallery). Single floor at y 0, plus 4.4 m wall tops and the annex roof. Default nav layers.
- 8 bays x 16 m plus 7 airlocks of 6 x 6.
- 31 fixed lamps: 24 in bays (2/3/5/2/5/2/3/2) and 7 in airlocks. No `switches`, no light groups.
- 2 guards, both `passive`, no routes: `s1-guard`, `s3-sec-guard` (`ctcourse.ts:210-213`).
- 1 camera (`cam-s3`), 1 laser, 1 laser panel, 1 scanner pair, 2 wall medkits.
- One floor surface, `concrete`. Co-op lips at 4.4 (`LEDGE`).

**Breaks**
1. LD 5.1 / 16.8.1: every lamp is unswitchable with no stated reason (no `switches` or `group` in the layout).
2. LD 4.1-4.8, 15 patrol tests: no perceiving guard, so no patrols, cycles, isolation, overlap, lures or bodies-found.
3. LD 3.2, 3.4, 3.5: one route per bay. Open 14 x 16 m bays have no cover or darkness every 4-8 m (scale-sheet 5: cover every 8 m).
4. LD 7.2: S1, S6, S7, S8 have fewer than two toys.
5. LD 5.3 / 16.8.3: one floor finish everywhere; no loud / quiet pairs.
6. LD 3.1, 3.5, bible L7: the 0.30 open floor (G225) is above the 0.28 shadow line, so there is no dark vantage (T6).
7. Scale sheet:
   - S3 hallway 2.9 m wide (z 0.15-3.05), under the 3.0 minimum;
   - security room 5.7 m inside, under the 6 m play space;
   - security room door edge 1.2 m from the room corner (z 8 -> 9.2), under 1.5 m;
   - S5 door (bay +9) and grid door (+12.5) 3.5 m apart on the route, under the 5 m no door-after-door rule.
8. LD 16.9: the register is stale. CTCOURSE-SPEC L25 lists one S3 pendant; the code has four S3 strips (`S3_LAMPS`, `ctcourse.ts:87-92`) plus the room panel. Missing rows fail review.
9. LD 16.5.3: the annex roof (players press plates there) has no 1.1 m rail (T14).
10. LD 16.2.4 / scale sheet 6: the S7 "return stair" has 1.1 m rises (`ctcourse.ts:598-601`); it is climbing blocks, not a stair.
11. LD 13: no space sheets, guard sheets, beat chart, gameplay overlays or plan SVGs exist for ctcourse.
12. (Moot, ENGINE-ANSWERS Q5.) `TEAM.ladderGrab` 4.1 has no reader; the ledge relay serves hangs up to 4.6 m and the leg-up reaches 4.5 m, so 4.4 m lips are fine.
13. LD 6.4 / M4: eight explainer panels (`sw-p1..8`, `PANEL_TEXT`) are to be removed.

**Holds**
- Co-op lip band (4.4).
- Both-extract exit (G138).
- Medkit stations (G98).
- One signposted hard rule (S3).
- Camera within SN04 / SN60 limits.
- Airlocks at 6 x 6 per `validateCourse`.
- Text 90 characters or less.
