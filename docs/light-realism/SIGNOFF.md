# light-realism: sign-off 1 - S1 car park light map and the band table

Status: answered 2026-10-26 (S1 only; see Michael's pick).

## Picture
- Light map, to scale: `docs/light-realism/signoff/s1-lightmap.svg` (1 m = 10 px, 10 m scale bar, north arrow). The
  car park (-36..6, -76..-52) with every column, its 0.8 m arm and its circuit (west / east), the new south row, the
  ground lux heat map at the P11a band, and each dark spot left with its cause (behind a car, cut circuit, shot lamp).
- Before: `docs/light-realism/signoff/s1-heat-before.svg` (today: average about 1 lux, level 0.28; half the car park
  reads dark and a third has no lamp over it). Low and Epic shots before / after and the 90 s video:
  branch `shots/light-realism-s1`. Numbers: `docs/light-realism/measure/S1-carpark.md`.
- After: average 27.9 lux (target 14 or more), darkest open spot 3.4 lux (target 3 or more); 0 dark spots left in
  the open: the dark places are behind cars, under a cut circuit or a shot lamp. Same numbers on the light map's legend.

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
   unwalked features (at the cap), Sector Ops also at the cap (3); these are rule fixes (G355), so nothing new is
   switched on.

## The decision
Q: Approve the band table and the S1 light map?
- "Approve the table and the S1 light map (Recommended)"
- "Changes first"

"Changes first" leads to a short follow-up on any of these (the build uses the first of each now):
- How bright counts as "lit" (A2): 1 lux = edge of dark, 10 lux = lit / 1 lux and 7 lux (brighter car parks).
  The anchors are chosen, not measured (tested against one real car-park light: the game's lamp throws its light too
  close to the pole to match it).
  Where two lights overlap, the game shows the spot brighter than its real lux reading (most of the car park shows as
  fully lit); the numbers on this page use the real reading.
- Car park category (A5): P11a, high night use, 14 lux average, 3 lux minimum / P11b, medium, 7 lux and 1.5 lux.
- A band row (`docs/light-realism/research/bands.md` section 3) or a spot on the light map.

Linked, not shown here: before / after heat maps (`signoff/s1-heat-before.svg`, `signoff/s1-heat-after.svg`), the
numbers (`measure/S1-carpark.md`), the band table and curve (`research/bands.md`), the draft level-standard text
(`signoff/level-design-5.5.md`). L1: the PR number.

## Michael's pick
2026-10-26 ~11:45 (native multiple choice, via the orchestrator; ROADMAP Decided): "Approve but only s1, let me walk it
before doing any more". So L1 ships the S1 car park and the band table as built here; S2-S5 and the warehouse
re-lights wait for his S1 walk (plans and briefs only, no builds). The draft level-standard text
(`signoff/level-design-5.5.md`) stays a draft until then.
