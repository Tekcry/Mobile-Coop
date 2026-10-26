# Tallow Wharf: egress and stairs table (J8 LP)
Owner: Campaign Build. Status: current.

Slice LP of J8 tallow-fixes (`docs/missions/slices/J8-J9-PLAN.md` section 6 row LP, "LP light plan and briefs"; G157
rule 10; master `docs/level-design.md` 16.2.1, 16.2.3, 16.2.5, 16.2.7, 16.3.6, 16.4.2). Frame: world metres, x east,
z north, y up (feet height of a walking surface). Map files are on `feature/mission-engine` e37987544; the map SPEC is
`docs/tallowWharf-map/SPEC.md` (TW23, from `origin/feature/tallow-spec`, path as it will be after B0b).

Rules every row follows:
- An exit opens from inside without a key (16.3.6). A bolt or bar sits on the inside of the space it secures, so a
  solo player can pass a bolted door only from that side (graph: a `bolted` link is passed alone only from its `to`
  end, `level-validate.mjs:225-227`).
- Every added stair or walk is shut from its approach side (push bar or bolt on the far side only), so it opens no solo
  bypass of a forced gate, and goes into D0's graph as a `bolted` link.
- No map relies on a fire alarm opening a door (level-design 16.3.6, open item 3).
- Bolt flags: `<section>-bolt<k>` from the index in `W<n>_BOLTS` (`tallowWharfSectors.ts:205-228`). New bolts append;
  the one removal is A29's (W2 slot 2), which renumbers W2 slots 3-4 to 2-3 (no mission, e2e or test reads a W2 bolt
  flag by number; the `missions` flag is off until the walk, A26, so no save holds one).

## 1. For D0 (the graph numbers in one table)
Lengths are door to door along the walk at the planning pace; `time_s` only where the validator needs one. Link numbers
are 0-based on today's graph. D0 deletes link 30 (A29) and link 32 (the dormer `window`, E6), so link 31 moves down
one and every link after 32 moves down two: the C5 throw (33) becomes **31**, E9's link 35 becomes 33 and E10's link 36
becomes 34 (fix round 1; the plan's hand-off line to Marlow said 32). New links are named `from>to`; D0's saved note
gives their final numbers (the fix-round-2 draft had them at 71-74).

| # | Link (`from>to`) | Kind | `bolted` | width | length | other fields | `at` | Built by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | `w2-pawn-loft>w2-reading-room` | `door` | true | 1.2 | 12.4 | - | [44.75, 4.5, 70.55] | G2 | A5 west bridge: gate at the pawn loft's north wall (44.75, 4.5, 67.6), bolted on the bridge side; bridge 5.9 m (z 67.6-73.5) + 6.45 m inside the reading room from the bridge doorway (x 44.75) to its stage door at x 51.2 (fix round 1: LP wrote 5.1 and 11.0). From the thrown partner's landing (51.2, 73.0) to the gate it is 12.9 m. Within A5 as the lead amended it ("13 m or less", LP pick 16; it was 12 m): reach 4.1-4.3 s at 3.0 m/s, far under 15 s; the stage cannot move west (it must stay 4.57 m from the bridge roof) |
| E2 | `w2-lane-window>w2-clock-loft` | `door` | true | 1.2 | 9.8 | - | [69.25, 4.5, 71.75] | G2 | A5 east bridge: the bridge sits at x 68.5-70 against the corner mass, so its gate is in the lane-window loft's north wall (69.25, 4.5, 70), not the pie loft's; bridge 3.5 m + 6.25 m inside the clock loft from the bridge doorway (x 69.25) to the clock stage's taking-in door at x 63 (fix round 1: LP wrote 4.5 and 8.0); 10.3 m from the pie stage's landing. A5 holds. The way back to the pie loft is then the lane-window loft's inner door (link 27). If D0 keeps the draft's `w2-pie-loft` end, its note must say the walk runs through the lane-window loft (+5 m, 14.8) |
| E3 | `w2-arcade>w2-reading-room` (link 21, `open_stair`) | unchanged kind | **true** (A25) | 2.4 | 27 | - | [55, 0, 65.875] | G2 | The stair-head door (55, 4.5, 73.5) has its push bar on the reading-room side |
| E4 | `w4-jetty>w4-canal-ledge` | `drop` | - | - | 6.0 | `level_change` 4.4, `time_s` 3 | [74.0, 0, 6.0] | G4 (no new geometry) | A6: the jetty's open south edge x 72-76 (the C10 pull edge, "the old staging ladder's gap", already open in the build: the jetty rail runs only x 76-86.75 and 89.25-100) drops onto the canal bed at (74, -4.4, 5.4); the bed runs on round the end of the fence foot (x 72, z 5-10) to the ledge. The 4.4 m lip stays in the co-op band, so no solo way up |
| E5 | `w1-market>w1-gallery` (link 73, was `w1-canal-steps>w1-gallery` `ladder`) | `fire_stair` | true | 1.3 | 11 | `level_change` 4.5, `assist` "tgc-leads" | [6.7, 0, 24.4] | G5 (J8; replaces G1's ladder, LP pick 1) | The market warden's caged stair up the gallery's canal-steps end: an enclosed iron core x 6.0-7.5, z 14.4-24.4 (walls to 6.9, roofed), its open foot arch (x 6.2-7.2) facing the market's west strip, a 27-riser flight rising south to a head landing flush with the deck; the head gate (6.0, 4.5, 15.1) on the deck edge is bolted on the gallery side at night, and the one boosted up unbolts it on landing (split tgc-leads: B's way up). Measured 10.96 m from the arch to the gate (G5-note) |
| E6 | `w2-lane-window>w2-arcade-roof` (link 31, `hatch`) | `ladder` (plant ladder, A7) | - | 1.2 | 16 | `level_change` 3.9, `time_s` 5 | [72, 4.5, 66.15] | G2 | The hatch and its fixed ladder stay where they are (hatch x 71.4-72.6 z 65.4-66.6; ladder line (72, 66.15)) and are walled in as a tank room, x 70.4-74.0 z 64.4-67.6, door (72, 4.5, 64.4). The note names the tank room. Link 32 (the dormer `window`, sharing the opening) is deleted: the sash is inside the tank room now and is no second way. With link 30 also gone, the C5 throw link (33) becomes 31 |
| E7 | `w2-arcade>w2-pawn-loft` (link 22, `fire_stair`) | unchanged | true (unchanged) | 1.3 | 14.5 | `time_s` 8 | [53, 0, 62] | G2 | The pawn fire stair is rebuilt along the loft's south facade (section 2, W2): the foot door (53, 0, 62) carries the push bar on the stair side; the walkway door (45, 4.5, 62) opens onto its top landing |
| E8 | `w2-walkway>w2-pawn-loft` (link 25, `door`) | unchanged | - | 1.2 | 6.5 | - | [45, 4.5, 62] | G2 | The walkway door moves from x 49 to x 45: it now opens onto the pawn stair's top landing, and the loft door (45, 4.5, 63.65) leads on into the loft |
| E9 | `w3-roof>w3-east-yard` (link 35, 33 after D0's deletions, `fire_stair`) | unchanged | - | 1.3 | 31 | `time_s` 14 | [108.65, 8.4, 52] | G3 | The yard fire escape shifts 1.7 m east (W3 below): head x 108.0-109.3, half landing x 101.9-103.2 at 4.2, foot (110.6, 0, 49.75) beside the east gate |
| E10 | `w3-roof>w3-east-wing` (link 36, 34 after D0's deletions, `fire_stair`) | unchanged | false | 1.3 | 21 | `bolted_in: ["twoKeyLedger"]` | [113, 8.4, 63] | (MB, G2, G3) | A30: the foot leaf (112.5, 0, 68) bolted on the wing side in TKL only; D0's second map + TKL run sets it `bolted: true` |
| E11 (new, lead ruling ~10:10) | `w2-walkway>w2-arcade-roof` (link 74) | `pipe` (the west downpipe; exterior climbing, 16.2.6) | - | - | 36 | `level_change` 3.9, `time_s` 6 | [47.5, 4.5, 61.6] | G2 | W2's second way up to the roof (D0 ERR 1: E6 left one route). The lead flat's eaves gutter discharges at its west end into a cast-iron downpipe on the loft row's south facade at x 47.5, over the walkway's west pier; below the walkway floor it runs on inside the pier's chase. Climbable 4.5 -> 8.4 only. Full design, light, guard sight and why it opens no solo bypass: section 5 |

No other stair is added: the W1 office block, the W2 north range and the W3 counting house keep their stairs, for the
reasons in section 3 (LP picks 2-4).

Bolt counts after J8 (`sectors.test.ts:469`): **W1 3, W2 7, W3 5, W4 2** (`[3, 7, 5, 2]`, the plan's numbers; no extra
stair foot is added).

## 2. A row per bolted, barred or locked door
"Inside" = the side the bolt or bar is drawn from. `side` is the `SectorBolt.side` vector (x or z sign of the bolt side
from the door plane, `onBoltSide`).

| Section, slot | Door (centre) | Inside (`side`) | Story | Exit check |
| --- | --- | --- | --- | --- |
| W1 0 | Warden's stair foot (7, 0, 44) | the stair (`[0, 1]`) | the warden locks it behind him with his key going out on his rounds (LP pick 13); a thumb-turn on the stair side | the stair's exit door: the bolt is on the inside, it opens from the stair. Exit OK |
| W1 1 | Fish hall back door (30, 0, 58) | the passage (`[0, 1]`) | barred on the passage side every night: a security door to the arcade | not the hall's escape exit (the arch and the side door are, both open); the passage exits east into the arcade. OK |
| W1 2 (G5) | Gallery stair's head gate (6.0, 4.5, 15.1) | the gallery (`[-1, 0]`) | the warden shoots it from the deck on his rounds; an exit from the deck opens without a key | the gallery's way down the stair opens from the deck side. OK |
| W2 0 | Pawn fire stair **foot** (53, 0, 62) (was the top door, now rebuilt) | the stair (`[0, 1]`) | the pawnbroker's fire stair: push bar inside, no handle on the arcade side | the exit door to the arcade opens from inside. OK |
| W2 1 | Pie back stair top (57.8, 4.5, 69) | the pie loft (`[1, 0]`) | the clerk bolts it while he eats | opens from the loft (exit direction down the stair). OK |
| W2 - (A29) | Clock-mender's door (60, 4.5, 76.75) | locked both sides (`locked: true, breachable: false`), not in `W2_BOLTS` | the mender is out tonight and locked up behind him | a room door, not the clock loft's escape: the clock loft's exit is the east bridge (E2), its gate opens from the bridge side. OK |
| W2 2 (was 3) | Pawn taking-in door (51.2, 4.5, 67.6), w 2.0 | the loft (`[0, -1]`) | a loading door over a 4.5 m drop, barred inside | not an exit. OK |
| W2 3 (was 4) | Pie taking-in door (63, 4.5, 70), w 2.0 | the loft (`[0, -1]`) | as above | not an exit. OK |
| W2 4 (new, A5) | West bridge gate (44.75, 4.5, 67.6) | the bridge (`[0, 1]`) | the reading room's escape bridge: gate opens from the bridge (escape) side | exit direction is reading room -> south lofts: opens from inside. OK |
| W2 5 (new, A5) | East bridge gate (69.25, 4.5, 70) | the bridge (`[0, 1]`) | the clock loft's escape bridge | exit direction clock loft -> lane-window loft: opens from inside. OK |
| W2 6 (new, A25) | Reading room stair-head door (55, 4.5, 73.5) | the reading room (`[0, 1]`) | the library locks the stair at night; members leave by the push bar | the room's exit down the public stair opens from inside. OK |
| W3 0 | Chute hatch (97.1, 4.4, 50) | the chute (`[0, 1]`) | a coal chute hatch | a duct. OK |
| W3 1 | Coal-yard door (99, 0, 52) | the yard (`[0, -1]`) | a service door barred on the yard side | the passage's exits are its east and west doors (both plain). OK |
| W3 2 | Fire-escape bridge door (82, 8.4, 69.2) | the counting house (`[1, 0]`) | the bridge is the counting house's escape over the lane | opens from the counting-house side, the escape direction. OK |
| W3 3 | Cart gate roller leaf (89.4, 0, 38) | the cartway (`[0, -1]`) | the roller leaf stays bolted; the wicket beside it is the way through | the coal yard's exit is the wicket (plain). OK |
| W3 4 (new, A30, TKL only) | Roof bulkhead stair **foot** leaf (112.5, 0, 68) | the east wing (`[-1, 0]`), `missions: ['twoKeyLedger']` | TKL: staff are in, the porter shoots the bolt at lock-up so nobody comes in off the roof. TGC: the house is empty, the bolt is not shot | the push bar stays on the wing side: from the wing the door opens (roof access from inside, 16.2.5). The roof's way down is the yard fire escape in both missions (E9, no bolt). No fire exit is bolted against its exit direction |
| W3 keypad | East gate (112, 0, 52) | code both ways (`sectorMode.ts:415-416`) | the firm's night setting: the founding-year code | a security door, not the wing's escape exit: the east wing leaves by the lodge's inner door (117, 0, 52), the passage doors and the front hall, all plain, so 16.3.6 (exits open from inside) does not bind it. OK |
| W3 pair gate | Strongroom door (101, 0, 55.5) | two keys | a vault | not occupied, not an exit. OK |
| W4 0 | Shed three yard door (72, 0, 19) | the shed (`[1, 0]`) | barred inside (bonded store) | opens from inside: shed three's exit to the yard. OK |
| W4 1 | Jetty gate (72, 0, 8) | the jetty (`[1, 0]`) | the yard watch chains it on the jetty side | a fence gate, not a building exit; it opens from the jetty. OK |
| W1 / W4 shutters | Fish hall shutter (22, 0, 58), shed two shutter (92, 0, 28) | winding gear broken / chain seized | J9 wires them (held, crawl) | not exits (the hall and shed two have their doors). OK |

## 3. A row per building with more than one walking level
| Building | Storeys | Stairs (16.2.1 kinds) | 16.2.7 two stairs | Roof access (16.2.5) | Result, slice |
| --- | --- | --- | --- | --- | --- |
| W1 warden's office block (x 0-8 z 46-54, office floor 4.5 over a solid plinth) | one occupied room (64 m2) on a plinth; the gallery is an open exterior deck, not a room (16.2.6) | the enclosed warden's stair (foot bolted from the stair side) | **Reason, no stair added (LP pick 2).** One small room, one or two occupants, under 10 m to the stair head: a real code allows one exit (NCC single exit for a small storey with short travel). A second stair has nowhere real to go: the fish hall roof underside is 6.0, 1.5 m over the office floor line (no headroom for a stair door into the hall); a stair north would hit the service passage roof (3.0-3.2) at z 58; west is the map edge; south is the gallery and the existing core. The gallery stair (E5) serves the open deck, not the office (its head gate opens onto the gallery), so it is not one of the office's counted stairs | no roof access (none needed) | Walk card line: "the warden's office has one stair (a single small room)" |
| W2 south lofts (pawn, pie, lane-window; floors 4.5, roof 8.4) | lofts over shops | the pawnbroker's enclosed fire stair, rebuilt along the south facade (x 44-53.85 z 62-63.8; foot (53, 0, 62) with the push bar inside; top landing x 44.15-45.8; walkway door (45, 4.5, 62) and loft door (45, 4.5, 63.65) on it); the pie shop's enclosed back stair (x 56.2-57.8, foot door (57.8, 0, 63), top door (57.8, 4.5, 69) bolted on the loft side) | **Met.** Every south loft reaches two stairs: the pawn loft by its own stair, or the walkway, the pie loft door and the back stair; the pie loft by its back stair, or the walkway and the pawn stair; the lane-window loft through the inner door (66.5, 4.5, 66) to the pie loft, or its walkway door (72, 4.5, 62) and the walkway to the pawn stair. The tank-room ladder (E6) is plant (16.2.1, 16.2.3) | the tank room's fixed ladder and hatch, x 70.4-74.0 z 64.4-67.6 (A7: the lofts are let commercial lofts, not a secure building; the site's hard points are the strongroom and the bond). The west downpipe from the walkway (E11) is exterior climbing (16.2.6): player traversal, not circulation, so it is no third stair and no second roof access in the 16.2.5 sense | G2 |
| W2 north range (reading room x 44-60, clock loft x 60-70, z 73.5-80, floor 4.5 over solid mass) | one floor on a solid base | the public stair (its head door, push bar on the reading-room side, A25) | **Met by the bridges (LP pick 3).** Each A5 bridge is an enclosed horizontal exit into a separate building (the south loft row) with its own enclosed fire stairs, its gate opening in the exit direction with no key: reading room -> west bridge -> pawn loft -> pawn fire stair; clock loft -> east bridge -> lane-window loft -> pie back stair or the walkway and the pawn stair. A clock-loft back stair would discharge nowhere real: the base under x 60-70 is solid and the north wall z 80 is the map edge (no street) | none (the north range roof is cut off from every walking surface, W2 brief) | Marlow (level-design owner) may rule otherwise (plan section 15); then G2 adds an enclosed back stair at the clock loft's east end with its foot door opening from inside only |
| W3 counting house (x 82-120 z 52-80; ground floor, the west wing's iron gallery at 4.2, the roof at 8.4; the upper floor over the east wing is story only, solid in the greybox) | ground; gallery mezzanine; roof | the roof bulkhead stair core (x 112.4-115.2 z 58.6-69.4, inside the east wing); the yard fire escape (moved, E9); the west wing's gallery stair (mezzanine only) | **Met by distance (LP pick 4).** The two stairs from the roof and the upper floor are the bulkhead and the fire escape; their roof heads are 16.5 m apart ((112.5, 68) and (108.65, 52)), over NCC's 9 m minimum between alternative exits, and they leave in different directions (down inside the wing; down the yard face). A west stair would serve no floor: the west wing is a double-height hall open to the roof slab. TKL bolts the bulkhead foot (A30) against entry from the roof only; the roof's way down is the fire escape in both missions | the bulkhead stair core (16.2.5 met, A7) | G3 (fire escape shift); MB / G2 / G3 (A30) |
| W1 market and fish hall; W4 sheds | single storey | - | n/a | none | - |
| W4 quay crane | walkway at 10 | the two caged leg ladders (plant, 16.2.1) | n/a | - | - |

## 4. LP picks for the lead (egress)
1. **Gallery ladder gate at the foot**: superseded by J8 G5: the gate moved to a stair's head, where no top-out applies.
2. **W1 office block: one stair, the reason recorded** (section 3), not the plan's default external stair: the default
   has no buildable position (headroom 1.5 m under the fish hall roof; the passage roof to the north).
3. **W2 north range: the bridges are its second escape**; no clock-loft back stair.
4. **W3 counting house: two stairs met by their 16.5 m separation**; no west stair.
5. **The pawn fire stair is rebuilt along the south facade** with the bolt moved to its foot door (W2 slot 0 keeps its
   index): the old core (x 52.2-53.8 z 62.2-69.9) ran north to z 69.9 with its top door at z 69, which the A28 cut-back
   (the loft ends at z 67.6) leaves opening onto the lightwell, and a 4.5 m rise cannot fit a flight and landing in
   the 5.6 m of loft left (24 risers of 0.1875 need a 5.5 m run plus a landing). Along the facade the 6.5 m flight fits
   (x 46-52.3), and the walkway door lands on its top landing.

## 5. E11: the west downpipe, W2's second way up to the roof
Lead ruling (2026-10-26 ~10:10) on D0's ERR 1 (`section W2: 1 independent route(s) from entry 'w2-arcade' to exit
'w2-arcade-roof'`, `docs/tallow-fixes/val/D0-note.md` section 5): keep E6, no gate exception, a real second way up
from a W2 space other than the lane-window loft's ladder. Frame as section 1; the G2 brief's step 6b builds it.

**The building.** The lead flat over the south loft row has no parapet on its arcade (south) side: it falls to an
eaves gutter along the facade head, and the gutter discharges at its west end into a cast-iron downpipe on the loft
row's south facade, over the walkway's west pier (x 44-48, z 59-62, solid 0-4.5). Below the walkway floor the pipe
runs on inside the pier's chase to the arcade's surface drain, so the pier's face stays the plain plastered face C3
needs ("no handhold"). The exposed pipe is the 3.9 m between the walkway floor and the gutter. A player climbs it
(`pipeV`, 0.9 m/s, `attach.ts:80`) and pulls up over the eaves onto the roof.

**Position and sizes.**
| Element | Where | Size |
| --- | --- | --- |
| Downpipe (`b.pipeV`, radius 0.06) | (47.5, z 61.6), y 4.5 -> 8.4; the climber faces +z (`side` 0) | 3.9 m climbable; its foot stands on the pier top (the walkway floor, 4.5) |
| Stand-off | the pipe's back is 0.19 m off the facade face (z 61.85), clear of group 79's conduit (z 61.75, y 7.6; LIGHT.md rule 6) | extended pipe ears |
| Rainwater head (visual only) | x 47.3-47.7, z 61.45-61.75, y 7.85-8.25 | collide off, under the eaves |
| Eaves over the pawn loft | the roof slab over x 44-54 starts at z 61.85 (flush with the facade face), not 62.0 | 0.15 m; the rest of the roof edge is unchanged |
| The pull-up lip (manual `b.ledge`) | (47.0, 61.85) -> (48.0, 61.85), top 8.4, normal (0, -1), `drop` 3.9 | 1.0 m long; the only lip on that edge |
| Top-out | the engine's climb-up end, pipe base - n x 0.55 = (47.5, 8.4, 62.15) (`attachController.ts:527-535`): 0.3 m in from the eaves | on the lead flat over the pawn loft |

On the 0.5 m grid: x 47.5, the heights 4.5 / 8.4 and the link length 36. The pipe's z (61.6) is set by the facade face
and the conduit, not the grid.

**Graph.** `w2-walkway>w2-arcade-roof`, `pipe`, route `high`, `level_change` 3.9, `time_s` 6 (entry 0.35 + 3.9 m at
0.9 m/s + the pull-up, 5.9 s), `length` 36 (C3's west landing (46, 59.35) to the pipe foot 2.5 + the climb 3.9 + along
the roof from the top-out to the C5 thrower's mark (76.7, 66) 29.5), `at` [47.5, 4.5, 61.6]. Two-way (a `pipe` is
not one-way): a player on the roof can also climb down it. W2's two edge-disjoint routes are then arcade -> walkway
(boost) -> lane-window loft -> tank-room ladder -> roof, and arcade -> walkway (rope or pull) -> downpipe -> roof.

**Light (LIGHT.md section 3, rule 3's helper, ambient 0.244: the walkway is open to the sky between the glazed roof
and the facade).** The foot is in walkway bracket 79's pool (the bracket at (49, 7.4, 61.75), 1.5 m east): a body at
the foot (47.5, 4.5, 61.25) reads **1.0** (the corridor band, 40 lx and over), still 0.73 with the feet at 6.0. Above
that the head is over the downward bracket: from feet 6.5 to the top-out (47.5, 8.4, 62.4) it reads **0.24** (moon
only, the roof's unfitted band). With 79 cut at its switch (46.1, 4.5, 61.75), 1.4 m from the pipe, the whole climb
reads 0.24 (dark). So the climb is lit at the foot and dark above; one switch beside it makes it all dark (two ways to
darken, 5.2: the switch or shooting the bracket). No lamp is added or moved.

**Guard sight (W2 guards, `tallowWharfSectors.ts:125-142`; eye 1.55, G44's pitch factor).** Only the arcade floor
sees it; no guard stands on the walkway, the lofts' south side or the roof.
- The foot (feet 4.5): hidden from every arcade guard by the pier and the balustrade, except the head from Pell's
  walker at his west end (44, 54) (8.1 m, 29 deg up, factor 0.83), in the lit pool.
- Mid-climb (feet 6.0): seen from the beadle's z 50 leg (11-14 m, 22-28 deg, factor 0.9-1.0) and Pell's walker on
  z 54 (7-11 m, 30-40 deg, 0.35-0.8), but dark there (0.24), so slowly.
- Near the top (feet 7.5): the glazed roof's north edge (z 59, y 7.5) hides the head from the z 50 leg; Pell's walker
  sees it at 36-46 deg (0.16-0.53), dark.
- The beadle's z 57 leg (under it, 43-60 deg) and Pell's man at the stair foot (55, 60.8, facing south, under the
  walkway slab) never see it.

So the second way is the exposed one: quick from C3's landing but in sight of the floor patrols mid-climb, against the
lane-window loft's dark, unseen ladder. Cutting 79 (a lure where the boost lands, LIGHT.md W2) buys the dark climb.

**Why it opens no solo bypass (G2, G292) and no solo twin.**
- Its foot is on the walkway, behind C3 (the boost, rope or pull). The climbable pipe starts at 4.5: a side grab needs
  feet within 0.4 m of the base (4.1 m) and a leap grab feet 0.2 m over it (`attachController.ts:265-275`,
  `anchors.ts:706-711`), over the solo wall-jump reach (`WALL_JUMP.maxUp` 3.8). Only C3's boost reaches 4.5 from the
  arcade floor, and no standable top below 4.4 stands within 1.5 m (plan) of the pipe.
- It joins two spaces that are already joined solo (the walkway reaches the roof through the lane-window loft and
  the ladder; the roof reaches the walkway the same way). It reaches no new space: the roof's screens (G2 step 2) keep
  the lightwell, the stages and the north range roof cut off, so no C4 throw and not the C5 throw is bypassed.
- No co-op link joins `w2-walkway` and `w2-arcade-roof`, so it is no solo twin; the C3 links' solo-twin search runs on
  route `high` from the arcade, and no solo high arc leaves the arcade.
- The forced gate stands: solo links from `w2-arcade` still reach only the pie shop (and the lightwell by its door).
  The validators confirm it (D0-note section 5): ERR 1 gone, no new ERR or WARN.
- The eaves lip is 3.9 m over the walkway: no solo wall jump onto it (3.8), and it is still only walkway -> roof.

**Why here and not elsewhere.** The east end (x 75 over the east fascia) lands 2.5 m from the lane-window door, so the
two routes would be one route; the west pipe starts at C3's landing and gives the pair a real split and loop (one up
the pipe, the other through the lane-window loft; the roof joins them again). A stair to the roof does not fit: the
pawn and pie stair cores are 1.6-1.8 m wide and a second flight over the first leaves under 1.7 m headroom; the public
stair would open a solo way from the arcade. A second hatch would need a second plant room in an occupied loft
(16.2.3).

**Rules it touches.** 16.2.6 (exterior climbing: a real element, player traversal, not circulation); 2.5 (consistent
visual language: this is the map's first drainpipe, so every downpipe of this look on the map is climbable; the map
SPEC's verbs row "Drainpipes: greybox: pending" becomes this element, and its element-register row is "West downpipe |
the eaves gutter's outlet | the second way up from the walkway | 16.2.6"); 16.3.3 / 16.4.2 (1.9 m from the walkway
door's jamb, beside it, not in front); 16.5.3 (the eaves edge is not a working edge: no parapet, as built).
