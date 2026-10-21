# sector-fixes - brief

Branch `feature/sector-fixes` in `C:/NightShift/Mobile-Coop-sector-fixes`, from master 4.43.1 (5a67cdcb). Spare capacity
only: animation work keeps priority (Michael, 2026-10-22 ~01:40: "Priority is still animations right now but any spare
capacity can be used as you see fit"). The warehouse rebuild stays parked (docs/reviews/warehouse-layout-review.md);
this job fixes the existing Sector Ops warehouse and the security devices.

## The ask (Michael, 2026-10-22 ~01:40, verbatim)
1. "Warehouse sector ops, light fittings in same rooms are different heights and locations. Theres random lights on the
   roof. Theres a light in the middle of a climbing pipe."
2. "All lights should look like LED designs."
3. "Cameras visual scanner shows very far away, outside of its range. The cameras are also facing high up, whereas
   they should be monitoring only certain section/distance in front of them."
4. "The camera grid is too obvious, make it very subtle. Lasers are also too obvious, they need to be only seen in a
   certain view (whichever would see lasers)."
5. "Lasers should set off alarms, not hurt you."
6. "If there's lasers, there should be panels nearby that power them which can be interrupted using the jammer. Must
   be hard to access and not in plain sight. Electro vision should show the panel."
7. "If there are cameras, there should be a security room with a guard watching the cameras. You can take him out and
   shut off cameras (but in sector ops it's not possible)."
8. "Change goggles in inventory to the default selection so you can just hold l1 and press a to automatically swap
   between them. Don't hold selections in the wheel, if analogue stick is let go it defaults to goggles/vision
   selection."
9. "Add more coop only routes to warehouse."

## Slices (in order; each its own PR)
- **L, lights (1, 2):** every room's fittings at one height and a regular layout; remove fittings on the roof and any
  inside traversal geometry (the climbing pipe); one LED fitting family (panel / strip / bulkhead) for every lamp in the
  warehouse, procedural meshes, no external art. The light bake reruns; light parity holds (meter and guards read the
  bake). GPU look before / after on the desktop.
- **C, cameras and lasers (3, 4, 5):** the camera cue (the red grid) is drawn only within the camera's real range and
  view cone, matching what the camera can detect; cameras pitch down to watch a set floor section; the grid made very
  subtle (low alpha, thin lines); lasers seen only in night vision (IR beams; Michael chose "Night vision" 02:00;
  invisible otherwise), and a laser break raises the alarm and never deals damage. Marlow Yard keeps the same rules.
- **P, laser panels (6):** each laser group has a power panel nearby, out of plain sight and hard to reach (behind
  cover, above, through a vent or a climb); the jammer cuts the lasers while jammed (the jammer rules of slice J);
  electro (EMF) vision highlights panels.
- **S, security room (7):** every map with cameras except Sector Ops gets a security room with a guard at monitors; taking him out (any
  takedown, non-lethal or lethal) lets a player use the console to switch the cameras off for the section. Michael (02:00)
  chose "Not in Sector Ops": in Sector Ops cameras cannot be shut off (no security room needed there).

- **W, wheel (8):** the gadget wheel's default selection is the goggles / vision mode: hold L1 and press A to cycle
  vision modes without the stick; releasing the stick returns the wheel to the goggles, so no other selection is held.
  Keyboard / mouse equivalent on the wheel key.
- **R, co-op routes (9):** more co-op-only routes through the warehouse (boost spots, relay climbs, team doors, rope
  points), each section at least one, following docs/level-design.md and the co-op move set.

## Limits
Hard rules in CLAUDE.md (gameplay never reads graphics state; light parity; procedural art only). The jammer depends
on slice J (`feature/marlow-jammer`, PROTOCOL_VERSION 26): slice P waits for it or rebases on it. A wire change bumps
the protocol past the latest merged one. One checker per slice, one fix round. Full e2e on the laptop before each PR;
GPU looks on the desktop.
