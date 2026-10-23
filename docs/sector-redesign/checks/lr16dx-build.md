# LR16dx: warehouse lamp moves, fix round (Opus)

Base: e8cc0eef (lr16int c7a26ca7 + lr16dw 0cdee9f1). Status: IN PROGRESS (account-swap WIP save).

## Done
- Read the briefs (lr16d-warehouse-build.md, lr16-lamp-audit.md); probed the geometry headless.
- Findings so far:
  - ops 75 is the charger indicator on the x -4 wall over the charger (-4.5, -5.2); the 0.65 m face is the z -6 wall's
    north face (corner). Plan: back to (-4.45, -5.2), radius cut so its reach (radius x 1.6) stops short of 0.65 m.
  - ops 132 (deck stair-head exit sign) sits centred on the stair head at x 22.7; the 0.65 m face is the duct at x 23.35.
    Plan: back to x 22.7 (sign exemption), radius cut as for 75.
  - ops 34 (charging-bay sign, z -6 wall): the 0.16 m face is the parked forklift's back (block x -10.8..-9.6, top 2.2).
    Plan: slide along its wall clear of the forklift (x about -8), between the forklift and the charger.
  - prodOffice (120-125): room x 16.15..24.0, z 14.65..18.0; the 0.8 m face west of 120/123 is the steel cabinet at
    x 16.2..16.8 (down rays). Plan: re-grid all six panels on a regular 3 x 2 grid clear of both (x ~17.85 / 20.4 / 22.95,
    z ~15.7 / 16.95), no shared spot.
  - warehouse 11 (strip at (9, 3)): the 0.82 m face is the crane girder (x -3.8..23.8, y 4.8..5.2, z 1.82..2.17), the
    pillar (10, 5) is 0.65 m east at z 5. Plan: a spot between girder and pillar, not 1 m off the lit strip at (9, 9).

## Left
- lampAudit.ts: reach rule (a wall beyond the lamp's reach is not flagged; dead fittings exempt), sign / emissive wall
  fittings never moved (`dim` proposal), smallest step toward the centre line and never past it, no two proposals on one
  spot; unit tests.
- Apply ops 20 and 71 (24 slots), the hand moves above, 44 / 81 / 116 decisions; full `npm run lamp-audit`; tests; light
  failures list for LR16g.
