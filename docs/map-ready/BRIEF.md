# map-ready: brief
Owner: Night Shift | Sector Ops Build. Status: current.

Lead: Night Shift | Sector Ops Build. Started: 2026-10-25. Base: master 2148ec96 (src unchanged to b81c4945). Source:
ROADMAP row 17 and "Decided" (origin/feature/menu), FOLDED-PLAN J21 (section 4), CONFORMANCE S V10-V12 and T T14.
Research: `docs/map-ready/research/start-path.md`. Plan checks 1-3: `docs/map-ready/PLAN-CHECK.md`,
`PLAN-CHECK-2.md`, `PLAN-CHECK-3.md` (all FIX, folded here; check 2's fix 1 became Q3, which Michael answered ~20:05).

## Michael said
- 2026-10-25 ~16:50, native multiple choice, Q31 "Saltmarsh Park load time?" (his own words in place of the options):
  "to be reviewed. currently when starting maps the level slowly builds while in game at the start, requires work to
  ensure map is fully loaded."
- 2026-10-25 ~18:50, asked in chat: "how does ratchet and clank/spiderman etc achieve instant load times between
  levels? what would make us instantly load into maps?"

## Michael picked
- 2026-10-25 ~18:50 (native multiple choice, the answer to his question above) -> picked: "Yes, add them
  (Recommended)": the map-ready job adds four fixes: (1) apply the graphics settings before the shader warm-up and warm
  characters, guards and weapons behind the loading screen; (2) ship the campus lamp bakes pre-built instead of baking
  on the player's PC; (3) start loading the map in the lobby once it is picked; (4) keep characters, guards, weapons
  and compiled shaders between maps and swap only the level. Target: a first-ever load still takes seconds (shaders
  compile per GPU), repeat loads near-instant. (ROADMAP "Decided" and row 17.)
- 2026-10-25 ~16:50 Q32: "Must graphics warm-up finish on the loading screen?" -> picked: "Yes, with a cap
  (Recommended)" (FOLDED-PLAN section 2 row 32 option text: "Yes, up to a written cap, plus a job to shorten it").
- 2026-10-25 ~16:40 Q4: "32 guards" -> picked: "60 fps (Recommended)" (set after the off-screen anim fix is measured;
  memory target unchanged). Context only: the frame-rate work is J21's other half, not this job; the memory target
  also bounds fix (4).
- 2026-10-25 ~20:05 (native multiple choice, via the orchestrator) Q3 "How far should we build it?" (fixes (3) and
  (4)) -> picked: "Keep the costly parts, build the level at Start (Recommended)" (option 1). A18 and A19 are his
  pick, no longer assumptions; S12 / S13 are not built (they return only through Q2, A18).
- 2026-10-25 ~20:05 (native multiple choice, via the orchestrator) Q1, the loading-screen cap (question text under
  "Questions" below) -> picked: "20 seconds" (not the 45 s default). The cap is 20 s (A2).
- Q31's offered options (not picked): "At most 2x the old warehouse, first and repeat loads" / "Fixed caps (30 s / 5 s)"
  / "No target". He asked for a review instead; the ~18:50 pick then set the aim (A12).

## Goal
When any map starts, the loading screen stays up until the map is fully built and warmed: lights in, shaders compiled
for the settings in use, the player, partner, guards and weapons loaded and drawn, nothing popping in. In co-op every
player is ready before play starts. The wait has a written cap; past it play starts with what is ready. And the wait
shrinks: the campus lamps come pre-built with the game, loading starts in the lobby as soon as the map is picked, and
the costly shared parts (parsed models, decoded textures, compiled shaders) stay alive between matches, so a first-ever
load takes seconds and a repeat load is near-instant. How far fixes (3) and (4) go is Michael's ~20:05 Q3 pick:
keep the costly parts and build the level at Start (A18, A19), not one kept scene with the level built in the lobby.
The wait is capped at his ~20:05 Q1 pick, 20 s (A2).

## Limits
- Out of scope: guard-cap C1 / C2 and 60 fps at 32 guards (Q4), campus frame time (V10) and allocation churn (T14),
  `perf.mjs` map-label fix (T14, Test Runner), the body-shader cost work itself (V12 held slice: S8 here only plans
  the shortening), the menu's own load gate (done, `world/menuGate.ts`), Tallow (Michael lifted the hold ~18:05; no
  Tallow map is built yet, so none is traced; the gate is per state and covers it when it lands), phone (G12). Not
  built, by Michael's Q3 pick (~20:05, option 1): one persistent scene with only the level swapped and the level built
  in the lobby (S12 / S13, sketched in PLAN section 3); they return only if the after-S11 run shows repeat loads above
  near-instant (Q2).
- Rules that hold: gameplay never reads graphics state (CLAUDE.md; the gate only delays the sim's start, nothing in the
  sim reads it; the shipped bake is the same bytes the PC would bake, A15); no runtime network (the shipped bake is a
  same-origin file in the build like the GLBs); co-op code only in `src/net` behind the dynamic import; a wire change
  does not bump `PROTOCOL_VERSION` (the train does) and every `src/net` change gets two independent Opus checkers (Guard
  AI reviews `src/net`); unfinished work dark behind `mapReady` in `src/core/flags.ts`; G10 (numbers are starting
  values), G12, G14 (laptop numbers are the goals), G288 / G355 (walk cap), G358 (assume and log); no package install
  or download without asking Michael (the prebake uses Node's own `zlib` and the browser's `DecompressionStream`).
- Areas touched and their unwalked count (cap 3; ROADMAP 2026-10-25): Sector Ops 3 (at cap), Marlow Yard 3 (at cap),
  Player / animation 3 (at cap), Lighting 3 (at cap; S4 shipped bake, `bakedLamps.ts`), Guard AI 5 (at cap; S3 guard
  warm, helmet, shield). Nothing switches on in any area until Michael walks it: the flag stays off until the Sector
  Ops and Marlow Yard walk items pass (A7). Lighting and Guard AI see no change in look or behaviour (parity, A15; warm
  meshes only, S3), so they get no walk item. The one live change is A16 (a cache-key bug fix, same bytes).

## Answers (M) and assumptions (A)
- A1: "Fully loaded" = the gate list in PLAN section 2 (research rows 1-11 and 13), plus 5 frames rendered behind the
  loading screen with nothing new compiling. Row 12 (the bake cache write) moves to the reveal when every section has
  landed. Undo: drop a step from `STEPS` in `game/mapGate.ts`.
- A2 (decided: Michael's Q1 pick ~20:05, "20 seconds"): the cap is `MAP_READY_CAP_MS` = 20 s, counted from the end
  of `World.create` to control, with `mapReady` on (it replaces `WARMUP_MAX_MS` 6 s, `docs/systems/performance.md:81`).
  20 s does not cover the measured cold Epic body compiles on a first-ever load (29.3-43.5 s, CONFORMANCE V12), the
  one cost the four fixes cannot remove (shaders compile per GPU): a first-ever Epic load hits the cap and plays with
  what is ready (A3). So the `shaders` step compiles in priority order (the player's and partners' bodies and
  weapons, then the live section's level materials, then guards nearest first, then the rest; PLAN S2), and S8 aims
  at a first-ever Epic load under 20 s with no cap hit (PLAN S8). The campus lamp bake is not in it: it ships
  pre-built (S4). Repeat loads are expected far under the cap (A12). `?readyCap=<s>` (5-600) for tests. Undo: set
  `MAP_READY_CAP_MS` back (Michael's call).
- A3: At the cap play starts with what is ready. Always awaited, cap or not: the live section's lamps (gameplay light,
  today's rule; with the shipped bake they are in at once; without it bounded by the bake's own `JOB_CAP_MS` /
  `JOB_RETRY_CAP_MS`). Everything else carries on as today (compiles finish, other sections fade in). One log line
  (info under automation), and `capHit` plus the step it was on go into `feedbackContext()`. Because the live lamps are
  never cut, a dev build with no shipped bake (cold campus live section ~22 s at 4 workers) and a first-ever Marlow
  Yard / warehouse PC bake can outlast the 20 s cap; shipped campus loads cannot (S4), and A17 moves a
  slow Marlow Yard / warehouse bake into the manifest. Undo: edit `ALWAYS` (the steps the cap never cuts) in `game/mapGate.ts`.
- A4: The gate runs inside the match state with the sim held: `app.setState` happens, frames render behind the boot
  screen (as the menu does), but no fixed step runs, input is off and the clock stays at 0 until the gate releases.
  The opening content (`mode.start()`: guards, devices, the teleport) is built during the hold; the 2.8 s letterbox,
  the banners and the start objective popup (G343 / G351) start at the release. Undo: flag off (today's order).
- A5: Co-op: every start player must report ready before the host releases. A Sector Ops start holds for up to 4
  players: Michael's Q16 "4-player Sector Ops: Live now" (G308: Sector Ops is 1-4) ships with #317 `feature/coop4`,
  which sets `capacity('sector')` to `SECTOR_MAX` 4 (Marlow Yard stays `COURSE_MAX` 2; master today still has 2 for
  both, `protocol.ts:39-41`). The host counts the start players from the session at the start (`session.startMatch`:
  the players in the room then, at most `session.cap`, the mode's `capacity` or the host's lower room cap), never a
  fixed 2. The host waits for every start player's ready, at most until its own 20 s cap plus `COOP_READY_GRACE_MS`
  5 s (a slower peer's later `World.create`; was 15 s, cut for Q1's 20 s pick), then releases everyone. Each peer's own
  gate is capped at 20 s, so a co-op start waits at most ~25 s from the host's level build.
  A late joiner or rejoiner (in after the `start`, such as #317's late fourth page) never holds the host (its own local
  gate only, then it joins the running match as today). Undo: drop S5 (each peer releases on its own gate, the host
  does not wait).
- A6: Wire: two new messages, `mr` (client to host: map ready, `capHit`, ms) and `go` (host to all: release), and the
  host sends its normal snapshot at 2 Hz during the hold with the clock at 0 so clients build guard puppets and the
  partner behind their loading screen. No gameplay message is sent before `go`, which also ends today's lost one-shot
  messages at the start (research 2). This is the load handshake fix (3) needs at the start; the lobby preload itself
  sends nothing (A19). Undo: drop S5; the host sends nothing new.
- A7: Flag `mapReady` (`?mapready=1`), default off, owner Night Shift | Sector Ops Build. It gates the gate, the hold,
  the shipped-bake read, the kept parts and the lobby preload. Q1 and Q3 are answered (~20:05), so switch-on
  no longer waits on them: it waits only until Michael has walked it on campusOps (solo and co-op) and Marlow Yard,
  and both areas are under the cap. Undo: n/a (flag off is today).
- A8: Guards inside `SPAWN_MIN_DIST` 7 m of a player still wait to spawn (gameplay rule, `sectorMode.ts:127`); their
  body variant is warmed by kind on the loading screen, so their late arrival compiles nothing. Undo: none needed.
- A9: The weapon sound sprite and the first music cue decode inside the gate (same cap); with the lobby preload they
  are usually decoded before Start. Undo: drop the `audio` step.
- A10: Third traced map is `warehouse` (the benchmark and `perf.mjs` map, and the only written load line). Kestrel and
  Tallow are not traced (Tallow has no built map yet); the gate is per state, so every map gets it. Undo: add a trace.
- A11: Seconds and frame times are GPU numbers from laptop 4189 alone runs only; software GL (CI, default e2e) asserts
  counts, never seconds. Undo: none.
- A12: The load-time aim is Michael's ~18:50 target: a first-ever load takes seconds (shaders compile per GPU), a
  repeat load in the same session (the same map or another) is near-instant; a load after a page reload sits between
  the two (the browser's own shader cache, measured, not built). The numbers stay open for his review as Q31 asked ("to be reviewed"): S1 measures the baseline, the
  after-S11 laptop run measures first-ever and repeat loads, and those go to Michael as Q2 with the numbers (not now).
  Until then performance.md carries only the cap (Q1), the "nothing after ready" zeros and the aim in words.
- A13: Q32's "plus a job to shorten it" = S8, planned from S1's numbers right after S2, with Michael's 20 s cap (Q1)
  as its target for a first-ever Epic load (fixes (2)-(4) are the first shortening; PLAN S8). If the V12 body-shader cost slice already has an owner, S8 hands its findings there. Undo: drop S8.
- A14 (keeps a written perf line): `docs/systems/performance.md:25-26` "Warehouse load <= 4 s cold, <= 1.5 s cached"
  stays word for word; this job never edits it. With the gate on, the reveal includes the warehouse's compiles, so S1
  (flag off) and the after-S11 run (flag on) report against it; if the flag-on numbers miss it, that goes to Michael
  with Q2 (keep the line and shorten, or a new line), never a silent edit. Undo: none needed.
- A15: Fix (2), how the shipped bake stays in sync: it is built at build time, never committed. `npm run build` runs
  the prebake first: it builds campusOps in Node, computes the same lamp key the game computes (one shared
  `lampKeyOf()`), and bakes every section with the same `bakeLamps` code the workers run, unless
  `.prebake-cache/<key>` (gitignored, outside `node_modules`) already holds it (CI keeps that folder with
  `actions/cache`; the prebake keeps only the newest key's folder); the build emits
  `bakes/campusOps.json` (key, sizes, file hashes) and one gzip file per section. The game uses the files only when the
  manifest key equals its own key, so a stale file cannot be read (it bakes on the PC as today). Size cap: at most 16 MB
  per section file and 48 MB for the map, compressed; over it the prebake fails the build with the sizes, so the PR
  that grew it sees it. Only that one PR is blocked. If S4's first prebake is over 16 / 48 MB, the re-plan is never
  silent: either path is logged as a new A-line, marked "narrows Michael's ~18:50 pick (2)" (ship fewer campus sections
  pre-built; the rest bake on the PC) or "changes Q1's decision pack" (raise the 48 MB download; Q1's pack gets the new
  size), and sent to the orchestrator for Michael's next look (one click by day; overnight assumed and logged, G358).
  The re-planned S4 gets a fresh Opus plan checker before its runtime part (PLAN S4 "Order"). A lossless repack (the
  same bytes after unpacking) needs no log; a lossy one (quantised `vis`) changes the light bytes, breaks the parity
  above and is not taken. Undo: drop the prebake from `build` (the PC bakes as today).
- A16 (live, not flagged): the lamp and moon cache keys drop the match seed (`world/lightBake.ts:91`, `:95`). The baked
  bytes depend only on the shapes and lights, which the key already hashes; with the seed in it a co-op match (a random
  seed each start, `net/session.ts:353`) and a solo restart (seed + 1, `main.ts:397`) never hit the cache and bake
  again. Same bytes, so no look, meter or guard change; a rule fix allowed at the cap (Decided 2026-10-25 ~11:20 (9)).
  Undo: put `${inp.seed}` back in both keys.
- A17: Only campusOps ships pre-built (Michael named the campus). Marlow Yard and warehouse bake in full on the PC
  before play (cached after A16). If the after-S11 run shows either bake costing more than 2 s on a first load, it
  joins the same manifest (one entry, same script), logged in PLAN. Undo: n/a.
- A18 (decided: Michael's Q3 pick ~20:05, option 1; narrower than his ~18:50 words for (4), by his choice):
  fix (4) "keep characters, guards, weapons and compiled shaders between maps and swap only the level" is built as:
  their costly parts stay alive on the engine between matches (parsed model files, decoded textures, compiled shader
  programs), and each match still gets a fresh scene in which the level, the rigs and the meshes are rebuilt from those
  kept parts (cheap: no fetch, transcode or compile). The kept set is at most what one match uses (the player's and
  partner's play LODs, the weapons in the loadouts, the last map's guard kinds; never the 55 MB hero), counted inside
  the unchanged memory target (Q4), and is dropped on a GPU context loss. A persistent scene with only the level
  swapped is not built (his Q3 pick; why: every system would have to clean up perfectly,
  and a leak there keeps a whole match alive, the 3.1.7 bug). What a repeat load still rebuilds under A18: the level
  (`World.create`: voxel sections, kit / props / art meshes, Havok bodies, nav grid, lamps from the cache), the rigs and
  meshes instanced from kept files, the guards and devices; S1 measures those seconds per map.
  Extend: S12 (one scene, level swapped) comes back only if the after-S11 run shows repeat loads above near-instant (Q2, Michael's call then).
- A19 (decided: Michael's Q3 pick ~20:05, option 1; narrower than his ~18:50 words for (3), by his choice):
  fix (3) "start loading the map in the lobby once it is picked": solo, when the map's briefing opens (Sector Ops,
  Missions, Free Roam all open `BriefingScreen`); co-op, on every peer when the host's lobby settings name the map. The
  lobby preload does everything that needs no match scene: the map's model files, the shipped bake files, the player's
  and partner's LODs, the loadout's weapons and the map's guard kinds (parsed, textures decoded and held as kept parts),
  the weapon sound sprite and first music cue. The level build (`World.create`, Havok, nav grid, the Marlow Yard /
  warehouse PC bake) and a first-ever shader compile start at Start. That is a design choice, not a hard limit: a
  second, unrendered scene could be built while the menu stage lives (Q3's options 2 and 3, S13; not picked). Under A19
  the menu stage alone stays alive in the lobby (never a level and the menu built at once). The lobby shows its own
  progress line ("Map loading 62%" / "Map ready"), local only, no wire. A map change cancels and preloads the new one;
  leaving the lobby drops what is not kept. Undo: the hooks are not called (flag off).

## Questions for Michael (one click each, asked by day)
- Q1 (answered ~20:05: "20 seconds"; A2): "When a map starts, how long may the loading screen wait for it to
  finish building (first load after an update; later loads are much quicker)?" - options: "45 s, then play (Recommended)" / "30 s, then play (some pop-in on a first
  load)" / "90 s, then play". Decision pack: the cold body-shader compiles (29-44 s on a first-ever load, V12), the
  research table, and that the campus lamps now ship pre-built (no bake wait; the game download grows by up to 48 MB
  for them, A15's cap) and repeat loads aim at near-instant.
  Closed: the cap is 20 s (A2); S7 writes it into performance.md line 81.
- Q2 (later, after the after-S11 laptop run, not asked now): the load-time numbers for Q31's review (first-ever and
  repeat, campus, Marlow Yard, warehouse) and, if needed, the warehouse line (A14).
- Q3 (answered ~20:05: option 1, "Keep the costly parts, build the level at Start (Recommended)"; sent to the
  orchestrator ~20:05 by the lead; fixes (3) and (4) as picked ~18:50; asked by day, one click, native multiple
  choice; the recommended option is narrower than his words, so he decides): "Your fast-loads pick said: start loading the map in the lobby, and keep
  characters, guards, weapons and shaders between maps and swap only the level. How far should we build it?" -
  options, recommended first:
  1. "Keep the costly parts, build the level at Start (Recommended)" - the lobby loads the map's files, textures and
     sounds; characters, guards, weapons and compiled shaders are kept between maps; the level and the bodies are
     rebuilt at Start from the kept parts (nothing downloaded or compiled again). If repeat loads are still not
     near-instant when measured, the full version is planned then.
  2. "Full version now: one scene, level built in the lobby" - the game keeps one scene all session and swaps only the
     level, and the next level is built while you wait in the lobby. Quickest repeat loads; adds two slices (about two
     days) and risks the old memory leak (3.1.7: one missed clean-up keeps a whole old match in memory).
  3. "Recommended now, full version straight after" - option 1 first, then option 2's two slices after it, whatever
     the measured times.
  Decision pack: the 3.1.7 leak in two lines; what a repeat load still rebuilds under option 1 (A18) with S1's
  measured seconds per map when S1 is in (asked by day without waiting if it is not); memory: option 2 holds the
  menu and one built level at once in the lobby, inside the unchanged memory target (FOLDED-PLAN Q4); the S12 / S13
  sketch (PLAN section 3); and that the Marlow Yard / warehouse PC lamp bake, listed under option 1 as a Start cost
  (A19), needs no scene: S4's prebake builds the map's shapes in Node, so that worker bake could start in the lobby
  under option 1 too (a candidate for S8, not built now). Closed: S9-S11 build option 1 (A18, A19); S12 / S13 are not
  built; the switch-on no longer waits on Q3.

## Sign-off needed
No map, layout or look change (the shipped bake is the same bytes, A15). The lobby and briefing gain one progress
line (A19). The switch-on needs Michael's walk (A7).
