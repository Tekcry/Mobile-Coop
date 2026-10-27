# G10a check (Sonnet checker, 2026-10-24)

Head 2d810799 on feature/gm-g10a, base 1569b0f8. Read-only review of `git diff 1569b0f8..2d810799` against
`C:/NightShift/scratch/ctcore/briefs/gm-g10a.md`. Python read by eye (no `python` here); no Blender, no lock taken.

## Verdict: FAIL (one blocker, a one-line fix; it would crash the broad `lods` job)

## Blocker

1. `scripts/operators/py/bake_guard.py:718` (D6): `out = [pokes(q) for q in pts]` rebinds `out`, which is `run_base`'s
   output directory (`out = args.out`, `:558`), to a list. The D6 block runs for broad-1 (heavy / enforcer, the only
   face-covered head), so afterwards `os.path.join(out, 'heads', ...)` at `:926-929`, `:940` (`lods_dir`) and
   `os.path.relpath(path, out)` at `:1095` / `:1109` raise `TypeError` (list is not a path). `lods-broad` fails after the
   long Cycles bake; average / lean are unaffected (no face-covered head), which is why the desktop smoke could not see it.
   Fix: rename the local to `outside` at `:718`, `:719` and `:721` (`poking[p.index] = any(outside)`,
   `zip(pts, outside)`). I checked every other name the block binds (`tree`, `keep`, `me`, `mi`, `centre`, `covered`,
   `poking`, `tris`, `seam`, `bal`, `rot`, `mw`, `pts`, `kinds`, `c`, `n`, `p`): none is read later without being
   reassigned first, so `out` is the only clash.

## Per defect

- D1: `guardSheetRig.ts` matches `enemyRig.ts:22-28` minus `merge` and `figure`; `guardSheet.ts` uses `sheetRig` /
  `missingPieces` (SHIELD_ID skipped); x placement reversed in both places (`guardSheetPlan.mjs:213`, `:284`);
  `guardSheetRig.ts` is in `SHEET_FILES`. Tests exercise it (every human kind x 3 factions, a control rig that does draw
  glow, strictly decreasing x). OK.
- D2: only `skinTones` changed in guards.json; values match the brief; `guardKit.ts:270-275` clamp error for skin and
  hair; tests present and pass. `guardTints.ts` untouched. OK.
- D3: garments rescaled per channel in linear to 0.4 (x 0.78 trousers / work_trousers) for slots uniform / kit /
  headwear, `none` untouched, alpha kept, `albedoMean` keyed `lod<n>.garment:<part>` exactly as `guard-check.mjs` reads
  it (bake JSON `lods/guard-<b>.bake.json`, which is where the Python writes it). `rec_of[key]` cannot miss (same
  `bake_jobs` source as `imgs`). Check is +-15 % per channel, a missing field or region fails; sound (the bake scales to
  the exact neutral, so good output passes with room; Wren's 0.03 fails). OK.
- D4: Python reads as valid (names, argument order, `t` stays per-vertex through `drop_cap_islands`, `cf` list into
  `new_mesh_obj`, measure called after the snap). Limits per brief (1.5 / 3 mm, 75 deg, missing field fails). See risks.
- D5: `RUNTIME_ONLY` out of `bakeShared`, used by `slice` and `g4Slice`; the sheet keeps `shared`. Grep confirms no bake
  or check script reads the three keys (only `guardSheetPlan.mjs`, `guardTints.ts`, `guardKit.ts`). Shape sections
  (bases, heads, garments, pieces, kinds, budgets, tintNeutral) still hash into every kit job, so a shape change still
  rebakes. The test covers every job of every stage. OK.
- D6: diagnosis numbers are in the report and the approach matches the brief (ray method, eye slot and seam ring kept,
  `coveredHeadTris` per LOD / head). Apart from the blocker the block reads correct (`seam_pairing(...)[0] >= 0` is per
  head vertex, `drop_faces` keeps the `mh_index` attribute, the seam ring faces always stay). `checkCoveredHeads` needs
  `dropped > 0` at all three LODs; test present.
- Scope: no change to `src/ai`, the runtime, `guardTints.ts` or any guards.json section but `skinTones`.

## Run

- `npx tsc --noEmit -p .` clean.
- vitest one file at a time: guardSheetRig 3, guardSheetPlan 22, guardKit 15, guardResolve 10, guardLods 22,
  guardHeadCheck 18, guardBakePlan 39: all pass (guardAssets / guardAssetsReport not touched by the diff, not rerun).
- `guard-bake.mjs --stage sheet --dry-run` and `--stage lods --dry-run` print the plan; `guard-sheet.mjs --dry-run`
  parses (reports the missing inputs).

## Risks for the queued rebake (not blockers by the brief's rule)

- The queued rebake on 2d810799 will fail at `lods-broad` (the blocker); heads / garments / gear / average / lean lods
  would be wasted if it is not fixed first. Recommend the lead cancels, applies the 3-token rename, and requeues.
- D4 `receding` LOD1 maxTurnDeg was 90.5 in the last desktop run (before the spacing passes and the 8-tri reserve, which
  are smoked offline only). If it still tops 75, `guardHeadCheck` fails the heads stage and holds the chain; the builder
  already names the next step (lower `despike` angle) or raise the limit for receding LOD1 (Michael / lead call).

## Polish

- `maxDevMm` is measured against the same polyline the vertices were snapped onto, so it is near zero by construction
  and cannot catch a bad contour; the 75 deg turn limit is the real check. Measuring against the raw dense boundary
  would be a meaningful number.
- `close_pinholes` on LOD1 caps adds faces with no UVs (zero UV, a pinhole-sized patch at the hairline).
- `snap_loops` `par[i] = (... ) % L` can wrap to a small value for a vertex between the last placed vertex and the loop
  start, which then misleads the relax pass at that stretch (cosmetic).
- `CHECK_FILES` carries `guardKit.ts` (now with the clamp rule) but a colour-only edit no longer reruns check; the
  vitest `guardKit` test is the guard for tone / hair values.
- `guard-lods.mjs` does not copy `albedoMean` / `coveredHeadTris` into `report.bake` (the builder's open item); fine.
- `coveredHeadTris` rule (`dropped > 0`) is a presence check, not a size check; the sheet look is the real proof.
