# Mixamo kit plan - independent check (Opus 5.5, read-only)
Owner: Marlow Build. Status: current. Checked 2026-10-26 against origin/feature/mission-engine 231bdbfbf,
origin/feature/mixamo-i3 b932d0311, origin/feature/mixamo-on 9433a960c, origin/master 7df39dc60. Includes the two lead
updates (Player Build's terms; Campaign Build's answers).

## 1. Intent and the toggle rule - met
- The four rows go in true, but `resolveKit` gates each on `MIXAMO.on && MIXAMO_ON[slug]`, and `MIXAMO.on` is false by
  default (`mixamo.ts:122` on i3). So nothing is on by default. Under Hand-made and CMU the kit plays today's placeholder.
- The off path is designed bit-identical (`WREN_KIT.any && wrenReady` gate, weight 0 writes nothing). The tests do not
  yet prove it at the right level (item 5).
- Mapping, Wren only, rows at the end of the table, no toggle reads: all match the orchestrator scope and Player's API.

## 2. Files another lead owns
| File | Owner | Plan says so? |
| --- | --- | --- |
| src/player/characterRig.ts | Player | Yes (section 5.1). Now agreed for the lines :2013 / :2422 / :2610 / :2949 only |
| src/anim/animGraph.ts | Player | Yes. But the plan's edit set is bigger than Player's term "ONE block after stanceShot" (item 2) |
| src/anim/mixamo.ts | Player | Yes (rows at the end only) |
| src/anim/clips/team.ts | Player's file (anim-n4b), with Campaign's KIT0 branches | Only as "no Campaign edit claimed". Player's yes for team.ts is not recorded |
| src/anim/studio.ts | Player | Not flagged |
| src/net/coopHost.ts, src/game/takedownController.ts | Campaign / Player | Not flagged. The base merge conflicts in both (item 1) |
- Every path on Campaign's no-touch list is respected by the slice's own edits. The base merge is the exception (item 1).

## 3. Both screens match, given the per-machine toggle (Q39)
- Settled for tonight. Player logged an assumption: each viewer draws a partner in their own source, with no wire
  field. Undo: send the owner's source through src/net. That is a later job for Player Build with Campaign Build, since
  src/net is on hold tonight. The plan must carry this as an A entry and put it in the PR body (item 9).
- With both players on the same source, the design is mostly sound. There are four gaps:
  - The hang skip is keyed on the phase. On the holder's page the remote partner's jump and hang arrive as kit `''`
    (ph 0), so the remote partner still plays the Mixamo hanging idle (item 4).
  - The crawl rate cap turns the crawl's distance clock back into a time clock (item 6).
  - On the remote page the shutter's `holdGap` is undefined, and the gap-trend rule has no rule for frames where the
    gap does not change (item 7).
  - A3: the hold loop runs on each page's own clock. Accepted.

## 4. Clock and phase mapping against the code - verified
All checked and correct:
- team.ts on mission-engine: 355, 418-428, 442, 448, 492, 495-511, 513-528, poseB 654-707.
- `kitPoseK` registry.ts:255; `kitPose` teamController.ts:388-398; shutter `gap` :793 and `wireS` :789.
- `teamPoseFrame` gameState.ts:3129-3146 (it passes `tm.partT`; the kit uses `KIT_POSE_LOCAL.k`).
- player.ts:565, remoteAvatar.ts:813-814, localMoveState.ts:36-44, moveState.ts:446-458.
- On i3: characterRig.ts :747, :2013, :2422, :2610, :2949; animGraph.ts 1950-1988, stanceShot :2257, `mxLast` :1299,
  `mixamoTrav` :3014.

The times also match the code:
- pullUp.ts `times` (:269): pullCatch = catchClose, pullHaul = haul + scramble, pullJump = landT, pullHang = haul,
  pullScramble = scramble.
- The partner's page normalises the holder by the local climber's own phase, as the plan says.
- On the holder's page the remote partner's `k` is overwritten by `TEAM_LINK.k` (team.ts:520). The plan correctly
  takes the scramble from `ph` / `traverseT` instead.
- `ph` is 0 through the jump and the hang (localMoveState:44). So the remote pullJump / pullHang can only be `''`, and
  that is what causes item 4.
- The rig gate at :2422 also drives the pelvis offsets (`pex` :2426). The plan's "pelvis untouched" therefore needs a
  separate weight (item 3).
- TeamPoser.begin returns early when `w <= 0`, and does nothing for kit role A today (team.ts:634-650). The new
  `graph.kit` write must also clear on those paths, or a stale shot stays (item 5).

## 5. Base branch, stacking, size
- BLOCKER: the stated base cannot be built as briefed. `git merge-tree origin/feature/mission-engine
  origin/feature/mixamo-i3` conflicts in three files:
  - src/net/coopHost.ts:18 (protocol import: `markIntel` on i3 vs `UseOnlyGadget` on the engine);
  - src/game/takedownController.ts:476 (the interrogation feed line vs the engine's `e.id` argument);
  - docs/systems/coop.md (two hunks).
- Why: i3 carries master as of about 179 commits ago, and mission-engine is 1013 commits behind master. The plan says
  "Expected conflicts: none in src", and the brief says to stop on any src conflict, so the builder stops at step 0.
  coopHost.ts is on Campaign's no-touch list. Campaign answered "build on the stacked base", which needs a resolution
  someone is allowed to make (item 1).
- Even resolved, master-side changes may still break the build where no text conflicted. No check after the merge is
  briefed (item 1).
- mission-engine itself also conflicts with master (sectorMode.ts, takedownController.ts, coopHost.ts). That is
  Campaign's to fix when it goes to master, not this slice's.
- Size: about 1.2k lines for the slice is honest, and the 420-line test file is the bulk. But a PR to master measures
  the engine plus the stack (17.6k+ lines), so the `pr-size` check fails. Per Campaign (b) the slice reaches master
  through mission-engine, so this PR is a draft holding statuses, and its size is measured from the merge commit
  (item 8).
- mixamo-on is i2 plus one commit and has no i3. When Player pushes the toggle, merge it in (no rebase or force push on
  a pushed branch with merges). The `MIXAMO_ON` tails should not conflict: kit rows go after the I3 rows, and Player
  adds a function, not rows.

## 6. Tests and e2e
- (a) compares graph targets only. Player's term (1) and the characterRig gates need more:
  - every `RigTargets` field, the pose and the rig's bone transforms, as float64 bits, per mixamoStance (a);
  - TeamPoser's rig writes (reach and plant targets, root, `RigPose`) identical when the shot is off;
  - "Mixamo source, kit rows on, but no kit role" bit-identical over the hand-made team moves that share 'brace' /
    'climbUp' (leg-up, throw, hang-down, rope) and plain locomotion. This is the likeliest regression and it is
    missing (item 5).
- Missing: a remote-page test for the hang skip (item 4); a stale `graph.kit` test after a move ends or aborts; a
  mid-move source flip with no pop in (f) (item 2).
- e2e: no suite runs the kit under the Mixamo source; the look video covers it. The kit's own co-op e2e is
  `e2e-sectorops:wharf-tgc` / `:wharf-tkl` (scripts/e2e-sectorops-wharf.mjs, `coopkit=1`, the pull; shutters SKIP)
  and is not named. `--affected origin/master --list` on this branch lists everything in the engine and the stack, so
  it is no use as a selector (item 10). e2e-coop + e2e-netmove are listed (Player term 3).

## 7. Builder brief
Strict on ownership, no allocation and commits. It needs these changes:
- the merge resolution and a gate after the merge;
- the animGraph scope cut to Player's one block, with the hang skip in its own commit and "(mixamo-kit)" comments;
- the four agreed characterRig lines named, plus the pelvis split;
- the `graph.kit` clear rule;
- the Done line per Campaign (b): draft PR, not for the train;
- the PR body items: catch reach, Q39 A entry, A1-A4, stub swap line;
- the e2e list.
Details in the list below.

Non-blocking notes (polish list):
- `KIT_SHOT` in the tuner bag is "if one entry, else slice 2". Decide it in the brief.
- The four clip modules are about 258 KB of source, newly reachable from team.ts. Have the builder report the main
  chunk size change from `npm run build` in the PR.
- "Above `SHUTTER.crawlBody` 0.75" (plan 2) is worded backwards for a prone body (the back is well under 0.75). It is
  harmless but should be reworded.

VERDICT: FIX

1. **Base merge conflicts in src.** Where: plan 3 "Base branch" ("Expected conflicts: none in src") and brief lines
   250-252. What is wrong: `mission-engine x mixamo-i3` conflicts in src/net/coopHost.ts:18,
   src/game/takedownController.ts:476 and docs/systems/coop.md, so the builder stops at step 0. coopHost.ts is
   Campaign's no-touch file. Done looks like:
   - Campaign Build either resolves the merge itself (a `feature/mixamo-kit` base it pushes) or OKs in writing the exact
     resolution the brief then spells out: coopHost import = union of both lists (`markIntel` and `UseOnlyGadget`);
     takedownController = i3's `} else if (!g.puppet) g.hud.feedItem(...)` line plus the engine's
     `revealIntel(g, e.pos, info, e.id)` and its comment; coop.md keeps both texts.
   - After the merge commit, before any slice work, the brief runs `npm run typecheck:fast` and
     `npx vitest run tests/kitNet.test.ts tests/kit tests/teamPose.test.ts tests/mixamoStance.test.ts tests/mixamoTraverse.test.ts`,
     and stops and reports on any failure.
   - The plan text is corrected.
2. **animGraph edits exceed Player's term (2).** Where: plan 2 "What the shot writes" / "Weight", plan 4 claims row
   animGraph, brief step 4. What is wrong: two call sites and the `mxLast` inertialize trigger edit (:1299, inside
   Player's traverse block) go beyond "ONE block after stanceShot". Done looks like:
   - The brief allows only: (a) additive declarations (the public `kit` field, `RigTargets.keyShot` and its default),
     listed as such for Player; (b) one `(mixamo-kit)` block straight after the stanceShot call (about :2020) that
     handles both the traverse case (holder / climber: `o.keyed` + `o.keyShot`) and the crawler mix; (c) the hang skip
     (item 4) in its own commit.
   - No trigger edit. `kitShot` eases its own weight over `KIT_SHOT.flip`, holding the last clip, when the shot starts,
     ends or the table swaps mid-move.
   - Test (f) adds a mid-move source flip (on -> off -> on) under the pop limits.
   - Every hunk is commented "(mixamo-kit)".
3. **characterRig gate scope and pelvis.** Where: plan 4 row characterRig, brief step 5. What is wrong: the brief
   still waits for Player's yes and names three gates. The :2422 `kw` also drives the pelvis offsets (:2426), which the
   plan says stay procedural. Done looks like:
   - Step 5 says agreed, and limits edits to :2013 (only if needed), :2422, :2610 and :2949.
   - A separate weight keeps the pelvis on the old `kw`, and the shot's `keyShot` weight goes to trunk and arms only.
   - Nothing else in src/player changes.
4. **The hang skip misses the remote partner.** Where: plan 2 "Existing interplay bug" and "How the clock reaches the
   pose" (boost + PULL_SUB `ph > 0` -> pullScramble, else `''`). What is wrong: on the holder's page the remote
   partner's jump and hang are kit `''`, so `mixamoTrav`'s hang branch still plays the hanging idle there while the
   local page shows the hand-made HANG. The screens differ under the Mixamo source. Done looks like:
   - The skip keys on "kit move, role a" (`move` pull, `role` a), which TeamPoser writes whatever the phase, not on the
     phase id.
   - Test (e) covers both the local `pullHang` and the remote avatar (`teamPoseOfWire` boost + 8, ph 0).
   - It goes in its own commit (Player term 4).
5. **Off-path proof and stale state.** Where: plan 4 test (a), plan 2 "Fallback", team.ts TeamPoser.begin early return
   (:634-639). Done looks like:
   - (a) compares, as float64 bits every frame, every `RigTargets` field, the pose and the rig bones (headless Wren
     rig, per mixamoStance (a)), plus TeamPoser's reach / plant / root / `RigPose` writes. It covers hand, CMU, Mixamo
     with kit rows false, and after on -> off.
   - A new (a2) covers the Mixamo source with kit rows true over the non-kit moves that share 'brace' / 'climbUp' (leg-up
     both roles, throw, hang-down, rope) and locomotion: bit-identical.
   - The bar / wrist hand targets are written only when the shot weight > 0.
   - `graph.kit` weight is zeroed on every `begin` path (including `w <= 0` and non-kit roles) and in `end`, with a test
     after a pull ends, aborts (partner gone) and misses.
6. **The crawl clock breaks the both-screens claim.** Where: plan 2 "Crawl rate", table row crawlUnder. What is wrong:
   at 0.85 m/s against a 0.46 m/s cap, the capped clock is time since each page saw the crawl start, not a function of
   distance. Done looks like either:
   - phase = distance / (0.54 m x hk x `KIT_SHOT.crawlStretch`), a fixed stretch (about 1.85, which gives the same 2x
     playback), so it stays a pure function of distance; or
   - the per-page offset is logged as assumption A6.
   Either way, distance resets when the crawl starts (the local state change; on the remote page the SHUTTER_SUB boost
   rising edge), and test (c) feeds both pages the same path.
7. **Shutter phase from the gap is under-specified.** Where: plan 2 table rows shutterLift / shutterHold and "How the
   clock reaches the pose". What is wrong: the remote page has no `holdGap`; device `holdGap = min(spec.holdGap ?? 0.9,
   height)`. The rising / falling trend has no rule for frames where the gap does not change: the wire `s` is stepwise
   and the fixed step is not the render frame. Done looks like:
   - g uses `SHUTTER.holdGap` (imported read-only), and "hold" is gap >= `SHUTTER.crawlGap` and not falling.
   - A frame with an unchanged gap keeps the last phase.
   - Test (c) feeds a stepwise 20 Hz `s` to the remote page and a 60 Hz gap to the local one: same phase, clip time
     within one wire step.
8. **Merge path and Done per Campaign (b).** Where: plan 3 "Merge" and brief "Done". What is wrong: the plan has a PR to
   master going train-ready, and an "overnight Campaign carries the stack" option that Campaign has now declined.
   Done looks like:
   - Build on the stacked base now. The PR is a draft to master marked "not for the train: Campaign Build merges
     feature/mixamo-kit into feature/mission-engine after #477 and mixamo-i3 are released on master".
   - The slice size is reported as `git diff --stat <merge commit>..HEAD`, under 1.5k lines.
   - Player's feature/mixamo-on head is taken by merge (no rebase or force push), with the stub swap in the same commit.
9. **PR body and assumptions are missing tonight's answers.** Where: plan 5 "Must agree" and Assumptions, brief "Done
   ... report". Done looks like:
   - Plan 5.1-5.4 are marked settled (Player's terms, Campaign (a)/(b), Q39).
   - Add A5: "a partner is drawn in the viewer's own source; no wire field; undo = send the owner's source via src/net
     (later job, Player with Campaign)". Add A6 if item 6 takes the log route.
   - The PR body lists "catch reach vs kneeling clip" (`PULL.catchDrop` 1.8 m kept) as a Michael tuning item, plus
     A1-A6, the rows on / off with their readings, and the stub swap line.
10. **e2e set.** Where: plan 4 "Laptop e2e" and brief Done. What is wrong: the kit's own co-op suite is not named, and
    `--affected origin/master --list` on this branch selects the whole engine and stack. Done looks like the request on
    the PR head:
    `--suites "e2e-coop e2e-netmove e2e-anim e2e-traverse e2e-studio anim-audit e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl"`
    (e2e-coop + e2e-netmove required by Player term 3), with the `--list` step dropped, and the look video recorded
    under the Mixamo source on both screens.
