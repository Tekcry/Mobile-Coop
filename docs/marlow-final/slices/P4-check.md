# P4 checker report (marlow-polish batch P4)

Base 17d44d96. Read-only check; no source or test edits.

## Verdicts
- P4-1 (feature/marlow-p4-a8-step-on, 87dd8f39): PASS
- P4-2 (feature/marlow-p4-a2-deck-skin, 4eb47294): PASS
- Merge: diffs are disjoint (P4-1: a8Strongroom.ts, tests/ctcourse/a8Strongroom.test.ts, slices/P4-1.md; P4-2: a2CarriageShed.ts, tests/ctcourse/a2CarriageShed.test.ts, slices/P4-2.md). They merge cleanly into feature/marlow-polish.

## Must-fix
None.

## Should-fix
None.

## P4-1 findings
- `A8_STAIR_RAIL.from` 67.85 -> 68.15 (a8Strongroom.ts:171). 4th tread starts 67.3 + 3 x 0.285 = 68.155; 68.15 is on the 0.05 grid (5 mm early). Tread 2 centre 67.7275 + 0.3 radius = 68.0275 <= 68.15, so a 0.6 m body steps on across treads 1 and 2 (was tread 1 only). Tread 3 centre 68.0125 + 0.3 = 68.31 > 68.15, still railed.
- Loop (a8Strongroom.ts:973-980): `n = ceil((to-from)/seg - 1e-9)` = ceil(12.4545) = 13; `zb = min(za+seg, to)`. Twelve 0.55 m segments (68.15..74.75) plus a 0.25 m last one to z 75. kit.handrail snaps ends to 0.05 (all on grid) and only skips runs < 0.1 m (0.25 passes). Collision box is a single axis-aligned box per segment, so no gap at the join and the head ends at z 75 on the balustrade ends (x 130.45 / 131.75 both sides). Still 26 boxes (13 x 2); register `solids` 26 unchanged.
- Tests: derived edits only. Old `(to-from)/seg == 13` replaced by floor 12 / ceil 13 / last length in (0.1, 0.55): equivalent strength. Box length assert now `min(seg, to - z)` (tighter). New: walk-on to tread 1 and 2 centres from both sides must be clear; `tread(2) + radius <= from`; tread 3 centre walk must hit the rail on both sides (teeth against a late-started rail). Step-off teeth (with vs without rail boxes), lanes, soloJumpThreats untouched. Nothing loosened.

## P4-2 findings
- a2CarriageShed.ts:420-423: posts at z 17.6-17.64 and zRail-0.04..zRail (18.71-18.75), x = xHead - 0.05 = 61.95, lip..lip+1.0, steelDark (same as the stair posts); top rail at lip+1.0, mid rail at lip+0.5, both LOOK.steel (same as the stair slope rails), spanning z 17.6..18.75. Run is 1.15 m, so two end posts satisfy <= 1.5 m spacing.
- Visual only: built with the local `skin()` helper (collide false, noLedge, throws if no side < THIN 0.05). Every skin side 0.04 < CANON_MIN_THICK 0.05, so none enters the light bake / canonical shapes. The collision (kit.handrail at the same line) is unchanged; no new prop, no light change. A2-17 register `solids` count unchanged.
- Test (a2CarriageShed.test.ts:1145+): exact count 4, post/rail geometry and colours against the stair's own skins, collide false, noLedge, thin, not in `solid`, `deckEnd` still exactly 1. Has teeth.

## Polish list (cosmetic, non-blocking)
1. a8Strongroom.ts:44 (file header) and the A8-19 `tally` description (~:955) still say "from the third tread"; the code and the :168 doc comment now say fourth. Text only.
2. The 0.25 m last rail segment gets its glass visual tiled at 1 module squeezed to scale 0.25/1.5 (kit `tileRun`); a thin glass sliver at the head. Cosmetic.
3. A2 top rail (lip+1.0 +-0.02) stands 0.02 m above the post tops (post top = lip+1.0). Negligible; the stair's own posts sit the same way.

## Commands and counts
Run in each worktree separately:
- `npx tsc --noEmit -p tsconfig.json`: exit 0 in both.
- `npx vitest run tests/ctcourse/a8Strongroom.test.ts tests/ctcourse/a2CarriageShed.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`:
  - P4-1: 5 files passed, 187 passed | 1 skipped (188).
  - P4-2: 5 files passed, 188 passed | 1 skipped (189) (one more test: the new skin test).
  - The 1 skipped is present in both (pre-existing).
- `git diff 17d44d96..HEAD --name-only` per worktree for the disjointness check.
