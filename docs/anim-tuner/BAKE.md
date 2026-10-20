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
exports again. The ledger records the export's hash and the baked group|id pairs, so a re-run of the same export is a
no-op ("already baked").

## Results
- **baked:** written into the code value(s) named in the target column. A note in [] says where the bake is only
  close.
- **manual: shared target (values per group):** the groups that read one code value differ. Michael or a job lead
  picks, or a later job adds a per-state table. A slider and group covered by several rules bakes only when every one
  of them bakes: a value is never half in the code and half in the tuner.
- **manual: no code target:** there is no code value to absorb it; the reason is listed.
- **baked (key JSON; rebake the clip):** the Keys section.
- **skipped: no bake rule:** a slider this build does not know (e.g. PR #71's sections before their table entries).
- **already baked:** in the ledger.

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
  - rifle.lowReady -> READY_POSES.low.* +. Close: the other carries keep theirs.
  - pistol.lowReady -> PISTOL_READY.* +.
  - gunFwd / gunSide, rifle aims -> SIGHT_RAISE.z / x +, with PISTOL_REACH.z / x - so the pistol aim stays.
  - gunFwd / gunSide, pistol aims -> PISTOL_REACH.z / x +.
  - sightYAdd -> SIGHT_EYE +.
  - headDropMul -> NECK_WELD x.
  - tuckMul:
    - low ready -> READY_ELBOW_TUCK and READY_ELBOW_TUCK_CROUCH x;
    - aim -> AIM_ELBOW_TUCK x.
  - glideTwistMul -> GLIDE.yawCut x.
- Manual: aimed gunUp, gunPitch, gunYaw and gunCant (the sight-to-eye solve and the aim hold them).

**Camera** (`config/camera.ts`).
- Boom, side, pivot and height bake into the per-state configs: the hip, open, crouch-open, ADS, wall, peek, climb
  presets and duct.
- camFollowMul -> stairRate.
- camBoomRateMul -> boomIn / boomOut.
- camPadAdd -> castPad.
- camBlendMul -> the matching blend rates.
- Manual:
  - FOV (a player setting);
  - zoom (1 without a scope);
  - the aim-in blend (it comes from the weapon's draw time).

**Speed** (all per group, baked directly).
- creep..run -> GEARS.stand / crouch points.
- The glides -> adsSpeed / adsCrouchSpeed, strafeMult and backMult.
- Wall slide -> WALL.slide*.
- Ladder, pipe, shimmy and crawl -> the ATTACH speeds.

**Stepping.** Every planner reads these, guards included.
- Baked:
  - idle lift -> PLANNER.idleLift.
  - lock -> TURN_FOLLOW.twistFree / twistMax / scrubSpeed. Close: the touchdown twist cap reads twistFree too.
- Manual: the rest (clip data, inline literals).

**Weight.**
- Baked:
  - start / stop / turn timings -> CT.* (gameplay).
  - plant, landing, the spring rates and anticipation times -> WEIGHT_BASE.*.
- Manual: the damping sliders (one zeta for four springs) and every add slider (the layer's amount is the slider).

**Joints, Hands & feet, IK strength, Weapon:** manual, no code target. These are local-player tuner tables whose
defaults are all identity.

**Keys:** `key.<clip>.<n>` deltas -> `scripts/anim-keys/keys/<clip>.json` through the apply-tune functions. Then
rebake each clip with build.mjs (Blender, headless, under the desktop heavy lock).

**New sections** (PR #71's `team_*`, `trav`): add rules or manual entries to `tuneBakeTable.ts`, and the module to
`BAKE_CATALOGUE_MODULES` (or a `DECLARED_SECTIONS` entry). The coverage test fails until every slider and group is
covered.

## Assumed decisions (undo)
- **A1** Sliders with no code value are reported manual; no runtime per-state base tables were added. Undo: a later job
  adds base tables and swaps those manual entries for rules.
- **A2** A ledger (`src/anim/tuneBakeLog.json`) makes a re-run of the same export a no-op. Undo: delete the ledger and
  step 7 of `tuneBake()`.
- **A3** Atomic per slider and group: a value bakes only when every rule covering it bakes. Undo: drop the blocking loop
  in `tuneBake()` step 3.
- **A4** Some bakes are close rather than exact (the [] notes). Undo: turn any of those rules into a manual entry.
- **A5** Code that reads a baked constant without a slider follows the bake: other rigs (partner, guards), `cam.hold`'s
  blend, the remote's peekLean normaliser.
- **A6** The rifle aim's position goes into SIGHT_RAISE, with the opposite into PISTOL_REACH so the pistol stays. Undo:
  make those rules manual.
- **A7** The Speed section is declared in the table (plain Node cannot load speedTune); a test pins it to the registry.
- **A8** Results are rounded to 4 significant digits.

## Tests (`tests/animTuneBake.test.ts`, 18; temp copies in `os.tmpdir()`, never the real tree)
- **Coverage:** the table covers every slider and group of every registered section. Every target is found exactly
  once in the real tree (read only). The declared sections match the registry.
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
