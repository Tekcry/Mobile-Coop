# G4b report: the guard budget check

Branch `feature/gm-g4b` (off `feature/guard-models` 7488d74d). Pure JS / TS, unit tests only: no Blender, no GPU, no
`src/` game change.

## Files
- `src/operators/guards/guardBudget.ts` (new, pure: no Babylon, no fs): the bake report shape, `checkGuardReport(report,
  kit): string[]`, `guardReportFiles(kit)`, `guardLodFile(id, lod)`, `pieceLod0Cap(piece)`.
- `scripts/operators/check-guards.mjs` (new CLI).
- `tests/guardBudget.test.ts` (new): a clean synthetic report per base and for the shield pass; one broken copy per rule
  gives its problem (48 rules); malformed input gives problems, never a throw.
- `tests/guardAssets.test.ts` (new): a GLB reader self-test on a synthetic file (always runs); the bundled-GLB checks are
  `it.skip` with a message while `src/operators/assets/guards/` is absent.

## Limits used
- From `guardKit.ts` `GUARD_LIMITS` (imported, not copied): shown and buffer tris per LOD, head per LOD, eyes LOD0, hair
  cap LOD0 / LOD1, rig and finger bone counts, per-piece LOD0 caps.
- New in `guardBudget.ts` (PLAN section 5 budgets with no constant in guardKit.ts): `GUARD_INFLUENCES` 4 / 4 / 2,
  `GUARD_DRAWS` 1 per file, `GUARD_ATLAS` albedo 4096 x 2048 / 2048 x 1024 / 512 x 256 and normal / ORM 2048 x 1024 /
  1024 x 512 / 256 x 128, `GUARD_ATTRIBUTES` `_PIECE`, `_TINT`.
- From the kit data (`guards.json`): every piece, head, hair cap and body count per LOD is also capped by its own kit
  budget (the tighter of the two wins, one problem line per breach); bone names; the shield's texels.
- Structural rules: eyes 0 below LOD0 (merged into the head), hair caps 0 at LOD2 (in the albedo), bald has no entry.

## Report JSON shape (what `bake_lods.py` guard mode writes)
One file per base, `lods/guard-<base>.report.json`, and one per own-GLB piece, `lods/guard-shield_riot.report.json`:
```json
{
  "version": 1,
  "base": "average",
  "lods": [
    {
      "lod": 0,
      "file": "lods/guard-average-lod0.glb",
      "bufferTris": 42000,
      "draws": 1,
      "bones": ["root", "body", "...23 rig joints...", "fingerL_1", "...10 fingers at LOD0 only..."],
      "influences": 4,
      "attributes": ["POSITION", "NORMAL", "TANGENT", "TEXCOORD_0", "JOINTS_0", "WEIGHTS_0", "_PIECE", "_TINT"],
      "textures": [
        { "role": "albedo", "width": 4096, "height": 2048, "format": "ktx2" },
        { "role": "normal", "width": 2048, "height": 1024, "format": "ktx2" },
        { "role": "orm", "width": 2048, "height": 1024, "format": "ktx2" }
      ],
      "shownTris": { "grunt": 17400, "droneOp": 17250, "officer": 17750 },
      "bodyTris": 1200,
      "headTris": { "average-1": 4000, "average-2": 4000, "average-3": 4000, "average-4": 4000 },
      "eyeTris": 500,
      "hairCapTris": { "buzz": 500, "crop": 800, "sidepart": 1000, "receding": 800, "fade": 700 },
      "pieceTris": { "uniform": 5500, "uniform_jacket": 6500, "cap": 600, "...": 0 }
    }
  ]
}
```
- `lods`: exactly LOD 0, 1 and 2. `file`: the GLB relative to the bake out dir (guardBakePlan.mjs outputs).
- `bufferTris`: every triangle in the file (hidden heads, caps and pieces too). `draws`: mesh primitives.
- `bones`: skin joint names; a base: exactly `bones.rig` (+ `bones.fingers` at LOD0); a piece: only its declared bones.
- `influences`: the largest count of non-zero weights on any vertex.
- `textures`: one each of albedo, normal, orm (one material); `format` must be `ktx2`.
- Base only: `shownTris` per kind of the base (worst case: body + largest head + eyes + largest cap + each pool's largest
  pick + fixed, gameplay and kit pieces; the enforcer's shield counts, as guardKit `shownTris`); `bodyTris`;
  `headTris` per head variant of the base; `eyeTris`; `hairCapTris` per meshed cap the base's kinds wear (0 at LOD2);
  `pieceTris` per piece in the base's buffer (outfits, headwear, eyewear, gear, kit; not the shield). A missing or extra
  id is a problem.
- Piece report: `"piece": "shield_riot"` instead of `base`, and none of the base-only fields. Textures: the piece's
  texels (512 x 512) at LOD0, half at LOD1, quarter at LOD2; normal / ORM half of that.

## CLI
`node scripts/operators/check-guards.mjs [dir] [--kit file] [--json]` (it registers `ts-resolve.mjs` itself, so the
plain `node` call imports `guardBudget.ts` through Node's type stripping; `--import ./scripts/operators/ts-resolve.mjs`
as the other operator scripts use also works). Default dir: the GB out dir (`guard-bake.mjs` `DEFAULT_OUT`).
- Reads `<dir>/lods/guard-*.report.json`, prints PASS / FAIL and the problems per report.
- An expected report that is absent is a note, not a problem (a partial bake can be checked); `guardAssets.test.ts`
  requires the full set once bundled.
- Exit 0 all within budget, 1 any problem (an unreadable JSON is a problem), 2 nothing to check (no `lods` folder, no
  report) or a bad argument.
- Run on cloud: missing dir exit 2; empty `lods` exit 2; one clean `average` report exit 0; the same with 46,000 LOD0
  buffer tris and a PNG albedo exit 1 (two problems); `--json` prints `{ dir, kit, reports, missing, problems, pass }`.

## Decisions assumed
- The piece caps are hard caps (no tolerance): the bake decimates to at most the kit number.
- No `package.json` script (not in the brief's file list); G4 can add `operators:check-guards` or call it from
  `check_guard.py`'s stage.
- `guardAssets.test.ts` reads textures from the material slots (base colour, normal, metallic-roughness or occlusion)
  and the KTX2 header's pixel size; `influences` counts WEIGHTS_0 (+ WEIGHTS_1).

## Tests
`npx vitest run tests/guardBudget.test.ts tests/guardAssets.test.ts tests/guardKit.test.ts`: 3 files, 66 passed, 1
skipped (the bundled-GLB check). `npx tsc --noEmit -p .` clean; eslint clean on the TS files (the `.mjs` is in the
eslint ignore pattern).
