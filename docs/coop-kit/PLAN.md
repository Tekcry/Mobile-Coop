# coop-kit: plan
Owner: Night Shift | Player Build. Status: current (job doc).

Lead: Night Shift | Player Build. Planner: Opus 5.5, master 2148ec969; revised for plan check 2 at master 65411ea65.
Brief: `docs/coop-kit/BRIEF.md`. Two parts (lead note ~18:10): **part 1** (R32 shoulder stand, R34 rope descent) is
planned in full; **part 2** (the five moves Michael added at ~18:05) is planned in full in "Part 2 (detailed)" below
(2026-10-26 ~18:30; pointers on PR #578 a8bac697b, #581 752e106be, #574 61fa85fc8; A11). Part 1 file:line pointers are
origin/master 65411ea65 (2026-10-26). PR #578 lands before A1 is cut and moves `teamMoves.ts` / `teamController.ts`
lines (on #578: rope offer 687 -> 820, `ropeOffer` set 791 -> 924, `checkTeamRequest` 55 -> 85, relay line 64 -> 100,
`ropeTopPath` 364 -> 449, `ropeSeenStep` 542 -> 627), so each slice brief re-takes its pointers from the master that
slice is cut from.

## 1. How it works today (master 65411ea65)

- **Team-move rail.** `src/game/teamController.ts` runs both players' sides (states `:37-61`; the Co-op action in
  `idle` `:667`); `src/game/teamMoves.ts` holds the pure rules and paths. A move is a request `tmove` (client
  `src/net/coopClient.ts:327-328`; host's own `src/net/coopHost.ts:1054`) checked by the host on both MoveStates
  (`onTeamMove` `coopHost.ts:1117-1173` -> `checkTeamRequest` `teamMoves.ts:55-105`), then `tstart` to both
  (`coopClient.ts:305-306` -> `TeamController.begin` `teamController.ts:912`). Kinds on the wire: `boost | ladder |
  throw | hang | rope` (`src/net/protocol.ts:305`, `:308`, parse `:885`, `:900`); `ladder` is the ledge relay
  (`teamMoves.ts:11`). Paired moves (hang, rope) stay paired on the host (`teamPairs` `coopHost.ts:1089`, `:1156-1159`)
  until `hangEnd` (`pull` / `drop`, `:1119-1128`) or `end`.
- **The two-person rope (B7) starts only from its foot.** A standing player facing a drop with the partner near offers
  it (`teamController.ts:777-801`, room `ropeRoom` `teamMoves.ts:307`); wire mode `brace` + `ROPE_SUB` 4. A partner
  BELOW is offered it only when `up > ropeMin - 0.4` (`teamController.ts:684-690`), claims the foot (`:709-721`); the
  host's rule needs the climber 1.8-6.4 m under the holder (`teamMoves.ts:67-76`). The climber starts at its own floor
  (`teamController.ts:918-944`), climbs on its stick (`ropeClimb` `teamMoves.ts:321`, down at `ropeDown` 1.6 m/s but
  never below the start floor), tops out over the lip (`ropeTop`, `ropeTopPath` `:364`) or slides down when either lets
  go (`ropeSlide`). Remote climbers pose from MoveState `boost` + sub 4 as `climb` (`src/player/moveState.ts:446-455`);
  the remote top-out is inferred from height (`ropeSeenStep` `teamMoves.ts:542`, `src/net/remoteAvatar.ts:286-308`).
  No path goes from the top onto the rope: there is no descent (R34; scale sheet line 57 "a climb up only, no descent").
- **No shoulder stand.** The 3.2.0 human ladder (brace, Y hold, stacked) was removed with G52's brace (G180); its traces
  are dead: `TEAM.braceHold / mateRange / wallBehind` and `ladderFeet / ladderGrab / ladderClimb / ladderPitch`
  (`src/config/movement.ts:451-467`; only `tests/bunkerMap.test.ts:663` reads `ladderFeet`), the comment "No brace, no
  stack" (`teamController.ts:78`), and the MoveState mode `stacked` (sub 1 top / 2 bottom, `moveState.ts:46-50`,
  `:456-458`) which nothing writes but `src/net/partnerBlocker.ts:13`, `committedMoves.ts:47` and `validate.ts:242` (rider's
  hands free) still read. level-design 12.1 still quotes `ladderGrab` 4.1 (`docs/level-design.md:355-356`), 12.2 says
  G57 is not built (`:383`), open item 1 (`:763-764`); 12.3 starts at `:386`.
- **Poses.** `src/anim/clips/team.ts` poses both roles of boost, throw, hang and rope on one clock (`TeamPoseMove`
  `:29`, `teamPoseOfState` `:300`, `teamPoseOfWire` `:420`, `TEAM_LINK` `:375`); GameState feeds the local side
  (`teamPoseFrame` `gameState.ts:3598`), each `RemoteAvatar` the partner (`remoteAvatar.ts:813`). Tuner rows per move:
  `src/anim/moveTune.ts:26` (`TEAM_MOVES`); the studio's pairs `src/anim/studioPairs.ts`. The rope line
  `src/game/ropeLine.ts` (drawn on the holder's and climber's pages, `gameState.ts:3058-3060`).
- **Hands.** The local player's weapons are off in any active team move except the hang-down (`gameState.ts:1482`,
  `:2066`, `:2122`); the host's mirror `hostHandsFree` already frees `stacked` sub 1 (`validate.ts:242`).
- **Animation source.** `src/anim/animSource.ts` (on master): one global setting Hand-made / CMU / Mixamo, default
  `ANIM_SOURCE_DEFAULT = 'cmu'` (today's game). On master a co-op partner is drawn with the viewer's source; PR #498
  (feature/mixamo-source-wire, open) sends each player's source on the wire (`PlayerState.an`) and hands it to that
  player's graph (`AnimGraph.animSource`, `sourceTablesFor`), so every screen draws the owner's choice (G400, ~00:55).
- **Marlow's kit stations.** `kitMoveOn` (`src/game/course/courseState.ts:151`, read at `:783`; #574 `:152`, `:785`)
  answers false for every station kit id (`StationDef.kit`: `deadweight | dropCatch | chimneyPair | swingPass |
  plankBridge`, `src/game/course/stationDef.ts:12`), so each station's stand-in gate opens (`openStandIn`, #574
  `:794-805`). Marlow Build rewires `kitMoveOn` to read our `kitMoves` list and wires each station from the kit id and
  the done API part 2 gives it (Marlow 2026-10-26 ~18:20, binding; BRIEF A18): no Player slice edits `courseState.ts` or
  a re-plan set file. The stations (#574 `docs/marlow-replan/STATIONS.md`): 5 `a2-plank` (plankBridge), 9
  `a4-deadweight`, 11 `a5-chimney` (chimneyPair), 12 `a5-swing` (swingPass), 16 `a6-dropcatch` (dropCatch). `descent`
  and `stand` have no station.

## 2. Design

### R34 rope descent (slices A1, A2, A3)
- Offer unchanged: the holder stands at the edge facing the drop and presses Co-op (`ropeOffer`).
- Take it from the top: a partner standing beside the holder (floor within 0.4 m, within `TEAM.ropeReach` 2.0 m, the
  `descent` id on in `kitMoves`) sees "Co-op: rappel down the rope (two-person rope)" and presses Co-op; it claims the
  same rope point the climb uses (`hangPoint` in front of the holder) and sends `tmove` `rope` as today.
- Host: `checkTeamRequest` `rope` accepts either the foot (today) or the top (`|a.y - b.y| <= 0.4`, `hangPointOk`,
  `ropeReach`), the top only when the host's `kitMoves` has `descent`. Same `tstart` `rope`, same pair, same ends.
- Climber: from the top `begin` starts `ropeOver` (over the edge: the top-out path run backwards, from beside the holder
  down to `ropeTopY` on the rope, `TEAM.ropeOver` ~1.3 s, starting value), then `ropeClimb` with the floor found by a ray
  under the rope point. The stick moves it up or down (`ropeClimb`); up to the top tops out as today; down to the floor
  with the stick held down steps off (end `drop`: the holder is freed by the existing `tend`); either letting go slides
  to the floor as today. The climber's MoveState `s` is 1 while it came from the top (`wireS`), so remotes pose the
  over-the-edge phase (A2) with no wire shape change.
- Holder steering (A3, G180 "holder steers sideways"; parked until after Michael's playthrough, BRIEF A7): the
  holder's stick moves the rope point along the edge (`TEAM.ropeSteer` +-1.0 m, 0.5 m/s, starting values) inside a
  free strip found once at the offer; the holder's MoveState `s` carries the offset and the climber follows it. Its own
  id `ropeSteer` in `kitMoves`.

### R32 shoulder stand (slices B1, B2)
- Offer: a standing player facing a wall within `TEAM.standWall` (~0.9 m, a ray at chest height) with the partner within
  12 m and the `stand` id on sees "Co-op: offer a shoulder stand (crouch: leg-up)" and presses Co-op: `standOffer`
  (wire `brace` + `STAND_SUB` 32; bits 8 / 16 are Campaign's pull-up and shutter on #578). Where the wall test
  fails the throw offer stays as today; crouched stays the leg-up.
- Take: the partner within `TEAM.partnerReach` behind the base presses Co-op -> `tmove` `stand` (new kind) -> host rule
  (base offering the stand, both on the ground, same floor +-0.4 m, in reach, rate) -> `tstart` `stand`; the host keeps
  the pair (`teamPairs`) until `hangEnd` or `end`.
- Rider: `standUp` (onto the thigh, then the shoulders, `TEAM.ladderClimb` reworked to a real-world time, >= 1.0 s,
  B2's research) -> `standTop` (feet at the base's feet + `TEAM.ladderFeet` 1.45 m x height / 1.75, kinematic on the
  base's avatar; the camera's pivot rises with it; the pistol aims inside `TEAM.ladderPitch` 60 deg, A4). From the top,
  Co-op with a lip in reach (the jump-target search from the rider's hands, grip between `TEAM.standMin` ~3.4 m and
  `TEAM.boostMax` 4.5 m over the base's floor: one band, A2) -> `standPress` (the base presses the rider's soles up, the
  rider takes the lip) -> attached to the ledge as the leg-up ends (`attachTo`), then the normal climb; end `pull`.
  No lip: "No ledge in reach from here". B from either -> `standDown` (the rider steps down behind the base), end
  `drop`. A base hit, downed or gone ends it the same way (the rider steps or drops down, no harm).
- Base: `standBase`, held still (`hold()` standing variant), hands busy; wire `stacked` sub 2; rider `stacked` sub 1.
- Constants: `ladderGrab` deleted (A2); `braceHold`, `mateRange`, `wallBehind` deleted (dead); new `standWall`,
  `standMin`, `standDown`, `standPress` with the leg-up's comment style; all starting values (G10).

### Both moves
- Prompts name the move (G151); polite refusals like the throw's. Hot paths allocate nothing (preallocated vectors as
  `teamController.ts:96-114`). Guards see the rider where the body is (no AI change). Single player is unchanged (no
  mates, `teamController.ts:118-119`).
- Flag (A8): `kitMoves` in `src/core/flags.ts`, a `ReadonlySet<string>` of move ids read by `readKitMoves(v, preview)`
  from `?kitmoves=` (comma list; `all` = every built id; `0` / `none` = empty) with `PREVIEW_ON` passed as
  `readCampusV2` does. `KIT_BUILT` (exported list) names the ids that exist; `KIT_MOVES_ON` (exported, empty) is the
  live default that switch-on adds to. Absent or unreadable: `KIT_BUILT` on `/preview/` (~13:55 "All on in preview"),
  `KIT_MOVES_ON` live. Ids outside `KIT_BUILT` are dropped from any list, so an unbuilt move is never on (Marlow's
  `kitMoveOn` never locks a stand-in for a move that does not exist). `?coopkit=1` / `0` stays as an alias that adds /
  removes `pull` and `shutter`. Each slice adds its id to `KIT_BUILT` in the PR that makes the move playable (A1:
  `descent`, `pull`, `shutter`; B1: `stand`; K1-K4, K5b: theirs). The host's rule and each page's offers and prompts
  read it; `has()` allocates nothing. Tests set it in `beforeAll` and restore it. It is the one kit flag: A1 folds
  Campaign's `coopKit` into it (BRIEF A8).
- Animation (A9, every animation slice: A2, B2, K1-K5b; Opus). **Hand-made plus Mixamo per role** (G399, G406,
  bible 5.12, ROADMAP Decided ~22:42 2026-10-25 "Mixamo is the top priority", ~00:20 2026-10-26 downloads
  pre-approved, ~00:25 the toggle, ~00:55 each player drawn with the owner's source; BRIEF A9, A14):
  1. Find the Mixamo clip per role from `docs/coop-kit/CLIP-LIST.md`: the files already in
     `C:/NightShift/scratch/mixamo/clips/` first, then the clips the orchestrator downloads from that list (~00:20).
     No CMU take is hunted per kit role.
  2. Convert and retarget with the mixamo-retarget pipeline on master: `node scripts/mocap/mixamo.mjs` (headless Blender
     dump, inside `heavy.lock`), a recipe row per new slug in `scripts/mocap/data/mixamo-clips.json` (emit kind `timed` /
     `loop` / `gait`, or a channel kind `chanLoop` / `chanPath` where the legs or hands must follow the capture, as
     `docs/mixamo-retarget/PLAN.md` "Clip map"), `scripts/mocap/mixamoEmit.mjs` -> `src/anim/clips/mixamo/<slug>.ts`
     (new files only; the existing clips must regenerate byte-identical), the generated `CLIPS.md` and
     `src/anim/mocapSources.ts` blocks, a credit row in `docs/art-credits.md`.
  3. Every role gets a hand-made pose. The Animation source (`src/anim/animSource.ts`, on master; default `cmu` =
     today's game) picks what plays: Hand-made and CMU play the hand-made pose (no CMU kit rows: a CMU row would become
     the default look); Mixamo plays the role's Mixamo clip where one exists (`addMixamoResolver` and a `MIXAMO_ON` row
     per clip in `src/anim/mixamo.ts`), else the hand-made pose. The source is the actor's own, never the viewer's or a
     per-role constant: the local side reads the page's setting, a remote side its owner's (`PlayerState.an` ->
     `AnimGraph.animSource` from PR #498, which must be on master before A2 / B2 are cut). A Mixamo row is on unless the
     capture is visibly broken.
  4. A capture's root path and contact points are placed on the move's path and the partner's link by the slice; the
     capture supplies the body. Each slice report lists every role as "hand-made + Mixamo <slug>" or "hand-made + Mixamo
     none (titles searched)".
  A slice never waits on a download: it uses what is in the folder when it starts and notes the missing clips as gaps;
  a later download adds its row in the move's next animation PR. Real-world technique guides the hand-made poses and
  the placement of the captures, with sources in the slice report: descent = the holder's braced body belay
  (hips low, rope round the back, brake hand at the hip) and the descender going over on the knees then the belly, feet
  on the wall, hand under hand down with the body leaning out; stand = the base facing the wall, feet apart, knees
  bent, back straight, hands then round the rider's shins as it rises with the legs; the rider steps thigh ->
  shoulders, knees soft, hands on the wall for balance, the press with the soles in the base's palms. Both roles on both
  pages through `TEAM_LINK` / `teamPoseOfWire`; paired contact within 3 cm on host and client (bible 5.12.2 #11);
  `scripts/anim-audit.mjs` passes (bible 5.12.2 minimums); tuner rows so Michael can tune (G243, G399 "i will fine tune
  them in anim dev"); no tuning or polish passes of our own before his playthrough (~16:20); a
  1-2 min look video per animation PR, path in the PR body (the R31 recorder from J19 when it is on master; else a
  Playwright-core `recordVideo` run on the laptop GPU queue).

## Claims
```claims
files:
  - src/game/teamMoves.ts
  - src/game/teamController.ts
  - src/game/localMoveState.ts
  - src/game/gameState.ts
  - src/game/ropeLine.ts
  - src/game/kit/{deadweight,dropCatch,chimneyPair,swingPass,plankBridge}.ts
  - src/game/kit/kitApi.ts  # K0 (new): kit spots, pair rules, the done call
  - src/game/modes/gameMode.ts  # K0: the optional `onKitDone` hook only (implemented by Marlow's courseMode)
  - src/net/kitNet.ts  # SHARED with Campaign (#581): K0 makes the pair rule generic
  - src/anim/tuneMoveRows.ts  # K0: kit sub bits -> tuner rows
  - src/player/splitJump.ts  # K3: a chimney spot takes its shaft out of the split-gap search
  - src/world/world.ts  # SHARED (#578 shutters, mission family): K5a builds the plank boards beside the shutters
  - src/config/movement.ts
  - src/core/flags.ts
  - src/net/protocol.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - src/net/remoteAvatar.ts
  - src/player/moveState.ts
  - src/anim/clips/team.ts
  - src/anim/clips/kit/*.ts
  - src/anim/moveTune.ts
  - src/anim/studioPairs.ts
  - src/anim/clips/mixamo/*.ts  # SHARED (Marlow feature/mixamo-kit, mixamo-retarget): new slugs only
  - src/anim/mocapSources.ts  # SHARED: append-only generated rows
  - src/anim/mixamo.ts  # SHARED: append-only MIXAMO_ON rows and addMixamoResolver registrations
  - scripts/mocap/data/mixamo-clips.json  # SHARED: append-only recipe rows
  - src/game/studioStage.ts  # B2 only (the Mixamo I-slices are on master)
  - src/player/playerController.ts  # K2 (landing bands)
  - src/world/maps/bunkerShaft.ts
  - src/world/plankBridge.ts
  - tests/teamMoves.test.ts
  - tests/ropeDescent.test.ts
  - tests/shoulderStand.test.ts
  - tests/teamPose.test.ts
  - tests/teamClimb.test.ts
  - tests/net.test.ts
  - tests/kit/{kitApi,deadweight,dropCatch,chimneyPair,swingPass,plankBridge}.test.ts
  - tests/previewFlags.test.ts  # A1 (kitMoves preview read; coopKit line from #578)
  - scripts/e2e-netmove.mjs
  - docs/design/scale-sheet.md
  - docs/level-design.md
  - docs/systems/coop.md
  - docs/mixamo-retarget/CLIPS.md  # SHARED: append-only generated rows
  - docs/art-credits.md  # credit rows
  - docs/coop-kit/**
maps: none
protocol: tmove, tstart (kind `stand`; part 2: the five kit kinds through Campaign's TEAM_KINDS, a kit request's spot index in `target` and phase in `s`, a claimed point for any kit kind)
save: none
```

Shared with other open work (the orchestrator orders; recommendation below):
Every plan `node scripts/claims-check.mjs` reports as an overlap (plan check 2, 57 overlaps; with part 2's claims
2026-10-26 ~18:45, 58 overlaps, the same nine plans), plus #498 (no claims block), with the files and the order note.
Part 2's new claims overlap only plans already listed: `src/game/kit/**`, `kitNet.ts`, `gameMode.ts`,
`tuneMoveRows.ts`, `world.ts` with docs/missions/PLAN.md (#578 / #581 / #583, look-video-tallow); `world.ts` also with
map-ready; `playerController.ts` (K2) with player-hygiene.
- **PR #578** (feature/mission-b-sector, Campaign Build; docs/missions/PLAN.md: mission-engine, mission-d-wharf,
  look-video-tallow): `teamMoves.ts` (+107), `teamController.ts` (+210), `src/anim/clips/team.ts` (+107), `protocol.ts`
  (+55), `flags.ts` (+13, `coopKit`), `moveState.ts`, `gameState.ts`, `src/game/kit/{registry,pullUp,shutter}.ts`,
  `tests/kit/*`, `tests/shutterWiring.test.ts`, `tests/previewFlags.test.ts`; wire `tmove` / `tstart` (kinds `pull`,
  `shutter`). Sub bits: theirs 8 / 16, ours 32 (stand) and 64-1024 (part 2). Order: lands first; A1 is cut after it
  and does the fold; part 2 starts after it.
- **PR #498** (feature/mixamo-source-wire, Player Build, no claims block): `src/net/protocol.ts` (`PlayerState.an`),
  `src/net/remoteAvatar.ts`, `coopHost.ts`, `coopClient.ts`, `src/anim/animGraph.ts` (`animSource`),
  `src/anim/animSource.ts`, `src/anim/mixamo.ts`, `src/anim/mocap.ts`. Order: on master before A2 and B2 are cut (they
  sit on its per-owner source); A1 and B1 do not wait for it.
- **PRs #581, #583** (Campaign Build, mission-engine follow-ups built on #578; #583 mission-d-wharf adds
  `tests/missionFlags.test.ts`, which sets and reads `flags.coopKit`): order: either before or after A1; A1 keeps the
  writable `flags.coopKit` gate (only its load value reads `kitMoves`), so neither breaks the other; Campaign folds its
  readers and drops the field in its own later PR. #581 adds `src/net/kitNet.ts` and the host's kit branch
  (`coopHost.ts:1197-1262` on 752e106be): K0 edits both (the generic pair rule, the spot, the done call), so K0 is cut
  after #581 is on master. K0 does not edit Campaign's `src/game/kit/registry.ts`, `pullUp.ts` or `shutter.ts` (its
  spots, pair rules and done call live in our new `kitApi.ts`).
- **player-hygiene** (docs/player-hygiene/PLAN.md, -s4; S5 not built): `playerController.ts` (K2), `moveState.ts`,
  `teamController.ts` (S5), `remoteAvatar.ts`, `coopHost.ts`, `coopClient.ts`, `protocol.ts`, `src/anim/mocap.ts`.
  Order: whichever lands second rebases; the orchestrator orders S5 against A1 / B1 (all edit `teamController.ts`).
- **player-batch-j19** (docs/player-batch-j19/PLAN.md; open #532, #561, #562, #563): `gameState.ts`, `protocol.ts`,
  `coopHost.ts`, `coopClient.ts`, `remoteAvatar.ts`, `moveState.ts`, `localMoveState.ts`, `flags.ts`, `movement.ts`,
  `src/anim/mocap.ts`, `src/anim/clips/mixamo/*`; wire. Order: its open PRs land first; B1 (the widest net slice) is
  cut after them.
- **map-ready** (docs/map-ready/PLAN.md; open #550, #551, #556): `flags.ts`, `gameState.ts`, `protocol.ts`,
  `coopHost.ts`, `coopClient.ts`; wire. Order: its open PRs land first; ours rebase.
- **marlow-replan** (docs/marlow-replan/PLAN.md; #574 marlow-replan-base, -d1, -g0, Marlow Build): `flags.ts`,
  `protocol.ts`, `coopHost.ts`; wire. `courseState.ts` (`kitMoveOn`) and every re-plan set file stay Marlow's: Marlow
  rewires `kitMoveOn` to `flags.kitMoves` and wires each station from the id and done API each K slice sends it (Marlow
  2026-10-26 ~18:20). Order: #574 first; then each K slice's station wiring is Marlow's PR after that K slice lands.
- **feature/marlow-play** (Marlow Build, stacked on #574; the play-blocker fixes): `replan/a2CarriageShed.ts`,
  `a4GoodsShed.ts`, `a6PumpHouse.ts`, `courseState.ts`, its tests. No file overlap with this job (we edit none of them);
  listed so the orchestrator orders Marlow's station wiring after both marlow-play and the K slice it uses.
- **K slices among themselves:** each K1-K5b adds one id line to `KIT_BUILT` in `flags.ts` and may add one line to
  K0's kit table in `docs/systems/coop.md`: whichever lands second rebases (one-line conflicts). K5a edits `world.ts`
  (shared with #578's shutter lines and the mission family): a few lines beside `shutters`; whichever lands second
  rebases.
- **mission-rules family** (docs/mission-rules/PLAN.md: r1-r8, tallow-*, mixamo-kit, mission-engine; ~30 branches):
  `gameState.ts`, `coopHost.ts`, `coopClient.ts`, `docs/systems/coop.md`; wire. Order: the orchestrator's train order;
  whichever lands second rebases (our `coop.md` edits are the rope and stand paragraphs only).
- **light-realism** (docs/light-realism/PLAN.md, l0-l2): `docs/level-design.md`, `docs/design/scale-sheet.md`. Order:
  either; ours touch only scale sheet line 57 (A1) and level-design 12.1 / 12.2 / 12.3 / open item 1 (B1).
- **guard-ai-mission-hooks** (docs/guard-ai-mission-hooks/PLAN.md, s1a1-s4): `flags.ts`. Order: either (own lines);
  its "guards notice it" hook gates the `deadweight` and `plankBridge` live switch-on (Flags).
- **route-runs** (origin/feature/route-runs-2, R8; open #564, #566): `docs/level-design.md` sections 14-15; B1 edits only
  12.1, 12.2, 12.3 and open item 1 (the file, not the lines).
- The pull-up and shutter poses Player owes Marlow (resume-ct-core): `src/anim/clips/team.ts` (`KIT_POSE_IDS`,
  placeholders, on #578), `src/anim/moveTune.ts`, `src/anim/studioPairs.ts`. Not taken by this job.
- The Mixamo in-game slices (I2, I2b, I3, I4) are on master (trains 117-119); `studioStage.ts` and the `mixamo` flag
  no longer conflict.
- **Mixamo pipeline files, SHARED.** `scripts/mocap/data/mixamo-clips.json`, `src/anim/clips/mixamo/*`,
  `src/anim/mocapSources.ts`, `src/anim/mixamo.ts` and `docs/mixamo-retarget/CLIPS.md` are shared with Marlow Build's
  feature/mixamo-kit (the Mixamo wiring of the existing kit moves only: crawlUnder, shutter, team pull) and the
  mixamo-retarget branches (-i5, -on, #498). This job's own moves and their Mixamo clips stay Player Build's, through
  the Player-owned pipeline. Our edits there are append-only rows (new recipes, new clip files, new `MIXAMO_ON` /
  resolver rows, new generated rows), cut from a master that has those branches or rebased onto them before the PR.
- Changelog fragments `changes/feature-coop-kit-<slice>.md` are per-slice shared files (not claimed).
- **Order (agreed with the orchestrator ~18:25 2026-10-25, `docs/orchestrator/resume-ct-core.md` on
  origin/feature/menu; changed with Campaign Build 2026-10-26 ~09:50, Campaign's `docs/missions/STATE.md` item 7):**
  PR #578 lands first on its own `coopKit` flag. A1 is then cut and folds `coopKit` into `kitMoves` as ids `pull` and
  `shutter` (`?coopkit=1` stays an alias). B1 adds `stand` to `BuiltinTeamKind` / `TEAM_KINDS`. A2 and B2 wait for
  #498. Part 2 (detailed below) starts with K0 once #578, #581 and A1 are on master; it runs beside A2 / B1 / B2
  (K0 and B1 both add kinds and sub bits in `teamMoves.ts`: no number clash, whichever lands second rebases).
  Mission-engine `docs/missions/PLAN.md` row 106 (human ladder = relay): the orchestrator fixes it (BRIEF A1).

## Slices: part 1

Branches `feature/coop-kit-<slice>` in their own worktrees; each slice is one PR to master (three-dot diff, so a slice
cut from an earlier slice's head shows only its own lines once that one has released). Prototype mode (ROADMAP
~16:05 item 4, ~16:20; RULES "Test tiers"): each PR runs ONE test set, its `affected-e2e`. Where the PR touches
`src/net` or a wire path (a file `protocol.ts` imports: `teamMoves.ts` once #578 is on master, `moveState.ts`,
`courseState.ts`) that set is exactly the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse`, which also covers
the `src/game` / `src/player` checker gate; else it is `e2e-netmove`. No extra suites, no repeat proof runs: a red
test gets one fix round and one rerun, then it is quarantined or noted and the work ships. Two fresh Opus checkers
only where the PR edits `src/net` or changes what goes on the wire (A2, B1, B2, K0); one Opus checker otherwise.
Bars: bible 5.12.2 (paired contact within 3 cm on host and client, `anim-audit` minimums) and the 1-2 min look video;
no finer bars.

**A1 Rope descent, mechanics (Opus).** The design above: `checkTeamRequest` top case and `kitMoves` gate; the
beside-the-holder offer and prompt (`teamController.ts:684-721`); `begin` from the top (`:918-944`): `ropeOver`, the
floor ray, `ropeClimb` down to the floor and the step-off end; `ropeOver` in `ROPE_CLIMBER`, `mode`, `wireSub`, `wireS`
= 1 from the top (`:1142-1180`); placeholder pose `climbUp` with `traverseT` 1 -> 0. The flag `kitMoves` (Design
"Both moves": `readKitMoves`, `KIT_BUILT` = `descent`, `pull`, `shutter`, `KIT_MOVES_ON` empty, the preview default).
**The coopKit fold** (BRIEF A8; #578 is on master by then; plan check 3): `flags.coopKit` STAYS a plain writable
boolean and stays the gate its readers use (`teamController.ts` `flags.coopKit ? this.kitIdle(...)`, #578 line 806,
unchanged), because Campaign's open PRs set and read it (#583 `tests/missionFlags.test.ts` assigns `flags.coopKit` and
expects the kit offer to follow; #581 builds on #578). A1 only changes its load value: `flags.coopKit` = `?coopkit=1`,
else `?coopkit=0` off, else true when `kitMoves` holds `pull` or `shutter` (so /preview/ turns them on through
`KIT_BUILT`). No reader, test or Tallow look-video param of Campaign's changes; #581 / #583 land in either order.
Campaign folds its readers onto `kitMoves` ids and removes the field in its own later PR (a note in A1's PR body and a
message to Campaign Build). Docs: scale sheet line 57 "climb up or rappel down" (reviewer Marlow Build, G293), the
rope paragraph of `docs/systems/coop.md`.
- Files: `src/game/teamMoves.ts`, `src/game/teamController.ts`, `src/core/flags.ts`, `tests/teamMoves.test.ts`,
  `tests/ropeDescent.test.ts` (new), `tests/previewFlags.test.ts` (the `kitMoves` read and the `coopKit` load value;
  Campaign's tests/kit, shutterWiring, lookVideo and Tallow params stay unedited),
  `scripts/e2e-netmove.mjs` (a descent step: the client rappels from beside the host, the host sees `boost` + sub 4
  with `s` 1, the client steps off at the floor, the host is freed; then `?kitmoves=0`: no offer),
  `docs/design/scale-sheet.md`, `docs/systems/coop.md`, `changes/feature-coop-kit-a1.md`. Est. 700 (650 descent + ~50 flag).
- Checks: `npx vitest run tests/teamMoves.test.ts tests/ropeDescent.test.ts tests/hangDownNet.test.ts
  tests/previewFlags.test.ts tests/kit tests/shutterWiring.test.ts`; typecheck; one test set: `affected-e2e` (the
  co-op group: `teamMoves.ts` is a wire path once #578 is on master; ctcourse proves A6's rescue line unchanged). One
  Opus checker (no `src/net` edit, no wire shape change).
- Done looks like: with `?kitmoves=descent` on both pages the partner beside the holder rappels down and steps off;
  with `?kitmoves=0` nothing changes (the climb from the foot, e2e-ctcourse A6's rescue line, unchanged); a unit test
  of both flag paths: `readKitMoves(null, true)` = `KIT_BUILT`, `readKitMoves(null, false)` = empty, `0` / `none` =
  empty, an unbuilt id dropped; `?coopkit=1` still turns on pull and shutter; `flags.coopKit` is still a writable field (load value true with `pull` or `shutter` in `kitMoves`) and Campaign's tests (tests/kit, `tests/shutterWiring.test.ts`, and `tests/missionFlags.test.ts` once #583 is on master) pass unedited on the A1 head.
- Flag: `kitMoves` id `descent`. Depends on: PR #578 on master (the fold).

**A2 Rope descent, animation and the remote view (Opus).** Hand-made plus Mixamo per role, research for the hand-made
(Design "Animation" steps 1-4; `docs/coop-kit/CLIP-LIST.md` rows R1-R4). Mixamo to try: the descender's over-the-edge
from `braced_hang_to_crouch` played backwards (on master) or a downloaded drop-to-hang / climb-down clip, the descent
from a rope or ladder climb played backwards (`trav_climbing_ladder` on master as the fallback), the holder's belay
from a rope-pull / tug clip; every role also hand-made. Each actor's clip follows its owner's source (#498's
`AnimGraph.animSource` for the remote side, the page's setting for the local side). Poses: the descender's `ropeOver`
(kneel at the edge facing in, legs over, belly over, hands on the lip, onto the rope) and the descent on the rope (feet
on the wall, hand under hand, leaning out), the holder's `ropeB` load and pay-out for a descent. Remote: `boost` + sub 4
with `s` 1 above the rope's top poses `ropeOver` (a `ropeSeenStep`-style eased step, kept in `team.ts`, not
`teamMoves.ts`, so A2 and B1 share no file). The rope line during `ropeOver`. Tuner rows (descent in the `rope`
section). A studio pair loop for the look video.
- Files: `src/anim/clips/team.ts`, `src/net/remoteAvatar.ts`, `src/game/ropeLine.ts`, `src/anim/moveTune.ts`,
  `src/anim/studioPairs.ts`, `tests/teamPose.test.ts`, `tests/teamClimb.test.ts`, `changes/feature-coop-kit-a2.md`;
  mocap step: `scripts/mocap/data/mixamo-clips.json` (rows), `src/anim/clips/mixamo/<slug>.ts` (new),
  `src/anim/mocapSources.ts`, `docs/mixamo-retarget/CLIPS.md`, `docs/art-credits.md`. Est. 700 hand-written (generated
  clip files counted apart).
- Checks: vitest on those files plus `tests/mixamoEmit.test.ts`; `node scripts/anim-audit.mjs` on the descent states;
  one test set: `affected-e2e` (the co-op group: `remoteAvatar.ts` is `src/net`); look video. Two Opus checkers.
- Done looks like: each role plays hand-made under Hand-made and CMU and its Mixamo clip under Mixamo where one exists
  (the report lists each role as "hand-made + Mixamo <slug>" or "none, titles searched"); host on Mixamo, client on
  Hand-made: each screen draws each player with the owner's source and both screens match; the pair within 3 cm at
  contact on both pages (bible 5.12.2); `anim-audit` passes; the video shows both roles from both pages.
- Flag: `descent` (no new id). Depends on: A1 (cut from A1's head) and PR #498 on master (or A2 rebased onto it).

**B1 Shoulder stand, rules, wire and play (Opus).** Pointers are master 65411ea65; the B1 brief re-takes them from the
master B1 is cut from (after #578 and A1). The design above: `STAND_SUB`, `stand` kind and host rule (`teamMoves.ts`);
B1 adds `stand` to `BuiltinTeamKind` / `TEAM_KINDS` (#578 `teamMoves.ts:13`, `:24`; `protocol.ts` reads `TEAM_KINDS`
there) and `stand` to `KIT_BUILT`; `checkTeamRequest` refuses a `boost` or `throw` (any non-`stand` kind) against a
`brace` mate whose sub has `STAND_SUB` with `notBraced`, beside #578's `KIT_SUB_MASK` line (`teamMoves.ts:124` on
#578), with a test per refused kind; the offer, the rider's and base's states, the lip search in the one band, the
press and the attach, the ends (`teamController.ts`, comment `:78`), `mode` returning `stacked` with sub 1 / 2
(`localMoveState.ts:35-42`), the pistol from the top (`gameState.ts:1482`, `:2066`, `:2122`; camera pivot), the wire
(`protocol.ts:305`, `:308`, parse `:885`, `:900`; `coopHost.ts:1156-1159` pairs `stand`; `coopClient.ts:327-328`),
`TEAM` constants (A2; delete the dead ones; `bunkerShaft.ts:80` comment). Docs (reviewer Marlow Build, G57 engine
fact): level-design 12.1 `:355-356` (the stand reaches the same `TEAM.boostMax` 4.5 m), 12.2 `:383` line removed, open
item 1 `:763-764` closed, 12.3 (`:386`) lists the map decisions that relied on 4.1 (Tallow Wharf's sign-off has no
ladder spot because "The ladder reaches only 4.1 m"; bunker W2 4.25, `bunkerShaft.ts:80`); `docs/systems/coop.md`.
- Files: `src/game/teamMoves.ts`, `src/game/teamController.ts`, `src/game/localMoveState.ts`, `src/game/gameState.ts`,
  `src/config/movement.ts`, `src/core/flags.ts` (`stand` in `KIT_BUILT`), `src/net/protocol.ts`, `src/net/coopHost.ts`,
  `src/net/coopClient.ts`, `src/world/maps/bunkerShaft.ts` (comment), `tests/teamMoves.test.ts`,
  `tests/shoulderStand.test.ts` (new), `tests/net.test.ts`, `scripts/e2e-netmove.mjs` (stand at the Proving Grounds
  4.2 m lip: offer, take, top, aim, onto the lip; stand and step down; the host's copy of the rider within 10 cm;
  `?kitmoves=0`: no offer), `docs/level-design.md`, `docs/systems/coop.md`, `changes/feature-coop-kit-b1.md`. Est.
  1,320 (incl. the `TEAM_KINDS` / `KIT_BUILT` lines; if over 1.5k: the e2e step and docs go to B1b).
- Checks: vitest on the three test files plus the TEAM-key readers the grep of `scripts/` and `tests/` finds
  (`tests/bunkerMap.test.ts`, `tests/animStudio2.test.ts`, `tests/ctcourse/*.test.ts`); typecheck; one test set:
  `affected-e2e` (the co-op group: `src/net` and wire). Two Opus checkers.
- Done looks like: with `?kitmoves=stand` the base offers at a wall, the rider stands up, aims, takes a 4.2-4.5 m lip;
  B steps down; a lip at 4.6 m is refused; a leg-up or throw asked of a stand offer is refused; `?kitmoves=0` changes
  nothing; `PROTOCOL_VERSION` untouched (the train bumps).
- Flag: `stand`. Depends on: A1 (shared `teamMoves.ts`, `teamController.ts`, `flags.ts`; cut from A1's head). Runs in
  parallel with A2 (no shared file).

**B2 Shoulder stand, animation (Opus).** Hand-made plus Mixamo per role, research for the hand-made (Design "Animation"
steps 1-4; `docs/coop-kit/CLIP-LIST.md` rows S1-S5), each actor on its owner's source (#498). Mixamo to try: the
base's crouch and rise from `crouch_to_stand` / `stand_to_crouch` and the press from `lifting_heavy_object` (on
master); the rider's step up from a downloaded wall-climb / step-up clip or `trav_climbing_ladder`, the balance and aim on top from `standing_idle` with the hands freed, the lip
take from `pulling_up_to_a_ledge`, the step-down from a downloaded jump-down clip; a downloaded two-person boost clip
for both roles if one exists; every role also hand-made. `stand` in `TeamPoseMove`; base poses (offer at the wall,
take the step, rise with the legs, hold the shins, the press, the step-down) and rider poses (step thigh -> shoulders,
balance on top, aim stance on the shoulders, the press and the lip take, the step-down); `stacked` sub 1 / 2 in
`poseFromMoveState` (`moveState.ts:456-458`) and `teamPoseOfWire`; remote rider placed on the base's shoulders from
the link; tuner rows (`stand` in `TEAM_MOVES`); a studio pair (a wall station in `studioStage.ts` if the pair stage
has none).
- Files: `src/anim/clips/team.ts`, `src/player/moveState.ts`, `src/net/remoteAvatar.ts`, `src/anim/moveTune.ts`,
  `src/anim/studioPairs.ts`, `src/game/studioStage.ts`, `tests/teamPose.test.ts`, `changes/feature-coop-kit-b2.md`;
  mocap step as A2. Est. 900 hand-written.
- Checks: as A2 (one test set: the co-op group; two Opus checkers); character against character 3 cm or less (the
  rider's soles on the shoulders and palms, bible 5.12.2).
- Done looks like: as A2 (including host on Mixamo, client on Hand-made: each screen draws each player with the
  owner's source and both screens match), plus the rider's feet stay on the base's shoulders within the 3 cm contact
  bar while the rider aims and turns.
- Flag: `stand`. Depends on: A2 and B1 (shared `team.ts`, `remoteAvatar.ts`; cut after both pass) and PR #498 on
  master. The Mixamo I-slices (I2, I2b, I3, I4) that also edit `studioStage.ts` are on master (trains 117-119).

**A3 Holder steers the rope (Opus, S). PARKED until after Michael's playthrough (BRIEF A7);** built then only if the
playthrough or a map asks for it. The design above. The holder's side step hand-made, plus Mixamo (CLIP-LIST row R5)
if a clip exists. Files: `src/game/teamMoves.ts`, `src/game/teamController.ts`, `src/anim/clips/team.ts` (the
holder's side step), `src/core/flags.ts` (`ropeSteer` into `KIT_BUILT`), `tests/ropeDescent.test.ts`,
`scripts/e2e-netmove.mjs`, `changes/feature-coop-kit-a3.md`; mocap step as A2 if a clip is used. Est. 450. Checks:
vitest; one test set: `affected-e2e` (the co-op group: `teamMoves.ts` is a wire path); look video (short); one Opus
checker. Done looks like: with `?kitmoves=ropeSteer` (or on `/preview/`) the holder's stick walks the rope point up to
1 m along the edge with the partner on it, both screens show the holder side-stepping and the climber following, the
offset stops at a wall or the strip's end; `?kitmoves=0` changes nothing. Flag: `ropeSteer`. Depends on: Michael's
playthrough, then B1 and B2 (shared files).

Order: A1 -> (A2 || B1) -> B2; A3 parked. Briefs for A2 and B1 are written while A1 builds (full burn). The lead sends
`docs/coop-kit/CLIP-LIST.md` to the orchestrator as soon as this PLAN passes, so the orchestrator's downloads can be in
the folder before A2 starts (BRIEF A14).

## Part 2 (detailed): Deadweight, Drop Catch, Chimney Pair, Swing Pass, Plank Bridge

Written 2026-10-26 ~18:30 for Michael's ~18:05 pick (M1, SIGNOFF rows on origin/feature/mission-framework). Pointers:
PR #578 head a8bac697b (kit registry, wire kinds), PR #581 head 752e106be (`src/net/kitNet.ts`, the host's kit
branch), PR #574 head 61fa85fc8 (Marlow's re-plan sets); master 65411ea65. Each slice brief re-takes them from the
master it is cut from. A fresh Opus plan checker passes this section before K0 starts (RULES "Intake" 4).

### How the five moves plug in (on #578 / #581)
- **Registry.** A move is one file `src/game/kit/<move>.ts` that calls `registerKitMove` at load (`registry.ts`;
  `teamController.ts:19` loads `./kit/*.ts` eagerly). Its pose ids (`KIT_POSE_IDS`, `team.ts:42`) are its controller
  states; role b (holder / offerer) rides wire mode `brace`, role a (partner) `boost`, each with the move's `KIT_SUB`
  bit; a state ending in `Offer` is the waiting offer (pose k -1). Hooks: `check` (host rule, called from
  `checkTeamRequest` `teamMoves.ts:89`), `idle`, `begin`, `step`, `ended`, `end`, `tick`, `wireS`, `setupDevices`
  (the per-level kit devices, `KitDevices`). Flags: `paired`, `claimsPoint`, `busyOffer`, `times`.
- **What is hard-wired to `pull` / `shutter` today** (K0 makes each generic, so K1-K5b touch only their own files):
  `KitKind` / `KIT_KINDS` / `isKitKind` / `KIT_SUB` / `KIT_SUB_MASK` (`teamMoves.ts:20-37`); `teamPoseOfWire`'s kit
  branches (`team.ts:498`, `:513-517`) and the TeamPoser placeholder chain (`:664`); `poseFromMoveState`'s boost kit
  bits (`moveState.ts:454`); `teamRowOfWire` (`tuneMoveRows.ts:231`); the claimed point in `parseMessage`
  (`protocol.ts:916`, `:940`); `newKitPair` / `kitEnd` (`kitNet.ts:37`, `:63-80`: the pull rule, else the shutter
  rule); the host's kit start sends `target` -1 and `s` 0 (`coopHost.ts:1201`, `:1215`); the kit offers run only
  behind `flags.coopKit` (`teamController.ts:806`).
- **Ids are already shared.** `StationDef.kit` (`stationDef.ts:12`) uses exactly the five `kitMoves` ids (`deadweight`,
  `dropCatch`, `chimneyPair`, `swingPass`, `plankBridge`), and K0 makes them the `KitKind` names too: one string per
  move from the flag to the wire to Marlow's station.

### The Marlow API (what each K slice sends Marlow Build)
Marlow Build wires the stations (Marlow 2026-10-26 ~18:20, binding; BRIEF A18): it rewires `kitMoveOn` to
`flags.kitMoves.has(kit)` and, per station, places the move and switches the stand-in off. Each K slice ends by sending
Marlow (a message to Marlow Build, the text in its PR body) three things:
1. **The id**: the `kitMoves` id = `StationDef.kit` value = `KitKind`. In `KIT_BUILT` from that slice on (on in
   `/preview/`, off live until Michael's walk).
2. **The spot**: `addKitSpot(b.anchors, spot)` (`src/game/kit/kitApi.ts`, K0), called in the set file at the station,
   as `addShutterSpec` is (`shutter.ts:135`). `KitSpot = { id, kind, x, y, z, yaw, w?, h?, x2?, y2?, z2?, door? }`;
   `id` is Marlow's (use the station id, e.g. `a4-deadweight`); the fields each move reads are in its Design below. A
   spot is inert while its id is off (no offer, no device change), so Marlow places it unconditionally.
3. **The done API**: `GameMode.onKitDone?(kind: KitKind, spot: string, a: string | undefined, b: string | undefined)`
   (`src/game/modes/gameMode.ts`, beside `onTeamMove` `:90`; K0). Called on the host only, once per completed move,
   with the spot id the move used (`''` for a free move away from any spot) and the two players (undefined = the host's
   own player, as `onTeamMove`). Marlow's `courseMode` implements it (e.g. sets the station's done flag when `spot` is
   its station id); the pass zones keep working as today. Who calls it: the host's kit pair end (K0, generic: the
   move's `doneBy` side sends the success end `pull`), or the move's own host tick for Deadweight and Plank Bridge,
   which have no pair at the moment of success (Design below). One helper, `kitDone(g, kind, spot, a, b)` in
   `kitApi.ts`, does the call (a no-op on a client page).
Marlow station lines (each K slice's done line): "Marlow station <n> `<id>` uses the real move when the id is on".

### Design per move
Shared by all five: offered only with a team-mate (single player: no mates, no offer, no state, the spot inert; the
shared rule `teamController.ts:118-119`); each move's `idle` and `check` start with its own id
(`flags.kitMoves.has(id)`, so the host refuses an id it has off); prompts name the move (G151) and refusals are polite
(the throw's); hot paths allocate nothing (preallocated run data as `ShutterRun`); numbers are starting values (G10)
and the bands in them are the A12 question's (BRIEF; until answered they are logged, A17). The placeholder pose is an
existing pose by id (K0's `KIT_POSE_PLACEHOLDER` rows); the real poses are the later KA animation slices.

**Deadweight (K1; Marlow station 9 `a4-deadweight`).** SIGNOFF: "One hangs on a chain so a counterweighted grate lifts
for the other." Real-world: a counterweighted lift gate, the operator's body weight on the chain (a jump-grab and a
dead hang, arms long, feet together) balances the counterweight.
- Spot: `kind 'deadweight'`, `door` = the grate's door id (a sliding course / map door, Marlow's `A4-grille`
  `a4GoodsShed.ts:154`), (`x`, `y`, `z`) the near chain's grip point, (`x2`, `y2`, `z2`) the far chain's (one chain
  each side: forced co-op both ways; whoever is through hangs for the other), `h` unused. Band: chain grip 2.2-2.6 m
  over its floor, each chain 1.0-3.0 m from the door plane (the hanger cannot reach through).
- Holder (role b, local entry, no request): standing within `DEADWEIGHT.reach` 0.8 m under a chain, Co-op ->
  "Co-op: hang on the chain (deadweight)" -> `chainGrab` (0.6 s: jump, grip) -> `chainHang` (held; the chain pays out
  `DEADWEIGHT.sag` 0.5 m so the body drops) -> B or Co-op -> `chainDrop` (0.5 s) -> free. Hit, downed or gone: drops.
  Wire `brace` + `DEADWEIGHT_SUB` 64, `s` = spot index + 1.
- The host's rule (the move's `tick` on the host page; `check` returns `notOffering`: no requests): a spot's door is
  open while any player's MoveState is `brace` + 64 with that spot's `s` and stands within 1 m of one of its chains,
  after `DEADWEIGHT.lift` 0.8 s (`world.doors.setOpen(d, true)`); with nobody hanging it shuts after
  `DEADWEIGHT.drop` 0.4 s, never on a body in the doorway (`Doors.close`'s occupied test: the shutter's no-crush rule).
  Clients follow the host's door state (snapshots, as course doors). So a client cannot open it without hanging.
- Partner (role a): at the open grate, Co-op -> "Co-op: duck under the grate (deadweight)" -> `grateUnder` (1.0 s,
  local, crouched kinematic path through the doorway, the shutter crawl's pattern) -> free on the far side. Wire
  `boost` + 64, `s` = spot index + 1.
- Done: the host sees a player leave `grateUnder` on the far side of the door plane while another hangs ->
  `kitDone('deadweight', spot.id, passer, hanger)`. Two passes (one each way) = two calls.
- Placeholders: `chainGrab` 'jump', `chainHang` 'hang' (the ledge hang), `chainDrop` 'drop', `grateUnder`
  'crouchWalk'. Mixamo later (CLIP-LIST K1): `trav_hanging_idle` (folder), downloads 9 and 10.
- Guards: the open door is a door left open; Guard AI's "guards notice it" hook owns the reaction (the `deadweight`
  live switch-on waits for it, Flags). The device exposes `open`, `opens`, `noticed` as `ShutterDevice` does.
- Marlow's wiring: with the id on, `A4-grille` belongs to the move (off both grille gates, `a4GoodsShed.ts:154-157`).
- Marlow station 9 `a4-deadweight` uses the real move when the id `deadweight` is on.

**Drop Catch (K2; Marlow station 16 `a6-dropcatch`).** SIGNOFF: "One drops from above a safe drop height into the
partner's arms. The landing is silent." Real-world: a spotter's catch (feet apart, knees bent, arms up; takes the
dropper round the thighs and hips and rides the load down with the legs); the dropper lowers from a hang first where
the edge allows.
- Free move (G151); an optional spot (`kind 'dropCatch'`, the drop point) only names it for `onKitDone`. Band: the
  dropper's feet 2.5 m (`LANDING.roll`, `src/player/movement.ts:168`) to 6.5 m over the catcher's floor (A6's deck
  4.4 -> pit -1.6 = 6.0 m), the catcher within 1.5 m of the point under the drop, a clear 1.0 x 1.0 m opening.
- Catcher (role b): standing, a mate above within the band and 3 m horizontally, Co-op -> "Co-op: get ready to catch
  (drop catch)" -> `catchOffer` (SIGNOFF clip catchReady; arms up, facing the drop point; weapons off). Wire `brace` +
  `DROPCATCH_SUB` 128, `s` 0 (the host reads the catcher's height from its own view).
- Dropper (role a): standing at an edge with a mate in `catchOffer` below in the band and a clear ray down,
  "Co-op: drop to your partner (drop catch)" -> Co-op -> `tmove dropCatch` claiming the drop point (`lx`, `gy`, `lz`)
  -> host rule (`check`): b offering with bit 128, a on the ground, `a.y - b.y` in the band, b within 1.5 m of the
  claimed point, a within 1.0 m of it -> `tstart` (paired, `claimsPoint`) -> `dropInto` (step off, a kinematic fall
  on the free-fall time `sqrt(2h / 9.81)` to the catcher's chest, then set down beside the catcher) and `catchTake`
  (0.9 s: take the weight, knees bend, lower to the feet).
- No noise, no roll: the dropper's path is kinematic; at the end K2 calls `controller.caughtLanding()` (new, K2 in
  `playerController.ts` beside `registerLanding` `:357-362`: resets the fall's top so no landing band fires). A13: no
  fall damage exists, the gain is the silence.
- Done: the catcher's side sends `pull` at the end of `catchTake` (`doneBy 'b'`) -> host relays -> `kitDone`.
- Placeholders: `catchOffer` 'brace', `catchTake` 'brace', `dropInto` 'drop'. Mixamo later (CLIP-LIST K2):
  downloads 5 and 6.
- Marlow's wiring: the cage ladder stays locked (`a6PumpHouse.ts:336-338`); an uncaught 6 m fall is a heavy landing
  the attendant hears (the retry line `a6PumpHouse.ts:136`).
- Marlow station 16 `a6-dropcatch` uses the real move when the id `dropCatch` is on.

**Chimney Pair (K3; Marlow station 11 `a5-chimney`).** SIGNOFF: "Both brace back to back in a narrow shaft and climb it
together." Real-world: two climbers back to back, each pushing the feet (and hands) on the wall in front, moving in
turn (one pushes while the other shifts); slow.
- Shaft: two parallel facing walls, found by chest-height rays front and back from the offerer, or a spot
  (`kind 'chimneyPair'`: (`x`, `y`, `z`) the shaft floor's centre, `yaw` across it, `w` width, `h` its top over the
  floor, the exit side by `x2`, `z2`). Band: width 1.2-1.6 m (Marlow's A5 gap 1.4 m, Michael ~20:40 "1.4 m
  (Recommended)", #574 BRIEF A19), height 3-8 m, the top an exit onto a lip (A5: the wall top at 6 m).
- Split jump: the split gap search finds walls 1.2-1.95 m apart and 3.6 m tall (scale sheet "Split-jump gap"), so a
  chimney shaft is also a solo split gap. K3 takes every chimney spot's shaft out of the split-gap search
  (`src/player/splitJump.ts`, a `noSplit` box list read from the level's kit spots), so the shaft has no solo way up
  (SIGNOFF: no move gets a solo way round it). A free chimney away from a spot stays a split gap too (stated in the
  A12 question).
- Offer (role b): in the shaft, Co-op -> "Co-op: brace for a chimney climb (chimney pair)" -> `chimneyOffer` (back to
  the shaft's centre line, facing a wall). Wire `brace` + `CHIMNEY_SUB` 256, `s` = the width.
- Take (role a): in the same shaft within 1.5 m, Co-op -> `tmove chimneyPair` -> host rule: b offering with bit 256,
  both on the ground, same floor +-0.4 m, within 1.5 m, b's `s` in the band -> `tstart` (paired) -> both
  `chimneyBrace` (1.0 s: back to back on the centre line, feet up onto the own wall) -> `chimneyClimb` (held).
- Climb: each page moves its own body on its stick (up `CHIMNEY.climb` 0.35 m/s, down the same), never more than
  `CHIMNEY.lead` 0.15 m above the partner's height as last seen (wire `s` = height over the start floor while
  climbing), so the pair rises at the slower stick with no new message. Down to the floor -> step off (end `drop`).
  At the top (`h` reached) -> `chimneyTop` (1.2 s: climb out onto the exit lip, the rope's top-out path pattern
  `ropeTopPath`) -> free. Either lets go (B), is hit or downed: both slide down (`ropeDown` speed) and stand (end
  `drop`). Role a's ids mirror b's (`chimneyJoin`, `chimneyPush`, `chimneyRise`, `chimneyOut`).
- Done: role a sends `pull` when both are out (`doneBy 'a'`) -> `kitDone('chimneyPair', spot, a, b)`.
- Placeholders: brace states 'brace', climb states 'ladderClimb', top states 'climbUp'. Mixamo later (CLIP-LIST
  K3): expected gap, hand-made only (download 2 for the leg push).
- Marlow's wiring: the wicket `g-a5-wicket` stays shut (`a5Substation.ts:190`, `:309`); the inside ladder (`:193`)
  stays as the way down from the wall top.
- Marlow station 11 `a5-chimney` uses the real move when the id `chimneyPair` is on.

**Swing Pass (K4; Marlow station 12 `a5-swing`).** SIGNOFF: "One, braced on a pipe, swings the partner across a
shaft." Real-world: the anchor grips an overhead bar with one hand, braces the hips back over the edge and locks
wrists with the partner (a wrist-to-wrist grip); the partner steps off and swings under the anchor's arm as a
pendulum, letting go at the far end of the arc.
- Spot (required: the bar is not a `pipeH` anchor, so nobody can hand-traverse it alone): `kind 'swingPass'`,
  (`x`, `y`, `z`) the bar over the near edge (`y` the bar's height), `yaw` across the gap, `w` the gap, `y2` the far
  floor. Band: gap 2.0-3.5 m (A5's trench 3.5 m, `a5Substation.ts:39`), bar 2.2-2.8 m over the near floor (A5
  `A5_GANTRY_PIPE_Y` 2.6, which Marlow said K4 sets), far floor within +-0.4 m of the near floor, a far landing at
  least 0.75 m deep.
- Anchor (role b): within 0.8 m of the spot's near edge point, facing the gap, Co-op -> "Co-op: brace on the pipe
  (swing pass)" -> `swingOffer` (SIGNOFF clip swingAnchor: jump-grab the bar one-handed, hips back). Wire `brace` +
  `SWING_SUB` 512, `s` = spot index + 1.
- Rider (role a): beside the anchor within 1.5 m, Co-op -> `tmove swingPass` (spot index in `target`, the claimed
  landing `lx`, `gy`, `lz` = the spot's landing) -> host rule: b offering with 512 at that spot, a on the ground in
  reach, same floor +-0.4 m, the landing within 0.75 m of the spot's landing point and its floor within 0.4 m of `y2`
  -> `tstart` (paired, `claimsPoint`) -> rider `swingRide` (`SWING.ride` 1.6 s: grip, step off, a pendulum arc
  `swingPath(t)` under the bar, kinematic, the throw arc's pattern) -> `swingRelease` (0.4 s: let go, land crouched on
  the far edge) -> free. Anchor `swingHold` (the arm swinging, matched to the rider's clock on `TEAM_LINK`) -> back
  to the floor -> free. A hit or downed anchor before the step-off ends it (no start); once off the edge the swing is
  committed.
- Done: the rider sends `pull` at the landing (`doneBy 'a'`) -> `kitDone('swingPass', spot, a, b)`.
- Placeholders: `swingOffer` / `swingHold` 'hangOffer', `swingRide` 'vault' (the throw's), `swingRelease` 'vault'.
  Mixamo later (CLIP-LIST K4): `trav_hanging_idle` (folder) for the rider's grip, downloads 11 and 4.
- Marlow's wiring: the footbridge `g-a5-footbridge` stays shut (`a5Substation.ts:214-220`, `:310`); the gantry pipe
  stays a visual (`:232-242`) at the spot's bar height; the swung player opens the plates bolt from the west for the
  anchor (as Marlow's set already says).
- Marlow station 12 `a5-swing` uses the real move when the id `swingPass` is on.

**Plank Bridge (K5a carry, K5b lay and cross; Marlow station 5 `a2-plank`).** SIGNOFF: "Both carry a scaffold board
and lay it over a gap. Guards notice it." Real-world: a 3.9 m scaffold board (225 x 38 mm, about 20-25 kg) carried
end to end at the hip, laid by sliding it out over the gap from the near edge until it bears on the far side; at least
0.3 m bearing each end (starting value).
- Spot: `kind 'plankBridge'`, (`x`, `y`, `z`) the board stack's middle, `yaw` the boards' long axis, `w` the board
  length (3.9; A2's dressing boards `a2CarriageShed.ts:240-247`). Band: gap 1.0-3.3 m (3.9 less 0.3 bearing each end;
  A2's pit 3.0 m `a2CarriageShed.ts:38`), the two edges level within +-0.3 m, the stack within 15 m walk of the gap
  on the same floor. One board per spot (the device: on the stack, carried, on the floor, laid).
- Lift (K5a; role b first): at one end of the board (within 0.6 m of an end point), Co-op -> "Co-op: take an end of
  the board (plank bridge)" -> `plankOffer` (crouched, hands on the board's end). Partner at the other end, Co-op ->
  `tmove plankBridge` (spot index in `target`, `s` 1 = lift) -> host rule: b offering with `PLANK_SUB` 1024 at that
  spot, the board not laid or carried, a within 0.6 m of the other end, same floor +-0.4 m -> `tstart` (paired) ->
  both `plankLift` (1.2 s, a leg lift to the hip) -> `plankCarry` (held).
- Carry (K5a): both steer; each page caps its own body to the board: the distance to the partner's seen end stays
  within `PLANK.len` +-0.25 m (the velocity projected onto the allowed band) and the speed under `PLANK.carry` 1.2 m/s,
  turn rate capped; hands busy (weapons off). The board's pose on every page is drawn between the two drawn bodies'
  hand points (so contact holds on every screen with no board pose on the wire). B by either -> both `plankDrop`
  (0.8 s, the board down where it is: on the floor, liftable again), end `drop`. Hit or downed: the same drop. Wire
  `brace` / `boost` + 1024, `s` 1 carrying.
- Lay (K5b): carrying, both within 1.0 m of a near edge, facing it, with a far floor found by a ray in the band ->
  either presses Co-op -> `tmove plankBridge` (`s` 2 = lay, the claimed far end `lx`, `gy`, `lz`) -> host rule: the
  pair carrying that spot's board, the claimed gap in the band, the far floor within 0.3 m of the near floor -> `tstart`
  with `l` (the far end) and `s` 2 -> both `plankLay` (1.6 s: slide out, lower) -> the board is laid (device `laid`,
  the pose from the near end and `l`; the same on both pages from the start message) -> free. A laid board can be
  lifted again from either end (back to `plankOffer`), so a pair can carry it on.
- The laid board (K5b, `src/world/plankBridge.ts`): a static collider 0.225 x 0.04 m on top of the edges' floor,
  walkable at any pace (no balance mechanic in the prototype; a narrow-beam walk pose is the KA slice's); guards do not
  path over it (no nav link: an engine item for Guard AI if a map needs it).
- Done: the host sees a player step off a laid board on the far side -> `kitDone('plankBridge', spot.id, crosser,
  layer)` (K5b's host tick).
- Guards: the device exposes `laid`, `opens`, `noticed` for Guard AI's "guards notice it" hook (a laid plank as a way
  left open, G41's door rule); the `plankBridge` live switch-on waits for it (Flags).
- Section restart: K5a resets every board to its stack (`resetKit` pattern, `teamController.ts` J9 S1).
- Placeholders: `plankOffer` 'brace', `plankLift` 'brace', `plankCarry` 'walk' (hands to the board by IK in KA5),
  `plankDrop` / `plankLay` 'brace'. Mixamo later (CLIP-LIST K5): `lifting_heavy_object`, `kneel_down` (folder),
  downloads 7 and 8.
- Marlow's wiring: the walkway door `g-a2-walkway` stays shut (`a2CarriageShed.ts:231-237`); the stack's dressing
  boards stay (the spot draws the one live board over them).
- K5a: no station change (the carry alone; `plankBridge` stays out of `KIT_BUILT`). K5b: Marlow station 5 `a2-plank`
  uses the real move when the id `plankBridge` is on.

### Slices
Prototype mode (ROADMAP ~16:05, ~16:20; the part 1 intro): starting values, no tuning or polish passes before
Michael's playthrough; one closest test set per PR, one fix round and one rerun at most; two fresh Opus checkers only
where the PR edits `src/net` or a wire path (a file `src/net/protocol.ts` imports: here K0 only), one Opus checker
otherwise; bible 5.12.2 (paired contact within 3 cm on host and client, `anim-audit` minimums) and a 1-2 min look video
only on the KA animation PRs. The test set: a wire PR runs the co-op group (`e2e-coop` + `e2e-netmove` +
`e2e-ctcourse`); a non-wire K slice runs `affected-e2e` capped at 1 (its closest suite; expected `e2e-netmove`), which
stands in for RULES' `src/game` checker-gate pair under prototype mode (ROADMAP ~16:05 item 4 "ONE closest test set",
authority 1 over RULES; settles plan check 3's note). No K slice adds an e2e step: each proves its rule and both
sides' paths headless in `tests/kit/<move>.test.ts` (two `TeamController`s on a stub host, as Campaign's
`tests/kit/shutter.test.ts`), and the real move's walk is Marlow's station wiring PR (its re-plan e2e). Each slice adds
its id to `KIT_BUILT` (`flags.ts`) in the PR that makes the move playable and ends by sending Marlow the id, the spot
fields and `onKitDone` (above). Docs per slice: the move file's header (the design as above) and its row in K0's kit
table in `docs/systems/coop.md`.

**K0 Kit ids, spots and the done call (Opus, src/net).** Makes the kit generic so K1-K5b touch only their own files.
- `teamMoves.ts`: `KitKind` + `deadweight | dropCatch | chimneyPair | swingPass | plankBridge`; `KIT_KINDS`;
  `TEAM_KINDS`; `isKitKind` by a lookup (no `'pull' || 'shutter'`); `DEADWEIGHT_SUB` 64, `DROPCATCH_SUB` 128,
  `CHIMNEY_SUB` 256, `SWING_SUB` 512, `PLANK_SUB` 1024 in `KIT_SUB`; `KIT_SUB_MASK` all seven; `TeamRequest.spot?`
  (the host's device for the request's spot index: a structural `{ id, kind, x, y, z, yaw }`, no registry import).
- `team.ts`: the five rows of `KIT_POSE_IDS` (ids above; `deadweight: { b: [chainGrab, chainHang, chainDrop], a:
  [grateUnder] }`, `dropCatch: { b: [catchOffer, catchTake], a: [dropInto] }`, `chimneyPair: { b: [chimneyOffer,
  chimneyBrace, chimneyClimb, chimneyTop], a: [chimneyJoin, chimneyPush, chimneyRise, chimneyOut] }`, `swingPass: { b:
  [swingOffer, swingHold], a: [swingRide, swingRelease] }`, `plankBridge: { b: [plankOffer, plankLift, plankCarry,
  plankDrop, plankLay], a: [plankJoin, plankLiftA, plankCarryA, plankDropA, plankLayA] }`) and their
  `KIT_POSE_PLACEHOLDER` rows (the placeholder names in Design are intents: K0 maps each to the nearest existing
  team state, clip or traverse on the master it is cut from); `teamPoseOfWire` maps any kit sub bit to its move by a bit table (both roles); the
  TeamPoser plays a kit move's placeholder unless a pose file registered one (`KIT_POSERS`, filled by
  `src/anim/clips/kit/<move>.ts`, loaded by `import.meta.glob('./kit/*.ts', { eager: true })` in `team.ts`: the KA
  slices' hook).
- `moveState.ts` `poseFromMoveState`: a `boost` with any part 2 kit bit plays its role-a placeholder traverse (a
  table, not the leg-up's climb-up); `tuneMoveRows.ts` `teamRowOfWire`: kit bits -> `team.<move>.a` / `.b`;
  `moveTune.ts`: the five in `TEAM_MOVES`, `TEAM_MOVE_LABEL`, `TEAM_ROLE_LABEL` (generic sliders; Michael tunes later).
- `protocol.ts`: the claimed point (`lx`, `lz`; the start's `l`) parsed for any kit kind (`isKitKind`), not only
  `pull` / `shutter` (`:916`, `:940`).
- `kitApi.ts` (new): `KitSpot`, `addKitSpot(key, spot)`, `kitSpotsOf(level, kind)` (the shutter specs' WeakMap on the
  builder's anchors); `KIT_PAIR: Partial<Record<KitKind, { pairS: number; doneBy: 'a' | 'b' }>>` (each move file
  fills its row at load, as `KIT_CHECKS`); `kitDone(g, kind, spot, a, b)` (host only: `g.mode?.onKitDone?.(...)`).
- `kitNet.ts`: `newKitPair` takes `until` from `KIT_PAIR[kind].pairS` (pull and shutter keep theirs); `kitEnd`'s
  non-pull rule takes the success side from `doneBy` (shutter: `a`, as today); `KitPair.spot` (the spot id).
- `coopHost.ts` kit branch (`:1197-1220`): the request's `target` is a spot index into `this.g.team.devices.list`
  (bounded; -1 none) -> `TeamRequest.spot`; the start carries that `target` and the request's `s` (the phase: plank
  lay 2) instead of -1 / 0; `kitHangEnd` (`:1255-1263`) calls `kitDone` when it relays the move's success end.
- `gameMode.ts`: `onKitDone?(kind, spot, a, b)` beside `onTeamMove`.
- `teamController.ts`: the kit offers run when `flags.coopKit` or any part 2 id is on (`:806`), and `kitIdle`
  (`:378`) skips a move whose id is off (`pull` / `shutter` by `flags.coopKit` as today, the five by
  `flags.kitMoves`), so `?kitmoves=deadweight` alone offers no pull-up.
- Files: `src/game/teamMoves.ts`, `src/anim/clips/team.ts`, `src/player/moveState.ts`, `src/anim/tuneMoveRows.ts`,
  `src/anim/moveTune.ts`, `src/net/protocol.ts`, `src/net/kitNet.ts`, `src/net/coopHost.ts`,
  `src/game/kit/kitApi.ts` (new), `src/game/modes/gameMode.ts`, `src/game/teamController.ts`,
  `tests/kit/kitApi.test.ts` (new: kinds and bits, the wire round trip of each kind with a spot and a claimed point
  through `parseMessage`, the generic pair rule, `kitDone` on host only, the per-id gate), `tests/teamPose.test.ts`
  (the wire bit table), `docs/systems/coop.md` (the kit table, one row per move), `changes/feature-coop-kit-k0.md`.
  Est. 500.
- Checks: `npx vitest run tests/kit tests/kitNet.test.ts tests/teamMoves.test.ts tests/teamPose.test.ts tests/net.test.ts
  tests/shutterWiring.test.ts`; typecheck; one test set: the co-op group (wire and `src/net`). Two fresh Opus checkers.
- Done looks like: the five kinds parse on the wire with a spot index and a claimed point; a remote in any of them
  draws its placeholder on both pages; Campaign's pull-up and shutter tests pass unedited; `?kitmoves=deadweight`
  offers no pull-up and `?coopkit=1` still does; `onKitDone` fires on the host only; no `KIT_BUILT` change, so every
  Marlow station still opens its stand-in; Marlow gets `addKitSpot` / `KitSpot` / `onKitDone` (message to Marlow
  Build). `PROTOCOL_VERSION` untouched (the train bumps).
- Flag: none new (the five ids stay out of `KIT_BUILT`). Depends on: #578, #581 and A1 on master. Runs beside A2 /
  B1 / B2 (B1 also edits `teamMoves.ts`; whichever lands second rebases).

**K5a Plank Bridge, lift and carry (Opus).** Design "Plank Bridge" lift, carry, put down, restart reset.
- Files: `src/game/kit/plankBridge.ts` (new), `src/world/plankBridge.ts` (new: `PlankBoards`, one board mesh per
  plank device, drawn between the carriers' hand points while carried, on the stack or floor otherwise; no collider
  yet), `src/world/world.ts` (builds `PlankBoards` when the level has plank spots, beside #578's `shutters`),
  `tests/kit/plankBridge.test.ts` (new), `changes/feature-coop-kit-k5a.md`. Est. 1,000.
- Checks: `npx vitest run tests/kit/plankBridge.test.ts tests/kit/kitApi.test.ts`; typecheck; one test set
  (`affected-e2e`, cap 1). One Opus checker.
- Done looks like: headless, two controllers lift a spot's board, carry it 10 m with the slower stick leading, turn,
  put it down and lift it again; the gap between the two ends stays within 0.25 m of the board's length on both
  pages; B or a hit drops it; a restart puts it back on its stack; `?kitmoves=0` offers nothing.
- Flag: `plankBridge`, NOT added to `KIT_BUILT` (no station change: the lay is K5b). Depends on: K0.

**K5b Plank Bridge, lay and cross (Opus).** Design "Plank Bridge" lay, the laid board, done, guards' exposure.
- Files: `src/game/kit/plankBridge.ts`, `src/world/plankBridge.ts` (the laid board's static collider),
  `src/core/flags.ts` (`plankBridge` into `KIT_BUILT`), `tests/kit/plankBridge.test.ts`,
  `changes/feature-coop-kit-k5b.md`. Est. 800.
- Checks: as K5a.
- Done looks like: headless, the pair lays the board over a 3.0 m gap and both walk across; a 3.5 m gap and a far edge
  0.5 m higher are refused politely; the host's `onKitDone('plankBridge', spot, ...)` fires on a crossing; the laid
  board reads `laid` / `opens` for Guard AI; lifted again it carries on; Marlow gets the id, the spot fields and the
  done call. Marlow station 5 `a2-plank` uses the real move when the id `plankBridge` is on.
- Flag: `plankBridge`. Depends on: K5a.

**K1 Deadweight (Opus).** Design "Deadweight".
- Files: `src/game/kit/deadweight.ts` (new), `src/core/flags.ts` (`deadweight` into `KIT_BUILT`),
  `tests/kit/deadweight.test.ts` (new: hang opens the spot's door after the lift time on the host, letting go shuts
  it, never on a body in the doorway, a client cannot open it without hanging, the pass each way and its two
  `onKitDone` calls, `?kitmoves=0`), `changes/feature-coop-kit-k1.md`. Est. 600.
- Checks: `npx vitest run tests/kit/deadweight.test.ts tests/kit/kitApi.test.ts`; typecheck; one test set
  (`affected-e2e`, cap 1). One Opus checker.
- Done looks like: as the test list; Marlow gets the id, the spot fields (door, two chains) and the done call. Marlow
  station 9 `a4-deadweight` uses the real move when the id `deadweight` is on.
- Flag: `deadweight` (live switch-on also waits for Guard AI's notice hook). Depends on: K0. Parallel with K5a / K5b.

**K3 Chimney Pair (Opus).** Design "Chimney Pair".
- Files: `src/game/kit/chimneyPair.ts` (new), `src/player/splitJump.ts` (the chimney spots' `noSplit` boxes out of the
  gap search), `src/core/flags.ts` (`chimneyPair` into `KIT_BUILT`), `tests/kit/chimneyPair.test.ts` (new: the shaft
  test from rays and from a spot, the band refusals, the lead cap keeping the two within 0.15 m, the top-out, the
  slide on a let-go, no split gap inside a spot's shaft), `changes/feature-coop-kit-k3.md`. Est. 1,000.
- Checks: `npx vitest run tests/kit/chimneyPair.test.ts tests/kit/kitApi.test.ts` plus the split-jump tests the grep
  of `tests/` finds; typecheck; one test set (`affected-e2e`, cap 1). One Opus checker.
- Done looks like: as the test list; Marlow gets the id, the spot fields and the done call. Marlow station 11
  `a5-chimney` uses the real move when the id `chimneyPair` is on.
- Flag: `chimneyPair`. Depends on: K0. Parallel with K1 / K5a.

**K4 Swing Pass (Opus).** Design "Swing Pass".
- Files: `src/game/kit/swingPass.ts` (new), `src/core/flags.ts` (`swingPass` into `KIT_BUILT`),
  `tests/kit/swingPass.test.ts` (new: the anchor offer at a spot only, the host's landing bounds, the arc lands on the
  far edge for 2.0 and 3.5 m gaps, a 3.6 m gap or a far floor 0.5 m off refused, done on the landing),
  `changes/feature-coop-kit-k4.md`. Est. 800.
- Checks: as K1 with its test file.
- Done looks like: as the test list; Marlow gets the id, the spot fields (bar point and height, gap, far floor) and the
  done call. Marlow station 12 `a5-swing` uses the real move when the id `swingPass` is on.
- Flag: `swingPass`. Depends on: K0.

**K2 Drop Catch (Opus).** Design "Drop Catch".
- Files: `src/game/kit/dropCatch.ts` (new), `src/player/playerController.ts` (`caughtLanding()`), `src/core/flags.ts`
  (`dropCatch` into `KIT_BUILT`), `tests/kit/dropCatch.test.ts` (new: the band 2.5 / 6.0 / 6.6 m, the catcher's reach,
  the caught landing registers no band and no noise, done from the catcher), `changes/feature-coop-kit-k2.md`.
  Est. 550.
- Checks: as K1 with its test file plus `tests/` files reading `registerLanding` / `landingKind` (grep).
- Done looks like: as the test list; Marlow gets the id, the optional spot and the done call. Marlow station 16
  `a6-dropcatch` uses the real move when the id `dropCatch` is on.
- Flag: `dropCatch`. Depends on: K0.

**KD Part 2 bands into the level standard (docs only; after A12 is answered).** When Michael answers the A12 question
(or the overnight A-line stands), the lead adds the five graph kinds to level-design 11.9 (`deadweight`, `drop_catch`,
`chimney_pair`, `swing_pass`, `plank_bridge`: Marlow's teach ids, `stationDef.ts:5` `lesson`) and five rows to scale
sheet section 3 with the numbers he approved; reviewer Marlow Build (owner of both docs); Marlow's validator slice adds
the kinds to `scripts/level-validate.mjs`. With "Change a number", the move file's constant changes in the same PR (one
line per move). Files: `docs/level-design.md`, `docs/design/scale-sheet.md`, `changes/feature-coop-kit-kd.md`. Est. 40.
Checks: CI `check` (docs only). Depends on: A12's answer; no K slice waits for it (A17).

**KA1-KA5 Animation (Opus, later; one per move: KA1 deadweight, KA2 drop catch, KA3 chimney, KA4 swing, KA5 plank).**
A2-style, each after its K slice and ranked by Michael's playthrough (prototype mode: playable first). Hand-made plus
Mixamo per role (Design "Animation" steps 1-4; CLIP-LIST rows K1-K5), each actor on its owner's source (#498); the
role poses in `src/anim/clips/kit/<move>.ts` registered through K0's `KIT_POSERS` and its role-a traverse table, a
studio pair loop (`src/anim/studioPairs.ts`), tuner values on K0's rows; the mocap step's files as A2 (append-only
rows in the shared Mixamo files). Files: `src/anim/clips/kit/<move>.ts` (new), `src/anim/studioPairs.ts`,
`tests/teamPose.test.ts`, the mocap step's files, `changes/feature-coop-kit-ka<n>.md`. Est. 600-800 hand-written each.
Checks: vitest on those files plus `tests/mixamoEmit.test.ts`; `node scripts/anim-audit.mjs` on the move's states;
one test set (`affected-e2e`, cap 1; the co-op group only if a KA slice must touch `remoteAvatar.ts`); one Opus checker
(two if it touches `src/net`); bible 5.12.2 (3 cm at contact on host and client) and a 1-2 min look video in the PR
body. Done looks like: as A2 (each role "hand-made + Mixamo <slug>" or "none, titles searched"; host on Mixamo,
client on Hand-made, both screens match). Flag: the move's id. Depends on: its K slice and #498 on master.

### Order (by playability: the re-plan stations in the order Michael meets them)
K0 -> K5a -> K5b (A2 st5 plank) -> K1 (A4 st9 deadweight) -> K3 and K4 (A5 st11 chimney, st12 swing) -> K2 (A6 st16
drop catch); KD when A12 is answered; KA1-KA5 after Michael's playthrough. The order is the priority for builder
slots; under full burn K1, K3, K4 and K2 run in parallel with K5a / K5b once K0 is on master (own files; one-line
`KIT_BUILT` rebases). Marlow wires each station after the K slice that makes its move playable lands. Estimates: K0
500, K5a 1,000, K5b 800, K1 600, K3 1,000, K4 800, K2 550, KD 40, KA1-KA5 600-800 each: all under ~1.5k.

## Flags (off live until accepted; built ids on in /preview/)
Every id: off in the live game, on in `/preview/` once its slice adds it to `KIT_BUILT` (Michael ~13:55 "All on in
preview"; `readKitMoves` through `PREVIEW_ON`); `?kitmoves=0` / `none` turns all off, an unbuilt id is never on.
| Flag | Default | Owner | Switch-on date | Switches on (live) when |
| --- | --- | --- | --- | --- |
| `kitMoves` id `descent` (`?kitmoves=descent`) | off live; on in /preview/ from A1 | Night Shift \| Player Build | target 2026-10-28 | A1 + A2 on master, walk item accepted |
| `kitMoves` id `stand` | off live; on in /preview/ from B1 | Night Shift \| Player Build | target 2026-10-29 | B1 + B2 on master, walk item accepted |
| `kitMoves` id `ropeSteer` | off everywhere (A3 parked) | Night Shift \| Player Build | after Michael's playthrough | A3 built after the playthrough, walk item accepted |
| `kitMoves` ids `dropCatch`, `chimneyPair`, `swingPass` | off live; on in /preview/ from its K slice | Night Shift \| Player Build | 2-4 days after #578 lands | that move's slice on master, its walk item accepted |
| `kitMoves` ids `deadweight`, `plankBridge` | off live; on in /preview/ from K1 / K5b | Night Shift \| Player Build | 2-4 days after #578 lands, and not before Guard AI Build's "guards notice it" hook is on master | that move's slice on master, Guard AI's notice hook on master (G403 "guards notice it"), its walk item accepted |
| `kitMoves` ids `pull`, `shutter` (Campaign's `coopKit` folded in by A1) | off live; on in /preview/ (built on #578) | Night Shift \| Campaign Build | Campaign's (target 2026-10-28) | as #578 says |

Switch-on adds the id to `KIT_MOVES_ON` (one line in `flags.ts`). The walk cap (Player / animation at 3) holds live
switch-on only; building goes on and `/preview/` shows it.

## Walk items
- Co-op lobby, Marlow Yard, `?kitmoves=descent` on both: at the A6 gallery rope spot, the partner beside the holder takes
  the rope down - accept when the drop over the edge and the descent look like a trained person on a held rope, both
  screens.
- Co-op, Marlow Yard A1 wall (4.4 m lip), `?kitmoves=stand`: the shoulder stand up, aim from the top, onto the lip; step
  down - accept when it reaches the lip, the rider's feet stay on the shoulders and both bodies match on both screens.
- After the playthrough, only if A3 is built: `?kitmoves=ropeSteer`: the holder walks the rope a metre along the edge
  with the partner on it - accept when it reads as a held, moving rope.
- Part 2: one item per move at its Marlow station once Marlow has wired it (`?kitmoves=<id>` on both): A2 st5 lay the
  board and cross, A4 st9 hang and pass both ways, A5 st11 climb the 1.4 m gap together, A5 st12 swing the trench, A6
  st16 catch the 6 m drop silently - accept when the move works and reads as two operators doing it, both screens
  (the look video comes with its KA animation slice).
- The Marlow Yard spots above (A6 gallery rope, A1 wall) are today's; Marlow's J14 re-plan (origin/feature/marlow-replan
  stations) may move them. The orchestrator's walk card names the spot from master at switch-on time.

## Risks and open questions
- PR #578 (Campaign's kit) edits the same rail and lands first (Order): A1 and B1 re-take their pointers from the master
  they are cut from. Part 2 cannot start before it lands.
- The rider kinematic on a remote base's avatar can jitter with the snapshot interpolation: the base is held still and
  the rider eases to the shoulder point (as `hangFollow`); B1's e2e measures it (10 cm netmove bar, 3 cm contact in B2).
- `stacked` is read by `src/net/partnerBlocker.ts:13` (no push between the pair) and `committedMoves.ts:47`: B1 confirms the
  pair is not pushed apart and that the rider cannot start committed moves on top.
- Guards: a rider at 3 m is a new silhouette above cover; G44's pitch factor applies unchanged. A walk note may ask for
  more; that is Guard AI's.
- Tests reading TEAM keys B1 deletes or changes: `tests/bunkerMap.test.ts:663` (`ladderFeet`, kept); the relay tests
  (unchanged, M2). B1 greps `scripts/` and `tests/` before the change.
- The look video tool on master (`scripts/look-video.mjs`) flies a camera over a map with the operator hidden: A2 / B2
  record the pair with Playwright-core `recordVideo` on the laptop GPU queue if J19's R31 recorder has not landed.
- Mocap gaps: Chimney Pair's back-to-back brace and Swing Pass's pendulum ride are unlikely to have a stock clip; those
  roles may ship hand-made only, and the report says so. Captures whose legs come from the planner IK (keyed kinds, see
  the `limits` notes in `mixamo-clips.json`) may need a channel kind for kneeling or hanging roles.
- Michael's ~00:25 2026-10-26 instruction (ROADMAP Decided: Mixamo is a toggle, not the default; it replaces the
  "switched ON" part of ~00:15) sets which source plays; it does not switch the moves on: they stay off in the live
  game behind `kitMoves` until his walk, on in `/preview/` once built (BRIEF A8).
- Settled (orchestrator ~18:25 2026-10-25, Campaign Build 2026-10-26 ~09:50): A1 folds `coopKit` into `kitMoves`
  (A8); the orchestrator fixes mission-engine PLAN row 106 (BRIEF A1).
- Closed: the relay lip height (Michael ~20:20 2026-10-25, BRIEF M2; scale sheet line 56 already reworded on master).
- Part 2: K0 needs #578 and #581 on master (both open, Campaign's engine stack); if they slip, K0 is cut on top of
  #581 as A1 is on #578 (A16's pattern) and retargeted when they land.
- Part 2: the spot index in a kit request assumes both pages list the kit devices in the same order (same level, same
  registration order). K0's test pins it; a mismatch shows as a polite refusal, never a wrong start.
- Part 2: Deadweight drives a course door from the host. Marlow's `courseMode` lock pass must leave `A4-grille` alone
  while `deadweight` is on (Marlow's station wiring takes the door off both grille gates); until it does, the stand-in
  stays (the id is off live).
- Part 2: a chimney band shaft is also a solo split-jump gap (scale sheet "Split-jump gap" 1.2-1.95 m). K3 removes it
  inside a chimney spot only; a free chimney elsewhere stays split-jumpable (A12 question says so).
- Part 2: no K slice proves its move in-game alone (no e2e step, prototype mode): the first real two-player run is
  Marlow's station wiring. A rule bug found there goes back to the K slice as a fix (G355 fixes allowed at the cap).
