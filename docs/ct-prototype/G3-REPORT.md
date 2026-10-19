# G3 report: camera (follow, aim, wall, traversal) against the CT footage

Implementer, 2026-10-20. Source: `docs/ct-prototype/audit/AUDIT-CAMERA.md` (rows below), plus the lead's additions from
`AUDIT-EXTRA-OLD.md` row 7 and `AUDIT-EXTRA-NEW.md` rows 11 and 19. Michael: explore shoulder "Match CT (0.15 m)", FOV
"Match CT (86)", footage vs G103 / F1a "Footage wins". Every number is a starting value (G10). Nothing committed.

## Rows

| # | item | status | old -> new | replaces |
|---|---|---|---|---|
| 1 | Explore distance, open vs tight | done | one boom 1.8 -> tight `boomHip` 1.8, open `boomOpen` **2.8** (audit said 3.3; see "Render check"). Open / tight per space: `MapLayout.camSpaces` + `camSize` (`world/camSpaces.ts`); Marlow Yard: map default open, the 7 airlocks and the roofed annex (feet under 3.9 m) tight, the annex roof open. Fallback without map data: probes from the head (back clear past 3.5 m, both sides past 2.0 m, hysteresis 0.8). The weight eases on its own spring (`toTight` 6, `toOpen` 4 1/s, about 0.8 / 1.2 s); the first frame snaps (no ease-out at spawn) | A2.1 single boom |
| 2 | ADS lateral offset | done | `shoulderAds` 0.42 -> 0.17 -> 0.30 (job lead after the render: at 0.17 the aimed head, on the stock, sat at x 0.5 over the reticle; 0.30 puts it near x 0.3 as in CT 105845 @ 36.5), `boomAds` 0.35 -> 0.40 | F1a |
| 3, 23 | Scope view | not done | optional; left for a later slice | - |
| 4 | Start pitch | done | `startPitch` -0.3 -> -0.21 (horizon at y 0.30) | - |
| 5 | Explore lateral offset | done | `shoulderHip` 0.32 -> 0.15 | F1a (Michael's answer) |
| 6 | Head height on screen | done | `pivotStand` 1.75 -> 1.68 (head top); `pivotCrouch` 1.15 -> 1.08 so the crouch drop stays 0.6 and `aimCrouchShare` 0.68 stays calibrated. Still one value for every operator (G38) | A2.1 capsule pivot |
| 7 | Crouched explore distance | done | `boomCrouchOpen` 2.2 (open); tight keeps 1.8 | - |
| 8 | Travel lead swing | not done | conflicts with Michael's own words (2026-10-18, G159): "Camera doesn't automatically adjust/move at all in CT, it's manually controlled." The rigid-follow unit test also guards it. Needs Michael's call | - |
| 9 | Shoulder swap arc | done | `swapArc` 0.3 -> 0.4 | playtest-2 0.3 |
| 10 | ADS camera height | done | `aimEyeDrop` 0.24 -> 0.16 (camera stays at 1.52 m) | F1a |
| 11 | Corner peek timing | partial | `peek.blend` 0.55 -> 0.35 in, new `peek.out` 0.3; ease smoothstep -> soft-linear `peekEase` (peak speed 1.25x the mean instead of 1.5x); new `peek.shoulder` 0.55 (the open-side offset at full peek, since the wall preset's own shoulder is now 0.15). `boom` 1.4, `yaw` 18 deg kept. CT is 0.2 / 0.17: going faster breaks e2e-wall's 6 cm per-frame cap (unit model with a step input: 0.35 / 0.3 gives 5.3-8.0 cm by view yaw, slice F's 0.55 gave 3.5-8.8) | slice F (F4) 0.55 |
| 12 | Wall slide camera | done | `ATTACH_FRAMING.wall` boom 2.6 -> 2.0, shoulder 0.55 -> 0.15 | locomotion step 11 |
| 13 | Aim off the wall | done | new `CAMERA.adsInWall` 0.35: an aim that starts on the wall or within 0.8 s of leaving it blends in over min(weapon time, 0.35) | - |
| 14, 30 | Hang / shimmy | done | `hang` boom 2.9 -> 3.5, shoulder 0.5 -> 0.05, pivot 1.35 -> 1.1, pitch -0.25 -> -0.1 | - |
| 15 | Ladder | done | `ladder.shoulder` 0.55 -> 0.05 | - |
| 16 | Rappel | done | `rappel` boom 2.8 -> 3.0, shoulder 0.5 -> 0.05 | - |
| 17 | Duct / crawl | done | `duct` boom 0.9 -> 0.45, shoulder 0.22 -> 0, pivot 0.55 -> 0.65, pitch -0.05 -> 0.08; (EXTRA-NEW row 11) blend 0.2 -> 0.4 | - |
| 18 | Look rate | done | pad `lookSensitivityY` default 0.8 -> 1.0, with the `camV` migration (a saved 0.8 follows once) | - |
| 19 | FOV | done | `CAMERA.fov` 75 -> 86; `video.fovH` default 75 -> 86; new top-level `settings.camV` 1: a save without it that holds 75 moves to 86 once (a chosen value stays) | FOV 75 (Michael's answer) |
| 20, 21, 25, 26, 27, 28, 32 | sprint, pistol ADS, N1, low-space exit, takedown, grab, recentring | none needed | - | - |
| 22 | ADS crouched | kept | `aimCrouchShare` 0.68 kept (valid: the crouch drop is still 0.6 m); `aimcrouch-ots` shows the head on screen | - |
| 24 | Door crack zoom | done | `DOOR_PEEK.fovMul` 0.85 -> 1 | - |
| 29 | Pipe | done | `pipe` boom 2.0 -> 2.8, shoulder 0.55 -> 0.05 | - |
| 31 | Rope climb preset | not done | no rope-climb attach state exists (`attach.ts`); add the preset when one is built | - |
| EXTRA-OLD 7 | Wall pull-in rates | done | `boomIn` 40 -> 16, `boomOut` 7 -> 4. The cast still clamps the boom the same frame (`boomActual` = min(spring, cast)), so the pull-in toward a wall stays instant and only the ease back out is visibly slower (about 1.2 s) | CAM |
| EXTRA-NEW 19 | Door passage camera | done (prototype) | within 1.2 m of an open door's centre (`Doors.nearest`, `open` > 0.5) the boom pushes in to 0.8 m over 0.4 s, holds, returns over 0.7 s (`CAMERA.doorPass*`). The row's pitch -0.1 is not applied (the camera never sets the look) | - |

Also noted: the presets' `pitch` field is not read by the camera at all (it was already dormant); the numbers were updated
for when it is.

## Render check (GPU, `docs/ct-prototype/shots/g3/`, 2 rounds)
- `yard-ctcourse.png` (Marlow Yard, x 9 z 7, facing east, in-game pitch): round 1 at 3.3 m framed Wren at 0.43 of the
  frame height (CT 111908 @18.5: 0.50; audit 0.50-0.52); round 2 at 2.8 m: 0.50, spine at x 0.47 (CT 0.48-0.51), head
  top at y 0.50 (CT 0.42-0.51), horizon at y 0.30 (CT 0.30). The audit's 3.3 m assumed a 1.8 m hero; Wren is shorter.
- `walk/jog/sprint-ots` (anim-sheet, pitch forced 0): whole body in frame, hero about 0.48 of the height, x 0.47.
- `aim-ots`, `aimpistol-ots`, `aimcrouch-ots`: the head is on screen now, its centre at x about 0.31 (CT target at
  16:9 / 86: 0.27), head top y about 0.25 (CT 0.15-0.33). The gun sits at x 0.45-0.54 (CT 0.36-0.44): that is the
  weapon pose (slice G1 / aim), not the camera.
- `crouch-ots`: crouched at 2.2 m, about 0.59 of the height at pitch 0 (about 0.53 at the start pitch; CT 0.51).
- `wallslide-ots`: hero x 0.45 (CT 0.41-0.46); at pitch 0 the feet are cut (CT's head top 0.50 comes with its downward
  pitch).
- `walledgelook-ots`: this scenario swings the camera by look, not the peek, so it does not show the peek framing.
  The peek (row 11) is checked only by the unit tests.

## What still differs from CT (numbers)
- Peek timing 0.35 / 0.3 s against CT 0.2 / 0.17 s (needs e2e-wall's 6 cm per-frame cap revisited to go faster).
- ADS head centre x 0.31 against 0.27; gun x 0.45-0.54 against 0.36-0.44 (weapon pose).
- Travel lead (row 8) absent by Michael's earlier word; scope view (rows 3, 23) and the rope preset (31) missing.
- Open-to-tight blend: CT's is not measurable (audit section 5); ours is a 0.8-1.2 s glide.

## Files
- `src/config/camera.ts` (constants, `exploreBoom`, `framing(..., open)`, `peekEase`, presets, `WALL_CAMERA.peek`)
- `src/player/shoulderCamera.ts` (open-space weight + probes, wall aim time, peek in / out and shoulder, door passage,
  first-frame boom snap)
- `src/world/camSpaces.ts` (new, pure), `src/world/mapDef.ts` (`camSpaces`, `camSize`), `src/world/maps/ctcourse.ts`
  (Marlow Yard spaces), `src/world/doorPeek.ts` (`fovMul`)
- `src/game/gameState.ts` (two lines feeding `cam.space` and `cam.doorPass`)
- `src/core/settings.ts` (`fovH` 86, `lookSensitivityY` 1.0, `camV` + `camKept`)
- Docs: `docs/systems/movement.md` (Camera, wall, peek, door peek, traversal paragraphs),
  `docs/systems/graphics-quality.md` (FOV default)

## Tests
- `tests/tactical.test.ts`: the framing test asserted the F1a numbers (0.32 / 0.42 / 0.35, pivot 1.75, FOV 75); now the
  G3 ones, plus open / crouched-open booms and the 23 deg ADS angle.
- `tests/cameraRigid.test.ts`: head reference 1.75 -> 1.68; new: open / tight boom and glide, aim off the wall 0.35 s,
  peek in / out timing, FOV 86 = 55.7 deg vertical, door crack no zoom, door passage push-in, boom rates 16 / 4.
- `tests/settings.test.ts`: new `camV` migration tests with a literal pre-G3 settings object.
- `tests/camSpaces.test.ts` (new): box lookup, Marlow Yard spaces, probe fallback and hysteresis, explore boom.
- `scripts/e2e-camera-bounds.mjs` (legacy suite, Kestrel): the yard reference is now the open framing (2.8 m, head
  1.68). Not run; it assumes the probes read Kestrel's yard as open from its test spot.
- Passed here: `npx tsc --noEmit` (only error: slice G1's `tests/_g1probe.test.ts`), eslint on the changed files, and
  vitest cameraRigid, tactical, cameraBounds, doorPeek, settings, settingsCover, graphics, camSpaces, ctcourse,
  wallController, doors, rooms, feedback, net, padBinds, ui. The build was `npx vite build` (the `typecheck` step trips
  on G1's probe file). No e2e run (job lead).
- e2e to watch: `e2e-wall` (camera step <= 6 cm with the faster peek), `e2e-anim` (aim blend, swap arc), `e2e-camera-bounds`.

## Outside my files (not changed)
- `src/ui/debugOverlay.ts` sliders: `shoulderHip` / `shoulderAds` start at 0.2, below the new 0.15 / 0.17.

## Try on /ct/
- Marlow Yard: walk the open yard (whole body, about 2.8 m back), then step into an airlock (eases in to 1.8 m) and out.
- Aim with rifle and pistol, standing and crouched: the head on the left third, on screen.
- Back to a wall, aim off it (fast 0.35 s dolly); peek at an edge and release (faster in and out).
- Walk through an open airlock door: the camera pushes in behind the shoulder, then pulls back.
- Settings: the FOV reads 86 (a saved 75 moved); pad vertical look 1.0.
- Hang, ladder, drainpipe, rappel: centred framing.

## Fix round (2026-10-20, after the independent check and commit 0675cb12)
1. **Aim offset**: the job lead had set `shoulderAds` 0.17 -> 0.30 (at 0.17 the aimed head sat over the reticle).
   Re-rendered `aim-ots`, `aimpistol-ots`, `aimcrouch-ots` at 0.30 / boom 0.40: head centre at x 0.27 (rifle), 0.28
   (pistol, settled; mid-raise at 0.45 s it is at 0.12 while the body turns), 0.30 (crouched); the reticle is clear
   (gun at x 0.40-0.47). CT 105845 @ 36.5: near 0.3. Kept 0.30 / 0.40; the lead's tactical test already holds 0.30.
2. **Door push-in only while passing**: new pure `doorPassing` (`world/camSpaces.ts`): within 1 m of the doorway
   plane, inside its width (+0.2 m), moving across the plane at 0.3 m/s or more. `gameState` gets the feet velocity
   from the step's move (`camPrevX/Z`). Standing by an open door or walking past beside it no longer pushes in.
   Test: `tests/camSpaces.test.ts`.
3. **Feet cut in the yard**: new `CAMERA.openDrop` 0.25: in the open (holstered) the look-at point drops 0.25 m under
   the head top. `shots/g3/yard-ctcourse.png` (in game, 2.8 m, 12 deg start pitch): head top y 0.41, feet y 0.92, the
   whole body in frame (CT 111908 @ 18.5: 0.42 / 0.92). Aiming is unaffected (scaled by 1 - ads). Test:
   `tests/camSpaces.test.ts`; `scripts/e2e-camera-bounds.mjs` yard heights -0.25 (1.43 / 2.390 / 0.470), not run.
4. **`Doors.nearest`** (`src/world/doors.ts`): indexed loop, no iterator.
5. **Debug sliders** (`src/ui/debugOverlay.ts`): `shoulderHip` / `shoulderAds` from 0 (step 0.01), `boomAds` from
   0.2, new `boomOpen` 1.5-4.5.
- Checks: `npx tsc --noEmit` (clean except G1's `tests/_g1probe.test.ts`), eslint on the changed files, vitest
  camSpaces, cameraRigid, tactical, settings, doorPeek, doors pass. Build: `npm run build` trips on G1's probe file in
  typecheck, so `npx vite build` (retried once while G2's `animGraph.ts` was mid-edit). No e2e.
