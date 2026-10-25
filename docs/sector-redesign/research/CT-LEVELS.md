# CT co-op levels - lessons for a 5-section Sector Ops level (M1)

Research note for the sector-redesign job (2026-10-23). Repo research only, no web. Sources: `docs/ct-research/`
(levels-digest LD, moves-mechanics-digest MM, design-kit-digest DK, kit-design-digest KD), `docs/level-design.md`
(LS), `docs/templates/map-spec.md`, `docs/design-bible.md` (5.1, 5.7, 7), `docs/DECISIONS.md`. Confidence marks
follow the digests: [C] confirmed, [1] one source, [I] inferred, [?] unknown, [A] analysis. Scrubbed (G6): no
reference-game names; "CT" names the reference.

Michael's M1 asks, used as the checklist: larger, up to 5 sections; more guards per section; security that ramps;
shorter camera range; co-op-only pathways, still completable solo; flowing layout; every laser and camera has a reason;
all guards armed; guards interact and have reasons; careful planning and observation; believable lighting, players
make their own shadows.

Assumptions logged (no questions asked):
- R-A1: Sector Ops is solo or co-op (G185), so LS section 11 (solo first, co-op routes on top) is the right frame
  here, not the co-op-only campaign rule (G2, G253). Undo: if Michael wants Sector Ops co-op only, co-op pathways
  become required gates (CT style) and the solo bypass rules below drop.
- R-A2: CT's continuous Xbox / PC missions are the model for flow; the PS2 / GC sub-level split is the model for
  section size and checkpoints (G186 connectors already match it). Undo: none needed, it is a reading.
- R-A3: Where our decisions differ from CT (cameras see in the dark G240, red camera grid G222, alarm level 0-3 in
  bible 5.7), the decision wins and the lesson is adapted, noted inline.
- R-A4: Michael's answers M6-M10 (BRIEF, 035f6d32) bind: corporate research campus, one co-op run 30-45 min, guards
  rising to 24 in S5, lit like a real site, dogs included (M10 overrides G155's "no dogs" for Sector Ops only; Sector
  Ops is not a campaign mission). The repo holds only CT's co-op research; CT's solo levels are not digested here, so
  the corporate bias below uses the co-op office, lab and tower levels. Undo: re-run with solo-level research.

## 0. CT's corporate, office, lab and tower levels (the M6 bias)

The co-op levels closest to a corporate research campus, and what each gives the spec:
- **Panama, an administration building at night** [LD 2.2]: offices with wall switches, a security office, an
  official's office at a floor's far end, archives, a double-height exhibition hall, a server room. Lessons: office
  lights are on switches by the door and guards come to fix them; the asset (records, servers) sits deepest, behind
  keypads, a camera corridor, a dual-scanner door and a laser grid; entry and exit share a window by different paths;
  about 22 guards in the whole building.
- **Chemical Bunker, a lab complex** [LD 2.4]: labs on two floors, a control room that opens the main lab, a mini lab
  with a keypad fridge, a cryo chamber visited twice, a hub room, a camera by a lift. Lessons: lab doors are opened from
  a control room (one inside, one waiting); technicians are unarmed staff, guards are armed; a recipe chain of
  objectives moves the pair through the labs; emails explain the safety rules (two-person mixing, paired hot wires).
- **Nuclear Plant, a research complex of two buildings** [LD 2.6]: turbine hall, main control room behind a retinal
  door, an outdoor footbridge through a laser corridor to a lab, a lab server room reached by a ceiling trapdoor.
  Lessons: two buildings and a bridge give a natural section break; the laser corridor protects the link between them;
  its warnings: low objective density over a long route, an unreadable machine (A4).
- **UN HQ, a tower at night** [LD 2.7]: roof entry by rappel to a window-washing platform, top and middle floors
  (technical room, data, control-room terminal), a security control room on the 22nd floor, lifts and service lifts,
  a metal detector, a second building with the hall. Lessons for a penthouse / executive floor: enter from the roof
  down; a control-room keypad code read by watching a guard type it (stick-cam) [1]; the security room is a goal in
  itself; warnings: stacked instant fails and a hidden timer (A14, A15).
- Common campus pattern: public or office floors lit and staffed, service spaces (ducts, plant, risers, roof, docks)
  dark and unguarded as the hidden network [DK 1.6]; signage in public areas, none at the critical rooms; security
  layers perimeter -> site -> building -> asset.

---

## 1. Structure

**How CT chains areas.**
- Xbox / PC: one continuous level per mission, 15-25 rooms, joined by quiet connectors (stairs, ducts, sewers, lifts)
  [LD 2.2-2.5]. PS2 / GC cut the same missions into 4-5 sub-levels of 2-11 min each, saved between them [LD 2.8].
  Our 5 sections with connector rooms (G186) are the PS2 / GC shape with Xbox room density inside each section.
- Chaining is by fiction: each objective reveals the next place (archive wiped -> server backups; double -> real
  target) [LD 1.4, DK 1.8]. Each section needs a reason to go on to the next, not just a door.
- Spatial devices CT reuses [LD 3.2 end]: entry equals exit by a different path (Panama loop); a hub room revisited
  (Bunker operating theatre); foreshadow and return (missile hall seen from an overlook, lights shot from there, entered
  last); one-way drops and commitment doors after key beats; two buildings and a bridge (Nuclear Plant); top-down
  infiltration (silo, roof).
- Generic mission shape [LD 3.3, KD 3.3]: quiet exterior or service entry with a soft co-op move -> low tension
  (keypads, switches, small jams) -> peak 1 (first big sync) -> twist -> rest (dark service space, medkit) -> build
  (bigger, more open spaces) -> peak 2 climax -> short exit or a deliberate reverse route.

**Area length and size.**
- Panama ~8-11 min ghost, 16-35 min stealth, about 20 route steps; a "step" is a room or corridor of 1-3 guards
  [LD 2.2]. So one step is about 1-2 min of careful play.
- Pumphouse Nine room sizes as a size guide [LD 4.1]: yard 20 x 15 m, corridor 25 x 3 m, office 8 x 10 m, gallery
  30 x 8 m, pit 10 x 10 x 5 m, main hall 20 x 30 m with an 8 m mezzanine.
- Pacing targets [DK 1.7]: small co-op beat every 2-4 min, set piece every 6-10 min, rest 30-90 s after each, a
  checkpoint before each set piece, replay loss under ~10 min, extraction under 2 min.
- For 5 sections and M7's 30-45 min run: about 6-9 min of careful play each, growing toward S5; each section 3-5
  encounter spaces plus a connector, one set piece per section from S2 on, one signature set piece in the run (S4 or
  S5), a twist at 40-60% (S3).

**How security ramps** (CT does it by density and by kind, not by bigger numbers on the same device).
- Panama: keypads -> camera corridor -> dual scanner door -> laser grid with a remote breaker [LD 2.2 design reading:
  "security devices grow denser along the route"].
- Training: the order of interdependence rises: boost -> jam-and-swap -> throw -> hang-down -> sync -> continuous
  partner control [LD 2.1].
- Access control grades toward the asset: keys or cards, then two factors, then mantraps or dual control [DK 1.6].
  Security layers outside-in: perimeter, site, building, asset [DK 1.6].
- Lock pin counts rise across the campaign (2-4 early, 5, then 6) [MM 2.8].
- Guards: single guards and pairs early, overlapping coverage and watchers on high posts later (temple balcony
  watcher over a demolition site) [LD 2.3].
- Alarm consequences escalate, never abort (G125): CT stage 1 freebie, 2 body armour, 3 helmets, 4 permanent high
  alert with fortified positions [MM 2.5]. Ours: bible 5.7 level 0-3 (torches, armour and helmets, reinforcements).
  Some rooms open only when an alarm is raised (a guard room that releases extra guards) [LD 2.2] - a good
  consequence for a late section.

**Checkpoints.** CT had none on Xbox (manual saves; full restarts were the top complaint, A1) [LD 3.5]; PS2 / GC saved
between sub-levels. Our rule: encounter checkpoints, ~10 min cap, both down reloads (G126, G188); the connector is the
checkpoint (G188), placed in the dark out of every guard's view (LS 3.9).

## 2. Purpose: devices with a reason

**What CT devices protect** (every documented device guards something specific):
- Camera covering the route to a high-value room: the "broken elevator" corridor toward the 3F offices; the server
  room camera watching the computer (beaten by shooting the light near it) [LD 2.2]; a camera by the lift into the
  cryo chamber [LD 2.4]; the Pumphouse corridor camera covering the route to the control floor [LD 4].
- Lasers on a vault or a hazard approach: the exhibition-room floor grid in front of the server backups, with its
  breaker inside the grid and an in-level email explaining why it is only reachable remotely [LD 2.2]; the laser
  corridor before the bunker labs [LD 2.4]; the tripwire between paired bombs [LD 2.5]; Pumphouse's tripwire "after a
  theft", reset panel on the far side, facilities email complaining [LD 4].
- Scanners and keypads at the asset: dual retinal doors at the archive, the lab storage, the control rooms
  (two-person rule) [LD 2.2-2.6].
- Motion sensors in rooms that are empty at night (two Panama rooms; a motion-sensor automatic door) [LD 2.2].
- Turrets only at military sites (Seoul hotel, the boat) [LD 2.3]; ours only at compounds (G128).
- A security office whose guard leaves to fix the hall lights [LD 2.2]; a computer that disables the camera system
  [LD 2.4] - the "security room" of G238.

**Typical patterns to copy.**
- Camera on a corridor end looking down its length toward the door it protects (jam-and-pass gate) [LD 2.1, 4].
- Camera watching a terminal or a safe, not an empty floor (jam and hack) [MM 1.7].
- Lasers in front of the asset, with the reset or breaker on the far side and visible from the near side (throw with
  far-side release; fixes A3) [LD 4.3].
- Lasers mostly where nobody should walk at night: vault floors, tank walkways, service corridors to a lab.
- Guard post at the choke point the camera does not cover (the dual scanner door, the gate) [LD 2.2].
- The device's weak side has a cause in the fiction: renovation, budget cut, contractor shortcut, staff habit
  [DK 1.6] (Pumphouse: grating removed, panel on the wrong side).

**Real-device placement** [DK 1.6]: door contacts on doors; motion sensors in corners about 2.3 m up, armed when the
space is empty; infrared beams mostly outdoors or across approach corridors; cameras with detect / recognise /
identify ranges, blind spots with a real cause; supervised wiring (a cut raises a fault, not silence). Ties to M1's
camera range cut: a camera covers its protected door or aisle, not the whole hall (cone ends at the far wall of its
zone; the range engine change is `feature/camera-range`).

**Anti-patterns** (M1: "no random lasers or cameras for the sake of having them"):
- A security device with no reason to be there; a room with no purpose [LD 3.5 red flags, LS 16.0].
- Security out of proportion to the room's value; valuable rooms that are easy to reach (LS 16.6.2).
- A solution above or far from its problem with no tell (Panama grille keypad reached from a vent; washroom ceiling)
  [LD 3.5 A3].
- Machine state unreadable (the turbine fans) [A4]: every breaker, laser and camera shows on / off and its control is
  near or visibly linked (cable run, lit panel, sound on change).
- Lethal or instant failure from a device (bomb laser = fail) [A5, A15]: our lasers raise an alarm stage, never kill.
- Cameras whose cone reaches outside the space they protect (M1's own complaint).

## 3. Guards

**Armed.** CT co-op guards carry firearms and draw weapons on an alarm; no melee-only or heavy archetype exists in CT
co-op; armour and helmets come only from alarm stages [MM 2.5, 2.6; G155]. Technicians and staff are the unarmed
people [LD 2.4]; ours are civilians who flee to a guard or alarm (bible 5.7). M1 "they should all have weapons" is
CT: every guard archetype placed carries a rifle or pistol.

**Patrol types CT shows** [LD 2.2-2.5, MM 2.7]: single room guards; talking pairs (technicians overheard from an
overlook, Bunker); a guard asleep in a chair; a guard who arrives by lift beside a camera; officer plus two escorts;
a high watcher on a balcony covering an open arena; walkway pairs that can be taken together; a courier and bodyguard
on a script; investigators who walk to dead lights and noises. LS 4.2 mix: static post, sentry sweep, loop,
back-and-forth, talking pair, investigator; no two adjacent spaces with the same mix.

**Guards interacting** (M1: "guards should interact with eachother"):
- A guard leaves the security office to fix a light switched off in the hall; a guard comes to fix the archive light
  while a player searches [LD 2.2] (light lure as protect-while-act).
- A guard who finds a knocked-out colleague kicks him awake (and is himself an opening) [MM 2.7].
- Searching guards form impromptu search teams, talk to each other, use flashlights and flares [MM 2.7].
- Missing patrol partner triggers a radio check (bible 5.7, the CT form; a tour-checkpoint supervisor check is the
  kit's non-CT variant, DK 3.3, Michael to decide) [DK table line 452].
- Conversations as an event wait and an intel source (technicians, the payphone call) [LD 3.2 #14].
- Shift change: not documented in CT [?]. If used, it is our invention: log it as such (R-A5) and keep it clockwork.

**Reasons for posts.** Every guard has an employer, a job and a reason at each stop (LS 4.1, 16.8.2): rounds, gauge
reading, a post at a door, a smoke break, loading a van. CT's posts are at the thing protected: the official's office,
the scanner doors, the vehicles being guarded, the boat [LD 2.2-2.3].

**Observation windows** (M1: "careful planning and observation").
- LS 3.1: every space opens on a dark vantage from which every guard is visible within one cycle.
- LS 4.3 clockwork: cycles 25-45 s, stops 3-6 s, coverage gaps 3-8 s, no randomness that defeats planning (bible 5.7).
- LS 4.4 isolation moment: each guard alone, dark and unwatched once per cycle; LS 4.5 overlap: someone covers someone,
  so the order matters.
- CT overlooks used to plan and prepare: the Bunker overlook where both hear the technicians and shoot the hall's
  lights before entering [LD 2.4]; Pumphouse stair-core window onto the finale [LD 4.1 beat 4].
- Simultaneous takedown of a pair: if one acts early the other reacts [LD 3.2 #15] - a co-op observation payoff.
- Two intruders: guards know only what they saw (G139).

**Guard counts.** CT is sparse: Panama about 22 guards across the whole mission (about 1-3 per room) [LD 2.2]. M8:
low in S1, rising to 24 in S5 (cap 32, G187; awake cap report 12 / 16 / 24, G274). Lesson: more guards means more rooms
and more jobs, not denser rooms; keep 1-4 per encounter space with overlap, and spend the rest on posts, pairs and
response guards behind alarm-released doors (which also keeps the awake count down until an alarm).

**Dogs (M10).** CT co-op has no dogs on any platform; none appear in the co-op research [MM 2.6, ?], hence G155 for
the campaign. M10 adds them to Sector Ops as part of the ramp ("then dogs and armed response"). No CT lesson to copy,
so the spec invents and logs: dogs arrive late (S4-S5) with a handler (a reason: a site patrol team), never alone in a
room nobody walks; they carry no flashlight (G201); the code already has a dog archetype (code-inventory line 129);
treat them as a section's top tier with the armed response that alarms release.

## 4. Co-op pathways

**CT's co-op-only moves** [MM 1.1-1.13]: boost and boost-and-climb (ledge relay), partner throw, dual rope, hang-down,
shoulder stand, jam-and-pass, sync actions (paired scanners, switches, wire cuts), captive as key, joint interrogation,
operator and spotter, simultaneous takedown, carry and escort. Ours today: brace and boost, human ladder, dual
takedown, the held jammer (G152), plus what the prototype adds; team moves anywhere with room (G151).

**Set pieces and how required they are.** In CT almost every beat was required on the guide route, but CT left solo
leaks: one player could hack both scanners (at a health cost) or run both mixing stations [LD 2.1, 2.4]. Optional
co-op in CT: the throw onto courtyard guards, the stairwell rail pull, the boat sabotage, side rooms behind codes
[LD 2.2, 2.3]. Seoul shows a mission fully co-op without any sync lock [LD 2.3].

**Solo coexisting** (M1: "co-op only pathways but still able to complete solo"; earlier "true 2-player pathways that
cannot be used solo, but doesnt break solo play").
- LS 11.1-11.5 is the frame (R-A1): co-op routes are extra routes on top of a full solo route; one map build;
  co-op lips at 4.3-4.5 m (above solo reach `WALL_JUMP.maxUp` 3.8 + 0.5, within `TEAM.boostMax` 4.5); every surface a
  co-op route reaches is also reachable solo by another route; no locked-door teases.
- The co-op path should be the better trade, not the only one: shorter, safer, or reaching an overwatch, a takedown
  from above, or an optional objective. Solo takes the longer shadow route through the same pinch point (LS 3.3).
- Use the co-op forms that are real two-body needs: a 4.3-4.5 m window or roof hatch (boost-and-climb); a camera that
  one player cannot both jam and pass (jam-and-pass: solo instead goes round it, darkens its light, or uses the
  security room); a sync door to a shortcut while solo takes the long corridor.
- Never a co-op puzzle one player can solve alone by brute force (CT's scanner leak) and never a solo player stranded
  by a co-op-only drop (LS 11.4).
- Prior finding: R2 (sector-fixes) proved two co-op routes solo-reachable (G267) - every co-op lip needs a reach check
  against the solo moves, not just the boost number.

## 5. Lighting

**CT's mix.** Interiors at night with lit offices, halls and corridors and dark service spaces [LD 2.2]. Light is the
main tool of every route ("make-your-own-dark" in every mission [LD 3.1]): wall switches in offices, shot bulbs,
chandeliers, neon signs, lampposts in a courtyard, a lit billboard, an X-ray light board, a lift car light shot while
riding [LD 2.2-2.5]. Panama starts with shooting out courtyard lampposts; the repair yard says "kill all lights, take
guards in the dark" [LD 2.2, 2.5]. Dark rest spaces after peaks (the fish-market store, the sewer) [LD 3.3].

**Tools to change light.** Switches, shooting, the held jammer on a light (hold while the partner drops or passes)
[MM 1.7], breakers (Pumphouse breaker cupboard lure) [LD 4.1], generators as noise masking that a switch removes
(bible S2). Killing a light alerts nearby guards, who come to fix it - a lure and a choice, not free darkness
[MM 2.7, LD 2.2].

**"There shouldnt always be shadows, the player may have to make shadows".** This is CT: the levels are lit where
people work at night and the players create the dark lanes (LS 5.1 "every lit pool has a visible source and a
switch"; LS 5.2 "every lit chokepoint can be darkened two ways"; bible L8). The level should present lit working
areas with a visible cost to darkening them (a guard comes to fix it, a camera still sees: G240), and dark only where
nobody works (stores, plant, unlit yards). M9 confirms it: lit like a real site, players cut lights, dark zones only
where believable. On a research campus at night: lobby, security desk, labs running overnight, server rooms and car
park lit; closed offices on motion or switched off; plant, risers, roof and service yard dark. Lessons:
- Light the protected spaces (security office, server room, loading bay at work); leave corridors between them mixed.
- Prepare-a-room: let players darken a space in advance from an overlook (Bunker missile hall) [LD 2.4].
- A light-out must send the fixer somewhere useful (LS 4.6), and a switch by the door is a real ambush spot.
- Our cameras see in the dark by IR (G240), unlike CT where darkness alone beat ordinary cameras [MM 2.7]: so light
  is for guards and the meter, cameras need the jammer, a route round, or the security room.
- Lighting rule loosenings are a separate proposal (`docs/archive/lighting-review/PROPOSAL.md`, M5); nothing here changes LS.

## 6. Flow

- **Branching.** LS 3.2: shadow, high and loud route per guarded space, a secret route in half of them, all rejoining
  at a pinch point (LS 3.3). CT adds parallel routes that re-merge (either side of a parked train; high vs street)
  [LD 3.2 #10] - natural co-op splits with a named merge point, under ~3 min apart [DK 1.7].
- **Loops.** CT's Panama is one big loop (entry equals exit) with optional loops behind codes [LD 2.2]; LS 3.4 needs a
  loop on every shadow route so a seen player can break line of sight. No dead ends on stealth routes.
- **Hub.** A hub room revisited from different sides (Bunker operating theatre) gives a mental map [LD 2.4]: a
  candidate for the middle section.
- **Sightlines.** Long sightlines used on purpose; corners and doorways are the decisions between them (LS 3.7).
  Landmarks and the climax space visible early (DK 1.4 #24): an overlook onto section 5 from section 3 or 4.
- **Vantage points.** Dark entry vantage per space (LS 3.1); overlooks before major encounters, sized for two (DK 1.4
  #23); height is safety and information, guards see poorly above them (G44). A hostile vantage (a watcher on a
  balcony) is a puzzle in itself [LD 2.3].
- **Quiet connectors** between spaces: a stair, corridor or duct with a glimpse of the next space (LS 3.8) - our
  section connectors double as checkpoints.
- **Commitment.** One-way drops or doors after key beats stop backtracking and mark progress [LD 2.4, 4.1 beat 7].
- **Flow anti-patterns**: zig-zag partitions that force a path (LS 16.6.1); vents that go nowhere (LS 16.3.4); low
  objective density over long traversal (Nuclear Plant) [LD 3.5].

## 7. Ten design rules for the spec

1. Five sections, each 6-9 min of careful play, 3-5 encounter spaces and a dark connector checkpoint; the run 30-45 min. (M7, LD 2.8, DK 1.7, G126, G186)
2. Security ramps by kind, layer and guard count per section: keypads, lights and cameras, then lasers and alarm panels, then dual control at the asset, dogs with handlers and armed response last, guards rising to 24 in S5. (M8, M10, LD 2.2 design reading, DK 1.6)
3. Every camera, laser, sensor and lock has a register row naming what it protects and why there, with a weak side that has a cause in the fiction. (LD 2.2 laser email, LD 4 Pumphouse, LS 16.9, DK 1.6)
4. A camera cone covers its protected door, aisle or terminal and stops at that zone's edge; never the whole hall. (M1, DK 1.6 detect / recognise / identify)
5. Lasers raise an alarm stage, never kill; their reset or breaker is visible from the near side and its state readable. (LD 3.5 A3 / A4 / A5, LD 4.3)
6. Every guard is armed and has an employer, a job and a reason at each stop; mix post, sweep, loop, pair, investigator, no adjacent repeat. (MM 2.6, G155, LS 4.1-4.2, 16.8.2)
7. Guards interact: talking pairs, a fixer who answers a dead light, a colleague who wakes a downed guard, a radio check on a missing partner, a guard room that opens on alarm. (LD 2.2, 2.4, MM 2.7, bible 5.7)
8. Each space opens on a dark two-person vantage; cycles 25-45 s with a named isolation moment and overlap, so the order of takedowns is a plan. (LS 3.1, 4.3-4.5, DK 1.4 #23)
9. Co-op pathways are extra, better-trade routes (4.3-4.5 m lips, jam-and-pass gates, sync shortcuts) over a full solo route to the same pinch point, each reach-checked against solo moves. (LS 11.1-11.5, G185, G267)
10. Work areas are lit with a visible source and a switch by the door; dark only where nobody works; every lit chokepoint can be darkened two ways and darkening it draws a guard somewhere useful. (LS 5.1-5.2, 4.6, bible L8, LD 3.1 make-your-own-dark)
