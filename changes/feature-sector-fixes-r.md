# sector-fixes R: co-op-only routes and team doors (track A)
kind: minor
- Sector Ops Warehouse: co-op-only routes, each a 4.4 m lip (out of solo reach, inside the leg-up) with the partner
  following by relay or the two-person rope. Section 1: the AHU service door high in the yard facade onto the plant
  deck, and the goods-in hoist monorail over the checker (the two east-lane loads by it are now 2.0 m stacks you cannot
  climb alone). Section 2: rack row R3 rebuilt as high-bay (4.4 m tops, its rolling ladder gone), R3S reached from the
  east gangway: a vantage over the lane, A3 and the picker; (Michael, "Add another") the old dispatch landing on the x -4
  wall over the east gangway, a second leg-up route (a vantage and a hang-drop onto the picker). Section 3: the sprinkler zone-valve platform (a way onto the
  5.0 m main) and the crane drive platform over the CNC supervisor (hang-drop).
- Team doors: one door per section bolted from one side (section 1 the mess back door, section 2 the VNA aisle escape
  gate, section 3 the plant room's lobby door). Only a player on the far side gets "Unbolt"; it opens for both; a
  checkpoint restart bolts it again. Host-authoritative, no wire change (protocol stays 28).
- A player downed on a co-op-only top cannot be revived there; the checkpoint respawn takes over (PLAN A3).
- (e2e fix) Section 3's two platforms sit under raised roof hoods, so you can climb up onto them (the roof left too little
  room). Section 1's single east-lane pallet is now an empty pallet: a running jump or a mantle off the old one got a
  player alone onto the stacks by the monorail. `run-e2e.mjs`: a named suite with parts (`e2e-sectorops`) now runs as its
  parts.
