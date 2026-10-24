# Three Grey Coats - beat chart (campaign prototype, 2 players)

Map: Tallow Wharf (A18). Route W1 night market -> W2 arcade lofts -> W4 wharf sheds (`mission.start` = W1).
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
| 3 | W2 | 5 | interrogate | Take the grey coat with the black umbrella in the reading room loft | Overheard: SEXTON tracks the umbrella up the arcade stair; the reading room lamp in its window | Human ladder (arcade ground -> loft walkway); throw over the lightwell (south lofts -> north lofts) | Named-target interrogation (decoys spook him) | needs `tgc-courier`; gives `tgc-chest` (shed three, the candle chest) |
| 4 | W4 | 4 | exploit (twist) | Find the chest stencilled with a candle in shed three | Interrogation answer (Teale: "Shed three. Candle on the lid. Under the tea."); shed three's lit loading door seen from the crane gantry | Rope brace / descent (crane gantry -> shed three roof hatch) | - (the twist is a patrol change) | needs `tgc-chest` |
| 5 | W4 | 3 | extract | Both of you, down the jetty steps to the boat under the crane | Landmark: the crane's red lamp over the jetty | Pull-up (canal ledge -> jetty lip) | - | - |

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
- Step 3 (swap): B, who tailed the umbrella, climbs A (human ladder) and goes high to the arcade roof skylight as Eyes
  (decoys, the lightwell, the stair); A is thrown over the lightwell by B and takes Teale as Hands. Joint questioning
  (G148) is allowed when B drops in.
- Steps 4-5: B stays Eyes on the crane gantry and braces the rope; A descends into shed three for the chest. At the jetty
  A pulls B up the lip.

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
- W2 loft walkway: M, reached by human ladder from the arcade ground (no solo climb); sees the reading room window.
- W2 reading room loft: S-M, Teale's lit table at the window, dark stacks aisle behind (isolate and question).
- W2 pawnbroker's loft: S, decoy Fenn plus the optional rota desk. W2 pie shop (ground): decoy Garrow.
- W2 lightwell: 3-4 m gap between south and north lofts (team throw); the arcade roof skylight is the W2 vantage.
- W2 clock-mender's back loft: S, Teale's bolt point, reached only over the lightwell or the roofs.
- W2 -> W4 link: the arcade roof to the crane gantry (TGC enters W4 high; TKL enters W4 from W3).
- W4 crane gantry: M, the W4 vantage over the shed yard and jetty; rope anchor above shed three's roof hatch.
- W4 shed three: M, tea chests, lit loading door (step 4 `seen_from` the gantry), dark side aisle.
- W4 shed yard: L, the minders' walking pair after the twist; W4 jetty and boat: S extraction zone, pull-up lip from the canal ledge
  (height per KIT-PULL).

SIGNOFF question (placeholder): "Approve this beat chart?"
