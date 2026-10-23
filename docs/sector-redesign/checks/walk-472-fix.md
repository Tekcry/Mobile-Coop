# Walk 4.72 fix - S2 co-op lamps, S3 team doors

Fixer: Opus, branch `feature/sector-redesign-walk` (off -polish 4a65d692). Previous fixer's WIP e2e legs committed first
as 3ea7bed6. The orphaned 14:09 build + `e2e-sectorops:1` run of that WIP finished on its own (PASS, 194 s) and released
`heavy.lock` itself.

## Michael (walk 4.72, Sector Ops)
- S2: "host shot out light, coop game light turned off too, but coop shooting lights does nothing for either game."
- S3: "unbolt worked on one side as intended, didnt try client pressing it due to restart issue."

## S2 root cause
Not the wire. The client -> host path (`coopClient.ts:508` `lampRay` -> `shot` at `lt-<id>` -> `coopHost.ts:540`
`onLampShot` -> `lampShotOk` + LOS -> `stealth.shootLight`, synced back by `lamps`) works: proved with the client's real
round (camera aimed, the gun's own `shoot()`) on warehouseOps and campusOps (a reachable lamp: out on both pages).

The failing lamps are Saltmarsh Park's street lamps: `campusS1.ts:221-222` (lane) and `:233` / `:237` (14 car-park lamps):
a 6 m `pillar` with the lamp head (fixture 0.6 x 0.1 x 0.3, `oy` 0) centred on the pole top. A round aimed at the head
from the ground lands on the pole's side 0.1-0.3 m under the head and never enters the padded fixture box, so
`lightOnRay` (`src/world/lights.ts:437`, as of 4.72) returns -1:
- the client's `lampRay` sends nothing (no `shot` reached the host: probe log empty);
- the host's own round (`stealthSystems.ts:523` `shotRay`, same test) misses too.

Probe on the 4.72 code (campusOps co-op, client's real round from 3 m off each lamp): 1 of 14 lamps out (the gate wall
lamp, y 2.9); 13 pole-top lamps missed, each round landing at y 5.72-5.84 under a head at 6.0; the host's own round from
the same spots missed the same lamps. So Michael's host shot hit a lamp a round can reach, and his client shots were at
pole-top lamps, which nobody could shoot out.

## Fix
`src/world/lights.ts`: `LAMP_MOUNT_REACH` 0.35 m. `lightOnRay` also counts a lamp when the round's landing point is
inside the head's footprint (padded box x / z; a bulb: +-`BULB_RADIUS`) and at most 0.35 m under its underside, at the
end of the segment (a box or bulb entered earlier along the round still wins). A wall lamp on the far face of a wall and a
lamp on the next storey are outside that (footprint / distance). Host and client both use it (`shotRay`, `lampRay`); the
host's `lampShotOk` (claimed ray + 0.3 m) and its 0.6 m LOS slack already pass these rounds (unit test).

- Protocol bump: **no**. `src/net`: **unchanged**. `PROTOCOL_VERSION` stays 35.
- Docs: `docs/systems/lighting.md` (`lightOnRay` line); fragment `changes/feature-sector-redesign-walk.md` (patch).

## S3
Proved, no change: the client presses the real A (its context menu's "Unbolt" row, `tapA`) on the far side of each
warehouse team door; the host unbolts it, both pages' doors unlock, the item goes off. On the near side the client has no
Unbolt row and neither A nor a scripted use opens it. Team doors exist only on warehouseOps (sections 1-3).

## Tests
- `tests/perception.test.ts`: pole-top round breaks the street lamp (the probe's real numbers); not 0.1 m below the
  reach, not beside the footprint, not a wall lamp from the wall's near face; a bulb on a bracket. 30 pass.
- `tests/sectorLampSync.test.ts`: the host's `lampShotOk` takes the client's pole-top `shot`. 12 pass.
- `tests/polishBatch.test.ts`, `tests/securityCameraE8.test.ts` (shot paths): 9 + 9 pass. `tsc --noEmit`: 0 errors.

## e2e (desktop, `E2E_GPU=1 E2E_JOBS=1`, port 4191, heavy.lock per suite, after `npm run build`)
- `e2e-sectorops:1` PASS 182 s: warehouse leg now fires the client's real round (`shoot()`, camera aimed) -> host lamp
  out, client dark, light field equal; new campusOps leg: the client's round on the lane lamp's pole top -> host out,
  client dark, light equal on both pages; the host's own round on a car-park lamp -> out on both.
- `e2e-sectorops:3` / `:4` / `:5` PASS 30 / 42 / 41 s: the client unbolts each section's team door with A.
- `e2e-coop`: not run (no `src/net` change).

## Michael should try
Saltmarsh Park co-op: the client shoots a car-park street lamp head from the ground: it goes dark on both screens.
Warehouse: the client presses A on Unbolt from the far side of a team door.
