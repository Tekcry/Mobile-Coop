# Walk 4.72 fix check - S2 lamp mount reach, S3 client unbolt

Checker: fresh Opus, read only. Branch `feature/sector-redesign-walk` @ c984239d, diff vs b8434b3c.

## Verdict: FAIL (one blocking item: a co-op parity break introduced by the fix)

## Blocking

1. **Host's validation of a client's lamp shot disagrees with the client's (and the host's own) test under a wall lamp.**
   `src/net/lampSync.ts:141-142` `lampShotOk` runs `lightOnRay` on the claimed ray extended by 0.3 m. The new
   `landsUnder` (`src/world/lights.ts:443`) is evaluated at the segment's end point, so on the host it is tested 0.3 m
   past the real landing, inside the wall, which is outside the head's footprint (the padded box reaches only
   0.03-0.16 m into a wall). Result: a round that lands on the wall face just under a wall lamp breaks it for the
   host's own round (`stealthSystems.ts:523`, real landing) but the client's identical round is sent and rejected
   (`coopHost.ts:998`, `violations++`). This is S2's complaint mirrored onto wall lamps.
   Probe (Saltmarsh S5 gallery lamp (-49.85, 6.6, 21), wall face x -49.9, round from the L1 floor landing on the wall
   at y 6.4): `lightOnRay` = hit from x -46, -47.5 and -49; `lampShotOk` = false, false, true. Same for y 6.2. Affects
   every wall-mounted fitting (campus `lamp()` wall lights, warehouse bulkheads).
   **Fix** (`src/net/lampSync.ts:141-142`): test the claimed landing too, e.g.
   ```ts
   const end = Math.min(dist, range);
   if (lightOnRay(reg, o.x, o.y, o.z, o.x + d.x * end, o.y + d.y * end, o.z + d.z * end) === id) return true;
   const len = end + 0.3;
   return lightOnRay(reg, o.x, o.y, o.z, o.x + d.x * len, o.y + d.y * len, o.z + d.z * len) === id;
   ```
   and add a `tests/sectorLampSync.test.ts` case: a wall lamp, a client round landing on the wall face 0.2 m under it
   from 4 m out, `lampShotOk` true (fails on c984239d).

## Checked, OK

- (1) Through walls / floors. A scan of every shootable light on all listed maps (`MAPS`, seed 0) for open-air
  landing points next to a solid inside the reach whose line to the head is blocked: warehouse 0/18, warehouseOps
  0/100, ctcourse 0/31, seclab 0/3, courselab 0/3, campusOps 9/133. Eight of the nine are the forecourt bollards
  (`campusS1.ts:268-269`: the head sits inside its own 0.9 m post; a round on the post's side is in plain view, false
  positive). No lamp on a next storey is reachable through a slab; no far-face wall hit (walls 0.2 m+, footprint reaches
  at most 0.16 m in). The ninth is real but narrow: see polish 1.
- (2) Host and client both call `lightOnRay` (`coopClient.ts:510`, `stealthSystems.ts:523`, `lampSync.ts:142`).
  `src/net` unchanged, no protocol bump (stays 35). Host LOS slack 0.6 m unchanged. Except blocking item 1.
- (3) Perception: both paths end in `StealthSystems.shootLight` (sparks, shot noise, a guard sent to look); unchanged.
  Light parity holds: the registry is the one source for the bake, meter and guards; the lamp goes out for all three.
- (4) Tests are real: unit cases use the probe's real client numbers; `tsc --noEmit` 0 errors; `perception.test.ts` +
  `sectorLampSync.test.ts` 42 pass. e2e legs fire the client's real round (`weapons.shoot()` after aiming the camera,
  the real `lampRay`), assert host out, client dark and equal light fields on both pages; the campus leg covers the lane
  lamp (client) and a car-park lamp (host). S3 legs press the real A (`tapA`, context-menu row asserted present on the
  far side, absent on the near side) and assert host unbolt, client door unlocked and client item off.

## Polish

1. Door soffit under a wall lamp over a door: S5 gallery lamp (-49.85, 6.6, 27) sits over the L1 door at (-50, 27);
   a rising round from the boardroom side through the open doorway that lands on the soffit's east half
   (-49.95, 6.3, 26.9) breaks the gallery lamp, which the shooter cannot see (`lightOnRay` returns it). Narrow (a 0.27 m
   strip, steep upward shot near the door). Option: require the round's direction to approach from the head's side, or
   a short static ray from the landing point to the head's underside in the callers.
2. `tests/perception.test.ts` wall case only covers a landing outside the footprint; add a near-face landing under a
   wall lamp (covers blocking item 1 on the client side).
3. `lightOnRay`'s fixture box ignores `yaw` (pre-existing): a bulkhead on an x-facing wall keeps `sx` 0.3 along x, so its
   footprint reaches 0.14 m into the wall; harmless with 0.2 m walls, worth a note in `docs/systems/lighting.md`.
4. `docs/systems/lighting.md`: mention that the reach is measured at the segment's end (the landing), which is why
   callers must pass the true landing.

## Fix round (lead, after the FAIL)
- `lampShotOk` (src/net/lampSync.ts:141) tries the exact claimed landing first, then the 0.3 m stretched ray, as the checker gave it.
- New test in tests/sectorLampSync.test.ts: a client round landing on the wall face 0.2 m under a wall pack; it fails on c984239d and passes now. tsc clean; sectorLampSync + perception 43 pass.
- No wire change (PROTOCOL_VERSION stays 35); e2e-coop to run at the train since src/net logic changed.
