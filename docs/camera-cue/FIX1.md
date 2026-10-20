# camera-cue fix round 1 (implementer, 2026-10-21)

## Fixes
1. **Electro shows the cue.** `cueInk(electro)` in `src/security/cameraCue.ts`: normal stays red (line 0.16, fill 0.025); electro writes
   white ink (luma 1), line 0.72 (in the glow band over `ELECTRO.glowFrom` 0.5), fill 0.05, edge pulse x1.5. Shader takes `ink` / `wt`
   uniforms. `CUE.electro` x3 removed; `cueStrength` is now the shown amount only. Light parity unchanged (still a material).
2. **Client pulse, no wire change.** `cameraSight()` in `src/security/securitySystem.ts` (in frame, clear `G.STATIC` ray `> dist - 0.2`,
   meter rate; seen = `seenAt`) is used by `SecuritySystem.think` and by `CtDevices.clientSight()` at `CAMERA.thinkHz` on the client, with
   the synced yaw / mode, the own body (`playerRefsInto`) and the partner (`CoopClient.partnerBodies`: MoveState crouch, eased speed,
   head = feet + 1.05 / 1.6 as `RemotePlayer`, light via new `GameState.bodyLight`). Flags go to `CameraCueView.update` as a reused
   `Uint8Array`. Host think now casts `hitDistance` instead of `ray()`: same result, no `RayHit` allocation.
   Known drift: partner's posed wall head is not used on the client (host uses `ref.head` on a wall); pulse only, nothing gameplay.
3. **Rays.** `Ballistics` reuses one query object (`clear`, `hitDistance`, `ray`; all callers unchanged). The cue casts one budget per
   `FIXED_DT` from an accumulator (cap 4 steps), so host and client cast the same rays/s at any frame rate. Remaining Havok cost per
   ray, not avoidable without bypassing the plugin: `HavokPlugin.raycast` builds a BigInt array, the results array, two offset vectors,
   the hkQuery arrays and the wasm return tuples (~8 short-lived objects).
4. **Shot script.** Files `cue-<suffix>-<gfx>-<map>-<view>.png` (map kept so the two maps do not collide). "inside": 10 brightest spots
   in the frame (4..13 m, +-12 deg), stood on in turn until the camera's own meters see the player; camera framed on the player; no
   screenshot and exit 1 if never seen; logs `at`, `lightAt`, `tried`. "jammed": every camera whose cue is drawn goes off; logs every cue.

## Tests
- `npx tsc --noEmit` clean; eslint on all touched src/tests clean; `node --check` both scripts.
- Vitest cameraCue + securityCamera + sectorRestart + enemyManagerDespawn: 43 passed. New: electro line luma >= glowFrom, fill well
  under, normal stays faint; shared `cameraSight` (seen lit, occluded, dark, out of frame, off).
- e2e-ctcourse station 3: new assert, page B `seen && pulse > 0`.

## Skipped
`npm run check` and the e2e runs: `C:/NightShift/heavy.lock` held (CT Core S4, check + e2e on 4191). Shader and shot script untested in a browser.

## Files
src/security/{cameraCue,securitySystem}.ts, src/vfx/cameraCueView.ts, src/game/{ctDevices,gameState}.ts, src/net/{coopClient,remoteAvatar}.ts,
src/weapons/ballistics.ts, tests/cameraCue.test.ts, scripts/{e2e-ctcourse,camera-cue-shots}.mjs.
