# ON1 - Room tools part 2: wall chains, door centring, live sizes, guide lines (ED3-3b)
Model: Opus, medium effort.
Decisions: 12

Read `ED-overnight.md` section 5 first. Then read: `docs/kestrel/editor-controller-review.md` section 5 (steps 3c, 4);
`docs/kestrel/prompts/ED2-editor-v2.md` lines 298-341 (Part D Must 2 and 3); `docs/kestrel/editor.md` sections
"Controller", "Smarter A", "Rooms and their walls"; `src/editor/grab.ts` (all), `src/editor/roomWalls.ts` (exports
only), `src/editor/geometry.ts` (exports); in `main.ts` grep `toolDown`, `endDrag`, `dragged`; in `padControl.ts` grep
`updatePointers`, `candidates`, `magnet`.

| # | Decision |
| --- | --- |
| 1 | **Wall chains** (Wall tool): A starts a wall; each next A ends it and starts the next from that end; B ends the chain (the wall being drawn is dropped); A on the chain's first point closes the loop and ends it. X while drawing removes the last finished segment. The whole chain is one undo step: "Added 4 walls (a chain, 18 m)". Mouse: click, click, ...; Esc or right click ends. |
| 2 | Chain segments keep the first wall's kind and thickness (Wall tool copies the last wall selected, as now); new walls default to `wallInterior` from facts.json. |
| 3 | **Door centring**: the Door and Window ghost snaps its centre to the middle of the clear run between the two nearest cross walls (walls meeting this one, or its ends) when the dot is within 0.5 m of that middle; the dot says "Centred". LB held turns it off. Pure function in `grab.ts` or a new pure module, tested. |
| 4 | **Door distances**: while placing or sliding a door or window, the dot and the plan show the clear distance from each side of the opening to the nearest cross wall face (or wall end), e.g. "1.2 m | 2.4 m". |
| 5 | **Live sizes while drawing or dragging**: a room shows "4 x 3 m, 12 m2"; a wall shows its length and the clear distance to the nearest parallel wall on its level within 10 m (face to face); a stretched room edge shows the new size and the distance to the nearest parallel wall it approaches. Shown at the dot (3D) and as text on the plan (dashed). |
| 6 | **Guide lines**: while the magnet holds a snap, a thin line runs along the wall line or through the point snapped to (3D: a thin box on the floor; plan: a dashed line), for as long as the snap holds. |
| 7 | **Smart snapping, rest of Part D Must 2**: room edges snap to wall faces and to other room edges on the level (within 0.3 m); wall ends snap to other wall ends and onto wall lines (the magnet already covers points and lines; add room edges to the candidates). One table of distances in `grab.ts`. |
| 8 | Live words use `fmt` (two decimals at most) and metres; nothing typed twice: the same pure functions feed the dot and the plan. |
| 9 | Hint bar (pad) while chaining: "A Next wall", "X Remove last", "B End chain", "LB Fine". |
| 10 | Vitest: chain (3 segments then close = 4 walls, one commit; X removes the last; undo restores exactly), centring (between two cross walls, at a wall end, LB off), distances (both sides), parallel-wall distance, room-edge snap. |
| 11 | e2e (fake pad): chain a 3-wall run and close it (4 walls, one undo step); place a door near the middle of a wall between two cross walls (centre within 0.01 m of the middle); the live size words while drawing a room; a guide line shown while snapped. |
| 12 | Screenshots: a chain being drawn with its length; a door ghost "Centred" with its two distances. |

End per section 5. Commit id `ON1`.
