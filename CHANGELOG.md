# Changelog

## 4.112.1 - Train 120: Mission framework: mission core (2026-10-26, PR #554; #521)
- Groundwork for campaign missions: the code that describes a mission (its sections, steps, rule and checkpoints) and
  runs it step by step, with its tests. Nothing uses it yet, so the game does not change.
- Docs: the mission rules plans (`docs/mission-rules/`), the J7 and J8-J9 plans, and the Three Grey Coats beat chart
  updated (after Teale moves, the step reads "the clock-mender's back loft").

## 4.112.0 - Train 119: Pad reading makes no per-frame garbage; affected-cap: each change's automatic test runs at most its 3 closest suites; Map ready gate; Kept model files and textures between maps; +8 more (2026-10-26, PR #536; #519, #517, #513, #512, #507, #506, #505, #501, #489, #488, #481)

### Smaller automatic test per change
- The automatic `affected-e2e` run on a PR head now runs at most 3 suites, the closest to the folders the change touches
  (`affectedPick` in `scripts/e2e-affected.mjs`); `src/net`, `src/save` and wire changes run exactly the co-op group
  (`e2e-coop`, `e2e-netmove`, `e2e-ctcourse`). The train's full run catches the rest; `--affected-max` /
  `E2E_AFFECTED_MAX` lift the cap (0 = no cap).
- The laptop queue re-files every open automatic affected request over the cap in place (same id and queue place), so
  the backlog drops at once.

### Start-at-section link for Sector Ops
- Sector Ops dev and walk link `?sectorStart=N`: the run starts at section N as if the sections before it were cleared
  through their connectors (the last connector is the checkpoint, its doors as the cycle leaves them). A practice run:
  the results line ends "PRACTICE from section N" and nothing is saved (no star, no best section rating, no
  progression). In co-op the host's link decides and the partner is put at the host's checkpoint. Works with
  `?campusv2=N` for the campus walk cards.

### Character shadows count in the light (part 2, dark)
- Light: with `?charlight=1` (flag `charShadowLight`) the players and the live guards (dogs as guards) now fill the
  shared shadow shapes each step, so the light meter and the picture's round shadows darken from the same characters
  by the same amount. Bodies and a co-op client's partners come in later parts. Off by default until the guards' cue
  lands and Michael walks it.
- Tests: the fill (players, guards, slot order) and the picture feed allocate nothing per call.

### Character shadows as a faint guard cue (part 3, groundwork, dark)
- Light: the shadow-cue maths guards will use to notice a character's cast shadow (Michael's "A faint cue") is in, with
  light calls that take the point through a shared slot so a full 4-player update allocates almost nothing. Not wired
  into the game yet; nothing changes in play.
- Tests: the cue footprints, and the new light calls match the old ones exactly on 500 random points.

### Laptop queue: skip conflicting PRs, green PRs smallest first, carry train verdicts over docs-only fixes
- The laptop queue no longer runs affected e2e on a PR head that conflicts with master (it posts an error once and runs
  again on the next head).
- PR requests now run front branches first, then green PRs smallest first, then in arrival order, with a bound so no
  request waits forever.
- A train head that moves by a docs-only commit carries the earlier laptop-e2e success; any other moved head runs as a
  normal sharded train.
- A train rerun shards across both laptop slots when they are free.
- An alone request that has waited long gets the gap after the coming train instead of waiting behind train-ready PRs.

### Map load measure
- Load timing record: each map load now records how long it takes to appear and what still builds in the 10 seconds
  after (shaders, lamps, pop-ins, frame times). A new measure script reads it for cold, cached, repeat and
  map-to-map loads. Measurement only: play is unchanged.

### Map ready gate
- Map ready gate (behind `?mapready=1`, off by default): the loading screen now stays up until the map is fully built
  and warmed - graphics settings applied first, then lights, the player's body and weapons, every shader (player and
  weapons first, then the level, then the nearest guards), the reflection probe and every lamp, plus five quiet frames.
  The game is frozen behind it and starts at the reveal: the letterbox, banners and objective play from then. The wait
  is capped at 20 seconds after the level is built (the live lamps are always waited for); past the cap play starts with
  what is ready and the feedback note records it. Test runs can set `E2E_PARAMS=mapready=1` to turn it on everywhere.

### Kept model files and textures between maps
- Faster repeat map loads (behind the map-ready switch, off for now): the game keeps the model files and textures it
  has already read, so loading the next map in the same session does not read and decode them again. The old match is
  still freed in full.

### Mixamo traversal: every capture on Wren's climbs (dark)
- Behind the Mixamo animation source (`?mixamo=1`, still off by default; the default source is unchanged): Wren's vent crawl, ladder climb and
  both lip climb-up captures now play in matches, so every traversal capture is on. The crawl's chest no longer spins
  round (a conversion fix).
- The braced climb-up keeps her hands on the lip until her foot is on the top, then the capture takes over; the
  free-hang stand-up turns her hips far less and stands up at a steadier pace, so nothing snaps as she gets up.

### Mixamo pack driver
- The Mixamo dump script now also reads the four downloaded packs (pistol, rifle, shooter, action-adventure: 106
  files) from their own folders, gives each a unique name with its pack in front, and records which pack it came from
  for the credits. The 55 single files keep their names. No animation in the game changes.

### Player step and traversal make no per-step garbage
- No behaviour change: the player's movement step, the obstacle probe and the committed vault / mantle / drop now
  reuse their vectors, results and records instead of making new ones every step (less garbage-collector stutter).
- Proved bit-identical by a golden trace on real physics (walk, run, crouch under a ceiling, a ledge, a ramp, a
  committed move) recorded before the change.

### Pad reading makes no per-frame garbage
- No behaviour change: the controller read each frame (the pad list, the button snapshot, the stick dead zones and
  curves, the mapped frame) now reuses its records instead of making new ones, so it leaves nothing for the garbage
  collector; proved bit-identical against a recording made before the change (`tests/padPollAlloc.test.ts`).

## 4.111.0 - Train 118: Guard rules (repeat alarms); Route-run robot pair (2026-10-26, PR #515; #510, #500)

### Guard rules (repeat alarms)
- In Sector Ops and the campaign, a guard who sees you again after the response team is in, or a minute later, can
  raise the next alarm, up to three in a section; Marlow Yard still raises one.

### Route-run robot pair
- Route-runs (J13 R4b, test tooling only): `scripts/route-run.mjs` now walks every map with two robots by default
  (`--players 2`): the leader on the host page and the follower on the client page over `?net=local`, both stepped on the
  host's game clock. The follower trails the leader about 2 m behind, crouched, opens doors on its way and has its own
  dead-stop watch; at a split the two walk both legs at once and wait for each other at the rejoin; at a co-op link both
  stand at it for its time and are then placed past it. Detections and dead stops name which robot. Sector Ops hack
  objectives (S2) are now held for their full time instead of tapped. `--players 1` keeps the one-robot run.

## 4.110.0 - Train 117: Campus greybox: per-section v2 switch; Mixamo body carry on Wren (behind ?mixamo=1) (2026-10-26, PR #509; #503, #493)

### Campus greybox: per-section v2 switch
- No player-visible change: Saltmarsh Park plays exactly as before.
- Sector Ops build plumbing for the signed-off S1-S5 re-plans: each campus section can now be built from a new,
  separate layout that stays off by default (`flags.campusV2`, `?campusv2=1,3` for test builds), so the five sections can be
  rebuilt in parallel and switched on one by one after each walk. The new layouts start as exact copies of today's.

### Mixamo body carry on Wren (behind ?mixamo=1)
- Behind `?mixamo=1` (off by default): carrying a body on the shoulder, Wren's trunk, head and pelvis height play the
  Mixamo carry walk (on the game's own step timing) and carry idle; the feet, the carry pace and the hands on the body
  are unchanged. The co-op partner sees the same.
- The Mixamo elbow strike and cross punch are wired to the knockout strike's timing (on Wren's own hips) but stay
  hand-made in matches: squeezed onto the game's fast strike, their forearms snap too far in one frame. The kneel-down capture stays in the Anim
  Studio only (the game has no kneeling put-down yet).

## 4.109.0 - Train 116: Test Runner batch (J20), PR-A: affected suites and runner; Character shadows count in the light (part 1, dark) (2026-10-26, PR #508; #492, #459)

### Character shadows count in the light (part 1, dark)
- Light: a character standing between a lamp, the moon or a torch and another character now darkens that spot in the
  light model the meter and guards read, with the same soft shadow shape the picture draws. Off by default
  (`?charlight=1`, flag `charShadowLight`) until the meter wiring and the guards' cue land and Michael walks it.
- Tests: the shadow shape, the light-field term and the torch holder rule; the shadow maths allocates nothing per call.

### Test Runner batch (J20), PR-A: affected suites and runner
- `--affected` adds the co-op group (e2e-coop, e2e-netmove, e2e-ctcourse) for any file on the wire: `src/net/` and the
  files `src/net/protocol.ts` imports, read at the tested commit.
- Saltmarsh Park map files pick `e2e-sectorops` part 6 (all of `e2e-sectorops` with `--wide`).
- The audio suites join the legacy ones as REPORT ONLY: an affected request never gates on them.
- A quarantined suite that times out or crashes now fails the run; only an assert failure (exit 1) counts as KNOWN
  FLAKY. `E2E_REPORT` names suites that run REPORT ONLY in any run.
- `perf.mjs` prints the map and mode it measured.

## 4.108.0 - Train 115: Mixamo walking, jogging, starts, stops, turns and strafes on Wren (behind the Mixamo animation source); Route-run harness core (one robot) (2026-10-26, PR #504; #499, #496)

### Mixamo walking, jogging, starts, stops, turns and strafes on Wren (behind the Mixamo animation source)
- With the Mixamo animation source on (and "Mocap locomotion" on), Wren's walk, jog, start from standing, stop, turn on
  the spot, turns while walking and aimed strafes play Mixamo captures in place of the CMU ones. Speeds and timing are
  the game's own: the clips are fitted to the game's stride and to the CMU clips' seconds or turn angle.
- The Mixamo run and sprint stay off in matches for now (their knees cross at the game's run speed); they and the run
  stop, the left turn on the spot, the crouched side-steps and the backwards walk and run play in the Anim Studio.
- With the default source (CMU) nothing changes.

### Route-run harness core (one robot)
- Route-runs (J13 R4a, test tooling only): `node scripts/route-run.mjs <url> --graph <files>` walks a robot through every
  planned route of a map against its live guards, headless, with the pad, in game time, and writes the run log,
  `route-run.json` and a plain `REPORT.md` (detections and notices with their inferred cause, dead stops with a
  screenshot, stubbed links). `--dry-run` prints the plan without a browser, `--routes code` walks the map's own Sector
  Ops routes, `--selftest` checks a fixture's expected outcomes, `--publish` / `--merge` carry laptop results to the
  desktop through the `route-run-results` branch. Caller query params such as `?campusv2=2` stay on every page. One robot
  for now; the pair, course drill gates and real link moves follow (R4b, R4c, R5).

## 4.107.0 - Train 114: Mixamo standing idle and crouched walk on Wren (behind ?mixamo=1); Mixamo crouch and stand-up on Wren (behind ?mixamo=1); +1 more (2026-10-26, PR #502; #485)

### Mixamo standing idle and crouched walk on Wren (behind ?mixamo=1)
- Behind `?mixamo=1` (off by default): Wren's standing idle and, with Mocap locomotion on, her crouched sneak can now
  play the Mixamo standing idle and crouched walk; guards keep the hand-made idle. Both stay hand-made in matches for
  now (the idle holds the elbows too far out, the crouched walk turns the hips and knees out); the Anim Studio still
  plays both captures.

### Mixamo crouch and stand-up on Wren (behind ?mixamo=1)
- Behind `?mixamo=1` (off by default): standing still, Wren's crouching down and standing up can play the Mixamo
  stand-to-crouch and crouch-to-stand captures on the game's own stance timing (the stance is never faster or slower).
  Both stay hand-made in matches for now: squeezed into the game's 0.22 s change the captures jerk the body and hold
  the elbows out more than the hand-made blend; the Anim Studio still plays both.

### Mixamo idle, crouched walk and stance changes fixed and switched on (behind ?mixamo=1)
- Behind `?mixamo=1` (off by default): the Mixamo standing idle (arms brought in 11 deg), crouched walk (its trunk
  turned onto the direction it walks) and crouch-down / stand-up (cut to the drop and the rise, on the game's own 0.22 s
  stance) now play on Wren in matches when Mixamo is picked; the Anim Studio plays the same corrected clips for tuning.

## 4.106.1 - Train 113: Trains: doc-lint left-outs; a fix commit no longer hides the version commit (2026-10-26, PR #497; #495)
- Train build: `merge-train build` runs doc-lint on the merged tree after each member and leaves out a member that
  adds a doc-lint error (for example two members together over a doc budget), with a comment asking its lead to fix
  the doc; the rest of the train ships instead of the whole train failing CI `lint`.
- Auto-train: a fix commit on top of a train of over 100 commits no longer hides its version commit ("no version
  commit: rebuild", train 112); the head's newest commits are read when it is missing.

## 4.106.0 - Train 112: Guard rules; Objective pop-up, objective list and Notes; Saltmarsh Park lamp light ships pre-built (dark); Marlow batch fixes; Mixamo traversal captures on Wren (dark); Doors: one 15% light threshold; +1 more (2026-10-26, PR #491; #483, #482, #477, #474, #471, #469, #450)

### Guard rules
- Helmets follow the difficulty in Sector Ops (and the campaign, which runs on it): on Realistic and Perfectionist every
  guard wears a helmet from the start. On Perfectionist a helmet is never shot off: the first headshot only staggers
  him and the second kills. On Rookie and Normal guards are bare-headed until alarm stage 2.
- Alarm stage 2 now gives every guard a helmet as well as body armour.
- Riot shields lead the alarm response teams only in the later Saltmarsh Park sections (4 and 5). Earlier sections,
  the warehouse and Marlow Yard send armed guards only.
- Killing a guard dog now counts as a kill (no Perfect, no "No kills") and costs score. Knocking one out with gas
  still scores as a knockout.
- Sector Ops data checks reject a riot shield guard placed on the map and any helmet named in map data: helmets come
  from the difficulty and the alarm stage. Saltmarsh Park sections 4 and 5 keep their body armour.
- Dogs can no longer be taken down in any way (behind, side, drop, from a ledge, the co-op team takedown); in co-op
  the host also refuses a takedown on a dog. Sleeping gas still knocks a dog out.

### Objective pop-up, objective list and Notes
- A tap of View (pad) or O (keyboard) shows the current objective for a few seconds; it also shows whenever the
  objective changes (G343).
- Sector Ops: Pause > Objectives lists the full objective list for the operation, on the host and the co-op client
  (G343).
- Pause > Notes: the lines learned from interrogations this match, newest focused, "No notes yet" when empty. A co-op
  client keeps the intel and keypad radio lines only; a client that drops and rejoins starts with empty notes.
- Co-op: connection notices no longer take over the objective line; they show on their own status line.
- Tests: e2e-sectorops, e2e-pad, e2e-mouse, e2e-coop, e2e-takedown and e2e-menus check the pop-up, the binds, the
  objective list and the Notes screen.

### Saltmarsh Park lamp light ships pre-built (dark)
- Loading: the campus lamp light is now baked once when the game is built and shipped with it (5 files, 5.5 MB), so a
  player's PC no longer bakes it at the start of a match. Off by default (`?mapready=1`, flag `mapReady`) until the
  Sector Ops and Marlow Yard walks land; any mismatch falls back to the PC bake as before.
- Tests: the shipped light matches the PC bake byte for byte; a stale, missing or damaged file is never used.

### Marlow batch fixes
- e2e-ctcourse A8 pass 2: the close by hand of the relocked grille waits until the door's item is live on the host, so
  a `use` read between the two host steps of a relock no longer reads 'disabled' (train 106 flake; docs/backlog.md
  "Flaky e2e suites").

### Mixamo traversal captures on Wren (dark)
- Behind `?mixamo=1` (off by default): Wren's ledge hang plays the Mixamo hanging idle, the shimmy left / right by the
  way she moves along the lip, and the ladder top-out its capture; guards and team climb-ups keep the hand-made clips.
  On the hang and the shimmies the palms stay on their grips as on the hand-made clip; the top-out misses its grips by
  7 cm (the hand-made clip by 11.8).
- The ladder climb, both lip climb-up captures and the vent crawl stay hand-made in matches for now (they took the hands
  or feet off their holds, or popped); the Anim Studio still plays every traversal capture on its loop and says which
  ones stay hand-made.

### Doors: one 15% light threshold
- Light: a door opened or closed by hand now stops lamp light until it is past 15% open, the same line a slowly
  pushed door already used (it was 5%); the light meter, the picture and torch light agree.

### Sector Ops: stars fill lower, Perfect, Saltmarsh Park stars on the menu
- Sector Ops: clearing an op on a harder difficulty now fills every easier star too (old records included).
- Sector Ops: a run with no kills and no alarm is marked PERFECT on the result line and the extraction banner.
- Main menu: the stars beside Sector Ops are Saltmarsh Park's, and its line names Saltmarsh Park.
- Tests: a data check that every Saltmarsh Park section with team doors keeps a route past them for a solo player.

## 4.105.3 - Train 111: Test Runner batch (J20), PR-C: quarantine and hard-rule checks (2026-10-26, PR #486; #445)
- Every REQUIRED e2e suite has an owner in `scripts/e2e-quarantine.json`, and `tests/e2eQuarantine.test.ts` checks the
  file (owners, complete entries, ISO expiry, each quarantined suite written up in `docs/backlog.md`).
- New unit tests for three hard rules: no route timer in Sector Ops (rule 6), the graphics import boundary (rule 10)
  and patrol and detection replay under a poisoned `Math.random` (rule 8).
- `e2e-sectorops` part 6 checks every spawned guard is alive at start on Saltmarsh Park sections 2-5, and `e2e-ctcourse`
  checks every guard is alive at each Marlow Yard set (rule 9).

## 4.105.2 - Train 110: Validator port B2: measure CLI, scale sheet rows and strict metrics-gen; Level validator docs (2026-10-26, PR #484; #480, #479)

### Validator port B2: measure CLI, scale sheet rows and strict metrics-gen
- `scripts/level-measure.mjs` (run as `node scripts/level-measure.mjs <graph.json> ...`): measures a map's greybox
  (floor shadow, vantage, LOS break, split legs and partner reach, link times) and writes it back as `measured`. The
  files of one map are merged, measured once, and each file gets only its own spaces and links, so cross-file links get
  times and a second `--write` of the same values changes no byte; a campaign graph also gets `meta.measured.ways_back`.
  `--check` exits 1 on a target miss or a drift; `--points <out.json>` writes the resolved points for one map per call
  (with `--check`, not `--write`); `--flags <key>=<value>[,<value>]` sets a `flags` key by its current type (a text key
  such as `mode` is not checked against its allowed values; an unknown key exits 2). Documented in
  `docs/systems/testing-tools.md` "Measure CLI".
- `scripts/metrics-gen.mjs` prints its usage and exits 2 on any argument but `--check` (`--help` included), writing
  nothing.
- Scale sheet section 3: the Relay lip row states the physical lip ceiling, `TEAM.relayMax` 4.6 + `HANG.drop` 1.9 =
  6.5 m, and keeps the 4.3 - 4.6 m band (Michael picked "Keep 4.6 m"); a new "Long throw (named spots only)" row (gap at
  most 4.9 m at two named Tallow Wharf spots) is read into `sizes.throw_long`.
- Scale sheet section 8: `nav_floor_depth_m` 1.5 and the mission-validator rows (`mission_steps`, `mission_step_min`,
  `mission_total_min`, `mission_rules_max`, `sector_parallel_min`, `sector_syncs_min`); `metrics.json` regenerated.

### Level validator docs
- Level validator docs: the graph schema now describes the measured values, the new area and opening-point fields and
  all six new co-op link kinds, and the level standard's co-op kit list names the vent unlock door.

## 4.105.1 - Train 109: Laptop queue: hold PR runs until the next train (2026-10-25, PR #478; #475)
- The laptop queue predicts when the next train arrives (from the last release's deploy wait or a newly green
  train-ready PR) and holds new PR runs until then, so trains stop cutting runs they let start.
- Under that hold only runs that fit before the next train start (known expected time, 120 s prep, 1.2 x slack).

## 4.105.0 - Train 108: Level validator: measured checks; Mixamo motion capture in the Anim Studio (2026-10-25, PR #476; #472, #452)

### Mixamo motion capture in the Anim Studio
- 21 Mixamo motion-capture moves on Wren's rig, listed in Main menu > Anim Studio (dev) > "Motion capture" as
  "Motion capture (Mixamo): <name>" and tunable there like the CMU captures (Body > Joints, Hands & feet, Limb reach):
  idle, crouched walk, stance changes, carry, crawl, strikes, kneel, team pull, lift, hang, shimmy, ladder, climb-ups.
- The Now playing line names the capture source ("motion-capture (CMU) walk"); one source table for every capture.
- Offline pipeline: headless Blender dump of the downloaded takes, Mixamo bone map onto Wren (spine and chest checked
  under 8 degrees on every take), keyed and traversal clip emitters; CMU clips unchanged. Credits in
  `docs/art-credits.md`. In-game use comes in later PRs behind the `mixamo` flag.

### Level validator: measured checks
- Level validator (tooling, no game change): the validator now checks a map's greybox measurements against the scale
  sheet. A measured view of an encounter space that is too small, or a broken line of sight that lasts too long, is an
  error; a measured shadow share outside 40-60% is only information, since the real-world light band is the target.
  Split paths are checked for leg time, for both legs taking about the same time, and for how quickly one partner can
  reach the other; on campaign maps, each co-op move's way back for the partner is checked against the revive reach.
- With `--require-measured` (the greybox exit gate) every encounter space, every split and every campaign co-op way
  back must have measured values. A move the nav grid cannot time is a warning to justify in the design doc, and its
  hand-written time is still checked. Maps without measurements yet print "pending V6" notes and pass as before.

## 4.104.2 - Train 107: Tallow Wharf map spec; Marlow Yard rule fixes; No minimap, compass or blips; Guard AI allocation fixes (2026-10-25, PR #470; #466, #463, #447, #446)

### Guard AI allocation fixes
- Guards no longer create garbage when they shoot, bite or think: shots, bites and their moves reuse kept
  values, and the guard manager's half-second checks use plain loops.

### No minimap, compass or blips
- The minimap, the compass strip and every objective, pickup, partner and enemy dot are gone from every mode (G339,
  G135): Sector Ops, Marlow Yard, free roam and co-op. The Marlow Yard drill pointer, world pings and the partner's
  goggle colour stay. The context menu moves up to its CT spot now nothing sits above it.
- The legacy HQ "Minimap radar" upgrade is gone; saves move to version 10 (an old radar level is dropped, credits are
  not refunded).
- Tests: every suite that read the minimap or blips is flipped; Sector Ops, Marlow Yard, free roam and the co-op
  client now each check that no minimap or compass is on screen.

### Marlow Yard rule fixes
- Marlow Yard needs two players: the co-op lobby will not start Course mode with one player, on every build, and the
  lobby says why ("Marlow Yard needs two players").
- Revives in Marlow Yard stay capped at two: a good set rating no longer gives a syringe, and the rating card never
  offers one. Gadget charges and medkits are still granted; Sector Ops ratings still give syringes.
- The A2 Carriage Shed's entry vantage is now checked as out of the deck watchers' view.

### Tallow Wharf map spec
- Docs: `docs/tallowWharf-map/SPEC.md` is the Tallow Wharf (campaign Mission 1) spec on the map-spec template: Michael's
  binding words, stairs and exits, guard totals under the 32 cap, co-op routes with the way back per gate, the objective
  chain, and real-world light bands with a light table for every space (no space dark by design).

## 4.104.1 - Train 106: Level validator: gate core (2026-10-25, PR #467; #464)
- Level validator (tooling, no game change): the shared graph helpers move into one library
  (`scripts/level-graph-lib.mjs`) that the level validator, the measure tool and the mission validator all import.
  Each map mode (campaign, training, Sector Ops) now has its own rule profile, with empty check modules ready for the
  measured, training, perfect-run and engine checks that follow. The new co-op kit moves (plank bridge, deadweight,
  vent unlock, chimney pair, swing pass, drop catch) are known link kinds, and `teach:<move>` space tags are accepted.
  Validator output on every map is unchanged.

## 4.104.0 - Train 105: Guard anim tier: off-screen every 8th frame (guard-cap T1) (2026-10-25, PR #465; #438)
- A guard drawn in no local view now solves his animation every 8th frame (was every 4th); the far tier (every 2nd),
  the 4 m near-player rule, takedowns, holds, emotes, climbs and the frozen tier are unchanged, and the skipped time is
  still carried into the next solve. Guard-cap M0 measured the anim solve at 55-59% of the sim growth with 24-32
  guards. Gameplay is unaffected (hit volumes come from the sim). `?animtier=0` still turns the tiers off.
- A guard out of view whose shadow (a lamp's, the moon's, a torch's) can fall in the view counts as seen and animates
  like a guard in view (every frame; every 2nd past 22 m, as on screen), so his shadow never steps (A195, G327,
  Michael 2026-10-25 "shadow in view = seen"). The test is the Sector render
  freeze's own frustum test (frustum only: a shadow behind a wall still counts). `?animshadow=0` turns the shadow rule
  off and `?animoff=N` sets the off-screen period, for A/B runs on one build.

## 4.103.9 - Train 104: Level validator: measure core; Marlow Yard objective lines name the place; Tuner clarity polish (2026-10-25, PR #462; #460, #441, #440)

### Marlow Yard objective lines name the place
- Marlow Yard's objective lines now say where as well as what: the way-back and swap steps name the neck and the far lobby, and the list's last row says "holding room two" (or the cash dock) instead of a code.

### Tuner clarity polish
- The tuner's "Motion capture / Hand-made" tags no longer flicker when the live share sits right on the edge, the tag
  is never cut off on narrow panels, and the key tools stay quiet when no slider is picked.
- Editing a "no gun" row while she has a gun drawn now says so: "Holster to see it."

### Level validator: measure core
- Level validator (tooling, no game change): the measuring module from the V6 work joins master. It times every walk
  between spaces on the real nav grid, finds the point on each shared wall where a link sits, measures each campaign
  co-op link's way back for the partner, and gives the robot route-runs one shared table of space and link positions.
  A link whose shared wall has two or more gaps gets no guessed time; the validator reports it instead.

## 4.103.8 - Train 103: Route-runs: progress, stuck and steering math; Route-run report; Mission framework: specs and sign-off pages, graph-svg (2026-10-25, PR #461; #456, #453, #372)

### Route-run report
- Route-runs R2: `scripts/route-run/report.mjs` turns a robot run log into `route-run.json` and a plain-English `REPORT.md` with walk-card lines and the Marlow time line; tooling and tests only, no game change.

### Route-runs: progress, stuck and steering math
- Route-runs (J13 R3): the test robots' pure math in `scripts/route-run/progress.mjs`: progress along the planned
  path (one storey at a time), the stuck watch (under 0.5 m in 8 s while walking; per-step time limits), the pad stick
  and pace that give the crouched sneak speed from `docs/design/metrics.json`, the partner's trail point, which guard
  level changes count as a detection or a notice, and the inferred cause of each. Tooling only.

## 4.103.7 - Train 102: Route-runs: route planner; Mission framework: specs and sign-off pages, graph-svg (2026-10-25, PR #458; #455, #372)
- Route-runs (J13 R1): a route planner for the robot test runs. From a map's connectivity graph and its points table it
  picks the fewest runs that walk every declared approach (shadow, high, loud) of every guarded space, plus the one
  start-to-exfil run on Marlow Yard and the late sections that keep a side route. Tooling and tests only.

## 4.103.6 - Train 101: Fold: Michael's plan answers (G364-G407) (2026-10-25, PR #454; #442)
- Docs: Michael's decisions of 2026-10-25 folded as G364-G407 (session layout, the folded-plan sign-off and its 39
  answers, the mission sign-off pages, five more co-op kit moves, the 12 level-rule changes, near-instant map loads,
  Mixamo motion capture, free assets with a commercial-sale licence) into `docs/DECISIONS.md`, the design bible,
  `docs/VISION.md`, `docs/level-design.md` (Michael-approved by the same decisions) and the owner docs of each changed
  rule; replaced wording added to `docs/stale-terms.json`.
- Docs: RULES lines from Test Runner J1 (#432): the failed-head triage watch, old-head affected-e2e requests, a tier
  row for queue / train / tool scripts and the laptop's spare work.

## 4.103.5 - Train 100: Mission framework: specs and sign-off pages, graph-svg (2026-10-25, PR #451; #372)
- Mission framework A: specs and sign-off pages (Tallow Wharf, 4 missions, co-op kit) + graph-svg (#372)

## 4.103.4 - Train 99: Mission framework: specs and sign-off pages, graph-svg; Sector Ops docs: conformance fixes (2026-10-25, PR #449; #433, #372)

### Mission framework: specs and sign-off pages, graph-svg
- Docs: `docs/missions/` holds the mission framework's BRIEF, PLAN and STATE, plus the research behind it. Six sign-off packs sit in `docs/missions/prototypes/`, all signed off by Michael on 2026-10-25; each has a beat chart, a mission graph, a plan image and a one-question sign-off page:
  - the new campaign map Tallow Wharf (4 sections, every section forces a co-op kit move);
  - its two missions, Three Grey Coats and Two-Key Ledger;
  - the Sector Ops missions Split Shift (campus S2) and Code Relay (campus S4);
  - the co-op kit moves.
- Tooling: `scripts/graph-svg.mjs` draws a level graph to scale from its `area` boxes and `at` points: 1 m = 10 px, north up, a scale bar, tracks coloured, objective / sync / lead nodes. `--base <svg>` overlays a plan SVG. Tests: `tests/graphSvg.test.ts`.

### Sector Ops docs: conformance fixes
- Saltmarsh Park plan docs follow the new lighting rule: every space lit to the real-world band for its type, every
  light working, darkness only from cover, cut power and shot lamps; the old dark-vantage allowance is retired.
- Saltmarsh Park plan docs give the signed-off guard counts (S1 15, S2 18, S3 20, S4 25, S5 26 at two players).
- The first campus validator reports are marked as history: their 40-60% shadow errors no longer apply.
- Graphics settings: the Character shadows help text now says Auto gives the nearest lamp's shadow on Low and Medium.
- Lighting system doc: character shadows on Low and Medium and the glass rule match the game; dead fittings are
  marked for re-lighting (every light works).

## 4.103.3 - Train 98: Level standard: Michael's 12 level-rule changes (G157); Player docs match the game; Guard AI docs match the code and Michael's answers (2026-10-25, PR #448; #443, #437, #435)

### Guard AI docs match the code and Michael's answers
- Guard AI docs (FOLDED-PLAN J1): `docs/systems/ai.md` now says what is built for glass, lookouts and pairs, the
  guard cap per mode (campaign 32), the campus guard counts, the close-range distance, the modes, the one-alarm rule,
  downed players and the Sector Ops guard tags; two stale code comments fixed; BRIEF A183 closed by G327.

### Level standard: Michael's 12 level-rule changes (G157)
- The level standard writes in the 12 level-rule changes Michael adopted (G157): a vantage for two, the finale seen
  early, a designed exit, pacing targets in minutes, teamwork minimums, the two-minute test, readable machines and
  windows, real stairs, exits, signs and security, and the two-player final tests. Marlow Yard is exempt from the
  campaign's built-for-two checks.
- The map spec template gains fill lines for them; fire alarms unlocking doors as a player tool stays a separate
  decision (level-design open item 3).
- Marlow Yard: every failure is a retry, a set has only the guards its move needs (maybe none, at most 3), and side
  routes stay closed except a late section that trains against enemies. The scale sheet's relay lip row now says the
  relay's 4.6 m limit is how high the hanging partner's feet sit, not a lip height.

### Player docs match the game
- Player docs now match the game as built: movement, controls, takedowns (the palm strike is built) and which moves use motion capture.
- Finished animation job notes moved to the archive; reference-game names removed from the operator art notes.

## 4.103.2 - Train 97: Marlow docs fixes (folded plan J1); Test Runner conformance: doc fixes (J1) (2026-10-25, PR #444; #436, #432)

### Test Runner conformance: doc fixes (J1)
- Docs (conformance review T16, T18, T19, T22; folded plan Q30): testing-tools lists the laptop's spare-work tier and
  the request-time refusal of unknown suite names, says `E2E_HEADED` is never used on Michael's PCs, adds the
  `e2e-menus` bullet and `scripts/e2e-times.json` to the no-suite list, and writes Michael's repeat-quarantine rule
  (a second quarantine within 14 days makes the suite blocking with a fix job). TESTING.md keeps the desktop and
  release checklists; the per-job lists move to `docs/archive/testing-job-sections.md`.

### Marlow docs fixes (folded plan J1)
- Marlow Yard spec follows Michael's 2026-10-25 answers: no strict rule (every failure a retry), failed drills retry
  in place, one forced route per set (side routes close in the re-plan), only the guards each move needs.
- Guard cap docs land on master (M0 and M1 measurements, run 4100); any cut below 32 guards goes to Michael first; the
  60 fps target at 32 guards is recorded for the perf job.

## 4.103.1 - Train 96: Campaign docs: no compass, blips or map screens (J1) (2026-10-25, PR #439; #434)
- Docs: the doc check now flags the compass, blips, the briefing map, the field-menu map and the radar upgrade as
  removed features (G336, G339), next to the minimap; three old prototype notes mark the minimap as history.
- Docs: the menu spec drops the briefing map and the field terminal's Map item, and the co-op code inventory marks the
  minimap ally blip and objective blips as replaced (G336, G339, G135).

## 4.103.0 - Train 95: Animation tuner clarity (2026-10-25, PR #431; #430)
- The animation tuner now shows whether each setting changes the motion-captured animation, the hand-made one, or both.
- It shows what is playing now, for example "Now playing: motion-capture walk", under the tabs and in the Anim Studio.
- It warns for a few seconds when an edit changes nothing on screen, and says which setting does work instead. Turn this off in More > Panel.
- The Keys tab has Left leg and Right leg parts, with "foot twist, toes out" and "shin twist" rows for each leg.

## 4.102.6 - Train 94: Doc guard; Doc hygiene (2026-10-25, PR #429; #400, #425)

### Doc guard
- `npm run lint` also runs the doc lint (`scripts/doc-lint.mjs`, so CI's `lint` and `check` run it): stale terms
  (`docs/stale-terms.json`), G citations (missing or replaced entries cited as current), broken links and repo paths,
  key rules restated outside their owner file (`docs/doc-owners.json`), size budgets, and appended "Note 2026-" lines
  in the design bible. Errors fail CI; warnings print.
- A job's final PR carries a `Job-done: <job>` line; the train's version commit then moves `docs/<job>/` to
  `docs/archive/<job>/` and fixes the links to it.
- `scripts/prune-merged.mjs` lists (and with `--apply` removes) idle merged worktrees and merged branches older than
  7 days; `scripts/prune-task.ps1` registers it as a weekly task.
- `docs/RULES.md` "Docs": the doc map, one home per rule, folds rewrite in place, the drift audit, doc lint, the weekly
  prune and `Job-done:`.

### Doc hygiene
- `docs/RULES.md`: every resume block ends with one `Next:` line; the signed-off plan is the only plan (superseded plan
  files are archived the same day); a short orchestrator tidy-up daily and after each release; updates to Michael in
  plain English and brief dot points.

## 4.102.5 - Train 93: Co-op lamp guard and guard bake abort polish (2026-10-25, PR #428; #427)
- In co-op (Marlow Yard and Sector Ops), a client's round at a lamp that reaches the host in the frame after a pause
  menu restart, before the host has noted the restart, is dropped quietly too. No wire change.
- Tools: when the offline guard bake (`scripts/operators/guard-bake.mjs`) stops a stage, the ABORT line now names the
  first lost job and its cause: a spawn error (ENOENT, EPERM, ...), exit 0xC0000142, or a quick failure with an empty
  log.

## 4.102.4 - Train 92: Conformance review: Guard AI (plan only); Saltmarsh Park section bake: clean shutdown of light-bake workers; Conformance review: Sector Ops (plan only); +3 more (2026-10-25, PR #426; #423, #421, #420, #419, #417, #416)

### Conformance review: Campaign (plan only)
- Docs: plan-only conformance review of Tallow Wharf, the mission framework / engine and the campaign rules against
  VISION, RULES, level-design and DECISIONS (`docs/conformance-campaign/CONFORMANCE.md`). No game change.

### Conformance review: Guard AI (plan only)
- Docs: Guard AI conformance review against VISION, RULES, the bible and level-design: gap table with fix sizes,
  what conforms, and archetypes per map (`docs/conformance-guard-ai/CONFORMANCE.md`; plan only, G355).

### Conformance review: Marlow (plan only)
- Docs: `docs/conformance-marlow/CONFORMANCE.md`, the Marlow Build conformance review (G355): a gap table for Marlow
  Yard (map, mode, HUD guidance), the level validator, the bot route-runs and the guard cap against VISION, the level
  design standard, the bible, RULES "Intake" and G292-G363, plus the items that conform. Plan only: no src, test, map,
  script or config change.

### Conformance review: Player (plan only)
- Docs: Player Build conformance review of movement, animation, takedowns, the co-op player and guard models against
  VISION, the bible, level-design and DECISIONS (`docs/conformance-player/CONFORMANCE.md`; plan only, G355).

### Conformance review: Sector Ops (plan only)
- Docs: `docs/conformance-sector-ops/CONFORMANCE.md`, the Sector Ops conformance review (G355): a gap table for
  Saltmarsh Park S1-S5, the old warehouseOps map, the Sector Ops mode rules and stars, lighting on every map and the
  visual gate against VISION, level-design, the bible and the G entries, the items that conform and a per-map
  lighting line. Plan only: no src, test, map, script or config change.

### Saltmarsh Park section bake: clean shutdown of light-bake workers
- Leaving a match mid-bake now ends every light-bake job, the running ones included, instead of leaving some waiting.
- If a replacement light-bake worker cannot start, the bake carries on one worker short instead of failing.
- A lamp that takes over a minute in a worker is noted once in the log.

## 4.102.3 - Train 91: Tooling audit B fixes (2026-10-25, PR #424; #412)
- Auto-train pacing reads the laptop queue as it is (`requests/` and `claims/`, one GraphQL call): busy while a request
  has no claim yet (under 12 h old) or a claim is open (under 3 h old). The old read looked for `pending/` / `running*`
  markers the branch never had, so every tick read idle and pacing never waited.
- Auto-train self-updates its checkout (fast-forward only, clean tree) right after each release as well as on idle
  ticks, before the next train is built; back-to-back trains had left it at train 80 with master at 86.
- `swap.mjs` save check reads the laptop slot locks (`heavy-4189.lock`, `heavy-4192.lock`) and any other
  `heavy*.lock` beside `heavy.lock` / `heavy2.lock`; a dead pid in any of them is an item.
- Affected e2e requests leave out the GPU-only and legacy suites (`affectedGateSuites`; the runner's GPU / LEGACY
  lists now live in `scripts/e2e-affected.mjs`), so affected-e2e never runs or gates on them.
- Dead scripts moved to `scripts/archive/` (no package script, workflow, live script or scheduled task used them):
  `ghost-strip`, `menu-shots3/4/5`, `menu-boot-time`, `camera-cue-shots`, `nv-shots`, `sector-fixes-c-shots`,
  `wheel-shots`, `laptop-runner.ps1`; doc paths updated.

## 4.102.2 - Train 90: Laptop queue: suite names checked at request time, confirm rerun before a guessed auto-drop, spare work when idle (2026-10-25, PR #415; #408)
### Changed
- Laptop queue: `request.mjs --suites` takes names split by spaces or commas, and refuses an unknown suite name at request time (checked against the sha's `scripts/`; `name:N` parts by their base name) instead of letting it reach the runner as a false failure.
- Auto train: when a train's own laptop failure maps to no member (a tier 2-3 guess), it first reruns the failing suites once on the same head; a member is dropped only if that rerun fails too.
- Laptop queue: after 5 idle minutes (`LQ_SPARE_IDLE_MIN`, 0 = off) the laptop queues one spare job from `docs/laptop-queue/spare-jobs.json` on the master head (full e2e, e2e-coop x5, guard-cap ctcourse 24 / campusops 32, campusOps perf), round-robin, one at a time, each once per master sha. A spare job never starts while a real request is open and stops (done, not rerun) as soon as a train or a real request arrives.

## 4.102.1 - Train 89: Conformance review: Test Runner (plan only) (2026-10-25, PR #413; #410)
- Docs: `docs/conformance-test-runner/CONFORMANCE.md`, the Test Runner conformance review (G355): a gap table for the
  suites, the affected-e2e tiers and the laptop queue against RULES, testing-tools, VISION 4-5 and level-design 15,
  the hard rule to suite map, the 7-day flake budget and the items that conform. Plan only: no script, test, queue or
  config change.

## 4.102.0 - Train 88: Docs: level standard per mode, archive sweep, re-audit fixes G344-G363; Stealth pays: client intel (2026-10-25, PR #411; #407, #389)

### Stealth pays: client intel
- Co-op: the client can interrogate any guard the host says still has intel (revived guards, after a rejoin, and
  Sector Ops guards once their slots carry intel), and a guard the host interrogated no longer offers INTERROGATE on the client. Wire change: an
  optional `EnemyState.in` flag (absent for guards without intel).

### Level standard per mode
- Level standard (`docs/level-design.md`) now states its rules per mode: every rule is tagged [All] / [Campaign] /
  [SectorOps] / [Training], with a profile per mode and a rule index (rule, modes, metrics key, validator check,
  owner). Campaign sections each force a co-op traversal move with a way back; Sector Ops keeps solo routes past team
  doors; Marlow Yard is a guided linear course with timed drills. Guards as many as realistically possible (Sector Ops
  32 alive ceiling), real-world light bands replace the shadow share, up to 2 strict rules with section restart,
  objectives name what and where with no maps, measured validator pass and bot route-runs at greybox exit.
- Level validator: `meta.mode` campaign / sector / training profiles (forced co-op gate and gate reach, no softlock and
  the alive ceiling, no route counts for training), the co-op kit kinds (`team_throw`, `team_hang`, `team_pull`, `shutter`) and `bolted` doors, shadow share as INFO. The scale sheet gets
  `sector_alive_max` and a light-band placeholder; the uploaded stealth skill is reference only.

### Level standard re-audit fixes
- Level standard (`docs/level-design.md`): campaign missions run on the Sector Ops runtime with a 32 alive ceiling;
  engine facts rewritten from the code (five speeds, no sprint, silent bands, guard sight above, doors, camera); one
  checkpoint rule and a downed rule per mode; Marlow Yard's training rules (timed drills, strict rules taught late,
  campaign downed rule, 15-20 min); security devices with a security register; unavoidable guards in Sector Ops;
  helmets and dogs per the 2026-10-25 answers; killing a civilian restarts the section; history cut, profiles point
  to the rules.
- Level validator: the alive ceiling also checks campaign maps; co-op kit size bands (pull-up, relay, rope, throw,
  shutter) from new scale-sheet rows; no softlock reads bolted doors one way; `drill_s` (training only) and the
  `unavoidable` tag. The scale sheet gets the current camera, silent speeds, an interim light rule and patrol timing.
- The level-validator job's STATE / BRIEF / PLAN / V1-check / V6-PLAN moved to `docs/archive/level-validator/`.

### Process docs polish (doc-clarity re-audit, slice P)
- Docs: one authority order list in CLAUDE.md (ROADMAP "Decided" right after Michael); RULES owns "assume and log"
  overnight, the train-ready rule (who labels, the stuck `affected-e2e` case), stale locks, the laptop queue order, CI's
  four jobs, cloud sessions running unit tests only, the weekly branch clean-up and a walk cap that limits switch-on
  only; the subagent preamble reads VISION plus RULES "A job" and "Test tiers" and gains a "Cloud sessions" section;
  swaps, deploy, auto-train (self-update), watchdog and testing-tools (task guard allowlist) match the code; the
  map-spec, walk-card, brief and plan-check templates follow the current rules.

### Systems docs re-audit polish
- Docs: the systems docs and TESTING.md follow the current decisions: the held pistol jammer (G152), complementary
  kits fixed per mission (G134, G153), real-world draw times (G243), CT's team moves (G180), ping on R3 / middle
  mouse and goggles on D-pad left, dogs (G348), Marlow Yard downed and strict rules (G349, G357), civilian kills
  restart the section (G353), helmets, the objective popup and no maps point to their bible owners, character
  shadows for the meter and guards (G352, not built yet); links point at docs/archive/ for moved job folders.

### Finished job docs archived
- Docs: 93 finished job folders moved from `docs/` to `docs/archive/<name>/` (names kept, nothing deleted), so
  `docs/` holds only the core docs and the live jobs (39 entries, was 132). Links and backticked paths in live docs now point at
  the archive paths.
- Dev shot scripts and the camera-reach table writer default their output to the archived folders.

## 4.101.2 - Train 87: Co-op lamp shots: no stale round after a restart (2026-10-25, PR #409; #384)
- In co-op (Marlow Yard and Sector Ops), a client's round at a lamp fired just before a set or section restart no
  longer shoots that lamp out in the fresh run. No wire change.

## 4.101.1 - Train 86: Laptop queue: dead-pid slot locks, watchdog allowlist, affected-e2e never stuck; Guard AI: one-mover fix; Saltmarsh Park section bake: stuck workers replaced (2026-10-25, PR #406; #403, #387, #385)

### Guard AI: one-mover fix
- Guard AI: a guard still walking to his reporter or overwatch cover is no longer made the flank while the point is
  on his own bound, so only one of point and flank is ever on the move at a time (the one-mover rule; e2e-stealth-ai
  'squad roles' was red on 4.100.2). Undo: `ONE_MOVER.roles` false in `src/ai/squadRoles.ts`.

### Saltmarsh Park section bake: stuck workers replaced
- A light-bake worker that stops answering is now shut down and replaced when its lamp gives up on it, so the rest of
  the bake keeps every worker instead of running one short. A silently dead worker holds the load about 90 s at worst
  (the earlier note said about 85 s; the 5 s check counts on both tries).

### Laptop queue: dead-pid slot locks, watchdog allowlist, affected-e2e never stuck
- Slot locks: `scripts/heavy-lock.mjs` `parseLock` reads the laptop queue service's own line
  (`laptop-queue | <label> <sha> pid <n> | <iso>`, no host: this machine) as well as the heavy-lock line, so a slot lock
  left by a killed service is broken at the desktop gate (and by `heavy-lock.mjs take` / `check`) once its pid is dead.
  A lock with no pid is still never broken automatically (2026-10-25: pid 4484 held heavy.lock / heavy2.lock 10+ min).
- Task guard: "NightShift watchdog" is on the allowlist (`TASK_ALLOW` in `scripts/laptop-queue/lib.mjs`); its .vbs in
  `C:\NightShift\scratch` no longer gets it disabled.
- affected-e2e: a duplicate affected request hands affected-e2e over to the surviving affected request (pending "handed
  over to <id>") or posts success when it repeats a recent pass, and is never retired against another requester's run;
  a supersede on the same sha hands over instead of posting error; an affected request or laptop rerun withdrawn before
  it ran posts error "withdrawn by the requester (not run)"; a head whose affected-e2e is pending with no open, claimed
  or running affected request is requested again.

## 4.101.0 - Train 85: Design bible rewritten to today's game; decisions fold G324-G343; Rules in one place; Guard AI polish batch 2; Co-op e2e boot wait (2026-10-25, PR #405; #396, #394, #377, #373)

### Design bible rewritten to today's game; decisions fold G324-G343
- docs/design-bible.md: rewritten in place to the current decisions (G1-G343): three modes and player counts
  (campaign and Marlow Yard 2, Sector Ops 1-4), refining allowed, up to 2 strict rules with section restart, no maps,
  minimap, compass or objective blip in any mode, objectives that fade in and out (View / Select or O), real-world
  light levels (L17), hardened choke points with a route around, Sector Ops as one current block (Saltmarsh Park
  S1-S5, signed-off counts, scaling, stars, helmets by difficulty), the same helmet rule in the campaign, Tallow Wharf
  as campaign Mission 1, Marlow Yard timed drills, G180's team moves, rope and medkits, Marlow Yard as the training
  course (Fallow parked), one owner for the revive rule (5.9 C6), the work order and open list; dated notes folded into
  the text.
- docs/DECISIONS.md: the 2026-10-25 roadmap decisions folded in as G324-G343; "Replaced by" notes on 46 superseded
  entries; the one-page vision replaced by a pointer to docs/VISION.md; G291 says Sector Ops is 1-4 players.

### Rules in one place
- Process rules move from `CLAUDE.md` into `docs/RULES.md`, read from origin/master at every session start; `CLAUDE.md`
  is now a short, stable stub (what Night Shift is, read RULES.md and VISION.md from master, the authority order, the
  code hard rules). The module map and doc index move to `docs/INDEX.md`.
- One owner per rule: one train-ready definition (CI `check` + `checker` + `affected-e2e`, labelled by the watchdog),
  desktop CPU gates as the queue really runs them, a 1-minute auto-train tick, swaps (a save, fresh sessions at a swap,
  resume after a same-account reset); testing-tools owns the flaky rule; session-method, agent-preamble and auto-train
  point to RULES.md instead of restating it.
- The laptop queue's first build plan is archived (`docs/archive/laptop-queue-PLAN-2026-10-23.md`).

### Co-op e2e boot wait
- e2e: `launch` / `openPage` (`scripts/e2e-lib.mjs`) no longer wait 120 s for the match on the page that hosts a
  `?net=local&autostart=...&mode=course|sector` room: that match starts only when the second page joins, so the wait
  ends once the page hosts alone in the lobby. Saves about 2 minutes per boot in e2e-ctcourse (each of its 4 parts),
  e2e-course (the walk URL) and e2e-bunker.

### Guard AI polish batch 2
- Guard AI polish: a guard sent to a noise behind a locked door he cannot get through now walks to the nearest point
  he can reach and looks from there, instead of standing where he was (A184).
- Guard AI polish: several guards searching who hear the same step now give one "I heard something." between them,
  not one each in the same moment (A185).
- Guard AI polish: a guard covering from behind a high wall while a mate moves up holds his peek spot, so his
  covering fire starts from where he can see (A186).
- Guard AI polish: guards searching the same spot no longer all walk to your last known position and look there; the
  first does, once, and the rest take their search points at once; if he is taken down before he gets there, a mate
  goes instead (A188).
- Guard AI polish (co-op): a guard who goes alert on a call about one player while he sees the other calls that
  player in once (A187). A calm guard who sees one player far off and the other clearly lit right in front of him
  notices the near one at once (A190).
- Guard AI polish: a flank walk may bend further round your cover before it is dropped (A189). A responder who goes
  back to searching a device room no longer says "Clear." first (A191).
- Guard AI polish (code health): armour cover checks go to the best cover spots first (A192); a guard in cover with
  nothing to go on stays in cover (A194); new test for the recon drone's sight.

## 4.100.9 - Train 84: Docs: system docs match the current rules (2026-10-25, PR #401; #395)
- Docs (doc-clarity, systems slice): the system docs, TESTING.md, the backlog and the research digests now state the
  current rules. Player counts per mode (campaign and Marlow Yard 2, Sector Ops 1-4); Sector Ops is the five-section
  Saltmarsh Park campus; section restart and up to 2 strict rules; no maps, minimap, compass or blip; stars fill every
  tier below a clear; guard caps, per-mode archetypes, helmets by difficulty, lookouts and paired patrols; real-world
  light bands and hardened choke points; the objective fade with View / O (decided). The CT movement rules G210 / G227 replaced are marked replaced. The research
  digests, docs/ct-prototype/ and docs/progress.md carry history banners; docs/story.md gets a status note.

## 4.100.8 - Train 83: One-page game vision (2026-10-25, PR #399; #393)
- docs/VISION.md: a one-page vision every session reads first: the pitch, the three modes (campaign, Marlow Yard,
  Sector Ops) side by side, Michael's overrides of pure CT, ten hard design rules, build gates, what is never in the
  game, each line citing its G entry or ROADMAP Decided time.

## 4.100.7 - Train 82: Decisions fold G283-G323 (2026-10-25, PR #397; #386)
- docs/DECISIONS.md: roadmap decisions of 2026-10-24 ~15:10 to ~23:46 folded in as G283-G294 (idle-lead rule, level
  validator and standard extras, train speed-ups, test jobs, process audit, mission rules and prototypes, Marlow Yard
  and campaign co-op traversal, guard off-screen animation tier).
- docs/DECISIONS.md: the archived roadmap decisions of 2026-10-23 ~01:08 to ~21:08 not yet recorded folded in as
  G295-G323 (Sector Ops redesign, Guard AI, models and pacing, stealth over shooting, Sector Ops 4 players, guard
  models, lighting, release and pipeline speed-ups, moving lights).
- docs/design-bible.md: dated notes for most of G283-G323; the voxel retirement lines in 5.14 and 5.16 now cite G282.

## 4.100.6 - Train 81: Sector Ops polish 3 (2026-10-25, PR #392; #379)
- Light bake: when the moon bake fails while a section bake still waits on its cache read, no section baker starts
  afterwards (it used to start one that nobody stopped).
- Vol lights: `writeVolLights` writes slot `i` and returns `n` (one counter, not two); the wiring guard test reads its
  sources relative to the test file and names what to do when its regex stops matching.

## 4.100.5 - Train 80: pr-size loads its script from the base branch (2026-10-25, PR #391; #378)
- CI: the `pr-size` job runs `scripts/pr-size.mjs` (and `glob-match.mjs`) as taken from the base branch, so PR
  branches cut before 4.100.0, which lack the script, no longer fail `check` with "Cannot find module".

## 4.100.4 - Train 79: Laptop queue: dead-pid heavy.lock broken at the desktop gate, "CI running" in the auto-train status (2026-10-25, PR #390; #374)
### Changed
- Laptop queue: the desktop slot gate logs the slot lock's holder once per change ("4191 held by heavy.lock: <text>") and breaks a lock whose pid is dead on this host when its text is unchanged on a second read (logged; a lock with no pid or a live pid is respected). A train's slot-lock wait breaks such a lock too.
- Auto train: the status and log say "CI running" (was "CI missing" or "CI pending") while a CI run for the head has no conclusion yet; "CI missing" only when the head has no CI run or check at all.
- Requests fill `branch` and `pr` by default (the asked ref; nothing for a sha already on master; the requester's checkout when the sha is its head; else the one remote work branch at or containing it, and its open PR), so failure comments reach the right PR and queue audits can see each request's branch.

## 4.100.3 - Train 78: Guard bake: stop on a lost console (2026-10-25, PR #383; #380)
- Tools: the offline guard bake (`scripts/operators/guard-bake.mjs`) stops a stage at the first job whose launch dies
  with a lost console (exit 0xC0000142, or a failure under 2 s with no output), waits for running jobs, prints
  "ABORT: console lost, restart the bake detached" and exits 5 without pushing, instead of failing every remaining job.

## 4.100.2 - Train 76: Co-op Course mode: client lamp shots (walk bug S2); Laptop queue: visual-gate after green trains (2026-10-25, PR #381; #371, #367)

### Co-op Course mode: client lamp shots (walk bug S2)
- Marlow Yard co-op: the client's round through a lamp now shoots it out on the host with the same checks as Sector
  Ops (draw, weapon, rate, origin, the lamp first on the ray, a clear line), and both pages see it dark (the client
  from the host's next `course` message, with the host's sparks cue, not on a join or rejoin); a course restart brings
  it back. No wire change.
- Co-op lamp shots (Sector Ops and Course mode): a client's repeat round at a lamp the host already has out is
  dropped quietly instead of counting as a violation.

### Laptop queue: visual-gate after green trains
- Laptop queue: after a green train whose head has `scripts/e2e-visual.mjs`, the service frees the second slot and
  runs the picture gate on the first, posting a `visual-gate` status (clean / flags / error) that never holds a release.
- A flagged run comments on the train PR with the gate's table, thumbnail links and the accept command; the desktop
  lane posts "skipped", and `LQ_VISUAL=0` turns the step off (`docs/laptop-queue/visual-gate.md`).

## 4.100.1 - Train 75: lightField allocation test deterministic in CI; Saltmarsh Park section bake: live lamps first (2026-10-25, PR #376; #369, #361)

### Saltmarsh Park section bake: live lamps first
- A lamp of the section you are in whose bake failed twice now bakes at once during play instead of waiting for every
  other lamp, so that spot is no longer dark for the rest of the background bake. Lamps elsewhere still wait for the
  workers to go idle, or bake as soon as their section goes live. A stuck second try now gives up after 20 s, so a
  silently dead worker holds the load about 85 s at worst instead of about 125 s.

### lightField allocation test deterministic in CI
#### Changed
- `tests/lightField.test.ts` "allocation-free under a loop": bodyLevel is judged against the run's own levelAt
  (2 x levelAt + 56 B) instead of an absolute 144 B. About 1 CI run in 15 (Node 22) reads exactly 173.2 B for the
  whole process (normal 126.8), so the old limit failed train/71 and PR #361 on code that never touched it. A vector,
  object or closure per query is still caught (an injected object in totalInto read 296.9 B against 169.6).

## 4.100.0 - Train 74: Laptop queue: release hold, desktop failures rechecked on the laptop, faster release poll; Co-op interrogation read under host load; Guard AI polish batch; Intake gates and the PR size cap (2026-10-25, PR #370; #366, #365, #363, #351)

### Guard AI polish batch
- Guard AI polish: a guard picks cover by the walk, not the straight line (A167). Up to 3 candidates are tried; a
  cover a mate holds is skipped and one behind a long detour (over 1.5 x the straight line + 3 m) is passed over, so
  he no longer walks the long way round to cover he cannot fight from, or freezes on a mate's cover. A failed open-wait
  pick retries every 3 s.
- Guard AI polish: a device responder who hears a noise goes back to searching the device room after the look,
  instead of standing still.
- Guard AI polish: a circuit cut twice inside 60 s, or one whose reset walk never finished (the walker knocked out, the
  alarm, the 30 s give-up), is found and relit again after 20 s instead of staying dark for good (A168).
- Guard AI polish: a guard in cover with the player out of sight judges his cover against where he last knew the
  player was, not the player's real position, so he no longer pops up into an upright strafe and re-picks cover.
- Guard AI polish (co-op): a guard with no intruder of his own heads for what he himself sensed, not for the partner
  nobody told him about (A165). A guard hunting one player who sees the other calls him in once, so that fight gets a
  reporter (A166).
- Guard AI polish: the search plan hands out new points on each rebuild and never re-looks the last known position
  as its second point; heard spots no longer skip a search point; search points snap to the right floor; a clamped
  plan point is not counted as searched.
- Guard AI polish: one-mover rule counts only a trip to the role's own cover (fixes a squad e2e flake); a fighter who
  hears the other player keeps hearing his own target; two intruder groups are never sent to the same free cover; a
  blinded calm guard no longer turns to or reports noises.
- Guard AI polish: overwatch suppress rechecks its line each episode and counts crates as blocking, so no rounds go
  into a wall or a crate; a stale advance after an open-wait pick no longer churns cover / chase.
- Guard AI polish (co-op): first shots at a newly picked target use a fresh aim settle; a dog in a fight follows a
  partner he can smell.
- Guard AI polish: a calm guard with two players in view keeps looking at the one he picked until the other is seen
  clearly better (25%, A169), instead of switching every think.
- Guard AI polish: a still-locked door forced open opens its doorway on the guards' nav grid at once, not one update
  late.
- Guard AI polish: an alerted reinforcement with no valid intruder binds on the next call or sighting, not to an alarm
  slot with no position (A182).
- Guard AI polish (code health): fewer allocations and cheaper checks in `pickCover`, `consoleStep`, `boardStep` and
  the per-step manager loops; new tests for the locked-door open, the calm target hold and the sight-ray miss.

### Intake gates and the PR size cap
- Intake gates (process audit 2026-10-24): BRIEF splits "Michael said" from "Michael picked", PLAN carries a claims
  block, a fresh Opus plan checker runs before build, maps and looks get a one-page sign-off, and slices stay at
  ~1.5k lines or ~4 h with unfinished work dark behind a flag (`docs/systems/session-method.md` "Intake").
- Templates: `docs/templates/brief.md`, `plan.md`, `plan-check.md`, `signoff.md`, `walk-card.md` (walk pacing: at most 3
  unwalked features per area, a 10-minute risk-ranked walk card per release).
- CI: a `pr-size` job inside `check` fails a PR over 1500 counted changed lines (generated assets, snapshots,
  lockfiles and docs not counted) unless it has the `big-pr` label; train and docs-only PRs are exempt
  (`scripts/pr-size.mjs`).
- `scripts/claims-check.mjs` reports overlapping file globs, maps, wire and save claims between open job PLANs.

### Co-op interrogation read under host load
- Fix: co-op: a client's interrogation read is no longer lost when the host frame rate dips. The host counted the end
  only when one of its frames caught the read's last 0.3 s; it now counts any seen read whose bit drops while the hold
  goes on, and forgets it when the hold ends (the e2e-coop joint interrogation flake at x0.3 host speed).
- Tests: `interrogationEnded` cases for a read whose tail fell between host frames (ph 0.4 straight to the bit dropped).

### Laptop queue: release hold, desktop failures rechecked on the laptop, faster release poll
#### Changed
- Laptop queue: for up to 10 min after an open train's laptop-e2e success (while train-ready PRs not in it have a green or running check) no new request is claimed, aged alone requests included, so the next train is not preempting a fresh alone run; train reruns still start (`LQ_RELEASE_HOLD_MIN`).
- Laptop queue: a desktop PR run whose suites fail posts pending "desktop FAIL <suites> (cpu N%), laptop rerun queued" (plus "; desktop cpu>90%" when its median CPU was over 90) and queues a laptop-only rerun of the failed suites; the laptop's verdict is final.
- Auto train: the fast poll runs every 30 s (was 60) once the train's laptop-e2e pending status is older than its expected wall (the laptop's "expect ~N s", else 10 min), so a release follows the laptop verdict within a minute.
- Laptop queue: the desktop CPU gates leave out processes at BelowNormal or Idle priority (a background Blender bake no longer holds the desktop slots); the wait reason shows the gated and the total load.
- Laptop queue: a superseded laptop rerun closes the desktop's "desktop FAIL ..., laptop rerun queued" pending status.
- Merge train: `git fetch` takes only the branches each step reads and retries up to 5 times when another worktree's fetch holds a ref lock (also auto-train's self-update).
- Laptop queue: each requester's oldest open request runs first (was newest), unless one of its requests has a higher `--priority N` (request.mjs); the order between requesters is unchanged.

## 4.99.1 - Train 73: Watchdog: deterministic pipeline alerts (2026-10-25, PR #368; #350)
- Pipeline: `scripts/watchdog.mjs tick` (every 2 min via `scripts/watchdog-task.ps1` from the self-updating checkout
  `C:/NightShift/Mobile-Coop-watchdog-live`) writes `C:/NightShift/scratch/watch-status.json`: dead or stale heavy
  locks, orphaned e2e runners, CONFLICTING / re-committed / red `train-ready` PRs, PRs ready for the label, release-tail
  gaps (dev behind, missing tag, merged members still open: alert only), a stale `/preview/`, auto-train health,
  laptop-queue claims and requests, stuck cloud-queue claims. Fixes are opt-in per check (`--fix locks,labels,...`).
- Label convention: `train-ready` only on CI `check` green + a `checker` commit status success + `affected-e2e`
  success (required unless opted out: `no-affected-e2e` label or `WATCHDOG_REQUIRE_AFFECTED=0`). See `docs/systems/watchdog.md`.

## 4.99.0 - Train 72: Auto affected-e2e and flake budget; Swap tools; Rulebook: current rules only (process audit 2026-10-24) (2026-10-24, PR #364; #356, #349, #347)

### Rulebook: current rules only (process audit 2026-10-24)
- CLAUDE.md "Sessions" rewritten as one current rulebook (~150 lines): no dated layers, every contradiction resolved
  to Michael's newest decision. New rules: no-refining rule lifted, walk cap 3 per area plus a walk card per release,
  one-click visual sign-off before map greybox / art / big look changes, a plan checker before building, PRs under
  ~1.5k lines or ~4 h with unfinished work dark behind an owned flag, agents commit each sub-step, checkers post a
  `checker` commit status, leads never merge master, rules read from origin/master only.
- `docs/systems/agent-preamble.md` matches it. The old text is kept verbatim in
  `docs/process-audit/rules-history-2026-10-24.md`.

### Auto affected-e2e and flake budget
#### Changed
- Laptop queue: every open PR head gets an automatic affected-e2e run (the suites its change drives) and an `affected-e2e` commit status; a newer head supersedes the older request.
- Flake budget and quarantine replace "flake stands": a suite may flake 2 times in 7 days, the next flake quarantines it for 48 h with an owner; quarantined suites always run and print KNOWN FLAKY. `scripts/e2e-quarantine.json` holds the committed list (e2e-pad) and the suite owners; PR comments carry a flake-rate table when a run flaked.

### Swap tools
- Swap gate `scripts/swap.mjs`: `save` / `status` scan every worktree on the machine (uncommitted, unpushed, detached
  local-only commits; merged and stale-debris worktrees skipped), the heavy locks with pid liveness, the laptop queue and
  the auto-train status, and end with `SAFE` or `NOT SAFE: <n> items` (`C:/NightShift/scratch/swap-status.json`);
  `save --commit-wip` commits dirty job worktrees as WIP and pushes their branches (never protected branches, never force).
- `swap.mjs prune --dry-run|--yes` removes clean worktrees of branches merged into origin/master (branches kept).
- `scripts/cloud-queue-expire.mjs` reopens cloud briefs whose claim missed its 30-min heartbeat for 90 min with no push
  to the brief's branch; the cloud-queue README text for the heartbeat is in `docs/cloud-queue-README.patch.md`.
- The swap procedure as commands, with targets (cap to every session up under 10 min): `docs/systems/swaps.md`.

## 4.98.3 - Train 70: Release path hardening (2026-10-24, PR #359; #353)
- merge-train: the release title, minor / patch kind and CHANGELOG heading come from the members actually merged
  into `train/<n>` (a left-out member no longer names the release; the version follows the merged fragments).
- merge-train build: the version commit is built and the CHANGELOG assembled on git objects first (fragment format,
  empty train, nothing new, docs-only train); only a valid train is pushed, once, and its PR opened after the push.
- merge-train release / repair: the tail (tag, dev, member PRs, deploy) is idempotent; `release` of a merged train and
  the new `merge-train repair` (latest released version) redo only what is missing.
- Pages: one deploy per release, dispatched after dev moves with the tested head; lint and vitest are skipped when the
  live tree is that head's tree; each slot gets `version.json` and merge-train waits up to ~20 min, then prints
  whether `/preview/` serves the release (`PREVIEW: OK | STALE | UNKNOWN`).
- merge-train: `build 063` is train 63; a non-stacked build reusing a train PR drops a stale base marker.

## 4.98.2 - Train 69: Saltmarsh Park fog fix wiring test (2026-10-24, PR #358; #357)
- Tests: a test now guards the wiring of the Saltmarsh Park fog fix (the map's lamp-beam setting reaching the
  volumetric light pass), so dropping it fails CI. No player-visible change.

## 4.98.1 - Train 68: Saltmarsh Park section bake hardening (2026-10-24, PR #355; #354)
- Saltmarsh Park's per-section lamp bake is sturdier: a lamp whose bake fails is retried once on the worker pool, then
  on the main thread only while no worker job runs (one lamp per task, so frames keep running), and a job stuck past
  60 s counts as failed instead of hanging the load. A failed lamp is never cached, so the next load bakes it again. A
  failed map load no longer leaks bake workers, finished batches no longer re-upload the whole light atlas, and lamps
  of the live section jump to the front of the queue. Picture, light meter and guards read the same light as before.

## 4.98.0 - Train 67: Level validator: connectivity graph, validator, metrics JSON, scale-sheet room table, level standard; Auto-train drops the failing member and rebuilds at once (2026-10-24, PR #352; #346, #343)

### Auto-train drops the failing member and rebuilds at once
- Pipeline: a train whose laptop e2e fails (or whose laptop rerun after a desktop failure fails) no longer waits for
  the orchestrator. Auto-train maps each member's changed files to suites with the `--affected` folder map
  (`DIRECT_COVERS` in `scripts/e2e-affected.mjs`), drops every member that touches a failing suite (else the one with
  the most `src/` files under that suite's `--quick` folders, else the newest-labelled; never `feature/menu`), removes
  its `train-ready` label with a comment naming the train, suite and assert, closes the train PR and builds the next
  train in the same tick. Status `dropped: [{ pr, branch, suite }]` and `lastDrop`, log "DROPPED" lines;
  `--no-autodrop` restores the wait. No drop (left for the orchestrator) over 3 failing suites, when every code member
  matches, on a suite the last auto-dropped train also failed, or on a desktop / rerun failure without a usable FAIL
  list. CI / build-time vitest failures, the desktop-fail laptop rerun and the exit-3 rebuild guard are unchanged.

### Level validator: connectivity graph, validator, metrics JSON, scale-sheet room table, level standard
- Tooling: every map now has a connectivity graph (JSON, one object or one file per section) written before any
  geometry; the schema, every rule each field feeds and an example graph are in `docs/level-validator/graph-schema.md`
  and `docs/level-validator/example.graph.json`, and `docs/templates/map-spec.md` requires a passing validator run
  before Phase 3.
- Tooling: `node scripts/level-validate.mjs <graph.json> [more.json ...] [--metrics <path>]` validates a graph against
  our metrics: reachability and no softlock for two players, the linear spine between sections, 3+ approaches of 2+
  kinds per encounter space (links that can enter it), dead ends (counted by ways out), room-class sizes, opening
  minimums, the 0.5 m grid, ceilings, 2+ independent routes per section, co-op coverage, co-op moves one player can
  make anyway (a solo twin: ERROR on a campaign map, WARN on Sector Ops), split parity and beat pacing. Exit 0 / 1 (any ERROR) / 2 (bad usage). Tests:
  `tests/levelValidate.test.ts`.
- Tooling: `docs/design/metrics.json`, generated from `docs/design/scale-sheet.md` by `scripts/metrics-gen.mjs`, is the
  one source of every size and time the validator uses (no constant in the script); `tests/metricsGen.test.ts` fails
  when the sheet changes without a regeneration.
- Design: `docs/design/scale-sheet.md` gains section 7, "Room sizes by type" (a room table scaled about 1.4x real and
  floored by the camera rule: 6 m short side for encounter spaces, 3.5 m for any walk-through room), and section 8,
  "Validator numbers" (speeds, split and reach times, shared width, shadow, vantage and line-of-sight targets).
- Design: `docs/level-design.md` section 11 is rewritten for two players (spine between sections, splits <= 90 s per
  leg within 20% by traversal time, partners act for each other, an overwatch spot per split, a downed partner
  reachable within 15 s, shared routes >= 2.0 m wide), and the numeric targets are added: a vantage sees about 70% of
  an encounter space, 40-60% of its floor in shadow, routes cross at least once, line of sight breakable within about
  5 s, guard counts 3-6 early / 6-10 late. The graph is a Phase 2 deliverable and the validator run its gate to
  greybox (Michael 2026-10-24, "Add 1-4 as extras").
- Tooling: the first validator run covers all five campus Sector Ops sections (S1-S5; Michael, about 20:12), with a
  patch or re-plan verdict per section in `docs/level-validator/campus-run/REPORT.md`.

## 4.97.1 - Train 66: Laptop queue: overlapping trains, alone preemption (2026-10-24, PR #348; #342)
- Test tooling (laptop queue, overlap plan slice 3): pending trains run lowest number first, and a lower train's rerun
  goes before a higher pending train; the desktop takes a second, different train while the laptop runs one; auto-train's
  build marker holds back only trains at or above the one being built; a running train whose head is no longer an open
  train PR head (closed, voided or rebuilt; two checks a minute apart) is killed, posts laptop-e2e error "train closed"
  and releases its claim. Inert while no stacked trains exist.
- A pending train now cuts an alone run whose steps started under 10 min ago; it is queued again at the head of the
  alone queue (train 64 went to the desktop behind a 4-min-old guard-cap run).
- Audit fixes (train 64 went to the desktop behind a 30-min alone run): the laptop pushes a heartbeat claim refresh
  every 5 min while it runs anything; a pr run past 80% of its expected wall is never preempted; no new alone claim
  while a green train-ready PR waits and no train PR is open (aged alone requests still start); an alone run yields
  between steps to a pending train and resumes after its finished steps. install-task.ps1 takes -DesktopCpu (80) and
  -DesktopBacklog (0) for the desktop worker, so a re-register keeps them.

## 4.97.0 - Train 65: Merge train: stacked builds and release guards (overlapping trains); Saltmarsh Park lights without fog; Faster Saltmarsh Park load (per-section lamp bake); E2E affected-suite selection (2026-10-24, PR #345; #344, #339, #333, #251)

### E2E affected-suite selection
- Test tooling: `node scripts/run-e2e.mjs --affected <base-ref> [--wide] [--list]` picks the e2e suites a PR must pass from its
  committed diff (merge-base to HEAD, so it works on a detached commit); `--list` prints them and exits. The default is the
  DIRECT tier (only the suites that drive the changed area: e.g. optic-cable 13 jobs, guard-ai-carry-fix 7); `--wide` adds the
  cross-area readers (30 and 15). `src/weapons` -> `e2e-stealth-ai` + `e2e-sectorops:1` in both (train 30). The section rating
  files pick `e2e-section-rating`, the Marlow Yard sets and `scripts/e2e-ctcourse/` pick `e2e-ctcourse`, and every LEGACY / GPU
  suite is reachable from the area that owns it. Docs-only changes pick no suites. The maps live in the pure module
  `scripts/e2e-affected.mjs`; `--quick` keeps master's map and rules unchanged (`QUICK_COVERS` and `SUITE_DIRS`, checked row by
  row against a frozen copy of master's map at train 62). `tests/e2eAffected.test.ts`; `docs/systems/testing-tools.md`
  "Choosing suites for a change".
- Laptop queue: `node scripts/laptop-queue/request.mjs --sha <ref> --affected [--wide]` picks the suites from the diff against origin/master (DIRECT tier; `--wide` the cross-area set) instead of a hand-picked `--suites` list; a diff that reaches no browser suite is refused.

### Merge train: stacked builds and release guards (overlapping trains)
- merge-train: `build <n> ... --on <sha>` builds a train on another unreleased train's version head (overlapping
  trains, slice 1): the sha must be an `origin/train/<m>` head with master and train m's version commit in it; members,
  the CHANGELOG heading and the member PRs closed at release are only train n's own; `PROTOCOL_VERSION` is bumped from
  the base head's value; the train PR body carries `<!-- auto-train:base train/<m> <sha> -->`.
- merge-train release: a head carrying another train's version commit that master lacks stops with exit 4 ("base train
  not merged"), for every release and lone-PR release. A stacked train is released only after its base merged exactly at
  the recorded sha, tagged, with `git merge-tree` showing GitHub's merge keeps the tested tree; its `gh pr merge` is
  retried up to ~2 min while GitHub settles, and a merge commit whose tree differs from the tested head exits 5.
  Inert until auto-train builds stacked trains.

### Faster Saltmarsh Park load (per-section lamp bake)
- Saltmarsh Park (Sector Ops) no longer waits for every lamp of all five sections on a cold first load: the lamp bake
  runs beside the rest of the load, the match starts once the live section's lamps are in, and the other sections bake
  in the background (one lamp per worker job, biggest first) and are in long before the players reach them. The picture,
  the light meter and the guards read the same light as before at every point of the live section; lamps landing
  elsewhere fade in over 1.5 s. The finished bake is cached as before, so later loads are unchanged. Other maps are
  unchanged.

### Saltmarsh Park lights without fog
- Saltmarsh Park (Sector Ops): the ceiling downlights, pendants and hall lights no longer fill the rooms with fog
  you cannot see through. On Medium and up, 76 of the campus's light fittings drew a long volumetric beam (up to 14 m,
  as wide as the light cone, 1.6x brighter), meant for torches and floods; they now scatter a short, faint haze under
  their shade, as the Sector Ops warehouse lights have since 4.61.0. Torches keep their beams. Rendering only: the
  light meter and the guards see exactly what they did. Marlow Yard and the other maps are unchanged.

## 4.96.0 - Train 64: Guard rendering phase 2 (24 guards) (2026-10-24, PR #341; #323)
- guard-render S9: the moon's cascades draw a moving caster only in the layers its shadow can land in on screen. On top of
  the light-space square test (S6), the caster's view depth +- (radius + moon shadow length x light . view) must overlap
  the layer's split range plus the blend band (`src/world/sunCascadeCull.ts`). The shadow length is 4 m over the moon's
  steepness, capped at 12 m. The split depths are read from the cascaded shadow generator's private fields through one
  accessor, pinned by a unit test. Render only: the light field, the meter and perception are unchanged; `?guardsun=0`
  still turns all of it off.
- guard-render S10: the Sector guard freeze no longer keeps every guard in a shadowing lamp's reach drawn when the
  lamp's sphere is in view. Per lamp it now tests the guard's own shadow volume (the cone his body throws away from the
  lamp, out to where the lamp's shadow map ends; none outside a spot's cone) against the view, and where it is in view,
  camera rays to where the shadow of his head and middle lands decide, as for the moon (`src/game/sectorGuardFreeze.ts`,
  `sectorGuardFreezeView.ts`). Render only; `?guardfreeze=0` still turns the freeze off.
- guard-render S9b: the moon's cascades no longer carry meshes they never draw. A disabled mesh (a guard figure's
  other LODs, the merged body the figure replaced, a frozen guard), an invisible one, or a low LOD registered under its
  full mesh (drawn through the full mesh's entry) stays out of the moon's caster list, and the list refills the frame
  after a caster is enabled or disabled (`src/world/sunCascadeCull.ts` `sunCasterDrawn`, `src/world/world.ts`). CPU
  only: Babylon already skipped these at draw time, so the shadows look the same.
- guard-render S10b: the Sector guard freeze now also counts the guard-torch and character shadow maps' slots as
  shadow lights (they light nothing themselves, so it skipped them): an off-screen guard whose shadow from a partner's
  flashlight or from a nearby lamp's character shadow would land on screen stays drawn, and a guard thawed for it is in
  that frame's shadow map (the maps keep frozen guards listed and re-render when one is thawed). A guard's own
  flashlight never counts for him. Render only; `?guardfreeze=0` still turns the freeze off.

## 4.95.3 - Train 63: Laptop queue: alone starvation, desktop CPU gates, faster restart (2026-10-24, PR #340; #335)
- Tooling: an alone measurement that has waited over 30 min (was 45) stops new PR claims on the laptop until it runs,
  also while a train holds alone runs back; the desktop overflow lanes start under 80 % CPU (was 60 / 50 %); the queue
  task triggers every minute (was 5), so a self-update restart takes about a minute.
- Tooling: the laptop starts no new request while a train builds or for 3 min after a train release with train-ready
  PRs waiting, and claims no request onto a slot held by a manual lock.

## 4.95.2 - Train 62: Pages deploys queue instead of cancelling; Player batch 24; Train fallback fragment and idle self-update (2026-10-24, PR #338; #337, #331, #330)

### Player batch 24
- e2e-tuner-phone flake fix (train 54, "pad focus down the Body tab"): the D-pad walk down the Body tab holds each
  press for exactly one input poll (e2e-lib `press`) and steps until the drawer has scrolled (40 at most), then checks
  the focused row shows below the tabs and the playback bar; ten presses held for rendered frames could lose presses
  (a skipped poll) or double them (the wall-clock repeat under load) and end with the drawer unscrolled.

### Train fallback fragment and idle self-update
- merge-train: a member PR whose branch adds no `changes/*.md` (a test-only PR) gets a synthesised `kind: patch`
  fragment in the train, noted in the train PR body, so the version commit no longer fails with "nothing to assemble".
- auto-train: an idle tick (no train open, nothing building) moves its checkout to `origin/master` when the working tree
  is clean, so the scheduled checkout never runs stale scripts.

### Pages deploys queue instead of cancelling
- CI: the site deploy no longer cancels itself when a release push and the dev preview trigger overlap; pull request runs still cancel their older run.

## 4.95.1 - Train 60: Allocation-free sight rays (2026-10-24, PR #334; #326)
- Performance: guard and recon drone sight rays no longer allocate in our code (`losClear` and the drone use `Ballistics.hitDistance`),
  so 24-32 guards thinking no longer feed the garbage collector every think; same sight verdicts.

## 4.95.0 - Train 59: Laptop queue: audit fixes; e2e-coop joint interrogation flake; lightField allocation check retry; Optic cable: the partner's view, hatches and grilles (engine); Co-op body carry on the client (2026-10-24, PR #332; #329, #328, #327, #314, #313)

### Co-op body carry on the client
- (coop-carry) Co-op: the joiner can pick up, carry, put down and hide a downed guard's body, host-approved, with the
  same 2 s lift, slow bent carry and 0.8 s put down as the host; both screens show a partner carrying (the host's own
  carry now shows on the joiner too). Bodies ride the item mirror as kind `body` (wire change: the train bumps the
  protocol). The carry code moved from `StealthSystems` to `game/bodyCarry.ts` unchanged.

### e2e-coop joint interrogation flake
- e2e-coop "joint interrogation: host bluffs, client reads": the client's hold starts as soon as the host stores its bluff
  and the client's bluff line is checked alongside, so Node polls under load no longer spend the bluff's 6 s host-time
  window before the read ends (a 28 fps host timed out on the joint count); a timeout now prints the host's bluff age.

### Laptop queue: audit fixes
- Tooling: the laptop queue service stops a request its requester withdrew (the run is killed, the slot freed), and a
  pending train preempts a running PR request (re-queued). `request.mjs --pin` keeps A/B and baseline runs from being
  superseded.
- Tooling: duplicate requests are marked done unrun; runs not yet in their suites yield to a pending train; train
  reruns (`--train-rerun`) run at train priority and turn `laptop-e2e` green on a pass; alone runs wait while an open
  train lacks a laptop verdict; the desktop takes no new claims while auto-train builds a train; a task guard disables
  stale scheduled tasks (`one-shot-task.ps1` is the only way to schedule an ad-hoc run).

### Optic cable: the partner's view, hatches and grilles (engine)
- (ct-toolkit 3.2, optic-coop) Co-op: a partner now sees the optic cable. While one player feeds it under a door their
  copy on the other screen kneels in front of the leaf with the right hand at the door's foot and a thin cable running
  out under the door, growing over the 1.2 s feed and shrinking over the 0.6 s pull out; the view stays local. The
  player's own body shows the same hand and cable. Wire: MoveState mode `optic` (`sub` the kind: door, hatch, panel,
  grille; `a` the door or gap; `ph` the cable fed out); an unknown kind or a door or gap the level lacks is dropped.
  A ping from the view already casts from the tip and reaches the team; no ping input is bound yet.
- (optic-coop) Engine side of the optic cable's other gaps (map field `optic`): floor hatches, ceiling panels (fed
  standing), vent grilles and shaft tops (`LevelBuilder.opticGap`, `OpticSystem.pickPoint`): the kneel spot, the tip
  0.3 m into the space (or the map's own tip point), the look 50 deg down or up through a floor or ceiling gap, and the
  refusals "Too far" and "No gap". No map places one yet.
- (optic-coop M1) At a hatch, ceiling panel, grille or shaft top the optic cable starts from the action menu, the same
  as doors: hold A (E) for OPEN TRAP (only where a panel covers the gap; it opens quietly) and OPTIC CABLE; "Too far"
  and "No gap" show as at a door. In co-op OPEN TRAP goes through the host like a door, so the panel opens for both
  players (and for a partner who joins or rejoins later); wire: client -> host `panel`, the snapshot's `trp`.
- (optic-coop M2) Ping is bound: middle mouse on keyboard and mouse, R3 on the pad, and it works from the optic view
  (the ping comes from the tip, from the view's first moment). R3 is shared with Zoom by context (Michael): while aiming
  a scoped weapon R3 zooms and does not ping; otherwise it pings and does not zoom. Middle mouse always pings. The
  controls screen shows no conflict for the default R3 pair (another verb put on R3 still shows one).
- (optic-coop) A level holds at most 256 optic gaps (the network's bound); more are refused with a warning.

### lightField allocation check retry
- Tests: the lightField allocation check re-measures a query over its limit once from a fresh warm-up (CI flake 173.2 > 144 on #322).

## 4.94.0 - Train 58: e2e-lightbake shader-compile wait; Guard models (2026-10-24, PR #325; #322, #318)

### e2e-lightbake shader-compile wait
- Tests: e2e-lightbake waits for every drawn shader to compile (120 s cap) before its 16-texture check and names stuck materials (train 55 timing flake).

### Guard models
- Guards can draw as varied, realistic figures from the operator pipeline (guard-models). It is behind `?guardmodels=1`
  for now (the default is off until the budget run flips it); `?guardmodels=0` is today's merged body. What you see:
  - Three builds: average (grunt, drone operator, officer), lean (runner, sniper) and broad (heavy, enforcer).
  - Faces: eight faces in four skin tones, six hair cuts in four hair colours, some with stubble or a beard; the heavy
    and the enforcer wear a balaclava.
  - Outfits and headwear per kind: field uniform, rolled sleeves on the sniper, work jacket on the runner, field
    jacket and peaked cap on the officer, caps, beanies, a boonie, a headset, glasses, belts, holsters and a radio.
  - Gear that matches gameplay: a helmet shows only while the guard's helmet would stop a round, a vest only with
    armour, the heavy and enforcer always show their plate, and the enforcer carries a riot shield.
  - Helmet knock-off: the first head hit takes the helmet off his head; it drops at his feet as the same helmet and his
    cap or hair shows again.
  - Every guard's look comes from a per-guard seed, so it is the same after a section restart and the same on both co-op
    screens; carried bodies keep their look.
- Guard figures are off by default; their files load only with `?guardmodels=1`, never precached. The baked files
  (three builds and the riot shield, LOD0-2, about 29 MB) are bundled, but the service worker never precaches them and
  nothing fetches them while the flag is off; with it on they load on demand and are kept in the worker's own `guards`
  cache for offline play. A build whose files are missing or broken falls back to a stand-in (the operator's figure
  at guard height).
- Co-op: the enemy `al` carries the look seed in bits 9-15 (`AL_LOOK`; `AL_MAX` is 65535); host and client derive the
  same look from it. The protocol version is bumped by the train build.
- Tests and docs: Vitest for the kit data, variation, piece mask, look seed on the wire, figure (NullEngine) and the
  bundled files against the budgets, the precache lists and the flag-off path (no guard file precached or fetched,
  `guardAssetsOffline`); `e2e-coop` checks the seed and visible
  pieces on host and client, the seed after a bay restart and the helmet bit drop (`E2E_GUARDMODELS=1` for the pieces);
  guards section in `world-and-characters.md`, the budget line in `performance.md`, the look bits in `coop.md`, MPFB2
  credited for the guards' bodies and faces, a desktop checklist item in `TESTING.md`.

## 4.93.0 - Train 56: Guards against up to 4 intruders (coop4 AI) (2026-10-24, PR #321; #319)
- Guard AI coop4 AI1: intruder slots are reused. A player who leaves keeps his slot for his rejoin (same slot, last
  known position kept); with 3+ players a new player takes a gone player's slot when none is free (its search plan,
  caller and hunters are released). New host hook `intruderLeft(id)` and per-player ghost read `ghostOf(id, out)`.
  1-2 players unchanged.
- Guards watching 3-4 players cast at most 9 sight rays a think (A181): the one they perceive and the one they hunt
  first, the rest nearest first in rotation, so nobody is left unseen for long; 1-2 players unchanged.
- The section radio's receiver queue holds 128 (4 simultaneous contacts x 32 guards), so no receiver is dropped in a
  4-player fight; hearing locates each of up to 4 intruders by its own noise.
- With 3-4 players the alarm's reinforcements split over the known intruders: the alarm raiser's intruder first, then
  each other by freshest sighting, round robin; 1-2 players unchanged.
- With 3-4 players a stage's response grows by one guard per player past 2 (two teams from 4 guards, a shield lead
  each, never past the live cap); each team hunts and sweeps round its own intruder's last known position and keeps off
  the points another team holds; fights take cover in turn, and the flank trigger and `spotted` follow each player's
  own fight; 1-2 players unchanged.

## 4.92.0 - Train 55: Gameplay reads game state, not the animated body (rig-pose fix) (2026-10-24, PR #320; #308)
- Where you can be hit and seen now comes from your position and stance in the game, not from the animated body:
  guards aim at and hit the same spots on every machine, whatever the frame rate, the mocap setting or the tuner.
- Co-op: your partner is judged exactly like you on the host, with split head / body / leg hits (head x1.3, legs
  x0.75), at their latest position instead of a copy drawn 0.1 s behind. Friendly fire on Marlow Yard uses the same body.
- Your rounds start from your shoulder and aim in the game, not the animated muzzle (the muzzle still shows the tracer,
  flash and casing). The wall-poke check uses the same head as your hit box.
- A guard's head is the same on the host and the client, and the host judges a partner's headshot against it.
  Dog heads too.
- On a wall, the light meter and the guards read the same head point on both machines (light parity).
- Bodies lie where the guard fell in the game, on the floor below a ledge; the ragdoll eases onto that spot. Picking a
  body up steps in to the same place on both machines.
- Smaller: the weapon swap waits on a game timer, the course dummy's head follows its position, movement speed no
  longer depends on the mocap setting, rounds pass through ragdolls, and a lamp shot while hanging upside down counts
  in co-op.

## 4.91.0 - Train 53: Joint interrogation: check fixes; Gameplay reads game state, not the animated body (rig-pose fix) (2026-10-24, PR #315; #311)
- Co-op joint interrogation: a repeated BLUFF press on the same guard no longer repeats the "Bluff on" line, a bluff is spent and counted only when the guard has joint lines to give, and a player who leaves takes their bluff with them.

## 4.90.0 - Train 52: Joint interrogation (G148); Gameplay reads game state, not the animated body (rig-pose fix) (2026-10-24, PR #312; #310)
- Co-op joint interrogation (G148, CT: both players question one captive; some intel comes only this way). Beside a
  guard your partner holds, hold A: a guard with joint information lists BLUFF above TEAM TAKEDOWN. The host accepts the
  bluff and both see "Bluff on. Read his face now."; when the holder's INTERROGATE ends within 6 s of the bluff, with the
  bluffer alive and within 3 m, the guard also gives his joint-only lines to both players (radio subtitle and feed) and
  sets his joint flag. A solo read gives only his usual lines and spends the joint part too. Speech only: no strike, no
  threat, no pose. Single player is unchanged.
- Marlow Yard A8: the duty officer has two joint lines (the request-to-exit button in the lobby; night two's grille stop,
  5 s every 40 s) and the flag `a8-joint`; the radio teaches it as A reaches the gallery ("Two of you, he might say more.").
- Wire-semantics change: a client's bluff is a `td` message with kind `bluff` (the field existed; protocol.ts is not
  edited), and an older host would take it as a takedown and seize the guard. The branch touches `src/net`, so the train
  bumps `PROTOCOL_VERSION` once.

## 4.89.0 - Train 51: sector-redesign: LR16-4 reception board, LR16-6 vision polish, LR16 polish batch 2; Auto-train audit fixes (2026-10-24, PR #309; #307)

### The S2 reception panel is a breaker board (LR16-4)
- Campus S2 (HQ atrium): the reception panel is now a real untimed breaker board on the atrium circuit (the three
  pendants and the reception downlight). Cut it and the officer in reception sees his room go dark, walks to the board
  and switches the lights back on; take him down at the board first and the atrium stays dark. A shot pendant stays dark.
  The yard and garden isolators keep their timed windows. No wire or save change.

### Thermal through shut doors (LR16-6)
- Thermal shows anyone warm behind a shut door as a dim blue figure in their own pose, drawn on the door: guards, your
  partner and a fresh body (its first half minute). Never through a wall, glass or an open door (the body itself
  shows then), and only within about 14 m. Your own body in front of the door still covers it. Picture only: guards
  and the light meter are unchanged; in co-op each player sees their own.
- Every goggle change is an instant cut; switching modes on the wheel with the goggles on now flashes the HUD label too.
- Co-op: bodies now cool in thermal on the joining player's screen as they do on the host's, and a guard walking behind a
  shut door in Sector Ops moves as a figure instead of sliding in his last pose.

## 4.88.3 - Train 50: Auto-train audit fixes (2026-10-24, PR #306; #304)
- Auto-train queues one laptop rerun of the failed suites when the desktop worker fails a train
  (`laptop-e2e` "desktop: ...; FAIL: a,b"): `request.mjs --train-rerun`, set `train<n>-rerun`, state `laptop-rerun`,
  one request per train head (recorded in the status JSON); a pass of the rerun (`laptop-e2e/train<n>-rerun` success
  with CI green) releases through the normal release path, also on master's request.mjs; no verdict 60 min after the
  request (`AUTO_TRAIN_RERUN_STALE_MIN`) is state `rerun-stale`, and 6 failed requests per head `rerun-request-failed`
  (audit 2026-10-24, checker FIX).
- Auto-train writes the build marker `C:/NightShift/scratch/auto-train-building.json` (`{ train, version, pid, at }`)
  just before `merge-train build` and deletes it when the build ends, errors included (audit 2026-10-24).
- A train member left out on a conflict loses its `train-ready` label (no more repeat empty builds); the comment tells
  the lead to re-add the label after fixing the conflict (audit 2026-10-24).
- Auto-train holds a build up to 3 min (`AUTO_TRAIN_CHECK_WAIT_MIN`, per head, state `holding`) while a `train-ready`
  PR's `check` is still running, and re-reads the candidates right before `merge-train build` (audit 2: PR #299 missed
  train 47 by 43 s).
- `merge-train build` pushes the train head before it runs vitest, so CI and the laptop start ~6 min sooner; a vitest
  failure still exits 2 and blocks the release through `auto-train/vitest` (audit 2).
- A waiting auto-train tick (`pending`, `laptop-rerun`, `holding`) re-checks every 60 s for up to 4 min
  (`AUTO_TRAIN_FAST_POLL_S`, `AUTO_TRAIN_FAST_POLL_MAX_MIN`; `--once` turns it off), so a green train releases within
  about a minute instead of at the next 5-min run (audit 2).

## 4.88.2 - Train 49: Guard body compile cap 90 s; Response team sweep never stalls (2026-10-24, PR #305; #303, #302)

### Guards route round locked doors
- Guards no longer stall at a locked door on their way (Marlow Yard A7's cage door): a locked, shut door is a wall to
  their pathing and they go round it; unlocked, the way through opens again (guard-ai S28).

### Response team sweep never stalls
- A response team sweeping a Sector Ops section no longer stalls behind a jam: a leader held short of a sweep point
  plans again, then moves on to the next point, and a guard pressed into a wall's edge walks free (guard-ai sweep fix).

### Guard body compile cap 90 s
- Guard bodies: the last-resort cap for a body shader still compiling is now 90 s (was 45 s), so the bigger lighting shaders are never restarted while still compiling with several browsers at once.

## 4.88.1 - Train 48: e2e-ctcourse A2 crossing settle (2026-10-24, PR #301; #299)
- Tests: e2e-ctcourse:1 A2 waits up to 6 s for the neck crossing to read dark and equal on both pages after the cut, and names the host's baked / dynamic level and lit torches on a miss (a host-only torch is named as the known co-op torch parity gap) (train 45 / 46 flake: host 1.000, client 0.141).

## 4.88.0 - Train 47: Guard AI: plain walls are not armour (sniper fires again); Marlow Yard re-lit under the LR16 light model (2026-10-24, PR #300; #298, #291)

### Guard AI: plain walls are not armour (sniper fires again)
- Guard AI fix: guards read every plain level wall as armour, so a guard whose fire line touched his own cover held fire
  and lost his wind-up; the sniper never got his two shots in and never relocated (e2e-enemies "sniper relocates after
  its shots"). Havok reads a container's filter back as all bits and reports no leaf shape for its hit, so armour is now
  a mark on the body (`markArmoured` / `isArmouredBody` in `src/physics/groups.ts`), set where the armoured pane groups
  (`LevelBuilder.buildGlass`) and armoured door leaves (`Doors.addBody`) are built. The S16 fire gate and E10's round
  armour (`Ballistics.ray().armoured`) both read it, so player rounds again penetrate thin plain walls as E10 intended,
  and armoured panes and leaves still stop every round.
- Test: `tests/armourFireStatic.test.ts` (real Havok: a level wall is not armour, an armoured pane / leaf is);
  e2e-enemies prints the sniper's brain trace when he does not relocate.

### Marlow Yard re-lit under the LR16 light model
- Marlow Yard (A1-A8): every fitting re-tuned for the one photometric light model (LR16): room fittings on night settings, a high-bay optic on the A2 shed strips and the A6 pump bays, the A5 flood reach short of the landing pocket, the A5 kiosk light a hooded gooseneck on the keypad, the A8 counter lamps inside their shades. The meter reads as before: lit pools, mid floors, dark pockets, cut circuits dark.

### Moving lights: flicker and stutter (LR16-5)
- Fires flicker, and one failing fluorescent tube per main map stutters (Warehouse Ops, the campus, Marlow Yard, the
  Warehouse): every few seconds it chatters or drops out and catches again. The picture, the light meter and the guards
  all follow it; a shot, switched-off or breaker-cut lamp stays dark. Co-op: both players see the same flicker with no
  extra network traffic (no wire change).

### Swinging pendants on Marlow Yard (LR16-5b)
- Marlow Yard's hung fittings swing when a round passes close, a grenade goes off nearby or someone bumps one, then
  settle in about 15 s. The fitting and its rods move as one; the pool of light, a guard's shadow and the light meter
  sway with it, and a shot-out lamp swings dark. Co-op: both players see the same swing; only the kick crosses the
  network (protocol 39).

### One light model (LR16)
- One light model (Michael: "Disable returning to original lighting system, focus on only the one new system"): every
  lamp now runs the realistic (photometric) falloff and the shadow-accuracy fixes are always on. Settings > Gameplay >
  Lamp falloff and `?falloff=photo` are gone (an old saved choice is ignored); Character shadows Auto / On / Off stay.
  Co-op no longer sends the lamp falloff with a match start (wire change: `start.lf` and the rejoin record's `lf`
  removed; the protocol number is set at the merge).
- Docs name one light model (no Lamp falloff setting).
- Soft light on walls (walk 4.82 item 8, "blotchy, not smooth"): each lamp's bake grid now sits on the lamp itself, so a
  ceiling lamp no longer shadows its own wall from its mount (no dark toothed band above the fittings on any preset).
  Low and phones read depth and HDR colour at full precision and get Medium's surface normals.
- Realistic lamp levels on every map (LR16g / LR16-W): warehouseOps re-lit at night levels with beams and moved rows so
  routes sit in the rim and pockets stay dark; S3 stores cage gets a steel top; campus S4 cage post moved off its lamp.
- One-bounce fill reaches ceilings; no faint bounce glow behind thin walls or between crates and walls.
- Guard torches: the holder no longer shades his own beam; fences, ropes and bullet marks take torch light like the floor.
  Bright maps with no torches build no torch shadows.
- Lamp flicker / stutter drives the night-vision glare and reflections too.
- Performance: the lamp bake uses about a quarter of the memory per worker; per-frame lamp data upload 560 -> 27 KB on
  campusOps; character shadows skip lamps too faint to cast one.
- Fix: the bounce-light shader failed to compile on Windows D3D11 at Epic (lamps unlit, frame stalls); rewritten without
  local arrays.

## 4.87.0 - Train 46: Guard body compile watchdog; Merge train: feature/menu alone is not a train; Guard AI: report, then engage; training cameras (2026-10-24, PR #297; #295, #293, #272)

### Guard body compile watchdog
- Guard bodies: a slow body shader compile is left to finish (the watchdog recovers only a timed-out, failed or disposed compile, or one still unready after 45 s), and a recompile no longer flags the new body shader disposed (e2e-lightbake's console warnings on big Epic shaders).

### Guard AI: report, then engage; training cameras
- A guard who spots you takes cover and radios it in, then, once his call is through and a peek shows nothing, leaves
  his cover and moves up on where he last saw you, still in the fight, and searches from there: he no longer sits in
  cover until the fight times out into a search (Marlow Yard walk 4.82, item 2). In a group the caller reports only
  while his call is open, then takes a fighting role. Coordinated modes only; host only, no protocol or save change.
- Training cameras: a camera marked `guardResponse: false` in its map data brings no guard response (no guard sent, no
  radio call, no search; its body sightings are not reported). Its alarm, the course rules and the radio lines are
  unchanged. Off by default: every existing camera behaves as before (walk 4.82, item 6, for Marlow Yard station 3).

### Merge train: feature/menu alone is not a train
- `merge-train build` stops (exit 3) without pushing or opening a PR when every member except the docs-only
  `feature/menu` ride-along was left out (train 44 opened #292 holding only the menu docs merge, no version commit).

## 4.86.0 - Train 43: e2e-ctcourse A3: calm wait after the step-4 send-back (pairs with #254 S23); Guard AI: guards hear you in a fight and a search; Guard AI: cover, clear lines and the alarm draw; +2 more (2026-10-24, PR #289; #271, #270, #264)

### Guard AI: two intruders
- Co-op: guards keep one last known position per player. When you split up and are seen apart, the guards who saw
  the host keep hunting the host's last seen spot and the ones who saw (or were told of) the partner hunt his; a new
  sighting of one player no longer turns every hunter round. Each fight has its own reporter, point, overwatch and
  flank, and two fights never take the same cover.
- A radio contact call or a shout tells the section only of the player the caller saw; a shot locates its shooter.
  Reinforcements hunt the player of the guard who raised the alarm. The host's last-known-position ghost shows only
  the host's own spot.
- Solo and co-op: an alerted guard who has no last known position for his player goes to where he last saw someone
  (or what drew him), never to the player's real position. Otherwise solo is unchanged. Host only: no protocol or save
  change.
- Guards called in by a squadmate who had not seen anyone (shot from the dark) close on the player once any of them sees him: that first sighting is radioed again, naming him.
- A guard sent in already alerted (parked modes' reinforcements, scripted spawns) now hunts what his squad already
  knows of the players, instead of standing at his spawn.

### Guard AI: search where a player could be
- After a fight, the searchers check where you could have gone in the time since they last saw you: dark corners and
  cover near your last seen spot, by the way you could walk there, best first, one searcher per spot. A spot behind a
  wall is as far as the way round; lit open floor is left for later. When those run out they sweep round your last
  seen spot as before. A search for a body, a device, a radio call or a noise is unchanged. Host only: no protocol or
  save change.

### Guard AI: guards hear you in a fight and a search
- Once a guard is searching or fighting he still listens. Run, land, roll, rattle a fence or fire a suppressed shot
  within his hearing (walls and nearby machinery still muffle it) and a searcher turns and walks to where he heard you
  ("I heard something."), looks round, then goes on searching; a guard in combat who cannot see you turns his hunt to
  the noise, and the search after it starts from there. Crouch-walking stays silent. A bottle or noise maker still pulls
  searchers but never a guard in a fight. In co-op a noise only gives away the player who made it. Host only: no
  protocol or save change.

### Guard AI: cover, clear lines and the alarm draw
- Guards working together no longer stand upright and still in the open when they lose sight of you: they crouch while
  they wait for the group and take the nearest cover within about 3 s (with no cover near, they stay crouched).
- The covering guard's suppressive fire at your last known spot now needs a clear line from his gun: no more bursts
  into a wall. Suppressing no longer moves where he thinks you are.
- The guard calling in the contact throws no grenade and starts no flank while his call is open; caught in the open he
  still fires back.
- After any alarm stage (Sector Ops: a panel, a camera or a laser) every guard of the section keeps his gun drawn; a
  restart from a checkpoint before the alarm holsters them again after the calm time.
- Closes guard-ai S8 checker polish items 3, 5 and 7 and walk checker polish item 4. Host only: no protocol or save
  change.

## 4.85.0 - Train 42: Changelog fragment check in CI; anim-fix-pass before numbers: written only on request; e2e-ctcourse A8 relock wait; Co-op rejoin follow-ups; +5 more (2026-10-24, PR #288; #286, #285, #284, #282, #280, #254, #252)

### e2e-ctcourse A8 relock wait
- Tests: e2e-ctcourse:4 waits up to 5 s for the A8 grille to relock on the host after the night circuit returns (it relocks one host step later; train 40 flake).

### anim-fix-pass before numbers: written only on request
- `tests/animFixPass.test.ts` (the AF0 before-numbers report) runs only with `AFP_WRITE_NUMBERS=1`, so a normal or train
  test run no longer rewrites the tracked `docs/anim-fix-pass/before/numbers.md` (it stopped the 4.84.0 release).

### Co-op rejoin follow-ups
- (coop-rejoin-2) A co-op client whose page reloads while the host restarts the checkpoint (or sends it back from a
  camera hallway) is still placed at the checkpoint, not left at the level start; a client that drops a second time
  before reaching its placed spot is placed again on its next rejoin. No wire change.

### Co-op rejoin at the checkpoint, two spawn slots
- (coop-rejoin, walk item 7) A co-op client that joins, rejoins or reconnects while a run is in progress is placed by
  the host: in Course mode (Marlow Yard) and Sector Ops at the current checkpoint on its own slot, or beside the host
  when that checkpoint cannot reach the host (no path, or a locked door on it); never back at the level start. A
  course client's match loads at the current bay, and the host sends the course / sector state, items, doors and lamps
  at once. Other modes: back where its slot was held, else beside the host. No wire change (the existing `restore`
  event and the `start` message's `bay`).
- (coop-rejoin, walk item 4) Two spawn slots per spawn area: the host takes slot 0, the partner slot 1, at the match
  start, a "Start at" bay, a checkpoint respawn and a set or section restart. Map data may place slot 1 (Marlow
  airlocks `spawns`, Sector Ops `start2` / `checkpoint2`); without it the partner gets a spot beside slot 0 that is clear
  of the level, on a floor and in an open line from it (`game/spawnSlots.ts`).

### Changelog fragment check in CI
- Tests: CI parses every `changes/*.md` fragment with the train build parser (`tests/changesFragments.test.ts`), so a fragment without its "# <title>" line or entries fails the PR instead of the train build (train 39).

### Guard AI: every player is seen
- Co-op: a guard now looks at both players, not just the nearer one. Hiding behind a wall close to a guard no longer
  makes your partner invisible while he stands in the guard's light in front of him: the guard notices whichever of you
  he sees best (one meter, filled at that player's rate; two in view do not add up) and goes after him. In a firefight
  he keeps shooting at the player he is fighting while he still sees him; a nearer hidden player no longer blinds him.
  Out of sight of him, he turns on the nearest player he does see.
- Co-op: the host's awareness arcs show only guards that see the host's own player (or stand close by), not guards
  filling up on the partner. The flanker is picked by each guard's distance to his own target, not to the host.
- A calm guard casts no sight ray for a player he cannot see at all (behind him beyond arm's reach, or past his view
  range). Solo play is otherwise unchanged. Host only: no protocol or save change.

### Auto-train: big trains keep their version commit
- Auto-train read only the first 100 commits of a train PR, so a train with more lost its version commit and stopped with "no version commit: rebuild" (trains 39 and 40). It now also reads the head commit.

## 4.84.0 - Train 40: Auto-train laptop missing alert; Marlow Yard A2: woken guards and the spotted rule; Camera reach and mocap timeouts; Marlow Yard: Michael's 4.82 walk fixes; +7 more (2026-10-24, PR #279; #277, #276, #274, #267, #265, #258, #252, #247, #226)

### Fast-gait feet (anim-fix-pass AF1)
- Mocap jog / run / sprint feet no longer cross or stick in turns: the clips' planted track is centred and measured
  on the stance, the planner's turn steps keep the clips' stance width (the outside foot steps out by the turn's arc),
  and the clip feet hand turns to the planner from 1.5 rad/s with hysteresis.

### Animation fix pass AF2: run carriage and steady hands
- Mocap run / sprint carriage (Michael P1 "weird pose when running", "hands randomly moving around when running"): the
  capture's pelvis rides about its own mean and is lifted (run knees no longer sit bent), its constant pelvis roll / yaw
  is taken out, the chest pitch follows the CT run carriage, the turn bank leans the body into fast turns again, and the
  arms go through a light follower with keepElbowOut's swivel eased (`MOCAP_LAYERS` pelHeight / trunkMean / bankWipe /
  armSmooth, `MOCAP_RUN_POSE`).

### Balanced crouch walk (anim-fix-pass AF3)
- The crouched walk sits its hips back over the feet and keeps one carriage from the sneak to the crouch walk: trunk about
  32 deg at gears 1-3 (the sneak capture leaned 43 deg), hips within 2.2 cm across the gears (were 7 cm apart), the
  centre of mass about 3 cm ahead of the feet (was 11-15 cm), the sneak's side sway halved.
- Shorter crouched steps at a higher cadence: 0.40 / 0.45 / 0.50 m at gears 1-3 (were 0.47 / 0.56 / 0.64); the crouch
  run's stride lengthens again past 1.9 m/s.
- (CI fix) Guards keep their crouch: the balanced crouch walk, its shorter steps and the crouched gun hold are Wren's only;
  crouched spins keep their short turning stance with the new crouch cadence.

### Animation fix pass AF4a: crouched strafe hips steady, no kneel on a flip
- Crouched aimed strafe (Michael P4 "moves around constantly"): the glide's hips go 0.85 of the way to the feet's centre
  and that shift changes at most 3 cm/s when crouched (`GLIDE_HIP_CROUCH`), so stop-go and L <-> R flips swing the hips
  6-7 cm instead of 8-13 cm; standing is unchanged. Crouched and aiming, the kneel waits 0.35 s still
  (`KNEEL_STILL_AIM`), so a stick flip through the dead zone no longer drops into a kneel and back.

### Animation fix pass AF4b: crouched strafe and wall slide, gun clear, pistol on one knee
- Crouched and armed, the kneel goes down on the gun hand's knee every time (Michael P4 "pistol shifts between knees": it
  followed whichever foot the planner had ahead, so it changed between stops).
- The crouched pistol low ready is held higher and ahead, clear of the knees (`CROUCH_GUN.pistol`: it hung between them
  and the body clearance pushed it from one side to the other), and rises a little while kneeling down or standing up; the
  hang stays up until the knees are down when standing from the kneel (it dropped into the rising thighs and jumped 11 cm
  sideways); the raised pistol crouched is held 5 cm further out (`PISTOL_REACH_CROUCH`; grip jitter 1.01 -> 0.67 cm a frame).
- Drawn and crouched at a wall (Michael P4 "with rifle clips"): the gun keeps the crouch carry raised over the knees
  (`CROUCH_GUN.wall`) through the slide and the reversal instead of the muzzle-down wall tuck, and the side-on body keeps
  the free crouch's lean with a weapon out; gun vs legs went from -10.5 cm to +2.2 cm or more.

### Mocap is the only player animation path
- Settings > Gameplay no longer has the "Mocap locomotion" row: Wren always walks, jogs, runs, sprints and sneaks with
  the motion-captured clips (Michael: "Mocap off: has old animations which are also still as bad as they originally
  were"). A save that had it off now boots with it on; the save field stays (no save change). `?mocap=0` or the
  animation tuner's Mocap box (that page only) still show the hand-keyed set for comparison.

### Co-op partner moves like its owner
- The co-op partner's walk, run, stops and crouches now play in step with what its owner sees (Michael, walk 4.72
  P5: "animations are bad, doesnt match existing animations, seem more jumpy"): the owner's stride clock, motion state
  (start / stop / turn / pivot), acceleration and Chaos Theory stop travel with each player state, the host times the
  joiner's states by the joiner's own clock instead of their arrival, the partner renders a little further behind
  (0.13 s on the host, 0.16 s on the joiner) so a late packet no longer makes it guess ahead and snap back, and its
  pace, velocity and turn rate blend smoothly between states. Off a wall it turns back at the owner's rate, and it
  crouches and stands on the owner's stance curve. A wire change (the train build sets PROTOCOL_VERSION): both players need this build.

### Animation fix pass
- Animation fix pass (Michael's walk P1-P5): plan, causes traced in code and before contact sheets / quick audits
  (`docs/anim-fix-pass/`); the sheet script gains `aimcrouchstrafep` (the pistol crouched aimed strafe).

### Auto-train laptop missing alert
- Auto-train: an open train whose CI `check` is green but has no `laptop-e2e` status 10 min later
  (`AUTO_TRAIN_LAPTOP_MISSING_MIN`) now reports state `laptop-missing` with the train, head and `waitingMin`, so the
  orchestrator chases the laptop queue instead of waiting for the 3 h `stale` alert.

### Camera reach and mocap timeouts
- Tests: longer timeouts for the all-maps camera reach and mocap short-start tests (train builds on a loaded desktop).

### Guard AI: the Marlow Yard A4 console officer
- Marlow Yard A4: the security console cannot be switched off while the officer watches it (he refuses you); draw him
  off with a distraction and the press goes through. Back from the noise he notices the console off, walks over and
  turns it back on, calm (Michael's walk G6). The A8 strongroom console refuses the same way.

### Marlow Yard A7: equipment cabinet in the cage
- The A7 cage now has an equipment cabinet between the terminals, so the technician at the cage front can no longer see a
  player waiting at terminal two through both mesh faces.

### Marlow and Sector Ops small fixes
- Sector Ops: a late joiner or reloaded rejoiner now lists every rated section in its results, not only the last. The
  `sector` message carries an optional `rh` (every section's marks and synced takedowns, as the course message's) inside
  protocol 42; the client rebuilds the results lines from it (no card, no top-up, no grant).
- Co-op client: your own round off a bulletproof camera (Sector Ops, Marlow Yard) now shows the ricochet sparks and
  plays the impact sound on your screen, as it does on the host's (local only). `nearestHousing` is the shared pick.
- Docs: the revive reach in the Marlow Yard spec (`docs/marlow-final/SPEC.md`, CONSTRAINTS, ENGINE-ANSWERS) now reads
  1.6 m, the revive item's own reach in code (1.8 m is only the interactables default).
- Tests: e2e-ctcourse A3 step 3 shuts both players in the L2 room behind its far door before the corridor switch goes off
  (the client out only for the dark send-back), so the lure no longer finds them (a step-4 "calm" timeout flake).
- Docs (code): the protocol 42 comment names the `sector` message's `rh`.
- Sector Ops: the per-section synced-takedowns list for `rh` is built with the run, so the two always reset together.
- Co-op results: each section's rating line goes into the op-end results list at most once (`putRating` replaces by section id); e2e-section-rating's rejoin parts now check the client's list equals the host's (Marlow: A2 from `rh`, A3 from `rt`).
- Tests: e2e-ctcourse A3 1b asserts the client's own round off the bulletproof hall camera sparks on the client only (host camera online, host ricochet count unchanged, a ray under the housing does not spark); A3 also asserts the L2 far and L3 near doors unlocked on the host.
- Marlow Yard: A4's two mezzanine stairs (open south side) and A8's public stair (both sides) take an invisible noLedge collision rail from the third tread to the head (A6's staff stair idiom), so a player can no longer step off the flights.
- Tests: the A7 cage clearance and A6 "stays off the marks" dressing checks have teeth: a planted 0.03 m skin in each window must be found (S3-7-dress polish 4); no game change.
- Tests: e2e-ctcourse A8 step 5 waits for N2's grille stop with the client in the dark at the jam spot and only then puts him at the board (a flake under load: standing at the board's west side across a full N2 cycle put him in front of N2's W2 -> TALK leg); the timeout now prints N2's state; no game change.
- Tests: e2e-ctcourse A3 step 3 hides both players in L2's south half (71.5 / 74.5, 8.2): the client's old spot (72.5, 11.5) was in view of the far wall's clear glass slot, where the cleaner's device search and breaker walk saw it and fought through the step-4 calm wait (laptop 3/3); no game change.
- A6 the Pump House: the interlock lamp beside the outfall door now shows red until the drive is isolated and green after, on both players' screens (marlow-polish P3-1).
- A2 the Carriage Shed: the east stair's open south side now stops a body stepping off the flight (an invisible collision rail from x 68.6 to the stair head, as A4, A6 and A8 have); the bottom treads stay open from the side; the staging deck's east end beside the stair head, open to a 4.4 m drop, now has a 1.1 m rail too (marlow-polish P3-2).
- Tests: e2e-ctcourse A3 step 3 now waits for the cleaner to be calm and back on his office loop before the corridor cut: step 2's camera alarm sends him to search the corridor, and the dark send-back taken while he stood there put the client in his sight at the send-back spot; his search round it runs through the L2 far door into the players' room (laptop 2/2 on d0689dd8, 3/3 on 1bde5328); no game change.

### Marlow Yard A2: woken guards and the spotted rule
- Marlow Yard A2: a knocked-out guard woken by a squadmate now fails the set when he spots the players (the spotted rule reads the live guard list, not the set's spawn list).
- A set change also removes guards a squadmate woke in that set, so none carries into the next set.
- A2 wheel stops: the `side` names match the shed ends (code only, no change in game).

### Marlow Yard: Michael's 4.82 walk fixes
- Marlow Yard A2: being spotted now fails the set. LANTERN says "Spotted. Back to the start of the set." and the set
  restarts with both players back in L1 (per-set `spotFail` rule, host side, no wire change; the rule holds 1.5 s
  after any set restart).
- Marlow Yard A2: more linear and watched from above. The neck is reached by two lanes (four closures shut the cess and
  north walkway), two overwatch guards on the staging watch the lit crossing, and the taught crossing is now the road 2/3
  gap. The obstacle on the floor in front of the L2 airlock door (road 2's east wheel stop) is gone.
- Marlow Yard A3: the hall camera no longer alerts the guards, adds an alarm or breaks Undetected; sending you back to the
  lobby is its only cost (a training camera).
- Marlow Yard start room: now an armoury, with a four-case weapons display cabinet on the west wall, two locker banks on
  the south and north flats and two free-standing benches, replacing the reception desk, green wall and armchairs. The
  spawns and the aisle to the door are unchanged.

### Sector Ops: Saltmarsh Park detail art, gear and sweep points
- Sector Ops campusOps: the full detail-art lift of Saltmarsh Park. Every room of the five sections now reads as its real
  place (gatehouse, HQ atrium and offices, lab block, data hall, the 1960s Old House, car park and grounds); props sit over
  the greybox boxes and never change collision, cover, ledges, nav, cameras, lasers or the light bake.
- Campus art kit: one shared instanced prop and material kit (the marlow-final facility props plus a new 60-piece campus
  base kit, Blender-built in repo), room finishes, a rule-based base dressing by room tag with keepouts round routes,
  patrols, doors, items, takedown and hide spots, co-op lips, cameras, lasers, lamps, traversal anchors and glass, and
  pure gates that prove routes, nav cells, patrols, cover, lips, ledges, split gaps and light parity are unchanged.
- Campus hero sets per section: S1 gatehouse desks, CCTV monitors, key cabinet, barrier, parked cars and bollards; S2
  reception, speed gates, cafe, mailroom, offices and the atrium display; S3 test chamber, EMC room, burn-in racks, crane
  girder and clean room; S4 pod racks, containment, cable baskets, CRAC, UPS, batteries, NOC wall and plant; S5 radio racks,
  rolling stacks, strongroom fronts and time lock, balustrades, chimney stacks, trees and the van.
- Sector Ops campusOps: guard gear tags (helmets on the S4 / S5 late guards) and response-team sweep points for S4 and S5
  (data for the guard AI; dressing keeps clear of the sweep points).
- Sector Ops campusOps: with guard-render in, the per-view guard limit rises from 6 awake guards to 12 guards in sight,
  every guard counted (A99), so S4 and S5 run their full 20 / 24 guards.

### Campus art next: kit API, dressing and freeze polish
- Campus art kit: `skinFace` puts a visual panel flush on one face of a greybox box. It writes no box, so collision, light and sight stay as they were.
- Campus art kit: `tryAdd` takes a list of spots and returns the first that passes (or -1). Every refusal names its keepout rule (`ArtRuleError`).
- Campus art kit: per-piece fit ranges for battery racks, lab benches, mesh panels and kitchen runs. Floor decals under 5 cm are no longer held to the route, patrol, door and box keepouts (K1-K6, K13). A door frame may span its own door.
- Campus dressing: S1 parked cars come in four colours. S1 heroes go through `tryAdd`; the bike rack and bench it refuses are an explicit omitted list the test checks.
- Campus dressing: the S2 atrium green wall is skinned onto the west wall in both bays.
- Campus dressing: S4 battery rows use the real battery rack piece, the raised-floor tile grid now covers the hall (72 tiles), and the genset exhaust stack is listed as an overhang part.
- Campus dressing: S5 kitchen counter run and wall cupboards are placed. The two hall portraits sit at the hall floor's height.
- Freeze polish C4-C6 (C1-C3 were already on the base; C7-C9 at the master merge).
- Guard render freeze: the frozen tier is now part of the guard anim tiers (one system). A guard thawed from the freeze is posed in the same frame, so he never shows his pose from before the freeze; if he walked more than 0.3 m while hidden his feet re-plant instead of stretching; a guard killed while hidden falls from his current pose (C7-C9).

### Campus art polish batch 3
- Campus dressing: a raised piece with no wall behind it counts as a floor prop below 1.9 m (only higher pieces take
  the ceiling rules); long route, patrol and laser legs that cross a section with both ends outside it are kept; the
  skin-reach check skips a camera ray only where the skin meets its own piece (2 cm) and a laser only in the piece's
  height band, measuring listed overhang parts (the S4 basket hanger rods) by their real geometry.
- Campus art: a failed art build disposes everything it made; the detail pass leaves art boxes bare (drawn and baked).
- Campus load: the dressing runs about twice as fast (cold) and 60% faster (warm) in node, with identical output.

### Sector Ops guard freeze polish
- Guard render freeze (Sector Ops, render only): a guard behind a door that cracks or opens, or a breakable pane that
  opens, is re-tested and drawn at the next frame instead of up to 4 frames later; a hidden guard coming back into the
  view, or hidden right behind a wall's edge, is re-tested at once / every frame (ray budget still capped at 8 guards
  per frame).
- The freeze now samples a guard's knees, and a roof guard's moon shadow that falls off the edge onto the ground below
  keeps him drawn.

### Sector Ops guard render freeze
- Sector Ops guards whose body and shadows cannot reach the screen (outside the view, or behind walls, floors and
  closed doors; never glass or fences) skip the render: no mesh evaluation, skeleton or shadow draws for them. Render
  only; the brains, perception and light are untouched. `?guardfreeze=0` turns it off (sector-redesign perf).

### Sector Ops polish 2: lamp shots through door soffits, skin overhang gate
- Sector Ops: a round that lands just under a lamp breaks it only with a clear line up to the lamp's head, so a rising shot through a doorway that hits the door soffit no longer breaks the wall lamp over the far side of the door (host, client and single player agree; no wire change).
- Sector Ops campusOps: the art gate checks a skin's listed overhang (hanger rods, exhaust stack, chimney pots) against camera rays and laser beams; the split gaps come from the bare greybox before any section is dressed.

### Sector Ops walk 4.72 fixes
- Sector Ops: a round that lands on a street lamp's pole just under its head (Saltmarsh Park's 6 m lamps, bollard heads) now shoots it out, for the host and, through the host, the co-op client; before, those lamps could not be shot out from the ground by anyone.

### Train lock wait
- Tooling: `scripts/merge-train.mjs` `build` waits at most 5 min (was 30) for the heavy lock before its vitest run, then
  exits 4 (pending; CI still runs the unit tests). `TRAIN_LOCK_WAIT_MIN` (minutes) overrides it.

## 4.83.0 - Train 36: Train vitest retry; Snapshot line endings; Guards relight switched-off breaker boards (guard-ai LR16-4) (2026-10-23, PR #263; #262, #259, #255)

### Guards relight switched-off breaker boards (guard-ai LR16-4)
- Guards relight (guard-ai LR16-4, the LR16-0 audit's gap row 10): the S15 breaker walk now covers the Sector Ops
  breaker boards as well as wall switches. A breaker board (`MapLayout.boards`, no `window`) cut with a guard watching is
  a fault: one witness says "Breaker's gone again.", walks to the board at patrol pace, works it 2 s and
  `IsolatorBoards.switchBack` puts every circuit of the board back on (the board's label, its wall switches, the
  `lightSwitch` event and the co-op lamp sync follow, as for a player's switch-back). A second cut inside 60 s is the
  S2 light check at the board; a cut nobody saw is found by late discovery; a shot lamp stays dark. A timed isolator's
  running window is the player's: its cut stays the S2 look at the board (the lure), no guard switches it back or turns
  a wall switch of its circuit on while it runs (`switchBack` refuses, the breaker host's `isOff` is false), and the
  timer relights it. Wall switch cuts were already relit by S15. Host only, no wire or save change. Unit tests in
  `tests/guardRelight.test.ts`; `tests/sectorIsolator.test.ts` updated for the refused switch-back.

### Snapshot line endings
- Tooling: `.gitattributes` checks out `*.snap` with LF, so vitest no longer rewrites the snapshot on CRLF checkouts and leaves the merge-train worktree dirty.

### Train vitest retry
- `scripts/merge-train.mjs build`: when the full vitest run fails only on timeouts or in at most 3 test files, those files
  rerun once in isolation (`--no-file-parallelism`); a pass counts as ok, so desktop CPU load no longer fails a train build.

## 4.82.0 - Train 33: Sector Ops lamp door slots and torch drawing; interrogation codes open course flags and keypads; laptop test queue service (2026-10-23, PR #256; #242, #249, #252)

### Laptop queue service
- Tooling: `scripts/laptop-queue/` (queue service, `request.mjs` CLI, `serve.mjs`, `install-task.ps1`) runs requests from the
  `laptop-queue` branch and `train/*` heads on the two laptop slots, shards train runs across 4189 + 4192 and posts
  `laptop-e2e` / `laptop-e2e/<set>` commit statuses. Docs: `docs/systems/testing-tools.md` "Laptop queue".

### Lamp door slots and exact torch light (LR15)
- With Realistic lamp falloff on (prototype, default off), a lamp now stops at up to 8 shut doors instead of 4, so light
  no longer leaks past a long row of doors, and a guard's flashlight that has no shadow map lights you exactly as the
  light meter and the guards read it, cut where its beam meets a wall. Classic falloff is unchanged.

# Realistic lamps light large maps again (lr-tex3d)
kind: patch
- With Realistic lamp falloff on, the lamps on large maps (Saltmarsh Park) no longer go dark on screen: their light data
  was too big for the graphics card and failed to load, so the picture showed only the fittings while the light meter
  and the guards still saw the light. The data now packs to fit the card's limit. Classic falloff is unchanged.

### Lighting polish (LR13 / LR14 / LR15 checker lists)
- Character shadows: a guard right beside a lamp, in a dense crowd, or just stepping into a lamp's reach keeps its soft
  shadow instead of briefly losing it; after the graphics context is lost and restored there is no brief dark cone.
- Realistic lighting (test): a guard's torch through glass is no longer about 3x too bright.
- Co-op: "Resume hosting" runs the same lamp falloff the dropped match ran.

### Stealth pays: interrogation door codes
- Interrogation door codes now open Course gates and Sector Ops keypads. Course: the code is set as a course flag, so a gate
  that lists it in `externalFlags` opens (stealth-pays S1). Sector Ops: a guard's slot `info` is copied onto him at spawn and
  the code is held by the team for that section, opening the matching keypad (dropped by the section's restart; S2). Play is
  unchanged until map owners author guard `info` codes.

## 4.81.0 - Train 32: Marlow Yard final and section rating; guard body GPU skinning after recovery; release speed-ups and automatic trains (scheduled task not yet registered); faster agent tests (2026-10-23, PR #253; #244, #246, #250, #248)

### Agent CPU: cached vitest transforms and incremental typecheck
- Vitest persists transformed modules across runs (`fsModuleCache: true`); transform was 75-88% of tracked time per run.
- New `npm run typecheck:fast` (incremental `tsc --noEmit`, build info in `node_modules/.cache`). `typecheck`, `build` and
  `check` are unchanged.

### Automatic merge train
- `scripts/auto-train.mjs tick`, run every 5 min by a scheduled task (`scripts/auto-train-task.ps1`), builds the next
  merge train from the `train-ready` PRs with a green `check` and releases it to master once CI and the laptop's
  `laptop-e2e` status are green; failures, stale trains and conflicts are reported in
  `C:/NightShift/scratch/auto-train-status.json` for the orchestrator (`docs/systems/auto-train.md`).
- Trains are paced: the next one is built once the last release is 60 min old, or earlier when the laptop queue is idle.
- A release is pinned to the tested head (`merge-train release --head <sha>`, `gh pr merge --match-head-commit`), a
  train with no version commit is never released, and a hand-run merge-train and a tick share one lock, so they never
  overlap.

### Guard carry: recovered guard bodies GPU skinned again
- Fix: a guard body recovered from a timed-out shader compile (4.80.0) is GPU skinned again. Babylon's first fallback
  on the failed compile had switched the body to CPU skinning, which draws the GPU-buffer body unskinned (bind pose);
  `recompileEffect` (`src/player/bodyEffectRecovery.ts`) turns `computeBonesUsingShaders` back on for every mesh holding
  the recompiled effect. Unit test in `tests/bodyEffectRecovery.test.ts`.
- `e2e-guard-carry` gets a "(forced)" pass that makes the first guard-body compile time out the way the laptop GPU did
  (a runtime hook on Babylon's compile poll, cut to 1 s, with Babylon's own timeout error), so the suite fails without
  the recovery (master 4.79.0 fails it: the guard stays invisible). The pass asserts the fault fired (a timeout or a
  recovery drop), the body recompiled, drawn and GPU skinned again. Run with `E2E_GPU=1`.

### Marlow Yard redesign: eight co-op sets in a luxury training centre
- Marlow Yard (map `ctcourse`, Course mode) is rebuilt as one 15-20 minute co-op run: eight sets A1-A8 inside a luxury
  rehearsal centre (glass instructor gallery, LED coves, sliding doors, dark premium surfaces), each set a mock-up of a
  real-map co-op scenario: A1 Gate (leg-up, relay and bolt), A2 Carriage Shed (timed light isolation), A3 Office Range
  (timed jam relay), A4 Goods Shed (security room camera loop, dual takedown), A5 Substation (partner throw, floodlight
  jam, release), A6 Pump House (rope and hang-down hack), A7 Data Hall (split paths, synced hack), A8 Strongroom (all of
  it under two timers). Seven lit holding rooms join the sets. Every set is lit and the players make the dark.
- No explainer pads. The objective table updates per set and guides both players; where the team splits each player sees
  their own A or B line, and the first player to do a set's A job takes it for both (`CourseObjective` steps, N1).
- New co-op devices: a two-way timed light isolator (N2, 15 s and 25 s windows, re-arm, lights-out lure, restart now
  restores every lamp); a timed security console that loops the cameras for 60 s with a 20 s re-arm (N3); a hold device
  whose noise a joiner makes too (N4, protocol 30 `use.pulse`, `NetItem.hn`); several scanner pairs (N6, protocol 30
  `sec.sc` one entry per pair); one-player pass zones; sliding doors with Open only (N9); the course start list reads the
  course's bay count (N8). Course guards now run stealth rules (shout, search, cooldown, detection stat).
- Co-op wire: `PROTOCOL_VERSION` 42 (this branch's 30 / 33 / 36 wire, scanner pairs and hold pulses, over train 30's 40; 41 reserved for guard-ai S9). Details: `docs/systems/coop.md`.
- Fixes: the character controller no longer reads a stale floor for one step after a hang, climb or teleport
  (`staleSupport`); a client's wall switch press is taken only within the host's reach rule.
- Course tests: one unit file per set (`tests/ctcourse/`), a whole-map light frame (`CTLIGHT_WRITE`), `e2e-ctcourse` now
  runs as four parts (:1 A1-A2, :2 A3-A4, :3 A5-A6, :4 A7-A8), `scripts/shots-ctcourse.mjs` takes one shot per set vantage.
- Old best times: the course record was keyed by bays S1-S8 and the bays are now A1-A8, so the old best times no longer
  show and the record starts again. No save migration (`SAVE_VERSION` unchanged; the record is a sanitised key).
- Proposals built as assumed decisions, each undoable (`docs/marlow-final/SPEC.md` section 15, `STATE.md` MORNING-REVIEW):
  - P1 entry vantages are concealed by occlusion and holding rooms are lit; undo: a dark mixed-zone pocket at each vantage.
  - P2 sets sit at 0.14 standby light, 0.30 in the lounge, holding rooms and dock; undo: keep 0.30 (isolations become lures only).
  - P3 timed device windows only (never a fail, no course clock); undo: held isolators and a permanent console off.
  - P4 new rule LD 5.5 "lit as the real building, the players make the dark" (Marlow Yard only here); undo: lower fitting intensities.
  - P5 an alarm resetting the set is not used; add it only on Michael's word.
  - P6 12 role-players, at most 3 alive per set; undo: drop `a4-dock2` and `a8-night2`, move the A1 checker slot.
  - P7 Course guards run `em.stealth = true`; undo: one line in `courseMode.ts`.
  - P8 occluders on every high route instead of a guard look-up penalty; undo: build G44's penalty in `perception.ts`.
  - P9 new code N1-N4, N6, N8, N9; undo: the per-item fallback in SPEC P9.
  - P10 one new mechanic per space is relaxed in A4 and A6; undo: move A6's rope to A8.
  - P11 two or three ways per guarded set, a secret in A2, A3, A5; undo: a secret per guarded set.
  - P12 set walls stop under the 10 m hall roof; undo: a charcoal panel wall above each to the roof.
  - P13 co-op lip spans are open loading edges (a drop chain); undo: full rails, lips move to a hoist bay.
  - P14 info lines on the A1 checker and the A4 and A8 officers; undo: the A1 checker only.
  - P15 the luxury rehearsal centre replaces the bunker fiction (Michael's word, M5).
  - P16 striped leg-up marks at A1, A2, A6, A8; undo: no marks, the objective line names the spot.
  - P17 all glass stops guard and camera sight and jam lines; undo: build G45's clear-glass sight.
- Open polish (none blocks play): the combined list is in `docs/marlow-final/slices/S3-7-dress-check.md` ("Polish list"),
  with `S34-check.md`, `S567-check.md` and `S8-check.md`. Main items: A5 beam towers and A4 / A8 stair rails have no
  collision, the A6 interlock lamp has no emissive, A3 floor surfaces, the A8 marble `tile` surface, and the lamp-radius
  trim. GPU frame time per set and the perf "after" run are pending a PC run (`docs/marlow-final/slices/S9-perf.md`).
- Slice 10 (Michael's walk 4.72 / 4.73): every Marlow camera (A3 hall, A4, A7, A8) is armoured. A shot ricochets with
  sparks and a ricochet sound, and the camera keeps watching. Jam and power cut still work.
- Slice 10: a checkpoint restart fully resets the set on host and client. Guards, bodies and drones go back to set
  start, with no old incident or alert left. A carried body, gadgets and noise reset. Broken cameras come back online.
  Doors go back as at set start: open ones shut, cracked ones whole, and locked doors shut.
- Slice 10: the A2 locked door has no lamp on the rebuilt set. The old lamp was on the master map only. Michael to
  re-walk A2 to confirm.

### Release speed-ups
- Merge trains: `merge-train.mjs build <n> <version> "<title>" <branch>...` now makes the version commit, opens the
  train PR and runs the unit tests on the train head, so CI runs beside the laptop e2e run; `release` only merges,
  tags and moves dev, and `release --resume` finishes after a fix on the train branch.
- One train may carry several wire changes: the train build bumps PROTOCOL_VERSION once, and tests read the constant
  instead of asserting its number.
- CI runs lint, tests and build in parallel with a cached `node_modules`, and a new push cancels the older run.

### Section rating: four marks, rewards and best records
- Sector Ops sections and Marlow Yard sets A2-A8 are rated on four marks: undetected, no kills, no alarms and bodies hidden. Each mark you earn counts once, so a clean section scores 4 of 4.
- Each mark pays a reward. Undetected gives a gadget charge. No kills gives a medkit heal. No alarms gives a syringe (a medkit heal when you play solo). Bodies hidden gives a gadget charge.
- Rewards never go over the usual carry limits.
- Synced takedowns pay more in co-op. A synced takedown is two players taking down guards within 1.5 seconds. Each one pays a gadget charge and a syringe, up to two paid takedowns per section.
- A card shows after each rated section, on the host and on the client. It lists each mark as earned or missed, and the reward you got. It hides by itself after about 4 seconds.
- The last section of an op or course shows no card. Its rating goes to the results screen.
- Each section is rated once, when you leave it. A restart does not rate it again.
- Your best marks per section are saved. More marks wins. A tie goes to more synced takedowns.
- The Sector Ops select screen shows each section's best marks as four pips. Unrated sections show no pips. Marlow Yard saves best marks too, but its select screen does not show them yet.
- The results screen lists every rated section in order, with its marks (for example 4/4) and its synced count.
- Co-op wire: protocol 42. The section rating adds the `rt` field to the sector and course messages and `rh` to the course message. It rides marlow-final's 42 (one bump per train), so host and client must both run 42. Builds on 41 and below are refused.

## 4.80.0 - Train 31: Guard AI co-op S9 and S22 response, calm-guard body recovery, optic cable at doors; dead RT settings hidden (2026-10-23, PR #245; #240, #234, #243, #239)

### Guard AI: co-op guard weapon carry
- Co-op: your partner now sees the guards carry their guns the way the host does. A calm patrol walks with his rifle
  slung on his back (an officer's pistol on his thigh) on both screens, draws it when something stirs him, holds it at
  low ready or raised as before, and holsters it again after a calm spell; before, every guard on the client stood at
  low ready all the time. The client's draw and holster run a moment behind the host's. Protocol 41 (the same co-op
  version as the guard-ai co-op state it ships with).
- Co-op: the "Sensor tripped" radio line now shows on the client too.

### Guard carry: calm guards drawn (stuck body shader recovered)
- New e2e suite `e2e-guard-carry` (full run; `src/ai`, `src/player`, `src/world` quick picks): on Warehouse Infiltration
  at High (no mission, the failing calm sheet's setup: one guard at a time under the strip lamp at 0, -3, the camera 2 m
  in front) a grunt, then an officer, stand calm 16.5 s (S21 holstered carry), then draw; the body effect's light
  defines are logged; each merged smooth body must
  be among the camera's active meshes with its material ready, its effect GPU skinned as the mesh is (never Babylon's
  CPU-skinning fallback served to a GPU-skinned body, which drew 4.77.0's calm guards as a floating gun), and no effect
  may fail to compile (the failure's error line is printed: `Effect.LogShaderCodeOnCompilationError` off). Train 29's
  lamp plugin changes (#232) already make the body's effect compile; this holds it. Run with `E2E_GPU=1`.
- Fix: guards no longer go invisible after a long stall while their body shader compiles. On the laptop GPU a merged
  smooth body's PBR effect could never finish compiling (Babylon's parallel-compile poll then gives up after ~2 min:
  "Operation timed out after maximum retries. - Effect: pbr"); the material kept that effect, so the guard showed only
  his weapons. `src/player/bodyEffectRecovery.ts` (run once per render for each body mesh, no allocation) drops such an
  effect from Babylon's caches and every sub-mesh holding it and compiles it afresh: at once when it timed out, failed
  for good or lost its program, after 8 s / 30 frames when it simply never finishes; at most 3 times per shader
  variant, each with a console warning ("smooth body ...: body shader ..., recompiling"). `e2e-guard-carry` now
  replays the failing sheet first: the 16.5 s calm stepped in one block with no frame rendered, then the body must be
  ready and drawn within 30 s of rendering; the 1 s-step pass follows.

### Guard AI: security console switch-back
- Security consoles (Michael's walk G6, guard AI side): a guard now notices a security console that has been switched
  off, but only when he actually sees it: in front of him within about 12 m, or beside him within about 4 m, never
  through a wall. A guard who was drawn away (sent to a noise, checking something, searching) notices once he is back
  and looks at it. He says so ("Console's dropped out again. Getting it back up."), walks over at his normal pace, works
  it for two seconds and goes back to his post calm. Switch it off again within a minute and it is no longer a fault:
  one or two guards come to check the console and look round it, then one turns it back on. Host only. The game side
  (Marlow Yard's console reporting its toggles, letting you use it while its guard is away, and the guard's switch
  back) lands with Marlow Build's console rework.

### Guard AI: the co-op partner sees what the host sees
- S9 co-op: the joiner now sees the guards' lines and radio calls (radio checks, "Shots fired!", talking pairs, the
  security desk) as the host does, with the radio chirp.
- A cautious guard carries his weapon at low ready, on both screens (solo too).
- The joiner sees the guards' vests and helmets from alarm stages 2 and 3 and a response team's riot shield.
- The joiner's headshot on a helmeted guard pings as a deflect at once, and the helmet falls on both screens.
- Co-op protocol 41: both players need this version.

### Optic cable
- (ct-toolkit 3.2, G97) Optic cable at doors, prototype: the door menu's OPTIC CABLE at a closed door kneels the
  operator in front of the leaf and, after a 1.2 s feed, puts the view under the door on the far side at floor height
  (the feed overlay, 100 deg field of view). The look turns the tip within +-75 deg yaw and -10..+60 deg pitch, night
  vision toggles as usual, a ping goes out from the view, crouch (B / C) or the stick pulled back leaves (0.6 s pull
  out). The tip is never perceived; the kneeling body is perceived as any crouched, still body. A door tagged `seal`
  refuses ("Sealed"), as does a blocked far side ("No gap"). The view is local (nothing on the wire). New
  `player/opticCable.ts` (pure), `game/opticSystem.ts`, `config/tools.ts`; the door anchor gets `seal`.

### Settings: dead ray-traced and GI controls hidden
- Settings > Graphics: the "Ray traced" reflections option, "Ray-traced reflections rate" and "Global illumination"
  are gone (they did nothing since the voxel look was retired). A saved Ray traced setting shows and runs as Screen
  space; the saved settings are unchanged (no migration).

## 4.79.0 - Train 30: Player batches 23-24 (iPad fit, suppressor ammo, team-climb top-out, partner pose parity) and co-op walk fixes; voxel look retired (2026-10-23, PR #241; #231, #236)

### Co-op walk fixes: team takedown on a hostage, partner shot audio
- (coop-walk-fixes P6) Co-op: when either player holds a guard as a hostage, the other player beside them gets TEAM
  TAKEDOWN on him (host or joiner holding, either way); it knocks him out (a held direct press kills), ends the hold and
  counts as a dual takedown for both. Before, the joiner's offer on the host's hostage did nothing and the host had no
  offer on the joiner's.
- (coop-walk-fixes P7) Co-op: a partner's shot plays once per round (a single shot played twice) and with their own
  weapon's sound, suppressed when it was (the suppressed pistol sounded like an open pistol); its muzzle flash is small
  when suppressed. Protocol 37: the player state carries the rounds fired (`sc`).

### Interrogation intel
- (interrogation-intel) Interrogating a guard with information now also gives intel as feed lines for every player: door
  codes authored on the guard (`GuardIntel.codes`, flag to `GameMode.onIntelCode`), the cameras near him (count, sweep
  time) and the patrols near him (count, loop time, read through the Guard AI `Enemy.patrolRoute` getter). A co-op client's
  interrogation is seen on the host from its MoveState; no wire change. A co-op client now also lists the host's relayed
  `feed` lines in its HUD feed (they were only a radio subtitle, so the partner never saw the intel there).

### iPad display fit
- iPad: the version label stays fully on screen (bottom / right offsets include the safe-area insets, `--vh` follows `dvh`
  where supported), the page and menu frame fill the visible viewport (no dark bottom strip), the "integrated GPU ... Windows
  Settings" banner and settings hint show only on Windows, and the pause menu's co-op room line wraps in its own block clear
  of the help box. Desktop rendering (zero insets) is unchanged.

- The in-game pause menu no longer lists Anim Studio (dev); the studio opens from the main menu only, and the pause menu keeps Animation tuner (dev).

### Partner pose parity: aim side, takedown blow, baked sections
- (pose-parity) Co-op: your partner's weapon hand now follows their shoulder swap in every mode (holding a hostage, on
  a rope, a split, an inverted pipe, atop the human ladder), not only on the ground; a partner choking a guard or
  stepping in for a lethal takedown no longer holds the elbow strike's wind-up (they pose no arc, as on their own
  screen); and once tuner values are baked into the code, the partner's rig plays the baked co-op / traversal move
  sections and Body root offsets (body forward / up, the hold's guard gap and side, the wall gap) as their own page
  does (never your live tuner values). Protocol 36 (32-35 are taken by open branches): the player flag `aimLeft` (64)
  and the takedown blow bit (MoveState `sub` 1); the ground `sub` bit 128 is dropped.

### Limited suppressor ammo
- Suppressed guns (the issued rifle, the Hush 9 SD) carry a limited count of quiet rounds (rifle 60, pistol 45), separate from
  the magazine. Each suppressed shot spends one; at 0 the gun still fires but loud (open sound, full flash, an open gun's
  noise to the guards), with a one-off "Suppressed rounds out" feed line. The weapon box shows "SD n" (red at 5 or fewer).
  Ammo crates refill quiet rounds, a checkpoint restart restores them, infinite ammo never spends them. In co-op a client's
  spent gun is loud on the host (no protocol change).

### Team climb: the rope top-out
- (team-climb) The two-person rope's top-out (CLIMB_UP_TEAM) no longer pops: the climber is pulled in to the face on
  the rope's last 0.6 m, then rises and moves over the lip on eased (quintic) paths that carry the climb's speed in
  (`teamMoves.ropeTopPath`; `TEAM.ropeTop` 0.9 -> 1.1 s). Root per-frame velocity change 5.7 cm -> 0.44 cm.
- (team-climb) The climber's hands grip the lip at the top (lip "hook" grips, lifting off as the arms run out), on
  the owner's page and on the partner's view of them (`ropeSeenStep`, no wire change). The Anim Studio's rope pair
  plays the same path.

### voxel-retire
- The voxel look is retired (Michael: "nothing should be voxel"): `?voxels=1`, the voxel world, voxel characters and
  weapons, chips, voxel GI and ray-traced reflections are removed. Ray traced now runs screen space reflections. The
  light bakes (lamp, moon, sky, ambient grid) and their hashes are unchanged.

## 4.78.0 - Train 29: Sector Ops lighting: lamp falloff setting, shadow accuracy, character lamp shadows (fixes calm guards drawn without bodies); Guard AI guards never fire into armour (2026-10-23, PR #238; #232, #228)

### Guard AI S16 - guards hold fire at armour
- Guards no longer empty their magazines into bulletproof glass or doors: before each burst and each round a guard checks
  his line of fire, and when armour is first on it he holds fire, keeps tracking you and calling it in, then moves to a
  spot with a clear shot (or round by the corridors), or holds if he must keep his post. Ordinary glass is unchanged:
  guards still shoot through it.

### Character silhouette shadows (LR14)
- Character silhouette shadows from lamps, as in CT (LR14): from High up the 2-4 lamps nearest you (a steady set: a
  newcomer must be 25% nearer and a lamp holds its slot at least 0.5 s) cast the real shape of guards, your partner,
  bodies and held weapons - arms, legs, crouch and prone - on floors, walls and other characters. Their maps share one
  texture; every other lamp keeps the soft capsule shadows, as do Low and Medium. Settings > Graphics > Character
  shadows (Auto / On / Off) overrides the preset; each co-op player uses their own. Rendering only: the light meter and
  the guards read the light exactly as before.

### Lamp output review and the lamp falloff setting (walk 4.72)
- Lighting review of the walk 4.72 S1 / M5 notes: measured lamp reach on every map (Sector Ops S1 goods-in floor median
  0.186, real fittings 213-781 lux), proposal LR13 (photometric lamp falloff) for Michael in
  `docs/lighting-review/PROPOSAL.md`.
- New setting, Settings > Gameplay > Lamp falloff: Classic (the default, the game as before) or Realistic (test): lamps
  fall off with the inverse square like real fittings and reach further. The light meter, the guards and the picture
  switch together; it takes effect when a map loads. In co-op the host's choice applies to both players (co-op
  protocol 38). `?falloff=photo` forces Realistic for a page (dev).
- Shadow accuracy fixes ride Realistic (off in Classic): the meter reads the ambient fill as the picture does, shut doors
  past a lamp's door slots stop leaking light, guards' torches light the operator figures and weapons with the level's
  falloff, cut torch beams get the shadow maps first, and a torch behind a wall no longer lights a body for the guards.

## 4.77.0 - Train 28: Player batch 22 (strike pops, hang-down, dual reward, traverse fix, ladder knees); Guard AI walk fixes (lasers, bodies, urgency, spacing) (2026-10-23, PR #235; #207, #230)

### Co-op dual takedown counted for section-rating
- Co-op host: a dual takedown (two players' takedowns within 1.5 s) is now counted in `StealthRating.duals` and emitted as a
  `dualTakedown` event, as the input for section-rating's "synced takedowns reward more than shooting". It no longer adds a
  knockout of its own. The banner and the wire are unchanged.

### Guard AI: walk 4.72 fixes
- Lasers (Michael's walk G1): breaking a laser beam no longer tells the guards where you are. The guards hear of the
  beam, not of you: the two nearest calm guards within about 30 m go straight to the middle of the beam ("Sensor tripped.
  Moving to check.") and search the room it is in, then go back to their routes on edge. Alarm reinforcements the laser
  brings in search the beam's room too (they no longer head for wherever you climbed to); once anyone actually sees you
  they fight as before. A camera that raises the alarm works the same way, at the spot where it saw you. Host only.
- Dead bodies (G2): guards who find a dead body no longer give up after a minute. The finder and the guard who hears
  his shout search round the body for about three minutes, at twice as many spots and out to about 15 m (a plain search:
  one minute, 11 m), then stay on edge as before. Both guards a camera sends to a dead body now search it, not just the
  one who gets there first. Knocked-out guards are still searched for a minute.
- Urgency (G3): guards now hurry (a jog, more than twice their patrol pace) to a tripped laser or camera alarm, to a body
  a camera or a radio report named, to a guard who is not answering and to gunfire, then search at their usual pace once
  there. When a finder's "man down" report gets through, the nearest calm guard in range comes running to help search
  the body. Noises, thrown items, lights going out and breaker faults are still checked at a calm walk.
- Guards and doors (G4): guards no longer walk through each other. Two guards whose paths cross step round each other and
  never come closer than about two thirds of a metre, at a walk, a jog or a run (two meeting in a doorway or a narrow
  corridor brush past after a second instead of waiting); a guard held in a takedown or lying
  on the floor is not in anyone's way. Guards no longer walk through doors: a guard opens a closed door the way he
  always pushed it, waits for it to swing, then goes through; a locked door stays shut and a guard who reaches it stops
  there instead of walking through it. Host only.
- Weapon carry (G5): calm guards in a calm area now walk with their gun put away, the rifle slung across the back and
  the pistol on the thigh, hands empty. Anything that stirs them (suspicion, a search, caution, combat) makes them draw
  it, quickly (under a second), and they cannot fire until it is out; they put it away again after about 15 calm
  seconds. Guards on a high-security post, a response team or any guard once the alarm is raised stay at low ready, as
  do snipers and shield guards. Host only: in co-op the joining player still sees every guard at low ready.

### Hang-down: the hanging player's grab, neck snap and pistol
- (hang-down) The co-op hang-down's hanging player can act (CT 1.5 Drop Line): hold A lists GRAB CHARACTER on a guard
  by the head (he is lifted to the hands, then the held rules: RT tap / Z knocks out, RT hold kills - the neck snap -,
  Interrogate when he knows something, no let-go); RT on a guard in reach without the menu chokes (tap) or snaps the
  neck (hold); LT draws the pistol one-handed and aims upside down (never the rifle), the camera at the hanging head.
  A still uses the item in reach (the hack) with no guard there; by a guard it is a menu row. The partner pulling up or letting go while a guard is held knocks him
  out. Works for the joiner: the host keeps and lifts its guard, lets it hold the pistol and shoot from the hang. No
  protocol change (stays 31).

### Strike and hand-swap pops (spare job #5)
- (strike-pops, n4c polish 9) The elbow strike's trunk turns at its own pace (`STRIKE_BODY_RATE` 6.25 / s,
  `strikeBodyPhase`): no load-to-drive reversal at speed (shoulders 12.6 then -12.1 deg a frame -> 9.2, -0.4, -13.3),
  the drive over 2 frames (18.9 -> 13.3 deg max), the right wrist's largest frame 31.4 -> 27.0 cm, the pelvis'
  2.9 -> 2.0 cm. The hit still resolves at 83 ms, the hand across at 100 ms.
- (strike-pops, n4c polish 1) A hand swap reversed mid-swap no longer flips the gun's dip direction in one frame: the
  dip and the tuck read the swap's progress from the hand blend (`handSwapPh`); plain swaps unchanged.
- (strike-pops, n4d polish 1) A bay or section restart ends a strike or a kill's follow-through on the respawned player
  (the respawn's `StrikeController.reset` ends the takedown tail; the co-op client's `revive` resets the strike too).

### Climb-up hands (traverse-fix-2)
- Ledge climb-up: the palms stay on the lip (0.0 cm off, 1.1 cm drift) until the right foot is on the top (k 0.474, was
  0.52), then let go over `CLIMB_UP_HANDS` 0.475 - 0.643 while the trunk rises into the crouch; the wrists' worst
  velocity change at the release is 2.8 cm a frame (was 23.5 cm).
- Lip grips: the hand pivots over the edge continuously as the shoulder leaves its reach (was 15-degree steps with a
  0 -> 90 degree flip in one frame).
- Ladder top-out (the climb-up from a ladder): the right foot sets down under its hip as it steps onto the top (CLIMB_UP
  `fRX` -0.08 at 0.49, was 0.022 -> 0), so its knee no longer folds in onto the left: the knees stay 14.4 cm apart (were
  8.9 cm, e2e-clip asks > 9).

## 4.76.0 - Train 27: Guard AI response teams, section alert, breaker faults and lasting shot lamps; crouch transition pops (2026-10-23, PR #233; #225, #227, #220)

### Crouch pops
- Animation: crouching and standing no longer pop the stance width with the baked Body tune (idle / walk / jog / run
  feet apart 0.05): the Body rows blend from the standing row to the crouched row with the crouch itself instead of
  switching at half way. e2e-anim's two raised crouch limits are back to the shared 7.5 cm.

### Guard AI: response teams
- S13 response teams: each Sector Ops alarm stage now brings a response team led by a riot-shield guard (always
  helmeted), the rest armed guards, the same number as before. From stage 2 every guard of the section wears body
  armour at once, from stage 3 a helmet too, and guards that come in later (the next section, a woken guard, the next
  team) wear it as well; a restart drops it with the stage. No camera is added or changed. Once the team has searched
  your last known spot for a minute it sweeps the section point by point, the shield guard leading and the others
  close behind, looking round at each point with torches on in the dark, round and round; a sighting brings a fight,
  then the search, then the sweep again. Teams never leave or calm down until you leave the section or restart. On
  the other live maps the alarm brings a shield guard and two armed guards (no heavy) who sweep the same way.

Tests: the e2e-levels ladder chases wait on sim time (a sim-seconds budget from the design, a hang guard on wall clock) and the sim clock takes over the moment the match exists, so a loaded machine no longer fails "a runner climbs the rack ladder".

### Guard AI: missed check-ins and gunfire put the section on edge
- S14 section alert: when a radio check gets no answer from a guard you took out ("Unit three, report... Nothing."),
  the caller radios it in and, once the call gets through, the whole section is on edge for three minutes: guards walk
  slower, pause longer and spot you sooner, and two still go to look for him. Take the caller down while he is on the
  radio and nobody else hears. The same happens when one of a talking pair never turns up.
- An unsuppressed shot heard by a calm guard is radioed in ("Shots fired! Calling it in."): the section is on edge for
  two minutes (another loud shot keeps it going) and two guards come to the spot instead of one. Shots never raise the
  alarm by themselves. Suppressed shots are unchanged.
- Co-op: a client's suppressed shot is now heard as close as the host's (about 10 m, was 14 m).

### Guard AI: breakers and dark lamps
- S15 breakers and dark lamps: a room's lights switched off at the wall now read as a fault, not an attack. The nearest guard who
  saw it go (never two) says "Breaker's gone again.", walks over at his normal patrol pace, works the switch for 2 s and
  the lights come back on; nobody checks the area and he goes back to his route calm. Cut the same circuit again within
  a minute and the guards treat it as tampering: the full light check at the switch. A lamp shot out still draws the
  usual check by one or two guards and now stays dark for good. A lamp shot out or a circuit cut while nobody looked is
  no longer forgotten: the next calm guard who has the dark fixture in view within about 12 m reacts as a witness would
  (checks the shot lamp, or goes to reset the breaker), once for each time it goes dark. Turn the lights back on
  yourself before he gets there and he turns back. A course mains gate's circuit is left off (no guard shuts the gate on
  you by turning it back on). Host only; co-op partners see the lights come back through the
  existing light sync.

## 4.75.0 - Train 26: Guard render S4, Sector Ops campus sections 4-5 with weapons crate, cameras, armoured routes and posts, mocap strafe (2026-10-23, PR #224; #212, #217, #221)

### Guard anim tiers (guard-render S4)
- Guards solve their animation less often when it cannot be seen: a guard whose merged body was drawn in no local
  view last frame every 4th frame, a guard beyond 22 m of the camera (not scaled by the Detail setting) every 2nd,
  otherwise every frame; the skipped time is carried into the next solve and the weapon glide runs every frame.
  Guards are staggered so the cost spreads across frames. Full rate in a takedown or hold, a scripted emote, a climb,
  or within 4 m of any player. `?animtier=0` turns it off. Gameplay is unaffected: the guard head hit volume comes
  from the sim since S3a.

### Mocap strafe
- Mocap locomotion (switch on): aiming sideways, Wren plays captured strafe steps (CMU 69_59 / 69_56) at their own rhythm
  instead of the hand-keyed glide strafe, with no pops or foot slides on starts, stops, flips and snaps; switch off and
  guards unchanged. Clip format: a cycle can travel sideways (`travel` '+x' / '-x').

### Sector Ops: campus S4 / S5, weapons crate, bulletproof / thermal cameras
- Sector Ops campusOps: S4 data hall greybox (first dog, security desk, pair gate, keypads).
- Sector Ops campusOps: S5 the Old House greybox and the jetty extraction (two dogs, response team, pair gate, light well).
- Sector Ops: weapons crate engine and protocol 35 (crate item kind, crate event; per-player use on the host).
- Sector Ops campusOps / warehouseOps: a weapons crate at every section start (once per player, tops up to the loadout).
- Sector Ops: bulletproof cameras in S4 (shots ricochet) and bulletproof + thermal cameras in S5; early sections keep shootable cameras.
- Sector Ops co-op: the host sends only the live section's interactables (plus objective, connector doors, revives), keeping the item list under the 128 cap.
- Sector Ops: the S4 / S5 enforcers become officers / grunts (no enforcer in any section list).

### Sector Ops: glass, armoured routes, posts on guard slots, polish
- Sector Ops: armoured glass and armoured doors (rounds stop on them, no penetration; guards still see through armoured clear glass): S4 mantrap inner door and NOC window, S5 anteroom hall door and front door, each with a quiet way round (keypad, hang-down, side door, rappel).
- Sector Ops polish: a grenade blast and thrown gadgets stop at glass panes; the host's shot and lamp-shot checks and the partner's tracer stop at armoured glass; the HUD exposure reads guard sight (frosted glass hides); a weapons-crate refill is never dropped in a busy co-op moment; a round hits the nearest camera on its line; no door peek offered from a walkway above the door; S4's fuel tanks no longer step out over the compound wall; S5 guards no longer walk through the open sash into the light well.
- Sector Ops campusOps: glass panes (clear and frosted): light and clear-glass sight pass, bodies, props and grenades stop, rounds pass plain glass; nav treats a pane as a fence; takedowns and partner throws stop at glass.
- Sector Ops campusOps: the guard posts live on each guard slot (no separate post tables).

## 4.74.0 - Train 25: Guard AI squad tactics, Sector Ops tags, alarms and reinforcements, talking pairs, helmets and body armour; guard render GPU buffer share (2026-10-23, PR #222; #208, #213)

### Guard AI: stealth over shooting data
- Guard AI: gear and response tables for stealth over shooting (data only, not wired yet)

### Guard AI: helmets and body armour
- S12 helmets and body armour: later guards can wear a helmet, body armour or both. A helmet stops the first round to
  the head: it flies off and lands on the floor (it stays there), the guard reels for a moment and comes up shooting at
  where the shot came from; the next head shot kills. Body armour stops rounds to the chest: the guard only staggers
  (not on every round) and keeps fighting, so aim for the head or get behind him. The hit marker turns steel blue with
  a high ping for a stopped round instead of the kill marker. Takedowns, grabs, the strike, sleeping gas and
  explosions ignore gear: one takedown still drops anyone. Who wears gear comes from the map data (no section has it
  yet, so Marlow Yard and the early sections are unchanged). The helmet and armour are placeholder shapes for now.

### Guard AI
- S5b sector squads and jobs: Sector Ops guards now work in squads and check in on the radio about every 40 seconds.
  Take a guard out and hide nothing: at the next check his squad notices he is not answering, and two of them go to
  where he went down to look for him (a knocked-out guard they find is woken). A body they already found is not
  missed again. A desk guard (security desk, CCTV, operator) calls the checks for the whole section, so taking him out
  first means the lone posts go unchecked. A supervisor is the first to run for the alarm, a patrolling guard checks a
  light that went out before a guard on a fixed post, and guards in a secure area deal with anything inside it first.
  A guard dog sticks to its own handler; take the handler down and the dog stays by him, sniffing round and barking,
  which brings a guard over.
- S8 tactics: guards in a fight now work as a team instead of each doing his own thing. With two or more in it, the one
  who called you in takes cover further back and stays down until his radio call is through; one guard (the point)
  moves up from cover to cover ("Moving up!"), another covers him from cover with a view of where you were seen and
  fires at that spot while a squadmate moves ("Covering!"), and with three or more one goes round the side
  ("Flanking!"). Only one of the point and the flanker moves at a time, guards run only between covers, and nobody walks
  out into the open at you. Their shooting (bursts, spread, strafes, going for cover) uses a fixed seed per guard and
  fight, so the same fight plays the same way. A guard on a post never moves up or flanks (a high-security one never
  takes cover outside his area), and a guard from an aggressive slot moves up first. A lone guard and Hunter / Mission
  (parked) keep the old tactics.
- S6 alarm and reinforcements: guards can now raise the alarm by radio. Once a spotter's contact call gets through, he
  (or an officer close by) calls command: "Command, contact. Send backup." About 4 s later the alarm goes off, even with
  no alarm panel nearby. Take the spotter out before his first call gets through and there is no alarm at all; take out
  the guard calling command and the next guard still fighting picks up the radio 3 s later, so stopping it then means
  dropping everyone in the fight. Reinforcements that come in on an alarm are aggressive: they already know where you
  were last seen, run straight in from the section's entry points, spend less time in cover, push forward faster and
  never calm down until you are found. Hunter and Mission (parked) keep their old alarms.
- S10 talking pairs: two Sector Ops guards marked as a pair now meet on their rounds. When both reach their meeting
  spot they stop, turn to face each other and swap a couple of lines of small talk, shown over their heads, and some of
  it is worth hearing (a door that sticks, a dead camera, a code habit). Then they carry on with their rounds. Anything
  that catches their attention cuts the talk short. Take one of them out before they meet and the other notices he
  never turned up: a few seconds later he goes to look for him where he was last headed, with the nearest free guard
  behind him. The car-park pair in Saltmarsh Park is the first.
- Guard AI fix: when a guard's contact report gets through and he goes straight on to call command for backup, the
  rest of his section now hears the contact at once, staggered by distance, instead of only after the backup call.

### Guard render: shared guard GPU buffers (S7)
- Guards of the same look now share one copy of the merged body's static GPU vertex and index buffers (per LOD
  level) instead of uploading their own; colour, thermal heat, skeleton and culling box stay per guard
  (`src/player/smoothBody.ts`). A grunt's buffers go from about 1.34 MB to 0.28 MB a guard after the first of its
  look (24 guards of one look: about 32 MB -> 8 MB). No look change.

## 4.73.0 - Train 24: Guard render moon shadow caster lists and head hit volume (2026-10-23, PR #216; #209, #211)

### Guard render S3a: guard head hit volume from the sim
- Guards: the head hit volume now comes from the guard's simulation (stance, gait, cover lean / peek, emotes, held
  hostage), not from the rendered skeleton, so headshots and takedowns no longer depend on the animation's frame rate
  or the Detail setting. Within 8-11 cm of the rendered head (exceptions in docs/guard-render/STATE.md).

### Guard render S6: per-cascade moon shadow lists
- Moon / sun shadows: each shadow cascade now draws only the moving casters inside it (exact per-cascade lists under
  the baked moon), so fewer shadow draws with many guards. No look change. `?guardsun=0` turns it off.
- (dev) `World.addShadowCaster` takes an optional sun reach (casters drop out of the moon's cascades beyond it, with
  hysteresis); nothing passes one yet.

## 4.72.0 - Train 23: Guard render merged bodies and anim cuts; Sector Ops campus sections 2-3 (2026-10-23, PR #210; #205, #206)

### Guard animation cost cuts (S5)
- Guard animation does less work per frame with no change to any pose: the foot planner's per-frame side loops no
  longer allocate arrays or iterators; the emote layer (`applyFk`) no longer builds a map and `Object.entries` list each
  frame; the joint limiter keeps its rate and previous rotation on the joint node instead of in two Map lookups; and
  guard rigs skip the finger and goggle frames, whose outputs only the operator figures read.
- New tests: a golden guard pose test with a fixture captured on the untouched code (`tests/guardPoseGolden.test.ts`)
  and an opt-in NullEngine micro-benchmark of guard animate (`tests/guardAnimBench.test.ts`). The measured gains are
  inside machine noise (about 0.5-2 us a guard a frame on NullEngine); the gain is less garbage.

### Guard render: merged skinned guard body (S1)
- Guards, carried bodies and fresh bodies now draw as one rigidly skinned smooth mesh each (`src/player/smoothBody*.ts`)
  instead of about 20 instanced parts: one bone per joint, a fixed root-local bounding box, one scene observer for
  every body, hi / lo LOD swapped as one at the body's sphere centre. `?guardmerge=0` gives the old instanced parts
  for comparison. Colours, patterns, hit flash, thermal / night vision tint and ragdolls behave as before.
- Measured on the laptop GPU (Epic, 1920x1080, `scripts/guard-cap.mjs`, 24 guards in view, merge off -> on, medians):
  Sector Ops warehouse frame 9.7 -> 7.1 ms, render() CPU 7.6 -> 4.9 ms, GPU 6.7 -> 5.5 ms, active meshes 1429 -> 493;
  Marlow Yard (ctcourse) frame 9.2 -> 6.3 ms, render() CPU 7.3 -> 4.4 ms, GPU 6.1 -> 4.8 ms. Runs:
  `docs/guard-render/run-s1`, `run-s1-off`, `run-s0-base`.
- Accepted look change: heads, hands, forearms and feet now cast moon, lamp and flashlight shadows (they were under
  the 0.3 m caster-size cut as separate parts; the merged body is over it).

### Unreleased - sector-redesign
- Sector Ops campusOps: S2 HQ atrium and offices greybox.
- Sector Ops team doors: pair bolts (open only while the partner pushes the door from the other side) and pair gates (two key switches turned within 1 s by both players), host-authoritative, reset on a restart; guards route round them while locked (engine only, no map uses them yet).
- Sector Ops keypads: a keypad door stays locked until the team finds its code (overheard, a handover board, or an objective such as a hack); a section restart forgets the codes found in it.
- Sector Ops engine: breaker and timed isolator boards (`MapLayout.boards`): cut light circuits until switched back or for a timed window (default 20 s), a guard comes to look, restart puts them back, co-op lamps follow (no map uses them yet).
- Sector Ops alarm stages: a section can now force lights to full, lock doors (never the only way through) and send its reinforcements along a response route at a stage; a restart undoes them (data only, no map uses it yet).
- Sector Ops campusOps: S3 lab block greybox (16 guards, the first lasers las-gown and las-store with their power panels, cam-view and cam-dock, the prototype grab, CR3 chamber roof).
- Sector Ops engine: security desks (`security.desks`): with the operator down or away, the console loops its cameras (they sweep but report nothing, default 30 s) or switches them off until a restart; a restart or section change puts them back, the co-op client follows (no map uses them yet).
- Ammo pickups removed from inside sections (a between-section weapons crate refill follows; Michael, 2026-10-23).

## 4.71.0 - Train 22: Guard AI awareness, posts and camera body calls; hostage gait; changelog dedupe (2026-10-23, PR #199; #198, #194, #196)

### Changelog build skips entries already released
- Merge tools: the CHANGELOG assembly (`scripts/changelog-assemble.mjs`, run by `scripts/merge-train.mjs`) no longer writes
  a `changes/` entry again when its text (whitespace-normalised) is already an entry in CHANGELOG.md. Each skipped entry is
  printed. A fragment with no entries left adds no block; its file is still deleted. Tests: `tests/changelogAssemble.test.ts`.

### Guard AI
- S4 bodies and caution: a guard who finds a dead body, or sees a guard killed, shouts "Man down!" (guards close enough
  to hear know too), searches the spot and radios it in ("Man down. Stay sharp."). When the report gets through, his
  whole section turns cautious: they look harder, pause less on their rounds, walk slower and take torches in the dark.
  That caution never wears off with time: it only ends when every guard who knows about the death has been taken out
  (killed, or knocked out and not woken again). Take the finder out before his report gets through and only he and the
  guards who heard his shout knew. A knocked-out guard who is found (or seen going down) is woken: the two search the
  area for a minute, stay cautious for three more, then go back to normal; nobody else turns cautious. A woken guard is
  the same guard again: back on his own route or post, with his squad. Hunter and Mission (parked) keep the old rules.
- S5 posts: guards can now hold a post. A guard guarding something valuable or a security door never leaves the area
  round his post: he is never sent to check a noise or a light, never joins a search or runs to an alarm panel outside
  it, and in a fight he holds his ground there instead of chasing you. He can still be distracted: a noise, a thrown
  item or a light going out near him draws him to the edge of his area, where he looks toward it for about 5 seconds
  before walking back and facing his post again. Guards on an ordinary post are sent to check things like anyone else.
  Maps can also mark noisy machinery that makes guards near it hear less. No map uses posts yet; the map teams add them.
- S7 cameras see bodies: a security camera that sees a knocked-out or dead guard (in the dark too: cameras see in
  infrared) calls it in on the radio, for example "Camera 2 has a man down, Delivery Yard. Nearest unit, check on him."
  The nearest calm guard within about 25 m walks straight over (two for a dead guard) and, for a knocked-out guard,
  wakes him; then they search the area. Looped, switched-off, jammed or shot-out cameras see nothing, so hide bodies out
  of a camera's view or take the camera down first. Dogs never answer the call. Hunter and Mission (parked) are
  unchanged.

### Hostage gait below 60 fps
- Co-op (host): a joiner's hostage no longer flickers his gait below 60 fps. The host placed him from the joiner's
  drawn body, which moves once per frame, while `holdAt` runs per fixed step (one step saw the whole move, the next
  none). The point now goes through `src/net/holdFeed.ts` (velocity from distinct drawn poses, predicted to each step,
  eased): his speed holds within 1% at 30 / 45 / 60 fps (was 14-15% CV with real frame jitter, and 21% slow at 30 fps);
  a stopped holder stops him within 0.1 s; a jump over 1 m snaps with no speed spike (was 42-64 m/s).

## 4.70.0 - Train 21: Guard AI radio net, ledge-end hands, partner seed walk (2026-10-23, PR #197; #189, #190, #191)

### Guard AI
- S3 radio: guards no longer alert everyone within 22 m at once. A guard who spots you shouts "Contact!", and only
  guards close enough to hear it (about 6 m in the open, less through a wall or by loud machinery) join straight away.
  He then takes 2.5 s to call it in on the radio; when the call gets through, the rest of his section hears it one at a
  time, nearest first, over up to 4.5 s, and other sections stay calm. Take the spotter out (or grab or flash him)
  before the call gets through and nobody else is told. The same goes for a guard who is shot or hears gunfire close by.
  Light checks, "nothing here" and the missing-guard call are radio calls too, answered with one "Copy.". A guard sent to
  a noise that turns out to be nothing goes back to normal instead of staying on edge for 45 s (gunfire still keeps
  them on edge). Hunter and Mission (parked) keep the old radio.

### Partner rig first seen walking
- Co-op: a partner first seen already walking slowly (under about 0.3 m/s at 60 Hz, 1.2 m/s at 240 Hz) no longer plays
  a start one-shot with the mocap switch on. `RemoteAvatar` seeds its eased speed and stride heading from the first
  received state, and again after a teleport (bay start, checkpoint reset, respawn), instead of easing up from 0.

### Traversal fixes (spare job 8)
- Ledge shimmy: a hand never re-grips on or through the other hand at a lip's end (12 cm minimum gap, `LEDGE_HAND_GAP`);
  it stays put when the leading hand is clamped at the end.
- Rifle draw from the diagonal sling: the grip waypoint passes further out from the hip (`TRAVEL_VIA.sling`
  [0.4, -0.22, 0.04]), so the gun clears the trunk (e2e-clip "sling draw + glide" trunk -1.5 -> +0.9 cm, legs 2.8 cm).

## 4.69.0 - Train 20: Guard AI incident board, partner throw KO, mocap on by default (2026-10-23, PR #192; #185, #186, #188)

### Guard AI
- S2 incident board: one event, one response. A noise, distant gunfire or a lure sends one guard (the nearest by walking
  distance; an officer sends someone else), says "Checking it out." on the radio, and the others who heard it answer
  "Copy." and look a moment; more noise in the same spot never pulls a second guard. A light shot out or switched off is
  noticed only by guards who can see it go (in their view with a clear line, or the room they stand in goes dark): one
  checks it, two if a second witness is close. They look at the light, sweep the area round it, say "Nothing here.
  Back to it." and return to their routes calm. An investigator taken out (or held) who stays silent for 25 s brings
  two more as a pair. Investigating and searching guards now walk slower than their patrol, not faster. Hunter and
  Mission (parked) keep the old rules.
  Fix: a patrol point with a wait of 0 is now walked straight through; before, the guard stopped there for good.

### Mocap locomotion on by default
- Settings > Gameplay > Mocap locomotion is now ON by default (Michael: "On by default"); a save from before keeps the
  new default once, after that the player's choice stays. Off uses the hand-keyed animations.
- Mocap locomotion (switch on): the clip's planted feet hold their contact through turns and straights (contact slide
  0.01 cm, twist at lift 14.3 deg).
- Mocap locomotion: the switch now drives Wren only (the player and the co-op partner); guards keep their hand-keyed
  walk and the planner's feet with it on (they took the mocap walk and its clip feet before). The menu and Anim Studio
  Wren keep the hand-keyed set too.
- Tests: e2e-anim reads the mocap switch (`window.__mocapOn`, `E2E_MOCAP=0/1`); with mocap on, the old shape / style
  bars (knee-out, knee separation, track width, elbows, pelvis / shoulder rotation, sway, head yaw / pitch) print as
  "M1 as captured" notes; slides, crossings, pops and timings still fail. OFF asserts unchanged.

### Partner throw onto a guard
- Co-op partner throw onto a guard (throw-ko, spare job 3; CT: the thrown partner landing on a guard knocks him out):
  the host replays each throw's arc and the guard the thrown player comes down on (head / shoulders, descending) is
  knocked out through the existing knockout path; the joiner sees it through the guard sync. No wire change.

## 4.68.0 - Train 19: Sector Ops part 1: armed guards, reinforcements, dogs, co-op light sync; guard-cap report (2026-10-23, PR #187; #180, #184)

### Guard cap measure
- Tools: `scripts/guard-cap.mjs` measures what each awake guard costs per frame (sim split: AI brain, perception, rays, nav, physics; render: frame, GPU, draws, shadow passes) at 12 / 16 / 24 guards on Sector Ops and Marlow Yard, for the guard cap decision (`docs/guard-cap/REPORT.md`).

### Unreleased - sector-fixes-r2
- Sector Ops nav: a bolted team door shuts its doorway on the guards' nav grid (a runtime closure, `NavGrid.addClosure`
  / `setClosed`), so guards route round it instead of stalling at the locked door; unbolting opens it, a restart's
  re-bolt shuts it again, and guards mid-route and the flow field replan at once.
- Sector Ops team doors: "Unbolt" now reaches only across the door itself (half its width + 0.3 m, up to 1.2 m out),
  so the S1 mess back door can no longer be unbolted through the wall from the corridor; host and client prompts agree.

### Unreleased - sector-redesign
- Sector Ops guards are all armed: the Warehouse Ops runners are rifle guards, alarm reinforcements are rifle guards (no
  heavies), and the section data check rejects melee-only guards and heavies.
- Sector Ops dog rules: a section allows dogs only by its `dogs` count, and every dog names its handler; the palm strike
  never knocks out a dog (every mode).
- Sector Ops restart: a section restart also puts the lights (switched off, shot out, jammed) and the doors back as they
  were when the section began.
- Camera limit: 12 cameras live per Sector section (was 12 per map), at most 16 per map.
- Sector Ops co-op: the host's lights (switched circuits, shot lamps; jams as before) now match on the client's screen, light meter and guard reads; a client can shoot lamps out through the host (protocol 31, slice L).
- Sector Ops: new map campusOps (Saltmarsh Park), S1 greybox playable; not yet listed.

## 4.67.0 - Train 18: Mocap batch 1 (pops, crouch walk, sprint; default off), shorter camera range on all maps (2026-10-23, PR #183; #177, #182)

### Unreleased - camera-range
- Cameras have less range (Michael 2026-10-23: "cameras need to have less range (they currently pick the player up
  well outside of the intended area)"), on every map, one engine change: a camera's fill rate now falls off over its
  own range (1 - (d / range)^2) instead of the guard's 25 m, so it is 0 at the zone's edge and nobody is picked up at
  full speed at the range cut; an aimed camera with no range of its own watches the floor patch centred on its aim
  (range 2 x aim); the default range is 12 m (was 18), 14 m at most.
- Marlow Yard station 3's camera reaches 13 m (was 18): it covers the hallway but no longer the entry lobby (before it
  picked a player up 2.6 m into the lobby); fill times in the hallway hold (still standing at bay x 6: 3.0 s, was 2.75).
- Sector Ops cameras keep their zones; their far 5-15 % no longer picks anyone up (reach 0.5-2 m shorter by stance).
  The Security Lab cameras reach their half of the room only (11.5 m, was 17.9).
- Measured per camera before and after: docs/camera-range/MEASURE.md (`tests/cameraReach.test.ts`). No wire change.

### Mocap locomotion: residual pops, review fixes, new clips
- Mocap locomotion (switch on): a stop no longer pops the swinging foot: the clip's step in the air eases its pitch, height
  and place onto the planner's (ankle-toe 40 -> 12-13.5 deg a frame, under master's own stop), and a landing mid-ease no
  longer leaves the toe up.
- Mocap locomotion (switch on): fast walking turns no longer sink the hips when the turn clip fades out: the trailing foot
  steps off as the other lands; a leg the joint-speed limit holds back no longer flicks the foot round with it (also the
  jog / run turn foot pops).
- Mocap locomotion (switch on): fast jog and run turns no longer snap the swinging foot across the planted one: a swing
  lifted at a flight gait follows the body round (run 4.0 m/s x 4 rad/s ankle-toe 81 -> 14-22 deg, under the switch-off
  set's 57-59).
- Mocap locomotion (switch on): a start after a short stand no longer pops: the leftover idle step lands first, a late
  clip lift goes to the planner and a foot left behind steps off (worst bone step 37 -> 22 deg, no pelvis sink).
- Mocap locomotion (switch on): a spin on the spot that reverses, slows or walks off plays on smoothly; the clip's short
  jog / run stance eases in and out at every clip-feet edge (switch on mid-jog, a crouch or a draw); the switch turned
  off mid-stop no longer leaves a foot toe up; the switch turned on mid-walk, or a partner first seen walking, plays no
  start.
- Mocap locomotion (switch on): the crouched sneak plays the CMU crouch walk (136_09) as Wren's body over the usual
  steps; the faster crouch walk / run stay hand-keyed and are blended into. Crouched spins no longer hold the keyed pose.
- Mocap locomotion (switch on): crouching, standing up or drawing while walking no longer snaps a foot as the clip's feet
  hand the steps to the planner (ankle-toe 57 -> 17 deg a frame at worst, switch off 16.5).
- Mocap locomotion (switch on): a CMU sprint cycle (127_07) fades in over the run between 4.2 and 5.0 m/s.
- Mocap locomotion (switch on): a sudden stop from a jog, run or sprint eases the body down to the walk instead of
  dropping the pelvis in a frame (5 m/s one-frame stop 10.5 -> 2.1 cm, switch off 8.9).
- Mocap locomotion (switch on): speeding up or slowing down through the walk / run bands, also while turning, no longer
  pins a foot for a walk-length stance (the pelvis dropped up to 14 cm in a frame); a start after a short stand no longer
  skims a foot along unplanted.
- Mocap locomotion (switch on): fast flick turns while walking no longer lurch the hips or snap the feet as the turn
  ends; turning the switch on or off mid-move cross-fades the pose over 0.25 s instead of snapping it.
- Mocap locomotion (switch on): spot turns, sprint and crouched sneak flicks keep the planted foot on its spot;
  crouching mid-jog no longer snaps the swing leg; a stop's hold fades out softly and no longer jolts the hips when
  moving again.
- Mocap locomotion (switch on): a run start after a short stand no longer pops the first step's foot forward (knee
  47 deg, hips 9 cm down at 4 m/s): the start's leftover step restarts its swing from where it is.

## 4.66.0 - Train 17: Guards hear by range: one investigator per noise (guard-ai S1) (2026-10-23, PR #181; #179)
- S1 hearing: not every guard hears every noise any more. A wall cuts a noise's reach to 0.45 and noisy machinery near a
  guard masks it (map data, none placed yet). Of the guards a noise reaches, only the nearest one close enough walks over
  to check; the others turn to look and stay at their posts. Loud gunfire puts guards in combat only close in (about
  7 m in the open); farther, or behind walls, one guard is sent to look and the rest turn, and a shot behind walls far
  off reaches nobody. Hunter and Mission (parked) keep the old everyone-hears rule.

## 4.65.0 - Train 16: Guards see poorly above, deploy reload waits for the menu, load-robust e2e, decisions G276-G281 (2026-10-23, PR #178; #168, #169, #170, #171, #172, #173, #174, #175, #176)

### Decisions fold G276-G281
- docs/DECISIONS.md: roadmap decisions of 2026-10-23 ~00:15 to ~01:05 folded in as G276-G281 (CMU takes, Marlow Yard
  final M4-M6, Sector Ops team doors, pacing).
- docs/design-bible.md: dated notes at Sector Ops (team doors), the external-art line (CMU takes) and Marlow Yard
  pointing at G276-G280; CLAUDE.md "Current goal" notes the detail-art lift for marlow-final (G278).

### Unreleased - g44-above
- Guards see poorly above them (G44): a player well above a guard's eye line (hanging, on a high ledge) is spotted far
  slower or not at all; level and close targets are unchanged, and a guard in combat still tracks you overhead.

### Load audit
- Tests: load-only e2e failures fixed without weaker limits (load audit on 4.61.0 at E2E_JOBS=5, plus a static scan):
  every page of an e2e context (and smoke's own) gets the 120 s navigation default; e2e-desktop's crash step waits for
  the crash and closes the dead page before the crash-log page (it hung under load), with 60 s menu waits; e2e-move's
  sideways pace is measured over a game-time window (pace and end speed both over 2.15 m/s); e2e-coop's client grab latches on the client's match clock (4.5 s) with a
  per-frame host pin (the teleport window granted once per attempt, a generation token and try/finally end each
  attempt's pin); e2e-coop's client takedown lets the host settle on its match clock before a retry (a late knock-out
  no longer overwrites the start); e2e-mouse waits for frame-applied yaw, weapon swap and pace; e2e-ctcourse times its jam / lamp
  windows on the host clock (`waitHostSim`, which returns the elapsed game time, asserted at every call), station 3's
  camera freeze latched over 800 ms of each page's own clock with the host's jam still on at the client's last read,
  the lamp-off window latching both pages, and up to 3 re-jams when too little jam is left.

### Load fixes: e2e-coop strike and offline
- Tests: e2e-coop's latent load failures fixed without weaker limits: the client elbow strike pins the host's guard on
  every host sim step (a fixedUpdate wrapper with a generation token, always ended; the guard's brain restored in a
  finally), strikes in the client frame its pick is that guard within 6 s of its match clock (a 90 s wall-cap timer
  resolves the wait if the client's rAF stalls, and the assert then fails), and waits for the knock-out on the host's
  clock; the denied strike is sent only once the client can strike and its start is asserted; the offline check waits
  for the service worker to control the page (120 s polled every 100 ms, a timeout fails) and gives its screens 30 s.

### Load fixes: host-step hooks
- Tests: co-op waits that missed short host states under load now act on the host's own fixed sim step
  (e2e-net-lib `onHostStep` / `hostStepResult` / `offHostStep`: a hook on the loop's `fixedUpdate`, which the pump's
  headless steps also run; a hook nobody will read - the client's press failed, or `hostStepResult` timed out - is
  dropped so it never fires late). e2e-ctcourse snapshots station 3's camera reboot on the step its jam goes 1 -> 2
  (after load-audit's last freeze-window try; per step it reads only the camera's jam phase); station 6's synced hack
  and station 5's roof plates have the client press its half and the host press its own on the step that first sees
  it (station 5 needs the client's stamp, not a host one); station 8's 2.5 s pause runs on the host clock
  (`waitHostSim`, host time logged, its elapsed time asserted >= 2.5 s like load-audit's windows); station 5 waits for
  the client upright on the roof before the same check. e2e-course's pair gate: the host presses its half on the step
  that first sees the client's stamp. No other assert, limit or window changed.

### Load fixes (UI suites)
- Tests: latent load-only e2e waits fixed without weaker limits: e2e-mouse's RMB draw and X holster polls run on the
  match clock (4 s / 3 s, never shorter than the old 8 s / 5 s wall, 60 s real-time cap); e2e-feedback holds the
  photo-mode fly keys for 0.7 s of frame time (summed clamped frame dt, 30 s real-time cap, also a timer if frames stop); e2e-lightbake waits up to
  120 s for the lamp plugin on every PBR material and up to 60 s for the stack rebuilt at Ray traced (screen space
  fallback) instead of a fixed 1.5 s; e2e-pad's remap captures press both buttons in one evaluate (new `pressPair` in
  e2e-lib, one input poll each) and assert on the state recorded the frame after the first, so the wall-clock 5 s
  capture timeout and countdown no longer race the test's round trips (a missed input poll is named in the assert); e2e-menus' `menuClock=fast` shot change and
  fade waits count 8 s / 10 s of frame time (120 s real-time cap, also a timer if frames stop), and the touch pause / resume waits run at least 30
  checks 2 frames apart and 3 s (60 s real-time cap).

### Load fixes (latent UI waits)
- Tests: more load-only e2e waits made correct under CPU load, no assertion, limit or window weakened:
  e2e-desktop's Hor+ / HUD inset match load waits 120 s and the "no match kept in memory" count polls every 2 rendered
  frames for up to 60 s.
- Tests: e2e-offline's offline match and Infiltration loads and both "Wren from the cache (LOD2)" waits take up to
  120 s.
- Tests: e2e-traverse's keyboard ledge presses (Space grabs, C lets go) wait up to 0.7 s of game time per press (30 s
  real-time cap), not 0.7 s of host time.
- Tests: e2e-weapons-carry's loadout and backpack match loads take up to 120 s, and the detailed-avatar-with-backpack
  step polls the stored settings and profile records (up to 30 s, asserted) before its reload instead of a fixed 600 ms.
- e2e-desktop:4's frame governor check on a hardware GPU: up to 20 s of real frames, then missed frames fed through the quality manager's frame path (a fast GPU rarely misses; the check is now "missed frames step the detail down"); software GL keeps the real 300 s wait.

### Unreleased - sw-reload
- A new deploy no longer reloads the game mid-match or in a co-op lobby: it waits and restarts at the title / main
  menu ("Update ready - restarts at the menu"), or on the next launch.

### Test chores 13
- Tests: `run-e2e` prints a timed-out suite's `KILLED` line in streamed mode (`--serial` / `--jobs=1`) too, as the
  parallel mode does (before, a streamed suite killed for its timeout ended silently).
- Tests: e2e-netmove gets a role-swapped team-move pass: the host braces and the client leads the leg-up onto the
  4.2 m lip; the same checks as the host-led leg-up from the other page, the host's brace on the client's copy and the
  client's hang on the host's copy both within 10 cm. Host waits are Node-side polls of the host clock.

## 4.64.0 - Train 15: Mocap locomotion trial behind a switch (default off) (2026-10-23, PR #167; #159)
- Mocap locomotion switch (Settings > Gameplay > "Mocap locomotion", also in the animation tuner under More > Panel;
  `?mocap=1` / `?mocap=0` overrides it for a page; default off, saved with the settings): Wren's holstered walk / jog /
  run, and the turn / start / stop clips once filled, play from the mocap clip set (`src/anim/clips/mocap/`, the keyed
  clip format) instead of the hand-keyed one; a mocap clip with foot data places her steps itself ("clip feet": the foot
  planner only grounds and pins them). Off is the game exactly as before (the anim-skeleton identity fixtures pass). This
  machine only: the co-op partner drawn here follows it, nothing goes on the wire. The procedural layers stay on, with a
  per-layer scale for the mocap set (`MOCAP_LAYERS`). docs/mocap-trial/CLIP-FORMAT.md.
- Mocap locomotion now shows the real CMU captures (mocap.cs.cmu.edu, converted onto Wren; docs/mocap-trial/SOURCES.md):
  the holstered walk / jog / run from one performer (subject 16: takes 16_15, 16_36, 16_46) placing her own steps, the
  90 degree turns while walking (16_18 / 16_19), the start from standing (16_31) and the stop (16_34), all at a walking
  pace, and a 90 degree turn on the spot (subject 69, 69_13). Planted feet stay locked, the stride is the game's at every
  speed, the head looks ahead (the performers' look at the floor is taken out), and the procedural layers that would
  double the capture (the Body tune's arm swing gain and elbow-out, the trunk twist and lean sliders, the hips following
  the feet, the Weight plant drop, the stop settle) are off on it. Fast turns, starts and stops hand the steps to the foot
  planner as before. Weapons, crouch, walls and guards stay hand-keyed; jog / run turns, the jog stop and the run start
  are converted but not in the game yet.
- Mocap locomotion: no more pelvis dips or foot pops where a turn hands Wren's steps between the capture and the foot
  planner (walking turns at 1-4 rad/s), no toe snap on the first step after starting from standing, and the start's
  arms swing at half strength (they ran out of step with the legs). Switch off unchanged.
- Mocap locomotion on master 4.61.0: the new body motion layer (trunk twist, sway, head follow / nod, walk arm gain) is
  off on the captured gait, which already moves that way; its arm speed cap and pelvis rate limit stay as pop guards.
  Switch off identical to master.

## 4.63.1 - Train 14: Load-proof heap check, faster e2e start order (2026-10-23, PR #166; #163, #165)

### E2E start order
- Tests: `scripts/e2e-times.json` refreshed from a full laptop GPU run (adds e2e-sectorops and its parts, e2e-studio,
  e2e-tuner-phone; e2e-anim 5 s -> 37 s), and a suite with no recorded time now sorts at the median known time instead
  of 0, so a new or renamed suite no longer starts last at E2E_JOBS=5 and sets the tail.

### lightField allocation check holds under load
- Tests only: the shared allocation helper (`tests/helpers/allocPerCall.ts`) tiers code up synchronously
  (`--no-concurrent-recompilation`, `--no-concurrent-osr`), so every heap check reads the optimized code on any machine
  instead of whatever tier a starved background compiler had reached. lightField "allocation-free under a loop" now
  reads levelAt 32.0, bodyLevel 64.8 (was 100-127 B in Sparkplug against its 128 B limit), control 272.0 B every run;
  same asserts and limits. `ALLOC_TRACE=1` logs each round with its optimization tier.

## 4.63.0 - Train 13: Sector Ops co-op routes and team doors, fence rattle test, decisions G270-G275 (2026-10-23, PR #164; #144, #161, #162)

### e2e-ct: the fence rattle check latches its noise samples
- Tests: e2e-ct's fence rattle checks no longer read the noise once after the climb. The noise model re-samples
  every 0.25 s of sim time and holds the value in between; with the sampler's phase set by the real-time steps before
  the suite takes the loop over, the one read could land on a sample taken in the step after the stick was released
  (0.00 m in train 11 at `E2E_JOBS=3`). A new `runNoise` steps the window one 60 Hz step at a time and latches every
  sample taken inside it: gear 4's loudest sample must reach 3.9 m and gear 3's loudest must stay under 0.5 m, each
  with at least one (gear 3: two) samples. The limits and the climb-rise check are unchanged.

### Decisions fold G270-G275
- docs/DECISIONS.md: roadmap decisions of 2026-10-22 ~22:32 to 2026-10-23 ~00:10 folded in as G270-G275.
- docs/design-bible.md: dated notes at D2 (pelvis bob), 5.12 (captured data) and Marlow Yard pointing at G271-G273.

### sector-fixes R: co-op-only routes and team doors (track A)
- Sector Ops Warehouse: co-op-only routes, each a 4.4 m lip (out of solo reach, inside the leg-up) with the partner
  following by relay or the two-person rope. Section 1: the AHU service door high in the yard facade onto the plant
  deck, and the goods-in hoist monorail over the checker (the two east-lane loads by it are now 2.0 m stacks you cannot
  climb alone). Section 2: rack row R3 rebuilt as high-bay (4.4 m tops, its rolling ladder gone), R3S reached from the
  east gangway: a vantage over the lane, A3 and the picker; (Michael, "Add another") the old dispatch landing on the x -4
  wall over the east gangway, a second leg-up route (a vantage and a hang-drop onto the picker). Section 3: the sprinkler zone-valve platform (a way onto the
  5.0 m main) and the crane drive platform over the CNC supervisor (hang-drop).
- Team doors: one door per section bolted from one side (section 1 the mess back door, section 2 the VNA aisle escape
  gate, section 3 the plant room's lobby door). Only a player on the far side gets "Unbolt"; it opens for both; a
  checkpoint restart bolts it again. Host-authoritative, no wire change (protocol stays 28).
- A player downed on a co-op-only top cannot be revived there; the checkpoint respawn takes over (PLAN A3).
- (e2e fix) Section 3's two platforms sit under raised roof hoods, so you can climb up onto them (the roof left too little
  room). Section 1's single east-lane pallet is now an empty pallet: a running jump or a mantle off the old one got a
  player alone onto the stacks by the monorail. `run-e2e.mjs`: a named suite with parts (`e2e-sectorops`) now runs as its
  parts.

## 4.62.0 - Train 12: Co-op holders, mantle drop roll and brace, holds that breathe, co-op offer test fix (2026-10-23, PR #160; #119, #158)

### anim-natural N4b (track A: co-op holders, traversal, holds)
- Co-op team moves: the partner who helps is no longer a statue. Leg-up: cupped hands take her foot, he dips, then drives
  up with legs and arms while she pushes off his hands. Throw: he loads and throws with his whole body. Hang-down: his
  hands hold her ankles, leaning back or bending over the edge with the depth. Rope: both hands on the rope, leaning
  back against her weight. Animation only (no timing, position or protocol change).
- Mantle: both hands plant on the top edge and she presses over them. Drops: a step off with the arms up for balance, the
  legs ahead in the air, and a landing that bends more for a longer drop. Roll: a grounded shoulder roll instead of an
  airborne somersault (slower hands, the slung rifle swings far less). Split brace: hands braced on the walls instead of
  arms straight out.
- Holding a guard still: she braces, breathes and shifts her weight against him (the trunk no longer stays at 0 deg).
  Animation tuner (Holds and carries): brace, brace roll and breath sliders; they bake. Anim Studio: the hold walks
  travel with planted feet instead of sliding on the spot.
- (PR fix) Letting go of a ladder, a drainpipe or a hang, the legs stay under her in the fall (the legs-ahead air pose is
  for walking off a ledge or a jump; off a ladder it went into the wall). The split brace's breath runs from the moment
  she braces, so the partner's copy breathes in step with her.
- (PR fix 2) Stepping onto a ladder from its top no longer sinks her legs 30 cm through the rim (the mantle's hand plant
  is off for that backward climb-on). A landing or forward roll needs 0.9 m clear past its end (was 0.4): the shoulder
  roll's dive put her head 30 cm into the wall after the vent drop; with less room she lands without the roll.
- (Train 8 fix) A co-op holder's braced pose (boost, throw, hang-down, rope) no longer counts as a hostage hold: the hold
  Body rows and the hold camera stay off it, as before the team pose. In the Anim Studio, a paused scrub of a team pair
  shows that phase's team pose at once (it kept the weight it was paused at).

### Coop offer under load
- Tests: e2e-coop's client takedown holds under load. The host keeps the picked guard pinned (calm, still, the client
  unspotted) on every frame until the takedown starts, and the client starts it in the frame its offer comes up
  within 6 s of its own match clock (was 40 polls 150 ms apart in real time, which a loaded page spent in a fraction
  of that game time). The assert is unchanged.

## 4.61.0 - Train 8: Wren's body moves with the gait, feet in turns, Sector Ops strip-light fog fix (2026-10-22, PR #157; #138, #156)

### Wren's feet in turns (anim-natural N1)
- Wren's feet in turns: a turn step lifts the planted foot before the legs wind up (the body's yaw rate and the
  foot's twist decide it), the planted foot pivots on the ball with the heel coming up first, and no foot sticks to the
  floor and snaps round late. Jog and run turns first, then walk turns, turns on the spot, starts, stops, strafes and
  crouch turns. A foot left behind in a fast turn now lifts early instead of launching at 6 m/s (rule A2). Guards share
  the turn rules. New Stepping sliders for the rule, identity by default, and they bake.
- Tests: e2e-anim's foot locking, crab slide and turn block read the contact point (heel / ball while down); the turn
  block asserts plant time <= 0.25 s and the first swing frames <= 5 m/s; e2e-move's stop check reads the contact
  point (2 cm bar kept).

### Wren's whole body moves with the gait (anim-natural N2)
- Wren's walk, jog, run, sneak, crouch walk, crouch run and the aimed glides now move the whole body (Michael: "All
  movements must move naturally with twisting/swaying/balancing"): the hips and shoulders turn against each other with
  each step, the hips sway over the standing foot, and the head lets a little of the chest's turn through and nods with
  the steps. Aiming, the hips swing under a steady chest and the head stays on the aim.
- Added on top of the keyed clips and Michael's key edits (never rescaling them), timed onto the gait phase: no pops at
  speed or stance changes, the same at every frame rate. Measured headless (pelvis / shoulders deg peak to peak): walk
  3 / 3 -> 8 / 8, jog 5 / 7 -> 12 / 16, sneak 2 / 2.4 -> 5 / 5.4, crouch walk 4 / 4.8 -> 8 / 8.8; walk hip sway 1.7 ->
  4.4 cm; aimed side-step counter-rotation -0.47 -> -0.99.
- The run no longer pops at each foot strike. The trunk keys (A1) no longer snap the hips ~21 deg twice a stride, and
  the arms no longer jump back to front in one frame (wrist 23.5 -> 6.5 cm per clip frame, peak 17.6 -> 5.5 m/s): Michael's
  2026-10-22 run tune moved the key timings but kept arm values keyed for the old spacing. Only the arm keys were
  retimed: his swing range and elbow bend are kept; the arms now ease out of each extreme and pass mid-swing about 3/48
  of a cycle later than his tune.
- Every Wren rig (the player, the co-op partner, the studio puppets walking a loop); guards are unchanged bit for bit.
  The amounts are per tuner body row (`BODY_MOTION` in `src/anim/bodyMotion.ts`); the stills come in a later step.
- The animation audit's walk sway limit for Wren is 5 cm (Michael approved ~5 cm; guards keep 3 cm).
- With the gun out (low ready walk / jog) the chest stays on the gun: the hips still swing under it, but the layer no
  longer turns the shoulders, which carried the gun arms out (low ready jog elbows 6.0 -> 5.7 cm outside the shoulder,
  limit 6; master's own reading). The low-ready head then follows only the keyed carry (1.1 deg peak to peak).
- Arms (step 3): Wren's walking arms swing wider (wrist range about 23 -> 30 cm), and turns and strafe starts no longer
  whip the hands (the jog 180 turn 14 -> 7 m/s): a per-gait arm gain and a wrist / elbow speed cap in the chest frame
  (the run's cap, 18 m/s, does not engage on its keys). Drawn (low ready) arms are unchanged. Anim Studio's loop player
  is never capped: its keyed loops play exactly as keyed.
- The walk's side-to-side weight shift peaks a little later in each step, with the same size (about 2.9 cm). The stance
  knee no longer bows out past the foot as the hip reaches its widest point (walk knee-out 3.4 -> 3.2 cm, limit 3.5).
- Crouched and still with the gun holstered, each palm now rests on the kneecap, slightly further forward than before. The
  right wrist no longer sinks into the right thigh (up to 2.5 -> 1.9 cm of overlap, limit 3).

### Volumetric cones under fixed spots
- Fix (render only): the Sector Ops LED strips and bulkheads with a beam optic no longer draw full ceiling-to-floor
  white fog cones at High / Ultra / Epic. In the volumetric pass the LED fittings (strips, panels, bulkheads) scatter under their shade like a lamp
  (march at most 3.2 m, no wider than the lamp cone, gain 1), along their own beam direction; torches and the floods with a
  plain housing (base Warehouse, parked maps) keep their beams. The floor light, the meter and the guards (`LightField`) are unchanged.
  `src/vfx/volLights.ts` (pure, `tests/volLights.test.ts`); shots and notes in `docs/vol-cone-fix/`.

## 4.60.1 - Train 11: GPU test waits, netmove compare on sim time, touch fling note (2026-10-22, PR #155; #150, #154, #149)

### Tests: condition waits before UI-state asserts (GPU)
- e2e-studio: waits (up to 3 s) for the studio bar's throttled readouts (the Keyed box, the playback readout) and the
  Keys readouts (the fixed first key, Add key) before asserting on them; hardware-GPU frames pass inside one refresh.
- e2e-menus: the touch pass waits (up to 3 s) for the Settings / main menu screens and the hidden pause button
  before asserting, instead of a fixed few frames after the tap or key press (the pause / Resume taps already wait, #148).

### e2e-netmove pose compares hold under load
- Tests (netmove-compare): e2e-netmove's pose compares hold the client's rig and the host's copy of it at the same idle
  phase (the drawn ready stance, the keyed idle and the breath run on each rig's own random clock, not on the wire) and
  re-step both foot planners at the tight 2 cm rest tolerance while comparing. The "drawn" ankle read 7.8 cm alone and
  10.7 cm under load; it now reads 0.3-3.6 cm, under the same 10 cm limit. Every compare logs its worst joint, and the
  suite prints the maximum.

### Touch fling note
- Docs: backlog 31, a fast look-drag may eat the next tap on a real touch device (to check on a phone).

## 4.60.0 - Train 10: Takedown blow and grab kill land on the kill, baked lamp material fix (2026-10-22, PR #153; #142, #145)

### anim-natural N4d: takedown blow and grab kill on the kill moment
- Lethal takedown blow and grab kill (Michael M1 "Faster arm", applied to the kills): the elbow arc's contact now lands
  on the kill instead of well before it (takedown: contact 0.39 s into the 0.7 s blow -> 0.68 s, kill at 0.7 s; grab
  kill: 0.28 s -> 0.48 s, kill at `GRAB.killTime` 0.5 s). The kill timing is unchanged. The follow-through and return
  play on after the kill (0.31 s / 0.22 s, pose only: the operator is free as before). Same on a co-op partner (the
  wire keeps the blow's own phase; both sides warp, the partner plays the follow-through itself). `killWarp`,
  `TAKEDOWN_BLOW`, `GRAB_KILL_BLOW` in `src/anim/strikeBody.ts`. Guards unchanged.
- Co-op client elbow strike: the host's accept no longer steps the strike's pose back (a one-frame hitch at RTT
  80-100 ms, the arc stepped back 0.13-0.21); the pose keeps its place and the clock catches up at half pace. Gameplay
  timing unchanged.

### Baked lamps: a material added in the frame another is disposed gets the lamp plugin
- Fix (backlog 30): `BakedLamps` now also attaches the baked-lamp plugin on the frame after the scene's new-material
  event, not only when `scene.materials.length` changes, so a material made in the same frame another is disposed
  is lit by the baked lamps (light parity). The observer is removed on dispose. Test: `tests/lampPluginGap.test.ts`.

## 4.59.0 - Train 9: Sector Ops laser panels, hand swap and elbow strike, vent kick, touch and GPU test fixes (2026-10-22, PR #151; #136, #139, #141, #148, #147)

### anim-natural N4c: hand swap and elbow strike
- Hand swap (the left-shoulder aim swap and the left wall end with the gun out, AUDIT row 29): the gun now passes low
  across the chest, under the chin, muzzle forward-down, instead of swinging round the head. Mid-swap the sight lets go
  of the eye and the aim pitch, the body clearance push is eased (no centre-line pop: largest grip step per frame 28-41
  cm -> 9-12 cm). `src/anim/handSwapPath.ts` (`HAND_SWAP` drop 0.12 m, forward 0.3 m, aimed only).
- Elbow strike and the lethal takedown blow (AUDIT row 49) drive from the hips and trunk: the wind-up loads the hips
  and rear shoulder, the hips lead the shoulders by about 3 frames through about 32 deg of turn (was 0.8; the keyed idle
  trunk wiped the graph's turn every frame), the weight shifts onto the lead foot, the head stays on the target. Wren
  rigs only (local and co-op partner); guards unchanged. `src/anim/strikeBody.ts` (`STRIKE_BODY`).
- Elbow strike, faster arm (Michael M1): the strike plays its arc warped onto the hit, so the elbow lands as the
  knockout resolves (`STRIKE.hitAt` 0.08 s unchanged; hand across by 0.1 s, was 0.37 s), the hips and shoulders drive
  through first, and the follow-through and return fill the rest of the 0.68 s. Same on a co-op partner (the wire keeps
  the raw phase; both sides warp). `strikeWarp` in `src/anim/strikeBody.ts`; the lethal takedown blow and the grab kill
  are unchanged.
- Tuner: Gun slider "Gun drop changing hands" (`swapDropMul`) and a new "Elbow strike" section (turn, hips lead,
  weight shift); all bake (`tuneBakeTable.ts`).

### GPU test fixes 3
- Tests: e2e-menus' touch block holds the finger still before lifting it after the look drag. On a fast GPU the drag
  took ~80 ms, Chrome turned it into a fling, and the pause button's first tap only cancelled the fling ("a tap on the
  pause button pauses ((none))" on the laptop, not the desktop). The game's touch pause was never broken.

### e2e-menus touch pause waits for the screen
- e2e-menus (item 29 touch): the pause-button tap and the Resume tap wait for the screen change (3 s cap) instead of
  reading the top screen after 4 frames; the tap is handled on a later sim step, and under the full parallel run the
  read came first (train 9 laptop run: "a tap on the pause button pauses ((none))"). Test only, no game change.

### Sector Ops laser power panels
- (sector-fixes P, Michael item 6) Every laser has a power panel nearby, out of plain sight and hard to reach; jamming
  the panel (the pistol jammer: 5 s at most, 5 s cooldown, stand still, a clear line) cuts every laser it powers for
  the jam and its 1.5 s reboot. The beams themselves are no longer jam targets (A1).
- Sector Ops: four panels. Workshop: in the office void, jammed from the catwalk through its opening. Plant deck: in the
  slot behind the AHU, jammed round its corner from the deck's south-west corner. VNA aisle: on top of R2N, jammed from
  R1N's top. Mezzanine (both deck lasers): under the deck behind the parts store's back shelf, jammed along the slot. A
  panel of a section that is not live is dark like its lasers.
- Marlow Yard station 4: the panel is high on the far side's south wall, jammed diagonally through the gap from the near
  side's north half; the throw and the release stay the taught route. Walkthrough and spec updated.
- The panel is a small procedural wall box (housing, door seam, hinge, label, conduit) with a status LED: green
  powered, cyan blink jammed, amber rebooting, dark when dead or released. Electro vision highlights it.
- The laser trip radio line now says to jam its power panel (electro shows it).
- Co-op: the panel rides the existing jam claim and device timelines; PROTOCOL_VERSION 28 -> 29 (the jam ids name
  panels, not lasers).

### Vent unscrew on keyboard and pad
- Keyboard: a closed vent can be unscrewed again. Space starts it as before; while Space is still held it is no kick,
  and the hold carries on into E, so Space then E held (or Space held) unscrews quietly and a Space tap still kicks.
  Before, the kick was decided 33 ms after the press unless E was already down, so Space then E always kicked. A jump
  bound to a mouse button works the same.
- Pad (Michael: "Yes, match keyboard"): the same rule. Holding Y is no kick and the hold carries on into A, so Y then A
  held (or Y held) unscrews and a Y tap still kicks. Before, A had to be down within 33 ms of Y.
- The tap / hold rule is a pure module (`player/ventOpen.ts`) with unit tests; e2e-traverse's keyboard vent checks run
  again (Space, then E a few frames later: progress shows, letting go early stops it, no kick) and e2e-pad checks the
  pad vent (Y then A held unscrews, a Y tap kicks).

## 4.58.3 - Decisions G229-G269 folded from the roadmap (2026-10-22, PR #146)
- docs/DECISIONS.md: roadmap decisions of 2026-10-21 16:10 to 2026-10-22 ~21:50 folded in as G229-G269.

## 4.58.2 - GPU test waits for the tuner panel reads (2026-10-22, PR #143)
- Tests: e2e-studio's reads of the tuner panel's effect mode and Keys readout wait 300 ms of wall time first (the
  panel refreshes them every 250 / 100 ms; a few frames on a hardware GPU pass in ~50 ms), so the suite no longer
  fails at a shifting spot (:755, :854) on the GPU. Software GL is unchanged apart from the waits (~3.3 s total).

## 4.58.1 - GPU test fixes: studio keyed walk and lightbake waits (2026-10-22, PR #140)
- Tests: e2e-studio and e2e-lightbake pass on a hardware GPU (the laptop's default for logic e2e, `E2E_GPU=1`). Both
  waited a fixed number of rendered frames, which a GPU finishes in ~0.1 s: the studio's keyed-walk check now waits
  for the tuner panel's keyed mode (re-read every 250 ms of wall time), the lamp-plugin check waits (5 s cap) until
  every PBR material has the plugin. Software GL is unchanged.

## 4.58.0 - Train 7: Anim Studio co-op pairs, animation audit scripts (2026-10-22, PR #137; #132, #134)

### anim-natural N0: the full animation audit (docs and scripts only)
- `docs/anim-natural/AUDIT.md`: every animation scored against the realism standard (pass 1 and pass 2), with the fix
  list that N1-N4 build from; `PASS2.md`: the pass 2 reruns and the N0 leftovers (rows 29 / 39 / 49: script problems,
  no game bug); GPU contact sheets and `metrics.json` in `docs/anim-natural/audit/`.
- `scripts/anim-natural/audit.mjs`: the audit driver (studio loops, proving rows, pass 2 rows, per-row metrics and
  `ev` move summary; `NAT_PORT` for a software-GL logic check). Stage lights never include shared part bases, which lit
  every instance in the scene. No game change.

### studio-pairs (track A, AUDIT fix 12)
- Anim Studio: the stage lights light only Wren's own meshes, so the guard in the hold pairs (and the props) no longer
  turn white under them; he reads by the room's light as in game.
- Anim Studio pairs: the puppets stay on their full-detail model for the whole loop (a distance swap mid-loop could
  blank a puppet for a moment while the new model's shaders compiled). Test hook `__studioStage.puppets()`.
- Anim Studio (GPU round): a shared part base pushed into a stage light's list later (the anim audit's pair rows did)
  is dropped again within a second and the parts it lit recompile, so the hold pairs' guard no longer turns white after
  a team pair has played. `__studioStage.puppets()` also gives `lodName` (`lod` 1 is LOD0).

## 4.57.0 - Train 6: body recoil and wall block, every tuner slider bakes, Sector Ops cameras, lasers and lights, steady heap tests, merge-train script (2026-10-22, PR #133; #123, #128, #129, #127, #122, #131)

### Process: changelog fragments and a merge-train script
- Changelog fragments: each PR adds one `changes/<branch>.md` (`# title`, optional `kind: minor|patch`, the entries)
  instead of a "## Unreleased - <job>" block in `CHANGELOG.md`, so merges stop conflicting there.
  `scripts/changelog-assemble.mjs <version> <title> <date> <PR> [members...]` writes them as one released section at
  the version step, folds any legacy "Unreleased" blocks on top (dropping ones already released) and deletes the
  fragments. Format: `changes/README.md`.
- `scripts/merge-train.mjs`: `build <n> <branch>...` makes `train/<n>` from origin/master and the branches (CHANGELOG /
  fragment conflicts resolved keeping both sides; a branch with any other conflict is left out and listed);
  `release <n> <version> "<title>"` and `single <branch> <version> "<title>"` merge master in, open the train PR,
  assemble the changelog, set the version, push and wait for CI on that exact commit, and only on a pass merge, tag and
  move `dev` (exit 2 on red CI with the failing log tail, 3 on a source conflict). `--dry-run` moves nothing.
- Tests: `tests/changelogAssemble.test.ts`, `tests/mergeTrain.test.ts` (tool only, no game change).

### anim-n3b
- Deleted the dash-in slide and the doorway check sweep animations (Michael 2026-10-22: "Delete them"; never set in
  play, CT has neither): the `slide` lower state and clip, `AnimInput` / `RigPose` / `PlayerPose` `slide` and `check`, the
  tuner's `slide` action row. Old tuner saves and exports that still carry `joint.slide` / `ik.slide` /
  `hand.<gun>.slide` / `weapon.<gun>.slide` load with those rows dropped (`isRemovedTuneGroup`).
- Firing: Wren's body kicks per shot (`src/anim/recoil.ts`): rifle about 3 cm back at the hands, 1.1 deg muzzle rise, 1.5
  deg chest give; pistol 1.8 cm lift, 3.6 deg flip; settled within 0.3 s. Local and co-op partner alike (from the kick, no
  wire change). New Gun slider `recoilMul` (aim states) with a bake rule. Guards unchanged.
- Wall block: no more muzzle-up swing (69 deg) and stall; the rifle comes off the eye and tips about 66 deg under the aim
  line about the butt, pulled in, in one eased 0.4 s move with hysteresis (no half-way hold).

### sector-fixes
#### Slice C: cameras and lasers (Michael 2026-10-22, items 3-5)
- Security cameras pitch down to a floor patch (`aim` in the map data, `camPitch`) and see only their own `range`
  (`camRange`, at most 18 m). Detection (`CameraUnit.covers`) and the red grid cue read the same pitch and range, so the
  grid is drawn only where the camera can detect. Sector Ops: cam-yard aim 5 / range 10, cam-floor 7 / 14, the others
  6 / 12. Marlow Yard cam-s3: aim 6.5 (pitch 20 deg), range 18. The housing points down its pitch.
- The camera grid is very subtle in normal vision (line 0.16 -> 0.055, fill 0.025 -> 0.006, 0.6 px hairlines); electro
  keeps the stronger white lattice.
- Lasers are infrared: drawn (glowing) only in night vision, invisible in normal, thermal and electro. Render only: the
  sensor works the same in every mode.
- A laser break raises the alarm stage (the camera alarm path: one stage per `ALARM_GAP`, the course stat / Sector Ops
  alarm, banner, radio line) and never deals damage (`LASER.damage`, `floorHp` and `laserDamage` removed). Station 4
  panel text updated. No wire change (protocol unchanged).

#### Slice L: Sector Ops lights (Michael 2026-10-22: "light fittings in same rooms are different heights and locations. Theres random lights on the roof. Theres a light in the middle of a climbing pipe." / "All lights should look like LED designs.")
- Every Sector Ops lamp is laid out by room (`world/maps/lampRooms.ts`): one LED model, one height and a regular grid or
  row per room; flush LED panels in the rooms, LED strips on short wires under the hall roofs (on the solid roof strips,
  never under a sheet), slim LED bulkheads on 0.3 m wall brackets. No lamp on the roof (the roof reads by the moon), none
  within 0.8 m of a climbing pipe, ladder or duct (the drainpipe's lamp moved 1 m east). Dead fittings keep the grids
  regular over the dark pockets. The three fitting models are rebuilt as flat LED housings with opal diffusers.
- Light parity: every fitting is a registry light (the bake, the meter and the guards read it); radius and intensity per
  fitting are tuned so the light tests' route, objective and pocket bands still hold (sections 1 to 3).
- The light grid lists a cone light only in the columns its beam can reach (`lampPlanReach`, lossless), so a 2 m column
  stays within its 8 lights with the hall strips' and wall packs' beams.
- Section 2's two roof rafters are dressing (out of the light shapes): they no longer cut the hall strips' light off the
  rack tops.

### heap-asserts (track A)
- Tests: every "allocates nothing" check now measures bytes per call deterministically (a garbage collection before each
  round, the new-space size, rounds with a collection discarded; shared helper `tests/helpers/allocPerCall.ts`), so
  they no longer pass or fail on when a collection happens to land.
- Menus: the menu camera director no longer allocates every frame (`menuShots.ts` `held()`: a closure per frame in the
  title, loadout and lobby menus; same shots chosen).

### anim-bake-all
- Animation tuner: every slider bakes, also those with no code value of their own: the aimed gun's height and angles,
  the camera FOV (a change on top of the player's FOV setting), aim zoom and aim-in blend, the aimed glide forward
  speed, the rest of Stepping (lift on the moving gaits, idle lock, duration, slide, the three stride points, toe-off,
  heel, replant), the Weight damping and every Weight amount, and every co-op and traversal move slider. They go into
  the base table's new generic `sections` key, which the game composes with the tuner's values wherever the slider
  acts today (the local player; Stepping: every foot planner). The step length bakes per moving state (13 apart; the
  old shared step-length rule is gone). A slider whose states share one code value but were tuned apart now bakes per
  state instead of staying in the tuner. Gameplay: a baked Speed value (the glide forward) changes the player's speed.
- Untuned nothing changes (the table has no `sections` key yet).

## 4.56.0 - Train 5: believable weapon draws, idle stance clears the shins, co-op channel closed guard (2026-10-22, PR #130; #118, #120, #125, #126)

### #118 Believable draws, holsters and swaps (anim-natural N3)

- Draw, holster and swap are one continuous move per gun (reach, grip, lift / clear, present, settle;
  `anim/drawMotion.ts`): the "random stop" when taking a gun out is gone (the swap clip held the gun level at its
  pocket for 0.08-0.17 s, then pitched it 34-53 deg into the low ready), and so are the 28 / 11 / 7 cm one-frame jumps at
  the swap press, the hand-off and the pistol LT draw.
- Real-world times (Michael: "Research what is believable and realistic"; sources in docs/anim-natural/n3/DRAW-TIMES.md):
  rifle draw 0.3 -> 1.1 s, pistol draw 0.5 -> 0.75 s, rifle holster 0.15 -> 1.0 s, pistol holster 0.15 -> 0.9 s. A
  traversal or busy move still holsters in 0.15 s (`HOLSTER_TIME_MOVE`); the aim camera from low ready keeps the old
  0.3 / 0.5 s blend (`AIM_IN_*`). Gameplay: the gun can fire, strike, reload or use a gadget only when the longer draw
  ends; the LT sling draw is about 1.5 / 1.2 s.
- A holster or a traversal mid-draw runs the draw backwards from where the gun is (no snap to the slot: 4.7-39 cm
  one-frame jumps -> 0.4-2.3 cm); RT pressed during a holster queues the strike (tap / hold from the press) and the
  holster speeds up to finish first; a re-draw just after the seat starts from the hand still on the gun.
- Tuner: a Draw section per gun (reach, grip, hand-over, settle, lift and present paths; bakes into `DRAW_MOTION`). The
  times are Clip speed's: the holster row is now one per gun (Rifle / Pistol holster speed) and the draw / holster rows
  go up to 7x so the old times stay reachable; an older save, preset or export with the single holster value sets both.

### #120 Idle stance: the shins clear at a teleport

- A teleport (spawn, respawn, checkpoint, the anim-audit's `tp`) plants Wren's feet no closer to the midline than the
  standing stance band's floor (3 cm, `TURN_FOLLOW.standMinLateral`), as every free-movement landing already does.
  `FootPlanner.reset` skipped the band, so Michael's idle track 0.05 (kept) put the feet 0.4 cm off the midline and
  the audit's shank capsules sat 3.18 cm into each other (limit 2.00) from the teleport to the first step, the first
  frame of every standing row. Michael: "Widen just enough. They didn't clip when I viewed it though": the mesh never
  clipped (its knees sit wider than the rig's proxy knees); only the capsules overlapped. Wren rigs only (guard and
  dog rigs unchanged, bit-identical). Headless 2.36 -> 0.3 cm. The 0.3 idle track tried first is reverted.

### #125 Co-op: the local channel ignores sends after close

- Co-op over the local (same-device) transport: a message sent after leaving the room is dropped instead of throwing
  "BroadcastChannel is closed" (`src/net/localTransport.ts`; a teardown race that failed e2e-coop console checks).
  Test: `tests/localTransport.test.ts`.

### #126 e2e-pad wheel let-go waits sim time (test only)
- `scripts/e2e-pad.mjs`: the sector-fixes W let-go step waits 0.3 s of sim time instead of 300 ms of wall time, so the 5-step let-go grace has always passed under load.

## 4.55.1 - Master CI green again: the guardInfo test admits station 3's security guard (test only) (2026-10-22, PR #124)
- `tests/guardInfo.test.ts` expects both passive guards with information: `s1-guard` (bay 1) and `s3-sec-guard` (bay 3, the security room from #115, which has an INTERROGATE line by plan). Train 4 merged with this unit test red.

## 4.55.0 - Train 4: Marlow Yard security room, wheel opens on goggles, run feet no longer cross (2026-10-22, PR #121; #110, #115, #116)

### #110 The run's feet no longer cross
- The run's feet no longer cross the midline: the keyed clips' track half-width (`half`) is measured with the
  stride-locked pelvis yaw removed (`scripts/anim-keys/py/key_clip.py`: each frame's ankles turned back by that frame's
  pelvis yaw minus the clip's mean pelvis yaw; the yaw read off the pelvis's lateral axis, which stays level in the
  face-down frames of the knife collapse), not in the world x, so the run keys' +-25.5 deg pelvis yaw no longer leaks
  the stride into it, and a constant stance yaw (the ready stance's 6 deg) keeps its world value. Run half -0.02039 ->
  0.05042 (0.045 before the 2026-10-22 bake).
- Every keyed clip rebaked (key JSONs unchanged); the clips whose pelvis yaw swings changed: walk 0.0466 -> 0.05188,
  jog 0.04592 -> 0.05386, sneak 0.06355 -> 0.06519, crouch walk 0.06203 -> 0.06566, crouch run 0.06071 -> 0.06666,
  glide fwd 0.05672 -> 0.05807, glide back 0.057 -> 0.05802, wall crouch slide 0.06195 -> 0.06564, guard held hands
  0.09392 -> 0.09389, held stumble 0.07274 -> 0.07634, choke sag 0.10495 -> 0.10482, knife collapse 0.12162 ->
  0.12164; crouch idle and wall crouch idle 0.12196 -> 0.12197, hold back 0.09363 -> 0.09365 (their crouch pitch and
  breathing roll read as a +-0.03-0.4 deg yaw). The ready stance and the other clips keep their half.
- Tests: the walk footage limit `half <= 0.05` -> 0.053; the skeleton identity fixtures re-captured (the swinging-yaw
  keyed clips, crouch idle, wall crouch idle, hold back, skeleton_test, the partner path and the guards' walk / aim
  walk); e2e-anim's run limits re-measured (track 0.16 -> 0.18, knee bow 0.09 -> 0.047; knee separation and elbows
  kept).

### #115 Marlow Yard security room (sector-fixes S)
- Marlow Yard, station 3 (Michael: "If there are cameras, there should be a security room with a guard watching the
  cameras. You can take him out and shut off cameras"): a security room off the far lobby, through a plain door behind
  the camera. A duty guard stands at the monitor wall (a training guard like station 1's: he sees and hears nothing);
  grabbed, INTERROGATE gets "All right! The desk console switches the hallway camera off."
- The desk console refuses while he is up ("The guard is watching the monitors. Take him out first."). Knock him out or
  kill him (takedown, strike or shot), then use it: the hallway camera goes off for both players (no detection, no
  alarm, no send-back, its LED dark, its red view hidden) until the bay restarts, which brings the camera and the guard
  back. LANTERN: "Cameras off. Your partner can walk the hallway." A second line at the station start names the room.
- The jam handoff still works exactly as before: the first runner still needs the partner's jam to reach the far lobby,
  and the second can still be jammed through. The room is an alternative to the second jam, not a replacement; a
  camera switched off at the console is simply no longer a jam target.
- The station's monitor wall moved from the hallway's south wall into the room, with a desk under it; the room has
  its own ceiling panel (jammable and shootable like the other lamps).
- Not in Sector Ops (Michael): its cameras have no console. Co-op: no protocol change.

### #116 Wheel opens on the goggles (sector-fixes W)

### The selection wheel defaults to the goggles (Michael item 8)
- Michael: "Change goggles in inventory to the default selection so you can just hold l1 and press a to automatically
  swap between them. Don't hold selections in the wheel, if analogue stick is let go it defaults to goggles/vision
  selection."
- The wheel opens on the vision slot: hold LB and press A to cycle night, thermal, electro with no stick; release LB
  and the mode shown is selected.
- The pad's right stick now places the wheel cursor where the stick points (it used to drift with the look rate and stay
  put). Let go of the stick and the vision slot lights again, so nothing else stays picked. A stick and LB let go
  together still pick the slot under the stick (a 0.08 s grace, `WHEEL_LETGO_S`); A with the stick centred always
  cycles the vision.
- Keyboard and mouse: hold Tab, the wheel opens on vision and E cycles; the mouse back in the centre lights vision.
- Tests: `tests/selectionWheel.test.ts` (default slot, let go, grace, A centred), `tests/input.test.ts` (the stick
  position); e2e-gadgets and e2e-pad assert the new behaviour; `scripts/wheel-shots.mjs` drives the stick.

## 4.54.1 - Load-flaky e2e asserts hold under E2E_JOBS=2 (test only) (2026-10-22, PR #117)
- Four load-flaky e2e asserts hold under E2E_JOBS=2 (test only): e2e-stealth-ai head-only peek spot, e2e-netmove client assists, e2e-mouse capture timeout, e2e-ctcourse station 4 throw; details in `docs/backlog.md`.

## 4.54.0 - Train 3: every tuner Body slider bakes, holds and carries (2026-10-22, PR #114; #103, #113)

### #103 Body sliders bake
- Animation tuner: every Body slider (but the shared stride length) and the gun tuck bake. The Body sliders with no
  code value (track, arm swing, knee lift, elbow out, elbow pole and the rest) bake into the base table's new `body`
  key, which every Wren rig reads (the player, the co-op partner, the Anim Studio puppets; guards never); the gun's
  elbow tuck bakes per gun state (six Wren constants, the guards keep theirs). The stride length stays one shared
  value (it bakes when every moving state agrees). Michael's 13 values from 2026-10-22 that stayed in his browser are
  now built in: the feet on a narrow track at idle / walk / jog / run, the elbows out at idle / walk / jog, more arm
  swing at jog / run, more knee lift at run, the elbows out at low ready and the rifle / pistol low ready tuck.
- The tuner resets those 13 sliders once on the next load (they would otherwise apply twice): each bake now has its
  own id in the save, so a second bake of the same export is not mistaken for the one already applied.

### #113 Holds and carries (anim-natural N4)
- Hostage walk and body carry: the hips and the shoulders now turn against each other with each step instead of as
  one block (pelvis about +-3 deg, the shoulders the other way, smaller than a free walk: the arms are busy). Carrying,
  the trunk leans about 6 deg away from the loaded shoulder, the hips sit a little under the load and each step dips a
  little deeper. Measured on Proving (desktop GPU): counterCorr hold-walk +0.85 -> -0.76, carry-walk +0.95 -> -0.91.
  The lean and the hip shift scale by the body's weight on the shoulder: none kneeling at the body, in with the hoist,
  out by the put down's hand-over (fix round).
- Body lift: she walks in to the body standing and crouches once there (the crouched step-in dragged a planted foot
  21 cm), and stays down until a stepping foot has landed before she stands with the body (at most 0.3 s). Animation
  only (fix round): the controller crouch keeps the lift's fixed timeline, crouched from the start as before. Lift
  planted slide 20.9 / 7.4 cm -> 0 / 5.4 cm (the 5.4 is the planted foot's twist in the 90 deg turn to the body: an N1
  planner item, as is the carry-walk's 5-9 cm late-stance and start-turn slide, which a free walk at that pace shows too).
- Animation tuner: a "Holds and carries" section (hold walk / carry rows): hip and shoulder twist, shoulders against
  the hips, step weight (dip), step length (cadence; default x1), and for the carry the lean away from the load and the
  hips under the load. Every slider bakes into `CQ_GAIT` (`src/anim/cqGait.ts`) with `scripts/anim-tune-bake.mjs`
  (section `cq`).

## 4.53.0 - Train 2: guard tuning and clip speed in the animation tuner (2026-10-22, PR #112; #105, #109)

### #109 Clip speed
- Animation tuner, Clip speed tab (Michael: "Can I fine tune the whole animation speed in anim tuner?"): a speed slider
  per timed clip, 1 = today's timing, 2 = twice as fast. Draw, holster, swap and throw: rifle draw (every long gun),
  pistol draw, holster, weapon swap, grenade throw. Start, stop and landing: the start-off weight shift, the stop
  settle, the landings. Every clip: one slider that multiplies all of them. Each slider shows today's duration.
- The draw speed is gameplay too: the gun can fire when the faster (or slower) draw ends, and the aim camera blends in
  with it. Not the View tab's slow motion (that slows the whole game for viewing).
- Bakes like the other sections (`node scripts/anim-tune-bake.mjs`, section `clip`): into the draw, holster, swap and
  throw times and a new playback rate per timed body clip (`CLIP_RATE`). Untuned, nothing changes; the save is unchanged.

### #105 Guard tuning
- Animation tuner: a "Who" list (Wren / Guard) at the head of the Body, Stepping and Weight tabs. Guard tunes every
  guard's Joints, Stepping and Weight (lean, step load, springs, the start dip) per guard state: idle, walk (patrol and
  alert), run, aim, crouched, wall cover. Wren's sliders never change a guard and the guard sliders never change Wren.
- Every guard (in single player and on a co-op client) reads a guard base table the bake writes from an export's guard
  rows (`src/anim/animBaseGuard.ts`); untuned guards look and act exactly as before.
- Anim Studio: Who = Guard (or a "Guard: ..." loop) plays a guard puppet (a real guard, no AI) where Wren stands:
  idle, patrol walk, alert walk, run, aim, crouched aim and wall cover, moving loops on the spot; the camera, the
  highlight, pause and speed work on it. Who = Wren brings her back.
- Saves, exports, imports, presets and undo carry the guard rows; older saves and exports load as before.

## 4.52.0 - Train 1: server browser and jammer fixes; protocol 28 (2026-10-22, PR #111; #99, #108)

### #108 Jammer fixes
- A jammed lamp comes back in the state its wall switch, EMP or a shot gives it at the end of the jam, not the state it
  had when the jam started: a group switched off (or EMPed) during a jam stays dark through the flicker, on the host and
  the client alike (light parity). The light registry keeps the switches' state under the jam.
- Jamming Course Lab's mains lamp no longer opens the mains gate, and its flicker no longer toggles it: the gates read
  the group's switch / EMP / shot state, never the jam.
- Co-op: `PROTOCOL_VERSION` 28: the client's `jam` claim carries its camera eye; the host checks the jam's line of sight
  from it (taken within 1.5 m of the client's head with a clear line between them, else from the head), so a client
  that shows JAMMER READY now jams.
- The jam buzz no longer allocates an object every frame while a device is jammed.
- Not changed (Michael 2026-10-22): cameras keep their IR on every camera ("Cameras should still work in the dark").

### #99 Server browser (prototype)
- Co-op: public rooms (Michael: a server browser, "prototype only, quick and fast to build"). The host lobby has a
  Room row, Private (default: only the code brings anyone in) or Public. A public room posts a notice (code, map, mode,
  version, players, host name) on the same relays as every room, every 30 s and to anyone who opens the list; it is
  taken off when the room is full, goes private or closes, and a notice not refreshed for 75 s drops out.
- Co-op > Browse rooms: the public rooms of this exact version and protocol, live, with pad, keyboard and mouse; a pick
  joins by its code as today. No quick match, no relay server, no game server.

## 4.51.1 - e2e-coop: the client-takedown step holds steady under load (test only) (2026-10-22, PR #107)
- The client-takedown step in `scripts/e2e-coop.mjs` calms the host's guards and holds the picked guard still until
  the takedown is done, as the grab step already does: on a slow page the guards alerted or turned between the host's
  pin and the client's read, so the offer never came (the master-wide flake). The start, the reach check and the
  knock-out are still the real code. A failure now prints both pages' view of the guard and the client.

## 4.51.0 - Animation tuner: key tools (wave, apply to ticked keys, smooth between, compare) and the exact key preview (2026-10-22, PR #106)
- Animation tuner, Keys tab: key tools for changing many keys at once, each one undo step and baked like any key edit.
  "Key tools" fold: Wave (pick a slider by name, an amount and a timing; "Fill keys" puts a smooth sine over the cycle
  on every key, the mirrored half following the Mirror rule), Apply to keys (the selected slider's value on this key
  to the ticked keys, All / None) and Smooth between (the keys between two keys eased from one pose to the other, every
  slider or the selected one).
- Compare (off by default): a light ghost of the previous or a picked key over her in the Anim Studio, and a line of
  how this key differs ("Key 2 vs key 1: Right forearm twist, palm in +12°, Chest turn -3°").
- Exact preview: a key edit now previews the way the Blender rebake makes it (the same Bezier curve; the trunk exact,
  the arms within 0.7 cm between the keys, the pelvis exact), also with retimed, added and deleted keys, so the
  in-betweens no longer shift after a rebake. "+ Add key" keeps the pose where the key goes.

## 4.50.0 - Co-op rejoin: a dropped player rejoins the match (held slot, Resume hosting, room code on pause and main menu); protocol 27 (2026-10-22, PR #92)
- Co-op: rejoin a match you left or dropped out of (Michael: "There should also be a way to rejoin a match you have
  left"). The room code shows in the pause menu, and for 10 minutes after a match was last live the main menu offers
  "Rejoin <code>" (the joiner) or "Resume hosting <code>" (the host): one press.
- A joiner who drops or leaves mid-match keeps its place: the host holds its body where it stood (frozen, unhurt, unseen
  by the guards) with a "<name> disconnected - reconnecting... (room CODE)" line, for 10 minutes. Rejoining puts it
  back as the same player, where it stood, with the health the host kept and the team's state.
- If the host drops or leaves, the joiner stays in the match with "Host disconnected - waiting (CODE)". "Resume
  hosting" reopens the same room and starts the match again from its last checkpoint (Marlow Yard: the bay they were
  in); the waiting joiner takes it at once, or rejoins from its menu. No server: the same room on the same relays.
- Protocol 27 (26 is the jammer slice): the hello's rejoin token, the held flag in the lobby, the host's `you` and the
  `restore` event.

## 4.49.1 - Animation tuner: worn-goggle offsets in the Gear tab, baked (2026-10-22, PR #102)
- Goggles in the Gear tab (marlow-bays item 22's last socket): a `goggles` socket (and its crouched row) moves and
  turns the worn goggle (night vision on) in the head frame: x / y / z in metres, pitch / yaw / roll in degrees, about
  the goggle's own pivot. It bakes into the animation base table like the other Gear rows; your own Wren shows it
  (the partner's and the studio puppets' rigs carry it too, but they always show the stowed goggle, so it shows on them once their vision mode is shown), guards never. At LOD1 / LOD2 only the lens moves (the housing
  is part of the head there). The stowed goggle has no slider yet (it has no separate parts). Untuned, nothing changes.

## 4.49.0 - Animation tuner v3: one simpler layout for pad, touch and mouse; analogue stick lists; plain labels; iPad and phone fit; touch camera; game touch for menus and camera (2026-10-22, PR #97)
- Animation tuner, simpler: one layout for every input (pad, keyboard and mouse, touch; the input changes only the
  button hints), the screen size alone picks the dock, the side drawer or the bottom sheet. One column: tabs, the
  playback bar, Part and State, folding slider groups, then More. The body map, search, recent and pinned sliders, the
  Settings tab and the edit mode are gone. Pad: the left stick scrolls the lists and changes values, the right stick is
  always the camera, the triggers zoom, the D-pad is optional; the state list's Up bug is fixed.
- The highlight on her is a small dot with an off switch; the studio's green skeleton and foot marks start off
  (More > View aids).
- On phones the tabs and the playback bar stay at the top of the drawer and sheet while the panel scrolls.
- Keyed clips: with Keyed ticked the Body, Joints, Limb reach, Hands & feet and gun rows now reach the clip (they did
  nothing: the clip on the spot tuned the idle). Feet apart and Knee lift work on the keyed clip on the spot. Sliders
  that do nothing in the loop playing now are greyed with the reason ("procedural only: the keyed clip is playing").
- Plain words: values in cm and degrees, the hands of a gun stance named "Gun hand" and "Support hand", "Gun in the gun
  hand" says the support hand follows the gun.
- Camera: "Around her" (360 degrees), "Camera tilt" and "Distance" sliders in the View tab, in step with the stick,
  the drag, the touch orbit and the snaps; Side pressed again swaps to her other side.
- Changing keys (back, forward, pick, add, delete) keeps the panel's scroll and the focused slider.
- Pad: the left stick changes values and scrolls while "Pause game while tuning" holds the game (it ran on game
  time, so it did nothing in play).
- The studio shows a foot slide line when the rig reports it (amber over 0.5 cm).
- Game touch: tap every menu and the pause menu, drag on the game view to look around, an on-screen pause button after
  a touch. No touch movement or combat.

## 4.48.0 - Marlow Yard bay 3: a jam-handoff hallway, the jammer's 5 s use / 5 s cooldown with a buzz, camera reboot and lamp flicker; cameras see in the dark (2026-10-22, PR #101)
- Jammer rules (Michael 2026-10-21 item 7, A3, J1): each player jams for at most 5 s, then a 5 s cooldown; letting go
  early (or moving: the stand-still rule) also starts the cooldown. The 20 s charge (drain / refill / minStart) is gone.
- A jammed camera goes blind (its red grid fades out), stops sweeping where it is and flashes its LED; released (or at
  5 s) it reboots for 1.5 s, still blind and frozen, and nobody can jam it again until it is back online. Lasers take the
  same 1.5 s. A quiet buzz / interference synth voice plays at the jammed device on both pages (positional, no asset).
- Lights are jam targets (item 8): a jammed lamp flickers off (0.5 s), stays off while held and 4 s after the release,
  then flickers back on; the registry gameplay reads follows the same timeline (the meter and guards agree).
- Only a target the aim has a clear line to can be jammed (no jamming through walls).
- The jammer HUD: a line under the reticle (JAMMING 3.2 s / JAMMER COOLDOWN / TARGET REBOOTING / READY) and the gun
  light: cyan pulse jamming, dim red cooling, amber on a rebooting target, green aimed (the old jamming colour was the
  aimed green, so a jam did not show).
- Marlow Yard station 3 is a camera hallway (item 5, A5): a 2.9 m hallway along the south wall, the camera at its far end
  looking back down it with a +-8 deg sweep; its view stays inside the bay (no view into either airlock). One jam covers
  one runner; the partner through jams it from the far lobby for the other. Both in the far lobby unlock airlock A3's
  door. The painted sweep-edge floor lines are gone (Michael: the red view overlay shows the camera's area). New radio,
  objective and panel text; the station's light levels re-taken for the hallway.
- Co-op: `PROTOCOL_VERSION` 26: `sec` carries per-camera clocks, each player's jam left and cooldown, and the jammed /
  recovering devices; the client draws the frozen camera, LED, grid, buzz and light flicker from it.
- Station 3 hard rule (fix round 1, item 5 "impossible to pass without one player jamming"): a player the camera has
  (its meter full) in the hallway, or still running in the far lobby, is sent back to the entry lobby facing the
  hallway ("Camera saw you. Back to the start of the hallway."); the far lobby only counts players who got through
  clean. Being seen still raises the alarm stage too. Co-op: a new `back` event moves the client (health kept).
- Fix round 1: the host checks a client's jam target with the same static line of sight (from the client's head); the
  client never blinks a camera back into its reboot on a late host message (device timelines only move forward); the
  jammer HUD line and the buzz no longer rebuild a string or schedule audio every frame.
- Fix round 2: a player the hallway camera sent back counts for the gate again only once seen back in the entry lobby
  (a co-op client after the host's 3 s teleport grace): stale far-lobby positions sent before the `back` event arrived no
  longer open it.
- Security cameras see in the dark (Michael M3): each has its own IR illuminator, so inside its range and cone it reads
  every body as fully lit whatever the lamps do. Putting lamps out (jam, EMP, shot) no longer hides anyone from a camera,
  in Marlow Yard and Sector Ops alike; guards and the light meter still go by the lamps. Every station 3 lamp is jammable
  again (the hardened bay x 6 hallway lamp of fix round 2 is undone).
## 4.47.1 - Tuner groundwork: a Blender-exact key curve evaluator for the coming exact key preview (not wired yet) (2026-10-22, PR #100)
- `src/anim/keyCurve.ts`: a pure, allocation-free port of Blender 5.2.2's auto-clamped Bezier solve (within 2e-6 of Blender on 124 curves), with tests and fixtures. Course Ready wires it into the Keys preview in item 30.


## 4.47.0 - Animation tuner: collarbone Joints, per-key legs (planted feet kept), collarbone and finger keys on every keyed clip (2026-10-22, PR #98)
- Per-key collarbones, fingers and legs on every keyed clip (Michael: per-key legs, collarbones and fingers on the real
  clips, jog, run, walk, idle ...). The Keys tab has, on every key: collarbone pitch / yaw / roll per side, curl and
  spread per finger, and leg changes per joint (hip pitch / yaw / roll, knee, ankle pitch / roll, toe). A clip takes
  them on the first edit and the bake writes them; clips nobody edits stay exactly as they are.
- Leg key changes keep planted feet still: while a foot is planted the leg is re-solved onto its plant with the change
  folded in (a knee or hip change on jog's contact key leaves the foot within 0.5 cm; measured 0.00 cm); the swinging
  leg takes the change as keyed. The rig reports how far a planted foot slid (`rig.footSlide`, the studio's foot
  slide line).
- Joints tab: a collarbone row per side (shrug, push forward, tilt) for every state.
- Clips can be keyed with whole legs (an FK takeover with a per-key weight over the foot planner); the studio-only test
  clip skeleton_test uses all of it (shrug, shoulder push, fingers one by one, a kick with the other foot planted).

## 4.46.0 - Michael's first tuner bake: jog and run keys, low-ready gun poses, Joints; Reset baked clears built-in values on load (2026-10-22, PR #96)
- Animation tuner: after a bake merges, the tuner resets the sliders the code now holds by itself (each saved value that
  equals a value in the bundled bake ledger goes back to its default, once per bake), so a baked tune is never applied
  twice. The rest of the tuning is kept; the panel says how many ("61 values are now built in; your other 13 changes
  are kept."). Y menu > "Reset baked" runs it again.
- Tests follow Michael's 2026-10-22 tune (the jog / run keys, the rifle and pistol low ready, the idle / walk / jog
  upper-arm roll): the identity fixtures re-captured (proven data only first), the tuner key tests moved to the evenly
  spaced sneak / walk keys, and the run's anti-crab and arm limits widened for the run alone (marked to restore).
- Michael's rifle and pistol low ready are Wren's alone (`WREN_READY_LOW`, `WREN_PISTOL_READY`, picked once per rig by
  `tuneRows`): guards, the VIP and the dummy keep the pre-bake ready poses, the gun bake rules target Wren's copies,
  the guard identity fixture is back to master's, and e2e-anim's player low-ready limits follow the tune (marked).

## 4.45.0 - Animation tuner: Gear offsets for the holster, the guns on her back and the hip sling, baked (2026-10-22, PR #95)
- Gear offsets (marlow-bays item 22): the animation tuner has a Gear tab with sliders that move worn gear per socket:
  the holstered pistol on the thigh, the guns on the back (left, centre, right) and the hip sling socket
  (the hip sling's gun with it). Each moves in its own frame (x / y / z in metres) and turns
  about its own seat (pitch / yaw / roll in degrees); each has a crouched variant added as she crouches. A draw or
  holster reaches to the moved slot. Visual only: what she carries and how long a draw takes are unchanged.
- The Gear values bake into the animation base table like Joints and Hands & feet, so every Wren body takes them: the
  co-op partner and the studio's pair puppets too, guards never. Old exports, saves and base tables load and bake as
  before. The grenade pouches are part of her own kit, so they have no slider yet; the goggles follow
  after track C's hook lands.

## 4.44.0 - Animation tuner: Joints, Hands & feet, IK and Weapon rows for every move and action (climbs, rappel, co-op moves, reload, melee, landing, hit) (2026-10-22, PR #90)
- Moves and actions have their own rows in Joints, Hands & feet, IK strength and Weapon (COVERAGE gap 2): every
  traversal move (vault, mantle, step up, climb up, window vault, rappel, drop, hop, roll, wall kick, split, brace),
  each co-op move per role (leg-up, relay, throw, hang-down, rope, revive: A and B), and air, landing, slide, melee,
  reload, weapon swap, grenade throw and hit. A row blends in over the stance while its move or action plays (by the
  animation's own fade) and out after it; the tuner follows the strongest one. They bake like the other rows; old
  exports and saves load as before. The co-op partner picks its role row from its move state (the relay climb reads as
  the leg-up's climber; the revive has no row on the partner).
- Tuner by pad: LT / RT steps the state (or the move, or A / B on a co-op row) in every section again, B goes back to
  that picker, and the changed dot marks the right picker (the pickers' depth now differs per row).
- The debug overlay's Tune and Teleport lists stay hidden until their buttons open them (their display rule overrode
  `hidden`, so Tune always showed and the overlay covered much of the Anim Studio's scene on a small window).

## 4.43.2 - Tests: e2e-menus waits on sim time on slow software GL; the e2e-levels ladder chase is seeded; a NaN guard in the loop (2026-10-22, PR #94)
- The desktop e2e-menus "stall" after the animation tuner closed was not a freeze in the game: the test ran past the
  runner's 600 s limit on software GL (the match page drew about 1.5 frames a second beside the open menu page). The
  menu page now goes blank before the match page opens, and the tuner camera check settles on the sim clock: the suite
  takes 312 s instead of 894 s on the desktop. The Havok stacks seen earlier were slow frames, not a spin.
- The game loop treats a NaN or negative frame interval or time scale as no time, so a bad value can never stop the
  simulation for good (new unit tests for the loop across a long tuner freeze and its release).
- e2e-levels: the ladder chases run on the manual clock with a fixed random seed (they took 9-30 s of game time
  against a 30 s budget; now 10-15.5 s).

## 4.43.1 - Co-op: restart at checkpoint no longer crashes a joiner holding a guard (2026-10-22, PR #93)
- Co-op course: "Restart at checkpoint" (or a bay restart) while a guard is held no longer crashes the client; the hold is
  let go first (as Sector Ops does), and a disposed guard puppet counts as gone, so a stale takedown lets go of it.

## 4.43.0 - Animation tuner: add or delete keys in a keyed clip, mirror kept, baked (2026-10-21, PR #91)
- Animation tuner, Keys tab: "+ Add key" inserts a key midway between the picked key and the next (wrapping; with
  Mirror on in the own half, mirrored half a cycle on), posed as the clip plays there, so nothing changes until it is
  edited. "Delete key" removes the picked key (never key 1, never below 4 keys a cycle; with Mirror on its mirror goes
  too). Live at once; undo, reset, presets, export and import work as for every slider; works with key timing.
- The bake writes the key file with the new key list, regenerates `src/anim/tuneKeysMeta.ts` and prints the clip's
  rebake. An export with no add / delete bakes exactly as before; no clip changes.

## 4.42.0 - Wren skeleton: collarbones, 30 finger bones, smoother glove fingers; hands close on weapons again (2026-10-21, PR #88)
- Wren's hands close on her weapons again: since the 2026-10-20 rebake the in-game models
  had lost their hand-closing shapes, so only the close-up camera showed a grip. Her fingers are now real joints on
  the two nearest models (each finger bends at three knuckles), and the game's grip drives them on every Wren,
  the co-op partner included. The fingers got extra knuckle loops so they bend smoothly (Michael: "Go, smooth fingers
  too"): nearest model 39 809 -> 43 431 triangles, second 13 578 -> 14 242, both inside their budgets.
- The tuner's per-finger curl and spread (Hands & feet) now move each finger on its own instead of one average close.
- New joints for the next steps (T3, BRIEF item 21): a real clavicle on each side (a shrug or a shoulder pushed forward
  moves the shoulder joint itself; tuner rows come in S4) and the goggle on its own joint (CT Core's gear-offset rows
  will move it). At rest nothing moves: every joint that existed before is bit-identical for all 28 keyed clips, the
  procedural states and the partner (tests/animSkeletonIdentity.test.ts).
- Cost: about +2.3 us per Wren figure per frame (figure update 6.9 -> 9.2 us at the nearest model); +264 KB of models.

## 4.41.0 - Animation tuner and Anim Studio on phones: compact drawer or sheet, pad mode, touch camera (2026-10-21, PR #89)
- The animation tuner and the Anim Studio work on a phone (Michael's written exception to M21 for these two tools only;
  the game itself stays desktop only). A phone (a touch screen as the main pointer, short side 600 px or less) in
  landscape gets a side drawer on the right (38% wide: she keeps the left 62%); in portrait a bottom sheet (45% high:
  she keeps the top 55%). The studio frames her in the free area as on desktop. A grab handle collapses the panel to
  its header and expands it. Every touch target is at least 34 px (tabs, buttons, chips, sliders, steppers, the body
  map's joints, the playback bar); the text is 13 px, the padding tight; the panel scrolls inside itself; slider rows
  put the slider on its own line.
- (26b, Michael: "Smaller buttons, more compact. Adjust smaller with controller connected also") With a controller the
  last input, smaller again: 26 px rows, 11 px text, no touch minimum, one-line slider rows, the drawer 34% wide and
  the sheet 40% high. It switches live between touch and pad with the last input (a touch or a pad press), no reload.
- The F3 debug readout (it covered the left half) is off on a phone; Settings > "Debug readout (F3)" shows it (the
  choice is saved) and F3 still toggles it with a keyboard.
- Touch camera on the scene: one finger dragged orbits, a pinch zooms, two fingers dragged pan the point the view
  circles; a tap on her picks a part as a click does. Touches on the panel never move the camera. The pad works as
  before. Desktop sizes and a mouse keep the T2 layout unchanged.
- The Anim Studio's stage lights are placed after she moves and from the camera's position this frame (they lagged
  one frame, up to 0.1 m on a busy machine; e2e-studio's light check failed under load).
- New suite `e2e-tuner-phone` (required).


## 4.40.0 - Animation tuner: slide a key earlier or later in its clip, baked into the key files (2026-10-21, PR #87)
- Animation tuner, Keys tab: slide a key earlier or later in its clip ("◀ Earlier" / "Later ▶", one bake frame = 1/48
  of the cycle, or the time slider), previewed live. Keys keep their order, the first key stays at the cycle start, and
  with Mirror on the mirror key moves with its own key. Undo, reset, export and import work as for every slider.
- The bake (`scripts/anim-tune-bake.mjs`, and `scripts/anim-keys/apply-tune.mjs`) writes a moved key's phase into its
  key file, regenerates the tuner's key list (`src/anim/tuneKeysMeta.ts`) and prints the clip's rebake. An export with
  no timing edit bakes exactly as before; the 28 clips are unchanged.

## 4.39.0 - Animation tuner redesign: docked panel in the menu style, body map, pinned sliders, folding groups; brighter studio (2026-10-21, PR #86)
- The animation tuner redesigned (Michael: "the UI is currently very poor": hard to read, cluttered, hard to navigate,
  looks unfinished). It now looks like the game's menus (their font, colours and focus bar), with larger text and values
  (Medium, now the default, is 19 px at 1080p; S / M / L 16 / 19 / 22).
- Docked to the right edge, at most a third of the screen. In the Anim Studio the picture gives up the panel's width,
  so she stands in the middle of the free area. The studio hides the game HUD (health, compass, objective, weapon and
  ammo).
- Pick a part on a body map (her joints seen from behind, the gun, the whole body), from the part list (the pad's way)
  or by clicking her in the scene: only the sliders that move that part show, and the first one is selected. Click it
  again for every part.
- Rows sit in groups by what they move ("Right elbow", "Knees") that fold; the first group and the selected row's group
  start open.
- Pinned (☆ on a row, or Y menu > Pin) and recent sliders show as chips over the rows; a chip goes to its slider. The
  search moved there and searches every tab.
- The status line reads the stance really playing ("Walk · Rifle holstered", "Low ready · Rifle drawn"; outside the
  studio "No gun drawn" for "Unarmed").
- The studio's stage lights are brighter (key 2.4, fill 1.4, rim 1.5, top ambient 1.5; were 1.7, 0.9, 1.3, 0.8): she
  read dark at 1080p on the hardware GPU. They now face the camera (key and fill on its side, the rim beyond her) from
  any view: placed in front of her, the usual view from behind saw only the rim and the top light. The game's lighting
  is untouched.
- Pad: the D-pad reaches the part list and the chips (after the playback bar, before the tab's controls); the group
  headers fold with A; the Y menu gains Pin / unpin this slider and Show every part. No button moved.

## 4.38.0 - Marlow Yard fixes: co-op guard hold, station 2 bolt, camera cue grid only; pause menu restart at checkpoint and return to lobby (2026-10-21, PR #85)
- Co-op: holding a guard as the joiner no longer slows and shoves you (Michael: "coop player unusual and slow movement
  when holding guard"). The held guard stayed solid on the joiner's side and kept pushing the holder back; it is now
  non-solid there, as on the host and in solo (bullets still hit him). On the host, the joiner's hostage follows the
  joiner's drawn body instead of stepping ahead of it. Solo hold and carry speeds are unchanged.
- Marlow Yard station 2: the host can unbolt the door alone after the leg-up (Michael: "stays closed and locked").
  The host's own presses on course devices were counted as the joiner's, so the bolt checked the joiner's side of the
  door (and "Bolted from the other side" went to the joiner's screen). The same fix credits the host's own hold
  consoles, pickups and finish correctly.
- Camera cue: the pulsing red frame edge while a camera sees a player is gone; the cue is the red grid only (in
  electro, the white grid). The two red lines on station 3's floor are the painted edges of that camera's +-30 deg
  sweep (course spec M2), kept.
- Pause menu: "Restart at checkpoint" in Sector Ops and the co-op course (the section or the bay starts again, both
  players back at the checkpoint) and, in co-op, "Return to lobby" (both players back to the room lobby). Each asks
  first, with Stay focused. In co-op both are the host's: the joiner sees them disabled, "Host only".

## 4.37.0 - Joints, Hands & feet, IK and Weapon tuning bake into a base table every Wren reads, the partner too (2026-10-21, PR #84)
- Joints, Hands & feet, IK strength and Weapon tunes now bake (Michael: "make sure i have full control over every stance
  and every body part"; COVERAGE gap 1): `scripts/anim-tune-bake.mjs` writes them into a generated base table
  (`src/anim/animBase.ts`) instead of listing them as manual, so a tuned elbow becomes the default after the merge.
  Exports from before (version 1 and 2) bake too.
- Those four sections now act on every Wren rig, not only your own: the co-op partner's avatar and the Anim Studio's
  pair puppets show the base table and your live tuner edits; guards and other characters are never touched. The
  tuner's sliders are changes on top of the base table (reset them after a bake: the look stays).
- With the game paused (the tuner's Pause, the studio's pause) a Joints, Hands & feet, IK or Weapon edit now shows at
  once, as the Body and Gun sliders do (before it waited for the game to run).

## 4.36.0 - Animation tuner: key stepping, playback bar on every tab, twist and mirror keys, aim stances, own rows (2026-10-21, PR #83)
- Keys tab (Michael: "how do the keys work ... i dont understand how to view each frame"): picking a clip and a key in
  the Anim Studio plays that clip on the spot, paused on that key; "◀ Key" / "Key ▶" step the clip's keys (its mirrored
  half too) with the key list following; a readout names the key ("jog - key 2 of 8 (mirror of 6), frame 4"); the bone a
  slider edits is marked; a hint: "Key edits change one pose; whole-cycle changes go in the state tabs."
- A playback bar on every tab in the Anim Studio (Michael: "i should be able to alter speed/steps/pause etc no matter
  which window im in"): Play / Pause, ◀ Key / Key ▶, the time, the speed, the gun (Rifle / Pistol) and "On the spot"
  (moved from the header). Keys F9 play / pause, F1 / F2 a key back / forward, F8 on the spot; pad right stick left / right
  a key, up play / pause, L3 on the spot. Every pick plays at once: a state, a weapon (the stance swaps to it), a clip
  or key, a climb move, a co-op role.
- Keys for every arm and trunk joint (Michael: "there is a forearm twist that i cant see to fix"): Forearm twist, Upper
  arm twist, Shoulder forward / turn / out, Head bend / turn / roll and the Hips shift per key; the game plays them and
  the key bake writes them (new key fields `armX.twist`, `armX.twistUpper`, `armX.sh`, `head`; new clip channels `fore`,
  `head`, `sh`). Old key files load as before. The Joints part names the twists ("Right forearm twist").
- A "Mirror" box in the Keys tab (Michael: "if they were uneven i dont know how id adjust them separetly"): on (default)
  an edit shows on the other arm half a cycle on, as before; off, each key and arm is its own, and the bake writes the
  clip in full where the arms differ.
- Aim stances in the Anim Studio (Michael: "How do i just adjust aiming stance?"): aim standing, crouch aim standing
  and crouch aim moving, each with the picked gun.
- States that shared a tuner row have their own (COVERAGE gap 3): crouch run, aim standing (the glides keep "Aim
  moving"), crouched aim moving, the crouched wall states and carrying a body, and the rifle and the pistol their own
  Joints rows in the armed states. Saved values, presets and exports from before give each new row the value of the row
  it shared, so nothing tuned is lost.
- Key edits of the ready stance and the glides now show in play with the gun out (arms over the gun hold, the glides'
  trunk while aiming).

## 4.35.0 - Animation tuner: free mouse, selection highlight, Keyed tick box, on the spot from every tab, studio light (2026-10-21, PR #82)
- Animation tuner with keyboard and mouse (Michael: "the player camera locks the mouse in position"): the open panel
  leaves the pointer free in "Drag view": drag the scene with the left button to turn the camera, the wheel zooms (the
  free view's orbit), every slider and list stays clickable, and scene clicks never fire. F4 or the header button
  switches to "Game camera" (the normal captured mouse look; the panel ignores the mouse) and back; Esc in the game camera
  returns to drag view instead of pausing. Closing the panel gives play its normal mouse capture back. The pad is
  unchanged.
- The part being adjusted is marked (Michael: "clearly highlight the body part/weapon/animation"): the selected row has
  a yellow bar and bold name, the active tab a yellow underline, a "▶ part · state · row → target" line names it, and the
  scene shows a pulsing yellow ring (black edged, on top, readable on light and dark) on the joint, bone, both feet or
  knees, the weapon or the whole body the row edits.
- Anim Studio: a "Keyed" tick box beside the Loop list plays the state's keyed clip (cleared: the procedural state),
  instead of hunting the keyed loop in the list.
- Anim Studio: a state picked in any tab's state list plays that state's loop; "Loop on the spot" is on every tab (the
  header button "On the spot: on / off", F8, L3 on the pad).
- Anim Studio: stage lights that follow her (key, fill, rim and a soft top light, on her only), a brighter studio
  ambient, and a "Stage light" slider (View tab; bright by default, saved with the tuner's settings). The game's lighting
  is unchanged.

## 4.34.0 - Co-op: the partner sees guards' flashlights (2026-10-21, PR #81)
- Co-op: the joiner now sees the guards' flashlights. Each guard in the host's snapshot carries a torch bit in his
  enemy `al` (`AL_TORCH` 8; protocol 24 -> 25). The client lights one of its own map's torch slots per lit guard and
  places it with the host's code (`world/torches.ts`: `placeTorch`, `beamReach`, `addTorchSlots`) from the guard as
  drawn, so the picture, the haze and the client's light meter read the same light the host's guard perception reads
  (light parity). The aim is derived from the position, yaw and crouch already on the wire. Cost: 0 bytes for a guard
  without a torch, at most 1 byte for a lit one.
- `net/torchMirror.ts` (pure) is the client's mirror; `EnemyPuppet.torch` / `torchCrouch` feed it. A guard missing
  from a snapshot loses his torch at once; listed again, it comes back from that snapshot.
- Test hook: `Enemy.torchOverride` (true / false forces the torch rule; null in play). `EnemyManager.hasTorch(e)`.
- Tests: `tests/coopTorches.test.ts` (the wire round trip, host vs client light at points, the mirror), the protocol
  asserts at 25; e2e-coop checks a host guard's torch on, then off, on the client.

## 4.33.1 - No more GL program warnings when graphics settings change on a hardware GPU (2026-10-21, PR #79)
- Hardware GPUs: no more "GL_INVALID_VALUE: glGetProgramiv: Program object expected" warnings when the post stack is
  rebuilt (a graphics setting change). A shader program that is still compiling in parallel is now deleted only once its
  compile finishes (`src/core/babylon.ts`). e2e-desktop under `E2E_GPU=1` passes its console-errors check again
  (backlog 27).

## 4.33.0 - Animation tuner laid out for the pad: tabs, drop-downs, one step at a time (2026-10-21, PR #80)
- Animation tuner layout pass for the pad (Michael, 2026-10-21: "Not practical for controller use. It's such a long
  list"): tabs across the top, LB / RB (or a click) cycle them: View, Body, Hands & feet, Weapon, Stepping, Weight,
  Camera, Keys, Co-op, then any later section, then Settings. One step at a time inside a tab: a drop-down for the part
  (when the tab holds more than one), one for the state (and weapon then state, clip then key), then that group's
  sliders. Every list opens as a visible drop-down (A or a click; D-pad or arrows move, A / Enter picks, B / Esc backs
  out); a pick steps the focus on to the sliders, B from a slider goes back to the picker.
- Every value shows at all times, light on dark: the panel sets explicit colours on all its controls (the old focus
  mark cleared the buttons' background, and a value at its default lost its colour: white on white, dark on dark).
- The panel scales to the screen (Small by default; Settings > Size: Small / Medium / Large, saved in the tuner's own
  IndexedDB store, key `ui`). The hint strip is reserved space at the bottom, pad glyphs with a pad, key and mouse help
  otherwise, switching live.
- Plain short labels ("Foot width", "Knee out", "Hip height", "Lean", "Right elbow bend"), units beside the values; ids,
  saves, exports and the bake table unchanged.
- Pause stops the game: under the pause menu no synthesised input (the studio loop, the free view demo) moves her and
  the menus get the pad; "Pause game while tuning" (Settings, on by default) holds the game still while the panel has
  the pad (not in the Anim Studio, where Play / Pause rules, nor in co-op).
- Camera snaps (View tab: Front / Side / Back / Top) lock: the orbit holds that angle to her facing as she turns and
  moves, until Unlock or another snap; the pad stays on the panel. They work outside the studio too.
- Anim Studio: picking a loop sets the tuner's state to match (body state, joints, reach, hands, stepping, weight, the
  clip's keys, the co-op role, the climb move); "Loop on the spot" (default on): a moving state walks a treadmill (the
  gait runs, the root is held, the feet slide back with it) and a clip plays in place; off, both walk the 2 m circle.
- Pure parts in `src/ui/tunerLayout.ts` (`tests/tunerLayout.test.ts`); e2e-menus and e2e-studio follow the new
  navigation (tabs, the drop-down, values shown, pause, the snap lock, loop on the spot).

## 4.32.3 - e2e-stealth-ai wall peek picks its spot with the guard's own eye (2026-10-21, PR #78)
- e2e-stealth-ai's wall peek block keeps a guard spot only if the spawned guard's own eye sees the peeking head and
  not the chest. It picked the spot with a 1.55 m eye guess, 4 cm below a grunt's eye, so the real guard could see the
  chest too and "the guard there sees the peeking head only" failed now and then (#65, #71). Test only.

## 4.32.2 - The last of pad aim assist removed (G16) (2026-10-21, PR #77)
- No aim assist (G16): the last of it, the pad's `gamepad.aimAssist` setting (default "standard", read by nothing since
  the aim-assist code went), is removed; an old stored value is dropped when settings load. Tests and the e2e helpers
  that switched it off no longer touch it. No save change.

## 4.32.1 - GPU shot rows for Marlow's low cells, airlock lids and dressing; warehouse s1 view re-aimed (2026-10-21, PR #75)
- Test scripts only: `scripts/shots-ctcourse.mjs` gains rows for two 4.5 m low cells, the 3.2 m airlock lid seen from
  below and the S1 desk, S3 monitor wall and S8 coffer (they need the marlow-variety geometry, PR #62).
  `scripts/lamps-shots.mjs` (Warehouse lamp look) is now tracked, with the section 1 workshop view re-aimed into the
  room (it was behind a wall). GPU on #62 99349d64 and master: all 23 Marlow rows agree within 0.02.

## 4.32.0 - Marlow Yard as an underground bunker: ceilings, lamp fittings, airlocks, lifts, station dressing (2026-10-21, PR #62)
- Marlow Yard is an underground training bunker (Michael 2026-10-20, the approved audit shortlist;
  `docs/marlow-bunker/`). Ceilings per test cell (low cells 4.5 m, the laser cell 5.5 m, the climbing and kill-house
  halls 7.5 m), perimeter and airlock walls 6 -> 7.5 m, no moon, a dark sky and close fog. The open floor still reads
  0.30 (all fill now, Michael's choice): every light level the course was tuned on is within 0.08 (`LIGHT.md`).
- All 29 lamps have fittings, cool white: pendants on rods at today's heights in the high halls, flush strips in the
  low cells and the laser cell (faintly red), flush panels in the kill-house, caged bulkheads under the airlocks' new
  3.2 m lids (chamfered haunches). Compensated by measurement.
- The station 3, 6 and 8 walls are bulkheads up to the ceiling; station 4's wall runs to its ceiling with a header from
  4.6 m over the laser gap (the throw passes under it). No new climbs: under the ceilings the only lips are the
  planned ones (S2 / S7 walls, the S5 roof front, the S7 stair); the 6 m perimeter lips once hangable from the high
  wall tops are gone.
- Dressing (no collision, no light change except the ribs and haunches near the ceiling): ceiling ribs, haunches, LED
  strips, wall panel seams, a colour band per cell, door frames with status lamps, the entry lift (west) and the
  goods lift (east); readability paint: the leg-up mark up the S2 / S5 / S7 wall faces, the S3 camera's sweep edges,
  the S4 beam emitters, the S5 hatch cover, the S6 "pair" line, the S7 rope anchor.
- Variety (marlow-variety, folded into this PR; Michael 2026-10-21, the marlow-bunker polish list;
  `docs/marlow-variety/`): a sentry desk at the station 1 post and a blast-door frame round the entry lift; a monitor
  wall in the camera cell; plant-room faces at the south pockets and one-way-glass instructor booths at A3 / A4;
  plywood and painted windows on the kill-house; frames round the station 6 scanners and server racks; the station 7
  stair painted as training blocks; a coffer with a faint green LED ring over the exit; a hazard frame on the laser
  release; black and white hazard stripes on every door frame. No light change at the 196 test points, no new ledge
  or climb (only the 2 m racks are solid, no lip), the routes stay clear.
- Text: "fence" is "wall" (station 4 panel, radio and objective; the training guard's line); the spec carries the
  bunker fiction and an element register.
- GPU look (2026-10-21, Menu Notes): fittings and ceilings right, the floor between pools not darker than its value;
  meter and field agree on all 17 rows once the shot script waits for sim time (#72).

## 4.31.0 - Camera cue: a faint red laser grid where a security camera looks (2026-10-21, PR #63)
- Security cameras show a faint red scan grid on the floor and walls they see, sweeping with the pan (Michael M1
  "Always, faint"); stronger in electro vision, its edge pulses while the camera sees a player, it fades when the camera
  is jammed, off or shot. Render only: same field, range and static-collider line of sight as detection, never a light.
- Fix round: in electro the grid is a clear white lattice (it vanished in the post); the co-op client's grid pulses too
  (the host's camera test run on both bodies, nothing sent); the cue's rays are cast per fixed step on both sides.

## 4.30.2 - Decisions G192-G228 folded from the roadmap (2026-10-21, PR #76)
- Docs only: Michael's answers from 2026-10-19 to 2026-10-21 move from `docs/ROADMAP.md` "Decided" into
  `docs/DECISIONS.md` as G192-G228, each also in `docs/design-bible.md`.

## 4.30.1 - Orchestrator docs: 2026-10-21 roadmap, STATE, account handoff plan (2026-10-21, PR #74)
- Docs only: `docs/ROADMAP.md` (Michael's overnight answers, Done 4.21.0-4.30.0), `docs/orchestrator/STATE.md`,
  `docs/orchestrator/HANDOFF.md` (the weekly-limit account switch), `docs/backlog.md` (GPU GL warning, e2e-stealth-ai
  wall peek).

## 4.30.0 - Tuner bake script: an export written into the game defaults, with a dry-run diff (2026-10-21, PR #73)
- Animation tuner bake (dev tool, no game change): `node scripts/anim-tune-bake.mjs <anim-tune-YYYY-MM-DD.json>
  [--dry-run] [--only section,...] [--allow-shared]` writes an export's values into the code defaults (body, gun, camera,
  speed, stepping and weight constants; the Keys section's key JSONs through the apply-tune functions, with the Blender
  rebake commands printed, never run), so after a reset of the baked sliders every slider reads identity with the same
  look. The dry run prints the diff and a table (section, group, slider, value, result, target). A slider whose groups
  share one code value bakes only when they agree ("manual: shared target" otherwise; `--allow-shared` bakes a single
  changed group and warns); sliders with no code value (joint, hand, IK and weapon tables, most clip-data sliders, the
  co-op role / contact and Traversal moves sections from #71) are listed "manual: no code target". Refuses a wrong magic or version, a value beyond its wide range, a target not found
  exactly once and any file outside `src/` and the key JSONs. A ledger (`src/anim/tuneBakeLog.json`, `group|id=value`)
  means a baked value is never baked twice, in a re-run or a later export. Mapping: `src/anim/tuneBakeTable.ts`; logic: `src/anim/tuneBake.ts`; tests:
  `tests/animTuneBake.test.ts`; `docs/anim-tuner/BAKE.md`.
## 4.29.0 - Anim Studio PR 2: co-op pairs, guard holds, traversal prop rig and loops (2026-10-21, PR #71)
- Anim Studio pairs (Michael, via the orchestrator: "fine tune coop animations with the same freedom, traversal etc.
  coop should show me both characters also"): each co-op team move plays with BOTH operators (two Wren puppets, Wren
  herself hidden) on one clock, through the game's own paths and timing, no network: leg-up, ledge relay, partner throw,
  hang-down, two-person rope and revive. Scrub, step and pause move both at once. The holds pair Wren's hold clips with
  the guard's (idle + held hands, back + stumble, choke + sag, knife + collapse) on one clock; the Body section's hold
  gap / side set their spacing.
- New tuner sections (registry): one per co-op move with role A, role B and contact groups (body forward / up / side,
  turn, lean, crouch, hand and foot grips, pose timing; contact offsets between the two, weighted by the move's contact
  window), and Traversal moves (vault, mantle, step, climb-up, window, rappel, drop, hop, roll, wall kick, split) for the
  moves the Body section has no state for. Live in real play for the local player's own role only; the partner always
  plays the shared defaults; nothing goes on the wire; visual only.
- The studio is a 28 m room with a traversal rig round the walls at the engine sizes: the co-op team block (4.4 m lip,
  a rappel point), a 2.4 m ledge wall, a 1.0 m low wall, a platform with a ladder and a drainpipe, a horizontal pipe, a
  hang bar, a vent duct, a window and a door. Traversal loops walk Wren to a prop and play the real move by synthesised
  input, then reset and repeat: vault, ledge grab + shimmy + climb up, ladder up and over, drainpipe, pipe hand over hand,
  hang bar legs up / inverted, vent, window, door, rappel, back to the wall.
  Detail: `docs/anim-studio/REPORT-2.md`.

## 4.28.1 - shots-ctcourse waits for sim time after each teleport (2026-10-21, PR #72)
- Test script only: `scripts/shots-ctcourse.mjs` waits 0.3 s of sim time (the game clock) after each teleport before
  reading the light meter and the light field. The meter updates every 0.1 s of sim time, and at Epic boot 800 ms of
  wall time could be under 0.1 s of sim, so s1-bay read a stale 0.970 against 0.606. It also refuses a foreign server
  on its port (the served `index.html` must match `dist/`). GPU at 2bd82f31: all 17 rows agree within 0.02.

## 4.28.0 - Smooth world: voxels off by default, baked lamps on the smooth path (2026-10-21, PR #58)
- The world draws smooth by default (Michael, 2026-10-20: "there still looks to be voxel graphics in the map which is no
  longer the goal"; he chose "Turn voxels off by default"): the level's boxes and cylinders in PBR with the CC0 surface
  atlas, the box detail pass at the Detail tier, smooth characters, weapons and props. `?voxels=1` keeps the voxel look
  for comparison (`?voxels=0` still means off). `?gfx=min` keeps its fast path (standard materials, no baked lamps).
- Light parity: the baked lamps (`BakedLamps`, the darkness curve, the ambient-grid fill, the baked moon, closed doors)
  now render on the smooth path too, so the picture reads the same bake as the light meter and guard perception.
  `tests/smoothWorldLight.test.ts` bakes Marlow Yard from the voxel and the smooth builders and proves the bakes and the
  light field are identical; `tests/lampLevel.test.ts` checks the level keeps its fill under night vision.
- The smooth level's fill and probe light follow the voxel walls' sky formula (a render-only sky bake from the canonical
  shapes, `src/world/levelFill.ts`): the first GPU shots showed smooth walls brighter than the light meter (annex walls
  about 20x the voxel fill). `tests/levelFillParity.test.ts` checks seven Marlow Yard points within 10%.
- Without voxels: rain stops under roofs through a roof grid from the canonical light shapes (`src/world/roofGrid.ts`),
  moving casters under a roof leave the moon cascades, fog shafts use the baked moon; voxel GI and bullet chips are
  off (decals instead), ray-traced reflections fall back to SSR.
- Tests: e2e-desktop's voxel and RT parts pass `&voxels=1`; e2e-lightbake adds a `gfx=epic&voxels=1` config and checks
  the smooth Epic path. Polish list: `docs/smooth-world/POLISH.md`.

## 4.27.0 - Tuner Weight section: momentum, lean, plant and landing load, springs, anticipation (2026-10-21, PR #70)
- Animation tuner: a Weight section (per holstered walk / jog / run, crouched, drawn) for hand-tuning weight in the
  movement: momentum (time to speed, stop time, turn rates, a stop overshoot; gameplay, local only), lean into
  acceleration and turns and a counter-lean on stops, foot-plant and landing load, springs on the chest, head, arms and
  carried guns, an anticipation dip on starts and vaults, and a camera follow-lag / dip signal for the camera section.
  Every slider defaults to today's movement and pose exactly. Detail: `docs/anim-tuner/WEIGHT.md`.

## 4.26.0 - Anim Studio: a stage with the loop player, skeleton, feet and onion-skin views, camera snaps, undo, A-B and presets (2026-10-21, PR #69)
- Anim Studio (dev) (Michael 2026-10-21: "I want freedom to manipulate the body/animation as needed ... a basic stage
  similar to the old main menu that allows me to make all the adjustments on the spot using controller or k&m"): a row in
  the main menu and in Pause (single player only) opens a plain stage (a dark room with a 1 m floor grid, warm key, cool
  rim and soft fill lamps; `?autostart=studio`) with the animation tuner docked, a Studio section at its top and the
  debug overlay's crab readout.
- Loop player: every keyed clip (all 28 in `src/anim/clips/keyed`, the walls, holds and guard clips that the game does not
  play yet included) sampled straight onto Wren, in place with treadmill feet or with root motion along a 2 m circle; the
  procedural states (idle, walk, jog, run, crouch idle, sneak, crouch walk, low ready, aim glide forward / strafe / back)
  by synthesised input on the circle. Play / pause, a key back / forward, scrub, speed 0.1-2x (above 1x only in the
  studio), mirror, root motion on / off. An optional guard figure stands at the hold offset (guard clips play on it).
- Viewing aids on a 2D overlay (no scene meshes): skeleton, foot contacts and foot trails, onion skin (the previous / next
  key, faint), a turntable (the orbit view circling at 10-90 deg/s) and front / side / back / top camera snaps.
- Snapshots in the tuner (in and out of the studio): undo / redo of every tuner change (a drag is one step; Ctrl+Z /
  Ctrl+Y, the Y menu), A/B compare, named presets saved in the tuner's own IndexedDB store (never the main save).
- Leaving the studio puts the time scale back to 1x and resets every studio switch; gameplay never reads studio state.
  Detail: `docs/anim-studio/REPORT.md`.

## 4.25.0 - Tuner v2: per-joint offsets, hand and foot placement, IK strength, weapon grip and fingers, stepping, per-key editing (2026-10-21, PR #68)
- Animation tuner: four new sections after Camera, wired through the section registry. **Joints**: per-state pitch / yaw / roll offsets for 21 joints, with a mirror lock (group `joint.options`). **Hands & feet**: hand and foot IK target offsets and hand rotation, per weapon and state. **IK strength**: per limb and state, 0 = FK (rest + joint offsets). **Weapon**: gun scale (visual only), gun in the hand, support hand, trigger finger, finger curl, per weapon and state. Each follows the game state and weapon, saves, exports, resets and works with the pad like the other sections; at the defaults nothing changes.
- Animation tuner: a **Stepping** section (item 3, after Weapon): per gait (still, walk, jog, run, crouched walk / run) foot lift, plant lock strength, step duration, foot-slide tolerance, a 3-point stride curve, toe-off and heel-strike roll and the replant threshold, as multipliers on the foot planner's own values (default 1 = unchanged). Feet stuck while running: the run's trailing foot stays planted to the leg's stretch limit; try Stepping > run > replant 0.8.
- Animation tuner: a **Keys** section (item 4, after Stepping): pick a keyed clip's key (`walk` key 1 = phase 0.125,
  every key of every clip in `scripts/anim-keys/keys`) and turn the pelvis / spine / chest / neck (pitch, yaw, roll),
  the upper arms (flex, abd), elbows (bend, inward) and wrists (pitch, yaw, roll) at that key only; the clip plays the
  edit live, blended to the neighbouring keys (a mirrored clip's other half follows). Export as usual, then
  `scripts/anim-keys/apply-tune.mjs <export>` writes the edited key files for `build.mjs` to bake. No edits: the clips
  play exactly as baked. Detail: `docs/tuner-v2/ITEM4.md`.

## 4.24.0 - Crouched movement and the wall set reworked (anim-rework slices 4 and 5) (2026-10-21, PR #66)
- Crouched movement (slice 4, `docs/anim-rework/S4-REPORT.md`; the real-world operator standard, BRIEF 3 "Stealth"):
  - holstered crouched: the keyed sneak, crouch walk and crouch run as one continuous speed blend (no pop), the knees
    and feet under the hips (knees 0.7 x the hip width, was 1.6; feet about 5 cm off the line, was 9-10), arms along the
    body (elbows 2 cm out, was 17-18), the crouch run leaning forward (about 37 deg) and low without the knee dragging;
  - the crouched idle when holstered is a deep balanced squat with each hand resting on top of its knee, palm down,
    fingers forward (was a one-knee kneel with the hand upside down and off the knee), slow breathing (a 12 s cycle of
    three breaths), a slow head scan; with a gun out she still kneels, its breathing slowed (a breath every 5 s);
  - crouched with a gun out: the crouched legs under the low ready and aim; the crouched aimed strafe is the short
    shuffle step (was a 35-44 cm wide crab with crossing feet);
  - stand <-> crouch in every state blends on the 0.22 s stance curve with no snap (the old crouch run to standing
    snapped the legs); standing up from a sneak re-steps the feet under the hips;
  - new e2e-anim checks: the crouch and sneak gaits, crouched idle / start / stop / run / low ready walk / aimed idle /
    aimed strafe, the knee hand, and a stand <-> crouch pop check; e2e-clip checks the arms against the legs crouched.

## 4.23.0 - Tuner: camera and speed sliders, free view, freeze, full pad control, import, bypass, search (2026-10-21, PR #65)
- Animation tuner: a Camera section (Michael 2026-10-21: "include camera adjustments to the animation sliders too, so
  I can fine tune camera locations too"). A picker per camera state (explore standing / crouched, low ready, aiming
  rifle / pistol, back to wall, peek, climb / hang, vent / crawl, holding a guard) that follows the current state, with
  sliders for distance behind, height, shoulder side offset, look-at height, FOV, aim zoom, transition blend time,
  follow damping, boom pull-in rate and collision margin. A grey "today: ..." line under each slider shows the value
  the game uses now. At default the camera is unchanged; the wall collision still applies after the sliders. Same
  save, export, resets and pad control as the other sections. Detail: `docs/anim-tuner/CAMERA.md`.
- The tuner's sections now come from a registry (`src/anim/tuneRegistry.ts`) so other jobs can add sections from
  their own files; saves and exports are unchanged (API: `docs/anim-tuner/STATE.md`).
- Free view (Michael: "a free view camera so I can view the animation from any direction freely"): Orbit circles the
  player (right stick / mouse, zoom on the triggers / wheel) while the player still walks; Fly is a detached camera,
  and the player stands or walks a demo loop (walk, jog, run, crouch walk, aim strafe). The game keeps running;
  gameplay never reads the free camera, and turning it off gives the game camera back exactly. Hide HUD toggle.
- Time: a game speed slider (0.1-1x, slow motion in normal play), Pause / Resume and Step (one frame); View handing the
  pad back to the tuner freezes the game mid-animation (on by default) and View to the game resumes. Off in co-op.
- Speed section (gameplay, local only): creep / sneak / walk / jog / run standing and crouched, aimed glide forward /
  strafe / back, wall slide, ladder / pipe / shimmy / duct crawl, each with today's value. Tests, e2e and co-op use the
  defaults until the values are folded in (the panel says so).
- Every tuner control by pad, with a new map: D-pad moves through every control, A selects or edits (a slider changes
  only in edit mode: left / right or the stick, LT fine, A keeps, B cancels), X resets the row, Y opens a menu (export,
  share, reset group / all, clear log, import, changed only, barrel marker, wide ranges), LB / RB jump between sections,
  LT / RT switch the state, R3 held shows the untuned animation, View swaps game / tuner, Menu closes. The map shows in a
  strip at the bottom of the panel and in `docs/anim-tuner/STATE.md`.
- Smooth state changes (Body and Gun ease over 0.1 s instead of popping), Import of an exported JSON, "wide ranges"
  (every range doubled), typed values in each row, a bypass (R3 or Backquote held), and a slider search box.
- Fix: the barrel marker turned half the screen grey. It is now drawn on a 2D overlay (no scene meshes, no per-frame
  Babylon allocation).

## 4.22.0 - Sector Ops lamp fittings, translucent roof sheets, warehouse dressing (2026-10-21, PR #59)
- Sector Ops Warehouse lamp fittings (Michael 2026-10-20: "The sector ops lights are not sitting properly on the
  ceilings, some are even above ceilings or just floating"; quick, believable, three types, in code). Every lamp of the
  three sections is now a fitting fixed to the structure: under a ceiling, a dome high-bay on a drop rod (halls) or a
  fluorescent batten on two hangers (rooms, corridors, decks), a strut to the roof strip when it hangs under a skylight
  gap; with no ceiling over it, a caged bulkhead on a bracket arm on the nearest wall (door lamps, signs, the yard
  floods); on the roofs, a dome on a mast. 98 of 99 lamps mounted (S1 33 of 34, S2 23, S3 42); the one left keeps its
  box (S1 yard (11.25, 2.45, -22.45), inside the container). `world/lampMount.ts` (pure) mounts them at level build.
- The three models (`world/fixtureModels.ts`, pure): built from boxes and frustums, one body mesh and one glowing face
  mesh per type, thin-instanced; one shared dark steel body material (PBR, lit by the lamp bake) and the bulbs'
  emissive material for the faces (dark when the lamp is out or shot); every rod, hanger, arm, strut and mast is one
  box mesh. 7 draws for all of them, built once at load. Other maps keep their glowing boxes.
- No light moved: positions, radii, intensities and the fixture boxes the bake samples are as before, so the light
  meter, guards and the bake read the same (the section light tests pass unchanged). A lamp's shot box is still its old
  box (a batten's ends are not a target yet).
- Test: `tests/warehouseLamps.test.ts` (each section: every fitting's mount ends within 3 cm of the ceiling underside,
  wall face or roof under it, nothing cuts the fitting or its rod; the exception list; the models).
- Roof sheets (Michael: the open sections are "usually a opaque type of corrugated plastic sheet that allow light in but
  cant be passed through"): every open section of the hall roofs (the four skylight gaps across all three sections,
  section 3's 2.95 m open strip at z -8.95 to -6 and the slit over section 2's south wall) is a pale see-through
  corrugated sheet, solid (collision only; overhead, no ledges). It is not in the light bake and casts no shadow, so the
  moon reaches the floor under it exactly as the bake, the meter and the guards have it (dimmer-than-sky light through
  plastic needs a translucency rule in the bake, G45, not built). Section 1's roof hatch and smoke vent are routes (R2)
  and stay open. `LevelBuilder.sheet`, `world/roofSheets.ts` (pure); one more draw.
- Detail (Michael chose "Walls + ceiling + dead-space clutter"; `world/maps/warehouseDress.ts`, pure): along the hall
  walls of all three sections pipe runs (256 m), cable trays (118 m), 16 signs, 12 fire points (extinguisher and
  panel), 39 hazard stripe bands at doorways, a roller door on section 2's north wall; roof trusses on the frame lines
  (81 panels; the top chord only over the high routes) and a duct in section 3; floor lanes and bay plates by the
  racks. 15 floor items in dead space: pallet stacks, drum pairs and cartons in the halls, lockers and a desk in side
  rooms. Every piece is a visual `detail` box drawn with the level's own box mesh (no new draw, out of the bake);
  the floor items also get one collision-only box (no cover face, no ledge). Each kind is skipped where it would cut a
  solid piece, a traversal anchor, a door, switch or device, a lamp or its mount, or where it would hang under 1.8 m
  over a walkable top (rack tops, decks, roofs); floor items stand 1.5 m clear of every section route, 2 m clear of
  every guard patrol and post, and off every sightline a guard has today to a route within 20 m. Not placed: the
  second roller door (section 3's east wall), the forklift (no dead space fits one) and boxes on the racking shelves
  (the racking's voxel art already holds loads at the voxel presets).
- Test: `tests/warehouseDress.test.ts` (the roofs closed but for the route openings, the sheets solid; the light shapes
  the same as without the dressing; no piece cuts a solid one, 1.8 m headroom; floor items clear of routes and
  patrols, on the floor, with collision).

## 4.21.1 - e2e-pad steps over the tuner item; steadier heap test (2026-10-21, PR #64)
- e2e-pad's pause menu walk steps over "Animation tuner (dev)" (added before Quit by the anim-tuner job); "focus Quit"
  failed every run, hidden by KNOWN FLAKY. analogGear "allocates nothing per update" warms up and takes the smallest of
  three passes (a single pass read 3.5 MB on a loaded CI runner). Test only.

## 4.21.0 - Selection wheel sized to the screen, radial ring look, FPS banner bottom left (2026-10-21, PR #61)
- Selection wheel restyle (`docs/wheel-ui/SLICE1.md`): the wheel sizes itself from the screen (130 + 0.36 x height px:
  518 px at 1080p, was about 430; about 250 px on an 844 x 390 phone) inside the safe area, never under the top HUD or the
  hint box; SVG ring segments with the highlighted one lit, icons and counts, the vision slot showing its mode, the
  item name in the centre. The FPS banner moved to the bottom left corner (it covered the compass on a phone).


## 4.20.1 - The animation tuner works with the pad (2026-10-21, PR #60)
- Animation tuner pad control: the panel takes the pad when it opens (Pause > Animation tuner, Settings, F3 > Anim).
  D-pad up / down pick a slider (body rows, then gun rows), left / right nudge it by its step (held: repeats, x5 after
  1 s), the left stick X nudges in analogue steps, LB / RB switch the focused section's state group, Y resets the
  slider, A exports, B closes, View moves the pad between the tuner and the game ("PAD: tuner" / "PAD: game" on the
  panel). The focused row has an amber outline. While the tuner has the pad the game and the menus get none of it.
  Keyboard, mouse and touch are unchanged. Detail: `docs/anim-tuner/PAD.md`.

## 4.20.0 - Animation tuner: live sliders for gaits, poses and the gun hold, with export (2026-10-21, PR #56)
- Animation tuner (Michael 2026-10-20: "add the sliders ... Doesn't have to look pretty, just functional"): F3 > Anim
  opens a slider panel top right (the anti-crab readout stays top left). A body-state section (idle, walk, jog, run,
  crouch idle / sneak / crouch walk, low ready, aim, crouched aim, back to wall idle / slide / peek, ladder, pipe, ledge,
  vent, crawl, hang, hold) and a gun-hold section (rifle and pistol x low ready / aim / crouched aim), each following
  the current state (untick "follow" to pick one). Sliders cover foot width, knee out, knee lift, step length, pelvis
  height / crouch depth, forward lean, arm swing and its growth with speed, elbow out, head turn, peek lean, gap to the
  wall, body distance to the ladder / pipe / guard, hand and foot reach and spacing, gap to the guard, and the gun's
  position, pitch, yaw, cant, sight height, head drop and elbow tuck; a barrel marker shows where the muzzle points.
  Changes apply live to the local player only (guards and the partner's copy are untouched; nothing on the wire), save
  to the tuner's own IndexedDB store, reset per slider / group / all, and Export downloads `anim-tune-<date>.json`
  (every changed value, its default, a timestamped change log). Every default is identity: nothing changes until a
  slider moves. `src/anim/tune.ts`, `src/ui/animTunePanel.ts`, `src/save/animTuneStore.ts`; report
  `docs/anim-tuner/REPORT.md`.
- Pass 2 (pad and phone, Michael: "I will wait for the anim tuner"): the tuner also opens from the pause menu ("Animation
  tuner (dev)", which resumes with the panel open) and Settings > Graphics, without F3, and stays open until its x. It
  folds to a header bar, scrolls on a short landscape screen, is at most 45 % wide, has 28 px touch rows, keeps its
  touches away from the game, and Share / Copy sends the export through the share sheet, the clipboard or a text box.
  Two new walk / jog / run sliders for the stiff walk (CT Core): stance knee flex and trunk / shoulder counter-rotation,
  at the top with arm swing amplitude and step length (cadence at the same speed).

## 4.19.1 - Faster, steadier e2e: co-op suites on sim time, full run ~20 min at E2E_JOBS=2 (2026-10-20, PR #57)
- Test code only, no game change. The full `npm run e2e` at `E2E_JOBS=2` passes on a loaded machine without reruns
  (`docs/test-speed/STATE.md` "Runs" and "Findings and fixes").
- e2e-ctcourse runs as three station groups in the full run (`e2e-ctcourse:1..3`); named alone it runs all eight.
- Load-safe waits: no background-tab throttling, 120 s page navigations and match loads (`LOAD_MS`), one-poll pad
  `press` / `stick`, `window.__afterSim` for timed in-page taps, sim-clock waits in e2e-stealth and e2e-course's latency
  checks, condition waits for fades and toasts in e2e-menus and e2e-pad, and station 6's late press on the client's
  own frame.
- A music fetch that fails under load prints "(ignored: ...)" instead of failing the console-error check.
- `scripts/laptop-runner.ps1`: the laptop test runner (one request at a time, detached worktree, `heavy.lock`,
  BelowNormal, port 4191).

## 4.19.0 - Drawn movement: low ready, aiming with the glide (no crab strafe), the sling draw (2026-10-20, PR #54)
- Drawn movement, low ready and aiming (slice 3, `docs/anim-rework/S3-REPORT.md`; the real-world operator standard,
  BRIEF section 3): with the gun out, standing, the legs play hand-keyed clips. Still: a ready stance, feet about hip
  width with the support foot 18 cm ahead, knees soft. At low ready the walk, jog and run legs and carriage (no lean
  below the run). Aiming, the glide: a short shuffle side-step that never crosses the feet (the aimed strafe was a crab,
  knees 2-2.9 x the hips and a foot up to 56 cm off the line; now 0.6-1.2 x and 18 cm at the widest), shorter steps
  backwards and forwards, the hips over the feet and the chest square to the gun. The aimed strafe is slower: 0.7 m/s
  at full stick (was 1.26). The rifle's low ready points the muzzle about 40 deg down in front of the feet (was 46 deg
  and 34 deg across the body); the pistol's low ready is a compressed ready close to the chest; the elbows stay in
  aiming (were 7 cm out). LT from holstered with the rifle is its own sling draw (0.75 s): the gun comes off the back
  round the right side, hangs muzzle down under the arm, then swings up into the shoulder. Crouched drawn is unchanged
  (slice 4). No wire change (PROTOCOL_VERSION 24).

## 4.18.1 - Phones render at a fixed 50% resolution (2026-10-20, PR #55)
- Phone (Michael 2026-10-20: "when it changes render resolution the screen flashes. Keep 50% render resolution the
  default and don't let it automatically adapt"): a fixed 50% of native, no dynamic resolution on phones. The 60 fps cap
  stays (Michael chose it over a 30 lock; Marlow Yard runs ~32-35 fps on his phone). Desktop unchanged.

## 4.18.0 - Sector Ops Warehouse sections 2 and 3 rebuilt, section 1 lamp pass (2026-10-20, PR #50)
- Sector Ops Warehouse sections 2 and 3 rebuilt as greybox prototypes (`docs/warehouse-redesign/SPEC.md` 2.2 / 2.3,
  `src/world/maps/warehouseS2.ts`, `warehouseS3.ts`): section 2 is a storage hall with real racking, a cage and three
  routes to the case; section 3 is an assembly hall with a mezzanine deck, a production office, a plant room, a supply
  duct and a crane walkway, with three routes to the terminal. 8 and 9 guards with jobs; no heavies, snipers or dogs
  (G155). Higher walls and parapets keep each section sealed to its connector.
- Lamp pass on sections 1-3 (Michael's section 1 walk, M1): routes and takedown spots read 0.40-0.55 without night
  vision (under the level where guards see the player fully), objectives and work areas to 0.8, dark pockets 0.30 or
  less; light-field tests pin each class with a minimum and a maximum (`tests/warehouseS1Light`, `S2Light`, `S3Light`).

## 4.17.0 - Holstered movement rework: upright walk, slower run, natural arms, starts, stops and turns (2026-10-20, PR #52)
- Standing holstered movement (slice 2, `docs/anim-rework/S2-REPORT.md`; the real-world operator standard, Michael M6
  2026-10-20): new hand-keyed walk, jog, run and idle clips play as one speed blend from a creep to the run (no gear
  pops). The walk is upright with the knees and feet under the hips and the arms hanging along the sides; the arm swing
  grows with the pace and the forward lean comes in only toward the run. The run is 4.0 m/s (was 4.5) with longer
  strides and fewer steps (3.2 a second, was 4.7; the walk 2.4, was 2.6). The idle breathes, shifts its weight and scans
  with the head, feet about hip width, arms in. Starts no longer slide a foot, turns and direction changes no longer
  slide the planted feet, a turn from a standstill no longer hops on both feet, and the hips trail the chest in turns.
  The wide walk came from the foot planner pushing every left step 13 cm from the right foot; fixed. Crouched, drawn
  and aiming movement are unchanged (slices 3 and 4). No wire change (PROTOCOL_VERSION 24).

## 4.16.2 - Phones render at 75% of native resolution (2026-10-20, PR #53)
- Phone (Michael 2026-10-20: "Cap resolution at 75%"): after 4.16.1 a Warehouse benchmark held 55-60 fps but fell to
  26 fps late in the route. Phones now render at 75% of native, dynamic resolution down to 50% on long frames. Light
  and shadows unchanged (Low preset), 60 fps cap. Desktop unchanged.

## 4.16.1 - The 60 fps cap holds on 90 and 144 Hz screens; phones scale resolution to stay cool (2026-10-20, PR #51)
- Frame cap: a deadline limiter (`capNext`) replaces the slack test, which let every frame through on a 90 Hz display
  (a phone capped at 60 drew 66 fps, then throttled to ~20). A 60 cap now holds on 60, 90, 120 and 144 Hz.
- Phone (Michael 2026-10-20: "FPS drops sharply on phone ... would be good to have it sit at 60 fps consistently"):
  dynamic resolution in a match, native at rest, stepping down to half on long frames and back up with headroom.
  Lamp light and shadows unchanged (Low preset). Desktop unchanged apart from the cap.

## 4.16.0 - Night vision pass: realistic night vision, a wider goggle frame, the vision carousel (2026-10-20, PR #49)
- Night vision (A1): modern green phosphor. The tube drive gamma 1.7 -> 1.3, green tint, dim green black, white clip from
  0.85, stronger grain in the dark; `VISION_GAIN` 8 -> 6 with the darkness curve's floor eased up to `VISION_FLOOR` 1.0, so
  deep dark reads and lit areas no longer clip. A frame auto-gain (`src/vfx/nightExposure.ts`) lifts dark frames (up to
  x3) and eases bright ones down (to x0.6); lit rooms stay in its band.
- Bodies no longer glow in night vision: the flat ambient fill on non-voxel surfaces is capped in the render path
  (`BODY_FILL`, x0.35 facing up, less facing down); lamp light on a body is untouched. Light parity, the light field and
  the bake are unchanged.
- Night-vision bloom comes from real sources only: the bright pass compresses a half-float source first (threshold 0.8,
  strength 1.4 -> 0.6), fixtures take `NV_BULB` 8 (electro stays x2.5), lit walls and bodies do not halo; the default
  bloom is off while the goggles are on.
- `?gfx=min` (no baked lamps, no lighting gain): the tube lifts its input (`postLift` 3) so night vision is never darker
  than off.
- Goggle frame: one wide, thin frame for night, thermal and electro (a rounded rectangle the shape of the screen, a faint
  rim, corners about 30%); the clear area goes from about 44% to 89% of the screen at 16:9. It fades in with the
  night-vision blend.
- Selection wheel: with the vision slot lit, A (pad) / E (keyboard) steps night -> thermal -> electro -> night and
  releasing LB / Tab selects it; the wheel opens on the current mode. The cursor-length pick is gone.
- Tests: the `e2e-darkness` night-vision target at level 0.12 is 0.10-0.45 (A2; the probe card is a non-voxel surface),
  and the probe prints the night-vision rgb. New `goggleFrame`, `nightExposure` and wheel carousel tests.
- Scripts: the night-vision shot scripts (`scripts/nv-shots.mjs`, `docs/nv-pass/nv-gpu.sh`) refuse a port that already
  answers, a dead preview or a served build that differs from `dist/`, and fail on a build or shot error.

## 4.15.4 - The FPS overlay is a thin banner (2026-10-20, PR #48)
- Settings > Graphics > Show FPS overlay (Michael 2026-10-20: "it takes up the whole screen. Can you make it a banner on
  the top of the screen with only critical information"): one line centred along the top edge: FPS, average and worst
  frame time, dropped frames, render resolution. F3 and `?debug=1` still open the full debug overlay.

## 4.15.3 - The phone menu draws at High quality (2026-10-20, PR #46)
- Phone menu (G182; Michael 2026-10-20: "menu hero should be best quality on phones if it doesn't cost much"): the
  menu draws at the High preset on phones (lamp shadows, AO, bloom, depth of field) while play stays on Low; the hero
  mesh was already the close-up LOD. Epic's TAA and full-res post are left out (heat). Desktop unchanged.

## 4.15.2 - Phones at native resolution and 100% render scale (2026-10-20, PR #45)
- Phone (testing launch, G182; Michael 2026-10-20: "Default phones to low settings but with shadows/light, native
  resolution, 60fps cap, 100% resolution scaling"): phones now render at native resolution (device DPR) and a 1.0
  render scale, still on the Low preset with the 60 fps cap. Desktop and the tests (`?gfx=min`) are unchanged.

## 4.15.1 - Phones get basic lamp light and shadows, a 60 fps cap, no side bars (2026-10-20, PR #44)
- Phone (testing launch, G182; Michael 2026-10-20): the Low preset instead of the bare test preset, so lamps light the
  level and characters get contact shadows; DPR 1 and a 0.75 render scale; a 60 fps cap (heat). The menus fill a wide
  phone screen (no 16:9 side bars). Desktop and the tests (`?gfx=min`) are unchanged.

## 4.15.0 - New controls: analogue speed, holstered, low ready and aiming states, LT aim, X holster, RT strikes, the sling draw (2026-10-20, PR #43)
- Controls (slice 1, `docs/anim-rework/BRIEF.md` section 1; Michael 2026-10-20): the left stick's deflection sets the
  speed continuously from a creep to a run (`STICK_SPEED`: most of the travel is creep / sneak / walk, the last fifth
  the jog and the run); no speed gears, no D-pad or mouse-wheel speed. Keyboard: WASD walks, Left Shift held runs, Left
  Alt held creeps (A1); back to wall moved from Left Shift to Caps Lock. D-pad up / down and the wheel only step the held
  context menu now; = / - are unbound.
- Weapon states: holstered, low ready, aiming. LT (RMB) held aims, let go drops to low ready; X tap holsters / draws
  (M1); X held with the gun out reloads (A2; nothing to reload: holsters); A always interacts and never reloads
  (Michael 14:55: "Interact always"; KBM R still reloads); LT from holstered draws
  straight to the aim through a slower sling draw (M2, the existing draw x 1.6 until slice 3's clip); RT fires only
  while aiming (A3). Holstered or holding a guard: RT tap knocks out, RT hold kills (M3); KBM Z still knocks out; LT
  while holding aims the pistol over his shoulder. Traversal and busy moves put the gun away and bring the state back
  after (M4). The pistol jammer: hold the co-op button (pad RB, keyboard F / PgDn) while aiming the drawn pistol at a
  camera or a laser (Michael 14:55: "Another button - what makes sense? RF?", read as RB); aiming alone never jams, and
  no team move starts while aiming the pistol (nor its prompt). KBM Z is the knockout only. A KBM R reload from
  holstered leaves the gun out at low ready; an X press that runs into a held context menu or the wheel is spent (no
  holster); the split / inverted-hang sidearm aim no longer leaves the gun at low ready after the attach.
- Settings: pad layout 3 and key layout 1 move an older save to the new defaults (the speed verbs and keys dropped,
  back to wall off Left Shift); the Aim hold / toggle choice is removed (Michael 15:25: "Remove it"; LT is always held, a stored choice is dropped); a remapped binding that now clashes is named in a toast
  once and marked on the controls screen. The Sprint row is gone. No wire change (PROTOCOL_VERSION 24).

### anim-metrics-2 (into feature/ct-prototype; shipped in 4.15.0)
- Debug overlay (F3, or Settings > Graphics > Show FPS overlay): a live anti-crab readout during play: knee separation
  over the hip width, the planted foot track, knee outside the ankle and elbow outside the shoulder, green inside the
  ranges and red outside, with the gait and state. Allocation-free per frame (`crabFrame` in `src/anim/audit/metrics.ts`).
- Tests: the `CRAB` ranges tightened to human gait data (knees 0.5-1.1 x the hips, planted feet within 7 cm of the line,
  knees at most 3 cm outside the ankles, elbows at most 6 cm out; crouched 1.25 and 8 cm); `e2e-anim` with
  `CRAB_STATES=1` measures the walk's sub-states at speeds 1-3. Findings in `docs/anim-rework/METRICS.md`: the aimed
  strafe is the crab (knees 2-2.8x the hips, feet up to 53 cm off the line), then turns from a standstill, starts and
  direction changes.

### anim-metrics (into feature/ct-prototype; shipped in 4.15.0)
- Tests: anti-crab metrics for the animation rework (BRIEF section 5): knee separation and planted foot track per speed
  and stance, knees over the ankles, planted-foot slide and elbow wing, in the pelvis frame (`src/anim/audit/metrics.ts`,
  ranges `CRAB` and per-gait `CRAB_GATES` in `limits.ts`, unit tests `tests/animCrabMetrics.test.ts`). `e2e-anim` prints
  them for walk, jog, run, crouch and sneak, report-only until a gait's gate is on; today's values in
  `docs/anim-rework/METRICS.md`.

## 4.14.1 - Orchestrator docs: 2026-10-20 roadmap, the animation rework brief (2026-10-20, PR #42)
Docs only. The roadmap and orchestrator state for 2026-10-20 (Michael's answers 08:10-16:15: the guard menu, keyframed
clips, the anim-rework brief docs/anim-rework/BRIEF.md, nv-pass, warehouse-s23, test-speed, context clears) and the dashboard.

## 4.14.0 - Sector Ops: Warehouse section 1 rebuilt (three routes, logical guard posts) (2026-10-20, PR #37)
- Dogs carry no flashlight (Michael, M1): only human guards take a torch slot when searching in the dark (pure
  `carriesTorch` / `torchRule` in `ai/archetypes.ts`, tested); a dog no longer lights the player or the meter.
- Sector Ops Warehouse section 1 rebuilt as a greybox prototype (M1, M6; `docs/warehouse-redesign/SPEC.md` 5,
  `src/world/maps/warehouseS1.ts`): a goods-in bay, a trade office block with a ceiling void and a plant deck, a workshop
  with a crane walkway; ceilings and a solid roof, real door and window sizes, no filler walls. Three routes to the
  security office's camera recorder (ground under the west shutter; drainpipe, roof and ceiling hatch; crane walkway,
  void and mess hatch). 8 guards with jobs, no heavies; the start in the yard's south-west corner. Sections 2 and 3 are
  unchanged (their redesign is specced in SPEC 2.2 / 2.3).
- Sector Ops: a takedown spot also passes the M8 check when its guard is alone for 3 s or more on its timed patrol
  (`sectorCheck.ts`, A2); Sector Ops patrols take per-point waits and facings like Infiltration (A3).

## 4.13.2 - No ghosting at Epic when aiming, drawing or holstering (2026-10-20, PR #36)
- No ghosting at Epic when drawing, aiming or holstering (Michael's playtest). The aim depth of field read the camera's
  direction before the render, so Babylon saw a moving camera as still and Epic's TAA kept blending old frames; it now
  uses the camera's own look angles. The TAA history is also clamped to the current frame's neighbourhood, so fast arms
  and guns leave no trails. `scripts/ghost-strip.mjs` captures before / after frame strips on the GPU
  (`docs/ghost-fix/shots/`).

## 4.13.1 - Co-op fixes: the host draws on the joiner at High and Epic, the connecting label clears (2026-10-20, PR #35)
- Co-op: the host was invisible on the joiner at High and Epic graphics (GPU). The baked-lamp material plugin broke a
  material clone while the partner figure loaded, so the figure never appeared. The plugin is no longer copied by a
  clone (`LampPlugin.doNotSerialize`); the clone gets its own plugin on the next frame.
- Co-op: "Connecting to host" no longer stays on the joiner's objective line after the first snapshot; "Waiting for host"
  shows if snapshots stop for 2 s.
- Co-op: a hidden or covered co-op window keeps stepping its sim, so the host keeps sending snapshots while another
  window is on top.
- Tests: `tests/lampPluginClone.test.ts` (a clone of a lamp-plugin material), new asserts in `e2e-ctcourse` (host avatar
  drawn and objective cleared on the client), and the GPU suite `scripts/e2e-coop-gpu.mjs` (real menu flow at High and
  Epic, `npm run e2e:gpu`).

## 4.13.0 - Marlow Yard interrogation guard (2026-10-20, PR #34)
- PR 3 Interrogate (`docs/ct-prototype/PR3-INTERROGATE.md`, Michael: "Add one in Marlow Yard"): station 1 has a training guard
  (passive, on his post by the south fence facing away from the start) who has information; held, hold-A lists INTERROGATE,
  and he says two short lines of his own (where the two wall medkits are) as subtitle; asked once, no menu again. A guard's
  information is `Enemy.info` (`src/ai/guardInfo.ts`, set from a squad slot's `info`); no wire change.

## 4.12.0 - Marlow Yard light pass and walkthrough guide (2026-10-20, PR #33)
Marlow Yard prototype light pass and the walkthrough guide (S2, S3; `docs/course-ready/LIGHT.md`, `WALKTHROUGH.md`).
- Lamps in all seven airlocks (the pads read lit, nothing spills out with the doors shut), on the station 2 and 7 wall
  tops, over the station 5 roof (raised lamp), in its back room (hack panel) and at its medkit: 19 -> 29 baked lights.
  The pools between the yard lamps and the station 3 camera bay are unchanged.
- `tests/ctcourseLight.test.ts` builds the real light field and checks every must-see spot and the dark pools.
- `scripts/shots-ctcourse.mjs`: headless GPU shots per station (Michael's PC, port 4189, `E2E_GPU=1`), the light meter
  checked against the field at each.

## 4.11.0 - CT movement 2: grab, hold and knockout, the hold-A action menu, walls and doors (2026-10-20, PR #32)
- G5 the hold-A action menu (`docs/ct-prototype/G5-REPORT.md`, Michael: "requires holding A and selecting which option you
  would like to proceed with, including returning to game (no action). I want it to be identical."): with anything in
  reach a list sits top right under INTERACT; holding A turns the header to BACK TO GAME with row 1 highlighted, the
  stick / D-pad (wheel or W / S on keyboard and mouse) moves it, and releasing A runs that row (BACK TO GAME does
  nothing); a quick tap runs row 1; rows with a hold time (hacks, medkits, alarms, revive) fill while A stays on them.
  One menu replaces the separate door and grab menus; doors list OPEN DOOR, OPEN DOOR STEALTH, BASH DOOR, OPTIC CABLE.
  Michael 08:10 / 08:20 / 08:25: behind a guard the list is GRAB CHARACTER (and BACK TO GAME); once grabbed there is
  no let-go and no BACK TO GAME: RT kills, LT knocks out, aiming holds him as a human shield, and hold-A lists only
  INTERROGATE for a guard with information (none have any yet, so no menu); other takedowns are one row (a knockout).
- G6 walls, corners and doors (`docs/ct-prototype/G6-REPORT.md`, against the CT footage): crouched on a wall Wren turns
  side-on toward where she is going and crouch-walks along it bent over her knees with a hand on her knee (Michael: "holds
  knee when up against wall"), turning through facing out when she reverses (0.45 s); standing she sinks into a
  semi-crouch and turns her chest and head toward the slide; wall slides are 0.35 m/s standing (was 0.47) and 0.5 m/s
  crouched (was 0.41) at the spawn gear; the turn onto a wall is quick at first; at a wall edge the peek is a small lean
  with the hips and body stepping out, so the head ends just past the frame (it stopped short); aiming at a wall half a
  metre away brings the rifle up muzzle-high; low cover uses the same side-on crouch. Doors: Open from the door menu is
  a short move (a step to the latch side, a hand on the door, the door opening 0.8 s after the pick), the leaf swings
  fast then eases to 88 deg (was a slow start to 100); Stealth open steps in and holds the handle before the crack
  (1.2 s after the pick, was 0.25 s) and the stick opens it a little slower; guards push doors open in 0.4 s (was 0.7)
  and a door a guard opened swings shut in 0.35 s. Co-op: the partner's copy poses the same from the existing wall
  state (no wire change).
- G7 grab, hold, knockout and carry (`docs/ct-prototype/G7-REPORT.md`, against the CT footage): the grab from behind
  steps in over 0.42 s (rising out of a crouch, legs stepping) and pulls the guard back against the chest over 0.6 s
  before the hold and its menu (~1 s, CT ~1-1.2 s); the guard struggles from the contact, not the press, his rifle out
  of his hands; the hold has the left forearm across his throat and the right hand on his shoulder, his hands up at the
  arm, the pair swaying a little and the guard flailing every 2-4 s; the hostage walk is capped at 0.75 m/s (was 1.4)
  with him held 0.32 m in front (was 0.42) and walking with you; Knock out lowers him in front over 0.85 s with you bent
  over him (was a 0.5 s drop); Interrogate works (your hand at his jaw for 1.5 s, the hold goes on); picking up a body
  is a 2.0 s lift (step in, crouch with the hands under its shoulders, hoist it onto the shoulder on the side its head
  lies, crouch lets go before the hoist) instead of a teleport; carrying is a 0.8 m/s walk (was 2.2) bent forward under
  the weight and can open and close doors; putting it down is a 0.8 s slide off the shoulder to your side (was an
  instant throw 0.7 m ahead). Co-op: the host and the partner pose the hold, its knockout and interrogation from the
  existing MoveState fields (no wire change).

## 4.10.0 - CT prototype: CT controls, posture and movement matched to the footage (2026-10-20, PR #31)
- Footage audit (Michael, 2026-10-19 / 20: "Every movement aspect must be audited and brought into night shift"): all 90
  of his CT clips catalogued (`docs/ct-prototype/FOOTAGE-CATALOGUE.md`) and every move measured against ours
  (`docs/ct-prototype/audit/`: per area, with a coverage map of every catalogue move); slices G1-G4 below follow it, and
  where the footage disagrees with an earlier number the footage wins (Michael).
- G4 traversal (`docs/ct-prototype/G4-REPORT.md`): the drainpipe climbs with one reach per hand about every second and
  both feet together; the hang shimmy slows to 0.5 m/s with the legs swinging under her (and a slight sway hanging
  still); the ledge climb-up puts the knee on top at 0.47 s and ends crouched at 0.85 s, standing only if you hold the
  stick; ladders climb 1.7 rungs a second, two rungs a reach, faster going down, mount from the top in 1.2 s and top out
  in 0.85 s; rappel hooks on in 1.8 s and descends at 0.6 m/s; drops land crouched; crawling out of a wall vent takes
  2.5 s.
- G3 camera (`docs/ct-prototype/G3-REPORT.md`): the field of view is 86 (CT's vertical view; a saved 75 moves once,
  `camV`) and the explore camera sits 0.15 m off the shoulder (Michael: "Match CT"); open spaces frame the whole body
  from 2.8 m (tight spaces 1.8 m) from map flags with a probe fallback; the aim camera puts the head on the left with the
  reticle clear; the camera eases in toward walls more slowly (as CT); it pushes in while passing through a doorway;
  traversal cameras centre the hero; the corner peek eases in over 0.35 s.
- G2 aiming and weapons (`docs/ct-prototype/G2-REPORT.md`, against the CT footage): the rifle is slung diagonally across
  the back (stock at the right shoulder, muzzle down to the left hip) and draws round the right side, muzzle up at the
  shoulder, then down onto the line, with no hold at the chest (about 0.4 s to settled); the holster is near instant
  (0.15 s) and never swings the muzzle over the head; the aimed upper body is one rigid block that tilts at the hips;
  the pistol is held lower and further out, under the sight line, and draws in 0.5 s; recoil shows no visible flip and
  no shot shake; a swap while holstered is the selection only; a reload pressed while holstered draws straight to the
  reload pose.
- G1 legs and gait (`docs/ct-prototype/G1-REPORT.md`, against the CT footage): in turns the legs turn with the body
  (feet under the hips, no splay, no pelvis spike); an upright standing walk with near-straight knees and the heel rising
  onto the toes; the run quickens (~4.7 steps/s), leans from gear 4, pumps its arms, has a flight phase and banks into
  fast turns; the top standing speed is 4.5 m/s; a stop sets down in a small split and straightens up; a crouched stop
  kneels at once on the trailing knee, the forearm on the front thigh, no wide squat on the way in; moving crouched the
  knees stay off the floor; a fall of about a metre lands deep with the arms out; new: the tense sneak near an unaware
  guard (long high-kneed steps, head up, a hand over the knife).
- Slice A (playtest 2, `docs/ct-prototype/A-PLAYTEST2.md`): the five speeds are re-spaced so the old speed 2 is the
  slowest (standing 0.75 / 1.4 / 2.1 / 3.0 / 4.2, crouched 0.85 / 1.3 / 1.7 / 2.15 / 2.6 m/s; D-pad up / down sets
  them and the stick reaches that speed from 0.9 of its travel); ADS look is 70 % less sensitive; the corner peek swings
  to the side you move to; the wall's open side becomes your shoulder and the last shoulder swap is kept for the next
  mission; a shoulder swap while aiming no longer flicks the gun up; back to wall needs you within 0.5 m (was 0.9) and
  settles faster, no slide; your own footsteps follow the noise meter (quiet when silent, 0.07 to 0.42 volume).
- Scanners: a hack whose partner never started resets both with no cost; a late or abandoned hack still costs 10 HP.
- Slices B+C (playtest 2, `docs/ct-prototype/BC-ANIM.md`): the ADS view is the same standing and crouched, for rifle
  and pistol; the chest carries the aim with the stock closer to the shoulder and the elbows tucked; the pistol is held
  closer to the eye line; the stance is narrower (legs stay under the body walking, running and turning, crouched too);
  the crouched gun sits closer to the body; less body bob at walking pace.
- Slices D+E (playtest 2, `docs/ct-prototype/DE-ANIM.md`): draw / holster keep the trigger hand on the gun the whole
  way (the rifle out at the shoulder, not head height; the pistol waits in the holster for the hand); the hanging
  shimmy's reaches are a little wider, longer and higher (D2b below slows it); drainpipe knees bend
  up and forward and the feet stay under the hips; the ledge climb-up (1.1 s) pulls up on held hands, puts a knee on the
  top, then stands.
- Slice D2b (Michael): the hang shimmy slows to 0.7 m/s (was 1.2) with slow, wide reaches one hand at a time, about
  two a second per hand.
- Slice F (playtest 2 walk, `docs/ct-prototype/F-REPORT.md`): holstered, the camera is always over the right shoulder; a
  left-shoulder swap lasts only while aiming and holstering resets it (the saved default shoulder and the wall's shoulder
  side are gone); crouched aiming frames from crouch height; the crouch idle kneels (one knee down, back upright); at a
  wall edge the body leans only to the open side and the camera slides past the edge as you look or push toward it; the
  ledge climb-up (1.3 s) holds the hands until the knee is on the top, then stands up smoothly (no hop); the rifle draw
  comes straight up to the shoulder (no low-ready dip); a settings save from an A3 build had the speed on D-pad left /
  right: it moves to up / down (vision left, gadget right) unless remapped.

## 4.9.0 - Marlow Yard co-op walkthrough fixes (2026-10-20, PR #30)
Marlow Yard walkthrough fixes for the 2-player co-op test (S1; audit `docs/course-ready/AUDIT.md`, 0 blockers,
8 confusing, 14 minor).
- Each station's task shows as the course HUD step line on both screens (bays without drills).
- A radio line names the next step when a station opens (unbolt, camera pocket, laser release, roof plates, hatch
  hack, scanners).
- Station 2: the bolt counts any player past the door leaf as the bolt side; once unbolted the "Unbolt" item turns off
  so the door menu shows on both sides (back on a bay restart).
- Panel and radio text name pad and keyboard buttons; station 3 says how to get the pistol out and to holster before
  the door; station 4 places the red release; station 5 says the way out after the hack; shorter panel 5.
- The station 3 blind spot is pale blue-grey (the airlock pads stay green); leg-up squares sit on the tested spot at
  stations 2, 5 and 7; a lone roof-plate press hints "Partner: press the other plate now"; the host's banner says who
  is down.
- Co-op: a course bay restart also brings an alive partner back to the checkpoint (no partner shut out by relocked
  gates). No wire change.

## 4.8.2 - Sector Ops: a checkpoint restart is a clean start (2026-10-20, PR #29)
- Sector Ops: a checkpoint restart is a clean start of the section (M9). The guards' shared memory goes back to its
  match-start state (`EnemyManager.resetMemory`: alarm, last known position and chase field, sighting flags, flanker,
  squads, AI clocks) and the section's guards load unaware on their routes. The loadout recorded when the section began
  comes back with every gun reloaded (no reload animation) and the gadgets restored (`weapons/loadoutSnapshot.ts`);
  grenades in flight and gadgets in the world (noisemakers, gas, mines, cams) go; doors the player opened are no longer
  noticed by the new guards. The alert / caution music fades out and the section starts in Calm (`Music.calm`). Health
  is full with the respawn.
- Co-op: the client records its own loadout as each section goes live and restores it on the host's restart banner
  (no wire change, A1).
- Sector Ops issues the campaign kit like Infiltration: the rifle comes with its suppressor (A62), as the Kit screen and
  the co-op lobby already showed it (A2). Before this its shots were loud in Sector Ops and put every guard in earshot
  into combat.

## 4.8.1 - Menu boot time measured (2026-10-19, PR #28)
Docs only. The 4.8.0 load gate adds about 0.9 s to boot-to-menu under software GL (median 1.72 s vs 0.78 s on
4.7.5); match boots skip it; no e2e helper change (docs/menu-notes/STATE.md).

## 4.8.0 - Menu notes: black launch screen, goggle flicker, menu weapons and poses (2026-10-19, PR #27)
- Launch (M1, M2, notes 1-2): one black screen with the NIGHT / SHIFT wordmark only, held until Wren's hero model,
  both weapon meshes and the shaders are ready (`src/world/menuGate.ts`: a stall timeout of 12 s with no bytes
  arriving, a hard cap of 120 s, never stranded); then only the press prompt fades in. The title stage is pure black;
  the press fades the wordmark and prompt out, Wren's goggles flicker on in full darkness with no menu on screen, then
  the light rises on the close-up and the main menu fades in (M3; a second press skips to the lit menu, A3; launch only).
- Music: the menu theme decodes at boot and plays on the title, or starts on the first key, click or pad press when
  autoplay is blocked.
- Main menu: Back no longer returns to the title (A1). The Pause menu's Controls item is gone; Settings > Controls is the
  one place (A2). Settings > Gameplay drops the Default shoulder row (CT: the camera is always over the right shoulder
  when holstered); the Controls screen lists the CT trigger and mouse verbs (holstered knockout / lethal palm strike,
  drawn secondary / primary fire; right click draws and holsters).
- Hero quality (note 4): the menu close-ups always draw the hero LOD on desktop presets (no fix needed; the jump was the
  LOD2 -> LOD0 -> hero load order, now behind the load gate); read-back `MenuState.heroLod`.
- Menu weapons (notes 5-6): the Blender rifle and pistol on Wren in every title and main-menu shot, one held at low or
  compressed ready, the other holstered or on the back (`src/world/menuPoses.ts`; new shots W1, W2); the void no
  longer shows a lone magazine or placeholder gun; a unit guard keeps the support hand off the magazine.
- Tactical shot (M4): W3 joins the main-menu deck, Wren on the sights with the rifle shouldered (Michael's pick X5 of
  the slice 4b mock-ups). The green goggle-spill spot in the face shots is gone: it reflected as a stray glow on the
  goggle housing and helmet above the lenses; the lens flicker itself is unchanged.
- Tests: `tests/menuGate.test.ts`, `tests/menuPoses.test.ts`, menuShots; `tests/titleSequence.test.ts`; e2e-menus checks the load
  gate, the dark title, the prompt fade, the sequence and the skip; e2e-pad follows the shorter Pause menu and the pad skip; GPU script `scripts/menu-boot-shots.mjs`.

## 4.7.5 - lightField heap check stable under load (2026-10-19, PR #26)
- tests/lightField "allocation-free under a loop" is stable under load: up to 40 rounds with yields so the optimizing
  compiler can finish (each measurement keeps its smallest round), and the control's vector escapes into a ring so it
  is never optimized away (272 B a query every run, was 63-272). Same limits. It failed `npm run check` on a busy
  laptop (41.97 < 39.54). Tests only.

## 4.7.4 - Orchestrator docs: new Claude account (2026-10-19, PR #25)
Docs only. Every session restarted in the new Claude account; the new dashboard
(https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh); the roadmap and orchestrator state at 22:55 (CT Core slice F
checks, Menu Notes fixes for CT Core, Sector Ops fix round, lightfield-heap runs).

## 4.7.3 - Orchestrator docs: walk notes, account handover, test runner and priority state (2026-10-19, PR #24)
Docs only. Michael's playtest-2 walk notes (docs/ct-prototype/WALK-2026-10-19.md), the account-switch handover
(docs/orchestrator/STATE.md), the roadmap (Menu Notes, Sector Ops restart bug M9, CT footage awaited), the menu notes
start prompt, and the dashboard with the walk-test checklist.

## 4.7.2 - The version label shows the build's own commit (2026-10-19, PR #23)
- The in-game version label shows the commit the build was made from. Preview slots read master's commit (/ct/ built
  from ct-movement e5fc5870 read "fca0e26"): vite.config.ts took GITHUB_SHA first, which every slot build in the deploy
  workflow inherits. The checked-out folder's HEAD now wins; GITHUB_SHA is the fallback (`src/core/buildSha.ts`, tested).

## 4.7.1 - e2e-traverse grate kick: a closed grate before the kick (2026-10-19, PR #22)
- e2e-traverse: the grate-kick check gets a closed grate. The keyboard vent section before it sometimes kicked the
  grate open on real frames, so the kick check entered an open duct silently (noise 0, about 1 run in 3). Tests only.

## 4.7.0 - Sector Ops: prototype menu, 3-section Sector Ops, co-op mode switch (2026-10-19, PR #21)
- Main menu: Sector Ops, Co-op, Loadout, Settings, Feedback. Missions, Training and Free roam only with `?legacy=1`.
  Sector Ops opens the op list (each op's difficulty stars), then the op's briefing (its sections, Difficulty, Weather,
  Start).
- Sector Ops (`?autostart=warehouseOps&mode=sector`), solo or co-op: the Warehouse in three sections played in order,
  joined by connector rooms that are the checkpoints. Each section has an objective (download, grab, hack), its own
  guards, cameras, laser bands and alarm panel; being spotted raises the alarm stage and sends guards in. No lives:
  solo, going down restarts the section at its checkpoint; co-op revives with the op's syringes. Completing the op
  fills its difficulty star. The result line shows time, kills, times spotted and Ghost. Details per step below.
- Co-op is the campaign: a new room hosts Marlow Yard in Course mode; the host can switch to Sector Ops (two players).
  Hunter, Infiltration and Free Roam only with `?legacy=1`. The Co-op entry no longer calls the Fallow bunker the
  tutorial. Protocol 24 (the `sector` mode and message: the client mirrors the live section's devices and door locks).
- Tests: a new required suite `e2e-sectorops`; e2e-menus, e2e-park and e2e-pad follow the new menu and lobby.
- Sector Ops slice 2 step 1 (logic): sections and connectors (`ConnectorMachine`: locked, open, cycling, sealed; the
  near door waits for a clear doorway), the run with a carried-over alarm stage, checkpoints and `restartSection` (no
  lives, M7; a down respawns at the checkpoint until step 2 restarts the section); revive syringes per difficulty;
  `EnemyManager.despawn` / `despawnAll` and a per-mode live cap `maxAlive` (12 everywhere, Sector Ops 32 from step 2);
  the difficulty stars record (`src/save/sectorRecord.ts`, a kv key, no SAVE_VERSION bump). Unit tests moved to
  `tests/` (the first cut's `src/game/sectors.test.ts` was never run by Vitest).
- Sector Ops slice 2 step 2 (the three sections, M7, M8): the Warehouse in three sections sealed from each other but for
  their connector rooms: 1 the service entrance (yard, dock, dispatch, workshop, corridor; download at the workshop
  terminal), C2 a vestibule in the dock, 2 the racking aisles (take the case), C3 the ground-floor office, 3 the factory
  floor, the mezzanine and the manager's office (hack on the deck), extraction by the freight lift. The connector cycle
  locks the near door, unloads the section (guards, bodies, its cameras and lasers), loads the next behind the far door
  and opens it; the connector is the checkpoint. No lives: everyone down restarts the section there (its guards,
  objective, devices and alarm stage reset; tallies kept). Per M8 the sections were re-laid with pockets (loads parked in
  the cross aisle, chicanes, a stores cage, a plant room, a split floor, deck crates) and new ways through (a rack-top
  route with ladders and planks, a manager's office door onto the floor, crates under the zipline gap): three routes
  per section, every guard in its own pocket with a takedown spot no other guard sees (10, 10 and 11 guards). Alarm
  reinforcements come from the section's own points (2, 2 and 3 per stage). Sector Ops raises the live guard cap to 32.
  `?sectorGuards=N` caps the guards per section (dev, tests). `buildWarehouse(b, opts)`: the plain Warehouse is
  unchanged.
- Sector Ops slice 2 step 3 (stars, syringes, co-op, M7): Sector Ops opens an op list (the Warehouse for now; every map
  with sections appears) with four difficulty stars, filled for each difficulty the op was completed on, and the best
  time per difficulty in the context panel; the main menu entry and the host's lobby Map row show the stars too.
  Completing a run saves its star (solo and co-op host; the co-op client saves its own, without a time). Co-op: a
  downed player is revived by the partner while the op's syringes last (Rookie 3, Normal 2, Realistic 1, Perfectionist
  1), shown as "Syringes n" on the HUD; with none left, or the 30 s window over, the section restarts at the checkpoint
  and both players come back there. The connector and the extraction wait for every player, a downed one too (revive
  them first). The client sees only the live section's cameras and lasers, the host's door locks and shot-out cameras.
  Guards the client holds are let go before a section unloads. A camera shot out comes back on a restart. Protocol 24.
- Sector Ops fix round: only the live section's alarm panel works (panels tagged by section; section 2 has its own),
  and the panel alarm is armed again on every section load and restart (it used to latch once per run and send guards
  to panels behind locked connector doors). The far door opens silently (no door noise for the new guards). A restart
  also clears the section's camera meters and re-arms disabled panels.

## 4.6.8 - Unit test timeouts under load (2026-10-19, PR #20)
- Vitest's test timeout is 120 s (was the 5 s default): under load (an e2e run alongside) the unit run is about 10x
  slower and heavy tests timed out. Per-test timeouts under 120 s are dropped (readyHands, menuShots, score).
- settings.test's round trip waits for its own debounced save, which under load overwrote kv/settings in a later test.
- Tests only; what each test checks is unchanged.

## 4.6.7 - Laptop test runner; co-op training first (2026-10-19, PR #19)
Docs only (Michael). The laptop (Character Build) runs the desktop jobs' logic e2e on pushed commits when the desktop
lock is held (CLAUDE.md "Machines", test tiers). Priority: the co-op training course first, Sector Ops on spare capacity
(ROADMAP.md). Dashboard and orchestrator state updated.

## 4.6.6 - e2e-menus slider fix: hold-repeat waits on the condition (2026-10-19, PR #18)
- e2e-menus: holding right on the Effects slider waits until a fast step lands and sfx passes 0.2 (15 s cap)
  instead of a fixed 3.2 s; under load fewer frames ran in that time and the check failed. The results-screen wait
  is a 60 s hang guard (was 15 s; it ran out under load). Tests only.

## 4.6.5 - Co-op test fix: reliable co-op suites (2026-10-19, PR #17)
The process audit's section 2 (Michael approved; `docs/coop-tests/`). Tests only, no game change.
- The two-page suites (e2e-coop, e2e-netmove, e2e-ctcourse, e2e-course) wait on the game's own clock: on software GL
  the sim runs at a fraction of real time, so wall-clock timeouts expired mid-move (e2e-ctcourse's leg-up, e2e-coop's
  holster). A timeout now names each page's sim seconds, sim rate and fps; netmove and ctcourse open at 960 x 480.
- Stale checks fixed: e2e-netmove's walk-off stands up first (B keeps the crouch), the stacked check waits for the
  host's copy; e2e-coop's wall medkit heals to full on Normal (G180); the crouch helpers wait to stand before pressing.
- e2e-coop runs legacy-off: Infiltration (the Ledger) and Free Roam instead of Hunter, two players (G2).
- e2e-coop, e2e-netmove and e2e-weapons-carry leave KNOWN_FLAKY (3 solo rounds and 2 full runs on the laptop, 23 min
  each); e2e-pad stays (one remap failure in full run 2, parked).

## 4.6.4 - Docs: the laptop is a second heavy slot; roadmap is state only (2026-10-19)
- CLAUDE.md "Machines": two heavy slots, the laptop at low priority, everything headless and invisible (Michael).
- docs/ROADMAP.md keeps state only; its rules moved to CLAUDE.md "Sessions". Sector Ops and the co-op test fix on the roadmap.

## 4.6.3 - Process audit: test tiers, shorter e2e, one rules file (2026-10-19, PR #15)
Michael approved the audit's report as written (2026-10-19; `docs/process-audit/REPORT.md`).
- The full e2e run is the training level and the systems it stands on (estimated 62 -> about 28 minutes at two
  suites at a time): the parked-content suites (Hunter / Mission, Fallow, Kestrel, the Warehouse routes and AI
  archetypes) move to `npm run e2e:legacy`, the audio suites to `npm run e2e:audio`, the visual read-backs (darkness,
  the Epic boot) to `npm run e2e:gpu` on Michael's PC, and the animation audit runs only from the quick map.
- e2e-pad and e2e-mouse keep input (menus, capture, the verb tables, remap) and drop the gameplay sections their system
  suites own; e2e-pad gains a pad verb table. e2e-course walks the gates once. `e2e:quick` no longer pulls the input
  suites for every core or config change.
- One set of rules in CLAUDE.md "Sessions" (orchestrator, machines, a job, test tiers, branches and previews), a
  3-file job format (BRIEF, PLAN, STATE), a shared subagent preamble; deploy.md and session-method.md agree with it;
  finished and parked job docs carry a history banner. The goggle job's records (M1-M3) and D36 (Moth's goggle is
  purple) reach master.

## 4.6.2 - Version numbers you can read (2026-10-19)
- Every merge to master gets the next version (G183): a job or feature is a minor step, a fix or docs-only merge a
  patch. The in-game label (title screen, main menu, playtest notes) adds the build's commit: `v4.6.2 · a1b2c3d`, with
  `PREVIEW CT` on /ct/. Versions 4.1.0-4.6.1 below were numbered after the fact, in merge order; each master release
  has a git tag (`v4.6.2`).

## 4.6.1 - Orchestrator docs (2026-10-19, PR #11)
- Roadmap, machine rule (heavy work on the desktop, heavy.lock), the orchestrator's resume point and dashboard source,
  Michael's dashboard answers (G-level decisions in ROADMAP "Decided"), Moth's goggle purple (bible 5.14).

## 4.6.0 - Phone launch for testing (2026-10-19, PR #13)
- A phone can launch the game for testing only (G182): the minimum settings (`?gfx=min`, no Auto detection, no
  governor) and the menus and HUD scaled down to fit its screen. No touch controls; a Bluetooth pad drives it. Untested.

## 4.5.0 - Animation clean-up (2026-10-19, PR #12)

Prototype pass over Wren's animations (Michael, 2026-10-19): accurate, believable, no clipping. `docs/anim-cleanup/`.

- **Draw and holster:** the current gun is put away before the next comes out. The rifle travels over the right shoulder
  onto the back plate stud, the pistol into the thigh holster, along a curved path clear of the head and trunk
  (`WeaponModel.beginTravel` / `travel`, `TRAVEL_VIA`, `TRAVEL_OUT`; beats `TRAVEL_OUT` / `TRAVEL_IN` in
  `playerWeapons.ts`). The draw pop is gone (e2e-anim asserts the draw).
- **Reloads with real magazines:** a separate magazine mesh leaves the gun with the support hand, goes to its pouch
  (rifle: chest; pistol: left hip), a fresh one is seated; an empty reload works the charging handle or racks the slide
  (`reloadClipFor`, pistol clips; a swap or a grenade mid-reload cancels it cleanly).
- **Shoulder swap moves the gun:** on the left shoulder the gun goes to the left hand once it is settled
  (`weapons.handSwitchOk`); the partner sees it (ground MoveState sub bit 128, `SHOULDER_LEFT_SUB`; it was protocol 18,
  counted in today's 22).
- **Hands on the real geometry:** ladder rungs, drainpipes, pipes, ledge lips, the zipline cable, the rappel rope and fence
  rails: the palm sits on the surface and the fingers wrap it (`attachGrips` grip axes, `CharacterRig.solveWorldGrip`);
  rungs and fence wires take a fixed overhand grip.
- **Hand shapes:** trigger, support, wrap and relaxed shapes blend from Wren's morph targets; free hands hang lightly curled.
- Crouched ready hands sit by the thighs (`READY_HANDS` crouch values, with CT Core's P1c).

## 4.4.1 - Docs: roadmap, merge approvals, walk-test menu notes (2026-10-19, PR #10)

## 4.4.0 - CT prototype (2026-10-19, PR #9)
- Posture, CT controls, the selection wheel, the 8-station co-op training course, revive. `docs/ct-prototype/`.

## 4.3.0 - Menus (2026-10-19, PR #8)
- Arkham-plan menus, dialog fixes, the cinematic hero background. `docs/menu-ui/`.

## 4.2.1 - CLAUDE.md "Current goal" (2026-10-19, PR #6)

## 4.2.0 - Weapons (2026-10-19, PR #7)
Placeholder weapons that look real at a glance, held and carried believably (Michael, 2026-10-19: "Holding weapons and
holstering should at least look believable but only prototype quick run").

- The CT kit as baked meshes from an offline Blender pipeline (`npm run weapons:build`, scripts/weapons/): the Heron
  Carbine with the co-op launcher always fitted and a suppressor (11.7 k triangles, 2K textures), the Hush 9 SD with its
  jammer emitter in the frame's nose (9.7 k, 1K), the knife (1.8 k, 512; shown in the right fist when drawn, no knife
  verb yet). Original designs, real proportions, KTX2 textures. Download +10.4 MB.
- Wren holds them: her fingers close round the grips (morph targets from her hero hand rig), the palm sits on the grip
  and the knuckles wrap it, the support hand under the launcher (the rifle) or cupping the trigger hand (the pistol).
  Her wrists now land on the rig's (her forearms were 35 degrees bent, the hands 16 cm off every grip).
- Stance: the support shoulder comes forward to reach the handguard with the elbow bent; the pistol is aimed out at
  near arm's length with both hands (CT).
- Carry: the pistol sits in her built thigh holster (it cut 20 mm into the shell); the rifle hangs flat from the receiver
  bar on her back plate by a keyhole stud, muzzle up, the grip to her right hand (it stood off her back on its optic).
- Guards keep their guns (A6). Gameplay unchanged: muzzle, hand points and carry extents still come from weapons.json
  (the rifle's support point moved back to the launcher sleeve's rear, its proxy parts follow the mesh).

## 4.1.0 - Wren, the player character (2026-10-18, PR #5)
Operators run (feature/operators): Wren replaces the player body for every player (G123: "I want wren in to replace the
existing character anyway; before the prototype is done", "Both play as Wren").

- Solo, the local co-op player and the co-op partner are Wren, the realistic operator built offline in Blender (G68):
  a one-piece stealth suit, slim armour, rigid kit, the original goggle. The main menu shows her hero model (D33: "Yes
  use hero for menu"). Guards keep their bodies.
- Gameplay unchanged (G38): the same capsule, speeds, noise, traversal and camera. The body drawn, the light-meter
  samples, the cover exposure points and the hit volumes follow Wren's size (1.68 m, G74; the meter samples 7 cm lower
  standing, 4.6 cm crouched, for the partner too); weapons sit in her hands.
- Body proportions corrected for every character (G72, ANSUR II): shoulder joint 3.5 cm lower, wider shoulders, longer
  hands, deeper chest, fuller waist and pelvis, head 1 cm deeper, thigh 2.5 cm shorter.
- The goggle glows dim with vision off and full with it on (G73); it sits over the eyes in both states until the stowed
  model is exported (cleanup).
- Each player's goggle is their own colour, the partner beacon (G135: "partner beacon (distinct light colour per
  player)"): the host (and solo) green, the partner cyan, the same on both screens. Emissive only; guards never see it.
- Download: 81.4 MB more, fetched on first use and then cached for offline play (LOD2 2.5 MB first, LOD0 18.4 MB,
  LOD1 5.1 MB; the menu's hero 55.5 MB loads after them). Once the service worker controls the page the play LODs go
  into its cache, so one online start that reaches the menu is enough to play Wren offline; the hero is cached the
  first time the menu or photo mode shows it. A body load cut off by a reload is not reported as an error.
- Ladders and drainpipes: a hand's reach is never quicker than the arm can swing (from the body's proportions); a
  sprint up a ladder keeps the hands on the rungs with Wren's shorter arms.
- Ledges, wall jumps, ladders and pipes play the same for every player (G176: "Keep gameplay fixed"): the attached
  root path uses the 1.75 m gameplay height; Wren's body is drawn lifted onto her grips (7.6 cm on a hang), visual
  only.
- Elbows never pass through the chest: after the arm IK an elbow inside the trunk swivels round the shoulder-wrist
  axis until it is out (the hand stays on the grip).
- Hot paths: the attach path reuses its move override, the pipe grip blend lost its per-frame closure, the soft-knee
  share no longer changes field representation mid-match (a deopt of the rig update).
- Tools: every child process the e2e runner and its helpers start (vite preview, suites, taskkill, Blender, KTX
  tools) is spawned with `windowsHide: true`, so no terminal windows open on Windows. e2e-coop asserts the goggle
  colours on both screens. `waitOperator` in `scripts/e2e-lib.mjs`; `anim-sheet.mjs` and `perf.mjs` wait for Wren's LOD0 and exit 1
  when she never loads; e2e-coop's offline check waits for the service worker first; e2e-offline asserts the offline
  player is Wren; e2e-desktop drives Wren's head fade and goggle glow directly. `@babylonjs/ktx2decoder` is a runtime
  dependency (the game transcodes her KTX2 textures).

## 4.0.0 - Consolidation (2026-10-18, PR #3)
One branch with all finished and paused work, one vision (docs/DECISIONS.md, G1-G118). The entries below this one are
the merged branches' own notes, kept as their history.

Came in:
- Locomotion run (feature/ct-locomotion, paused at step 22, with feature/kestrel inside it): Chaos Theory movement,
  back-to-wall, traversal, holstered carry, goggles, the anim audit, Kestrel's level editor and Mission 1 work (paused,
  G53).
- Movement foley (feature/footsteps), weapon sounds (feature/weapon-audio), Music V4 (feature/music, as is; revised in
  its own job).
- Fallow training bunker (feature/training-bunker; the co-op tutorial, G78; rebuilt on CT moves after the prototype,
  G79).
- Menu and HUD plan (feature/menu-ui-spec, docs only).
- Not included: feature/operators (its own PR, G75); ct-movement's 99da75b "phone loads and plays on Low" (superseded
  by desktop only).

Deleted (Michael, "In this merge"; logs in docs/consolidation/deleted-*.md):
- Wave, Team Deathmatch, Free-for-all and all player-versus-player code (G8, G9).
- Retired maps: the 1934 Exchange, Trunk Annex, Dead Line v1 and v2, with their missions and suites; design data
  archived (G12, G91).
- Phones and touch: touch input, the layout editor, the phone look and phone render paths, phone budgets; the e2e
  suites now run in a desktop browser (G12, G13).
- Emotes and the old solo Training mode (G24, G116); the Fallow course is the only training.
- Every gun outside the CT kit: 14 player guns removed; kept the rifle and the suppressed pistol (G76, G115).
- The player drone, the custom difficulty sliders (fixed difficulties again) and carried medkits (wall stations only)
  (G7, G98, G106, G115).

Changed:
- Co-op lobby defaults to Infiltration (Hunter under `?legacy=1`). PROTOCOL_VERSION 11 -> 13, MAX_PLAYERS 8 -> 4.
- SAVE_VERSION 8 -> 9: old saves migrate (emotes, deleted guns and drone presets dropped or mapped to the kept gun);
  old settings records load and drop touch, phone, custom difficulty and medkit-bind fields.
- The one wall medkit station (Proving Grounds) heals +40 directly (starting value, ASSUMED).
- Docs rewritten to one current vision: docs/DECISIONS.md (new), CLAUDE.md, the design bible 2.0, story 2.1,
  docs/progress.md as an ordered job list, every docs/systems file, level-design Section 12, TESTING.md (one desktop
  checklist plus a release checklist). Old lists and phase logs are in docs/archive.
- Tests: e2e-foley is known flaky (walk threshold since the step-22 speeds); e2e-pad's capture step waits for the
  capture to end; legacy e2e-progression steps to Deploy.

## Unreleased - Weapon sounds (feature/weapon-audio)
- Sound: every gun now plays real CC0 recordings instead of a filtered noise burst. The 16 guns borrow the closest of
  12 recorded guns (The Free Firearm Sound Library, `docs/audio-credits.md`): .45 pistol, 9 mm and 7.62 SMGs, 5.56
  and 7.62 rifles, a .30-06 bolt rifle, 12-gauge pumps. Each has near takes (the player and close guards) and
  mid-distance takes (far guards), crossfaded and darkened with distance.
- Suppressed guns finally sound suppressed (before, the suppressed pistol and a fitted suppressor played the full report). The
  suppressed shots are made from each gun's own recording: the blast and tail cut away, a dull thump, a puff of gas,
  the slide or bolt clack, a little room.
- Automatic fire chokes each shot into the next, so only the last round rings out. Brass (and shotgun shells) land on
  the floor you stand on (concrete, deck plate, wood; muffled on carpet). The pump and the sniper bolt cycle after
  each shot. Reloads are laid out over the real reload time (magazine out and in, the slide or charging handle on an
  empty reload, shell by shell for the tube shotguns) and stop on a swap. A dry click on an empty gun. The crossbow
  has its own string and limb thunk.
- Gameplay is unchanged: guards hear the noise model (the weapon's `noise` stat), never the audio.
- `?weaponlab=1`: a listening screen with every gun, the campaign arsenal's six first (single, burst, auto), suppressed, player or guard at 6 / 18 / 40 m,
  reloads, dry fire, brass per floor, a footstep for level, and an A/B against the old sounds.
- Tools: `npm run sfx:fetch-weapons`, `npm run sfx:render-weapons`; tests `tests/weapons-audio.test.ts` and
  `scripts/e2e-weapon-audio.mjs` (required).
- Rule: CC0 audio is now allowed for every sound (Michael, 2026-10-16; `CLAUDE.md`, bible S7).

## Music V4 (feature/music, not yet released)
- The game has a score. The main menu plays the menu theme ("Grand, dialled back": Hook A on strings, the melody
  on cellos, then violins). In a match the music follows the guards:
  - **Calm (nobody aware): silence.**
  - **Cautious** (a guard suspicious, investigating or searching): the plucked broken hook, a heartbeat and a faint
    tremolo.
  - **Alert:** a spotted hit, then "Alert, under fire" on its downbeat.
  - **Coming down:** Evasion, then a slow step down through Cautious to silence.
- The music director has hysteresis, so a glance does not flip the music. The music never reads guard count,
  distance or direction, and gameplay never reads the music.
- The music is real orchestral recordings (CC0, VSCO 2 CE), mixed offline into nine MP3 files (5.9 MB, precached for
  offline play). Rebuild with `npm run music:orch` (the samples come from `scripts/music/fetch-samples.mjs`).
- Test page for the score (`/music-test.html` on the dev server). New e2e suite: `e2e-score`.
- Test page: "Hook thread" (round 23) with four Calm and three Cautious alternatives, and Calm / Cautious choosers in
  the in-game test (the game's tracks are unchanged until Michael picks). A position slider scrolls through a piece
  playing alone (with jumps of 8 bars and to the last 4 bars before the loop).
- The music volume defaults to 15 % (an untouched old default, 50 % or 30 %, moves to 15 % once). A short build (a roll
  and climbing strings) leads into Alert.
- The menu theme is twice as long ("Menu theme, extended", 64 bars, 2 min 50 s): the theme as before, then low drums (no
  sticks, cymbals or rolls), a string pulse that turns to sixteenths, and an epic brass layer (the hook on tuba and
  trombones, big brass chords) build to a peak, and it comes back down to the low D it opens with, so the loop joins
  smoothly.
- Fades no longer cut: every music fade starts from the level playing at that moment. Before, a fade after an earlier
  fade began part-way down (entering a match the menu theme dropped to about a quarter at once). Into a match the menu
  fades over 4 s; leaving one the mission music fades over 2.5 s.

## Locomotion run (Phase 3 + 3b, in progress, branch feature/ct-locomotion)
- PC1 (desktop GPU catch-up): Epic desktop no longer fails the voxel shader compile when guards alert (one flashlight shadow at a time with micro detail on, A54; e2e-desktop re-counts samplers after alerting); remote wall peek eases in like the local one (no foot re-plant); empty goggles slot no longer leaves a gap in the HUD tactical row. Harness: anim-audit per-scenario reset and usable `--shots` (side camera, no HUD, no TAAU ghosting, one per scenario + metric); anim-sheet drawn reload / swap, movement turn, aimed wall-edge sheets; e2e-wall mid-switch reversal case (report-only until step 27); anim-audit runs on Windows.
- 22: weight (Michael's play check, M14 / M17): every speed about 17% lower (standing 0.65 / 1.1 / 1.65 / 2.3 / 3.15 / 4.15 m/s), 0.3 s to full pace, 0.25 s to stop with one closing step and a single settle, turn inertia at speed, a planted pivot on a reversal above 1.2 m/s; aim, draw, strike, crouch and jump stay instant. Gait posed by gear with stride from the real pace, arm swing with effort, acceleration lean, heel-to-toe roll at walking pace, remotes derive acceleration from their velocity. Noise: part stick stays a silent walk. A88, A89.
- 21v: visible sensor grain and slight softening on thermal, electro and night vision (Michael's play check, M14; render only, A87).
- 21w: back-to-wall polish (Michael's play check, M14 / M16): the body stops at a wall end and keeps hugging it (pushing on peeks; only a held pull-away or the context button leaves), crouch on any wall, a slow shuffle (0.9 m/s standing, 0.6 crouched, analog), entry by the context button only (A83), deliberate peeks (no flicker), the peek camera eases over 0.45 s and the shoulder swaps smoothly (never inside a wall), lean-out aim limited to about 85 deg past the edge (aim further round leaves the wall), feet under the hips with the back flat on the wall, crouched knees apart, weapon glides instead of popping when re-held on a wall. A83-A86.
- 21: no bob (D2) and trained posture: heel-strike kick and camera footstep / dash bob removed (camera vertical osc ~0.1 mm), walk sway capped (2.8-2.9 cm), pelvis one low / one high per step on every gear (run / sprint pelvis travel 12-14 cm -> ~1.9 cm), constant gait head pitch, breathing only after 2 s still and fading out on the first step, weapon sway settles in 0.2 s; holstered arms relaxed at the sides with counter-swing and a sprint pump (M14), right arm clear of the thigh holster (A81); crouched arms no longer straight; remote start ankle snaps and stair step-down pelvis fixed. A76-A82.
- 20b: network conditions simulator for local co-op tests (`?net=local&netsim=typical`, E2E_NETSIM: 80 ms RTT, 20 ms jitter, 1% retransmit, A75); e2e-netmove and e2e-coop report under typical: no committed move stuck, no desync, pose within limits (D11). Step 20 (bot partner) dropped (M12).
- 19: custom difficulty (D7): sliders for guard perception speed, guard aim and alarm tolerance (A72) on top of the presets (Rookie / Normal / Veteran as bases, A74), values in steps of 0.05 (A73); saved in settings; in co-op the host's difficulty applies (PROTOCOL_VERSION 10, `dc` on lobby / start, read-only on clients); medkit carry and rewards follow the base preset. Fixed: hidden settings rows were still shown (`.row[hidden]`).
- 18: full remapping (D7): Controller and Keyboard & mouse tabs, two slots per verb, conflict warnings (a shared input is allowed and warned, A71), capture on release with hold-B / Esc / 5 s cancel (A69), reset per device; hold or toggle for aim, crouch, sprint, back-to-wall and grab (hold-mode grab knocks out on release, A70); in-game pad prompts follow the bindings; saved in settings (IndexedDB), local only.
- 17: pad first (D1, D5.12): analog stick speed with gear snapping and hysteresis (50 / 80 / 100% -> gears 2 / 4 / 5, sprint -> 6, A63), the rocker / wheel set the maximum gear (1-5, A64), HUD gear pips lit to the current gear and dimmed to the maximum; rumble table (landings, footfalls, takedown, elbow, shots, explosions, hurt) with a Rumble strength setting, local only; touch trimmed to the D1 basic scheme (touch layout v7 reset; takedown on the context button, A65; the stick spans gears 1-5, A66; training skips the gadget step on touch, A67); Nintendo glyphs; full binding table in docs/systems/input-and-loop.md checked by a unit test.
- 16: the arsenal (bible 5.6, A28, A59-A62): campaign set rifle / SMG / pump / marksman plus Hush 9 SD / Warden .45 sidearms (defaults rifle + Hush 9 SD), mapped at use from the save (no save change); the issued rifle carries a suppressor (A62); every real-brand gun renamed (Heron Carbine, Marten 9 SMG, Mason 12 Pump, Spotter 7.62 Marksman, Hush 9 SD, Warden .45, Kite 5.7, Ferret .45 SMG, Swift 5.7 PDW, Steppe 5.45 Rifle, Ibex Bullpup, Talon 12 Semi, Ridgeline Bolt, Anvil 5.56 LMG); the rest stay in code for legacy. Loadout screen shows Primary / Sidearm in the campaign; the co-op lobby sends the issued loadout (fixed a host weapon / shot desync for old saves).
- 15: medkits (bible 5.13): health 100, no regen; a medkit heals 40 over 1.5 s (pad X held 0.4 s while not aiming, KBM H), damage interrupts (kit spent, A56), aim / jump / sprint cancel; carry 2 (3 at Rookie, host difficulty in co-op); health pickups give a kit; Proving wall medkit station (hold 0.6 s, single use); HUD health bar on by default with kit count and heal fill. Host-authoritative hp and kit counts (`mk`), committed move `medkit` with shared start, MoveState `medkit` (28), PROTOCOL_VERSION 9. Fixed in the step: host cancelled a client heal on a late snapshot; no interactables in sandbox. anim-audit medkit rows.
- 14: thermal and electro vision (bible 5.5, A26, A53): the goggles cycle off / night / thermal / electro, each switch one goggle flip, HUD label for 1.5 s. Both are a `vk` branch in the existing post pass (desktop and phone grade pass, no new render target) fed by a render-only `pattern.w` glow: thermal lights every live rig and dog body, a dead body or dog cools over 60 s; electro lights cameras, laser sights, the sticky-cam lens and powered interactables (switch, alarm, terminal, charge). Render-only and local-only: never sent, never read by perception, the light meter or alarms (unit isolation test, e2e-stealth-ai `vision-detect` / `vision-dog`); e2e-pad / e2e-mouse / e2e-touch cycle the modes.
- 13: door peek (bible 5.3 Doors, A25, A52): the context action (pad A, Space, the touch context button) at a closed, unlocked door within 1.0 m and 60 deg settles at the frame (hand on the handle) and cracks the leaf 0.12 over 0.6 s, quietly; the view goes to the crack (FOV x0.85, look +-35 deg, never inside geometry, local only); the context action again or the stick back closes it, the stick in or interact opens it quietly; damage, aim, jump or sprint end the peek. The crack is drawn only: collision, light (bake unchanged) and guard sight treat the door as closed. MoveState `doorPeek` (27), host-authoritative crack (`door {i, crack}`, snapshot `dcr`), PROTOCOL_VERSION 8. Proving's shed north doorway gets a hinged door. e2e-pad / e2e-mouse / e2e-touch / e2e-netmove / e2e-coop cases and an anim-audit `doorpeek` row (local + remote).
- 12b: D9 open-side weapon at back-to-wall edges (left edge: pistol in the left hand with a mirrored grip, rifle on the left shoulder, camera follows; 0.25 s switch, reversible without a pop; exposure from the real mirrored pose) and D10 aim around low cover (crouched side lean past a low wall's end with the head kept under the top, over the top otherwise; crouched peek round the end). The host samples a remote's head from its posed copy on walls (light parity). No protocol change.
- 12: back-to-wall edges (bible 5.3): corner peek (head only, light and perception from the real head pose, local and remote), lean-out aim and fire past the edge, over-the-top aim on low walls, step round, SWAT turn across doorways (MoveState swat, host-checked, remote replay), corner takedown from the wall; `lk` field and PROTOCOL_VERSION 7; level builder highCover / lowCover renamed highWall / lowWall.
- 11: back-to-wall (bible 5.3, A23, A45): the context action (pad A, Space, touch context button) puts the back to a cover face within 0.9 m and 100 deg (a 0.2-0.45 s settle: 0.2 s + 0.3 s per metre of approach, A46), or the stick held into a high face for 0.35 s at gear <= 4 (a stick held through a traversal or a fall must be released first, A48); slides at the gear's pace capped at gear 4 (2.8 / 1.8 m/s) with crouch-band footsteps; low walls always crouched; inside corners wrap, outside ends stop (edge flags); leaves on the context press again (`gameplay.wallToggle`, default on), pulling away 0.15 s, jump, sprint, takedown or traversal; MoveState `wall` (segment, metres along it, WALL_SUB) posed on remotes; guards flank and grenade-flush a wall-held player (host and clients); two players stack >= 0.62 m apart; camera preset `wall`; PROTOCOL_VERSION 6; new e2e suite `e2e-wall`; anim-audit `wall` scenario (its remaining pose fails are baseline rows carried to step 27, A47)
- 10: elbow strike (bible 5.4): fire while holstered (pad RT, LMB, touch fire) strikes; behind an unaware guard it knocks out, from the front it staggers, a second strike inside the stagger knocks out; 0.9 s committed, contact at 0.5 s. Co-op: generic host-approved committed-move protocol `cmove` / `cstart {t0}` / `cdeny` (A5, A21), MoveState `strike` (index 25), PROTOCOL_VERSION 5; the shared elbow arc also drives the lethal takedown blow.
- 09: holstered unless aiming (bible 5.6): matches start holstered, aim draws (0.3 s pistol / 0.4 s primary) and release holsters (0.4 s); no hip fire (fire while holstered does nothing); ADS spread table (x0.7 crouched and still, movement up to 2.8 m/s); reload is never cancelled by releasing aim (A43); RB swaps while aiming; ready hands while holstered (A42). Co-op: MoveState `dw`, PROTOCOL_VERSION 4, host-authoritative drawn state, weapon in hand and shot weapon (A20, A41), no latency-triggered holster.
- 08: the audit harness also measures remote poses over `?net=local` (host copy vs owner, lag-compensated: gating pose error, gait phase offset, phase-aligned lower body, rubber-band pops, paired-move alignment, LOD skips); `--compare` against `docs/locomotion/audit/anim-baseline.json` (local deterministic; remote gated per A39 / A40); joined to `npm run e2e` as a report-only suite; e2e helpers moved to `scripts/e2e-net-lib.mjs`.
- 07: animation audit harness (`node scripts/anim-audit.mjs`, `--quick`, `--only=`, `--shots`): drives the local player headless at 60 and 120 Hz over every gear, both stances, flat / stairs / ramp / 35 deg slope, stance, raise, swap, ladder, vault, mantle, drops and quick 180; measures the bible 5.12.2 limits, D2 and the measurable D5 items in a Babylon-free `src/anim/audit` module with unit tests; writes local.json and a fail list with frames. Report only for now.
- 06: cover rig poses and clips removed (low-cover curl / lift, blind fire, cover turns, cover foot pins); MoveState slot 1 renamed `wall`, PROTOCOL_VERSION 3 (A2); flat-back stance kept as WALL_STANCE / wallHand / offWall (A6); the open-left weapon mirroring kept dormant for D9; e2e-cover and docs/systems/cover.md deleted; guards in high cover lean to the correct side.
- 05: player snap cover removed (cover controller, glide, cover-to-cover, blind fire, cover aim limits, the doorway / corner lean (A1), coverDash setting); `cover` input kept as the context action; enemy cover AI (coverData, corners, tactics) unchanged. Fix: a reset mid-vault no longer leaves the vault override stuck.
- 02: sonar removed (pulse, marks, ring, HUD, audio, difficulty flag, suit / HQ hooks); the vision button is night vision only.
- 01: Mark & Execute removed (marks, execute, chevrons, charge pips, `ex` shot field, RB / T / Y bindings, touch buttons; touch layout v6).
- 03: regenerating shield removed: `Health(maxHp)`, no regen; effective player toughness 150 -> 100 (-33%). HUD shield bar and `PlayerState.sh` off the wire (no PROTOCOL_VERSION bump yet, step 06). Pistol guard at Normal: 26 per hit, 4 hits to down 100 hp.
- 04: style tracker and style cash removed (`StealthRating` counters stub), results style bars gone, HQ sonar / marks and challenge executes removed; SAVE_VERSION 8 with a v7 -> v8 migration (mission style keys, hq.sonar / marks, executes dropped). HQ credits spent on sonar / marks are not refunded (parked economy). Default presets renamed Silent / Flash / Loud.
## 3.9.0 - Fallow training bunker (Block C, branch `feature/training-bunker`, in progress)
- T5g: the Deep level rebuilt to BAYS v2 at its own offsets (the T5f shift is gone): B7 The House (a 30 x 30 cavern round
  the two-storey kill house, its office behind glass, annex roof, water main, bench, sandbags, the store door into A7),
  B8 The Range (60 x 16: glass firing-line screen, six lanes, shoot-house, glazed tower, catwalk and its caged stair,
  sniper scaffold), A8 with its medkit, B9 The Plot (a three-floor well with glass balcony fronts, cabins, bridge, rope,
  zipline and tube duct to the lift lobby) and the exit lift. Objectives listed by name; relief doors placed.
- T5f: B5 Standby Plant, A5, B6 Mock Site, S6 and A6 rebuilt to BAYS v2; B4 / A4 at their v2 offsets (66, 14) / (70, 8)
  (the T5e passage is gone) and A4's wall medkit. B5: one 30 x 24 guarded hall: EL (screened but for its stair), gensets
  (wall-jump roofs), trench, cable gallery, glazed switch room (MB, the mains gate on A5), fuel bay. B6: one line RC ->
  AH -> plant ladder -> supply duct -> vent drop -> records -> corridor (2.0 clear), then the operator / runner split
  (lockers, CR stair, mezzanine / L-leg, mantrap, server room) -> keypad -> S6 (rising north) -> A6. Relief doors (A62)
  placed as visual leaves with course data. v1 Deep moved by (+17.5, -29) until T5g (A74). New R1 / R2 nav tests.
- T5e: B3 The Intake and B4 The Cistern rebuilt to BAYS v2. B3 sits against A2 (no more passage): one line up the shaft
  (riser slot, two wall jumps, the damper bar) and down again (two rope stages, the control-room window, the zipline,
  the fan guard, twin ducts). B4: three cells, W1 boost and bolt door, W2 human ladder and sluice, outlet platform; it
  stands at an interim offset with a passage from A3 until the Plant rebuild.
- T5b walk-1 fixes: airlocks are automatic (R6, D46): a marked 4 x 4 m floor pad set 1 m in from the walls; one player
  on it shows "Waiting for partner" on both screens, both on it with the bay's objectives done seal it (the rear door
  shuts and locks for good, a 4 s cycle, the front door opens). The Cycle button is gone. The cycle holds while anyone
  stands in the rear doorway. The client now gets every course prompt (course items are sent first; `MAX_ITEMS` 128,
  `MAX_DOORS` 256) and shuts any rear door the host locks. The objective list is always on screen for both players
  (R5, D45) with the airlock status under it. New two-page suite `e2e-bunker` (B1, B2).
- T5b2 partners block each other (D49) in every co-op mode, on both screens (a partner capsule in its own collision
  group; off while the partner is down or in a boost or human ladder). Remote players snap on a teleport instead of
  sliding through the space between (a jump over 2 m faster than 25 m/s, or across a stall that a 90-degree turn at
  the earlier speed cannot explain), so a teleported partner no longer shoves anyone.
- T5d Upper rebuilt to the v2 bay plans: B1 Muster is five small rooms in a chain (lift lobby, kit room, briefing room
  with a glass wall onto the gear run, the 20 m gear run, the dark store), B2 The Lanes is one 52 m lane both players
  run in order (plinth, rail, block wall, caged ladder, pipe over a pit, hang-drop, trench, downpipe and beam ledge
  round a column, gap jump to the portal sill, three drop pads, the window wall). Glass is see-through and not
  climbable; every bay's objectives are listed by name.

## 3.8.0 - Fallow training bunker (Block B, branch `feature/training-bunker`, in progress)
- T2 Upper level (y 16): B1 Muster (lift lobby, kit room, briefing room, dark store, the gear-run corridor), airlocks
  A1 and A2 (locked blast doors the course opens, bench, vision slot), B2 The Lanes (two mirrored obstacle lanes with
  every ground and climbing verb, glass walkway, lever-gated lane doors, drop pads and pit). Map `bunker` ("Fallow",
  `?autostart=bunker&mode=course`, not listed) with a course stub (B1, B2). `scripts/plan-svg.mjs` draws a map's
  storey plans headless. Tests: `tests/bunkerMap.test.ts`.
- T3 shaft and reservoir (Plant level, y 6): B3 The Intake (24 m shaft with galleries G1-G3, riser-casing split slot,
  wall-jump lip, damper bar, hoist rope past the control-room window, spoil zipline, fan guard and discharge duct, catch
  nets), airlock A3, B4 The Cistern (three cells, 4.4 co-op walls, inspection door, sluice, valve gallery, overflow
  channel, float shaft, sump, outlet platform) and airlock A4 on the outlet platform. Course stub B1-B4 with the fan
  isolator, bolts, the sluice hold and the outlet ladder.
- T4 Plant level, rest (y 6) and Stair 6: B5 Standby Plant (three gensets with wall-jump roofs, grating walkway over a
  secret cable trench with lift-out panels, cable gallery with a hang-drop, glazed switch room with the mains breaker
  switch, fuel bay and day tank, duty desk, entry landing and stair at A4's door), airlock A5 and its service passage
  (plant platform under the supply duct), B6 Mock Site (reception, corridor and L, open office with partitions and the
  glazed manager's office, control-room mezzanine at 3.6 behind a reader door, lockers, records with the duct's
  ceiling grille, mantrap, server room, exit keypad lobby), S6 (33-riser enclosed stair to y 0) and airlock A6.
  `BUNKER_DEVICES` mount points for T7a. Course stub B1-B6: the mains gate on A5, card readers, keypad, egress, S6's
  one-way top door; Finish in A6.
- T5 Deep level (y 0): B7 The House (rock cavern, two-storey kill house with roof parapet and hatch, kitchen annex,
  water main, rock-bolting bench, sandbags, skip, recesses, the store door), airlock A7, B8 The Range (firing line, kit
  lockers, lane stands, penetration wall, barrels, lamp gantry, shoot-house barricades, catwalk, control tower, caged
  catwalk stair bolted from below, sniper scaffold), airlock A8 (medkit), B9 The Plot (plot floor and map table,
  balconies 4.5 / 9.0 with cabins, bridge, stair towers, the north-west boost gap, bridge rope, zipline to the lift
  lobby, message-tube duct) and the exit lift L9. Course stub B1-B9: store key, catwalk bolt, keys A / B, the case and
  the two-key lift; the course ends in the lift. e2e-anchors covers the bunker.

## 3.7.0 - Training course framework (Block A, branch `feature/training-bunker`)
- Course mode (T1a, T1b): `CourseState` (pure, host only) runs bays, airlocks and gates (lever, bolt, hold, timed hold,
  pair, egress, mains, pickup / flag, anchor lock), checkpoints and bay restarts; `CourseMode` puts down the devices,
  keeps door, anchor and lamp locks in step and speaks LANTERN's radio (text only, held while guards are alerted).
  Co-op "Training course" takes two players (host P1, client P2): the `course` message mirrors state, locks and lights;
  friendly fire is on (D38). Debug map `courselab` (`?autostart=courselab&mode=course`, not listed); dev solo flag
  `?course=solo`.
- Drills and tutorial (T1c): `drillDetect` derives every drill verb in one place (edge-triggered); the client reports
  its local-only verbs as `ctick`; takedowns, thrown gadgets, doors and team moves resolve and tick on the host. The
  tutorial HUD lists the bay's drills with P1 / P2 tick columns and the current step in LANTERN's voice; drill-done
  toasts and radio on both pages; next-drill markers (Settings > Gameplay "Course markers"). Airlocks and the course
  end device ("Finish", `devices.end`) refuse while drills are open, naming them. No skip path (D30).
- Results: a course panel (per-bay and total time, detections, alarms, knock-outs, kills, revives, team moves, per
  player and team; the finale's Ghost / Silent / Loud tier). Course record `course:fallow` (IndexedDB kv; no save
  version change); the co-op lobby offers "Start at bay N" for finished bays, and both players start in that bay's
  entry airlock.
- Net: `PROTOCOL_VERSION` 3 (`course`, `ctick`, `start.bay`, `td.kind`). Tests: `tests/course*.test.ts`,
  `tests/courseTutorial.test.ts`, e2e `e2e-course`.

## 3.6.x - First Playable (in progress)
- Docs: 2026-10-10 cleanup (retired maps archived, docs match the new campaign).
- Docs: story 2.0 (D1, approved): present-day campaign, Mission 1 Dead Line at Cinder Yard (Ostler Colocation's data centre), Mission 5 The Strongroom, Kestrel Exchange retired.
- Dead Line v2 G1 (Area 1, 3.5.1): the Cable Lane greybox (`?autostart=dead-line-v2&mode=sandbox`, main menu card "Dead Line v2"), generated from `docs/design/map-dead-line-v2.json` by `scripts/gen-dead-line-v2.mjs`: lane, viaduct, lean-to roofs with downpipes, roof lights, palisades, spikes, cars, substation rooms, cable tunnel with M1 and M2 shafts and ladders, vent grating, flat debug markers, debug Teleport (encounters, checkpoints, spawns). Gate report `docs/archive/maps/gates/dead-line-v2-G1.md`. The old Dead Line is unchanged.
- Per-object hold noise: `Interactable.holdNoise` sounds at the start of a hold and every 0.5 s while it runs (`holdNoisePulse`, `HOLD_NOISE_PULSE` in `config/noise.ts`); `MANHOLE_LIFT_NOISE_RADIUS` 10 m for cast-iron covers. Holds without it stay silent.
- Nav layers per map: `MapDef.navLayers` (default 3, `DEFAULT_NAV_LAYERS`); Dead Line keeps 5 surfaces per column for v2's A block (basement to roof).
- G1: Mission 1 DEAD LINE campus greybox (`?autostart=dead-line&mode=sandbox`), generated from `docs/design/map-dead-line.json` by `scripts/gen-dead-line.mjs`: four floors plus the trench and culvert, 12 doors, stairs, ladders, drops, ducts, ledge and roof beam, flat debug markers, flat light, no guards or lamps. Debug overlay Teleport menu (chapter starts, spawns, objectives). Gate report `docs/archive/maps/gates/G1.md`.
- T1: the Kestrel Trunk Annex ("Dead Line") is a listed map and mission (`?autostart=trunk-annex&mode=infiltration`): a walkable 36 x 28 m greybox on three levels with the yard, Goods-in, break room, switch hall and gallery, generator room, core switch cage, Test and Control rooms, roof, open stair, fire stair and four ladders; four insertions, objectives O1 and O2, exits E1 and E2; six guards on 40 s master-clock loops (timed patrol routes). NavGrid path costs are Float64 (a long search could loop and find no path). No lights, switches, panels or trench yet (T2, T3).
- S1a: the Kestrel Exchange greybox is a listed map (`?autostart=exchange&mode=sandbox`): cable tunnel and chamber, ground floor shell, basement stair, main stair to a first-floor landing. No lights, guards or objective yet (S1b, S1c).
- S1b: the Exchange's first floor, roof and rear goods yard: switchroom, offices, server hall with its cage, gallery and motor-room stairs, roof with parapets and the steel stair to the yard, yard with cover. Nine rooms.
- R1: Exchange layout v2, basement and ground floor: cable chamber, rectifier, battery, generator, boiler, riser base, service tunnel, MDF hall, test and transmission rooms, foyer, security, canteen, meeting room, cleaners, goods-in, workshop, light well, ring corridor, with the C ladder, B, V and R stairs, the plant ramp and the coke stair. The first floor and roof are rebuilt in R2.
## Unreleased - Movement foley (feature/footsteps)
- Sound: the player's footsteps, landings and moves are real CC0 recordings (Kenney Impact Sounds and RPG Audio,
  `docs/audio-credits.md`) instead of one filtered noise burst per surface. Each step is a heel and a toe from separately
  picked takes with their own pitch and level, the two feet a touch apart, no take repeated back to back, no gear
  sound at all: the suit is built not to make noise. Crouch, walk, run and sprint each sound different (a slow soft roll to a slap); concrete, metal
  (deck ring), grate (rattle), wood (boots on boards), gravel (crunch) and carpet each have their own takes. Landings
  (soft, roll, heavy), vaults, mantles, hops and rolls have their own sounds, all damped by the suit (dull, short, quiet).
- Steps now follow the animation's real foot plants instead of a timer, so they match what the feet do (turning on
  the spot, stopping, a stride at any speed gear).
- Gameplay is unchanged: guards still hear the noise model, never the audio.
- `?foleylab=1`: a listening screen with every surface and gait, the landings and moves, and an A/B against the old steps.
- Tools: `npm run sfx:fetch`, `npm run sfx:render`; tests `tests/foley.test.ts` and `scripts/e2e-foley.mjs` (required).
- Rule: `CLAUDE.md` and the bible (S7) allow CC0 movement foley (Michael, 2026-10-16).

## 3.5.0 - Chaos Theory foundation
- Direction: the game is now **Night Shift**, an original stealth game in the spirit of Splinter Cell: Chaos Theory
  (`docs/design-bible.md` v1.7, story in `docs/story.md`). This release changes no gameplay and no feel.
- Integration: `ct-movement` now carries `master` 3.4.0 (the light phone renderer, baked lamps, the Phone check) with the
  Chaos Theory movement (3.2.0-ct) and the Warehouse CT routes. The Kestrel Exchange is a paper design only (map phases
  0-2, `docs/archive/maps/prompts/exchange-design.md`; paused until roadmap Phase 3b); the old Exchange blockout is gone. The split
  jump can be jumped out of again.
- Design bible: `docs/design-bible.md` is the authority on design (vision, pillars, systems, out-of-scope list, process,
  roadmap Phases 0-7 with 3b); `docs/progress.md` says where the project stands.
- Docs: `CLAUDE.md` 142.7 KB -> 9.6 KB, a lean core with a doc index; everything else moved word for word into
  `docs/systems/*.md` (19 files, read on demand; a script checked that no line was lost). `CHANGELOG.md` 137.9 -> 45.2 KB
  and `TESTING.md` 84.4 -> 32.0 KB keep 3.0.0 onwards; older entries are in `docs/archive/`.
- `?legacy=1`: Wave Survival, Mission, Hunter, Team Deathmatch and Free-for-all, credits / XP / level, the Loadout suit,
  appearance, tag and emotes, HQ, challenges, weapon upgrades and camos, and the Ghost / Panther / Assault bars are hidden
  unless the URL has `?legacy=1` (never saved). Without it: the Play screen offers Infiltration (the default), Training and
  Free Roam; the co-op lobby Infiltration and Free Roam; the Loadout screen weapons, attachments, gadget and presets, with
  every weapon and attachment selectable (nothing is bought, unlocked or saved as owned: the save keeps your choice).
  Nothing is deleted, progression still records, saves are unchanged (no `SAVE_VERSION` change), and
  `?autostart=...&mode=...` starts any mode.
- Title: the game's name is Night Shift on the menu, the loading screen, the page and app titles and the install
  manifest ("Night Shift (Preview CT)" on `/ct/`). The internal ids keep the old names (IndexedDB `shoulder-strike`, the
  save export magic, the co-op app id).
- Tests: `npm run e2e` runs the required suites; `npm run e2e:legacy` runs `e2e-progression`, `e2e-cosmetics` and
  `e2e-clear` (parked content, report only). New: `e2e-park` (the legacy-off and legacy-on menus), `tests/legacy.test.ts`.
  `e2e-traverse` and `e2e-netmove` wait for the match / the host's copy to settle on slow machines.

## 3.4.0 - Light phone renderer
- Direction: desktop first. Phones no longer chase the PC renderer: on the iPhone the voxel look reached ~65 fps cool
  and fell to 18-30 once warm, whatever was cut. Before 3.0 phones ran smoothly because they drew the plain level in
  simple materials with no post effects - that is what they draw again.
- The phone look: the Warehouse's plain blockout (no voxels) in simple materials, smooth characters and weapons, the
  nearest six lamps as plain lights, contact shadows under characters, the scene fog, the vignette / goggles pass and
  nothing else (no shadow maps, no TAAU, no post effects). Native resolution; the frame governor steps down to 75%,
  then holds 30 fps, as before. The Loadout operator on a phone is the smooth one too.
- Gameplay is unchanged: collision, cover, navigation, enemy sight and the light meter always read the plain level, so
  a phone player sees and hides behind the same things as a PC player (co-op and PvP across devices stay fair).
- The Phone check (about 8 minutes): the phone look at 100% and 75%, with the moon's shadow, the 3.3 voxel look for
  comparison, the first run again (heat), then 3 minutes held at 60.

## 3.3.2 - Phone check without the heat
- The iPhone dropped from ~100 fps to ~20 during the Phone check and came back after a few seconds on the home
  screen: heat, not a leak - textures, shaders and memory stay flat across six benchmark matches and return to the
  menu's level after (checked headless). Uncapped runs keep the GPU flat out; a hot iPhone slows its GPU hard, and a
  few seconds idle cool the chip (not the case) enough for it to run fast again until it heats up.
- The Phone check now cools down for 30 s between runs (nothing drawn, a countdown on the run tag), so a run measures
  its settings rather than the runs before it, and ends with 3 minutes at the match's 60 fps cap: per-minute
  averages say whether 60 holds once the phone is warm. About 12 minutes; start with the phone cool.

## 3.3.1 - Reading the Phone check
- The first Phone check (iPhone 17 Pro Max): the phone look at 75% averaged 69 fps (median frame 14 ms), at 100% 42;
  the per-lamp loop 61, the voxel detail 52. The frame rate fell at the end of every run: not the next run loading (it
  loads only after the run's result is taken) but the route - 20 s at a walk ends where the camera leaves the
  dead-end office and looks down the corridor into the hall at the first guards (rifles, pouches, a dog, a recon
  drone, barrels, pickups: ~100 meshes on screen against ~30 before).
- Each run's line now ends with its frame rate per 2.5 s of the route (`by 2.5 s (7 m): ...`), so a slow stretch shows
  where it is.
- The spike log counted nearly every frame of an uncapped run as a spike (14 ms frames against a 120 Hz screen's
  8.3 ms): a spike is now 1.5x the budget or the typical frame, whichever is longer.
- The Phone check runs the phone look at 75% again last: the later runs were all ~56 fps whatever they changed
  (taking bounce light out included), which looks like the phone heating up; the repeat says by how much.

## 3.3.0 - One phone look
- Phones have no graphics settings any more: one fixed look built for 60 fps on the iPhone 17 Pro Max. Settings >
  Display keeps the field of view, the FPS overlay, the avatar style, the interface switch and fullscreen.
- Resolution 75 - 100% of the screen, sharpened to full resolution (TAAU), chosen in the match by the frame governor:
  a match starts at 75% and steps up while there is room; it never goes under 75%. A phone that still misses 60 there
  holds a steady 30 instead of wobbling, and tries 60 again later.
- What the phone look keeps: every lamp's light and shadows (walls, racks, doorways) and the characters' shadows under
  them, bounce light, the moon's shadows (one cascade), one flashlight shadow, the height fog. What it drops: ambient
  occlusion, reflections, bloom, light shafts, depth of field, lens effects, the 2.5 cm prop layer, and on the voxel
  walls the AO, worn edges and fine surface texture.
- The lamps cost two texture reads a pixel instead of a loop over up to eight lamps: they are mixed into one light
  volume (the bake's own 0.2 m cells: light and the direction it comes from) on the GPU - at load, and again over
  the cells of any lamp that switches, is shot out or goes down to an EMP (2 - 4 ms once, not every frame). Next to the
  per-lamp version it looks the same (TESTING.md has the comparison).
- Spike log: every frame over 1.5x the budget is tagged with what happened around it - shaders compiled, voxel
  levels of detail swapped, lamps re-mixed, the governor stepping, else the main thread or the GPU. Each benchmark
  run's line ends with it; feedback notes from a match carry it.
- Settings > Display > Phone check: eight 20 s flights - the phone look at 75% and at 100%, then the per-lamp loop,
  the voxel detail, bloom, light shafts and High shadows put back one at a time, and bounce light taken out. Runs are
  uncapped so the headroom shows. Send the note: it says what the phone can keep at 60.
- Measured before this (iPhone 17 Pro Max, 3.2.2): Medium at 75% 33 fps, at 56% 54 fps - the cost is the shading of
  every pixel, not the passes after it.

## 3.2.5 - A walking benchmark flight
- The benchmark flight cut straight from room middle to room middle - through walls - and was then lifted over
  whatever was below it, so it bobbed up and down over crates and racks. It now follows the guards' walking routes:
  the rooms in a short loop, through the doorways and down the corridors, up the mezzanine stairs (never a ladder),
  rounded off and kept clear of the walls, at a steady 1.9 m eye height (lower only under a beam or a deck), at a
  walking pace (2.8 m/s), the view looking ahead along the route and turning gently (under 100 deg/s); a dead-end room
  is circled rather than reversed on the spot, and the view turns towards the open side at tight corners. The doors
  stand open with their leaves hidden during the benchmark, so nothing stands out into a corridor. Warehouse: a 180 m
  loop through the nine rooms, no step crossing the level, nothing within 0.3 m of the camera.
- A run now covers part of the loop (30 s at a walk) - the same part on every run, so runs compare; results are not
  comparable with earlier versions' benchmarks (different views).

## 3.2.4 - Landscape only, either grip
- Phones are always landscape, whatever the orientation or rotation lock: held upright, the page turns - now the way
  of the landscape grip last held (clockwise after one, anticlockwise after the other), so turning the phone upright
  leaves the game where it was on the glass. Where the browser allows a lock (Android in fullscreen or installed), the
  screen is locked to landscape on the first tap; an installed app locks too. (iPhone browsers have no lock: the page
  turns itself.)

## 3.2.3 - Low's floors, the benchmark flight, turning the phone
- Low drew floors and crate tops as flat haze ("no floor"): the surface atlas made while the map loads came out empty,
  and every preset but Low replaced it when its size changed - Low's size (256) never did. It is always drawn anew
  on the first graphics apply.
- The benchmark flight went through the solid block under the mezzanine deck (the Mezzanine room's middle at 2.2 m)
  and the frame rate fell through the floor there: the flight is sampled densely and every point kept 1.6 m over
  whatever solid is below it, under the roof.
- Turning the phone mid-match fired several resizes with in-between sizes, each re-making every full-resolution
  target; at Ultra the memory spike closed the tab. The engine now resizes once the size has settled (250 ms).

## 3.2.2 - Phone memory and per-pixel cost
- The iPhone (3.2.0 benchmark) is GPU bound - frame time follows the pixel count (Medium 33 fps native, 54 at 75%;
  the "main thread" figure falls with resolution: it is waiting on the GPU) - and Ultra ran out of memory on its
  second or third run. Per match: GPU textures 251 -> 159 MB and JS heap ~400 -> 289 MB (headless, phone Ultra):
  - the voxel brick pools and the lamp bake no longer keep a CPU copy of their textures (kept only to rebuild after a
    lost WebGL context; 64 MB per voxel layer);
  - phones: the moon's shadow maps at most 1024 (Ultra's 2048 cascades took 72 MB), surface textures at most High.
- Phones: one flashlight shadow (every shadowed light is sampled by every pixel), no on-the-fly reflection filtering
  (several cube taps per pixel; the probe's mips / spherical harmonics instead), voxel corner shading from 4
  neighbours instead of 12; FXAA no longer runs behind TAAU (every device).
- Shaders compile on the loading screen (every material ready before the match starts; the benchmark counted 37-57
  compiles inside each run).
- Phone benchmark: each run frees the last match and pauses 2.5 s before the next loads ("freeing memory").
- The mid-match shadow rebuild did not reproduce headless (same draws and render time after it): most likely memory
  pressure on the phone; this release frees a lot of it.

## 3.2.1 - Desktop resolutions are the monitor's own
- Settings > Graphics > Resolution (desktop) lists the monitor's standard resolutions instead of percentages of the
  window: a 7680 x 2160 monitor offers 7680 x 2160 (native), 5120 x 1440 and 3840 x 1080 (same shape, down to half
  its height; 16:9, 16:10, 21:9 and 32:9 tables; an unusual shape gets its native size at 75 / 67 / 50%). Fullscreen
  draws exactly that; a window draws the same share of itself.
- Benchmark lines and feedback notes name the chosen resolution, with the real size when a window differs
  ("5120x1440 (window 1707x1005)"); the display line adds the monitor. Benchmark > Resolutions runs each of the
  monitor's resolutions.

## 3.2.0 - Baked lamps: every lamp lights and shadows correctly
- Every fixed light in the map (lamp strips, floods) is baked when the map loads: how much of each lamp's fixture
  every 20 cm of its reach can see through the level - walls, racks, crates, shelves, doorways. Every material shades
  each lamp by it, so all of them cast correct shadows (before, only the nearest 2-4 did; the rest shone through
  walls and racks while the guards' light model said you were in shadow). Strip lamps are area lights: soft along
  the strip, sharper across it. Characters get soft shadows from every lamp (a capsule each).
- Switches, shot-out lamps and EMP still change a lamp at once (its intensity; nothing re-bakes).
- Cheaper on every device: lamps are no longer real lights or shadow maps (the Ultra phone path: lamp shadow-map
  draws 45 -> 10, render JS 6.5 -> 5.2 ms on software GL); only flashlights stay real lights (up to 4, two with
  shadows). Settings > Graphics: Real-time lights is gone; Shadows is the moon and the flashlights.
- The bake runs in the voxel workers on first load (about 2 s headless) and is cached (IndexedDB `lamps:` keys, the
  newest two). `?baked=0` renders the old way, for comparisons.
- No second draw of the scene for depth: without ambient occlusion / reflections (every phone preset, desktop Low /
  Medium) the fog, light shafts and TAAU read the scene pass's own depth buffer (a depth texture on the first post
  process's target) instead of a separate depth pass. Phone Ultra: 223 -> 159 draw calls (baked lamps included).
- Benchmark > Feature costs adds: the settings at 75% render scale (faster = the GPU is the limit), anti-aliasing FXAA
  instead of TAA, and Detail Medium (no fine prop layer).
- Bounce light: the lamp circuits are mixed into one texture whenever a circuit changes (switch, shot, EMP), so a
  pixel takes one GI sample instead of one per circuit (9 in the Warehouse).

## 3.2.0-ct - Chaos Theory movement (ct-movement branch)
Phase 0 - speed gears, instant stop, roll:
- Speed gears: six paces, stepped one at a time (controller D-pad up / down, mouse wheel or = / - on PC, the new speed
  rocker on touch). Crouched 0.5 / 0.9 / 1.3 / 1.8 / 2.3 / 2.8 m/s, standing 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0 m/s;
  the stick scales the gear's pace, a keyboard or a stick at its rim gives the full pace. Every spawn and respawn
  starts in gear 3; crouching and standing keep the gear. Sprint is gear 6 standing while it lasts; aiming is still
  capped at the aim pace. The HUD shows SPD pips by the light meter for 1.5 s after a change; the touch rocker shows
  them all the time.
- Footstep noise: crouched gears 1-4 and standing gears 1-2 are silent; faster gears are heard further.
- Chaos Theory feel on free movement: letting go of the stick stops the operator dead on the next step (the feet
  stay planted), starts reach full pace within 0.08 s, direction and gear changes
  take effect at once, no planted pivots, the body turns at up to 720 deg/s. Cover, cover-to-cover, traversal and
  the guards move as before (the guards' tuning is now pinned by a test).
- Stopping holds the exact stride you stopped in (a foot in the air sets straight down) until the next input - the
  stick, aiming, a stance change, cover or a climb - from any pace, crouched (no automatic kneel) or out of a sprint.
  A controller stick springing back counts as letting go from the full pace (it no longer slows you on the way).
- Cover: the speed gear sets the pace along the wall (gear 1 creeps, gear 6 hurries; no faster than 2.8 m/s standing,
  1.8 crouched; gear 3 is about the old pace).
- Forward roll: tap crouch while moving standing in gear 5-6 (or sprinting) - a committed 3 m roll in 0.7 s that
  comes up crouched; guards within 2 m hear it.
- Controller: D-pad right is now the gadget (hold to aim, release to throw); D-pad left tapped pings (co-op), held
  opens the gadget wheel; View tapped is goggles, held plays emote 1. PC: the mouse wheel changes the speed gear
  (weapons stay on Q / X); new bindable keys Speed up (=) / Speed down (-).
- Touch layout v4: the speed rocker (right of the move stick's zone) is added to every preset and the layout editor;
  saved layouts keep every placement.
- Debug Tune panel: a Chaos Theory table (stop blend, start time, turn rate, roll time / length).

Phase 1 - networked movement state:
- Co-op and PvP: team-mates and opponents are shown doing exactly what they are doing - in high or low cover (hiding,
  peeking over, leaning out at an edge, kneeling), climbing a ladder or drainpipe, hanging from a pipe or a lip,
  crawling a duct, riding a zipline, vaulting, mantling, rolling and in a takedown - posed by the same code as the
  player (hands and feet on the same rungs, within a few cm), instead of sliding upright between positions.
- A committed move (vault, mantle, step, drop, hop, roll, window vault) is sent once at its start and replayed on
  the other screens along the same path, so it never cuts corners through the obstacle.
- A change of mode (taking cover, grabbing a ladder) is sent at once, not on the next 20 Hz tick.
- Hit volumes on other players follow their pose (hanging, crawling, leaning): a shot at a hanging player's head is a
  headshot. The host's lag compensation rewinds the posed head and body, not just the feet.
- Host checks: a client's free movement is held to its speed gear's pace (+15%); a client claiming a ladder or lip
  stays within half a metre of it (clamped, never kicked).

Phase 2 - split jump, wall jump, pipe legs up / inverted:
- Split jump: between two tall walls 1.2-1.95 m apart, facing along them, a double jump braces in a split with the
  legs straight out to both walls 2.5 m up. Aim (LT) draws the sidearm one-handed (turn up to 100 deg either way, look
  down steeply), RT fires; B drops (or a drop attack). Nothing else leaves it.
- Wall jump: facing a wall under a lip 2.7-3.8 m up (too high to grab standing), Y ("Wall jump") kicks off the wall up
  to a hang on it; at an inside corner the kick goes off the adjoining wall to the lip beside it.
- Horizontal pipes: hanging by the hands, Y ("Legs up") crosses the legs over the pipe - a slow shimmy along it with the
  feet well up out of the way; Y again ("Invert") hangs upside down by the knees: no travel, the sidearm aims and fires
  (spread x1.3) while the camera stays upright; Y curls back up, B goes back to the hands; inverted, B lets go and flips
  over onto the feet. Changes take about half a second; getting hit during one drops back to the hands.
- Co-op / PvP: other players see all of it (split braced and aiming, the wall kick, legs up, inverted), hit volumes
  follow the pose.
- Proving Grounds: a Chaos Theory course north of the platform (a split corridor with lips above, a wall-jump block
  with an inside corner, a pipe over open ground).

Phase 3 - rappel and fences:
- Rappel: at a roof edge with a rappel point, Y ("Rappel") hooks on and steps over. Stick down descends (1.6 m/s, 3 m/s
  with sprint held), up climbs (1 m/s; at the top back over the edge). Y kicks out from the wall and swings back,
  sideways with the stick (up to 1.5 m either way). Aim (LT) turns round on the rope with the sidearm. Beside a window,
  Y kicks through it (the glass breaks) into the room. B unhooks within 2 m of the floor; at the bottom it unhooks.
- Fences (chain-link): Y ("Climb") grabs one; climb up / down 0.9 m/s, shimmy 0.6 m/s; at the top Y flips over and
  down the far side; B drops. Climbing above gear 3 rattles it (heard 4 m away); gears 1-3 are quiet. Fences stop
  bodies, never bullets or sight, and give no cover.
- Co-op / PvP: other players see you on the rope (with the rope drawn) and on fences.
- Proving Grounds: a 5.5 m rappel house north east (ladder up its west side, a rappel point over a glazed window, a
  doorway east) and a fence north west of the platform.

Phase 4 - Chaos Theory takedowns and the grab:
- Drop attack: hanging from a lip or a pipe (by the hands or legs up), braced in a split, on a zipline or a rope, a
  guard 1.2-5 m below within a metre of where you would land: "Drop attack" (tap knocks out, hold kills).
- Hanging inverted on a pipe, a guard right beneath: choke him up (tap) or break his neck (hold); you stay hanging.
- Hanging at a lip, a guard standing at it above is still pulled over (the ledge pull).
- The grab replaces the instant takedown from behind (dogs excepted): Y ("Grab") takes the guard and holds him in front.
  Holding him you walk (gear 2 at most), LT / RT aim and fire the pistol one-handed over his shoulder (spread x1.2);
  Y again: tap knocks him out, hold kills; B shoves him away (he staggers a second, then raises the alarm). Guards who
  see you hold their fire for 1.5 s, then aim at your head only - and their shots hit him first. If he dies, he drops.
  An Execute charge is earned as with any takedown.
- Co-op: a client's grab holds the host's guard in front of that player (a shield for them too).
- PvP: the drop attack, the ledge pull and the inverted choke work on opponents (the host checks them); no grabs.
- Training: the takedown step is now a grab and a second press.

Phase 5 - co-op team moves:
- Brace: with a team-mate within 3 m and a wall right behind you, hold Y - back to the wall, hands cupped. B stands up.
- Boost: facing a braced team-mate (within 1.2 m), tap Y - a step into their hands and a toss up to a lip, pipe or
  split above (up to 4.5 m) that you could not reach alone. The prompt shows only when there is one in reach.
- Human ladder: facing a braced team-mate, hold Y - you climb onto their shoulders (feet 1.45 m up) and stand there
  free to turn, aim and fire; Y grabs a lip up to 4.1 m over the floor, B hops down. The bottom holds still; B drops
  the climber.
- The host checks every request on both players' states (alive, team-mates - same side in Team Deathmatch - the
  partner braced, the climber on the ground, within reach, the target in range; one request a second) and starts it
  on both screens at once; refused requests do nothing.
- Y order: takedown > team move > Chaos Theory move > traversal > interact.
- A teleport (respawn, insertion) now drops any committed move in flight and is never counted as a fall (no landing
  roll where it lands).
- Proving Grounds: a 4.2 m block north (out of reach alone) for boosts and the human ladder.

Warehouse - Chaos Theory routes (more ways in, more height):
- A roof walkway over the south facade (6.3 m, moonlit, a loud metal deck): up a drainpipe in the west yard, or - with a
  team-mate - a boost or the human ladder up the new pump house in the east lot and a climb from its top.
- A rappel point on the roof edge over the glazed dispatch window: down the rope, kick through into dispatch.
- The skylight edge over the workshop: hang from it and drop on the patrol below.
- The service corridor's walls stand 4 m along a 5 m stretch (1.86 m apart, no cabinets): split jump over the new
  corridor patrol and drop on him.
- A pipe from the mezzanine deck out over the factory floor at 4.4 m, above the floor patrol: legs up, inverted, drop.
- The big press stands 3.3 m: a wall jump up to a perch over the floor.
- A chain-link fence closes the dark yard lane off from the east lot: climb it in the dark (quietly at gears 1-3) or walk
  round through the lit gap by the facade. Guards walk round.
- One more guard: a corridor patrol (Hunter / Infiltration counts include him).
- The gatehouse in the east lot moved south, clear of the pump house.
- Takedowns: the offer now tries the three nearest guards (a guard behind a wall no longer hides the one under you);
  a grab whose hostage is shot dead ends at once.

Playtest changes (Michael, 2026-10-08):
- Jump: a new touch Jump button; with a controller / keyboard, Y / E jumps when nothing else is on offer. A jump keeps
  the run's pace (about 0.8 m up) and the hands grab what comes in reach on the way: a lip, a horizontal pipe, a
  drainpipe or a ladder. A second press in the air between two tall walls braces in a split (a double jump); the split
  prompt says so.
- Split jump: the feet brace 2.5 m up (was 1.9 m); the walls need 3.6 m.
- Horizontal pipes: hanging by the hands faces along the pipe (hand over hand, not side-on like a lip), and so does
  hanging upside down (the legs wrapped round it); hold the stick back against the facing to turn round on it.
  Standing under a pipe, Y / the action button takes it before a mantle over anything beside it; the mezzanine deck
  pipe now starts further back over the deck.
- Touch action button: one button does what the world prompts show - take cover, vault, climb, grab, rappel, wall
  jump, boost, cover-to-cover, corner, leave cover, use - dimmed when nothing is on offer. The prompts stay on the
  surfaces as indicators (no longer tapped). With a cover face and an obstacle both prompted, moving (or the stick
  pushed at it) goes over / up it, standing still takes cover. Touch layout v5 adds the Jump button beside it; saved
  layouts keep every placement.

Playtest changes, second round (Michael, 2026-10-08):
- Split jump: the legs go almost straight out to the walls (the body sits lower, hips just over the feet), so the
  hallway can be wider: 1.2-1.95 m between the walls (was 0.9-1.7). It faces down the hallway the way you jumped, so
  either way works. No jumping out of it: drop (B), a drop attack on a guard under you, or aim and shoot the pistol.
- Warehouse: the corridor cabinet bank is gone; the corridor's own two walls stand 4 m along a 5 m stretch, 1.86 m
  apart. Proving Grounds: the split corridor is 1.8 m wide.
- Fix: after a fall (or stepping off a curb) the operator could come to rest floating 4-14 cm over the floor. The
  character now settles onto it.
- Fix: a respawn / insertion puts the feet straight into a stance where you appear (they used to walk over from where
  you were), and a foot stepping back past the other bows round it instead of brushing through it.
- Split jump: jumping out of it is back (Michael, 2026-10-08). Braced, Jump (or Y) jumps up to a lip, pipe or ladder
  over the split ahead of you; drop, a drop attack and the pistol stay as before.

- Docs: level design standard (`docs/level-design.md`), map spec template (`docs/templates/map-spec.md`) and the
  Kestrel Exchange spec (`docs/archive/maps/prompts/exchange-map.md`).

## 3.1.9 - Epic's half-fog, the phone's display rate, no locks, lighter phone passes
- Desktop Epic sometimes drew the bottom half of the screen as flat fog: ray-traced reflections and depth of field
  share one depth pass, and depth of field paused it whenever nothing was in focus - the reflections (and the fog
  where they composite) then read a stale depth. Depth of field only pauses that pass when nothing else reads it.
- The phone read its 120 Hz screen as 16 / 24 / 48 Hz in heavy matches (the detector took the median frame time, and a
  GPU-bound frame lasts whole refresh periods), so the frame governor saw every slow frame as on time and never
  stepped down. The detector now reads the fast end of the frames, and in a match it can only raise the rate (a real
  cap - low-power mode, a browser at 60 - shows on the menu).
- Phones toward 120 fps: ambient occlusion (the costliest pass measured: Medium 54 -> 74 fps without it; the voxels
  darken corners themselves), screen-space reflections, depth of field, motion blur, lens effects and Panini are off
  on phones whatever the preset; bloom is cheaper. Lighting, shadows, bounce light and light shafts stay. Settings
  hides those rows on phones; motion blur is gone everywhere (no preset used it).
- The phone target is now 60 fps at Ultra, native resolution: no resolution lock - phones choose the output in
  Settings > Graphics > Output resolution: Native (the default; 2868 x 1320 on the iPhone 17 Pro Max), 2x (1912 x
  880, as before) or 1.5x. Ultra on a phone renders native (no upscaling); a phone's Target frame rate starts at 60
  (once; "Display refresh" is still there) so the frame governor holds 60.
- No PvP locks: the shared PvP graphics look, the 90 deg / 16:9 field of view cap and Panini-off in PvP are gone;
  everyone plays on their own settings.

## 3.1.8 - Epic shadows fixed, a Resolution list, no hidden resolution drops
- Desktop "all fog but the lamps" was Epic shadows: 8 soft lamp shadows took the level's and characters' shaders past
  the 16 textures a shader may use on the laptop (Chrome on D3D11; headless software GL allows 32, so tests passed);
  those shaders failed and the level drew black under the fog. Every preset now stays within 16: lamp / flashlight
  shadows are PCF (one texture each) and at most 4 (`MAX_SHADOW_CASTERS`); Epic keeps 2048 maps and the moon's 4
  high-quality cascades. The desktop e2e checks every material shader at Epic against 16.
- The blurry desktop: with Adaptive detail off, the old dynamic resolution (still on in older settings) lowered the
  render resolution whenever a frame missed 120 Hz. Retired: only Adaptive detail may change it in a match.
- Settings > Graphics > Resolution (desktop): a list of real render resolutions from the native output (50% .. 200%);
  a pick applies at once and asks "Keep this resolution?" - no answer within 15 s (or Revert / Back) puts the last one
  back. Phones keep the Resolution scale slider.

## 3.1.7 - Every match stayed in memory
- The phone crash reports (High / Ultra benchmarks a minute in, and a crash 14 minutes into a session): every match
  stayed in memory after it ended - about 80 MB each at Low, far more at Ultra. Babylon's engine-wide shader cache keyed
  each match's material shaders by a plugin id that counts up, so none was ever reused, and each held its material,
  its scene and the whole match. The cache is emptied whenever a scene is freed (before the next one loads), and going
  back to the menu frees the match first too. Headless: back at the menu the heap returns to ~50 MB after every match
  (it climbed 80 MB per match before).
- Feedback notes carry every setting: `settings` (every graphics / display setting, the preset's features included)
  and `changed` (everything else that differs from the defaults; a moved touch layout or rebound keys as "custom").
  Benchmark and crash notes carry the same full context. Settings > Feedback > Copy as text now puts each note's
  context on the line under it (device, display, GPU, frames, settings), so a pasted report says what it ran on.
- Desktop Ultra (all grey but the lamps in every benchmark run) is not yet reproduced: see TESTING.md.

## 3.1.6 - Forced landscape
- iPhone browsers cannot lock the orientation (the manifest's `landscape` and `screen.orientation.lock` only work on
  Android), so with rotation locked the game sat on a "rotate your device" screen. Now a touch device held upright
  gets the whole page turned 90 degrees: hold the phone turned left (the Dynamic Island on the left). Menus, HUD,
  sticks and buttons work as in landscape; the safe areas follow the turn. The rotate screen is gone. Turning the
  phone to landscape with rotation unlocked still uses the browser's own landscape.

## 3.1.5 - Benchmark crash safety, crash reports
- iPhone Feature costs on 3.1.4 (Medium, 1912 x 880, every run in its own match - the first valid per-feature
  numbers): your settings 52 fps (1% low 20); without ambient occlusion 70 (1% low 42); textures Low 56 (1% low 40);
  shadows Low 55; light shafts, bloom and lamps 8 within 2 fps. A post-effects rebuild mid-match is fine (49); a
  shadow rebuild mid-match drops it to 15 fps (main thread 29 ms) - the slowdown comes from rebuilding the shadows, not
  the post effects (still to find: headless Chromium shows nothing different after it).
- Ultra and High closed the tab during the benchmark: the next run's match was built while the last one was still in
  memory (~0.5 GB of JS heap each at High in headless Chromium). A match now frees the last one (or the menu stage)
  before it loads (`App.releaseState`), for every match start, not only the benchmark.
- Crash reports: a heartbeat every 5 s and on every stage change (menu, loading, in a match, benchmark run n/N) with
  the feedback context; hiding or closing the page marks it clean. If the page died while open, the next start saves
  a "Crash report" note (Settings > Feedback) saying what was running, and shows a toast.
- The benchmark's note is saved after every run ("Benchmark (3 of 9 runs so far) - ..."), so a crash keeps the runs
  before it; the final save replaces it.
- A run tag at the top of the screen during the benchmark and its loading screens: "Run 3/9 · without bloom · 52 fps".

## 3.1.4 - Every benchmark run in its own match
- iPhone Feature costs on 3.1.3: unchanged (Medium 53 fps with your settings, Ultra 21; the runs after the first
  still 8-20 fps), so the 3.1.3 material refresh is not the cure. Headless Chromium shows nothing different after a
  rebuild (same passes, draws, light tiles, no GL errors): what goes stale is particular to the iPhone's GPU.
- Every benchmark run (Feature costs, Every preset, Resolutions) now loads its own match with its settings set before
  the map loads - the way the first run, always the fast one, was built. A preset's Detail tier (voxel layers) now
  takes effect too; before, every preset ran on the first match's.
- Feature costs ends with two diagnosis runs at your settings: the post effects rebuilt mid-match, then (same match)
  the shadows rebuilt mid-match. Their lines say whether a rebuild alone slows the phone and whether new shadows put
  it right.

## 3.1.3 - Graphics changes in a match no longer slow every frame
- iPhone Feature costs on 3.1.2 (1912 x 880): Medium 57 fps with your settings, Ultra 22. But every run that rebuilt
  the post effects without touching shadows (ambient occlusion, light shafts, reflections, bloom, depth of field,
  post-effect resolution or textures off) dropped to 8-20 fps and stayed there; the shadow and lamp runs, which make
  every material rebuild its shaders, were back at full speed. The same happened when changing those settings from
  the pause menu.
- A post-effects rebuild in a match now has every frozen material re-read its setup for two frames (as a shadow
  change already did), then freeze again.
- Turning ambient occlusion (and screen-space reflections) off mid-match on a preset with depth of field left fog and
  TAAU reading a depth pass depth of field had paused (a stale depth: smeared upscaling, wrong fog). The camera's
  depth passes are released with the old effects and the fog's is always running.

## 3.1.2 - Feature costs benchmark
- iPhone 17 Pro Max on 3.1.1 (1912 x 880): Low 76 fps, Medium 47, High 41, Ultra 21 (3.1.0: 60 / 19 / 15 / 12) -
  better, still short of the target, and the 1% lows (8-15 fps) show hitches.
- Settings > Graphics > Benchmark > Feature costs: your settings, then one run per costly feature turned off or down
  (ambient occlusion, light shafts, reflections, bloom, depth of field, shadows, lamps, post-effect resolution,
  textures), 20 s each - the device's own GPU says what costs most.
- Every benchmark line now counts hitches (frames over 50 ms) and the shaders compiled during the run.
- The benchmark result saves itself to Settings > Feedback the moment it finishes; the report scrolls inside its
  window (it outgrew a phone screen) and Copy text puts it on the clipboard.
- Benchmark runs hold the frame governor off (it was adapting during "current settings" runs, so those measured a
  moving target).

## 3.1.1 - Phone GPU fixes from the first iPhone benchmark
- iPhone 17 Pro Max benchmark on 3.1.0 (2868 x 1320): Low 60 fps (Safari's cap), Medium 19, High 15, Ultra 12 -
  the GPU was the limit (the main thread waits on it). Fixes:
  - The fog / light-shaft pass runs ahead of TAAU at the scene's resolution (it marched 6-8 lamps x 16 steps for
    every native pixel); TAAU's jitter is now set as the camera starts rendering, so a pass ahead of it is resolved
    with everything else. 8 steps per lamp below Epic.
  - SSAO / SSR's geometry buffer renders at the scene's resolution with TAAU, not the native canvas.
  - Phones render at most 2 device pixels per CSS pixel (the iPhone's 3x: 2.25x fewer pixels for every
    full-resolution pass; no visible difference on a ~460 ppi screen). PCs stay native.
- Changing Shadows (or a preset) in the middle of a match no longer leaves frozen materials on the old shadow setup
  (WebGL "unbound uniform buffer" warnings every frame, undefined rendering on some GPUs).

## 3.1.0 - One graphics ladder for PC and phones, Auto graphics, adaptive detail, fair crossplay
- Graphics > Preset: Auto (the default; 3.0 installs still on Epic move to it). The game picks the preset for the
  device from its GPU's name, or - when the browser hides it, as every iPhone does - measures the device for a few
  seconds on the main menu (once per device; "Detect again" measures anew). Settings say what was found.
- Adaptive detail (on by default; replaces Dynamic resolution): in a match the game steps detail down when frames are
  missed and back up when there is room - render resolution first, then shadow refresh, light shafts, distant voxel
  detail, effects, lights, character detail. It never changes fog, cover, sight lines or anything gameplay reads.
  A hot device that keeps slowing is noted (debug overlay, feedback notes); iOS Low Power Mode (30 fps) is shown once.
- Frame-rate cap is now Target frame rate (Display refresh, 30, 60, 90, 120, ...): the detail adapts to it.
- PvP: lamp count, lamp and moon shadows, bounce light, contact shadows (off), light shafts (off) and effects density
  are the same for everyone, whatever the preset - how dark or hidden a player looks never depends on the device.
- `perf.mjs --preset=<p> [--mobile]`: a preset's CPU side against the phone budgets (`PASSES=1`: draws per pass).
- Phone tuning (draw calls on the phone platform, 10 guards, Warehouse): Ultra 531 -> 233, Low 227 -> 103. Below
  Epic the level casts its shadows from a plain blockout stand-in (one or two draws per shadow map instead of dozens
  of voxel chunks; shadows within half a voxel of before); the moon's cascades skip characters under the roof (it
  cannot reach them) and small props; fog and TAAU read the G-buffer's depth when SSAO / SSR draw one (no second
  depth pass; depth of field's own depth pass runs only while aiming); guards are one voxel mesh (the head split
  stays for the player's camera fade); Low's moon shades only the level (characters get contact shadows).
- Graphics presets are one ladder for every device: Low, Medium, High, Ultra, Epic (PC only) and Custom. Each preset
  also sets its render scale (Low 67%, Medium 75%, High 85%, Ultra 90% with the TAAU upscaler; Epic native). Phones
  never get Epic or ray-traced reflections (Epic shows as Ultra there). Settings from 3.0 keep their preset (with the
  new values) or their Custom choices.
- New graphics options: Volumetric lights (how many lamps scatter light in the air, 2-12) and Post effects
  resolution (ambient occlusion and screen-space reflections at half or full resolution). Low and Medium keep props
  in the 5 cm voxels (no 2.5 cm prop layer); Low has a lighter shadow set (sun only), Medium two lamp shadows.
- Fog is drawn on every preset (Volumetric light now only adds the light shafts): what a player can see at a
  distance does not depend on graphics settings.
- Far-away voxels never turn see-through: thin walls and panels (doors, partitions, signs) used to drop out of the
  coarsest level of detail now and then; every filled piece is at least one voxel thick there.
- PvP (Team Deathmatch, Free-for-all) is fair between PC and phones: the field of view is capped at 90 and held at
  its 16:9 width on wider screens (ultrawide and phones see no more of the sides), Panini is off. The lobby says so.
- The benchmark's "every preset" runs Low to Epic (Low to Ultra on phones).

## 3.0.0 - PC renderer, Warehouse focus, desktop interface, playtest feedback
- Focus: the Warehouse is the one playable map and runs every mode - Hunter, Wave, Mission, Infiltration (four
  missions: Cold Storage, Ledger, Courier, Blackout - every objective type), Free Roam (new: the whole map, no
  guards, every weapon), co-op and PvP. Proving Grounds stays as a plain range for Free Roam and Training. Embassy,
  Mansion, Port, Refinery and Dust Depot are parked (not offered; kept as they were in 2.3.0 to come back later);
  their mission records and challenges stay in the save.
- Voxels: the Warehouse and Proving Grounds are built from voxels - 5 cm at Epic near the camera, 10 / 20 cm further
  out (levels of detail by distance, nearer on High / Ultra) - with a per-voxel colour and roughness variation,
  ambient occlusion and worn edges between voxels and the procedural surface textures inside each face. Built on all
  but four of the CPU's threads at load and cached on the device (the second load is quick). Gameplay is untouched:
  collision, cover, ledges and the guards' navigation are the same as before.
- Warehouse in voxels: concrete block walls with mortar lines, corrugated cladding over a concrete plinth with rust
  streaks, cast concrete with chipped edges, saw-cut floor slabs with oil stains and yard puddles, painted steel with
  worn edges and seams, plank crates, shrink-wrapped loads in the racking bays, hazard stripes, grime up the wall
  bases, conduit and junction boxes, electrical boxes, vents and signs. Props, furniture, machines and vehicles at
  2.5 cm. Inside under the roof is dark but for the lamps and what falls through the skylights and doorways (the map's
  open sky is baked at load); cover, ledges and floors stay exactly where they were.
- Weather on the Warehouse (Play screen and co-op lobby): Clear, Rain (no rain indoors - it falls through the
  skylights; the yard and the open floor go wet and glossy, puddles turn to mirrors) or Fog (thick, with moonlit
  shafts under the skylights and through the doors). Visual only.
- Voxel characters: the operator, every guard, co-op players and the menu operator are built from 2 cm voxels (4 cm
  further away) - suit, carrier, pouches, pads and the tri-lens goggles - with a tone per voxel and fine seams up close,
  animated as before (ragdolls included); the lens glow, hit flash and the camera's head fade work on them. The stick
  avatar style stays as it was.
- Voxel weapons and gadgets: every gun (in the hands, on the back, the hip and the thigh, in the Loadout preview) is
  built from 1 cm voxels with 5 mm sights, pins and triggers; thrown grenades and the drone are voxels too.
- Global illumination (Epic; Graphics > Global illumination): the lamps' light bounces off floors and walls into the
  rooms around them, per circuit - switch a room's lights off, shoot a lamp out or set off an EMP and its bounce light
  goes with it.
- Ray-traced reflections (Settings > Graphics > Reflections: Off / Screen space / Ray traced): wet floors, puddles
  and steel reflect the voxel world off screen too - walls, racks, lamps, the sky through the skylights - and the
  characters; half rate (a checkerboard, default) or full.
- TAAU upscaling (Settings > Graphics > Display > Upscaler): with a resolution scale under 100% the game renders
  smaller and rebuilds a sharp full-resolution image over frames (e.g. 7680 x 2160 from 67%).
- Panini projection (Display): keeps very wide fields of view from stretching at the sides (ultrawide screens).
- Bullet chips: shots knock a voxel-sized pock out of walls, floors and props with a spray of debris in the struck
  material's colour (cosmetic - cover and collision never change).
 21:9 and 32:9 (up to 7680 x 2160) - the view widens with the screen up to a widest field of
  view (default 120 deg, then the sides stop growing), menus stay a centred 16:9 layout, the HUD keeps to a centred
  16:9 on 32:9 (HUD width: auto / 16:9 / 21:9 / full); the frame-rate cap names the display's refresh (up to 240
  Hz); photos are saved at full output resolution.
- Laptops: the game asks for the high-performance GPU and tells you once if the browser is on the integrated one
  (and how to switch); Settings > Graphics shows the GPU in use.
- Benchmark (Settings > Graphics): a camera flight through the Warehouse - the current settings, every preset, the
  render pixel counts of 2560 x 1600, 4K and 7680 x 2160, or a 10-minute sustained run (first vs last minute, for a
  laptop that slows once hot); average and 1% low per run, saved as a feedback note.
- One renderer for every device, built for a gaming PC (phones run the same, slower): Graphics presets High /
  Ultra / Epic (default) with every feature adjustable (Custom): up to 48 real lights (clustered), lamps and every
  guard flashlight casting shadows (soft on Epic), cascaded sun / moon shadows, ambient occlusion, screen-space
  reflections, volumetric light and height fog, bloom, depth of field (aiming, the menu operator), motion blur,
  lens effects, TAA / MSAA / FXAA, HDR tone mapping; native resolution with a 50-200% scale, optional dynamic
  resolution, a frame-rate cap (30-240), FOV to 120. The menu stage gets shadows, bloom and depth of field.
- Materials: every level piece, character, weapon and prop is PBR with procedural surfaces drawn on the GPU at load
  (sixteen tileable kinds - concrete, floors, asphalt, gravel, grass, plaster, wood planks, corrugated paint,
  brushed steel, rust, tiles, carpet, brick, checker plate, rubber, fabric - with albedo detail, roughness, normals
  and cavity), picked per piece by what it is (floors by what is underfoot, the rest by colour); image-based light
  from a probe of each map.
- Detail: a dressing pass on every map (Detail Ultra / Epic, visual only - nav, cover and ledges are unchanged):
  skirting, conduit with junction boxes and switches, electrical boxes, vents, signs, floor stains, puddles and
  debris; draw and animation distances x2-4; spent brass that stays on the floor, longer-lasting bullet holes.
- Weather (engine): falling rain streaks with wet glossy floors that the reflections pick up, blown dust, heat
  haze (the Warehouse gets its weather choice with the voxel art pass).
- Desktop interface (detected, or Settings > Graphics > Interface): menus scale to the window, no touch settings or
  touch controls (a touchscreen laptop gets them back when touched), hover states, fullscreen on demand.
- Mouse & Keyboard settings: sensitivity, aim sensitivity, invert, raw input, and every key rebindable (two per
  action, extra mouse buttons too); prompts and the controls list follow the bindings.
- Playtest feedback: Settings > Feedback and Pause > Report feedback write a note (type, text, the map / mode /
  position / graphics it was written in) with photos from photo mode - the game freezes, the HUD hides, a free
  camera flies to the problem; take, retake or keep, as many photos as needed. Notes stay on the device; Export
  report makes one HTML file with every note and photo (share sheet on phones), or copy them as text.

## Older versions
- 2.3.0 and earlier: [docs/archive/CHANGELOG-pre-3.0.md](docs/archive/CHANGELOG-pre-3.0.md)
