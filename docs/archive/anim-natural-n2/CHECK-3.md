# anim-natural N2 - step 2 + A12 check (fresh checker, 21106003)

2026-10-22 ~16:35, written by the job lead from the checker's hand-back. Verdict: PASS (no blocker). Single files only
(crabFacing with CRABF_PRINT, bodyMotion, animSkeletonIdentity, animSkeletonGuardIdentity, keyedWalk,
runKeyContinuity, animAudit; `tsc --noEmit` clean). No e2e, check or build inside the checker.

## Findings
1. CHECK-2 findings 1-3 resolved and still resolved after the 14cbecc2 merge. Facing knee-out / limit (cm): walk
   3.4 / 3.5, walk 2.1 3.5 / 3.7, jog 3.1 / 3.4, low ready walk 3.3 / 3.5, low ready jog 3.1 / 3.4, crouch rows
   2.3-2.4 / 3, aim rows 2.3-2.8 / 3, idle 3.4 / 9.3. Tracks within limits (walk 3.2 / 7, crouch up to 6.4 / 8, aim side
   18.2 / 20). Run headFollow 0.18 (run head yaw 2-6 deg asserted). Walk 2.1 sway 3.4 cm < WALK_SWAY_WREN 5.
2. A12 row mapping checked against GEARS.stand (0.75 / 1.4 / 2.1 / 3.0 / 4.0): e2e walk -> walk 1.4 via BODY_GAIT.walk
   (the stricter 3.5, not BODY_STATE.straight 3.7); BODY_STATE.straight -> walk 2.1; BODY_GAIT.jog -> jog 3.0;
   BODY_DRAWN readyWalk / readyJog -> low ready rows; idle CRAB_IDLE + BODY_STATE.idle. No limit looser than master's;
   a missing table throws, a missing key fails the type check, a removed widening falls back to 3 cm (stricter).
   N2's own walk lateral bands moved (e2e 3.2-4.2 -> 2.5-3.5, unit 3.3-4 -> 2.6-3.3): N2's step targets, not master
   limits; layer off reads 1.7 cm, outside both bands, so they still test the layer.
3. Merge: crabRow argument order right (scripts/e2e-anim.mjs:436, :584). Data-only proof reproduced: amounts 0 +
   master's run.ts = master's fixture (6c2d50a4) on 40 / 40; motion-off differs only on keyed:run and partner:moves
   (A1); layer-on differs from motion-off only on partner:moves; guard fixture unchanged. No double application with
   the #103 body base (animBase.ts:46-50 vs the layer's hip / chest yaw, pelvis sway, head; animGraph.ts:1620,
   characterRig.ts:2192 / :2285 / :2417).
4. Hot path: bodyMotion (src/anim/bodyMotion.ts:208-239) does not allocate: 0.09 B per step measured with gc() +
   new_space, same as an empty loop, vitest and node 24, Maglev on and off.

## Should-fix
1. tests/bodyMotion.test.ts:126-149 allocation check is flaky by construction: the harness itself allocates 16-30 B
   per iteration (Maglev boxes doubles; closure-captured `acc` at :130 / :141), 200k x 16 B = the 3.2 MB failure. Done
   looks like: measure as tests/lightField.test.ts does (gc() + new_space), inputs precomputed in a Float64Array, a
   typed-array sink. Fold into feature/heap-asserts if it covers this test.
2. Thin knee-out margin and no desktop e2e-anim yet: headless walk 3.41 / 3.5, walk 2.1 3.47 / 3.7, low ready walk
   3.33 / 3.5; master's base read 3.2 in-browser vs 3.1 headless. Done looks like: one desktop e2e-anim run; if walk or
   low ready walk reads over 3.4 there, cut walk sway further; never widen BODY_GAIT or BODY_DRAWN.

## Polish
- scripts/e2e-anim.mjs:1082 body motion block header is stale ("0.7x ... walk lateral ~3.6 cm").
- crabFacing's `e2eTable` brace matcher ignores strings and comments (breaks loudly if one appears).
- WALK_SWAY_WREN (5 cm) could tighten to ~4 cm: Wren's walk peaks at 3.4.
- A12 trims Michael's sway (walk 3.6 -> 2.9 cm, still above keyed 1.7): show it in the before / after sheets.
- CHECK-2 polish still open: head lags in turns, no pace scaling within a row, sneak head yaw at the band edge.
