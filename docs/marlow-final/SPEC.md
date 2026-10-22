# Task: Marlow Yard - a luxury co-op training facility that rehearses real sites, one flowing 15-20 min run

Status: DRAFT in progress (spec writer, 2026-10-23). Sections marked TODO are not yet written.

## 0. Sources and authority
- Authority (G86): Michael (BRIEF M1-M6) > `docs/DECISIONS.md` > `docs/design-bible.md` > `docs/level-design.md`,
  `docs/templates/map-spec.md`, this spec > `CLAUDE.md` > code.
- Evidence merged here: `docs/marlow-final/BRIEF.md` (M1-M6, A1-A7), `AUDIT.md` (the yard as built), `COOP-INVENTORY.md`
  (mechanics, gaps, exercises E1-E12), `CONSTRAINTS.md` (checklist items 1-60, engine limits, tensions T1-T18),
  `ROUTE-DRAFT.md` (8 sets, 7 locks, timing; its route, exercises and timings are kept, its depot frame is replaced per
  M5 / M6), and Course Ready's second opinions on `origin/feature/marlow-bays` (f8a33a76) `docs/marlow-final-prep/`
  `MAP-AUDIT.md`, `DEVICE-INVENTORY.md`, `SCENARIOS.md` (its catalogue entries are written CR-S1..CR-S37 here so they do
  not clash with the old bay ids S1-S8).
- `KIT.md` (the art kit) was not on disk when this was written; section 6 sets the look and the builders map each named
  piece to the kit at slice start.
- Michael's M6 (~00:45) sets the lighting: "lit, players cut it, but you can also use mixed zones if it ends up being a
  better result. In game levels are quite dark and not realistic". Gallery: "View only" (A5 holds). Guards: normal
  guards (A7 holds; a guard avatar is a later roadmap item, not this job).
- Engine numbers come from CONSTRAINTS section 2 (grep-confirmed 2026-10-23 on master af56ab43). Phase 0 re-greps them.
  `PROTOCOL_VERSION` is 29 (`src/net/protocol.ts:18`; MAP-AUDIT's "27" is stale).

## 1. Context
Night Shift (repo Tekcry/Mobile-Coop). Branch `feature/marlow-final` from master af56ab43 (merge master when train 12,
4.62.0, lands), folder `C:/NightShift/Mobile-Coop-marlow-final`. Slices land on this branch; one PR to master at the end
(A4); the orchestrator reviews and merges (CLAUDE.md "Sessions" overrides the template's "never merge").

Goal: rebuild map `ctcourse` ("Marlow Yard", Course mode, `?autostart=ctcourse&mode=course`, A1) as a finished 2-player
co-op training level: a very expensive private rehearsal centre whose sets are full-size mock-ups of real sites (a lorry
gate, a carriage shed, an office range, a port goods shed with its security room, a substation compound, a pumping
station, a colocation data hall, a bank strongroom). One route, teach -> combine -> graduation finale, 15-20 min for a
first co-op run (M3, A2). Every exercise needs both players. It follows `docs/level-design.md` in full, except the
proposals in section 15, which are listed for Michael and never applied.

## 2. Scope
The template's "existing systems only" is the default (T12). This map is a prototype (CLAUDE.md current goal), so:
- Map, tests, scripts, docs: `src/world/maps/ctcourse.ts` plus one file per set (`ctcourseSets/a1Gate.ts` ..
  `a8Strongroom.ts`, see PLAN.md), the exported co-op lips constant, unit tests, `scripts/e2e-ctcourse.mjs` and the shot
  scripts.
- New code only where an exercise cannot work without it (A3), each a basic prototype: section 14 (N1-N10). M4 asks for
  the per-player objective list (N1). The timed devices (N2-N5) are what Michael's list ("timed isolation of lights,
  cameras, locks") cannot be built without. Everything in section 14 is also a section 15 proposal so Michael can
  strike any item in the morning; slice 0 builds them because every later slice needs them.
- Enemies and tuning tables never change (`src/config/movement.ts`, enemies, perception, `LIGHT`). If an exercise does
  not engage, change the geometry.
- Other maps: no changes, except the shared code of section 14, which keeps `courselab`, Sector Ops and Fallow behaviour
  (their tests stay green).
- Anything else found on the way is a "Future" item (section 21), not built.

## 3. Originality
- Original design. Do not open other map builders (only `index.ts`, `listed.ts`, `storey.ts` and the `ctcourse*` files,
  which are this map; `courselab.ts` may be read for gate data shapes only). Do not copy the Sector Ops warehouse or
  Fallow layouts, ids, colours or set pieces.
- Learn calls from `src/world/levelBuilder.ts`, `src/world/maps/storey.ts`, `src/world/anchors.ts` and the device data
  shapes in DEVICE-INVENTORY sections 1-2 (`MapLayout`, `CourseLayout`, gate kinds).
- No reference-game names anywhere (G6): facility, owner, sets and role-players have original names (section 5).

## 4. Rules for working
1. Read `CLAUDE.md`, `docs/level-design.md`, this spec, `PLAN.md` and the slice's rows before building.
2. Grep before naming any file, type, function, field or constant; if it differs from this spec, report it, never
   invent a substitute.
3. One slice at a time (PLAN.md). M2 ("plan, then build") removes the template's stops for Michael; the job lead's loop
   (implementer, fresh checker, at most 1 fix round per slice) replaces them (G87).
4. Each slice: run the checks PLAN.md names, report honestly with summary lines, update `docs/marlow-final/STATE.md`.
5. This spec is the build contract. Deviations go in STATE.md "Decisions" with the reason; a change to a route, a guard
   job or a set needs the job lead's OK and a line for Michael.
6. Changelog: one fragment `changes/feature-marlow-final.md` (G183), never `CHANGELOG.md`; never bump `package.json`.
7. Hyphens, never em dashes. British spelling in all game text. Text lines 90 characters or less (`COURSE_TEXT_MAX`).
8. Branch guard before every write; no `npm run dev` or watch modes from agents; heavy runs take `heavy.lock`; GPU work
   and the slice e2e tier go to Character Build on the laptop (CLAUDE.md "Sessions").

## 5. Building brief: the fiction and the facility
- **Building type and era.** A 2024 private rehearsal centre built inside the shells of a Victorian railway goods yard
  in Kestrel (the old railway district, `docs/story.md` section 3). The name Marlow Yard stays (A1).
- **Owner and purpose.** Vellan & Rook Rehearsal Ltd (original name, G6), a private firm that builds full-size,
  working replicas of real sites from survey drawings: security contractors, insurers and broadcast crews pay to
  rehearse inside a copy of the building before they work in the real one. The firm sells to boards and ministers, so
  the centre is fitted like a private members' club: that is why it is very expensive and luxurious (M5). The sets use
  real security hardware (IR cameras, beam towers, maglocks, time locks, lighting contactors) on real circuits, wired
  to each exercise by the set crew.
- **Present use, tonight.** The Continuity Office leases the whole centre overnight under a cover account for Night
  Shift's assessment. LANTERN (Peg) runs it from the instructor bridge (radio voice, section 13). The guards are
  Vellan & Rook role-players: normal guards with the same eyes, ears and alert stages (A7, G80); a knocked-out
  role-player is replaced when the set resets. Nobody else is in the building.
- **Site.** The goods yard's three parallel sheds, roofed and joined, 160 x 78 m (x east 0-160, z north 0-78), all at
  ground y 0. Windowless (sets need controlled light): indoor theme, no moon.
- **Construction.** New steel portal frames on the old shed's 6 m column grid; composite insulated shell; 10 m clear to
  the roof trusses in the set halls. Wall thicknesses: facility walls 0.45 m, set flats and partitions 0.30 m (0.6 m
  brick where a set copies a brick wall). Storeys: ground y 0; the instructor gallery floor at y 4.5 (0.3 slab, underside
  4.2) over the service corridors. At most 3 walkable surfaces per column (default nav layers, CONSTRAINTS 55).
- **Circulation.** One route through eight sets (A1-A8) joined by seven holding rooms (L1-L7, the course airlocks),
  ending at the exit dock. Under the gallery strips run the set crew's service corridors (ground, 4 m wide, closed to
  players: real staff corridors behind locked doors, never opened tonight). Fire exits from every set lead to the
  service corridors (locked fail-secure for the exercise, signed, never on the route).
- **Services.** Power and lighting from the plant room at the instructor bridge's ground floor; every set has its own
  lighting circuits on contactors the instructors can drive (the timed isolations are these contactors, honestly
  described). Air: ducted from the roof plant down the service corridors; no player ducts except where a set copies one.
- **The instructor gallery (A5, M6 "View only").** A glazed walkway at y 4.5 shaped like an H on plan:
  - south strip z 20-24 over x 0-112 (above the south service corridor), glazed into the south-row sets' north walls
    and the middle-row sets' south walls;
  - north strip z 48-52 over x 40-106, glazed into the middle and north rows, ending in a glazed end bay that looks
    into A8 over its west wall;
  - the instructor bridge x 70-76, z 24-48 (the cross strip, above L4), with the control desk, the monitor wall and the
    lighting board in view of four sets.
  Players never enter it (sight only). T11: glass passing sight is not built (G45), so each gallery glazing panel is a
  solid collider and a sight / light blocker in gameplay, with a visual-only glass mesh and the lit gallery beyond. No
  light passes either way: gallery lamps are baked on their own side of the wall, so light parity holds. Role-play
  "instructors" in the gallery are static dressing figures, not guards (no perception).
- **Rooms** (sets are rooms of the facility; each copies a real site, section 9 gives sizes and contents):

  | Id | Facility room | Box (x0-x1, z0-z1) | Copies (real site, its purpose) |
  | --- | --- | --- | --- |
  | A1 | Set 1, the Gate | 0-22, 2-20 | A lorry gate and goods-yard boundary wall with a bolted wicket |
  | L1 | Holding room 1 | 22-28, 8-14 | - |
  | A2 | Set 2, the Carriage Shed | 28-70, 0-20 | A night freight siding with parked vans, a shunting neck, cleaning staging |
  | L2 | Holding room 2 | 70-76, 7-13 | - |
  | A3 | Set 3, the Office Range | 76-100, 0-13 | A commercial office corridor with a ceiling camera, three offices |
  | L3 | Holding room 3 | 100-106, 7-13 | - |
  | A4 | Set 4, the Goods Shed | 76-112, 13-48 (security room 100-106, 13-19; floor 76-112, 24-48) | A port warehouse floor with its security room |
  | L4 | Holding room 4 | 70-76, 30-36 (under the bridge) | - |
  | A5 | Set 5, the Substation | 40-70, 24-48 | An urban grid substation compound, built indoors as a switchgear hall |
  | L5 | Holding room 5 | 50-56, 48-54 (under the north strip) | - |
  | A6 | Set 6, the Pump House | 40-64, 54-72 | A tidal-barrier pumping station: pump floor, motor gallery, drive cage |
  | L6 | Holding room 6 | 64-70, 59-65 | - |
  | A7 | Set 7, the Data Hall | 70-100, 52-72 | A colocation data hall with a two-person cage |
  | L7 | Holding room 7, the Model Room | 100-106, 57-63 | - |
  | A8 | Set 8, the Strongroom | 106-150, 50-78 | A Victorian bank's banking hall, security office and vault |
  | Exit | The cash dock (exit zone) | 150-160, 58-66 | A cash-in-transit loading dock |
  | - | Arrival lounge | inside A1, 0-6, 8-14 | The clients' reception: where the course starts |
  | - | Instructor gallery and bridge | see above | Out of bounds, sight only |
  | - | Service corridors, plant room | under the gallery | Closed to players (locked staff doors) |

- **Holding rooms (L1-L7).** The set crew's interlock lobbies between sets: 6 x 6 x 3.2 m (`validateCourse` 6 x 6 +-0.5),
  two motorised sliding doors (1.2 m clear, the existing door logic with a sliding-leaf kit mesh), the pad, the
  checkpoint. A narrow clear-glass slot (visual, solid collider, T11) shows the next set's first 6 m; the briefing board
  is gone (M4: the objective list guides). The door behind locks for good: no backtracking. L4 and L7 have wall
  medkits. L7 holds a table-top scale model of A8 (the plan-ahead beat, LD 10.3).
- **Real dimensions.** Doors 1.2 x 2.1 (double 1.8 x 2.1; roller 3.0 x 3.0); corridors 3.5 m (A3's office corridor is
  widened from a real 1.8 m for two operators, T16); play spaces 6 m or more on the short side; set ceilings 3.0 m for
  rooms, 4.5-9 m for halls; stairs rise 0.165, run 0.285, handrails both sides; co-op lips 4.4 m; low cover 1.2 m;
  steps 0.15-0.40 only.
- **Palette, light, grade, weather.** Section 6 (look) and section 7 (light). Indoor, no weather, no moon.

## 6. Facility look (M5)
Michael (M5, verbatim): "make it a believable training facility that reproduces potential real level scenarios ...
very expensive, and should adopt a design that is luxurious (LED strips, glass panel where an "instructor" can watch you
train throughout the course, sliding doors, any suggestions you have ...)". The no-detail-art-before-playtest rule is
lifted for this job only: each set is dressed straight after its greybox passes (PLAN.md).

**Two layers, always readable apart.**
1. **The facility shell** (lounge, holding rooms, set hall walls above the sets, gallery): the luxury layer (A6).
   - Dark charcoal composite wall panels on a 1.2 m module with 10 mm shadow gaps; brushed bronze-steel trims at the
     panel heads and floor; polished dark concrete floors (quiet, `concrete`).
   - LED strip coves as the main read light: a warm 2700 K cove at the panel head (y 3.0 in rooms, y 4.2 in halls) and
     a cool 4000 K floor-level wash in the holding rooms. Coves are real baked lamps on the set's house circuit plus a
     render-only emissive strip; the strip never glows brighter than the lamps it stands for (parity).
   - Motorised double sliding doors in bronze frames (existing door logic, kit leaf mesh, `KIT.md`) on every holding
     room and the lounge; set doors are whatever the copied site has.
   - The instructor gallery: floor-to-ceiling clear glazing with slim bronze mullions every 1.2 m, a lit interior (warm
     coves, a long control desk, monitors showing the sets, two seated instructor figures and LANTERN's chair on the
     bridge), frosted lower band to 0.9 m. It runs along the route so most sets have it in view (H plan, section 5).
   - Signage: a small backlit set number and name at each set door ("SET 3 - OFFICE RANGE"), the facility logo
     (original: V&R monogram) in the lounge. No arrows, no waypoints (bible 6).
   - My suggestions for the luxury read (examples, M5 allows): a marble-look reception desk and leather lounge seats in
     the arrival lounge; a living green wall behind the reception desk; a glass-fronted kit room (wall of rifle and
     pistol cases) beside the lounge; the A8 scale model under a glass vitrine in L7; bronze handrails on every stair;
     the exit dock finished as a VIP debrief bay with a lit "ASSESSMENT COMPLETE" slot board.
2. **The sets** keep their own materials so each reads as a real site built inside a luxury hall (A6): brick and
   timber at the Gate, oily concrete, rail and ballast in the Carriage Shed, carpet tile and frosted partitions in the
   Office Range, painted steel racking in the Goods Shed, gravel bunds and transformer grey in the Substation, wet
   concrete and chequer plate in the Pump House, raised floor tiles and rack doors in the Data Hall, marble, oak
   counters and brass grilles in the Strongroom. Where a set stops short of the hall roof, the hall's charcoal panels
   and LED coves show above it, so the "set inside a studio" reads at a glance.

**Kit pieces this spec asks for** (the KIT agent's generator, in-repo Blender `-b`, CC0 textures only): wall panel with
LED cove; gallery glazing bay; double sliding door leaf and frame; LED strip cove; floor trim; column cladding; bronze
handrail; holding-room glass slot; set signage plate. Visual meshes sit on top of the level builder's collision
(`collide: false`, 5 mm proud of solid faces for `voxelFit`).

**Perf.** One GPU perf run and GPU shots per set via Character Build (PLAN.md); block only on broken (T18).

## 7. Lighting (sufficient light, rule review)
Michael (M6, verbatim): "lit, players cut it, but you can also use mixed zones if it ends up being a better result. In
game levels are quite dark and not realistic". Hard rule unchanged: light parity (picture, meter and guards agree),
lamps baked, gameplay reads only the light field.

**The model.**
- **Lit by default.** Every set is lit as its real site would be at night with the crew working (yard floods, office
  panels, shed high-bays, data-hall rack-row lights, the banking hall's chandeliers) plus the facility's LED coves.
  Target: a standing player in any lit pool on the route reads clearly lit on the meter (builders set the band in
  `tests/ctcourseLight.test.ts`, suggested 0.55 or more) and every surface reads at the Low preset.
- **Players cut it.** Darkness is something the pair makes: a timed isolator (N2), a wall switch, a jammed lamp (one
  5 s jam is about 10 s dark), a shot lamp (loud, rating cost). Every exercise that needs dark says which circuit.
- **Standby fill under the circuits.** Each set has an `ambientZone` at a standby level below the 0.28 shadow line
  (suggested 0.14, the level of real emergency and standby lighting), so a cut circuit gives true dark that the meter and
  the guards agree on (settles T6 as M6 directs). The lounge, holding rooms and exit dock keep G225's 0.30 fill.
- **Mixed zones** where they play better (M6): a set may keep permanent dark pockets that a real building has at night
  (the pump floor's far corners in A6, the A8 vestibule under the gallery, the dark goods-floor back aisle in A4, the
  cabin corner in A2). Each is named in its set sheet with its reason.
- **Every lamp** has an owner, a fitting and a switch where a real one would be, by a door, or a stated reason it has
  none (photocell, emergency circuit, the facility house circuit that the instructors own) (LD 5.1, 16.8.1). Every lamp
  is in a light `group`; every group a course exercise reads is named in `course.groups` so its state reaches the
  client (DEVICE-INVENTORY 2.10).
- **Cameras see in the dark (G240).** No exercise uses darkness against a camera (T7): cameras are beaten by a jam, the
  security console's loop (N3) or timing.
- **Engine limits.** At most 8 baked lamps reaching any 2 m column (`LAMP_GRID_SLOTS`); a lamp sees at most 4 doors
  (`DOORS_PER_LAMP`); 16 character shadow capsules, 4 per lamp. LED coves are built as rows of baked lamps 2.4-3.0 m
  apart with modest radius (3-5 m) so the per-column cap holds; the builder runs `tests/lampGridLossless.test.ts`.
- **Restart restores lamps.** `resetLights` returns early when a layout has no `groups` (COOP-INVENTORY 0): fixed by
  giving the map groups and by N2's restore on a set restart, so a retry never starts darker than the first try.

**Rule review (M5 "review the rule if needed", M6).** The rules that assume a dark level, and what this spec does:

| Rule | Text (short) | Conflict with "lit, players cut it" | This spec |
| --- | --- | --- | --- |
| LD 3.1 | Entry vantage is dark | Sets are lit by default | Vantage out of every guard's view by occlusion (a doorway, a van, a counter), dark where a mixed zone allows; proposal P1 |
| LD 3.5 | Darkness, cover or a hide spot every 4-8 m | Cover and hide spots still apply | Met with cover and hide spots; darkness only where made; no change needed |
| LD 5.1 | Every lit pool has a source and a switch by a door | None | Met (every pool on a switch or isolator) |
| LD 5.2 | Every lit chokepoint darkened two ways, avoided one | None | Met per set sheet |
| G225 | Open floor at 0.30 | 0.30 is above 0.28: a cut circuit would never be dark | Sets use a 0.14 standby fill; 0.30 stays in the lounge, holding rooms and dock; proposal P2 records it |
| LD 6.3 / bible 6 | No forced timers in stealth sections | Timed isolations | Device windows only, player-started, re-armable, never fail the run; proposal P3 |

Proposal P4 (section 15) asks Michael whether "lit by default, players make the dark" becomes a level-design rule for
every map (his "in game levels are quite dark and not realistic").

## 8. Stealth verbs found in the building
| Verb | Real building element |
| --- | --- |
| Leg-up (co-op) | A1 goods-yard wall (4.4 m brick boundary wall); A2 carriage-cleaning staging deck edge (4.4); A6 motor gallery deck edge (4.4); A8 banking-hall gallery cornice (4.4) |
| Ledge relay (co-op) | The same four 4.4 m lips (the second player climbs the hanging partner) |
| Partner throw (co-op) | A5 cable gateway in the substation's inner security wall, guarded by IR beams (throw over the beams); A8 vault lobby inner beam curtain |
| Hang-down (co-op) | A6 cable gland plate in the motor-gallery bridge over the drive cabinet (0.6 m, too small to pass a body) |
| Two-person rope (co-op) | A6 motor gallery: the confined-space rescue line from the davit box (real wet-well kit) |
| Held jammer (co-op relay) | IR cameras (A3, A4, A7, A8), set lamps (all), the substation floodlight (A5), beam-tower power panels (A5) |
| Paired hack (co-op sync) | A7 cage dual-control terminals; A8 time-lock panels (the two-person rule of a real vault) |
| Dual takedown | A4 dock talking pair; A8 night desk pair |
| Lip hang / shimmy | The 4.4 m lips above (hang and shimmy along them); A2 staging screens |
| Split jump, wall jump | Not used: no believable 1.2-1.95 m gap of tall faces; A2 vans on 5.0 m road centres to avoid accidental gaps |
| Horizontal pipe, drainpipe, ladder | Not used on the route (indoor sets; LD 16.2.1). Pump-house plant ladders are dressing behind locked plant doors |
| Ducts and vents | Not used: the facility's air runs in the closed service corridors; no copied site needs a duct route (LD 16.3.4) |
| Rappel | Not used (no CT rappel in the toolkit) |
| Fence | A5 transformer bund walls (1.2 m low cover, not climbed) |
| Doors, windows | Every set door; holding-room sliding doors; A3 communicating office doors; A4 dock wicket; A8 public grille (maglock); stealth open and bash from the door menu |
| Cover, hide spots | Vans (A2), office desks and the cleaner's trolley (A3), racking and dispatch office (A4), bunds (A5), pump plinths (A6), rack rows (A7), counters (A8); hide spots per set sheet |
| Not used (no believable element) | Split jump, wall jump, pipes, drainpipes, ducts, rappel, zip line, stack (not built), living key (not built) |

## 9. The route
The route keeps ROUTE-DRAFT's eight sets, seven holding rooms, exercises and timings, re-framed as mock-ups inside the
luxury centre (M5) and lit by default with the exercises cutting the light (M6). "A" and "B" are jobs, not host and
client: the objective list gives the lead player (P1 in odd sets, P2 in even sets, the course's existing swap rule) the
A line and the other the B line; either player may take either job.

**Rules shared by every set (no loosening applied).**
- **Spotted by a role-player:** normal guard escalation (suspicious, alert, search, fight). Break line of sight and
  re-hide: every guarded set has a loop and hide spots (LD 3.4, 4.8, 9.1-9.2).
- **Camera or beam alarm:** the alarm stage rises (banner, LANTERN radio), as today; it never ends the run (G125).
  ROUTE-DRAFT's "an alarm resets the set" is proposal P5 (T5), not built unless Michael says yes.
- **Restart:** the existing set restart (both down 2 s, or pause "Restart at checkpoint") puts both in the set's entry
  holding room, respawns its role-players, re-arms its devices and restores its lamps (N2 fixes `resetLights`).
- **The one hard rule** stays A3's camera corridor send-back (G125: at most one, signposted).
- **Timed windows** are device behaviour only: player-started, shown on the device (lamp, sound) and in the objective
  line (N1), re-armable, never a fail (T4, proposal P3).
- **Strandings:** a thrown, boosted or lowered player always has a way back (a release, a push-bar door, a stair, the
  hang-down drop). No softlock (LD 11.4 intent).
- **Guards per set:** at most 3, spawned at the set's start (Course mode; `MAX_ALIVE` 12; the template's "9 in total"
  is proposal P6, T8). Every perceiving guard meets LD section 4: job, cycle 25-45 s, stops 3-6 s, an isolation moment,
  a lure destination, a body-finding patrol, a survivable search.
- **Holding rooms L1-L7:** quiet connectors (LD 3.8): no guard, a glass slot (visual) onto the next set's first 6 m,
  the pad and checkpoint, 4 s cycle, the door behind locks. Medkits in L4 and L7.

Sheets per set follow. Coordinates are plan boxes (x0-x1, z0-z1), floor y 0 unless given; builders snap to the 6 m
grid and the 0.5 m nav cells and may shift a box up to 1 m with a STATE.md note. Light groups are numbered 10 x set +
k. Objective lines are 90 characters or less, British, voiceable (N1 renders them).

### A1 - Set 1, the Gate (teach: the handshake). Tension 1
- **Mock-up.** A goods-yard lorry gate after hours: the arrival lounge (the clients' reception, x 0-6, z 8-14, motorised
  sliding doors) opens onto a lorry apron (x 6-12), a 4.4 m brick boundary wall at x 12 (0.6 m thick, full width z 2-20,
  coped top; the hall's charcoal panels and coves show above it), a 1.2 m wicket door in it at z 10.4-11.6 bolted on
  the yard side, a chained 3 x 3 vehicle gate at z 4-7 (locked, never opens: the lorry gate's owner keeps the key), the
  gate checker's cabin on the apron (x 7-10, z 15-18) and the yard beyond (x 12.6-22) to L1.
- **Footprint.** 22 x 18 m, open to the 10 m hall roof.
- **Entry / exit.** Start in the arrival lounge (spawns x 2, z 10 and 12, facing +x). Exit L1 (22-28, 8-14).
- **Exercise E1 (CR-S1, CR-S2).** A crouches at the striped mark (x 11.2, z 6) and gives B a leg-up to the 4.4 lip; B
  drops into the yard and unbolts the wicket (bolt gate, side +x, `at` on the door plane, course-ready F7). Or B hangs on
  the lip and A climbs him (ledge relay), so both go over the top. Sync: the handshake.
- **Observe, then plan.** From the lounge doors both see the wall, the striped mark, the wicket's locked handle and the
  instructor gallery above (north). Nothing threatens.
- **Routes.** Unguarded teach set (T2): leg-up and unbolt, or leg-up and relay.
- **Guards.** One passive role-player, the gate checker (`a1-checker`), seated in his cabin facing the apron, with
  interrogation lines (G206; keeps e2e-coop's bay-1 grab-from-behind guard, AUDIT 6). He sees and hears nothing.
- **Lights.** Lounge coves group 10 (facility house circuit, owned by the instructors: no wall switch, stated reason);
  apron lamp on the cabin, group 11 (photocell); yard lamps group 12 (switch in the cabin by its door); cabin panel group
  13 (switch by the cabin door). Ambient: lounge 0.30, set 0.14 standby. All lit at start.
- **Toys.** Cabin switches (yard, cabin), the wicket, the cabin door, the checker (grab, interrogate).
- **Devices.** Bolt gate `g-a1-wicket` on door `A1-wicket`.
- **Objective lines (N1).**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a1-over | Get over the yard wall together: one boosts, one climbs. | Crouch at the striped mark and give your partner a leg-up. | Take the leg-up, drop into the yard and unbolt the wicket gate. | `g-a1-wicket` open, or both east of x 12.6 |
  | a1-lock | Both of you into holding room one. | - | - | L1 cycled (existing last row) |

- **Target.** 1:10 (+0:30 lounge start).

### A2 - Set 2, the Carriage Shed (teach: timed light isolation). Tension 2
- **Mock-up.** A night freight siding: three roads (tracks) east-west on 5.0 m centres (z 5, 10, 15); rakes of box vans
  (10 x 2.6 x 3.4 m, `noLedge`; 5.0 m centres so no accidental split gap) at x 30-46 and x 56-68; the shunting neck
  x 46-56 between them lit by four high-bays; the shunter's cabin by the west door (x 28-32, z 1-5); carriage-cleaning
  staging along road 3's north side (z 17-20) with a 4.4 m deck edge and 1.2 m solid edge screens, a stair at its east
  end only (the west stair is behind a padlocked permit-to-work gate, the cleaning crew's lock-off).
- **Footprint.** 42 x 20 m, roof tie 7 m, ridge 9 m.
- **Entry / exit.** L1 west door (x 28, z 8-14) to L2 (70-76, 7-13).
- **Exercise E7a (CR-S26, ROUTE A2).** A presses ISOLATE at cabinet 1 (in the cabin): the neck's high-bays (group 21)
  drop for 15 s (N2), and the shunter walks to cabinet 1 to check (the `lightsOut` lure, nearest calm guard). A hides
  in the cabin's dark corner (lure destination and takedown spot). B, waiting at the near rake's end, crosses the 10 m
  neck crouched (about 6 s) and reaches cabinet 2 by the east door; B isolates again and A crosses behind the shunter.
  Cabinet 1 to far cover is 26 m by route: at a silent pace (1.7 m/s) that is over 15 s, and the shunter walks it, so one
  player cannot isolate and cross alone. Sync: alternating isolations.
- **Observe, then plan.** From the west doorway between the buffer stops (occluded by the first van, out of the
  shunter's view for his whole loop) both see the neck, the shunter's loop within one cycle and both cabinets' status
  lamps (cabinet 2 is visible from cabinet 1).
- **Routes.** Shadow: the light relay. High: leg-up and relay onto the staging at its west end, crouch behind the
  screens, down the east stair (slower, no light play). Loud: shoot the high-bays (the shunter investigates; rating).
  Secret: the cabin's back door onto road 1's cess, behind the south rake. Loop: round the west rake (both ends open).
- **Guards.** `a2-shunter`: job, walking the neck and checking couplings. Post at the neck (x 51, z 10) facing west 4 s;
  loop along road 2's cess to x 66 and back; cycle 30 s. Isolation moment: at cabinet 1 when lured, or at x 66 (east
  end, behind the far rake). Lure: lights out sends him to cabinet 1 (the cabin corner). Body: a body left in the neck is
  on his loop. Hide spots: cabin corner, the gap between vans 2 and 3 of each rake.
- **Lights.** Shed general group 20 (switch by the west door, lit); neck high-bays group 21 (isolators at cabinet 1 and
  cabinet 2, two-way, N2 15 s); cabin panel group 22 (switch by the cabin door; the dark corner is the cabin's unlit coat
  corner, a mixed zone); staging strip group 23 (switch at the stair head). Chokepoint (the neck): darkened by the
  isolators, the jammer (one lamp at a time) or shooting; avoided by the staging.
- **Surfaces.** Ballast between the rails (loud, `gravel`), concrete cess (quiet), staging deck chequer plate (loud).
- **Toys.** Two isolators, the cabin switch, the high-bays (jam / shoot), the permit gate, the cabin back door.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a2-neck | Cut the neck lights and cross while the shunter checks. | Isolate the neck lights at cabinet one, then hide in the cabin corner. | Wait at the van ends, then cross the dark neck to cabinet two. | B east of x 56 |
  | a2-back | Now the other way round. | Cross behind the shunter while your partner isolates. | Isolate at cabinet two so your partner can cross. | both east of x 56 |
  | a2-lock | Both of you into holding room two. | - | - | L2 cycled |

- **Target.** 1:45.

### A3 - Set 3, the Office Range (teach: the timed jam relay). Tension 2
- **Mock-up.** A commercial office corridor at night: a west lobby (x 76-79), the corridor 3.5 m wide and 18 m long
  (x 79-97, z 9-12.5, widened from a real 1.8 m for two operators, T16), three offices on the south side (x 79-86,
  86-93, 93-100, z 0-8.7, 3.0 m ceilings) with frosted partitions (visual; solid to sight, T11) and communicating doors,
  one ceiling IR camera at the east end (x 96.6, y 2.8, z 10.75, facing west, narrow sweep), the office 2 door reveal at
  x 88 (1.0 m deep recess, the stepping stone), the east lobby (x 97-100) under and behind the camera, and the door to L3.
- **Footprint.** 24 x 13 m, 3.0 m ceilings.
- **Entry / exit.** L2 into the west lobby; the east lobby to L3 (100-106, 7-13).
- **Exercise E2 (CR-S13, kept from S3).** A jams from the west lobby (18 m, in range): 5 s held plus the 1.5 s reboot.
  B crouch-runs 9 m to the recess. A sits out the 5 s cooldown, jams again, B reaches the east lobby. Swap: B jams from
  the east lobby and A makes the same two hops. Four jams in all. A second jammer may join a jam (J3). Sync: the jam
  budget forces strict alternation.
- **Observe, then plan.** Through the west lobby's door both see the camera, its red view grid (G222), the recess and
  the far lobby.
- **Routes.** Shadow: the corridor relay. Secret / alternative: the offices through the communicating doors, past the
  cleaner, one short jam at office 3's door (3 m from the east lobby). Loud: shoot the camera (alarm stage, rating).
  Loop: offices 1-2-3 and the corridor.
- **The hard rule (G125, the one).** A player the camera fully spots in the corridor is sent back to the west lobby
  (existing `PassZone.hall`, `HALL_BACK_HOLD`), with a LANTERN line. Signposted by the first objective line.
- **Guards.** `a3-cleaner`: job, emptying bins office by office. Loop office 1 -> 2 -> 3 through the communicating
  doors, 5 s stop at each desk, cycle 35 s. Isolation moment: office 3's far desk (x 98, z 2), lit but unwatched. Lure:
  switching an office's lights off draws him to its switch. Body: offices are on his loop. Hide spots: the office 1
  desk-run recess (1.0 x 1.2), the trolley bay.
- **Lights.** Corridor panels group 30 (switch in the west lobby; lit); offices 31-33 (a switch by each office door);
  lobbies on the house circuit (group 34, no switch: facility circuit). The camera ignores light (G240).
- **Surfaces.** Carpet tile in the offices and vinyl in the corridor (quiet); lobbies polished concrete.
- **Toys.** The camera (jam, shoot), three office switches, communicating doors, the cleaner's trolley.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a3-in | Jam the camera for each other. If it sees you, you start again. | Hold the jammer on the camera while your partner moves. | Move on the jam: the recess first, then the far lobby. | B in the east lobby (one-player pass flag) |
  | a3-swap | Swap: the far player jams now. | Move on your partner's jam: the recess, then the far lobby. | Jam the camera from the far lobby for your partner. | both in the east lobby (existing pass flag) |
  | a3-lock | Both of you into holding room three. | - | - | L3 cycled |

- **Target.** 1:30.

### A4 - Set 4, the Goods Shed (teach: the security room's camera loop; dual takedown). Tension 3
- **Mock-up.** A port warehouse with its security room. The security room (x 100-106, z 13-19, 3.0 m, the foreman's
  office) opens from L3 and, by a staff passage under the gallery (x 101-104, z 19-24), onto the goods floor (x 76-112,
  z 24-48, 7.5 m to the roof tie): wide-aisle pallet racking in rows east-west (5.4 m, `noLedge`, aisles 3.0-3.5 m), a
  pick-floor mezzanine along the north wall at 3.3 m (chequer plate, stairs at both ends), the dark glazed dispatch
  office and the dock wicket at the west end (x 76, z 30-36) to L4.
- **Footprint.** Security room 6 x 6; floor 36 x 24.
- **Entry / exit.** L3 into the security room; the dock wicket (push-bar, `egress` from the floor side) to L4
  (70-76, 30-36).
- **Exercise 1, security room (CR-S30, E3).** One player takes the duty officer from behind (seated at the monitors,
  back to the door). Interrogation lines: "The console loops the floor cameras. Sixty seconds, then they reboot." and
  "Those two at the dock only split when the kettle boils." The other uses the console (refused while the officer is
  up, as today) and loops C1-C3 for 60 s (N3), shown on the monitor wall and in the objective line. The console re-arms
  20 s after the loop ends (the security room is the route's one short return).
- **Exercise 2, timed crossing and dual takedown (CR-S28).** Cross about 40 m of the floor before the reboot; at the
  dock, A and B each come up behind one of the talking pair and take both inside 1.5 s (the existing dual takedown
  banner). If one acts early, the other man reacts.
- **Observe, then plan.** The monitor wall (render: the floor cameras' views) and the passage mouth show the floor, the
  cameras' grids and the dock pair before the console is touched.
- **Routes.** Fast: the main aisle (lit, needs the loop). Shadow: the south back aisle (a mixed-zone dark aisle: the
  bulk-store row's lights are on motion sensors, off tonight; crosses C2). High: the mezzanine (lit, loud floor, slow,
  out of C1). At the dock: dual takedown, wait for the kettle break (D2 leaves every 40 s) and take D1 alone, or switch
  the dock lights off in the dispatch office (the lure sends D1 to the switch). Loud: shoot C1-C3 (alarm, rating). Loop:
  the racking rows.
- **Guards (3).** `a4-officer` (duty officer: static post, seated, watching the monitors; isolated by design; info
  lines). `a4-dock1`, `a4-dock2` (dock loaders: a talking pair at the dispatch desk, covering each other; every 40 s D2
  walks 8 m to the kettle in the dispatch office and stops 5 s: the isolation moment for both). Lure: the dispatch office
  switch draws D1. Body: a body left at the desk is found by the returning D2. Hide spots: the dispatch office corner,
  the end bays of the racking.
- **Cameras (3).** C1 down the main aisle, C2 at the cross aisle and mezzanine stair, C3 over the wicket; all share
  `offFlag` `a4-loop` (N3 clears it after 60 s).
- **Lights.** Security room group 40 (switch by its door); floor high-bays group 41 (switch at the dispatch office
  door); racking aisle lights group 42 (switch at the west end); mezzanine group 43 (switch at the stair heads).
- **Surfaces.** Floor concrete (quiet); mezzanine chequer plate (loud).
- **Toys.** The console, three cameras, the dispatch switch, the kettle (the D2 clock), the wicket.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a4-room | Take the duty officer quietly, then loop the floor cameras from his desk. | Take the officer from behind while your partner waits. | Use the console once the officer is down. | `a4-loop` set |
  | a4-floor | The cameras are blind for sixty seconds. Cross to the dock. | Main aisle: move fast while the cameras are looped. | Back aisle or mezzanine: keep out of the lit rows. | both west of x 84 |
  | a4-dock | Two at the dock desk. Take one each, together, or wait for the kettle. | Take the man by the desk when your partner is set. | Take the man by the kettle when your partner is set. | both dock guards down, or both through the wicket |
  | a4-lock | Both of you into holding room four. There is a medkit there. | - | - | L4 cycled |

- **Target.** 2:15.

## 10. Timing table
TODO

## 11. Michael's list mapped
TODO

## 12. Co-op routes and plans
TODO

## 13. Mission and modes (objectives, rules, theme)
TODO

## 14. New code needed
TODO

## 15. Proposals for Michael (never applied)
TODO

## 16. What the rebuild keeps and breaks
TODO

## 17. 16.10 review answers
TODO

## 18. Element register
TODO

## 19. Engine questions for Phase 0
TODO

## 20. Phases
TODO

## 21. Future recommendations
TODO

## 22. Report format
TODO
