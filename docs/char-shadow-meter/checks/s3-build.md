# S3 build report: ShadowCues (cast-shadow cues for Guard AI)
Owner: Sector Ops Build. Branch `feature/char-shadow-meter-s3`, from S1's interface commit b3e70c165.

## Built
- `src/world/shadowCues.ts` (338 lines, pure class): `CUE` as PLAN section 2, plus `CUE_AT` [0.35, 0.65, 1],
  `CUE_NONE` -2 (unused footprint), `CUE_LEVEL_FLOOR` 0.02. `ShadowCues(field, lights, moonDir)` with `slotOf`,
  `count`, `pts`, `speed`, `source`, `version`, `n`, and `fill(occ, players, keys, n, dt, occluded?)` for S3b.
  Reads the field through a narrow `CueField` (`sourcesInto`, `sourceAt`, `totalAt`), which `LightField` fits
  (compile-time check in the test).
- `tests/shadowCues.test.ts` (465 lines, 16 tests), against a small fake field (point lamps, moon, walls, ambient);
  expectations computed from the fake.

Commits: c04d1bd58 (class, by the cut-off builder), de67b3a35 (tests finished, two source fixes below).

## Fixes in this session
- Allocation: `fill` read 2112 B per call (4 players, 3 footprints): `footprint` took 13 double arguments, which V8
  boxes at a call it does not inline. The capsule now goes through a scratch `Float64Array` and `dt` through a field:
  0.0 B per fill (control with one object: 32 B), stable over reruns.
- Speed: far points stored in `Float64Array` (were `Float32Array`), so a still footprint reads speed exactly 0
  (was ~8e-7 m/s from rounding).

## Tests
- `npx vitest run --maxWorkers=2 tests/shadowCues.test.ts tests/charOccluders.test.ts`: 16 passed of 16 (twice).
  Covers: overhead lamp footprint under the feet; side and diagonal lamp direction and projected length; maxLen clamp,
  lamp below the feet casts none; wall cuts the far points to 0; contrast formula at every point; moon by elevation
  (60, 45, 30, 12 degrees) and no moon without `moonDir`; speed from two fills, matched by source id across strength
  reorder, 0 for a new player or dt 0; 3 strongest above `CUE.minLevel`; held light skipped (A5); darkness gives no
  footprints and zero contrast; slots, `slotOf`, cleared slots, cap at `CUE.players`; `totalAt` gets the contract and
  the player's own key; `version` per fill; allocation-free fill; import isolation grep.
- `tests/charOccluders.test.ts` does not exist on this branch (S1's bodies and tests are on the job branch), so only
  shadowCues ran.
- `npm run typecheck:fast`: clean.

## Deviations
- Contrast is clamped to `1 - CAPSULE.floor` (0.85). PLAN's formula has no clamp; with the contract a source's term
  can exceed the shadowed level (other capsules shade it), which would read over 0.85.
- The allocation test uses an inlinable flat field. The scene fake (and the real `LightField`, whose calls V8 will
  not inline) box each double argument and result at the field boundary: that cost belongs to the field calls, not
  the class.
- A source at or below the feet plane (+0.05 m) casts no footprint and the next source takes its slot; a source at
  or below the capsule top gives `maxLen`. Both follow from the footprint rule; PLAN does not name them.

## Open items
- S3b: with the real field, each player's fill makes ~19 field calls (1 `sourcesInto`, 9 `sourceAt`, 9 `totalAt`),
  each boxing 3 doubles plus its result when not inlined: up to ~1.2 KB per player per fill, ~50 KB/s for 4 players at
  10 Hz. Measure with the real field in S3b; if it matters, the field needs a typed-array point input (an interface
  change, S1's file).
- `tests/charOccluders.test.ts` and the real-field check run after the lead merges this branch into the job branch.
