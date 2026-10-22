# anim-natural N3b - state

Branch `feature/anim-n3b` (from master 4.53.0, 5220f79c). Nothing committed by the implementer (the job lead commits).

## Now
All three tasks built, tsc clean, eslint clean (changed files), the related test files pass. Not done: GPU sheets
(`wall-block`, `fire-rifle`, `fire-pistol`) and e2e (desktop lock); docs/design-bible.md does not describe the deleted moves
(not changed). docs/marlow-bays/COVERAGE.md rows 70 / 72 still list the deleted moves (history, left as is).

## Done (2026-10-22)
1. **Slide and doorway sweep deleted** (Michael: "Delete them"). `animGraph.ts`: the `slide` lower state, the `SLIDE` clip
   use, `AnimInput.slide` / `check`, the check sweep (head yaw, weapon yaw), `rowW.slide`; `clips/actions.ts` `SLIDE`;
   `characterRig.ts` RigPose `slide` / `check`; `player.ts` PlayerPose fields; `menuPoses.ts`; `tuneMoveRows.ts` the `slide`
   action row; `scripts/anim-audit.mjs` LOWER list. Kept: foot slide (`step.slide`, audit limits), wall slide, editor
   slide doors, the guards' AI doorway pause.
   Old tuner data: the registry kept unknown groups (`joint.slide` ...) as "pending" forever; now `isRemovedTuneGroup`
   (`tuneMoveRows.ts`) drops them in `tuneLoad` / `tuneImport` (`tuneRegistry.ts`). Test: a literal old export and save.
2. **Body recoil** (PASS2 row 25). Cause: the graph's recoil was the CT prototype G2 "no visible flip" values (0.015 m, 0.02 rad)
   on a spring that follows the kick envelope; the rig's sight-to-eye hold cancelled the rest. New `src/anim/recoil.ts`
   (`BodyRecoil`: a per-shot impulse on two critically damped springs, gun 28 rad/s, trunk 22 rad/s; rifle / pistol
   amounts `WREN_RECOIL_RIFLE` / `WREN_RECOIL_PISTOL`, blended by the pistol weight). Wren rigs only (`graph.wrenReady`:
   local player and co-op partner, the partner from its firing flag's kick, no wire change); guards keep `RECOIL`.
   The sight is let rise with the kick (`RECOIL_SIGHT_ARM`, via `out.sightDrop`). Tuner: Gun `recoilMul` (aim states,
   identity 1) + bake rule (`tuneBakeTable.ts`). Aim, reticle, camera untouched (the shot ray starts at the visual
   muzzle as before but points at the camera's aim point).
3. **Wall block** (PASS2 row 24). Cause: the CT prototype G6 design (`WALL_BLOCK.pitch` 1.2 rad muzzle UP, 0.15 m back) on a linear
   rate-limited follow of a continuous distance ramp, so the gun stopped part-way while walking in and then held 69 deg
   muzzle-up. Now: hysteresis (on 0.35 / off 0.1), one smoothstep move of 0.4 s each way, no weld, the muzzle tipped
   1.15 rad below the aim line (capped at 1.13 rad below level, at least 0.35 under the aim) about the butt (0.33 m
   behind the grip; pistol 0.08), pulled 0.06 m (pistol 0.15), canted 0.1 rad.

## Numbers (vitest rig, NullEngine; before = HEAD graph on the same test)
| | before | after |
| --- | --- | --- |
| Rifle shot: grip back / wrist / muzzle rise / chest | 0.8 cm / 0.9 cm / 0.5 deg / 0.3 deg | 2.8 cm / 3.0 cm / 1.1 deg / 1.5 deg (1.0 cm up) |
| Pistol shot: grip back / up / flip / wrist | - | 0.8 cm / 1.8 cm / 3.6 deg / 1.8 cm |
| Settled after 0.3 s (rifle) | - | grip 0.4 mm, chest 0.04 deg |
| Wall block, aimed level: bore vs aim line | +68.8 deg (muzzle up) | -64.7 deg held, never above (max -0.1) |
| Still run (< 0.1 m/s) inside the move | 6 frames | 0 |
| Largest grip frame (body frame) | 2.4 cm | 3.3 cm (under 3.5) |
| Muzzle ahead of the root when held (wall 0.3 m) | 0.31 m (up) | 0.25 m |

## Assumed decisions (undo)
- A1 Recoil bigger than CT prototype G2's "< 0.5 deg" (PASS2 asked for a believable kick). Undo: Gun `recoilMul` 0, or
  `WREN_RECOIL_*` amounts to 0 (then `RECOIL` applies to guards only; to give Wren `RECOIL` again drop the
  `wrenReady` branch in animGraph's weapon layer).
- A2 (ANSWERED, Michael "Muzzle down") Wall block muzzle down, not CT's muzzle up (CT prototype G6, AUDIT-WALLS row 12, 051917 @ 10.9-12.3) (the job lead's spec). Undo: `WALL_BLOCK` tip sign and the old
  `pitch` / `pull` values (git history of animGraph.ts, 4.53.0).
- A3 Recoil is Wren only (brief: guards unchanged).

## Files
`src/anim/animGraph.ts` (CT Core: import of `BodyRecoil`, `LOWER_STATES`, AnimInput / defaultInput / pickLower / weights /
fade, the slide clip block, the check sweep, `RECOIL` doc line, `WALL_BLOCK` + its doc, fields `blockOn` / `bodyRecoil`, the
weapon-layer recoil branch, the block move and offsets, `writeRowW`), `src/anim/tuneBakeTable.ts` (CT Core: one added
block after the `glideTwistMul` rule: `RECOIL_FILE`, `RECOIL_AMOUNTS`, two `recoilMul` rules), `src/anim/recoil.ts` (new),
`src/anim/tune.ts` (`recoilMul`), `src/anim/tuneMoveRows.ts`, `src/anim/tuneRegistry.ts`, `src/anim/clips/actions.ts`,
`src/player/characterRig.ts` (RigPose fields and two input lines only), `src/player/player.ts`, `src/world/menuPoses.ts`,
`src/ui/tunerLayout.ts`, `src/ui/tunerTarget.ts`, `scripts/anim-audit.mjs`, tests `animN3b.test.ts` (new),
`animMoveRows.test.ts`, `rig.test.ts`; docs CHANGELOG, `docs/systems/movement.md`, `docs/systems/combat.md`.

## Next / open
- **A2 answered (Michael, 2026-10-22 ~16:20, via the orchestrator): "Muzzle down".** Kept; goes into DECISIONS at the merge
  (wall block tips the muzzle down, replacing CT prototype G6 muzzle up).
- GPU sheets on the desktop: `wall-block`, `fire-rifle`, `fire-pistol` before / after for Michael.
- e2e: `e2e-anim`, `e2e-wall` / `e2e-stealth-ai` (wall aim), `e2e-coop` (partner recoil) on the laptop runner.
- Polish list: pistol back kick is small (0.8 cm, the locked arms); the block release while walking back peaks at
  3.3 cm / frame; aimed down the held muzzle is 65 deg below level (cap) and 0.39 m ahead.

## Resume prompt
```
Resume anim-natural N3b on feature/anim-n3b (C:/NightShift/Mobile-Coop-anim-n3b). Read docs/anim-natural/n3b/STATE.md.
Built: slide / doorway sweep deleted, Wren per-shot recoil (src/anim/recoil.ts), wall block muzzle-down. Next: GPU
sheets wall-block / fire-rifle / fire-pistol, then e2e-anim, e2e-wall, e2e-coop; then the PR.
```

## Fresh checker (2026-10-22 ~15:15, on 40bf9c3d): PASS, no must-fix
Slide / sweep deletion complete (no references left; `isRemovedTuneGroup` drops only exact groups, negatives tested);
recoil springs exact (frame-rate independent), Wren rigs only, no wire change, aim / camera / shot ray untouched; wall
block hysteresis and one 0.4 s move, bore never above the aim line, gameplay unchanged (a blocked shot still starts at the
head). 76 + 92 tests pass, eslint clean. No e2e script needs changing. Should-fix done: A2 marked waiting on Michael; the
G2 / G6 references named as CT prototype G numbers (not DECISIONS). TESTING line added.
Polish: lowering the gun at a wall drops the muzzle ~100 deg for ~0.2 s (tip not scaled by raise; animGraph ~1325);
aimed 0.3 rad off level at a wall the muzzle pokes up to 9 cm through (visual only); WALL_BLOCK comment on `minTip` vs
-1.2 aim pitch (89 deg down); CHANGELOG / movement.md say ~66 deg, measured 64.7; no pistol wall-block unit test;
animN3b.test.ts:214 uses Math.hypot (test); two shots in one render frame give one kick; the partner's recoil follows
the local `recoilMul`; pistol back kick small (0.8 cm).

## PR checks (2026-10-22 ~15:40-15:52, desktop under heavy.lock, on 48cb9280)
`npm run check` PASS (249 files, 2691 tests); e2e-anim ok (186 s), e2e-stealth-ai ok (137 s), e2e-coop ok (506 s),
e2e-wall ok (104 s). GPU sheets in `docs/anim-natural/n3b/after/` (wall-block, fire-rifle, fire-pistol; before = the
pass 2 sheets on feature/anim-natural). Wall block measured on the sheet: gun pitch 0 -> -65 deg (muzzle down) in ~0.4 s
walking in, held, back to 0 stepping off; the audit's "stall" flag there is the held block, by design.
