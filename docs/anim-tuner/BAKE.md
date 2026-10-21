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
- `--only`: bake only these sections: body, gun, cam, speed, joint, hand, ik, weapon, step, keys, weight.
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
holds the tuned values, so after the merge Michael resets the sliders reported "baked" (keeping the manual ones) and
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
**Body.** These constants are the shared rig's, so every rig reads them: the partner and the guards too.
- Baked:
  - strideMul: the 9 moving groups share it -> MOVEMENT.stepLen0 / stepLenK / stepLenMax, CROUCH_STEP.k / max,
    WALK_STEP.k, TENSE.step, GLIDE_STEP (x). Exact only when every moving group agrees.
  - kneeOutMul (ladder, pipe) -> CLIMB_KNEE_OUT x. Close: the climb pole is max(stance knee-out, CLIMB_KNEE_OUT).
  - kneeLiftMul (ladder, pipe) -> CLIMB_KNEE_UP x.
  - peekLeanMul (wallPeek) -> WALL.peekLean x.
- Manual (no code target): arm swing, trunk twist, pelvis height, lean, elbow out (clip data or several terms); arm
  swing growth; knee flex; track; knee out and lift in the other groups (keyed clip data); elbow pole and wall gap
  (inline literals); head turn; body / hand / foot / guard offsets (visual).

**Gun.**
- Baked:
  - rifle.lowReady -> READY_POSES.low.* +. Close: the other carries keep theirs, so a gun tune made at a wall (the wall
    tuck) is not carried over.
  - pistol.lowReady -> PISTOL_READY.* +.
  - gunFwd / gunSide, rifle aims -> SIGHT_RAISE.z / x +, with PISTOL_REACH.z / x - so the pistol aim stays.
  - gunFwd / gunSide, pistol aims -> PISTOL_REACH.z / x +.
  - sightYAdd -> SIGHT_EYE +.
  - headDropMul -> NECK_WELD x.
  - tuckMul: one rule over all 6 gun groups -> READY_ELBOW_TUCK, READY_ELBOW_TUCK_CROUCH and AIM_ELBOW_TUCK x. Every
    gun state reads max(aim tuck, ready tuck) x tuckMul, and max(a m, b m) = m max(a, b), so it is exact when all 6
    agree; otherwise "manual: shared target".
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

**Stepping.** Every planner reads these, guards included.
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
  `slingBack`, `slingHip`, and each with `.crouch`: `gear.holster.crouch` -> `gear["holster.crouch"]`),
  param = `x` / `y` / `z` (metres, the socket's own frame) or `pitch` / `yaw` / `roll` (degrees). Offsets add (angles
  wrapped to -180..180), the same at run time (base + the tuner's delta) and in the bake (old base + the export's value).
- The key is optional and printed only when a row has an offset (sorted, about 4 significant digits, 0 left out): a
  table without it (every table before anim-gear) parses and prints exactly as before, and old exports bake as before.
- Code: `src/anim/tuneBakeBase.ts`; the runtime table and the per-rig composition `src/anim/tuneGear.ts`. Dev hook:
  `window.__animBase.setGear(row, param, value)`. Test: the literal export in `tests/animGear.test.ts`.

**Keys:** `key.<clip>.<n>` deltas -> `scripts/anim-keys/keys/<clip>.json` through the apply-tune functions. Then
rebake each clip with build.mjs (Blender, headless, under the desktop heavy lock). (marlow-bays item 23, track A) A key's
`time` (bake frames, + later) moves its `phase` to frame / 48 (moved keys only, clamped as in the tuner; key 0 is fixed:
skipped) and regenerates `src/anim/tuneKeysMeta.ts`; an export with no timing edit bakes exactly as before. The live preview stretches the curve piecewise-linearly between
the keys while the Blender bake interpolates with Bezier, so after a rebake the in-betweens differ slightly; the key
poses match.

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

## Tests (`tests/animTuneBake.test.ts`, 22; temp copies in `os.tmpdir()`, never the real tree)
- **Coverage:** every registering file under `src/` is imported and listed; the table covers every slider and group of
  every registered section. Every target is found exactly once in the real tree (read only). The declared sections
  match the registry.
- **tuckMul:** the aim groups alone at 0.6 are manual; all 6 at 0.6 bake, and the tuned max equals the old max x 0.6
  for aim, crouched aim and low ready.
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
   Then run the e2e test tiers.
6. Commit the sources, the key JSONs, the rebaked clips and the ledger in one PR.
7. After the merge, tell Michael to reset the sliders reported "baked" (keeping the manual ones) and export again. The
   old export is spent.

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
