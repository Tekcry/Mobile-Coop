# Step 07 - fix list, round 3 (checker: Opus 5.5 High, 2026-10-16; last fix round)

Verdict: FAIL. Round 2 made real progress (cable now a slim cord, keepers are sewn loops, stowed band within 2.8 mm,
nape flap gone, behind-ear line softer), but the in-use goggle band still reads as a rigid rail standing off the hood,
which is the dominant shape on the head. Items 1-2 MUST, ranked by impact on the look. Everything else is a logged
follow-up: do not work it this round.

Checker's own runs: `E2E_GPU=1 npm run operators:check -- wren` "7 item(s), all checks pass"; `npm run check` lint
0 errors (38 warnings), 73 files / 762 tests pass, build ok. No forbidden files touched, no threshold loosened in check_garment.py /
check.mjs / tests (the `lens` class is A26, reviewed in round 1), head items in GARMENTS, LOG.md draft present,
`py/trials/hood_sim_trial.py` is in-repo evidence for A24 (no external file). Renders are newer than HEAD
(15:24-15:25 vs commit 12:30) and were made with E2E_GPU=1 per the fixer's report.

Re-render on the GPU (E2E_GPU=1) and re-run `E2E_GPU=1 npm run operators:check -- wren` and `npm run check` after.

## MUST

1. **In-use goggle band still stands off the hood and reads as a stiff rail.**
   - Wrong: `build/operators/wren/wren-head_kit-sim.json` in-use `maxStandoffM` 0.0069 (6.9 mm; the round 2 bar was
     "a couple of mm" over true hollows, about 1 mm where convex). In `wren-head_kit-e-closeup-head-side` the run from
     the lug to the pod is a dead-straight plank with a cast-shadow gap over the temple and above the ear, and no
     visible dent in the hood under it; the cord along the lower edge makes it read as a rail with a groove.
     `wren-head_kit-f-closeup-head-back`: right of the pod the band still enters the channel as a crumpled, layered
     triangle. `wren-head_kit-g-closeup-goggle` / `c`: at the right lug the band end, the first keeper and the cable
     end bunch into a cluttered knot of folded faces. SPEC 1 Physical ("Fabric drapes and compresses under straps.
     Straps carry tension"); checker list: floating parts.
   - Done: in-use `maxStandoffM` <= 3 mm (as the stowed pose already achieves), measured over hood + hem + harness
     (not the balaclava inside the face opening). In `e` no shadow gap under the band from the face opening to the
     pod, a visible shallow dent / pulled fold in the hood along the band's edges, and the band's outer face follows
     the head's curvature (a gentle curve over temple and ear, not a ruler line). In `f` the band enters the pod
     channel flat and clean; in `g` / `c` the lug end is one clean webbing return with a bar tack, the cable leaves the
     goggle cleanly, no folded-over or crumpled faces. The fixer's own plan (relaxed strip: shrink plus per-edge
     collision on hood + hem + harness, guide point under the pod) is the right approach. Checks still pass; kit
     cable length within 1.5 cm of the data or the data updated.

2. **Shirt collar rim at the nape is lumpy below the hood skirt.**
   - Wrong: `wren-headwear-f-closeup-head-back` and `wren-head_kit-f-closeup-head-back`, lower third: the skirt now
     laps over, but the shirt collar's rim directly below it is wavy and pinched, with a fold / notch right of centre;
     `wren-headwear-e-closeup-head-side` / `wren-head_kit-e`: a small jagged notch at the back of the neck where the
     skirt meets the collar (bottom right of the neck).
   - Done: in e and f the edge you see at the nape is either the skirt's own clean hem lying on the shirt, or a
     smooth collar rim (no pinches, folds or notches, no dark slivers). Cheapest route: extend the hood skirt about
     1 cm lower at the back so it covers the rim, then tuck the collar under it as in round 2 (`headwear.py`
     `tuck_collar`); do not rebuild the shirt.

## Logged follow-ups (already OPEN in LOG.md or add them; not fails, do not work them this round)
3. Behind-ear crease (round 2 item 3, worked): `wren-headwear-e`, a soft shading crease still follows the back of
   the ear bulge. Acceptable now; log it OPEN with "smooth normals or lower the cling behind the ear".
4. Rear channel smear (LOG item 4), chin buckle height (item 5, move it if item 1 reroutes the riser anyway),
   darkness spill (item 6), Moth kit text for step 13 (item 7): unchanged.
5. Remove the module global `DBG` in `head_kit.py` (lines ~509, 570, 665) or keep it only behind a debug flag;
   housekeeping, do it if you touch that code anyway.

## Notes (not fails)
- Cable (2.6 mm cord seated on the band) and keepers (sewn 8 mm webbing loops with bar tacks) meet round 2 item 1's
  cable / keeper criteria (`e`, `j`, `h`).
- Stowed pose (`h`, `j`): band within 2.8 mm; reads acceptably.
- D19 / D20 still met: no flip mount, original square housing, lens assembly reads (`g`, `c`).
- Close-ups still render near-black materials as mid grey (open since steps 05 / 06).
