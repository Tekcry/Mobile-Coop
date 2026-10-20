# anim-bake check (fresh checker, commit aba2c44c)

## Verdict: FIX

There are 2 blockers. In each, a row is reported "baked", but after the bake and the slider reset the game no longer
shows what Michael tuned. Everything else holds:
- The maths of every other sampled rule is exact, or "close" as its note says.
- The shared-target guard, the atomic rule, the write roots, the refusals, CRLF handling and the ledger all work.

What was run:
- `npx vitest run tests/animTuneBake.test.ts`: 18 / 18 pass.
- `npx tsc --noEmit -p .`: clean.
- `npx eslint` on the 3 TS files: clean (the `.mjs` file is ignored by the config).
- `--dry-run` on the real tree, with a 50-entry export covering every section: `git status` was identical before and
  after.
- A real run on a scratch copy of `src/` and `scripts/`:
  - every written value was checked by hand against its hook site (below);
  - CR / LF counts were identical before and after in all 5 edited `.ts` files;
  - the ledger was written, and a re-run of the same export wrote 0 files.

Hook sites checked (game value while the slider is set vs the baked code value):
| Rule | Hook | Result |
| --- | --- | --- |
| strideMul -> stepLen0 / K / Max, CROUCH_STEP, WALK_STEP.k, TENSE.step, GLIDE_STEP lengths | `motion.ts:129-138`, `stepLength * strideMul` | exact: `stepLength` is homogeneous of degree 1 in exactly these lengths (WALK_STEP.to / blend are speeds; GLIDE_STEP.back is a share) |
| peekLeanMul -> WALL.peekLean | `tune.ts:551` `p.lean * mul` | exact: the normalisers (`player.ts:446`, `remoteAvatar.ts:484`, `animGraph.ts:1543` WALL_KEYS.peekLean) give the same ratio |
| kneeOutMul / kneeLiftMul (climb) -> CLIMB_KNEE_OUT / UP | `characterRig.ts:2784-2785` | close, as the note says |
| gunFwd / gunSide (rifle aims) -> SIGHT_RAISE +, PISTOL_REACH - | `characterRig.ts:2069` (inside the mirror), `animGraph.ts:1204-1211` | exact at full raise; the pistol is unchanged |
| gun* rifle / pistol lowReady -> READY_POSES.low / PISTOL_READY | `characterRig.ts:2069-2074`, `animGraph.ts:1178, 2005` | exact for the open-ground low carry (the wall tuck is not shifted: the note says so) |
| sightYAdd -> SIGHT_EYE; headDropMul -> NECK_WELD; glideTwistMul -> GLIDE.yawCut | `characterRig.ts:2812, 1924`, `animGraph.ts:1894` | exact |
| camBoom / Side / Pivot / Height / Pad, camFollow, camBoomRate | `shoulderCamera.ts:338-340, 343, 403, 415-416, 433, 436`, `framing()` | exact; the pivot's crouched-aim residue matches its note |
| camBlendMul -> toTight / toOpen / adsOutRate (div), preset blends (mul) | `shoulderCamera.ts:289-354` | the direction (time x m = rate / m) is right; see S1 |
| Speed paces -> GEARS points; slides; attach speeds | `speedTune.ts`, `wallController.ts:566`, `attach.ts:439` | exact at the points; see S2 |
| glideStrafeMul / glideBackMul | `speedGlideMul`, `movement.ts directionMult` | exact |
| step lift -> PLANNER.idleLift; lock -> twistFree / twistMax x, scrubSpeed / | `footPlanner.ts:362, 389, 633-682, 779` | exact (idle steps run only when not moving) |
| weight CT.* and WEIGHT_BASE.* | `motion.ts:451, 488, 549-550`, `weight.ts:391-447` | exact (`(landTime + perM f) x m` distributes) |
| Keys | `applyKeyEdits` (degrees into the key JSON) | the existing apply-tune path; round trip byte-identical on all 28 key files |

## BLOCKERS

### B1. tuckMul: the aim and low-ready rules share targets through a `max` (`src/anim/tuneBakeTable.ts:186-187`)
The hook is `characterRig.ts:2577`:
`tuck = max(AIM_ELBOW_TUCK * aimK, READY_ELBOW_TUCK + (READY_ELBOW_TUCK_CROUCH - READY_ELBOW_TUCK) * cr) * tuckMul`.
- The aimed states also read READY_ELBOW_TUCK(_CROUCH) through the `max`. The low-ready rule bakes into those
  constants but lists only the low-ready groups, so a low-ready tune leaks into the aim.
- The aim rule scales only AIM_ELBOW_TUCK, so the `max` can switch to the ready tuck.
- Reproduced with the 4 aim groups at 0.6:
  - tuned crouched aim: max(0.85, 0.8) x 0.6 = **0.51**;
  - baked: max(0.51, 0.8) = **0.8**.

  The tune is lost in rifle.aimCrouch and pistol.aimCrouch, but the row says "baked".
- The other way round: a low-ready tuck of 1.2 gives the crouched aim 0.96 after the bake, where the tuner showed 0.85.

**Fix:**
1. Replace both rules with one rule over all 6 gun groups (`ALL_GUN`), editing READY_ELBOW_TUCK, READY_ELBOW_TUCK_CROUCH
   and AIM_ELBOW_TUCK, all `mul`. This is exact when all 6 agree (max(a m, b m) = m max(a, b)); otherwise the guard
   reports "manual: shared target".
2. Update BAKE.md (the Gun tuckMul lines).
3. Add a test with the aim groups at 0.6 and the low-ready groups at 1: the result is "manual: shared target".

### B2. glideFwdMul -> adsSpeed / adsCrouchSpeed is exact only at the aimed cap (`src/anim/tuneBakeTable.ts:250`)
The tuned glide (`playerController.ts:487`, `movement.ts paceSpeed`, `speedTune.ts speedGlideMul`) is
`min(v, adsSpeed) x (fwd f + x strafe s + back backM k) / w`. The tuner scales the whole glide.

After the bake it is `min(v, adsSpeed f) x (fwd + x strafe s / f + back backM k / f) / w`. Below the cap (pad stick
speed `v` < adsSpeed, the bottom ~45 % of travel; crouched below 1.0 m/s), with f = 1.3 and v = 1.0:

| Direction | Tuned | Baked | Effect |
| --- | --- | --- | --- |
| Forward | 1.30 m/s | 1.00 | f is lost |
| Strafe | 0.50 | 0.385 | divided by f: the wrong direction |
| Back | 0.75 | 0.577 | divided by f: the wrong direction |

The row says "baked", and its note does not mention this.

**Fix:**
1. Make `glideFwdMul` a manual entry, reason: "the tuner scales the whole aimed glide; adsSpeed only caps it, so below
   the cap the forward speed would lose it and the strafe / back shares would drop by 1/f".
2. Drop the rule and update BAKE.md (Speed).
3. Add a test for the manual result.

glideStrafeMul and glideBackMul stay: they are exact at every speed.

## Should fix (not blocking)
- **S1. The preset blend-out is read by the next state's group** (`tuneBakeTable.ts:223-226`).
  - The hook is `shoulderCamera.ts:335`: `4 / (preset.blend * K.camBlendMul)`. After detaching, `attachPreset` is
    kept, so the blend-out runs under the destination group's camBlendMul (explore, lowReady, ...), not cam.wall,
    cam.climb or cam.vent.
  - Example: wall 1.5, explore 2. The tuned wall blend-out was 0.25 x 2 = 0.5 s; after the bake it is 0.375 s.
  - Likewise `adsOutRate` is read on an aim release while on a wall (cam.wall), and `toTight` / `toOpen` are read in
    cam.hold (no slider there).
  - Fix: add "close: the blend-in only; the blend-out was the next state's" to these rules' notes, or list the
    destination groups so they become shared targets.
- **S2. The GEARS points drive more than the speed** (`tuneBakeTable.ts:244-245`). After a bake these move with the
  point; in the tuner they did not:
  - the effort map (`effort.ts:27`): the gait's clip mix at the new speed;
  - the integer gear bands (`speedGears.ts:185-186`: the roll, the fence rattle, the wire's pace band);
  - the stepping gait bands (`tuneStep.ts:43-49`);
  - the weapon's moving-spread speed (`weaponStats.ts:91`, GEARS.stand[3]).

  This may be what Michael wants (the walk point *is* the walk), but it is gameplay. Fix: say so in the rule note and
  in BAKE.md (Speed), so the dry-run table shows it.
- **S3. A not-reset slider in a new export bakes twice** (`tuneBake.ts:493, 668`).
  - The ledger guards only the identical export (its hash). Michael keeps tuning in the live build, and his
    IndexedDB still holds the baked values. Any later export with one more change has a new hash and bakes the old
    values again: doubled.
  - Fix: store `group|id=value` per baked entry. In a later export, a changed value equal to a value baked before for
    the same group|id is reported "already baked? (same value as the bake of <date>)" and not written (or the bake is
    refused unless `--rebake`).
- **S4. The coverage test cannot see a new section's module** (`tests/animTuneBake.test.ts:8-10`).
  - The test only sees the sections its own imports register. When PR #71's `moveTune.ts` lands, adding it to
    `BAKE_CATALOGUE_MODULES` is not enough: the coverage test passes unless the test also imports the module. Without
    that, the script reports its sliders "skipped" (this is safe: nothing is written).
  - BAKE.md says "The coverage test fails until every slider and group is covered". That is not true today.
  - Fix:
    - import every module in `BAKE_CATALOGUE_MODULES` (and speedTune / weightTune) in the test;
    - add a test that greps `src/` for `registerTuneSection(` and asserts that each registering file is in
      `BAKE_CATALOGUE_MODULES`, or declared, or keys.

## Polish
- `tuneBakeTable.ts:267`: the lock rule includes step.idle. `twistCap` and `band` run only while moving
  (`footPlanner.ts:340, 344`), so the idle lock does nothing. Leaving it at 1 makes every lock bake "manual: shared".
  Fix: drop step.idle from the rule and add a manual entry ("no effect while still").
- `tuneBake.ts:505-506`: the rows of unknown sliders ("skipped: no bake rule") are not counted in `manual`. The summary
  said "0 manual or skipped" next to a skipped row.
- `scripts/anim-tune-bake.mjs:24`: `--only` with no list (or `--only=`) silently bakes every section. Refuse it.
- `scripts/anim-tune-bake.mjs:99-102`: the writes are sequential. An IO error part way leaves a half-baked tree (the
  validation before writing is good). Write to `*.tmp` files first and rename, or print the written list on failure.
- pipeMul: `attachController.ts:700` passes the base `sp.speed` to `pipe.speed()` in pipeH legs mode, without the
  tuner's multiplier, so the bake also changes that mode. Add it to the note.
- camHeightAdd: `CAMERA.height` is also the low-space reference (`shoulderCamera.ts:374`). Low spaces shift slightly
  after the bake. Add it to the note.
- camPivotAdd: `pivotStand` / `pivotCrouch` also set the open-space probe origin (`shoulderCamera.ts:312`). This is
  minor.
- rifle.lowReady gun rules: the note says the wall tuck keeps its pose. Say in BAKE.md that a gun tune made at a wall
  is not carried over.
- Tests: there is no script-level dry-run test (verified by hand here) and no CRLF fixture (only the line count is
  checked).
