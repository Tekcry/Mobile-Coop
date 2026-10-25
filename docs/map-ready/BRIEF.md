# map-ready: brief
Owner: Night Shift | Sector Ops Build. Status: current.

Lead: Night Shift | Sector Ops Build. Started: 2026-10-25. Base: master 2148ec96. Source: ROADMAP row 17 and "Decided"
(origin/feature/menu), FOLDED-PLAN J21 (section 4), CONFORMANCE S V10-V12 and T T14. Research:
`docs/map-ready/research/start-path.md`.

## Michael said
- 2026-10-25 ~16:50, native multiple choice, Q31 "Saltmarsh Park load time?" (his own words in place of the options):
  "to be reviewed. currently when starting maps the level slowly builds while in game at the start, requires work to
  ensure map is fully loaded."

## Michael picked
- 2026-10-25 ~16:50 Q32: "Must graphics warm-up finish on the loading screen?" -> picked: "Yes, with a cap
  (Recommended)" (FOLDED-PLAN section 2 row 32 option text: "Yes, up to a written cap, plus a job to shorten it").
- 2026-10-25 ~16:40 Q4: "32 guards" -> picked: "60 fps (Recommended)" (set after the off-screen anim fix is measured;
  memory target unchanged). Context only: the frame-rate work is J21's other half, not this job.
- Q31's offered options (not picked): "At most 2x the old warehouse, first and repeat loads" / "Fixed caps (30 s / 5 s)"
  / "No target". He asked for a review instead, so the load-time target is open (A12).

## Goal
When any map starts, the loading screen stays up until the map is fully built and warmed: lights baked, shaders
compiled for the settings in use, the player, partner, guards and weapons loaded and drawn, nothing popping in. In
co-op every player is ready before play starts. The wait has a written cap; past it play starts with what is ready.

## Limits
- Out of scope: guard-cap C1 / C2 and 60 fps at 32 guards (Q4), campus frame time (V10) and allocation churn (T14),
  `perf.mjs` map-label fix (T14, Test Runner), the body-shader cost work itself (V12 held slice: S8 here only plans
  the shortening), the menu's own load gate (done, `world/menuGate.ts`), Tallow (paused, Q1), phone (G12).
- Rules that hold: gameplay never reads graphics state (CLAUDE.md; the gate only delays the sim's start, nothing in the
  sim reads it); no runtime network (all assets bundled; the gate waits on bundled files only); co-op code only in
  `src/net` behind the dynamic import; a wire change does not bump `PROTOCOL_VERSION` (the train does) and gets two
  independent Opus checkers; unfinished work dark behind `mapReady` in `src/core/flags.ts`; G10 (numbers are starting
  values), G12, G14 (laptop numbers are the goals), G288 / G355 (walk cap), G358 (assume and log).
- Areas touched and their unwalked count (cap 3; ROADMAP 2026-10-25): Sector Ops 3 (at cap), Marlow Yard 3 (at cap),
  Player / animation 3 (at cap). The flag stays off until Michael walks it; counted once, in Sector Ops.

## Answers (M) and assumptions (A)
- A1: "Fully loaded" = the gate list in PLAN section 2 (research rows 1-11 and 13), plus 5 frames rendered behind the
  loading screen with nothing new compiling. Row 12 (the bake cache write) moves to the reveal when every section has
  landed. Undo: drop a step from `STEPS` in `game/mapGate.ts`.
- A2 (loosens a written perf line; Q1 by day): the cap is `MAP_READY_CAP_MS` = 45 s, counted from the end of
  `World.create` to control, with `mapReady` on (it replaces `WARMUP_MAX_MS` 6 s, `docs/systems/performance.md:81`).
  45 s covers the measured cold Epic body compiles (29.3-43.5 s, CONFORMANCE V12). `?readyCap=<s>` (5-600) for tests.
  Undo: set it to 6000, or answer Q1.
- A3: At the cap play starts with what is ready. Always awaited, cap or not: the live section's lamps (gameplay light,
  today's rule, bounded by the bake's own `JOB_CAP_MS` / `JOB_RETRY_CAP_MS`). Everything else carries on as today
  (compiles finish, other sections fade in). One log line (info under automation), and `capHit` plus the step it was on
  go into `feedbackContext()`. Undo: edit `ALWAYS` (the steps the cap never cuts) in `game/mapGate.ts`.
- A4: The gate runs inside the match state with the sim held: `app.setState` happens, frames render behind the boot
  screen (as the menu does), but no fixed step runs, input is off and the clock stays at 0 until the gate releases.
  The opening content (`mode.start()`: guards, devices, the teleport) is built during the hold; the 2.8 s letterbox and
  banners start at the release. Undo: flag off (today's order).
- A5: Co-op: every player in the match at the start (2 in course / sector, `protocol.ts:39-41`; up to 4 elsewhere)
  must report ready before the host releases. The host waits up to its own cap plus `COOP_READY_GRACE_MS` 15 s for a
  slower peer, then releases everyone. A late joiner or rejoiner never holds the host (its own local gate only, then it
  joins the running match as today). Undo: drop S5 (each peer releases on its own gate, the host does not wait).
- A6: Wire: two new messages, `mr` (client to host: map ready, `capHit`, ms) and `go` (host to all: release), and the
  host sends its normal snapshot at 2 Hz during the hold with the clock at 0 so clients build guard puppets and the
  partner behind their loading screen. No gameplay message is sent before `go`, which also ends today's lost one-shot
  messages at the start (research 2). Undo: drop S5; the host sends nothing new.
- A7: Flag `mapReady` (`?mapready=1`), default off, owner Night Shift | Sector Ops Build, switch-on when Michael has
  walked it on campusOps (solo and co-op) and Marlow Yard. Undo: n/a (flag off is today).
- A8: Guards inside `SPAWN_MIN_DIST` 7 m of a player still wait to spawn (gameplay rule, `sectorMode.ts:127`); their
  body variant is warmed by kind on the loading screen, so their late arrival compiles nothing. Undo: none needed.
- A9: The weapon sound sprite and the first music cue decode inside the gate (same cap). Undo: drop the `audio` step.
- A10: Third traced map is `warehouse` (the benchmark and `perf.mjs` map, and the only written load line). Kestrel and
  Tallow are not traced (Tallow paused, Q1); the gate is per state, so every map gets it. Undo: add a trace.
- A11: Seconds and frame times are GPU numbers from laptop 4189 alone runs only; software GL (CI, default e2e) asserts
  counts, never seconds. Undo: none.
- A12: Q31's load-time target stays open as Michael asked ("to be reviewed"): S1 measures cold and cached loads on the
  laptop, then the load lines go to Michael with those numbers (a second question after S1, not now). Until then the
  performance.md line carries the cap (Q1) and the "nothing after ready" zeros only.
- A13: Q32's "plus a job to shorten it" = S8, planned from S1's numbers (candidates in PLAN). If the V12 body-shader
  cost slice already has an owner, S8 hands its findings there instead of building. Undo: drop S8.

## Questions for Michael (one click each, asked by day)
- Q1: "When a map starts, how long may the loading screen wait for it to finish building (first load after an update;
  later loads are much quicker)?" - options: "45 s, then play (Recommended)" / "30 s, then play (some pop-in on a first
  load)" / "90 s, then play". Decision pack: the cold numbers above (body shaders 29-44 s, campus S1 lamps 22 s at 4
  workers) and the research table. Blocks: switch-on and the performance.md line (S7), nothing in the build (flag dark).
  Default until answered: A2 (45 s), logged overnight as "loosens performance.md WARMUP_MAX_MS 6 s".

## Sign-off needed
No map, layout or look change. The switch-on needs Michael's walk (A7).
