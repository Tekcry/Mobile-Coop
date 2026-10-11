# Kestrel route table
Planner, 2026-10-11 (Michael's decision). Built only from RULES.md section 1 (secret routes, line 15; traversal coverage, line 10) and the room ids in 02-building-brief.md section 5. It lists which move sits on which route; positions belong to P04 and P06. Every planner reads this file (PLANNER.md Start). A capability statement here cites RULES 1 or V0 by line, or a grep of src/world/anchors.ts (RULES 5); anything else is ASK.

## 1. Routes
| Route | Building element | Move(s) | Start | End | Source |
| --- | --- | --- | --- | --- | --- |
| R01 Service tunnel | Tunnel access shaft A (fixed ladder), walk-in tunnel TB03 / TB04, carrier riser (fixed ladder) | ladder, crawl space (tunnel) | AG22 (floor hatch to AG23) | BG31 (floor hatch from BG32) | RULES 1 l.15 "the service tunnel between the buildings"; l.10 "tunnel"; brief AG23, TB03, TB01, TB04, BG32 |
| R02 Pipe rack | Pipe rack X13 (5.0-6.5) over the gap | horizontal pipe (hands, legs up, inverted) | X05, A side | X05, B side | RULES 1 l.15 "the pipe rack between the buildings (horizontal pipes)"; brief X13. ASK: how the player mounts and leaves the rack (P06) |
| R03 Link bridge roof | Bridge roof LF02, fixed ladders from both roofs | ladder | AR01 | BR01 | RULES 1 l.15 "the link bridge roof"; brief LF02 |
| R04 Cooling supply shaft | Shaft BR05 behind a bolted, alarmed grille, 6.0 drop to the hall | rappel | BR03 (grille) | BG20 | RULES 1 l.15 "rappel in, behind a bolted, alarmed grille"; brief BR05 |
| R05 Corridor ceiling voids | 1.5 m voids over the office corridors; never into rooms whose walls run to the slab | crawl space (ceiling void) | AG10, AG26, AF01, AF21 (ceiling tiles) | Same corridors, or a cable riser (R06) | RULES 1 l.15 "corridor ceiling voids in the office floors"; l.18; brief AG10, AG26, AF01, AF21 |
| R06a Cable riser A | Riser with fixed ladder, side doors into both corridor voids | ladder | AG25 | AF16 | RULES 1 l.15 "cable and pipe risers with fixed ladders"; brief AG25, AF16 |
| R06b Pipe riser A | Riser with fixed ladder and roof hatch | ladder | AF19 (from AF10) | AR01 | RULES 1 l.15; brief AF19 |
| R06c Cable riser B | Riser with fixed ladder | ladder | BG15 | BF12 | RULES 1 l.15; brief BG15, BF12 |
| R07 Smoke vents | Smoke vents at the top of the fire stairs | ASK: way through the vent (P06) | AR01 / BR01 | AR04 / BR02 | RULES 1 l.15 "smoke vents at the top of the fire stairs"; brief AR04, BR02 |
| R08 Carrier manhole | Manhole lid and fixed ladder, vault, tunnel B branch, carrier riser | ladder, crawl space (tunnel) | X04 (lid of TB02) | BG31, then BG30 | RULES 1 l.15 "the carrier manhole and vault to the meet-me room"; brief TB02, TB01, TB04, BG32 |
| R09 Underfloor void | Level U under the hall, hinged hatches throughout | crawl space (underfloor) | BG20 (hatches) or BG23 (hatch to BU02) | BG20 (another hatch) | RULES 1 l.15 "the underfloor void under Building B's hall with hinged hatches throughout"; brief BU01, BU02 |

## 2. Traversal coverage (RULES 1 line 10)
Engine column: anchor kind from `AnchorKind` (src/world/anchors.ts:18), or a move mode from `MOVE_MODES` (src/player/moveState.ts:12-45) for moves that are not anchors.
| Move | Engine | Routes |
| --- | --- | --- |
| Ladders | anchor `ladder` | R01, R03, R06a, R06b, R06c, R08 |
| Drainpipes | anchor `pipeV` (handover: drainpipe maps to the vertical pipe) | not yet placed |
| Horizontal pipes (hands, legs up, inverted) | anchor `pipeH`; grips `hands`, `legsUp`, `inverted` (src/player/attach.ts:184) | R02 |
| Ledge hang and shimmy | anchor `ledge` | not yet placed |
| Split jump | anchor `split` | not yet placed |
| Wall jump | move mode `wallJump` (moveState.ts:34) | not yet placed |
| Rappel | anchor `rappel` | R04 |
| Fences | anchor `fence` | not yet placed |
| Windows | anchor `window` | not yet placed |
| Crawl spaces (ceiling voids, underfloor, tunnel) | anchor `duct` (`where` wall, ceiling or floor, anchors.ts:85) | R05 (ceiling), R09 (underfloor), R01 and R08 (tunnel) |
| Vault and mantle | move modes `vault`, `mantle` (moveState.ts:24-25) | not yet placed |
| Drops | move mode `drop` (moveState.ts:26) | not yet placed |
| Co-op boost and human ladder | move modes `boost`, `stacked` (moveState.ts:43-44); team states `boost`, `ladderUp` (src/game/teamController.ts:28) | not yet placed |
| Zip line | anchor `zipline` exists | Excluded on this campus (RULES 1 l.10) |

"Not yet placed" moves get a route in 1g (critical path) or P06 (traversal elements), each on a real building element.
