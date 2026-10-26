# S1 build report (char-shadow-meter, J16)
Owner: Sector Ops Build. Status: S1 done, waits for its checker. Builder: Opus (finished after an account-swap cut-off).
Commits: b3e70c165 (interface), 914f5df2a, dfe422dc7, e93bf00e5, 73a93497c (flag test).

## Changes per file (vs origin/master)
- `src/world/charOccluders.ts` (new, +301): `OCC`, `OCC_KIND`, `CAPSULE`, `CHAR_LIGHT`, `occKey`, `CharOccluders`
  (fixed typed arrays; `add` returns -1 past `OCC.max`; `clear` bumps `version`; `transmitInto` with owner skip, holder
  rule A5 and the exact broad phase), `capsuleTransmit` (the GLSL `lampCapsule` line for line), `LAMP_CAPSULE_GLSL`
  built from the `CAPSULE` numbers. Doubles go through module / instance `Float64Array` scratch so nothing is boxed.
- `src/world/lightField.ts` (+213 / -13): `totalAt` / `bodyLevel` take `chars` and `skip` (absent or null = today's
  bytes); the character term on the moon (source `moonFar` m along `moon.dir`), each column lamp giving at least
  `CHAR_LIGHT.minLevel` (with the `maxLamps` cap hook, unlimited) and every non-baked light; `sourcesInto` (strongest
  first, moon id -1) and `sourceAt`; `bakeIdx` map; scratch `colLamp` / `colLv`.
- `src/world/bakedLamps.ts` (+2 / -21): the inline `lampCapsule` GLSL replaced by `LAMP_CAPSULE_GLSL` (same text,
  same numbers).
- `src/world/charShadowSet.ts` (+6 / -3): `CHAR_SHADOW.minLevel = CHAR_LIGHT.minLevel`; header comment.
- `src/core/flags.ts` (+4): `charShadowLight`, `?charlight=1` on, default off (BRIEF A9).
- `tests/charOccluders.test.ts` (new, +338) and `tests/lightField.test.ts` (+340): section 4 cases.

## Tests (`npx vitest run --maxWorkers=2`, all green, 73 / 73)
- charOccluders 11: TS = GLSL reference port on 10k random cases (1e-6) and the GLSL holds the `CAPSULE` numbers;
  floor 0.15 in the umbra, 1 clear and on the own surface; layout, owner keys, -1 past `OCC.max`, version; owner skip;
  holder rule; two capsules multiply; broad phase = brute force to the bit; allocation (transmitQ / transmitInto /
  capsuleTransmit 0.0 B per call, control 240 B); isolation grep (no quality, governor, picker, rig, Babylon; reads
  charOccluders.ts and lightField.ts now, shadowCues.ts and charOccluderFill.ts once they exist); the flag.
- lightField 25 (17 existing unchanged + 8 new): no contract or an empty one = today's values to the bit (500
  points, `totalAt` and `bodyLevel`); a guard between one lamp and the chest scales only that lamp, by the formula, 0.15
  in the umbra; own capsule never shades (skip and own surface); random scenes = the parts (set members x brute-force
  product); a lamp under 0.04 untouched; the moon with a capsule along `moon.dir`; a held flashlight not shadowed by
  its holder, a guard in its beam shadows it; `sourcesInto` strongest first and `sourceAt` sums to `totalAt`;
  allocation with a contract (totalAt 66.8 B vs 64.8 without, bodyLevel 128.4 vs 126.8, sourcesInto 67.2, sourceAt
  25.6; control 306.8; the remaining bytes are V8 boxing the returned double, as today's reading).
- charShadowSet 25, lampFalloff 12: unchanged, green.
- `npm run typecheck:fast`: clean.

## Deviations from PLAN
- Extra public members beyond section 2 (additive, no signature changed): `CharOccluders.q` + `transmitQ(skip)` (the
  allocation-free call path the field uses) and `holds(...)` (the A5 test, used by the brute-force tests).
- `allocPerCall` "0 with a contract" is measured as the added bytes over the no-contract reading (about 2 B per
  query, noise), because the existing public calls already box their returned double (pre-existing, not S1's).
- lightField.ts is +213 lines against the ~+120 estimate (column scratch, set cap hook, `pushRes`, `dynTermInto`).
  S1 total ~1.2k lines with tests against ~890 planned; PR A (S1 + S2) may pass ~1.5k: the lead may split it.

## Open items
- Perf A11 (0.1 ms p95 meter tick, campus S5, 4 players) is S2's to measure on the laptop.
- `CHAR_LIGHT.minLevel` 0.04 re-picks after J10's re-bake (PLAN section 5).
- No e2e run (S1 has no game wiring; the flag gates nothing yet until S2).
