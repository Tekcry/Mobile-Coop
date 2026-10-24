# Three Grey Coats - beat chart (campaign prototype, 2 players)

Map: Tallow Wharf (A18). Route W1 night market -> W2 arcade lofts -> W3 counting-house roof (crossing only, no step) ->
W4 wharf sheds (`mission.start` = `w1-canal-steps`, `sections` W1 W2 W3 W4; Graph notes).
Sources: PLAN 2 (step kinds, rules), PLAN 4a (kit), audit 4-5, research 3 (Lady Boyle, Freelancer), `docs/story.md`.

## Premise
Pell has stopped trusting fibre with his weekly cipher. It goes by hand now, through Tallow Wharf at night.
Three couriers leave the canal market in the same grey coat; two are hired to walk, one carries the sheet.
Night Shift has to work out which one, take him quietly in the lofts and find where the cipher really waits.
Grab the wrong man and the right one is gone before the decoy hits the floor.

## Rule (one, `namedTarget`, scope mission)
- **Rule:** question only Pell's courier (target `tgc-teale`, decoys `tgc-fenn`, `tgc-garrow`).
- **Briefing line:** "Rule: question only Pell's courier. The wrong one warns him, and he runs."
- **Objective-list line** (under the title, all mission): "Rule - question only Pell's courier."
- **Breaking it:** interrogating a decoy, or killing Teale before he talks, breaks the rule: LANTERN's line, then
  section restart at that section's checkpoint (M1). Per A11 Teale is despawned and respawns unalerted at his bolt point
  (W2 clock-mender's back loft) with his info. The restart keeps the spook, so the retry is a new route, not a replay.
  Engine note for EN2: `restore(section)` keeps the `tgc-spooked` flag (PLAN 3 resets section facts; this is the one
  exception). If EN2 cannot, the restart puts Teale back at his table and the bolt point is used only without the rule.
- Knock-outs are allowed on anyone except Teale before step 3 is done (a knocked-out courier cannot talk).

## Beat chart (5 steps, 19 min)
| # | Sec | Min | Kind | Objective-list line | In-world lead | Forced co-op move (section) | New mechanic | Intel -> exploit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | W1 | 3 | reach | Find the three grey coats under the fish hall clock | Landmark: the lit fish hall clock, seen from the canal steps; SEXTON names the spot | Boost up a wall (canal steps -> stall-roof gallery) | - | - |
| 2 | W1 | 4 | intel | Learn which grey coat is Pell's: the warden's tally book, the tea stall talk | Document: tally book on the warden's desk, gallery office (rules out the brass-tag satchel). Overheard: two porters at the tea stall (rules out the flat cap) | Hold shutter (fish hall service shutter -> arcade passage, the W1 exit) | Split leads: each player holds one half of the answer | gives `tgc-courier` (the black umbrella) |
| 3 | W2 | 5 | interrogate | Take the grey coat with the black umbrella in the reading room loft | Overheard: SEXTON tracks the umbrella up the arcade stair; the reading room lamp in its window | Boost and rope (arcade ground -> loft walkway, west pier); throw over the lightwell (south lofts -> north lofts) | Named-target interrogation (decoys spook him) | needs `tgc-courier`; gives `tgc-chest` (shed three, the candle chest) |
| 4 | W4 | 4 | exploit (twist) | Find the chest stencilled with a candle in shed three | Interrogation answer (Teale: "Shed three. Candle on the lid. Under the tea."); shed three's lit loading door seen from the crane gantry | Boost (back lane -> shed three's lane-side clerestory, 4.4 m) | - (the twist is a patrol change) | needs `tgc-chest` |
| 5 | W4 | 3 | extract | Both of you, down the jetty steps to the boat under the crane | Landmark: the crane's red lamp over the jetty | Pull-up (canal ledge -> jetty lip, 4.4 m) | - | - |

- **Twist (step 4):** Teale's minders, two men off a launch, arrive at the sheds when he misses his check-in. They add a
  walking pair between shed three and the jetty for the rest of W4. The cipher was never on Teale: he was carrying the
  shed and the chest, not the sheet.
- **Optional (W2):** "Read Pell's courier rota in the pawnbroker's loft" (document, a lit desk beside decoy Fenn's loft).
  Reward: `gadget` (one extra gadget charge, through section-rating's Grant). Story: the rota names the nights.
- **Extraction (step 5):** both players hold the boat zone (`SectorRun` extract phase, every living player).

## Roles (asymmetric, swap at the midpoint = step 3)
- Steps 1-2: **A = Eyes** (boosted onto the gallery: watches the three coats, reads the tally book, calls who moves);
  **B = Ears** (floor and canal side: listens at the tea stall, tails the coats). B boosts A onto the gallery; A drops
  back to the floor at the gallery's far end. At the fish hall shutter B lifts and holds, A crawls under, then A holds
  the arcade-side bar while B rolls through.
- Step 3 (swap): A boosts B, who tailed the umbrella, onto the walkway at the west pier, and B drops the rope for A.
  B goes high to the arcade roof skylight as Eyes
  (decoys, the lightwell, the stair); A is thrown over the lightwell by B and takes Teale as Hands. Joint questioning
  (G148) is allowed when B drops in.
- Steps 4-5: in the back lane B boosts A in through shed three's clerestory window, then climbs the crane leg to the
  gantry and stays Eyes; A takes the chest and leaves by shed two's canal door. At the jetty A pulls B up the lip.

## Hint lines (Settings > Gameplay > Hints, off by default)
1. The fish hall clock is the tallest light in the market. The coats stand under it.
2. Tally book: the warden's desk, gallery level. Tea stall: by the canal steps.
3. He went up the arcade stair to the reading room loft. Climb, don't take the stair.
4. Shed three has the lit loading door. The chest has a candle stencilled on the lid.
5. The boat waits at the jetty steps under the crane. Both of you must be aboard.

## Radio (text now, voiceable later; each line <= 90 characters)
Briefing (screen text):
```
Tallow Wharf. A canal market by night, lofts over the arcade, sheds on the wharf.
Pell moves his weekly cipher by hand now. He trusts paper more than fibre.
Three couriers leave the market tonight in the same grey coat. One is his.
Find out which, question him quietly, and take what he carries.
Rule: question only Pell's courier. The wrong one warns him, and he runs.
```
- Step 1: LANTERN: Evening, Night Shift. Tallow Wharf. Three grey coats, one of them Pell's. /
  SEXTON: I'm on the chandler's roof. All three are under the fish hall clock. /
  MOTH: Same coat, same hat. Very tidy. Very annoying.
- Step 2: LANTERN: The warden keeps a tally book. His office is up on the gallery. /
  SEXTON: Porters at the tea stall talk about everyone. Stand close and listen. /
  TALLY: Two halves of one answer. Compare notes before anyone grabs anyone.
- Step 3: SEXTON: Black umbrella's going up the arcade stair. The other two are splitting off. /
  LANTERN: Get him alone in the lofts. Quietly. He's no use to us frightened. / (done) WREN: Shed three. Candle chest.
- Rule broken: LANTERN: Wrong man. Pell's courier has bolted. Back to the arcade, both of you.
- Step 4 (twist): SEXTON: Two men off a launch at the sheds. Pell's. They're looking for him. /
  LANTERN: He never had the sheet. It's in the chest. Stay low and be quick.
- Step 5: LANTERN: Boat's under the crane. Both of you on it. / SEXTON: Minders on the jetty end. Wait for the lamp. /
  (extract) TALLY: Cipher's clean. Every order he sends this week, we read first. / LANTERN: Good. Breathe. Come home.

## Spaces needed (for the CMG graph check)
Size classes: S = short side 6-10 m, M = 10-20 m, L = over 20 m (play space >= 6 m, scale sheet 3).
- W1 canal steps (checkpoint, entry): S; sees the fish hall clock (step 1 `seen_from`).
- W1 market floor: L, stalls under warm lamps, three coats under the clock; dark aisles between stall backs.
- W1 stall-roof gallery: M long strip, the vantage over the whole floor (half the patrols); boost wall 4.3-4.5 m lip.
- W1 warden's office: S, on the gallery, lit desk (tally book); second door to the gallery's far end (no dead end).
- W1 tea stall: S social pocket on the floor with a dark nook within earshot (overheard trigger).
- W1 fish hall service shutter: the W1 exit and choke, co-op shutter (0.9 m crawl gap) into the arcade passage.
- W2 arcade ground: M covered passage, three stairs up (one open stair, two fire stairs); checkpoint at its W1 end.
- W2 loft walkway: M, reached from the arcade ground by a boost, then the rope or the pull-up for the second (no solo
  climb; the human ladder grabs only 4.1 m, under the 4.5 m lip); sees the reading room window.
- W2 reading room loft: S-M, Teale's lit table at the window, dark stacks aisle behind (isolate and question).
- W2 pawnbroker's loft: S, decoy Fenn plus the optional rota desk. W2 pie shop (ground): decoy Garrow.
- W2 lightwell: 3.5 m between the loft rows, a 2.5 m throw gap from the south lofts' taking-in doors to the north
  lofts' iron landing stages (team throw lands 3.2 m out); the arcade roof skylight is the W2 vantage.
- W2 clock-mender's back loft: S, Teale's bolt point, reached only over the lightwell or the roofs.
- W2 -> W3 -> W4 (no TGC step in W3): a team throw over the arcade lane (2.5 m) from the arcade roof to the
  counting-house roof, the roof fire escape into the east wing, the strongroom passage, the coal chute (vent unlock: one
  boosted in unbolts the yard hatch and unbars the yard door for the other; both end on the ground), out the cartway to
  the wharf back lane (TGC enters W4 from the lane; TKL enters W4 the same way).
- W4 crane gantry: M, the W4 vantage over the shed yard, the jetty and shed three's north-light roof.
- W4 shed three's lane-side clerestory: a 4.4 m sill over a blind wall (boost from the back lane).
- W4 shed three: M, tea chests, lit loading door (step 4 `seen_from` the gantry), dark side aisle.
- W4 shed yard: L, the minders' walking pair after the twist; W4 jetty and boat: S extraction zone, pull-up lip from the canal ledge
  (4.4 m, in the KIT-PULL band 4.3-4.5).

## Graph notes (graph.json, 2026-10-25)
- Files: `graph.json` holds the mission nodes only (`mission`, `objectives[]`, `rules[]`) on the map ids of
  `campaign-map/graph.json`. Validator (mission-validator branch, map + mission merged): 0 ERR, 6 WARN, all from the
  map's own spaces: `room_class custom` on w1-canal-steps (an 8 x 10 landing, under the yard minimum), w2-arcade-roof and
  w3-roof (roof walks), w3-chute (a crouch duct) and w4-boat (a boat deck), plus w3-chute's 1.2 m width being off the
  0.5 m grid (the scale sheet's duct is 1.2 x 1.5). The mission nodes add none.
- Renames (BEAT name -> map id): arcade roof skylight -> `w2-arcade-roof`; loft window -> `w2-lane-window`; jetty and
  boat -> `w4-jetty` + `w4-boat` (the boat is the exfil); fish hall service shutter -> the shutter link
  `w1-fish-hall` -> `w1-service-passage`; lightwell -> two `team_throw` links (pawn loft -> reading room, pie loft ->
  clock loft); coal chute -> `w3-chute`; every other space -> its BEAT name with a section prefix (`w1-market`,
  `w2-reading-room`, `w2-clock-loft`, `w4-shed-three` and so on).
- Route: the validator's spine is a straight chain W1 -> W2 -> W3 -> W4, so TGC cannot skip W3. `mission.sections` lists
  all four. W3 has no step: `w3-roof`, the fire escape into `w3-east-wing`, `w3-passage`, the vent unlock through
  `w3-chute` into `w3-coal-yard` (W3's forced co-op move for this mission; the hoist-beam rope went, 2026-10-25: the
  rope is a climb up only, SPEC "Engine questions"), out `w3-cartway` to `w4-back-lane`. In W4: the boost into
  `w4-shed-three` from the lane, the crane leg ladder to `w4-gantry`. The top-level `route` in
  graph.json lists the spaces both players use (gold in PLAN.svg); it is not a validator field.
- Budget 20 min: the steps add up to 19 (21 with the optional), plus about 1 min for the W3 crossing.
- Leads and views per step (`lead` / `seen_from`): 1 the canal steps for both (the lit clock). 2 the objective space
  is the warden's office (the tally book); its `lead` is the tea stall (the other half); `seen_from` is the gallery
  (the lit office door at its north end). 3 the arcade (the umbrella going up the public stair) / the loft walkway
  (the reading room lamp). Optional: the walkway for both (the lit rota desk). 4 Teale's answer in the reading room /
  the gantry (shed three's lit loading door). 5 extraction, exempt; `lead` set to the gantry (the crane's red lamp).
- `new_mechanic`: `split_leads` (step 2), `named_target` (step 3). Intel -> exploit: `tgc-courier` (2 -> 3) and
  `tgc-chest` (3 -> 4). The twist is step 4.
- Ghost route (no loud link): into the reading room by the lightwell throw, not the lit public stair. Out of shed three
  through shed two's canal door, not the lit loading door. Onto the boat by the gangway, not the jetty steps.
- Not validator fields: `target` `tgc-teale`, `decoys` `tgc-fenn` / `tgc-garrow`, and `bolt` [65, 4.5, 76.75] (the
  middle of `w2-clock-loft`) on step 3, for GB5's MissionDef (PLAN 2).
- The map's guard counts and phases may still change; the mission uses only space ids.

SIGNOFF question: see `SIGNOFF.md` ("Approve Three Grey Coats as specced?").
