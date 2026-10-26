# coop-kit: plan
Owner: Night Shift | Player Build. Status: current (job doc).

Lead: Night Shift | Player Build. Planner: Opus 5.5, master 2148ec969; revised for plan check 2 at master 65411ea65.
Brief: `docs/coop-kit/BRIEF.md`. Two parts (lead note ~18:10): **part 1** (R32 shoulder stand, R34 rope descent) is
planned in full; **part 2** (the five moves Michael added at ~18:05) is planned to slice-brief depth and gets its own
detailed PLAN section once Campaign's kit registry (PR #578) is on master (A11). All file:line pointers are
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
- **Marlow's kit stations.** `kitMoveOn` (`src/game/course/courseState.ts:151`, read at `:783`) answers false for every
  station kit id (`StationDef.kit`: `deadweight | dropCatch | chimneyPair | swingPass | plankBridge`,
  `src/game/course/stationDef.ts:12`), so each station's stand-in gate opens; its comment says Player's slices replace
  it with the host's `kitMoves` check. The stations (marlow-replan `docs/marlow-replan/STATIONS.md`): 5 `a2-plank`
  (plankBridge), 9 `a4-deadweight`, 11 `a5-chimney` (chimneyPair), 12 `a5-swing` (swingPass), 16 `a6-dropcatch`
  (dropCatch). `descent` and `stand` have no station.

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
  - src/game/course/courseState.ts  # SHARED with marlow-replan (Marlow Build): `kitMoveOn` only (K0)
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
  - src/world/counterweightGrate.ts
  - tests/teamMoves.test.ts
  - tests/ropeDescent.test.ts
  - tests/shoulderStand.test.ts
  - tests/teamPose.test.ts
  - tests/teamClimb.test.ts
  - tests/net.test.ts
  - tests/kit/{deadweight,dropCatch,chimneyPair,swingPass,plankBridge}.test.ts
  - tests/kit/{pullUp,registry,shutter}.test.ts  # A1 coopKit fold (files from PR #578)
  - tests/shutterWiring.test.ts  # A1 coopKit fold
  - tests/previewFlags.test.ts  # A1 (kitMoves preview read; coopKit line from #578)
  - tests/lookVideo.test.ts  # A1, only if the `?coopkit=1` alias changes the Tallow params
  - scripts/look-video/tallowWharf.json  # A1, as above
  - scripts/e2e-netmove.mjs
  - docs/design/scale-sheet.md
  - docs/level-design.md
  - docs/systems/coop.md
  - docs/mixamo-retarget/CLIPS.md  # SHARED: append-only generated rows
  - docs/art-credits.md  # credit rows
  - docs/coop-kit/**
maps: none
protocol: tmove, tstart (kind `stand`; part 2: the five kit kinds through Campaign's TEAM_KINDS)
save: none
```

Shared with other open work (the orchestrator orders; recommendation below):
Every plan `node scripts/claims-check.mjs` reports as an overlap (plan check 2, 57 overlaps), plus #498 (no claims
block), with the files and the order note:
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
  `protocol.ts`, `coopHost.ts`; wire; and `src/game/course/courseState.ts` `kitMoveOn` (K0 edits its body only, the
  station data stays Marlow's). Order: #574 first; K0 after it.
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
  #498. Part 2 starts after #578 and part 1. Mission-engine `docs/missions/PLAN.md` row 106 (human ladder = relay):
  the orchestrator fixes it (BRIEF A1).

## Slices: part 1

Branches `feature/coop-kit-<slice>` in their own worktrees; each slice is one PR to master (three-dot diff, so a slice
cut from an earlier slice's head shows only its own lines once that one has released). Prototype mode (ROADMAP
~16:05 item 4, ~16:20; RULES "Test tiers"): each PR runs ONE test set, its `affected-e2e`. Where the PR touches
`src/net` or a wire path (a file `protocol.ts` imports: `teamMoves.ts` once #578 is on master, `moveState.ts`,
`courseState.ts`) that set is exactly the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse`, which also covers
the `src/game` / `src/player` checker gate; else it is `e2e-netmove`. No extra suites, no repeat proof runs: a red
test gets one fix round and one rerun, then it is quarantined or noted and the work ships. Two fresh Opus checkers
only where the PR edits `src/net` or changes what goes on the wire (A2, B1, B2, K0, K5a); one Opus checker otherwise.
Bars: bible 5.12.2 (paired contact within 3 cm on host and client, `anim-audit` minimums) and the 1-2 min look video;
no finer bars.

**A1 Rope descent, mechanics (Opus).** The design above: `checkTeamRequest` top case and `kitMoves` gate; the
beside-the-holder offer and prompt (`teamController.ts:684-721`); `begin` from the top (`:918-944`): `ropeOver`, the
floor ray, `ropeClimb` down to the floor and the step-off end; `ropeOver` in `ROPE_CLIMBER`, `mode`, `wireSub`, `wireS`
= 1 from the top (`:1142-1180`); placeholder pose `climbUp` with `traverseT` 1 -> 0. The flag `kitMoves` (Design
"Both moves": `readKitMoves`, `KIT_BUILT` = `descent`, `pull`, `shutter`, `KIT_MOVES_ON` empty, the preview default).
**The coopKit fold** (BRIEF A8; #578 is on master by then): `flags.coopKit` goes; its reader `teamController.ts`
(`flags.coopKit ? this.kitIdle(...)`, #578 line 806) offers each kit kind only when its id is in `kitMoves`;
`?coopkit=1` / `0` stays an alias for `pull` + `shutter`; its tests switch to `kitMoves` (`tests/kit/pullUp.test.ts`,
`registry.test.ts`, `shutter.test.ts`, `tests/shutterWiring.test.ts` set `kitMoves` in `beforeAll` and restore it;
`tests/previewFlags.test.ts` checks the `kitMoves` read instead of the `coopKit` line). Tallow's look-video params
(`scripts/look-video/tallowWharf.json`, `tests/lookVideo.test.ts`) keep `coopkit=1` through the alias; edited only if
the alias cannot carry them. Docs: scale sheet line 57 "climb up or rappel down" (reviewer Marlow Build, G293), the
rope paragraph of `docs/systems/coop.md`.
- Files: `src/game/teamMoves.ts`, `src/game/teamController.ts`, `src/core/flags.ts`, `tests/teamMoves.test.ts`,
  `tests/ropeDescent.test.ts` (new), `tests/previewFlags.test.ts`, `tests/kit/{pullUp,registry,shutter}.test.ts`,
  `tests/shutterWiring.test.ts`, (`tests/lookVideo.test.ts`, `scripts/look-video/tallowWharf.json` only if needed),
  `scripts/e2e-netmove.mjs` (a descent step: the client rappels from beside the host, the host sees `boost` + sub 4
  with `s` 1, the client steps off at the floor, the host is freed; then `?kitmoves=0`: no offer),
  `docs/design/scale-sheet.md`, `docs/systems/coop.md`, `changes/feature-coop-kit-a1.md`. Est. 750 (650 descent + ~100
  fold).
- Checks: `npx vitest run tests/teamMoves.test.ts tests/ropeDescent.test.ts tests/hangDownNet.test.ts
  tests/previewFlags.test.ts tests/kit tests/shutterWiring.test.ts`; typecheck; one test set: `affected-e2e` (the
  co-op group: `teamMoves.ts` is a wire path once #578 is on master; ctcourse proves A6's rescue line unchanged). One
  Opus checker (no `src/net` edit, no wire shape change).
- Done looks like: with `?kitmoves=descent` on both pages the partner beside the holder rappels down and steps off;
  with `?kitmoves=0` nothing changes (the climb from the foot, e2e-ctcourse A6's rescue line, unchanged); a unit test
  of both flag paths: `readKitMoves(null, true)` = `KIT_BUILT`, `readKitMoves(null, false)` = empty, `0` / `none` =
  empty, an unbuilt id dropped; `?coopkit=1` still turns on pull and shutter; tests/kit pass under `kitMoves`.
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

## Slices: part 2 (slice-brief depth)

Gate: PR #578 (Campaign's KIT0 registry `src/game/kit/registry.ts`, NET kit wire kinds through `TEAM_KINDS`,
`KIT_POSE_IDS` in `team.ts`) is on master; part 1 is merged. Then each move is one Opus slice (Plank Bridge two) in its
own new files: `src/game/kit/<move>.ts` (rule, timing, device), `src/anim/clips/kit/<move>.ts` (both roles' poses, the
SIGNOFF clips), `tests/kit/<move>.test.ts`, plus its id added to `KIT_BUILT` in `flags.ts`; one look video each. One
test set per PR (Slices part 1 intro): `affected-e2e`, the co-op group where it touches `src/net` or a wire path (K0,
K5a), else `e2e-netmove`; one Opus checker, two on K0 and K5a (wire / `src/net`). Every K slice gives each role
hand-made plus Mixamo (Design "Animation" steps 1-4; CLIP-LIST rows K1-K5), each actor on its owner's source; the
report lists each role as "hand-made + Mixamo <slug>" or "none, titles searched"; the mocap step's files as A2 (new
slugs only, append-only rows in the shared Mixamo pipeline files). A detailed PART-2 section (file:line on that master)
is written when the gate opens, with the band rows question to Michael (BRIEF A12, "Questions"), and it gets a fresh
Opus plan checker (RULES "Intake" 4) before K0 starts.

**Marlow `kitMoveOn` seam (K0, then each K slice).** K0 replaces `kitMoveOn`'s body (`src/game/course/courseState.ts:151`
on master; shared with marlow-replan, Marlow Build: the function only, the station data stays Marlow's) with
`flags.kitMoves.has(kit)`, the host page's set (no allocation). Since an id outside `KIT_BUILT` is never in the set, K0
changes no station; each K slice turns its station to the real move by adding its id to `KIT_BUILT` (on in `/preview/`
at once, in the live game at switch-on). Each K slice's done line says which Marlow station uses the real move.

**K0 Kit ids (Sonnet, strict brief).** All five kinds in `KitKind` / `KIT_KINDS` / `KIT_SUB` (64 deadweight, 128
dropCatch, 256 chimneyPair, 512 swingPass, 1024 plankBridge) in `teamMoves.ts`, their pose ids and placeholders in
`KIT_POSE_IDS` (`team.ts`), `TEAM_MOVES` rows (`moveTune.ts`), `kitMoveOn` as above, so K1-K5 touch only their own
files and run in parallel. Est. 160. Flag ids reserved in `kitMoves` (not in `KIT_BUILT`). K0 adds five wire kinds
(`tmove` / `tstart` through `TEAM_KINDS`): two fresh Opus checkers (RULES "A job", `src/net` and wire), not a Sonnet
check. Done looks like: the five kinds are on the wire with placeholder poses; `kitMoveOn` reads `flags.kitMoves`;
every Marlow station still opens its stand-in (no part 2 id built yet).

| Slice | Move (SIGNOFF row) | Roles and clips (SIGNOFF table) | Rule and device | Hooks owned elsewhere | Size |
| --- | --- | --- | --- | --- | --- |
| K1 | Deadweight: one hangs on a chain so a counterweighted grate lifts for the other | holder: chainGrab, chainHang, chainDrop; partner: walks or crawls under (Campaign's `crawlUnder` when it exists, else the crouch walk) | a kit device (chain point, grate opening, as the shutter's `KitDevices`); the grate is up only while the holder's weight is on the chain; `src/world/counterweightGrate.ts` | Guard AI Build's "guards notice it" hook (a host `StealthSystems` kit-device notice beside `noticeOpenDoors` and J9's `noticeOpenShutters`, mission-engine J8-J9 PLAN S2 and :307): K1 exposes the grate's open state for it; the `deadweight` switch-on waits for the hook (Flags) | S (0.5 day), est. 700 |
| K2 | Drop Catch: one drops from above a safe drop height into the partner's arms; silent landing | catcher: catchReady, catchTake; dropper: dropInto | catcher offers under an edge; the dropper's drop from above the hard-landing band (`registerLanding` / `landingKind`, `src/player/playerController.ts:357-362`; K2 edits this file: a caught landing skips the noise and the roll) lands with no landing noise and no roll (A13) | none | S (0.5 day), est. 600 |
| K3 | Chimney Pair: back to back in a narrow shaft, climbing together | both: chimneyBrace, chimneyClimb | shaft found from two facing walls in a width band (real-world back-and-foot chimney width, researched); both braced, a shared climb speed, the top exits as a climb-up | this PR: the shaft band row and graph kind once Michael answers or it is logged (A12; Marlow reviews; J12 takes the kind with an INFO) | M (1-1.5 days), est. 1,100 |
| K4 | Swing Pass: one braced on a pipe swings the partner across a shaft | anchor: swingAnchor; rider: swingRide, swingRelease | the anchor on a horizontal pipe (`pipeH`) facing the gap; the rider swings a pendulum arc and lands across within a gap band | this PR: the gap band row and graph kind once Michael answers or it is logged (A12; Marlow reviews; J12 takes the kind with an INFO) | M (1 day), est. 1,000 |
| K5a | Plank Bridge, the carry: both lift and carry a scaffold board | both: plankLift, plankCarry | a plank prop and its pick-up points; the pair moves at the slower stick, host-authoritative plank pose on the wire (K5a edits `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`, `src/net/remoteAvatar.ts`: claimed; two Opus checkers) | none | L part 1 (1 day), est. 1,200 |
| K5b | Plank Bridge, the lay and the cross | both: plankLay | a laid plank becomes a walkable collider and a nav link over a gap shorter than the board less the bearing; guards notice it (`src/world/plankBridge.ts` exposes the laid plank for the hook) | Guard AI Build's "guards notice it" hook (as K1: a laid plank seen as a way left open, as G41 does for doors); the `plankBridge` switch-on waits for it (Flags); this PR: the gap band row once Michael answers or it is logged (A12; Marlow reviews) | L part 2 (1 day), est. 1,100 |

Order: K0 -> K1-K4 and K5a in parallel (own files) -> K5b. Flag ids `deadweight`, `dropCatch`, `chimneyPair`,
`swingPass`, `plankBridge`. The scale-sheet band rows and level-design 11.9 graph kinds change the level standard:
they are the one-click question to Michael (BRIEF A12, asked by day when the PART-2 section is written; overnight
assumed and logged to the orchestrator); each PR then carries its rows for Marlow Build's review, and J12 accepts the
kinds with one INFO each (Marlow 2026-10-25).

Marlow stations (marlow-replan `STATIONS.md`; the K slice's done line, through `kitMoveOn`):
- K1: Marlow station 9 `a4-deadweight` (bay A4) uses the real move when the id `deadweight` is on.
- K2: Marlow station 16 `a6-dropcatch` (bay A6) uses the real move when the id `dropCatch` is on.
- K3: Marlow station 11 `a5-chimney` (bay A5) uses the real move when the id `chimneyPair` is on.
- K4: Marlow station 12 `a5-swing` (bay A5) uses the real move when the id `swingPass` is on.
- K5a: no station change (the carry alone; `plankBridge` stays out of `KIT_BUILT`).
- K5b: Marlow station 5 `a2-plank` (bay A2) uses the real move when the id `plankBridge` is on (K5b adds it to `KIT_BUILT`).
- Part 1 (`descent`, `stand`, `pull`, `shutter`): no Marlow station names them (`StationDef.kit` lists the five only).

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
- Part 2: one item per move, with its look video, once built.
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
