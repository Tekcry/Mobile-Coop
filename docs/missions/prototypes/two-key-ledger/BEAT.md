# Two-Key Ledger - beat chart (campaign prototype, 2 players)

Map: Tallow Wharf (A18). Route W2 arcade lofts -> W3 counting house -> W4 wharf sheds (`mission.start` = W2).
Sources: PLAN 2 (step kinds, rules, `sync`), PLAN 4a (kit), audit 4-5, research 3 (bank vault, Palisade, two-key
concept 4), `docs/story.md`.

## Premise
Gaunt & Lisle has kept the wharf's books since before the canal had a name. Someone paid for Halcyon's failover
hardware through them, and the proof sleeps in their strongroom.
The strongroom door wants two keys turned at the same moment, a wing apart. The staff are clerks and porters on night
rates, and they go home tonight. Night Shift takes the ledger and leaves nobody worse off than a headache.

## Rule (one, `noKills`, scope mission)
- **Rule:** no kills. Knock-outs are allowed (A8: a knock-out is not a kill).
- **Briefing line:** "Rule: no kills. Knock them down if you must. They wake up with a headache."
- **Objective-list line** (under the title, all mission): "Rule - no kills."
- **Breaking it:** any kill by either player: LANTERN's line, then section restart at that section's checkpoint (M1);
  the mission continues. No-kill play has full tool support: every guarded space keeps a dark route and a KO line.
- The key turn is a `sync` step, not a rule: a missed turn springs both keys back and the count starts again (no
  penalty, no alarm). Campaign is 2 players, so no `soloWindow`.

## Beat chart (5 steps, 20 min)
| # | Sec | Min | Kind | Objective-list line | In-world lead | Forced co-op move (section) | New mechanic | Intel -> exploit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | W2 | 4 | intel | Listen to the night clerk on his supper break in the pie shop loft | Overheard: the clerk on the loft telephone ("East gate's the founding year again. On the brass."); landmark: the brass plate over Gaunt & Lisle's door, seen from the loft window | Boost then pull-up (arcade ground -> loft walkway: west pier, then the east lip); throw over the arcade lane (loft roof -> counting house roof, the W2 exit) | - | gives `tkl-gate-code` (the founding year) |
| 2 | W3 | 4 | exploit | Into the counting house: the east gate by the yard, the west wing from the roof | Landmark: the copper clock turret over the roof; the code from the brass plate | - (W3's forced move is step 4's vent unlock; A drops 4.2 m through the light-well lantern onto the west wing gallery) | - (the pair splits for the first time) | needs `tkl-gate-code` (east gate keypad) |
| 3 | W3 | 5 | sync | Turn both strongroom keys together: the east wing key post and the west wing key post | Document: the brass notice at each post ("Both keys. Together. By order of the partners."); TALLY counts | (the split from step 2 puts one player in each wing) | Synced key turn: both hold a key, a shared 3-count, both turn within 1.0 s | - |
| 4 | W3 | 4 | carry (twist) | Take the ledger from the strongroom and leave by the coal chute to the yard | Landmark: the coal chute's iron door in the strongroom passage; the porter's lodge lamp coming on | Vent unlock (boost into the coal chute, unbolt the yard hatch from the far side) | Tell-tale bell: a device that sends a guard to it | - |
| 5 | W4 | 3 | extract | Both of you, through the wharf sheds to the boat at the jetty steps | Landmark: the crane's red lamp over the jetty | Hold shutter (shed two loading shutter); pull-up (canal ledge -> jetty lip) | - | - |

- **Twist (step 4):** the open strongroom rings an old tell-tale bell in the porter's lodge. The porter walks from the
  east lodge to the strongroom passage (about 60 s away, his lantern visible down the corridor). The planned way out
  through the east gate is now his way in: the team leaves by the coal chute instead. The no-kill rule bites here: he is
  one man in a corridor, and he may only be avoided or knocked out.
- **Optional (W3):** "Copy the partners' day book in the east wing office" (document under a warm desk lamp, one door
  from the east key post). Reward: `syringe` (through section-rating's Grant). Story: the day book dates the payment.
- **Extraction (step 5):** both players hold the boat zone (`SectorRun` extract phase, every living player).

## Roles (asymmetric, swap at the midpoint = step 3)
- Steps 1-2: **A = Ears** (listens at the pie shop loft, reads the brass plate, relays the code; drops through the
  light-well lantern into the west wing); **B = Hands** (boosted onto the walkway by A at the west pier, hauls A up the
  east lip, throws A over the lane, then takes the east gate with the code A gives by radio). Split information: only
  A heard the code, only B types it.
- Step 3 (swap point): both turn a key at once, A west, B east; the strongroom between the wings opens.
- Steps 4-5: **B = Ears** (watches the porter from the strongroom passage grille and calls him: "Corridor. Thirty
  seconds."); **A = Hands** (carries the ledger; boosted by B into the coal chute, unbolts the yard hatch for B). At the
  sheds B lifts the loading shutter for A, A pulls B up the jetty lip.

## Hint lines (Settings > Gameplay > Hints, off by default)
1. The night clerk eats in the pie shop loft. Listen from the loft walkway outside.
2. The founding year is on the brass plate over the front door. The east gate takes it.
3. Each of you holds a key. Turn when the count says turn, not before.
4. The coal chute is in the strongroom passage. One boosts, the other unbolts the yard hatch.
5. The boat waits at the jetty steps under the crane. The shed shutter is the way through.

## Radio (text now, voiceable later; each line <= 90 characters)
Briefing (screen text):
```
Tallow Wharf. Gaunt & Lisle, a counting house older than the canal it sits on.
Someone paid for Halcyon's failover hardware through their books. We want the ledger.
It sleeps in the strongroom. The door wants two keys, turned at once, a wing apart.
The staff are clerks and porters on night rates. They go home tonight.
Rule: no kills. Knock them down if you must. They wake up with a headache.
```
- Step 1: LANTERN: Evening, Night Shift. Tallow Wharf, the arcade lofts. Clerk's on his supper. /
  SEXTON: Pie shop loft, window lit. He's on the telephone and he's not whispering. /
  MOTH: I can smell the pie from here. Professionally speaking, it's a distraction.
- Step 2: LANTERN: East gate wants a number. West wing, in through the light well. Split here. /
  TALLY: Founding year, on the brass. Old firms never change a code they're proud of.
- Step 3: TALLY: Both keys in? On my count. Three. Two. One. Turn. / (missed) TALLY: Keys sprang back. Again, on my
  count. / (done) WREN: Door's open.
- Step 4 (twist): SEXTON: Lodge lamp's on. That door rang a bell somewhere. Porter's coming. /
  LANTERN: Not the east gate now. Coal chute to the yard. Nobody dies for a book.
- Rule broken: LANTERN: That was a kill. Not tonight. Back to the last clean point, both of you.
- Step 5: SEXTON: Shed two's shutter is your way through. Yard's quiet. / LANTERN: Boat's under the crane. Both of you. /
  (extract) TALLY: It's all here. Who paid, and when. / LANTERN: Good. Breathe. Come home.

## Spaces needed (for the CMG graph check; map ids in brackets, campaign-map/graph.json)
Size classes: S = short side 6-10 m, M = 10-20 m, L = over 20 m (play space >= 6 m, scale sheet 3).
- W2 arcade ground [`w2-arcade`] (checkpoint, mission start): M covered passage; the boost at the walkway's west pier, the pull-up lip at its east end (KIT-PULL), both 4.5 m.
- W2 pie shop loft [`w2-pie-loft`; walkway `w2-walkway`]: S, lit window, the clerk at the telephone; the loft walkway outside within earshot (dark).
- W2 loft window [`w2-lane-window`]: sees the brass plate over Gaunt & Lisle's door (step 1 lead and step 2 `seen_from`).
- W2 -> W3 link: the loft roof [`w2-arcade-roof`] across the arcade lane (2.5 m at a parapet break) to the counting house roof [`w3-roof`] (team throw, the W2 exit for TKL).
- W3 counting house roof [`w3-roof`]: M, the W3 vantage (yard, east gate, porter's lodge lamp); the light-well lantern over the west wing.
- W3 east gate and yard [`w3-east-yard`; the east gate is the door link `w3-east-yard` -> `w3-east-wing`]: M, keypad gate (needs `tkl-gate-code`), lit gate lamp, a dark wall line; W3 checkpoint.
- W3 west wing [`w3-west-wing`, post `w3-west-post`]: M, reached by a 4.2 m drop through the light-well lantern onto its iron gallery (stair down to the hall); clerks' hall, dark stacks; the west key post (S alcove).
- W3 east wing [`w3-east-wing`, lodge `w3-lodge`, office `w3-partners-office`, post `w3-east-post`]: M, porter's lodge (the twist's patrol start), partners' office (optional, warm lamp), east key post.
- W3 key posts: one per wing, about 20-25 m apart, no line of sight between them (radio is the link).
- W3 strongroom and passage [`w3-strongroom`, `w3-passage`, chute `w3-chute`, yard `w3-coal-yard`]: S strongroom between the wings; passage with the grille (B's watch spot) and the coal
  chute iron door; the chute is a real coal duct (1.2 x 1.5 crouch, scale sheet) ending at a bolted yard hatch.
- W3 -> W4 link [`w3-cartway` -> `w4-back-lane`]: the coal yard to the wharf sheds' back lane.
- W4 shed two [`w4-shed-two`]: M, loading shutter on the lane side (co-op hold shutter, 0.9 m crawl gap), dark aisle to the jetty.
- W4 jetty and boat [`w4-jetty` + `w4-boat`; ledge `w4-canal-ledge`]: S extraction zone, pull-up lip from the canal ledge (shared with Three Grey Coats); the crane's red
  lamp is the W4 landmark.

## Graph notes (TKL graph, 2026-10-24 ~23:50)
- `graph.json` holds the mission nodes only, on the map ids of `campaign-map/graph.json`. Steps: tkl-1 .. tkl-5 and
  tkl-opt; `mission.start` w2-arcade, `mission.sections` W2, W3, W4 (W1 is Three Grey Coats' only), budget 20 min
  (required steps 20, with the optional 23).
- One space per objective, so:
  - tkl-1 is done at the pie loft (`w2-pie-loft`, the listen zone at its propped walkway door). Lead `w2-walkway` (his
    voice and the lit window), seen from the arcade floor.
  - tkl-2's lead is `w2-lane-window` (the brass plate, which turns "the founding year" into a number). Its goal is the
    east wing through the east gate, seen from `w3-east-yard` (the gate lamp over the keypad), not from the lane window
    as "Spaces needed" first said: that window sees the front door, not the gate.
  - tkl-3 sits at `w3-east-post`; its lead is the brass notice at `w3-west-post`, the other half. `window` 1.0 s is kept
    for EN2.
  - tkl-4 ends at `w3-coal-yard` (the ledger taken in `w3-strongroom`, out through `w3-chute`); lead `w3-passage` (the
    chute's iron door), seen from the roof's hoist beam. `item` tkl-ledger is kept for EN2.
  - tkl-opt: lead and view are both the east wing (the warm lamp under the office door).
- W4 route: back lane, shed two's shutter (co-op hold), its canal door, the jetty, the boat. The canal ledge pull-up is
  the second way onto the jetty (shared with Three Grey Coats).
- Validator (mission-validator branch, map + this file): 0 errors, 6 warnings, all the map's own (custom room class on
  w1-canal-steps, w2-arcade-roof, w3-roof, w3-chute, w4-boat; w3-chute's 1.2 m width is off the 0.5 m grid, which is the
  scale sheet's crouch duct). No mission warning: choke nodes found in W2 (walkway), W3 (coal yard) and W4 (jetty);
  forced co-op holds in every section; the ghost and pacifist runs pass.
- PLAN.svg: `node scripts/graph-svg.mjs <campaign-map/graph.json> <graph.json> --out PLAN.svg --title ...` (whole map;
  W1 is drawn for context only).

SIGNOFF question: see [`SIGNOFF.md`](SIGNOFF.md).
