# mixamo-retarget M4 - report (channel-clip emitter for traversal)
Owner: Player Build. Status: done (2026-10-25), branch `feature/mixamo-retarget-m4`.

## Built
- `scripts/mocap/mixamoChannels.mjs`: the M2 take (`loadMixamoTake`) rebuilt on the 1.75 m standard body by FK, then
  written as a `makeClip` module per traversal clip (the channels `traverse.ts` keys: pelvis, trunk, head, hand and foot
  targets, `grip` / `offGrip` / `width` / `wpPitch` as the clip replaced).
- Key reduction: greedy worst-sample insertion on the game's own curve (monotone cubic, `curves.ts`), held within
  1 cm / 1 deg of 240 (loop) or 400 (path) dense samples.
- Clocks:
  - `chanLoop`: keyed over the cadence (0 = right hand's reach starts, 0.5 = left's, as `AttachGrips.cadence`), in place
    (travel over the cycle taken out). The hang idle has no reaches: over its own 4.7 s.
  - `chanPath`: keyed over climb-up progress k against the game's root path (`CLIMB_UP_PATH`; the ladder top-out's rise
    and step in), warped so the first hand off lands on `CLIMB_UP_HANDS.k0` (0.475), the foot on top on `CLIMB_UP`'s
    offGrip rise (0.56) and the crouch on `CLIMB_UP_CROUCH_K` (0.654). An event out of order is dropped and listed; every
    event's landing k is in the module's `events`.
- Output: `src/anim/clips/mixamo/trav_<slug>.ts` (first line "GENERATED ... Do not edit"), 8 rows in the
  `@mixamo-trav` block of `mocapSources.ts` (Studio loops `trav:ledge` / `trav:ladder` / `trav:vent`, so each shows in
  M5's "motion capture" group), `docs/mixamo-retarget/CHANNELS.md` (generated, per clip method and numbers).

## Regenerate (one command)
On the job branch (has M2's adapter): `node scripts/mocap/mixamoChannels.mjs`. On this slice branch (no
`mixamoTake.mjs`): `node scripts/mocap/mixamoChannels.mjs --take=../Mobile-Coop-mixamo-retarget/scripts/mocap/mixamoTake.mjs`.
`mixamoMap.mjs` / `mixamoTake.mjs` not edited; rerun after the M2 spine fix.

## Clips
| Clip | Kind | Keys | Take s | Max error | Events (k) |
| --- | --- | --- | --- | --- | --- |
| hanging_idle | chanLoop | 96 | 4.700 | 0.86 cm, 0.95 deg | none (own seconds) |
| braced_hang_shimmy_left | chanLoop | 172 | 1.167 | 0.94 cm, 0.98 deg | rReach 0, lReach 0.5 |
| braced_hang_shimmy_right | chanLoop | 165 | 1.167 | 0.97 cm, 0.98 deg | rReach 0, lReach 0.5 |
| climbing_ladder | chanLoop | 172 | 0.767 | 0.99 cm, 0.96 deg | rReach 0, lReach 0.5 |
| crawling_hands_and_knees | chanLoop | 212 | 1.800 | 0.99 cm, 1.00 deg | rReach 0, lReach 0.5 |
| freehang_climb | chanPath (stand) | 728 | 3.700 | 1.00 cm, 0.99 deg | release 0.475, onTop 0.394 (dropped), crouch 0.654 |
| braced_hang_to_crouch | chanPath (crouch) | 341 | 1.133 | 1.00 cm, 0.99 deg | release 0.475, onTop 0.463 (dropped), crouch 0.654 |
| climbing_ladder_to_standing | chanPath (stand) | 407 | 1.942 | 0.99 cm, 1.00 deg | release 0.475, onTop 0.56, crouch 0.654 |

## Files
New: `tests/mixamoChannels.test.ts`, this report. From the cut-off builder, finished here: `scripts/mocap/mixamoChannels.mjs`,
`src/anim/clips/mixamo/trav_*.ts` (8), `docs/mixamo-retarget/CHANNELS.md`. Edited: `src/anim/mocapSources.ts`
(M4 block only). No `src/player` edit.

## Tests
`npm run typecheck:fast` clean. vitest: `mixamoChannels` 20 (game numbers read back from their source files, reduction
bound on the game curve, loop and climb-up clocks, a synthetic hang loop end to end, rows, the 8 committed modules
through `makeClip`), `mocapSources`, `animStudio`, `tunerReachProbe`: 45 pass. M5's attached probe (`attachProbe.ts`) is not
on this branch; its loop list covers `trav:ledge` / `trav:ladder` and names `trav:vent` open.

## Open items
- On both hang climb-ups the take's foot is on top before the first hand off (as in the game's own `CLIMB_UP`, 0.474 /
  0.475), so the foot-on-top anchor (0.56) is dropped there; it lands at 0.394 / 0.463.
- freehang_climb plays its 2.5 s hang and pull-up in 0.62 s of game time (x4); I2 measured its stand-up end popping
  (trunk 20 cm a frame) and keeps it off in matches (I2-REPORT.md).
- hanging_idle runs on its own 4.7 s (no cadence); I2 drives it at 1 / 4.7 per second.
- The ladder top-out only plays 0 - 0.654 in the game (it ends crouched); the stand keys after that are unused there.
- I2 did the `TRAVERSE_CLIP` swap (Wren only); still open: a Mixamo setup in `ATTACH_PROBE_SETUPS`, the crawl probe state.
