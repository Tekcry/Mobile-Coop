# marlow-jammer - implementer report (items 5, 7, 8)

Written by the job lead from the implementer's hand-back (2026-10-21; the harness blocked the subagent's report file).

## Why "the jammer doesn't seem to work"
The jam itself worked: a headless probe in bay 3 (pistol drawn, LT, aim on the camera, RB) blinded the camera at once
and held it; the client's `jam` message already worked (`docs/anim-rework/S1-REPORT.md`). What made it look broken:
1. No sign a jam was on: the gun light used the same green for jamming as for aimed, the camera kept sweeping while
   blind, its only sign was a 4 cm LED going dark; no sound, no HUD; the grid's 0.35 s fade was the one cue.
2. An untold rule breaks it: moving faster than 0.45 m/s ends the jam, and nothing said to stand still.
3. The old layout: the camera faced the entry airlock (its grid showed inside it once the door opened, item 5) and from
   the pocket under it the partner aimed almost straight up.

Fixed by the frozen camera, flashing LED, buzz, HUD line, distinct gun-light colours and "stand still" in the station 3
radio line and panel. Stand-still speed, range and cone unchanged.

## What was built
- Jammer rules (A3, J1, `src/game/jammer.ts`, pure): a jam lasts at most 5 s, then a 5 s cooldown for that player. A
  release, moving or aiming at another target also ends it and starts the cooldown. The 20 s charge model is gone.
  Each target has a timeline (working, jammed, recovering): camera / laser recover in 1.5 s; a lamp takes 4 s off plus a
  0.5 s flicker on. A recovering target cannot be jammed.
- Cameras: jammed or rebooting = blind (mode off: the grid fades, meters reset) and frozen (its clock stops; the sweep
  resumes where it stopped). The LED flashes 4 times a second while jammed, dark during the reboot.
- Lights (item 8): every fixed electric lamp (`lamp` / `spot`) is a jam target, id `lt-<registry id>`. Irregular
  flicker off (toggles at 0.06, 0.11, 0.21, 0.26, 0.37, 0.44 s), off while held, off 4 s after release, the same
  flicker back on. A pure function of time (host and client agree). It drives `LightRegistry.setOn`, which the bake,
  the light meter, the guards and the renderers read: light parity holds.
- Line of sight: a target is only picked with a clear static line from the aim camera (0.4 m slack): no jamming
  through walls.
- Buzz (A4, new `src/audio/jamBuzz.ts`): one WebAudio synth voice (low hum, fast tremolo, thin crackle), gain 0.13,
  range 24 m, at the nearest jammed device through `AudioEngine.spatial`; each page runs it from its own device state.
- HUD: a line under the reticle: "JAMMING 3.2 s", "JAMMER COOLDOWN 4.1 s", "TARGET REBOOTING", "JAMMER READY: hold
  Co-op, stand still". Gun light: cyan pulse jamming, dim red cooling, amber on a rebooting target, green aimed, red idle.
- Bay 3 hallway (item 5, A5, `ctcourse.ts`), bay coordinates: entry lobby x 0-3; hallway x 3-13.6 along the south
  wall, 2.9 m wide (z 0.15-3.05), walls to the 4.5 m ceiling; the rest of the cell sealed void; far lobby x 13.6-16.
  Camera `cam-s3` at (15.6, 1.6), 2.4 m up, facing west, sweep +-8 deg, covers the whole hallway; neither airlock is in
  view (entry airlock behind the lobby wall, exit airlock behind the camera; a unit test checks it with every door
  open). Gate: both players in the far lobby (`S3_PASS`) set `s3-clear`, which unlocks airlock A3's near door; the old
  `S3-door` is gone. Lamps: two strips over the hallway, one per lobby; the panel moved into the entry lobby (x 1.6).
  Being seen still raises the alarm stage.
- Floor lines removed (Michael 2026-10-21): `sweepLines` call and helper deleted; CTCOURSE-SPEC row M2 records it.
- Station 3 text: radio "Camera hallway. One jams it (aim LT / RMB, hold Co-op (RB / F), stand still); one runs.";
  objective "Jam the camera while your partner runs the hallway; from the far end, they jam it for you."; gate radio
  "Both through. Airlock door unlocked. Open it (A / E)."; the panel names the 5 s jam, standing still and the swap.
- Co-op: `PROTOCOL_VERSION` 25 -> 26. The `sec` field (course and sector messages) carries each camera's clock, each
  player's jam time left and cooldown, and the jammed / recovering devices with phase and time; clamped in
  `protocol.ts` (16 clocks, 64 devices, phases 1-2). The client runs those timelines between messages.

## Numbers
- Covered stretch: hallway mouth to where a standing head leaves the frame: 10.9 m.
- A runner (4.0 m/s) crosses in 2.7 s (inside one jam); two runners back to back 5.45 s (more than one jam); a walker
  (2.1 m/s) 5.2 s. Unjammed, a runner is caught (fill about 1.0/s at 14 m, 2.9/s at 2 m). The jammer must stand still
  and cannot follow during the 1.5 s reboot, so one jam never covers both.
- Timers: use 5 s; cooldown 5 s; camera / laser reboot 1.5 s; lamp 0.5 s flicker, 4 s off, 0.5 s flicker on.

## Files
- Source: `src/game/jammer.ts`, `src/game/ctDevices.ts`, `src/security/camera.ts`, `src/security/securityView.ts`,
  `src/audio/jamBuzz.ts` (new), `src/audio/gameAudio.ts`, `src/net/protocol.ts`, `src/world/maps/ctcourse.ts`,
  `src/world/maps/ctcourseBunker.ts`.
- Tests / scripts: `scripts/e2e-ctcourse.mjs`, `tests/jammer.test.ts`, `ctcourse.test.ts`, `ctcourseLight.test.ts`,
  `ctcourseLight.tuned.json`, `net.test.ts`, `moveState.test.ts`, `sectorStep3.test.ts`.
- Docs: `CHANGELOG.md`, `TESTING.md`, `docs/systems/gadgets.md`, `coop.md`, `lighting.md`, `CTCOURSE-SPEC.md`.
  `docs/level-design.md` Section 12 unchanged (no engine fact changed).

## Tests
- `jammer.test.ts`: the 5 s cap, cooldown, early release, stand-still, HUD line; the 1.5 s reboot and the client
  mirror's timeline; the deterministic flicker and the full light timeline; the protocol 26 `sec` round trip and clamps;
  bay 3: coverage at every sweep angle with a clear line, no airlock point seen, covered length vs run speed, gate and
  pass zone.
- Light test re-tuned on purpose (station 3's route runs the hallway, its panel is in the lobby, its corners are the
  lobbies' far corners): route 0.65-1.0, panel 0.51 / 0.46, corners 0.47 / 0.40; six old S3 corner keys dropped.
- Protocol asserts 25 -> 26; the F5 pass-zone colour test and the gate-radio check adapted.
- `e2e-ctcourse` station 3 rewritten: the camera sees the host and the alarm rises; the host's jam blinds and freezes
  the camera on both pages, the grid fades, the HUD counts down, both pages have a jammed device for the buzz; the client
  crosses unseen; the 5 s cap ends the jam (cooldown, reboot blind and frozen); the reboot refuses the client's jam;
  then the client jams from the far end, the host crosses and the gate opens; a hallway lamp jammed is off in the light
  registry on both pages, still off 2 s after release, back on after its 4 s. Station 4's jammed-laser wait is 2 s.

## Checks (laptop, software GL, port 4191)
- `npm run check`: pass (lint 0 errors / 41 warnings, Vitest 218 files / 2398 tests, build 1m42s).
- e2e (E2E_JOBS=2): e2e-coop ok 134 s, e2e-netmove ok 227 s, e2e-sectorops ok 152 s. e2e-ctcourse first failed at
  station 3 (the host 14 m away in the lobby: the meter rose about 0.15/s, no alarm in 90 s); the host now stands in the
  hallway (9.6 m) and failure diagnostics were added; solo rerun ok 287 s.
- Full `npm run e2e`: not yet (before the PR).

## Pending
- Bay 3's look on the desktop GPU (hallway, grid inside the bay, LED flash, lamp flicker): pending PC run.
- PROTOCOL_VERSION vs `feature/marlow-bays` (#85): whichever merges second takes the next number.

## What Michael should try
In co-op Marlow Yard, bay 3: one player aims the pistol at the camera at the end of the hallway and holds RB, standing
still (grid goes, camera stops, LED flashes, quiet buzz, HUD counts 5 s); the other runs the hallway; from the far lobby
the runner jams it for the partner; both in the far lobby, open the airlock door. Also: re-jam during the 1.5 s reboot
(refused); move while jamming (breaks, cooldown); jam a hallway lamp (flickers off, off 4 s after release, flickers on).
