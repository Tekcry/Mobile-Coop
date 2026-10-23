# G1 fix round: check

Checker: fresh Opus, read-only review. Branch `feature/gm-g1fix`, reviewed `955b8311..4507101e` (3 commits: WIP save,
fix, report). Rules: `gm-common.md`. No Blender, no e2e.

## Verdict: PASS

No blocking items. Every lead ruling (B1, X1, X2, P1-P4) is done and correct in the code I could check; the Blender-only
paths read correctly but have not run in Blender this round (see polish 1).

## Items
| Item | Result | Evidence |
| --- | --- | --- |
| B1 shield needs `bodies-broad` | ok | `guardBakePlan.mjs` `ownGlbBases`: bases whose kinds use the piece, else `p.base ?? OWN_GLB_BASE`. Real kit and fixture: `gear-shield_riot` needs `['bodies-broad']`, and `bodies-broad` is in its inputs (test). |
| X1 names | ok | `finger<S>_<f>_1` in guard_body.py (`FINGERS`, `mh_bone_to_deform`), guards.json `bones.fingers`, SPEC 6, `lodBones` (lod0 / fold), guardBodyCheck, tests. Matches `FINGER_RE` (fingers.ts:97). No stale old names left in scripts, src, tests or guard-models docs (reports excepted). |
| X1 axes | ok | Fingers 2-5: z = y x palm (R) / palm x y (L), so a turn about +Z (R) / -Z (L) moves the tip toward the palm. Independent check: I parsed `wren-hero.glb` with glb.ts' mirror (t x negated, q (x, -y, -z, w)): Wren's finger local Z vs this rule dot 0.980 / 0.999 / 0.991 / 0.995 (fingers 2-5, both hands); her THUMB_AXES[0] in the (c, along, n) hand frame is (-0.399, +-0.408, +-0.821), exactly `WREN_THUMB_FLEX`. Thumb roll solve (maximise flex . a over z normal to y) is correct algebra. |
| X1 Blender frame | ok | Game local frame = (-B2G(Xb), B2G(Yb), B2G(Zb)) through the glTF export and glb.ts' mirror, so a game-local turn about l is a Blender-local turn about (lx, -ly, -lz): matches `curl_axis` and the roll read-back (`B2G(zb) . zAxis`, fail > 0.5 deg). `B2G` is the inverse of `common.game_to_blender`. |
| X1 check | ok | `checkFingerAxes` builds bind frames from the report and runs the game's own `fingerRig` / `fingerPose`; tests cover good roll, G1's first roll, a flipped roll, old names, a bad thumb dot. |
| X2 seamTransforms | ok | `neck` / `head` maps with the lift folded in, uniform similarity over the seam and the head part with residuals; values are float64 (json-safe). |
| P1 | ok | Neck scale fallback only when the weight already sat at +-1 (`abs(w) >= 1 - 1e-9`) and still wants past it. |
| P2 | ok | Prep job kit = `{id, refHeight, build}` per base; guard-prep / guardJoints read only those. Test: mounts / faceTiles leave the hash, refHeight changes it. |
| P3 | ok | Report `height` = refHeight; `bindJoints` adds `handL` / `handR` (in `tgt`, lifted like the rest); guardBodyCheck checks both. |
| P4 | ok | `crownY` = max y of the lifted body group; SPEC 7 and the G3 note say to read it. |

## Wren byte-identical
No Wren file in the diff (only guard files: SPEC, guards.json, guardBakePlan, guardBodyCheck, build_guard_body,
guard_body, two guard tests, the report). `common.py`, `mh.py`, `build_body.py`, `bake_lods.py`, fingers.ts, figure.ts
untouched; guardBodyCheck only imports fingers.ts. Wren's outputs stay byte-identical by construction.

## Tests
- `npx vitest run tests/guardBodyCheck.test.ts tests/guardBakePlan.test.ts tests/guardJoints.test.ts`: 3 files, 52 passed.
- guards.json readers (the diff edits guards.json): `tests/guardKit.test.ts tests/guardGearFit.test.ts
  tests/guardHeadCheck.test.ts tests/guardVariant.test.ts`: 4 files, 58 passed.
- `npx tsc --noEmit -p .`: clean.
- No loosened asserts: the only changed assert is the shield's gear needs (`[]` -> `['bodies-broad']`, tighter); the rest
  are renames and new tests.
- No `.pyc` in the diff (`__pycache__/common.cpython-313.pyc` is tracked from before, not touched here).

## Polish list (non-blocking)
1. G1-REPORT "Fix round" still has `SMOKE_PLACEHOLDER` and `TESTS_PLACEHOLDER`. Fill Tests (52 in 3 files above).
   The new Blender-only code (roll read-back, axis-angle curl, fingertip `towardPalm` check, `seamTransforms` / `crownY`
   in the JSON) has not run in Blender this round: the laptop bodies rerun (already an open item) plus `guardBodyCheck`
   on its reports is the first real run, before G4 / G1h consume them.
2. `ownGlbBases` takes the bases from `pieceUse`, but `build_gear.py` builds an own-GLB piece on `SHIELD_BASE` whatever
   the kinds say. Same answer on the real kit (enforcer = broad); a kit putting the shield on a non-broad kind would make
   the needs and the built base differ. Prefer `p.base ?? OWN_GLB_BASE[p.id]` first, `pieceUse` as the fallback.
3. `guard_body.THUMB_AXIS0` copies fingers.ts `THUMB_AXES[0]` (not exported) with no drift test; the TS check does not
   catch a drift because the thumb dot comes from the bake.
4. guardBodyCheck does not assert `crownY` or `seamTransforms` are present, though G3 / G4 read them.
5. Test regex `/zAxis not normal to the bone|toward the palm/` accepts either failure; fine, a little loose.
