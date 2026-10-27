# Player J16: build report
Owner: Night Shift | Player Build. Status: current.

Built 2026-10-27 by the Opus builder on `feature/player-j16` (base 62324aded = brief + master 593b22c58). One slice,
the brief's steps 1-6. Prototype: `LOAD` numbers are the brief's starting values, untuned.

## Changes
- `src/game/charOccluderFill.ts` (+41): `LOAD`, `LOAD_IN`, `fillOperator` exactly as the brief (module scratch `S` and
  `put`, no new import, header line).
- `src/game/gameState.ts` (+28 / -1): import; `loadIn` and `charLoadsInto` after `charMatesInto`; `fillLoads` after
  `localSampleInto`; `this.fillLoads();` the line after `this.fillChars();`. `fillChars` not edited.
- `src/net/charMates.ts` (+49 / -2): `MateSource` optional `yaw`, `carrySide`, `carryKnees`; `CharMates.loadsInto`;
  pure `hostLoadsInto`.
- `src/net/coopHost.ts` (+7): hook set after `keepSimInBackground`, only with `g.charOccluders`, restored in `offs`.
- `src/net/coopClient.ts` (+4): hook inside the existing `if (g.charOccluders) {` block, restored in `offs`.
- `docs/systems/lighting.md` (+3 / -1): one sentence in the "Parity, with `charShadowLight` on" bullet.

## Tests
- `tests/charOccluderFill.test.ts`: new `describe('fillOperator (player-j16)')` with brief tests 1-6 and 8; test 7 is an
  `it` inside the existing "the field (step 2)" describe (it uses that describe's `scene` / `parts`).
- `tests/charMates.test.ts`: new `describe('loads (player-j16)')`, tests 9-13, last in the file.
- `npx vitest run tests/charOccluderFill.test.ts tests/charMates.test.ts tests/charOccluders.test.ts
  tests/lightField.test.ts tests/coopPerception.test.ts tests/coopCarry.test.ts tests/g7CloseQuarters.test.ts
  --maxWorkers=2`: 7 files, 114 tests passed. Other tests reading the changed sources (coopFix, e2eAffected,
  fieldNotes, guardOccluders, net, pianoNet, pianoScene, shadowNoticePerceive): 8 files, 254 passed.
- `npx tsc --noEmit -p tsconfig.json`: clean.

## Allocation readings (bytes per call, `allocPerCall`)
- `fillOperator`, 4 loads after 36 capsules: 0.0 (control vector 96.0).
- `CharMates.loadsInto`, 3 partners, 2 carrying: 0.0; `hostLoadsInto`, 3 refs, 2 carrying: 0.0 (control 96.0).

## Deviations
- Test 2: the brief says the crouched `h = lightSampleHeight(1.68, 1)` "clamps b to y + LOAD.low", but its own worked
  numbers (crouched b 0.31 m, over `LOAD.low` 0.25) and the formula do not clamp there. The test pins the crouch as
  the brief's numbers say (a lowered by the ratio, b = a - hang, 0.96 / 0.31 m) and checks the clamp separately with a
  lower sample height (h 0.9 on feet at y 0.5: b = y + `LOAD.low`).
- Test 7: the carrier's own upright capsule sits close to his load, so the placement (carrier feet (-0.3, 0, 0.35),
  yaw -PI/4, left shoulder; partner at the origin) was found by search so that only the load crosses the partner's
  lamp-to-chest ray; the test asserts that geometry (upright transmit 1 at chest and head) before the field values.
- Test 11 uses `MateLike` refs and `MateSource` stubs (no Havok): the pin slot parity of host and client is (e)'s; this
  case pins the load's parity on top of it.
