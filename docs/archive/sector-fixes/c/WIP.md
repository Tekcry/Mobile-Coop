# sector-fixes slice C - parked work in progress (2026-10-22 ~08:05)

Parked for usage pacing (orchestrator: one agent at a time until 09:10; slice L first). The implementer was stopped
mid-slice; this commit is its working tree as it stood, UNVERIFIED: no checker; whether check / e2e / the GPU shots ran
is unknown. Files touched: src/security/{camera, cameraCue, data, securityView}.ts, src/vfx/cameraCueView.ts,
src/config/security.ts, src/game/{ctDevices, jammer}.ts (jammer.ts is shared with slice J, feature/marlow-jammer:
reconcile on resume), src/world/{mapDef, maps/ctcourse, maps/warehouseSectors}.ts, docs/systems/gadgets.md,
scripts/e2e-ctcourse.mjs, tests/{cameraCue, jammer}.test.ts, new tests/laserAlarm.test.ts and
scripts/archive/sector-fixes-c-shots.mjs. Resume: a fresh implementer reads the diff against 591c68bc, runs check and the
camera / laser suites, finishes the BRIEF slice C list, then a checker.

Update (orchestrator, 2026-10-22): slice J merged as 4.48.0 (#101, PROTOCOL_VERSION 26). On resume, merge master
first and rebase the jammer.ts work onto J's version; any wire change in slice C takes protocol 27. Slice P (laser
panels) is unblocked now that J is in master.

Parked again (2026-10-22 ~08:55, priority switch to anim-natural): master 4.48.0 merged (J's 5 conflicts resolved by
the implementer), after-shots taken; whether check / e2e passed after the merge is unknown (it was mid-run). Resume:
read the diff, run check and the camera / laser suites, then a checker.

## Resumed and verified (implementer, 2026-10-22 ~15:10, head 3bb3d644 = master 4.54.0 merged)

Per BRIEF slice C item:
- **Cue only within the camera's real range and cone (item 3): done.** `camPitch` / `camRange` (`security/camera.ts`)
  feed `CameraUnit.pitch` / `range`; detection (`covers` -> `inFrame`, `securitySystem.cameraSight`) and the cue
  (`cueSpan` about the pitch, rays to `cueReach(range)`, shader mask `CUE_MASK_GLSL` with pitch and range) read the same
  numbers. `validateSecurity` bounds `aim` (2 m .. range) and `range` (4-18 m).
- **Cameras pitch down to a set floor section (item 3): done.** Sector Ops: cam-yard aim 5 / range 10, cam-floor 7 / 14,
  the other five 6 / 12. Marlow Yard cam-s3: aim 6.5 (`S3_CAMERA_AIM`, 20 deg), range 18. Housing `rotation.x` = pitch.
- **Grid very subtle (item 4): done.** Normal: line 0.16 -> 0.055, fill 0.025 -> 0.006, 0.6 px lines (`CUE.lineW`);
  electro unchanged.
- **Lasers only in night vision (item 4): done.** Beams start disabled; `followVision` / `showLaser` draw them with a
  0.9 glow only while on and NV is up (host and client pages, local vision). Fixed this session: gameState's
  `paintElectro(0)` zeroed every 'laser' mesh's `pattern.w` on leaving electro, after the devices' step, so on the CT
  cycle electro -> night the beams lost their glow; `followVision` now re-asserts while NV is on (no allocation).
- **Break raises the alarm, never damage (item 5): done.** `deviceAlarm` (jammer.ts) + `CtDevices.raiseAlarm` (shared
  with the camera alarm); the damage path and `LASER.damage` / `floorHp` / `laserDamage` are gone. In Sector Ops it
  reaches `sectorMode.cameraAlarm` (counts in `camAlarms`, reinforcements as a camera alarm). Station 4 panel text.
- **Marlow Yard same rules: done** (same `CtDevices` code, cam-s3 pitched).
- jammer.ts vs J on master: only the LASER damage fields removed and `deviceAlarm` added; J's jam / light code untouched.

Files this session: src/game/ctDevices.ts (glow re-assert; debug `cams[].pitch` / `range`), src/game/modes/sectorMode.ts
(comment), tests/laserAlarm.test.ts (+1 test: electro -> night glow), CHANGELOG.md (new "Unreleased - sector-fixes"
heading), TESTING.md (+1 item), docs/systems/gadgets.md.

Checks: vitest cameraCue, jammer, laserAlarm, jammerFixes, securityCamera, ctcourse, ctcourseLight, sectorStep3,
sectors: 9 files, 164 passed, 1 skipped (pre-existing conditional skip). `tsc --noEmit` clean; eslint on the changed
src / tests clean. Not run here (desktop heavy lock held): npm run check, full vitest, build, e2e, GPU shots.

Protocol: no wire change (alarm already synced; beams follow each page's own vision). Master is at PROTOCOL_VERSION 28.

e2e: `e2e-ctcourse` station 4 already updated (beams hidden normal / shown NV / hidden electro; break counted on the
host, course alarm stat up, health unchanged; jammed: no break). Run `e2e-ctcourse`, `e2e-sectorops` (lasers / cameras
mirrored on the client), `e2e-security` (seclab cameras, no `aim`: unchanged), `e2e-coop`, `e2e-netmove`, plus `e2e:quick`.

GPU: rerun the after shots on this head and the sheet (port 4189):
`E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/archive/sector-fixes-c-shots.mjs docs/sector-fixes/c after`, then `... sheet`.
The 4.48-era sheet already shows the subtle grid, pitched frames and NV-only beams; worth an extra NV shot reached via
electro -> night to confirm the glow fix.

Assumed decisions (undo):
- A-C1 per-camera ranges / aims above (edit `aim` / `range` in warehouseSectors.ts / `S3_CAMERA_AIM`; delete them to
  look level at 18 m).
- A-C2 a laser break counts as a camera alarm in Sector Ops (`camAlarms`); undo: a separate hook in `DeviceHooks`.
- A-C3 beam NV glow 0.9 (`BEAM_NV_GLOW`).

Open: the Kestrel editor's coverage preview (`editor/security.ts` `camSees`) still tests level at `CAMERA.range`
(Kestrel paused, G53; its maps set no `aim`, so no mismatch today). A checker pass is still due.

## Fresh checker (2026-10-22 ~15:30, on 85b66ffb): PASS, no must-fix, no should-fix
Every BRIEF slice C item met: detection (`covers` / `inFrame`) and the cue (span, reach, shader mask) read the same
per-camera pitch and range; housing tilt sign right; grid ink 0.055 / 0.006, electro unchanged; beams only in night
vision (the electro -> night glow re-assert works); a break alarms through `deviceAlarm`, no damage path left. No wire
change needed (pitch / range from map data on both pages; alarm stage already in `sec.al`); protocol stays 28. No
allocation in the update paths; slice J not regressed (a jammed laser is hidden and its sensor off). Tests meaningful;
7 files / 125 pass, eslint clean. e2e-ctcourse station 4 asserts the new rules; nothing stale.
Polish: cam-yard (warehouseSectors.ts:763, y 3.5, aim 5, range 10) draws its grid to ~9.4 m but a standing head leaves
the frame at ~8.1-8.6 m (range 9 or aim 5.5 would match); `segmentHitsHousing` tests an unpitched box (~0.1 m off at
the tips); the client shows no ALARM STAGE banner (older than the slice); station 4's alarm assert could flake if a
station 3 alarm lands within ALARM_GAP 5 s; Kestrel `camSees` still level at 18 m (Kestrel paused).

## Desktop run (2026-10-22 15:52-16:15, on 2c76d3da, E2E_JOBS=2)
`npm run check` PASS. e2e-sectorops ok (539 s), e2e-security ok (28 s). FAIL: e2e-coop ("client takedown offered on
the host's guard (offer none)": the host's guard had spotted the client), e2e-ctcourse station 3 ("stale far-lobby
positions reached the host (0 reports, 0 frames there)": no client report in 0.8 s), e2e-netmove killed at 600 s.
All three look like load (no client reports, a timeout); a solo rerun (E2E_JOBS=1) decides. After shots and the sheet
retaken on this head (cam-s3 pitch 20.3 deg, range 18; laser-s4 hidden normally, shown in night vision).
