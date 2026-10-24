# mission-framework: sign-off - Two-Key Ledger (campaign, Tallow Wharf W2 -> W3 -> W4)

## Picture
- Plan: [`PLAN.svg`](PLAN.svg) (scale 1 m = 10 px, north up). The whole Tallow Wharf map; TKL uses W2 (arcade lofts),
  W3 (counting house) and W4 (wharf sheds), W1 is drawn for context. Magenta links are co-op moves. Pins: objectives
  (circles), leads (squares), table below the plan.
- Detail: [`BEAT.md`](BEAT.md) (beat chart, radio lines, Graph notes), [`graph.json`](graph.json) (the mission graph).

![Two-Key Ledger plan](PLAN.svg)

## Intent check
1. Michael asked (2026-10-24 ~22:12, decision 4; ~22:50 M4): first campaign prototypes Three Grey Coats and Two-Key
   Ledger, 2 players, on a new small campaign map, every section forcing a co-op move (M3).
2. What this is: a 2-player, about 20 min mission. Night Shift steals a counting house's ledger from a strongroom whose
   door needs two keys turned at once, a wing apart, without killing anyone.
3. What the players do:
   - **1. W2, 4 min (intel):** pull-up onto the loft walkway, overhear the night clerk: the east gate code is the
     founding year on the brass plate. One reads the plate from the corner loft window.
   - **2. W3, 4 min (exploit):** team throw over the arcade lane to the counting house roof. The pair splits: one goes
     down a braced rope into the west wing, the other takes the east gate with the code.
   - **3. W3, 5 min (sync):** each holds a key post, TALLY counts, both turn within 1 s. A miss springs both keys back.
   - **4. W3, 4 min (twist):** the open strongroom rings a bell in the porter's lodge and the porter walks in by the
     east gate. The team leaves with the ledger by the coal chute: a leg-up, a crawl, the yard hatch unbolted.
   - **5. W4, 3 min (extract):** one holds shed two's shutter, the other crawls under; both board the boat at the jetty.
   - **Optional (W3):** copy the partners' day book in the east wing office (reward: one syringe).
4. Rule (1, whole mission): no kills; knock-outs are fine. Signposted in the briefing ("Rule: no kills. Knock them down
   if you must."), under the objective-list title ("Rule - no kills."), and by LANTERN's line on a break. A kill sends
   both players back to that section's checkpoint; the mission continues. Every guarded space keeps a dark route and a
   KO line. Hints (off by default) name places only: no markers.
5. What it costs: paper only until you pick. After that: the map greybox (GB slices), a synced key-turn device, Guard AI
   adds one reaction (a bell sends the porter to it), the mission engine handles the section restart. Validator: 0
   errors; 6 warnings, all the map's own (5 custom room sizes, the coal chute's 1.2 m crouch width), none from the
   mission.

## The decision
Q: Approve Two-Key Ledger as specced?
- "Approve as specced (no kills, the bell sends the porter, the coal chute exit)"
- "Approve, but script the porter's walk (no Guard AI reaction; he always walks in 60 s after the door opens)"
- "Rework: send it back with my notes"

## Michael's pick
<!-- filled by the orchestrator: <YYYY-MM-DD ~HH:MM> picked: "<option text>" -->
