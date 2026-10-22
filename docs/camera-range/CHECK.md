# camera-range - fresh check

Checker, 2026-10-23. Scope `git diff a71c8c02 8fda08b9` (3 commits, head 8fda08b9, branch feature/camera-range).

## Verdict: PASS

No blocking findings.

## What was checked

- **Owned files untouched.** The diff does not touch `src/game/ctDevices.ts` or `src/game/securityRoom.ts` (`git diff --name-only`).
- **The engine change.** `src/config/security.ts:17-25`: `range` 18 -> 12, `rangeMax` 14, `aimReach` 2, `edgePow` 2.
  `src/security/camera.ts:65-67`: `camRange` = own range, else 2 x aim, else 12, capped at 14.
  `camera.ts:94-115`: `cameraRate` falls off as 1 - (d / range)^2 and is 0 at or past the range. `cameraReach` inverts it.
  `src/security/securitySystem.ts:58`: `cameraSight` passes `c.range`, and `CameraUnit.range = camRange(def)` (`camera.ts:212`).
  The host (`securitySystem.ts:118`) and the co-op client cue (`ctDevices.ts:1107`) both go through `cameraSight`, so they agree.
  The vision cue (`cameraCueView.ts:111`, `cueReach(cam.range)`) uses the same range.
  `cameraRate` has one new positional parameter (`range` before `exposure`). Every caller was checked and none passed `exposure` positionally.
- **Every map with cameras.**
  - Marlow Yard `cam-s3` (aim 6.5): range 13. The hallway runs 2.6-12.6 m from the mount. Reach is 11.8 m standing still, 12.5 m running and 11.7 m crouched moving, so the hallway is still covered. The entry lobby is no longer covered (before: 30 cells, out to 15 m).
    `e2e-ctcourse.mjs` station 3 puts the host and client at x0+6, 9.6 m out. That is inside every reach, and the 90 s timeout holds.
    The security-room check (camera off, client in the hallway) does not depend on range.
  - Sector Ops: all 7 cameras keep their own ranges (10 / 12 / 14). Each is 2 x aim and none is over the 14 m cap. `cam-floor`'s one stray `partsStore` cell is gone.
  - Security Lab: range 18 -> 12. Each camera no longer reaches the other half of the room (before: 286-326 cells).
  - Kestrel: the editor and `kestrel.ts` cameras take the 12 m default (`editor/security.ts:440`, `securityTool.ts:170`). They are consistent, and Kestrel is paused.
  - Bunker maps: parked, and they use their own `cameraSweep` kinds.

  No map data sets a `range` over 14 or relied on 18. The aim-at-range validation (`data.ts:55`) now reads `camRange`, and every live map passes.
- **Light parity (G240).** The camera rate still uses `lightFactor(CAMERA.irLight)` (`camera.ts:106`) and reads no lamp.
  `e2e-security` "dark corner" now puts every lamp out before the crouched IR check and restores them after. That makes the check stricter: lamps cannot help a body beat the camera.
- **Hot paths.** `cameraRate` and `nearRate` allocate nothing. `cameraRate` takes `k * k` when `edgePow === 2`. `Math.pow` is only on the fallback and in `cameraReach`, which runs in tests and docs only.
- **Gameplay reads no graphics state.** Detection reads only `CameraUnit.range` from the map data. The vfx cue reads gameplay state, not the other way round.
- **Old numbers.** These were updated:
  - `securityCamera.test.ts` (12 m cut, falloff, zone tests)
  - `cameraCue.test.ts` (`rangeMax`, the 2 x aim rule)
  - `editor/security.test.ts` (12 m)
  - `jammer.test.ts` (A2 now out of range: `tested` is 0 and the range is pinned at 13)
  - `ctcourseLight.test.ts` (passes `camRange`)
  - `e2e-security.mjs` (spots moved inside the zones)
  - `camera-cue-shots.mjs` (`cam.range`)

  A grep of `tests/` and `scripts/` found no other assertion on 18 or on `CAMERA.range`. `docs/level-design.md` Section 12 lists no camera range fact.
- **docs/sector-redesign/FOR-CAMERA-RANGE.md** (origin/feature/sector-redesign): **not applied, and not needed on this branch.**
  Its only ask is a comment on `SECURITY_LIMITS` (`src/config/security.ts:57`, still "per map"). The suggested comment names `WIRE_CAMERAS`, which exists only on sector-redesign, so adding it here would point at nothing.
  `git merge-tree 8fda08b9 origin/feature/sector-redesign` merges cleanly, and the `data.ts` hunks do not overlap.
  Sector-redesign adds no camera devices. Apply the comment at whichever merge lands second.

## Tests run

- `npx vitest run tests/cameraCue.test.ts tests/cameraReach.test.ts tests/ctcourseLight.test.ts tests/editor/security.test.ts tests/jammer.test.ts tests/securityCamera.test.ts`: 6 files passed, 108 tests passed, 1 skipped (66.6 s).
- `npx tsc --noEmit -p .`: exit 0, no errors.
- Not run, as instructed: the full suite, e2e (`e2e-security`, `e2e-ctcourse`; those go to the laptop) and the build.

## Polish (non-blocking)

1. `ctDevices.ts:1135`: the debug `range: CAMERA.range` now reports 12 for every camera, while each camera's own range is in `cams[i].range`. It is misleading in debug output only, and ctDevices is owned by another job.
2. The new `cameraRate` drops the guard's close-range term (`PERCEPTION.closeRange` 1.8 m), which the old `sightRate` path applied for moving bodies. In practice no effect: within 1.8 m of the lens is under the mount, outside the vertical frame (SN04).
3. `securityCamera.test.ts`: the S0 derived times (SN08 1.3 s at 10 m, SN09 9 s at 10 m) are now asserted at 6 m. `e2e-security` still uses SN08 / SN09 as upper bounds. The S0 spec text could note that the derivation distance moved.
4. The `SECURITY_LIMITS` comment from FOR-CAMERA-RANGE.md can be applied after sector-redesign merges.
5. Marlow Yard: a crouched still body is reached only to 10.7 m, so the first ~2 m of the hallway (10.7-12.6 m from the mount) does not catch a crouched still player. It is not a bypass, because crossing the hallway means moving to within the 11.7 m reach.
