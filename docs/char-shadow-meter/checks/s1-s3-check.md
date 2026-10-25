# S1 + S3 check (char-shadow-meter, J16)
Owner: Sector Ops Build. Checker: Opus (fresh), 2026-10-25. Heads: S1 da057345c (`feature/char-shadow-meter`, from
plan commit 64628b9eb), S3 a88b998df (`feature/char-shadow-meter-s3`, from interface commit b3e70c165).

## Verdict
- **S1: PASS**
- **S3: PASS**

No blocking fixes. One item is required in S3b (below), and the PR A split is advised.

## What was checked
- Intent: G352 / bible P1 (meter and guards read the character shadows the picture shows), Q14 "A faint cue" (S3 gives
  data only; nothing in shadowCues.ts knows about guards). Both match BRIEF and PLAN sections 1-4.
- Capsule formula: `capsuleTransmit` (charOccluders.ts:191-273) is the GLSL `lampCapsule` line for line. The
  generated `LAMP_CAPSULE_GLSL` (charOccluders.ts:281-301) is byte-identical to the inline text it replaces in
  bakedLamps.ts (1.6 / 0.35 / 0.12 / 0.15 come from `CAPSULE` through `glf`), so the picture is unchanged. The test
  compares TS against an independent reference port with literal numbers on 10k cases (umbra, soft edge and clear
  branches each > 500 cases) and checks that `LAMP_GLSL` defines `lampCapsule` once.
- Broad phase (charOccluders.ts:117-131): the grow `r(1 + penR) + penBehind x |segment|` bounds `r + pen`, so a
  culled capsule would read exactly 1. Brute force equals the broad phase to the bit on 60 random scenes.
- Field term (lightField.ts:414-456, :597-611): the moon source is `p + moon.dir x 60` (`dir` points to the moon,
  lightBake.ts:36). Column lamps are scaled only at `>= CHAR_LIGHT.minLevel`, and non-baked lights after the
  occluder and door tests. With no contract (or null) the old path runs unchanged, and the test confirms the same
  values to the bit on 500 points. Every existing lightField test is unchanged and green.
  `sourcesInto` / `sourceAt` match the set and sum to `totalAt`.
- Holder rule A5: `holdsQ` uses distance to the axis `< r + 0.6`. In the flashlight test a held torch is not shaded
  by its holder, and a guard standing in its beam shades it.
- Flag: `charShadowLight: params.get('charlight') === '1'` (default off), tested. Nothing reads it yet (S2 wires it).
- Gameplay never reads graphics state: charOccluders.ts imports nothing. charShadowSet.ts (the picture) imports
  `CHAR_LIGHT` from it, never the reverse. In the merged tree the isolation grep now also reads shadowCues.ts and
  passes.
- Owned files only: S1 touches flags, bakedLamps, charOccluders, charShadowSet, lightField, the two tests and job
  docs. S3 touches shadowCues.ts, its test and its report. All are in the claims block and slice rows.
- S3 footprint geometry (shadowCues.ts:266-337): the lamp projection lands on the feet plane, and so does the moon
  projection (`top - dir x h / dir.y`). An overhead lamp clamps to length r, and a source at or below the top gives
  `maxLen`. `level(q)` uses the contract with the player's own key skipped. Speed is matched by source id.
- S3 interface drift: the interface commit's signatures equal S1's head (S1 only adds members). The S3 files on S1's
  head typecheck and pass, with the real `LightField` (see below).

## Runs (CPU gate under 90% met before each)
- S1 tree: `npm run typecheck:fast` clean; `vitest --maxWorkers=2` charOccluders, lightField, charShadowSet,
  lampFalloff: 4 files, 73 / 73.
- S3 tree: typecheck clean; shadowCues 16 / 16.
- Merged scratch tree (S1 head plus S3's two files, temporary detached worktree, removed after): `tsc` clean;
  shadowCues + charOccluders 28 / 28 (the isolation grep includes shadowCues.ts). I added one test (not committed) with
  the real `LightField` (2 lamps plus the moon, 4 players). Every player gets 2-3 footprints, the near points show
  0.3-0.6 contrast and the far points fade to 0. A 4-player `fill` allocates **5264 B** (about 69 B per field call,
  about 19 calls per player). The cause is V8 boxing double arguments and results at the field boundary, inside the
  field's existing `BOXED_BUDGET` (72 B per call); the class itself allocates 0 B.

## Required in S3b (not a fix to S3)
1. **Measure and gate the fill's allocation with the real field.** At 10 Hz with 4 players, the fill makes about
   52 KB/s of short-lived garbage, about 10x the meter's own boxing. Done looks like: either an allocPerCall check in
   S3b with the real field (per fill <= 19 x 4 x `BOXED_BUDGET`, logged in the build report), or, if the lead wants 0,
   a typed point input on the field (`sourceAtQ` / `totalAtQ` reading a `Float64Array`, as `CharOccluders.q` does).
   The second option is an S1-file change that goes on the job branch before S3b.

## Polish (not blocking)
1. A5 applies to every source in the meter, but the picture's `lampCapsule` loop has no holder rule for baked lamps.
   A character whose axis passes within r + 0.6 m of a baked lamp (on a crate under a low pendant, beside a wall
   sconce) shades it in the picture but not in the meter. Either restrict `holds` to non-baked lights in
   `transmitQ` (charOccluders.ts:145; the moon can never be held) or log it in lighting.md's known limits (S2).
2. S3 contrast (shadowCues.ts:230-235) uses the unshadowed `L_s(q)` over a level that already includes other
   characters' shadows. Where a partner's shadow overlaps, the cue reads stronger than the real darkening, and the
   0.85 clamp hides only the extreme case. Multiply `ls` by the others' transmit (`occ.transmitInto(source, q, key)`
   with the player's own key skipped), or tell Guard AI in the cue contract. The 0.85 clamp itself is a sound deviation.
3. The charOccluders test builds its expected GLSL text with JS `String(n)`, while the source uses `glf`. If a
   `CAPSULE` constant becomes an integer (e.g. self 2), the test breaks although the shader is right. Use the same
   formatter in the test.
4. `capsuleTransmit` returns 1 for r <= 0, and GLSL does not (its loops stop at r <= 0 first). This is harmless;
   one comment line would cover it.
5. lightField's `expected()` helper takes the set from `sourcesInto`, the code under test. The separate
   `sourcesInto` test checks the set independently with `lampAt >= minLevel`, so this is covered, but noting it.

## PR A split advice
S1 alone is about 1.25k changed code and test lines (charOccluders 301, lightField +226 / -13, bakedLamps 23,
charShadowSet 9, flags 4, tests 679), plus about 650 lines of job docs. S2 adds about 440, so S1 + S2 comes to about
1.7k, over the ~1.5k cap. Split:
- **PR A1 = S1** (contract, formula, field term, `sourcesInto` / `sourceAt`, flag, tests, job docs). It is pure
  world code with no caller: the flag gates nothing yet and every path without a contract returns the same values as
  before, so it can merge alone with affected-e2e only. Guard AI can branch from A1, because they need the contract
  and `CharOccluders` only.
- **PR A2 = S2** (charOccluderFill, gameState wiring, the picture feed, lighting.md; ~440 lines) with its
  e2e-coop and e2e-netmove runs. Player branches from A2, because they need the fill at gameState:1660-1701.
PR B stays as planned (S3 + S3b + S4 + S5, ~0.93k plus the S3 test overrun: shadowCues test 465 vs ~250, so about
1.15k; still under the cap).
