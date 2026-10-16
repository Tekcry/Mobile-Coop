# Step 07 - fix list, round 2 (checker: Opus 5.5 High, 2026-10-16)

Verdict: FAIL. Items 1-3 of round 1 are judged against D19 / D20 (not the old step-file text): no flip mount (done),
original square housing kept (done), harness = options-pass strap 2 (done). What fails is how the new goggle band
reads, and round 1 item 6 (nape clipping), which is still open. Ranked by what matters most to the look. Items 1-2
MUST; item 3 SHOULD; items 4-7 are acceptable as logged follow-ups (write them into LOG.md as open, do not work them
in this round unless budget is left after 1-3).

Checker's own runs: `E2E_GPU=1 npm run operators:check -- wren` "7 item(s), all checks pass"; `npm run check` lint 0
errors (38 warnings), 73 files / 762 tests pass, build ok. No forbidden files touched, no check threshold loosened
(A26's `lens` class reviewed in round 1), the head items are in GARMENTS, LOG.md draft present.

Re-render on the GPU (E2E_GPU=1) and re-run `E2E_GPU=1 npm run operators:check -- wren` and `npm run check` after.

## MUST

1. **The goggle band reads as a rigid rail floating off the head, not an elastic band.**
   - Wrong: in the side views it is the dominant shape on the head and it reads as a stiff plank or picatinny-like
     rail: a dead-straight horizontal run from the lug to the pod, standing visibly off the hood with a shadow gap over
     the temple and above the ear (`wren-head_kit-e-closeup-head-side`, the band from the lug to the pod;
     `wren-head_kit-j-closeup-stowed-side`, same; `wren-head_kit-c-closeup-head-front`, right side;
     `wren-head_kit-b-back34-stealth`, a bar jutting off the head at full-body scale). The 4.2 mm cable tube
     (`FT.tube(..., 0.0021, ...)`, `head_kit.py` line 348) on a 1.8 mm band, sitting 2.4 mm proud of it, plus keepers
     that are solid 9 x 18 x 6.6 mm boxes across the full band width (`HC.rbox(...)` ~line 358) turn band + cable into
     one chunky rail. Cause: `_hull_ring` (convex hull of the section, ~line 472) plus `_lift_clear` bridge every
     hollow, so the band never touches or dents the hood (LOG PART B: "about 5 mm off the hood over the ear, reads
     stiff"). SPEC 1 Physical: "Fabric drapes and compresses under straps. Straps carry tension"; checker list:
     floating parts.
   - Done: in e, j and c the band lies on the hood (within about 1 mm wherever the head is convex, only bridging true
     hollows such as the temple dip, and there by no more than a couple of mm) and the hood shows a shallow dent or
     pulled fold under it, like the crown and side straps already make; it follows the head's curvature instead of a
     straight line, so it reads as elastic webbing under tension. The cable reads as a slim cord riding on the band's
     outer face (about 3 mm or less, seated on the band, not floating above it), held by thin sewn webbing keeper
     loops (fabric, a few mm proud, not solid blocks). Kit data lengths updated if they change. Band, cable and keepers
     still pass the checks (edges, materials, kit).
   - Also in this item: the band's right rear run bunches into a crumpled triangle where it enters the channel under
     the pod (`wren-head_kit-f-closeup-head-back`, right of the pod). Done: a clean band entering the channel, no
     folded-over or crumpled faces.

2. **Nape clipping and torn collar (round 1 item 6, still open).**
   - Wrong: dark shards and crumpled triangles at the hood skirt / shirt collar at the nape, left and right of the
     centre (`wren-headwear-f-closeup-head-back` and `wren-head_kit-f-closeup-head-back`, lower third, around the
     collar edge); a dark slit and jagged edge where the hood skirt meets the collar at the back of the neck in the
     side views (`wren-headwear-e-closeup-head-side` and `wren-head_kit-e-closeup-head-side`, bottom right of the neck).
   - Done: in e and f the collar edge at the nape is a clean edge, the hood skirt laps over it with no shirt, base
     layer or balaclava geometry showing through, no dark slivers. Fix it in the head stage (`headwear.py`
     `collar_tree` / `tame_collar`, or by drawing the collar under the skirt like A25) - do not rebuild the shirt.

## SHOULD

3. **Dark streaks behind the left ear.** `wren-headwear-e-closeup-head-side`, behind the ear (a thin dark jagged line
   on the hood running down from the top of the ear bulge). Round 1 item 6 asked that the hood texture behind the ear
   does not streak. Done: no dark line or notch there in the e view (smooth the vertices or the normals there).

## Acceptable as logged follow-ups (write into LOG.md "Step 07" open items; not fails)

4. **Rear channel smear** (`wren-headwear-f`, upper middle, above the cord lock): the gathers still read as a soft
   smudge rather than pleats. The hood stays fitted (A24 now holds the sim attempt's evidence); revisit with the torso
   kit or when the hood gets its own pass.
5. **Chin strap buckle height**: the side-release buckle sits on the left riser at cheekbone / ear-top height, just
   under the band, not beside the jaw (`wren-head_kit-j`, the stacked blocks in front of the ear; in e it is half
   hidden under the band). Move it down to the jaw line when the band is redone, if cheap.
6. **Darkness view** (`wren-head_kit-i-darkness-glow`): the lenses glow clearly (D13 met); the spill on the eyecups
   and brow is not visible, so the head does not read at all. Note only.
7. **Moth kit text** (`src/operators/kit.ts`, Moth): `goggle.attach` still says "dovetail into the mount" and
   `headHarness.job` "carries the goggle mount", though no mount exists (D19); plus `batteryStrap` and "pack to mount"
   (already logged). All for step 13; add the two new strings to the step 13 note in LOG.md.

## Notes (not fails)
- D19 / D20 compliance: no flip arm, pivot, detent, knobs or dovetail in the renders or in `kit.ts` (Wren) / SPEC 3.3,
  5.1, 7; stowed pose rests on the brow (eyecups 1.6 mm off the hood, `h`, `j`); in use over the eye port (`c`, `e`,
  `g`); original square housing kept; harness is split crown with a hard brow plate, two forks to a hard sculpted pod,
  cam buckles on the side straps, chin strap under the chin (2.8 mm behind / 11.6 mm below the chin point).
- Lens (round 1 item 4) passes: saturated green dome with a specular highlight and the barrel's depth (`g`, `c`).
- Close-ups still render near-black materials as mid grey (open since steps 05 / 06), so the webbing weave, bar tacks
  and anodised edges cannot be judged in c / e / f / g.
