# anim-joints J1 - implementer report (the base table every Wren rig reads, COVERAGE gap 1)

## Built
- `src/anim/animBase.ts` (generated, A4): the `AnimBaseData` type and `ANIM_BASE`, whose literal is pure JSON between
  `// @anim-base-begin` / `// @anim-base-end`. Shape `{ version: 1, joints: { row: { joint: [x, y, z] } }, hands: {
  weapon: { row: { param: v } } }, ik: { row: [handL, handR, footL, footR] } }`, keyed by row id, joint NAME and param
  ID (never an index; tables are sized from `JOINTS.length` / `HAND_PARAM_COUNT`). Empty.
- `src/anim/tuneBakeBase.ts` (pure): `parseAnimBase` (JSON.parse between the markers), `applyBaseEntries` (A1: joint
  degrees add then wrap to -180..180; hand / weapon offsets add, `gunScale` multiplies, `trigger` the entry's when not 0
  else the base's; IK multiplies, clamped 0..1; each result rounded as printed), `printAnimBase` (sorted keys, one row
  per line, `bakeFmt` 4 significant digits, identity dropped: a re-bake of identity is the same text), `spliceAnimBase`
  (replaces only the JSON, keeps the file's line ends), `baseTarget` (the table's target column), `bakeFmt` (moved
  here, re-exported by `tuneBake.ts`), `BAKE_BASE_FILE`, `BAKE_BASE_SECTIONS`.
- `tuneJoints.ts` / `tuneHands.ts`: the delta tables are unchanged for the panel, the save and the export
  (`jointsSnapshot` / `handsSnapshot` stay deltas, `jointChanged` / `handsGroupChanged` read the delta). New: the base
  arrays (`BASE`, `IK_BASE`), the EFFECTIVE values (joints: `wrapDeg(base + delta)` per axis -> quaternion; hands:
  `handCompose(i, base, delta)`; IK: `clamp01(base x delta)`) and effective live flags, rebuilt per slot on an edit and
  for every row on a load (`jointsBaseLoad`, `handsBaseLoad`, run at module start from `ANIM_BASE`; unknown rows /
  joints / params are skipped with one `console.warn`). Getters: `jointsBaseGet`, `jointsEffective`, `handsBaseGet`,
  `handsEffective`, `ikBaseGet`, `ikEffective`, `jointsAnyLive`, `handsAnyLive`, `wrapDeg`, `handCompose`.
- Per-rig state (A2, A7): `JointsRigState` / `HandsRigState` (applied eased values, derived quaternions, IK strengths, a
  load generation) and `src/anim/tuneJointsRig.ts` (`TuneRigState`, `tuneRigBegin`, `tuneRigEnd`, `animBaseLoad`,
  `animBaseNow`, dev hook `window.__animBase`: `get`, `load`, `setJoint(row, joint, [x, y, z])`, `reset`).
- `CharacterRig.tuneRows` (getter / setter; the setter allocates the rig's `TuneRigState` once, `tuneSt`). Set to
  true in `operatorRig` (`src/operators/runtime/playerFigure.ts`, the line the orchestrator approved), so every Wren
  rig has it: the local player, the partner's avatar (`remoteAvatar.ts`), the studio puppets (`studioStage.ts`), the
  menu preview. Guards, the VIP, the dummy, the studio guard and the lab rig never set it.
- Bake: `tuneBakeTable.ts` drops the four `manual(s, '*', V2_REASON)` entries (`joint.options` mirror stays manual).
  `tuneBake.ts` routes every entry of `joint` / `hand` / `ik` / `weapon` not covered by a manual entry (after the
  version 1 migration) into one write of `src/anim/animBase.ts` (in `writes`, the diff and the ledger); rows read
  "baked (base table)" with the target `src/anim/animBase.ts: joints.<row>.<joint>[axis] + (deg, wrapped)` etc. Values
  outside the wide range still refuse; a re-run is a no-op ("already baked").
- `scripts/anim-tune-bake.mjs`: the header comment only.
- `tuneV2Sections.ts`: `tuneV2Frame` also copies a few background rows a frame (2 Joints, 6 Hands & feet + Weapon, 2
  IK; every row within about 0.4 s), so a rig in another state than the local player (the partner, role B) sees a panel
  edit of its row too. No allocation.

## Design notes: how a rig opens its window, where the hooks read
- `CharacterRig.animate` is split: the LOD skip stays in `animate`; the solved frame moved unchanged into a private
  `animateFrame`. When `tuneSt` is set, `animate` calls `tuneRigBegin(tuneSt, pose, this, dt)`, then `animateFrame` in a
  `try`, and `tuneRigEnd()` in `finally`. A skipped LOD frame opens nothing and eases nothing (its dt is carried as
  before).
- `tuneRigBegin` picks the row as the local player's tuner does: `selectBodyGroup(pose, ledge = reachL/R.hook === 1,
  armed = heldWeapon)`, `handsWeaponOf(rig)`, and the per-gun Joints row (a precomputed [weapon][state] index table, the
  same rule as `tuneV2Frame`). It then calls `jointsBeginRig(st.joints, row, dt)` and `handsBeginRig(st.hands, state,
  weapon, dt)`: each eases THAT rig's state (`JOINT_EASE_TAU`, `HAND_EASE_TAU`; a load or a base change jumps) and opens
  the window on it.
- Hooks: `jointApply` reads the open state's quaternions (`act`, set by `jointsBeginRig`); `ikStrength` reads the open
  hands state's IK strengths; `HANDS_CUR` / `HANDS_GUN` are filled from the rig's own derived state by `handsBeginRig`
  (a copy of ~45 numbers, only when something is live). `JOINTS_CUR.on` / `HANDS_CUR.on` are cleared by
  `tuneRigEnd`, so nothing another rig opened can leak into a rig without the flag. The hook call sites in
  `characterRig.ts` are unchanged.
- Behaviour change: `dt` 0 (a frozen game: the tuner's Pause, the studio's pause, time scale 0) now applies the row at
  once (`k = 1`), as the registry's sections already do ("dt 0 = at once"); before, the joints / hands ease stood still
  at dt 0, so an edit or a base load while paused did not show until resume. `Infinity` still jumps; any dt > 0 eases
  as before.
- Fast path: with nothing applied and nothing live in the row both begins return before any easing, the windows stay
  off and no hook runs: an empty base + zero deltas is bit-identical (unit test (e)).
- `player.ts` keeps `tuneBegin`, `tuneV2Frame`, `tuneKeysFrame`, `moveTuneBegin` and the weight window; it no longer
  opens the joints / hands windows (the rig does). `jointsBegin` / `handsBegin` (the module's own state) stay for the
  existing tests and tools.

## Files
- New: `src/anim/animBase.ts`, `src/anim/tuneBakeBase.ts`, `src/anim/tuneJointsRig.ts`, `tests/animJointsBase.test.ts`,
  this report.
- Changed: `src/anim/tuneJoints.ts`, `src/anim/tuneHands.ts`, `src/anim/tuneV2Sections.ts`, `src/anim/tuneBake.ts`,
  `src/anim/tuneBakeTable.ts`, `src/player/characterRig.ts` (the import, `tuneSt` / `tuneRows`, the animate split, one
  doc line), `src/player/player.ts`, `src/operators/runtime/playerFigure.ts` (one line + comment, approved),
  `scripts/anim-tune-bake.mjs` (comment), `scripts/e2e-studio.mjs`, `tests/animTuneBake.test.ts`,
  `docs/anim-tuner/BAKE.md`, `docs/systems/ui.md`, `CHANGELOG.md` ("Unreleased - anim-joints"), `TESTING.md`.

## Tests
- `tests/animJointsBase.test.ts` (8): the generated file is empty and prints back identically (identity entries leave
  nothing); the A1 rules (wrap 170 + 20 = -170, gun scale 1.5 x 1.2 = 1.8, trigger auto keeps the base's, IK 0.5 x 0.5);
  (a) a literal version 1 export (`joint.wallIdle` elbowR_x, `hand.rifle.aim` handRFwd, `ik.crouchWalk` footL,
  `weapon.pistol.aim` gunScale, `joint.options` mirror, body `wallPeek` peekLeanMul) bakes to the expected base text
  (the migrated `wallCrouchIdle`, `aimStill`, `crouchRun` rows included), only the JSON changes, line ends kept, mirror
  manual, the body slider baked, the ledger has the migrated key; (b) a literal version 2 export (`joint.rifle.aim`,
  `hand.none.walk`, `ik.carry`) and a refusal beyond the wide range; (c) bake on a non-empty base, then load the new base
  and reset the tuner: every row's effective values equal (joints exact in degrees incl. a wrap, IK exact, hands to 1e-9);
  (d) a re-run is a no-op; (e) nothing live and a flagged Wren rig bit-identical to an unflagged one, no window opened;
  the real rig: a base `idle` row (elbowR 40 deg, right hand IK 0) gives exactly rest + offset on the idle Wren rig,
  while an interleaved walking Wren rig (own row) and a guard rig (no flag) stay bit-identical.
- `tests/animTuneBake.test.ts`: the coverage test accepts the base table sections (and checks they have no code rule);
  the sample's four v2 entries now read "baked (base table)"; the temp tree copies `animBase.ts`.
- `scripts/e2e-studio.mjs`: in `pair:hold_idle` (paused) a base row on Wren's own row (via `__animBase.setJoint`, the
  tuner at identity) turns her elbow by > 20 deg, the guard (flag false) moves < 1 deg; in `pair:boost` (paused) the
  clock is seeked to a moment where role B stands in a stance (its assist has no stance row until J2), B's puppet picks
  its own row (crouchIdle) and a base row there turns its elbow by > 20 deg. Fix during the run: the block's helper
  names clashed with the suite's (`bones`, `ang` -> `jbones`, `jang`).

## Results
- `npm run check`: pass (lint 0 errors, 41 warnings, none in the touched files; Vitest 219 files, 2398 passed, 5 skipped;
  build ok).
- e2e (desktop, port 4191, E2E_JOBS=2, under C:/NightShift/heavy.lock), final run on the final build: e2e-studio ok
  (157 s), e2e-netmove ok (521 s), e2e-coop ok (390 s): all passed. Earlier runs: e2e-studio failed on the helper
  name clash (syntax), then on a base row not showing while paused (fixed: dt 0 = at once), then on role B's assist
  having no stance row (fixed: the e2e picks a stance moment). No GPU checks (none apply).

## One-line hooks
- `src/operators/runtime/playerFigure.ts` `operatorRig`: `rig.tuneRows = true;` - done (approved by the orchestrator).
  With it nothing else is needed for the partner or the studio puppets; `remoteAvatar.ts` and `studioStage.ts` need no
  J1 line. Their team-role lines (A6) are J2.

## Open items
- Team / traversal moves have no stance row (`selectBodyGroup` gives null: the boost's assist, the boosted climb), so
  during them a Wren rig applies no base row (eases to identity), as the tuner did before. J2's move rows fill this.
- J2 (move and action rows) builds on this: the tables are keyed by row id already; `tuneRigBegin` is where the move
  rows' pick and blend go.
- The co-op suites check that the partner is unchanged with an empty base; a live "partner reads a base row" e2e was not
  added (the studio's role B puppet proves a second Wren rig reads its own row; the partner is the same `operatorRig`).
- `track C`: adding joints to `JOINTS` or params to `HAND_PARAMS` needs no change here (keyed by name / id); the base
  file then simply has more names available.
