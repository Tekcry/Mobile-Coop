# player-hygiene: brief
Owner: Night Shift | Player Build. Status: current.

Lead: Night Shift | Player Build. Started: 2026-10-25 ~17:30. Base: master 2148ec969 (train 95, #431).
FOLDED-PLAN J6, the Player's part (`origin/feature/menu:docs/orchestrator/FOLDED-PLAN.md` section 4, breaks 6, 7, 9).
Gap rows: `docs/conformance-player/CONFORMANCE.md` 1a H1-H5, H10 and 1c S3 (comment), S6 (link), S9.

## Michael said
- 2026-10-25 (G355, quoted in CONFORMANCE.md): "All current maps/features should be revised once documentation work
  has been completed"
- 2026-10-25 ~16:50, Q39 (partner animation over the network): "yes players must look exact in everyones games"

## Michael picked
- 2026-10-25 ~17:00 Q: "Sign off the folded plan" -> picked: "Sign off, start (Recommended)" (ROADMAP Decided).
- 2026-10-25 ~16:50 Q33 "Touch in game?" -> picked: "Keep as exception (Recommended)" (ROADMAP Decided; the
  FOLDED-PLAN row reads "Keep menu taps and touch look as a recorded exception").

## Goal
The player's own per-frame code (movement step, pad reading, takedown search, body pick-up, selection wheel, the
partner's drawn body and the team moves) makes no throwaway data each frame, so nothing in it can cause garbage-collector
stutter, and the game plays exactly as it does today. The developer Operator Lab uses the allowed length maths. A few
code comments that state wrong facts are corrected.

## Limits
- Out of scope: `src/ai` allocations (Guard AI, CONFORMANCE G D1 D2); `src/world/maps/campusS4Dress.ts:176`
  `Math.hypot` (Sector Ops); Babylon / Havok internals (see A2); allocations in modules the rows do not name (A3).
- H1 touch: no code change (Q33). This BRIEF records the pick; the orchestrator folds it into DECISIONS as a G182 /
  G232 exception at the merge (J2). What stays: `src/input/touchLook.ts` (drag to look in play),
  `src/input/inputManager.ts:9`, `:35-40`, `:107` and `src/styles.css:4963-4966` (the touch pause button).
- Rules that hold: CLAUDE.md hot paths (`hyp2` / `hyp3`, no closures, iterators or temporary vectors), `src/net` only
  through `import()` behind `flags.coop`, G355 (rule fixes to shipped features ship as fixes, no flag), G181 (no time
  slow), G22 (Menu / Start or Esc cancels a capture), G308 (Sector Ops up to 4, Marlow Yard 2), Q39 (the partner looks
  exactly as on the owner's screen).
- Areas touched and their unwalked count: Player / animation, no new feature (nothing to walk; ROADMAP "Waiting on
  Michael" keeps the count).

## Answers (M) and assumptions (A)
- M1 2026-10-25: Q33 touch kept as a recorded exception (above).
- A1: "Zero allocation" is proved per call with `tests/helpers/allocPerCall.ts` `bytesPerCall`: a reading at or under
  `HEAP_NUMBER` (16 B, a V8 boxed double at a non-inlined call) passes; any object or closure reads 48 B or more and
  fails. Undo: tighten the goals to 0 in the tests.
- A2: Babylon / Havok library internals are outside the claim: `PhysicsCharacterController.checkSupportToRef` /
  `integrate` and `HavokPlugin.raycastToRef` allocate inside Babylon 9.29.0, and `navigator.getGamepads()` returns a
  fresh array in the browser. The job removes every allocation in our code around them (the player step uses the
  `...ToRef` forms) and the tests swap those calls for no-allocation stubs so the reading is our code's. Undo: none
  (upstream code).
- A3: Allocations the rows do not name stay for J21 (Perf, "Player (allocators)"): `nearestInReach` / `closestOn` in
  `src/world/anchors.ts:785-815` (the window probe every 0.2 s, attach probes), `findJumpTarget` (team leg-up target),
  `AttachController` probes. A slice that finds one on its measured path lists it in its report and in STATE; it fixes
  it only inside its own claimed files. Undo: widen a slice's claims.
- A4: Behaviour is bit-identical except H5: `Math.hypot` and `Math.sqrt(x*x + y*y + z*z)` may differ in the last bit,
  so the Operator Lab's retarget (a developer tool; the shipped runtime `src/operators/runtime/pose.ts:95` already uses
  `Math.sqrt`) can move by ~1e-16. Undo: revert `src/operators/lab/retarget.ts:21-28`.
- A5: The `src/net/protocol.ts:38` comment fix stays with the H10 slice (S5): any file under `src/net/` is a wire path
  for the train (`scripts/merge-train.mjs:325-338` `wirePaths` / `touchesWire`, file-level, no content check), so a
  comment-only protocol.ts change bumps `PROTOCOL_VERSION`. Open PR #317 (coop4, FOLDED J4) rewrites the same comment;
  if #317 has merged when S5 builds, S5 leaves protocol.ts alone. Undo: n/a.
- A6: `src/weapons/drawState.ts:20`, `:30` already link `docs/archive/anim-natural/n3/DRAW-TIMES.md` on master: no
  change. `src/game/gameState.ts:2869` and `src/net/remoteAvatar.ts:669` (EDGE_HAND_TIME, `WALL_SUB.leftHand`) describe
  the live left-edge hand switch (`src/player/handSwitch.ts:10`, `src/player/wallController.ts:154`): kept.
  `AnimGraph.leanOut` (`src/anim/animGraph.ts:783`) is read by `scripts/e2e-clip.mjs:57`, `:62`, `:70`: kept. Undo: n/a.
- A7: Bare clip-doc names without a folder (`MT2-ALLOC.md`, `MT2-CROUCH.md`, `MT2-FIXB.md`, `MT2-SPRINT.md` in
  `src/anim/animGraph.ts:2091` and tests) stay as written; only `docs/...` paths to moved files change. Undo: n/a.
- A8: The comment fixes found beside the rows ride S5 / S6 as stale-fact hygiene: `controlsScreen.ts:59` (G22),
  `characterRig.ts:2901` (M20), `remoteAvatar.ts:158-159` (the reference-game term), the J1 doc paths. Undo: drop the
  comment lines from the slice.
- A9: S2 is Opus, not Sonnet (plan check 2026-10-25: a runtime input hot-path rewrite). Undo: n/a.

## Questions for Michael (one click each, asked by day)
- none.

## Sign-off needed
no (no map, layout or look change).
