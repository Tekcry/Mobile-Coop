# coop-kit: brief
Owner: Night Shift | Player Build. Status: current (job doc; archived by `Job-done: coop-kit`).

Lead: Night Shift | Player Build. Started: 2026-10-25 ~18:20. Base: master 2148ec969. Job: FOLDED-PLAN J24 (co-op kit:
shoulder stand, rope descent; conformance P R32, P R34), widened at ~18:10 by the lead's note to the five moves Michael
added to the kit (below). Planner: Opus 5.5. Revised for plan check 2 (2026-10-26, pointers at master 65411ea65).

## Michael said
- 2026-10-17 (LEVEL-06, G57): "Ladder reaches 4.5 m"
- 2026-10-18 (relayed from the main session, G180): "Pure ct, if it had it, we will use it."
- 2026-10-18 (chat, G151): "Anywhere with room"
- 2026-10-20 13:30 (G210): "the ct movement is getting worse. Can you ignore CT movement references."
- 2026-10-22 ~10:40 (N0 answers, G243): "Research what is believable and realistic. Can I fine tune the whole animation
  speed in anim tuner?"
- 2026-10-24 ~22:50 (G293, with the kit pick below): "If it's ready before I'm awake, continue to make progress" and
  "Any other creative coop ideas"
- 2026-10-25 ~16:50 (folded plan Q39, partner animation over the network): "yes players must look exact in everyones
  games"
- 2026-10-25 ~16:50 (folded plan Q38, G399): "mocap only, i will fine tune them in anim dev"
- 2026-10-25 ~22:42 (ROADMAP Decided): "confirming priority is mixamo animations in anim tuner and in game. note this
  for next session to continue"
- 2026-10-26 ~00:20 (ROADMAP Decided): "does mixamo have versions to replace those that cmu covers? i approve
  downloading any additional mixamo animations and implemeting into the game, i want to be able to switch between all 3
  animation sets in game and animation dev to test."
- 2026-10-26 ~00:25 (ROADMAP Decided): "update - dont set mixamo moves as default in game, allow toggle between hand
  made, cmu, and mixamo"
- 2026-10-26 ~13:55 (ROADMAP Decided): "why are you hiding all new features until switched on? i trial them all in the
  preview server"
- 2026-10-26 ~16:05 (ROADMAP Decided): "is it worth pushing out quicker as prototype? i still dont know if the gameplay
  is solid yet, and you are spending a long time testing things that may not be used."
- 2026-10-26 ~16:20 (ROADMAP Decided): "definitely keep in mind that this is all a prototype, and cannot get bogged down
  with fine tuning or re-running tests constantly."

## Michael picked
- 2026-10-24 ~22:50 (native multiple choice, G293) the campaign co-op traversal kit: "boost up a wall, throw over a gap,
  human ladder / pull-up, hold a shutter or door, rope brace / descent, vent unlock for the partner" (as recorded in
  `docs/DECISIONS.md` G293 and bible 5.9 C4).
- 2026-10-25 ~17:00 Q: the folded conformance plan -> picked: "Sign off, start (Recommended)" (ROADMAP Decided).
- 2026-10-25 ~18:05 Q: "Do any proposed moves join the kit now?" (`docs/missions/prototypes/coop-kit/SIGNOFF.md` on
  origin/feature/mission-framework, PR #372) -> all five join: "Deadweight,Drop Catch,Chimney Pair,Swing Pass" and
  Plank Bridge "Add it" (as recorded in ROADMAP Decided on origin/feature/menu, ~18:05).
- 2026-10-25 ~20:20 Q: the relay lip height (Marlow J12 A24) -> picked: "Keep 4.6 m (Recommended)" (ROADMAP Decided).
- 2026-10-26 ~13:55 Q: hidden features and the preview -> picked: "All on in preview" (every dark feature flag defaults
  on in `/preview/`, a URL `=0` turns one off; the live game unchanged) (ROADMAP Decided).
- 2026-10-26 ~16:05 Q: testing and pace -> picked: "Prototype mode (Recommended)" ("turn everything on in preview,
  lighter testing ... Building follows your playthrough"; ROADMAP Decided: one closest test set per change, no repeat
  proof runs, playable over polish).
- 2026-10-26 ~18:47 Q: the part 2 move sizes in the level rules (A12) -> picked: "Not yet" (the moves are still built
  and used at Marlow Yard's five spots on the A17 starting sizes; docs/level-design.md and the scale sheet stay as they
  are and no new map may plan on them yet; via the orchestrator).
- 2026-10-26 ~18:52 Q: Tallow Wharf C4's Plank Bridge after "Not yet" -> picked: "Keep it" (it stands, same move and
  sizes as Marlow Yard; only further new map uses wait; via the orchestrator).

## Goal
Part 1: two players can do the CT shoulder stand (one stands on the partner's shoulders to reach a 4.5 m lip, or stays
up and aims the pistol) and can rappel down the two-person rope as well as climb it. Part 2: Deadweight, Drop Catch,
Chimney Pair, Swing Pass and Plank Bridge are playable kit moves. Every move ships behind its flag id: on in `/preview/`
as soon as it is built (~13:55), off in the live game until Michael accepts it on a walk; both players' poses exact on
both screens (Q39), each drawn with its owner's Animation source, and a look video. Prototype mode (~16:05, ~16:20):
playable pieces first, no fine-tuning passes, one test set per PR.

## Limits
- Out of scope: map placement of the moves (Marlow Yard's teaching sets are Marlow's J14 re-plan; Campaign Build
  planned a Plank Bridge on Tallow Wharf C4, pie loft to clock loft, after Michael's ~20:45 "Mix of both", flag date
  2026-10-27: Campaign is a second user of the same API (`addKitSpot`, `onKitDone`); Michael picked "Keep it" ~18:52 (M4): Tallow C4's plank stands
  (approved before the 18:47 "Not yet"), same move and sizes as Marlow Yard; only further new map uses wait); the level validator's code (`scripts/level-validate.mjs`, Marlow Build); the pull-up and
  shutter poses Player owes Marlow (resume-ct-core: pull and shutter clips): this job only names the files it shares
  with them; the ledge relay's reach (M2); guard reactions beyond the laid plank's notice that K5b adds in
  `stealthSystems.ts` (Deadweight's open grate is a door left open under the existing door rules).
- Rules that hold: CLAUDE.md hard rules (no static `src/net` import, hot paths allocate nothing, `hyp2` / `hyp3`, flags
  for unfinished work); G57 (one 4.3-4.5 m band for boost and human ladder), G151 (anywhere with room, a prompt naming
  the move), G180 (pure CT mechanics), G210 / bible 5.12 (real-world trained-operator animation, the 5.12.2 realism
  standard, paired moves within 3 cm at contact on host and client), G243 (real-world research sets timings; per-clip
  speed slider in the tuner), G10 (numbers are starting values), Q39 (partner animation exact on every page; ROADMAP
  ~00:55 G400: each player is drawn on every screen with that player's own Animation source), G399 (players get motion
  capture; narrowed by Michael's ~00:25 toggle: one global Animation source Hand-made / CMU / Mixamo, the default
  `cmu` = today's game, `ANIM_SOURCE_DEFAULT` in `src/anim/animSource.ts`; a move with no clip in the chosen source
  keeps today's clip), G406 / G407 (Mixamo and other free commercial-use captures, retargeted onto our rigs; ~00:20:
  Michael pre-approves every Mixamo download, the orchestrator downloads them in the browser pane as Player Build lists
  them), ~13:55 (every dark flag on in `/preview/`), prototype mode (~16:05, ~16:20), bible 5.9 C3-C4, bible 5.12,
  level-design 11.8-11.9 and 12.
- `docs/design/scale-sheet.md` and `docs/level-design.md` are Marlow Build's and change only with Michael's approval:
  the rope descent line follows G293 (approved), the human-ladder reach lines follow G57 (approved) as a 12.1 engine-fact
  change; Marlow Build reviews both in the PRs that ship the code (PLAN slices A1, B1). Part 2's new band rows and
  graph kinds are not approved yet: a question to Michael (A12).
- Areas touched and their unwalked count (ROADMAP "Waiting on Michael"): Player / animation 3, AT CAP (the row still
  lists the AF0-AF6 pass, which ~22:25 2026-10-25 dropped, so the real count is 2 until the orchestrator updates it);
  Marlow Yard 3, AT CAP (its kit stations switch from stand-in to the real move through `kitMoveOn`, which Marlow
  wires from what part 2 sends it, A18). The
  cap holds switch-on in the live game only: building goes on, and `/preview/` shows every built move (~13:55). The
  Animation source toggle picks which clips play; it switches no move on. Live switch-on waits for Michael's walk
  (G288, G355).

## Answers (M) and assumptions (A)
- M1 2026-10-25 ~18:05: the five proposed kit moves join the kit (Michael picked, above).
- M4 2026-10-26 ~18:52: Tallow Wharf C4's Plank Bridge -> "Keep it" (Michael picked, via the orchestrator): it stands
  (approved before the 18:47 "Not yet"), using the same move and sizes as Marlow Yard; only further new map uses wait.
- M3 2026-10-26 ~18:47: the A12 sizes question -> "Not yet" (Michael picked, above): the five moves keep the A17
  starting sizes as move constants only; slice KD is parked (no level-design.md / scale-sheet edit) until Michael asks
  to add them.
- M2 2026-10-25 ~20:20: `TEAM.relayMax` stays 4.6 (Michael picked "Keep 4.6 m (Recommended)"); scale sheet line 56
  already says so on master. The relay keeps wire kind `ladder` and is not the shoulder stand (A1); this job leaves it
  alone.
- A1: The "human ladder" of G57 and bible 5.9 C3 is CT's shoulder stand (`docs/ct-research/levels-digest.md:41`: one
  stands on the partner's shoulders to reach a high point; the rider can use weapons), a separate move from the ledge
  relay (bible C3 lists both; the relay keeps wire kind `ladder`, `src/game/teamMoves.ts:11`). Mission-engine
  `docs/missions/PLAN.md` row 106 maps the human ladder to the relay: the orchestrator fixes that row (R32). Undo: drop
  slices B1 / B2.
- A2: One reach number (G57 "one band"): the stand reaches a lip whose grip is at most `TEAM.boostMax` 4.5 m over the
  base's floor; `TEAM.ladderGrab` (4.1, read by nothing on master) is deleted rather than raised. The last 0.8 m comes
  from the base pressing the rider's feet up from the shoulders (the real-world two-person wall assist), starting values
  from the B2 research (G10, G243). Undo: restore `ladderGrab` as its own constant.
- A3: The stand is a free move (G151) like the leg-up: a standing player facing a wall within `TEAM.standWall` (~0.9 m)
  offers it with the Co-op action; CT's authored-spot rule (levels-digest :46) yields to G151. Undo: offer only at map
  marks.
- A4: The rider on the shoulders may aim and fire the pistol (CT; bible line 512 "human ladder top"; the host already
  allows it: `hostHandsFree` treats `stacked` sub 1 as free, `src/net/validate.ts:242`). Undo: keep the rider's hands
  busy in `gameState.ts` and `validate.ts`.
- A5: now M2 (Michael answered the relay lip height at ~20:20 2026-10-25).
- A6: Rope descent uses today's rope offer (a standing player facing a drop, `teamController.ts:772-801`). A partner
  standing beside the holder (same floor +-0.4 m, within `TEAM.ropeReach`) takes it to rappel down; one at the foot still
  climbs. The host tells the two apart by height on the existing `tmove` / `tstart` kind `rope`: no wire shape change.
  Reaching the floor with the stick down ends it (the holder is freed by the existing `tend` `drop`). Undo: drop A1 / A2.
- A7: CT's holder steers the rope sideways (levels-digest :40). Michael never asked for it, no map uses it and prototype
  mode builds playable pieces first, so slice A3 is parked until after Michael's playthrough (~16:05 "Building follows
  your playthrough"); it is built then only if the playthrough or a map asks for it. Undo: build A3 after B2.
- A8: One list flag `kitMoves` (`?kitmoves=stand,descent,...`; `all` = every built id; `0` / `none` = all off). A
  `KIT_BUILT` list in `src/core/flags.ts` names the ids that exist (each slice adds its id when it makes the move
  playable). Default: every `KIT_BUILT` id on `/preview/` (through `PREVIEW_ON`, as `readCampusV2` does; Michael ~13:55
  "All on in preview"), empty in the live game; an id not in `KIT_BUILT` is never on, so Marlow's `kitMoveOn` never
  locks a stand-in for a move that does not exist. Each id switches on in the live game alone when Michael accepts its
  walk item (the walk cap counts moves, not the kit). Campaign's `coopKit` (`?coopkit=1`, pull-up and shutter) lands
  first on PR #578 (origin/feature/mission-b-sector); slice A1 then folds it into `kitMoves` as ids `pull` and
  `shutter` (its `KitKind` names, `teamMoves.ts` `KIT_KINDS` on #578) by its load value only: `flags.coopKit` stays a
  writable field and the gate its readers use, true at load with `?coopkit=1` or `pull` / `shutter` in `kitMoves`
  (Campaign's #581 / #583 set and read it; plan check 3); Campaign moves its readers and removes the field later.
  The two ids stay Campaign's to switch on live. Agreed with the orchestrator ~18:25 2026-10-25 and changed with Campaign
  Build 2026-10-26 ~09:50 (`docs/missions/STATE.md` item 7). Undo: one boolean flag per move, `coopKit` restored.
- A9: Every role is "hand-made + Mixamo <slug>", or hand-made only where Mixamo has no fit (G399, G406, bible 5.12,
  Mixamo top priority ~22:42, the toggle ~00:25, the downloads ~00:20). The hand-made pose comes from the real-world
  technique of trained operators (G210, sources in the slice report, G243 style). The Animation source setting
  (`src/anim/animSource.ts`, on master; default `cmu` = today's game) picks what plays: under Hand-made and under CMU
  (the default) every kit role plays its hand-made pose, since no CMU take is added per kit role (~00:25: a move with no
  clip in the chosen source keeps today's clip; a CMU kit row would become the default look, so none is added); under
  Mixamo the role plays its Mixamo clip where one exists. Mixamo clips are converted and retargeted with the
  Player-owned mixamo-retarget pipeline (`scripts/mocap/mixamo*.mjs`, `scripts/mocap/data/mixamo-clips.json`,
  `src/anim/clips/mixamo/`) and register through `addMixamoResolver` / `MIXAMO_ON` rows (`src/anim/mixamo.ts`). Each
  actor's clip follows that actor's own source (ROADMAP ~00:55, G400): the local player's page setting, a remote
  player's from the wire (`PlayerState.an` -> `AnimGraph.animSource`, PR #498 feature/mixamo-source-wire), so every
  screen draws each player with the owner's choice. A Mixamo row is on unless the capture is visibly broken. Timings
  never under bible 5.12.2 minimums; each move gets tuner rows (`src/anim/moveTune.ts`) so Michael can tune it later
  (no tuning passes now, ~16:20). No CT footage is traced. Undo: drop a capture's rows; hand-made plays under every
  setting.
- A10: The stand's wire: one new `tmove` / `tstart` kind `stand`; MoveState reuses the existing `stacked` mode (sub 1 =
  rider on top, sub 2 = base; `src/player/moveState.ts:46-50`, `:456-458`), so remotes pose from MoveState and the train
  bumps `PROTOCOL_VERSION`. Undo: revert B1's protocol lines.
- A11: Part 2 moves plug into Campaign's kit registry (`src/game/kit/registry.ts`, one file per move, wire kinds through
  `TEAM_KINDS`) once PR #578 (feature/mission-b-sector, Campaign's KIT0 registry + NET kit kinds) is on master; none
  starts before it. Undo: build them on the built-in rail as part 1.
- A12: Michael's 18:05 pick approves the five moves, not their bands. Adding the five graph kinds to level-design 11.9
  and their band rows to the scale sheet changes the level standard, which changes only with Michael's approval
  (CLAUDE.md hard rules; Intake step 2). So the rows are a one-click question to Michael by day (below), asked when the
  detailed part 2 section is written with the numbers in hand; overnight they are assumed and logged (an A line sent
  to the orchestrator for his next look) and the work carries on. The rows and kinds go in one docs slice (PLAN KD)
  only once he answers; until then the slices build on the starting bands (A17). Marlow's validator slice adds the
  kinds to `scripts/level-validate.mjs`. Undo: drop the doc lines; the moves stay off maps.
- A13: The game has no fall damage (`teamMoves.ts:294`), so Drop Catch's gain is the silent, roll-free landing from above
  the hard-landing band (the SIGNOFF row: "The landing is silent"). Undo: add fall harm in a separate job (a Michael
  question).
- A14: The clip list goes to the orchestrator, not to Michael. The lead sends `docs/coop-kit/CLIP-LIST.md` (the Mixamo
  titles per role, the 21 files already in `C:/NightShift/scratch/mixamo/clips/` reused first) once the PLAN passes;
  the orchestrator downloads them in the browser pane (Michael pre-approved every Mixamo download and its use, ~00:20;
  FBX without skin, 30 fps, In Place off). Every role is hand-made regardless; the downloads add the Mixamo option.
  Slices never wait for them: they use the folder as it is when they start and note each missing clip. No CMU takes are
  hunted per kit role (A9). Undo: withdraw the list; roles get Mixamo only from the 21 files.
- A15, A16: in STATE's A-log (the orchestrator's, kept there).
- A17 (2026-10-26 ~18:45, logged for the orchestrator): (A12 answered "Not yet" ~18:47, M3: these stay the move constants) part 2 starts dark on
  the starting bands in the question (each move file's constants; no scale-sheet row or 11.9 kind is written); the
  slices do not wait. Undo: his numbers replace the constants (one line per move, slice KD) or, with "Not yet", KD is
  dropped and the moves stay on Marlow Yard's spots only.
- A18 (Marlow Build 2026-10-26 ~18:20, binding): Marlow owns `kitMoveOn` (`courseState.ts`) and every re-plan set file;
  it rewires `kitMoveOn` to `flags.kitMoves` and wires each station (spot placed, stand-in off) from what each K slice
  sends it: the id, the spot fields (`addKitSpot`) and the done call (`GameMode.onKitDone`). No Player slice edits those
  files. Undo: K0 edits `kitMoveOn` itself (Marlow's agreement needed).
- A19: one done API for every move: `GameMode.onKitDone(kind, spot, a, b)` on the host, once per completed move, keyed
  by the spot id Marlow gives (its station id); spots go in through one `addKitSpot` (K0, `src/game/kit/kitApi.ts`).
  Undo: a per-move event in `GameEvents` instead.
- A20: prototype order (~16:05 "playable pieces", ~16:20): each move first ships as a mechanics slice with placeholder
  poses (existing poses), in the order Michael meets the re-plan stations (A2 plank, A4 deadweight, A5 chimney and
  swing, A6 drop catch); its hand-made plus Mixamo animation (A9) is a later KA slice after his playthrough, with the
  bible 5.12.2 bar and the look video. Deadweight's grate is the map's own sliding door driven by the host (no new
  grate piece). Undo: fold each KA slice into its K slice (one PR per move, as first planned).

## Questions for Michael (one click each, asked by day)
- ANSWERED 2026-10-26 ~18:47: "Not yet" (M3). Part 2 bands (A12; the orchestrator asks it by day, native multiple choice; meanwhile A17). Question: "The five new
  co-op moves need sizes in the level rules so maps are built to fit them. Add these sizes?
  - Deadweight: the chain hangs 2.2-2.6 m up (a jump to grab it), 1-3 m from the grate, one chain on each side.
  - Drop Catch: a drop of 2.5-6.5 m into your partner's arms (the Pump House drop is 6 m).
  - Chimney Pair: a shaft 1.2-1.6 m wide and 3-8 m tall (your 1.4 m at the Substation). The marked shaft cannot be
    split-jumped alone.
  - Swing Pass: a gap of 2-3.5 m, the pipe 2.2-2.8 m over the floor (the Substation trench is 3.5 m).
  - Plank Bridge: a gap up to 3.3 m (a 3.9 m scaffold board resting 0.3 m on each side; the Carriage Shed pit is 3 m)."
  Options: "Add these sizes (Recommended)": the five rows go into the scale sheet and the five move names into the
  level rules (PLAN slice KD) | "Add them, I will change a number": the same, with the number he gives (one line per
  move in code and docs) | "Not yet": the moves are still built and used at Marlow Yard's five spots; the level rules
  stay as they are and no new map may plan on them. Every move is built in the meantime on these starting sizes (A17).
- No download question: Michael pre-approved the Mixamo downloads (~00:20); the orchestrator fetches them (A14).

## Sign-off needed
no (no map or layout; each animation PR carries a 1-2 min look video and every move switches on in the live game only
at his walk; `/preview/` shows it once built).
