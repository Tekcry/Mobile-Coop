# E6 - EW10 security desk in Sector Ops (engine builder)

Branch `feature/sector-redesign-e6`, base b550cc2a. Engine, data shape and unit tests only: no map data, no campus
files, no e2e, no build. Nothing committed. Assumptions are numbered S1.. for the lead to renumber.

## Result
Done. A map's security data can list desks. A desk's console loops its listed cameras for a timed window (they keep
sweeping but report nothing; default 30 s, `loop` per desk), and a second use while looped switches them off until a
section restart. While the operator (a guard of the desk's section) is alive, awake and at his post, the console is
refused. Host-authoritative. The co-op client sees the camera state with no wire change: it reads the desk mode back
from the mirrored console item label. `PROTOCOL_VERSION` is untouched. A section restart or a section change puts the
cameras back.

## Data shape (`SecurityData.desks`, i.e. `MapLayout.security.desks`)
```ts
// in a map's build(), inside layout.security next to devices
desks: [
  // S4 security room: officer #3 of section 3 watches cam-dock and cam-yard; a 30 s loop (default)
  { id: 'desk-sec', section: 3, at: [18.0, -74.0], yaw: Math.PI, cameras: ['cam-dock', 'cam-yard'], operator: 3 },
  // unmanned desk, raised floor, a 20 s loop
  { id: 'desk-lab', section: 2, at: [40.0, 5.0], yaw: 0, y: 4.4, cameras: ['cam-lab'], loop: 20 },
],
```
- `section`: the Sector section index (as `CameraDevice.section`). `at` [x, z] is the console; `y` its floor height
  (default 0); the item box sits 0.9 m above it (`DESK_ITEM_Y`). `yaw` in radians.
- `cameras`: camera ids it controls. `operator`: an index into that section's `guards` (the same slot ref as an
  overhear's `talkers`); none = unmanned. `loop`: window in s (default `DESK_LOOP_TIME` 30).
- Placed on `SecurityData` (not `SectorDef`) because the cameras it names live there and it names its section like a camera.

`checkSectors(defs, nav?, security?)` (third argument new) runs `checkDesks`: duplicate desk id, section that does
not exist, no cameras, a camera id that is not a camera of the map, a camera in another section, an operator that is not
a guard index of the desk's section, a loop window not above 0.

## Runtime hunks
- `src/game/sectorDesks.ts` (new, pure): `SecurityDesk`, constants, `SectorDesks` (`use`, `step`, `reset`),
  `operatorAtPost`, `deskCamMode`, labels and `deskModeOf`, `deskItemId`, `checkDesks`.
- `src/security/data.ts:41`: `SecurityData.desks?`.
- `src/security/camera.ts:186`: `CameraUnit.desk` (0 none, 1 looped, 2 off).
- `src/game/ctDevices.ts:587` `setDesk(ids, mode)` (both roles; applies at once on a change, no allocation);
  `:908` `applyJam` reads the desk mode through `deskCamMode`: jammed / rebooting / section not live / console flag /
  desk-off -> `off`, desk loop -> `looped` (`sees` false, sweep keeps turning), else `online`. With no desk the old
  behaviour is unchanged (same transitions, same `camOff` set).
- `src/game/modes/sectorMode.ts`: `:168` desks built from `g.world.layout.security.desks`; `:216` `findDesks` at start;
  `:404` one console item per desk (`desk-<i>`, kind `switch`, hold 1.5 s, reach 1.6 m); `:423` `deskManned`; `:436`
  `useDesk` (also the e2e hook); `:455` `deskApply` (cameras, label, enabled only in the live section and not off);
  `:515` section load resets the desks (covers restart, which unloads + loads, and the connector's load); `:538` unload
  resets them; `:851` the fixed step runs the windows down, a loop's end feeds "Camera loop ended." to both players;
  `:953` `debug().desks`.
- `src/game/sectors.ts:547`: `checkSectors` calls `checkDesks`.
- `src/net/coopClient.ts:344,372`: `deskSync` after each snapshot's items: per desk, the mirrored item's label ->
  `deskModeOf` -> `ct.setDesk`. Client use goes through the existing `use` -> host `onUse`.

## Assumptions
- S1 One console item per desk that steps: "Loop cameras" -> "Switch cameras off" (while looped) -> "Cameras off"
  (disabled until a restart). Undo: two items, or a per-desk `mode` in data.
- S2 Operator "at his post": alive, not knocked out, within 2.5 m plan of the console (`DESK_POST_RADIUS`). A lured,
  investigating or searching operator who has walked away frees it; one standing at the desk while alerted still holds
  it. No sleep / dormant state is read (guard-ai owns it).
- S3 An operator not spawned yet (pending, e.g. a player within 7 m of his slot) counts as at his post; one capped out by
  `?sectorGuards` counts as absent.
- S4 A desk's console is usable only while its section is live; other sections' consoles are disabled.
- S5 The co-op client reads the desk mode from the item label (24-char cap respected); the label strings are the
  contract (`deskLabel` / `deskModeOf`). A client-side camera follows within one snapshot. The host's per-tick
  detection is authoritative either way. Undo with a wire field (needs `PROTOCOL_VERSION`, guard-ai owns 32).
- S6 Looped and off both hide the LED (the existing `SecurityView`: LED on only when online) and the red scan cue; a
  looped camera keeps sweeping (`advance` runs), an off one too (existing behaviour of `off`). A jammed looped camera
  shows as off and goes back to looped after the reboot.
- S7 Refusal "The operator is on watch. Take him out first." on the using machine only (host feed); a client's
  successful use gets its line through `radioLine` (feed event); the loop's end line goes to both.
- S8 Bodies (guard-ai M6 "cameras see dead or knocked-out guards") are not built here; when they are, a looped / off
  camera must report nothing of them either (`sees` false already gates the host think).
- S9 A desk camera that is shot stays shot (repair only on restart, as before); the desk does not repair it.

## Tests
`tests/sectorDesk.test.ts` (new, 17 tests): default and data loop windows, loop -> off until reset, refuse after
off, manned refuses and changes nothing, bad index, `operatorAtPost` (radius, KO, dead), label round-trip and the
24-char cap, `deskCamMode` + a looped `CameraUnit` blind but still sweeping, `SectorDesks.step` allocation (<= one
HeapNumber per call, `allocPerCall`), `checkSectors` with and without security data, every `checkDesks` error; mode
wiring on a stub game: items per desk and live-section enable, operator at post blocks / KO / dead / lured frees,
pending operator blocks and capped-out frees, loop then off drives the cameras and labels and a client use gets the
net line, non-live desk refused, unload and load (restart / change) put the cameras back, `fixedUpdate` ends the loop at
the window with the line to both.

## Results
- `npx tsc --noEmit -p .`: clean.
- vitest `sectorDesk`, `sectors`, `sectorRestart`, `sectorKeypad`, `sectorIsolator`, `sectorStageActions`: 6 files,
  101 tests pass. Extra: `jammer`, `laserAlarm`, `cameraCue`, `coopFix`: 4 files, 73 pass.
- eslint on the 8 changed / new files: clean.
- No build, no e2e (brief).

## Not done / for the lead
- No map uses a desk yet (S4's builder places one with its operator; pass `layout.security` as the third argument of
  `checkSectors` in that map's test).
- No e2e part (PLAN E6 lists e2e: `window.__sector.useDesk(i)` and `debug().desks` are ready for it).
- `docs/systems/*` and `TESTING.md` not updated (engine only, no playable map data yet).
