# coop-kit: plan
Owner: Night Shift | Player Build. Status: current (job doc).

Lead: Night Shift | Player Build. Planner: Opus 5.5, master 2148ec969. Brief: `docs/coop-kit/BRIEF.md`.
Two parts (lead note ~18:10): **part 1** (R32 shoulder stand, R34 rope descent) is planned in full; **part 2** (the five
moves Michael added at ~18:05) is planned to slice-brief depth and gets its own detailed PLAN section once Campaign's
kit registry is on master (A11). All file:line pointers are origin/master 2148ec969.

## 1. How it works today (master 2148ec969)

- **Team-move rail.** `src/game/teamController.ts` runs both players' sides (states `:37-61`; the Co-op action in
  `idle` `:667`); `src/game/teamMoves.ts` holds the pure rules and paths. A move is a request `tmove` (client
  `src/net/coopClient.ts:315-316`; host's own `src/net/coopHost.ts:1036`) checked by the host on both MoveStates
  (`onTeamMove` `coopHost.ts:1100-1150` -> `checkTeamRequest` `teamMoves.ts:55-105`), then `tstart` to both
  (`coopClient.ts:293-294` -> `TeamController.begin` `teamController.ts:912`). Kinds on the wire: `boost | ladder |
  throw | hang | rope` (`src/net/protocol.ts:305`, `:308`, parse `:874`, `:888`); `ladder` is the ledge relay
  (`teamMoves.ts:11`). Paired moves (hang, rope) stay paired on the host (`teamPairs` `coopHost.ts:1072`, `:1139-1142`)
  until `hangEnd` (`pull` / `drop`, `:1102-1111`) or `end`.
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
  `:456-458`) which nothing writes but `partnerBlocker.ts:13`, `committedMoves.ts:47` and `validate.ts:242` (rider's
  hands free) still read. level-design 12.1 still quotes `ladderGrab` 4.1 (`docs/level-design.md:305-306`), 12.2 says
  G57 is not built (`:331`), open item 1 (`:673-674`).
- **Poses.** `src/anim/clips/team.ts` poses both roles of boost, throw, hang and rope on one clock (`TeamPoseMove`
  `:29`, `teamPoseOfState` `:300`, `teamPoseOfWire` `:420`, `TEAM_LINK` `:375`); GameState feeds the local side
  (`gameState.ts:3137-3157`), each `RemoteAvatar` the partner (`remoteAvatar.ts:813`). Tuner rows per move:
  `src/anim/moveTune.ts:26` (`TEAM_MOVES`); the studio's pairs `src/anim/studioPairs.ts`. The rope line
  `src/game/ropeLine.ts` (drawn on the holder's and climber's pages, `gameState.ts:2600-2602`).
- **Hands.** The local player's weapons are off in any active team move except the hang-down (`gameState.ts:1407`,
  `:1916`, `:1972`); the host's mirror `hostHandsFree` already frees `stacked` sub 1 (`validate.ts:242`).

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
- Holder steering (A3, G180 "holder steers sideways"): the holder's stick moves the rope point along the edge
  (`TEAM.ropeSteer` +-1.0 m, 0.5 m/s, starting values) inside a free strip found once at the offer; the holder's MoveState
  `s` carries the offset and the climber follows it. Its own id `ropeSteer` in `kitMoves`.

### R32 shoulder stand (slices B1, B2)
- Offer: a standing player facing a wall within `TEAM.standWall` (~0.9 m, a ray at chest height) with the partner within
  12 m and the `stand` id on sees "Co-op: offer a shoulder stand (crouch: leg-up)" and presses Co-op: `standOffer`
  (wire `brace` + `STAND_SUB` 32; bits 8 / 16 are Campaign's pull-up and shutter on mission-engine). Where the wall test
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
- Flag (A8): `kitMoves` in `src/core/flags.ts`, a set of move ids from `?kitmoves=` (comma list; `all`); default empty.
  The host's rule and each page's offers and prompts read it. Tests set it in `beforeAll` and restore it.
- Animation (A9, slices A2 and B2, Opus): real-world technique researched first with sources in the slice report:
  descent = the holder's braced body belay (hips low, rope round the back, brake hand at the hip) and the descender going
  over on the knees then the belly, feet on the wall, hand under hand down with the body leaning out; stand = the base
  facing the wall, feet apart, knees bent, back straight, hands then round the rider's shins as it rises with the legs;
  the rider steps thigh -> shoulders, knees soft, hands on the wall for balance, the press with the soles in the base's
  palms. Both roles on both pages through `TEAM_LINK` / `teamPoseOfWire`; paired contact within 3 cm on host and client
  (bible 5.12.2 #11); `scripts/anim-audit.mjs` passes; tuner rows so Michael can tune (G243); a 1-2 min look video per
  animation PR, path in the PR body (the R31 recorder from J19 when it is on master; else a Playwright-core
  `recordVideo` run on the laptop GPU queue).

## Claims
```claims
files:
  - src/game/teamMoves.ts
  - src/game/teamController.ts
  - src/game/localMoveState.ts
  - src/game/gameState.ts
  - src/game/ropeLine.ts
  - src/game/kit/{deadweight,dropCatch,chimneyPair,swingPass,plankBridge}.ts
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
  - src/game/studioStage.ts
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
  - scripts/e2e-netmove.mjs
  - docs/design/scale-sheet.md
  - docs/level-design.md
  - docs/systems/coop.md
  - docs/coop-kit/**
maps: none
protocol: tmove, tstart (kind `stand`; part 2: the five kit kinds through Campaign's TEAM_KINDS)
save: none
```

Shared with other open work (the orchestrator orders; recommendation below):
- Campaign's mission-engine kit (origin/feature/mission-engine-flg-gb6, 651 commits behind master, no PR open):
  `teamMoves.ts`, `teamController.ts`, `src/anim/clips/team.ts`, `protocol.ts`, `coopHost.ts`, `coopClient.ts`,
  `flags.ts`, `moveState.ts`, `gameState.ts`, and `src/game/kit/*` (part 2 adds files beside its `registry.ts`,
  `pullUp.ts`, `shutter.ts`). Sub bits: theirs 8 / 16, ours 32 (stand) and 64-1024 (part 2).
- The pull-up and shutter poses Player owes Marlow (resume-ct-core): `src/anim/clips/team.ts` (`KIT_POSE_IDS`,
  placeholders, on mission-engine), `src/anim/moveTune.ts`, `src/anim/studioPairs.ts`. Not taken by this job.
- #438 guard-ai-g327 edits `src/core/flags.ts` (a different line; trivial merge).
- Marlow's route-runs (origin/feature/route-runs-2, R8) claims `docs/level-design.md` sections 14-15; B1 edits only 12.1,
  12.2, 12.3 and open item 1 (claims-check overlap on the file, not the lines).
- Changelog fragments `changes/feature-coop-kit-<slice>.md` are per-slice shared files (not claimed).
- **Order (recommended):** part 1 PRs go first (small, ready on master's code); Campaign's mission-engine kit PR merges
  over them (add `stand` to its `BuiltinTeamKind` / `TEAM_KINDS`, keep `kitMoves` beside `coopKit`). Part 2 starts after
  that kit PR (KIT0 + NET) is on master.

## Slices: part 1

Branches `feature/coop-kit-<slice>` in their own worktrees; each slice is one PR to master (three-dot diff, so a slice
cut from an earlier slice's head shows only its own lines once that one has released). Every part 1 PR: two fresh Opus
checkers (co-op host / client paths), and the lead requests `e2e-coop` + `e2e-netmove` (RULES "Test tiers").

**A1 Rope descent, mechanics (Opus).** The design above: `checkTeamRequest` top case and `kitMoves` gate; the
beside-the-holder offer and prompt (`teamController.ts:684-721`); `begin` from the top (`:918-944`): `ropeOver`, the
floor ray, `ropeClimb` down to the floor and the step-off end; `ropeOver` in `ROPE_CLIMBER`, `mode`, `wireSub`, `wireS`
= 1 from the top (`:1142-1180`); placeholder pose `climbUp` with `traverseT` 1 -> 0. The flag `kitMoves`. Docs: scale
sheet line 57 "climb up or rappel down" (reviewer Marlow Build, G293), the rope paragraph of `docs/systems/coop.md`.
- Files: `src/game/teamMoves.ts`, `src/game/teamController.ts`, `src/core/flags.ts`, `tests/teamMoves.test.ts`,
  `tests/ropeDescent.test.ts` (new), `scripts/e2e-netmove.mjs` (a descent step: the client rappels from beside the
  host, the host sees `boost` + sub 4 with `s` 1, the client steps off at the floor, the host is freed; then the flag
  off: no offer), `docs/design/scale-sheet.md`, `docs/systems/coop.md`, `changes/feature-coop-kit-a1.md`. Est. 650.
- Checks: `npx vitest run tests/teamMoves.test.ts tests/ropeDescent.test.ts tests/hangDownNet.test.ts`; typecheck;
  laptop: affected-e2e + `e2e-coop` + `e2e-netmove`.
- Done looks like: with `?kitmoves=descent` on both pages the partner beside the holder rappels down and steps off;
  without it nothing changes (the climb from the foot, e2e-ctcourse A6's rescue line, unchanged).
- Flag: `kitMoves` id `descent`. Depends on: nothing.

**A2 Rope descent, animation and the remote view (Opus).** Research first (A9). Poses: the descender's `ropeOver`
(kneel at the edge facing in, legs over, belly over, hands on the lip, onto the rope) and the descent on the rope (feet
on the wall, hand under hand, leaning out), the holder's `ropeB` load and pay-out for a descent. Remote: `boost` + sub 4
with `s` 1 above the rope's top poses `ropeOver` (a `ropeSeenStep`-style eased step, kept in `team.ts`, not
`teamMoves.ts`, so A2 and B1 share no file). The rope line during `ropeOver`. Tuner rows (descent in the `rope`
section). A studio pair loop for the look video.
- Files: `src/anim/clips/team.ts`, `src/net/remoteAvatar.ts`, `src/game/ropeLine.ts`, `src/anim/moveTune.ts`,
  `src/anim/studioPairs.ts`, `tests/teamPose.test.ts`, `tests/teamClimb.test.ts`, `changes/feature-coop-kit-a2.md`.
  Est. 700.
- Checks: vitest on those files; `node scripts/anim-audit.mjs` on the descent states; laptop: co-op group (`e2e-coop`,
  `e2e-netmove`, `e2e-ctcourse`), `e2e-anim`, `e2e-studio`, `e2e-clip`; look video.
- Done looks like: hands on the rope and lip within 1 cm, the pair within 3 cm at contact on both pages, no pop over the
  edge (velocity change per frame under 0.5 cm as the top-out), the video shows both roles from both pages.
- Flag: `descent` (no new id). Depends on: A1 (cut from A1's head).

**B1 Shoulder stand, rules, wire and play (Opus).** The design above: `STAND_SUB`, `stand` kind and host rule
(`teamMoves.ts`), the offer, the rider's and base's states, the lip search in the one band, the press and the attach,
the ends (`teamController.ts`, comment `:78`), `mode` returning `stacked` with sub 1 / 2 (`localMoveState.ts:35-42`),
the pistol from the top (`gameState.ts:1407`, `:1916`, `:1972`; camera pivot), the wire (`protocol.ts:305`, `:308`,
`:874`, `:888`; `coopHost.ts:1139-1142` pairs `stand`; `coopClient.ts:315-316`), `TEAM` constants (A2; delete the dead
ones; `bunkerShaft.ts:80` comment). Docs (reviewer Marlow Build, G57 engine fact): level-design 12.1 `:305-306` (the
stand reaches the same `TEAM.boostMax` 4.5 m), 12.2 `:331` line removed, open item 1 `:673-674` closed, 12.3 lists the
map decisions that relied on 4.1 (Tallow Wharf's sign-off has no ladder spot because "The ladder reaches only 4.1 m";
bunker W2 4.25, `bunkerShaft.ts:80`); `docs/systems/coop.md`.
- Files: `src/game/teamMoves.ts`, `src/game/teamController.ts`, `src/game/localMoveState.ts`, `src/game/gameState.ts`,
  `src/config/movement.ts`, `src/net/protocol.ts`, `src/net/coopHost.ts`, `src/net/coopClient.ts`,
  `src/world/maps/bunkerShaft.ts` (comment), `tests/teamMoves.test.ts`, `tests/shoulderStand.test.ts` (new),
  `tests/net.test.ts`, `scripts/e2e-netmove.mjs` (stand at the Proving Grounds 4.2 m lip: offer, take, top, aim, onto the
  lip; stand and step down; the host's copy of the rider within 10 cm; the flag off: no offer), `docs/level-design.md`,
  `docs/systems/coop.md`, `changes/feature-coop-kit-b1.md`. Est. 1,300 (if over 1.5k: the e2e step and docs go to B1b).
- Checks: vitest on the three test files plus `tests/bunkerMap.test.ts`, `tests/animStudio2.test.ts`,
  `tests/ctcourse/*.test.ts` (TEAM readers); grep `scripts/` and `tests/` for every changed TEAM key; laptop: co-op
  group + affected-e2e.
- Done looks like: with `?kitmoves=stand` the base offers at a wall, the rider stands up, aims, takes a 4.2-4.5 m lip;
  B steps down; a lip at 4.6 m is refused; the flag off changes nothing; `PROTOCOL_VERSION` untouched (the train bumps).
- Flag: `stand`. Depends on: A1 (shared `teamMoves.ts`, `teamController.ts`, `flags.ts`; cut from A1's head). Runs in
  parallel with A2 (no shared file).

**B2 Shoulder stand, animation (Opus).** Research first (A9). `stand` in `TeamPoseMove`; base poses (offer at the wall,
take the step, rise with the legs, hold the shins, the press, the step-down) and rider poses (step thigh -> shoulders,
balance on top, aim stance on the shoulders, the press and the lip take, the step-down); `stacked` sub 1 / 2 in
`poseFromMoveState` (`moveState.ts:456-458`) and `teamPoseOfWire`; remote rider placed on the base's shoulders from
the link; tuner rows (`stand` in `TEAM_MOVES`); a studio pair (a wall station in `studioStage.ts` if the pair stage
has none).
- Files: `src/anim/clips/team.ts`, `src/player/moveState.ts`, `src/net/remoteAvatar.ts`, `src/anim/moveTune.ts`,
  `src/anim/studioPairs.ts`, `src/game/studioStage.ts`, `tests/teamPose.test.ts`, `changes/feature-coop-kit-b2.md`.
  Est. 900.
- Checks: as A2; character against character 3 cm or less (the rider's soles on the shoulders and palms).
- Done looks like: as A2, plus the rider's feet stay on the base's shoulders (1 cm) while the rider aims and turns.
- Flag: `stand`. Depends on: A2 and B1 (shared `team.ts`, `remoteAvatar.ts`; cut after both pass).

**A3 Holder steers the rope (Opus, S).** The design above (A7). Files: `src/game/teamMoves.ts`,
`src/game/teamController.ts`, `src/anim/clips/team.ts` (the holder's side step), `tests/ropeDescent.test.ts`,
`scripts/e2e-netmove.mjs`, `changes/feature-coop-kit-a3.md`. Est. 450. Checks: vitest; co-op group; look video
(short). Flag: `ropeSteer`. Depends on: B1 and B2 (shared files).

Order: A1 -> (A2 || B1) -> B2 -> A3. Briefs for A2 and B1 are written while A1 builds (full burn).

## Slices: part 2 (slice-brief depth)

Gate: Campaign's mission-engine kit (KIT0 registry `src/game/kit/registry.ts`, NET kit wire kinds through
`TEAM_KINDS`, `KIT_POSE_IDS` in `team.ts`) is on master; part 1 is merged. Then each move is one Opus slice (Plank
Bridge two) in its own new files: `src/game/kit/<move>.ts` (rule, timing, device), `src/anim/clips/kit/<move>.ts`
(both roles' poses, the SIGNOFF clips), `tests/kit/<move>.test.ts`; one look video each; two Opus checkers (wire
kinds); co-op group + `e2e-anim` + `e2e-studio`. A detailed PART-2 section (file:line on that master) is written when
the gate opens.

**K0 Kit ids (Sonnet, strict brief).** All five kinds in `KitKind` / `KIT_KINDS` / `KIT_SUB` (64 deadweight, 128
dropCatch, 256 chimneyPair, 512 swingPass, 1024 plankBridge) in `teamMoves.ts`, their pose ids and placeholders in
`KIT_POSE_IDS` (`team.ts`), `TEAM_MOVES` rows (`moveTune.ts`), so K1-K5 touch only their own files and run in parallel.
Est. 150. Flag ids reserved in `kitMoves`.

| Slice | Move (SIGNOFF row) | Roles and clips (SIGNOFF table) | Rule and device | Hooks owned elsewhere | Size |
| --- | --- | --- | --- | --- | --- |
| K1 | Deadweight: one hangs on a chain so a counterweighted grate lifts for the other | holder: chainGrab, chainHang, chainDrop; partner: walks or crawls under (Campaign's `crawlUnder` when it exists, else the crouch walk) | a kit device (chain point, grate opening, as the shutter's `KitDevices`); the grate is up only while the holder's weight is on the chain; `src/world/counterweightGrate.ts` | Guard AI: a lifted grate is noticed like the held shutter (R39) | S (0.5 day), est. 700 |
| K2 | Drop Catch: one drops from above a safe drop height into the partner's arms; silent landing | catcher: catchReady, catchTake; dropper: dropInto | catcher offers under an edge; the dropper's drop from above the hard-landing band (bands near `playerController.ts:327`) lands with no landing noise and no roll (A13) | none | S (0.5 day), est. 600 |
| K3 | Chimney Pair: back to back in a narrow shaft, climbing together | both: chimneyBrace, chimneyClimb | shaft found from two facing walls in a width band (real-world back-and-foot chimney width, researched); both braced, a shared climb speed, the top exits as a climb-up | Marlow: the shaft band and graph kind | M (1-1.5 days), est. 1,100 |
| K4 | Swing Pass: one braced on a pipe swings the partner across a shaft | anchor: swingAnchor; rider: swingRide, swingRelease | the anchor on a horizontal pipe (`pipeH`) facing the gap; the rider swings a pendulum arc and lands across within a gap band | Marlow: the gap band and graph kind | M (1 day), est. 1,000 |
| K5a | Plank Bridge, the carry: both lift and carry a scaffold board | both: plankLift, plankCarry | a plank prop and its pick-up points; the pair moves at the slower stick, host-authoritative plank pose on the wire | none | L part 1 (1 day), est. 1,200 |
| K5b | Plank Bridge, the lay and the cross | both: plankLay | a laid plank becomes a walkable collider and a nav link over a gap shorter than the board less the bearing; guards notice it (`src/world/plankBridge.ts`) | Guard AI: the noticed plank; Marlow: the gap band | L part 2 (1 day), est. 1,100 |

Order: K0 -> K1-K4 and K5a in parallel (own files) -> K5b. Flag ids `deadweight`, `dropCatch`, `chimneyPair`,
`swingPass`, `plankBridge`. Each PR carries its scale-sheet band row and its level-design 11.9 graph kind as doc lines
for Marlow Build's review (A12); Marlow's validator slice adds the kinds.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `kitMoves` id `descent` (`?kitmoves=descent`) | off | Night Shift \| Player Build | target 2026-10-28 | A1 + A2 on master, walk item accepted |
| `kitMoves` id `stand` | off | Night Shift \| Player Build | target 2026-10-29 | B1 + B2 on master, walk item accepted |
| `kitMoves` id `ropeSteer` | off | Night Shift \| Player Build | target 2026-10-30 | A3 on master, walk item accepted |
| `kitMoves` ids `deadweight`, `dropCatch`, `chimneyPair`, `swingPass`, `plankBridge` | off | Night Shift \| Player Build | 2-4 days after Campaign's kit PR lands | that move's slice on master, its walk item accepted |

Switch-on adds the id to the default set (one line in `flags.ts`). The walk cap (Player / animation at 3) holds switch-on
only; building goes on dark.

## Walk items
- Co-op lobby, Marlow Yard, `?kitmoves=descent` on both: at the A6 gallery rope spot, the partner beside the holder takes
  the rope down - accept when the drop over the edge and the descent look like a trained person on a held rope, both
  screens.
- Co-op, Marlow Yard A1 wall (4.4 m lip), `?kitmoves=stand`: the shoulder stand up, aim from the top, onto the lip; step
  down - accept when it reaches the lip, the rider's feet stay on the shoulders and both bodies match on both screens.
- `?kitmoves=ropeSteer`: the holder walks the rope a metre along the edge with the partner on it - accept when it reads
  as a held, moving rope.
- Part 2: one item per move, with its look video, once built.

## Risks and open questions
- Campaign's kit branch is 651 commits behind master and edits the same rail: whichever lands second resolves the
  conflict; the orchestrator orders (recommendation above). Part 2 cannot start before it lands.
- The rider kinematic on a remote base's avatar can jitter with the snapshot interpolation: the base is held still and
  the rider eases to the shoulder point (as `hangFollow`); B1's e2e measures it (10 cm netmove bar, 3 cm contact in B2).
- `stacked` is read by `partnerBlocker.ts:13` (no push between the pair) and `committedMoves.ts:47`: B1 confirms the
  pair is not pushed apart and that the rider cannot start committed moves on top.
- Guards: a rider at 3 m is a new silhouette above cover; G44's pitch factor applies unchanged. A walk note may ask for
  more; that is Guard AI's.
- Tests reading TEAM keys B1 deletes or changes: `tests/bunkerMap.test.ts:663` (`ladderFeet`, kept); the relay tests
  (unchanged, A5). B1 greps `scripts/` and `tests/` before the change.
- Look video tooling is not on master (R31 is J19's): A2 / B2 record with Playwright-core on the laptop GPU queue if J19's
  recorder has not landed.
- Scale sheet line 56 calls the relay's feet height a lip height (A5): reported to Marlow Build.
- For the orchestrator, not Michael: fold Campaign's `coopKit` into `kitMoves` or keep both (A8); fix mission-engine
  PLAN row 106 (A1).
