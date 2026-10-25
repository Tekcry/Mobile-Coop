# char-shadow-meter S3b build report (S3b-1, cloud)
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 1 (Opus), 2026-10-25, to `docs/char-shadow-meter/briefs/S3b.md` S3b-1 only (S3b-2 is
the lead's, after S2). Base `origin/feature/char-shadow-meter` c9b14bf1; branch `feature/char-shadow-meter-s3b`. Unit tests
only (tsc and single vitest files, `--maxWorkers=2`); every e2e / GPU leg is a pending PC run.

**Result: BLOCKED at step 2's allocation gate.** One 4-player fill with the real field reads **8544 B** against the
brief's **<= 2432 B**. Per the brief ("A reading over it: stop and report with ALLOC_TRACE=1, do not loosen") the gate
is unchanged and the step stops here. The cause is inside `LightField`, not at the cue's call boundary (below).

## Step 1: Q members (a1619bac) - done

**Files:** `src/world/lightField.ts` (additive: `qp`, `qr`, `sourcesQ`, `sourceQ`, `totalQ`, placed after `sourceAt`;
no existing line changed), `tests/lightField.test.ts` (one new case).
- `sourcesQ(ids, lv, max, occluded?)`: `sourcesInto`'s body with `x, y, z` read from `qp` into locals (same private steps:
  `moonInto`, `columnInto`, `inLampSet`, `pushRes` through `pushLv`, `dynTermInto`).
- `sourceQ(id, occluded?)`: `sourceAt`'s body into `qr[0]` (moon -1, unknown ids 0, baked via `lampInto`, dynamic via
  `dynTermInto`).
- `totalQ(occluded, chars, skip)`: `totalInto` at `qp` into `qr[0]`.

**Test** `(S3b) the Q calls equal their plain calls to the bit on 500 random points`: the scene of `light field (3.6)`
plus a flashlight, a shut door and 8 guard capsules; per point `sourcesQ` = `sourcesInto` (count, ids, levels; max 16
and 2), `sourceQ` = `sourceAt` for every listed member, the moon, -7, 999 and ids 0-4, `totalQ` = `totalAt` with no
contract, no occluder, and the contract with skip -1 / 3; all with `toBe` (bit-equal). `npx vitest run
tests/lightField.test.ts --maxWorkers=2`: **26 / 26**.

Existing readings on this tree (`lightField.test.ts`, unchanged cases): `levelAt 64.4, bodyLevel 155.6 (limit 184.8),
control 288.4`; with a contract `totalAt 66.8 (none 64.8), bodyLevel 128.4 (none 126.8), sourcesInto 67.2, sourceAt 25.6;
control 290.8`.

## Step 2: shadowCues through the Q path (this commit) - built, gate fails

**Files:** `src/world/shadowCues.ts` (`CueField` is now `{ qp, qr, sourcesQ, sourceQ, totalQ }`; the three call sites
write `qp[0..2]`, call, read `qr[0]`), `tests/shadowCues.test.ts` (`FakeField` and the spy gain the Q members over
their existing maths; the purity case's `FlatField` moves to the Q members; `fieldFits` kept; one new case).

**Tests** `npx vitest run tests/shadowCues.test.ts tests/lightField.test.ts tests/charOccluders.test.ts --maxWorkers=2`:
**53 / 54**; every existing case green (shadowCues 16 / 16 old cases, lightField 26, charOccluders 11); the new case
fails only its byte gate. `npm run typecheck:fast` clean; eslint clean on the four files.

New case `(S3b) the real LightField (2 lamps and the moon, 4 players)`: an open floor under two lamps ((-2.5, 3.5, 0)
r 8 i 0.9; (3, 3.2, 1.5) r 8 i 0.8) and the moon (dir (0.6, 0.8, 0), 0.12), baked as the game does; four players.
Every player gets 3 footprints (in 2-3), every near point contrasted (0.39 0.05 0.10 0.22 0.15 0.10 0.26 0.10 0.10
0.21 0.12 0.11).

**bytes-per-call lines**
- `bytes per ShadowCues.fill (4 players, 3 footprints each): 0.0, control with an object 32.0` (the fake field: the class
  itself allocates nothing, as before).
- `bytes per ShadowCues.fill with the real LightField (4 players, 3 / 3 / 3 / 3 footprints): 8544.0 (before S3b: 5264,
  s1-s3 check), control with an object 8576.0`.
- `ALLOC_TRACE=1`: every round 8544.0 at status 0x51 (Turbofan), 38 rounds, no scavenge; the control 8576.0 throughout.
  Stable, optimized: not a tier or GC artefact.

**Plain vs Q per call** (this scene, 1000 points, a scratch measurement run once and not committed):

| Call | Plain | Q |
| --- | --- | --- |
| sourcesInto / sourcesQ (max 8) | 124.8 | 124.8 |
| sourceAt / sourceQ (lamp) | 68.8 | 84.8 |
| sourceQ (moon) | - | 60.8 |
| totalAt / totalQ (contract, skip 1) | 124.8 | 140.8 |
| totalQ (no contract) | - | 124.0 |

The fill makes 4 + 12 x 3 x 2 = 76 field calls (~112 B each). The Q members remove the interface boxing (the call's own
doubles), but the field's private steps (`moonInto`, `lampInto`, `columnInto`, `dynTermInto`, `totalInto`, `triInto`, ...)
take `x, y, z` as double arguments and are called many times per query; in this scene V8 does not inline them, so each
call boxes there, and the Q path adds a little (a `qr[0]` store of `this.res`). 76 x ~112 B = the 8.5 KB reading. The
check's 5264 B came from a smaller scene (fewer columns and members per point).

## What reaching the gate needs (for the lead)
- The zero-boxing option has to reach the private steps: pass the point through typed slots (as `CharOccluders.q` /
  `pushLv`) into `moonInto`, `lampInto`, `columnInto`, `dynTermInto`, `levelInto`, `dynamicInto`, `totalInto`, `triInto`,
  `bounceInto` (or Q twins of each), with `res` moved to a typed slot. That rewrites existing `lightField.ts` lines, so it
  is past this brief's "additive members only" and touches every existing call's bytes (they would need re-measuring,
  and `char-shadow-meter-a1-node22` is already working on `sourcesInto`'s CI reading). Or the check's first option: gate
  the fill at <= 19 x 4 x `BOXED_BUDGET` (5472 B; this scene's 76 calls would need ~8.2 KB) and log it.
- Either is the lead's call; nothing here was loosened.

## Pending PC runs
None for S3b-1 (no game call site yet: S3b-2 wires `GameState`). At PR B: affected-e2e plus `e2e-coop,e2e-netmove` with
S4's suites (the brief's laptop line).
