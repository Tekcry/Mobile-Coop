# Task: Marlow Yard - a luxury co-op training facility that rehearses real sites, one flowing 15-20 min run

Status: COMPLETE (spec writer, 2026-10-23)

## 0. Sources and authority
- Authority (G86): Michael (BRIEF M1-M6) > `docs/DECISIONS.md` > `docs/design-bible.md` > `docs/level-design.md`,
  `docs/templates/map-spec.md`, this spec > `CLAUDE.md` > code.
- Evidence merged here: `docs/marlow-final/BRIEF.md` (M1-M6, A1-A7), `AUDIT.md` (the yard as built), `COOP-INVENTORY.md`
  (mechanics, gaps, exercises E1-E12), `CONSTRAINTS.md` (checklist items 1-60, engine limits, tensions T1-T18),
  `ROUTE-DRAFT.md` (8 sets, 7 locks, timing; its route, exercises and timings are kept, its depot frame is replaced per
  M5 / M6), and Course Ready's second opinions on `origin/feature/marlow-bays` (f8a33a76) `docs/marlow-final-prep/`
  (copies in `C:/NightShift/scratch/course-ready/marlow-final/`) `MAP-AUDIT.md`, `DEVICE-INVENTORY.md`, `SCENARIOS.md`
  (its catalogue entries are written CR-S1..CR-S37 here so they do not clash with the old bay ids S1-S8).
- The orchestrator's co-op engine gap list (`C:/NightShift/scratch/marlow-coop-gaps.md`, copy `COOP-GAPS.md`; rows 1-9, written "gap 6b"
  here) is folded into sections 14-16 and 19.
- `KIT.md` (the architecture kit: built, 17/17 tests), `PROPS.md` (the set props, first batch built) and
  `LIGHTING-PLAN.md` (the per-set lamp lists and circuits, written in parallel by the lighting agent) carry the detail
  of sections 6 and 7. On a clash, this spec wins and the job lead reconciles the other file.
- `GREYBOX-HELPERS.md` and `src/world/maps/ctcourseGreybox.ts` (Course Ready's pure co-op greybox helpers, on this
  branch): the set builders' tools for every co-op piece (section 12).
- `PLAN.md` holds the slices, the files each owns, the parallel order and the checks.
- Michael's M6 (~00:45) sets the lighting: "lit, players cut it, but you can also use mixed zones if it ends up being a
  better result. In game levels are quite dark and not realistic". Gallery: "View only" (A5 holds). Guards: normal
  guards (A7 holds; a guard avatar is a later roadmap item, not this job).
- Engine numbers come from CONSTRAINTS section 2 (grep-confirmed 2026-10-23 on master af56ab43). Phase 0 re-greps them.
  `PROTOCOL_VERSION` is 29 (`src/net/protocol.ts:18`; MAP-AUDIT's "27" is stale).
- Changelog (spec writer, 2026-10-23 ~01:45, completing pass): status COMPLETE; sections 5-7 aligned with the built kit
  (1.8 m sliding doors, kit glass passes light, brushed steel and 3000 / 5000 K LEDs, LED read light vs accent lines);
  geometry clashes fixed in A3, A4, A5, A6, A7 and A8; per-player lines now use role claims; the gap list folded in
  (N1 / N3 rewritten, N9-N14 added, P17 glass, Course Ready's rule clashes resolved); LD 3.9 lit checkpoints added to
  the rule review; P2 / P4 point at `docs/archive/lighting-review/PROPOSAL.md` (Michael 01:40); Course Ready's greybox helpers
  adopted (A3 corridor 17.5 m, A6 gland plate 0.55 m and a 4.2 m cage under a 5 m bridge); a CONSTRAINTS checklist
  cover added to section 17; per-set file ownership for PLAN.md.
- Changelog (spec writer, ~02:15, engine-answers pass): ENGINE-ANSWERS Q1-13 folded in (P7 applied as A8
  `em.stealth = true`; per-set ambient zones; `em.despawn`; 4.1 caveat dropped; revive rule; glass stops sight, jam and
  bullets but passes baked light; A7 cage as lidded fence mesh, A8 grille closing rule; N4 without client noise for now;
  camera spaces per set; N6 done); CONSTRAINTS section 2 corrected.

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
- Map, tests, scripts, docs: `src/world/maps/ctcourse.ts` (the merge of the parts, the course def, the chain), the
  facility shell `src/world/maps/ctcourseSets/facility.ts` (outer and set-boundary walls, gallery, holding rooms) and
  one file per set (`ctcourseSets/a1Gate.ts`, `a2CarriageShed.ts`, `a3OfficeRange.ts`, `a4GoodsShed.ts`,
  `a5Substation.ts`, `a6PumpHouse.ts`, `a7DataHall.ts`, `a8Strongroom.ts`), the exported co-op lips constant, unit tests,
  `scripts/e2e-ctcourse.mjs` and the shot scripts. A set file builds only inside its set box (section 5); the walls on a
  box boundary belong to `facility.ts`. PLAN.md section 2 gives the set-part contract.
- New code only where an exercise cannot work without it (A3), each a basic prototype: section 14 (N1-N14). M4 asks for
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
3. Slices per PLAN.md: several at once, each agent in its own files (PLAN.md sections 2 and 5), one slice per agent.
   M2 ("plan, then build") removes the template's stops for Michael; the job lead's loop
   (implementer, fresh checker, at most 1 fix round per slice) replaces them (G87).
4. Each slice: run the checks PLAN.md names, report honestly with summary lines, update `docs/marlow-final/STATE.md`.
5. This spec is the build contract. Deviations go in STATE.md "Decisions" with the reason; a change to a route, a guard
   job or a set needs the job lead's OK and a line for Michael.
6. Changelog: one fragment `changes/feature-marlow-final.md` (G183), never `CHANGELOG.md`; never bump `package.json`.
7. Hyphens, never em dashes. British spelling in all game text. Text lines 90 characters or less (`COURSE_TEXT_MAX`).
8. Branch guard before every write; no `npm run dev` or watch modes from agents; heavy runs take `heavy.lock`; GPU work
   and the slice e2e tier go to Character Build on the laptop (CLAUDE.md "Sessions").
9. (Michael ~01:25, "Every map") No melee-only guards: every guard slot is an armed kind (`grunt`, `heavy`, `enforcer`,
   `officer`, `sniper`; never `runner`). Data only. Guard behaviour belongs to the Guard AI Build session: no edits in
   `src/ai/*` from this job; a needed AI change is reported to the job lead.
10. (Michael ~01:25, cameras "Keep IR everywhere") G240 stands: darkness beats guards and the meter, never cameras.
    Cameras are beaten by the jammer, a console loop or a shot only. Any proposal that assumes a dark camera is blind
    is rejected.

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
- **Services.** Power and lighting from the plant room (x 76-100, z 13-20, between A3 and the south gallery strip,
  closed to players: it is why A3's north wall has no gallery glazing); every set has its own
  lighting circuits on contactors the instructors can drive (the timed isolations are these contactors, honestly
  described). Air: ducted from the roof plant down the service corridors; no player ducts except where a set copies one.
- **The instructor gallery (A5, M6 "View only").** A glazed walkway at y 4.5 shaped like an H on plan:
  - south strip z 20-24 over x 0-112 (above the south service corridor), glazed into the south-row sets' north walls
    and the middle-row sets' south walls;
  - north strip z 48-52 over x 40-106 (stepping out to z 54 over A6, x 40-64, so it meets A6's south wall), glazed into
    the middle and north rows, ending in a glazed end bay that looks into A8 over its west wall;
  - the instructor bridge x 70-76, z 24-48 (the cross strip, above L4), with the control desk, the monitor wall and the
    lighting board in view of four sets.
  A3 (3.0 m office ceilings, the plant room behind) is the one set with no glazing; the bridge's monitor wall shows it.
  Players never enter the gallery (sight only). The glazing is the kit's glass (`kit.glass`, KIT.md 1): an invisible
  collide box with the panes drawn over it. It stops bodies, bullets, guard and camera sight and jam lines; baked lamp
  light passes it in the bake, the meter, the guards and the picture alike (G45's light rule), so parity holds; the
  sight rule differs from G45 for clear glass (proposal P17). A guard's torch is the one gap: the box blocks torch
  light for the meter while the picture shows the beam (ENGINE-ANSWERS Q7), so no guard carries a torch near glass. Gallery lamps are on the instructors' circuit (group 1, no switch: the instructors
  own it), small and dim (radius 3 m or less) so their spill reaches at most 1-2 m into a set; no planned dark pocket sits
  within 4 m of a gallery wall. The "instructors" are static dressing (chairs, lit screens; seated figures wait for a
  figure / avatar job, N14), never guards, so nothing behind the glass perceives.
- **Rooms** (sets are rooms of the facility; each copies a real site, section 9 gives sizes and contents):

  | Id | Facility room | Box (x0-x1, z0-z1) | Copies (real site, its purpose) |
  | --- | --- | --- | --- |
  | A1 | Set 1, the Gate | 0-22, 2-20 | A lorry gate and goods-yard boundary wall with a bolted wicket |
  | L1 | Holding room 1 | 22-28, 8-14 | - |
  | A2 | Set 2, the Carriage Shed | 28-70, 0-20 | A night freight siding with parked vans, a shunting neck, cleaning staging |
  | L2 | Holding room 2 | 70-76, 7-13 | - |
  | A3 | Set 3, the Office Range | 76-100, 0-13 | A commercial office corridor with a ceiling camera, three offices |
  | L3 | Holding room 3 | 100-106, 7-13 | - |
  | A4 | Set 4, the Goods Shed | security room 100-106.6, 13-19.6; staff passage 101-104, 19.6-24; floor 76-112, 24-48 | A port warehouse floor with its security room |
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
  | - | Service corridors, plant room | under the gallery; plant room 76-100, 13-20 | Closed to players (locked staff doors) |

- **Holding rooms (L1-L7).** The set crew's interlock lobbies between sets: 6 x 6 x 3.2 m (`validateCourse` 6 x 6 +-0.5),
  two motorised double sliding doors (1.8 m clear, `kit.slidingDoor`: the existing door logic with `leaf: 'slide'`; the
  kit takes 1.6-2.4 m, and a centred 1.8 m door leaves 2.1 m to each corner and the 0.9 m pockets), the pad, the
  checkpoint. A narrow clear-glass slot (`kit.glass`: stops sight, passes light) shows the next set's first 6 m; the
  briefing board
  is gone (M4: the objective list guides). The door behind locks for good: no backtracking. L4 and L7 have wall
  medkits. L7 holds a table-top scale model of A8 (the plan-ahead beat, LD 10.3).
- **Real dimensions.** Doors 1.2 x 2.1 (double 1.8 x 2.1; roller 3.0 x 3.0); corridors 3.5 m (A3's office corridor is
  widened from a real 1.8 m for two operators, T16); play spaces 6 m or more clear on the short side (boxes are wall
  centre lines, so the A4 security room and the A8 security office are drawn 6.6 m deep); at least 5 m of open floor
  between two doors on the route (scale sheet 5: lobbies open to their set by archways, not second doors); set ceilings 3.0 m for
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
   - Dark charcoal composite wall panels on the kit's 1.2 m module (`wallPanel`, `wallUpper` over 3.3 m) with 12 mm
     open joints; brushed steel dado, fascia and skirting trims (the kit's `metal`; a bronze tint is one row of
     `KIT_LOOK`, offered to Michael, not applied); polished dark concrete floors (quiet, `concrete`).
   - LED light in two kinds, both tied to a circuit so the picture never disagrees with the meter:
     - read light: `kit.ledSlot` ceiling slots with a light, one baked lamp per 2.4 m segment (`SLOT_SEGMENT`), warm
       3000 K in the shell and the sets' house runs, cool 5000 K in the holding rooms (`LED_TONES`). They are real
       fittings: in the bake, jammable, switched with their `group`;
     - accent lines: the wall panels' cove, skirting toe-kicks, column reveals and handrail lines light no surface and
       carry the `group` of the circuit they sit on, so they go dark when it does (KIT.md 3). An accent line with no
       group is allowed only on the instructors' circuit (group 1), which never goes off.
   - Motorised double sliding doors (`kit.slidingDoor`, 1.8 m, brushed frames with a green / red lock status bar) on
     every holding room and the lounge; set doors are whatever the copied site has.
   - The instructor gallery: floor-to-ceiling clear glazing (`glassClear`, 1.5 m panes with 50 mm brushed mullions and a
     frosted manifestation band), the kit `handrail` balustrade inside, a lit interior (warm slots, the
     `galleryConsole` desk run, `galleryScreen` monitors showing the sets, `galleryChair`s; LANTERN's chair on the
     bridge). Seated instructor figures wait for a figure / avatar job (N14); until then the chairs are empty and the
     screens are lit. It runs along the route so seven of the eight sets have it in view (H plan, section 5).
   - Signage: a small backlit set number and name at each set door ("SET 3 - OFFICE RANGE"), the facility logo
     (original: V&R monogram) in the lounge. No arrows, no waypoints (bible 6).
   - My suggestions for the luxury read (examples, M5 allows): a marble-look reception desk and leather lounge seats in
     the arrival lounge; a living green wall behind the reception desk; a glass-fronted kit room (wall of rifle and
     pistol cases) beside the lounge; the A8 scale model under a glass vitrine in L7; brushed handrails with an LED line
     on every facility stair; door status bars pulsing amber during a timed window (KIT.md 6, Future);
     the exit dock finished as a VIP debrief bay with a lit "ASSESSMENT COMPLETE" slot board.
2. **The sets** keep their own materials so each reads as a real site built inside a luxury hall (A6): brick and
   timber at the Gate, oily concrete, rail and ballast in the Carriage Shed, carpet tile and frosted partitions in the
   Office Range, painted steel racking in the Goods Shed, gravel bunds and transformer grey in the Substation, wet
   concrete and chequer plate in the Pump House, raised floor tiles and rack doors in the Data Hall, marble, oak
   counters and brass grilles in the Strongroom. Where a set stops short of the hall roof, the hall's charcoal panels
   and LED coves show above it, so the "set inside a studio" reads at a glance.

**What dresses what** (in-repo Blender `-b`, no external art; both kits are bundled GLBs drawn as thin instances):

| Need | Source | Piece / call |
| --- | --- | --- |
| Clad walls with LED cove, upper panels | KIT | `kit.wall(...)` (writes the collision box too) or `kit.wallPanel` on an existing face |
| Gallery glazing, holding-room glass slot, A3 office partitions | KIT | `kit.glass` (`glassClear`, `glassFrosted`) |
| Sliding doors (holding rooms, lounge) | KIT | `kit.slidingDoor` (`doorFrame`, `doorJamb`, `doorLeaf`) |
| LED read light and accent lines | KIT | `kit.ledSlot` (lit), cove / `skirting` / `column` / `handrail` lines (accent) |
| Column cladding, gallery balustrade | KIT | `kit.column`, `kit.handrail` |
| Set props (vans, racking, transformers, pumps, racks, counters, vault door, consoles, monitor walls) | PROPS | `facilityProps.ts` placements; the builder writes the listed collision box (PROPS.md 3) |
| Gallery interior, lounge furniture, L7 model vitrine | PROPS | `galleryConsole`, `galleryChair`, `galleryScreen`, `receptionDesk`, `loungeSeat`, `greenWall`, `modelVitrine`, `holdingBench` |
| Set signage plates ("SET 3 - OFFICE RANGE") | not built | KIT.md 6 suggestion; a later kit piece (Future); until then a lit `ledSlot` over a plain plate box |

Visual meshes sit on the level builder's collision (skins 4-60 mm proud; props at most 5 cm, never into the 0.3 m
capsule standoff). Props marked P (planned) in PROPS.md are built by the props generator as the set that needs them is
dressed; a missing prop never blocks a greybox.

**Perf.** Kit: at most 33 draws for the whole map and 60 k kit triangles per set (`kitTriangles`); props: at most
60 k triangles and 12 draws per set (PROPS.md 1). One GPU perf run and GPU shots per set via Character Build on the
laptop (PLAN.md); block only on broken (T18). Each lit slot segment is a baked lamp: count it in the 8-per-column cap.

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
  5 s jam is about 10 s dark), a shot lamp (loud, rating cost). Every exercise that needs dark says which circuit. A
  switch, an isolator or a shot lamp lures the nearest calm guard within 25 m; a jammed lamp lures nobody
  (ENGINE-ANSWERS Q2), so every planned lure uses a switch or an isolator.
- **Standby fill under the circuits.** Each set has an `ambientZone` at a standby level below the 0.28 shadow line
  (suggested 0.14, the level of real emergency and standby lighting), so a cut circuit gives true dark that the meter and
  the guards agree on (settles T6 as M6 directs). The lounge, holding rooms and exit dock keep G225's 0.30 fill (the
  theme level). Zones (ENGINE-ANSWERS Q3: a zone overrides the theme, the smallest containing zone wins, the bake, the
  meter, the guards and the picture read the same 1 m grid):
  - edges on whole metres, on the wall line between a set and its lounge or holding room (a cell takes the zone when its
    centre is inside, so 70.3 snaps to 70);
  - `minY` -1, `maxY` the set's ceiling or roof underside - 0.1;
  - every upper level (the gallery strips and bridge, A2 staging, A4 mezzanine, A6 motor gallery, A8 public gallery
    and security office) gets its own zone with `minY` = its floor - 0.5;
  - L4 sits under the instructor bridge: its zone (0.30) stops below the bridge floor, and the gallery's own zone sits
    above it.
- **Mixed zones** where they play better (M6): a set may keep permanent dark pockets that a real building has at night
  (the pump floor's far corners in A6, the A8 vestibule under the gallery, the dark goods-floor back aisle in A4, the
  cabin corner in A2). Each is named in its set sheet with its reason.
- **Every lamp** has an owner, a fitting and a switch where a real one would be, by a door, or a stated reason it has
  none (photocell, emergency circuit, the facility house circuit that the instructors own) (LD 5.1, 16.8.1). Every lamp
  in the yard has a light `group` (today's loops set none, gap 1), and every group that can change (a switch, an
  isolator, a mains gate, an exercise) is named in `course.groups`, because only those reach the client: a group left
  out would leave the client's lights, meter and picture out of step (DEVICE-INVENTORY 2.10). Adding or moving lamps
  changes the bake key (a rebake), so the lamp lists settle at each set's greybox.
- **Facility circuits.** Group 1: the instructors' gallery and bridge (never off). Group 2: the holding rooms and the
  exit dock (house circuit, no switch). Group 10 onward: per set, 10 x set + k (section 9).
- **Darkness is made with switches and isolators, not shots.** Shooting a lamp or a camera is host-only today (a
  client's shot lamp relights within 2 s, DEVICE-INVENTORY 2.2 / 2.10, gap list "Open risks"), so no exercise needs a
  shot; "loud: shoot it" routes are host-tested only until the Future fix (section 21).
- **Detail per set** (lamp positions, radii, the light-test spots): `LIGHTING-PLAN.md`, written to this section.
- **Cameras see in the dark (G240).** No exercise uses darkness against a camera (T7): cameras are beaten by a jam, the
  security console's loop (N3) or timing.
- **Engine limits.** At most 8 baked lamps reaching any 2 m column (`LAMP_GRID_SLOTS`); a lamp sees at most 4 doors
  (`DOORS_PER_LAMP`); 16 character shadow capsules, 4 per lamp. LED read light is `kit.ledSlot` at one lamp per 2.4 m
  segment with a modest radius in the sets (3-5 m; the kit's 7 m is a starting value) so the per-column cap holds; the
  builder runs `tests/lampGridLossless.test.ts` on the whole map at every slice end (gallery and holding-room lamps
  count in the set columns they reach). More strips also press the 48-light real pool (`MAX_REAL_LIGHTS`): the per-set
  GPU perf run watches frame time.
- **Restart restores lamps.** `resetLights` returns early when a layout has no `groups` (COOP-INVENTORY 0): fixed by
  giving the map groups and by N2's restore on a set restart, so a retry never starts darker than the first try.

**Rule review (M5 "review the rule if needed", M6).** The rules that assume a dark level, and what this spec does:

| Rule | Text (short) | Conflict with "lit, players cut it" | This spec |
| --- | --- | --- | --- |
| LD 3.1, bible L7 | Entry vantage is dark | Sets are lit by default | Vantage out of every guard's view by occlusion (a doorway, a van, a counter, a kerb), dark where a mixed zone allows; proposal P1 |
| LD 3.9 | Checkpoints are dark and out of view | Holding rooms are lit facility lobbies (0.30) | No guard can see into a holding room (doors shut, glass stops sight); lit is kept; proposal P1 |
| LD 3.5 | Darkness, cover or a hide spot every 4-8 m | Cover and hide spots still apply | Met with cover and hide spots; darkness only where made; no change needed |
| LD 5.1 | Every lit pool has a source and a switch by a door | None | Met (every pool on a switch or isolator) |
| LD 5.2 | Every lit chokepoint darkened two ways, avoided one | None | Met per set sheet |
| G225 | Open floor at 0.30 | 0.30 is above 0.28: a cut circuit would never be dark | Sets use a 0.14 standby fill; 0.30 stays in the lounge, holding rooms and dock; proposal P2 records it |
| LD 6.3 / bible 6 | No forced timers in stealth sections | Timed isolations | Device windows only, player-started, re-armable, never fail the run; proposal P3 |

Proposal P4 (section 15) asks Michael whether "lit by default, players make the dark" becomes a level-design rule for
every map (his "in game levels are quite dark and not realistic"; and 01:40, for all maps: "review lighting also, i
think the rules may be too strict and the levels are very dark and unrealistic. there shouldnt always be shadows, the
player may have to make shadows (disabling lights etc)"). The shared all-maps proposal is
`docs/archive/lighting-review/PROPOSAL.md` (the lighting agent). Nothing in the standard is changed by this spec: the map is
built to the "This spec" column and every row is a proposal.

## 8. Stealth verbs found in the building
| Verb | Real building element |
| --- | --- |
| Leg-up (co-op) | A1 goods-yard wall (4.4 m brick boundary wall); A2 carriage-cleaning staging deck edge (4.4); A6 motor gallery deck edge (4.4); A8 banking-hall gallery cornice (4.4) |
| Ledge relay (co-op) | The same four 4.4 m lips (the second player climbs the hanging partner) |
| Partner throw (co-op) | A5 cable gateway in the substation's inner security wall, guarded by IR beams (throw over the beams); A8 vault lobby inner beam curtain |
| Hang-down (co-op) | A6 cable gland plate in the motor-gallery bridge over the drive cabinet (0.55 m, too small to pass a body) |
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
client, and either player may take either job. Until a job is claimed, the lead (P1 in odd sets, P2 in even sets, the
course's swap rule `leadOf`) sees the A line and the other the B line; each set names a role claim (N1, gap 6b): the
first player to press the set's A device or step into its A zone takes A, and both players' lines follow that claim
until the set restarts. Each sheet's "Roles" row names the claim.

**Rules shared by every set (no loosening applied).**
- **Spotted by a role-player:** normal guard escalation (suspicious, alert, search, fight). Break line of sight and
  re-hide: every guarded set has a loop and hide spots (LD 3.4, 4.8, 9.1-9.2).
- **Camera or beam alarm:** the alarm stage rises (banner, LANTERN radio), as today; it never ends the run (G125).
  ROUTE-DRAFT's "an alarm resets the set" is proposal P5 (T5), not built unless Michael says yes.
- **Restart:** the existing set restart (both down 2 s, or pause "Restart at checkpoint") puts both in the set's entry
  holding room, respawns its role-players, re-arms its devices and restores its lamps (N2 fixes `resetLights`).
- **No strict rule.** Michael 2026-10-25 (folded plan Q5): "all are retries in marlow yard, as its a training
  exercise." Nothing in Marlow Yard fails the run or sends a player back: A2's spotted set restart (walk 4.82) and A3's
  camera corridor send-back become retries of that exercise in place; the Marlow Yard re-plan (folded plan J14) sets
  their shape.
- **Timed windows and drills** are player-started and shown on the device (lamp, sound) and in the objective line (N1).
  A drill may fail, to force the players into the situation it trains (G342); a failed drill resets in place and is
  retried, never a checkpoint reload (G361).
- **One forced route.** Michael 2026-10-25 (Q24): "Close all side routes, force all sections. Only keep a side route
  when training against enemies later in the training, same design rules as a campaign mission area". The per-set
  Routes rows below describe today's build; the re-plan (J14) closes every side route except in those late areas.
- **Strandings:** a thrown, boosted or lowered player always has a way back (a release, a push-bar door, a stair, the
  hang-down drop). No softlock (LD 11.4 intent).
- **Guards per set:** only as many as the set's move or mechanic needs, at most 3 (LD 4.9), spawned at the set's start
  (Course mode; `MAX_ALIVE` 12 for Marlow Yard, `docs/systems/performance.md`). Michael 2026-10-25 (Q11): "Only the
  logical amount required to test the specific movement/game mechanic required. Doesn't necessarily always need a
  guard." Every perceiving guard meets LD section 4: job, cycle 25-45 s, stops 3-6 s, an isolation moment,
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
- **Roles (claim).** A = the first player to crouch in the striped mark's zone (the booster); B = the boosted player.
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
- **Roles (claim).** A = the first player to press cabinet 1 (`a2-iso1`); B = the other.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a2-neck | Cut the neck lights and cross while the shunter checks. | Isolate the neck lights at cabinet one, then hide in the cabin corner. | Wait at the van ends, then cross the dark neck to cabinet two. | B east of x 56 |
  | a2-back | Now the other way round. | Cross behind the shunter while your partner isolates. | Isolate at cabinet two so your partner can cross. | both east of x 56 |
  | a2-lock | Both of you into holding room two. | - | - | L2 cycled |

- **Target.** 1:45.

### A3 - Set 3, the Office Range (teach: the timed jam relay). Tension 2
- **Mock-up.** A commercial office corridor at night: a west lobby (x 76-79.5), the corridor 3.5 m wide and 17.5 m long
  (x 79.5-97, z 9-12.5, widened from a real 1.8 m for two operators, T16; `jamRelay` in `ctcourseGreybox.ts` builds it,
  and 17.5 m keeps one recess because its `JAM_HOP` is 8.84 m), three offices on the south side (x 79-86,
  86-93, 93-100, z 0-8.7, 3.0 m ceilings) with frosted partitions (`kit.glass` frosted: stops sight, passes light, as
  G45 says for frosted glass) and communicating doors,
  one ceiling IR camera at the east end (x 96.6, y 2.8, z 10.75, facing west, narrow sweep), the office 2 door reveal at
  x 88.25 (1.0 m deep recess, the stepping stone, at the corridor's middle), the east lobby (x 97-100) under and behind
  the camera, and the door to L3.
- **Footprint.** 24 x 13 m, 3.0 m ceilings.
- **Entry / exit.** L2 into the west lobby; the east lobby to L3 (100-106, 7-13). Both lobbies open to the corridor by
  archways, not doors (scale sheet: 5 m between doors). The camera's range stops at the west archway (range 17 m, so
  the west lobby is out of its view; a unit test as today's "no airlock point seen").
- **Exercise E2 (CR-S13, kept from S3).** A jams from the west lobby (18 m, in range): 5 s held plus the 1.5 s reboot.
  B crouch-runs 8.75 m to the recess. A sits out the 5 s cooldown, jams again, B reaches the east lobby. Swap: B jams from
  the east lobby and A makes the same two hops. Four jams in all. A second jammer may join a jam (J3). Sync: the jam
  budget forces strict alternation.
- **Observe, then plan.** From the west lobby, through the archway, both see the camera, its red view grid (G222), the
  recess and the far lobby.
- **Routes.** Shadow: the corridor relay. Secret / alternative: the offices through the communicating doors, past the
  cleaner, one short jam at office 3's door (3 m from the east lobby). Loud: shoot the camera (alarm stage, rating).
  Loop: offices 1-2-3 and the corridor.
- **The corridor camera (a retry, Q5).** Today a player the camera fully spots in the corridor is sent back to the
  west lobby (`PassZone.hall`, `HALL_BACK_HOLD`), with a LANTERN line. It is no longer a strict rule: the re-plan (J14)
  makes it a retry of the corridor exercise in place.
- **Guards.** `a3-cleaner`: job, emptying bins office by office. Loop office 1 -> 2 -> 3 through the communicating
  doors, 5 s stop at each desk, cycle 35 s. Isolation moment: office 3's far desk (x 98, z 2), lit but unwatched. Lure:
  switching an office's lights off draws him to its switch. Body: offices are on his loop. Hide spots: the office 1
  desk-run recess (1.0 x 1.2), the trolley bay.
- **Lights.** Corridor panels group 30 (switch in the west lobby; lit); offices 31-33 (a switch by each office door);
  lobbies on the house circuit (group 34, no switch: facility circuit). The camera ignores light (G240).
- **Surfaces.** Carpet tile in the offices and vinyl in the corridor (quiet); lobbies polished concrete.
- **Toys.** The camera (jam, shoot), three office switches, communicating doors, the cleaner's trolley.
- **Roles (claim).** B = the first player into the corridor (zone x 79.5-97, z 9-12.5); A = the first jammer.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a3-in | Jam the camera for each other. If it sees you, you start again. | Hold the jammer on the camera while your partner moves. | Move on the jam: the recess first, then the far lobby. | B in the east lobby (one-player pass flag) |
  | a3-swap | Swap: the far player jams now. | Move on your partner's jam: the recess, then the far lobby. | Jam the camera from the far lobby for your partner. | both in the east lobby (existing pass flag) |
  | a3-lock | Both of you into holding room three. | - | - | L3 cycled |

- **Target.** 1:30.

### A4 - Set 4, the Goods Shed (teach: the security room's camera loop; dual takedown). Tension 3
- **Mock-up.** A port warehouse with its security room. The security room (x 100-106.6, z 13-19.6, 6.0 m clear, 3.0 m,
  the foreman's office) opens from L3 and, by a staff passage under the gallery (x 101-104, z 19.6-24, one door at the
  room end, open to the floor), onto the goods floor (x 76-112,
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
- **Roles (claim).** B = the first player to press the console (`a4-console`); A = the other (the officer's taker).
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a4-room | Take the duty officer quietly, then loop the floor cameras from his desk. | Take the officer from behind while your partner waits. | Use the console once the officer is down. | `a4-loop` set |
  | a4-floor | The cameras are blind for sixty seconds. Cross to the dock. | Main aisle: move fast while the cameras are looped. | Back aisle or mezzanine: keep out of the lit rows. | both west of x 84 |
  | a4-dock | Two at the dock desk. Take one each, together, or wait for the kettle. | Take the man by the desk when your partner is set. | Take the man by the kettle when your partner is set. | both through the wicket (the push-bar sets the flag) |
  | a4-lock | Both of you into holding room four. There is a medkit there. | - | - | L4 cycled |

- **Target.** 2:15.

### A5 - Set 5, the Substation (teach: the partner throw with a far-side release; combine: jam a light). Tension 3
- **Mock-up.** An urban grid substation, built indoors as a switchgear hall (real at city sites; no sky needed). The
  apron (x 58-70, z 24-48) inside the east door; an inner security wall at x 58 (0.3 m, to the set ceiling, no lip) with
  a 6 m cable gateway (z 33-39), left open for tonight's cable-drum delivery and guarded by three IR beams (0.35 / 0.9 /
  1.45 m) between two beam towers, header 4.8 m; on the apron, the delivered cable drums stacked at x 60-63, z 29-33
  (1.8 m, cover; the throw is made from beside them); the inner zone (x 40-58): two transformer pens (3.5 m units,
  `noLedge`, in 1.2 m bunds, low cover; pen 1 x 42-48, z 25-30 in the south-west, pen 2 x 50-56, z 40-46 just north of
  the gateway, its transformer shading the landing), the switchroom (x 40-46, z 36-48, 4 m) on the west wall with a
  floodlight on its south face lighting the 8 m in front of the zone control kiosk (the release, x 47, z 33), and the
  beam towers' power panel high on the switchroom's south face (jammable, existing laser panel, shown in electro).
- **Footprint.** 30 x 24 m, 6 m set ceiling.
- **Entry / exit.** L4 (west door at x 70) onto the apron; L5 (50-56, 48-54) in the inner zone's north wall.
- **Exercise E6 + E4 (CR-S3, CR-S15).** A stands at the gateway beside the drum stack (x 59.5) and throws B over the
  beams; B lands 3.2 m past, at about x 56, z 38, in the dark pocket in pen 2's shadow (mixed zone: the transformer
  screens the floodlight; no lamp reaches it). B must then cross
  the floodlit 8 m in front of the kiosk: A jams the floodlight through the gateway (5 s held plus 4 s off). B keys the
  kiosk (the release: the beams off for good, `offFlag`) and A walks through. Sync: the thrower is stranded until the
  release; the floodlight jam covers the runner.
- **Observe, then plan.** From behind the drum stack (occluded from the patrol by the drums and the gateway's south
  pier) both see the beams (night vision), the kiosk across the gateway, the floodlit strip and the patrol's loop.
- **Routes.** Throw and release (taught). Jam the beam towers' panel (6.5 s window) so one walks through, then keys the
  kiosk for the jammer. Cross the floodlight in the patrol's gap instead of jamming. Loud: walk the beams (alarm stage).
  Loop: round pen 1 (both ends open). Secret: behind the switchroom (a 1.2 m cable trench edge path, z 46-48).
- **Guards.** `a5-patrol`: job, substation security walking the inner zone. Loop kiosk -> pen 1 -> switchroom door ->
  gateway -> kiosk; 4 s stop at the kiosk reading the log; cycle 34 s. Isolation moment: behind pen 1 (x 41, z 27,
  between the pen and the west wall), dark. Lure: the inner zone switch (group 51) draws him to the switchroom door.
  Body: the kiosk is on his loop. Hide spots: the pen 2 bund corner, the trench edge, the drum stack (apron).
- **Lights.** Apron group 50 (switch at the L4 door); inner zone general group 51 (switch inside the switchroom door);
  floodlight group 52 (photocell: jam or shoot only); kiosk lamp group 53 (no switch: the kiosk's own panel light,
  emergency circuit). Chokepoint (the kiosk strip): darkened by the jam or by shooting the flood; avoided by timing.
- **Surfaces.** Gravel in the bunds (loud), concrete apron and inner zone (quiet).
- **Toys.** The floodlight (jam, shoot), the inner switch, the beam panel, the kiosk, the switchroom door.
- **Devices.** Laser `laser-a5` (3 beams, `offFlag` `a5-release`), panel `panel-a5`, pickup gate `g-a5-release` at the
  kiosk; the L5 near door is a `flag` gate on `a5-release` (fixes the old S4 skip: no walking through the beams to the
  pad).
- **Roles (claim).** B = the first player into the inner zone (x 40-58): the thrown player.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a5-throw | Throw one of you over the beams. The release is at the kiosk. | Stand by the drums at the gateway and throw your partner over. | Land in the dark behind the transformer and wait for the jam. | B west of x 57 |
  | a5-kiosk | Kill the floodlight so the kiosk can be reached unseen. | Jam the floodlight through the gateway for your partner. | Cross under the jam and key the release at the kiosk. | `a5-release` set |
  | a5-lock | Beams are off. Both of you into holding room five. | - | - | L5 cycled |

- **Target.** 1:45.

### A6 - Set 6, the Pump House (teach: the hang-down; the rope once, untimed). Tension 3
- **Mock-up.** A tidal-barrier pumping station: the pump floor (y 0) with three vertical pumps on 1.2 m plinths (low
  cover) in a row at z 61 (pump 1 x 60, pump 2 x 56, pump 3 x 45); the old sump bay inside the L5 door (x 48-58,
  z 54-58) behind a 1.2 m guard kerb; the motor gallery (2.4 m wide along the north wall, z 69.6-72, deck edge 4.4 m) with a bridge over the drive
  bay (x 49-54, z 62-72, deck 4.4, 5 m wide so it spans the cage); the staff stair at the lit east end by the
  attendant's desk (rise 0.165, run 0.285, handrails); the drive cage under the bridge's south end (4.2 x 4.2 m,
  x 49.4-53.6, z 62-66.2, so the panel is out of reach from outside; mesh 2.4 m with solid 1.2 m kick panels, push-bar
  door), with a 0.55 m cable gland plate in the bridge deck directly over the drive cabinet (under a body's width: the
  hang-down only; `hangPlate` in `ctcourseGreybox.ts` builds it and throws if it is not); the
  outfall door on the east wall (x 64, z 59-65 to L6), interlocked shut while the duty pump runs (a real interlock,
  shown by a red lamp).
- **Footprint.** 24 x 18 m, 9 m high.
- **Entry / exit.** L5 into the dark sump bay (mixed zone: the high-bay over the old sump is tagged out); the outfall
  door to L6 (64-70, 59-65).
- **Exercise 1, rope (CR-S7).** A boosts B onto the gallery at its dark west end; B takes the rescue line from the
  gallery's davit box (confined-space kit, real in wet-well stations) and drops it; A climbs (existing two-person rope,
  G180). The ledge relay also works there (a second tool, LD 7.1). Untimed; the west end is screened from the pump
  floor by pump 3's 4.0 m motor column and the gallery's 1.2 m kick plate (P8: guards see straight up) and is dark.
- **Exercise 2, hang-down hack (CR-S10, E9).** A crouches at the gland plate and lowers B head-first into the cage; B
  holds the drive panel's isolate key (hold 3 s, N4; the panel's buzzer is heard by the players, and reaches guards only once N4's client pulse lands) while the attendant is
  at the far pump; A watches his loop and pulls B up if he turns back. The pump runs down (the noise drops), the
  interlock lamp turns green, the outfall door unlocks (`flag` gate). Both leave by the staff stair.
- **Observe, then plan.** Crouched behind the sump kerb (dark, out of view) both see the attendant's loop within one
  cycle, the cage, the
  gland plate's yellow lifting-point sign on the bridge (the tell is visible from below) and the outfall door's red
  interlock lamp.
- **Routes.** Up: rope / relay at the dark west end (shadow), or the staff stair at the lit east end timed on the
  attendant's desk stop (risky). Then the hang-down, the only way to the drive. If B is seen hanging or the holder lets
  go, B drops into the cage, finishes the hold from the floor (the cabinet is in reach) and leaves by the push-bar door
  (no stranding). Loop: round the three pumps.
- **Guards.** `a6-attendant`: job, reading pump gauges. Loop desk (x 62, z 68) -> pump 1 -> pump 2 -> pump 3 (far,
  x 45, z 61) -> desk; 4 s stop at each gauge, facing it; cycle 32 s; he passes the cage side-on. Isolation moment: at
  pump 3 (the dim west end, unwatched). Lure: the gallery switch (group 61) draws him to the stair foot. Body: the pump floor is his loop. Hide
  spots: behind pump 3's plinth, the cage's kick-panel corner.
- **Lights.** Pump floor high-bays group 60 (switch by the outfall door); gallery strip group 61 (switch at the stair
  head); attendant's desk lamp group 62 (switch on the desk); cage lamp group 63 (on the drive panel's own circuit, no
  switch: it is the panel's work light). The west end is dark by design (the tagged-out high-bay).
- **Surfaces.** Wet concrete pump floor (quiet), gallery and bridge chequer plate (loud: drop from the hang is quieter
  than walking the bridge).
- **Toys.** The gallery switch, the desk lamp, the high-bays (jam, shoot), the cage door, the gland plate.
- **Roles (claim).** B = the first player onto the motor gallery (zone y > 4): later the hanger; A = the holder.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a6-up | Get both of you onto the motor gallery at the dark west end. | Boost your partner up, then climb the rescue line. | Drop the rescue line from the davit box for your partner. | both on the gallery (y > 4) |
  | a6-hang | Lower one of you through the gland plate to the drive panel. | Hold your partner over the drive cabinet. Watch the attendant. | Hold the isolate key on the drive panel while he is away. | `a6-drive` set |
  | a6-lock | The interlock is green. Out by the outfall door. | - | - | L6 cycled |

- **Target.** 2:00.

### A7 - Set 7, the Data Hall (teach: split paths and a synced hack). Tension 4
- **Mock-up.** A colocation data hall (Mission 1's kind of site): racks 2.2 m in rows east-west (`noLedge`), aisles
  3.0 m, 4.0 m slab; the target cage (10 x 6 m mesh, 2.4 m, x 86-96, z 60-66) with dual-control terminals T1 on its
  west face (in the hall) and T2 on its east face (inside the hot-aisle containment pod, x 96-100, z 56-68, reached
  from the plant corridor's east end by the pod's south door: real pods have doors at their ends); the cage has a door
  on each of those faces, both on the dual control; the plant corridor 3.5 m wide along the south side (z 52-55.5) with
  2.0 m cooling units (`noLedge`) and a 6 m grating over the cable trench (loud); the entry lobby at the west end
  (x 70-76, 6 m deep so its doors keep 5 m apart) with a glazed door into the hall and one into the plant corridor, and
  the fire plan on the wall.
- **Footprint.** 30 x 20 m.
- **Entry / exit.** L6 into the lobby; out by the pod's east door (`A7-east`, x 100, z 59.1-60.9, maglocked until the
  cage's dual control opens, `flag`) to L7 (100-106, 57-63). The sync also opens both cage doors, so the hall player
  walks through the cage into the pod and both leave together.
- **Exercise E11 (CR-S20, CR-S34).** A takes the hall: the technician's round plus the fixed north-east camera. B takes
  the plant corridor: the grating (silent crouch, slow) plus the sweeping camera at its east door. Each path is about
  45 s. At the cage, each terminal's ready lamp is visible to the other through the mesh. Both hack (2 s) and finish
  inside 1.5 s of each other (the existing paired scanners, G131, G193). Sync: the hack.
- **Observe, then plan.** Both glazed lobby doors and the fire plan show both routes, both terminals and the cameras.
- **Routes.** Either player takes either path. Hall: north or south aisles (loop round the rows). Plant corridor: slow
  and silent or fast and loud on the grating. Jam either camera (each player alone, still): the solo stealth test.
- **Guards.** `a7-tech`: job, a data-hall technician on his rounds. Loop along the aisles west -> east -> back by the
  south aisle; 5 s stop at the cage reading a rack screen; cycle 40 s. Isolation moment: the south aisle's west end.
  Lure: the aisle lights (group 71) draw him to their switch. Body: the cage front is on his loop. Hide spots: the end
  of each rack row, the lobby's coat bay.
- **Cameras (2).** `a7-cam1` fixed at the hall's north-east corner over T1's approach; `a7-cam2` sweeping at the
  plant corridor's east door.
- **Lights.** Hall rack-row lights group 70 (switch in the lobby); aisle end lights 71 (switch at the south aisle's
  west end); plant corridor group 72 (switch at its west door); pod lights 73 (no switch: on the cage's own control,
  stated reason).
- **Surfaces.** Raised floor tiles (quiet), the trench grating (loud).
- **Toys.** Two cameras (jam, shoot), three switches, the grating (a loud and a quiet way across), the lobby doors.
- **Devices.** Scanner pair `sc-a7` (`a7-t1`, `a7-t2`, flag `a7-sync`) on the cage; `flag` gates on `A7-cage-w`,
  `A7-cage-e` and `A7-east`; one-player pass zone `a7-pod` (flag `a7-pod`) in the pod.
- **Cage build (ENGINE-ANSWERS Q8).** The mesh runs are `b.fence` (sight, the ready lamps and the jam line pass the
  mesh; bodies and guards on foot do not), over solid 1.2 m kick-panel boxes (no planned jam or sight through the kick
  band); a fence is climbable, so the cage gets a mesh lid (a `noLedge` box at 2.4 m, real colocation cages are
  roofed) and its fence anchors are locked by an `anchorLock` gate that never opens. Cage doors are doors (opaque while
  shut). The A6 drive cage is different: `hangPlate` builds it from collide boxes under the bridge (no jam or sight
  through it is planned).
- **Roles (claim).** B = the first player into the plant corridor (z 52-55.5); A = the hall player.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a7-split | Split up: one through the hall, one through the plant corridor. | Hall route: slip past the technician's round to terminal one. | Plant corridor: quiet on the grating, past the camera, to terminal two. | B in the pod (`a7-pod`, one-player pass zone) |
  | a7-sync | Hack both terminals together. Start on the ready lamps. | Hack terminal one on your partner's count. | Hack terminal two on your partner's count. | `a7-sync` set |
  | a7-lock | The cage and the east door are open. Both of you into holding room seven. | - | - | L7 cycled |

- **Target.** 1:50.

### A8 - Set 8, the Strongroom (graduation: everything, in sync). Tension 5
- **Mock-up.** A Victorian bank's banking hall, security office and vault (the old town's private vault company kind of
  site). Banking hall x 106-134, z 50-78 (9 m, chandeliers), 1.2 m oak counters (low cover), the night desk at the lit
  front; the public gallery along the north wall (3 m deep, deck edge and cornice at 4.4 m, z 75-78) and returning down
  the west wall (x 106-109, z 56-78) over the vestibule, with the public stair at the lit front by the night desk; the
  security office (x 134-142, z 71.4-78, 6.0 m clear, 3.0 m) at gallery level at the gallery's east end, with its own
  stair (x 142-145, z 68-77, one straight flight down south) into the vault lobby (its door opens only from the office
  side); the vault
  lobby (x 134-146, z 56-68, 5.5 m, room for the throw's arc) behind the public grille (3 m bars at x 134, maglocked
  fail-safe on the hall's night circuit: the lights and the grille share one isolator), an inner beam curtain at x 140,
  time-lock panels T1 (outer zone, north wall) and T2 (inner zone beside the vault door), 13.6 m apart; the vault
  (x 146-150, z 58-66; its back is open to the dock, a loading bay with no second door) and the cash dock (x 150-160,
  z 58-66, the exit zone).
- **Footprint.** 44 x 28 m.
- **Entry / exit.** L7 into the vestibule at the hall's west end (mixed zone: under the gallery's return, no fitting).
  Exit: through the vault to the cash dock; both in the exit zone end the course (G138).
- **The model.** L7's vitrine holds a scale model of this set, so the pair plans before entering (LD 10.3), with a
  wall medkit: the rest beat before the finale.
- **Sequence (ROUTE A8, CR-S17, CR-S26, CR-S28, CR-S20).**
  1. **Split.** B boosts A onto the gallery's return at the dark west end and stays on the floor (leg-up).
  2. **Cross-level jam.** Crouched behind the counters (low cover, out of N1's sweep), B jams C2 (about 15 m) while A covers
     the gallery's last 10 m to the security office door (jammer timer).
  3. **Security office.** A takes the duty officer and loops C1-C3 for 60 s (N3). The loop shows on the monitor wall and
     in the objective line.
  4. **Timed light and lock isolation.** B isolates the hall circuit at the lighting board under the gallery: 25 s
     dark (N2), and the grille, on the same circuit, opens (existing `mains` gate). N1 walks to the board (lure); B hides
     or takes him there. B slips through the grille. A comes down the office stair into the lobby.
  5. **Throw.** A throws B over the inner beam curtain.
  6. **Sync.** A at T1 and B at T2 hack together inside 1.5 s, on the ready lamps (second scanner pair, N6), before the
     loop ends and between N2's visits to the grille. The vault opens, the beams drop with the time lock, and both walk
     out to the cash dock.
- **Routes.** Ghost: time N1 and N2, no takedowns. Clear the hall: a dual takedown when N2 stops at N1's desk (B takes
  N1 from behind the counters while A drops from the gallery onto N2, the existing drop takedown, inside 1.5 s). Loud:
  shoot C2 or the hall lamps (alarm, rating). Gallery: the boost or the public stair (timed on N1). Loop: round the
  counters.
- **Fail and retry (escalation).** The loop ends: C3 returns; a hack in its view raises the alarm stage; A loops again
  (the office stair, 10 m; console re-arms after 20 s). The lights restore: the grille relocks; isolate again, or the
  player inside opens it with the request-to-exit button (existing `egress`). A failed sync: as A7 (10 HP, G193).
- **Guards (3).** `a8-night1` (N1: the night desk clerk, static post, sweeping the front, 6 s head turns). `a8-night2`
  (N2: the hall patrol, 40 s loop hall -> grille, 5 s stop at the grille, 5 s talk at N1's desk).
- **The grille (ENGINE-ANSWERS Q8, Q9).** Built as a maglocked sliding or swing door on the `mains` gate: while shut it
  is opaque to jam, sight and lamp light (no see-through leaf exists), so no planned jam or sight line passes the shut
  grille; the vault lobby's lamps and panel lamps are seen once it opens. The relock never shuts the door: it only
  stops it opening. Nobody closes it automatically: the player who goes through closes it behind him (door menu) or
  leaves it open, and then N2, who stops at the grille, sees into the lobby (a choice with a cost). A calm guard who
  opened a door shuts it 1.5 s after it is clear; slice 0a adds the remote players to `StealthSystems.occupied` so that
  never shuts a door onto the client.
  `a8-officer` (the security office duty officer, seated, static, info lines). Isolation moments: N1 at the lighting
  board when lured; N2 at the grille; the officer alone by design. Lure: the board (lights out) draws N1. Body: N2's
  loop crosses the counters. Hide spots: behind the counters' ends, the vestibule.
- **Cameras (3).** C1 over the hall floor, C2 on the east wall watching the last 10 m of the gallery, C3 in the vault
  lobby covering both panels; shared `offFlag` `a8-loop`.
- **Lights.** Hall chandeliers and counter lamps group 81 (the night circuit: the lighting board isolator, N2 25 s;
  the grille's `mains` gate reads it); gallery wall lights group 82 (switch at the public stair head); security office
  group 83 (switch by its door); vault lobby group 84 (on the time lock's circuit, no switch); vestibule dark by design.
- **Surfaces.** Marble hall floor (loud at a run, quiet crouched: `tile`), gallery oak boards (quiet), lobby steel
  plate (loud).
- **Toys.** The board, the gallery switch, the chandeliers (jam, shoot), three cameras, the grille, the office stair.
- **Roles (claim).** A = the first player onto the public gallery (zone y > 4); B = the floor player.
- **Objective lines.**

  | Step | Shared | A | B | Done when |
  | --- | --- | --- | --- | --- |
  | a8-split | Split up: one onto the gallery, one stays on the floor. | Take the boost to the gallery at the dark west end. | Boost your partner up, then keep to the counters. | A on the gallery |
  | a8-office | Get to the security office unseen and loop the cameras. | Reach the office on your partner's jam, then take the officer. | Jam the gallery camera from the floor for your partner. | `a8-loop` set |
  | a8-grille | Kill the hall lights to open the grille. Sixty seconds on the loop. | Come down the office stair into the vault lobby. | Isolate the hall lights at the board, then slip through the grille. | both in the vault lobby |
  | a8-beams | Over the beam curtain to the second time lock. | Throw your partner over the beams. | Land by the vault door and take time lock two. | B east of x 140 |
  | a8-sync | Both time locks together, on the ready lamps. | Hack time lock one on your partner's count. | Hack time lock two on your partner's count. | `a8-sync` set |
  | a8-out | The vault is open. Both of you out to the cash dock. | - | - | both in the exit zone |

- **Target.** 3:30.

### Route summary
| Set | Teaches | Combines | Guards | Cameras | Tension |
| --- | --- | --- | --- | --- | --- |
| A1 Gate | Leg-up, ledge relay, bolt | - | 1 passive | 0 | 1 |
| A2 Carriage Shed | Timed light isolation (lure comes with it) | Leg-up (staging) | 1 | 0 | 2 |
| A3 Office Range | Timed jam relay | One guard (offices route) | 1 | 1 | 2 |
| A4 Goods Shed | Security room camera loop, dual takedown | Jam fallback, light lure | 3 | 3 | 3 |
| A5 Substation | Partner throw with release | Jam a light, patrol timing | 1 | 0 | 3 |
| A6 Pump House | Hang-down (+ rope once) | Leg-up, patrol timing | 1 | 0 | 3 |
| A7 Data Hall | Split paths and sync hack | Solo stealth, cameras | 1 | 2 | 4 |
| A8 Strongroom | Graduation | Everything, under two windows | 3 | 3 | 5 |
| **Total** | | | **12 (11 perceiving)** | **9 of 12** | |

Releases after peaks: L4 (medkit) after A4, L7 (the model room, medkit, 30 s rest) before A8; every holding room is tension 1.

Plan (ASCII, not to scale, north up):

```
 z 78 |                                                   +--------A8 STRONGROOM---------+
      |  north strip (gallery y 4.5) x 40-106             | gallery 4.4 N   sec.office NE |
 z 72 |           +---A6 PUMP---+  +----A7 DATA HALL----+ |                               |--+
      |           | gallery N   |L6| lobby W  cage  pod  |L7 hall           vault lobby  |EX|
 z 54 |           +-----L5------+  +--plant corridor S--+ +-------------------------------+--+
 z 48 |  ====================================== north strip ========
      |           +--A5 SUBSTATION--+  B  +------A4 GOODS SHED------+
      |           | inner | beams|ap|L4 R | dock      racking        |
 z 24 |           +-----------------+  I  +-----------------------SR-+
 z 20 | ===================== south strip (gallery y 4.5) x 0-112 ============
      | +-A1 GATE-+  +----A2 CARRIAGE SHED----+  +-A3 OFFICES-+
      | |lounge wall|L1| rakes  neck   rakes   |L2| corridor  cam|L3
 z  0 | +---------+  +------------------------+  +------------+
        x 0         x 28                         x 76        x 100      x 150 x 160
 BRI = the instructor bridge (x 70-76, z 24-48, over L4). SR = security room (x 100-106, z 13-19).
 Route: lounge -> A1 -> L1 -> A2 -> L2 -> A3 -> L3 -> SR -> A4 floor (E to W) -> L4 -> A5 (E to W) -> L5 -> A6 ->
        L6 -> A7 (W to E) -> L7 -> A8 (W to E) -> cash dock.
```

## 10. Timing table
First co-op run, a pair who know the controls, no deaths (A2). Min = clean and quick; Max = one failed attempt or one
restart in that set. From ROUTE-DRAFT section 4 (walk speeds from `GEARS`: about 1.5 m/s on stealth ground, 2.1 m/s in
holding rooms).

| Step | Walk (m) | Min | Target | Max | Cumulative target |
| --- | --- | --- | --- | --- | --- |
| Start in the arrival lounge | 0 | 0:15 | 0:30 | 0:45 | 0:30 |
| A1 Gate | 25 | 0:40 | 1:10 | 2:00 | 1:40 |
| L1 | 8 | 0:08 | 0:12 | 0:20 | 1:52 |
| A2 Carriage Shed | 55 | 1:00 | 1:45 | 3:00 | 3:37 |
| L2 | 8 | 0:08 | 0:12 | 0:20 | 3:49 |
| A3 Office Range | 35 | 0:50 | 1:30 | 2:30 | 5:19 |
| L3 | 8 | 0:08 | 0:12 | 0:20 | 5:31 |
| A4 Goods Shed (security room + floor) | 55 | 1:20 | 2:15 | 3:30 | 7:46 |
| L4 (medkit) | 8 | 0:08 | 0:12 | 0:20 | 7:58 |
| A5 Substation | 45 | 1:00 | 1:45 | 3:00 | 9:43 |
| L5 | 8 | 0:08 | 0:12 | 0:20 | 9:55 |
| A6 Pump House | 50 | 1:10 | 2:00 | 3:15 | 11:55 |
| L6 | 8 | 0:08 | 0:12 | 0:20 | 12:07 |
| A7 Data Hall | 45 | 1:10 | 1:50 | 3:00 | 13:57 |
| L7 (model, medkit, rest) | 8 | 0:15 | 0:30 | 0:45 | 14:27 |
| A8 Strongroom | 70 | 2:15 | 3:30 | 5:30 | 17:57 |
| Cash dock | 10 | 0:05 | 0:10 | 0:15 | 18:07 |
| **Total** | **~446 m** | **~10:48** | **~18:07** | **~29:30** | |

- M3's 15-20 min holds at the target column (a retry in two or three sets). Practised pairs run about 11 min.
- If Michael's first walk runs long: fold A3's relay into the A4 approach (saves about 1:40), or drop A2's staging.
  If it runs short: add the A2 second isolation pass or A6's staff-stair timing as required steps.
- Co-op spacing: a co-op beat about every minute (denser than CT's 2-3 min, on purpose for a training course); set
  pieces at about 6-8 min (A4), 13-14 min (A7) and 15-18 min (A8); no player idle over about 30 s (each waiting player
  has a live job: jam, hold, watch, isolate).
- Dead time: seven holding rooms at about 12 s each (1.4 min), down from about 1.5-2 min of identical airlocks plus
  8 empty back halves today.

## 11. Michael's list mapped
Michael's words (BRIEF): "timed isolation of lights, cameras, locks, accessing security room to disable cameras, timed
jammer exercises, hacking devices in sync, and any other coop "wow thats cool" experience".

| Michael's item | Where | How | Device |
| --- | --- | --- | --- |
| Timed isolation of lights | A2 (taught), A8 (combined) | A2: two-way neck isolators, 15 s dark, lure; A8: the hall night circuit, 25 s dark | N2 timed isolator (new), `lightsOut` lure (exists) |
| Timed isolation of cameras | A4 (taught), A8 | The security console loops a camera set for 60 s, re-arms 20 s after | N3 timed console (new) |
| Timed isolation of locks | A8 (grille opens while the hall lights are off), A6 (interlocked outfall door), A7 (maglocked east door on the dual control) | The grille is a `mains` gate on the isolated circuit, so the light window is also the lock window; N5 for a plain timed release where a set wants one | `mains` (exists); N5 not needed |
| Accessing the security room to disable cameras | A4 (taught), A8 (combined) | Take the duty officer, use his console | `SecurityConsole` (exists) + N3 |
| Timed jammer exercises | A3 (taught), A5 (floodlight), A7 (solo, each path), A8 (cross-level jam) | The 5 s hold, 5 s cooldown and 1.5 s reboot force the relay | Held jammer (exists) |
| Hacking devices in sync | A7 (taught), A8 (finale) | Paired terminals inside 1.5 s, ready lamps | Paired scanners (exist; a second pair is N6) |
| Other co-op "wow" | A1 leg-up and bolt; A2 "kill the lights, I'll cross"; A4 dual takedown at the dock; A5 throw over the beams into the dark; A6 upside-down hack under a live patrol; A8 split levels, jam for the partner, the two-timer finale | | Team moves (exist), dual takedown banner (exists) |

Not used (not built, Future): living key, throw-landing knockout, hang-down neck-snap, joint interrogation, operator and
spotter, wire cut (section 21).

## 12. Co-op routes and plans
Under G253 (co-op only) and G180 (the CT verb set: leg-up, ledge relay, partner throw, hang-down, two-person rope,
revive; jammer handoff, paired hacks) the template's "solo route to the same surface" is dropped (T1, T13: a doc fix,
not a loosening).

| Id | Where | CT verbs | Why one player cannot | Way back for a lone or downed player |
| --- | --- | --- | --- | --- |
| C1 | A1 wall, 4.4 m lip | Leg-up, relay, bolt | Lip 0.6 m over solo reach (3.8), wicket bolted on the far side | The wicket (unbolted from the yard side); the yard is ground level |
| C2 | A2 neck | Timed isolation relay | The isolator is 26 m by route from far cover; the window is 15 s | Both rakes are ground level; the cabinets re-arm |
| C3 | A2 staging, 4.4 m lip | Leg-up, relay | Lip out of solo reach; the west stair is locked | The east stair |
| C4 | A3 corridor | Jam relay | A jam needs the jammer standing still; nobody jams himself across | The corridor retry returns that player to the lobby, the partner keeps his place |
| C5 | A4 security room + dock | Takedown + console; dual takedown | The talking pair covers each other; the loop helps both | The wicket is egress from the floor side; the security room stays open |
| C6 | A5 gateway | Partner throw, light jam, release | The beams cover the full 6 m gap; the release is on the far side | The kiosk release frees the thrower; the L5 door needs the release |
| C7 | A6 gallery, 4.4 m lip | Leg-up, two-person rope (or relay) | Lip out of solo reach | The staff stair at the east end |
| C8 | A6 gland plate | Hang-down | The plate is too small for a body; the cabinet is inside a locked cage | A dropped hanger finishes the hold from the cage floor and leaves by the push-bar door |
| C9 | A7 cage | Paired hack (split paths) | Terminals 10 m apart with the cage between, inside 1.5 s | Both paths are ground level and open both ways |
| C10 | A8 gallery, grille, beams, time locks | Leg-up, jam, console, isolation, throw, paired hack | Every step has two bodies in two places (gallery and floor, outer and inner zone) | The public stair (gallery), the office stair, the grille's request-to-exit, the beams drop with the time lock |

- **Greybox helpers.** Every co-op piece is built with Course Ready's pure helpers in
  `src/world/maps/ctcourseGreybox.ts` (`GREYBOX-HELPERS.md`): `boostWall` (A1 wall), `coopDeck` (A2 staging, A6
  gallery with the rope, A8 gallery), `throwGateway` (A5 gateway, A8 beam curtain), `hangPlate` (A6 bridge and cage),
  `syncStation` (A7 cage, A8 time locks), `jamRelay` (A3 corridor), written with `applyGreybox`. Each throws when its
  numbers break the co-op-only property; its `lips` feed `COOP_LIPS`. Where this spec and the helper doc differed, the
  spec took the helper's numbers: the gland plate is 0.55 m, the A6 cage 4.2 m square under a 5 m bridge. Not covered
  by a helper (built by hand): the overwatch ledge and a one-way drop (neither is on this route).
- **Co-op lips.** Every co-op lip is 4.4 m (`COOP_LIPS`, exported from the map, with a unit test that each is 0.5 m or
  more over `WALL_JUMP.maxUp` 3.8 and within `TEAM.boostMax` 4.5, LD 11.3). The leg-up reaches 4.5 m and the ledge
  relay serves a hanging partner up to 4.6 m, so 4.4 m lips work for both (ENGINE-ANSWERS Q5; `TEAM.ladderGrab` 4.1
  has no reader: the old shoulder-stand ladder is gone).
- **Unplanned boost targets.** Every box top or lip 3.8-4.5 m above its floor is in `COOP_LIPS` or has `noLedge` (unit
  test over every box top in the band, LD 11.5).
- **Revive.** A player downed on each co-op surface (A1 yard, A2 staging, A6 gallery, A8 gallery) can be revived (e2e,
  LD 15). Revive window 30 s, 2 per mission for the team (`reviveClock.ts`), a 2.5 s hold. The revive is an
  interactable on the downed body: offered within 1.6 m horizontally (the item's own reach, `coopHost.ts` `addRevive`; 1.8 m is only the interactables default) and under 1.5 m of height (ENGINE-ANSWERS Q6), so
  a player downed on a deck or gallery is revived only from that level; each co-op surface needs room to stand beside
  a downed player.
- **Both extract** (G138): the cash dock exit zone needs both.
- **Plans per set** (bible 7): co-op plan = the table above; light plan = section 7 and each set's Lights row; sound
  plan = each set's Surfaces row; checkpoint plan = every holding room (L1-L7) is the next set's checkpoint, on a floor,
  lit by the house circuit but out of every guard's view (no guard in a holding room); medkit plan = L4 and L7 wall
  medkits (G98, G119), plus the A8 security office (a third, near the finale's armed guards and the scanner fail).

## 13. Mission and modes (objectives, rules, theme)
- **Modes.** `modes: ['course']`, id `ctcourse`, name "Marlow Yard", not listed; campaign default stays
  (`CAMPAIGN_MAP`, `session.map`). No `missions.json` entry (Course mode has none).
- **Course def.** Bays `A1`..`A8` (ids change from `S1`..`S8`, section 16), airlocks `L1`..`L7` (6 x 6), chain
  start -> L1 .. L7 -> end; the exit zone is the cash dock. No explainer panels (M4): `sw-p1..8` and `PANEL_TEXT` go.
- **Objectives (M4).** The step lists of section 9 (N1), in route order; each bay's last row is the existing "Both onto
  the Ln airlock pad" / "Finish the course". The HUD's objective list shows the current step's shared line and, under
  it, this player's own A or B line (by the set's role claim); a step ticks when its flag is set (`flag:<id>` drills,
  gap 6a), the list moves to the next step at once and a new set's list starts when its holding room cycles. A restart
  resets the set's steps and claim. A timed window adds its seconds left to the line ("Lights back in 9 s"). This list
  is the only guidance: no pads, no panels, no world markers (bible 6), only the striped leg-up marks (P16).
- **Map data.** Spawns in the arrival lounge (x 2, z 10 and 12, facing +x); one `navSeeds` point per set and per
  holding room; the gallery and service corridors are outside every nav seed (players can never reach them).
- **Camera spaces per set (ENGINE-ANSWERS Q13).** Without `camSpaces` the probe calls any space under about 4 m wide
  tight, so each set declares its own in its `SetPart`: `camSize: 'open'` for the halls (A1 yard, A2 shed, A4 floor,
  A5, A6 pump floor, A7 hall, A8 banking hall); `tight` boxes for the holding rooms, the lounge, the A3 corridor and
  offices, the A4 racking aisles and security room, the A7 plant corridor and pod, the A8 security office and vault
  lobby. Numbers: the camera needs 0.31 m beside the spine (the scale sheet's 0.78 is stale); looking across a 3.0 m
  aisle or the 3.5 m corridor the boom pulls in to about 1.3 / 1.6 m from 1.8 m, which is acceptable. The visual
  re-measure is a GPU shot per set (Character Build, pending).
- **Radio (LANTERN, from the instructor bridge; 90 characters, British, voiceable; at most three in a row).** One
  entry line per set and a line on each timed window's start and last 5 s, for example:
  - A1: "Evening. Same rules as the real thing. Over the wall, open the gate for your partner."
  - A2: "The neck is on two isolators. Fifteen seconds of dark each time. Use them well."
  - A3: "That camera sends you back to the lobby if it sees you. Jam it for each other."
  - A4: "The duty officer's console loops the floor cameras. Sixty seconds. Don't dawdle."
  - A5: "Those beams cover the whole gateway. One of you goes over, the other stays put."
  - A6: "The drive panel is inside the cage. The gland plate is your way in. Mind the attendant."
  - A7: "Two terminals, two routes. You'll be on your own for a bit. Meet at the cage."
  - A8: "Last one. Everything you've done tonight, in one room. Take your time."
  - Window lines: "Lights back in five." / "Cameras back in five." / "Grille's locking again."
- **Rules.** Both extract (G138); revive 30 s, at most 2 per mission (G349); set restart when both down; no strict rule,
  every failure a retry (Q5); a failed drill retries in place (G361); rating per
  set as today (`courseRating.ts`), so the finale's rating now means something (A8 has guards and cameras).
- **Theme.** Indoor, no moon, no weather; `lightLevel` 0.30 (the lounge, holding rooms and dock), set `ambientZone`s at
  0.14 standby (section 7); grade: neutral-warm facility, each set its own palette (section 6).
- **`reinforce`, `alarms`, `hideSpots`, `switches`.** No reinforcements and no alarm panels (course alarms stay a
  stat). `em.stealth = true` in Course mode (assumed A8, built in 0a; ENGINE-ANSWERS Q2): a spotted guard shouts to
  8 m and calls in after 2.5 s, guards share a last known position, search 60 s and cool down, and detections count for
  the rating. Radio checks and alarm runners do not start (no squad rosters, no alarm panels). `hideSpots` per set
  sheet. `switches` per set sheet (every one by a door).

## 14. New code needed
The smallest set that the route needs (A3, the current goal: basic prototypes). Sources: COOP-INVENTORY section 2,
DEVICE-INVENTORY section 7. Line counts are estimates without tests. Every item is also proposal P9 (Michael may strike
it; each has a fallback there).

| Id | Item | Needed by | Size | Files | Wire / `PROTOCOL_VERSION` |
| --- | --- | --- | --- | --- | --- |
| N1 | **Objective steps with per-player lines (M4; gap 6a, 6b).** `CourseObjective` grows into an ordered step list per bay: `{ id, bay, text, a?, b?, done }`, `done` = a course flag (set by a pass zone, pickup, pair, scanner, console or gate; `who` per role for per-player flags) or "gate open". Drills tick from a flag as well as a verb (`flag:<id>`, `FLAG_VERB`). Roles follow a per-bay claim (`BayDef.roles: RoleClaim[]`: the first press of a named device or the first entry into a zone takes the role, until the bay restarts; without a claim the swap rule `leadOf` gives them). The HUD (the existing drill table and step line, `courseHud.ts:56-82`) shows the current step's shared line plus this player's A or B line. A timed gate's remaining seconds (already in `PackedCourse.gates[].t`) are appended while it runs. Plus a one-player pass zone (`PassZone.any`, `src/game/passZones.ts`) for "B past x" steps. `validateCourse` checks ids and the 90-character limit. Panels are simply not placed (the panel code stays for `courselab`). | Every set | ~150 lines + tests | course side: `src/game/course/courseDef.ts`, `courseState.ts`, `src/ui/hud/courseHud.ts`; pass zone: `src/game/passZones.ts`, `src/game/ctDevices.ts` | Flags, claims and gate timers ride `PackedCourse`: no shape change (if the claim needs a new packed field, it rides the N6 bump) |
| N2 | **Timed light isolator.** Gate kind `isolator { id, switchIds, group, seconds, rearm }`: a press turns course group `group` off for `seconds`, then back on; any switch on the circuit works (two-way); presses while off do nothing; re-arms after `rearm` s. On "off" it calls the `lightsOut` lure for that group's lamps. Fix `resetLights`' early return so a restart restores the map's lamps. | A2, A8 (and A8's `mains` grille) | ~80-100 lines | `courseDef.ts`, `courseState.ts`, `src/game/modes/courseMode.ts`, `src/game/stealthSystems.ts` (lure call only) | Group state rides `lights.groups` / `groupsOff`; timer rides `gates[].t`: no shape change |
| N3 | **Timed security console ("loop the feed", gap 2).** `SecurityConsole.seconds?` and `rearm?`: the console sets its flag for `seconds`; while set, its cameras run in the existing `looped` mode (drawn already: the view fade and LED, `cameraCue.ts:48, 196`, `securityView.ts:23`; only the setter and the timer are new), then the host clears the flag and the cameras come back on both pages; re-arm after `rearm`. Needs a flag clear in `courseState` (flags are set-only today) and the timer on a gate slot so N1 can show it. | A4, A8 | ~40-60 lines | `src/game/course/securityRoom.ts`, `courseState.ts`, `courseMode.ts`, the camera mode setter in `ctDevices.ts` | Flags ride `PackedCourse.flags`: no shape change |
| N4 | **Hold device.** `CourseDevice.hold?: number` passed to `ints.add(..., holdTime)` (`courseMode.ts:251`); a completed hold counts as the press. **Ships without `holdNoise` for now** (ENGINE-ANSWERS Q12): only the host's own hold reaches guards (a client has no `EnemyManager`), and A6's hanger can be either player, so a host-only buzz would be unfair. Later small item (PLAN 0d follow-up): a client hold-pulse message, the host checks reach and calls `em.hear(pos, holdNoise)` (~15 lines and a net test, inside the same unmerged `PROTOCOL_VERSION` 30). Until then the A6 sheet's buzzer is visual and sound only. | A6 drive panel | ~15-25 lines (+15 later) | `courseDef.ts`, `courseMode.ts`; later `protocol.ts`, `coopHost.ts`, `coopClient.ts` | `NetItem.hold` exists: none now; the later pulse rides 30 |
| N5 | Timed lock gate (press -> door unlocked N s -> relock). **Not built:** A8's grille uses the existing `mains` gate on the isolated circuit, which is the timed lock Michael asked for. Kept here so a set that needs a plain timed release can add it (~30 lines). | - | 0 | - | - |
| N6 | **DONE (34cb5b52; `tests/marlowN6Scanners.test.ts`; the panel height rule is now per panel floor).** **Several scanner pairs.** `CtDevices` builds every `lay.scanners` entry (today only `[0]`), `SecWire.sc` becomes one entry per pair, and the ready-lamp glow is placed from the device's position and yaw (today hard-coded to Marlow's z 0.3 / 13.7). | A7 and A8 | ~60-80 lines | `src/game/ctDevices.ts`, `src/game/scanners.ts`, `src/net/protocol.ts` | **Yes: `SecWire.sc` shape. Bump `PROTOCOL_VERSION` 29 -> 30** and the tests that assert it |
| N7 | **Live course guards.** Data only: squad slots without `passive`, with `route` points (`rooms.ts` `SquadSlot.route`, applied at `courseMode.ts:666`). Confirmed (ENGINE-ANSWERS Q2): a course guard with a route patrols, perceives, follows a switch or isolator lights-out (a jammed lamp is no lure) and fights. Two one-line fixes ride slice 0a: `em.stealth = true` in Course mode (A8, was P7) and `em.despawn` in `spawnSquad` so a restarted set does not keep the old squad's bodies (Q4). | A2-A8 | 0 (data) + 2 lines | map files; `courseMode.ts` (0a) | none |
| N8 | **Free bay layout.** The map's `bayX(i) = 22 i` helpers and the tests that import them go; bays are placed by their own boxes. `coopUi.ts:595` "Start at" stops assuming 9 bays (reads the course def). | All | ~10 lines outside the map | `src/net/coopUi.ts` | none |
| N9 | **Sliding doors: no swing-only verbs (gap 7b).** The kit's slide leaf (`Door.leaf: 'slide'`, KIT.md 7, gap 7a: covered) draws right, but committed open (`doorOpen.ts`), crack, peek, bash and the stealth-open row assume a swing. On a slide door the door menu offers Open only (no crack, peek or bash); the leaf slides on the same `DoorState`. | Holding rooms, lounge | ~20-30 lines + a unit test | `src/game/doorMenu.ts`, `src/world/doorOpen.ts` (and wherever the crack / bash checks live; grep first) | none |
| N10 | **Glass wall without a window anchor (gap 8b).** Covered by the kit (ENGINE-ANSWERS Q7, confirmed): `kit.glass` writes an invisible collide box in the static body (never a lip, no window anchor, so no takedown or vault prompt) and draws the panes; it stops bodies, bullets, guard and camera sight and jam lines, and passes baked lamp light. A light-blocking see-through pane does not exist (a builder flag, ~5 lines, if ever needed; this spec needs none). | Gallery, holding-room slots, A3 partitions | 0 | - | none |
| N11 | **Glow tied to a circuit (gap 9).** Covered by the kit: accent LED lines carry a `group` and go dark when that circuit has no lit lamp (KIT.md 3). Rule for builders: every glow in a set has its circuit's `group`; decor lamps that are not real fittings are `electric: false` so they are not jam targets. Non-kit glow (prop screens, status lamps) is tinted per instance by its device (PROPS.md 1). | Every set | 0 | - | none |
| N12 | **Every yard lamp in a group (gap 1).** Data: every `b.light` and lit `kit.ledSlot` in the map names a `group`, every changeable group is in `course.groups` (section 7). A unit test fails a lamp with no group. | Every set | 0 + 1 test | map files, `tests/ctcourse.test.ts` | none |
| N13 | **Zone-based area advance (gap 6c).** Not built: this route keeps the course's bay-and-airlock chain on purpose (the holding rooms are the airlocks, section 5), so the existing pad advance fits. Kept for a later map without holding rooms (M size). | - | 0 | - | - |
| N14 | **Instructor figures (gap 8c).** Not built: there is no non-hostile posed NPC (passive grunts are armed, need nav and despawn per bay; posed figures exist only in the menu). The gallery shows empty chairs and lit screens until the figure / guard-avatar job (M6) lands (Future). | - | 0 | - | - |

Not needed (checked): a new HUD element (N1 reuses the course HUD's step line and drill table); new net messages; new
input bindings; new AI behaviour; automatic proximity doors (gap 7c: the holding-room doors open from the door menu,
like a push button; Future). The one wire change is N6, so slice 0 bumps `PROTOCOL_VERSION` once to 30 and runs
`e2e-coop` and `e2e-netmove`. If N6 is struck, A8's time locks become two N4 hold devices feeding a `pair` gate
(`window` 1.5) and no bump is needed.

Build state (ENGINE-ANSWERS, ~02:00): N6 and `PassZone.any` are DONE (34cb5b52, `PROTOCOL_VERSION` 30,
`tests/marlowN6Scanners.test.ts`, `tests/marlowPassAny.test.ts`); N1-N4 and N8 are in the working tree (slice 0a), with
0a also taking `em.stealth = true` (A8), `em.despawn` in `spawnSquad` and remote players in `occupied`; N9-N12 are
slices 0d / 0g (PLAN.md).

## 15. Proposals for Michael (never applied)
(Michael ~01:42: "Apply, logged and undoable": built as assumed decisions, listed in STATE.md MORNING-REVIEW with the fallback below as the undo.) Every loosening of `docs/level-design.md`, the template, the bible or DECISIONS that the design uses. None is applied
to the standard's text; the map is built to the "design uses" column so Michael can test it, and each has a fallback
the builders can switch to in under a slice. Numbers T1-T18 are CONSTRAINTS section 4; "CR 6" is SCENARIOS section 6.

| P | Rule | What the design uses | Reason | Fallback if Michael says no |
| --- | --- | --- | --- | --- |
| P1 | LD 3.1 / bible L7 entry vantage is dark; LD 3.9 checkpoints are dark | A concealed vantage: out of every guard's view by occlusion (a van end, the drum stack, the sump kerb, a counter), dark only where a mixed zone allows; holding rooms lit (0.30) but out of every guard's view | M6: sets are lit by default; the holding rooms are facility lobbies | A dark mixed-zone pocket (no fitting, reason in the register) at each vantage; holding-room lamps on a dimmer at 0.2 |
| P2 | G225 "keep the open floor at 0.30" (T6) | Sets' `ambientZone` at 0.14 standby; 0.30 kept in the lounge, holding rooms and dock | M6 "lit, players cut it": a cut circuit must be dark (under 0.28) or isolation teaches nothing. Shared all-maps review: `docs/archive/lighting-review/PROPOSAL.md` | Keep 0.30: isolations then work only as guard lures, never as darkness |
| P3 | LD 6.3, bible 5.8 / 6 "no forced timers in stealth sections" (T4, CR 6) | Device windows only: A2 15 s, A4 / A8 60 s loop, A8 25 s lights, the jam's 5 s; player-started, shown, re-armable; no course clock. Settled by G342 / G361: a drill may fail and retries in place | Michael asked for "timed isolation" and "timed jammer exercises" | Windows become held: an isolator stays off while a player holds it (`timedHold`), the console stays off until restart (today) |
| P4 | Level design standard for every map (M5 "review the rule", M6 "levels are quite dark and not realistic") | Proposed new LD 5.5: "Spaces are lit as the real building would be at night. Darkness is made by the players (switches, isolators, jams, shots) or is where the building really has none." | Michael's note covers all levels (01:40: "the rules may be too strict and the levels are very dark and unrealistic ... the player may have to make shadows"); the all-maps proposal is `docs/archive/lighting-review/PROPOSAL.md` (lighting agent), never applied here | Apply to Marlow Yard only |
| P5 | LD 9.2-9.3, G125 at most one hard rule (T5) | Not used. ROUTE-DRAFT wanted "an alarm resets the set"; settled by Michael 2026-10-25 (Q5): no strict rule in Marlow Yard, every failure a retry | - | (If Michael wants it: alarm stage 3 restarts the set, about 30 lines) |
| P6 | Template "guard total 9 or fewer" (T8) | 12 role-players in the yard (11 perceiving), at most 3 alive per set (Course mode spawns per set; `MAX_ALIVE` 12); the re-plan (J14) sets each set's count by Q11 (only what the move needs, may be 0) | Every set from A2 needs a live guard; A4 and A8 need pairs. Also listed (T8): the passive A1 checker is classed as a role-player prop, not a section-4 guard | Drop `a4-dock2` and `a8-night2` and the A1 checker's slot moves to A4 (9) |
| P7 | (Applied as assumed A8, ENGINE-ANSWERS Q2) Course mode ran with `em.stealth` false: a spotted guard radios everyone within 22 m, chases the players' real positions, never searches or cools down, and detections never count | `em.stealth = true` in Course mode (1 line, built in 0a): shout, call-in, shared last known position, search, cooldown, the detection stat | The false setting was the harsher one and broke the rating; this is P7's own former fallback, so it is logged for Michael, not asked | Back to false (1 line) |
| P8 | LD 3.6 "guards do not look up" vs G44 not built (T10) | Occluders on every high route (A2 screens, A6 cage kick panels, A8 cornice) | Guards see straight up today | Build G44's look-up penalty (~15 lines in `perception.ts`) |
| P9 | Template "Scope: existing systems only" (T12); N3 also changes Michael's sector-fixes console (permanent off) to a timed loop (CR 6) | New code N1-N4, N6, N8, N9 (section 14; N10-N12 are kit use and data) | M4 asks for N1; Michael's list needs the timed devices; N9 keeps swing-only verbs off slide doors | N1 dropped: one shared step line per set (today's `bayObjective`); N2 -> manual switches and `mains`; N3 -> permanent console; N4 -> a press; N6 -> two hold devices and a `pair` gate; N9 -> hinged doors in the holding rooms |
| P10 | LD 6.1 one new mechanic per space | A4 teaches the console loop and the dual takedown (the takedown optional); A6 teaches the hang-down and uses the rope once with no threat | Fits 15-20 min with eight sets | Move A6's rope to A8's gallery as a second way up |
| P11 | LD 3.2 three routes plus a secret in every guarded space (T2) | Two or three ways per set, a secret in A2, A3, A5; A1 is an unguarded teach set | Training sets teach one co-op route on purpose | Add a secret route per guarded set in the dressing pass |
| P12 | The marlow-bunker rule "walls to ceilings, no lip over a bulkhead" | A1's 4.4 m boundary wall and the A2 / A6 / A8 decks stop under the 10 m hall roof | They are set flats inside a studio hall, built to their real height; the hall's own walls go to the roof | Run a charcoal panel wall above each set wall to the roof, with the 4.4 m lip as a walkway edge |
| P13 | LD 16.5.3 rail 1.1 m where people work at height (T14) | The co-op lip spans of A2 staging, A6 gallery and A8 gallery are open loading edges with a drop chain (visual, no collision); rails elsewhere | A rail would remove the lip | Full rails; the lips move to a parapet-free hoist bay in each |
| P14 | G206 "one interrogation guard" | Info lines on the A1 checker, A4 officer and A8 officer | The A4 and A8 lines plan the next beat (ROUTE-DRAFT) | Info only on the A1 checker |
| P15 | G225 / marlow-bunker fiction (a bunker gallery) | The luxury rehearsal centre (M5) | M5 asks for it; M1 "rebuild freely" | - (M5 is Michael's word; recorded for DECISIONS at the merge) |
| P16 | Bible / level standard "no co-op markers" (LD 11.2, T1) | The striped leg-up squares stay at A1, A2, A6, A8 | Solo invariance falls with G253; CT's training used marks | No marks; the objective line names the spot |
| P17 | G45 "clear glass passes light and sight" (gap 8a) | All glass (`kit.glass`, a `windowAt` pane alike) stops guard and camera sight and jam lines; baked lamp light passes. The gallery is view only, so this is what the fiction wants | G45's sight rule is not built (T11); a view-only gallery must not let anything behind the glass see the players | Build G45's clear-glass sight (then keep the gallery free of anything that perceives: static figures only, N14) |

**Course Ready's rule clashes (SCENARIOS section 6), resolved:**

| Clash | Resolution |
| --- | --- |
| Bible 5.8 / 6, LD 6.3 "no timers in stealth sections" | Proposal P3: shown, player-started device windows, no course clock; a failed drill retries in place (G342, G361) |
| G240 cameras see in the dark | Kept, no proposal: no exercise uses darkness against a camera; lights work on guards and the meter, the jammer and the console on cameras (section 7) |
| G110 "no rope climb" | Settled by G180 (CT's two-person rope replaces G110's rope ban for that move); A6 uses only that move. SCENARIOS' rope lowering with side steering is not used (Future) |
| Timed / two-key security console changes Michael's sector-fixes console | Timed: P9 (N3, with its fallback). Two-key: not used (Future) |
| A new fiction and size for the map | P15 (M1, M5) |

## 16. What the rebuild keeps and breaks
### Keeps (AUDIT section 6, MAP-AUDIT section 5)
- **Identity.** Map id `ctcourse`, name "Marlow Yard", `modes: ['course']`, unlisted, its place in `MAPS`
  (`tests/rooms.test.ts:140`), `CAMPAIGN_MAP = 'ctcourse'` (`coopUi.ts:382`, `:811`), `session.map` default
  (`session.ts:58`), `e2e-park.mjs:92`, `e2e-coop.mjs:93` ("Marlow Yard|ctcourse").
- **e2e-coop's bay-1 guard.** A grabbable, not-alerted guard in the first bay's squad: the A1 gate checker
  (`e2e-coop.mjs:750-790`).
- **Course framework contract.** Airlocks 6 x 6 +-0.5; the chain start -> airlocks -> end; text 90 characters; every read
  flag set by a gate, a device or `externalFlags`; interactable ids `c-<device id>`; the both-in exit (G138); restart
  rules; consoles need their guard in the bay squad (`consoleErrors`).
- **Device systems** reused as they are: `PassZone.hall` (A3), `SecurityConsole` (A4, A8, timed by N3), lasers with
  `offFlag` and power panels (A5, A8), paired scanners (A7, A8 via N6), the held jammer on every electric lamp,
  camera and panel, the team moves, revive, medkit walls, the dual takedown banner.
- **Debug hooks** the e2e reads: `window.__course`, `window.__ctdev.debug()`, team counters, `net.reviveClock`.
- **Dressing.** The new look comes from the KIT and PROPS kits (section 6). `ctcourseBunker.ts` / `ctcourseVariety.ts`
  are retired with the bays in slice 0d; a set builder who wants one of their pieces (a hazard frame, a plant face)
  copies it into that set's file.

### Breaks, and the plan for each
| What breaks | Why | Plan |
| --- | --- | --- |
| Course save record (`src/save/courseRecord.ts`): bay ids `S1..S8`, best times per bay | Bays become `A1..A8` | No `SAVE_VERSION` bump (a kv key, sanitised on read); old best times orphan. Say so in the changelog fragment and `TESTING.md`. "Start at" lists the new bays |
| Rejoin / resume by bay index (`coopUi.ts:183`, `:205`; `tests/rejoin.test.ts:215-226`; `e2e-menus.mjs:352` bay 2) | Indexes still valid (8 bays) | Keep 8 bays; re-check the e2e-menus record and the rejoin test literals |
| "Start at" with the all-bays dev flag hard-coded to 9 (`coopUi.ts:595`) | Bay count | N8: read the course def |
| `tests/ctcourse.test.ts` (28 imports, every block pins the old layout) | New layout | Slice 0d rewrites it as the whole-map frame (chain, validateCourse, text limits, lips band, every lamp grouped, door widths, register count); each set slice adds `tests/ctcourse/<set>.test.ts` |
| `tests/ctcourseLight.test.ts` + `ctcourseLight.tuned.json` (190 tuned levels) | New lamps, new ambient | Slice 0d makes it a frame that reads each set's exported light spots and its own tuned file `tests/ctcourse/<set>.light.json` (one per set, so parallel builders never share it): lit pools on the route are lit, cut circuits go under 0.28, standby 0.14, holding rooms 0.30; re-tune per set with `CTLIGHT_PRINT=1` |
| `tests/guardInfo.test.ts` (`GUARD_INFO`, `GUARD_SLOT`, `S3_SEC_GUARD`) | New guards | Rewrite for `a1-checker`, `a4-officer`, `a8-officer` |
| `tests/jammer.test.ts:410-560` (S4 band, S3 hallway) | Moved devices | Point at `A5_LASER`, `A3_HALL` exports |
| `tests/laserPanels.test.ts:31` (`S4_PANEL`, `S4_PANEL_JAM`, hidden box) | Moved panel | `A5_PANEL`, its jam spot and vantage trace |
| `tests/scanners.test.ts:19` (`S6_FLAG`, `S6_SCANNERS`) | Two pairs | `A7_SCANNERS`, `A8_SCANNERS` |
| `tests/camSpaces.test.ts`, `tests/smoothWorldLight.test.ts` (`bayX`, `CT_BAY`, `CT_OBST`, `CT_CEIL`) | Helpers go | Per-set spots from the set exports |
| Who moves these five | Parallel builders must not share test files | Slice 0d cuts the map-coupled cases out of these five files (map-free cases stay) so `npm run check` stays green; each set slice re-adds its cases in `tests/ctcourse/<set>.test.ts` (A1 guard info, A3 hallway, A4 / A8 guard info, A5 laser and panel, A7 / A8 scanners) |
| `tests/securityRoom.test.ts` (map-free) | N3 | Add the timed cases |
| `tests/lampGridLossless.test.ts`, `levelFillParity.test.ts`, `voxelFit.test.ts`, `rooms.test.ts`, `rejoin.test.ts`, `roomDirectory.test.ts` | Map-generic | Run as they are; fix only real failures |
| `scripts/e2e-ctcourse.mjs` (938 lines, literal ids and offsets; parts `{1:[1,3],2:[4,5],3:[6,8]}`) | New route | Rewrite (A1). One part per two sets: `:1` A1-A2, `:2` A3-A4, `:3` A5-A6, `:4` A7-A8 (`run-e2e.mjs` `PARTS` gets `'4'`, the `GROUPS` table, `e2e-times.json` keys). Slice 0d writes the runner and shared helpers; each set's steps live in `scripts/e2e-ctcourse/<set>.mjs`, owned by its slice. The quick-run map in `run-e2e.mjs` adds `src/world/maps/ctcourseSets/` |
| `scripts/e2e-coop.mjs:748-800` (bay-1 guard) | Kept by the A1 checker | Re-run, no change expected |
| `scripts/e2e-anchors.mjs:9` (ctcourse places no anchors) | Still none planned (no ladders, pipes, ducts) | No change; if a builder adds an anchor, add ctcourse there |
| GPU and shot scripts with coordinates: `shots-ctcourse.mjs`, `nv-shots.mjs`, `sector-lights-shots.mjs:62-64`, `sector-fixes-c-shots.mjs:18` (`cam-s3`, `laser-s4`), `camera-cue-shots.mjs`, `wheel-shots.mjs` | New ids and places | Slice 0d rewrites `shots-ctcourse.mjs` to read one `SHOT_VANTAGES` export per set (the per-set GPU shots of M5); update the others' ids |
| `PROTOCOL_VERSION` 29 | N6 | 30, with the tests that assert it |
| Docs: `docs/ct-prototype/CTCOURSE-SPEC.md`, `TESTING.md:45-60`, `:263-294`, `docs/systems/testing-tools.md:33`, `:42-44`, `docs/archive/course-ready/WALKTHROUGH.md`, `docs/systems/coop.md` (N1-N6) | Superseded | CTCOURSE-SPEC gets a header pointing here (slice 0d); TESTING per-set checks, testing-tools, coop.md and WALKTHROUGH rewritten in slice 9 from the slice reports |
| Swing-door verbs on the new sliding doors (crack, peek, bash) | `leaf: 'slide'` | N9 |

## 17. 16.10 review answers
Answered for the design in this spec (LD 16.10); the checker re-asks each after every slice's greybox.

| Q | Question (short) | Answer |
| --- | --- | --- |
| 1 | Room shape that forces a path? | None. Sets are rectangles on the 6 m grid; A3's corridor is straight; A2's rakes are parked stock, A4's racking is real aisles |
| 2 | Space with no purpose, or too easy for its value? | None. Every set copies a site; the lounge, holding rooms and dock have facility jobs; the cage, security rooms and vault are locked or guarded |
| 3 | Ladder beside a stair, or outside a plant space? | None. No ladders on the route |
| 4 | Stair without handrails or with a gap? | Fix list: every stair (A2 staging east stair, A4 mezzanine stairs, A6 staff stair, A8 public and office stairs) gets handrails both sides and balustrades; the checker tests for gaps |
| 5 | Roof reached by anything but a covered stair or fire stair? | None. No roof is on the route (the 4.4 m decks are working platforms, see P13) |
| 6 | Roof object that is not roof equipment? | None (no roofs used) |
| 7 | Floor or roof not fully covered, or a hole without a reason? | One planned opening: A6's 0.55 m gland plate (a real cable gland, with its plate lifted; the tell sign) |
| 8 | Block without a named object; object blocking a door or window? | None planned: every block is named in the register (vans, racks, pens, pumps, counters, cooling units); 1.0 m clear in front of every panel, isolator, console and door |
| 9 | Barrier in front of a room for no reason? | None. A1's wall and A5's inner wall are the sites' real security walls |
| 10 | Ladder in a floor hole? | None |
| 11 | Vent not at the end of a real duct? | None (no vents) |
| 12 | Dead end needing an invented side entrance? | None. A3's offices have communicating doors (a real suite); the A4 security room's second door is the staff passage; A8's office stair is the vault company's real staff stair |
| 13 | Every element has a register row with a real reason? | Section 18 (one compact table per set); a missing row fails review |
| 14 | Would an architect recognise every room; can a visitor guess the stairs? | Yes: the facility is a studio with sets; each set's stairs sit where the real site has them (staging end, mezzanine ends, pump-house staff stair by the desk, bank public stair at the front) |

**CONSTRAINTS checklist cover (items 1-60, CONSTRAINTS section 1).** Where each MUST / SHOULD is met; "set doc" means
the per-set deliverable `docs/marlow-final/sets/<set>.md` written before that set's greybox (section 20); loosenings
are only the P rows of section 15.

| Items | Met in | Verified by |
| --- | --- | --- |
| 1 building brief | Section 5 | Review |
| 2 register, 15 owners and switches | Section 18; section 7 lamps; section 9 Lights / Guards rows | Unit test: register rows vs `b.light`, collidable boxes, anchors, doors (frame test, slice 0d) |
| 3 verbs | Section 8 | Review |
| 4 proportions, 5 spacing | Section 5 "Real dimensions" (6 m clear, 5 m between doors, archways); set doc metrics check per door | Unit test on door and corridor widths per set |
| 6 grid, 13 rooms | Section 5 (6 m grid, rectangles); Q1, Q12, Q14 below | Plan SVGs |
| 7 same look same rule | Section 18 Rule column; striped marks P16 | Unit test: every 4.4 m lip of the climbable look is in `COOP_LIPS` |
| 8 real gates, no invisible walls | Section 18 owners; the gallery and service corridors are behind real walls and locked staff doors | Frame test: no `visible:false` box on a route except kit glass |
| 9 vertical circulation, 10 openings, 11 objects, 12 roofs, 14 ducts | Q3-Q11 below; no ducts (section 8) | Review per greybox |
| 16 the 16.10 review | This section | Checker per slice |
| 17 spine, 23 connectors, 24 checkpoints | Section 9 route; holding rooms L1-L7 (P1 for lit checkpoints) | e2e nav order (slice e2e parts) |
| 18 vantage | Each set's "Observe, then plan" (P1) | e2e: a still crouched player at the vantage stays under suspicious for a cycle |
| 19 routes, 20 loops, 21 stepping stones, 22 sightlines | Each set's Routes row (P11) | Set doc space sheet |
| 25-26 guards | Each set's Guards row; no heavies or dogs | Set doc guard sheets; e2e cycles 25-45 s |
| 27-32 light and sound | Section 7, each set's Lights and Surfaces rows; cameras ignore light (G240) | Per-set light tests; GPU shots at Low |
| 33-36 pacing, guidance | Section 9 tension, section 10, P3, M4 objective list (section 13) | Beat chart in the set docs |
| 37 tool / problem matrix, 38 toys, 39 ghost / non-lethal / lethal, 40 gadgets optional | Each set's Routes and Toys rows; no gadget is required (moves and the pistol jammer only) | Set doc matrix; slice 9 ghost e2e |
| 41-43 fairness, failure, exploration | Section 9 shared rules (escalation, no strict rule, retries), the L7 model (LD 10.3) | Review |
| 44-51 co-op | Sections 12 and 13 | Unit lips tests; e2e on two pages; revive per co-op surface (slice 9) |
| 52-57 engine and text | Section 19; tuning tables unchanged (section 2); 90-character lines (`validateCourse`); perf per set | Phase 0 answers; `npm run check`; GPU perf via Character Build |
| 58-60 deliverables, acceptance tests | Section 20 (per-set docs and SVGs), PLAN.md checks | Slice 9 |

## 18. Element register
One row per route element (LD 16.9). Lamps are listed by group (each lamp in a group shares the row's owner, fitting
and switch); builders add a row for any element they add, and the checker counts rows against every `b.light`,
collidable `b.box`, anchor and door in the code (CONSTRAINTS 2). Rule column: same look = same behaviour (LD 2.5).

**Facility (all sets)**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| F1 | Holding rooms L1-L7 (6 x 6, two 1.8 m sliding doors) | The set crew's interlock lobby between sets: resets the next set unseen | Checkpoint, both-on-pad, glimpse | Every holding room looks and works the same |
| F2 | Holding-room glass slot (`kit.glass`) | Crew view into the set before release | Glimpse | All glass stops bodies, bullets, guard and camera sight and jam lines, and passes baked lamp light (P17, ENGINE-ANSWERS Q7) |
| F3 | Instructor gallery glazing and lamps (group 1) | Clients and instructors watch the sets | Fiction, landmark; out of bounds | Glass as F2; gallery lamps never go off (instructors' circuit) |
| F4 | LED read slots and accent lines (group 2 holding rooms, group 10 lounge, per-set groups) | The facility's architectural lighting | Read light (slots); accent lines follow their circuit | No wall switch on house circuits: instructor-owned; set lines follow the set's switches |
| F7 | Plant room, service corridors, locked staff doors | Power, air and crew access between sets | None (closed) | Staff doors: no handle, red plate, never open |
| F5 | Set doors with backlit name plates | Fire and access doors between sets and service corridors | Landmarks; locked staff doors never open | Locked staff doors look different (no handle, red plate) |
| F6 | Wall medkits L4, L7, A8 office | First-aid stations required in a training centre | Healing (G98) | Same cabinet everywhere |

**A1 Gate**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A1-1 | Boundary wall 4.4 m, 0.6 brick | The goods yard's security wall, copied full height | Co-op lip (C1) | Every coped 4.4 m brick wall top is a co-op lip |
| A1-2 | Wicket door, bolted yard side | Staff gate, bolted at night from inside | Bolt gate | Bolts open from the bolt side only |
| A1-3 | Vehicle gate 3 x 3, chained | The lorry gate, chained after hours | None (landmark) | Chained gates never open |
| A1-4 | Gate checker's cabin | Where the checker logs lorries | Interrogation guard, switches | - |
| A1-5 | Apron lamp group 11 | Gatehouse security light (photocell) | Lit apron | Photocell lamps: no switch |
| A1-6 | Yard lamps group 12, cabin panel 13 | Yard and cabin lighting, switched in the cabin | Toys | Switch by the door |
| A1-7 | Striped leg-up mark | The facility's training mark (P16) | Names the leg-up spot | Every mark is a leg-up spot |

**A2 Carriage Shed**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A2-1 | Box vans 10 x 2.6 x 3.4 (`noLedge`) | Parked stock on the roads | Cover, loops | Vans are never climbable |
| A2-2 | Rails and ballast | The siding's roads | Loud floor | Ballast is loud everywhere |
| A2-3 | Neck high-bays group 21 | Shunting neck lighting on a contactor | The timed isolation | Isolators drive one circuit each |
| A2-4 | Isolator cabinets 1 and 2 | Two-way lighting push stations at each door (real) | N2 | Same cabinet = same circuit control |
| A2-5 | Shunter's cabin + back door | The shunter's mess and its yard door | Lure destination, secret route | - |
| A2-6 | Cleaning staging, 4.4 m deck, open loading edge span | Carriage-cleaning platform at roof height | Co-op lip (C3), high route | Open loading edges are co-op lips (P13) |
| A2-7 | Staging screens 1.2 m solid | Splash and fall screens | Cover on the high route | - |
| A2-8 | East stair; west stair behind the permit gate | Platform access; the west stair locked off for work | Way down; reason for the leg-up | Padlocked permit gates never open |
| A2-9 | Shed general group 20, cabin 22, staging 23 | Shed, cabin and platform lighting, switched by doors | Toys | Switch by the door |

**A3 Office Range**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A3-1 | Corridor 3.5 x 18 | The office floor's main corridor (widened, T16) | The jam relay | - |
| A3-2 | Ceiling IR camera | Corridor CCTV covering the stair lobby | Jam relay, send-back | Every camera sees in the dark |
| A3-3 | Office 2 door reveal 1.0 m | The office door's recess | Stepping stone | - |
| A3-4 | Offices 1-3, communicating doors | A suite let to one tenant | Alternative route, loop | - |
| A3-5 | Frosted partitions (`kit.glass` frosted) | Office privacy glazing | Stops sight, jam lines and bullets; passes baked lamp light (the cleaner carries no torch) | All glass as F2 |
| A3-8 | Lobby archways | The office floor's open lift lobbies | Vantage (west), safe end (east) | - |
| A3-6 | Corridor group 30, office groups 31-33 | Office lighting on door switches | Toys, lure | Switch by the door |
| A3-7 | Cleaner's trolley | The cleaner's kit | Cover, the cleaner's job | - |

**A4 Goods Shed**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A4-1 | Security room, monitor wall, console | The site's CCTV office | N3 loop, interrogation | Consoles need their officer down |
| A4-2 | Staff passage under the gallery | The foreman's door to the floor | Connector | - |
| A4-3 | Pallet racking 5.4 m (`noLedge`) | Wide-aisle storage | Cover, loops | Racking is never climbable |
| A4-4 | Pick mezzanine 3.3 m, chequer plate, two stairs | Order-picking floor | High route, loud floor | Chequer plate is loud everywhere |
| A4-5 | Dispatch office, kettle, dock desk | The loaders' office | Guard jobs, lure switch | - |
| A4-6 | Dock wicket (push-bar) | Fire-code exit door in the dock door | Exit (egress) | Push-bars open from inside only |
| A4-7 | Cameras C1-C3 | Warehouse CCTV | The loop | - |
| A4-8 | Groups 40-43 | Room, high-bay, aisle, mezzanine lighting on door / stair switches | Toys, lure | Switch by the door |
| A4-9 | South back aisle (dark) | Bulk-store row on motion sensors, off tonight | Shadow route (mixed zone) | - |
| A4-10 | The kettle in the dispatch office | The loaders' tea point | D2's clock (every 40 s) | - |

**A5 Substation**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A5-1 | Inner security wall to the ceiling | The compound's inner security line | Splits the set | No lip on security walls |
| A5-2 | Cable gateway 6 m + beam towers | Opened for a cable-drum delivery, guarded by IR beams | The throw | Beams are seen only in night vision |
| A5-3 | Beam power panel (high, switchroom face) | The towers' supply | Jam window | Panels are shown in electro |
| A5-4 | Transformer pens, 1.2 m bunds (`noLedge` units) | Transformers in oil bunds | Low cover, loop | - |
| A5-5 | Switchroom 12 x 6 | HV switchgear room | Floodlight mount, lure switch | - |
| A5-6 | Floodlight group 52 | Security flood on the switchroom (photocell) | The light jam | Photocell lamps: no switch |
| A5-7 | Zone control kiosk | The compound's alarm and access kiosk | The release | Releases are red push plates |
| A5-8 | Cable trench edge path | Cable route behind the switchroom | Secret route | - |
| A5-9 | Groups 50, 51, 53 | Apron, inner zone, kiosk panel lighting | Toys | Switch by the door; kiosk on emergency |
| A5-10 | Cable-drum stack 1.8 m | Tonight's cable delivery, waiting at the gateway | Vantage cover, throw spot | - |

**A6 Pump House**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A6-1 | Pumps on 1.2 m plinths | The station's vertical pumps | Low cover, loop, guard job | - |
| A6-2 | Motor gallery 4.4 m, open loading edge at the west end | Motor access platform | Co-op lip (C7) | Open loading edges are co-op lips (P13) |
| A6-3 | Davit box + rescue line | Confined-space rescue kit (real in wet wells) | Two-person rope | Rope points are marked davits |
| A6-4 | Bridge over the drive bay | Crane bridge over the drive | Holder's spot | - |
| A6-5 | Cable gland plate 0.55 m | Cable entry into the drive cage | Hang-down (C8) | Gland plates are hang-down spots only |
| A6-6 | Drive cage, kick panels, push-bar door | Guarded VFD cabinet | Target, no stranding | - |
| A6-7 | Drive panel (hold 3 s, buzzer) | The drive's local isolate key | N4 hold | Hold devices buzz while held (guards hear it once N4's client pulse lands) |
| A6-8 | Outfall door + interlock lamp | Interlocked with the duty pump | Exit gate (flag) | Red lamp = locked |
| A6-9 | Staff stair with handrails | Gallery access by the desk | Way up / down | - |
| A6-10 | Groups 60-63; the dark sump bay | Pump floor, gallery, desk, cage work light; the sump high-bay tagged out | Toys, mixed zone | - |
| A6-11 | Sump bay guard kerb 1.2 m | The old sump's edge protection | Entry vantage (low cover) | - |

**A7 Data Hall**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A7-1 | Rack rows 2.2 m (`noLedge`) | Colocation racks | Cover, loops | Racks are never climbable |
| A7-2 | Cage 10 x 6, terminals T1, T2 | A client cage with dual-control entry | Sync hack | Same terminal look = scanner |
| A7-3 | Hot-aisle containment pod | Cooling containment with end doors | B's side of the split | - |
| A7-4 | Plant corridor, cooling units (`noLedge`), trench grating | CRAC units and the cable trench | B's route, loud floor | Gratings are loud everywhere |
| A7-5 | Entry lobby, glazed doors, fire plan | The hall's airlock lobby | Observe, then plan | - |
| A7-6 | Cameras 1 and 2 | Hall and corridor CCTV | Solo jam tests | - |
| A7-7 | Cage doors and the pod's east door, maglocked | Released by the cage's dual control | Exit gates (`flag` on `a7-sync`) | - |
| A7-8 | Groups 70-73 | Row, aisle, corridor, pod lighting | Toys, lure | Switch by the door; pod on the cage control |

**A8 Strongroom**
| Id | Element | Real-world reason | Gameplay use | Rule |
| --- | --- | --- | --- | --- |
| A8-1 | Oak counters 1.2 m | The banking hall's counters | Low cover, loop | - |
| A8-2 | Public gallery (north wall and west return), cornice 4.4 m, open edge span on the return | The hall's upper gallery | Co-op lip, split; the vestibule under the return | Open loading edges are co-op lips (P13) |
| A8-3 | Public stair (lit front) | Gallery access by the night desk | Alternative way up | - |
| A8-4 | Security office + office stair | The vault company's staff office and stair | N3 loop, way down | - |
| A8-5 | Lighting board under the gallery | The hall's night-circuit isolator | N2, lure | Isolators drive one circuit each |
| A8-6 | Public grille, maglock on the night circuit | Fail-safe grille on the hall lighting supply | The timed lock (`mains`) | - |
| A8-7 | Inner beam curtain | The vault lobby's intruder beams | The throw | Beams seen only in night vision |
| A8-8 | Time-lock panels T1, T2 | Two-person rule for the vault | Sync hack (N6) | Same terminal look = scanner |
| A8-9 | Vault door, vault (back open to the dock), cash dock | Cash-in-transit route | Exit zone | - |
| A8-10 | Cameras C1-C3 | Bank CCTV | The loop, the cross-level jam | - |
| A8-11 | Groups 81-84; the dark vestibule | Night circuit, gallery, office, time-lock lights; the vestibule unlit under the return | Toys, mixed zone | - |

## 19. Engine questions for Phase 0
Re-grep in slice 0 (Phase 0) and write the answers with file:line into `docs/marlow-final/ENGINE-ANSWERS.md` (the
Phase 0 agent); any design change that follows goes in STATE.md "Decisions" and, if it changes a set, a line in that
set's sheet here. Questions 1-13 are answered (ENGINE-ANSWERS.md, 2026-10-23) and folded into this spec and into
CONSTRAINTS section 2; 14-16 stay open for slices 0d / 0g.
1. Every CONSTRAINTS section 2 constant. Answer: all values confirmed; line moves and six substantive corrections are
   now in CONSTRAINTS section 2 (guards close doors, G41; camera IR covers players only; nav layers; auto lips by world
   Y; revive; perf).
2. A Course-mode guard with a `route` (N7). Answer: patrols, perceives, follows a switch / isolator / shot-lamp lure
   (not a jam) and fights; with `em.stealth` false he never searches or cools down, so A8 sets it true (section 13).
3. Per-set `ambientZone` at 0.14 under the 0.30 theme. Answer: yes; whole-metre edges, `minY` -1, `maxY` ceiling - 0.1,
   upper levels their own zones (section 7).
4. Squad despawn before spawn. Answer: yes, but bodies stayed; 0a switches to `em.despawn` (section 14 N7).
5. `TEAM.ladderGrab` 4.1 vs the 4.4 lips. Answer: moot; leg-up to 4.5, relay to 4.6, `ladderGrab` unread (section 12).
6. The revive height rule. Answer: an interactable on the body, 1.6 m horizontal, under 1.5 m of height (section 12).
7. Glass (N10, P17). Answer: `kit.glass` (an invisible collide box in the static body) stops bodies, bullets, guard and
   camera sight and jam lines, passes baked lamp light, offers no window prompt; a guard's torch is blocked for the
   meter but drawn in the picture; no see-through pane blocks light (sections 5, 14 N10, 18 F2 / A3-5).
8. The jam line through a cage or grille. Answer: `b.fence` mesh passes it (and sight) but is climbable; collide boxes,
   kit glass and shut doors stop it. A7's cage is fence mesh with a lid and locked anchors; nothing is planned through
   the shut A8 grille (sections A7, A8).
9. The `mains` relock and a player in the doorway. Answer: the relock never shuts a door; an opened grille stays open
   until a player closes it; guard auto-close checked only the host, and 0a adds the remote players (section A8).
10. The scanner panel height rule. Answer: per panel floor since N6; A7 and A8 panels at y 0 pass. No change.
11. The dual takedown. Answer: any two takedowns finished by different players within 1.5 s; banner only, no course
    flag (an objective gated on it would need a ~5-line flag hook; none is planned while it stays optional, P10).
12. `holdNoise` on a course hold device. Answer: host-only; N4 ships without it, a client pulse follows (section 14).
13. Corridor and aisle widths under the shoulder camera. Answer by the numbers: they fit; camera spaces per set
    (section 13); the GPU shot is pending on Character Build.
14. Sliding doors (N9): with `leaf: 'slide'`, which door verbs still assume a swing (committed open, crack, peek, bash,
    the light / sight closed-leaf test, `lightField.ts:336-345`)? Do course airlock locks drive a slide door unchanged?
15. Does a course `pickup` / console press by the client and a role claim (N1) reach the host in the same tick order as
    the host's own presses (no claim race)?
16. Kit LED accent lines: confirm they re-read on `LightRegistry.version` so an isolator's 15 s cut darkens them on
    both pages (N11).

## 20. Phases
The template's phases, as M2 and G87 run them (no stops for Michael; the job lead's loop per slice; PLAN.md has the
slices):
- **Phase 0** (slice 0): the section 19 answers, the section 14 code (N1-N4, N6, N8, N9), the map scaffold
  (facility shell, holding rooms, stub sets that walk end to end), the test and e2e frames, the facility plan SVGs
  (`plans/facility-ground.svg`, `plans/facility-gallery.svg`), then the shell's dressing.
- **Phase 1-2** (this spec): building brief, routes, set sheets, guard jobs, register, proposals. Missing LD 13
  deliverables (per-set floor plans and `*-gameplay.svg` overlays, the full guard sheets, coverage table, tool / problem
  matrix, metrics check, self-critique, playtest checklist) are written per set by its builder into
  `docs/marlow-final/sets/<set>.md` and `docs/marlow-final/plans/<set>-ground.svg` / `<set>-gameplay.svg` before that
  set's greybox (one file set per set, so parallel builders never share one); `scripts/plan-svg.mjs` renders the built
  set for the comparison (LD 14 Phase 3).
- **Phase 3..n** (slices 1-8): per set, greybox + lights baked + guards + one e2e route, then dressing with the kit
  straight after (M5).
- **Verification** (slice 9): the full route e2e, revive per co-op surface, perf and GPU shots via Character Build,
  docs.

## 21. Future recommendations
Not built here; one line each on how they would fit.
- **Living key** (force a held guard onto a scanner, CR-S21): the grab menu stub (`grabMenu.ts:25`) plus a scanner that
  accepts a held guard; A7's cage is the natural second solution. Wire claim: a bump.
- **Throw-landing knockout** (CR-S4): ~30 lines in `onTeamMove`; A5's patrol passes the landing.
- **Hang-down neck-snap and hide pose** (CR-S10): in `runHang`; A6's attendant passes under the gland plate.
- **G44 look-up penalty**: ~15 lines in `perception.ts`; frees the A6 and A8 high routes from heavy occluders (P8).
- **Joint interrogation** (G148, CR-S32): host flags; the A8 officer. Built (joint-interrogation): BLUFF + INTERROGATE,
  the A8 officer's two joint lines and flag `a8-joint` (no consumer yet: a later keypad, G143).
- **Operator and spotter** (CR-S23): a pump-house crane in A6; needs a remote-control device.
- **Wire cut** (CR-S24): a scanner-pair variant with a per-run live wire in thermal; A8's time locks.
- **Keypad with a per-run code** (G143): a code device read from the A4 officer's interrogation.
- **Alarm consequences in Course mode** (reinforcements, P5; radio checks need squad rosters, alarm runners need
  panels).
- **A dual-takedown course flag** (~5 lines from `takedownDone`), if Michael wants the A4 / A8 pairs required.
- **Guard avatar** (M6): a later roadmap item; the same job can give the gallery its seated instructor figures (N14).
- **Client shots on lamps and cameras**: the host's `onShot` handles enemies and players only, so a client's shot lamp
  relights within 2 s and a client cannot shoot a camera; a `shot` claim plus the `dn` mirror in the course message
  (wire bump). Until then no exercise needs a shot (section 7).
- **Guard relight** (CT): the lured guard switches the light back on (~100-130 lines); would shorten A2's and A8's
  windows naturally.
- **Two-key console, rope lowering with side steering, world countdown clocks** (SCENARIOS Areas 3, 7, 8): the N1 line
  shows the seconds today.
- **Automatic sliding doors** (gap 7c): proximity open for the holding-room doors.
- **Zone-based area advance** (gap 6c, N13): for a later map without holding rooms.
- **Set signage plates and the amber door-status pulse** (KIT.md 6).

## 22. Report format
Per slice and at the end: files changed (one line each); decisions; checks run with their summary lines (never claim a
check not run in that slice); anything left undone; manual desktop checks per set for Michael (also in `TESTING.md`,
desktop only, G12); then message the job lead and stop.

