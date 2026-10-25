# camera-cue fix round 1 - check (fresh Opus checker, 2026-10-21, diff 0d6310f4..efa734d1, code only)
**Verdict: PASS.** Vitest camera* 4 files / 60 passed; `tsc --noEmit` clean. Laptop e2e already PASS on efa734d1 (per lead).

1. Electro: `cueInk(true)` white ink, line 0.72 (luma 0.72 >= `glowFrom` 0.5), fill 0.05; normal red line luma ~0.08 (faint).
   Uniforms `ink` / `wt` replace the baked constants; test asserts both bands. Still a material, no light.
2. Client pulse: `cameraSight` (covers + `G.STATIC` `hitDistance <= dist - 0.2` -> 0, else `cameraRate`) is the host think's
   test verbatim (no-hit returns the length, same as `!h.hit || d > dist - 0.2`). Client runs it at `CAMERA.thinkHz` on own body
   (feet + peek + 1.05/1.6, same as host `RemotePlayer.headPoint` off a wall) and partners (`partnerBodies`), flags in a reused
   `Uint8Array` in `cams` order (1:1 with the view list). No wire change. e2e-ctcourse station 3 asserts page B `seen && pulse > 0`.
3. Rays: `Ballistics.q` reused in `clear` / `hitDistance` / `ray` (synchronous, all callers fine); host think now uses `hitDistance`
   (no `RayHit`). Cue casts one budget per `FIXED_DT` (accumulator, cap 4), same rays/s host and client.
4. Shot script: `cue-<suffix>-<gfx>-<map>-<view>.png`; "inside" tries the 10 brightest in-frame spots, frames the player, skips the
   shot and exits 1 if the camera's meters never see them; "jammed" blinds every drawn cue and logs all.
Gameplay never reads the cue (client flags feed only `CameraCueView.update`).

## Polish
- Client drift (pulse only): host partner's head is from MoveState height, not its real head node / peek; wall pose not used.
- `gameState.ts`: `bodyLight` was inserted under the `lightOccluder` doc comment, so that comment now sits on the wrong member.
- High-preset GPU run still owed (TAAU / bloom on the 1-px lines, electro glow look).
