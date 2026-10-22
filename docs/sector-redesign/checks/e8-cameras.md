# E8 - bulletproof / thermal security cameras

Branch `feature/sector-redesign-e8` (base efd4cb27). PLAN row E8; BRIEF A95 (camera armour ramp), A96 (S5 thermal).

## What was built
- `CameraDevice.bulletproof` (A95): a round through the housing ricochets. `SecuritySystem.shotRay` calls
  `onRicochet(x, y, z)` at the lens and returns null; the camera stays in its mode, no `cameraDown` event. The round
  stops at the housing (a camera behind it on the same ray is not hit). Jammer, desk loop / off, an `offFlag` console
  (cut power) and slipping the sweep still beat it - none of those paths read the flag.
- `CameraDevice.thermal` (A96): data tag only. Cameras already see by their own IR and ignore the lamps
  (`CAMERA.irLight`), and no darkness- or smoke-only hide exists for cameras, so detection is unchanged; A96 says
  exactly this ("data; cameras already ignore lamps"). The only effect is an amber LED.
- Tells (`SecurityView`): a bulletproof housing is dark grey, a thermal LED amber. Render only; gameplay never reads them.
- `GameState`: `onRicochet` plays bullet-impact sparks and the impact sound (`ballistics.onImpact`) using two scratch
  vectors (this check replaced a per-ricochet `new Vector3` / `Vector3.Down()` - event-time, but now allocation-free).
- Campus S3 `cam-view` is `bulletproof: true`; `cam-dock` stays shootable; S1-S2 unchanged.

## Rules
- Light parity / graphics state: no change to any perception input; `thermal` changes no sight maths.
- Hot paths: `shotRay` runs per shot, not per frame; no new allocation, no `Math.hypot`.
- Co-op: the flags are map data both pages build from (`ctDevices` builds client cameras and the view from
  `layout.security`). Only the host destroys cameras; the client mirrors `destroyedIds` / `applyDestroyed`, and a
  bulletproof camera is never in that list. No wire change. A client's own shot never reached cameras before E8
  either, so a client sees no ricochet sparks for its own round (see polish).

## Files
- `src/security/data.ts`, `src/security/securitySystem.ts`, `src/security/securityView.ts`
- `src/game/gameState.ts`, `src/world/maps/campusSectors.ts`
- `tests/securityCameraE8.test.ts` (8 tests), `scripts/e2e-sectorops.mjs` (`campusS3Part`: a round down cam-view's
  axis returns null and leaves it online and live)

## Tests run
- `npx tsc --noEmit -p .` clean.
- `npx vitest run` on securityCameraE8, securityCamera, securityRoom, sectorDesk, campusS3, cameraCue: 6 files,
  106 tests pass. e2e not run here (lead runs `e2e:quick` / sectorops).

## A95 / A96 status
- A95: S1-S2 shootable, S3 cam-view bulletproof / cam-dock not - done. S4-S5 all bulletproof - pending the S4 / S5 merge.
- A96: thermal flag exists - done. S5 cameras flagged - pending the S5 merge.

## Merge notes for the lead (S4 / S5 branches)
- Every S4 camera device: add `bulletproof: true`, and drop any S4 side table listing armoured cameras.
- Every S5 camera device: add `bulletproof: true, thermal: true`, and drop the S5 side tables (armour / thermal).
- Extend the "campus armour ramp" test in `tests/securityCameraE8.test.ts`: section >= 3 cameras all bulletproof,
  section 4 (S5) all thermal; loosen its "no thermal below S5" line only if a spec says so.

## Polish (not done)
- Client-side ricochet sparks for a co-op client's own round (needs a client camera-shot path; would be a wire change).
- A distinct ricochet whine instead of the generic impact sound.
- A thermal camera's in-world tell beyond the LED (lens shape) once art passes reach cameras.
