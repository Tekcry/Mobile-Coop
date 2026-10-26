# char-shadow-meter S2 build report (cloud)
Owner: Night Shift | Sector Ops Build. Status: current.

Built by Night Shift | Cloud Builder 3 (Opus), 2026-10-25 ~23:55, from the cloud-queue brief
`briefs/char-shadow-meter-s2.md` and `docs/char-shadow-meter/briefs/S2.md`. Branch `feature/char-shadow-meter-s2` from
c9b14bf1c. Unit tests only (Node v22.22.0, 4 cores, `--maxWorkers=2`). The brief marks steps 3-5 not cloud-safe
(gameState wiring, laptop e2e): the wiring is built and type-checked here; every e2e and the A11 reading are pending
PC runs.

## Per step
1. dc14a1bb `src/game/charOccluderFill.ts` (new): `FILL`, `FILL_IN`, `VictimLike`, `fillPlayers`, `fillVictims`,
   `pictureInto` as the brief's interfaces; module-private `put` writes `cap` / `owner` / `n` from the module
   `Float64Array(7)` exactly as `CharOccluders.add`; module scratch `Float64Array(OCC.max)` distances and
   `Uint8Array(OCC.max)` taken marks; indexed loops, `hyp2` for the cull (`<= FILL.reach`), no closures / literals /
   spread. `pictureInto`: players in contract order, then repeated nearest-pick by squared horizontal midpoint distance
   to slot 0 (strict `<`, so a tie keeps the lower slot).
2. dc14a1bb `tests/charOccluderFill.test.ts` (new), 9 cases: put = add byte for byte (1 player + 70 victims: 64 fit, overflow 7, no
   write past `OCC.max`); local slot = `rtCapsule`, crouch lowers the top by 0.35 x 1.75, peek moves the head end only,
   the 0.5 m top; remote keys `occKey(1, s)` stable; victims (dead out, 31 m from all out, 31 m from local / 5 m from
   remote in, owner `occKey(2, i)`, exactly at the reach in); two machines same bytes; `pictureInto` (players first,
   nearest next, ties by slot, `a[c*4+3]` = r, max 16 of 40); allocation; the field: a `fillVictims` guard between a
   one-lamp scene's lamp and the chest lowers `bodyLevel` to max(chest, head) from the parts (each source's share x
   `capsuleTransmit`, computed) and `totalAt` = before - `lampAt` x (1 - T); own capsule never shades him; a 4-player
   contract gives today's `bodyLevel` for each slot to the bit (`Object.is`).
   The scene's lamp points down, so the head (above it) gets none of its light: the test pins the chest as the shaded
   sample (`chest.hit` 1, `head.hit` 0) instead of asking both.
3. 46640987 `src/game/gameState.ts`: imports (`CharOccluders`, the fill); members as the brief (`charOccluders`,
   `lightIn`, `charKeys`, `charRefs`, `charN`, `charFull`, `charCapsules`) plus debug-only `charMs`, `charMsRing`
   (`Float32Array(100)`), `charMsAt`; `world.lamps.capsules` = `charCapsules` with the contract, else `rtCapsules`
   (unchanged); `fillChars()` on the line before `this.updateLight(dt)` (returns at once with the flag off; else
   `playerRefsInto(charRefs)`, slot 0 via `localSampleInto(0)`, remotes as the old remote loop, `fillPlayers`,
   `charFull = fillVictims(occ, this.takedownVictims(), ...)`); `updateLight`: with the contract every slot's
   `bodyLevel(..., occ, charKeys[s])` from `lightIn` at 10 Hz (slot 0 -> `lightLevel` / `localRef.light`, others ->
   `charRefs[s].light`), the debug ring timed only under `flags.debug`; without it `localSampleInto(0)` then the old
   calls (same expressions, the doubles through `lightIn`), the remote loop unchanged. `localSampleInto(o)` is the old
   local sample code moved verbatim. Debug line `charlight` (registered once beside `player`, only with `flags.debug`
   and the contract): `contract <n> (full <charFull>) meter <last> ms p95 <p95> ms`.
4. 1096aefe `docs/systems/lighting.md`: :8-10 (built dark behind `charShadowLight`, owner, switch-on by Michael's walk
   yes); the old Parity bullet kept as the flag-off line and the model / formula / P1-L11 wording / parity table (with
   a flashlight row) added for the flag on; known limits (16 capsules, 4 per lamp, contract order, outline vs capsule,
   holder rule A5 in the meter only, A6 moon at Shadows Off); Co-op bullet + A7; Tests line + the
   three files. Doc lint clean. Lines :220-243 untouched. The shadow-cue line was taken out again in 030150bb1 (it is
   S3's, PR B).
5. This report.

## Tests
- `npx tsc --noEmit -p .`: clean. eslint on charOccluderFill.ts, its test and gameState.ts: clean. `node
  scripts/doc-lint.mjs`: exit 0.
- `npx vitest run tests/charOccluderFill.test.ts tests/charOccluders.test.ts`: 20 passed (the isolation grep reads
  charOccluderFill.ts unedited).
- `npx vitest run tests/charOccluderFill.test.ts tests/lightField.test.ts tests/charOccluders.test.ts
  tests/coopPerception.test.ts`: 56 passed, 1 failed - `tests/lightField.test.ts` "allocation-free with a contract"
  (`sourcesInto` 90.4 B against the 72 B budget). Pre-existing on c9b14bf1c and not touched by this slice (no S2 file is
  imported there): it is the Node 22 reading that `briefs/char-shadow-meter-a1-node22.md` fixes.
- Tests that read gameState's source or light code: bodyHeight, coopCarry, playerTargetTeleport, shotOrigin,
  volLightsWiring, animTunePass2: 48 passed.

## Bytes per call (tests/helpers/allocPerCall.ts)
- charOccluderFill: `fillPlayers(4) + fillVictims(32)` 0.0, `pictureInto(16)` 0.0, control with a `{ x, y, z }` 96.0
  (36 capsules).
- lightField (S1's, read here): with a contract totalAt 58.4-66.8 (none 57.2-64.8), bodyLevel 113.2-128.4 (none
  112.0-126.8), sourcesInto 90.4-98.8, sourceAt 23.2-25.6; control 282.5-290.8 (two runs).

## Deviations
1. `pictureInto`'s tie rule is "lower contract slot first" (strict `<` over the slot order), the brief's "ties by slot".
2. Debug-only members `charMs` / `charMsRing` / `charMsAt` beside the brief's members (its debug item needs them).
3. (Dropped: the cue line left lighting.md in 030150bb1.)
4. Brief deviations 1-4 (fill every sim step, fill before `updateLight`, `put` copies `add`, PR A2 = S2 alone) as
   written.

## Open items (from the Opus check, csm-a2-check.md)
- Co-op client gap, owned by slice S2c (PLAN section 3), must-fix before switch-on: a client's contract holds only its
  own player (`playerRefsInto` remotes are host-only), so its meter and round shadows ignore its partners' shadows
  while the host's sample of that client, which the guards read, counts them (up to 0.85 of a lamp's share; A7 allows
  0.02). Logged in lighting.md's Co-op bullet.
- The interim fill holds players and live guards (dogs as guards); dead guards and bodies are absent (`alive` filter)
  until Guard AI's fill. Victim overflow drops guards in list order, not nearest first (harmless at `OCC.max` 64).

## Pending PC run
- affected-e2e on the PR head (src/game: e2e-takedown, e2e-gadgets, e2e-tactics, e2e-park, e2e-ctcourse,
  e2e-sectorops) and the src/game gate `e2e-coop,e2e-netmove` (flag off: every path today's).
- The flag-on probe (`?charlight=1&debug=1`, Warehouse): `lightLevel` vs `bodyLevel(..., charOccluders, occKey(1, 0))`
  within 0.001 in a parked guard's shadow, lower than without the contract; round shadows of the partner and guards on
  Low and Epic; the `charlight` line.
- A11 perf: meter tick <= 0.1 ms p95 on campus S5 with 4 players from the `charlight` line (solo reading if no
  4-player run; then the 4-player one is an S4 open item).
