# anim-goggle - implementer report (marlow-bays item 22's last socket)

Branch `feature/anim-goggle` from master 4.45.0 (0d0eff9b). 2026-10-22.

## Built
- `src/anim/tuneGear.ts`: a sixth socket `goggles` (last in `GEAR_SOCKETS`; rows `goggles` and `goggles.crouch`), the
  worn goggle (track C's `GOGGLE_OFFSET.inUse`) in the head frame (x right, y up, z forward), about the goggle's own
  pivot after its rest pose. Sliders x / y / z (m, -0.1..0.1) and pitch / yaw / roll (deg, -45..45), identity 0, the
  same as every Gear row. `GearRigState.goggle` (6 floats): the rig's composed value as the goggle takes it (metres and
  degrees, standing + crouch x crouched), written in `gearRigUpdate` with the other sockets.
- No stowed socket: the stowed goggle has no vertices yet, so a slider would move nothing (the pouches rule).
- `src/player/characterRig.ts` `goggleFrame()` (small): a Wren rig (`tuneRows`) whose `goggles` socket is live saves
  `GOGGLE_OFFSET.inUse`, writes the table's value plus its own offset through `setGoggleOffset('inUse', ...)`, copies
  into `rig.goggleOff` (the old copy, now `goggleCopy()`), then writes the saved value back. All inside the rig's tuner
  window. The table is identity in the game, so the rig's `goggleOff` carries exactly its own offset and the global is
  identity again before the next rig (a guard, another Wren rig) runs. No offset or not a Wren rig: the copy as before.
  No allocation (one module scratch of 6 floats).
- `src/anim/tuneV2Sections.ts`: comment only (the Gear section builds its groups from `GEAR_ROWS`; 12 rows, 72 reads).
- Bake: no code change. `tuneBakeBase.ts` keys by row id (`GEAR_ROWS`), so `gear.goggles.*` and
  `gear.goggles.crouch.*` bake into `ANIM_BASE.gear` like the other sockets (proved by a literal export test).

## Limits
- LOD1 / LOD2: the housing is fused into the head, so only the lens moves there (track C's asset).
- The figure applies the `inUse` slots only while the goggle is worn (vision on); vision off shows the stowed goggle,
  which no row moves.
- Restore is to the value that stood before (identity in the game), not a hard reset to identity: a value track C puts
  in the table stays, and a Wren rig's offset adds over it.

## Tests
- `tests/animGoggle.test.ts` (new, 4): the socket and its rows (no stowed row, no carry slot maps to it); composition
  (base + delta, crouch, back to zero); a real NullEngine rig pair plus a guard: each Wren rig's `goggleOff` carries
  its own in-use offset (the crouched rig adds its crouched row), `GOGGLE_OFFSET.inUse` is identity after every rig,
  the guard stays identity, a table value is kept and added over, untuned all zero and gear version 0, reset exact;
  the bake of a literal export (expected base text, targets, round trip).
- `tests/animGear.test.ts`: the socket list now ends with `goggles`.
- `scripts/e2e-studio.mjs`: a `gear.goggles` base row (y 1.5 cm, pitch -12) moves Wren's `rig.goggleOff` in-use slots
  exactly, the stowed slots stay 0, the tuner's delta adds, reset exact; role B's boost puppet takes the row, reset exact.

## Results (desktop, 2026-10-22 07:32-07:38, lock held, port 4191)
- `npm run check`: lint 0 errors (41 warnings, none new), 232 files / 2536 tests passed (7 skipped), build ok. The goggle
  bake test splices an empty base into its temp copy (master holds Michael's 4.46.0 bake).
- `e2e-studio` ok 127 s (a `gear.goggles` base row of y 1.5 cm, pitch -12 moves Wren's worn goggle offset exactly, the
  stowed slots stay 0; the tuner delta adds to y 0.02; reset exact; role B's puppet takes it, reset exact), `e2e-anim`
  ok 37 s.
