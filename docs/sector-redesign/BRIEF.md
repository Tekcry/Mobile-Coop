# sector-redesign - brief

Job lead: Night Shift | Course Ready Build. Branch `feature/sector-redesign`, folder `C:/NightShift/Mobile-Coop-sector-redesign`,
cut from `feature/sector-fixes-r2` 5bfbf85d (the r2-nav bolted-door nav closures and the r2-bolt unbolt reach cap) merged
with master 4.63.1 (d21f4eda). Started 2026-10-23 ~01:45. Report to "Night Shift | Orchestrator".

## Michael's words
- M1 (2026-10-23 ~01:35, verbatim): "regarding sector ops, i want to make it larger and with more sections (5 max),
  accomodate more guards in each section, more security that gradually gets harder, cameras need to have less range
  (they currently pick the player up well outside of the intended area), should have coop only pathways but still able
  to complete solo if someone wanted to. doesnt have to keep the same layout or warehouse map. level design must be well
  flowing, no random lasers or cameras for the sake of having them, why would they be there in that location, what are
  they protecting, why would there be melee only guards they should all have weapons, guards should interact with
  eachother and have reason to what they are doing or protecting. must take careful planning and observation to pass.
  review lighting also, i think the rules may be too strict and the levels are very dark and unrealistic. there
  shouldnt always be shadows, the player may have to make shadows (disabling lights etc). ask me questions as needed"
- M2 (~01:40): "Stop r2, fold into redesign": r2-nav / r2-bolt engine fixes kept; the r2 warehouse geometry work
  (r2-paths, r2-jump) stopped, its findings kept as spec notes (docs/archive/sector-fixes/r/R2-PATHS.md, R2-JUMP.md).
- M3 (~01:40): "Parallel, own session": Course Ready leads this job and drops the marlow-final second-builder role;
  Marlow Yard and mocap keep first claim on the laptop.
- M4 (~01:40): "Plan, then build": research, then SPEC.md (from docs/templates/map-spec.md) and PLAN.md for up to 5
  sections, then greybox slices straight on. Michael reviews both in the morning.
- M5 (~01:40): camera-range cut and lighting rule review on "All maps": the range cut is one engine change (its own
  small PR, `feature/camera-range`; keep off ctDevices.ts / securityRoom.ts, owned by Menu Notes tonight); the lighting
  review is one proposal for Michael, shared with Menu Notes' lighting agent in `docs/archive/lighting-review/PROPOSAL.md`
  (on origin/feature/marlow-final): loosenings proposed, never applied without his approval.
- Earlier, kept: 2026-10-23 ~00:45 "true 2-player pathways that cannot be used solo, but doesnt break solo play".

## Goal
A larger Sector Ops level of up to 5 sections: security that ramps section by section, more guards, all armed, each
guard, camera and laser with a stated reason (what it protects, why there), guards that interact, co-op-only pathways
that a solo player can bypass by a normal route, flowing layouts that reward planning and observation, believable
lighting where players make their own shadows. Prototype first (CLAUDE.md current goal): greybox, basics only.

## Limits
- docs/level-design.md and docs/templates/map-spec.md change only with Michael's approval: proposals go in
  docs/archive/lighting-review/PROPOSAL.md or a "Proposed loosenings" list in SPEC.md.
- Hard rules (CLAUDE.md): no runtime network, light parity, gameplay never reads graphics state, hot paths allocate nothing.
- Sector Ops stays low priority for the laptop behind Marlow Yard and mocap.

## Michael's answers (2026-10-23, through the orchestrator; M2-M5 above are his 01:40 answers)
- M6 (Q1 setting): "Corporate research campus".
- M7 (Q2 run length): "30-45 min" (one co-op run).
- M8 (Q3 guards): "up to 24, each section should gradually get harder with more guards and more security." S1 low,
  rising in each section. Counts now G328 / G362: S1 15, S2 18, S3 20, S4 25, S5 26 at two players; 3-4 players add
  tagged extras (G331); cap 32 (G332); campus-greybox v2 builds them (FOLDED-PLAN J17). Read the guard-cap report
  (12 / 16 / 24 awake) and flag perf risk; do not cut the count.
- M9 (Q4 lighting, not asked; the orchestrator took it from M1 "there shouldnt always be shadows, the player may have
  to make shadows (disabling lights etc)"): lit like a real site, players cut lights, dark zones only where believable.
- M10 (Q5 security tools): "Include guard dogs": cameras, lasers, alarm panels, keypads, then dogs and armed response.
- M11 (~01:25, through the orchestrator): "Keep both": the Warehouse stays selectable as a second Sector Ops map,
  never delisted.
- M12 (~01:50, verbatim): "regarding new sector ops map also, make sure there are sections where at least one guard is
  unavoidable to reach the objective/exit. they must be distracted, knocked out, or killed. flexible to your suggestions
  with that also." Orchestrator's suggestions, to log as assumed (undoable): at least 3 of 5 sections have a choke
  where the only route passes a posted guard with sight of it (e.g. a staffed checkpoint door, a lab airlock with two
  facing guards (co-op sync takedown, or one distracts while the other slips), a vault door guard who never leaves
  post); each choke clearable solo (distraction or a single takedown), co-op gives an easier option; an e2e assert per
  choke (no nav route from the entry to the objective with that guard's view cone as a blocker); tell Guard AI Build
  which guards are posted and which distractions must still pull them (data shape).

## Questions sent to Michael (~01:50, through the orchestrator)
Q1 setting, Q2 run length, Q3 guards per section, Q4 lighting default, Q5 security tools. Answers land here as M6+;
unanswered by ~02:05 -> assumed decisions below.

## Assumed decisions
(A1, A2, ... with how to undo; added as the job goes.)
Spec writer, 2026-10-23 ~03:00 (SPEC.md / PLAN.md; A1-A7 adopt CONCEPT.md section 6, refined):
- A1 Names are new (Orrin Systems, Saltmarsh Park, Larchmont Guarding, Tidewater): a Sector Ops site, not a campaign
  mission. Undo: rename, or move the site into a story district.
- A2 Dogs in S4 (1) and S5 (2), each at an armed handler's heel; dogs stay melee (an animal: M1 "all armed" read as
  every human guard). Against DEC G155 for Sector Ops only (M10 newer; Sector is not the campaign). Undo: each dog
  becomes a grunt patrol.
- A3 No runners, heavies, snipers or droneOps; armour only on enforcers (response team, supervisors). Undo: swap kinds.
- A4 Keypad codes are found in the level (overheard, a handover board, the S2 BMS hack), never typed. Undo: keys.
- A5 Every co-op lip meets SPEC "Co-op-only reach" rules 1-8 (tables, benches, cars kept >= 4 m off). Undo: none.
- A6 No motion-sensor (PIR) lights in the first build; "PIR off" rooms are simply unlit. Undo: add PIR later.
- A7 Guards 8 / 12 / 16 / 20 / 24, `perStage` 2, `alarmMax` 3 (S5 peak 30 <= 32). Undo: data.
- A8 One map `campusOps` (new id, new stars record; main-menu stars at `src/main.ts:151` to point at it). Why: sections
  are native data, one live at a time (ENGINE fact 1); per-section maps need an L-size swap system. Undo: chunks (EW-L1).
- A9 (replaced by M11 "Keep both"): Warehouse Ops stays listed as a second Sector Ops map, never delisted; campusOps
  joins the Sector selector beside it once S1-S3 plays.
- A10 Encounter spaces use a 0.14 standby fill (LR7's number), connectors / transit 0.30: a map choice, not an LS
  change. Undo: ambient 0.30 (cut circuits then never read dark).
- A11 Breakers and boards are `MapDef.switches` at the real board until EW8 builds an isolator device. Undo: n/a.
- A12 The S5 roof marksman is a grunt with a rifle, not a sniper (no G155 / test exception needed). Undo: sniper kind.
- A13 The element register (LS 16.9) is in SPEC for S1; S2-S5 registers are written in each slice's build sheet before
  that slice builds. Undo: write them all now.
- A14 SPEC fixes S2-S5 footprints, heights, rooms, guards and devices; exact coordinates go in each slice's build sheet.
- A15 No lifts, hatches or roller doors (not in the engine): the S5 document lift is a shaft with a plant ladder,
  roller doors are static dressing beside a plain door. Undo: build EG17-EG19.
- A16 Talking pairs are two guards whose `PatrolRoute.loop` clocks meet and `faces` turn them together, until guard-ai
  GA2 provides conversations. Undo: n/a (GA2 replaces it).
- A17 The S1 co-op route (CR1) pays off as overwatch + a drop takedown at the exit pinch, not an entry into C1 (a player
  inside the connector before the objective would break the connector cycle). Undo: a vent into C1 with an engine guard.
- A18 Co-op routes that use the rope, hang-down, jam-and-pass or pair gates (CR4-CR7) rest on A29 / A30 (P7 / P8 applied);
  SPEC names each fallback. Undo: undo A29 / A30.
- A19 Section times (6 / 7 / 8 / 9 / 10 min) are design targets, measured at the slice 5 full run.
- A20 Map-size budget: campusOps load (build + nav + bake) under 2x Warehouse Ops on the laptop; over it -> EW-L1
  chunks or the compact campus. Undo: change the budget.
- A21 Plain `SectorBolt` team doors are not used (one player unbolts them); only pair bolts / pair gates. Undo: n/a.
- A22 The lighting proposal is read from origin/feature/marlow-final (it exists there: LR1-LR12); the SPEC's P1-P6 and
  P11 cite LR items. Superseded by A33-A44 (LR1-LR12 applied for this map). Undo: n/a.
Applied loosenings (Michael ~01:42: "Apply, logged and undoable"; for campusOps only; `docs/level-design.md`, the
template and the bible are NOT edited; table with per-item detail in SPEC "Applied loosenings"):
- A23 (CONCEPT P1 = LR2) LS 3.1: retired by G329. Each entry vantage (S2 SW stair door, S3 C2 landing included) is out
  of every guard's view by a real occluder or a circuit the players cut, never a dark pocket in a lit place.
- A24 (P2) LS 3.5: a light the player can cut from the route counts as a stepping stone. Undo: add cover / hide spots.
- A25 (P3) LS 5.1: the lit default with a standby fill (with A33 / A39). Undo: darker default, ambient 0.30.
- A26 (P4) LS 5.2: a deliberate lit test chokepoint may be darkened one way or crossed by timing. Undo: second way.
- A27 (P5 = LR4) LS 4.4: isolation moment alone and unwatched, dark or darkenable from cover. Undo: dark pockets.
- A28 (P6) LS 15: lit vantages tested for "out of sight". Undo: dark-only test.
- A29 (P7) LS 11.6: co-op verbs add the two-person rope, hang-down, jam-and-pass and the pair gate. Undo: CR4 basket
  overwatch only, CR5-CR6 pair bolts at a plain door, CR7 cut.
- A30 (P8) LS 11.2: visible dual-control doors and a padlocked ladder guard are allowed. Undo: plain doors, no ladder.
- A31 (P9) Warehouse L1-L15 (DEC G266) carried to the campus. Undo: per rule, back to LS.
- A32 (P10) LS 4.2: no repeat of the patrol mix judged per section, not per space. Undo: re-mix adjacent spaces.
- A33 (LR1) new LS 5.5 "lit by default; the players make the dark"; dark pockets named with reasons. Undo: dark default.
- A34 (LR2) = A23.
- A35 (LR3) LS 3.9: checkpoint in the dark OR in a quiet connector no guard enters (connectors at 0.30). Undo: 0.14.
- A36 (LR4) = A27.
- A37 (LR5) LS 5.2 / bible L8: ways to darken are switch, breaker / isolator, held jammer, shot; at least one not a
  shot. Undo: LS wording.
- A38 (LR6, also SPEC P11) LS 6.3 / bible 6: player-started device windows (jam, isolator, loop) allowed; no failing
  area clock. Undo: no timed isolators.
- A39 (LR7) fill: encounter spaces 0.14 standby, transit 0.30 (same as A10). Undo: 0.30 everywhere.
- A40 (LR8) LS 15: darkness acceptance as A28 plus "a cut circuit drops the pool under 0.28 on host and client". Undo: A28.
- A41 (LR9) bible L7 read as "darkness is the exception, and true dark". Undo: n/a.
- A42 (LR10) template / space sheet: slice build sheets record the lit default, circuits, cut ways and dark pockets.
  Undo: old field.
- A43 (LR11) bible 7 light plan per space: same, in the build sheets. Undo: old field.
- A44 (LR12) LS 12.1 fact recorded (Sector does not sync light state); slice L (protocol 31) closes it. Undo: n/a.
- A45 (SPEC P12) template "existing systems only": this job builds the EW engine items in SPEC. Undo: map-only, the
  EW items become Future.
Slice 0 implementer (engine prerequisites), 2026-10-23:
- A46 (G3) Sector Ops uses no runners: the three Warehouse Ops runners are grunts (data, `warehouseSectors.ts`); the
  runner archetype stays melee for Mission / legacy and the e2e that test it. `checkSectorGuards` fails any human guard
  without a gun and any heavy. The S2 tour guard now waits 12 s (was 7) at his takedown spot so M8 isolation still holds
  at the grunt's slower pace. Undo: kinds back to `runner`, the wait back to 7.
- A47 (G3) Alarm reinforcements always spawn as grunts (`SECTOR_REINFORCE_KIND`, no heavies, G155); the count per stage
  is the section's existing `perStage`. Undo: the old grunt / heavy alternation in `sectorMode.raised`.
- A48 (G20) `SectorDef.dogs` (default 0) caps a section's dogs and every dog names `handler` (an armed human guard's
  index); data and checks only, the heel behaviour stays guard-ai's (ENGINE.md "Requests for guard-ai"). Undo: drop the
  fields and the check.
- A49 (G20 / G42) The palm strike never picks or knocks out a dog, in every mode (G42 says so for every mode). Undo:
  remove `strikeTargetable` from `strikeController.ts`.
- A50 (G22) A section restart puts lamps (switched, shot, EMP, the base of a jammed lamp) and unlocked doors (open,
  shut, cracked) back to the state recorded when the section began (lamps cut in earlier sections stay cut); guard
  torches and locked doors are left out; a jam still running at the restart flickers out its seconds, then the lamp
  takes its start state. Host / solo only: the co-op client's lamps are not reset (Sector has no light sync, ENGINE G8;
  doors reach the client through the snapshot). Undo: remove the `startState` take / apply in `sectorMode.ts`.
- A51 (G1) The camera cap is 12 live at once per Sector section (untagged cameras count in every section) instead of 12
  per map, plus 16 per map, the co-op wire's per-camera clock list (`SEC_CAMS`); more than 16 per map needs a wire change
  (clocks for the live section only, protocol 31). Undo: the old per-map line in `security/data.ts`.
Lead, M12 chokes (2026-10-23, after the clear; A52-A59 are left for the slice L agent's notes; detail in SPEC
"Unavoidable posted guards (M12)"):
- A60 Four sections (of 5; M12's "sections" read as at least 3) have a choke: every route from the section entry to its
  objective or exit passes in sight of one posted guard (or pair) who must be distracted, knocked out or killed: K1 S1
  #5 doorman (C1 door), K2 S2 #11 bridge officer (C2 card door), K3 S4 #19 colonnade sentry (C4 gate), K4 S5 #9-10
  keyholders (anteroom, the token). S3 has none (its lasers and the clean room are the test). Undo: drop a K row and
  its `post` data and e2e assert.
- A61 Each choke guard carries guard-ai's `post: { leash, highSecurity?, guards }` (Guard AI Build's shape, agreed
  2026-10-23): K1-K3 leash 5 m, edge off the door, so a lure pulls him clear for a slip; K4 leash 3 m each,
  `highSecurity` (two-person rule: never leave the anteroom, no search, no alarm run outside it). Undo: leash values
  are data.
- A62 Every choke is clearable solo: K1-K3 by a lure to the leash edge then a slip or a takedown from behind; K4 by a
  lure that turns one keyholder away, then two single takedowns inside his look time. Co-op adds an easier way: K1 the
  CR1 canopy drop takedown, K2 / K3 one lures while the other slips, K4 the CR7 dual takedown. Undo: n/a (design).
- A63 Each choke gets an e2e / unit assert: with the posted guard's view cone (at post, at rest facing) marked as a
  nav blocker, no nav route joins the section entry to its objective (K4) or exit door (K1-K3); without the blocker
  the route exists. Undo: drop the assert.
- A52 (slice L) Sector co-op lamp jams keep riding `sector.sec.dv` (protocol 26); the new `lamps` message carries only
  the base state (switched off, shot out), so a jam is never sent twice. A client's lamp shot is host-authoritative (no
  local prediction: dark after about a round trip) and travels as a `shot` at `lt-<id>`, not a new message. Lights past
  registry id 1023 are not synced (`LAMP_MAX`). Undo: add jam timers to `lamps`, predict the shot, raise `LAMP_MAX`.
Lead, guard render budget (2026-10-23, orchestrator from guard-cap #180: render-bound, ~4-6 visible awake guards fit
60 Hz at Epic; Character Build builds guard-render: mesh merge, LOD, dormant + culled off-screen guards):
- A64 Counts stay (M8: 8 / 12 / 16 / 20 / 24), but every section is laid out so no more than 6 awake guards are on
  screen at once from any player position (walls, floors, sight lines break the view); each slice's build sheet lists
  its worst view and its count, and a unit test samples player points and counts guards in an unoccluded frustum.
  Guards that may sleep when far from both players carry `dormant: true` as data (posts and patrols away from the
  live route; never a K choke guard, a talking pair mid-cycle or a dog's handler); guard-render reads it. Undo: drop
  the field and the screen-count rule.
Lead, slice 1 check (2026-10-23, checks/slice1-check.md PASS; one fix round):
- A65 CR1 payoff: a hatch in the canopy slab at x -20.6..-19.4, z -36.4..-35.3 above the doorman's post (-20, -35)
  (a maintenance hatch to the soffit's drainage, left open): takedown from above standing at (-20, 4.4, -36.7), or a
  hang drop from its north lip; a fall through lands in front of him, so no bypass and K1 holds. The two east canopy
  downlights move to x -18.5 with radius 4.5 so the CR1 boost point (-13.5, -38) is dark. Undo: close the hatch,
  move the post to the east edge (then the leg-up loses its payoff).
- A66 The S1 objective PC is at (19.3, -76) (was 18.5): 1.15 m from the open rear window, inside the 1.8 m reach.
- A67 The voxel grid test limit (7705da07) is a loose-grid guard, not a budget (voxels are off in play): it now follows
  each map's own bounds. A20 (load <= 2x Warehouse Ops) stays the real budget, measured on the laptop at slice 1 e2e.
- A68 campusOps stays out of the Sector Ops op list until slice 3 (one filter in missionsScreen.ts). Guard #7 (fence
  patrol) is `dormant`-tagged and the smoking shelter's east panel is longer, for A64 margin (worst view was exactly 6).
- A69 (slice 2) CR2's leg-up lip sits on the atrium void's EAST edge (x -10, z -11..-5) over the café, not the north edge:
  the builder's layout put the café and the planter gap there. Undo: move the gap and the planter to the north edge.
  At the S2 + S3 merge the campus co-op lips become one list joined in one place (S1 + S2_COOP_LIPS + S3_COOP_LIPS)
  instead of campusS2.ts pushing into CAMPUS_COOP_LIPS at load.
- A70 S3's viewing-corridor spandrel (the hall's north wall on L1, x 22..52) is 6.2, not 5.8 (`S3_VIEW_SPANDREL_TOP`;
  the landing glass at x 22 stays 5.8), so the crane walkway cannot see the corridor guards over it (A64: the walkway
  saw 8 awake guards with 5.8; 6.0 left it at exactly 6 on the walkway, no margin). Corridor guards lose their look-down to the hall's far half. The
  A64 test now samples every 0.5 m nav cell, 32 facings, every 1 m of each route, the gallery door leaf shut. Undo: set
  `S3_VIEW_SPANDREL_TOP` back to `S3_SPANDREL_TOP` (or shorten the walkway's west end past x ~31, losing the SW ladder).
- A71 (slice 2, L3) The goods door is in the west wall (locked, unbreachable): the HQ south face is the solid S1
  pavilion, so S1's dock door cannot lead in. It opens on S1's fenced west side, no way out.
  Undo: change the value in campusS2.ts back to the SPEC value.
- A72 (slice 2, L4) `reinforce` has no `y`: the L2 lift lobby point (-36, -7) spawns on the lowest surface there,
  the G lift lobby under the L2 lobby; guards climb the SW stair.
  Undo: change the value in campusS2.ts back to the SPEC value.
- A73 (slice 2, L5) C2 is built as the SPEC says (L1, x 4..10, floor slab at 4.4, walls 3.0, roof, card door in the
  east wall); the ground stub room is gone from `campusOps.ts`. The stub S3 starts at the new checkpoint (y 4.4) and
  its nav seed is (7, 4.4, -14), not (7, 0, -14).
  Undo: change the value in campusS2.ts back to the SPEC value.
- A74 (slice 2, L7) The kitchen is in the SW part of the south band (door onto the SW lobby), not over the foyer:
  guards spawn only 7 m (plan) from every player, and the C1 checkpoint is 4.5 m from the foyer's north half.
  Pair #5-#6 is the recorded M8 exception, as the S1 car-park pair.
  Undo: change the value in campusS2.ts back to the SPEC value.
- A75 (slice 2, L8) The facilities glass is on the office's south wall (onto the wing corridor), not its west wall:
  with the glass on the west wall the L1 north ring saw 8 awake guards (A64). #7 is seen from the wing corridor.
  Undo: change the value in campusS2.ts back to the SPEC value.
- A76 (slice 2, L12) The atrium roof light has a 0.9 rim (noLedge) round the void on the roof, the lid a visual box
  with no collision. A player vaulting the rim falls 13 m (the void is open).
  Undo: change the value in campusS2.ts back to the SPEC value.
- A77 (slice 2, L15) `kp-fac` is not built (EW5): the facilities door is a plain door. The code beat is cut.
  Undo: change the value in campusS2.ts back to the SPEC value.
- A78-A98 (2026-10-23 ~10:15, Opus S4 / S5 planner; detail and undo in briefs/SLICE4.md, SLICE5.md): A78 S4 hall z 22..42
  (SPEC 20..44), pods z 24..32, cage x 14..22 z 34..40; A79 S4 no fire-stair core (riser caged ladders, compound plant
  ladder, NOC straight flight; kp-deck on the riser door); A80 no NOC roof light (hall window); A81 keypad codes from a
  board in the same section (S4 dock, S5 kitchen); A82 kp-ctl dropped; A83 cage walls solid 3.0 m open top; A84 sections
  sealed (2.8 m solid boundary walls, roof edges over outside ground >= 1.9 m; no fall damage); A85 CR7 co-op-quiet (4.2 m
  rope, TEAM.ropeMax 6.0; a solo drop is heard by #9) - ask Michael at the playtest; A86 S5 keyholders face the hall door,
  token behind; A87 dogs heel by a shared loop clock with the handler (M8 exception each); A88 stage reinforcements stay
  grunts (SECTOR_REINFORCE_KIND global); A89 S4 dock pair staggered; A90 S4 compound board a 20 s isolator in the dock;
  A91 one laser each in S4 / S5 (totals ramp); A92 S5 terrace gate = balustrade gap with #20; A93 guard routes stay on one
  floor (S5 #24, S4 #16); A94 S5 #22 faces into the house; A95 camera armour ramp (stealth over shooting, Michael ~10:10):
  S1-S2 shootable, S3 cam-view bulletproof / cam-dock not, all S4-S5 bulletproof; A96 S5 cameras flagged thermal (data;
  cameras already ignore lamps); A97 armoured routes with a named quiet bypass (S4 mantrap door + NOC glass, S5 anteroom
  hall door + front door); A98 no ammo inside sections, one weapons crate slot at each section start (Michael ~10:20),
  data only until E9-crate. Engine items for Opus: E8 bulletproof + thermal camera flags, E9-crate, E10 armoured glass /
  door pieces (glass needs E2).
- E10 (armoured routes, A97; checks/e10-armour.md): A-E10-1 armour = one collision bit `G.GLASS_ARMOURED` (1 << 14) on
  armoured panes and armoured door leaves, in `MASK.PLAYER_SHOT` / `ENEMY_SHOT`, not in `SIGHT` / `WORLD`; undo: drop the
  bit from the shot masks. A-E10-2 doors cannot be shot open today (no runtime reads `breachable`), so an armoured door
  only stops penetration (a plain 0.1 leaf is thinner than a rifle's 0.2 penetration); open, lock and bash unchanged;
  undo: `armoured` off the door. A-E10-3 a round on armour gives sparks only (no chip / decal), the E8 ricochet look, the
  generic impact sound. A-E10-4 only the mantrap's inner door is armoured (the outer door stays plain; the table lists
  one door). A-E10-5 bypasses: arm-mantrap -> kp-batt keypad (stealth route), arm-noc -> the basket hang-down into the
  cage (high route), arm-ante -> the anteroom side door (stealth), arm-front -> the north parapet rappel (high); undo:
  edit `bypass` in `S4_ARMOURED` / `S5_ARMOURED`. A-E10-6 the armoured NOC window also stops the NOC pair's rounds (they
  see the hall, cannot shoot it) - Guard AI must test the fire line on `MASK.ENEMY_SHOT`.
- A-D-1 gear: S4 / S5 default `helmet`; `both` on S4 #6, #14, #15 and S5 #1-#4, #9, #10; dogs and S1-S3 unset. Undo: edit `gear` in `campusS4Data.ts` / `campusS5Data.ts`.
- A-D-2 per-slot `gear` rides on a local `GearGuard` type (`SquadSlot` lacks the field on this branch); drop the alias when guard-ai adds it.
- A-D-3 sweep: S4 and S5 have 6 ground-storey points each (route points, on the runtime nav grid, covering the objective approaches and the kp-batt / hang-down / side-door / rappel bypasses); undo: delete `sweep`.
Lead, A64 lift (2026-10-23, guard-render S1 / S3a / S5 / S6 / S7 in; checks/a64-lift.md):
- A99 The A64 screen cap goes from 6 awake guards to 12 guards, every guard counted (`CAMPUS_SCREEN_CAP` in
  `campusSectors.ts`; the S2-S5 screen-count tests assert it, same sampling as A64 / A70). Basis: guard-render's merged
  body run (`docs/archive/guard-render/run-s1`, laptop 4090, Epic 1920x1080) holds Sector Ops 24 alive / 12 in sight alert at
  frame CPU p95 11.1 ms, GPU p95 7.2 ms (60 Hz line 12 / 15), and Marlow 24 in sight at 8.6 / 5.6; 12 in sight is the
  densest cell measured on a sector map, and the campus scene (with the detail art) is not measured yet, so the cap stays
  at the measured cell, not 24. `dormant` is not read by any code (guard-render shipped no sleep; its S4 anim tiers, in
  train 26, use off-screen / far, not the tag), so the count no longer skips dormant guards. The tags stay as data on the
  far guards (S2 #10 #12, S3 #12 #14, S4 #10 #11 #16, S5 #1-#3 #15) for a later far-guard sleep step; S1 #7's tag goes
  (A68 put it there for A64 margin only). Layout compromises made for A64 stay this slice (polish list in the check).
  Undo: `CAMPUS_SCREEN_CAP` back to 6, the tests' awake filter (`!g.dormant`) back, `dormant: true` back on S1 #7.
- A100 (lightrev LR13, 2026-10-23 ~14:45; Michael ~14:35 "Try it first"; checks/lr13-build.md): in a co-op match the
  host's Lamp falloff applies to both players: it rides the `start` message as `lf` (PROTOCOL_VERSION 38; 36 / 37 are
  taken by pose-parity and coop-walk-fixes), the client's own setting and `?falloff=photo` are ignored, and its Settings
  row is a locked row showing the host's. The mode is set once per map load (start, Retry, a co-op restart to the
  lobby), never mid-match; a Sector Ops checkpoint restart keeps the match's mode. Undo: drop `lf` from `start`
  (protocol back), and let `GameState.create` read only the local setting (`matchLampFalloff` without `host`).
  (A99 is taken on `feature/sector-redesign-art`.)
