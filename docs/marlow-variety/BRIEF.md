# marlow-variety - brief

Job lead: the marlow-bunker session (desktop), started by the orchestrator on 2026-10-21 ~07:30. Branch
`feature/marlow-variety` from `feature/marlow-bunker` @ 80d49dd3, folder `C:/NightShift/Mobile-Coop-marlow-variety`.
One PR to master after #62 (marlow-bunker) merges.

## The ask
Michael (~07:30, through the orchestrator) chose "Marlow variety": build the marlow-bunker polish list
(`docs/marlow-bunker/STATE.md`):
- S1 sentry desk and a blast-door frame round the lift lobby
- S3 monitor wall
- south-pocket plant rooms and north-pocket instructor booths
- S5 plywood faces and painted window outlines
- S6 scanner frames and server racks
- S7 return stair as coloured training blocks
- S8 6 m coffer with an LED ring over the exit
- a frame on the S4 red release
- hazard stripes on the door frames (kept off yellow)

## Limits (orchestrator)
The rules of #62: the open floor stays 0.30, light parity proved by `tests/ctcourseLight.test.ts`, no new ledges or
climbs, element register rows, routes and patrols clear. One Opus implementer (the job lead) and one fresh checker, one
fix round. Full e2e by Character Build (laptop); copy the orchestrator. GPU look pending a PC run.

## Assumed decisions (each with how to undo)
- A1 The S1 sentry desk is collide=false: a 0.75 m solid desk is a vault / mantle target (`movement.ts`, height <= 1.8),
  which is a new climb. Undo: drop `false` from the desk's boxes in `ctcourseVariety.ts` `sentryDesk`.
- A2 The instructor booths are one-way observation glass (a dark mirrored panel in a frame, no opening, no lamp): an open
  window would add a light path into the S3 camera cell and S4. Only A3 and A4, as the audit says (A5's face is inside
  the kill-house). Undo: the `boothFace` calls in `buildVariety`.
- A3 The plant rooms are their faces in the cells (louvre, steel door, trunking); the pockets stay sealed void. Not on
  A5's west face (inside the kill-house's back room, by the hack panel).
- A4 The S6 racks stand just north of the S6 west door (z 8 - 10.5), not further north: there they shaded the corner by
  the panel (0.48 -> 0.30 at x0 + 0.6, z 13.4). Solid, `noLedge`, 2 m (too tall to vault or mantle).
- A5 The S6 scanner frames are collide=false (0.3 m proud, in the bake): solid pilasters would change cover and corners
  at the scanners.
- A6 The S8 coffer is a 4 x 6 m recess between the cell's last two ribs (x0 + 10.5, x0 + 14.5) closed by two short beams
  at z 4 and 10, not a 6 x 6 cut in the slab: the exit lamp stays where it is (no light change). Its LED ring is faintly
  green: the exit, the same element as the green exit square.
- A7 The S7 training blocks are paint on the blocks' east risers and north sides (and a white nosing): the blocks' own
  colour sets their surface (footsteps), so it is unchanged.
- A8 Hazard stripes: black jambs with white diagonals on every course door frame; the heads stay steel.
