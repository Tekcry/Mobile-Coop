# light-realism: sign-off 1 - S1 car park light map and the band table

Status: page laid out at plan revision 1; L1 makes the files it points at and fills the three "L1:" values. The
orchestrator asks the question only when no "L1:" value is left.

## Picture
- Light map, to scale: `docs/light-realism/signoff/s1-lightmap.svg` (1 m = 10 px, 10 m scale bar, north arrow). The
  car park (-36..6, -76..-52) with every column, its 0.8 m arm and its circuit (west / east), the new south row, the
  ground lux heat map at the P11a band, and each dark spot left with its cause (behind a car, cut circuit, shot lamp).
- Before: `docs/light-realism/signoff/s1-heat-before.svg` (today: average about 1 lux, level 0.28; half the car park
  reads dark and a third has no lamp over it). Low and Epic shots before / after and the 90 s video:
  branch `shots/light-realism-s1`. Numbers: `docs/light-realism/measure/S1-carpark.md`.
- L1: measured mean and point minimum on the map's legend.

## Intent check (5 lines)
1. Michael said: "On the current build the s1 car park is still very dark which is unrealistic, car parks are
   generally well lit" (2026-10-25 ~09:05).
2. What this is: real light levels from the Australian standards, measured in lux from the game's light, starting
   with the S1 car park.
3. What changes for the player: the car park is lit like a staffed site at night; hiding there means behind cars, a
   cut circuit or a shot lamp, not a dark patch nobody lit.
4. What it does not do: no change to the moon or the night fill (guard torches stay), no engine change, nothing on
   the old warehouse map (frozen).
5. What it costs: this slice ~4 h; after a yes, ~9 more PRs (~30 h) re-light S1-S5 and the warehouse. Lighting has 3
   unwalked features (at the cap); these are rule fixes (G355), so nothing new is switched on.

## The decision
Q: Approve the band table and the S1 light map?
- "Approve the table and the S1 light map (Recommended)"
- "Changes first"

"Changes first" leads to a short follow-up on any of these (the build uses the first of each now):
- How bright counts as "lit" (A2): 1 lux = edge of dark, 10 lux = lit / 1 lux and 7 lux (brighter car parks).
  L1: the reference test result in one line, "matched a real car-park column to within <n>%" or "the anchors are
  chosen, not measured" (L0, A13).
- Car park category (A5): P11a, high night use, 14 lux average, 3 lux minimum / P11b, medium, 7 lux and 1.5 lux.
- A band row (`docs/light-realism/research/bands.md` section 3) or a spot on the light map.

Linked, not shown here: before / after heat maps (`signoff/`), the band table and curve (`research/bands.md`), the
draft level-standard text (`signoff/level-design-5.5.md`). L1: the PR number.

## Michael's pick
(filled by the orchestrator)
