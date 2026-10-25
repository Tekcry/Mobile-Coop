# anim-studio PR 2 - implementer report (2026-10-21)

Brief: Michael (via the orchestrator): "I also want to be able to fine tune coop animations with the same freedom,
traversal etc. coop should show me both characters also so I can fine tune." Prototype quality.

## What was built
**1. Two-character co-op pairs**
- **Team moves that exist** (in `src/game`): leg-up (`boost`), ledge relay (`ladder` on the wire), partner throw,
  hang-down, two-person rope, the co-op revive (an interact hold on a downed partner).
- **Not in the game:** "back-to-back" and "two-person lift" are only reserved names in `committedMoves.ts`; no pair
  was invented for them.
- **Each pair is a loop on one clock:** approach, the move with the game's own paths and timing, a hold, a short rest.
  `anim/studioPairs.ts` is pure: `pairPose(move, t, ...)` writes role A and role B from the same `t`, using the game's
  own path functions and timing (`game/teamMoves.ts`, `TEAM`, `hangPoint`).
- **Two Wren puppets** (`operatorRig`: local rigs with Wren's figure, no network). Wren is hidden and moved back so the
  camera frames the team block.
- **Play controls:** Play / Pause, scrub, key steps (one 30 fps frame) and speed move both rigs at once.
- **Guard pairs:** `pair:hold_idle` (with `held_hands`), `pair:hold_back` (with `held_stumble`), `pair:hold_choke`
  (with `choke_sag`), `pair:hold_knife` (with `knife_collapse`). Both drives are held to the pair's phase
  (`StudioDrive.held`). The Body hold gap / side set the spacing.

**Role sections** (`anim/moveTune.ts`, through the registry)
- **Co-op sections:** one per move (`team_boost`, `team_relay`, `team_throw`, `team_hang`, `team_rope`,
  `team_revive`), each with groups `team.<move>.a`, `.b` and `.contact`.
- **Role sliders:** body forward / up / right (visual root), body turn, whole-body lean, crouch depth, hand and foot
  grip offsets, pose timing (one-shot roles only).
- **Contact sliders:** A forward / up / right, in role A's own frame, weighted by the move's contact window
  (`teamContactK`).
- **Traversal moves section (`trav`):** vault, mantle, step, climb-up, window, rappel, drop, hop, roll, wall kick,
  split. Ladder, pipe, ledge, hang, vent and crawl reuse the existing Body section values.
- Every default is identity (tested).

**3. Live in real play**
- `GameState` writes `MOVE_TUNE_TEAM` each frame from `TeamController.state` (plus `partT`), or 'revive' while holding
  a partner's revive.
- `Player.frameUpdate` selects and applies the sections around `rig.animate`, so only the local player's own role is
  tuned. `RemoteAvatar` never reads them. Nothing goes on the wire. Visual only: paths, timing and the capsule are
  unchanged.
- Each co-op section's panel note says that live values apply to YOUR role only and the partner plays the shared
  defaults until an export is folded into the code.

**2. Traversal rig** (real builder pieces and anchors; sizes in `anim/studioProps.ts`)

| Prop | Size / placement |
| --- | --- |
| Team block | 6 x 3 m, 4.4 m lip, rappel point at its east end |
| Ledge wall | 2.4 m lip |
| Low wall | 1.0 m high, 0.3 m thick |
| Platform | 3 m, ladder (0.5 m wide) and drainpipe on its east face; the south face is the back-to-wall wall |
| Horizontal pipe | 2.5 m up, between posts |
| Hang bar | 2.3 m up |
| Vent | 1.0 x 1.1 m crawl duct through a block, grates at both ends |
| Window | 1.2 x 1.2 m, 0.9 m sill, open |
| Door | 1.2 x 2.1 m |

- The studio room is now 28 m with 7 lamps.
- **11 traversal loops** (`anim/studioTraversal.ts`, pure `travTick`: reset, settle, walk in, scripted steps, reset):
  vault, ledge grab / shimmy / climb, ladder, drainpipe, pipe hand over hand, hang bar, vent crawl, window vault, door,
  rappel, back to wall.
- They press the game's own actions on the studio's `InputState`. Reset is `GameState.studioTeleport`, which leaves
  any anchor, wall or door move first.

## Controls
- **Pad:** pairs and loops are loop-list entries. A pair takes scrub and key steps; a traversal loop does not (it is
  the game's physics). LB / RB reach the Co-op and Traversal sections; on a Co-op section LT / RT switches role A /
  role B / contact. The pad map in `docs/anim-tuner/STATE.md` is extended.
- **K&M:** the mouse works every control.

## Files
- **New:** `src/anim/moveTune.ts`, `studioPairs.ts`, `studioTraversal.ts`, `studioProps.ts`;
  `tests/animStudio2.test.ts`.
- **Changed:**
  - `src/anim/studio.ts`, `studioDrive.ts`
  - `src/game/studioStage.ts`, `gameState.ts` (`MOVE_TUNE_TEAM`, `studioTeleport`, door hook), `teamController.ts`
    (`partT`)
  - `src/player/player.ts`
  - `src/ui/studioPanel.ts`, `animTunePanel.ts`
  - `src/world/maps/studio.ts`
  - `scripts/e2e-studio.mjs`, `run-e2e.mjs`
- **Docs:** CHANGELOG, TESTING, `docs/systems/ui.md`, `coop.md`, `testing-tools.md`, `docs/anim-tuner/STATE.md`.

## Assumed decisions (undo)
- **A1** Both roles are puppets; Wren is hidden 6.5 m out as the camera anchor. Undo: `showPuppets` / `hideWren` /
  `PAIR_VIEW`.
- **A2** Contact offsets move role A only, weighted by the contact window. Undo: `moveTuneRoot`, `teamContactK`.
- **A3** Move sections are not eased. Undo: `tuneSectionEase` for the local player.
- **A4** Revive role B (downed) shows in the studio only. Undo: drop `team.revive.b`.
- **A5** The panel follows role A while a pair plays. Undo: `pairFrame`.
- **A6** The hold-pair guard stumble uses 0.8 of Wren's pace. Undo: `configure` (`g.pace`).
- **A7** Section 12 was not edited. The traversal sizes rely on code facts it does not list (vault at most 1.25 m high
  and 1.0 m deep; grab reach 2.7 m); they are checked in tests instead, since the standard changes only with Michael's
  approval. Undo: add the line to Section 12.1.
- **A8** The door loop calls `startDoorOpen` directly. Undo: `TravCall` / `doorOpen` host hook.
- **A9** The window is open; vent grates stay open after the first loop. Undo: `windowAt` `open`.
- **A10** The studio room grew from 16 m to 28 m and has 7 lamps. Undo: `STUDIO_SIZE`, map lights.

## Tests
- **`tests/animStudio2.test.ts`, 20 tests:**
  - Sections and identity defaults; the note wording.
  - The role mapping; contact maths.
  - One-clock pairs, pair clock and key step; held hold-pair drives.
  - The pairs' team states; the loop list; the traversal state machine.
  - Prop sizes against the game's traversal numbers; the built map's anchors.
- **`scripts/e2e-studio.mjs`:** `pair:boost` (two operators, one clock, a key step moves both), `trav:ladder` (reaches
  the ladder attach state), `state:idle` (back in the middle).
- **Implementer's checks:** tsc clean, eslint clean, 288 vitest tests in 22 files pass.

## What Michael should try
1. Anim Studio, "pair: leg-up". Pause and step through the toss. In "Co-op: leg-up", raise A's body and watch only A
   move. Move a contact slider and watch it act only while the foot is in the hands.
2. The relay, throw, hang-down, rope and revive pairs, then "pair: hold_choke + guard_choke_sag".
3. "traversal: ladder up and over the top" and the other ten loops. Tune with the section named in the readout.
4. In a real co-op session, tuned values show on your own body only; your partner sees the defaults.

## Polish list
- Every traversal input script is unverified in a browser. The ledge shimmy, vent crawl length, rappel and wall loops
  may need timing.
- The puppets' hang poses use simple lip / rope targets, not `AttachGrips`.
- Mouse look during a traversal loop turns the loop's stick; use the free view.
- The readout line is long.
- `e2e-times.json` has no `e2e-studio` timing yet.
