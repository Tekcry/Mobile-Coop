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
are 0-based on today's graph; D0 deletes link 30 (A29), so every later link moves down one. New links are named
`from>to`; D0's saved note gives their final numbers (the fix-round-2 draft had them at 71-74).

| # | Link (`from>to`) | Kind | `bolted` | width | length | other fields | `at` | Built by | Why |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | `w2-pawn-loft>w2-reading-room` | `door` | true | 1.2 | 11.0 | - | [44.75, 4.5, 70.55] | G2 | A5 west bridge: gate at the pawn loft's north wall (44.75, 4.5, 67.6), bolted on the bridge side; bridge 5.9 m (z 67.6-73.5) + 5.1 m inside the reading room to its stage door at x 51.2 |
| E2 | `w2-lane-window>w2-clock-loft` | `door` | true | 1.2 | 8.0 | - | [69.25, 4.5, 71.75] | G2 | A5 east bridge: the bridge sits at x 68.5-70 against the corner mass, so its gate is in the lane-window loft's north wall (69.25, 4.5, 70), not the pie loft's; bridge 3.5 m + 4.5 m to the clock stage. The way back to the pie loft is then the lane-window loft's inner door (link 27). If D0 keeps the draft's `w2-pie-loft` end, its note must say the walk runs through the lane-window loft (+5 m, 13.0) |
| E3 | `w2-arcade>w2-reading-room` (link 21, `open_stair`) | unchanged kind | **true** (A25) | 2.4 | 27 | - | [55, 0, 65.875] | G2 | The stair-head door (55, 4.5, 73.5) has its push bar on the reading-room side |
| E4 | `w4-jetty>w4-canal-ledge` | `drop` | - | - | 6.0 | `level_change` 4.4, `time_s` 3 | [74.0, 0, 6.0] | G4 (no new geometry) | A6: the jetty's open south edge x 72-76 (the C10 pull edge, "the old staging ladder's gap", already open in the build: the jetty rail runs only x 76-86.75 and 89.25-100) drops onto the canal bed at (74, -4.4, 5.4); the bed runs on round the end of the fence foot (x 72, z 5-10) to the ledge. The 4.4 m lip stays in the co-op band, so no solo way up |
| E5 | `w1-canal-steps>w1-gallery` | `ladder` | true | - | 6.0 | `level_change` 4.5, `time_s` 3 | [6.6, 0, 14.4] | G1 (the bolt entry: G2) | The ruled gallery ladder (D0 TGC default). LP places it on the gallery's east face at its canal-steps end with an anti-climb door at its **foot**, bolted on the cage side (LP pick 1, section 4) |
| E6 | `w2-lane-window>w2-arcade-roof` (link 31, `hatch`) | `ladder` (plant ladder, A7) | - | 1.2 | 16 | `level_change` 3.9, `time_s` 5 | [72, 4.5, 66.15] | G2 | The hatch and its fixed ladder stay where they are (hatch x 71.4-72.6 z 65.4-66.6; ladder line (72, 66.15)) and are walled in as a tank room, x 70.4-74.0 z 64.4-67.6, door (72, 4.5, 64.4). The note names the tank room. Link 32 (the dormer `window`, sharing the opening) is deleted: the sash is inside the tank room now and is no second way |
| E7 | `w2-arcade>w2-pawn-loft` (link 22, `fire_stair`) | unchanged | true (unchanged) | 1.3 | 14.5 | `time_s` 8 | [53, 0, 62] | G2 | The pawn fire stair is rebuilt along the loft's south facade (section 2, W2): the foot door (53, 0, 62) carries the push bar on the stair side; the walkway door (45, 4.5, 62) opens onto its top landing |
| E8 | `w2-walkway>w2-pawn-loft` (link 25, `door`) | unchanged | - | 1.2 | 6.5 | - | [45, 4.5, 62] | G2 | The walkway door moves from x 49 to x 45: it now opens onto the pawn stair's top landing, and the loft door (45, 4.5, 63.65) leads on into the loft |
| E9 | `w3-roof>w3-east-yard` (link 35, `fire_stair`) | unchanged | - | 1.3 | 31 | `time_s` 14 | [108.65, 8.4, 52] | G3 | The yard fire escape shifts 1.7 m east (W3 below): head x 108.0-109.3, half landing x 101.9-103.2 at 4.2, foot (110.6, 0, 49.75) beside the east gate |
| E10 | `w3-roof>w3-east-wing` (link 36, `fire_stair`) | unchanged | false | 1.3 | 21 | `bolted_in: ["twoKeyLedger"]` | [113, 8.4, 63] | (MB, G2, G3) | A30: the foot leaf (112.5, 0, 68) bolted on the wing side in TKL only; D0's second map + TKL run sets it `bolted: true` |

No other stair is added: the W1 office block, the W2 north range and the W3 counting house keep their stairs, for the
reasons in section 3 (LP picks 2-4).

Bolt counts after J8 (`sectors.test.ts:469`): **W1 3, W2 7, W3 5, W4 2** (`[3, 7, 5, 2]`, the plan's numbers; no extra
stair foot is added).

## 2. A row per bolted, barred or locked door
"Inside" = the side the bolt or bar is drawn from. `side` is the `SectorBolt.side` vector (x or z sign of the bolt side
from the door plane, `onBoltSide`).

| Section, slot | Door (centre) | Inside (`side`) | Story | Exit check |
| --- | --- | --- | --- | --- |
| W1 0 | Warden's stair foot (7, 0, 44) | the stair (`[0, 1]`) | the warden bolts it behind him at night | the stair's exit door: the bolt is on the inside, it opens from the stair. Exit OK |
| W1 1 | Fish hall back door (30, 0, 58) | the passage (`[0, 1]`) | barred on the passage side every night: a security door to the arcade | not the hall's escape exit (the arch and the side door are, both open); the passage exits east into the arcade. OK |
| W1 2 (new) | Gallery ladder's anti-climb door (6.6, 0, 14.4) | the cage (`[0, 1]`) | the trimmer's caged ladder; its anti-climb door is locked from inside the cage, as real ones are | a ladder, not an exit. OK |
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
| W3 keypad | East gate (112, 0, 52) | code both ways (`sectorMode.ts:415-416`) | the firm's night setting: the founding-year code | a security door, not the wing's escape exit: the east wing leaves by the lodge's inner door (117, 0, 52), the passage doors and the front hall, all plain. OK (open question 3) |
| W3 pair gate | Strongroom door (101, 0, 55.5) | two keys | a vault | not occupied, not an exit. OK |
| W4 0 | Shed three yard door (72, 0, 19) | the shed (`[1, 0]`) | barred inside (bonded store) | opens from inside: shed three's exit to the yard. OK |
| W4 1 | Jetty gate (72, 0, 8) | the jetty (`[1, 0]`) | the yard watch chains it on the jetty side | a fence gate, not a building exit; it opens from the jetty. OK |
| W1 / W4 shutters | Fish hall shutter (22, 0, 58), shed two shutter (92, 0, 28) | winding gear broken / chain seized | J9 wires them (held, crawl) | not exits (the hall and shed two have their doors). OK |

## 3. A row per building with more than one walking level
| Building | Storeys | Stairs (16.2.1 kinds) | 16.2.7 two stairs | Roof access (16.2.5) | Result, slice |
| --- | --- | --- | --- | --- | --- |
| W1 warden's office block (x 0-8 z 46-54, office floor 4.5 over a solid plinth) | one occupied room (64 m2) on a plinth; the gallery is an open exterior deck, not a room (16.2.6) | the enclosed warden's stair (foot bolted from the stair side) | **Reason, no stair added (LP pick 2).** One small room, one or two occupants, under 10 m to the stair head: a real code allows one exit (NCC single exit for a small storey with short travel). A second stair has nowhere real to go: the fish hall roof underside is 6.0, 1.5 m over the office floor line (no headroom for a stair door into the hall); a stair north would hit the service passage roof (3.0-3.2) at z 58; west is the map edge; south is the gallery and the existing core. The new gallery ladder (E5) is exterior climbing (16.2.6), not a counted stair | no roof access (none needed) | Walk card line: "the warden's office has one stair (a single small room)" |
| W2 south lofts (pawn, pie, lane-window; floors 4.5, roof 8.4) | lofts over shops | the pawnbroker's enclosed fire stair, rebuilt along the south facade (x 44-53.85 z 62-63.8; foot (53, 0, 62) with the push bar inside; top landing x 44.15-45.8; walkway door (45, 4.5, 62) and loft door (45, 4.5, 63.65) on it); the pie shop's enclosed back stair (x 56.2-57.8, foot door (57.8, 0, 63), top door (57.8, 4.5, 69) bolted on the loft side) | **Met.** Every south loft reaches two stairs: the pawn loft by its own stair, or the walkway, the pie loft door and the back stair; the pie loft by its back stair, or the walkway and the pawn stair; the lane-window loft through the inner door (66.5, 4.5, 66) to the pie loft, or its walkway door (72, 4.5, 62) and the walkway to the pawn stair. The tank-room ladder (E6) is plant (16.2.1, 16.2.3) | the tank room's fixed ladder and hatch, x 70.4-74.0 z 64.4-67.6 (A7: the lofts are let commercial lofts, not a secure building; the site's hard points are the strongroom and the bond) | G2 |
| W2 north range (reading room x 44-60, clock loft x 60-70, z 73.5-80, floor 4.5 over solid mass) | one floor on a solid base | the public stair (its head door, push bar on the reading-room side, A25) | **Met by the bridges (LP pick 3).** Each A5 bridge is an enclosed horizontal exit into a separate building (the south loft row) with its own enclosed fire stairs, its gate opening in the exit direction with no key: reading room -> west bridge -> pawn loft -> pawn fire stair; clock loft -> east bridge -> lane-window loft -> pie back stair or the walkway and the pawn stair. A clock-loft back stair would discharge nowhere real: the base under x 60-70 is solid and the north wall z 80 is the map edge (no street) | none (the north range roof is cut off from every walking surface, W2 brief) | Marlow (level-design owner) may rule otherwise (plan section 15); then G2 adds an enclosed back stair at the clock loft's east end with its foot door opening from inside only |
| W3 counting house (x 82-120 z 52-80; ground floor, the west wing's iron gallery at 4.2, the roof at 8.4; the upper floor over the east wing is story only, solid in the greybox) | ground; gallery mezzanine; roof | the roof bulkhead stair core (x 112.4-115.2 z 58.6-69.4, inside the east wing); the yard fire escape (moved, E9); the west wing's gallery stair (mezzanine only) | **Met by distance (LP pick 4).** The two stairs from the roof and the upper floor are the bulkhead and the fire escape; their roof heads are 16.5 m apart ((112.5, 68) and (108.65, 52)), over NCC's 9 m minimum between alternative exits, and they leave in different directions (down inside the wing; down the yard face). A west stair would serve no floor: the west wing is a double-height hall open to the roof slab. TKL bolts the bulkhead foot (A30) against entry from the roof only; the roof's way down is the fire escape in both missions | the bulkhead stair core (16.2.5 met, A7) | G3 (fire escape shift); MB / G2 / G3 (A30) |
| W1 market and fish hall; W4 sheds | single storey | - | n/a | none | - |
| W4 quay crane | walkway at 10 | the two caged leg ladders (plant, 16.2.1) | n/a | - | - |

## 4. LP picks for the lead (egress)
1. **Gallery ladder gate at the foot** (an anti-climb door inside the cage, bolted on the cage side), not at the top.
   Why: a ladder top-out is a scripted move to the ladder top + 0.4 m inward (`attachController.ts:506-509`) that
   ignores door leaves, so a shut top gate lands the climber in its leaf or past it; a locked anti-climb door at the
   foot is how real caged ladders are secured. The one on the gallery climbs down inside the cage to open it (about 3 s
   on D0's reach path, under 15 s). G1 still runs the plan's first test as a check of the foot gate (a climber at the
   foot with the door shut cannot grab the ladder; with it open he climbs and tops out on the deck).
2. **W1 office block: one stair, the reason recorded** (section 3), not the plan's default external stair: the default
   has no buildable position (headroom 1.5 m under the fish hall roof; the passage roof to the north).
3. **W2 north range: the bridges are its second escape**; no clock-loft back stair.
4. **W3 counting house: two stairs met by their 16.5 m separation**; no west stair.
5. **The pawn fire stair is rebuilt along the south facade** with the bolt moved to its foot door (W2 slot 0 keeps its
   index): the old core (x 52.2-53.8 z 62.2-69.9) ran north to z 69.9 with its top door at z 69, which the A28 cut-back
   (the loft ends at z 67.6) leaves opening onto the lightwell, and a 4.5 m rise cannot fit a flight and landing in
   the 5.6 m of loft left (24 risers of 0.1875 need a 5.5 m run plus a landing). Along the facade the 6.5 m flight fits
   (x 46-52.3), and the walkway door lands on its top landing.
</content>
</invoke>
