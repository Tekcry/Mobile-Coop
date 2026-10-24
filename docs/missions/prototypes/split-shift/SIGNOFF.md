# mission-framework: sign-off - Split Shift (Sector Ops, campus S2)

## Picture
- Plans, one per storey (scale 1 m = 10 px, north up), each over Sector Ops' plan of that storey; blue = Team Ghost's
  rooms, orange = Team Shadow's. Pins: objectives (circles), devices (diamonds), leads (squares), table below each plan.
  - Ground floor: [`PLAN-0.svg`](PLAN-0.svg) (Shadow: mail room, plant room, foyer; Ghost's stair up).
  - First floor: [`PLAN-4.4.svg`](PLAN-4.4.svg) (Ghost: kitchen, comms room, facilities office; the bridge landing).
  - Second floor: [`PLAN-8.4.svg`](PLAN-8.4.svg) (the optional board room).
- Detail: [`BEAT.md`](BEAT.md) (beat chart, radio lines, Graph notes), [`graph.json`](graph.json) (the mission graph).

![Split Shift ground floor](PLAN-0.svg)

![Split Shift first floor](PLAN-4.4.svg)

![Split Shift second floor](PLAN-8.4.svg)

## Intent check
1. Michael picked (2026-10-24 ~22:12, multiple choice): "first prototypes: Three Grey Coats + Two-Key Ledger
   (campaign, 2p) and Split Shift + Code Relay (Sector Ops, 4p)"; earlier that evening: "Sector Ops 4-player co-op,
   parallel objectives for two teams or a solo player doing them all, strict rules allowed too (global / per team /
   split)".
2. What this is: a 1-4 player mission in the HQ block (S2). One team works upstairs and is never seen; the other works
   the ground floor and cuts the power so the first can hack the building computer.
3. What the player does (co-op about 14 min, solo about 23 min, rated lower):
   - **1.** Ghost climbs the post room's fire stair and overhears the facilities code at the first-floor kitchen.
     At the same time Shadow takes the plant log from the mail room cages.
   - **2.** Ghost loops the ground-floor cameras at the comms room panel, which opens the foyer for Shadow.
   - **3.** Shadow uses the plant log to cut the east wing at the plant-room switchgear. The facilities officer leaves his desk.
   - **4.** Ghost uses the code to get into the dark facilities office and hacks the terminal. **Twist:** the officer
     brings the reception officer with him, and Shadow must hold the plant room dark. The atrium board can split them.
   - **5.** Everyone meets at the bridge landing and crosses the glazed bridge.
   - **Optional (either team):** photograph the lighting schedule in the second-floor board room (reward: one syringe).
   - **Solo:** one player does every step in turn. The briefing tells them how to do the hack alone: cut the power,
     then go up; the officer's walk down to the plant room and back gives about two minutes.
4. Rules (2, one per team, in the briefing and the objective list):
   - Ghost: never seen. That includes Shadow being seen upstairs.
   - Shadow: no alarms (no panel, no camera).
   - A broken rule sends that team back to the section checkpoint.
5. What it costs: paper only until you pick. Sector Ops' HQ plan already holds every device this needs, as planned
   devices: the comms-room camera panel, the held east-wing cut, the facilities keypad, the two leads and the bridge pair
   door's solo line. After you pick, Sector Ops builds them, Guard AI adds 1 reaction, and the mission engine handles a
   per-team restart. Validator, on the campus plan you signed off this morning (S2 as drawn): 0 errors, 119 warnings, all the campus plan's own;
   0 from the mission (BEAT.md Graph notes).

## The decision
Q: Approve Split Shift as specced?
- "Approve as specced"
- "Rework: send it back with my notes"

## Michael's pick
<!-- filled by the orchestrator: <YYYY-MM-DD ~HH:MM> picked: "<option text>" -->
