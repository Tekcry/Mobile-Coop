# S7 module - cameras see bodies (security side)

Job guard-ai, slice S7 (design section 9, goal 9, M6, G240, A5). Security-side half only; the guard dispatch
(`camBody` incident) and the wiring are the integration step.

## Built
All in `src/security/securitySystem.ts` (no other source file touched).

- `cameraSight` now shares a private `lensRay(c, to, slack, ray)` helper (the one `G.STATIC` ray from the lens). Player
  detection is unchanged (same 0.2 m slack, same rate).
- `CAM_BODY = { hz: 2, hipsUp: 0.15, slack: 0.35 }`: the body pass rate, and the hips point / ray slack the guards use
  (`Enemy.lookForBodies`: `pos.y + 0.15`, slack 0.35).
- `cameraSeesBody(c, bx, by, bz, ray): boolean` (pure decision, takes `Body.pos`): camera not `frozen`, hips inside
  `c.covers` (online + `inFrame` with pitch + `camRange`), one clear ray to the hips. No light input (IR, G240).
- `SecuritySystem` body pass: its own accumulator at `CAM_BODY.hz` (2 Hz; player think stays at `CAMERA.thinkHz` 4 Hz).
  For each camera with `sees && !frozen` (so looped / off / destroyed / jammed / section-dead / console-off cameras are
  blind: `CtDevices.applyJam` puts all of those in mode `off`), each body `present && !carried && !hidden` not yet in that
  camera's reported set: `cameraSeesBody`; on first sight add the id and emit `onBody`.
- Reports: at most once per camera per body id (a body moved, dragged or re-dropped in view is not reported again by
  that camera). NOT once overall: a body two cameras see is reported by each (two events); the incident board should
  dedupe by `bodyId`. `found` is not filtered (a body a guard already found can still be reported once; the board may
  ignore it).
- No allocation per tick: the source returns a kept array, loops are indexed, the hips point is a module scratch
  `Vector3`, per-camera `Set<string>` lookups. The only allocation is the event object on a first sight.
- Not built: CAMERA.bodySeenTime (SN12, 2 s dwell "desk, Part B") is not applied: design 9 reports on first sight.

## API
```ts
export interface CamBody { id: string; pos: {x,y,z}; lethal: boolean; carried: boolean; hidden: boolean; present: boolean } // readonly
export type CamBodySource = () => readonly CamBody[];          // Body (src/ai/body.ts) fits as is
export interface CameraBodyEvent { camera: string; bodyId: string; lethal: boolean; x: number; y: number; z: number; section: number | undefined }
SecuritySystem.setBodySource(src: CamBodySource | null): void
SecuritySystem.onBody: ((e: CameraBodyEvent) => void) | null    // separate from onEvent (CtDevices replaces onEvent)
SecuritySystem.clearBodyReports(): void                          // every camera forgets its reports
export function cameraSeesBody(c: CameraUnit, bx: number, by: number, bz: number, ray: SightRay): boolean
```
Ids: camera = `CameraDevice.id` (string), body = `Body.id` (string, `b<n>`). `x, y, z` = the body's pelvis; `section` =
the camera's `CameraDevice.section`. The camera's lens position for the radio line: `security.camera(ev.camera)`.
`dispose()` clears `onBody` and the source.

## Tests
`tests/securityBodies.test.ts` (12 tests, fake ray with wall planes, fake bodies): in frame + range reported once with
the right fields; 2 Hz (nothing at 0.4 s, one by 0.6 s); behind a wall not (reported once the wall is gone); a hit at the
body itself is not an occluder; out of range / behind / outside the field not; looped, off, jammed (`frozen`), destroyed
not, each reported once back online; dark body (light 0) reported like a lit one; carried / hidden / gone not (reported
once put down); no double report per camera, a second camera reports once too, `clearBodyReports` re-arms; reported
bodies cost no ray, no source = no pass; `cameraSeesBody` pure checks; `Body` assignable to `CamBody` (tsc).

Results: `npx vitest run tests/securityBodies.test.ts tests/securityCamera.test.ts tests/cameraCue.test.ts
tests/securityRoom.test.ts`: 4 files, 56 tests pass. `npx tsc --noEmit -p tsconfig.json`: clean. eslint on the two
files: clean.

## What the integration step must wire
1. `src/game/gameState.ts` ~698-712, where `w.security = new SecuritySystem(...)` is built (host only: the block is
   `!this.puppet`, so co-op clients never run it; nothing goes on the wire): after it, when `this.enemyMgr` exists,
   `w.security.setBodySource(() => this.enemyMgr!.bodies)` (pass a kept closure built once, not per tick) and
   `w.security.onBody = (e) => this.enemyMgr?.cameraReport(e)` (or whatever the S7 incident entry is named). Set it here,
   not in `CtDevices`: `CtDevices` owns `onEvent` only (ctDevices.ts:312) and must stay untouched. Order of construction:
   `enemyMgr` is built at gameState.ts:635, before security, so it is available.
2. `EnemyManager` (src/ai, integration step): the `camBody` incident: dedupe by `bodyId` (two cameras can report one
   body), radio line from the camera (`security.camera(e.camera)` for its position / room), nearest 1 (KO) or 2 (dead,
   `e.lethal`) calm guards within 25 m by path in `e.section` (Sector Ops) or the map's one section; no guard near ->
   section cautious. No alarm stage (M6, A5): player alarms stay on `onEvent` -> `CtDevices`.
3. Sector Ops (`src/game/modes/sectorMode.ts` ~487, the section restart beside `this.ct?.repair(...)`): call
   `g.security?.clearBodyReports()` so a restart's cameras report afresh (bodies are cleared/reset by the restart).
   The section's other cameras are already `off` (CtDevices marks dead sections), so they report nothing.
4. Marlow Yard (`ctcourse`, Course mode): same gameState wiring covers it (its cameras come from
   `world.layout.security`); jammed / console-off cameras are `off` through `CtDevices.applyJam`, so blind. Nothing
   course-specific needed unless a bay restart should re-arm reports (then `clearBodyReports()` there too).
5. Co-op: host only (above). Clients see the guards' response through the normal snapshots.
6. e2e (PLAN S7 row): e2e-sectorops or e2e-ct-warehouse, leave a KO'd guard in a camera's view, a guard is sent within
   ~5 s; watch e2e-ctcourse 377-410 and e2e-sectorops 118 / 123 (alarm unchanged).
