# anim-bake - baking a tuner export into the code defaults

## Usage
`node scripts/anim-tune-bake.mjs <anim-tune-YYYY-MM-DD.json> [--dry-run] [--only section,...] [--allow-shared]`
- `--dry-run`: prints a diff per file (old line -> new line) and a table (section, group, id, value, result, target).
  Writes nothing.
- Real run:
  - writes the source files;
  - writes the Keys section's key JSONs (`scripts/anim-keys/keys/`, using the apply-tune functions);
  - writes the ledger `src/anim/tuneBakeLog.json`;
  - prints one rebake command per touched clip
    (`node --import ./scripts/operators/ts-resolve.mjs scripts/anim-keys/build.mjs <clip>`). Blender is never run.
  - prints the table and the warnings.
- `--only`: bake only these sections: body, gun, cam, speed, joint, hand, ik, weapon, step, gear, keys, weight,
  guardJoint, guardStep, guardWeight, clip.
- `--allow-shared`: bake a shared target when exactly one group changed (the summary warns).
- The script loads the repo's TypeScript itself (it imports `scripts/operators/ts-resolve.mjs`).
- Code:
  - mapping: `src/anim/tuneBakeTable.ts` (pure data);
  - logic: `src/anim/tuneBake.ts` (pure, no fs; the script does the IO).

Refused, with nothing written:
- a wrong magic or version;
- a malformed or doubled entry;
- a value outside its slider's wide range;
- an export kind that differs from the build's;
- a target file outside `src/` and `scripts/anim-keys/keys/`;
- a code value not found exactly once;
- a code value that is not a number literal or a simple `NAME * n` / `NAME +- n` form;
- a division by 0.

**Units:**
- A mul slider multiplies the code value. It divides instead when the slider scales a time and the code holds a rate.
- An add slider adds in the code's unit.
- Results are rounded to 4 significant digits; a value that rounds back to the old one is not written.
- The file keeps its formatting and line ends.

**Identity after bake:** the code value moves and the slider's default stays identity. The tuner's IndexedDB save still
holds the tuned values; after the merge the tuner resets the baked ones itself (Reset baked, step 7) and Michael
exports again. The ledger records every baked `group|id=value`. A later export (the same one or a new one) that still
carries that value for that slider is reported "already baked (same value as the bake of <date>; reset this slider in
the tuner)" and is never baked twice; a different value for the slider is a new tune and bakes.

## Results
- **baked:** written into the code value(s) named in the target column. A note in [] says where the bake is only
  close.
- **manual: shared target (values per group):** the groups that read one code value differ. Michael or a job lead
  picks, or a later job adds a per-state table. A slider and group covered by several rules bakes only when every one
  of them bakes: a value is never half in the code and half in the tuner.
- **manual: no code target:** there is no code value to absorb it; the reason is listed.
- **baked (key JSON; rebake the clip):** the Keys section.
- **skipped: no bake rule:** a slider this build does not know (e.g. PR #71's sections before their table entries).
  Counted in the summary's "manual or skipped".
- **already baked:** the ledger holds this slider and group at this value.

## Mapping per section
**Body.** The rule (anim-bake-targets): every slider the tuner shows bakes, per state; one that does not is a bug.
The one exception is strideMul (below). The constants below are the shared rig's, so every rig reads them: the partner
and the guards too. Every other Body slider and group bakes into the base table's `body` key (below).
- Baked:
  - strideMul, the one Body exception: one shared code target for the 13 moving groups (MOVING: walk, jog, run, sneak,
    crouchWalk, crouchRun, aim, aimCrouch, aimCrouchMove, wallSlide, wallCrouchSlide, hold, carry) -> MOVEMENT.stepLen0
    / stepLenK / stepLenMax, CROUCH_STEP.k / max, WALK_STEP.k, TENSE.step, GLIDE_STEP (x). It bakes only when every
    moving group agrees; when they disagree every row reports "manual: shared target (values per group)" and nothing is
    written (`tests/animTuneBake.test.ts`, "Body strideMul"). A per-state stride table is a later job (backlog, "Tuner
    sliders that do not bake yet").
  - kneeOutMul (ladder, pipe) -> CLIMB_KNEE_OUT x. Close: the climb pole is max(stance knee-out, CLIMB_KNEE_OUT).
  - kneeLiftMul (ladder, pipe) -> CLIMB_KNEE_UP x.
  - peekLeanMul (wallPeek) -> WALL.peekLean x.
- Base table (anim-bake-targets, BT-A1 / A3): every other Body slider and group (`tune.ts` BODY_BASE_FIELDS: all but
  strideMul and peekLeanMul; kneeOutMul / kneeLiftMul outside ladder and pipe) -> `animBase.ts: body.<row>.<id> x`
  (mul) or `+` (add). None is manual. The elbow pole share is the named ELBOW_POLE_OUT (was the inline 0.55).

**Gun.**
- Baked:
  - rifle.lowReady -> WREN_READY_LOW.* +. Close: the other carries keep theirs, so a gun tune made at a wall (the wall
    tuck) is not carried over.
  - pistol.lowReady -> WREN_PISTOL_READY.* +.
  - (anim-bake-1022) Both are Wren's own copies (`animGraph.ts`): every Wren rig (`CharacterRig.tuneRows`: the player,
    the partner, the studio puppets) reads them, every other rig (guards, VIP, dummy) READY_POSES.low and PISTOL_READY,
    which no bake touches ("Wren's rows never touch guards"). The first bake wrote into the shared poses; the split moved
    those values into the Wren copies and put the guards' pre-bake values back.
  - gunFwd / gunSide, rifle aims -> SIGHT_RAISE.z / x +, with PISTOL_REACH.z / x - so the pistol aim stays.
  - gunFwd / gunSide, pistol aims -> PISTOL_REACH.z / x +.
  - sightYAdd -> SIGHT_EYE +.
  - headDropMul -> NECK_WELD x.
  - tuckMul (anim-bake-targets, BT-A2): per gun state -> `WREN_TUCK.<rifle|pistol>.<lowReady|aim|aimCrouch>` x
    (`animGraph.ts`, identity 1). A Wren rig's tuck is max(aim tuck, ready tuck) x tuckMul x `wrenTuckMul` (the low
    ready's at aimK 0, the aim's (crouched by the crouch) at aimK 1, blended between); every other rig times 1, so
    the guards keep READY_ELBOW_TUCK / _CROUCH / AIM_ELBOW_TUCK, which no bake touches. Exact per state (was one shared
    rule over all six, B1).
  - glideTwistMul -> GLIDE.yawCut x.
- Manual: aimed gunUp, gunPitch, gunYaw and gunCant (the sight-to-eye solve and the aim hold them).

**Camera** (`config/camera.ts`).
- Boom, side, pivot and height bake into the per-state configs: the hip, open, crouch-open, ADS, wall, peek, climb
  presets and duct.
- camFollowMul -> stairRate.
- camBoomRateMul -> boomIn / boomOut.
- camPadAdd -> castPad.
- camHeightAdd -> height (also the low-space reference: low spaces shift slightly).
- camBlendMul -> the matching blend rates. Close (noted in the table): a preset's blend-out after leaving the wall,
  climb or duct ran under the next state's slider and now follows the preset's baked blend; the peek-out can finish
  under cam.wall; an aim release at a wall ran under cam.wall's slider (adsOutRate); cam.hold runs the explore open /
  tight blend with no slider of its own.
- Manual:
  - FOV (a player setting);
  - zoom (1 without a scope);
  - the aim-in blend (it comes from the weapon's draw time).

**Speed** (per group, baked directly). All gameplay.
- creep..run -> GEARS.stand / crouch points. Exact at the point. A GEARS point also drives the gait clip mix (effort),
  the integer gear bands (roll, fence rattle, wire pace), the stepping gait bands and the weapon's moving-spread
  speed; in the tuner those stayed, after the bake they move with the point.
- glideStrafeMul -> strafeMult x; glideBackMul -> backMult x.
- glideFwdMul: manual. The tuner scales the whole aimed glide and adsSpeed only caps it, so below the cap the forward
  speed would lose it and the strafe / back shares would drop by 1/f.
- Wall slide -> WALL.slide*.
- Ladder, pipe, shimmy and crawl -> the ATTACH speeds (pipe: also the pipeH legs mode, which read the base speed
  without the tuner).

**Stepping.** Every planner reads these, guards included. (item 24) The Stepping sliders themselves are Wren's alone at
run time (a guard's planner reads the guards' table, any other rig's an identity table); these baked constants stay
shared.
- Baked:
  - idle lift -> PLANNER.idleLift.
  - lock (the 5 moving gaits) -> TURN_FOLLOW.twistFree / twistMax / scrubSpeed. Close: the touchdown twist cap reads
    twistFree too.
- Manual: the idle lock (no effect while still) and the rest (clip data, inline literals).

**Weight.**
- Baked:
  - start / stop / turn timings -> CT.* (gameplay).
  - plant, landing, the spring rates and anticipation times -> WEIGHT_BASE.*.
- Manual: the damping sliders (one zeta for four springs) and every add slider (the layer's amount is the slider).

**Joints, Hands & feet, IK strength, Weapon** (anim-joints J1, COVERAGE gap 1): baked into the base table, a generated
file `src/anim/animBase.ts` that every Wren rig reads (the local player, the co-op partner's avatar, the Anim Studio's
pair puppets; guards and other rigs never do). Result "baked (base table)"; target `src/anim/animBase.ts: joints.<row>.
<joint>[axis] +`, `hands.<weapon>.<row>.<param> +` / `x` / `=`, `ik.<row>[limb] x`.
- The file: a header and the `AnimBaseData` type, then the JSON between the `// @anim-base-begin` and
  `// @anim-base-end` lines, which the bake parses (`JSON.parse`) and rewrites (one write, in the diff and the ledger;
  the rest of the file and its line ends are kept). Shape: `{ "version": 1, "joints": { row: { joint: [x, y, z] } },
  "hands": { weapon: { row: { param: v } } }, "ik": { row: [handL, handR, footL, footR] } }`, keyed by row id, joint
  name and param id (never an index), so new rows and joints fit with no format change. Printed with sorted keys, one
  row per line, about 4 significant digits, identity values left out (a re-bake of identity gives the same text).
  Empty = every row identity (the untuned rig, bit-identical).
- The rules (A1), the same at run time (effective = base composed with the tuner's delta) and in the bake (new base =
  old base composed with the export's value): joint degrees add per axis, then wrap to -180..180 (the offset is built
  from the sum, so a bake is exact); Hands & feet and Weapon offsets add; the gun scale multiplies; the trigger mode is
  the delta's when it is not 0 (auto), else the base's; IK strengths multiply, clamped 0..1.
- The tuner's sliders stay deltas on the base: after the bake, reset them (the look stays). Values outside the
  slider's wide range still refuse; the ledger makes a re-run a no-op. Version 1 exports get their new rows as for
  every section (`joint.wallIdle` also bakes `joint.wallCrouchIdle`). `joint.options` (the mirror lock) stays manual.
- Code: `src/anim/tuneBakeBase.ts` (parse, apply, print); the runtime base + delta is `tuneJoints.ts` /
  `tuneHands.ts`, the per-rig window `tuneJointsRig.ts`. Dev hook: `window.__animBase` (`get`, `load`, `setJoint`,
  `reset`) loads a base table object in the running game until a reload. Tests: `tests/animJointsBase.test.ts`.
- Move and action rows (anim-joints J2, COVERAGE gap 2) bake like any row: the row is the group id after the section
  (and after the weapon for Hands & feet / Weapon), dots and all. `joint.trav.vault` -> `joints["trav.vault"]`,
  `joint.team.boost.b` -> `joints["team.boost.b"]`, `hand.rifle.reload` -> `hands.rifle.reload`, `ik.air` ->
  `ik.air`, `weapon.pistol.throw` -> `hands.pistol.throw`. The rows (`src/anim/tuneMoveRows.ts` `TUNE_ROW_IDS`): the body
  states, `trav.<kind>` (vault, mantle, step, climbUp, windowVault, rappel, drop, hop, roll, wallKick, split, brace),
  `team.<move>.<a|b>` (boost, relay, throw, hang, rope, revive), `air`, `land`, `slide`, `melee`, `reload`, `swap`,
  `throw`, `hit`. At run time a move row composes over the stance row by its weight (`docs/systems/ui.md`). Test: the
  literal export in `tests/animMoveRows.test.ts`.

**Gear** (anim-gear, marlow-bays item 22): baked into the same base table under the key `gear`. Result "baked (base
table)"; target `src/anim/animBase.ts: gear.<row>.<param> + (m)` or `+ (deg, wrapped)`.
- Shape: `"gear": { row: { param: v } }`, row = the group id after `gear.` (`holster`, `backL`, `backC`, `backR`,
  `slingHip`, (anim-goggle) `goggles` (the worn goggle, head frame), and each with `.crouch`: `gear.holster.crouch` ->
  `gear["holster.crouch"]`),
  param = `x` / `y` / `z` (metres, the socket's own frame) or `pitch` / `yaw` / `roll` (degrees). Offsets add (angles
  wrapped to -180..180), the same at run time (base + the tuner's delta) and in the bake (old base + the export's value).
- The key is optional and printed only when a row has an offset (sorted, about 4 significant digits, 0 left out): a
  table without it (every table before anim-gear) parses and prints exactly as before, and old exports bake as before.
- Code: `src/anim/tuneBakeBase.ts`; the runtime table and the per-rig composition `src/anim/tuneGear.ts`. Dev hook:
  `window.__animBase.setGear(row, param, value)`. Test: the literal export in `tests/animGear.test.ts`; the goggle rows
  in `tests/animGoggle.test.ts` (no bake code change: the bake keys by row id).

**Body base** (anim-bake-targets, BT-A1 / A3): the same base table under the key `body`. Result "baked (base table)";
target `src/anim/animBase.ts: body.<row>.<id> x` (mul) or `+` (add).
- Shape: `"body": { row: { id: v } }`, row = the Body group id (`idle`, `walk`, `lowReady`, ...), id = the slider id.
  Mul sliders multiply, add sliders add, the same at run time (base composed with the tuner's value) and in the bake
  (old base composed with the export's value). Printed only when a row is set (sorted, about 4 significant digits,
  identity dropped): a table without it prints exactly as before.
- Run time (`tune.ts` bodyBaseLoad / bodyRigBegin / bodyRigEnd, opened per rig in `tuneJointsRig.ts` tuneRigBegin): each
  Wren rig eases its own applied values toward its own row (BODY_TAU) and composes them onto TUNE_CUR (the local
  player's tuner values, identity for every other rig), the pose's head turn and the grip targets, all put back in the
  rig's `finally`; nothing leaks into the next rig and nothing allocates. The local player's rig also gets them in
  TUNE_LOCAL (the wall gap and the root offset, read outside the window). Guards never open a window. Empty: nothing
  opens (bit-identical). Dev hook `window.__animBase.setBody(row, id, v)`. Tests: `tests/animBodyBase.test.ts`, the
  literal export in `tests/animTuneBake.test.ts`.
- Open: the root offsets (bodyFwdAdd, bodyUpAdd, guardGapAdd, guardSideAdd) and the wall gap are applied by the local
  player's `player.ts` only; the partner's and the puppets' roots are placed elsewhere (`src/net`, the studio) and do
  not read them yet.

**Guard joints, Guard stepping, Guard weight** (marlow-bays item 24, track A): baked into the guard base table, a
generated file `src/anim/animBaseGuard.ts` that every guard rig reads (`CharacterRig.guardRows`, set in
`buildEnemyRig`: the host's guards, the co-op client's puppets, the Anim Studio's guard puppet); no Wren rig ever reads
it, and Wren's table never takes a guard row. Result "baked (guard base table)"; target
`src/anim/animBaseGuard.ts: joints.<row>.<joint>[axis] + (deg, wrapped)`, `step.<gait>.<param> x`,
`weight.<row>.<id> x` (a multiplier) or `+` (an amount).
- The file: a header and the `AnimBaseGuardData` type, then the JSON between `// @anim-base-guard-begin` and
  `// @anim-base-guard-end`. Shape `{ "version": 1, "joints": { row: { joint: [x, y, z] } }, "step": { gait: { param:
  mul } }, "weight": { row: { id: v } } }`, keyed by row id (`idle`, `walk`, `run`, `aim`, `crouch`, `cover`; the
  stepping gaits `idle` ... `crouchRun`), joint name and param id. Printed sorted, one row per line, about 4 significant
  digits, identity left out (an identity re-bake gives the same text).
- The rules, the same at run time (`tuneGuard.ts`: effective = base composed with the tuner's delta) and in the bake:
  joint degrees add per axis then wrap; stepping multipliers multiply; weight multipliers multiply, amounts add. The
  guard sliders stay deltas on the base: after the merge Reset baked resets them as for every section.
- Own file, own markers: an export with no guard rows never reads or writes it, so it bakes byte-identically to before.
- Code: `src/anim/tuneBakeGuard.ts` (parse, apply, print), wired in `tuneBake.ts` beside the Wren base table. Dev hook:
  `window.__guardTune` (`base`, `load`, `reset`, `jointEffective`, `stepGet`). Tests: `tests/guardTune.test.ts`.
- Not isolated by this: the Wren Stepping rules above (idle lift, lock) and the Body / keyed-clip rules write shared
  constants every planner and rig reads, guards included (A5); a guard-only change goes in the guard rows.

**Keys:** `key.<clip>.<n>` deltas -> `scripts/anim-keys/keys/<clip>.json` through the apply-tune functions. Then
rebake each clip with build.mjs (Blender, headless, under the desktop heavy lock). (marlow-bays item 23, track A) A key's
`time` (bake frames, + later) moves its `phase` to frame / 48 (moved keys only, clamped as in the tuner; key 0 is fixed:
skipped) and regenerates `src/anim/tuneKeysMeta.ts`; an export with no timing edit bakes exactly as before. (marlow-bays
item 30e) The live preview now matches the rebake: once the clip's key file loads (on its first edit) the fields the
bake keys on Blender's Bezier curve (trunk yaw / pitch / roll, pelvis shift, arm flex / abd / elbow / inward / upper arm
twist, wrist) spread on that same curve (`src/anim/keyCurve.ts`), the trunk re-keyed in the bake's channel frames and
the arms composed as its FK (`src/anim/tuneKeysCurve.ts`); a retimed key re-keys the clip at its new time. Measured
against a Blender rebake (`tests/keyedExactPreview.test.ts`): pelvis and trunk exact (under 0.001 cm / 0.0001 deg), arms
within 0.7 cm between the keys (exact at them); the lerped fields (head, shoulder, forearm twist, clavicle, fingers, leg
deltas, FK weight) were exact already. Before the key file loads (the first frames after the first edit) the preview
spreads linearly.
(marlow-bays item 25, track A) Add / delete keys: `del` 1 removes the key (key 0 never: skipped; past the minimum of
4 keys a cycle: skipped; with the Mirror box on the bake drops its mirror with it); an added-key group
`key.<clip>.a<s>` adds a key at `at` / 48 whose fields are the original keys' blend there (every numeric field of the
two keys either side, linear in time, the retimed times; `keyBlendAt`) plus its deltas; one sitting on a key or (Mirror
on) outside the own half is skipped. A key file with an add / delete is written with its keys in phase order (with
the Mirror box off a mirrored file is written in full first), `src/anim/tuneKeysMeta.ts` is regenerated and the rebake
printed; `key_clip.py` sorts any key list, so it needs no change. An export with no add / delete bakes exactly as
before. The meta is regenerated whenever a key file is written (also a file written in full with no time edit: it
holds the mirror flag and the own phases); unchanged files give byte-identical meta. (item 30e) The live preview keys
an added or deleted key on the bake's curve too (an added key a knot on the original keys' blend plus its deltas, a
deleted key no knot), so the in-betweens around it no longer shift after a rebake; "+ Add key" gives the new key the
value the preview shows there, so nothing moves at its time (its curve-field deltas are small non-zero numbers: the
curve minus the linear blend). Rules and tests: `src/anim/tuneKeysEdit.ts`, `tuneKeysFile.ts` (`keyEditPlan`, `keyEditRow`),
`tests/tuneKeysEdit.test.ts`.
(marlow-bays item 30, track A) The key tools (Wave, Apply to keys, Smooth between) only write the key sliders above
(field deltas on keys with their own sliders; with the Mirror box on the mirrored half follows), so they bake exactly as
those; no new bake format. Compare writes nothing.

(anim-run-half) A clip's `half` (the planner's track half-width) is the mean of (R - L) / 2 of the ankles' lateral
offsets turned back about the vertical through the pelvis by that frame's pelvis yaw minus the clip's mean pelvis yaw
(its pitch and roll left out; the yaw read off the pelvis's lateral axis, since the forward axis goes vertical in a
face-down frame), not their world x: the planner places the feet in the facing frame and the stride-locked swing of the
pelvis yaw does not move them, so it must not leak the fore / aft stride into the half (the run's +-25.5 deg yaw baked
-0.020 in the world frame, the feet crossing the midline; with the swing removed 0.050). A constant stance
yaw (the ready stance's 6 deg) is kept, so such a clip and the clips with no pelvis yaw bake their world-x half; every
clip was rebaked in anim-run-half.

**Clip speed** (clip-speed, track A; `src/anim/tuneClipSpeed.ts`, its own tab): a speed per timed clip (1 = today's
timing, 2 = half the time) and an every-clip speed (`clip.all`). A speed divides a duration or multiplies a rate:
`clip.gun` rifleDraw / pistolDraw / holster -> `src/weapons/drawState.ts` `DRAW_TIME_PRIMARY` / `DRAW_TIME_SIDEARM` /
`HOLSTER_TIME` (div); swap / grenade -> `src/weapons/playerWeapons.ts` `SWAP_TIME` / `GRENADE_TIME` (div);
`clip.body` startShift / stopSettle / land -> `src/anim/clips/actions.ts` `CLIP_RATE.<id>` (mul; the timed clips are
keyed in seconds, so their clock rate bakes, not their keys). `all` edits every one of these; with a clip's own slider
too both ops apply (the product, as in the game). The draw times are gameplay too: the draw state gates `fireReady`
over the same time, so the gun can fire when the draw clip ends, tuned or baked. Not in it: the gait cycles (paced by
speed), the traversal / co-op one-shots (their own Timing sliders, manual), reloads (weapon data). Test:
`tests/tuneClipSpeed.test.ts`.

**Co-op and Traversal moves** (`src/anim/moveTune.ts`, from #71: `team_boost` ... `team_revive`, `trav`): manual, no
code target. Every slider is a visual offset on the local rig (root, grips, plants, lean, crouch, the one-shot clip
clock); the moves' paths and timing stay TEAM / attach data. Folding them in needs per-move base offsets every rig reads
(a later job). Declared in `DECLARED_SECTIONS` (moveTune imports speedTune, which plain Node cannot load); the test pins
the declarations to the registry.

**New sections**: add rules or manual entries to `tuneBakeTable.ts`, and the file to
`BAKE_CATALOGUE_MODULES` (plain-Node loadable) or `BAKE_OTHER_SECTION_FILES` (with a `DECLARED_SECTIONS` entry). The
test finds every file under `src/` that calls `registerTuneSection`, imports it, and fails when the file is in neither
list or when any registered slider and group has no rule or manual entry.

## Assumed decisions (undo)
- **A1** Sliders with no code value are reported manual. (anim-joints J1) Joints, Hands & feet, IK strength and Weapon
  now bake into the base table `src/anim/animBase.ts` (above).
- **A2** A ledger (`src/anim/tuneBakeLog.json`, `group|id=value` per baked value) makes any later export that still
  carries a baked value a no-op for it. Undo: delete the ledger and step 7 of `tuneBake()`.
- **A3** Atomic per slider and group: a value bakes only when every rule covering it bakes. Undo: drop the blocking loop
  in `tuneBake()` step 3.
- **A4** Some bakes are close rather than exact (the [] notes). Undo: turn any of those rules into a manual entry.
- **A5** Code that reads a baked constant without a slider follows the bake: other rigs (partner, guards), `cam.hold`'s
  blend, the remote's peekLean normaliser.
- **A6** The rifle aim's position goes into SIGHT_RAISE, with the opposite into PISTOL_REACH so the pistol stays. Undo:
  make those rules manual.
- **A7** The Speed section is declared in the table (plain Node cannot load speedTune); a test pins it to the registry.
- **A8** Results are rounded to 4 significant digits.

## Tests (`tests/animTuneBake.test.ts`, 24; temp copies in `os.tmpdir()`, never the real tree)
- **Coverage:** every registering file under `src/` is imported and listed; the table covers every slider and group of
  every registered section. Every target is found exactly once in the real tree (read only). The declared sections
  match the registry.
- **tuckMul:** (anim-bake-targets) each gun state alone at 0.6 bakes into its own WREN_TUCK constant (that state's tuck
  x 0.6, the others and the guards' constants unchanged); the six constants and `wrenTuckMul` (exactly 1 untuned).
- **Body base:** every Body slider bakes (none manual); Michael's 13 literal values give 0 manual; the real ledger
  holds them.
- **glideFwdMul:** manual.
- **Ledger by value:** a new export still carrying a baked value is "already baked"; a new value bakes.
- **Editing:** units, object keys, indexes, folded forms, rounding, the diff format.
- **A sample export with a slider per section:**
  - the dry run writes nothing;
  - the written values equal the old value times or plus the slider value;
  - formatting is kept.
- **Keys:** a key JSON edit; the rebake command is printed.
- **Re-runs:** the ledger no-op, `--only` staging.
- **Shared targets:** one group changed is manual; `--allow-shared`; all equal bakes once; a partial change bakes
  nothing.
- **Refusals:** magic, version, malformed, doubled, beyond range, kind mismatch, target not found, outside the write
  roots, op against kind.

## A fresh export from Michael: what the job lead does
1. Keep the export file outside `src/`. Cut `feature/<job>` from master.
2. Run `--dry-run` and read the table.
   - For any "manual: shared target" rows, ask Michael (native multiple choice) to pick one value per shared constant,
     or log a job for a per-state table.
   - "manual: no code target" rows stay in the tuner.
3. Real run (`--only` for a staged bake if wanted).
4. Rebake each printed key clip with build.mjs (desktop, under the heavy lock).
5. Run `npm run check`; unit tests that pin constants (GEARS, CAMERA, WALL ...) may need their expected values updated.
   Then run the e2e test tiers. What the first bake (anim-bake-1022) needed:
   - The identity fixtures (`tests/fixtures/anim-skeleton-identity.json`, `...-guard-identity.json`): first prove the
     change is data only (a temporary test that restores the pre-bake data at run time must match the old fixture bit
     for bit), then re-capture with `ANIM_SKELETON_CAPTURE=1`. A gun bake changes only Wren's fixture (the gun rules target
     Wren's copies); the guard fixture changes only when a bake writes a shared constant (Body, Stepping, keyed clips).
   - Tests that need the untuned rig load a test-local empty base table (`animBaseLoad(emptyBase())`,
     `jointsBaseLoad(undefined)`); the base file test reads against `ANIM_BASE`.
   - The tuner key tests (retime, add / delete, the step) need a mirrored clip with evenly spaced keys: they run on
     sneak (unit) and walk (e2e-studio, frames read from `tuneKeysMeta.ts`), each with a precondition check. A tune that
     retimes those clips moves the tests to another evenly spaced clip.
   - Quality limits a tune breaks (e2e-anim anti-crab, the keyedWalk jog / run arm check) are widened for that gait only
     to the measured value plus ~10%, each with a `(anim-bake-1022) ... was <old>` comment so it can be restored, after
     the orchestrator agrees.
6. Commit the sources, the key JSONs, the rebaked clips and the ledger in one PR.
7. After the merge nothing is left to reset by hand (anim-bake-1022, `src/anim/tuneBakedReset.ts`, tests
   `tests/tuneBakedReset.test.ts`): the build bundles the ledger, and when the tuner's save loads (the panel is built
   at boot) every slider whose saved value equals exactly a ledger `group|id=value` (compared as the ledger formats
   numbers; a version 1 save migrated first; the record as saved; a baked value past its slider's normal range also matches its clamped value, since a re-save
   stores it clamped, e.g. 4.46.x saved trackMul 0.05 as 0.3; a deliberate 0.3 there resets once too) goes back to its default through the registry (change log and save follow). The other changes are
   kept. The ids of the bakes applied are kept in the save (`TuneSnapshot.baked`), so it runs once per bake and a later
   re-tune to the same value is not wiped. A bake's id is `hash@at` (`bakeAppliedIds`): the hash is the export's, so
   two bakes of one export (anim-bake-targets re-baked PR #96's export for 13 new targets) share it and only the bake
   time tells them apart. A bare hash (a 4.46.x save, before the ids) counts as applied for the first ledger bake with
   that hash only, so a 4.46.x save resets the second bake's 13 sliders once. The panel's info line then says "13
   values are now built in; your other 1 change is kept." (with one other change; closed: when it next opens; also the
   console). The Y menu's **Reset baked** runs it again over
   every bake, ignoring the record (it compares the loaded values, clamped values included). Tell Michael to
   open the tuner, read the line and export again: the old export is spent.

## Fix round (CHECK-BAKE.md)
- **B1** tuckMul: one rule over all 6 gun groups (READY_ELBOW_TUCK, READY_ELBOW_TUCK_CROUCH, AIM_ELBOW_TUCK x), exact
  when they agree; test reproduces the checker's case.
- **B2** glideFwdMul: manual (it scales the whole glide; adsSpeed only caps it). glideStrafeMul / glideBackMul stay.
- **S1** camBlendMul: the preset, adsOutRate, peek and open / tight rules stay, marked "close" with the reason (the
  blend-out runs under the next state's slider). Chosen over listing destination groups, which would make every preset
  blend a shared target that never bakes.
- **S2** GEARS rule note and the Speed section above: the points also move the gait mix, gear bands, stepping bands
  and weapon spread (gameplay).
- **S3** The ledger stores `group|id=value`; any later export with a baked value reports "already baked" for it.
- **S4** The test imports every file that calls `registerTuneSection` and checks it is listed
  (`BAKE_CATALOGUE_MODULES` / `BAKE_OTHER_SECTION_FILES`).
- Polish: the lock rule covers the moving gaits only (idle lock: manual); skipped rows counted; `--only` with no list
  refused; writes go to `*.anim-bake.tmp` first, then rename; notes on pipeMul (legs mode) and camHeightAdd (low
  spaces).
