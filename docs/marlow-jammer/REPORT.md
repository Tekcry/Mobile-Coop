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

## Fix round 1
Written by the fix-round implementer (2026-10-22) after the independent checker's FIX verdict.

1. Bay 3 cannot be passed without a jam (blocking; Michael item 5). Done. A hard rule for this station only
   (`PassZone.hall`, pure `hallStep` in `src/game/jammer.ts`): a player the hallway camera has (meter full, stage 2) while
   in the hallway is sent back to a fixed spot in the entry lobby (bay x 1.5, z 1.6, facing the hallway), radio "Camera
   saw you. Back to the start of the hallway." (49 chars). A player who entered the hallway stays "running" until they
   stand in the far lobby with the camera's meter on them empty (a jammed or rebooting camera keeps it empty); a running
   player the camera has in the far lobby is sent back too; the far lobby's pass counts only players not running. The
   camera's meter on the sent-back player is cleared. The rule stops once the station is passed. Alarm: both kept
   (being seen still raises the alarm stage; the send-back is added; the simpler choice). Host-authoritative: the host
   moves its own player; the client through a new `back` event (protocol 26, not yet merged, so no new bump): the host's
   copy moves at once (`RemotePlayer.moveTo`, teleport allowed), the client teleports itself, health kept (the `revive`
   event was not reused: it resets health and shows BACK IN). Panel text now leads with "Seen in the hallway: back to the
   start." (119 chars). Files: `jammer.ts`, `ctDevices.ts`, `ctcourse.ts` (`S3_BACK`, `S3_BACK_RADIO`, `S3_PASS.hall`),
   `gameState.ts` (`NetAttachment.sendBack`), `net/coopHost.ts`, `net/coopClient.ts`, `net/protocol.ts`,
   `net/remotePlayer.ts`.
2. Host line-of-sight check on the client's jam target. Done. `onRemoteJam` runs the same static ray as the client
   (`G.STATIC`, 0.4 m slack) from the client's head on the host (`remoteHeadY`, peek offset); per message only (change or
   heartbeat), no allocation (`playerRefsInto`, shared ray vectors). Note: the client checks from its camera, the host
   from the head; in the hallway both see the camera.
3. Client-page cue pulse assert restored. Done, moved: before the gate a player the camera sees in the hallway is sent
   back, so both pulse checks (host and client page) now run after the gate opens, with the client standing in the
   hallway (also asserts no send-back once the station is passed). The host at the lobby spot is not seen by the camera
   (first try failed there).
4. Client camera blink. Done. `mirrorDevJam` (pure): the client only moves a device's timeline forward; a host RECOVER
   arriving within 1 s (`MIRROR_STALE`) after the mirror ran that reboot down itself is dropped; inside a phase the time
   only grows; host idle always wins; a new jam is taken at once.
5. Allocation. Done. HUD line cached by `jamHudKey` (kind + shown tenths): the string is built only when the shown
   value changes. Buzz: gain and pan automation only on a change (none while silent or steady).

Known behaviour for Michael (unchanged, as asked): a chained jam - player B joining A's jam on the same camera keeps it
jammed past A's 5 s (each player's own 5 s cap still applies). It is a valid handoff.

Tests: `tests/jammer.test.ts` + 9 (`hallStep` rule cases and an unjammed-runner walk, `mirrorDevJam` stale / forward /
new jam, `jamHudKey`, the `back` event round trip, the station 3 hall data: box to the far lobby, spot in the entry
lobby facing +x, line length). `scripts/e2e-ctcourse.mjs` station 3: unjammed in the hallway, the host is sent back to
the spot, gate shut (`s3-clear` unset, `g-s3` closed); then the client is sent back the same way through the `back`
event, gate shut; then the existing jam handoff (the host now jams from the lobby spot).

Checks (laptop, software GL, port 4191):
- `npm run check`: lint 0 errors / 41 warnings, build ok (1m 48s); Vitest 2401 passed, 2 files failed under load:
  `smoothWorldLight.test.ts` (beforeAll hook timeout 120 s) and `ctcourseLight.test.ts` ("bakes in node fast enough",
  timing). Rerun alone with `jammer.test.ts`: 3 files passed (51 tests, 1 skipped), 62 s.
- e2e, E2E_JOBS=2: e2e-coop ok 153 s, e2e-netmove ok 212 s, e2e-sectorops ok 148 s, e2e-ctcourse FAIL 264 s (the cue
  pulse check with the host at the lobby spot: the camera does not see it there). After moving the pulse checks: e2e-
  ctcourse rerun alone ok 307 s (station 3 all asserts ok, both send-backs).
- Full `npm run e2e`: not run (before the PR). Bay 3 GPU look: pending PC run.

## Fix round 2
Written by the fix-round implementer (2026-10-22). Scope cut by the orchestrator mid-round: no full e2e (after 04:00).

1. Stale-position gate hole (blocking). Done. New state `HALL_SENT` in the pure `hallStep` (`src/game/jammer.ts`, now
   `hallStep(state, inLobby, inHall, inFar, stage, held)`): a sent-back player does not count for the gate until their
   reported position is in the entry lobby (new `HallRule.lobby`, bay x 0-3 full width) or the hallway after
   `HALL_BACK_HOLD` (3 s, the same constant `RemotePlayer.moveTo` now uses for its teleport grace). The hold applies to
   the client only (the host's own player moves at once). Still in the far lobby after the hold = the move did not take:
   sent back again. Seen by the camera in the hallway while sent back: sent back again. Stale positions in the hallway
   or the far lobby inside the hold cannot clear it, and the host copy standing at the lobby spot (moveTo's position,
   not a report) does not clear it either. `ctDevices.ts`: per zone/player `hallHold`; the pass counts only `HALL_IDLE`;
   `debug()` exposes `hall` / `hallHold`.
   Tests: `tests/jammer.test.ts` "fix round 2" (5 cases, 60 Hz walk of the host's view: send-back at x 13.5 then stale
   far-lobby positions with an empty meter -> no pass; stale positions held past the grace -> sent back again, no pass;
   a late stale far position after the copy sat at the lobby spot -> no pass; a real arrival after being back in the
   lobby -> pass; a re-run started inside the hold -> pass at the far end) plus the lobby box data check; the fix-round-1
   cases moved to the new signature. `scripts/e2e-ctcourse.mjs` station 3: the host waits in the far lobby while the
   client is sent back; for 0.8 s the host rewrites every client report to a far-lobby position (inside the grace);
   asserts the reports landed and the gate stayed shut, then that the client clears once seen in the entry lobby. Not
   run yet (no e2e this round).
2. Hallway light with the station 3 lamps off. Broken, fixed. Bake numbers (body level on the camera line, z 1.6):
   lamps on 0.76-1.00; all four station 3 lamps off: 0.30 (the fill) everywhere. Camera meter for an unjammed runner
   (4 m/s) along the hallway: lamps on, caught at bay x 6.3; all off, never caught (meter 0.63 at the far lobby, max
   rate 0.63/s); walk 0.49, sneak 0.42, crouch 0.00 - nobody caught. One hallway lamp off: x 6 off -> runner caught at
   8.1; x 11 off -> 6.3; lobby lamps off -> 6.3. So two players jamming the two hallway lamps (or shooting them) passed
   bay 3 without jamming the camera. Fix: the hallway lamp at bay x 6 (`S3_HARD_LAMP_X`) is not electric (no jam, no
   EMP) and not destructible; its light is unchanged (the tuned levels hold). With every other station 3 lamp out a
   runner is caught at bay x 6.3. Light parity kept (the camera still sees by the light). New regression test in
   `tests/ctcourseLight.test.ts` (every darkenable S3 lamp out: a runner and a crouch walker are caught in the hallway).
   The e2e lamp jam uses the x 11 lamp (still jammable).
3. Master merge: done before the scope cut, commit `00c4a3fc` "marlow-jammer: merge origin/master (4.44.0)", only the
   resolution. Conflicts: `CHANGELOG.md` (this job's Unreleased section on top, master's 4.36.0-4.44.0 below),
   `tests/ctcourse.test.ts` (this job's S3_PASS imports plus master's `courseUser`), `scripts/e2e-ctcourse.mjs` (this
   job's station 3 kept; master's #85 cue change applied: the `pulse` field is gone, so the post-gate cue checks are now
   `seen && shown`; master's own pre-jam cue checks dropped since a seen player is sent back there). Master's pause-menu
   block and `use(..., 'local')` merged cleanly. PROTOCOL_VERSION stays 26. `tsc` clean after the merge.

Checks (laptop, after the runner freed the laptop): `npm run check` pass, 4 min 17 s (lint 0 errors / 41 warnings,
Vitest 229 files / 2536 passed / 7 skipped, build 1m 45s). The visionIsolation snapshot (line endings only) restored.
Not run: full `npm run e2e` and e2e-ctcourse with the new assert (orchestrator: after 04:00). Bay 3 GPU look: pending PC run.

## IR cameras (Michael M3)
Written by the implementer (2026-10-22). Michael did not approve J4; cameras see in the dark instead.

1. J4 undone. The bay x 6 hallway lamp is a plain jammable / EMP-able / shootable strip again (`S3_HARD_LAMP_X` and its
   special case gone from `src/world/maps/ctcourse.ts`; light levels unchanged, same intensity and radius).
2. Cameras see by their own IR. `CAMERA.irLight` = 1 (`src/config/security.ts`): `cameraRate(dist, crouched, speed)`
   (`src/security/camera.ts`) runs the guard formula at that light instead of the body's light. Why 1: the perception
   light factor saturates at `LIGHT.lit` 0.6, so a fully lit body already scored 1; every lit detection rate is exactly
   what it was (the SN08 / SN09 times hold), only dark bodies change. The frame test (range 18 m, 70 x 45 deg cone, clear
   static ray) is unchanged, so "inside its range and cone" is the existing `covers` + ray. Applies to every security
   camera (Marlow Yard, Sector Ops, the Kestrel seclab). The camera path no longer samples light at all:
   `cameraSight(c, head, crouched, speed, ray)`, `SeenBody.light`, `SecurityHost.lightAt`, the co-op client's
   `GameState.bodyLight` and `CtDevices.lit` removed. Guards and the light meter unchanged (light parity for them holds).
3. Regression (`tests/ctcourseLight.test.ts`): all four station 3 lamps out (every one now darkenable, asserted): the
   hallway falls to 0.30 at body level; an unjammed runner (4 m/s) is caught at bay x 6.3 (the same point as lamps on),
   a crouch walker at bay x 7.1; scored by the lamps (the old maths, a guard) the runner is never caught - the dark is
   real, only the camera ignores it.
4. Sector Ops: nothing in tests, scripts or the sector-ops docs relied on darkness hiding a player from a camera; the
   PLAN's "dark lanes / dark aisles" are guard cover and stay so. Behaviour change: a player in shadow inside a camera's
   cone is now seen there (before: in shadow 0.28 a walker at 4 m took about 13 s, at 10 m never). e2e-sectorops passes.
   The Kestrel `e2e-security` (legacy, report only) asserted a crouched player in the seclab's dark corner is not seen;
   now it asserts the IR sees it (meter 1.00 in 15 s at light 0.17); passes solo.
5. Unit tests: `securityCamera.test.ts` - the two shadow cases replaced by an IR case (camera rate = the lit guard rate
   at 4 / 10 / 16 m, walk / crouch-still / run; a guard in shadow is slower); `cameraCue.test.ts` - a still body in
   frame is seen (no light argument).
6. Docs: `docs/systems/lighting.md`, `docs/systems/gadgets.md`, bible Sensors line (it said "light-dependent like
   guards"), CHANGELOG (the fix-round-2 lamp sentence dropped, an IR line added).

Checks (laptop, software GL, port 4191): `npm run check` pass, 5 min 23 s (lint 0 errors / 41 warnings, Vitest 229
files / 2535 passed / 7 skipped, build 1m 59s; no light-test timeouts this time). Full `E2E_JOBS=2 npm run e2e`: all
required suites passed, wall 1526 s (e2e-ctcourse 3 parts 356 / 286 / 282 s, coop 263, netmove 250, sectorops 120, pad
137; no failures, no reruns). e2e-ctcourse ran the fix-round-2 stale-report assert: ok (2 stale reports, gate shut).
`e2e-security` solo: ok. visionIsolation snapshot (line endings only) restored. Bay 3 GPU look: pending PC run.

Follow-ups:
- Visual: the camera's IR is not shown (e.g. an IR glow on the housing in night vision, or the cone reading as lit in
  night vision). No visual work in this change.
- The Kestrel editor's security tool (paused, G53) still tints a camera's cone by the light (`src/editor/security.ts`
  `camera class ... by the light`); with IR every in-frame cell is "lit". Update if Kestrel resumes.
- Light disruptor / lamp shots no longer help against cameras (ct-toolkit 3.5 says nothing either way; noted only).
