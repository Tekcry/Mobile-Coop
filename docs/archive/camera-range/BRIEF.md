# camera-range - BRIEF

Job lead: Night Shift | Course Ready Build (sector-redesign M5). Branch `feature/camera-range` from master 4.63.1.

## The ask
Michael (2026-10-23 ~01:35): "cameras need to have less range (they currently pick the player up well outside of the
intended area)". M5: it applies to ALL maps, as one engine change.

## What was measured (`MEASURE.md`, `tests/cameraReach.test.ts`)
Every camera of every live map with cameras (Marlow Yard `ctcourse`, Sector Ops `warehouseOps`, the Security Lab
`seclab`; Kestrel ships none; Fallow is parked), built from the map's own pieces and swept over its whole pan.

Why the 4.63.1 cameras reached too far:
- The fill rate was the guard's: its distance falloff runs over the guard's 25 m focus range, so inside a camera's range
  the rate was still high right up to the range cut (at 12 m of a 12 m camera a walker filled the meter in ~1.6 s).
  Every camera picked a body up at its full range, whatever the stance.
- A camera with no `range` of its own reached 18 m. Marlow Yard's cam-s3 (station 3) has none: from the hallway's far
  end it reached 15.2 m, through the whole 12.6 m hallway and 2.6 m into the entry lobby (to its west wall, 30 floor
  cells). The Security Lab cameras (no aim, no range) reached 17.9 m: across into the other half of the room.

Picked-up reach (horizontal m from the mount), before -> after:

| Map | Camera | Range | Stand still | Walk | Run | Crouch still | Crouch move | Intended far edge |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marlow Yard | cam-s3 | 18 -> 13 | 15.2 -> 11.8 | 15.2 -> 12.3 | 15.2 -> 12.5 | 13.7 -> 10.7 | 15.2 -> 11.7 | 12.6 (hallway mouth) |
| Sector Ops | cam-yard | 10 | 8.5 -> 8.5 | 8.5 -> 8.5 | 8.5 -> 8.5 | 9.6 -> 7.9 | 9.6 -> 8.7 | 10 |
| Sector Ops | cam-bay, cam-rack-sw, cam-rack-ne | 12 | 11.9 -> 10.8 | 11.9 -> 11.3 | 11.9 -> 11.5 | 11.8 -> 9.8 | 11.8 -> 10.7 | 12 |
| Sector Ops | cam-floor | 14 | 13.8 -> 12.6 | 13.8 -> 13.2 | 13.8 -> 13.4 | 13.5 -> 11.4 | 13.7 -> 12.4 | 14 |
| Sector Ops | cam-stairs, cam-mezz | 12 | 11.9 -> 10.9 | 11.9 -> 11.4 | 11.9 -> 11.5 | 11.9 -> 9.9 | 11.9 -> 10.8 | 12 |
| Security Lab | cam-fixed, cam-pan | 18 -> 12 | 17.4 -> 10.8 | 17.9 -> 11.3 | 17.9 -> 11.5 | 13.6 -> 9.8 | 17.0 -> 10.7 | 11.5 (half the room) |

Picked up outside the intended zone, after: none on any camera (before: cam-s3 the entry lobby to 15 m, cam-floor one
parts-store cell at 13.7 m, both lab cameras the other half of the room to 17.9 m). cam-yard is held by its frame's
top edge (8.5 m for a standing head), not its range.

Fill times inside the zones hold: Marlow Yard station 3, a standing player still at bay x 6 (the e2e spot, 9.6 m out)
fills in 3.0 s (was 2.75 s); an unjammed runner is caught at bay x 7.3 (was 6.3), a walker at 7.0 (5.9), a crouched
0.8 m/s mover at 8.0 (7.1); the hallway still cannot be run without a jam.

## The change (one engine change)
- `CAMERA.range` 18 -> 12: the range of a camera with neither `range` nor `aim` (the Security Lab, Kestrel cameras).
- `camRange`: the camera's own `range`; else an aimed camera watches the floor patch centred on its aim point, range =
  `CAMERA.aimReach` 2 x `aim` (Marlow Yard cam-s3: 6.5 -> 13 m; every Sector Ops camera's data already follows it: 5 / 10,
  6 / 12, 7 / 14); never over `CAMERA.rangeMax` 14.
- `cameraRate(dist, crouched, speed, range)`: the guard's terms (rate 2.2, stance, motion, exposure, cap) at the IR light,
  but the distance falloff runs over the camera's own range: 1 - (d / range)^`CAMERA.edgePow` 2 (was (1 - d / 25)^1.5).
  It is close to the old curve in the zone (at 6 m: 0.75 against 0.66) and 0 at the edge, so the outer ~3-16 % of a
  range never fills the meter (`cameraReach`, from the lens: 0.91 of the range standing still, 0.95 walking, 0.97
  running, 0.84 crouched still, 0.91 crouched moving; MEASURE.md has the per-camera numbers with walls and frame).
- `cameraSight` passes `c.range`: the host's think and the co-op client's cue call the same function on a `CameraUnit`
  built from the same data. No wire change, `PROTOCOL_VERSION` unchanged. Allocation-free.
- The cue already draws to `camRange` (grid and shader mask), so it follows cam-s3's and the lab's shorter ranges.

CT: the research has no CT camera numbers ("Camera numbers in co-op: UNKNOWN (06 checklist 1) - D-14 plus starting
values", `docs/ct-research/kit-design-digest.md`); the design kit asks for "cameras with detect / recognise / identify
ranges" (`docs/ct-research/design-kit-digest.md`, 4.3 and gate G7 "real camera ranges"): certainty falls with distance,
which the falloff over the camera's own range models. These are starting values (G10).

## Assumptions (A1..), each with how to undo
- A1. The intended zone of an aimed camera is the floor patch centred on its aim point: 2 x aim (sector-fixes C's ranges
  already are). Undo: `CAMERA.aimReach` (or give cam-s3 a `range` in `ctcourse.ts`).
- A2. The default range is 12 m (half the Security Lab, which says its cameras cover "the west half" / "the east end").
  Undo: `CAMERA.range` back to 18.
- A3. The falloff exponent is 2 (keeps the zone's fill times, cuts the edge). 1 would cut harder (crouched still reach
  0.70 of the range) but slows every fill inside the zone; higher values bring back the hard cut. Undo: `CAMERA.edgePow`
  (a very large value is the old hard cut at the range, with the new zone ranges).
- A4. The camera keeps no close-range term (its doc already said so; the guard formula added one under 1.8 m, which a
  mounted camera's frame never reaches). Undo: add the term in `cameraRate`.
- A5. The Sector Ops cameras' data was not touched (they already matched their zones by room; the change there is the
  soft edge: reach 0.5-2 m shorter by stance). To shrink them more, lower their `range` / `aim` in
  `warehouseSectors.ts` or `CAMERA.aimReach` after a playtest.
- A6. `CAMERA.rangeMax` 14 (the longest zone today, cam-floor) replaces 18 as the validator's cap. Undo: raise it.
- A7. The scan counts every door as open (door leaves are not pieces) and zones Sector Ops by the S1-S3 rooms the
  camera's reason names (coarse rooms). Undo: n/a (measurement only).

## Tests changed (numbers from the table)
- `tests/securityCamera.test.ts`: frame tests inside the 12 m default; SN08 / SN09 restated at the zone middle (6 m of
  12: walk ~1 s, crouched still ~3.5 s); new: the rate is 0 at and outside the range and under the leak in its outer 3 %;
  the range rule; a player just outside the reach is not picked up, inside is; client cue rate = host rate = meter step.
- `tests/cameraReach.test.ts` (new) + `tests/cameraReachScan.ts`: the per-camera scan; cam-s3 never in the entry lobby;
  no camera's reach grows or reaches a new zone.
- `tests/cameraCue.test.ts`: `rangeMax` cap; Sector Ops ranges are 2 x aim.
- `tests/jammer.test.ts`: cam-s3's range is 13 and no airlock point is even in range (was: in range, behind walls).
- `tests/ctcourseLight.test.ts`: the dark-hallway runner uses cam-s3's range (still caught, at bay x 7.3).
- `tests/editor/security.test.ts`: the editor's coverage points inside 12 m.
- `scripts/e2e-security.mjs`: the lab spots inside the 12 m zones (strip 9 m, dark spot (7.5, 2.5) with the lamps out,
  pan pad 7.5 m). `scripts/archive/camera-cue-shots.mjs`: spots within each camera's own range. `e2e-ctcourse` and
  `e2e-sectorops` need no change (their spots are inside the zones; times in MEASURE / above). Not run here (laptop).

## level-design.md Section 12
Section 12 lists no security-camera engine fact (only the shoulder camera), so nothing to propose there and no map
decision relied on one. Related but outside Section 12: the Kestrel S0 spec's SN03 18 m and its derived SN08 / SN09
times (`docs/kestrel/S0-security-spec.md`, Kestrel paused, G53) are now the 4.63.1 values; `docs/kestrel/00-facts.md`
F42 is updated. Map decisions that leaned on the old 18 m: Marlow Yard station 3 ("Its range stays 18 m (the walls
bound it)", `ctcourse.ts` comment, owned elsewhere tonight: its range is now 13 by the aim rule) and the Security Lab
layout ("the fixed camera sees x 3 to 18 along it", `seclab.ts`).

## Open
- The cue grid is drawn to the range; the meter now fills only to ~0.84-0.97 of it (by stance), so the grid's outer
  band shows where a slow or crouched body is not yet picked up. Polish item: fade the grid over that band.
- `ctcourse.ts` comment on cam-s3 ("Its range stays 18 m") is stale; that file is out of bounds tonight.
- The Kestrel editor's coverage preview still tests level at `CAMERA.range` (now 12) with no falloff (Kestrel paused).
