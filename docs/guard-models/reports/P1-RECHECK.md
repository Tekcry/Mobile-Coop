# P1 re-check (after the fix round 9029cb72, 88ba424b, 7488d74d)

Checker: fresh Opus, read and test only, head 7488d74d, 2026-10-23 ~21:45. **Verdict: PASS.**

## Findings from the a63e82ca FAIL
1. G6 kit ids outside the kit pools: closed. `src/operators/guards/guardVariant.ts:49-221` builds every pool from
   guards.json at load. Enumeration (128 seeds x 7 kinds x 3 maps x 8 gear-bit sets): 0 ids outside the kind's lists,
   0 duplicates, 0 wrong bases, 0 missing fixed gear / outfit, shield on the enforcer only. Per-base union of shown ids
   = the bake's gear jobs (average 12, lean 8, broad 4, shield 1).
2. GB normalizeKit: closed. `scripts/operators/guardBakePlan.mjs:138-203`: outfits are garment parts per base; gear per
   base = the union of its kinds' lists; unknown ids throw; `haircaps-<base>` in heads; upstream resolved by job id
   (`guard-bake.mjs:72-90`).
3. Strict A5: closed. helmet_heavy is gameplayGear for heavy / enforcer; `applyGear` draws a helmet only with the bit
   (:336, :355); 0 mismatches in the enumeration.

Job counts (dry runs and by hand): bodies 3, heads 11, garments 16, gear 25, lods 4, check 4, sheet 1.
Hot paths: lookups into caller-owned buffers, no per-call allocation. No loosened asserts. New defects: none.

## Polish list (not blocking)
1. PLAN.md section 4 still shows helmet_heavy as fixed gear and the enforcer with vest_soft (SPEC section 3 supersedes).
2. P1-FIX-REPORT counts stale: guardBakePlan 33, total 86.
3. `tests/guardBakePlan.test.ts:101`: title says "rigid_skin", asserts `build_gear.py`.
4. GB-REPORT job contract lacks the haircaps row, the `build_gear.py` default and garments `--variant rolled|work`.
5. `validateGuardKit` could reject a `helmetPiece` in `fixedGear` (A5 now held by data + `guardVariant.ts:216`).
6. Lean boots are one job shared by `uniform_rolled` and `work`; G4 / G5 map outfit -> parts and tag shared parts.
7. A garment job's kit slice carries the part's full `bases` list (adding a base rebakes the others; safe).
8. `guardVariant` imports all of guards.json (19 KB) into the runtime bundle.
9. `GuardBase` is an interface in `guardKit.ts` and a string union in `guardVariant.ts`.
10. Strict A5: a calm heavy shows balaclava + plate, no helmet (intended; flag for Michael's look review, G10).

## Tests
`npx tsc --noEmit -p .` exit 0; vitest guardKit / guardBakePlan / guardVariant / guardLook: 86 passed.
