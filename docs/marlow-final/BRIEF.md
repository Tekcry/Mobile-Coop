# marlow-final - Marlow Yard redesign and finish (BRIEF)

Job lead: Night Shift | Menu Notes Build. Started 2026-10-23 ~00:20 on the orchestrator's word (top priority
overnight). Branch `feature/marlow-final` from master af56ab43 (4.61.x; 4.62.0 merges in when train 12 lands), folder
`C:/NightShift/Mobile-Coop-marlow-final`. Map `ctcourse`, Course mode (`?autostart=ctcourse&mode=course`).

## The ask (Michael, verbatim, 2026-10-23 ~00:10; ROADMAP "Decided" on feature/menu 42ed668b)
"i would like the marlow yard audit to include finalising the map, finishing touches, making sure it flows well, not
just simple square rooms with random walls/pipes/ladders in random places for the sake of using. areas should be well
designed training areas designed to replicate real map coop scenarios (all the cool actions that players can do
together). The yard must focus heavily on coop gameplay, including those discussed recently eg. timed isolation of
lights, cameras, locks, accessing security room to disable cameras, timed jammer exercises, hacking devices in sync,
and any other coop "wow thats cool" experience. Ask questions if needed."

## Michael's answers
- M1 "Rebuild freely": new layout and routes where the bays do not flow; keep what works, remove filler.
- M2 "Plan, then build": a spec from his words tonight, then build straight on; he reviews both in the morning.
- M3 One co-op run: "15-20 min".
- M4 (~00:25) "im happy to remove the pads in each section that explain things also, we can have the objective list
  update and keep the players guided throughout the yard". So: no explainer pads; the objective list updates per area
  and guides both players through the whole yard, with per-player lines where the team splits.
- M5 (~00:30) Dressing and detail art STRAIGHT AFTER GREYBOX (each area dressed as its greybox passes; he accepts
  ~3-5 h rework if his walk changes the layout). Verbatim: "make it a believable training facility that reproduces
  potential real level scenarios. Ensure lighting is sufficient, review the rule if needed. This facility should also
  be very expensive, and should adopt a design that is luxurious (LED strips, glass panel where an "instructor" can
  watch you train throughout the course, sliding doors, any suggestions you have, these do not have to be in the level,
  only giving examples) again you can ask me questions if needed". The no-detail-art-before-playtest rule is lifted for
  marlow-final only. Art: a reusable kit from in-repo Blender scripts (headless `-b`, CC0 textures only); perf budgets
  and GPU shots per area via Character Build. Lighting: sufficient to read the space; any loosening of the darkness /
  light rules goes to Michael as a proposal in the spec, never applied.

- M6 (~00:45) Lighting: "lit, players cut it, but you can also use mixed zones if it ends up being a better result. In
  game levels are quite dark and not realistic". So areas are brightly lit by default (the LED / luxury look) and the
  co-op exercises create darkness by isolating lights on timers; mixed zones where they play better. His note that the
  levels read too dark and unrealistic is the lighting rule review: any level-design rule change is proposed in the
  spec. Gallery: "View only" (A5 holds). Guards: "normal guards. we will need to create a prototype guard avatar
  replacement eventually." (A7 holds; the guard avatar is a later roadmap item, not this job).

## More assumed decisions (M5)
- A5 One instructor gallery: a raised, glazed walkway / control room running along the course spine, so most areas have
  a glass wall onto it; the gallery is out of bounds for players (sight only). Undo: per-area observation windows.
- A6 The look: dark premium surfaces (charcoal composite panels, brushed metal trims, polished concrete floors), warm and
  cool LED strip coves as the main read light, frosted and clear glass, motorised sliding doors (existing door logic,
  new kit mesh). Mock-up areas inside it (a rail siding, an office floor, a server room) keep their own materials so the
  scenarios read as "real sites" built inside a luxury hall. Undo: retexture the kit.
- A7 Guards in the training scenarios stay normal guards (live training targets in the fiction); no new archetype.
- A8 (2026-10-23 ~02:10, ENGINE-ANSWERS Q2) Course mode runs guards with `em.stealth = true`: with it false a course
  guard radios every guard within 22 m at once, chases the players' real positions and never searches or cools down,
  which is not CT. "Normal guards" (M6) reads as the stealth-mode behaviour. Undo: one line in `courseMode.ts`.

## Goal
Marlow Yard becomes a finished 2-player co-op training level: one route that flows, each area a purpose-built
training ground that replicates a real-map co-op scenario (G3), every exercise needing both players, with the co-op
"wow" moments named above. Pure CT (G1, `docs/ct-research`) except Michael's recorded decisions.

## Limits
- `docs/level-design.md` and `docs/templates/map-spec.md` are binding. Any loosening the design wants is listed for
  Michael in the spec, never applied.
- Co-op only (G2): no solo path, no bot partner.
- Light parity (hard rule): what the player sees, the meter and the guards agree; lights baked.
- Prototype first (current goal): greybox and working exercises; detail art is the later visual pass.
- Wire changes bump `PROTOCOL_VERSION`; gameplay never reads graphics state.

## Assumed decisions (Michael asleep; each can be undone)
- A1 The map keeps id `ctcourse`, Course mode and the name Marlow Yard; `e2e-ctcourse` (:1-:3) is rewritten for the
  new route. Undo: none needed (a rename later is mechanical).
- A2 "15-20 min" is a first co-op run by a pair who know the controls, without deaths; the spec times each area.
  Undo: retime in the spec.
- A3 Existing systems first (lights, cameras, locks, security room, jammer, hacking, team moves); a new mechanic only
  where an exercise cannot work without it, as a basic prototype. Undo: drop the exercise.
- A4 Slices land on this branch; one PR to master at the end unless the orchestrator wants a PR per slice.
